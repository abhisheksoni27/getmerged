package repository

import (
	"context"
	"time"

	"github.com/jmoiron/sqlx"
)

type AIInsights struct {
	RepoID             string    `db:"repo_id" json:"repo_id"`
	MaintainerVibe     string    `db:"maintainer_vibe" json:"maintainer_vibe"`
	PRGuidelines       string    `db:"pr_guidelines" json:"pr_guidelines"`
	IssueQualityScore  float64   `db:"issue_quality_score" json:"issue_quality_score"`
	RawSummary         string    `db:"raw_summary" json:"raw_summary"`
	UpdatedAt          time.Time `db:"updated_at" json:"updated_at"`
}

type AIRepository interface {
	GetInsights(ctx context.Context, repoID string) (*AIInsights, error)
	SaveInsights(ctx context.Context, insights *AIInsights) error
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
		SELECT repo_id, maintainer_vibe, pr_guidelines, issue_quality_score, raw_summary, updated_at
		FROM repo_ai_insights WHERE repo_id = ?
	`, repoID)
	if err != nil {
		return nil, err
	}
	return &item, nil
}

func (r *sqlxAIRepository) SaveInsights(ctx context.Context, insights *AIInsights) error {
	_, err := r.db.ExecContext(ctx, `
		INSERT INTO repo_ai_insights (repo_id, maintainer_vibe, pr_guidelines, issue_quality_score, raw_summary, updated_at)
		VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
		ON CONFLICT(repo_id) DO UPDATE SET
			maintainer_vibe = excluded.maintainer_vibe,
			pr_guidelines = excluded.pr_guidelines,
			issue_quality_score = excluded.issue_quality_score,
			raw_summary = excluded.raw_summary,
			updated_at = CURRENT_TIMESTAMP
	`, insights.RepoID, insights.MaintainerVibe, insights.PRGuidelines, insights.IssueQualityScore, insights.RawSummary)
	return err
}
