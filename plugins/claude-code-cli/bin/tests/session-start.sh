#!/bin/bash

# Test suite for session-start hook
# Tests that sessionId comments are posted for new sessions

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
TARGET_SCRIPT="$SCRIPT_DIR/session-start.sh"

# Set CLAUDE_PLUGIN_ROOT for the target script
export CLAUDE_PLUGIN_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Enable test mode to prevent actual API calls
export SESSION_START_TEST_MODE=1

# Setup mock home directory
setup_mock_home() {
    export HOME="$TEST_DIR/mock-home"
    mkdir -p "$HOME"
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

    echo -e "${GREEN}PASS${NC}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
    return 0
}

echo "Running session-start tests..."
echo "==============================="
echo "Test directory: $TEST_DIR"
echo "Script path: $TARGET_SCRIPT"
echo "Test mode: SESSION_START_TEST_MODE=$SESSION_START_TEST_MODE"

# Setup mocks
setup_mock_discover_api

# Test 1: Posts sessionId comment on startup when ISSUE_ID is set
echo -e "\n${YELLOW}=== Test 1: Posts sessionId comment on startup when ISSUE_ID is set ===${NC}"
setup_mock_home
export ISSUE_ID="main:123"
SESSION_ID="test-session-startup-comment"
INPUT=$(cat <<EOF
{
  "session_id": "$SESSION_ID",
  "transcript_path": "/tmp/transcript.jsonl",
  "cwd": "/workspace",
  "hook_event_name": "SessionStart",
  "source": "startup"
}
EOF
)
run_test "Posts sessionId comment on startup when ISSUE_ID is set" "$INPUT" 0

# Verify sessionId comment would be posted
if echo "$LAST_STDERR" | grep -q "Would POST sessionId comment to /issues/${ISSUE_ID}/comments"; then
    echo "Verified: Would POST sessionId comment"
else
    echo -e "${RED}FAIL${NC} - Expected sessionId comment POST"
    echo "Stderr: $LAST_STDERR"
    TESTS_PASSED=$((TESTS_PASSED - 1))
fi

# Verify session ID and source are in the message
if echo "$LAST_STDERR" | grep -q "session=$SESSION_ID, source=startup"; then
    echo "Verified: Session ID and source in message"
else
    echo -e "${RED}FAIL${NC} - Expected session ID and source in message"
    echo "Stderr: $LAST_STDERR"
    TESTS_PASSED=$((TESTS_PASSED - 1))
fi
unset ISSUE_ID

# Test 2: Posts sessionId comment on compact when ISSUE_ID is set
echo -e "\n${YELLOW}=== Test 2: Posts sessionId comment on compact when ISSUE_ID is set ===${NC}"
setup_mock_home
export ISSUE_ID="main:456"
SESSION_ID="test-session-compact-comment"
INPUT=$(cat <<EOF
{
  "session_id": "$SESSION_ID",
  "transcript_path": "/tmp/transcript.jsonl",
  "cwd": "/workspace",
  "hook_event_name": "SessionStart",
  "source": "compact"
}
EOF
)
run_test "Posts sessionId comment on compact when ISSUE_ID is set" "$INPUT" 0

# Verify sessionId comment would be posted
if echo "$LAST_STDERR" | grep -q "Would POST sessionId comment to /issues/${ISSUE_ID}/comments"; then
    echo "Verified: Would POST sessionId comment on compact"
else
    echo -e "${RED}FAIL${NC} - Expected sessionId comment POST on compact"
    echo "Stderr: $LAST_STDERR"
    TESTS_PASSED=$((TESTS_PASSED - 1))
fi

# Verify source is compact
if echo "$LAST_STDERR" | grep -q "session=$SESSION_ID, source=compact"; then
    echo "Verified: Source is compact"
else
    echo -e "${RED}FAIL${NC} - Expected source=compact in message"
    echo "Stderr: $LAST_STDERR"
    TESTS_PASSED=$((TESTS_PASSED - 1))
fi
unset ISSUE_ID

# Test 3: Posts sessionId comment on clear when ISSUE_ID is set
echo -e "\n${YELLOW}=== Test 3: Posts sessionId comment on clear when ISSUE_ID is set ===${NC}"
setup_mock_home
export ISSUE_ID="main:789"
SESSION_ID="test-session-clear-comment"
INPUT=$(cat <<EOF
{
  "session_id": "$SESSION_ID",
  "transcript_path": "/tmp/transcript.jsonl",
  "cwd": "/workspace",
  "hook_event_name": "SessionStart",
  "source": "clear"
}
EOF
)
run_test "Posts sessionId comment on clear when ISSUE_ID is set" "$INPUT" 0

# Verify sessionId comment would be posted
if echo "$LAST_STDERR" | grep -q "Would POST sessionId comment to /issues/${ISSUE_ID}/comments"; then
    echo "Verified: Would POST sessionId comment on clear"
else
    echo -e "${RED}FAIL${NC} - Expected sessionId comment POST on clear"
    echo "Stderr: $LAST_STDERR"
    TESTS_PASSED=$((TESTS_PASSED - 1))
fi

# Verify source is clear
if echo "$LAST_STDERR" | grep -q "session=$SESSION_ID, source=clear"; then
    echo "Verified: Source is clear"
else
    echo -e "${RED}FAIL${NC} - Expected source=clear in message"
    echo "Stderr: $LAST_STDERR"
    TESTS_PASSED=$((TESTS_PASSED - 1))
fi
unset ISSUE_ID

# Test 4: Does NOT post sessionId comment on resume
echo -e "\n${YELLOW}=== Test 4: Does NOT post sessionId comment on resume ===${NC}"
setup_mock_home
export ISSUE_ID="main:999"
SESSION_ID="test-session-resume-no-comment"
INPUT=$(cat <<EOF
{
  "session_id": "$SESSION_ID",
  "transcript_path": "/tmp/transcript.jsonl",
  "cwd": "/workspace",
  "hook_event_name": "SessionStart",
  "source": "resume"
}
EOF
)
run_test "Does NOT post sessionId comment on resume" "$INPUT" 0

# Verify sessionId comment would NOT be posted
if echo "$LAST_STDERR" | grep -q "Would POST sessionId comment"; then
    echo -e "${RED}FAIL${NC} - Should NOT post sessionId comment on resume"
    echo "Stderr: $LAST_STDERR"
    TESTS_PASSED=$((TESTS_PASSED - 1))
else
    echo "Verified: No sessionId comment on resume"
fi
unset ISSUE_ID

# Test 5: Does NOT post sessionId comment when ISSUE_ID is not set
echo -e "\n${YELLOW}=== Test 5: Does NOT post sessionId comment when ISSUE_ID is not set ===${NC}"
setup_mock_home
SESSION_ID="test-session-no-issue"
INPUT=$(cat <<EOF
{
  "session_id": "$SESSION_ID",
  "transcript_path": "/tmp/transcript.jsonl",
  "cwd": "/workspace",
  "hook_event_name": "SessionStart",
  "source": "startup"
}
EOF
)
run_test "Does NOT post sessionId comment when ISSUE_ID not set" "$INPUT" 0

# Verify sessionId comment would NOT be posted
if echo "$LAST_STDERR" | grep -q "Would POST sessionId comment"; then
    echo -e "${RED}FAIL${NC} - Should NOT post sessionId comment when ISSUE_ID not set"
    echo "Stderr: $LAST_STDERR"
    TESTS_PASSED=$((TESTS_PASSED - 1))
else
    echo "Verified: No sessionId comment without ISSUE_ID"
fi

# Test 6: Exits 0 when session_id is missing
echo -e "\n${YELLOW}=== Test 6: Exits 0 when session_id is missing ===${NC}"
setup_mock_home
export ISSUE_ID="main:1"
INPUT=$(cat <<EOF
{
  "transcript_path": "/tmp/transcript.jsonl",
  "cwd": "/workspace",
  "hook_event_name": "SessionStart",
  "source": "startup"
}
EOF
)
run_test "Exits 0 when session_id missing" "$INPUT" 0

# Verify no action taken
if echo "$LAST_STDERR" | grep -q "Would POST"; then
    echo -e "${RED}FAIL${NC} - Should not attempt any POST when session_id missing"
    TESTS_PASSED=$((TESTS_PASSED - 1))
else
    echo "Verified: No action when session_id missing"
fi
unset ISSUE_ID

# Test 7: Exits 0 when cwd is missing
echo -e "\n${YELLOW}=== Test 7: Exits 0 when cwd is missing ===${NC}"
setup_mock_home
export ISSUE_ID="main:1"
SESSION_ID="test-no-cwd"
INPUT=$(cat <<EOF
{
  "session_id": "$SESSION_ID",
  "transcript_path": "/tmp/transcript.jsonl",
  "hook_event_name": "SessionStart",
  "source": "startup"
}
EOF
)
run_test "Exits 0 when cwd missing" "$INPUT" 0

# Verify no action taken
if echo "$LAST_STDERR" | grep -q "Would POST"; then
    echo -e "${RED}FAIL${NC} - Should not attempt any POST when cwd missing"
    TESTS_PASSED=$((TESTS_PASSED - 1))
else
    echo "Verified: No action when cwd missing"
fi
unset ISSUE_ID

# Test 8: Exits 0 with empty input
echo -e "\n${YELLOW}=== Test 8: Exits 0 with empty input ===${NC}"
setup_mock_home
INPUT=""
run_test "Exits 0 with empty input" "$INPUT" 0

# Test 9: Exits 0 with malformed input
echo -e "\n${YELLOW}=== Test 9: Exits 0 with malformed input ===${NC}"
setup_mock_home
INPUT="not valid json at all"
run_test "Exits 0 with malformed input" "$INPUT" 0

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
