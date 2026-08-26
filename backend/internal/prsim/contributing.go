package prsim

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"strings"
)

// contributingKeywordGroups each earn 2 points (max 10) when the repo's
// CONTRIBUTING.md mentions the topic - the AC1 "matches repo
// CONTRIBUTING.md patterns" heuristic.
var contributingKeywordGroups = [][]string{
	{"test"},
	{"lint", "style", "format"},
	{"commit"},
	{"pull request", " pr ", "merge"},
	{"issue"},
}

// FetchContributingMatch downloads the repo's CONTRIBUTING.md via the GitHub
// contents API and scores keyword coverage out of 10. A missing or unreadable
// file yields 0 points plus a suggestion.
func FetchContributingMatch(ctx context.Context, client *http.Client, token, repo string) (int, []string) {
	fetchCtx, cancel := context.WithTimeout(ctx, ContributingFetchTimeout)
	defer cancel()

	url := fmt.Sprintf("https://api.github.com/repos/%s/contents/CONTRIBUTING.md", NormalizeRepo(repo))
	req, err := http.NewRequestWithContext(fetchCtx, http.MethodGet, url, nil)
	if err != nil {
		return 0, []string{"Could not fetch the repository CONTRIBUTING.md for pattern matching."}
	}
	req.Header.Set("Accept", "application/vnd.github.raw")
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}

	resp, err := client.Do(req)
	if err != nil {
		return 0, []string{"Could not fetch the repository CONTRIBUTING.md for pattern matching."}
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return 0, []string{"The repository has no CONTRIBUTING.md at its default branch - check it manually before submitting."}
	}
	body, err := io.ReadAll(io.LimitReader(resp.Body, MaxDiffBytes))
	if err != nil {
		return 0, nil
	}

	content := strings.ToLower(string(body))
	pts := 0
	for _, group := range contributingKeywordGroups {
		for _, kw := range group {
			if strings.Contains(content, kw) {
				pts += 2
				break
			}
		}
	}
	return clamp(pts, 0, DefaultWeights.ContributingMatch), nil
}
