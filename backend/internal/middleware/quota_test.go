package middleware_test

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/abhisheksoni27/opendoor/internal/auth"
	"github.com/abhisheksoni27/opendoor/internal/middleware"
	"github.com/abhisheksoni27/opendoor/internal/repository"
	"github.com/gin-gonic/gin"
)

type fakeEntitlementRepo struct {
	repository.EntitlementRepository
	deductCalled bool
}

func (f *fakeEntitlementRepo) DeductQuota(ctx context.Context, userID int64) (bool, error) {
	f.deductCalled = true
	return true, nil
}

// Instant Anonymous Preflight Trial: anonymous requests pass quota enforcement
// as a one-per-IP trial; signed-in users go through normal quota deduction.
func TestRequireProOrQuota_AnonymousTrial(t *testing.T) {
	gin.SetMode(gin.TestMode)
	jwtSecret := "this-is-a-very-long-jwt-secret-key-32chars"
	ent := &fakeEntitlementRepo{}

	r := gin.New()
	r.Use(middleware.OptionalUserAuth(jwtSecret))
	r.POST("/evaluate",
		middleware.SkipIfAuthenticated(middleware.RateLimitPerIP(1, 24*time.Hour)),
		middleware.RequireProOrQuota(ent),
		func(c *gin.Context) { c.String(http.StatusOK, "evaluated") })

	// 1. Anonymous request -> allowed through with trial marker, no quota deduction.
	req1 := httptest.NewRequest("POST", "/evaluate", nil)
	w1 := httptest.NewRecorder()
	r.ServeHTTP(w1, req1)

	if w1.Code != http.StatusOK {
		t.Fatalf("expected 200 for anonymous preflight trial, got %d", w1.Code)
	}
	if w1.Header().Get("X-Anonymous-Trial") != "1" {
		t.Fatalf("expected X-Anonymous-Trial header on anonymous evaluation")
	}
	if ent.deductCalled {
		t.Fatalf("anonymous trial must not deduct user quota")
	}

	// 2. Authenticated request -> normal quota path, no trial marker.
	token, err := auth.GenerateToken(42, "user42", jwtSecret)
	if err != nil {
		t.Fatalf("token generation failed: %v", err)
	}
	req2 := httptest.NewRequest("POST", "/evaluate", nil)
	req2.Header.Set("Authorization", "Bearer "+token)
	w2 := httptest.NewRecorder()
	r.ServeHTTP(w2, req2)

	if w2.Code != http.StatusOK {
		t.Fatalf("expected 200 for authenticated evaluation, got %d", w2.Code)
	}
	if w2.Header().Get("X-Anonymous-Trial") == "1" {
		t.Fatalf("authenticated evaluation must not carry anonymous trial marker")
	}
	if !ent.deductCalled {
		t.Fatalf("authenticated evaluation must deduct quota")
	}
}
