#!/bin/bash
#
# session-startup.sh: Injects issue data when starting a new Claude session
#
# Fires on SessionStart with source="startup". Calls the session diff endpoint
# to register a watermark and retrieve the full issue data, then outputs it
# as context for Claude via hookSpecificOutput.additionalContext.
#
# This replaces the previous ISSUE_JSON environment variable injection by
# using the server-side session diff endpoint which returns fullIssue when
# no watermark exists (isNewSession: true).
#
# Input (stdin): JSON with session_id, transcript_path, cwd, hook_event_name, source
# Output: JSON with systemMessage and hookSpecificOutput containing full issue
# Exit codes: 0 = success (including graceful failures)
#
# Environment variables:
#   ISSUE_ID - Issue ID being worked on (set by wrapper, e.g., "main:123")
#   SESSION_STARTUP_TEST_MODE - If set to "1", outputs test info instead of calling API
#

set -euo pipefail

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

# Test mode handling
if [ "${SESSION_STARTUP_TEST_MODE:-}" = "1" ]; then
  # Output test info via stderr for verification
  echo "TEST_MODE: Would call session diff endpoint for session=$SESSION_ID, issue=$ISSUE_ID" >&2
  # Output a mock response in the expected format
  MOCK_ISSUE='{"id":"'$ISSUE_ID'","title":"Test Issue","status":"in_progress"}'
  jq -nc --arg issue "$MOCK_ISSUE" --arg sysMsg "Session starting: Issue $ISSUE_ID loaded" '{
    systemMessage: $sysMsg,
    hookSpecificOutput: {
      hookEventName: "SessionStart",
      additionalContext: $issue
    }
  }'
  exit 0
fi

# Discover API URL
if ! BASE_URL=$("${CLAUDE_PLUGIN_ROOT}/bin/discover-workspace-api.sh" 2>&1); then
  echo "Warning: Issue tracking unavailable - VSCode extension not running or workspace not registered" >&2
  echo "Ensure VSCode is running with the Compare Branch extension active in this workspace." >&2
  exit 1  # Non-blocking, shows in verbose mode
fi

# Call session diff endpoint with ISSUE_ID from environment
# The endpoint returns fullIssue when isNewSession: true (no watermark exists)
DIFF_RESPONSE=$(curl -sf "${BASE_URL}/session/${SESSION_ID}/diff?issueIds=${ISSUE_ID}" 2>/dev/null) || {
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

# Build system message
SYSTEM_MSG="Session starting: Issue \"${ISSUE_TITLE}\" loaded"

# Output as JSON for SessionStart hook with systemMessage
# Use compact JSON (-c) for the issue data in additionalContext
jq -nc --arg ctx "$FULL_ISSUE" --arg sysMsg "$SYSTEM_MSG" '{
  systemMessage: $sysMsg,
  hookSpecificOutput: {
    hookEventName: "SessionStart",
    additionalContext: $ctx
  }
}'

exit 0
