package github

import (
	"testing"
	"time"
)

func TestHasClaimIntent(t *testing.T) {
	tests := []struct {
		text     string
		expected bool
	}{
		{"Can I take this issue?", true},
		{"can I work on this?", true},
		{"May I fix this issue please?", true},
		{"Could I contribute to this?", true},
		{"I would like to work on this issue", true},
		{"I'd like to take this", true},
		{"Please assign me", true},
		{"assign this to me please", true},
		{"I am working on this", true},
		{"I'm working on this", true},
		{"I will take this", true},
		{"claiming this!", true},
		{"Just reporting a bug: it fails on line 42", false},
		{"Thanks for the detailed reproduction steps", false},
		{"Here is a stack trace of the error", false},
		{"", false},
	}

	for _, tt := range tests {
		got := HasClaimIntent(tt.text)
		if got != tt.expected {
			t.Errorf("HasClaimIntent(%q) = %v, want %v", tt.text, got, tt.expected)
		}
	}
}

func TestEvaluateVerifiedFree(t *testing.T) {
	now := time.Now().UTC()

	t.Run("Fully free issue", func(t *testing.T) {
		input := IssueVerifiedFreeInput{
			AssigneesCount: 0,
			HasLinkedPR:    false,
			Comments: []IssueCommentSummary{
				{
					BodyText:  "Nice catch, looking forward to someone fixing it.",
					CreatedAt: now.Add(-2 * 24 * time.Hour),
				},
			},
		}
		free, reason := EvaluateVerifiedFree(input, now)
		if !free {
			t.Errorf("expected verified free, got false: %s", reason)
		}
	})

	t.Run("Assigned issue", func(t *testing.T) {
		input := IssueVerifiedFreeInput{
			AssigneesCount: 1,
			HasLinkedPR:    false,
		}
		free, reason := EvaluateVerifiedFree(input, now)
		if free {
			t.Errorf("expected not free due to assignee")
		}
		if reason != "Assigned to contributor" {
			t.Errorf("unexpected reason: %s", reason)
		}
	})

	t.Run("Has linked PR", func(t *testing.T) {
		input := IssueVerifiedFreeInput{
			AssigneesCount: 0,
			HasLinkedPR:    true,
		}
		free, reason := EvaluateVerifiedFree(input, now)
		if free {
			t.Errorf("expected not free due to linked PR")
		}
		if reason != "Has active linked pull request" {
			t.Errorf("unexpected reason: %s", reason)
		}
	})

	t.Run("Recently claimed in comments within 7 days", func(t *testing.T) {
		input := IssueVerifiedFreeInput{
			AssigneesCount: 0,
			HasLinkedPR:    false,
			Comments: []IssueCommentSummary{
				{
					BodyText:  "Can I take this issue please?",
					CreatedAt: now.Add(-3 * 24 * time.Hour),
				},
			},
		}
		free, reason := EvaluateVerifiedFree(input, now)
		if free {
			t.Errorf("expected not free due to recent claim")
		}
		if reason != "Recently claimed in comments" {
			t.Errorf("unexpected reason: %s", reason)
		}
	})

	t.Run("Claimed in comments older than 7 days without assignment or PR", func(t *testing.T) {
		input := IssueVerifiedFreeInput{
			AssigneesCount: 0,
			HasLinkedPR:    false,
			Comments: []IssueCommentSummary{
				{
					BodyText:  "Can I take this issue please?",
					CreatedAt: now.Add(-10 * 24 * time.Hour),
				},
			},
		}
		free, reason := EvaluateVerifiedFree(input, now)
		if !free {
			t.Errorf("expected free because claim was abandoned > 7 days ago, got false: %s", reason)
		}
	})
}
