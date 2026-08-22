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
	"github.com/abhisheksoni27/opendoor/internal/repository"
	"github.com/gin-gonic/gin"
	"github.com/jmoiron/sqlx"
	_ "modernc.org/sqlite"
)

func setupAIInsightsTestDB(t *testing.T) *sqlx.DB {
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

	CREATE TABLE IF NOT EXISTS latest_snapshots (
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
		updated_at DATETIME NOT NULL
	);

	CREATE TABLE IF NOT EXISTS repo_ai_insights (
		repo_id TEXT PRIMARY KEY,
		maintainer_vibe TEXT,
		pr_guidelines TEXT,
		issue_quality_score REAL DEFAULT 0,
		raw_summary TEXT,
		warmth_score REAL DEFAULT 7.5,
		patience_score REAL DEFAULT 8.0,
		nitpick_ratio REAL DEFAULT 0.25,
		maintainer_persona TEXT DEFAULT 'Encouraging Technical Mentor',
		dos_json TEXT DEFAULT '[]',
		donts_json TEXT DEFAULT '[]',
		deep_sections_json TEXT,
		updated_at DATETIME NOT NULL
	);
	`
	database.MustExec(extraSchema)

	database.MustExec(`INSERT INTO repositories (id, full_name, owner, name, language, stars, description, github_url, updated_at) VALUES ('ai-test-repo', 'facebook/react', 'facebook', 'react', 'JavaScript', 220000, 'A JavaScript library', 'https://github.com/facebook/react', ?)`, time.Now())

	database.MustExec(`INSERT INTO repo_ai_insights (repo_id, maintainer_vibe, pr_guidelines, issue_quality_score, raw_summary, warmth_score, patience_score, nitpick_ratio, maintainer_persona, dos_json, donts_json, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		"ai-test-repo",
		"Professional and technical reviewers",
		`["Focus on performance improvements","Ensure test coverage","Follow the style guide"]`,
		8.5,
		"React maintainers are highly professional and technical.",
		8.2,
		7.5,
		0.15,
		"Technical Expert",
		`["Include benchmarks for perf changes","Write unit tests","Keep PRs focused"]`,
		`["Don't mix formatting with logic changes","Avoid large PRs","Don't skip CI"]`,
		time.Now(),
	)

	return database
}

func TestGetRepoInsights_Unauthenticated(t *testing.T) {
	database := setupAIInsightsTestDB(t)
	defer database.Close()

	aiRepo := repository.NewAIRepository(database)
	repoStore := repository.NewRepoRepository(database)

	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.Use(middleware.OptionalUserAuth("test_secret"))
	r.GET("/api/v1/repos/:id/insights", handler.GetRepoInsights(nil, aiRepo, repoStore))

	req := httptest.NewRequest("GET", "/api/v1/repos/ai-test-repo/insights", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200 OK for unauthenticated insights request, got %d: %s", w.Code, w.Body.String())
	}

	var resp struct {
		Insights struct {
			RepoID            string   `json:"repo_id"`
			MaintainerPersona string   `json:"maintainer_persona"`
			WarmthScore       float64  `json:"warmth_score"`
			PatienceScore     float64  `json:"patience_score"`
			NitpickRatio      float64  `json:"nitpick_ratio"`
			TopDos            []string `json:"top_dos"`
			TopDonts          []string `json:"top_donts"`
			PRGuidelines      []string `json:"pr_guidelines"`
		} `json:"insights"`
	}

	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("failed to unmarshal response: %v", err)
	}

	if resp.Insights.RepoID != "ai-test-repo" {
		t.Fatalf("expected repo_id 'ai-test-repo', got %q", resp.Insights.RepoID)
	}
	if resp.Insights.MaintainerPersona != "Technical Expert" {
		t.Fatalf("expected maintainer_persona 'Technical Expert', got %q", resp.Insights.MaintainerPersona)
	}
	if resp.Insights.WarmthScore != 8.2 {
		t.Fatalf("expected warmth_score 8.2, got %v", resp.Insights.WarmthScore)
	}
	if len(resp.Insights.TopDos) != 3 {
		t.Fatalf("expected 3 do items, got %d", len(resp.Insights.TopDos))
	}
	if len(resp.Insights.TopDonts) != 3 {
		t.Fatalf("expected 3 dont items, got %d", len(resp.Insights.TopDonts))
	}
	if len(resp.Insights.PRGuidelines) != 3 {
		t.Fatalf("expected 3 pr_guidelines, got %d", len(resp.Insights.PRGuidelines))
	}
}
