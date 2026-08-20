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

func TestRepoRepository_GetMaintainerEvents(t *testing.T) {
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

	now := time.Now().UTC()
	recentMaintainerTime := now.AddDate(0, 0, -5)
	oldMaintainerTime := now.AddDate(0, 0, -100) // Older than 90 days

	// Valid maintainer event (recent)
	database.MustExec(`INSERT INTO repo_pr_comments (repository_id, pr_number, source_type, author_login, author_association, comment_text, created_at)
		VALUES ('repo-1', 101, 'issue_comment', 'alice_member', 'MEMBER', 'looks good', ?)`, recentMaintainerTime)

	// Valid owner event (recent)
	database.MustExec(`INSERT INTO repo_pr_comments (repository_id, pr_number, source_type, author_login, author_association, comment_text, created_at)
		VALUES ('repo-1', 102, 'review_comment', 'bob_owner', 'OWNER', 'approved', ?)`, recentMaintainerTime.Add(time.Hour))

	// Valid collaborator event (recent)
	database.MustExec(`INSERT INTO repo_pr_comments (repository_id, pr_number, source_type, author_login, author_association, comment_text, created_at)
		VALUES ('repo-1', 103, 'issue_comment', 'charlie_collab', 'COLLABORATOR', 'merged', ?)`, recentMaintainerTime.Add(2*time.Hour))

	// Non-maintainer (FIRST_TIME_CONTRIBUTOR / NONE) -> should be excluded
	database.MustExec(`INSERT INTO repo_pr_comments (repository_id, pr_number, source_type, author_login, author_association, comment_text, created_at)
		VALUES ('repo-1', 104, 'issue_comment', 'stranger', 'NONE', 'question', ?)`, recentMaintainerTime)

	// Outdated maintainer event (>90 days old) -> should be excluded
	database.MustExec(`INSERT INTO repo_pr_comments (repository_id, pr_number, source_type, author_login, author_association, comment_text, created_at)
		VALUES ('repo-1', 105, 'issue_comment', 'retired_maintainer', 'MEMBER', 'old comment', ?)`, oldMaintainerTime)

	// Another repo maintainer event -> should be excluded
	database.MustExec(`INSERT INTO repo_pr_comments (repository_id, pr_number, source_type, author_login, author_association, comment_text, created_at)
		VALUES ('repo-2', 201, 'issue_comment', 'other_member', 'MEMBER', 'other repo', ?)`, recentMaintainerTime)

	events, err := repoStore.GetMaintainerEvents(ctx, "repo-1")
	if err != nil {
		t.Fatalf("GetMaintainerEvents failed: %v", err)
	}

	if len(events) != 3 {
		t.Fatalf("expected 3 maintainer events for repo-1, got %d", len(events))
	}

	for _, ev := range events {
		if ev.HourUTC < 0 || ev.HourUTC > 23 {
			t.Errorf("invalid HourUTC: %d", ev.HourUTC)
		}
		if ev.DayOfWeek < time.Sunday || ev.DayOfWeek > time.Saturday {
			t.Errorf("invalid DayOfWeek: %v", ev.DayOfWeek)
		}
	}
}

