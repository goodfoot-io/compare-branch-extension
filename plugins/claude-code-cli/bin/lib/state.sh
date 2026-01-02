#!/bin/bash
#
# lib/state.sh: Shared state file utilities for hook scripts
#
# Provides functions for managing session state files used for tracking
# CLI skills across context compaction.
#
# Usage: source "${CLAUDE_PLUGIN_ROOT}/bin/lib/state.sh"
#
# State file location: $HOME/.compare-branch/hook-state/${session_id}.json
#
# Functions:
#   get_state_dir            - Get the state directory path
#   get_state_file           - Get the state file path for a session
#   ensure_state_dir         - Create state directory if needed
#   read_state               - Read state JSON from file
#   write_state              - Write state JSON to file (atomic with flock)
#   read_cli_skills          - Get cliSkills array from state
#   add_cli_skill            - Add a skill to cliSkills (deduplicated)
#   clear_cli_skills         - Remove cliSkills from state
#

# Prevent double-sourcing
[[ -n "${_LIB_STATE_SOURCED:-}" ]] && return 0
readonly _LIB_STATE_SOURCED=1

# State directory path
readonly STATE_DIR="$HOME/.compare-branch/hook-state"

# Get the state directory path
get_state_dir() {
    echo "$STATE_DIR"
}

# Get the state file path for a session
# Args: $1 = session_id
get_state_file() {
    local session_id="$1"
    echo "${STATE_DIR}/${session_id}.json"
}

# Create state directory if needed
ensure_state_dir() {
    mkdir -p "$STATE_DIR"
}

# Read state from file
# Args: $1 = session_id
# Returns: JSON state on stdout, or default empty state if not found
read_state() {
    local session_id="$1"
    local state_file
    state_file=$(get_state_file "$session_id")

    if [ -f "$state_file" ]; then
        cat "$state_file"
    else
        echo '{"cliSkills":[]}'
    fi
}

# Write state to file (atomic with flock)
# Args: $1 = session_id, $2 = json_state
write_state() {
    local session_id="$1"
    local json_state="$2"
    local state_file
    state_file=$(get_state_file "$session_id")

    ensure_state_dir

    (
        flock -x 200
        echo "$json_state" > "$state_file"
    ) 200>"${state_file}.lock"
}

# Read cliSkills array from state
# Args: $1 = session_id
# Returns: JSON array on stdout
read_cli_skills() {
    local session_id="$1"
    local state_file
    state_file=$(get_state_file "$session_id")

    if [ -f "$state_file" ]; then
        jq -r '.cliSkills // []' "$state_file" 2>/dev/null || echo "[]"
    else
        echo "[]"
    fi
}

# Add a skill to cliSkills (deduplicated)
# Args: $1 = session_id, $2 = skill_name
add_cli_skill() {
    local session_id="$1"
    local skill_name="$2"
    local state_file
    state_file=$(get_state_file "$session_id")

    ensure_state_dir

    (
        flock -x 200

        # Read current state or initialize default
        local state
        if [ -f "$state_file" ]; then
            state=$(cat "$state_file")
        else
            state='{"cliSkills":[]}'
        fi

        # Ensure cliSkills array exists and add skill (deduplicated)
        local new_state
        new_state=$(echo "$state" | jq --arg skill "$skill_name" '
            .cliSkills = ((.cliSkills // []) + [$skill] | unique)
        ')

        # Write updated state
        echo "$new_state" > "$state_file"
    ) 200>"${state_file}.lock"
}

# Clear cliSkills from state
# Args: $1 = session_id
clear_cli_skills() {
    local session_id="$1"
    local state_file
    state_file=$(get_state_file "$session_id")

    if [ ! -f "$state_file" ]; then
        return 0
    fi

    (
        flock -x 200

        if [ -f "$state_file" ]; then
            local state new_state
            state=$(cat "$state_file")
            new_state=$(echo "$state" | jq 'del(.cliSkills)')
            echo "$new_state" > "$state_file"
        fi
    ) 200>"${state_file}.lock"
}
