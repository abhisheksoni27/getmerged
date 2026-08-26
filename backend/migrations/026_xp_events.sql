-- Contributor XP seasons (AC1/AC5): xp_events plus two users columns; no
-- other schema. Idempotent by the composite UNIQUE(source, eval_id) key.
CREATE TABLE IF NOT EXISTS xp_events (
    id INTEGER PRIMARY KEY AUTO_INCREMENT,
    user_id INTEGER NOT NULL,
    source VARCHAR(32) NOT NULL DEFAULT 'pr_eval',
    eval_id INTEGER NOT NULL,
    xp INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_xp_events_source_eval (source, eval_id)
);

-- AC4: the weekly leaderboard window filters directly on this index.
CREATE INDEX IF NOT EXISTS idx_xp_events_created_at ON xp_events(created_at);
CREATE INDEX IF NOT EXISTS idx_xp_events_user ON xp_events(user_id);

-- AC2: daily streak state; updated by one conditional UPDATE per award.
ALTER TABLE users ADD COLUMN streak_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN last_active_date DATE;
