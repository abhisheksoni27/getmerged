package main

import (
	"flag"
	"fmt"
	"log/slog"
	"os"
	"strings"
	"time"

	"github.com/abhisheksoni27/opendoor/internal/config"
	"github.com/abhisheksoni27/opendoor/internal/db"
	ghclient "github.com/abhisheksoni27/opendoor/internal/github"
	"github.com/abhisheksoni27/opendoor/internal/middleware"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/joho/godotenv"
)

var targetLanguages = []string{
	"Python", "JavaScript", "TypeScript", "Go", "Java", "C++", "C", "C#",
	"Rust", "PHP", "Ruby", "Swift", "Kotlin", "Shell", "Dart", "Scala",
	"Elixir", "Haskell", "Lua", "Julia", "Clojure", "R", "Zig", "OCaml",
	"Vue", "Svelte", "HTML", "CSS", "PowerShell", "Nix", "Perl", "Solidity",
	"Erlang", "Nim", "Objective-C", "Fortran", "F#", "Common Lisp", "Emacs Lisp",
	"Assembly", "Groovy", "GDScript", "Crystal", "Haxe", "D", "V", "Gleam", "Odin",
}

func main() {
	minStarsFlag := flag.Int("min-stars", 200, "Minimum stars threshold (default 200)")
	langFlag := flag.String("lang", "", "Target a specific language (optional, e.g. 'Swift')")
	maxPagesFlag := flag.Int("max-pages", 10, "Max search result pages per query (default 10)")
	dryRunFlag := flag.Bool("dry-run", false, "Preview queries without DB insertion")
	flag.Parse()

	_ = godotenv.Load("/opt/opendoor/.env")
	_ = godotenv.Load("/opt/opendoor/backend/.env")
	_ = godotenv.Load()

	cfg, err := config.Load()
	if err != nil {
		slog.Error("config load failed", "err", err)
		os.Exit(1)
	}

	database, err := db.Connect(cfg.DatabaseURL)
	if err != nil {
		slog.Error("database connection failed", "err", err)
		os.Exit(1)
	}
	defer database.Close()

	_, vkClient, err := middleware.Cache(cfg.ValkeyURL, cfg.ValkeyUsername, cfg.ValkeyPassword)
	if err != nil {
		slog.Warn("cache connection failed, proceeding without cache", "err", err)
	}

	gh := ghclient.NewClient(cfg.GithubToken, vkClient)

	slog.Info("starting catalog discovery pass", "min_stars", *minStarsFlag, "lang", *langFlag, "dry_run", *dryRunFlag)

	// If a specific language is targeted, run full deep language brackets (200..4999 stars)
	if *langFlag != "" {
		sweepLanguageDeepBrackets(database, gh, *langFlag, *minStarsFlag, *maxPagesFlag, *dryRunFlag)
		slog.Info("targeted language discovery pass finished successfully", "lang", *langFlag)
		return
	}

	// Step 1: Global High-Star Sweep (all repos >= 500 stars, across all languages)
	if *minStarsFlag <= 500 {
		sweepGlobalBrackets(database, gh, *maxPagesFlag, *dryRunFlag)
	}

	// Step 2: Per-Language Sweep across target languages
	sweepAllLanguageBrackets(database, gh, *minStarsFlag, *maxPagesFlag, *dryRunFlag)

	slog.Info("bulk catalog discovery pass finished successfully")
}

func sweepGlobalBrackets(database *sqlx.DB, gh *ghclient.Client, maxPages int, dryRun bool) {
	brackets := []struct {
		min int
		max int
	}{
		{min: 50000, max: 0},
		{min: 20000, max: 49999},
		{min: 10000, max: 19999},
		{min: 5000, max: 9999},
		{min: 3000, max: 4999},
		{min: 2000, max: 2999},
		{min: 1500, max: 1999},
		{min: 1000, max: 1499},
		{min: 800, max: 999},
		{min: 650, max: 799},
		{min: 500, max: 649},
	}

	for _, b := range brackets {
		query := fmt.Sprintf("stars:>=%d archived:false sort:stars-desc", b.min)
		if b.max > 0 {
			query = fmt.Sprintf("stars:%d..%d archived:false sort:stars-desc", b.min, b.max)
		}
		slog.Info("sweeping global bracket", "query", query)
		sweepQuery(database, gh, query, maxPages, dryRun)
	}
}

// sweepLanguageDeepBrackets sweeps a specific language across the entire 200..4999 star spectrum
// using fine-grained brackets to guarantee we stay below GitHub's 1000 search result cutoff.
func sweepLanguageDeepBrackets(database *sqlx.DB, gh *ghclient.Client, lang string, minStars, maxPages int, dryRun bool) {
	brackets := []struct {
		min int
		max int
	}{
		{min: 3000, max: 4999},
		{min: 2000, max: 2999},
		{min: 1000, max: 1999},
		{min: 750, max: 999},
		{min: 500, max: 749},
		{min: 350, max: 499},
		{min: 200, max: 349},
	}

	for _, b := range brackets {
		if b.max < minStars {
			continue
		}
		// Query in descending order
		queryDesc := fmt.Sprintf("language:\"%s\" stars:%d..%d archived:false sort:stars-desc", lang, b.min, b.max)
		slog.Info("sweeping deep language bracket (desc)", "language", lang, "stars", fmt.Sprintf("%d..%d", b.min, b.max))
		sweepQuery(database, gh, queryDesc, maxPages, dryRun)

		// Query in ascending order to capture long-tail repos near the bottom cutoff
		queryAsc := fmt.Sprintf("language:\"%s\" stars:%d..%d archived:false sort:stars-asc", lang, b.min, b.max)
		slog.Info("sweeping deep language bracket (asc)", "language", lang, "stars", fmt.Sprintf("%d..%d", b.min, b.max))
		sweepQuery(database, gh, queryAsc, maxPages, dryRun)
	}
}

func sweepAllLanguageBrackets(database *sqlx.DB, gh *ghclient.Client, minStars, maxPages int, dryRun bool) {
	brackets := []struct {
		min int
		max int
	}{
		{min: 2000, max: 4999},
		{min: 1000, max: 1999},
		{min: 500, max: 999},
		{min: 350, max: 499},
		{min: 200, max: 349},
	}

	for _, lang := range targetLanguages {
		for _, b := range brackets {
			if b.max < minStars {
				continue
			}
			query := fmt.Sprintf("language:\"%s\" stars:%d..%d archived:false sort:stars-desc", lang, b.min, b.max)
			slog.Info("sweeping language bracket", "language", lang, "stars", fmt.Sprintf("%d..%d", b.min, b.max))
			sweepQuery(database, gh, query, maxPages, dryRun)
		}
	}
}

func sweepQuery(database *sqlx.DB, gh *ghclient.Client, queryStr string, maxPages int, dryRun bool) {
	after := ""
	pageCount := 0
	newInThisQuery := 0

	for {
		page, err := gh.FetchCustomQueryReposPage(queryStr, 100, after)
		if err != nil {
			slog.Error("fetch query page failed", "query", queryStr, "page", pageCount+1, "err", err)
			break
		}

		if len(page.Repos) == 0 {
			break
		}

		pageCount++
		for _, r := range page.Repos {
			if dryRun {
				continue
			}
			inserted, err := upsertCatalogRepo(database, r)
			if err != nil {
				slog.Warn("failed to upsert repo", "repo", r.FullName, "err", err)
				continue
			}
			if inserted {
				newInThisQuery++
			}
		}

		slog.Info("page processed", "query", queryStr, "page", pageCount, "found", len(page.Repos), "new", newInThisQuery)

		if !page.HasNextPage || page.EndCursor == "" || pageCount >= maxPages {
			break
		}
		after = page.EndCursor
	}
}

func upsertCatalogRepo(database *sqlx.DB, r ghclient.Repo) (bool, error) {
	now := time.Now().UTC()
	var existingID string
	err := database.Get(&existingID, `SELECT id FROM repositories WHERE full_name = ?`, r.FullName)
	if err == nil && existingID != "" {
		_, err = database.Exec(`
			UPDATE repositories 
			SET stars = ?, description = ?, updated_at = ?
			WHERE id = ?
		`, r.Stars, r.Description, now, existingID)
		return false, err
	}

	id := uuid.New().String()
	_, err = database.Exec(`
		INSERT INTO repositories (
			id, full_name, owner, name, language, stars, description, github_url, created_at, updated_at
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`, id, r.FullName, r.Owner, r.Name, r.Language, r.Stars, r.Description, r.URL, now, now)
	if err != nil {
		return false, err
	}

	if len(r.Topics) > 0 {
		for _, t := range r.Topics {
			tClean := strings.TrimSpace(strings.ToLower(t))
			if tClean != "" {
				_, _ = database.Exec(`
					INSERT IGNORE INTO repository_topics (repository_id, topic)
					VALUES (?, ?)
				`, id, tClean)
			}
		}
	}

	_, _ = database.Exec(`
		INSERT IGNORE INTO indexing_queue (full_name, owner, name, priority, status, created_at)
		VALUES (?, ?, ?, 3, 'pending', CURRENT_TIMESTAMP)
	`, r.FullName, r.Owner, r.Name)

	return true, nil
}
