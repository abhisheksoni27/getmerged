package main

import (
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"log/slog"
	"os"
	"regexp"
	"strings"
	"time"

	_ "github.com/go-sql-driver/mysql"
	"github.com/jmoiron/sqlx"
	"github.com/joho/godotenv"
)

type TargetRepo struct {
	ID       string `db:"id"`
	FullName string `db:"full_name"`
	Owner    string `db:"owner"`
	Name     string `db:"name"`
	Tier     string `db:"c_rank_tier"`
}

type PullRequestREST struct {
	Number    int     `json:"number"`
	State     string  `json:"state"`
	CreatedAt string  `json:"created_at"`
	MergedAt  *string `json:"merged_at"`
	ClosedAt  *string `json:"closed_at"`
	User      User    `json:"user"`
}

type User struct {
	Login string `json:"login"`
}

type CommentREST struct {
	CreatedAt           string `json:"created_at"`
	Body                string `json:"body"`
	User                User   `json:"user"`
	PullRequestReviewID int    `json:"pull_request_review_id"`
	PullRequestURL      string `json:"pull_request_url"`
}

func main() {
	var (
		repoFlag          = flag.String("repo", "", "Single repo to backfill (e.g. PostHog/posthog) for verification")
		fromFlag          = flag.String("from", "2026-05-23", "Start date YYYY-MM-DD")
		toFlag            = flag.String("to", "2026-08-07", "End date YYYY-MM-DD")
		tiersFlag         = flag.String("tiers", "S,A", "Comma-separated tiers to backfill (default S,A)")
		commentsTiersFlag = flag.String("comments-tiers", "S,A", "Comma-separated tiers to backfill comments for (default S,A)")
		rphFlag           = flag.Int("rph", 4800, "Requests per hour budget")
		ckptFlag          = flag.String("checkpoint", "backfill_checkpoint.json", "Path to checkpoint file")
		tokenFlag         = flag.String("token", "", "GitHub PAT token (defaults to GITHUB_TOKEN env)")
		dryRunFlag        = flag.Bool("dry-run", false, "Dry run without writing to DB")
	)
	flag.Parse()

	_ = godotenv.Load("/opt/opendoor/.env")
	_ = godotenv.Load("/opt/opendoor/backend/.env")
	_ = godotenv.Load()

	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		dbURL = "opendoor_user:opendoor_pass@tcp(localhost:3306)/opendoor"
	}

	token := *tokenFlag
	if token == "" {
		token = os.Getenv("GITHUB_TOKEN")
	}
	if token == "" {
		slog.Error("GITHUB_TOKEN environment variable or -token flag is required")
		os.Exit(1)
	}

	db, err := sqlx.Connect("mysql", dbURL)
	if err != nil {
		slog.Error("Failed to connect to database", "err", err)
		os.Exit(1)
	}
	defer db.Close()

	client := NewRESTClient(token, *rphFlag)
	ctx := context.Background()

	fromDate, err := time.Parse("2006-01-02", *fromFlag)
	if err != nil {
		slog.Error("Invalid -from date format, expected YYYY-MM-DD", "val", *fromFlag)
		os.Exit(1)
	}

	toDate, err := time.Parse("2006-01-02", *toFlag)
	if err != nil {
		slog.Error("Invalid -to date format, expected YYYY-MM-DD", "val", *toFlag)
		os.Exit(1)
	}
	// Make toDate cover end of the target day
	toDate = toDate.Add(23*time.Hour + 59*time.Minute + 59*time.Second)

	slog.Info("Backfill tool starting",
		"from", fromDate.Format("2006-01-02"),
		"to", toDate.Format("2006-01-02"),
		"rph", *rphFlag,
		"tiers", *tiersFlag,
		"dry_run", *dryRunFlag,
	)

	var repos []TargetRepo

	if *repoFlag != "" {
		parts := strings.Split(*repoFlag, "/")
		if len(parts) != 2 {
			slog.Error("Invalid -repo format, expected owner/name", "val", *repoFlag)
			os.Exit(1)
		}
		var r TargetRepo
		err := db.Get(&r, `
			SELECT r.id, r.full_name, r.owner, r.name, COALESCE(s.c_rank_tier, 'A') as c_rank_tier
			FROM repositories r
			LEFT JOIN latest_snapshots s ON s.repository_id = r.id
			WHERE r.full_name = ?
		`, *repoFlag)
		if err != nil {
			slog.Error("Failed to find repo in database", "repo", *repoFlag, "err", err)
			os.Exit(1)
		}
		repos = append(repos, r)
	} else {
		tierList := strings.Split(*tiersFlag, ",")
		includeUnscored := false
		var cleanTiers []string
		for i := range tierList {
			t := strings.ToUpper(strings.TrimSpace(tierList[i]))
			if t == "UNSCORED" || t == "ALL" {
				includeUnscored = true
			}
			if t != "" && t != "UNSCORED" && t != "ALL" {
				cleanTiers = append(cleanTiers, t)
			}
		}

		var query string
		var args []any
		var inErr error

		if includeUnscored && len(cleanTiers) == 0 {
			query = `
				SELECT r.id, r.full_name, r.owner, r.name, 'UNSCORED' as c_rank_tier
				FROM repositories r
				LEFT JOIN latest_snapshots s ON s.repository_id = r.id
				WHERE s.repository_id IS NULL
				ORDER BY r.stars DESC
			`
		} else if includeUnscored {
			query, args, inErr = sqlx.In(`
				SELECT r.id, r.full_name, r.owner, r.name, COALESCE(s.c_rank_tier, 'UNSCORED') as c_rank_tier
				FROM repositories r
				LEFT JOIN latest_snapshots s ON s.repository_id = r.id
				WHERE s.repository_id IS NULL OR s.c_rank_tier IN (?)
				ORDER BY COALESCE(s.c_rank_score, 0) DESC, r.stars DESC
			`, cleanTiers)
		} else {
			query, args, inErr = sqlx.In(`
				SELECT r.id, r.full_name, r.owner, r.name, COALESCE(s.c_rank_tier, 'A') as c_rank_tier
				FROM repositories r
				JOIN latest_snapshots s ON s.repository_id = r.id
				WHERE s.c_rank_tier IN (?)
				ORDER BY s.c_rank_score DESC
			`, cleanTiers)
		}

		if inErr != nil {
			slog.Error("Failed to build SQL query for tiers", "err", inErr)
			os.Exit(1)
		}
		query = db.Rebind(query)
		if err := db.Select(&repos, query, args...); err != nil {
			slog.Error("Failed to fetch target repos from database", "err", err)
			os.Exit(1)
		}
	}

	slog.Info("Loaded target repositories", "count", len(repos))

	checkpoint, err := LoadCheckpoint(*ckptFlag)
	if err != nil {
		slog.Error("Failed to load checkpoint file", "path", *ckptFlag, "err", err)
		os.Exit(1)
	}

	skipUntilFound := false
	if checkpoint.LastRepoID != "" && *repoFlag == "" {
		skipUntilFound = true
		slog.Info("Resuming from checkpoint", "last_repo", checkpoint.LastRepoFullName, "processed_so_far", checkpoint.ReposProcessed)
	}

	reCodeBlock := regexp.MustCompile("(?s)```.*?```")

	commentsTierSet := map[string]bool{}
	for _, t := range strings.Split(*commentsTiersFlag, ",") {
		commentsTierSet[strings.TrimSpace(t)] = true
	}

	for i, r := range repos {
		if skipUntilFound {
			if r.ID == checkpoint.LastRepoID {
				skipUntilFound = false
				slog.Info("Found checkpoint repo, starting from next", "repo", r.FullName)
				continue
			}
			continue
		}

		slog.Info("Processing repo", "index", i+1, "total", len(repos), "repo", r.FullName, "tier", r.Tier)

		prsInserted, err := processPREvents(ctx, db, client, r, fromDate, toDate, *dryRunFlag)
		if err != nil {
			slog.Warn("PR events backfill returned error/warning", "repo", r.FullName, "err", err)
		}

		commentsInserted := 0
		// Backfill comments only for tiers in -comments-tiers (default S,A)
		if commentsTierSet[r.Tier] {
			ci, err := processComments(ctx, db, client, r, fromDate, toDate, reCodeBlock, *dryRunFlag)
			if err != nil {
				slog.Warn("Comments backfill returned error/warning", "repo", r.FullName, "err", err)
			}
			commentsInserted = ci
		}

		checkpoint.LastRepoID = r.ID
		checkpoint.LastRepoFullName = r.FullName
		checkpoint.ReposProcessed++
		checkpoint.PRsInserted += prsInserted
		checkpoint.CommentsInserted += commentsInserted
		checkpoint.RequestsUsed = client.RequestCount()

		if !*dryRunFlag && *repoFlag == "" {
			_ = checkpoint.Save(*ckptFlag)
		}
	}

	slog.Info("Backfill completed!",
		"repos_processed", checkpoint.ReposProcessed,
		"prs_inserted", checkpoint.PRsInserted,
		"comments_inserted", checkpoint.CommentsInserted,
		"requests_used", client.RequestCount(),
	)
}

func processPREvents(ctx context.Context, db *sqlx.DB, client *RESTClient, r TargetRepo, fromDate, toDate time.Time, dryRun bool) (int, error) {
	prsInserted := 0
	page := 1

	for {
		url := fmt.Sprintf("https://api.github.com/repos/%s/%s/pulls?state=all&per_page=100&sort=created&direction=desc&page=%d",
			r.Owner, r.Name, page)

		body, _, err := client.Get(ctx, url)
		if err != nil {
			return prsInserted, fmt.Errorf("fetch pulls page %d: %w", page, err)
		}

		var prs []PullRequestREST
		if err := json.Unmarshal(body, &prs); err != nil {
			return prsInserted, fmt.Errorf("unmarshal pulls page %d: %w", page, err)
		}

		if len(prs) == 0 {
			break
		}

		stopPagination := false
		for _, pr := range prs {
			createdAt, err := time.Parse(time.RFC3339, pr.CreatedAt)
			if err != nil {
				continue
			}

			if createdAt.Before(fromDate) {
				stopPagination = true
				break
			}

			if createdAt.After(toDate) {
				continue
			}

			actorLogin := pr.User.Login
			if actorLogin == "" || strings.Contains(strings.ToLower(actorLogin), "bot") {
				continue
			}

			// Opened event
			if !dryRun {
				_, _ = db.ExecContext(ctx, `
					INSERT IGNORE INTO repo_pr_events (repository_id, pr_number, actor_login, action, event_at)
					VALUES (?, ?, ?, 'opened', ?)
				`, r.ID, pr.Number, actorLogin, createdAt.UTC().Format("2006-01-02 15:04:05"))
			}
			prsInserted++

			// Merged event
			if pr.MergedAt != nil {
				mergedAt, err := time.Parse(time.RFC3339, *pr.MergedAt)
				if err == nil {
					if !dryRun {
						_, _ = db.ExecContext(ctx, `
							INSERT IGNORE INTO repo_pr_events (repository_id, pr_number, actor_login, action, event_at)
							VALUES (?, ?, ?, 'merged', ?)
						`, r.ID, pr.Number, actorLogin, mergedAt.UTC().Format("2006-01-02 15:04:05"))
					}
					prsInserted++
				}
			} else if pr.ClosedAt != nil {
				closedAt, err := time.Parse(time.RFC3339, *pr.ClosedAt)
				if err == nil {
					if !dryRun {
						_, _ = db.ExecContext(ctx, `
							INSERT IGNORE INTO repo_pr_events (repository_id, pr_number, actor_login, action, event_at)
							VALUES (?, ?, ?, 'closed', ?)
						`, r.ID, pr.Number, actorLogin, closedAt.UTC().Format("2006-01-02 15:04:05"))
					}
					prsInserted++
				}
			}
		}

		if stopPagination || len(prs) < 100 {
			break
		}
		page++
	}

	return prsInserted, nil
}

func processComments(ctx context.Context, db *sqlx.DB, client *RESTClient, r TargetRepo, fromDate, toDate time.Time, reCodeBlock *regexp.Regexp, dryRun bool) (int, error) {
	commentsInserted := 0
	sinceStr := fromDate.Format("2006-01-02T15:04:05Z")

	endpoints := []struct {
		url  string
		isPR bool
	}{
		{fmt.Sprintf("https://api.github.com/repos/%s/%s/pulls/comments?since=%s&per_page=100", r.Owner, r.Name, sinceStr), true},
		{fmt.Sprintf("https://api.github.com/repos/%s/%s/issues/comments?since=%s&per_page=100", r.Owner, r.Name, sinceStr), false},
	}

	for _, ep := range endpoints {
		body, _, err := client.Get(ctx, ep.url)
		if err != nil {
			slog.Debug("Fetch comments endpoint failed", "endpoint", ep.url, "err", err)
			continue
		}

		var comments []CommentREST
		if err := json.Unmarshal(body, &comments); err != nil {
			continue
		}

		for _, c := range comments {
			createdAt, err := time.Parse(time.RFC3339, c.CreatedAt)
			if err != nil || createdAt.After(toDate) {
				continue
			}

			author := c.User.Login
			if author == "" || strings.Contains(strings.ToLower(author), "bot") {
				continue
			}

			cleanText := reCodeBlock.ReplaceAllString(c.Body, "")
			cleanText = strings.TrimSpace(cleanText)
			if cleanText == "" {
				continue
			}
			if len(cleanText) > 2000 {
				cleanText = cleanText[:2000]
			}
			if !dryRun {
				if ep.isPR {
					prNumber := prNumberFromURL(c.PullRequestURL)
					if prNumber == 0 {
						continue
					}
					_, _ = db.ExecContext(ctx, `
						INSERT IGNORE INTO repo_pr_comments (
							repository_id, pr_number, source_type, author_login, author_association, comment_text, created_at
						)
						VALUES (?, ?, 'review_thread_comment', ?, '', ?, ?)
					`, r.ID, prNumber, author, cleanText, createdAt.UTC().Format("2006-01-02 15:04:05"))
				} else {
					_, _ = db.ExecContext(ctx, `
						INSERT IGNORE INTO repo_issue_comments (repository_id, comment_text, created_at)
						VALUES (?, ?, ?)
					`, r.ID, cleanText, createdAt.UTC().Format("2006-01-02 15:04:05"))
				}
			}
			commentsInserted++
		}
	}

	return commentsInserted, nil
}

func prNumberFromURL(rawURL string) int {
	parts := strings.Split(strings.TrimRight(rawURL, "/"), "/")
	if len(parts) == 0 {
		return 0
	}
	var number int
	_, _ = fmt.Sscanf(parts[len(parts)-1], "%d", &number)
	return number
}
