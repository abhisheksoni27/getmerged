package notification

import (
	"context"
	"log/slog"
	"time"
)

// StartRetentionCron prunes read notifications older than RetentionReadDays on
// a fixed schedule (AC9). Unread rows are never deleted by this path.
func StartRetentionCron(ctx context.Context, repo NotificationCenterRepository, interval time.Duration) {
	if interval <= 0 {
		interval = 24 * time.Hour
	}
	go func() {
		ticker := time.NewTicker(interval)
		defer ticker.Stop()
		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				n, err := repo.PruneRead(ctx, time.Now().UTC())
				if err != nil {
					slog.Warn("notification retention prune failed", "err", err)
				} else if n > 0 {
					slog.Info("notification retention pruned", "rows", n)
				}
			}
		}
	}()
}
