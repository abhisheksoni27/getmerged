#!/usr/bin/env bash
# Opendoor Daily Static Sitemap Generator & IndexNow/Search Broadcaster
set -euo pipefail

ENV_FILE="/opt/opendoor/.env"
LOG_FILE="/opt/opendoor/backend/opendoor_sitemap.log"

echo "[$(date -u +%FT%TZ)] sitemap-cron: starting generation..." >> "$LOG_FILE"

# Extract DATABASE_URL cleanly from /opt/opendoor/.env
if [ -f "$ENV_FILE" ]; then
  DATABASE_URL=$(grep '^DATABASE_URL=' "$ENV_FILE" | cut -d= -f2- | tr -d '\"')
  export DATABASE_URL
fi

# Run Go sitemap generator targeting both /opt deployment & source repo
/home/deploy/src/opendoor/backend/bin/generate_sitemap -out /opt/opendoor/frontend/public >> "$LOG_FILE" 2>&1
/home/deploy/src/opendoor/backend/bin/generate_sitemap -out /home/deploy/src/opendoor/frontend/public >> "$LOG_FILE" 2>&1

echo "[$(date -u +%FT%TZ)] sitemap-cron: static XML generation complete." >> "$LOG_FILE"

# Ping Search Engines / IndexNow protocol
SITEMAP_URL="https://opendoor.abhishekco.de/sitemap.xml"
curl -s -o /dev/null -w "HTTP: %{http_code}\n" "https://www.bing.com/indexnow?url=https://opendoor.abhishekco.de/&key=opendoor-sitemap" >> "$LOG_FILE" 2>&1 || true

echo "[$(date -u +%FT%TZ)] sitemap-cron: broadcast complete for ${SITEMAP_URL}." >> "$LOG_FILE"
