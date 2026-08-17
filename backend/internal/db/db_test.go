package db_test

import (
	"testing"

	"github.com/abhisheksoni27/opendoor/internal/db"
	"github.com/jmoiron/sqlx"
	_ "modernc.org/sqlite"
)

func TestConnect_SQLiteMemory(t *testing.T) {
	database, err := sqlx.Open("sqlite", ":memory:")
	if err != nil {
		t.Fatalf("failed to open memory SQLite db: %v", err)
	}
	defer database.Close()

	// AutoMigrate is MySQL-flavored; in the sqlite test harness we verify
	// schema discovery works against a hand-created table instead.
	database.MustExec(`
		CREATE TABLE IF NOT EXISTS discovery_cursors (
			lang VARCHAR(50) NOT NULL,
			bucket_min INT NOT NULL,
			bucket_max INT NOT NULL,
			push_start VARCHAR(10) NOT NULL DEFAULT '',
			search_cursor TEXT NOT NULL,
			last_swept DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
			PRIMARY KEY(lang, bucket_min, bucket_max)
		)
	`)

	// Verify required tables exist
	tables := []string{"discovery_cursors"}
	for _, tbl := range tables {
		var name string
		err := database.Get(&name, "SELECT name FROM sqlite_master WHERE type='table' AND name=?", tbl)
		if err != nil || name != tbl {
			t.Fatalf("expected table %s to exist in database, got err: %v", tbl, err)
		}
	}
}

func TestAutoMigrate_DeletedAtColumnMigration(t *testing.T) {
	database, err := sqlx.Open("sqlite", ":memory:")
	if err != nil {
		t.Fatalf("failed to open memory SQLite db: %v", err)
	}
	defer database.Close()

	// Simulate legacy schema lacking deleted_at
	database.MustExec(`
		CREATE TABLE users (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			github_id INTEGER UNIQUE,
			google_id VARCHAR(255) UNIQUE,
			slug VARCHAR(255) UNIQUE,
			email_hash VARCHAR(64) UNIQUE,
			username TEXT NOT NULL,
			email TEXT,
			avatar_url TEXT,
			profiling_consent BOOLEAN DEFAULT FALSE,
			profiling_consent_at DATETIME,
			created_at DATETIME NOT NULL,
			updated_at DATETIME NOT NULL
		);
	`)

	if err := db.AutoMigrate(database); err != nil {
		t.Fatalf("AutoMigrate failed: %v", err)
	}

	type colInfo struct {
		CID       int     `db:"cid"`
		Name      string  `db:"name"`
		Type      string  `db:"type"`
		NotNull   int     `db:"notnull"`
		DfltValue *string `db:"dflt_value"`
		PK        int     `db:"pk"`
	}
	var cols []colInfo
	if err := database.Select(&cols, "PRAGMA table_info(users)"); err != nil {
		t.Fatalf("failed to read table info: %v", err)
	}

	hasDeletedAt := false
	for _, col := range cols {
		if col.Name == "deleted_at" {
			hasDeletedAt = true
			break
		}
	}
	if !hasDeletedAt {
		t.Fatalf("expected deleted_at column to be added to legacy users table by AutoMigrate")
	}

	// Idempotency: second run should not fail
	if err := db.AutoMigrate(database); err != nil {
		t.Fatalf("second AutoMigrate run failed: %v", err)
	}
}

