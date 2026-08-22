package handler_test

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
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

func setupTestDB(t *testing.T) *sqlx.DB {
	t.Helper()
	database, err := sqlx.Open("sqlite", ":memory:")
	if err != nil {
		t.Fatalf("failed to open memory db: %v", err)
	}

	if err := db.AutoMigrate(database); err != nil {
		t.Fatalf("failed to auto migrate db: %v", err)
	}

	// Extra table for repositories & snapshots
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

	// Seed user and repository
	database.MustExec(`INSERT INTO users (id, github_id, username, created_at, updated_at) VALUES (1, 100, 'testuser', ?, ?)`, time.Now(), time.Now())
	database.MustExec(`INSERT INTO repositories (id, full_name, owner, name, language, stars, description, github_url, updated_at) VALUES ('c30791ab-4160-40c6-b232-bb71c61d3249', 'freeCodeCamp/freeCodeCamp', 'freeCodeCamp', 'freeCodeCamp', 'TypeScript', 450000, 'Learn to code', 'https://github.com/freeCodeCamp/freeCodeCamp', ?)`, time.Now())

	return database
}

func setupTestEngine(database *sqlx.DB, userID int64) *gin.Engine {
	watchlistRepo := repository.NewWatchlistRepository(database)

	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.Use(middleware.DB(database))
	r.Use(func(c *gin.Context) {
		if userID > 0 {
			c.Set(middleware.UserIDKey, userID)
		}
		c.Next()
	})

	r.POST("/api/v1/user/watchlist", handler.AddToWatchlist(watchlistRepo))
	r.GET("/api/v1/user/watchlist", handler.ListWatchlist(watchlistRepo))
	r.DELETE("/api/v1/user/watchlist/:id", handler.RemoveFromWatchlist(watchlistRepo))

	return r
}

func TestWatchlistEndpoints_UUIDRepoID(t *testing.T) {
	database := setupTestDB(t)
	defer database.Close()

	r := setupTestEngine(database, 1)

	repoUUID := "c30791ab-4160-40c6-b232-bb71c61d3249"

	// 1. Test POST /api/v1/user/watchlist with UUID string repo_id
	body, _ := json.Marshal(map[string]string{"repo_id": repoUUID})
	req := httptest.NewRequest("POST", "/api/v1/user/watchlist", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200 OK on AddToWatchlist, got %d: %s", w.Code, w.Body.String())
	}

	// 2. Test GET /api/v1/user/watchlist
	reqGet := httptest.NewRequest("GET", "/api/v1/user/watchlist", nil)
	wGet := httptest.NewRecorder()

	r.ServeHTTP(wGet, reqGet)

	if wGet.Code != http.StatusOK {
		t.Fatalf("expected 200 OK on ListWatchlist, got %d: %s", wGet.Code, wGet.Body.String())
	}

	var listResp struct {
		Watchlist []string `json:"watchlist"`
	}
	if err := json.Unmarshal(wGet.Body.Bytes(), &listResp); err != nil {
		t.Fatalf("failed to unmarshal watchlist response: %v", err)
	}

	if len(listResp.Watchlist) != 1 || listResp.Watchlist[0] != repoUUID {
		t.Fatalf("expected 1 item with repo_id %s, got %+v", repoUUID, listResp.Watchlist)
	}

	// 3. Test DELETE /api/v1/user/watchlist/:id with UUID string
	reqDel := httptest.NewRequest("DELETE", "/api/v1/user/watchlist/"+repoUUID, nil)
	wDel := httptest.NewRecorder()

	r.ServeHTTP(wDel, reqDel)

	if wDel.Code != http.StatusOK {
		t.Fatalf("expected 200 OK on RemoveFromWatchlist, got %d: %s", wDel.Code, wDel.Body.String())
	}
}
