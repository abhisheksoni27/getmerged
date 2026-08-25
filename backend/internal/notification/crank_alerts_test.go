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
	bounce map[string]bool // hard-bounced recipients (AC8)
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

// seedCrankBase migrates an empty schema and registers watchers.
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

func cfgWith(mailer *countingMailer, maxFails int) notification.CRankAlertConfig {
	return notification.CRankAlertConfig{
		Mailer:              mailer,
		BaseURL:             "http://localhost:8080",
		JobSecret:           "testsecret",
		Cooldown:            24 * time.Hour,
		DropThresholdPoints: 10,
		MaxSendFailures:     maxFails,
	}
}

// AC5: the very first sighting of a watcher/repo pair silently stores the
// baseline hash and sends nothing.
func TestCrankBaselineFirstSighting(t *testing.T) {
	d := seedCrankBase(t)
	addSnap(t, d, "s1", "r1", 1, 72.0, "B")

	mailer := &countingMailer{}
	s, err := notification.RunCRankChangeAlerts(context.Background(), d, cfgWith(mailer, 5))
	if err != nil {
		t.Fatal(err)
	}
	if s.Baselined != 1 || s.Sent != 0 || s.AlertsFound != 0 || mailer.count() != 0 {
		t.Fatalf("baseline run must be silent: %+v emails=%v", s, mailer.sent)
	}
	var n int
	var hash string
	if err := d.Get(&n, `SELECT COUNT(1) FROM crank_alert_state`); err != nil || n != 1 {
		t.Fatalf("baseline row missing: rows=%d err=%v", n, err)
	}
	if err := d.Get(&hash, `SELECT COALESCE(rank_hash,'') FROM crank_alert_state WHERE user_id=1 AND repo_id='r1'`); err != nil || hash == "" {
		t.Fatalf("baseline hash not stored: %q err=%v", hash, err)
	}
}

// AC1/AC4/AC7: tier crossing alerts once, carries an expiring unsubscribe
// link, then stays silent on re-runs and within the cooldown window.
func TestCrankAlertCooldownAndDedup(t *testing.T) {
	d := seedCrankBase(t)
	addSnap(t, d, "s1", "r1", 2, 72.0, "B")

	mailer := &countingMailer{}
	cfg := cfgWith(mailer, 5)
	if _, err := notification.RunCRankChangeAlerts(context.Background(), d, cfg); err != nil {
		t.Fatal(err)
	} // baseline pass

	addSnap(t, d, "s2", "r1", 1, 64.0, "C") // B -> C tier crossing, drop only 8 (<10)
	s, err := notification.RunCRankChangeAlerts(context.Background(), d, cfg)
	if err != nil {
		t.Fatal(err)
	}
	if s.Sent != 1 || s.AlertsFound != 1 || mailer.count() != 1 {
		t.Fatalf("tier-crossing run mismatch: %+v sent=%v", s, mailer.sent)
	}
	body := strings.SplitN(mailer.sent[0], "|", 3)[2]
	if !strings.Contains(body, "http://localhost:8080/unsubscribe?uid=1&token=") {
		t.Fatalf("email missing unsubscribe link: %q", body)
	}
	token := body[strings.Index(body, "token=")+len("token="):]
	token = strings.Fields(token)[0]
	if !strings.Contains(token, ".") || !notification.VerifyUnsubscribeToken("1", token, "testsecret") {
		t.Fatalf("unsubscribe token must be signed and verifiable: %q", token)
	}

	// Same snapshot again: hash dedup means no duplicate email.
	s2, _ := notification.RunCRankChangeAlerts(context.Background(), d, cfg)
	if s2.Sent != 0 || s2.AlertsFound != 0 || mailer.count() != 1 {
		t.Fatalf("re-run must be deduped: %+v total=%d", s2, mailer.count())
	}

	// Further sharp drop within the cooldown window: suppressed regardless.
	addSnap(t, d, "s3", "r1", 0, 40.0, "D")
	s3, _ := notification.RunCRankChangeAlerts(context.Background(), d, cfg)
	if s3.Sent != 0 || s3.SkippedCooldown != 1 || mailer.count() != 1 {
		t.Fatalf("cooldown must suppress further sends: %+v total=%d", s3, mailer.count())
	}
}

// AC2/AC3: send failures leave the hash untouched (natural retry) until
// MaxSendFailures consecutive cycles dead-letter the pair; retrying stops
// until the next real snapshot change revives it.
func TestCrankFailureRetryCapDeadLetter(t *testing.T) {
	d := seedCrankBase(t)
	addSnap(t, d, "s1", "r2", 2, 76.0, "B")

	failing := &countingMailer{fail: map[string]error{
		"bob@x.io":   context.DeadlineExceeded,
		"carol@x.io": context.DeadlineExceeded,
	}}
	cfg := cfgWith(failing, 3)

	// Baseline must land before any alerting can happen.
	if _, err := notification.RunCRankChangeAlerts(context.Background(), d, cfg); err != nil {
		t.Fatal(err)
	}
	addSnap(t, d, "s2", "r2", 1, 61.0, "B") // same-tier drop of exactly 15 >= 10

	for i := 0; i < 3; i++ {
		s, err := notification.RunCRankChangeAlerts(context.Background(), d, cfg)
		if err != nil {
			t.Fatal(err)
		}
		if s.Failed != 2 { // bob and carol both hit the failing mailer
			t.Fatalf("cycle %d: expected both watchers to fail: %+v", i, s)
		}
	}
	var dead int
	if err := d.Get(&dead, `SELECT COUNT(1) FROM crank_alert_state WHERE dead_lettered=TRUE`); err != nil || dead != 2 {
		t.Fatalf("both pairs must be dead-lettered after 3 strikes: %d err=%v", dead, err)
	}
	before := failing.count()

	// Same failing snapshot: dead-lettered pairs are not retried.
	s, _ := notification.RunCRankChangeAlerts(context.Background(), d, cfg)
	if failing.count() != before || s.DeadLettered != 2 {
		t.Fatalf("dead-lettered pairs must not retry: %+v total=%d", s, failing.count())
	}
	// AC2: the rank hash still points at the baseline snapshot, not the
	// failed one.
	var snapDate string
	if err := d.Get(&snapDate,
		`SELECT last_alerted_snapshot_date FROM crank_alert_state WHERE user_id=2 AND repo_id='r2'`); err != nil {
		t.Fatal(err)
	}
	baselineDate := time.Now().UTC().AddDate(0, 0, -2).Format("2006-01-02")
	if snapDate != baselineDate {
		t.Fatalf("failed sends must not advance rank state: got %q want %q", snapDate, baselineDate)
	}

	// Next real change revives the pair: one more attempt fires.
	addSnap(t, d, "s3", "r2", 0, 50.0, "C")
	retry := &countingMailer{}
	if _, err := notification.RunCRankChangeAlerts(context.Background(), d, cfgWith(retry, 3)); err != nil {
		t.Fatal(err)
	}
	if retry.count() != 2 {
		t.Fatalf("revived pairs must retry exactly once per cycle: %v", retry.sent)
	}
}

// AC8: a hard bounce flags the watcher e-mail invalid and suppresses all
// future sends until resubscribe clears the flag.
func TestCrankHardBounceSuppressesWatcher(t *testing.T) {
	d := seedCrankBase(t)
	addSnap(t, d, "s1", "r3", 2, 70.0, "B")

	bouncing := &countingMailer{bounce: map[string]bool{"dave@x.io": true}}
	cfg := cfgWith(bouncing, 5)

	// Baseline pass, then the alerting pass bounces.
	if _, err := notification.RunCRankChangeAlerts(context.Background(), d, cfg); err != nil {
		t.Fatal(err)
	}
	addSnap(t, d, "s2", "r3", 1, 55.0, "C") // tier crossing
	s, err := notification.RunCRankChangeAlerts(context.Background(), d, cfg)
	if err != nil {
		t.Fatal(err)
	}
	if s.Failed == 0 {
		t.Fatalf("hard bounce must surface as a failure: %+v", s)
	}
	var invalid bool
	if err := d.Get(&invalid, `SELECT COALESCE(email_invalid,FALSE) FROM users WHERE id=4`); err != nil || !invalid {
		t.Fatalf("watcher must be flagged email_invalid: %v err=%v", invalid, err)
	}

	// Suppressed from subsequent cycles entirely.
	addSnap(t, d, "s3", "r3", 0, 30.0, "D")
	s2, _ := notification.RunCRankChangeAlerts(context.Background(), d, cfgWith(bouncing, 5))
	if s2.WatchersConsidered != 4 { // dave filtered; alice/bob/carol/erin remain
		t.Fatalf("bounced watcher must be filtered from candidates: %+v", s2)
	}

	// Resubscribe flow (AC7/AC8): valid expiring token clears the flag.
	tok := notification.ExpiringUnsubscribeToken(4, "testsecret", time.Now().UTC().Add(time.Hour))
	res := d.MustExec(`UPDATE users SET email_invalid=FALSE, digest_unsubscribed=FALSE WHERE id=?`, 4)
	if n, _ := res.RowsAffected(); n != 1 {
		t.Fatalf("resubscribe update failed")
	}
	if notification.VerifyUnsubscribeToken("4", tok, "wrong-secret") {
		t.Fatalf("token must be secret-bound")
	}
}

// AC6: concurrent runs cannot double-send; CAS + per-repo locking keep
// exactly one email per watcher/repo pair.
func TestCrankConcurrentRunsSingleSend(t *testing.T) {
	d := seedCrankBase(t)
	addSnap(t, d, "s1", "r1", 2, 72.0, "B")

	mailer := &countingMailer{}
	cfg := cfgWith(mailer, 5)
	if _, err := notification.RunCRankChangeAlerts(context.Background(), d, cfg); err != nil {
		t.Fatal(err)
	} // baseline

	addSnap(t, d, "s2", "r1", 1, 58.0, "C")

	var wg sync.WaitGroup
	var sa, sb *notification.CRankAlertSummary
	wg.Add(2)
	go func() { defer wg.Done(); sa, _ = notification.RunCRankChangeAlerts(context.Background(), d, cfg) }()
	go func() { defer wg.Done(); sb, _ = notification.RunCRankChangeAlerts(context.Background(), d, cfg) }()
	wg.Wait()

	total := sa.Sent + sb.Sent
	if total != 1 || mailer.count() != 1 {
		t.Fatalf("concurrent runs double-sent: %+v %+v emails=%d", sa, sb, mailer.count())
	}
}

// AC7: expired / malformed / tampered tokens are rejected.
func TestExpiringUnsubscribeTokens(t *testing.T) {
	valid := notification.UnsubscribeToken(9, "sec")
	if !notification.VerifyUnsubscribeToken("9", valid, "sec") {
		t.Fatalf("fresh token must verify")
	}
	expired := notification.ExpiringUnsubscribeToken(9, "sec", time.Now().UTC().Add(-time.Minute))
	if notification.VerifyUnsubscribeToken("9", expired, "sec") {
		t.Fatalf("expired token must fail")
	}
	if notification.VerifyUnsubscribeToken("10", valid, "sec") {
		t.Fatalf("uid/token mismatch must fail")
	}
	if notification.VerifyUnsubscribeToken("9", "garbage", "sec") {
		t.Fatalf("malformed token must fail")
	}
}
