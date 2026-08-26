package prtracker

import (
	"context"
	"fmt"
	"log/slog"
	"sort"
	"time"
)

// Contributor XP seasons (AC1-AC7). XP is awarded from PR outcomes already
// tracked by /api/v1/pr-evals: every terminal scored eval ('hit'|'miss') on a
// merged PR earns one 'merged' event (+50); a terminal scored eval on a
// closed-unmerged PR earns one 'reviewed' event (+10). Pending/unverifiable/
// unknown outcomes are skipped and logged, never awarded (AC5). Every event
// carries the source eval id; the composite UNIQUE(source, eval_id) key makes
// re-running the /api/v1/pr-evals sync an exact no-op (AC1).
//
// AC2: seasons are fixed UTC date ranges in the config seasons table
// (start_date, end_date); season XP, levels and ranks only count events with
// created_at inside [start,end). A current quarter row is seeded lazily so a
// fresh deployment always has an active season.
//
// AC3/AC4: weeks are UTC calendar weeks starting Monday 00:00 UTC. The streak
// is derived from xp_events: it increments at most once per user-week (the
// first qualifying event of the week), extra XP in the same week never
// re-increments it, and one fully missed week resets it to 0.
const (
	XPMerged   = 50  // per merged PR (AC5)
	XPReviewed = 10  // per closed-after-review PR (AC5)
	// MaxReviewsPerWeek caps reviewed XP at 3 reviews/week/user (AC7).
	MaxReviewsPerWeek = 3

	DefaultLeaderboardSize = 20
	MaxLeaderboardSize     = 100

	XPSourceMerged   = "merged"
	XPSourceReviewed = "reviewed"

	// maxStreakLookback bounds the weekly-streak scan (~2 years).
	maxStreakLookback = 104 * 7 * 24 * time.Hour
)

// levelThresholds maps SEASON XP to levels (AC2): level N is reached at
// levelThresholds[N-1]; 0 season XP is level 0.
var levelThresholds = []int{1, 250, 600, 1200, 2000, 3000, 4200, 5600, 7200, 9000}

// MaxLevel is the highest reachable level.
var MaxLevel = len(levelThresholds)

// LevelForXP maps season XP to a level; zero XP is always level 0 (AC2).
func LevelForXP(seasonXP int) int {
	lvl := 0
	for _, th := range levelThresholds {
		if seasonXP < th {
			break
		}
		lvl++
	}
	return lvl
}

// XPToNextLevel returns the XP still missing for the next level; 0 at max.
func XPToNextLevel(seasonXP int) int {
	for _, th := range levelThresholds {
		if seasonXP < th {
			return th - seasonXP
		}
	}
	return 0
}

// SeasonLabel returns the ISO year-week of now, e.g. "2026-W35". Display
// fallback only — real seasons come from the seasons table (AC2).
func SeasonLabel(now time.Time) string {
	y, w := now.UTC().ISOWeek()
	return fmt.Sprintf("%d-W%02d", y, w)
}

func utcDate(t time.Time) string { return t.UTC().Format("2006-01-02") }

// WeekStart returns the Monday 00:00 UTC of the ISO week containing t (AC3).
func WeekStart(t time.Time) time.Time {
	u := t.UTC()
	day := (int(u.Weekday()) + 6) % 7 // Monday = 0
	return time.Date(u.Year(), u.Month(), u.Day(), 0, 0, 0, 0, time.UTC).AddDate(0, 0, -day)
}

// Season is one config row: a fixed UTC [Start,End) range (AC2).
type Season struct {
	Name  string
	Start time.Time
	End   time.Time
}

// quarterRange derives the deterministic fallback season covering t: the UTC
// calendar quarter, e.g. "2026-Q3" spanning 2026-07-01..2026-09-30.
func quarterRange(t time.Time) Season {
	u := t.UTC()
	q := (int(u.Month())-1)/3 + 1
	start := time.Date(u.Year(), time.Month(3*(q-1)+1), 1, 0, 0, 0, 0, time.UTC)
	return Season{Name: fmt.Sprintf("%d-Q%d", u.Year(), q), Start: start, End: start.AddDate(0, 3, 0)}
}

// CurrentSeason returns the active seasons-table row for now (AC2); when none
// covers today it seeds the current UTC quarter and re-reads. Any failure
// degrades to the computed quarter without persisting.
func (s *Store) CurrentSeason(ctx context.Context, now time.Time) Season {
	today := utcDate(now)
	var row struct {
		Name      string `db:"name"`
		StartDate string `db:"start_date"`
		EndDate   string `db:"end_date"`
	}
	err := s.db.GetContext(ctx, &row, `
		SELECT name, start_date, end_date FROM seasons
		WHERE start_date <= ? AND end_date > ?
		ORDER BY start_date DESC LIMIT 1`, today, today)
	if err == nil && row.Name != "" {
		if start, perr := parseUTCDate(row.StartDate); perr == nil {
			end, perr2 := parseUTCDate(row.EndDate)
			if perr2 == nil && end.After(start) {
				return Season{Name: row.Name, Start: start, End: end}
			}
		}
	}
	fallback := quarterRange(now)
	q := `INSERT IGNORE INTO seasons (name, start_date, end_date) VALUES (?, ?, ?)`
	if s.db.DriverName() == "sqlite" {
		q = `INSERT OR IGNORE INTO seasons (name, start_date, end_date) VALUES (?, ?, ?)`
	}
	if _, ierr := s.db.ExecContext(ctx, q,
		fallback.Name, utcDate(fallback.Start), utcDate(fallback.End)); ierr != nil {
		slog.Warn("season seed failed", "err", ierr)
		return fallback
	}
	if gerr := s.db.GetContext(ctx, &row, `
		SELECT name, start_date, end_date FROM seasons
		WHERE start_date <= ? AND end_date > ?
		ORDER BY start_date DESC LIMIT 1`, today, today); gerr == nil && row.Name != "" {
		if start, perr := parseUTCDate(row.StartDate); perr == nil {
			if end, perr2 := parseUTCDate(row.EndDate); perr2 == nil && end.After(start) {
				return Season{Name: row.Name, Start: start, End: end}
			}
		}
	}
	return fallback
}

func parseUTCDate(s string) (time.Time, error) {
	if len(s) > 10 {
		s = s[:10]
	}
	return time.ParseInLocation("2006-01-02", s, time.UTC)
}

// CurrentSeasonLabel resolves the active season name for display; empty when
// lookup fails so callers fall back to SeasonLabel.
func (s *Store) CurrentSeasonLabel(ctx context.Context, now time.Time) string {
	return s.CurrentSeason(ctx, now).Name
}

type SeasonStats struct {
	Season      string  `json:"season"`
	SeasonStart string  `json:"season_start,omitempty"`
	SeasonEnd   string  `json:"season_end,omitempty"`
	Username    string  `json:"username,omitempty"`
	TotalXP     int     `json:"total_xp"`
	SeasonXP    int     `json:"season_xp"`
	WeeklyXP    int     `json:"weekly_xp"`
	Level       int     `json:"level"`
	XPToNext    int     `json:"xp_to_next_level"`
	StreakWeeks int     `json:"streak_weeks"`
	MergedCount int     `json:"merged_count"`
	SeasonRank  *int    `json:"season_rank"`
	Percentile  *float64 `json:"percentile"`
}

type LeaderboardEntry struct {
	Rank        int    `json:"rank"`
	UserID      int64  `json:"-"`
	Login       string `json:"login"`
	Level       int    `json:"level"`
	StreakWeeks int    `json:"streak_weeks"`
	WeeklyXP    int    `json:"weekly_xp"`
	SeasonXP    int    `json:"season_xp"`
	TotalXP     int    `json:"total_xp"`
}

// --- Awarding ---------------------------------------------------------------

// AwardXPs inserts xp_events for pr_evaluations rows already tracked by
// /api/v1/pr-evals (AC1): terminal 'hit'|'miss' verdicts map deterministically
// to merged (+50, PR merged) or reviewed (+10, closed after review); anything
// else is skipped and logged (AC5). Reviewed awards are capped at
// MaxReviewsPerWeek per user-week (AC7). userID=nil runs the full cron pass;
// non-nil lazily awards just that user before stats reads. Returns inserted rows.
func (s *Store) AwardXPs(ctx context.Context, userID *int64) (int64, error) {
	type evalRow struct {
		ID       int64      `db:"id"`
		UID      int64      `db:"uid"`
		Outcome  *string    `db:"outcome"`
		MergedAt *time.Time `db:"merged_at"`
	}
	q := `SELECT id, owner_user_id AS uid, outcome, merged_at
		FROM pr_evaluations WHERE owner_user_id IS NOT NULL`
	args := []any{}
	if userID != nil {
		q += ` AND owner_user_id = ?`
		args = append(args, *userID)
	}
	rows := []evalRow{}
	if err := s.db.SelectContext(ctx, &rows, q, args...); err != nil {
		return 0, err
	}

	var inserted int64
	var skipped int
	for _, r := range rows {
		outcome := ""
		if r.Outcome != nil {
			outcome = *r.Outcome
		}
		switch {
		case outcome == EvalOutcomeHit || outcome == EvalOutcomeMiss:
			// known scored outcome
		default:
			skipped++ // pending/unverifiable/null/unknown: never awarded (AC5)
			continue
		}
		if r.MergedAt != nil {
			n, err := s.insertXPEvent(ctx, r.UID, XPSourceMerged, r.ID, XPMerged)
			inserted += n
			if err != nil {
				continue
			}
			continue
		}
		// Closed after review: capped at MaxReviewsPerWeek per UTC week (AC7).
		if s.reviewCountThisWeek(ctx, r.UID, WeekStart(time.Now())) >= MaxReviewsPerWeek {
			continue
		}
		if n, err := s.insertXPEvent(ctx, r.UID, XPSourceReviewed, r.ID, XPReviewed); err == nil {
			inserted += n
		}
	}
	if skipped > 0 {
		slog.Warn("xp award skipped unscored eval outcomes", "count", skipped)
	}
	return inserted, nil
}

// reviewCountThisWeek counts reviewed events already awarded in the UTC week
// starting weekStart (AC7 cap).
func (s *Store) reviewCountThisWeek(ctx context.Context, userID int64, weekStart time.Time) int {
	var n int
	if err := s.db.GetContext(ctx, &n, `
		SELECT COUNT(*) FROM xp_events
		WHERE user_id = ? AND source = ? AND created_at >= ?`,
		userID, XPSourceReviewed, weekStart); err != nil {
		return MaxReviewsPerWeek // fail closed: never exceed the cap
	}
	return n
}

// insertXPEvent writes one event keyed by its source eval for auditability
// (AC1/AC7); UNIQUE(source, eval_id) makes any replay a no-op.
func (s *Store) insertXPEvent(ctx context.Context, userID int64, source string, evalID int64, xp int) (int64, error) {
	cols := `(user_id, source, eval_id, xp)`
	mysql := `INSERT IGNORE INTO xp_events ` + cols + ` VALUES (?, ?, ?, ?)`
	sqlite := `INSERT INTO xp_events ` + cols + ` VALUES (?, ?, ?, ?)
		ON CONFLICT(source, eval_id) DO NOTHING`
	q := mysql
	if s.db.DriverName() == "sqlite" {
		q = sqlite
	}
	res, err := s.db.ExecContext(ctx, q, userID, source, evalID, xp)
	if err != nil {
		return 0, err
	}
	n, _ := res.RowsAffected()
	return n, nil
}

// --- Streak -------------------------------------------------------------------

// WeeklyStreak derives AC4's consecutive-week streak from xp_events: count
// consecutive UTC Mon-weeks with >= 1 event walking backwards from the current
// week, or from last week when the current week has no event yet (streak stays
// alive until the week ends). One fully missed week resets to 0. Derived from
// deduped events, so replays can never double-increment.
func (s *Store) WeeklyStreak(ctx context.Context, userID int64, now time.Time) int {
	since := WeekStart(now).AddDate(0, 0, -7*52*2) // ~2y cap
	var stamps []time.Time
	if err := s.db.SelectContext(ctx, &stamps, `
		SELECT created_at FROM xp_events WHERE user_id = ? AND created_at >= ?`,
		userID, since); err != nil {
		return 0
	}
	has := map[int64]bool{}
	oldest := int64(0)
	for _, t := range stamps {
		if t.IsZero() {
			continue
		}
		w := WeekStart(t).Unix()
		has[w] = true
		if oldest == 0 || w < oldest {
			oldest = w
		}
	}
	cur := WeekStart(now).Unix()
	if !has[cur] {
		cur -= 7 * 24 * 3600
	}
	n := 0
	for has[cur] {
		n++
		cur -= 7 * 24 * 3600
	}
	// Any surviving event below the contiguous run proves a week was missed
	// mid-history: that miss already reset the streak to 0 (AC2).
	if oldest != 0 && oldest < cur {
		return 0
	}
	return n
}

// --- Stats ------------------------------------------------------------------

// GetSeasonStats computes season XP/level/rank plus the weekly streak from
// stored xp_events (AC2/AC3/AC4), lazily awarding first. Zero-state users get
// Level 0 / 0 XP / nil rank.
func (s *Store) GetSeasonStats(ctx context.Context, userID int64) (*SeasonStats, error) {
	now := time.Now().UTC()
	if _, err := s.AwardXPs(ctx, &userID); err != nil { // lazy top-up; failures fall back to stored events
		slog.Warn("xp lazy award failed", "user_id", userID, "err", err)
	}
	season := s.CurrentSeason(ctx, now)
	weekStart := WeekStart(now)

	stats := &SeasonStats{
		Season:      season.Name,
		SeasonStart: utcDate(season.Start),
		SeasonEnd:   utcDate(season.End),
	}
	var totals struct {
		Total    int `db:"total"`
		Seasonal int `db:"seasonal"`
		Weekly   int `db:"weekly"`
		Merged   int `db:"merged"`
	}
	if err := s.db.GetContext(ctx, &totals, `
		SELECT COALESCE(SUM(xp), 0) AS total,
		       COALESCE(SUM(CASE WHEN created_at >= ? AND created_at < ? THEN xp ELSE 0 END), 0) AS seasonal,
		       COALESCE(SUM(CASE WHEN created_at >= ? AND created_at < ? THEN xp ELSE 0 END), 0) AS weekly,
		       COALESCE(SUM(CASE WHEN source = ? THEN 1 ELSE 0 END), 0) AS merged
		FROM xp_events WHERE user_id = ?`,
		season.Start, season.End, weekStart, weekStart.AddDate(0, 0, 7), XPSourceMerged, userID); err != nil {
		return nil, err
	}
	stats.TotalXP = totals.Total
	stats.SeasonXP = totals.Seasonal
	stats.WeeklyXP = totals.Weekly
	stats.MergedCount = totals.Merged
	stats.Level = LevelForXP(totals.Seasonal) // AC2: level from season XP only
	stats.XPToNext = XPToNextLevel(totals.Seasonal)
	stats.StreakWeeks = s.WeeklyStreak(ctx, userID, now)

	var login string
	if err := s.db.GetContext(ctx, &login, `
		SELECT COALESCE(NULLIF(pc.github_login, ''), username, '')
		FROM users
		LEFT JOIN pr_connections pc ON pc.user_id = users.id
		WHERE users.id = ?`, userID); err == nil {
		stats.Username = login
	}

	if stats.SeasonXP > 0 { // AC2: ranks only from events within [start,end)
		rank, pct := s.seasonRank(ctx, userID, season)
		stats.SeasonRank = rank
		stats.Percentile = pct
	}
	return stats, nil
}

// seasonRank returns the caller's 1-based position by season XP desc (ties
// broken by user id for full determinism) and the percentile of ranked peers
// strictly below them; both nil-safe.
func (s *Store) seasonRank(ctx context.Context, userID int64, season Season) (*int, *float64) {
	var mine, ahead, total int
	if err := s.db.GetContext(ctx, &mine, `
		SELECT COALESCE(SUM(xp), 0) FROM xp_events
		WHERE user_id = ? AND created_at >= ? AND created_at < ?`, userID, season.Start, season.End); err != nil {
		return nil, nil
	}
	if err := s.db.GetContext(ctx, &ahead, `
		SELECT COUNT(*) FROM (
			SELECT user_id FROM xp_events
			WHERE created_at >= ? AND created_at < ?
			GROUP BY user_id
			HAVING SUM(xp) > ?
		) t`, season.Start, season.End, mine); err != nil {
		return nil, nil
	}
	if err := s.db.GetContext(ctx, &total, `
		SELECT COUNT(*) FROM (
			SELECT DISTINCT user_id FROM xp_events
			WHERE created_at >= ? AND created_at < ?
		) t`, season.Start, season.End); err != nil {
		return nil, nil
	}
	rank := ahead + 1
	pct := 100.0
	if total > 0 {
		pct = float64(total-rank) / float64(total) * 100
	}
	if pct < 0 {
		pct = 0
	}
	return &rank, &pct
}

// --- Leaderboard ------------------------------------------------------------

// WeeklyContributorLeaderboard ranks contributors by season-week XP desc, then
// current streak desc, then username asc — fully deterministic (AC6). Levels
// and season XP derive from the active season window (AC2).
func (s *Store) WeeklyContributorLeaderboard(ctx context.Context, limit int) ([]LeaderboardEntry, error) {
	if limit > MaxLeaderboardSize {
		limit = MaxLeaderboardSize
	}
	if limit <= 0 {
		limit = DefaultLeaderboardSize
	}
	now := time.Now().UTC()
	season := s.CurrentSeason(ctx, now)
	weekStart := WeekStart(now)

	type boardRow struct {
		UserID   int64  `db:"user_id"`
		WeeklyXP int    `db:"weekly_xp"`
		SeasonXP int    `db:"season_xp"`
		TotalXP  int    `db:"total_xp"`
		Login    string `db:"login"`
	}
	rows := []boardRow{}
	err := s.db.SelectContext(ctx, &rows, `
		SELECT t.user_id, t.weekly_xp, t.season_xp, lt.total_xp,
			COALESCE(NULLIF(pc.github_login, ''), u.username, '') AS login
		FROM (
			SELECT user_id,
			       COALESCE(SUM(CASE WHEN created_at >= ? THEN xp ELSE 0 END), 0) AS weekly_xp,
			       COALESCE(SUM(xp), 0) AS season_xp
			FROM xp_events
			WHERE created_at >= ? AND created_at < ?
			GROUP BY user_id
		) t
		JOIN users u ON u.id = t.user_id
		LEFT JOIN (
			SELECT user_id, SUM(xp) AS total_xp FROM xp_events GROUP BY user_id
		) lt ON lt.user_id = t.user_id
		LEFT JOIN pr_connections pc ON pc.user_id = t.user_id
		WHERE t.weekly_xp > 0 AND COALESCE(NULLIF(pc.github_login, ''), u.username, '') <> ''
		ORDER BY t.user_id`, weekStart, season.Start, season.End)
	if err != nil {
		return nil, err
	}

	entries := make([]LeaderboardEntry, 0, len(rows))
	for _, r := range rows {
		entries = append(entries, LeaderboardEntry{
			UserID:      r.UserID,
			Login:       r.Login,
			Level:       LevelForXP(r.SeasonXP),
			StreakWeeks: s.WeeklyStreak(ctx, r.UserID, now),
			WeeklyXP:    r.WeeklyXP,
			SeasonXP:    r.SeasonXP,
			TotalXP:     r.TotalXP,
		})
	}
	// AC6 ordering: season-week XP DESC -> streak DESC -> username ASC.
	sort.SliceStable(entries, func(i, j int) bool {
		if entries[i].WeeklyXP != entries[j].WeeklyXP {
			return entries[i].WeeklyXP > entries[j].WeeklyXP
		}
		if entries[i].StreakWeeks != entries[j].StreakWeeks {
			return entries[i].StreakWeeks > entries[j].StreakWeeks
		}
		return entries[i].Login < entries[j].Login
	})
	if len(entries) > limit {
		entries = entries[:limit]
	}
	for i := range entries {
		entries[i].Rank = i + 1
	}
	return entries, nil
}
