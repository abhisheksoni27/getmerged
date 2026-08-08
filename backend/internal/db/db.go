package db

import (
	"fmt"

	"github.com/jmoiron/sqlx"
	_ "github.com/go-sql-driver/mysql"
)

// Connect opens a MySQL database connection and auto-migrates tables.
func Connect(url string) (*sqlx.DB, error) {
	db, err := sqlx.Connect("mysql", url)
	if err != nil {
		return nil, err
	}
	db.SetMaxOpenConns(100)
	db.SetMaxIdleConns(20)

	if err := AutoMigrate(db); err != nil {
		return nil, err
	}

	return db, nil
}

// AutoMigrate creates all required tables if they do not exist.
func AutoMigrate(db *sqlx.DB) error {
	statements := []string{
		`CREATE TABLE IF NOT EXISTS users (
			id INTEGER PRIMARY KEY AUTO_INCREMENT,
			github_id INTEGER UNIQUE NOT NULL,
			username TEXT NOT NULL,
			email TEXT,
			avatar_url TEXT,
			created_at DATETIME NOT NULL,
			updated_at DATETIME NOT NULL
		);`,
		`CREATE TABLE IF NOT EXISTS user_watchlists (
			user_id INTEGER NOT NULL,
			repo_id VARCHAR(255) NOT NULL,
			notify_rank_change BOOLEAN DEFAULT TRUE,
			created_at DATETIME NOT NULL,
			PRIMARY KEY(user_id, repo_id)
		);`,
		`CREATE TABLE IF NOT EXISTS macro_stats (
			id INTEGER PRIMARY KEY AUTO_INCREMENT,
			metric_key VARCHAR(255) UNIQUE NOT NULL,
			metric_value TEXT NOT NULL,
			updated_at DATETIME NOT NULL
		);`,
		`CREATE TABLE IF NOT EXISTS repositories (
			id VARCHAR(255) PRIMARY KEY,
			full_name VARCHAR(255) UNIQUE NOT NULL,
			owner TEXT NOT NULL,
			name TEXT NOT NULL,
			language TEXT,
			stars INTEGER DEFAULT 0,
			description TEXT,
			github_url TEXT,
			is_trending BOOLEAN DEFAULT FALSE,
			refresh_interval_days INTEGER DEFAULT 1 NOT NULL,
			consecutive_stagnant_scans INTEGER DEFAULT 0 NOT NULL,
			next_rescan_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
			created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
		);`,
		`CREATE TABLE IF NOT EXISTS daily_snapshots (
			id VARCHAR(255) PRIMARY KEY,
			repository_id VARCHAR(255) NOT NULL,
			snapshot_date VARCHAR(255) NOT NULL,
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
			c_rank_tier VARCHAR(10) DEFAULT 'D',
			good_first_issue_count INTEGER DEFAULT 0,
			created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
			UNIQUE(repository_id, snapshot_date)
		);`,
		`CREATE TABLE IF NOT EXISTS repo_ai_insights (
			repo_id VARCHAR(255) PRIMARY KEY,
			maintainer_vibe TEXT NOT NULL,
			pr_guidelines TEXT NOT NULL,
			issue_quality_score REAL DEFAULT 0.0,
			raw_summary TEXT,
			warmth_score REAL DEFAULT 7.5,
			patience_score REAL DEFAULT 8.0,
			nitpick_ratio REAL DEFAULT 0.25,
			maintainer_persona VARCHAR(255) DEFAULT 'Encouraging Technical Mentor',
			dos_json TEXT,
			donts_json TEXT,
			updated_at DATETIME NOT NULL
		);`,
		`CREATE TABLE IF NOT EXISTS notification_queue (
			id INTEGER PRIMARY KEY AUTO_INCREMENT,
			user_id INTEGER NOT NULL,
			type TEXT NOT NULL,
			payload TEXT NOT NULL,
			status VARCHAR(50) NOT NULL DEFAULT 'pending',
			created_at DATETIME NOT NULL
		);`,
		`CREATE TABLE IF NOT EXISTS indexing_queue (
			id INTEGER PRIMARY KEY AUTO_INCREMENT,
			full_name VARCHAR(255) UNIQUE NOT NULL,
			owner TEXT NOT NULL,
			name TEXT NOT NULL,
			requested_by_user_id INTEGER,
			status VARCHAR(50) NOT NULL DEFAULT 'pending',
			priority INTEGER DEFAULT 1 NOT NULL,
			created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
			processed_at DATETIME
		);`,
		`CREATE TABLE IF NOT EXISTS latest_snapshots (
			repository_id VARCHAR(255) PRIMARY KEY,
			snapshot_date VARCHAR(255) NOT NULL,
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
			c_rank_tier VARCHAR(10) DEFAULT 'D',
			good_first_issue_count INTEGER DEFAULT 0,
			updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
		);`,
		`CREATE TABLE IF NOT EXISTS repo_raw_comments (
			id INTEGER PRIMARY KEY AUTO_INCREMENT,
			repository_id VARCHAR(255) NOT NULL,
			author_login TEXT,
			comment_text TEXT NOT NULL,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP
		);`,
		`CREATE TABLE IF NOT EXISTS repo_pr_events (
			id INTEGER PRIMARY KEY AUTO_INCREMENT,
			repository_id VARCHAR(255) NOT NULL,
			pr_number INTEGER NOT NULL,
			actor_login VARCHAR(255) NOT NULL,
			action VARCHAR(50) NOT NULL,
			event_at DATETIME NOT NULL,
			UNIQUE(repository_id, pr_number, action)
		);`,
		`CREATE TABLE IF NOT EXISTS discovery_cursors (
			lang VARCHAR(50) NOT NULL,
			bucket_min INT NOT NULL,
			bucket_max INT NOT NULL,
			push_start VARCHAR(10) NOT NULL DEFAULT '',
			search_cursor TEXT NOT NULL,
			last_swept DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
			PRIMARY KEY(lang, bucket_min, bucket_max)
		);`,
	}

	for i, stmt := range statements {
		if _, err := db.Exec(stmt); err != nil {
			return fmt.Errorf("auto-migrate statement %d failed: %w", i, err)
		}
	}

	// Indexes
	indexes := []string{
		`CREATE INDEX IF NOT EXISTS idx_daily_snapshots_repo_date ON daily_snapshots(repository_id, snapshot_date DESC)`,
		`CREATE INDEX IF NOT EXISTS idx_daily_snapshots_tier ON daily_snapshots(c_rank_tier)`,
		`CREATE INDEX IF NOT EXISTS idx_latest_snapshots_tier ON latest_snapshots(c_rank_tier)`,
		`CREATE INDEX IF NOT EXISTS idx_repositories_language ON repositories(language)`,
		`CREATE INDEX IF NOT EXISTS idx_repositories_stars ON repositories(stars)`,
		`CREATE INDEX IF NOT EXISTS idx_repos_next_rescan ON repositories(next_rescan_at ASC)`,
		`CREATE INDEX IF NOT EXISTS idx_indexing_queue_status_priority ON indexing_queue(status, priority, created_at)`,
		`CREATE INDEX IF NOT EXISTS idx_pr_events_repo_at ON repo_pr_events(repository_id, event_at)`,
		`CREATE INDEX IF NOT EXISTS idx_pr_events_repo_pr ON repo_pr_events(repository_id, pr_number)`,
	}
	for _, idx := range indexes {
		_, _ = db.Exec(idx)
	}

	return nil
}
