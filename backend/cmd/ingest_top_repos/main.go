package main

import (
	"context"
	"fmt"
	"log/slog"
	"os"
	"time"

	"github.com/abhisheksoni27/opendoor/internal/config"
	"github.com/abhisheksoni27/opendoor/internal/db"
	ghclient "github.com/abhisheksoni27/opendoor/internal/github"
	"github.com/abhisheksoni27/opendoor/internal/middleware"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/joho/godotenv"
)

func main() {
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

	cacheMiddleware, vkClient, err := middleware.Cache(cfg.ValkeyURL, cfg.ValkeyUsername, cfg.ValkeyPassword)
	if err != nil {
		slog.Warn("cache connection failed, proceeding without cache", "err", err)
	}
	_ = cacheMiddleware

	gh := ghclient.NewClient(cfg.GithubToken, vkClient)

	minStars := 50000
	slog.Info("starting one-shot top repos ingestion", "min_stars", minStars)

	after := ""
	totalFound := 0
	totalIngested := 0

	for {
		query := fmt.Sprintf("stars:>=%d archived:false sort:stars-desc", minStars)
		page, err := gh.FetchCustomQueryReposPage(query, 100, after)
		if err != nil {
			slog.Error("fetch top repos page failed", "err", err)
			break
		}

		if len(page.Repos) == 0 {
			break
		}

		totalFound += len(page.Repos)
		for _, repo := range page.Repos {
			inserted, err := upsertRepo(database, repo)
			if err != nil {
				slog.Warn("failed to upsert top repo", "full_name", repo.FullName, "err", err)
				continue
			}
			if inserted {
				totalIngested++
			}
		}

		slog.Info("top repos page processed", "found", len(page.Repos), "total_found", totalFound, "total_new", totalIngested)

		if !page.HasNextPage || page.EndCursor == "" {
			break
		}
		after = page.EndCursor
	}

	slog.Info("mega repo ingestion completed", "total_found", totalFound, "total_ingested", totalIngested)
}

func upsertRepo(database *sqlx.DB, r ghclient.Repo) (bool, error) {
	now := time.Now().UTC()
	var existingID string
	err := database.Get(&existingID, `SELECT id FROM repositories WHERE full_name = ?`, r.FullName)
	if err == nil && existingID != "" {
		// Update stars and metadata
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

	// Enqueue for immediate scoring scan
	_, _ = database.ExecContext(context.Background(), `
		INSERT IGNORE INTO crawl_queue (repo_id, priority, next_crawl_at, created_at)
		VALUES (?, 3, ?, ?)
	`, id, now, now)

	return true, nil
}
