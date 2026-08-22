-- Issue #92: score provenance. 'computed' = scored against sufficient peers,
-- 'fallback' = scored with collapsed neutral-50 percentiles (excluded from rankings).
ALTER TABLE daily_snapshots ADD COLUMN score_source VARCHAR(20) DEFAULT 'computed';
ALTER TABLE latest_snapshots ADD COLUMN score_source VARCHAR(20) DEFAULT 'computed';

CREATE INDEX idx_latest_snapshots_score_source ON latest_snapshots(score_source);
