#!/usr/bin/env bash
# ==============================================================================
# GetMerged: Autonomous Sprint Runner Loop (24/7 Builder & Dogfooder)
# ==============================================================================
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

ENV_FILE="/opt/opendoor/.env"
if [ -f "$ENV_FILE" ]; then
    export $(grep -E '^(TELEGRAM_BOT_TOKEN|TELEGRAM_CHAT_ID)=' "$ENV_FILE" | xargs)
fi

send_telegram() {
    local msg="$1"
    if [ -n "$TELEGRAM_BOT_TOKEN" ] && [ -n "$TELEGRAM_CHAT_ID" ]; then
        curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
            -d "chat_id=${TELEGRAM_CHAT_ID}" \
            -d "parse_mode=Markdown" \
            -d "text=${msg}" > /dev/null 2>&1 || true
    fi
}

echo "=== GetMerged Autonomous Sprint Runner Starting ==="
send_telegram "🤖 *GetMerged Autonomous Engineer Activated*%0A%0ASystem is starting the 24/7 execution loop on Sprint 1. Progress updates will be sent after each milestone."

# Main loop: Runs story by story using antigravity / agy non-interactively
while true; do
    echo "--- Starting Story Iteration ---"
    
    # Prompt for agy
    PROMPT="You are the autonomous-engineer executing the next pending story in /home/deploy/src/opendoor/OPENDOOR_NEXT_STEPS.md.
Follow the autonomous-engineer and story-builder skills:
1. Identify the next uncompleted story in Section 12.
2. Write tests first (Red), implement code, verify green (go test ./... & npm run lint).
3. If successful, git commit and push to origin/main.
4. Update MORNING_BRIEF.md with what was done and any action required from the user.
5. If blocked on external keys/actions, log it in MORNING_BRIEF.md and proceed to the next decoupled story.
Do exactly one story per invocation, then finish cleanly."

    if command -v agy >/dev/null 2>&1; then
        agy --dangerously-skip-permissions -p "$PROMPT" || {
            echo "Iteration finished or encountered an error. Checking status..."
        }
    else
        echo "agy command not found in PATH. Exiting runner."
        send_telegram "⚠️ *Autonomous Engineer Alert*: \`agy\` CLI not found in PATH."
        exit 1
    fi

    # Read latest commit to send Telegram update
    LATEST_COMMIT=$(git log -1 --pretty=format:"%h - %s")
    send_telegram "🚀 *Story Completed & Pushed*%0A%0A📝 *Commit*: \`${LATEST_COMMIT}\`%0A📊 *Brief updated*: \`MORNING_BRIEF.md\`"

    echo "--- Cooling down for 10 seconds before next story ---"
    sleep 10
done
