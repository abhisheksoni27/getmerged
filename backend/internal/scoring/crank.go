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
	FirstTimer        float64
	TimeToMerge       float64
	RepeatContributor float64
	IssueTriageSpeed  float64
	Responsiveness    float64
}{
	MergeRate:         0.35,
	ResponseTime:      0.20,
	FirstTimer:        0.15,
	TimeToMerge:       0.10,
	RepeatContributor: 0.10,
	IssueTriageSpeed:  0.05,
	Responsiveness:    0.05,
}

// ComputeCRank calculates the C-Rank score and tier from normalised metrics.
// If staleness is true, the score is capped to <30 (max 29.9) and assigned D.
func ComputeCRank(n NormalisedMetrics, staleness bool) (score float64, tier string) {
	rawScore := weights.MergeRate*n.MergeRate +
		weights.ResponseTime*n.ResponseTime +
		weights.FirstTimer*n.FirstTimer +
		weights.TimeToMerge*n.TimeToMerge +
		weights.RepeatContributor*n.RepeatContributor +
		weights.IssueTriageSpeed*n.IssueTriageSpeed +
		weights.Responsiveness*n.Responsiveness

	if staleness {
		score = math.Min(rawScore, 29.9)
		return score, TierD
	}
	return rawScore, scoreTier(rawScore)
}

// scoreTier maps a raw score to its tier label.
func scoreTier(score float64) string {
	switch {
	case score >= 80:
		return TierS
	case score >= 65:
		return TierA
	case score >= 50:
		return TierB
	case score >= 30:
		return TierC
	default:
		return TierD
	}
}
