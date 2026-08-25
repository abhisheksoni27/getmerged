package db

import (
	"fmt"

	_ "github.com/go-sql-driver/mysql"
	"github.com/jmoiron/sqlx"
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
	autoInc := "AUTO_INCREMENT"
	if db.DriverName() == "sqlite" {
		autoInc = "AUTOINCREMENT"
	}

	statements := []string{
		fmt.Sprintf(`CREATE TABLE IF NOT EXISTS users (
			id INTEGER PRIMARY KEY %s,
			github_id INTEGER UNIQUE,
			google_id VARCHAR(255) UNIQUE,
			slug VARCHAR(255) UNIQUE,
			email_hash VARCHAR(64) UNIQUE,
			username TEXT NOT NULL,
			email TEXT,
			avatar_url TEXT,
			profiling_consent BOOLEAN DEFAULT FALSE,
			profiling_consent_at DATETIME,
			skills VARCHAR(100) NULL,
			lang_snapshot TEXT NULL,
			lang_snapshot_at DATETIME NULL,
			digest_unsubscribed BOOLEAN DEFAULT FALSE,
			email_invalid BOOLEAN DEFAULT FALSE,
			referral_code VARCHAR(32) UNIQUE,
			deleted_at DATETIME,
			created_at DATETIME NOT NULL,
			updated_at DATETIME NOT NULL
		);`, autoInc),
		fmt.Sprintf(`CREATE TABLE IF NOT EXISTS referral_credits (
			id INTEGER PRIMARY KEY %s,
			referrer_id INTEGER NOT NULL,
			new_user_id INTEGER NOT NULL,
			referrer_bonus INTEGER NOT NULL DEFAULT 0,
			referee_bonus INTEGER NOT NULL DEFAULT 0,
			created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
			UNIQUE(referrer_id, new_user_id)
		);`, autoInc),
		`CREATE TABLE IF NOT EXISTS user_oauth_tokens (
			user_id INTEGER NOT NULL,
			provider VARCHAR(50) NOT NULL DEFAULT 'github',
			access_token_enc TEXT NOT NULL,
			refresh_token_enc TEXT,
			expires_at DATETIME,
			updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
			PRIMARY KEY(user_id, provider)
		);`,
		`CREATE TABLE IF NOT EXISTS contributor_profiles (
			user_id INTEGER PRIMARY KEY,
			profiling_status VARCHAR(50) NOT NULL DEFAULT 'pending',
			dna_json TEXT,
			total_merged_prs INTEGER DEFAULT 0,
			last_error TEXT,
			locked_until DATETIME,
			analyzed_at DATETIME,
			updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
		);`,
		`CREATE TABLE IF NOT EXISTS user_entitlements (
			user_id INTEGER PRIMARY KEY,
			is_pro BOOLEAN DEFAULT FALSE,
			subscription_id VARCHAR(255),
			subscription_expires_at DATETIME,
			billing_cycle VARCHAR(50),
			monthly_eval_count INTEGER DEFAULT 0,
			bonus_evals INTEGER DEFAULT 0,
			current_period_start DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
			subscription_updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
		);`,
		`CREATE TABLE IF NOT EXISTS payment_webhook_events (
			event_id VARCHAR(255) PRIMARY KEY,
			event_type VARCHAR(100) NOT NULL,
			payload_json TEXT NOT NULL,
			processed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
		);`,
		`CREATE TABLE IF NOT EXISTS user_watchlists (
			user_id INTEGER NOT NULL,
			repo_id VARCHAR(255) NOT NULL,
			notify_rank_change BOOLEAN DEFAULT TRUE,
			created_at DATETIME NOT NULL,
			PRIMARY KEY(user_id, repo_id)
		);`,
		fmt.Sprintf(`CREATE TABLE IF NOT EXISTS macro_stats (
			id INTEGER PRIMARY KEY %s,
			metric_key VARCHAR(255) UNIQUE NOT NULL,
			metric_value TEXT NOT NULL,
			updated_at DATETIME NOT NULL
		);`, autoInc),
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
			trending_rank INTEGER DEFAULT 0,
			first_timer_badge VARCHAR(50) DEFAULT '',
			next_rescan_at DATETIME,
			rescan_interval_days INTEGER DEFAULT 1,
			consecutive_stagnant_count INTEGER DEFAULT 0,
			updated_at DATETIME NOT NULL
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
			bus_factor INTEGER DEFAULT 0,
			staleness_flag INTEGER DEFAULT 0,
			c_rank_score REAL DEFAULT 0,
			c_rank_tier VARCHAR(10) DEFAULT 'D',
			score_source VARCHAR(20) DEFAULT 'computed',
			good_first_issue_count INTEGER DEFAULT 0,
			onboarding_score INTEGER DEFAULT 0,
			response_p50_hours REAL DEFAULT 0,
			response_p90_hours REAL DEFAULT 0,
			created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
			UNIQUE(repository_id, snapshot_date)
		);`,
		fmt.Sprintf(`CREATE TABLE IF NOT EXISTS contributor_feedback (
			id INTEGER PRIMARY KEY %s,
			repository_id VARCHAR(255) NOT NULL,
			user_id INTEGER NOT NULL,
			maintainer_rating INTEGER NOT NULL,
			review_speed_rating INTEGER NOT NULL,
			beginner_friendly_rating INTEGER NOT NULL,
			comment TEXT,
			verified_pr_author BOOLEAN DEFAULT FALSE,
			created_at DATETIME NOT NULL,
			UNIQUE(user_id, repository_id)
		);`, autoInc),
		fmt.Sprintf(`CREATE TABLE IF NOT EXISTS ai_repo_insights (
			id INTEGER PRIMARY KEY %s,
			repository_id VARCHAR(255) UNIQUE NOT NULL,
			maintainer_vibe TEXT,
			pr_guidelines TEXT,
			warmth_score REAL DEFAULT 7.5,
			patience_score REAL DEFAULT 8.0,
			nitpick_ratio REAL DEFAULT 0.25,
			maintainer_persona VARCHAR(255) DEFAULT 'Encouraging Technical Mentor',
			dos_json TEXT,
			donts_json TEXT,
			updated_at DATETIME NOT NULL
		);`, autoInc),
		fmt.Sprintf(`CREATE TABLE IF NOT EXISTS notification_queue (
			id INTEGER PRIMARY KEY %s,
			user_id INTEGER NOT NULL,
			type TEXT NOT NULL,
			payload TEXT NOT NULL,
			status VARCHAR(50) NOT NULL DEFAULT 'pending',
			created_at DATETIME NOT NULL
		);`, autoInc),
		fmt.Sprintf(`CREATE TABLE IF NOT EXISTS digest_runs (
			id INTEGER PRIMARY KEY %s,
			week_start DATE NOT NULL UNIQUE,
			status VARCHAR(20) NOT NULL DEFAULT 'running',
			started_at DATETIME NOT NULL,
			finished_at DATETIME,
			alerted_repos INTEGER DEFAULT 0,
			emails_sent INTEGER DEFAULT 0,
			emails_failed INTEGER DEFAULT 0,
			skipped_new INTEGER DEFAULT 0
		);`, autoInc),
		fmt.Sprintf(`CREATE TABLE IF NOT EXISTS digest_recipients (
			id INTEGER PRIMARY KEY %s,
			week_start DATE NOT NULL,
			user_id INTEGER NOT NULL,
			email TEXT,
			status VARCHAR(20) NOT NULL DEFAULT 'pending',
			error TEXT,
			attempts INTEGER DEFAULT 0,
			created_at DATETIME NOT NULL,
			updated_at DATETIME NOT NULL,
			UNIQUE(week_start, user_id)
		);`, autoInc),
		`CREATE TABLE IF NOT EXISTS crank_alert_state (
			user_id INTEGER NOT NULL,
			repo_id VARCHAR(255) NOT NULL,
			last_alerted_tier VARCHAR(10) DEFAULT '',
			last_alerted_score REAL DEFAULT 0,
			last_alerted_snapshot_date VARCHAR(255) DEFAULT '',
			last_notified_unix INTEGER NOT NULL DEFAULT 0,
			rank_hash VARCHAR(64) DEFAULT '',
			fail_count INTEGER NOT NULL DEFAULT 0,
			dead_lettered BOOLEAN NOT NULL DEFAULT FALSE,
			last_failed_hash VARCHAR(64) DEFAULT '',
			PRIMARY KEY(user_id, repo_id)
		);`,
		fmt.Sprintf(`CREATE TABLE IF NOT EXISTS indexing_queue (
			id INTEGER PRIMARY KEY %s,
			full_name VARCHAR(255) UNIQUE NOT NULL,
			owner TEXT NOT NULL,
			name TEXT NOT NULL,
			requested_by_user_id INTEGER,
			status VARCHAR(50) NOT NULL DEFAULT 'pending',
			priority INTEGER DEFAULT 1 NOT NULL,
			created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
			processed_at DATETIME
		);`, autoInc),
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
			bus_factor INTEGER DEFAULT 0,
			staleness_flag INTEGER DEFAULT 0,
			c_rank_score REAL DEFAULT 0,
			c_rank_tier VARCHAR(10) DEFAULT 'D',
			score_source VARCHAR(20) DEFAULT 'computed',
			good_first_issue_count INTEGER DEFAULT 0,
			onboarding_score INTEGER DEFAULT 0,
			response_p50_hours REAL DEFAULT 0,
			response_p90_hours REAL DEFAULT 0,
			pr_count_6m INTEGER DEFAULT 0,
			issue_count_6m INTEGER DEFAULT 0,
			updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
		);`,
		fmt.Sprintf(`CREATE TABLE IF NOT EXISTS repo_raw_comments (
			id INTEGER PRIMARY KEY %s,
			repository_id VARCHAR(255) NOT NULL,
			author_login TEXT,
			comment_text TEXT NOT NULL,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP
		);`, autoInc),
		fmt.Sprintf(`CREATE TABLE IF NOT EXISTS repo_pr_comments (
			id INTEGER PRIMARY KEY %s,
			repository_id VARCHAR(255) NOT NULL,
			pr_number INTEGER NOT NULL,
			source_type VARCHAR(50) NOT NULL,
			author_login VARCHAR(255) NOT NULL,
			author_association VARCHAR(50) NOT NULL,
			comment_text TEXT NOT NULL,
			created_at DATETIME NOT NULL,
			UNIQUE(repository_id, pr_number, source_type, author_login, created_at)
		);`, autoInc),
		fmt.Sprintf(`CREATE TABLE IF NOT EXISTS repo_issue_comments (
			id INTEGER PRIMARY KEY %s,
			repository_id VARCHAR(255) NOT NULL,
			comment_text TEXT NOT NULL,
			created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
		);`, autoInc),
		fmt.Sprintf(`CREATE TABLE IF NOT EXISTS repo_pr_events (
			id INTEGER PRIMARY KEY %s,
			repository_id VARCHAR(255) NOT NULL,
			pr_number INTEGER NOT NULL,
			actor_login VARCHAR(255) NOT NULL,
			action VARCHAR(50) NOT NULL,
			event_at DATETIME NOT NULL,
			UNIQUE(repository_id, pr_number, action)
		);`, autoInc),
		`CREATE TABLE IF NOT EXISTS discovery_cursors (
			lang VARCHAR(50) NOT NULL,
			bucket_min INT NOT NULL,
			bucket_max INT NOT NULL,
			push_start VARCHAR(10) NOT NULL DEFAULT '',
			search_cursor TEXT NOT NULL,
			last_swept DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
			PRIMARY KEY(lang, bucket_min, bucket_max)
		);`,
		fmt.Sprintf(`CREATE TABLE IF NOT EXISTS repo_good_first_issues (
			id INTEGER PRIMARY KEY %s,
			repository_id VARCHAR(255) NOT NULL,
			issue_number INTEGER NOT NULL,
			title VARCHAR(500) NOT NULL,
			body_text TEXT,
			url VARCHAR(500) NOT NULL,
			comments_count INTEGER DEFAULT 0,
			labels_json TEXT NOT NULL,
			quality_score INTEGER DEFAULT 0,
			created_at DATETIME NOT NULL,
			synced_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
			UNIQUE(repository_id, issue_number)
		);`, autoInc),
		`CREATE TABLE IF NOT EXISTS repository_topics (
			topic VARCHAR(100) NOT NULL,
			repository_id VARCHAR(255) NOT NULL,
			created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
			PRIMARY KEY (topic, repository_id)
		);`,
		fmt.Sprintf(`CREATE TABLE IF NOT EXISTS daily_metrics (
			id INTEGER PRIMARY KEY %s,
			category VARCHAR(100) NOT NULL,
			stat_name VARCHAR(100) NOT NULL,
			stat_value REAL NOT NULL,
			stat_date VARCHAR(20) NOT NULL,
			stat_type VARCHAR(50) NOT NULL,
			metadata TEXT,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			UNIQUE(category, stat_name, stat_date)
		);`, autoInc),
		fmt.Sprintf(`CREATE TABLE IF NOT EXISTS pr_snapshots (
			id INTEGER PRIMARY KEY %s,
			pr_id VARCHAR(255) NOT NULL,
			user_id INTEGER NOT NULL,
			repository_id VARCHAR(255) NOT NULL,
			pr_number INTEGER NOT NULL,
			title TEXT,
			html_url TEXT,
			state VARCHAR(30) NOT NULL DEFAULT 'open',
			pr_created_at DATETIME,
			github_updated_at DATETIME,
			merged_at DATETIME,
			fetched_at DATETIME NOT NULL,
			snapshot_at DATETIME NOT NULL,
			UNIQUE(pr_id, snapshot_at)
		);`, autoInc),
		fmt.Sprintf(`CREATE TABLE IF NOT EXISTS pr_state_transitions (
			id INTEGER PRIMARY KEY %s,
			pr_id VARCHAR(255) NOT NULL,
			user_id INTEGER NOT NULL,
			from_state VARCHAR(30) NOT NULL DEFAULT '',
			to_state VARCHAR(30) NOT NULL,
			notified BOOLEAN DEFAULT FALSE,
			occurred_at DATETIME NOT NULL
		);`, autoInc),
		fmt.Sprintf(`CREATE TABLE IF NOT EXISTS pr_evaluations (
			id INTEGER PRIMARY KEY %s,
			eval_id VARCHAR(128) NOT NULL,
			repository_full_name VARCHAR(255) NOT NULL,
			pr_number INTEGER NULL,
			predicted_score INTEGER NOT NULL DEFAULT 0,
			owner_user_id INTEGER NULL,
			outcome VARCHAR(20) NOT NULL DEFAULT 'pending',
			resolved_at DATETIME NULL,
			merged_at DATETIME NULL,
			days_to_merge REAL NULL,
			outcome_hash VARCHAR(40) NOT NULL DEFAULT '',
			created_at DATETIME NOT NULL,
			updated_at DATETIME NOT NULL,
			UNIQUE(eval_id)
		);`, autoInc),
		fmt.Sprintf(`CREATE TABLE IF NOT EXISTS og_regen_queue (
			id INTEGER PRIMARY KEY %s,
			eval_id VARCHAR(128) NOT NULL,
			outcome_hash VARCHAR(40) NOT NULL,
			status VARCHAR(20) NOT NULL DEFAULT 'pending',
			attempts INTEGER NOT NULL DEFAULT 0,
			created_at DATETIME NOT NULL,
			completed_at DATETIME NULL,
			UNIQUE(eval_id, outcome_hash)
		);`, autoInc),
		`CREATE TABLE IF NOT EXISTS pr_connections (
			user_id INTEGER PRIMARY KEY,
			github_login TEXT,
			status VARCHAR(40) NOT NULL DEFAULT 'active',
			last_limited BOOLEAN DEFAULT FALSE,
			last_synced_at DATETIME,
			last_error TEXT,
			updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
		);`,
		fmt.Sprintf(`CREATE TABLE IF NOT EXISTS share_cards (
			id VARCHAR(64) PRIMARY KEY,
			user_id INTEGER NOT NULL,
			repo_full_name VARCHAR(255) NOT NULL,
			pr_title TEXT,
			summary TEXT,
			overall_score REAL DEFAULT 0,
			ready_to_merge BOOLEAN DEFAULT FALSE,
			ref_token VARCHAR(128) NOT NULL,
			consent_given BOOLEAN NOT NULL DEFAULT FALSE,
			revoked_at DATETIME,
			created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
			expires_at DATETIME NOT NULL
		);`),
		fmt.Sprintf(`CREATE TABLE IF NOT EXISTS user_api_keys (
			id INTEGER PRIMARY KEY %s,
			user_id INTEGER NOT NULL,
			name VARCHAR(255) NOT NULL DEFAULT 'default',
			key_prefix VARCHAR(16) NOT NULL,
			key_hash VARCHAR(64) UNIQUE NOT NULL,
			last_used_at DATETIME,
			revoked_at DATETIME,
			created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
		);`, autoInc),
		fmt.Sprintf(`CREATE TABLE IF NOT EXISTS repo_claims (
			id INTEGER PRIMARY KEY %s,
			repo_id VARCHAR(255) NOT NULL,
			full_name VARCHAR(255) NOT NULL DEFAULT '',
			owner_user_id INTEGER NOT NULL,
			verification_method VARCHAR(50) NOT NULL DEFAULT 'file',
			state VARCHAR(30) NOT NULL DEFAULT 'pending',
			nonce_token VARCHAR(128) NOT NULL,
			expires_at DATETIME NOT NULL,
			verified_at DATETIME,
			last_checked_at DATETIME,
			revoked_at DATETIME,
			revoke_reason VARCHAR(255) DEFAULT '',
			created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
			UNIQUE(repo_id, owner_user_id)
		);`, autoInc),
		fmt.Sprintf(`CREATE TABLE IF NOT EXISTS claim_disputes (
			id INTEGER PRIMARY KEY %s,
			repo_full_name VARCHAR(255) NOT NULL,
			reporter_user_id INTEGER NOT NULL,
			claimed_user_id INTEGER,
			note TEXT,
			status VARCHAR(30) NOT NULL DEFAULT 'open',
			created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
		);`, autoInc),
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
		`CREATE INDEX IF NOT EXISTS idx_raw_comments_repo_at ON repo_raw_comments(repository_id, created_at)`,
		`CREATE INDEX IF NOT EXISTS idx_pr_comments_repo_pr ON repo_pr_comments(repository_id, pr_number, created_at)`,
		`CREATE INDEX IF NOT EXISTS idx_gfi_repo_created ON repo_good_first_issues(repository_id, created_at DESC)`,
		`CREATE INDEX IF NOT EXISTS idx_gfi_quality_score ON repo_good_first_issues(quality_score DESC)`,
		`CREATE INDEX IF NOT EXISTS idx_repositories_owner ON repositories(owner(191))`,
		`CREATE INDEX IF NOT EXISTS idx_repo_topic_repo_id ON repository_topics(repository_id)`,
		`CREATE INDEX IF NOT EXISTS idx_daily_metrics_lookup ON daily_metrics(category, stat_name, stat_date DESC)`,
		`CREATE INDEX IF NOT EXISTS idx_pr_snapshots_user ON pr_snapshots(user_id, github_updated_at DESC)`,
		`CREATE INDEX IF NOT EXISTS idx_pr_snapshots_repo ON pr_snapshots(repository_id)`,
		`CREATE INDEX IF NOT EXISTS idx_pr_transitions_pr ON pr_state_transitions(pr_id, occurred_at DESC)`,
	`CREATE INDEX IF NOT EXISTS idx_pr_evals_repo ON pr_evaluations(repository_full_name, pr_number)`,
	`CREATE INDEX IF NOT EXISTS idx_pr_evals_owner ON pr_evaluations(owner_user_id, outcome)`,
	`CREATE INDEX IF NOT EXISTS idx_og_regen_pending ON og_regen_queue(status, created_at)`,
		`CREATE INDEX IF NOT EXISTS idx_share_cards_user ON share_cards(user_id, created_at DESC)`,
		`CREATE INDEX IF NOT EXISTS idx_user_api_keys_user ON user_api_keys(user_id)`,
		`CREATE INDEX IF NOT EXISTS idx_repo_claims_user ON repo_claims(owner_user_id)`,
		`CREATE INDEX IF NOT EXISTS idx_repo_claims_repo_state ON repo_claims(repo_id, state)`,
	}
	for _, idx := range indexes {
		_, _ = db.Exec(idx)
	}

	// Schema alterations for existing databases
	_, _ = db.Exec(`ALTER TABLE users ADD COLUMN google_id VARCHAR(255) UNIQUE`)
	_, _ = db.Exec(`ALTER TABLE users MODIFY github_id INTEGER NULL`)
	_, _ = db.Exec(`ALTER TABLE users ADD COLUMN slug VARCHAR(255) UNIQUE`)
	_, _ = db.Exec(`ALTER TABLE daily_snapshots ADD COLUMN onboarding_score INTEGER DEFAULT 0`)
	_, _ = db.Exec(`ALTER TABLE latest_snapshots ADD COLUMN onboarding_score INTEGER DEFAULT 0`)
	_, _ = db.Exec(`ALTER TABLE daily_snapshots ADD COLUMN response_p50_hours REAL DEFAULT 0`)
	_, _ = db.Exec(`ALTER TABLE daily_snapshots ADD COLUMN response_p90_hours REAL DEFAULT 0`)
	_, _ = db.Exec(`ALTER TABLE latest_snapshots ADD COLUMN response_p50_hours REAL DEFAULT 0`)
	_, _ = db.Exec(`ALTER TABLE latest_snapshots ADD COLUMN response_p90_hours REAL DEFAULT 0`)
	_, _ = db.Exec(`ALTER TABLE repo_good_first_issues ADD COLUMN quality_score INTEGER DEFAULT 0`)
	_, _ = db.Exec(`ALTER TABLE daily_snapshots ADD COLUMN bus_factor INTEGER DEFAULT 0`)
	_, _ = db.Exec(`ALTER TABLE latest_snapshots ADD COLUMN bus_factor INTEGER DEFAULT 0`)
	_, _ = db.Exec(`ALTER TABLE latest_snapshots ADD COLUMN pr_count_6m INTEGER DEFAULT 0`)
	_, _ = db.Exec(`ALTER TABLE latest_snapshots ADD COLUMN issue_count_6m INTEGER DEFAULT 0`)
	_, _ = db.Exec(`ALTER TABLE daily_snapshots ADD COLUMN score_source VARCHAR(20) DEFAULT 'computed'`)
	_, _ = db.Exec(`ALTER TABLE latest_snapshots ADD COLUMN score_source VARCHAR(20) DEFAULT 'computed'`)
	_, _ = db.Exec(`ALTER TABLE repo_ai_insights ADD COLUMN deep_sections_json MEDIUMTEXT NULL`)
	_, _ = db.Exec(`ALTER TABLE users ADD COLUMN deleted_at DATETIME`)
	_, _ = db.Exec(`ALTER TABLE users ADD COLUMN profiling_consent BOOLEAN DEFAULT FALSE`)
	_, _ = db.Exec(`ALTER TABLE users ADD COLUMN profiling_consent_at DATETIME`)
	_, _ = db.Exec(`ALTER TABLE users ADD COLUMN skills VARCHAR(100) NULL`)
	_, _ = db.Exec(`ALTER TABLE users ADD COLUMN lang_snapshot TEXT NULL`)
	_, _ = db.Exec(`ALTER TABLE users ADD COLUMN lang_snapshot_at DATETIME NULL`)
	_, _ = db.Exec(`ALTER TABLE users ADD COLUMN digest_unsubscribed BOOLEAN DEFAULT FALSE`)
	_, _ = db.Exec(`ALTER TABLE users ADD COLUMN referral_code VARCHAR(32) UNIQUE`)
	_, _ = db.Exec(`ALTER TABLE user_entitlements ADD COLUMN bonus_evals INTEGER DEFAULT 0`)
	// C-Rank alert state: rank hash for CAS writes (AC2/AC6), failure cap and
	// dead-letter flag (AC3), plus watcher e-mail validity suppression (AC8).
	_, _ = db.Exec(`ALTER TABLE crank_alert_state ADD COLUMN rank_hash VARCHAR(64) DEFAULT ''`)
	_, _ = db.Exec(`ALTER TABLE crank_alert_state ADD COLUMN fail_count INTEGER NOT NULL DEFAULT 0`)
	_, _ = db.Exec(`ALTER TABLE crank_alert_state ADD COLUMN dead_lettered BOOLEAN NOT NULL DEFAULT FALSE`)
	_, _ = db.Exec(`ALTER TABLE crank_alert_state ADD COLUMN last_failed_hash VARCHAR(64) DEFAULT ''`)
	_, _ = db.Exec(`ALTER TABLE users ADD COLUMN email_invalid BOOLEAN DEFAULT FALSE`)
	_, _ = db.Exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_referral_credits_new_user ON referral_credits(new_user_id)`)
	_, _ = db.Exec(`ALTER TABLE contributor_feedback ADD UNIQUE KEY uq_cf_user_repo (user_id, repository_id)`)
	_, _ = db.Exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_cf_user_repo ON contributor_feedback(user_id, repository_id)`)
	_, _ = db.Exec(`INSERT IGNORE INTO contributor_feedback (repository_id, user_id, maintainer_rating, review_speed_rating, beginner_friendly_rating, comment, verified_pr_author, created_at)
		SELECT repository_id, CAST(user_id AS UNSIGNED), maintainer_rating, review_speed_rating, beginner_rating, comment, verified_contributor, created_at
		FROM contributor_feedbacks`)
	_, _ = db.Exec(`ALTER TABLE repo_claims ADD UNIQUE KEY uq_repo_claims_user (repo_id, owner_user_id)`)
	_, _ = db.Exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_repo_claims_user ON repo_claims(repo_id, owner_user_id)`)
	_, _ = db.Exec(`ALTER TABLE repo_claims ADD COLUMN full_name VARCHAR(255) NOT NULL DEFAULT ''`)

	return nil
}
