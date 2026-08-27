package handler_test

import (
	"context"
	"encoding/xml"
	"net/http"
	"net/http/httptest"
	"strconv"
	"strings"
	"testing"
	"time"

	"github.com/abhisheksoni27/opendoor/internal/db"
	"github.com/abhisheksoni27/opendoor/internal/handler"
	"github.com/abhisheksoni27/opendoor/internal/middleware"
	"github.com/abhisheksoni27/opendoor/internal/repository"
	"github.com/gin-gonic/gin"
	"github.com/jmoiron/sqlx"
	"github.com/valkey-io/valkey-go"
	_ "modernc.org/sqlite"
)

func setupFeedTestDB(t *testing.T) (*sqlx.DB, repository.GFIRepository, repository.RepoRepository) {
	t.Helper()
	database, err := sqlx.Open("sqlite", ":memory:")
	if err != nil {
		t.Fatalf("open db: %v", err)
	}
	if err := db.AutoMigrate(database); err != nil {
		t.Fatalf("automigrate: %v", err)
	}
	now := time.Now().UTC()
	database.MustExec(`INSERT INTO repositories (id, full_name, owner, name, language, stars, updated_at) VALUES (?,?,?,?,?,?,?)`,
		"r1", "owner/repo1", "owner", "repo1", "Go", 10, now)
	database.MustExec(`INSERT INTO repositories (id, full_name, owner, name, language, stars, updated_at) VALUES (?,?,?,?,?,?,?)`,
		"r2", "owner/repo2", "owner", "repo2", "Rust", 5, now)
	database.MustExec(`INSERT INTO repository_topics (topic, repository_id) VALUES (?,?)`, "cli", "r1")
	// Fresh issue (within 7 days) -> eligible for the feed.
	database.MustExec(`INSERT INTO repo_good_first_issues (repository_id, issue_number, title, body_text, url, comments_count, labels_json, quality_score, bounty_status, created_at, synced_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
		"r1", 1, "Add CLI flag <x>", "Help wanted body", "https://github.com/owner/repo1/issues/1", 0, "[]", 80, "active", now.Add(-time.Hour), now)
	// Stale issue (older than 7 days) -> excluded by inclusion window (AC3).
	database.MustExec(`INSERT INTO repo_good_first_issues (repository_id, issue_number, title, body_text, url, comments_count, labels_json, quality_score, bounty_status, created_at, synced_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
		"r1", 2, "Old issue", "stale", "https://github.com/owner/repo1/issues/2", 0, "[]", 70, "active", now.Add(-30*24*time.Hour), now)

	gfiRepo := repository.NewGFIRepository(database)
	repoStore := repository.NewRepoRepository(database)
	return database, gfiRepo, repoStore
}

func feedTestEngine(t *testing.T, gfiRepo repository.GFIRepository, repoStore repository.RepoRepository, client valkey.Client) *gin.Engine {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.Use(func(c *gin.Context) {
		c.Set("cache", client)
		c.Next()
	})
	rl := middleware.FeedCacheRateLimit(60, time.Minute, 5*time.Minute)
	r.GET("/api/feeds/gfi.rss", rl, handler.GFIFeedRSS(gfiRepo, repoStore))
	r.GET("/api/feeds/gfi.atom", rl, handler.GFIFeedAtom(gfiRepo, repoStore))
	r.GET("/api/feeds/gfi.ics", rl, handler.GFIFeedICS(gfiRepo, repoStore))
	return r
}

func TestGFIFeeds_FormatsAndContentTypes(t *testing.T) {
	database, gfiRepo, repoStore := setupFeedTestDB(t)
	defer database.Close()

	client, err := valkey.NewClient(valkey.ClientOption{InitAddress: []string{"localhost:6379"}})
	if err != nil {
		t.Skip("valkey unavailable")
	}
	defer client.Close()
	client.Do(context.Background(), client.B().Flushdb().Build())

	r := feedTestEngine(t, gfiRepo, repoStore, client)

	for _, tc := range []struct {
		path        string
		contentType string
		marker      string
	}{
		{"/api/feeds/gfi.rss", "application/rss+xml", "<rss"},
		{"/api/feeds/gfi.atom", "application/atom+xml", "<feed"},
		{"/api/feeds/gfi.ics", "text/calendar", "BEGIN:VCALENDAR"},
	} {
		rec := httptest.NewRecorder()
		req := httptest.NewRequest(http.MethodGet, tc.path, nil)
		r.ServeHTTP(rec, req)
		if rec.Code != http.StatusOK {
			t.Fatalf("%s: expected 200, got %d", tc.path, rec.Code)
		}
		if ct := rec.Header().Get("Content-Type"); ct != tc.contentType {
			t.Fatalf("%s: expected Content-Type %q, got %q", tc.path, tc.contentType, ct)
		}
		if !strings.Contains(rec.Body.String(), tc.marker) {
			t.Fatalf("%s: missing %q in body", tc.path, tc.marker)
		}
	}
}

func TestGFIFeeds_FiltersAndInclusionWindow(t *testing.T) {
	database, gfiRepo, repoStore := setupFeedTestDB(t)
	defer database.Close()
	client, err := valkey.NewClient(valkey.ClientOption{InitAddress: []string{"localhost:6379"}})
	if err != nil {
		t.Skip("valkey unavailable")
	}
	defer client.Close()
	client.Do(context.Background(), client.B().Flushdb().Build())

	r := feedTestEngine(t, gfiRepo, repoStore, client)

	// lang=go (valid) -> fresh Go issue present.
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/api/feeds/gfi.rss?lang=go", nil))
	if rec.Code != 200 || !strings.Contains(rec.Body.String(), "Add CLI flag") {
		t.Fatalf("lang=go feed missing fresh issue: code=%d body=%s", rec.Code, rec.Body.String())
	}
	// Stale issue must never appear (7-day window).
	if strings.Contains(rec.Body.String(), "Old issue") {
		t.Fatalf("stale issue leaked past inclusion window")
	}
	// lang=boguslang (invalid allowlist) -> fallback no filter -> still returns fresh issue.
	rec = httptest.NewRecorder()
	r.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/api/feeds/gfi.rss?lang=boguslang", nil))
	if rec.Code != 200 || !strings.Contains(rec.Body.String(), "Add CLI flag") {
		t.Fatalf("invalid lang should fall back to no filter")
	}
	// topic=cli -> fresh issue; topic=bogus -> fallback no filter.
	rec = httptest.NewRecorder()
	r.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/api/feeds/gfi.atom?topic=cli", nil))
	if rec.Code != 200 || !strings.Contains(rec.Body.String(), "Add CLI flag") {
		t.Fatalf("topic=cli should match")
	}
	// repo filter
	rec = httptest.NewRecorder()
	r.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/api/feeds/gfi.ics?repo=owner/repo1", nil))
	if rec.Code != 200 || !strings.Contains(rec.Body.String(), "gfi-1@opendoor.local") {
		t.Fatalf("repo filter failed: %s", rec.Body.String())
	}
}

func TestGFIFeeds_EmptyIsWellFormed(t *testing.T) {
	database, gfiRepo, repoStore := setupFeedTestDB(t)
	defer database.Close()
	client, err := valkey.NewClient(valkey.ClientOption{InitAddress: []string{"localhost:6379"}})
	if err != nil {
		t.Skip("valkey unavailable")
	}
	defer client.Close()
	client.Do(context.Background(), client.B().Flushdb().Build())

	r := feedTestEngine(t, gfiRepo, repoStore, client)
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/api/feeds/gfi.rss?lang=python", nil))
	if rec.Code != 200 {
		t.Fatalf("empty feed should be 200, got %d", rec.Code)
	}
	// Must be well-formed XML even with zero items.
	if err := xml.Unmarshal(rec.Body.Bytes(), &struct{}{}); err != nil {
		t.Fatalf("empty feed not valid xml: %v", err)
	}
}

// TestGFIFeeds_CacheHitPrecedence proves AC5/AC6: under an exhausted bucket a
// cache hit still returns 200, while a forced cache miss returns 429.
func TestGFIFeeds_CacheHitPrecedence(t *testing.T) {
	database, gfiRepo, repoStore := setupFeedTestDB(t)
	defer database.Close()
	client, err := valkey.NewClient(valkey.ClientOption{InitAddress: []string{"localhost:6379"}})
	if err != nil {
		t.Skip("valkey unavailable")
	}
	defer client.Close()
	client.Do(context.Background(), client.B().Flushdb().Build())

	r := feedTestEngine(t, gfiRepo, repoStore, client)

	// Prime ONE specific key so it is cached (consumes 1 token).
	cachedKey := "/api/feeds/gfi.rss?cached=1"
	seed := httptest.NewRecorder()
	r.ServeHTTP(seed, httptest.NewRequest(http.MethodGet, cachedKey, nil))
	if seed.Code != 200 {
		t.Fatalf("seed request expected 200, got %d", seed.Code)
	}
	// Consume the remaining 59 tokens with 59 OTHER distinct-key cache misses.
	for i := 0; i < 59; i++ {
		rec := httptest.NewRecorder()
		r.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/api/feeds/gfi.rss?exhaust="+itoa(i), nil))
		if rec.Code != 200 {
			t.Fatalf("exhaust request %d expected 200 (token available), got %d", i, rec.Code)
		}
	}
	// Bucket now empty (60 tokens spent). A forced cache MISS must return 429.
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/api/feeds/gfi.rss?exhaust=miss", nil))
	if rec.Code != http.StatusTooManyRequests {
		t.Fatalf("forced cache miss expected 429, got %d", rec.Code)
	}
	// Replay the cached key: served from cache and does NOT consume a token,
	// so it returns 200 even with an exhausted bucket (cache-hit precedence).
	hit := httptest.NewRecorder()
	r.ServeHTTP(hit, httptest.NewRequest(http.MethodGet, cachedKey, nil))
	if hit.Code != 200 {
		t.Fatalf("cache hit under exhausted bucket expected 200, got %d", hit.Code)
	}
	if hit.Header().Get("X-Cache") != "HIT" {
		t.Fatalf("expected X-Cache: HIT on cached replay")
	}
}

func itoa(i int) string {
	return strconv.Itoa(i)
}
