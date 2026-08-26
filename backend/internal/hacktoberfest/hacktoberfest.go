package hacktoberfest

import (
	"strings"
	"time"
)

// EventYear is the Hacktoberfest edition being tracked (October, UTC).
func EventYear(now time.Time) int { return now.UTC().Year() }

// EventWindow returns the [start, end) UTC window (Oct 1 - Nov 1) for the
// event year (AC1: merged Oct 1-31 UTC).
func EventWindow(year int) (time.Time, time.Time) {
	start := time.Date(year, time.October, 1, 0, 0, 0, 0, time.UTC)
	return start, start.AddDate(0, 1, 0)
}

// invalidLabels disqualify a merge from counting (AC1).
var invalidLabels = map[string]bool{"invalid": true, "spam": true}

// MergeCandidate is one GitHub-search PR row evaluated by the predicate.
type MergeCandidate struct {
	PRID         string // "owner/repo#number"
	RepoFullName string
	Number       int
	Title        string
	HTMLURL      string
	AuthorLogin  string
	MergedAt     time.Time
	Draft        bool
	Labels       []string
}

// IsQualifyingMerge is the single shared predicate (AC1): PR to a public repo,
// merged inside the October UTC window, authored by the linked user, no
// invalid/spam labels, not draft. The counter, completion card and any future
// leaderboard rollup must all go through it.
//
// Public-repo note: GitHub's search API only indexes public repositories, so
// presence of repository metadata in search results implies public.
func IsQualifyingMerge(c MergeCandidate, linkedLogin string, year int) bool {
	if c.PRID == "" || c.RepoFullName == "" || c.Number <= 0 {
		return false
	}
	if c.MergedAt.IsZero() {
		return false
	}
	if year <= 0 {
		year = EventYear(time.Now())
	}
	start, end := EventWindow(year)
	if c.MergedAt.Before(start) || !c.MergedAt.Before(end) {
		return false
	}
	if c.Draft {
		return false
	}
	if !strings.EqualFold(strings.TrimSpace(c.AuthorLogin), strings.TrimSpace(linkedLogin)) {
		return false
	}
	for _, l := range c.Labels {
		if invalidLabels[strings.ToLower(strings.TrimSpace(l))] {
			return false
		}
	}
	return true
}

// TargetMergeCount is the Hacktoberfest challenge size; the counter caps here
// while extra qualifying IDs stay persisted (AC8).
const TargetMergeCount = 4
