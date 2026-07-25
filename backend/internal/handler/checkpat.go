package handler

import (
	"log/slog"
	"net/http"

	ghclient "github.com/abhisheksoni27/opendoor/internal/github"
	"github.com/gin-gonic/gin"
)

// CheckPAT handles POST /internal/check-pat
// Validates the configured GITHUB_TOKEN against GitHub's viewer query.
func CheckPAT(gh *ghclient.Client) gin.HandlerFunc {
	return func(c *gin.Context) {
		login, rateLimit, err := gh.CheckToken()
		if err != nil {
			slog.Error("check-pat failed", "err", err)
			c.JSON(http.StatusOK, gin.H{
				"valid": false,
				"error": err.Error(),
			})
			return
		}

		slog.Info("check-pat success", "login", login, "remaining", rateLimit.Remaining)
		c.JSON(http.StatusOK, gin.H{
			"valid": true,
			"user":  login,
			"rate_limit": gin.H{
				"remaining": rateLimit.Remaining,
				"reset_at":  rateLimit.ResetAt,
			},
		})
	}
}
