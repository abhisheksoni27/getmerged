#!/usr/bin/env bash
# Nightly global C-Rank re-anchor.
# Re-scores every repo with in-window event data from repo_pr_events +
# repo_raw_comments and normalizes globally. ~15-20 min, no GitHub API quota.
#
# Usage:
#   scripts/cron-recalculate.sh
set -euo pipefail

ENV_FILE="${OPENDOR_ENV_FILE:-/opt/opendoor/.env}"
BIN="${OPENDOR_BACKEND_DIR:-/opt/opendoor/backend}"
JOB_DIR="${OPENDOR_JOB_DIR:-$BIN/.job_runs}"
LOCK_FILE="$JOB_DIR/recalculate.lock"

mkdir -p "$JOB_DIR"

# Load env, fail fast if missing
if ! source "$ENV_FILE" 2>/dev/null; then
  echo "[$(date -u +%FT%TZ)] ERROR: env file ${ENV_FILE} not found" >&2
  exit 1
fi

# Deliberately distinct from env LOG_FILE so we never splice into app JSON logs
OP_RUN_LOG="${OP_RUN_LOG:-$BIN/opendoor_jobs.log}"

# Prevent overlapping runs. Exit quietly if another is running (ok).
exec 9>"$LOCK_FILE"
if ! flock -n 9; then
  echo "[$(date -u +%FT%TZ)] recalculate-history skipped: another run in progress" >>"$OP_RUN_LOG"
  exit 0
fi

echo "[$(date -u +%FT%TZ)] recalculate-history: starting" >>"$OP_RUN_LOG"
if "$BIN/recalculate-history" >>"$OP_RUN_LOG" 2>&1; then
  echo "[$(date -u +%FT%TZ)] recalculate-history: done" >>"$OP_RUN_LOG"
  date -u +%FT%TZ > "$JOB_DIR/recalculate.last"
else
  rc=$?
  echo "[$(date -u +%FT%TZ)] recalculate-history: FAILED exit=$rc" >>"$OP_RUN_LOG"
  exit "$rc"
fi