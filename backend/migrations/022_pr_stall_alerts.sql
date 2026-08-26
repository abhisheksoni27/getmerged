-- Migration 022: Stalled PR rescue alerts.
-- Stall key = (pr_id, clock anchor): the stall_epoch_bucket column holds the
-- epoch of the PR's ready_for_review instant (or opened_at when never
-- drafted), so unique(pr_id, stall_epoch_bucket) fires exactly once per
-- threshold crossing (AC3). Status lifecycle pending -> sent | stale | failed
-- with a single retry gated 60s out before 'failed' (AC6).
CREATE TABLE IF NOT EXISTS pr_stall_alerts (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    pr_id VARCHAR(255) NOT NULL,
    user_id BIGINT NOT NULL,
    repository_id VARCHAR(255) NOT NULL DEFAULT '',
    stall_epoch_bucket BIGINT NOT NULL,
    status VARCHAR(16) NOT NULL DEFAULT 'pending',
    attempts INT NOT NULL DEFAULT 0,
    next_attempt_at DATETIME NULL,
    payload TEXT NOT NULL,
    last_error TEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    sent_at DATETIME NULL,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_pr_stall_alerts_pr_bucket (pr_id, stall_epoch_bucket),
    INDEX idx_pr_stall_pending (status, next_attempt_at, created_at),
    INDEX idx_pr_stall_user (user_id)
);
