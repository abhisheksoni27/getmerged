package scoring

import "testing"

func TestMatchScore(t *testing.T) {
	tests := []struct {
		name    string
		metrics MatchMetrics
		level   string
		wantMin float64
		wantMax float64
	}{
		{
			name:    "perfect beginner repo scores high",
			metrics: MatchMetrics{FirstTimerSuccessRate: 100, GoodFirstIssueCount: 10, OnboardingScore: 100, ResponseP50Hours: 1, ExternalPRMergeRate: 95, CRankScore: 95},
			level:   "beginner",
			wantMin: 85,
			wantMax: 100,
		},
		{
			name:    "zero-signal beginner repo scores low",
			metrics: MatchMetrics{},
			level:   "beginner",
			wantMin: 0,
			wantMax: 5,
		},
		{
			name:    "stale beginner repo gets penalized",
			metrics: MatchMetrics{FirstTimerSuccessRate: 90, GoodFirstIssueCount: 8, OnboardingScore: 80, ResponseP50Hours: 2, ExternalPRMergeRate: 90, StalenessFlag: true},
			level:   "beginner",
			wantMin: 0,
			wantMax: 70,
		},
		{
			name:    "high c_rank experienced repo scores high",
			metrics: MatchMetrics{CRankScore: 95, ExternalPRMergeRate: 90, ResponseP50Hours: 4, LastActivityDays: 2},
			level:   "experienced",
			wantMin: 75,
			wantMax: 100,
		},
		{
			name:    "dormant experienced repo scores low",
			metrics: MatchMetrics{CRankScore: 95, ExternalPRMergeRate: 90, LastActivityDays: 180},
			level:   "experienced",
			wantMin: 0,
			wantMax: 60,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := MatchScore(tt.metrics, tt.level)
			if got < tt.wantMin || got > tt.wantMax {
				t.Errorf("MatchScore(%+v, %q) = %.2f, want [%.0f, %.0f]", tt.metrics, tt.level, got, tt.wantMin, tt.wantMax)
			}
			if got < 0 || got > 100 {
				t.Errorf("MatchScore out of range: %.2f", got)
			}
		})
	}
}

func TestMatchScoreUnknownLevelDefaultsToBeginner(t *testing.T) {
	m := MatchMetrics{FirstTimerSuccessRate: 100, GoodFirstIssueCount: 10, OnboardingScore: 100}
	if MatchScore(m, "ninja") != MatchScore(m, "beginner") {
		t.Error("unknown level should behave like beginner")
	}
}

func TestMatchReasonsNotEmptyForGoodRepo(t *testing.T) {
	m := MatchMetrics{FirstTimerSuccessRate: 80, GoodFirstIssueCount: 6, OnboardingScore: 70, ResponseP50Hours: 3, ExternalPRMergeRate: 85}
	reasons := MatchReasons(m, "beginner")
	if len(reasons) == 0 {
		t.Fatal("expected at least one reason for a strong repo")
	}
	for _, r := range reasons {
		if r == "" {
			t.Error("reason strings must be non-empty")
		}
	}
}

func TestMatchReasonsEmptyForWeakRepo(t *testing.T) {
	m := MatchMetrics{}
	if reasons := MatchReasons(m, "beginner"); len(reasons) != 0 {
		t.Errorf("expected no reasons for zero-signal repo, got %v", reasons)
	}
}
