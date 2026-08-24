package handler

import (
	"errors"
	"log/slog"
	"net/http"
	"strconv"

	"github.com/abhisheksoni27/opendoor/internal/middleware"
	"github.com/abhisheksoni27/opendoor/internal/repository"
	"github.com/gin-gonic/gin"
)

type AddWatchlistWebhookRequest struct {
	URL   string `json:"url" binding:"required"`
	Label string `json:"label" binding:"required"`
}

// AddWatchlistWebhook handles POST /api/v1/user/watchlist/webhooks.
// Validates https-only allowlisted Slack/Discord URLs (AC2), enforces the
// per-user cap of 5 channels (AC1) and returns the masked channel (AC2).
func AddWatchlistWebhook(repo repository.WatchlistWebhookRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		userIDVal, exists := c.Get(middleware.UserIDKey)
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthenticated"})
			return
		}
		userID := userIDVal.(int64)

		var req AddWatchlistWebhookRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "url and label are required"})
			return
		}

		wh, err := repo.Add(c.Request.Context(), userID, req.Label, req.URL)
		if err != nil {
			if errors.Is(err, repository.ErrWebhookLimitReached) {
				c.JSON(http.StatusBadRequest, gin.H{"error": "webhook limit reached (max 5)"})
				return
			}
			slog.Warn("add webhook rejected", "user_id", userID, "err", err)
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "webhook added", "webhook": wh})
	}
}

// ListWatchlistWebhooks handles GET /api/v1/user/watchlist/webhooks.
// URLs are returned masked; disabled channels surface enabled=false so the
// watchlist UI can show the warning status (AC4).
func ListWatchlistWebhooks(repo repository.WatchlistWebhookRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		userIDVal, exists := c.Get(middleware.UserIDKey)
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthenticated"})
			return
		}
		userID := userIDVal.(int64)

		items, err := repo.List(c.Request.Context(), userID)
		if err != nil {
			slog.Error("list webhooks failed", "user_id", userID, "err", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list webhooks"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"webhooks": items})
	}
}

// RemoveWatchlistWebhook handles DELETE /api/v1/user/watchlist/webhooks/:id
func RemoveWatchlistWebhook(repo repository.WatchlistWebhookRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		userIDVal, exists := c.Get(middleware.UserIDKey)
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthenticated"})
			return
		}
		userID := userIDVal.(int64)

		id, err := strconv.ParseInt(c.Param("id"), 10, 64)
		if err != nil || id <= 0 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid webhook id"})
			return
		}

		if err := repo.Remove(c.Request.Context(), userID, id); err != nil {
			slog.Error("remove webhook failed", "user_id", userID, "webhook_id", id, "err", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to remove webhook"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "webhook removed"})
	}
}
