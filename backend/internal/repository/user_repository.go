package repository

import (
	"context"
	"database/sql"
	"time"

	"github.com/abhisheksoni27/opendoor/internal/config"
	"github.com/abhisheksoni27/opendoor/internal/crypto"
	"github.com/jmoiron/sqlx"
)

type User struct {
	ID        int64   `db:"id" json:"id"`
	GithubID  int64   `db:"github_id" json:"github_id"`
	Username  string  `db:"username" json:"username"`
	Email     *string `db:"email" json:"email,omitempty"`
	AvatarURL *string `db:"avatar_url" json:"avatar_url,omitempty"`
	CreatedAt time.Time `db:"created_at" json:"created_at"`
	UpdatedAt time.Time `db:"updated_at" json:"updated_at"`
}

type UserRepository interface {
	FindByGithubID(ctx context.Context, githubID int64) (*User, error)
	FindByID(ctx context.Context, id int64) (*User, error)
	UpsertUser(ctx context.Context, githubID int64, username, email, avatarURL string) (int64, error)
}

type sqlxUserRepository struct {
	db     *sqlx.DB
	encKey []byte
}

func NewUserRepository(db *sqlx.DB, cfg *config.Config) UserRepository {
	encKey := []byte(cfg.EncryptionKey)
	if len(encKey) > 32 {
		encKey = encKey[:32]
	}
	return &sqlxUserRepository{
		db:     db,
		encKey: encKey,
	}
}

func (r *sqlxUserRepository) FindByGithubID(ctx context.Context, githubID int64) (*User, error) {
	var user User
	err := r.db.GetContext(ctx, &user, "SELECT id, github_id, username, email, avatar_url, created_at, updated_at FROM users WHERE github_id = ?", githubID)
	if err != nil {
		return nil, err
	}

	r.decryptUserPII(&user)
	return &user, nil
}

func (r *sqlxUserRepository) FindByID(ctx context.Context, id int64) (*User, error) {
	var user User
	err := r.db.GetContext(ctx, &user, "SELECT id, github_id, username, email, avatar_url, created_at, updated_at FROM users WHERE id = ?", id)
	if err != nil {
		return nil, err
	}

	r.decryptUserPII(&user)
	return &user, nil
}

func (r *sqlxUserRepository) UpsertUser(ctx context.Context, githubID int64, username, email, avatarURL string) (int64, error) {
	encUsername, _ := crypto.EncryptAESGCM([]byte(username), r.encKey)
	encEmail, _ := crypto.EncryptAESGCM([]byte(email), r.encKey)
	encAvatar, _ := crypto.EncryptAESGCM([]byte(avatarURL), r.encKey)

	var existingID int64
	err := r.db.GetContext(ctx, &existingID, "SELECT id FROM users WHERE github_id = ?", githubID)
	if err == sql.ErrNoRows || err != nil {
		res, err := r.db.ExecContext(ctx, `
			INSERT INTO users (github_id, username, email, avatar_url, created_at, updated_at)
			VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
		`, githubID, encUsername, encEmail, encAvatar)
		if err != nil {
			return 0, err
		}
		return res.LastInsertId()
	}

	_, err = r.db.ExecContext(ctx, `
		UPDATE users SET username = ?, email = ?, avatar_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
	`, encUsername, encEmail, encAvatar, existingID)
	if err != nil {
		return 0, err
	}

	return existingID, nil
}

func (r *sqlxUserRepository) decryptUserPII(user *User) {
	decUser, err := crypto.DecryptAESGCM(user.Username, r.encKey)
	if err == nil && decUser != "" {
		user.Username = decUser
	}

	if user.Email != nil && *user.Email != "" {
		decEmail, err := crypto.DecryptAESGCM(*user.Email, r.encKey)
		if err == nil && decEmail != "" {
			user.Email = &decEmail
		}
	}

	if user.AvatarURL != nil && *user.AvatarURL != "" {
		decAvatar, err := crypto.DecryptAESGCM(*user.AvatarURL, r.encKey)
		if err == nil && decAvatar != "" {
			user.AvatarURL = &decAvatar
		}
	}
}
