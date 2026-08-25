package notification

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"fmt"
	"time"

	"github.com/jmoiron/sqlx"
)

// newGFIClaimLink mints a single-use opaque Claim & Setup token (AC5): the
// raw token only ever lives in the emailed URL, its SHA-256 hash is stored
// server-side with a 14-day expiry. Returns the full claim URL, or "" on
// failure (callers fall back to the public repo page).
func newGFIClaimLink(ctx context.Context, db *sqlx.DB, baseURL string, subscriberID int64, repoID, fullName string, issueNo int, now time.Time) (string, error) {
	raw := make([]byte, 16)
	if _, err := rand.Read(raw); err != nil {
		return "", err
	}
	token := hex.EncodeToString(raw)
	sum := sha256.Sum256([]byte(token))
	insertQ := `INSERT INTO gfi_claim_links (token_hash, subscriber_id, repo_id, full_name, issue_number, expires_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`
	if db.DriverName() == "sqlite" {
		insertQ = `INSERT OR IGNORE INTO gfi_claim_links (token_hash, subscriber_id, repo_id, full_name, issue_number, expires_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`
	} else {
		insertQ = `INSERT IGNORE INTO gfi_claim_links (token_hash, subscriber_id, repo_id, full_name, issue_number, expires_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`
	}
	if _, err := db.ExecContext(ctx, insertQ,
		hex.EncodeToString(sum[:]), subscriberID, repoID, fullName, issueNo,
		now.UTC().Add(GFIClaimLinkTTL), now.UTC()); err != nil {
		return "", err
	}
	return fmt.Sprintf("%s/api/v1/gfi-alerts/claim?token=%s", gfiLinks(baseURL), token), nil
}

// ConsumeGFIClaimLink atomically marks a valid unconsumed link as used.
// Returns the redirect target (repo full name), or an empty string when the
// token is unknown, expired or already consumed.
func ConsumeGFIClaimLink(ctx context.Context, db *sqlx.DB, token string, now time.Time) string {
	sum := sha256.Sum256([]byte(token))
	hash := hex.EncodeToString(sum[:])
	var link struct {
		ID         int64        `db:"id"`
		FullName   string       `db:"full_name"`
		ExpiresAt  time.Time    `db:"expires_at"`
		ConsumedAt sql.NullTime `db:"consumed_at"`
	}
	err := db.GetContext(ctx, &link, `
		SELECT id, full_name, expires_at, consumed_at FROM gfi_claim_links WHERE token_hash = ?
	`, hash)
	if err != nil || link.FullName == "" || !link.ExpiresAt.After(now) {
		return ""
	}
	res, err := db.ExecContext(ctx,
		`UPDATE gfi_claim_links SET consumed_at=? WHERE id=? AND consumed_at IS NULL`,
		now.UTC(), link.ID)
	if err != nil {
		return ""
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return ""
	}
	return link.FullName
}

// IsGFIClaimLinkUsed reports whether the hashed token exists and has already
// been consumed (drives the 'link already used' page copy, AC5).
func IsGFIClaimLinkUsed(ctx context.Context, db *sqlx.DB, token string) bool {
	sum := sha256.Sum256([]byte(token))
	var one int
	if err := db.GetContext(ctx, &one,
		`SELECT 1 FROM gfi_claim_links WHERE token_hash = ? AND consumed_at IS NOT NULL LIMIT 1`,
		hex.EncodeToString(sum[:])); err != nil {
		return false
	}
	return true
}

// GFIClaimLinkInfo describes a stored claim link for click handling (AC4).
type GFIClaimLinkInfo struct {
	FullName    string
	IssueNumber int
	RepoID      string
	Consumed    bool
	Expired     bool
}

// LookupGFIClaimLink resolves a token to its stored link info without
// consuming it. Returns nil when the token is unknown.
func LookupGFIClaimLink(ctx context.Context, db *sqlx.DB, token string, now time.Time) *GFIClaimLinkInfo {
	sum := sha256.Sum256([]byte(token))
	var link struct {
		RepoID     string       `db:"repo_id"`
		FullName   string       `db:"full_name"`
		IssueNumber int          `db:"issue_number"`
		ExpiresAt  time.Time    `db:"expires_at"`
		ConsumedAt sql.NullTime `db:"consumed_at"`
	}
	if err := db.GetContext(ctx, &link, `
		SELECT repo_id, full_name, issue_number, expires_at, consumed_at FROM gfi_claim_links WHERE token_hash = ?
	`, hex.EncodeToString(sum[:])); err != nil {
		return nil
	}
	if link.FullName == "" {
		return nil
	}
	return &GFIClaimLinkInfo{
		FullName:    link.FullName,
		IssueNumber: link.IssueNumber,
		RepoID:      link.RepoID,
		Consumed:    link.ConsumedAt.Valid && !link.ConsumedAt.Time.IsZero(),
		Expired:     !link.ExpiresAt.After(now),
	}
}
