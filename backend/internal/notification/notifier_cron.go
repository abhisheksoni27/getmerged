package notification

import (
	"context"
	"encoding/json"

	"github.com/jmoiron/sqlx"
)

type NotificationJob struct {
	UserID int64  `db:"user_id"`
	Type   string `db:"type"`
	Payload string `db:"payload"`
}

// QueueRankShiftNotification inserts a notification job into notification_queue when a repo rank shifts.
func QueueRankShiftNotification(ctx context.Context, db *sqlx.DB, repoID int64, oldRank, newRank string) error {
	type Watcher struct {
		UserID int64 `db:"user_id"`
	}
	var watchers []Watcher
	err := db.SelectContext(ctx, &watchers, "SELECT user_id FROM user_watchlists WHERE repo_id = ? AND notify_rank_change = TRUE", repoID)
	if err != nil || len(watchers) == 0 {
		return nil
	}

	payloadMap := map[string]any{
		"repo_id":  repoID,
		"old_rank": oldRank,
		"new_rank": newRank,
	}
	payloadBytes, _ := json.Marshal(payloadMap)

	for _, w := range watchers {
		_, _ = db.ExecContext(ctx, `
			INSERT INTO notification_queue (user_id, type, payload, status, created_at)
			VALUES (?, 'rank_changed', ?, 'pending', CURRENT_TIMESTAMP)
		`, w.UserID, string(payloadBytes))
	}

	return nil
}

// ProcessPendingNotifications processes pending items in notification_queue using CommunicationClient.
func ProcessPendingNotifications(ctx context.Context, db *sqlx.DB, client CommunicationClient) (int, error) {
	var pending []struct {
		ID      int64  `db:"id"`
		UserID  int64  `db:"user_id"`
		Type    string `db:"type"`
		Payload string `db:"payload"`
	}

	err := db.SelectContext(ctx, &pending, "SELECT id, user_id, type, payload FROM notification_queue WHERE status = 'pending' LIMIT 50")
	if err != nil || len(pending) == 0 {
		return 0, nil
	}

	processedCount := 0
	for _, item := range pending {
		if err := client.SendNotification(ctx, item.UserID, item.Type, item.Payload); err == nil {
			_, _ = db.ExecContext(ctx, "UPDATE notification_queue SET status = 'processed' WHERE id = ?", item.ID)
			processedCount++
		}
	}

	return processedCount, nil
}
