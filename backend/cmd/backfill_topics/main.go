package main

import (
	"context"
	"encoding/json"
	"flag"
	"log/slog"
	"os"
	"time"

	"github.com/abhisheksoni27/opendoor/internal/config"
	"github.com/abhisheksoni27/opendoor/internal/db"
	ghclient "github.com/abhisheksoni27/opendoor/internal/github"
	"github.com/abhisheksoni27/opendoor/internal/middleware"
	"github.com/abhisheksoni27/opendoor/internal/repository"
	"github.com/joho/godotenv"
)

type TopicTarget struct {
	ID       string `db:"id"`
	FullName string `db:"full_name"`
	Owner    string `db:"owner"`
	Name     string `db:"name"`
}

type TopicCheckpoint struct {
	LastRepoID       string    `json:"last_repo_id"`
	LastRepoFullName string    `json:"last_repo_full_name"`
	ReposProcessed   int       `json:"repos_processed"`
	TopicsUpserted   int       `json:"topics_upserted"`
	UpdatedAt        time.Time `json:"updated_at"`
}

func loadCheckpoint(path string) (*TopicCheckpoint, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		if os.IsNotExist(err) {
			return &TopicCheckpoint{}, nil
		}
		return nil, err
	}
	var cp TopicCheckpoint
	if err := json.Unmarshal(data, &cp); err != nil {
		return nil, err
	}
	return &cp, nil
}

func (c *TopicCheckpoint) save(path string) error {
	c.UpdatedAt = time.Now().UTC()
	data, err := json.MarshalIndent(c, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(path, data, 0644)
}

func main() {
	var (
		limitFlag    = flag.Int("limit", 1500, "Max repos to backfill (ordered by c_rank_score desc)")
		ckptFlag     = flag.String("checkpoint", "backfill_topics_checkpoint.json", "Path to checkpoint file")
		dryRunFlag   = flag.Bool("dry-run", false, "Dry run without writing to DB")
		repoFlag     = flag.String("repo", "", "Single repo to backfill (owner/name) for verification")
	)
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

	repoStore := repository.NewRepoRepository(database)
	ctx := context.Background()

	cp, err := loadCheckpoint(*ckptFlag)
	if err != nil {
		slog.Error("failed to load checkpoint", "path", *ckptFlag, "err", err)
		os.Exit(1)
	}

	var targets []TopicTarget
	if *repoFlag != "" {
		var t TopicTarget
		err := database.Get(&t, `
			SELECT id, full_name, owner, name
			FROM repositories
			WHERE full_name = ?
		`, *repoFlag)
		if err != nil {
			slog.Error("failed to find repo", "repo", *repoFlag, "err", err)
			os.Exit(1)
		}
		targets = append(targets, t)
	} else {
		err := database.Select(&targets, `
			SELECT r.id, r.full_name, r.owner, r.name
			FROM repositories r
			LEFT JOIN latest_snapshots s ON s.repository_id = r.id
			ORDER BY COALESCE(s.c_rank_score, 0) DESC, r.stars DESC
			LIMIT ?
		`, *limitFlag)
		if err != nil {
			slog.Error("failed to load target repos", "err", err)
			os.Exit(1)
		}
	}

	slog.Info("topic backfill starting",
		"targets", len(targets),
		"dry_run", *dryRunFlag,
		"repo_flag", *repoFlag,
	)

	skipUntilFound := false
	if cp.LastRepoID != "" && *repoFlag == "" {
		skipUntilFound = true
		slog.Info("resuming from checkpoint", "last_repo", cp.LastRepoFullName, "processed_so_far", cp.ReposProcessed)
	}

	for _, t := range targets {
		if skipUntilFound {
			if t.ID == cp.LastRepoID {
				skipUntilFound = false
				continue
			}
			continue
		}

		topics, err := gh.FetchRepoTopics(t.Owner, t.Name)
		if err != nil {
			slog.Warn("FetchRepoTopics failed - skipping", "repo", t.FullName, "err", err)
			cp.LastRepoID = t.ID
			cp.LastRepoFullName = t.FullName
			cp.ReposProcessed++
			if !*dryRunFlag {
				_ = cp.save(*ckptFlag)
			}
			continue
		}

		if len(topics) > 0 && !*dryRunFlag {
			if err := repoStore.UpsertTopics(ctx, t.ID, topics); err != nil {
				slog.Warn("UpsertTopics failed", "repo", t.FullName, "err", err)
			} else {
				cp.TopicsUpserted += len(topics)
			}
		}

		cp.LastRepoID = t.ID
		cp.LastRepoFullName = t.FullName
		cp.ReposProcessed++
		if !*dryRunFlag {
			_ = cp.save(*ckptFlag)
		}

		if *repoFlag == "" && (cp.ReposProcessed%100 == 0) {
			slog.Info("topic backfill progress", "processed", cp.ReposProcessed, "topics_upserted", cp.TopicsUpserted)
		}
	}

	slog.Info("topic backfill complete",
		"repos_processed", cp.ReposProcessed,
		"topics_upserted", cp.TopicsUpserted,
		"dry_run", *dryRunFlag,
	)
}