package repository

import (
	"context"
	"database/sql"
	"time"

	"github.com/jmoiron/sqlx"
)

// UserAPIKey is a hashed-at-rest public API key. The raw key is shown exactly
// once at creation; only key_hash is persisted.
type UserAPIKey struct {
	ID         int64      `db:"id" json:"id"`
	UserID     int64      `db:"user_id" json:"-"`
	Name       string     `db:"name" json:"name"`
	KeyPrefix  string     `db:"key_prefix" json:"key_prefix"`
	KeyHash    string     `db:"key_hash" json:"-"`
	LastUsedAt *time.Time `db:"last_used_at" json:"last_used_at"`
	RevokedAt  *time.Time `db:"revoked_at" json:"revoked_at"`
	CreatedAt  time.Time  `db:"created_at" json:"created_at"`
}

type APIKeyRepository interface {
	CreateAPIKey(ctx context.Context, userID int64, name, keyHash, keyPrefix string) (*UserAPIKey, error)
	ListAPIKeys(ctx context.Context, userID int64) ([]UserAPIKey, error)
	RevokeAPIKey(ctx context.Context, userID, keyID int64) error
	CountActiveKeys(ctx context.Context, userID int64) (int64, error)
	// CountCreatedSince counts keys created since the given time; used to
	// throttle key creation to 5 per user per rolling day (AC1).
	CountCreatedSince(ctx context.Context, userID int64, since time.Time) (int64, error)
	FindActiveByKeyHash(ctx context.Context, keyHash string) (*UserAPIKey, error)
	TouchLastUsed(ctx context.Context, keyID int64)
}

type sqlxAPIKeyRepository struct {
	db *sqlx.DB
}

func NewAPIKeyRepository(db *sqlx.DB) APIKeyRepository {
	return &sqlxAPIKeyRepository{db: db}
}

func (r *sqlxAPIKeyRepository) CreateAPIKey(ctx context.Context, userID int64, name, keyHash, keyPrefix string) (*UserAPIKey, error) {
	res, err := r.db.ExecContext(ctx,
		"INSERT INTO user_api_keys (user_id, name, key_prefix, key_hash, created_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)",
		userID, name, keyPrefix, keyHash)
	if err != nil {
		return nil, err
	}
	id, err := res.LastInsertId()
	if err != nil {
		return nil, err
	}
	return &UserAPIKey{
		ID:        id,
		UserID:    userID,
		Name:      name,
		KeyPrefix: keyPrefix,
		KeyHash:   keyHash,
		CreatedAt: time.Now().UTC(),
	}, nil
}

func (r *sqlxAPIKeyRepository) ListAPIKeys(ctx context.Context, userID int64) ([]UserAPIKey, error) {
	var keys []UserAPIKey
	err := r.db.SelectContext(ctx, &keys, `
		SELECT id, user_id, name, key_prefix, key_hash, last_used_at, revoked_at, created_at
		FROM user_api_keys
		WHERE user_id = ?
		ORDER BY created_at DESC
	`, userID)
	return keys, err
}

func (r *sqlxAPIKeyRepository) RevokeAPIKey(ctx context.Context, userID, keyID int64) error {
	res, err := r.db.ExecContext(ctx,
		"UPDATE user_api_keys SET revoked_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ? AND revoked_at IS NULL",
		keyID, userID)
	if err != nil {
		return err
	}
	rows, _ := res.RowsAffected()
	if rows == 0 {
		return sql.ErrNoRows
	}
	return nil
}

func (r *sqlxAPIKeyRepository) CountActiveKeys(ctx context.Context, userID int64) (int64, error) {
	var n int64
	err := r.db.GetContext(ctx, &n,
		"SELECT COUNT(*) FROM user_api_keys WHERE user_id = ? AND revoked_at IS NULL", userID)
	return n, err
}

// CountCreatedSince counts keys the user created since the given instant.
func (r *sqlxAPIKeyRepository) CountCreatedSince(ctx context.Context, userID int64, since time.Time) (int64, error) {
	var n int64
	err := r.db.GetContext(ctx, &n,
		"SELECT COUNT(*) FROM user_api_keys WHERE user_id = ? AND created_at >= ?", userID, since.UTC())
	return n, err
}

// FindActiveByKeyHash resolves a key hash to a non-revoked key for auth.
func (r *sqlxAPIKeyRepository) FindActiveByKeyHash(ctx context.Context, keyHash string) (*UserAPIKey, error) {
	var key UserAPIKey
	err := r.db.GetContext(ctx, &key, `
		SELECT id, user_id, name, key_prefix, key_hash, last_used_at, revoked_at, created_at
		FROM user_api_keys
		WHERE key_hash = ? AND revoked_at IS NULL
	`, keyHash)
	if err != nil {
		return nil, err
	}
	return &key, nil
}

func (r *sqlxAPIKeyRepository) TouchLastUsed(ctx context.Context, keyID int64) {
	_, _ = r.db.ExecContext(ctx,
		"UPDATE user_api_keys SET last_used_at = CURRENT_TIMESTAMP WHERE id = ?", keyID)
}
