package github

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
)

// IssueClaimSignature is a stable marker embedded in every OpenDoor claim
// comment so the pre-check (AC3) can recognize our own prior comment and stay
// idempotent across tabs/devices without re-posting a duplicate.
const IssueClaimSignature = "<!-- opendoor-claim-comment -->"

const issueRESTBase = "https://api.github.com/repos"

// IssueComment is a minimal view of a GitHub issue comment used by the claim
// pre-check.
type IssueComment struct {
	ID   int64  `json:"id"`
	Body string `json:"body"`
	User struct {
		Login string `json:"login"`
		Type  string `json:"type"`
	} `json:"user"`
}

// doREST issues a REST request against api.github.com using the supplied
// user OAuth token (so the comment is authored by the claiming user, not the
// app bot). It returns the raw response body and status code.
func (c *Client) doREST(ctx context.Context, method, url, token string, body []byte) ([]byte, int, error) {
	var reader io.Reader
	if body != nil {
		reader = bytes.NewReader(body)
	}
	req, err := http.NewRequestWithContext(ctx, method, url, reader)
	if err != nil {
		return nil, 0, err
	}
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Accept", "application/vnd.github+json")
	req.Header.Set("X-GitHub-Api-Version", "2022-11-28")
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, 0, err
	}
	defer resp.Body.Close()
	raw, _ := io.ReadAll(resp.Body)
	return raw, resp.StatusCode, nil
}

// PostIssueComment posts a comment on the target issue using the user's token.
// Returns the created comment ID (GitHub node-independent DB id).
func (c *Client) PostIssueComment(ctx context.Context, owner, name string, issueNumber int, body, token string) (int64, error) {
	url := fmt.Sprintf("%s/%s/%s/issues/%d/comments", issueRESTBase, owner, name, issueNumber)
	payload, _ := json.Marshal(map[string]string{"body": body})
	raw, status, err := c.doREST(ctx, http.MethodPost, url, token, payload)
	if err != nil {
		return 0, fmt.Errorf("post issue comment: %w", err)
	}
	if status == http.StatusUnauthorized {
		return 0, fmt.Errorf("github token unauthorized (re-authorize with issues:write scope)")
	}
	if status == http.StatusForbidden {
		return 0, fmt.Errorf("github forbidden: token lacks issues:write scope")
	}
	if status == http.StatusTooManyRequests {
		return 0, fmt.Errorf("github rate limited (429): try again later")
	}
	if status >= 300 {
		return 0, fmt.Errorf("github post comment failed: status %d: %s", status, string(raw))
	}
	var created IssueComment
	if err := json.Unmarshal(raw, &created); err != nil {
		return 0, fmt.Errorf("decode comment response: %w", err)
	}
	return created.ID, nil
}

// AddIssueLabel adds a label to the target issue using the user's token.
func (c *Client) AddIssueLabel(ctx context.Context, owner, name string, issueNumber int, label, token string) error {
	url := fmt.Sprintf("%s/%s/%s/issues/%d/labels", issueRESTBase, owner, name, issueNumber)
	payload, _ := json.Marshal([]string{label})
	raw, status, err := c.doREST(ctx, http.MethodPost, url, token, payload)
	if err != nil {
		return fmt.Errorf("add issue label: %w", err)
	}
	if status == http.StatusUnprocessableEntity {
		// Label may already exist — treat as success for idempotency.
		return nil
	}
	if status == http.StatusTooManyRequests {
		return fmt.Errorf("github rate limited (429): try again later")
	}
	if status >= 300 {
		return fmt.Errorf("github add label failed: status %d: %s", status, string(raw))
	}
	return nil
}

// ListIssueComments returns comments on the target issue using the user's token.
func (c *Client) ListIssueComments(ctx context.Context, owner, name string, issueNumber int, token string) ([]IssueComment, error) {
	url := fmt.Sprintf("%s/%s/%s/issues/%d/comments?per_page=100", issueRESTBase, owner, name, issueNumber)
	raw, status, err := c.doREST(ctx, http.MethodGet, url, token, nil)
	if err != nil {
		return nil, fmt.Errorf("list issue comments: %w", err)
	}
	if status >= 300 {
		return nil, fmt.Errorf("github list comments failed: status %d: %s", status, string(raw))
	}
	var comments []IssueComment
	if err := json.Unmarshal(raw, &comments); err != nil {
		return nil, fmt.Errorf("decode comments: %w", err)
	}
	return comments, nil
}

// GetIssueLabels returns the label names on the target issue using the user's token.
func (c *Client) GetIssueLabels(ctx context.Context, owner, name string, issueNumber int, token string) ([]string, error) {
	url := fmt.Sprintf("%s/%s/%s/issues/%d", issueRESTBase, owner, name, issueNumber)
	raw, status, err := c.doREST(ctx, http.MethodGet, url, token, nil)
	if err != nil {
		return nil, fmt.Errorf("get issue: %w", err)
	}
	if status >= 300 {
		return nil, fmt.Errorf("github get issue failed: status %d: %s", status, string(raw))
	}
	var issue struct {
		Labels []struct {
			Name string `json:"name"`
		} `json:"labels"`
	}
	if err := json.Unmarshal(raw, &issue); err != nil {
		return nil, fmt.Errorf("decode issue: %w", err)
	}
	labels := make([]string, 0, len(issue.Labels))
	for _, l := range issue.Labels {
		labels = append(labels, l.Name)
	}
	return labels, nil
}

// HasOpenDoorClaimComment reports whether a prior OpenDoor claim comment (by
// signature) exists on the issue.
func (c *Client) HasOpenDoorClaimComment(ctx context.Context, owner, name string, issueNumber int, token string) (bool, error) {
	comments, err := c.ListIssueComments(ctx, owner, name, issueNumber, token)
	if err != nil {
		return false, err
	}
	for _, cm := range comments {
		if strings.Contains(cm.Body, IssueClaimSignature) {
			return true, nil
		}
	}
	return false, nil
}

// HasLabel reports whether the issue already carries the given label.
func (c *Client) HasLabel(ctx context.Context, owner, name string, issueNumber int, label, token string) (bool, error) {
	labels, err := c.GetIssueLabels(ctx, owner, name, issueNumber, token)
	if err != nil {
		return false, err
	}
	for _, l := range labels {
		if strings.EqualFold(l, label) {
			return true, nil
		}
	}
	return false, nil
}
