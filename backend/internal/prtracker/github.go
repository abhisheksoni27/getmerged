package prtracker

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/valkey-io/valkey-go"
)

const ghAPIBase = "https://api.github.com"
const etagCacheTTL = 7 * 24 * time.Hour

// GHClient is a REST GitHub client using ETag conditional requests backed by a
// shared Valkey cache; on rate-limit (403/429) it serves cached data flagged
// limited instead of failing (AC5). Every request consumes a token from the
// caller's per-user bucket, and 403/429 without cached data retries with
// exponential backoff honoring Retry-After (AC2).
type GHClient struct {
	httpClient *http.Client
	valkey     valkey.Client
	Buckets    *UserBuckets
}

func NewGHClient(vk valkey.Client) *GHClient {
	return &GHClient{
		httpClient: &http.Client{Timeout: 20 * time.Second},
		valkey:     vk,
		Buckets:    NewUserBuckets(),
	}
}

type etagCacheEntry struct {
	ETag string `json:"etag"`
	Body []byte `json:"body"`
}

// GetResult reports provenance of a GitHub response.
type GetResult struct {
	Body         []byte        // served payload
	Limited      bool          // served from cache because of rate limiting (AC5)
	Unauthorized bool          // 401: token expired/revoked -> reconnect required (AC6)
	Cached       bool          // served from cache (304 or rate-limit fallback)
	RateLimited  bool          // 403/429 with no cached fallback (AC2: caller backs off + retries)
	RetryAfter   time.Duration // Retry-After hint from GitHub
	LimitMsg     string        // last rate-limit response snippet
}

func (g *GHClient) cacheKey(url string) string {
	sum := sha256.Sum256([]byte(url))
	return "opendoor:prtracker:etag:" + hex.EncodeToString(sum[:])
}

func (g *GHClient) readCache(key string) *etagCacheEntry {
	if g.valkey == nil {
		return nil
	}
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()
	buf, err := g.valkey.Do(ctx, g.valkey.B().Get().Key(key).Build()).ToString()
	if err != nil || buf == "" {
		return nil
	}
	var entry etagCacheEntry
	if json.Unmarshal([]byte(buf), &entry) != nil {
		return nil
	}
	return &entry
}

func (g *GHClient) writeCache(key string, entry etagCacheEntry) {
	if g.valkey == nil {
		return
	}
	blob, err := json.Marshal(entry)
	if err != nil {
		return
	}
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()
	g.valkey.Do(ctx, g.valkey.B().Set().Key(key).Value(string(blob)).Ex(etagCacheTTL).Build())
}

// Get performs an ETag-conditional GET against the GitHub REST API for the
// given user, spending one of that user's hourly tokens per attempt (AC2).
// A 403/429 with no cached fallback is retried with exponential backoff
// (honoring Retry-After, capped) before surfacing the rate-limit error.
func (g *GHClient) Get(ctx context.Context, userID int64, token, url string) (*GetResult, error) {
	key := g.cacheKey(url)
	cached := g.readCache(key)

	backoff := time.Second
	var res *GetResult
	for attempt := 0; attempt < 3; attempt++ {
		if err := g.Buckets.Wait(ctx, userID); err != nil { // AC2: ≤4500/hr/user budget
			return nil, err
		}

		r, err := g.attempt(ctx, token, url, cached, key)
		if err != nil {
			return nil, err // network error already fell back to cache inside attempt
		}
		res = r
		if !res.RateLimited {
			return res, nil
		}

		wait := backoff
		if res.RetryAfter > 0 {
			if res.RetryAfter > 5*time.Second {
				res.RetryAfter = 5 * time.Second
			}
			wait = res.RetryAfter
		}
		select {
		case <-ctx.Done():
			return nil, ctx.Err()
		case <-time.After(wait):
		}
		backoff *= 2
	}
	return nil, fmt.Errorf("github rate limited after retries: %s", res.LimitMsg)
}

// attempt issues one conditional request; RateLimited marks a 403/429 whose
// body was not served from cache so Get can back off and retry.
func (g *GHClient) attempt(ctx context.Context, token, url string, cached *etagCacheEntry, key string) (*GetResult, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Accept", "application/vnd.github+json")
	req.Header.Set("X-GitHub-Api-Version", "2022-11-28")
	req.Header.Set("User-Agent", "opendoor-pr-tracker")
	if cached != nil && cached.ETag != "" {
		req.Header.Set("If-None-Match", cached.ETag)
	}

	resp, err := g.httpClient.Do(req)
	if err != nil {
		// Network trouble: fall back to cache when possible.
		if cached != nil {
			return &GetResult{Body: cached.Body, Cached: true}, nil
		}
		return nil, err
	}
	defer resp.Body.Close()

	switch resp.StatusCode {
	case http.StatusNotModified:
		if cached == nil {
			return nil, fmt.Errorf("304 without cached body for %s", url)
		}
		return &GetResult{Body: cached.Body, Cached: true}, nil

	case http.StatusUnauthorized:
		return &GetResult{Unauthorized: true}, nil

	case http.StatusForbidden, http.StatusTooManyRequests:
		// Rate limited: serve stale cached data with the limited badge (AC5).
		if cached != nil {
			return &GetResult{Body: cached.Body, Limited: true, Cached: true}, nil
		}
		body, _ := io.ReadAll(io.LimitReader(resp.Body, 4096))
		return &GetResult{RateLimited: true, RetryAfter: parseRetryAfter(resp.Header.Get("Retry-After")), LimitMsg: string(body)}, nil

	case http.StatusOK:
		body, err := io.ReadAll(io.LimitReader(resp.Body, 8<<20))
		if err != nil {
			if cached != nil {
				return &GetResult{Body: cached.Body, Cached: true}, nil
			}
			return nil, err
		}
		if etag := resp.Header.Get("Etag"); etag != "" {
			g.writeCache(key, etagCacheEntry{ETag: etag, Body: body})
		}
		return &GetResult{Body: body}, nil

	default:
		return nil, fmt.Errorf("github api %s returned %d", url, resp.StatusCode)
	}
}

func parseRetryAfter(v string) time.Duration {
	secs, err := strconv.Atoi(strings.TrimSpace(v))
	if err != nil || secs < 0 {
		return 0
	}
	return time.Duration(secs) * time.Second
}

// --- Search API types ---

type SearchResponse struct {
	TotalCount int          `json:"total_count"`
	Items      []SearchItem `json:"items"`
}

type SearchItem struct {
	Number    int       `json:"number"`
	Title     string    `json:"title"`
	State     string    `json:"state"`
	HTMLURL   string    `json:"html_url"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
	PullRequest *struct {
		MergedAt *time.Time `json:"merged_at"`
	} `json:"pull_request,omitempty"`
	Repository *struct {
		ID       int    `json:"id"`
		Name     string `json:"name"`
		FullName string `json:"full_name"`
	} `json:"repository,omitempty"`
}

// SearchOpenPRs lists the user's open PRs, newest activity first (max perPage).
func (g *GHClient) SearchOpenPRs(ctx context.Context, userID int64, token, login string, perPage int) ([]SearchItem, *GetResult, error) {
	q := fmt.Sprintf("is:pr author:%s is:open sort:updated-desc", login)
	url := fmt.Sprintf("%s/search/issues?q=%s&per_page=%d&page=1", ghAPIBase, q, perPage)
	res, err := g.Get(ctx, userID, token, url)
	if err != nil {
		return nil, res, err
	}
	if res.Unauthorized {
		return nil, res, nil
	}
	var parsed SearchResponse
	if err := json.Unmarshal(res.Body, &parsed); err != nil {
		return nil, res, fmt.Errorf("search decode failed: %w", err)
	}
	return parsed.Items, res, nil
}

// PRDetail is the subset of GET /repos/{o}/{r}/pulls/{n} we consume.
type PRDetail struct {
	State      string     `json:"state"`
	Merged     bool       `json:"merged"`
	MergedAt   *time.Time `json:"merged_at"`
	Additions  int        `json:"additions"`
	Deletions  int        `json:"deletions"`
	HtmlURLStr string     `json:"html_url"`
}

// FetchPRDetail confirms merged/closed state for a single PR.
func (g *GHClient) FetchPRDetail(ctx context.Context, userID int64, token, owner, repo string, number int) (*PRDetail, *GetResult, error) {
	url := fmt.Sprintf("%s/repos/%s/%s/pulls/%d", ghAPIBase, owner, repo, number)
	res, err := g.Get(ctx, userID, token, url)
	if err != nil || res.Unauthorized {
		return nil, res, err
	}
	var d PRDetail
	if err := json.Unmarshal(res.Body, &d); err != nil {
		return nil, res, err
	}
	return &d, res, nil
}

// Review is one submitted review on a PR.
type Review struct {
	State       string `json:"state"`
	SubmittedAt time.Time `json:"submitted_at"`
	User        struct {
		Login string `json:"login"`
	} `json:"user"`
}

// FetchReviews fetches submitted reviews (ETag-cached like all calls).
func (g *GHClient) FetchReviews(ctx context.Context, userID int64, token, owner, repo string, number int) ([]Review, *GetResult, error) {
	url := fmt.Sprintf("%s/repos/%s/%s/pulls/%d/reviews?per_page=100", ghAPIBase, owner, repo, number)
	res, err := g.Get(ctx, userID, token, url)
	if err != nil || res.Unauthorized {
		return nil, res, err
	}
	var reviews []Review
	if err := json.Unmarshal(res.Body, &reviews); err != nil {
		return nil, res, err
	}
	return reviews, res, nil
}

// DeriveState maps raw GitHub data to tracker vocabulary (AC2):
// open / changes_requested / approved / merged.
func DeriveState(detail *PRDetail, reviews []Review) string {
	if detail != nil && (detail.Merged || (detail.State == "closed" && detail.MergedAt != nil)) {
		return StateMerged
	}
	latest := map[string]string{} // reviewer -> latest decision (list is submission-ascending)
	for _, r := range reviews {
		switch r.State {
		case "CHANGES_REQUESTED", "APPROVED":
			latest[r.User.Login] = r.State
		}
	}
	hasChanges, hasApprovals := false, false
	for _, st := range latest {
		if st == "CHANGES_REQUESTED" {
			hasChanges = true
		}
		if st == "APPROVED" {
			hasApprovals = true
		}
	}
	if hasChanges {
		return StateChangesRequested
	}
	if hasApprovals {
		return StateApproved
	}
	return StateOpen
}
