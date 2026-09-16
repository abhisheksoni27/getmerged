package spotlight

import (
	"context"
	"strings"
	"testing"

	"github.com/jmoiron/sqlx"
	_ "modernc.org/sqlite"
)

func TestCleanDescription(t *testing.T) {
	tests := []struct {
		input    string
		maxChars int
		expected string
	}{
		{
			input:    "Check out [our website](https://example.com) for details.",
			maxChars: 100,
			expected: "Check out our website for details",
		},
		{
			input:    "A very long sentence that has multiple words and goes on and on without stopping anytime soon.",
			maxChars: 40,
			expected: "A very long sentence that has multiple...",
		},
		{
			input:    "Fast package manager.  https://foo.bar/baz",
			maxChars: 100,
			expected: "Fast package manager",
		},
	}

	for _, tc := range tests {
		got := CleanDescription(tc.input, tc.maxChars)
		if got != tc.expected {
			t.Errorf("CleanDescription(%q, %d) = %q; want %q", tc.input, tc.maxChars, got, tc.expected)
		}
	}
}

func TestFormatStars(t *testing.T) {
	if got := FormatStars(450); got != "450★" {
		t.Errorf("FormatStars(450) = %q; want 450★", got)
	}
	if got := FormatStars(2450); got != "2.5k★" {
		t.Errorf("FormatStars(2450) = %q; want 2.5k★", got)
	}
}

func TestFormatResponseSpeed(t *testing.T) {
	if got := FormatResponseSpeed(0.4); got != "Replies in under 1h" {
		t.Errorf("FormatResponseSpeed(0.4) = %q; want Replies in under 1h", got)
	}
	if got := FormatResponseSpeed(3.2); got != "Replies in ~3h" {
		t.Errorf("FormatResponseSpeed(3.2) = %q; want Replies in ~3h", got)
	}
	if got := FormatResponseSpeed(36.0); got != "Replies in ~1-2 days" {
		t.Errorf("FormatResponseSpeed(36.0) = %q; want Replies in ~1-2 days", got)
	}
}

func TestFormatTweet(t *testing.T) {
	repo := &RepoSpotlight{
		FullName:        "astral-sh/uv",
		Language:        "Python",
		Stars:           38200,
		Description:     "Extremely fast Python package installer and resolver, written in Rust.",
		CRankTier:       "S",
		CRankScore:      94.5,
		ResponseHours:   2.8,
		MergeRate:       84.2,
		MaintainerCount: 6,
		GFICount:        4,
	}

	tweet := FormatTweet(repo)

	if !strings.Contains(tweet, "Repo spotlight: astral-sh/uv (Python)") {
		t.Errorf("tweet missing header: %s", tweet)
	}
	if !strings.Contains(tweet, "⭐ 38.2k★ · Tier S") {
		t.Errorf("tweet missing stars/tier: %s", tweet)
	}
	if !strings.Contains(tweet, "⚡ Replies in ~3h") {
		t.Errorf("tweet missing speed: %s", tweet)
	}
	if !strings.Contains(tweet, "🤝 84% outside PRs merged") {
		t.Errorf("tweet missing merge rate: %s", tweet)
	}
	if !strings.Contains(tweet, "👥 6 active reviewers") {
		t.Errorf("tweet missing reviewers: %s", tweet)
	}
	if !strings.Contains(tweet, "🎁 4 Good First Issues waiting") {
		t.Errorf("tweet missing greatest gift: %s", tweet)
	}
	if !strings.Contains(tweet, "https://getmerged.abhishekco.de/astral-sh/uv") {
		t.Errorf("tweet missing scorecard url: %s", tweet)
	}

	// Verify Twitter intent URL
	intent := BuildIntentURL(tweet)
	if !strings.HasPrefix(intent, "https://twitter.com/intent/tweet?text=") {
		t.Errorf("invalid intent url: %s", intent)
	}
}

func setupTestDB(t *testing.T) *sqlx.DB {
	database, err := sqlx.Open("sqlite", ":memory:")
	if err != nil {
		t.Fatalf("failed to open sqlite in-memory db: %v", err)
	}

	schema := `
	CREATE TABLE repositories (
		id VARCHAR(255) PRIMARY KEY,
		full_name VARCHAR(255) UNIQUE NOT NULL,
		owner TEXT NOT NULL,
		name TEXT NOT NULL,
		language TEXT,
		stars INTEGER DEFAULT 0,
		description TEXT
	);

	CREATE TABLE latest_snapshots (
		repository_id VARCHAR(255) PRIMARY KEY,
		c_rank_tier VARCHAR(10) DEFAULT 'D',
		c_rank_score REAL DEFAULT 0,
		time_to_first_response_hours REAL DEFAULT 0,
		response_p50_hours REAL DEFAULT 0,
		external_pr_merge_rate REAL DEFAULT 0,
		bus_factor INTEGER DEFAULT 0,
		distinct_maintainer_count REAL DEFAULT 0,
		good_first_issue_count INTEGER DEFAULT 0,
		staleness_flag INTEGER DEFAULT 0
	);

	CREATE TABLE daily_tweet_spotlights (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		repository_id VARCHAR(255) NOT NULL,
		full_name VARCHAR(255) NOT NULL,
		spotlight_date VARCHAR(20) NOT NULL,
		tweet_text TEXT NOT NULL,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		UNIQUE(spotlight_date),
		UNIQUE(repository_id)
	);
	`
	if _, err := database.Exec(schema); err != nil {
		t.Fatalf("failed to create tables: %v", err)
	}

	return database
}

func TestGetOrCreateDailySpotlight(t *testing.T) {
	ctx := context.Background()
	db := setupTestDB(t)
	defer db.Close()

	// Seed repositories
	_, err := db.Exec(`
		INSERT INTO repositories (id, full_name, owner, name, language, stars, description)
		VALUES 
		('1', 'ratatui/ratatui', 'ratatui', 'ratatui', 'Rust', 8500, 'Rust library to build rich terminal user interfaces'),
		('2', 'slow/repo', 'slow', 'repo', 'Python', 200, 'A slow project');

		INSERT INTO latest_snapshots (repository_id, c_rank_tier, c_rank_score, time_to_first_response_hours, external_pr_merge_rate, bus_factor, good_first_issue_count, staleness_flag)
		VALUES
		('1', 'S', 92.0, 3.0, 81.0, 5, 6, 0),
		('2', 'D', 30.0, 240.0, 10.0, 1, 0, 0);
	`)
	if err != nil {
		t.Fatalf("failed to seed test data: %v", err)
	}

	targetDate := "2026-09-16"

	// 1. Get or create spotlight for today
	spot, err := GetOrCreateDailySpotlight(ctx, db, targetDate)
	if err != nil {
		t.Fatalf("GetOrCreateDailySpotlight failed: %v", err)
	}
	if spot.FullName != "ratatui/ratatui" {
		t.Errorf("expected ratatui/ratatui, got %s", spot.FullName)
	}
	if !strings.Contains(spot.TweetText, "Repo spotlight: ratatui/ratatui (Rust)") {
		t.Errorf("tweet text unexpected: %s", spot.TweetText)
	}

	// 2. Fetching again for the same date should return idempotent existing spotlight
	cached, err := GetOrCreateDailySpotlight(ctx, db, targetDate)
	if err != nil {
		t.Fatalf("second call failed: %v", err)
	}
	if cached.RepositoryID != spot.RepositoryID {
		t.Errorf("expected cached repo ID %s, got %s", spot.RepositoryID, cached.RepositoryID)
	}

	// 3. Test Bulk Generator
	bulk, err := GenerateBulkSpotlights(ctx, db, 10)
	if err != nil {
		t.Fatalf("GenerateBulkSpotlights failed: %v", err)
	}
	if len(bulk) != 1 { // Only ratatui is S or A tier
		t.Errorf("expected 1 repo in bulk, got %d", len(bulk))
	}
}
