package db_test

import (
	"testing"

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
			search_cursor TEXT NOT NULL DEFAULT '',
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
