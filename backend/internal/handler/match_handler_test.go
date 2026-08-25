package handler_test

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/abhisheksoni27/opendoor/internal/handler"
	"github.com/abhisheksoni27/opendoor/internal/repository"
	"github.com/gin-gonic/gin"
	"github.com/jmoiron/sqlx"
	_ "modernc.org/sqlite"
)

func setupMatchTestDB(t *testing.T) *sqlx.DB {
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
		repository_id TEXT PRIMARY KEY,
		snapshot_date TEXT NOT NULL,
		c_rank_tier TEXT,
		c_rank_score REAL DEFAULT 0,
		score_source TEXT DEFAULT 'computed',
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
	`
	database.MustExec(schema)

	now := time.Now()
	repos := []struct {
		id, fullName, lang string
		firstTimer         float64
		gfi                int
	}{
		{"r1", "acme/rocket-go", "Go", 85, 7},
		{"r2", "acme/partial-go", "Go", 40, 2},
		{"r3", "acme/rusty", "Rust", 90, 5},
	}
	for _, r := range repos {
		database.MustExec(
			`INSERT INTO repositories (id, full_name, owner, name, language, stars, description, github_url, updated_at)
			 VALUES (?, ?, 'acme', 'repo', ?, 100, 'desc', 'https://github.com/'+?, ?)`,
			r.id, r.fullName, r.lang, r.fullName, now,
		)
		database.MustExec(
			`INSERT INTO latest_snapshots (repository_id, snapshot_date, c_rank_tier, c_rank_score,
			 external_pr_merge_rate, first_timer_success_rate, good_first_issue_count, onboarding_score,
			 response_p50_hours, updated_at)
			 VALUES (?, '2026-08-22', 'A', 88.0, 80.0, ?, ?, 75.0, 4.0, ?)`,
			r.id, r.firstTimer, r.gfi, now,
		)
	}

	return database
}

func newMatchRouter(database *sqlx.DB) *gin.Engine {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	store := repository.NewRepoRepository(database)
	r.GET("/api/v1/match", handler.MatchReposHandler(store))
	return r
}

func matchResponse(t *testing.T, w *httptest.ResponseRecorder) []map[string]interface{} {
	t.Helper()
	var payload struct {
		Data []map[string]interface{} `json:"data"`
	}
	if err := json.Unmarshal(w.Body.Bytes(), &payload); err != nil {
		t.Fatalf("bad json: %v — %s", err, w.Body.String())
	}
	return payload.Data
}

func TestMatchReposHandler(t *testing.T) {
	tests := []struct {
		name       string
		query      string
		wantStatus int
		wantCount  int
	}{
		{name: "filters by single language", query: "?languages=go&limit=10", wantStatus: http.StatusOK, wantCount: 2},
		{name: "matches any of multiple languages", query: "?languages=go,rust&limit=10", wantStatus: http.StatusOK, wantCount: 3},
		{name: "respects limit", query: "?languages=go,rust&limit=1", wantStatus: http.StatusOK, wantCount: 1},
		{name: "no matches yields empty data", query: "?languages=cobol", wantStatus: http.StatusOK, wantCount: 0},
		{name: "missing languages is bad request", query: "", wantStatus: http.StatusBadRequest},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			router := newMatchRouter(setupMatchTestDB(t))
			w := httptest.NewRecorder()
			router.ServeHTTP(w, httptest.NewRequest(http.MethodGet, "/api/v1/match"+tt.query, nil))

			if w.Code != tt.wantStatus {
				t.Fatalf("status = %d, want %d — %s", w.Code, tt.wantStatus, w.Body.String())
			}
			if tt.wantStatus != http.StatusOK {
				return
			}
			data := matchResponse(t, w)
			if len(data) != tt.wantCount {
				t.Fatalf("got %d results, want %d", len(data), tt.wantCount)
			}
		})
	}
}

func TestMatchReposHandlerSortsByMatchScoreDesc(t *testing.T) {
	router := newMatchRouter(setupMatchTestDB(t))
	w := httptest.NewRecorder()
	router.ServeHTTP(w, httptest.NewRequest(http.MethodGet, "/api/v1/match?languages=go&level=beginner", nil))

	data := matchResponse(t, w)
	if len(data) < 2 {
		t.Fatal("expected at least two go repos")
	}
	first, _ := data[0]["match_score"].(float64)
	second, _ := data[1]["match_score"].(float64)
	if first < second {
		t.Errorf("results not sorted desc: %.2f then %.2f", first, second)
	}
	if data[0]["full_name"] != "acme/rocket-go" {
		t.Errorf("best beginner repo = %v, want acme/rocket-go", data[0]["full_name"])
	}
	for key, want := range map[string]bool{"match_score": true, "reasons": true} {
		if _, ok := data[0][key]; !ok && want {
			t.Errorf("response missing %q", key)
		}
	}
}
