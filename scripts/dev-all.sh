#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_PORT="${BACKEND_PORT:-8000}"
FRONTEND_HOST="${FRONTEND_HOST:-127.0.0.1}"
FRONTEND_PORT="${FRONTEND_PORT:-5173}"

if [[ -x "$ROOT_DIR/backend/.venv/bin/python" ]]; then
  PYTHON="$ROOT_DIR/backend/.venv/bin/python"
else
  PYTHON="${PYTHON:-python3}"
fi

PIDS=()
CLEANED=0

cleanup() {
  if [[ "$CLEANED" -eq 1 ]]; then
    return
  fi
  CLEANED=1
  trap - EXIT INT TERM

  if [[ ${#PIDS[@]} -gt 0 ]]; then
    echo
    echo "[dev] stopping servers..."
    kill "${PIDS[@]}" 2>/dev/null || true
    wait "${PIDS[@]}" 2>/dev/null || true
    PIDS=()
  fi
}

trap cleanup EXIT INT TERM

cd "$ROOT_DIR"

echo "[dev] backend:  http://127.0.0.1:${BACKEND_PORT}"
"$PYTHON" -m uvicorn backend.main:app --port "$BACKEND_PORT" &
PIDS+=("$!")

echo "[dev] frontend: http://${FRONTEND_HOST}:${FRONTEND_PORT}"
npm run dev -- --host "$FRONTEND_HOST" --port "$FRONTEND_PORT" &
PIDS+=("$!")

echo "[dev] press Ctrl-C to stop both servers"

EXIT_CODE=0
while true; do
  for pid in "${PIDS[@]}"; do
    if ! kill -0 "$pid" 2>/dev/null; then
      wait "$pid" || EXIT_CODE="$?"
      cleanup
      exit "$EXIT_CODE"
    fi
  done
  sleep 1
done

cleanup
exit "$EXIT_CODE"
