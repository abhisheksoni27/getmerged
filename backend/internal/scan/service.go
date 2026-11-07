package scan

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"strings"
	"time"

	ghclient "github.com/abhisheksoni27/opendoor/internal/github"
	"github.com/abhisheksoni27/opendoor/internal/repository"
	"github.com/abhisheksoni27/opendoor/internal/scoring"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/valkey-io/valkey-go"
	"golang.org/x/time/rate"
)

// Lifecycle states returned to the client.
const (
	StateReady   = "ready"
	StateScoring = "scoring"
	StateQueued  = "queued"
	StateError   = "error"
	StateUnknown = "unknown"
)

const (
	// VerdictTTL is the cached-verdict lifetime (AC5); a verified push webhook
	// invalidates it earlier.
	VerdictTTL = 24 * time.Hour
	// lockTTL bounds a crashed worker: another instance can retry after it.
	lockTTL = 3 * time.Minute
	// stateTTL keeps progress readable for the whole polling window (AC6).
	stateTTL = 10 * time.Minute
	// hardTimeout is the worker's own ceiling; the UI shows retry after it.
	hardTimeout = 150 * time.Second
	// quotaFloor is the GraphQL point budget below which we queue instead of
	// burning the remaining quota on interactive scans (AC4).
	quotaFloor = 60
)

// Verdict is the cached C-Rank result served to the verdict page + OG card.
type Verdict struct {
	FullName    string    `json:"full_name"`
	Owner       string    `json:"owner"`
	Name        string    `json:"name"`
	RepoID      string    `json:"repo_id"`
	Score       float64   `json:"score"`
	Tier        string    `json:"tier"`
	Language    string    `json:"language,omitempty"`
	Stars       int       `json:"stars"`
	PRsAnalyzed int       `json:"prs_analyzed"`
	Stale       bool      `json:"stale"`
	Headline    string    `json:"headline"`
	OGImageURL  string    `json:"og_image_url"`
	ShareURL    string    `json:"share_url"`
	VerdictURL  string    `json:"verdict_url"`
	ScoredAt    time.Time `json:"scored_at"`
}

// Status is the poll payload (AC6).
type Status struct {
	State    string   `json:"state"`
	Progress int      `json:"progress"`
	Message  string   `json:"message"`
	FullName string   `json:"full_name"`
	Verdict  *Verdict `json:"verdict,omitempty"`
}

// Service owns the on-demand scoring pipeline.
type Service struct {
	vk        valkey.Client
	gh        *ghclient.Client
	repoStore repository.RepoRepository
	db        *sqlx.DB
	baseURL   string
	limiter   *rate.Limiter
	http      *http.Client
}

// NewService wires the on-demand scanner. A nil valkey client degrades to
// DB-backed verdict lookups (no cross-instance dedup available).
func NewService(vk valkey.Client, gh *ghclient.Client, repoStore repository.RepoRepository, db *sqlx.DB, baseURL string) *Service {
	return &Service{
		vk:        vk,
		gh:        gh,
		repoStore: repoStore,
		db:        db,
		baseURL:   strings.TrimRight(baseURL, "/"),
		// Token bucket: ~1 interactive scan every 2s, burst 5 (AC4).
		limiter: rate.NewLimiter(rate.Every(2*time.Second), 5),
		http:    safeHTTPClient(10 * time.Second),
	}
}

func fullName(owner, name string) string { return owner + "/" + name }
func key(prefix, owner, name string) string {
	return prefix + strings.ToLower(fullName(owner, name))
}

// Start resolves a pasted repo into a verdict: cached, in-flight, queued or a
// freshly launched scoring job (AC2, AC3, AC4).
func (s *Service) Start(ctx context.Context, owner, name string, force bool) (*Status, error) {
	fn := fullName(owner, name)

	if !force {
		if v := s.lookupVerdict(ctx, owner, name); v != nil {
			return &Status{State: StateReady, Progress: 100, FullName: fn, Verdict: v}, nil
		}
	}

	// Cross-instance in-flight check before anything expensive (AC3).
	if st := s.readState(ctx, owner, name); st != nil && (st.State == StateScoring || st.State == StateQueued) {
		return st, nil
	}

	if err := resolveAllowedHost(ctx, "api.github.com"); err != nil {
		return nil, ErrInvalidInput
	}

	exists, err := s.repoIsPublic(ctx, owner, name)
	if err != nil {
		return nil, err
	}
	if !exists {
		return nil, fmt.Errorf("%s is not a public GitHub repository", fn)
	}

	// AC4: no interactive budget (token bucket empty) or GraphQL quota nearly
	// exhausted -> queue the job and report 'queued' instead of failing.
	if !s.limiter.Allow() || s.quotaExhausted() {
		s.enqueue(ctx, owner, name)
		st := &Status{State: StateQueued, Progress: 5, FullName: fn,
			Message: "GitHub API quota is saturated - your scan is queued and will finish automatically."}
		s.writeState(ctx, owner, name, st)
		return st, nil
	}

	// AC3: Redis SET NX lock is the single cross-instance guard; losers poll.
	if !s.acquireLock(ctx, owner, name) {
		st := &Status{State: StateScoring, Progress: 20, FullName: fn, Message: "Scoring already in progress…"}
		return st, nil
	}

	st := &Status{State: StateScoring, Progress: 10, FullName: fn, Message: "Fetching pull-request history from GitHub…"}
	s.writeState(ctx, owner, name, st)
	go s.run(owner, name)
	return st, nil
}

// Status reports the current lifecycle state for polling clients (AC6).
func (s *Service) Status(ctx context.Context, owner, name string) *Status {
	fn := fullName(owner, name)
	if v := s.lookupVerdict(ctx, owner, name); v != nil {
		return &Status{State: StateReady, Progress: 100, FullName: fn, Verdict: v}
	}
	if st := s.readState(ctx, owner, name); st != nil {
		return st
	}
	return &Status{State: StateUnknown, FullName: fn}
}

// Invalidate drops the cached verdict and re-scores asynchronously; used by the
// signature-verified push webhook (AC5).
func (s *Service) Invalidate(ctx context.Context, owner, name string) {
	if s.vk != nil {
		_ = s.vk.Do(ctx, s.vk.B().Del().Key(key("scan:verdict:", owner, name)).Build())
		_ = s.vk.Do(ctx, s.vk.B().Del().Key(key("scan:state:", owner, name)).Build())
	}
	if !s.acquireLock(context.Background(), owner, name) {
		return
	}
	s.writeState(context.Background(), owner, name, &Status{
		State: StateScoring, Progress: 10, FullName: fullName(owner, name),
		Message: "Re-scoring after new commits…",
	})
	go s.run(owner, name)
}

// --- internals ---

func (s *Service) quotaExhausted() bool {
	if s.gh == nil {
		return true
	}
	rl := s.gh.GetRateLimitInfo()
	if rl.Remaining <= 0 || rl.Remaining >= quotaFloor {
		// Remaining==0 also covers "never called yet" (all-zero info), which
		// must not block the first scan; reset check below disambiguates.
		if rl.Remaining <= 0 && rl.ResetAt != "" {
			if resetAt, err := time.Parse(time.RFC3339, rl.ResetAt); err == nil && time.Now().UTC().Before(resetAt) {
				return true
			}
		}
		return false
	}
	return true
}

func (s *Service) repoIsPublic(ctx context.Context, owner, name string) (bool, error) {
	url := "https://api.github.com/repos/" + owner + "/" + name
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return false, ErrInvalidInput
	}
	req.Header.Set("Accept", "application/vnd.github+json")
	res, err := s.http.Do(req)
	if err != nil {
		slog.Warn("scan: repo existence check failed", "repo", fullName(owner, name), "err", err)
		// Network hiccup must not block scoring of a valid slug.
		return true, nil
	}
	defer res.Body.Close()
	// Only a definite 404 (missing or private) rejects; any other status is
	// treated as "assume valid" so upstream throttling never blocks a scan.
	return res.StatusCode != http.StatusNotFound, nil
}

func (s *Service) acquireLock(ctx context.Context, owner, name string) bool {
	if s.vk == nil {
		return true
	}
	resp := s.vk.Do(ctx, s.vk.B().Set().Key(key("scan:lock:", owner, name)).Value("1").Nx().Ex(lockTTL).Build())
	return resp.Error() == nil
}

func (s *Service) releaseLock(owner, name string) {
	if s.vk == nil {
		return
	}
	_ = s.vk.Do(context.Background(), s.vk.B().Del().Key(key("scan:lock:", owner, name)).Build())
}

func (s *Service) writeState(ctx context.Context, owner, name string, st *Status) {
	if s.vk == nil || st == nil {
		return
	}
	payload, err := json.Marshal(st)
	if err != nil {
		return
	}
	_ = s.vk.Do(ctx, s.vk.B().Set().Key(key("scan:state:", owner, name)).Value(string(payload)).Ex(stateTTL).Build())
}

func (s *Service) readState(ctx context.Context, owner, name string) *Status {
	if s.vk == nil {
		return nil
	}
	raw, err := s.vk.Do(ctx, s.vk.B().Get().Key(key("scan:state:", owner, name)).Build()).ToString()
	if err != nil || raw == "" {
		return nil
	}
	var st Status
	if err := json.Unmarshal([]byte(raw), &st); err != nil {
		return nil
	}
	return &st
}

func (s *Service) cacheVerdict(ctx context.Context, v *Verdict) {
	if s.vk == nil || v == nil {
		return
	}
	payload, err := json.Marshal(v)
	if err != nil {
		return
	}
	_ = s.vk.Do(ctx, s.vk.B().Set().Key(key("scan:verdict:", v.Owner, v.Name)).Value(string(payload)).Ex(VerdictTTL).Build())
}

// lookupVerdict prefers the Valkey cache, then falls back to a fresh-enough DB
// snapshot so evicted caches never force a re-scan (AC2).
func (s *Service) lookupVerdict(ctx context.Context, owner, name string) *Verdict {
	if s.vk != nil {
		if raw, err := s.vk.Do(ctx, s.vk.B().Get().Key(key("scan:verdict:", owner, name)).Build()).ToString(); err == nil && raw != "" {
			var v Verdict
			if err := json.Unmarshal([]byte(raw), &v); err == nil && v.Tier != "" {
				return &v
			}
		}
	}
	if s.repoStore == nil {
		return nil
	}
	rec, err := s.repoStore.FindByIDOrName(ctx, fullName(owner, name))
	if err != nil || rec == nil || rec.CRankTier == "" || !rec.IsScored {
		return nil
	}
	v := s.buildVerdict(owner, name, rec.ID, rec.CRankScore, rec.CRankTier, rec.Language, rec.Stars, rec.PrCount6m, rec.StalenessFlag, rec.UpdatedAt)
	return v
}

func (s *Service) buildVerdict(owner, name, repoID string, score float64, tier, language string, stars, prs int, stale bool, at time.Time) *Verdict {
	fn := fullName(owner, name)
	verdictPath := "/" + owner + "/" + name
	share := s.baseURL + verdictPath + "?utm_source=share&utm_medium=verdict_card&utm_campaign=instant_repo_check"
	if at.IsZero() {
		at = time.Now().UTC()
	}
	return &Verdict{
		FullName:    fn,
		Owner:       owner,
		Name:        name,
		RepoID:      repoID,
		Score:       score,
		Tier:        tier,
		Language:    language,
		Stars:       stars,
		PRsAnalyzed: prs,
		Stale:       stale,
		Headline:    Headline(fn, tier, stale),
		OGImageURL:  s.baseURL + "/og/scan/" + owner + "/" + name,
		ShareURL:    share,
		VerdictURL:  s.baseURL + verdictPath,
		ScoredAt:    at.UTC(),
	}
}

// Headline is the auto-generated share copy stamped onto the OG card (AC7).
func Headline(fn, tier string, stale bool) string {
	switch {
	case stale:
		return fmt.Sprintf("This repo is a %s-tier ghost town — verify before you PR", tier)
	case tier == "S" || tier == "A":
		return fmt.Sprintf("%s-tier: maintainers actually merge outside PRs here", tier)
	case tier == "B":
		return fmt.Sprintf("%s-tier: decent odds, but read the review history first", tier)
	default:
		return fmt.Sprintf("%s-tier: expect a long wait — verify before you PR", tier)
	}
}

func (s *Service) enqueue(ctx context.Context, owner, name string) {
	if s.db == nil {
		return
	}
	fn := fullName(owner, name)
	query := `
		INSERT INTO indexing_queue (full_name, owner, name, status, created_at)
		VALUES (?, ?, ?, 'pending', CURRENT_TIMESTAMP)
		ON DUPLICATE KEY UPDATE created_at = VALUES(created_at)
	`
	if s.db.DriverName() == "sqlite" {
		query = `
			INSERT OR REPLACE INTO indexing_queue (full_name, owner, name, status, created_at)
			VALUES (?, ?, ?, 'pending', CURRENT_TIMESTAMP)
		`
	}
	if _, err := s.db.ExecContext(ctx, query, fn, owner, name); err != nil {
		slog.Warn("scan: enqueue failed", "repo", fn, "err", err)
	}
}

// run executes the scoring job with exponential backoff on transient GitHub
// errors and a hard timeout that never persists a partial verdict (AC4, AC6).
func (s *Service) run(owner, name string) {
	defer s.releaseLock(owner, name)
	defer func() {
		if rec := recover(); rec != nil {
			slog.Error("scan: worker panic", "repo", fullName(owner, name), "panic", rec)
			s.writeState(context.Background(), owner, name, &Status{
				State: StateError, FullName: fullName(owner, name),
				Message: "Scoring failed unexpectedly. Please retry.",
			})
		}
	}()

	ctx, cancel := context.WithTimeout(context.Background(), hardTimeout)
	defer cancel()
	fn := fullName(owner, name)

	var (
		prs      []ghclient.PR
		meta     ghclient.RepoMeta
		fetchErr error
	)
	backoff := time.Second
	for attempt := 1; attempt <= 3; attempt++ {
		prs, meta, fetchErr = s.gh.FetchPRs(owner, name, 180)
		if fetchErr == nil {
			break
		}
		if isRateLimit(fetchErr) {
			s.enqueue(ctx, owner, name)
			s.writeState(ctx, owner, name, &Status{
				State: StateQueued, Progress: 30, FullName: fn,
				Message: "GitHub rate limit reached - your scan is queued and will finish automatically.",
			})
			return
		}
		if ctx.Err() != nil {
			break
		}
		select {
		case <-ctx.Done():
		case <-time.After(backoff):
		}
		backoff *= 2
	}
	if fetchErr != nil || ctx.Err() != nil {
		slog.Warn("scan: FetchPRs failed", "repo", fn, "err", fetchErr)
		s.writeState(context.Background(), owner, name, &Status{
			State: StateError, FullName: fn,
			Message: "Could not read this repository's pull-request history. Please retry.",
		})
		return
	}

	s.writeState(ctx, owner, name, &Status{State: StateScoring, Progress: 55, FullName: fn, Message: "Computing C-Rank metrics…"})

	gfiIssues, gfiCount, gfiErr := s.gh.FetchGoodFirstIssuesList(owner, name, 5)
	if gfiErr != nil {
		slog.Warn("scan: good-first-issue fetch failed", "repo", fn, "err", gfiErr)
	}

	scoringPRs := make([]scoring.PR, len(prs))
	for i, p := range prs {
		scoringPRs[i] = scoring.PR{
			State:             p.State,
			CreatedAt:         p.CreatedAt,
			MergedAt:          p.MergedAt,
			AuthorAssociation: p.AuthorAssociation,
			AuthorLogin:       p.AuthorLogin,
			FirstCommentAt:    p.FirstCommentAt,
			TotalComments:     p.TotalComments,
			CommentAuthors:    p.CommentAuthors,
		}
	}

	raw := scoring.ComputeMetrics(scoringPRs, false, scoring.BusFactorWindowDays())
	raw.GoodFirstIssueCount = gfiCount
	raw.PRsCreated6m = len(prs)

	peers, err := s.repoStore.FetchLatestSnapshotsSample(ctx, 500)
	if err != nil {
		slog.Warn("scan: peer sample fetch failed - percentiles will be weaker", "repo", fn, "err", err)
	}
	peers = append(peers, raw)
	normed := scoring.NormaliseAll(peers)
	thisNormed := normed[len(normed)-1]
	score, tier := scoring.ComputeCRank(thisNormed, raw.StalenessFlag, raw.GoodFirstIssueCount)

	s.writeState(ctx, owner, name, &Status{State: StateScoring, Progress: 80, FullName: fn, Message: "Saving verdict…"})

	repoID, err := s.upsertRepoRow(ctx, owner, name, meta)
	if err != nil {
		slog.Error("scan: repo upsert failed", "repo", fn, "err", err)
		s.writeState(context.Background(), owner, name, &Status{
			State: StateError, FullName: fn, Message: "Could not save the verdict. Please retry.",
		})
		return
	}

	if err := s.repoStore.InsertSnapshot(ctx, repoID, raw, score, tier, scoring.ScoreSourceComputed); err != nil {
		slog.Error("scan: snapshot insert failed", "repo", fn, "err", err)
		s.writeState(context.Background(), owner, name, &Status{
			State: StateError, FullName: fn, Message: "Could not save the verdict. Please retry.",
		})
		return
	}

	if s.db != nil {
		_ = repository.NewGFIRepository(s.db).UpsertIssues(ctx, repoID, gfiIssues)
	}
	if len(meta.Topics) > 0 {
		_ = s.repoStore.UpsertTopics(ctx, repoID, meta.Topics)
	}

	v := s.buildVerdict(owner, name, repoID, score, tier, meta.Language, meta.Stars, len(prs), raw.StalenessFlag, time.Now().UTC())
	s.cacheVerdict(context.Background(), v)
	s.writeState(context.Background(), owner, name, &Status{
		State: StateReady, Progress: 100, FullName: fn, Verdict: v,
	})
	slog.Info("scan: on-demand scoring complete", "repo", fn, "score", score, "tier", tier, "prs", len(prs))
}

func isRateLimit(err error) bool {
	if err == nil {
		return false
	}
	msg := strings.ToLower(err.Error())
	return strings.Contains(msg, "rate limit") || strings.Contains(msg, "api rate")
}

func (s *Service) upsertRepoRow(ctx context.Context, owner, name string, meta ghclient.RepoMeta) (string, error) {
	fn := fullName(owner, name)
	if s.db == nil {
		if rec, err := s.repoStore.FindByIDOrName(ctx, fn); err == nil && rec != nil {
			return rec.ID, nil
		}
		return "", fmt.Errorf("database unavailable")
	}

	var id string
	err := s.db.QueryRowContext(ctx, "SELECT id FROM repositories WHERE LOWER(full_name) = LOWER(?)", fn).Scan(&id)
	switch {
	case err == sql.ErrNoRows:
		id = uuid.New().String()
		_, insErr := s.db.ExecContext(ctx, `
			INSERT INTO repositories (id, full_name, owner, name, language, stars, description, github_url, updated_at)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
		`, id, fn, owner, name, meta.Language, meta.Stars, strings.TrimSpace(meta.Description),
			"https://github.com/"+fn, time.Now().UTC())
		if insErr != nil {
			return "", insErr
		}
	case err != nil:
		return "", err
	default:
		_, updErr := s.db.ExecContext(ctx, `
			UPDATE repositories SET updated_at = ?, stars = ?, description = ?, language = ? WHERE id = ?
		`, time.Now().UTC(), meta.Stars, strings.TrimSpace(meta.Description), meta.Language, id)
		if updErr != nil {
			slog.Warn("scan: repo metadata update failed", "repo", fn, "err", updErr)
		}
	}
	return id, nil
}
