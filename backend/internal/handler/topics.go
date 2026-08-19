package handler

import (
	"log/slog"
	"net/http"

	"github.com/abhisheksoni27/opendoor/internal/repository"
	"github.com/gin-gonic/gin"
)

// ListTopics handles GET /api/v1/topics
// Returns a distinct list of topics associated with indexed repositories.
func ListTopics(repoStore repository.RepoRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		topics, err := repoStore.GetAllDistinctTopics(c.Request.Context())
		if err != nil {
			slog.Error("list-topics: query failed", "err", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch topics"})
			return
		}
		if topics == nil {
			topics = []string{}
		}

		c.JSON(http.StatusOK, gin.H{
			"topics": topics,
			"data":   topics,
		})
	}
}
