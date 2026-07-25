package handler

import (
	"fmt"
	"log/slog"
	"net/http"

	ghclient "github.com/abhisheksoni27/opendoor/internal/github"
	"github.com/abhisheksoni27/opendoor/internal/middleware"
	"github.com/abhisheksoni27/opendoor/internal/scoring"
	"github.com/gin-gonic/gin"
	"github.com/jmoiron/sqlx"
)

// ScoreRepoBody is the request body for the single-repo scoring endpoint.
type ScoreRepoBody struct {
	Owner string `json:"owner" binding:"required"`
	Name  string `json:"name"  binding:"required"`
}

// ScoreRepo handles POST /internal/score-repo
// Fetches live GitHub data for one repo, computes its C-Rank score,
// and returns the full diagnostic output synchronously. No DB write.
//
//	@Summary      Score a single repository (diagnostic)
//	@Description  Fetches live GitHub data, computes metrics and C-Rank. Does not write to DB. Use for testing.
//	@Tags         internal
//	@Accept       json
//	@Produce      json
//	@Security     ApiKeyAuth
//	@Param        body  body      ScoreRepoBody  true  "Repository to score"
//	@Success      200   {object}  map[string]any
//	@Failure      400   {object}  map[string]string
//	@Failure      500   {object}  map[string]string
//	@Router       /internal/score-repo [post]
func ScoreRepo(gh *ghclient.Client) gin.HandlerFunc {
	return func(c *gin.Context) {
		var body ScoreRepoBody
		if err := c.ShouldBindJSON(&body); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "owner and name are required"})
			return
		}

		db := middleware.MustDB(c)
		if db == nil {
			return
		}

		slog.Info("score-repo: starting", "repo", body.Owner+"/"+body.Name)

		// --- Fetch from GitHub ---
		prs, err := gh.FetchPRs(body.Owner, body.Name, 90)
		if err != nil {
			slog.Error("score-repo: FetchPRs failed", "repo", body.Owner+"/"+body.Name, "err", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("FetchPRs: %v", err)})
			return
		}

		issues, err := gh.FetchIssues(body.Owner, body.Name, 90)
		if err != nil {
			slog.Error("score-repo: FetchIssues failed", "repo", body.Owner+"/"+body.Name, "err", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("FetchIssues: %v", err)})
			return
		}

		stale, err := gh.IsStalenessFlag(body.Owner, body.Name)
		if err != nil {
			slog.Warn("score-repo: IsStalenessFlag failed — assuming not stale", "repo", body.Owner+"/"+body.Name, "err", err)
		}

		// --- Compute raw metrics ---
		scoringPRs := make([]scoring.PR, len(prs))
		for i, p := range prs {
			scoringPRs[i] = scoring.PR{
				State:             p.State,
				CreatedAt:         p.CreatedAt,
				MergedAt:          p.MergedAt,
				AuthorAssociation: p.AuthorAssociation,
				AuthorLogin:       p.AuthorLogin,
				FirstCommentAt:    p.FirstCommentAt,
			}
		}
		scoringIssues := make([]scoring.Issue, len(issues))
		for i, iss := range issues {
			scoringIssues[i] = scoring.Issue{
				CreatedAt:      iss.CreatedAt,
				FirstCommentAt: iss.FirstCommentAt,
			}
		}

		raw := scoring.ComputeMetrics(scoringPRs, scoringIssues, stale)

		// --- Normalise against existing DB population ---
		// Pull all existing raw metrics from the DB so percentile rank is meaningful.
		allRaw, err := fetchAllRawMetrics(db)
		if err != nil {
			slog.Warn("score-repo: could not fetch DB metrics for normalisation — using single-repo percentile", "err", err)
		}
		// Append this repo last so its own percentile is computed against peers.
		allRaw = append(allRaw, raw)

		normed := scoring.NormaliseAll(allRaw)
		// Last element is this repo.
		thisNormed := normed[len(normed)-1]

		score, tier := scoring.ComputeCRank(thisNormed, raw.StalenessFlag)

		slog.Info("score-repo: done",
			"repo", body.Owner+"/"+body.Name,
			"score", score,
			"tier", tier,
			"prs_fetched", len(prs),
			"issues_fetched", len(issues),
			"stale", stale,
			"db_peers", len(allRaw)-1,
		)

		c.JSON(http.StatusOK, gin.H{
			"repo": body.Owner + "/" + body.Name,
			"raw_metrics": gin.H{
				"external_pr_merge_rate":       raw.ExternalPRMergeRate,
				"time_to_first_response_hours": raw.TimeToFirstResponseHours,
				"time_to_merge_hours":          raw.TimeToMergeHours,
				"first_timer_success_rate":     raw.FirstTimerSuccessRate,
				"repeat_contributor_rate":      raw.RepeatContributorRate,
				"issue_triage_speed_hours":     raw.IssueTriageSpeedHours,
				"maintainer_responsiveness":    raw.MaintainerResponsiveness,
				"staleness_flag":               raw.StalenessFlag,
			},
			"normalised_metrics": gin.H{
				"merge_rate":          thisNormed.MergeRate,
				"response_time":       thisNormed.ResponseTime,
				"first_timer":         thisNormed.FirstTimer,
				"time_to_merge":       thisNormed.TimeToMerge,
				"repeat_contributor":  thisNormed.RepeatContributor,
				"issue_triage_speed":  thisNormed.IssueTriageSpeed,
				"responsiveness":      thisNormed.Responsiveness,
			},
			"c_rank": gin.H{
				"score": score,
				"tier":  tier,
			},
			"data_points": gin.H{
				"prs_fetched":    len(prs),
				"issues_fetched": len(issues),
				"db_peers_used":  len(allRaw) - 1,
			},
		})
	}
}

// fetchAllRawMetrics loads the latest snapshot raw metrics for every repo in the DB.
// Used to normalise the test repo against real population data.
func fetchAllRawMetrics(db *sqlx.DB) ([]scoring.RawMetrics, error) {
	rows, err := db.Query(`
		SELECT
			COALESCE(s.external_pr_merge_rate, 0),
			COALESCE(s.time_to_first_response_hours, 0),
			COALESCE(s.time_to_merge_hours, 0),
			COALESCE(s.first_timer_success_rate, 0),
			COALESCE(s.repeat_contributor_rate, 0),
			COALESCE(s.issue_triage_speed_hours, 0),
			COALESCE(s.maintainer_responsiveness, 0),
			COALESCE(s.staleness_flag, 0)
		FROM daily_snapshots s
		INNER JOIN (
			SELECT repository_id, MAX(snapshot_date) as latest
			FROM daily_snapshots
			GROUP BY repository_id
		) latest ON s.repository_id = latest.repository_id
		         AND s.snapshot_date = latest.latest
	`)
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
			&m.IssueTriageSpeedHours,
			&m.MaintainerResponsiveness,
			&staleInt,
		); err != nil {
			return nil, err
		}
		m.StalenessFlag = staleInt == 1
		result = append(result, m)
	}
	return result, nil
}
