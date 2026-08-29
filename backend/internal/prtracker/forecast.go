package prtracker

import "fmt"

// Forecast is a transparent, rule-based heuristic (explicitly NOT ML):
// it compares PR age and review state against the repo's published p50/p90
// response percentiles and provides maintainer review timing forecasts and polite nudge templates.
type Forecast struct {
	Label          string   `json:"label"`           // strong | moderate | weak | stalled | merged | unknown
	Score          int      `json:"score"`           // 0-100 heuristic acceptance score
	Reasons        []string `json:"reasons"`         // each rule that fired, human readable
	Basis          string   `json:"basis"`           // provenance string shown in the UI
	ExpectedWindow string   `json:"expected_window"` // human-friendly expected review timing
	IsStalled      bool     `json:"is_stalled"`      // true when age exceeds p90
	NudgeTemplate  string   `json:"nudge_template"`  // markdown polite follow-up comment
}

const forecastBasis = "rule-based heuristic: PR age + review state vs repo p50/p90 review-time percentiles"

// ComputeForecast applies deterministic rules. p50/p90 may be nil when the repo
// lacks sufficient telemetry; the forecast then degrades to state-only.
func ComputeForecast(ageHours float64, state string, p50, p90 *float64) *Forecast {
	f := &Forecast{Basis: forecastBasis, Score: 40}

	if state == StateMerged {
		f.Label = "merged"
		f.Score = 100
		f.Reasons = []string{"PR already merged"}
		f.ExpectedWindow = "Merged successfully"
		return f
	}
	if p50 == nil || p90 == nil {
		f.Label = "unknown"
		f.Score = 0
		f.Reasons = []string{"insufficient repo telemetry for benchmarking"}
		f.ExpectedWindow = "Telemetry benchmark establishing..."
		return f
	}

	f.ExpectedWindow = fmt.Sprintf("Typical review within %.0fh–%.0fh (p50: %.0fh, p90: %.0fh)", *p50, *p90, *p50, *p90)

	switch state {
	case StateApproved:
		f.Score += 25
		f.Reasons = append(f.Reasons, "review approved (+25)")
	case StateChangesRequested:
		f.Score -= 15
		f.Reasons = append(f.Reasons, "changes requested (-15)")
	default:
		f.Reasons = append(f.Reasons, "awaiting first substantive review (+0)")
	}

	switch {
	case ageHours <= *p50:
		f.Score += 20
		f.Reasons = append(f.Reasons, fmt.Sprintf("age %.0fh within repo p50 response window (%.0fh) (+20)", ageHours, *p50))
	case ageHours <= *p90:
		f.Score += 10
		f.Reasons = append(f.Reasons, fmt.Sprintf("age %.0fh within repo p90 response window (%.0fh) (+10)", ageHours, *p90))
	default:
		f.Score -= 20
		f.IsStalled = true
		f.Reasons = append(f.Reasons, fmt.Sprintf("age %.0fh exceeds repo p90 response window (%.0fh) (-20)", ageHours, *p90))
		f.NudgeTemplate = "Hi maintainers! Just checking in on this pull request whenever you have a moment. I've ensured CI checks pass and tests are green. Please let me know if any adjustments or extra context would be helpful. Thanks for your time and review!"
	}

	if f.Score < 5 {
		f.Score = 5
	}
	if f.Score > 95 {
		f.Score = 95
	}

	switch {
	case state == StateChangesRequested && ageHours > 2**p90:
		f.Label = "stalled"
		f.IsStalled = true
	case f.Score >= 65:
		f.Label = "strong"
	case f.Score >= 45:
		f.Label = "moderate"
	default:
		f.Label = "weak"
	}
	return f
}
