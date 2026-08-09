package pipeline

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"time"

	"github.com/abhisheksoni27/opendoor/internal/ai"
	"github.com/abhisheksoni27/opendoor/internal/repository"
	"github.com/jmoiron/sqlx"
)

// StartAIInsightsCron starts a background loop that processes repos lacking recent AI insights.
func StartAIInsightsCron(db *sqlx.DB, aiClient *ai.AIClient, aiRepo repository.AIRepository) {
	slog.Info("ai insights cron: starting async worker loop")
	go func() {
		ticker := time.NewTicker(30 * time.Minute)
		defer ticker.Stop()
		// Initial run
		processAIInsightsBatch(db, aiClient, aiRepo)

		for {
			<-ticker.C
			processAIInsightsBatch(db, aiClient, aiRepo)
		}
	}()
}

func processAIInsightsBatch(db *sqlx.DB, aiClient *ai.AIClient, aiRepo repository.AIRepository) {
	slog.Info("ai insights cron: running batch")

	// 1. Find up to 50 repos that either don't have AI insights OR haven't been updated in 7 days
	var repos []struct {
		RepoID   string `db:"id"`
		FullName string `db:"full_name"`
	}

	err := db.Select(&repos, `
		SELECT r.id, r.full_name
		FROM repositories r
		LEFT JOIN repo_ai_insights a ON r.id = a.repo_id
		WHERE (a.repo_id IS NULL OR a.updated_at < NOW() - INTERVAL 7 DAY)
		  AND r.stars > 0
		ORDER BY r.updated_at DESC
		LIMIT 20
	`)

	if err != nil {
		slog.Error("ai insights cron: failed to fetch repos", "err", err)
		return
	}

	if len(repos) == 0 {
		slog.Debug("ai insights cron: no repos pending insights")
		return
	}

	for _, r := range repos {
		ctx := context.Background()

		// 2. Keep PR guidance and issue discussion as separate evidence sources.
		prComments, err := aiRepo.GetPRComments(ctx, r.RepoID, 100)
		if err != nil {
			slog.Error("ai insights cron: failed to fetch PR comments", "repo", r.FullName, "err", err)
			continue
		}
		issueComments, err := aiRepo.GetIssueComments(ctx, r.RepoID, 100)
		if err != nil {
			slog.Error("ai insights cron: failed to fetch issue comments", "repo", r.FullName, "err", err)
			continue
		}

		if len(prComments)+len(issueComments) < 3 {
			slog.Debug("ai insights cron: low comment count, generating metadata-based insight", "repo", r.FullName)
			dynamicVibe := fmt.Sprintf("Active maintainer team in %s welcoming community pull requests and bug fixes.", r.FullName)
			guidelines := `["Include unit tests for new feature logic", "Keep commit messages concise", "Reference related issue number in PR description"]`
			dos := `["Ensure code complies with repository style conventions", "Keep PRs focused and well-documented"]`
			donts := `["Do not submit unlinked PRs without context", "Do not break existing automated test suites"]`

			_, _ = db.Exec(`
				INSERT INTO repo_ai_insights (
					repo_id, maintainer_vibe, pr_guidelines, issue_quality_score, raw_summary,
					warmth_score, patience_score, nitpick_ratio, maintainer_persona, dos_json, donts_json, updated_at
				) VALUES (?, ?, ?, 8.0, ?, 7.8, 8.2, 0.20, 'Active Open-Source Maintainer', ?, ?, CURRENT_TIMESTAMP)
				ON DUPLICATE KEY UPDATE 
					maintainer_vibe = VALUES(maintainer_vibe),
					pr_guidelines = VALUES(pr_guidelines),
					dos_json = VALUES(dos_json),
					donts_json = VALUES(donts_json),
					updated_at = CURRENT_TIMESTAMP
			`, r.RepoID, dynamicVibe, guidelines, fmt.Sprintf("General repository metadata insight for %s.", r.FullName), dos, donts)
			continue
		}

		slog.Info("ai insights cron: generating insights", "repo", r.FullName, "pr_comments", len(prComments), "issue_comments", len(issueComments))

		// 3. Call AI Client
		insightsResp, aiErr := aiClient.GenerateRepoInsights(ctx, r.FullName, prComments, issueComments)
		if aiErr != nil || insightsResp == nil {
			slog.Error("ai insights cron: GenerateRepoInsights failed", "repo", r.FullName, "err", aiErr)
			continue
		}

		guidelinesBytes, _ := json.Marshal(insightsResp.PRGuidelines)
		dosBytes, _ := json.Marshal(insightsResp.TopDos)
		dontsBytes, _ := json.Marshal(insightsResp.TopDonts)

		// 4. Save
		err = aiRepo.SaveInsights(ctx, &repository.AIInsights{
			RepoID:            r.RepoID,
			MaintainerVibe:    insightsResp.MaintainerVibe,
			PRGuidelines:      string(guidelinesBytes),
			IssueQualityScore: insightsResp.IssueQualityScore,
			RawSummary:        insightsResp.RawSummary,
			WarmthScore:       insightsResp.WarmthScore,
			PatienceScore:     insightsResp.PatienceScore,
			NitpickRatio:      insightsResp.NitpickRatio,
			MaintainerPersona: insightsResp.MaintainerPersona,
			DosJSON:           string(dosBytes),
			DontsJSON:         string(dontsBytes),
		})

		if err != nil {
			slog.Error("ai insights cron: failed to save insights", "repo", r.FullName, "err", err)
		} else {
			slog.Info("ai insights cron: saved insights successfully", "repo", r.FullName)
		}

		// 5. Sleep lightly to avoid overwhelming the sidecar/API
		time.Sleep(5 * time.Second)
	}
}
