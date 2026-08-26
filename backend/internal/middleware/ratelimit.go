package middleware

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/valkey-io/valkey-go"
)

const (
	rateLimitMax    = 100
	rateLimitWindow = 60 * time.Second
)

// RateLimit enforces 100 requests per minute per IP using a Valkey counter.
// Requires Cache middleware to be registered first.
func RateLimit() gin.HandlerFunc {
	return RateLimitPerIP(rateLimitMax, rateLimitWindow)
}

// RateLimitPerIP enforces max requests per window (per IP) using a Valkey counter
// with its own key namespace so separate limits do not share buckets.
// Requires Cache middleware to be registered first.
func RateLimitPerIP(max int, window time.Duration) gin.HandlerFunc {
	return func(c *gin.Context) {
		client := MustCache(c)
		if client == nil {
			// Cache unavailable - fail open.
			c.Next()
			return
		}

		ip := c.ClientIP()
		key := fmt.Sprintf("rl:%d:%s", max, ip)
		ctx := context.Background()

		count, err := incrFixedWindow(client, ctx, key, window)
		if err != nil {
			// On error, fail open.
			slog.Error("rate limit: valkey error - failing open", "ip", ip, "err", err)
			c.Next()
			return
		}

		remaining := max - int(count)
		if remaining < 0 {
			remaining = 0
		}
		c.Header("X-RateLimit-Limit", fmt.Sprintf("%d", max))
		c.Header("X-RateLimit-Remaining", fmt.Sprintf("%d", remaining))

		if count > int64(max) {
			resetAt := time.Now().Add(window)
			slog.Warn("rate limit exceeded", "ip", ip, "count", count, "path", c.FullPath())
			c.Header("Retry-After", fmt.Sprintf("%d", int(window.Seconds())))
			c.Header("X-RateLimit-Reset", fmt.Sprintf("%d", resetAt.Unix()))
			c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{
				"error":      "rate limit exceeded",
				"error_code": "rate_limited",
				"reset_at":   resetAt.Unix(),
			})
			return
		}

		c.Next()
	}
}

// SkipIfAuthenticated runs limiter only for anonymous requests (no user_id in
// context), so per-IP trial limits never throttle signed-in users.
func SkipIfAuthenticated(limiter gin.HandlerFunc) gin.HandlerFunc {
	return func(c *gin.Context) {
		if _, ok := c.Get(UserIDKey); ok {
			c.Next()
			return
		}
		limiter(c)
	}
}

// incrFixedWindow atomically bumps a fixed-window counter: SET NX EX
// reserves the key with its TTL exactly once, so the INCR that follows is
// race-safe and the window always expires.
func incrFixedWindow(client valkey.Client, ctx context.Context, key string, window time.Duration) (int64, error) {
	ok, err := client.Do(ctx, client.B().Set().Key(key).Value("0").Nx().ExSeconds(int64(window.Seconds())).Build()).AsBool()
	if err != nil && !valkey.IsValkeyNil(err) {
		return 0, err
	}
	if !ok {
		// Key already existed inside the current window.
		resp := client.Do(ctx, client.B().Incr().Key(key).Build())
		if resp.Error() != nil {
			return 0, resp.Error()
		}
		return resp.ToInt64()
	}
	// Fresh window: this caller holds count=1.
	return 1, nil
}
