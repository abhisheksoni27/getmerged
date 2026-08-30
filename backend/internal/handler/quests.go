package handler

import (
	"net/http"

	"github.com/abhisheksoni27/opendoor/internal/middleware"
	"github.com/abhisheksoni27/opendoor/internal/quests"
	"github.com/abhisheksoni27/opendoor/internal/repository"
	"github.com/gin-gonic/gin"
	"github.com/jmoiron/sqlx"
)

// GetUserQuestsHandler computes the user's quest completion and karma earnings
func GetUserQuestsHandler(db *sqlx.DB, profileRepo repository.ContributorProfileRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		userIDVal, exists := c.Get(middleware.UserIDKey)
		if !exists {
			// Return default guest onboarding quest list
			guestTrack := quests.ComputeUserQuests(quests.UserActivitySnapshot{})
			c.JSON(http.StatusOK, guestTrack)
			return
		}
		userID, ok := userIDVal.(int64)
		if !ok || userID == 0 {
			guestTrack := quests.ComputeUserQuests(quests.UserActivitySnapshot{})
			c.JSON(http.StatusOK, guestTrack)
			return
		}

		activity := quests.UserActivitySnapshot{
			HasViewedSweetSpot: true, // Default to true once user loads dashboard/profile
		}

		if db != nil {
			var stackCount int
			_ = db.GetContext(c.Request.Context(), &stackCount, "SELECT COUNT(*) FROM user_monitored_stacks WHERE user_id = ?", userID)
			activity.HasScannedStack = stackCount > 0

			var sniperCount int
			_ = db.GetContext(c.Request.Context(), &sniperCount, "SELECT COUNT(*) FROM user_sniper_subscriptions WHERE user_id = ? AND is_active = TRUE", userID)
			activity.HasActiveSniper = sniperCount > 0

			var feedbackCount int
			_ = db.GetContext(c.Request.Context(), &feedbackCount, "SELECT COUNT(*) FROM contributor_feedback WHERE user_id = ?", userID)
			activity.HasSubmittedReview = feedbackCount > 0
		}

		profile, err := profileRepo.GetByUserID(c.Request.Context(), userID)
		if err == nil && profile != nil {
			activity.MergedPRCount = profile.TotalMergedPRs
		}

		track := quests.ComputeUserQuests(activity)
		c.JSON(http.StatusOK, track)
	}
}
