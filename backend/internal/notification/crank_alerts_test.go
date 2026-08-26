package notification_test

import (
	"context"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/abhisheksoni27/opendoor/internal/db"
	"github.com/abhisheksoni27/opendoor/internal/notification"
	"github.com/jmoiron/sqlx"
)

// countingMailer is a fake mailer safe for concurrent use.
type countingMailer struct {
	mu     sync.Mutex
	sent   []string
	fail   map[string]error
	bounce map[string]bool
}

func (m *countingMailer) Send(_ context.Context, to, subject, textBody, _ string) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if m.bounce[to] {
		return notification.NewHardBounceError("550 5.1.1 mailbox unavailable")
	}
	if err, ok := m.fail[to]; ok {
		return err
	}
	m.sent = append(m.sent, to+"|"+subject+"|"+textBody)
	return nil
}

func (m *countingMailer) count() int {
	m.mu.Lock()
	defer m.mu.Unlock()
	return len(m.sent)
}

func seedCrankBase(t *testing.T) *sqlx.DB {
	t.Helper()
	d := sqlx.MustConnect("sqlite", ":memory:")
	d.SetMaxOpenConns(1)
	if err := db.AutoMigrate(d); err != nil {
		t.Fatal(err)
	}
	stmts := []string{
		`INSERT INTO users (id, username, email, created_at, updated_at) VALUES
			(1,'alice','alice@x.io',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
			(2,'bob','bob@x.io',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
			(3,'carol','carol@x.io',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
			(4,'dave','dave@x.io',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
			(5,'erin','bad-email',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)`,
		`INSERT INTO repositories (id, full_name, owner, name, language, updated_at) VALUES
			('r1','a/tier','a','tier','Go',CURRENT_TIMESTAMP),
			('r2','a/drop','a','drop','Rust',CURRENT_TIMESTAMP),
			('r3','a/bounce','a','bounce','Go',CURRENT_TIMESTAMP),
			('r4','a/race','a','race','Go',CURRENT_TIMESTAMP)`,
		`INSERT INTO user_watchlists (user_id, repo_id, notify_rank_change, created_at) VALUES
			(1,'r1',TRUE,CURRENT_TIMESTAMP),
			(2,'r2',TRUE,CURRENT_TIMESTAMP),
			(3,'r2',TRUE,CURRENT_TIMESTAMP),
			(4,'r3',TRUE,CURRENT_TIMESTAMP),
			(5,'r4',TRUE,CURRENT_TIMESTAMP)`,
	}
	for _, s := range stmts {
		if _, err := d.Exec(s); err != nil {
			t.Fatalf("seed: %v", err)
		}
	}
	return d
}

func addSnap(t *testing.T, d *sqlx.DB, id, repoID string, daysAgo int, score float64, tier string) {
	t.Helper()
	date := time.Now().UTC().AddDate(0, 0, -daysAgo).Format("2006-01-02")
	if _, err := d.Exec(
		`INSERT INTO daily_snapshots (id, repository_id, snapshot_date, c_rank_score, c_rank_tier, created_at) VALUES (?,?,?,?,?,CURRENT_TIMESTAMP)`,
		id, repoID, date, score, tier); err != nil {
		t.Fatalf("snapshot %s: %v", id, err)
	}
}

func cfgWith(mailer *countingMailer, delta float64) notification.CRankAlertConfig {
	return notification.CRankAlertConfig{
		Mailer:               mailer,
		BaseURL:              "http://localhost:8080",
		JobSecret:            "testsecret",
		DeltaThresholdPoints: delta,
	}
}

// AC4: Newly watched repos seed last_alerted_snapshot -> first cycle never alerts.
func TestCrankBaselineFirstSighting(t *testing.T) {
	d := seedCrankBase(t)
	addSnap(t, d, "s1", "r1", 1, 72.0, "B")

	mailer := &countingMailer{}
	s, err := notification.RunCRankChangeAlerts(context.Background(), d, cfgWith(mailer, 5))
	if err != nil {
		t.Fatal(err)
	}
	if s.Baselined != 5 || s.EmailsSent != 0 || s.AlertsFound != 0 || mailer.count() != 0 {
		t.Fatalf("baseline run must be silent: %+v emails=%v", s, mailer.sent)
	}
	var n int
	var hash string
	if err := d.Get(&n, `SELECT COUNT(1) FROM crank_alert_state`); err != nil || n != 5 {
		t.Fatalf("baseline row missing: rows=%d err=%v", n, err)
	}
	if err := d.Get(&hash, `SELECT COALESCE(rank_hash,'') FROM crank_alert_state WHERE user_id=1 AND repo_id='r1'`); err != nil || hash == "" {
		t.Fatalf("baseline hash not stored: %q err=%v", hash, err)
	}
}

// AC1: alerts on score delta >= 5 OR any tier change; single env/config knob.
func TestCrankAlertDeltaOrTierChange(t *testing.T) {
	d := seedCrankBase(t)
	addSnap(t, d, "s1", "r1", 2, 72.0, "B")

	mailer := &countingMailer{}
	cfg := cfgWith(mailer, 5)
	if _, err := notification.RunCRankChangeAlerts(context.Background(), d, cfg); err != nil {
		t.Fatal(err)
	} // baseline pass

	// Tier change (B -> C) with small delta (< 5) still alerts!
	addSnap(t, d, "s2", "r1", 1, 69.0, "C")
	s, err := notification.RunCRankChangeAlerts(context.Background(), d, cfg)
	if err != nil {
		t.Fatal(err)
	}
	if s.EmailsSent != 1 || s.AlertsFound != 1 || mailer.count() != 1 {
		t.Fatalf("tier-crossing run mismatch: %+v sent=%v", s, mailer.sent)
	}
	body := strings.SplitN(mailer.sent[0], "|", 3)[2]
	if !strings.Contains(body, "http://localhost:8080/unsubscribe?uid=1&token=") {
		t.Fatalf("email missing unsubscribe link: %q", body)
	}

	// Re-run on same snapshot: dedupe means 0 sends
	s2, _ := notification.RunCRankChangeAlerts(context.Background(), d, cfg)
	if s2.EmailsSent != 0 || s2.AlertsFound != 0 || mailer.count() != 1 {
		t.Fatalf("re-run must be deduped: %+v total=%d", s2, mailer.count())
	}
}

// AC3: Per-user cap: max 1 alert email/user/night (batch all repo shifts into one email).
func TestCrankBatchPerUser(t *testing.T) {
	d := seedCrankBase(t)
	// Add another watch for user 1 on repo r2
	d.MustExec(`INSERT INTO user_watchlists (user_id, repo_id, notify_rank_change, created_at) VALUES (1, 'r2', TRUE, CURRENT_TIMESTAMP)`)

	addSnap(t, d, "s1_r1", "r1", 2, 72.0, "B")
	addSnap(t, d, "s1_r2", "r2", 2, 80.0, "A")

	mailer := &countingMailer{}
	cfg := cfgWith(mailer, 5)
	if _, err := notification.RunCRankChangeAlerts(context.Background(), d, cfg); err != nil {
		t.Fatal(err)
	} // baseline

	// Shift both repos
	addSnap(t, d, "s2_r1", "r1", 1, 60.0, "C")
	addSnap(t, d, "s2_r2", "r2", 1, 70.0, "B")

	s, err := notification.RunCRankChangeAlerts(context.Background(), d, cfg)
	if err != nil {
		t.Fatal(err)
	}
	// Alice watched both r1 and r2; Bob & Carol watched r2
	// Alice should receive exactly 1 batched email with both repos
	var aliceEmails []string
	for _, sent := range mailer.sent {
		if strings.HasPrefix(sent, "alice@x.io|") {
			aliceEmails = append(aliceEmails, sent)
		}
	}
	if len(aliceEmails) != 1 {
		t.Fatalf("expected exactly 1 batched email for Alice, got %d", len(aliceEmails))
	}
	if !strings.Contains(aliceEmails[0], "a/tier") || !strings.Contains(aliceEmails[0], "a/drop") {
		t.Fatalf("expected batched email to contain both repos: %s", aliceEmails[0])
	}
	if s.EmailsSent != 3 { // alice (batched 2 repos), bob (1 repo), carol (1 repo)
		t.Fatalf("expected 3 emails sent, got %d", s.EmailsSent)
	}
}

// AC5: Send failure writes NO alert state — baselines still hold so the
// shift re-fires naturally on the next nightly diff (no in-night queue
// retries). Rows are closed as bookkeeping only.
func TestCrankSendFailureNoWritesRetriesNextNight(t *testing.T) {
	d := seedCrankBase(t)
	addSnap(t, d, "s1", "r2", 2, 76.0, "B")

	failing := &countingMailer{fail: map[string]error{
		"bob@x.io":   context.DeadlineExceeded,
		"carol@x.io": context.DeadlineExceeded,
	}}
	cfg := notification.CRankAlertConfig{
		Mailer:               failing,
		BaseURL:              "http://localhost:8080",
		JobSecret:            "testsecret",
		DeltaThresholdPoints: 5,
	}

	// Baseline pass
	if _, err := notification.RunCRankChangeAlerts(context.Background(), d, cfg); err != nil {
		t.Fatal(err)
	}
	var baseHash string
	if err := d.Get(&baseHash, `SELECT rank_hash FROM crank_alert_state WHERE user_id=2 AND repo_id='r2'`); err != nil || baseHash == "" {
		t.Fatalf("baseline hash missing: %q %v", baseHash, err)
	}
	addSnap(t, d, "s2", "r2", 1, 60.0, "C")

	// Night 1: send fails -> no baseline write, rows closed, nothing retrying.
	s1, err := notification.RunCRankChangeAlerts(context.Background(), d, cfg)
	if err != nil {
		t.Fatal(err)
	}
	if s1.EmailsSent != 0 || s1.EmailsFailed != 2 || s1.Retrying != 0 {
		t.Fatalf("night 1: expected 2 failed / 0 retrying, got %+v", s1)
	}
	var hash, tier string
	if err := d.Get(&hash, `SELECT rank_hash FROM crank_alert_state WHERE user_id=2 AND repo_id='r2'`); err != nil || hash != baseHash {
		t.Fatalf("send failure must not advance baseline: hash=%q want=%q err=%v", hash, baseHash, err)
	}
	if err := d.Get(&tier, `SELECT last_alerted_tier FROM crank_alert_state WHERE user_id=2 AND repo_id='r2'`); err != nil || tier != "B" {
		t.Fatalf("baseline tier changed on failure: tier=%q", tier)
	}
	var failed int
	if err := d.Get(&failed, `SELECT COUNT(1) FROM crank_outbox WHERE status='failed'`); err != nil || failed != 2 {
		t.Fatalf("expected 2 closed rows, got %d err=%v", failed, err)
	}

	// Night 2 (fresh cycle): still failing -> diff re-fires the shift
	// naturally and fails again.
	d.MustExec(`DELETE FROM crank_outbox`) // simulate prior-day rows aged out
	s2, _ := notification.RunCRankChangeAlerts(context.Background(), d, cfg)
	if s2.AlertsFound != 2 || s2.EmailsFailed != 2 || s2.EmailsSent != 0 {
		t.Fatalf("night 2 must re-fire after failure: %+v", s2)
	}

	// Night 3: provider healthy again -> both users get their digest and
	// baselines advance to the alerted content.
	d.MustExec(`DELETE FROM crank_outbox`)
	ok := &countingMailer{}
	cfgOK := cfg
	cfgOK.Mailer = ok
	s3, err := notification.RunCRankChangeAlerts(context.Background(), d, cfgOK)
	if err != nil {
		t.Fatal(err)
	}
	if s3.AlertsFound != 2 || s3.EmailsSent != 2 || ok.count() != 2 {
		t.Fatalf("night 3 recovery mismatch: %+v sent=%v", s3, ok.sent)
	}
	for _, u := range []int64{2, 3} {
		var newHash string
		if err := d.Get(&newHash, `SELECT rank_hash FROM crank_alert_state WHERE user_id=? AND repo_id='r2'`, u); err != nil || newHash == "" || newHash == baseHash {
			t.Fatalf("baseline not advanced for user %d: hash=%q", u, newHash)
		}
		var snapDate string
		var notified int64
		if err := d.Get(&snapDate, `SELECT last_alerted_snapshot_date FROM crank_alert_state WHERE user_id=? AND repo_id='r2'`, u); err != nil || snapDate == "" {
			t.Fatalf("snapshot date not stamped for user %d", u)
		}
		if err := d.Get(&notified, `SELECT last_notified_unix FROM crank_alert_state WHERE user_id=? AND repo_id='r2'`, u); err != nil || notified == 0 {
			t.Fatalf("last_notified_unix not stamped for user %d", u)
		}
	}

	// Night 4: same snapshot re-run is deduped.
	s4, _ := notification.RunCRankChangeAlerts(context.Background(), d, cfgOK)
	if s4.AlertsFound != 0 || s4.EmailsSent != 0 || ok.count() != 2 {
		t.Fatalf("night 4 must be fully deduped: %+v total=%d", s4, ok.count())
	}
}

// AC6: Unsubscribe checked at send time, not queue time; unsubscribed mid-cycle users skipped.
func TestCrankUnsubscribeCheckedAtSendTime(t *testing.T) {
	d := seedCrankBase(t)
	addSnap(t, d, "s1", "r1", 2, 72.0, "B")

	mailer := &countingMailer{}
	cfg := cfgWith(mailer, 5)
	if _, err := notification.RunCRankChangeAlerts(context.Background(), d, cfg); err != nil {
		t.Fatal(err)
	} // baseline pass

	// Alice unsubscribes before the send occurs
	d.MustExec(`UPDATE users SET digest_unsubscribed = TRUE WHERE id = 1`)

	addSnap(t, d, "s2", "r1", 1, 60.0, "C")
	s, err := notification.RunCRankChangeAlerts(context.Background(), d, cfg)
	if err != nil {
		t.Fatal(err)
	}
	if s.EmailsSent != 0 || mailer.count() != 0 {
		t.Fatalf("unsubscribed user must not receive email: sent=%d, %+v", mailer.count(), s)
	}
}

// AC4 Seed baseline on watch creation
func TestSeedWatchBaseline(t *testing.T) {
	d := seedCrankBase(t)
	addSnap(t, d, "s1", "r1", 1, 75.0, "B")

	// User 2 adds r1 to watchlist and seeds baseline
	d.MustExec(`INSERT INTO user_watchlists (user_id, repo_id, notify_rank_change, created_at) VALUES (2, 'r1', TRUE, CURRENT_TIMESTAMP)`)
	if err := notification.SeedWatchBaseline(context.Background(), d, 2, "r1"); err != nil {
		t.Fatal(err)
	}

	// First alert run must not alert for user 2 on r1
	mailer := &countingMailer{}
	cfg := cfgWith(mailer, 5)
	s, err := notification.RunCRankChangeAlerts(context.Background(), d, cfg)
	if err != nil {
		t.Fatal(err)
	}
	if s.EmailsSent != 0 || mailer.count() != 0 {
		t.Fatalf("newly seeded watch must not alert on first cycle: sent=%d, %+v", mailer.count(), s)
	}
}
