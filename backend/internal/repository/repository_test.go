package repository_test

import (
	"context"
	"testing"
	"time"

	"github.com/abhisheksoni27/opendoor/internal/config"
	"github.com/abhisheksoni27/opendoor/internal/db"
	"github.com/abhisheksoni27/opendoor/internal/repository"
	"github.com/jmoiron/sqlx"
	_ "modernc.org/sqlite"
)

func setupTestDB(t *testing.T) (*sqlx.DB, *config.Config) {
	t.Helper()
	database, err := sqlx.Open("sqlite", ":memory:")
	if err != nil {
		t.Fatalf("failed to open memory db: %v", err)
	}

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
		id TEXT PRIMARY KEY,
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
			bus_factor INTEGER DEFAULT 0,
		staleness_flag INTEGER DEFAULT 0,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		UNIQUE(repository_id, snapshot_date)
	);
	CREATE TABLE IF NOT EXISTS latest_snapshots (
		repository_id TEXT NOT NULL,
		snapshot_date TEXT NOT NULL,
		c_rank_tier TEXT,
		c_rank_score REAL,
		external_pr_merge_rate REAL DEFAULT 0,
		time_to_first_response_hours REAL DEFAULT 0,
		time_to_merge_hours REAL DEFAULT 0,
		first_timer_success_rate REAL DEFAULT 0,
		repeat_contributor_rate REAL DEFAULT 0,
		maintainer_responsiveness REAL DEFAULT 0,
		last_activity_days REAL DEFAULT 0,
		review_rounds REAL DEFAULT 0,
		distinct_maintainer_count REAL DEFAULT 0,
			bus_factor INTEGER DEFAULT 0,
		staleness_flag INTEGER DEFAULT 0,
		good_first_issue_count INTEGER DEFAULT 0
	);
	`)

	cfg := &config.Config{
		EncryptionKey: "12345678901234567890123456789012",
	}

	return database, cfg
}

func TestUserRepository_UpsertAndFind(t *testing.T) {
	database, cfg := setupTestDB(t)
	defer database.Close()

	repo := repository.NewUserRepository(database, cfg)
	ctx := context.Background()

	userID, err := repo.UpsertUser(ctx, 12345, "devuser", "dev@opendoor.dev", "https://avatar.url")
	if err != nil {
		t.Fatalf("UpsertUser failed: %v", err)
	}

	user, err := repo.FindByID(ctx, userID)
	if err != nil {
		t.Fatalf("FindByID failed: %v", err)
	}

	if user.Username != "devuser" {
		t.Fatalf("expected username 'devuser', got %s", user.Username)
	}
	if user.Email == nil || *user.Email != "dev@opendoor.dev" {
		t.Fatalf("expected email 'dev@opendoor.dev', got %v", user.Email)
	}
	if user.ProfilingConsent {
		t.Fatalf("expected profiling_consent to be false by default")
	}

	// 2. Test updating consent
	if err := repo.UpdateProfilingConsent(ctx, userID, true); err != nil {
		t.Fatalf("UpdateProfilingConsent failed: %v", err)
	}
	updatedUser, err := repo.FindByID(ctx, userID)
	if err != nil || !updatedUser.ProfilingConsent {
		t.Fatalf("expected profiling_consent to be true after update")
	}

	// 3. Test soft delete
	if err := repo.SoftDeleteUser(ctx, userID); err != nil {
		t.Fatalf("SoftDeleteUser failed: %v", err)
	}

	// Deleted user should return not found
	deletedLookup, err := repo.FindByID(ctx, userID)
	if err == nil || deletedLookup != nil {
		t.Fatalf("expected soft-deleted user to not be found by FindByID")
	}
}

func TestRepoRepository_ListAndFind(t *testing.T) {
	database, _ := setupTestDB(t)
	defer database.Close()

	repo := repository.NewRepoRepository(database)
	ctx := context.Background()

	now := time.Now()
	database.MustExec(`INSERT INTO repositories (id, full_name, owner, name, language, stars, updated_at) VALUES ('1', 'golang/go', 'golang', 'go', 'Go', 120000, ?)`, now)
	database.MustExec(`INSERT INTO daily_snapshots (id, repository_id, snapshot_date, c_rank_tier, c_rank_score) VALUES ('s1', '1', '2026-07-26', 'S', 95.0)`)
	database.MustExec(`INSERT INTO latest_snapshots (repository_id, snapshot_date, c_rank_tier, c_rank_score) VALUES ('1', '2026-07-26', 'S', 95.0)`)

	repos, total, err := repo.List(ctx, repository.RepoFilter{Limit: 10, Offset: 0})
	if err != nil {
		t.Fatalf("List failed: %v", err)
	}
	if total != 1 || len(repos) != 1 {
		t.Fatalf("expected 1 repo, got total %d, len %d", total, len(repos))
	}

	found, err := repo.FindByIDOrName(ctx, "golang/go")
	if err != nil {
		t.Fatalf("FindByIDOrName failed: %v", err)
	}
	if found.FullName != "golang/go" {
		t.Fatalf("expected full_name 'golang/go', got %s", found.FullName)
	}
}

func TestRepoRepository_ListFiltersSnapshotDate(t *testing.T) {
	database, _ := setupTestDB(t)
	defer database.Close()

	repo := repository.NewRepoRepository(database)
	ctx := context.Background()
	now := time.Now()
	today := time.Now().UTC().Format("2006-01-02")

	database.MustExec(`INSERT INTO repositories (id, full_name, owner, name, language, stars, updated_at) VALUES ('1', 'today/repo', 'today', 'repo', 'Go', 1000, ?)`, now)
	database.MustExec(`INSERT INTO latest_snapshots (repository_id, snapshot_date, c_rank_tier, c_rank_score) VALUES ('1', ?, 'S', 95.0)`, today)
	database.MustExec(`INSERT INTO repositories (id, full_name, owner, name, language, stars, updated_at) VALUES ('2', 'old/repo', 'old', 'repo', 'Go', 1000, ?)`, now)
	database.MustExec(`INSERT INTO latest_snapshots (repository_id, snapshot_date, c_rank_tier, c_rank_score) VALUES ('2', '2026-01-01', 'S', 99.0)`)

	repos, total, err := repo.List(ctx, repository.RepoFilter{Limit: 10, SnapshotDate: today})
	if err != nil {
		t.Fatalf("List failed: %v", err)
	}
	if total != 1 || len(repos) != 1 {
		t.Fatalf("expected 1 repo, got total %d, len %d", total, len(repos))
	}
	if repos[0].FullName != "today/repo" {
		t.Fatalf("expected today/repo, got %s", repos[0].FullName)
	}
}

func TestRepoRepository_ListFiltersMinTier(t *testing.T) {
	database, _ := setupTestDB(t)
	defer database.Close()

	repo := repository.NewRepoRepository(database)
	ctx := context.Background()
	now := time.Now()

	database.MustExec(`INSERT INTO repositories (id, full_name, owner, name, language, stars, updated_at) VALUES ('1', 'great/repo', 'great', 'repo', 'Go', 5000, ?)`, now)
	database.MustExec(`INSERT INTO latest_snapshots (repository_id, snapshot_date, c_rank_tier, c_rank_score) VALUES ('1', '2026-07-26', 'S', 95.0)`)

	database.MustExec(`INSERT INTO repositories (id, full_name, owner, name, language, stars, updated_at) VALUES ('2', 'ok/repo', 'ok', 'repo', 'Rust', 4000, ?)`, now)
	database.MustExec(`INSERT INTO latest_snapshots (repository_id, snapshot_date, c_rank_tier, c_rank_score) VALUES ('2', '2026-07-26', 'B', 45.0)`)

	database.MustExec(`INSERT INTO repositories (id, full_name, owner, name, language, stars, updated_at) VALUES ('3', 'jitsi/lib-jitsi-meet', 'jitsi', 'lib-jitsi-meet', 'JavaScript', 1500, ?)`, now)
	database.MustExec(`INSERT INTO latest_snapshots (repository_id, snapshot_date, c_rank_tier, c_rank_score) VALUES ('3', '2026-07-26', 'D', 8.0)`)

	repos, total, err := repo.List(ctx, repository.RepoFilter{Limit: 10, SortBy: "c_rank_score", Order: "desc", MinTier: "B"})
	if err != nil {
		t.Fatalf("List failed: %v", err)
	}
	if total != 2 || len(repos) != 2 {
		t.Fatalf("expected 2 repos at tier B or better, got total %d, len %d", total, len(repos))
	}
	for _, r := range repos {
		if r.FullName == "jitsi/lib-jitsi-meet" {
			t.Fatalf("D-tier repo must be excluded when min_tier=B")
		}
	}
}

func TestRepoRepository_ListFiltersGoodFirstIssue(t *testing.T) {
	database, _ := setupTestDB(t)
	defer database.Close()

	repo := repository.NewRepoRepository(database)
	ctx := context.Background()

	now := time.Now()
	database.MustExec(`INSERT INTO repositories (id, full_name, owner, name, language, stars, updated_at) VALUES ('1', 'with/gfi', 'with', 'gfi', 'Go', 5000, ?)`, now)
	database.MustExec(`INSERT INTO latest_snapshots (repository_id, snapshot_date, c_rank_tier, c_rank_score, good_first_issue_count) VALUES ('1', '2026-07-26', 'A', 80.0, 5)`)

	database.MustExec(`INSERT INTO repositories (id, full_name, owner, name, language, stars, updated_at) VALUES ('2', 'without/gfi', 'without', 'gfi', 'Go', 6000, ?)`, now)
	database.MustExec(`INSERT INTO latest_snapshots (repository_id, snapshot_date, c_rank_tier, c_rank_score, good_first_issue_count) VALUES ('2', '2026-07-26', 'A', 80.0, 0)`)

	// Filter with HasGoodFirstIssue = true
	repos, total, err := repo.List(ctx, repository.RepoFilter{
		HasGoodFirstIssue: true,
	})
	if err != nil {
		t.Fatalf("List failed: %v", err)
	}
	if total != 1 || len(repos) != 1 {
		t.Fatalf("expected 1 repo with GFI, got total %d, len %d", total, len(repos))
	}
	if repos[0].FullName != "with/gfi" {
		t.Fatalf("expected with/gfi, got %s", repos[0].FullName)
	}
}

func TestRepoRepository_ListFiltersRecencyAndStaleness(t *testing.T) {
	database, _ := setupTestDB(t)
	defer database.Close()

	repo := repository.NewRepoRepository(database)
	ctx := context.Background()
	now := time.Now()

	database.MustExec(`INSERT INTO repositories (id, full_name, owner, name, language, stars, updated_at) VALUES ('1', 'active/repo', 'active', 'repo', 'Go', 5000, ?)`, now)
	database.MustExec(`INSERT INTO latest_snapshots (repository_id, snapshot_date, c_rank_tier, c_rank_score, last_activity_days, staleness_flag) VALUES ('1', '2026-08-16', 'S', 90.0, 3, 0)`)

	database.MustExec(`INSERT INTO repositories (id, full_name, owner, name, language, stars, updated_at) VALUES ('2', 'inactive/repo', 'inactive', 'repo', 'Go', 6000, ?)`, now)
	database.MustExec(`INSERT INTO latest_snapshots (repository_id, snapshot_date, c_rank_tier, c_rank_score, last_activity_days, staleness_flag) VALUES ('2', '2026-08-16', 'S', 90.0, 14, 0)`)

	database.MustExec(`INSERT INTO repositories (id, full_name, owner, name, language, stars, updated_at) VALUES ('3', 'stale/repo', 'stale', 'repo', 'Go', 7000, ?)`, now)
	database.MustExec(`INSERT INTO latest_snapshots (repository_id, snapshot_date, c_rank_tier, c_rank_score, last_activity_days, staleness_flag) VALUES ('3', '2026-08-16', 'D', 25.0, 2, 1)`)

	repos, total, err := repo.List(ctx, repository.RepoFilter{
		MaxLastActivityDays: 7,
		ExcludeStale:        true,
	})
	if err != nil {
		t.Fatalf("List failed: %v", err)
	}
	if total != 1 || len(repos) != 1 {
		t.Fatalf("expected 1 repo, got total %d, len %d", total, len(repos))
	}
	if repos[0].FullName != "active/repo" {
		t.Fatalf("expected active/repo, got %s", repos[0].FullName)
	}
}

func TestRepoRepository_GetRelatedRepos(t *testing.T) {
	database, _ := setupTestDB(t)
	defer database.Close()

	repo := repository.NewRepoRepository(database)
	ctx := context.Background()

	now := time.Now()
	database.MustExec(`INSERT INTO repositories (id, full_name, owner, name, language, stars, updated_at) VALUES ('1', 'gin-gonic/gin', 'gin-gonic', 'gin', 'Go', 75000, ?)`, now)
	database.MustExec(`INSERT INTO latest_snapshots (repository_id, snapshot_date, c_rank_tier, c_rank_score, external_pr_merge_rate) VALUES ('1', '2026-07-26', 'S', 95.0, 85.0)`)

	database.MustExec(`INSERT INTO repositories (id, full_name, owner, name, language, stars, updated_at) VALUES ('2', 'gofiber/fiber', 'gofiber', 'fiber', 'Go', 35000, ?)`, now)
	database.MustExec(`INSERT INTO latest_snapshots (repository_id, snapshot_date, c_rank_tier, c_rank_score, external_pr_merge_rate) VALUES ('2', '2026-07-26', 'S', 92.0, 80.0)`)

	database.MustExec(`INSERT INTO repositories (id, full_name, owner, name, language, stars, updated_at) VALUES ('3', 'facebook/react', 'facebook', 'react', 'JavaScript', 220000, ?)`, now)
	database.MustExec(`INSERT INTO latest_snapshots (repository_id, snapshot_date, c_rank_tier, c_rank_score, external_pr_merge_rate) VALUES ('3', '2026-07-26', 'S', 90.0, 75.0)`)

	// Insert a Tier D repo in Go to verify it gets excluded
	database.MustExec(`INSERT INTO repositories (id, full_name, owner, name, language, stars, updated_at) VALUES ('4', 'stale/stale-go', 'stale', 'stale-go', 'Go', 10000, ?)`, now)
	database.MustExec(`INSERT INTO latest_snapshots (repository_id, snapshot_date, c_rank_tier, c_rank_score, external_pr_merge_rate) VALUES ('4', '2026-07-26', 'D', 15.0, 5.0)`)

	target, err := repo.FindByIDOrName(ctx, "gin-gonic/gin")
	if err != nil {
		t.Fatalf("failed to find target repo: %v", err)
	}

	related, err := repo.GetRelatedRepos(ctx, target, 3)
	if err != nil {
		t.Fatalf("GetRelatedRepos failed: %v", err)
	}

	if len(related) == 0 {
		t.Fatalf("expected non-empty related repos list, got 0")
	}

	// First match should be gofiber/fiber (same language Go)
	if related[0].FullName != "gofiber/fiber" {
		t.Fatalf("expected first related repo to be 'gofiber/fiber', got %s", related[0].FullName)
	}

	// Verify Tier D repo was filtered out
	for _, r := range related {
		if r.CRankTier != "S" && r.CRankTier != "A" && r.CRankTier != "B" {
			t.Fatalf("expected only welcoming tiers S/A/B, got repo %s with tier %s", r.FullName, r.CRankTier)
		}
	}
}
