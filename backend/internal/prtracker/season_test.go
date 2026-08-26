package prtracker

import (
	"context"
	"testing"
	"time"

	"github.com/jmoiron/sqlx"
	_ "modernc.org/sqlite"
)

func TestLevelForXP(t *testing.T) {
	cases := map[int]int{0: 0, 1: 1, 249: 1, 250: 2, 8999: 9, 9000: MaxLevel, 100000: MaxLevel}
	for xp, want := range cases {
		if got := LevelForXP(xp); got != want {
			t.Fatalf("LevelForXP(%d) = %d, want %d", xp, got, want)
		}
	}
	if got := XPToNextLevel(100); got != 150 {
		t.Fatalf("XPToNextLevel(100) = %d, want 150", got)
	}
	if got := XPToNextLevel(90000); got != 0 {
		t.Fatalf("XPToNextLevel(max) = %d, want 0", got)
	}
}

func TestWeekStartIsMondayUTC(t *testing.T) {
	for _, tc := range []struct {
		in, want string
	}{
		{"2026-08-26T14:00:00Z", "2026-08-24T00:00:00Z"}, // Wed -> Mon
		{"2026-08-23T23:59:59Z", "2026-08-17T00:00:00Z"}, // Sun -> prior Mon
	} {
		in, _ := time.Parse(time.RFC3339, tc.in)
		want, _ := time.Parse(time.RFC3339, tc.want)
		if got := WeekStart(in); !got.Equal(want) {
			t.Fatalf("WeekStart(%s) = %s, want %s", tc.in, got, want)
		}
	}
}

func newSeasonTestStore(t *testing.T) (*Store, *sqlx.DB) {
	t.Helper()
	db, err := sqlx.Open("sqlite", ":memory:")
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { db.Close() })
	s := NewStore(db)
	mustExec := func(q string, args ...any) {
		t.Helper()
		if _, err := db.Exec(q, args...); err != nil {
			t.Fatalf("%s: %v", q, err)
		}
	}
	mustExec(`CREATE TABLE users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT NOT NULL DEFAULT '')`)
	mustExec(`CREATE TABLE pr_connections (user_id INTEGER PRIMARY KEY, github_login TEXT)`)
	mustExec(`CREATE TABLE seasons (id INTEGER PRIMARY KEY AUTOINCREMENT,
		name TEXT NOT NULL, start_date DATE NOT NULL, end_date DATE NOT NULL,
		UNIQUE(start_date, end_date))`)
	mustExec(`CREATE TABLE xp_events (id INTEGER PRIMARY KEY AUTOINCREMENT,
		user_id INTEGER NOT NULL, source VARCHAR(32) NOT NULL DEFAULT 'merged',
		eval_id INTEGER NOT NULL, xp INTEGER NOT NULL DEFAULT 0,
		created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
		UNIQUE(source, eval_id))`)
	mustExec(`CREATE INDEX idx_xp_events_created_at ON xp_events(created_at)`)
	mustExec(`CREATE TABLE pr_evaluations (id INTEGER PRIMARY KEY AUTOINCREMENT,
		eval_id VARCHAR(128), owner_user_id INTEGER, outcome VARCHAR(20),
		merged_at DATETIME)`)
	return s, db
}

// AC1/AC5 golden path: terminal outcomes map merged=+50 / reviewed=+10,
// unknown/null outcomes are skipped, replays award nothing.
func TestAwardXPsMappingAndIdempotency(t *testing.T) {
	s, db := newSeasonTestStore(t)
	ctx := context.Background()
	mkEval := func(id int64, uid any, outcome string, mergedAt any) {
		if _, err := db.Exec(`INSERT INTO pr_evaluations (id, owner_user_id, outcome, merged_at) VALUES (?, ?, ?, ?)`,
			id, uid, outcome, mergedAt); err != nil {
			t.Fatal(err)
		}
	}
	mkEval(1, int64(7), "hit", "2026-01-05 10:00:00") // merged -> +50
	mkEval(2, int64(7), "miss", nil)                  // closed unmerged -> reviewed +10
	mkEval(3, int64(7), "pending", nil)               // skipped
	mkEval(4, int64(7), "unverifiable", nil)          // skipped
	mkEval(5, int64(7), "", nil)                      // null-ish skipped
	mkEval(6, int64(8), "miss", "2026-01-06 09:00:00")
	mkEval(7, nil, "hit", "2026-01-07 09:00:00") // no owner: never awarded
	if _, err := db.Exec(`INSERT INTO users (id, username) VALUES (7, 'alice'), (8, 'bob')`); err != nil {
		t.Fatal(err)
	}

	n, err := s.AwardXPs(ctx, nil)
	if err != nil {
		t.Fatal(err)
	}
	if n != 3 { // alice merged+reviewed, bob merged
		t.Fatalf("first pass inserted %d events, want 3", n)
	}
	again, err := s.AwardXPs(ctx, nil)
	if err != nil {
		t.Fatal(err)
	}
	if again != 0 {
		t.Fatalf("replay inserted %d events, want 0 (eval_id idempotency)", again)
	}

	var alice struct {
		Total   int `db:"total"`
		MergedN int `db:"mn"`
		ReviewN int `db:"rn"`
	}
	if err := db.Get(&alice, `SELECT SUM(xp) AS total,
			SUM(CASE WHEN source = 'merged' THEN 1 ELSE 0 END) AS mn,
			SUM(CASE WHEN source = 'reviewed' THEN 1 ELSE 0 END) AS rn
		FROM xp_events WHERE user_id = 7`); err != nil {
		t.Fatal(err)
	}
	if alice.Total != XPMerged+XPReviewed || alice.MergedN != 1 || alice.ReviewN != 1 {
		t.Fatalf("alice = %+v, want total %d, 1 merged, 1 reviewed", alice, XPMerged+XPReviewed)
	}
}

// AC7: reviewed XP is capped at MaxReviewsPerWeek per user-week; merged XP is
// uncapped.
func TestReviewedWeeklyCap(t *testing.T) {
	s, db := newSeasonTestStore(t)
	ctx := context.Background()
	for i := int64(1); i <= 5; i++ { // five closed-unmerged scored evals
		if _, err := db.Exec(`INSERT INTO pr_evaluations (id, owner_user_id, outcome, merged_at)
			VALUES (?, 9, 'hit', NULL)`, i); err != nil {
			t.Fatal(err)
		}
	}
	if _, err := db.Exec(`INSERT INTO users (id, username) VALUES (9, 'carol')`); err != nil {
		t.Fatal(err)
	}
	if _, err := s.AwardXPs(ctx, nil); err != nil {
		t.Fatal(err)
	}
	var n, xp int
	if err := db.Get(&n, `SELECT COUNT(*) FROM xp_events WHERE user_id = 9 AND source = 'reviewed'`); err != nil {
		t.Fatal(err)
	}
	if err := db.Get(&xp, `SELECT COALESCE(SUM(xp), 0) FROM xp_events WHERE user_id = 9`); err != nil {
		t.Fatal(err)
	}
	if n != MaxReviewsPerWeek || xp != MaxReviewsPerWeek*XPReviewed {
		t.Fatalf("reviewed events=%d xp=%d, want %d/%d (cap)", n, xp, MaxReviewsPerWeek, MaxReviewsPerWeek*XPReviewed)
	}
}

func seedEvent(t *testing.T, db *sqlx.DB, uid int64, source string, evalID int64, at string) {
	t.Helper()
	if _, err := db.Exec(`INSERT INTO xp_events (user_id, source, eval_id, xp, created_at)
		VALUES (?, ?, ?, ?, ?)`, uid, source, evalID, XPMerged, at); err != nil {
		t.Fatal(err)
	}
}

// AC3/AC4: streak counts consecutive UTC Mon-weeks, stays alive through the
// running week, never multi-counts within one week, and resets after a gap.
func TestWeeklyStreak(t *testing.T) {
	s, db := newSeasonTestStore(t)
	ctx := context.Background()
	now := time.Date(2026, 8, 26, 12, 0, 0, 0, time.UTC) // Wednesday
	wk := func(weeksAgo int) time.Time { return WeekStart(now).AddDate(0, 0, -7*weeksAgo).Add(2 * 24 * time.Hour) }
	at := func(t time.Time) string { return t.UTC().Format("2006-01-02 15:04:05") }

	// Weeks -2 and -1 have events; current week none yet -> streak 2.
	seedEvent(t, db, 7, XPSourceMerged, 1, at(wk(2)))
	seedEvent(t, db, 7, XPSourceMerged, 2, at(wk(1)))
	if got := s.WeeklyStreak(ctx, 7, now); got != 2 {
		t.Fatalf("streak = %d, want 2", got)
	}
	// More XP inside the same week must NOT re-increment.
	seedEvent(t, db, 7, XPSourceMerged, 3, at(wk(1)))
	if got := s.WeeklyStreak(ctx, 7, now); got != 2 {
		t.Fatalf("same-week extra event moved streak to %d, want 2", got)
	}
	// Event in the current week extends to 3.
	seedEvent(t, db, 7, XPSourceMerged, 4, at(wk(0)))
	if got := s.WeeklyStreak(ctx, 7, now); got != 3 {
		t.Fatalf("streak with current-week event = %d, want 3", got)
	}
	// A missed week resets: drop week -1 by using a fresh user with weeks -3 and -1.
	seedEvent(t, db, 8, XPSourceMerged, 5, at(wk(3)))
	seedEvent(t, db, 8, XPSourceMerged, 6, at(wk(1)))
	if got := s.WeeklyStreak(ctx, 8, now); got != 0 {
		t.Fatalf("streak across a missed week = %d, want 0", got)
	}
}

// AC2/AC6: stats and board are computed only from the active season window;
// the board orders by week XP desc, streak desc, username asc.
func TestSeasonStatsAndLeaderboard(t *testing.T) {
	s, db := newSeasonTestStore(t)
	ctx := context.Background()
	now := time.Date(2026, 8, 26, 12, 0, 0, 0, time.UTC)

	season := quarterRange(now)
	if _, err := db.Exec(`INSERT INTO seasons (name, start_date, end_date) VALUES (?, ?, ?)`,
		season.Name, utcDate(season.Start), utcDate(season.End)); err != nil {
		t.Fatal(err)
	}
	wk := func(weeksAgo int) time.Time { return WeekStart(now).AddDate(0, 0, -7*weeksAgo).Add(2 * 24 * time.Hour) }
	at := func(ts time.Time) string { return ts.UTC().Format("2006-01-02 15:04:05") }

	// alice: 3 merged this week (=150) ; bob: 2 merged this week (=100) but a
	// longer streak; dave ties bob's week XP later via carol tie ordering.
	seedEvent(t, db, 7, XPSourceMerged, 101, at(wk(0)))
	seedEvent(t, db, 7, XPSourceMerged, 102, at(wk(0)))
	seedEvent(t, db, 7, XPSourceMerged, 103, at(wk(0)))
	seedEvent(t, db, 8, XPSourceMerged, 104, at(wk(0)))
	seedEvent(t, db, 8, XPSourceMerged, 105, at(wk(0)))
	seedEvent(t, db, 8, XPSourceMerged, 106, at(wk(1))) // streak fuel
	// Pre-season XP must be excluded from season math.
	seedEvent(t, db, 7, XPSourceMerged, 107, "2020-01-06 12:00:00")
	if _, err := db.Exec(`INSERT INTO users (id, username) VALUES (7, 'alice'), (8, 'bob')`); err != nil {
		t.Fatal(err)
	}

	stats, err := s.GetSeasonStats(ctx, 7)
	if err != nil {
		t.Fatal(err)
	}
	if stats.Season != season.Name || stats.SeasonXP != 3*XPMerged || stats.Level == 0 {
		t.Fatalf("stats = %+v, want season %s with %d XP", stats, season.Name, 3*XPMerged)
	}
	if stats.StreakWeeks != 1 {
		t.Fatalf("alice streak = %d, want 1", stats.StreakWeeks)
	}
	if stats.SeasonRank == nil || *stats.SeasonRank != 1 {
		t.Fatalf("alice rank = %+v, want 1", stats.SeasonRank)
	}

	board, err := s.WeeklyContributorLeaderboard(ctx, DefaultLeaderboardSize)
	if err != nil {
		t.Fatal(err)
	}
	if len(board) != 2 || board[0].Login != "alice" || board[1].Login != "bob" {
		t.Fatalf("board = %+v, want alice then bob", board)
	}
	if board[0].Rank != 1 || board[0].WeeklyXP != 3*XPMerged || board[1].StreakWeeks != 2 {
		t.Fatalf("entries wrong: %+v", board)
	}
}
