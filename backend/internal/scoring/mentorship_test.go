package scoring_test

import (
	"testing"

	"github.com/abhisheksoni27/opendoor/internal/scoring"
)

func TestCalculateMentorshipIndex(t *testing.T) {
	t.Run("empty comments returns baseline B grade", func(t *testing.T) {
		res := scoring.CalculateMentorshipIndex(nil)
		if res.MentorshipGrade != "B" {
			t.Errorf("expected grade B, got %s", res.MentorshipGrade)
		}
		if res.MentorshipScore != 75 {
			t.Errorf("expected score 75, got %d", res.MentorshipScore)
		}
	})

	t.Run("constructive welcome comments produce A grade", func(t *testing.T) {
		comments := []scoring.MentorshipComment{
			{
				CommentText:  "Welcome to the project! Thanks for opening this PR. Could you please check `make test` and add a test case in `scoring_test.go`?",
				IsNewcomerPR: true,
			},
			{
				CommentText:  "Great catch! Here is a suggestion: ```go\nif err != nil {\n    return err\n}\n```. Feel free to reach out if you need help.",
				IsNewcomerPR: true,
			},
		}

		res := scoring.CalculateMentorshipIndex(comments)
		if res.MentorshipGrade != "A" {
			t.Errorf("expected grade A, got %s (score: %d)", res.MentorshipGrade, res.MentorshipScore)
		}
		if res.MentorshipScore < 85 {
			t.Errorf("expected score >= 85, got %d", res.MentorshipScore)
		}
	})

	t.Run("curt dismissive responses produce D grade", func(t *testing.T) {
		comments := []scoring.MentorshipComment{
			{CommentText: "no", IsNewcomerPR: true},
			{CommentText: "wrong", IsNewcomerPR: true},
			{CommentText: "bad code", IsNewcomerPR: true},
		}

		res := scoring.CalculateMentorshipIndex(comments)
		if res.MentorshipGrade != "D" {
			t.Errorf("expected grade D, got %s (score: %d)", res.MentorshipGrade, res.MentorshipScore)
		}
		if res.MentorshipScore >= 50 {
			t.Errorf("expected score < 50, got %d", res.MentorshipScore)
		}
	})
}
