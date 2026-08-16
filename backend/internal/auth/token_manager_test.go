package auth_test

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/abhisheksoni27/opendoor/internal/auth"
	"github.com/abhisheksoni27/opendoor/internal/config"
	"github.com/abhisheksoni27/opendoor/internal/db"
	"github.com/abhisheksoni27/opendoor/internal/repository"
	"github.com/jmoiron/sqlx"
	_ "modernc.org/sqlite"
)

func TestTokenManager_SingleflightDeduplication(t *testing.T) {
	database, err := sqlx.Open("sqlite", "file:authtokentest?mode=memory&cache=shared")
	if err != nil {
		t.Fatalf("failed to open memory db: %v", err)
	}
	defer database.Close()

	if err := db.AutoMigrate(database); err != nil {
		t.Fatalf("failed to auto migrate: %v", err)
	}

	cfg := &config.Config{
		EncryptionKey:      "12345678901234567890123456789012",
		GithubClientID:     "mock_client_id",
		GithubClientSecret: "mock_client_secret",
	}

	tokenRepo := repository.NewOAuthTokenRepository(database, cfg)

	var refreshCount int32
	mockServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		atomic.AddInt32(&refreshCount, 1)
		time.Sleep(50 * time.Millisecond) // Simulate slow network request
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]interface{}{
			"access_token":  "gho_new_access_token_refreshed",
			"refresh_token": "ghr_new_refresh_token_refreshed",
			"expires_in":    28800,
		})
	}))
	defer mockServer.Close()

	tm := auth.NewTokenManagerWithBaseURL(tokenRepo, cfg, mockServer.Client(), mockServer.URL)

	userID := int64(42)
	// Save expired token
	past := time.Now().Add(-1 * time.Hour)
	err = tokenRepo.UpsertToken(context.Background(), userID, "github", "gho_old_token", "ghr_refresh_token", &past)
	if err != nil {
		t.Fatalf("failed to save initial expired token: %v", err)
	}

	// 10 concurrent requests to simulate thundering herd
	numGoroutines := 10
	var wg sync.WaitGroup
	wg.Add(numGoroutines)

	results := make([]string, numGoroutines)
	for i := 0; i < numGoroutines; i++ {
		idx := i
		go func() {
			defer wg.Done()
			token, err := tm.GetValidGithubToken(context.Background(), userID)
			if err != nil {
				t.Errorf("GetValidGithubToken failed: %v", err)
				return
			}
			results[idx] = token
		}()
	}

	wg.Wait()

	for i, res := range results {
		if res != "gho_new_access_token_refreshed" && res != "gho_old_token" {
			t.Errorf("goroutine %d got unexpected token: %s", i, res)
		}
	}
}
