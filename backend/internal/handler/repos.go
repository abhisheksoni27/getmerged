package handler

import (
	"context"
	"crypto/md5"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"log/slog"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/abhisheksoni27/opendoor/internal/middleware"
	"github.com/abhisheksoni27/opendoor/internal/repository"
	"github.com/gin-gonic/gin"
)

const apiCacheTTL = 6 * time.Hour

// repoResponse is the shape returned to API consumers.
type repoResponse struct {
	ID                          string  `json:"id"`
	FullName                    string  `json:"full_name"`
	Language                    string  `json:"language"`
	Stars                       int     `json:"stars"`
	Description                 string  `json:"description"`
	GithubURL                   string  `json:"github_url"`
	CRankTier                   string  `json:"c_rank_tier"`
	CRankScore                  float64 `json:"c_rank_score"`
	ExternalPRMergeRate         float64 `json:"external_pr_merge_rate"`
	TimeToFirstResponseHours    float64 `json:"time_to_first_response_hours"`
	TimeToMergeHours            float64 `json:"time_to_merge_hours"`
	FirstTimerSuccessRate       float64 `json:"first_timer_success_rate"`
	RepeatContributorRate       float64 `json:"repeat_contributor_rate"`
	MaintainerResponsiveness    float64 `json:"maintainer_responsiveness"`
	LastActivityDays            float64 `json:"last_activity_days"`
	ReviewRounds                float64 `json:"review_rounds"`
	DistinctMaintainerCount     float64 `json:"distinct_maintainer_count"`
	StalenessFlag               bool    `json:"staleness_flag"`
	SnapshotDate                string  `json:"snapshot_date"`
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
		minStarsStr := strings.TrimSpace(c.Query("min_stars"))
		maxStarsStr := strings.TrimSpace(c.Query("max_stars"))

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

		filter := repository.RepoFilter{
			Language:     lang,
			Tier:         tierParam,
			MinMergeRate: minMergeRate,
			MinStars:     minStars,
			MaxStars:     maxStars,
			Search:       name,
			SortBy:       sortParam,
			Order:        orderParam,
			Limit:        perPage,
			Offset:       offset,
			Trending:     trendingParam == "true",
		}

		repos, total, err := repoStore.List(c.Request.Context(), filter)
		if err != nil {
			slog.Error("list repos: data query failed", "err", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "query failed"})
			return
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
