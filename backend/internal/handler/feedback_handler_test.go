package handler_test

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/abhisheksoni27/opendoor/internal/config"
	"github.com/abhisheksoni27/opendoor/internal/db"
	"github.com/abhisheksoni27/opendoor/internal/handler"
	"github.com/abhisheksoni27/opendoor/internal/middleware"
	"github.com/abhisheksoni27/opendoor/internal/repository"
	"github.com/gin-gonic/gin"
	"github.com/jmoiron/sqlx"
	_ "modernc.org/sqlite"
)

func setupFeedbackTestDB(t *testing.T) (*sqlx.DB, *config.Config) {
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

func TestGetMe_AuthProviderMetadata(t *testing.T) {
	gin.SetMode(gin.TestMode)
	database, cfg := setupFeedbackTestDB(t)
	defer database.Close()

	userRepo := repository.NewUserRepository(database, cfg)
	ctx := context.Background()

	ghUserID, err := userRepo.UpsertUser(ctx, 12345, "octocat", "octo@github.com", "https://github.com/avatar")
	if err != nil {
		t.Fatalf("failed to create github user: %v", err)
	}

	googleUserID, err := userRepo.UpsertGoogleUser(ctx, "google-999", "googler", "goog@gmail.com", "https://google.com/avatar")
	if err != nil {
		t.Fatalf("failed to create google user: %v", err)
	}

	r := gin.New()
	r.GET("/api/v1/auth/me", func(c *gin.Context) {
		uid := c.GetHeader("X-Test-User-ID")
		if uid == "github" {
			c.Set(middleware.UserIDKey, ghUserID)
		} else if uid == "google" {
			c.Set(middleware.UserIDKey, googleUserID)
		}
		handler.GetCurrentUser(userRepo, nil, nil)(c)
	})

	// Test GitHub user
	req := httptest.NewRequest(http.MethodGet, "/api/v1/auth/me", nil)
	req.Header.Set("X-Test-User-ID", "github")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var resGh struct {
		User struct {
			AuthProvider string `json:"auth_provider"`
			HasGithub    bool   `json:"has_github"`
		} `json:"user"`
	}
	if err := json.Unmarshal(w.Body.Bytes(), &resGh); err != nil {
		t.Fatalf("failed to unmarshal body: %v", err)
	}
	if resGh.User.AuthProvider != "github" || !resGh.User.HasGithub {
		t.Fatalf("expected auth_provider=github and has_github=true, got provider=%s has_github=%v", resGh.User.AuthProvider, resGh.User.HasGithub)
	}

	// Test Google user
	req = httptest.NewRequest(http.MethodGet, "/api/v1/auth/me", nil)
	req.Header.Set("X-Test-User-ID", "google")
	w = httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var resGoog struct {
		User struct {
			AuthProvider string `json:"auth_provider"`
			HasGithub    bool   `json:"has_github"`
		} `json:"user"`
	}
	if err := json.Unmarshal(w.Body.Bytes(), &resGoog); err != nil {
		t.Fatalf("failed to unmarshal body: %v", err)
	}
	if resGoog.User.AuthProvider != "google" || resGoog.User.HasGithub {
		t.Fatalf("expected auth_provider=google and has_github=false, got provider=%s has_github=%v", resGoog.User.AuthProvider, resGoog.User.HasGithub)
	}
}

func TestFeedback_Upsert_DynamicSentiment_Delete(t *testing.T) {
	gin.SetMode(gin.TestMode)
	database, cfg := setupFeedbackTestDB(t)
	defer database.Close()

	userRepo := repository.NewUserRepository(database, cfg)
	ctx := context.Background()

	userID, err := userRepo.UpsertUser(ctx, 12345, "octocat", "octo@github.com", "https://github.com/avatar")
	if err != nil {
		t.Fatalf("failed to create github user: %v", err)
	}

	r := gin.New()
	r.POST("/api/v1/user/feedback", func(c *gin.Context) {
		c.Set(middleware.UserIDKey, userID)
		c.Set(middleware.UsernameKey, "octocat")
		handler.CreateFeedback(database, "")(c)
	})
	r.GET("/api/v1/repos/:id/feedback", handler.ListFeedback(database))
	r.DELETE("/api/v1/user/feedback/:id", func(c *gin.Context) {
		c.Set(middleware.UserIDKey, userID)
		handler.DeleteFeedback(database)(c)
	})

	repoID := "repo_1024"

	// 1. Submit initial feedback (Welcoming: 5, 5, 5 -> avg 5.0)
	payload1 := map[string]interface{}{
		"repo_id":             repoID,
		"full_name":           "facebook/react",
		"maintainer_rating":   5,
		"review_speed_rating": 5,
		"beginner_rating":     5,
		"comment":             "Super welcoming team!",
	}
	bodyBytes, _ := json.Marshal(payload1)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/user/feedback", bytes.NewReader(bodyBytes))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200 for initial feedback, got %d: %s", w.Code, w.Body.String())
	}

	// Verify in canonical contributor_feedback table
	var count int
	err = database.Get(&count, "SELECT COUNT(1) FROM contributor_feedback WHERE repository_id = ? AND user_id = ?", repoID, userID)
	if err != nil {
		t.Fatalf("failed to query contributor_feedback: %v", err)
	}
	if count != 1 {
		t.Fatalf("expected 1 record in contributor_feedback, got %d", count)
	}

	// 2. Upsert update (Challenging: 1, 2, 2 -> avg 1.67)
	payload2 := map[string]interface{}{
		"repo_id":             repoID,
		"full_name":           "facebook/react",
		"maintainer_rating":   1,
		"review_speed_rating": 2,
		"beginner_rating":     2,
		"comment":             "Updated comment",
	}
	bodyBytes2, _ := json.Marshal(payload2)
	req2 := httptest.NewRequest(http.MethodPost, "/api/v1/user/feedback", bytes.NewReader(bodyBytes2))
	req2.Header.Set("Content-Type", "application/json")
	w2 := httptest.NewRecorder()
	r.ServeHTTP(w2, req2)

	if w2.Code != http.StatusOK {
		t.Fatalf("expected 200 for upsert feedback, got %d: %s", w2.Code, w2.Body.String())
	}

	// Ensure still exactly 1 record (upsert semantics)
	_ = database.Get(&count, "SELECT COUNT(1) FROM contributor_feedback WHERE repository_id = ? AND user_id = ?", repoID, userID)
	if count != 1 {
		t.Fatalf("expected 1 record after upsert, got %d", count)
	}

	// 3. Test ListFeedback dynamic sentiment calculation
	reqList := httptest.NewRequest(http.MethodGet, fmt.Sprintf("/api/v1/repos/%s/feedback", repoID), nil)
	wList := httptest.NewRecorder()
	r.ServeHTTP(wList, reqList)

	if wList.Code != http.StatusOK {
		t.Fatalf("expected 200 for list feedback, got %d: %s", wList.Code, wList.Body.String())
	}

	var listRes struct {
		Feedback []struct {
			ID                  interface{} `json:"id"`
			RepositoryID        string      `json:"repository_id"`
			Sentiment           string      `json:"sentiment"`
			Comment             string      `json:"comment"`
			MaintainerRating    int         `json:"maintainer_rating"`
			ReviewSpeedRating   int         `json:"review_speed_rating"`
			BeginnerRating      int         `json:"beginner_rating"`
			VerifiedContributor bool        `json:"verified_contributor"`
		} `json:"feedback"`
	}
	if err := json.Unmarshal(wList.Body.Bytes(), &listRes); err != nil {
		t.Fatalf("failed to unmarshal list feedback: %v", err)
	}
	if len(listRes.Feedback) != 1 {
		t.Fatalf("expected 1 feedback item, got %d", len(listRes.Feedback))
	}
	item := listRes.Feedback[0]
	if item.Sentiment != "challenging" {
		t.Fatalf("expected sentiment=challenging for avg 1.67, got %s", item.Sentiment)
	}
	if item.MaintainerRating != 1 || item.ReviewSpeedRating != 2 || item.BeginnerRating != 2 {
		t.Fatalf("expected updated ratings 1,2,2, got %d,%d,%d", item.MaintainerRating, item.ReviewSpeedRating, item.BeginnerRating)
	}
	if item.Comment != "Updated comment" {
		t.Fatalf("expected comment 'Updated comment', got '%s'", item.Comment)
	}

	// 4. Test DeleteFeedback
	feedbackID := item.ID
	reqDel := httptest.NewRequest(http.MethodDelete, fmt.Sprintf("/api/v1/user/feedback/%v", feedbackID), nil)
	wDel := httptest.NewRecorder()
	r.ServeHTTP(wDel, reqDel)

	if wDel.Code != http.StatusOK {
		t.Fatalf("expected 200 for delete feedback, got %d: %s", wDel.Code, wDel.Body.String())
	}

	// Ensure record is deleted from contributor_feedback
	_ = database.Get(&count, "SELECT COUNT(1) FROM contributor_feedback WHERE repository_id = ? AND user_id = ?", repoID, userID)
	if count != 0 {
		t.Fatalf("expected 0 records after delete, got %d", count)
	}
}
