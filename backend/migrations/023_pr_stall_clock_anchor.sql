-- Migration 023: Stall-clock anchor columns (AC5).
-- is_draft mirrors GitHub's draft flag; ready_for_review_at freezes the
-- draft->ready transition instant and is carried forward by sync. The stall
-- alert clock uses ready_for_review_at when set, else opened_at
-- (pr_created_at); all comparisons in UTC.
ALTER TABLE pr_snapshots ADD COLUMN is_draft BOOLEAN DEFAULT FALSE;
ALTER TABLE pr_snapshots ADD COLUMN ready_for_review_at DATETIME NULL;

-- Single delivery retry gate for stalled-PR alerts (AC6).
ALTER TABLE pr_stall_alerts ADD COLUMN next_attempt_at DATETIME NULL;
