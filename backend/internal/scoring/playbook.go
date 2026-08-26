package scoring

import (
	"fmt"
)

// S-tier reference thresholds used to quantify improvement gaps in the
// maintainer "Raise Your C-Rank" playbook.
const (
	// STierFirstReviewHours is the S-tier median time to first review ceiling.
	STierFirstReviewHours = 24.0
	// STierTriageHours is the S-tier issue/PR triage velocity ceiling.
	STierTriageHours = 72.0
	// STierMinReviewers is the S-tier reviewer-breadth floor (distinct maintainers).
	STierMinReviewers = 3.0
	// STierScoreFloor is the score at or above which a repo is S-tier eligible.
	STierScoreFloor = 70.0
)

// Gap statuses for RankGapItem.Status.
const (
	GapStatusInsufficient = "insufficient_data"
	GapStatusOpen         = "gap"
	GapStatusOK           = "ok"
)

// Rescore outcomes returned by CompareRescoreOutcome.
const (
	OutcomeImproved  = "improved"
	OutcomeNoChange  = "no_change"
	OutcomeRegressed = "regressed"
)

// PlaybookTelemetry carries the scored telemetry a gap row is computed from.
// Pointer fields distinguish "metric unavailable" (nil) from a real zero so
// partially-scored repos degrade into 'insufficient data' rows instead of
// crashing or rendering misleading medians.
type PlaybookTelemetry struct {
	// ResponseP50Hours is the median time to first review; nil when unscored.
	ResponseP50Hours *float64
	// ReviewsObservedCount counts PRs that received a first review; nil unknown,
	// zero means no reviews yet (no median math possible).
	ReviewsObservedCount *int
	// DistinctReviewers is reviewer breadth (distinct maintainers); nil unknown.
	DistinctReviewers *float64
	// BusFactor is the compacted reviewer breadth fallback; nil unknown.
	BusFactor *int
	// TriageHours is issue/PR triage velocity p50; nil when unscored.
	TriageHours *float64
	// IssuesCreated6m: nil unknown; zero skips the triage gap entirely.
	IssuesCreated6m *int
	// GoodFirstIssueCount: nil unknown.
	GoodFirstIssueCount *int
}

// RankGapItem is one prioritized playbook row: a quantified gap, an
// insufficient-data placeholder, or an already-met metric.
type RankGapItem struct {
	ID          string  `json:"id"`
	Title       string  `json:"title"`
	Status      string  `json:"status"`
	Gap         string  `json:"gap"`
	ImpactPts   float64 `json:"impact_pts"`
	FixGuidance string  `json:"fix_guidance"`
}

// GenerateRankGapChecklist computes the four core improvement gaps (first-review
// latency vs S-tier, reviewer breadth, triage velocity, good-first-issue labels)
// with explicit null/empty rules:
//   - no reviews observed => 'No reviews yet — add reviewers' instead of median math
//   - zero issues created => the triage gap row is skipped entirely
//   - any unavailable metric => an 'insufficient data' row, never a crash
func GenerateRankGapChecklist(t PlaybookTelemetry) []RankGapItem {
	items := make([]RankGapItem, 0, 4)

	// 1. First-review latency vs S-tier threshold.
	switch {
	case t.ReviewsObservedCount != nil && *t.ReviewsObservedCount == 0:
		items = append(items, RankGapItem{
			ID:          "first_review_time",
			Title:       "Median first review vs S-tier",
			Status:      GapStatusOpen,
			Gap:         "No reviews yet — add reviewers",
			ImpactPts:   8,
			FixGuidance: "Enable review requests and assign at least one reviewer to every new PR.",
		})
	case t.ResponseP50Hours == nil:
		items = append(items, RankGapItem{
			ID:          "first_review_time",
			Title:       "Median first review vs S-tier",
			Status:      GapStatusInsufficient,
			Gap:         "Not enough data — skipped (no scored PR review telemetry yet)",
			ImpactPts:   8,
			FixGuidance: "Merge or review external PRs so telemetry can compute your median.",
		})
	default:
		p50 := *t.ResponseP50Hours
		if p50 > STierFirstReviewHours {
			items = append(items, RankGapItem{
				ID:          "first_review_time",
				Title:       "Median first review vs S-tier",
				Status:      GapStatusOpen,
				Gap:         formatHourGap(p50, STierFirstReviewHours),
				ImpactPts:   8,
				FixGuidance: "Set up notification triage so new PRs get a first review within 24h.",
			})
		} else {
			items = append(items, firstReviewOKRow(p50))
		}
	}

	// 2. Reviewer breadth.
	var breadth *float64
	if t.DistinctReviewers != nil {
		b := *t.DistinctReviewers
		breadth = &b
	} else if t.BusFactor != nil {
		b := float64(*t.BusFactor)
		breadth = &b
	}
	if breadth == nil {
		items = append(items, RankGapItem{
			ID:          "reviewer_breadth",
			Title:       "Reviewer breadth",
			Status:      GapStatusInsufficient,
			Gap:         "Not enough data — skipped (reviewer counts unavailable)",
			ImpactPts:   4,
			FixGuidance: "Have maintainers comment on PRs so reviewer breadth can be measured.",
		})
	} else if *breadth < STierMinReviewers {
		items = append(items, RankGapItem{
			ID:          "reviewer_breadth",
			Title:       "Reviewer breadth",
			Status:      GapStatusOpen,
			Gap:         formatBreadthGap(*breadth, STierMinReviewers),
			ImpactPts:   4,
			FixGuidance: "Add co-maintainers or CODEOWNERS so reviews never bottleneck on one person.",
		})
	} else {
		items = append(items, RankGapItem{
			ID:        "reviewer_breadth",
			Title:     "Reviewer breadth",
			Status:    GapStatusOK,
			Gap:       formatBreadthOK(*breadth, STierMinReviewers),
			ImpactPts: 4,
		})
	}

	// 3. Issue-triage velocity. Zero issues => skip the triage gap entirely.
	if t.IssuesCreated6m != nil && *t.IssuesCreated6m == 0 {
		// No triage surface to improve; intentionally no row.
	} else if t.TriageHours == nil {
		items = append(items, RankGapItem{
			ID:          "triage_velocity",
			Title:       "Issue triage velocity",
			Status:      GapStatusInsufficient,
			Gap:         "Not enough data — skipped (triage latency unavailable)",
			ImpactPts:   6,
			FixGuidance: "Triage incoming issues and PRs so velocity can be measured.",
		})
	} else if *t.TriageHours > STierTriageHours {
		items = append(items, RankGapItem{
			ID:          "triage_velocity",
			Title:       "Issue triage velocity",
			Status:      GapStatusOpen,
			Gap:         formatHourGap(*t.TriageHours, STierTriageHours),
			ImpactPts:   6,
			FixGuidance: "Adopt a triage rotation or automation to label/respond within 72h.",
		})
	} else {
		items = append(items, RankGapItem{
			ID:        "triage_velocity",
			Title:     "Issue triage velocity",
			Status:    GapStatusOK,
			Gap:       formatHourOK(*t.TriageHours, STierTriageHours),
			ImpactPts: 6,
		})
	}

	// 4. Missing good-first-issue labels (% of open issues missing the label).
	if t.GoodFirstIssueCount == nil {
		items = append(items, RankGapItem{
			ID:          "good_first_issues",
			Title:       "Good first issue labels",
			Status:      GapStatusInsufficient,
			Gap:         "Not enough data — skipped (label scan unavailable)",
			ImpactPts:   5,
			FixGuidance: "Keep the 'good first issue' label active on open issues so scans find them.",
		})
	} else if *t.GoodFirstIssueCount <= 0 {
		items = append(items, RankGapItem{
			ID:          "good_first_issues",
			Title:       "Good first issue labels",
			Status:      GapStatusOpen,
			Gap:         formatGfiGap(*t.GoodFirstIssueCount, t.IssuesCreated6m),
			ImpactPts:   5,
			FixGuidance: "Label small well-scoped tasks with 'good first issue' to attract newcomers.",
		})
	} else {
		items = append(items, RankGapItem{
			ID:        "good_first_issues",
			Title:     "Good first issue labels",
			Status:    GapStatusOK,
			Gap:       formatGfiOK(*t.GoodFirstIssueCount),
			ImpactPts: 5,
		})
	}

	return items
}

func firstReviewOKRow(p50 float64) RankGapItem {
	return RankGapItem{
		ID:        "first_review_time",
		Title:     "Median first review vs S-tier",
		Status:    GapStatusOK,
		Gap:       formatHourOK(p50, STierFirstReviewHours),
		ImpactPts: 8,
	}
}

func formatHourGap(have, target float64) string {
	return fmt.Sprintf("median %.1fh vs S-tier <=%.0fh — trim %.1fh", have, target, have-target)
}

func formatHourOK(have, target float64) string {
	return fmt.Sprintf("median %.1fh meets S-tier <=%.0fh", have, target)
}

func formatBreadthGap(have, target float64) string {
	return fmt.Sprintf("%.0f distinct reviewers vs S-tier >=%.0f — add %.0f more", have, target, target-have)
}

func formatBreadthOK(have, target float64) string {
	return fmt.Sprintf("%.0f distinct reviewers meets S-tier >=%.0f", have, target)
}

func formatGfiOK(count int) string {
	return fmt.Sprintf("%d open good-first-issue labels", count)
}

// formatGfiGap quantifies the % of issues missing the good-first-issue label.
// Division-by-zero safe: the percentage only renders for a known positive
// issue total; otherwise the plain zero-label copy stands alone (AC2).
func formatGfiGap(gfiCount int, issuesTotal *int) string {
	if issuesTotal != nil && *issuesTotal > 0 && gfiCount < *issuesTotal {
		missing := 100.0 * float64(*issuesTotal-gfiCount) / float64(*issuesTotal)
		return fmt.Sprintf("0 open good-first-issue labels — %.0f%% of %d issues unlabeled", missing, *issuesTotal)
	}
	return "No open 'good first issue' labels found"
}

// CompareRescoreOutcome classifies a re-score against its before snapshot:
// improved only on a strict increase, regressed on a decrease, otherwise flat.
func CompareRescoreOutcome(beforeScore, afterScore float64) string {
	const epsilon = 0.0001
	switch {
	case afterScore-beforeScore > epsilon:
		return OutcomeImproved
	case beforeScore-afterScore > epsilon:
		return OutcomeRegressed
	default:
		return OutcomeNoChange
	}
}
