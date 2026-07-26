package db

import (
	"strings"

	"github.com/jmoiron/sqlx"
	_ "github.com/tursodatabase/libsql-client-go/libsql"
	_ "modernc.org/sqlite"
)

// Connect opens a database connection and auto-migrates missing tables.
// DATABASE_URL starting with "libsql://" or "https://" → uses Turso (prod).
// Anything else → treated as a local SQLite file path (dev).
func Connect(url string) (*sqlx.DB, error) {
	driver, dsn := resolveDriver(url)
	db, err := sqlx.Connect(driver, dsn)
	if err != nil {
		return nil, err
	}
	db.SetMaxOpenConns(10)
	db.SetMaxIdleConns(5)

	if err := AutoMigrate(db); err != nil {
		return nil, err
	}

	return db, nil
}

// AutoMigrate creates all required tables if they do not exist.
func AutoMigrate(db *sqlx.DB) error {
	schema := `
	CREATE TABLE IF NOT EXISTS users (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		github_id INTEGER UNIQUE NOT NULL,
		username TEXT NOT NULL,
		email TEXT,
		avatar_url TEXT,
		created_at DATETIME NOT NULL,
		updated_at DATETIME NOT NULL
	);

	CREATE TABLE IF NOT EXISTS user_watchlists (
		user_id INTEGER NOT NULL,
		repo_id INTEGER NOT NULL,
		notify_rank_change BOOLEAN DEFAULT TRUE,
		created_at DATETIME NOT NULL,
		PRIMARY KEY(user_id, repo_id),
		FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
	);

	CREATE TABLE IF NOT EXISTS macro_stats (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		metric_key TEXT UNIQUE NOT NULL,
		metric_value TEXT NOT NULL,
		updated_at DATETIME NOT NULL
	);

	CREATE TABLE IF NOT EXISTS repo_ai_insights (
		repo_id INTEGER PRIMARY KEY,
		maintainer_vibe TEXT NOT NULL,
		pr_guidelines TEXT NOT NULL,
		issue_quality_score REAL DEFAULT 0.0,
		raw_summary TEXT,
		updated_at DATETIME NOT NULL
	);

	CREATE TABLE IF NOT EXISTS notification_queue (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		user_id INTEGER NOT NULL,
		type TEXT NOT NULL,
		payload TEXT NOT NULL,
		status TEXT NOT NULL DEFAULT 'pending',
		created_at DATETIME NOT NULL,
		FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
	);
	`
	_, err := db.Exec(schema)
	return err
}

func resolveDriver(url string) (driver, dsn string) {
	if strings.HasPrefix(url, "libsql://") || strings.HasPrefix(url, "https://") {
		return "libsql", url
	}
	// Local SQLite file — modernc sqlite driver expects a plain path
	return "sqlite", url
}
