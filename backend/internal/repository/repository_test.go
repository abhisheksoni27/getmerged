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
		staleness_flag INTEGER DEFAULT 0,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		UNIQUE(repository_id, snapshot_date)
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
