package middleware

import (
	"log/slog"
	"net/http"

	"github.com/abhisheksoni27/opendoor/internal/repository"
	"github.com/gin-gonic/gin"
)

// RequireProOrQuota enforces 3 free monthly evaluations for Free users and unlimited evaluations for Pro users (Story 5.3).
// Anonymous visitors are allowed through as an instant trial (aha-before-auth):
// the per-IP trial limiter chained before this middleware enforces ONE anonymous
// evaluation, and the client soft-gates the result behind GitHub sign-in.
func RequireProOrQuota(entRepo repository.EntitlementRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		userIDVal, exists := c.Get(UserIDKey)
		if !exists {
			c.Header("X-Anonymous-Trial", "1")
			c.Next()
			return
		}

		userID := userIDVal.(int64)

		// Pro tier gets unlimited preflight runs: skip the quota check and
		// deduction entirely (AC7).
		if ent, e := entRepo.GetEntitlement(c.Request.Context(), userID); e == nil && ent != nil && ent.IsPro {
			c.Next()
			return
		}

		// 1. Atomic Check-and-Deduct
		allowed, err := entRepo.DeductQuota(c.Request.Context(), userID)
		if err != nil {
			slog.Error("failed to deduct quota", "user_id", userID, "err", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to process quota check"})
			c.Abort()
			return
		}

		if !allowed {
			// Pro users are never deducted (DeductQuota is a no-op for is_pro),
			// so reaching here means a free-tier user hit the 3-eval monthly
			// cap. Report the consumed count for accurate UI (AC4).
			evalsUsed := 3
			if ent, e := entRepo.GetEntitlement(c.Request.Context(), userID); e == nil && ent != nil {
				evalsUsed = ent.MonthlyEvalCount
				if evalsUsed < 3 {
					evalsUsed = 3
				}
			}
			c.JSON(http.StatusPaymentRequired, gin.H{
				"error":       "quota_exceeded",
				"evals_used":  evalsUsed,
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
