package prsim

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"time"

	"github.com/abhisheksoni27/opendoor/internal/crypto"
	"github.com/jmoiron/sqlx"
)

// Store persists simulations with AES-256 encrypted diffs (AC5). Badge and
// lookup paths only ever touch the UUID key and result JSON.
type Store struct {
	db     *sqlx.DB
	encKey []byte
}

func NewStore(db *sqlx.DB, encKey []byte) *Store {
	return &Store{db: db, encKey: encKey}
}

// PayloadHash is the stable dedup key over the full submission payload.
func PayloadHash(repo, title, description, diff string) string {
	h := sha256.Sum256([]byte(repo + "\x00" + title + "\x00" + description + "\x00" + diff))
	return hex.EncodeToString(h[:])
}

// BadgeID derives the public badge hash (AC6 format ^[a-f0-9]{16}$) as the
// first 16 hex chars of the payload SHA-256. Deterministic: re-scoring an
// identical payload refreshes the same badge instead of minting a new one.
func BadgeID(payloadHash string) string {
	if len(payloadHash) >= 16 {
		return payloadHash[:16]
	}
	return payloadHash
}

type submissionRow struct {
	ID          string    `db:"id"`
	PayloadHash string    `db:"payload_hash"`
	ResultJSON  string    `db:"result_json"`
	ExpiresAt   time.Time `db:"expires_at"`
}

// Save encrypts the raw diff under the deterministic badge ID (AC6), stores
// the computed result, and purges expired rows. Re-scoring an identical
// payload upserts (refreshes) the existing row.
func (s *Store) Save(ctx context.Context, payloadHash, repo, diff string, result []byte) (string, error) {
	id := BadgeID(payloadHash)
	diffEnc, err := crypto.EncryptAESGCM([]byte(diff), s.encKey)
	if err != nil {
		return "", err
	}
	now := time.Now().UTC()
	if _, err := s.db.ExecContext(ctx,
		`INSERT INTO pr_sim_submissions (id, payload_hash, repo_full_name, diff_enc, result_json, created_at, expires_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?)
		 ON CONFLICT(id) DO UPDATE SET
		   result_json = excluded.result_json,
		   diff_enc = excluded.diff_enc,
		   created_at = excluded.created_at,
		   expires_at = excluded.expires_at`,
		id, payloadHash, repo, diffEnc, string(result), now, now.Add(Retention),
	); err != nil {
		return "", err
	}
	_, _ = s.db.ExecContext(ctx, `DELETE FROM pr_sim_submissions WHERE expires_at < ?`, now)
	return id, nil
}

// CompletedByHash returns the most recent non-expired finished submission for
// a payload hash, used by concurrent duplicates awaiting the first result.
func (s *Store) CompletedByHash(ctx context.Context, payloadHash string) (*submissionRow, error) {
	var row submissionRow
	err := sqlx.GetContext(ctx, s.db, &row,
		`SELECT id, payload_hash, result_json, expires_at FROM pr_sim_submissions
		 WHERE payload_hash = ? AND result_json <> '' AND expires_at > ?
		 ORDER BY created_at DESC LIMIT 1`,
		payloadHash, time.Now().UTC(),
	)
	if err != nil {
		return nil, err
	}
	return &row, nil
}

// Badge lookup outcomes for BadgeResult.
const (
	BadgeLive    = iota // unexpired result available
	BadgeMissing        // no row ever stored for the hash
	BadgeExpired        // row exists but past its 24h retention
)

// BadgeResult loads the stored result JSON for a badge hash without ever
// recomputing (AC6). It distinguishes missing from expired so the badge
// route can serve the 'expired' fallback for stale hashes.
func (s *Store) BadgeResult(ctx context.Context, id string) ([]byte, int, error) {
	var row submissionRow
	err := sqlx.GetContext(ctx, s.db, &row,
		`SELECT id, payload_hash, result_json, expires_at FROM pr_sim_submissions
		 WHERE id = ? LIMIT 1`,
		id,
	)
	if err != nil {
		return nil, BadgeMissing, err
	}
	if !time.Now().UTC().Before(row.ExpiresAt) {
		return nil, BadgeExpired, nil
	}
	return []byte(row.ResultJSON), BadgeLive, nil
}
