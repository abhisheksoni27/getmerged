package pipeline

import (
	"context"

	ghclient "github.com/abhisheksoni27/opendoor/internal/github"
	"github.com/jmoiron/sqlx"
)

var StarBuckets = []struct {
	Name  string
	Query string
}{
	{Name: "500-1k", Query: "stars:500..1000"},
	{Name: "1k-5k", Query: "stars:1000..5000"},
	{Name: "5k-20k", Query: "stars:5000..20000"},
	{Name: "20k-50k", Query: "stars:20000..50000"},
	{Name: "50k+", Query: "stars:>50000"},
}

// CategorizeStarBucket determines the star bucket string given a star count.
func CategorizeStarBucket(stars int) string {
	switch {
	case stars >= 500 && stars < 1000:
		return "500-1k"
	case stars >= 1000 && stars < 5000:
		return "1k-5k"
	case stars >= 5000 && stars < 20000:
		return "5k-20k"
	case stars >= 20000 && stars < 50000:
		return "20k-50k"
	case stars >= 50000:
		return "50k+"
	default:
		return "<500"
	}
}

// UpdateStarBuckets updates the star_bucket column for all repos in DB.
func UpdateStarBuckets(ctx context.Context, db *sqlx.DB) error {
	_, err := db.ExecContext(ctx, `
		UPDATE repos SET star_bucket = CASE
			WHEN stars >= 500 AND stars < 1000 THEN '500-1k'
			WHEN stars >= 1000 AND stars < 5000 THEN '1k-5k'
			WHEN stars >= 5000 AND stars < 20000 THEN '5k-20k'
			WHEN stars >= 20000 AND stars < 50000 THEN '20k-50k'
			WHEN stars >= 50000 THEN '50k+'
			ELSE '<500'
		END
	`)
	return err
}

// FetchBucketRepos fetches repos for a given language and star query bucket using GitHub GraphQL API.
func FetchBucketRepos(ctx context.Context, gh *ghclient.Client, lang string, minStars int, maxRepos int) ([]ghclient.Repo, error) {
	return gh.SearchRepos(lang, minStars, maxRepos)
}
