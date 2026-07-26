package middleware

import (
	"log/slog"
	"net/http"
	"strings"

	"github.com/abhisheksoni27/opendoor/internal/auth"
	"github.com/gin-gonic/gin"
)

const UserIDKey = "user_id"
const UsernameKey = "username"

// UserAuth validates custom Opendoor JWT tokens from Authorization header or cookie.
func UserAuth(jwtSecret string) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		var tokenStr string

		if strings.HasPrefix(authHeader, "Bearer ") {
			tokenStr = strings.TrimPrefix(authHeader, "Bearer ")
		} else {
			cookieStr, err := c.Cookie("opendoor_token")
			if err == nil && cookieStr != "" {
				tokenStr = cookieStr
			}
		}

		if tokenStr == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "missing authentication token"})
			c.Abort()
			return
		}

		claims, err := auth.ParseToken(tokenStr, jwtSecret)
		if err != nil {
			slog.Warn("user auth: token validation failed", "err", err, "path", c.Request.URL.Path)
			c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid or expired token"})
			c.Abort()
			return
		}

		c.Set(UserIDKey, claims.UserID)
		c.Set(UsernameKey, claims.Username)
		c.Next()
	}
}
