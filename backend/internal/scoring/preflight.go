package scoring

import (
	"regexp"
	"strings"
)

type PreflightInput struct {
	RepoFullName   string   `json:"repo_full_name"`
	PRTitle        string   `json:"pr_title"`
	PRDescription  string   `json:"pr_description"`
	ChangedFiles   []string `json:"changed_files"`
	Additions      int      `json:"additions"`
	Deletions      int      `json:"deletions"`
	LinkedIssueURL string   `json:"linked_issue_url,omitempty"`
	PRURL          string   `json:"pr_url,omitempty"`
}

type PreflightCheckItem struct {
	Key         string `json:"key"`
	Title       string `json:"title"`
	Passed      bool   `json:"passed"`
	Description string `json:"description"`
	Severity    string `json:"severity"` // "error" | "warning" | "info"
	Suggestion  string `json:"suggestion"`
	Fixes       []Fix  `json:"fixes,omitempty"` // >=1 concrete repair per failed/warn check
}

type PreflightEvaluationResult struct {
	OverallScore float64              `json:"overall_score"` // 0 - 100
	ReadyToMerge bool                 `json:"ready_to_merge"`
	Summary      string               `json:"summary"`
	Checks       []PreflightCheckItem `json:"checks"`
}

var conventionalCommitRegex = regexp.MustCompile(`^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)(\([a-zA-Z0-9_\-\./]+\))?:\s+.+$`)

// EvaluatePreflight performs fast, deterministic heuristic validation of a proposed PR.
func EvaluatePreflight(input PreflightInput) PreflightEvaluationResult {
	checks := make([]PreflightCheckItem, 0, 5)
	var passedCount int
	totalWeight := 0
	earnedWeight := 0

	// Check 1: Conventional Title Format (Weight: 20)
	totalWeight += 20
	titleTrimmed := strings.TrimSpace(input.PRTitle)
	isConventional := conventionalCommitRegex.MatchString(titleTrimmed)
	if isConventional {
		earnedWeight += 20
		passedCount++
		checks = append(checks, PreflightCheckItem{
			Key:         "conventional_title",
			Title:       "Conventional Commit Title",
			Passed:      true,
			Severity:    "info",
			Description: "PR title adheres to standard Conventional Commits convention.",
			Suggestion:  "Looks great! Maintainers can cleanly generate release changelogs.",
		})
	} else {
		checks = append(checks, PreflightCheckItem{
			Key:         "conventional_title",
			Title:       "Conventional Commit Title",
			Passed:      false,
			Severity:    "warning",
			Description: "PR title does not follow conventional prefix pattern (e.g., 'feat:', 'fix:').",
			Suggestion:  "Prefix your PR title with 'fix:', 'feat:', 'docs:', or 'chore:' so maintainers can parse it.",
		})
	}

	// Check 2: Test File Coverage (Weight: 25)
	totalWeight += 25
	hasTestFile := false
	for _, f := range input.ChangedFiles {
		lf := strings.ToLower(f)
		if strings.Contains(lf, "_test.") || strings.Contains(lf, ".test.") || strings.Contains(lf, ".spec.") ||
			strings.Contains(lf, "test_") || strings.HasPrefix(lf, "test/") || strings.HasPrefix(lf, "tests/") ||
			strings.HasPrefix(lf, "__tests__/") {
			hasTestFile = true
			break
		}
	}
	if hasTestFile {
		earnedWeight += 25
		passedCount++
		checks = append(checks, PreflightCheckItem{
			Key:         "test_coverage",
			Title:       "Unit/Regression Tests Included",
			Passed:      true,
			Severity:    "info",
			Description: "PR includes automated test files alongside code changes.",
			Suggestion:  "Great work including tests to prove regression prevention.",
		})
	} else {
		checks = append(checks, PreflightCheckItem{
			Key:         "test_coverage",
			Title:       "Unit/Regression Tests Included",
			Passed:      false,
			Severity:    "error",
			Description: "No test files were detected in this changeset.",
			Suggestion:  "Most top-tier repos require passing unit tests. Add or update a *_test file.",
		})
	}

	// Check 3: PR Scope & Delta Size (Weight: 25)
	totalWeight += 25
	totalDelta := input.Additions + input.Deletions
	if totalDelta <= 350 {
		earnedWeight += 25
		passedCount++
		checks = append(checks, PreflightCheckItem{
			Key:         "pr_size",
			Title:       "Surgical & Focused PR Scope",
			Passed:      true,
			Severity:    "info",
			Description: "Changeset size is compact and easily reviewable (< 350 lines modified).",
			Suggestion:  "Maintainers merge small PRs up to 3.8x faster than large multi-file diffs.",
		})
	} else if totalDelta <= 800 {
		earnedWeight += 15
		passedCount++
		checks = append(checks, PreflightCheckItem{
			Key:         "pr_size",
			Title:       "Surgical & Focused PR Scope",
			Passed:      true,
			Severity:    "warning",
			Description: "Changeset size is moderate (350-800 lines).",
			Suggestion:  "Consider splitting into two logical PRs if review latency becomes an issue.",
		})
	} else {
		checks = append(checks, PreflightCheckItem{
			Key:         "pr_size",
			Title:       "Surgical & Focused PR Scope",
			Passed:      false,
			Severity:    "warning",
			Description: "PR is very large (> 800 lines modified). Higher risk of review abandonment.",
			Suggestion:  "Split refactoring and new logic into separate stacked pull requests.",
		})
	}

	// Check 4: PR Description Quality (Weight: 15)
	totalWeight += 15
	descLen := len(strings.TrimSpace(input.PRDescription))
	if descLen >= 40 {
		earnedWeight += 15
		passedCount++
		checks = append(checks, PreflightCheckItem{
			Key:         "description_depth",
			Title:       "Context & Description Clarity",
			Passed:      true,
			Severity:    "info",
			Description: "Description provides adequate context explaining 'why' this change exists.",
			Suggestion:  "Clear context significantly reduces maintainer back-and-forth.",
		})
	} else {
		checks = append(checks, PreflightCheckItem{
			Key:         "description_depth",
			Title:       "Context & Description Clarity",
			Passed:      false,
			Severity:    "warning",
			Description: "PR description is sparse or empty (< 40 characters).",
			Suggestion:  "Add a summary of the problem solved and test steps followed.",
		})
	}

	// Check 5: Issue Linkage (Weight: 15)
	totalWeight += 15
	hasIssueLink := strings.TrimSpace(input.LinkedIssueURL) != "" ||
		strings.Contains(strings.ToLower(input.PRDescription), "fixes #") ||
		strings.Contains(strings.ToLower(input.PRDescription), "closes #") ||
		strings.Contains(strings.ToLower(input.PRDescription), "resolves #")
	if hasIssueLink {
		earnedWeight += 15
		passedCount++
		checks = append(checks, PreflightCheckItem{
			Key:         "issue_linkage",
			Title:       "Linked Upstream Issue",
			Passed:      true,
			Severity:    "info",
			Description: "PR references a tracked issue or bug report.",
			Suggestion:  "Issue linkage confirms your work was pre-approved by repo maintainers.",
		})
	} else {
		checks = append(checks, PreflightCheckItem{
			Key:         "issue_linkage",
			Title:       "Linked Upstream Issue",
			Passed:      false,
			Severity:    "info",
			Description: "No issue reference detected in description (e.g., 'Fixes #123').",
			Suggestion:  "Link an issue if available so maintainers understand the original bug discussion.",
		})
	}

	score := float64(earnedWeight)
	ready := score >= 70 && hasTestFile

	summary := "Your PR is in great shape and well-prepared for rapid maintainer review!"
	if !ready {
		summary = "A few pre-flight adjustments recommended to maximize your acceptance odds before submitting."
	}

	// Attach >=1 concrete, one-click fix to every failed/warn check so the
	// evaluation doubles as a repair kit (AC1). Passing checks need none.
	for i := range checks {
		if !checks[i].Passed {
			checks[i].Fixes = FixForCheck(checks[i], input)
		}
	}

	return PreflightEvaluationResult{
		OverallScore: score,
		ReadyToMerge: ready,
		Summary:      summary,
		Checks:       checks,
	}
}
