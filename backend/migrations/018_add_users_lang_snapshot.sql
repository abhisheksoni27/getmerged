-- Migration 018: Language snapshot for personalized 'For You' matches
ALTER TABLE users ADD COLUMN lang_snapshot TEXT NULL;
ALTER TABLE users ADD COLUMN lang_snapshot_at DATETIME NULL;
