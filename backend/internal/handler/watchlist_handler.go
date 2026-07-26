package handler

import (
	"log/slog"
	"net/http"

	"github.com/abhisheksoni27/opendoor/internal/middleware"
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

		c.JSON(http.StatusOK, gin.H{"message": "repository removed from watchlist"})
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

		c.JSON(http.StatusOK, gin.H{"watchlist": items})
	}
}
