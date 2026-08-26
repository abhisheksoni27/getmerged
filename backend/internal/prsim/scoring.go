package prsim

import (
	"fmt"
	"sort"
	"strings"
)

// ScoreBreakdown lists points earned per heuristic (AC1). Each field is
// capped by the matching weight in DefaultWeights.
type ScoreBreakdown struct {
	Title             int `json:"title"`
	DiffSize          int `json:"diff_size"`
	TestsTouched      int `json:"tests_touched"`
	DescriptionLength int `json:"description_length"`
	ContributingMatch int `json:"contributing_match"`
}

// Turnaround is the predicted review turnaround for the target repo (AC2).
type Turnaround struct {
	MedianHours  float64 `json:"median_hours,omitempty"`
	Samples      int     `json:"samples"`
	Insufficient bool    `json:"insufficient_history,omitempty"`
}

// Result is the stored, badge-renderable outcome of one simulation.
type Result struct {
	Score       int            `json:"score"`
	Breakdown   ScoreBreakdown `json:"breakdown"`
	Suggestions []string       `json:"suggestions,omitempty"`
	Turnaround  *Turnaround    `json:"turnaround,omitempty"`
}

// ValidateDiff enforces AC3: max 512KB and unified-diff shape (must start
// with 'diff --git' or '@@' after leading whitespace).
func ValidateDiff(diff string) error {
	if len(diff) > MaxDiffBytes {
		return fmt.Errorf("diff exceeds %d KB limit", MaxDiffBytes/1024)
	}
	trimmed := strings.TrimLeft(diff, " \t\r\n")
	if !strings.HasPrefix(trimmed, "diff --git") && !strings.HasPrefix(trimmed, "@@") {
		return fmt.Errorf("diff must be in unified-diff format (expected 'diff --git' or '@@')")
	}
	return nil
}

// ChangedDiffLines counts +/- payload lines across hunks, excluding the
// +++/--- file headers.
func ChangedDiffLines(diff string) int {
	n := 0
	for _, line := range strings.Split(diff, "\n") {
		switch {
		case strings.HasPrefix(line, "+++"), strings.HasPrefix(line, "---"):
		case strings.HasPrefix(line, "+"), strings.HasPrefix(line, "-"):
			n++
		}
	}
	return n
}

var conventionalPrefixes = []string{
	"feat", "fix", "docs", "style", "refactor", "perf", "test", "chore", "build", "ci",
}

func hasConventionalPrefix(title string) bool {
	lower := strings.ToLower(title)
	parts := strings.SplitN(lower, ":", 2)
	if len(parts) != 2 {
		return false
	}
	head := parts[0]
	for _, p := range conventionalPrefixes {
		if head == p || strings.HasPrefix(head, p+"(") {
			return true
		}
	}
	return false
}

// scoreTitle grades title quality out of DefaultWeights.Title via five
// transparent sub-checks worth 6 points each; failed checks double as
// suggestions.
func scoreTitle(title string) (int, []string) {
	hints := []string{}
	pts := 0
	add := func(ok bool, points int, hint string) {
		if ok {
			pts += points
			return
		}
		hints = append(hints, hint)
	}
	t := strings.TrimSpace(title)
	lower := strings.ToLower(t)

	add(len(t) >= 10, 6, "Use a title of at least 10 characters so reviewers understand the change.")
	add(len(t) > 0 && len(t) <= 72, 6, "Shorten the title to 72 characters or fewer (git log / changelog friendly).")
	add(!strings.HasPrefix(lower, "wip") && !strings.HasPrefix(lower, "[wip") && !strings.HasPrefix(lower, "draft"), 6, "Remove WIP/draft markers from the title before requesting review.")
	add(!strings.HasSuffix(t, ".") && t != strings.ToUpper(t), 6, "Drop the trailing period and avoid ALL-CAPS titles.")
	add(hasConventionalPrefix(t), 6, `Start with a conventional prefix like "feat:" or "fix:".`)
	return pts, hints
}

// scoreDiffSize rewards diffs under SmallDiffLines (25 pts) and decays
// linearly to zero at LargeDiffLines.
func scoreDiffSize(changedLines int) (int, []string) {
	w := DefaultWeights.DiffSize
	switch {
	case changedLines <= 0:
		return 0, []string{"The diff contains no changed lines - paste a unified diff with actual edits to earn the size points."}
	case changedLines <= SmallDiffLines:
		return w, nil
	case changedLines >= LargeDiffLines:
		return 0, []string{fmt.Sprintf("The diff touches %d lines - split it into smaller stacked PRs (%d+ lines loses all %d size points).", changedLines, LargeDiffLines, w)}
	default:
		frac := float64(LargeDiffLines-changedLines) / float64(LargeDiffLines-SmallDiffLines)
		return int(float64(w) * frac), []string{"Split this large diff into smaller PRs to recover full size points."}
	}
}

var testPathMarkers = []string{
	"_test.go", "test_", ".test.", ".spec.", "/tests/", "/test/", "__tests__",
}

// testsTouched checks whether any added/updated file path looks like a test.
func testsTouched(diff string) bool {
	for _, line := range strings.Split(diff, "\n") {
		var path string
		switch {
		case strings.HasPrefix(line, "diff --git "):
			path = line
		case strings.HasPrefix(line, "+++ "):
			path = line
		default:
			continue
		}
		for _, m := range testPathMarkers {
			if strings.Contains(path, m) {
				return true
			}
		}
	}
	return false
}

// Score computes the weighted acceptance score (AC1) plus actionable
// suggestions. contributingPts comes from the repo's CONTRIBUTING.md check
// (0 when unavailable); pass contributingHints for extra guidance.
func Score(title, diff, description string, contributingPts int, contributingHints []string) *Result {
	titlePts, titleHints := scoreTitle(title)
	diffPts, diffHints := scoreDiffSize(ChangedDiffLines(diff))

	testPts := 0
	testHints := []string{"No test files appear in the diff - include or update tests to earn the full 20 test points."}
	if testsTouched(diff) {
		testPts = DefaultWeights.TestsTouched
		testHints = nil
	}

	descPts := 0
	descHints := []string{"Describe the change in more than 50 characters to earn the description points."}
	if len(strings.TrimSpace(description)) > 50 {
		descPts = DefaultWeights.DescriptionLength
		descHints = nil
	}

	bd := ScoreBreakdown{
		Title:             titlePts,
		DiffSize:          diffPts,
		TestsTouched:      testPts,
		DescriptionLength: descPts,
		ContributingMatch: clamp(contributingPts, 0, DefaultWeights.ContributingMatch),
	}
	res := &Result{
		Score:     bd.Title + bd.DiffSize + bd.TestsTouched + bd.DescriptionLength + bd.ContributingMatch,
		Breakdown: bd,
	}
	res.Suggestions = append(res.Suggestions, titleHints...)
	res.Suggestions = append(res.Suggestions, diffHints...)
	res.Suggestions = append(res.Suggestions, testHints...)
	res.Suggestions = append(res.Suggestions, descHints...)
	res.Suggestions = append(res.Suggestions, contributingHints...)
	return res
}

func clamp(v, lo, hi int) int {
	if v < lo {
		return lo
	}
	if v > hi {
		return hi
	}
	return v
}

// MedianHours returns the median of the sample slice in hours.
func MedianHours(durations []float64) float64 {
	sort.Float64s(durations)
	n := len(durations)
	if n == 0 {
		return 0
	}
	mid := durations[n/2]
	if n%2 == 0 {
		mid = (durations[n/2-1] + durations[n/2]) / 2
	}
	return mid
}
