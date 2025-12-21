#!/bin/bash

# Test suite for session-stop hook
# Tests that session completion is reported to API when issues:api was loaded
# and that graceful shutdown is triggered when there are issues needing attention

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
TARGET_SCRIPT="$SCRIPT_DIR/session-stop.sh"

# Set CLAUDE_PLUGIN_ROOT for the target script
export CLAUDE_PLUGIN_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Mock curl tracking
MOCK_CURL_CALLS_FILE=""

# Enable test mode to prevent actual signal sending
export SESSION_STOP_TEST_MODE=1

# Enable second stop behavior for tests that need it
export SEND_SIGTERM_TO_CLAUDE=1

# Set DISPATCHER_PID to enable second stop logic (required for second stop to proceed)
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

# Create mock curl that logs calls and returns configurable response
# Usage: create_mock_curl [issues_response]
create_mock_curl() {
    local issues_response="${1:-}"
    MOCK_BIN_DIR="$TEST_DIR/mock-bin"
    mkdir -p "$MOCK_BIN_DIR"

    cat > "$MOCK_BIN_DIR/curl" << MOCKEOF
#!/bin/bash
echo "\$@" >> "$MOCK_CURL_CALLS_FILE"
# Check if this is a GET request for /issues
if echo "\$@" | grep -q "issues\$"; then
    echo '$issues_response'
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

# Create mock curl that returns locks data for /locks endpoint
# Usage: create_mock_curl_with_locks [issues_response] [locks_response]
create_mock_curl_with_locks() {
    local issues_response="${1:-}"
    local locks_response="${2:-}"
    MOCK_BIN_DIR="$TEST_DIR/mock-bin"
    mkdir -p "$MOCK_BIN_DIR"

    cat > "$MOCK_BIN_DIR/curl" << MOCKEOF
#!/bin/bash
echo "\$@" >> "$MOCK_CURL_CALLS_FILE"
# Check if this is a GET request for /locks
if echo "\$@" | grep -q "locks?issueId="; then
    echo '$locks_response'
# Check if this is a GET request for /issues
elif echo "\$@" | grep -q "issues\$"; then
    echo '$issues_response'
else
    echo '{"acknowledged":true}'
fi
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

    echo -e "${GREEN}PASS${NC}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
    return 0
}

echo "Running session-stop tests..."
echo "=============================="
echo "Test directory: $TEST_DIR"
echo "Script path: $TARGET_SCRIPT"
echo "Test mode: SESSION_STOP_TEST_MODE=$SESSION_STOP_TEST_MODE"

# Setup mocks
setup_mock_discover_api

# Test 1: Exits 0 if state file doesn't exist
echo -e "\n${YELLOW}=== Test 1: Exits 0 if state file doesn't exist ===${NC}"
setup_mock_home
create_mock_curl
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
run_test "Exits 0 when no state file" "$INPUT" 0

# Verify no curl call was made
CURL_CALLS=$(cat "$MOCK_CURL_CALLS_FILE" 2>/dev/null | wc -l)
if [ "$CURL_CALLS" -eq 0 ]; then
    echo "Verified: No API call made when state file missing"
else
    echo -e "${RED}FAIL${NC} - Expected no curl calls, got: $CURL_CALLS"
    TESTS_PASSED=$((TESTS_PASSED - 1))
fi

# Test 2: Exits 0 if issuesApiLoaded is false
echo -e "\n${YELLOW}=== Test 2: Exits 0 if issuesApiLoaded is false ===${NC}"
setup_mock_home
create_mock_curl
SESSION_ID="test-session-2"

# Create state file with issuesApiLoaded = false
mkdir -p "$HOME/.claude/hook-state"
cat > "$HOME/.claude/hook-state/${SESSION_ID}.json" <<EOF
{"issuesApiLoaded":false,"issueIds":["main:1"]}
EOF

INPUT=$(cat <<EOF
{
  "session_id": "$SESSION_ID",
  "transcript_path": "/tmp/transcript.jsonl",
  "cwd": "/workspace",
  "hook_event_name": "Stop"
}
EOF
)
run_test "Exits 0 when issuesApiLoaded is false" "$INPUT" 0

# Verify no curl call was made
CURL_CALLS=$(cat "$MOCK_CURL_CALLS_FILE" 2>/dev/null | wc -l)
if [ "$CURL_CALLS" -eq 0 ]; then
    echo "Verified: No API call made when issuesApiLoaded is false"
else
    echo -e "${RED}FAIL${NC} - Expected no curl calls, got: $CURL_CALLS"
    TESTS_PASSED=$((TESTS_PASSED - 1))
fi

# Test 3: Exits 0 if issuesApiLoaded is missing from state
echo -e "\n${YELLOW}=== Test 3: Exits 0 if issuesApiLoaded is missing ===${NC}"
setup_mock_home
create_mock_curl
SESSION_ID="test-session-3"

# Create state file without issuesApiLoaded field
mkdir -p "$HOME/.claude/hook-state"
cat > "$HOME/.claude/hook-state/${SESSION_ID}.json" <<EOF
{"issueIds":["main:1"]}
EOF

INPUT=$(cat <<EOF
{
  "session_id": "$SESSION_ID",
  "transcript_path": "/tmp/transcript.jsonl",
  "cwd": "/workspace",
  "hook_event_name": "Stop"
}
EOF
)
run_test "Exits 0 when issuesApiLoaded is missing" "$INPUT" 0

# Verify no curl call was made
CURL_CALLS=$(cat "$MOCK_CURL_CALLS_FILE" 2>/dev/null | wc -l)
if [ "$CURL_CALLS" -eq 0 ]; then
    echo "Verified: No API call made when issuesApiLoaded is missing"
else
    echo -e "${RED}FAIL${NC} - Expected no curl calls, got: $CURL_CALLS"
    TESTS_PASSED=$((TESTS_PASSED - 1))
fi

# Test 4: POSTs to /session/stop when issuesApiLoaded is true (second stop)
echo -e "\n${YELLOW}=== Test 4: POSTs to /session/stop when issuesApiLoaded is true ===${NC}"
setup_mock_home
create_mock_curl '{"branch":"main","issues":[],"summary":{"total":0,"todo":0,"inProgress":0,"needsReview":0,"done":0,"backlog":0,"needingAgentAttention":0}}'
SESSION_ID="test-session-4"

# Create state file with issuesApiLoaded = true
mkdir -p "$HOME/.claude/hook-state"
cat > "$HOME/.claude/hook-state/${SESSION_ID}.json" <<EOF
{"issuesApiLoaded":true,"issueIds":["main:1","feature:42"]}
EOF

INPUT=$(cat <<EOF
{
  "session_id": "$SESSION_ID",
  "transcript_path": "/tmp/transcript.jsonl",
  "cwd": "/workspace",
  "hook_event_name": "Stop",
  "stop_hook_active": true
}
EOF
)
run_test "POSTs to /session/stop when loaded" "$INPUT" 0

# Verify curl was called with correct endpoint
if [ -f "$MOCK_CURL_CALLS_FILE" ]; then
    CURL_CALL=$(cat "$MOCK_CURL_CALLS_FILE")
    if echo "$CURL_CALL" | grep -q "session/stop"; then
        echo "Verified: API call made to /session/stop"
    else
        echo -e "${RED}FAIL${NC} - Expected curl call to /session/stop"
        echo "Actual call: $CURL_CALL"
        TESTS_PASSED=$((TESTS_PASSED - 1))
    fi
else
    echo -e "${RED}FAIL${NC} - No curl calls recorded"
    TESTS_PASSED=$((TESTS_PASSED - 1))
fi

# Test 5: Uses correct sessionId in POST body (second stop)
echo -e "\n${YELLOW}=== Test 5: Uses correct sessionId in POST body ===${NC}"
setup_mock_home
create_mock_curl '{"branch":"main","issues":[],"summary":{"total":0,"todo":0,"inProgress":0,"needsReview":0,"done":0,"backlog":0,"needingAgentAttention":0}}'
SESSION_ID="unique-session-id-12345"

# Create state file with issuesApiLoaded = true
mkdir -p "$HOME/.claude/hook-state"
cat > "$HOME/.claude/hook-state/${SESSION_ID}.json" <<EOF
{"issuesApiLoaded":true,"issueIds":[]}
EOF

INPUT=$(cat <<EOF
{
  "session_id": "$SESSION_ID",
  "transcript_path": "/tmp/transcript.jsonl",
  "cwd": "/workspace",
  "hook_event_name": "Stop",
  "stop_hook_active": true
}
EOF
)
run_test "Uses correct sessionId in POST body" "$INPUT" 0

# Verify curl was called with correct sessionId
if [ -f "$MOCK_CURL_CALLS_FILE" ]; then
    CURL_CALL=$(cat "$MOCK_CURL_CALLS_FILE")
    if echo "$CURL_CALL" | grep -q "unique-session-id-12345"; then
        echo "Verified: API call includes correct sessionId"
        echo "Curl call: $CURL_CALL"
    else
        echo -e "${RED}FAIL${NC} - Expected curl call with sessionId 'unique-session-id-12345'"
        echo "Actual call: $CURL_CALL"
        TESTS_PASSED=$((TESTS_PASSED - 1))
    fi
else
    echo -e "${RED}FAIL${NC} - No curl calls recorded"
    TESTS_PASSED=$((TESTS_PASSED - 1))
fi

# Test 6: Exits 0 even if API call fails (second stop)
echo -e "\n${YELLOW}=== Test 6: Exits 0 even if API call fails ===${NC}"
setup_mock_home
create_failing_mock_curl
SESSION_ID="test-session-6"

# Create state file with issuesApiLoaded = true
mkdir -p "$HOME/.claude/hook-state"
cat > "$HOME/.claude/hook-state/${SESSION_ID}.json" <<EOF
{"issuesApiLoaded":true,"issueIds":["main:1"]}
EOF

INPUT=$(cat <<EOF
{
  "session_id": "$SESSION_ID",
  "transcript_path": "/tmp/transcript.jsonl",
  "cwd": "/workspace",
  "hook_event_name": "Stop",
  "stop_hook_active": true
}
EOF
)
run_test "Exits 0 even when API fails" "$INPUT" 0

# Test 7: Exits 0 on malformed input
echo -e "\n${YELLOW}=== Test 7: Exits 0 on malformed input ===${NC}"
setup_mock_home
create_mock_curl
INPUT="not valid json at all"
run_test "Exits 0 with malformed input" "$INPUT" 0

# Verify no curl call was made
CURL_CALLS=$(cat "$MOCK_CURL_CALLS_FILE" 2>/dev/null | wc -l)
if [ "$CURL_CALLS" -eq 0 ]; then
    echo "Verified: No API call made with malformed input"
else
    echo -e "${RED}FAIL${NC} - Expected no curl calls, got: $CURL_CALLS"
    TESTS_PASSED=$((TESTS_PASSED - 1))
fi

# Test 8: Does NOT modify or delete state file (read-only, second stop)
echo -e "\n${YELLOW}=== Test 8: Does NOT modify or delete state file ===${NC}"
setup_mock_home
create_mock_curl '{"branch":"main","issues":[],"summary":{"total":0,"todo":0,"inProgress":0,"needsReview":0,"done":0,"backlog":0,"needingAgentAttention":0}}'
SESSION_ID="test-session-8"

# Create state file with known content
mkdir -p "$HOME/.claude/hook-state"
ORIGINAL_STATE='{"issuesApiLoaded":true,"issueIds":["main:1","feature:42"]}'
echo "$ORIGINAL_STATE" > "$HOME/.claude/hook-state/${SESSION_ID}.json"

INPUT=$(cat <<EOF
{
  "session_id": "$SESSION_ID",
  "transcript_path": "/tmp/transcript.jsonl",
  "cwd": "/workspace",
  "hook_event_name": "Stop",
  "stop_hook_active": true
}
EOF
)
run_test "Does not modify state file" "$INPUT" 0

# Verify state file still exists and is unchanged
STATE_FILE="$HOME/.claude/hook-state/${SESSION_ID}.json"
if [ ! -f "$STATE_FILE" ]; then
    echo -e "${RED}FAIL${NC} - State file was deleted"
    TESTS_PASSED=$((TESTS_PASSED - 1))
else
    CURRENT_STATE=$(cat "$STATE_FILE")
    if [ "$CURRENT_STATE" = "$ORIGINAL_STATE" ]; then
        echo "Verified: State file unchanged"
    else
        echo -e "${RED}FAIL${NC} - State file was modified"
        echo "Original: $ORIGINAL_STATE"
        echo "Current: $CURRENT_STATE"
        TESTS_PASSED=$((TESTS_PASSED - 1))
    fi
fi

# Test 9: Exits 0 when session_id is missing from input
echo -e "\n${YELLOW}=== Test 9: Exits 0 when session_id is missing ===${NC}"
setup_mock_home
create_mock_curl
INPUT=$(cat <<EOF
{
  "transcript_path": "/tmp/transcript.jsonl",
  "cwd": "/workspace",
  "hook_event_name": "Stop"
}
EOF
)
run_test "Exits 0 when session_id missing" "$INPUT" 0

# Verify no curl call was made
CURL_CALLS=$(cat "$MOCK_CURL_CALLS_FILE" 2>/dev/null | wc -l)
if [ "$CURL_CALLS" -eq 0 ]; then
    echo "Verified: No API call made when session_id missing"
else
    echo -e "${RED}FAIL${NC} - Expected no curl calls, got: $CURL_CALLS"
    TESTS_PASSED=$((TESTS_PASSED - 1))
fi

# Test 10: Exits 0 when empty input
echo -e "\n${YELLOW}=== Test 10: Exits 0 when empty input ===${NC}"
setup_mock_home
create_mock_curl
INPUT=""
run_test "Exits 0 with empty input" "$INPUT" 0

# Test 11: Sends SIGWINCH (not SIGTERM) when needingAgentAttention is 0 (second stop)
echo -e "\n${YELLOW}=== Test 11: Sends SIGWINCH (not SIGTERM) when needingAgentAttention is 0 ===${NC}"
setup_mock_home
create_mock_curl '{"branch":"main","issues":[],"summary":{"total":2,"todo":1,"inProgress":1,"needsReview":0,"done":0,"backlog":0,"needingAgentAttention":0}}'
SESSION_ID="test-session-11"

# Create state file with issuesApiLoaded = true
mkdir -p "$HOME/.claude/hook-state"
cat > "$HOME/.claude/hook-state/${SESSION_ID}.json" <<EOF
{"issuesApiLoaded":true,"issueIds":["main:1"]}
EOF

INPUT=$(cat <<EOF
{
  "session_id": "$SESSION_ID",
  "transcript_path": "/tmp/transcript.jsonl",
  "cwd": "/workspace",
  "hook_event_name": "Stop",
  "stop_hook_active": true
}
EOF
)
run_test "SIGURG (not SIGTERM) when needingAgentAttention is 0" "$INPUT" 0

# Verify no SIGTERM in stderr
if echo "$LAST_STDERR" | grep -q "TEST_MODE: Would send SIGTERM"; then
    echo -e "${RED}FAIL${NC} - SIGTERM should NOT be triggered when needingAgentAttention is 0"
    echo "Stderr: $LAST_STDERR"
    TESTS_PASSED=$((TESTS_PASSED - 1))
else
    echo "Verified: No SIGTERM triggered when needingAgentAttention is 0"
fi

# Verify SIGWINCH IS sent (to notify dispatcher session ended cleanly)
if echo "$LAST_STDERR" | grep -q "TEST_MODE: Would send SIGWINCH"; then
    echo "Verified: SIGWINCH would be sent to notify dispatcher"
else
    echo -e "${RED}FAIL${NC} - SIGWINCH should be sent when needingAgentAttention is 0"
    echo "Stderr: $LAST_STDERR"
    TESTS_PASSED=$((TESTS_PASSED - 1))
fi

# Test 12: Sends SIGWINCH to dispatcher when DISPATCHER_PID is set
echo -e "\n${YELLOW}=== Test 12: Sends SIGWINCH to dispatcher ===${NC}"
setup_mock_home
create_mock_curl '{"branch":"main","issues":[],"summary":{"total":0,"todo":0,"inProgress":0,"needsReview":0,"done":0,"backlog":0,"needingAgentAttention":0}}'
SESSION_ID="test-session-12"

# Create state file with issuesApiLoaded = true
mkdir -p "$HOME/.claude/hook-state"
cat > "$HOME/.claude/hook-state/${SESSION_ID}.json" <<EOF
{"issuesApiLoaded":true,"issueIds":["main:1"]}
EOF

INPUT=$(cat <<EOF
{
  "session_id": "$SESSION_ID",
  "transcript_path": "/tmp/transcript.jsonl",
  "cwd": "/workspace",
  "hook_event_name": "Stop"
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

# Test 13: No block decision when no locks exist
echo -e "\n${YELLOW}=== Test 13: No block decision when no locks exist ===${NC}"
setup_mock_home
# Return empty locks array
create_mock_curl_with_locks '{"branch":"main","issues":[],"summary":{"total":0}}' '{"locks":[]}'
SESSION_ID="test-session-13"

# Create state file with issuesApiLoaded = true
mkdir -p "$HOME/.claude/hook-state"
cat > "$HOME/.claude/hook-state/${SESSION_ID}.json" <<EOF
{"issuesApiLoaded":true,"issueIds":["main:1"]}
EOF

INPUT=$(cat <<EOF
{
  "session_id": "$SESSION_ID",
  "transcript_path": "/tmp/transcript.jsonl",
  "cwd": "/workspace",
  "hook_event_name": "Stop"
}
EOF
)

TESTS_RUN=$((TESTS_RUN + 1))
echo -e "\n${YELLOW}TEST: No block decision when no locks exist${NC}"

# Capture stdout
STDOUT_FILE="$TEST_DIR/stdout_no_locks"
STDERR_FILE="$TEST_DIR/stderr_no_locks"
echo "$INPUT" | "$TARGET_SCRIPT" > "$STDOUT_FILE" 2>"$STDERR_FILE"
EXIT_CODE=$?

echo "Exit code: $EXIT_CODE (expected: 0)"

if [ $EXIT_CODE -ne 0 ]; then
    echo -e "${RED}FAIL${NC} - unexpected exit code"
    cat "$STDERR_FILE"
else
    # Verify NO block decision in output (no locks = no report)
    STDOUT=$(cat "$STDOUT_FILE")
    if [ -z "$STDOUT" ] || ! echo "$STDOUT" | grep -q '"decision": "block"'; then
        echo "Verified: No block decision when no locks"
    else
        echo -e "${RED}FAIL${NC} - Should NOT have block decision when no locks"
        echo "Stdout: $STDOUT"
        EXIT_CODE=1
    fi

    # Verify curl calls were made (locks query and session/stop)
    CURL_CALLS=$(cat "$MOCK_CURL_CALLS_FILE" 2>/dev/null | wc -l)
    if [ "$CURL_CALLS" -ge 1 ]; then
        echo "Verified: API calls made"
    else
        echo -e "${RED}FAIL${NC} - Expected API calls"
        EXIT_CODE=1
    fi
fi

if [ $EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}PASS${NC}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
fi

rm -f "$STDOUT_FILE" "$STDERR_FILE"

# Test 14: Always calls /session/stop when issuesApiLoaded=true
echo -e "\n${YELLOW}=== Test 14: Always calls /session/stop when issuesApiLoaded=true ===${NC}"
setup_mock_home
create_mock_curl '{"branch":"main","issues":[],"summary":{"total":0,"todo":0,"inProgress":0,"needsReview":0,"done":0,"backlog":0,"needingAgentAttention":0}}'
SESSION_ID="test-session-14"

# Create state file with issuesApiLoaded = true
mkdir -p "$HOME/.claude/hook-state"
cat > "$HOME/.claude/hook-state/${SESSION_ID}.json" <<EOF
{"issuesApiLoaded":true,"issueIds":["main:1"]}
EOF

INPUT=$(cat <<EOF
{
  "session_id": "$SESSION_ID",
  "transcript_path": "/tmp/transcript.jsonl",
  "cwd": "/workspace",
  "hook_event_name": "Stop"
}
EOF
)

TESTS_RUN=$((TESTS_RUN + 1))
echo -e "\n${YELLOW}TEST: Always calls /session/stop${NC}"

# Capture stdout
STDOUT_FILE="$TEST_DIR/stdout_session_stop"
STDERR_FILE="$TEST_DIR/stderr_session_stop"
echo "$INPUT" | "$TARGET_SCRIPT" > "$STDOUT_FILE" 2>"$STDERR_FILE"
EXIT_CODE=$?

echo "Exit code: $EXIT_CODE (expected: 0)"

if [ $EXIT_CODE -ne 0 ]; then
    echo -e "${RED}FAIL${NC} - unexpected exit code"
    cat "$STDERR_FILE"
else
    # Verify /session/stop was called
    if [ -f "$MOCK_CURL_CALLS_FILE" ] && grep -q "session/stop" "$MOCK_CURL_CALLS_FILE"; then
        echo "Verified: /session/stop endpoint was called"
    else
        echo -e "${RED}FAIL${NC} - Expected call to /session/stop"
        cat "$MOCK_CURL_CALLS_FILE" 2>/dev/null || echo "No curl calls"
        EXIT_CODE=1
    fi
fi

if [ $EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}PASS${NC}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
fi

rm -f "$STDOUT_FILE" "$STDERR_FILE"

# Test 15: Calls API and has no block when no locks/comments
echo -e "\n${YELLOW}=== Test 15: Normal stop with no locks or comments ===${NC}"
setup_mock_home
create_mock_curl '{"branch":"main","issues":[],"summary":{"total":0,"todo":0,"inProgress":0,"needsReview":0,"done":0,"backlog":0,"needingAgentAttention":0}}'
SESSION_ID="test-session-15"

# Create state file with issuesApiLoaded = true
mkdir -p "$HOME/.claude/hook-state"
cat > "$HOME/.claude/hook-state/${SESSION_ID}.json" <<EOF
{"issuesApiLoaded":true,"issueIds":["main:1"]}
EOF

INPUT=$(cat <<EOF
{
  "session_id": "$SESSION_ID",
  "transcript_path": "/tmp/transcript.jsonl",
  "cwd": "/workspace",
  "hook_event_name": "Stop"
}
EOF
)

TESTS_RUN=$((TESTS_RUN + 1))
echo -e "\n${YELLOW}TEST: Normal stop with no locks or comments${NC}"

# Capture stdout
STDOUT_FILE="$TEST_DIR/stdout_normal_stop"
STDERR_FILE="$TEST_DIR/stderr_normal_stop"
echo "$INPUT" | "$TARGET_SCRIPT" > "$STDOUT_FILE" 2>"$STDERR_FILE"
EXIT_CODE=$?

echo "Exit code: $EXIT_CODE (expected: 0)"

if [ $EXIT_CODE -ne 0 ]; then
    echo -e "${RED}FAIL${NC} - unexpected exit code"
    cat "$STDERR_FILE"
else
    # Verify curl calls were made (to /session/stop)
    CURL_CALLS=$(cat "$MOCK_CURL_CALLS_FILE" 2>/dev/null | wc -l)
    if [ "$CURL_CALLS" -gt 0 ]; then
        echo "Verified: API calls made"
        if cat "$MOCK_CURL_CALLS_FILE" | grep -q "session/stop"; then
            echo "Verified: API call made to /session/stop"
        else
            echo -e "${RED}FAIL${NC} - Expected curl call to /session/stop"
            EXIT_CODE=1
        fi
    else
        echo -e "${RED}FAIL${NC} - Expected curl calls"
        EXIT_CODE=1
    fi

    # Verify NO block decision in output (no locks/comments to report)
    STDOUT=$(cat "$STDOUT_FILE")
    if echo "$STDOUT" | grep -q '"decision": "block"'; then
        echo -e "${RED}FAIL${NC} - Should NOT contain block decision when no locks/comments"
        echo "Stdout: $STDOUT"
        EXIT_CODE=1
    else
        echo "Verified: No block decision in output"
    fi
fi

if [ $EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}PASS${NC}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
fi

rm -f "$STDOUT_FILE" "$STDERR_FILE"

# Test 16: No block when issuesApiLoaded=true but issueIds is empty
echo -e "\n${YELLOW}=== Test 16: No block when issueIds is empty ===${NC}"
setup_mock_home
create_mock_curl '{"branch":"main","issues":[],"summary":{"total":0,"todo":0,"inProgress":0,"needsReview":0,"done":0,"backlog":0,"needingAgentAttention":0}}'
SESSION_ID="test-session-16"

# Create state file with issuesApiLoaded = true but empty issueIds
mkdir -p "$HOME/.claude/hook-state"
cat > "$HOME/.claude/hook-state/${SESSION_ID}.json" <<EOF
{"issuesApiLoaded":true,"issueIds":[]}
EOF

INPUT=$(cat <<EOF
{
  "session_id": "$SESSION_ID",
  "transcript_path": "/tmp/transcript.jsonl",
  "cwd": "/workspace",
  "hook_event_name": "Stop"
}
EOF
)

TESTS_RUN=$((TESTS_RUN + 1))
echo -e "\n${YELLOW}TEST: No block when issueIds is empty${NC}"

# Capture stdout
STDOUT_FILE="$TEST_DIR/stdout_empty_ids"
STDERR_FILE="$TEST_DIR/stderr_empty_ids"
echo "$INPUT" | "$TARGET_SCRIPT" > "$STDOUT_FILE" 2>"$STDERR_FILE"
EXIT_CODE=$?

echo "Exit code: $EXIT_CODE (expected: 0)"

if [ $EXIT_CODE -ne 0 ]; then
    echo -e "${RED}FAIL${NC} - unexpected exit code"
    cat "$STDERR_FILE"
else
    # Verify NO block decision in output (no issues = no locks to report)
    STDOUT=$(cat "$STDOUT_FILE")
    if [ -z "$STDOUT" ] || ! echo "$STDOUT" | grep -q '"decision": "block"'; then
        echo "Verified: No block decision when issueIds is empty"
    else
        echo -e "${RED}FAIL${NC} - Should NOT contain block decision when issueIds is empty"
        echo "Stdout: $STDOUT"
        EXIT_CODE=1
    fi

    # /session/stop is still called even with empty issueIds
    if [ -f "$MOCK_CURL_CALLS_FILE" ] && grep -q "session/stop" "$MOCK_CURL_CALLS_FILE"; then
        echo "Verified: /session/stop still called with empty issueIds"
    else
        echo -e "${RED}FAIL${NC} - Expected /session/stop to be called"
        EXIT_CODE=1
    fi
fi

if [ $EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}PASS${NC}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
fi

rm -f "$STDOUT_FILE" "$STDERR_FILE"

# Test 17: No action when issuesApiLoaded=false
echo -e "\n${YELLOW}=== Test 17: No action when issuesApiLoaded=false ===${NC}"
setup_mock_home
create_mock_curl
SESSION_ID="test-session-17"

# Create state file with issuesApiLoaded = false
mkdir -p "$HOME/.claude/hook-state"
cat > "$HOME/.claude/hook-state/${SESSION_ID}.json" <<EOF
{"issuesApiLoaded":false,"issueIds":["main:1"]}
EOF

INPUT=$(cat <<EOF
{
  "session_id": "$SESSION_ID",
  "transcript_path": "/tmp/transcript.jsonl",
  "cwd": "/workspace",
  "hook_event_name": "Stop"
}
EOF
)

TESTS_RUN=$((TESTS_RUN + 1))
echo -e "\n${YELLOW}TEST: No block when issuesApiLoaded=false (Test 17)${NC}"

# Capture stdout
STDOUT_FILE="$TEST_DIR/stdout_no_api"
STDERR_FILE="$TEST_DIR/stderr_no_api"
echo "$INPUT" | "$TARGET_SCRIPT" > "$STDOUT_FILE" 2>"$STDERR_FILE"
EXIT_CODE=$?

echo "Exit code: $EXIT_CODE (expected: 0)"

if [ $EXIT_CODE -ne 0 ]; then
    echo -e "${RED}FAIL${NC} - unexpected exit code"
    cat "$STDERR_FILE"
else
    # Verify NO block decision in output (script exits early)
    STDOUT=$(cat "$STDOUT_FILE")
    if [ -z "$STDOUT" ] || ! echo "$STDOUT" | grep -q '"decision": "block"'; then
        echo "Verified: No block decision when issuesApiLoaded=false"
    else
        echo -e "${RED}FAIL${NC} - Should NOT contain block decision when issuesApiLoaded=false"
        echo "Stdout: $STDOUT"
        EXIT_CODE=1
    fi

    # Verify no curl calls made
    CURL_CALLS=$(cat "$MOCK_CURL_CALLS_FILE" 2>/dev/null | wc -l)
    if [ "$CURL_CALLS" -eq 0 ]; then
        echo "Verified: No API call made when issuesApiLoaded=false"
    else
        echo -e "${RED}FAIL${NC} - Expected no curl calls, got: $CURL_CALLS"
        EXIT_CODE=1
    fi
fi

if [ $EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}PASS${NC}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
fi

rm -f "$STDOUT_FILE" "$STDERR_FILE"

# Test 18: No signal sent when DISPATCHER_PID is not set (but API calls still made)
echo -e "\n${YELLOW}=== Test 18: No signal without DISPATCHER_PID ===${NC}"
setup_mock_home
create_mock_curl '{"branch":"main","issues":[],"summary":{"total":0,"todo":0,"inProgress":0,"needsReview":0,"done":0,"backlog":0,"needingAgentAttention":0}}'
SESSION_ID="test-session-18"

# Create state file with issuesApiLoaded = true
mkdir -p "$HOME/.claude/hook-state"
cat > "$HOME/.claude/hook-state/${SESSION_ID}.json" <<EOF
{"issuesApiLoaded":true,"issueIds":["main:1"]}
EOF

INPUT=$(cat <<EOF
{
  "session_id": "$SESSION_ID",
  "transcript_path": "/tmp/transcript.jsonl",
  "cwd": "/workspace",
  "hook_event_name": "Stop"
}
EOF
)

TESTS_RUN=$((TESTS_RUN + 1))
echo -e "\n${YELLOW}TEST: No signal without DISPATCHER_PID${NC}"

# Temporarily unset DISPATCHER_PID
SAVED_DISPATCHER_PID="$DISPATCHER_PID"
unset DISPATCHER_PID

# Capture stdout
STDOUT_FILE="$TEST_DIR/stdout_no_signal"
STDERR_FILE="$TEST_DIR/stderr_no_signal"
echo "$INPUT" | "$TARGET_SCRIPT" > "$STDOUT_FILE" 2>"$STDERR_FILE"
EXIT_CODE=$?

# Restore DISPATCHER_PID
export DISPATCHER_PID="$SAVED_DISPATCHER_PID"

echo "Exit code: $EXIT_CODE (expected: 0)"

if [ $EXIT_CODE -ne 0 ]; then
    echo -e "${RED}FAIL${NC} - unexpected exit code"
    cat "$STDERR_FILE"
else
    # Verify API calls ARE still made (just no signal)
    if [ -f "$MOCK_CURL_CALLS_FILE" ] && grep -q "session/stop" "$MOCK_CURL_CALLS_FILE"; then
        echo "Verified: API calls still made without DISPATCHER_PID"
    else
        echo -e "${RED}FAIL${NC} - Expected API calls to be made"
        EXIT_CODE=1
    fi

    # Verify NO signal messages in stderr
    STDERR=$(cat "$STDERR_FILE")
    if echo "$STDERR" | grep -q "TEST_MODE"; then
        echo -e "${RED}FAIL${NC} - Should NOT have signal messages without DISPATCHER_PID"
        echo "Stderr: $STDERR"
        EXIT_CODE=1
    else
        echo "Verified: No signal messages without DISPATCHER_PID"
    fi
fi

if [ $EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}PASS${NC}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
fi

rm -f "$STDOUT_FILE" "$STDERR_FILE"

# Test 19: Reports active locks in JSON output
echo -e "\n${YELLOW}=== Test 19: Reports active locks in JSON output ===${NC}"
setup_mock_home
ISSUES_RESPONSE='{"branch":"main","issues":[],"summary":{"total":0,"todo":0,"inProgress":0,"needsReview":0,"done":0,"backlog":0,"needingAgentAttention":0}}'
LOCKS_RESPONSE='{"locks":[{"issueId":"main:1","commentId":"comment-123","resources":["src/api/**/*.ts"],"lockType":"exclusive","reason":"Refactoring auth"}]}'
create_mock_curl_with_locks "$ISSUES_RESPONSE" "$LOCKS_RESPONSE"
SESSION_ID="test-session-19"

# Create state file with issuesApiLoaded = true and engaged issues
mkdir -p "$HOME/.claude/hook-state"
cat > "$HOME/.claude/hook-state/${SESSION_ID}.json" <<EOF
{"issuesApiLoaded":true,"issueIds":["main:1"]}
EOF

INPUT=$(cat <<EOF
{
  "session_id": "$SESSION_ID",
  "transcript_path": "/tmp/transcript.jsonl",
  "cwd": "/workspace",
  "hook_event_name": "Stop"
}
EOF
)

TESTS_RUN=$((TESTS_RUN + 1))
echo -e "\n${YELLOW}TEST: Reports active locks in JSON output${NC}"

# Capture stdout and stderr
STDOUT_FILE="$TEST_DIR/stdout_locks"
STDERR_FILE="$TEST_DIR/stderr_locks"
echo "$INPUT" | "$TARGET_SCRIPT" > "$STDOUT_FILE" 2>"$STDERR_FILE"
EXIT_CODE=$?

echo "Exit code: $EXIT_CODE (expected: 0)"

if [ $EXIT_CODE -ne 0 ]; then
    echo -e "${RED}FAIL${NC} - unexpected exit code"
    cat "$STDERR_FILE"
else
    STDOUT=$(cat "$STDOUT_FILE")

    # Parse the JSON output to get the reason field
    REASON=$(echo "$STDOUT" | jq -r '.reason // empty' 2>/dev/null)

    # Verify JSON output contains lock info
    if [ -n "$REASON" ]; then
        echo "Verified: JSON output contains lock report"
    else
        echo -e "${RED}FAIL${NC} - Expected JSON output with reason field"
        echo "Stdout: $STDOUT"
        EXIT_CODE=1
    fi

    # Verify reason contains the issue ID
    if echo "$REASON" | grep -q "main:1"; then
        echo "Verified: Issue ID 'main:1' present in JSON reason"
    else
        echo -e "${RED}FAIL${NC} - Expected issue ID 'main:1' in JSON reason"
        echo "Reason: $REASON"
        EXIT_CODE=1
    fi

    # Verify reason contains the lock type
    if echo "$REASON" | grep -q "exclusive"; then
        echo "Verified: Lock type 'exclusive' present in JSON reason"
    else
        echo -e "${RED}FAIL${NC} - Expected lock type 'exclusive' in JSON reason"
        echo "Reason: $REASON"
        EXIT_CODE=1
    fi

    # Verify reason contains at least one resource pattern
    if echo "$REASON" | grep -q "src/api"; then
        echo "Verified: Resource pattern present in JSON reason"
    else
        echo -e "${RED}FAIL${NC} - Expected resource pattern in JSON reason"
        echo "Reason: $REASON"
        EXIT_CODE=1
    fi

    # Verify curl was called for locks endpoint
    if [ -f "$MOCK_CURL_CALLS_FILE" ]; then
        if grep -q "locks?issueId=" "$MOCK_CURL_CALLS_FILE"; then
            echo "Verified: API call made to /locks endpoint"
        else
            echo -e "${RED}FAIL${NC} - Expected curl call to /locks endpoint"
            cat "$MOCK_CURL_CALLS_FILE"
            EXIT_CODE=1
        fi
    else
        echo -e "${RED}FAIL${NC} - No curl calls recorded"
        EXIT_CODE=1
    fi
fi

if [ $EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}PASS${NC}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
fi

rm -f "$STDOUT_FILE" "$STDERR_FILE"

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
