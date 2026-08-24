package handler

import (
	"log/slog"
	"net/http"

	"github.com/abhisheksoni27/opendoor/internal/middleware"
	"github.com/abhisheksoni27/opendoor/internal/repository"
	"github.com/gin-gonic/gin"
)

// GetMyReferral handles GET /api/v1/user/referral
func GetMyReferral(entRepo repository.EntitlementRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		userIDVal, exists := c.Get(middleware.UserIDKey)
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthenticated"})
			return
		}
		userID := userIDVal.(int64)

		code, err := entRepo.EnsureReferralCode(c.Request.Context(), userID)
		if err != nil {
			slog.Error("failed to ensure referral code", "user_id", userID, "err", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to load referral code"})
			return
		}

		invites, credits, err := entRepo.GetReferralStats(c.Request.Context(), userID)
		if err != nil {
			slog.Error("failed to load referral stats", "user_id", userID, "err", err)
		}

		c.JSON(http.StatusOK, gin.H{
			"referral_code":      code,
			"referral_path":      "/?ref=" + code,
			"successful_invites": invites,
			"credits_earned":     credits,
		})
	}
}
