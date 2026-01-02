#!/bin/bash
#
# lib/output.sh: Shared JSON output builders for hook scripts
#
# Provides functions for building JSON responses that conform to
# Claude Code's hook output format.
#
# Usage: source "${CLAUDE_PLUGIN_ROOT}/bin/lib/output.sh"
#
# Functions:
#   output_system_message    - Output simple systemMessage-only JSON
#   output_stop_approve      - Build Stop hook approve output with systemMessage
#   output_context           - Build SessionStart context output
#   output_block_decision    - Build Stop hook block output
#   output_empty             - Output empty JSON object
#   build_update_summary     - Build human-readable update summary
#   has_updates              - Check if diff response has any updates
#   format_issue_context     - Format full issue as readable context text
#   format_diff_context      - Format diff response as readable context text
#   error_missing_issue_id   - Output error for missing ISSUE_ID and exit 2
#

# Prevent double-sourcing
[[ -n "${_LIB_OUTPUT_SOURCED:-}" ]] && return 0
readonly _LIB_OUTPUT_SOURCED=1

# Output simple systemMessage-only JSON
# Args: $1 = system_message
output_system_message() {
    local system_message="$1"
    jq -nc --arg sysMsg "$system_message" '{ systemMessage: $sysMsg }'
}

# Build Stop hook approve output with systemMessage
# Args: $1 = system_message
output_stop_approve() {
    local system_message="$1"
    jq -nc --arg sysMsg "$system_message" '{
        decision: "approve",
        systemMessage: $sysMsg
    }'
}

# Build SessionStart context output
# Args: $1 = hook_event_name, $2 = context (JSON string), $3 = system_message
output_context() {
    local hook_event_name="$1"
    local context="$2"
    local system_message="$3"

    jq -nc --arg event "$hook_event_name" --arg ctx "$context" --arg sysMsg "$system_message" '{
        systemMessage: $sysMsg,
        hookSpecificOutput: {
            hookEventName: $event,
            additionalContext: $ctx
        }
    }'
}

# Build Stop hook block output with diff data
# Args: $1 = reason (JSON string), $2 = system_message
output_block_decision() {
    local reason="$1"
    local system_message="$2"

    jq -nc --arg reason "$reason" --arg sysMsg "$system_message" '{
        decision: "block",
        reason: $reason,
        systemMessage: $sysMsg
    }'
}

# Output empty JSON object
output_empty() {
    echo '{}'
}

# Build human-readable update summary from diff response
# Args: $1 = diff_response (JSON)
# Returns: Human-readable string like "1 new comment" or "2 new comments and 1 field change"
build_update_summary() {
    local diff_response="$1"

    # Count new comments and field changes across all issues
    local comment_count change_count issue_count
    comment_count=$(echo "$diff_response" | jq '[.issues[].newComments | length] | add // 0')
    change_count=$(echo "$diff_response" | jq '[.issues[].fieldChanges | length] | add // 0')
    issue_count=$(echo "$diff_response" | jq '[.issues[] | select((.newComments | length > 0) or (.fieldChanges | length > 0))] | length')

    # Build message parts
    local parts=""
    if [ "$comment_count" -gt 0 ]; then
        if [ "$comment_count" -eq 1 ]; then
            parts="1 new comment"
        else
            parts="${comment_count} new comments"
        fi
    fi

    if [ "$change_count" -gt 0 ]; then
        local change_msg=""
        if [ "$change_count" -eq 1 ]; then
            change_msg="1 field change"
        else
            change_msg="${change_count} field changes"
        fi
        if [ -n "$parts" ]; then
            parts="${parts} and ${change_msg}"
        else
            parts="${change_msg}"
        fi
    fi

    # Add issue context
    if [ "$issue_count" -eq 1 ]; then
        local issue_title
        issue_title=$(echo "$diff_response" | jq -r '.issues[0].issueTitle // "unknown"')
        echo "Issue updated: ${parts} on \"${issue_title}\""
    else
        echo "Issues updated: ${parts} across ${issue_count} issues"
    fi
}

# Check if diff response has any updates
# Args: $1 = diff_response (JSON)
# Returns: "true" or "false"
has_updates() {
    local diff_response="$1"
    echo "$diff_response" | jq '[.issues[] | select((.newComments | length > 0) or (.fieldChanges | length > 0))] | length > 0'
}

# Format full issue as readable context text
# Args: $1 = issue (JSON)
# Returns: Human-readable multi-line string
format_issue_context() {
    local issue="$1"
    echo "$issue" | jq -r '
        "Issue: \(.id)\n" +
        "Title: \(.title)\n" +
        "Status: \(.status)\n" +
        (if .description and .description != "" then "Description: \(.description)\n" else "" end) +
        (if .planRequired then "Plan Required: yes\n" else "" end) +
        (if .planApproved then "Plan Approved: yes\n" else "" end) +
        (if .planContent and .planContent != "" then "Plan:\n\(.planContent)\n" else "" end) +
        (if .reviewRequired then "Review Required: yes\n" else "" end) +
        (if .reviewApproved then "Review Approved: yes\n" else "" end) +
        (if .tags and (.tags | length > 0) then "Tags: \(.tags | join(", "))\n" else "" end) +
        (if .comments and (.comments | length > 0) then
            "\nComments:\n" +
            (.comments | map("[\(.author)] \(.body // "(no body)")") | join("\n\n"))
        else "" end)
    '
}

# Format diff response as readable context text
# Args: $1 = diff_response (JSON)
# Returns: Human-readable multi-line string
format_diff_context() {
    local diff_response="$1"
    echo "$diff_response" | jq -r '
        .issues[] | select((.newComments | length > 0) or (.fieldChanges | length > 0)) |
        "Issue: \(.issueId) - \(.issueTitle)\n" +
        (if .newComments and (.newComments | length > 0) then
            "\nNew Comments:\n" +
            (.newComments | map("[\(.author)] \(.body // "(no body)")") | join("\n\n"))
        else "" end) +
        (if .fieldChanges and (.fieldChanges | length > 0) then
            "\nField Changes:\n" +
            (.fieldChanges | map("- \(.field): \(.oldValue // "null") → \(.newValue // "null")") | join("\n"))
        else "" end)
    '
}

# Output error message for missing ISSUE_ID and exit
# This is a configuration error - the hook requires the wrapper script
# Exit code: 2 (configuration error)
error_missing_issue_id() {
    echo "ERROR: ISSUE_ID environment variable is not set." >&2
    echo "This hook requires the Claude wrapper script (issue launcher)." >&2
    echo "" >&2
    echo "Action required:" >&2
    echo "  - Launch Claude using the issue panel 'Launch Claude' button" >&2
    echo "  - Or use the agent-issue-dispatcher script" >&2
    echo "" >&2
    echo "Direct 'claude' CLI invocation is not supported for issue tracking." >&2
    exit 2
}
