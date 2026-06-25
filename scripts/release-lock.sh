#!/bin/sh

if [ -n "$FOCUSANY_LOCK_DIR" ] && [ -d "$FOCUSANY_LOCK_DIR" ]; then
  rm -rf "$FOCUSANY_LOCK_DIR"
  exit 0
fi

PID="$1"
for LOCK_DIR in "${TMPDIR:-/tmp}"/focusany-*.lock; do
  [ -d "$LOCK_DIR" ] || continue
  if [ -z "$PID" ] || [ "$(cat "$LOCK_DIR/pid" 2>/dev/null || true)" = "$PID" ]; then
    rm -rf "$LOCK_DIR"
  fi
done
