package db_test

import (
	"testing"

	"github.com/abhisheksoni27/opendoor/internal/db"
)

func TestConnect_SQLiteMemory(t *testing.T) {
	database, err := db.Connect(":memory:")
	if err != nil {
		t.Fatalf("failed to connect to memory SQLite db: %v", err)
	}
	defer database.Close()

	// Verify required tables exist
	tables := []string{"users", "user_watchlists", "macro_stats", "repo_ai_insights", "notification_queue"}
	for _, tbl := range tables {
		var name string
		err := database.Get(&name, "SELECT name FROM sqlite_master WHERE type='table' AND name=?", tbl)
		if err != nil || name != tbl {
			t.Fatalf("expected table %s to exist in database, got err: %v", tbl, err)
		}
	}
}
