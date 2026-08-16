package middleware

import (
	"log/slog"
	"net/http"

	"github.com/abhisheksoni27/opendoor/internal/repository"
	"github.com/gin-gonic/gin"
)

// RequireProOrQuota enforces 3 free monthly evaluations for Free users and unlimited evaluations for Pro users (Story 5.3).
func RequireProOrQuota(entRepo repository.EntitlementRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		userIDVal, exists := c.Get(UserIDKey)
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthenticated"})
			c.Abort()
			return
		}

		userID := userIDVal.(int64)

		// 1. Atomic Check-and-Deduct
		allowed, err := entRepo.DeductQuota(c.Request.Context(), userID)
		if err != nil {
			slog.Error("failed to deduct quota", "user_id", userID, "err", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to process quota check"})
			c.Abort()
			return
		}

		if !allowed {
			c.JSON(http.StatusPaymentRequired, gin.H{
				"error":        "Monthly free evaluation quota exceeded (3/3). Upgrade to Pro for unlimited evaluations.",
				"upgrade_url": "/pricing",
			})
			c.Abort()
			return
		}

		// Proceed to handler
		c.Next()

		// 2. Refund Safety: If handler panicked or failed with 500, refund the quota
		if c.Writer.Status() >= 500 {
			_ = entRepo.RefundQuota(c.Request.Context(), userID)
		}
	}
}
