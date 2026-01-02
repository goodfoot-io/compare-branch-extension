#!/bin/bash

# Test suite for session-startup hook
# Tests that issue data is injected for new sessions via hookSpecificOutput

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
TARGET_SCRIPT="$SCRIPT_DIR/session-startup.sh"

# Set CLAUDE_PLUGIN_ROOT for the target script
export CLAUDE_PLUGIN_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Enable test mode to prevent actual API calls
export SESSION_STARTUP_TEST_MODE=1

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

    # Store output and stderr for verification by caller
    LAST_OUTPUT="$output"
    LAST_STDERR="$stderr_output"

    echo -e "${GREEN}PASS${NC}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
    return 0
}

echo "Running session-startup tests..."
echo "================================="
echo "Test directory: $TEST_DIR"
echo "Script path: $TARGET_SCRIPT"
echo "Test mode: SESSION_STARTUP_TEST_MODE=$SESSION_STARTUP_TEST_MODE"

# Test 1: Fires on source=startup with ISSUE_ID set
echo -e "\n${YELLOW}=== Test 1: Fires on source=startup when ISSUE_ID is set ===${NC}"
setup_mock_home
export ISSUE_ID="main:123"
SESSION_ID="test-session-startup"
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
run_test "Fires on source=startup when ISSUE_ID is set" "$INPUT" 0

# Verify stderr contains test mode message
if echo "$LAST_STDERR" | grep -q "TEST_MODE: Would call session diff endpoint for session=$SESSION_ID, issue=$ISSUE_ID"; then
    echo "Verified: Would call session diff endpoint"
else
    echo -e "${RED}FAIL${NC} - Expected session diff endpoint call"
    echo "Stderr: $LAST_STDERR"
    TESTS_PASSED=$((TESTS_PASSED - 1))
fi
unset ISSUE_ID

# Test 2: Output format includes systemMessage and hookSpecificOutput
echo -e "\n${YELLOW}=== Test 2: Output format includes systemMessage and hookSpecificOutput ===${NC}"
setup_mock_home
export ISSUE_ID="main:456"
SESSION_ID="test-session-output-format"
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
run_test "Output format includes systemMessage and hookSpecificOutput" "$INPUT" 0

# Verify output has systemMessage
if echo "$LAST_OUTPUT" | jq -e '.systemMessage' > /dev/null 2>&1; then
    echo "Verified: Output contains systemMessage"
else
    echo -e "${RED}FAIL${NC} - Expected systemMessage in output"
    echo "Output: $LAST_OUTPUT"
    TESTS_PASSED=$((TESTS_PASSED - 1))
fi

# Verify output has hookSpecificOutput.hookEventName
HOOK_EVENT=$(echo "$LAST_OUTPUT" | jq -r '.hookSpecificOutput.hookEventName // empty')
if [ "$HOOK_EVENT" = "SessionStart" ]; then
    echo "Verified: hookEventName is SessionStart"
else
    echo -e "${RED}FAIL${NC} - Expected hookEventName to be SessionStart"
    echo "Output: $LAST_OUTPUT"
    TESTS_PASSED=$((TESTS_PASSED - 1))
fi

# Verify output has hookSpecificOutput.additionalContext
if echo "$LAST_OUTPUT" | jq -e '.hookSpecificOutput.additionalContext' > /dev/null 2>&1; then
    echo "Verified: Output contains additionalContext"
else
    echo -e "${RED}FAIL${NC} - Expected additionalContext in output"
    echo "Output: $LAST_OUTPUT"
    TESTS_PASSED=$((TESTS_PASSED - 1))
fi
unset ISSUE_ID

# Test 3: Graceful handling when ISSUE_ID not set (exits 0, no output)
echo -e "\n${YELLOW}=== Test 3: Graceful handling when ISSUE_ID not set ===${NC}"
setup_mock_home
# Ensure ISSUE_ID is not set
unset ISSUE_ID
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
run_test "Graceful handling when ISSUE_ID not set" "$INPUT" 0

# Verify no output when ISSUE_ID not set
if [ -z "$LAST_OUTPUT" ]; then
    echo "Verified: No output when ISSUE_ID not set"
else
    echo -e "${RED}FAIL${NC} - Expected no output when ISSUE_ID not set"
    echo "Output: $LAST_OUTPUT"
    TESTS_PASSED=$((TESTS_PASSED - 1))
fi

# Test 4: Graceful handling when session_id is missing (exits 0, no output)
echo -e "\n${YELLOW}=== Test 4: Graceful handling when session_id is missing ===${NC}"
setup_mock_home
export ISSUE_ID="main:789"
INPUT=$(cat <<EOF
{
  "transcript_path": "/tmp/transcript.jsonl",
  "cwd": "/workspace",
  "hook_event_name": "SessionStart",
  "source": "startup"
}
EOF
)
run_test "Graceful handling when session_id is missing" "$INPUT" 0

# Verify no output when session_id missing
if [ -z "$LAST_OUTPUT" ]; then
    echo "Verified: No output when session_id missing"
else
    echo -e "${RED}FAIL${NC} - Expected no output when session_id missing"
    echo "Output: $LAST_OUTPUT"
    TESTS_PASSED=$((TESTS_PASSED - 1))
fi
unset ISSUE_ID

# Test 5: Exits 0 with empty input
echo -e "\n${YELLOW}=== Test 5: Exits 0 with empty input ===${NC}"
setup_mock_home
export ISSUE_ID="main:1"
INPUT=""
run_test "Exits 0 with empty input" "$INPUT" 0

# Verify no output with empty input
if [ -z "$LAST_OUTPUT" ]; then
    echo "Verified: No output with empty input"
else
    echo -e "${RED}FAIL${NC} - Expected no output with empty input"
    TESTS_PASSED=$((TESTS_PASSED - 1))
fi
unset ISSUE_ID

# Test 6: Exits 0 with malformed input
echo -e "\n${YELLOW}=== Test 6: Exits 0 with malformed input ===${NC}"
setup_mock_home
export ISSUE_ID="main:1"
INPUT="not valid json at all"
run_test "Exits 0 with malformed input" "$INPUT" 0
unset ISSUE_ID

# Test 7: System message includes issue ID
echo -e "\n${YELLOW}=== Test 7: System message includes issue ID ===${NC}"
setup_mock_home
export ISSUE_ID="main:test-id"
SESSION_ID="test-session-system-msg"
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
run_test "System message includes issue ID" "$INPUT" 0

# Verify system message mentions issue
SYS_MSG=$(echo "$LAST_OUTPUT" | jq -r '.systemMessage // empty')
if echo "$SYS_MSG" | grep -qi "issue\|session"; then
    echo "Verified: System message mentions issue/session"
else
    echo -e "${RED}FAIL${NC} - Expected system message to mention issue or session"
    echo "System message: $SYS_MSG"
    TESTS_PASSED=$((TESTS_PASSED - 1))
fi
unset ISSUE_ID

# Cleanup
cleanup_mock_home
cd "$ORIGINAL_PWD"
rm -rf "$TEST_DIR"

# Summary
echo
echo "================================="
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
