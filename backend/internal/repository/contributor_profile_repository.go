package repository

import (
	"context"
	"database/sql"
	"encoding/json"
	"strings"
	"time"

	"github.com/abhisheksoni27/opendoor/internal/dna"
	"github.com/jmoiron/sqlx"
)

type ContributorProfileRecord struct {
	UserID          int64      `db:"user_id" json:"user_id"`
	ProfilingStatus string     `db:"profiling_status" json:"profiling_status"`
	DNAJSON         *string    `db:"dna_json" json:"dna_json,omitempty"`
	TotalMergedPRs  int        `db:"total_merged_prs" json:"total_merged_prs"`
	LastError       *string    `db:"last_error" json:"last_error,omitempty"`
	LockedUntil     *time.Time `db:"locked_until" json:"locked_until,omitempty"`
	AnalyzedAt      *time.Time `db:"analyzed_at" json:"analyzed_at,omitempty"`
	UpdatedAt       time.Time  `db:"updated_at" json:"updated_at"`
}

type ContributorProfileRepository interface {
	GetByUserID(ctx context.Context, userID int64) (*ContributorProfileRecord, error)
	RequestRefresh(ctx context.Context, userID int64) (bool, error)
	ClaimPendingJob(ctx context.Context, userID int64) (bool, error)
	SaveSuccess(ctx context.Context, userID int64, dnaJSON string, totalMerged int) error
	SaveSuccessWithPersona(ctx context.Context, userID int64, dnaJSON string, totalMerged int, persona string, starsPulledIn int) error
	SaveFailure(ctx context.Context, userID int64, status string, errMsg string) error
	// SetOpenToOpportunities toggles the Talent Pass opt-in (AC1).
	SetOpenToOpportunities(ctx context.Context, userID int64, val bool) error
	// GetOpenToOpportunities reads the current opt-in value (default false).
	GetOpenToOpportunities(ctx context.Context, userID int64) (bool, error)
	// ReindexRecruiterColumns refreshes the denormalized recruiter-search
	// columns (primary_languages/skill_level/contribution_style/verified_sa_merges)
	// from the stored DNA JSON + S/A-tier merge history. Called on every
	// contributor_profiles mutation via the async indexer (AC8).
	ReindexRecruiterColumns(ctx context.Context, userID int64) error
}

type sqlxContributorProfileRepository struct {
	db *sqlx.DB
}

func NewContributorProfileRepository(db *sqlx.DB) ContributorProfileRepository {
	return &sqlxContributorProfileRepository{db: db}
}

func (r *sqlxContributorProfileRepository) GetByUserID(ctx context.Context, userID int64) (*ContributorProfileRecord, error) {
	var rec ContributorProfileRecord
	err := r.db.GetContext(ctx, &rec, `
		SELECT user_id, profiling_status, dna_json, total_merged_prs, last_error, locked_until, analyzed_at, updated_at
		FROM contributor_profiles
		WHERE user_id = ?
	`, userID)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &rec, nil
}

func (r *sqlxContributorProfileRepository) RequestRefresh(ctx context.Context, userID int64) (bool, error) {
	lockExpr := "DATE_ADD(NOW(), INTERVAL 24 HOUR)"
	nowExpr := "NOW()"
	if r.db.DriverName() == "sqlite" {
		lockExpr = "datetime('now', '+24 hours')"
		nowExpr = "datetime('now')"
	}

	query := `
		INSERT INTO contributor_profiles (user_id, profiling_status, locked_until, updated_at)
		VALUES (?, 'pending', ` + lockExpr + `, CURRENT_TIMESTAMP)
		ON DUPLICATE KEY UPDATE
			profiling_status = IF(locked_until IS NULL OR locked_until <= ` + nowExpr + `, 'pending', profiling_status),
			locked_until = IF(locked_until IS NULL OR locked_until <= ` + nowExpr + `, ` + lockExpr + `, locked_until),
			updated_at = CURRENT_TIMESTAMP
	`
	if r.db.DriverName() == "sqlite" {
		query = `
			INSERT INTO contributor_profiles (user_id, profiling_status, locked_until, updated_at)
			VALUES (?, 'pending', ` + lockExpr + `, CURRENT_TIMESTAMP)
			ON CONFLICT(user_id) DO UPDATE SET
				profiling_status = CASE WHEN locked_until IS NULL OR locked_until <= ` + nowExpr + ` THEN 'pending' ELSE profiling_status END,
				locked_until = CASE WHEN locked_until IS NULL OR locked_until <= ` + nowExpr + ` THEN ` + lockExpr + ` ELSE locked_until END,
				updated_at = CURRENT_TIMESTAMP
		`
	}

	res, err := r.db.ExecContext(ctx, query, userID)
	if err != nil {
		return false, err
	}

	rows, _ := res.RowsAffected()
	return rows > 0, nil
}

func (r *sqlxContributorProfileRepository) ClaimPendingJob(ctx context.Context, userID int64) (bool, error) {
	res, err := r.db.ExecContext(ctx, `
		UPDATE contributor_profiles
		SET profiling_status = 'processing', updated_at = CURRENT_TIMESTAMP
		WHERE user_id = ? AND profiling_status = 'pending'
	`, userID)
	if err != nil {
		return false, err
	}
	rows, _ := res.RowsAffected()
	return rows > 0, nil
}

func (r *sqlxContributorProfileRepository) SaveSuccess(ctx context.Context, userID int64, dnaJSON string, totalMerged int) error {
	_, err := r.db.ExecContext(ctx, `
		UPDATE contributor_profiles
		SET profiling_status = 'completed',
		    dna_json = ?,
		    total_merged_prs = ?,
		    last_error = NULL,
		    analyzed_at = CURRENT_TIMESTAMP,
		    updated_at = CURRENT_TIMESTAMP
		WHERE user_id = ?
	`, dnaJSON, totalMerged, userID)
	return err
}

func (r *sqlxContributorProfileRepository) SaveSuccessWithPersona(ctx context.Context, userID int64, dnaJSON string, totalMerged int, persona string, starsPulledIn int) error {
	_, err := r.db.ExecContext(ctx, `
		UPDATE contributor_profiles
		SET profiling_status = 'completed',
		    dna_json = ?,
		    total_merged_prs = ?,
		    persona = ?,
		    stars_pulled_in = ?,
		    updated_persona_at = CURRENT_TIMESTAMP,
		    last_error = NULL,
		    analyzed_at = CURRENT_TIMESTAMP,
		    updated_at = CURRENT_TIMESTAMP
		WHERE user_id = ?
	`, dnaJSON, totalMerged, persona, starsPulledIn, userID)
	return err
}

func (r *sqlxContributorProfileRepository) SaveFailure(ctx context.Context, userID int64, status string, errMsg string) error {
	// If actionable failure (e.g. failed_auth), release locked_until so user can retry upon re-auth
	_, err := r.db.ExecContext(ctx, `
		UPDATE contributor_profiles
		SET profiling_status = ?,
		    last_error = ?,
		    locked_until = NULL,
		    updated_at = CURRENT_TIMESTAMP
		WHERE user_id = ?
	`, status, errMsg, userID)
	return err
}

func (r *sqlxContributorProfileRepository) SetOpenToOpportunities(ctx context.Context, userID int64, val bool) error {
	_, err := r.db.ExecContext(ctx, `
		UPDATE contributor_profiles
		SET open_to_opportunities = ?,
		    updated_at = CURRENT_TIMESTAMP
		WHERE user_id = ?
	`, val, userID)
	return err
}

func (r *sqlxContributorProfileRepository) GetOpenToOpportunities(ctx context.Context, userID int64) (bool, error) {
	var open bool
	err := r.db.GetContext(ctx, &open, `SELECT COALESCE(open_to_opportunities, FALSE) FROM contributor_profiles WHERE user_id = ?`, userID)
	if err == sql.ErrNoRows {
		return false, nil
	}
	if err != nil {
		return false, err
	}
	return open, nil
}

// ReindexRecruiterColumns recomputes the recruiter-search denormalized columns
// from the stored DNA payload and the contributor's verified merges into S/A-tier
// repos (AC8). It is safe to call repeatedly (idempotent) and never fails the
// caller's transaction on a partial miss — missing data degrades to empties/0.
func (r *sqlxContributorProfileRepository) ReindexRecruiterColumns(ctx context.Context, userID int64) error {
	var dnaJSON *string
	if err := r.db.GetContext(ctx, &dnaJSON, `SELECT dna_json FROM contributor_profiles WHERE user_id = ?`, userID); err != nil {
		if err == sql.ErrNoRows {
			return nil
		}
		return err
	}

	langsCSV, skill, style := "", "", ""
	if dnaJSON != nil && *dnaJSON != "" {
		var res dna.Result
		if err := json.Unmarshal([]byte(*dnaJSON), &res); err == nil {
			langsCSV = strings.Join(res.PrimaryLanguages, ",")
			skill = res.SkillLevel
			style = res.Persona
		}
	}

	var verifiedSA int
	// Verified merges into S/A-tier repos: the contributor owns the evaluated
	// repo (pr_evaluations.owner_user_id) and the outcome settled as a hit
	// against a repo currently graded S or A by C-Rank (latest_snapshots).
	_ = r.db.GetContext(ctx, &verifiedSA, `
		SELECT COUNT(*) FROM pr_evaluations pe
		JOIN latest_snapshots ls ON ls.repository_id = pe.repository_full_name
		WHERE pe.owner_user_id = ?
		  AND pe.outcome = 'hit'
		  AND ls.c_rank_tier IN ('S','A')
	`, userID)

	_, err := r.db.ExecContext(ctx, `
		UPDATE contributor_profiles
		SET primary_languages_csv = ?,
		    skill_level = ?,
		    contribution_style = ?,
		    verified_sa_merges = ?,
		    recruiter_indexed_at = CURRENT_TIMESTAMP,
		    updated_at = CURRENT_TIMESTAMP
		WHERE user_id = ?
	`, langsCSV, skill, style, verifiedSA, userID)
	return err
}
