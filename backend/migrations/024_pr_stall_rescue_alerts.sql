-- Migration 024: Stalled PR rescue episode gate, state machine and failure log.
-- AC3: alerts_sent gates sends via unique (pr_id, last_crossed_at) +
-- INSERT (OR) IGNORE; insert success is the sole permission to send.
-- pr_stall_state pins each episode's last_crossed_at; the episode ends when
-- the wait drops below the repo p50 for one full poll cycle or the PR closes.
-- AC7: alerts_failed records delivery errors + retry_count; a single retry
-- runs next cycle before the row is dead-lettered.
CREATE TABLE IF NOT EXISTS alerts_sent (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    pr_id VARCHAR(255) NOT NULL,
    last_crossed_at DATETIME NOT NULL,
    user_id BIGINT NOT NULL DEFAULT 0,
    repository_id VARCHAR(255) NOT NULL DEFAULT '',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_alerts_sent_pr_episode (pr_id, last_crossed_at)
);

CREATE TABLE IF NOT EXISTS pr_stall_state (
    pr_id VARCHAR(255) PRIMARY KEY,
    user_id BIGINT NOT NULL,
    repository_id VARCHAR(255) NOT NULL DEFAULT '',
    last_crossed_at DATETIME NULL,
    below_p50_since DATETIME NULL,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS alerts_failed (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    pr_id VARCHAR(255) NOT NULL,
    user_id BIGINT NOT NULL DEFAULT 0,
    channel VARCHAR(32) NOT NULL DEFAULT '',
    error TEXT NULL,
    retry_count INT NOT NULL DEFAULT 0,
    status VARCHAR(16) NOT NULL DEFAULT 'retry',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_alerts_failed_pr (pr_id),
    INDEX idx_alerts_failed_status (status, updated_at)
);
