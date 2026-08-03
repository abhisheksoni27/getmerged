package pipeline

import (
	"context"
	"fmt"
	"log/slog"
	"sync/atomic"
	"time"

	"github.com/abhisheksoni27/opendoor/internal/analytics"
	ghclient "github.com/abhisheksoni27/opendoor/internal/github"
	"github.com/abhisheksoni27/opendoor/internal/notification"
	"github.com/jmoiron/sqlx"
)

// BackgroundCrawler manages rate-budget-aware continuous repository scoring.
type BackgroundCrawler struct {
	db        *sqlx.DB
	gh        *ghclient.Client
	telegram  *notification.TelegramNotifier
	running   atomic.Bool
	stopChan  chan struct{}
	lastLang  int
	lastBucket int
	lastPulse  time.Time
}

// NewBackgroundCrawler initializes a BackgroundCrawler instance.
func NewBackgroundCrawler(db *sqlx.DB, gh *ghclient.Client, telegram *notification.TelegramNotifier) *BackgroundCrawler {
	return &BackgroundCrawler{
		db:       db,
		gh:       gh,
		telegram: telegram,
		stopChan: make(chan struct{}),
	}
}

// Start launches the continuous crawler loop in a background goroutine.
func (c *BackgroundCrawler) Start() {
	if !c.running.CompareAndSwap(false, true) {
		slog.Warn("background crawler: already running")
		return
	}

	slog.Info("background crawler: starting continuous queue engine")
	if c.telegram.IsConfigured() {
		go func() {
			ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
			defer cancel()
			err := c.telegram.SendTextMessage(ctx, "🚀 *Opendoor Background Crawler Worker Started*\n\nContinuous priority-queue engine is active and scanning repositories.")
			if err != nil {
				slog.Error("background crawler: startup telegram send failed", "err", err)
			} else {
				slog.Info("background crawler: startup telegram notification sent successfully")
			}
		}()
	}
	go c.runLoop()
}

// Stop signals the background crawler to exit gracefully.
func (c *BackgroundCrawler) Stop() {
	if c.running.CompareAndSwap(true, false) {
		slog.Info("background crawler: stopping engine")
		close(c.stopChan)
	}
}

func (c *BackgroundCrawler) runLoop() {
	ticker := time.NewTicker(3 * time.Second)
	defer ticker.Stop()

	// Run scheduler every 10 minutes to populate queue
	scheduleTicker := time.NewTicker(10 * time.Minute)
	defer scheduleTicker.Stop()

	// Initial seed of due repos on startup
	c.EnqueueDueRepos()

	for {
		select {
		case <-c.stopChan:
			slog.Info("background crawler: worker loop terminated")
			return
		case <-scheduleTicker.C:
			c.EnqueueDueRepos()
		case <-ticker.C:
			c.processNextWorkItem()
			c.checkAndSendPulseDigest()
		}
	}
}

// EnqueueDueRepos acts as a decoupled producer: checks repositories due for rescanning based on adaptive schedules
// and enqueues them into indexing_queue with priority.
func (c *BackgroundCrawler) EnqueueDueRepos() {
	slog.Info("background crawler producer: checking due repos to enqueue")
	rows, err := c.db.Query(`
		SELECT r.full_name, r.owner, r.name,
		       COALESCE(ls.c_rank_tier, 'D') AS tier
		FROM repositories r
		LEFT JOIN latest_snapshots ls ON r.id = ls.repository_id
		WHERE r.updated_at < ?
		ORDER BY r.updated_at ASC
		LIMIT 100
	`, time.Now().UTC().Add(-24*time.Hour))
	if err != nil {
		slog.Error("background crawler producer: query due repos failed", "err", err)
		return
	}
	defer rows.Close()

	enqueuedCount := 0
	for rows.Next() {
		var fullName, owner, name, tier string
		if err := rows.Scan(&fullName, &owner, &name, &tier); err != nil {
			continue
		}

		// Set priority based on tier: User requests = 1, S/A tier = 2, B/C tier = 3, D tier = 4
		priority := 3
		switch tier {
		case "S", "A":
			priority = 2
		case "D":
			priority = 4
		}

		_, err := c.db.Exec(`
			INSERT INTO indexing_queue (full_name, owner, name, priority, status, created_at)
			VALUES (?, ?, ?, ?, 'pending', CURRENT_TIMESTAMP)
			ON CONFLICT(full_name) DO UPDATE SET
				priority = MIN(indexing_queue.priority, excluded.priority)
				WHERE status = 'pending'
		`, fullName, owner, name, priority)
		if err == nil {
			enqueuedCount++
		}
	}
	if enqueuedCount > 0 {
		slog.Info("background crawler producer: enqueued due repos", "count", enqueuedCount)
	}
}

func (c *BackgroundCrawler) processNextWorkItem() {
	// Guard: check rate limit remaining
	_, rl, err := c.gh.CheckToken()
	if err != nil {
		slog.Warn("background crawler: failed token check — backing off", "err", err)
		time.Sleep(30 * time.Second)
		return
	}

	if rl.Remaining < 100 && rl.Remaining > 0 {
		resetTime, parseErr := time.Parse(time.RFC3339, rl.ResetAt)
		if parseErr == nil && time.Now().UTC().Before(resetTime) {
			sleepDur := time.Until(resetTime) + 5*time.Second
			slog.Warn("background crawler: rate limit budget low — sleeping until reset",
				"remaining", rl.Remaining,
				"reset_at", rl.ResetAt,
				"sleep_duration", sleepDur.String(),
			)
			time.Sleep(sleepDur)
			return
		}
	}

	// Process queue items by priority (P1 User Queue -> P2 S/A Rescan -> P3 B/C Rescan -> P4 D Rescan)
	processedQueue, err := c.processIndexingQueueItem()
	if err != nil {
		slog.Error("background crawler: error processing indexing_queue", "err", err)
	}
	if processedQueue {
		return
	}

	// Priority 4: Novel Repo Discovery (slide date windows & star buckets when queue is empty)
	if err := c.processDiscoveryBatch(); err != nil {
		slog.Error("background crawler: error processing discovery batch", "err", err)
	}
}

type queueItemExt struct {
	ID                int64  `db:"id"`
	FullName          string `db:"full_name"`
	Owner             string `db:"owner"`
	Name              string `db:"name"`
	RequestedByUserID *int64 `db:"requested_by_user_id"`
	Priority          int    `db:"priority"`
}

func (c *BackgroundCrawler) processIndexingQueueItem() (bool, error) {
	var item queueItemExt
	err := c.db.Get(&item, `
		SELECT id, full_name, owner, name, requested_by_user_id, priority
		FROM indexing_queue
		WHERE status = 'pending'
		ORDER BY priority ASC, created_at ASC
		LIMIT 1
	`)
	if err != nil {
		return false, nil // No pending items
	}

	slog.Info("background crawler [Queue Worker]: processing", "repo", item.FullName, "priority", item.Priority)
	_, _ = c.db.Exec("UPDATE indexing_queue SET status = 'processing' WHERE id = ?", item.ID)

	repoID, err := upsertRepoRow(c.db, item.Owner, item.Name, item.FullName)
	if err != nil {
		_, _ = c.db.Exec("UPDATE indexing_queue SET status = 'failed' WHERE id = ?", item.ID)
		return true, err
	}

	existingMetrics, _ := fetchDBMetrics(c.db)
	_, scoreErr := scoreAndSaveRepo(c.db, c.gh, repoID, item.Owner, item.Name, item.FullName, existingMetrics)
	if scoreErr != nil {
		_, _ = c.db.Exec("UPDATE indexing_queue SET status = 'failed' WHERE id = ?", item.ID)
		return true, scoreErr
	}

	_, _ = c.db.Exec("UPDATE indexing_queue SET status = 'completed', processed_at = ? WHERE id = ?", time.Now().UTC(), item.ID)
	slog.Info("background crawler [Queue Worker]: completed", "repo", item.FullName, "priority", item.Priority)

	if item.RequestedByUserID != nil && *item.RequestedByUserID > 0 {
		payload := fmt.Sprintf(`{"repo_full_name":"%s","message":"Your requested repository %s has been scored!"}`, item.FullName, item.FullName)
		_, _ = c.db.Exec(`
			INSERT INTO notification_queue (user_id, type, payload, status, created_at)
			VALUES (?, 'repo_indexed', ?, 'pending', ?)
		`, *item.RequestedByUserID, payload, time.Now().UTC())
	}

	return true, nil
}

func (c *BackgroundCrawler) processDiscoveryBatch() error {
	lang := SeedLanguages[c.lastLang%len(SeedLanguages)]
	bucket := DiscoveryStarBuckets[c.lastBucket%len(DiscoveryStarBuckets)]
	c.lastBucket++
	if c.lastBucket%len(DiscoveryStarBuckets) == 0 {
		c.lastLang++
	}

	slog.Info("background crawler [P3 Discovery]: sweeping", "language", lang, "stars", fmt.Sprintf("%d..%d", bucket.MinStars, bucket.MaxStars))

	newRepos, err := DiscoverNewRepos(c.db, c.gh, lang, bucket, 14, 20)
	if err != nil || len(newRepos) == 0 {
		return err
	}

	slog.Info("background crawler [P3 Discovery]: indexing newly discovered repos", "count", len(newRepos))

	existingMetrics, _ := fetchDBMetrics(c.db)
	for _, r := range newRepos {
		repoID, err := upsertRepo(c.db, r)
		if err != nil {
			continue
		}
		updatedMetrics, err := scoreAndSaveRepo(c.db, c.gh, repoID, r.Owner, r.Name, r.FullName, existingMetrics)
		if err == nil {
			existingMetrics = updatedMetrics
		}
	}

	// Update macro stats after discovery run
	ctx := context.Background()
	_, _ = analytics.ComputeAndCacheMacroStats(ctx, c.db)

	return nil
}

func (c *BackgroundCrawler) checkAndSendPulseDigest() {
	if !c.telegram.IsConfigured() {
		return
	}

	// Send Telegram pulse every 30 minutes
	if time.Since(c.lastPulse) < 30*time.Minute && !c.lastPulse.IsZero() {
		return
	}
	c.lastPulse = time.Now().UTC()

	var totalScored int
	_ = c.db.Get(&totalScored, "SELECT COUNT(1) FROM repositories")

	var sTierCount int
	_ = c.db.Get(&sTierCount, `
		SELECT COUNT(DISTINCT repository_id) FROM daily_snapshots WHERE c_rank_tier = 'S'
	`)

	var pendingUserQueue int
	_ = c.db.Get(&pendingUserQueue, "SELECT COUNT(1) FROM indexing_queue WHERE status = 'pending'")

	_, rl, _ := c.gh.CheckToken()

	msg := fmt.Sprintf(
		"📊 *Opendoor Crawler Pulse Digest*\n\n"+
			"• *Total Repos Scored:* %d\n"+
			"• *S-Tier Super Welcoming:* %d\n"+
			"• *User Queue Pending:* %d\n"+
			"• *GitHub API Budget:* %d / 5,000 remaining\n\n"+
			"🤖 Background crawler engine is active 24/7.",
		totalScored, sTierCount, pendingUserQueue, rl.Remaining,
	)

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := c.telegram.SendTextMessage(ctx, msg); err != nil {
		slog.Error("background crawler: failed to send telegram pulse digest", "err", err)
	}
}

