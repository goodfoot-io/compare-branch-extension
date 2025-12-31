#!/bin/bash
#
# Stop hook: Reports session completion to API and handles graceful shutdown
#
# Reports new comments to Claude, and signals dispatcher when done.
# Only runs if ISSUE_ID environment variable is set (by wrapper script).
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

# Query session diff for the issue
COMMENTS_REPORT=""
if [ -n "$SESSION_ID" ]; then

  # Single GET request for the issue via diff endpoint
  DIFF_RESPONSE=$(curl -sf "${BASE_URL}/session/${SESSION_ID}/diff?issueIds=${ISSUE_ID}" 2>/dev/null) || {
    echo "Warning: diff endpoint unavailable, skipping comment report" >&2
    DIFF_RESPONSE=""
  }

  if [ -n "$DIFF_RESPONSE" ]; then
    # Extract and format comments from response
    while IFS= read -r ISSUE_JSON; do
      [ -z "$ISSUE_JSON" ] || [ "$ISSUE_JSON" = "null" ] && continue

      ISSUE_ID=$(echo "$ISSUE_JSON" | jq -r '.issueId')
      ISSUE_TITLE=$(echo "$ISSUE_JSON" | jq -r '.issueTitle // "Unknown"')
      COMMENTS_JSON=$(echo "$ISSUE_JSON" | jq -r '.newComments // []')
      COMMENTS_COUNT=$(echo "$COMMENTS_JSON" | jq 'length')

      if [ "$COMMENTS_COUNT" -gt 0 ]; then
        COMMENTS_REPORT+="\n## Issue: ${ISSUE_TITLE} (${ISSUE_ID})\n"
        while IFS= read -r COMMENT; do
          [ -z "$COMMENT" ] || [ "$COMMENT" = "null" ] && continue
          CREATED_AT=$(echo "$COMMENT" | jq -r '.createdAt // "unknown"')
          BODY=$(echo "$COMMENT" | jq -r '.body // ""' | head -c 100)
          COMMENTS_REPORT+="[${CREATED_AT}] ${BODY}\n"
        done < <(echo "$COMMENTS_JSON" | jq -c '.[]')
      fi
    done < <(echo "$DIFF_RESPONSE" | jq -c '.issues[]')
  fi

  # Clean up session watermark on exit
  curl -sf -X DELETE "${BASE_URL}/session/${SESSION_ID}" 2>/dev/null || true
fi

# Build report for JSON output
FULL_REPORT=""
if [ -n "$COMMENTS_REPORT" ]; then
  FULL_REPORT="New comments since session started:\n${COMMENTS_REPORT}"
fi

# Output JSON to stdout if there's a report
# Use "decision": "block" with "reason" to prevent stopping and show Claude the report
# Set "continue": true so Claude can continue working after seeing the message
if [ -n "$FULL_REPORT" ]; then
  # Convert escaped newlines to actual newlines, then use jq to properly escape for JSON
  REASON_TEXT=$(printf '%s' "$(echo -e "$FULL_REPORT")" | jq -Rs '.')
  printf '{"decision": "block", "reason": %s, "continue": true}\n' "$REASON_TEXT"
fi

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
