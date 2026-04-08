#!/bin/bash
set -euo pipefail

# Double-click launcher for macOS.
# Opens tunnel on fixed local port and launches browser.

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
URL="http://127.0.0.1:18080"

echo "Starting Logdy tunnel launcher..."
echo "Project scripts dir: $SCRIPT_DIR"
echo

# Kill stale listener on 18080 if any (best-effort)
if lsof -ti tcp:18080 >/dev/null 2>&1; then
  echo "Port 18080 is already in use. Attempting to stop old process..."
  lsof -ti tcp:18080 | xargs kill -9 || true
  sleep 1
fi

echo "Launching tunnel in background..."
bash "$SCRIPT_DIR/logdy-tunnel-dev.sh" &
TUNNEL_PID=$!

# Wait briefly for tunnel to come up
sleep 2

echo "Opening browser: $URL"
open "$URL" || true

echo
echo "Logdy tunnel should now be available at: $URL"
echo "Tunnel PID: $TUNNEL_PID"
echo "Keep this terminal window open while using logs."
echo "Press Ctrl+C to stop."

cleanup() {
  echo
  echo "Stopping tunnel..."
  kill "$TUNNEL_PID" >/dev/null 2>&1 || true
  exit 0
}
trap cleanup INT TERM

wait "$TUNNEL_PID"
