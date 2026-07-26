package pipeline

import (
	"context"

	ghclient "github.com/abhisheksoni27/opendoor/internal/github"
	"github.com/jmoiron/sqlx"
)

// SyncTrendingRepos fetches trending/high-growth repos and updates their status in the database.
func SyncTrendingRepos(ctx context.Context, db *sqlx.DB, gh *ghclient.Client, languages []string) (int, error) {
	var totalAdded int

	for _, lang := range languages {
		// Search repos created or updated recently with significant star growth (>500 stars)
		repos, err := gh.SearchRepos(lang, 500, 20)
		if err != nil {
			continue
		}

		for _, r := range repos {
			bucket := CategorizeStarBucket(r.Stars)
			res, err := db.ExecContext(ctx, `
				INSERT INTO repos (node_id, full_name, owner, name, language, stars, description, url, star_bucket, is_trending, last_trending_at, created_at, updated_at)
				VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
				ON CONFLICT(full_name) DO UPDATE SET
					stars = excluded.stars,
					star_bucket = excluded.star_bucket,
					is_trending = TRUE,
					last_trending_at = CURRENT_TIMESTAMP,
					updated_at = CURRENT_TIMESTAMP
			`, r.NodeID, r.FullName, r.Owner, r.Name, r.Language, r.Stars, r.Description, r.URL, bucket)

			if err == nil {
				if rows, _ := res.RowsAffected(); rows > 0 {
					totalAdded++
				}
			}
		}
	}

	return totalAdded, nil
}
