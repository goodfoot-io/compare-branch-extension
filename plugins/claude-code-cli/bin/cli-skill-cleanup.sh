#!/bin/bash
#
# SessionEnd hook: Cleans up cliSkills from session state file
#
# Runs when a session truly ends (NOT during compaction).
# Removes the cliSkills array from the session state file.
#
# Input (stdin): JSON with session_id
# Output: JSON with systemMessage confirming cleanup
# Exit codes: 0 = success (cleanup hooks should never fail)
#
# State file: $HOME/.claude/hook-state/${session_id}.json
# Modifies: Removes cliSkills array from state
#

# Read input from stdin
INPUT=$(cat)

# Parse session_id from input
SESSION_ID=$(echo "$INPUT" | jq -r '.session_id // ""' 2>/dev/null) || SESSION_ID=""

# Exit if no session_id
if [ -z "$SESSION_ID" ]; then
    echo '{}'
    exit 0
fi

# Define state file path
STATE_DIR="$HOME/.claude/hook-state"
STATE_FILE="$STATE_DIR/${SESSION_ID}.json"

# Check if state file exists
if [ ! -f "$STATE_FILE" ]; then
    echo '{}'
    exit 0
fi

# Use flock for atomic read-modify-write
(
    flock -x 200

    # Read current state
    if [ -f "$STATE_FILE" ]; then
        STATE=$(cat "$STATE_FILE")

        # Remove cliSkills array from state
        NEW_STATE=$(echo "$STATE" | jq 'del(.cliSkills)')

        # Write updated state
        echo "$NEW_STATE" > "$STATE_FILE"
    fi
) 200>"$STATE_FILE.lock"

# Output JSON with systemMessage confirming cleanup
echo '{"systemMessage": "CLI skills cleanup: Removed tracked skills from session state"}'

# Always exit 0 (cleanup hooks should never fail)
exit 0
