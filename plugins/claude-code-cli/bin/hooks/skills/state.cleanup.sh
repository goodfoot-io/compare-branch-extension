#!/bin/bash
#
# hooks/skills/state.cleanup.sh: Cleans up cliSkills from session state file
#
# Runs when a session truly ends (NOT during compaction).
# Removes the cliSkills array from the session state file.
#
# Triggered by: SessionEnd hook
#
# Input (stdin): JSON with session_id
# Output: JSON with systemMessage confirming cleanup
# Exit codes: 0 = success (cleanup hooks should never fail)
#
# State file: $HOME/.compare-branch/hook-state/${session_id}.json
# Modifies: Removes cliSkills array from state
#

# Source shared libraries
source "${CLAUDE_PLUGIN_ROOT}/bin/lib/state.sh"

# Read input from stdin
INPUT=$(cat)

# Parse session_id from input
SESSION_ID=$(echo "$INPUT" | jq -r '.session_id // ""' 2>/dev/null) || SESSION_ID=""

# Exit if no session_id
if [ -z "$SESSION_ID" ]; then
    echo '{}'
    exit 0
fi

# Check if state file exists
STATE_FILE=$(get_state_file "$SESSION_ID")
if [ ! -f "$STATE_FILE" ]; then
    echo '{}'
    exit 0
fi

# Clear cliSkills from state (using shared library)
clear_cli_skills "$SESSION_ID"

# Output JSON with systemMessage confirming cleanup
echo '{"systemMessage": "CLI skills cleanup: Removed tracked skills from session state"}'

# Always exit 0 (cleanup hooks should never fail)
exit 0
