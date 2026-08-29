package handler

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

func TestSniperHandler_SubscribeSniper(t *testing.T) {
	gin.SetMode(gin.TestMode)
	handler := NewSniperHandler(nil)

	r := gin.New()
	r.POST("/api/v1/alerts/subscribe-sniper", handler.SubscribeSniper)

	body, _ := json.Marshal(map[string]any{
		"email":        "contributor@example.com",
		"languages":    []string{"Rust", "TypeScript"},
		"repo_full_name": "supabase/supabase",
		"frequency":    "instant",
	})

	req := httptest.NewRequest("POST", "/api/v1/alerts/subscribe-sniper", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d: %s", w.Code, w.Body.String())
	}
}
