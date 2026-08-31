package handler_test

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/abhisheksoni27/opendoor/internal/auth"
	"github.com/abhisheksoni27/opendoor/internal/config"
	"github.com/abhisheksoni27/opendoor/internal/db"
	"github.com/abhisheksoni27/opendoor/internal/handler"
	"github.com/abhisheksoni27/opendoor/internal/middleware"
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

func TestAuthMeResolvesAfterSoftDeletedReauth(t *testing.T) {
	gin.SetMode(gin.TestMode)
	database, cfg := setupUserHandlerTestDB(t)
	defer database.Close()

	userRepo := repository.NewUserRepository(database, cfg)
	ctx := context.Background()

	userID, err := userRepo.UpsertGoogleUser(ctx, "goog-reauth", "Resurrected Dev", "resurrected@example.com", "https://avatar/r")
	if err != nil {
		t.Fatalf("failed to seed user: %v", err)
	}

	if err := userRepo.SoftDeleteUser(ctx, userID); err != nil {
		t.Fatalf("failed to soft delete user: %v", err)
	}

	// Re-login through the OAuth callback upsert path
	userID2, err := userRepo.UpsertGoogleUser(ctx, "goog-reauth", "Resurrected Dev", "resurrected@example.com", "https://avatar/r2")
	if err != nil {
		t.Fatalf("re-auth upsert failed: %v", err)
	}
	if userID2 != userID {
		t.Fatalf("expected re-auth to keep id %d, got %d", userID, userID2)
	}

	jwtSecret := "test-jwt-secret-0123456789abcdefghij"
	signedToken, err := auth.GenerateToken(userID2, "Resurrected Dev", jwtSecret)
	if err != nil {
		t.Fatalf("failed to generate token: %v", err)
	}

	r := gin.New()
	r.Use(middleware.UserAuth(jwtSecret))
	r.GET("/api/v1/auth/me", handler.GetCurrentUser(userRepo, nil, nil))

	req, _ := http.NewRequest("GET", "/api/v1/auth/me", nil)
	req.Header.Set("Authorization", "Bearer "+signedToken)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200 from /auth/me after resurrection, got %d: %s", w.Code, w.Body.String())
	}

	var resp struct {
		User struct {
			Slug     string `json:"slug"`
			Username string `json:"username"`
		} `json:"user"`
	}
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("failed to parse response: %v", err)
	}
	if resp.User.Slug != "resurrected-dev" {
		t.Fatalf("expected slug 'resurrected-dev', got %q", resp.User.Slug)
	}
	if resp.User.Username != "Resurrected Dev" {
		t.Fatalf("expected username 'Resurrected Dev', got %q", resp.User.Username)
	}
}

func TestUsernameStableAcrossGithubRelogin(t *testing.T) {
	gin.SetMode(gin.TestMode)
	database, cfg := setupUserHandlerTestDB(t)
	defer database.Close()

	userRepo := repository.NewUserRepository(database, cfg)
	ctx := context.Background()

	userID, err := userRepo.UpsertUser(ctx, 5150, "originalname", "orig@github.com", "https://avatar/o")
	if err != nil {
		t.Fatalf("failed to seed github user: %v", err)
	}

	// Re-login with a changed GitHub login: username must not be overwritten.
	if _, err := userRepo.UpsertUser(ctx, 5150, "renamedlogin", "orig@github.com", "https://avatar/o2"); err != nil {
		t.Fatalf("re-login upsert failed: %v", err)
	}

	stored, err := userRepo.FindByID(ctx, userID)
	if err != nil {
		t.Fatalf("failed to load stored user: %v", err)
	}
	if stored.Username != "originalname" {
		t.Fatalf("expected preserved username 'originalname', got %q", stored.Username)
	}

	jwtSecret := "test-jwt-secret-0123456789abcdefghij"
	signedToken, err := auth.GenerateToken(userID, stored.Username, jwtSecret)
	if err != nil {
		t.Fatalf("failed to generate token: %v", err)
	}

	entitlementRepo := repository.NewEntitlementRepository(database)
	recruiterRepo := repository.NewRecruiterRepository(database)

	r := gin.New()
	r.Use(middleware.UserAuth(jwtSecret))
	r.GET("/api/v1/auth/me", handler.GetCurrentUser(userRepo, entitlementRepo, recruiterRepo))
	r.GET("/api/v1/users/:slug", handler.GetUserProfile(userRepo))

	fetchMe := func() string {
		t.Helper()
		req, _ := http.NewRequest("GET", "/api/v1/auth/me", nil)
		req.Header.Set("Authorization", "Bearer "+signedToken)
		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)
		if w.Code != http.StatusOK {
			t.Fatalf("expected 200 from /api/v1/auth/me, got %d: %s", w.Code, w.Body.String())
		}
		var payload struct {
			User struct {
				Username string `json:"username"`
			} `json:"user"`
		}
		if err := json.Unmarshal(w.Body.Bytes(), &payload); err != nil {
			t.Fatalf("failed to parse /auth/me response: %v", err)
		}
		return payload.User.Username
	}

	fetchProfile := func() string {
		t.Helper()
		req, _ := http.NewRequest("GET", "/api/v1/users/originalname", nil)
		req.Header.Set("Authorization", "Bearer "+signedToken)
		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)
		if w.Code != http.StatusOK {
			t.Fatalf("expected 200 from profile, got %d: %s", w.Code, w.Body.String())
		}
		var payload struct {
			Username string `json:"username"`
		}
		if err := json.Unmarshal(w.Body.Bytes(), &payload); err != nil {
			t.Fatalf("failed to parse profile response: %v", err)
		}
		return payload.Username
	}

	meUsername := fetchMe()
	profileUsername := fetchProfile()

	if meUsername != profileUsername {
		t.Fatalf("username mismatch after re-login: /auth/me=%q profile=%q", meUsername, profileUsername)
	}
	if meUsername != "originalname" {
		t.Fatalf("expected stable username 'originalname' on both endpoints, got %q", meUsername)
	}
}
