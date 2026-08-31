package scoring_test

import (
	"testing"
	"time"

	"github.com/abhisheksoni27/opendoor/internal/scoring"
)

func TestCalculateOptimalWindow(t *testing.T) {
	t.Run("empty events returns zero values without fake data", func(t *testing.T) {
		res := scoring.CalculateOptimalWindow(nil, "facebook/react")
		if res.ConfidenceScore != 0.0 {
			t.Errorf("expected 0.0 confidence, got %v", res.ConfidenceScore)
		}
		if res.ActiveMaintainerCount != 0 {
			t.Errorf("expected 0 active maintainers, got %d", res.ActiveMaintainerCount)
		}
		if res.PrimaryStartHourUTC != 0 || res.PeakHourUTC != 0 {
			t.Errorf("expected 0 primary start and peak hour, got %d and %d", res.PrimaryStartHourUTC, res.PeakHourUTC)
		}
		if res.RecommendedDayWindow != "" {
			t.Errorf("expected empty recommended day window, got %q", res.RecommendedDayWindow)
		}
	})

	t.Run("bi-modal distribution detects primary US and secondary EU peaks", func(t *testing.T) {
		var events []scoring.MaintainerEvent

		// EU maintainer Alice active around 09:00 - 12:00 UTC (Tuesday)
		for i := 0; i < 20; i++ {
			events = append(events, scoring.MaintainerEvent{
				MaintainerLogin: "alice_eu",
				HourUTC:         9 + (i % 3),
				DayOfWeek:       time.Tuesday,
			})
		}

		// US maintainer Bob active around 17:00 - 20:00 UTC (Wednesday) - higher volume
		for i := 0; i < 40; i++ {
			events = append(events, scoring.MaintainerEvent{
				MaintainerLogin: "bob_us",
				HourUTC:         17 + (i % 3),
				DayOfWeek:       time.Wednesday,
			})
		}

		// Weekend noise
		events = append(events, scoring.MaintainerEvent{
			MaintainerLogin: "bob_us",
			HourUTC:         12,
			DayOfWeek:       time.Saturday,
		})

		res := scoring.CalculateOptimalWindow(events)

		if res.ActiveMaintainerCount != 2 {
			t.Errorf("expected 2 active maintainers, got %d", res.ActiveMaintainerCount)
		}
		if res.PrimaryStartHourUTC < 16 || res.PrimaryStartHourUTC > 18 {
			t.Errorf("expected US primary window start around 17:00 UTC, got %d", res.PrimaryStartHourUTC)
		}
		if res.SecondaryStartHourUTC == nil || *res.SecondaryStartHourUTC < 8 || *res.SecondaryStartHourUTC > 10 {
			t.Errorf("expected EU secondary window start around 09:00 UTC, got %v", res.SecondaryStartHourUTC)
		}
		if res.ConfidenceScore != 1.0 {
			t.Errorf("expected 1.0 confidence, got %v", res.ConfidenceScore)
		}
	})
}
