#!/bin/bash
#
# Stop hook: Cleans up session and signals dispatcher on shutdown
#
# Cleans up session watermark and signals dispatcher when done.
# Only runs if ISSUE_ID environment variable is set (by wrapper script).
# Note: SessionEnd hooks cannot inject context - use SessionStart for that.
#
# Signals:
# - Always sends SIGWINCH to dispatcher to indicate Claude is now idle
#
# Input (stdin): JSON with session_id, transcript_path, cwd, hook_event_name
# Output: None
# Exit codes: 0 = success, 2 = unexpected error
#
# Environment variables:
#   DISPATCHER_PID - PID of dispatcher for sending idle signal (set by dispatcher)
#   ISSUE_ID - Issue ID being worked on (set by wrapper, e.g., "main:123")
#   SESSION_STOP_TEST_MODE - If set to "1", skips sending signals (for testing)
#

set -euo pipefail

# Error handler - outputs to stderr and exits with code 2
error_handler() {
    local line_no=$1
    local error_code=$2
    echo "ERROR in session-stop.sh at line $line_no (exit code: $error_code)" >&2
    echo "Please report this issue at: https://github.com/goodfoot-io/compare-branch-extension/issues" >&2
    echo "Include the error details above and steps to reproduce." >&2
    exit 2
}

trap 'error_handler ${LINENO} $?' ERR

# Read input from stdin
INPUT=$(cat)

# Extract session_id and cwd from input
SESSION_ID=$(echo "$INPUT" | jq -r '.session_id // empty') || SESSION_ID=""
if [ -z "$SESSION_ID" ]; then
  exit 0
fi

# Extract cwd for API discovery (hooks receive the working directory in input)
SESSION_CWD=$(echo "$INPUT" | jq -r '.cwd // empty') || SESSION_CWD=""

# Require DISPATCHER_PID - this hook only works with the wrapper script
if [ -z "${DISPATCHER_PID:-}" ]; then
  echo "ERROR: DISPATCHER_PID environment variable is not set." >&2
  echo "This hook requires the Claude wrapper script (issue launcher)." >&2
  echo "" >&2
  echo "Action required:" >&2
  echo "  - Launch Claude using the issue panel 'Launch Claude' button" >&2
  echo "  - Or use the agent-issue-dispatcher script" >&2
  echo "" >&2
  echo "Direct 'claude' CLI invocation is not supported for issue tracking." >&2
  exit 2
fi

# Check for ISSUE_ID environment variable (set by wrapper)
# If not set, just signal dispatcher and exit
if [ -z "${ISSUE_ID:-}" ]; then
  # Signal dispatcher that Claude is now idle
  if [ "${SESSION_STOP_TEST_MODE:-}" = "1" ]; then
    echo "TEST_MODE: Would send SIGWINCH to dispatcher (idle, no ISSUE_ID)" >&2
  else
    kill -WINCH "$DISPATCHER_PID" 2>/dev/null || true
  fi
  exit 0
fi

# Discover API URL (pass cwd to find the correct workspace API)
BASE_URL=$("${CLAUDE_PLUGIN_ROOT}/bin/discover-api.sh" "$SESSION_CWD" 2>/dev/null) || exit 0

# Clean up session watermark on exit
curl -sf -X DELETE "${BASE_URL}/session/${SESSION_ID}" 2>/dev/null || true

# POST to /session/stop endpoint with dispatcherPid
curl -s --max-time 2 -X POST "${BASE_URL}/session/stop" \
  -H "Content-Type: application/json" \
  -d "{\"sessionId\": \"${SESSION_ID}\", \"dispatcherPid\": ${DISPATCHER_PID}}" \
  > /dev/null 2>&1 || true

# Signal dispatcher that Claude is now idle (finished processing)
# SIGWINCH is ignored by default, safe to send even if dispatcher exited
if [ "${SESSION_STOP_TEST_MODE:-}" = "1" ]; then
  echo "TEST_MODE: Would send SIGWINCH to dispatcher (idle)" >&2
else
  kill -WINCH "$DISPATCHER_PID" 2>/dev/null || true
fi

exit 0
