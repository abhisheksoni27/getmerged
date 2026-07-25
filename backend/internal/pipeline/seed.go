package pipeline

import (
	"fmt"
	"log/slog"
	"strings"
	"time"

	"github.com/abhisheksoni27/opendoor/internal/github"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

// SeedLanguages is the fixed set of languages to seed.
var SeedLanguages = []string{"Go", "Python", "JavaScript"}

const (
	seedMinStars = 1000
	seedMaxRepos = 20
)

// Seed fetches top repos for each language and upserts them into the repositories table.
func Seed(db *sqlx.DB, gh *github.Client, languages []string) error {
	if len(languages) == 0 {
		languages = SeedLanguages
	}

	slog.Info("seed started", "languages", languages)

	for _, lang := range languages {
		slog.Info("seed: fetching repos", "language", lang, "min_stars", seedMinStars, "max", seedMaxRepos)

		repos, err := gh.SearchRepos(lang, seedMinStars, seedMaxRepos)
		if err != nil {
			return fmt.Errorf("seed %s: %w", lang, err)
		}

		slog.Info("seed: upserting repos", "language", lang, "count", len(repos))

		inserted, skipped := 0, 0
		for _, r := range repos {
			if err := upsertRepo(db, r); err != nil {
				slog.Error("seed: upsert failed", "repo", r.FullName, "err", err)
				skipped++
				continue
			}
			inserted++
		}

		slog.Info("seed: language done", "language", lang, "inserted", inserted, "skipped", skipped)
	}

	slog.Info("seed complete")
	return nil
}

func upsertRepo(db *sqlx.DB, r github.Repo) error {
	query := `
		INSERT INTO repositories (id, full_name, owner, name, language, stars, description, github_url, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
		ON CONFLICT(full_name) DO UPDATE SET
			stars       = excluded.stars,
			description = excluded.description,
			updated_at  = excluded.updated_at
	`
	_, err := db.Exec(query,
		uuid.New().String(),
		r.FullName,
		r.Owner,
		r.Name,
		r.Language,
		r.Stars,
		strings.TrimSpace(r.Description),
		r.URL,
		time.Now().UTC(),
	)
	return err
}
