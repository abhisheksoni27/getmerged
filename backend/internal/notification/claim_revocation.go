package notification

import (
	"context"
	"fmt"
	"log/slog"
	"strings"

	"github.com/jmoiron/sqlx"
)

// SendClaimRevocationAlert delivers an email notice to the maintainer when their repo claim is revoked (AC4).
func SendClaimRevocationAlert(ctx context.Context, db *sqlx.DB, cfg CRankAlertConfig, ownerUserID int64, repoFullName, reason string) error {
	var user struct {
		Email              string `db:"email"`
		DigestUnsubscribed bool   `db:"digest_unsubscribed"`
		EmailInvalid       bool   `db:"email_invalid"`
	}
	err := db.GetContext(ctx, &user, `SELECT COALESCE(email,'') AS email, COALESCE(digest_unsubscribed,FALSE) AS digest_unsubscribed, COALESCE(email_invalid,FALSE) AS email_invalid FROM users WHERE id = ?`, ownerUserID)
	if err != nil {
		return fmt.Errorf("user lookup for claim revocation: %w", err)
	}

	if user.Email == "" || user.EmailInvalid {
		slog.Warn("cannot send claim revocation alert: no valid email", "user_id", ownerUserID)
		return nil
	}

	if cfg.Mailer == nil {
		slog.Warn("no mailer configured for claim revocation notice", "user_id", ownerUserID)
		return nil
	}

	baseURL := cfg.BaseURL
	if baseURL == "" {
		baseURL = "https://getmerged.abhishekco.de"
	}

	subject := fmt.Sprintf("⚠️ Maintainer Verification Revoked: %s", repoFullName)
	reclaimURL := fmt.Sprintf("%s/%s", baseURL, repoFullName)

	text := strings.Join([]string{
		fmt.Sprintf("Your maintainer claim and console access for %s has been revoked.", repoFullName),
		"",
		fmt.Sprintf("Reason: %s", reason),
		"",
		"If this was unexpected, please re-verify ownership by visiting your repository page:",
		reclaimURL,
	}, "\n")

	html := fmt.Sprintf(`<div style="font-family: sans-serif; line-height: 1.5; color: #1e293b;">
<h2 style="color: #b91c1c; margin-top: 0;">Maintainer Verification Revoked</h2>
<p>Your maintainer claim and console access for <strong>%s</strong> has been revoked.</p>
<p style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 12px; margin: 16px 0; color: #991b1b;">
  <strong>Reason:</strong> %s
</p>
<p>To restore access to your Maintainer C-Rank Console, please re-verify ownership:</p>
<p><a href="%s" style="display: inline-block; background: #0f172a; color: #ffffff; padding: 10px 18px; border-radius: 8px; text-decoration: none; font-weight: bold;">Re-Claim &amp; Verify Repository</a></p>
</div>`, repoFullName, reason, reclaimURL)

	return cfg.Mailer.Send(ctx, user.Email, subject, text, html)
}

// SendClaimLapseAlert notifies a maintainer that their weekly re-check failed
// and the claim is lapsed: console locked with a 7-day grace window to
// re-verify before the claim is released (AC4).
func SendClaimLapseAlert(ctx context.Context, db *sqlx.DB, cfg CRankAlertConfig, ownerUserID int64, repoFullName, reason string) error {
	var user struct {
		Email        string `db:"email"`
		EmailInvalid bool   `db:"email_invalid"`
	}
	err := db.GetContext(ctx, &user, `SELECT COALESCE(email,'') AS email, COALESCE(email_invalid,FALSE) AS email_invalid FROM users WHERE id = ?`, ownerUserID)
	if err != nil {
		return fmt.Errorf("user lookup for claim lapse: %w", err)
	}
	if user.Email == "" || user.EmailInvalid || cfg.Mailer == nil {
		slog.Warn("cannot send claim lapse alert: no valid email or mailer", "user_id", ownerUserID)
		return nil
	}

	baseURL := cfg.BaseURL
	if baseURL == "" {
		baseURL = "https://getmerged.abhishekco.de"
	}
	reverifyURL := fmt.Sprintf("%s/%s", baseURL, repoFullName)

	subject := fmt.Sprintf("Action needed: %s maintainer claim lapsed (7 days to re-verify)", repoFullName)
	text := strings.Join([]string{
		fmt.Sprintf("The weekly ownership re-check for %s failed, so your maintainer claim is now lapsed and the Maintainer Console is locked.", repoFullName),
		"",
		fmt.Sprintf("Reason: %s", reason),
		"",
		"You have 7 days to restore access (e.g. regain push/admin permission or re-add the proof file). After that the claim is released and anyone can claim the repository.",
		fmt.Sprintf("Re-verify now: %s", reverifyURL),
	}, "\n")

	html := fmt.Sprintf(`<div style="font-family: sans-serif; line-height: 1.5; color: #1e293b;">
<h2 style="color: #b45309; margin-top: 0;">Maintainer Claim Lapsed</h2>
<p>The weekly ownership re-check for <strong>%s</strong> failed. Your claim is <strong>lapsed</strong> and the Maintainer Console is locked.</p>
<p style="background: #fffbeb; border-left: 4px solid #f59e0b; padding: 12px; margin: 16px 0; color: #92400e;">
  <strong>Reason:</strong> %s<br>
  <strong>Grace period:</strong> 7 days, then the claim is released.
</p>
<p><a href="%s" style="display: inline-block; background: #0f172a; color: #ffffff; padding: 10px 18px; border-radius: 8px; text-decoration: none; font-weight: bold;">Re-Verify Ownership</a></p>
</div>`, repoFullName, reason, reverifyURL)

	return cfg.Mailer.Send(ctx, user.Email, subject, text, html)
}
