#!/usr/bin/env bash
# Rolling event backfill to catch anything the live GHArchive/eventstream
# path missed. Pulls PR events (+ comments for tiers in -comments-tiers) for
# tracked repos over the last N days via GitHub REST API. Checkpointed.
#
# API budget: 4800 req/hr ceiling on GitHub. A 30-day rolling sweep is cheap
# because most events are already in repo_pr_events (INSERT IGNORE dedupes).
#
# Usage:
#   scripts/cron-backfill-rolling.sh [days] [tiers] [comments-tiers]
#   scripts/cron-backfill-rolling.sh 30 "S,A,B,C,D" "S,A,B,C,D"
set -euo pipefail

DAYS="${1:-30}"
TIERS="${2:-S,A,B,C,D,UNSCORED}"
COMMENT_TIERS="${3:-S,A,B,C,D}"

ENV_FILE="${OPENDOR_ENV_FILE:-/opt/opendoor/.env}"
BIN="${OPENDOR_BACKEND_DIR:-/opt/opendoor/backend}"
JOB_DIR="${OPENDOR_JOB_DIR:-$BIN/.job_runs}"
LOCK_FILE="$JOB_DIR/backfill.lock"
CKPT="$BIN/backfill_rolling.json"

mkdir -p "$JOB_DIR"

# Validate days arg (must be a positive integer)
if ! [[ "$DAYS" =~ ^[0-9]+$ ]] || [[ "$DAYS" -lt 1 ]]; then
  echo "[$(date -u +%FT%TZ)] backfill-rolling: invalid days '$DAYS'" >&2
  exit 1
fi

if ! source "$ENV_FILE" 2>/dev/null; then
  echo "[$(date -u +%FT%TZ)] ERROR: env file ${ENV_FILE} not found" >&2
  exit 1
fi

# Deliberately distinct from env LOG_FILE so we never splice into app JSON logs
OP_RUN_LOG="${OP_RUN_LOG:-$BIN/opendoor_jobs.log}"

# GITHUB_TOKEN required (rest client exits without it)
if [[ -z "${GITHUB_TOKEN:-}" ]]; then
  echo "[$(date -u +%FT%TZ)] backfill-rolling: GITHUB_TOKEN not set" >>"$OP_RUN_LOG"
  exit 1
fi

exec 9>"$LOCK_FILE"
if ! flock -n 9; then
  echo "[$(date -u +%FT%TZ)] backfill-rolling skipped: another run in progress" >>"$OP_RUN_LOG"
  exit 0
fi

FROM_DATE=$(date -u -d "$DAYS days ago" +%F)
TO_DATE=$(date -u +%F)

echo "[$(date -u +%FT%TZ)] backfill-rolling: starting days=$DAYS from=$FROM_DATE to=$TO_DATE tiers=$TIERS" >>"$OP_RUN_LOG"

if "$BIN/backfill" \
    -tiers "$TIERS" \
    -comments-tiers "$COMMENT_TIERS" \
    -from "$FROM_DATE" \
    -to "$TO_DATE" \
    -rph 4800 \
    -checkpoint "$CKPT" >>"$OP_RUN_LOG" 2>&1; then
  echo "[$(date -u +%FT%TZ)] backfill-rolling: done" >>"$OP_RUN_LOG"
  date -u +%FT%TZ > "$JOB_DIR/backfill.last"
else
  rc=$?
  echo "[$(date -u +%FT%TZ)] backfill-rolling: FAILED exit=$rc" >>"$OP_RUN_LOG"
  exit "$rc"
fi