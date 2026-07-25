package scoring

import "sort"

// NormalisedMetrics holds each metric normalised to 0–100.
type NormalisedMetrics struct {
	MergeRate         float64
	ResponseTime      float64 // lower hours → higher score; 0 if no data
	FirstTimer        float64
	TimeToMerge       float64 // lower hours → higher score; 0 if no data
	RepeatContributor float64
	IssueTriageSpeed  float64 // lower hours → higher score; 0 if no data
	Responsiveness    float64 // lower hours → higher score; 0 if no data
}

// PercentileRank returns the percentile rank (0–100) of value within all.
func PercentileRank(value float64, all []float64) float64 {
	if len(all) == 0 {
		return 0
	}
	if len(all) == 1 {
		return 50.0 // Default to 50th percentile when no peers exist
	}
	below := 0
	for _, v := range all {
		if v < value {
			below++
		}
	}
	return float64(below) / float64(len(all)) * 100
}

// NormaliseAll converts a slice of RawMetrics into NormalisedMetrics.
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
			ResponseTime:      scoreTimeMetric(m.TimeToFirstResponseHours, responseTimes),
			FirstTimer:        PercentileRank(m.FirstTimerSuccessRate, firstTimers),
			TimeToMerge:       scoreTimeMetric(m.TimeToMergeHours, mergeTimes),
			RepeatContributor: PercentileRank(m.RepeatContributorRate, repeatRates),
			IssueTriageSpeed:  scoreTimeMetric(m.IssueTriageSpeedHours, triageSpeeds),
			Responsiveness:    scoreTimeMetric(m.MaintainerResponsiveness, responsiveness),
		}
	}
	return result
}

// scoreTimeMetric scores time-in-hours (lower is better).
// If population size > 1, uses inverted percentile rank.
// If single repo (no peers), uses benchmark absolute scoring:
//   - <= 12h  : 100
//   - <= 24h  : 80
//   - <= 72h  : 60
//   - <= 168h : 40
//   - > 168h  : 20
func scoreTimeMetric(hours float64, population []float64) float64 {
	if hours <= 0 {
		return 0 // No data → 0
	}

	if len(population) > 1 {
		return 100 - PercentileRank(hours, population)
	}

	// Single-repo absolute benchmark fallbacks
	switch {
	case hours <= 12:
		return 100
	case hours <= 24:
		return 80
	case hours <= 72:
		return 60
	case hours <= 168:
		return 40
	default:
		return 20
	}
}

func extractField(all []RawMetrics, fn func(RawMetrics) float64) []float64 {
	out := make([]float64, len(all))
	for i, m := range all {
		out[i] = fn(m)
	}
	sort.Float64s(out)
	return out
}
