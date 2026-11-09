-- Migration 030: Add AI contribution policy tracking to repositories table
-- Tracks whether a repository allows, requires disclosure, or prohibits AI/LLM contributions:
-- 'allowed', 'disclosure_required', 'prohibited', 'unspecified'
ALTER TABLE repositories ADD COLUMN ai_policy VARCHAR(30) NOT NULL DEFAULT 'unspecified';
ALTER TABLE repositories ADD COLUMN ai_policy_url TEXT NULL;
ALTER TABLE repositories ADD COLUMN ai_policy_reason TEXT NULL;

CREATE INDEX IF NOT EXISTS idx_repositories_ai_policy ON repositories(ai_policy);
