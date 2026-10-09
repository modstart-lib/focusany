#!/bin/sh

# Acquire an exclusive test lock. Sourced by Makefile:
#   . scripts/acquire-lock.sh "dev-seed-test"
# The lock is a directory under <project>/_temp holding the owner PID in `pid`.

LOCK_NAME="$1"
if [ -z "$LOCK_NAME" ]; then
  LOCK_NAME="focusany"
fi

LOCK_ROOT="${FOCUSANY_LOCK_ROOT:-_temp}"
mkdir -p "$LOCK_ROOT"
LOCK_DIR="$LOCK_ROOT/${LOCK_NAME}.lock"
export FOCUSANY_LOCK_DIR="$LOCK_DIR"

LAST_PID=""
while ! mkdir "$LOCK_DIR" 2>/dev/null; do
  LOCK_PID="$(cat "$LOCK_DIR/pid" 2>/dev/null || true)"
  if [ -z "$LOCK_PID" ]; then
    # The owner may not have written its PID yet, give it a moment before judging.
    sleep 1
    LOCK_PID="$(cat "$LOCK_DIR/pid" 2>/dev/null || true)"
  fi
  if [ -z "$LOCK_PID" ] || ! kill -0 "$LOCK_PID" 2>/dev/null; then
    echo "[lock] 检测到残留锁（持有进程 PID ${LOCK_PID:-未知} 已退出），忽略锁并接管" >&2
    rm -rf "$LOCK_DIR"
    continue
  fi
  if [ "$LOCK_PID" != "$LAST_PID" ]; then
    echo "[lock] 其他进程正在进行测试（PID: ${LOCK_PID}），等待其结束后自动继续..." >&2
    LAST_PID="$LOCK_PID"
  fi
  sleep 2
done

printf '%s' "$$" > "$LOCK_DIR/pid"
