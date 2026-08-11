# Cron Jobs, Scripts & Ops Runbook

**Scope:** every scheduled job that keeps scores/snapshots/repos fresh on the
production box, the wrapper scripts that run them, and one-liners to trigger
each manually. Scripts live in git at `scripts/` and are deployed via
`git pull` on the target `~/src/opendoor`.

---

## 1. Inventory of scheduled jobs

All times **UTC**. Table lists the source file / caller.

| Schedule (UTC) | Job | What it does | Source |
|---|---|---|---|
| Every 6 h | `/internal/sync-trending` | refresh trending repo list | cron → curl API |
| Sun 12:00 | `/internal/seed` | discover + add new repos (weekly) | cron → curl API |
| Daily 00:00 | `/internal/update-scores` | re-score stale (>24h) repos via GitHub API + adaptive touch + sitemap | cron → curl API |
| Daily 03:30 | `scripts/cron-recalculate.sh` | **global re-anchor** of all scores (DB-event based, ~15–20 min) | our managed block |
| Sun 05:00 | `scripts/cron-backfill-rolling.sh` | rolling 30-day event backfill (catches eventstream gaps) | our managed block |

`internal/update-scores` normalizes only within its small daily batch, so tiers
can drift from the global ranking. The 03:30 nightly `recalculate-history`
re-anchors against **all** repos — that's the authoritative distribution. Order
matters: recalc deliberately runs 3.5h after update-scores.

---

## 2. Managed cron block

Installed by `scripts/install-crontab.sh` (idempotent). It sits between markers
`# BEGIN opendoor-managed` and `# END opendoor-managed` in `crontab -l`:

```
# ── Opendoor nightly global re-anchor (after update-scores at 00:00 UTC)
30 3 * * * ~/src/opendoor/scripts/cron-recalculate.sh
# ── Opendoor rolling event backfill (30-day window, Sundays 05:00 UTC)
0 5 * * 0 ~/src/opendoor/scripts/cron-backfill-rolling.sh 30 "S,A,B,C,D" "S,A,B,C,D"
```

If the checkout is not at `~/src/opendoor`, install with
`OPENDOR_REPO=/path scripts/install-crontab.sh`.

---

## 3. Scripts (`scripts/`)

| Script | Purpose |
|---|---|
| `cron-recalculate.sh` | run `recalculate-history` with env + flock + timestamped logging |
| `cron-backfill-rolling.sh` | run `backfill` for last N days (resumable checkpoint) |
| `install-crontab.sh` | append/refresh the managed cron block |

Common env overrides (defaults shown):

```
OPENDOR_ENV_FILE=/opt/opendoor/.env
OPENDOR_BACKEND_DIR=/opt/opendoor/backend
OPENDOR_JOB_DIR=$OPENDOR_BACKEND_DIR/.job_runs   # locks + .last markers
OPENDOR_REPO=$HOME/src/opendoor                  # install-crontab only
```

Behaviour shared by both cron scripts:
- `flock` non-blocking lock → overlapping runs skip (logged) instead of colliding.
- env sourced from `$OPENDOR_ENV_FILE`; fatal if missing.
- output appends to `opendoor_jobs.log` (in `$OPENDOR_BACKEND_DIR`; overridable
  via `OP_RUN_LOG`), with UTC timestamps — never spliced into the app's JSON
  `opendoor.log` (env `LOG_FILE` is only used by the server, by design).
- on success writes `.job_runs/<job>.last` with last-run timestamp.
- non-zero exit on real failure (cron will email/stdout it).

---

## 4. Manual usage

**Re-anchor global scores (the main "fix tiers" button):**

```bash
~/src/opendoor/scripts/cron-recalculate.sh
# or directly:
cd /opt/opendoor/backend && export $(cat /opt/opendoor/.env | grep -v '^#' | xargs) \
  && ./recalculate-history
```

**Rolling backfill (manual, e.g. 7 days, comments only for S/A):**

```bash
~/src/opendoor/scripts/cron-backfill-rolling.sh 7 "S,A,B,C,D" "S,A"
```

**One-off full historical backfill (rare; ~25–30h, checkpointed):**

```bash
cd /opt/opendoor/backend && export $(cat /opt/opendoor/.env | grep -v '^#' | xargs) \
  && ./backfill -tiers "S,A,B,C,D" -comments-tiers "S,A,B,C,D" \
       -from 2026-02-10 -to 2026-08-09 -rph 4800 -checkpoint <name>.json
# Ctrl-C anytime; rerun same command to resume from checkpoint.
```

**Reinstall the cron block (after git pull / on a fresh host):**

```bash
~/src/opendoor/scripts/install-crontab.sh && crontab -l
```

---

## 5. Verification

- **Scores current?**
  `SELECT COUNT(*) FROM latest_snapshots WHERE updated_at > NOW() - INTERVAL 2 DAY;`
  (expect ~all 27k within 2 days once nightly recalc runs).
- **Tier distribution sane?**
  `SELECT c_rank_tier, COUNT(*) FROM latest_snapshots GROUP BY c_rank_tier;`
  Baseline after one-time backfill: S≈1.2k · A≈7.3k · B≈7.7k · C≈4.5k · D≈6.5k.
- **Recalc ran?** `cat /opt/opendoor/backend/.job_runs/recalculate.last`
  and grep `/opt/opendoor/backend/opendoor_jobs.log` for `recalculate-history: (starting|done|FAILED)`. (Job logs go to `opendoor_jobs.log`, deliberately separate from the app's JSON `opendoor.log`.)
- **Event intake healthy?** hourly no-gap check:
  `SELECT DATE(event_at), HOUR(event_at), COUNT(*) FROM repo_pr_events
   WHERE event_at > NOW() - INTERVAL 2 DAY GROUP BY 1,2 ORDER BY 1 DESC, 2 DESC;`
- **GitHub API budget:** backfill is hard-capped at `-rph 4800`; script logs
  every 403/429 sleep.

---

## 6. Externally-managed jobs (NOT in git) — exec as cron user, via curl

| Endpoint | Method | Auth |
|---|---|---|
| `/internal/sync-trending` | POST | `x-api-key: <key>` |
| `/internal/seed` | POST | `x-api-key: <key>` |
| `/internal/update-scores` | POST | `x-api-key: <key>` |

These ship as plain cron lines (see `crontab -l` outside the managed block).
<key> lives in `/opt/opendoor/.env` (INTERNAL_API_KEY). Do **not** move them
into git — they embed the API key.