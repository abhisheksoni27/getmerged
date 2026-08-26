package prsim

import "time"

// Weights are the fixed heuristic weights for the acceptance score (AC1).
// They sum to 100 and are rendered verbatim in the UI tooltip.
type Weights struct {
	Title             int `json:"title"`
	DiffSize          int `json:"diff_size"`
	TestsTouched      int `json:"tests_touched"`
	DescriptionLength int `json:"description_length"`
	ContributingMatch int `json:"contributing_match"`
}

// DefaultWeights hardcode the approved scoring weights (AC1): title quality
// 30, diff size 25, tests touched 20, description length 15, CONTRIBUTING.md
// pattern match 10. This is the single source of truth surfaced in tooltips.
var DefaultWeights = Weights{
	Title:             30,
	DiffSize:          25,
	TestsTouched:      20,
	DescriptionLength: 15,
	ContributingMatch: 10,
}

const (
	// MaxDiffBytes caps pasted diffs (AC1: ≤1MB); larger bodies are
	// rejected 400 error_code=diff_too_large.
	MaxDiffBytes = 1024 * 1024
	// RepoCacheTTL is the per-repo stats cache lifetime (AC3): one GitHub
	// metadata fetch per repo per day regardless of diff uniqueness.
	RepoCacheTTL = 24 * time.Hour
	// RepoCacheSize bounds the in-process LRU holding per-repo stats.
	RepoCacheSize = 4096
	// SmallDiffLines earns full diff-size points (AC1: <400 changed lines).
	SmallDiffLines = 400
	// LargeDiffLines zeroes diff-size points beyond this line count.
	LargeDiffLines = 1000
	// MedianPRs is the number of recent merged PRs sampled (AC2, N=30).
	MedianPRs = 30
	// MinSamples below which the turnaround estimate reports
	// "insufficient history" instead of a number (AC2).
	MinSamples = 10
	// TurnaroundTTL caches per-repo medians in Valkey (AC2, TTL 6h).
	TurnaroundTTL = 6 * time.Hour
	// Retention keeps encrypted diffs for 24h before deletion (AC5).
	Retention = 24 * time.Hour
	// DedupWait is how long concurrent duplicate submissions await the
	// first computed result before computing independently (AC8).
	DedupWait = 5 * time.Second
	// DedupLockTTL bounds the SETNX payload-hash lock (AC8).
	DedupLockTTL = 5 * time.Minute
	// ContributingFetchTimeout bounds the CONTRIBUTING.md fetch.
	ContributingFetchTimeout = 5 * time.Second
	// TurnaroundFetchTimeout bounds the merged-PR list fetch (AC2).
	TurnaroundFetchTimeout = 10 * time.Second
)
