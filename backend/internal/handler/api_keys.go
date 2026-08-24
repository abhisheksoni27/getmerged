package handler

import (
	"crypto/rand"
	"database/sql"
	"encoding/hex"
	"log/slog"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/abhisheksoni27/opendoor/internal/crypto"
	"github.com/abhisheksoni27/opendoor/internal/middleware"
	"github.com/abhisheksoni27/opendoor/internal/repository"
	"github.com/gin-gonic/gin"
)

const maxActiveAPIKeysPerUser = 5
const maxAPIKeyCreationsPerDay = 5
const rawAPIKeyRandomBytes = 20

type createAPIKeyRequest struct {
	Name string `json:"name"`
}

// generateRawAPIKey returns a odk_-prefixed high-entropy key. The raw value is
// returned to the caller exactly once; only its HMAC-SHA256 hash is stored.
func generateRawAPIKey() (string, error) {
	buf := make([]byte, rawAPIKeyRandomBytes)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	return middleware.APIKeyPrefix + hex.EncodeToString(buf), nil
}

// CreateAPIKey handles POST /api/v1/user/api-keys (AC1).
func CreateAPIKey(keyRepo repository.APIKeyRepository, hashSalt []byte) gin.HandlerFunc {
	return func(c *gin.Context) {
		userIDVal, exists := c.Get(middleware.UserIDKey)
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthenticated"})
			return
		}
		userID := userIDVal.(int64)

		var req createAPIKeyRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
			return
		}
		name := strings.TrimSpace(req.Name)
		if name == "" {
			name = "default"
		}
		if len(name) > 64 {
			name = name[:64]
		}

		active, err := keyRepo.CountActiveKeys(c.Request.Context(), userID)
		if err != nil {
			slog.Error("failed to count api keys", "user_id", userID, "err", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create API key"})
			return
		}
		if active >= maxActiveAPIKeysPerUser {
			c.JSON(http.StatusConflict, gin.H{
				"error":      "Maximum of 5 active API keys reached. Revoke one first.",
				"max_active": maxActiveAPIKeysPerUser,
			})
			return
		}

		// AC1: throttle key creation to 5 per user per rolling 24h window.
		created, err := keyRepo.CountCreatedSince(c.Request.Context(), userID, time.Now().UTC().Add(-24*time.Hour))
		if err != nil {
			slog.Error("failed to count recent api keys", "user_id", userID, "err", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create API key"})
			return
		}
		if created >= maxAPIKeyCreationsPerDay {
			c.JSON(http.StatusTooManyRequests, gin.H{
				"error":       "API key creation limit reached (5 per day). Try again later.",
				"code":        "ERR_KEY_CREATION_LIMIT",
				"max_per_day": maxAPIKeyCreationsPerDay,
			})
			return
		}

		rawKey, err := generateRawAPIKey()
		if err != nil {
			slog.Error("failed to generate api key", "user_id", userID, "err", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create API key"})
			return
		}
		keyHash := crypto.HashSHA256(rawKey, hashSalt)

		key, err := keyRepo.CreateAPIKey(c.Request.Context(), userID, name, keyHash, rawKey[:12])
		if err != nil {
			slog.Error("failed to persist api key", "user_id", userID, "err", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create API key"})
			return
		}

		c.JSON(http.StatusCreated, gin.H{
			"id":         key.ID,
			"name":       key.Name,
			"key_prefix": key.KeyPrefix,
			"key":        rawKey,
			"created_at": key.CreatedAt,
			"notice":     "Copy this key now - it will not be shown again.",
		})
	}
}

// ListAPIKeys handles GET /api/v1/user/api-keys (AC1).
func ListAPIKeys(keyRepo repository.APIKeyRepository, entRepo repository.EntitlementRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		userIDVal, exists := c.Get(middleware.UserIDKey)
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthenticated"})
			return
		}
		userID := userIDVal.(int64)

		keys, err := keyRepo.ListAPIKeys(c.Request.Context(), userID)
		if err != nil {
			slog.Error("failed to list api keys", "user_id", userID, "err", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list API keys"})
			return
		}

		isPro := false
		if ent, err := entRepo.GetEntitlement(c.Request.Context(), userID); err == nil {
			isPro = ent.IsPro
		}

		c.JSON(http.StatusOK, gin.H{
			"keys":   keys,
			"is_pro": isPro,
			"limits": gin.H{
				"free_hourly_requests":  middleware.FreeAPIKeyHourlyLimit,
				"free_burst_per_minute": middleware.FreeAPIKeyMinuteBurst,
				"pro_hourly_requests":   middleware.ProAPIKeyHourlyLimit,
				"pro_burst_per_minute":  middleware.ProAPIKeyMinuteBurst,
			},
		})
	}
}

// RevokeAPIKey handles DELETE /api/v1/user/api-keys/:id (AC1).
func RevokeAPIKey(keyRepo repository.APIKeyRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		userIDVal, exists := c.Get(middleware.UserIDKey)
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthenticated"})
			return
		}
		userID := userIDVal.(int64)

		keyID, err := strconv.ParseInt(c.Param("id"), 10, 64)
		if err != nil || keyID <= 0 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid key id"})
			return
		}

		if err := keyRepo.RevokeAPIKey(c.Request.Context(), userID, keyID); err != nil {
			if err == sql.ErrNoRows {
				c.JSON(http.StatusNotFound, gin.H{"error": "key not found or already revoked"})
				return
			}
			slog.Error("failed to revoke api key", "user_id", userID, "key_id", keyID, "err", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to revoke API key"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"ok": true})
	}
}
