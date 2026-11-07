package repository_test

import (
	"context"
	"testing"
	"time"

	"github.com/abhisheksoni27/opendoor/internal/github"
	"github.com/abhisheksoni27/opendoor/internal/repository"
)

func TestGFIRepository_UpsertIssues_FiltersOlderThan9Months(t *testing.T) {
	database, _ := setupTestDB(t)
	defer database.Close()

	gfiRepo := repository.NewGFIRepository(database)
	ctx := context.Background()

	repoID := "test-repo-1"
	// Insert dummy repository
	database.MustExec(`INSERT INTO repositories (id, full_name, owner, name, language, stars, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
		repoID, "owner/test-repo-1", "owner", "test-repo-1", "Go", 100, time.Now())

	now := time.Now().UTC()
	staleIssueDate := now.AddDate(-1, 0, 0) // 1 year ago (older than 9 months)
	freshIssueDate := now.AddDate(0, -2, 0) // 2 months ago (within 9 months)

	issues := []github.GoodFirstIssue{
		{
			Number:       1,
			Title:        "Stale 2024 Issue",
			BodyText:     "Ancient issue",
			URL:          "https://github.com/owner/test-repo-1/issues/1",
			CreatedAt:    staleIssueDate,
			LabelsJSON:   `[{"name":"good first issue"}]`,
			QualityScore: 90,
		},
		{
			Number:       2,
			Title:        "Fresh 2026 Issue",
			BodyText:     "Recent issue",
			URL:          "https://github.com/owner/test-repo-1/issues/2",
			CreatedAt:    freshIssueDate,
			LabelsJSON:   `[{"name":"good first issue"}]`,
			QualityScore: 85,
		},
	}

	err := gfiRepo.UpsertIssues(ctx, repoID, issues)
	if err != nil {
		t.Fatalf("UpsertIssues failed: %v", err)
	}

	var count int
	err = database.GetContext(ctx, &count, `SELECT COUNT(*) FROM repo_good_first_issues WHERE repository_id = ?`, repoID)
	if err != nil {
		t.Fatalf("failed to count issues: %v", err)
	}

	if count != 1 {
		t.Fatalf("expected 1 issue upserted (fresh only), got %d", count)
	}

	var issueNumber int
	err = database.GetContext(ctx, &issueNumber, `SELECT issue_number FROM repo_good_first_issues WHERE repository_id = ?`, repoID)
	if err != nil {
		t.Fatalf("failed to get issue_number: %v", err)
	}
	if issueNumber != 2 {
		t.Fatalf("expected issue #2, got #%d", issueNumber)
	}
}

func TestGFIRepository_ListByLanguage_FiltersOlderThan9Months(t *testing.T) {
	database, _ := setupTestDB(t)
	defer database.Close()

	gfiRepo := repository.NewGFIRepository(database)
	ctx := context.Background()

	repoID := "test-repo-go"
	database.MustExec(`INSERT INTO repositories (id, full_name, owner, name, language, stars, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
		repoID, "golang/test-repo", "golang", "test-repo", "Go", 500, time.Now())
	database.MustExec(`INSERT INTO latest_snapshots (repository_id, snapshot_date, c_rank_tier, c_rank_score) VALUES (?, ?, ?, ?)`,
		repoID, "2026-08-18", "A", 95.0)

	now := time.Now().UTC()
	staleDate := now.AddDate(-1, -2, 0) // 14 months ago
	freshDate := now.AddDate(0, -1, 0)  // 1 month ago

	// Seed directly into DB to simulate pre-ingested stale rows in production
	database.MustExec(`INSERT INTO repo_good_first_issues (repository_id, issue_number, title, body_text, url, comments_count, labels_json, quality_score, created_at, synced_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		repoID, 101, "Stale Issue 101", "body", "url101", 0, "[]", 100, staleDate, now)
	database.MustExec(`INSERT INTO repo_good_first_issues (repository_id, issue_number, title, body_text, url, comments_count, labels_json, quality_score, created_at, synced_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		repoID, 102, "Fresh Issue 102", "body", "url102", 0, "[]", 80, freshDate, now)

	items, err := gfiRepo.ListByLanguage(ctx, "Go", 10, false)
	if err != nil {
		t.Fatalf("ListByLanguage failed: %v", err)
	}

	if len(items) != 1 {
		t.Fatalf("expected exactly 1 fresh item, got %d", len(items))
	}
	if items[0].IssueNumber != 102 {
		t.Fatalf("expected issue #102, got #%d", items[0].IssueNumber)
	}
}

func TestGFIRepository_ListByRepoID_FiltersOlderThan9Months(t *testing.T) {
	database, _ := setupTestDB(t)
	defer database.Close()

	gfiRepo := repository.NewGFIRepository(database)
	ctx := context.Background()

	repoID := "test-repo-detail"
	database.MustExec(`INSERT INTO repositories (id, full_name, owner, name, language, stars, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
		repoID, "org/repo-detail", "org", "repo-detail", "Rust", 300, time.Now())
	database.MustExec(`INSERT INTO latest_snapshots (repository_id, snapshot_date, c_rank_tier, c_rank_score) VALUES (?, ?, ?, ?)`,
		repoID, "2026-08-18", "A", 90.0)

	now := time.Now().UTC()
	staleDate := now.AddDate(0, -10, 0) // 10 months ago
	freshDate := now.AddDate(0, -3, 0)  // 3 months ago

	database.MustExec(`INSERT INTO repo_good_first_issues (repository_id, issue_number, title, body_text, url, comments_count, labels_json, quality_score, created_at, synced_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		repoID, 201, "Stale Issue 201", "body", "url201", 0, "[]", 100, staleDate, now)
	database.MustExec(`INSERT INTO repo_good_first_issues (repository_id, issue_number, title, body_text, url, comments_count, labels_json, quality_score, created_at, synced_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		repoID, 202, "Fresh Issue 202", "body", "url202", 0, "[]", 85, freshDate, now)

	items, err := gfiRepo.ListByRepoID(ctx, repoID, 10, false)
	if err != nil {
		t.Fatalf("ListByRepoID failed: %v", err)
	}

	if len(items) != 1 {
		t.Fatalf("expected exactly 1 fresh item, got %d", len(items))
	}
	if items[0].IssueNumber != 202 {
		t.Fatalf("expected issue #202, got #%d", items[0].IssueNumber)
	}
}

func TestGFIRepository_UpsertIssues_MarksClosedIssues(t *testing.T) {
	database, _ := setupTestDB(t)
	defer database.Close()

	gfiRepo := repository.NewGFIRepository(database)
	ctx := context.Background()

	repoID := "test-repo-closing"
	database.MustExec(`INSERT INTO repositories (id, full_name, owner, name, language, stars, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
		repoID, "org/closing", "org", "closing", "TypeScript", 400, time.Now())
	database.MustExec(`INSERT INTO latest_snapshots (repository_id, snapshot_date, c_rank_tier, c_rank_score) VALUES (?, ?, ?, ?)`,
		repoID, "2026-08-18", "A", 88.0)

	now := time.Now().UTC()

	// Initial batch: issues #1 and #2 open
	initialIssues := []github.GoodFirstIssue{
		{Number: 1, Title: "Issue 1", URL: "url1", CreatedAt: now.AddDate(0, -1, 0), QualityScore: 80},
		{Number: 2, Title: "Issue 2", URL: "url2", CreatedAt: now.AddDate(0, -1, 0), QualityScore: 85},
	}
	if err := gfiRepo.UpsertIssues(ctx, repoID, initialIssues); err != nil {
		t.Fatalf("initial UpsertIssues failed: %v", err)
	}

	items, err := gfiRepo.ListByRepoID(ctx, repoID, 10, false)
	if err != nil || len(items) != 2 {
		t.Fatalf("expected 2 open issues, got %d (err: %v)", len(items), err)
	}

	// Next sync: issue #1 was closed on GitHub, only #2 remains
	nextIssues := []github.GoodFirstIssue{
		{Number: 2, Title: "Issue 2", URL: "url2", CreatedAt: now.AddDate(0, -1, 0), QualityScore: 85},
	}
	if err := gfiRepo.UpsertIssues(ctx, repoID, nextIssues); err != nil {
		t.Fatalf("second UpsertIssues failed: %v", err)
	}

	items, err = gfiRepo.ListByRepoID(ctx, repoID, 10, false)
	if err != nil || len(items) != 1 {
		t.Fatalf("expected 1 open issue after closing #1, got %d", len(items))
	}
	if items[0].IssueNumber != 2 {
		t.Fatalf("expected remaining issue to be #2, got #%d", items[0].IssueNumber)
	}

	// Verify #1 in DB has is_open = 0
	var isOpen int
	err = database.GetContext(ctx, &isOpen, `SELECT is_open FROM repo_good_first_issues WHERE repository_id = ? AND issue_number = 1`, repoID)
	if err != nil || isOpen != 0 {
		t.Fatalf("expected is_open = 0 for issue #1, got %d (err: %v)", isOpen, err)
	}

	// Final sync: all issues closed (empty list returned by GitHub)
	if err := gfiRepo.UpsertIssues(ctx, repoID, []github.GoodFirstIssue{}); err != nil {
		t.Fatalf("empty UpsertIssues failed: %v", err)
	}

	items, err = gfiRepo.ListByRepoID(ctx, repoID, 10, false)
	if err != nil || len(items) != 0 {
		t.Fatalf("expected 0 open issues after closing all, got %d", len(items))
	}

	err = database.GetContext(ctx, &isOpen, `SELECT is_open FROM repo_good_first_issues WHERE repository_id = ? AND issue_number = 2`, repoID)
	if err != nil || isOpen != 0 {
		t.Fatalf("expected is_open = 0 for issue #2, got %d (err: %v)", isOpen, err)
	}
}
