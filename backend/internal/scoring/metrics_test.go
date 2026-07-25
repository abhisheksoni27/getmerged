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

	m := scoring.ComputeMetrics(prs, nil, false)

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

	m := scoring.ComputeMetrics(prs, nil, false)

	if m.ExternalPRMergeRate != 0 {
		t.Errorf("expected 0 for insider-only PRs, got %.2f", m.ExternalPRMergeRate)
	}
}

func TestComputeMetrics_NoExternalPRs_NoPanic(t *testing.T) {
	m := scoring.ComputeMetrics(nil, nil, false)
	if m.ExternalPRMergeRate != 0 {
		t.Errorf("expected 0, got %.2f", m.ExternalPRMergeRate)
	}
}

func TestComputeMetrics_SkipsBeyond90Days(t *testing.T) {
	prs := []scoring.PR{
		{State: "MERGED", CreatedAt: prAt(91), MergedAt: ptr(prAt(90)), AuthorAssociation: "CONTRIBUTOR", AuthorLogin: "old"},
	}

	m := scoring.ComputeMetrics(prs, nil, false)

	if m.ExternalPRMergeRate != 0 {
		t.Errorf("expected 0 for PRs older than 90 days, got %.2f", m.ExternalPRMergeRate)
	}
}

func TestComputeMetrics_FirstTimerSuccessRate(t *testing.T) {
	prs := []scoring.PR{
		{State: "MERGED", CreatedAt: prAt(5), MergedAt: ptr(prAt(4)), AuthorAssociation: "FIRST_TIME_CONTRIBUTOR", AuthorLogin: "ft1"},
		{State: "CLOSED", CreatedAt: prAt(10), AuthorAssociation: "FIRST_TIME_CONTRIBUTOR", AuthorLogin: "ft2"},
		{State: "CLOSED", CreatedAt: prAt(15), AuthorAssociation: "FIRST_TIME_CONTRIBUTOR", AuthorLogin: "ft3"},
	}

	m := scoring.ComputeMetrics(prs, nil, false)

	want := float64(1) / float64(3) * 100
	if m.FirstTimerSuccessRate != want {
		t.Errorf("FirstTimerSuccessRate = %.2f, want %.2f", m.FirstTimerSuccessRate, want)
	}
}

func TestComputeMetrics_RepeatContributorRate(t *testing.T) {
	prs := []scoring.PR{
		{State: "MERGED", CreatedAt: prAt(5), AuthorAssociation: "CONTRIBUTOR", AuthorLogin: "alice"},
		{State: "MERGED", CreatedAt: prAt(10), AuthorAssociation: "CONTRIBUTOR", AuthorLogin: "alice"},
		{State: "MERGED", CreatedAt: prAt(15), AuthorAssociation: "CONTRIBUTOR", AuthorLogin: "bob"},
	}

	m := scoring.ComputeMetrics(prs, nil, false)

	// alice is a repeat, bob is not → 1/2 = 50%
	want := 50.0
	if m.RepeatContributorRate != want {
		t.Errorf("RepeatContributorRate = %.2f, want %.2f", m.RepeatContributorRate, want)
	}
}

func TestComputeMetrics_StalenessFlag(t *testing.T) {
	m := scoring.ComputeMetrics(nil, nil, true)
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

	m := scoring.ComputeMetrics(prs, nil, false)

	want := 6.0 // median of [4, 8]
	if m.TimeToFirstResponseHours != want {
		t.Errorf("TimeToFirstResponseHours = %.2f, want %.2f", m.TimeToFirstResponseHours, want)
	}
}
