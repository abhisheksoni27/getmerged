-- Migration 025: Stalled-PR rescue episodes driven by review events.
-- AC1: the episode clock starts at the most recent 'review_requested' event;
-- review submissions, comments, force-pushes and closes each restart it
-- (close->reopen and draft->ready emit a fresh 'review_requested').
-- AC2: ingestion is idempotent by (pr_id, event_id) and drops events older
-- than the current episode start; alerted_at guards one alert per episode
-- with an in-transaction last-alerted-at check at enqueue time.
CREATE TABLE IF NOT EXISTS pr_review_events (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    pr_id VARCHAR(255) NOT NULL,
    event_id VARCHAR(255) NOT NULL,
    event_type VARCHAR(32) NOT NULL DEFAULT '',
    occurred_at DATETIME NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_pr_review_events_id (pr_id, event_id),
    INDEX idx_pr_review_events_pr_time (pr_id, occurred_at)
);

ALTER TABLE pr_stall_state ADD COLUMN episode_start DATETIME NULL;
ALTER TABLE pr_stall_state ADD COLUMN alerted_at DATETIME NULL;
