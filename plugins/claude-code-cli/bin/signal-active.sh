#!/bin/bash
#
# signal-active.sh: Signals dispatcher that Claude is actively processing
#
# Sends SIGURG to the dispatcher to indicate Claude is processing a request.
# If DISPATCHER_PID is set, sends directly to that PID.
# Otherwise falls back to process group (for non-dispatcher usage).
#
# On SessionStart events, persists DISPATCHER_PID and CLAUDE_START_TIME to
# CLAUDE_ENV_FILE so subsequent hooks (like Stop) can access them.
#
# Used by: SessionStart, UserPromptSubmit hooks
#
# Input (stdin): JSON with session_id, transcript_path, hook_event_name
# Output: None on success, error details to stderr on failure
# Exit codes: 0 = success, 2 = unexpected error
#
# Environment variables:
#   DISPATCHER_PID - PID of the dispatcher to send signals to (set by dispatcher)
#   CLAUDE_START_TIME - ISO 8601 timestamp of session start (set by dispatcher)
#   CLAUDE_ENV_FILE - File path to persist env vars (provided by Claude Code on SessionStart)
#   SIGNAL_ACTIVE_TEST_MODE - If set to "1", skips sending signals (for testing)
#

set -euo pipefail

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

# Extract session_id and hook_event_name from input
SESSION_ID=$(echo "$INPUT" | jq -r '.session_id // empty') || SESSION_ID=""
HOOK_EVENT=$(echo "$INPUT" | jq -r '.hook_event_name // empty') || HOOK_EVENT=""
if [ -z "$SESSION_ID" ]; then
  exit 0
fi

# On SessionStart, persist DISPATCHER_PID and CLAUDE_START_TIME to CLAUDE_ENV_FILE
# so subsequent hooks (like Stop) can access them
if [ "$HOOK_EVENT" = "SessionStart" ] && [ -n "${CLAUDE_ENV_FILE:-}" ]; then
  if [ -n "${DISPATCHER_PID:-}" ]; then
    echo "export DISPATCHER_PID='${DISPATCHER_PID}'" >> "$CLAUDE_ENV_FILE"
  fi
  if [ -n "${CLAUDE_START_TIME:-}" ]; then
    echo "export CLAUDE_START_TIME='${CLAUDE_START_TIME}'" >> "$CLAUDE_ENV_FILE"
  fi
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
