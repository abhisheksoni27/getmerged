package pipeline

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/jmoiron/sqlx"
)

const ossInsightTrendingURL = "https://api.ossinsight.io/v1/trends/repos/?period=past_24_hours&language=All"

type ossInsightRepo struct {
	RepoName    string `json:"repo_name"`
	Stars       int    `json:"stars"`
	Language    string `json:"language"`
	Description string `json:"description"`
}

type ossInsightResponse struct {
	Data []ossInsightRepo `json:"data"`
}

// SyncTrendingRepos fetches repos trending in the last 24h from OSSInsight
// and marks matching indexed repos as trending in the database.
func SyncTrendingRepos(ctx context.Context, db *sqlx.DB) (int, error) {
	client := &http.Client{Timeout: 15 * time.Second}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, ossInsightTrendingURL, nil)
	if err != nil {
		return 0, fmt.Errorf("trending: build request: %w", err)
	}
	req.Header.Set("User-Agent", "opendoor-trending/1.0")

	res, err := client.Do(req)
	if err != nil {
		return 0, fmt.Errorf("trending: fetch failed: %w", err)
	}
	defer res.Body.Close()

	if res.StatusCode != http.StatusOK {
		return 0, fmt.Errorf("trending: unexpected status %d", res.StatusCode)
	}

	var payload ossInsightResponse
	if err := json.NewDecoder(res.Body).Decode(&payload); err != nil {
		return 0, fmt.Errorf("trending: decode: %w", err)
	}

	// Reset all trending flags before marking new ones.
	_, _ = db.ExecContext(ctx, `UPDATE repositories SET is_trending = 0, last_trending_at = NULL WHERE is_trending = 1`)

	marked := 0
	for _, r := range payload.Data {
		if r.RepoName == "" || !strings.Contains(r.RepoName, "/") {
			continue
		}

		result, err := db.ExecContext(ctx,
			`UPDATE repositories SET is_trending = 1, last_trending_at = ? WHERE full_name = ?`,
			time.Now().UTC(), r.RepoName,
		)
		if err != nil {
			slog.Warn("trending: failed to mark repo", "repo", r.RepoName, "err", err)
			continue
		}

		if rows, _ := result.RowsAffected(); rows > 0 {
			marked++
		}
	}

	slog.Info("trending: sync complete", "marked", marked, "total_from_api", len(payload.Data))
	return marked, nil
}
