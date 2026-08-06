package pipeline

import (
	"fmt"
	"log/slog"
	"strings"
	"time"

	"github.com/abhisheksoni27/opendoor/internal/github"
	"github.com/jmoiron/sqlx"
)

// StarBucket define non-overlapping star ranges for targeted discovery.
type StarBucket struct {
	MinStars int
	MaxStars int
}

var DiscoveryStarBuckets = []StarBucket{
	{MinStars: 50, MaxStars: 200},
	{MinStars: 200, MaxStars: 500},
	{MinStars: 500, MaxStars: 1000},
	{MinStars: 1000, MaxStars: 5000},
	{MinStars: 5000, MaxStars: 20000},
	{MinStars: 20000, MaxStars: 1000000},
}

// DiscoverNewRepos queries GitHub using sliding pushed-date windows and star ranges,
// filtering out any repositories already present in our database.
func DiscoverNewRepos(db *sqlx.DB, gh *github.Client, language string, bucket StarBucket, pushedWindowDays int, limit int) ([]github.Repo, error) {
	if limit <= 0 {
		limit = 50
	}
	if pushedWindowDays <= 0 {
		pushedWindowDays = 7
	}

	pushedAfter := time.Now().UTC().AddDate(0, 0, -pushedWindowDays).Format("2006-01-02")
	queryStr := fmt.Sprintf("language:%s stars:%d..%d pushed:>=%s sort:updated-desc",
		language, bucket.MinStars, bucket.MaxStars, pushedAfter)

	slog.Info("discovery: searching github", "query", queryStr, "target_limit", limit)

	// Step 1: Query GitHub Search API
	candidates, err := gh.FetchCustomQueryRepos(queryStr, limit)
	if err != nil {
		return nil, fmt.Errorf("discovery search failed: %w", err)
	}

	if len(candidates) == 0 {
		slog.Info("discovery: no repos returned from query", "query", queryStr)
		return nil, nil
	}

	// Step 2: Filter out existing repos in DB via single batch SELECT
	fullNames := make([]string, len(candidates))
	for i, c := range candidates {
		fullNames[i] = c.FullName
	}

	existingMap, err := checkExistingRepos(db, fullNames)
	if err != nil {
		slog.Warn("discovery: could not check existing repos - proceeding carefully", "err", err)
		existingMap = map[string]bool{}
	}

	var newRepos []github.Repo
	for _, c := range candidates {
		if !existingMap[strings.ToLower(c.FullName)] {
			newRepos = append(newRepos, c)
		}
	}

	slog.Info("discovery: filter complete",
		"query", queryStr,
		"candidates_fetched", len(candidates),
		"already_indexed", len(candidates)-len(newRepos),
		"new_discovered", len(newRepos),
	)

	return newRepos, nil
}

func checkExistingRepos(db *sqlx.DB, fullNames []string) (map[string]bool, error) {
	if len(fullNames) == 0 {
		return map[string]bool{}, nil
	}

	query, args, err := sqlx.In("SELECT LOWER(full_name) FROM repositories WHERE LOWER(full_name) IN (?)", fullNames)
	if err != nil {
		return nil, err
	}

	query = db.Rebind(query)
	var existingNames []string
	if err := db.Select(&existingNames, query, args...); err != nil {
		return nil, err
	}

	res := make(map[string]bool, len(existingNames))
	for _, name := range existingNames {
		res[name] = true
	}
	return res, nil
}
