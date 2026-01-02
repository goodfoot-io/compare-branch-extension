#!/bin/bash
#
# hooks/issue/context.stop.sh: Injects issue updates when Claude is about to stop
#
# Checks for new comments/changes on the issue and blocks stopping if there
# are updates, providing the diff as context for Claude to continue working.
# When allowing stop, signals the dispatcher via dispatcher.idle.sh.
#
# Triggered by: Stop hook
#
# Input (stdin): JSON with session_id, transcript_path, cwd, hook_event_name
# Output: JSON with decision and systemMessage (allow or block)
# Exit codes: 0 = success, 2 = unexpected error
#
# Environment variables:
#   ISSUE_ID             - Issue ID being worked on (required, e.g., "main:123")
#   DISPATCHER_PID       - PID of dispatcher for session tracking
#   SESSION_STOP_TEST_MODE - If "1", skips sending signals (for testing)
#

set -euo pipefail

# Error handler - outputs to stderr and exits with code 2
error_handler() {
    local line_no=$1
    local error_code=$2
    echo "ERROR in context.stop.sh at line $line_no (exit code: $error_code)" >&2
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
    # No updates - Claude will stop. Signal dispatcher that we're going idle.
    echo "$INPUT" | "${CLAUDE_PLUGIN_ROOT}/bin/hooks/ipc/dispatcher.idle.sh" > /dev/null
    # Output allow decision with systemMessage
    output_stop_allow "Stop allowed: No pending issue updates"
    exit 0
fi

# Build human-readable systemMessage from diff response
SYSTEM_MSG=$(build_update_summary "$DIFF_RESPONSE")

# Block stopping and provide diff as reason with systemMessage
output_block_decision "$DIFF_RESPONSE" "$SYSTEM_MSG"

exit 0
