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

	score, tier := scoring.ComputeCRank(n, false, 5)

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

	_, tier := scoring.ComputeCRank(n, true, 5)

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

		// Avoid 10% penalty during boundary testing if test score < 50
		gfiCount := 0
		if tc.score < 50 {
			gfiCount = -1 // bypass penalty for exact boundary assertion
		}
		_, tier := scoring.ComputeCRank(n, false, gfiCount)

		if tier != tc.want {
			t.Errorf("score=%.0f: expected tier %s, got %s", tc.score, tc.want, tier)
		}
	}
}

func TestComputeCRank_ZeroMetrics(t *testing.T) {
	n := scoring.NormalisedMetrics{}
	score, tier := scoring.ComputeCRank(n, false, 0)
	if score != 0 {
		t.Errorf("zero metrics should yield score=0, got %.2f", score)
	}
	if tier != scoring.TierD {
		t.Errorf("score=0 should be D tier, got %s", tier)
	}
}

func TestComputeCRank_GFIBoost(t *testing.T) {
	base := scoring.NormalisedMetrics{
		MergeRate:         90,
		ResponseTime:      80,
		ActivityRecency:   100,
		FirstTimer:        90,
		TimeToMerge:       80,
		RepeatContributor: 70,
		ReviewRounds:      70,
		MaintainerBreadth: 60,
		Responsiveness:    80,
	}

	withLabel, _ := scoring.ComputeCRank(base, false, 3)
	withoutLabel, _ := scoring.ComputeCRank(base, false, 0)

	if withLabel <= withoutLabel {
		t.Errorf("active GFI issues must boost score: with=%v without=%v", withLabel, withoutLabel)
	}
}

func TestComputeCRank_UniversalHysteresis(t *testing.T) {
	makeNorm := func(s float64) scoring.NormalisedMetrics {
		return scoring.NormalisedMetrics{
			MergeRate:         s,
			ResponseTime:      s,
			ActivityRecency:   s,
			FirstTimer:        s,
			TimeToMerge:       s,
			RepeatContributor: s,
			ReviewRounds:      s,
			MaintainerBreadth: s,
			Responsiveness:    s,
		}
	}

	tests := []struct {
		name     string
		score    float64
		prevTier string
		wantTier string
	}{
		// S <-> A Boundary (Base: 70, Promote: >=70, Demote: <68)
		{"S-tier stays S at 69 (above 68 buffer)", 69.0, scoring.TierS, scoring.TierS},
		{"S-tier demoted to A at 67.9", 67.9, scoring.TierS, scoring.TierA},
		{"A-tier stays A at 69.5 (below 70 threshold)", 69.5, scoring.TierA, scoring.TierA},
		{"A-tier promoted to S at 70.5", 70.5, scoring.TierA, scoring.TierS},

		// A <-> B Boundary (Base: 55, Promote: >=57, Demote: <53)
		{"A-tier stays A at 54.0 (above 53 buffer)", 54.0, scoring.TierA, scoring.TierA},
		{"A-tier demoted to B at 52.5", 52.5, scoring.TierA, scoring.TierB},
		{"B-tier stays B at 56.0 (below 57 threshold)", 56.0, scoring.TierB, scoring.TierB},
		{"B-tier promoted to A at 57.5", 57.5, scoring.TierB, scoring.TierA},

		// B <-> C Boundary (Base: 40, Promote: >=42, Demote: <38)
		{"B-tier stays B at 39.0 (above 38 buffer)", 39.0, scoring.TierB, scoring.TierB},
		{"B-tier demoted to C at 37.5", 37.5, scoring.TierB, scoring.TierC},
		{"C-tier stays C at 41.0 (below 42 threshold)", 41.0, scoring.TierC, scoring.TierC},
		{"C-tier promoted to B at 42.5", 42.5, scoring.TierC, scoring.TierB},

		// C <-> D Boundary (Base: 25, Promote: >=27, Demote: <23)
		{"C-tier stays C at 24.0 (above 23 buffer)", 24.0, scoring.TierC, scoring.TierC},
		{"C-tier demoted to D at 22.5", 22.5, scoring.TierC, scoring.TierD},
		{"D-tier stays D at 26.0 (below 27 threshold)", 26.0, scoring.TierD, scoring.TierD},
		{"D-tier promoted to C at 27.5", 27.5, scoring.TierD, scoring.TierC},

		// Clean Direct Entry (No Prior State)
		{"Fresh repo direct S entry at 70.5", 70.5, "", scoring.TierS},
		{"Fresh repo direct A entry at 69.5", 69.5, "", scoring.TierA},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, tier := scoring.ComputeCRank(makeNorm(tt.score), false, 0, tt.prevTier)
			if tier != tt.wantTier {
				t.Errorf("[%s] score=%.1f prev=%s: expected %s, got %s", tt.name, tt.score, tt.prevTier, tt.wantTier, tier)
			}
		})
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

func TestComputeConfidenceScore_SmallSampleShrinkage(t *testing.T) {
	// A repo with 1 PR having 100% metrics should not receive 100 score.
	// It should shrink towards neutral prior (50).
	rawScore := 100.0
	score1PR := scoring.ComputeConfidenceScore(rawScore, 1)
	if score1PR > 60.0 {
		t.Errorf("1 PR score should shrink heavily towards 50, got %.2f", score1PR)
	}

	score5PRs := scoring.ComputeConfidenceScore(rawScore, 5)
	if score5PRs <= score1PR || score5PRs > 85.0 {
		t.Errorf("5 PRs score should be higher than 1 PR but still damped, got %.2f", score5PRs)
	}

	score30PRs := scoring.ComputeConfidenceScore(rawScore, 30)
	if score30PRs < 98.0 {
		t.Errorf("30 PRs should preserve near full confidence, got %.2f", score30PRs)
	}
}

func TestComputeCRankWithBusFactor_UnifiedFormula(t *testing.T) {
	perfectNormed := scoring.NormalisedMetrics{
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

	// Case 1: 1 PR with perfect metrics (sample size shrinkage prevents S tier)
	// Raw score = 100, with 1 PR shrunk to ~57.6, bus factor 2 -> Tier B (due to shrunk score < 70)
	score1PR, tier1PR := scoring.ComputeCRankWithBusFactor(perfectNormed, false, 0, 2, 1)
	if score1PR >= 70.0 || tier1PR == scoring.TierS {
		t.Errorf("1 PR repo should NOT be S tier! got score=%.2f, tier=%s", score1PR, tier1PR)
	}

	// Case 2: 50 PRs with perfect metrics and bus factor 1 (bus factor cap prevents S tier)
	// Raw score = 100, confidence preserved, but BusFactor=1 forces max Tier A
	scoreBF1, tierBF1 := scoring.ComputeCRankWithBusFactor(perfectNormed, false, 0, 1, 50)
	if tierBF1 != scoring.TierA {
		t.Errorf("BusFactor=1 repo must be capped at Tier A, got tier=%s (score=%.2f)", tierBF1, scoreBF1)
	}

	// Case 3: 50 PRs with perfect metrics and bus factor 3 -> True S tier
	scoreS, tierS := scoring.ComputeCRankWithBusFactor(perfectNormed, false, 0, 3, 50)
	if tierS != scoring.TierS || scoreS < 70.0 {
		t.Errorf("50 PRs with BusFactor=3 should be Tier S, got tier=%s, score=%.2f", tierS, scoreS)
	}

	// Case 4: Stale repository -> Forced Tier D and score < 30
	scoreD, tierD := scoring.ComputeCRankWithBusFactor(perfectNormed, true, 0, 3, 50)
	if tierD != scoring.TierD || scoreD >= 30.0 {
		t.Errorf("Stale repo must be Tier D with score < 30, got tier=%s, score=%.2f", tierD, scoreD)
	}

	// Case 5: 5 PRs with perfect metrics and bus factor 3 (low_sample cap prevents Tier S or A)
	// totalPRs < 10 must cap at Tier B
	score5PR, tier5PR := scoring.ComputeCRankWithBusFactor(perfectNormed, false, 0, 3, 5)
	if tier5PR != scoring.TierB {
		t.Errorf("totalPRs=5 (<10) must be capped at Tier B, got tier=%s (score=%.2f)", tier5PR, score5PR)
	}

	// Verify IsLowSample utility
	if !scoring.IsLowSample(9) {
		t.Errorf("IsLowSample(9) should be true")
	}
	if scoring.IsLowSample(10) {
		t.Errorf("IsLowSample(10) should be false")
	}
}

