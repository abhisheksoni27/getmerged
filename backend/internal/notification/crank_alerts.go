package notification

import (
	"context"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"errors"
	"fmt"
	"log/slog"
	"strings"
	"sync"
	"time"

	"github.com/jmoiron/sqlx"
)

// CRankAlertConfig carries the dependencies of one C-Rank change alert run.
// Zero-valued tunables fall back to the package defaults; production wiring
// passes config/env values (ALERT_DROP_THRESHOLD etc.).
type CRankAlertConfig struct {
	Mailer    DigestMailer
	BaseURL   string
	JobSecret string

	DropThresholdPoints float64       // AC1: default DefaultAlertDropPoints
	Cooldown            time.Duration // AC4: default DefaultAlertCooldown
	MaxSendFailures     int           // AC3: default DefaultMaxSendFailures
}

func (c CRankAlertConfig) dropPoints() float64 {
	if c.DropThresholdPoints > 0 {
		return c.DropThresholdPoints
	}
	return DefaultAlertDropPoints
}

func (c CRankAlertConfig) cooldown() time.Duration {
	if c.Cooldown > 0 {
		return c.Cooldown
	}
	return DefaultAlertCooldown
}

func (c CRankAlertConfig) maxSendFailures() int {
	if c.MaxSendFailures > 0 {
		return c.MaxSendFailures
	}
	return DefaultMaxSendFailures
}

// CRankAlertSummary reports the outcome of one alert run.
type CRankAlertSummary struct {
	WatchersConsidered int `json:"watchers_considered"`
	AlertsFound        int `json:"alerts_found"`
	Sent               int `json:"sent"`
	Failed             int `json:"failed"`
	SkippedCooldown    int `json:"skipped_cooldown"`
	Baselined          int `json:"baselined"`
	DeadLettered       int `json:"dead_lettered"`
	CASLost            int `json:"cas_lost"`
}

type crankWatcher struct {
	UserID   int64  `db:"user_id"`
	Email    string `db:"email"`
	RepoID   string `db:"repo_id"`
	FullName string `db:"full_name"`
}

type crankSnap struct {
	Date  string  `db:"snapshot_date"`
	Score float64 `db:"c_rank_score"`
	Tier  string  `db:"c_rank_tier"`

	Hash string `db:"-"`
}

// rankHash fingerprints a snapshot's C-Rank content for CAS writes (AC2/AC6).
func rankHash(s crankSnap) string {
	sum := sha256.Sum256([]byte(fmt.Sprintf("%s|%s|%.4f", s.Date, s.Tier, s.Score)))
	return hex.EncodeToString(sum[:])
}

// crankState is one watcher/repo alert row. RankHash is the last-alerted (or
// baseline) rank fingerprint guarded by compare-and-swap updates.
type crankState struct {
	Tier           string  `db:"last_alerted_tier"`
	Score          float64 `db:"last_alerted_score"`
	SnapDate       string  `db:"last_alerted_snapshot_date"`
	NotifiedUnix   int64   `db:"last_notified_unix"`
	RankHash       string  `db:"rank_hash"`
	FailCount      int     `db:"fail_count"`
	DeadLettered   bool    `db:"dead_lettered"`
	LastFailedHash string  `db:"last_failed_hash"`
}

// Per-repo mutexes: check+send+state-write runs under one lock per repo, so
// concurrent cycles in this process can neither double-send nor lose a
// state update. The DB-level CAS below is the second line of defense across
// processes (AC6).
var (
	crankLockMu    sync.Mutex
	crankRepoLocks = map[string]*sync.Mutex{}
)

func crankRepoMutex(repoID string) *sync.Mutex {
	crankLockMu.Lock()
	defer crankLockMu.Unlock()
	m, ok := crankRepoLocks[repoID]
	if !ok {
		m = &sync.Mutex{}
		crankRepoLocks[repoID] = m
	}
	return m
}

// RunCRankChangeAlerts evaluates every opted-in watcher/repo pair against the
// newest daily_snapshots C-Rank value and emails when the repo changes letter
// tier or drops at least DropThresholdPoints vs the last-alerted snapshot
// (AC1). Ordering is send-then-persist: the rank hash is written only after a
// confirmed successful send, via compare-and-swap on the previously read hash
// (AC2/AC6). First-ever snapshots silently store the baseline hash (AC5).
func RunCRankChangeAlerts(ctx context.Context, db *sqlx.DB, cfg CRankAlertConfig) (*CRankAlertSummary, error) {
	now := time.Now().UTC()
	summary := &CRankAlertSummary{}

	watchers, err := selectCrankWatchers(ctx, db)
	if err != nil {
		return nil, fmt.Errorf("crank-alert watchers query: %w", err)
	}
	summary.WatchersConsidered = len(watchers)

	byRepo := map[string][]crankWatcher{}
	order := make([]string, 0, len(watchers))
	for _, w := range watchers {
		if _, ok := byRepo[w.RepoID]; !ok {
			order = append(order, w.RepoID)
		}
		byRepo[w.RepoID] = append(byRepo[w.RepoID], w)
	}

	for _, repoID := range order {
		processCrankRepo(ctx, db, cfg, repoID, byRepo[repoID], now, summary)
	}
	return summary, nil
}

// processCrankRepo evaluates one repo for all its watchers under the per-repo
// mutex.
func processCrankRepo(ctx context.Context, db *sqlx.DB, cfg CRankAlertConfig, repoID string, group []crankWatcher, now time.Time, summary *CRankAlertSummary) {
	mu := crankRepoMutex(repoID)
	mu.Lock()
	defer mu.Unlock()

	var latest crankSnap
	err := db.GetContext(ctx, &latest, `
		SELECT snapshot_date, c_rank_score, COALESCE(c_rank_tier,'') AS c_rank_tier
		FROM daily_snapshots
		WHERE repository_id = ?
		ORDER BY snapshot_date DESC
		LIMIT 1
	`, repoID)
	if errors.Is(err, sql.ErrNoRows) {
		return // no snapshot history yet; nothing to baseline or compare
	}
	if err != nil {
		slog.Error("crank-alert: snapshot lookup failed", "repo_id", repoID, "err", err)
		return
	}
	latest.Hash = rankHash(latest)

	for _, w := range group {
		st, err := getCrankState(ctx, db, w.UserID, repoID)
		if err != nil {
			summary.Failed++
			slog.Error("crank-alert: state lookup failed", "user_id", w.UserID, "repo_id", repoID, "err", err)
			continue
		}

		if st == nil {
			// AC5: first sighting of this watcher/repo pair - store the
			// baseline hash silently and send nothing.
			if err := insertCrankBaseline(ctx, db, w.UserID, repoID, latest); err != nil {
				summary.Failed++
				slog.Error("crank-alert: baseline store failed", "user_id", w.UserID, "repo_id", repoID, "err", err)
				continue
			}
			summary.Baselined++
			continue
		}

		// Legacy rows written before rank_hash existed: backfill as baseline.
		if st.RankHash == "" {
			_, _ = db.ExecContext(ctx,
				`UPDATE crank_alert_state SET last_failed_hash='', fail_count=0, dead_lettered=FALSE, rank_hash=? WHERE user_id=? AND repo_id=? AND rank_hash=''`,
				latest.Hash, w.UserID, repoID)
			continue
		}

		// AC3: dead-lettered pairs stay silent until the alert condition
		// itself moves to a different snapshot.
		if st.DeadLettered {
			if st.LastFailedHash == latest.Hash {
				summary.DeadLettered++
				continue
			}
			// New real change: revive the pair and re-evaluate from scratch.
			res, err := db.ExecContext(ctx,
				`UPDATE crank_alert_state SET fail_count=0, dead_lettered=FALSE, last_failed_hash='' WHERE user_id=? AND repo_id=? AND rank_hash=?`,
				w.UserID, repoID, st.RankHash)
			if err != nil || affectedOrLost(res, err) == 0 {
				continue // lost revival race; another cycle will retry
			}
			st.FailCount, st.DeadLettered, st.LastFailedHash = 0, false, ""
		}

		// Already alerted (or baselined) for this exact snapshot content.
		if st.RankHash == latest.Hash {
			continue
		}

		tierChanged := st.Tier != "" && latest.Tier != "" && st.Tier != latest.Tier
		drop := st.Score - latest.Score
		if !tierChanged && drop < cfg.dropPoints() {
			continue // AC1: below both thresholds vs last-alerted snapshot
		}
		summary.AlertsFound++

		// AC4: minimum cooldown between emails per watcher/repo pair.
		if st.NotifiedUnix > 0 && now.Unix()-st.NotifiedUnix < int64(cfg.cooldown()/time.Second) {
			summary.SkippedCooldown++
			continue
		}

		sendErr := sendCrankAlert(ctx, cfg, w, st, latest, drop, tierChanged)
		if sendErr != nil {
			recordCrankFailure(ctx, db, w.UserID, repoID, st, latest, sendErr, cfg.maxSendFailures(), summary)
			continue
		}

		// AC2/AC6: persist via CAS keyed on the previously read hash. A loser
		// means another writer already advanced the hash for this pair.
		n := casCrankState(ctx, db, w.UserID, repoID, st.RankHash, func() []any {
			return []any{latest.Tier, latest.Score, latest.Date, now.Unix(), latest.Hash}
		})
		switch n {
		case 1:
			summary.Sent++
		case 0:
			summary.CASLost++
			slog.Warn("crank-alert: CAS lost, concurrent writer advanced hash", "user_id", w.UserID, "repo_id", repoID)
		default:
			summary.Failed++
			slog.Error("crank-alert: state save failed", "user_id", w.UserID, "repo_id", repoID)
		}
	}
}

func affectedOrLost(res sql.Result, err error) int64 {
	if err != nil {
		return -1
	}
	n, rerr := res.RowsAffected()
	if rerr != nil {
		return -1
	}
	return n
}

// casCrankState runs the conditional update keyed on prevHash. Returns 1 on
// win, 0 on lost race, -1 on DB error.
func casCrankState(ctx context.Context, db *sqlx.DB, userID int64, repoID, prevHash string, vals func() []any) int {
	res, err := db.ExecContext(ctx, `
		UPDATE crank_alert_state
		SET last_alerted_tier=?, last_alerted_score=?, last_alerted_snapshot_date=?, last_notified_unix=?, rank_hash=?,
		    fail_count=0, dead_lettered=FALSE, last_failed_hash=''
		WHERE user_id=? AND repo_id=? AND rank_hash=?
	`, append(vals(), userID, repoID, prevHash)...)
	if err != nil {
		return -1
	}
	n, _ := res.RowsAffected()
	return int(n)
}

// recordCrankFailure bumps the consecutive-failure counter without touching
// rank_hash (AC2), dead-lettering after maxFails strikes (AC3). Hard bounces
// additionally flag the watcher e-mail invalid (AC8).
func recordCrankFailure(ctx context.Context, db *sqlx.DB, userID int64, repoID string, st *crankState, latest crankSnap, sendErr error, maxFails int, summary *CRankAlertSummary) {
	summary.Failed++
	if IsHardBounce(sendErr) {
		if _, err := db.ExecContext(ctx,
			`UPDATE users SET email_invalid=TRUE, updated_at=CURRENT_TIMESTAMP WHERE id=?`, userID); err != nil {
			slog.Error("crank-alert: email-invalid flag failed", "user_id", userID, "err", err)
		}
		slog.Warn("crank-alert: hard bounce, suppressing sends until re-verify", "user_id", userID, "reason", "hard_bounce")
	}

	failCount := st.FailCount + 1
	dead := failCount >= maxFails
	res, err := db.ExecContext(ctx, `
		UPDATE crank_alert_state
		SET fail_count=?, dead_lettered=?, last_failed_hash=?
		WHERE user_id=? AND repo_id=? AND rank_hash=?
	`, failCount, dead, latest.Hash, userID, repoID, st.RankHash)
	if err != nil || affectedOrLost(res, err) == 0 {
		slog.Error("crank-alert: failure bookkeeping lost", "user_id", userID, "repo_id", repoID)
		return
	}
	if dead {
		summary.DeadLettered++
		slog.Warn("crank-alert: dead-lettered after repeated send failures",
			"user_id", userID, "repo_id", repoID, "failures", failCount)
	}
}

// insertCrankBaseline stores the first-seen snapshot hash for a new
// watcher/repo pair without sending anything (AC5). The PK conflict clause
// makes concurrent first-writers converge on exactly one baseline row.
func insertCrankBaseline(ctx context.Context, db *sqlx.DB, userID int64, repoID string, latest crankSnap) error {
	clause := "INSERT INTO"
	if db.DriverName() == "sqlite" {
		clause = "INSERT OR IGNORE INTO"
	} else {
		clause = "INSERT IGNORE INTO"
	}
	_, err := db.ExecContext(ctx, clause+` crank_alert_state
		(user_id, repo_id, last_alerted_tier, last_alerted_score, last_alerted_snapshot_date, last_notified_unix, rank_hash, fail_count, dead_lettered, last_failed_hash)
		VALUES (?, ?, ?, ?, ?, 0, ?, 0, FALSE, '')
	`, userID, repoID, latest.Tier, latest.Score, latest.Date, latest.Hash)
	return err
}

// selectCrankWatchers returns opted-in watchers with their email. Unsubscribed
// users and users flagged with an invalid/bouncing address are filtered out
// here, before any ranking comparison (AC8).
func selectCrankWatchers(ctx context.Context, db *sqlx.DB) ([]crankWatcher, error) {
	var watchers []crankWatcher
	err := db.SelectContext(ctx, &watchers, `
		SELECT w.user_id, COALESCE(u.email,'') AS email, w.repo_id, COALESCE(r.full_name,'') AS full_name
		FROM user_watchlists w
		JOIN users u ON u.id = w.user_id
		JOIN repositories r ON r.id = w.repo_id
		WHERE w.notify_rank_change = TRUE
		  AND COALESCE(u.digest_unsubscribed, FALSE) = FALSE
		  AND COALESCE(u.email_invalid, FALSE) = FALSE
		  AND u.deleted_at IS NULL
		  AND COALESCE(u.email,'') <> ''
		ORDER BY w.repo_id, w.user_id
	`)
	if watchers == nil {
		watchers = []crankWatcher{}
	}
	return watchers, err
}

func getCrankState(ctx context.Context, db *sqlx.DB, userID int64, repoID string) (*crankState, error) {
	var st crankState
	err := db.GetContext(ctx, &st, `
		SELECT last_alerted_tier, last_alerted_score, last_alerted_snapshot_date, last_notified_unix,
		       COALESCE(rank_hash,'') AS rank_hash, COALESCE(fail_count,0) AS fail_count,
		       COALESCE(dead_lettered,FALSE) AS dead_lettered, COALESCE(last_failed_hash,'') AS last_failed_hash
		FROM crank_alert_state
		WHERE user_id = ? AND repo_id = ?
	`, userID, repoID)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &st, nil
}

func sendCrankAlert(ctx context.Context, cfg CRankAlertConfig, w crankWatcher, st *crankState, latest crankSnap, drop float64, tierChanged bool) error {
	if cfg.Mailer == nil {
		return errors.New("no mailer configured")
	}
	base := cfg.BaseURL
	if base == "" {
		base = "https://getmerged.abhishekco.de"
	}
	subject := crankAlertSubject(w.FullName, st.Tier, latest.Tier, drop, tierChanged)
	text, html := crankAlertBodies(base, cfg.JobSecret, w, st.Tier, latest.Tier, st.Score, latest.Score, drop, tierChanged)
	return cfg.Mailer.Send(ctx, w.Email, subject, text, html)
}

func crankAlertSubject(fullName, priorTier, latestTier string, drop float64, tierChanged bool) string {
	switch {
	case tierChanged && tierDown(priorTier, latestTier):
		return fmt.Sprintf("⚠️ C-Rank alert: %s dropped %s → %s", fullName, priorTier, latestTier)
	case tierChanged:
		return fmt.Sprintf("C-Rank alert: %s improved %s → %s", fullName, priorTier, latestTier)
	default:
		return fmt.Sprintf("⚠️ C-Rank alert: %s dropped %.0f C-Rank points", fullName, drop)
	}
}

// crankAlertBodies renders text/HTML bodies including the existing expiring
// unsubscribe link (AC7).
func crankAlertBodies(baseURL, jobSecret string, w crankWatcher, priorTier, latestTier string, priorScore, latestScore, drop float64, tierChanged bool) (string, string) {
	trendURL := fmt.Sprintf("%s/repos/%s/trend", baseURL, w.RepoID)
	unsubURL := fmt.Sprintf("%s/unsubscribe?uid=%d&token=%s", baseURL, w.UserID, UnsubscribeToken(w.UserID, jobSecret))
	delta := fmt.Sprintf("%+.1f pts", -(drop)) // negative when the score fell

	var change string
	if tierChanged {
		change = fmt.Sprintf("Tier: %s → %s", priorTier, latestTier)
	} else {
		change = fmt.Sprintf("Change: dropped %.1f points since your last alert", drop)
	}

	text := strings.Join([]string{
		fmt.Sprintf("Your watched repo %s just changed C-Rank.", w.FullName),
		"",
		fmt.Sprintf("Score: %.1f → %.1f (%s)", priorScore, latestScore, delta),
		change,
		"",
		fmt.Sprintf("Check the trend before investing PR effort: %s", trendURL),
		"",
		fmt.Sprintf("Don't want these emails? Unsubscribe: %s", unsubURL),
	}, "\n")

	html := fmt.Sprintf(`<div style="font-family: sans-serif;">
<p style="margin:0 0 8px 0;">Your watched repo <strong>%s</strong> just changed C-Rank.</p>
<p style="margin:0 0 4px 0; font-size:14px; color:#475569;">Score: %.1f → %.1f (%s)<br>%s</p>
<p style="margin:0 0 16px 0;"><a href="%s" style="color:#2563eb;">Check the trend before investing PR effort</a></p>
<p style="font-size:12px; color:#94a3b8;"><a href="%s" style="color:#64748b;">Unsubscribe from watchlist alerts</a></p>
</div>`, w.FullName, priorScore, latestScore, delta, change, trendURL, unsubURL)

	return text, html
}
