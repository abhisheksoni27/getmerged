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
		Topics     []string               `json:"topics"`
		Data       []string               `json:"data"`
		TopicStats []repository.TopicStat `json:"topic_stats"`
	}
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("failed to unmarshal JSON: %v", err)
	}

	if len(resp.Topics) != 4 {
		t.Fatalf("expected 4 distinct topics, got %d: %v", len(resp.Topics), resp.Topics)
	}

	// rust has count 2; async, cli, machine-learning have count 1
	if resp.Topics[0] != "rust" {
		t.Errorf("expected first topic by popularity to be 'rust', got %q", resp.Topics[0])
	}

	if len(resp.Data) != 4 {
		t.Fatalf("expected data key with 4 topics, got %d", len(resp.Data))
	}
	if resp.Data[0] != "rust" {
		t.Errorf("expected data[0] to be 'rust', got %q", resp.Data[0])
	}

	if len(resp.TopicStats) != 4 {
		t.Fatalf("expected 4 topic_stats items, got %d", len(resp.TopicStats))
	}
	if resp.TopicStats[0].Name != "rust" || resp.TopicStats[0].RepoCount != 2 {
		t.Errorf("expected topic_stats[0] to be rust with repo_count 2, got %+v", resp.TopicStats[0])
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
		Topics     []string               `json:"topics"`
		Data       []string               `json:"data"`
		TopicStats []repository.TopicStat `json:"topic_stats"`
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
	if resp.TopicStats == nil || len(resp.TopicStats) != 0 {
		t.Fatalf("expected empty non-nil slice for topic_stats, got: %v", resp.TopicStats)
	}
}
