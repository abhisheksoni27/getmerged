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
// Continuous logarithmic bonus is applied for beginner-friendly good first issues:
// gfiBonus = min(5.0, 2.5 * ln(1 + gfiCount)).
// Universal boundary hysteresis (promotion delta vs demotion buffer) is applied across all tiers.
func ComputeCRank(n NormalisedMetrics, staleness bool, gfiCount int, prevTier ...string) (score float64, tier string) {
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

	if gfiCount > 0 {
		// Damped logarithmic bonus (max +5.0 points) instead of discrete 15% spike
		gfiBonus := math.Min(5.0, 2.5*math.Log(1.0+float64(gfiCount)))
		rawScore = math.Min(100.0, rawScore+gfiBonus)
	}

	previousTier := ""
	if len(prevTier) > 0 {
		previousTier = prevTier[0]
	}

	return rawScore, scoreTierWithHysteresis(rawScore, previousTier)
}

// scoreTierWithHysteresis maps a score to tier applying universal ±2.0 boundary hysteresis.
func scoreTierWithHysteresis(score float64, prevTier string) string {
	switch prevTier {
	case TierS:
		if score < 68.0 {
			return scoreTier(score) // Demoted from S
		}
		return TierS // Retain S within 68.0–72.0 band

	case TierA:
		if score >= 72.0 {
			return TierS // Promoted to S
		}
		if score < 53.0 {
			return scoreTier(score) // Demoted from A
		}
		return TierA // Retain A within 53.0–57.0 band

	case TierB:
		if score >= 57.0 {
			return scoreTier(score) // Promoted to A (or S)
		}
		if score < 38.0 {
			return scoreTier(score) // Demoted from B
		}
		return TierB // Retain B within 38.0–42.0 band

	case TierC:
		if score >= 42.0 {
			return scoreTier(score) // Promoted to B (or higher)
		}
		if score < 23.0 {
			return TierD // Demoted to D
		}
		return TierC // Retain C within 23.0–27.0 band

	case TierD:
		if score >= 27.0 {
			return scoreTier(score) // Promoted to C (or higher)
		}
		return TierD

	default:
		return scoreTier(score)
	}
}

// scoreTier maps a raw score to its baseline tier label without prior state.
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

