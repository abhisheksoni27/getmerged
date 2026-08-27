package handler

import (
	"net/http"
	"strconv"

	"github.com/abhisheksoni27/opendoor/internal/league"
	"github.com/gin-gonic/gin"
)

// GetLeagueLeaderboardHandler returns the top welcoming repos for the monthly sprint.
func GetLeagueLeaderboardHandler(s *league.Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))
		repos, err := s.GetWelcomingReposLeaderboard(c.Request.Context(), limit)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch leaderboard"})
			return
		}
		_, _, monthKey, monthName := s.GetActiveMonthRange()
		c.JSON(http.StatusOK, gin.H{
			"month":      monthKey,
			"month_name": monthName,
			"repos":      repos,
		})
	}
}

// GetLeagueProgressHandler returns user's progress in active monthly sprint.
func GetLeagueProgressHandler(s *league.Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		userIDVal, exists := c.Get("user_id")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
			return
		}
		userID, ok := userIDVal.(int)
		if !ok {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid user context"})
			return
		}

		progress, err := s.GetUserMonthlyProgress(c.Request.Context(), userID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch monthly progress"})
			return
		}
		c.JSON(http.StatusOK, progress)
	}
}
