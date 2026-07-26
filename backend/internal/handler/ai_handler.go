package handler

import (
	"encoding/json"
	"net/http"

	"github.com/abhisheksoni27/opendoor/internal/ai"
	"github.com/abhisheksoni27/opendoor/internal/middleware"
	"github.com/gin-gonic/gin"
)

// GetRepoInsights handles GET /api/v1/repos/:id/insights (Gated endpoint)
func GetRepoInsights(aiClient *ai.AIClient) gin.HandlerFunc {
	return func(c *gin.Context) {
		repoID := c.Param("id")
		db := middleware.MustDB(c)
		if db == nil {
			return
		}

		// 1. Check existing cached AI insights in SQLite DB
		var cached struct {
			RepoID            int64   `db:"repo_id" json:"repo_id"`
			MaintainerVibe    string  `db:"maintainer_vibe" json:"maintainer_vibe"`
			PRGuidelines      string  `db:"pr_guidelines" json:"pr_guidelines"`
			IssueQualityScore float64 `db:"issue_quality_score" json:"issue_quality_score"`
			RawSummary        string  `db:"raw_summary" json:"raw_summary"`
		}

		err := db.GetContext(c.Request.Context(), &cached, "SELECT repo_id, maintainer_vibe, pr_guidelines, issue_quality_score, raw_summary FROM repo_ai_insights WHERE repo_id = ?", repoID)
		if err == nil {
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
		var repo struct {
			ID       int64  `db:"id"`
			FullName string `db:"full_name"`
		}
		if err := db.GetContext(c.Request.Context(), &repo, "SELECT id, full_name FROM repos WHERE id = ?", repoID); err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "repository not found"})
			return
		}

		// 3. Generate insights via AI client
		insights, err := aiClient.GenerateRepoInsights(c.Request.Context(), repo.FullName, nil)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate insights"})
			return
		}

		guidelinesJSON, _ := json.Marshal(insights.PRGuidelines)

		// 4. Cache generated insights in database
		_, _ = db.ExecContext(c.Request.Context(), `
			INSERT INTO repo_ai_insights (repo_id, maintainer_vibe, pr_guidelines, issue_quality_score, raw_summary, updated_at)
			VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
			ON CONFLICT(repo_id) DO UPDATE SET
				maintainer_vibe = excluded.maintainer_vibe,
				pr_guidelines = excluded.pr_guidelines,
				issue_quality_score = excluded.issue_quality_score,
				raw_summary = excluded.raw_summary,
				updated_at = CURRENT_TIMESTAMP
		`, repo.ID, insights.MaintainerVibe, string(guidelinesJSON), insights.IssueQualityScore, insights.RawSummary)

		c.JSON(http.StatusOK, gin.H{"insights": insights})
	}
}
