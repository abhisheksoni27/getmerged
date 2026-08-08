package main

import (
	"bufio"
	"compress/gzip"
	"encoding/json"
	"flag"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"regexp"
	"strings"
	"sync"
	"time"

	"github.com/abhisheksoni27/opendoor/internal/config"
	"github.com/abhisheksoni27/opendoor/internal/db"
	"github.com/jmoiron/sqlx"
)

// GHArchiveEvent maps the top level structure of a GHArchive JSON line
type GHArchiveEvent struct {
	Type      string          `json:"type"`
	Actor     Actor           `json:"actor"`
	Repo      Repo            `json:"repo"`
	Payload   json.RawMessage `json:"payload"`
	CreatedAt string          `json:"created_at"`
}

type Actor struct {
	Login string `json:"login"`
}

// toMySQL converts an ISO 8601 timestamp string (e.g. "2026-08-07T12:00:00Z") to MySQL DATETIME format.
func toMySQL(s string) string {
	t, err := time.Parse(time.RFC3339, s)
	if err != nil {
		return s
	}
	return t.UTC().Format("2006-01-02 15:04:05")
}

type Repo struct {
	Name string `json:"name"` // full name e.g. "owner/repo"
}

// Payload structs — only action and pr_number matter; GHArchive strips the full PR object.
type PREventPayload struct {
	Action string `json:"action"`
	Number int    `json:"number"`
}

type IssueCommentPayload struct {
	Action  string  `json:"action"`
	Issue   Issue   `json:"issue"`
	Comment Comment `json:"comment"`
}

type PRReviewCommentPayload struct {
	Action      string      `json:"action"`
	PullRequest PullRequest `json:"pull_request"`
	Comment     Comment     `json:"comment"`
}

type PullRequest struct {
	Number            int    `json:"number"`
	State             string `json:"state"`
	CreatedAt         string `json:"created_at"`
	MergedAt          *string `json:"merged_at"`
	AuthorAssociation string `json:"author_association"`
	User              Actor  `json:"user"`
}

type Issue struct {
	Number      int          `json:"number"`
	PullRequest *interface{} `json:"pull_request"` // If not nil, it's a PR
}

type Comment struct {
	CreatedAt string `json:"created_at"`
	Body      string `json:"body"`
	User      Actor  `json:"user"`
}

func main() {
	var days int
	flag.IntVar(&days, "days", 1, "Number of past days to sync from GHArchive")
	flag.Parse()

	cfg, err := config.Load()
	if err != nil {
		slog.Error("config load failed", "err", err)
		os.Exit(1)
	}

	database, err := db.Connect(cfg.DatabaseURL)
	if err != nil {
		slog.Error("Failed to connect to db", "err", err)
		os.Exit(1)
	}

	trackedRepos, err := loadTrackedRepos(database)
	if err != nil {
		slog.Error("Failed to load tracked repos", "err", err)
		os.Exit(1)
	}
	slog.Info("Loaded tracked repos", "count", len(trackedRepos))
	if len(trackedRepos) == 0 {
		return
	}

	now := time.Now().UTC()
	// GHArchive publishes previous hours.
	start := now.Add(-time.Duration(days*24) * time.Hour)

	// Build list of URLs to process
	var urls []string
	for d := start; d.Before(now); d = d.Add(time.Hour) {
		// format: YYYY-MM-DD-H.json.gz (H is 0-23 without zero-padding)
		dateStr := d.Format("2006-01-02")
		hourStr := fmt.Sprintf("%d", d.Hour())
		url := fmt.Sprintf("https://data.gharchive.org/%s-%s.json.gz", dateStr, hourStr)
		urls = append(urls, url)
	}

	slog.Info("Starting GHArchive sync", "files_to_process", len(urls))

	const maxConcurrency = 4 // Don't overwhelm network/db
	sem := make(chan struct{}, maxConcurrency)
	var wg sync.WaitGroup

	for _, url := range urls {
		wg.Add(1)
		sem <- struct{}{}
		go func(u string) {
			defer wg.Done()
			defer func() { <-sem }()
			processGHArchiveFile(database, u, trackedRepos)
		}(url)
	}

	wg.Wait()
	slog.Info("GHArchive sync complete")
}

func loadTrackedRepos(db *sqlx.DB) (map[string]string, error) {
	rows, err := db.Query("SELECT id, full_name FROM repositories")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	m := make(map[string]string)
	for rows.Next() {
		var id, fullName string
		if err := rows.Scan(&id, &fullName); err != nil {
			continue
		}
		m[fullName] = id
	}
	return m, nil
}

func processGHArchiveFile(db *sqlx.DB, url string, trackedRepos map[string]string) {
	slog.Info("Downloading GHArchive", "url", url)
	client := &http.Client{Timeout: 5 * time.Minute}
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		slog.Error("Failed to create request", "url", url, "err", err)
		return
	}
	// GHArchive requires a User-Agent
	req.Header.Set("User-Agent", "Opendoor-Crawler/1.0")

	resp, err := client.Do(req)
	if err != nil {
		slog.Error("Failed to download", "url", url, "err", err)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		slog.Warn("GHArchive file not available (yet or error)", "url", url, "status", resp.StatusCode)
		return
	}

	gzReader, err := gzip.NewReader(resp.Body)
	if err != nil {
		slog.Error("Failed to open gzip reader", "url", url, "err", err)
		return
	}
	defer gzReader.Close()

	scanner := bufio.NewScanner(gzReader)
	// Some JSON lines can be quite large
	const maxCapacity = 10 * 1024 * 1024
	buf := make([]byte, maxCapacity)
	scanner.Buffer(buf, maxCapacity)

	processedCount := 0
	matchedCount := 0

	for scanner.Scan() {
		processedCount++
		line := scanner.Bytes()

		var ev GHArchiveEvent
		if err := json.Unmarshal(line, &ev); err != nil {
			continue
		}

		repoID, exists := trackedRepos[ev.Repo.Name]
		if !exists {
			continue
		}
		matchedCount++

		switch ev.Type {
		case "PullRequestEvent":
			handlePullRequestEvent(db, repoID, ev)
		case "IssueCommentEvent":
			handleIssueCommentEvent(db, repoID, ev)
		case "PullRequestReviewCommentEvent":
			handlePRReviewCommentEvent(db, repoID, ev)
		}
	}

	if err := scanner.Err(); err != nil {
		slog.Error("Scanner error", "url", url, "err", err)
	}

	slog.Info("Finished processing file", "url", url, "total_events", processedCount, "matched", matchedCount)
}

func handlePullRequestEvent(db *sqlx.DB, repoID string, ev GHArchiveEvent) {
	var payload PREventPayload
	if err := json.Unmarshal(ev.Payload, &payload); err != nil {
		return
	}
	if ev.CreatedAt == "" || payload.Number == 0 || ev.Actor.Login == "" {
		return
	}
	if strings.Contains(strings.ToLower(ev.Actor.Login), "bot") {
		return
	}
	// Normalise action: GHArchive uses 'closed' for both close and merge
	// but also emits action='merged' in some versions. Keep as-is.
	_, _ = db.Exec(`
		INSERT IGNORE INTO repo_pr_events (repository_id, pr_number, actor_login, action, event_at)
		VALUES (?, ?, ?, ?, ?)
	`, repoID, payload.Number, ev.Actor.Login, payload.Action, toMySQL(ev.CreatedAt))
}

func handleIssueCommentEvent(db *sqlx.DB, repoID string, ev GHArchiveEvent) {
	var payload IssueCommentPayload
	if err := json.Unmarshal(ev.Payload, &payload); err != nil {
		return
	}
	if payload.Action != "created" {
		return
	}
	insertRawComment(db, repoID, payload.Comment.User.Login, payload.Comment.Body, payload.Comment.CreatedAt)
}

func handlePRReviewCommentEvent(db *sqlx.DB, repoID string, ev GHArchiveEvent) {
	var payload PRReviewCommentPayload
	if err := json.Unmarshal(ev.Payload, &payload); err != nil {
		return
	}
	if payload.Action != "created" {
		return
	}
	insertRawComment(db, repoID, payload.Comment.User.Login, payload.Comment.Body, payload.Comment.CreatedAt)
}

func insertRawComment(db *sqlx.DB, repoID, authorLogin, body, createdAt string) {
	if strings.Contains(strings.ToLower(authorLogin), "bot") {
		return // Skip bots for AI Insights
	}
	
	// Strip markdown code blocks (everything between ``` and ```)
	re := regexp.MustCompile("(?s)```.*?```")
	body = re.ReplaceAllString(body, "")
	
	cleanText := strings.TrimSpace(body)
	if cleanText == "" {
		return
	}
	
	// Truncate to max 2000 characters
	if len(cleanText) > 2000 {
		cleanText = cleanText[:2000]
	}
	
	_, _ = db.Exec(`
		INSERT IGNORE INTO repo_raw_comments (repository_id, author_login, comment_text, created_at)
		VALUES (?, ?, ?, ?)
	`, repoID, authorLogin, cleanText, createdAt)
}
