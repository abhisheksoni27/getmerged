package handler

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/abhisheksoni27/opendoor/internal/stack"
	"github.com/gin-gonic/gin"
)

func TestStackHandler_AnalyzeDirect(t *testing.T) {
	gin.SetMode(gin.TestMode)
	analyzer := stack.NewAnalyzer(nil)
	handler := NewStackHandler(analyzer, nil, nil, nil)

	r := gin.New()
	r.POST("/api/v1/stack/analyze", handler.AnalyzeDirect)

	body, _ := json.Marshal(map[string]any{
		"packages": []string{"next", "tailwindcss"},
	})

	req := httptest.NewRequest("POST", "/api/v1/stack/analyze", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d: %s", w.Code, w.Body.String())
	}

	var res stack.StackAnalysisResult
	if err := json.Unmarshal(w.Body.Bytes(), &res); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	if res.Summary.TotalDependencies != 2 {
		t.Errorf("expected 2 dependencies, got %d", res.Summary.TotalDependencies)
	}
}
