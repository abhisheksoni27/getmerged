package handler_test

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/abhisheksoni27/opendoor/internal/handler"
	"github.com/abhisheksoni27/opendoor/internal/scan"
	"github.com/gin-gonic/gin"
)

func TestScanRoutes(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	svc := scan.NewService(nil, nil, nil, nil, "https://x.test")
	r.GET("/og/forecast/:id", func(c *gin.Context) {})
	r.GET("/og/playbook/:owner/:name", func(c *gin.Context) {})
	r.GET("/og/playbook-card/:token", func(c *gin.Context) {})
	r.GET("/og/scan/:owner/:name", handler.GetScanOGCardHandler(svc))
	api := r.Group("/api/v1")
	api.GET("/repos/:id", func(c *gin.Context) {})
	api.POST("/webhooks/github-app", func(c *gin.Context) {})
	r.POST("/api/v1/scan", handler.StartScanHandler(svc))
	r.GET("/api/v1/scan/status/:owner/:name", handler.GetScanStatusHandler(svc))
	r.POST("/api/v1/webhooks/github-push", handler.GithubPushWebhookHandler(svc, "sec"))

	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodPost, "/api/v1/scan", nil)
	r.ServeHTTP(w, req)
	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected 400 for empty body, got %d: %s", w.Code, w.Body.String())
	}

	w2 := httptest.NewRecorder()
	req2, _ := http.NewRequest(http.MethodGet, "/api/v1/scan/status/golang/go", nil)
	r.ServeHTTP(w2, req2)
	if w2.Code != http.StatusOK {
		t.Fatalf("status poll got %d: %s", w2.Code, w2.Body.String())
	}
	t.Log(w2.Body.String())

	w3 := httptest.NewRecorder()
	req3, _ := http.NewRequest(http.MethodGet, "/og/scan/golang/go", nil)
	r.ServeHTTP(w3, req3)
	if w3.Code != http.StatusOK || w3.Header().Get("Content-Type") != "image/png" {
		t.Fatalf("og card got %d %s", w3.Code, w3.Header().Get("Content-Type"))
	}
}
