package notification_test

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/abhisheksoni27/opendoor/internal/crypto"
	"github.com/abhisheksoni27/opendoor/internal/db"
	"github.com/abhisheksoni27/opendoor/internal/notification"
	"github.com/jmoiron/sqlx"
	_ "modernc.org/sqlite"
)

func seedPRStallBase(t *testing.T) *sqlx.DB {
	t.Helper()
	d := sqlx.MustConnect("sqlite", ":memory:")
	d.SetMaxOpenConns(1)
	if err := db.AutoMigrate(d); err != nil {
		t.Fatal(err)
	}
	stmts := []string{
		`INSERT INTO users (id, username, email, created_at, updated_at) VALUES (7, 'stalluser', 'dev@example.com', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
		`INSERT INTO repositories (id, full_name, owner, name, language, github_url, updated_at) VALUES
			('r1', 'acme/widget', 'acme', 'widget', 'Go', 'https://github.com/acme/widget', CURRENT_TIMESTAMP),
			('r2', 'acme/gizmo', 'acme', 'gizmo', 'Go', 'https://github.com/acme/gizmo', CURRENT_TIMESTAMP),
			('r3', 'cold/start', 'cold', 'start', 'Rust', 'https://github.com/cold/start', CURRENT_TIMESTAMP),
			('r4', 'zero/data', 'zero', 'data', 'Go', 'https://github.com/zero/data', CURRENT_TIMESTAMP)`,
		`INSERT INTO latest_snapshots (repository_id, snapshot_date, c_rank_score, c_rank_tier, updated_at) VALUES
			('r1', '2026-08-25', 80.0, 'A', CURRENT_TIMESTAMP),
			('r2', '2026-08-25', 92.0, 'S', CURRENT_TIMESTAMP),
			('r3', '2026-08-25', 70.0, 'B', CURRENT_TIMESTAMP),
			('r4', '2026-08-25', 60.0, 'C', CURRENT_TIMESTAMP)`,
	}
	for _, s := range stmts {
		if _, err := d.Exec(s); err != nil {
			t.Fatalf("seedPRStallBase: %v", err)
		}
	}
	return d
}

func fmtTS(t time.Time) string { return t.UTC().Format("2006-01-02 15:04:05") }

// insertPRSnapshotAct inserts one snapshot with explicit opened/ready clock
// anchors and an optional reviewers JSON (AC1/AC5). readyAt nil = never
// drafted -> the stall clock anchors at createdAt.
func insertPRSnapshotAct(t *testing.T, d *sqlx.DB, prID string, userID int64, repoID string, number int, state string, createdAt, lastActivity time.Time, reviewersJSON string, snapshotAt time.Time, readyAt *time.Time) {
	t.Helper()
	var merged any
	if state == "merged" {
		m := createdAt.Add(24 * time.Hour)
		merged = m.Format("2006-01-02 15:04:05")
	}
	var err error
	if merged != nil {
		_, err = d.Exec(`INSERT INTO pr_snapshots (pr_id, user_id, repository_id, pr_number, title, html_url, state, pr_created_at, github_updated_at, merged_at, requested_reviewers, is_draft, ready_for_review_at, fetched_at, snapshot_at)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, FALSE, ?, ?, ?)`,
			prID, userID, repoID, number, "Stalled PR", "https://github.com/"+repoID+"/pull/"+itoa(number), state,
			fmtTS(createdAt), fmtTS(lastActivity), merged, reviewersJSON, readyAtTS(readyAt), fmtTS(snapshotAt), fmtTS(snapshotAt))
	} else {
		_, err = d.Exec(`INSERT INTO pr_snapshots (pr_id, user_id, repository_id, pr_number, title, html_url, state, pr_created_at, github_updated_at, requested_reviewers, is_draft, ready_for_review_at, fetched_at, snapshot_at)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, FALSE, ?, ?, ?)`,
			prID, userID, repoID, number, "Stalled PR", "https://github.com/"+repoID+"/pull/"+itoa(number), state,
			fmtTS(createdAt), fmtTS(lastActivity), reviewersJSON, readyAtTS(readyAt), fmtTS(snapshotAt), fmtTS(snapshotAt))
	}
	if err != nil {
		t.Fatalf("insert pr_snapshots: %v", err)
	}
}

func readyAtTS(t *time.Time) any {
	if t == nil {
		return nil
	}
	return t.UTC()
}

func itoa(n int) string {
	return strings.TrimSpace(strings.Replace(jsonNumber(n), "\n", "", -1))
}

// insertWIPSnapshot inserts an open PR whose title trips the AC4 WIP skip.
func insertWIPSnapshot(t *testing.T, d *sqlx.DB, prID string, userID int64, repoID string, number int, title string, createdAt time.Time, snapshotAt time.Time) {
	t.Helper()
	_, err := d.Exec(`INSERT INTO pr_snapshots (pr_id, user_id, repository_id, pr_number, title, html_url, state, pr_created_at, github_updated_at, requested_reviewers, is_draft, fetched_at, snapshot_at)
		VALUES (?, ?, ?, ?, ?, ?, 'open', ?, ?, '[]', FALSE, ?, ?)`,
		prID, userID, repoID, number, title, "https://github.com/"+repoID+"/pull/"+itoa(number),
		fmtTS(createdAt), fmtTS(createdAt), fmtTS(snapshotAt), fmtTS(snapshotAt))
	if err != nil {
		t.Fatalf("insert wip pr_snapshots: %v", err)
	}
}

// insertDraftFlagSnapshot inserts an open PR flagged draft in the snapshot.
func insertDraftFlagSnapshot(t *testing.T, d *sqlx.DB, prID string, userID int64, repoID string, number int, createdAt time.Time, snapshotAt time.Time) {
	t.Helper()
	_, err := d.Exec(`INSERT INTO pr_snapshots (pr_id, user_id, repository_id, pr_number, title, html_url, state, pr_created_at, github_updated_at, requested_reviewers, is_draft, fetched_at, snapshot_at)
		VALUES (?, ?, ?, ?, ?, ?, 'open', ?, ?, '[]', TRUE, ?, ?)`,
		prID, userID, repoID, number, "Real work", "https://github.com/"+repoID+"/pull/"+itoa(number),
		fmtTS(createdAt), fmtTS(createdAt), fmtTS(snapshotAt), fmtTS(snapshotAt))
	if err != nil {
		t.Fatalf("insert draft-flagged pr_snapshots: %v", err)
	}
}

func jsonNumber(n int) string {
	b, _ := json.Marshal(n)
	return string(b)
}

// seedMergedHistory inserts n merged PRs on repoID with ~waitHours review times.
func seedMergedHistory(t *testing.T, d *sqlx.DB, repoID string, n int, waitHours float64) {
	t.Helper()
	now := time.Now().UTC()
	for i := 0; i < n; i++ {
		created := now.Add(-time.Duration(waitHours+48) * time.Hour)
		mergedAt := created.Add(time.Duration(waitHours) * time.Hour)
		_, err := d.Exec(`INSERT INTO pr_snapshots (pr_id, user_id, repository_id, pr_number, title, html_url, state, pr_created_at, merged_at, fetched_at, snapshot_at)
			VALUES (?, 7, ?, ?, ?, ?, 'merged', ?, ?, ?, ?)`,
			repoID+"#hist"+jsonNumber(i), repoID, 900+i, "Hist", "https://example.com/hist",
			created.Format("2006-01-02 15:04:05"), mergedAt.Format("2006-01-02 15:04:05"),
			now.Add(-time.Duration(200-i)*time.Minute), now.Add(-time.Duration(100-i)*time.Minute))
		if err != nil {
			t.Fatalf("seedMergedHistory: %v", err)
		}
	}
}

type stallFailMailer struct{ calls int }

func (m *stallFailMailer) Send(context.Context, string, string, string, string) error {
	m.calls++
	return context.DeadlineExceeded
}

type stallOKMailer struct {
	calls    int
	subjects []string
	bodies   []string
}

func (m *stallOKMailer) Send(_ context.Context, _, subject, text, _ string) error {
	m.calls++
	m.subjects = append(m.subjects, subject)
	m.bodies = append(m.bodies, text)
	return nil
}

// AC1+AC4+AC5: open PRs fire once their stall-clock wait crosses the repo
// p75 (clock anchored at ready_for_review when a draft->ready transition
// exists, else opened_at); repos under the 5-sample floor use the 24h
// fallback threshold (AC2); WIP/draft-titled and draft-flagged PRs are
// skipped; merged PRs are excluded at query time; nudge addresses assigned
// reviewers with an '@maintainers' fallback for reviewer-less PRs.
func TestPRStallAlertEvaluate(t *testing.T) {
	d := seedPRStallBase(t)
	now := time.Now().UTC()

	// r1: 5 merged PRs, all merged in exactly 10 days => p75 = 240h.
	seedMergedHistory(t, d, "r1", 5, 240)

	// Open PR idle since it was opened 20 days ago (> p75) -> must fire.
	insertPRSnapshotAct(t, d, "acme/widget#11", 7, "r1", 11, "open",
		now.Add(-480*time.Hour), now.Add(-480*time.Hour), `["alice","bob"]`, now, nil)
	// Young open PR (< p75 since opened) -> must NOT fire.
	insertPRSnapshotAct(t, d, "acme/widget#14", 7, "r1", 14, "open",
		now.Add(-100*time.Hour), now.Add(-1*time.Hour), "", now, nil)
	// Merged PR -> excluded at query time even though its age exceeds p75.
	insertPRSnapshotAct(t, d, "acme/widget#12", 7, "r1", 12, "merged",
		now.Add(-960*time.Hour), now.Add(-936*time.Hour), "", now, nil)
	// Draft->ready PR: clock starts at the ready instant (30h ago), not
	// opened_at (480h ago) -> below p75, must NOT fire.
	ready30h := now.Add(-30 * time.Hour)
	insertPRSnapshotAct(t, d, "acme/widget#16", 7, "r1", 16, "open",
		now.Add(-480*time.Hour), now.Add(-1*time.Hour), "", now, &ready30h)
	// WIP-titled PR past p75 -> skipped (AC4).
	insertWIPSnapshot(t, d, "acme/widget#17", 7, "r1", 17, "[WIP] half done",
		now.Add(-480*time.Hour), now)
	// Draft-flagged PR past p75 -> skipped (AC4).
	insertDraftFlagSnapshot(t, d, "acme/widget#18", 7, "r1", 18,
		now.Add(-480*time.Hour), now)

	// r3 sparse history (2 merged PRs): below the sample floor -> the 24h
	// fallback threshold applies and the long-idle PR fires (AC2).
	seedMergedHistory(t, d, "r3", 2, 1)
	insertPRSnapshotAct(t, d, "cold/start#5", 7, "r3", 5, "open",
		now.Add(-720*time.Hour), now.Add(-720*time.Hour), "", now, nil)

	// r4 zero data points: same 24h fallback (AC2).
	insertPRSnapshotAct(t, d, "zero/data#1", 7, "r4", 1, "open",
		now.Add(-2000*time.Hour), now.Add(-2000*time.Hour), "", now, nil)

	summary := &notification.PRStallSummary{}
	if err := notification.EvaluatePRStallAlerts(context.Background(), d, notification.PRStallAlertConfig{}, summary); err != nil {
		t.Fatal(err)
	}
	if summary.Evaluated != 7 { // merged snapshot excluded; WIP/draft counted as evaluated+skipped
		t.Fatalf("expected 7 evaluated open PRs, got %d", summary.Evaluated)
	}
	if summary.Queued != 3 { // widget#11 (p75) + cold/start#5 + zero/data#1 (24h fallback)
		t.Fatalf("expected 3 queued alerts, got %d", summary.Queued)
	}
	if summary.InsufficientSamples != 2 || summary.DraftSkipped != 2 {
		t.Fatalf("expected 2 fallback-sample repos and 2 draft skips, got %+v", summary)
	}
	var n int
	if err := d.Get(&n, `SELECT COUNT(*) FROM pr_stall_alerts WHERE repository_id IN ('r4','r3')`); err != nil {
		t.Fatal(err)
	}
	if n != 2 {
		t.Fatalf("expected one 24h-fallback alert per sparse repo, got %d rows", n)
	}

	var payloadStr string
	if err := d.Get(&payloadStr, `SELECT payload FROM pr_stall_alerts WHERE pr_id = 'acme/widget#11'`); err != nil {
		t.Fatal(err)
	}
	var p notification.PRStallPayload
	if err := json.Unmarshal([]byte(payloadStr), &p); err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(p.DeepLink, "pull/11") {
		t.Fatalf("expected deep link to the PR, got %q", p.DeepLink)
	}
	if !strings.Contains(p.NudgeComment, "#11") || !strings.Contains(p.NudgeComment, "p75") {
		t.Fatalf("expected ready-to-copy nudge mentioning #11 and p75, got %q", p.NudgeComment)
	}
	if !strings.Contains(p.NudgeComment, "@alice") || !strings.Contains(p.NudgeComment, "@bob") {
		t.Fatalf("expected nudge to address assigned reviewers, got %q", p.NudgeComment)
	}
	if len(p.Reviewers) != 2 {
		t.Fatalf("expected 2 reviewers snapshotted, got %v", p.Reviewers)
	}
	// AC4: exactly 3 suggestions — same-language better C-Ranks first, padded
	// from the global top-C-Rank pool; never the stalled repo itself.
	if len(p.Suggestions) != 3 {
		t.Fatalf("expected exactly 3 suggestions, got %v", p.Suggestions)
	}
	for _, s := range p.Suggestions {
		if s.FullName == "acme/widget" {
			t.Fatalf("suggestions must exclude the stalled PR's own repo, got %v", s.FullName)
		}
	}
	if p.Suggestions[0].Score <= 80.0 {
		t.Fatalf("expected first suggestion with higher C-Rank than 80, got %v", p.Suggestions[0].Score)
	}

	// AC2: sparse-history repos alert against the 24h fallback threshold.
	var coldPayloadStr string
	if err := d.Get(&coldPayloadStr, `SELECT payload FROM pr_stall_alerts WHERE pr_id = 'cold/start#5'`); err != nil {
		t.Fatal(err)
	}
	var coldStart notification.PRStallPayload
	if err := json.Unmarshal([]byte(coldPayloadStr), &coldStart); err != nil {
		t.Fatal(err)
	}
	if coldStart.P75Hours != 24 {
		t.Fatalf("expected 24h fallback p75 for sparse repo, got %v", coldStart.P75Hours)
	}

	// Reviewer-less PRs use the generic @maintainers author-only variant
	// instead of being dropped (AC4): verify via a fresh repo with samples.
	seedMergedHistory(t, d, "r2", 5, 200)
	insertPRSnapshotAct(t, d, "acme/gizmo#9", 7, "r2", 9, "open",
		now.Add(-900*time.Hour), now.Add(-900*time.Hour), "", now, nil)
	s2 := &notification.PRStallSummary{}
	if err := notification.EvaluatePRStallAlerts(context.Background(), d, notification.PRStallAlertConfig{}, s2); err != nil {
		t.Fatal(err)
	}
	var coldPayload string
	if err := d.Get(&coldPayload, `SELECT payload FROM pr_stall_alerts WHERE pr_id = 'acme/gizmo#9'`); err != nil {
		t.Fatal(err)
	}
	var cp notification.PRStallPayload
	if err := json.Unmarshal([]byte(coldPayload), &cp); err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(cp.NudgeComment, "@maintainers") {
		t.Fatalf("expected generic @maintainers nudge, got %q", cp.NudgeComment)
	}
}

// AC3+AC5: stall key = (pr_id, clock anchor epoch) — repeated sweeps over an
// unchanged or newly-active PR queue nothing more; each threshold crossing
// fires exactly once thanks to the unique (pr_id, stall_epoch_bucket) index.
func TestPRStallAlertExactlyOncePerCrossing(t *testing.T) {
	d := seedPRStallBase(t)
	now := time.Now().UTC()
	seedMergedHistory(t, d, "r1", 5, 240)
	insertPRSnapshotAct(t, d, "acme/widget#11", 7, "r1", 11, "open",
		now.Add(-480*time.Hour), now.Add(-480*time.Hour), "", now, nil)

	s1 := &notification.PRStallSummary{}
	if err := notification.EvaluatePRStallAlerts(context.Background(), d, notification.PRStallAlertConfig{}, s1); err != nil {
		t.Fatal(err)
	}
	s2 := &notification.PRStallSummary{}
	if err := notification.EvaluatePRStallAlerts(context.Background(), d, notification.PRStallAlertConfig{}, s2); err != nil {
		t.Fatal(err)
	}
	if s2.Queued != 0 {
		t.Fatalf("expected 0 queued on unchanged re-sweep, got %d", s2.Queued)
	}

	// New commit/review/comment bumps activity but NOT the AC5 clock anchor:
	// the same crossing must not re-fire.
	newer := now.Add(time.Minute) // snapshot_at must be the newest observation
	insertPRSnapshotAct(t, d, "acme/widget#11", 7, "r1", 11, "open",
		now.Add(-480*time.Hour), now.Add(-400*time.Hour), "", newer, nil)
	s3 := &notification.PRStallSummary{}
	if err := notification.EvaluatePRStallAlerts(context.Background(), d, notification.PRStallAlertConfig{}, s3); err != nil {
		t.Fatal(err)
	}
	if s3.Queued != 0 {
		t.Fatalf("expected no re-fire on new activity (fixed anchor), got queued=%d", s3.Queued)
	}
	var n int
	if err := d.Get(&n, `SELECT COUNT(*) FROM pr_stall_alerts WHERE pr_id = 'acme/widget#11'`); err != nil {
		t.Fatal(err)
	}
	if n != 1 {
		t.Fatalf("expected exactly 1 row per threshold crossing, got %d", n)
	}

	// AC3: the alerts_sent gate holds exactly one (pr_id, last_crossed_at).
	var gate int
	if err := d.Get(&gate, `SELECT COUNT(*) FROM alerts_sent WHERE pr_id = 'acme/widget#11'`); err != nil {
		t.Fatal(err)
	}
	if gate != 1 {
		t.Fatalf("expected exactly 1 alerts_sent gate row, got %d", gate)
	}
}

// AC4: a PR that closed/merged after enqueue is skipped pre-dispatch and its
// alert row marked stale (never delivered, never retried).
func TestPRStallAlertStaleSkipOnDispatch(t *testing.T) {
	d := seedPRStallBase(t)
	now := time.Now().UTC()
	seedMergedHistory(t, d, "r1", 5, 240)
	insertPRSnapshotAct(t, d, "acme/widget#11", 7, "r1", 11, "open",
		now.Add(-480*time.Hour), now.Add(-480*time.Hour), "", now, nil)

	// First run enqueues; with only an email and a nil mailer the row stays
	// pending after failed attempt #1 (retry gated 60s out, AC6).
	if _, err := notification.RunPRStallAlerts(context.Background(), d, notification.PRStallAlertConfig{}); err != nil {
		t.Fatal(err)
	}
	var status string
	var attempts int
	if err := d.QueryRow(`SELECT status, attempts FROM pr_stall_alerts WHERE pr_id='acme/widget#11'`).Scan(&status, &attempts); err != nil {
		t.Fatal(err)
	}
	if status != "pending" || attempts != 1 {
		t.Fatalf("expected pending/1 without a mailer, got %s/%d", status, attempts)
	}

	// Fresh stall on a second PR, then the PR merges before dispatch.
	insertPRSnapshotAct(t, d, "acme/widget#15", 7, "r1", 15, "open",
		now.Add(-500*time.Hour), now.Add(-500*time.Hour), "", now, nil)
	if err := notification.EvaluatePRStallAlerts(context.Background(), d, notification.PRStallAlertConfig{}, &notification.PRStallSummary{}); err != nil {
		t.Fatal(err)
	}
	newer := now.Add(time.Minute) // snapshot_at must be the newest observation
	insertPRSnapshotAct(t, d, "acme/widget#15", 7, "r1", 15, "merged",
		now.Add(-500*time.Hour), now.Add(-1*time.Hour), "", newer, nil)

	// Simulate the 60s retry gate elapsing so both rows come due.
	past := now.Add(-2 * time.Minute)
	if _, err := d.Exec(`UPDATE pr_stall_alerts SET next_attempt_at = ?`, past); err != nil {
		t.Fatal(err)
	}

	ok := &stallOKMailer{}
	s, err := notification.RunPRStallAlerts(context.Background(), d, notification.PRStallAlertConfig{Mailer: ok})
	if err != nil {
		t.Fatal(err)
	}
	if s.StaleSkipped != 1 || s.Sent != 1 || ok.calls != 1 {
		// #15 merged -> skipped stale pre-dispatch; #11 still open -> delivered.
		t.Fatalf("expected one stale skip plus one delivery, got %+v calls=%d", s, ok.calls)
	}
	if err := d.Get(&status, `SELECT status FROM pr_stall_alerts WHERE pr_id='acme/widget#15'`); err != nil {
		t.Fatal(err)
	}
	if status != "stale" {
		t.Fatalf("expected status stale, got %s", status)
	}
}

// AC6: one digest per user per run lists all stalled PRs; success marks every
// included row sent; failure retries exactly once after the 60s gate, then the
// final failure is flagged 'failed' (visible, never silently dropped).
func TestPRStallAlertLifecycle(t *testing.T) {
	d := seedPRStallBase(t)
	now := time.Now().UTC()
	seedMergedHistory(t, d, "r1", 5, 240)
	insertPRSnapshotAct(t, d, "acme/widget#11", 7, "r1", 11, "open",
		now.Add(-480*time.Hour), now.Add(-480*time.Hour), "", now, nil)

	fail := &stallFailMailer{}
	cfg := notification.PRStallAlertConfig{Mailer: fail, BaseURL: "https://getmerged.abhishekco.de"}

	// Attempt #1 fails -> pending, gated 60s out.
	if _, err := notification.RunPRStallAlerts(context.Background(), d, cfg); err != nil {
		t.Fatal(err)
	}
	var status string
	var attempts int
	if err := d.QueryRow(`SELECT status, attempts FROM pr_stall_alerts WHERE pr_id='acme/widget#11'`).Scan(&status, &attempts); err != nil {
		t.Fatal(err)
	}
	if status != "pending" || attempts != 1 {
		t.Fatalf("after attempt 1: expected pending/1, got %s/%d", status, attempts)
	}

	// Retry gate not yet elapsed -> nothing happens.
	if _, err := notification.RunPRStallAlerts(context.Background(), d, cfg); err != nil {
		t.Fatal(err)
	}
	if err := d.QueryRow(`SELECT status, attempts FROM pr_stall_alerts WHERE pr_id='acme/widget#11'`).Scan(&status, &attempts); err != nil {
		t.Fatal(err)
	}
	if status != "pending" || attempts != 1 {
		t.Fatalf("before gate elapsed: expected untouched pending/1, got %s/%d", status, attempts)
	}

	// Gate elapses -> attempt #2 (the single retry) fails -> flagged failed.
	past := now.Add(-2 * time.Minute)
	if _, err := d.Exec(`UPDATE pr_stall_alerts SET next_attempt_at = ?`, past); err != nil {
		t.Fatal(err)
	}
	if _, err := notification.RunPRStallAlerts(context.Background(), d, cfg); err != nil {
		t.Fatal(err)
	}
	var lastErr string
	if err := d.QueryRow(`SELECT status, attempts, last_error FROM pr_stall_alerts WHERE pr_id='acme/widget#11'`).Scan(&status, &attempts, &lastErr); err != nil {
		t.Fatal(err)
	}
	if status != "failed" || attempts != 2 || lastErr == "" {
		t.Fatalf("after single retry: expected failed/2 with logged error, got %s/%d err=%q", status, attempts, lastErr)
	}

	// Further runs leave the failed row untouched (manual/next-cycle reset).
	if _, err := notification.RunPRStallAlerts(context.Background(), d, cfg); err != nil {
		t.Fatal(err)
	}
	if err := d.Get(&attempts, `SELECT attempts FROM pr_stall_alerts WHERE pr_id='acme/widget#11'`); err != nil {
		t.Fatal(err)
	}
	if attempts != 2 {
		t.Fatalf("failed row was retried again: attempts=%d", attempts)
	}

	// Success path: a fresh stalled PR sends via a digest email and flips to
	// sent; batching is covered by TestPRStallAlertDigestBatchesPerUser.
	insertPRSnapshotAct(t, d, "acme/widget#13", 7, "r1", 13, "open",
		now.Add(-600*time.Hour), now.Add(-600*time.Hour), "", now, nil)
	ok := &stallOKMailer{}
	s, err := notification.RunPRStallAlerts(context.Background(), d, notification.PRStallAlertConfig{Mailer: ok})
	if err != nil {
		t.Fatal(err)
	}
	if s.Sent != 1 || ok.calls != 1 {
		t.Fatalf("expected 1 sent email, got sent=%d calls=%d", s.Sent, ok.calls)
	}
	var status13 string
	if err := d.Get(&status13, `SELECT status FROM pr_stall_alerts WHERE pr_id='acme/widget#13'`); err != nil {
		t.Fatal(err)
	}
	if status13 != "sent" {
		t.Fatalf("expected status sent, got %s", status13)
	}
}

// AC1: multiple stalled PRs for one user collapse into ONE digest message per
// run listing every stalled PR.
func TestPRStallAlertDigestBatchesPerUser(t *testing.T) {
	d := seedPRStallBase(t)
	now := time.Now().UTC()
	seedMergedHistory(t, d, "r1", 5, 240)
	for _, num := range []int{11, 12, 14} {
		ready := now.Add(-480 * time.Hour)
		insertPRSnapshotAct(t, d, fmt.Sprintf("acme/widget#%d", num), 7, "r1", num, "open",
			now.Add(-480*time.Hour), now.Add(-480*time.Hour-time.Duration(num)*time.Hour), "", now, &ready)
	}
	ok := &stallOKMailer{}
	s, err := notification.RunPRStallAlerts(context.Background(), d, notification.PRStallAlertConfig{Mailer: ok})
	if err != nil {
		t.Fatal(err)
	}
	if s.Queued != 3 || s.Sent != 3 || ok.calls != 1 {
		t.Fatalf("expected 3 alerts in 1 digest send, got queued=%d sent=%d calls=%d", s.Queued, s.Sent, ok.calls)
	}
	for _, num := range []int{11, 12, 14} {
		if !strings.Contains(ok.bodies[0], fmt.Sprintf("pull/%d", num)) {
			t.Fatalf("digest missing pull/%d:\n%s", num, ok.bodies[0])
		}
		var status string
		if err := d.Get(&status, `SELECT status FROM pr_stall_alerts WHERE pr_id=?`, fmt.Sprintf("acme/widget#%d", num)); err != nil {
			t.Fatal(err)
		}
		if status != "sent" {
			t.Fatalf("expected #%d sent, got %s", num, status)
		}
	}
}

// AC6: no configured channel flags the alert immediately so the gap is visible.
func TestPRStallAlertNoChannelDies(t *testing.T) {
	d := seedPRStallBase(t)
	now := time.Now().UTC()
	seedMergedHistory(t, d, "r1", 5, 240)
	// User without an email row value.
	if _, err := d.Exec(`UPDATE users SET email='' WHERE id=7`); err != nil {
		t.Fatal(err)
	}
	insertPRSnapshotAct(t, d, "acme/widget#11", 7, "r1", 11, "open",
		now.Add(-480*time.Hour), now.Add(-480*time.Hour), "", now, nil)

	s, err := notification.RunPRStallAlerts(context.Background(), d, notification.PRStallAlertConfig{})
	if err != nil {
		t.Fatal(err)
	}
	if s.Failed != 1 {
		t.Fatalf("expected alert flagged failed for missing channels, got %+v", s)
	}
}

// AC1/AC2: review-event ingestion is idempotent by (pr_id, event_id), drops
// events older than the PR's current episode start (monotonic guard), applies
// a batch oldest-first, and restarts the episode at accepted events.
func TestPRReviewEventIngestIdempotentMonotonic(t *testing.T) {
	d := seedPRStallBase(t)
	now := time.Now().UTC().Truncate(time.Second)
	prID := "acme/widget#11"
	mk := func(id, typ string, at time.Time) notification.PRReviewEvent {
		return notification.PRReviewEvent{PRID: prID, UserID: 7, RepositoryID: "r1",
			EventType: typ, EventID: id, OccurredAt: at}
	}

	// First accepted event creates the episode at its timestamp.
	n, err := notification.IngestPRReviewEvents(context.Background(), d,
		[]notification.PRReviewEvent{mk("e1", notification.PRReviewEventRequested, now.Add(-10*time.Hour))})
	if err != nil || n != 1 {
		t.Fatalf("expected 1 accepted, got n=%d err=%v", n, err)
	}
	var ep time.Time
	if err := d.Get(&ep, `SELECT episode_start FROM pr_stall_state WHERE pr_id=?`, prID); err != nil {
		t.Fatal(err)
	}
	if !ep.Truncate(time.Second).Equal(now.Add(-10 * time.Hour)) {
		t.Fatalf("expected episode start -10h, got %v", ep)
	}

	// Duplicate (pr_id, event_id): ignored entirely.
	n, err = notification.IngestPRReviewEvents(context.Background(), d,
		[]notification.PRReviewEvent{mk("e1", notification.PRReviewEventSubmitted, now.Add(-10*time.Hour))})
	if err != nil || n != 0 {
		t.Fatalf("expected duplicate dropped, got n=%d err=%v", n, err)
	}

	// Older than current episode start: monotonic drop (AC2).
	n, err = notification.IngestPRReviewEvents(context.Background(), d,
		[]notification.PRReviewEvent{mk("e2", notification.PRReviewEventSubmitted, now.Add(-20*time.Hour))})
	if err != nil || n != 0 {
		t.Fatalf("expected stale event dropped, got n=%d err=%v", n, err)
	}

	// Newer event restarts the episode (AC1).
	n, err = notification.IngestPRReviewEvents(context.Background(), d,
		[]notification.PRReviewEvent{mk("e3", notification.PRReviewEventSubmitted, now.Add(-2*time.Hour))})
	if err != nil || n != 1 {
		t.Fatalf("expected restart accepted, got n=%d err=%v", n, err)
	}
	if err := d.Get(&ep, `SELECT episode_start FROM pr_stall_state WHERE pr_id=?`, prID); err != nil {
		t.Fatal(err)
	}
	if !ep.Truncate(time.Second).Equal(now.Add(-2 * time.Hour)) {
		t.Fatalf("expected episode restarted to -2h, got %v", ep)
	}

	// Mixed batch replays oldest-first within one transaction.
	n, err = notification.IngestPRReviewEvents(context.Background(), d, []notification.PRReviewEvent{
		mk("e5", notification.PRReviewEventComment, now.Add(-time.Hour)),
		mk("e4", notification.PRReviewEventForcePush, now.Add(-30*time.Hour)), // stale vs -2h
	})
	if err != nil || n != 1 {
		t.Fatalf("expected only the newer batch event accepted, got n=%d err=%v", n, err)
	}
	var alerted any
	if err := d.Get(&alerted, `SELECT alerted_at FROM pr_stall_state WHERE pr_id=?`, prID); err != nil {
		t.Fatal(err)
	}
	if alerted != nil {
		t.Fatalf("expected alerted_at cleared by restart, got %v", alerted)
	}
}

// AC1+AC3: an accepted reset event restarts the episode — the wait must reach
// p75 again before a second alert fires, and each episode fires exactly once.
func TestPRStallEpisodeResetRealerts(t *testing.T) {
	d := seedPRStallBase(t)
	now := time.Now().UTC()
	seedMergedHistory(t, d, "r1", 5, 240) // p75 = 240h
	insertPRSnapshotAct(t, d, "acme/widget#11", 7, "r1", 11, "open",
		now.Add(-480*time.Hour), now.Add(-480*time.Hour), "", now, nil)

	s1 := &notification.PRStallSummary{}
	if err := notification.EvaluatePRStallAlerts(context.Background(), d, notification.PRStallAlertConfig{}, s1); err != nil {
		t.Fatal(err)
	}
	if s1.Queued != 1 {
		t.Fatalf("expected first episode alert, got %+v", s1)
	}

	// Repeat sweep: no prior-alert-free episode left -> nothing queued.
	s2 := &notification.PRStallSummary{}
	if err := notification.EvaluatePRStallAlerts(context.Background(), d, notification.PRStallAlertConfig{}, s2); err != nil {
		t.Fatal(err)
	}
	if s2.Queued != 0 {
		t.Fatalf("expected no refire within episode, got %+v", s2)
	}

	ingest := func(id string, at time.Time) {
		t.Helper()
		n, err := notification.IngestPRReviewEvents(context.Background(), d, []notification.PRReviewEvent{{
			PRID: "acme/widget#11", UserID: 7, RepositoryID: "r1",
			EventType: notification.PRReviewEventSubmitted, EventID: id, OccurredAt: at}})
		if err != nil || n != 1 {
			t.Fatalf("reset %s not accepted: n=%d err=%v", id, n, err)
		}
	}

	// Reset to -260h: the fresh episode is already past p75 -> fires once more.
	ingest("r1", now.Add(-260*time.Hour))
	s3 := &notification.PRStallSummary{}
	if err := notification.EvaluatePRStallAlerts(context.Background(), d, notification.PRStallAlertConfig{}, s3); err != nil {
		t.Fatal(err)
	}
	if s3.Queued != 1 {
		t.Fatalf("expected second episode alert, got %+v", s3)
	}

	// Reset to -100h: young episode below p75 -> no fire despite prior alerts.
	ingest("r2", now.Add(-100*time.Hour))
	s4 := &notification.PRStallSummary{}
	if err := notification.EvaluatePRStallAlerts(context.Background(), d, notification.PRStallAlertConfig{}, s4); err != nil {
		t.Fatal(err)
	}
	if s4.Queued != 0 {
		t.Fatalf("expected quiet young episode, got %+v", s4)
	}

	var rows int
	if err := d.Get(&rows, `SELECT COUNT(*) FROM pr_stall_alerts WHERE pr_id='acme/widget#11'`); err != nil {
		t.Fatal(err)
	}
	if rows != 2 {
		t.Fatalf("expected exactly one alert per episode (2), got %d", rows)
	}
	var gateRows int
	if err := d.Get(&gateRows, `SELECT COUNT(*) FROM alerts_sent WHERE pr_id='acme/widget#11'`); err != nil {
		t.Fatal(err)
	}
	if gateRows != 2 {
		t.Fatalf("expected one gate row per episode (2), got %d", gateRows)
	}
}

// AC3+AC4+AC5: email is primary; a failing Slack webhook is retried
// best-effort (3 attempts, exponential backoff) then logged while the alert
// still marks sent and never re-fires within the episode.
func TestPRStallWebhookBestEffortNoRefire(t *testing.T) {
	d := seedPRStallBase(t)
	now := time.Now().UTC()
	seedMergedHistory(t, d, "r1", 5, 240)
	insertPRSnapshotAct(t, d, "acme/widget#11", 7, "r1", 11, "open",
		now.Add(-480*time.Hour), now.Add(-480*time.Hour), `["alice"]`, now, nil)

	if _, err := d.Exec(`CREATE TABLE IF NOT EXISTS user_webhooks (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		user_id INTEGER NOT NULL,
		label VARCHAR(16) NOT NULL,
		url_enc TEXT NOT NULL,
		enabled BOOLEAN NOT NULL DEFAULT TRUE,
		consecutive_failures INT NOT NULL DEFAULT 0,
		created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)`); err != nil {
		t.Fatal(err)
	}
	attempts := 0
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		attempts++
		w.WriteHeader(http.StatusInternalServerError)
	}))
	defer srv.Close()

	key := []byte("0123456789abcdef0123456789abcdef")
	urlEnc, err := crypto.EncryptAESGCM([]byte(srv.URL), key)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := d.Exec(`INSERT INTO user_webhooks (user_id, label, url_enc, enabled) VALUES (7, 'slack', ?, TRUE)`, urlEnc); err != nil {
		t.Fatal(err)
	}

	oldBackoff := notification.WebhookRetryBackoff
	notification.WebhookRetryBackoff = time.Millisecond
	defer func() { notification.WebhookRetryBackoff = oldBackoff }()

	ok := &stallOKMailer{}
	cfg := notification.PRStallAlertConfig{
		Mailer:              ok,
		EncryptionKey:       key,
		WebhookRetryBackoff: time.Millisecond,
	}
	s, err := notification.RunPRStallAlerts(context.Background(), d, cfg)
	if err != nil {
		t.Fatal(err)
	}
	if s.Sent != 1 || ok.calls != 1 {
		t.Fatalf("expected email-primary delivery, got %+v calls=%d", s, ok.calls)
	}
	if attempts < 3 {
		t.Fatalf("expected >=3 best-effort webhook attempts, got %d", attempts)
	}
	var status string
	if err := d.Get(&status, `SELECT status FROM pr_stall_alerts WHERE pr_id='acme/widget#11'`); err != nil {
		t.Fatal(err)
	}
	if status != "sent" {
		t.Fatalf("expected status sent despite webhook failure, got %s", status)
	}

	// Partial webhook failure never re-fires: next sweep queues/sends nothing.
	s2, err := notification.RunPRStallAlerts(context.Background(), d, cfg)
	if err != nil {
		t.Fatal(err)
	}
	if s2.Queued != 0 || s2.Sent != 0 || ok.calls != 1 {
		t.Fatalf("expected no refire after partial failure, got queued=%d sent=%d calls=%d", s2.Queued, s2.Sent, ok.calls)
	}

	// AC5: payload carries a deep link plus ready-to-copy reviewer nudge.
	var payloadStr string
	if err := d.Get(&payloadStr, `SELECT payload FROM pr_stall_alerts WHERE pr_id='acme/widget#11'`); err != nil {
		t.Fatal(err)
	}
	var p notification.PRStallPayload
	if err := json.Unmarshal([]byte(payloadStr), &p); err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(p.DeepLink, "github.com/acme/widget/pull/11") {
		t.Fatalf("expected PR deep link, got %q", p.DeepLink)
	}
	if !strings.Contains(p.NudgeComment, "@alice") || !strings.Contains(p.NudgeComment, "#11") {
		t.Fatalf("expected copyable nudge addressing @alice on #11, got %q", p.NudgeComment)
	}
}
