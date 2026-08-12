package scoring

import "sort"

// NormalisedMetrics holds each metric normalised to 0–100.
type NormalisedMetrics struct {
	MergeRate         float64
	ResponseTime      float64 // lower hours → higher score; 0 if no data
	FirstTimer        float64
	TimeToMerge       float64 // lower hours → higher score; 0 if no data
	RepeatContributor float64
	Responsiveness    float64 // lower hours → higher score; 0 if no data
	ActivityRecency   float64 // lower days → higher score (decay)
	ReviewRounds      float64 // moderate/low rounds → higher score
	MaintainerBreadth float64 // higher maintainer count → higher score
}

// PercentileRank returns the percentile rank (0–100) of value within all.
// all must be sorted ascending (callers pass extractField output). Uses
// binary search: O(log n) instead of the O(n) linear scan that made
// NormaliseAll quadratic over the whole repo population.
func PercentileRank(value float64, all []float64) float64 {
	if len(all) == 0 {
		return 0
	}
	if len(all) == 1 {
		return 50.0 // Default to 50th percentile when no peers exist
	}
	// sort.SearchFloat64s returns the first index where all[i] >= value,
	// which equals the count of elements strictly below value.
	below := sort.SearchFloat64s(all, value)
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
	responsiveness := extractField(all, func(m RawMetrics) float64 { return m.MaintainerResponsiveness })
	reviewRounds   := extractField(all, func(m RawMetrics) float64 { return m.ReviewRounds })

	result := make([]NormalisedMetrics, n)
	for i, m := range all {
		result[i] = NormalisedMetrics{
			MergeRate:         PercentileRank(m.ExternalPRMergeRate, mergeRates),
			ResponseTime:      scoreTimeMetric(m.TimeToFirstResponseHours, responseTimes),
			FirstTimer:        PercentileRank(m.FirstTimerSuccessRate, firstTimers),
			TimeToMerge:       scoreTimeMetric(m.TimeToMergeHours, mergeTimes),
			RepeatContributor: PercentileRank(m.RepeatContributorRate, repeatRates),
			Responsiveness:    scoreTimeMetric(m.MaintainerResponsiveness, responsiveness),
			ActivityRecency:   scoreDaysMetric(m.LastActivityDays),
			ReviewRounds:      scoreRoundsMetric(m.ReviewRounds, reviewRounds),
			MaintainerBreadth: scoreMaintainerMetric(m.DistinctMaintainerCount),
		}
	}
	return result
}

// scoreDaysMetric scores activity recency in days (lower is better).
// Always uses absolute benchmark scoring regardless of population size.
func scoreDaysMetric(days float64) float64 {
	switch {
	case days <= 7:
		return 100
	case days <= 30:
		return 80
	case days <= 60:
		return 60
	case days <= 90:
		return 40
	case days <= 180:
		return 20
	default:
		return 0
	}
}

// scoreRoundsMetric scores review rounds (comments per merged PR).
// Ideal is 1-3 comments; >6 indicates excessive nitpicking.
func scoreRoundsMetric(rounds float64, population []float64) float64 {
	if len(population) > 1 {
		return 100 - PercentileRank(rounds, population)
	}

	switch {
	case rounds <= 2.0:
		return 100
	case rounds <= 4.0:
		return 80
	case rounds <= 6.0:
		return 50
	default:
		return 20
	}
}

// scoreMaintainerMetric scores distinct maintainer count (higher is better).
// Always uses absolute benchmark scoring regardless of population size.
func scoreMaintainerMetric(count float64) float64 {
	switch {
	case count >= 5:
		return 100
	case count == 4:
		return 85
	case count == 3:
		return 70
	case count == 2:
		return 50
	case count == 1:
		return 30
	default:
		return 0
	}
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
