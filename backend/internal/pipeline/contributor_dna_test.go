package pipeline_test

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"sync/atomic"
	"testing"

	"github.com/abhisheksoni27/opendoor/internal/auth"
	"github.com/abhisheksoni27/opendoor/internal/config"
	"github.com/abhisheksoni27/opendoor/internal/db"
	"github.com/abhisheksoni27/opendoor/internal/pipeline"
	"github.com/abhisheksoni27/opendoor/internal/repository"
	"github.com/jmoiron/sqlx"
	_ "modernc.org/sqlite"
)

func TestContributorDNAWorker_OneQueryBudgetAndSuccess(t *testing.T) {
	database, err := sqlx.Open("sqlite", "file:dnatest?mode=memory&cache=shared")
	if err != nil {
		t.Fatalf("failed to open memory db: %v", err)
	}
	defer database.Close()

	if err := db.AutoMigrate(database); err != nil {
		t.Fatalf("failed to auto migrate: %v", err)
	}

	cfg := &config.Config{
		EncryptionKey: "12345678901234567890123456789012",
	}

	userRepo := repository.NewUserRepository(database, cfg)
	profileRepo := repository.NewContributorProfileRepository(database)
	tokenRepo := repository.NewOAuthTokenRepository(database, cfg)
	tokenMgr := auth.NewTokenManager(tokenRepo, cfg, nil)

	ctx := context.Background()

	// 1. Create user and grant profiling consent
	userID, err := userRepo.UpsertUser(ctx, 999, "octocat", "octo@github.com", "https://avatar.url")
	if err != nil {
		t.Fatalf("UpsertUser failed: %v", err)
	}
	_ = userRepo.UpdateProfilingConsent(ctx, userID, true)
	_, _ = profileRepo.RequestRefresh(ctx, userID)

	var queryCount int32
	mockGQL := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		atomic.AddInt32(&queryCount, 1)
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]interface{}{
			"data": map[string]interface{}{
				"user": map[string]interface{}{
					"createdAt": "2020-01-01T00:00:00Z",
					"followers": map[string]interface{}{"totalCount": 42},
					"repositories": map[string]interface{}{"totalCount": 10},
				},
				"search": map[string]interface{}{
					"issueCount": 2,
					"nodes": []map[string]interface{}{
						{
							"additions":    50,
							"deletions":    10,
							"changedFiles": 3,
							"mergedAt":     "2026-01-15T00:00:00Z",
							"createdAt":    "2026-01-14T00:00:00Z",
							"repository": map[string]interface{}{
								"nameWithOwner": "golang/go",
								"primaryLanguage": map[string]interface{}{
									"name": "Go",
								},
								"stargazerCount": 120000,
							},
							"comments": map[string]interface{}{"totalCount": 2},
							"reviews":  map[string]interface{}{"totalCount": 1},
						},
					},
				},
			},
		})
	}))
	defer mockGQL.Close()

	worker := pipeline.NewContributorDNAWorkerWithURL(userRepo, profileRepo, tokenMgr, "ghp_global_mock", mockGQL.Client(), mockGQL.URL)

	err = worker.AnalyzeUser(ctx, userID)
	if err != nil {
		t.Fatalf("AnalyzeUser failed: %v", err)
	}

	// Verify STRICT query budget: exactly 1 network query made
	if queryCount != 1 {
		t.Fatalf("expected strictly 1 GraphQL query, got %d", queryCount)
	}

	// Verify profile is completed
	prof, err := profileRepo.GetByUserID(ctx, userID)
	if err != nil || prof == nil {
		t.Fatalf("expected profile record, got %v", err)
	}
	if prof.ProfilingStatus != "completed" {
		t.Fatalf("expected status 'completed', got %s", prof.ProfilingStatus)
	}
	if prof.DNAJSON == nil || *prof.DNAJSON == "" {
		t.Fatalf("expected non-empty dna_json")
	}
}
