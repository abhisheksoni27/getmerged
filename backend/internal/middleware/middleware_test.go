package middleware_test

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/abhisheksoni27/opendoor/internal/auth"
	"github.com/abhisheksoni27/opendoor/internal/middleware"
	"github.com/gin-gonic/gin"
)

func TestCORS_Middleware(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.Use(middleware.CORS())
	r.GET("/test", func(c *gin.Context) {
		c.String(http.StatusOK, "ok")
	})

	req := httptest.NewRequest("OPTIONS", "/test", nil)
	req.Header.Set("Origin", "https://opendoor.abhishekco.de")
	w := httptest.NewRecorder()

	r.ServeHTTP(w, req)

	if w.Code != http.StatusNoContent {
		t.Fatalf("expected 204 No Content for OPTIONS CORS, got: %d", w.Code)
	}

	if w.Header().Get("Access-Control-Allow-Origin") != "https://opendoor.abhishekco.de" {
		t.Fatalf("expected origin header match, got: %s", w.Header().Get("Access-Control-Allow-Origin"))
	}
}

func TestUserAuth_Middleware(t *testing.T) {
	jwtSecret := "this-is-a-very-long-jwt-secret-key-32chars"
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.Use(middleware.UserAuth(jwtSecret))
	r.GET("/protected", func(c *gin.Context) {
		c.String(http.StatusOK, "success")
	})

	// 1. Test missing token -> 401
	req1 := httptest.NewRequest("GET", "/protected", nil)
	w1 := httptest.NewRecorder()
	r.ServeHTTP(w1, req1)
	if w1.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401 for missing token, got: %d", w1.Code)
	}

	// 2. Test valid token -> 200
	token, err := auth.GenerateToken(42, "user42", jwtSecret)
	if err != nil {
		t.Fatalf("token generation failed: %v", err)
	}

	req2 := httptest.NewRequest("GET", "/protected", nil)
	req2.Header.Set("Authorization", "Bearer "+token)
	w2 := httptest.NewRecorder()
	r.ServeHTTP(w2, req2)

	if w2.Code != http.StatusOK {
		t.Fatalf("expected 200 for valid token, got %d: %s", w2.Code, w2.Body.String())
	}
}
