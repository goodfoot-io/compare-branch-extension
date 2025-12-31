#!/bin/bash

# Test suite for cli-skill-reloader hook
# Tests reload instruction generation for tracked claude-code-cli skills

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
TARGET_SCRIPT="$SCRIPT_DIR/cli-skill-reloader.sh"

# Setup mock home directory
setup_mock_home() {
    export HOME="$TEST_DIR/mock-home"
    mkdir -p "$HOME/.compare-branch/hook-state"
}

# Cleanup mock home directory
cleanup_mock_home() {
    export HOME="$ORIGINAL_HOME"
}

# Function to run a test and check output
run_test_with_output() {
    local test_name="$1"
    local input="$2"
    local expected_contains="$3"
    local expected_exit_code="${4:-0}"

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
    echo "Output: $output"

    if [ $exit_code -ne "$expected_exit_code" ]; then
        echo -e "${RED}FAIL${NC} - unexpected exit code"
        if [ -n "$stderr_output" ]; then
            echo "Stderr: $stderr_output"
        fi
        return 1
    fi

    if [ -n "$expected_contains" ]; then
        if echo "$output" | grep -q "$expected_contains"; then
            echo "Verified: Output contains expected string"
        else
            echo -e "${RED}FAIL${NC} - Output does not contain: $expected_contains"
            return 1
        fi
    fi

    echo -e "${GREEN}PASS${NC}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
    return 0
}

echo "Running cli-skill-reloader tests..."
echo "===================================="
echo "Test directory: $TEST_DIR"
echo "Script path: $TARGET_SCRIPT"

# Test 1: Returns empty JSON when no session_id
echo -e "\n${YELLOW}=== Test 1: Returns empty JSON when no session_id ===${NC}"
setup_mock_home
INPUT='{}'
run_test_with_output "No session_id returns empty JSON" "$INPUT" "" 0

# Test 2: Returns empty JSON when no state file exists
echo -e "\n${YELLOW}=== Test 2: Returns empty JSON when no state file exists ===${NC}"
setup_mock_home
SESSION_ID="test-session-2"
INPUT=$(cat <<EOF
{
  "session_id": "$SESSION_ID",
  "hook_event_name": "SessionStart"
}
EOF
)
run_test_with_output "No state file returns empty JSON" "$INPUT" "" 0

# Test 3: Returns empty JSON when cliSkills is empty
echo -e "\n${YELLOW}=== Test 3: Returns empty JSON when cliSkills is empty ===${NC}"
setup_mock_home
SESSION_ID="test-session-3"
cat > "$HOME/.compare-branch/hook-state/${SESSION_ID}.json" <<EOF
{"issuesApiLoaded":true,"issueIds":[],"cliSkills":[]}
EOF
INPUT=$(cat <<EOF
{
  "session_id": "$SESSION_ID",
  "hook_event_name": "SessionStart"
}
EOF
)
run_test_with_output "Empty cliSkills returns empty JSON" "$INPUT" "" 0

# Test 4: Returns reload instruction for single skill
echo -e "\n${YELLOW}=== Test 4: Returns reload instruction for single skill ===${NC}"
setup_mock_home
SESSION_ID="test-session-4"
cat > "$HOME/.compare-branch/hook-state/${SESSION_ID}.json" <<EOF
{"issuesApiLoaded":true,"issueIds":[],"cliSkills":["issue-bug"]}
EOF
INPUT=$(cat <<EOF
{
  "session_id": "$SESSION_ID",
  "hook_event_name": "SessionStart"
}
EOF
)
run_test_with_output "Single skill returns reload instruction" "$INPUT" "claude-code-cli:issue-bug" 0

# Verify the output format
TESTS_RUN=$((TESTS_RUN + 1))
echo -e "\n${YELLOW}TEST: Verify single skill output format${NC}"
OUTPUT=$(echo "$INPUT" | "$TARGET_SCRIPT")
HAS_ADDITIONAL_CONTEXT=$(echo "$OUTPUT" | jq -r '.hookSpecificOutput.additionalContext')
if [ "$HAS_ADDITIONAL_CONTEXT" = "Load skill 'claude-code-cli:issue-bug' before continuing" ]; then
    echo -e "${GREEN}PASS${NC} - Correct additionalContext format"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "${RED}FAIL${NC} - Expected: Load skill 'claude-code-cli:issue-bug' before continuing"
    echo "Actual: $HAS_ADDITIONAL_CONTEXT"
fi

# Test 5: Returns reload instruction for two skills with "and"
echo -e "\n${YELLOW}=== Test 5: Returns reload instruction for two skills ===${NC}"
setup_mock_home
SESSION_ID="test-session-5"
cat > "$HOME/.compare-branch/hook-state/${SESSION_ID}.json" <<EOF
{"cliSkills":["issue-bug","issue-implementation"]}
EOF
INPUT=$(cat <<EOF
{
  "session_id": "$SESSION_ID",
  "hook_event_name": "SessionStart"
}
EOF
)
run_test_with_output "Two skills use 'and' conjunction" "$INPUT" "and" 0

# Verify the exact format
TESTS_RUN=$((TESTS_RUN + 1))
echo -e "\n${YELLOW}TEST: Verify two skills output format${NC}"
OUTPUT=$(echo "$INPUT" | "$TARGET_SCRIPT")
HAS_ADDITIONAL_CONTEXT=$(echo "$OUTPUT" | jq -r '.hookSpecificOutput.additionalContext')
EXPECTED="Load skill 'claude-code-cli:issue-bug' and 'claude-code-cli:issue-implementation' before continuing"
if [ "$HAS_ADDITIONAL_CONTEXT" = "$EXPECTED" ]; then
    echo -e "${GREEN}PASS${NC} - Correct two-skill format"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "${RED}FAIL${NC} - Expected: $EXPECTED"
    echo "Actual: $HAS_ADDITIONAL_CONTEXT"
fi

# Test 6: Returns reload instruction for three+ skills with Oxford comma
echo -e "\n${YELLOW}=== Test 6: Returns reload instruction for three skills ===${NC}"
setup_mock_home
SESSION_ID="test-session-6"
cat > "$HOME/.compare-branch/hook-state/${SESSION_ID}.json" <<EOF
{"cliSkills":["issue-bug","issue-implementation","issue-clarification"]}
EOF
INPUT=$(cat <<EOF
{
  "session_id": "$SESSION_ID",
  "hook_event_name": "SessionStart"
}
EOF
)
run_test_with_output "Three skills use Oxford comma" "$INPUT" ", and" 0

# Verify the exact format
TESTS_RUN=$((TESTS_RUN + 1))
echo -e "\n${YELLOW}TEST: Verify three skills output format${NC}"
OUTPUT=$(echo "$INPUT" | "$TARGET_SCRIPT")
HAS_ADDITIONAL_CONTEXT=$(echo "$OUTPUT" | jq -r '.hookSpecificOutput.additionalContext')
EXPECTED="Load skill 'claude-code-cli:issue-bug', 'claude-code-cli:issue-implementation', and 'claude-code-cli:issue-clarification' before continuing"
if [ "$HAS_ADDITIONAL_CONTEXT" = "$EXPECTED" ]; then
    echo -e "${GREEN}PASS${NC} - Correct three-skill format with Oxford comma"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "${RED}FAIL${NC} - Expected: $EXPECTED"
    echo "Actual: $HAS_ADDITIONAL_CONTEXT"
fi

# Test 7: Includes hookEventName in output
echo -e "\n${YELLOW}=== Test 7: Includes hookEventName in output ===${NC}"
setup_mock_home
SESSION_ID="test-session-7"
cat > "$HOME/.compare-branch/hook-state/${SESSION_ID}.json" <<EOF
{"cliSkills":["issue-bug"]}
EOF
INPUT=$(cat <<EOF
{
  "session_id": "$SESSION_ID",
  "hook_event_name": "SessionStart"
}
EOF
)

TESTS_RUN=$((TESTS_RUN + 1))
echo -e "\n${YELLOW}TEST: hookEventName is SessionStart${NC}"
OUTPUT=$(echo "$INPUT" | "$TARGET_SCRIPT")
HOOK_EVENT=$(echo "$OUTPUT" | jq -r '.hookSpecificOutput.hookEventName')
if [ "$HOOK_EVENT" = "SessionStart" ]; then
    echo -e "${GREEN}PASS${NC} - Correct hookEventName"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "${RED}FAIL${NC} - Expected: SessionStart, got: $HOOK_EVENT"
fi

# Test 8: Includes systemMessage in output with human-readable format
echo -e "\n${YELLOW}=== Test 8: Includes systemMessage in output ===${NC}"
setup_mock_home
SESSION_ID="test-session-8"
cat > "$HOME/.compare-branch/hook-state/${SESSION_ID}.json" <<EOF
{"cliSkills":["issue-bug"]}
EOF
INPUT=$(cat <<EOF
{
  "session_id": "$SESSION_ID",
  "hook_event_name": "SessionStart"
}
EOF
)

TESTS_RUN=$((TESTS_RUN + 1))
echo -e "\n${YELLOW}TEST: systemMessage has human-readable format for single skill${NC}"
OUTPUT=$(echo "$INPUT" | "$TARGET_SCRIPT")
SYSTEM_MSG=$(echo "$OUTPUT" | jq -r '.systemMessage')
EXPECTED_MSG="Reloading skill: claude-code-cli:issue-bug"
if [ "$SYSTEM_MSG" = "$EXPECTED_MSG" ]; then
    echo -e "${GREEN}PASS${NC} - systemMessage has correct human-readable format"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "${RED}FAIL${NC} - Expected: $EXPECTED_MSG"
    echo "Actual: $SYSTEM_MSG"
fi

# Test 9: Multiple skills systemMessage format
echo -e "\n${YELLOW}=== Test 9: Multiple skills systemMessage format ===${NC}"
setup_mock_home
SESSION_ID="test-session-9"
cat > "$HOME/.compare-branch/hook-state/${SESSION_ID}.json" <<EOF
{"cliSkills":["issue-bug","issue-implementation"]}
EOF
INPUT=$(cat <<EOF
{
  "session_id": "$SESSION_ID",
  "hook_event_name": "SessionStart"
}
EOF
)

TESTS_RUN=$((TESTS_RUN + 1))
echo -e "\n${YELLOW}TEST: systemMessage has human-readable format for multiple skills${NC}"
OUTPUT=$(echo "$INPUT" | "$TARGET_SCRIPT")
SYSTEM_MSG=$(echo "$OUTPUT" | jq -r '.systemMessage')
EXPECTED_MSG="Reloading skills: claude-code-cli:issue-bug, claude-code-cli:issue-implementation"
if [ "$SYSTEM_MSG" = "$EXPECTED_MSG" ]; then
    echo -e "${GREEN}PASS${NC} - systemMessage has correct human-readable format for multiple skills"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "${RED}FAIL${NC} - Expected: $EXPECTED_MSG"
    echo "Actual: $SYSTEM_MSG"
fi

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
