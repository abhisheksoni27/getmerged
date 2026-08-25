package notification

import "time"

// C-Rank change alert defaults. Single source of truth for the watchlist
// alert runner when config/env knobs are unset; all three are overridable via
// ALERT_DROP_THRESHOLD / ALERT_COOLDOWN_HOURS / MAX_SEND_FAILURES.
const (
	// DefaultAlertDropPoints fires an alert when a watched repo's C-Rank
	// drops by at least this many points vs the last-alerted snapshot (AC1).
	DefaultAlertDropPoints = 10.0

	// DefaultAlertCooldown limits alerts to max one email per repo per watcher
	// per window (AC4). Boundary crossings that flap back and forth inside
	// the window send nothing extra.
	DefaultAlertCooldown = 24 * time.Hour

	// DefaultMaxSendFailures dead-letters a watcher/repo alert after this
	// many consecutive failed send cycles; retrying stops until the next
	// real tier/threshold change (AC3).
	DefaultMaxSendFailures = 5
)
