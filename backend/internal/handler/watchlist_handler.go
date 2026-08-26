package handler

import (
	"database/sql"
	"errors"
	"log/slog"
	"net/http"

	"github.com/abhisheksoni27/opendoor/internal/middleware"
	"github.com/abhisheksoni27/opendoor/internal/notification"
	"github.com/abhisheksoni27/opendoor/internal/repository"
	"github.com/gin-gonic/gin"
)

type AddWatchlistRequest struct {
	RepoID string `json:"repo_id" binding:"required"`
}

// AddToWatchlist handles POST /api/v1/user/watchlist
func AddToWatchlist(repo repository.WatchlistRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		userIDVal, exists := c.Get(middleware.UserIDKey)
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthenticated"})
			return
		}
		userID := userIDVal.(int64)

		var req AddWatchlistRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid repo_id"})
			return
		}

		if err := repo.Add(c.Request.Context(), userID, req.RepoID); err != nil {
			slog.Error("add watchlist failed", "user_id", userID, "repo_id", req.RepoID, "err", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to add repository to watchlist"})
			return
		}

		// AC4: seed last_alerted_snapshot with the repo's current rescore so
		// the first nightly alert cycle after watching never alerts.
		if mdb := middleware.MustDB(c); mdb != nil {
			if err := notification.SeedWatchBaseline(c.Request.Context(), mdb, userID, req.RepoID); err != nil {
				slog.Warn("watch baseline seed failed", "user_id", userID, "repo_id", req.RepoID, "err", err)
			}
		}

		c.JSON(http.StatusOK, gin.H{"message": "repository added to watchlist"})
	}
}

// RemoveFromWatchlist handles DELETE /api/v1/user/watchlist/:id
func RemoveFromWatchlist(repo repository.WatchlistRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		userIDVal, exists := c.Get(middleware.UserIDKey)
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthenticated"})
			return
		}
		userID := userIDVal.(int64)
		repoID := c.Param("id")

		if err := repo.Remove(c.Request.Context(), userID, repoID); err != nil {
			slog.Error("remove watchlist failed", "user_id", userID, "repo_id", repoID, "err", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to remove repository from watchlist"})
			return
		}

		// AC6: only this user's entry was removed; the repo's snapshot data
		// persists until the last watcher leaves, then it is purged.
		if mdb := middleware.MustDB(c); mdb != nil {
			var remaining int
			if err := mdb.GetContext(c.Request.Context(), &remaining,
				`SELECT COUNT(1) FROM user_watchlists WHERE repo_id=?`, repoID); err == nil && remaining == 0 {
				if err := notification.PurgeRepoWatchData(c.Request.Context(), mdb, repoID); err != nil {
					slog.Warn("watch data purge failed", "repo_id", repoID, "err", err)
				}
			}
		}

		c.JSON(http.StatusOK, gin.H{"message": "repository removed from watchlist"})
	}
}

// ToggleWatchlistAlerts handles PATCH /api/v1/user/watchlist/:id (AC3):
// turns nightly C-Rank change alert emails on/off for one watched repo
// without removing it from the watchlist.
func ToggleWatchlistAlerts(repo repository.WatchlistRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		userIDVal, exists := c.Get(middleware.UserIDKey)
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthenticated"})
			return
		}
		userID := userIDVal.(int64)
		repoID := c.Param("id")

		var req struct {
			NotifyRankChange *bool `json:"notify_rank_change" binding:"required"`
		}
		if err := c.ShouldBindJSON(&req); err != nil || req.NotifyRankChange == nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "notify_rank_change must be true or false"})
			return
		}

		if err := repo.SetNotify(c.Request.Context(), userID, repoID, *req.NotifyRankChange); err != nil {
			if errors.Is(err, sql.ErrNoRows) {
				c.JSON(http.StatusNotFound, gin.H{"error": "repository not in watchlist"})
				return
			}
			slog.Error("toggle watchlist alerts failed", "user_id", userID, "repo_id", repoID, "err", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update alert preference"})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"message":            "alert preference updated",
			"repo_id":            repoID,
			"notify_rank_change": *req.NotifyRankChange,
		})
	}
}

// ListWatchlist handles GET /api/v1/user/watchlist
func ListWatchlist(repo repository.WatchlistRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		userIDVal, exists := c.Get(middleware.UserIDKey)
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthenticated"})
			return
		}
		userID := userIDVal.(int64)

		items, err := repo.ListByUserID(c.Request.Context(), userID)
		if err != nil {
			slog.Error("list watchlist failed", "user_id", userID, "err", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list watchlist"})
			return
		}

		alerts, err := repo.ListAlertStatus(c.Request.Context(), userID)
		if err != nil {
			slog.Warn("list watchlist alert status failed", "user_id", userID, "err", err)
			alerts = map[string]bool{}
		}

		c.JSON(http.StatusOK, gin.H{"watchlist": items, "alerts": alerts})
	}
}
