package handler_test

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strconv"
	"strings"
	"testing"
	"time"

	"github.com/abhisheksoni27/opendoor/internal/crypto"
	"github.com/abhisheksoni27/opendoor/internal/handler"
	"github.com/abhisheksoni27/opendoor/internal/middleware"
	"github.com/abhisheksoni27/opendoor/internal/repository"
	"github.com/gin-gonic/gin"
)

const testKeySalt = "test-salt"

func newAPIKeyTestRouter(t *testing.T) (*gin.Engine, repository.APIKeyRepository, repository.EntitlementRepository) {
	t.Helper()
	gin.SetMode(gin.TestMode)
	database := setupTestDB(t)
	t.Cleanup(func() { database.Close() })

	keyRepo := repository.NewAPIKeyRepository(database)
	entRepo := repository.NewEntitlementRepository(database)

	r := gin.New()
	// Fake the authenticated user for key-management routes.
	fakeAuth := func(c *gin.Context) {
		c.Set(middleware.UserIDKey, int64(42))
		c.Next()
	}
	userApi := r.Group("/")
	userApi.Use(fakeAuth)
	{
		userApi.GET("/user/api-keys", handler.ListAPIKeys(keyRepo, entRepo))
		userApi.POST("/user/api-keys", handler.CreateAPIKey(keyRepo, []byte(testKeySalt)))
		userApi.DELETE("/user/api-keys/:id", handler.RevokeAPIKey(keyRepo))
	}

	api := r.Group("/")
	api.Use(middleware.APIKeyAuth(keyRepo, entRepo, []byte(testKeySalt)))
	{
		api.GET("/repos", func(c *gin.Context) {
			uid, _ := c.Get(middleware.UserIDKey)
			c.JSON(http.StatusOK, gin.H{"user_id": uid})
		})
	}
	return r, keyRepo, entRepo
}

func TestCreateAndListAPIKeys(t *testing.T) {
	r, _, _ := newAPIKeyTestRouter(t)

	req := httptest.NewRequest("POST", "/user/api-keys", strings.NewReader(`{"name":"ci-bot"}`))
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusCreated {
		t.Fatalf("expected 201 on create api key, got %d: %s", w.Code, w.Body.String())
	}
	var created struct {
		ID        int64  `json:"id"`
		Name      string `json:"name"`
		KeyPrefix string `json:"key_prefix"`
		Key       string `json:"key"`
	}
	if err := json.NewDecoder(w.Body).Decode(&created); err != nil {
		t.Fatalf("failed to decode create response: %v", err)
	}
	if !strings.HasPrefix(created.Key, middleware.APIKeyPrefix) {
		t.Fatalf("expected raw key with %q prefix, got %q", middleware.APIKeyPrefix, created.Key)
	}
	if created.Name != "ci-bot" || created.ID <= 0 {
		t.Fatalf("unexpected created key payload: %+v", created)
	}

	// List shows the key metadata (never the raw key) plus tier limits.
	w2 := httptest.NewRecorder()
	r.ServeHTTP(w2, httptest.NewRequest("GET", "/user/api-keys", nil))
	if w2.Code != http.StatusOK {
		t.Fatalf("expected 200 on list api keys, got %d", w2.Code)
	}
	var listed struct {
		Keys []struct {
			ID        int64  `json:"id"`
			Name      string `json:"name"`
			KeyPrefix string `json:"key_prefix"`
			KeyHash   string `json:"key_hash"`
		} `json:"keys"`
		IsPro  bool `json:"is_pro"`
		Limits struct {
			FreeHourlyRequests int `json:"free_hourly_requests"`
			FreeBurstPerMinute int `json:"free_burst_per_minute"`
			ProHourlyRequests  int `json:"pro_hourly_requests"`
			ProBurstPerMinute  int `json:"pro_burst_per_minute"`
		} `json:"limits"`
	}
	if err := json.NewDecoder(w2.Body).Decode(&listed); err != nil {
		t.Fatalf("failed to decode list response: %v", err)
	}
	if len(listed.Keys) != 1 || listed.Keys[0].ID != created.ID || listed.Keys[0].Name != "ci-bot" {
		t.Fatalf("expected one key matching creation, got %+v", listed.Keys)
	}
	if listed.Keys[0].KeyHash != "" {
		t.Fatalf("raw/hash key material must not be listed, got %q", listed.Keys[0].KeyHash)
	}
	if listed.Limits.FreeHourlyRequests != middleware.FreeAPIKeyHourlyLimit ||
		listed.Limits.ProHourlyRequests != middleware.ProAPIKeyHourlyLimit {
		t.Fatalf("unexpected tier limits in list response: %+v", listed.Limits)
	}

	// Revoke then confirm the key stops authenticating (immediate effect).
	w3 := httptest.NewRecorder()
	r.ServeHTTP(w3, httptest.NewRequest("DELETE", "/user/api-keys/"+strconv.FormatInt(created.ID, 10), nil))
	if w3.Code != http.StatusOK {
		t.Fatalf("expected 200 on revoke, got %d: %s", w3.Code, w3.Body.String())
	}

	w4 := httptest.NewRecorder()
	req4 := httptest.NewRequest("GET", "/repos", nil)
	req4.Header.Set("Authorization", "Bearer "+created.Key)
	r.ServeHTTP(w4, req4)
	if w4.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401 after revocation, got %d", w4.Code)
	}
	if !strings.Contains(w4.Body.String(), "ERR_INVALID_API_KEY") {
		t.Fatalf("expected ERR_INVALID_API_KEY code, got: %s", w4.Body.String())
	}

	// Double revoke -> 404.
	w5 := httptest.NewRecorder()
	r.ServeHTTP(w5, httptest.NewRequest("DELETE", "/user/api-keys/"+strconv.FormatInt(created.ID, 10), nil))
	if w5.Code != http.StatusNotFound {
		t.Fatalf("expected 404 on double revoke, got %d", w5.Code)
	}
}

func TestAPIKeyAuthMiddleware(t *testing.T) {
	r, keyRepo, _ := newAPIKeyTestRouter(t)

	rawKey := middleware.APIKeyPrefix + strings.Repeat("ab3f", 10)
	if _, err := keyRepo.CreateAPIKey(t.Context(), 42, "bot", crypto.HashSHA256(rawKey, []byte(testKeySalt)), rawKey[:12]); err != nil {
		t.Fatalf("failed to seed key: %v", err)
	}

	// No Authorization header passes through to downstream handlers.
	w := httptest.NewRecorder()
	r.ServeHTTP(w, httptest.NewRequest("GET", "/repos", nil))
	if w.Code != http.StatusOK {
		t.Fatalf("expected pass-through without auth header, got %d", w.Code)
	}

	// Malformed scheme and non-odk bearer both fail closed.
	for name, header := range map[string]string{
		"wrong scheme": "Basic dXNlcjpwYXNz",
		"jwt bearer":   "Bearer some.jwt.token",
	} {
		wm := httptest.NewRecorder()
		req := httptest.NewRequest("GET", "/repos", nil)
		req.Header.Set("Authorization", header)
		r.ServeHTTP(wm, req)
		if wm.Code != http.StatusUnauthorized || !strings.Contains(wm.Body.String(), "ERR_MALFORMED_AUTH_HEADER") {
			t.Fatalf("%s: expected 401 ERR_MALFORMED_AUTH_HEADER, got %d: %s", name, wm.Code, wm.Body.String())
		}
	}

	// Unknown odk_ key fails with a stable code.
	wu := httptest.NewRecorder()
	reqU := httptest.NewRequest("GET", "/repos", nil)
	reqU.Header.Set("Authorization", "Bearer odk_deadbeefdeadbeefdead")
	r.ServeHTTP(wu, reqU)
	if wu.Code != http.StatusUnauthorized || !strings.Contains(wu.Body.String(), "ERR_INVALID_API_KEY") {
		t.Fatalf("expected 401 ERR_INVALID_API_KEY for unknown key, got %d: %s", wu.Code, wu.Body.String())
	}

	// Valid key authenticates, sets the user identity, and exposes rate limit headers.
	wv := httptest.NewRecorder()
	reqV := httptest.NewRequest("GET", "/repos", nil)
	reqV.Header.Set("Authorization", "Bearer "+rawKey)
	r.ServeHTTP(wv, reqV)
	if wv.Code != http.StatusOK {
		t.Fatalf("expected 200 with valid api key, got %d: %s", wv.Code, wv.Body.String())
	}
	if !strings.Contains(wv.Body.String(), `"user_id":42`) {
		t.Fatalf("expected downstream user identity, got: %s", wv.Body.String())
	}
	if !strings.Contains(wv.Header().Get("X-RateLimit-Limit"), "/h;") {
		t.Fatalf("expected X-RateLimit-Limit header, got %q", wv.Header().Get("X-RateLimit-Limit"))
	}

	// last_used_at is touched asynchronously.
	time.Sleep(50 * time.Millisecond)
	keys, err := keyRepo.ListAPIKeys(t.Context(), 42)
	if err != nil || len(keys) != 1 {
		t.Fatalf("failed to list seeded keys: %v", err)
	}
}
