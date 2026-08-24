package repository

import (
	"context"
	"crypto/rand"
	"database/sql"
	"math/big"
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
	EnsureReferralCode(ctx context.Context, userID int64) (string, error)
	FindUserIDByReferralCode(ctx context.Context, code string) (int64, bool, error)
	ApplySignupReferral(ctx context.Context, referrerID, newUserID int64) error
	GetReferralStats(ctx context.Context, userID int64) (invites int64, credits int64, err error)
}

// Referral bonus constants: one-time grants stacked on the free tier.
const (
	referralReferrerBonus = 3
	referralRefereeBonus  = 1
	referralLifetimeCap   = 10
)

// referralCodeCharset is base62; codes are 16 chars drawn from crypto/rand.
const referralCodeCharset = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"

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
			    OR monthly_eval_count < 3 + COALESCE(bonus_evals, 0)
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
			    OR monthly_eval_count < 3 + COALESCE(bonus_evals, 0)
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

func generateReferralCode() (string, error) {
	code := make([]byte, 16)
	max := big.NewInt(int64(len(referralCodeCharset)))
	for i := range code {
		n, err := rand.Int(rand.Reader, max)
		if err != nil {
			return "", err
		}
		code[i] = referralCodeCharset[n.Int64()]
	}
	return string(code), nil
}

// EnsureReferralCode returns the user's high-entropy referral code, lazily
// generating and persisting one if it does not exist yet.
func (r *sqlxEntitlementRepository) EnsureReferralCode(ctx context.Context, userID int64) (string, error) {
	var code string
	err := r.db.GetContext(ctx, &code, "SELECT referral_code FROM users WHERE id = ? AND deleted_at IS NULL", userID)
	if err == nil && code != "" {
		return code, nil
	}
	if err != nil && err != sql.ErrNoRows {
		return "", err
	}

	for attempt := 0; attempt < 5; attempt++ {
		code, err = generateReferralCode()
		if err != nil {
			return "", err
		}
		res, err := r.db.ExecContext(ctx,
			"UPDATE users SET referral_code = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND deleted_at IS NULL AND (referral_code IS NULL OR referral_code = '')",
			code, userID)
		if err != nil {
			return "", err
		}
		rows, _ := res.RowsAffected()
		if rows > 0 {
			return code, nil
		}
		// Concurrent generation won the race; read the stored code.
		err = r.db.GetContext(ctx, &code, "SELECT referral_code FROM users WHERE id = ?", userID)
		if err == nil && code != "" {
			return code, nil
		}
	}
	return "", sql.ErrNoRows
}

// FindUserIDByReferralCode resolves a referral code to an active user.
func (r *sqlxEntitlementRepository) FindUserIDByReferralCode(ctx context.Context, code string) (int64, bool, error) {
	var referrerID int64
	err := r.db.GetContext(ctx, &referrerID, "SELECT id FROM users WHERE referral_code = ? AND deleted_at IS NULL", code)
	if err == sql.ErrNoRows {
		return 0, false, nil
	}
	if err != nil {
		return 0, false, err
	}
	return referrerID, true, nil
}

// ApplySignupReferral grants ONE-TIME bonus preflight evaluations for a new
// signup: +3 to the referrer, +1 to the referee, stacked on the free tier.
// The referral_credits ledger enforces UNIQUE(referrer_id, new_user_id) at the
// DB level, so concurrent OAuth callbacks cannot double-credit. Grants beyond
// the lifetime cap are silently dropped.
func (r *sqlxEntitlementRepository) ApplySignupReferral(ctx context.Context, referrerID, newUserID int64) error {
	if referrerID <= 0 || newUserID <= 0 {
		return nil
	}

	// Ensure entitlement rows exist for both sides before crediting.
	insertEnt := "INSERT IGNORE INTO user_entitlements (user_id, current_period_start) VALUES (?, CURRENT_TIMESTAMP)"
	if r.db.DriverName() == "sqlite" {
		insertEnt = "INSERT OR IGNORE INTO user_entitlements (user_id, current_period_start) VALUES (?, CURRENT_TIMESTAMP)"
	}
	_, _ = r.db.ExecContext(ctx, insertEnt, referrerID)
	_, _ = r.db.ExecContext(ctx, insertEnt, newUserID)

	// Idempotent ledger insert; zero rows affected means already credited.
	insertLedger := "INSERT IGNORE INTO referral_credits (referrer_id, new_user_id) VALUES (?, ?)"
	if r.db.DriverName() == "sqlite" {
		insertLedger = "INSERT OR IGNORE INTO referral_credits (referrer_id, new_user_id) VALUES (?, ?)"
	}
	res, err := r.db.ExecContext(ctx, insertLedger, referrerID, newUserID)
	if err != nil {
		return err
	}
	rows, _ := res.RowsAffected()
	if rows == 0 {
		return nil // duplicate callback under concurrency: no double credit
	}

	// Referee always gets +1 unless lifetime cap reached.
	refereeBonus := int64(0)
	var refereeGrants int64
	if err := r.db.GetContext(ctx, &refereeGrants,
		"SELECT COUNT(*) FROM referral_credits WHERE new_user_id = ? AND referee_bonus > 0", newUserID); err == nil && refereeGrants < referralLifetimeCap {
		refereeBonus = referralRefereeBonus
	}

	// Referrer gets +3 only for a distinct active account within cap;
	// otherwise referee still gets +1 and referrer gets nothing (AC4).
	referrerBonus := int64(0)
	if referrerID != newUserID {
		var active int64
		if err := r.db.GetContext(ctx, &active,
			"SELECT COUNT(*) FROM users WHERE id = ? AND deleted_at IS NULL", referrerID); err == nil && active > 0 {
			var referrerGrants int64
			if err := r.db.GetContext(ctx, &referrerGrants,
				"SELECT COUNT(*) FROM referral_credits WHERE referrer_id = ? AND referrer_bonus > 0", referrerID); err == nil && referrerGrants < referralLifetimeCap {
				referrerBonus = referralReferrerBonus
			}
		}
	}

	if _, err := r.db.ExecContext(ctx,
		"UPDATE referral_credits SET referrer_bonus = ?, referee_bonus = ? WHERE referrer_id = ? AND new_user_id = ?",
		referrerBonus, refereeBonus, referrerID, newUserID); err != nil {
		return err
	}

	if refereeBonus > 0 {
		if _, err := r.db.ExecContext(ctx,
			"UPDATE user_entitlements SET bonus_evals = COALESCE(bonus_evals, 0) + ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?",
			refereeBonus, newUserID); err != nil {
			return err
		}
	}
	if referrerBonus > 0 {
		if _, err := r.db.ExecContext(ctx,
			"UPDATE user_entitlements SET bonus_evals = COALESCE(bonus_evals, 0) + ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?",
			referrerBonus, referrerID); err != nil {
			return err
		}
	}
	return nil
}

// GetReferralStats returns lifetime successful invites and credits earned as a referrer.
func (r *sqlxEntitlementRepository) GetReferralStats(ctx context.Context, userID int64) (invites int64, credits int64, err error) {
	err = r.db.GetContext(ctx, &invites,
		"SELECT COUNT(*) FROM referral_credits WHERE referrer_id = ? AND referrer_bonus > 0", userID)
	if err != nil {
		return 0, 0, err
	}
	err = r.db.GetContext(ctx, &credits,
		"SELECT COALESCE(SUM(referrer_bonus), 0) FROM referral_credits WHERE referrer_id = ? AND referrer_bonus > 0", userID)
	return invites, credits, err
}
