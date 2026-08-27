package scoring

import (
	"fmt"
	"net/url"
	"regexp"
	"strings"
)

// Fix is a concrete, one-click repair suggestion attached to a failed or
// warned preflight/prsim check. Every fix is safe to render: it carries a
// copyable Payload and, when applicable, a GitHub deep ApplyURL plus the
// ApplyMethod the UI should use to apply it.
type Fix struct {
	Type        string `json:"type"`         // issue_link | pr_title_body | conventional_commit | missing_tests
	Label       string `json:"label"`        // human readable action label
	Payload     string `json:"payload"`      // ready-to-paste text (clipboard target)
	ApplyURL    string `json:"apply_url,omitempty"` // GitHub deep link; empty when fallback is clipboard
	ApplyMethod string `json:"apply_method"` // deep_link | clipboard_deeplink | clipboard
}

const maxApplyURLLen = 2000

var prURLRegex = regexp.MustCompile(`(?i)^https?://github\.com/([^/\s]+)/([^/\s]+)/pull/(\d+)`)

// parsePRURLSafe extracts owner/name/number from a GitHub PR URL without
// panicking on malformed input (returns ok=false instead of error).
func parsePRURLSafe(prURL string) (owner, name string, number int, ok bool) {
	if strings.TrimSpace(prURL) == "" {
		return "", "", 0, false
	}
	m := prURLRegex.FindStringSubmatch(strings.TrimSpace(prURL))
	if m == nil {
		return "", "", 0, false
	}
	n := 0
	for _, c := range m[3] {
		if c < '0' || c > '9' {
			return "", "", 0, false
		}
		n = n*10 + int(c-'0')
	}
	if n <= 0 {
		return "", "", 0, false
	}
	return m[1], m[2], n, true
}

// safeApplyURL caps deep-link length at 2000 chars per AC3. When the built URL
// is too long it returns "" so the caller falls back to copy-to-clipboard.
func safeApplyURL(raw string) string {
	if raw == "" {
		return ""
	}
	if len(raw) > maxApplyURLLen {
		return ""
	}
	return raw
}

// suggestConventionalTitle derives a Conventional Commits title. If the input
// is empty it returns a safe default; otherwise it prefixes the most likely
// type when none is present.
func suggestConventionalTitle(title string) string {
	trimmed := strings.TrimSpace(title)
	if trimmed == "" {
		return "fix: resolve reported issue"
	}
	if conventionalCommitRegex.MatchString(trimmed) {
		return trimmed
	}
	return "fix: " + trimmed
}

// buildIssueLinkURL creates a GitHub "new issue" deep link with prefilled
// title/body, capped to 2000 chars. Returns "" when repo is unknown or the
// link would overflow (caller falls back to clipboard).
func buildIssueLinkURL(repoFullName, prTitle, prDescription string) string {
	if strings.TrimSpace(repoFullName) == "" {
		return ""
	}
	issueTitle := "Related: " + strings.TrimSpace(prTitle)
	if issueTitle == "Related: " {
		issueTitle = "Follow-up from preflight review"
	}
	body := strings.TrimSpace(prDescription)
	if body == "" {
		body = "This issue tracks the change described in the linked pull request."
	}
	raw := fmt.Sprintf("https://github.com/%s/issues/new?title=%s&body=%s",
		strings.TrimSpace(repoFullName),
		url.QueryEscape(issueTitle),
		url.QueryEscape(body))
	return safeApplyURL(raw)
}

// buildEditURL returns the GitHub PR edit deep link when a valid PR URL is
// available, capped to 2000 chars ("" otherwise -> clipboard fallback).
func buildEditURL(prURL string) string {
	owner, name, number, ok := parsePRURLSafe(prURL)
	if !ok {
		return ""
	}
	return safeApplyURL(fmt.Sprintf("https://github.com/%s/%s/pull/%d/edit", owner, name, number))
}

// buildMissingTestsChecklist returns a copy-ready markdown checklist prompting
// the contributor to add the missing test coverage.
func buildMissingTestsChecklist(input PreflightInput) string {
	files := input.ChangedFiles
	sample := ""
	for _, f := range files {
		if strings.TrimSpace(f) != "" {
			sample = f
			break
		}
	}
	target := "changed_module_test.go"
	if i := strings.LastIndex(sample, "/"); i >= 0 {
		target = sample[:i] + "/changed_module_test.go"
	} else if sample != "" {
		target = "changed_module_test.go"
	}
	return fmt.Sprintf(`## Missing Test Coverage Checklist
- [ ] Add a unit test file for the changed code (e.g. %s)
- [ ] Cover the happy path for the new/modified function
- [ ] Cover at least one edge / error case
- [ ] Ensure the test fails before the fix and passes after
- [ ] Run 'go test ./...' (or the repo test command) and confirm green
- [ ] Link the test run in the PR description`, target)
}

// buildPRTitleBodyPayload composes a copy-ready title + description block for
// the /edit deep link manual-paste hint.
func buildPRTitleBodyPayload(title, description string) string {
	suggestedTitle := suggestConventionalTitle(title)
	body := strings.TrimSpace(description)
	if body == "" {
		body = "### What\nDescribe the change and the problem it solves.\n\n### Why\nExplain the motivation and any linked issue.\n\n### Test steps\nList how a reviewer can verify the fix."
	}
	return fmt.Sprintf("Title: %s\n\n%s", suggestedTitle, body)
}

// FixForCheck returns >=1 safe fix object for a failed or warned check. It is
// defensive by design: null/empty/malformed inputs return a safe fallback fix
// and never panic (AC5).
func FixForCheck(check PreflightCheckItem, input PreflightInput) []Fix {
	switch check.Key {
	case "conventional_title":
		suggested := suggestConventionalTitle(input.PRTitle)
		editURL := buildEditURL(input.PRURL)
		method := "clipboard"
		if editURL != "" {
			method = "clipboard_deeplink"
		}
		fixes := []Fix{
			{
				Type:        "conventional_commit",
				Label:       "Copy git rename command",
				Payload:     fmt.Sprintf("git commit --amend -m %q", suggested),
				ApplyMethod: "clipboard",
			},
		}
		if editURL != "" {
			fixes = append(fixes, Fix{
				Type:        "pr_title_body",
				Label:       "Copy title + open PR edit",
				Payload:     buildPRTitleBodyPayload(input.PRTitle, input.PRDescription),
				ApplyURL:    editURL,
				ApplyMethod: method,
			})
		}
		return fixes

	case "test_coverage":
		return []Fix{
			{
				Type:        "missing_tests",
				Label:       "Copy missing-test checklist",
				Payload:     buildMissingTestsChecklist(input),
				ApplyMethod: "clipboard",
			},
		}

	case "pr_size":
		editURL := buildEditURL(input.PRURL)
		method := "clipboard"
		if editURL != "" {
			method = "clipboard_deeplink"
		}
		return []Fix{
			{
				Type:        "pr_title_body",
				Label:       "Copy split-PR guidance + open edit",
				Payload:     "Consider splitting this PR: move refactoring into a separate stacked pull request and keep behavior-changing logic isolated. " + buildPRTitleBodyPayload(input.PRTitle, input.PRDescription),
				ApplyURL:    editURL,
				ApplyMethod: method,
			},
		}

	case "description_depth":
		editURL := buildEditURL(input.PRURL)
		method := "clipboard"
		if editURL != "" {
			method = "clipboard_deeplink"
		}
		return []Fix{
			{
				Type:        "pr_title_body",
				Label:       "Copy richer description + open edit",
				Payload:     buildPRTitleBodyPayload(input.PRTitle, input.PRDescription),
				ApplyURL:    editURL,
				ApplyMethod: method,
			},
		}

	case "issue_linkage":
		link := buildIssueLinkURL(input.RepoFullName, input.PRTitle, input.PRDescription)
		if link == "" {
			// No repo context -> safest fallback is the clipboard checklist.
			return []Fix{
				{
					Type:        "issue_link",
					Label:       "Copy issue link template",
					Payload:     "Fixes #<issue-number>  (paste into PR description; replace with the real issue)",
					ApplyMethod: "clipboard",
				},
			}
		}
		return []Fix{
			{
				Type:        "issue_link",
				Label:       "Open pre-filled GitHub issue",
				Payload:     "Fixes #<issue-number>  (paste the created issue number into your PR description)",
				ApplyURL:    link,
				ApplyMethod: "deep_link",
			},
		}
	}

	// Defensive fallback: any unrecognized failed check still ships a fix so
	// AC1 (>=1 fix per failed/warn check) always holds.
	return []Fix{
		{
			Type:        "pr_title_body",
			Label:       "Copy note + open edit",
			Payload:     buildPRTitleBodyPayload(input.PRTitle, input.PRDescription),
			ApplyURL:    buildEditURL(input.PRURL),
			ApplyMethod: "clipboard_deeplink",
		},
	}
}
