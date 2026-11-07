package repository

import (
	"context"
	"fmt"
	"net/url"
	"strings"
	"time"

	"github.com/abhisheksoni27/opendoor/internal/scoring"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

type RepoRecord struct {
	ID                       string    `db:"id" json:"id"`
	FullName                 string    `db:"full_name" json:"full_name"`
	Language                 string    `db:"language" json:"language"`
	Stars                    int       `db:"stars" json:"stars"`
	Description              string    `db:"description" json:"description"`
	GithubURL                string    `db:"github_url" json:"github_url"`
	CRankTier                string    `db:"c_rank_tier" json:"c_rank_tier"`
	CRankScore               float64   `db:"c_rank_score" json:"c_rank_score"`
	ScoreSource              string    `db:"score_source" json:"score_source"`
	ExternalPRMergeRate      float64   `db:"external_pr_merge_rate" json:"external_pr_merge_rate"`
	TimeToFirstResponseHours float64   `db:"time_to_first_response_hours" json:"time_to_first_response_hours"`
	TimeToMergeHours         float64   `db:"time_to_merge_hours" json:"time_to_merge_hours"`
	FirstTimerSuccessRate    float64   `db:"first_timer_success_rate" json:"first_timer_success_rate"`
	RepeatContributorRate    float64   `db:"repeat_contributor_rate" json:"repeat_contributor_rate"`
	MaintainerResponsiveness float64   `db:"maintainer_responsiveness" json:"maintainer_responsiveness"`
	LastActivityDays         float64   `db:"last_activity_days" json:"last_activity_days"`
	ReviewRounds             float64   `db:"review_rounds" json:"review_rounds"`
	DistinctMaintainerCount  float64   `db:"distinct_maintainer_count" json:"distinct_maintainer_count"`
	BusFactor                int       `db:"bus_factor" json:"bus_factor"`
	StalenessFlag            bool      `db:"staleness_flag" json:"staleness_flag"`
	SnapshotDate             string    `db:"snapshot_date" json:"snapshot_date"`
	GoodFirstIssueCount      int       `db:"good_first_issue_count" json:"good_first_issue_count"`
	OnboardingScore          int       `db:"onboarding_score" json:"onboarding_score"`
	ResponseP50Hours         float64   `db:"response_p50_hours" json:"response_p50_hours"`
	ResponseP90Hours         float64   `db:"response_p90_hours" json:"response_p90_hours"`
	PrCount6m                int       `db:"pr_count_6m" json:"pr_count_6m"`
	IssueCount6m             int       `db:"issue_count_6m" json:"issue_count_6m"`
	LowSample                bool      `db:"low_sample" json:"low_sample"`
	CurrentlyActive          bool      `db:"currently_active" json:"currently_active"`
	UpdatedAt                time.Time `db:"updated_at" json:"updated_at"`
	Topics                   []string  `db:"-" json:"topics"`
	IsScored                 bool      `db:"is_scored" json:"is_scored"`
}

type RepoFilter struct {
	Language                 string
	Languages                []string
	Tier                     string
	MinMergeRate             float64
	MinStars                 int
	MaxStars                 int
	Search                   string
	FullName                 string
	SortBy                   string
	Order                    string
	Limit                    int
	Offset                   int
	Trending                 bool
	SnapshotDate             string
	MaxLastActivityDays      int
	ExcludeStale             bool
	MinFirstTimerSuccessRate float64
	MaxFirstTimerSuccessRate float64
	HasMinFirstTimer         bool
	HasMaxFirstTimer         bool
	HasGoodFirstIssue        bool
	Owner                    string
	Topic                    string
	MinMaintainers           float64
	ScoreSource              string
	ExcludeFallback          bool
	MinTier                  string
}

type SnapshotRecord struct {
	SnapshotDate string  `db:"snapshot_date" json:"snapshot_date"`
	CRankScore   float64 `db:"c_rank_score" json:"c_rank_score"`
	CRankTier    string  `db:"c_rank_tier" json:"c_rank_tier"`
}

type TopicStat struct {
	Name                   string  `db:"name" json:"name"`
	RepoCount              int     `db:"repo_count" json:"repo_count"`
	AvgExternalPRMergeRate float64 `db:"avg_external_pr_merge_rate" json:"avg_external_pr_merge_rate"`
	AvgStars               float64 `db:"avg_stars" json:"avg_stars"`
	AvgResponseHours       float64 `db:"avg_response_hours" json:"avg_response_hours"`
}

type RepoRepository interface {
	List(ctx context.Context, filter RepoFilter) ([]RepoRecord, int, error)
	FindByIDOrName(ctx context.Context, identifier string) (*RepoRecord, error)
	GetScoreHistory(ctx context.Context, repoID string, days int) ([]SnapshotRecord, error)
	Delete(ctx context.Context, id string) error
	InsertSnapshot(ctx context.Context, repoID string, raw scoring.RawMetrics, score float64, tier string, scoreSource string) error
	FetchLatestSnapshotsSample(ctx context.Context, limit int) ([]scoring.RawMetrics, error)
	GetRelatedRepos(ctx context.Context, repo *RepoRecord, limit int) ([]*RepoRecord, error)
	UpsertTopics(ctx context.Context, repoID string, topics []string) error
	GetTopicsByRepoID(ctx context.Context, repoID string) ([]string, error)
	GetAllDistinctTopics(ctx context.Context) ([]string, error)
	TopicExists(ctx context.Context, topic string) (bool, error)
	GetAllTopicStats(ctx context.Context) ([]TopicStat, error)
	GetMaintainerEvents(ctx context.Context, repoID string) ([]scoring.MaintainerEvent, error)
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

// tierFloor lists tiers at or above a given minimum, ordered best to worst.
var tierFloor = map[string][]string{
	"S": {"S"},
	"A": {"S", "A"},
	"B": {"S", "A", "B"},
	"C": {"S", "A", "B", "C"},
	"D": {"S", "A", "B", "C", "D"},
}

func (r *sqlxRepoRepository) List(ctx context.Context, filter RepoFilter) ([]RepoRecord, int, error) {
	where := "1=1"
	args := []interface{}{}

	limit := filter.Limit
	if limit <= 0 {
		limit = 20
	}

	if filter.Language != "" {
		where += " AND r.language = ?"
		args = append(args, filter.Language)
	}

	if len(filter.Languages) > 0 {
		placeholders := make([]string, 0, len(filter.Languages))
		for _, l := range filter.Languages {
			if l == "" {
				continue
			}
			args = append(args, l)
			placeholders = append(placeholders, "?")
		}
		if len(placeholders) > 0 {
			where += " AND LOWER(r.language) IN (" + strings.Join(placeholders, ",") + ")"
		}
	}

	if filter.Tier != "" {
		where += " AND s.c_rank_tier = ?"
		args = append(args, filter.Tier)
	}

	if len(tierFloor[filter.MinTier]) > 0 {
		tiers := tierFloor[filter.MinTier]
		placeholders := strings.TrimSuffix(strings.Repeat("?,", len(tiers)), ",")
		where += " AND s.c_rank_tier IN (" + placeholders + ")"
		for _, t := range tiers {
			args = append(args, t)
		}
	}

	if filter.MinMergeRate > 0 {
		where += " AND s.external_pr_merge_rate >= ?"
		args = append(args, filter.MinMergeRate)
	}

	if filter.FullName != "" {
		where += " AND r.full_name = ?"
		args = append(args, filter.FullName)
	} else if filter.Search != "" {
		where += " AND (r.full_name LIKE ? OR r.description LIKE ?)"
		pattern := "%" + filter.Search + "%"
		args = append(args, pattern, pattern)
	}

	if filter.Trending {
		where += " AND r.is_trending = 1"
	}

	if filter.SnapshotDate != "" {
		where += " AND s.snapshot_date = ?"
		args = append(args, filter.SnapshotDate)
	}

	if filter.MaxLastActivityDays > 0 {
		where += " AND s.last_activity_days <= ?"
		args = append(args, filter.MaxLastActivityDays)
	}

	if filter.ExcludeStale {
		where += " AND s.staleness_flag = 0"
	}

	if filter.MinStars > 0 {
		where += " AND r.stars >= ?"
		args = append(args, filter.MinStars)
	}

	if filter.MaxStars > 0 {
		where += " AND r.stars <= ?"
		args = append(args, filter.MaxStars)
	}

	if filter.HasMinFirstTimer {
		where += " AND s.first_timer_success_rate >= ?"
		args = append(args, filter.MinFirstTimerSuccessRate)
	}

	if filter.HasMaxFirstTimer {
		where += " AND s.first_timer_success_rate <= ?"
		args = append(args, filter.MaxFirstTimerSuccessRate)
	}

	if filter.HasGoodFirstIssue {
		where += " AND s.good_first_issue_count > 0"
	}

	if filter.Owner != "" {
		where += " AND r.owner = ?"
		args = append(args, filter.Owner)
	}

	if filter.Topic != "" {
		where += " AND r.id IN (SELECT repository_id FROM repository_topics WHERE topic = ?)"
		args = append(args, strings.ToLower(filter.Topic))
	}

	if filter.MinMaintainers > 0 {
		where += " AND COALESCE(s.bus_factor,0) >= ?"
		args = append(args, filter.MinMaintainers)
	}

	if filter.ScoreSource != "" {
		where += " AND s.score_source = ?"
		args = append(args, filter.ScoreSource)
	}

	if filter.ExcludeFallback {
		where += " AND COALESCE(s.score_source, 'computed') != 'fallback'"
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
		LEFT JOIN latest_snapshots s ON s.repository_id = r.id
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
			COALESCE(s.score_source,'computed') as score_source,
			COALESCE(s.external_pr_merge_rate,0) as external_pr_merge_rate,
			COALESCE(s.time_to_first_response_hours,0) as time_to_first_response_hours,
			COALESCE(s.time_to_merge_hours,0) as time_to_merge_hours,
			COALESCE(s.first_timer_success_rate,0) as first_timer_success_rate,
			COALESCE(s.repeat_contributor_rate,0) as repeat_contributor_rate,
			COALESCE(s.maintainer_responsiveness,0) as maintainer_responsiveness,
			COALESCE(s.last_activity_days,180) as last_activity_days,
			COALESCE(s.review_rounds,0) as review_rounds,
			COALESCE(s.distinct_maintainer_count,0) as distinct_maintainer_count,
			COALESCE(s.bus_factor,0) as bus_factor,
			COALESCE(s.staleness_flag,0) as staleness_flag,
			COALESCE(s.snapshot_date,'') as snapshot_date,
			COALESCE(s.good_first_issue_count,0) as good_first_issue_count,
			COALESCE(s.onboarding_score,0) as onboarding_score,
			COALESCE(s.response_p50_hours,0) as response_p50_hours,
			COALESCE(s.response_p90_hours,0) as response_p90_hours,
			COALESCE(s.pr_count_6m,0) as pr_count_6m,
			COALESCE(s.issue_count_6m,0) as issue_count_6m,
			CASE WHEN COALESCE(s.pr_count_6m, 0) < 20 THEN 1 ELSE 0 END as low_sample,
			CASE WHEN COALESCE(s.last_activity_days, 180) <= 30 AND COALESCE(s.staleness_flag, 0) = 0 THEN 1 ELSE 0 END as currently_active,
			CASE WHEN COALESCE(s.c_rank_score, 0) > 0 THEN 1 ELSE 0 END as is_scored,
			r.updated_at
		FROM repositories r
		LEFT JOIN latest_snapshots s ON s.repository_id = r.id
		WHERE %s
		ORDER BY %s %s
		LIMIT ? OFFSET ?
	`, where, sortCol, order)

	dataArgs := append(args, limit, filter.Offset)

	var repos []RepoRecord
	if err := r.db.SelectContext(ctx, &repos, dataQuery, dataArgs...); err != nil {
		return nil, 0, err
	}

	r.attachTopics(ctx, repos)

	return repos, total, nil
}

// attachTopics batches one query to attach repository_topics rows to each
// RepoRecord so callers never hit an N+1 fetch per repo.
func (r *sqlxRepoRepository) attachTopics(ctx context.Context, repos []RepoRecord) {
	if len(repos) == 0 {
		return
	}

	ids := make([]interface{}, len(repos))
	for i := range repos {
		ids[i] = repos[i].ID
	}

	query, args, err := sqlx.In(`SELECT repository_id, topic FROM repository_topics WHERE repository_id IN (?)`, ids)
	if err != nil {
		return
	}
	query = r.db.Rebind(query)

	var rows []struct {
		RepositoryID string `db:"repository_id"`
		Topic        string `db:"topic"`
	}
	if err := r.db.SelectContext(ctx, &rows, query, args...); err != nil {
		return
	}

	topicsByRepo := make(map[string][]string, len(rows))
	for _, row := range rows {
		topicsByRepo[row.RepositoryID] = append(topicsByRepo[row.RepositoryID], row.Topic)
	}
	for i := range repos {
		repos[i].Topics = topicsByRepo[repos[i].ID]
	}
}

// UpsertTopics persists normalized lowercase topic strings for a repository,
// ignoring duplicates so repeated crawls are idempotent.
func (r *sqlxRepoRepository) UpsertTopics(ctx context.Context, repoID string, topics []string) error {
	if len(topics) == 0 {
		return nil
	}

	query := "INSERT IGNORE INTO repository_topics (topic, repository_id) VALUES (?, ?)"
	if r.db.DriverName() == "sqlite" {
		query = "INSERT OR IGNORE INTO repository_topics (topic, repository_id) VALUES (?, ?)"
	}

	seen := make(map[string]bool, len(topics))
	for _, t := range topics {
		t = strings.ToLower(strings.TrimSpace(t))
		if t == "" || seen[t] {
			continue
		}
		seen[t] = true
		if _, err := r.db.ExecContext(ctx, query, t, repoID); err != nil {
			return err
		}
	}
	return nil
}

// GetTopicsByRepoID returns the topics for a repository in insertion order.
func (r *sqlxRepoRepository) GetTopicsByRepoID(ctx context.Context, repoID string) ([]string, error) {
	var topics []string
	err := r.db.SelectContext(ctx, &topics, `
		SELECT topic FROM repository_topics WHERE repository_id = ? ORDER BY created_at ASC
	`, repoID)
	return topics, err
}

// GetAllDistinctTopics returns every topic that has at least one indexed repository ordered by popularity.
func (r *sqlxRepoRepository) GetAllDistinctTopics(ctx context.Context) ([]string, error) {
	var topics []string
	err := r.db.SelectContext(ctx, &topics, `
		SELECT t.topic
		FROM repository_topics t
		LEFT JOIN latest_snapshots s ON t.repository_id = s.repository_id
		GROUP BY t.topic
		ORDER BY COUNT(t.repository_id) DESC, t.topic ASC
	`)
	return topics, err
}

// TopicExists reports whether the given topic is present in the GFI topic
// taxonomy (repository_topics). Used to validate feed filters (AC4) so that
// unknown topics fall back to "no filter" instead of returning an empty set.
func (r *sqlxRepoRepository) TopicExists(ctx context.Context, topic string) (bool, error) {
	var n int
	err := r.db.GetContext(ctx, &n, `SELECT COUNT(1) FROM repository_topics WHERE topic = ?`, topic)
	if err != nil {
		return false, err
	}
	return n > 0, nil
}

// GetAllTopicStats returns distinct topics with repository count and average merge rate, ordered by popularity.
func (r *sqlxRepoRepository) GetAllTopicStats(ctx context.Context) ([]TopicStat, error) {
	var stats []TopicStat
	err := r.db.SelectContext(ctx, &stats, `
		SELECT
			t.topic AS name,
			COUNT(t.repository_id) AS repo_count,
			COALESCE(AVG(s.external_pr_merge_rate), 0.0) AS avg_external_pr_merge_rate,
			COALESCE(AVG(r.stars), 0.0) AS avg_stars,
			COALESCE(AVG(COALESCE(NULLIF(s.response_p50_hours, 0), NULLIF(s.time_to_first_response_hours, 0), 0)), 0.0) AS avg_response_hours
		FROM repository_topics t
		LEFT JOIN latest_snapshots s ON t.repository_id = s.repository_id
		LEFT JOIN repositories r ON t.repository_id = r.id
		GROUP BY t.topic
		ORDER BY repo_count DESC, t.topic ASC
	`)
	return stats, err
}

func (r *sqlxRepoRepository) FindByIDOrName(ctx context.Context, identifier string) (*RepoRecord, error) {
	if unescaped, err := url.QueryUnescape(identifier); err == nil && unescaped != "" {
		identifier = unescaped
	}
	identifier = strings.TrimSpace(identifier)
	query := `
		SELECT
			r.id, r.full_name, COALESCE(r.language,'') as language, r.stars,
			COALESCE(r.description,'') as description, COALESCE(r.github_url,'') as github_url,
			COALESCE(s.c_rank_tier,'D') as c_rank_tier,
			COALESCE(s.c_rank_score,0) as c_rank_score,
			COALESCE(s.score_source,'computed') as score_source,
			COALESCE(s.external_pr_merge_rate,0) as external_pr_merge_rate,
			COALESCE(s.time_to_first_response_hours,0) as time_to_first_response_hours,
			COALESCE(s.time_to_merge_hours,0) as time_to_merge_hours,
			COALESCE(s.first_timer_success_rate,0) as first_timer_success_rate,
			COALESCE(s.repeat_contributor_rate,0) as repeat_contributor_rate,
			COALESCE(s.maintainer_responsiveness,0) as maintainer_responsiveness,
			COALESCE(s.last_activity_days,180) as last_activity_days,
			COALESCE(s.review_rounds,0) as review_rounds,
			COALESCE(s.distinct_maintainer_count,0) as distinct_maintainer_count,
			COALESCE(s.bus_factor,0) as bus_factor,
			COALESCE(s.staleness_flag,0) as staleness_flag,
			COALESCE(s.snapshot_date,'') as snapshot_date,
			COALESCE(s.good_first_issue_count,0) as good_first_issue_count,
			COALESCE(s.onboarding_score,0) as onboarding_score,
			COALESCE(s.response_p50_hours,0) as response_p50_hours,
			COALESCE(s.response_p90_hours,0) as response_p90_hours,
			COALESCE(s.pr_count_6m,0) as pr_count_6m,
			COALESCE(s.issue_count_6m,0) as issue_count_6m,
			CASE WHEN COALESCE(s.pr_count_6m, 0) < 20 THEN 1 ELSE 0 END as low_sample,
			CASE WHEN COALESCE(s.last_activity_days, 180) <= 30 AND COALESCE(s.staleness_flag, 0) = 0 THEN 1 ELSE 0 END as currently_active,
			CASE WHEN COALESCE(s.c_rank_score, 0) > 0 THEN 1 ELSE 0 END as is_scored,
			r.updated_at
		FROM repositories r
		LEFT JOIN latest_snapshots s ON s.repository_id = r.id
		WHERE LOWER(r.full_name) = LOWER(?) OR r.id = ?
		LIMIT 1
	`
	var repo RepoRecord
	if err := r.db.GetContext(ctx, &repo, query, identifier, identifier); err != nil {
		return nil, err
	}

	topics, err := r.GetTopicsByRepoID(ctx, repo.ID)
	if err == nil {
		repo.Topics = topics
	}

	return &repo, nil
}

func (r *sqlxRepoRepository) GetScoreHistory(ctx context.Context, repoID string, days int) ([]SnapshotRecord, error) {
	if days <= 0 {
		days = 365
	}

	query := `
		SELECT snapshot_date, c_rank_score, c_rank_tier
		FROM daily_snapshots
		WHERE repository_id = ?
		ORDER BY snapshot_date ASC
		LIMIT ?
	`
	var history []SnapshotRecord
	if err := r.db.SelectContext(ctx, &history, query, repoID, days); err != nil {
		return nil, err
	}
	return history, nil
}

func (r *sqlxRepoRepository) Delete(ctx context.Context, id string) error {
	_, err := r.db.ExecContext(ctx, "DELETE FROM repositories WHERE id = ?", id)
	return err
}

func (r *sqlxRepoRepository) InsertSnapshot(ctx context.Context, repoID string, raw scoring.RawMetrics, score float64, tier string, scoreSource string) error {
	staleness := 0
	if raw.StalenessFlag {
		staleness = 1
	}
	if scoreSource != scoring.ScoreSourceFallback {
		scoreSource = scoring.ScoreSourceComputed
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
			distinct_maintainer_count, bus_factor, staleness_flag, c_rank_score, c_rank_tier, score_source, good_first_issue_count,
			response_p50_hours, response_p90_hours
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		ON DUPLICATE KEY UPDATE
			external_pr_merge_rate        = VALUES(external_pr_merge_rate),
			time_to_first_response_hours  = VALUES(time_to_first_response_hours),
			time_to_merge_hours           = VALUES(time_to_merge_hours),
			first_timer_success_rate      = VALUES(first_timer_success_rate),
			repeat_contributor_rate       = VALUES(repeat_contributor_rate),
			maintainer_responsiveness     = VALUES(maintainer_responsiveness),
			last_activity_days            = VALUES(last_activity_days),
			review_rounds                 = VALUES(review_rounds),
			distinct_maintainer_count     = VALUES(distinct_maintainer_count),
			bus_factor                    = VALUES(bus_factor),
			staleness_flag                = VALUES(staleness_flag),
			c_rank_score                  = VALUES(c_rank_score),
			c_rank_tier                   = VALUES(c_rank_tier),
			score_source                  = VALUES(score_source),
			good_first_issue_count        = VALUES(good_first_issue_count),
			response_p50_hours            = VALUES(response_p50_hours),
			response_p90_hours            = VALUES(response_p90_hours)
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
		raw.BusFactor,
		staleness,
		score,
		tier,
		scoreSource,
		raw.GoodFirstIssueCount,
		raw.ResponseP50Hours,
		raw.ResponseP90Hours,
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
			distinct_maintainer_count, bus_factor, staleness_flag, c_rank_score, c_rank_tier, score_source, good_first_issue_count,
			response_p50_hours, response_p90_hours, updated_at
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
		ON DUPLICATE KEY UPDATE
			snapshot_date                 = VALUES(snapshot_date),
			external_pr_merge_rate        = VALUES(external_pr_merge_rate),
			time_to_first_response_hours  = VALUES(time_to_first_response_hours),
			time_to_merge_hours           = VALUES(time_to_merge_hours),
			first_timer_success_rate      = VALUES(first_timer_success_rate),
			repeat_contributor_rate       = VALUES(repeat_contributor_rate),
			maintainer_responsiveness     = VALUES(maintainer_responsiveness),
			last_activity_days            = VALUES(last_activity_days),
			review_rounds                 = VALUES(review_rounds),
			distinct_maintainer_count     = VALUES(distinct_maintainer_count),
			bus_factor                    = VALUES(bus_factor),
			staleness_flag                = VALUES(staleness_flag),
			c_rank_score                  = VALUES(c_rank_score),
			c_rank_tier                   = VALUES(c_rank_tier),
			score_source                  = VALUES(score_source),
			good_first_issue_count        = VALUES(good_first_issue_count),
			response_p50_hours            = VALUES(response_p50_hours),
			response_p90_hours            = VALUES(response_p90_hours),
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
		raw.BusFactor,
		staleness,
		score,
		tier,
		scoreSource,
		raw.GoodFirstIssueCount,
		raw.ResponseP50Hours,
		raw.ResponseP90Hours,
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
			COALESCE(s.staleness_flag, 0),
			COALESCE(s.good_first_issue_count, 0)
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
			&m.GoodFirstIssueCount,
		); err != nil {
			return nil, err
		}
		m.StalenessFlag = staleInt == 1
		result = append(result, m)
	}

	return result, nil
}

// GetRelatedRepos fetches repositories related by language and nearby metrics (merge rate & score)
// with fallbacks if insufficient matches exist.
func (r *sqlxRepoRepository) GetRelatedRepos(ctx context.Context, repo *RepoRecord, limit int) ([]*RepoRecord, error) {
	if repo == nil || limit <= 0 {
		return []*RepoRecord{}, nil
	}

	query := `
		SELECT
			r.id, r.full_name, COALESCE(r.language, '') as language, r.stars, COALESCE(r.description, '') as description, COALESCE(r.github_url, '') as github_url,
			COALESCE(s.c_rank_tier, 'A') as c_rank_tier,
			COALESCE(s.c_rank_score, 75.0) as c_rank_score,
			COALESCE(s.score_source, 'computed') as score_source,
			COALESCE(s.external_pr_merge_rate, 0) as external_pr_merge_rate,
			COALESCE(s.time_to_first_response_hours, 0) as time_to_first_response_hours,
			COALESCE(s.time_to_merge_hours, 0) as time_to_merge_hours,
			COALESCE(s.first_timer_success_rate, 0) as first_timer_success_rate,
			COALESCE(s.repeat_contributor_rate, 0) as repeat_contributor_rate,
			COALESCE(s.maintainer_responsiveness, 0) as maintainer_responsiveness,
			COALESCE(s.last_activity_days, 0) as last_activity_days,
			COALESCE(s.review_rounds, 0) as review_rounds,
			COALESCE(s.distinct_maintainer_count, 0) as distinct_maintainer_count,
			COALESCE(s.bus_factor, 0) as bus_factor,
			COALESCE(s.staleness_flag, 0) as staleness_flag,
			COALESCE(s.snapshot_date, '') as snapshot_date,
			COALESCE(s.good_first_issue_count, 0) as good_first_issue_count,
			COALESCE(s.onboarding_score, 0) as onboarding_score,
			CASE WHEN COALESCE(s.c_rank_score, 0) > 0 THEN 1 ELSE 0 END as is_scored,
			r.updated_at
		FROM repositories r
		LEFT JOIN latest_snapshots s ON r.id = s.repository_id
		WHERE r.id != ? AND r.language = ?
		ORDER BY ABS(COALESCE(s.external_pr_merge_rate, 0) - ?) ASC,
		         ABS(COALESCE(s.c_rank_score, 0) - ?) ASC,
		         r.stars DESC
		LIMIT ?
	`

	rows, err := r.db.QueryContext(ctx, query, repo.ID, repo.Language, repo.ExternalPRMergeRate, repo.CRankScore, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var repos []*RepoRecord
	for rows.Next() {
		var rec RepoRecord
		var staleInt int
		var isScoredInt int
		if err := rows.Scan(
			&rec.ID, &rec.FullName, &rec.Language, &rec.Stars, &rec.Description, &rec.GithubURL,
			&rec.CRankTier, &rec.CRankScore, &rec.ScoreSource, &rec.ExternalPRMergeRate, &rec.TimeToFirstResponseHours,
			&rec.TimeToMergeHours, &rec.FirstTimerSuccessRate, &rec.RepeatContributorRate,
			&rec.MaintainerResponsiveness, &rec.LastActivityDays, &rec.ReviewRounds,
			&rec.DistinctMaintainerCount, &rec.BusFactor, &staleInt, &rec.SnapshotDate, &rec.GoodFirstIssueCount,
			&rec.OnboardingScore, &isScoredInt, &rec.UpdatedAt,
		); err != nil {
			return nil, err
		}
		rec.StalenessFlag = staleInt == 1
		rec.IsScored = isScoredInt == 1
		repos = append(repos, &rec)
	}

	// Fallback to top-scoring repos across all languages if language matches < limit
	if len(repos) < limit {
		fallbackLimit := limit - len(repos)
		excludeIDs := []string{repo.ID}
		for _, existing := range repos {
			excludeIDs = append(excludeIDs, existing.ID)
		}

		inClause := fmt.Sprintf("('%s')", strings.Join(excludeIDs, "', '"))
		fallbackQuery := fmt.Sprintf(`
			SELECT
				r.id, r.full_name, COALESCE(r.language, '') as language, r.stars, COALESCE(r.description, '') as description, COALESCE(r.github_url, '') as github_url,
				COALESCE(s.c_rank_tier, 'A') as c_rank_tier,
				COALESCE(s.c_rank_score, 75.0) as c_rank_score,
				COALESCE(s.external_pr_merge_rate, 0) as external_pr_merge_rate,
				COALESCE(s.time_to_first_response_hours, 0) as time_to_first_response_hours,
				COALESCE(s.time_to_merge_hours, 0) as time_to_merge_hours,
				COALESCE(s.first_timer_success_rate, 0) as first_timer_success_rate,
				COALESCE(s.repeat_contributor_rate, 0) as repeat_contributor_rate,
				COALESCE(s.maintainer_responsiveness, 0) as maintainer_responsiveness,
				COALESCE(s.last_activity_days, 0) as last_activity_days,
				COALESCE(s.review_rounds, 0) as review_rounds,
				COALESCE(s.distinct_maintainer_count, 0) as distinct_maintainer_count,
				COALESCE(s.bus_factor, 0) as bus_factor,
				COALESCE(s.staleness_flag, 0) as staleness_flag,
				COALESCE(s.snapshot_date, '') as snapshot_date,
				COALESCE(s.good_first_issue_count, 0) as good_first_issue_count,
				COALESCE(s.onboarding_score, 0) as onboarding_score,
				CASE WHEN COALESCE(s.c_rank_score, 0) > 0 THEN 1 ELSE 0 END as is_scored,
				r.updated_at
			FROM repositories r
			LEFT JOIN latest_snapshots s ON r.id = s.repository_id
			WHERE r.id NOT IN %s
			ORDER BY s.c_rank_score DESC, r.stars DESC
			LIMIT ?
		`, inClause)

		fRows, err := r.db.QueryContext(ctx, fallbackQuery, fallbackLimit)
		if err == nil {
			defer fRows.Close()
			for fRows.Next() {
				var rec RepoRecord
				var staleInt int
				var isScoredInt int
				if err := fRows.Scan(
					&rec.ID, &rec.FullName, &rec.Language, &rec.Stars, &rec.Description, &rec.GithubURL,
					&rec.CRankTier, &rec.CRankScore, &rec.ScoreSource, &rec.ExternalPRMergeRate, &rec.TimeToFirstResponseHours,
					&rec.TimeToMergeHours, &rec.FirstTimerSuccessRate, &rec.RepeatContributorRate,
					&rec.MaintainerResponsiveness, &rec.LastActivityDays, &rec.ReviewRounds,
					&rec.DistinctMaintainerCount, &rec.BusFactor, &staleInt, &rec.SnapshotDate, &rec.GoodFirstIssueCount,
					&rec.OnboardingScore, &isScoredInt, &rec.UpdatedAt,
				); err == nil {
					rec.StalenessFlag = staleInt == 1
					rec.IsScored = isScoredInt == 1
					repos = append(repos, &rec)
				}
			}
		}
	}

	return repos, nil
}

// GetMaintainerEvents queries maintainer activity within the last 90 days from repo_pr_events
// (merged, closed, labeled, assigned actions) and repo_pr_comments,
// extracting HourUTC and DayOfWeek in Go to maintain driver-agnostic compatibility (MySQL & SQLite).
func (r *sqlxRepoRepository) GetMaintainerEvents(ctx context.Context, repoID string) ([]scoring.MaintainerEvent, error) {
	since := time.Now().UTC().AddDate(0, 0, -90)
	query := `
		SELECT actor_login, event_at
		FROM repo_pr_events
		WHERE repository_id = ?
		  AND action IN ('merged', 'closed', 'labeled', 'assigned')
		  AND event_at >= ?
		ORDER BY event_at DESC
		LIMIT 1000
	`
	rows, err := r.db.QueryContext(ctx, query, repoID, since)
	if err != nil {
		// Fallback to repo_pr_comments if repo_pr_events table does not exist (e.g. legacy test databases)
		legacyQuery := `
			SELECT author_login, created_at
			FROM repo_pr_comments
			WHERE repository_id = ?
			  AND author_association IN ('MEMBER', 'OWNER', 'COLLABORATOR')
			  AND created_at >= ?
			ORDER BY created_at DESC
			LIMIT 1000
		`
		var lErr error
		rows, lErr = r.db.QueryContext(ctx, legacyQuery, repoID, since)
		if lErr != nil {
			return nil, err
		}
	}
	defer rows.Close()

	var events []scoring.MaintainerEvent
	for rows.Next() {
		var authorLogin string
		var eventAt time.Time
		if err := rows.Scan(&authorLogin, &eventAt); err != nil {
			return nil, err
		}
		utcTime := eventAt.UTC()
		events = append(events, scoring.MaintainerEvent{
			MaintainerLogin: authorLogin,
			HourUTC:         utcTime.Hour(),
			DayOfWeek:       utcTime.Weekday(),
		})
	}
	return events, nil
}
