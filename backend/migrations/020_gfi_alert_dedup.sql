-- Migration 020: GFI alert permanence + atomic daily email counters.
-- AC1: permanent per-issue alert dedup (repo_id + issue_number) and the
-- matched-fields content hash driving the one-shot refresh alert. No TTL.
ALTER TABLE repo_good_first_issues ADD COLUMN alert_dedup_key VARCHAR(128) NOT NULL DEFAULT '';
ALTER TABLE repo_good_first_issues ADD COLUMN alert_content_hash VARCHAR(64) NOT NULL DEFAULT '';
ALTER TABLE repo_good_first_issues ADD COLUMN alert_refresh_fired_at DATETIME NULL;
CREATE INDEX idx_gfi_alert_dedup ON repo_good_first_issues(alert_dedup_key);
-- AC2: per-user/per-day instant-email counter backing the hard
-- 5-emails-per-day ceiling enforced with a single guarded UPDATE.
CREATE TABLE gfi_daily_send_counts (
  subscriber_id INT NOT NULL,
  day VARCHAR(10) NOT NULL,
  email_count INT NOT NULL DEFAULT 0,
  PRIMARY KEY (subscriber_id, day)
);
