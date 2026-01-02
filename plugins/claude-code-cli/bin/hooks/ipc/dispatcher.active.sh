#!/bin/bash
#
# hooks/ipc/dispatcher.active.sh: Signals dispatcher that Claude is actively processing
#
# Sends SIGURG to the dispatcher to indicate Claude is processing a request.
# Requires DISPATCHER_PID to be set by the wrapper script.
#
# Triggered by: SessionStart (all), UserPromptSubmit hooks
#
# Input (stdin): JSON with session_id, cwd, hook_event_name, source
# Output: None on success
# Exit codes: 0 = success, 1 = orphan (dispatcher died), 2 = configuration error
#
# Environment variables:
#   DISPATCHER_PID             - PID of the dispatcher to send signals to (required)
#   SIGNAL_ACTIVE_TEST_MODE    - If "1", skips sending signals (for testing)
#

set -euo pipefail

# Error handler - outputs to stderr and exits with code 2
error_handler() {
    local line_no=$1
    local error_code=$2
    echo "ERROR in dispatcher.active.sh at line $line_no (exit code: $error_code)" >&2
    echo "Please report this issue at: https://github.com/goodfoot-io/compare-branch-extension/issues" >&2
    echo "Include the error details above and steps to reproduce." >&2
    exit 2
}

trap 'error_handler ${LINENO} $?' ERR

# Source shared libraries
source "${CLAUDE_PLUGIN_ROOT}/bin/lib/api.sh"

# Read input from stdin
INPUT=$(cat)

# Extract session_id from input (for logging/debugging)
SESSION_ID=$(echo "$INPUT" | jq -r '.session_id // empty') || SESSION_ID=""
if [ -z "$SESSION_ID" ]; then
    exit 0
fi

# Extract cwd for API discovery (hooks receive the working directory in input)
CWD=$(echo "$INPUT" | jq -r '.cwd // empty') || CWD=""

# Require DISPATCHER_PID - this hook only works with the wrapper script
if [ -z "${DISPATCHER_PID:-}" ]; then
    echo "ERROR: DISPATCHER_PID environment variable is not set." >&2
    echo "This hook requires the Claude wrapper script (issue launcher)." >&2
    echo "" >&2
    echo "Action required:" >&2
    echo "  - Launch Claude using the issue panel 'Launch Claude' button" >&2
    echo "  - Or use the agent-issue-dispatcher script" >&2
    echo "" >&2
    echo "Direct 'claude' CLI invocation is not supported for issue tracking." >&2
    exit 2
fi

# Check if dispatcher is alive (orphan detection)
# If DISPATCHER_PID is set but the process no longer exists, Claude is orphaned
if ! kill -0 "$DISPATCHER_PID" 2>/dev/null; then
    echo "Wrapper process (PID=$DISPATCHER_PID) died, exiting Claude" >&2
    exit 1
fi

# POST to /session/start to notify extension that Claude session is active
if [ -n "$CWD" ]; then
    if [ "${SIGNAL_ACTIVE_TEST_MODE:-}" = "1" ]; then
        echo "TEST_MODE: Would POST /session/start (session=$SESSION_ID, pid=$DISPATCHER_PID)" >&2
    else
        # Non-critical: API discovery failure just means UI won't show session status
        BASE_URL=$(discover_api_url 2>/dev/null) || true
        if [ -n "$BASE_URL" ]; then
            if ! notify_session_start "$SESSION_ID" "$DISPATCHER_PID" "$BASE_URL"; then
                echo "Warning: Failed to notify extension of session activity" >&2
                echo "Session status may not update in the issue panel." >&2
            fi
        fi
    fi
fi

# Send SIGURG to notify dispatcher that Claude is actively processing
if [ "${SIGNAL_ACTIVE_TEST_MODE:-}" = "1" ]; then
    echo "TEST_MODE: Would send SIGURG (session=$SESSION_ID, dispatcher=$DISPATCHER_PID)" >&2
else
    # Signal failure is expected if dispatcher exited during the call (race condition)
    # We already checked dispatcher is alive above, so failure here is timing-related
    if ! kill -URG "$DISPATCHER_PID" 2>/dev/null; then
        echo "Warning: Could not signal dispatcher (PID=$DISPATCHER_PID may have exited)" >&2
    fi
fi

exit 0
