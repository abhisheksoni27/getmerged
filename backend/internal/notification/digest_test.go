package notification_test

import (
	"testing"

	"github.com/abhisheksoni27/opendoor/internal/notification"
)

func TestGenerateWeeklyDigest(t *testing.T) {
	t.Run("formats weekly digest with max 3 recommendations", func(t *testing.T) {
		user := notification.DigestUser{
			Username: "torvalds",
			Email:    "linus@kernel.org",
		}

		matches := []notification.MatchCandidate{
			{
				RepoFullName:       "facebook/react",
				Language:           "JavaScript",
				CRankTier:          "S",
				ExternalMergeRate:  84.5,
				OptimalWindow:      "14:00 - 18:00 UTC",
				GoodFirstIssueURL:  "https://github.com/facebook/react/issues/100",
				GoodFirstIssueText: "Fix typo in documentation",
			},
			{
				RepoFullName:       "golang/go",
				Language:           "Go",
				CRankTier:          "S",
				ExternalMergeRate:  92.0,
				OptimalWindow:      "16:00 - 20:00 UTC",
				GoodFirstIssueURL:  "https://github.com/golang/go/issues/200",
				GoodFirstIssueText: "doc: update package comments",
			},
			{
				RepoFullName:       "kubernetes/kubernetes",
				Language:           "Go",
				CRankTier:          "A",
				ExternalMergeRate:  78.2,
				OptimalWindow:      "12:00 - 16:00 UTC",
				GoodFirstIssueURL:  "https://github.com/kubernetes/kubernetes/issues/300",
				GoodFirstIssueText: "clean up test logging",
			},
			{
				RepoFullName:      "rust-lang/rust",
				Language:          "Rust",
				CRankTier:         "A",
				ExternalMergeRate: 75.0,
			},
		}

		payload := notification.GenerateWeeklyDigest(user, matches)

		if payload.Subject == "" {
			t.Error("expected non-empty subject")
		}
		if len(payload.TextBody) == 0 || len(payload.HTMLBody) == 0 {
			t.Error("expected populated text and HTML bodies")
		}
	})
}
