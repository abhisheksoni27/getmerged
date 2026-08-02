package db

import (
	"strings"

	"github.com/jmoiron/sqlx"
	_ "modernc.org/sqlite"
)

// Connect opens a local SQLite database connection, enables PRAGMAs, and auto-migrates tables.
func Connect(url string) (*sqlx.DB, error) {
	db, err := sqlx.Connect("sqlite", url)
	if err != nil {
		return nil, err
	}
	db.SetMaxOpenConns(10)
	db.SetMaxIdleConns(5)

	// Enable WAL mode and foreign keys for high-performance concurrent local SQLite access
	if _, err := db.Exec(`
		PRAGMA journal_mode = WAL;
		PRAGMA synchronous = NORMAL;
		PRAGMA foreign_keys = ON;
	`); err != nil {
		return nil, err
	}

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

	CREATE TABLE IF NOT EXISTS indexing_queue (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		full_name TEXT UNIQUE NOT NULL,
		owner TEXT NOT NULL,
		name TEXT NOT NULL,
		requested_by_user_id INTEGER,
		status TEXT NOT NULL DEFAULT 'pending',
		created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
		processed_at DATETIME
	);

	CREATE TABLE IF NOT EXISTS latest_snapshots (
		repository_id TEXT PRIMARY KEY,
		snapshot_date TEXT NOT NULL,
		external_pr_merge_rate REAL DEFAULT 0,
		time_to_first_response_hours REAL DEFAULT 0,
		time_to_merge_hours REAL DEFAULT 0,
		first_timer_success_rate REAL DEFAULT 0,
		repeat_contributor_rate REAL DEFAULT 0,
		maintainer_responsiveness REAL DEFAULT 0,
		last_activity_days REAL DEFAULT 180,
		review_rounds REAL DEFAULT 0,
		distinct_maintainer_count REAL DEFAULT 0,
		staleness_flag INTEGER DEFAULT 0,
		c_rank_score REAL DEFAULT 0,
		c_rank_tier TEXT DEFAULT 'D',
		updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY(repository_id) REFERENCES repositories(id) ON DELETE CASCADE
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

	// Performance indexes
	indexes := `
		CREATE INDEX IF NOT EXISTS idx_daily_snapshots_repo_date ON daily_snapshots(repository_id, snapshot_date DESC);
		CREATE INDEX IF NOT EXISTS idx_daily_snapshots_tier ON daily_snapshots(c_rank_tier);
		CREATE INDEX IF NOT EXISTS idx_latest_snapshots_tier ON latest_snapshots(c_rank_tier);
		CREATE INDEX IF NOT EXISTS idx_repositories_language ON repositories(language);
		CREATE INDEX IF NOT EXISTS idx_repositories_stars ON repositories(stars);
	`
	_, _ = db.Exec(indexes)

	// Safe migration: add adaptive rescan columns if missing.
	var hasRescan int
	_ = db.Get(&hasRescan, "SELECT COUNT(1) FROM pragma_table_info('repositories') WHERE name = 'refresh_interval_days'")
	if hasRescan == 0 {
		_, _ = db.Exec(`ALTER TABLE repositories ADD COLUMN refresh_interval_days INTEGER DEFAULT 1 NOT NULL`)
		_, _ = db.Exec(`ALTER TABLE repositories ADD COLUMN consecutive_stagnant_scans INTEGER DEFAULT 0 NOT NULL`)
		_, _ = db.Exec(`ALTER TABLE repositories ADD COLUMN next_rescan_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL`)
		_, _ = db.Exec(`CREATE INDEX IF NOT EXISTS idx_repos_next_rescan ON repositories(next_rescan_at ASC)`)
	}

	return nil
}
