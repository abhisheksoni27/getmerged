# C-Rank Time-Scan Bug Repair & One-Time Backfill

**Date:** 2026-08-09 → 2026-08-11
**Status:** Fixed, re-scored, one-time backfill complete

---

## 1. Incident summary

Repos were being mass-erased to D-tier. Root cause was **not** the scoring logic but the
PR-event loader: it scanned non-nullable `*time.Time` fields from a `LEFT JOIN`'d subquery.
For PRs **without** a close/merge/comment, MySQL returned `NULL`, the MySQL driver raised
`converting NULL to time.Time is unsupported`, every event'd repo failed scoring and fell
back to D.

Observed effect: tier counts went from a sane distribution to `D ≈ 92%` of repos
(S-class dropped from ~12 to 0).

## 2. Root cause

| File | Function | Bug |
|---|---|---|
| `backend/internal/pipeline/seed.go` | `fetchPRsFromDB` | scanned `time.Time` from nullable aggregate subquery |
| `backend/cmd/recalculate_history/main.go` | `fetchPRsForRepo` | same |

## 3. Fix

Both loaders rewritten to a batched per-repo aggregation with `MIN(CASE ...)` and scan via
`sql.NullTime` for `opened_at` / `closed_at` / `first_comment_at`. States now handled:
`opened` → `CreatedAt`, any `closed`/`merged` → `MergedAt`, both set only when present.

Commit: `152156c` (fix in `seed.go` + `recalculate_history/main.go`).

## 4. New flag in backfill (committed)

`backend/cmd/backfill/main.go` gained `-comments-tiers` (default `S,A`). For the one-time
audit we needed comments for **all** tiers so first-response/comment metrics aren't zero
for B/C/D (zero ⇒ tiers can *look* worse than real).

Commit: `b8fd15f`.

## 5. What we ran

1. Rebuilt arm64 binaries (`bin/server`, `recalculate-history`, `backfill`) with the fix.
2. Deployed fixed `server`, restarted `opendoor` — crawler stopped writing bad D's.
3. `recalculate-history` — re-scored **all repos with in-window PR data** (snapshot
   recovery: S≈0 → ~1.5k+, A≈5k).
4. One-time backfill sweep (**~26,943 repos**, all tiers, PR events + comments):

```bash
./backfill -tiers "S,A,B,C,D" -comments-tiers "S,A,B,C,D" \
  -from 2026-02-10 -to 2026-08-09 -rph 4800 -checkpoint backfill_sweep.json
```

Result (from `nohup.out`):

```
Backfill completed!
repos_processed = 26,943
prs_inserted     = 9,016,417
comments_inserted= 1,769,740
requests_used    = 131,516
```

~25–30h runtime, resumable via checkpoint.

## 6. Tables touched

| Table | Contents | Rows now |
|---|---|---|
| `repo_pr_events` | `opened`/`merged`/`closed` (+label/assign misc) from GH pulls | ~9.07M |
| `repo_raw_comments` | issues + PR review comments, body-stripped | ~0.99M |
| `latest_snapshots` | current tier + metrics per repo | 26,943 |
| `daily_snapshots` | re-scored metrics history | growing |
| `repositories` | tracked repos | 34,813 |

Tier distribution after re-score **(pre-backfill)**: S=1,619 · A=5,015 · B=5,035 ·
C=2,896 · D=12,378.

## 7. Live event ingestion status

- `opendoor-events` service runs `eventstream` (polls GitHub `/events` live feed every 15s,
  ring-buffer dedup, tracked-repo filter) — healthy, all hours on 2026-08-11 filled with no
  gaps. Occasional 403 rate-limit sleeps are self-healing.
- `cmd/gharchive` (hourly GHArchive file consumer) is **not running / not scheduled** —
  do NOT rely on it. The live feed handles incremental PR + comment sync safely.
- **IssuesEvent is not tracked** — no issue rows anywhere. Decision: do not feed it into
  CRank tiers yet; revisit for display + staleness + `good_first_issue_count` freshness.

## 8. Next steps (validation & ongoing)

1. **Re-run `recalculate-history`** after backfill so B/C/D tiers reflect the new comment
   data (snapshots are currently pre-backfill). Compare to the split above.
2. **Validate metric sanity** — spot-check 10 repos per tier for plausible
   `time_to_first_response_hours`, `time_to_merge_hours`, `external_pr_merge_rate`.
3. **Close the no-snapshot gap** — ~7,870 repos have no `latest_snapshots` row; decide
   whether to backfill + score them or keep them unscored by design.
4. **Check GHArchive vs REST merged-event drift** — eventstream/gharchive have
   merge≈`closed` semantics, REST backfill writes real `merged`. Ensure no double-count.
5. **Automate incremental sync**:
   - `eventstream` (already live) for continuous ingest;
   - nightly `recalculate-history` (cron) for snapshot freshness;
   - monthly small `backfill` sweep `-from today-30d` (rolling window, checkpointed).
6. **Staleness visibility** — surface `snapshot_date`/`updated_at` on repo page + alert on
   `updated_at < NOW() - INTERVAL 7 DAY`.
7. **Guard against regression** — add a unit test for `fetchPRsFromDB` NULL handling
   (PR with no close/merge/comment) so this bug class can't return.
8. **Issue-event tracking (optional)** — spec as display + staleness + GFI freshness only,
   NOT a tier input, until real tier impact is measured.