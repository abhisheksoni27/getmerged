package handler

import (
	"log/slog"
	"net/http"

	"github.com/abhisheksoni27/opendoor/internal/repository"
	"github.com/gin-gonic/gin"
)

// ListTopics handles GET /api/v1/topics
// Returns topics and topic_stats associated with indexed repositories ordered by popularity.
func ListTopics(repoStore repository.RepoRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		stats, err := repoStore.GetAllTopicStats(c.Request.Context())
		if err != nil {
			slog.Error("list-topics: query failed", "err", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch topics"})
			return
		}
		if stats == nil {
			stats = []repository.TopicStat{}
		}

		topics := make([]string, len(stats))
		for i, stat := range stats {
			topics[i] = stat.Name
			// Round long float tails — they bloat the payload past Next.js's 2MB
			// data-cache limit (~7.9MB -> ~4.8MB) with zero UI impact.
			stat.AvgExternalPRMergeRate = round2(stat.AvgExternalPRMergeRate)
			stat.AvgStars = round2(stat.AvgStars)
			stat.AvgResponseHours = round2(stat.AvgResponseHours)
			stats[i] = stat
		}

		c.JSON(http.StatusOK, gin.H{
			"topics":      topics,
			"topic_stats": stats,
		})
	}
}
