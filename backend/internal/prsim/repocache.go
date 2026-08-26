package prsim

import (
	"container/list"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"sync"
	"time"
)

// RepoStats bundles everything the deterministic heuristic needs from the
// repo (AC2): CONTRIBUTING.md match points and the review-turnaround
// estimate. One cached bundle per repo_slug caps GitHub traffic at roughly
// one fetch set per repo per day (AC3).
type RepoStats struct {
	ContribPts   int         `json:"contrib_pts"`
	ContribHints []string    `json:"contrib_hints,omitempty"`
	Turnaround   *Turnaround `json:"turnaround,omitempty"`
}

type repoCacheEntry struct {
	key       string
	stats     *RepoStats
	expiresAt time.Time
}

// RepoCache is a fixed-size in-process LRU with per-entry TTL (AC3).
// Safe for concurrent use.
type RepoCache struct {
	mu    sync.Mutex
	max   int
	ll    *list.List // front = most recently used
	items map[string]*list.Element
}

func NewRepoCache(max int) *RepoCache {
	if max <= 0 {
		max = RepoCacheSize
	}
	return &RepoCache{max: max, ll: list.New(), items: make(map[string]*list.Element, max)}
}

// Get returns live stats for key, promoting it to most-recently-used.
func (c *RepoCache) Get(key string) (*RepoStats, bool) {
	c.mu.Lock()
	defer c.mu.Unlock()
	el, ok := c.items[key]
	if !ok {
		return nil, false
	}
	ent := el.Value.(*repoCacheEntry)
	if time.Now().After(ent.expiresAt) {
		c.ll.Remove(el)
		delete(c.items, key)
		return nil, false
	}
	c.ll.MoveToFront(el)
	return ent.stats, true
}

// Add stores stats under key and evicts the least-recently-used expired or
// overflow entry. Adding an existing key refreshes both value and TTL.
func (c *RepoCache) Add(key string, stats *RepoStats) {
	if stats == nil {
		return
	}
	c.mu.Lock()
	defer c.mu.Unlock()
	if el, ok := c.items[key]; ok {
		ent := el.Value.(*repoCacheEntry)
		ent.stats = stats
		ent.expiresAt = time.Now().Add(RepoCacheTTL)
		c.ll.MoveToFront(el)
		return
	}
	c.items[key] = c.ll.PushFront(&repoCacheEntry{key: key, stats: stats, expiresAt: time.Now().Add(RepoCacheTTL)})
	for len(c.items) > c.max {
		oldest := c.ll.Back()
		if oldest == nil {
			break
		}
		c.ll.Remove(oldest)
		delete(c.items, oldest.Value.(*repoCacheEntry).key)
	}
}

// Upstream error codes surfaced by GetOrFetchRepoStats.
const (
	UpstreamOK          = ""
	UpstreamNotFound    = "not_found"
	UpstreamRateLimited = "rate_limited"
)

// ghRepoMeta is the subset of GET /repos/{owner}/{repo} we inspect to prove
// the slug exists and is public (AC4: anonymous tier only - private repos 404
// for unauthenticated callers, same as nonexistent).
type ghRepoMeta struct {
	Private bool `json:"private"`
}

// GetOrFetchRepoStats returns cached stats when present (no GitHub call);
// on miss it verifies the slug via the anonymous GitHub API, then fetches
// CONTRIBUTING.md compliance and turnaround data once, caching for 24h.
// code==UpstreamRateLimited means GitHub answered 403/429 while no cache
// entry exists; retryAfter seconds is the suggested backoff. Any other
// failure (404, private, unreachable) maps to UpstreamNotFound per AC3.
func GetOrFetchRepoStats(ctx context.Context, client *http.Client, token, repo string, cache *RepoCache) (stats *RepoStats, code string, retryAfter int) {
	key := NormalizeRepo(repo)
	if cache != nil {
		if s, ok := cache.Get(key); ok {
			return s, UpstreamOK, 0
		}
	}

	metaCtx, cancel := context.WithTimeout(ctx, ContributingFetchTimeout)
	req, err := http.NewRequestWithContext(metaCtx, http.MethodGet,
		fmt.Sprintf("https://api.github.com/repos/%s", key), nil)
	if err != nil {
		cancel()
		return nil, UpstreamNotFound, 0
	}
	req.Header.Set("Accept", "application/vnd.github+json")
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	resp, err := client.Do(req)
	if err != nil {
		cancel()
		return nil, UpstreamNotFound, 0
	}
	defer resp.Body.Close()
	switch resp.StatusCode {
	case http.StatusOK:
		var meta ghRepoMeta
		if json.NewDecoder(io.LimitReader(resp.Body, 64*1024)).Decode(&meta) != nil || meta.Private {
			cancel()
			return nil, UpstreamNotFound, 0
		}
	case http.StatusForbidden, http.StatusTooManyRequests:
		ra := parseRetryAfter(resp.Header.Get("Retry-After"))
		cancel()
		return nil, UpstreamRateLimited, ra
	default:
		cancel()
		return nil, UpstreamNotFound, 0
	}
	cancel()

	contribPts, contribHints := FetchContributingMatch(ctx, client, token, repo)
	turnaround, tErr := FetchTurnaround(ctx, client, token, repo, nil)
	stats = &RepoStats{ContribPts: contribPts, ContribHints: contribHints}
	if tErr == nil && turnaround != nil {
		stats.Turnaround = turnaround
	}
	if cache != nil {
		cache.Add(key, stats)
	}
	return stats, UpstreamOK, 0
}

func parseRetryAfter(v string) int {
	if v == "" {
		return 60
	}
	var secs int
	if _, err := fmt.Sscanf(v, "%d", &secs); err != nil || secs <= 0 {
		return 60
	}
	return secs
}
