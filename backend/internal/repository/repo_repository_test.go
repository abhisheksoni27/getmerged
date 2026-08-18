package repository_test

import (
	"context"
	"testing"
	"time"

	"github.com/abhisheksoni27/opendoor/internal/db"
	"github.com/abhisheksoni27/opendoor/internal/repository"
	"github.com/jmoiron/sqlx"
	_ "modernc.org/sqlite"
)

func TestRepoRepository_Topics(t *testing.T) {
	database, err := sqlx.Open("sqlite", ":memory:")
	if err != nil {
		t.Fatalf("failed to open memory db: %v", err)
	}
	defer database.Close()

	if err := db.AutoMigrate(database); err != nil {
		t.Fatalf("failed to auto migrate: %v", err)
	}

	repoStore := repository.NewRepoRepository(database)
	ctx := context.Background()

	now := time.Now()
	database.MustExec(`INSERT INTO repositories (id, full_name, owner, name, language, stars, updated_at) VALUES ('repo-1', 'tokio-rs/tokio', 'tokio-rs', 'tokio', 'Rust', 25000, ?)`, now)
	database.MustExec(`INSERT INTO repositories (id, full_name, owner, name, language, stars, updated_at) VALUES ('repo-2', 'huggingface/transformers', 'huggingface', 'transformers', 'Python', 130000, ?)`, now)
	database.MustExec(`INSERT INTO latest_snapshots (repository_id, snapshot_date, c_rank_tier, c_rank_score) VALUES ('repo-1', '2026-08-18', 'S', 95.0)`)
	database.MustExec(`INSERT INTO latest_snapshots (repository_id, snapshot_date, c_rank_tier, c_rank_score) VALUES ('repo-2', '2026-08-18', 'S', 98.0)`)

	// Test UpsertTopics
	err = repoStore.UpsertTopics(ctx, "repo-1", []string{"RUST", "Async", "Network"})
	if err != nil {
		t.Fatalf("UpsertTopics failed: %v", err)
	}
	err = repoStore.UpsertTopics(ctx, "repo-2", []string{"machine-learning", "Python", "ai"})
	if err != nil {
		t.Fatalf("UpsertTopics failed: %v", err)
	}

	// Verify GetTopicsByRepoID returns normalized lowercase topics
	topics1, err := repoStore.GetTopicsByRepoID(ctx, "repo-1")
	if err != nil {
		t.Fatalf("GetTopicsByRepoID failed: %v", err)
	}
	if len(topics1) != 3 {
		t.Fatalf("expected 3 topics, got %d (%v)", len(topics1), topics1)
	}
	if topics1[0] != "async" && topics1[1] != "async" && topics1[2] != "async" {
		t.Errorf("expected lowercase topic 'async', got %v", topics1)
	}

	// Verify List with Topic filter
	rustRepos, total, err := repoStore.List(ctx, repository.RepoFilter{Topic: "rust"})
	if err != nil {
		t.Fatalf("List with Topic=rust failed: %v", err)
	}
	if total != 1 || len(rustRepos) != 1 {
		t.Fatalf("expected 1 rust repo, got total=%d, len=%d", total, len(rustRepos))
	}
	if rustRepos[0].FullName != "tokio-rs/tokio" {
		t.Errorf("expected tokio-rs/tokio, got %s", rustRepos[0].FullName)
	}
	if len(rustRepos[0].Topics) == 0 {
		t.Errorf("expected populated Topics on RepoRecord, got %v", rustRepos[0].Topics)
	}

	// Verify GetAllDistinctTopics
	allTopics, err := repoStore.GetAllDistinctTopics(ctx)
	if err != nil {
		t.Fatalf("GetAllDistinctTopics failed: %v", err)
	}
	if len(allTopics) != 6 {
		t.Fatalf("expected 6 distinct topics, got %d (%v)", len(allTopics), allTopics)
	}
}
