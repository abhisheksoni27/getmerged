package handler

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"html/template"
	"io"
	"net/http"
	"net/url"
	"os"
	"regexp"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/abhisheksoni27/opendoor/internal/config"
	"github.com/gin-gonic/gin"
	"golang.org/x/sync/singleflight"
)

// prForecastBaseURL is the canonical host used in generated snippets, badge
// links and the deep-dive readiness page (AC1/AC8). Override via
// OPENDOOR_APP_BASE_URL if the deployment is served from a different origin.
var prForecastBaseURL = func() string {
	if v := strings.TrimSpace(os.Getenv("OPENDOOR_APP_BASE_URL")); v != "" {
		return strings.TrimRight(v, "/")
	}
	return "https://opendoor.app"
}()

// prForecastSlugRe validates owner/repo query params (AC4): ^[\w.-]+$.
// Go's \w == [0-9A-Za-z_]; dots and hyphens are explicitly allowed.
var prForecastSlugRe = regexp.MustCompile(`^[\w.-]+$`)

// ghHTTPClient is shared for GitHub REST lookups (badge + page). 8s timeout is
// well under the camo/github embedding tolerance; failures degrade to N/A.
var ghHTTPClient = &http.Client{Timeout: 8 * time.Second}

// --- server-side 60s GitHub response cache (AC5/AC6) -----------------------
// A single process-level cache keyed by (token-present, url). This respects
// GitHub's rate limit and collapses concurrent camo requests for the same PR
// into one upstream call. The TTL is server-side only (never proxy-side), so
// there is no contradiction with the no-store badge header.

type prFCacheEntry struct {
	body      []byte
	status    int
	expiresAt time.Time
}

var (
	prFCacheMu sync.Mutex
	prFCache   = map[string]prFCacheEntry{}
	prFSF      singleflight.Group
)

// lookupGHCached fetches a GitHub REST endpoint with a 60s server-side cache
// and single-flight collapsing. On 403/429 it is retried with exponential
// backoff; exhaustion returns the last body + status so callers can decide to
// degrade to N/A (AC3/AC6).
func lookupGHCached(token, apiURL string) ([]byte, int, error) {
	key := strconv.FormatBool(token != "") + "\x00" + apiURL
	prFCacheMu.Lock()
	if e, ok := prFCache[key]; ok && time.Now().Before(e.expiresAt) {
		prFCacheMu.Unlock()
		return e.body, e.status, nil
	}
	prFCacheMu.Unlock()

	v, err, _ := prFSF.Do(key, func() (interface{}, error) {
		body, status, ferr := githubRESTWithBackoff(token, apiURL)
		if ferr != nil {
			return nil, ferr
		}
		prFCacheMu.Lock()
		prFCache[key] = prFCacheEntry{body: body, status: status, expiresAt: time.Now().Add(60 * time.Second)}
		prFCacheMu.Unlock()
		return prFCacheEntry{body: body, status: status}, nil
	})
	if err != nil {
		return nil, 0, err
	}
	e := v.(prFCacheEntry)
	return e.body, e.status, nil
}

// githubRESTWithBackoff performs a GET against the GitHub REST API with
// exponential backoff on 403/429. Returns (body, status, err) where err is only
// a transport-level failure; callers still receive the status for HTTP-level
// handling (404/private/403/5xx -> N/A SVG).
func githubRESTWithBackoff(token, apiURL string) ([]byte, int, error) {
	var last []byte
	backoff := 1 * time.Second
	for attempt := 0; attempt < 4; attempt++ {
		req, err := http.NewRequest(http.MethodGet, apiURL, nil)
		if err != nil {
			return nil, 0, err
		}
		if token != "" {
			req.Header.Set("Authorization", "Bearer "+token)
		}
		req.Header.Set("Accept", "application/vnd.github+json")
		req.Header.Set("User-Agent", "OpenDoor-PRForecast")
		res, err := ghHTTPClient.Do(req)
		if err != nil {
			return nil, 0, err
		}
		body, _ := io.ReadAll(res.Body)
		res.Body.Close()
		last = body
		switch res.StatusCode {
		case http.StatusForbidden, http.StatusTooManyRequests:
			// Secondary rate limit / quota: exponential backoff, then degrade.
			if attempt < 3 {
				time.Sleep(backoff)
				backoff *= 2
				continue
			}
			return last, res.StatusCode, nil
		default:
			return last, res.StatusCode, nil
		}
	}
	return last, http.StatusForbidden, nil
}

// --- GitHub payload shapes (minimal) --------------------------------------

type ghPR struct {
	Mergeable      *bool `json:"mergeable"`
	MergeableState string `json:"mergeable_state"`
	State          string `json:"state"`
	Draft          bool   `json:"draft"`
	Additions      int    `json:"additions"`
	Deletions      int    `json:"deletions"`
	CreatedAt      string `json:"created_at"`
	Head           struct {
		SHA string `json:"sha"`
	} `json:"head"`
	Merged bool `json:"merged"`
}

type ghCombinedStatus struct {
	State      string `json:"state"`
	TotalCount int    `json:"total_count"`
	Statuses   []struct {
		State string `json:"state"`
	} `json:"statuses"`
	CheckRuns struct {
		TotalCount int `json:"total_count"`
	} `json:"check_runs"`
}

type ghReview struct {
	State string `json:"state"`
}

// prForecast is the computed merge-probability breakdown shared by the badge
// (AC2) and the deep-dive readiness page (AC8).
type prForecast struct {
	Available bool // false => render N/A
	Owner     string
	Repo      string
	PR        int
	Prob      float64 // 0..1
	CI        float64
	Reviews   float64
	Mergeable float64
	Recency   float64
	Size      float64
	CILabel      string
	ReviewsLabel string
	MergeLabel    string
	RecencyLabel  string
	SizeLabel     string
}

// weights per AC2 (sums to 1.0).
const (
	wCI      = 0.25
	wRev     = 0.25
	wMerge   = 0.20
	wRecency = 0.15
	wSize    = 0.15
)

// computePRForecast fetches PR data from GitHub and applies the fixed weighted
// formula (AC2/AC7). Any failure degrades to Available=false (N/A). null
// signals default to the neutral 0.5 split, never zero.
func computePRForecast(ctx context.Context, token, owner, repo string, pr int) (prForecast, error) {
	f := prForecast{Owner: owner, Repo: repo, PR: pr}

	base := "https://api.github.com/repos/" + url.PathEscape(owner) + "/" + url.PathEscape(repo)

	prBody, prStatus, err := lookupGHCached(token, base+"/pulls/"+strconv.Itoa(pr))
	if err != nil || prStatus != http.StatusOK {
		if prStatus == http.StatusOK {
			return f, err
		}
		return f, nil // unavailable -> N/A
	}
	var p ghPR
	if err := json.Unmarshal(prBody, &p); err != nil {
		return f, nil
	}

	// --- CI success (25%) -------------------------------------------------
	ciScore := 0.5 // neutral when no signal
	ciLabel := "no checks"
	if sha := p.Head.SHA; sha != "" {
		stBody, stStatus, e := lookupGHCached(token, base+"/commits/"+sha+"/status")
		if e == nil && stStatus == http.StatusOK {
			var st ghCombinedStatus
			if json.Unmarshal(stBody, &st) == nil {
				if st.TotalCount > 0 || st.CheckRuns.TotalCount > 0 {
					switch st.State {
					case "success":
						ciScore, ciLabel = 1.0, "passing"
					case "failure", "error":
						ciScore, ciLabel = 0.0, "failing"
					case "pending":
						ciScore, ciLabel = 0.5, "pending"
					default:
						ciScore, ciLabel = 0.5, "unknown"
					}
				}
			}
		}
	}

	// --- review approvals (25%) ------------------------------------------
	revScore := 0.5
	revLabel := "unknown"
	rvBody, rvStatus, e := lookupGHCached(token, base+"/pulls/"+strconv.Itoa(pr)+"/reviews")
	if e == nil && rvStatus == http.StatusOK {
		var reviews []ghReview
		if json.Unmarshal(rvBody, &reviews) == nil {
			approved := 0
			for _, r := range reviews {
				if strings.EqualFold(r.State, "APPROVED") {
					approved++
				}
			}
			if approved > 0 {
				revScore, revLabel = 1.0, "approved"
			} else {
				revScore, revLabel = 0.0, "no approvals"
			}
		}
	}

	// --- mergeable / no-conflict (20%) -----------------------------------
	// AC7: mergeable null (GitHub still computing) -> neutral 0.5 split.
	mergeScore := 0.5
	mergeLabel := "unknown"
	if p.Mergeable == nil {
		mergeScore, mergeLabel = 0.5, "unknown"
	} else if *p.Mergeable {
		mergeScore, mergeLabel = 1.0, "clean"
	} else {
		mergeScore, mergeLabel = 0.0, "conflict"
	}

	// --- recency / age (15%) ---------------------------------------------
	recScore := 0.5
	recLabel := "unknown"
	if t, perr := time.Parse(time.RFC3339, p.CreatedAt); perr == nil {
		ageDays := time.Since(t).Hours() / 24
		switch {
		case ageDays <= 1:
			recScore, recLabel = 1.0, "fresh"
		case ageDays <= 7:
			recScore, recLabel = 0.8, "this week"
		case ageDays <= 30:
			recScore, recLabel = 0.6, "this month"
		case ageDays <= 90:
			recScore, recLabel = 0.4, "stale"
		default:
			recScore, recLabel = 0.2, "very stale"
		}
	}

	// --- size / diff (15%) -----------------------------------------------
	total := p.Additions + p.Deletions
	sizeScore := 0.5
	sizeLabel := "unknown"
	switch {
	case total == 0:
		sizeScore, sizeLabel = 0.5, "no diff"
	case total < 50:
		sizeScore, sizeLabel = 1.0, "tiny"
	case total < 200:
		sizeScore, sizeLabel = 0.8, "small"
	case total < 500:
		sizeScore, sizeLabel = 0.6, "medium"
	case total < 1000:
		sizeScore, sizeLabel = 0.4, "large"
	default:
		sizeScore, sizeLabel = 0.2, "huge"
	}

	f.CI = ciScore
	f.Reviews = revScore
	f.Mergeable = mergeScore
	f.Recency = recScore
	f.Size = sizeScore
	f.CILabel = ciLabel
	f.ReviewsLabel = revLabel
	f.MergeLabel = mergeLabel
	f.RecencyLabel = recLabel
	f.SizeLabel = sizeLabel
	f.Prob = wCI*ciScore + wRev*revScore + wMerge*mergeScore + wRecency*recScore + wSize*sizeScore
	f.Available = true
	return f, nil
}

// pfColor maps a probability (or N/A) to a badge fill color (hex).
func pfColor(prob float64, available bool) string {
	if !available {
		return "#9ca3af" // N/A gray
	}
	switch {
	case prob >= 0.7:
		return "#16a34a"
	case prob >= 0.4:
		return "#d97706"
	default:
		return "#dc2626"
	}
}

// pfMessage renders the badge message text.
func pfMessage(f prForecast) string {
	if !f.Available {
		return "N/A"
	}
	return strconv.Itoa(int(f.Prob*100)) + "%"
}

// writePRForecastSVG writes a valid SVG with Cache-Control: no-store (AC5).
// Always HTTP 200 (AC3). Renders the neutral "N/A" SVG on any failure.
func writePRForecastSVG(c *gin.Context, f prForecast) {
	label := "Merge Forecast"
	message := pfMessage(f)
	color := pfColor(f.Prob, f.Available)

	svg, err := renderLiveBadge(label, message, color, "")
	if err != nil {
		svg = `<svg xmlns="http://www.w3.org/2000/svg" width="132" height="20" role="img" aria-label="Merge Forecast: N/A"><title>Merge Forecast: N/A</title><rect width="132" height="20" rx="4" fill="#9ca3af"/><text x="66" y="14" fill="#fff" text-anchor="middle" font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif" font-size="11" font-weight="600">Merge Forecast: N/A</text></svg>`
	}
	c.Header("Content-Type", "image/svg+xml")
	c.Header("Cache-Control", "no-store")
	c.String(http.StatusOK, "%s", svg)
}

// validatePRInputs checks owner/repo/pr per AC4. Returns the normalized pr.
func validatePRInputs(owner, repo, prStr string) (int, bool) {
	if !prForecastSlugRe.MatchString(owner) || !prForecastSlugRe.MatchString(repo) {
		return 0, false
	}
	pr, err := strconv.Atoi(prStr)
	if err != nil || pr < 1 || pr > 999999 {
		return 0, false
	}
	return pr, true
}

// GetPRForecastBadge handles GET /badge?owner=&repo=&pr=&v= (AC1..AC7).
// Always returns HTTP 200 with a valid SVG; invalid input or any GitHub error
// degrades to the neutral N/A SVG (AC3/AC4). v= is a cachebust, ignored.
func GetPRForecastBadge(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		owner := c.Query("owner")
		repo := c.Query("repo")
		pr, ok := validatePRInputs(owner, repo, c.Query("pr"))
		if !ok {
			writePRForecastSVG(c, prForecast{})
			return
		}
		// AC6: best-effort OAuth token raises quota / enables private access.
		token := cfg.GithubToken
		f, _ := computePRForecast(c.Request.Context(), token, owner, repo, pr)
		writePRForecastSVG(c, f)
	}
}

// GetPRForecastPage handles GET /pr?owner=&repo=&pr= (AC8). Shows the same
// computed breakdown used for the badge. Always 200; errors -> friendly N/A.
func GetPRForecastPage(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		owner := c.Query("owner")
		repo := c.Query("repo")
		pr, ok := validatePRInputs(owner, repo, c.Query("pr"))
		token := cfg.GithubToken

		var f prForecast
		available := false
		if ok {
			f, _ = computePRForecast(c.Request.Context(), token, owner, repo, pr)
			available = f.Available
		}
		c.Header("Content-Type", "text/html; charset=utf-8")
		c.Header("Cache-Control", "no-store")
		c.String(http.StatusOK, "%s", renderPRForecastPage(f, available, !ok))
	}
}

// GetPRForecastEmbed handles GET /embed-pr (AC1). Renders a copy-paste markdown
// snippet generator. Client-side interactions handle errors safely (AC).
func GetPRForecastEmbed(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Header("Content-Type", "text/html; charset=utf-8")
		c.String(http.StatusOK, "%s", renderPRForecastEmbed())
	}
}

// --- HTML rendering -------------------------------------------------------

var prForecastEmbedTemplate = template.Must(template.New("prEmbed").Parse(`<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>OpenDoor — PR Merge Probability Calculator</title>
<style>
:root{color-scheme:light dark}
*{box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;margin:0;background:#0d1117;color:#e6edf3;display:flex;justify-content:center;padding:32px 16px}
.wrap{width:100%;max-width:640px}
h1{font-size:20px;margin:0 0 4px}
p.lede{color:#9da7b3;font-size:14px;margin:0 0 20px}
label{display:block;font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:#9da7b3;margin:12px 0 4px}
input{width:100%;padding:9px 11px;border-radius:8px;border:1px solid #30363d;background:#010409;color:#e6edf3;font-size:14px}
.row{display:flex;gap:10px}
.row>div{flex:1}
button{margin-top:16px;width:100%;padding:11px;border:0;border-radius:8px;background:#238636;color:#fff;font-size:14px;font-weight:600;cursor:pointer}
button:active{transform:translateY(1px)}
pre{margin-top:16px;padding:14px;border-radius:8px;background:#010409;border:1px solid #30363d;white-space:pre-wrap;word-break:break-all;font-size:13px;line-height:1.5}
.note{font-size:12px;color:#9da7b3;margin-top:10px}
.copied{color:#3fb950}
</style></head>
<body><div class="wrap">
<h1>PR Merge Probability Calculator</h1>
<p class="lede">Paste the snippet below into your GitHub PR description. It renders a live OpenDoor merge-forecast badge that links to your full readiness breakdown.</p>
<label for="owner">Owner</label><input id="owner" placeholder="e.g. abhisheksoni27" autocomplete="off">
<label for="repo">Repo</label><input id="repo" placeholder="e.g. opendoor" autocomplete="off">
<label for="pr">PR number</label><input id="pr" placeholder="e.g. 123" inputmode="numeric" autocomplete="off">
<button id="gen" type="button">Generate snippet</button>
<pre id="out" aria-live="polite">Fill in the fields above and click Generate snippet.</pre>
<p class="note" id="status"></p>
<script>
(function(){
  var base = {{.Base}};
  function val(id){return (document.getElementById(id).value||'').trim();}
  function build(){
    var o=val('owner'), r=val('repo'), p=val('pr');
    var status=document.getElementById('status');
    if(!o||!r||!p||!/^[\w.-]+$/.test(o)||!/^[\w.-]+$/.test(r)||!/^\d{1,6}$/.test(p)){
      status.textContent='Enter a valid owner, repo, and PR number (digits only).';
      status.className='note'; return;
    }
    var ts=Math.floor(Date.now()/1000);
    var img=base+'/badge?owner='+encodeURIComponent(o)+'&repo='+encodeURIComponent(r)+'&pr='+encodeURIComponent(p)+'&v='+ts;
    var link=base+'/pr?owner='+encodeURIComponent(o)+'&repo='+encodeURIComponent(r)+'&pr='+encodeURIComponent(p);
    var md='[![OpenDoor PR Forecast]('+img+')]('+link+')';
    var out=document.getElementById('out');
    out.textContent=md;
    status.textContent='Copy the snippet above into your PR description.';
    status.className='note';
  }
  function copy(){
    var out=document.getElementById('out');
    var status=document.getElementById('status');
    var text=out.textContent;
    if(!text || text.indexOf('Fill')===0){ return; }
    function done(){status.textContent='Copied to clipboard!';status.className='note copied';}
    function fail(){try{var rg=document.createRange();rg.selectNodeContents(out);var s=getSelection();s.removeAllRanges();s.addRange(rg);document.execCommand('copy');done();}catch(e){status.textContent='Select the text above and press Ctrl/Cmd+C to copy.';status.className='note';}}
    if(navigator.clipboard && navigator.clipboard.writeText){
      navigator.clipboard.writeText(text).then(done, fail);
    }else{fail();}
  }
  document.getElementById('gen').addEventListener('click', function(){build();copy();});
})();
</script>
</div></body></html>`))

type prForecastEmbedData struct{ Base string }

func renderPRForecastEmbed() string {
	var buf bytes.Buffer
	_ = prForecastEmbedTemplate.Execute(&buf, prForecastEmbedData{Base: prForecastBaseURL})
	return buf.String()
}

var prForecastPageTemplate = template.Must(template.New("prPage").Parse(`<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>OpenDoor PR Merge Forecast</title>
<style>
:root{color-scheme:light dark}
*{box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;margin:0;background:#0d1117;color:#e6edf3;display:flex;justify-content:center;padding:32px 16px}
.wrap{width:100%;max-width:680px}
h1{font-size:22px;margin:0 0 2px}
.sub{color:#9da7b3;font-size:14px;margin:0 0 20px}
.big{font-size:42px;font-weight:700;margin:8px 0}
.bar{height:10px;border-radius:6px;background:#21262d;overflow:hidden;margin:4px 0 2px}
.bar>span{display:block;height:100%}
.rowsc{margin-top:18px}
.row{display:flex;align-items:center;gap:10px;margin:12px 0}
.row .name{width:150px;font-size:13px;color:#9da7b3}
.row .track{flex:1}
.row .pct{width:46px;text-align:right;font-variant-numeric:tabular-nums;font-size:13px}
.row .tag{width:96px;font-size:12px;color:#9da7b3}
a{color:#58a6ff}
.na{padding:40px;text-align:center;color:#9da7b3}
</style></head>
<body><div class="wrap">
{{if .Invalid}}<div class="na"><h1>Invalid request</h1><p>owner, repo, and a PR number (1-999999) are required.</p></div>
{{else if not .Available}}<div class="na"><h1>Merge forecast: N/A</h1><p>We couldn't compute a forecast for {{.Owner}}/{{.Repo}}#{{.PR}}. The PR may be private, deleted, or GitHub's rate limit is exhausted. Try again shortly.</p></div>
{{else}}<h1>Merge Forecast for {{.Owner}}/{{.Repo}}#{{.PR}}</h1>
<p class="sub">Computed by OpenDoor from the same signals shown below.</p>
<div class="big" style="color:{{.ProbColor}}">{{.ProbPct}}%</div>
<div class="rowsc">{{.Components}}</div>
<p style="margin-top:24px"><a href="{{.BadgeLink}}">Embed this forecast</a> in your PR description.</p>
{{end}}
</div></body></html>`))

type prForecastComp struct {
	Name   string
	Weight string
	Pct    int
	Color  string
	Label  string
}

type prForecastPageData struct {
	Invalid    bool
	Available  bool
	Owner      string
	Repo       string
	PR         int
	ProbPct    int
	ProbColor  string
	BadgeLink  string
	Components template.HTML
}

func compBlock(name, weight string, score float64, label string) prForecastComp {
	return prForecastComp{
		Name:   name,
		Weight: weight,
		Pct:    int(score * 100),
		Color:  pfColor(score, true),
		Label:  label,
	}
}

func compRow(c prForecastComp) string {
	return fmt.Sprintf(
		`<div class="row"><div class="name">%s &middot; %s</div><div class="track"><div class="bar"><span style="width:%d%%;background:%s"></span></div></div><div class="pct">%d%%</div><div class="tag">%s</div></div>`,
		c.Name, c.Weight, c.Pct, c.Color, c.Pct, c.Label,
	)
}

func renderPRForecastPage(f prForecast, available, invalid bool) string {
	if invalid {
		var buf bytes.Buffer
		_ = prForecastPageTemplate.Execute(&buf, prForecastPageData{Invalid: true})
		return buf.String()
	}
	if !available {
		var buf bytes.Buffer
		_ = prForecastPageTemplate.Execute(&buf, prForecastPageData{
			Available: false, Owner: f.Owner, Repo: f.Repo, PR: f.PR,
		})
		return buf.String()
	}
	rows := compRow(compBlock("CI status", "25%", f.CI, f.CILabel)) +
		compRow(compBlock("Review approvals", "25%", f.Reviews, f.ReviewsLabel)) +
		compRow(compBlock("Mergeable", "20%", f.Mergeable, f.MergeLabel)) +
		compRow(compBlock("Recency", "15%", f.Recency, f.RecencyLabel)) +
		compRow(compBlock("Size / diff", "15%", f.Size, f.SizeLabel))
	data := prForecastPageData{
		Available:  true,
		Owner:      f.Owner,
		Repo:       f.Repo,
		PR:         f.PR,
		ProbPct:    int(f.Prob * 100),
		ProbColor:  pfColor(f.Prob, true),
		BadgeLink:  prForecastBaseURL + "/embed-pr",
		Components: template.HTML(rows),
	}
	var buf bytes.Buffer
	_ = prForecastPageTemplate.Execute(&buf, data)
	return buf.String()
}
