package handler_test

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/abhisheksoni27/opendoor/internal/handler"
	"github.com/gin-gonic/gin"
	"github.com/jmoiron/sqlx"
	_ "modernc.org/sqlite"
)

func setupLanguagesTestDB(t *testing.T) *sqlx.DB {
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
	`
	database.MustExec(schema)
	database.MustExec("INSERT INTO repositories (id, full_name, language) VALUES ('1', 'golang/go', 'Go')")
	database.MustExec("INSERT INTO repositories (id, full_name, language) VALUES ('2', 'facebook/react', 'TypeScript')")
	database.MustExec("INSERT INTO repositories (id, full_name, language) VALUES ('3', 'vuejs/vue', 'TypeScript')")
	database.MustExec("INSERT INTO repositories (id, full_name, language) VALUES ('4', 'python/cpython', 'Python')")
	return database
}

func TestListLanguages(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupLanguagesTestDB(t)
	defer db.Close()

	r := gin.New()
	r.GET("/api/v1/languages", handler.ListLanguages(db))

	req, _ := http.NewRequest(http.MethodGet, "/api/v1/languages", nil)
	w := httptest.NewRecorder()

	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d: %s", w.Code, w.Body.String())
	}

	var resp struct {
		Languages []string `json:"languages"`
	}
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("failed to unmarshal JSON: %v", err)
	}

	if len(resp.Languages) != 3 {
		t.Fatalf("expected 3 languages, got %d", len(resp.Languages))
	}

	// TypeScript has 2 repos, so it should be first
	if resp.Languages[0] != "TypeScript" {
		t.Fatalf("expected TypeScript first (most repos), got %s", resp.Languages[0])
	}
}
