package github

import (
	"regexp"
	"strings"
	"time"
)

// Regex patterns to detect claim / "can I take this" intent in issue comments.
var claimIntentPatterns = []*regexp.Regexp{
	regexp.MustCompile(`(?i)\b(?:can\s+i|may\s+i|could\s+i)\s+(?:take|work\s+on|handle|fix|solve|contribute|do)\b`),
	regexp.MustCompile(`(?i)\b(?:i(?:'d|\s+would)?\s+like\s+to|i\s+want\s+to)\s+(?:work\s+on|take|fix|solve|contribute|handle)\b`),
	regexp.MustCompile(`(?i)\b(?:assign\s+(?:this\s+to\s+)?me|please\s+assign)\b`),
	regexp.MustCompile(`(?i)\bi(?:'m|\s+am)\s+working\s+on\s+this\b`),
	regexp.MustCompile(`(?i)\bi\s+will\s+take\s+this\b`),
	regexp.MustCompile(`(?i)\bclaim(?:ing)?\s+this\b`),
}

// HasClaimIntent inspects comment text to determine if a contributor is attempting to claim the issue.
func HasClaimIntent(text string) bool {
	if text == "" {
		return false
	}
	trimmed := strings.TrimSpace(text)
	for _, pat := range claimIntentPatterns {
		if pat.MatchString(trimmed) {
			return true
		}
	}
	return false
}

// IssueCommentSummary represents basic info about an issue comment needed for verified-free checking.
type IssueCommentSummary struct {
	BodyText          string
	CreatedAt         time.Time
	AuthorAssociation string
}

// IssueVerifiedFreeInput represents the input data to evaluate whether a GFI is "Verified Free".
type IssueVerifiedFreeInput struct {
	HasLinkedPR    bool
	AssigneesCount int
	Comments       []IssueCommentSummary
}

// EvaluateVerifiedFree assesses whether an issue is truly unassigned and unclaimed.
// Returns (isVerifiedFree, reason).
// Heuristics:
// 1. Assignees total count must be 0.
// 2. No linked open PR.
// 3. No recent "can I work on this / assign me" comment within the last 7 days.
func EvaluateVerifiedFree(input IssueVerifiedFreeInput, now time.Time) (bool, string) {
	if input.AssigneesCount > 0 {
		return false, "Assigned to contributor"
	}

	if input.HasLinkedPR {
		return false, "Has active linked pull request"
	}

	claimCutoff := now.Add(-7 * 24 * time.Hour)
	for _, c := range input.Comments {
		if !c.CreatedAt.IsZero() && c.CreatedAt.After(claimCutoff) {
			if HasClaimIntent(c.BodyText) {
				return false, "Recently claimed in comments"
			}
		}
	}

	return true, "Unassigned, no linked PR, no recent claims"
}
