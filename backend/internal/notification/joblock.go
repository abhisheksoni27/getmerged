package notification

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"time"

	"github.com/jmoiron/sqlx"
)

// TryJobLock acquires a portable advisory lock backed by the job_locks table
// (AC7): overlapping cron runs across processes no-op while the lock is
// fresh; expired locks are stealable so a crashed worker never wedges the
// pipeline. Works identically on SQLite and MySQL. The returned release func
// removes only the caller's own lock row.
func TryJobLock(ctx context.Context, db *sqlx.DB, name string, ttl time.Duration) (func(), bool) {
	now := time.Now().UTC()
	owner := newJobLockOwner()
	if _, err := db.ExecContext(ctx, `DELETE FROM job_locks WHERE locked_until < ?`, now); err != nil {
		return func() {}, false
	}
	res, err := db.ExecContext(ctx,
		`UPDATE job_locks SET owner = ?, locked_until = ? WHERE name = ? AND locked_until < ?`,
		owner, now.Add(ttl), name, now)
	if err != nil {
		return func() {}, false
	}
	if n, _ := res.RowsAffected(); n == 0 {
		insertQ := `INSERT INTO job_locks (name, owner, locked_until) VALUES (?, ?, ?)`
		if db.DriverName() == "sqlite" {
			insertQ = `INSERT OR IGNORE INTO job_locks (name, owner, locked_until) VALUES (?, ?, ?)`
		} else {
			insertQ = `INSERT IGNORE INTO job_locks (name, owner, locked_until) VALUES (?, ?, ?)`
		}
		res, err := db.ExecContext(ctx, insertQ, name, owner, now.Add(ttl))
		if err != nil {
			return func() {}, false
		}
		if n, _ := res.RowsAffected(); n == 0 {
			return func() {}, false
		}
	}
	release := func() {
		_, _ = db.ExecContext(context.Background(),
			`DELETE FROM job_locks WHERE name = ? AND owner = ?`, name, owner)
	}
	return release, true
}

func newJobLockOwner() string {
	buf := make([]byte, 16)
	if _, err := rand.Read(buf); err != nil {
		return hex.EncodeToString([]byte(time.Now().UTC().Format("20060102150405.000000000")))
	}
	return hex.EncodeToString(buf)
}
