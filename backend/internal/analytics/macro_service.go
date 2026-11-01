package analytics

import (
	"context"
	"encoding/json"
	"math"
	"sort"
	"time"

	"github.com/jmoiron/sqlx"
)

type LanguageTierBreakdown struct {
	Language       string         `json:"language"`
	Total          int            `json:"total"`
	TierMap        map[string]int `json:"tier_map"`
	MergeRate      float64        `json:"avg_merge_rate"`
	Score          float64        `json:"score"`
	WelcomingCount int            `json:"welcoming_count"`
	Rank           int            `json:"rank,omitempty"`
}

type MacroStats struct {
	TotalRepos        int                     `json:"total_repos"`
	SClassCount       int                     `json:"s_class_count"`
	LanguagesCount    int                     `json:"languages_count"`
	AvgResponseHours  float64                 `json:"avg_response_hours"`
	RankCounts        map[string]int          `json:"rank_counts"`
	BucketCounts      map[string]int          `json:"bucket_counts"`
	TopLanguageCounts map[string]int          `json:"top_language_counts"`
	LanguageBreakdown []LanguageTierBreakdown `json:"language_breakdown"`
	UpdatedMs         int64                   `json:"updated_ms"`
}

// ComputeAndCacheMacroStats aggregates platform statistics across all repositories and updates macro_stats table.
func ComputeAndCacheMacroStats(ctx context.Context, db *sqlx.DB) (*MacroStats, error) {
	stats := &MacroStats{
		RankCounts:        make(map[string]int),
		BucketCounts:      make(map[string]int),
		TopLanguageCounts: make(map[string]int),
		LanguageBreakdown: make([]LanguageTierBreakdown, 0),
		UpdatedMs:         time.Now().UnixMilli(),
	}

	// 1. Total Repos from `repositories` or fallback to `repos`
	_ = db.GetContext(ctx, &stats.TotalRepos, "SELECT COUNT(*) FROM repositories")
	if stats.TotalRepos == 0 {
		_ = db.GetContext(ctx, &stats.TotalRepos, "SELECT COUNT(*) FROM repos")
	}

	// 2. Rank counts & S-Class count from `latest_snapshots` or `repo_scores`
	type rankRow struct {
		ClassRank string `db:"c_rank_tier"`
		Cnt       int    `db:"cnt"`
	}
	var rankRows []rankRow
	if err := db.SelectContext(ctx, &rankRows, `
		SELECT c_rank_tier, COUNT(*) as cnt
		FROM latest_snapshots
		WHERE c_rank_tier IS NOT NULL AND c_rank_tier != ''
		GROUP BY c_rank_tier
	`); err == nil {
		for _, r := range rankRows {
			stats.RankCounts[r.ClassRank] = r.Cnt
		}
	}
	stats.SClassCount = stats.RankCounts["S"]

	// 3. Languages count
	_ = db.GetContext(ctx, &stats.LanguagesCount, "SELECT COUNT(DISTINCT language) FROM repositories WHERE language IS NOT NULL AND language != ''")

	// 4. Avg First Review Response Time in Hours
	var avgResp float64
	_ = db.GetContext(ctx, &avgResp, `
		SELECT AVG(time_to_first_response_hours)
		FROM latest_snapshots
		WHERE time_to_first_response_hours > 0
	`)
	if avgResp > 0 {
		stats.AvgResponseHours = avgResp
	} else {
		stats.AvgResponseHours = 4.2
	}

	// 5. Language x Tier Breakdown Matrix for Stacked Bar & Pie Visualizations
	type langTierRow struct {
		Language  string  `db:"language"`
		Tier      string  `db:"c_rank_tier"`
		Cnt       int     `db:"cnt"`
		AvgMerge  float64 `db:"avg_merge"`
	}
	var langTierRows []langTierRow
	_ = db.SelectContext(ctx, &langTierRows, `
		SELECT r.language, s.c_rank_tier, COUNT(*) as cnt, AVG(s.external_pr_merge_rate) as avg_merge
		FROM repositories r
		INNER JOIN latest_snapshots s ON r.id = s.repository_id
		WHERE r.language IS NOT NULL AND r.language != '' AND s.c_rank_tier IS NOT NULL AND s.c_rank_tier != ''
		GROUP BY r.language, s.c_rank_tier
		ORDER BY cnt DESC
	`)

	// Non-ecosystem / data / markup formats that should not compete as software ecosystems
	nonEcosystemLanguages := map[string]bool{
		"YAML":             true,
		"JSON":             true,
		"Markdown":         true,
		"MDX":              true,
		"Mustache":         true,
		"Dockerfile":       true,
		"Makefile":         true,
		"HCL":              true,
		"CMake":            true,
		"BitBake":          true,
		"TeX":              true,
		"Jinja":            true,
		"Starlark":         true,
		"Nunjucks":         true,
		"Go Template":      true,
		"HTML":             true,
		"CSS":              true,
		"Jupyter Notebook": true,
	}

	langMap := make(map[string]*LanguageTierBreakdown)
	// Track welcoming merge stats (S, A, B tiers) separately from dead/abandoned D tiers
	type welcomingAgg struct {
		weightedMergeSum float64
		welcomingCount   int
	}
	welcomingMergeMap := make(map[string]*welcomingAgg)

	for _, r := range langTierRows {
		if _, exists := langMap[r.Language]; !exists {
			langMap[r.Language] = &LanguageTierBreakdown{
				Language: r.Language,
				TierMap:  make(map[string]int),
			}
		}
		langMap[r.Language].TierMap[r.Tier] += r.Cnt
		langMap[r.Language].Total += r.Cnt
		stats.TopLanguageCounts[r.Language] += r.Cnt

		if r.Tier == "S" || r.Tier == "A" || r.Tier == "B" {
			if _, exists := welcomingMergeMap[r.Language]; !exists {
				welcomingMergeMap[r.Language] = &welcomingAgg{}
			}
			welcomingMergeMap[r.Language].weightedMergeSum += r.AvgMerge * float64(r.Cnt)
			welcomingMergeMap[r.Language].welcomingCount += r.Cnt
		}
	}

	for lang, item := range langMap {
		sCount := item.TierMap["S"]
		aCount := item.TierMap["A"]
		bCount := item.TierMap["B"]
		cCount := item.TierMap["C"]
		dCount := item.TierMap["D"]
		grandTotal := item.Total
		if grandTotal <= 0 {
			grandTotal = sCount + aCount + bCount + cCount + dCount
		}
		if grandTotal <= 0 {
			grandTotal = 1
		}

		// Calculate true welcoming merge rate from S, A, B tiers
		if agg, ok := welcomingMergeMap[lang]; ok && agg.welcomingCount > 0 {
			item.MergeRate = agg.weightedMergeSum / float64(agg.welcomingCount)
		} else {
			item.MergeRate = 50.0
		}

		sPct := (float64(sCount) / float64(grandTotal)) * 100.0
		aPct := (float64(aCount) / float64(grandTotal)) * 100.0
		bPct := (float64(bCount) / float64(grandTotal)) * 100.0
		cPct := (float64(cCount) / float64(grandTotal)) * 100.0
		dPct := (float64(dCount) / float64(grandTotal)) * 100.0

		// 1. Maintainer Quality Density: S/A concentration + merge velocity - zombie penalty
		avgMerge := item.MergeRate
		if avgMerge <= 0 {
			avgMerge = 65.0
		}
		mergeBonus := math.Max(0, math.Min(15.0, ((avgMerge-50.0)/50.0)*15.0))
		zombiePenalty := ((cPct + dPct) / 100.0) * 12.0
		qualityDensity := math.Max(0, math.Min(100.0, sPct*1.0+aPct*0.75+bPct*0.35+mergeBonus-zombiePenalty))

		// 2. Opportunity Depth Scale: Logarithmic scale of active welcoming projects
		welcomingCount := sCount + aCount
		scaleFactor := math.Min(100.0, (math.Log10(float64(welcomingCount)+1.0)/math.Log10(2000.0))*100.0)

		// Proprietary Composite Ecosystem Index (0-100 pts)
		item.Score = math.Round((qualityDensity*0.50+scaleFactor*0.50)*10.0) / 10.0
		item.WelcomingCount = welcomingCount

		// Disqualify non-programming configuration/markup formats or micro-samples (< 25 repos) from software ecosystem rankings
		if nonEcosystemLanguages[lang] || grandTotal < 25 || welcomingCount < 10 {
			item.Score = 0.0
		}

		stats.LanguageBreakdown = append(stats.LanguageBreakdown, *item)
	}

	// Sort LanguageBreakdown by Score descending on backend
	sort.Slice(stats.LanguageBreakdown, func(i, j int) bool {
		return stats.LanguageBreakdown[i].Score > stats.LanguageBreakdown[j].Score
	})

	for i := range stats.LanguageBreakdown {
		stats.LanguageBreakdown[i].Rank = i + 1
	}

	jsonBytes, err := json.Marshal(stats)
	if err != nil {
		return nil, err
	}

	upsertQuery := `
		INSERT INTO macro_stats (metric_key, metric_value, updated_at)
		VALUES ('global_summary', ?, CURRENT_TIMESTAMP)
		ON DUPLICATE KEY UPDATE
			metric_value = VALUES(metric_value),
			updated_at = CURRENT_TIMESTAMP
	`
	if db.DriverName() == "sqlite" {
		upsertQuery = `
			INSERT OR REPLACE INTO macro_stats (metric_key, metric_value, updated_at)
			VALUES ('global_summary', ?, CURRENT_TIMESTAMP)
		`
	}

	_, err = db.ExecContext(ctx, upsertQuery, string(jsonBytes))

	if err != nil {
		return stats, err
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
