#!/bin/bash
#
# session-resume.sh: Provides issue updates when resuming a Claude session
#
# Fires on SessionStart with source="resume". Calls the session diff endpoint
# to retrieve new comments and field changes since the last session interaction,
# then outputs them as context for Claude.
#
# This replaces the previous lastAgentAttentionAt-based prompt injection by
# using the server-side session watermark tracking.
#
# Input (stdin): JSON with session_id, transcript_path, cwd, hook_event_name, source
# Output: Plain text context about new comments (added to Claude's context)
# Exit codes: 0 = success, 2 = unexpected error
#
# State file: $HOME/.compare-branch/hook-state/${session_id}.json (read-only)
#

set -euo pipefail

# Error handler - outputs to stderr and exits with code 2
error_handler() {
    local line_no=$1
    local error_code=$2
    echo "ERROR in session-resume.sh at line $line_no (exit code: $error_code)" >&2
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

# Check if state file exists
STATE_DIR="$HOME/.compare-branch/hook-state"
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

# Discover API URL
BASE_URL=$("${CLAUDE_PLUGIN_ROOT}/bin/discover-api.sh" "$SESSION_CWD" 2>/dev/null) || exit 0

# Read issue IDs from state file
ISSUE_IDS=$(jq -r '.issueIds // [] | .[]' "$STATE_FILE" 2>/dev/null) || ISSUE_IDS=""

if [ -z "$ISSUE_IDS" ]; then
  # No issues tracked - nothing to do
  exit 0
fi

# Build comma-separated issue IDs
ISSUE_IDS_CSV=$(echo "$ISSUE_IDS" | tr '\n' ',' | sed 's/,$//')

# Call session diff endpoint
DIFF_RESPONSE=$(curl -sf "${BASE_URL}/session/${SESSION_ID}/diff?issueIds=${ISSUE_IDS_CSV}" 2>/dev/null) || {
  # Diff endpoint unavailable - continue silently
  exit 0
}

if [ -z "$DIFF_RESPONSE" ]; then
  exit 0
fi

# Check if there are any new comments or field changes
HAS_UPDATES=false

while IFS= read -r ISSUE_JSON; do
  [ -z "$ISSUE_JSON" ] || [ "$ISSUE_JSON" = "null" ] && continue

  COMMENTS_COUNT=$(echo "$ISSUE_JSON" | jq '.newComments | length')
  CHANGES_COUNT=$(echo "$ISSUE_JSON" | jq '.fieldChanges | length')

  if [ "$COMMENTS_COUNT" -gt 0 ] || [ "$CHANGES_COUNT" -gt 0 ]; then
    HAS_UPDATES=true
    break
  fi
done < <(echo "$DIFF_RESPONSE" | jq -c '.issues[]' 2>/dev/null)

if [ "$HAS_UPDATES" = "false" ]; then
  # No updates - nothing to output
  exit 0
fi

# Format output for Claude's context
echo ""
echo "## Issue Updates Since Last Session"
echo ""

while IFS= read -r ISSUE_JSON; do
  [ -z "$ISSUE_JSON" ] || [ "$ISSUE_JSON" = "null" ] && continue

  ISSUE_ID=$(echo "$ISSUE_JSON" | jq -r '.issueId')
  ISSUE_TITLE=$(echo "$ISSUE_JSON" | jq -r '.issueTitle // "Unknown"')
  ISSUE_STATUS=$(echo "$ISSUE_JSON" | jq -r '.status // "unknown"')
  COMMENTS_JSON=$(echo "$ISSUE_JSON" | jq -r '.newComments // []')
  CHANGES_JSON=$(echo "$ISSUE_JSON" | jq -r '.fieldChanges // []')

  COMMENTS_COUNT=$(echo "$COMMENTS_JSON" | jq 'length')
  CHANGES_COUNT=$(echo "$CHANGES_JSON" | jq 'length')

  if [ "$COMMENTS_COUNT" -gt 0 ] || [ "$CHANGES_COUNT" -gt 0 ]; then
    echo "### ${ISSUE_TITLE} (${ISSUE_ID})"
    echo "Status: ${ISSUE_STATUS}"
    echo ""

    # Output field changes
    if [ "$CHANGES_COUNT" -gt 0 ]; then
      echo "**Field Changes:**"
      while IFS= read -r CHANGE; do
        [ -z "$CHANGE" ] || [ "$CHANGE" = "null" ] && continue
        CHANGE_TYPE=$(echo "$CHANGE" | jq -r '.type // "unknown"')
        FROM_VAL=$(echo "$CHANGE" | jq -r '.from // "N/A"')
        TO_VAL=$(echo "$CHANGE" | jq -r '.to // "N/A"')
        echo "- ${CHANGE_TYPE}: ${FROM_VAL} → ${TO_VAL}"
      done < <(echo "$CHANGES_JSON" | jq -c '.[]')
      echo ""
    fi

    # Output new comments
    if [ "$COMMENTS_COUNT" -gt 0 ]; then
      echo "**New Comments:**"
      while IFS= read -r COMMENT; do
        [ -z "$COMMENT" ] || [ "$COMMENT" = "null" ] && continue
        AUTHOR=$(echo "$COMMENT" | jq -r '.author // "unknown"')
        CREATED_AT=$(echo "$COMMENT" | jq -r '.createdAt // "unknown"')
        BODY=$(echo "$COMMENT" | jq -r '.body // ""')

        echo ""
        echo "> **${AUTHOR}** at ${CREATED_AT}:"
        echo "> ${BODY}"
      done < <(echo "$COMMENTS_JSON" | jq -c '.[]')
      echo ""
    fi
  fi
done < <(echo "$DIFF_RESPONSE" | jq -c '.issues[]' 2>/dev/null)

echo ""
echo "Review the updates above and continue working on the issue(s)."

exit 0
