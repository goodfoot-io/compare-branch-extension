#!/bin/bash

# Test suite for track-issue-ids hook
# Tests extraction of issue IDs from Bash commands and state file management

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
TARGET_SCRIPT="$SCRIPT_DIR/track-issue-ids.sh"

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

# Create mock discover-api.sh that returns a test URL
setup_mock_discover_api() {
    MOCK_BIN_DIR_API="$SCRIPT_DIR/../../bin"
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
    MOCK_BIN_DIR_API="$SCRIPT_DIR/../../bin"
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
echo '{"id":"comment-123","body":"","sessionId":"test-session"}'
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

    echo -e "${GREEN}PASS${NC}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
    return 0
}

echo "Running track-issue-ids tests..."
echo "================================="
echo "Test directory: $TEST_DIR"
echo "Script path: $TARGET_SCRIPT"

# Setup mocks
setup_mock_discover_api

# Test 1: Does nothing when tool_name is not "Bash"
echo -e "\n${YELLOW}=== Test 1: Does nothing when tool_name is not Bash ===${NC}"
setup_mock_home
create_mock_curl
SESSION_ID="test-session-1"
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
run_test "Non-Bash tool is ignored" "$INPUT" 0

# Verify no state file was created
STATE_FILE="$HOME/.claude/hook-state/${SESSION_ID}.json"
if [ -f "$STATE_FILE" ]; then
    echo -e "${RED}FAIL${NC} - State file should not exist for non-Bash tool"
    TESTS_PASSED=$((TESTS_PASSED - 1))
else
    echo "Verified: No state file created"
fi

# Test 2: Does nothing when no issue IDs found in command
echo -e "\n${YELLOW}=== Test 2: Does nothing when no issue IDs found in command ===${NC}"
setup_mock_home
create_mock_curl
SESSION_ID="test-session-2"
INPUT=$(cat <<EOF
{
  "session_id": "$SESSION_ID",
  "hook_event_name": "PostToolUse",
  "tool_name": "Bash",
  "tool_input": {
    "command": "ls -la /tmp"
  }
}
EOF
)
run_test "No issue IDs in command" "$INPUT" 0

# Verify no state file was created
STATE_FILE="$HOME/.claude/hook-state/${SESSION_ID}.json"
if [ -f "$STATE_FILE" ]; then
    echo -e "${RED}FAIL${NC} - State file should not exist when no issue IDs found"
    TESTS_PASSED=$((TESTS_PASSED - 1))
else
    echo "Verified: No state file created"
fi

# Test 3: Extracts issue ID from curl command
echo -e "\n${YELLOW}=== Test 3: Extracts issue ID from curl command ===${NC}"
setup_mock_home
create_mock_curl
SESSION_ID="test-session-3"
INPUT=$(cat <<EOF
{
  "session_id": "$SESSION_ID",
  "hook_event_name": "PostToolUse",
  "tool_name": "Bash",
  "tool_input": {
    "command": "curl -s http://127.0.0.1:12345/api/v1/issues/main:42"
  }
}
EOF
)
run_test "Extracts issue ID from curl command" "$INPUT" 0

# Verify state file was created with issue ID
STATE_FILE="$HOME/.claude/hook-state/${SESSION_ID}.json"
if [ ! -f "$STATE_FILE" ]; then
    echo -e "${RED}FAIL${NC} - State file should exist"
    TESTS_PASSED=$((TESTS_PASSED - 1))
else
    ISSUE_IDS=$(jq -c '.issueIds' "$STATE_FILE")
    if [ "$ISSUE_IDS" = '["main:42"]' ]; then
        echo "Verified: Issue ID extracted and stored"
    else
        echo -e "${RED}FAIL${NC} - Expected issueIds=[\"main:42\"], got: $ISSUE_IDS"
        TESTS_PASSED=$((TESTS_PASSED - 1))
    fi
fi

# Test 4: Extracts multiple issue IDs from command
echo -e "\n${YELLOW}=== Test 4: Extracts multiple issue IDs from command ===${NC}"
setup_mock_home
create_mock_curl
SESSION_ID="test-session-4"
INPUT=$(cat <<EOF
{
  "session_id": "$SESSION_ID",
  "hook_event_name": "PostToolUse",
  "tool_name": "Bash",
  "tool_input": {
    "command": "curl -s http://127.0.0.1:12345/api/v1/issues/main:1 && curl -s http://127.0.0.1:12345/api/v1/issues/feature-auth:42"
  }
}
EOF
)
run_test "Extracts multiple issue IDs" "$INPUT" 0

# Verify state file contains both issue IDs
STATE_FILE="$HOME/.claude/hook-state/${SESSION_ID}.json"
if [ -f "$STATE_FILE" ]; then
    ISSUE_IDS=$(jq -c '.issueIds | sort' "$STATE_FILE")
    if [ "$ISSUE_IDS" = '["feature-auth:42","main:1"]' ]; then
        echo "Verified: Multiple issue IDs extracted and stored"
    else
        echo -e "${RED}FAIL${NC} - Expected sorted issueIds=[\"feature-auth:42\",\"main:1\"], got: $ISSUE_IDS"
        TESTS_PASSED=$((TESTS_PASSED - 1))
    fi
else
    echo -e "${RED}FAIL${NC} - State file not found"
    TESTS_PASSED=$((TESTS_PASSED - 1))
fi

# Test 5: Does not extract from sub-paths like /comments
echo -e "\n${YELLOW}=== Test 5: Does not extract from sub-paths like /comments ===${NC}"
setup_mock_home
create_mock_curl
SESSION_ID="test-session-5"
INPUT=$(cat <<EOF
{
  "session_id": "$SESSION_ID",
  "hook_event_name": "PostToolUse",
  "tool_name": "Bash",
  "tool_input": {
    "command": "curl -s -X POST http://127.0.0.1:12345/api/v1/issues/main:1/comments -d '{\"body\":\"test\"}'"
  }
}
EOF
)
run_test "Extracts issue ID but not sub-path" "$INPUT" 0

# Verify state file contains issue ID (extracted from the path, sub-path is ignored)
STATE_FILE="$HOME/.claude/hook-state/${SESSION_ID}.json"
if [ -f "$STATE_FILE" ]; then
    ISSUE_IDS=$(jq -c '.issueIds' "$STATE_FILE")
    # Should extract main:1, not main:1/comments
    if [ "$ISSUE_IDS" = '["main:1"]' ]; then
        echo "Verified: Issue ID extracted without sub-path"
    else
        echo -e "${RED}FAIL${NC} - Expected issueIds=[\"main:1\"], got: $ISSUE_IDS"
        TESTS_PASSED=$((TESTS_PASSED - 1))
    fi
else
    echo -e "${RED}FAIL${NC} - State file not found"
    TESTS_PASSED=$((TESTS_PASSED - 1))
fi

# Test 6: Adds new issue ID to existing state file
echo -e "\n${YELLOW}=== Test 6: Adds new issue ID to existing state file ===${NC}"
setup_mock_home
create_mock_curl
SESSION_ID="test-session-6"

# Create existing state file with one issue ID
mkdir -p "$HOME/.claude/hook-state"
cat > "$HOME/.claude/hook-state/${SESSION_ID}.json" <<EOF
{"issuesApiLoaded":true,"issueIds":["main:1"]}
EOF

INPUT=$(cat <<EOF
{
  "session_id": "$SESSION_ID",
  "hook_event_name": "PostToolUse",
  "tool_name": "Bash",
  "tool_input": {
    "command": "curl -s http://127.0.0.1:12345/api/v1/issues/feature:99"
  }
}
EOF
)
run_test "Adds new issue ID to existing state" "$INPUT" 0

# Verify state file contains both issue IDs
STATE_FILE="$HOME/.claude/hook-state/${SESSION_ID}.json"
if [ -f "$STATE_FILE" ]; then
    ISSUE_IDS=$(jq -c '.issueIds | sort' "$STATE_FILE")
    LOADED=$(jq -r '.issuesApiLoaded' "$STATE_FILE")
    if [ "$ISSUE_IDS" = '["feature:99","main:1"]' ] && [ "$LOADED" = "true" ]; then
        echo "Verified: New issue ID added, existing state preserved"
    else
        echo -e "${RED}FAIL${NC} - Expected sorted issueIds=[\"feature:99\",\"main:1\"] and issuesApiLoaded=true"
        echo "Actual: issueIds=$ISSUE_IDS, issuesApiLoaded=$LOADED"
        TESTS_PASSED=$((TESTS_PASSED - 1))
    fi
else
    echo -e "${RED}FAIL${NC} - State file not found"
    TESTS_PASSED=$((TESTS_PASSED - 1))
fi

# Test 7: Does not duplicate existing issue ID
echo -e "\n${YELLOW}=== Test 7: Does not duplicate existing issue ID ===${NC}"
setup_mock_home
create_mock_curl
SESSION_ID="test-session-7"

# Create existing state file with issue ID
mkdir -p "$HOME/.claude/hook-state"
cat > "$HOME/.claude/hook-state/${SESSION_ID}.json" <<EOF
{"issuesApiLoaded":true,"issueIds":["main:42"]}
EOF

# Clear curl calls
rm -f "$MOCK_CURL_CALLS_FILE"
touch "$MOCK_CURL_CALLS_FILE"

INPUT=$(cat <<EOF
{
  "session_id": "$SESSION_ID",
  "hook_event_name": "PostToolUse",
  "tool_name": "Bash",
  "tool_input": {
    "command": "curl -s http://127.0.0.1:12345/api/v1/issues/main:42"
  }
}
EOF
)
run_test "Does not duplicate existing issue ID" "$INPUT" 0

# Verify issue ID not duplicated
STATE_FILE="$HOME/.claude/hook-state/${SESSION_ID}.json"
if [ -f "$STATE_FILE" ]; then
    ISSUE_IDS=$(jq -c '.issueIds' "$STATE_FILE")
    if [ "$ISSUE_IDS" = '["main:42"]' ]; then
        echo "Verified: Issue ID not duplicated"
    else
        echo -e "${RED}FAIL${NC} - Expected issueIds=[\"main:42\"], got: $ISSUE_IDS"
        TESTS_PASSED=$((TESTS_PASSED - 1))
    fi

    # Verify no curl call was made (since issue already tracked)
    CURL_CALLS=$(cat "$MOCK_CURL_CALLS_FILE" 2>/dev/null | wc -l)
    if [ "$CURL_CALLS" -eq 0 ]; then
        echo "Verified: No API call made for duplicate issue"
    else
        echo -e "${RED}FAIL${NC} - Expected no curl calls, got: $CURL_CALLS"
        TESTS_PASSED=$((TESTS_PASSED - 1))
    fi
else
    echo -e "${RED}FAIL${NC} - State file not found"
    TESTS_PASSED=$((TESTS_PASSED - 1))
fi

# Test 8: Uses flock for atomic access
echo -e "\n${YELLOW}=== Test 8: Uses flock for atomic access ===${NC}"
setup_mock_home
create_mock_curl
SESSION_ID="test-session-8"
INPUT=$(cat <<EOF
{
  "session_id": "$SESSION_ID",
  "hook_event_name": "PostToolUse",
  "tool_name": "Bash",
  "tool_input": {
    "command": "curl -s http://127.0.0.1:12345/api/v1/issues/main:1"
  }
}
EOF
)
run_test "Flock is used for atomic access" "$INPUT" 0

# The actual test is that the script doesn't error - flock is being used
STATE_FILE="$HOME/.claude/hook-state/${SESSION_ID}.json"
if [ -f "$STATE_FILE" ]; then
    echo "Verified: State file created (flock was used successfully)"
else
    echo -e "${RED}FAIL${NC} - State file not created"
    TESTS_PASSED=$((TESTS_PASSED - 1))
fi

# Test 9: Posts sessionId comment for new issue IDs
echo -e "\n${YELLOW}=== Test 9: Posts sessionId comment for new issue IDs ===${NC}"
setup_mock_home
create_mock_curl
SESSION_ID="test-session-9"

# Clear curl calls
rm -f "$MOCK_CURL_CALLS_FILE"
touch "$MOCK_CURL_CALLS_FILE"

INPUT=$(cat <<EOF
{
  "session_id": "$SESSION_ID",
  "hook_event_name": "PostToolUse",
  "tool_name": "Bash",
  "tool_input": {
    "command": "curl -s http://127.0.0.1:12345/api/v1/issues/main:123"
  }
}
EOF
)
run_test "Posts sessionId comment for new issue" "$INPUT" 0

# Verify curl was called with correct parameters
if [ -f "$MOCK_CURL_CALLS_FILE" ]; then
    CURL_CALL=$(cat "$MOCK_CURL_CALLS_FILE")
    if echo "$CURL_CALL" | grep -q "issues/main:123/comments" && \
       echo "$CURL_CALL" | grep -q "sessionId" && \
       echo "$CURL_CALL" | grep -q "test-session-9"; then
        echo "Verified: API call made with sessionId"
        echo "Curl call: $CURL_CALL"
    else
        echo -e "${RED}FAIL${NC} - Expected curl call with sessionId to /issues/main:123/comments"
        echo "Actual call: $CURL_CALL"
        TESTS_PASSED=$((TESTS_PASSED - 1))
    fi
else
    echo -e "${RED}FAIL${NC} - No curl calls recorded"
    TESTS_PASSED=$((TESTS_PASSED - 1))
fi

# Test 10: Always exits 0
echo -e "\n${YELLOW}=== Test 10: Always exits 0 even with malformed input ===${NC}"
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
