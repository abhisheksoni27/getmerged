package handler_test

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/abhisheksoni27/opendoor/internal/db"
	"github.com/abhisheksoni27/opendoor/internal/handler"
	"github.com/abhisheksoni27/opendoor/internal/middleware"
	"github.com/abhisheksoni27/opendoor/internal/repository"
	"github.com/gin-gonic/gin"
	"github.com/jmoiron/sqlx"
	_ "modernc.org/sqlite"
)

func setupRepoTestDB(t *testing.T) *sqlx.DB {
	t.Helper()
	database, err := sqlx.Open("sqlite", ":memory:")
	if err != nil {
		t.Fatalf("failed to open memory db: %v", err)
	}

	if err := db.AutoMigrate(database); err != nil {
		t.Fatalf("failed to auto migrate db: %v", err)
	}

	extraSchema := `
	CREATE TABLE IF NOT EXISTS repositories (
		id TEXT PRIMARY KEY,
		full_name TEXT NOT NULL,
		owner TEXT NOT NULL,
		name TEXT NOT NULL,
		language TEXT,
		stars INTEGER DEFAULT 0,
		description TEXT,
		github_url TEXT,
		updated_at DATETIME NOT NULL
	);

	CREATE TABLE IF NOT EXISTS daily_snapshots (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		repository_id TEXT NOT NULL,
		snapshot_date TEXT NOT NULL,
		c_rank_tier TEXT,
		c_rank_score REAL,
		external_pr_merge_rate REAL,
		time_to_first_response_hours REAL,
		time_to_merge_hours REAL,
		first_timer_success_rate REAL,
		repeat_contributor_rate REAL,
		maintainer_responsiveness REAL,
		last_activity_days REAL,
		review_rounds REAL,
		distinct_maintainer_count REAL,
			bus_factor INTEGER DEFAULT 0,
		staleness_flag INTEGER DEFAULT 0,
		created_at DATETIME NOT NULL
	);
	`
	database.MustExec(extraSchema)

	repoUUID := "c30791ab-4160-40c6-b232-bb71c61d3249"
	now := time.Now()
	database.MustExec(`INSERT INTO repositories (id, full_name, owner, name, language, stars, description, github_url, updated_at) VALUES (?, 'freeCodeCamp/freeCodeCamp', 'freeCodeCamp', 'freeCodeCamp', 'TypeScript', 450000, 'Learn to code', 'https://github.com/freeCodeCamp/freeCodeCamp', ?)`, repoUUID, now)
	database.MustExec(`INSERT INTO daily_snapshots (repository_id, snapshot_date, c_rank_tier, c_rank_score, created_at) VALUES (?, '2026-07-26', 'S', 95.5, ?)`, repoUUID, now)

	return database
}

func setupBadgeTestDB(t *testing.T) *sqlx.DB {
	t.Helper()
	database, err := sqlx.Open("sqlite", ":memory:")
	if err != nil {
		t.Fatalf("failed to open memory db: %v", err)
	}

	schema := `
	CREATE TABLE repositories (
		id TEXT PRIMARY KEY,
		full_name TEXT NOT NULL,
		owner TEXT NOT NULL,
		name TEXT NOT NULL,
		language TEXT,
		stars INTEGER DEFAULT 0,
		description TEXT,
		github_url TEXT,
		updated_at DATETIME NOT NULL
	);

	CREATE TABLE latest_snapshots (
		repository_id TEXT NOT NULL,
		snapshot_date TEXT NOT NULL,
		c_rank_tier TEXT,
		c_rank_score REAL,
		external_pr_merge_rate REAL DEFAULT 0,
		time_to_first_response_hours REAL DEFAULT 0,
		time_to_merge_hours REAL DEFAULT 0,
		first_timer_success_rate REAL DEFAULT 0,
		repeat_contributor_rate REAL DEFAULT 0,
		maintainer_responsiveness REAL DEFAULT 0,
		last_activity_days REAL DEFAULT 0,
		review_rounds REAL DEFAULT 0,
		distinct_maintainer_count REAL DEFAULT 0,
			bus_factor INTEGER DEFAULT 0,
		staleness_flag INTEGER DEFAULT 0,
		good_first_issue_count INTEGER DEFAULT 0,
		onboarding_score INTEGER DEFAULT 0,
		response_p50_hours REAL DEFAULT 0,
		response_p90_hours REAL DEFAULT 0,
		pr_count_6m INTEGER DEFAULT 0,
		issue_count_6m INTEGER DEFAULT 0,
		updated_at DATETIME NOT NULL
	);

	CREATE TABLE IF NOT EXISTS repo_pr_comments (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		repository_id TEXT NOT NULL,
		pr_number INTEGER NOT NULL,
		source_type TEXT NOT NULL,
		author_login TEXT NOT NULL,
		author_association TEXT NOT NULL,
		comment_text TEXT NOT NULL,
		created_at DATETIME NOT NULL
	);
	`
	database.MustExec(schema)

	return database
}

func TestGetRepo_UUID(t *testing.T) {
	database := setupTestDB(t)
	defer database.Close()

	repoStore := repository.NewRepoRepository(database)

	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.Use(middleware.DB(database))
	r.GET("/api/v1/repos/:id", handler.GetRepo(repoStore))

	repoUUID := "c30791ab-4160-40c6-b232-bb71c61d3249"

	req := httptest.NewRequest("GET", "/api/v1/repos/"+repoUUID, nil)
	w := httptest.NewRecorder()

	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200 OK on GetRepo, got %d: %s", w.Code, w.Body.String())
	}

	var res map[string]interface{}
	if err := json.Unmarshal(w.Body.Bytes(), &res); err != nil {
		t.Fatalf("unmarshal error: %v", err)
	}

	if res["id"] != repoUUID {
		t.Fatalf("expected repo id %s, got %v", repoUUID, res["id"])
	}
}

func TestListRepos_BackendGating(t *testing.T) {
	gin.SetMode(gin.TestMode)
	database := setupRepoTestDB(t)
	defer database.Close()

	repoStore := repository.NewRepoRepository(database)

	r := gin.New()
	r.Use(middleware.DB(database))
	r.Use(middleware.OptionalUserAuth("test_secret"))
	r.GET("/api/v1/repos", handler.ListRepos(repoStore))

	// Test page > 1 without auth -> 401 Unauthorized
	reqPage2 := httptest.NewRequest("GET", "/api/v1/repos?page=2", nil)
	wPage2 := httptest.NewRecorder()
	r.ServeHTTP(wPage2, reqPage2)

	if wPage2.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401 Unauthorized for page 2 without auth, got %d", wPage2.Code)
	}

	// Test trending=true without auth -> 401 Unauthorized
	reqTrending := httptest.NewRequest("GET", "/api/v1/repos?trending=true", nil)
	wTrending := httptest.NewRecorder()
	r.ServeHTTP(wTrending, reqTrending)

	if wTrending.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401 Unauthorized for trending without auth, got %d", wTrending.Code)
	}

	// Test page=1 without auth -> 200 OK
	reqPage1 := httptest.NewRequest("GET", "/api/v1/repos?page=1", nil)
	wPage1 := httptest.NewRecorder()
	r.ServeHTTP(wPage1, reqPage1)

	if wPage1.Code != http.StatusOK {
		t.Fatalf("expected 200 OK for page 1 without auth, got %d", wPage1.Code)
	}
}

func TestGetBadgeSVG(t *testing.T) {
	gin.SetMode(gin.TestMode)
	database := setupBadgeTestDB(t)
	defer database.Close()

	database.MustExec(`INSERT INTO repositories (id, full_name, owner, name, language, stars, description, github_url, updated_at) VALUES ('badge-repo', 'gin-gonic/gin', 'gin-gonic', 'gin', 'Go', 0, '', '', ?)`, time.Now())
	database.MustExec(`INSERT INTO latest_snapshots (repository_id, snapshot_date, c_rank_tier, c_rank_score, updated_at) VALUES ('badge-repo', '2026-01-01', 'S', 99.0, ?)`, time.Now())

	repoStore := repository.NewRepoRepository(database)

	r := gin.New()
	r.GET("/badge/:owner/:repo", handler.GetBadgeSVG(repoStore))

	req := httptest.NewRequest("GET", "/badge/gin-gonic/gin.svg", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200 OK for badge SVG, got %d", w.Code)
	}

	if contentType := w.Header().Get("Content-Type"); contentType != "image/svg+xml" {
		t.Fatalf("expected Content-Type image/svg+xml, got %s", contentType)
	}

	body := w.Body.String()
	if !strings.Contains(body, "<svg") || !strings.Contains(body, "Opendoor") {
		t.Fatalf("unexpected badge SVG content: %s", body)
	}
}

func TestGetBadgeSVGQueryParams(t *testing.T) {
	gin.SetMode(gin.TestMode)
	database := setupBadgeTestDB(t)
	defer database.Close()

	database.MustExec(`INSERT INTO repositories (id, full_name, owner, name, language, stars, description, github_url, updated_at) VALUES ('badge-repo', 'gin-gonic/gin', 'gin-gonic', 'gin', 'Go', 0, '', '', ?)`, time.Now())
	database.MustExec(`INSERT INTO latest_snapshots (repository_id, snapshot_date, c_rank_tier, c_rank_score, updated_at) VALUES ('badge-repo', '2026-01-01', 'S', 99.0, ?)`, time.Now())

	repoStore := repository.NewRepoRepository(database)

	r := gin.New()
	r.GET("/badge/:owner/:repo", handler.GetBadgeSVG(repoStore))

	cases := []struct {
		name       string
		path       string
		wantText   string
		wantAbsent string
	}{
		{
			name:       "points shown when requested",
			path:       "/badge/gin-gonic/gin.svg?points=1",
			wantText:   "Super Welcoming (99.0)",
			wantAbsent: "A Tier",
		},
		{
			name:       "points omitted by default",
			path:       "/badge/gin-gonic/gin.svg",
			wantText:   "Super Welcoming",
			wantAbsent: "·",
		},
		{
			name:     "custom color applied",
			path:     "/badge/gin-gonic/gin.svg?color=purple",
			wantText: "#7c3aed",
		},
		{
			name:       "unknown color falls back to tier color",
			path:       "/badge/gin-gonic/gin.svg?color=nope",
			wantText:   "#059669",
			wantAbsent: "#nope",
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			req := httptest.NewRequest("GET", tc.path, nil)
			w := httptest.NewRecorder()
			r.ServeHTTP(w, req)

			if w.Code != http.StatusOK {
				t.Fatalf("expected 200 OK, got %d", w.Code)
			}

			body := w.Body.String()
			if tc.wantText != "" && !strings.Contains(body, tc.wantText) {
				t.Fatalf("expected body to contain %q, got: %s", tc.wantText, body)
			}
			if tc.wantAbsent != "" && strings.Contains(body, tc.wantAbsent) {
				t.Fatalf("expected body NOT to contain %q, got: %s", tc.wantAbsent, body)
			}
		})
	}
}

func TestGetRelatedReposHandler(t *testing.T) {
	gin.SetMode(gin.TestMode)
	database := setupTestDB(t)
	defer database.Close()

	repoStore := repository.NewRepoRepository(database)

	database.MustExec(`INSERT INTO repositories (id, full_name, owner, name, language, stars, updated_at) VALUES ('rel-1', 'gin-gonic/gin', 'gin-gonic', 'gin', 'Go', 75000, ?)`, time.Now())
	database.MustExec(`INSERT INTO latest_snapshots (repository_id, snapshot_date, c_rank_tier, c_rank_score) VALUES ('rel-1', '2026-01-01', 'S', 95.0)`)

	database.MustExec(`INSERT INTO repositories (id, full_name, owner, name, language, stars, updated_at) VALUES ('rel-2', 'gofiber/fiber', 'gofiber', 'fiber', 'Go', 35000, ?)`, time.Now())
	database.MustExec(`INSERT INTO latest_snapshots (repository_id, snapshot_date, c_rank_tier, c_rank_score) VALUES ('rel-2', '2026-01-01', 'S', 92.0)`)

	r := gin.New()
	r.GET("/api/v1/repos/*id", func(c *gin.Context) {
		if strings.HasSuffix(c.Param("id"), "/related") {
			c.Params = gin.Params{gin.Param{Key: "id", Value: strings.TrimSuffix(strings.TrimPrefix(c.Param("id"), "/"), "/related")}}
			handler.GetRelatedReposHandler(repoStore)(c)
			return
		}
	})

	req := httptest.NewRequest("GET", "/api/v1/repos/gin-gonic/gin/related", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200 OK for related repos endpoint, got %d", w.Code)
	}

	body := w.Body.String()
	if !strings.Contains(body, "gofiber/fiber") {
		t.Fatalf("expected related repos body to contain 'gofiber/fiber', got: %s", body)
	}
}

func TestGetPRLikelihoodHandler(t *testing.T) {
	gin.SetMode(gin.TestMode)
	database := setupBadgeTestDB(t)
	defer database.Close()

	repoStore := repository.NewRepoRepository(database)

	database.MustExec(`INSERT INTO repositories (id, full_name, owner, name, language, stars, updated_at) VALUES ('pr-1', 'facebook/react', 'facebook', 'react', 'JavaScript', 220000, ?)`, time.Now())
	database.MustExec(`INSERT INTO latest_snapshots (repository_id, snapshot_date, c_rank_tier, c_rank_score, external_pr_merge_rate, first_timer_success_rate, response_p50_hours, response_p90_hours, time_to_merge_hours, distinct_maintainer_count, updated_at) VALUES ('pr-1', '2026-08-17', 'S', 98.0, 85.0, 75.0, 3.5, 18.0, 48.0, 12, ?)`, time.Now())

	r := gin.New()
	r.GET("/api/v1/repos/:owner/:name/pr-likelihood", handler.GetPRLikelihoodHandler(repoStore))

	req := httptest.NewRequest("GET", "/api/v1/repos/facebook/react/pr-likelihood", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200 OK, got %d", w.Code)
	}

	if cacheHeader := w.Header().Get("Cache-Control"); !strings.Contains(cacheHeader, "public, max-age=3600") {
		t.Fatalf("expected Cache-Control header, got %s", cacheHeader)
	}

	var resp handler.PRLikelihoodResponse
	if err := json.NewDecoder(w.Body).Decode(&resp); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	if resp.Repository != "facebook/react" || resp.CRankTier != "S" {
		t.Fatalf("unexpected response payload: %+v", resp)
	}
	if resp.OverallAcceptanceRate == nil || *resp.OverallAcceptanceRate != 85.0 {
		t.Fatalf("expected overall acceptance rate 85.0, got %v", resp.OverallAcceptanceRate)
	}
	if resp.ResponseTimeP50Hours == nil || *resp.ResponseTimeP50Hours != 3.5 {
		t.Fatalf("expected p50 3.5, got %v", resp.ResponseTimeP50Hours)
	}
}

func TestGetOptimalTimeHandler(t *testing.T) {
	gin.SetMode(gin.TestMode)
	database := setupBadgeTestDB(t)
	defer database.Close()

	repoStore := repository.NewRepoRepository(database)

	database.MustExec(`INSERT INTO repositories (id, full_name, owner, name, language, stars, updated_at) VALUES ('opt-1', 'facebook/react', 'facebook', 'react', 'JavaScript', 220000, ?)`, time.Now())
	database.MustExec(`INSERT INTO repositories (id, full_name, owner, name, language, stars, updated_at) VALUES ('opt-2', 'vuejs/core', 'vuejs', 'core', 'TypeScript', 45000, ?)`, time.Now())

	// Seed maintainer comments for facebook/react: maintainer active at 17:00 UTC on Tuesday (e.g., 2026-08-18 17:00:00 UTC)
	for i := 0; i < 10; i++ {
		tVal := time.Date(2026, 8, 18, 17, i, 0, 0, time.UTC)
		database.MustExec(`INSERT INTO repo_pr_comments (repository_id, pr_number, source_type, author_login, author_association, comment_text, created_at) VALUES ('opt-1', ?, 'issue_comment', 'gaearon', 'MEMBER', 'LGTM', ?)`, i+1, tVal)
	}

	// Seed maintainer comments for vuejs/core: maintainer active at 09:00 UTC on Wednesday (e.g., 2026-08-19 09:00:00 UTC)
	for i := 0; i < 15; i++ {
		tVal := time.Date(2026, 8, 19, 9, i, 0, 0, time.UTC)
		database.MustExec(`INSERT INTO repo_pr_comments (repository_id, pr_number, source_type, author_login, author_association, comment_text, created_at) VALUES ('opt-2', ?, 'issue_comment', 'yyx990803', 'OWNER', 'Thanks', ?)`, i+1, tVal)
	}

	r := gin.New()
	r.GET("/api/v1/optimal-time", handler.GetOptimalTimeHandler(repoStore))
	r.GET("/api/v1/repos/:id/optimal-time", handler.GetOptimalTimeHandler(repoStore))

	t.Run("by query param name with distinct repo heatmaps", func(t *testing.T) {
		reqReact := httptest.NewRequest("GET", "/api/v1/optimal-time?name=facebook/react", nil)
		wReact := httptest.NewRecorder()
		r.ServeHTTP(wReact, reqReact)

		if wReact.Code != http.StatusOK {
			t.Fatalf("expected 200 OK, got %d", wReact.Code)
		}

		if cacheHeader := wReact.Header().Get("Cache-Control"); !strings.Contains(cacheHeader, "public, max-age=3600") {
			t.Fatalf("expected Cache-Control header, got %s", cacheHeader)
		}

		var payloadReact struct {
			Repository  string `json:"repository"`
			OptimalTime struct {
				PrimaryStartHourUTC   int         `json:"primary_start_hour_utc"`
				PrimaryEndHourUTC     int         `json:"primary_end_hour_utc"`
				PeakHourUTC           int         `json:"peak_hour_utc"`
				ActiveMaintainerCount int         `json:"active_maintainer_count"`
				HourlyHeatmap         [24]float64 `json:"hourly_heatmap"`
				RecommendedDayWindow  string      `json:"recommended_day_window"`
				ConfidenceScore       float64     `json:"confidence_score"`
			} `json:"optimal_time"`
		}

		if err := json.NewDecoder(wReact.Body).Decode(&payloadReact); err != nil {
			t.Fatalf("failed to decode response: %v", err)
		}

		if payloadReact.Repository != "facebook/react" {
			t.Fatalf("expected facebook/react, got %s", payloadReact.Repository)
		}
		if payloadReact.OptimalTime.PeakHourUTC != 17 {
			t.Fatalf("expected peak hour 17 for react, got %d", payloadReact.OptimalTime.PeakHourUTC)
		}
		if payloadReact.OptimalTime.ActiveMaintainerCount != 1 {
			t.Fatalf("expected 1 active maintainer for react, got %d", payloadReact.OptimalTime.ActiveMaintainerCount)
		}

		// Now query vuejs/core by ID
		reqVue := httptest.NewRequest("GET", "/api/v1/repos/opt-2/optimal-time", nil)
		wVue := httptest.NewRecorder()
		r.ServeHTTP(wVue, reqVue)

		if wVue.Code != http.StatusOK {
			t.Fatalf("expected 200 OK, got %d", wVue.Code)
		}

		var payloadVue struct {
			Repository  string `json:"repository"`
			OptimalTime struct {
				PrimaryStartHourUTC   int         `json:"primary_start_hour_utc"`
				PrimaryEndHourUTC     int         `json:"primary_end_hour_utc"`
				PeakHourUTC           int         `json:"peak_hour_utc"`
				ActiveMaintainerCount int         `json:"active_maintainer_count"`
				HourlyHeatmap         [24]float64 `json:"hourly_heatmap"`
				RecommendedDayWindow  string      `json:"recommended_day_window"`
				ConfidenceScore       float64     `json:"confidence_score"`
			} `json:"optimal_time"`
		}

		if err := json.NewDecoder(wVue.Body).Decode(&payloadVue); err != nil {
			t.Fatalf("failed to decode response: %v", err)
		}

		if payloadVue.OptimalTime.PeakHourUTC != 9 {
			t.Fatalf("expected peak hour 9 for vue, got %d", payloadVue.OptimalTime.PeakHourUTC)
		}
		if payloadVue.OptimalTime.PeakHourUTC == payloadReact.OptimalTime.PeakHourUTC {
			t.Fatalf("expected different peak hours for react and vue")
		}
	})

	t.Run("empty events fallback", func(t *testing.T) {
		database.MustExec(`INSERT INTO repositories (id, full_name, owner, name, language, stars, updated_at) VALUES ('empty-repo', 'org/empty', 'org', 'empty', 'Go', 10, ?)`, time.Now())

		req := httptest.NewRequest("GET", "/api/v1/optimal-time?name=org/empty", nil)
		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)

		if w.Code != http.StatusOK {
			t.Fatalf("expected 200 OK, got %d", w.Code)
		}

		var payload struct {
			Repository  string `json:"repository"`
			OptimalTime struct {
				ActiveMaintainerCount int     `json:"active_maintainer_count"`
				ConfidenceScore       float64 `json:"confidence_score"`
			} `json:"optimal_time"`
		}
		if err := json.NewDecoder(w.Body).Decode(&payload); err != nil {
			t.Fatalf("failed to decode response: %v", err)
		}

		if payload.OptimalTime.ConfidenceScore != 0.0 {
			t.Fatalf("expected 0.0 confidence, got %v", payload.OptimalTime.ConfidenceScore)
		}
		if payload.OptimalTime.ActiveMaintainerCount != 0 {
			t.Fatalf("expected 0 maintainers, got %d", payload.OptimalTime.ActiveMaintainerCount)
		}
	})

	t.Run("not found", func(t *testing.T) {
		req := httptest.NewRequest("GET", "/api/v1/optimal-time?name=nonexistent/repo", nil)
		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)

		if w.Code != http.StatusNotFound {
			t.Fatalf("expected 404 Not Found, got %d", w.Code)
		}
	})
}

func TestGetRepoHistory_Contract(t *testing.T) {
	gin.SetMode(gin.TestMode)
	database := setupRepoTestDB(t)
	defer database.Close()

	repoStore := repository.NewRepoRepository(database)

	r := gin.New()
	r.GET("/api/v1/repos/:id/history", handler.GetRepoHistory(repoStore))

	repoUUID := "c30791ab-4160-40c6-b232-bb71c61d3249"

	req := httptest.NewRequest("GET", "/api/v1/repos/"+repoUUID+"/history", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200 OK for GetRepoHistory, got %d: %s", w.Code, w.Body.String())
	}

	var resp struct {
		RepositoryID string `json:"repository_id"`
		FullName     string `json:"full_name"`
		History      []struct {
			SnapshotDate string  `json:"snapshot_date"`
			CRankScore   float64 `json:"c_rank_score"`
			CRankTier    string  `json:"c_rank_tier"`
		} `json:"history"`
	}

	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("failed to unmarshal history response: %v", err)
	}

	if resp.RepositoryID != repoUUID || resp.FullName != "freeCodeCamp/freeCodeCamp" {
		t.Fatalf("unexpected repo info in history response: %+v", resp)
	}

	if len(resp.History) != 1 || resp.History[0].CRankTier != "S" {
		t.Fatalf("expected 1 history snapshot with tier S, got %+v", resp.History)
	}
}

