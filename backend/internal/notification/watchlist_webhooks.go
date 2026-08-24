package notification

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"sync"

	"github.com/abhisheksoni27/opendoor/internal/crypto"
	"github.com/jmoiron/sqlx"
)

// WebhookAlertDeps carries the runtime dependencies of the Slack/Discord
// fan-out stage of the digest pipeline.
type WebhookAlertDeps struct {
	HTTPClient    *http.Client
	EncryptionKey []byte
	Telegram      *TelegramNotifier
	Mailer        DigestMailer
	BaseURL       string
}

type userWebhookRow struct {
	ID                  int64  `db:"id"`
	UserID              int64  `db:"user_id"`
	Label               string `db:"label"`
	URLEnc              string `db:"url_enc"`
	Enabled             bool   `db:"enabled"`
	ConsecutiveFailures int    `db:"consecutive_failures"`
}

type webhookSnapshotRow struct {
	RepoID    string  `db:"repo_id"`
	LastScore float64 `db:"last_score"`
	LastTier  string `db:"last_tier"`
}

// BuildWebhookMessage renders the single combined Slack/Discord message for
// one webhook run (AC3): one entry per repo, tier crossing takes precedence
// over the >=10-point jump as the headline.
func BuildWebhookMessage(alerts []RepoAlert, baseURL string) string {
	if baseURL == "" {
		baseURL = "https://getmerged.abhishekco.de"
	}
	text := ":dart: *C-Rank alerts* — repos on your watchlist moved:\n"
	for _, a := range alerts {
		dir := "+"
		if a.Delta < 0 {
			dir = ""
		}
		var line string
		if a.TierChanged {
			// Tier crossing takes precedence (AC3).
			line = fmt.Sprintf(":trophy: *%s* crossed tiers *%s → %s* (%.1f → %.1f, %s%.1f pts)",
				a.FullName, a.PrevTier, a.NewTier, a.PrevScore, a.NewScore, dir, a.Delta)
		} else {
			line = fmt.Sprintf(":chart_with_upwards_trend: *%s* jumped *%s%.1f pts* (%.1f → %.1f) — still tier %s",
				a.FullName, dir, a.Delta, a.PrevScore, a.NewScore, a.NewTier)
		}
		if a.GFIURL != "" {
			line += fmt.Sprintf(" · <%s|Good first issue: %s>", a.GFIURL, a.GFIText)
		}
		line += fmt.Sprintf(" · <%s/repos/%s/trend|trend>", baseURL, a.RepoID)
		text += line + "\n"
	}
	return text
}

// RunUserWebhookAlerts fans one user's digest alerts out to every enabled
// Slack/Discord webhook they registered (AC1). Each webhook is delivered in
// an isolated goroutine so one dead webhook never blocks others (AC5).
// Dedup runs against the last-notified snapshot per repo+webhook; the
// snapshot is updated only after a successful send (AC6).
func RunUserWebhookAlerts(ctx context.Context, db *sqlx.DB, userID int64, alerts []RepoAlert, deps WebhookAlertDeps, summary *WeeklyDigestSummary) {
	if len(alerts) == 0 || len(deps.EncryptionKey) == 0 {
		return
	}
	var channels []userWebhookRow
	if err := db.SelectContext(ctx, &channels,
		`SELECT id, user_id, label, url_enc, enabled, consecutive_failures FROM user_webhooks WHERE user_id = ? AND enabled = TRUE`,
		userID); err != nil || len(channels) == 0 {
		return
	}

	client := deps.HTTPClient
	if client == nil {
		client = http.DefaultClient
	}

	var wg sync.WaitGroup
	for _, ch := range channels {
		wg.Add(1)
		go func(ch userWebhookRow) {
			defer wg.Add(-1)
			// AC5: isolate panics so one dead channel cannot kill the run.
			defer func() {
				if r := recover(); r != nil {
					slog.Error("webhook delivery panicked", "user_id", ch.UserID, "webhook_id", ch.ID, "panic", r)
				}
			}()
			deliverToWebhook(ctx, db, client, ch, alerts, deps, summary)
		}(ch)
	}
	wg.Wait()
}

func deliverToWebhook(ctx context.Context, db *sqlx.DB, client *http.Client, ch userWebhookRow, alerts []RepoAlert, deps WebhookAlertDeps, summary *WeeklyDigestSummary) {
	channelURL, err := crypto.DecryptAESGCM(ch.URLEnc, deps.EncryptionKey)
	if err != nil || !ValidWebhookLabel(NormalizeWebhookLabel(ch.Label)) {
		slog.Error("webhook decrypt failed", "user_id", ch.UserID, "webhook_id", ch.ID, "err", err)
		recordWebhookFailure(ctx, db, ch, deps, summary)
		return
	}

	// AC6: diff against the last-notified snapshot per repo+webhook.
	var snaps []webhookSnapshotRow
	if err := db.SelectContext(ctx, &snaps,
		`SELECT repo_id, last_score, last_tier FROM webhook_last_notified WHERE webhook_id = ?`, ch.ID); err != nil {
		slog.Error("webhook snapshot load failed", "user_id", ch.UserID, "webhook_id", ch.ID, "err", err)
		return
	}
	lastNotified := make(map[string]webhookSnapshotRow, len(snaps))
	for _, s := range snaps {
		lastNotified[s.RepoID] = s
	}

	pending := make([]RepoAlert, 0, len(alerts))
	for _, a := range alerts {
		snap, ok := lastNotified[a.RepoID]
		if ok && snap.LastScore == a.NewScore && snap.LastTier == a.NewTier {
			continue // already notified for this exact state
		}
		pending = append(pending, a)
	}
	if len(pending) == 0 {
		return
	}

	msg := BuildWebhookMessage(pending, deps.BaseURL)
	if err := deliverWebhook(ctx, client, NormalizeWebhookLabel(ch.Label), channelURL, WebhookMessage{Text: msg}); err != nil {
		slog.Error("webhook delivery failed", "user_id", ch.UserID, "webhook_id", ch.ID, "label", ch.Label, "err", err)
		recordWebhookFailure(ctx, db, ch, deps, summary)
		return
	}

	// Success: persist the new last-notified state and clear the failure streak.
	for _, a := range pending {
		if _, err := db.ExecContext(ctx, `
			INSERT INTO webhook_last_notified (webhook_id, repo_id, last_score, last_tier, notified_at)
			VALUES (?, ?, ?, ?, UTC_TIMESTAMP())
			ON DUPLICATE KEY UPDATE last_score=VALUES(last_score), last_tier=VALUES(last_tier), notified_at=UTC_TIMESTAMP()
		`, ch.ID, a.RepoID, a.NewScore, a.NewTier); err != nil {
			slog.Error("webhook snapshot update failed", "user_id", ch.UserID, "webhook_id", ch.ID, "repo_id", a.RepoID, "err", err)
		}
	}
	_, _ = db.ExecContext(ctx, `UPDATE user_webhooks SET consecutive_failures = 0, enabled = TRUE WHERE id = ?`, ch.ID)
	if summary != nil {
		summary.WebhooksSent++
	}
}

// recordWebhookFailure applies AC4 failure accounting: exactly one failure
// per exhausted delivery; three consecutive failures auto-disable the channel
// and fire a one-time email/Telegram notice.
func recordWebhookFailure(ctx context.Context, db *sqlx.DB, ch userWebhookRow, deps WebhookAlertDeps, summary *WeeklyDigestSummary) {
	_, err := db.ExecContext(ctx,
		`UPDATE user_webhooks SET consecutive_failures = consecutive_failures + 1 WHERE id = ? AND enabled = TRUE`, ch.ID)
	if err != nil {
		slog.Error("webhook failure record failed", "user_id", ch.UserID, "webhook_id", ch.ID, "err", err)
		return
	}
	fails := ch.ConsecutiveFailures + 1
	if summary != nil {
		summary.WebhooksFailed++
	}
	if fails < webhookMaxConsecFails {
		return
	}
	disabled, err := disableWebhookChannel(ctx, db, ch.ID)
	if err != nil {
		slog.Error("webhook auto-disable failed", "user_id", ch.UserID, "webhook_id", ch.ID, "err", err)
		return
	}
	if !disabled {
		return // already disabled by another replica: notice stays one-time
	}
	if summary != nil {
		summary.WebhooksDisabled++
	}
	masked := maskedWebhookForNotice(ctx, db, ch.ID, ch.URLEnc, deps.EncryptionKey)
	notice := fmt.Sprintf("⚠ Webhook %s disabled — re-add it in your watchlist to keep receiving C-Rank alerts.", masked)
	slog.Warn("webhook auto-disabled after repeated failures", "user_id", ch.UserID, "webhook_id", ch.ID, "label", ch.Label)
	notifyWebhookDisabled(ctx, db, ch.UserID, notice, deps)
}

// disableWebhookChannel flips enabled=FALSE only if it is still enabled,
// guaranteeing the disable notice fires at most once.
func disableWebhookChannel(ctx context.Context, db *sqlx.DB, webhookID int64) (bool, error) {
	res, err := db.ExecContext(ctx,
		`UPDATE user_webhooks SET enabled = FALSE WHERE id = ? AND enabled = TRUE`, webhookID)
	if err != nil {
		return false, err
	}
	affected, _ := res.RowsAffected()
	return affected > 0, nil
}

func maskedWebhookForNotice(ctx context.Context, db *sqlx.DB, webhookID int64, urlEnc string, encKey []byte) string {
	raw, err := crypto.DecryptAESGCM(urlEnc, encKey)
	if err != nil {
		return fmt.Sprintf("#%d", webhookID)
	}
	return MaskWebhookURL(raw)
}

func notifyWebhookDisabled(ctx context.Context, db *sqlx.DB, userID int64, notice string, deps WebhookAlertDeps) {
	var email string
	_ = db.GetContext(ctx, &email, `SELECT COALESCE(email,'') FROM users WHERE id = ?`, userID)

	if deps.Telegram != nil && deps.Telegram.IsConfigured() {
		tctx, cancel := context.WithTimeout(ctx, webhookTimeout)
		if err := deps.Telegram.SendTextMessage(tctx, notice); err != nil {
			slog.Error("webhook disable telegram notice failed", "user_id", userID, "err", err)
		}
		cancel()
	}
	if deps.Mailer != nil && email != "" {
		mctx, cancel := context.WithTimeout(ctx, webhookTimeout)
		if err := deps.Mailer.Send(mctx, email, "Watchlist webhook disabled", notice+"\n", "<p>"+notice+"</p>"); err != nil {
			slog.Error("webhook disable email notice failed", "user_id", userID, "email", email, "err", err)
		}
		cancel()
	}
}
