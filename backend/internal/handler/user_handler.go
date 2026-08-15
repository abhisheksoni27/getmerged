package handler

import (
	"database/sql"
	"net/http"
	"strings"

	"github.com/abhisheksoni27/opendoor/internal/repository"
	"github.com/gin-gonic/gin"
)

// GetUserProfile handles GET /api/v1/users/:slug (public, unauthenticated)
func GetUserProfile(userRepo repository.UserRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		slug := strings.TrimSpace(c.Param("slug"))
		if slug == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "slug parameter is required"})
			return
		}

		profile, err := userRepo.GetUserProfileBySlug(c.Request.Context(), slug)
		if err == sql.ErrNoRows || profile == nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "user profile not found"})
			return
		}
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch user profile"})
			return
		}

		c.JSON(http.StatusOK, profile)
	}
}
