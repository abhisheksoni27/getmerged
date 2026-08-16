package scoring

import (
	"fmt"
	"strings"
)

type MatchedRepo struct {
	ID                  string  `db:"id" json:"id"`
	FullName            string  `db:"full_name" json:"full_name"`
	Language            string  `db:"language" json:"language"`
	CRankTier           string  `db:"c_rank_tier" json:"c_rank_tier"`
	CRankScore          float64 `db:"c_rank_score" json:"c_rank_score"`
	ExternalMergeRate   float64 `db:"external_pr_merge_rate" json:"external_pr_merge_rate"`
	ResponseP50Hours    float64 `db:"response_p50_hours" json:"response_p50_hours"`
	GoodFirstIssueCount int     `db:"good_first_issue_count" json:"good_first_issue_count"`
	MatchReason         string  `json:"match_reason"`
}

// BuildMatchmakingQuery constructs a fast, index-optimized SQL query matching contributor language preferences.
func BuildMatchmakingQuery(preferredLangs []string, limit int) (string, []interface{}) {
	if limit <= 0 || limit > 20 {
		limit = 5
	}

	if len(preferredLangs) == 0 {
		query := `
			SELECT r.id, r.full_name, r.language, s.c_rank_tier, s.c_rank_score,
			       s.external_pr_merge_rate, s.response_p50_hours, s.good_first_issue_count
			FROM repositories r
			JOIN latest_snapshots s ON r.id = s.repository_id
			WHERE s.c_rank_tier IN ('S', 'A') AND r.staleness_flag = FALSE
			ORDER BY s.c_rank_score DESC, s.external_pr_merge_rate DESC
			LIMIT ?;
		`
		return query, []interface{}{limit}
	}

	placeholders := make([]string, len(preferredLangs))
	args := make([]interface{}, len(preferredLangs)+1)
	for i, lang := range preferredLangs {
		placeholders[i] = "?"
		args[i] = lang
	}
	args[len(preferredLangs)] = limit

	query := fmt.Sprintf(`
		SELECT r.id, r.full_name, r.language, s.c_rank_tier, s.c_rank_score,
		       s.external_pr_merge_rate, s.response_p50_hours, s.good_first_issue_count
		FROM repositories r
		JOIN latest_snapshots s ON r.id = s.repository_id
		WHERE r.language IN (%s) AND s.c_rank_tier IN ('S', 'A') AND r.staleness_flag = FALSE
		ORDER BY s.c_rank_score DESC, s.external_pr_merge_rate DESC
		LIMIT ?;
	`, strings.Join(placeholders, ", "))

	return query, args
}
