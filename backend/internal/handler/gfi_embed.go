package handler

import (
	"bytes"
	"encoding/json"
	"net/http"
	"os"
	"regexp"
	"strings"
	"sync"
	"time"

	ghclient "github.com/abhisheksoni27/opendoor/internal/github"
	"github.com/gin-gonic/gin"
	"golang.org/x/sync/singleflight"
	"html/template"
)

// gfiEmbedCacheTTL is the server-side cache lifetime for a rendered embed card.
// It is shared with the client poll interval (AC2/AC3): the client only
// re-polls after the cache would have expired, so GitHub is hit at most once
// per owner/name per TTL per instance.
const gfiEmbedCacheTTL = 300 * time.Second

// gfiEmbedPollInterval is the single source of truth for the client-side poll
// cadence (AC3). It is pinned in one place and pushed into the rendered card;
// there is no <meta http-equiv="refresh"> anywhere, so there is no ambiguity
// about how the card refreshes.
const gfiEmbedPollInterval = 300

// gfiEmbedSegmentRe validates owner/repo path segments before any lookup (AC1).
// Mirrors the badge validator: dots allowed (e.g. ".github"); "/" from %2F and
// everything else is rejected to avoid path traversal.
var gfiEmbedSegmentRe = regexp.MustCompile(`^[A-Za-z0-9._-]{1,100}$`)

// embedFrameAncestors is the configured CSP frame-ancestors allowlist (AC6).
// Default 'self'; set EMBED_FRAME_ANCESTORS to a space-separated origin list
// (e.g. "https://example.com https://docs.example.com"). An explicitly empty
// value denies framing entirely.
var embedFrameAncestors = func() string {
	if v := os.Getenv("EMBED_FRAME_ANCESTORS"); v != "" {
		return v
	}
	return "self"
}()

// --- single-instance in-memory cache + single-flight -----------------------
// NOTE (AC2): cache + single-flight are per-process. Rate protection therefore
// holds per instance only. Multi-instance deployments must front this with a
// shared store (Redis/Valkey) and a shared GitHub token bucket — tracked as a
// follow-up. The single-flight group additionally collapses concurrent misses
// for the same owner/name into a single GitHub call.

var (
	gfiEmbedCacheMu sync.Mutex
	gfiEmbedCache   = map[string]gfiEmbedCacheEntry{}
	gfiEmbedSF      singleflight.Group
)

type gfiEmbedCacheEntry struct {
	html      string
	expiresAt time.Time
}

// --- card data model --------------------------------------------------------

type gfiEmbedState int

const (
	stateOK gfiEmbedState = iota
	stateEmpty
	stateUnavailable
	stateRateLimited
	stateRepoUnavailable
)

func stateString(s gfiEmbedState) string {
	switch s {
	case stateOK:
		return "ok"
	case stateEmpty:
		return "empty"
	case stateRateLimited:
		return "rate_limited"
	case stateRepoUnavailable:
		return "repo_unavailable"
	default:
		return "unavailable"
	}
}

type gfiEmbedLabel struct {
	Name  string
	Color string
}

type gfiEmbedIssue struct {
	Number int
	Title  string
	URL    string
	Labels []gfiEmbedLabel
}

type gfiEmbedData struct {
	Owner        string
	Name         string
	FullName     string
	Issues       []gfiEmbedIssue
	Count        int
	State        string
	GfiPageURL   string
	PollInterval int
	CRankBrand   string
}

// gfiEmbedTemplate renders the full card document. Every free-text field
// (titles, label names, urls, brand) flows through template actions, so
// html/template contextually escapes them — no manual string concat, no XSS
// surface (AC4).
var gfiEmbedTemplate = template.Must(template.New("gfiEmbed").Parse(`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{{.CRankBrand}} · Good First Issues for {{.FullName}}</title>
<script>
  // AC3: the only refresh mechanism. One pinned interval; no meta-refresh.
  setInterval(function(){ location.reload(); }, {{.PollInterval}} * 1000);
</script>
<style>
  .gfi-card{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;max-width:360px;margin:0 auto;padding:14px 16px;background:#0b0b0f;color:#e5e7eb;border:1px solid #27272a;border-radius:12px;box-sizing:border-box}
  .gfi-head{display:flex;align-items:baseline;gap:8px;margin-bottom:10px}
  .gfi-brand{font-weight:700;color:#22d3ee;font-size:13px;letter-spacing:.3px}
  .gfi-sub{font-size:12px;color:#a1a1aa}
  .gfi-count{font-size:12px;color:#d4d4d8;margin:0 0 8px}
  .gfi-list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:8px}
  .gfi-item{display:flex;flex-direction:column;gap:4px;padding:8px 10px;background:#18181b;border:1px solid #27272a;border-radius:8px}
  .gfi-link{color:#fafafa;text-decoration:none;font-size:13px;font-weight:600;line-height:1.35}
  .gfi-link:hover{text-decoration:underline}
  .gfi-num{font-size:11px;color:#71717a}
  .gfi-labels{display:flex;flex-wrap:wrap;gap:4px;margin-top:2px}
  .gfi-label{font-size:10px;line-height:1;padding:3px 6px;border-radius:999px;color:#fff;font-weight:600}
  .gfi-empty,.gfi-warn{font-size:13px;color:#d4d4d8;margin:6px 0 10px}
  .gfi-warn{color:#fbbf24}
  .gfi-foot{margin-top:12px;padding-top:10px;border-top:1px solid #27272a}
  .gfi-cta{font-size:12px;font-weight:600;color:#22d3ee;text-decoration:none}
  .gfi-cta:hover{text-decoration:underline}
</style>
</head>
<body>
<div class="gfi-card">
  <div class="gfi-head">
    <span class="gfi-brand">{{.CRankBrand}}</span>
    <span class="gfi-sub">Good First Issues</span>
  </div>
  {{if eq .State "ok"}}
  <p class="gfi-count">{{.Count}} open good first issue{{if ne .Count 1}}s{{end}} in {{.FullName}}</p>
  <ul class="gfi-list">
    {{range .Issues}}
    <li class="gfi-item">
      <a class="gfi-link" href="{{.URL}}" target="_blank" rel="noopener noreferrer">{{.Title}}</a>
      <span class="gfi-num">#{{.Number}}</span>
      <span class="gfi-labels">
        {{range .Labels}}<span class="gfi-label" style="background-color:#{{.Color}}">{{.Name}}</span>{{end}}
      </span>
    </li>
    {{end}}
  </ul>
  {{else if eq .State "empty"}}
  <p class="gfi-empty">No good first issues right now</p>
  {{else if eq .State "rate_limited"}}
  <p class="gfi-warn">Rate limited — retry later</p>
  {{else if eq .State "repo_unavailable"}}
  <p class="gfi-warn">Repository unavailable</p>
  {{else}}
  <p class="gfi-warn">Unavailable</p>
  {{end}}
  <div class="gfi-foot">
    <a class="gfi-cta" href="{{.GfiPageURL}}" target="_blank" rel="noopener noreferrer">Find more on {{.CRankBrand}}</a>
  </div>
</div>
</body>
</html>`))

// parseGfiLabels decodes the GitHub label JSON attached to each issue into a
// small safe struct. Malformed input yields no labels (never an error page).
func parseGfiLabels(raw string) []gfiEmbedLabel {
	if raw == "" {
		return nil
	}
	var arr []struct {
		Name  string `json:"name"`
		Color string `json:"color"`
	}
	if err := json.Unmarshal([]byte(raw), &arr); err != nil {
		return nil
	}
	out := make([]gfiEmbedLabel, 0, len(arr))
	for _, l := range arr {
		color := l.Color
		if color == "" {
			color = "6b7280"
		}
		out = append(out, gfiEmbedLabel{Name: l.Name, Color: color})
	}
	return out
}

// classifyGfiErr maps a GitHub fetch error to one of the distinct embed states
// (AC5). GraphQL always returns HTTP 200, so rate-limit / not-found / forbidden
// surface as body errors; we match on the stable message fragments GitHub emits.
func classifyGfiErr(err error) gfiEmbedState {
	if err == nil {
		return stateOK
	}
	msg := strings.ToLower(err.Error())
	switch {
	case strings.Contains(msg, "rate limit"):
		return stateRateLimited
	case strings.Contains(msg, "could not resolve"), strings.Contains(msg, "not accessible by integration"):
		// Private OR not-found are both GraphQL errors we cannot distinguish
		// unauthenticated; collapse to a single safe fallback (AC5).
		return stateRepoUnavailable
	default:
		return stateUnavailable
	}
}

// renderGfiEmbedCard fetches live GFI data (the gfi_handler pipeline, served
// directly from GitHub) and renders the card HTML for the given repo. It never
// returns an error: every failure path degrades to a distinct safe state.
func renderGfiEmbedCard(gh *ghclient.Client, owner, name, appBaseURL string) string {
	fullName := strings.ToLower(owner) + "/" + strings.ToLower(name)

	data := gfiEmbedData{
		Owner:        owner,
		Name:         name,
		FullName:     fullName,
		Issues:       nil,
		Count:        0,
		State:        stateString(stateUnavailable),
		GfiPageURL:   strings.TrimSuffix(appBaseURL, "/") + "/" + fullName + "?utm_source=opendoor-embed&utm_medium=gfi-widget&utm_campaign=good-first-issues",
		PollInterval: gfiEmbedPollInterval,
		CRankBrand:   "C-Rank™",
	}

	state := stateUnavailable
	if gh != nil {
		// Best-effort guard: if we already know we are rate limited, skip the
		// call so the client's internal sleep never blocks the embed render.
		if rl := gh.GetRateLimitInfo(); rl.Remaining == 0 {
			if resetAt, err := time.Parse(time.RFC3339, rl.ResetAt); err == nil && time.Now().UTC().Before(resetAt) {
				state = stateRateLimited
			}
		}

		if state != stateRateLimited {
			raw, _, ferr := gh.FetchGoodFirstIssuesList(owner, name, 8)
			if ferr != nil {
				state = classifyGfiErr(ferr)
			} else {
				issues := make([]gfiEmbedIssue, 0, len(raw))
				for _, it := range raw {
					issues = append(issues, gfiEmbedIssue{
						Number: it.Number,
						Title:  it.Title,
						URL:    it.URL,
						Labels: parseGfiLabels(it.LabelsJSON),
					})
				}
				if len(issues) == 0 {
					state = stateEmpty
				} else {
					state = stateOK
					data.Issues = issues
					data.Count = len(issues)
				}
			}
		}
	}
	data.State = stateString(state)

	var buf bytes.Buffer
	if err := gfiEmbedTemplate.Execute(&buf, data); err != nil {
		// Template execution must never 500 (AC4): minimal static fallback.
		return `<!doctype html><html><body><div class="gfi-card"><span class="gfi-brand">C-Rank&trade;</span> <span class="gfi-warn">Unavailable</span></div></body></html>`
	}
	return buf.String()
}

// setEmbedFrameCSP applies the frame-ancestors policy (AC6). We never use
// X-Frame-Options: ALLOWALL. When the allowlist is empty we deny framing.
func setEmbedFrameCSP(c *gin.Context) {
	if embedFrameAncestors == "" {
		c.Header("Content-Security-Policy", "frame-ancestors 'none'")
		c.Header("X-Frame-Options", "DENY")
		return
	}
	c.Header("Content-Security-Policy", "frame-ancestors "+embedFrameAncestors)
	if embedFrameAncestors == "self" {
		c.Header("X-Frame-Options", "SAMEORIGIN")
	}
}

// GetGFIEmbedCard handles GET /embed/gfi/:owner/:name (AC1). It returns an
// HTML card rendered from the live gfi_handler data pipeline, served through a
// per-instance in-memory cache with single-flight fetch (AC2) so concurrent
// hits collapse into one GitHub call per TTL window.
func GetGFIEmbedCard(gh *ghclient.Client, appBaseURL string) gin.HandlerFunc {
	return func(c *gin.Context) {
		owner, name := c.Param("owner"), c.Param("name")
		if !gfiEmbedSegmentRe.MatchString(owner) || !gfiEmbedSegmentRe.MatchString(name) {
			// Invalid segment: safe 404, no repo existence disclosure (AC5).
			c.Header("Content-Type", "text/html; charset=utf-8")
			setEmbedFrameCSP(c)
			c.Data(http.StatusNotFound, "text/html; charset=utf-8",
				[]byte(`<!doctype html><html><body><div class="gfi-card"><span class="gfi-warn">Repository unavailable</span></div></body></html>`))
			return
		}

		key := strings.ToLower(owner) + "/" + strings.ToLower(name)

		gfiEmbedCacheMu.Lock()
		if e, ok := gfiEmbedCache[key]; ok && time.Now().Before(e.expiresAt) {
			html := e.html
			gfiEmbedCacheMu.Unlock()
			c.Header("Content-Type", "text/html; charset=utf-8")
			c.Header("Cache-Control", "public, max-age=300")
			setEmbedFrameCSP(c)
			c.Data(http.StatusOK, "text/html; charset=utf-8", []byte(html))
			return
		}
		gfiEmbedCacheMu.Unlock()

		// Single-flight: only the first caller for this key within the window
		// hits GitHub; the rest share the rendered result.
		v, _, _ := gfiEmbedSF.Do(key, func() (interface{}, error) {
			html := renderGfiEmbedCard(gh, owner, name, appBaseURL)
			gfiEmbedCacheMu.Lock()
			// Cap memory: drop expired entries once the map gets large.
			if len(gfiEmbedCache) >= 2000 {
				now := time.Now()
				for k, e := range gfiEmbedCache {
					if now.After(e.expiresAt) {
						delete(gfiEmbedCache, k)
					}
				}
			}
			gfiEmbedCache[key] = gfiEmbedCacheEntry{html: html, expiresAt: time.Now().Add(gfiEmbedCacheTTL)}
			gfiEmbedCacheMu.Unlock()
			return html, nil
		})

		html, _ := v.(string)
		c.Header("Content-Type", "text/html; charset=utf-8")
		c.Header("Cache-Control", "public, max-age=300, stale-while-revalidate=600")
		setEmbedFrameCSP(c)
		c.Data(http.StatusOK, "text/html; charset=utf-8", []byte(html))
	}
}
