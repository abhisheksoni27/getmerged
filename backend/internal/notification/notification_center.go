package notification

import (
	"context"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"fmt"
	"strings"
	"time"

	"github.com/jmoiron/sqlx"
)

// In-app notification categories
const (
	CategoryWatchlistChange = "watchlist_c_rank_change"
	CategoryPRMilestone     = "pr_milestone"
	CategoryAchievement     = "achievement_unlocked"
	CategoryGFIAlert        = "gfi_matched"
)

// Free tier delay interval
const FreeTierDelay = 24 * time.Hour

// InAppNotification represents an alert in the in-app notification center.
type InAppNotification struct {
	ID        int64      `db:"id" json:"id"`
	UserID    int64      `db:"user_id" json:"user_id"`
	Category  string     `db:"category" json:"category"`
	Title     string     `db:"title" json:"title"`
	Message   string     `db:"message" json:"message"`
	LinkURL   string     `db:"link_url" json:"link_url"`
	ReadAt    *time.Time `db:"read_at" json:"read_at,omitempty"`
	VisibleAt time.Time  `db:"visible_at" json:"visible_at"`
	CreatedAt time.Time  `db:"created_at" json:"created_at"`
}

// UserNotificationPreferences represents per-category notification toggles.
type UserNotificationPreferences struct {
	UserID               int64 `db:"user_id" json:"user_id"`
	WatchlistCRankChange bool  `db:"watchlist_c_rank_change" json:"watchlist_c_rank_change"`
	PRMilestones         bool  `db:"pr_milestones" json:"pr_milestones"`
	AchievementUnlocks   bool  `db:"achievement_unlocks" json:"achievement_unlocks"`
	GoodFirstIssues      bool  `db:"good_first_issues" json:"good_first_issues"`
}

// NotificationCenterRepository interface defines methods for in-app alerts and preferences.
type NotificationCenterRepository interface {
	GetNotifications(ctx context.Context, userID int64, cursor int64, limit int) ([]InAppNotification, int64, bool, error)
	GetUnreadCount(ctx context.Context, userID int64) (int, string, error)
	MarkRead(ctx context.Context, userID int64, ids []int64, markAll bool) error
	GetPreferences(ctx context.Context, userID int64) (*UserNotificationPreferences, error)
	SavePreferences(ctx context.Context, userID int64, prefs *UserNotificationPreferences) error
	InsertNotification(ctx context.Context, n *InAppNotification) error
	IsCategoryEnabled(ctx context.Context, userID int64, category string) (bool, error)
}

type sqlxNotificationCenterRepo struct {
	db *sqlx.DB
}

func NewNotificationCenterRepository(db *sqlx.DB) NotificationCenterRepository {
	return &sqlxNotificationCenterRepo{db: db}
}

func (r *sqlxNotificationCenterRepo) GetPreferences(ctx context.Context, userID int64) (*UserNotificationPreferences, error) {
	var prefs UserNotificationPreferences
	err := r.db.GetContext(ctx, &prefs, `
		SELECT user_id, watchlist_c_rank_change, pr_milestones, achievement_unlocks, good_first_issues
		FROM user_notification_preferences
		WHERE user_id = ?
	`, userID)
	if err != nil {
		if err == sql.ErrNoRows {
			// Return default all-enabled preferences
			return &UserNotificationPreferences{
				UserID:               userID,
				WatchlistCRankChange: true,
				PRMilestones:         true,
				AchievementUnlocks:   true,
				GoodFirstIssues:      true,
			}, nil
		}
		return nil, err
	}
	return &prefs, nil
}

func (r *sqlxNotificationCenterRepo) SavePreferences(ctx context.Context, userID int64, prefs *UserNotificationPreferences) error {
	prefs.UserID = userID
	query := `
		INSERT INTO user_notification_preferences (user_id, watchlist_c_rank_change, pr_milestones, achievement_unlocks, good_first_issues, updated_at)
		VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
		ON DUPLICATE KEY UPDATE
			watchlist_c_rank_change = VALUES(watchlist_c_rank_change),
			pr_milestones = VALUES(pr_milestones),
			achievement_unlocks = VALUES(achievement_unlocks),
			good_first_issues = VALUES(good_first_issues),
			updated_at = CURRENT_TIMESTAMP
	`
	if r.db.DriverName() == "sqlite" {
		query = `
			INSERT INTO user_notification_preferences (user_id, watchlist_c_rank_change, pr_milestones, achievement_unlocks, good_first_issues, updated_at)
			VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
			ON CONFLICT(user_id) DO UPDATE SET
				watchlist_c_rank_change = excluded.watchlist_c_rank_change,
				pr_milestones = excluded.pr_milestones,
				achievement_unlocks = excluded.achievement_unlocks,
				good_first_issues = excluded.good_first_issues,
				updated_at = CURRENT_TIMESTAMP
		`
	}
	_, err := r.db.ExecContext(ctx, query, userID, prefs.WatchlistCRankChange, prefs.PRMilestones, prefs.AchievementUnlocks, prefs.GoodFirstIssues)
	return err
}

func (r *sqlxNotificationCenterRepo) IsCategoryEnabled(ctx context.Context, userID int64, category string) (bool, error) {
	prefs, err := r.GetPreferences(ctx, userID)
	if err != nil {
		return true, err
	}
	switch category {
	case CategoryWatchlistChange:
		return prefs.WatchlistCRankChange, nil
	case CategoryPRMilestone:
		return prefs.PRMilestones, nil
	case CategoryAchievement:
		return prefs.AchievementUnlocks, nil
	case CategoryGFIAlert:
		return prefs.GoodFirstIssues, nil
	default:
		return true, nil
	}
}

// GetNotifications returns cursor-paginated alerts filtered by visible_at <= NOW() and user category preferences.
func (r *sqlxNotificationCenterRepo) GetNotifications(ctx context.Context, userID int64, cursor int64, limit int) ([]InAppNotification, int64, bool, error) {
	if limit <= 0 || limit > 100 {
		limit = 20
	}

	prefs, err := r.GetPreferences(ctx, userID)
	if err != nil {
		return nil, 0, false, err
	}

	var allowedCategories []string
	if prefs.WatchlistCRankChange {
		allowedCategories = append(allowedCategories, CategoryWatchlistChange)
	}
	if prefs.PRMilestones {
		allowedCategories = append(allowedCategories, CategoryPRMilestone)
	}
	if prefs.AchievementUnlocks {
		allowedCategories = append(allowedCategories, CategoryAchievement)
	}
	if prefs.GoodFirstIssues {
		allowedCategories = append(allowedCategories, CategoryGFIAlert)
	}

	if len(allowedCategories) == 0 {
		return []InAppNotification{}, 0, false, nil
	}

	now := time.Now().UTC()
	queryStr := `
		SELECT id, user_id, category, title, message, link_url, read_at, visible_at, created_at
		FROM in_app_notifications
		WHERE user_id = ? AND visible_at <= ? AND category IN (?)
	`
	args := []interface{}{userID, now, allowedCategories}

	if cursor > 0 {
		queryStr += ` AND id < ?`
		args = append(args, cursor)
	}

	queryStr += ` ORDER BY id DESC LIMIT ?`
	args = append(args, limit+1)

	query, inArgs, err := sqlx.In(queryStr, args...)
	if err != nil {
		return nil, 0, false, err
	}
	query = r.db.Rebind(query)

	var notifications []InAppNotification
	if err := r.db.SelectContext(ctx, &notifications, query, inArgs...); err != nil {
		return nil, 0, false, err
	}

	hasMore := false
	if len(notifications) > limit {
		hasMore = true
		notifications = notifications[:limit]
	}

	var nextCursor int64 = 0
	if len(notifications) > 0 {
		nextCursor = notifications[len(notifications)-1].ID
	}

	return notifications, nextCursor, hasMore, nil
}

// GetUnreadCount returns unread count of visible alerts respecting user preferences, along with a deterministic ETag.
func (r *sqlxNotificationCenterRepo) GetUnreadCount(ctx context.Context, userID int64) (int, string, error) {
	prefs, err := r.GetPreferences(ctx, userID)
	if err != nil {
		return 0, "", err
	}

	var allowedCategories []string
	if prefs.WatchlistCRankChange {
		allowedCategories = append(allowedCategories, CategoryWatchlistChange)
	}
	if prefs.PRMilestones {
		allowedCategories = append(allowedCategories, CategoryPRMilestone)
	}
	if prefs.AchievementUnlocks {
		allowedCategories = append(allowedCategories, CategoryAchievement)
	}
	if prefs.GoodFirstIssues {
		allowedCategories = append(allowedCategories, CategoryGFIAlert)
	}

	if len(allowedCategories) == 0 {
		etag := fmt.Sprintf(`W/"0-0-%d"`, userID)
		return 0, etag, nil
	}

	now := time.Now().UTC()
	queryStr := `
		SELECT COUNT(*), COALESCE(MAX(id), 0)
		FROM in_app_notifications
		WHERE user_id = ? AND visible_at <= ? AND read_at IS NULL AND category IN (?)
	`
	query, inArgs, err := sqlx.In(queryStr, userID, now, allowedCategories)
	if err != nil {
		return 0, "", err
	}
	query = r.db.Rebind(query)

	var count int
	var maxID int64
	row := r.db.QueryRowContext(ctx, query, inArgs...)
	if err := row.Scan(&count, &maxID); err != nil {
		return 0, "", err
	}

	hashRaw := fmt.Sprintf("u:%d:c:%d:m:%d", userID, count, maxID)
	h := sha256.Sum256([]byte(hashRaw))
	etag := fmt.Sprintf(`W/"%s"`, hex.EncodeToString(h[:8]))

	return count, etag, nil
}

// MarkRead updates read_at for specified IDs or all unread notifications of the user.
func (r *sqlxNotificationCenterRepo) MarkRead(ctx context.Context, userID int64, ids []int64, markAll bool) error {
	now := time.Now().UTC()
	if markAll {
		_, err := r.db.ExecContext(ctx, `
			UPDATE in_app_notifications
			SET read_at = ?
			WHERE user_id = ? AND read_at IS NULL
		`, now, userID)
		return err
	}

	if len(ids) == 0 {
		return nil
	}

	query, args, err := sqlx.In(`
		UPDATE in_app_notifications
		SET read_at = ?
		WHERE user_id = ? AND id IN (?) AND read_at IS NULL
	`, now, userID, ids)
	if err != nil {
		return err
	}
	query = r.db.Rebind(query)
	_, err = r.db.ExecContext(ctx, query, args...)
	return err
}

func (r *sqlxNotificationCenterRepo) InsertNotification(ctx context.Context, n *InAppNotification) error {
	now := time.Now().UTC()
	if n.CreatedAt.IsZero() {
		n.CreatedAt = now
	}
	if n.VisibleAt.IsZero() {
		n.VisibleAt = now
	}

	_, err := r.db.ExecContext(ctx, `
		INSERT INTO in_app_notifications (user_id, category, title, message, link_url, read_at, visible_at, created_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?)
	`, n.UserID, n.Category, n.Title, n.Message, n.LinkURL, n.ReadAt, n.VisibleAt, n.CreatedAt)
	return err
}

// Helper to check user Pro tier and insert notification with visible_at delay if Free
func EmitNotification(ctx context.Context, db *sqlx.DB, repo NotificationCenterRepository, userID int64, category, title, message, linkURL string) error {
	// Check user category preference before row insert (AC4)
	enabled, err := repo.IsCategoryEnabled(ctx, userID, category)
	if err != nil || !enabled {
		return nil // User opted out of this category
	}

	now := time.Now().UTC()
	visibleAt := now

	// Check if user is Pro
	var isPro bool
	var subExpiresAt *time.Time
	err = db.QueryRowContext(ctx, `
		SELECT COALESCE(is_pro, FALSE), subscription_expires_at
		FROM user_entitlements
		WHERE user_id = ?
	`, userID).Scan(&isPro, &subExpiresAt)
	if err != nil && err != sql.ErrNoRows {
		// Non-fatal, assume free
		isPro = false
	}
	if isPro && subExpiresAt != nil && subExpiresAt.Before(now) {
		isPro = false
	}

	// AC5: Free tier enforces delay via visible_at = NOW() + 24h; Pro tier visible_at = NOW()
	if !isPro {
		visibleAt = now.Add(FreeTierDelay)
	}

	return repo.InsertNotification(ctx, &InAppNotification{
		UserID:    userID,
		Category:  category,
		Title:     strings.TrimSpace(title),
		Message:   strings.TrimSpace(message),
		LinkURL:   strings.TrimSpace(linkURL),
		VisibleAt: visibleAt,
		CreatedAt: now,
	})
}
