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

func TestGetRepo_UUID(t *testing.T) {
	database := setupRepoTestDB(t)
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
	database := setupTestDB(t)
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
	database := setupTestDB(t)
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
	database := setupTestDB(t)
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
			wantText:   "Super Welcoming · 99.0",
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


