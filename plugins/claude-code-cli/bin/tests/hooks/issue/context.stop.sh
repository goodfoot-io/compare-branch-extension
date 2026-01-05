#!/bin/bash

# Test suite for context.stop hook
# Tests that Claude is blocked from stopping when there are new issue updates

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
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
TARGET_SCRIPT="$SCRIPT_DIR/hooks/issue/context.stop.sh"

# Set CLAUDE_PLUGIN_ROOT for the target script
export CLAUDE_PLUGIN_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Enable test mode to prevent actual signal sending
export SESSION_STOP_TEST_MODE=1

# Mock curl tracking
MOCK_CURL_CALLS_FILE=""

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

# Create mock discover-workspace-api.sh that returns a test URL
setup_mock_discover_api() {
    MOCK_BIN_DIR_API="${CLAUDE_PLUGIN_ROOT}/bin"
    mkdir -p "$MOCK_BIN_DIR_API"

    # Save original if it exists
    if [ -f "$MOCK_BIN_DIR_API/discover-workspace-api.sh" ]; then
        cp "$MOCK_BIN_DIR_API/discover-workspace-api.sh" "$TEST_DIR/original-discover-workspace-api.sh"
    fi

    # Create mock
    cat > "$MOCK_BIN_DIR_API/discover-workspace-api.sh" << 'MOCKEOF'
#!/bin/bash
echo "http://127.0.0.1:12345/api/v1"
MOCKEOF
    chmod +x "$MOCK_BIN_DIR_API/discover-workspace-api.sh"
}

# Restore original discover-workspace-api.sh
restore_discover_api() {
    MOCK_BIN_DIR_API="${CLAUDE_PLUGIN_ROOT}/bin"
    if [ -f "$TEST_DIR/original-discover-workspace-api.sh" ]; then
        mv "$TEST_DIR/original-discover-workspace-api.sh" "$MOCK_BIN_DIR_API/discover-workspace-api.sh"
    fi
}

# Create mock curl that logs calls and returns configurable response
create_mock_curl() {
    local diff_response="${1:-}"
    MOCK_BIN_DIR="$TEST_DIR/mock-bin"
    mkdir -p "$MOCK_BIN_DIR"

    cat > "$MOCK_BIN_DIR/curl" << MOCKEOF
#!/bin/bash
echo "\$@" >> "$MOCK_CURL_CALLS_FILE"
# Check if this is a GET request for /session/*/diff
if echo "\$@" | grep -q "session/.*/diff"; then
    echo '$diff_response'
else
    echo '{"acknowledged":true}'
fi
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

echo "Running context.stop hook tests..."
echo "=============================="
echo "Test directory: $TEST_DIR"
echo "Script path: $TARGET_SCRIPT"

# Setup mocks
setup_mock_discover_api

# Test 1: Error when ISSUE_ID is not set (exits 2, shows error)
echo -e "\n${YELLOW}=== Test 1: Error when ISSUE_ID is not set ===${NC}"
setup_mock_home
create_mock_curl
unset ISSUE_ID
SESSION_ID="test-session-1"
INPUT=$(cat <<EOF
{
  "session_id": "$SESSION_ID",
  "transcript_path": "/tmp/transcript.jsonl",
  "cwd": "/workspace",
  "hook_event_name": "Stop"
}
EOF
)
run_test "Error when ISSUE_ID not set" "$INPUT" 2

# Verify error message mentions ISSUE_ID
if echo "$LAST_STDERR" | grep -q "ISSUE_ID"; then
    echo "Verified: Error message mentions ISSUE_ID"
else
    echo -e "${RED}FAIL${NC} - Expected error message about ISSUE_ID"
    echo "Stderr: $LAST_STDERR"
    TESTS_PASSED=$((TESTS_PASSED - 1))
fi

# Test 2: Queries session diff when ISSUE_ID is set
echo -e "\n${YELLOW}=== Test 2: Queries session diff when ISSUE_ID is set ===${NC}"
setup_mock_home
create_mock_curl '{"issues":[]}'
export ISSUE_ID="main:1"
SESSION_ID="test-session-2"
INPUT=$(cat <<EOF
{
  "session_id": "$SESSION_ID",
  "transcript_path": "/tmp/transcript.jsonl",
  "cwd": "/workspace",
  "hook_event_name": "Stop"
}
EOF
)
run_test "Queries session diff when ISSUE_ID set" "$INPUT" 0

# Verify curl was called with session diff endpoint
if [ -f "$MOCK_CURL_CALLS_FILE" ]; then
    CURL_CALLS=$(cat "$MOCK_CURL_CALLS_FILE")
    if echo "$CURL_CALLS" | grep -q "session/$SESSION_ID/diff"; then
        echo "Verified: Session diff endpoint called"
    else
        echo -e "${RED}FAIL${NC} - Expected call to session diff endpoint"
        echo "Actual calls: $CURL_CALLS"
        TESTS_PASSED=$((TESTS_PASSED - 1))
    fi
else
    echo -e "${RED}FAIL${NC} - No curl calls recorded"
    TESTS_PASSED=$((TESTS_PASSED - 1))
fi
unset ISSUE_ID

# Test 3: Blocks with diff response when new comments exist
echo -e "\n${YELLOW}=== Test 3: Blocks with diff response when new comments exist ===${NC}"
setup_mock_home
DIFF_RESPONSE='{"issues":[{"issueId":"main:1","issueTitle":"Test Issue","status":"in_progress","newComments":[{"author":"user","createdAt":"2024-01-01T12:00:00Z","body":"Please check this"}],"fieldChanges":[]}]}'
create_mock_curl "$DIFF_RESPONSE"
export ISSUE_ID="main:1"
SESSION_ID="test-session-3"
INPUT=$(cat <<EOF
{
  "session_id": "$SESSION_ID",
  "transcript_path": "/tmp/transcript.jsonl",
  "cwd": "/workspace",
  "hook_event_name": "Stop"
}
EOF
)
run_test "Blocks with diff response when new comments exist" "$INPUT" 0

# Verify output contains block decision
if echo "$LAST_OUTPUT" | grep -q '"decision":"block"'; then
    echo "Verified: Block decision in output"
else
    echo -e "${RED}FAIL${NC} - Expected block decision in output"
    echo "Output: $LAST_OUTPUT"
    TESTS_PASSED=$((TESTS_PASSED - 1))
fi

# Verify output contains systemMessage
if echo "$LAST_OUTPUT" | grep -q '"systemMessage"'; then
    echo "Verified: systemMessage field present in output"
else
    echo -e "${RED}FAIL${NC} - Expected systemMessage field in output"
    echo "Output: $LAST_OUTPUT"
    TESTS_PASSED=$((TESTS_PASSED - 1))
fi
unset ISSUE_ID

# Test 4: No block when no new comments or changes
echo -e "\n${YELLOW}=== Test 4: No block when no new comments or changes ===${NC}"
setup_mock_home
create_mock_curl '{"issues":[{"issueId":"main:1","issueTitle":"Test Issue","newComments":[],"fieldChanges":[]}]}'
export ISSUE_ID="main:1"
SESSION_ID="test-session-4"
INPUT=$(cat <<EOF
{
  "session_id": "$SESSION_ID",
  "transcript_path": "/tmp/transcript.jsonl",
  "cwd": "/workspace",
  "hook_event_name": "Stop"
}
EOF
)
run_test "No block when no new comments or changes" "$INPUT" 0

# Verify approve decision in output with systemMessage
if echo "$LAST_OUTPUT" | grep -q '"decision":"approve"'; then
    echo "Verified: Approve decision when no updates"
else
    echo -e "${RED}FAIL${NC} - Expected approve decision when no updates"
    echo "Output: $LAST_OUTPUT"
    TESTS_PASSED=$((TESTS_PASSED - 1))
fi

# Verify systemMessage for approve case
TESTS_RUN=$((TESTS_RUN + 1))
if echo "$LAST_OUTPUT" | grep -q '"systemMessage":"Stop approved: No pending issue updates"'; then
    echo "Verified: systemMessage present for approve case"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "${RED}FAIL${NC} - Expected systemMessage for approve case"
    echo "Output: $LAST_OUTPUT"
fi
unset ISSUE_ID

# Test 5: Sends SIGWINCH to dispatcher when no updates
echo -e "\n${YELLOW}=== Test 5: Sends SIGWINCH to dispatcher when no updates ===${NC}"
setup_mock_home
create_mock_curl '{"issues":[{"issueId":"main:1","issueTitle":"Test Issue","newComments":[],"fieldChanges":[]}]}'
export ISSUE_ID="main:1"
export DISPATCHER_PID=$$
SESSION_ID="test-session-5"
INPUT=$(cat <<EOF
{
  "session_id": "$SESSION_ID",
  "transcript_path": "/tmp/transcript.jsonl",
  "cwd": "/workspace",
  "hook_event_name": "Stop"
}
EOF
)
run_test "Sends SIGWINCH when no updates" "$INPUT" 0

# Verify SIGWINCH would be sent (test mode message)
if echo "$LAST_STDERR" | grep -q "TEST_MODE: Would send SIGWINCH"; then
    echo "Verified: SIGWINCH would be sent to dispatcher"
else
    echo -e "${RED}FAIL${NC} - Expected SIGWINCH signal"
    echo "Stderr: $LAST_STDERR"
    TESTS_PASSED=$((TESTS_PASSED - 1))
fi
unset ISSUE_ID
unset DISPATCHER_PID

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
