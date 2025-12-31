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

# Extract cwd for API discovery
SESSION_CWD=$(echo "$INPUT" | jq -r '.cwd // empty') || SESSION_CWD=""

# Require ISSUE_ID environment variable (set by wrapper)
if [ -z "${ISSUE_ID:-}" ]; then
  exit 0
fi

# Discover API URL
BASE_URL=$("${CLAUDE_PLUGIN_ROOT}/bin/discover-api.sh" "$SESSION_CWD" 2>/dev/null) || exit 0

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
  exit 0
fi

# Block stopping and provide diff as reason
jq -nc --arg reason "$DIFF_RESPONSE" '{"decision":"block","reason":$reason}'

exit 0
