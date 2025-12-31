#!/bin/bash
#
# SessionStart hook (compact matcher): Reloads claude-code-cli skills after compaction
#
# Runs after context compaction and outputs instructions to reload previously tracked
# claude-code-cli:* skills via additionalContext.
#
# Input (stdin): JSON with session_id, hook_event_name
# Output: JSON with hookSpecificOutput.additionalContext containing reload instructions
# Exit codes: 0 = success
#
# State file: $HOME/.compare-branch/hook-state/${session_id}.json
# Reads: cliSkills array from state
#

set -euo pipefail

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
STATE_DIR="$HOME/.compare-branch/hook-state"
STATE_FILE="$STATE_DIR/${SESSION_ID}.json"

# Check if state file exists
if [ ! -f "$STATE_FILE" ]; then
    echo '{}'
    exit 0
fi

# Read cliSkills from state file
CLI_SKILLS=$(jq -r '.cliSkills // []' "$STATE_FILE" 2>/dev/null) || CLI_SKILLS="[]"

# Check if any skills are tracked
SKILL_COUNT=$(echo "$CLI_SKILLS" | jq 'length')

if [ "$SKILL_COUNT" -eq 0 ]; then
    echo '{}'
    exit 0
fi

# Build the skill list with full namespace for the message
# Format: 'claude-code-cli:skill1' and 'claude-code-cli:skill2'
if [ "$SKILL_COUNT" -eq 1 ]; then
    # Single skill
    SKILL=$(echo "$CLI_SKILLS" | jq -r '.[0]')
    SKILL_LIST="'claude-code-cli:${SKILL}'"
elif [ "$SKILL_COUNT" -eq 2 ]; then
    # Two skills: 'skill1' and 'skill2'
    FIRST=$(echo "$CLI_SKILLS" | jq -r '.[0]')
    SECOND=$(echo "$CLI_SKILLS" | jq -r '.[1]')
    SKILL_LIST="'claude-code-cli:${FIRST}' and 'claude-code-cli:${SECOND}'"
else
    # Three or more skills: 'skill1', 'skill2', and 'skill3'
    SKILL_LIST=""
    i=1
    while IFS= read -r skill; do
        if [ $i -eq 1 ]; then
            SKILL_LIST="'claude-code-cli:${skill}'"
        elif [ $i -eq "$SKILL_COUNT" ]; then
            SKILL_LIST="${SKILL_LIST}, and 'claude-code-cli:${skill}'"
        else
            SKILL_LIST="${SKILL_LIST}, 'claude-code-cli:${skill}'"
        fi
        ((i++))
    done < <(echo "$CLI_SKILLS" | jq -r '.[]')
fi

# Extract hook_event_name from input (default to SessionStart)
HOOK_EVENT_NAME=$(echo "$INPUT" | jq -r '.hook_event_name // "SessionStart"')

# Build human-readable systemMessage
if [ "$SKILL_COUNT" -eq 1 ]; then
    SYSTEM_MSG="Reloading skill: claude-code-cli:${SKILL}"
else
    # Build comma-separated list for multiple skills
    SKILL_NAMES=$(echo "$CLI_SKILLS" | jq -r '.[]' | sed 's/^/claude-code-cli:/' | tr '\n' ',' | sed 's/,$//' | sed 's/,/, /g')
    SYSTEM_MSG="Reloading skills: ${SKILL_NAMES}"
fi

# Output JSON with reload instructions and systemMessage
jq -n --arg event "$HOOK_EVENT_NAME" --arg skills "$SKILL_LIST" --arg sysMsg "$SYSTEM_MSG" '{
  systemMessage: $sysMsg,
  hookSpecificOutput: {
    hookEventName: $event,
    additionalContext: ("Load skill " + $skills + " before continuing")
  }
}'

exit 0
