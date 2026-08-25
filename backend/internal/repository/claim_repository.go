package repository

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/jmoiron/sqlx"
)

type ClaimVerificationMethod string

const (
	ClaimMethodFile   ClaimVerificationMethod = "file"
	ClaimMethodOrg    ClaimVerificationMethod = "org"
	ClaimMethodDirect ClaimVerificationMethod = "direct"
)

type ClaimState string

const (
	ClaimStatePending  ClaimState = "pending"
	ClaimStateVerified ClaimState = "verified"
	ClaimStateLapsed   ClaimState = "lapsed"
	ClaimStateRevoked  ClaimState = "revoked"
)

// ClaimGracePeriod is how long a lapsed claim stays locked-but-recoverable
// before it is released for re-claim (AC4).
const ClaimGracePeriod = 7 * 24 * time.Hour

// ErrRepoAlreadyClaimed is returned when another maintainer holds the single
// active (pending/verified) claim slot for a repository (AC3/AC4).
var ErrRepoAlreadyClaimed = errors.New("repository already claimed by another maintainer")


type RepoClaimRecord struct {
	ID                 int64      `db:"id" json:"id"`
	RepoID             string     `db:"repo_id" json:"repo_id"`
	FullName           string     `db:"full_name" json:"full_name"`
	OwnerUserID        int64      `db:"owner_user_id" json:"owner_user_id"`
	VerificationMethod string     `db:"verification_method" json:"verification_method"`
	State              string     `db:"state" json:"state"`
	NonceToken         string     `db:"nonce_token" json:"nonce_token"`
	ExpiresAt          time.Time  `db:"expires_at" json:"expires_at"`
	VerifiedAt         *time.Time `db:"verified_at" json:"verified_at"`
	LastCheckedAt      *time.Time `db:"last_checked_at" json:"last_checked_at"`
	RevokedAt          *time.Time `db:"revoked_at" json:"revoked_at"`
	RevokeReason       string     `db:"revoke_reason" json:"revoke_reason"`
	CreatedAt          time.Time  `db:"created_at" json:"created_at"`
	UpdatedAt          time.Time  `db:"updated_at" json:"updated_at"`
}

type ClaimRepository interface {
	CreateOrUpdatePendingClaim(ctx context.Context, repoID, fullName string, ownerUserID int64, method ClaimVerificationMethod, nonce string, expiresAt time.Time) (*RepoClaimRecord, error)
	GetVerifiedClaimByRepoID(ctx context.Context, repoID string) (*RepoClaimRecord, error)
	GetClaimByRepoAndUser(ctx context.Context, repoID string, ownerUserID int64) (*RepoClaimRecord, error)
	GetClaimByRepoForUpdate(ctx context.Context, tx *sqlx.Tx, repoID string, ownerUserID int64) (*RepoClaimRecord, error)
	VerifyClaimTx(ctx context.Context, tx *sqlx.Tx, claimID int64) error
	RevokeClaim(ctx context.Context, claimID int64, reason string) error
	LapseClaim(ctx context.Context, claimID int64, reason string) error
	RestoreLapsedClaim(ctx context.Context, claimID int64) error
	TouchClaimChecked(ctx context.Context, claimID int64) error
	ListStaleVerifiedClaims(ctx context.Context, olderThan time.Duration, limit int) ([]RepoClaimRecord, error)
	ListStaleClaimsForRecheck(ctx context.Context, olderThan time.Duration, limit int) ([]RepoClaimRecord, error)
	ListVerifiedClaimsByUser(ctx context.Context, ownerUserID int64) ([]RepoClaimRecord, error)
	CreateDispute(ctx context.Context, repoFullName string, reporterUserID, claimedUserID int64, note string) error
	BeginTx(ctx context.Context) (*sqlx.Tx, error)
}

type sqlxClaimRepository struct {
	db *sqlx.DB
}

func NewClaimRepository(db *sqlx.DB) ClaimRepository {
	return &sqlxClaimRepository{db: db}
}

func (r *sqlxClaimRepository) BeginTx(ctx context.Context) (*sqlx.Tx, error) {
	return r.db.BeginTxx(ctx, nil)
}

// CreateOrUpdatePendingClaim creates or refreshes a pending claim for (repo_id, owner_user_id).
// At most one ACTIVE (pending/verified) claim row may exist per repo across
// all users: expired pending rows from other users are purged, and a live
// competing claim surfaces as ErrRepoAlreadyClaimed -> HTTP 409 (AC3, AC4).
func (r *sqlxClaimRepository) CreateOrUpdatePendingClaim(ctx context.Context, repoID, fullName string, ownerUserID int64, method ClaimVerificationMethod, nonce string, expiresAt time.Time) (*RepoClaimRecord, error) {
	// First check if another user already has a verified claim on this repo (AC3)
	verified, err := r.GetVerifiedClaimByRepoID(ctx, repoID)
	if err != nil && !errors.Is(err, sql.ErrNoRows) {
		return nil, err
	}
	if verified != nil && verified.OwnerUserID != ownerUserID {
		return nil, fmt.Errorf("%w", ErrRepoAlreadyClaimed)
	}

	// Expired pending claims from other users no longer hold the repo slot.
	if _, err := r.db.ExecContext(ctx,
		`DELETE FROM repo_claims WHERE repo_id = ? AND owner_user_id != ? AND state = 'pending' AND expires_at < CURRENT_TIMESTAMP`,
		repoID, ownerUserID); err != nil {
		return nil, err
	}

	// Insert or replace pending claim
	query := `
		INSERT INTO repo_claims (repo_id, full_name, owner_user_id, verification_method, state, nonce_token, expires_at, created_at, updated_at)
		VALUES (?, ?, ?, ?, 'pending', ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
		ON DUPLICATE KEY UPDATE
			full_name = VALUES(full_name),
			verification_method = VALUES(verification_method),
			state = IF(state = 'verified', 'verified', 'pending'),
			nonce_token = VALUES(nonce_token),
			expires_at = VALUES(expires_at),
			revoked_at = NULL,
			revoke_reason = '',
			updated_at = CURRENT_TIMESTAMP
	`
	if r.db.DriverName() == "sqlite" {
		query = `
			INSERT INTO repo_claims (repo_id, full_name, owner_user_id, verification_method, state, nonce_token, expires_at, created_at, updated_at)
			VALUES (?, ?, ?, ?, 'pending', ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
			ON CONFLICT(repo_id, owner_user_id) DO UPDATE SET
				full_name = excluded.full_name,
				verification_method = excluded.verification_method,
				state = CASE WHEN repo_claims.state = 'verified' THEN 'verified' ELSE 'pending' END,
				nonce_token = excluded.nonce_token,
				expires_at = excluded.expires_at,
				revoked_at = NULL,
				revoke_reason = '',
				updated_at = CURRENT_TIMESTAMP
		`
	}

	if _, err := r.db.ExecContext(ctx, query, repoID, fullName, ownerUserID, string(method), nonce, expiresAt); err != nil {
		if isDuplicateKeyErr(err) {
			// AC4: concurrent claim lost the single active-slot race -> 409, no partial state.
			return nil, fmt.Errorf("%w", ErrRepoAlreadyClaimed)
		}
		return nil, err
	}

	return r.GetClaimByRepoAndUser(ctx, repoID, ownerUserID)
}

// isDuplicateKeyErr reports whether err is a unique-constraint violation from
// MySQL (1062 / "Duplicate entry") or SQLite ("UNIQUE constraint failed").
func isDuplicateKeyErr(err error) bool {
	if err == nil {
		return false
	}
	msg := err.Error()
	return strings.Contains(msg, "Duplicate entry") ||
		strings.Contains(msg, "duplicate key") ||
		strings.Contains(msg, "UNIQUE constraint failed")
}

func (r *sqlxClaimRepository) GetVerifiedClaimByRepoID(ctx context.Context, repoID string) (*RepoClaimRecord, error) {
	var claim RepoClaimRecord
	query := `SELECT * FROM repo_claims WHERE repo_id = ? AND state = 'verified' LIMIT 1`
	if err := r.db.GetContext(ctx, &claim, query, repoID); err != nil {
		return nil, err
	}
	return &claim, nil
}

func (r *sqlxClaimRepository) GetClaimByRepoAndUser(ctx context.Context, repoID string, ownerUserID int64) (*RepoClaimRecord, error) {
	var claim RepoClaimRecord
	query := `SELECT * FROM repo_claims WHERE repo_id = ? AND owner_user_id = ? LIMIT 1`
	if err := r.db.GetContext(ctx, &claim, query, repoID, ownerUserID); err != nil {
		return nil, err
	}
	return &claim, nil
}

func (r *sqlxClaimRepository) GetClaimByRepoForUpdate(ctx context.Context, tx *sqlx.Tx, repoID string, ownerUserID int64) (*RepoClaimRecord, error) {
	var claim RepoClaimRecord
	query := `SELECT * FROM repo_claims WHERE repo_id = ? AND owner_user_id = ? FOR UPDATE`
	if tx.DriverName() == "sqlite" {
		query = `SELECT * FROM repo_claims WHERE repo_id = ? AND owner_user_id = ?`
	}
	if err := tx.GetContext(ctx, &claim, query, repoID, ownerUserID); err != nil {
		return nil, err
	}
	return &claim, nil
}

// VerifyClaimTx marks the claim verified inside the caller's transaction and
// enforces one verified claim per repo (AC3/AC4). The nonce is consumed
// (single-use, AC5): post-verification auth never relies on the file again.
func (r *sqlxClaimRepository) VerifyClaimTx(ctx context.Context, tx *sqlx.Tx, claimID int64) error {
	// First check if another claim is already verified for this repo
	var count int
	checkQuery := `SELECT COUNT(1) FROM repo_claims WHERE repo_id = (SELECT repo_id FROM repo_claims WHERE id = ?) AND state = 'verified' AND id != ?`
	if err := tx.GetContext(ctx, &count, checkQuery, claimID, claimID); err != nil {
		return err
	}
	if count > 0 {
		return fmt.Errorf("another maintainer claim is already verified for this repository")
	}

	query := `
		UPDATE repo_claims
		SET state = 'verified', verified_at = CURRENT_TIMESTAMP, last_checked_at = CURRENT_TIMESTAMP,
		    nonce_token = '', updated_at = CURRENT_TIMESTAMP
		WHERE id = ?
	`
	_, err := tx.ExecContext(ctx, query, claimID)
	return err
}

func (r *sqlxClaimRepository) RevokeClaim(ctx context.Context, claimID int64, reason string) error {
	query := `
		UPDATE repo_claims
		SET state = 'revoked', revoked_at = CURRENT_TIMESTAMP, revoke_reason = ?, updated_at = CURRENT_TIMESTAMP
		WHERE id = ?
	`
	_, err := r.db.ExecContext(ctx, query, reason, claimID)
	return err
}

// LapseClaim marks a verified claim lapsed after a failed re-check (AC4):
// the console locks (only state='verified' rows grant access) and the row
// stays recoverable for the 7-day grace window anchored on updated_at.
func (r *sqlxClaimRepository) LapseClaim(ctx context.Context, claimID int64, reason string) error {
	query := `
		UPDATE repo_claims
		SET state = 'lapsed', revoke_reason = ?, updated_at = CURRENT_TIMESTAMP
		WHERE id = ? AND state = 'verified'
	`
	_, err := r.db.ExecContext(ctx, query, reason, claimID)
	return err
}

// RestoreLapsedClaim returns a lapsed claim to verified once a re-check
// passes within the grace window (AC4).
func (r *sqlxClaimRepository) RestoreLapsedClaim(ctx context.Context, claimID int64) error {
	query := `
		UPDATE repo_claims
		SET state = 'verified', revoke_reason = '', last_checked_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
		WHERE id = ? AND state = 'lapsed'
	`
	_, err := r.db.ExecContext(ctx, query, claimID)
	return err
}

func (r *sqlxClaimRepository) TouchClaimChecked(ctx context.Context, claimID int64) error {
	query := `
		UPDATE repo_claims
		SET last_checked_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
		WHERE id = ?
	`
	_, err := r.db.ExecContext(ctx, query, claimID)
	return err
}

func (r *sqlxClaimRepository) ListStaleVerifiedClaims(ctx context.Context, olderThan time.Duration, limit int) ([]RepoClaimRecord, error) {
	if limit <= 0 {
		limit = 100
	}
	cutoff := time.Now().UTC().Add(-olderThan)
	var claims []RepoClaimRecord
	query := `
		SELECT * FROM repo_claims
		WHERE state = 'verified'
		  AND (last_checked_at IS NULL OR last_checked_at < ?)
		ORDER BY COALESCE(last_checked_at, verified_at, created_at) ASC
		LIMIT ?
	`
	if err := r.db.SelectContext(ctx, &claims, query, cutoff, limit); err != nil {
		return nil, err
	}
	return claims, nil
}

func (r *sqlxClaimRepository) ListVerifiedClaimsByUser(ctx context.Context, userID int64) ([]RepoClaimRecord, error) {
	var claims []RepoClaimRecord
	query := `
		SELECT * FROM repo_claims
		WHERE owner_user_id = ? AND state = 'verified'
		ORDER BY created_at DESC
	`
	if err := r.db.SelectContext(ctx, &claims, query, userID); err != nil {
		return nil, err
	}
	return claims, nil
}

// ListStaleClaimsForRecheck returns verified AND lapsed claims due for the
// weekly re-check (AC4): verified rows get revalidated; lapsed rows either
// recover or fall out of grace and are released.
func (r *sqlxClaimRepository) ListStaleClaimsForRecheck(ctx context.Context, olderThan time.Duration, limit int) ([]RepoClaimRecord, error) {
	if limit <= 0 {
		limit = 100
	}
	cutoff := time.Now().UTC().Add(-olderThan)
	var claims []RepoClaimRecord
	query := `
		SELECT * FROM repo_claims
		WHERE state IN ('verified', 'lapsed')
		  AND (last_checked_at IS NULL OR last_checked_at < ?)
		ORDER BY COALESCE(last_checked_at, verified_at, created_at) ASC
		LIMIT ?
	`
	if err := r.db.SelectContext(ctx, &claims, query, cutoff, limit); err != nil {
		return nil, err
	}
	return claims, nil
}

// CreateDispute files a second-claimant conflict into the admin review queue
// (AC3). No auto-transfer happens: an admin resolves the dispute manually.
func (r *sqlxClaimRepository) CreateDispute(ctx context.Context, repoFullName string, reporterUserID, claimedUserID int64, note string) error {
	query := `
		INSERT INTO claim_disputes (repo_full_name, reporter_user_id, claimed_user_id, note, status, created_at)
		VALUES (?, ?, ?, ?, 'open', CURRENT_TIMESTAMP)
	`
	_, err := r.db.ExecContext(ctx, query, repoFullName, reporterUserID, claimedUserID, note)
	return err
}