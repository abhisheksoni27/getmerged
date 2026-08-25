package handler

import (
	"log/slog"
	"net/http"
	"strconv"
	"time"

	"github.com/abhisheksoni27/opendoor/internal/config"
	"github.com/abhisheksoni27/opendoor/internal/middleware"
	"github.com/abhisheksoni27/opendoor/internal/notification"
	"github.com/gin-gonic/gin"
)

// Unsubscribe handles GET /unsubscribe?uid=<user>&token=<hmac(uid,JOB_SECRET)>
// Marks the user digest-unsubscribed; excluded from all future digests (AC7).
func Unsubscribe(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		uidStr := c.Query("uid")
		token := c.Query("token")

		if !notification.VerifyUnsubscribeToken(uidStr, token, cfg.JobSecret) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid unsubscribe link"})
			return
		}
		uid, err := strconv.ParseInt(uidStr, 10, 64)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid unsubscribe link"})
			return
		}

		db := middleware.MustDB(c)
		if db == nil {
			return
		}

		if _, err := db.Exec(
			`UPDATE users SET digest_unsubscribed = TRUE, updated_at = ? WHERE id = ?`,
			time.Now().UTC(), uid); err != nil {
			slog.Error("unsubscribe failed", "user_id", uid, "err", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to unsubscribe"})
			return
		}

		slog.Info("user unsubscribed from weekly digests", "user_id", uid)
		c.Header("Content-Type", "text/html; charset=utf-8")
		c.String(http.StatusOK, "<html><body style=\"font-family: sans-serif; text-align: center; padding: 48px;\"><h2>You're unsubscribed</h2><p>You will no longer receive weekly GetMerged digest emails.</p></body></html>")
	}
}

// Resubscribe handles GET /resubscribe?uid=<user>&token=<expiring hmac>.
// Re-enables digest emails and clears an invalid-email flag so hard-bounced
// watchers can re-verify and receive alerts again (AC8). Invalid or expired
// tokens return 4xx without modifying subscriptions (AC7).
func Resubscribe(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		uidStr := c.Query("uid")
		token := c.Query("token")

		if !notification.VerifyUnsubscribeToken(uidStr, token, cfg.JobSecret) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid resubscribe link"})
			return
		}
		uid, err := strconv.ParseInt(uidStr, 10, 64)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid resubscribe link"})
			return
		}

		db := middleware.MustDB(c)
		if db == nil {
			return
		}

		if _, err := db.Exec(
			`UPDATE users SET digest_unsubscribed = FALSE, email_invalid = FALSE, updated_at = ? WHERE id = ?`,
			time.Now().UTC(), uid); err != nil {
			slog.Error("resubscribe failed", "user_id", uid, "err", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to resubscribe"})
			return
		}

		slog.Info("user resubscribed to watchlist alerts", "user_id", uid)
		c.Header("Content-Type", "text/html; charset=utf-8")
		c.String(http.StatusOK, "<html><body style=\"font-family: sans-serif; text-align: center; padding: 48px;\"><h2>You're back on</h2><p>You will receive watchlist alert emails again.</p></body></html>")
	}
}
