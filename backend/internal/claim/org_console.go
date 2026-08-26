package claim

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"sync"
	"time"

	"github.com/abhisheksoni27/opendoor/internal/scoring"
)

// Org console tuning constants (AC1, AC2, AC3).
const (
	orgConsoleCacheTTL = 15 * time.Minute
	peerCohortMin      = 10
)

// OrgPeerBenchmarks carries ONLY anonymous percentile values (AC6): no peer
// org identities or raw peer metrics ever leave this payload.
type OrgPeerBenchmarks struct {
	CohortSize            int     `json:"cohort_size"`
	ScorePercentile       float64 `json:"score_percentile"`
	ResponseP50Percentile float64 `json:"response_p50_percentile"`
	ResponseP90Percentile float64 `json:"response_p90_percentile"`
	FirstTimerPercentile  float64 `json:"first_timer_percentile"`
	BusFactorPercentile   float64 `json:"bus_factor_percentile"`
}

// OrgConsolePayload is the org-level paid-tier console: aggregates over every
// repo in the org plus peer benchmarks when entitled (AC1, AC5).
type OrgConsolePayload struct {
	Org                   string             `json:"org"`
	HasData               bool               `json:"has_data"`
	RepoCount             int                `json:"repo_count"`
	ScoredRepoCount       int                `json:"scored_repo_count"`
	CRankScore            float64            `json:"c_rank_score"`
	CRankTier             string             `json:"c_rank_tier"`
	ResponseP50Hours      float64            `json:"response_p50_hours"`
	ResponseP90Hours      float64            `json:"response_p90_hours"`
	FirstTimerSuccessRate float64            `json:"first_timer_success_rate"`
	BusFactor             int                `json:"bus_factor"`
	Entitled              bool               `json:"entitled"`
	PeerBenchmarks        *OrgPeerBenchmarks `json:"peer_benchmarks,omitempty"`
}

// orgAggregates is one row of the single GROUP BY over repos' existing metrics.
type orgAggregates struct {
	RepoCount   int             `db:"repo_count"`
	ScoredCount int             `db:"scored_count"`
	AvgScore    sql.NullFloat64 `db:"avg_score"`
	AvgP50      sql.NullFloat64 `db:"avg_p50"`
	AvgP90      sql.NullFloat64 `db:"avg_p90"`
	AvgFirst    sql.NullFloat64 `db:"avg_first_timer"`
	BusFactor   int             `db:"total_bus_factor"`
}

func (a orgAggregates) hasData() bool { return a.ScoredCount > 0 && a.AvgScore.Valid }

func (a orgAggregates) score() float64 {
	if !a.AvgScore.Valid {
		return 0
	}
	return a.AvgScore.Float64
}

func nullVal(v sql.NullFloat64) float64 {
	if !v.Valid {
		return 0
	}
	return v.Float64
}

type orgCacheEntry struct {
	self    orgAggregates
	peers   []float64 // live avg C-Rank of every scored org incl. self (AC2)
	p50s    []float64
	p90s    []float64
	firsts  []float64
	bus     []int
	expires time.Time
}

// orgConsoleCache caches aggregate+peer computation for 15 minutes keyed by
// lowercase org id (AC1). Entitlement is NEVER cached here: it is re-checked
// on every request/badge render (AC5).
var orgConsoleCache sync.Map

const orgAggregateQuery = `
	SELECT
		COUNT(*) AS repo_count,
		COALESCE(SUM(CASE WHEN COALESCE(s.c_rank_score,0) > 0 THEN 1 ELSE 0 END), 0) AS scored_count,
		AVG(CASE WHEN COALESCE(s.c_rank_score,0) > 0 THEN s.c_rank_score END) AS avg_score,
		AVG(CASE WHEN COALESCE(s.response_p50_hours,0) > 0 THEN s.response_p50_hours END) AS avg_p50,
		AVG(CASE WHEN COALESCE(s.response_p90_hours,0) > 0 THEN s.response_p90_hours END) AS avg_p90,
		AVG(CASE WHEN COALESCE(s.first_timer_success_rate,0) > 0 THEN s.first_timer_success_rate END) AS avg_first_timer,
		COALESCE(SUM(COALESCE(s.bus_factor,0)), 0) AS total_bus_factor
	FROM repositories r
	JOIN latest_snapshots s ON s.repository_id = r.id
	WHERE LOWER(r.owner) = ?
	GROUP BY LOWER(r.owner)
`

// orgPeersQuery computes current live per-org aggregates for ALL orgs at once
// (single GROUP BY, no snapshot tables - AC2). Only the numeric aggregates are
// read out; identities are discarded after percentile math in Go so responses
// stay anonymous by construction (AC6).
const orgPeersQuery = `
	SELECT
		LOWER(r.owner) AS org_name,
		AVG(COALESCE(s.c_rank_score,0)) AS avg_score,
		AVG(CASE WHEN COALESCE(s.response_p50_hours,0) > 0 THEN s.response_p50_hours END) AS avg_p50,
		AVG(CASE WHEN COALESCE(s.response_p90_hours,0) > 0 THEN s.response_p90_hours END) AS avg_p90,
		AVG(CASE WHEN COALESCE(s.first_timer_success_rate,0) > 0 THEN s.first_timer_success_rate END) AS avg_first_timer,
		COALESCE(SUM(COALESCE(s.bus_factor,0)), 0) AS total_bus_factor
	FROM repositories r
	JOIN latest_snapshots s ON s.repository_id = r.id
	WHERE COALESCE(s.c_rank_score,0) > 0
	GROUP BY LOWER(r.owner)
`

type orgPeerRow struct {
	OrgName string          `db:"org_name"`
	Avg     sql.NullFloat64 `db:"avg_score"`
	P50     sql.NullFloat64 `db:"avg_p50"`
	P90     sql.NullFloat64 `db:"avg_p90"`
	First   sql.NullFloat64 `db:"avg_first_timer"`
	Bus     int             `db:"total_bus_factor"`
}

// loadOrgAggregates returns the cached (<=15min) self aggregates and peer
// distributions for an org, refreshing them with two GROUP BY queries on miss.
func (s *Service) loadOrgAggregates(ctx context.Context, org string) (*orgCacheEntry, error) {
	key := strings.ToLower(org)
	if cached, ok := orgConsoleCache.Load(key); ok {
		if entry, ok := cached.(*orgCacheEntry); ok && time.Now().Before(entry.expires) {
			return entry, nil
		}
	}

	var self orgAggregates
	err := s.db.GetContext(ctx, &self, orgAggregateQuery, key)
	if err != nil && !errors.Is(err, sql.ErrNoRows) {
		return nil, fmt.Errorf("org aggregate query: %w", err)
	}
	if errors.Is(err, sql.ErrNoRows) {
		self = orgAggregates{} // zero-repo org: empty state (AC4)
	}

	var rows []orgPeerRow
	if err := s.db.SelectContext(ctx, &rows, orgPeersQuery); err != nil {
		return nil, fmt.Errorf("peer cohort query: %w", err)
	}

	entry := &orgCacheEntry{self: self, expires: time.Now().Add(orgConsoleCacheTTL)}
	for _, r := range rows {
		if !r.Avg.Valid || r.Avg.Float64 <= 0 {
			continue
		}
		entry.peers = append(entry.peers, r.Avg.Float64)
		entry.p50s = append(entry.p50s, nullVal(r.P50))
		entry.p90s = append(entry.p90s, nullVal(r.P90))
		entry.firsts = append(entry.firsts, nullVal(r.First))
		entry.bus = append(entry.bus, r.Bus)
	}
	orgConsoleCache.Store(key, entry)
	return entry, nil
}

// percentileBetterThan returns the share of the cohort this value beats
// (higher-is-better metrics pass lowerIsBetter=false). Self is included in the
// cohort; ties count as not beaten. Only the percentile escapes (AC6).
func percentileBetterThan(cohort []float64, self float64, lowerIsBetter bool) float64 {
	n := len(cohort)
	if n <= 1 {
		return 0
	}
	beaten := 0
	for _, v := range cohort {
		if lowerIsBetter {
			if v > self {
				beaten++
			}
		} else if v < self {
			beaten++
		}
	}
	return float64(beaten) / float64(n-1) * 100
}

func percentileIntBeaten(cohort []int, self int) float64 {
	f := make([]float64, len(cohort))
	for i, v := range cohort {
		f[i] = float64(v)
	}
	return percentileBetterThan(f, float64(self), false)
}

// HasOrgConsoleAccess reports whether userID holds a verified maintainer claim
// on at least one repository owned by org (render-time check, AC5).
func (s *Service) HasOrgConsoleAccess(ctx context.Context, org string, userID int64) bool {
	var n int
	err := s.db.GetContext(ctx, &n, `
		SELECT COUNT(DISTINCT rc.repo_id)
		FROM repo_claims rc
		WHERE rc.state = 'verified'
		  AND rc.owner_user_id = ?
		  AND (LOWER(rc.full_name) LIKE ? OR LOWER(rc.repo_id) LIKE ?)
	`, userID, orgPrefixPattern(org), orgPrefixPattern(org))
	return err == nil && n > 0
}

// IsOrgProActive implements AC5 lifecycle enforcement: the 'Verified Welcoming
// Org' badge and paid console view require an ACTIVE pro entitlement held by a
// verified claimant of one of the org's repos, checked on EVERY call against
// the same user_entitlements state written by the Dodo checkout webhook.
// Lapsed subscriptions therefore downgrade renders within cache TTL max.
func (s *Service) IsOrgProActive(ctx context.Context, org string) bool {
	rows := []struct {
		UserID    int64      `db:"owner_user_id"`
		IsPro     bool       `db:"is_pro"`
		ExpiresAt *time.Time `db:"subscription_expires_at"`
	}{}
	err := s.db.SelectContext(ctx, &rows, `
		SELECT rc.owner_user_id, COALESCE(ue.is_pro, FALSE) AS is_pro, ue.subscription_expires_at
		FROM repo_claims rc
		LEFT JOIN user_entitlements ue ON ue.user_id = rc.owner_user_id
		WHERE rc.state = 'verified'
		  AND (LOWER(rc.full_name) LIKE ? OR LOWER(rc.repo_id) LIKE ?)
		GROUP BY rc.owner_user_id, COALESCE(ue.is_pro, FALSE), ue.subscription_expires_at
	`, orgPrefixPattern(org), orgPrefixPattern(org))
	if err != nil {
		return false // fail-closed (lapsed/unknown = badge 404s, free console)
	}
	now := time.Now().UTC()
	for _, r := range rows {
		if !r.IsPro {
			continue
		}
		if r.ExpiresAt == nil || r.ExpiresAt.After(now) {
			return true
		}
	}
	return false
}

func orgPrefixPattern(org string) string {
	return strings.ToLower(strings.TrimSpace(org)) + "/%"
}

// GetOrgConsole builds the org-wide console payload (AC1-AC6): one-shot
// aggregate + peer percentiles from cache-backed queries, entitlement and
// access evaluated fresh per request (AC5).
func (s *Service) GetOrgConsole(ctx context.Context, org string, requestingUserID int64) (*OrgConsolePayload, error) {
	org = strings.TrimSpace(org)
	if org == "" {
		return nil, errors.New("400: org required")
	}
	if !s.HasOrgConsoleAccess(ctx, org, requestingUserID) {
		return nil, errors.New("403: verified maintainer claim required on at least one repo owned by this org")
	}

	entry, err := s.loadOrgAggregates(ctx, org)
	if err != nil {
		return nil, err
	}

	payload := &OrgConsolePayload{
		Org:       org,
		RepoCount: entry.self.RepoCount,
		Entitled:  s.IsOrgProActive(ctx, org),
	}

	if !entry.self.hasData() {
		// Zero usable scored repos -> explicit No-data state (AC4);
		// zero-repo org additionally exposes RepoCount==0 for the claim CTA.
		return payload, nil
	}

	score := entry.self.score()
	payload.HasData = true
	payload.ScoredRepoCount = entry.self.ScoredCount
	payload.CRankScore = score
	payload.CRankTier = tierForScore(score)
	payload.ResponseP50Hours = nullVal(entry.self.AvgP50)
	payload.ResponseP90Hours = nullVal(entry.self.AvgP90)
	payload.FirstTimerSuccessRate = nullVal(entry.self.AvgFirst)
	payload.BusFactor = entry.self.BusFactor

	// Paid tier: anonymous peer benchmarks only when the cohort is big enough
	// (AC3) AND entitlement is currently active (AC5 free-view downgrade).
	if payload.Entitled && len(entry.peers) >= peerCohortMin {
		payload.PeerBenchmarks = &OrgPeerBenchmarks{
			CohortSize:            len(entry.peers),
			ScorePercentile:       round1(percentileBetterThan(entry.peers, score, false)),
			ResponseP50Percentile: round1(percentileBetterThan(entry.p50s, payload.ResponseP50Hours, true)),
			ResponseP90Percentile: round1(percentileBetterThan(entry.p90s, payload.ResponseP90Hours, true)),
			FirstTimerPercentile:  round1(percentileBetterThan(entry.firsts, payload.FirstTimerSuccessRate, false)),
			BusFactorPercentile:   round1(percentileIntBeaten(entry.bus, payload.BusFactor)),
		}
	}
	return payload, nil
}

func round1(v float64) float64 { return float64(int(v*10+0.5)) / 10 }

// tierForScore mirrors scoring.scoreTier thresholds for aggregate grades.
func tierForScore(score float64) string {
	switch {
	case score >= 70:
		return scoring.TierS
	case score >= 55:
		return scoring.TierA
	case score >= 40:
		return scoring.TierB
	case score >= 25:
		return scoring.TierC
	default:
		return scoring.TierD
	}
}
