#!/usr/bin/env bash
# Opendoor Daily Static Sitemap Generator, Search Broadcaster & Git Auto-Sync
set -euo pipefail

REPO_DIR="/home/deploy/src/opendoor"
ENV_FILE="/opt/opendoor/.env"
LOG_FILE="/opt/opendoor/backend/opendoor_sitemap.log"

echo "[$(date -u +%FT%TZ)] sitemap-cron: starting generation..." >> "$LOG_FILE"

# Extract DATABASE_URL cleanly from /opt/opendoor/.env
if [ -f "$ENV_FILE" ]; then
  DATABASE_URL=$(grep '^DATABASE_URL=' "$ENV_FILE" | cut -d= -f2- | tr -d '\"')
  export DATABASE_URL
fi

# 1. Run Go sitemap generator targeting /opt runtime & source repo
/home/deploy/src/opendoor/backend/bin/generate_sitemap -out /opt/opendoor/frontend/public >> "$LOG_FILE" 2>&1
/home/deploy/src/opendoor/backend/bin/generate_sitemap -out "$REPO_DIR/frontend/public" >> "$LOG_FILE" 2>&1

echo "[$(date -u +%FT%TZ)] sitemap-cron: static XML generation complete." >> "$LOG_FILE"

# 2. Ping Search Engines / IndexNow protocol
SITEMAP_URL="https://getmerged.abhishekco.de/sitemap.xml"
INDEXNOW_KEY="81881b2383c042129486c4e0ce05f6e8"
curl -s -o /dev/null -w "IndexNow HTTP: %{http_code}\n" "https://api.indexnow.org/indexnow?url=https://getmerged.abhishekco.de/&key=${INDEXNOW_KEY}" >> "$LOG_FILE" 2>&1 || true
curl -s -o /dev/null -w "Bing IndexNow HTTP: %{http_code}\n" "https://www.bing.com/indexnow?url=https://getmerged.abhishekco.de/&key=${INDEXNOW_KEY}" >> "$LOG_FILE" 2>&1 || true

echo "[$(date -u +%FT%TZ)] sitemap-cron: broadcast complete for ${SITEMAP_URL}." >> "$LOG_FILE"

# 3. Commit & Push sitemap updates to GitHub if changes exist
cd "$REPO_DIR"
if [[ -n $(git status -s frontend/public/sitemap.xml frontend/public/sitemap/) ]]; then
  echo "[$(date -u +%FT%TZ)] sitemap-cron: git changes detected in public sitemaps, committing..." >> "$LOG_FILE"
  git add frontend/public/sitemap.xml frontend/public/sitemap/
  git commit -m "chore(seo): auto-generate updated static XML sitemaps [skip ci]" >> "$LOG_FILE" 2>&1 || true
  git push origin main >> "$LOG_FILE" 2>&1 || true
  echo "[$(date -u +%FT%TZ)] sitemap-cron: git push complete." >> "$LOG_FILE"
else
  echo "[$(date -u +%FT%TZ)] sitemap-cron: no sitemap diff detected in git." >> "$LOG_FILE"
fi
