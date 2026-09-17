package scoring

import (
	"testing"
	"time"
)

func TestBusFactorCalculationAndTierCap(t *testing.T) {
	now := time.Now().UTC()

	// 1. Test calculation of BusFactor from 90-day PRs and universal maintainer associations
	prs := []PR{
		{
			CreatedAt:         now.Add(-10 * 24 * time.Hour),
			AuthorLogin:       "alice",
			AuthorAssociation: "OWNER",
		},
		{
			CreatedAt:         now.Add(-20 * 24 * time.Hour),
			AuthorLogin:       "random_user",
			AuthorAssociation: "NONE", // Should NOT be counted
			CommentAuthors:    []string{"bob", "charlie[bot]"},
		},
		{
			CreatedAt:         now.Add(-120 * 24 * time.Hour), // >90 days -> excluded
			AuthorLogin:       "dave",
			AuthorAssociation: "MEMBER",
		},
	}

	metrics := ComputeMetrics(prs, false, 90)
	// Alice is 1 distinct maintainer within 90 days
	if metrics.BusFactor != 1 {
		t.Errorf("expected BusFactor = 1, got %d", metrics.BusFactor)
	}

	// Widening the window to 180 days pulls dave (MEMBER, 120d old) back in
	metrics180 := ComputeMetrics(prs, false, 180)
	if metrics180.BusFactor != 2 {
		t.Errorf("expected BusFactor = 2 within 180-day window, got %d", metrics180.BusFactor)
	}

	// 2. Test C-Rank clamping when BusFactor <= 1
	normed := NormalisedMetrics{
		MergeRate:         100,
		ResponseTime:      100,
		ActivityRecency:   100,
		FirstTimer:        100,
		TimeToMerge:       100,
		RepeatContributor: 100,
		ReviewRounds:      100,
		MaintainerBreadth: 100,
		Responsiveness:    100,
	}

	// With bus factor 1, perfect 100 score should be clamped to Tier A (reserving Tier S for multi-maintainer teams)
	score, tier := ComputeCRankWithBusFactor(normed, false, 0, 1, 50)
	if tier != TierA {
		t.Errorf("expected tier to be clamped to A when BusFactor=1, got %s (score=%.2f)", tier, score)
	}

	// With bus factor 0, perfect 100 score should be clamped to Tier A
	score0, tier0 := ComputeCRankWithBusFactor(normed, false, 0, 0, 50)
	if tier0 != TierA {
		t.Errorf("expected tier to be clamped to A when BusFactor=0, got %s (score=%.2f)", tier0, score0)
	}

	// With bus factor 2, perfect 100 score should remain Tier S
	score2, tier2 := ComputeCRankWithBusFactor(normed, false, 0, 2, 50)
	if tier2 != TierS {
		t.Errorf("expected tier to be S when BusFactor=2, got %s (score=%.2f)", tier2, score2)
	}
}

func TestBusFactorWindowDaysFromEnv(t *testing.T) {
	t.Setenv("BUS_FACTOR_WINDOW_DAYS", "180")
	if got := BusFactorWindowDays(); got != 180 {
		t.Errorf("expected 180 from env, got %d", got)
	}

	t.Setenv("BUS_FACTOR_WINDOW_DAYS", "not-a-number")
	if got := BusFactorWindowDays(); got != 90 {
		t.Errorf("expected fallback 90 on invalid env, got %d", got)
	}

	t.Setenv("BUS_FACTOR_WINDOW_DAYS", "")
	if got := BusFactorWindowDays(); got != 90 {
		t.Errorf("expected fallback 90 on unset env, got %d", got)
	}

	t.Setenv("BUS_FACTOR_WINDOW_DAYS", "-5")
	if got := BusFactorWindowDays(); got != 90 {
		t.Errorf("expected fallback 90 on negative env, got %d", got)
	}
}

func TestBusFactorFallbackForEventStreamPRs(t *testing.T) {
	now := time.Now().UTC()
	prs := []PR{
		{
			CreatedAt:         now.Add(-10 * 24 * time.Hour),
			AuthorLogin:       "external_dev",
			AuthorAssociation: "CONTRIBUTOR",
			CommentAuthors:    []string{"reviewer1", "reviewer2"},
		},
		{
			CreatedAt:         now.Add(-20 * 24 * time.Hour),
			AuthorLogin:       "another_dev",
			AuthorAssociation: "CONTRIBUTOR",
			CommentAuthors:    []string{"reviewer1", "reviewer3"},
		},
	}

	metrics := ComputeMetrics(prs, false, 90)
	// reviewer1 has 2 comments, reviewer2 and reviewer3 have 1 comment each.
	// Fallback should include active reviewers with multi-touch or overall team size.
	if metrics.BusFactor < 1 {
		t.Errorf("expected BusFactor >= 1 with active reviewers, got %d", metrics.BusFactor)
	}
}

