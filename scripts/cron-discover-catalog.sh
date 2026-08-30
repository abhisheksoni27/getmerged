#!/usr/bin/env bash
# Weekly complete catalog discovery sweep across GitHub.
# Paginates stars:>=500 (global) and stars:200..499 (all languages) via GraphQL,
# upserts repository metadata into MySQL, and populates indexing_queue.
#
# Runs weekly on Saturdays at 02:00 UTC.
set -euo pipefail

ENV_FILE="${OPENDOR_ENV_FILE:-/opt/opendoor/.env}"
BIN="${OPENDOR_BACKEND_DIR:-/opt/opendoor/backend}"
JOB_DIR="${OPENDOR_JOB_DIR:-$BIN/.job_runs}"
LOCK_FILE="$JOB_DIR/discover_catalog.lock"
OP_RUN_LOG="${OP_RUN_LOG:-$BIN/opendoor_jobs.log}"

mkdir -p "$JOB_DIR"

if ! source "$ENV_FILE" 2>/dev/null; then
  echo "[$(date -u +%FT%TZ)] ERROR: env file ${ENV_FILE} not found" >&2
  exit 1
fi

if [[ -z "${GITHUB_TOKEN:-}" ]]; then
  echo "[$(date -u +%FT%TZ)] discover-catalog: GITHUB_TOKEN not set" >>"$OP_RUN_LOG"
  exit 1
fi

exec 9>"$LOCK_FILE"
if ! flock -n 9; then
  echo "[$(date -u +%FT%TZ)] discover-catalog skipped: another run in progress" >>"$OP_RUN_LOG"
  exit 0
fi

echo "[$(date -u +%FT%TZ)] discover-catalog: starting weekly 200+ star discovery sweep" >>"$OP_RUN_LOG"

if "$BIN/discover_catalog" -min-stars 200 >>"$OP_RUN_LOG" 2>&1; then
  echo "[$(date -u +%FT%TZ)] discover-catalog: completed successfully" >>"$OP_RUN_LOG"
else
  echo "[$(date -u +%FT%TZ)] discover-catalog: finished with error (exit $?)" >>"$OP_RUN_LOG"
fi
