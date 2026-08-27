package repository

import (
	"context"
	"database/sql"
	"strings"
	"time"

	"github.com/jmoiron/sqlx"
)

// RecruiterPass is one row per user in recruiter_pass_entitlements.
// Status lifecycle: 'pending' (checkout created) -> 'active' (Dodo webhook
// confirmed) -> 'cancelled'/'expired'. Search is gated on 'active' (AC6).
type RecruiterPass struct {
	UserID            int64      `db:"user_id" json:"user_id"`
	Status            string     `db:"status" json:"status"`
	DodoSubscriptionID *string   `db:"dodo_subscription_id" json:"dodo_subscription_id,omitempty"`
	DodoCheckoutID    *string    `db:"dodo_checkout_id" json:"dodo_checkout_id,omitempty"`
	CreatedAt         time.Time  `db:"created_at" json:"created_at"`
	UpdatedAt         time.Time  `db:"updated_at" json:"updated_at"`
	ExpiresAt         *time.Time `db:"expires_at" json:"expires_at,omitempty"`
}

// RecruiterSearchFilters holds the filterable dimensions for /recruiter/search.
// At least one dimension must be non-empty (AC3); at most 4 groups (AC4).
type RecruiterSearchFilters struct {
	PrimaryLanguages   []string
	SkillLevels        []string
	ContributionStyles []string
	MinVerifiedSA      int
}

// RecruiterSearchResult is a single opt-in profile returned to Pass-holders.
// open_to_opportunities is always true here (AC5: only Pass-holders see it).
type RecruiterSearchResult struct {
	UserID              int64    `json:"user_id"`
	Slug                string   `json:"slug"`
	Username            string   `json:"username"`
	AvatarURL           *string  `json:"avatar_url,omitempty"`
	OpenToOpportunities bool     `json:"open_to_opportunities"`
	PrimaryLanguages    []string `json:"primary_languages"`
	SkillLevel          string   `json:"skill_level"`
	ContributionStyle   string   `json:"contribution_style"`
	VerifiedSAMerges    int      `json:"verified_sa_merges"`
}

type RecruiterRepository interface {
	CreateRecruiterPassOrder(ctx context.Context, userID int64, checkoutID, subID string) error
	ActivateRecruiterPass(ctx context.Context, userID int64, subID string) error
	DeactivateRecruiterPass(ctx context.Context, userID int64) error
	GetRecruiterPass(ctx context.Context, userID int64) (*RecruiterPass, error)
	SearchRecruiterProfiles(ctx context.Context, f RecruiterSearchFilters, page, limit int) ([]RecruiterSearchResult, int, error)
}

type sqlxRecruiterRepository struct {
	db *sqlx.DB
}

func NewRecruiterRepository(db *sqlx.DB) RecruiterRepository {
	return &sqlxRecruiterRepository{db: db}
}

func (r *sqlxRecruiterRepository) CreateRecruiterPassOrder(ctx context.Context, userID int64, checkoutID, subID string) error {
	query := `
		INSERT INTO recruiter_pass_entitlements (user_id, status, dodo_subscription_id, dodo_checkout_id, updated_at)
		VALUES (?, 'pending', ?, ?, CURRENT_TIMESTAMP)
		ON DUPLICATE KEY UPDATE
			status = 'pending',
			dodo_subscription_id = VALUES(dodo_subscription_id),
			dodo_checkout_id = VALUES(dodo_checkout_id),
			updated_at = CURRENT_TIMESTAMP
	`
	if r.db.DriverName() == "sqlite" {
		query = `
			INSERT INTO recruiter_pass_entitlements (user_id, status, dodo_subscription_id, dodo_checkout_id, updated_at)
			VALUES (?, 'pending', ?, ?, CURRENT_TIMESTAMP)
			ON CONFLICT(user_id) DO UPDATE SET
				status = 'pending',
				dodo_subscription_id = excluded.dodo_subscription_id,
				dodo_checkout_id = excluded.dodo_checkout_id,
				updated_at = CURRENT_TIMESTAMP
		`
	}
	_, err := r.db.ExecContext(ctx, query, userID, nullIfEmpty(subID), nullIfEmpty(checkoutID))
	return err
}

func (r *sqlxRecruiterRepository) ActivateRecruiterPass(ctx context.Context, userID int64, subID string) error {
	query := `
		INSERT INTO recruiter_pass_entitlements (user_id, status, dodo_subscription_id, updated_at)
		VALUES (?, 'active', ?, CURRENT_TIMESTAMP)
		ON DUPLICATE KEY UPDATE
			status = 'active',
			dodo_subscription_id = VALUES(dodo_subscription_id),
			updated_at = CURRENT_TIMESTAMP
	`
	if r.db.DriverName() == "sqlite" {
		query = `
			INSERT INTO recruiter_pass_entitlements (user_id, status, dodo_subscription_id, updated_at)
			VALUES (?, 'active', ?, CURRENT_TIMESTAMP)
			ON CONFLICT(user_id) DO UPDATE SET
				status = 'active',
				dodo_subscription_id = excluded.dodo_subscription_id,
				updated_at = CURRENT_TIMESTAMP
		`
	}
	_, err := r.db.ExecContext(ctx, query, userID, nullIfEmpty(subID))
	return err
}

func (r *sqlxRecruiterRepository) DeactivateRecruiterPass(ctx context.Context, userID int64) error {
	query := `
		INSERT INTO recruiter_pass_entitlements (user_id, status, updated_at)
		VALUES (?, 'cancelled', CURRENT_TIMESTAMP)
		ON DUPLICATE KEY UPDATE status = 'cancelled', updated_at = CURRENT_TIMESTAMP
	`
	if r.db.DriverName() == "sqlite" {
		query = `
			INSERT INTO recruiter_pass_entitlements (user_id, status, updated_at)
			VALUES (?, 'cancelled', CURRENT_TIMESTAMP)
			ON CONFLICT(user_id) DO UPDATE SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
		`
	}
	_, err := r.db.ExecContext(ctx, query, userID)
	return err
}

func (r *sqlxRecruiterRepository) GetRecruiterPass(ctx context.Context, userID int64) (*RecruiterPass, error) {
	var p RecruiterPass
	err := r.db.GetContext(ctx, &p, `
		SELECT user_id, status, dodo_subscription_id, dodo_checkout_id, created_at, updated_at, expires_at
		FROM recruiter_pass_entitlements
		WHERE user_id = ?
	`, userID)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &p, nil
}

// SearchRecruiterProfiles returns opt-in contributor profiles matching the
// provided filter dimensions, paginated. Empty filters are rejected by the
// caller (AC3); this method assumes at least one dimension is active.
func (r *sqlxRecruiterRepository) SearchRecruiterProfiles(ctx context.Context, f RecruiterSearchFilters, page, limit int) ([]RecruiterSearchResult, int, error) {
	where := []string{"cp.open_to_opportunities = TRUE"}
	args := []interface{}{}

	for _, lang := range f.PrimaryLanguages {
		lang = strings.TrimSpace(lang)
		if lang == "" {
			continue
		}
		where = append(where, "cp.primary_languages_csv LIKE ?")
		args = append(args, "%"+lang+"%")
	}
	if len(f.SkillLevels) > 0 {
		where = append(where, "cp.skill_level IN (?)")
		args = append(args, f.SkillLevels)
	}
	if len(f.ContributionStyles) > 0 {
		where = append(where, "cp.contribution_style IN (?)")
		args = append(args, f.ContributionStyles)
	}
	if f.MinVerifiedSA > 0 {
		where = append(where, "cp.verified_sa_merges >= ?")
		args = append(args, f.MinVerifiedSA)
	}

	base := `
		FROM contributor_profiles cp
		JOIN users u ON u.id = cp.user_id AND u.deleted_at IS NULL AND u.is_public = TRUE
		WHERE ` + strings.Join(where, " AND ")

	// Total count for pagination.
	var total int
	countQuery, countArgs, err := sqlx.In(`SELECT COUNT(*)`+base, args)
	if err != nil {
		return nil, 0, err
	}
	if err := r.db.GetContext(ctx, &total, r.db.Rebind(countQuery), countArgs...); err != nil {
		return nil, 0, err
	}

	// Page slice.
	offset := (page - 1) * limit
	dataQuery, dataArgs, err := sqlx.In(`
		SELECT cp.user_id, u.slug, u.username, u.avatar_url,
		       cp.primary_languages_csv, cp.skill_level, cp.contribution_style, cp.verified_sa_merges
	`+base+`
		ORDER BY cp.verified_sa_merges DESC, u.username ASC
		LIMIT ? OFFSET ?`, append(args, limit, offset))
	if err != nil {
		return nil, 0, err
	}

	rows := []struct {
		UserID              int64   `db:"user_id"`
		Slug                string  `db:"slug"`
		Username            string  `db:"username"`
		AvatarURL           *string `db:"avatar_url"`
		PrimaryLanguagesCSV string  `db:"primary_languages_csv"`
		SkillLevel          string  `db:"skill_level"`
		ContributionStyle   string  `db:"contribution_style"`
		VerifiedSA          int     `db:"verified_sa_merges"`
	}{}
	if err := r.db.SelectContext(ctx, &rows, r.db.Rebind(dataQuery), dataArgs...); err != nil {
		return nil, 0, err
	}

	results := make([]RecruiterSearchResult, 0, len(rows))
	for _, row := range rows {
		langs := []string{}
		if row.PrimaryLanguagesCSV != "" {
			for _, l := range strings.Split(row.PrimaryLanguagesCSV, ",") {
				if l = strings.TrimSpace(l); l != "" {
					langs = append(langs, l)
				}
			}
		}
		results = append(results, RecruiterSearchResult{
			UserID:              row.UserID,
			Slug:                row.Slug,
			Username:            row.Username,
			AvatarURL:           row.AvatarURL,
			OpenToOpportunities: true,
			PrimaryLanguages:    langs,
			SkillLevel:          row.SkillLevel,
			ContributionStyle:   row.ContributionStyle,
			VerifiedSAMerges:    row.VerifiedSA,
		})
	}
	return results, total, nil
}

func nullIfEmpty(s string) interface{} {
	if s == "" {
		return nil
	}
	return s
}
