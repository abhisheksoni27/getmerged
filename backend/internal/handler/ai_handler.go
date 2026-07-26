package handler

import (
	"encoding/json"
	"log/slog"
	"net/http"

	"github.com/abhisheksoni27/opendoor/internal/ai"
	"github.com/abhisheksoni27/opendoor/internal/repository"
	"github.com/gin-gonic/gin"
)

// GetRepoInsights handles GET /api/v1/repos/:id/insights (Gated endpoint)
func GetRepoInsights(aiClient *ai.AIClient, aiRepo repository.AIRepository, repoStore repository.RepoRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		repoID := c.Param("id")

		// 1. Check existing cached AI insights in SQLite DB
		cached, err := aiRepo.GetInsights(c.Request.Context(), repoID)
		if err == nil && cached != nil {
			var guidelines []string
			_ = json.Unmarshal([]byte(cached.PRGuidelines), &guidelines)

			c.JSON(http.StatusOK, gin.H{
				"insights": gin.H{
					"repo_id":             cached.RepoID,
					"maintainer_vibe":     cached.MaintainerVibe,
					"pr_guidelines":       guidelines,
					"issue_quality_score": cached.IssueQualityScore,
					"raw_summary":         cached.RawSummary,
				},
			})
			return
		}

		// 2. Fetch repo metadata
		repo, err := repoStore.FindByIDOrName(c.Request.Context(), repoID)
		if err != nil || repo == nil {
			slog.Warn("get repo insights: repo not found", "repo_id", repoID, "err", err)
			c.JSON(http.StatusNotFound, gin.H{"error": "repository not found"})
			return
		}

		// 3. Generate insights via AI client
		insights, err := aiClient.GenerateRepoInsights(c.Request.Context(), repo.FullName, nil)
		if err != nil {
			slog.Error("get repo insights: ai generation failed", "repo", repo.FullName, "err", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate AI insights"})
			return
		}

		guidelinesBytes, _ := json.Marshal(insights.PRGuidelines)
		newInsights := &repository.AIInsights{
			RepoID:            repo.ID,
			MaintainerVibe:    insights.MaintainerVibe,
			PRGuidelines:      string(guidelinesBytes),
			IssueQualityScore: insights.IssueQualityScore,
			RawSummary:        insights.RawSummary,
		}

		if err := aiRepo.SaveInsights(c.Request.Context(), newInsights); err != nil {
			slog.Warn("get repo insights: failed to cache insights to DB", "repo_id", repo.ID, "err", err)
		}

		c.JSON(http.StatusOK, gin.H{
			"insights": gin.H{
				"repo_id":             repo.ID,
				"maintainer_vibe":     insights.MaintainerVibe,
				"pr_guidelines":       insights.PRGuidelines,
				"issue_quality_score": insights.IssueQualityScore,
				"raw_summary":         insights.RawSummary,
			},
		})
	}
}
