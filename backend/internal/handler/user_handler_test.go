package handler_test

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/abhisheksoni27/opendoor/internal/config"
	"github.com/abhisheksoni27/opendoor/internal/db"
	"github.com/abhisheksoni27/opendoor/internal/handler"
	"github.com/abhisheksoni27/opendoor/internal/repository"
	"github.com/gin-gonic/gin"
	"github.com/jmoiron/sqlx"
	_ "modernc.org/sqlite"
)

func setupUserHandlerTestDB(t *testing.T) (*sqlx.DB, *config.Config) {
	t.Helper()
	database, err := sqlx.Open("sqlite", ":memory:")
	if err != nil {
		t.Fatalf("failed to open memory db: %v", err)
	}

	if err := db.AutoMigrate(database); err != nil {
		t.Fatalf("failed to auto migrate db: %v", err)
	}

	cfg := &config.Config{
		EncryptionKey: "12345678901234567890123456789012",
	}

	return database, cfg
}

func TestGetUserProfileHandler(t *testing.T) {
	gin.SetMode(gin.TestMode)
	database, cfg := setupUserHandlerTestDB(t)
	defer database.Close()

	userRepo := repository.NewUserRepository(database, cfg)
	ctx := context.Background()

	// Seed 1 GitHub user with slug 'alice'
	_, err := userRepo.UpsertUser(ctx, 4242, "Alice Dev", "alice@github.com", "https://avatar.github/alice")
	if err != nil {
		t.Fatalf("failed to seed user: %v", err)
	}

	// Seed 1 Google-only user with slug 'bob'
	_, err = userRepo.UpsertGoogleUser(ctx, "goog-777", "Bob", "bob@google.com", "https://avatar.google/bob")
	if err != nil {
		t.Fatalf("failed to seed google user: %v", err)
	}

	r := gin.New()
	r.GET("/api/v1/users/:slug", handler.GetUserProfile(userRepo))

	// 1. Success case: GitHub user
	t.Run("found github profile", func(t *testing.T) {
		req, _ := http.NewRequest("GET", "/api/v1/users/alice-dev", nil)
		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)

		if w.Code != http.StatusOK {
			t.Fatalf("expected status 200, got %d: %s", w.Code, w.Body.String())
		}

		var resp struct {
			Slug      string  `json:"slug"`
			Username  string  `json:"username"`
			GithubURL *string `json:"github_url"`
		}
		if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
			t.Fatalf("failed to parse response JSON: %v", err)
		}
		if resp.Slug != "alice-dev" || resp.GithubURL == nil {
			t.Fatalf("unexpected profile payload: %+v", resp)
		}
	})

	// 2. Success case: Google-only user
	t.Run("found google profile with omitted github fields", func(t *testing.T) {
		req, _ := http.NewRequest("GET", "/api/v1/users/bob", nil)
		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)

		if w.Code != http.StatusOK {
			t.Fatalf("expected status 200, got %d: %s", w.Code, w.Body.String())
		}

		var resp struct {
			Slug      string  `json:"slug"`
			Username  string  `json:"username"`
			GithubURL *string `json:"github_url"`
			Stats     struct {
				VerifiedContributions *int `json:"verified_contributions"`
			} `json:"stats"`
		}
		if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
			t.Fatalf("failed to parse response JSON: %v", err)
		}
		if resp.GithubURL != nil || resp.Stats.VerifiedContributions != nil {
			t.Fatalf("expected omitted github fields for google profile: %+v", resp)
		}
	})

	// 3. 404 on nonexistent slug
	t.Run("not found slug", func(t *testing.T) {
		req, _ := http.NewRequest("GET", "/api/v1/users/non-existent-user-12345", nil)
		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)

		if w.Code != http.StatusNotFound {
			t.Fatalf("expected 404, got %d: %s", w.Code, w.Body.String())
		}
	})
}
