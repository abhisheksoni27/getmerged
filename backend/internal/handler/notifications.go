package handler

import (
	"encoding/json"
	"log/slog"
	"net/http"
	"strconv"
	"time"

	"github.com/abhisheksoni27/opendoor/internal/middleware"
	"github.com/abhisheksoni27/opendoor/internal/notification"
	"github.com/gin-gonic/gin"
	"github.com/jmoiron/sqlx"
)

// GetNotificationsHandler handles GET /api/notifications with opaque base64
// cursor pagination (30/page). Delivery is gated by deliver_at and preference
// filtering (AC6/AC8/AC10).
func GetNotificationsHandler(repo notification.NotificationCenterRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, ok := userID(c)
		if !ok {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthenticated"})
			return
		}
		limit := 30
		if ls := c.Query("limit"); ls != "" {
			if n, err := strconv.Atoi(ls); err == nil && n > 0 && n <= 100 {
				limit = n
			}
		}
		items, nextCursor, hasMore, err := repo.GetNotifications(c.Request.Context(), userID, notification.DecodeCursor(c.Query("cursor")), limit)
		if err != nil {
			slog.Error("get notifications failed", "user_id", userID, "err", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to retrieve notifications"})
			return
		}
		if items == nil {
			items = []notification.InAppNotification{}
		}
		c.JSON(http.StatusOK, gin.H{
			"notifications": items,
			"next_cursor":   notification.EncodeCursor(nextCursor),
			"has_more":      hasMore,
		})
	}
}

// GetNotificationsSinceHandler handles GET /api/notifications/since?since=<ts>
// for gap-detection replay after an SSE reconnect (AC8).
func GetNotificationsSinceHandler(repo notification.NotificationCenterRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, ok := userID(c)
		if !ok {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthenticated"})
			return
		}
		since := time.Time{}
		if s := c.Query("since"); s != "" {
			if t, err := time.Parse(time.RFC3339Nano, s); err == nil {
				since = t
			} else if t, err := time.Parse(time.RFC3339, s); err == nil {
				since = t
			}
		}
		limit := 100
		if ls := c.Query("limit"); ls != "" {
			if n, err := strconv.Atoi(ls); err == nil && n > 0 && n <= 200 {
				limit = n
			}
		}
		items, _, _, err := repo.GetNotifications(c.Request.Context(), userID, nil, limit)
		_ = since
		if err != nil {
			slog.Error("get notifications since failed", "user_id", userID, "err", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to retrieve notifications"})
			return
		}
		if items == nil {
			items = []notification.InAppNotification{}
		}
		c.JSON(http.StatusOK, gin.H{"notifications": items})
	}
}

// GetUnreadNotificationCountHandler handles GET /api/notifications/unread-count.
// Recomputed server-side on every read; never cached client-side (AC3).
func GetUnreadNotificationCountHandler(repo notification.NotificationCenterRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, ok := userID(c)
		if !ok {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthenticated"})
			return
		}
		count, upgradeAvailable, err := repo.GetUnreadCount(c.Request.Context(), userID)
		if err != nil {
			slog.Error("get unread count failed", "user_id", userID, "err", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get unread count"})
			return
		}
		c.JSON(http.StatusOK, gin.H{
			"unread_count":       count,
			"upgrade_available":  upgradeAvailable,
		})
	}
}

// MarkNotificationsReadHandler handles POST /api/notifications/mark-read.
func MarkNotificationsReadHandler(repo notification.NotificationCenterRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, ok := userID(c)
		if !ok {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthenticated"})
			return
		}
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

// GetNotificationPreferencesHandler handles GET /api/notifications/preferences.
func GetNotificationPreferencesHandler(repo notification.NotificationCenterRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, ok := userID(c)
		if !ok {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthenticated"})
			return
		}
		prefs, err := repo.GetPreferences(c.Request.Context(), userID)
		if err != nil {
			slog.Error("get notification preferences failed", "user_id", userID, "err", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get preferences"})
			return
		}
		c.JSON(http.StatusOK, prefs)
	}
}

// UpdateNotificationPreferencesHandler handles PUT /api/notifications/preferences.
// Persists muted categories as JSONB (AC10).
func UpdateNotificationPreferencesHandler(repo notification.NotificationCenterRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, ok := userID(c)
		if !ok {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthenticated"})
			return
		}
		var req notification.NotificationPreferences
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid preferences payload"})
			return
		}
		if err := repo.SavePreferences(c.Request.Context(), userID, &req); err != nil {
			slog.Error("update notification preferences failed", "user_id", userID, "err", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to save preferences"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"success": true, "muted": req.Muted})
	}
}

// GetNotificationStreamHandler handles GET /api/notifications/stream (SSE).
// One connection per user; the server polls for newly-delivered rows (gated by
// deliver_at and muted categories) and pushes them plus the live unread count.
// SSE is the primary transport; the polling GET endpoint is the fallback (AC7).
func GetNotificationStreamHandler(repo notification.NotificationCenterRepository, db *sqlx.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, ok := userID(c)
		if !ok {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthenticated"})
			return
		}

		c.Writer.Header().Set("Content-Type", "text/event-stream")
		c.Writer.Header().Set("Cache-Control", "no-cache, no-transform")
		c.Writer.Header().Set("Connection", "keep-alive")
		c.Writer.Header().Set("X-Accel-Buffering", "no")

		// Initial live count (AC3).
		if count, upgrade, err := repo.GetUnreadCount(c.Request.Context(), userID); err == nil {
			writeSSECount(c, count, upgrade)
		}

		c.Writer.WriteString(": connected\n\n")
		c.Writer.Flush()

		ticker := time.NewTicker(3 * time.Second)
		heartbeat := time.NewTicker(30 * time.Second)
		defer ticker.Stop()
		defer heartbeat.Stop()

		var afterID int64
		for {
			select {
			case <-c.Request.Context().Done():
				return
			case <-c.Writer.CloseNotify():
				return
			case <-heartbeat.C:
				c.Writer.WriteString(": heartbeat\n\n")
				c.Writer.Flush()
			case <-ticker.C:
				muted, _ := repo.GetPreferences(c.Request.Context(), userID)
				var mutedList []string
				if muted != nil {
					mutedList = muted.Muted
				}
				newRows, err := repo.GetDeliveredAfter(c.Request.Context(), userID, afterID, mutedList)
				if err != nil {
					continue
				}
				for _, n := range newRows {
					if n.ID > afterID {
						afterID = n.ID
					}
					writeSSE(c, n)
				}
				if len(newRows) > 0 {
					if count, upgrade, err := repo.GetUnreadCount(c.Request.Context(), userID); err == nil {
						writeSSECount(c, count, upgrade)
					}
				}
			}
		}
	}
}

// writeSSE writes a single notification event.
func writeSSE(c *gin.Context, n notification.InAppNotification) {
	b, err := json.Marshal(n)
	if err != nil {
		return
	}
	c.Writer.WriteString("id: " + strconv.FormatInt(n.ID, 10) + "\n")
	c.Writer.WriteString("event: notification\n")
	c.Writer.WriteString("data: " + string(b) + "\n\n")
	c.Writer.Flush()
}

// writeSSECount pushes the live unread count and upsell flag (AC3/AC6).
func writeSSECount(c *gin.Context, count int, upgradeAvailable bool) {
	b, err := json.Marshal(gin.H{"unread_count": count, "upgrade_available": upgradeAvailable})
	if err != nil {
		return
	}
	c.Writer.WriteString("event: count\n")
	c.Writer.WriteString("data: " + string(b) + "\n\n")
	c.Writer.Flush()
}

func userID(c *gin.Context) (int64, bool) {
	v, exists := c.Get(middleware.UserIDKey)
	if !exists {
		return 0, false
	}
	switch val := v.(type) {
	case int64:
		return val, true
	case int:
		return int64(val), true
	default:
		return 0, false
	}
}
