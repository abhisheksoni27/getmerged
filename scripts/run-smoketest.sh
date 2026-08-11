#!/usr/bin/env bash
# Smoke test: crawler snapshot vs DB-event recompute agreement.
# Runs cmd/smoketest with env DSN. Exits non-zero if any repo mismatches.
#
# Usage:
#   scripts/run-smoketest.sh [count]
set -euo pipefail

COUNT="${1:-10}"
ENV_FILE="${OPENDOR_ENV_FILE:-/opt/opendoor/.env}"
REPO="${OPENDOR_REPO:-$HOME/src/opendoor}"
BIN="${OPENDOR_BACKEND_DIR:-/opt/opendoor/backend}"

[ -f "$ENV_FILE" ] || { echo "env file not found: $ENV_FILE" >&2; exit 1; }
set -a; source "$ENV_FILE"; set +a

DSN="${DB_USER:-opendoor_user}:${DB_PASSWORD:-opendoor_pass}@tcp(127.0.0.1:3306)/opendoor?parseTime=true"

cd "$REPO/backend"
go run ./cmd/smoketest -n "$COUNT" -dsn "$DSN"