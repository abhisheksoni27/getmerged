package audit

import (
	"encoding/json"
	"fmt"
	"os/exec"
	"regexp"
	"strings"
)

var reAuditKey = regexp.MustCompile(`\[audit-key=([^\]]+)\]`)

// IssueDeduplicator tracks existing GitHub issues (both open and closed) to prevent duplicates.
type IssueDeduplicator struct {
	knownAuditKeys map[string]int // auditKey -> issueNumber
}

// NewIssueDeduplicator builds an index of audit keys from GitHub issues.
func NewIssueDeduplicator(issues []GitHubIssue) *IssueDeduplicator {
	d := &IssueDeduplicator{
		knownAuditKeys: make(map[string]int),
	}
	for _, issue := range issues {
		d.indexIssue(issue)
	}
	return d
}

func (d *IssueDeduplicator) indexIssue(issue GitHubIssue) {
	// 1. Search for [audit-key=...] in Title
	titleMatches := reAuditKey.FindAllStringSubmatch(issue.Title, -1)
	for _, m := range titleMatches {
		if len(m) > 1 {
			k := strings.TrimSpace(m[1])
			d.knownAuditKeys[k] = issue.Number
		}
	}

	// 2. Search for [audit-key=...] in Body
	bodyMatches := reAuditKey.FindAllStringSubmatch(issue.Body, -1)
	for _, m := range bodyMatches {
		if len(m) > 1 {
			k := strings.TrimSpace(m[1])
			d.knownAuditKeys[k] = issue.Number
		}
	}
}

// IsDuplicate returns true if an issue with the given audit key is already filed (open or closed).
func (d *IssueDeduplicator) IsDuplicate(auditKey string) bool {
	cleanKey := strings.TrimSpace(auditKey)
	_, exists := d.knownAuditKeys[cleanKey]
	return exists
}

// GetIssueNumber returns the existing issue number for an audit key, if indexed.
func (d *IssueDeduplicator) GetIssueNumber(auditKey string) (int, bool) {
	cleanKey := strings.TrimSpace(auditKey)
	num, exists := d.knownAuditKeys[cleanKey]
	return num, exists
}

// FormatAuditKey wraps a canonical key in standard audit-key tag format.
func FormatAuditKey(key string) string {
	return fmt.Sprintf("[audit-key=%s]", strings.TrimSpace(key))
}

// ShouldCreateIssues reports whether GitHub issue filing is enabled.
// Filing is strictly gated: it requires BOTH the explicit --create-issues
// opt-in AND dry-run mode disabled. Default runs never create issues.
func ShouldCreateIssues(createIssues, dryRun bool) bool {
	return createIssues && !dryRun
}

// FetchGitHubIssues retrieves both open and closed issues from GitHub via gh CLI.
func FetchGitHubIssues(repoRoot string) ([]GitHubIssue, error) {
	cmd := exec.Command("gh", "issue", "list", "--state", "all", "--limit", "1000", "--json", "number,title,body,state")
	if repoRoot != "" {
		cmd.Dir = repoRoot
	}

	out, err := cmd.Output()
	if err != nil {
		return nil, fmt.Errorf("gh issue list failed: %w", err)
	}

	var issues []GitHubIssue
	if err := json.Unmarshal(out, &issues); err != nil {
		return nil, fmt.Errorf("failed to unmarshal gh issue list output: %w", err)
	}

	return issues, nil
}
