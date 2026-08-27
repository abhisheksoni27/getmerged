package repository

import (
	"context"
	"database/sql"
	"errors"
	"strings"
	"time"

	"github.com/abhisheksoni27/opendoor/internal/bounty"
	"github.com/jmoiron/sqlx"
)

// RepoBoost is one paid featured-placement entitlement at the REPO level (AC1).
// Activation happens only via the verified payment_intent.succeeded webhook or
// manual reconcile; a duplicate delivery is a no-op. status:
// pending | active | cancelled | stale.
type RepoBoost struct {
	PaymentIntentID string     `db:"payment_intent_id" json:"payment_intent_id"`
	UserID          int64      `db:"user_id" json:"user_id"`
	RepositoryID    string     `db:"repository_id" json:"repository_id"`
	AmountCents     int64      `db:"amount_cents" json:"amount_cents"`
	Currency        string     `db:"currency" json:"currency"`
	Status          string     `db:"status" json:"status"`
	CreatedAt       time.Time  `db:"created_at" json:"created_at"`
	ActivatedAt     *time.Time `db:"activated_at" json:"activated_at"`
	ExpiresAt       time.Time  `db:"expires_at" json:"expires_at"`
	UpdatedAt       *time.Time `db:"updated_at" json:"updated_at"`
}

// RepoBoostIssue is retained for backward compatibility; repo-level boosts no
// longer require enumerating issues (AC1: ALL open good-first-issues of the
// repo are sponsored via repositories.boost_expires_at).
type RepoBoostIssue struct {
	PaymentIntentID string `db:"payment_intent_id"`
	RepositoryID    string `db:"repository_id"`
	IssueNumber     int    `db:"issue_number"`
}

// RepoBoostOrder tracks a boost checkout from creation to webhook settlement.
// status: pending | granted | failed.
type RepoBoostOrder struct {
	OrderID            string     `db:"order_id"`
	UserID             int64      `db:"user_id"`
	RepositoryID       string     `db:"repository_id"`
	IssueNumbers       string     `db:"issue_numbers"` // comma-separated (legacy, optional)
	AmountCents        int64      `db:"amount_cents"`
	Currency           string     `db:"currency"`
	PaymentIntentID    string     `db:"payment_intent_id"`
	StripeClientSecret string     `db:"stripe_client_secret"`
	Status             string     `db:"status"`
	CreatedAt          time.Time  `db:"created_at"`
	UpdatedAt          *time.Time `db:"updated_at"`
}

type RepoBoostRepository interface {
	CreateRepoBoostOrder(ctx context.Context, tx *sqlx.Tx, order *RepoBoostOrder, issueNumbers []int) error
	GetRepoBoostOrder(ctx context.Context, orderID string) (*RepoBoostOrder, error)
	MarkRepoBoostOrder(ctx context.Context, orderID, status string) error
	// CheckoutGuard enforces AC7: one active boost per repo + user max-active +
	// daily-spend cap inside a transaction with a row lock so concurrent
	// checkouts cannot both pass. On success it inserts the pending order
	// (reserving the slot); the caller commits.
	CheckoutGuard(ctx context.Context, tx *sqlx.Tx, order *RepoBoostOrder, issueNumbers []int, now, dayStart, dayEnd time.Time, maxActive int, dailyCapCents int64) (bool, error)
	// ActivateRepoBoost is idempotent (AC2/AC6): it writes the boost row
	// (extending the existing active boost for the repo when present) and
	// performs the conditional UPDATE of repositories.boost_expires_at guarded
	// by the WHERE clause so concurrent activations/revokes cannot race.
	ActivateRepoBoost(ctx context.Context, paymentIntentID, orderID string, now time.Time, windowDays int) error
	// CancelRepoBoost cancels a boost by PaymentIntent (user cancel / webhook).
	// Returns within24h=true when the cancellation falls inside the 24h refund
	// window (AC3) so the caller can issue the provider refund. The DB changes
	// are always applied (idempotent on already-cancelled).
	CancelRepoBoost(ctx context.Context, paymentIntentID string, now time.Time) (within24h bool, err error)
	// RevokeRepoBoostByRepo cancels every active boost for a repo (claim lost).
	// Returns within24h true if any cancelled boost was inside the 24h window.
	RevokeRepoBoostByRepo(ctx context.Context, repositoryID string, now time.Time) (within24h bool, err error)
	// RecordBoostMetric dedups impressions/clicks per (user,boost) per 24h (AC4).
	RecordBoostMetric(ctx context.Context, paymentIntentID string, userID int64, repoID string, eventType string, now time.Time) error
	// ManualReconcile re-checks a pending order and activates it if the provider
	// confirms payment (AC8). Idempotent on order id.
	ManualReconcile(ctx context.Context, orderID string, now time.Time, windowDays int) error
	RecordWebhookEvent(ctx context.Context, eventID string, now time.Time) (isNew bool, err error)
	IsRepoClaimed(ctx context.Context, repositoryID string) (bool, error)
	ListSponsoredIssues(ctx context.Context, language string, limit int, now time.Time) ([]GoodFirstIssueItem, error)
	ListActiveBoosts(ctx context.Context, now time.Time) ([]RepoBoost, error)
	ListUserBoosts(ctx context.Context, userID int64, now time.Time) ([]RepoBoost, error)
	MarkStaleRepoBoosts(ctx context.Context, now time.Time) (int64, error)
	// DB exposes the underlying handle so handlers can run transactions.
	DB() *sqlx.DB
}

type sqlxRepoBoostRepository struct {
	db *sqlx.DB
}

func NewRepoBoostRepository(db *sqlx.DB) RepoBoostRepository {
	return &sqlxRepoBoostRepository{db: db}
}

func (r *sqlxRepoBoostRepository) DB() *sqlx.DB { return r.db }

func (r *sqlxRepoBoostRepository) exec(ctx context.Context, db sqlx.ExecerContext, q string, args ...interface{}) (sql.Result, error) {
	return db.ExecContext(ctx, q, args...)
}

// forUpdate appends a row-lock clause on MySQL; SQLite serializes writes at the
// DB level so the clause is omitted (would be a syntax error).
func (r *sqlxRepoBoostRepository) forUpdate() string {
	if r.db.DriverName() == "sqlite" {
		return ""
	}
	return " FOR UPDATE"
}

func (r *sqlxRepoBoostRepository) CreateRepoBoostOrder(ctx context.Context, tx *sqlx.Tx, order *RepoBoostOrder, issueNumbers []int) error {
	if tx != nil {
		return r.insertOrder(ctx, tx, order, issueNumbers)
	}
	return r.insertOrder(ctx, r.db, order, issueNumbers)
}

func (r *sqlxRepoBoostRepository) insertOrder(ctx context.Context, db sqlx.ExecerContext, order *RepoBoostOrder, issueNumbers []int) error {
	q := `INSERT INTO repo_boost_orders (order_id, user_id, repository_id, issue_numbers, amount_cents, currency, payment_intent_id, stripe_client_secret, status)
	      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')`
	if r.db.DriverName() == "sqlite" {
		q = `INSERT OR IGNORE INTO repo_boost_orders (order_id, user_id, repository_id, issue_numbers, amount_cents, currency, payment_intent_id, stripe_client_secret, status)
		     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')`
	}
	if _, err := r.exec(ctx, db, q, order.OrderID, order.UserID, order.RepositoryID, order.IssueNumbers, order.AmountCents, order.Currency, order.PaymentIntentID, order.StripeClientSecret); err != nil {
		return err
	}
	if len(issueNumbers) > 0 {
		if err := r.insertIssues(ctx, db, order.PaymentIntentID, order.RepositoryID, issueNumbers); err != nil {
			return err
		}
	}
	return nil
}

func (r *sqlxRepoBoostRepository) insertIssues(ctx context.Context, db sqlx.ExecerContext, paymentIntentID, repositoryID string, issueNumbers []int) error {
	for _, n := range issueNumbers {
		q := `INSERT INTO repo_boost_issues (payment_intent_id, repository_id, issue_number) VALUES (?, ?, ?)`
		if r.db.DriverName() == "sqlite" {
			q = `INSERT OR IGNORE INTO repo_boost_issues (payment_intent_id, repository_id, issue_number) VALUES (?, ?, ?)`
		}
		if _, err := r.exec(ctx, db, q, paymentIntentID, repositoryID, n); err != nil {
			return err
		}
	}
	return nil
}

func (r *sqlxRepoBoostRepository) GetRepoBoostOrder(ctx context.Context, orderID string) (*RepoBoostOrder, error) {
	var o RepoBoostOrder
	err := r.db.GetContext(ctx, &o,
		`SELECT order_id, user_id, repository_id, issue_numbers, amount_cents, currency, COALESCE(payment_intent_id,'') AS payment_intent_id, COALESCE(stripe_client_secret,'') AS stripe_client_secret, status, created_at
		 FROM repo_boost_orders WHERE order_id = ?`, orderID)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &o, nil
}

func (r *sqlxRepoBoostRepository) MarkRepoBoostOrder(ctx context.Context, orderID, status string) error {
	_, err := r.db.ExecContext(ctx,
		`UPDATE repo_boost_orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE order_id = ?`, status, orderID)
	return err
}

// CheckoutGuard implements AC7: counts occupied slots (active boosts for this
// repo + the user's other active boosts + pending orders) and projected daily
// spend, locking the user's row so two concurrent checkouts cannot both pass.
// On success it inserts the pending order (reserving the slot); the caller
// commits.
func (r *sqlxRepoBoostRepository) CheckoutGuard(ctx context.Context, tx *sqlx.Tx, order *RepoBoostOrder, issueNumbers []int, now, dayStart, dayEnd time.Time, maxActive int, dailyCapCents int64) (bool, error) {
	if _, err := tx.ExecContext(ctx, `INSERT OR IGNORE INTO repo_boost_locks (user_id) VALUES (?)`, order.UserID); err != nil {
		return false, err
	}
	if _, err := tx.ExecContext(ctx, `UPDATE repo_boost_locks SET user_id = user_id WHERE user_id = ?`+r.forUpdate(), order.UserID); err != nil {
		return false, err
	}

	occupiedQ := `SELECT COUNT(*) FROM (
		SELECT 1 FROM repo_boosts WHERE user_id = ? AND status = 'active' AND expires_at > ?
		UNION ALL
		SELECT 1 FROM repo_boost_orders WHERE user_id = ? AND status = 'pending'
	) t`
	var occupied int
	if err := tx.GetContext(ctx, &occupied, occupiedQ, order.UserID, now, order.UserID); err != nil {
		return false, err
	}

	spendQ := `SELECT COALESCE(SUM(amount_cents), 0) FROM (
		SELECT amount_cents FROM repo_boosts WHERE user_id = ? AND status = 'active' AND created_at >= ? AND created_at < ?
		UNION ALL
		SELECT amount_cents FROM repo_boost_orders WHERE user_id = ? AND status = 'pending' AND created_at >= ? AND created_at < ?
	) t`
	var spent int64
	if err := tx.GetContext(ctx, &spent, spendQ, order.UserID, dayStart, dayEnd, order.UserID, dayStart, dayEnd); err != nil {
		return false, err
	}

	if int64(occupied)+1 > int64(maxActive) {
		return false, nil
	}
	if spent+order.AmountCents > dailyCapCents {
		return false, nil
	}

	if err := r.insertOrder(ctx, tx, order, issueNumbers); err != nil {
		return false, err
	}
	return true, nil
}

// clampBoostWindow enforces AC7: max single boost 30d; a re-purchase while
// active extends by at most +14d.
func clampBoostWindow(windowDays int) (freshDays, extendDays int) {
	if windowDays <= 0 {
		windowDays = 7
	}
	freshDays = windowDays
	if freshDays > 30 {
		freshDays = 30
	}
	extendDays = windowDays
	if extendDays > 14 {
		extendDays = 14
	}
	return
}

// ActivateRepoBoost is idempotent (AC2/AC6): re-delivery of the same
// payment_intent_id is a no-op that never extends the window. A duplicate/already
// active boost is a no-op state transition. When an active boost already exists
// for the repo, the new payment EXTENDS that boost (one active boost per repo,
// AC7) rather than creating a second.
func (r *sqlxRepoBoostRepository) ActivateRepoBoost(ctx context.Context, paymentIntentID, orderID string, now time.Time, windowDays int) error {
	if paymentIntentID == "" {
		return errors.New("repo boost activate: empty payment intent id")
	}
	existing, err := r.getBoost(ctx, paymentIntentID)
	if err != nil {
		return err
	}
	if existing != nil {
		// Already active (or cancelled): idempotent no-op.
		return nil
	}

	order, err := r.GetRepoBoostOrder(ctx, orderID)
	if err != nil {
		return err
	}
	if order == nil {
		return errors.New("repo boost activate: unknown order")
	}
	if order.Status == "failed" || order.Status == "granted" {
		return nil
	}

	freshDays, extendDays := clampBoostWindow(windowDays)
	active, aerr := r.getActiveBoostByRepo(ctx, order.RepositoryID, now)
	if aerr != nil {
		return aerr
	}

	var newExpiry time.Time
	if active != nil {
		base := active.ExpiresAt
		if base.Before(now) {
			base = now
		}
		newExpiry = base.AddDate(0, 0, extendDays)
		if _, err := r.db.ExecContext(ctx,
			`UPDATE repo_boosts SET expires_at = ?, updated_at = CURRENT_TIMESTAMP WHERE payment_intent_id = ? AND status = 'active'`,
			newExpiry, active.PaymentIntentID); err != nil {
			return err
		}
		_ = r.MarkRepoBoostOrder(ctx, orderID, "granted")
	} else {
		newExpiry = now.AddDate(0, 0, freshDays)
		start := now.UTC()
		q := `INSERT INTO repo_boosts (payment_intent_id, user_id, repository_id, amount_cents, currency, status, created_at, activated_at, expires_at)
		      VALUES (?, ?, ?, ?, ?, 'active', ?, ?, ?)`
		if r.db.DriverName() == "sqlite" {
			q = `INSERT OR IGNORE INTO repo_boosts (payment_intent_id, user_id, repository_id, amount_cents, currency, status, created_at, activated_at, expires_at)
			     VALUES (?, ?, ?, ?, ?, 'active', ?, ?, ?)`
		}
		if _, err := r.db.ExecContext(ctx, q, paymentIntentID, order.UserID, order.RepositoryID, order.AmountCents, order.Currency, start, start, newExpiry); err != nil {
			return err
		}
		_ = r.MarkRepoBoostOrder(ctx, orderID, "granted")
	}

	// AC6: conditional UPDATE of the repo-level ranking column. The WHERE clause
	// guarantees no last-write-wins race with a concurrent extend/revoke; query
	// time (boost_expires_at > now) is the only expiry signal (no cron writes).
	if _, err := r.db.ExecContext(ctx,
		`UPDATE repositories SET boost_expires_at = ? WHERE id = ? AND (boost_expires_at IS NULL OR boost_expires_at < ?)`,
		newExpiry, order.RepositoryID, newExpiry); err != nil {
		return err
	}
	return nil
}

// CancelRepoBoost cancels a boost by PaymentIntent (user cancel / provider
// webhook). It flips the boost row to 'cancelled', expires it immediately, and
// conditionally clears repositories.boost_expires_at (only when it still belongs
// to this boost, so a newer extension is not clobbered). Returns within24h for
// the AC3 refund window. Idempotent on already-cancelled boosts.
func (r *sqlxRepoBoostRepository) CancelRepoBoost(ctx context.Context, paymentIntentID string, now time.Time) (bool, error) {
	if paymentIntentID == "" {
		return false, nil
	}
	boost, err := r.getBoost(ctx, paymentIntentID)
	if err != nil {
		return false, err
	}
	if boost == nil {
		return false, nil
	}
	if boost.Status == "cancelled" {
		// Idempotent: already cancelled, no refund due.
		return false, nil
	}
	within24h := false
	if boost.ActivatedAt != nil {
		within24h = now.Sub(*boost.ActivatedAt) < 24*time.Hour
	}
	if _, err := r.db.ExecContext(ctx,
		`UPDATE repo_boosts SET status = 'cancelled', expires_at = ?, updated_at = CURRENT_TIMESTAMP WHERE payment_intent_id = ? AND status = 'active'`,
		now, paymentIntentID); err != nil {
		return false, err
	}
	// AC6: clear the repo ranking column only if it still matches this boost's
	// expiry window (a later extension would have a later expiry).
	if _, err := r.db.ExecContext(ctx,
		`UPDATE repositories SET boost_expires_at = NULL WHERE id = ? AND (boost_expires_at IS NULL OR boost_expires_at <= ?)`,
		boost.RepositoryID, boost.ExpiresAt); err != nil {
		return within24h, err
	}
	return within24h, nil
}

// RevokeRepoBoostByRepo cancels every active boost for a repo (claim lost,
// AC3). Returns true if any cancelled boost was inside the 24h refund window.
func (r *sqlxRepoBoostRepository) RevokeRepoBoostByRepo(ctx context.Context, repositoryID string, now time.Time) (bool, error) {
	if repositoryID == "" {
		return false, nil
	}
	var boosts []RepoBoost
	if err := r.db.SelectContext(ctx, &boosts,
		`SELECT payment_intent_id, user_id, repository_id, status, activated_at, expires_at FROM repo_boosts WHERE repository_id = ? AND status = 'active'`,
		repositoryID); err != nil {
		return false, err
	}
	anyWithin := false
	for _, b := range boosts {
		w, err := r.CancelRepoBoost(ctx, b.PaymentIntentID, now)
		if err != nil {
			return anyWithin, err
		}
		if w {
			anyWithin = true
		}
	}
	return anyWithin, nil
}

// RecordBoostMetric dedups impressions/clicks per (user, boost) per 24h (AC4).
// The UNIQUE key (user_id, boost_payment_intent_id, event_type, bucket_date)
// makes a refresh/dup delivery a no-op; counting distinct rows yields the
// de-fraudulated metric.
func (r *sqlxRepoBoostRepository) RecordBoostMetric(ctx context.Context, paymentIntentID string, userID int64, repoID string, eventType string, now time.Time) error {
	if paymentIntentID == "" || userID <= 0 || repoID == "" {
		return nil
	}
	if eventType != "impression" && eventType != "click" {
		return nil
	}
	bucket := now.UTC().Format("2006-01-02")
	q := `INSERT INTO repo_boost_metrics (boost_payment_intent_id, user_id, repo_id, event_type, bucket_date, created_at)
	      VALUES (?, ?, ?, ?, ?, ?)`
	if r.db.DriverName() == "sqlite" {
		q = `INSERT OR IGNORE INTO repo_boost_metrics (boost_payment_intent_id, user_id, repo_id, event_type, bucket_date, created_at)
		     VALUES (?, ?, ?, ?, ?, ?)`
	}
	_, err := r.db.ExecContext(ctx, q, paymentIntentID, userID, repoID, eventType, bucket, now.UTC())
	return err
}

// ManualReconcile re-checks a pending order and activates it if a PaymentIntent
// succeeded (AC8). The provider lookup is performed by the caller, which passes
// paid=true when confirmed; this method is idempotent on order id.
func (r *sqlxRepoBoostRepository) ManualReconcile(ctx context.Context, orderID string, now time.Time, windowDays int) error {
	order, err := r.GetRepoBoostOrder(ctx, orderID)
	if err != nil {
		return err
	}
	if order == nil || order.Status != "pending" {
		return nil
	}
	if order.PaymentIntentID == "" {
		return errors.New("repo boost reconcile: order has no payment intent")
	}
	return r.ActivateRepoBoost(ctx, order.PaymentIntentID, orderID, now, windowDays)
}

func (r *sqlxRepoBoostRepository) getBoost(ctx context.Context, paymentIntentID string) (*RepoBoost, error) {
	var b RepoBoost
	err := r.db.GetContext(ctx, &b,
		`SELECT payment_intent_id, user_id, repository_id, amount_cents, currency, status, created_at, activated_at, expires_at
		 FROM repo_boosts WHERE payment_intent_id = ?`, paymentIntentID)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &b, nil
}

func (r *sqlxRepoBoostRepository) getActiveBoostByRepo(ctx context.Context, repositoryID string, now time.Time) (*RepoBoost, error) {
	var b RepoBoost
	err := r.db.GetContext(ctx, &b,
		`SELECT payment_intent_id, user_id, repository_id, amount_cents, currency, status, created_at, activated_at, expires_at
		 FROM repo_boosts WHERE repository_id = ? AND status = 'active' AND expires_at > ? ORDER BY expires_at ASC LIMIT 1`,
		repositoryID, now)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &b, nil
}

// RecordWebhookEvent dedupes webhook deliveries (AC2). Returns isNew=false when
// the event id was already seen (replay). Old entries beyond the 24h cache
// window are pruned on each call.
func (r *sqlxRepoBoostRepository) RecordWebhookEvent(ctx context.Context, eventID string, now time.Time) (bool, error) {
	prune := `DELETE FROM repo_boost_events WHERE received_at < ?`
	if _, err := r.db.ExecContext(ctx, prune, now.Add(-24*time.Hour)); err != nil {
		return false, err
	}
	var res sql.Result
	var err error
	if r.db.DriverName() == "sqlite" {
		res, err = r.db.ExecContext(ctx, `INSERT OR IGNORE INTO repo_boost_events (event_id, received_at) VALUES (?, ?)`, eventID, now)
	} else {
		res, err = r.db.ExecContext(ctx, `INSERT IGNORE INTO repo_boost_events (event_id, received_at) VALUES (?, ?)`, eventID, now)
	}
	if err != nil {
		return false, err
	}
	affected, err := res.RowsAffected()
	if err != nil {
		return false, err
	}
	return affected > 0, nil
}

// IsRepoClaimed reports whether the repository has a verified maintainer claim
// (AC4/AC7): featured placement requires an owned, claimed repo.
func (r *sqlxRepoBoostRepository) IsRepoClaimed(ctx context.Context, repositoryID string) (bool, error) {
	var cnt int
	err := r.db.GetContext(ctx, &cnt,
		`SELECT COUNT(1) FROM repo_claims WHERE repo_id = ? AND state = 'verified'`, repositoryID)
	if err != nil {
		return false, err
	}
	return cnt > 0, nil
}

// ListSponsoredIssues returns the featured good-first-issues at the REPO level
// (AC1): every open issue of a repo whose boost_expires_at is in the future is
// sponsored. Results are ordered earliest-expiring-boost first (AC7).
func (r *sqlxRepoBoostRepository) ListSponsoredIssues(ctx context.Context, language string, limit int, now time.Time) ([]GoodFirstIssueItem, error) {
	if limit <= 0 {
		limit = 10
	}
	cols := `g.id, g.repository_id, rep.full_name as repo_full_name, COALESCE(rep.language, '') as language,
		rep.stars, COALESCE(s.c_rank_tier, 'A') as c_rank_tier, COALESCE(s.c_rank_score, 75.0) as c_rank_score,
		g.issue_number, g.title, COALESCE(g.body_text, '') as body_text, g.url, g.comments_count,
		g.labels_json, COALESCE(g.quality_score, 0) as quality_score,
		g.bounty_amount_usd, COALESCE(g.bounty_status, 'active') as bounty_status,
		g.created_at, g.synced_at`
	q := `SELECT ` + cols + `, TRUE as boosted, rep.boost_expires_at as repo_boost_expires_at
		FROM repo_good_first_issues g
		INNER JOIN repositories rep ON g.repository_id = rep.id
		LEFT JOIN latest_snapshots s ON rep.id = s.repository_id
		WHERE g.is_open = 1 AND rep.boost_expires_at IS NOT NULL AND rep.boost_expires_at > ?`
	args := []interface{}{now}
	if language != "" && strings.ToLower(language) != "all" {
		q += " AND LOWER(rep.language) = LOWER(?)"
		args = append(args, language)
	}
	q += " ORDER BY rep.boost_expires_at ASC, g.created_at DESC LIMIT ?"
	args = append(args, limit)

	var items []GoodFirstIssueItem
	if err := r.db.SelectContext(ctx, &items, q, args...); err != nil {
		return nil, err
	}
	for i := range items {
		items[i].Sponsored = true
		ok, _ := bounty.Detect(items[i].LabelsJSON)
		items[i].IsBounty = ok
	}
	return items, nil
}

// ListUserBoosts returns a maintainer's boosts (active first) for the console.
func (r *sqlxRepoBoostRepository) ListUserBoosts(ctx context.Context, userID int64, now time.Time) ([]RepoBoost, error) {
	var bs []RepoBoost
	err := r.db.SelectContext(ctx, &bs,
		`SELECT payment_intent_id, user_id, repository_id, amount_cents, currency, status, created_at, activated_at, expires_at
		 FROM repo_boosts WHERE user_id = ? ORDER BY
		   CASE WHEN status = 'active' AND expires_at > ? THEN 0 ELSE 1 END, created_at DESC`, userID, now)
	if err != nil {
		return nil, err
	}
	return bs, nil
}

// ListActiveBoosts returns all currently-active boosts (for the cron sweep).
func (r *sqlxRepoBoostRepository) ListActiveBoosts(ctx context.Context, now time.Time) ([]RepoBoost, error) {
	var bs []RepoBoost
	err := r.db.SelectContext(ctx, &bs,
		`SELECT payment_intent_id, user_id, repository_id, amount_cents, currency, status, created_at, activated_at, expires_at
		 FROM repo_boosts WHERE status = 'active' AND expires_at > ? ORDER BY expires_at ASC`, now)
	if err != nil {
		return nil, err
	}
	return bs, nil
}

// MarkStaleRepoBoosts flips boosts to 'stale' when their repo is no longer
// claimed (AC3/AC7) and clears the repo ranking column so the boost stops
// rendering. Revocation of the remaining window happens via RevokeRepoBoostByRepo.
func (r *sqlxRepoBoostRepository) MarkStaleRepoBoosts(ctx context.Context, now time.Time) (int64, error) {
	q := `UPDATE repo_boosts SET status = 'stale', updated_at = CURRENT_TIMESTAMP
		WHERE status = 'active'
		  AND NOT EXISTS (SELECT 1 FROM repo_claims rc WHERE rc.repo_id = repo_boosts.repository_id AND rc.state = 'verified')`
	res, err := r.db.ExecContext(ctx, q)
	if err != nil {
		return 0, err
	}
	n, _ := res.RowsAffected()
	// Clear ranking column for any repo whose active boost is now stale.
	_, _ = r.db.ExecContext(ctx,
		`UPDATE repositories SET boost_expires_at = NULL WHERE boost_expires_at IS NOT NULL
		 AND NOT EXISTS (SELECT 1 FROM repo_boosts b WHERE b.repository_id = repositories.id AND b.status = 'active' AND b.expires_at > ?)`,
		now)
	return n, nil
}
