package handler

import (
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"strings"

	"github.com/abhisheksoni27/opendoor/internal/ai"
	ghclient "github.com/abhisheksoni27/opendoor/internal/github"
	"github.com/abhisheksoni27/opendoor/internal/repository"
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
func ScoreRepo(gh *ghclient.Client, repoStore repository.RepoRepository, aiClient *ai.AIClient, aiRepo repository.AIRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		var body ScoreRepoBody
		if err := c.ShouldBindJSON(&body); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "owner and name are required"})
			return
		}

		fullName := body.Owner + "/" + body.Name
		slog.Info("score-repo: starting", "repo", fullName)

		// --- Fetch from GitHub (180 day window) ---
		prs, meta, err := gh.FetchPRs(body.Owner, body.Name, 180)
		if err != nil {
			slog.Error("score-repo: FetchPRs failed", "repo", fullName, "err", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("FetchPRs: %v", err)})
			return
		}

		_ = meta

		gfiIssues, gfiCount, err := gh.FetchGoodFirstIssuesList(body.Owner, body.Name, 5)
		if err != nil {
			slog.Warn("score-repo: FetchGoodFirstIssuesList failed - assuming none", "repo", fullName, "err", err)
		}

		// Convert github.PR → scoring.PR
		scoringPRs := make([]scoring.PR, len(prs))
		var rawCommentTexts []string
		var prComments []repository.PRComment
		for i, p := range prs {
			for _, comment := range p.ReviewComments {
				cleanText := strings.TrimSpace(comment.Body)
				if cleanText == "" || ghclient.IsBotLogin(comment.AuthorLogin) {
					continue
				}
				prComments = append(prComments, repository.PRComment{
					PRNumber:          comment.PRNumber,
					SourceType:        comment.SourceType,
					AuthorLogin:       comment.AuthorLogin,
					AuthorAssociation: comment.AuthorAssociation,
					Body:              cleanText,
					CreatedAt:         comment.CreatedAt,
				})
				rawCommentTexts = append(rawCommentTexts, cleanText)
			}
			for idx, commentText := range p.CommentTexts {
				cleanText := strings.TrimSpace(commentText)
				if cleanText != "" {
					author := "maintainer"
					if idx < len(p.CommentAuthors) && p.CommentAuthors[idx] != "" {
						author = p.CommentAuthors[idx]
					}
					if !ghclient.IsBotLogin(author) && len(p.ReviewComments) == 0 {
						rawCommentTexts = append(rawCommentTexts, cleanText)
					}
				}
			}
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

		raw := scoring.ComputeMetrics(scoringPRs, false)
		raw.GoodFirstIssueCount = gfiCount

		// --- Normalise against existing DB population ---
		allRaw, err := repoStore.FetchLatestSnapshotsSample(c.Request.Context(), 500)
		if err != nil {
			slog.Warn("score-repo: could not fetch DB metrics for normalisation - using single-repo percentile", "err", err)
		}
		allRaw = append(allRaw, raw)

		normed := scoring.NormaliseAll(allRaw)
		thisNormed := normed[len(normed)-1]

		score, tier := scoring.ComputeCRank(thisNormed, raw.StalenessFlag, raw.GoodFirstIssueCount)

		// --- Save to DB ---
		var repoID string
		existingRepo, err := repoStore.FindByIDOrName(c.Request.Context(), fullName)
		if err == nil && existingRepo != nil {
			repoID = existingRepo.ID
		} else {
			repoID = uuid.New().String()
		}

		if len(gfiIssues) > 0 {
			if v, exists := c.Get("db"); exists && v != nil {
				if database, ok := v.(*sqlx.DB); ok {
					gfiRepo := repository.NewGFIRepository(database)
					_ = gfiRepo.UpsertIssues(c.Request.Context(), repoID, gfiIssues)
				}
			}
		}

		if err := repoStore.InsertSnapshot(c.Request.Context(), repoID, raw, score, tier); err != nil {
			slog.Error("score-repo: insert snapshot failed", "repo", fullName, "err", err)
		} else {
			slog.Info("score-repo: successfully saved to DB", "repo", fullName, "repo_id", repoID)
		}

		// Save raw comments & trigger AI insights generation
		_ = aiRepo.SaveRawComments(c.Request.Context(), repoID, rawCommentTexts)
		_ = aiRepo.SavePRComments(c.Request.Context(), repoID, prComments)
		insightsResp, aiErr := aiClient.GenerateRepoInsights(c.Request.Context(), fullName, rawCommentTexts, nil)
		if aiErr != nil {
			slog.Error("score-repo: GenerateRepoInsights failed", "repo", fullName, "err", aiErr)
		} else if insightsResp != nil {
			guidelinesBytes, _ := json.Marshal(insightsResp.PRGuidelines)
			dosBytes, _ := json.Marshal(insightsResp.TopDos)
			dontsBytes, _ := json.Marshal(insightsResp.TopDonts)

			saveErr := aiRepo.SaveInsights(c.Request.Context(), &repository.AIInsights{
				RepoID:            repoID,
				MaintainerVibe:    insightsResp.MaintainerVibe,
				PRGuidelines:      string(guidelinesBytes),
				IssueQualityScore: insightsResp.IssueQualityScore,
				RawSummary:        insightsResp.RawSummary,
				WarmthScore:       insightsResp.WarmthScore,
				PatienceScore:     insightsResp.PatienceScore,
				NitpickRatio:      insightsResp.NitpickRatio,
				MaintainerPersona: insightsResp.MaintainerPersona,
				DosJSON:           string(dosBytes),
				DontsJSON:         string(dontsBytes),
			})
			if saveErr != nil {
				slog.Error("score-repo: SaveInsights failed", "repo", fullName, "err", saveErr)
			} else {
				slog.Info("score-repo: successfully saved AI insights", "repo", fullName, "repo_id", repoID)
			}
		}

		slog.Info("score-repo: done",
			"repo", fullName,
			"score", score,
			"tier", tier,
			"prs_fetched", len(prs),
			"stale", raw.StalenessFlag,
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
				"maintainer_responsiveness":    raw.MaintainerResponsiveness,
				"last_activity_days":           raw.LastActivityDays,
				"review_rounds":                raw.ReviewRounds,
				"distinct_maintainer_count":    raw.DistinctMaintainerCount,
				"staleness_flag":               raw.StalenessFlag,
				"good_first_issue_count":       raw.GoodFirstIssueCount,
			},
			"normalised_metrics": gin.H{
				"merge_rate":         thisNormed.MergeRate,
				"response_time":      thisNormed.ResponseTime,
				"first_timer":        thisNormed.FirstTimer,
				"time_to_merge":      thisNormed.TimeToMerge,
				"repeat_contributor": thisNormed.RepeatContributor,
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
				"prs_fetched":   len(prs),
				"db_peers_used": len(allRaw) - 1,
			},
		})
	}
}
