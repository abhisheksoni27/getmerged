package hacktoberfest

import (
	"context"
	"testing"
	"time"

	"github.com/jmoiron/sqlx"
	_ "modernc.org/sqlite"
)

func TestIsQualifyingMerge(t *testing.T) {
	year := 2026
	oct15 := time.Date(2026, time.October, 15, 12, 0, 0, 0, time.UTC)
	nov2 := time.Date(2026, time.November, 2, 0, 0, 0, 0, time.UTC)
	sep30 := time.Date(2026, time.September, 30, 23, 59, 59, 0, time.UTC)

	tests := []struct {
		name        string
		candidate   MergeCandidate
		linkedLogin string
		want        bool
	}{
		{
			name: "valid qualifying merge",
			candidate: MergeCandidate{
				PRID:         "facebook/react#123",
				RepoFullName: "facebook/react",
				Number:       123,
				AuthorLogin:  "octocat",
				MergedAt:     oct15,
				Draft:        false,
				Labels:       []string{"enhancement"},
			},
			linkedLogin: "octocat",
			want:        true,
		},
		{
			name: "case insensitive author match",
			candidate: MergeCandidate{
				PRID:         "facebook/react#123",
				RepoFullName: "facebook/react",
				Number:       123,
				AuthorLogin:  "OctoCat",
				MergedAt:     oct15,
				Draft:        false,
			},
			linkedLogin: "octocat",
			want:        true,
		},
		{
			name: "disqualified by invalid label",
			candidate: MergeCandidate{
				PRID:         "facebook/react#123",
				RepoFullName: "facebook/react",
				Number:       123,
				AuthorLogin:  "octocat",
				MergedAt:     oct15,
				Draft:        false,
				Labels:       []string{"invalid"},
			},
			linkedLogin: "octocat",
			want:        false,
		},
		{
			name: "disqualified by spam label",
			candidate: MergeCandidate{
				PRID:         "facebook/react#123",
				RepoFullName: "facebook/react",
				Number:       123,
				AuthorLogin:  "octocat",
				MergedAt:     oct15,
				Draft:        false,
				Labels:       []string{"Spam"},
			},
			linkedLogin: "octocat",
			want:        false,
		},
		{
			name: "draft PR disqualified",
			candidate: MergeCandidate{
				PRID:         "facebook/react#123",
				RepoFullName: "facebook/react",
				Number:       123,
				AuthorLogin:  "octocat",
				MergedAt:     oct15,
				Draft:        true,
			},
			linkedLogin: "octocat",
			want:        false,
		},
		{
			name: "before October window",
			candidate: MergeCandidate{
				PRID:         "facebook/react#123",
				RepoFullName: "facebook/react",
				Number:       123,
				AuthorLogin:  "octocat",
				MergedAt:     sep30,
			},
			linkedLogin: "octocat",
			want:        false,
		},
		{
			name: "after October window",
			candidate: MergeCandidate{
				PRID:         "facebook/react#123",
				RepoFullName: "facebook/react",
				Number:       123,
				AuthorLogin:  "octocat",
				MergedAt:     nov2,
			},
			linkedLogin: "octocat",
			want:        false,
		},
		{
			name: "different author",
			candidate: MergeCandidate{
				PRID:         "facebook/react#123",
				RepoFullName: "facebook/react",
				Number:       123,
				AuthorLogin:  "otheruser",
				MergedAt:     oct15,
			},
			linkedLogin: "octocat",
			want:        false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := IsQualifyingMerge(tt.candidate, tt.linkedLogin, year)
			if got != tt.want {
				t.Errorf("IsQualifyingMerge() = %v, want %v", got, tt.want)
			}
		})
	}
}

func setupTestDB(t *testing.T) *sqlx.DB {
	db, err := sqlx.Open("sqlite", ":memory:")
	if err != nil {
		t.Fatalf("failed to open test sqlite db: %v", err)
	}

	schema := `
	CREATE TABLE hacktoberfest_merges (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		user_id INTEGER NOT NULL,
		year INTEGER NOT NULL,
		pr_id VARCHAR(255) NOT NULL,
		repository_id VARCHAR(255) NOT NULL DEFAULT '',
		pr_number INTEGER NOT NULL DEFAULT 0,
		title TEXT,
		html_url TEXT,
		merged_at DATETIME NULL,
		created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
		UNIQUE(user_id, year, pr_id)
	);
	CREATE TABLE hacktoberfest_progress (
		user_id INTEGER NOT NULL,
		year INTEGER NOT NULL,
		card_issued BOOLEAN NOT NULL DEFAULT FALSE,
		card_id VARCHAR(64) NOT NULL DEFAULT '',
		total_qualifying INTEGER NOT NULL DEFAULT -1,
		last_reconciled_at DATETIME NULL,
		last_nudge_at DATETIME NULL,
		backoff_until DATETIME NULL,
		backoff_attempts INTEGER NOT NULL DEFAULT 0,
		updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
		PRIMARY KEY(user_id, year)
	);
	CREATE TABLE share_cards (
		id VARCHAR(64) PRIMARY KEY,
		user_id INTEGER NOT NULL,
		repo_full_name VARCHAR(255) NOT NULL,
		pr_title TEXT,
		summary TEXT,
		overall_score REAL NOT NULL DEFAULT 0,
		ready_to_merge BOOLEAN NOT NULL DEFAULT FALSE,
		ref_token VARCHAR(255) NOT NULL DEFAULT '',
		consent_given BOOLEAN NOT NULL DEFAULT TRUE,
		created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
		expires_at DATETIME NOT NULL
	);
	`
	if _, err := db.Exec(schema); err != nil {
		t.Fatalf("failed to initialize schema: %v", err)
	}
	return db
}

func TestReconcileMergesAndCardCAS(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()
	store := NewStore(db)

	ctx := context.Background()
	userID := int64(42)
	year := 2026
	oct10 := time.Date(2026, time.October, 10, 12, 0, 0, 0, time.UTC)

	candidates := []MergeCandidate{
		{PRID: "org/repo#1", RepoFullName: "org/repo", Number: 1, AuthorLogin: "octocat", MergedAt: oct10},
		{PRID: "org/repo#2", RepoFullName: "org/repo", Number: 2, AuthorLogin: "octocat", MergedAt: oct10},
		{PRID: "org/repo#3", RepoFullName: "org/repo", Number: 3, AuthorLogin: "octocat", MergedAt: oct10},
	}

	card := CardParams{
		ID:        "card-12345",
		RefToken:  "cd.test.token",
		Summary:   "4 of 4 merged",
		ExpiresAt: time.Now().Add(90 * 24 * time.Hour),
	}

	// 3 merges: total = 3, card not issued yet
	outcome, err := store.ReconcileMerges(ctx, userID, year, candidates, "octocat", card)
	if err != nil {
		t.Fatalf("reconcile 3 merges failed: %v", err)
	}
	if outcome.Total != 3 || outcome.IssuedCard {
		t.Fatalf("unexpected outcome for 3 merges: %+v", outcome)
	}

	// Add 4th and 5th merges (AC4, AC8)
	candidates = append(candidates,
		MergeCandidate{PRID: "org/repo#4", RepoFullName: "org/repo", Number: 4, AuthorLogin: "octocat", MergedAt: oct10},
		MergeCandidate{PRID: "org/repo#5", RepoFullName: "org/repo", Number: 5, AuthorLogin: "octocat", MergedAt: oct10},
	)

	outcome2, err := store.ReconcileMerges(ctx, userID, year, candidates, "octocat", card)
	if err != nil {
		t.Fatalf("reconcile 5 merges failed: %v", err)
	}
	if outcome2.Total != 5 {
		t.Fatalf("expected total 5, got %d", outcome2.Total)
	}
	if !outcome2.IssuedCard {
		t.Fatalf("expected card to be issued on reaching >= 4 merges")
	}
	if outcome2.CardID != "card-12345" {
		t.Fatalf("expected card ID card-12345, got %s", outcome2.CardID)
	}

	// Reconcile again: card should not be re-issued (idempotent CAS, AC4)
	newCard := CardParams{
		ID:        "card-duplicate",
		RefToken:  "cd.test.token2",
		Summary:   "4 of 4 merged",
		ExpiresAt: time.Now().Add(90 * 24 * time.Hour),
	}
	outcome3, err := store.ReconcileMerges(ctx, userID, year, candidates, "octocat", newCard)
	if err != nil {
		t.Fatalf("reconcile duplicate pass failed: %v", err)
	}
	if outcome3.IssuedCard {
		t.Fatalf("card should not be reissued once card_issued is true")
	}
	if outcome3.CardID != "card-12345" {
		t.Fatalf("expected original card ID retained, got %s", outcome3.CardID)
	}

	// Check stored merges list: all 5 preserved (AC8)
	stored, err := store.ListStoredMerges(ctx, userID, year)
	if err != nil {
		t.Fatalf("ListStoredMerges failed: %v", err)
	}
	if len(stored) != 5 {
		t.Fatalf("expected 5 stored merges, got %d", len(stored))
	}
}
