package repository

import (
	"context"

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
	ListByUserID(ctx context.Context, userID int64) ([]WatchlistRepoItem, error)
}

type sqlxWatchlistRepository struct {
	db *sqlx.DB
}

func NewWatchlistRepository(db *sqlx.DB) WatchlistRepository {
	return &sqlxWatchlistRepository{db: db}
}

func (r *sqlxWatchlistRepository) Add(ctx context.Context, userID int64, repoID string) error {
	_, err := r.db.ExecContext(ctx, `
		INSERT INTO user_watchlists (user_id, repo_id, notify_rank_change, created_at)
		VALUES (?, ?, TRUE, CURRENT_TIMESTAMP)
		ON CONFLICT(user_id, repo_id) DO NOTHING
	`, userID, repoID)
	return err
}

func (r *sqlxWatchlistRepository) Remove(ctx context.Context, userID int64, repoID string) error {
	_, err := r.db.ExecContext(ctx, `
		DELETE FROM user_watchlists WHERE user_id = ? AND repo_id = ?
	`, userID, repoID)
	return err
}

func (r *sqlxWatchlistRepository) ListByUserID(ctx context.Context, userID int64) ([]WatchlistRepoItem, error) {
	query := `
		SELECT
			w.repo_id,
			r.full_name,
			COALESCE(r.language, '') as language,
			r.stars,
			COALESCE(r.description, '') as description,
			r.github_url,
			COALESCE(s.c_rank_tier, 'D') as c_rank_tier,
			COALESCE(s.c_rank_score, 0) as c_rank_score,
			COALESCE(s.time_to_first_response_hours, 0) as time_to_first_response_hours,
			COALESCE(s.external_pr_merge_rate, 0) as external_pr_merge_rate,
			w.created_at as added_at
		FROM user_watchlists w
		INNER JOIN repositories r ON r.id = w.repo_id
		LEFT JOIN daily_snapshots s ON s.repository_id = r.id
		  AND s.snapshot_date = (
		    SELECT MAX(s2.snapshot_date) FROM daily_snapshots s2 WHERE s2.repository_id = r.id
		  )
		WHERE w.user_id = ?
		ORDER BY w.created_at DESC
	`

	var items []WatchlistRepoItem
	if err := r.db.SelectContext(ctx, &items, query, userID); err != nil {
		return nil, err
	}

	return items, nil
}
