package repository

import (
	"context"
	"database/sql"
	"time"

	"github.com/jmoiron/sqlx"
)

// ShareCard is a public, consent-published OG card for a preflight PR forecast.
type ShareCard struct {
	ID           string     `db:"id" json:"id"`
	UserID       int64      `db:"user_id" json:"-"`
	RepoFullName string     `db:"repo_full_name" json:"repo_full_name"`
	PRTitle      *string    `db:"pr_title" json:"pr_title,omitempty"`
	Summary      *string    `db:"summary" json:"summary,omitempty"`
	OverallScore float64    `db:"overall_score" json:"overall_score"`
	ReadyToMerge bool       `db:"ready_to_merge" json:"ready_to_merge"`
	RefToken     string     `db:"ref_token" json:"ref_token"`
	ConsentGiven bool       `db:"consent_given" json:"consent_given"`
	RevokedAt    *time.Time `db:"revoked_at" json:"revoked_at,omitempty"`
	CreatedAt    time.Time  `db:"created_at" json:"created_at"`
	ExpiresAt    time.Time  `db:"expires_at" json:"expires_at"`
}

type ShareCardRepository interface {
	Create(ctx context.Context, card *ShareCard, supersedePrevious bool) error
	GetByID(ctx context.Context, id string) (*ShareCard, error)
	ListByUser(ctx context.Context, userID int64) ([]ShareCard, error)
	Revoke(ctx context.Context, userID int64, cardID string) (bool, error)
}

type sqlxShareCardRepository struct {
	db *sqlx.DB
}

func NewShareCardRepository(db *sqlx.DB) ShareCardRepository {
	return &sqlxShareCardRepository{db: db}
}

// Create persists a new share card. When supersedePrevious is true, any still-live
// cards for the same user + repo expire immediately (eval rerun lifecycle).
func (r *sqlxShareCardRepository) Create(ctx context.Context, card *ShareCard, supersedePrevious bool) error {
	if supersedePrevious {
		if _, err := r.db.ExecContext(ctx,
			"UPDATE share_cards SET expires_at = CURRENT_TIMESTAMP WHERE user_id = ? AND repo_full_name = ? AND revoked_at IS NULL AND expires_at > CURRENT_TIMESTAMP",
			card.UserID, card.RepoFullName); err != nil {
			return err
		}
	}
	_, err := r.db.ExecContext(ctx, `
		INSERT INTO share_cards (id, user_id, repo_full_name, pr_title, summary, overall_score, ready_to_merge, ref_token, consent_given, created_at, expires_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?)
	`, card.ID, card.UserID, card.RepoFullName, card.PRTitle, card.Summary,
		card.OverallScore, card.ReadyToMerge, card.RefToken, card.ConsentGiven, card.ExpiresAt)
	return err
}

func (r *sqlxShareCardRepository) GetByID(ctx context.Context, id string) (*ShareCard, error) {
	var card ShareCard
	err := r.db.GetContext(ctx, &card, `
		SELECT id, user_id, repo_full_name, pr_title, summary, overall_score, ready_to_merge,
		       ref_token, consent_given, revoked_at, created_at, expires_at
		FROM share_cards WHERE id = ?
	`, id)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &card, nil
}

func (r *sqlxShareCardRepository) ListByUser(ctx context.Context, userID int64) ([]ShareCard, error) {
	cards := []ShareCard{}
	err := r.db.SelectContext(ctx, &cards, `
		SELECT id, user_id, repo_full_name, pr_title, summary, overall_score, ready_to_merge,
		       ref_token, consent_given, revoked_at, created_at, expires_at
		FROM share_cards
		WHERE user_id = ? AND expires_at > CURRENT_TIMESTAMP AND revoked_at IS NULL
		ORDER BY created_at DESC
		LIMIT 50
	`, userID)
	return cards, err
}

// Revoke marks a card revoked (creator-initiated). Returns false when the card
// does not belong to the user or was already revoked.
func (r *sqlxShareCardRepository) Revoke(ctx context.Context, userID int64, cardID string) (bool, error) {
	res, err := r.db.ExecContext(ctx,
		"UPDATE share_cards SET revoked_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ? AND revoked_at IS NULL",
		cardID, userID)
	if err != nil {
		return false, err
	}
	rows, _ := res.RowsAffected()
	return rows > 0, nil
}
