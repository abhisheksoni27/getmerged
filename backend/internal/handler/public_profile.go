package handler

import (
	"net/http"
	"regexp"
	"strings"

	"github.com/abhisheksoni27/opendoor/internal/middleware"
	"github.com/abhisheksoni27/opendoor/internal/prtracker"
	"github.com/abhisheksoni27/opendoor/internal/repository"
	"github.com/gin-gonic/gin"
)

// AC2: usernames match GitHub's charset/length, case-insensitively.
var usernamePattern = regexp.MustCompile(`^[a-zA-Z0-9_-]{1,39}$`)

// GetPublicContributorProfileHandler handles GET /api/v1/u/:username.
// Case-insensitive lookup; renders public stats only when user.is_public=true,
// otherwise 404. Reserved route-colliding names are rejected here too so the
// block holds at signup AND route level. Contributor XP season fields
// (level/streak/season rank, AC6) are attached from the pr-eval store and
// degrade to the zero-XP defaults on any failure.
func GetPublicContributorProfileHandler(userRepo repository.UserRepository, prStore *prtracker.Store) gin.HandlerFunc {
	return func(c *gin.Context) {
		username := c.Param("username")
		if username == "" || !usernamePattern.MatchString(username) || repository.IsReservedSlug(username) {
			c.JSON(http.StatusNotFound, gin.H{"error": "profile not found"})
			return
		}

		profile, err := userRepo.GetPublicContributorProfileBySlug(c.Request.Context(), username)
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "profile not found"})
			return
		}
		if profile == nil || !profile.IsPublic {
			c.JSON(http.StatusNotFound, gin.H{"error": "profile not found"})
			return
		}

		if prStore != nil {
			if user, uerr := userRepo.FindBySlug(c.Request.Context(), strings.ToLower(strings.TrimSpace(username))); uerr == nil && user != nil {
				if stats, serr := prStore.GetSeasonStats(c.Request.Context(), user.ID); serr == nil && stats != nil {
					profile.Season = stats.Season
					profile.TotalXP = stats.TotalXP
					profile.SeasonXP = stats.SeasonXP
					profile.WeeklyXP = stats.WeeklyXP
					profile.Level = stats.Level
					profile.XPToNext = stats.XPToNext
					profile.StreakWeeks = stats.StreakWeeks
					profile.SeasonRank = stats.SeasonRank
					profile.Percentile = stats.Percentile
				}
			}
		}

		c.JSON(http.StatusOK, profile)
	}
}

type UpdateProfileVisibilityBody struct {
	IsPublic bool `json:"is_public"`
}

// UpdateProfileVisibilityHandler handles PATCH /api/v1/user/profile-visibility.
func UpdateProfileVisibilityHandler(userRepo repository.UserRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		userIDVal, exists := c.Get(middleware.UserIDKey)
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthenticated"})
			return
		}

		var body UpdateProfileVisibilityBody
		if err := c.ShouldBindJSON(&body); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
			return
		}

		userID, ok := userIDVal.(int64)
		if !ok {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthenticated"})
			return
		}

		if err := userRepo.UpdateProfilePublic(c.Request.Context(), userID, body.IsPublic); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update profile visibility"})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"status":    "ok",
			"is_public": body.IsPublic,
		})
	}
}
