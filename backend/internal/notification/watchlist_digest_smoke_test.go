package notification_test

import (
	"context"
	"errors"
	"strings"
	"testing"
	"time"

	"github.com/abhisheksoni27/opendoor/internal/db"
	"github.com/abhisheksoni27/opendoor/internal/notification"
	"github.com/jmoiron/sqlx"
	_ "modernc.org/sqlite"
)

var errFakeSend = errors.New("smtp down")

type fakeMailer struct {
	sent []string // "to|subject|textBody"
	fail map[string]error
}

func (f *fakeMailer) Send(_ context.Context, to, subject, textBody, _ string) error {
	if f.fail != nil {
		if err, ok := f.fail[to]; ok {
			return err
		}
	}
	f.sent = append(f.sent, to+"|"+subject+"|"+textBody)
	return nil
}

func mondayAnchorUTC(now time.Time) time.Time {
	now = now.UTC()
	off := (int(now.Weekday()) + 6) % 7
	d := now.AddDate(0, 0, -off)
	return time.Date(d.Year(), d.Month(), d.Day(), 0, 0, 0, 0, time.UTC)
}

// seed inserts users/watchlists/snapshots relative to this week's Monday
// 00:00 UTC anchor so the AC5 comparison rule is deterministic any weekday.
//
//	r1: A(82) -> B(70): tier change AND delta -12  => alert (AC1)
//	r3: 60 -> 69 (+9): below threshold             => no alert (AC1 bound)
//	r2: single snapshot only                       => new to watchlist (AC2)
func seed(t *testing.T) *sqlx.DB {
	t.Helper()
	d := sqlx.MustConnect("sqlite", ":memory:")
	if err := db.AutoMigrate(d); err != nil {
		t.Fatal(err)
	}
	anchor := mondayAnchorUTC(time.Now())
	priorDate := anchor.AddDate(0, 0, -2).Format("2006-01-02") + " 10:00:00"
	curDate := time.Now().UTC().Format("2006-01-02") + " 09:00:00"

	stmts := []string{
		`INSERT INTO users (id, username, email, created_at, updated_at) VALUES
			(1,'alice','alice@x.io',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
			(2,'bob','bob@x.io',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
			(3,'carol','carol@x.io',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)`,
		`INSERT INTO repositories (id, full_name, owner, name, language, updated_at) VALUES
			('r1','a/one','a','one','Go',CURRENT_TIMESTAMP),
			('r2','a/two','a','two','Rust',CURRENT_TIMESTAMP),
			('r3','a/three','a','three','Go',CURRENT_TIMESTAMP)`,
		`INSERT INTO user_watchlists (user_id, repo_id, notify_rank_change, created_at) VALUES
			(1,'r1',TRUE,CURRENT_TIMESTAMP),(1,'r2',TRUE,CURRENT_TIMESTAMP),
			(2,'r1',TRUE,CURRENT_TIMESTAMP),(2,'r3',TRUE,CURRENT_TIMESTAMP),
			(3,'r1',TRUE,CURRENT_TIMESTAMP)`,
		"INSERT INTO daily_snapshots (id, repository_id, snapshot_date, c_rank_score, c_rank_tier, external_pr_merge_rate, created_at) VALUES" +
			" ('s1','r1','" + priorDate + "',82.0,'A',0.7,CURRENT_TIMESTAMP)," +
			" ('s2','r1','" + curDate + "',70.0,'B',0.6,CURRENT_TIMESTAMP)," +
			" ('s3','r3','" + priorDate + "',60.0,'C',0.5,CURRENT_TIMESTAMP)," +
			" ('s4','r3','" + curDate + "',69.0,'C',0.5,CURRENT_TIMESTAMP)," +
			" ('s5','r2','" + curDate + "',50.0,'C',0.5,CURRENT_TIMESTAMP)",
	}
	for _, s := range stmts {
		if _, err := d.Exec(s); err != nil {
			t.Fatalf("seed: %v", err)
		}
	}
	return d
}

func TestRunWeeklyDigestFlow(t *testing.T) {
	d := seed(t)
	mailer := &fakeMailer{}
	cfg := notification.WeeklyDigestConfig{Mailer: mailer, BaseURL: "http://localhost:8080", JobSecret: "testsecret"}

	s, err := notification.RunWeeklyDigest(context.Background(), d, cfg)
	if err != nil {
		t.Fatal(err)
	}
	if s.Status != "done" || len(mailer.sent) != 3 || s.AlertsFound != 3 || s.SkippedNew != 1 {
		t.Fatalf("run1 unexpected summary: %+v sent=%v", s, mailer.sent)
	}
	// AC4 response shape: {sent:N, failed:M}.
	if s.Sent != 3 || s.Failed != 0 {
		t.Fatalf("run1 sent/failed mismatch: %+v", s)
	}
	if !strings.HasPrefix(mailer.sent[0], "alice@x.io|1 repo you're watching dropped a tier this week|") {
		t.Fatalf("unexpected recipient/subject: %q", mailer.sent[0])
	}
	// AC2: repo without prior snapshot listed as new to watchlist, not alerted.
	if !strings.Contains(mailer.sent[0], "New to your watchlist") ||
		!strings.Contains(mailer.sent[0], "a/two") {
		t.Fatalf("digest must list new-to-watchlist repos: %q", mailer.sent[0])
	}
	// AC3: each changed repo is deep-linked to its /repos/:id/trend page.
	if !strings.Contains(mailer.sent[0], "http://localhost:8080/repos/r1/trend") {
		t.Fatalf("digest must deep-link to /repos/:id/trend: %q", mailer.sent[0])
	}

	// AC3: duplicate call within same week -> already_queued, sends nothing.
	s2, err := notification.RunWeeklyDigest(context.Background(), d, cfg)
	if err != nil {
		t.Fatal(err)
	}
	if s2.Status != "already_queued" || len(mailer.sent) != 3 || s2.Sent != 0 {
		t.Fatalf("run2 should be already_queued without sends: %+v", s2)
	}

	// AC4: one notifier failure is logged/skipped; never reports sent when M>0.
	notification.ResetDigestWeeklyLock() // simulate fresh process
	d2 := seed(t)
	fm2 := &fakeMailer{fail: map[string]error{"carol@x.io": errFakeSend}}
	s3, err := notification.RunWeeklyDigest(context.Background(), d2, notification.WeeklyDigestConfig{Mailer: fm2, BaseURL: "http://localhost:8080", JobSecret: "testsecret"})
	if err != nil {
		t.Fatal(err)
	}
	if s3.Sent != 2 || s3.Failed != 1 || s3.Status != "partial_failed" || len(fm2.sent) != 2 {
		t.Fatalf("run3 partial failure mishandled: %+v sent=%v", s3, fm2.sent)
	}
	var carolStatus string
	if err := d2.Get(&carolStatus, `SELECT status FROM digest_recipients WHERE user_id=3`); err != nil || carolStatus != "failed" {
		t.Fatalf("carol recipient status=%q err=%v", carolStatus, err)
	}

	// AC7: unsubscribed token round-trip.
	tok := notification.UnsubscribeToken(1, "testsecret")
	if !notification.VerifyUnsubscribeToken("1", tok, "testsecret") {
		t.Fatal("token verify failed")
	}
	if notification.VerifyUnsubscribeToken("1", tok, "wrong") || notification.VerifyUnsubscribeToken("2", tok, "testsecret") {
		t.Fatal("token verify must be strict")
	}
	d2.Exec(`UPDATE users SET digest_unsubscribed=TRUE WHERE id=1`)
	notification.ResetDigestWeeklyLock()
	u, _ := notification.RunWeeklyDigest(context.Background(), d2, notification.WeeklyDigestConfig{Mailer: fm2, BaseURL: "http://localhost:8080", JobSecret: "testsecret"})
	if u.UsersConsidered != 2 {
		t.Fatalf("unsubscribed user still considered: %+v", u)
	}

	// No material changes -> done_empty, zero emails (fresh process state).
	notification.ResetDigestWeeklyLock()
	d3 := seed(t)
	d3.Exec(`UPDATE daily_snapshots SET c_rank_score=82.0, c_rank_tier='A' WHERE repository_id='r1'`)
	d3.Exec(`UPDATE daily_snapshots SET c_rank_score=60.0, c_rank_tier='C' WHERE repository_id='r3'`)
	mailer3 := &fakeMailer{}
	s4, err := notification.RunWeeklyDigest(context.Background(), d3, notification.WeeklyDigestConfig{Mailer: mailer3})
	if err != nil {
		t.Fatal(err)
	}
	if s4.Status != "done_empty" || len(mailer3.sent) != 0 {
		t.Fatalf("expected done_empty with no email: %+v", s4)
	}
}
