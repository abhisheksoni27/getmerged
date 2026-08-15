-- Migration 011: Add email_hash column to users table for deterministic blind indexing and cross-provider account linking
ALTER TABLE users ADD COLUMN email_hash VARCHAR(64) UNIQUE AFTER slug;
