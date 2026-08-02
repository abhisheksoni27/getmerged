package scoring

import "math"

// Tier labels for C-Rank scores.
const (
	TierS = "S"
	TierA = "A"
	TierB = "B"
	TierC = "C"
	TierD = "D"
)

// weights defines the C-Rank weighted sum coefficients (must sum to 1.0).
var weights = struct {
	MergeRate         float64
	ResponseTime      float64
	ActivityRecency   float64
	FirstTimer        float64
	TimeToMerge       float64
	RepeatContributor float64
	ReviewRounds      float64
	MaintainerBreadth float64
	Responsiveness    float64
}{
	MergeRate:         0.275,
	ResponseTime:      0.15,
	ActivityRecency:   0.15,
	FirstTimer:        0.10,
	TimeToMerge:       0.10,
	RepeatContributor: 0.10,
	ReviewRounds:      0.05,
	MaintainerBreadth: 0.05,
	Responsiveness:    0.025,
}

// ComputeCRank calculates the C-Rank score and tier from normalised metrics.
// If staleness is true, the score is capped to <30 (max 29.9) and assigned D.
// If no "good first issue" label exists AND first-timer success is below 50,
// the raw score receives a 10% haircut (maintainer shows no first-timer intent).
func ComputeCRank(n NormalisedMetrics, staleness bool, gfiCount int) (score float64, tier string) {
	rawScore := weights.MergeRate*n.MergeRate +
		weights.ResponseTime*n.ResponseTime +
		weights.ActivityRecency*n.ActivityRecency +
		weights.FirstTimer*n.FirstTimer +
		weights.TimeToMerge*n.TimeToMerge +
		weights.RepeatContributor*n.RepeatContributor +
		weights.ReviewRounds*n.ReviewRounds +
		weights.MaintainerBreadth*n.MaintainerBreadth +
		weights.Responsiveness*n.Responsiveness

	if staleness {
		score = math.Min(rawScore, 29.9)
		return score, TierD
	}

	if gfiCount == 0 && n.FirstTimer < 50 {
		rawScore *= 0.9
	}
	return rawScore, scoreTier(rawScore)
}

// scoreTier maps a raw score to its tier label.
func scoreTier(score float64) string {
	switch {
	case score >= 70:
		return TierS
	case score >= 55:
		return TierA
	case score >= 40:
		return TierB
	case score >= 25:
		return TierC
	default:
		return TierD
	}
}

// RescanSchedule holds the adaptive rescan result.
type RescanSchedule struct {
	IntervalDays           int
	ConsecutiveStagnant    int
}

// CalculateAdaptiveRescan computes the next rescan interval and stagnant count.
// Base Intervals:
// - S / A Tier: 1 day (active, high priority)
// - B / C Tier: 7 days (moderate priority)
// - D Tier / Stale: 15 days (low priority)
// Stagnant Decay:
// - 2+ consecutive stagnant scans (no activity in 180-day window or 0 merge rate) → 30 days (1 month)
func CalculateAdaptiveRescan(tier string, raw RawMetrics, prevStagnantCount int) RescanSchedule {
	var intervalDays int

	switch tier {
	case TierS, TierA:
		intervalDays = 1
	case TierB, TierC:
		intervalDays = 7
	default:
		intervalDays = 15
	}

	isStagnant := raw.StalenessFlag || raw.LastActivityDays >= 180 || raw.ExternalPRMergeRate == 0

	stagnantCount := prevStagnantCount
	if isStagnant {
		stagnantCount++
		if stagnantCount >= 2 {
			intervalDays = 30 // Decay to monthly scan if stagnant twice in a row
		}
	} else {
		stagnantCount = 0 // Reset on fresh activity
	}

	return RescanSchedule{
		IntervalDays:        intervalDays,
		ConsecutiveStagnant: stagnantCount,
	}
}

