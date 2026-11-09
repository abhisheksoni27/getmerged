package pipeline

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"regexp"
	"strings"

	"github.com/jmoiron/sqlx"
)

// AccessStatus represents whether an outside contributor can open PRs to a repository.
type AccessStatus string

const (
	AccessStatusOpen             AccessStatus = "open"
	AccessStatusVouchRequired    AccessStatus = "vouch_required"
	AccessStatusCollaboratorOnly AccessStatus = "collaborator_only"
	AccessStatusClosed           AccessStatus = "closed"
)

// AccessStatusResult contains the evaluated access status and explanation reason.
type AccessStatusResult struct {
	Status AccessStatus `json:"status"`
	Reason string       `json:"reason"`
}

// Regex patterns for detecting repository access policies in CONTRIBUTING.md / PR templates
var (
	// Closed to external PRs
	closedPatterns = []*regexp.Regexp{
		regexp.MustCompile(`(?i)(not\s+accepting\s+(external|outside|community)\s+(pull\s+requests|prs))`),
		regexp.MustCompile(`(?i)(do\s+not\s+(open|submit|send)\s+(pull\s+requests|prs))`),
		regexp.MustCompile(`(?i)(we\s+do\s+not\s+accept\s+(unsolicited|external|community)\s+(pull\s+requests|prs))`),
		regexp.MustCompile(`(?i)(pull\s+requests\s+(are\s+)?(not\s+accepted|closed\s+to\s+external))`),
		regexp.MustCompile(`(?i)(external\s+(prs|pull\s+requests)\s+will\s+be\s+(automatically\s+)?closed)`),
	}

	// Vouch or pre-approval required before opening PR
	vouchPatterns = []*regexp.Regexp{
		regexp.MustCompile(`(?i)(request\s+a\s+vouch|vouch\s+required|need\s+a\s+vouch)`),
		regexp.MustCompile(`(?i)(must\s+be\s+vouched\s+for|vouching\s+process)`),
		regexp.MustCompile(`(?i)(do\s+not\s+open\s+a\s+pr\s+without\s+(prior\s+)?(discussion|approval|permission))`),
		regexp.MustCompile(`(?i)(prs\s+without\s+(an?\s+)?approved\s+issue\s+will\s+be\s+closed)`),
		regexp.MustCompile(`(?i)(invite-only\s+contribution|permission\s+required\s+to\s+contribute)`),
	}

	// Collaborator only
	collaboratorPatterns = []*regexp.Regexp{
		regexp.MustCompile(`(?i)(only\s+(core\s+team|collaborators|maintainers|members)\s+can\s+(open|submit)\s+prs)`),
		regexp.MustCompile(`(?i)(contributions\s+are\s+restricted\s+to\s+(collaborators|team\s+members))`),
	}
)

// DetectAccessStatus analyzes documentation text (e.g., CONTRIBUTING.md, PR templates)
// to classify whether external PRs are open, vouch-required, collaborator-only, or closed.
func DetectAccessStatus(content string) AccessStatusResult {
	trimmed := strings.TrimSpace(content)
	if trimmed == "" {
		return AccessStatusResult{
			Status: AccessStatusOpen,
			Reason: "Standard open contribution policy",
		}
	}

	for _, re := range closedPatterns {
		if loc := re.FindString(trimmed); loc != "" {
			return AccessStatusResult{
				Status: AccessStatusClosed,
				Reason: fmt.Sprintf("Repository policy explicitly states: %q", loc),
			}
		}
	}

	for _, re := range collaboratorPatterns {
		if loc := re.FindString(trimmed); loc != "" {
			return AccessStatusResult{
				Status: AccessStatusCollaboratorOnly,
				Reason: fmt.Sprintf("Contributions restricted to collaborators: %q", loc),
			}
		}
	}

	for _, re := range vouchPatterns {
		if loc := re.FindString(trimmed); loc != "" {
			return AccessStatusResult{
				Status: AccessStatusVouchRequired,
				Reason: fmt.Sprintf("Vouch or prior maintainer approval required: %q", loc),
			}
		}
	}

	return AccessStatusResult{
		Status: AccessStatusOpen,
		Reason: "External contributions and pull requests welcomed",
	}
}

// FetchContributingContent retrieves CONTRIBUTING.md or .github/CONTRIBUTING.md raw content
func FetchContributingContent(ctx context.Context, client *http.Client, token, owner, name string) (string, error) {
	if client == nil {
		client = http.DefaultClient
	}

	candidates := []string{
		fmt.Sprintf("https://raw.githubusercontent.com/%s/%s/HEAD/CONTRIBUTING.md", owner, name),
		fmt.Sprintf("https://raw.githubusercontent.com/%s/%s/HEAD/.github/CONTRIBUTING.md", owner, name),
		fmt.Sprintf("https://raw.githubusercontent.com/%s/%s/HEAD/contributing.md", owner, name),
		fmt.Sprintf("https://raw.githubusercontent.com/%s/%s/HEAD/docs/CONTRIBUTING.md", owner, name),
	}

	for _, url := range candidates {
		req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
		if err != nil {
			continue
		}
		if token != "" {
			req.Header.Set("Authorization", "Bearer "+token)
		}

		resp, err := client.Do(req)
		if err != nil {
			continue
		}
		defer resp.Body.Close()

		if resp.StatusCode == http.StatusOK {
			body, err := io.ReadAll(io.LimitReader(resp.Body, 256*1024)) // 256KB cap
			if err == nil && len(body) > 0 {
				return string(body), nil
			}
		}
	}

	return "", nil
}

// UpdateRepoAccessStatus evaluates and updates the repository's access_status and access_status_reason in DB.
func UpdateRepoAccessStatus(ctx context.Context, db *sqlx.DB, client *http.Client, token, repoID, owner, name string) (AccessStatusResult, error) {
	content, err := FetchContributingContent(ctx, client, token, owner, name)
	if err != nil {
		return AccessStatusResult{Status: AccessStatusOpen}, err
	}

	res := DetectAccessStatus(content)

	_, err = db.ExecContext(ctx, `
		UPDATE repositories
		SET access_status = ?, access_status_reason = ?
		WHERE id = ?
	`, string(res.Status), res.Reason, repoID)

	return res, err
}
