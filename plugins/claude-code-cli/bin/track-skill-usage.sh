#!/bin/bash
#
# PostToolUse hook: Tracks when issues:api skill is loaded
#
# Detects when the issues:api skill is loaded and records this in session state.
# This enables the Stop hook to know whether to notify the API about session completion.
#
# Input (stdin): JSON with session_id, tool_name, tool_input.skill
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
    echo "ERROR in track-skill-usage.sh at line $line_no (exit code: $error_code)" >&2
    echo "Please report this issue at: https://github.com/goodfoot-io/compare-branch-extension/issues" >&2
    echo "Include the error details above and steps to reproduce." >&2
    exit 2
}

trap 'error_handler ${LINENO} $?' ERR

# Read input from stdin
INPUT=$(cat)

# Parse session_id, tool_name, and skill from input
# Use // "" to provide empty string default and avoid null output
SESSION_ID=$(echo "$INPUT" | jq -r '.session_id // ""' 2>/dev/null) || SESSION_ID=""
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // ""' 2>/dev/null) || TOOL_NAME=""
SKILL=$(echo "$INPUT" | jq -r '.tool_input.skill // ""' 2>/dev/null) || SKILL=""

# Exit early if not a Skill tool use
if [ "$TOOL_NAME" != "Skill" ]; then
    exit 0
fi

# Exit early if not the issues:api skill
if [ "$SKILL" != "issues:api" ]; then
    exit 0
fi

# Exit if no session_id
if [ -z "$SESSION_ID" ]; then
    exit 0
fi

# Create state directory if it doesn't exist
STATE_DIR="$HOME/.claude/hook-state"
mkdir -p "$STATE_DIR"

STATE_FILE="$STATE_DIR/${SESSION_ID}.json"

# Use flock for atomic read-modify-write
(
    flock -x 200

    # Read current state or initialize default
    if [ -f "$STATE_FILE" ]; then
        STATE=$(cat "$STATE_FILE")
    else
        STATE='{"issuesApiLoaded":false,"issueIds":[]}'
    fi

    # Update issuesApiLoaded to true while preserving issueIds
    NEW_STATE=$(echo "$STATE" | jq '.issuesApiLoaded = true')

    # Write updated state
    echo "$NEW_STATE" > "$STATE_FILE"
) 200>"$STATE_FILE.lock"

exit 0
