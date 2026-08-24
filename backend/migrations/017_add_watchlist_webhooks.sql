-- Migration 017: Slack/Discord incoming-webhook alert channels for watchlist C-Rank changes
CREATE TABLE IF NOT EXISTS user_webhooks (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    label VARCHAR(16) NOT NULL,
    url_enc TEXT NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    consecutive_failures INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_user_webhooks_user (user_id)
);

CREATE TABLE IF NOT EXISTS webhook_last_notified (
    webhook_id BIGINT NOT NULL,
    repo_id VARCHAR(64) NOT NULL,
    last_score DOUBLE NOT NULL DEFAULT 0,
    last_tier VARCHAR(8) NOT NULL DEFAULT '',
    notified_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (webhook_id, repo_id)
);
