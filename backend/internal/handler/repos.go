package handler

import (
	"crypto/md5"
	"database/sql"
	"fmt"
	"log/slog"
	"net/http"
	"strings"

	"github.com/abhisheksoni27/opendoor/internal/middleware"
	"github.com/gin-gonic/gin"
)

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
//	@Param        sort_by   query  string  false  "Sort field: c_rank_score|stars|time_to_first_response_hours"  default(c_rank_score)
//	@Param        order     query  string  false  "Sort direction: asc|desc"                                     default(desc)
//	@Param        page      query  int     false  "Page number"                                                  default(1)
//	@Param        per_page  query  int     false  "Results per page (max 100)"                                   default(20)
//	@Success      200  {object}  map[string]any
//	@Failure      400  {object}  map[string]string
//	@Failure      500  {object}  map[string]string
//	@Router       /api/v1/repos [get]
func ListRepos(c *gin.Context) {
	db := middleware.MustDB(c)
	if db == nil {
		return
	}

	// --- Parse & validate query params ---
	language := strings.TrimSpace(c.Query("language"))
	name := strings.TrimSpace(c.Query("name"))
	minStars := queryInt(c, "min_stars", 0)
	page := queryInt(c, "page", 1)
	perPage := queryInt(c, "per_page", 20)
	sortBy := c.DefaultQuery("sort_by", "c_rank_score")
	order := strings.ToLower(c.DefaultQuery("order", "desc"))

	if page < 1 {
		page = 1
	}
	if perPage < 1 || perPage > 100 {
		perPage = 20
	}
	if order != "asc" && order != "desc" {
		order = "desc"
	}

	sortCol, ok := allowedSortFields[sortBy]
	if !ok {
		sortCol = "s.c_rank_score"
	}

	// --- Build WHERE clause ---
	var (
		conditions []string
		args       []any
	)

	if language != "" {
		conditions = append(conditions, "r.language = ?")
		args = append(args, language)
	}
	if minStars > 0 {
		conditions = append(conditions, "r.stars >= ?")
		args = append(args, minStars)
	}
	if name != "" {
		conditions = append(conditions, "r.name LIKE ?")
		args = append(args, "%"+name+"%")
	}

	where := ""
	if len(conditions) > 0 {
		where = "WHERE " + strings.Join(conditions, " AND ")
	}

	// --- Count total ---
	countQuery := fmt.Sprintf(`
		SELECT COUNT(*) FROM repositories r
		INNER JOIN daily_snapshots s ON s.repository_id = r.id
		  AND s.snapshot_date = (
		    SELECT MAX(s2.snapshot_date) FROM daily_snapshots s2 WHERE s2.repository_id = r.id
		  )
		%s
	`, where)

	var total int
	if err := db.QueryRow(countQuery, args...).Scan(&total); err != nil {
		slog.Error("list repos: count query failed", "err", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "count failed"})
		return
	}

	// --- Fetch page ---
	offset := (page - 1) * perPage
	//nolint:gosec // sortCol and order are validated against allowlists above
	dataQuery := fmt.Sprintf(`
		SELECT
			r.id, r.full_name, COALESCE(r.language,'') as language, r.stars,
			COALESCE(r.description,'') as description, r.github_url,
			COALESCE(s.c_rank_tier,'') as c_rank_tier,
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
		%s
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

	// ETag from content hash
	etag := fmt.Sprintf(`"%x"`, md5.Sum([]byte(fmt.Sprintf("%v%d%d", repos, page, perPage))))
	if c.GetHeader("If-None-Match") == etag {
		c.Status(http.StatusNotModified)
		return
	}
	c.Header("ETag", etag)
	c.Header("Cache-Control", "public, max-age=60")

	c.JSON(http.StatusOK, gin.H{
		"data": repos,
		"meta": metaResponse{Page: page, PerPage: perPage, Total: total},
	})
}

// GetRepo handles GET /api/v1/repos/:id
//
//	@Summary      Get repository
//	@Description  Returns a single repository with its latest C-Rank snapshot.
//	@Tags         repos
//	@Produce      json
//	@Param        id  path  string  true  "Repository UUID"
//	@Success      200  {object}  repoResponse
//	@Failure      404  {object}  map[string]string
//	@Router       /api/v1/repos/{id} [get]
func GetRepo(c *gin.Context) {
	db := middleware.MustDB(c)
	if db == nil {
		return
	}

	id := c.Param("id")
	row := db.QueryRow(`
		SELECT
			r.id, r.full_name, COALESCE(r.language,'') as language, r.stars,
			COALESCE(r.description,'') as description, r.github_url,
			COALESCE(s.c_rank_tier,'') as c_rank_tier,
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
		c.JSON(http.StatusNotFound, gin.H{"error": "repo not found"})
		return
	}
	if err != nil {
		slog.Error("get repo: query failed", "id", id, "err", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "query failed"})
		return
	}
	r.StalenessFlag = staleInt == 1
	c.JSON(http.StatusOK, r)
}

// queryInt reads a query parameter as int with a fallback default.
func queryInt(c *gin.Context, key string, def int) int {
	v := c.Query(key)
	if v == "" {
		return def
	}
	n := 0
	fmt.Sscanf(v, "%d", &n)
	if n == 0 {
		return def
	}
	return n
}
