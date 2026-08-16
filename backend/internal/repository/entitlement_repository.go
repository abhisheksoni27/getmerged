package repository

import (
	"context"
	"database/sql"
	"time"

	"github.com/jmoiron/sqlx"
)

type UserEntitlement struct {
	UserID                int64      `db:"user_id" json:"user_id"`
	IsPro                 bool       `db:"is_pro" json:"is_pro"`
	SubscriptionID        *string    `db:"subscription_id" json:"subscription_id,omitempty"`
	SubscriptionExpiresAt *time.Time `db:"subscription_expires_at" json:"subscription_expires_at,omitempty"`
	BillingCycle          *string    `db:"billing_cycle" json:"billing_cycle,omitempty"`
	MonthlyEvalCount      int        `db:"monthly_eval_count" json:"monthly_eval_count"`
	CurrentPeriodStart    time.Time  `db:"current_period_start" json:"current_period_start"`
	SubscriptionUpdatedAt time.Time  `db:"subscription_updated_at" json:"subscription_updated_at"`
	UpdatedAt             time.Time  `db:"updated_at" json:"updated_at"`
}

type EntitlementRepository interface {
	GetEntitlement(ctx context.Context, userID int64) (*UserEntitlement, error)
	DeductQuota(ctx context.Context, userID int64) (bool, error)
	RefundQuota(ctx context.Context, userID int64) error
	RecordWebhookEvent(ctx context.Context, eventID, eventType, payloadJSON string) (bool, error)
	UpdateSubscription(ctx context.Context, userID int64, isPro bool, subID, cycle string, expiresAt *time.Time, eventTime time.Time) error
}

type sqlxEntitlementRepository struct {
	db *sqlx.DB
}

func NewEntitlementRepository(db *sqlx.DB) EntitlementRepository {
	return &sqlxEntitlementRepository{db: db}
}

func (r *sqlxEntitlementRepository) GetEntitlement(ctx context.Context, userID int64) (*UserEntitlement, error) {
	var ent UserEntitlement
	err := r.db.GetContext(ctx, &ent, `
		SELECT user_id, is_pro, subscription_id, subscription_expires_at, billing_cycle,
		       monthly_eval_count, current_period_start, subscription_updated_at, updated_at
		FROM user_entitlements
		WHERE user_id = ?
	`, userID)
	if err == sql.ErrNoRows {
		// Ensure initial row exists
		_, _ = r.db.ExecContext(ctx, "INSERT IGNORE INTO user_entitlements (user_id) VALUES (?)", userID)
		return &UserEntitlement{
			UserID:             userID,
			IsPro:              false,
			MonthlyEvalCount:   0,
			CurrentPeriodStart: time.Now().UTC(),
		}, nil
	}
	if err != nil {
		return nil, err
	}
	return &ent, nil
}

func (r *sqlxEntitlementRepository) DeductQuota(ctx context.Context, userID int64) (bool, error) {
	// 1. Ensure user row exists in user_entitlements
	if r.db.DriverName() == "sqlite" {
		_, _ = r.db.ExecContext(ctx, "INSERT OR IGNORE INTO user_entitlements (user_id, current_period_start) VALUES (?, CURRENT_TIMESTAMP)", userID)
	} else {
		_, _ = r.db.ExecContext(ctx, "INSERT IGNORE INTO user_entitlements (user_id, current_period_start) VALUES (?, CURRENT_TIMESTAMP)", userID)
	}

	// 2. Execute atomic test-and-set with inline period rollover
	var query string
	if r.db.DriverName() == "sqlite" {
		query = `
			UPDATE user_entitlements 
			SET 
			  monthly_eval_count = CASE 
			    WHEN strftime('%Y-%m', current_period_start) != strftime('%Y-%m', CURRENT_TIMESTAMP) THEN 1 
			    ELSE monthly_eval_count + 1 
			  END,
			  current_period_start = CASE 
			    WHEN strftime('%Y-%m', current_period_start) != strftime('%Y-%m', CURRENT_TIMESTAMP) THEN CURRENT_TIMESTAMP 
			    ELSE current_period_start 
			  END,
			  updated_at = CURRENT_TIMESTAMP
			WHERE user_id = ? 
			  AND (
			    is_pro = TRUE 
			    OR strftime('%Y-%m', current_period_start) != strftime('%Y-%m', CURRENT_TIMESTAMP)
			    OR monthly_eval_count < 3
			  );
		`
	} else {
		query = `
			UPDATE user_entitlements 
			SET 
			  monthly_eval_count = IF(DATE_FORMAT(current_period_start, '%Y-%m') != DATE_FORMAT(NOW(), '%Y-%m'), 1, monthly_eval_count + 1),
			  current_period_start = IF(DATE_FORMAT(current_period_start, '%Y-%m') != DATE_FORMAT(NOW(), '%Y-%m'), NOW(), current_period_start),
			  updated_at = CURRENT_TIMESTAMP
			WHERE user_id = ? 
			  AND (
			    is_pro = TRUE 
			    OR DATE_FORMAT(current_period_start, '%Y-%m') != DATE_FORMAT(NOW(), '%Y-%m')
			    OR monthly_eval_count < 3
			  );
		`
	}

	res, err := r.db.ExecContext(ctx, query, userID)
	if err != nil {
		return false, err
	}
	rows, _ := res.RowsAffected()
	return rows > 0, nil
}

func (r *sqlxEntitlementRepository) RefundQuota(ctx context.Context, userID int64) error {
	query := `
		UPDATE user_entitlements
		SET monthly_eval_count = CASE WHEN monthly_eval_count > 0 THEN monthly_eval_count - 1 ELSE 0 END,
		    updated_at = CURRENT_TIMESTAMP
		WHERE user_id = ? AND is_pro = FALSE
	`
	_, err := r.db.ExecContext(ctx, query, userID)
	return err
}

func (r *sqlxEntitlementRepository) RecordWebhookEvent(ctx context.Context, eventID, eventType, payloadJSON string) (bool, error) {
	query := "INSERT INTO payment_webhook_events (event_id, event_type, payload_json, processed_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)"
	res, err := r.db.ExecContext(ctx, query, eventID, eventType, payloadJSON)
	if err != nil {
		return false, nil // Duplicate event or DB error
	}
	rows, _ := res.RowsAffected()
	return rows > 0, nil
}

func (r *sqlxEntitlementRepository) UpdateSubscription(ctx context.Context, userID int64, isPro bool, subID, cycle string, expiresAt *time.Time, eventTime time.Time) error {
	// Guard against out-of-order webhooks by verifying eventTime >= subscription_updated_at
	query := `
		INSERT INTO user_entitlements (user_id, is_pro, subscription_id, billing_cycle, subscription_expires_at, subscription_updated_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
		ON DUPLICATE KEY UPDATE
			is_pro = IF(VALUES(subscription_updated_at) >= subscription_updated_at, VALUES(is_pro), is_pro),
			subscription_id = IF(VALUES(subscription_updated_at) >= subscription_updated_at, VALUES(subscription_id), subscription_id),
			billing_cycle = IF(VALUES(subscription_updated_at) >= subscription_updated_at, VALUES(billing_cycle), billing_cycle),
			subscription_expires_at = IF(VALUES(subscription_updated_at) >= subscription_updated_at, VALUES(subscription_expires_at), subscription_expires_at),
			subscription_updated_at = IF(VALUES(subscription_updated_at) >= subscription_updated_at, VALUES(subscription_updated_at), subscription_updated_at),
			updated_at = CURRENT_TIMESTAMP
	`
	if r.db.DriverName() == "sqlite" {
		query = `
			INSERT INTO user_entitlements (user_id, is_pro, subscription_id, billing_cycle, subscription_expires_at, subscription_updated_at, updated_at)
			VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
			ON CONFLICT(user_id) DO UPDATE SET
				is_pro = excluded.is_pro,
				subscription_id = excluded.subscription_id,
				billing_cycle = excluded.billing_cycle,
				subscription_expires_at = excluded.subscription_expires_at,
				subscription_updated_at = excluded.subscription_updated_at,
				updated_at = CURRENT_TIMESTAMP
			WHERE excluded.subscription_updated_at >= user_entitlements.subscription_updated_at
		`
	}

	_, err := r.db.ExecContext(ctx, query, userID, isPro, subID, cycle, expiresAt, eventTime)
	return err
}
