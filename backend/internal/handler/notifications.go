package handler

import (
	"log/slog"
	"net/http"
	"strconv"
	"strings"

	"github.com/abhisheksoni27/opendoor/internal/middleware"
	"github.com/abhisheksoni27/opendoor/internal/notification"
	"github.com/gin-gonic/gin"
)

// GetNotificationsHandler handles GET /api/notifications and GET /api/v1/notifications
// AC1: cursor-paginated alerts filtered by visible_at <= NOW() and user preference toggles.
func GetNotificationsHandler(repo notification.NotificationCenterRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		userIDVal, exists := c.Get(middleware.UserIDKey)
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthenticated"})
			return
		}
		userID := userIDVal.(int64)

		cursorStr := c.Query("cursor")
		var cursor int64 = 0
		if cursorStr != "" {
			if parsed, err := strconv.ParseInt(cursorStr, 10, 64); err == nil {
				cursor = parsed
			}
		}

		limitStr := c.Query("limit")
		limit := 20
		if limitStr != "" {
			if parsed, err := strconv.Atoi(limitStr); err == nil && parsed > 0 && parsed <= 100 {
				limit = parsed
			}
		}

		items, nextCursor, hasMore, err := repo.GetNotifications(c.Request.Context(), userID, cursor, limit)
		if err != nil {
			slog.Error("get notifications failed", "user_id", userID, "err", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to retrieve notifications"})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"notifications": items,
			"next_cursor":   nextCursor,
			"has_more":      hasMore,
		})
	}
}

// GetUnreadNotificationCountHandler handles GET /api/notifications/unread-count and GET /api/v1/notifications/unread-count
// AC2: unread count with ETag/304 support.
func GetUnreadNotificationCountHandler(repo notification.NotificationCenterRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		userIDVal, exists := c.Get(middleware.UserIDKey)
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthenticated"})
			return
		}
		userID := userIDVal.(int64)

		count, etag, err := repo.GetUnreadCount(c.Request.Context(), userID)
		if err != nil {
			slog.Error("get unread count failed", "user_id", userID, "err", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get unread count"})
			return
		}

		c.Header("ETag", etag)
		c.Header("Cache-Control", "private, no-cache")

		// If-None-Match check for 304 Not Modified
		if match := c.GetHeader("If-None-Match"); match != "" {
			if strings.TrimSpace(match) == etag || strings.Trim(match, `"`) == strings.Trim(etag, `"`) {
				c.Status(http.StatusNotModified)
				return
			}
		}

		c.JSON(http.StatusOK, gin.H{
			"unread_count": count,
			"etag":         etag,
		})
	}
}

type MarkReadRequest struct {
	IDs     []int64 `json:"ids"`
	MarkAll bool    `json:"mark_all"`
}

// MarkNotificationsReadHandler handles POST /api/notifications/mark-read and POST /api/v1/notifications/mark-read
// AC3: accepts { ids?: string[] | number[], mark_all?: boolean } to update unread state in a single batch query.
func MarkNotificationsReadHandler(repo notification.NotificationCenterRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		userIDVal, exists := c.Get(middleware.UserIDKey)
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthenticated"})
			return
		}
		userID := userIDVal.(int64)

		var raw struct {
			IDs     []any `json:"ids"`
			MarkAll bool  `json:"mark_all"`
		}
		if err := c.ShouldBindJSON(&raw); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid payload"})
			return
		}

		var ids []int64
		for _, rawID := range raw.IDs {
			switch v := rawID.(type) {
			case float64:
				ids = append(ids, int64(v))
			case string:
				if parsed, err := strconv.ParseInt(v, 10, 64); err == nil {
					ids = append(ids, parsed)
				}
			}
		}

		if err := repo.MarkRead(c.Request.Context(), userID, ids, raw.MarkAll); err != nil {
			slog.Error("mark read notifications failed", "user_id", userID, "err", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update notifications"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"success": true})
	}
}

// GetNotificationPreferencesHandler handles GET /api/notifications/preferences and GET /api/v1/notifications/preferences
func GetNotificationPreferencesHandler(repo notification.NotificationCenterRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		userIDVal, exists := c.Get(middleware.UserIDKey)
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthenticated"})
			return
		}
		userID := userIDVal.(int64)

		prefs, err := repo.GetPreferences(c.Request.Context(), userID)
		if err != nil {
			slog.Error("get notification preferences failed", "user_id", userID, "err", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get preferences"})
			return
		}

		c.JSON(http.StatusOK, prefs)
	}
}

// UpdateNotificationPreferencesHandler handles PUT /api/notifications/preferences and PUT /api/v1/notifications/preferences
// AC4: saves per-category toggles.
func UpdateNotificationPreferencesHandler(repo notification.NotificationCenterRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		userIDVal, exists := c.Get(middleware.UserIDKey)
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthenticated"})
			return
		}
		userID := userIDVal.(int64)

		var req notification.UserNotificationPreferences
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid preferences payload"})
			return
		}

		if err := repo.SavePreferences(c.Request.Context(), userID, &req); err != nil {
			slog.Error("update notification preferences failed", "user_id", userID, "err", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to save preferences"})
			return
		}

		c.JSON(http.StatusOK, req)
	}
}
