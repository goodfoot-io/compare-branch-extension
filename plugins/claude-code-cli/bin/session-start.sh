#!/bin/bash
#
# session-start.sh: Posts sessionId comment on new sessions for session resumption
#
# Fires on SessionStart hook. Posts a sessionId comment to the issue to enable
# session resumption on subsequent launches. Only posts for new sessions (not resume).
#
# Input (stdin): JSON with session_id, cwd, source
# Output: None on success, error details to stderr on failure
# Exit codes: 0 = success
#
# Environment variables:
#   ISSUE_ID - Issue ID being worked on (set by wrapper, e.g., "main:123")
#   SESSION_START_TEST_MODE - If set to "1", skips actual API calls (for testing)
#

set -euo pipefail

# Read input from stdin
INPUT=$(cat)

# Extract session_id from input
SESSION_ID=$(echo "$INPUT" | jq -r '.session_id // empty') || SESSION_ID=""
if [ -z "$SESSION_ID" ]; then
  exit 0
fi

# Extract cwd for API discovery
CWD=$(echo "$INPUT" | jq -r '.cwd // empty') || CWD=""
if [ -z "$CWD" ]; then
  exit 0
fi

# Require ISSUE_ID environment variable (set by wrapper)
if [ -z "${ISSUE_ID:-}" ]; then
  exit 0
fi

# Extract source from input
SOURCE=$(echo "$INPUT" | jq -r '.source // empty') || SOURCE=""

# Only post sessionId comment for new sessions (not resume)
# Resume already has a sessionId from the previous session
if [ "$SOURCE" = "resume" ]; then
  exit 0
fi

# Post sessionId comment to enable session resumption
if [ "${SESSION_START_TEST_MODE:-}" = "1" ]; then
  echo "TEST_MODE: Would POST sessionId comment to /issues/${ISSUE_ID}/comments (session=$SESSION_ID, source=$SOURCE)" >&2
else
  if ! BASE_URL=$("${CLAUDE_PLUGIN_ROOT}/bin/discover-workspace-api.sh" 2>&1); then
    echo "Warning: Issue tracking unavailable - VSCode extension not running or workspace not registered" >&2
    echo "Ensure VSCode is running with the Compare Branch extension active in this workspace." >&2
    exit 1  # Non-blocking, shows in verbose mode
  fi
  if [ -n "$BASE_URL" ]; then
    if ! curl -s --max-time 2 -X POST "${BASE_URL}/issues/${ISSUE_ID}/comments" \
        -H "Content-Type: application/json" \
        -d "{\"sessionId\": \"${SESSION_ID}\", \"author\": \"agent\"}" \
        > /dev/null 2>&1; then
      echo "Warning: Failed to register session with issue tracker" >&2
    fi
  fi
fi

exit 0
