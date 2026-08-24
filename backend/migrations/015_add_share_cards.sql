-- 015_add_share_cards.sql
-- Public, consent-published OG result cards for preflight PR forecasts (GH share-result-cards).
CREATE TABLE IF NOT EXISTS share_cards (
	id VARCHAR(64) PRIMARY KEY,
	user_id INTEGER NOT NULL,
	repo_full_name VARCHAR(255) NOT NULL,
	pr_title TEXT,
	summary TEXT,
	overall_score REAL DEFAULT 0,
	ready_to_merge BOOLEAN DEFAULT FALSE,
	ref_token VARCHAR(128) NOT NULL,
	consent_given BOOLEAN NOT NULL DEFAULT FALSE,
	revoked_at DATETIME NULL,
	created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
	expires_at DATETIME NOT NULL
);

CREATE INDEX idx_share_cards_user ON share_cards (user_id, created_at DESC);
