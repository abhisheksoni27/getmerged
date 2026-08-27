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
		monthKey := c.Query("month")
		repos, err := s.GetWelcomingReposLeaderboard(c.Request.Context(), limit)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch leaderboard"})
			return
		}
		_, _, key, monthName := s.GetMonthRange(monthKey)
		c.JSON(http.StatusOK, gin.H{
			"month":      key,
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

// GetLeagueBadgeSVGHandler returns dynamic SVG badge for README embed.
func GetLeagueBadgeSVGHandler(s *league.Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		username := c.Param("username")
		monthKey := c.DefaultQuery("month", "")
		level := c.DefaultQuery("level", "Gold")

		svg := s.GenerateSVGMonthlyBadge(username, monthKey, level)
		c.Header("Content-Type", "image/svg+xml")
		c.Header("Cache-Control", "public, max-age=3600")
		c.String(http.StatusOK, svg)
	}
}
