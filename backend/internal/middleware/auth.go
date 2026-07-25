package middleware

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// Auth validates the x-api-key header for internal routes.
// The expected key is passed in at server startup from config.
func Auth(expectedKey string) gin.HandlerFunc {
	return func(c *gin.Context) {
		key := c.GetHeader("x-api-key")
		if key == "" || key != expectedKey {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "forbidden"})
			return
		}
		c.Next()
	}
}
