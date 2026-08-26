package claim

import (
	"context"
	"errors"
	"path/filepath"
	"testing"
	"time"

	"github.com/abhisheksoni27/opendoor/internal/db"
	"github.com/jmoiron/sqlx"
	_ "modernc.org/sqlite"
)

func newLockTestDB(t *testing.T) *sqlx.DB {
	t.Helper()
	dsn := "file:" + filepath.Join(t.TempDir(), "locktest.db") + "?_pragma=busy_timeout(5000)"
	database, err := sqlx.Connect("sqlite", dsn)
	if err != nil {
		t.Fatalf("connect sqlite: %v", err)
	}
	t.Cleanup(func() { database.Close() })
	if err := db.AutoMigrate(database); err != nil {
		t.Fatalf("migrate: %v", err)
	}
	return database
}

func TestRescoreLockSingleFlight(t *testing.T) {
	s := &Service{db: newLockTestDB(t)}
	ctx := context.Background()

	ok, err := s.acquireRescoreLock(ctx, "repo1")
	if err != nil || !ok {
		t.Fatalf("first acquire: ok=%v err=%v", ok, err)
	}
	ok, err = s.acquireRescoreLock(ctx, "repo1")
	if err != nil {
		t.Fatalf("second acquire errored: %v", err)
	}
	if ok {
		t.Fatal("second acquire should lose while lock is held")
	}
	if !errors.Is(ErrRescoreAlreadyRunning, ErrRescoreAlreadyRunning) {
		t.Fatal("sentinel broken")
	}

	s.releaseRescoreLock(ctx, "repo1")
	ok, err = s.acquireRescoreLock(ctx, "repo1")
	if err != nil || !ok {
		t.Fatalf("acquire after release: ok=%v err=%v", ok, err)
	}
}

func TestRescoreLockStaleExpiry(t *testing.T) {
	s := &Service{db: newLockTestDB(t)}
	ctx := context.Background()

	ok, err := s.acquireRescoreLock(ctx, "repo1")
	if err != nil || !ok {
		t.Fatalf("first acquire: ok=%v err=%v", ok, err)
	}
	stale := time.Now().UTC().Add(-rescoreLockTTL - time.Minute)
	if _, err := s.db.ExecContext(ctx, `UPDATE rescore_locks SET locked_at = ? WHERE repo_id = ?`, stale, "repo1"); err != nil {
		t.Fatalf("backdate lock: %v", err)
	}
	ok, err = s.acquireRescoreLock(ctx, "repo1")
	if err != nil || !ok {
		t.Fatalf("stale lock not expired: ok=%v err=%v", ok, err)
	}
	var n int
	if err := s.db.GetContext(ctx, &n, `SELECT COUNT(*) FROM rescore_locks`); err != nil || n != 1 {
		t.Fatalf("expected exactly one live lock, got n=%v err=%v", n, err)
	}
}

func TestPlaybookCardTokenLifecycle(t *testing.T) {
	s := &Service{db: newLockTestDB(t)}
	ctx := context.Background()

	token, expiresAt, err := s.createPlaybookCardToken(ctx, "repoX")
	if err != nil {
		t.Fatalf("mint token: %v", err)
	}
	if len(token) != 32 {
		t.Fatalf("token must be 128-bit hex (32 chars), got %d", len(token))
	}
	if time.Until(expiresAt) < 89*24*time.Hour || time.Until(expiresAt) > playbookCardTokenTTL+time.Minute {
		t.Fatalf("expiry not ~90 days: %v", expiresAt)
	}
	repoID, err := s.ResolvePlaybookCardToken(ctx, token)
	if err != nil || repoID != "repoX" {
		t.Fatalf("resolve: repoID=%q err=%v", repoID, err)
	}
	if _, err := s.ResolvePlaybookCardToken(ctx, "ffffffffffffffffffffffffffffffff"); !errors.Is(err, ErrPlaybookCardTokenInvalid) {
		t.Fatalf("unknown token should be invalid, got %v", err)
	}
	expired := time.Now().UTC().Add(-time.Minute)
	if _, err := s.db.ExecContext(ctx, `UPDATE crank_playbook_card_tokens SET expires_at = ? WHERE token = ?`, expired, token); err != nil {
		t.Fatalf("expire token: %v", err)
	}
	if _, err := s.ResolvePlaybookCardToken(ctx, token); !errors.Is(err, ErrPlaybookCardTokenInvalid) {
		t.Fatalf("expired token should be invalid, got %v", err)
	}
}
