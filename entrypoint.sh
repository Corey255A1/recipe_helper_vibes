#!/bin/sh
# Configure git safe directory so container can run git commands on bind-mounted /app
if command -v git >/dev/null 2>&1; then
  git config --global --add safe.directory /app 2>/dev/null || true
fi

echo "[ENTRYPOINT] Starting Recipe Helper supervisor loop..."

while true; do
  node server/index.js
  EXIT_CODE=$?
  echo "[ENTRYPOINT] Server process exited with code $EXIT_CODE. Restarting in 1 second..."
  sleep 1
done
