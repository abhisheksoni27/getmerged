package scoring

import "sort"

// NormalisedMetrics holds each metric normalised to 0–100 via percentile rank.
type NormalisedMetrics struct {
	MergeRate         float64
	ResponseTime      float64 // inverted: lower hours → higher score; 0 if no data
	FirstTimer        float64
	TimeToMerge       float64 // inverted; 0 if no data
	RepeatContributor float64
	IssueTriageSpeed  float64 // inverted; 0 if no data
	Responsiveness    float64 // inverted; 0 if no data
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
//
// Rules for time-based metrics (lower raw value = better):
//   - Raw value == 0 means "no data" (no PRs, no comments, etc.) → score = 0, no credit.
//   - Raw value > 0 → invert percentile: score = 100 - percentile (faster = higher rank).
func NormaliseAll(all []RawMetrics) []NormalisedMetrics {
	n := len(all)
	if n == 0 {
		return nil
	}

	mergeRates     := extractField(all, func(m RawMetrics) float64 { return m.ExternalPRMergeRate })
	responseTimes  := extractField(all, func(m RawMetrics) float64 { return m.TimeToFirstResponseHours })
	firstTimers    := extractField(all, func(m RawMetrics) float64 { return m.FirstTimerSuccessRate })
	mergeTimes     := extractField(all, func(m RawMetrics) float64 { return m.TimeToMergeHours })
	repeatRates    := extractField(all, func(m RawMetrics) float64 { return m.RepeatContributorRate })
	triageSpeeds   := extractField(all, func(m RawMetrics) float64 { return m.IssueTriageSpeedHours })
	responsiveness := extractField(all, func(m RawMetrics) float64 { return m.MaintainerResponsiveness })

	result := make([]NormalisedMetrics, n)
	for i, m := range all {
		result[i] = NormalisedMetrics{
			MergeRate:         PercentileRank(m.ExternalPRMergeRate, mergeRates),
			ResponseTime:      invertedOrZero(m.TimeToFirstResponseHours, responseTimes),
			FirstTimer:        PercentileRank(m.FirstTimerSuccessRate, firstTimers),
			TimeToMerge:       invertedOrZero(m.TimeToMergeHours, mergeTimes),
			RepeatContributor: PercentileRank(m.RepeatContributorRate, repeatRates),
			IssueTriageSpeed:  invertedOrZero(m.IssueTriageSpeedHours, triageSpeeds),
			Responsiveness:    invertedOrZero(m.MaintainerResponsiveness, responsiveness),
		}
	}
	return result
}

// invertedOrZero returns 0 if the raw value has no data (== 0),
// otherwise returns 100 - percentile (lower time = higher score).
func invertedOrZero(value float64, all []float64) float64 {
	if value == 0 {
		return 0 // no data → no credit
	}
	return 100 - PercentileRank(value, all)
}

func extractField(all []RawMetrics, fn func(RawMetrics) float64) []float64 {
	out := make([]float64, len(all))
	for i, m := range all {
		out[i] = fn(m)
	}
	sort.Float64s(out)
	return out
}
