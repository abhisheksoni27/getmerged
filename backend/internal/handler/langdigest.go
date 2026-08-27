package handler

import (
	"context"
	"encoding/json"
	"fmt"
	"html"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/abhisheksoni27/opendoor/internal/config"
	"github.com/abhisheksoni27/opendoor/internal/middleware"
	"github.com/abhisheksoni27/opendoor/internal/notification"
	"github.com/gin-gonic/gin"
	"log/slog"
)

// clientRealIP returns the real client IP: X-Forwarded-For first (leftmost),
// falling back to the socket IP (AC3).
func clientRealIP(c *gin.Context) string {
	if xff := c.GetHeader("X-Forwarded-For"); xff != "" {
		if idx := strings.IndexByte(xff, ','); idx >= 0 {
			return strings.TrimSpace(xff[:idx])
		}
		return strings.TrimSpace(xff)
	}
	return c.ClientIP()
}

// verifyCaptcha performs server-side CAPTCHA verification (AC4). When no secret
// is configured the check is disabled (dev/test). A configured CaptchaTestToken
// is always accepted so automated sanity flows can pass without a live
// challenge. Otherwise the token is verified against the provider
// (Cloudflare Turnstile by default).
func verifyCaptcha(cfg *config.Config, token, ip string) bool {
	if cfg == nil || cfg.CaptchaSecret == "" {
		return true // disabled
	}
	if cfg.CaptchaTestToken != "" && token == cfg.CaptchaTestToken {
		return true
	}
	if token == "" {
		return false
	}
	verifyURL := cfg.CaptchaVerifyURL
	if verifyURL == "" {
		verifyURL = "https://challenges.cloudflare.com/turnstile/v0/siteverify"
	}
	form := url.Values{}
	form.Set("secret", cfg.CaptchaSecret)
	form.Set("response", token)
	if ip != "" {
		form.Set("remoteip", ip)
	}
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, verifyURL, strings.NewReader(form.Encode()))
	if err != nil {
		return false
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		slog.Warn("captcha verify request failed", "err", err)
		return false
	}
	defer resp.Body.Close()
	var out struct {
		Success bool `json:"success"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&out); err != nil {
		return false
	}
	return out.Success
}

type langDigestSubscribeBody struct {
	Email        string `json:"email"`
	Language     string `json:"language"`
	Website      string `json:"website"`       // honeypot: must stay empty
	CaptchaToken string `json:"captcha_token"` // server-verified (AC4)
}

// LangDigestSubscribeHandler handles POST /api/subscribe (public).
// Enforces: honeypot empty, server-side CAPTCHA, per-IP 5/min rate limit,
// email normalization + case-insensitive dedup, double opt-in pending row +
// confirmation email with single-use HMAC token (AC2, AC3, AC4, AC5, AC10).
func LangDigestSubscribeHandler(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		db := middleware.MustDB(c)
		if db == nil {
			return
		}
		if c.Request.ContentLength > 4096 {
			c.JSON(http.StatusRequestEntityTooLarge, gin.H{"error": "payload too large"})
			return
		}
		c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, 4096)
		var body langDigestSubscribeBody
		if err := c.ShouldBindJSON(&body); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
			return
		}
		// AC3: honeypot — filled fields are bots; reject silently-ish.
		if strings.TrimSpace(body.Website) != "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "spam detected"})
			return
		}
		// AC4: server-side CAPTCHA verification.
		if !verifyCaptcha(cfg, body.CaptchaToken, clientRealIP(c)) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "captcha verification failed"})
			return
		}
		email, ok := notification.ValidateLangDigestEmail(body.Email)
		if !ok {
			c.JSON(http.StatusBadRequest, gin.H{"error": "valid email required"})
			return
		}
		// AC3: per-IP 5/min rate limit (real client IP).
		if notification.LangDigestRateLimited(c.Request.Context(), db, clientRealIP(c)) {
			c.JSON(http.StatusTooManyRequests, gin.H{"error": "too many requests, try again later"})
			return
		}

		secrets := cfg.EmailTokenKeys()
		sid, confirmToken, err := notification.LangDigestSubscribe(c.Request.Context(), db, email, body.Language, secrets[0])
		if err != nil {
			slog.Error("lang-digest subscribe failed", "err", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "signup failed"})
			return
		}

		confirmURL := notification.LangDigestConfirmURL(cfg.AppBaseURL, sid, confirmToken)
		mailer := notification.NewSMTPMailer(cfg.SMTPHost, cfg.SMTPPort, cfg.SMTPUser, cfg.SMTPPassword, cfg.SMTPFrom)
		addrFoot := ""
		if strings.TrimSpace(cfg.SMTPPhysicalAddress) != "" {
			addrFoot = "\n\nGetMerged · Physical sender address: " + cfg.SMTPPhysicalAddress
		}
		langName := strings.TrimSpace(body.Language)
		if langName == "" {
			langName = "open-source"
		}
		subject := fmt.Sprintf("Confirm your weekly %s digest from GetMerged", langName)
		text := fmt.Sprintf("Confirm your subscription to the GetMerged weekly %s digest:\n\n%s\n\nThis single-use link expires in 24 hours. You will not receive any digest until you confirm.%s", langName, confirmURL, addrFoot)
		htmlB := fmt.Sprintf(`<div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
 <h2>Confirm your subscription</h2><p>Click below to start receiving the weekly top welcoming %s repositories and fresh good first issues.</p>
 <p><a href="%s" style="background:#0284c7;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none;font-weight:bold;">Confirm subscription</a></p>
 <p style="font-size:12px;color:#94a3b8;">Single-use link, expires in 24 hours.%s</p></div>`,
			html.EscapeString(langName), html.EscapeString(confirmURL), html.EscapeString(addrFoot))
		if err := mailer.Send(c.Request.Context(), email, subject, text, htmlB); err != nil {
			slog.Error("lang-digest confirm email failed", "sid", sid, "err", err)
			// Subscription is recorded; surface a soft success so the
			// double opt-in still completes on a later resend.
			c.JSON(http.StatusOK, gin.H{"status": "verification_queued"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"status": "verification_sent"})
	}
}

// LangDigestConfirmHandler handles GET /api/confirm (public, emailed link).
// Verifies the single-use token, marks the subscriber active, then triggers the
// per-language weekly digest immediately (AC5/AC6).
func LangDigestConfirmHandler(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		db := middleware.MustDB(c)
		c.Header("Content-Type", "text/html; charset=utf-8")
		if db == nil {
			c.String(http.StatusOK, langDigestPage("Something went wrong", "Please try again later."))
			return
		}
		sid, ok := parseGFISid(c.Query("sid"))
		if !ok {
			c.String(http.StatusBadRequest, langDigestPage("Link expired", "This confirmation link is invalid."))
			return
		}
		secrets := cfg.EmailTokenKeys()
		sub, err := notification.LangDigestConfirm(c.Request.Context(), db, sid, c.Query("token"), secrets[0], secrets[1:]...)
		if err != nil {
			c.String(http.StatusBadRequest, langDigestPage("Link expired", "This confirmation link is invalid or has expired. Sign up again to get a fresh one."))
			return
		}
		// AC6: trigger the per-language weekly digest for this subscriber.
		mailer := notification.NewSMTPMailer(cfg.SMTPHost, cfg.SMTPPort, cfg.SMTPUser, cfg.SMTPPassword, cfg.SMTPFrom)
		digCfg := notification.LangDigestMailerConfig{
			Mailer:          mailer,
			BaseURL:         cfg.AppBaseURL,
			PhysicalAddress: cfg.SMTPPhysicalAddress,
		}
		if serr := notification.SendLangDigestToSubscriber(c.Request.Context(), db, digCfg, sub, secrets[0]); serr != nil {
			slog.Warn("lang-digest welcome send failed", "sid", sid, "err", serr)
		}
		c.String(http.StatusOK, langDigestPage("Subscription confirmed",
			fmt.Sprintf("You're in. Your first weekly %s digest is on its way.", sub.Language)))
	}
}

// LangDigestUnsubscribeHandler handles GET /api/unsubscribe (public, emailed
// link). Single-use token; soft-deletes (unsubscribed_at + active=false) and
// stamps the 30-day GDPR consent window (AC7/AC8). Renders a GDPR hard-delete
// link carrying a fresh single-use token.
func LangDigestUnsubscribeHandler(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		db := middleware.MustDB(c)
		c.Header("Content-Type", "text/html; charset=utf-8")
		if db == nil {
			c.String(http.StatusOK, langDigestPage("Unsubscribe", "We could not process this request right now."))
			return
		}
		sid, ok := parseGFISid(c.Query("sid"))
		if !ok {
			c.String(http.StatusOK, langDigestPage("Link not recognized", "This unsubscribe link is invalid."))
			return
		}
		keys := cfg.UnsubscribeKeys()
		err := notification.LangDigestUnsubscribe(c.Request.Context(), db, sid, c.Query("token"), keys[0], keys[1:]...)
		if err != nil {
			c.String(http.StatusOK, langDigestPage("Link not recognized", "This unsubscribe link is invalid or was already used."))
			return
		}
		// AC8: issue a single-use GDPR hard-delete token + link.
		gdprToken := notification.LangDigestGDPRToken(sid, keys[0])
		exp := time.Now().UTC().Add(notification.LangDigestGDPRTTL).Unix()
		if gerr := notification.StoreLangDigestGDPRToken(c.Request.Context(), db, sid, gdprToken, exp); gerr != nil {
			slog.Warn("lang-digest gdpr token store failed", "sid", sid, "err", gerr)
		}
		gdprURL := fmt.Sprintf("%s/api/gdpr-delete?sid=%d&token=%s", strings.TrimRight(cfg.AppBaseURL, "/"), sid, gdprToken)
		c.String(http.StatusOK, langDigestPage("You're unsubscribed",
			"You will no longer receive this weekly digest.",
			fmt.Sprintf(`<p style="font-size:12px;color:#94a3b8;">Want your data erased entirely? <a href="%s" style="color:#64748b;">Delete my data</a> (right to erasure).</p>`, html.EscapeString(gdprURL))))
	}
}

// LangDigestGDPRDeleteHandler handles GET /api/gdpr-delete (public, emailed
// link). Hard-deletes the subscriber + consent record only via a valid
// single-use token (AC8).
func LangDigestGDPRDeleteHandler(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		db := middleware.MustDB(c)
		c.Header("Content-Type", "text/html; charset=utf-8")
		if db == nil {
			c.String(http.StatusOK, langDigestPage("Delete data", "We could not process this request right now."))
			return
		}
		sid, ok := parseGFISid(c.Query("sid"))
		if !ok {
			c.String(http.StatusOK, langDigestPage("Link not recognized", "This delete link is invalid."))
			return
		}
		keys := cfg.UnsubscribeKeys()
		if err := notification.LangDigestGDPRDelete(c.Request.Context(), db, sid, c.Query("token"), keys[0], keys[1:]...); err != nil {
			c.String(http.StatusOK, langDigestPage("Link not recognized", "This delete link is invalid or was already used."))
			return
		}
		c.String(http.StatusOK, langDigestPage("Your data has been deleted", "All records for this subscription have been permanently removed."))
	}
}

// langDigestPage renders a minimal standalone HTML page (no auth required).
func langDigestPage(title, body string, extra ...string) string {
	frag := ""
	for _, f := range extra {
		frag += f
	}
	return fmt.Sprintf(`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>%s</title></head>
<body style="font-family:sans-serif;text-align:center;padding:48px;">
<h2>%s</h2><p style="color:#475569;">%s</p>%s
</body></html>`, html.EscapeString(title), html.EscapeString(title), html.EscapeString(body), frag)
}
