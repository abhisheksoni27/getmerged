package analytics

import (
	"context"
	"encoding/json"
	"time"

	"github.com/jmoiron/sqlx"
)

type MacroStats struct {
	TotalRepos        int            `json:"total_repos"`
	RankCounts        map[string]int `json:"rank_counts"`
	BucketCounts      map[string]int `json:"bucket_counts"`
	TopLanguageCounts map[string]int `json:"top_language_counts"`
	UpdatedMs         int64          `json:"updated_ms"`
}

// ComputeAndCacheMacroStats aggregates platform statistics across all repositories and updates macro_stats table.
func ComputeAndCacheMacroStats(ctx context.Context, db *sqlx.DB) (*MacroStats, error) {
	stats := &MacroStats{
		RankCounts:        make(map[string]int),
		BucketCounts:      make(map[string]int),
		TopLanguageCounts: make(map[string]int),
		UpdatedMs:         time.Now().UnixMilli(),
	}

	// 1. Total Repos
	if err := db.GetContext(ctx, &stats.TotalRepos, "SELECT COUNT(*) FROM repos"); err != nil {
		return nil, err
	}

	// 2. Rank counts (S, A, B, C, D)
	type rankRow struct {
		ClassRank string `db:"class_rank"`
		Cnt       int    `db:"cnt"`
	}
	var rankRows []rankRow
	if err := db.SelectContext(ctx, &rankRows, "SELECT class_rank, COUNT(*) as cnt FROM repo_scores GROUP BY class_rank"); err == nil {
		for _, r := range rankRows {
			stats.RankCounts[r.ClassRank] = r.Cnt
		}
	}

	// 3. Star Bucket counts
	type bucketRow struct {
		Bucket string `db:"star_bucket"`
		Cnt    int    `db:"cnt"`
	}
	var bucketRows []bucketRow
	if err := db.SelectContext(ctx, &bucketRows, "SELECT COALESCE(star_bucket, '1k-5k') as star_bucket, COUNT(*) as cnt FROM repos GROUP BY star_bucket"); err == nil {
		for _, b := range bucketRows {
			stats.BucketCounts[b.Bucket] = b.Cnt
		}
	}

	// 4. Language counts
	type langRow struct {
		Lang string `db:"language"`
		Cnt  int    `db:"cnt"`
	}
	var langRows []langRow
	if err := db.SelectContext(ctx, &langRows, "SELECT language, COUNT(*) as cnt FROM repos GROUP BY language ORDER BY cnt DESC LIMIT 15"); err == nil {
		for _, l := range langRows {
			stats.TopLanguageCounts[l.Lang] = l.Cnt
		}
	}

	jsonBytes, err := json.Marshal(stats)
	if err != nil {
		return nil, err
	}

	_, err = db.ExecContext(ctx, `
		INSERT INTO macro_stats (metric_key, metric_value, updated_at)
		VALUES ('global_summary', ?, CURRENT_TIMESTAMP)
		ON CONFLICT(metric_key) DO UPDATE SET
			metric_value = excluded.metric_value,
			updated_at = CURRENT_TIMESTAMP
	`, string(jsonBytes))

	if err != nil {
		return nil, err
	}

	return stats, nil
}

// GetCachedMacroStats retrieves latest macro stats from cache table.
func GetCachedMacroStats(ctx context.Context, db *sqlx.DB) (*MacroStats, error) {
	var jsonStr string
	err := db.GetContext(ctx, &jsonStr, "SELECT metric_value FROM macro_stats WHERE metric_key = 'global_summary'")
	if err != nil {
		return ComputeAndCacheMacroStats(ctx, db)
	}

	var stats MacroStats
	if err := json.Unmarshal([]byte(jsonStr), &stats); err != nil {
		return nil, err
	}

	return &stats, nil
}
