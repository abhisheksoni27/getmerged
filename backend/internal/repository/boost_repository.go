package repository

import (
	"context"
	"database/sql"
	"errors"
	"time"

	"github.com/jmoiron/sqlx"
)

// BoostWindowDays is the fixed 7-day listing boost granted per one-time
// payment (AC4).
const BoostWindowDays = 7 * 24 * time.Hour

// GFIBountyBoost is one paid boost entitlement keyed by payment_id (AC6).
type GFIBountyBoost struct {
	PaymentID      string     `db:"payment_id" json:"payment_id"`
	UserID         int64      `db:"user_id" json:"user_id"`
	RepositoryID   string     `db:"repository_id" json:"repository_id"`
	IssueNumber    int        `db:"issue_number" json:"issue_number"`
	AmountCents    int64      `db:"amount_cents" json:"amount_cents"`
	Status         string     `db:"status" json:"status"`
	BoostStartedAt *time.Time `db:"boost_started_at" json:"boost_started_at"`
	ExpiresAt      time.Time  `db:"expires_at" json:"expires_at"`
}

// GFIBoostOrder tracks a boost checkout from creation to settlement.
type GFIBoostOrder struct {
	OrderID        string `db:"order_id"`
	UserID         int64  `db:"user_id"`
	RepositoryID   string `db:"repository_id"`
	IssueNumber    int    `db:"issue_number"`
	DodoCheckoutID string `db:"dodo_checkout_id"`
	Status         string `db:"status"`
}

type GFIBoostRepository interface {
	CreateBoostOrder(ctx context.Context, order *GFIBoostOrder) error
	GetBoostOrder(ctx context.Context, orderID string) (*GFIBoostOrder, error)
	MarkBoostOrder(ctx context.Context, orderID, status string) error
	ActivateBoost(ctx context.Context, paymentID string, userID int64, repoID string, issueNumber int, amountCents int64, now time.Time) error
	RefundBoost(ctx context.Context, paymentID string, now time.Time) error
}

type sqlxGFIBoostRepository struct {
	db *sqlx.DB
}

func NewGFIBoostRepository(db *sqlx.DB) GFIBoostRepository {
	return &sqlxGFIBoostRepository{db: db}
}

func (r *sqlxGFIBoostRepository) CreateBoostOrder(ctx context.Context, order *GFIBoostOrder) error {
	q := `INSERT INTO gfi_bounty_boost_orders (order_id, user_id, repository_id, issue_number, dodo_checkout_id, status)
	      VALUES (?, ?, ?, ?, ?, ?)`
	if r.db.DriverName() == "sqlite" {
		q = `INSERT OR IGNORE INTO gfi_bounty_boost_orders (order_id, user_id, repository_id, issue_number, dodo_checkout_id, status)
		     VALUES (?, ?, ?, ?, ?, ?)`
	}
	_, err := r.db.ExecContext(ctx, q,
		order.OrderID, order.UserID, order.RepositoryID, order.IssueNumber, order.DodoCheckoutID, order.Status)
	return err
}

func (r *sqlxGFIBoostRepository) GetBoostOrder(ctx context.Context, orderID string) (*GFIBoostOrder, error) {
	var o GFIBoostOrder
	err := r.db.GetContext(ctx, &o,
		`SELECT order_id, user_id, repository_id, issue_number, COALESCE(dodo_checkout_id,'') AS dodo_checkout_id, status
		 FROM gfi_bounty_boost_orders WHERE order_id = ?`, orderID)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &o, nil
}

func (r *sqlxGFIBoostRepository) MarkBoostOrder(ctx context.Context, orderID, status string) error {
	_, err := r.db.ExecContext(ctx,
		`UPDATE gfi_bounty_boost_orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE order_id = ?`, status, orderID)
	return err
}

// ActivateBoost idempotently grants the 7-day boost window for a payment
// (AC4/AC6): re-delivery of the same payment_id is a no-op that never extends
// an existing window. A previously cancelled (refunded-before-activation)
// entitlement stays cancelled.
func (r *sqlxGFIBoostRepository) ActivateBoost(ctx context.Context, paymentID string, userID int64, repoID string, issueNumber int, amountCents int64, now time.Time) error {
	if paymentID == "" {
		return errors.New("boost activate: empty payment id")
	}
	existing, err := r.getBoost(ctx, paymentID)
	if err != nil {
		return err
	}
	start := now.UTC()
	expiry := start.Add(BoostWindowDays)
	if existing == nil {
		q := `INSERT INTO gfi_bounty_boosts (payment_id, user_id, repository_id, issue_number, amount_cents, status, boost_started_at, expires_at)
		      VALUES (?, ?, ?, ?, ?, 'active', ?, ?)`
		if r.db.DriverName() == "sqlite" {
			q = `INSERT OR IGNORE INTO gfi_bounty_boosts (payment_id, user_id, repository_id, issue_number, amount_cents, status, boost_started_at, expires_at)
			     VALUES (?, ?, ?, ?, ?, 'active', ?, ?)`
		} else {
			q = "INSERT IGNORE INTO gfi_bounty_boosts (payment_id, user_id, repository_id, issue_number, amount_cents, status, boost_started_at, expires_at) VALUES (?, ?, ?, ?, ?, 'active', ?, ?)"
		}
		_, err = r.db.ExecContext(ctx, q, paymentID, userID, repoID, issueNumber, amountCents, start, expiry)
		return err
	}
	if existing.Status == "cancelled" || existing.Status == "refunded" {
		return nil // refund won the race; never resurrect a revoked boost
	}
	// Duplicate delivery: keep original started/expires timestamps (no-op).
	return nil
}

// RefundBoost handles refund events (AC6): a refund before activation leaves
// (or inserts) a cancelled tombstone so later activation attempts no-op; a
// refund after activation truncates expires_at to now so the live query-time
// filter (expires_at > now) revokes the remaining window immediately.
func (r *sqlxGFIBoostRepository) RefundBoost(ctx context.Context, paymentID string, now time.Time) error {
	if paymentID == "" {
		return nil
	}
	now = now.UTC()
	existing, err := r.getBoost(ctx, paymentID)
	if err != nil {
		return err
	}
	if existing == nil {
		// Tombstone: cancels any out-of-order activation arriving later.
		q := `INSERT INTO gfi_bounty_boosts (payment_id, user_id, repository_id, issue_number, amount_cents, status, boost_started_at, expires_at)
		      VALUES (?, 0, '', 0, 0, 'cancelled', NULL, ?)`
		if r.db.DriverName() == "sqlite" {
			q = `INSERT OR IGNORE INTO gfi_bounty_boosts (payment_id, user_id, repository_id, issue_number, amount_cents, status, boost_started_at, expires_at)
			     VALUES (?, 0, '', 0, 0, 'cancelled', NULL, ?)`
		} else {
			q = "INSERT IGNORE INTO gfi_bounty_boosts (payment_id, user_id, repository_id, issue_number, amount_cents, status, boost_started_at, expires_at) VALUES (?, 0, '', 0, 0, 'cancelled', NULL, ?)"
		}
		_, err = r.db.ExecContext(ctx, q, paymentID, now)
		return err
	}
	status := "refunded"
	if existing.BoostStartedAt == nil {
		status = "cancelled"
	}
	_, err = r.db.ExecContext(ctx,
		`UPDATE gfi_bounty_boosts SET status = ?, expires_at = ?, updated_at = CURRENT_TIMESTAMP WHERE payment_id = ?`,
		status, now, paymentID)
	return err
}

func (r *sqlxGFIBoostRepository) getBoost(ctx context.Context, paymentID string) (*GFIBountyBoost, error) {
	var b GFIBountyBoost
	err := r.db.GetContext(ctx, &b,
		`SELECT payment_id, user_id, repository_id, issue_number, amount_cents, status, boost_started_at, expires_at
		 FROM gfi_bounty_boosts WHERE payment_id = ?`, paymentID)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &b, nil
}
