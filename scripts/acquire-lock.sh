#!/bin/sh

LOCK_NAME="$1"
if [ -z "$LOCK_NAME" ]; then
  LOCK_NAME="focusany"
fi

LOCK_DIR="${TMPDIR:-/tmp}/focusany-${LOCK_NAME}.lock"

while ! mkdir "$LOCK_DIR" 2>/dev/null; do
  if [ -f "$LOCK_DIR/pid" ]; then
    LOCK_PID="$(cat "$LOCK_DIR/pid" 2>/dev/null || true)"
    if [ -n "$LOCK_PID" ] && ! kill -0 "$LOCK_PID" 2>/dev/null; then
      rm -rf "$LOCK_DIR"
      continue
    fi
  fi
  sleep 1
done

printf '%s' "$$" > "$LOCK_DIR/pid"
export FOCUSANY_LOCK_DIR="$LOCK_DIR"
