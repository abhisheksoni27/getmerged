package handler_test

import (
	"bytes"
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

func TestPostHireInquiryHandler(t *testing.T) {
	gin.SetMode(gin.TestMode)
	database, err := sqlx.Open("sqlite", ":memory:")
	if err != nil {
		t.Fatalf("failed to open memory db: %v", err)
	}
	defer database.Close()

	if err := db.AutoMigrate(database); err != nil {
		t.Fatalf("failed to auto migrate db: %v", err)
	}

	cfg := &config.Config{
		EncryptionKey: "01234567890123456789012345678901",
	}
	userRepo := repository.NewUserRepository(database, cfg)

	// Create a test user
	userID, err := userRepo.UpsertUser(context.Background(), 12345, "Abhishek Soni", "abhishek@example.com", "https://avatar.com/123")
	if err != nil {
		t.Fatalf("failed to upsert user: %v", err)
	}

	user, err := userRepo.FindByID(context.Background(), userID)
	if err != nil || user == nil || user.Slug == nil {
		t.Fatalf("failed to find user or nil slug: %v", err)
	}

	r := gin.New()
	r.POST("/api/v1/user/hire-inquiry", handler.PostHireInquiryHandler(userRepo, database))

	t.Run("successful hire inquiry", func(t *testing.T) {
		body := map[string]string{
			"target_slug": *user.Slug,
			"email":       "recruiter@acme.com",
			"company":     "Acme Corp",
			"message":     "We'd love to discuss a Staff Engineer role with you!",
		}
		jsonBytes, _ := json.Marshal(body)

		req := httptest.NewRequest("POST", "/api/v1/user/hire-inquiry", bytes.NewReader(jsonBytes))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()

		r.ServeHTTP(w, req)
		if w.Code != http.StatusOK {
			t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
		}

		var resp map[string]interface{}
		if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
			t.Fatalf("failed to unmarshal json: %v", err)
		}
		if resp["status"] != "ok" {
			t.Fatalf("expected status ok, got %v", resp["status"])
		}

		// Check notification_queue
		var count int
		if err := database.Get(&count, "SELECT COUNT(*) FROM notification_queue WHERE user_id = ? AND type = 'hire_inquiry'", userID); err != nil {
			t.Fatalf("failed to query notification_queue: %v", err)
		}
		if count != 1 {
			t.Fatalf("expected 1 notification in queue, got %d", count)
		}
	})

	t.Run("missing required fields", func(t *testing.T) {
		body := map[string]string{
			"target_slug": *user.Slug,
			"company":     "Acme Corp",
		}
		jsonBytes, _ := json.Marshal(body)

		req := httptest.NewRequest("POST", "/api/v1/user/hire-inquiry", bytes.NewReader(jsonBytes))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()

		r.ServeHTTP(w, req)
		if w.Code != http.StatusBadRequest {
			t.Fatalf("expected 400, got %d", w.Code)
		}
	})

	t.Run("target user not found", func(t *testing.T) {
		body := map[string]string{
			"target_slug": "nonexistent-user-12345",
			"email":       "recruiter@acme.com",
			"company":     "Acme Corp",
			"message":     "Hello",
		}
		jsonBytes, _ := json.Marshal(body)

		req := httptest.NewRequest("POST", "/api/v1/user/hire-inquiry", bytes.NewReader(jsonBytes))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()

		r.ServeHTTP(w, req)
		if w.Code != http.StatusNotFound {
			t.Fatalf("expected 404, got %d", w.Code)
		}
	})
}
