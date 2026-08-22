package handler

import (
	"math"
	"net/http"
	"sort"
	"strconv"
	"strings"

	"github.com/abhisheksoni27/opendoor/internal/repository"
	"github.com/abhisheksoni27/opendoor/internal/scoring"
	"github.com/gin-gonic/gin"
)

const defaultMatchLimit = 20

type matchResponse struct {
	repoResponse
	MatchScore float64  `json:"match_score"`
	Reasons    []string `json:"reasons"`
}

// MatchReposHandler handles GET /api/v1/match.
// Query: languages=go,rust (required), level=beginner|experienced, limit, exclude_stale.
func MatchReposHandler(repoStore repository.RepoRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		languages := parseLanguages(c.Query("languages"))
		if len(languages) == 0 {
			c.JSON(http.StatusBadRequest, gin.H{
				"error":   "missing_languages",
				"message": "Provide at least one language, e.g. ?languages=go,rust",
			})
			return
		}

		level := strings.TrimSpace(strings.ToLower(c.Query("level")))
		limit := defaultMatchLimit
		if v, err := atoiParam(c.Query("limit")); err == nil && v > 0 {
			if v > 50 {
				v = 50
			}
			limit = v
		}

		repos, _, err := repoStore.List(c.Request.Context(), repository.RepoFilter{
			Languages:         languages,
			SortBy:            "c_rank_score",
			Order:             "DESC",
			Limit:             limit * 3,
			ExcludeStale:      c.Query("exclude_stale") != "false",
			HasGoodFirstIssue: level != "experienced",
		})
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "query failed"})
			return
		}

		matches := rankMatches(repos, level)
		if len(matches) > limit {
			matches = matches[:limit]
		}

		c.Header("Cache-Control", "public, max-age=900, s-maxage=3600")
		c.JSON(http.StatusOK, gin.H{"data": matches})
	}
}

// rankMatches scores and sorts repos for the requested contributor level.
func rankMatches(repos []repository.RepoRecord, level string) []matchResponse {
	matches := make([]matchResponse, 0, len(repos))
	for _, r := range repos {
		metrics := scoring.MatchMetrics{
			CRankScore:            r.CRankScore,
			ExternalPRMergeRate:   r.ExternalPRMergeRate,
			FirstTimerSuccessRate: r.FirstTimerSuccessRate,
			ResponseP50Hours:      r.ResponseP50Hours,
			GoodFirstIssueCount:   r.GoodFirstIssueCount,
			OnboardingScore:       float64(r.OnboardingScore),
			LastActivityDays:      r.LastActivityDays,
			StalenessFlag:         r.StalenessFlag,
		}
		matches = append(matches, matchResponse{
			repoResponse: toRepoResponse(r),
			MatchScore:   round2(scoring.MatchScore(metrics, level)),
			Reasons:      scoring.MatchReasons(metrics, level),
		})
	}

	sort.SliceStable(matches, func(i, j int) bool {
		return matches[i].MatchScore > matches[j].MatchScore
	})
	return matches
}

// parseLanguages splits a comma separated language list into clean tokens.
func parseLanguages(raw string) []string {
	var langs []string
	for _, l := range strings.Split(raw, ",") {
		if l = strings.TrimSpace(l); l != "" {
			langs = append(langs, l)
		}
	}
	return langs
}

func toRepoResponse(r repository.RepoRecord) repoResponse {
	return repoResponse{
		ID:                       r.ID,
		FullName:                 r.FullName,
		Language:                 r.Language,
		Stars:                    r.Stars,
		Description:              r.Description,
		GithubURL:                r.GithubURL,
		CRankTier:                r.CRankTier,
		CRankScore:               r.CRankScore,
		ExternalPRMergeRate:      r.ExternalPRMergeRate,
		TimeToFirstResponseHours: r.TimeToFirstResponseHours,
		TimeToMergeHours:         r.TimeToMergeHours,
		FirstTimerSuccessRate:    r.FirstTimerSuccessRate,
		RepeatContributorRate:    r.RepeatContributorRate,
		MaintainerResponsiveness: r.MaintainerResponsiveness,
		LastActivityDays:         r.LastActivityDays,
		ReviewRounds:             r.ReviewRounds,
		DistinctMaintainerCount:  r.DistinctMaintainerCount,
		StalenessFlag:            r.StalenessFlag,
		SnapshotDate:             r.SnapshotDate,
		GoodFirstIssueCount:      r.GoodFirstIssueCount,
		OnboardingScore:          r.OnboardingScore,
	}
}

func atoiParam(raw string) (int, error) {
	return strconv.Atoi(strings.TrimSpace(raw))
}

func round2(v float64) float64 {
	return math.Round(v*100) / 100
}
