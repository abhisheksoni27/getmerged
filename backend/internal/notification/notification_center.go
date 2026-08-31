package notification

import (
	"context"
	"database/sql"
	"database/sql/driver"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"log/slog"
	"strconv"
	"strings"
	"time"

	"github.com/jmoiron/sqlx"
)

// In-app notification categories (AC4).
const (
	CategoryWatchlist   = "watchlist"
	CategoryPR          = "pr"
	CategoryAchievement = "achievement"
	CategoryGFI         = "gfi"
	CategoryWeeklyWrap  = "weekly_wrap"
)

var validCategories = map[string]struct{}{
	CategoryWatchlist:   {},
	CategoryPR:          {},
	CategoryAchievement: {},
	CategoryGFI:         {},
	CategoryWeeklyWrap:  {},
}

// FreeDeliveryDelay is the delay applied to Free-tier notifications: they are
// written with deliver_at = now() + FreeDeliveryDelay and only become visible
// once that time passes (AC5/AC6). Matches the Free polling interval.
const FreeDeliveryDelay = 15 * time.Minute

// RetentionReadDays is how long read notifications are retained before the
// retention cron prunes them (AC9). Unread rows are never auto-deleted.
const RetentionReadDays = 30

// PlanChangePendingWindow is the window after an upgrade during which a
// downgrade re-applies the Free delay (AC5).
const PlanChangePendingWindow = 15 * time.Minute

// NotificationPayload is the JSONB body of a notification (AC4).
type NotificationPayload struct {
	Title   string `json:"title"`
	Message string `json:"message"`
	LinkURL string `json:"link_url,omitempty"`
}

// Scan implements sql.Scanner so the JSONB payload column loads into the struct.
func (p *NotificationPayload) Scan(value interface{}) error {
	if value == nil {
		return nil
	}
	var b []byte
	switch v := value.(type) {
	case []byte:
		b = v
	case string:
		b = []byte(v)
	default:
		return fmt.Errorf("unsupported payload type %T", value)
	}
	if len(b) == 0 {
		return nil
	}
	return json.Unmarshal(b, p)
}

// Value implements driver.Valuer so the struct serializes to JSON for storage.
func (p NotificationPayload) Value() (driver.Value, error) {
	if p.Title == "" && p.Message == "" && p.LinkURL == "" {
		return "{}", nil
	}
	b, err := json.Marshal(p)
	if err != nil {
		return nil, err
	}
	return string(b), nil
}

// InAppNotification is one row of the notifications table (AC4).
type InAppNotification struct {
	ID        int64             `db:"id" json:"id"`
	UserID    int64             `db:"user_id" json:"user_id"`
	Category  string            `db:"category" json:"category"`
	Payload   NotificationPayload `db:"payload" json:"payload"`
	Read      bool              `db:"read" json:"read"`
	CreatedAt time.Time         `db:"created_at" json:"created_at"`
	DeliverAt time.Time         `db:"deliver_at" json:"deliver_at"`
}

// NotificationCursor is the opaque, stable pagination token (created_at, id).
type NotificationCursor struct {
	CreatedAt time.Time `json:"created_at"`
	ID        int64     `json:"id"`
}

// NotificationPreferences is the per-user in-app preference doc (AC10).
type NotificationPreferences struct {
	UserID int64    `db:"user_id" json:"user_id"`
	Muted  []string `json:"muted"`
}

// NotificationCenterRepository defines the in-app feed store.
type NotificationCenterRepository interface {
	GetNotifications(ctx context.Context, userID int64, cursor *NotificationCursor, limit int) ([]InAppNotification, *NotificationCursor, bool, error)
	GetDeliveredAfter(ctx context.Context, userID, afterID int64, muted []string) ([]InAppNotification, error)
	GetUnreadCount(ctx context.Context, userID int64) (count int, upgradeAvailable bool, err error)
	MarkRead(ctx context.Context, userID int64, ids []int64, markAll bool) error
	GetPreferences(ctx context.Context, userID int64) (*NotificationPreferences, error)
	SavePreferences(ctx context.Context, userID int64, prefs *NotificationPreferences) error
	PruneRead(ctx context.Context, now time.Time) (int64, error)
}

type sqlxNotificationCenterRepo struct {
	db *sqlx.DB
}

// NewNotificationCenterRepository builds the in-app feed repository.
func NewNotificationCenterRepository(db *sqlx.DB) NotificationCenterRepository {
	return &sqlxNotificationCenterRepo{db: db}
}

// EncodeCursor serializes a cursor into an opaque base64(created_at_ms:id) token (AC8).
func EncodeCursor(c *NotificationCursor) string {
	if c == nil || (c.ID == 0 && c.CreatedAt.IsZero()) {
		return ""
	}
	raw := fmt.Sprintf("%d:%d", c.CreatedAt.UnixMilli(), c.ID)
	return base64.RawURLEncoding.EncodeToString([]byte(raw))
}

// DecodeCursor parses an opaque base64(created_at_ms:id) token (AC8).
func DecodeCursor(s string) *NotificationCursor {
	if s == "" {
		return nil
	}
	b, err := base64.RawURLEncoding.DecodeString(s)
	if err != nil {
		return nil
	}
	parts := strings.SplitN(string(b), ":", 2)
	ms, err := strconv.ParseInt(parts[0], 10, 64)
	if err != nil {
		return nil
	}
	var id int64
	if len(parts) == 2 {
		id, _ = strconv.ParseInt(parts[1], 10, 64)
	}
	return &NotificationCursor{CreatedAt: time.UnixMilli(ms).UTC(), ID: id}
}

func mutedList(ctx context.Context, db *sqlx.DB, userID int64) ([]string, error) {
	var raw []byte
	err := db.GetContext(ctx, &raw, `SELECT prefs FROM notification_preferences WHERE user_id = ?`, userID)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	var doc struct {
		Muted []string `json:"muted"`
	}
	if len(raw) > 0 {
		if err := json.Unmarshal(raw, &doc); err != nil {
			return nil, err
		}
	}
	return doc.Muted, nil
}

func contains(list []string, s string) bool {
	for _, v := range list {
		if v == s {
			return true
		}
	}
	return false
}

// GetNotifications returns cursor-paginated, deliver-gated, preference-filtered
// notifications (30/page by default). Ordering is created_at DESC, id DESC for
// stability under read-state changes (AC6/AC8/AC9).
func (r *sqlxNotificationCenterRepo) GetNotifications(ctx context.Context, userID int64, cursor *NotificationCursor, limit int) ([]InAppNotification, *NotificationCursor, bool, error) {
	if limit <= 0 {
		limit = 30
	} else if limit > 100 {
		limit = 100
	}

	muted, err := mutedList(ctx, r.db, userID)
	if err != nil {
		return nil, nil, false, err
	}

	now := time.Now().UTC()
	query := `SELECT id, user_id, category, payload, ` + "`read`" + `, created_at, deliver_at FROM notifications WHERE user_id = ? AND deliver_at <= ?`
	args := []interface{}{userID, now}

	if len(muted) > 0 {
		query += ` AND category NOT IN (?)`
		args = append(args, muted)
	}

	if cursor != nil && !cursor.CreatedAt.IsZero() && cursor.ID > 0 {
		query += ` AND (created_at < ? OR (created_at = ? AND id < ?))`
		args = append(args, cursor.CreatedAt, cursor.CreatedAt, cursor.ID)
	}

	query += ` ORDER BY created_at DESC, id DESC LIMIT ?`
	args = append(args, limit+1)

	q, inArgs, err := sqlx.In(query, args...)
	if err != nil {
		return nil, nil, false, err
	}
	q = r.db.Rebind(q)

	var rows []InAppNotification
	if err := r.db.SelectContext(ctx, &rows, q, inArgs...); err != nil {
		return nil, nil, false, err
	}

	hasMore := false
	if len(rows) > limit {
		hasMore = true
		rows = rows[:limit]
	}

	var next *NotificationCursor
	if len(rows) > 0 {
		last := rows[len(rows)-1]
		next = &NotificationCursor{CreatedAt: last.CreatedAt, ID: last.ID}
	}
	return rows, next, hasMore, nil
}

// GetDeliveredAfter returns notifications delivered at/after now() with id >
// afterID (used by the SSE emitter loop), excluding muted categories (AC6/AC10).
func (r *sqlxNotificationCenterRepo) GetDeliveredAfter(ctx context.Context, userID, afterID int64, muted []string) ([]InAppNotification, error) {
	now := time.Now().UTC()
	query := `SELECT id, user_id, category, payload, ` + "`read`" + `, created_at, deliver_at FROM notifications WHERE user_id = ? AND deliver_at <= ? AND id > ?`
	args := []interface{}{userID, now, afterID}
	if len(muted) > 0 {
		query += ` AND category NOT IN (?)`
		args = append(args, muted)
	}
	query += ` ORDER BY id ASC`
	q, inArgs, err := sqlx.In(query, args...)
	if err != nil {
		return nil, err
	}
	q = r.db.Rebind(q)
	var rows []InAppNotification
	if err := r.db.SelectContext(ctx, &rows, q, inArgs...); err != nil {
		return nil, err
	}
	return rows, nil
}

// GetUnreadCount is the single source of truth for unread: COUNT of rows where
// user_id=? AND read=false AND deliver_at<=now() (AC3/AC6). upgradeAvailable is
// true when the user is Free and has pending (undelivered) rows — the upsell
// surface (AC6).
func (r *sqlxNotificationCenterRepo) GetUnreadCount(ctx context.Context, userID int64) (int, bool, error) {
	now := time.Now().UTC()
	var count int
	if err := r.db.GetContext(ctx, &count,
		`SELECT COUNT(*) FROM notifications WHERE user_id = ? AND `+"`read`"+` = FALSE AND deliver_at <= ?`, userID, now); err != nil {
		return 0, false, err
	}

	upgradeAvailable := false
	if !isUserPro(ctx, r.db, userID) {
		var pending int
		if err := r.db.GetContext(ctx, &pending,
			`SELECT COUNT(*) FROM notifications WHERE user_id = ? AND deliver_at > ?`, userID, now); err == nil && pending > 0 {
			upgradeAvailable = true
		}
	}
	return count, upgradeAvailable, nil
}

// MarkRead marks specific ids (or all) as read for the user (AC3).
func (r *sqlxNotificationCenterRepo) MarkRead(ctx context.Context, userID int64, ids []int64, markAll bool) error {
	if markAll {
		_, err := r.db.ExecContext(ctx,
			`UPDATE notifications SET `+"`read`"+` = TRUE WHERE user_id = ? AND `+"`read`"+` = FALSE`, userID)
		return err
	}
	if len(ids) == 0 {
		return nil
	}
	q, inArgs, err := sqlx.In(`UPDATE notifications SET `+"`read`"+` = TRUE WHERE user_id = ? AND id IN (?) AND `+"`read`"+` = FALSE`, userID, ids)
	if err != nil {
		return err
	}
	q = r.db.Rebind(q)
	_, err = r.db.ExecContext(ctx, q, inArgs...)
	return err
}

// GetPreferences returns the user's in-app preferences; default is all-enabled.
func (r *sqlxNotificationCenterRepo) GetPreferences(ctx context.Context, userID int64) (*NotificationPreferences, error) {
	muted, err := mutedList(ctx, r.db, userID)
	if err != nil {
		return nil, err
	}
	return &NotificationPreferences{UserID: userID, Muted: muted}, nil
}

// SavePreferences persists the muted-category set as JSONB (AC10).
func (r *sqlxNotificationCenterRepo) SavePreferences(ctx context.Context, userID int64, prefs *NotificationPreferences) error {
	doc := struct {
		Muted []string `json:"muted"`
	}{Muted: prefs.Muted}
	b, err := json.Marshal(doc)
	if err != nil {
		return err
	}
	query := `INSERT INTO notification_preferences (user_id, prefs) VALUES (?, ?) ON DUPLICATE KEY UPDATE prefs = VALUES(prefs)`
	if r.db.DriverName() == "sqlite" {
		query = `INSERT INTO notification_preferences (user_id, prefs) VALUES (?, ?) ON CONFLICT(user_id) DO UPDATE SET prefs = excluded.prefs`
	}
	_, err = r.db.ExecContext(ctx, query, userID, string(b))
	return err
}

// PruneRead deletes only read notifications older than RetentionReadDays.
// Unread rows are never auto-deleted (AC9).
func (r *sqlxNotificationCenterRepo) PruneRead(ctx context.Context, now time.Time) (int64, error) {
	threshold := now.Add(-RetentionReadDays * 24 * time.Hour)
	res, err := r.db.ExecContext(ctx,
		`DELETE FROM notifications WHERE `+"`read`"+` = TRUE AND created_at < ?`, threshold)
	if err != nil {
		return 0, err
	}
	n, _ := res.RowsAffected()
	return n, nil
}

// IsUserPro reports whether the user holds an active Pro entitlement.
func IsUserPro(ctx context.Context, db *sqlx.DB, userID int64) bool {
	return isUserPro(ctx, db, userID)
}

func isUserPro(ctx context.Context, db *sqlx.DB, userID int64) bool {
	var isPro bool
	var subExpiresAt *time.Time
	err := db.QueryRowContext(ctx,
		`SELECT COALESCE(is_pro, FALSE), subscription_expires_at FROM user_entitlements WHERE user_id = ?`,
		userID).Scan(&isPro, &subExpiresAt)
	if err != nil {
		return false
	}
	if isPro && subExpiresAt != nil && subExpiresAt.Before(time.Now().UTC()) {
		return false
	}
	return isPro
}

// WriteNotification records an in-app notification in its own transaction,
// fire-and-forget (goroutine + logged error, no retry). It deliberately uses
// the shared *sqlx.DB with a fresh context so it NEVER joins the caller's
// outbound email/Slack dispatch transaction (AC1/AC2). deliver_at encodes the
// plan delay (AC5/AC6); muted categories are skipped (AC10).
func WriteNotification(db *sqlx.DB, userID int64, category string, payload NotificationPayload) {
	if _, ok := validCategories[category]; !ok {
		return
	}
	go func() {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		if err := writeNotificationNow(ctx, db, userID, category, payload); err != nil {
			slog.Warn("WriteNotification failed", "user_id", userID, "category", category, "err", err)
		}
	}()
}

func writeNotificationNow(ctx context.Context, db *sqlx.DB, userID int64, category string, payload NotificationPayload) error {
	if muted, err := mutedList(ctx, db, userID); err == nil && contains(muted, category) {
		return nil
	}
	now := time.Now().UTC()
	deliverAt := now
	if !isUserPro(ctx, db, userID) {
		deliverAt = now.Add(FreeDeliveryDelay)
	}
	_, err := db.ExecContext(ctx,
		`INSERT INTO notifications (user_id, category, payload, `+"`read`"+`, created_at, deliver_at) VALUES (?, ?, ?, FALSE, ?, ?)`,
		userID, category, payload, now, deliverAt)
	return err
}

// EmitAchievement is the achievement-unlock emitter (AC1). Achievements is one
// of the four existing event sources; callers invoke this at unlock time.
func EmitAchievement(db *sqlx.DB, userID int64, title, message, linkURL string) {
	WriteNotification(db, userID, CategoryAchievement, NotificationPayload{Title: title, Message: message, LinkURL: linkURL})
}

// OnPlanChanged runs the pending-window sweep when a user's plan changes (AC5).
// On upgrade to Pro it promotes all pending rows (deliver_at=now()); on a
// downgrade within PlanChangePendingWindow it re-applies the Free delay so no
// stale instant-delivery state lingers.
func OnPlanChanged(db *sqlx.DB, userID int64, isPro bool, changedAt time.Time) error {
	ctx := context.Background()
	now := time.Now().UTC()
	if isPro {
		_, err := db.ExecContext(ctx,
			`UPDATE notifications SET deliver_at = ? WHERE user_id = ? AND deliver_at > ?`, now, userID, now)
		return err
	}
	// Downgrade: re-apply delay only to rows created/just-promoted within the
	// pending window (i.e. rows that were delivered early due to the upgrade).
	windowStart := changedAt.Add(-PlanChangePendingWindow)
	_, err := db.ExecContext(ctx,
		`UPDATE notifications SET deliver_at = ? WHERE user_id = ? AND deliver_at <= ? AND created_at >= ?`,
		now.Add(FreeDeliveryDelay), userID, now, windowStart)
	return err
}
