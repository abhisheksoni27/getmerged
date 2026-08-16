package repository

import (
	"context"
	"database/sql"
	"time"

	"github.com/abhisheksoni27/opendoor/internal/config"
	"github.com/abhisheksoni27/opendoor/internal/crypto"
	"github.com/jmoiron/sqlx"
)

type OAuthTokenRecord struct {
	UserID          int64      `db:"user_id"`
	Provider        string     `db:"provider"`
	AccessTokenEnc  string     `db:"access_token_enc"`
	RefreshTokenEnc *string    `db:"refresh_token_enc"`
	ExpiresAt       *time.Time `db:"expires_at"`
	UpdatedAt       time.Time  `db:"updated_at"`
}

type OAuthTokenRepository interface {
	UpsertToken(ctx context.Context, userID int64, provider, accessToken, refreshToken string, expiresAt *time.Time) error
	GetToken(ctx context.Context, userID int64, provider string) (accessToken, refreshToken string, expiresAt *time.Time, err error)
}

type sqlxOAuthTokenRepository struct {
	db     *sqlx.DB
	encKey []byte
}

func NewOAuthTokenRepository(db *sqlx.DB, cfg *config.Config) OAuthTokenRepository {
	encKey := []byte(cfg.EncryptionKey)
	if len(encKey) > 32 {
		encKey = encKey[:32]
	}
	return &sqlxOAuthTokenRepository{
		db:     db,
		encKey: encKey,
	}
}

func (r *sqlxOAuthTokenRepository) UpsertToken(ctx context.Context, userID int64, provider, accessToken, refreshToken string, expiresAt *time.Time) error {
	encAccess, err := crypto.EncryptAESGCM([]byte(accessToken), r.encKey)
	if err != nil {
		return err
	}

	var encRefresh *string
	if refreshToken != "" {
		er, err := crypto.EncryptAESGCM([]byte(refreshToken), r.encKey)
		if err != nil {
			return err
		}
		encRefresh = &er
	}

	query := `
		INSERT INTO user_oauth_tokens (user_id, provider, access_token_enc, refresh_token_enc, expires_at, updated_at)
		VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
		ON DUPLICATE KEY UPDATE
			access_token_enc = VALUES(access_token_enc),
			refresh_token_enc = VALUES(refresh_token_enc),
			expires_at = VALUES(expires_at),
			updated_at = CURRENT_TIMESTAMP
	`
	if r.db.DriverName() == "sqlite" {
		query = `
			INSERT INTO user_oauth_tokens (user_id, provider, access_token_enc, refresh_token_enc, expires_at, updated_at)
			VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
			ON CONFLICT(user_id, provider) DO UPDATE SET
				access_token_enc = excluded.access_token_enc,
				refresh_token_enc = excluded.refresh_token_enc,
				expires_at = excluded.expires_at,
				updated_at = CURRENT_TIMESTAMP
		`
	}

	_, err = r.db.ExecContext(ctx, query, userID, provider, encAccess, encRefresh, expiresAt)
	return err
}

func (r *sqlxOAuthTokenRepository) GetToken(ctx context.Context, userID int64, provider string) (string, string, *time.Time, error) {
	var rec OAuthTokenRecord
	err := r.db.GetContext(ctx, &rec, "SELECT user_id, provider, access_token_enc, refresh_token_enc, expires_at, updated_at FROM user_oauth_tokens WHERE user_id = ? AND provider = ?", userID, provider)
	if err == sql.ErrNoRows {
		return "", "", nil, nil
	}
	if err != nil {
		return "", "", nil, err
	}

	plainAccess, err := crypto.DecryptAESGCM(rec.AccessTokenEnc, r.encKey)
	if err != nil {
		return "", "", nil, err
	}

	var plainRefresh string
	if rec.RefreshTokenEnc != nil && *rec.RefreshTokenEnc != "" {
		pr, err := crypto.DecryptAESGCM(*rec.RefreshTokenEnc, r.encKey)
		if err != nil {
			return "", "", nil, err
		}
		plainRefresh = pr
	}

	return plainAccess, plainRefresh, rec.ExpiresAt, nil
}
