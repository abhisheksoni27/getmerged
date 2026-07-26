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
	"strconv"
	"strings"
	"time"

	"github.com/abhisheksoni27/opendoor/internal/middleware"
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
	IssueTriageSpeedHours       float64 `json:"issue_triage_speed_hours"`
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
//	@Param        order     query  string  false  "Sort order (asc, desc)"
//	@Param        page      query  int     false  "Page number (default 1)"
//	@Param        per_page  query  int     false  "Items per page (default 20, max 100)"
//	@Success      200       {object}  map[string]any
//	@Failure      500       {object}  map[string]string
//	@Router       /api/v1/repos [get]
func ListRepos(c *gin.Context) {
	db := middleware.MustDB(c)
	if db == nil {
		return
	}

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
	lang := strings.TrimSpace(c.Query("language"))
	name := strings.TrimSpace(c.Query("name"))
	minStarsStr := strings.TrimSpace(c.Query("min_stars"))
	maxStarsStr := strings.TrimSpace(c.Query("max_stars"))
	sortParam := strings.TrimSpace(c.Query("sort"))
	orderParam := strings.TrimSpace(strings.ToLower(c.Query("order")))
	pageStr := strings.TrimSpace(c.Query("page"))
	perPageStr := strings.TrimSpace(c.Query("per_page"))

	page := 1
	if p, err := strconv.Atoi(pageStr); err == nil && p > 0 {
		page = p
	}
	perPage := 20
	if pp, err := strconv.Atoi(perPageStr); err == nil && pp > 0 {
		perPage = pp
	}
	if perPage > 100 {
		perPage = 100
	}
	offset := (page - 1) * perPage

	// Build dynamic WHERE clause - filter out D tier / 0 score repos that don't welcome contributors
	whereParts := []string{"s.c_rank_score > 0", "s.c_rank_tier != 'D'"}
	args := []any{}

	if lang != "" {
		whereParts = append(whereParts, "LOWER(r.language) = LOWER(?)")
		args = append(args, lang)
	}
	if name != "" {
		whereParts = append(whereParts, "LOWER(r.full_name) LIKE LOWER(?)")
		args = append(args, "%"+name+"%")
	}
	if minStarsStr != "" {
		if ms, err := strconv.Atoi(minStarsStr); err == nil {
			whereParts = append(whereParts, "r.stars >= ?")
			args = append(args, ms)
		}
	}
	if maxStarsStr != "" {
		if maxs, err := strconv.Atoi(maxStarsStr); err == nil {
			whereParts = append(whereParts, "r.stars <= ?")
			args = append(args, maxs)
		}
	}

	tierParam := strings.ToUpper(strings.TrimSpace(c.Query("tier")))
	if tierParam != "" {
		whereParts = append(whereParts, "UPPER(s.c_rank_tier) = ?")
		args = append(args, tierParam)
	}

	trendingParam := strings.TrimSpace(c.Query("trending"))
	if trendingParam == "true" || trendingParam == "1" {
		whereParts = append(whereParts, "r.is_trending = TRUE")
	}

	where := strings.Join(whereParts, " AND ")

	// Validate sort column
	sortCol, ok := allowedSortFields[sortParam]
	if !ok {
		sortCol = "s.c_rank_score"
	}
	order := "DESC"
	if orderParam == "asc" {
		order = "ASC"
	}

	// 1. Total count query
	countQuery := fmt.Sprintf(`
		SELECT COUNT(1)
		FROM repositories r
		INNER JOIN daily_snapshots s ON s.repository_id = r.id
		  AND s.snapshot_date = (
		    SELECT MAX(s2.snapshot_date) FROM daily_snapshots s2 WHERE s2.repository_id = r.id
		  )
		WHERE %s
	`, where)

	var total int
	if err := db.Get(&total, countQuery, args...); err != nil {
		slog.Error("list repos: count query failed", "err", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "query failed"})
		return
	}

	// 2. Data query
	dataQuery := fmt.Sprintf(`
		SELECT
			r.id, r.full_name, COALESCE(r.language,'') as language, r.stars,
			COALESCE(r.description,'') as description, r.github_url,
			COALESCE(s.c_rank_tier,'D') as c_rank_tier,
			COALESCE(s.c_rank_score,0) as c_rank_score,
			COALESCE(s.external_pr_merge_rate,0) as external_pr_merge_rate,
			COALESCE(s.time_to_first_response_hours,0) as time_to_first_response_hours,
			COALESCE(s.time_to_merge_hours,0) as time_to_merge_hours,
			COALESCE(s.first_timer_success_rate,0) as first_timer_success_rate,
			COALESCE(s.repeat_contributor_rate,0) as repeat_contributor_rate,
			COALESCE(s.issue_triage_speed_hours,0) as issue_triage_speed_hours,
			COALESCE(s.maintainer_responsiveness,0) as maintainer_responsiveness,
			COALESCE(s.last_activity_days,180) as last_activity_days,
			COALESCE(s.review_rounds,0) as review_rounds,
			COALESCE(s.distinct_maintainer_count,0) as distinct_maintainer_count,
			COALESCE(s.staleness_flag,0) as staleness_flag,
			COALESCE(s.snapshot_date,'') as snapshot_date
		FROM repositories r
		INNER JOIN daily_snapshots s ON s.repository_id = r.id
		  AND s.snapshot_date = (
		    SELECT MAX(s2.snapshot_date) FROM daily_snapshots s2 WHERE s2.repository_id = r.id
		  )
		WHERE %s
		ORDER BY %s %s
		LIMIT ? OFFSET ?
	`, where, sortCol, order)

	pageArgs := append(args, perPage, offset)
	rows, err := db.Query(dataQuery, pageArgs...)
	if err != nil {
		slog.Error("list repos: data query failed", "err", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "query failed"})
		return
	}
	defer rows.Close()

	repos := make([]repoResponse, 0)
	for rows.Next() {
		var r repoResponse
		var staleInt int
		if err := rows.Scan(
			&r.ID, &r.FullName, &r.Language, &r.Stars,
			&r.Description, &r.GithubURL,
			&r.CRankTier, &r.CRankScore,
			&r.ExternalPRMergeRate, &r.TimeToFirstResponseHours,
			&r.TimeToMergeHours, &r.FirstTimerSuccessRate,
			&r.RepeatContributorRate, &r.IssueTriageSpeedHours,
			&r.MaintainerResponsiveness, &r.LastActivityDays,
			&r.ReviewRounds, &r.DistinctMaintainerCount, &staleInt,
			&r.SnapshotDate,
		); err != nil {
			slog.Error("list repos: scan failed", "err", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "scan failed"})
			return
		}
		r.StalenessFlag = staleInt == 1
		repos = append(repos, r)
	}

	respPayload := gin.H{
		"data": repos,
		"meta": metaResponse{
			Page:    page,
			PerPage: perPage,
			Total:   total,
		},
	}

	// Cache payload in Valkey for 6 hours
	if vk != nil {
		if rawJSON, err := json.Marshal(respPayload); err == nil {
			_ = vk.Do(ctx, vk.B().Set().Key(cacheKey).Value(string(rawJSON)).Ex(apiCacheTTL).Build())
		}
	}

	c.JSON(http.StatusOK, respPayload)
}

// GetRepo handles GET /api/v1/repos/:id
//
//	@Summary      Get repository details
//	@Description  Returns details and latest C-Rank score for a single repository.
//	@Tags         repos
//	@Produce      json
//	@Param        id   path      string  true  "Repository ID"
//	@Success      200  {object}  repoResponse
//	@Failure      404  {object}  map[string]string
//	@Failure      500  {object}  map[string]string
//	@Router       /api/v1/repos/{id} [get]
func GetRepo(c *gin.Context) {
	id := c.Param("id")
	db := middleware.MustDB(c)
	if db == nil {
		return
	}

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

	row := db.QueryRow(`
		SELECT
			r.id, r.full_name, COALESCE(r.language,'') as language, r.stars,
			COALESCE(r.description,'') as description, r.github_url,
			COALESCE(s.c_rank_tier,'D') as c_rank_tier,
			COALESCE(s.c_rank_score,0) as c_rank_score,
			COALESCE(s.external_pr_merge_rate,0) as external_pr_merge_rate,
			COALESCE(s.time_to_first_response_hours,0) as time_to_first_response_hours,
			COALESCE(s.time_to_merge_hours,0) as time_to_merge_hours,
			COALESCE(s.first_timer_success_rate,0) as first_timer_success_rate,
			COALESCE(s.repeat_contributor_rate,0) as repeat_contributor_rate,
			COALESCE(s.issue_triage_speed_hours,0) as issue_triage_speed_hours,
			COALESCE(s.maintainer_responsiveness,0) as maintainer_responsiveness,
			COALESCE(s.last_activity_days,180) as last_activity_days,
			COALESCE(s.review_rounds,0) as review_rounds,
			COALESCE(s.distinct_maintainer_count,0) as distinct_maintainer_count,
			COALESCE(s.staleness_flag,0) as staleness_flag,
			COALESCE(s.snapshot_date,'') as snapshot_date
		FROM repositories r
		LEFT JOIN daily_snapshots s ON s.repository_id = r.id
		  AND s.snapshot_date = (
		    SELECT MAX(s2.snapshot_date) FROM daily_snapshots s2 WHERE s2.repository_id = r.id
		  )
		WHERE r.id = ?
	`, id)

	var r repoResponse
	var staleInt int
	err := row.Scan(
		&r.ID, &r.FullName, &r.Language, &r.Stars,
		&r.Description, &r.GithubURL,
		&r.CRankTier, &r.CRankScore,
		&r.ExternalPRMergeRate, &r.TimeToFirstResponseHours,
		&r.TimeToMergeHours, &r.FirstTimerSuccessRate,
		&r.RepeatContributorRate, &r.IssueTriageSpeedHours,
		&r.MaintainerResponsiveness, &r.LastActivityDays,
		&r.ReviewRounds, &r.DistinctMaintainerCount, &staleInt,
		&r.SnapshotDate,
	)
	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"error": "repository not found"})
		return
	} else if err != nil {
		slog.Error("get repo failed", "id", id, "err", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "query failed"})
		return
	}

	r.StalenessFlag = staleInt == 1

	// Cache response in Valkey for 6 hours
	if vk != nil {
		if rawJSON, err := json.Marshal(r); err == nil {
			_ = vk.Do(ctx, vk.B().Set().Key(cacheKey).Value(string(rawJSON)).Ex(apiCacheTTL).Build())
		}
	}

	c.JSON(http.StatusOK, r)
}
