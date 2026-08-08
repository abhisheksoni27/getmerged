package pipeline

import (
	"database/sql"
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

// discoveryCursorRow mirrors the discovery_cursors table row.
type discoveryCursorRow struct {
	PushStart    string `db:"push_start"`
	SearchCursor string `db:"search_cursor"`
}

// getDiscoveryCursor loads the persisted search cursor for a (language, bucket).
func getDiscoveryCursor(db *sqlx.DB, language string, bucket StarBucket) (discoveryCursorRow, error) {
	var row discoveryCursorRow
	err := db.Get(&row, `
		SELECT push_start, search_cursor
		FROM discovery_cursors
		WHERE lang = ? AND bucket_min = ? AND bucket_max = ?
	`, language, bucket.MinStars, bucket.MaxStars)
	if err == sql.ErrNoRows {
		return discoveryCursorRow{}, nil
	}
	return row, err
}

// saveDiscoveryCursor records the next search cursor so the next sweep of this
// (language, bucket) resumes further down the result set instead of re-scanning
// the same hot repos at the top.
func saveDiscoveryCursor(db *sqlx.DB, language string, bucket StarBucket, pushStart, cursor string) error {
	_, err := db.Exec(`
		INSERT INTO discovery_cursors (lang, bucket_min, bucket_max, push_start, search_cursor, last_swept)
		VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
		ON DUPLICATE KEY UPDATE
			push_start = VALUES(push_start),
			search_cursor = VALUES(search_cursor),
			last_swept = CURRENT_TIMESTAMP
	`, language, bucket.MinStars, bucket.MaxStars, pushStart, cursor)
	return err
}

// DiscoverNewRepos sweeps GitHub for repositories in a (language, star bucket)
// that we have not indexed yet. It pages through the result set with a persisted
// cursor, so repeated sweeps advance into the long tail instead of replaying the
// same trending repos. Newer pushes reorder the search results, so deduping
// against the repositories table keeps the crawl idempotent.
//
// Returns the newly discovered repos (up to maxNew) and the number of pages
// consumed so callers can reason about GitHub budget.
func DiscoverNewRepos(db *sqlx.DB, gh *github.Client, language string, bucket StarBucket, pushedWindowDays, maxNew, maxPages, pageSize int) ([]github.Repo, int, error) {
	if maxNew <= 0 {
		maxNew = 10
	}
	if maxPages <= 0 {
		maxPages = 2
	}
	if pageSize <= 0 {
		pageSize = 100
	}

	pushStart := time.Now().UTC().AddDate(0, 0, -pushedWindowDays).Format("2006-01-02")

	state, err := getDiscoveryCursor(db, language, bucket)
	if err != nil {
		return nil, 0, fmt.Errorf("getDiscoveryCursor: %w", err)
	}
	// When the sliding push window rolls over, restart from the top of a fresh result set.
	after := ""
	if state.PushStart == pushStart {
		after = state.SearchCursor
	}

	queryStr := fmt.Sprintf("language:%s stars:%d..%d pushed:>=%s sort:updated-desc",
		language, bucket.MinStars, bucket.MaxStars, pushStart)

	slog.Info("discovery: searching github", "query", queryStr, "resume_cursor", after != "", "target_new", maxNew)

	var newRepos []github.Repo
	pages := 0

	for pages < maxPages {
		page, err := gh.FetchCustomQueryReposPage(queryStr, pageSize, after)
		if err != nil {
			return nil, pages + 1, fmt.Errorf("discovery search failed: %w", err)
		}
		pages++

		if len(page.Repos) == 0 {
			slog.Info("discovery: no repos returned from query", "query", queryStr, "pages", pages)
			break
		}

		// Drop repositories we already know about.
		existing, err := checkExistingRepos(db, page.Repos)
		if err != nil {
			slog.Warn("discovery: could not check existing repos - proceeding carefully", "err", err)
			existing = map[string]bool{}
		}

		var fresh []github.Repo
		for _, r := range page.Repos {
			if !existing[strings.ToLower(r.FullName)] {
				fresh = append(fresh, r)
			}
		}

		slog.Info("discovery: page processed",
			"query", queryStr,
			"page", pages,
			"candidates", len(page.Repos),
			"already_indexed", len(page.Repos)-len(fresh),
			"new_discovered", len(fresh),
		)

		newRepos = append(newRepos, fresh...)

		if !page.HasNextPage {
			// Reached the end of the result set; next sweep restarts from the top.
			after = ""
			break
		}
		after = page.EndCursor

		if len(newRepos) >= maxNew {
			break
		}
	}

	if len(newRepos) > maxNew {
		newRepos = newRepos[:maxNew]
	}

	// Persist progress so the next sweep does not replay the same pages.
	if saveErr := saveDiscoveryCursor(db, language, bucket, pushStart, after); saveErr != nil {
		slog.Warn("discovery: failed to persist search cursor", "lang", language, "err", saveErr)
	}

	return newRepos, pages, nil
}

// checkExistingRepos returns a set of full names (lower-cased) already in the DB.
func checkExistingRepos(db *sqlx.DB, repos []github.Repo) (map[string]bool, error) {
	fullNames := make([]string, len(repos))
	for i, r := range repos {
		fullNames[i] = strings.ToLower(r.FullName)
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