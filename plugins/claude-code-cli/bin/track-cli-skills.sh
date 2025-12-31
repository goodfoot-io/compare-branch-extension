#!/bin/bash
#
# PostToolUse hook: Tracks when claude-code-cli:* skills are loaded
#
# Detects when any claude-code-cli:* skill is loaded and records this in session state.
# This enables the SessionStart compact hook to know which skills to reload after compaction.
#
# Input (stdin): JSON with session_id, tool_name, tool_input.skill
# Output: JSON response (empty {} on success)
# Exit codes: 0 = success, 2 = unexpected error
#
# State file: $HOME/.compare-branch/hook-state/${session_id}.json
# Format: {"cliSkills": ["issue-bug", "issue-implementation"]}
#

set -euo pipefail

# Error handler - outputs to stderr and exits with code 2
error_handler() {
    local line_no=$1
    local error_code=$2
    echo "ERROR in track-cli-skills.sh at line $line_no (exit code: $error_code)" >&2
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
    echo '{}'
    exit 0
fi

# Exit early if not a claude-code-cli:* skill
if [[ "$SKILL" != claude-code-cli:* ]]; then
    echo '{}'
    exit 0
fi

# Exit if no session_id
if [ -z "$SESSION_ID" ]; then
    echo '{}'
    exit 0
fi

# Strip the claude-code-cli: prefix to get the skill name
SKILL_NAME="${SKILL#claude-code-cli:}"

# Create state directory if it doesn't exist
STATE_DIR="$HOME/.compare-branch/hook-state"
mkdir -p "$STATE_DIR"

STATE_FILE="$STATE_DIR/${SESSION_ID}.json"

# Use flock for atomic read-modify-write
(
    flock -x 200

    # Read current state or initialize default
    if [ -f "$STATE_FILE" ]; then
        STATE=$(cat "$STATE_FILE")
    else
        STATE='{"cliSkills":[]}'
    fi

    # Ensure cliSkills array exists and add skill (deduplicated)
    NEW_STATE=$(echo "$STATE" | jq --arg skill "$SKILL_NAME" '
        .cliSkills = ((.cliSkills // []) + [$skill] | unique)
    ')

    # Write updated state
    echo "$NEW_STATE" > "$STATE_FILE"
) 200>"$STATE_FILE.lock"

# Output minimal JSON response
echo '{}'

exit 0
