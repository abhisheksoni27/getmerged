package notification

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"fmt"
	"log/slog"
	"strings"
	"time"

	"github.com/jmoiron/sqlx"
)

// Language digest token TTLs (AC5/AC7).
const (
	LangDigestConfirmTTL = 24 * time.Hour
	LangDigestUnsubTTL   = 30 * 24 * time.Hour
	LangDigestGDPRTTL    = 30 * 24 * time.Hour
)

// langDigestScopes namespace the HMAC MACs per token purpose.
const (
	langConfirmScope = "langconfirm"
	langUnsubScope   = "langunsub"
	langGDPRScope    = "langgdpr"
)

// langDigestToken builds an "exp.hmac" single-use token bound to sid+scope.
func langDigestToken(sid int64, scope, secret string, exp time.Time) string {
	expUnix := exp.UTC().Unix()
	mac := hmac.New(sha256.New, []byte(secret))
	fmt.Fprintf(mac, "%s:%d:%d", scope, sid, expUnix)
	return fmt.Sprintf("%d.%s", expUnix, hex.EncodeToString(mac.Sum(nil)))
}

// langDigestSignToken signs a token for a known sid (server-issued).
func langDigestSignToken(sid int64, scope, secret string, ttl time.Duration) string {
	return langDigestToken(sid, scope, secret, time.Now().UTC().Add(ttl))
}

// tokenHash returns the sha256 hex of a raw token for the single-use ledger.
func tokenHash(raw string) string {
	sum := sha256.Sum256([]byte(raw))
	return hex.EncodeToString(sum[:])
}

// LangDigestConfirmToken issues a 24h single-use confirm token (AC5).
func LangDigestConfirmToken(sid int64, secret string) string {
	return langDigestSignToken(sid, langConfirmScope, secret, LangDigestConfirmTTL)
}

// LangDigestUnsubToken issues a 30d single-use unsubscribe token (AC7).
func LangDigestUnsubToken(sid int64, secret string) string {
	return langDigestSignToken(sid, langUnsubScope, secret, LangDigestUnsubTTL)
}

// LangDigestGDPRToken issues a 30d single-use hard-delete token (AC8).
func LangDigestGDPRToken(sid int64, secret string) string {
	return langDigestSignToken(sid, langGDPRScope, secret, LangDigestGDPRTTL)
}

// StoreLangDigestGDPRToken records a gdpr hard-delete token in the single-use
// ledger (AC8) so the emailed /api/gdpr-delete link is replay-protected.
func StoreLangDigestGDPRToken(ctx context.Context, db *sqlx.DB, sid int64, rawToken string, expUnix int64) error {
	return storeLangToken(ctx, db, sid, langGDPRScope, rawToken, expUnix)
}

// storeLangToken records an issued token in the single-use ledger (AC5/AC7).
func storeLangToken(ctx context.Context, db *sqlx.DB, sid int64, purpose, rawToken string, expUnix int64) error {
	if db.DriverName() == "sqlite" {
		_, err := db.ExecContext(ctx,
			`INSERT OR IGNORE INTO lang_digest_tokens (token_hash, subscriber_id, purpose, expires_at, consumed_at) VALUES (?, ?, ?, ?, NULL)`,
			tokenHash(rawToken), sid, purpose, expUnix)
		return err
	}
	_, err := db.ExecContext(ctx,
		`INSERT INTO lang_digest_tokens (token_hash, subscriber_id, purpose, expires_at, consumed_at) VALUES (?, ?, ?, ?, NULL)
		 ON DUPLICATE KEY UPDATE consumed_at=NULL, expires_at=VALUES(expires_at)`,
		tokenHash(rawToken), sid, purpose, expUnix)
	return err
}

// consumeLangToken verifies + consumes a single-use token bound to sid (from
// the query string). Returns (sid, true) on success, (0, false) when
// invalid/expired/already-used (AC5/AC7 replay protection).
func consumeLangToken(ctx context.Context, db *sqlx.DB, rawToken, scope, secret string, prevSecrets ...string) (int64, bool) {
	if rawToken == "" {
		return 0, false
	}
	dot := strings.IndexByte(rawToken, '.')
	if dot <= 0 {
		return 0, false
	}
	var expUnix int64
	if _, err := fmt.Sscanf(rawToken[:dot], "%d", &expUnix); err != nil {
		return 0, false
	}
	hash := tokenHash(rawToken)
	var rec struct {
		SID      int64        `db:"subscriber_id"`
		Consumed sql.NullTime `db:"consumed_at"`
	}
	if err := db.GetContext(ctx, &rec, `SELECT subscriber_id, consumed_at FROM lang_digest_tokens WHERE token_hash=?`, hash); err != nil {
		return 0, false
	}
	if _, _, ok := parseLangDigestTokenWithSID(rawToken, scope, secret, rec.SID, prevSecrets...); !ok {
		return 0, false
	}
	if rec.Consumed.Valid {
		return 0, false // replayed
	}
	if time.Now().UTC().Unix() >= expUnix {
		return 0, false // expired
	}
	if _, err := db.ExecContext(ctx,
		`UPDATE lang_digest_tokens SET consumed_at=CURRENT_TIMESTAMP WHERE token_hash=? AND consumed_at IS NULL`, hash); err != nil {
		return 0, false
	}
	return rec.SID, true
}

// parseLangDigestTokenWithSID verifies the MAC for an explicit sid (the token
// embeds sid inside the MAC, so the sid is supplied by the caller from the
// query string and checked for consistency).
func parseLangDigestTokenWithSID(token, scope, secret string, sid int64, prevSecrets ...string) (int64, int64, bool) {
	if secret == "" || token == "" {
		return 0, 0, false
	}
	dot := strings.IndexByte(token, '.')
	if dot <= 0 || dot == len(token)-1 {
		return 0, 0, false
	}
	var expUnix int64
	if _, err := fmt.Sscanf(token[:dot], "%d", &expUnix); err != nil {
		return 0, 0, false
	}
	if expUnix != 0 && time.Now().UTC().Unix() >= expUnix {
		return 0, 0, false
	}
	for _, key := range append([]string{secret}, prevSecrets...) {
		if key == "" {
			continue
		}
		mac := hmac.New(sha256.New, []byte(key))
		fmt.Fprintf(mac, "%s:%d:%d", scope, sid, expUnix)
		if hmac.Equal([]byte(hex.EncodeToString(mac.Sum(nil))), []byte(token[dot+1:])) {
			return sid, expUnix, true
		}
	}
	return 0, 0, false
}

// LangDigestSubscriber is the persisted signup row.
type LangDigestSubscriber struct {
	ID          int64
	Email       string
	Language    string
	Status      string
	ConfirmedAt *time.Time
	UnsubAt     *time.Time
	Active      bool
}

// ValidateLangDigestEmail normalizes + validates an email for the digest
// pipeline (reuses GFI validation semantics).
func ValidateLangDigestEmail(raw string) (string, bool) {
	email := strings.TrimSpace(strings.ToLower(raw))
	if email == "" {
		return "", false
	}
	if len(email) > 254 {
		return "", false
	}
	if !strings.Contains(email, "@") || strings.ContainsAny(email, " \t\n\r") {
		return "", false
	}
	parts := strings.Split(email, "@")
	if len(parts) != 2 || parts[0] == "" || parts[1] == "" || !strings.Contains(parts[1], ".") {
		return "", false
	}
	return email, true
}

// normalizeLangDigestEmail mirrors AC2: trim + lowercase before sign/store.
func normalizeLangDigestEmail(raw string) string {
	return strings.TrimSpace(strings.ToLower(raw))
}

// LangDigestRateLimited enforces AC3: max 5 requests/minute per real client IP.
const langDigestMaxPerMin = 5

// LangDigestRateLimited is the exported wrapper used by the HTTP handler.
func LangDigestRateLimited(ctx context.Context, db *sqlx.DB, ip string) bool {
	return langDigestRateLimited(ctx, db, ip)
}

func langDigestRateLimited(ctx context.Context, db *sqlx.DB, ip string) bool {
	cutoff := time.Now().UTC().Add(-time.Minute)
	_, _ = db.ExecContext(ctx, `DELETE FROM lang_digest_rate_limits WHERE created_at < ?`, cutoff)
	var n int
	if err := db.GetContext(ctx, &n,
		`SELECT COUNT(*) FROM lang_digest_rate_limits WHERE ip=? AND created_at >= ?`, ip, cutoff); err != nil {
		return false // fail open so a store outage never hard-blocks signup
	}
	_, _ = db.ExecContext(ctx, `INSERT INTO lang_digest_rate_limits (ip, created_at) VALUES (?, CURRENT_TIMESTAMP)`, ip)
	return n >= langDigestMaxPerMin
}

// LangDigestSubscribe stores a pending subscriber (double opt-in) and returns a
// freshly issued confirm token + the (possibly pre-existing) subscriber id.
// Dedupes case-insensitively via the UNIQUE(email) key (AC2).
func LangDigestSubscribe(ctx context.Context, db *sqlx.DB, email, language, secret string) (int64, string, error) {
	email = normalizeLangDigestEmail(email)
	language = strings.TrimSpace(language)

	upsert := `INSERT INTO lang_digest_subscribers (email, language, status, created_at, updated_at)
		VALUES (?, ?, 'pending', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
		ON DUPLICATE KEY UPDATE language=VALUES(language), updated_at=CURRENT_TIMESTAMP`
	if db.DriverName() == "sqlite" {
		upsert = `INSERT INTO lang_digest_subscribers (email, language, status, created_at, updated_at)
			VALUES (?, ?, 'pending', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
			ON CONFLICT(email) DO UPDATE SET language=excluded.language, updated_at=CURRENT_TIMESTAMP`
	}
	if _, err := db.ExecContext(ctx, upsert, email, language); err != nil {
		return 0, "", err
	}
	var sid int64
	if err := db.GetContext(ctx, &sid, `SELECT id FROM lang_digest_subscribers WHERE email=?`, email); err != nil {
		return 0, "", err
	}

	if _, err := db.ExecContext(ctx,
		`UPDATE lang_digest_subscribers SET status='pending', active=FALSE, confirmed_at=NULL WHERE id=?`, sid); err != nil {
		return 0, "", err
	}

	confirmToken := LangDigestConfirmToken(sid, secret)
	exp := time.Now().UTC().Add(LangDigestConfirmTTL).Unix()
	if err := storeLangToken(ctx, db, sid, langConfirmScope, confirmToken, exp); err != nil {
		return 0, "", err
	}
	return sid, confirmToken, nil
}

// LangDigestConfirm verifies the single-use confirm token, marks the
// subscriber active, and returns the subscriber for downstream digest send
// (AC5/AC6).
func LangDigestConfirm(ctx context.Context, db *sqlx.DB, sid int64, token, secret string, prevSecrets ...string) (*LangDigestSubscriber, error) {
	vsid, ok := consumeLangToken(ctx, db, token, langConfirmScope, secret, prevSecrets...)
	if !ok || vsid != sid {
		return nil, fmt.Errorf("invalid or expired confirm token")
	}
	if _, err := db.ExecContext(ctx,
		`UPDATE lang_digest_subscribers SET status='active', active=TRUE, confirmed_at=CURRENT_TIMESTAMP, updated_at=CURRENT_TIMESTAMP WHERE id=?`, sid); err != nil {
		return nil, err
	}
	return getLangSubscriber(ctx, db, sid)
}

// LangDigestUnsubscribe verifies the single-use unsub token, soft-deletes the
// subscriber (unsubscribed_at + active=false) and stamps the 30-day GDPR
// consent-retention window (AC7/AC8).
func LangDigestUnsubscribe(ctx context.Context, db *sqlx.DB, sid int64, token, secret string, prevSecrets ...string) error {
	vsid, ok := consumeLangToken(ctx, db, token, langUnsubScope, secret, prevSecrets...)
	if !ok || vsid != sid {
		return fmt.Errorf("invalid or expired unsubscribe token")
	}
	now := time.Now().UTC()
	retainUntil := now.Add(30 * 24 * time.Hour)
	_, err := db.ExecContext(ctx,
		`UPDATE lang_digest_subscribers
		 SET status='unsubscribed', active=FALSE, unsubscribed_at=?, consent_retained_until=?, updated_at=CURRENT_TIMESTAMP
		 WHERE id=? AND active=TRUE`, now, retainUntil, sid)
	return err
}

// LangDigestGDPRDelete hard-deletes a subscriber only via a valid single-use
// gdpr token (AC8). Consent record is purged with the row.
func LangDigestGDPRDelete(ctx context.Context, db *sqlx.DB, sid int64, token, secret string, prevSecrets ...string) error {
	vsid, ok := consumeLangToken(ctx, db, token, langGDPRScope, secret, prevSecrets...)
	if !ok || vsid != sid {
		return fmt.Errorf("invalid or expired gdpr token")
	}
	if _, err := db.ExecContext(ctx, `DELETE FROM lang_digest_tokens WHERE subscriber_id=?`, sid); err != nil {
		return err
	}
	_, err := db.ExecContext(ctx, `DELETE FROM lang_digest_subscribers WHERE id=?`, sid)
	return err
}

func getLangSubscriber(ctx context.Context, db *sqlx.DB, sid int64) (*LangDigestSubscriber, error) {
	var s struct {
		ID     int64        `db:"id"`
		Email  string       `db:"email"`
		Lang   string       `db:"language"`
		Status string       `db:"status"`
		Conf   sql.NullTime `db:"confirmed_at"`
		Unsub  sql.NullTime `db:"unsubscribed_at"`
		Active bool         `db:"active"`
	}
	if err := db.GetContext(ctx, &s, `SELECT id,email,language,status,confirmed_at,unsubscribed_at,active FROM lang_digest_subscribers WHERE id=?`, sid); err != nil {
		return nil, err
	}
	sub := &LangDigestSubscriber{ID: s.ID, Email: s.Email, Language: s.Lang, Status: s.Status, Active: s.Active}
	if s.Conf.Valid {
		t := s.Conf.Time
		sub.ConfirmedAt = &t
	}
	if s.Unsub.Valid {
		t := s.Unsub.Time
		sub.UnsubAt = &t
	}
	return sub, nil
}

// LangDigestBuildMatches gathers the top welcoming repos + freshest good first
// issues for a language, reusing the existing digest MatchCandidate shape.
func LangDigestBuildMatches(ctx context.Context, db *sqlx.DB, language string) []MatchCandidate {
	language = strings.TrimSpace(language)
	if language == "" {
		return nil
	}
	type repoRow struct {
		FullName  string  `db:"full_name"`
		Lang      string  `db:"language"`
		Tier      string  `db:"c_rank_tier"`
		MergeRate float64 `db:"external_pr_merge_rate"`
		GFIURL    string  `db:"gfi_url"`
	}
	q := `SELECT r.full_name, r.language, r.c_rank_tier, r.external_pr_merge_rate,
			(SELECT g.url FROM repo_good_first_issues g
				JOIN repositories r2 ON r2.id = g.repository_id
				WHERE r2.language = r.language AND g.bounty_status = 'active'
				ORDER BY g.created_at DESC LIMIT 1) AS gfi_url
		FROM repositories r
		WHERE r.language = ? AND r.score_source <> 'fallback' AND r.stars >= 100
		ORDER BY r.c_rank_score DESC
		LIMIT 3`
	var rows []repoRow
	if err := db.SelectContext(ctx, &rows, q, language); err != nil || len(rows) == 0 {
		var gfi []struct {
			FullName string `db:"full_name"`
			URL      string `db:"url"`
			Title    string `db:"title"`
		}
		if e := db.SelectContext(ctx, &gfi,
			`SELECT r.full_name, g.url, g.title FROM repo_good_first_issues g
			 JOIN repositories r ON r.id = g.repository_id
			 WHERE r.language = ? AND g.bounty_status = 'active'
			 ORDER BY g.created_at DESC LIMIT 3`, language); e == nil && len(gfi) > 0 {
			matches := make([]MatchCandidate, 0, len(gfi))
			for _, x := range gfi {
				matches = append(matches, MatchCandidate{
					RepoFullName:      x.FullName,
					Language:          language,
					GoodFirstIssueURL: x.URL, GoodFirstIssueText: x.Title,
				})
			}
			return matches
		}
		return nil
	}
	matches := make([]MatchCandidate, 0, len(rows))
	for _, r := range rows {
		m := MatchCandidate{
			RepoFullName:      r.FullName,
			Language:          r.Lang,
			CRankTier:         r.Tier,
			ExternalMergeRate: r.MergeRate,
			GoodFirstIssueURL: r.GFIURL,
		}
		matches = append(matches, m)
	}
	return matches
}

// LangDigestMailerConfig carries the SMTP + branding needed to send a digest.
type LangDigestMailerConfig struct {
	Mailer          *SMTPMailer
	BaseURL         string
	PhysicalAddress string
}

// SendLangDigestToSubscriber builds + sends the per-language weekly digest to a
// single active subscriber (AC6/AC9). Returns an error (without aborting the
// caller's loop) on build/send failure.
func SendLangDigestToSubscriber(ctx context.Context, db *sqlx.DB, cfg LangDigestMailerConfig, sub *LangDigestSubscriber, secret string) error {
	if cfg.Mailer == nil || !cfg.Mailer.IsConfigured() {
		return fmt.Errorf("smtp not configured")
	}
	matches := LangDigestBuildMatches(ctx, db, sub.Language)
	user := DigestUser{Username: sub.Email, Email: sub.Email}
	payload := GenerateWeeklyDigest(user, matches)
	unsubURL := fmt.Sprintf("%s/api/unsubscribe?sid=%d&token=%s", strings.TrimRight(cfg.BaseURL, "/"),
		sub.ID, LangDigestUnsubToken(sub.ID, secret))
	headers := map[string]string{
		"List-Unsubscribe":      fmt.Sprintf("<%s>", unsubURL),
		"List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
	}
	addrFoot := ""
	if strings.TrimSpace(cfg.PhysicalAddress) != "" {
		addrFoot = "\n\nGetMerged · Physical sender address: " + cfg.PhysicalAddress
	}
	text := payload.TextBody + "\n\nUnsubscribe: " + unsubURL + addrFoot
	htmlB := payload.HTMLBody + fmt.Sprintf(`<p style="font-size:12px;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:12px;">You can <a href="%s" style="color:#64748b;">unsubscribe</a> at any time.</p>`, unsubURL)
	return cfg.Mailer.SendWithHeaders(ctx, sub.Email, payload.Subject, text, htmlB, headers)
}

// LangDigestFanoutSummary reports per-run fanout results (AC9).
type LangDigestFanoutSummary struct {
	Sent           int
	Failed         int
	Skipped        int
	RetriedSuccess int
}

// RunLangDigestFanout sends the weekly per-language digest to every active
// subscriber. Per AC9 it loops subscribers, continues to the next on any single
// failure (logging it), and retries the failed batch exactly once after the
// run — a partial failure never aborts the fanout.
func RunLangDigestFanout(ctx context.Context, db *sqlx.DB, cfg LangDigestMailerConfig, secret string) (LangDigestFanoutSummary, error) {
	var subs []LangDigestSubscriber
	if err := db.SelectContext(ctx, &subs,
		`SELECT id, email, language, status FROM lang_digest_subscribers WHERE active=TRUE AND unsubscribed_at IS NULL`); err != nil {
		return LangDigestFanoutSummary{}, err
	}
	summary := LangDigestFanoutSummary{}
	type failed struct{ sub LangDigestSubscriber; err error }
	var failures []failed
	for _, s := range subs {
		sub := s
		if err := SendLangDigestToSubscriber(ctx, db, cfg, &sub, secret); err != nil {
			slog.Warn("lang-digest send failed", "sid", sub.ID, "err", err)
			failures = append(failures, failed{sub: sub, err: err})
			summary.Failed++
			continue
		}
		summary.Sent++
	}
	if len(failures) > 0 {
		var stillFailed []failed
		for _, f := range failures {
			if err := SendLangDigestToSubscriber(ctx, db, cfg, &f.sub, secret); err != nil {
				stillFailed = append(stillFailed, failed{sub: f.sub, err: err})
				continue
			}
			summary.RetriedSuccess++
			summary.Sent++
			summary.Failed--
		}
		failures = stillFailed
	}
	summary.Skipped = len(failures)
	summary.Failed = len(failures)
	return summary, nil
}

// LangDigestConfirmURL builds the emailed double opt-in link (AC5).
func LangDigestConfirmURL(baseURL string, sid int64, token string) string {
	return fmt.Sprintf("%s/api/confirm?sid=%d&token=%s", strings.TrimRight(baseURL, "/"), sid, token)
}
