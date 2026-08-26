package hacktoberfest

import (
	"context"
)

// LeaderboardEntry is one ranked newcomer-welcoming repo (AC7).
type LeaderboardEntry struct {
	ID                     string   `db:"id" json:"id"`
	FullName               string   `db:"full_name" json:"full_name"`
	Description            *string  `db:"description" json:"description"`
	Language               *string  `db:"language" json:"language"`
	Stars                  int      `db:"stars" json:"stars"`
	CRankTier              string   `db:"c_rank_tier" json:"c_rank_tier"`
	CRankScore             float64  `db:"c_rank_score" json:"c_rank_score"`
	GFIQualityScore        float64  `db:"gfi_quality_score" json:"gfi_quality_score"`
	GFICount               int      `db:"gfi_count" json:"gfi_count"`
	FirstTimerSuccessRate  float64  `db:"first_timer_success_rate" json:"first_timer_success_rate"`
	WelcomeBadge           bool     `json:"welcome_badge"` // first-timer merge rate > 60% (AC7 badge)
}

// WelcomeRateThreshold is the first-timer merge-rate cutoff for the welcome
// badge; it is a ranking weight + badge, never a hard filter (AC7).
const WelcomeRateThreshold = 60.0

// Leaderboard ranks S/A/B-tier repos by C-Rank tier, then GFI quality, then
// C-Rank score and first-timer rate as tiebreak weights.
func (s *Store) Leaderboard(ctx context.Context, limit int) ([]LeaderboardEntry, error) {
	var out []LeaderboardEntry
	err := s.db.SelectContext(ctx, &out, `
		SELECT r.id, r.full_name, r.description, r.language, r.stars,
		       s.c_rank_tier, s.c_rank_score, COALESCE(s.first_timer_success_rate,0) AS first_timer_success_rate,
		       COALESCE(s.good_first_issue_count,0) AS gfi_count,
		       COALESCE((SELECT ROUND(AVG(g.quality_score)) FROM repo_good_first_issues g WHERE g.repository_id = r.id), 0) AS gfi_quality_score
		FROM repositories r
		JOIN latest_snapshots s ON s.repository_id = r.id
		WHERE s.c_rank_tier IN ('S','A','B')
		ORDER BY CASE s.c_rank_tier WHEN 'S' THEN 0 WHEN 'A' THEN 1 ELSE 2 END ASC,
		         gfi_quality_score DESC,
		         s.c_rank_score DESC,
		         first_timer_success_rate DESC
		LIMIT ?`, limit)
	if err != nil {
		return nil, err
	}
	for i := range out {
		out[i].WelcomeBadge = out[i].FirstTimerSuccessRate > WelcomeRateThreshold
	}
	return out, nil
}
