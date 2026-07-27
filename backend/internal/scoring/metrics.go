// Package scoring provides pure functions for computing C-Rank scores.
// No I/O, no side effects — all functions are deterministic and testable in isolation.
package scoring

import (
	"sort"
	"strings"
	"time"
)

// ExternalAssociations are author associations considered external contributors.
// COLLABORATOR, MEMBER, and OWNER are repo insiders — excluded.
var ExternalAssociations = map[string]bool{
	"CONTRIBUTOR":           true,
	"FIRST_TIME_CONTRIBUTOR": true,
	"NONE":                  true,
}

// isBot checks if a login belongs to an automated bot account.
func isBot(login string) bool {
	l := strings.ToLower(login)
	return strings.HasSuffix(l, "[bot]") ||
		l == "vercel" ||
		l == "github-actions" ||
		l == "codecov" ||
		l == "dependabot" ||
		l == "stale" ||
		l == "sentry-io"
}

// FirstTimerAssociation marks a contributor's first PR to this repo.
const FirstTimerAssociation = "FIRST_TIME_CONTRIBUTOR"

// PR represents a single pull request for metric computation.
type PR struct {
	State             string     // CLOSED | MERGED
	CreatedAt         time.Time
	MergedAt          *time.Time
	AuthorAssociation string
	AuthorLogin       string
	FirstCommentAt    *time.Time // first human comment timestamp (may be nil)
	TotalComments     int
	CommentAuthors    []string
}

// Issue represents a single issue for triage speed computation.
type Issue struct {
	CreatedAt      time.Time
	FirstCommentAt *time.Time
}

// RawMetrics holds the unscaled metric values for a repository snapshot.
type RawMetrics struct {
	ExternalPRMergeRate       float64 // percentage 0–100
	TimeToFirstResponseHours  float64 // median hours; 0 = no data
	TimeToMergeHours          float64 // median hours; 0 = no data
	FirstTimerSuccessRate     float64 // percentage 0–100
	RepeatContributorRate     float64 // percentage 0–100
	IssueTriageSpeedHours     float64 // median hours; 0 = no data
	MaintainerResponsiveness  float64 // derived: same as TimeToFirstResponseHours (lower = better)
	LastActivityDays          float64 // days since last merged PR (lower = better)
	ReviewRounds              float64 // median review comments per merged PR (lower = better)
	DistinctMaintainerCount   float64 // number of distinct maintainers commenting on PRs (higher = better)
	TotalContributors         float64 // number of distinct external authors submitting PRs (higher = better)
	StalenessFlag             bool
}

// ComputeMetrics derives all raw metrics from a slice of PRs and Issues.
// Only PRs within the last 180 days are considered.
// staleness is true if no external PR was merged in the last 6 months.
func ComputeMetrics(prs []PR, issues []Issue, staleness bool) RawMetrics {
	window180 := time.Now().UTC().Add(-180 * 24 * time.Hour)

	var (
		externalClosed    int
		externalMerged    int
		firstTimers       = map[string]bool{}  // login → ever merged
		firstTimersSeen   = map[string]bool{}
		allContributors   = map[string]int{}   // login → PR count
		responseTimes     []float64
		mergeTimes        []float64
		issueTriageTimes  []float64
	)

	for _, pr := range prs {
		if pr.CreatedAt.Before(window180) {
			continue
		}
		if !ExternalAssociations[pr.AuthorAssociation] {
			continue
		}

		// Merge rate
		externalClosed++
		if pr.State == "MERGED" {
			externalMerged++
		}

		// First-timer tracking: check FIRST_TIME_CONTRIBUTOR association OR single-PR author
		if pr.AuthorAssociation == FirstTimerAssociation || pr.AuthorAssociation == "FIRST_TIMER" || allContributors[pr.AuthorLogin] == 1 {
			firstTimersSeen[pr.AuthorLogin] = true
			if pr.State == "MERGED" {
				firstTimers[pr.AuthorLogin] = true
			}
		}

		// Repeat contributor tracking
		allContributors[pr.AuthorLogin]++

		// Time to first response (hours)
		if pr.FirstCommentAt != nil {
			hours := pr.FirstCommentAt.Sub(pr.CreatedAt).Hours()
			if hours >= 0 {
				responseTimes = append(responseTimes, hours)
			}
		}

		// Time to merge (hours)
		if pr.State == "MERGED" && pr.MergedAt != nil {
			hours := pr.MergedAt.Sub(pr.CreatedAt).Hours()
			if hours >= 0 {
				mergeTimes = append(mergeTimes, hours)
			}
		}
	}

	// Calculate ReviewRounds (median comments per merged external PR) and DistinctMaintainerCount
	var reviewCounts []float64
	maintainerSet := map[string]bool{}

	for _, pr := range prs {
		if pr.CreatedAt.Before(window180) || !ExternalAssociations[pr.AuthorAssociation] {
			continue
		}
		if pr.State == "MERGED" {
			reviewCounts = append(reviewCounts, float64(pr.TotalComments))
		}
		for _, author := range pr.CommentAuthors {
			if author != pr.AuthorLogin && author != "" && !isBot(author) {
				maintainerSet[author] = true
			}
		}
	}

	// Calculate LastActivityDays from the most recent merged external PR
	var lastActivityDays float64 = 999
	for _, pr := range prs {
		if pr.State == "MERGED" && pr.MergedAt != nil {
			days := time.Since(*pr.MergedAt).Hours() / 24
			if days >= 0 && days < lastActivityDays {
				lastActivityDays = days
			}
		}
	}
	if lastActivityDays == 999 {
		lastActivityDays = 180 // Default to 180 days if no merged PRs in window
	}
	for _, issue := range issues {
		if issue.CreatedAt.Before(window180) {
			continue
		}
		if issue.FirstCommentAt != nil {
			hours := issue.FirstCommentAt.Sub(issue.CreatedAt).Hours()
			if hours >= 0 {
				issueTriageTimes = append(issueTriageTimes, hours)
			}
		}
	}

	m := RawMetrics{
		StalenessFlag:           staleness,
		LastActivityDays:        lastActivityDays,
		ReviewRounds:            median(reviewCounts),
		DistinctMaintainerCount: float64(len(maintainerSet)),
		TotalContributors:       float64(len(allContributors)),
	}

	if externalClosed > 0 {
		m.ExternalPRMergeRate = float64(externalMerged) / float64(externalClosed) * 100
	}

	if len(firstTimersSeen) > 0 {
		m.FirstTimerSuccessRate = float64(len(firstTimers)) / float64(len(firstTimersSeen)) * 100
	}

	repeats := 0
	for _, count := range allContributors {
		if count > 1 {
			repeats++
		}
	}
	if len(allContributors) > 0 {
		m.RepeatContributorRate = float64(repeats) / float64(len(allContributors)) * 100
	}

	m.TimeToFirstResponseHours = median(responseTimes)
	m.TimeToMergeHours = median(mergeTimes)
	m.IssueTriageSpeedHours = median(issueTriageTimes)
	// Maintainer responsiveness mirrors response time (lower hours = more responsive)
	m.MaintainerResponsiveness = m.TimeToFirstResponseHours

	return m
}

// median returns the median value of a float64 slice.
// Returns 0 for an empty slice.
func median(vals []float64) float64 {
	if len(vals) == 0 {
		return 0
	}
	sorted := make([]float64, len(vals))
	copy(sorted, vals)
	sort.Float64s(sorted)
	n := len(sorted)
	if n%2 == 0 {
		return (sorted[n/2-1] + sorted[n/2]) / 2
	}
	return sorted[n/2]
}
