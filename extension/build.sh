#!/usr/bin/env bash
# Build & package script for GetMerged GitHub Extension (Chrome + Firefox)
set -euo pipefail
cd "$(dirname "$0")"

echo "==> Validating GetMerged Extension..."

# 1. Validate manifest JSON
node -e "JSON.parse(require('fs').readFileSync('manifest.json','utf8')); console.log('✓ manifest.json is valid JSON');"

# 2. Check icon assets
for icon in 16 32 48 128; do
  if [ ! -f "icons/icon${icon}.png" ]; then
    echo "✗ Missing icons/icon${icon}.png"
    exit 1
  fi
done
echo "✓ Icons 16/32/48/128 verified"

# 3. Check critical files
for f in background.js content.js content.css popup.html popup.js popup.css; do
  if [ ! -f "$f" ]; then
    echo "✗ Missing $f"
    exit 1
  fi
done
echo "✓ Core extension scripts and styles verified"

# 4. Package zip for distribution
rm -rf dist
mkdir -p dist/chrome dist/firefox
zip -r -q dist/getmerged-chrome-extension.zip . -x 'dist/*' '*.git/*' 'build.sh' '*.DS_Store'
cp dist/getmerged-chrome-extension.zip dist/chrome/opendoor-github-extension.zip
cp dist/getmerged-chrome-extension.zip dist/firefox/opendoor-github-extension.zip

echo "✓ Extension packaged successfully:"
ls -lh dist/getmerged-chrome-extension.zip dist/chrome/opendoor-github-extension.zip
echo "==> Ready for Chrome Web Store upload or local developer loading!"
