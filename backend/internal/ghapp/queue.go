package ghapp

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"strings"
	"time"
)

const (
	queueBufferSize = 256
	maxPostAttempts = 3 // AC4: after 3 failed retries the job is dropped + logged
	backoffBase     = 2 * time.Second
)

// commentJob is one pending welcome-comment unit of work.
type commentJob struct {
	installationID int64
	repoID         int64
	owner          string
	name           string
	number         int
	author         string
	isPrivate      bool
}

// enqueue hands the job to the per-installation serial queue (AC4), starting
// a dedicated worker goroutine on first use for that installation.
func (s *Service) enqueue(j *commentJob) {
	s.mu.Lock()
	if s.stopped {
		s.mu.Unlock()
		return
	}
	ch, ok := s.queues[j.installationID]
	if !ok {
		ch = make(chan *commentJob, queueBufferSize)
		s.queues[j.installationID] = ch
		s.wg.Add(1)
		go s.worker(ch)
	}
	select {
	case ch <- j:
	default:
		slog.Warn("ghapp welcome queue full; job dropped", "installation_id", j.installationID, "repo_id", j.repoID, "number", j.number)
	}
	s.mu.Unlock()
}

// Stop closes all per-installation queues and waits for in-flight jobs.
func (s *Service) Stop() {
	s.mu.Lock()
	if s.stopped {
		s.mu.Unlock()
		return
	}
	s.stopped = true
	for id, ch := range s.queues {
		close(ch)
		delete(s.queues, id)
	}
	s.mu.Unlock()
	s.wg.Wait()
}

func (s *Service) worker(ch chan *commentJob) {
	defer s.wg.Done()
	for j := range ch {
		s.process(context.Background(), j)
	}
}

// process runs the full pipeline for one event: per-install daily budget
// gate (AC4), idempotency claim keyed UNIQUE(repo_id, issue_number)
// (AC2: pending|posted|failed with retry-on-redelivery), comment build (AC6)
// and backoff-aware posting (AC4).
func (s *Service) process(ctx context.Context, j *commentJob) {
	defer func() {
		if r := recover(); r != nil {
			slog.Error("ghapp welcome panic recovered", "repo_id", j.repoID, "number", j.number, "panic", r)
		}
	}()
	ctx, cancel := context.WithTimeout(ctx, 10*time.Minute)
	defer cancel()

	if !s.spendBudget(j.installationID) {
		s.recordBudgetSkip(j.installationID)
		slog.Info("ghapp welcome skipped: daily comment budget exhausted", "installation_id", j.installationID, "author", j.author)
		return // AC4: over-budget events are skipped and counted
	}
	if !s.claimWelcome(j) {
		return // AC2: redelivery of an already-posted comment is a no-op
	}

	body := s.buildComment(ctx, j)
	commentID, err := s.postComment(ctx, j, body)
	s.finishClaim(j, commentID, err)
	if err == nil {
		s.recordPosted(j.installationID)
	}
}

// spendBudget reports whether the install is under its daily comment budget
// (AC4, default 50/day). The per-install serialized worker makes the
// read-decide-increment sequence race-free.
func (s *Service) spendBudget(installationID int64) bool {
	day := time.Now().UTC().Format("2006-01-02")
	upsert := `
		INSERT INTO ghapp_budget_usage (installation_id, usage_date, posted_count, skipped_count)
		VALUES (?, ?, 0, 0)
		ON DUPLICATE KEY UPDATE posted_count = posted_count
	`
	if s.db.DriverName() == "sqlite" {
		upsert = `
			INSERT INTO ghapp_budget_usage (installation_id, usage_date, posted_count, skipped_count)
			VALUES (?, ?, 0, 0)
			ON CONFLICT(installation_id, usage_date) DO NOTHING
		`
	}
	if _, err := s.db.Exec(upsert, installationID, day); err != nil {
		slog.Warn("ghapp budget row ensure failed; allowing post", "installation_id", installationID, "err", err)
		return true
	}
	var posted int
	if err := s.db.Get(&posted, `SELECT posted_count FROM ghapp_budget_usage WHERE installation_id = ? AND usage_date = ?`, installationID, day); err != nil {
		slog.Warn("ghapp budget lookup failed; allowing post", "installation_id", installationID, "err", err)
		return true
	}
	budget := s.cfg.GithubAppDailyCommentBudget
	if budget <= 0 {
		budget = 50
	}
	return posted < budget
}

func (s *Service) bumpBudget(installationID int64, column string) {
	day := time.Now().UTC().Format("2006-01-02")
	upsert := fmt.Sprintf(`
		INSERT INTO ghapp_budget_usage (installation_id, usage_date, %s) VALUES (?, ?, 1)
		ON DUPLICATE KEY UPDATE %s = %s + 1
	`, column, column, column)
	if s.db.DriverName() == "sqlite" {
		upsert = fmt.Sprintf(`
			INSERT INTO ghapp_budget_usage (installation_id, usage_date, %s) VALUES (?, ?, 1)
			ON CONFLICT(installation_id, usage_date) DO UPDATE SET %s = %s + 1
		`, column, column, column)
	}
	if _, err := s.db.Exec(upsert, installationID, day); err != nil {
		slog.Warn("ghapp budget counter update failed", "installation_id", installationID, "column", column, "err", err)
	}
}

func (s *Service) recordPosted(installationID int64) { s.bumpBudget(installationID, "posted_count") }
func (s *Service) recordBudgetSkip(installationID int64) {
	s.bumpBudget(installationID, "skipped_count")
}

// claimWelcome enforces exactly-once posting (AC2): an idempotency row keyed
// UNIQUE(repo_id, issue_number) with status pending|posted|failed. Flow:
// upsert-if-absent -> POST -> set posted. On redelivery a 'posted' row
// skips; 'pending' (crash between upsert and POST) and 'failed' rows retry.
func (s *Service) claimWelcome(j *commentJob) bool {
	_, err := s.db.Exec(`
		INSERT INTO ghapp_welcomes (installation_id, repo_id, contributor_login, pr_number, status, created_at, updated_at)
		VALUES (?, ?, ?, ?, 'pending', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
	`, j.installationID, j.repoID, j.author, j.number)
	if err == nil {
		return true
	}
	if !isDuplicateInsert(err) {
		slog.Error("ghapp welcome idempotency insert failed", "repo_id", j.repoID, "number", j.number, "err", err)
		return false
	}
	// Row exists: posted (or remotely deleted) means already handled; any
	// other status is retryable per AC2.
	var status string
	if err := s.db.Get(&status, `SELECT status FROM ghapp_welcomes WHERE repo_id = ? AND pr_number = ?`, j.repoID, j.number); err != nil {
		return false
	}
	switch strings.ToLower(strings.TrimSpace(status)) {
	case "posted", "deleted_remotely":
		slog.Info("ghapp welcome redelivery skipped (already posted)", "repo_id", j.repoID, "number", j.number)
		return false
	default: // pending | failed -> retry
		return true
	}
}

func (s *Service) finishClaim(j *commentJob, commentID int64, postErr error) {
	if postErr == nil {
		_, _ = s.db.Exec(`
			UPDATE ghapp_welcomes SET status = 'posted', comment_id = ?, updated_at = CURRENT_TIMESTAMP
			WHERE repo_id = ? AND pr_number = ?
		`, commentID, j.repoID, j.number)
		return
	}
	// AC4: persistent failure dead-letters the row and emits a log alert;
	// never silently dropped.
	_, _ = s.db.Exec(`
		UPDATE ghapp_welcomes SET status = 'failed', updated_at = CURRENT_TIMESTAMP
		WHERE repo_id = ? AND pr_number = ?
	`, j.repoID, j.number)
	slog.Error("ghapp WELCOME_DEAD_LETTER: welcome comment failed after retries; row marked failed for redelivery retry", "repo_id", j.repoID, "number", j.number, "author", j.author, "err", postErr)
}

// postComment creates the issue/PR comment honoring Retry-After and applying
// exponential backoff; permanent rejections drop immediately.
func (s *Service) postComment(ctx context.Context, j *commentJob, body string) (int64, error) {
	payload, _ := json.Marshal(map[string]string{"body": body})
	apiURL := fmt.Sprintf("%s/repos/%s/%s/issues/%d/comments", apiBase, j.owner, j.name, j.number)

	var lastErr error
	rateLimitRetried := false
	for attempt := 1; attempt <= maxPostAttempts; attempt++ {
		token, err := s.installationToken(ctx, j.installationID)
		if err != nil {
			lastErr = err
			sleepBackoff(ctx, attempt)
			continue
		}

		status, respBody, hdr, err := s.http.do(ctx, http.MethodPost, apiURL, token, payload)
		if err != nil {
			lastErr = err
			sleepBackoff(ctx, attempt)
			continue
		}
		if status >= 200 && status < 300 {
			var out struct {
				ID int64 `json:"id"`
			}
			_ = json.Unmarshal(respBody, &out)
			return out.ID, nil
		}

		lastErr = fmt.Errorf("github comment post failed (status %d)", status)
		switch {
		case status == http.StatusForbidden || status == http.StatusTooManyRequests:
			// AC4: on a secondary rate limit with Retry-After, wait and retry
			// exactly once; a second hit (or no header) drops the job.
			if wait := retryAfter(hdr.Get("Retry-After")); wait > 0 && !rateLimitRetried {
				rateLimitRetried = true
				select {
				case <-time.After(wait):
					continue
				case <-ctx.Done():
					return 0, ctx.Err()
				}
			}
			return 0, lastErr
		case status == http.StatusNotFound || status == http.StatusGone || status == http.StatusUnprocessableEntity:
			return 0, lastErr // permanent rejection: no retry value
		default: // 5xx and anything else: exponential backoff retry
			sleepBackoff(ctx, attempt)
		}
	}
	return 0, lastErr
}

func sleepBackoff(ctx context.Context, attempt int) {
	wait := backoffBase << (attempt - 1)
	if wait > 30*time.Second {
		wait = 30 * time.Second
	}
	select {
	case <-time.After(wait):
	case <-ctx.Done():
	}
}

func retryAfter(v string) time.Duration {
	var secs int
	if _, err := fmt.Sscanf(strings.TrimSpace(v), "%d", &secs); err != nil || secs < 0 {
		return 0
	}
	wait := time.Duration(secs) * time.Second
	if wait > rateLimitCap {
		wait = rateLimitCap
	}
	return wait
}

// isDuplicateInsert mirrors the repo_claims duplicate detection: MySQL 1062
// ("Duplicate entry") or SQLite ("UNIQUE constraint failed").
func isDuplicateInsert(err error) bool {
	if err == nil {
		return false
	}
	msg := err.Error()
	return strings.Contains(msg, "Duplicate entry") ||
		strings.Contains(msg, "duplicate key") ||
		strings.Contains(msg, "UNIQUE constraint failed")
}

// buildComment constructs the first-contributor welcome markdown comment (AC1, AC6).
// For public repos: includes C-Rank tier, top items from the existing AI PR-guidelines checklist,
// and a UTM-tagged GetMerged repo link.
// For private repos: generic welcome without C-Rank tier or public link (AC6).
func (s *Service) buildComment(ctx context.Context, j *commentJob) string {
	if j.isPrivate {
		return fmt.Sprintf("👋 Welcome @%s! Thank you for contributing to %s/%s.", j.author, j.owner, j.name)
	}

	fullName := j.owner + "/" + j.name
	var tier string
	var repoID string
	if s.repoStore != nil {
		repo, err := s.repoStore.FindByIDOrName(ctx, fullName)
		if err == nil && repo != nil {
			tier = repo.CRankTier
			repoID = repo.ID
		}
	}
	if repoID == "" {
		repoID = fullName
	}
	if tier == "" {
		tier = "Unranked"
	}

	var guidelines []string
	if s.aiRepo != nil {
		insights, err := s.aiRepo.GetInsights(ctx, repoID)
		if err == nil && insights != nil && insights.PRGuidelines != "" {
			_ = json.Unmarshal([]byte(insights.PRGuidelines), &guidelines)
		}
	}

	// Default / fallback checklist items if insights are not yet generated
	if len(guidelines) == 0 {
		guidelines = []string{
			"Ensure your PR title clearly describes the change",
			"Reference any related issues in the description",
			"Verify all unit tests pass locally before requesting review",
			"Keep PR diffs focused on a single topic or fix",
			"Be responsive to reviewer suggestions and questions",
		}
	}

	// Cap at top-3 items (AC1)
	if len(guidelines) > 3 {
		guidelines = guidelines[:3]
	}

	baseURL := s.cfg.AppBaseURL
	if baseURL == "" {
		baseURL = "https://getmerged.abhishekco.de"
	}
	utmLink := fmt.Sprintf("%s/repo/%s?utm_source=github_app&utm_medium=welcome_comment&utm_campaign=first_contributor", baseURL, fullName)

	var sb strings.Builder
	sb.WriteString("<!-- getmerged-welcome v1 -->\n")
	sb.WriteString(fmt.Sprintf("👋 Welcome @%s! Thank you for your first contribution to **%s**.\n\n", j.author, fullName))
	sb.WriteString(fmt.Sprintf("📊 **C-Rank Tier**: `%s` — view contributor health metrics on [GetMerged](%s).\n\n", tier, utmLink))
	sb.WriteString("### 📋 PR Guidelines Checklist\n")
	for _, g := range guidelines {
		sb.WriteString(fmt.Sprintf("- [ ] %s\n", g))
	}
	sb.WriteString(fmt.Sprintf("\n---\n*Powered by [GetMerged](%s) — Open Source Contributor Experience*", utmLink))

	return sb.String()
}
