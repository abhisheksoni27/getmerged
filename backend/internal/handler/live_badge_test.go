package handler_test

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/abhisheksoni27/opendoor/internal/handler"
	"github.com/abhisheksoni27/opendoor/internal/repository"
	"github.com/gin-gonic/gin"
)

func TestLiveBadgeACs(t *testing.T) {
	gin.SetMode(gin.TestMode)
	database := setupBadgeTestDB(t)
	defer database.Close()

	database.MustExec(`INSERT INTO repositories (id, full_name, owner, name, language, stars, updated_at) VALUES ('b1', 'Gin-Gonic/Gin', 'gin-gonic', 'gin', 'Go', 1, ?)`, time.Now())
	database.MustExec(`INSERT INTO latest_snapshots (repository_id, snapshot_date, c_rank_tier, c_rank_score, response_p50_hours, updated_at) VALUES ('b1', '2026-01-01', 'A', 90.0, 4.25, ?)`, time.Now())

	store := repository.NewRepoRepository(database)
	r := gin.New()
	r.GET("/api/badge/:owner/:repo", handler.GetLiveBadgeSVG(store, "https://getmerged.abhishekco.de"))

	// AC1+AC3: graded badge, exact headers, median PR segment
	w := httptest.NewRecorder()
	r.ServeHTTP(w, httptest.NewRequest("GET", "/api/badge/gin-gonic/gin", nil))
	if w.Code != http.StatusOK {
		t.Fatalf("want 200 got %d", w.Code)
	}
	if ct := w.Header().Get("Content-Type"); ct != "image/svg+xml" {
		t.Fatalf("Content-Type = %q", ct)
	}
	if cc := w.Header().Get("Cache-Control"); cc != "public, max-age=300, s-maxage=300" {
		t.Fatalf("Cache-Control = %q", cc)
	}
	body := w.Body.String()
	if !strings.Contains(body, "<svg") || !strings.Contains(body, ">very welcoming · median PR: 4.2h<") {
		t.Fatalf("badge body wrong: %s", body)
	}
	if !strings.Contains(body, `fill="#16a34a"`) {
		t.Fatalf("tier color missing: %s", body)
	}

	// AC2: case-insensitive canonical match + lowercase normalization
	w2 := httptest.NewRecorder()
	r.ServeHTTP(w2, httptest.NewRequest("GET", "/api/badge/GIN-GONIC/GIN", nil))
	if w2.Code != http.StatusOK || !strings.Contains(w2.Body.String(), ">very welcoming · median PR: 4.2h<") {
		t.Fatalf("case-insensitive lookup failed: %d %s", w2.Code, w2.Body.String())
	}
	if !strings.Contains(w2.Body.String(), "href=\"https://getmerged.abhishekco.de/Gin-Gonic/Gin#raise-your-rank\"") {
		t.Fatalf("canonical playbook link missing: %s", w2.Body.String())
	}

	// AC2: invalid segments -> rejected (%2F decodes to '/' and cannot even
	// route to the handler; spaces reach the handler and fail the regex).
	w6 := httptest.NewRecorder()
	r.ServeHTTP(w6, httptest.NewRequest("GET", "/api/badge/a%2Fb/c", nil))
	if w6.Code == http.StatusOK {
		t.Fatalf("encoded slash must be rejected")
	}
	for _, p := range []string{"/api/badge/bad%20name/x", "/api/badge/" + strings.Repeat("x", 101) + "/y"} {
		w3 := httptest.NewRecorder()
		r.ServeHTTP(w3, httptest.NewRequest("GET", p, nil))
		if w3.Code != http.StatusNotFound || !strings.Contains(w3.Body.String(), "<svg") {
			t.Fatalf("invalid seg %q: code=%d", p, w3.Code)
		}
	}
	// dots allowed
	w4 := httptest.NewRecorder()
	r.ServeHTTP(w4, httptest.NewRequest("GET", "/api/badge/.github/.github", nil))
	if !strings.Contains(w4.Body.String(), "unranked") {
		t.Fatalf("dot seg should be neutral fallback: %d %s", w4.Code, w4.Body.String())
	}

	// AC4: unknown repo -> neutral gray fallback SVG, still 200, never 500
	w5 := httptest.NewRecorder()
	r.ServeHTTP(w5, httptest.NewRequest("GET", "/api/badge/nope/nothere", nil))
	if w5.Code != http.StatusOK || !strings.Contains(w5.Body.String(), "#9ca3af") {
		t.Fatalf("unknown repo fallback wrong: %d", w5.Code)
	}
}
