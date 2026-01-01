#!/bin/bash
#
# SessionEnd hook: Cleans up session watermark on shutdown
#
# Cleans up session watermark when Claude's session ends.
# Note: SessionEnd hooks cannot inject context - use SessionStart for that.
#
# Input (stdin): JSON with session_id, transcript_path, cwd, hook_event_name
# Output: None
# Exit codes: 0 = success, 2 = unexpected error
#
# Environment variables:
#   ISSUE_ID - Issue ID being worked on (set by wrapper, e.g., "main:123")
#

set -euo pipefail

# Error handler - outputs to stderr and exits with code 2
error_handler() {
    local line_no=$1
    local error_code=$2
    echo "ERROR in session-end.sh at line $line_no (exit code: $error_code)" >&2
    echo "Please report this issue at: https://github.com/goodfoot-io/compare-branch-extension/issues" >&2
    echo "Include the error details above and steps to reproduce." >&2
    exit 2
}

trap 'error_handler ${LINENO} $?' ERR

# Read input from stdin
INPUT=$(cat)

# Extract session_id and cwd from input
SESSION_ID=$(echo "$INPUT" | jq -r '.session_id // empty') || SESSION_ID=""
if [ -z "$SESSION_ID" ]; then
  exit 0
fi

# Extract cwd for API discovery (hooks receive the working directory in input)
SESSION_CWD=$(echo "$INPUT" | jq -r '.cwd // empty') || SESSION_CWD=""

# Require ISSUE_ID - nothing to clean up without it
if [ -z "${ISSUE_ID:-}" ]; then
  exit 0
fi

# Discover API URL (pass cwd to find the correct workspace API)
BASE_URL=$("${CLAUDE_PLUGIN_ROOT}/bin/discover-api.sh" "$SESSION_CWD" 2>/dev/null) || exit 0

# Clean up session watermark on exit
curl -sf -X DELETE "${BASE_URL}/session/${SESSION_ID}" 2>/dev/null || true

exit 0
