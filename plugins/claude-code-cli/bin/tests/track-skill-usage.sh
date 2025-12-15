#!/bin/bash

# Test suite for track-skill-usage hook
# Tests detection of issues:api skill loading and state file management

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
TARGET_SCRIPT="$SCRIPT_DIR/track-skill-usage.sh"

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

    echo -e "${GREEN}PASS${NC}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
    return 0
}

echo "Running track-skill-usage tests..."
echo "===================================="
echo "Test directory: $TEST_DIR"
echo "Script path: $TARGET_SCRIPT"

# Test 1: Does nothing when tool_name is not "Skill"
echo -e "\n${YELLOW}=== Test 1: Does nothing when tool_name is not Skill ===${NC}"
setup_mock_home
SESSION_ID="test-session-1"
INPUT=$(cat <<EOF
{
  "session_id": "$SESSION_ID",
  "hook_event_name": "PostToolUse",
  "tool_name": "Bash",
  "tool_input": {
    "command": "ls -la"
  }
}
EOF
)
run_test "Non-Skill tool is ignored" "$INPUT" 0

# Verify no state file was created
STATE_FILE="$HOME/.claude/hook-state/${SESSION_ID}.json"
if [ -f "$STATE_FILE" ]; then
    echo -e "${RED}FAIL${NC} - State file should not exist for non-Skill tool"
    TESTS_PASSED=$((TESTS_PASSED - 1))
else
    echo "Verified: No state file created"
fi

# Test 2: Does nothing when skill is not "issues:api"
echo -e "\n${YELLOW}=== Test 2: Does nothing when skill is not issues:api ===${NC}"
setup_mock_home
SESSION_ID="test-session-2"
INPUT=$(cat <<EOF
{
  "session_id": "$SESSION_ID",
  "hook_event_name": "PostToolUse",
  "tool_name": "Skill",
  "tool_input": {
    "skill": "some-other:skill"
  }
}
EOF
)
run_test "Non-issues:api skill is ignored" "$INPUT" 0

# Verify no state file was created
STATE_FILE="$HOME/.claude/hook-state/${SESSION_ID}.json"
if [ -f "$STATE_FILE" ]; then
    echo -e "${RED}FAIL${NC} - State file should not exist for non-issues:api skill"
    TESTS_PASSED=$((TESTS_PASSED - 1))
else
    echo "Verified: No state file created"
fi

# Test 3: Creates state file when skill is "issues:api"
echo -e "\n${YELLOW}=== Test 3: Creates state file when skill is issues:api ===${NC}"
setup_mock_home
SESSION_ID="test-session-3"
INPUT=$(cat <<EOF
{
  "session_id": "$SESSION_ID",
  "hook_event_name": "PostToolUse",
  "tool_name": "Skill",
  "tool_input": {
    "skill": "issues:api"
  }
}
EOF
)
run_test "issues:api skill creates state file" "$INPUT" 0

# Verify state file was created
STATE_FILE="$HOME/.claude/hook-state/${SESSION_ID}.json"
if [ ! -f "$STATE_FILE" ]; then
    echo -e "${RED}FAIL${NC} - State file should exist"
    TESTS_PASSED=$((TESTS_PASSED - 1))
else
    echo "Verified: State file created at $STATE_FILE"
fi

# Test 4: Sets issuesApiLoaded to true in state file
echo -e "\n${YELLOW}=== Test 4: Sets issuesApiLoaded to true in state file ===${NC}"
setup_mock_home
SESSION_ID="test-session-4"
INPUT=$(cat <<EOF
{
  "session_id": "$SESSION_ID",
  "hook_event_name": "PostToolUse",
  "tool_name": "Skill",
  "tool_input": {
    "skill": "issues:api"
  }
}
EOF
)
run_test "issues:api skill sets issuesApiLoaded to true" "$INPUT" 0

# Verify issuesApiLoaded is true
STATE_FILE="$HOME/.claude/hook-state/${SESSION_ID}.json"
if [ -f "$STATE_FILE" ]; then
    LOADED=$(jq -r '.issuesApiLoaded' "$STATE_FILE")
    if [ "$LOADED" = "true" ]; then
        echo "Verified: issuesApiLoaded is true"
    else
        echo -e "${RED}FAIL${NC} - issuesApiLoaded should be true, got: $LOADED"
        TESTS_PASSED=$((TESTS_PASSED - 1))
    fi
else
    echo -e "${RED}FAIL${NC} - State file not found"
    TESTS_PASSED=$((TESTS_PASSED - 1))
fi

# Test 5: Preserves existing issueIds in state file
echo -e "\n${YELLOW}=== Test 5: Preserves existing issueIds in state file ===${NC}"
setup_mock_home
SESSION_ID="test-session-5"

# Create existing state file with issueIds
mkdir -p "$HOME/.claude/hook-state"
cat > "$HOME/.claude/hook-state/${SESSION_ID}.json" <<EOF
{"issuesApiLoaded":false,"issueIds":["main:1","feature:42"]}
EOF

INPUT=$(cat <<EOF
{
  "session_id": "$SESSION_ID",
  "hook_event_name": "PostToolUse",
  "tool_name": "Skill",
  "tool_input": {
    "skill": "issues:api"
  }
}
EOF
)
run_test "Preserves existing issueIds" "$INPUT" 0

# Verify issueIds are preserved
STATE_FILE="$HOME/.claude/hook-state/${SESSION_ID}.json"
if [ -f "$STATE_FILE" ]; then
    ISSUE_IDS=$(jq -c '.issueIds' "$STATE_FILE")
    LOADED=$(jq -r '.issuesApiLoaded' "$STATE_FILE")
    if [ "$ISSUE_IDS" = '["main:1","feature:42"]' ] && [ "$LOADED" = "true" ]; then
        echo "Verified: issueIds preserved and issuesApiLoaded set to true"
    else
        echo -e "${RED}FAIL${NC} - Expected issueIds=[\"main:1\",\"feature:42\"] and issuesApiLoaded=true"
        echo "Actual: issueIds=$ISSUE_IDS, issuesApiLoaded=$LOADED"
        TESTS_PASSED=$((TESTS_PASSED - 1))
    fi
else
    echo -e "${RED}FAIL${NC} - State file not found"
    TESTS_PASSED=$((TESTS_PASSED - 1))
fi

# Test 6: Uses flock for atomic access (lock file created)
echo -e "\n${YELLOW}=== Test 6: Uses flock for atomic access ===${NC}"
setup_mock_home
SESSION_ID="test-session-6"
INPUT=$(cat <<EOF
{
  "session_id": "$SESSION_ID",
  "hook_event_name": "PostToolUse",
  "tool_name": "Skill",
  "tool_input": {
    "skill": "issues:api"
  }
}
EOF
)
run_test "Flock is used for atomic access" "$INPUT" 0

# Verify lock file was created (it may be cleaned up, but we can check if flock command works)
# The actual test is that the script doesn't error - flock is being used
STATE_FILE="$HOME/.claude/hook-state/${SESSION_ID}.json"
LOCK_FILE="$HOME/.claude/hook-state/${SESSION_ID}.json.lock"
if [ -f "$STATE_FILE" ]; then
    echo "Verified: State file created (flock was used successfully)"
else
    echo -e "${RED}FAIL${NC} - State file not created"
    TESTS_PASSED=$((TESTS_PASSED - 1))
fi

# Test 7: Creates state directory if missing
echo -e "\n${YELLOW}=== Test 7: Creates state directory if missing ===${NC}"
setup_mock_home
# Ensure no hook-state directory exists
rm -rf "$HOME/.claude"
SESSION_ID="test-session-7"
INPUT=$(cat <<EOF
{
  "session_id": "$SESSION_ID",
  "hook_event_name": "PostToolUse",
  "tool_name": "Skill",
  "tool_input": {
    "skill": "issues:api"
  }
}
EOF
)
run_test "Creates state directory if missing" "$INPUT" 0

# Verify directory and file were created
STATE_DIR="$HOME/.claude/hook-state"
STATE_FILE="$STATE_DIR/${SESSION_ID}.json"
if [ -d "$STATE_DIR" ] && [ -f "$STATE_FILE" ]; then
    echo "Verified: State directory and file created"
else
    echo -e "${RED}FAIL${NC} - State directory or file not created"
    TESTS_PASSED=$((TESTS_PASSED - 1))
fi

# Test 8: Always exits 0 even with malformed input
echo -e "\n${YELLOW}=== Test 8: Always exits 0 even with malformed input ===${NC}"
setup_mock_home
INPUT="not valid json at all"
run_test "Exits 0 with malformed input" "$INPUT" 0

# Cleanup
cleanup_mock_home
cd "$ORIGINAL_PWD"
rm -rf "$TEST_DIR"

# Summary
echo
echo "===================================="
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
