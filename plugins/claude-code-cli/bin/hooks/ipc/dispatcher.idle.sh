#!/bin/bash
#
# hooks/ipc/dispatcher.idle.sh: Signals dispatcher that Claude is idle
#
# Sends SIGWINCH to the dispatcher to indicate Claude is about to stop.
# Also notifies the extension API of session stop.
#
# Called by: hooks/issue/context.stop.sh when stop is allowed
#
# Input (stdin): JSON with session_id
# Output: JSON with systemMessage on success
# Exit codes: 0 = success
#
# Environment variables:
#   DISPATCHER_PID             - PID of the dispatcher to send signals to
#   SESSION_STOP_TEST_MODE     - If "1", skips sending signals (for testing)
#

set -euo pipefail

# Source shared libraries
source "${CLAUDE_PLUGIN_ROOT}/bin/lib/api.sh"
source "${CLAUDE_PLUGIN_ROOT}/bin/lib/output.sh"

# Read input from stdin
INPUT=$(cat)

# Extract session_id from input
SESSION_ID=$(echo "$INPUT" | jq -r '.session_id // empty') || SESSION_ID=""
if [ -z "$SESSION_ID" ]; then
    exit 0
fi

# Only signal if DISPATCHER_PID is set
if [ -z "${DISPATCHER_PID:-}" ]; then
    exit 0
fi

# Notify extension of session stop
if [ "${SESSION_STOP_TEST_MODE:-}" = "1" ]; then
    echo "TEST_MODE: Would POST /session/stop (session=$SESSION_ID, pid=$DISPATCHER_PID)" >&2
else
    BASE_URL=$(discover_api_url 2>/dev/null) || true
    if [ -n "$BASE_URL" ]; then
        if ! notify_session_stop "$SESSION_ID" "$DISPATCHER_PID" "$BASE_URL"; then
            echo "Warning: Failed to notify extension of session stop" >&2
            echo "Session status in the issue panel may appear stale." >&2
        fi
    fi
fi

# Send SIGWINCH to notify dispatcher that Claude is now idle
# SIGWINCH is ignored by default, safe to send even if dispatcher exited
if [ "${SESSION_STOP_TEST_MODE:-}" = "1" ]; then
    echo "TEST_MODE: Would send SIGWINCH to dispatcher (idle)" >&2
else
    # Signal failure is expected if dispatcher exited during the call
    if ! kill -WINCH "$DISPATCHER_PID" 2>/dev/null; then
        echo "Warning: Could not signal dispatcher idle state (PID=$DISPATCHER_PID may have exited)" >&2
    fi
fi

# Output systemMessage for user feedback
output_system_message "IPC: Signaling dispatcher that session is idle"

exit 0
