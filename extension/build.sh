#!/usr/bin/env bash
# Smoke build for the OpenDoor GitHub extension. Packages identical MV3 sources
# into per-target zip artifacts for Chrome and Firefox (parity via polyfill).
set -euo pipefail
cd "$(dirname "$0")"

command -v node >/dev/null 2>&1 || { echo "node required"; exit 1; }
command -v zip  >/dev/null 2>&1 || { echo "zip required"; exit 1; }

# 1. Validate manifest JSON for both embedded targets.
node -e "JSON.parse(require('fs').readFileSync('manifest.json','utf8')); console.log('manifest.json OK')"

# 2. Sanity-check the message contract + schema presence in source.
grep -q "GET_TELEMETRY" background.js content.js || { echo "GET_TELEMETRY contract missing"; exit 1; }
grep -q "TELEMETRY_RESULT" background.js content.js || { echo "TELEMETRY_RESULT contract missing"; exit 1; }
grep -q "API_TIMEOUT\|OFFLINE\|NOT_FOUND" background.js || { echo "error codes missing"; exit 1; }
grep -q "cRank" background.js || { echo "metrics schema missing"; exit 1; }
grep -q "opendoor.dev/repo/" content.js || { echo "deeplink missing"; exit 1; }

# 3. Package both targets.
rm -rf dist
mkdir -p dist/chrome dist/firefox
zip -r -q dist/chrome/opendoor-github-extension.zip . -x 'dist/*' '*.git/*' 'build.sh'
cp dist/chrome/opendoor-github-extension.zip dist/firefox/opendoor-github-extension.zip

echo "Built Chrome + Firefox targets:"
ls -1 dist/chrome dist/firefox
