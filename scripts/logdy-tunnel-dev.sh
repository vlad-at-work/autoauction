#!/usr/bin/env bash
set -euo pipefail

# Dev-only helper: opens SSH tunnel to private Logdy on server.
# Usage:
#   bash scripts/logdy-tunnel-dev.sh
# Then open:
#   http://127.0.0.1:18080

HOST="79.174.80.170"
USER="root"
PASSWORD="LQJcQ5ZUmqhtRUxs"
LOCAL_PORT="${LOCAL_PORT:-18080}"
REMOTE_HOST="127.0.0.1"
REMOTE_PORT="8080"

if ! command -v sshpass >/dev/null 2>&1; then
  echo "sshpass is required."
  echo "macOS install: brew install hudochenkov/sshpass/sshpass"
  exit 1
fi

echo "Opening tunnel: http://127.0.0.1:${LOCAL_PORT} -> ${REMOTE_HOST}:${REMOTE_PORT} on ${USER}@${HOST}"
echo "Press Ctrl+C to close."
exec sshpass -p "${PASSWORD}" ssh \
  -o StrictHostKeyChecking=no \
  -o ExitOnForwardFailure=yes \
  -N -L "${LOCAL_PORT}:${REMOTE_HOST}:${REMOTE_PORT}" \
  "${USER}@${HOST}"
