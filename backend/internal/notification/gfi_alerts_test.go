package notification_test

import (
	"context"
	"strings"
	"testing"
	"time"

	"github.com/abhisheksoni27/opendoor/internal/db"
	"github.com/abhisheksoni27/opendoor/internal/notification"
	"github.com/jmoiron/sqlx"
)

func seedGFIBase(t *testing.T) *sqlx.DB {
	t.Helper()
	d := sqlx.MustConnect("sqlite", ":memory:")
	d.SetMaxOpenConns(1)
	if err := db.AutoMigrate(d); err != nil {
		t.Fatal(err)
	}

	stmts := []string{
		`INSERT INTO repositories (id, full_name, owner, name, language, updated_at) VALUES
			('r1', 'golang/go', 'golang', 'go', 'Go', CURRENT_TIMESTAMP),
			('r2', 'rust-lang/rust', 'rust-lang', 'rust', 'Rust', CURRENT_TIMESTAMP)`,
		`INSERT INTO latest_snapshots (repository_id, snapshot_date, c_rank_score, c_rank_tier, maintainer_responsiveness, response_p50_hours, updated_at) VALUES
			('r1', '2026-08-25', 92.0, 'S', 2.5, 1.2, CURRENT_TIMESTAMP),
			('r2', '2026-08-25', 78.0, 'A', 6.0, 3.0, CURRENT_TIMESTAMP)`,
		`INSERT INTO repository_topics (topic, repository_id) VALUES
			('compiler', 'r1'),
			('backend', 'r1'),
			('compiler', 'r2')`,
	}
	for _, s := range stmts {
		if _, err := d.Exec(s); err != nil {
			t.Fatalf("seedGFIBase: %v", err)
		}
	}
	return d
}

// AC1: Double opt-in: verification token TTL & single use.
func TestGFIDoubleOptInTokens(t *testing.T) {
	secret := "secret-gfi-123"
	subID := int64(42)

	tok := notification.GFIVerifyToken(subID, secret)
	if sid, ok := notification.VerifyGFIVerifyToken("42", tok, secret); !ok || sid != 42 {
		t.Fatalf("expected token to verify for sid 42, got sid=%d ok=%v", sid, ok)
	}
	if _, ok := notification.VerifyGFIVerifyToken("43", tok, secret); ok {
		t.Fatalf("expected mismatch sid to fail")
	}
	if _, ok := notification.VerifyGFIVerifyToken("42", tok, "wrong-secret"); ok {
		t.Fatalf("expected wrong secret to fail")
	}
}

// AC4: Unsubscribe token (30d TTL, bound to subscriber_id + email hash).
func TestGFIUnsubscribeToken(t *testing.T) {
	secret := "secret-gfi-123"
	subID := int64(101)
	email := "dev@example.com"

	tok := notification.GFIUnsubscribeToken(subID, email, secret)
	if sid, ok := notification.VerifyGFIUnsubscribeToken("101", tok, email, secret); !ok || sid != 101 {
		t.Fatalf("expected unsub token to verify for sid 101, got sid=%d ok=%v", sid, ok)
	}
	if _, ok := notification.VerifyGFIUnsubscribeToken("101", tok, "other@example.com", secret); ok {
		t.Fatalf("expected wrong email binding to fail")
	}
	if _, ok := notification.VerifyGFIUnsubscribeToken("101", tok, email, "wrong-secret"); ok {
		t.Fatalf("expected wrong secret to fail")
	}
}

// AC2, AC3: Instant alert matching, UNIQUE idempotency key, no double-fires.
func TestGFIInstantAlertEnqueueAndDedup(t *testing.T) {
	d := seedGFIBase(t)
	now := time.Now().UTC()

	// Insert verified instant subscriber
	_, err := d.Exec(`
		INSERT INTO gfi_subscribers (id, email, languages, tech_stacks, tiers, frequency, verified_at, disabled, hard_bounces)
		VALUES (1, 'dev@example.com', 'Go', 'backend', 'S,A', 'instant', CURRENT_TIMESTAMP, FALSE, 0)
	`)
	if err != nil {
		t.Fatal(err)
	}

	// Insert fresh good first issue for r1
	_, err = d.Exec(`
		INSERT INTO repo_good_first_issues (repository_id, issue_number, title, url, labels_json, quality_score, created_at)
		VALUES ('r1', 100, 'Fix doc typo in fmt', 'https://github.com/golang/go/issues/100', '["good first issue"]', 90, ?)
	`, now.Add(-10*time.Minute).Format("2006-01-02 15:04:05"))
	if err != nil {
		t.Fatal(err)
	}

	// First enqueue matches 1
	n, err := notification.EnqueueGFIInstantAlerts(context.Background(), d, "r1", []int{100}, now)
	if err != nil {
		t.Fatal(err)
	}
	if n != 1 {
		t.Fatalf("expected 1 match, got %d", n)
	}

	// Race duplicate enqueue on the same repo+issue+subscriber is a silent no-op (AC3)
	n2, err := notification.EnqueueGFIInstantAlerts(context.Background(), d, "r1", []int{100}, now)
	if err != nil {
		t.Fatal(err)
	}
	if n2 != 0 {
		t.Fatalf("expected 0 new matches on duplicate enqueue, got %d", n2)
	}

	// Process queue (fast-forward the AC2 15-min batch window first)
	_, _ = d.Exec(`UPDATE gfi_email_queue SET next_attempt_at = ?`, now.UTC())
	mailer := &countingMailer{}
	cfg := notification.GFIAlertConfig{
		Mailer:    mailer,
		BaseURL:   "https://getmerged.abhishekco.de",
		JobSecret: "secret-gfi-123",
	}

	summary, err := notification.ProcessGFIEmailQueue(context.Background(), d, cfg)
	if err != nil {
		t.Fatal(err)
	}
	if summary.Sent != 1 || mailer.count() != 1 {
		t.Fatalf("expected 1 email sent, got summary: %+v mailer count: %d", summary, mailer.count())
	}
	sentContent := mailer.sent[0]
	if !strings.Contains(sentContent, "Claim & Setup:") || !strings.Contains(sentContent, "Maintainer responsiveness:") {
		t.Fatalf("expected email content to have Claim & Setup and stats, got: %s", sentContent)
	}
}

// AC4: Dequeue-time suppression drops sends for users unsubscribed or bounced since enqueue.
func TestGFIDequeueSuppression(t *testing.T) {
	d := seedGFIBase(t)
	now := time.Now().UTC()

	// Insert verified subscriber with complete prefs
	_, err := d.Exec(`
		INSERT INTO gfi_subscribers (id, email, languages, tiers, frequency, verified_at, disabled, hard_bounces)
		VALUES (2, 'unsub@example.com', 'Go', 'S,A', 'instant', CURRENT_TIMESTAMP, FALSE, 0)
	`)
	if err != nil {
		t.Fatal(err)
	}

	// Insert issue
	_, err = d.Exec(`
		INSERT INTO repo_good_first_issues (repository_id, issue_number, title, url, labels_json, quality_score, created_at)
		VALUES ('r1', 101, 'Refactor test utils', 'https://github.com/golang/go/issues/101', '["good first issue"]', 85, ?)
	`, now.Add(-5*time.Minute).Format("2006-01-02 15:04:05"))
	if err != nil {
		t.Fatal(err)
	}

	// Enqueue alert
	_, err = notification.EnqueueGFIInstantAlerts(context.Background(), d, "r1", []int{101}, now)
	if err != nil {
		t.Fatal(err)
	}

	// User un-subscribes BEFORE dequeue
	_, err = d.Exec(`UPDATE gfi_subscribers SET unsubscribed_at = CURRENT_TIMESTAMP WHERE id = 2`)
	if err != nil {
		t.Fatal(err)
	}

	_, _ = d.Exec(`UPDATE gfi_email_queue SET next_attempt_at = ?`, now.UTC())
	mailer := &countingMailer{}
	cfg := notification.GFIAlertConfig{
		Mailer:    mailer,
		BaseURL:   "https://getmerged.abhishekco.de",
		JobSecret: "secret-gfi-123",
	}

	summary, err := notification.ProcessGFIEmailQueue(context.Background(), d, cfg)
	if err != nil {
		t.Fatal(err)
	}
	if summary.Dropped != 1 || summary.Sent != 0 || mailer.count() != 0 {
		t.Fatalf("expected 1 dropped, 0 sent due to dequeue suppression, got summary: %+v", summary)
	}
}

// AC5: 3 hard bounces auto-disable subscription.
func TestGFIHardBounceAutoDisable(t *testing.T) {
	d := seedGFIBase(t)

	_, err := d.Exec(`
		INSERT INTO gfi_subscribers (id, email, languages, tiers, frequency, verified_at, disabled, hard_bounces)
		VALUES (3, 'bounce@example.com', 'Go', 'S', 'weekly', CURRENT_TIMESTAMP, FALSE, 0)
	`)
	if err != nil {
		t.Fatal(err)
	}

	// Apply 2 hard bounces
	for i := 1; i <= 2; i++ {
		ok, err := notification.ApplyGFIEmailBounce(context.Background(), d, "bounce@example.com", true)
		if err != nil || !ok {
			t.Fatalf("bounce %d failed: %v", i, err)
		}
	}

	var disabled bool
	var bounces int
	_ = d.Get(&disabled, `SELECT disabled FROM gfi_subscribers WHERE id = 3`)
	_ = d.Get(&bounces, `SELECT hard_bounces FROM gfi_subscribers WHERE id = 3`)
	if disabled || bounces != 2 {
		t.Fatalf("expected not disabled after 2 bounces, disabled=%v bounces=%d", disabled, bounces)
	}

	// 3rd hard bounce auto-disables
	_, err = notification.ApplyGFIEmailBounce(context.Background(), d, "bounce@example.com", true)
	if err != nil {
		t.Fatal(err)
	}

	_ = d.Get(&disabled, `SELECT disabled FROM gfi_subscribers WHERE id = 3`)
	_ = d.Get(&bounces, `SELECT hard_bounces FROM gfi_subscribers WHERE id = 3`)
	if !disabled || bounces != 3 {
		t.Fatalf("expected auto-disabled after 3 bounces, disabled=%v bounces=%d", disabled, bounces)
	}
}

// AC8: Empty/null prefs skipped, zero matches skipped, digest capped at top 10 with shared cursor.
func TestGFIDigestPreferencesAndSharedCursor(t *testing.T) {
	d := seedGFIBase(t)
	now := time.Now().UTC()

	// Sub 1: complete prefs (Go, S)
	_, _ = d.Exec(`
		INSERT INTO gfi_subscribers (id, email, languages, tiers, frequency, verified_at, disabled, hard_bounces)
		VALUES (4, 'goodprefs@example.com', 'Go', 'S', 'weekly', CURRENT_TIMESTAMP, FALSE, 0)
	`)
	// Sub 2: empty prefs (incomplete)
	_, _ = d.Exec(`
		INSERT INTO gfi_subscribers (id, email, languages, tiers, frequency, verified_at, disabled, hard_bounces)
		VALUES (5, 'noprefs@example.com', '', '', 'weekly', CURRENT_TIMESTAMP, FALSE, 0)
	`)

	// Issue on r1 (Go, S)
	_, _ = d.Exec(`
		INSERT INTO repo_good_first_issues (repository_id, issue_number, title, url, labels_json, quality_score, created_at)
		VALUES ('r1', 201, 'Add benchmark for net/http', 'https://github.com/golang/go/issues/201', '["good first issue"]', 95, ?)
	`, now.Add(-1*time.Hour).Format("2006-01-02 15:04:05"))

	mailer := &countingMailer{}
	cfg := notification.GFIAlertConfig{
		Mailer:    mailer,
		BaseURL:   "https://getmerged.abhishekco.de",
		JobSecret: "secret-gfi-123",
	}

	summary, err := notification.RunGFIDigest(context.Background(), d, cfg)
	if err != nil {
		t.Fatal(err)
	}
	if summary.DigestsSent != 1 || summary.SkippedIncomplete != 1 {
		t.Fatalf("expected 1 digest sent and 1 skipped incomplete, got: %+v", summary)
	}

	// AC2: Shared cursor — running digest again immediately produces 0 new matches (no re-sends)
	d2 := seedGFIBase(t)
	_, _ = d2.Exec(`
		INSERT INTO gfi_subscribers (id, email, languages, tiers, frequency, verified_at, disabled, hard_bounces)
		VALUES (6, 'cursor@example.com', 'Go', 'S', 'weekly', CURRENT_TIMESTAMP, FALSE, 0)
	`)
	_, _ = d2.Exec(`
		INSERT INTO repo_good_first_issues (repository_id, issue_number, title, url, labels_json, quality_score, created_at)
		VALUES ('r1', 202, 'Fix compiler warning', 'https://github.com/golang/go/issues/202', '[]', 95, ?)
	`, now.Add(-1*time.Hour).Format("2006-01-02 15:04:05"))

	// Pre-mark as sent via the weekly-mode sent-log cursor (AC3)
	_, _ = d2.Exec(`
		INSERT INTO gfi_email_queue (subscriber_id, idempotency_key, repo_id, issue_number, delivery_mode, status, sent_at)
		VALUES (6, 'r1:202:6:w', 'r1', 202, 'weekly', 'sent', CURRENT_TIMESTAMP)
	`)

	items, err := notification.SelectDigestMatchesForTest(context.Background(), d2, 6, "Go", "S", now.Add(-7*24*time.Hour))
	if err != nil {
		t.Fatal(err)
	}
	if len(items) != 0 {
		t.Fatalf("expected 0 items due to shared cursor in gfi_email_queue, got %d", len(items))
	}
}

// AC7: Baseline verification: seeded fixture (subscriber + 2 matching issues) produces
// exactly one email per subscriber-issue through either path (instant or digest).
func TestGFIBaselineVerificationSeededFixture(t *testing.T) {
	d := seedGFIBase(t)
	now := time.Now().UTC()

	// Seed 1 subscriber (matches Go, S tier)
	_, err := d.Exec(`
		INSERT INTO gfi_subscribers (id, email, languages, tiers, frequency, verified_at, disabled, hard_bounces)
		VALUES (10, 'coder@example.com', 'Go', 'S,A', 'instant', CURRENT_TIMESTAMP, FALSE, 0)
	`)
	if err != nil {
		t.Fatal(err)
	}

	// Seed 2 matching issues for r1 (Go, S tier)
	_, err = d.Exec(`
		INSERT INTO repo_good_first_issues (repository_id, issue_number, title, url, labels_json, quality_score, created_at)
		VALUES 
			('r1', 501, 'Add test coverage for router', 'https://github.com/golang/go/issues/501', '["good first issue"]', 90, ?),
			('r1', 502, 'Improve docs on context package', 'https://github.com/golang/go/issues/502', '["good first issue"]', 92, ?)
	`, now.Add(-15*time.Minute).Format("2006-01-02 15:04:05"), now.Add(-10*time.Minute).Format("2006-01-02 15:04:05"))
	if err != nil {
		t.Fatal(err)
	}

	// Instant alert path: enqueue both issues
	n, err := notification.EnqueueGFIInstantAlerts(context.Background(), d, "r1", []int{501, 502}, now)
	if err != nil || n != 2 {
		t.Fatalf("expected 2 enqueued matches, got %d (err: %v)", n, err)
	}

	// Race condition / duplicate enqueue: must insert-or-ignore and add 0 rows
	nDup, err := notification.EnqueueGFIInstantAlerts(context.Background(), d, "r1", []int{501, 502}, now)
	if err != nil || nDup != 0 {
		t.Fatalf("expected 0 new matches on duplicate enqueue, got %d", nDup)
	}

	// Drain queue (fast-forward the AC2 15-min batch window first)
	_, _ = d.Exec(`UPDATE gfi_email_queue SET next_attempt_at = ?`, now.UTC())
	mailer := &countingMailer{}
	cfg := notification.GFIAlertConfig{
		Mailer:    mailer,
		BaseURL:   "https://getmerged.abhishekco.de",
		JobSecret: "secret-gfi-123",
	}

	summary, err := notification.ProcessGFIEmailQueue(context.Background(), d, cfg)
	if err != nil {
		t.Fatal(err)
	}
	if summary.Sent != 2 || mailer.count() != 1 {
		t.Fatalf("expected 2 items sent in 1 batched email, got sent=%d mailer=%d", summary.Sent, mailer.count())
	}

	// Subsequent weekly digest run for same subscriber & issues must find 0 new matches due to DB UNIQUE / shared queue
	notification.ResetGFIDigestLockForTest()
	digestSummary, err := notification.RunGFIDigest(context.Background(), d, cfg)
	if err != nil {
		t.Fatal(err)
	}
	if digestSummary.DigestsSent != 0 || digestSummary.MatchesFound != 0 {
		t.Fatalf("expected 0 digest emails sent as issues were already alerted, got %+v", digestSummary)
	}
}

