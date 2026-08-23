#!/usr/bin/env bash
set -euo pipefail

export $(cat /opt/opendoor/.env | grep -v "^#" | xargs)

for date in 2026-08-14 2026-08-15 2026-08-16 2026-08-17 2026-08-18 2026-08-19 2026-08-20 2026-08-21 2026-08-22; do
  echo "Backfilling metrics for $date..."
  /opt/opendoor/backend/morning_brief "$date" >/dev/null
done
echo "Backfill completed."
