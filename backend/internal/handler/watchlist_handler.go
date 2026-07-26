package handler

import (
	"net/http"
	"strconv"

	"github.com/abhisheksoni27/opendoor/internal/middleware"
	"github.com/gin-gonic/gin"
)

type AddWatchlistRequest struct {
	RepoID int64 `json:"repo_id" binding:"required"`
}

// AddToWatchlist handles POST /api/v1/user/watchlist
func AddToWatchlist() gin.HandlerFunc {
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

		db := middleware.MustDB(c)
		if db == nil {
			return
		}

		_, err := db.ExecContext(c.Request.Context(), `
			INSERT INTO user_watchlists (user_id, repo_id, notify_rank_change, created_at)
			VALUES (?, ?, TRUE, CURRENT_TIMESTAMP)
			ON CONFLICT(user_id, repo_id) DO NOTHING
		`, userID, req.RepoID)

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to add repository to watchlist"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "repository added to watchlist"})
	}
}

// RemoveFromWatchlist handles DELETE /api/v1/user/watchlist/:id
func RemoveFromWatchlist() gin.HandlerFunc {
	return func(c *gin.Context) {
		userIDVal, exists := c.Get(middleware.UserIDKey)
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthenticated"})
			return
		}
		userID := userIDVal.(int64)

		repoIDStr := c.Param("id")
		repoID, err := strconv.ParseInt(repoIDStr, 10, 64)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid repository ID"})
			return
		}

		db := middleware.MustDB(c)
		if db == nil {
			return
		}

		_, err = db.ExecContext(c.Request.Context(), "DELETE FROM user_watchlists WHERE user_id = ? AND repo_id = ?", userID, repoID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to remove repository from watchlist"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "repository removed from watchlist"})
	}
}

// ListWatchlist handles GET /api/v1/user/watchlist
func ListWatchlist() gin.HandlerFunc {
	return func(c *gin.Context) {
		userIDVal, exists := c.Get(middleware.UserIDKey)
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthenticated"})
			return
		}
		userID := userIDVal.(int64)

		db := middleware.MustDB(c)
		if db == nil {
			return
		}

		type WatchlistRepo struct {
			RepoID    int64   `db:"repo_id" json:"repo_id"`
			FullName  string  `db:"full_name" json:"full_name"`
			Language  string  `db:"language" json:"language"`
			Stars     int     `db:"stars" json:"stars"`
			ClassRank string  `db:"class_rank" json:"class_rank"`
			Score     float64 `db:"score" json:"score"`
		}

		var items []WatchlistRepo
		query := `
			SELECT r.id as repo_id, r.full_name, r.language, r.stars, COALESCE(s.class_rank, 'N/A') as class_rank, COALESCE(s.score, 0.0) as score
			FROM user_watchlists w
			JOIN repos r ON w.repo_id = r.id
			LEFT JOIN repo_scores s ON r.id = s.repo_id
			WHERE w.user_id = ?
			ORDER BY w.created_at DESC
		`

		if err := db.SelectContext(c.Request.Context(), &items, query, userID); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list watchlist"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"watchlist": items})
	}
}
