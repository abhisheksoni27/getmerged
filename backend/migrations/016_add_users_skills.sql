-- Migration 016: Add nullable skills column for GitHub-imported languages
ALTER TABLE users ADD COLUMN skills VARCHAR(100) NULL;
