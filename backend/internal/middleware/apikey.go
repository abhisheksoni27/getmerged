package middleware

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"strconv"
	"strings"
	"sync/atomic"
	"time"

	"github.com/abhisheksoni27/opendoor/internal/crypto"
	"github.com/abhisheksoni27/opendoor/internal/repository"
	"github.com/gin-gonic/gin"
	"github.com/valkey-io/valkey-go"
)

const (
	// APIKeyPrefix identifies GetMerged public API keys in Bearer tokens.
	APIKeyPrefix = "odk_"

	// AC2 tier limits: sliding-window caps per key. Burst caps are the
	// fair-use control - there is no unlimited tier.
	FreeAPIKeyHourlyLimit = 60
	FreeAPIKeyMinuteBurst = 10
	ProAPIKeyHourlyLimit  = 600
	ProAPIKeyMinuteBurst  = 100

	// AC4: entitlement tier is cached in Redis for 5 minutes so the hot path
	// never hits the DB; Pro upgrades take effect within 5 minutes.
	apiKeyTierCacheTTL = 5 * time.Minute

	hourWindow   = time.Hour
	minuteWindow = time.Minute

	// Stable, documented error codes returned by the public API.
	errCodeMalformedAuth = "ERR_MALFORMED_AUTH_HEADER"
	errCodeInvalidKey    = "ERR_INVALID_API_KEY"
	errCodeRateLimited   = "ERR_RATE_LIMITED"

	apiKeyIDKey = "api_key_id"
)

// apiRequestNonce disambiguates same-millisecond requests within this process
// when composing sorted-set members for the sliding-window log.
var apiRequestNonce atomic.Uint64

// APIKeyAuth authenticates Authorization: Bearer odk_* public API keys,
// enforces tier-based sliding-window rate limits (AC2), resolves the
// entitlement tier through a 5-minute Redis cache (AC4), and sets the user
// identity context for downstream handlers.
//
// Requests without any Authorization header pass through so JWT auth
// middleware can handle interactive browser traffic on the shared /api/v1
// paths. A present-but-malformed header, an unknown key, or a revoked key all
// fail immediately with 401 and a stable error code (AC3).
func APIKeyAuth(keyRepo repository.APIKeyRepository, entRepo repository.EntitlementRepository, hashSalt []byte) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.Next()
			return
		}
		rawKey, ok := strings.CutPrefix(authHeader, "Bearer ")
		if !ok || !strings.HasPrefix(rawKey, APIKeyPrefix) {
			c.Header("WWW-Authenticate", `Bearer realm="opendoor-api", error="invalid_request"`)
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error": "malformed Authorization header; expected: Authorization: Bearer odk_<key>",
				"code":  errCodeMalformedAuth,
				"docs_url": "/docs",
			})
			return
		}

		keyHash := crypto.HashSHA256(rawKey, hashSalt)
		key, err := keyRepo.FindActiveByKeyHash(c.Request.Context(), keyHash)
		if err != nil {
			// Unknown and revoked keys both resolve here - revocation takes
			// effect immediately (AC3).
			slog.Warn("api key auth failed", "path", c.Request.URL.Path)
			c.Header("WWW-Authenticate", `Bearer realm="opendoor-api", error="invalid_token"`)
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error": "invalid or revoked API key",
				"code":  errCodeInvalidKey,
				"docs_url": "/docs",
			})
			return
		}

		isPro := cachedEntitlementTier(c, entRepo, key.UserID)

		c.Set(UserIDKey, key.UserID)
		c.Set(apiKeyIDKey, key.ID)

		limit := enforceAPIRateLimit(c, key.ID, isPro)
		c.Header("X-RateLimit-Limit", limit.limitLabel)
		c.Header("X-RateLimit-Remaining", limit.remainingLabel)
		if limit.resetUnix > 0 {
			c.Header("X-RateLimit-Reset", strconv.FormatInt(limit.resetUnix, 10))
		}

		if !limit.allowed {
			c.Header("Retry-After", fmt.Sprintf("%d", limit.retryAfterSec))
			c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{
				"error":       "API rate limit exceeded.",
				"code":        errCodeRateLimited,
				"limits":      gin.H{"hourly": limit.hourlyLimit, "burst_per_minute": limit.burstLimit},
				"tier":        limit.tier,
				"upgrade_url": "/pricing",
				"docs_url":    "/docs",
			})
			return
		}

		go func(id int64) {
			keyRepo.TouchLastUsed(context.Background(), id)
		}(key.ID)
		c.Next()
	}
}

type apiKeyLimit struct {
	allowed        bool
	tier           string
	hourlyLimit    int
	burstLimit     int
	limitLabel     string
	remainingLabel string
	retryAfterSec  int
	resetUnix      int64
}

// cachedEntitlementTier resolves the Pro flag for a user through a 5-minute
// Redis cache (AC4): GET apitier:<userID>, fall back to the entitlement
// repository on miss, then SETEX for apiKeyTierCacheTTL.
func cachedEntitlementTier(c *gin.Context, entRepo repository.EntitlementRepository, userID int64) bool {
	client := MustCache(c)
	if client == nil {
		return dbEntitlementTier(c, entRepo, userID)
	}

	ctx := c.Request.Context()
	cacheKey := fmt.Sprintf("apitier:%d", userID)
	if resp := client.Do(ctx, client.B().Get().Key(cacheKey).Build()); resp.Error() == nil {
		if v, err := resp.ToString(); err == nil {
			return v == "1"
		}
	}

	isPro := dbEntitlementTier(c, entRepo, userID)
	val := "0"
	if isPro {
		val = "1"
	}
	_ = client.Do(ctx, client.B().Setex().Key(cacheKey).Seconds(int64(apiKeyTierCacheTTL.Seconds())).Value(val).Build()).Error()
	return isPro
}

func dbEntitlementTier(c *gin.Context, entRepo repository.EntitlementRepository, userID int64) bool {
	ent, err := entRepo.GetEntitlement(c.Request.Context(), userID)
	if err != nil {
		return false
	}
	return ent.IsPro
}

// enforceAPIRateLimit applies the per-key sliding-window counters in Valkey
// (AC2): every authenticated request is logged in two sorted sets - one for
// the rolling hour, one for the rolling minute - trimmed by timestamp score.
// Both tiers are capped; exceeding either window returns 429 + Retry-After.
// When the cache is unavailable we fail open.
func enforceAPIRateLimit(c *gin.Context, keyID int64, isPro bool) apiKeyLimit {
	hourly, burst, tier := FreeAPIKeyHourlyLimit, FreeAPIKeyMinuteBurst, "free"
	if isPro {
		hourly, burst, tier = ProAPIKeyHourlyLimit, ProAPIKeyMinuteBurst, "pro"
	}

	limit := apiKeyLimit{
		tier:        tier,
		hourlyLimit: hourly,
		burstLimit:  burst,
		limitLabel:  fmt.Sprintf("%d/h;%d/min", hourly, burst),
		resetUnix:   time.Now().Add(minuteWindow).Unix(),
	}

	client := MustCache(c)
	if client == nil {
		limit.allowed = true // cache unavailable - fail open
		limit.remainingLabel = "unknown"
		return limit
	}

	nowMS := time.Now().UnixMilli()
	hourRes := slideWindowCount(c, client, keyID, "h", int64(hourly), hourWindow.Milliseconds(), nowMS)
	minRes := slideWindowCount(c, client, keyID, "m", int64(burst), minuteWindow.Milliseconds(), nowMS)

	remaining := int(int64(hourly)-hourRes.count) - 0
	if m := int(int64(burst) - minRes.count); m < remaining {
		remaining = m
	}
	if remaining < 0 {
		remaining = 0
	}
	limit.remainingLabel = strconv.Itoa(remaining)

	switch {
	case !hourRes.allowed && !minRes.allowed:
		limit.allowed = false
		limit.retryAfterSec = min(hourRes.retryAfterSec, minRes.retryAfterSec)
	case !hourRes.allowed:
		limit.allowed = false
		limit.retryAfterSec = hourRes.retryAfterSec
		limit.resetUnix = time.Now().Add(time.Duration(hourRes.retryAfterSec) * time.Second).Unix()
	case !minRes.allowed:
		limit.allowed = false
		limit.retryAfterSec = minRes.retryAfterSec
	default:
		limit.allowed = true
	}
	return limit
}

type windowCount struct {
	count         int64
	allowed       bool
	retryAfterSec int
}

// slideWindowCount records the request in the per-key sorted set for the
// given window ("h"/"m"), trims expired entries, and reports the live count.
// Scores are millisecond timestamps, so entries age out exactly one window
// after their request - a true sliding window log.
func slideWindowCount(c *gin.Context, client valkey.Client, keyID int64, suffix string, limit, windowMS, nowMS int64) windowCount {
	ctx := c.Request.Context()
	key := fmt.Sprintf("apirl:%s:%d", suffix, keyID)

	// Drop entries older than the window (score < now - window).
	_ = client.Do(ctx, client.B().Zremrangebyscore().Key(key).
		Min("0").Max(fmt.Sprintf("(%d", nowMS-windowMS)).Build()).Error()

	// Record this request; member embeds a nonce so concurrent calls never collide.
	member := fmt.Sprintf("%d-%d", nowMS, apiRequestNonce.Add(1))
	_ = client.Do(ctx, client.B().Zadd().Key(key).ScoreMember().
		ScoreMember(float64(nowMS), member).Build()).Error()
	_ = client.Do(ctx, client.B().Expire().Key(key).Seconds(windowMS/1000 + 1).Build()).Error()

	resp := client.Do(ctx, client.B().Zcard().Key(key).Build())
	count, err := resp.ToInt64()
	if err != nil {
		slog.Error("api rate limit: valkey error - failing open", "key_id", keyID, "err", err)
		return windowCount{count: 0, allowed: true}
	}
	if count <= limit {
		return windowCount{count: count, allowed: true}
	}

	// Window violated: client may retry once the oldest request slides out.
	retry := int((windowMS + 999) / 1000)
	if oldest := client.Do(ctx, client.B().Zrange().Key(key).Min("0").Max("0").Build()); oldest.Error() == nil {
		if arr, err := oldest.ToArray(); err == nil && len(arr) > 0 {
			var oldestMS int64
			if s, serr := arr[0].ToString(); serr == nil {
				fmt.Sscanf(s, "%d", &oldestMS)
			}
			if d := (oldestMS + windowMS - nowMS + 999) / 1000; d > 0 && d < int64(retry) {
				retry = int(d)
			}
		}
	}
	return windowCount{count: count, allowed: false, retryAfterSec: retry}
}
