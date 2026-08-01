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
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		_ = c.telegram.SendTextMessage(ctx, "🚀 *Opendoor Background Crawler Worker Started*\n\nContinuous priority-queue engine is active and scanning repositories.")
		cancel()
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

	for {
		select {
		case <-c.stopChan:
			slog.Info("background crawler: worker loop terminated")
			return
		case <-ticker.C:
			c.processNextWorkItem()
			c.checkAndSendPulseDigest()
		}
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

	// Priority 1: User-requested indexing queue (from indexing_queue table)
	processedQueue, err := c.processIndexingQueueItem()
	if err != nil {
		slog.Error("background crawler: error processing indexing_queue", "err", err)
	}
	if processedQueue {
		return
	}

	// Priority 2: Adaptive Rescan (repos due for rescan according to next_rescan_at)
	processedRescan, err := c.processAdaptiveRescanItem()
	if err != nil {
		slog.Error("background crawler: error processing adaptive rescan", "err", err)
	}
	if processedRescan {
		return
	}

	// Priority 3: Novel Repo Discovery (slide date windows & star buckets for unindexed repos)
	if err := c.processDiscoveryBatch(); err != nil {
		slog.Error("background crawler: error processing discovery batch", "err", err)
	}
}

func (c *BackgroundCrawler) processIndexingQueueItem() (bool, error) {
	var item queueItem
	err := c.db.Get(&item, `
		SELECT id, full_name, owner, name, requested_by_user_id
		FROM indexing_queue
		WHERE status = 'pending'
		ORDER BY created_at ASC
		LIMIT 1
	`)
	if err != nil {
		return false, nil // No pending user items
	}

	slog.Info("background crawler [P1 User Queue]: processing", "repo", item.FullName)
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
	slog.Info("background crawler [P1 User Queue]: completed", "repo", item.FullName)

	if item.RequestedByUserID != nil && *item.RequestedByUserID > 0 {
		payload := fmt.Sprintf(`{"repo_full_name":"%s","message":"Your requested repository %s has been scored!"}`, item.FullName, item.FullName)
		_, _ = c.db.Exec(`
			INSERT INTO notification_queue (user_id, type, payload, status, created_at)
			VALUES (?, 'repo_indexed', ?, 'pending', ?)
		`, *item.RequestedByUserID, payload, time.Now().UTC())
	}

	return true, nil
}

func (c *BackgroundCrawler) processAdaptiveRescanItem() (bool, error) {
	var r repoRow
	err := c.db.Get(&r, `
		SELECT id, full_name, owner, name, updated_at, consecutive_stagnant_scans
		FROM repositories
		WHERE next_rescan_at <= CURRENT_TIMESTAMP OR updated_at < ?
		ORDER BY next_rescan_at ASC, updated_at ASC
		LIMIT 1
	`, time.Now().UTC().Add(-24*time.Hour))
	if err != nil {
		return false, nil // No repos due for rescan
	}

	slog.Info("background crawler [P2 Adaptive Rescan]: processing", "repo", r.FullName)

	existingMetrics, err := fetchDBMetrics(c.db)
	if err != nil {
		slog.Warn("background crawler: fetchDBMetrics failed", "err", err)
	}

	_, err = scoreAndSaveRepo(c.db, c.gh, r.ID, r.Owner, r.Name, r.FullName, existingMetrics)
	if err != nil {
		slog.Error("background crawler [P2 Adaptive Rescan]: failed — touching repo to defer retry", "repo", r.FullName, "err", err)
		// Defer retry by 1 hour on error
		_, _ = c.db.Exec("UPDATE repositories SET next_rescan_at = ? WHERE id = ?", time.Now().UTC().Add(1*time.Hour), r.ID)
		return true, err
	}

	slog.Info("background crawler [P2 Adaptive Rescan]: completed", "repo", r.FullName)
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

	// Send Telegram pulse every 3 hours
	if time.Since(c.lastPulse) < 3*time.Hour && !c.lastPulse.IsZero() {
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

