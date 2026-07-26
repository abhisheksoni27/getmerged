package handler_test

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/abhisheksoni27/opendoor/internal/db"
	"github.com/abhisheksoni27/opendoor/internal/handler"
	"github.com/abhisheksoni27/opendoor/internal/middleware"
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
		issue_triage_speed_hours REAL,
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

	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.Use(middleware.DB(database))
	r.GET("/api/v1/repos/:id", handler.GetRepo)

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
