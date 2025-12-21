#!/bin/bash
#
# Test script to verify hooks receive environment variables correctly
#
# This simulates how Claude Code runs hooks by:
# 1. Setting env vars like the dispatcher does
# 2. Running the hook with simulated stdin input
# 3. Checking if the env vars are accessible
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEST_SESSION_ID="test-session-$(date +%s)"
TEST_DISPATCHER_PID="$$"
TEST_START_TIME="$(date -Iseconds)"

echo "=== Testing Hook Environment Variables ==="
echo ""
echo "Test Configuration:"
echo "  DISPATCHER_PID: $TEST_DISPATCHER_PID"
echo "  CLAUDE_START_TIME: $TEST_START_TIME"
echo "  SESSION_ID: $TEST_SESSION_ID"
echo ""

# Create test input JSON
TEST_INPUT=$(cat <<EOF
{
  "session_id": "$TEST_SESSION_ID",
  "hook_event_name": "Stop",
  "cwd": "/tmp"
}
EOF
)

echo "=== Test 1: Direct env var inheritance ==="
echo "Running session-stop.sh with DISPATCHER_PID and CLAUDE_START_TIME set..."
echo ""

# Run the hook with env vars set, but skip actual API calls by not having a state file
export DISPATCHER_PID="$TEST_DISPATCHER_PID"
export CLAUDE_START_TIME="$TEST_START_TIME"
export SESSION_STOP_TEST_MODE="1"
export CLAUDE_PLUGIN_ROOT="$SCRIPT_DIR/.."

# Create a minimal test to just check if env vars are visible
# Add a debug line to session-stop.sh output
echo "$TEST_INPUT" | bash -c '
  echo "Inside subprocess:"
  echo "  DISPATCHER_PID=${DISPATCHER_PID:-NOT_SET}"
  echo "  CLAUDE_START_TIME=${CLAUDE_START_TIME:-NOT_SET}"
'

echo ""
echo "=== Test 2: Simulating Claude Code spawning a subprocess ==="
echo "Testing if child process inherits env vars..."
echo ""

# This simulates how Claude Code might spawn hook processes
bash -c '
  export DISPATCHER_PID="12345"
  export CLAUDE_START_TIME="2025-01-01T00:00:00Z"

  # Spawn a child process (like Claude Code spawning a hook)
  bash -c '\''
    echo "Child process env vars:"
    echo "  DISPATCHER_PID=${DISPATCHER_PID:-NOT_SET}"
    echo "  CLAUDE_START_TIME=${CLAUDE_START_TIME:-NOT_SET}"
  '\''
'

echo ""
echo "=== Test 3: Running actual signal-active.sh ==="
echo ""

# Run signal-active.sh with test mode
export SIGNAL_ACTIVE_TEST_MODE="1"
echo "$TEST_INPUT" | "$SCRIPT_DIR/signal-active.sh" 2>&1 || echo "(exit code: $?)"

echo ""
echo "=== Tests Complete ==="
