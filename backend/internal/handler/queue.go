package handler

import (
	"log/slog"
	"net/http"
	"strings"

	"github.com/abhisheksoni27/opendoor/internal/middleware"
	"github.com/gin-gonic/gin"
	"github.com/jmoiron/sqlx"
)

type QueueRepoBody struct {
	Owner string `json:"owner" binding:"required"`
	Name  string `json:"name" binding:"required"`
}

// RequestRepoIndexing handles POST /api/v1/repos/queue
// Enqueues an unindexed repository into indexing_queue for nightly cron processing.
func RequestRepoIndexing(database *sqlx.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		db := database
		if db == nil {
			db = middleware.MustDB(c)
		}
		if db == nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "database unavailable"})
			return
		}

		var body QueueRepoBody
		if err := c.ShouldBindJSON(&body); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "owner and name are required"})
			return
		}

		owner := strings.TrimSpace(body.Owner)
		name := strings.TrimSpace(body.Name)
		if owner == "" || name == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "owner and name cannot be empty"})
			return
		}

		fullName := owner + "/" + name

		// Check if already indexed in repositories
		var count int
		_ = db.GetContext(c.Request.Context(), &count, "SELECT COUNT(1) FROM repositories WHERE LOWER(full_name) = LOWER(?)", fullName)
		if count > 0 {
			c.JSON(http.StatusOK, gin.H{
				"status":    "already_indexed",
				"full_name": fullName,
				"message":   "Repository is already indexed in the database.",
			})
			return
		}

		// Get user_id if logged in (optional)
		var userID *int64
		if u, exists := c.Get("user_id"); exists {
			if id, ok := u.(int64); ok && id > 0 {
				userID = &id
			}
		}

		// Upsert into indexing_queue (ignore duplicate pending requests for same full_name)
		query := `
			INSERT INTO indexing_queue (full_name, owner, name, requested_by_user_id, status, created_at)
			VALUES (?, ?, ?, ?, 'pending', CURRENT_TIMESTAMP)
			ON CONFLICT(full_name) DO UPDATE SET
				created_at = excluded.created_at
		`
		_, err := db.ExecContext(c.Request.Context(), query, fullName, owner, name, userID)
		if err != nil {
			slog.Error("queue-repo: failed to enqueue", "repo", fullName, "err", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to queue repository for indexing"})
			return
		}

		slog.Info("queue-repo: successfully queued", "repo", fullName)

		c.JSON(http.StatusAccepted, gin.H{
			"status":    "queued",
			"full_name": fullName,
			"message":   "Repository queued for indexing. It will be scored in our nightly processing run.",
		})
	}
}
