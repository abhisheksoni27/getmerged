-- Migration 010: Add users slug for public profile routes
-- 1. Add slug column
ALTER TABLE users ADD COLUMN slug VARCHAR(255) NULL;

-- 2. Create unique index on slug
CREATE UNIQUE INDEX idx_users_slug ON users(slug);
