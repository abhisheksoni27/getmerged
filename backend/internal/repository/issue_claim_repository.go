package repository

import (
	"context"
	"database/sql"
	"errors"
	"time"

	"github.com/jmoiron/sqlx"
)

// ClaimedLabel is the GitHub label AC4 adds so the AC3 pre-check is real and
// prevents duplicate claim comments across tabs/devices.
const ClaimedLabel = "claimed"

// IssueClaimState describes the lifecycle of a user's issue claim.
type IssueClaimState string

const (
	// IssueClaimPendingReview: comment posted, label not yet confirmed (AC6).
	IssueClaimPendingReview IssueClaimState = "pending_review"
	// IssueClaimActive: comment posted and 'claimed' label applied.
	IssueClaimActive IssueClaimState = "active"
)

// IssueClaimRecord is a server-persisted issue claim, dashboard-synced.
type IssueClaimRecord struct {
	ID                int64      `db:"id" json:"id"`
	UserID            int64      `db:"user_id" json:"user_id"`
	RepoFullName      string     `db:"repo_full_name" json:"repo_full_name"`
	IssueNumber       int        `db:"issue_number" json:"issue_number"`
	IssueNodeID       string     `db:"issue_node_id" json:"issue_node_id"`
	GitHubCommentID   int64      `db:"github_comment_id" json:"github_comment_id"`
	State             string     `db:"state" json:"state"`
	AttributionURL    string     `db:"attribution_url" json:"attribution_url"`
	LabelAdded        bool       `db:"label_added" json:"label_added"`
	CreatedAt         time.Time  `db:"created_at" json:"created_at"`
	UpdatedAt         time.Time  `db:"updated_at" json:"updated_at"`
}

// IssueClaimRepository persists Good First Issue claims keyed by (user, repo, issue).
type IssueClaimRepository interface {
	BeginTx(ctx context.Context) (*sqlx.Tx, error)
	GetByUserAndIssue(ctx context.Context, userID int64, repoFullName string, issueNumber int) (*IssueClaimRecord, error)
	InsertClaimTx(ctx context.Context, tx *sqlx.Tx, rec *IssueClaimRecord) (*IssueClaimRecord, error)
	UpdateStateTx(ctx context.Context, tx *sqlx.Tx, id int64, state string, labelAdded bool) error
	ListPendingReviewByUser(ctx context.Context, userID int64) ([]IssueClaimRecord, error)
	LogClaimComment(ctx context.Context, userID int64) error
	CountClaimCommentsLastWindow(ctx context.Context, userID int64, since time.Time) (int, error)
}

type sqlxIssueClaimRepository struct {
	db *sqlx.DB
}

func NewIssueClaimRepository(db *sqlx.DB) IssueClaimRepository {
	return &sqlxIssueClaimRepository{db: db}
}

func (r *sqlxIssueClaimRepository) BeginTx(ctx context.Context) (*sqlx.Tx, error) {
	return r.db.BeginTxx(ctx, nil)
}

func (r *sqlxIssueClaimRepository) GetByUserAndIssue(ctx context.Context, userID int64, repoFullName string, issueNumber int) (*IssueClaimRecord, error) {
	var rec IssueClaimRecord
	err := r.db.GetContext(ctx, &rec, `
		SELECT id, user_id, repo_full_name, issue_number, issue_node_id, github_comment_id, state, attribution_url, label_added, created_at, updated_at
		FROM issue_claims
		WHERE user_id = ? AND repo_full_name = ? AND issue_number = ?
		LIMIT 1`, userID, repoFullName, issueNumber)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &rec, nil
}

func (r *sqlxIssueClaimRepository) InsertClaimTx(ctx context.Context, tx *sqlx.Tx, rec *IssueClaimRecord) (*IssueClaimRecord, error) {
	now := time.Now().UTC()
	insertQ := `INSERT INTO issue_claims
		(user_id, repo_full_name, issue_number, issue_node_id, github_comment_id, state, attribution_url, label_added, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
	if tx.DriverName() == "sqlite" {
		insertQ = `INSERT INTO issue_claims
		(user_id, repo_full_name, issue_number, issue_node_id, github_comment_id, state, attribution_url, label_added, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
	}
	res, err := tx.ExecContext(ctx, insertQ,
		rec.UserID, rec.RepoFullName, rec.IssueNumber, rec.IssueNodeID, rec.GitHubCommentID,
		rec.State, rec.AttributionURL, rec.LabelAdded, now, now)
	if err != nil {
		return nil, err
	}
	id, _ := res.LastInsertId()
	rec.ID = id
	rec.CreatedAt = now
	rec.UpdatedAt = now
	return rec, nil
}

func (r *sqlxIssueClaimRepository) UpdateStateTx(ctx context.Context, tx *sqlx.Tx, id int64, state string, labelAdded bool) error {
	_, err := tx.ExecContext(ctx,
		`UPDATE issue_claims SET state = ?, label_added = ?, updated_at = ? WHERE id = ?`,
		state, labelAdded, time.Now().UTC(), id)
	return err
}

func (r *sqlxIssueClaimRepository) ListPendingReviewByUser(ctx context.Context, userID int64) ([]IssueClaimRecord, error) {
	var recs []IssueClaimRecord
	err := r.db.GetContext(ctx, &recs, `
		SELECT id, user_id, repo_full_name, issue_number, issue_node_id, github_comment_id, state, attribution_url, label_added, created_at, updated_at
		FROM issue_claims WHERE user_id = ? AND state = ?`, userID, string(IssueClaimPendingReview))
	if err != nil {
		return nil, err
	}
	return recs, nil
}

// LogClaimComment records that a claim comment was actually posted (AC9
// abuse throttle counter).
func (r *sqlxIssueClaimRepository) LogClaimComment(ctx context.Context, userID int64) error {
	_, err := r.db.ExecContext(ctx,
		`INSERT INTO issue_claim_comment_log (user_id, created_at) VALUES (?, ?)`,
		userID, time.Now().UTC())
	return err
}

func (r *sqlxIssueClaimRepository) CountClaimCommentsLastWindow(ctx context.Context, userID int64, since time.Time) (int, error) {
	var n int
	err := r.db.GetContext(ctx, &n,
		`SELECT COUNT(*) FROM issue_claim_comment_log WHERE user_id = ? AND created_at >= ?`, userID, since)
	if err != nil {
		return 0, err
	}
	return n, nil
}

// ErrClaimCommentRateLimited signals the per-user abuse throttle tripped (AC9).
var ErrClaimCommentRateLimited = errors.New("claim comment rate limit exceeded (429)")
