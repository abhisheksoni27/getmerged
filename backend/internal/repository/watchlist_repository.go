package repository

import (
	"context"
	"database/sql"

	"github.com/jmoiron/sqlx"
)

type WatchlistRepoItem struct {
	RepoID                   string  `db:"repo_id" json:"repo_id"`
	FullName                 string  `db:"full_name" json:"full_name"`
	Language                 string  `db:"language" json:"language"`
	Stars                    int     `db:"stars" json:"stars"`
	Description              string  `db:"description" json:"description"`
	GithubURL                string  `db:"github_url" json:"github_url"`
	CRankTier                string  `db:"c_rank_tier" json:"c_rank_tier"`
	CRankScore               float64 `db:"c_rank_score" json:"c_rank_score"`
	TimeToFirstResponseHours float64 `db:"time_to_first_response_hours" json:"time_to_first_response_hours"`
	ExternalPRMergeRate      float64 `db:"external_pr_merge_rate" json:"external_pr_merge_rate"`
	AddedAt                  string  `db:"added_at" json:"added_at"`
}

type WatchlistRepository interface {
	Add(ctx context.Context, userID int64, repoID string) error
	Remove(ctx context.Context, userID int64, repoID string) error
	ListByUserID(ctx context.Context, userID int64) ([]string, error)
	// SetNotify toggles C-Rank change alert emails for one watched repo (AC3).
	SetNotify(ctx context.Context, userID int64, repoID string, enabled bool) error
	// ListAlertStatus maps each watched repo_id to its notify_rank_change flag.
	ListAlertStatus(ctx context.Context, userID int64) (map[string]bool, error)
}

type sqlxWatchlistRepository struct {
	db *sqlx.DB
}

func NewWatchlistRepository(db *sqlx.DB) WatchlistRepository {
	return &sqlxWatchlistRepository{db: db}
}

func (r *sqlxWatchlistRepository) Add(ctx context.Context, userID int64, repoID string) error {
	query := `
		INSERT INTO user_watchlists (user_id, repo_id, notify_rank_change, created_at)
		VALUES (?, ?, TRUE, CURRENT_TIMESTAMP)
		ON DUPLICATE KEY UPDATE notify_rank_change=VALUES(notify_rank_change)
	`
	if r.db.DriverName() == "sqlite" {
		query = `
			INSERT OR IGNORE INTO user_watchlists (user_id, repo_id, notify_rank_change, created_at)
			VALUES (?, ?, TRUE, CURRENT_TIMESTAMP)
		`
	}
	_, err := r.db.ExecContext(ctx, query, userID, repoID)
	return err
}

func (r *sqlxWatchlistRepository) Remove(ctx context.Context, userID int64, repoID string) error {
	_, err := r.db.ExecContext(ctx, `
		DELETE FROM user_watchlists WHERE user_id = ? AND repo_id = ?
	`, userID, repoID)
	return err
}

func (r *sqlxWatchlistRepository) ListByUserID(ctx context.Context, userID int64) ([]string, error) {
	var repoIDs []string
	query := `SELECT repo_id FROM user_watchlists WHERE user_id = ? ORDER BY created_at DESC`
	if err := r.db.SelectContext(ctx, &repoIDs, query, userID); err != nil {
		return nil, err
	}
	if repoIDs == nil {
		repoIDs = []string{}
	}
	return repoIDs, nil
}

func (r *sqlxWatchlistRepository) SetNotify(ctx context.Context, userID int64, repoID string, enabled bool) error {
	res, err := r.db.ExecContext(ctx,
		`UPDATE user_watchlists SET notify_rank_change = ? WHERE user_id = ? AND repo_id = ?`,
		enabled, userID, repoID)
	if err != nil {
		return err
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return sql.ErrNoRows
	}
	return nil
}

func (r *sqlxWatchlistRepository) ListAlertStatus(ctx context.Context, userID int64) (map[string]bool, error) {
	var items []struct {
		RepoID           string `db:"repo_id"`
		NotifyRankChange bool   `db:"notify_rank_change"`
	}
	if err := r.db.SelectContext(ctx, &items,
		`SELECT repo_id, COALESCE(notify_rank_change, TRUE) AS notify_rank_change FROM user_watchlists WHERE user_id = ?`, userID); err != nil {
		return nil, err
	}
	alerts := make(map[string]bool, len(items))
	for _, it := range items {
		alerts[it.RepoID] = it.NotifyRankChange
	}
	return alerts, nil
}
