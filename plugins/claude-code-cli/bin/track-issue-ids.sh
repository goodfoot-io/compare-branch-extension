#!/bin/bash
#
# PostToolUse hook: Tracks issue IDs accessed via API URLs in Bash commands
#
# Detects when issue API endpoints are accessed and records the issue IDs
# in session state. Posts sessionId as a comment on newly discovered issues.
#
# Input (stdin): JSON with session_id, cwd, tool_name, tool_input.command
# Output: None on success, error details to stderr on failure
# Exit codes: 0 = success, 2 = unexpected error
#
# State file: $HOME/.claude/hook-state/${session_id}.json
# Format: {"issuesApiLoaded": true, "issueIds": [...]}
#

set -euo pipefail

# Error handler - outputs to stderr and exits with code 2
error_handler() {
    local line_no=$1
    local error_code=$2
    echo "ERROR in track-issue-ids.sh at line $line_no (exit code: $error_code)" >&2
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

# Check if tool_name is "Bash"
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // empty') || TOOL_NAME=""
if [ "$TOOL_NAME" != "Bash" ]; then
  exit 0
fi

# Extract command from tool_input
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty') || COMMAND=""
if [ -z "$COMMAND" ]; then
  exit 0
fi

# Extract issue IDs from command using regex
# Pattern: /api/v1/issues/[ISSUE_ID] where ISSUE_ID format is {branch-slug}:{number}
# Must NOT match sub-paths like /api/v1/issues/main:1/comments
# We match /api/v1/issues/ followed by the issue ID, then ensure it's either end of string or not followed by /
ISSUE_IDS=$(echo "$COMMAND" | grep -oE '/api/v1/issues/[a-z0-9:-]+' | sed 's|/api/v1/issues/||g' | sort -u) || ISSUE_IDS=""

if [ -z "$ISSUE_IDS" ]; then
  exit 0
fi

# Discover API URL (pass cwd to find the correct workspace API)
BASE_URL=$("${CLAUDE_PLUGIN_ROOT}/bin/discover-api.sh" "$SESSION_CWD" 2>/dev/null) || exit 0

# Setup state directory and file
STATE_DIR="$HOME/.claude/hook-state"
STATE_FILE="$STATE_DIR/${SESSION_ID}.json"

# Create state directory if it doesn't exist
mkdir -p "$STATE_DIR"

# Use flock for atomic state file access
(
  flock -x 200

  # Read current state or initialize
  if [ -f "$STATE_FILE" ]; then
    CURRENT_STATE=$(cat "$STATE_FILE")
    EXISTING_IDS=$(echo "$CURRENT_STATE" | jq -c '.issueIds // []')
    ISSUES_API_LOADED=$(echo "$CURRENT_STATE" | jq -r '.issuesApiLoaded // false')
  else
    EXISTING_IDS='[]'
    ISSUES_API_LOADED='false'
  fi

  # Process each issue ID
  NEW_IDS="$EXISTING_IDS"
  for ISSUE_ID in $ISSUE_IDS; do
    # Check if issue ID already tracked
    IS_TRACKED=$(echo "$EXISTING_IDS" | jq --arg id "$ISSUE_ID" 'any(. == $id)')

    if [ "$IS_TRACKED" = "false" ]; then
      # Post sessionId comment to the issue
      curl -s -X POST "${BASE_URL}/issues/${ISSUE_ID}/comments" \
        -H "Content-Type: application/json" \
        -d "{\"sessionId\": \"${SESSION_ID}\", \"author\": \"agent\"}" > /dev/null 2>&1 || true

      # Add issue ID to the list
      NEW_IDS=$(echo "$NEW_IDS" | jq --arg id "$ISSUE_ID" '. + [$id]')
    fi
  done

  # Create new state
  NEW_STATE=$(jq -n --argjson issueIds "$NEW_IDS" --argjson loaded "$ISSUES_API_LOADED" \
    '{issuesApiLoaded: $loaded, issueIds: $issueIds}')

  # Write updated state
  echo "$NEW_STATE" > "$STATE_FILE"

) 200>"$STATE_FILE.lock"

exit 0
