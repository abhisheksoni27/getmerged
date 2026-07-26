-- Migration 003: Alter user_watchlists table repo_id column to TEXT
-- Handles existing production databases created with legacy INTEGER repo_id schema

CREATE TABLE IF NOT EXISTS user_watchlists_dg_tmp (
    user_id INTEGER NOT NULL,
    repo_id TEXT NOT NULL,
    notify_rank_change BOOLEAN DEFAULT TRUE,
    created_at DATETIME NOT NULL,
    PRIMARY KEY(user_id, repo_id),
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

INSERT INTO user_watchlists_dg_tmp (user_id, repo_id, notify_rank_change, created_at)
    SELECT user_id, CAST(repo_id AS TEXT), notify_rank_change, created_at FROM user_watchlists;

DROP TABLE user_watchlists;

ALTER TABLE user_watchlists_dg_tmp RENAME TO user_watchlists;
