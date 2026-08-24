package repository

import (
	"context"
	"errors"
	"fmt"

	"github.com/abhisheksoni27/opendoor/internal/crypto"
	"github.com/abhisheksoni27/opendoor/internal/notification"
	"github.com/jmoiron/sqlx"
)

// WatchlistWebhook is the masked, API-safe view of one Slack/Discord channel.
type WatchlistWebhook struct {
	ID      int64  `json:"id"`
	Label   string `json:"label"`
	URL     string `json:"url"`
	Enabled bool   `json:"enabled"`
}

type WatchlistWebhookRepository interface {
	Add(ctx context.Context, userID int64, label, rawURL string) (*WatchlistWebhook, error)
	List(ctx context.Context, userID int64) ([]WatchlistWebhook, error)
	Remove(ctx context.Context, userID, webhookID int64) error
}

type sqlxWatchlistWebhookRepository struct {
	db     *sqlx.DB
	encKey []byte
}

func NewWatchlistWebhookRepository(db *sqlx.DB, encKey []byte) WatchlistWebhookRepository {
	return &sqlxWatchlistWebhookRepository{db: db, encKey: encKey}
}

var ErrWebhookLimitReached = errors.New("webhook limit reached (max 5)")

func (r *sqlxWatchlistWebhookRepository) Add(ctx context.Context, userID int64, label, rawURL string) (*WatchlistWebhook, error) {
	label = notification.NormalizeWebhookLabel(label)
	if !notification.ValidWebhookLabel(label) {
		return nil, errors.New("label must be 'slack' or 'discord'")
	}
	if err := notification.ValidateWebhookURL(rawURL); err != nil {
		return nil, err
	}
	var count int
	if err := r.db.GetContext(ctx, &count, `SELECT COUNT(*) FROM user_webhooks WHERE user_id = ?`, userID); err != nil {
		return nil, err
	}
	if count >= notification.MaxWebhooksPerUser {
		return nil, ErrWebhookLimitReached
	}
	urlEnc, err := crypto.EncryptAESGCM([]byte(rawURL), r.encKey)
	if err != nil {
		return nil, fmt.Errorf("encrypt webhook url: %w", err)
	}
	res, err := r.db.ExecContext(ctx, `
		INSERT INTO user_webhooks (user_id, label, url_enc, enabled, consecutive_failures, created_at, updated_at)
		VALUES (?, ?, ?, TRUE, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
	`, userID, label, urlEnc)
	if err != nil {
		return nil, err
	}
	id, _ := res.LastInsertId()
	return &WatchlistWebhook{ID: id, Label: label, URL: notification.MaskWebhookURL(rawURL), Enabled: true}, nil
}

type webhookStoredRow struct {
	ID      int64  `db:"id"`
	Label   string `db:"label"`
	URLEnc  string `db:"url_enc"`
	Enabled bool   `db:"enabled"`
}

func (r *sqlxWatchlistWebhookRepository) List(ctx context.Context, userID int64) ([]WatchlistWebhook, error) {
	var rows []webhookStoredRow
	err := r.db.SelectContext(ctx, &rows,
		`SELECT id, label, url_enc, enabled FROM user_webhooks WHERE user_id = ? ORDER BY created_at ASC`, userID)
	if err != nil {
		return nil, err
	}
	items := make([]WatchlistWebhook, 0, len(rows))
	for _, row := range rows {
		masked := fmt.Sprintf("#%d", row.ID)
		if raw, decErr := crypto.DecryptAESGCM(row.URLEnc, r.encKey); decErr == nil && raw != "" {
			masked = notification.MaskWebhookURL(raw)
		}
		items = append(items, WatchlistWebhook{
			ID:      row.ID,
			Label:   row.Label,
			URL:     masked,
			Enabled: row.Enabled,
		})
	}
	return items, nil
}

func (r *sqlxWatchlistWebhookRepository) Remove(ctx context.Context, userID, webhookID int64) error {
	_, err := r.db.ExecContext(ctx,
		`DELETE FROM user_webhooks WHERE id = ? AND user_id = ?`, webhookID, userID)
	return err
}
