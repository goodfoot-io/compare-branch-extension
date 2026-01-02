#!/bin/bash

# Test suite for session-end hook
# Tests that session cleanup occurs (watermark deletion)

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

# Setup mocks
setup_mock_discover_api

# Test 1: Exits 0 when ISSUE_ID is not set
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

# Verify no curl calls (nothing to clean up)
if [ -f "$MOCK_CURL_CALLS_FILE" ] && [ -s "$MOCK_CURL_CALLS_FILE" ]; then
    echo -e "${RED}FAIL${NC} - Should not make curl calls without ISSUE_ID"
    TESTS_PASSED=$((TESTS_PASSED - 1))
else
    echo "Verified: No curl calls without ISSUE_ID"
fi

# Test 2: Deletes session watermark when ISSUE_ID is set
echo -e "\n${YELLOW}=== Test 2: Deletes watermark when ISSUE_ID is set ===${NC}"
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
run_test "Deletes watermark when ISSUE_ID set" "$INPUT" 0

# Verify curl was called to delete session watermark
if [ -f "$MOCK_CURL_CALLS_FILE" ]; then
    CURL_CALLS=$(cat "$MOCK_CURL_CALLS_FILE")
    if echo "$CURL_CALLS" | grep -q "DELETE.*session/$SESSION_ID"; then
        echo "Verified: Session watermark deleted"
    else
        echo -e "${RED}FAIL${NC} - Expected DELETE to session endpoint"
        echo "Actual calls: $CURL_CALLS"
        TESTS_PASSED=$((TESTS_PASSED - 1))
    fi
else
    echo -e "${RED}FAIL${NC} - No curl calls recorded"
    TESTS_PASSED=$((TESTS_PASSED - 1))
fi
unset ISSUE_ID

# Test 3: Exits 0 even if API call fails
echo -e "\n${YELLOW}=== Test 3: Exits 0 even if API call fails ===${NC}"
setup_mock_home
create_failing_mock_curl
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
run_test "Exits 0 even when API fails" "$INPUT" 0
unset ISSUE_ID

# Test 4: Exits 0 on malformed input
echo -e "\n${YELLOW}=== Test 4: Exits 0 on malformed input ===${NC}"
setup_mock_home
create_mock_curl
INPUT="not valid json at all"
run_test "Exits 0 with malformed input" "$INPUT" 0

# Test 5: Exits 0 when session_id is missing from input
echo -e "\n${YELLOW}=== Test 5: Exits 0 when session_id is missing ===${NC}"
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

# Test 6: Exits 0 when empty input
echo -e "\n${YELLOW}=== Test 6: Exits 0 when empty input ===${NC}"
setup_mock_home
create_mock_curl
INPUT=""
run_test "Exits 0 with empty input" "$INPUT" 0

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
