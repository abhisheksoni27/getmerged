-- Migration 004: Add is_trending and last_trending_at to repositories table
ALTER TABLE repositories ADD COLUMN is_trending INTEGER NOT NULL DEFAULT 0;
ALTER TABLE repositories ADD COLUMN last_trending_at DATETIME;

CREATE INDEX IF NOT EXISTS idx_repositories_is_trending ON repositories(is_trending);
