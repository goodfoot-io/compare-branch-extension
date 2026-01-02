#!/bin/bash
#
# Stop hook: Injects issue updates when Claude is about to stop
#
# Checks for new comments/changes on the issue and blocks stopping if there
# are updates, providing the diff as context for Claude to continue working.
#
# Input (stdin): JSON with session_id, transcript_path, cwd, hook_event_name
# Output: JSON with decision/reason if updates exist
# Exit codes: 0 = success, 2 = unexpected error
#
# Environment variables:
#   ISSUE_ID - Issue ID being worked on (set by wrapper, e.g., "main:123")
#   DISPATCHER_PID - PID of dispatcher for session tracking (set by wrapper)
#   SESSION_STOP_TEST_MODE - If set to "1", skips sending signals (for testing)
#

set -euo pipefail

# Error handler - outputs to stderr and exits with code 2
error_handler() {
    local line_no=$1
    local error_code=$2
    echo "ERROR in stop.sh at line $line_no (exit code: $error_code)" >&2
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

# Require ISSUE_ID environment variable (set by wrapper)
if [ -z "${ISSUE_ID:-}" ]; then
  exit 0
fi

# Discover API URL
if ! BASE_URL=$("${CLAUDE_PLUGIN_ROOT}/bin/discover-workspace-api.sh" 2>&1); then
  echo "Warning: Issue tracking unavailable - VSCode extension not running or workspace not registered" >&2
  echo "Ensure VSCode is running with the Compare Branch extension active in this workspace." >&2
  exit 1  # Non-blocking, shows in verbose mode
fi

# Call session diff endpoint with ISSUE_ID from environment
DIFF_RESPONSE=$(curl -sf "${BASE_URL}/session/${SESSION_ID}/diff?issueIds=${ISSUE_ID}" 2>/dev/null) || {
  # Diff endpoint unavailable - continue silently
  exit 0
}

if [ -z "$DIFF_RESPONSE" ]; then
  exit 0
fi

# Check if any issue has new comments or field changes
HAS_UPDATES=$(echo "$DIFF_RESPONSE" | jq '[.issues[] | select((.newComments | length > 0) or (.fieldChanges | length > 0))] | length > 0')

if [ "$HAS_UPDATES" != "true" ]; then
  # No updates - Claude will stop. Notify extension to update issue status.
  if [ -n "${DISPATCHER_PID:-}" ]; then
    # Non-critical: UI may show stale session status, but Claude will stop correctly
    if ! curl -sf --max-time 2 -X POST "${BASE_URL}/session/stop" \
      -H "Content-Type: application/json" \
      -d "{\"sessionId\": \"${SESSION_ID}\", \"dispatcherPid\": ${DISPATCHER_PID}}" \
      > /dev/null 2>&1; then
      echo "Warning: Failed to notify extension of session stop" >&2
      echo "Session status in the issue panel may appear stale." >&2
    fi

    # Signal dispatcher that Claude is now idle
    # SIGWINCH is ignored by default, safe to send even if dispatcher exited
    if [ "${SESSION_STOP_TEST_MODE:-}" = "1" ]; then
      echo "TEST_MODE: Would send SIGWINCH to dispatcher (idle)" >&2
    else
      # Signal failure is expected if dispatcher exited during the call
      if ! kill -WINCH "$DISPATCHER_PID" 2>/dev/null; then
        echo "Warning: Could not signal dispatcher idle state (PID=$DISPATCHER_PID may have exited)" >&2
      fi
    fi
  fi
  exit 0
fi

# Build human-readable systemMessage from diff response
# Count new comments and field changes across all issues
COMMENT_COUNT=$(echo "$DIFF_RESPONSE" | jq '[.issues[].newComments | length] | add // 0')
CHANGE_COUNT=$(echo "$DIFF_RESPONSE" | jq '[.issues[].fieldChanges | length] | add // 0')
ISSUE_COUNT=$(echo "$DIFF_RESPONSE" | jq '[.issues[] | select((.newComments | length > 0) or (.fieldChanges | length > 0))] | length')

# Build message parts
PARTS=""
if [ "$COMMENT_COUNT" -gt 0 ]; then
  if [ "$COMMENT_COUNT" -eq 1 ]; then
    PARTS="1 new comment"
  else
    PARTS="${COMMENT_COUNT} new comments"
  fi
fi

if [ "$CHANGE_COUNT" -gt 0 ]; then
  CHANGE_MSG=""
  if [ "$CHANGE_COUNT" -eq 1 ]; then
    CHANGE_MSG="1 field change"
  else
    CHANGE_MSG="${CHANGE_COUNT} field changes"
  fi
  if [ -n "$PARTS" ]; then
    PARTS="${PARTS} and ${CHANGE_MSG}"
  else
    PARTS="${CHANGE_MSG}"
  fi
fi

# Add issue context
if [ "$ISSUE_COUNT" -eq 1 ]; then
  ISSUE_TITLE=$(echo "$DIFF_RESPONSE" | jq -r '.issues[0].issueTitle // "unknown"')
  SYSTEM_MSG="Issue updated: ${PARTS} on \"${ISSUE_TITLE}\""
else
  SYSTEM_MSG="Issues updated: ${PARTS} across ${ISSUE_COUNT} issues"
fi

# Block stopping and provide diff as reason with systemMessage
jq -nc --arg reason "$DIFF_RESPONSE" --arg sysMsg "$SYSTEM_MSG" '{
  decision: "block",
  reason: $reason,
  systemMessage: $sysMsg
}'

exit 0
