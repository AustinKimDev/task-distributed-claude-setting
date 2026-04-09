#!/bin/bash
set -e
STATE_DIR="$1"
if [ -z "$STATE_DIR" ]; then echo "Usage: stop.sh <state-dir>"; exit 1; fi
PID_FILE="$STATE_DIR/server.pid"
if [ -f "$PID_FILE" ]; then
  PID=$(cat "$PID_FILE")
  if kill -0 "$PID" 2>/dev/null; then
    kill "$PID"
    echo '{"type":"server-stopped","pid":'"$PID"'}'
  else
    echo '{"type":"server-already-stopped"}'
  fi
  rm -f "$PID_FILE"
else
  echo '{"type":"no-server-found"}'
fi
touch "$STATE_DIR/server-stopped"
