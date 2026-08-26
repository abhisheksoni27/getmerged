package notification

import (
	"context"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"errors"
	"fmt"
	"log/slog"
	"math"
	"strings"
	"sync"
	"time"

	"github.com/jmoiron/sqlx"
)

const (
	// crankSendPace throttles digest emails to a provider-safe ~100/min
	// (AC7): one email per 600ms avoids burst 429s without queue infra.
	crankSendPace = 600 * time.Millisecond
	// crankBaselineCommitRetries bounds the post-send snapshot-write tx
	// (AC5): retried up to 3x, then logged — a possible duplicate next
	// night is accepted over queue infra (low-harm domain).
	crankBaselineCommitRetries = 3
	// crankRescoreMaxAge bounds how stale a rescore-completion marker may be
	// before alerts are skipped for the day (AC4: no stale/partial sends).
	crankRescoreMaxAge = 26 * time.Hour
)

// CRankAlertConfig carries the dependencies of one C-Rank change alert run.
// DeltaThresholdPoints falls back to DefaultAlertDeltaPoints; production
// wiring passes config/env value ALERT_DROP_THRESHOLD (AC1: the single knob
// governing the ±delta policy; any tier change alerts regardless).
type CRankAlertConfig struct {
	Mailer    DigestMailer
	BaseURL   string
	JobSecret string

	DeltaThresholdPoints float64 // AC1: default DefaultAlertDeltaPoints

	// DryRun reports what would alert (and which baselines are missing)
	// without writing state or sending anything (AC7 verification).
	DryRun bool

	// RequireFreshRescore skips the whole cycle when no rescore-completion
	// event was recorded recently (AC4 watchdog guard). Production nightly
	// wiring sets it; manual/dry-run triggers leave it off.
	RequireFreshRescore bool
}

func (c CRankAlertConfig) deltaPoints() float64 {
	if c.DeltaThresholdPoints > 0 {
		return c.DeltaThresholdPoints
	}
	return DefaultAlertDeltaPoints
}

// CRankAlertSummary reports the outcome of one alert run.
type CRankAlertSummary struct {
	WatchersConsidered  int `json:"watchers_considered"`
	AlertsFound         int `json:"alerts_found"`
	Queued              int `json:"queued"`
	Baselined           int `json:"baselined"`
	EmailsSent          int `json:"emails_sent"`
	EmailsFailed        int `json:"emails_failed"`
	Retrying            int `json:"retrying"`
	DeadLettered        int `json:"dead_lettered"`
	UnsubscribedSkipped int `json:"unsubscribed_skipped"`
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

// crankLatest is the newest snapshot of a repo plus the two driver metrics
// surfaced in alert emails: maintainer response time (median hours to first
// response) and merge velocity (external PR merge rate).
type crankLatest struct {
	Snap          crankSnap
	MergeRate     float64
	ResponseHours float64
}

// crankOutboxRow is one queued alert entry: one watched repo's shift for one
// user on one night (unique key user/repo/alert_date keeps enqueue
// idempotent). Baseline state is only advanced AFTER the email is accepted
// (AC5 ordering), so a send failure leaves all alert state untouched and the
// shift re-fires naturally on the next nightly diff.
type crankOutboxRow struct {
	ID            int64   `db:"id"`
	UserID        int64   `db:"user_id"`
	RepoID        string  `db:"repo_id"`
	FullName      string  `db:"full_name"`
	PrevTier      string  `db:"prev_tier"`
	NewTier       string  `db:"new_tier"`
	PrevScore     float64 `db:"prev_score"`
	NewScore      float64 `db:"new_score"`
	MergeRate     float64 `db:"merge_rate"`
	ResponseHours float64 `db:"response_hours"`
	Attempts      int     `db:"attempts"`

	// PrevRankHash fingerprints the baseline this alert was diffed against;
	// NewSnapDate is the new snapshot's date. Both let the post-send commit
	// advance the baseline to exactly the alerted content (AC5).
	PrevRankHash string `db:"prev_rank_hash"`
	NewSnapDate  string `db:"new_snap_date"`
}

// rankHash fingerprints a snapshot's C-Rank content for CAS writes (AC2/AC6).
func rankHash(s crankSnap) string {
	sum := sha256.Sum256([]byte(fmt.Sprintf("%s|%s|%.4f", s.Date, s.Tier, s.Score)))
	return hex.EncodeToString(sum[:])
}

// crankState is one watcher/repo alert baseline. RankHash is the
// last-alerted (or seeded) rank fingerprint guarded by compare-and-swap
// updates.
type crankState struct {
	Tier         string  `db:"last_alerted_tier"`
	Score        float64 `db:"last_alerted_score"`
	SnapDate     string  `db:"last_alerted_snapshot_date"`
	RankHash     string  `db:"rank_hash"`
	FailCount    int     `db:"fail_count"`
	DeadLettered bool    `db:"dead_lettered"`
}

// Per-repo mutexes serialize diff+state-advance per repo inside this process;
// the DB-level CAS below is the second line of defense across processes.
var (
	crankLockMu    sync.Mutex
	crankRepoLocks = map[string]*sync.Mutex{}
	crankUserLocks = map[string]*sync.Mutex{}
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

func crankUserMutex(userID int64) *sync.Mutex {
	crankLockMu.Lock()
	defer crankLockMu.Unlock()
	key := fmt.Sprintf("u%d", userID)
	m, ok := crankUserLocks[key]
	if !ok {
		m = &sync.Mutex{}
		crankUserLocks[key] = m
	}
	return m
}

// RunCRankChangeAlerts executes one nightly C-Rank change alert cycle. It
// must run strictly after the rescore completes (chained via
// pipeline.CRankAlertHook, never cron-raced). Phase 1 diffs every opted-in
// watcher/repo pair against its stored baseline and enqueues outbox rows for
// material shifts: any tier change (either direction) OR |score delta| >=
// DeltaThresholdPoints (AC3). Phase 2 drains the outbox: diffs per user ->
// send email -> on success a single transaction advances all that user's
// baselines with last_alerted = UTC run date (AC5). Send failure writes no
// alert state; the shift retries naturally on the next nightly diff. Sends
// are paced ~100/min (AC7) and one batched email per user per cycle (AC3).
func RunCRankChangeAlerts(ctx context.Context, db *sqlx.DB, cfg CRankAlertConfig) (*CRankAlertSummary, error) {
	now := time.Now().UTC()
	summary := &CRankAlertSummary{}

	// AC4 watchdog guard: never fan out on stale/partial scores. The nightly
	// hook records the completion marker right before this call, so a missing
	// or old marker means the rescore did not finish — skip today.
	if cfg.RequireFreshRescore && !rescoreCompletedRecently(ctx, db, crankRescoreMaxAge) {
		slog.Error("crank-alert: no fresh rescore-completion event; skipping alerts today (AC4)")
		return summary, nil
	}

	if cfg.DryRun {
		if err := dryRunCrankDiff(ctx, db, cfg, now, summary); err != nil {
			return summary, err
		}
		slog.Info("crank-alert dry-run complete",
			"watchers_considered", summary.WatchersConsidered,
			"alerts_found", summary.AlertsFound,
			"baselines_missing", summary.Baselined,
		)
		return summary, nil
	}

	// Cross-process guard: overlapping cycles would double-enqueue and
	// double-send; losers exit immediately (AC1).
	release, ok := TryJobLock(ctx, db, "crank_alert_run", 15*time.Minute)
	if !ok {
		slog.Info("crank-alert: another run holds the advisory lock, skipping")
		return summary, nil
	}
	defer release()

	// AC3: repos whose row is gone can no longer be scored — skip them and
	// purge their stored snapshots and alert state.
	if err := purgeDeletedRepoAlertData(ctx, db); err != nil {
		slog.Error("crank-alert: deleted-repo purge failed", "err", err)
	}

	runID := now.Format("2006-01-02")

	// Close unresolved rows from earlier runs: their baseline was never
	// advanced, so tonight's diff re-enqueues them under today's date. This
	// keeps each user's digest free of stale duplicate entries.
	if _, err := db.ExecContext(ctx,
		`UPDATE crank_outbox SET status='failed', last_error='superseded by later run', updated_at=? WHERE status IN ('pending','sending') AND alert_date < ?`,
		now, runID); err != nil {
		slog.Error("crank-alert: stale outbox cleanup failed", "err", err)
	}

	if err := enqueueCrankAlerts(ctx, db, cfg, now, summary); err != nil {
		return summary, err
	}
	if err := drainCrankOutbox(ctx, db, cfg, runID, now, summary); err != nil {
		return summary, err
	}

	slog.Info("crank-alert complete",
		"watchers_considered", summary.WatchersConsidered,
		"alerts_found", summary.AlertsFound,
		"queued", summary.Queued,
		"baselined", summary.Baselined,
		"emails_sent", summary.EmailsSent,
		"emails_failed", summary.EmailsFailed,
		"retrying", summary.Retrying,
		"dead_lettered", summary.DeadLettered,
		"unsubscribed_skipped", summary.UnsubscribedSkipped,
	)
	return summary, nil
}

// enqueueCrankAlerts diffs every watcher/repo pair against its stored
// baseline and inserts outbox rows. No alert state is written here (AC5):
// baselines advance only after the email is accepted. First-ever sightings
// silently store the baseline (first cycle never alerts).
func enqueueCrankAlerts(ctx context.Context, db *sqlx.DB, cfg CRankAlertConfig, now time.Time, summary *CRankAlertSummary) error {
	watchers, err := selectCrankWatchers(ctx, db)
	if err != nil {
		return fmt.Errorf("crank-alert watchers query: %w", err)
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

	alertDate := now.Format("2006-01-02")
	for _, repoID := range order {
		if err := processCrankRepoEnqueue(ctx, db, cfg, repoID, byRepo[repoID], alertDate, now, summary); err != nil {
			slog.Error("crank-alert: repo enqueue failed", "repo_id", repoID, "err", err)
		}
	}
	return nil
}

func processCrankRepoEnqueue(ctx context.Context, db *sqlx.DB, cfg CRankAlertConfig, repoID string, group []crankWatcher, alertDate string, now time.Time, summary *CRankAlertSummary) error {
	mu := crankRepoMutex(repoID)
	mu.Lock()
	defer mu.Unlock()

	latest, err := latestCrankSnapshot(ctx, db, repoID)
	if errors.Is(err, sql.ErrNoRows) {
		// AC3: no stored snapshot / empty history — write an empty baseline
		// (rank_hash sentinel) so the first real snapshot backfills silently,
		// and alert nothing.
		for _, w := range group {
			st, err := getCrankState(ctx, db, w.UserID, repoID)
			if err != nil || st != nil {
				continue
			}
			if cfg.DryRun {
				summary.Baselined++
				continue
			}
			if err := insertEmptyBaseline(ctx, db, w.UserID, repoID); err != nil {
				slog.Error("crank-alert: empty baseline store failed", "user_id", w.UserID, "repo_id", repoID, "err", err)
			} else {
				summary.Baselined++
			}
		}
		return nil
	}
	if err != nil {
		return err
	}
	hash := rankHash(latest.Snap)

	for _, w := range group {
		st, err := getCrankState(ctx, db, w.UserID, repoID)
		if err != nil {
			slog.Error("crank-alert: state lookup failed", "user_id", w.UserID, "repo_id", repoID, "err", err)
			continue
		}

		if st == nil {
			// First sighting of this watcher/repo pair — store the baseline
			// silently and send nothing (first cycle never alerts).
			if cfg.DryRun {
				summary.Baselined++
				continue
			}
			if err := insertCrankBaseline(ctx, db, w.UserID, repoID, latest.Snap); err != nil {
				slog.Error("crank-alert: baseline store failed", "user_id", w.UserID, "repo_id", repoID, "err", err)
			} else {
				summary.Baselined++
			}
			continue
		}

		// Legacy rows written before rank_hash existed: backfill as baseline.
		if st.RankHash == "" {
			if cfg.DryRun {
				summary.Baselined++
				continue
			}
			_, _ = db.ExecContext(ctx,
				`UPDATE crank_alert_state SET fail_count=0, dead_lettered=FALSE, rank_hash=?,
				    last_alerted_tier=?, last_alerted_score=?, last_alerted_snapshot_date=?
				 WHERE user_id=? AND repo_id=? AND rank_hash=''`,
				hash, latest.Snap.Tier, latest.Snap.Score, latest.Snap.Date, w.UserID, repoID)
			continue
		}

		// Already alerted (or baselined) for this exact snapshot content.
		if st.RankHash == hash {
			continue
		}

		tierChanged := st.Tier != "" && latest.Snap.Tier != "" && st.Tier != latest.Snap.Tier
		delta := latest.Snap.Score - st.Score

		// AC1 (pinned): material change = any tier change OR |delta| >=
		// ALERT_DROP_THRESHOLD (single config knob, default 5 points).
		if !tierChanged && math.Abs(delta) < cfg.deltaPoints() {
			continue
		}
		summary.AlertsFound++
		if cfg.DryRun {
			continue
		}

		queued, err := enqueueCrankOutboxTx(ctx, db, w, repoID, alertDate, st, *latest, tierChanged, now)
		if err != nil {
			slog.Error("crank-alert: outbox enqueue failed", "user_id", w.UserID, "repo_id", repoID, "err", err)
			continue
		}
		summary.Queued += queued
	}
	return nil
}

// dryRunCrankDiff walks every watcher/repo pair read-only and reports what a
// real run would do (AC7 verification): alerts that would fire and pairs that
// would get baselines. No state is written and nothing is sent.
func dryRunCrankDiff(ctx context.Context, db *sqlx.DB, cfg CRankAlertConfig, now time.Time, summary *CRankAlertSummary) error {
	watchers, err := selectCrankWatchers(ctx, db)
	if err != nil {
		return fmt.Errorf("crank-alert watchers query: %w", err)
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

	alertDate := now.Format("2006-01-02")
	for _, repoID := range order {
		if err := processCrankRepoEnqueue(ctx, db, cfg, repoID, byRepo[repoID], alertDate, now, summary); err != nil {
			slog.Error("crank-alert: dry-run diff failed", "repo_id", repoID, "err", err)
		}
	}
	return nil
}

// enqueueCrankOutboxTx inserts the outbox row for one watcher/repo shift.
// The unique (user, repo, alert_date) key makes re-enqueue idempotent; the
// row carries the diffed-from baseline hash and the new snapshot date so the
// post-send commit can advance state to exactly the alerted content (AC5).
func enqueueCrankOutboxTx(ctx context.Context, db *sqlx.DB, w crankWatcher, repoID, alertDate string, st *crankState, latest crankLatest, _ bool, now time.Time) (int, error) {
	insertQ := `
		INSERT INTO crank_outbox
			(user_id, repo_id, alert_date, full_name, prev_tier, new_tier, prev_score, new_score, merge_rate, response_hours, prev_rank_hash, new_snap_date, status, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)`
	if db.DriverName() == "sqlite" {
		insertQ = strings.Replace(insertQ, "INSERT INTO", "INSERT OR IGNORE INTO", 1)
	} else {
		insertQ = strings.Replace(insertQ, "INSERT INTO", "INSERT IGNORE INTO", 1)
	}
	res, err := db.ExecContext(ctx, insertQ,
		w.UserID, repoID, alertDate, w.FullName, st.Tier, latest.Snap.Tier, st.Score, latest.Snap.Score,
		latest.MergeRate, latest.ResponseHours, st.RankHash, latest.Snap.Date, now, now)
	if err != nil {
		return 0, err
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return 0, nil // duplicate night key: nothing to do
	}
	return 1, nil
}

// drainCrankOutbox delivers queued alerts: all due rows of one user collapse
// into a single email (AC3 hard cap of 1 alert email/user/night, enforced
// before send by batching), suppression is re-checked at send time (AC8),
// sends are paced ~100/min (AC7), and one user's failure never stops the
// batch (AC6).
func drainCrankOutbox(ctx context.Context, db *sqlx.DB, cfg CRankAlertConfig, runID string, now time.Time, summary *CRankAlertSummary) error {
	var due []struct {
		ID     int64  `db:"id"`
		UserID int64  `db:"user_id"`
	}
	err := db.SelectContext(ctx, &due, `
		SELECT id, user_id FROM crank_outbox
		WHERE status = 'pending' AND alert_date = ?
		ORDER BY user_id, id
		LIMIT 500
	`, runID)
	if err != nil {
		return fmt.Errorf("crank-outbox due query: %w", err)
	}

	groups := map[int64][]int64{}
	var order []int64
	for _, r := range due {
		if _, seen := groups[r.UserID]; !seen {
			order = append(order, r.UserID)
		}
		groups[r.UserID] = append(groups[r.UserID], r.ID)
	}

	pacer := newCrankPacer(crankSendPace)
	for _, uid := range order {
		mu := crankUserMutex(uid)
		mu.Lock()
		drainCrankUser(ctx, db, cfg, uid, runID, groups[uid], now, pacer, summary)
		mu.Unlock()
	}
	return nil
}

// crankPacer spaces sends crankSendPace apart so the provider sees a steady
// ~100 emails/min instead of a burst (AC7). Context-aware: a cancelled run
// stops waiting immediately.
type crankPacer struct {
	interval time.Duration
	next     time.Time
}

func newCrankPacer(interval time.Duration) *crankPacer {
	return &crankPacer{interval: interval}
}

func (p *crankPacer) wait(ctx context.Context) {
	now := time.Now()
	if p.next.IsZero() {
		p.next = now.Add(p.interval)
		return
	}
	if d := p.next.Sub(now); d > 0 {
		timer := time.NewTimer(d)
		defer timer.Stop()
		select {
		case <-ctx.Done():
			return
		case <-timer.C:
		}
	}
	p.next = time.Now().Add(p.interval)
}

func drainCrankUser(ctx context.Context, db *sqlx.DB, cfg CRankAlertConfig, userID int64, runID string, ids []int64, now time.Time, pacer *crankPacer, summary *CRankAlertSummary) {
	// Claim the user's whole batch so re-entrant triggers cannot double-send.
	claimQ, claimArgs, err := sqlx.In(`
		UPDATE crank_outbox SET status='sending', updated_at=?
		WHERE user_id=? AND alert_date=? AND status='pending' AND id IN (?)
	`, now, userID, runID, ids)
	if err != nil {
		return
	}
	res, err := db.ExecContext(ctx, claimQ, claimArgs...)
	if err != nil || affectedOrLost(res, err) == 0 {
		return // lost the race; another worker owns the batch
	}

	var rows []crankOutboxRow
	err = db.SelectContext(ctx, &rows, `
		SELECT id, user_id, repo_id, full_name, prev_tier, new_tier, prev_score, new_score,
		       merge_rate, response_hours, attempts, COALESCE(prev_rank_hash,'') AS prev_rank_hash,
		       COALESCE(new_snap_date,'') AS new_snap_date
		FROM crank_outbox
		WHERE user_id=? AND status='sending' AND sent_at IS NULL
		ORDER BY id
	`, userID)
	if err != nil || len(rows) == 0 {
		return
	}

	// AC8: unsubscribe/validity is checked NOW, at send time — users who
	// unsubscribed mid-cycle are skipped here, not at queue time.
	email, ok, err := crankSendableRecipient(ctx, db, userID)
	if err != nil {
		slog.Error("crank-alert: recipient lookup failed", "user_id", userID, "err", err)
		return
	}
	if !ok {
		_ = markCrankOutboxStatus(ctx, db, rowIDs(rows), "suppressed", "", now)
		summary.UnsubscribedSkipped += len(rows)
		return
	}

	// AC7: hold this digest until its pacing slot (~100 emails/min).
	pacer.wait(ctx)

	sendErr := sendCrankBatchEmail(ctx, cfg, userID, email, rows)
	if sendErr != nil {
		summary.EmailsFailed++
		slog.Error("crank-alert: digest send failed", "user_id", userID, "rows", len(rows), "err", sendErr)

		// Send failure -> NO alert-state writes (AC5): baselines still hold,
		// so tonight's shifts re-fire on the next nightly diff. Rows are only
		// closed as bookkeeping; hard bounces additionally exclude the
		// address from all future fanout.
		hardBounce := IsHardBounce(sendErr)
		if hardBounce {
			if _, err := db.ExecContext(ctx,
				`UPDATE users SET email_invalid=TRUE, updated_at=CURRENT_TIMESTAMP WHERE id=?`, userID); err != nil {
				slog.Error("crank-alert: email-invalid flag failed", "user_id", userID, "err", err)
			}
			if err := RecordEmailSuppression(ctx, db, email, "hard_bounce", "crank-alerts"); err != nil {
				slog.Error("crank-alert: suppression write failed", "email", email, "err", err)
			}
		}
		status := "failed"
		if hardBounce {
			status = "dead_lettered"
			summary.DeadLettered += len(rows)
		}
		if err := markCrankOutboxStatus(ctx, db, rowIDs(rows), status, sendErr.Error(), now); err != nil {
			slog.Error("crank-alert: outbox close failed", "user_id", userID, "err", err)
		}
		return
	}

	// SMTP 2xx received (AC5): advance ALL of this user's repo baselines in
	// ONE transaction with last_alerted = UTC run instant. A write failure
	// retries 3x, then logs and accepts a possible duplicate next night.
	if err := commitCrankAlertBaselines(ctx, db, userID, rows, now); err != nil {
		slog.Error("crank-alert: baseline commit failed after retries; duplicate possible next night",
			"user_id", userID, "repos", len(rows), "err", err)
	}
	if err := markCrankOutboxSent(ctx, db, rowIDs(rows), now); err != nil {
		slog.Error("crank-alert: sent stamp failed", "user_id", userID, "err", err)
	}
	summary.EmailsSent++
}

// commitCrankAlertBaselines atomically advances every repo baseline in the
// user's sent batch to exactly the alerted content and stamps last_notified
// with the UTC run instant (AC5). Idempotent; retried up to
// crankBaselineCommitRetries before giving up.
func commitCrankAlertBaselines(ctx context.Context, db *sqlx.DB, userID int64, rows []crankOutboxRow, now time.Time) error {
	var lastErr error
	for attempt := 1; attempt <= crankBaselineCommitRetries; attempt++ {
		tx, err := db.Beginx()
		if err == nil {
			for _, r := range rows {
				newSnap := crankSnap{Date: r.NewSnapDate, Score: r.NewScore, Tier: r.NewTier}
				if _, err := tx.ExecContext(ctx, `
					UPDATE crank_alert_state
					SET last_alerted_tier=?, last_alerted_score=?, last_alerted_snapshot_date=?,
					    rank_hash=?, last_notified_unix=?, fail_count=0, dead_lettered=FALSE,
					    last_failed_hash=''
					WHERE user_id=? AND repo_id=?
				`, r.NewTier, r.NewScore, r.NewSnapDate, rankHash(newSnap), now.Unix(), userID, r.RepoID); err != nil {
					lastErr = err
					break
				}
			}
			if lastErr == nil {
				err = tx.Commit()
				if err == nil {
					return nil
				}
				lastErr = err
			} else {
				_ = tx.Rollback()
			}
		} else {
			lastErr = err
		}
		time.Sleep(200 * time.Millisecond)
	}
	return lastErr
}

func markCrankOutboxStatus(ctx context.Context, db *sqlx.DB, ids []int64, status, lastErr string, now time.Time) error {
	q, args, err := sqlx.In(`
		UPDATE crank_outbox SET status=?, last_error=?, updated_at=? WHERE id IN (?) AND status='sending'
	`, status, lastErr, now, ids)
	if err != nil {
		return err
	}
	_, err = db.ExecContext(ctx, q, args...)
	return err
}

// markCrankOutboxSent stamps sent_at immediately after SMTP accept (AC2).
func markCrankOutboxSent(ctx context.Context, db *sqlx.DB, ids []int64, now time.Time) error {
	q, args, err := sqlx.In(`
		UPDATE crank_outbox SET status='sent', sent_at=?, last_error='', updated_at=? WHERE id IN (?) AND status='sending'
	`, now, now, ids)
	if err != nil {
		return err
	}
	_, err = db.ExecContext(ctx, q, args...)
	return err
}

func rowIDs(rows []crankOutboxRow) []int64 {
	ids := make([]int64, len(rows))
	for i, r := range rows {
		ids[i] = r.ID
	}
	return ids
}

// crankSendableRecipient re-checks subscription state at send time (AC6).
// ok=false means the user is gone, unsubscribed, flagged invalid or has no
// usable address.
func crankSendableRecipient(ctx context.Context, db *sqlx.DB, userID int64) (string, bool, error) {
	var u struct {
		Email              string       `db:"email"`
		DigestUnsubscribed bool         `db:"digest_unsubscribed"`
		EmailInvalid       bool         `db:"email_invalid"`
		DeletedAt          sql.NullTime `db:"deleted_at"`
	}
	err := db.GetContext(ctx, &u, `
		SELECT COALESCE(email,'') AS email, COALESCE(digest_unsubscribed,FALSE) AS digest_unsubscribed,
		       COALESCE(email_invalid,FALSE) AS email_invalid, deleted_at
		FROM users WHERE id=?
	`, userID)
	if errors.Is(err, sql.ErrNoRows) {
		return "", false, nil
	}
	if err != nil {
		return "", false, err
	}
	if u.DeletedAt.Valid || u.DigestUnsubscribed || u.EmailInvalid || strings.TrimSpace(u.Email) == "" {
		return "", false, nil
	}
	return u.Email, true, nil
}

// sendCrankBatchEmail renders and sends the single nightly email listing
// every shifted repo: old→new tier, score delta, the driver metrics
// (maintainer response time, merge velocity) and a deep link to the repo
// page.
func sendCrankBatchEmail(ctx context.Context, cfg CRankAlertConfig, userID int64, email string, rows []crankOutboxRow) error {
	if cfg.Mailer == nil {
		return errors.New("no mailer configured")
	}
	base := cfg.BaseURL
	if base == "" {
		base = "https://getmerged.abhishekco.de"
	}
	subject := crankBatchSubject(rows)
	text, html := crankBatchBodies(base, cfg.JobSecret, userID, rows)
	return cfg.Mailer.Send(ctx, email, subject, text, html)
}

func crankBatchSubject(rows []crankOutboxRow) string {
	n := len(rows)
	if n == 1 {
		r := rows[0]
		if r.PrevTier != "" && r.NewTier != "" && r.PrevTier != r.NewTier {
			if tierDown(r.PrevTier, r.NewTier) {
				return fmt.Sprintf("⚠️ %s just dropped to %s", r.FullName, r.NewTier)
			}
			return fmt.Sprintf("%s just improved to %s", r.FullName, r.NewTier)
		}
		return fmt.Sprintf("⚠️ %s shifted %.0f C-Rank points", r.FullName, r.NewScore-r.PrevScore)
	}
	drops := 0
	for _, r := range rows {
		if r.NewScore < r.PrevScore || tierDown(r.PrevTier, r.NewTier) {
			drops++
		}
	}
	if drops == n {
		return fmt.Sprintf("⚠️ %d watched repos just moved down in C-Rank", n)
	}
	return fmt.Sprintf("C-Rank changes on %d watched repos", n)
}

// crankFmtResponseHours renders the maintainer-response driver metric with
// the 'insufficient data' fallback for null snapshots (AC4).
func crankFmtResponseHours(h float64) string {
	if h < 0 {
		return "insufficient data"
	}
	return fmt.Sprintf("%.1fh", h)
}

// crankFmtMergeRate renders the merge-velocity driver metric with the
// 'insufficient data' fallback for null snapshots (AC4).
func crankFmtMergeRate(rate float64) string {
	if rate < 0 {
		return "insufficient data"
	}
	return fmt.Sprintf("%.0f%%", rate*100)
}

func crankBatchBodies(baseURL, jobSecret string, userID int64, rows []crankOutboxRow) (string, string) {
	unsubURL := fmt.Sprintf("%s/unsubscribe?uid=%d&token=%s", baseURL, userID, UnsubscribeToken(userID, jobSecret))

	var text strings.Builder
	text.WriteString("Your watched repos changed C-Rank:\n")
	var html strings.Builder
	html.WriteString("<div style=\"font-family: sans-serif;\"><p style=\"margin:0 0 8px 0;\">Your watched repos changed C-Rank:</p>")
	for _, r := range rows {
		delta := r.NewScore - r.PrevScore
		dir := fmt.Sprintf("%+.1f", delta)
		repoURL := fmt.Sprintf("%s/repos/%s", baseURL, r.RepoID)
		respTxt := crankFmtResponseHours(r.ResponseHours)
		rateTxt := crankFmtMergeRate(r.MergeRate)

		line := fmt.Sprintf("%s: Score %.1f → %.1f (%s pts)", r.FullName, r.PrevScore, r.NewScore, dir)
		if r.PrevTier != "" && r.NewTier != "" && r.PrevTier != r.NewTier {
			line += fmt.Sprintf(" · Tier %s → %s", r.PrevTier, r.NewTier)
		}
		line += fmt.Sprintf(" · Maintainer response %s · Merge velocity %s", respTxt, rateTxt)

		text.WriteString(fmt.Sprintf("- %s\n  %s\n", line, repoURL))
		html.WriteString(fmt.Sprintf(
			"<p style=\"margin:4px 0; font-size:14px; color:#475569;\"><strong><a href=\"%s\" style=\"color:#2563eb;\">%s</a></strong>: Score %.1f → %.1f (%s pts)%s · Maintainer response %s · Merge velocity %s · <a href=\"%s\" style=\"color:#2563eb;\">view repo</a></p>",
			repoURL, r.FullName, r.PrevScore, r.NewScore, dir, tierFragment(r), respTxt, rateTxt, repoURL))
	}
	text.WriteString(fmt.Sprintf("\nDon't want these emails? Unsubscribe: %s\n", unsubURL))
	html.WriteString(fmt.Sprintf("<p style=\"font-size:12px; color:#94a3b8;\"><a href=\"%s\" style=\"color:#64748b;\">Unsubscribe from watchlist alerts</a></p></div>", unsubURL))

	return text.String(), html.String()
}

func tierFragment(r crankOutboxRow) string {
	if r.PrevTier != "" && r.NewTier != "" && r.PrevTier != r.NewTier {
		return fmt.Sprintf(", tier %s → %s", r.PrevTier, r.NewTier)
	}
	return ""
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

// latestCrankSnapshot returns the newest daily_snapshots row for a repo with
// the driver-metric columns; (nil, nil) when the repo has no snapshots yet.
// NULL driver metrics map to -1: the "insufficient data" sentinel surfaced
// in alert emails (AC4).
func latestCrankSnapshot(ctx context.Context, db *sqlx.DB, repoID string) (*crankLatest, error) {
	var row struct {
		crankSnap
		MergeRate     float64 `db:"merge_rate"`
		ResponseHours float64 `db:"response_hours"`
	}
	err := db.GetContext(ctx, &row, `
		SELECT snapshot_date, c_rank_score, COALESCE(c_rank_tier,'') AS c_rank_tier,
		       COALESCE(external_pr_merge_rate,-1) AS merge_rate,
		       COALESCE(time_to_first_response_hours,-1) AS response_hours
		FROM daily_snapshots
		WHERE repository_id = ?
		ORDER BY snapshot_date DESC
		LIMIT 1
	`, repoID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, err
		}
		return nil, err
	}
	return &crankLatest{Snap: row.crankSnap, MergeRate: row.MergeRate, ResponseHours: row.ResponseHours}, nil
}

// SeedWatchBaseline seeds last_alerted_snapshot with the repo's current
// rescore when a repo is newly watched (AC4), guaranteeing the first nightly
// cycle after watching never alerts. Repos without snapshots yet fall back
// to the lazy first-sighting baseline above. Idempotent via the PK.
func SeedWatchBaseline(ctx context.Context, db *sqlx.DB, userID int64, repoID string) error {
	latest, err := latestCrankSnapshot(ctx, db, repoID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil
		}
		return err
	}
	return insertCrankBaseline(ctx, db, userID, repoID, latest.Snap)
}

// insertCrankBaseline stores the first-seen snapshot hash for a new
// watcher/repo pair without sending anything. The PK conflict clause makes
// concurrent first-writers converge on exactly one baseline row.
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
	`, userID, repoID, latest.Tier, latest.Score, latest.Date, rankHash(latest))
	return err
}

// selectCrankWatchers returns opted-in watchers with their email. Obviously
// unsubscribed/invalid users are pre-filtered here; AC6's authoritative
// check happens again at send time.
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
		SELECT last_alerted_tier, last_alerted_score, last_alerted_snapshot_date,
		       COALESCE(rank_hash,'') AS rank_hash, COALESCE(fail_count,0) AS fail_count,
		       COALESCE(dead_lettered,FALSE) AS dead_lettered
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

// insertEmptyBaseline records a watcher/repo pair before the repo has any
// snapshot (AC3). The empty rank_hash is the legacy sentinel: when the first
// real snapshot lands it backfills silently and never alerts.
func insertEmptyBaseline(ctx context.Context, db *sqlx.DB, userID int64, repoID string) error {
	clause := "INSERT INTO"
	if db.DriverName() == "sqlite" {
		clause = "INSERT OR IGNORE INTO"
	} else {
		clause = "INSERT IGNORE INTO"
	}
	_, err := db.ExecContext(ctx, clause+` crank_alert_state
		(user_id, repo_id, last_alerted_tier, last_alerted_score, last_alerted_snapshot_date, last_notified_unix, rank_hash, fail_count, dead_lettered, last_failed_hash)
		VALUES (?, ?, '', 0, '', 0, '', 0, FALSE, '')
	`, userID, repoID)
	return err
}

// purgeDeletedRepoAlertData skips-and-purges repos whose repositories row is
// gone but which still have watchlist entries (AC3): stored snapshots and all
// alert tracking for them are removed.
func purgeDeletedRepoAlertData(ctx context.Context, db *sqlx.DB) error {
	var repoIDs []string
	if err := db.SelectContext(ctx, &repoIDs, `
		SELECT DISTINCT w.repo_id FROM user_watchlists w
		LEFT JOIN repositories r ON r.id = w.repo_id
		WHERE r.id IS NULL
	`); err != nil {
		return err
	}
	for _, id := range repoIDs {
		if _, err := db.ExecContext(ctx, `DELETE FROM daily_snapshots WHERE repository_id=?`, id); err != nil {
			return err
		}
		if _, err := db.ExecContext(ctx, `DELETE FROM crank_alert_state WHERE repo_id=?`, id); err != nil {
			return err
		}
		if _, err := db.ExecContext(ctx, `DELETE FROM crank_outbox WHERE repo_id=?`, id); err != nil {
			return err
		}
		slog.Info("crank-alert: deleted repo purged", "repo_id", id)
	}
	return nil
}

// PurgeRepoWatchData drops a repo's alert-tracking data once its last watcher
// leaves (AC6): the per-repo baseline snapshots persist while any watchlist
// entry remains, and are purged at zero watchers.
func PurgeRepoWatchData(ctx context.Context, db *sqlx.DB, repoID string) error {
	if _, err := db.ExecContext(ctx, `DELETE FROM crank_alert_state WHERE repo_id=?`, repoID); err != nil {
		return err
	}
	_, err := db.ExecContext(ctx, `DELETE FROM crank_outbox WHERE repo_id=?`, repoID)
	return err
}

// MarkCRankRescoreComplete records that a rescore cycle finished (AC4). The
// nightly alert hook calls this immediately after the rescore completes so
// alerts only ever diff final scores.
func MarkCRankRescoreComplete(ctx context.Context, db *sqlx.DB) error {
	now := time.Now().UTC()
	insertQ := `INSERT INTO crank_run_state (id, last_rescore_completed_at, updated_at) VALUES (1, ?, ?)`
	if db.DriverName() == "sqlite" {
		insertQ = strings.Replace(insertQ, "INSERT INTO", "INSERT OR IGNORE INTO", 1)
	} else {
		insertQ = strings.Replace(insertQ, "INSERT INTO", "INSERT IGNORE INTO", 1)
	}
	if _, err := db.ExecContext(ctx, insertQ, now, now); err != nil {
		return err
	}
	_, err := db.ExecContext(ctx,
		`UPDATE crank_run_state SET last_rescore_completed_at=?, updated_at=? WHERE id=1`, now, now)
	return err
}

// rescoreCompletedRecently reports whether a rescore-completion event was
// recorded within maxAge (AC4 watchdog guard).
func rescoreCompletedRecently(ctx context.Context, db *sqlx.DB, maxAge time.Duration) bool {
	var last time.Time
	if err := db.GetContext(ctx, &last, `SELECT last_rescore_completed_at FROM crank_run_state WHERE id=1`); err != nil {
		return false
	}
	return time.Since(last) <= maxAge
}

// SeedAllWatchBaselines backfills baselines for every existing watched pair
// missing one (AC7 deploy-time clean baseline). Idempotent; returns the
// number of pairs seeded.
func SeedAllWatchBaselines(ctx context.Context, db *sqlx.DB) (int, error) {
	var pairs []struct {
		UserID int64  `db:"user_id"`
		RepoID string `db:"repo_id"`
	}
	err := db.SelectContext(ctx, &pairs, `
		SELECT w.user_id, w.repo_id FROM user_watchlists w
		LEFT JOIN crank_alert_state s ON s.user_id = w.user_id AND s.repo_id = w.repo_id
		WHERE s.user_id IS NULL
	`)
	if err != nil {
		return 0, err
	}
	seeded := 0
	for _, p := range pairs {
		if err := SeedWatchBaseline(ctx, db, p.UserID, p.RepoID); err != nil {
			slog.Error("crank-alert: deploy baseline seed failed", "user_id", p.UserID, "repo_id", p.RepoID, "err", err)
			continue
		}
		seeded++
	}
	return seeded, nil
}

// StartCRankRescoreWatchdog checks every day at 06:00 UTC whether a rescore
// completed since the previous 06:00 UTC boundary; if not it logs critical
// and the day's alerts stay skipped (they are event-chained, so no event
// means no sends — AC4).
func StartCRankRescoreWatchdog(ctx context.Context, db *sqlx.DB) {
	go func() {
		for {
			now := time.Now().UTC()
			next := time.Date(now.Year(), now.Month(), now.Day(), 6, 0, 0, 0, time.UTC)
			if !next.After(now) {
				next = next.Add(24 * time.Hour)
			}
			select {
			case <-ctx.Done():
				return
			case <-time.After(next.Sub(now)):
			}

			windowStart := next.Add(-24 * time.Hour)
			var last time.Time
			err := db.GetContext(ctx, &last, `SELECT last_rescore_completed_at FROM crank_run_state WHERE id=1`)
			switch {
			case err != nil || last.Before(windowStart):
				slog.Error("CRITICAL: rescore-completion event missing by 06:00 UTC — C-Rank watchlist alerts skipped today",
					"window_start", windowStart.Format(time.RFC3339),
					"last_completion", last.Format(time.RFC3339))
			default:
				slog.Info("crank watchdog: rescore completion healthy",
					"last_completion", last.Format(time.RFC3339))
			}
		}
	}()
}
