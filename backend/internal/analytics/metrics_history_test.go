package analytics

import (
	"context"
	"testing"

	"github.com/jmoiron/sqlx"
	_ "modernc.org/sqlite"
)

func setupTestDB(t *testing.T) *sqlx.DB {
	db, err := sqlx.Connect("sqlite", ":memory:")
	if err != nil {
		t.Fatalf("failed to open sqlite test db: %v", err)
	}

	schema := `
	CREATE TABLE IF NOT EXISTS daily_metrics (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		category VARCHAR(100) NOT NULL,
		stat_name VARCHAR(100) NOT NULL,
		stat_value REAL NOT NULL,
		stat_date VARCHAR(20) NOT NULL,
		stat_type VARCHAR(50) NOT NULL,
		metadata TEXT,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		UNIQUE(category, stat_name, stat_date)
	);`
	if _, err := db.Exec(schema); err != nil {
		t.Fatalf("failed to create schema: %v", err)
	}
	return db
}

func TestRecordAndAnalyzeAnomaly(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()
	ctx := context.Background()

	// Insert 10 days of normal Googlebot traffic around ~400 hits/day
	normalVals := []float64{380, 410, 395, 420, 400, 390, 415, 405, 390, 400}
	dates := []string{
		"2026-08-10", "2026-08-11", "2026-08-12", "2026-08-13", "2026-08-14",
		"2026-08-15", "2026-08-16", "2026-08-17", "2026-08-18", "2026-08-19",
	}

	for i, val := range normalVals {
		err := RecordDailyMetric(ctx, db, "seo_crawlers", "googlebot_requests", val, dates[i], "counter", "")
		if err != nil {
			t.Fatalf("failed to record metric: %v", err)
		}
	}

	// Case 1: Normal value on Aug 20 (410 hits) -> No Anomaly
	repNormal, err := AnalyzeMetricAnomaly(ctx, db, "seo_crawlers", "googlebot_requests", "2026-08-20", 410)
	if err != nil {
		t.Fatalf("AnalyzeMetricAnomaly failed: %v", err)
	}
	if repNormal.IsAnomaly {
		t.Errorf("expected no anomaly for 410 hits, got %v", repNormal)
	}

	// Case 2: Spike value on Aug 20 (1,200 hits) -> Anomaly SPIKE
	repSpike, err := AnalyzeMetricAnomaly(ctx, db, "seo_crawlers", "googlebot_requests", "2026-08-20", 1200)
	if err != nil {
		t.Fatalf("AnalyzeMetricAnomaly failed: %v", err)
	}
	if !repSpike.IsAnomaly || repSpike.AnomalyType != "SPIKE" {
		t.Errorf("expected SPIKE anomaly for 1200 hits, got %v", repSpike)
	}
	if repSpike.ZScore < 2.0 {
		t.Errorf("expected z_score >= 2.0, got %f", repSpike.ZScore)
	}

	// Case 3: Drop value on Aug 20 (20 hits) -> Anomaly DROP
	repDrop, err := AnalyzeMetricAnomaly(ctx, db, "seo_crawlers", "googlebot_requests", "2026-08-20", 20)
	if err != nil {
		t.Fatalf("AnalyzeMetricAnomaly failed: %v", err)
	}
	if !repDrop.IsAnomaly || repDrop.AnomalyType != "DROP" {
		t.Errorf("expected DROP anomaly for 20 hits, got %v", repDrop)
	}
}
