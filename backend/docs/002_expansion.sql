-- 002_expansion.sql: Database schema expansion for Opendoor

-- 1. Star buckets & trending indicators on repos
ALTER TABLE repos ADD COLUMN star_bucket TEXT DEFAULT '1k-5k';
ALTER TABLE repos ADD COLUMN is_trending BOOLEAN DEFAULT FALSE;
ALTER TABLE repos ADD COLUMN last_trending_at DATETIME;

-- 2. AI Insights Cache Table
CREATE TABLE IF NOT EXISTS repo_ai_insights (
    repo_id INTEGER PRIMARY KEY,
    maintainer_vibe TEXT NOT NULL,
    pr_guidelines TEXT NOT NULL, -- JSON string array
    issue_quality_score REAL DEFAULT 0.0,
    raw_summary TEXT,
    updated_at DATETIME NOT NULL,
    FOREIGN KEY(repo_id) REFERENCES repos(id) ON DELETE CASCADE
);

-- 3. Macro Statistics Cache Table
CREATE TABLE IF NOT EXISTS macro_stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    metric_key TEXT UNIQUE NOT NULL,
    metric_value TEXT NOT NULL, -- JSON string
    updated_at DATETIME NOT NULL
);

-- 4. Users Table
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    github_id INTEGER UNIQUE NOT NULL,
    username TEXT NOT NULL,
    email TEXT,
    avatar_url TEXT,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL
);

-- 5. User Watchlists Table
CREATE TABLE IF NOT EXISTS user_watchlists (
    user_id INTEGER NOT NULL,
    repo_id INTEGER NOT NULL,
    notify_rank_change BOOLEAN DEFAULT TRUE,
    created_at DATETIME NOT NULL,
    PRIMARY KEY(user_id, repo_id),
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY(repo_id) REFERENCES repos(id) ON DELETE CASCADE
);

-- 6. Notification Queue Table
CREATE TABLE IF NOT EXISTS notification_queue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    type TEXT NOT NULL, -- 'rank_changed', 'new_s_class', 'weekly_digest'
    payload TEXT NOT NULL, -- JSON string
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'processed', 'failed'
    created_at DATETIME NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);
