package scoring_test

import (
	"testing"
	"time"

	"github.com/abhisheksoni27/opendoor/internal/scoring"
)

func ptr[T any](v T) *T { return &v }

var now = time.Now().UTC()

func prAt(daysAgo int) time.Time {
	return now.Add(-time.Duration(daysAgo) * 24 * time.Hour)
}

func TestComputeMetrics_MergeRate(t *testing.T) {
	prs := []scoring.PR{
		{State: "MERGED", CreatedAt: prAt(5), MergedAt: ptr(prAt(4)), AuthorAssociation: "FIRST_TIME_CONTRIBUTOR", AuthorLogin: "alice"},
		{State: "MERGED", CreatedAt: prAt(10), MergedAt: ptr(prAt(9)), AuthorAssociation: "CONTRIBUTOR", AuthorLogin: "bob"},
		{State: "CLOSED", CreatedAt: prAt(15), AuthorAssociation: "CONTRIBUTOR", AuthorLogin: "carol"},
	}

	m := scoring.ComputeMetrics(prs, false)

	want := float64(2) / float64(3) * 100
	if m.ExternalPRMergeRate != want {
		t.Errorf("ExternalPRMergeRate = %.2f, want %.2f", m.ExternalPRMergeRate, want)
	}
}

func TestComputeMetrics_ExcludesInsiders(t *testing.T) {
	prs := []scoring.PR{
		{State: "MERGED", CreatedAt: prAt(5), MergedAt: ptr(prAt(4)), AuthorAssociation: "MEMBER", AuthorLogin: "insider"},
		{State: "MERGED", CreatedAt: prAt(5), MergedAt: ptr(prAt(4)), AuthorAssociation: "OWNER", AuthorLogin: "owner"},
		{State: "MERGED", CreatedAt: prAt(5), MergedAt: ptr(prAt(4)), AuthorAssociation: "COLLABORATOR", AuthorLogin: "collab"},
	}

	m := scoring.ComputeMetrics(prs, false)

	if m.ExternalPRMergeRate != 0 {
		t.Errorf("expected 0 for insider-only PRs, got %.2f", m.ExternalPRMergeRate)
	}
}

func TestComputeMetrics_NoExternalPRs_NoPanic(t *testing.T) {
	m := scoring.ComputeMetrics(nil, false)
	if m.ExternalPRMergeRate != 0 {
		t.Errorf("expected 0, got %.2f", m.ExternalPRMergeRate)
	}
}

func TestComputeMetrics_SkipsBeyond180Days(t *testing.T) {
	prs := []scoring.PR{
		{State: "MERGED", CreatedAt: prAt(181), MergedAt: ptr(prAt(180)), AuthorAssociation: "CONTRIBUTOR", AuthorLogin: "old"},
	}

	m := scoring.ComputeMetrics(prs, false)

	if m.ExternalPRMergeRate != 0 {
		t.Errorf("expected 0 for PRs older than 180 days, got %.2f", m.ExternalPRMergeRate)
	}
}

func TestComputeMetrics_FirstTimerSuccessRate(t *testing.T) {
	prs := []scoring.PR{
		{State: "MERGED", CreatedAt: prAt(5), MergedAt: ptr(prAt(4)), AuthorAssociation: "FIRST_TIME_CONTRIBUTOR", AuthorLogin: "ft1"},
		{State: "CLOSED", CreatedAt: prAt(10), AuthorAssociation: "FIRST_TIME_CONTRIBUTOR", AuthorLogin: "ft2"},
		{State: "CLOSED", CreatedAt: prAt(15), AuthorAssociation: "FIRST_TIME_CONTRIBUTOR", AuthorLogin: "ft3"},
	}

	m := scoring.ComputeMetrics(prs, false)

	want := float64(1) / float64(3) * 100
	if m.FirstTimerSuccessRate != want {
		t.Errorf("FirstTimerSuccessRate = %.2f, want %.2f", m.FirstTimerSuccessRate, want)
	}
}

func TestComputeMetrics_FirstTimerSuccessRate_AllClosed(t *testing.T) {
	prs := []scoring.PR{
		{State: "CLOSED", CreatedAt: prAt(5), AuthorAssociation: "FIRST_TIME_CONTRIBUTOR", AuthorLogin: "ft1"},
		{State: "CLOSED", CreatedAt: prAt(10), AuthorAssociation: "FIRST_TIME_CONTRIBUTOR", AuthorLogin: "ft2"},
	}

	m := scoring.ComputeMetrics(prs, false)

	if m.FirstTimerSuccessRate != 0 {
		t.Errorf("FirstTimerSuccessRate = %.2f, want 0", m.FirstTimerSuccessRate)
	}
}

func TestComputeMetrics_FirstTimerSuccessRate_NoFirstTimers(t *testing.T) {
	prs := []scoring.PR{
		{State: "MERGED", CreatedAt: prAt(5), MergedAt: ptr(prAt(4)), AuthorAssociation: "CONTRIBUTOR", AuthorLogin: "alice"},
	}

	m := scoring.ComputeMetrics(prs, false)

	if m.FirstTimerSuccessRate != 0 {
		t.Errorf("expected 0 when no first-timers present, got %.2f", m.FirstTimerSuccessRate)
	}
}

func TestComputeMetrics_RepeatContributorRate(t *testing.T) {
	prs := []scoring.PR{
		{State: "MERGED", CreatedAt: prAt(5), AuthorAssociation: "CONTRIBUTOR", AuthorLogin: "alice"},
		{State: "MERGED", CreatedAt: prAt(10), AuthorAssociation: "CONTRIBUTOR", AuthorLogin: "alice"},
		{State: "MERGED", CreatedAt: prAt(15), AuthorAssociation: "CONTRIBUTOR", AuthorLogin: "bob"},
	}

	m := scoring.ComputeMetrics(prs, false)

	// alice is a repeat, bob is not → 1/2 = 50%
	want := 50.0
	if m.RepeatContributorRate != want {
		t.Errorf("RepeatContributorRate = %.2f, want %.2f", m.RepeatContributorRate, want)
	}
}

func TestComputeMetrics_StalenessFlag(t *testing.T) {
	m := scoring.ComputeMetrics(nil, true)
	if !m.StalenessFlag {
		t.Error("expected StalenessFlag=true")
	}
}

func TestComputeMetrics_TimeToFirstResponse(t *testing.T) {
	comment4h := prAt(5).Add(4 * time.Hour)
	comment8h := prAt(10).Add(8 * time.Hour)

	prs := []scoring.PR{
		{State: "MERGED", CreatedAt: prAt(5), AuthorAssociation: "CONTRIBUTOR", AuthorLogin: "a", FirstCommentAt: &comment4h},
		{State: "MERGED", CreatedAt: prAt(10), AuthorAssociation: "CONTRIBUTOR", AuthorLogin: "b", FirstCommentAt: &comment8h},
	}

	m := scoring.ComputeMetrics(prs, false)

	want := 6.0 // median of [4, 8]
	if m.TimeToFirstResponseHours != want {
		t.Errorf("TimeToFirstResponseHours = %.2f, want %.2f", m.TimeToFirstResponseHours, want)
	}
}

func TestComputeMetrics_ReviewCoverage_BotActivity_BusFactor(t *testing.T) {
	commentTime := prAt(4).Add(2 * time.Hour)
	prs := []scoring.PR{
		{
			State:             "CLOSED",
			CreatedAt:         prAt(5),
			AuthorAssociation: "CONTRIBUTOR",
			AuthorLogin:       "user1",
			FirstCommentAt:    &commentTime,
			CommentAuthors:    []string{"maintainer1", "dependabot[bot]"},
			Commenters: []scoring.Commenter{
				{Login: "maintainer1", AuthorAssociation: "MEMBER"},
				{Login: "dependabot[bot]", AuthorAssociation: "NONE"},
			},
		},
		{
			State:             "MERGED",
			CreatedAt:         prAt(10),
			AuthorAssociation: "CONTRIBUTOR",
			AuthorLogin:       "user2",
			CommentAuthors:    []string{"maintainer2", "maintainer1"},
			Commenters: []scoring.Commenter{
				{Login: "maintainer2", AuthorAssociation: "OWNER"},
				{Login: "maintainer1", AuthorAssociation: "MEMBER"},
			},
		},
		{
			State:             "CLOSED",
			CreatedAt:         prAt(15),
			AuthorAssociation: "CONTRIBUTOR",
			AuthorLogin:       "user3",
			CommentAuthors:    []string{"user3"},
			Commenters: []scoring.Commenter{
				{Login: "user3", AuthorAssociation: "NONE"},
			},
		},
	}

	m := scoring.ComputeMetrics(prs, false)

	// PR 1 (reviewed by maintainer1), PR 2 (reviewed by maintainer2) -> 2 / 3 = 66.67%
	if m.ReviewCoverage < 66.0 || m.ReviewCoverage > 67.0 {
		t.Errorf("ReviewCoverage = %.2f, want ~66.67", m.ReviewCoverage)
	}

	// Total comments = maintainer1, dependabot[bot], maintainer2, maintainer1, user3 (5 comments). 1 bot comment -> 1/5 = 20%
	if m.BotActivityRatio != 20.0 {
		t.Errorf("BotActivityRatio = %.2f, want 20.0", m.BotActivityRatio)
	}

	// Distinct maintainers = maintainer1, maintainer2 -> BusFactor = 2
	if m.BusFactor != 2 {
		t.Errorf("BusFactor = %d, want 2", m.BusFactor)
	}
}

