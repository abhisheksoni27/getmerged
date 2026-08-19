package handler_test

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/abhisheksoni27/opendoor/internal/handler"
	"github.com/abhisheksoni27/opendoor/internal/repository"
	"github.com/gin-gonic/gin"
)

func TestListTopics(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupRepoTestDB(t)
	defer db.Close()

	repoStore := repository.NewRepoRepository(db)
	ctx := context.Background()

	// Insert topics
	_ = repoStore.UpsertTopics(ctx, "1", []string{"rust", "cli", "async"})
	_ = repoStore.UpsertTopics(ctx, "2", []string{"rust", "machine-learning"})

	r := gin.New()
	r.GET("/api/v1/topics", handler.ListTopics(repoStore))

	req, _ := http.NewRequest(http.MethodGet, "/api/v1/topics", nil)
	w := httptest.NewRecorder()

	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d: %s", w.Code, w.Body.String())
	}

	var resp struct {
		Topics []string `json:"topics"`
		Data   []string `json:"data"`
	}
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("failed to unmarshal JSON: %v", err)
	}

	if len(resp.Topics) != 4 {
		t.Fatalf("expected 4 distinct topics, got %d: %v", len(resp.Topics), resp.Topics)
	}

	// Should be alphabetically ordered: async, cli, machine-learning, rust
	expected := []string{"async", "cli", "machine-learning", "rust"}
	for i, want := range expected {
		if resp.Topics[i] != want {
			t.Errorf("expected topic %d to be %q, got %q", i, want, resp.Topics[i])
		}
	}

	if len(resp.Data) != 4 {
		t.Fatalf("expected data key with 4 topics, got %d", len(resp.Data))
	}
}

func TestListTopics_Empty(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupRepoTestDB(t)
	defer db.Close()

	repoStore := repository.NewRepoRepository(db)

	r := gin.New()
	r.GET("/api/v1/topics", handler.ListTopics(repoStore))

	req, _ := http.NewRequest(http.MethodGet, "/api/v1/topics", nil)
	w := httptest.NewRecorder()

	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d: %s", w.Code, w.Body.String())
	}

	var resp struct {
		Topics []string `json:"topics"`
		Data   []string `json:"data"`
	}
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("failed to unmarshal JSON: %v", err)
	}

	if resp.Topics == nil || len(resp.Topics) != 0 {
		t.Fatalf("expected empty non-nil slice for topics, got: %v", resp.Topics)
	}
	if resp.Data == nil || len(resp.Data) != 0 {
		t.Fatalf("expected empty non-nil slice for data, got: %v", resp.Data)
	}
}
