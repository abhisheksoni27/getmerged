package main

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"regexp"
	"strconv"
	"strings"
	"sync"
	"syscall"
	"time"

	_ "github.com/go-sql-driver/mysql"
	"github.com/jmoiron/sqlx"
	"github.com/joho/godotenv"
)

type EventStreamItem struct {
	ID        string          `json:"id"`
	Type      string          `json:"type"`
	Actor     Actor           `json:"actor"`
	Repo      Repo            `json:"repo"`
	Payload   json.RawMessage `json:"payload"`
	CreatedAt string          `json:"created_at"`
}

type Actor struct {
	Login string `json:"login"`
}

type Repo struct {
	Name string `json:"name"` // "owner/repo"
}

type PREventPayload struct {
	Action string `json:"action"`
	Number int    `json:"number"`
}

type IssueCommentPayload struct {
	Action  string  `json:"action"`
	Comment Comment `json:"comment"`
}

type PRReviewCommentPayload struct {
	Action  string  `json:"action"`
	Comment Comment `json:"comment"`
}

type Comment struct {
	CreatedAt string `json:"created_at"`
	Body      string `json:"body"`
	User      Actor  `json:"user"`
}

// RingBuffer stores the last N seen event IDs to prevent duplicate DB writes
type RingBuffer struct {
	mu       sync.Mutex
	capacity int
	ids      map[string]struct{}
	queue    []string
}

func NewRingBuffer(capacity int) *RingBuffer {
	return &RingBuffer{
		capacity: capacity,
		ids:      make(map[string]struct{}, capacity),
		queue:    make([]string, 0, capacity),
	}
}

func (r *RingBuffer) Add(id string) bool {
	r.mu.Lock()
	defer r.mu.Unlock()

	if _, exists := r.ids[id]; exists {
		return false // Already seen
	}

	if len(r.queue) >= r.capacity {
		oldest := r.queue[0]
		r.queue = r.queue[1:]
		delete(r.ids, oldest)
	}

	r.queue = append(r.queue, id)
	r.ids[id] = struct{}{}
	return true // New ID
}

// TrackedReposStore holds the in-memory map of tracked repository names
type TrackedReposStore struct {
	mu    sync.RWMutex
	repos map[string]string // fullName -> id
}

func (s *TrackedReposStore) Get(fullName string) (string, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	id, exists := s.repos[fullName]
	return id, exists
}

func (s *TrackedReposStore) Reload(db *sqlx.DB) (int, error) {
	rows, err := db.Query("SELECT id, full_name FROM repositories")
	if err != nil {
		return 0, err
	}
	defer rows.Close()

	m := make(map[string]string)
	for rows.Next() {
		var id, fullName string
		if err := rows.Scan(&id, &fullName); err == nil {
			m[fullName] = id
		}
	}

	s.mu.Lock()
	s.repos = m
	count := len(m)
	s.mu.Unlock()

	return count, nil
}

func toMySQL(s string) string {
	t, err := time.Parse(time.RFC3339, s)
	if err != nil {
		return s
	}
	return t.UTC().Format("2006-01-02 15:04:05")
}

func main() {
	var (
		pollIntervalFlag = flag.Duration("interval", 15*time.Second, "Poll interval (e.g. 15s)")
		tokenFlag        = flag.String("token", "", "GitHub PAT token")
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

	db, err := sqlx.Connect("mysql", dbURL)
	if err != nil {
		slog.Error("Failed to connect to database", "err", err)
		os.Exit(1)
	}
	defer db.Close()

	repoStore := &TrackedReposStore{}
	count, err := repoStore.Reload(db)
	if err != nil {
		slog.Error("Failed to load tracked repos", "err", err)
		os.Exit(1)
	}
	slog.Info("Loaded tracked repos", "count", count)

	ringBuf := NewRingBuffer(10000)
	reCodeBlock := regexp.MustCompile("(?s)```.*?```")
	httpClient := &http.Client{Timeout: 30 * time.Second}

	// Auto-reload tracked repos every 5 minutes
	go func() {
		ticker := time.NewTicker(5 * time.Minute)
		defer ticker.Stop()
		for range ticker.C {
			if c, err := repoStore.Reload(db); err == nil {
				slog.Debug("Reloaded tracked repos", "count", c)
			}
		}
	}()

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	slog.Info("EventStream daemon started", "interval", pollIntervalFlag.String(), "auth", token != "")

	ticker := time.NewTicker(*pollIntervalFlag)
	defer ticker.Stop()

	var lastETag string

	for {
		select {
		case <-ctx.Done():
			slog.Info("EventStream daemon shutting down...")
			return
		case <-ticker.C:
			etag := pollEvents(ctx, httpClient, token, lastETag, repoStore, ringBuf, db, reCodeBlock)
			if etag != "" {
				lastETag = etag
			}
		}
	}
}

func pollEvents(
	ctx context.Context,
	client *http.Client,
	token string,
	lastETag string,
	repoStore *TrackedReposStore,
	ringBuf *RingBuffer,
	db *sqlx.DB,
	reCodeBlock *regexp.Regexp,
) string {
	newETag := lastETag

	// We paginate through pages 1 to 3 to cover the rolling event window
	for page := 1; page <= 3; page++ {
		url := fmt.Sprintf("https://api.github.com/events?per_page=100&page=%d", page)
		req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
		if err != nil {
			slog.Error("Failed to create HTTP request", "err", err)
			return newETag
		}

		if token != "" {
			req.Header.Set("Authorization", "token "+token)
		}
		req.Header.Set("Accept", "application/vnd.github.v3+json")
		req.Header.Set("User-Agent", "Opendoor-EventStream/1.0")

		if page == 1 && lastETag != "" {
			req.Header.Set("If-None-Match", lastETag)
		}

		resp, err := client.Do(req)
		if err != nil {
			slog.Warn("Poll request failed", "url", url, "err", err)
			return newETag
		}

		if resp.StatusCode == http.StatusNotModified {
			resp.Body.Close()
			return newETag // No new events at all
		}

		if resp.StatusCode == http.StatusTooManyRequests || resp.StatusCode == http.StatusForbidden {
			resp.Body.Close()
			resetHeader := resp.Header.Get("X-RateLimit-Reset")
			var sleepDur = 30 * time.Second
			if resetHeader != "" {
				if resetUnix, err := strconv.ParseInt(resetHeader, 10, 64); err == nil {
					if wait := time.Until(time.Unix(resetUnix, 0)); wait > 0 {
						sleepDur = wait + 5*time.Second
					}
				}
			}
			slog.Warn("Rate limited, sleeping", "status", resp.StatusCode, "sleep", sleepDur)
			time.Sleep(sleepDur)
			return newETag
		}

		if resp.StatusCode != http.StatusOK {
			resp.Body.Close()
			slog.Warn("Unexpected status code", "url", url, "status", resp.StatusCode)
			return newETag
		}

		if page == 1 {
			if etag := resp.Header.Get("ETag"); etag != "" {
				newETag = etag
			}
		}

		body, err := io.ReadAll(resp.Body)
		resp.Body.Close()
		if err != nil {
			slog.Warn("Failed to read body", "err", err)
			return newETag
		}

		var items []EventStreamItem
		if err := json.Unmarshal(body, &items); err != nil {
			// Fallback: try line-by-line scanning if array unmarshal fails
			scanner := bufio.NewScanner(bytes.NewReader(body))
			for scanner.Scan() {
				var item EventStreamItem
				if err := json.Unmarshal(scanner.Bytes(), &item); err == nil {
					items = append(items, item)
				}
			}
		}

		if len(items) == 0 {
			break
		}

		newEventsInPage := 0
		for _, ev := range items {
			if ev.ID == "" {
				continue
			}

			// Add to ring buffer. If false, we've already processed this event ID.
			if !ringBuf.Add(ev.ID) {
				continue
			}

			newEventsInPage++

			repoID, tracked := repoStore.Get(ev.Repo.Name)
			if !tracked {
				continue
			}

			processEvent(db, repoID, ev, reCodeBlock)
		}

		// If all events on this page were already seen, no need to fetch subsequent pages
		if newEventsInPage == 0 {
			break
		}
	}

	return newETag
}

func processEvent(db *sqlx.DB, repoID string, ev EventStreamItem, reCodeBlock *regexp.Regexp) {
	switch ev.Type {
	case "PullRequestEvent":
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
		_, _ = db.Exec(`
			INSERT IGNORE INTO repo_pr_events (repository_id, pr_number, actor_login, action, event_at)
			VALUES (?, ?, ?, ?, ?)
		`, repoID, payload.Number, ev.Actor.Login, payload.Action, toMySQL(ev.CreatedAt))

	case "IssueCommentEvent":
		var payload IssueCommentPayload
		if err := json.Unmarshal(ev.Payload, &payload); err != nil || payload.Action != "created" {
			return
		}
		insertRawComment(db, repoID, payload.Comment.User.Login, payload.Comment.Body, payload.Comment.CreatedAt, reCodeBlock)

	case "PullRequestReviewCommentEvent":
		var payload PRReviewCommentPayload
		if err := json.Unmarshal(ev.Payload, &payload); err != nil || payload.Action != "created" {
			return
		}
		insertRawComment(db, repoID, payload.Comment.User.Login, payload.Comment.Body, payload.Comment.CreatedAt, reCodeBlock)
	}
}

func insertRawComment(db *sqlx.DB, repoID, authorLogin, body, createdAt string, reCodeBlock *regexp.Regexp) {
	if authorLogin == "" || strings.Contains(strings.ToLower(authorLogin), "bot") {
		return
	}
	cleanText := reCodeBlock.ReplaceAllString(body, "")
	cleanText = strings.TrimSpace(cleanText)
	if cleanText == "" {
		return
	}
	if len(cleanText) > 2000 {
		cleanText = cleanText[:2000]
	}
	_, _ = db.Exec(`
		INSERT IGNORE INTO repo_raw_comments (repository_id, author_login, comment_text, created_at)
		VALUES (?, ?, ?, ?)
	`, repoID, authorLogin, cleanText, toMySQL(createdAt))
}
