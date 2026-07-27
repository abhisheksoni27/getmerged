-- Migration script for opendoor Phase 6 contributor feedback
CREATE TABLE IF NOT EXISTS contributor_feedbacks (
    id VARCHAR(36) PRIMARY KEY,
    repository_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    username VARCHAR(255) NOT NULL,
    sentiment VARCHAR(50) NOT NULL, -- 'welcoming', 'selective', 'unresponsive'
    comment TEXT NOT NULL,
    verified_contributor BOOLEAN NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (repository_id) REFERENCES repositories(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_feedbacks_repo ON contributor_feedbacks(repository_id);
