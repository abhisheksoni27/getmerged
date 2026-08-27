package middleware

import (
	"bytes"
	"context"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/valkey-io/valkey-go"
)

// feedTokenBucketLua implements a sliding token bucket per key. It refills
// `cap` tokens at `rate` tokens/second, consumes one token on success, and
// returns 1 (allowed) or 0 (denied). The bucket key auto-expires via EXPIRE.
const feedTokenBucketLua = `
local tokens = tonumber(redis.call('HGET', KEYS[1], 't'))
local ts = tonumber(redis.call('HGET', KEYS[1], 'ts'))
local cap = tonumber(ARGV[1])
local rate = tonumber(ARGV[2])
local now = tonumber(ARGV[3])
if tokens == nil then tokens = cap end
if ts == nil then ts = now end
tokens = math.min(cap, tokens + math.max(0, (now - ts) / 1000) * rate)
local allowed = 0
if tokens >= 1 then
  tokens = tokens - 1
  allowed = 1
end
redis.call('HSET', KEYS[1], 't', tokens, 'ts', now)
redis.call('EXPIRE', KEYS[1], ARGV[4])
return allowed
`

// feedRecorder captures the response body so the middleware can cache it after
// the handler runs, without coupling the handler to caching logic.
type feedRecorder struct {
	gin.ResponseWriter
	buf *bytes.Buffer
}

func (w *feedRecorder) Write(b []byte) (int, error) {
	w.buf.Write(b)
	return w.ResponseWriter.Write(b)
}

// FeedCacheRateLimit enforces a per-IP sliding token bucket (max requests per
// window) for the public feed endpoints while serving cacheable responses from
// a short-lived cache. CRITICAL (AC5/AC6): a cache HIT is served directly and
// does NOT consume a token, so legitimate 5-minute WebCal pollers never see
// 429. Only a cache MISS draws from the bucket; an empty bucket yields 429.
func FeedCacheRateLimit(max int, window, ttl time.Duration) gin.HandlerFunc {
	return func(c *gin.Context) {
		client := MustCache(c)
		if client == nil {
			// Cache/valkey unavailable - fail open without rate limiting.
			c.Next()
			return
		}
		ctx := c.Request.Context()
		cacheKey := "feed:" + c.Request.URL.RequestURI()
		ct := feedContentType(c.Request.URL.Path)

		// Cache-hit precedence: serve from cache, do NOT consume a token.
		if b, err := client.Do(ctx, client.B().Get().Key(cacheKey).Build()).AsBytes(); err == nil && len(b) > 0 {
			c.Header("Content-Type", ct)
			c.Header("X-Cache", "HIT")
			c.Data(http.StatusOK, ct, b)
			c.Abort()
			return
		}

		// Cache miss: draw a token from the per-IP bucket.
		ip := c.ClientIP()
		bucketKey := "feedrl:" + ip
		allowed, err := feedTokenBucket(client, ctx, bucketKey, max, window, ttl)
		if err != nil {
			// On valkey error, fail open (do not 429).
			c.Next()
			return
		}
		if !allowed {
			c.Header("Content-Type", "application/json")
			c.Header("Retry-After", fmt.Sprintf("%d", int(window.Seconds())))
			c.Header("X-RateLimit-Limit", fmt.Sprintf("%d", max))
			c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{
				"error":      "rate limit exceeded",
				"error_code": "rate_limited",
			})
			return
		}

		rec := &feedRecorder{ResponseWriter: c.Writer, buf: &bytes.Buffer{}}
		c.Writer = rec
		c.Next()

		// Cache successful (200) feed responses for the TTL so repeat pollers
		// hit the cache and never consume tokens.
		if rec.Status() == http.StatusOK && rec.buf.Len() > 0 {
			_ = client.Do(ctx, client.B().Set().Key(cacheKey).Value(string(rec.buf.Bytes())).
				ExSeconds(int64(ttl.Seconds())).Build())
		}
	}
}

func feedTokenBucket(client valkey.Client, ctx context.Context, key string, max int, window, ttl time.Duration) (bool, error) {
	nowMs := time.Now().UTC().UnixMilli()
	ratePerSec := float64(max) / window.Seconds()
	resp := client.Do(ctx, client.B().Eval().
		Script(feedTokenBucketLua).
		Numkeys(1).
		Key(key).
		Arg(
			fmt.Sprintf("%d", max),
			fmt.Sprintf("%f", ratePerSec),
			fmt.Sprintf("%d", nowMs),
			fmt.Sprintf("%d", int(ttl.Seconds())),
		).
		Build())
	if resp.Error() != nil {
		return false, resp.Error()
	}
	n, err := resp.ToInt64()
	if err != nil {
		return false, err
	}
	return n == 1, nil
}

func feedContentType(p string) string {
	switch {
	case strings.HasSuffix(p, ".rss"):
		return "application/rss+xml"
	case strings.HasSuffix(p, ".atom"):
		return "application/atom+xml"
	case strings.HasSuffix(p, ".ics"):
		return "text/calendar"
	}
	return "application/xml"
}
