package scoring

import "sort"

// NormalisedMetrics holds each metric normalised to 0–100 via percentile rank.
type NormalisedMetrics struct {
	MergeRate        float64
	ResponseTime     float64 // inverted: lower hours → higher score
	FirstTimer       float64
	TimeToMerge      float64 // inverted
	RepeatContributor float64
	IssueTriageSpeed float64 // inverted
	Responsiveness   float64 // inverted
}

// PercentileRank returns the percentile rank (0–100) of value within all.
// Higher percentile means the value is larger than most peers.
func PercentileRank(value float64, all []float64) float64 {
	if len(all) == 0 {
		return 0
	}
	below := 0
	for _, v := range all {
		if v < value {
			below++
		}
	}
	return float64(below) / float64(len(all)) * 100
}

// NormaliseAll converts a slice of RawMetrics into NormalisedMetrics by computing
// percentile ranks across the entire population.
// For "lower is better" metrics (times), the score is inverted: 100 - percentile.
func NormaliseAll(all []RawMetrics) []NormalisedMetrics {
	n := len(all)
	if n == 0 {
		return nil
	}

	// Extract per-metric slices for percentile rank computation.
	mergeRates       := extractField(all, func(m RawMetrics) float64 { return m.ExternalPRMergeRate })
	responseTimes    := extractField(all, func(m RawMetrics) float64 { return m.TimeToFirstResponseHours })
	firstTimers      := extractField(all, func(m RawMetrics) float64 { return m.FirstTimerSuccessRate })
	mergeTimes       := extractField(all, func(m RawMetrics) float64 { return m.TimeToMergeHours })
	repeatRates      := extractField(all, func(m RawMetrics) float64 { return m.RepeatContributorRate })
	triageSpeeds     := extractField(all, func(m RawMetrics) float64 { return m.IssueTriageSpeedHours })
	responsiveness   := extractField(all, func(m RawMetrics) float64 { return m.MaintainerResponsiveness })

	result := make([]NormalisedMetrics, n)
	for i, m := range all {
		result[i] = NormalisedMetrics{
			MergeRate:         PercentileRank(m.ExternalPRMergeRate, mergeRates),
			ResponseTime:      100 - PercentileRank(m.TimeToFirstResponseHours, responseTimes),
			FirstTimer:        PercentileRank(m.FirstTimerSuccessRate, firstTimers),
			TimeToMerge:       100 - PercentileRank(m.TimeToMergeHours, mergeTimes),
			RepeatContributor: PercentileRank(m.RepeatContributorRate, repeatRates),
			IssueTriageSpeed:  100 - PercentileRank(m.IssueTriageSpeedHours, triageSpeeds),
			Responsiveness:    100 - PercentileRank(m.MaintainerResponsiveness, responsiveness),
		}
	}
	return result
}

func extractField(all []RawMetrics, fn func(RawMetrics) float64) []float64 {
	out := make([]float64, len(all))
	for i, m := range all {
		out[i] = fn(m)
	}
	sort.Float64s(out)
	return out
}
