package claim

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"hash/fnv"
	"log/slog"
	"time"

	"github.com/abhisheksoni27/opendoor/internal/repository"
	"github.com/abhisheksoni27/opendoor/internal/scoring"
	"github.com/google/uuid"
)

// playbookCardCooldown rate-limits OG card generation per repo (AC6).
const playbookCardCooldown = time.Hour

// rescoreWindowDays matches the recalculate-history telemetry window.
const rescoreWindowDays = 180

// rescoreLockTTL bounds a rescore_locks row (AC4): locks older than 15min are
// stale, auto-expire, and get deleted on the next acquire attempt.
const rescoreLockTTL = 15 * time.Minute

// ErrRescoreAlreadyRunning is returned when another re-score holds the
// repo's rescore_locks row; the handler maps it to 202 'already running' (AC4).
var ErrRescoreAlreadyRunning = errors.New("rescore already running")

// playbookCardTokenTTL bounds a before/after OG card share URL (AC5).
const playbookCardTokenTTL = 90 * 24 * time.Hour

// ErrPlaybookCardTokenInvalid covers unknown/expired card tokens (AC5).
var ErrPlaybookCardTokenInvalid = errors.New("playbook card token invalid or expired")

// Card statuses persisted in crank_playbook_cards.
const (
	CardStatusImproved = "improved"
	CardStatusNoChange = "no_change"
)

// RepoPlaybookPayload is the public "Raise Your C-Rank" checklist payload (AC1, AC2).
type RepoPlaybookPayload struct {
	RepoFullName string  `json:"repo_full_name"`
	IsScored     bool    `json:"is_scored"`
	CRankScore   float64 `json:"c_rank_score"`
	CRankTier    string  `json:"c_rank_tier"`
	// ScoreVersion pins the exact snapshot this payload was computed from
	// (AC5): before/after card links carry it so cards never mix versions.
	ScoreVersion string `json:"score_version"`
	// ValidMetrics counts checklist rows backed by real telemetry; zero means
	// the caller should render the single 'insufficient telemetry' line (AC2).
	ValidMetrics int `json:"valid_metrics"`
	// Locked is true when the caller is unauthenticated: per AC2 they see
	// only repo name + C-Rank tier and no per-metric checklist detail.
	Locked    bool                  `json:"locked"`
	Checklist []scoring.RankGapItem `json:"checklist"`
}

// ScoreVersionFor derives a deterministic per-snapshot version tag from the
// immutable score inputs, so a given (repo, score_version) pair always maps
// to the same before/after card (AC4 determinism + AC5 pinning).
func ScoreVersionFor(repo *repository.RepoRecord) string {
	if repo == nil || repo.ID == "" {
		return "sv1_unscored"
	}
	h := fnv.New64a()
	fmt.Fprintf(h, "%s|%.4f|%s|%s", repo.ID, repo.CRankScore, repo.CRankTier, repo.SnapshotDate)
	return fmt.Sprintf("sv1_%016x", h.Sum64())
}

// RescoreResult reports the paired before/after re-score plus card issuance state.
type RescoreResult struct {
	BeforeScore   float64    `json:"before_score"`
	AfterScore    float64    `json:"after_score"`
	BeforeTier    string     `json:"before_tier"`
	AfterTier     string     `json:"after_tier"`
	Outcome       string     `json:"outcome"`
	CardIssued    bool       `json:"card_issued"`
	CardStatus    string     `json:"card_status"`
	RateLimited   bool       `json:"rate_limited"`
	NextAllowedAt *time.Time `json:"next_allowed_at,omitempty"`
	// CardURL is the tokenized before/after OG card link (AC5): 128-bit
	// random token scoped to this single repo, expiring in 90 days.
	CardURL       string     `json:"card_url,omitempty"`
	CardExpiresAt *time.Time `json:"card_expires_at,omitempty"`
}

// PlaybookCardState is the persisted before/after OG card input (AC4).
type PlaybookCardState struct {
	Status      string
	BeforeScore float64
	BeforeTier  string
	AfterScore  *float64
	AfterTier   *string
	LastCardAt  *time.Time
}

// GetRepoPlaybook builds the raise-your-C-Rank checklist from stored telemetry;
// safe for unscored or partially-scored repos (never errors on missing data).
func (s *Service) GetRepoPlaybook(ctx context.Context, owner, name string) (*RepoPlaybookPayload, error) {
	repo, err := s.repoRepo.FindByIDOrName(ctx, owner+"/"+name)
	if err != nil && !errors.Is(err, sql.ErrNoRows) {
		return nil, fmt.Errorf("lookup repo: %w", err)
	}

	payload := &RepoPlaybookPayload{
		RepoFullName: owner + "/" + name,
		Checklist:    []scoring.RankGapItem{},
	}
	if repo == nil || repo.ID == "" {
		payload.Checklist = append(payload.Checklist, scoring.GenerateRankGapChecklist(scoring.PlaybookTelemetry{})...)
		return payload, nil
	}

	if repo.FullName != "" {
		payload.RepoFullName = repo.FullName
	}
	payload.IsScored = repo.IsScored
	payload.CRankScore = repo.CRankScore
	payload.CRankTier = repo.CRankTier

	payload.Checklist = scoring.GenerateRankGapChecklist(playbookTelemetryFromRecord(repo))
	payload.ScoreVersion = ScoreVersionFor(repo)
	for _, item := range payload.Checklist {
		if item.Status != scoring.GapStatusInsufficient {
			payload.ValidMetrics++
		}
	}
	return payload, nil
}

// playbookTelemetryFromRecord maps a stored snapshot onto gap inputs using
// pointers so partially-scored rows degrade into 'insufficient data' (AC2).
func playbookTelemetryFromRecord(repo *repository.RepoRecord) scoring.PlaybookTelemetry {
	t := scoring.PlaybookTelemetry{}
	if repo == nil || !repo.IsScored {
		return t
	}

	p50 := repo.ResponseP50Hours
	if p50 <= 0 {
		p50 = repo.TimeToFirstResponseHours
	}
	switch {
	case p50 > 0:
		p50Copy := p50
		t.ResponseP50Hours = &p50Copy
		prs := repo.PrCount6m
		t.ReviewsObservedCount = &prs
	case repo.PrCount6m > 0:
		// PRs exist but no first-review latency was ever recorded.
		noReviews := 0
		t.ReviewsObservedCount = &noReviews
	}

	if repo.DistinctMaintainerCount > 0 {
		breadth := repo.DistinctMaintainerCount
		t.DistinctReviewers = &breadth
	} else if repo.BusFactor > 0 {
		busFactor := repo.BusFactor
		t.BusFactor = &busFactor
	}

	if p50 > 0 {
		triage := p50
		t.TriageHours = &triage
	}
	issues := repo.IssueCount6m
	t.IssuesCreated6m = &issues

	gfi := repo.GoodFirstIssueCount
	t.GoodFirstIssueCount = &gfi

	return t
}

// RescoreClaimedRepo runs an automated re-score for a VERIFIED claimant (AC3):
// the before snapshot is read in the same transaction that refreshes telemetry
// and writes the new score (AC5), then a before/after OG card is issued only on
// a confirmed improvement, subject to the per-repo cooldown (AC4, AC6).
func (s *Service) RescoreClaimedRepo(ctx context.Context, owner, name string, userID int64) (*RescoreResult, error) {
	fullName := owner + "/" + name
	repo, err := s.repoRepo.FindByIDOrName(ctx, fullName)
	if err != nil && !errors.Is(err, sql.ErrNoRows) {
		return nil, fmt.Errorf("lookup repo: %w", err)
	}

	repoID := fullName
	gfiCount := 0
	if repo != nil && repo.ID != "" {
		repoID = repo.ID
		gfiCount = repo.GoodFirstIssueCount
		fullName = repo.FullName
	}

	// AC3: ownership must already be verified before any re-score or card.
	claimRec, err := s.claimRepo.GetVerifiedClaimByRepoID(ctx, repoID)
	if err != nil && !errors.Is(err, sql.ErrNoRows) {
		return nil, fmt.Errorf("lookup claim: %w", err)
	}
	if claimRec == nil || claimRec.OwnerUserID != userID {
		return nil, fmt.Errorf("403: verified maintainer claim required before re-scoring")
	}

	// AC4: single-flight guard. The lock is acquired atomically via INSERT
	// ... ON CONFLICT DO NOTHING; the loser gets ErrRescoreAlreadyRunning
	// (mapped to 202 by the handler) instead of racing the winner.
	acquired, err := s.acquireRescoreLock(ctx, repoID)
	if err != nil {
		return nil, fmt.Errorf("acquire rescore lock: %w", err)
	}
	if !acquired {
		return nil, ErrRescoreAlreadyRunning
	}
	defer s.releaseRescoreLock(ctx, repoID)

	beforeScore, beforeTier, err := s.rescoreSnapshotsTx(ctx, repoID, gfiCount)
	if err != nil {
		return nil, err
	}

	after, err := s.repoRepo.FindByIDOrName(ctx, repoID)
	afterScore, afterTier := beforeScore, beforeTier
	if err == nil && after != nil {
		afterScore = after.CRankScore
		afterTier = after.CRankTier
	}

	outcome := scoring.CompareRescoreOutcome(beforeScore, afterScore)

	result := &RescoreResult{
		BeforeScore: beforeScore,
		AfterScore:  afterScore,
		BeforeTier:  beforeTier,
		AfterTier:   afterTier,
		Outcome:     outcome,
	}

	lastCardAt, err := s.lastPlaybookCardAt(ctx, repoID)
	if err != nil {
		slog.Warn("playbook card rate-limit lookup failed", "repo", fullName, "err", err)
	}
	if lastCardAt != nil && time.Since(*lastCardAt) < playbookCardCooldown {
		result.RateLimited = true
		next := lastCardAt.Add(playbookCardCooldown)
		result.NextAllowedAt = &next
		result.CardStatus = CardStatusNoChange
		return result, nil
	}

	switch outcome {
	case scoring.OutcomeImproved:
		if err := s.savePlaybookCard(ctx, repoID, fullName, PlaybookCardState{
			Status:      CardStatusImproved,
			BeforeScore: beforeScore,
			BeforeTier:  beforeTier,
			AfterScore:  &afterScore,
			AfterTier:   &afterTier,
		}, true); err != nil {
			slog.Warn("playbook card persist failed", "repo", fullName, "err", err)
		}
		result.CardIssued = true
		result.CardStatus = CardStatusImproved
		// AC5: improvement crossed the threshold — mint the tokenized share
		// URL (128-bit token, single-repo scope, 90-day expiry). Failure to
		// mint never fails the re-score; the owner/name OG route remains.
		token, expiresAt, tokErr := s.createPlaybookCardToken(ctx, repoID)
		if tokErr != nil {
			slog.Warn("playbook card token mint failed", "repo", fullName, "err", tokErr)
		} else {
			result.CardURL = "/og/playbook-card/" + token
			result.CardExpiresAt = &expiresAt
		}
	default:
		// AC4: flat/regressed scores show the current rank card with an
		// explicit 'no change yet' status - never stale improvement copy.
		status := CardStatusNoChange
		if err := s.savePlaybookCard(ctx, repoID, fullName, PlaybookCardState{
			Status:      status,
			BeforeScore: afterScore,
			BeforeTier:  afterTier,
		}, false); err != nil {
			slog.Warn("playbook card persist failed", "repo", fullName, "err", err)
		}
		result.CardStatus = status
	}

	return result, nil
}

// rescoreSnapshotsTx recomputes this repo's C-Rank from raw telemetry events
// and refreshes latest_snapshots + daily_snapshots. The before snapshot read
// shares the transaction with the refresh writes so pairs can never mismatch (AC5).
func (s *Service) rescoreSnapshotsTx(ctx context.Context, repoID string, gfiCount int) (beforeScore float64, beforeTier string, err error) {
	tx, err := s.db.BeginTxx(ctx, nil)
	if err != nil {
		return 0, "", fmt.Errorf("begin rescore transaction: %w", err)
	}
	defer tx.Rollback()

	var beforeRow struct {
		Score float64 `db:"c_rank_score"`
		Tier  string  `db:"c_rank_tier"`
	}

	err = tx.GetContext(ctx, &beforeRow, `SELECT c_rank_score, c_rank_tier FROM latest_snapshots WHERE repository_id = ?`, repoID)
	switch {
	case errors.Is(err, sql.ErrNoRows):
		beforeScore, beforeTier = 0, ""
	case err != nil:
		return 0, "", fmt.Errorf("read before snapshot: %w", err)
	default:
		beforeScore, beforeTier = beforeRow.Score, beforeRow.Tier
	}

	cutoff := time.Now().UTC().Add(-rescoreWindowDays * 24 * time.Hour)

	var prEvents []rescorePREvent
	if err := tx.SelectContext(ctx, &prEvents, `
		SELECT pr_number, actor_login, action, event_at
		FROM repo_pr_events
		WHERE repository_id = ? AND event_at >= ?
	`, repoID, cutoff); err != nil {
		return 0, "", fmt.Errorf("load pr events: %w", err)
	}

	var commentEvents []rescoreCommentEvent
	if err := tx.SelectContext(ctx, &commentEvents, `
		SELECT author_login, created_at
		FROM repo_raw_comments
		WHERE repository_id = ? AND created_at >= ?
	`, repoID, cutoff); err != nil {
		return 0, "", fmt.Errorf("load comments: %w", err)
	}

	scoringPRs := aggregateRescorePRs(prEvents, commentEvents)
	if len(scoringPRs) == 0 {
		return 0, "", fmt.Errorf("400: no telemetry events in the last %d days to re-score", rescoreWindowDays)
	}

	raw := scoring.ComputeMetrics(scoringPRs, false, scoring.BusFactorWindowDays())
	raw.GoodFirstIssueCount = gfiCount

	allRaw, sampleErr := s.repoRepo.FetchLatestSnapshotsSample(ctx, 500)
	if sampleErr != nil {
		slog.Warn("playbook rescore: peer sample unavailable, single-repo percentile", "repo_id", repoID, "err", sampleErr)
	}
	allRaw = append(allRaw, raw)
	normed := scoring.NormaliseAll(allRaw)
	score, tier := scoring.ComputeCRank(normed[len(normed)-1], raw.StalenessFlag, raw.GoodFirstIssueCount)
	if raw.ExternalPRCount > 0 && !raw.StalenessFlag {
		score = scoring.ComputeConfidenceScore(score, raw.ExternalPRCount)
	}

	staleness := 0
	if raw.StalenessFlag {
		staleness = 1
	}
	today := time.Now().UTC().Format("2006-01-02")

	upsertDaily := `
		INSERT INTO daily_snapshots (
			id, repository_id, snapshot_date,
			external_pr_merge_rate, time_to_first_response_hours, time_to_merge_hours,
			first_timer_success_rate, repeat_contributor_rate,
			maintainer_responsiveness, last_activity_days, review_rounds,
			distinct_maintainer_count, bus_factor, staleness_flag, c_rank_score, c_rank_tier,
			score_source, good_first_issue_count, response_p50_hours, response_p90_hours
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
	dailyUpdate := `
			ON DUPLICATE KEY UPDATE
				external_pr_merge_rate = VALUES(external_pr_merge_rate),
				time_to_first_response_hours = VALUES(time_to_first_response_hours),
				time_to_merge_hours = VALUES(time_to_merge_hours),
				first_timer_success_rate = VALUES(first_timer_success_rate),
				repeat_contributor_rate = VALUES(repeat_contributor_rate),
				maintainer_responsiveness = VALUES(maintainer_responsiveness),
				last_activity_days = VALUES(last_activity_days),
				review_rounds = VALUES(review_rounds),
				distinct_maintainer_count = VALUES(distinct_maintainer_count),
				bus_factor = VALUES(bus_factor),
				staleness_flag = VALUES(staleness_flag),
				c_rank_score = VALUES(c_rank_score),
				c_rank_tier = VALUES(c_rank_tier),
				score_source = VALUES(score_source),
				good_first_issue_count = VALUES(good_first_issue_count),
				response_p50_hours = VALUES(response_p50_hours),
				response_p90_hours = VALUES(response_p90_hours)`
	if s.db.DriverName() == "sqlite" {
		dailyUpdate = `
			ON CONFLICT(repository_id, snapshot_date) DO UPDATE SET
				external_pr_merge_rate = excluded.external_pr_merge_rate,
				time_to_first_response_hours = excluded.time_to_first_response_hours,
				time_to_merge_hours = excluded.time_to_merge_hours,
				first_timer_success_rate = excluded.first_timer_success_rate,
				repeat_contributor_rate = excluded.repeat_contributor_rate,
				maintainer_responsiveness = excluded.maintainer_responsiveness,
				last_activity_days = excluded.last_activity_days,
				review_rounds = excluded.review_rounds,
				distinct_maintainer_count = excluded.distinct_maintainer_count,
				bus_factor = excluded.bus_factor,
				staleness_flag = excluded.staleness_flag,
				c_rank_score = excluded.c_rank_score,
				c_rank_tier = excluded.c_rank_tier,
				score_source = excluded.score_source,
				good_first_issue_count = excluded.good_first_issue_count,
				response_p50_hours = excluded.response_p50_hours,
				response_p90_hours = excluded.response_p90_hours`
	}
	if _, err := tx.ExecContext(ctx, upsertDaily+dailyUpdate,
		uuid.New().String(), repoID, today,
		raw.ExternalPRMergeRate, raw.TimeToFirstResponseHours, raw.TimeToMergeHours,
		raw.FirstTimerSuccessRate, raw.RepeatContributorRate, raw.MaintainerResponsiveness,
		raw.LastActivityDays, raw.ReviewRounds, raw.DistinctMaintainerCount,
		raw.BusFactor, staleness, score, tier,
		scoring.ScoreSourceComputed, raw.GoodFirstIssueCount, raw.ResponseP50Hours, raw.ResponseP90Hours,
	); err != nil {
		return 0, "", fmt.Errorf("refresh daily snapshot: %w", err)
	}

	upsertLatest := `
		INSERT INTO latest_snapshots (
			repository_id, snapshot_date,
			external_pr_merge_rate, time_to_first_response_hours, time_to_merge_hours,
			first_timer_success_rate, repeat_contributor_rate,
			maintainer_responsiveness, last_activity_days, review_rounds,
			distinct_maintainer_count, bus_factor, staleness_flag, c_rank_score, c_rank_tier,
			good_first_issue_count, response_p50_hours, response_p90_hours, updated_at
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`
	latestUpdate := `
		ON DUPLICATE KEY UPDATE
			external_pr_merge_rate = VALUES(external_pr_merge_rate),
			time_to_first_response_hours = VALUES(time_to_first_response_hours),
			time_to_merge_hours = VALUES(time_to_merge_hours),
			first_timer_success_rate = VALUES(first_timer_success_rate),
			repeat_contributor_rate = VALUES(repeat_contributor_rate),
			maintainer_responsiveness = VALUES(maintainer_responsiveness),
			last_activity_days = VALUES(last_activity_days),
			review_rounds = VALUES(review_rounds),
			distinct_maintainer_count = VALUES(distinct_maintainer_count),
			bus_factor = VALUES(bus_factor),
			staleness_flag = VALUES(staleness_flag),
			c_rank_score = VALUES(c_rank_score),
			c_rank_tier = VALUES(c_rank_tier),
			good_first_issue_count = VALUES(good_first_issue_count),
			response_p50_hours = VALUES(response_p50_hours),
			response_p90_hours = VALUES(response_p90_hours)`
	if s.db.DriverName() == "sqlite" {
		latestUpdate = `
		ON CONFLICT(repository_id) DO UPDATE SET
			external_pr_merge_rate = excluded.external_pr_merge_rate,
			time_to_first_response_hours = excluded.time_to_first_response_hours,
			time_to_merge_hours = excluded.time_to_merge_hours,
			first_timer_success_rate = excluded.first_timer_success_rate,
			repeat_contributor_rate = excluded.repeat_contributor_rate,
			maintainer_responsiveness = excluded.maintainer_responsiveness,
			last_activity_days = excluded.last_activity_days,
			review_rounds = excluded.review_rounds,
			distinct_maintainer_count = excluded.distinct_maintainer_count,
			bus_factor = excluded.bus_factor,
			staleness_flag = excluded.staleness_flag,
			c_rank_score = excluded.c_rank_score,
			c_rank_tier = excluded.c_rank_tier,
			good_first_issue_count = excluded.good_first_issue_count,
			response_p50_hours = excluded.response_p50_hours,
			response_p90_hours = excluded.response_p90_hours`
	}
	if _, err := tx.ExecContext(ctx, upsertLatest+latestUpdate,
		repoID, today,
		raw.ExternalPRMergeRate, raw.TimeToFirstResponseHours, raw.TimeToMergeHours,
		raw.FirstTimerSuccessRate, raw.RepeatContributorRate, raw.MaintainerResponsiveness,
		raw.LastActivityDays, raw.ReviewRounds, raw.DistinctMaintainerCount,
		raw.BusFactor, staleness, score, tier, raw.GoodFirstIssueCount,
		raw.ResponseP50Hours, raw.ResponseP90Hours,
	); err != nil {
		return 0, "", fmt.Errorf("refresh latest snapshot: %w", err)
	}

	if err := tx.Commit(); err != nil {
		return 0, "", fmt.Errorf("commit rescore: %w", err)
	}

	return beforeScore, beforeTier, nil
}

// rescorePREvent / rescoreCommentEvent mirror the recalculate-history inputs.
type rescorePREvent struct {
	PRNumber   int       `db:"pr_number"`
	ActorLogin string    `db:"actor_login"`
	Action     string    `db:"action"`
	EventAt    time.Time `db:"event_at"`
}

type rescoreCommentEvent struct {
	AuthorLogin string    `db:"author_login"`
	CreatedAt   time.Time `db:"created_at"`
}

func aggregateRescorePRs(prEvents []rescorePREvent, commentEvents []rescoreCommentEvent) []scoring.PR {
	type prAgg struct {
		actorLogin string
		openedAt   time.Time
		closedAt   *time.Time
		wasMerged  bool
	}

	prs := make(map[int]*prAgg)
	for _, ev := range prEvents {
		pa, ok := prs[ev.PRNumber]
		if !ok {
			pa = &prAgg{}
			prs[ev.PRNumber] = pa
		}
		if ev.ActorLogin != "" && pa.actorLogin == "" {
			pa.actorLogin = ev.ActorLogin
		}
		switch ev.Action {
		case "opened":
			pa.openedAt = ev.EventAt
		case "merged":
			pa.wasMerged = true
			t := ev.EventAt
			pa.closedAt = &t
		case "closed":
			t := ev.EventAt
			pa.closedAt = &t
		}
	}

	out := make([]scoring.PR, 0, len(prs))
	for _, pa := range prs {
		if pa.openedAt.IsZero() {
			continue
		}
		pr := scoring.PR{
			AuthorLogin:       pa.actorLogin,
			AuthorAssociation: "CONTRIBUTOR",
			CreatedAt:         pa.openedAt,
		}
		switch {
		case pa.wasMerged:
			pr.State = "MERGED"
			pr.MergedAt = pa.closedAt
		case pa.closedAt != nil:
			pr.State = "CLOSED"
		default:
			pr.State = "OPEN"
		}

		var firstComment *time.Time
		limit30d := pa.openedAt.Add(30 * 24 * time.Hour)
		for _, cm := range commentEvents {
			if cm.CreatedAt.After(pa.openedAt) && cm.CreatedAt.Before(limit30d) {
				if firstComment == nil || cm.CreatedAt.Before(*firstComment) {
					tCopy := cm.CreatedAt
					firstComment = &tCopy
				}
			}
			inWindow := cm.CreatedAt.After(pa.openedAt) && (pa.closedAt == nil || cm.CreatedAt.Before(*pa.closedAt))
			if inWindow && cm.AuthorLogin != "" && cm.AuthorLogin != pa.actorLogin {
				pr.CommentAuthors = append(pr.CommentAuthors, cm.AuthorLogin)
			}
		}
		pr.FirstCommentAt = firstComment
		out = append(out, pr)
	}
	return out
}

// GetPlaybookCardState loads the persisted before/after card input for rendering.
func (s *Service) GetPlaybookCardState(ctx context.Context, repoID string) (*PlaybookCardState, error) {
	state := &PlaybookCardState{}
	row := s.db.QueryRowxContext(ctx, `
		SELECT status, before_score, before_tier, after_score, after_tier, last_card_at
		FROM crank_playbook_cards
		WHERE repo_id = ?
	`, repoID)
	var (
		afterScore sql.NullFloat64
		afterTier  sql.NullString
	)
	if err := row.Scan(&state.Status, &state.BeforeScore, &state.BeforeTier, &afterScore, &afterTier, &state.LastCardAt); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	if afterScore.Valid {
		v := afterScore.Float64
		state.AfterScore = &v
	}
	if afterTier.Valid && afterTier.String != "" {
		v := afterTier.String
		state.AfterTier = &v
	}
	return state, nil
}

func (s *Service) lastPlaybookCardAt(ctx context.Context, repoID string) (*time.Time, error) {
	var last *time.Time
	if err := s.db.GetContext(ctx, &last, `SELECT last_card_at FROM crank_playbook_cards WHERE repo_id = ?`, repoID); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return last, nil
}

// acquireRescoreLock atomically claims this repo's re-score slot (AC4):
// stale locks (>15min) are deleted first, then INSERT ... ON CONFLICT DO
// NOTHING decides winner vs loser in a single statement.
func (s *Service) acquireRescoreLock(ctx context.Context, repoID string) (bool, error) {
	cutoff := time.Now().UTC().Add(-rescoreLockTTL)
	if _, err := s.db.ExecContext(ctx, `DELETE FROM rescore_locks WHERE locked_at < ?`, cutoff); err != nil {
		return false, fmt.Errorf("expire stale rescore locks: %w", err)
	}

	query := `INSERT INTO rescore_locks (repo_id, locked_at) VALUES (?, ?) ON CONFLICT (repo_id) DO NOTHING`
	if s.db.DriverName() != "sqlite" {
		query = `INSERT INTO rescore_locks (repo_id, locked_at) VALUES (?, ?) ON DUPLICATE KEY UPDATE repo_id = repo_id`
	}
	res, err := s.db.ExecContext(ctx, query, repoID, time.Now().UTC())
	if err != nil {
		return false, err
	}
	affected, err := res.RowsAffected()
	if err != nil {
		return false, err
	}
	return affected == 1, nil
}

// releaseRescoreLock drops the repo's lock after a finished re-score; it is
// best-effort — a missed release self-heals via the 15min stale expiry.
func (s *Service) releaseRescoreLock(ctx context.Context, repoID string) {
	if _, err := s.db.ExecContext(ctx, `DELETE FROM rescore_locks WHERE repo_id = ?`, repoID); err != nil {
		slog.Warn("release rescore lock failed", "repo_id", repoID, "err", err)
	}
}

// createPlaybookCardToken mints a 128-bit random share token scoped to a
// single repo and expiring after 90 days (AC5).
func (s *Service) createPlaybookCardToken(ctx context.Context, repoID string) (string, time.Time, error) {
	token, err := GenerateNonce()
	if err != nil {
		return "", time.Time{}, fmt.Errorf("generate card token: %w", err)
	}
	expiresAt := time.Now().UTC().Add(playbookCardTokenTTL)
	if _, err := s.db.ExecContext(ctx, `
		INSERT INTO crank_playbook_card_tokens (token, repo_id, created_at, expires_at)
		VALUES (?, ?, ?, ?)
	`, token, repoID, time.Now().UTC(), expiresAt); err != nil {
		return "", time.Time{}, fmt.Errorf("persist card token: %w", err)
	}
	return token, expiresAt, nil
}

// ResolvePlaybookCardToken validates a share token and returns its single
// scoped repo ID; unknown or expired tokens fail closed (AC5).
func (s *Service) ResolvePlaybookCardToken(ctx context.Context, token string) (string, error) {
	var (
		repoID    string
		expiresAt time.Time
	)
	err := s.db.QueryRowxContext(ctx, `
		SELECT repo_id, expires_at FROM crank_playbook_card_tokens WHERE token = ?
	`, token).Scan(&repoID, &expiresAt)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return "", ErrPlaybookCardTokenInvalid
		}
		return "", fmt.Errorf("lookup card token: %w", err)
	}
	if time.Now().UTC().After(expiresAt) {
		return "", ErrPlaybookCardTokenInvalid
	}
	return repoID, nil
}

// savePlaybookCard persists card state; touchLastCard updates the generation
// timestamp used for the per-repo 1/hour OG card cooldown (AC6).
func (s *Service) savePlaybookCard(ctx context.Context, repoID, fullName string, st PlaybookCardState, touchLastCard bool) error {
	now := time.Now().UTC()
	lastCard := now
	if !touchLastCard {
		lastCard = time.Time{} // zero value keeps NULL via COALESCE guard below
	}

	query := `
		INSERT INTO crank_playbook_cards
			(repo_id, full_name, before_score, before_tier, after_score, after_tier, status, last_card_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
		ON DUPLICATE KEY UPDATE
			full_name = VALUES(full_name),
			before_score = VALUES(before_score),
			before_tier = VALUES(before_tier),
			after_score = VALUES(after_score),
			after_tier = VALUES(after_tier),
			status = VALUES(status),
			last_card_at = VALUES(last_card_at),
			updated_at = VALUES(updated_at)
	`
	if s.db.DriverName() == "sqlite" {
		query = `
		INSERT INTO crank_playbook_cards
			(repo_id, full_name, before_score, before_tier, after_score, after_tier, status, last_card_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
		ON CONFLICT(repo_id) DO UPDATE SET
			full_name = excluded.full_name,
			before_score = excluded.before_score,
			before_tier = excluded.before_tier,
			after_score = excluded.after_score,
			after_tier = excluded.after_tier,
			status = excluded.status,
			last_card_at = excluded.last_card_at,
			updated_at = excluded.updated_at
	`
	}

	var lastArg interface{}
	if touchLastCard {
		lastArg = lastCard
	} else {
		// Preserve any existing cooldown stamp on no-change bookkeeping.
		existing, err := s.lastPlaybookCardAt(ctx, repoID)
		if err != nil {
			return err
		}
		if existing != nil {
			lastArg = *existing
		} else {
			lastArg = nil
		}
	}
	_ = lastCard

	var afterScore interface{}
	if st.AfterScore != nil {
		afterScore = *st.AfterScore
	}
	var afterTier interface{}
	if st.AfterTier != nil {
		afterTier = *st.AfterTier
	}

	_, err := s.db.ExecContext(ctx, query,
		repoID, fullName, st.BeforeScore, st.BeforeTier, afterScore, afterTier, st.Status, lastArg, now,
	)
	return err
}
