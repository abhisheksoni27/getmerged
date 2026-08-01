package scoring_test

import (
	"testing"

	"github.com/abhisheksoni27/opendoor/internal/scoring"
)

func TestComputeCRank_WeightedSum(t *testing.T) {
	n := scoring.NormalisedMetrics{
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

	score, tier := scoring.ComputeCRank(n, false)

	if score != 100 {
		t.Errorf("all-100 metrics should yield score=100, got %.2f", score)
	}
	if tier != scoring.TierS {
		t.Errorf("score=100 should be S tier, got %s", tier)
	}
}

func TestComputeCRank_StalenessForceD(t *testing.T) {
	// Even perfect metrics should yield D when stale
	n := scoring.NormalisedMetrics{
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

	_, tier := scoring.ComputeCRank(n, true)

	if tier != scoring.TierD {
		t.Errorf("staleness=true must force D tier, got %s", tier)
	}
}

func TestComputeCRank_TierBoundaries(t *testing.T) {
	cases := []struct {
		score float64
		want  string
	}{
		{85, scoring.TierS},
		{71, scoring.TierS},
		{69, scoring.TierA},
		{56, scoring.TierA},
		{54, scoring.TierB},
		{41, scoring.TierB},
		{39, scoring.TierC},
		{26, scoring.TierC},
		{24, scoring.TierD},
		{0, scoring.TierD},
	}

	for _, tc := range cases {
		// Build normalised metrics that yield the desired score using only MergeRate weight (0.35)
		// and set others to produce the remainder via other weights.
		// Simpler: set all metrics equal and solve: score = sum(w_i * x) = x * sum(w_i) = x * 1.0
		// So set all metrics to the target score.
		n := scoring.NormalisedMetrics{
			MergeRate:         tc.score,
			ResponseTime:      tc.score,
			ActivityRecency:   tc.score,
			FirstTimer:        tc.score,
			TimeToMerge:       tc.score,
			RepeatContributor: tc.score,
			ReviewRounds:      tc.score,
			MaintainerBreadth: tc.score,
			Responsiveness:    tc.score,
		}

		_, tier := scoring.ComputeCRank(n, false)

		if tier != tc.want {
			t.Errorf("score=%.0f: expected tier %s, got %s", tc.score, tc.want, tier)
		}
	}
}

func TestComputeCRank_ZeroMetrics(t *testing.T) {
	n := scoring.NormalisedMetrics{}
	score, tier := scoring.ComputeCRank(n, false)
	if score != 0 {
		t.Errorf("zero metrics should yield score=0, got %.2f", score)
	}
	if tier != scoring.TierD {
		t.Errorf("score=0 should be D tier, got %s", tier)
	}
}

func TestCalculateAdaptiveRescan(t *testing.T) {
	cases := []struct {
		name              string
		tier              string
		raw               scoring.RawMetrics
		prevStagnantCount int
		wantInterval      int
		wantStagnantCount int
	}{
		{
			name:              "S tier active",
			tier:              scoring.TierS,
			raw:               scoring.RawMetrics{ExternalPRMergeRate: 80, LastActivityDays: 5},
			prevStagnantCount: 0,
			wantInterval:      1,
			wantStagnantCount: 0,
		},
		{
			name:              "B tier moderate",
			tier:              scoring.TierB,
			raw:               scoring.RawMetrics{ExternalPRMergeRate: 50, LastActivityDays: 10},
			prevStagnantCount: 0,
			wantInterval:      7,
			wantStagnantCount: 0,
		},
		{
			name:              "D tier initial stale",
			tier:              scoring.TierD,
			raw:               scoring.RawMetrics{StalenessFlag: true},
			prevStagnantCount: 0,
			wantInterval:      15,
			wantStagnantCount: 1,
		},
		{
			name:              "D tier 2nd stagnant decay to 30d",
			tier:              scoring.TierD,
			raw:               scoring.RawMetrics{StalenessFlag: true},
			prevStagnantCount: 1,
			wantInterval:      30,
			wantStagnantCount: 2,
		},
		{
			name:              "Active again resets stagnant counter",
			tier:              scoring.TierA,
			raw:               scoring.RawMetrics{ExternalPRMergeRate: 70, LastActivityDays: 2},
			prevStagnantCount: 3,
			wantInterval:      1,
			wantStagnantCount: 0,
		},
	}

	for _, tc := range cases {
		res := scoring.CalculateAdaptiveRescan(tc.tier, tc.raw, tc.prevStagnantCount)
		if res.IntervalDays != tc.wantInterval {
			t.Errorf("[%s] IntervalDays = %d, want %d", tc.name, res.IntervalDays, tc.wantInterval)
		}
		if res.ConsecutiveStagnant != tc.wantStagnantCount {
			t.Errorf("[%s] ConsecutiveStagnant = %d, want %d", tc.name, res.ConsecutiveStagnant, tc.wantStagnantCount)
		}
	}
}

