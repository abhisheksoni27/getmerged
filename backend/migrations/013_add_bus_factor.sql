-- Migration 013: Real bus factor (distinct active insiders) on snapshots
ALTER TABLE daily_snapshots ADD COLUMN bus_factor INTEGER DEFAULT 0 NOT NULL;
ALTER TABLE latest_snapshots ADD COLUMN bus_factor INTEGER DEFAULT 0 NOT NULL;
