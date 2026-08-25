#!/usr/bin/env bash
# Installs opendoor cron entries into the current user's crontab.
# Idempotent: keeps existing lines, only appends/updates the managed block
# between markers. Safe to run repeatedly; view with `crontab -l`.
#
# The managed block relies on scripts being present in the repo checkout at
# OPENDOR_REPO (default ~/src/opendoor) so `git pull` keeps them fresh.
#
# Usage:
#   scripts/install-crontab.sh
set -euo pipefail

REPO="${OPENDOR_REPO:-$HOME/src/opendoor}"
SCRIPTS="$REPO/scripts"
MARKER_BEGIN="# BEGIN opendoor-managed"
MARKER_END="# END opendoor-managed"

# UTC times: recalc runs after update-scores (00:00) so tiers re-anchor overnight.
MANAGED=$'# ── Opendoor nightly global re-anchor (after update-scores at 00:00 UTC)\n'
MANAGED+="30 3 * * * $SCRIPTS/cron-recalculate.sh"$'\n'
MANAGED+=$'# ── Opendoor rolling event backfill (30-day window, Sundays 05:00 UTC)\n'
MANAGED+="0 5 * * 0 $SCRIPTS/cron-backfill-rolling.sh 30 \"S,A,B,C,D\" \"S,A,B,C,D\""$'\n'
MANAGED+=$'# ── GFI weekly digest + outbox drain (Mondays 09:00 UTC, AC3)\n'
MANAGED+="0 9 * * 1 $SCRIPTS/cron-gfi-digest.sh"$'\n'

chmod +x "$SCRIPTS/cron-recalculate.sh" "$SCRIPTS/cron-backfill-rolling.sh" "$SCRIPTS/cron-gfi-digest.sh"

TMP="$(mktemp)"

# Preserve existing non-managed lines
crontab -l 2>/dev/null | awk -v b="$MARKER_BEGIN" -v e="$MARKER_END" '
  $0==b {skip=1}
  skip==0 {print}
  $0==e {skip=0}
' > "$TMP" || true

printf '%s\n%s%s\n' "$MARKER_BEGIN" "$MANAGED" "$MARKER_END" >> "$TMP"

if crontab "$TMP"; then
  rm -f "$TMP"
  echo "✓ Installed. Current crontab:"
  crontab -l
else
  rm -f "$TMP"
  echo "✗ Failed to install crontab" >&2
  exit 1
fi