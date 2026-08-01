package pipeline

import (
	"testing"

	"github.com/abhisheksoni27/opendoor/internal/scoring"
)

func TestAdaptiveRescan_Schedule(t *testing.T) {
	s1 := scoring.CalculateAdaptiveRescan("S", scoring.RawMetrics{ExternalPRMergeRate: 90, LastActivityDays: 2}, 0)
	if s1.IntervalDays != 1 || s1.ConsecutiveStagnant != 0 {
		t.Errorf("S tier expected 1 day, got %d (stagnant=%d)", s1.IntervalDays, s1.ConsecutiveStagnant)
	}

	s2 := scoring.CalculateAdaptiveRescan("B", scoring.RawMetrics{ExternalPRMergeRate: 50, LastActivityDays: 5}, 0)
	if s2.IntervalDays != 7 || s2.ConsecutiveStagnant != 0 {
		t.Errorf("B tier expected 7 days, got %d (stagnant=%d)", s2.IntervalDays, s2.ConsecutiveStagnant)
	}

	s3 := scoring.CalculateAdaptiveRescan("D", scoring.RawMetrics{StalenessFlag: true}, 1)
	if s3.IntervalDays != 30 || s3.ConsecutiveStagnant != 2 {
		t.Errorf("2nd stagnant expected 30 days decay, got %d (stagnant=%d)", s3.IntervalDays, s3.ConsecutiveStagnant)
	}
}

func TestStarBuckets_Ranges(t *testing.T) {
	if len(DiscoveryStarBuckets) == 0 {
		t.Fatal("DiscoveryStarBuckets should not be empty")
	}
	for i, b := range DiscoveryStarBuckets {
		if b.MinStars >= b.MaxStars {
			t.Errorf("bucket %d invalid range: min %d >= max %d", i, b.MinStars, b.MaxStars)
		}
	}
}
