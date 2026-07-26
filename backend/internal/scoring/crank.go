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
	IssueTriageSpeed  float64
	Responsiveness    float64
}{
	MergeRate:         0.25,
	ResponseTime:      0.15,
	ActivityRecency:   0.15,
	FirstTimer:        0.10,
	TimeToMerge:       0.10,
	RepeatContributor: 0.10,
	ReviewRounds:      0.05,
	MaintainerBreadth: 0.05,
	IssueTriageSpeed:  0.025,
	Responsiveness:    0.025,
}

// ComputeCRank calculates the C-Rank score and tier from normalised metrics.
// If staleness is true, the score is capped to <30 (max 29.9) and assigned D.
func ComputeCRank(n NormalisedMetrics, staleness bool) (score float64, tier string) {
	rawScore := weights.MergeRate*n.MergeRate +
		weights.ResponseTime*n.ResponseTime +
		weights.ActivityRecency*n.ActivityRecency +
		weights.FirstTimer*n.FirstTimer +
		weights.TimeToMerge*n.TimeToMerge +
		weights.RepeatContributor*n.RepeatContributor +
		weights.ReviewRounds*n.ReviewRounds +
		weights.MaintainerBreadth*n.MaintainerBreadth +
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
