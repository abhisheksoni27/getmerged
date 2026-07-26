package handler

import (
	"net/http"

	"github.com/abhisheksoni27/opendoor/internal/analytics"
	"github.com/abhisheksoni27/opendoor/internal/middleware"
	"github.com/gin-gonic/gin"
)

// GetMacroStats handles GET /api/v1/stats/macro
func GetMacroStats() gin.HandlerFunc {
	return func(c *gin.Context) {
		db := middleware.MustDB(c)
		if db == nil {
			return
		}

		// Cloudflare edge & browser cache headers (1 hour cache)
		c.Header("Cache-Control", "public, max-age=3600, s-maxage=86400, stale-while-revalidate=600")

		stats, err := analytics.GetCachedMacroStats(c.Request.Context(), db)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to retrieve macro statistics"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"stats": stats})
	}
}
