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

	// AC1+AC3: graded badge, exact headers, verdict with score segment
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
	if !strings.Contains(body, "<svg") || !strings.Contains(body, ">very welcoming (90)<") {
		t.Fatalf("badge body wrong: %s", body)
	}
	if !strings.Contains(body, `fill="#16a34a"`) {
		t.Fatalf("tier color missing: %s", body)
	}

	// AC2: case-insensitive canonical match + lowercase normalization
	w2 := httptest.NewRecorder()
	r.ServeHTTP(w2, httptest.NewRequest("GET", "/api/badge/GIN-GONIC/GIN", nil))
	if w2.Code != http.StatusOK || !strings.Contains(w2.Body.String(), ">very welcoming (90)<") {
		t.Fatalf("case-insensitive lookup failed: %d %s", w2.Code, w2.Body.String())
	}
	if !strings.HasPrefix(strings.TrimSpace(w2.Body.String()), "<svg") || strings.Contains(w2.Body.String(), "<a ") {
		t.Fatalf("badge must be pure SVG without HTML anchor wrapping: %s", w2.Body.String())
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

	// AC4: unknown repo -> neutral fallback SVG, still 200, never 500
	w5 := httptest.NewRecorder()
	r.ServeHTTP(w5, httptest.NewRequest("GET", "/api/badge/nope/nothere", nil))
	if w5.Code != http.StatusOK || !strings.Contains(w5.Body.String(), "#0284c7") {
		t.Fatalf("unknown repo fallback wrong: %d", w5.Code)
	}

	// AC5: Test S-Tier rendering (phi repo scenario)
	database.MustExec(`INSERT INTO repositories (id, full_name, owner, name, language, stars, updated_at) VALUES ('s1', 'pulseaiclub/phi', 'pulseaiclub', 'phi', 'Go', 198, ?)`, time.Now())
	database.MustExec(`INSERT INTO latest_snapshots (repository_id, snapshot_date, c_rank_tier, c_rank_score, response_p50_hours, updated_at) VALUES ('s1', '2026-08-30', 'S', 73.2, 0.05, ?)`, time.Now())

	wS := httptest.NewRecorder()
	reqS := httptest.NewRequest("GET", "/api/badge/pulseaiclub/phi", nil)
	reqS.Header.Set("User-Agent", "GitHub-Camo")
	r.ServeHTTP(wS, reqS)
	if wS.Code != http.StatusOK {
		t.Fatalf("S-tier badge want 200 got %d", wS.Code)
	}
	bodyS := wS.Body.String()
	if !strings.Contains(bodyS, `fill="#059669"`) {
		t.Fatalf("S-tier emerald color missing: %s", bodyS)
	}
	if !strings.Contains(bodyS, "super welcoming (73)") {
		t.Fatalf("S-tier message missing: %s", bodyS)
	}
	if !strings.Contains(bodyS, "Get<tspan fill=\"#10b981\">Merged</tspan>") {
		t.Fatalf("GetMerged brand logo/text missing in SVG: %s", bodyS)
	}

	// AC6: Test B, C, D tier badges
	tiers := []struct {
		tier     string
		color    string
		score    float64
		expected string
	}{
		{"B", "#d97706", 62.0, "welcoming (62)"},
		{"C", "#ea580c", 45.0, "selective (45)"},
		{"D", "#dc2626", 28.0, "strict reviews (28)"},
	}
	for _, tc := range tiers {
		id := "t_" + tc.tier
		database.MustExec(`INSERT INTO repositories (id, full_name, owner, name, language, stars, updated_at) VALUES (?, ?, 'testowner', ?, 'Go', 50, ?)`, id, "testowner/"+tc.tier, tc.tier, time.Now())
		database.MustExec(`INSERT INTO latest_snapshots (repository_id, snapshot_date, c_rank_tier, c_rank_score, response_p50_hours, updated_at) VALUES (?, '2026-08-30', ?, ?, 1.0, ?)`, id, tc.tier, tc.score, time.Now())

		wT := httptest.NewRecorder()
		r.ServeHTTP(wT, httptest.NewRequest("GET", "/api/badge/testowner/"+tc.tier, nil))
		if wT.Code != http.StatusOK {
			t.Fatalf("tier %s want 200 got %d", tc.tier, wT.Code)
		}
		bodyT := wT.Body.String()
		if !strings.Contains(bodyT, tc.color) || !strings.Contains(bodyT, tc.expected) {
			t.Fatalf("tier %s badge content wrong: %s", tc.tier, bodyT)
		}
	}
}
