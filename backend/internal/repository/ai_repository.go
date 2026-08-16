package repository

import (
	"context"
	"time"

	"github.com/jmoiron/sqlx"
)

type AIInsights struct {
	RepoID            string    `db:"repo_id" json:"repo_id"`
	MaintainerVibe    string    `db:"maintainer_vibe" json:"maintainer_vibe"`
	PRGuidelines      string    `db:"pr_guidelines" json:"pr_guidelines"`
	IssueQualityScore float64   `db:"issue_quality_score" json:"issue_quality_score"`
	RawSummary        string    `db:"raw_summary" json:"raw_summary"`
	WarmthScore       float64   `db:"warmth_score" json:"warmth_score"`
	PatienceScore     float64   `db:"patience_score" json:"patience_score"`
	NitpickRatio      float64   `db:"nitpick_ratio" json:"nitpick_ratio"`
	MaintainerPersona string    `db:"maintainer_persona" json:"maintainer_persona"`
	DosJSON           string    `db:"dos_json" json:"dos_json"`
	DontsJSON         string    `db:"donts_json" json:"donts_json"`
	UpdatedAt         time.Time `db:"updated_at" json:"updated_at"`
}

type PRComment struct {
	PRNumber          int
	SourceType        string
	AuthorLogin       string
	AuthorAssociation string
	Body              string
	CreatedAt         time.Time
}

type AIRepository interface {
	GetInsights(ctx context.Context, repoID string) (*AIInsights, error)
	SaveInsights(ctx context.Context, insights *AIInsights) error
	SaveRawComments(ctx context.Context, repoID string, comments []string) error
	GetRawComments(ctx context.Context, repoID string, limit int) ([]string, error)
	SavePRComments(ctx context.Context, repoID string, comments []PRComment) error
	GetPRComments(ctx context.Context, repoID string, limit int) ([]string, error)
	SaveIssueComments(ctx context.Context, repoID string, comments []string) error
	GetIssueComments(ctx context.Context, repoID string, limit int) ([]string, error)
}

type sqlxAIRepository struct {
	db *sqlx.DB
}

func NewAIRepository(db *sqlx.DB) AIRepository {
	return &sqlxAIRepository{db: db}
}

func (r *sqlxAIRepository) GetInsights(ctx context.Context, repoID string) (*AIInsights, error) {
	var item AIInsights
	err := r.db.GetContext(ctx, &item, `
		SELECT repo_id, maintainer_vibe, pr_guidelines, issue_quality_score, raw_summary,
		       COALESCE(warmth_score, 7.5) as warmth_score,
		       COALESCE(patience_score, 8.0) as patience_score,
		       COALESCE(nitpick_ratio, 0.25) as nitpick_ratio,
		       COALESCE(maintainer_persona, 'Encouraging Technical Mentor') as maintainer_persona,
		       COALESCE(dos_json, '[]') as dos_json,
		       COALESCE(donts_json, '[]') as donts_json,
		       updated_at
		FROM repo_ai_insights WHERE repo_id = ?
	`, repoID)
	if err != nil {
		return nil, err
	}
	return &item, nil
}

func (r *sqlxAIRepository) SaveInsights(ctx context.Context, insights *AIInsights) error {
	_, err := r.db.ExecContext(ctx, `
		INSERT INTO repo_ai_insights (
			repo_id, maintainer_vibe, pr_guidelines, issue_quality_score, raw_summary,
			warmth_score, patience_score, nitpick_ratio, maintainer_persona, dos_json, donts_json, updated_at
		)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
		ON DUPLICATE KEY UPDATE
			maintainer_vibe = VALUES(maintainer_vibe),
			pr_guidelines = VALUES(pr_guidelines),
			issue_quality_score = VALUES(issue_quality_score),
			raw_summary = VALUES(raw_summary),
			warmth_score = VALUES(warmth_score),
			patience_score = VALUES(patience_score),
			nitpick_ratio = VALUES(nitpick_ratio),
			maintainer_persona = VALUES(maintainer_persona),
			dos_json = VALUES(dos_json),
			donts_json = VALUES(donts_json),
			updated_at = CURRENT_TIMESTAMP
	`, insights.RepoID, insights.MaintainerVibe, insights.PRGuidelines, insights.IssueQualityScore, insights.RawSummary,
		insights.WarmthScore, insights.PatienceScore, insights.NitpickRatio, insights.MaintainerPersona, insights.DosJSON, insights.DontsJSON)
	return err
}

func (r *sqlxAIRepository) SaveRawComments(ctx context.Context, repoID string, comments []string) error {
	for _, comment := range comments {
		if comment == "" {
			continue
		}
		_, _ = r.db.ExecContext(ctx, `
			INSERT INTO repo_raw_comments (repository_id, author_login, comment_text, created_at)
			VALUES (?, 'maintainer', ?, CURRENT_TIMESTAMP)
		`, repoID, comment)
	}
	return nil
}

func (r *sqlxAIRepository) GetRawComments(ctx context.Context, repoID string, limit int) ([]string, error) {
	var comments []string
	err := r.db.SelectContext(ctx, &comments, `
		SELECT comment_text FROM repo_raw_comments
		WHERE repository_id = ?
		ORDER BY id DESC
		LIMIT ?
	`, repoID, limit)
	if err != nil {
		return nil, err
	}
	return comments, nil
}

func (r *sqlxAIRepository) SavePRComments(ctx context.Context, repoID string, comments []PRComment) error {
	for _, comment := range comments {
		if comment.Body == "" || comment.AuthorLogin == "" || comment.PRNumber == 0 || comment.CreatedAt.IsZero() {
			continue
		}
		_, _ = r.db.ExecContext(ctx, `
			INSERT IGNORE INTO repo_pr_comments (
				repository_id, pr_number, source_type, author_login, author_association, comment_text, created_at
			)
			VALUES (?, ?, ?, ?, ?, ?, ?)
		`, repoID, comment.PRNumber, comment.SourceType, comment.AuthorLogin, comment.AuthorAssociation, comment.Body, comment.CreatedAt.UTC())
	}
	return nil
}

func (r *sqlxAIRepository) GetPRComments(ctx context.Context, repoID string, limit int) ([]string, error) {
	if limit <= 0 || limit > 30 {
		limit = 30
	}
	var comments []string
	err := r.db.SelectContext(ctx, &comments, `
		SELECT comment_text FROM repo_pr_comments
		WHERE repository_id = ?
		  AND author_association IN ('OWNER', 'MEMBER', 'COLLABORATOR')
		  AND author_login NOT LIKE '%[bot]%'
		ORDER BY created_at DESC
		LIMIT ?
	`, repoID, limit)
	if err != nil {
		return nil, err
	}
	return comments, nil
}

func (r *sqlxAIRepository) SaveIssueComments(ctx context.Context, repoID string, comments []string) error {
	for _, comment := range comments {
		if comment == "" {
			continue
		}
		_, _ = r.db.ExecContext(ctx, `
			INSERT IGNORE INTO repo_issue_comments (repository_id, comment_text, created_at)
			VALUES (?, ?, CURRENT_TIMESTAMP)
		`, repoID, comment)
	}
	return nil
}

func (r *sqlxAIRepository) GetIssueComments(ctx context.Context, repoID string, limit int) ([]string, error) {
	var comments []string
	err := r.db.SelectContext(ctx, &comments, `
		SELECT comment_text FROM repo_issue_comments
		WHERE repository_id = ?
		ORDER BY id DESC
		LIMIT ?
	`, repoID, limit)
	return comments, err
}
