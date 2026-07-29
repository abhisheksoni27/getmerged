-- Migration script for opendoor database query performance indexes

-- Composite index to optimize correlated subquery MAX(snapshot_date) lookups
CREATE INDEX IF NOT EXISTS idx_daily_snapshots_repo_date ON daily_snapshots(repository_id, snapshot_date DESC);

-- Index for filtering repos by tier
CREATE INDEX IF NOT EXISTS idx_daily_snapshots_tier ON daily_snapshots(c_rank_tier);

-- Index for filtering repos by language
CREATE INDEX IF NOT EXISTS idx_repositories_language ON repositories(language);

-- Index for sorting/filtering repos by star count
CREATE INDEX IF NOT EXISTS idx_repositories_stars ON repositories(stars);
