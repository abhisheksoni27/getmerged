package handler

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"html"
	"io"
	"log/slog"
	"net/http"
	"strconv"
	"strings"
	"time"

	"database/sql"
	"github.com/abhisheksoni27/opendoor/internal/config"
	"github.com/abhisheksoni27/opendoor/internal/middleware"
	"github.com/abhisheksoni27/opendoor/internal/notification"
	"github.com/gin-gonic/gin"
	"github.com/jmoiron/sqlx"
)

const (
	gfiSignupMaxPerHour = 5 // AC7: signup rate limit per IP+email
	gfiSignupWindow     = time.Hour
)

type gfiSubscribeBody struct {
	Email      string   `json:"email"`
	Languages  []string `json:"languages"`
	TechStacks []string `json:"tech_stacks"`
	Tiers      []string `json:"tiers"`
	Frequency  string   `json:"frequency"`
}

// GFISubscribeHandler handles POST /api/v1/gfi-alerts/subscribe (public).
// Double opt-in: stores an unverified subscriber and emails a single-use
// 24h HMAC verification link; nothing else is ever sent until verified (AC1).
func GFISubscribeHandler(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		db := middleware.MustDB(c)
		if db == nil {
			return
		}

		var body gfiSubscribeBody
		if err := c.ShouldBindJSON(&body); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
			return
		}
		email, ok := notification.ValidateGFIEmail(body.Email)
		if !ok {
			c.JSON(http.StatusBadRequest, gin.H{"error": "valid email required"})
			return
		}

		// AC7: block verification bombing at 5 signups/hour per IP+email.
		if gfiSignupRateLimited(c.Request.Context(), db, c.ClientIP(), email) {
			c.JSON(http.StatusTooManyRequests, gin.H{"error": "too many signup attempts, try again later"})
			return
		}

		frequency := body.Frequency
		if frequency != "instant" && frequency != "weekly" {
			frequency = "weekly"
		}
		languages := notification.NormalizeGFIList(body.Languages)
		stacks := notification.NormalizeGFIList(body.TechStacks)
		tiers := notification.NormalizeGFITiers(body.Tiers)

		insertQ := `INSERT INTO gfi_subscribers (email, created_at, updated_at) VALUES (?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
		if db.DriverName() == "sqlite" {
			insertQ = `INSERT OR IGNORE INTO gfi_subscribers (email, created_at, updated_at) VALUES (?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
		}
		if _, err := db.ExecContext(c.Request.Context(), insertQ, email); err != nil {
			slog.Error("gfi-subscribe: insert failed", "err", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "signup failed"})
			return
		}
		if _, err := db.ExecContext(c.Request.Context(), `
			UPDATE gfi_subscribers SET languages=?, tech_stacks=?, tiers=?, frequency=?, updated_at=CURRENT_TIMESTAMP WHERE LOWER(email)=?
		`, languages, stacks, tiers, frequency, email); err != nil {
			slog.Error("gfi-subscribe: prefs write failed", "err", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "signup failed"})
			return
		}

		var sub struct {
			ID         int64      `db:"id"`
			VerifiedAt *time.Time `db:"verified_at"`
		}
		if err := db.GetContext(c.Request.Context(), &sub,
			`SELECT id, verified_at FROM gfi_subscribers WHERE LOWER(email)=?`, email); err != nil {
			slog.Error("gfi-subscribe: lookup failed", "err", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "signup failed"})
			return
		}

		if sub.VerifiedAt != nil {
			c.JSON(http.StatusOK, gin.H{"status": "already_verified"})
			return
		}

		verifyURL := fmt.Sprintf("%s/api/v1/gfi-alerts/verify?sid=%d&token=%s",
			strings.TrimRight(gfiBaseURL(cfg.AppBaseURL), "/"), sub.ID, notification.GFIVerifyToken(sub.ID, cfg.JobSecret))
		mailer := notification.NewSMTPMailer(cfg.SMTPHost, cfg.SMTPPort, cfg.SMTPUser, cfg.SMTPPassword, cfg.SMTPFrom)
		subject := "Confirm your good first issue alerts"
		text := "Confirm your subscription to GetMerged good first issue alerts:\n\n" + verifyURL +
			"\n\nThis single-use link expires in 24 hours. You will not receive any alerts until you confirm."
		htmlB := fmt.Sprintf(`<div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
<h2>Confirm your subscription</h2><p>Click below to start receiving good first issue alerts matched to your stack.</p>
<p><a href="%s" title="Confirm email subscription" style="background:#0284c7;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none;font-weight:bold;">Confirm subscription</a></p>
<p style="font-size:12px;color:#94a3b8;">Single-use link, expires in 24 hours.</p></div>`, verifyURL)
		if err := mailer.Send(c.Request.Context(), email, subject, text, htmlB); err != nil {
			slog.Error("gfi-subscribe: verification email failed", "err", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "could not send verification email"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"status": "verification_sent"})
	}
}

// GFIVerifyHandler handles GET /api/v1/gfi-alerts/verify (public, emailed link).
// Marks the subscriber verified exactly once (single-use token); subscribers
// with empty/null prefs land on a prompt-to-complete form instead of any send
// flow (AC8).
func GFIVerifyHandler(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		db := middleware.MustDB(c)
		if db == nil {
			return
		}
		sid, ok := notification.VerifyGFIVerifyToken(c.Query("sid"), c.Query("token"), cfg.JobSecret)
		if !ok {
			c.HTML(http.StatusBadRequest, "", "")
			c.Header("Content-Type", "text/html; charset=utf-8")
			c.String(http.StatusBadRequest, gfiPage("Link expired", "This verification link is invalid or has expired. Sign up again to get a fresh one."))
			return
		}

		res, err := db.ExecContext(c.Request.Context(),
			`UPDATE gfi_subscribers SET verified_at=CURRENT_TIMESTAMP, updated_at=CURRENT_TIMESTAMP WHERE id=? AND verified_at IS NULL`, sid)
		if err != nil {
			slog.Error("gfi-verify failed", "sid", sid, "err", err)
			c.String(http.StatusInternalServerError, gfiPage("Something went wrong", "Please try again later."))
			return
		}
		if n, _ := res.RowsAffected(); n == 0 {
			c.Header("Content-Type", "text/html; charset=utf-8")
			c.String(http.StatusOK, gfiPage("Already verified", "Your subscription is already confirmed. Manage your preferences below.",
				fmt.Sprintf(`<p><a href="%s/api/v1/gfi-alerts/prefs?sid=%d&token=%s" title="Manage alert preferences">Manage preferences</a></p>`,
					gfiBaseURL(cfg.AppBaseURL), sid, notification.GFIUnsubscribeToken(sid, cfg.JobSecret))))
			return
		}

		complete := gfiSubscriberPrefsComplete(c.Request.Context(), db, sid)
		if !complete {
			c.Header("Content-Type", "text/html; charset=utf-8")
			prefsURL := fmt.Sprintf("/api/v1/gfi-alerts/prefs?sid=%d&token=%s", sid, notification.GFIVerifyToken(sid, cfg.JobSecret))
			c.String(http.StatusOK, gfiPage("Email verified — finish setup", "Pick what you want to hear about. We won't send any alerts until you complete your preferences.", gfiPrefsFormHTML(prefsURL, "", "", "S,A,B", "weekly")))
			return
		}
		c.Header("Content-Type", "text/html; charset=utf-8")
		c.String(http.StatusOK, gfiPage("Subscription confirmed", "You're in. You'll get good first issue alerts matched to your stack."))
	}
}

func gfiSubscriberPrefsComplete(ctx context.Context, db *sqlx.DB, sid int64) bool {
	var langs, tiers sql.NullString
	if err := db.GetContext(ctx, &langs, `SELECT languages FROM gfi_subscribers WHERE id=?`, sid); err != nil {
		return false
	}
	if err := db.GetContext(ctx, &tiers, `SELECT tiers FROM gfi_subscribers WHERE id=?`, sid); err != nil {
		return false
	}
	return langs.Valid && langs.String != "" && tiers.Valid && tiers.String != ""
}

// GFIPrefsHandler serves (GET) and saves (POST) alert preferences. Both
// methods are token-gated with the same HMAC scheme; incomplete submissions
// never re-enable sends (AC8).
func GFIPrefsHandler(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		db := middleware.MustDB(c)
		if db == nil {
			return
		}
		sidStr, token := c.Query("sid"), c.Query("token")
		sidV, okV := notification.VerifyGFIVerifyToken(sidStr, token, cfg.JobSecret)
		sidU, okU := notification.VerifyGFIUnsubscribeToken(sidStr, token, cfg.JobSecret)
		if !okV && !okU {
			c.Header("Content-Type", "text/html; charset=utf-8")
			c.String(http.StatusBadRequest, gfiPage("Link expired", "This preference link is invalid or has expired."))
			return
		}
		sid := sidV
		if !okV {
			sid = sidU
		}

		if c.Request.Method == http.MethodPost {
			langs := notification.NormalizeGFIList(splitCSV(c.PostForm("languages")))
			stacks := notification.NormalizeGFIList(splitCSV(c.PostForm("tech_stacks")))
			tiers := notification.NormalizeGFITiers(c.PostFormArray("tiers"))
			frequency := c.PostForm("frequency")
			if frequency != "instant" && frequency != "weekly" {
				frequency = "weekly"
			}
			if _, err := db.ExecContext(c.Request.Context(), `
				UPDATE gfi_subscribers SET languages=?, tech_stacks=?, tiers=?, frequency=?, updated_at=CURRENT_TIMESTAMP WHERE id=?
			`, langs, stacks, tiers, frequency, sid); err != nil {
				slog.Error("gfi-prefs save failed", "sid", sid, "err", err)
				c.String(http.StatusInternalServerError, gfiPage("Something went wrong", "Could not save preferences. Try again."))
				return
			}
			c.Header("Content-Type", "text/html; charset=utf-8")
			c.String(http.StatusOK, gfiPage("Preferences saved", "You'll only get alerts matching these preferences."))
			return
		}

		var cur struct {
			Languages sql.NullString `db:"languages"`
			Stacks    sql.NullString `db:"tech_stacks"`
			Tiers     sql.NullString `db:"tiers"`
			Frequency string         `db:"frequency"`
		}
		_ = db.GetContext(c.Request.Context(), &cur, `
			SELECT languages, tech_stacks, tiers, frequency FROM gfi_subscribers WHERE id=?`, sid)
		c.Header("Content-Type", "text/html; charset=utf-8")
		prefsURL := fmt.Sprintf("/api/v1/gfi-alerts/prefs?sid=%d&token=%s", sid, token)
		c.String(http.StatusOK, gfiPage("Alert preferences", "Tell us your stack — we match newly opened good first issues to it.", gfiPrefsFormHTML(prefsURL, cur.Languages.String, cur.Stacks.String, cur.Tiers.String, cur.Frequency)))
	}
}

// GFIUnsubscribeHandler handles GET /api/v1/gfi-alerts/unsubscribe (public,
// emailed link). Valid 90-day HMAC token click = immediate opt-out (AC6).
func GFIUnsubscribeHandler(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		db := middleware.MustDB(c)
		if db == nil {
			return
		}
		sid, ok := notification.VerifyGFIUnsubscribeToken(c.Query("sid"), c.Query("token"), cfg.JobSecret)
		if !ok {
			c.Header("Content-Type", "text/html; charset=utf-8")
			c.String(http.StatusBadRequest, gfiPage("Link expired", "This unsubscribe link is invalid or has expired."))
			return
		}
		if _, err := db.ExecContext(c.Request.Context(),
			`UPDATE gfi_subscribers SET unsubscribed_at=CURRENT_TIMESTAMP, updated_at=CURRENT_TIMESTAMP WHERE id=? AND unsubscribed_at IS NULL`, sid); err != nil {
			slog.Error("gfi-unsubscribe failed", "sid", sid, "err", err)
			c.String(http.StatusInternalServerError, gfiPage("Something went wrong", "Please try again later."))
			return
		}
		c.Header("Content-Type", "text/html; charset=utf-8")
		c.String(http.StatusOK, gfiPage("You're unsubscribed", "You will no longer receive good first issue alerts or digests."))
	}
}

type gfiEmailEventBody struct {
	Type  string `json:"type"`
	Email string `json:"email"`
	Hard  *bool  `json:"hard"`
}

// GFIEmailWebhookHandler handles POST /api/v1/webhooks/email-events (AC5).
// Provider signature: hex HMAC-SHA256(JOB_SECRET, "<ts>.<raw-body>") sent as
// X-Email-Signature with unix timestamp in X-Email-Timestamp. Timestamps older
// than 5 minutes are rejected. Hard bounces count toward auto-disable at 3.
func GFIEmailWebhookHandler(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		db := middleware.MustDB(c)
		if db == nil {
			return
		}
		if cfg.JobSecret == "" {
			c.JSON(http.StatusForbidden, gin.H{"error": "forbidden"})
			return
		}
		tsStr := c.GetHeader("X-Email-Timestamp")
		sig := c.GetHeader("X-Email-Signature")
		ts, err := strconv.ParseInt(tsStr, 10, 64)
		if err != nil || time.Since(time.Unix(ts, 0)) > 5*time.Minute || time.Unix(ts, 0).After(time.Now().Add(time.Minute)) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "stale or invalid timestamp"})
			return
		}
		raw, err := io.ReadAll(io.LimitReader(c.Request.Body, 1<<20))
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "unreadable body"})
			return
		}
		mac := hmac.New(sha256.New, []byte(cfg.JobSecret))
		mac.Write([]byte(tsStr))
		mac.Write([]byte("."))
		mac.Write(raw)
		if !hmac.Equal([]byte(hex.EncodeToString(mac.Sum(nil))), []byte(sig)) {
			c.JSON(http.StatusForbidden, gin.H{"error": "invalid signature"})
			return
		}

		var ev gfiEmailEventBody
		if err := json.Unmarshal(raw, &ev); err != nil || ev.Email == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid payload"})
			return
		}

		switch ev.Type {
		case "bounce":
			hard := true
			if ev.Hard != nil {
				hard = *ev.Hard
			}
			if _, err := notification.ApplyGFIEmailBounce(c.Request.Context(), db, ev.Email, hard); err != nil {
				slog.Error("email-event bounce apply failed", "err", err)
				c.JSON(http.StatusInternalServerError, gin.H{"error": "processing failed"})
				return
			}
		case "complaint":
			if _, err := notification.ApplyGFIEmailBounce(c.Request.Context(), db, ev.Email, true); err != nil {
				slog.Error("email-event complaint apply failed", "err", err)
				c.JSON(http.StatusInternalServerError, gin.H{"error": "processing failed"})
				return
			}
		}
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	}
}

// TriggerGFIDigestHandler handles POST /internal/jobs/gfi-digest: runs the
// weekly GFI digest synchronously, then drains the pending alert queue.
func TriggerGFIDigestHandler(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		db := middleware.MustDB(c)
		if db == nil {
			return
		}
		if cfg.JobSecret == "" || c.GetHeader("X-Job-Secret") != cfg.JobSecret {
			c.JSON(http.StatusForbidden, gin.H{"error": "forbidden"})
			return
		}
		digestCfg := notification.GFIAlertConfig{
			Mailer:    notification.NewSMTPMailer(cfg.SMTPHost, cfg.SMTPPort, cfg.SMTPUser, cfg.SMTPPassword, cfg.SMTPFrom),
			BaseURL:   cfg.AppBaseURL,
			JobSecret: cfg.JobSecret,
		}
		digestSummary, err := notification.RunGFIDigest(c.Request.Context(), db, digestCfg)
		if err != nil {
			slog.Error("gfi-digest run failed", "err", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "digest run failed"})
			return
		}
		queueSummary, err := notification.ProcessGFIEmailQueue(c.Request.Context(), db, digestCfg)
		if err != nil {
			slog.Error("gfi queue drain failed", "err", err)
		}
		c.JSON(http.StatusOK, gin.H{"digest": digestSummary, "queue": queueSummary})
	}
}

// gfiSignupRateLimited enforces AC7: max 5 signup attempts per IP+email per
// hour, tracked in gfi_signup_attempts.
func gfiSignupRateLimited(ctx context.Context, db *sqlx.DB, ip, email string) bool {
	cutoff := time.Now().UTC().Add(-gfiSignupWindow)
	_, _ = db.ExecContext(ctx, `DELETE FROM gfi_signup_attempts WHERE created_at < ?`, cutoff)
	var n int
	if err := db.GetContext(ctx, &n,
		`SELECT COUNT(*) FROM gfi_signup_attempts WHERE ip=? AND email=? AND created_at >= ?`, ip, email, cutoff); err != nil {
		return false // fail open; signup itself is harmless without verification
	}
	_, _ = db.ExecContext(ctx, `INSERT INTO gfi_signup_attempts (ip, email, created_at) VALUES (?, ?, ?)`, ip, email, time.Now().UTC())
	return n >= gfiSignupMaxPerHour
}

func splitCSV(s string) []string {
	return strings.Split(s, ",")
}

func gfiBaseURL(fallback string) string {
	if fallback == "" {
		return "https://getmerged.abhishekco.de"
	}
	return fallback
}

// gfiPage renders a minimal standalone HTML page for verify/prefs/unsubscribe
// flows (no frontend auth required, AC9).
func gfiPage(title, body string, extra ...string) string {
	frag := ""
	for _, f := range extra {
		frag += f
	}
	return fmt.Sprintf(`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>%s</title></head>
<body style="font-family:sans-serif;text-align:center;padding:48px;">
<h2>%s</h2><p style="color:#475569;">%s</p>%s
</body></html>`, html.EscapeString(title), html.EscapeString(title), html.EscapeString(body), frag)
}

func gfiPrefsFormHTML(actionURL, langs, stacks, tiers, frequency string) string {
	tierSet := map[string]bool{}
	for _, t := range strings.Split(strings.ToUpper(tiers), ",") {
		tierSet[strings.TrimSpace(t)] = true
	}
	var tierBoxes strings.Builder
	for _, t := range []string{"S", "A", "B", "C", "D"} {
		checked := ""
		if tierSet[t] {
			checked = " checked"
		}
		tierBoxes.WriteString(fmt.Sprintf(`<label style="margin-right:12px;"><input type="checkbox" name="tiers" value="%s"%s> %s</label>`, t, checked, t))
	}
	instSel, weekSel := "", " selected"
	if frequency == "instant" {
		instSel, weekSel = " selected", ""
	}
	return fmt.Sprintf(`<form method="POST" action="%s" style="display:inline-block;text-align:left;margin-top:16px;">
<p><label>Languages (comma-separated)<br><input name="languages" value="%s" placeholder="Go, Rust, TypeScript" style="width:280px;"></label></p>
<p><label>Tech stacks / topics (optional)<br><input name="tech_stacks" value="%s" placeholder="web, kubernetes" style="width:280px;"></label></p>
<p>C-Rank tiers you want:<br>%s</p>
<p><label>Delivery<br><select name="frequency"><option value="weekly"%s>Weekly digest</option><option value="instant"%s>Instant alerts</option></select></label></p>
<p><button type="submit" style="background:#0284c7;color:#fff;border:0;padding:10px 18px;border-radius:6px;font-weight:bold;">Save preferences</button></p>
</form>`,
		html.EscapeString(actionURL), html.EscapeString(langs), html.EscapeString(stacks), tierBoxes.String(), weekSel, instSel)
}
