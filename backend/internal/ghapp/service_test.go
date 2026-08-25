package ghapp

import (
	"context"
	"encoding/json"
	"testing"

	"github.com/abhisheksoni27/opendoor/internal/config"
	"github.com/jmoiron/sqlx"
	_ "modernc.org/sqlite"
)

func testService(t *testing.T) *Service {
	t.Helper()
	db, err := sqlx.Open("sqlite", ":memory:")
	if err != nil {
		t.Fatalf("open sqlite: %v", err)
	}
	t.Cleanup(func() { _ = db.Close() })
	stmts := []string{
		`CREATE TABLE ghapp_installations (installation_id BIGINT PRIMARY KEY, account_login VARCHAR(255) NOT NULL DEFAULT '', account_id BIGINT NOT NULL DEFAULT 0, installer_login VARCHAR(255) NOT NULL DEFAULT '', installer_id BIGINT NOT NULL DEFAULT 0, has_issues_write BOOLEAN NOT NULL DEFAULT FALSE, org_verified_at DATETIME NULL, installed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
		`CREATE TABLE ghapp_welcomes (id INTEGER PRIMARY KEY AUTOINCREMENT, installation_id BIGINT NOT NULL, repo_id BIGINT NOT NULL, contributor_login VARCHAR(255) NOT NULL, pr_number INTEGER NOT NULL DEFAULT 0, comment_id BIGINT NOT NULL DEFAULT 0, status VARCHAR(32) NOT NULL DEFAULT 'pending', created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE(repo_id, pr_number))`,
	}
	for _, s := range stmts {
		if _, err := db.Exec(s); err != nil {
			t.Fatalf("schema: %v", err)
		}
	}
	return NewService(db, &config.Config{}, nil, nil, nil, nil)
}

// AC1: only the qualifying author_association values trigger a welcome job.
func TestHandleEventAssociationGate(t *testing.T) {
	s := testService(t)
	if _, err := s.db.Exec(`INSERT INTO ghapp_installations (installation_id, installer_login, has_issues_write) VALUES (1, 'alice', 1)`); err != nil {
		t.Fatal(err)
	}

	prPayload := func(assoc string) []byte {
		return []byte(`{"action":"opened","installation":{"id":1},"sender":{"login":"newbie","type":"User"},"pull_request":{"number":7,"state":"open","author_association":"` + assoc + `","user":{"login":"newbie","type":"User"}},"repository":{"id":42,"name":"repo","full_name":"o/r","private":false,"owner":{"login":"o"}}}`)
	}

	cases := map[string]bool{
		"FIRST_TIME_CONTRIBUTOR": true,
		"CONTRIBUTOR":            false,
		"NONE":                   false,
		"OWNER":                  false,
		"":                       false,
	}
	for assoc, want := range cases {
		var p webhookPayload
		if err := json.Unmarshal(prPayload(assoc), &p); err != nil {
			t.Fatal(err)
		}
		if got := s.firstTimerJob(&p, p.PullRequest, "FIRST_TIME_CONTRIBUTOR") != nil; got != want {
			t.Errorf("assoc %q: enqueued=%v want %v", assoc, got, want)
		}
	}
}

// AC1: issues.opened with FIRST_TIME_ISSUE_CONTRIBUTOR triggers; bots skip.
func TestHandleEventIssuesOpened(t *testing.T) {
	s := testService(t)
	if _, err := s.db.Exec(`INSERT INTO ghapp_installations (installation_id, installer_login, has_issues_write) VALUES (1, 'alice', 1)`); err != nil {
		t.Fatal(err)
	}
	payload := func(userType string) []byte {
		return []byte(`{"action":"opened","installation":{"id":1},"sender":{"login":"newbie","type":"` + userType + `"},"issue":{"number":3,"state":"open","author_association":"FIRST_TIME_ISSUE_CONTRIBUTOR","user":{"login":"newbie","type":"` + userType + `"}},"repository":{"id":42,"name":"repo","full_name":"o/r","private":false,"owner":{"login":"o"}}}`)
	}

	var p webhookPayload
	if err := json.Unmarshal(payload("User"), &p); err != nil {
		t.Fatal(err)
	}
	if s.firstTimerJob(&p, p.Issue, "FIRST_TIME_ISSUE_CONTRIBUTOR") == nil {
		t.Fatal("expected issue welcome job")
	}

	if err := json.Unmarshal(payload("Bot"), &p); err != nil {
		t.Fatal(err)
	}
	if s.firstTimerJob(&p, p.Issue, "FIRST_TIME_ISSUE_CONTRIBUTOR") != nil {
		t.Error("bot author must be skipped")
	}
}

// AC2: pending rows retry on redelivery; posted rows are exactly-once.
func TestClaimWelcomeIdempotency(t *testing.T) {
	s := testService(t)
	j := &commentJob{installationID: 1, repoID: 42, owner: "o", name: "r", number: 9, author: "newbie"}

	if !s.claimWelcome(j) {
		t.Fatal("first claim must succeed (pending)")
	}
	var status string
	if err := s.db.Get(&status, `SELECT status FROM ghapp_welcomes WHERE repo_id=42 AND pr_number=9`); err != nil || status != "pending" {
		t.Fatalf("status=%q err=%v", status, err)
	}

	// Redelivery while still pending (crash between upsert and POST): retry.
	if !s.claimWelcome(j) {
		t.Error("pending row must retry on redelivery")
	}

	s.finishClaim(j, 555, nil)
	if err := s.db.Get(&status, `SELECT status FROM ghapp_welcomes WHERE repo_id=42 AND pr_number=9`); err != nil || status != "posted" {
		t.Fatalf("after post status=%q err=%v", status, err)
	}
	if s.claimWelcome(j) {
		t.Error("posted row must never repost")
	}

	// Persistent failure dead-letters as failed; redelivery retries.
	j2 := &commentJob{installationID: 1, repoID: 42, owner: "o", name: "r", number: 10, author: "other"}
	if !s.claimWelcome(j2) {
		t.Fatal("second claim must succeed")
	}
	s.finishClaim(j2, 0, context.DeadlineExceeded)
	if err := s.db.Get(&status, `SELECT status FROM ghapp_welcomes WHERE repo_id=42 AND pr_number=10`); err != nil || status != "failed" {
		t.Fatalf("after failure status=%q err=%v", status, err)
	}
	if !s.claimWelcome(j2) {
		t.Error("failed row must retry on redelivery")
	}
}

// AC6: comment contains tier, top-3 checklist items, UTM-tagged link.
func TestBuildCommentContents(t *testing.T) {
	s := testService(t)
	body := s.buildComment(context.Background(), &commentJob{
		installationID: 1, repoID: 42, owner: "o", name: "r", number: 5, author: "newbie",
	})
	for _, want := range []string{
		"C-Rank Tier",
		"- [ ] ",
		"utm_source=github_app",
		"utm_medium=welcome_comment",
	} {
		if !contains(body, want) {
			t.Errorf("comment missing %q\nbody:\n%s", want, body)
		}
	}
	checklist := countCheckboxes(body)
	if checklist < 3 || checklist > 3 {
		t.Errorf("expected top-3 checklist items, got %d", checklist)
	}
}

func contains(haystack, needle string) bool {
	return len(haystack) >= len(needle) && (func() bool {
		for i := 0; i+len(needle) <= len(haystack); i++ {
			if haystack[i:i+len(needle)] == needle {
				return true
			}
		}
		return false
	})()
}

func countCheckboxes(body string) int {
	n := 0
	for i := 0; i+6 <= len(body); i++ {
		if body[i:i+6] == "- [ ] " {
			n++
		}
	}
	return n
}
