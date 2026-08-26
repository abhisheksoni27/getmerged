package notification

// C-Rank change alert defaults. Single source of truth for the watchlist
// alert runner when the config/env knob is unset; overridable via the single
// global env var ALERT_TIER_DELTA (points, default 5).
const (
	// DefaultAlertDeltaPoints fires an alert when a watched repo's C-Rank
	// shifts by at least this many points vs the last-alerted snapshot in
	// either direction (AC1). Any tier change alerts regardless of delta.
	DefaultAlertDeltaPoints = 5.0
)
