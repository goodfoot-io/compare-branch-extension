#!/bin/bash
#
# hooks/issue/session.start.sh: Posts sessionId comment on new sessions
#
# Fires on SessionStart hook. Posts a sessionId comment to the issue to enable
# session resumption on subsequent launches. Only posts for new sessions (not resume).
#
# Triggered by: SessionStart (all, but skips on resume)
#
# Input (stdin): JSON with session_id, cwd, source
# Output: None on success
# Exit codes: 0 = success
#
# Environment variables:
#   ISSUE_ID                  - Issue ID being worked on (required, e.g., "main:123")
#   SESSION_START_TEST_MODE   - If "1", skips actual API calls (for testing)
#

set -euo pipefail

# Source shared libraries
source "${CLAUDE_PLUGIN_ROOT}/bin/lib/api.sh"

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
    if ! BASE_URL=$(discover_api_url 2>&1); then
        exit 1  # Non-blocking, shows in verbose mode
    fi
    if [ -n "$BASE_URL" ]; then
        if ! post_session_comment "$ISSUE_ID" "$SESSION_ID" "$BASE_URL"; then
            echo "Warning: Failed to register session with issue tracker" >&2
        fi
    fi
fi

exit 0
