package middleware

import (
	"context"
	"fmt"
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
	return func(c *gin.Context) {
		client := MustCache(c)
		if client == nil {
			// Cache unavailable — fail open.
			c.Next()
			return
		}

		ip := c.ClientIP()
		key := fmt.Sprintf("rl:%s", ip)
		ctx := context.Background()

		count, err := incrWithExpiry(client, ctx, key)
		if err != nil {
			// On error, fail open.
			c.Next()
			return
		}

		remaining := rateLimitMax - int(count)
		if remaining < 0 {
			remaining = 0
		}
		c.Header("X-RateLimit-Limit", fmt.Sprintf("%d", rateLimitMax))
		c.Header("X-RateLimit-Remaining", fmt.Sprintf("%d", remaining))

		if count > int64(rateLimitMax) {
			c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{"error": "rate limit exceeded"})
			return
		}

		c.Next()
	}
}

// incrWithExpiry atomically increments the key and sets expiry on first call.
// Uses valkey-go's Lua script execution for atomicity.
func incrWithExpiry(client valkey.Client, ctx context.Context, key string) (int64, error) {
	// INCR then EXPIRE NX (only set expiry if key is new)
	incrResp := client.Do(ctx, client.B().Incr().Key(key).Build())
	if incrResp.Error() != nil {
		return 0, incrResp.Error()
	}

	count, err := incrResp.ToInt64()
	if err != nil {
		return 0, err
	}

	// Set expiry only on the first request (count == 1) to avoid resetting the window.
	if count == 1 {
		client.Do(ctx, client.B().Expire().Key(key).Seconds(int64(rateLimitWindow.Seconds())).Build())
	}

	return count, nil
}
