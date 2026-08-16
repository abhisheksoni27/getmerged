package scoring_test

import (
	"testing"

	"github.com/abhisheksoni27/opendoor/internal/scoring"
)

func TestCalculateFitRadar(t *testing.T) {
	t.Run("calculates personalized fit radar with exact language match", func(t *testing.T) {
		input := scoring.FitRadarInput{
			RepoLanguage:        "Go",
			RepoOnboardingScore: 85,
			FirstTimerRate:      90.0,
			ResponseP50Hours:    4.2,
			ExternalMergeRate:   88.5,
			UserPrimaryLangs:    []string{"Go", "TypeScript"},
			UserPRSizePref:      "small",
		}

		res := scoring.CalculateFitRadar(input)

		if res.LanguageAffinityScore != 100.0 {
			t.Errorf("expected language affinity 100.0, got %v", res.LanguageAffinityScore)
		}
		if res.PRSizeFitScore != 95.0 {
			t.Errorf("expected PR size fit 95.0, got %v", res.PRSizeFitScore)
		}
		if res.ReviewVelocityScore < 90.0 {
			t.Errorf("expected high velocity score, got %v", res.ReviewVelocityScore)
		}
		if res.OverallMatchPercentage < 85.0 {
			t.Errorf("expected overall match > 85%%, got %v", res.OverallMatchPercentage)
		}
		if len(res.FiletypeProbabilities) != 4 {
			t.Errorf("expected 4 filetype breakdowns, got %d", len(res.FiletypeProbabilities))
		}
	})
}
