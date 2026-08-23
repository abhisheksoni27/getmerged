package main

import (
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"log/slog"
	"os"
	"sort"
	"time"

	"github.com/abhisheksoni27/opendoor/internal/config"
	"github.com/abhisheksoni27/opendoor/internal/db"
	"github.com/jmoiron/sqlx"
)

// WeeklyDigest is the structured output consumed by the blog generation pipeline.
type WeeklyDigest struct {
	GeneratedAt string          `json:"generated_at"`
	WeekStart   string          `json:"week_start"`
	WeekEnd     string          `json:"week_end"`
	RepoMovers  []RepoMover     `json:"repo_movers"`
	TierChanges []TierChange    `json:"tier_changes"`
	LangTrends  []LanguageTrend `json:"language_trends"`
}

type RepoMover struct {
	FullName   string   `json:"full_name"`
	Language   string   `json:"language"`
	ScoreStart float64  `json:"score_start"`
	ScoreEnd   float64  `json:"score_end"`
	Change     float64  `json:"change"`
	TierStart  string   `json:"tier_start"`
	TierEnd    string   `json:"tier_end"`
}

type TierChange struct {
	FullName string `json:"full_name"`
	Language string `json:"language"`
	From     string `json:"from"`
	To       string `json:"to"`
	Change   float64 `json:"change"`
}

type LanguageTrend struct {
	Language string   `json:"language"`
	RepoCount int     `json:"repo_count"`
	ScoreStart float64 `json:"score_start"`
	ScoreEnd   float64 `json:"score_end"`
	Change     float64 `json:"change"`
}

type snapRow struct {
	RepoID   string  `db:"repository_id"`
	FullName string  `db:"full_name"`
	Language string  `db:"language"`
	Date     string  `db:"snapshot_date"`
	Score    float64 `db:"c_rank_score"`
	Tier     string  `db:"c_rank_tier"`
}

func main() {
	outPath := flag.String("out", "", "path to write digest JSON (default: stdout)")
	days := flag.Int("days", 7, "window length in days")
	flag.Parse()

	cfg, err := config.Load()
	if err != nil {
		slog.Error("failed to load config", "err", err)
		os.Exit(1)
	}
	database, err := db.Connect(cfg.DatabaseURL)
	if err != nil {
		slog.Error("failed to connect to db", "err", err)
		os.Exit(1)
	}
	defer database.Close()

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Minute)
	defer cancel()

	digest, err := buildDigest(ctx, database, *days)
	if err != nil {
		slog.Error("failed to build digest", "err", err)
		os.Exit(1)
	}

	data, err := json.MarshalIndent(digest, "", "  ")
	if err != nil {
		slog.Error("failed to marshal digest", "err", err)
		os.Exit(1)
	}

	if *outPath == "" {
		fmt.Println(string(data))
		return
	}
	if err := os.WriteFile(*outPath, data, 0o644); err != nil {
		slog.Error("failed to write digest", "path", *outPath, "err", err)
		os.Exit(1)
	}
	slog.Info("digest written", "path", *outPath, "movers", len(digest.RepoMovers), "tier_changes", len(digest.TierChanges), "langs", len(digest.LangTrends))
}

func buildDigest(ctx context.Context, database *sqlx.DB, days int) (*WeeklyDigest, error) {
	var maxDate string
	if err := database.GetContext(ctx, &maxDate, "SELECT COALESCE(MAX(snapshot_date), CURDATE()) FROM daily_snapshots"); err != nil {
		return nil, fmt.Errorf("max snapshot date: %w", err)
	}
	end, _ := time.Parse("2006-01-02", maxDate)
	windowStart := end.AddDate(0, 0, -(days - 1)).Format("2006-01-02")
	endWeekStart := end.AddDate(0, 0, -6).Format("2006-01-02")

	// First snapshot before window (baseline) + latest snapshot in window per repo.
	rows := []snapRow{}
	err := database.SelectContext(ctx, &rows, `
		SELECT s.repository_id, r.full_name, COALESCE(r.language, '') AS language,
		       s.snapshot_date, s.c_rank_score, COALESCE(s.c_rank_tier, '') AS c_rank_tier
		FROM daily_snapshots s
		JOIN repositories r ON r.id = s.repository_id
		WHERE s.c_rank_score > 0 AND (
		  s.snapshot_date >= ? AND s.snapshot_date = (
		      SELECT MAX(s2.snapshot_date) FROM daily_snapshots s2
		      WHERE s2.repository_id = s.repository_id AND s2.snapshot_date >= ?)
		  OR s.snapshot_date < ? AND s.snapshot_date = (
		      SELECT MIN(s3.snapshot_date) FROM daily_snapshots s3
		      WHERE s3.repository_id = s.repository_id)
		)`, windowStart, windowStart, endWeekStart)
	if err != nil {
		return nil, fmt.Errorf("snapshot query: %w", err)
	}

	type key struct{ repoID string }
	start := map[key]snapRow{}
	last := map[key]snapRow{}
	for _, row := range rows {
		k := key{row.RepoID}
		if row.Date >= endWeekStart {
			if cur, ok := last[k]; !ok || row.Date > cur.Date {
				last[k] = row
			}
		} else {
			if cur, ok := start[k]; !ok || row.Date < cur.Date {
				start[k] = row
			}
		}
	}

	digest := &WeeklyDigest{
		GeneratedAt: time.Now().UTC().Format(time.RFC3339),
		WeekStart:   windowStart,
		WeekEnd:     maxDate,
	}

	for k, e := range last {
		s, ok := start[k]
		if !ok || s.Score == 0 {
			continue
		}
		change := e.Score - s.Score
		digest.RepoMovers = append(digest.RepoMovers, RepoMover{
			FullName: e.FullName, Language: e.Language,
			ScoreStart: s.Score, ScoreEnd: e.Score, Change: change,
			TierStart: s.Tier, TierEnd: e.Tier,
		})
		if s.Tier != "" && e.Tier != "" && s.Tier != e.Tier {
			digest.TierChanges = append(digest.TierChanges, TierChange{
				FullName: e.FullName, Language: e.Language,
				From: s.Tier, To: e.Tier, Change: change,
			})
		}
	}

	// Rank movers by absolute change, keep top 20.
	sort.SliceStable(digest.RepoMovers, func(i, j int) bool {
		return abs(digest.RepoMovers[i].Change) > abs(digest.RepoMovers[j].Change)
	})
	if len(digest.RepoMovers) > 20 {
		digest.RepoMovers = digest.RepoMovers[:20]
	}
	sort.SliceStable(digest.TierChanges, func(i, j int) bool {
		return abs(digest.TierChanges[i].Change) > abs(digest.TierChanges[j].Change)
	})

	// Language aggregates over the same window.
	digest.LangTrends = languageTrends(ctx, database, windowStart, endWeekStart, maxDate)

	return digest, nil
}

func languageTrends(ctx context.Context, database *sqlx.DB, windowStart, endWeekStart, maxDate string) []LanguageTrend {
	rows := []struct {
		Language string  `db:"language"`
		Phase    string  `db:"phase"`
		AvgScore float64 `db:"avg_score"`
		RepoCnt  int     `db:"repo_cnt"`
	}{}
	err := database.SelectContext(ctx, &rows, `
		SELECT r.language AS language,
		       CASE WHEN s.snapshot_date >= ? THEN 'end' ELSE 'start' END AS phase,
		       AVG(s.c_rank_score) AS avg_score,
		       COUNT(DISTINCT s.repository_id) AS repo_cnt
		FROM daily_snapshots s
		JOIN repositories r ON r.id = s.repository_id
		WHERE s.c_rank_score > 0 AND s.snapshot_date >= ?
		  AND (s.snapshot_date = (
		      SELECT MAX(s2.snapshot_date) FROM daily_snapshots s2
		      WHERE s2.repository_id = s.repository_id AND s2.snapshot_date >= ?)
		   OR s.snapshot_date = (
		      SELECT MIN(s3.snapshot_date) FROM daily_snapshots s3
		      WHERE s3.repository_id = s.repository_id AND s3.snapshot_date >= ?))
		GROUP BY r.language, phase`, endWeekStart, windowStart, endWeekStart, windowStart)
	if err != nil {
		slog.Warn("language trends query failed", "err", err)
		return nil
	}

	startAgg := map[string]*struct {
		score float64
		repos int
		has   bool
	}{}
	endAgg := map[string]*struct {
		score float64
		repos int
		has   bool
	}{}
	for _, row := range rows {
		m := endAgg
		if row.Phase == "start" {
			m = startAgg
		}
		a := m[row.Language]
		if a == nil {
			a = &struct {
				score float64
				repos int
				has   bool
			}{}
			m[row.Language] = a
		}
		a.score = row.AvgScore
		a.repos = row.RepoCnt
		a.has = true
	}

	var trends []LanguageTrend
	for lang, e := range endAgg {
		if !e.has {
			continue
		}
		t := LanguageTrend{Language: lang, RepoCount: e.repos, ScoreEnd: e.score}
		if s := startAgg[lang]; s != nil && s.has {
			t.ScoreStart = s.score
			t.Change = e.score - s.score
		}
		trends = append(trends, t)
	}
	sort.SliceStable(trends, func(i, j int) bool { return trends[i].Change > trends[j].Change })
	return trends
}

func abs(f float64) float64 {
	if f < 0 {
		return -f
	}
	return f
}
