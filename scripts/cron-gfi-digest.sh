#!/usr/bin/env bash
# Weekly GFI digest + outbox drain (AC3): runs Mondays 09:00 UTC via
# scripts/install-crontab.sh. Triggers POST /internal/jobs/gfi-digest, which
# re-validates each match (still present, unclaimed) immediately before send,
# then drains pending instant-alert rows through the throttled send pipeline.
#
# Usage:
#   scripts/cron-gfi-digest.sh
set -euo pipefail

ENV_FILE="${OPENDOR_ENV_FILE:-/opt/opendoor/.env}"
JOB_DIR="${OPENDOR_JOB_DIR:-${OPENDOR_BACKEND_DIR:-/opt/opendoor/backend}/.job_runs}"
LOCK_FILE="$JOB_DIR/gfi-digest.lock"

mkdir -p "$JOB_DIR"

if ! source "$ENV_FILE" 2>/dev/null; then
  echo "[$(date -u +%FT%TZ)] ERROR: env file ${ENV_FILE} not found" >&2
  exit 1
fi

if [ -z "${JOB_SECRET:-}" ]; then
  echo "[$(date -u +%FT%TZ)] ERROR: JOB_SECRET missing from env" >&2
  exit 1
fi

OP_RUN_LOG="${OP_RUN_LOG:-${OPENDOR_BACKEND_DIR:-/opt/opendoor/backend}/opendoor_jobs.log}"
PORT="${PORT:-8080}"

# Prevent overlapping runs (ok to exit quietly if one is in progress).
exec 9>"$LOCK_FILE"
if ! flock -n 9; then
  echo "[$(date -u +%FT%TZ)] gfi-digest skipped: another run in progress" >>"$OP_RUN_LOG"
  exit 0
fi

echo "[$(date -u +%FT%TZ)] gfi-digest: starting" >>"$OP_RUN_LOG"
HTTP_CODE=$(curl -sS -o "$JOB_DIR/gfi-digest.last.json" -w "%{http_code}" -X POST \
  -H "X-Job-Secret: ${JOB_SECRET}" \
  "http://127.0.0.1:${PORT}/internal/jobs/gfi-digest" || true)
echo "[$(date -u +%FT%TZ)] gfi-digest: done http=$HTTP_CODE" >>"$OP_RUN_LOG"
date -u +%FT%TZ > "$JOB_DIR/gfi-digest.last"
[ "$HTTP_CODE" = "200" ]
