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

	metrics := ComputeMetrics(prs, false)
	// Alice is 1 distinct maintainer within 90 days
	if metrics.BusFactor != 1 {
		t.Errorf("expected BusFactor = 1, got %d", metrics.BusFactor)
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

	// With bus factor 1, perfect 100 score should be clamped to Tier B
	score, tier := ComputeCRankWithBusFactor(normed, false, 0, 1)
	if tier != TierB {
		t.Errorf("expected tier to be clamped to B when BusFactor=1, got %s (score=%.2f)", tier, score)
	}

	// With bus factor 0, perfect 100 score should be clamped to Tier B
	score0, tier0 := ComputeCRankWithBusFactor(normed, false, 0, 0)
	if tier0 != TierB {
		t.Errorf("expected tier to be clamped to B when BusFactor=0, got %s (score=%.2f)", tier0, score0)
	}

	// With bus factor 2, perfect 100 score should remain Tier S
	score2, tier2 := ComputeCRankWithBusFactor(normed, false, 0, 2)
	if tier2 != TierS {
		t.Errorf("expected tier to be S when BusFactor=2, got %s (score=%.2f)", tier2, score2)
	}
}
