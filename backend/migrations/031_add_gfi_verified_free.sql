-- Migration 031: Add Verified Free flags and reason to repo_good_first_issues
-- Filters out phantom GFIs (assigned, linked to PR, or recent "can I take this" claims)
ALTER TABLE repo_good_first_issues ADD COLUMN is_verified_free BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE repo_good_first_issues ADD COLUMN verified_free_reason VARCHAR(255) NULL;
ALTER TABLE repo_good_first_issues ADD COLUMN verified_free_checked_at DATETIME NULL;

CREATE INDEX IF NOT EXISTS idx_gfi_verified_free ON repo_good_first_issues(is_verified_free);
