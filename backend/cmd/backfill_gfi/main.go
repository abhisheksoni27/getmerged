package main

import (
	"context"
	"flag"
	"log/slog"
	"os"
	"time"

	"github.com/abhisheksoni27/opendoor/internal/config"
	"github.com/abhisheksoni27/opendoor/internal/db"
	"github.com/abhisheksoni27/opendoor/internal/github"
	"github.com/abhisheksoni27/opendoor/internal/pipeline"
)

func main() {
	limitFlag := flag.Int("limit", 100, "Maximum number of repositories to backfill in this run")
	timeoutFlag := flag.Duration("timeout", 60*time.Minute, "Execution timeout")
	flag.Parse()

	cfg, err := config.Load()
	if err != nil {
		slog.Error("failed to load config", "err", err)
		os.Exit(1)
	}
	database, err := db.Connect(cfg.DatabaseURL)
	if err != nil {
		slog.Error("failed to connect to database", "err", err)
		os.Exit(1)
	}
	defer database.Close()

	gh := github.NewClient(cfg.GithubToken, nil)
	backfillService := pipeline.NewGFIBackfillService(database, gh)

	ctx, cancel := context.WithTimeout(context.Background(), *timeoutFlag)
	defer cancel()

	slog.Info("starting good first issues backfill", "limit", *limitFlag, "timeout", *timeoutFlag)
	synced, err := backfillService.RunSweep(ctx, *limitFlag)
	if err != nil {
		slog.Error("backfill finished with error", "err", err, "synced", synced)
		os.Exit(1)
	}

	slog.Info("backfill completed successfully", "synced_repos", synced)
}
