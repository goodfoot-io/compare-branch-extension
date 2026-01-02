#!/bin/bash
#
# hooks/issue/context.resume.sh: Provides issue updates when resuming a Claude session
#
# Fires on SessionStart with source="resume". Calls the session diff endpoint
# to retrieve new comments and field changes since the last session interaction,
# then outputs them as context for Claude.
#
# Triggered by: SessionStart (matcher: resume)
#
# Input (stdin): JSON with session_id, transcript_path, cwd, hook_event_name, source
# Output: JSON with systemMessage and hookSpecificOutput containing diff data
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
    echo "ERROR in context.resume.sh at line $line_no (exit code: $error_code)" >&2
    echo "Please report this issue at: https://github.com/goodfoot-io/compare-branch-extension/issues" >&2
    echo "Include the error details above and steps to reproduce." >&2
    exit 2
}

trap 'error_handler ${LINENO} $?' ERR

# Source shared libraries
source "${CLAUDE_PLUGIN_ROOT}/bin/lib/api.sh"
source "${CLAUDE_PLUGIN_ROOT}/bin/lib/output.sh"

# Read input from stdin
INPUT=$(cat)

# Extract session_id from input
SESSION_ID=$(echo "$INPUT" | jq -r '.session_id // empty') || SESSION_ID=""
if [ -z "$SESSION_ID" ]; then
    exit 0
fi

# Require ISSUE_ID environment variable (set by wrapper)
if [ -z "${ISSUE_ID:-}" ]; then
    error_missing_issue_id
fi

# Discover API URL
if ! BASE_URL=$(discover_api_url 2>&1); then
    exit 1  # Non-blocking, shows in verbose mode
fi

# Call session diff endpoint with ISSUE_ID from environment
DIFF_RESPONSE=$(fetch_issue_diff "$SESSION_ID" "$ISSUE_ID" "$BASE_URL") || {
    # Diff endpoint unavailable - continue silently
    exit 0
}

if [ -z "$DIFF_RESPONSE" ]; then
    exit 0
fi

# Check if any issue has new comments or field changes
HAS_UPDATES=$(has_updates "$DIFF_RESPONSE")

if [ "$HAS_UPDATES" != "true" ]; then
    exit 0
fi

# Build human-readable systemMessage from diff response
SYSTEM_MSG=$(build_update_summary "$DIFF_RESPONSE")

# Output DIFF_RESPONSE as JSON for SessionStart hook with systemMessage
output_context "SessionStart" "$DIFF_RESPONSE" "$SYSTEM_MSG"

exit 0
