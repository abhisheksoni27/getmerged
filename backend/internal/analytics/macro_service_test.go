package analytics_test

import (
	"context"
	"testing"
	"time"

	"github.com/abhisheksoni27/opendoor/internal/analytics"
	"github.com/abhisheksoni27/opendoor/internal/db"
	"github.com/jmoiron/sqlx"
	_ "modernc.org/sqlite"
)

func TestComputeAndCacheMacroStats(t *testing.T) {
	database, err := sqlx.Open("sqlite", ":memory:")
	if err != nil {
		t.Fatalf("failed to open memory db: %v", err)
	}
	defer database.Close()

	_ = db.AutoMigrate(database)

	database.MustExec(`
	CREATE TABLE IF NOT EXISTS repositories (
		id TEXT PRIMARY KEY,
		full_name TEXT NOT NULL,
		owner TEXT NOT NULL,
		name TEXT NOT NULL,
		language TEXT,
		stars INTEGER DEFAULT 0,
		description TEXT,
		github_url TEXT,
		updated_at DATETIME NOT NULL
	);

	CREATE TABLE IF NOT EXISTS daily_snapshots (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		repository_id TEXT NOT NULL,
		snapshot_date TEXT NOT NULL,
		c_rank_tier TEXT,
		c_rank_score REAL,
		external_pr_merge_rate REAL,
		time_to_first_response_hours REAL,
		time_to_merge_hours REAL,
		first_timer_success_rate REAL,
		repeat_contributor_rate REAL,
		maintainer_responsiveness REAL,
		last_activity_days REAL,
		review_rounds REAL,
		distinct_maintainer_count REAL,
		staleness_flag INTEGER DEFAULT 0,
		created_at DATETIME NOT NULL
	);
	`)

	now := time.Now()
	database.MustExec(`INSERT INTO repositories (id, full_name, owner, name, language, stars, updated_at) VALUES ('1', 'go/go', 'go', 'go', 'Go', 100000, ?)`, now)
	database.MustExec(`INSERT INTO daily_snapshots (repository_id, snapshot_date, c_rank_tier, c_rank_score, time_to_first_response_hours, created_at) VALUES ('1', '2026-07-26', 'S', 98.0, 2.0, ?)`, now)

	stats, err := analytics.ComputeAndCacheMacroStats(context.Background(), database)
	if err != nil {
		t.Fatalf("expected MacroStats calculation to succeed, got: %v", err)
	}

	if stats.TotalRepos != 1 || stats.SClassCount != 1 {
		t.Fatalf("unexpected stats output: %+v", stats)
	}
}
