package repository

import (
	"context"
	"time"

	"github.com/abhisheksoni27/opendoor/internal/github"
	"github.com/jmoiron/sqlx"
)

type GoodFirstIssueItem struct {
	ID            int64     `db:"id" json:"id"`
	RepositoryID  string    `db:"repository_id" json:"repository_id"`
	RepoFullName  string    `db:"repo_full_name" json:"repo_full_name"`
	Language      string    `db:"language" json:"language"`
	Stars         int       `db:"stars" json:"stars"`
	CRankTier     string    `db:"c_rank_tier" json:"c_rank_tier"`
	CRankScore    float64   `db:"c_rank_score" json:"c_rank_score"`
	IssueNumber   int       `db:"issue_number" json:"issue_number"`
	Title         string    `db:"title" json:"title"`
	BodyText      string    `db:"body_text" json:"body_text"`
	URL           string    `db:"url" json:"url"`
	CommentsCount int       `db:"comments_count" json:"comments_count"`
	LabelsJSON    string    `db:"labels_json" json:"labels_json"`
	QualityScore  int       `db:"quality_score" json:"quality_score"`
	CreatedAt     time.Time `db:"created_at" json:"created_at"`
	SyncedAt      time.Time `db:"synced_at" json:"synced_at"`
}

type GFIRepository interface {
	UpsertIssues(ctx context.Context, repoID string, issues []github.GoodFirstIssue) error
	ListByLanguage(ctx context.Context, language string, limit int) ([]GoodFirstIssueItem, error)
	ListByRepoID(ctx context.Context, repoID string, limit int) ([]GoodFirstIssueItem, error)
}

type sqlxGFIRepository struct {
	db *sqlx.DB
}

func NewGFIRepository(db *sqlx.DB) GFIRepository {
	return &sqlxGFIRepository{db: db}
}

func (r *sqlxGFIRepository) UpsertIssues(ctx context.Context, repoID string, issues []github.GoodFirstIssue) error {
	if len(issues) == 0 {
		return nil
	}

	for _, issue := range issues {
		query := `
			INSERT INTO repo_good_first_issues (
				repository_id, issue_number, title, body_text, url, comments_count, labels_json, quality_score, created_at, synced_at
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
			ON DUPLICATE KEY UPDATE
				title = VALUES(title),
				body_text = VALUES(body_text),
				url = VALUES(url),
				comments_count = VALUES(comments_count),
				labels_json = VALUES(labels_json),
				quality_score = VALUES(quality_score),
				synced_at = CURRENT_TIMESTAMP
		`
		if r.db.DriverName() == "sqlite" {
			query = `
				INSERT INTO repo_good_first_issues (
					repository_id, issue_number, title, body_text, url, comments_count, labels_json, quality_score, created_at, synced_at
				) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
				ON CONFLICT(repository_id, issue_number) DO UPDATE SET
					title = excluded.title,
					body_text = excluded.body_text,
					url = excluded.url,
					comments_count = excluded.comments_count,
					labels_json = excluded.labels_json,
					synced_at = CURRENT_TIMESTAMP
			`
		}

		if _, err := r.db.ExecContext(ctx, query,
			repoID, issue.Number, issue.Title, issue.BodyText, issue.URL,
			issue.CommentsCount, issue.LabelsJSON, issue.QualityScore, issue.CreatedAt,
		); err != nil {
			return err
		}
	}
	return nil
}

func (r *sqlxGFIRepository) ListByLanguage(ctx context.Context, language string, limit int) ([]GoodFirstIssueItem, error) {
	if limit <= 0 {
		limit = 30
	}

	whereClause := "1=1"
	args := []interface{}{}
	if language != "" && stringsToLower(language) != "all" {
		whereClause += " AND LOWER(rep.language) = LOWER(?)"
		args = append(args, language)
	}
	args = append(args, limit)

	query := `
		SELECT
			g.id, g.repository_id, rep.full_name as repo_full_name, COALESCE(rep.language, '') as language,
			rep.stars, COALESCE(s.c_rank_tier, 'A') as c_rank_tier, COALESCE(s.c_rank_score, 75.0) as c_rank_score,
			g.issue_number, g.title, COALESCE(g.body_text, '') as body_text, g.url, g.comments_count,
			g.labels_json, COALESCE(g.quality_score, 0) as quality_score, g.created_at, g.synced_at
		FROM repo_good_first_issues g
		INNER JOIN repositories rep ON g.repository_id = rep.id
		LEFT JOIN latest_snapshots s ON rep.id = s.repository_id
		WHERE ` + whereClause + `
		ORDER BY g.quality_score DESC, s.c_rank_score DESC, rep.stars DESC, g.created_at DESC
		LIMIT ?
	`

	var items []GoodFirstIssueItem
	err := r.db.SelectContext(ctx, &items, query, args...)
	if err != nil {
		return nil, err
	}
	return items, nil
}

func (r *sqlxGFIRepository) ListByRepoID(ctx context.Context, repoID string, limit int) ([]GoodFirstIssueItem, error) {
	if limit <= 0 {
		limit = 10
	}

	query := `
		SELECT
			g.id, g.repository_id, rep.full_name as repo_full_name, COALESCE(rep.language, '') as language,
			rep.stars, COALESCE(s.c_rank_tier, 'A') as c_rank_tier, COALESCE(s.c_rank_score, 75.0) as c_rank_score,
			g.issue_number, g.title, COALESCE(g.body_text, '') as body_text, g.url, g.comments_count,
			g.labels_json, COALESCE(g.quality_score, 0) as quality_score, g.created_at, g.synced_at
		FROM repo_good_first_issues g
		INNER JOIN repositories rep ON g.repository_id = rep.id
		LEFT JOIN latest_snapshots s ON rep.id = s.repository_id
		WHERE g.repository_id = ?
		ORDER BY g.quality_score DESC, g.created_at DESC
		LIMIT ?
	`

	var items []GoodFirstIssueItem
	err := r.db.SelectContext(ctx, &items, query, repoID, limit)
	if err != nil {
		return nil, err
	}
	return items, nil
}

func stringsToLower(s string) string {
	var b []byte
	for i := 0; i < len(s); i++ {
		c := s[i]
		if 'A' <= c && c <= 'Z' {
			c += 'a' - 'A'
		}
		b = append(b, c)
	}
	return string(b)
}
