#!/usr/bin/env bash
# Opendoor / GetMerged Cloudflare Cache Purge Utility
# Supports purging by:
#  - Single/Multiple Tags (--tags "repos,repo-facebook-react")
#  - Prefix / Bucket (--prefixes "https://getmerged.abhishekco.de/topics/")
#  - Specific URLs (--urls "https://getmerged.abhishekco.de/facebook/react")
#  - Everything (--all)
set -euo pipefail

ENV_FILE="/opt/opendoor/.env"
if [ -f "$ENV_FILE" ]; then
  export $(grep -v '^#' "$ENV_FILE" | xargs) 2>/dev/null || true
fi

CF_ZONE_ID="${CLOUDFLARE_ZONE_ID:-${CF_ZONE_ID:-}}"
CF_API_TOKEN="${CLOUDFLARE_API_TOKEN:-${CF_API_TOKEN:-}}"

if [ -z "$CF_ZONE_ID" ] || [ -z "$CF_API_TOKEN" ]; then
  echo "❌ Error: CLOUDFLARE_ZONE_ID and CLOUDFLARE_API_TOKEN must be set in /opt/opendoor/.env or environment."
  echo "Usage: $0 [--tags tag1,tag2 | --prefixes prefix1 | --urls url1,url2 | --all]"
  exit 1
fi

API_ENDPOINT="https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/purge_cache"

MODE=""
ARG_VALUE=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --tags|-t)
      MODE="tags"
      ARG_VALUE="$2"
      shift 2
      ;;
    --prefixes|-p)
      MODE="prefixes"
      ARG_VALUE="$2"
      shift 2
      ;;
    --urls|-u)
      MODE="files"
      ARG_VALUE="$2"
      shift 2
      ;;
    --all|-a)
      MODE="all"
      shift 1
      ;;
    --repo|-r)
      MODE="repo"
      ARG_VALUE="$2"
      shift 2
      ;;
    --topic)
      MODE="topic"
      ARG_VALUE="$2"
      shift 2
      ;;
    --help|-h)
      echo "Cloudflare Cache Purge Utility"
      echo "Options:"
      echo "  --repo <owner/name>       Purge a single repo page and its related tags"
      echo "  --topic <topic>           Purge a specific topic page and topic tag"
      echo "  --tags <t1,t2>            Purge by Cache-Tag(s)"
      echo "  --prefixes <p1,p2>        Purge by URL prefix (e.g. https://getmerged.abhishekco.de/topics/)"
      echo "  --urls <u1,u2>            Purge by specific exact URLs"
      echo "  --all                     Purge everything in the zone"
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

if [ -z "$MODE" ]; then
  echo "Please specify a purge option. Run with --help for options."
  exit 1
fi

PAYLOAD="{}"

if [ "$MODE" = "all" ]; then
  echo "🧹 Purging entire Cloudflare edge cache..."
  PAYLOAD='{"purge_everything": true}'
elif [ "$MODE" = "repo" ]; then
  # Format owner/name to tag: repo-owner-name
  CLEAN_REPO=$(echo "$ARG_VALUE" | tr '/' '-')
  TAG="repo-${CLEAN_REPO}"
  URL="https://getmerged.abhishekco.de/${ARG_VALUE}"
  echo "🧹 Purging cache for repo '$ARG_VALUE' (Tag: $TAG, URL: $URL)..."
  PAYLOAD=$(python3 -c "import json; print(json.dumps({'tags': ['$TAG'], 'files': ['$URL']}))")
elif [ "$MODE" = "topic" ]; then
  TAG="topic-${ARG_VALUE}"
  URL="https://getmerged.abhishekco.de/topics/${ARG_VALUE}"
  echo "🧹 Purging cache for topic '$ARG_VALUE' (Tag: $TAG, URL: $URL)..."
  PAYLOAD=$(python3 -c "import json; print(json.dumps({'tags': ['$TAG'], 'files': ['$URL']}))")
elif [ "$MODE" = "tags" ]; then
  echo "🧹 Purging cache by tags: $ARG_VALUE"
  PAYLOAD=$(python3 -c "import json, sys; tags = [t.strip() for t in sys.argv[1].split(',') if t.strip()]; print(json.dumps({'tags': tags}))" "$ARG_VALUE")
elif [ "$MODE" = "prefixes" ]; then
  echo "🧹 Purging cache by prefixes: $ARG_VALUE"
  PAYLOAD=$(python3 -c "import json, sys; p = [x.strip() for x in sys.argv[1].split(',') if x.strip()]; print(json.dumps({'prefixes': p}))" "$ARG_VALUE")
elif [ "$MODE" = "files" ]; then
  echo "🧹 Purging cache by exact URLs: $ARG_VALUE"
  PAYLOAD=$(python3 -c "import json, sys; u = [x.strip() for x in sys.argv[1].split(',') if x.strip()]; print(json.dumps({'files': u}))" "$ARG_VALUE")
fi

RESPONSE=$(curl -s -X POST "$API_ENDPOINT" \
  -H "Authorization: Bearer ${CF_API_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD")

SUCCESS=$(echo "$RESPONSE" | python3 -c "import sys, json; res=json.load(sys.stdin); print(res.get('success', False))" 2>/dev/null || echo "False")

if [ "$SUCCESS" = "True" ]; then
  echo "✅ Cache successfully purged!"
else
  echo "❌ Cache purge failed. Response:"
  echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"
  exit 1
fi
