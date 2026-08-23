package handler

import (
	"context"
	"crypto/md5"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"

	ghclient "github.com/abhisheksoni27/opendoor/internal/github"
	"github.com/abhisheksoni27/opendoor/internal/middleware"
	"github.com/abhisheksoni27/opendoor/internal/pipeline"
	"github.com/abhisheksoni27/opendoor/internal/repository"
	"github.com/abhisheksoni27/opendoor/internal/scoring"
	"github.com/gin-gonic/gin"
)

const apiCacheTTL = 6 * time.Hour

// repoResponse is the shape returned to API consumers.
type repoResponse struct {
	ID                       string  `json:"id"`
	FullName                 string  `json:"full_name"`
	Language                 string  `json:"language"`
	Stars                    int     `json:"stars"`
	Description              string  `json:"description"`
	GithubURL                string  `json:"github_url"`
	CRankTier                string  `json:"c_rank_tier"`
	CRankScore               float64 `json:"c_rank_score"`
	ExternalPRMergeRate      float64 `json:"external_pr_merge_rate"`
	TimeToFirstResponseHours float64 `json:"time_to_first_response_hours"`
	TimeToMergeHours         float64 `json:"time_to_merge_hours"`
	FirstTimerSuccessRate    float64 `json:"first_timer_success_rate"`
	RepeatContributorRate    float64 `json:"repeat_contributor_rate"`
	MaintainerResponsiveness float64 `json:"maintainer_responsiveness"`
	LastActivityDays         float64 `json:"last_activity_days"`
	ReviewRounds             float64 `json:"review_rounds"`
	DistinctMaintainerCount  float64 `json:"distinct_maintainer_count"`
	StalenessFlag            bool    `json:"staleness_flag"`
	SnapshotDate             string  `json:"snapshot_date"`
	GoodFirstIssueCount      int     `json:"good_first_issue_count"`
	OnboardingScore          int     `json:"onboarding_score"`
}

type metaResponse struct {
	Page    int `json:"page"`
	PerPage int `json:"per_page"`
	Total   int `json:"total"`
}

// allowedSortFields guards against SQL injection in ORDER BY.
var allowedSortFields = map[string]string{
	"c_rank_score":                 "s.c_rank_score",
	"stars":                        "r.stars",
	"time_to_first_response_hours": "s.time_to_first_response_hours",
}

// ListRepos handles GET /api/v1/repos
//
//	@Summary      List repositories
//	@Description  Returns a paginated list of repositories with their latest C-Rank scores.
//	@Tags         repos
//	@Produce      json
//	@Param        language  query  string  false  "Filter by language (e.g. Go)"
//	@Param        min_stars query  int     false  "Minimum star count"
//	@Param        name      query  string  false  "Partial name search"
//	@Param        sort      query  string  false  "Sort column (c_rank_score, stars, time_to_first_response_hours)"
//	@Param        page      query  int     false  "Page number (default 1)"
//	@Param        per_page  query  int     false  "Items per page (default 20, max 100)"
//	@Success      200       {object}  map[string]any
//	@Failure      500       {object}  map[string]string
//	@Router       /api/v1/repos [get]
//
// ListRepos handles GET /api/v1/repos
func ListRepos(repoStore repository.RepoRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		vk := middleware.MustCache(c)
		useCache := strings.ToLower(c.GetHeader("X-Use-Cache")) != "false"

		// Construct cache key based on full URL request query
		queryHash := md5.Sum([]byte(c.Request.URL.RequestURI()))
		cacheKey := "apicache:repos:" + hex.EncodeToString(queryHash[:])

		ctx := context.Background()

		// Try reading from Valkey cache if useCache is true
		if useCache && vk != nil {
			if cached, err := vk.Do(ctx, vk.B().Get().Key(cacheKey).Build()).ToString(); err == nil && cached != "" {
				slog.Debug("api/v1/repos: cache HIT", "key", cacheKey)
				c.Header("X-Cache", "HIT")
				c.Data(http.StatusOK, "application/json; charset=utf-8", []byte(cached))
				return
			}
		}

		// Cloudflare edge & browser cache headers (15 min cache)
		c.Header("Cache-Control", "public, max-age=900, s-maxage=3600, stale-while-revalidate=300")
		c.Header("X-Cache", "MISS")

		// Parse query params
		tierParam := strings.TrimSpace(c.Query("tier"))
		lang := strings.TrimSpace(c.Query("language"))
		name := strings.TrimSpace(c.Query("name"))
		sortParam := strings.TrimSpace(c.Query("sort"))
		orderParam := strings.TrimSpace(strings.ToLower(c.Query("order")))
		pageStr := strings.TrimSpace(c.Query("page"))
		perPageStr := strings.TrimSpace(c.Query("per_page"))
		minMergeRateStr := strings.TrimSpace(c.Query("min_merge_rate"))
		trendingParam := strings.ToLower(strings.TrimSpace(c.Query("trending")))
		scoredTodayParam := strings.ToLower(strings.TrimSpace(c.Query("scored_today")))
		minStarsStr := strings.TrimSpace(c.Query("min_stars"))
		maxStarsStr := strings.TrimSpace(c.Query("max_stars"))
		minFirstTimerStr := strings.TrimSpace(c.Query("min_first_timer_success_rate"))
		maxFirstTimerStr := strings.TrimSpace(c.Query("max_first_timer_success_rate"))
		minMaintainersStr := strings.TrimSpace(c.Query("min_maintainers"))

		page := 1
		if p, err := strconv.Atoi(pageStr); err == nil && p > 0 {
			page = p
		}
		perPage := 15
		if pp, err := strconv.Atoi(perPageStr); err == nil && pp > 0 {
			perPage = pp
		}
		if perPage > 100 {
			perPage = 100
		}
		offset := (page - 1) * perPage

		var minMergeRate float64
		if mr, err := strconv.ParseFloat(minMergeRateStr, 64); err == nil && mr > 0 {
			minMergeRate = mr
		}

		var minStars, maxStars int
		if ms, err := strconv.Atoi(minStarsStr); err == nil && ms > 0 {
			minStars = ms
		}
		if ms, err := strconv.Atoi(maxStarsStr); err == nil && ms > 0 {
			maxStars = ms
		}

		var minFirstTimer, maxFirstTimer float64
		hasMinFirstTimer := false
		hasMaxFirstTimer := false
		if v, err := strconv.ParseFloat(minFirstTimerStr, 64); err == nil && minFirstTimerStr != "" {
			minFirstTimer = v
			hasMinFirstTimer = true
		}
		if v, err := strconv.ParseFloat(maxFirstTimerStr, 64); err == nil && maxFirstTimerStr != "" {
			maxFirstTimer = v
			hasMaxFirstTimer = true
		}

		var minMaintainers float64
		if mv, err := strconv.ParseFloat(minMaintainersStr, 64); err == nil && mv > 0 {
			minMaintainers = mv
		}

		// Backend Gating: page > 1 or trending=true require authentication (Q9, Q10)
		userID, isLoggedIn := c.Get(middleware.UserIDKey)
		if (page > 1 || trendingParam == "true") && (!isLoggedIn || userID == "") {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error":   "authentication_required",
				"message": "Sign in with GitHub to access page 2+ results or trending repositories.",
			})
			return
		}

		hasGoodFirstIssue := strings.ToLower(strings.TrimSpace(c.Query("has_good_first_issue"))) == "true"
		maxActivityDays, _ := strconv.Atoi(strings.TrimSpace(c.Query("max_last_activity_days")))
		excludeStale := strings.ToLower(strings.TrimSpace(c.Query("exclude_stale"))) == "true"
		scoreSource := strings.TrimSpace(c.Query("score_source"))
		excludeFallback := strings.ToLower(strings.TrimSpace(c.Query("exclude_fallback"))) == "true"
		minTier := strings.ToUpper(strings.TrimSpace(c.Query("min_tier")))

		filter := repository.RepoFilter{
			Language:                 lang,
			Tier:                     tierParam,
			MinMergeRate:             minMergeRate,
			MinStars:                 minStars,
			MaxStars:                 maxStars,
			Search:                   name,
			SortBy:                   sortParam,
			Order:                    orderParam,
			Limit:                    perPage,
			Offset:                   offset,
			Trending:                 trendingParam == "true",
			SnapshotDate:             snapshotDateFor(scoredTodayParam == "true"),
			MaxLastActivityDays:      maxActivityDays,
			ExcludeStale:             excludeStale,
			MinFirstTimerSuccessRate: minFirstTimer,
			MaxFirstTimerSuccessRate: maxFirstTimer,
			HasMinFirstTimer:         hasMinFirstTimer,
			HasMaxFirstTimer:         hasMaxFirstTimer,
			HasGoodFirstIssue:        hasGoodFirstIssue,
			Owner:                    strings.TrimSpace(c.Query("owner")),
			Topic:                    strings.TrimSpace(c.Query("topic")),
			MinMaintainers:           minMaintainers,
			ScoreSource:              scoreSource,
			ExcludeFallback:          excludeFallback,
			MinTier:                  minTier,
		}

		repos, total, err := repoStore.List(c.Request.Context(), filter)
		if err != nil {
			slog.Error("list repos: data query failed", "err", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "query failed"})
			return
		}

		if repos == nil {
			repos = []repository.RepoRecord{}
		}

		respPayload := gin.H{
			"data": repos,
			"meta": metaResponse{
				Page:    page,
				PerPage: perPage,
				Total:   total,
			},
		}

		// Cache payload in Valkey for 6 hours & register under tag "get_repos"
		if vk != nil {
			if rawJSON, err := json.Marshal(respPayload); err == nil {
				_ = vk.Do(ctx, vk.B().Set().Key(cacheKey).Value(string(rawJSON)).Ex(apiCacheTTL).Build())
				_ = vk.Do(ctx, vk.B().Sadd().Key("apicache:tag:get_repos").Member(cacheKey).Build())
			}
		}

		c.JSON(http.StatusOK, respPayload)
	}
}

func snapshotDateFor(scoredToday bool) string {
	if !scoredToday {
		return ""
	}

	return time.Now().UTC().Format("2006-01-02")
}

// GetRepo handles GET /api/v1/repos/:id
func GetRepo(repoStore repository.RepoRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		vk := middleware.MustCache(c)
		useCache := strings.ToLower(c.GetHeader("X-Use-Cache")) != "false"
		cacheKey := "apicache:repo:" + id

		ctx := context.Background()

		// Try reading from Valkey cache if useCache is true
		if useCache && vk != nil {
			if cached, err := vk.Do(ctx, vk.B().Get().Key(cacheKey).Build()).ToString(); err == nil && cached != "" {
				slog.Debug("api/v1/repos/:id: cache HIT", "id", id)
				c.Header("X-Cache", "HIT")
				c.Data(http.StatusOK, "application/json; charset=utf-8", []byte(cached))
				return
			}
		}

		c.Header("X-Cache", "MISS")

		repo, err := repoStore.FindByIDOrName(c.Request.Context(), id)
		if err == sql.ErrNoRows || repo == nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "repository not found"})
			return
		} else if err != nil {
			slog.Error("get repo failed", "id", id, "err", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "query failed"})
			return
		}

		// Cache response in Valkey for 6 hours
		if vk != nil {
			if rawJSON, err := json.Marshal(repo); err == nil {
				_ = vk.Do(ctx, vk.B().Set().Key(cacheKey).Value(string(rawJSON)).Ex(apiCacheTTL).Build())
			}
		}

		c.JSON(http.StatusOK, repo)
	}
}

// badgeTierNames maps C-Rank tiers to the human-readable labels shown on the badge.
var badgeTierNames = map[string]string{
	"S": "Super Welcoming",
	"A": "Welcoming",
	"B": "Moderate",
	"C": "Slow Review",
	"D": "Scored",
}

// badgeColors is the hardcoded palette selectable via the ?color= query param.
var badgeColors = map[string]string{
	"emerald": "#059669",
	"green":   "#16a34a",
	"blue":    "#2563eb",
	"purple":  "#7c3aed",
	"pink":    "#db2777",
	"amber":   "#d97706",
	"orange":  "#ea580c",
	"red":     "#dc2626",
	"cyan":    "#0891b2",
	"slate":   "#334155",
	"zinc":    "#52525b",
}

// GetBadgeSVG handles GET /badge/:owner/:repo.svg (F1)
func GetBadgeSVG(repoStore repository.RepoRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		owner := c.Param("owner")
		name := c.Param("repo")
		if before, ok := strings.CutSuffix(name, ".svg"); ok {
			name = before
		}
		fullName := owner + "/" + name

		repo, err := repoStore.FindByIDOrName(c.Request.Context(), fullName)
		tier := "D"
		score := "0.0"
		if err == nil && repo != nil {
			tier = repo.CRankTier
			if repo.CRankScore > 0 {
				score = strconv.FormatFloat(repo.CRankScore, 'f', 1, 64)
			}
		}

		tierName := badgeTierNames[tier]
		if tierName == "" {
			tierName = badgeTierNames["D"]
		}

		color := "#52525b"
		switch tier {
		case "S":
			color = "#059669"
		case "A":
			color = "#2563eb"
		case "B":
			color = "#d97706"
		case "C":
			color = "#dc2626"
		}
		if chosen, ok := badgeColors[c.Query("color")]; ok {
			color = chosen
		}

		// Points (score) are optional and controlled via ?points=1|true.
		showPoints := c.Query("points") == "1" || c.Query("points") == "true"
		rightText := tierName
		if showPoints {
			rightText = fmt.Sprintf("%s (%s)", tierName, score)
		}

		badgeWidth := 220
		rightWidth := 135
		rightTextX := 152.5
		if showPoints {
			badgeWidth = 260
			rightWidth = 175
			rightTextX = 85 + float64(rightWidth)/2
		}

		// Modern high-fidelity badge design (Issue #57)
		svg := fmt.Sprintf(`<svg xmlns="http://www.w3.org/2000/svg" width="%d" height="28" role="img" aria-label="Opendoor C-Rank: %s">
  <title>Opendoor C-Rank: %s</title>
  <defs>
    <linearGradient id="b" x2="0" y2="100%%">
      <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
      <stop offset="1" stop-opacity=".1"/>
    </linearGradient>
    <clipPath id="r">
      <rect width="%d" height="28" rx="6" fill="#fff"/>
    </clipPath>
  </defs>
  <g clip-path="url(#r)">
    <rect width="85" height="28" fill="#18181b"/>
    <rect x="85" width="%d" height="28" fill="%s"/>
    <rect width="%d" height="28" fill="url(#b)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" text-rendering="geometricPrecision" font-size="11">
    <text x="42.5" y="18" font-weight="700" fill="#000" opacity="0.3">opendoor</text>
    <text x="42.5" y="17" font-weight="700" fill="#fff">opendoor</text>
    <text x="%.1f" y="18" font-weight="700" fill="#000" opacity="0.3">%s</text>
    <text x="%.1f" y="17" font-weight="700" fill="#fff">%s</text>
  </g>
</svg>`, badgeWidth, rightText, rightText, badgeWidth, rightWidth, color, badgeWidth, rightTextX, rightText, rightTextX, rightText)

		c.Header("Content-Type", "image/svg+xml")
		c.Header("Cache-Control", "public, max-age=3600, s-maxage=86400")
		c.String(http.StatusOK, svg)
	}
}

// GetRepoHistory handles GET /api/v1/repos/:id/history (F2)
func GetRepoHistory(repoStore repository.RepoRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		repo, err := repoStore.FindByIDOrName(c.Request.Context(), id)
		if err == sql.ErrNoRows || repo == nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "repository not found"})
			return
		}

		history, err := repoStore.GetScoreHistory(c.Request.Context(), repo.ID, 365)
		if err != nil {
			slog.Error("get score history failed", "id", id, "err", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch score history"})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"repository_id": repo.ID,
			"full_name":     repo.FullName,
			"history":       history,
		})
	}
}

// GetRelatedReposHandler handles GET /api/v1/repos/:id/related (Issue #55)
func GetRelatedReposHandler(repoStore repository.RepoRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		if unescaped, err := url.QueryUnescape(id); err == nil {
			id = unescaped
		}
		repo, err := repoStore.FindByIDOrName(c.Request.Context(), id)
		if err == sql.ErrNoRows || repo == nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "repository not found"})
			return
		}

		limit := 3
		if lStr := c.Query("limit"); lStr != "" {
			if l, err := strconv.Atoi(lStr); err == nil && l > 0 && l <= 10 {
				limit = l
			}
		}

		related, err := repoStore.GetRelatedRepos(c.Request.Context(), repo, limit)
		if err != nil {
			slog.Error("get related repos failed", "id", id, "err", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch related repositories"})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"repository_id": repo.ID,
			"full_name":     repo.FullName,
			"language":      repo.Language,
			"related":       related,
		})
	}
}

type PRLikelihoodResponse struct {
	Repository                      string   `json:"repository"`
	CRankTier                       string   `json:"c_rank_tier"`
	OverallAcceptanceRate           *float64 `json:"overall_acceptance_rate"`
	FirstTimerAcceptanceRate        *float64 `json:"first_timer_acceptance_rate"`
	RepeatContributorAcceptanceRate *float64 `json:"repeat_contributor_acceptance_rate"`
	ResponseTimeP50Hours            *float64 `json:"response_time_p50_hours"`
	ResponseTimeP90Hours            *float64 `json:"response_time_p90_hours"`
	MedianTimeToMergeHours          *float64 `json:"median_time_to_merge_hours"`
	BusFactor                       int      `json:"bus_factor"`
	StalenessFlag                   bool     `json:"staleness_flag"`
	CalculatedAt                    *string  `json:"calculated_at"`
}

// GetPRLikelihoodHandler handles GET /api/v1/repos/:id/pr-likelihood or /api/v1/pr-likelihood
func GetPRLikelihoodHandler(repoStore repository.RepoRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		owner := c.Param("owner")
		name := c.Param("name")
		fullName := c.Query("name")

		if id != "" {
			fullName = id
		} else if owner != "" && name != "" {
			fullName = owner + "/" + name
		}

		repo, err := repoStore.FindByIDOrName(c.Request.Context(), fullName)
		if err == sql.ErrNoRows || repo == nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "repository not found"})
			return
		}

		// Set HTTP caching headers (1 hour TTL, 24h stale-while-revalidate)
		c.Header("Cache-Control", "public, max-age=3600, stale-while-revalidate=86400")

		isStale := repo.StalenessFlag || time.Since(repo.UpdatedAt) > 180*24*time.Hour

		var overallRate, firstTimerRate, repeatRate, p50, p90, mergeHours *float64
		if repo.ExternalPRMergeRate > 0 {
			v := repo.ExternalPRMergeRate
			overallRate = &v
		}
		if repo.FirstTimerSuccessRate > 0 {
			v := repo.FirstTimerSuccessRate
			firstTimerRate = &v
		}
		if repo.RepeatContributorRate > 0 {
			v := repo.RepeatContributorRate
			repeatRate = &v
		}
		if repo.ResponseP50Hours > 0 {
			v := repo.ResponseP50Hours
			p50 = &v
		} else if repo.TimeToFirstResponseHours > 0 {
			v := repo.TimeToFirstResponseHours
			p50 = &v
		}
		if repo.ResponseP90Hours > 0 {
			v := repo.ResponseP90Hours
			p90 = &v
		}
		if repo.TimeToMergeHours > 0 {
			v := repo.TimeToMergeHours
			mergeHours = &v
		}

		var calcAt *string
		if repo.SnapshotDate != "" {
			calcAt = &repo.SnapshotDate
		}

		c.JSON(http.StatusOK, PRLikelihoodResponse{
			Repository:                      repo.FullName,
			CRankTier:                       repo.CRankTier,
			OverallAcceptanceRate:           overallRate,
			FirstTimerAcceptanceRate:        firstTimerRate,
			RepeatContributorAcceptanceRate: repeatRate,
			ResponseTimeP50Hours:            p50,
			ResponseTimeP90Hours:            p90,
			MedianTimeToMergeHours:          mergeHours,
			BusFactor:                       repo.BusFactor,
			StalenessFlag:                   isStale,
			CalculatedAt:                    calcAt,
		})
	}
}

// EvaluatePreflightHandler handles POST /api/v1/preflight/evaluate (Story 4.1 & 4.2, GH-83).
// When pr_url is provided, PR metadata and diff stats are auto-fetched from GitHub
// instead of being manually entered in the form.
func EvaluatePreflightHandler(gh *ghclient.Client) gin.HandlerFunc {
	return func(c *gin.Context) {
		var input scoring.PreflightInput
		if err := c.ShouldBindJSON(&input); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid preflight request payload"})
			return
		}

		if input.PRURL != "" {
			owner, name, number, ok := ghclient.ParsePRURL(input.PRURL)
			if !ok {
				c.JSON(http.StatusBadRequest, gin.H{"error": "invalid pull request URL"})
				return
			}
			details, err := gh.FetchPRDetails(owner, name, number)
			if err != nil {
				slog.Error("preflight: auto-fetch PR details failed", "pr_url", input.PRURL, "err", err)
				c.JSON(http.StatusBadGateway, gin.H{"error": "could not fetch pull request data from GitHub"})
				return
			}
			if strings.TrimSpace(input.RepoFullName) == "" {
				input.RepoFullName = owner + "/" + name
			}
			input.PRTitle = details.Title
			input.PRDescription = details.Body
			input.ChangedFiles = details.ChangedFiles
			input.Additions = details.Additions
			input.Deletions = details.Deletions
		}

		result := scoring.EvaluatePreflight(input)
		c.JSON(http.StatusOK, result)
	}
}

// FetchPRDetailsHandler handles POST /api/v1/preflight/pr-details (GH-83).
// It returns PR metadata (title, body, changed files, additions, deletions)
// without performing the heuristic evaluation, so the frontend can auto-populate the form.
func FetchPRDetailsHandler(gh *ghclient.Client) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req struct {
			PRURL string `json:"pr_url" binding:"required"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request payload"})
			return
		}

		owner, name, number, ok := ghclient.ParsePRURL(req.PRURL)
		if !ok {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid pull request URL"})
			return
		}

		details, err := gh.FetchPRDetails(owner, name, number)
		if err != nil {
			slog.Error("preflight: fetch PR details failed", "pr_url", req.PRURL, "err", err)
			c.JSON(http.StatusBadGateway, gin.H{"error": "could not fetch pull request data from GitHub"})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"repo_full_name": owner + "/" + name,
			"pr_title":       details.Title,
			"pr_description": details.Body,
			"changed_files":  details.ChangedFiles,
			"additions":      details.Additions,
			"deletions":      details.Deletions,
		})
	}
}

// GetOptimalTimeHandler handles GET /api/v1/repos/:id/optimal-time and /api/v1/optimal-time (Story 7.1)
func GetOptimalTimeHandler(repoStore repository.RepoRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		owner := c.Param("owner")
		name := c.Param("name")
		fullName := c.Query("name")

		if id != "" {
			fullName = id
		} else if owner != "" && name != "" {
			fullName = owner + "/" + name
		}

		repo, err := repoStore.FindByIDOrName(c.Request.Context(), fullName)
		if err == sql.ErrNoRows || repo == nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "repository not found"})
			return
		}

		c.Header("Cache-Control", "public, max-age=3600, stale-while-revalidate=86400")

		events, err := repoStore.GetMaintainerEvents(c.Request.Context(), repo.ID)
		if err != nil {
			events = []scoring.MaintainerEvent{}
		}

		res := scoring.CalculateOptimalWindow(events)

		c.JSON(http.StatusOK, gin.H{
			"repository":   repo.FullName,
			"optimal_time": res,
		})
	}
}

// GetFitRadarHandler handles GET /api/v1/repos/:id/fit-radar (Story 7.2)
func GetFitRadarHandler(repoStore repository.RepoRepository, profileRepo repository.ContributorProfileRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		owner := c.Param("owner")
		name := c.Param("name")
		fullName := c.Query("name")

		if id != "" {
			fullName = id
		} else if owner != "" && name != "" {
			fullName = owner + "/" + name
		}

		repo, err := repoStore.FindByIDOrName(c.Request.Context(), fullName)
		if err == sql.ErrNoRows || repo == nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "repository not found"})
			return
		}

		// Security: Use private caching if authenticated, public if anonymous
		userIDVal, isAuth := c.Get(middleware.UserIDKey)
		var userLangs []string
		var prSizePref string

		if isAuth {
			c.Header("Cache-Control", "private, no-cache, no-store, must-revalidate")
			userID := userIDVal.(int64)
			if profile, err := profileRepo.GetByUserID(c.Request.Context(), userID); err == nil && profile != nil && profile.DNAJSON != nil {
				var dna pipeline.ContributorDNAResult
				if err := json.Unmarshal([]byte(*profile.DNAJSON), &dna); err == nil {
					userLangs = dna.PrimaryLanguages
					prSizePref = dna.PRSizePreference
				}
			}
		} else {
			c.Header("Cache-Control", "public, max-age=3600, stale-while-revalidate=86400")
		}

		radar := scoring.CalculateFitRadar(scoring.FitRadarInput{
			RepoLanguage:        repo.Language,
			RepoOnboardingScore: repo.OnboardingScore,
			FirstTimerRate:      repo.FirstTimerSuccessRate,
			ResponseP50Hours:    repo.ResponseP50Hours,
			ExternalMergeRate:   repo.ExternalPRMergeRate,
			UserPrimaryLangs:    userLangs,
			UserPRSizePref:      prSizePref,
		})

		c.JSON(http.StatusOK, gin.H{
			"repository": repo.FullName,
			"fit_radar":  radar,
		})
	}
}
