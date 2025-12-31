#!/bin/bash

# Test suite for session-end hook
# Tests that session cleanup occurs (watermark deletion, dispatcher signaling)

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counters
TESTS_RUN=0
TESTS_PASSED=0

# Create a test directory
TEST_DIR=$(mktemp -d)
ORIGINAL_HOME="$HOME"
ORIGINAL_PWD=$(pwd)

# Get the script path
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TARGET_SCRIPT="$SCRIPT_DIR/session-end.sh"

# Set CLAUDE_PLUGIN_ROOT for the target script
export CLAUDE_PLUGIN_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Mock curl tracking
MOCK_CURL_CALLS_FILE=""

# Enable test mode to prevent actual signal sending
export SESSION_STOP_TEST_MODE=1

# Set DISPATCHER_PID to enable logic (required for hook to proceed)
export DISPATCHER_PID=$$

# Setup mock home directory
setup_mock_home() {
    export HOME="$TEST_DIR/mock-home"
    mkdir -p "$HOME"
    MOCK_CURL_CALLS_FILE="$TEST_DIR/curl-calls.txt"
    rm -f "$MOCK_CURL_CALLS_FILE"
    touch "$MOCK_CURL_CALLS_FILE"
}

# Cleanup mock home directory
cleanup_mock_home() {
    export HOME="$ORIGINAL_HOME"
}

# Create mock discover-api.sh that returns a test URL
setup_mock_discover_api() {
    MOCK_BIN_DIR_API="${CLAUDE_PLUGIN_ROOT}/bin"
    mkdir -p "$MOCK_BIN_DIR_API"

    # Save original if it exists
    if [ -f "$MOCK_BIN_DIR_API/discover-api.sh" ]; then
        cp "$MOCK_BIN_DIR_API/discover-api.sh" "$TEST_DIR/original-discover-api.sh"
    fi

    # Create mock
    cat > "$MOCK_BIN_DIR_API/discover-api.sh" << 'MOCKEOF'
#!/bin/bash
echo "http://127.0.0.1:12345/api/v1"
MOCKEOF
    chmod +x "$MOCK_BIN_DIR_API/discover-api.sh"
}

# Restore original discover-api.sh
restore_discover_api() {
    MOCK_BIN_DIR_API="${CLAUDE_PLUGIN_ROOT}/bin"
    if [ -f "$TEST_DIR/original-discover-api.sh" ]; then
        mv "$TEST_DIR/original-discover-api.sh" "$MOCK_BIN_DIR_API/discover-api.sh"
    fi
}

# Create mock curl that logs calls
create_mock_curl() {
    MOCK_BIN_DIR="$TEST_DIR/mock-bin"
    mkdir -p "$MOCK_BIN_DIR"

    cat > "$MOCK_BIN_DIR/curl" << MOCKEOF
#!/bin/bash
echo "\$@" >> "$MOCK_CURL_CALLS_FILE"
echo '{"acknowledged":true}'
MOCKEOF
    chmod +x "$MOCK_BIN_DIR/curl"

    # Prepend mock bin to PATH
    export PATH="$MOCK_BIN_DIR:$PATH"
}

# Create mock curl that fails
create_failing_mock_curl() {
    MOCK_BIN_DIR="$TEST_DIR/mock-bin"
    mkdir -p "$MOCK_BIN_DIR"

    cat > "$MOCK_BIN_DIR/curl" << MOCKEOF
#!/bin/bash
echo "\$@" >> "$MOCK_CURL_CALLS_FILE"
exit 1
MOCKEOF
    chmod +x "$MOCK_BIN_DIR/curl"

    # Prepend mock bin to PATH
    export PATH="$MOCK_BIN_DIR:$PATH"
}

# Function to run a test
run_test() {
    local test_name="$1"
    local input="$2"
    local expected_exit_code="${3:-0}"

    TESTS_RUN=$((TESTS_RUN + 1))

    echo -e "\n${YELLOW}TEST: $test_name${NC}"

    # Run the script with input and capture output
    local output
    local stderr_file="$TEST_DIR/stderr_$$"

    output=$(echo "$input" | "$TARGET_SCRIPT" 2>"$stderr_file")
    local exit_code=$?
    local stderr_output=$(cat "$stderr_file" 2>/dev/null)
    rm -f "$stderr_file"

    echo "Exit code: $exit_code (expected: $expected_exit_code)"

    if [ $exit_code -ne "$expected_exit_code" ]; then
        echo -e "${RED}FAIL${NC} - unexpected exit code"
        if [ -n "$stderr_output" ]; then
            echo "Stderr: $stderr_output"
        fi
        return 1
    fi

    # Store stderr output for verification by caller
    LAST_STDERR="$stderr_output"
    LAST_OUTPUT="$output"

    echo -e "${GREEN}PASS${NC}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
    return 0
}

echo "Running session-end tests..."
echo "=============================="
echo "Test directory: $TEST_DIR"
echo "Script path: $TARGET_SCRIPT"
echo "Test mode: SESSION_STOP_TEST_MODE=$SESSION_STOP_TEST_MODE"

# Setup mocks
setup_mock_discover_api

# Test 1: Exits 0 when ISSUE_ID is not set (no issue tracking)
echo -e "\n${YELLOW}=== Test 1: Exits 0 when ISSUE_ID is not set ===${NC}"
setup_mock_home
create_mock_curl
unset ISSUE_ID
SESSION_ID="test-session-1"
INPUT=$(cat <<EOF
{
  "session_id": "$SESSION_ID",
  "transcript_path": "/tmp/transcript.jsonl",
  "cwd": "/workspace",
  "hook_event_name": "SessionEnd"
}
EOF
)
run_test "Exits 0 when ISSUE_ID not set" "$INPUT" 0

# Verify SIGWINCH is still sent (to notify dispatcher)
if echo "$LAST_STDERR" | grep -q "TEST_MODE: Would send SIGWINCH"; then
    echo "Verified: SIGWINCH still sent without ISSUE_ID"
else
    echo -e "${RED}FAIL${NC} - SIGWINCH should still be sent"
    echo "Stderr: $LAST_STDERR"
    TESTS_PASSED=$((TESTS_PASSED - 1))
fi

# Test 2: Deletes session watermark and POSTs to /session/stop when ISSUE_ID is set
echo -e "\n${YELLOW}=== Test 2: Deletes watermark and POSTs to /session/stop when ISSUE_ID is set ===${NC}"
setup_mock_home
create_mock_curl
export ISSUE_ID="main:1"
SESSION_ID="test-session-2"
INPUT=$(cat <<EOF
{
  "session_id": "$SESSION_ID",
  "transcript_path": "/tmp/transcript.jsonl",
  "cwd": "/workspace",
  "hook_event_name": "SessionEnd"
}
EOF
)
run_test "Deletes watermark and POSTs to /session/stop when ISSUE_ID set" "$INPUT" 0

# Verify curl was called with session endpoints
if [ -f "$MOCK_CURL_CALLS_FILE" ]; then
    CURL_CALLS=$(cat "$MOCK_CURL_CALLS_FILE")
    if echo "$CURL_CALLS" | grep -q "DELETE.*session/$SESSION_ID"; then
        echo "Verified: Session watermark deleted"
    else
        echo -e "${RED}FAIL${NC} - Expected DELETE to session endpoint"
        echo "Actual calls: $CURL_CALLS"
        TESTS_PASSED=$((TESTS_PASSED - 1))
    fi
    if echo "$CURL_CALLS" | grep -q "session/stop"; then
        echo "Verified: /session/stop endpoint called"
    else
        echo -e "${RED}FAIL${NC} - Expected call to /session/stop"
        echo "Actual calls: $CURL_CALLS"
        TESTS_PASSED=$((TESTS_PASSED - 1))
    fi
else
    echo -e "${RED}FAIL${NC} - No curl calls recorded"
    TESTS_PASSED=$((TESTS_PASSED - 1))
fi
unset ISSUE_ID

# Test 3: Includes dispatcherPid in /session/stop POST
echo -e "\n${YELLOW}=== Test 3: Includes dispatcherPid in /session/stop POST ===${NC}"
setup_mock_home
create_mock_curl
export ISSUE_ID="main:1"
SESSION_ID="test-session-3"
INPUT=$(cat <<EOF
{
  "session_id": "$SESSION_ID",
  "transcript_path": "/tmp/transcript.jsonl",
  "cwd": "/workspace",
  "hook_event_name": "SessionEnd"
}
EOF
)
run_test "Includes dispatcherPid in POST" "$INPUT" 0

# Verify dispatcherPid is in the POST body
if [ -f "$MOCK_CURL_CALLS_FILE" ]; then
    CURL_CALLS=$(cat "$MOCK_CURL_CALLS_FILE")
    if echo "$CURL_CALLS" | grep -q "dispatcherPid"; then
        echo "Verified: dispatcherPid included in POST"
    else
        echo -e "${RED}FAIL${NC} - Expected dispatcherPid in POST body"
        echo "Actual calls: $CURL_CALLS"
        TESTS_PASSED=$((TESTS_PASSED - 1))
    fi
else
    echo -e "${RED}FAIL${NC} - No curl calls recorded"
    TESTS_PASSED=$((TESTS_PASSED - 1))
fi
unset ISSUE_ID

# Test 4: Exits 0 even if API call fails
echo -e "\n${YELLOW}=== Test 4: Exits 0 even if API call fails ===${NC}"
setup_mock_home
create_failing_mock_curl
export ISSUE_ID="main:1"
SESSION_ID="test-session-4"
INPUT=$(cat <<EOF
{
  "session_id": "$SESSION_ID",
  "transcript_path": "/tmp/transcript.jsonl",
  "cwd": "/workspace",
  "hook_event_name": "SessionEnd"
}
EOF
)
run_test "Exits 0 even when API fails" "$INPUT" 0
unset ISSUE_ID

# Test 5: Exits 0 on malformed input
echo -e "\n${YELLOW}=== Test 5: Exits 0 on malformed input ===${NC}"
setup_mock_home
create_mock_curl
INPUT="not valid json at all"
run_test "Exits 0 with malformed input" "$INPUT" 0

# Test 6: Exits 0 when session_id is missing from input
echo -e "\n${YELLOW}=== Test 6: Exits 0 when session_id is missing ===${NC}"
setup_mock_home
create_mock_curl
INPUT=$(cat <<EOF
{
  "transcript_path": "/tmp/transcript.jsonl",
  "cwd": "/workspace",
  "hook_event_name": "SessionEnd"
}
EOF
)
run_test "Exits 0 when session_id missing" "$INPUT" 0

# Test 7: Exits 0 when empty input
echo -e "\n${YELLOW}=== Test 7: Exits 0 when empty input ===${NC}"
setup_mock_home
create_mock_curl
INPUT=""
run_test "Exits 0 with empty input" "$INPUT" 0

# Test 8: Sends SIGWINCH to dispatcher when ISSUE_ID is set
echo -e "\n${YELLOW}=== Test 8: Sends SIGWINCH to dispatcher ===${NC}"
setup_mock_home
create_mock_curl
export ISSUE_ID="main:1"
SESSION_ID="test-session-8"
INPUT=$(cat <<EOF
{
  "session_id": "$SESSION_ID",
  "transcript_path": "/tmp/transcript.jsonl",
  "cwd": "/workspace",
  "hook_event_name": "SessionEnd"
}
EOF
)
run_test "Sends SIGWINCH to dispatcher" "$INPUT" 0

# Verify TEST_MODE message in stderr (SIGWINCH would be sent)
if echo "$LAST_STDERR" | grep -q "TEST_MODE: Would send SIGWINCH"; then
    echo "Verified: SIGWINCH would be sent to dispatcher"
else
    echo -e "${RED}FAIL${NC} - SIGWINCH should be sent to dispatcher"
    echo "Stderr: $LAST_STDERR"
    TESTS_PASSED=$((TESTS_PASSED - 1))
fi
unset ISSUE_ID

# Test 9: Exits with error when DISPATCHER_PID is not set
echo -e "\n${YELLOW}=== Test 9: Exits with error when DISPATCHER_PID not set ===${NC}"
setup_mock_home
create_mock_curl
SESSION_ID="test-session-9"
INPUT=$(cat <<EOF
{
  "session_id": "$SESSION_ID",
  "transcript_path": "/tmp/transcript.jsonl",
  "cwd": "/workspace",
  "hook_event_name": "SessionEnd"
}
EOF
)

# Temporarily unset DISPATCHER_PID
SAVED_DISPATCHER_PID="$DISPATCHER_PID"
unset DISPATCHER_PID

run_test "Exits with error when DISPATCHER_PID not set" "$INPUT" 2

# Restore DISPATCHER_PID
export DISPATCHER_PID="$SAVED_DISPATCHER_PID"

# Verify error message includes actionable advice
if echo "$LAST_STDERR" | grep -q "DISPATCHER_PID environment variable is not set"; then
    echo "Verified: Error message indicates DISPATCHER_PID is required"
else
    echo -e "${RED}FAIL${NC} - Expected error message about DISPATCHER_PID"
    echo "Stderr: $LAST_STDERR"
    TESTS_PASSED=$((TESTS_PASSED - 1))
fi

if echo "$LAST_STDERR" | grep -q "Launch Claude using the issue panel"; then
    echo "Verified: Error includes actionable advice"
else
    echo -e "${RED}FAIL${NC} - Expected actionable advice in error"
    echo "Stderr: $LAST_STDERR"
    TESTS_PASSED=$((TESTS_PASSED - 1))
fi

# Cleanup
cleanup_mock_home
restore_discover_api
cd "$ORIGINAL_PWD"
rm -rf "$TEST_DIR"

# Summary
echo
echo "=============================="
echo "Tests run: $TESTS_RUN"
echo "Tests passed: $TESTS_PASSED"
echo "Tests failed: $((TESTS_RUN - TESTS_PASSED))"

if [ "$TESTS_PASSED" -eq "$TESTS_RUN" ]; then
    echo -e "${GREEN}All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}Some tests failed${NC}"
    exit 1
fi
