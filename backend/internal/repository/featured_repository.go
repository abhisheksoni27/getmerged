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

// Featured is one paid featured-placement slot for a claimed repository
// (AC1-AC10). A row exists ONLY after a successful payment capture; the live
// query JOINs repo_claims so revoked/unverified claims disappear instantly.
type Featured struct {
	ID          int64     `db:"id" json:"id"`
	RepoClaimID int64     `db:"repo_claim_id" json:"repo_claim_id"`
	PaidUntil   time.Time `db:"paid_until" json:"paid_until"`
	Sponsored   bool      `db:"sponsored" json:"sponsored"`
	CaptureRef  string    `db:"capture_ref" json:"capture_ref"`
	CreatedAt   time.Time `db:"created_at" json:"created_at"`
}

// FeaturedLock is the idempotency lock (AC3/AC7/AC10). unique(key) makes a
// duplicate insert fail so a concurrent retry short-circuits. status:
// pending | captured | failed.
type FeaturedLock struct {
	Key         string     `db:"key"`
	Status      string     `db:"status"`
	RepoClaimID int64      `db:"repo_claim_id"`
	FeaturedID  int64      `db:"featured_id"`
	CaptureRef  string     `db:"capture_ref"`
	ResultJSON  string     `db:"result_json"`
	CreatedAt   time.Time  `db:"created_at"`
	UpdatedAt   *time.Time `db:"updated_at"`
}

// FeaturedItem is a live featured placement enriched with the claim's repo so
// the discovery pages can render the 'Sponsored' badge (AC6/AC8).
type FeaturedItem struct {
	ID          int64     `db:"id" json:"id"`
	RepoClaimID int64     `db:"repo_claim_id" json:"repo_claim_id"`
	RepoID      string    `db:"repo_id" json:"repo_id"`
	FullName    string    `db:"full_name" json:"full_name"`
	PaidUntil   time.Time `db:"paid_until" json:"paid_until"`
	Sponsored   bool      `db:"sponsored" json:"sponsored"`
	CreatedAt   time.Time `db:"created_at" json:"created_at"`
}

// FeaturedRepository backs the paid featured-placement feature.
type FeaturedRepository interface {
	// ReserveLock inserts (key,'pending') inside the caller's transaction. On a
	// unique(key) collision it returns the existing lock with reserved=false so
	// the handler can short-circuit (AC3/AC7).
	ReserveLock(ctx context.Context, tx *sqlx.Tx, key string, repoClaimID int64) (existing *FeaturedLock, reserved bool, err error)
	// GetLock reads the current lock state (used to short-circuit a concurrent
	// duplicate that finished while this request was row-locked on the claim).
	GetLock(ctx context.Context, key string) (*FeaturedLock, error)
	// MarkLockFailed deletes a pending lock so a failed purchase leaves nothing
	// persisted (AC4). No-op if the lock is already captured.
	MarkLockFailed(ctx context.Context, tx *sqlx.Tx, key string) error
	// CommitFeatured inserts the featured row and flips the lock to 'captured'
	// with the capture_ref + result payload (AC5/AC10).
	CommitFeatured(ctx context.Context, tx *sqlx.Tx, key string, repoClaimID int64, paidUntil time.Time, captureRef string, resultJSON string) (featuredID int64, err error)
	// RateLimitCount reads the per-user daily purchase counter (AC5).
	RateLimitCount(ctx context.Context, userID int64, day string) (int, error)
	// IncrementRateLimit bumps the per-user daily counter ONLY after capture (AC5).
	IncrementRateLimit(ctx context.Context, tx *sqlx.Tx, userID int64, day string) error
	// ListLiveFeatured is the canonical AC6 query: featured rows JOINed to
	// verified, non-revoked claims, ordered by paid_until DESC. The same query
	// powers /good-first-issue, /contribute/[lang], and the weekly digest.
	ListLiveFeatured(ctx context.Context, now time.Time) ([]FeaturedItem, error)
	// ListSponsoredIssues returns the good-first-issues of featured repos that
	// pass the read-time validity check (AC6/AC8), marked 'sponsored' so the
	// discovery feeds can prepend them with a Sponsored badge.
	ListSponsoredIssues(ctx context.Context, language string, limit int, now time.Time) ([]GoodFirstIssueItem, error)
	// ReconcileCapturedLocks retries the featured insert for locks left in
	// 'captured' state without a featured row (partial failure, AC10). It never
	// re-captures. Returns the number of rows healed.
	ReconcileCapturedLocks(ctx context.Context, now time.Time) (int64, error)
	// DB exposes the handle so handlers can begin transactions.
	DB() *sqlx.DB
}

type sqlxFeaturedRepository struct {
	db *sqlx.DB
}

func NewFeaturedRepository(db *sqlx.DB) FeaturedRepository {
	return &sqlxFeaturedRepository{db: db}
}

func (r *sqlxFeaturedRepository) DB() *sqlx.DB { return r.db }

func (r *sqlxFeaturedRepository) ReserveLock(ctx context.Context, tx *sqlx.Tx, key string, repoClaimID int64) (*FeaturedLock, bool, error) {
	insert := `INSERT INTO featured_idempotency_lock (key, status, repo_claim_id, created_at) VALUES (?, 'pending', ?, CURRENT_TIMESTAMP)`
	if r.db.DriverName() == "sqlite" {
		insert = `INSERT OR IGNORE INTO featured_idempotency_lock (key, status, repo_claim_id, created_at) VALUES (?, 'pending', ?, CURRENT_TIMESTAMP)`
	}
	var exec sqlx.ExecerContext = r.db
	if tx != nil {
		exec = tx
	}
	if _, err := exec.ExecContext(ctx, insert, key, repoClaimID); err != nil {
		if !isUniqueViolation(err) {
			return nil, false, err
		}
	}
	var lk FeaturedLock
	get := `SELECT key, status, COALESCE(repo_claim_id,0) AS repo_claim_id, COALESCE(featured_id,0) AS featured_id,
		COALESCE(capture_ref,'') AS capture_ref, COALESCE(result_json,'') AS result_json, created_at
		FROM featured_idempotency_lock WHERE key = ?`
	err := r.db.GetContext(ctx, &lk, get, key)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, true, nil
	}
	if err != nil {
		return nil, false, err
	}
	// reserved==true only when this call created a fresh 'pending' lock.
	reserved := lk.Status == "pending" && lk.CaptureRef == "" && lk.FeaturedID == 0
	return &lk, reserved, nil
}

func (r *sqlxFeaturedRepository) GetLock(ctx context.Context, key string) (*FeaturedLock, error) {
	var lk FeaturedLock
	get := `SELECT key, status, COALESCE(repo_claim_id,0) AS repo_claim_id, COALESCE(featured_id,0) AS featured_id,
		COALESCE(capture_ref,'') AS capture_ref, COALESCE(result_json,'') AS result_json, created_at
		FROM featured_idempotency_lock WHERE key = ?`
	err := r.db.GetContext(ctx, &lk, get, key)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &lk, nil
}

func (r *sqlxFeaturedRepository) MarkLockFailed(ctx context.Context, tx *sqlx.Tx, key string) error {
	// Delete only a pending lock; a captured lock must survive for AC10 reconcile.
	q := `DELETE FROM featured_idempotency_lock WHERE key = ? AND status = 'pending'`
	if tx != nil {
		_, err := tx.ExecContext(ctx, q, key)
		return err
	}
	_, err := r.db.ExecContext(ctx, q, key)
	return err
}

func (r *sqlxFeaturedRepository) CommitFeatured(ctx context.Context, tx *sqlx.Tx, key string, repoClaimID int64, paidUntil time.Time, captureRef string, resultJSON string) (int64, error) {
	ins := `INSERT INTO featured (repo_claim_id, paid_until, sponsored, capture_ref, created_at) VALUES (?, ?, TRUE, ?, CURRENT_TIMESTAMP)`
	var res sql.Result
	var err error
	if tx != nil {
		res, err = tx.ExecContext(ctx, ins, repoClaimID, paidUntil, captureRef)
	} else {
		res, err = r.db.ExecContext(ctx, ins, repoClaimID, paidUntil, captureRef)
	}
	if err != nil {
		return 0, err
	}
	featuredID, err := res.LastInsertId()
	if err != nil {
		return 0, err
	}

	upd := `UPDATE featured_idempotency_lock
		SET status = 'captured', featured_id = ?, capture_ref = ?, result_json = ?, updated_at = CURRENT_TIMESTAMP
		WHERE key = ?`
	if tx != nil {
		_, err = tx.ExecContext(ctx, upd, featuredID, captureRef, resultJSON, key)
	} else {
		_, err = r.db.ExecContext(ctx, upd, featuredID, captureRef, resultJSON, key)
	}
	if err != nil {
		return featuredID, err
	}
	return featuredID, nil
}

func (r *sqlxFeaturedRepository) RateLimitCount(ctx context.Context, userID int64, day string) (int, error) {
	var n int
	err := r.db.GetContext(ctx, &n, `SELECT COALESCE(count,0) FROM featured_rate_limits WHERE user_id = ? AND day = ?`, userID, day)
	if errors.Is(err, sql.ErrNoRows) {
		return 0, nil
	}
	if err != nil {
		return 0, err
	}
	return n, nil
}

func (r *sqlxFeaturedRepository) IncrementRateLimit(ctx context.Context, tx *sqlx.Tx, userID int64, day string) error {
	q := `INSERT INTO featured_rate_limits (user_id, day, count) VALUES (?, ?, 1)
		ON DUPLICATE KEY UPDATE count = count + 1`
	if r.db.DriverName() == "sqlite" {
		q = `INSERT INTO featured_rate_limits (user_id, day, count) VALUES (?, ?, 1)
			ON CONFLICT(user_id, day) DO UPDATE SET count = count + 1`
	}
	if tx != nil {
		_, err := tx.ExecContext(ctx, q, userID, day)
		return err
	}
	_, err := r.db.ExecContext(ctx, q, userID, day)
	return err
}

// ListLiveFeatured implements AC6/AC8: the canonical live query that powers
// every discovery surface. It JOINs featured -> repo_claims and excludes
// unverified/revoked claims at read time (no cron).
func (r *sqlxFeaturedRepository) ListLiveFeatured(ctx context.Context, now time.Time) ([]FeaturedItem, error) {
	// AC6: SELECT f.* FROM featured f JOIN repo_claims c ON f.repo_claim_id=c.id
	// WHERE c.owner_verified AND f.paid_until>=now() ORDER BY f.paid_until DESC
	// (owner_verified mapped to c.state='verified' AND c.revoked_at IS NULL).
	q := `SELECT f.id, f.repo_claim_id, c.repo_id, c.full_name, f.paid_until, f.sponsored, f.created_at
		FROM featured f
		INNER JOIN repo_claims c ON f.repo_claim_id = c.id
		WHERE c.state = 'verified' AND c.revoked_at IS NULL AND f.paid_until >= ?
		ORDER BY f.paid_until DESC`
	var items []FeaturedItem
	if err := r.db.SelectContext(ctx, &items, q, now); err != nil {
		return nil, err
	}
	return items, nil
}

// ListSponsoredIssues returns the good-first-issues of featured repos that pass
// the read-time validity check (AC6/AC8), marked 'sponsored' for the discovery
// feeds. It reuses the canonical AC6 JOIN so revoked/unverified claims drop out.
func (r *sqlxFeaturedRepository) ListSponsoredIssues(ctx context.Context, language string, limit int, now time.Time) ([]GoodFirstIssueItem, error) {
	if limit <= 0 {
		limit = 10
	}
	cols := `g.id, g.repository_id, rep.full_name as repo_full_name, COALESCE(rep.language, '') as language,
		rep.stars, COALESCE(s.c_rank_tier, 'A') as c_rank_tier, COALESCE(s.c_rank_score, 75.0) as c_rank_score,
		g.issue_number, g.title, COALESCE(g.body_text, '') as body_text, g.url, g.comments_count,
		g.labels_json, COALESCE(g.quality_score, 0) as quality_score,
		g.bounty_amount_usd, COALESCE(g.bounty_status, 'active') as bounty_status,
		g.created_at, g.synced_at`
	q := `SELECT ` + cols + `, TRUE as boosted
		FROM repo_good_first_issues g
		INNER JOIN repositories rep ON g.repository_id = rep.id
		LEFT JOIN latest_snapshots s ON rep.id = s.repository_id
		INNER JOIN repo_claims rc ON rc.repo_id = g.repository_id AND rc.state = 'verified' AND rc.revoked_at IS NULL
		INNER JOIN featured f ON f.repo_claim_id = rc.id AND f.paid_until > ?
		WHERE g.is_open = 1`
	args := []interface{}{now}
	if language != "" && strings.ToLower(language) != "all" {
		q += " AND LOWER(rep.language) = LOWER(?)"
		args = append(args, language)
	}
	q += " ORDER BY f.paid_until DESC, g.created_at DESC LIMIT ?"
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

// ReconcileCapturedLocks heals AC10 partial failures: locks marked 'captured'
// whose featured_id no longer resolves to a featured row get the featured row
// re-inserted idempotently (no re-capture).
func (r *sqlxFeaturedRepository) ReconcileCapturedLocks(ctx context.Context, now time.Time) (int64, error) {
	type orphan struct {
		Key         string `db:"key"`
		RepoClaimID int64  `db:"repo_claim_id"`
		FeaturedID  int64  `db:"featured_id"`
		CaptureRef  string `db:"capture_ref"`
	}
	q := `SELECT key, repo_claim_id, featured_id, capture_ref FROM featured_idempotency_lock
		WHERE status = 'captured' AND (featured_id IS NULL OR featured_id = 0
		  OR NOT EXISTS (SELECT 1 FROM featured ff WHERE ff.id = featured_id))`
	var orphans []orphan
	if err := r.db.SelectContext(ctx, &orphans, q); err != nil {
		return 0, err
	}
	var healed int64
	for _, o := range orphans {
		paidUntil := now.Add(7 * 24 * time.Hour)
		if _, err := r.CommitFeatured(ctx, nil, o.Key, o.RepoClaimID, paidUntil, o.CaptureRef, ""); err != nil {
			continue
		}
		healed++
	}
	return healed, nil
}

// isUniqueViolation reports whether err is a unique/primary-key constraint
// violation across sqlite/mysql drivers.
func isUniqueViolation(err error) bool {
	if err == nil {
		return false
	}
	msg := err.Error()
	for _, sub := range []string{"UNIQUE", "duplicate", "Duplicate", "constraint failed", "23000"} {
		if strings.Contains(msg, sub) {
			return true
		}
	}
	return false
}
