#!/bin/bash
#
# Stop hook: Reports session completion to API and handles graceful shutdown
#
# Reports new comments and locks to Claude, and signals dispatcher when done.
# Only runs if the issues:api skill was loaded during the session (checked via
# issuesApiLoaded flag in the session state file).
#
# Signals:
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
#   CLAUDE_START_TIME - ISO 8601 timestamp of when the session started (for new comment detection)
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

# Discover API URL (pass cwd to find the correct workspace API)
BASE_URL=$("${CLAUDE_PLUGIN_ROOT}/bin/discover-api.sh" "$SESSION_CWD" 2>/dev/null) || exit 0

# Report any active locks for engaged issues
# Read issue IDs from state file and query locks API for each
ISSUE_IDS=$(jq -r '.issueIds // [] | .[]' "$STATE_FILE" 2>/dev/null) || ISSUE_IDS=""

# Initialize lock report outside if block for set -u compatibility
LOCK_REPORT=""

if [ -n "$ISSUE_IDS" ]; then
  while IFS= read -r ISSUE_ID; do
    [ -z "$ISSUE_ID" ] && continue

    # Query locks API for this issue
    LOCKS_RESPONSE=$(curl -s "${BASE_URL}/locks?issueId=${ISSUE_ID}" 2>/dev/null) || continue

    # Extract locks array (use here-string to handle JSON with newlines in values)
    LOCKS=$(jq '.locks // []' <<< "$LOCKS_RESPONSE" 2>/dev/null) || continue
    LOCKS_COUNT=$(jq 'length' <<< "$LOCKS" 2>/dev/null) || LOCKS_COUNT="0"

    if [ "$LOCKS_COUNT" != "0" ] && [ "$LOCKS_COUNT" != "null" ]; then
      # Add issue header to report
      LOCK_REPORT="${LOCK_REPORT}  Issue ${ISSUE_ID}:\n"

      # Format each lock
      while IFS= read -r LOCK_LINE; do
        LOCK_REPORT="${LOCK_REPORT}${LOCK_LINE}\n"
      done < <(jq -r '.[] | "    - [\(.lockType)] \(.resources | join(", "))\(if .reason then " (\(.reason))" else "" end)"' <<< "$LOCKS" 2>/dev/null)
    fi
  done <<< "$ISSUE_IDS"
fi

# Report any new comments added since session started
# Only if CLAUDE_START_TIME is set (ISO 8601 timestamp from launcher)
COMMENTS_REPORT=""
if [ -n "${CLAUDE_START_TIME:-}" ] && [ -n "$ISSUE_IDS" ]; then
  while IFS= read -r ISSUE_ID; do
    [ -z "$ISSUE_ID" ] && continue

    # URL-encode the timestamp (replace : with %3A, + with %2B)
    ENCODED_TIME=$(echo "$CLAUDE_START_TIME" | sed 's/:/%3A/g; s/+/%2B/g')

    # Query comments API for comments since session started
    COMMENTS_RESPONSE=$(curl -s "${BASE_URL}/issues/${ISSUE_ID}/comments?since=${ENCODED_TIME}" 2>/dev/null) || continue

    # Filter to user comments only (use here-string to handle JSON with newlines in values)
    USER_COMMENTS=$(jq '[.[] | select(.author == "user")]' <<< "$COMMENTS_RESPONSE" 2>/dev/null) || continue
    COMMENTS_COUNT=$(jq 'length' <<< "$USER_COMMENTS" 2>/dev/null) || COMMENTS_COUNT="0"

    if [ "$COMMENTS_COUNT" != "0" ] && [ "$COMMENTS_COUNT" != "null" ]; then
      # Add issue header to report
      COMMENTS_REPORT="${COMMENTS_REPORT}Issue ${ISSUE_ID}:\n"

      # Format each comment (truncate body to first 100 chars)
      while IFS= read -r COMMENT_LINE; do
        COMMENTS_REPORT="${COMMENTS_REPORT}  ${COMMENT_LINE}\n"
      done < <(jq -r '.[] | "- [\(.createdAt)] \(.body | gsub("\n"; " ") | if length > 100 then .[:100] + "..." else . end)"' <<< "$USER_COMMENTS" 2>/dev/null)
    fi
  done <<< "$ISSUE_IDS"
fi

# Build combined report for JSON output
FULL_REPORT=""
if [ -n "$LOCK_REPORT" ]; then
  FULL_REPORT="Active locks for this session:\n${LOCK_REPORT}"
fi
if [ -n "$COMMENTS_REPORT" ]; then
  if [ -n "$FULL_REPORT" ]; then
    FULL_REPORT="${FULL_REPORT}\n"
  fi
  FULL_REPORT="${FULL_REPORT}New comments since session started:\n${COMMENTS_REPORT}"
fi

# Output JSON to stdout if there's a report
# Use "decision": "block" with "reason" to prevent stopping and show Claude the report
# Set "continue": true so Claude can continue working after seeing the message
if [ -n "$FULL_REPORT" ]; then
  # Convert escaped newlines to actual newlines, then use jq to properly escape for JSON
  REASON_TEXT=$(printf '%s' "$(echo -e "$FULL_REPORT")" | jq -Rs '.')
  printf '{"decision": "block", "reason": %s, "continue": true}\n' "$REASON_TEXT"
fi

# POST to /session/stop endpoint
curl -s -X POST "${BASE_URL}/session/stop" \
  -H "Content-Type: application/json" \
  -d "{\"sessionId\": \"${SESSION_ID}\"}" > /dev/null 2>&1 || true

# Signal dispatcher that Claude is now idle (finished processing)
# SIGWINCH is ignored by default, safe to send even if dispatcher exited
# Only send signal if DISPATCHER_PID is set (indicates dispatcher is running)
if [ -n "${DISPATCHER_PID:-}" ]; then
  if [ "${SESSION_STOP_TEST_MODE:-}" = "1" ]; then
    echo "TEST_MODE: Would send SIGWINCH to dispatcher (idle)" >&2
  else
    kill -WINCH "$DISPATCHER_PID" 2>/dev/null || true
  fi
fi

exit 0
