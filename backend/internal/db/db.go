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
		repo_id TEXT NOT NULL,
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
	if _, err := db.Exec(schema); err != nil {
		return err
	}

	// Safe migration check for user_watchlists.repo_id column type
	var colType string
	err := db.Get(&colType, "SELECT type FROM pragma_table_info('user_watchlists') WHERE name = 'repo_id'")
	if err == nil && strings.ToUpper(colType) == "INTEGER" {
		migration := `
			CREATE TABLE user_watchlists_dg_tmp (
				user_id INTEGER NOT NULL,
				repo_id TEXT NOT NULL,
				notify_rank_change BOOLEAN DEFAULT TRUE,
				created_at DATETIME NOT NULL,
				PRIMARY KEY(user_id, repo_id),
				FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
			);
			INSERT INTO user_watchlists_dg_tmp (user_id, repo_id, notify_rank_change, created_at)
				SELECT user_id, CAST(repo_id AS TEXT), notify_rank_change, created_at FROM user_watchlists;
			DROP TABLE user_watchlists;
			ALTER TABLE user_watchlists_dg_tmp RENAME TO user_watchlists;
		`
		_, _ = db.Exec(migration)
	}

	// Safe migration: add trending columns if missing.
	var hasTrending int
	_ = db.Get(&hasTrending, "SELECT COUNT(1) FROM pragma_table_info('repositories') WHERE name = 'is_trending'")
	if hasTrending == 0 {
		_, _ = db.Exec(`ALTER TABLE repositories ADD COLUMN is_trending INTEGER NOT NULL DEFAULT 0`)
		_, _ = db.Exec(`ALTER TABLE repositories ADD COLUMN last_trending_at DATETIME`)
		_, _ = db.Exec(`CREATE INDEX IF NOT EXISTS idx_repositories_is_trending ON repositories(is_trending)`)
	}

	return nil
}

func resolveDriver(url string) (driver, dsn string) {
	if strings.HasPrefix(url, "libsql://") || strings.HasPrefix(url, "https://") {
		return "libsql", url
	}
	// Local SQLite file — modernc sqlite driver expects a plain path
	return "sqlite", url
}
