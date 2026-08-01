-- Migration 007: Adaptive rescan interval and stagnation tracking
ALTER TABLE repositories ADD COLUMN refresh_interval_days INTEGER DEFAULT 1 NOT NULL;
ALTER TABLE repositories ADD COLUMN consecutive_stagnant_scans INTEGER DEFAULT 0 NOT NULL;
ALTER TABLE repositories ADD COLUMN next_rescan_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_repos_next_rescan ON repositories(next_rescan_at ASC);
