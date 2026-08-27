package prtracker

import (
	"context"
	"time"

	"github.com/jmoiron/sqlx"
)

// ReportCardLang is one (language, pr_count) row for a user's merged PRs.
type ReportCardLang struct {
	Language string `json:"language"`
	Count    int    `json:"count"`
}

// ReportCardTier is one (c_rank_tier, repo_count) row for a user's merged PRs.
type ReportCardTier struct {
	Tier      string `json:"tier"`
	RepoCount int    `json:"repo_count"`
}

// ReportCardStats aggregates a contributor's merged-PR track record for the
// shareable OG report card: merged-PR count, first-merge milestone, top
// languages and the C-Rank tiers of repos merged into.
//
// AC4 column mapping (verified to exist in schema/db.go, not assumed):
//   - "PRs.merged=true"        -> pr_snapshots.state = 'merged'
//   - "PRs.primary_language"   -> repositories.language (language of the repo the
//     PR was merged into; pr_snapshots carries no
//     per-PR language column).
//   - "repos.c_rank"           -> latest_snapshots.c_rank_tier joined on
//     repository_id.
func GetReportCardStats(ctx context.Context, db *sqlx.DB, userID int64) (*ReportCardStats, error) {
	out := &ReportCardStats{}

	var agg struct {
		Count      int        `db:"cnt"`
		FirstMerge *time.Time `db:"first_merge"`
	}
	err := db.GetContext(ctx, &agg, `
		SELECT COUNT(*) AS cnt, MIN(merged_at) AS first_merge
		FROM pr_snapshots
		WHERE user_id = ? AND state = 'merged'`, userID)
	if err != nil {
		return nil, err
	}
	out.MergedPRCount = agg.Count
	out.FirstMergeAt = agg.FirstMerge

	if err := db.SelectContext(ctx, &out.TopLanguages, `
		SELECT COALESCE(r.language, 'Unknown') AS language, COUNT(*) AS count
		FROM pr_snapshots p
		LEFT JOIN repositories r ON r.id = p.repository_id
		WHERE p.user_id = ? AND p.state = 'merged'
		GROUP BY r.language
		ORDER BY count DESC, language ASC
		LIMIT 5`, userID); err != nil {
		return nil, err
	}

	if err := db.SelectContext(ctx, &out.CRankTiers, `
		SELECT COALESCE(s.c_rank_tier, 'D') AS tier, COUNT(DISTINCT p.repository_id) AS repo_count
		FROM pr_snapshots p
		LEFT JOIN latest_snapshots s ON s.repository_id = p.repository_id
		WHERE p.user_id = ? AND p.state = 'merged'
		GROUP BY s.c_rank_tier
		ORDER BY repo_count DESC, tier ASC`, userID); err != nil {
		return nil, err
	}

	return out, nil
}

// ReportCardStats is the aggregate payload for GET /api/v1/u/:username/report-card.
type ReportCardStats struct {
	MergedPRCount int              `json:"merged_pr_count"`
	FirstMergeAt  *time.Time       `json:"first_merge_at"`
	TopLanguages  []ReportCardLang `json:"top_languages"`
	CRankTiers    []ReportCardTier `json:"c_rank_tiers"`
}
