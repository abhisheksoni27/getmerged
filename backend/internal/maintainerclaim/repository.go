package maintainerclaim

import (
	"context"
	"database/sql"
	"time"

	"github.com/jmoiron/sqlx"
)

// MaintainerSLAClaim records a verified maintainer ownership claim with a
// pledged review-turnaround SLA. Badge eligibility = Verified AND SLAMet.
type MaintainerSLAClaim struct {
	ID                     int64      `db:"id"`
	RepoFullName           string     `db:"repo_full_name"`
	Owner                  string     `db:"owner"`
	Name                   string     `db:"name"`
	UserID                 int64      `db:"user_id"`
	OnboardingGuidance     string     `db:"onboarding_guidance"`
	SLAHours               int        `db:"sla_hours"`
	Verified               bool       `db:"verified"`
	SLAMet                 bool       `db:"sla_met"`
	ConsecutiveBrokenWeeks int        `db:"consecutive_broken_weeks"`
	Revoked                bool       `db:"revoked"`
	RevokeReason           string     `db:"revoke_reason"`
	LastSLAComputedAt      *time.Time `db:"last_sla_computed_at"`
	CreatedAt              time.Time  `db:"created_at"`
	UpdatedAt              time.Time  `db:"updated_at"`
}

// Repository persists maintainer SLA claims and inbound interest events.
type Repository interface {
	UpsertClaim(ctx context.Context, claim *MaintainerSLAClaim) (*MaintainerSLAClaim, error)
	GetClaim(ctx context.Context, owner, name string) (*MaintainerSLAClaim, error)
	GetUserClaim(ctx context.Context, userID int64, owner, name string) (*MaintainerSLAClaim, error)
	ListUserClaims(ctx context.Context, userID int64) ([]*MaintainerSLAClaim, error)
	ListActiveClaims(ctx context.Context) ([]*MaintainerSLAClaim, error)
	UpdateVerification(ctx context.Context, id int64, verified bool, reason string) error
	UpdateSLA(ctx context.Context, id int64, slaMet bool, brokenWeeks int) error
	Revoke(ctx context.Context, id int64, reason string) error
	DailyAttempts(ctx context.Context, userID int64, day string) (int, error)
	IncrementDailyAttempt(ctx context.Context, userID int64, day string) error
	RecordInterest(ctx context.Context, repoFullName, eventType, ip string) error
	CountInterest(ctx context.Context, repoFullName string, since time.Time) (int, error)
}

type sqlxRepository struct {
	db *sqlx.DB
}

// NewRepository builds a claim repository backed by sqlx.
func NewRepository(db *sqlx.DB) Repository {
	return &sqlxRepository{db: db}
}

func (r *sqlxRepository) UpsertClaim(ctx context.Context, claim *MaintainerSLAClaim) (*MaintainerSLAClaim, error) {
	// Duplicate claim returns the existing record (AC6).
	existing, err := r.GetClaim(ctx, claim.Owner, claim.Name)
	if err == nil && existing != nil {
		return existing, nil
	}
	query := `
		INSERT INTO maintainer_sla_claims
			(repo_full_name, owner, name, user_id, onboarding_guidance, sla_hours, verified, sla_met, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
		ON DUPLICATE KEY UPDATE
			onboarding_guidance = VALUES(onboarding_guidance),
			sla_hours = VALUES(sla_hours),
			updated_at = CURRENT_TIMESTAMP
	`
	if r.db.DriverName() == "sqlite" {
		query = `
			INSERT INTO maintainer_sla_claims
				(repo_full_name, owner, name, user_id, onboarding_guidance, sla_hours, verified, sla_met, created_at, updated_at)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
			ON CONFLICT(repo_full_name) DO UPDATE SET
				onboarding_guidance = excluded.onboarding_guidance,
				sla_hours = excluded.sla_hours,
				updated_at = CURRENT_TIMESTAMP
		`
	}
	res, err := r.db.ExecContext(ctx, query,
		claim.RepoFullName, claim.Owner, claim.Name, claim.UserID,
		claim.OnboardingGuidance, claim.SLAHours, claim.Verified, claim.SLAMet)
	if err != nil {
		return nil, err
	}
	id, _ := res.LastInsertId()
	if id == 0 && existing != nil {
		return existing, nil
	}
	return r.GetClaim(ctx, claim.Owner, claim.Name)
}

func (r *sqlxRepository) GetClaim(ctx context.Context, owner, name string) (*MaintainerSLAClaim, error) {
	var c MaintainerSLAClaim
	err := r.db.GetContext(ctx, &c,
		`SELECT * FROM maintainer_sla_claims WHERE owner = ? AND name = ? ORDER BY id DESC LIMIT 1`, owner, name)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &c, nil
}

func (r *sqlxRepository) GetUserClaim(ctx context.Context, userID int64, owner, name string) (*MaintainerSLAClaim, error) {
	var c MaintainerSLAClaim
	err := r.db.GetContext(ctx, &c,
		`SELECT * FROM maintainer_sla_claims WHERE user_id = ? AND owner = ? AND name = ? ORDER BY id DESC LIMIT 1`, userID, owner, name)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &c, nil
}

func (r *sqlxRepository) ListUserClaims(ctx context.Context, userID int64) ([]*MaintainerSLAClaim, error) {
	var out []*MaintainerSLAClaim
	err := r.db.SelectContext(ctx, &out,
		`SELECT * FROM maintainer_sla_claims WHERE user_id = ? ORDER BY created_at DESC`, userID)
	if err != nil {
		return nil, err
	}
	return out, nil
}

func (r *sqlxRepository) ListActiveClaims(ctx context.Context) ([]*MaintainerSLAClaim, error) {
	var out []*MaintainerSLAClaim
	err := r.db.SelectContext(ctx, &out,
		`SELECT * FROM maintainer_sla_claims WHERE revoked = FALSE AND verified = TRUE`)
	if err != nil {
		return nil, err
	}
	return out, nil
}

func (r *sqlxRepository) UpdateVerification(ctx context.Context, id int64, verified bool, reason string) error {
	_, err := r.db.ExecContext(ctx,
		`UPDATE maintainer_sla_claims SET verified = ?, revoke_reason = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
		verified, reason, id)
	return err
}

func (r *sqlxRepository) UpdateSLA(ctx context.Context, id int64, slaMet bool, brokenWeeks int) error {
	_, err := r.db.ExecContext(ctx,
		`UPDATE maintainer_sla_claims SET sla_met = ?, consecutive_broken_weeks = ?, last_sla_computed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
		slaMet, brokenWeeks, id)
	return err
}

func (r *sqlxRepository) Revoke(ctx context.Context, id int64, reason string) error {
	_, err := r.db.ExecContext(ctx,
		`UPDATE maintainer_sla_claims SET revoked = TRUE, verified = FALSE, sla_met = FALSE, revoke_reason = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
		reason, id)
	return err
}

func (r *sqlxRepository) DailyAttempts(ctx context.Context, userID int64, day string) (int, error) {
	var n int
	err := r.db.GetContext(ctx, &n,
		`SELECT COALESCE(SUM(cnt),0) FROM maintainer_claim_daily WHERE user_id = ? AND day = ?`, userID, day)
	if err == sql.ErrNoRows {
		return 0, nil
	}
	if err != nil {
		return 0, err
	}
	return n, nil
}

func (r *sqlxRepository) IncrementDailyAttempt(ctx context.Context, userID int64, day string) error {
	_, err := r.db.ExecContext(ctx,
		`INSERT INTO maintainer_claim_daily (user_id, day, cnt) VALUES (?, ?, 1)
		 ON DUPLICATE KEY UPDATE cnt = cnt + 1`, userID, day)
	if err != nil && r.db.DriverName() == "sqlite" {
		_, err = r.db.ExecContext(ctx,
			`INSERT INTO maintainer_claim_daily (user_id, day, cnt) VALUES (?, ?, 1)
			 ON CONFLICT(user_id, day) DO UPDATE SET cnt = cnt + 1`, userID, day)
	}
	return err
}

func (r *sqlxRepository) RecordInterest(ctx context.Context, repoFullName, eventType, ip string) error {
	_, err := r.db.ExecContext(ctx,
		`INSERT INTO maintainer_repo_interest_events (repo_full_name, event_type, ip, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)`,
		repoFullName, eventType, ip)
	return err
}

func (r *sqlxRepository) CountInterest(ctx context.Context, repoFullName string, since time.Time) (int, error) {
	var n int
	err := r.db.GetContext(ctx, &n,
		`SELECT COUNT(*) FROM maintainer_repo_interest_events WHERE repo_full_name = ? AND created_at >= ?`, repoFullName, since)
	if err != nil {
		return 0, err
	}
	return n, nil
}
