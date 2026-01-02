#!/bin/bash
#
# lib/api.sh: Shared API utilities for hook scripts
#
# Provides functions for API discovery and HTTP operations used across
# multiple hooks.
#
# Usage: source "${CLAUDE_PLUGIN_ROOT}/bin/lib/api.sh"
#
# Functions:
#   discover_api_url           - Get the Issues API base URL
#   fetch_issue_diff           - GET /session/{id}/diff
#   fetch_issue                - GET /issues/{id}
#   post_session_comment       - POST /issues/{id}/comments
#   delete_session_watermark   - DELETE /session/{id}
#   notify_session_start       - POST /session/start
#   notify_session_stop        - POST /session/stop
#

# Prevent double-sourcing
[[ -n "${_LIB_API_SOURCED:-}" ]] && return 0
readonly _LIB_API_SOURCED=1

# Discover API URL for the current workspace
# Returns: Base URL on stdout, or exits with error message on stderr
# Exit codes: 0 = success, 1 = not available
discover_api_url() {
    local base_url
    if ! base_url=$("${CLAUDE_PLUGIN_ROOT}/bin/discover-workspace-api.sh" 2>&1); then
        echo "Warning: Issue tracking unavailable - VSCode extension not running or workspace not registered" >&2
        echo "Ensure VSCode is running with the Compare Branch extension active in this workspace." >&2
        return 1
    fi
    echo "$base_url"
}

# Fetch issue diff for a session
# Args: $1 = session_id, $2 = issue_id
# Returns: JSON response on stdout, empty on failure
# Exit codes: 0 = success (even if empty), 1 = curl failed
fetch_issue_diff() {
    local session_id="$1"
    local issue_id="$2"
    local base_url="$3"

    curl -sf "${base_url}/session/${session_id}/diff?issueIds=${issue_id}" 2>/dev/null || return 1
}

# Fetch a single issue by ID
# Args: $1 = issue_id, $2 = base_url
# Returns: JSON issue object on stdout
# Exit codes: 0 = success, 1 = curl failed or issue not found
fetch_issue() {
    local issue_id="$1"
    local base_url="$2"

    curl -sf "${base_url}/issues/${issue_id}" 2>/dev/null || return 1
}

# Post a session comment to an issue
# Args: $1 = issue_id, $2 = session_id, $3 = base_url
# Exit codes: 0 = success, 1 = failed
post_session_comment() {
    local issue_id="$1"
    local session_id="$2"
    local base_url="$3"

    curl -s --max-time 2 -X POST "${base_url}/issues/${issue_id}/comments" \
        -H "Content-Type: application/json" \
        -d "{\"sessionId\": \"${session_id}\", \"author\": \"agent\"}" \
        > /dev/null 2>&1
}

# Delete session watermark
# Args: $1 = session_id, $2 = base_url
# Exit codes: 0 = success, 1 = failed
delete_session_watermark() {
    local session_id="$1"
    local base_url="$2"

    curl -sf -X DELETE "${base_url}/session/${session_id}" 2>/dev/null
}

# Notify extension that session is starting/active
# Args: $1 = session_id, $2 = dispatcher_pid, $3 = base_url
# Exit codes: 0 = success, 1 = failed
notify_session_start() {
    local session_id="$1"
    local dispatcher_pid="$2"
    local base_url="$3"

    curl -sf --max-time 2 -X POST "${base_url}/session/start" \
        -H "Content-Type: application/json" \
        -d "{\"sessionId\": \"${session_id}\", \"dispatcherPid\": ${dispatcher_pid}}" \
        > /dev/null 2>&1
}

# Notify extension that session is stopping
# Args: $1 = session_id, $2 = dispatcher_pid, $3 = base_url
# Exit codes: 0 = success, 1 = failed
notify_session_stop() {
    local session_id="$1"
    local dispatcher_pid="$2"
    local base_url="$3"

    curl -sf --max-time 2 -X POST "${base_url}/session/stop" \
        -H "Content-Type: application/json" \
        -d "{\"sessionId\": \"${session_id}\", \"dispatcherPid\": ${dispatcher_pid}}" \
        > /dev/null 2>&1
}
