-- Daily Tweet Spotlights: tracks repos featured in daily X (Twitter) spotlights
-- to ensure no duplicate spotlights and idempotent daily runs.
CREATE TABLE IF NOT EXISTS daily_tweet_spotlights (
    id INTEGER PRIMARY KEY AUTO_INCREMENT,
    repository_id VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    spotlight_date VARCHAR(20) NOT NULL,
    tweet_text TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_spotlight_date (spotlight_date),
    UNIQUE KEY uq_spotlight_repo (repository_id)
);
