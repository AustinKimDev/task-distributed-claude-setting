#!/bin/bash
set -e
PROJECT_DIR="${1:-.}"
SKILL_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SESSION_ID="$$-$(date +%s)"
PLAYGROUND_DIR="${PROJECT_DIR}/.create-design-md/playground"
CONTENT_DIR="${PLAYGROUND_DIR}/${SESSION_ID}/content"
STATE_DIR="${PLAYGROUND_DIR}/${SESSION_ID}/state"
mkdir -p "$CONTENT_DIR" "$STATE_DIR"
cd "$SKILL_DIR"
nohup bun run scripts/playground/server.ts \
  --content-dir "$CONTENT_DIR" \
  --state-dir "$STATE_DIR" \
  --port 0 \
  > "$STATE_DIR/server.log" 2>&1 &
SERVER_PID=$!
echo "$SERVER_PID" > "$STATE_DIR/server.pid"
for i in $(seq 1 10); do
  if [ -f "$STATE_DIR/server-info.json" ]; then
    cat "$STATE_DIR/server-info.json"
    exit 0
  fi
  sleep 0.5
done
echo '{"error": "Server failed to start within 5 seconds"}'
exit 1
