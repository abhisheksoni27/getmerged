#!/usr/bin/env bash
# setup-weekly-digest.sh — one-time setup on the Oracle Linux Ampere A1 VM.
# Uses Hermes (already installed) for the weekly blog drafting — no Claude Code.
# Installs Go (if missing), builds weekly_digest, registers cron entries.
# Idempotent: safe to re-run.
set -euo pipefail

OPENDOOR_DIR="${OPENDOOR_DIR:-$HOME/github/abhisheksoni27/opendoor}"
DIGEST_OUT_DIR="${DIGEST_OUT_DIR:-$HOME/opendoor-digests}"
BLOG_DIR="${BLOG_DIR:-$HOME/github/abhisheksoni27/blog}"
CRON_SCHEDULE="${CRON_SCHEDULE:-0 7 * * 1}"   # Mondays 07:00 server time

log() { echo "[setup] $*"; }

# --- 1. Ensure Go >= 1.21 (Oracle Linux default repos often lack it) --------
if ! command -v go >/dev/null 2>&1; then
    log "installing Go..."
    GO_VERSION="1.22.5"
    curl -fsSL "https://go.dev/dl/go${GO_VERSION}.linux-arm64.tar.gz" -o /tmp/go.tar.gz
    sudo rm -rf /usr/local/go
    sudo tar -C /usr/local -xzf /tmp/go.tar.gz
    rm /tmp/go.tar.gz
    grep -q '/usr/local/go/bin' ~/.bashrc || echo 'export PATH=$PATH:/usr/local/go/bin:~/go/bin' >> ~/.bashrc
fi
export PATH=$PATH:/usr/local/go/bin:~/go/bin
log "go $(go version | awk '{print $3}')"

# --- 2. Build weekly_digest ---------------------------------------------------
mkdir -p "$HOME/bin" "$DIGEST_OUT_DIR"
cd "$OPENDOOR_DIR/backend"
log "building weekly_digest..."
go build -o "$HOME/bin/weekly_digest" ./cmd/weekly_digest

# Smoke run: exits non-zero on failure.
"$HOME/bin/weekly_digest" -days 7 > "$DIGEST_OUT_DIR/smoke-test.json"
log "smoke test OK -> $DIGEST_OUT_DIR/smoke-test.json"

# --- 3. Blog repo clone (publishing target) ------------------------------------
if [ ! -d "$BLOG_DIR" ]; then
    log "cloning blog repo..."
    git clone git@github.com:abhisheksoni27/blog.git "$BLOG_DIR"
fi

# --- 4. Cron entry: digest generation Monday mornings ---------------------------
CRON_LINE="$CRON_SCHEDULE cd $OPENDOOR_DIR/backend && $HOME/bin/weekly_digest -out $DIGEST_OUT_DIR/digest-\$(date +\\%Y-\\%m-\\%d).json >> $DIGEST_OUT_DIR/cron.log 2>&1"
if ! crontab -l 2>/dev/null | grep -qF "weekly_digest"; then
    log "registering cron ($CRON_SCHEDULE)..."
    (crontab -l 2>/dev/null; echo "$CRON_LINE") | crontab -
else
    log "cron entry already present, skipping"
fi

# --- 5. Blog drafting: Hermes cronjob --------------------------------------------
# No second agent needed. Register the Hermes cronjob (drafts the post 30 min
# after the digest lands and delivers it to you in chat for review):
#   hermes cron create --name weekly-blog-draft --schedule '30 7 * * 1' \
#     --prompt-file "$OPENDOOR_DIR/scripts/blog-draft-prompt.md"
log "done."
