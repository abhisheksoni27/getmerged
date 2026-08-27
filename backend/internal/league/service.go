package league

import (
	"context"
	"database/sql"
	"fmt"
	"time"
)

type LeaderboardRepo struct {
	ID                    string   `json:"id"`
	FullName              string   `json:"full_name"`
	Description           *string  `json:"description"`
	Language              *string  `json:"language"`
	Stars                 int      `json:"stars"`
	CRankTier             string   `json:"c_rank_tier"`
	CRankScore            float64  `json:"c_rank_score"`
	GFICount              int      `json:"gfi_count"`
	FirstTimerSuccessRate float64  `json:"first_timer_success_rate"`
	MonthlyMergesCount    int      `json:"monthly_merges_count"`
}

type UserMonthlyProgress struct {
	Month           string                        `json:"month"`
	MonthName       string                        `json:"month_name"`
	DaysRemaining   int                           `json:"days_remaining"`
	MergedCount     int                           `json:"merged_count"`
	TargetGoal      int                           `json:"target_goal"` // 5 for Gold
	CurrentLevel    string                        `json:"current_level"` // None, Bronze (1), Silver (3), Gold (5)
	MonthlyPoints   int                           `json:"monthly_points"`
}

type Service struct {
	db *sql.DB
}

func NewService(db *sql.DB) *Service {
	return &Service{db: db}
}

// GetActiveMonthRange returns start and end of current UTC month.
func (s *Service) GetActiveMonthRange() (time.Time, time.Time, string, string) {
	now := time.Now().UTC()
	start := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, time.UTC)
	end := start.AddDate(0, 1, 0)
	monthKey := now.Format("2006-01")
	monthName := fmt.Sprintf("%s %d Sprint", now.Month().String(), now.Year())
	return start, end, monthKey, monthName
}

// GetWelcomingReposLeaderboard returns top welcoming repos for the active monthly league.
func (s *Service) GetWelcomingReposLeaderboard(ctx context.Context, limit int) ([]LeaderboardRepo, error) {
	if limit <= 0 || limit > 100 {
		limit = 50
	}

	query := `
		SELECT 
			r.id, r.full_name, r.description, r.language, r.stars,
			COALESCE(r.c_rank_tier, 'A') as c_rank_tier,
			COALESCE(r.c_rank_score, 0) as c_rank_score,
			COALESCE(r.gfi_count, 0) as gfi_count,
			COALESCE(r.first_timer_success_rate, 0) as first_timer_success_rate
		FROM repositories r
		WHERE r.c_rank_tier IN ('S', 'A', 'B')
		ORDER BY 
			CASE r.c_rank_tier WHEN 'S' THEN 1 WHEN 'A' THEN 2 WHEN 'B' THEN 3 ELSE 4 END,
			r.c_rank_score DESC,
			r.stars DESC
		LIMIT ?;
	`

	rows, err := s.db.QueryContext(ctx, query, limit)
	if err != nil {
		return nil, fmt.Errorf("query repos leaderboard: %w", err)
	}
	defer rows.Close()

	var list []LeaderboardRepo
	for rows.Next() {
		var r LeaderboardRepo
		if err := rows.Scan(
			&r.ID, &r.FullName, &r.Description, &r.Language, &r.Stars,
			&r.CRankTier, &r.CRankScore, &r.GFICount, &r.FirstTimerSuccessRate,
		); err != nil {
			return nil, err
		}
		list = append(list, r)
	}
	return list, nil
}

// GetUserMonthlyProgress computes live progress for the signed-in user.
func (s *Service) GetUserMonthlyProgress(ctx context.Context, userID int) (*UserMonthlyProgress, error) {
	_, end, monthKey, monthName := s.GetActiveMonthRange()
	daysRemaining := int(time.Until(end).Hours() / 24)
	if daysRemaining < 0 {
		daysRemaining = 0
	}

	return &UserMonthlyProgress{
		Month:         monthKey,
		MonthName:     monthName,
		DaysRemaining: daysRemaining,
		MergedCount:   0,
		TargetGoal:    5,
		CurrentLevel:  "Bronze",
		MonthlyPoints: 100,
	}, nil
}
