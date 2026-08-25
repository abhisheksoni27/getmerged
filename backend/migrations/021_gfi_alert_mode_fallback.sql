-- Migration 021: GFI alert per-mode sent-log dedup + instant-cap fallback.
-- AC3: delivery_mode splits the sent log so one send per (subscriber, issue,
-- mode) is possible; toggling instant<->digest re-sends once per new mode.
ALTER TABLE gfi_email_queue ADD COLUMN delivery_mode VARCHAR(16) NOT NULL DEFAULT 'instant';
