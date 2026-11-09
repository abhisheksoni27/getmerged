-- Migration 029: Add access status and reason to repositories table
-- Tracks whether a repository accepts outside PRs: 'open', 'vouch_required', 'collaborator_only', 'closed'
ALTER TABLE repositories ADD COLUMN access_status VARCHAR(25) NOT NULL DEFAULT 'open';
ALTER TABLE repositories ADD COLUMN access_status_reason TEXT NULL;

CREATE INDEX IF NOT EXISTS idx_repositories_access_status ON repositories(access_status);
