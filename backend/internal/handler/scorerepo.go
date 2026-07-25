package handler

import (
	"database/sql"
	"fmt"
	"log/slog"
	"net/http"
	"time"

	ghclient "github.com/abhisheksoni27/opendoor/internal/github"
	"github.com/abhisheksoni27/opendoor/internal/middleware"
	"github.com/abhisheksoni27/opendoor/internal/scoring"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

// ScoreRepoBody is the request body for the single-repo scoring endpoint.
type ScoreRepoBody struct {
	Owner string `json:"owner" binding:"required"`
	Name  string `json:"name"  binding:"required"`
}

// ScoreRepo handles POST /internal/score-repo
// Fetches live GitHub data for one repo, computes its C-Rank score,
// stores/upserts the repo and snapshot into DB, and returns full diagnostic output.
//
//	@Summary      Score a single repository & store to DB
//	@Description  Fetches live GitHub data, computes metrics and C-Rank, and saves to DB.
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

		fullName := body.Owner + "/" + body.Name
		slog.Info("score-repo: starting", "repo", fullName)

		// --- Fetch from GitHub (180 day window) ---
		prs, err := gh.FetchPRs(body.Owner, body.Name, 180)
		if err != nil {
			slog.Error("score-repo: FetchPRs failed", "repo", fullName, "err", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("FetchPRs: %v", err)})
			return
		}

		issues, err := gh.FetchIssues(body.Owner, body.Name, 180)
		if err != nil {
			slog.Error("score-repo: FetchIssues failed", "repo", fullName, "err", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("FetchIssues: %v", err)})
			return
		}

		stale, err := gh.IsStalenessFlag(body.Owner, body.Name)
		if err != nil {
			slog.Warn("score-repo: IsStalenessFlag failed — assuming not stale", "repo", fullName, "err", err)
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
				TotalComments:     p.TotalComments,
				CommentAuthors:    p.CommentAuthors,
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
		allRaw, err := fetchAllRawMetrics(db)
		if err != nil {
			slog.Warn("score-repo: could not fetch DB metrics for normalisation — using single-repo percentile", "err", err)
		}
		allRaw = append(allRaw, raw)

		normed := scoring.NormaliseAll(allRaw)
		thisNormed := normed[len(normed)-1]

		score, tier := scoring.ComputeCRank(thisNormed, raw.StalenessFlag)

		// --- Save to DB ---
		repoID, err := upsertRepoRecord(db, body.Owner, body.Name)
		if err != nil {
			slog.Error("score-repo: upsert repo failed", "repo", fullName, "err", err)
		} else {
			if err := insertSnapshotRecord(db, repoID, raw, score, tier); err != nil {
				slog.Error("score-repo: insert snapshot failed", "repo", fullName, "err", err)
			} else {
				slog.Info("score-repo: successfully saved to DB", "repo", fullName, "repo_id", repoID)
			}
		}

		slog.Info("score-repo: done",
			"repo", fullName,
			"score", score,
			"tier", tier,
			"prs_fetched", len(prs),
			"issues_fetched", len(issues),
			"stale", stale,
			"db_peers", len(allRaw)-1,
		)

		c.JSON(http.StatusOK, gin.H{
			"repo":    fullName,
			"repo_id": repoID,
			"raw_metrics": gin.H{
				"external_pr_merge_rate":       raw.ExternalPRMergeRate,
				"time_to_first_response_hours": raw.TimeToFirstResponseHours,
				"time_to_merge_hours":          raw.TimeToMergeHours,
				"first_timer_success_rate":     raw.FirstTimerSuccessRate,
				"repeat_contributor_rate":      raw.RepeatContributorRate,
				"issue_triage_speed_hours":     raw.IssueTriageSpeedHours,
				"maintainer_responsiveness":    raw.MaintainerResponsiveness,
				"last_activity_days":           raw.LastActivityDays,
				"review_rounds":                raw.ReviewRounds,
				"distinct_maintainer_count":     raw.DistinctMaintainerCount,
				"staleness_flag":               raw.StalenessFlag,
			},
			"normalised_metrics": gin.H{
				"merge_rate":         thisNormed.MergeRate,
				"response_time":      thisNormed.ResponseTime,
				"first_timer":        thisNormed.FirstTimer,
				"time_to_merge":      thisNormed.TimeToMerge,
				"repeat_contributor": thisNormed.RepeatContributor,
				"issue_triage_speed": thisNormed.IssueTriageSpeed,
				"responsiveness":     thisNormed.Responsiveness,
				"activity_recency":   thisNormed.ActivityRecency,
				"review_rounds":      thisNormed.ReviewRounds,
				"maintainer_breadth": thisNormed.MaintainerBreadth,
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

func upsertRepoRecord(db *sqlx.DB, owner, name string) (string, error) {
	fullName := owner + "/" + name
	githubURL := fmt.Sprintf("https://github.com/%s/%s", owner, name)

	var id string
	err := db.QueryRow("SELECT id FROM repositories WHERE full_name = ?", fullName).Scan(&id)
	if err == sql.ErrNoRows {
		id = uuid.New().String()
		_, err = db.Exec(`
			INSERT INTO repositories (id, full_name, owner, name, language, stars, description, github_url, updated_at)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
		`, id, fullName, owner, name, "", 0, "", githubURL, time.Now().UTC())
		return id, err
	} else if err != nil {
		return "", err
	}

	_, err = db.Exec("UPDATE repositories SET updated_at = ? WHERE id = ?", time.Now().UTC(), id)
	return id, err
}

func insertSnapshotRecord(db *sqlx.DB, repoID string, m scoring.RawMetrics, score float64, tier string) error {
	staleness := 0
	if m.StalenessFlag {
		staleness = 1
	}
	_, err := db.Exec(`
		INSERT INTO daily_snapshots (
			id, repository_id, snapshot_date,
			external_pr_merge_rate, time_to_first_response_hours, time_to_merge_hours,
			first_timer_success_rate, repeat_contributor_rate, issue_triage_speed_hours,
			maintainer_responsiveness, last_activity_days, review_rounds,
			distinct_maintainer_count, staleness_flag, c_rank_score, c_rank_tier
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		ON CONFLICT(repository_id, snapshot_date) DO UPDATE SET
			external_pr_merge_rate        = excluded.external_pr_merge_rate,
			time_to_first_response_hours  = excluded.time_to_first_response_hours,
			time_to_merge_hours           = excluded.time_to_merge_hours,
			first_timer_success_rate      = excluded.first_timer_success_rate,
			repeat_contributor_rate       = excluded.repeat_contributor_rate,
			issue_triage_speed_hours      = excluded.issue_triage_speed_hours,
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
		time.Now().UTC().Format("2006-01-02"),
		m.ExternalPRMergeRate,
		m.TimeToFirstResponseHours,
		m.TimeToMergeHours,
		m.FirstTimerSuccessRate,
		m.RepeatContributorRate,
		m.IssueTriageSpeedHours,
		m.MaintainerResponsiveness,
		m.LastActivityDays,
		m.ReviewRounds,
		m.DistinctMaintainerCount,
		staleness,
		score,
		tier,
	)
	return err
}

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
			COALESCE(s.last_activity_days, 180),
			COALESCE(s.review_rounds, 0),
			COALESCE(s.distinct_maintainer_count, 0),
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
