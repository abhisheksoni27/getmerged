package handler

import (
	"context"
	"crypto/md5"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"log/slog"
	"net/http"
	"net/url"
	"regexp"
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
//	@Param        min_tier  query  string  false  "Minimum C-Rank tier floor (S, A, B, C, D); keeps tiers at or above"
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

		searchQuery := strings.TrimSpace(c.Query("search"))
		fullNameQuery := ""
		if name != "" {
			if strings.Contains(name, "/") {
				fullNameQuery = name
			} else if searchQuery == "" {
				searchQuery = name
			}
		}

		filter := repository.RepoFilter{
			Language:                 lang,
			Tier:                     tierParam,
			MinMergeRate:             minMergeRate,
			MinStars:                 minStars,
			MaxStars:                 maxStars,
			Search:                   searchQuery,
			FullName:                 fullNameQuery,
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

// cRankReportBaseURL is the single source-of-truth deep-dive report link
// constant (AC4). Every badge renders an anchor to
// cRankReportBaseURL + "/" + owner + "/" + repo.
const cRankReportBaseURL = "https://opendoor.app/r"

// badgeSlugRe validates owner/repo path segments before any store access or
// URL building (AC5). Matches ^[A-Za-z0-9_.-]+$ with a 2-39 char length bound.
var badgeSlugRe = regexp.MustCompile(`^[A-Za-z0-9_.-]{2,39}$`)

// GetBadgeSVG handles GET /badge/:owner/:repo (AC1..AC9).
// GetBadgeSVG handles GET /badge/:owner/:repo (AC1..AC9). It serves a
// shields.io-style SVG badge showing the live C-Rank grade and welcoming
// score. The owner/repo slug is validated before any store access or URL
// building (AC5/AC8). Unknown or not-yet-computed repos return a styled 404
// 'C-Rank: unknown' SVG (AC2); a down/timed-out C-Rank store degrades to a
// 'C-Rank: N/A' SVG with HTTP 200 and gray fill, never a 5xx (AC3). The
// embedded badge link points at the public deep-dive report and is built only
// from the validated, RFC3986-encoded slug (AC4).
//
// NOTE (AC9): GitHub camo proxies and caches this SVG for ~24h by design. To
// force a refresh, maintainers append ?v=<crank_version_hash>, which changes
// the requested URL (and therefore camo's cache key) without altering
// rendering. This route makes no no-store auto-refresh claim.
func GetBadgeSVG(repoStore repository.RepoRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		owner := c.Param("owner")
		name := c.Param("repo")
		if before, ok := strings.CutSuffix(name, ".svg"); ok {
			name = before
		}

		// AC5: reject malformed slugs up-front with 400 + the styled 404 SVG.
		if !badgeSlugRe.MatchString(owner) || !badgeSlugRe.MatchString(name) {
			writeBadgeSVG(c, http.StatusBadRequest, "C-Rank", "unknown", badgeTierColors["unranked"], "")
			return
		}
		slug := strings.ToLower(owner) + "/" + strings.ToLower(name)

		// AC3: bound the store call so a hung C-Rank store degrades to N/A < 2s.
		ctx, cancel := context.WithTimeout(c.Request.Context(), 2*time.Second)
		defer cancel()

		repo, err := repoStore.FindByIDOrName(ctx, slug)
		if err != nil && err != sql.ErrNoRows {
			// AC3: store down/timeout -> degraded gray N/A SVG, HTTP 200.
			writeBadgeSVG(c, http.StatusOK, "C-Rank", "N/A", badgeTierColors["unranked"], "")
			return
		}

		// AC2: unknown repo or null/not-yet-computed C-Rank -> 404 SVG.
		if repo == nil || !repo.IsScored {
			writeBadgeSVG(c, http.StatusNotFound, "C-Rank", "unknown", badgeTierColors["unranked"], "")
			return
		}

		color := badgeTierColors[repo.CRankTier]
		if color == "" {
			color = badgeTierColors["unranked"]
		}
		scoreStr := strconv.FormatFloat(repo.CRankScore, 'f', 0, 64)
		message := repo.CRankTier + " " + scoreStr // e.g. "A 87" (AC1)

		// AC4: deep-dive link built only from the validated, encoded slug.
		reportURL := cRankReportBaseURL + "/" + url.PathEscape(strings.ToLower(owner)) + "/" + url.PathEscape(strings.ToLower(name))
		writeBadgeSVG(c, http.StatusOK, "C-Rank", message, color, reportURL)
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

// GetRepoTrend handles GET /api/v1/repos/:id/trend or /api/v1/repos/:owner/:name/trend?days=90
func GetRepoTrend(repoStore repository.RepoRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		owner := c.Param("owner")
		name := c.Param("name")
		if owner != "" && name != "" {
			id = owner + "/" + name
		}
		if unescaped, err := url.QueryUnescape(id); err == nil && unescaped != "" {
			id = unescaped
		}
		repo, err := repoStore.FindByIDOrName(c.Request.Context(), id)
		if err == sql.ErrNoRows || repo == nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "repository not found"})
			return
		}

		days := 90
		if dStr := c.Query("days"); dStr != "" {
			if d, err := strconv.Atoi(dStr); err == nil && d > 0 && d <= 365 {
				days = d
			}
		}

		trend, err := repoStore.GetScoreHistory(c.Request.Context(), repo.ID, days)
		if err != nil {
			slog.Error("get trend failed", "id", id, "err", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch trend"})
			return
		}
		if trend == nil {
			trend = []repository.SnapshotRecord{}
		}

		c.Header("Cache-Control", "public, max-age=3600, s-maxage=86400")
		c.JSON(http.StatusOK, gin.H{
			"repository_id": repo.ID,
			"full_name":     repo.FullName,
			"language":      repo.Language,
			"days":          days,
			"trend":         trend,
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

		res := scoring.CalculateOptimalWindow(events, repo.FullName)

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

// ScoreDisputeRequest holds payload for disputing a repo score
type ScoreDisputeRequest struct {
	RepoFullName   string `json:"repo_full_name" binding:"required"`
	Email          string `json:"email"`
	GithubUsername string `json:"github_username"`
	Reason         string `json:"reason" binding:"required"`
	Details        string `json:"details" binding:"required"`
	EvidenceURL    string `json:"evidence_url"`
}

// SubmitScoreDisputeHandler handles POST /api/v1/disputes
func SubmitScoreDisputeHandler(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req ScoreDisputeRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid dispute request: repo_full_name, reason, and details are required"})
			return
		}

		cleanRepo := strings.TrimSpace(req.RepoFullName)
		if strings.HasPrefix(cleanRepo, "https://github.com/") {
			cleanRepo = strings.TrimPrefix(cleanRepo, "https://github.com/")
		}
		cleanRepo = strings.TrimSuffix(cleanRepo, "/")

		query := `
			INSERT INTO score_disputes (repo_full_name, email, github_username, reason, details, evidence_url, status)
			VALUES (?, ?, ?, ?, ?, ?, 'pending')
		`
		res, err := db.ExecContext(c.Request.Context(), query, cleanRepo, req.Email, req.GithubUsername, req.Reason, req.Details, req.EvidenceURL)
		if err != nil {
			slog.Error("failed to record score dispute", "error", err, "repo", cleanRepo)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not record dispute"})
			return
		}

		insertID, _ := res.LastInsertId()
		c.JSON(http.StatusAccepted, gin.H{
			"status":     "received",
			"dispute_id": insertID,
			"sla":        "48 hours",
			"message":    "Dispute logged successfully. Our maintainer integrity team reviews all disputes within 48 hours.",
		})
	}
}

// PublicListDisputesHandler handles GET /api/v1/disputes/changelog
func PublicListDisputesHandler(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		rows, err := db.QueryContext(c.Request.Context(), `
			SELECT id, repo_full_name, reason, status, created_at, updated_at
			FROM score_disputes
			ORDER BY created_at DESC
			LIMIT 50
		`)
		if err != nil {
			c.JSON(http.StatusOK, gin.H{"disputes": []any{}})
			return
		}
		defer rows.Close()

		type DisputeItem struct {
			ID           int    `json:"id"`
			RepoFullName string `json:"repo_full_name"`
			Reason       string `json:"reason"`
			Status       string `json:"status"`
			CreatedAt    string `json:"created_at"`
			UpdatedAt    string `json:"updated_at"`
		}

		var items []DisputeItem
		for rows.Next() {
			var it DisputeItem
			var created, updated time.Time
			if err := rows.Scan(&it.ID, &it.RepoFullName, &it.Reason, &it.Status, &created, &updated); err == nil {
				it.CreatedAt = created.Format(time.RFC3339)
				it.UpdatedAt = updated.Format(time.RFC3339)
				items = append(items, it)
			}
		}

		c.JSON(http.StatusOK, gin.H{"disputes": items})
	}
}
