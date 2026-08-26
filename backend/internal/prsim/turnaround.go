package prsim

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/valkey-io/valkey-go"
)

// NormalizeRepo accepts "owner/name" or a github.com URL and returns
// lowercased "owner/name".
func NormalizeRepo(repo string) string {
	r := strings.ToLower(strings.TrimSpace(repo))
	r = strings.TrimPrefix(strings.TrimPrefix(r, "https://github.com/"), "http://github.com/")
	r = strings.TrimPrefix(r, "github.com/")
	r = strings.Trim(r, "/")
	return r
}

type ghPull struct {
	CreatedAt time.Time  `json:"created_at"`
	MergedAt  *time.Time `json:"merged_at"`
}

// FetchTurnaround returns the median review turnaround from the last N=30
// merged PRs of the repo (AC2), cached in Valkey for 6h per repo.
// Repos with fewer than MinSamples merged PRs return Insufficient=true.
func FetchTurnaround(ctx context.Context, client *http.Client, token, repo string, vk valkey.Client) (*Turnaround, error) {
	cacheKey := "prsim:tat:" + NormalizeRepo(repo)
	if vk != nil {
		if cached, err := vk.Do(ctx, vk.B().Get().Key(cacheKey).Build()).ToString(); err == nil && cached != "" {
			var t Turnaround
			if json.Unmarshal([]byte(cached), &t) == nil {
				return &t, nil
			}
		}
	}

	t, err := fetchTurnaround(ctx, client, token, repo)
	if err != nil {
		return nil, err
	}
	if vk != nil {
		if blob, err := json.Marshal(t); err == nil {
			vk.Do(ctx, vk.B().Set().Key(cacheKey).Value(string(blob)).Ex(TurnaroundTTL).Build())
		}
	}
	return t, nil
}

func fetchTurnaround(ctx context.Context, client *http.Client, token, repo string) (*Turnaround, error) {
	fetchCtx, cancel := context.WithTimeout(ctx, TurnaroundFetchTimeout)
	defer cancel()

	url := fmt.Sprintf("https://api.github.com/repos/%s/pulls?state=closed&sort=updated&direction=desc&per_page=50", NormalizeRepo(repo))
	req, err := http.NewRequestWithContext(fetchCtx, http.MethodGet, url, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Accept", "application/vnd.github+json")
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}

	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(io.LimitReader(resp.Body, 512))
		return nil, fmt.Errorf("github api %d: %s", resp.StatusCode, strings.TrimSpace(string(body)))
	}

	var pulls []ghPull
	if err := json.NewDecoder(io.LimitReader(resp.Body, MaxDiffBytes)).Decode(&pulls); err != nil {
		return nil, err
	}

	var durations []float64
	for _, p := range pulls {
		if p.MergedAt == nil || len(durations) >= MedianPRs {
			continue
		}
		hours := p.MergedAt.Sub(p.CreatedAt).Hours()
		if hours < 0 {
			continue
		}
		durations = append(durations, hours)
	}

	t := &Turnaround{Samples: len(durations)}
	if len(durations) < MinSamples {
		t.Insufficient = true
		return t, nil
	}
	t.MedianHours = MedianHours(durations)
	return t, nil
}
