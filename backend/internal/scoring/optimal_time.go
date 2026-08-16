package scoring

import (
	"time"
)

type MaintainerEvent struct {
	MaintainerLogin string
	HourUTC         int           // 0 - 23
	DayOfWeek       time.Weekday  // 0 (Sunday) to 6 (Saturday)
}

type OptimalWindowResult struct {
	PrimaryStartHourUTC   int         `json:"primary_start_hour_utc"`
	PrimaryEndHourUTC     int         `json:"primary_end_hour_utc"`
	SecondaryStartHourUTC *int        `json:"secondary_start_hour_utc,omitempty"`
	SecondaryEndHourUTC   *int        `json:"secondary_end_hour_utc,omitempty"`
	PeakHourUTC           int         `json:"peak_hour_utc"`
	ActiveMaintainerCount int         `json:"active_maintainer_count"`
	HourlyHeatmap         [24]float64 `json:"hourly_heatmap"` // Normalized 0.0 - 1.0 (weekday only)
	RecommendedDayWindow  string      `json:"recommended_day_window"` // e.g. "Tuesday - Thursday"
	ConfidenceScore       float64     `json:"confidence_score"`
}

// CalculateOptimalWindow analyzes maintainer event times to find prime PR review windows.
func CalculateOptimalWindow(events []MaintainerEvent) OptimalWindowResult {
	if len(events) == 0 {
		return OptimalWindowResult{
			PrimaryStartHourUTC:   14,
			PrimaryEndHourUTC:     18,
			PeakHourUTC:           16,
			ActiveMaintainerCount: 0,
			RecommendedDayWindow:  "Tuesday - Thursday",
			ConfidenceScore:       0.0,
		}
	}

	maintainersMap := make(map[string]bool)
	var hourlyCounts [24]int
	var totalWeekdayEvents int

	for _, ev := range events {
		if ev.MaintainerLogin != "" {
			maintainersMap[ev.MaintainerLogin] = true
		}

		// Adjust for global working week: include Friday late night / Monday early morning
		// Filter out core weekend hours (Saturday midday to Sunday evening)
		if ev.DayOfWeek == time.Saturday && ev.HourUTC >= 8 {
			continue
		}
		if ev.DayOfWeek == time.Sunday && ev.HourUTC < 20 {
			continue
		}

		h := ev.HourUTC
		if h >= 0 && h < 24 {
			hourlyCounts[h]++
			totalWeekdayEvents++
		}
	}

	// Compute max hour and normalized heatmap
	maxHourlyCount := 0
	peakHour := 0
	for h := 0; h < 24; h++ {
		if hourlyCounts[h] > maxHourlyCount {
			maxHourlyCount = hourlyCounts[h]
			peakHour = h
		}
	}

	var heatmap [24]float64
	if maxHourlyCount > 0 {
		for h := 0; h < 24; h++ {
			heatmap[h] = float64(hourlyCounts[h]) / float64(maxHourlyCount)
		}
	}

	// Find best 4-hour sliding density window (Primary)
	bestWindowSum := -1
	primaryStart := 0
	for h := 0; h < 24; h++ {
		sum := hourlyCounts[h] + hourlyCounts[(h+1)%24] + hourlyCounts[(h+2)%24] + hourlyCounts[(h+3)%24]
		if sum > bestWindowSum {
			bestWindowSum = sum
			primaryStart = h
		}
	}
	primaryEnd := (primaryStart + 4) % 24

	// Detect Secondary Peak (e.g. EU vs US global distribution)
	var secondaryStart, secondaryEnd *int
	bestSecSum := -1
	secCandidate := -1

	for h := 0; h < 24; h++ {
		// Ensure secondary window is separated by at least 6 hours from primary window
		diff := (h - primaryStart + 24) % 24
		if diff >= 6 && diff <= 18 {
			sum := hourlyCounts[h] + hourlyCounts[(h+1)%24] + hourlyCounts[(h+2)%24] + hourlyCounts[(h+3)%24]
			if sum > bestSecSum {
				bestSecSum = sum
				secCandidate = h
			}
		}
	}

	// Secondary peak must be at least 30% of the primary peak volume to filter statistical noise
	if secCandidate != -1 && bestWindowSum > 0 && float64(bestSecSum)/float64(bestWindowSum) >= 0.30 {
		sStart := secCandidate
		sEnd := (secCandidate + 4) % 24
		secondaryStart = &sStart
		secondaryEnd = &sEnd
	}

	confidence := float64(len(events)) / 50.0
	if confidence > 1.0 {
		confidence = 1.0
	}

	return OptimalWindowResult{
		PrimaryStartHourUTC:   primaryStart,
		PrimaryEndHourUTC:     primaryEnd,
		SecondaryStartHourUTC: secondaryStart,
		SecondaryEndHourUTC:   secondaryEnd,
		PeakHourUTC:           peakHour,
		ActiveMaintainerCount: len(maintainersMap),
		HourlyHeatmap:         heatmap,
		RecommendedDayWindow:  "Tuesday - Thursday",
		ConfidenceScore:       confidence,
	}
}
