#!/bin/bash

# Test suite for signal-active hook
# Tests that SIGURG is sent to process group on session activity

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
TARGET_SCRIPT="$SCRIPT_DIR/signal-active.sh"

# Enable test mode to prevent actual signal sending
export SIGNAL_ACTIVE_TEST_MODE=1

# Setup mock home directory
setup_mock_home() {
    export HOME="$TEST_DIR/mock-home"
    mkdir -p "$HOME"
}

# Cleanup mock home directory
cleanup_mock_home() {
    export HOME="$ORIGINAL_HOME"
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

echo "Running signal-active tests..."
echo "==============================="
echo "Test directory: $TEST_DIR"
echo "Script path: $TARGET_SCRIPT"
echo "Test mode: SIGNAL_ACTIVE_TEST_MODE=$SIGNAL_ACTIVE_TEST_MODE"

# Test 1: Exits 0 with valid input and sends SIGURG
echo -e "\n${YELLOW}=== Test 1: Exits 0 with valid input and sends SIGURG ===${NC}"
setup_mock_home
SESSION_ID="test-session-1"
INPUT=$(cat <<EOF
{
  "session_id": "$SESSION_ID",
  "transcript_path": "/tmp/transcript.jsonl",
  "hook_event_name": "SessionStart",
  "source": "startup"
}
EOF
)
run_test "Exits 0 with valid input" "$INPUT" 0

# Verify TEST_MODE message in stderr
if echo "$LAST_STDERR" | grep -q "TEST_MODE: Would send SIGURG"; then
    echo "Verified: TEST_MODE message indicates SIGURG would be sent"
else
    echo -e "${RED}FAIL${NC} - Expected TEST_MODE message about SIGURG"
    echo "Stderr: $LAST_STDERR"
    TESTS_PASSED=$((TESTS_PASSED - 1))
fi

# Test 2: Exits 0 when session_id is missing
echo -e "\n${YELLOW}=== Test 2: Exits 0 when session_id is missing ===${NC}"
setup_mock_home
INPUT=$(cat <<EOF
{
  "transcript_path": "/tmp/transcript.jsonl",
  "hook_event_name": "SessionStart",
  "source": "startup"
}
EOF
)
run_test "Exits 0 when session_id missing" "$INPUT" 0

# Verify no TEST_MODE message (signal not sent)
if echo "$LAST_STDERR" | grep -q "TEST_MODE"; then
    echo -e "${RED}FAIL${NC} - Should not send signal when session_id missing"
    TESTS_PASSED=$((TESTS_PASSED - 1))
else
    echo "Verified: No signal sent when session_id missing"
fi

# Test 3: Exits 0 when session_id is empty
echo -e "\n${YELLOW}=== Test 3: Exits 0 when session_id is empty ===${NC}"
setup_mock_home
INPUT=$(cat <<EOF
{
  "session_id": "",
  "transcript_path": "/tmp/transcript.jsonl",
  "hook_event_name": "SessionStart",
  "source": "startup"
}
EOF
)
run_test "Exits 0 when session_id empty" "$INPUT" 0

# Verify no TEST_MODE message
if echo "$LAST_STDERR" | grep -q "TEST_MODE"; then
    echo -e "${RED}FAIL${NC} - Should not send signal when session_id empty"
    TESTS_PASSED=$((TESTS_PASSED - 1))
else
    echo "Verified: No signal sent when session_id empty"
fi

# Test 4: Exits 0 on malformed input
echo -e "\n${YELLOW}=== Test 4: Exits 0 on malformed input ===${NC}"
setup_mock_home
INPUT="not valid json at all"
run_test "Exits 0 with malformed input" "$INPUT" 0

# Verify no TEST_MODE message
if echo "$LAST_STDERR" | grep -q "TEST_MODE"; then
    echo -e "${RED}FAIL${NC} - Should not send signal with malformed input"
    TESTS_PASSED=$((TESTS_PASSED - 1))
else
    echo "Verified: No signal sent with malformed input"
fi

# Test 5: Exits 0 when empty input
echo -e "\n${YELLOW}=== Test 5: Exits 0 when empty input ===${NC}"
setup_mock_home
INPUT=""
run_test "Exits 0 with empty input" "$INPUT" 0

# Test 6: Handles resume source
echo -e "\n${YELLOW}=== Test 6: Handles resume source ===${NC}"
setup_mock_home
SESSION_ID="test-session-resume"
INPUT=$(cat <<EOF
{
  "session_id": "$SESSION_ID",
  "transcript_path": "/tmp/transcript.jsonl",
  "hook_event_name": "SessionStart",
  "source": "resume"
}
EOF
)
run_test "Handles resume source" "$INPUT" 0

# Verify TEST_MODE message
if echo "$LAST_STDERR" | grep -q "TEST_MODE: Would send SIGURG"; then
    echo "Verified: Signal would be sent on resume"
else
    echo -e "${RED}FAIL${NC} - Expected TEST_MODE message for resume"
    TESTS_PASSED=$((TESTS_PASSED - 1))
fi

# Test 7: Handles different session IDs
echo -e "\n${YELLOW}=== Test 7: Handles different session IDs ===${NC}"
setup_mock_home
SESSION_ID="unique-session-id-abcdef123456"
INPUT=$(cat <<EOF
{
  "session_id": "$SESSION_ID",
  "transcript_path": "/tmp/transcript.jsonl",
  "hook_event_name": "SessionStart",
  "source": "startup"
}
EOF
)
run_test "Handles unique session IDs" "$INPUT" 0

# Verify TEST_MODE message includes correct session ID
if echo "$LAST_STDERR" | grep -q "session=$SESSION_ID"; then
    echo "Verified: Session ID correctly included in output"
else
    echo -e "${RED}FAIL${NC} - Expected session ID in output"
    echo "Stderr: $LAST_STDERR"
    TESTS_PASSED=$((TESTS_PASSED - 1))
fi

# Cleanup
cleanup_mock_home
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
