package handler

import (
	"net/http"
	"regexp"

	"github.com/abhisheksoni27/opendoor/internal/middleware"
	"github.com/abhisheksoni27/opendoor/internal/repository"
	"github.com/gin-gonic/gin"
)

// AC2: usernames match GitHub's charset/length, case-insensitively.
var usernamePattern = regexp.MustCompile(`^[a-zA-Z0-9_-]{1,39}$`)

// GetPublicContributorProfileHandler handles GET /api/v1/u/:username.
// Case-insensitive lookup; renders public stats only when user.is_public=true,
// otherwise 404. Reserved route-colliding names are rejected here too so the
// block holds at signup AND route level.
func GetPublicContributorProfileHandler(userRepo repository.UserRepository) gin.HandlerFunc {
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
