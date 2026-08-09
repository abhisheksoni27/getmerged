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
			var dos []string
			_ = json.Unmarshal([]byte(cached.DosJSON), &dos)
			var donts []string
			_ = json.Unmarshal([]byte(cached.DontsJSON), &donts)

			c.JSON(http.StatusOK, gin.H{
				"insights": gin.H{
					"repo_id":             cached.RepoID,
					"maintainer_vibe":     cached.MaintainerVibe,
					"pr_guidelines":       guidelines,
					"issue_quality_score": cached.IssueQualityScore,
					"raw_summary":         cached.RawSummary,
					"warmth_score":        cached.WarmthScore,
					"patience_score":      cached.PatienceScore,
					"nitpick_ratio":       cached.NitpickRatio,
					"maintainer_persona":  cached.MaintainerPersona,
					"top_dos":             dos,
					"top_donts":           donts,
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

		// 3. Keep PR guidance and issue discussion as separate evidence sources.
		prComments, _ := aiRepo.GetPRComments(c.Request.Context(), repo.ID, 100)
		issueComments, _ := aiRepo.GetIssueComments(c.Request.Context(), repo.ID, 100)

		// 4. Generate insights via AI client / Python sidecar / local classifier
		insights, err := aiClient.GenerateRepoInsights(c.Request.Context(), repo.FullName, prComments, issueComments)
		if err != nil {
			slog.Error("get repo insights: ai generation failed", "repo", repo.FullName, "err", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate AI insights"})
			return
		}

		guidelinesBytes, _ := json.Marshal(insights.PRGuidelines)
		dosBytes, _ := json.Marshal(insights.TopDos)
		dontsBytes, _ := json.Marshal(insights.TopDonts)

		newInsights := &repository.AIInsights{
			RepoID:            repo.ID,
			MaintainerVibe:    insights.MaintainerVibe,
			PRGuidelines:      string(guidelinesBytes),
			IssueQualityScore: insights.IssueQualityScore,
			RawSummary:        insights.RawSummary,
			WarmthScore:       insights.WarmthScore,
			PatienceScore:     insights.PatienceScore,
			NitpickRatio:      insights.NitpickRatio,
			MaintainerPersona: insights.MaintainerPersona,
			DosJSON:           string(dosBytes),
			DontsJSON:         string(dontsBytes),
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
				"warmth_score":        insights.WarmthScore,
				"patience_score":      insights.PatienceScore,
				"nitpick_ratio":       insights.NitpickRatio,
				"maintainer_persona":  insights.MaintainerPersona,
				"top_dos":             insights.TopDos,
				"top_donts":           insights.TopDonts,
			},
		})
	}
}
