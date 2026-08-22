package main

import (
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"log/slog"
	"os"
	"strings"
	"time"

	"github.com/abhisheksoni27/opendoor/internal/ai"
	"github.com/abhisheksoni27/opendoor/internal/config"
	"github.com/abhisheksoni27/opendoor/internal/db"
	"github.com/abhisheksoni27/opendoor/internal/repository"
	_ "github.com/go-sql-driver/mysql"
	"github.com/jmoiron/sqlx"
	"github.com/joho/godotenv"
)

type TargetRepoAI struct {
	ID       string `db:"id"`
	FullName string `db:"full_name"`
	Language string `db:"language"`
	Stars    int    `db:"stars"`
	Tier     string `db:"c_rank_tier"`
}

func main() {
	var (
		limitFlag = flag.Int("limit", 0, "Max repos to process (0 = all pending)")
		tiersFlag = flag.String("tiers", "S,A,B,C,D", "Comma-separated tiers to process")
	)
	flag.Parse()

	_ = godotenv.Load("/opt/opendoor/.env")
	_ = godotenv.Load("/opt/opendoor/backend/.env")
	_ = godotenv.Load()

	cfg, err := config.Load()
	if err != nil {
		slog.Error("Failed to load config", "err", err)
		os.Exit(1)
	}

	database, err := db.Connect(cfg.DatabaseURL)
	if err != nil {
		slog.Error("Failed to connect to database", "err", err)
		os.Exit(1)
	}
	defer database.Close()

	aiClient := ai.NewAIClient(cfg.OpencodeAPIKey)
	aiRepo := repository.NewAIRepository(database)
	ctx := context.Background()

	tierList := strings.Split(*tiersFlag, ",")
	query, args, err := sqlx.In(`
		SELECT r.id, r.full_name, COALESCE(r.language, 'Open-Source') as language, COALESCE(r.stars, 0) as stars, COALESCE(s.c_rank_tier, 'A') as c_rank_tier
		FROM repositories r
		LEFT JOIN latest_snapshots s ON s.repository_id = r.id
		LEFT JOIN repo_ai_insights a ON r.id = a.repo_id
		WHERE (a.repo_id IS NULL OR a.updated_at < NOW() - INTERVAL 7 DAY)
		  AND s.c_rank_tier IN (?)
		ORDER BY s.c_rank_score DESC
	`, tierList)
	if err != nil {
		slog.Error("Failed to build SQL query", "err", err)
		os.Exit(1)
	}

	query = database.Rebind(query)
	var repos []TargetRepoAI
	if err := database.Select(&repos, query, args...); err != nil {
		slog.Error("Failed to fetch pending repos", "err", err)
		os.Exit(1)
	}

	if *limitFlag > 0 && len(repos) > *limitFlag {
		repos = repos[:*limitFlag]
	}

	slog.Info("Starting AI Insights batch generation", "pending_repos", len(repos), "tiers", *tiersFlag)

	processed := 0
	skipped := 0
	saved := 0
	startTime := time.Now()

	for i, r := range repos {
		if (i+1)%2000 == 0 || i+1 == len(repos) {
			slog.Info("AI Insights progress", "processed", i+1, "total", len(repos), "saved", saved, "low_comments", skipped, "elapsed", time.Since(startTime).Round(time.Second).String())
		}

		prComments, err := aiRepo.GetPRComments(ctx, r.ID, 100)
		if err != nil {
			slog.Error("Failed to fetch PR comments", "repo", r.FullName, "err", err)
			continue
		}
		issueComments, err := aiRepo.GetIssueComments(ctx, r.ID, 100)
		if err != nil {
			slog.Error("Failed to fetch issue comments", "repo", r.FullName, "err", err)
			continue
		}

		if len(prComments)+len(issueComments) < 3 {
			// Generate dynamic repo-specific fallback insight based on language, stars, and tier
			lang := r.Language
			if lang == "" {
				lang = "Software"
			}
			var dynamicVibe string
			if r.Stars >= 5000 {
				dynamicVibe = fmt.Sprintf("Established %s ecosystem in %s. Maintains structured code review standards for external contributors.", lang, r.FullName)
			} else if r.Stars >= 1000 {
				dynamicVibe = fmt.Sprintf("Active %s repository in %s with ongoing community development and issue triage.", lang, r.FullName)
			} else {
				dynamicVibe = fmt.Sprintf("Growing %s project in %s welcoming community pull requests and bug fixes.", lang, r.FullName)
			}

			guidelines := fmt.Sprintf(`["Follow %s coding style guidelines", "Include tests for new feature logic", "Link relevant issue in PR description", "Keep PRs scoped to a single concern"]`, lang)
			dos := fmt.Sprintf(`["Ensure code complies with %s style conventions", "Keep PRs scoped and well-documented", "Include relevant test coverage for changes"]`, lang)
			donts := `["Do not submit unlinked PRs without context", "Do not break existing automated test suites", "Do not mix unrelated refactors with feature work"]`

			_, _ = database.ExecContext(ctx, `
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
			`, r.ID, dynamicVibe, guidelines, fmt.Sprintf("General repository metadata insight for %s.", r.FullName), dos, donts)

			skipped++
			processed++
			continue
		}

		insightsResp, err := aiClient.GenerateRepoInsights(ctx, r.FullName, prComments, issueComments)
		if err != nil || insightsResp == nil {
			slog.Warn("GenerateRepoInsights returned nil/error", "repo", r.FullName, "err", err)
			continue
		}

		guidelinesBytes, _ := json.Marshal(insightsResp.PRGuidelines)
		dosBytes, _ := json.Marshal(insightsResp.TopDos)
		dontsBytes, _ := json.Marshal(insightsResp.TopDonts)

		err = aiRepo.SaveInsights(ctx, &repository.AIInsights{
			RepoID:            r.ID,
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
			slog.Error("Failed to save insights", "repo", r.FullName, "err", err)
		} else {
			saved++
		}
		processed++
	}

	fmt.Printf("\n✓ Finished AI Insights generation! Total: %d (NLP-analyzed: %d, Metadata-enriched: %d) in %s\n",
		processed, saved, skipped, time.Since(startTime).Round(time.Second).String())
}
