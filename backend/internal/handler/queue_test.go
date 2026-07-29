package handler_test

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/abhisheksoni27/opendoor/internal/handler"
	"github.com/gin-gonic/gin"
	"github.com/jmoiron/sqlx"
	_ "modernc.org/sqlite"
)

func setupQueueTestDB(t *testing.T) *sqlx.DB {
	t.Helper()
	database, err := sqlx.Open("sqlite", ":memory:")
	if err != nil {
		t.Fatalf("failed to open memory db: %v", err)
	}

	schema := `
	CREATE TABLE IF NOT EXISTS repositories (
		id TEXT PRIMARY KEY,
		full_name TEXT NOT NULL
	);

	CREATE TABLE IF NOT EXISTS indexing_queue (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		full_name TEXT UNIQUE NOT NULL,
		owner TEXT NOT NULL,
		name TEXT NOT NULL,
		requested_by_user_id INTEGER,
		status TEXT NOT NULL DEFAULT 'pending',
		created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
		processed_at DATETIME
	);
	`
	database.MustExec(schema)
	return database
}

func TestRequestRepoIndexing_Success(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupQueueTestDB(t)
	defer db.Close()

	r := gin.New()
	r.POST("/api/v1/repos/queue", handler.RequestRepoIndexing(db))

	body := map[string]string{
		"owner": "facebook",
		"name":  "react",
	}
	jsonBody, _ := json.Marshal(body)

	req, _ := http.NewRequest(http.MethodPost, "/api/v1/repos/queue", bytes.NewBuffer(jsonBody))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	r.ServeHTTP(w, req)

	if w.Code != http.StatusAccepted {
		t.Fatalf("expected status 202, got %d: %s", w.Code, w.Body.String())
	}

	var count int
	_ = db.Get(&count, "SELECT COUNT(1) FROM indexing_queue WHERE full_name = 'facebook/react' AND status = 'pending'")
	if count != 1 {
		t.Fatalf("expected 1 item in indexing_queue, got %d", count)
	}
}

func TestRequestRepoIndexing_AlreadyIndexed(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupQueueTestDB(t)
	defer db.Close()

	db.MustExec("INSERT INTO repositories (id, full_name) VALUES ('r1', 'golang/go')")

	r := gin.New()
	r.POST("/api/v1/repos/queue", handler.RequestRepoIndexing(db))

	body := map[string]string{
		"owner": "golang",
		"name":  "go",
	}
	jsonBody, _ := json.Marshal(body)

	req, _ := http.NewRequest(http.MethodPost, "/api/v1/repos/queue", bytes.NewBuffer(jsonBody))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d: %s", w.Code, w.Body.String())
	}
}
