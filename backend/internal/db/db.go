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
			public_accuracy BOOLEAN DEFAULT FALSE,
			is_public BOOLEAN DEFAULT FALSE,
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
			persona VARCHAR(64),
			stars_pulled_in INTEGER,
			updated_persona_at DATETIME,
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
	// One-time preflight credit packs: ledger keyed by unique purchase_id
	// (DodoPayments payment ID) so webhook/reconcile replays are no-ops and
	// concurrent grants cannot double-credit at the DB level.
	fmt.Sprintf(`CREATE TABLE IF NOT EXISTS credit_packs (
		id INTEGER PRIMARY KEY %s,
		user_id INTEGER NOT NULL,
		purchase_id VARCHAR(255) UNIQUE NOT NULL,
		sku VARCHAR(100) NOT NULL DEFAULT 'preflight_pack_10',
		credits INTEGER NOT NULL DEFAULT 10,
		granted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
	);`, autoInc),
	// Pack purchase orders: created server-side at checkout time so
	// GET /credits/pack-status can enforce order ownership (AC4). status is
	// pending | granted | canceled | failed.
	`CREATE TABLE IF NOT EXISTS credit_pack_orders (
		order_id VARCHAR(64) PRIMARY KEY,
		user_id INTEGER NOT NULL,
		dodo_checkout_id VARCHAR(255) NOT NULL DEFAULT '',
		status VARCHAR(20) NOT NULL DEFAULT 'pending',
		created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
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
		fmt.Sprintf(`CREATE TABLE IF NOT EXISTS crank_outbox (
			id INTEGER PRIMARY KEY %s,
			user_id INTEGER NOT NULL,
			repo_id VARCHAR(255) NOT NULL,
			alert_date DATE NOT NULL,
			full_name VARCHAR(255) DEFAULT '',
			prev_tier VARCHAR(10) DEFAULT '',
			new_tier VARCHAR(10) DEFAULT '',
			prev_score REAL DEFAULT 0,
			new_score REAL DEFAULT 0,
			merge_rate REAL DEFAULT 0,
			response_hours REAL DEFAULT 0,
			prev_rank_hash VARCHAR(64) DEFAULT '',
			new_snap_date VARCHAR(255) DEFAULT '',
			status VARCHAR(20) NOT NULL DEFAULT 'pending',
			attempts INTEGER NOT NULL DEFAULT 0,
			next_attempt_at DATETIME NULL,
			sent_at DATETIME NULL,
			last_error TEXT,
			created_at DATETIME NOT NULL,
			updated_at DATETIME NOT NULL,
			UNIQUE(user_id, repo_id, alert_date)
		);`, autoInc),
		fmt.Sprintf(`CREATE TABLE IF NOT EXISTS sent_alerts (
			id INTEGER PRIMARY KEY %s,
			run_id VARCHAR(64) NOT NULL,
			user_id INTEGER NOT NULL,
			repo_id VARCHAR(255) NOT NULL,
			created_at DATETIME NOT NULL,
			UNIQUE(run_id, user_id, repo_id)
		);`, autoInc),
		`CREATE TABLE IF NOT EXISTS crank_run_state (
			id INTEGER NOT NULL PRIMARY KEY,
			last_rescore_completed_at DATETIME NOT NULL,
			updated_at DATETIME NOT NULL
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
			bounty_amount_usd DOUBLE NULL,
			bounty_status VARCHAR(20) NOT NULL DEFAULT 'active',
			created_at DATETIME NOT NULL,
			synced_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
			alert_dedup_key VARCHAR(128) NOT NULL DEFAULT '',
			alert_content_hash VARCHAR(64) NOT NULL DEFAULT '',
			alert_refresh_fired_at DATETIME NULL,
			issue_updated_at DATETIME NULL,
			alert_last_updated_at DATETIME NULL,
			UNIQUE(repository_id, issue_number)
		);`, autoInc),
		// Paid bounty boost entitlements: one row per payment (payment_id is
		// the idempotency key). Listing queries join live with expires_at >
		// NOW() so refunds revoke the remaining window at query time.
		`CREATE TABLE IF NOT EXISTS gfi_bounty_boosts (
			payment_id VARCHAR(128) PRIMARY KEY,
			user_id INTEGER NOT NULL,
			repository_id VARCHAR(255) NOT NULL,
			issue_number INTEGER NOT NULL,
			amount_cents INTEGER NOT NULL DEFAULT 0,
			status VARCHAR(20) NOT NULL DEFAULT 'active',
			boost_started_at DATETIME NULL,
			expires_at DATETIME NOT NULL,
			created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
		);`,
		// Boost purchase orders tracked from checkout creation to webhook /
		// poll reconciliation (mirrors credit_pack_orders).
		`CREATE TABLE IF NOT EXISTS gfi_bounty_boost_orders (
			order_id VARCHAR(64) PRIMARY KEY,
			user_id INTEGER NOT NULL,
			repository_id VARCHAR(255) NOT NULL DEFAULT '',
			issue_number INTEGER NOT NULL DEFAULT 0,
			dodo_checkout_id VARCHAR(128) NULL,
			status VARCHAR(20) NOT NULL DEFAULT 'pending',
			created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
		);`,
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
			requested_reviewers TEXT,
			is_draft BOOLEAN DEFAULT FALSE,
			ready_for_review_at DATETIME,
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
			is_public BOOLEAN DEFAULT FALSE,
			resolved_at DATETIME NULL,
			merged_at DATETIME NULL,
			days_to_merge REAL NULL,
			outcome_hash VARCHAR(40) NOT NULL DEFAULT '',
			last_synced_at DATETIME NULL,
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
		`CREATE TABLE IF NOT EXISTS ghapp_installations (
			installation_id BIGINT PRIMARY KEY,
			account_login VARCHAR(255) NOT NULL DEFAULT '',
			account_id BIGINT NOT NULL DEFAULT 0,
			installer_login VARCHAR(255) NOT NULL DEFAULT '',
			installer_id BIGINT NOT NULL DEFAULT 0,
			has_issues_write BOOLEAN NOT NULL DEFAULT FALSE,
			org_verified_at DATETIME NULL,
			installed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
		);`,
		`CREATE TABLE IF NOT EXISTS ghapp_installation_repos (
			installation_id BIGINT NOT NULL,
			repo_id BIGINT NOT NULL,
			full_name VARCHAR(255) NOT NULL,
			is_private BOOLEAN NOT NULL DEFAULT FALSE,
			added_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
			PRIMARY KEY (installation_id, repo_id)
		);`,
		fmt.Sprintf(`CREATE TABLE IF NOT EXISTS ghapp_welcomes (
			id INTEGER PRIMARY KEY %s,
			installation_id BIGINT NOT NULL,
			repo_id BIGINT NOT NULL,
			contributor_login VARCHAR(255) NOT NULL,
			pr_number INTEGER NOT NULL DEFAULT 0,
			comment_id BIGINT NOT NULL DEFAULT 0,
			status VARCHAR(32) NOT NULL DEFAULT 'pending',
			created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
			UNIQUE(repo_id, pr_number)
		);`, autoInc),
		`CREATE TABLE IF NOT EXISTS ghapp_budget_usage (
			installation_id BIGINT NOT NULL,
			usage_date DATE NOT NULL,
			posted_count INTEGER NOT NULL DEFAULT 0,
			skipped_count INTEGER NOT NULL DEFAULT 0,
			PRIMARY KEY (installation_id, usage_date)
		);`,
		fmt.Sprintf(`CREATE TABLE IF NOT EXISTS gfi_subscribers (
			id INTEGER PRIMARY KEY %s,
			email VARCHAR(255) UNIQUE NOT NULL,
			languages TEXT NULL,
			tech_stacks TEXT NULL,
			tiers VARCHAR(20) NULL,
			frequency VARCHAR(16) NOT NULL DEFAULT 'weekly',
			verified_at DATETIME NULL,
			unsubscribed_at DATETIME NULL,
			opt_out BOOLEAN NOT NULL DEFAULT FALSE,
			disabled BOOLEAN NOT NULL DEFAULT FALSE,
			hard_bounces INTEGER NOT NULL DEFAULT 0,
			soft_bounces INTEGER NOT NULL DEFAULT 0,
			created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
		);`, autoInc),
		fmt.Sprintf(`CREATE TABLE IF NOT EXISTS gfi_email_queue (
			id INTEGER PRIMARY KEY %s,
			subscriber_id INTEGER NOT NULL,
			idempotency_key VARCHAR(255) UNIQUE NOT NULL,
			repo_id VARCHAR(255) NOT NULL,
			issue_number INTEGER NOT NULL,
			delivery_mode VARCHAR(16) NOT NULL DEFAULT 'instant',
			status VARCHAR(20) NOT NULL DEFAULT 'pending',
			attempts INTEGER NOT NULL DEFAULT 0,
			last_error TEXT NULL,
			next_attempt_at DATETIME NULL,
			claimed_at DATETIME NULL,
			created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
			sent_at DATETIME NULL
		);`, autoInc),
		fmt.Sprintf(`CREATE TABLE IF NOT EXISTS email_suppressions (
			id INTEGER PRIMARY KEY %s,
			email VARCHAR(255) UNIQUE NOT NULL,
			reason VARCHAR(32) NOT NULL DEFAULT 'hard_bounce',
			source VARCHAR(32) NOT NULL DEFAULT '',
			created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
		);`, autoInc),
		fmt.Sprintf(`CREATE TABLE IF NOT EXISTS gfi_signup_attempts (
			id INTEGER PRIMARY KEY %s,
			ip VARCHAR(64) NOT NULL,
			email VARCHAR(255) NOT NULL,
			created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
		);`, autoInc),
		fmt.Sprintf(`CREATE TABLE IF NOT EXISTS gfi_endpoint_rate_limits (
			id INTEGER PRIMARY KEY %s,
			ip VARCHAR(64) NOT NULL,
			endpoint VARCHAR(32) NOT NULL DEFAULT '',
			created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
		);`, autoInc),
		`CREATE TABLE IF NOT EXISTS gfi_daily_send_counts (
			subscriber_id INTEGER NOT NULL,
			day VARCHAR(10) NOT NULL,
			email_count INTEGER NOT NULL DEFAULT 0,
			PRIMARY KEY (subscriber_id, day)
		);`,
		fmt.Sprintf(`CREATE TABLE IF NOT EXISTS user_alert_prefs (
			user_id INTEGER PRIMARY KEY,
			languages TEXT NULL,
			tech_stacks TEXT NULL,
			tiers VARCHAR(20) NULL,
			frequency VARCHAR(16) NOT NULL DEFAULT 'weekly',
			unsubscribed_at DATETIME NULL,
			created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
		);`),
		fmt.Sprintf(`CREATE TABLE IF NOT EXISTS gfi_notification_log (
			id INTEGER PRIMARY KEY %s,
			user_id INTEGER NOT NULL,
			issue_key VARCHAR(300) NOT NULL,
			repo_id VARCHAR(255) NOT NULL DEFAULT '',
			issue_number INTEGER NOT NULL DEFAULT 0,
			source VARCHAR(16) NOT NULL DEFAULT 'digest',
			status VARCHAR(20) NOT NULL DEFAULT 'pending',
			attempts INTEGER NOT NULL DEFAULT 0,
			next_attempt_at DATETIME NULL,
			claimed_at DATETIME NULL,
			cycle_key VARCHAR(20) NOT NULL DEFAULT '',
			notified_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
			UNIQUE(user_id, issue_key)
		);`, autoInc),
		`CREATE TABLE IF NOT EXISTS gfi_digest_watermark (
			watermark_key VARCHAR(50) PRIMARY KEY,
			last_issue_opened_at DATETIME NOT NULL,
			updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
		);`,
		fmt.Sprintf(`CREATE TABLE IF NOT EXISTS email_suppression_events (
			id INTEGER PRIMARY KEY %s,
			event_id VARCHAR(255) UNIQUE NOT NULL,
			email VARCHAR(255) NOT NULL DEFAULT '',
			event_type VARCHAR(32) NOT NULL DEFAULT 'bounce',
			provider VARCHAR(32) NOT NULL DEFAULT '',
			created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
		);`, autoInc),
		`CREATE TABLE IF NOT EXISTS gfi_digest_send_cursor (
			cursor_key VARCHAR(64) PRIMARY KEY,
			last_user_id INTEGER NOT NULL DEFAULT 0,
			updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
		);`,
		// AC7: portable advisory locks — one row per job name, owner token
		// + expiry so overlapping cron runs no-op and stale locks expire.
		`CREATE TABLE IF NOT EXISTS job_locks (
			name VARCHAR(64) PRIMARY KEY,
			owner VARCHAR(64) NOT NULL DEFAULT '',
			locked_until DATETIME NOT NULL
		);`,
		fmt.Sprintf(`CREATE TABLE IF NOT EXISTS gfi_claim_links (
			id INTEGER PRIMARY KEY %s,
			token_hash CHAR(64) UNIQUE NOT NULL,
			subscriber_id INTEGER NOT NULL,
			repo_id VARCHAR(255) NOT NULL,
			full_name VARCHAR(255) NOT NULL DEFAULT '',
			issue_number INTEGER NOT NULL DEFAULT 0,
			expires_at DATETIME NOT NULL,
			consumed_at DATETIME NULL,
			created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
		);`, autoInc),
		// PR stall rescue alerts: stall key = (pr_id, clock-anchor epoch)
		// stored in the unique (pr_id, stall_epoch_bucket) index, so each
		// threshold crossing queues exactly one alert (AC3). Lifecycle
		// pending -> sent | stale | failed with a single 60s-gated retry
		// before 'failed' (AC6).
		fmt.Sprintf(`CREATE TABLE IF NOT EXISTS pr_stall_alerts (
			id INTEGER PRIMARY KEY %s,
			pr_id VARCHAR(255) NOT NULL,
			user_id INTEGER NOT NULL,
			repository_id VARCHAR(255) NOT NULL DEFAULT '',
			stall_epoch_bucket INTEGER NOT NULL,
			status VARCHAR(16) NOT NULL DEFAULT 'pending',
			attempts INTEGER NOT NULL DEFAULT 0,
			next_attempt_at DATETIME NULL,
			payload TEXT NOT NULL,
			last_error TEXT NULL,
			created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
			sent_at DATETIME NULL,
			updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
			UNIQUE(pr_id, stall_epoch_bucket)
		);`, autoInc),
		// Stall-rescue episode gate (AC3): unique (pr_id, last_crossed_at);
		// INSERT (OR) IGNORE here is the sole permission to send.
		fmt.Sprintf(`CREATE TABLE IF NOT EXISTS alerts_sent (
			id INTEGER PRIMARY KEY %s,
			pr_id VARCHAR(255) NOT NULL,
			last_crossed_at DATETIME NOT NULL,
			user_id INTEGER NOT NULL DEFAULT 0,
			repository_id VARCHAR(255) NOT NULL DEFAULT '',
			created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
			UNIQUE(pr_id, last_crossed_at)
		);`, autoInc),
		// Stall-rescue episode state (AC1/AC3): episode_start is the most
		// recent accepted review-event instant; alerted_at pins the last
		// alert within that episode (one alert per episode).
		fmt.Sprintf(`CREATE TABLE IF NOT EXISTS pr_stall_state (
			pr_id VARCHAR(255) PRIMARY KEY,
			user_id INTEGER NOT NULL,
			repository_id VARCHAR(255) NOT NULL DEFAULT '',
			last_crossed_at DATETIME NULL,
			below_p50_since DATETIME NULL,
			episode_start DATETIME NULL,
			alerted_at DATETIME NULL,
			updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
		);`),
		// Review-event log (AC1/AC2): idempotent by (pr_id, event_id);
		// accepted events restart the stall episode at their timestamp.
		fmt.Sprintf(`CREATE TABLE IF NOT EXISTS pr_review_events (
			id INTEGER PRIMARY KEY %s,
			pr_id VARCHAR(255) NOT NULL,
			event_id VARCHAR(255) NOT NULL,
			event_type VARCHAR(32) NOT NULL DEFAULT '',
			occurred_at DATETIME NOT NULL,
			created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
			UNIQUE(pr_id, event_id)
		);`, autoInc),
		// Delivery failures (AC7): error + retry_count per stalled PR; one
		// retry next cycle, then dead-lettered.
		fmt.Sprintf(`CREATE TABLE IF NOT EXISTS alerts_failed (
			id INTEGER PRIMARY KEY %s,
			pr_id VARCHAR(255) NOT NULL,
			user_id INTEGER NOT NULL DEFAULT 0,
			channel VARCHAR(32) NOT NULL DEFAULT '',
			error TEXT NULL,
			retry_count INTEGER NOT NULL DEFAULT 0,
			status VARCHAR(16) NOT NULL DEFAULT 'retry',
			created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
			UNIQUE(pr_id)
		);`, autoInc),
		// PR simulator submissions (AC5): diff AES-256 encrypted at rest
		// under a random UUID key; rows auto-delete after 24h. Badges
		// reference only the UUID, never the raw diff.
		fmt.Sprintf(`CREATE TABLE IF NOT EXISTS pr_sim_submissions (
			id VARCHAR(36) PRIMARY KEY,
			payload_hash CHAR(64) NOT NULL,
			repo_full_name VARCHAR(255) NOT NULL DEFAULT '',
			diff_enc MEDIUMTEXT NOT NULL,
			result_json TEXT NOT NULL,
			created_at DATETIME NOT NULL,
			expires_at DATETIME NOT NULL
		);`),
		// Hacktoberfest hub: persisted set of qualifying merge IDs (AC2/AC8)
		// and per-user/year progress with the card_issued CAS flag (AC4).
		fmt.Sprintf(`CREATE TABLE IF NOT EXISTS hacktoberfest_merges (
			id INTEGER PRIMARY KEY %s,
			user_id INTEGER NOT NULL,
			year INTEGER NOT NULL,
			pr_id VARCHAR(255) NOT NULL,
			repository_id VARCHAR(255) NOT NULL DEFAULT '',
			pr_number INTEGER NOT NULL DEFAULT 0,
			title TEXT,
			html_url TEXT,
			merged_at DATETIME NULL,
			created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
			UNIQUE(user_id, year, pr_id)
		);`, autoInc),
		`CREATE TABLE IF NOT EXISTS hacktoberfest_progress (
			user_id INTEGER NOT NULL,
			year INTEGER NOT NULL,
			card_issued BOOLEAN NOT NULL DEFAULT FALSE,
			card_id VARCHAR(64) NOT NULL DEFAULT '',
			total_qualifying INTEGER NOT NULL DEFAULT -1,
			last_reconciled_at DATETIME NULL,
			last_nudge_at DATETIME NULL,
			backoff_until DATETIME NULL,
			backoff_attempts INTEGER NOT NULL DEFAULT 0,
			updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
			PRIMARY KEY(user_id, year)
		);`,
		// AC5 lazy polling: only users with a recently-active page get polled.
		`CREATE TABLE IF NOT EXISTS hacktoberfest_activity (
			user_id INTEGER PRIMARY KEY,
			last_active_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
		);`,
		// Contributor XP seasons (AC1/AC5): one row per awarded source on a
		// scored eval; idempotent by UNIQUE(source, eval_id) under ON
		// CONFLICT DO NOTHING. AC2 streak state is derived from events.
		fmt.Sprintf(`CREATE TABLE IF NOT EXISTS xp_events (
			id INTEGER PRIMARY KEY %s,
			user_id INTEGER NOT NULL,
			source VARCHAR(32) NOT NULL DEFAULT 'pr_eval',
			eval_id INTEGER NOT NULL,
			xp INTEGER NOT NULL DEFAULT 0,
			created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
			UNIQUE(source, eval_id)
		);`, autoInc),
		// Contributor XP season config (AC2): fixed UTC [start_date,end_date)
		// ranges; season XP/levels/ranks only count events inside the window.
		fmt.Sprintf(`CREATE TABLE IF NOT EXISTS seasons (
			id INTEGER PRIMARY KEY %s,
			name VARCHAR(64) NOT NULL,
			start_date DATE NOT NULL,
			end_date DATE NOT NULL,
			UNIQUE(start_date, end_date)
		);`, autoInc),
		`CREATE TABLE IF NOT EXISTS crank_playbook_cards (
			repo_id VARCHAR(255) PRIMARY KEY,
			full_name VARCHAR(255) NOT NULL,
			before_score DOUBLE NOT NULL,
			before_tier VARCHAR(10) NOT NULL,
			after_score DOUBLE NULL,
			after_tier VARCHAR(10) NULL,
			status VARCHAR(32) NOT NULL DEFAULT 'no_change',
			last_card_at DATETIME NULL,
			updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
		);`,
		// AC3: score-changed events emitted by every successful
		// recalculate-history run; playbook cards refresh from these.
		`CREATE TABLE IF NOT EXISTS score_changed_events (
			id VARCHAR(64) PRIMARY KEY,
			repo_id VARCHAR(255) NOT NULL,
			old_score DOUBLE NOT NULL DEFAULT 0,
			new_score DOUBLE NOT NULL DEFAULT 0,
			old_tier VARCHAR(10) NOT NULL DEFAULT '',
			new_tier VARCHAR(10) NOT NULL DEFAULT '',
			created_at DATETIME NOT NULL
		);`,
		// AC4: atomic single-flight guard for maintainer-triggered re-scores.
		// Winner INSERTs (ON CONFLICT DO NOTHING); stale locks older than
		// 15min are deleted before each acquire attempt so crashed runners
		// cannot wedge a repo forever.
		`CREATE TABLE IF NOT EXISTS rescore_locks (
			repo_id VARCHAR(255) PRIMARY KEY,
			locked_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
		);`,
		// AC5: capability tokens for shareable before/after OG card URLs.
		// 128-bit random token, single-repo scope, 90-day expiry.
		`CREATE TABLE IF NOT EXISTS crank_playbook_card_tokens (
			token CHAR(32) PRIMARY KEY,
			repo_id VARCHAR(255) NOT NULL,
			created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
			expires_at DATETIME NOT NULL
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
		`CREATE INDEX IF NOT EXISTS idx_pr_sim_submissions_hash ON pr_sim_submissions(payload_hash)`,
		`CREATE INDEX IF NOT EXISTS idx_pr_sim_submissions_expires ON pr_sim_submissions(expires_at)`,
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
		`CREATE INDEX IF NOT EXISTS idx_gfi_email_queue_pending ON gfi_email_queue(status, created_at)`,
		// Paid bounty boosts: live listing joins filter on issue + expiry.
		`CREATE INDEX IF NOT EXISTS idx_gfi_bounty_boosts_issue ON gfi_bounty_boosts(repository_id, issue_number, expires_at)`,
		`CREATE INDEX IF NOT EXISTS idx_gfi_email_queue_sub ON gfi_email_queue(subscriber_id, repo_id, issue_number)`,
		`CREATE INDEX IF NOT EXISTS idx_job_locks_expiry ON job_locks(locked_until)`,
		`CREATE INDEX IF NOT EXISTS idx_gfi_signup_attempts_lookup ON gfi_signup_attempts(ip, email, created_at)`,
		`CREATE INDEX IF NOT EXISTS idx_score_events_repo ON score_changed_events(repo_id, created_at DESC)`,
		`CREATE INDEX IF NOT EXISTS idx_gfi_endpoint_rate_limits_lookup ON gfi_endpoint_rate_limits(ip, endpoint, created_at)`,
		// AC10: indexed match phase — repos joined to prefs per language/tier
		// bucket instead of per-user scans.
		`CREATE INDEX IF NOT EXISTS idx_repositories_language_id ON repositories(language, id)`,
		`CREATE INDEX IF NOT EXISTS idx_latest_snapshots_tier_repo ON latest_snapshots(c_rank_tier, repository_id)`,
		`CREATE INDEX IF NOT EXISTS idx_gfi_created_at ON repo_good_first_issues(created_at)`,
		`CREATE INDEX IF NOT EXISTS idx_gfi_alert_dedup ON repo_good_first_issues(alert_dedup_key)`,
		`CREATE INDEX IF NOT EXISTS idx_gfi_notification_log_pending ON gfi_notification_log(status, next_attempt_at, user_id)`,
		// AC3/AC4: pending drain ordering + per-user dashboard lookups.
		`CREATE INDEX IF NOT EXISTS idx_pr_stall_pending ON pr_stall_alerts(status, created_at)`,
		`CREATE INDEX IF NOT EXISTS idx_pr_stall_user ON pr_stall_alerts(user_id)`,
		// AC7: dead-letter/retry triage over failed alert deliveries.
		`CREATE INDEX IF NOT EXISTS idx_alerts_failed_status ON alerts_failed(status, updated_at)`,
		// AC2: per-PR event lookups during stall-episode ingestion.
		`CREATE INDEX IF NOT EXISTS idx_pr_review_events_pr_time ON pr_review_events(pr_id, occurred_at)`,
		// AC3: one notification per user/issue regardless of the instant or
		// digest path; INSERT (OR) IGNORE against this index is the dedup rule.
		`CREATE UNIQUE INDEX IF NOT EXISTS uq_gfi_notification_log_user_issue ON gfi_notification_log(user_id, issue_key)`,
		// Hacktoberfest hub lookups (AC2/AC5).
		`CREATE INDEX IF NOT EXISTS idx_hb_merges_user_year ON hacktoberfest_merges(user_id, year)`,
		`CREATE INDEX IF NOT EXISTS idx_hb_activity_recent ON hacktoberfest_activity(last_active_at)`,
		// Contributor XP lookups (AC1/AC4): per-user totals + the indexed
		// created_at window behind the weekly leaderboard.
		`CREATE INDEX IF NOT EXISTS idx_xp_events_user ON xp_events(user_id)`,
		`CREATE INDEX IF NOT EXISTS idx_xp_events_created_at ON xp_events(created_at)`,
		// Credit-pack order ownership lookups (AC4).
		`CREATE INDEX IF NOT EXISTS idx_credit_pack_orders_user ON credit_pack_orders(user_id, created_at)`,
		// Rescore single-flight + playbook card token lookups (AC4, AC5).
		`CREATE INDEX IF NOT EXISTS idx_rescore_locks_locked_at ON rescore_locks(locked_at)`,
		`CREATE INDEX IF NOT EXISTS idx_crank_pb_card_tokens_repo ON crank_playbook_card_tokens(repo_id)`,
		`CREATE INDEX IF NOT EXISTS idx_crank_pb_card_tokens_expiry ON crank_playbook_card_tokens(expires_at)`,
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
	_, _ = db.Exec(`ALTER TABLE pr_evaluations ADD COLUMN is_public BOOLEAN DEFAULT FALSE`)
	_, _ = db.Exec(`ALTER TABLE pr_evaluations ADD COLUMN last_synced_at DATETIME NULL`)
	_, _ = db.Exec(`ALTER TABLE users ADD COLUMN public_accuracy BOOLEAN DEFAULT FALSE`)
	_, _ = db.Exec(`ALTER TABLE users ADD COLUMN is_public BOOLEAN DEFAULT FALSE`)
	_, _ = db.Exec(`ALTER TABLE users ADD COLUMN profiling_consent_at DATETIME`)
	_, _ = db.Exec(`ALTER TABLE users ADD COLUMN skills VARCHAR(100) NULL`)
	_, _ = db.Exec(`ALTER TABLE users ADD COLUMN lang_snapshot TEXT NULL`)
	_, _ = db.Exec(`ALTER TABLE users ADD COLUMN lang_snapshot_at DATETIME NULL`)
	_, _ = db.Exec(`ALTER TABLE users ADD COLUMN digest_unsubscribed BOOLEAN DEFAULT FALSE`)
	_, _ = db.Exec(`ALTER TABLE users ADD COLUMN referral_code VARCHAR(32) UNIQUE`)
	_, _ = db.Exec(`ALTER TABLE user_entitlements ADD COLUMN bonus_evals INTEGER DEFAULT 0`)
	// Stall-rescue nudge mentions (AC1): reviewer logins per snapshot.
	_, _ = db.Exec(`ALTER TABLE pr_snapshots ADD COLUMN requested_reviewers TEXT`)
	// Stall clock anchor (AC5): draft flag + frozen draft->ready instant.
	_, _ = db.Exec(`ALTER TABLE pr_snapshots ADD COLUMN is_draft BOOLEAN DEFAULT FALSE`)
	_, _ = db.Exec(`ALTER TABLE pr_snapshots ADD COLUMN ready_for_review_at DATETIME`)
		// Single delivery retry gate (AC6).
		_, _ = db.Exec(`ALTER TABLE pr_stall_alerts ADD COLUMN next_attempt_at DATETIME NULL`)
		// Episode-driven stall rescue (AC1/AC2/AC3).
		_, _ = db.Exec(`ALTER TABLE pr_stall_state ADD COLUMN episode_start DATETIME NULL`)
		_, _ = db.Exec(`ALTER TABLE pr_stall_state ADD COLUMN alerted_at DATETIME NULL`)
	// C-Rank alert state: rank hash for CAS writes (AC2/AC6), failure cap and
	// dead-letter flag (AC3), plus watcher e-mail validity suppression (AC8).
	_, _ = db.Exec(`ALTER TABLE crank_alert_state ADD COLUMN rank_hash VARCHAR(64) DEFAULT ''`)
	_, _ = db.Exec(`ALTER TABLE crank_alert_state ADD COLUMN fail_count INTEGER NOT NULL DEFAULT 0`)
	_, _ = db.Exec(`ALTER TABLE crank_alert_state ADD COLUMN dead_lettered BOOLEAN NOT NULL DEFAULT FALSE`)
	_, _ = db.Exec(`ALTER TABLE crank_alert_state ADD COLUMN last_failed_hash VARCHAR(64) DEFAULT ''`)
	_, _ = db.Exec(`ALTER TABLE users ADD COLUMN email_invalid BOOLEAN DEFAULT FALSE`)
	// AC5 send-then-write ordering: outbox rows carry the diffed-from
	// baseline hash and the new snapshot date so baselines advance only
	// after the digest email is accepted.
	_, _ = db.Exec(`ALTER TABLE crank_outbox ADD COLUMN prev_rank_hash VARCHAR(64) DEFAULT ''`)
	_, _ = db.Exec(`ALTER TABLE crank_outbox ADD COLUMN new_snap_date VARCHAR(255) DEFAULT ''`)
	_, _ = db.Exec(`ALTER TABLE contributor_profiles ADD COLUMN persona VARCHAR(64)`)
	_, _ = db.Exec(`ALTER TABLE contributor_profiles ADD COLUMN stars_pulled_in INTEGER`)
	_, _ = db.Exec(`ALTER TABLE contributor_profiles ADD COLUMN updated_persona_at DATETIME`)
	_, _ = db.Exec(`CREATE INDEX IF NOT EXISTS idx_contributor_profiles_persona ON contributor_profiles(persona)`)
	_, _ = db.Exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_referral_credits_new_user ON referral_credits(new_user_id)`)
	_, _ = db.Exec(`ALTER TABLE contributor_feedback ADD UNIQUE KEY uq_cf_user_repo (user_id, repository_id)`)
	_, _ = db.Exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_cf_user_repo ON contributor_feedback(user_id, repository_id)`)
	_, _ = db.Exec(`INSERT IGNORE INTO contributor_feedback (repository_id, user_id, maintainer_rating, review_speed_rating, beginner_friendly_rating, comment, verified_pr_author, created_at)
		SELECT repository_id, CAST(user_id AS UNSIGNED), maintainer_rating, review_speed_rating, beginner_rating, comment, verified_contributor, created_at
		FROM contributor_feedbacks`)
	_, _ = db.Exec(`ALTER TABLE repo_claims ADD UNIQUE KEY uq_repo_claims_user (repo_id, owner_user_id)`)
	_, _ = db.Exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_repo_claims_user ON repo_claims(repo_id, owner_user_id)`)
	_, _ = db.Exec(`ALTER TABLE repo_claims ADD COLUMN full_name VARCHAR(255) NOT NULL DEFAULT ''`)
	// GFI outbox (AC4): exponential-backoff scheduling + atomic claim stamp on
	// pre-existing queue tables created before retries were introduced.
	_, _ = db.Exec(`ALTER TABLE gfi_email_queue ADD COLUMN next_attempt_at DATETIME NULL`)
	_, _ = db.Exec(`ALTER TABLE gfi_email_queue ADD COLUMN claimed_at DATETIME NULL`)
	// GFI sent-log per-mode dedup (AC3): delivery_mode splits instant vs
	// weekly rows so one send per mode per issue is possible.
	_, _ = db.Exec(`ALTER TABLE gfi_email_queue ADD COLUMN delivery_mode VARCHAR(16) NOT NULL DEFAULT 'instant'`)
	if db.DriverName() == "sqlite" {
		_, _ = db.Exec(`DROP INDEX IF EXISTS uq_gfi_email_queue_sub_issue`)
	} else {
		var oldIdxCount int
		if err := db.Get(&oldIdxCount, `SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'gfi_email_queue' AND index_name = 'uq_gfi_email_queue_sub_issue'`); err == nil && oldIdxCount > 0 {
			_, _ = db.Exec(`DROP INDEX uq_gfi_email_queue_sub_issue ON gfi_email_queue`)
		}
	}
	// AC4: notification dedup is UNIQUE(user_id, issue_id) with NO mode
	// component — delivery mode is scheduling only, so a user gets an issue
	// exactly once regardless of instant/weekly switches. Collapse any
	// per-mode duplicates left by the old schema, then swap the indexes.
	_, _ = db.Exec(`
		DELETE FROM gfi_email_queue WHERE id IN (
			SELECT id FROM (
				SELECT q.id FROM gfi_email_queue q
				JOIN gfi_email_queue newer ON newer.subscriber_id = q.subscriber_id
					AND newer.repo_id = q.repo_id AND newer.issue_number = q.issue_number
					AND newer.id > q.id
			) dup
		)`)
	if db.DriverName() == "sqlite" {
		_, _ = db.Exec(`DROP INDEX IF EXISTS uq_gfi_email_queue_sub_issue_mode`)
		_, _ = db.Exec(`CREATE UNIQUE INDEX IF NOT EXISTS uq_gfi_email_queue_user_issue ON gfi_email_queue(subscriber_id, repo_id, issue_number)`)
	} else {
		var modeIdxCount int
		if err := db.Get(&modeIdxCount, `SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'gfi_email_queue' AND index_name = 'uq_gfi_email_queue_sub_issue_mode'`); err == nil && modeIdxCount > 0 {
			_, _ = db.Exec(`DROP INDEX uq_gfi_email_queue_sub_issue_mode ON gfi_email_queue`)
		}
		var uqCount int
		if err := db.Get(&uqCount, `SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'gfi_email_queue' AND index_name = 'uq_gfi_email_queue_user_issue'`); err == nil && uqCount == 0 {
			_, _ = db.Exec(`CREATE UNIQUE INDEX uq_gfi_email_queue_user_issue ON gfi_email_queue(subscriber_id, repo_id, issue_number)`)
		}
	}
	// GFI alert permanence (AC1): permanent per-issue dedup key + matched-fields content hash.
	_, _ = db.Exec(`ALTER TABLE repo_good_first_issues ADD COLUMN alert_dedup_key VARCHAR(128) NOT NULL DEFAULT ''`)
	_, _ = db.Exec(`ALTER TABLE repo_good_first_issues ADD COLUMN alert_content_hash VARCHAR(64) NOT NULL DEFAULT ''`)
	_, _ = db.Exec(`ALTER TABLE repo_good_first_issues ADD COLUMN alert_refresh_fired_at DATETIME NULL`)
	_, _ = db.Exec(`ALTER TABLE repo_good_first_issues ADD COLUMN issue_updated_at DATETIME NULL`)
	_, _ = db.Exec(`ALTER TABLE repo_good_first_issues ADD COLUMN alert_last_updated_at DATETIME NULL`)
	// Bounty issue metadata (AC2): store parsed USD amount and lifecycle status
	_, _ = db.Exec(`ALTER TABLE repo_good_first_issues ADD COLUMN bounty_amount_usd DOUBLE NULL`)
	_, _ = db.Exec(`ALTER TABLE repo_good_first_issues ADD COLUMN bounty_status VARCHAR(20) NOT NULL DEFAULT 'active'`)
	// GFI prefs opt-out flag set by the stateless unsubscribe flow (AC4).
	_, _ = db.Exec(`ALTER TABLE gfi_subscribers ADD COLUMN opt_out BOOLEAN NOT NULL DEFAULT FALSE`)
	// Soft-bounce reputation counter (AC6): decrements deliverability trust
	// without counting toward the hard-bounce auto-disable.
	_, _ = db.Exec(`ALTER TABLE gfi_subscribers ADD COLUMN soft_bounces INTEGER NOT NULL DEFAULT 0`)
	// ghapp_welcomes (AC2): idempotency keyed UNIQUE(repo_id, issue_number)
	// with status pending|posted|failed. Best-effort legacy migration for
	// pre-existing tables created under the old contributor_login key.
	if db.DriverName() == "sqlite" {
		_, _ = db.Exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_ghapp_welcomes_repo_issue ON ghapp_welcomes(repo_id, pr_number)`)
	} else {
		var idxCount int
		if err := db.Get(&idxCount, `SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'ghapp_welcomes' AND index_name = 'idx_ghapp_welcomes_repo_issue'`); err == nil && idxCount == 0 {
			_, _ = db.Exec(`CREATE UNIQUE INDEX idx_ghapp_welcomes_repo_issue ON ghapp_welcomes(repo_id, pr_number)`)
		}
	}
	_, _ = db.Exec(`UPDATE ghapp_welcomes SET status = 'posted' WHERE status IN ('claimed', 'deleted_remotely') AND comment_id > 0`)
	_, _ = db.Exec(`UPDATE ghapp_welcomes SET status = 'failed' WHERE status IN ('claimed', 'dropped', 'deleted_remotely') AND comment_id = 0`)
	// Contributor XP streak state (AC2/AC5): the only users columns added.
	_, _ = db.Exec(`ALTER TABLE users ADD COLUMN streak_count INTEGER NOT NULL DEFAULT 0`)
	_, _ = db.Exec(`ALTER TABLE users ADD COLUMN last_active_date DATE`)

	return nil
}
