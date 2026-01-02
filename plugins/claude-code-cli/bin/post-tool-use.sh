#!/bin/bash
#
# post-tool-use.sh: Checks for new issue updates after each tool use
#
# Fires on PostToolUse. Calls the session diff endpoint to check for
# any new comments or field changes made by the user during the agent's
# tool execution. Outputs context so Claude is aware of concurrent updates.
#
# This hook enables agents to stay in sync with user changes that occur
# while the agent is working, particularly useful for long-running operations.
#
# Input (stdin): JSON with session_id, tool_name, tool_input, tool_result, etc.
# Output: JSON with additionalContext if updates found, empty otherwise
# Exit codes: 0 = success, 2 = unexpected error
#
# Environment variables:
#   ISSUE_ID - Issue ID being worked on (set by wrapper, e.g., "main:123")
#

set -euo pipefail

# Error handler - outputs to stderr and exits with code 2
error_handler() {
    local line_no=$1
    local error_code=$2
    echo "ERROR in post-tool-use.sh at line $line_no (exit code: $error_code)" >&2
    echo "Please report this issue at: https://github.com/goodfoot-io/compare-branch-extension/issues" >&2
    echo "Include the error details above and steps to reproduce." >&2
    exit 2
}

trap 'error_handler ${LINENO} $?' ERR

# Read input from stdin
INPUT=$(cat)

# Extract session_id from input
SESSION_ID=$(echo "$INPUT" | jq -r '.session_id // empty') || SESSION_ID=""
if [ -z "$SESSION_ID" ]; then
  exit 0
fi

# Require ISSUE_ID environment variable (set by wrapper)
if [ -z "${ISSUE_ID:-}" ]; then
  exit 0
fi

# Discover API URL
BASE_URL=$("${CLAUDE_PLUGIN_ROOT}/bin/discover-workspace-api.sh" 2>/dev/null) || exit 0

# Call session diff endpoint with ISSUE_ID from environment
DIFF_RESPONSE=$(curl -sf "${BASE_URL}/session/${SESSION_ID}/diff?issueIds=${ISSUE_ID}" 2>/dev/null) || {
  # Diff endpoint unavailable - continue silently
  exit 0
}

if [ -z "$DIFF_RESPONSE" ]; then
  exit 0
fi

# Check if any issue has new comments or field changes from users
# Only report user-initiated changes (agent already knows its own changes)
HAS_USER_UPDATES=$(echo "$DIFF_RESPONSE" | jq '[.issues[] | select(
  (.newComments | map(select(.author == "user")) | length > 0) or
  (.fieldChanges | length > 0)
)] | length > 0')

if [ "$HAS_USER_UPDATES" != "true" ]; then
  exit 0
fi

# Count user comments and field changes
USER_COMMENT_COUNT=$(echo "$DIFF_RESPONSE" | jq '[.issues[].newComments[] | select(.author == "user")] | length')
CHANGE_COUNT=$(echo "$DIFF_RESPONSE" | jq '[.issues[].fieldChanges | length] | add // 0')

# Build message parts
PARTS=""
if [ "$USER_COMMENT_COUNT" -gt 0 ]; then
  if [ "$USER_COMMENT_COUNT" -eq 1 ]; then
    PARTS="1 new user comment"
  else
    PARTS="${USER_COMMENT_COUNT} new user comments"
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

# Build system message
ISSUE_TITLE=$(echo "$DIFF_RESPONSE" | jq -r '.issues[0].issueTitle // "unknown"')
SYSTEM_MSG="User activity detected: ${PARTS} on \"${ISSUE_TITLE}\". Review the additionalContext for details."

# Output as JSON for PostToolUse hook
jq -nc --arg ctx "$DIFF_RESPONSE" --arg sysMsg "$SYSTEM_MSG" '{
  systemMessage: $sysMsg,
  hookSpecificOutput: {
    hookEventName: "PostToolUse",
    additionalContext: $ctx
  }
}'

exit 0
