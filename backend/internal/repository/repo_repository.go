package repository

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/abhisheksoni27/opendoor/internal/scoring"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

type RepoRecord struct {
	ID                          string  `db:"id" json:"id"`
	FullName                    string  `db:"full_name" json:"full_name"`
	Language                    string  `db:"language" json:"language"`
	Stars                       int     `db:"stars" json:"stars"`
	Description                 string  `db:"description" json:"description"`
	GithubURL                   string  `db:"github_url" json:"github_url"`
	CRankTier                   string  `db:"c_rank_tier" json:"c_rank_tier"`
	CRankScore                  float64 `db:"c_rank_score" json:"c_rank_score"`
	ExternalPRMergeRate         float64 `db:"external_pr_merge_rate" json:"external_pr_merge_rate"`
	TimeToFirstResponseHours    float64 `db:"time_to_first_response_hours" json:"time_to_first_response_hours"`
	TimeToMergeHours            float64 `db:"time_to_merge_hours" json:"time_to_merge_hours"`
	FirstTimerSuccessRate       float64 `db:"first_timer_success_rate" json:"first_timer_success_rate"`
	RepeatContributorRate       float64 `db:"repeat_contributor_rate" json:"repeat_contributor_rate"`
	MaintainerResponsiveness    float64 `db:"maintainer_responsiveness" json:"maintainer_responsiveness"`
	LastActivityDays            float64 `db:"last_activity_days" json:"last_activity_days"`
	ReviewRounds                float64 `db:"review_rounds" json:"review_rounds"`
	DistinctMaintainerCount     float64 `db:"distinct_maintainer_count" json:"distinct_maintainer_count"`
	StalenessFlag               bool    `db:"staleness_flag" json:"staleness_flag"`
	SnapshotDate                string  `db:"snapshot_date" json:"snapshot_date"`
}

type RepoFilter struct {
	Language                  string
	Tier                      string
	MinMergeRate              float64
	MinStars                  int
	MaxStars                  int
	Search                    string
	SortBy                    string
	Order                     string
	Limit                     int
	Offset                    int
	Trending                  bool
	MinFirstTimerSuccessRate  float64
	MaxFirstTimerSuccessRate  float64
}

type RepoRepository interface {
	List(ctx context.Context, filter RepoFilter) ([]RepoRecord, int, error)
	FindByIDOrName(ctx context.Context, identifier string) (*RepoRecord, error)
	Delete(ctx context.Context, id string) error
	InsertSnapshot(ctx context.Context, repoID string, raw scoring.RawMetrics, score float64, tier string) error
	FetchLatestSnapshotsSample(ctx context.Context, limit int) ([]scoring.RawMetrics, error)
}

type sqlxRepoRepository struct {
	db *sqlx.DB
}

func NewRepoRepository(db *sqlx.DB) RepoRepository {
	return &sqlxRepoRepository{db: db}
}

var allowedSortFields = map[string]string{
	"c_rank_score":                 "s.c_rank_score",
	"stars":                        "r.stars",
	"time_to_first_response_hours": "s.time_to_first_response_hours",
}

func (r *sqlxRepoRepository) List(ctx context.Context, filter RepoFilter) ([]RepoRecord, int, error) {
	where := "1=1"
	args := []interface{}{}

	if filter.Language != "" {
		where += " AND LOWER(r.language) = LOWER(?)"
		args = append(args, filter.Language)
	}

	if filter.Tier != "" {
		where += " AND s.c_rank_tier = ?"
		args = append(args, filter.Tier)
	}

	if filter.MinMergeRate > 0 {
		where += " AND s.external_pr_merge_rate >= ?"
		args = append(args, filter.MinMergeRate)
	}

	if filter.Search != "" {
		where += " AND (LOWER(r.full_name) LIKE ? OR LOWER(r.description) LIKE ?)"
		pattern := "%" + strings.ToLower(filter.Search) + "%"
		args = append(args, pattern, pattern)
	}

	if filter.Trending {
		where += " AND r.is_trending = 1"
	}

	if filter.MinStars > 0 {
		where += " AND r.stars >= ?"
		args = append(args, filter.MinStars)
	}

	if filter.MaxStars > 0 {
		where += " AND r.stars <= ?"
		args = append(args, filter.MaxStars)
	}

	if filter.MinFirstTimerSuccessRate > 0 {
		where += " AND s.first_timer_success_rate >= ?"
		args = append(args, filter.MinFirstTimerSuccessRate)
	}

	if filter.MaxFirstTimerSuccessRate > 0 {
		where += " AND s.first_timer_success_rate <= ?"
		args = append(args, filter.MaxFirstTimerSuccessRate)
	}

	sortCol, ok := allowedSortFields[filter.SortBy]
	if !ok {
		sortCol = "s.c_rank_score"
	}

	order := "DESC"
	if strings.ToUpper(filter.Order) == "ASC" {
		order = "ASC"
	}

	countQuery := fmt.Sprintf(`
		SELECT COUNT(1)
		FROM repositories r
		INNER JOIN latest_snapshots s ON s.repository_id = r.id
		WHERE %s
	`, where)

	var total int
	if err := r.db.GetContext(ctx, &total, countQuery, args...); err != nil {
		return nil, 0, err
	}

	dataQuery := fmt.Sprintf(`
		SELECT
			r.id, r.full_name, COALESCE(r.language,'') as language, r.stars,
			COALESCE(r.description,'') as description, COALESCE(r.github_url,'') as github_url,
			COALESCE(s.c_rank_tier,'D') as c_rank_tier,
			COALESCE(s.c_rank_score,0) as c_rank_score,
			COALESCE(s.external_pr_merge_rate,0) as external_pr_merge_rate,
			COALESCE(s.time_to_first_response_hours,0) as time_to_first_response_hours,
			COALESCE(s.time_to_merge_hours,0) as time_to_merge_hours,
			COALESCE(s.first_timer_success_rate,0) as first_timer_success_rate,
			COALESCE(s.repeat_contributor_rate,0) as repeat_contributor_rate,
			COALESCE(s.maintainer_responsiveness,0) as maintainer_responsiveness,
			COALESCE(s.last_activity_days,180) as last_activity_days,
			COALESCE(s.review_rounds,0) as review_rounds,
			COALESCE(s.distinct_maintainer_count,0) as distinct_maintainer_count,
			COALESCE(s.staleness_flag,0) as staleness_flag,
			COALESCE(s.snapshot_date,'') as snapshot_date
		FROM repositories r
		INNER JOIN latest_snapshots s ON s.repository_id = r.id
		WHERE %s
		ORDER BY %s %s
		LIMIT ? OFFSET ?
	`, where, sortCol, order)

	dataArgs := append(args, filter.Limit, filter.Offset)

	var repos []RepoRecord
	if err := r.db.SelectContext(ctx, &repos, dataQuery, dataArgs...); err != nil {
		return nil, 0, err
	}

	return repos, total, nil
}

func (r *sqlxRepoRepository) FindByIDOrName(ctx context.Context, identifier string) (*RepoRecord, error) {
	query := `
		SELECT
			r.id, r.full_name, COALESCE(r.language,'') as language, r.stars,
			COALESCE(r.description,'') as description, COALESCE(r.github_url,'') as github_url,
			COALESCE(s.c_rank_tier,'D') as c_rank_tier,
			COALESCE(s.c_rank_score,0) as c_rank_score,
			COALESCE(s.external_pr_merge_rate,0) as external_pr_merge_rate,
			COALESCE(s.time_to_first_response_hours,0) as time_to_first_response_hours,
			COALESCE(s.time_to_merge_hours,0) as time_to_merge_hours,
			COALESCE(s.first_timer_success_rate,0) as first_timer_success_rate,
			COALESCE(s.repeat_contributor_rate,0) as repeat_contributor_rate,
			COALESCE(s.maintainer_responsiveness,0) as maintainer_responsiveness,
			COALESCE(s.last_activity_days,180) as last_activity_days,
			COALESCE(s.review_rounds,0) as review_rounds,
			COALESCE(s.distinct_maintainer_count,0) as distinct_maintainer_count,
			COALESCE(s.staleness_flag,0) as staleness_flag,
			COALESCE(s.snapshot_date,'') as snapshot_date
		FROM repositories r
		LEFT JOIN latest_snapshots s ON s.repository_id = r.id
		WHERE r.id = ? OR LOWER(r.full_name) = LOWER(?)
		LIMIT 1
	`
	var repo RepoRecord
	if err := r.db.GetContext(ctx, &repo, query, identifier, identifier); err != nil {
		return nil, err
	}

	return &repo, nil
}

func (r *sqlxRepoRepository) Delete(ctx context.Context, id string) error {
	_, err := r.db.ExecContext(ctx, "DELETE FROM repositories WHERE id = ?", id)
	return err
}

func (r *sqlxRepoRepository) InsertSnapshot(ctx context.Context, repoID string, raw scoring.RawMetrics, score float64, tier string) error {
	staleness := 0
	if raw.StalenessFlag {
		staleness = 1
	}

	today := time.Now().UTC().Format("2006-01-02")

	tx, err := r.db.BeginTxx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	_, err = tx.ExecContext(ctx, `
		INSERT INTO daily_snapshots (
			id, repository_id, snapshot_date,
			external_pr_merge_rate, time_to_first_response_hours, time_to_merge_hours,
			first_timer_success_rate, repeat_contributor_rate,
			maintainer_responsiveness, last_activity_days, review_rounds,
			distinct_maintainer_count, staleness_flag, c_rank_score, c_rank_tier
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		ON CONFLICT(repository_id, snapshot_date) DO UPDATE SET
			external_pr_merge_rate        = excluded.external_pr_merge_rate,
			time_to_first_response_hours  = excluded.time_to_first_response_hours,
			time_to_merge_hours           = excluded.time_to_merge_hours,
			first_timer_success_rate      = excluded.first_timer_success_rate,
			repeat_contributor_rate       = excluded.repeat_contributor_rate,
			maintainer_responsiveness     = excluded.maintainer_responsiveness,
			last_activity_days            = excluded.last_activity_days,
			review_rounds                 = excluded.review_rounds,
			distinct_maintainer_count     = excluded.distinct_maintainer_count,
			staleness_flag                = excluded.staleness_flag,
			c_rank_score                  = excluded.c_rank_score,
			c_rank_tier                   = excluded.c_rank_tier
	`,
		uuid.New().String(),
		repoID,
		today,
		raw.ExternalPRMergeRate,
		raw.TimeToFirstResponseHours,
		raw.TimeToMergeHours,
		raw.FirstTimerSuccessRate,
		raw.RepeatContributorRate,
		raw.MaintainerResponsiveness,
		raw.LastActivityDays,
		raw.ReviewRounds,
		raw.DistinctMaintainerCount,
		staleness,
		score,
		tier,
	)
	if err != nil {
		return err
	}

	_, err = tx.ExecContext(ctx, `
		INSERT INTO latest_snapshots (
			repository_id, snapshot_date,
			external_pr_merge_rate, time_to_first_response_hours, time_to_merge_hours,
			first_timer_success_rate, repeat_contributor_rate,
			maintainer_responsiveness, last_activity_days, review_rounds,
			distinct_maintainer_count, staleness_flag, c_rank_score, c_rank_tier, updated_at
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
		ON CONFLICT(repository_id) DO UPDATE SET
			snapshot_date                 = excluded.snapshot_date,
			external_pr_merge_rate        = excluded.external_pr_merge_rate,
			time_to_first_response_hours  = excluded.time_to_first_response_hours,
			time_to_merge_hours           = excluded.time_to_merge_hours,
			first_timer_success_rate      = excluded.first_timer_success_rate,
			repeat_contributor_rate       = excluded.repeat_contributor_rate,
			maintainer_responsiveness     = excluded.maintainer_responsiveness,
			last_activity_days            = excluded.last_activity_days,
			review_rounds                 = excluded.review_rounds,
			distinct_maintainer_count     = excluded.distinct_maintainer_count,
			staleness_flag                = excluded.staleness_flag,
			c_rank_score                  = excluded.c_rank_score,
			c_rank_tier                   = excluded.c_rank_tier,
			updated_at                    = CURRENT_TIMESTAMP
	`,
		repoID,
		today,
		raw.ExternalPRMergeRate,
		raw.TimeToFirstResponseHours,
		raw.TimeToMergeHours,
		raw.FirstTimerSuccessRate,
		raw.RepeatContributorRate,
		raw.MaintainerResponsiveness,
		raw.LastActivityDays,
		raw.ReviewRounds,
		raw.DistinctMaintainerCount,
		staleness,
		score,
		tier,
	)
	if err != nil {
		return err
	}

	return tx.Commit()
}

func (r *sqlxRepoRepository) FetchLatestSnapshotsSample(ctx context.Context, limit int) ([]scoring.RawMetrics, error) {
	if limit <= 0 {
		limit = 500
	}

	rows, err := r.db.QueryContext(ctx, `
		SELECT
			COALESCE(s.external_pr_merge_rate, 0),
			COALESCE(s.time_to_first_response_hours, 0),
			COALESCE(s.time_to_merge_hours, 0),
			COALESCE(s.first_timer_success_rate, 0),
			COALESCE(s.repeat_contributor_rate, 0),
			COALESCE(s.maintainer_responsiveness, 0),
			COALESCE(s.last_activity_days, 180),
			COALESCE(s.review_rounds, 0),
			COALESCE(s.distinct_maintainer_count, 0),
			COALESCE(s.staleness_flag, 0)
		FROM latest_snapshots s
		LIMIT ?
	`, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []scoring.RawMetrics
	for rows.Next() {
		var m scoring.RawMetrics
		var staleInt int
		if err := rows.Scan(
			&m.ExternalPRMergeRate,
			&m.TimeToFirstResponseHours,
			&m.TimeToMergeHours,
			&m.FirstTimerSuccessRate,
			&m.RepeatContributorRate,
			&m.MaintainerResponsiveness,
			&m.LastActivityDays,
			&m.ReviewRounds,
			&m.DistinctMaintainerCount,
			&staleInt,
		); err != nil {
			return nil, err
		}
		m.StalenessFlag = staleInt == 1
		result = append(result, m)
	}

	return result, nil
}
