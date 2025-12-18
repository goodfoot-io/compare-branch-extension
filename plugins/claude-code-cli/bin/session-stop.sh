#!/bin/bash
#
# Stop hook: Reports session completion to API and handles graceful shutdown
#
# Only runs if DISPATCHER_PID env var is set (indicates dispatcher is running)
# and if the issues:api skill was loaded during the session (checked via
# issuesApiLoaded flag in the session state file).
#
# Signals:
# - If issues need attention: sends SIGTERM to Claude for graceful shutdown
# - Always sends SIGWINCH to dispatcher to indicate Claude is now idle
#
# Input (stdin): JSON with session_id, transcript_path, cwd, hook_event_name
# Output: None
# Exit codes: 0 = success, 2 = unexpected error
#
# State file: $HOME/.claude/hook-state/${session_id}.json (read-only)
#
# Environment variables:
#   DISPATCHER_PID - PID of dispatcher for sending idle signal (set by dispatcher)
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

# Find claude process in the parent hierarchy (adapted from complete-iteration)
find_claude_pid() {
    local current_pid=$1
    local max_depth=10
    local depth=0

    while [[ $depth -lt $max_depth && $current_pid -gt 1 ]]; do
        # Check if current PID is claude
        if ps -p "$current_pid" -o comm= 2>/dev/null | grep -q "^claude$"; then
            echo "$current_pid"
            return 0
        fi

        # Get parent PID
        current_pid=$(ps -p "$current_pid" -o ppid= 2>/dev/null | tr -d ' ')
        ((depth++)) || true
    done

    return 1
}

# Read input from stdin
INPUT=$(cat)

# Extract session_id from input
SESSION_ID=$(echo "$INPUT" | jq -r '.session_id // empty') || SESSION_ID=""
if [ -z "$SESSION_ID" ]; then
  exit 0
fi

# Check if state file exists
STATE_DIR="$HOME/.claude/hook-state"
STATE_FILE="$STATE_DIR/${SESSION_ID}.json"

if [ ! -f "$STATE_FILE" ]; then
  # No state file means issues:api was never loaded - nothing to do
  exit 0
fi

# Read state file and check if issuesApiLoaded is true
ISSUES_API_LOADED=$(jq -r '.issuesApiLoaded // false' "$STATE_FILE" 2>/dev/null) || ISSUES_API_LOADED="false"
if [ "$ISSUES_API_LOADED" != "true" ]; then
  # issues:api was not loaded during this session - nothing to do
  exit 0
fi

# Only runs if DISPATCHER_PID env var is set (indicates dispatcher is running)
if [ -z "${DISPATCHER_PID:-}" ]; then
  exit 0
fi

# Discover API URL
BASE_URL=$("${CLAUDE_PLUGIN_ROOT}/bin/discover-api.sh" 2>/dev/null) || exit 0

# Report any active locks for engaged issues
# Read issue IDs from state file and query locks API for each
ISSUE_IDS=$(jq -r '.issueIds // [] | .[]' "$STATE_FILE" 2>/dev/null) || ISSUE_IDS=""

if [ -n "$ISSUE_IDS" ]; then
  LOCK_REPORT=""

  while IFS= read -r ISSUE_ID; do
    [ -z "$ISSUE_ID" ] && continue

    # Query locks API for this issue
    LOCKS_RESPONSE=$(curl -s "${BASE_URL}/locks?issueId=${ISSUE_ID}" 2>/dev/null) || continue

    # Extract locks array
    LOCKS=$(echo "$LOCKS_RESPONSE" | jq -r '.locks // []' 2>/dev/null) || continue
    LOCKS_COUNT=$(echo "$LOCKS" | jq -r 'length' 2>/dev/null) || LOCKS_COUNT="0"

    if [ "$LOCKS_COUNT" != "0" ] && [ "$LOCKS_COUNT" != "null" ]; then
      # Add issue header to report
      LOCK_REPORT="${LOCK_REPORT}  Issue ${ISSUE_ID}:\n"

      # Format each lock
      while IFS= read -r LOCK_LINE; do
        LOCK_REPORT="${LOCK_REPORT}${LOCK_LINE}\n"
      done < <(echo "$LOCKS" | jq -r '.[] | "    - [\(.lockType)] \(.resources | join(", "))\(if .reason then " (\(.reason))" else "" end)"' 2>/dev/null)
    fi
  done <<< "$ISSUE_IDS"

  # Output lock report to stderr if there are any locks
  if [ -n "$LOCK_REPORT" ]; then
    echo -e "[session-stop] Active locks for this session:" >&2
    echo -e "$LOCK_REPORT" >&2
  fi
fi

# POST to /session/stop endpoint
curl -s -X POST "${BASE_URL}/session/stop" \
  -H "Content-Type: application/json" \
  -d "{\"sessionId\": \"${SESSION_ID}\"}" > /dev/null 2>&1 || true

# Check if there are issues needing agent attention
ISSUES_RESPONSE=$(curl -s "${BASE_URL}/issues" 2>/dev/null) || ISSUES_RESPONSE=""

if [ -n "$ISSUES_RESPONSE" ]; then
  # Extract count of issues needing agent attention from the summary
  NEEDS_ATTENTION=$(echo "$ISSUES_RESPONSE" | jq -r '.summary.needingAgentAttention // 0' 2>/dev/null) || NEEDS_ATTENTION="0"

  if [ "$NEEDS_ATTENTION" != "0" ] && [ "$NEEDS_ATTENTION" != "null" ]; then
    # There are issues needing agent attention - send graceful shutdown signal
    if [ "${SESSION_STOP_TEST_MODE:-}" = "1" ]; then
      echo "TEST_MODE: Would send SIGTERM (needingAgentAttention=$NEEDS_ATTENTION)" >&2
    elif CLAUDE_PID=$(find_claude_pid $$); then
      # Send SIGTERM for graceful shutdown
      kill -TERM "$CLAUDE_PID" 2>/dev/null || true
    fi
  fi
fi

# Always signal dispatcher that Claude is now idle (finished processing)
# SIGWINCH is ignored by default, safe to send even if dispatcher exited
if [ "${SESSION_STOP_TEST_MODE:-}" = "1" ]; then
  echo "TEST_MODE: Would send SIGWINCH to dispatcher (idle)" >&2
else
  kill -WINCH "$DISPATCHER_PID" 2>/dev/null || true
fi

exit 0
