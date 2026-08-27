package repository

import (
	"context"
	"database/sql"
	"errors"
	"time"

	"github.com/jmoiron/sqlx"
)

// AuditPurchaseStatus enumerates the repo deep-audit purchase state machine.
const (
	AuditStatusPending   = "pending"
	AuditStatusPaid      = "paid"
	AuditStatusRefunded  = "refunded"
	AuditStatusDisputed  = "disputed"
)

// AuditPurchase is one row of the repo_audit_purchases table, keyed
// (user_id, repo_key). The status column encodes the AC3 state machine.
type AuditPurchase struct {
	UserID          int64     `db:"user_id" json:"user_id"`
	RepoKey         string    `db:"repo_key" json:"repo_key"`
	Status          string    `db:"status" json:"status"`
	DodoCheckoutID  string    `db:"dodo_checkout_id" json:"dodo_checkout_id"`
	DodoPaymentID   string    `db:"dodo_payment_id" json:"dodo_payment_id"`
	SessionID       string    `db:"session_id" json:"session_id"`
	PaidAt          *time.Time `db:"paid_at" json:"paid_at,omitempty"`
	CreatedAt       time.Time `db:"created_at" json:"created_at"`
	UpdatedAt       time.Time `db:"updated_at" json:"updated_at"`
}

// AuditPurchaseRepository owns the (user_id, repo_key) purchase state machine
// plus the idempotency/reconcile lookups the webhook and 5-min cron rely on.
type AuditPurchaseRepository interface {
	// GetOrCreatePending returns the existing purchase (any non-paid state) or
	// inserts a fresh 'pending' row stamped with the checkout session id.
	// If the repo is already 'paid' the existing paid row is returned untouched
	// (no re-bill on a double-click/retry — AC8).
	GetOrCreatePending(ctx context.Context, userID int64, repoKey, sessionID string) (*AuditPurchase, error)
	// GetStatus returns the purchase status for (user_id, repo_key). The second
	// return is false when no row exists.
	GetStatus(ctx context.Context, userID int64, repoKey string) (string, bool, error)
	// Get returns the full purchase row for (user_id, repo_key), or nil when absent.
	Get(ctx context.Context, userID int64, repoKey string) (*AuditPurchase, error)
	// GetBySession finds a purchase by its idempotency session id (set to the
	// Dodo checkout/payment id by the webhook path).
	GetBySession(ctx context.Context, sessionID string) (*AuditPurchase, error)
	// MarkPaid is the idempotent reactivation upsert (AC3): any prior status —
	// pending, refunded, or disputed — is reactivated to 'paid'. Replays are
	// no-ops because the row is keyed (user_id, repo_key) and paid_at is only
	// set once.
	MarkPaid(ctx context.Context, userID int64, repoKey, sessionID, paymentID string) error
	// MarkRefunded / MarkDisputed are terminal negative transitions. They only
	// apply when currently 'paid' (a pending/refunded repo cannot be doubly
	// refunded), so a refund on a non-paid row is a safe no-op.
	MarkRefunded(ctx context.Context, userID int64, repoKey string) error
	MarkDisputed(ctx context.Context, userID int64, repoKey string) error
	// ListPendingForReconcile returns purchases still 'pending' that carry a
	// Dodo checkout id, for the 5-minute cron sweep (AC6).
	ListPendingForReconcile(ctx context.Context, limit int) ([]AuditPurchase, error)
	// SetCheckoutID stores the Dodo checkout id on a pending purchase so the
	// webhook (idempotent by session id) and the reconcile cron can find it.
	SetCheckoutID(ctx context.Context, userID int64, repoKey, checkoutID string) error
	// GetLastRegen returns the last AI-insights regen time for (user_id, repo_key).
	GetLastRegen(ctx context.Context, userID int64, repoKey string) (*time.Time, error)
	// MarkRegen records a successful AI-insights regen (AC7 rate-limit window).
	MarkRegen(ctx context.Context, userID int64, repoKey string) error
}

type sqlxAuditPurchaseRepository struct {
	db *sqlx.DB
}

func NewAuditPurchaseRepository(db *sqlx.DB) AuditPurchaseRepository {
	return &sqlxAuditPurchaseRepository{db: db}
}

func (r *sqlxAuditPurchaseRepository) GetOrCreatePending(ctx context.Context, userID int64, repoKey, sessionID string) (*AuditPurchase, error) {
	var existing AuditPurchase
	err := r.db.GetContext(ctx, &existing, `
		SELECT user_id, repo_key, status, dodo_checkout_id, dodo_payment_id, session_id, paid_at, created_at, updated_at
		FROM repo_audit_purchases WHERE user_id = ? AND repo_key = ?`, userID, repoKey)
	if err == nil {
		// Already paid: never re-bill; return as-is (AC8).
		if existing.Status == AuditStatusPaid {
			return &existing, nil
		}
		// Pending/refunded/disputed: refresh the session id and keep pending so
		// the new checkout can complete (reactivation path).
		_, _ = r.db.ExecContext(ctx, `
			UPDATE repo_audit_purchases SET dodo_checkout_id = ?, session_id = ?, status = ?, updated_at = CURRENT_TIMESTAMP
			WHERE user_id = ? AND repo_key = ?`, sessionID, sessionID, AuditStatusPending, userID, repoKey)
		existing.Status = AuditStatusPending
		existing.SessionID = sessionID
		existing.DodoCheckoutID = sessionID
		return &existing, nil
	}
	if !errors.Is(err, sql.ErrNoRows) {
		return nil, err
	}

	_, err = r.db.ExecContext(ctx, `
		INSERT INTO repo_audit_purchases (user_id, repo_key, status, dodo_checkout_id, session_id, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
		ON DUPLICATE KEY UPDATE status = IF(status = 'paid', 'paid', VALUES(status)),
		                       dodo_checkout_id = VALUES(dodo_checkout_id),
		                       session_id = VALUES(session_id),
		                       updated_at = CURRENT_TIMESTAMP`, userID, repoKey, AuditStatusPending, sessionID, sessionID)
	if err != nil && r.db.DriverName() == "sqlite" {
		_, err = r.db.ExecContext(ctx, `
			INSERT INTO repo_audit_purchases (user_id, repo_key, status, dodo_checkout_id, session_id, created_at, updated_at)
			VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
			ON CONFLICT(user_id, repo_key) DO UPDATE SET
				status = CASE WHEN excluded.status = 'paid' THEN 'paid' ELSE excluded.status END,
				dodo_checkout_id = excluded.dodo_checkout_id,
				session_id = excluded.session_id,
				updated_at = CURRENT_TIMESTAMP`, userID, repoKey, AuditStatusPending, sessionID, sessionID)
	}
	if err != nil {
		return nil, err
	}
	return &AuditPurchase{
		UserID:         userID,
		RepoKey:        repoKey,
		Status:         AuditStatusPending,
		SessionID:      sessionID,
		DodoCheckoutID: sessionID,
	}, nil
}

func (r *sqlxAuditPurchaseRepository) GetStatus(ctx context.Context, userID int64, repoKey string) (string, bool, error) {
	var status string
	err := r.db.GetContext(ctx, &status,
		`SELECT status FROM repo_audit_purchases WHERE user_id = ? AND repo_key = ?`, userID, repoKey)
	if errors.Is(err, sql.ErrNoRows) {
		return "", false, nil
	}
	if err != nil {
		return "", false, err
	}
	return status, true, nil
}

func (r *sqlxAuditPurchaseRepository) Get(ctx context.Context, userID int64, repoKey string) (*AuditPurchase, error) {
	var p AuditPurchase
	err := r.db.GetContext(ctx, &p, `
		SELECT user_id, repo_key, status, dodo_checkout_id, dodo_payment_id, session_id, paid_at, created_at, updated_at
		FROM repo_audit_purchases WHERE user_id = ? AND repo_key = ?`, userID, repoKey)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &p, nil
}

func (r *sqlxAuditPurchaseRepository) GetBySession(ctx context.Context, sessionID string) (*AuditPurchase, error) {
	if sessionID == "" {
		return nil, nil
	}
	var p AuditPurchase
	err := r.db.GetContext(ctx, &p, `
		SELECT user_id, repo_key, status, dodo_checkout_id, dodo_payment_id, session_id, paid_at, created_at, updated_at
		FROM repo_audit_purchases WHERE session_id = ? OR dodo_checkout_id = ? OR dodo_payment_id = ?
		ORDER BY updated_at DESC LIMIT 1`, sessionID, sessionID, sessionID)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &p, nil
}

func (r *sqlxAuditPurchaseRepository) MarkPaid(ctx context.Context, userID int64, repoKey, sessionID, paymentID string) error {
	now := time.Now().UTC()
	_, err := r.db.ExecContext(ctx, `
		INSERT INTO repo_audit_purchases (user_id, repo_key, status, dodo_checkout_id, dodo_payment_id, session_id, paid_at, created_at, updated_at)
		VALUES (?, ?, 'paid', ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
		ON DUPLICATE KEY UPDATE
			status = 'paid',
			dodo_payment_id = COALESCE(NULLIF(?, ''), dodo_payment_id),
			session_id = COALESCE(NULLIF(?, ''), session_id),
			paid_at = COALESCE(paid_at, ?),
			updated_at = CURRENT_TIMESTAMP`,
		userID, repoKey, sessionID, paymentID, sessionID, now, paymentID, sessionID, now)
	if err != nil && r.db.DriverName() == "sqlite" {
		_, err = r.db.ExecContext(ctx, `
			INSERT INTO repo_audit_purchases (user_id, repo_key, status, dodo_checkout_id, dodo_payment_id, session_id, paid_at, created_at, updated_at)
			VALUES (?, ?, 'paid', ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
			ON CONFLICT(user_id, repo_key) DO UPDATE SET
				status = 'paid',
				dodo_payment_id = COALESCE(NULLIF(excluded.dodo_payment_id, ''), dodo_payment_id),
				session_id = COALESCE(NULLIF(excluded.session_id, ''), session_id),
				paid_at = COALESCE(paid_at, excluded.paid_at),
				updated_at = CURRENT_TIMESTAMP`,
			userID, repoKey, sessionID, paymentID, sessionID, now)
	}
	return err
}

func (r *sqlxAuditPurchaseRepository) MarkRefunded(ctx context.Context, userID int64, repoKey string) error {
	_, err := r.db.ExecContext(ctx, `
		UPDATE repo_audit_purchases SET status = 'refunded', updated_at = CURRENT_TIMESTAMP
		WHERE user_id = ? AND repo_key = ? AND status = 'paid'`, userID, repoKey)
	return err
}

func (r *sqlxAuditPurchaseRepository) MarkDisputed(ctx context.Context, userID int64, repoKey string) error {
	_, err := r.db.ExecContext(ctx, `
		UPDATE repo_audit_purchases SET status = 'disputed', updated_at = CURRENT_TIMESTAMP
		WHERE user_id = ? AND repo_key = ? AND status = 'paid'`, userID, repoKey)
	return err
}

func (r *sqlxAuditPurchaseRepository) ListPendingForReconcile(ctx context.Context, limit int) ([]AuditPurchase, error) {
	if limit <= 0 {
		limit = 100
	}
	var rows []AuditPurchase
	err := r.db.SelectContext(ctx, &rows, `
		SELECT user_id, repo_key, status, dodo_checkout_id, dodo_payment_id, session_id, paid_at, created_at, updated_at
		FROM repo_audit_purchases
		WHERE status = 'pending' AND dodo_checkout_id <> ''
		ORDER BY updated_at ASC LIMIT ?`, limit)
	if err != nil {
		return nil, err
	}
	return rows, nil
}

func (r *sqlxAuditPurchaseRepository) SetCheckoutID(ctx context.Context, userID int64, repoKey, checkoutID string) error {
	if checkoutID == "" {
		return nil
	}
	_, err := r.db.ExecContext(ctx, `
		UPDATE repo_audit_purchases SET dodo_checkout_id = ?, session_id = ?, updated_at = CURRENT_TIMESTAMP
		WHERE user_id = ? AND repo_key = ?`, checkoutID, checkoutID, userID, repoKey)
	return err
}

func (r *sqlxAuditPurchaseRepository) GetLastRegen(ctx context.Context, userID int64, repoKey string) (*time.Time, error) {
	var t time.Time
	err := r.db.GetContext(ctx, &t,
		`SELECT last_regen_at FROM repo_audit_regen_log WHERE user_id = ? AND repo_key = ?`, userID, repoKey)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &t, nil
}

func (r *sqlxAuditPurchaseRepository) MarkRegen(ctx context.Context, userID int64, repoKey string) error {
	now := time.Now().UTC()
	_, err := r.db.ExecContext(ctx, `
		INSERT INTO repo_audit_regen_log (user_id, repo_key, last_regen_at) VALUES (?, ?, ?)
		ON DUPLICATE KEY UPDATE last_regen_at = VALUES(last_regen_at)`, userID, repoKey, now)
	if err != nil && r.db.DriverName() == "sqlite" {
		_, err = r.db.ExecContext(ctx, `
			INSERT INTO repo_audit_regen_log (user_id, repo_key, last_regen_at) VALUES (?, ?, ?)
			ON CONFLICT(user_id, repo_key) DO UPDATE SET last_regen_at = excluded.last_regen_at`, userID, repoKey, now)
	}
	return err
}
