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
	ghclient "github.com/abhisheksoni27/opendoor/internal/github"
	"github.com/abhisheksoni27/opendoor/internal/config"
	"github.com/abhisheksoni27/opendoor/internal/middleware"
	"github.com/abhisheksoni27/opendoor/internal/notification"
	"github.com/gin-gonic/gin"
	"github.com/jmoiron/sqlx"
)

const (
	gfiSignupMaxPerHour = 5 // AC7: signup rate limit per IP+email
	gfiSignupWindow     = time.Hour
	// AC6: subscribe/prefs endpoints are rate-limited per IP per minute.
	gfiIPMaxPerMin  = 10
	gfiIPRateWindow = time.Minute
	// AC1: subscribe request bodies are capped at 4KB.
	gfiMaxBodyBytes = 4096
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

		// AC1: validated payload, hard 4KB body cap.
		if c.Request.ContentLength > gfiMaxBodyBytes {
			c.JSON(http.StatusRequestEntityTooLarge, gin.H{"error": "payload too large"})
			return
		}
		c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, gfiMaxBodyBytes)
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
		// AC6: max 10 subscribe calls/min/IP.
		if gfiIPRateLimited(c.Request.Context(), db, c.ClientIP(), "subscribe") {
			c.JSON(http.StatusTooManyRequests, gin.H{"error": "too many requests, try again later"})
			return
		}

		frequency := body.Frequency
		if frequency != "instant" && frequency != "weekly" && frequency != "both" {
			frequency = "weekly"
		}
		// AC1: enforce the prefs schema before persisting — max 20 items per
		// list, items ≤50 chars, C-Rank tier enum; anything else is a 400.
		if err := notification.ValidateGFIPrefs(body.Languages, body.TechStacks, body.Tiers); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		languages := notification.NormalizeGFIList(body.Languages)
		stacks := notification.NormalizeGFIList(body.TechStacks)
		tiers := notification.NormalizeGFITiers(body.Tiers)
		languages, stacks, tiers = capGFIPrefLists(languages, stacks, tiers)

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
			Email      string     `db:"email"`
			VerifiedAt *time.Time `db:"verified_at"`
		}
		if err := db.GetContext(c.Request.Context(), &sub,
			`SELECT id, email, verified_at FROM gfi_subscribers WHERE LOWER(email)=?`, email); err != nil {
			slog.Error("gfi-subscribe: lookup failed", "err", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "signup failed"})
			return
		}

		if sub.VerifiedAt != nil {
			c.JSON(http.StatusOK, gin.H{"status": "already_verified"})
			return
		}

		verifyURL := fmt.Sprintf("%s/api/v1/gfi-alerts/verify?sid=%d&token=%s",
			strings.TrimRight(gfiBaseURL(cfg.AppBaseURL), "/"), sub.ID, notification.GFIVerifyToken(sub.ID, cfg.EmailTokenKey))
		mailer := notification.NewSMTPMailer(cfg.SMTPHost, cfg.SMTPPort, cfg.SMTPUser, cfg.SMTPPassword, cfg.SMTPFrom)
		subject := "Confirm your good first issue alerts"
		addrFoot := ""
		if strings.TrimSpace(cfg.SMTPPhysicalAddress) != "" {
			addrFoot = "\n\nGetMerged · Physical sender address: " + cfg.SMTPPhysicalAddress
		}
		text := "Confirm your subscription to GetMerged good first issue alerts:\n\n" + verifyURL +
			"\n\nThis single-use link expires in 24 hours. You will not receive any alerts until you confirm." + addrFoot
		htmlB := fmt.Sprintf(`<div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
<h2>Confirm your subscription</h2><p>Click below to start receiving good first issue alerts matched to your stack.</p>
<p><a href="%s" title="Confirm email subscription" style="background:#0284c7;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none;font-weight:bold;">Confirm subscription</a></p>
<p style="font-size:12px;color:#94a3b8;">Single-use link, expires in 24 hours.%s</p></div>`, verifyURL, func() string {
			if addrFoot == "" {
				return ""
			}
			return "<br>Physical sender address: " + html.EscapeString(cfg.SMTPPhysicalAddress)
		}())
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
		emailKeys := cfg.EmailTokenKeys()
		sid, ok := notification.VerifyGFIVerifyToken(c.Query("sid"), c.Query("token"), emailKeys[0], emailKeys[1:]...)
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
			currentEmail, _ := gfiSubscriberEmailByID(c.Request.Context(), db, sid)
			c.Header("Content-Type", "text/html; charset=utf-8")
			c.String(http.StatusOK, gfiPage("Already verified", "Your subscription is already confirmed. Manage your preferences below.",
				fmt.Sprintf(`<p><a href="%s/api/v1/gfi-alerts/prefs?sid=%d&token=%s" title="Manage alert preferences">Manage preferences</a></p>`,
					gfiBaseURL(cfg.AppBaseURL), sid, notification.GFIUnsubscribeToken(sid, currentEmail, cfg.UnsubscribeKey))))
			return
		}

		complete := gfiSubscriberPrefsComplete(c.Request.Context(), db, sid)
		if !complete {
			c.Header("Content-Type", "text/html; charset=utf-8")
			prefsURL := fmt.Sprintf("/api/v1/gfi-alerts/prefs?sid=%d&token=%s", sid, notification.GFIVerifyToken(sid, cfg.EmailTokenKey))
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
// never re-enable sends (AC8). Prefs changes require a confirmed session
// token (verify or unsubscribe link) bound to the live subscriber (AC4/AC6).
func GFIPrefsHandler(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		db := middleware.MustDB(c)
		if db == nil {
			return
		}
		sidStr, token := c.Query("sid"), c.Query("token")
		emailKeys := cfg.EmailTokenKeys()
		unsubKeys := cfg.UnsubscribeKeys()
		sidV, okV := notification.VerifyGFIVerifyToken(sidStr, token, emailKeys[0], emailKeys[1:]...)
		sidU, okU := int64(0), false
		if !okV {
			// Unsubscribe tokens are bound to subscriber_id + email hash
			// (AC4): verify against the live subscriber record's current
			// email so revoked subscribers invalidate outstanding links.
			if sidCand, okParse := parseGFISid(sidStr); okParse {
				if em, found := gfiSubscriberEmailByID(c.Request.Context(), db, sidCand); found {
					sidU, okU = notification.VerifyGFIUnsubscribeToken(sidStr, token, em, unsubKeys[0], unsubKeys[1:]...)
				}
			}
		}
		if !okV && !okU {
			c.Header("Content-Type", "text/html; charset=utf-8")
			c.String(http.StatusBadRequest, gfiPage("Link expired", "This preference link is invalid or has expired."))
			return
		}
		sid := sidV
		if !okV {
			sid = sidU
		}

		// AC6: max 10 prefs calls/min/IP.
		if gfiIPRateLimited(c.Request.Context(), db, c.ClientIP(), "prefs") {
			c.Header("Content-Type", "text/html; charset=utf-8")
			c.String(http.StatusTooManyRequests, gfiPage("Too many requests", "Please wait a minute before trying again."))
			return
		}

		if c.Request.Method == http.MethodPost {
			// AC1: same prefs schema as subscribe (20 items/list, ≤50 chars,
			// tier enum); violations render a 400 page.
			if err := notification.ValidateGFIPrefs(splitCSV(c.PostForm("languages")), splitCSV(c.PostForm("tech_stacks")), c.PostFormArray("tiers")); err != nil {
				c.Header("Content-Type", "text/html; charset=utf-8")
				c.String(http.StatusBadRequest, gfiPage("Invalid preferences", err.Error()))
				return
			}
			langs := notification.NormalizeGFIList(splitCSV(c.PostForm("languages")))
			stacks := notification.NormalizeGFIList(splitCSV(c.PostForm("tech_stacks")))
			tiers := notification.NormalizeGFITiers(c.PostFormArray("tiers"))
			langs, stacks, tiers = capGFIPrefLists(langs, stacks, tiers)
			frequency := c.PostForm("frequency")
			if frequency != "instant" && frequency != "weekly" && frequency != "both" {
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

// GFIUnsubscribeHandler handles GET and POST /api/v1/gfi-alerts/unsubscribe
// (public, emailed link + RFC 8058 one-click POST). Tokens are HMAC-signed,
// expire after 30 days and are bound to subscriber_id + the subscriber's
// current email hash; revoking the subscriber or rotating the signing secret
// invalidates outstanding tokens because verification runs against the live
// record and current key chain (AC4). The page ALWAYS returns HTTP 200, even
// for invalid or expired-looking tokens. A valid click sets prefs.opt_out=true.
func GFIUnsubscribeHandler(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		db := middleware.MustDB(c)
		c.Header("Content-Type", "text/html; charset=utf-8")
		if db == nil {
			c.String(http.StatusOK, gfiPage("Unsubscribe", "We could not process this request right now."))
			return
		}
		sidQ, okQ := parseGFISid(c.Query("sid"))
		var currentEmail string
		if okQ {
			if em, found := gfiSubscriberEmailByID(c.Request.Context(), db, sidQ); found {
				currentEmail = em
			}
		}
		sid, ok := notification.VerifyGFIUnsubscribeToken(c.Query("sid"), c.Query("token"), currentEmail, cfg.UnsubscribeKey, cfg.UnsubscribeKeys()[1:]...)
		if !ok || currentEmail == "" {
			c.String(http.StatusOK, gfiPage("Link not recognized", "This unsubscribe link is invalid or was already used. No further emails will be sent to addresses that opted out."))
			return
		}
		if _, err := db.ExecContext(c.Request.Context(),
			`UPDATE gfi_subscribers SET opt_out=TRUE, unsubscribed_at=CURRENT_TIMESTAMP, updated_at=CURRENT_TIMESTAMP WHERE id=? AND opt_out=FALSE`, sid); err != nil {
			slog.Error("gfi-unsubscribe failed", "sid", sid, "err", err)
			c.String(http.StatusOK, gfiPage("Unsubscribe", "We could not process this request right now."))
			return
		}
		c.String(http.StatusOK, gfiPage("You're unsubscribed", "You will no longer receive good first issue alerts or digests."))
	}
}

// GFIUnsubscribeShortHandler implements the AC6 short unsubscribe scheme:
// GET/POST /u/{userId}?sig=HMAC(secret, userId+expiry30d), also mounted at
// /api/v1/gfi-alerts/unsubscribe-short?uid={userId} for the frontend proxy.
// A valid signature unsubscribes instantly; invalid or expired signatures
// render a generic error page with zero user-existence feedback.
func GFIUnsubscribeShortHandler(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		db := middleware.MustDB(c)
		c.Header("Content-Type", "text/html; charset=utf-8")
		notRecognized := func() {
			c.String(http.StatusOK, gfiPage("Link not recognized", "This unsubscribe link is invalid or has expired."))
		}
		if db == nil {
			notRecognized()
			return
		}
		uidStr := c.Query("uid")
		if uidStr == "" {
			uidStr = c.Param("userid")
		}
		keys := cfg.UnsubscribeKeys()
		sid, ok := notification.VerifyGFIUnsubscribeSig(uidStr, c.Query("sig"), keys[0], keys[1:]...)
		if !ok || sid <= 0 {
			notRecognized()
			return
		}
		if _, err := db.ExecContext(c.Request.Context(),
			`UPDATE gfi_subscribers SET opt_out=TRUE, unsubscribed_at=CURRENT_TIMESTAMP, updated_at=CURRENT_TIMESTAMP WHERE id=? AND opt_out=FALSE`, sid); err != nil {
			slog.Error("gfi-short-unsubscribe failed", "sid", sid, "err", err)
			notRecognized()
			return
		}
		c.String(http.StatusOK, gfiPage("You're unsubscribed", "You will no longer receive good first issue alerts or digests."))
	}
}

// GFIClaimLinkHandler handles GET /api/v1/gfi-alerts/claim (AC4, AC5).
// Links never hard-fail: a first valid click consumes the token and
// live-checks the issue on GitHub — if it is still open and unassigned the
// user lands on the repo page; if it was claimed/closed in the meantime they
// get an 'already taken' page listing 3 similar open good first issues.
// Reused/expired links for a known issue render the same fallback instead of
// an error.
func GFIClaimLinkHandler(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		db := middleware.MustDB(c)
		c.Header("Content-Type", "text/html; charset=utf-8")
		token := strings.TrimSpace(c.Query("token"))
		base := gfiBaseURL(cfg.AppBaseURL)
		loginPrompt := fmt.Sprintf(`<p><a href="%s/" title="Log in to GetMerged" style="color:#0284c7;font-weight:bold;">Log in</a> to start contributing.</p>`, base)
		if db == nil || token == "" {
			c.String(http.StatusOK, gfiPage("Invalid claim link", "This Claim & Setup link is invalid.", loginPrompt))
			return
		}
		ctx := c.Request.Context()
		now := time.Now().UTC()
		link := notification.LookupGFIClaimLink(ctx, db, token, now)

		if notification.ConsumeGFIClaimLink(ctx, db, token, now) != "" && link != nil {
			// First valid click: live-check before sending the contributor in.
			if gfiIssueAlive(cfg, link.FullName, link.IssueNumber) {
				c.Redirect(http.StatusFound, "/"+link.FullName)
				return
			}
			c.String(http.StatusOK, gfiAlreadyTakenPage(cfg, db, base, link.RepoID, link.FullName, link.IssueNumber))
			return
		}

		if link == nil {
			c.String(http.StatusOK, gfiPage("Invalid or expired link", "This Claim & Setup link is invalid. Open the latest alert email for a fresh link.", loginPrompt))
			return
		}
		// Known but consumed/expired: never hard-fail — if the issue is gone,
		// show similar open issues; otherwise point at the repo page.
		if !gfiIssueAlive(cfg, link.FullName, link.IssueNumber) {
			c.String(http.StatusOK, gfiAlreadyTakenPage(cfg, db, base, link.RepoID, link.FullName, link.IssueNumber))
			return
		}
		if link.Consumed {
			repoURL := fmt.Sprintf("%s/%s", base, link.FullName)
			c.String(http.StatusOK, gfiPage("Link already used",
				"This Claim & Setup link has already been opened once. The issue is still open — head straight to it.",
				fmt.Sprintf(`<p><a href="%s" title="View %s on GetMerged" style="color:#0284c7;font-weight:bold;">Open %s</a></p>%s`,
					html.EscapeString(repoURL), html.EscapeString(link.FullName), html.EscapeString(link.FullName), loginPrompt)))
			return
		}
		c.String(http.StatusOK, gfiPage("Link expired", "This Claim & Setup link has expired. Open the latest alert email for a fresh one.", loginPrompt))
	}
}

// gfiIssueAlive reports whether the GitHub issue is still open and
// unassigned (AC4 live-check). API failures fail open so a flaky API never
// blocks a valid click.
func gfiIssueAlive(cfg *config.Config, fullName string, issueNo int) bool {
	parts := strings.Split(fullName, "/")
	if len(parts) != 2 || parts[0] == "" || parts[1] == "" || issueNo <= 0 {
		return false
	}
	client := ghclient.NewClient(cfg.GithubToken, nil)
	open, unassigned, err := client.FetchIssueOpenUnassigned(parts[0], parts[1], issueNo)
	if err != nil {
		return true
	}
	return open && unassigned
}

type gfiSimilarIssue struct {
	Title    string
	URL      string
	FullName string
}

// gfiSimilarOpenIssues returns up to 3 alternative open good first issues on
// the same repo for the 'already taken' fallback page (AC4). Best-effort:
// query errors yield an empty list, never a panic.
func gfiSimilarOpenIssues(ctx context.Context, db *sqlx.DB, repoID string, excludeIssue int) []gfiSimilarIssue {
	var rows []struct {
		Title    string `db:"title"`
		URL      string `db:"url"`
		FullName string `db:"full_name"`
	}
	if err := db.SelectContext(ctx, &rows, `
		SELECT g.title, g.url, r.full_name
		FROM repo_good_first_issues g
		JOIN repositories r ON r.id = g.repository_id
		WHERE g.repository_id = ? AND g.issue_number <> ?
		ORDER BY g.quality_score DESC, g.created_at DESC
		LIMIT 3
	`, repoID, excludeIssue); err != nil {
		return nil
	}
	out := make([]gfiSimilarIssue, 0, len(rows))
	for _, r := range rows {
		out = append(out, gfiSimilarIssue{Title: r.Title, URL: r.URL, FullName: r.FullName})
	}
	return out
}

// gfiAlreadyTakenPage renders the 'already taken' fallback with 3 similar
// open issues (AC4).
func gfiAlreadyTakenPage(cfg *config.Config, db *sqlx.DB, base, repoID, fullName string, issueNo int) string {
	var list strings.Builder
	similar := gfiSimilarOpenIssues(context.Background(), db, repoID, issueNo)
	if len(similar) > 0 {
		list.WriteString("<p style='text-align:left;'>Try one of these open issues instead:</p><ul style='text-align:left;display:inline-block;'>")
		for _, s := range similar {
			list.WriteString(fmt.Sprintf(`<li><a href="%s" title="View good first issue on GitHub" style="color:#0284c7;">%s — %s</a></li>`,
				html.EscapeString(s.URL), html.EscapeString(fullName), html.EscapeString(s.Title)))
		}
		list.WriteString("</ul>")
	}
	repoURL := fmt.Sprintf("%s/%s", base, fullName)
	return gfiPage("Already taken",
		fmt.Sprintf("That issue has since been claimed or closed. The maintainers of %s are still responsive — browse their other open issues.", fullName),
		list.String()+fmt.Sprintf(`<p><a href="%s" title="View repository scorecard" style="color:#0284c7;font-weight:bold;">View %s scorecard</a></p>`,
			html.EscapeString(repoURL), html.EscapeString(fullName)))
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
			c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid signature"})
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

// ListGFIPausedSubscribersHandler serves GET /internal/jobs/gfi-paused (AC7):
// the admin view of subscribers auto-paused after 3 consecutive hard bounces
// plus anyone close to the threshold. Mounted inside the internal group, so
// middleware.Auth already gates it.
func ListGFIPausedSubscribersHandler(cfg *config.Config) gin.HandlerFunc {
	_ = cfg
	return func(c *gin.Context) {
		db := middleware.MustDB(c)
		if db == nil {
			return
		}
		var rows []gin.H
		type pausedRow struct {
			ID           int64        `db:"id"`
			Email        string       `db:"email"`
			HardBounces  int          `db:"hard_bounces"`
			SoftBounces  int          `db:"soft_bounces"`
			Disabled     bool         `db:"disabled"`
			Frequency    string       `db:"frequency"`
			Unsubscribed sql.NullTime `db:"unsubscribed_at"`
		}
		var subs []pausedRow
		if err := db.SelectContext(c.Request.Context(), &subs, `
			SELECT id, email, hard_bounces, soft_bounces, disabled, frequency, unsubscribed_at
			FROM gfi_subscribers
			WHERE disabled = TRUE OR hard_bounces > 0
			ORDER BY hard_bounces DESC, id ASC LIMIT 500
		`); err != nil {
			slog.Error("gfi-paused list failed", "err", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "query failed"})
			return
		}
		for _, s := range subs {
			status := "flagged"
			if s.Disabled {
				status = "paused"
			}
			rows = append(rows, gin.H{
				"id":            s.ID,
				"email":         s.Email,
				"status":        status,
				"hard_bounces":  s.HardBounces,
				"soft_bounces":  s.SoftBounces,
				"frequency":     s.Frequency,
				"unsubscribed_at": s.Unsubscribed,
			})
		}
		c.JSON(http.StatusOK, gin.H{"subscribers": rows})
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
			Mailer:          notification.NewSMTPMailer(cfg.SMTPHost, cfg.SMTPPort, cfg.SMTPUser, cfg.SMTPPassword, cfg.SMTPFrom),
			BaseURL:         cfg.AppBaseURL,
			JobSecret:       cfg.JobSecret,
			UnsubscribeKey:  cfg.UnsubscribeKey,
			PhysicalAddress: cfg.SMTPPhysicalAddress,
			GitHub:          ghclient.NewClient(cfg.GithubToken, nil),
			AdminEmail:      cfg.AdminEmail,
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

// gfiIPRateLimited enforces AC6: max gfiIPMaxPerMin requests per IP per
// minute per endpoint, tracked in gfi_endpoint_rate_limits. Fails open on
// storage errors so a rate-limit store outage never breaks the endpoints.
func gfiIPRateLimited(ctx context.Context, db *sqlx.DB, ip, endpoint string) bool {
	cutoff := time.Now().UTC().Add(-gfiIPRateWindow)
	_, _ = db.ExecContext(ctx, `DELETE FROM gfi_endpoint_rate_limits WHERE created_at < ?`, cutoff.Add(-time.Minute))
	var n int
	if err := db.GetContext(ctx, &n,
		`SELECT COUNT(*) FROM gfi_endpoint_rate_limits WHERE ip=? AND endpoint=? AND created_at >= ?`, ip, endpoint, cutoff); err != nil {
		return false
	}
	_, _ = db.ExecContext(ctx,
		`INSERT INTO gfi_endpoint_rate_limits (ip, endpoint, created_at) VALUES (?, ?, ?)`, ip, endpoint, time.Now().UTC())
	return n >= gfiIPMaxPerMin
}

// parseGFISid parses a subscriber id from a signed-link query parameter.
func parseGFISid(sidStr string) (int64, bool) {
	var sid int64
	if _, err := fmt.Sscanf(strings.TrimSpace(sidStr), "%d", &sid); err != nil || sid <= 0 {
		return 0, false
	}
	return sid, true
}

// gfiSubscriberEmailByID returns the current email of a live subscriber
// record (AC4 token binding); missing rows report found=false so tokens of
// revoked subscribers fail verification.
func gfiSubscriberEmailByID(ctx context.Context, db *sqlx.DB, sid int64) (string, bool) {
	var email string
	if err := db.GetContext(ctx, &email, `SELECT email FROM gfi_subscribers WHERE id = ?`, sid); err != nil || strings.TrimSpace(email) == "" {
		return "", false
	}
	return email, true
}

// capGFIPrefLists enforces AC6: at most 50 languages/stacks/tiers entries in
// total. Overflow is trimmed from tech stacks first, then languages; valid
// tiers (max 5) are always kept.
func capGFIPrefLists(langs, stacks, tiers string) (string, string, string) {
	toList := func(csv string) []string {
		out := []string{}
		for _, p := range strings.Split(csv, ",") {
			if v := strings.TrimSpace(p); v != "" {
				out = append(out, v)
			}
		}
		return out
	}
	l, s, t := toList(langs), toList(stacks), toList(tiers)
	if len(l)+len(s)+len(t) <= notification.MaxGFIPrefItems {
		return langs, stacks, tiers
	}
	budget := notification.MaxGFIPrefItems - len(t)
	if budget < 0 {
		budget = 0
	}
	if len(l) > budget {
		l = l[:budget]
		s = nil
	} else if remaining := budget - len(l); len(s) > remaining {
		s = s[:remaining]
	}
	return strings.Join(l, ","), strings.Join(s, ","), strings.Join(t, ",")
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
	instSel, weekSel, bothSel := "", " selected", ""
	if frequency == "instant" {
		instSel, weekSel, bothSel = " selected", "", ""
	} else if frequency == "both" {
		instSel, weekSel, bothSel = "", "", " selected"
	}
	return fmt.Sprintf(`<form method="POST" action="%s" style="display:inline-block;text-align:left;margin-top:16px;">
<p><label>Languages (comma-separated)<br><input name="languages" value="%s" placeholder="Go, Rust, TypeScript" style="width:280px;"></label></p>
<p><label>Tech stacks / topics (optional)<br><input name="tech_stacks" value="%s" placeholder="web, kubernetes" style="width:280px;"></label></p>
<p>C-Rank tiers you want:<br>%s</p>
<p><label>Delivery<br><select name="frequency"><option value="weekly"%s>Weekly digest</option><option value="instant"%s>Instant alerts</option><option value="both"%s>Both digest + instant</option></select></label></p>
<p><button type="submit" style="background:#0284c7;color:#fff;border:0;padding:10px 18px;border-radius:6px;font-weight:bold;">Save preferences</button></p>
</form>`,
		html.EscapeString(actionURL), html.EscapeString(langs), html.EscapeString(stacks), tierBoxes.String(), weekSel, instSel, bothSel)
}
