#!/bin/bash
#
# hooks/issue/context.startup.sh: Injects issue data when starting a new Claude session
#
# Fires on SessionStart with source="startup". Calls the session diff endpoint
# to register a watermark and retrieve the full issue data, then outputs it
# as context for Claude via hookSpecificOutput.additionalContext.
#
# Triggered by: SessionStart (matcher: startup)
#
# Input (stdin): JSON with session_id, transcript_path, cwd, hook_event_name, source
# Output: JSON with systemMessage and hookSpecificOutput containing full issue
# Exit codes: 0 = success (including graceful failures)
#
# Environment variables:
#   ISSUE_ID                      - Issue ID being worked on (required, e.g., "main:123")
#   SESSION_STARTUP_TEST_MODE     - If "1", outputs test info instead of calling API
#

set -euo pipefail

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

# Test mode handling
if [ "${SESSION_STARTUP_TEST_MODE:-}" = "1" ]; then
    # Output test info via stderr for verification
    echo "TEST_MODE: Would call session diff endpoint for session=$SESSION_ID, issue=$ISSUE_ID" >&2
    # Output a mock response in the expected format
    MOCK_ISSUE='{"id":"'$ISSUE_ID'","title":"Test Issue","status":"in_progress"}'
    output_context "SessionStart" "$MOCK_ISSUE" "Session starting: Issue $ISSUE_ID loaded"
    exit 0
fi

# Discover API URL
if ! BASE_URL=$(discover_api_url 2>&1); then
    exit 1  # Non-blocking, shows in verbose mode
fi

# Call session diff endpoint with ISSUE_ID from environment
# The endpoint returns fullIssue when isNewSession: true (no watermark exists)
DIFF_RESPONSE=$(fetch_issue_diff "$SESSION_ID" "$ISSUE_ID" "$BASE_URL") || {
    # Diff endpoint unavailable - continue silently
    exit 0
}

if [ -z "$DIFF_RESPONSE" ]; then
    exit 0
fi

# Extract fullIssue from the response (only present for new sessions)
FULL_ISSUE=$(echo "$DIFF_RESPONSE" | jq -c '.issues[0].fullIssue // empty') || FULL_ISSUE=""

if [ -z "$FULL_ISSUE" ] || [ "$FULL_ISSUE" = "null" ]; then
    # No fullIssue means this isn't a new session or the issue wasn't found
    exit 0
fi

# Extract issue title for the system message
ISSUE_TITLE=$(echo "$FULL_ISSUE" | jq -r '.title // "unknown"')

# Build system message and output
SYSTEM_MSG="Session starting: Issue \"${ISSUE_TITLE}\" loaded"
output_context "SessionStart" "$FULL_ISSUE" "$SYSTEM_MSG"

exit 0
