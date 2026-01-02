#!/bin/bash

# Test suite for state.track hook
# Tests detection of claude-code-cli:* skill loading and state file management

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
TARGET_SCRIPT="$SCRIPT_DIR/hooks/skills/state.track.sh"

# Set CLAUDE_PLUGIN_ROOT for the target script
export CLAUDE_PLUGIN_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

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

    # Store output for verification by caller
    LAST_OUTPUT="$output"

    echo -e "${GREEN}PASS${NC}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
    return 0
}

echo "Running state.track tests..."
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
STATE_FILE="$HOME/.compare-branch/hook-state/${SESSION_ID}.json"
if [ -f "$STATE_FILE" ]; then
    echo -e "${RED}FAIL${NC} - State file should not exist for non-Skill tool"
    TESTS_PASSED=$((TESTS_PASSED - 1))
else
    echo "Verified: No state file created"
fi

# Test 2: Does nothing when skill is not "claude-code-cli:*"
echo -e "\n${YELLOW}=== Test 2: Does nothing when skill is not claude-code-cli:* ===${NC}"
setup_mock_home
SESSION_ID="test-session-2"
INPUT=$(cat <<EOF
{
  "session_id": "$SESSION_ID",
  "hook_event_name": "PostToolUse",
  "tool_name": "Skill",
  "tool_input": {
    "skill": "goodfoot:some-skill"
  }
}
EOF
)
run_test "Non-claude-code-cli skill is ignored" "$INPUT" 0

# Verify no state file was created
STATE_FILE="$HOME/.compare-branch/hook-state/${SESSION_ID}.json"
if [ -f "$STATE_FILE" ]; then
    echo -e "${RED}FAIL${NC} - State file should not exist for non-claude-code-cli skill"
    TESTS_PASSED=$((TESTS_PASSED - 1))
else
    echo "Verified: No state file created"
fi

# Test 3: Creates state file when skill is "claude-code-cli:*"
echo -e "\n${YELLOW}=== Test 3: Creates state file when skill is claude-code-cli:* ===${NC}"
setup_mock_home
SESSION_ID="test-session-3"
INPUT=$(cat <<EOF
{
  "session_id": "$SESSION_ID",
  "hook_event_name": "PostToolUse",
  "tool_name": "Skill",
  "tool_input": {
    "skill": "claude-code-cli:issue-bug"
  }
}
EOF
)
run_test "claude-code-cli:* skill creates state file" "$INPUT" 0

# Verify state file was created
STATE_FILE="$HOME/.compare-branch/hook-state/${SESSION_ID}.json"
if [ ! -f "$STATE_FILE" ]; then
    echo -e "${RED}FAIL${NC} - State file should exist"
    TESTS_PASSED=$((TESTS_PASSED - 1))
else
    echo "Verified: State file created at $STATE_FILE"
fi

# Verify systemMessage in output
TESTS_RUN=$((TESTS_RUN + 1))
if echo "$LAST_OUTPUT" | grep -q '"systemMessage":"Skill tracked: claude-code-cli:issue-bug"'; then
    echo "Verified: systemMessage present in output"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "${RED}FAIL${NC} - Expected systemMessage in output"
    echo "Output: $LAST_OUTPUT"
fi

# Test 4: Adds skill to cliSkills array
echo -e "\n${YELLOW}=== Test 4: Adds skill to cliSkills array ===${NC}"
setup_mock_home
SESSION_ID="test-session-4"
INPUT=$(cat <<EOF
{
  "session_id": "$SESSION_ID",
  "hook_event_name": "PostToolUse",
  "tool_name": "Skill",
  "tool_input": {
    "skill": "claude-code-cli:issue-implementation"
  }
}
EOF
)
run_test "Adds skill to cliSkills array" "$INPUT" 0

# Verify cliSkills array contains the skill (without prefix)
STATE_FILE="$HOME/.compare-branch/hook-state/${SESSION_ID}.json"
if [ -f "$STATE_FILE" ]; then
    CLI_SKILLS=$(jq -c '.cliSkills' "$STATE_FILE")
    if [ "$CLI_SKILLS" = '["issue-implementation"]' ]; then
        echo "Verified: cliSkills contains issue-implementation"
    else
        echo -e "${RED}FAIL${NC} - Expected cliSkills=[\"issue-implementation\"], got: $CLI_SKILLS"
        TESTS_PASSED=$((TESTS_PASSED - 1))
    fi
else
    echo -e "${RED}FAIL${NC} - State file not found"
    TESTS_PASSED=$((TESTS_PASSED - 1))
fi

# Test 5: Strips claude-code-cli: prefix from skill name
echo -e "\n${YELLOW}=== Test 5: Strips claude-code-cli: prefix from skill name ===${NC}"
setup_mock_home
SESSION_ID="test-session-5"
INPUT=$(cat <<EOF
{
  "session_id": "$SESSION_ID",
  "hook_event_name": "PostToolUse",
  "tool_name": "Skill",
  "tool_input": {
    "skill": "claude-code-cli:issue-bug"
  }
}
EOF
)
run_test "Strips prefix from skill name" "$INPUT" 0

# Verify skill name is stored without prefix
STATE_FILE="$HOME/.compare-branch/hook-state/${SESSION_ID}.json"
if [ -f "$STATE_FILE" ]; then
    FIRST_SKILL=$(jq -r '.cliSkills[0]' "$STATE_FILE")
    if [ "$FIRST_SKILL" = "issue-bug" ]; then
        echo "Verified: Skill stored without prefix: $FIRST_SKILL"
    else
        echo -e "${RED}FAIL${NC} - Expected issue-bug, got: $FIRST_SKILL"
        TESTS_PASSED=$((TESTS_PASSED - 1))
    fi
else
    echo -e "${RED}FAIL${NC} - State file not found"
    TESTS_PASSED=$((TESTS_PASSED - 1))
fi

# Test 6: Deduplicates skills in cliSkills array
echo -e "\n${YELLOW}=== Test 6: Deduplicates skills in cliSkills array ===${NC}"
setup_mock_home
SESSION_ID="test-session-6"

# First invocation
INPUT=$(cat <<EOF
{
  "session_id": "$SESSION_ID",
  "hook_event_name": "PostToolUse",
  "tool_name": "Skill",
  "tool_input": {
    "skill": "claude-code-cli:issue-bug"
  }
}
EOF
)
echo "$INPUT" | "$TARGET_SCRIPT" > /dev/null 2>&1

# Second invocation with same skill
echo "$INPUT" | "$TARGET_SCRIPT" > /dev/null 2>&1

run_test "Deduplicates skills" "$INPUT" 0

# Verify only one entry exists
STATE_FILE="$HOME/.compare-branch/hook-state/${SESSION_ID}.json"
if [ -f "$STATE_FILE" ]; then
    SKILL_COUNT=$(jq '.cliSkills | length' "$STATE_FILE")
    if [ "$SKILL_COUNT" -eq 1 ]; then
        echo "Verified: Skill appears only once after duplicate invocation"
    else
        echo -e "${RED}FAIL${NC} - Expected 1 skill, got: $SKILL_COUNT"
        TESTS_PASSED=$((TESTS_PASSED - 1))
    fi
else
    echo -e "${RED}FAIL${NC} - State file not found"
    TESTS_PASSED=$((TESTS_PASSED - 1))
fi

# Test 7: Accumulates multiple different skills
echo -e "\n${YELLOW}=== Test 7: Accumulates multiple different skills ===${NC}"
setup_mock_home
SESSION_ID="test-session-7"

# First skill
INPUT1=$(cat <<EOF
{
  "session_id": "$SESSION_ID",
  "hook_event_name": "PostToolUse",
  "tool_name": "Skill",
  "tool_input": {
    "skill": "claude-code-cli:issue-bug"
  }
}
EOF
)
echo "$INPUT1" | "$TARGET_SCRIPT" > /dev/null 2>&1

# Second skill
INPUT2=$(cat <<EOF
{
  "session_id": "$SESSION_ID",
  "hook_event_name": "PostToolUse",
  "tool_name": "Skill",
  "tool_input": {
    "skill": "claude-code-cli:issue-implementation"
  }
}
EOF
)
run_test "Accumulates multiple skills" "$INPUT2" 0

# Verify both skills are present
STATE_FILE="$HOME/.compare-branch/hook-state/${SESSION_ID}.json"
if [ -f "$STATE_FILE" ]; then
    SKILL_COUNT=$(jq '.cliSkills | length' "$STATE_FILE")
    HAS_BUG=$(jq '.cliSkills | contains(["issue-bug"])' "$STATE_FILE")
    HAS_IMPL=$(jq '.cliSkills | contains(["issue-implementation"])' "$STATE_FILE")
    if [ "$SKILL_COUNT" -eq 2 ] && [ "$HAS_BUG" = "true" ] && [ "$HAS_IMPL" = "true" ]; then
        echo "Verified: Both skills accumulated"
    else
        echo -e "${RED}FAIL${NC} - Expected 2 skills with issue-bug and issue-implementation"
        echo "Actual: $(jq -c '.cliSkills' "$STATE_FILE")"
        TESTS_PASSED=$((TESTS_PASSED - 1))
    fi
else
    echo -e "${RED}FAIL${NC} - State file not found"
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
