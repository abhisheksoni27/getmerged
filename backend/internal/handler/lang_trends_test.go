package handler_test

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/abhisheksoni27/opendoor/internal/handler"
	"github.com/gin-gonic/gin"
	"github.com/jmoiron/sqlx"
	_ "modernc.org/sqlite"
)

func setupLangDeltaTestDB(t *testing.T) *sqlx.DB {
	t.Helper()
	database, err := sqlx.Open("sqlite", ":memory:")
	if err != nil {
		t.Fatalf("failed to open memory db: %v", err)
	}

	schema := `
	CREATE TABLE IF NOT EXISTS repositories (
		id TEXT PRIMARY KEY,
		full_name TEXT NOT NULL,
		language TEXT
	);

	CREATE TABLE IF NOT EXISTS daily_snapshots (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		repository_id TEXT NOT NULL,
		snapshot_date TEXT NOT NULL,
		c_rank_tier TEXT,
		c_rank_score REAL,
		created_at DATETIME NOT NULL
	);
	`
	database.MustExec(schema)

	now := time.Now()
	repos := map[string]string{"1": "Go", "2": "TypeScript", "3": "TypeScript"}
	for repoID, lang := range repos {
		database.MustExec(`INSERT INTO repositories (id, full_name, language) VALUES (?, ?, ?)`, repoID, "owner/"+repoID, lang)
	}
	// Go: avg 80 -> 90 (rising); TypeScript: avg 85 -> 75 (falling)
	database.MustExec(`INSERT INTO daily_snapshots (repository_id, snapshot_date, c_rank_tier, c_rank_score, created_at) VALUES ('1', '2026-08-10', 'A', 80.0, ?)`, now)
	database.MustExec(`INSERT INTO daily_snapshots (repository_id, snapshot_date, c_rank_tier, c_rank_score, created_at) VALUES ('1', '2026-08-17', 'S', 90.0, ?)`, now)
	database.MustExec(`INSERT INTO daily_snapshots (repository_id, snapshot_date, c_rank_tier, c_rank_score, created_at) VALUES ('2', '2026-08-10', 'S', 88.0, ?)`, now)
	database.MustExec(`INSERT INTO daily_snapshots (repository_id, snapshot_date, c_rank_tier, c_rank_score, created_at) VALUES ('2', '2026-08-17', 'A', 78.0, ?)`, now)
	database.MustExec(`INSERT INTO daily_snapshots (repository_id, snapshot_date, c_rank_tier, c_rank_score, created_at) VALUES ('3', '2026-08-10', 'A', 82.0, ?)`, now)
	database.MustExec(`INSERT INTO daily_snapshots (repository_id, snapshot_date, c_rank_tier, c_rank_score, created_at) VALUES ('3', '2026-08-17', 'B', 72.0, ?)`, now)

	return database
}

func TestGetLanguageTrends_Contract(t *testing.T) {
	gin.SetMode(gin.TestMode)
	database := setupLangDeltaTestDB(t)
	defer database.Close()

	r := gin.New()
	r.GET("/api/v1/languages/trends", handler.GetLanguageTrends(database))

	req := httptest.NewRequest(http.MethodGet, "/api/v1/languages/trends?weeks=1", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200 OK, got %d: %s", w.Code, w.Body.String())
	}

	var resp struct {
		Weeks int `json:"weeks"`
		Trend []struct {
			Language    string   `json:"language"`
			RepoCount   int      `json:"repo_count"`
			ScoreStart  *float64 `json:"score_start"`
			ScoreEnd    *float64 `json:"score_end"`
			ScoreChange *float64 `json:"score_change"`
		} `json:"trends"`
	}
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("unmarshal error: %v", err)
	}

	if resp.Weeks != 1 {
		t.Fatalf("expected weeks=1 echoed, got %d", resp.Weeks)
	}
	if len(resp.Trend) != 2 {
		t.Fatalf("expected 2 languages, got %d: %+v", len(resp.Trend), resp.Trend)
	}

	byLang := map[string]struct {
		Start, End, Change float64
	}{}
	for _, lt := range resp.Trend {
		if lt.ScoreStart == nil || lt.ScoreEnd == nil || lt.ScoreChange == nil {
			t.Fatalf("expected non-nil scores for %s", lt.Language)
		}
		byLang[lt.Language] = struct{ Start, End, Change float64 }{*lt.ScoreStart, *lt.ScoreEnd, *lt.ScoreChange}
	}

	goTrend, ok := byLang["Go"]
	if !ok || goTrend.Start != 80.0 || goTrend.End != 90.0 || goTrend.Change != 10.0 {
		t.Fatalf("unexpected Go trend: %+v", goTrend)
	}

	tsTrend, ok := byLang["TypeScript"]
	if !ok || tsTrend.Change != -10.0 {
		t.Fatalf("unexpected TypeScript trend: %+v", tsTrend)
	}

	// Sorted descending by score_change: Go first.
	if resp.Trend[0].Language != "Go" {
		t.Fatalf("expected Go (rising) sorted first, got %+v", resp.Trend[0])
	}
}

func TestGetLanguageTrends_DefaultWeeks(t *testing.T) {
	gin.SetMode(gin.TestMode)
	database := setupLangDeltaTestDB(t)
	defer database.Close()

	r := gin.New()
	r.GET("/api/v1/languages/trends", handler.GetLanguageTrends(database))

	req := httptest.NewRequest(http.MethodGet, "/api/v1/languages/trends", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	var resp struct {
		Weeks int `json:"weeks"`
	}
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("unmarshal error: %v", err)
	}
	if resp.Weeks != 4 {
		t.Fatalf("expected default weeks=4, got %d", resp.Weeks)
	}
}
