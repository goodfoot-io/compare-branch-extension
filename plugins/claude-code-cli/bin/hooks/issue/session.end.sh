#!/bin/bash
#
# hooks/issue/session.end.sh: Cleans up session watermark on shutdown
#
# Cleans up session watermark when Claude's session ends.
# Note: SessionEnd hooks cannot inject context - use SessionStart for that.
#
# Triggered by: SessionEnd hook
#
# Input (stdin): JSON with session_id, transcript_path, cwd, hook_event_name
# Output: None
# Exit codes: 0 = success, 2 = unexpected error
#
# Environment variables:
#   ISSUE_ID - Issue ID being worked on (required, e.g., "main:123")
#

set -euo pipefail

# Error handler - outputs to stderr and exits with code 2
error_handler() {
    local line_no=$1
    local error_code=$2
    echo "ERROR in session.end.sh at line $line_no (exit code: $error_code)" >&2
    echo "Please report this issue at: https://github.com/goodfoot-io/compare-branch-extension/issues" >&2
    echo "Include the error details above and steps to reproduce." >&2
    exit 2
}

trap 'error_handler ${LINENO} $?' ERR

# Source shared libraries
source "${CLAUDE_PLUGIN_ROOT}/bin/lib/api.sh"

# Read input from stdin
INPUT=$(cat)

# Extract session_id from input
SESSION_ID=$(echo "$INPUT" | jq -r '.session_id // empty') || SESSION_ID=""
if [ -z "$SESSION_ID" ]; then
    exit 0
fi

# Require ISSUE_ID - nothing to clean up without it
if [ -z "${ISSUE_ID:-}" ]; then
    exit 0
fi

# Discover API URL
if ! BASE_URL=$(discover_api_url 2>&1); then
    exit 1  # Non-blocking, shows in verbose mode
fi

# Clean up session watermark on exit
if ! delete_session_watermark "$SESSION_ID" "$BASE_URL"; then
    echo "Warning: Failed to notify extension of session end" >&2
fi

exit 0
