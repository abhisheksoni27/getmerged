package middleware

import (
	"log/slog"
	"net/http"

	"github.com/gin-gonic/gin"
)

// Auth validates the x-api-key header for internal routes.
func Auth(expectedKey string) gin.HandlerFunc {
	return func(c *gin.Context) {
		key := c.GetHeader("x-api-key")
		if key == "" || key != expectedKey {
			slog.Warn("auth: rejected request",
				"path", c.FullPath(),
				"ip", c.ClientIP(),
				"reason", "invalid or missing x-api-key",
			)
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "forbidden"})
			return
		}
		c.Next()
	}
}
