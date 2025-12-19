#!/bin/bash
#
# signal-active.sh: Signals dispatcher that Claude is actively processing
#
# Sends SIGURG to the dispatcher to indicate Claude is processing a request.
# If DISPATCHER_PID is set, sends directly to that PID.
# Otherwise falls back to process group (for non-dispatcher usage).
#
# Used by: SessionStart, UserPromptSubmit hooks
#
# Input (stdin): JSON with session_id, transcript_path, hook_event_name
# Output: None on success, error details to stderr on failure
# Exit codes: 0 = success, 2 = unexpected error
#
# Environment variables:
#   DISPATCHER_PID - PID of the dispatcher to send signals to (set by dispatcher)
#   SIGNAL_ACTIVE_TEST_MODE - If set to "1", skips sending signals (for testing)
#

set -euo pipefail

# ============================================================================
# Dispatcher Session File Fallback
# ============================================================================
# Claude Code doesn't pass custom env vars to hooks, so we read from a file
# written by the dispatcher before launching Claude.

DISPATCHER_SESSION_FILE="$HOME/.claude/dispatcher-sessions/active.json"

# Try to load DISPATCHER_PID from session file if not set in env
if [ -z "${DISPATCHER_PID:-}" ]; then
  if [ -f "$DISPATCHER_SESSION_FILE" ]; then
    FILE_DISPATCHER_PID=$(jq -r '.dispatcherPid // empty' "$DISPATCHER_SESSION_FILE" 2>/dev/null) || FILE_DISPATCHER_PID=""
    if [ -n "$FILE_DISPATCHER_PID" ]; then
      DISPATCHER_PID="$FILE_DISPATCHER_PID"
    fi
  fi
fi

# Error handler - outputs to stderr and exits with code 2
error_handler() {
    local line_no=$1
    local error_code=$2
    echo "ERROR in signal-active.sh at line $line_no (exit code: $error_code)" >&2
    echo "Please report this issue at: https://github.com/goodfoot-io/compare-branch-extension/issues" >&2
    echo "Include the error details above and steps to reproduce." >&2
    exit 2
}

trap 'error_handler ${LINENO} $?' ERR

# Read input from stdin
INPUT=$(cat)

# Extract session_id from input (for logging/debugging)
SESSION_ID=$(echo "$INPUT" | jq -r '.session_id // empty') || SESSION_ID=""
if [ -z "$SESSION_ID" ]; then
  exit 0
fi

# Send SIGURG to notify dispatcher that Claude is actively processing
if [ "${SIGNAL_ACTIVE_TEST_MODE:-}" = "1" ]; then
  echo "TEST_MODE: Would send SIGURG (session=$SESSION_ID, dispatcher=${DISPATCHER_PID:-none})" >&2
elif [ -n "${DISPATCHER_PID:-}" ]; then
  # Send directly to dispatcher PID (avoids affecting other processes)
  kill -URG "$DISPATCHER_PID" 2>/dev/null || true
else
  # Fallback to process group for non-dispatcher usage
  kill -URG 0 2>/dev/null || true
fi

exit 0
