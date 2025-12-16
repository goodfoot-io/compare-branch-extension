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

# Test 11: Sends SIGURG (not SIGTERM) when needingAgentAttention is 0 (second stop)
echo -e "\n${YELLOW}=== Test 11: Sends SIGURG (not SIGTERM) when needingAgentAttention is 0 ===${NC}"
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

# Verify SIGURG IS sent (to notify dispatcher session ended cleanly)
if echo "$LAST_STDERR" | grep -q "TEST_MODE: Would send SIGURG"; then
    echo "Verified: SIGURG would be sent to notify dispatcher"
else
    echo -e "${RED}FAIL${NC} - SIGURG should be sent when needingAgentAttention is 0"
    echo "Stderr: $LAST_STDERR"
    TESTS_PASSED=$((TESTS_PASSED - 1))
fi

# Test 12: DOES trigger signal when needingAgentAttention > 0 (second stop)
echo -e "\n${YELLOW}=== Test 12: DOES trigger signal when needingAgentAttention > 0 ===${NC}"
setup_mock_home
create_mock_curl '{"branch":"main","issues":[{"id":"main:1","needsAgentAttention":true}],"summary":{"total":2,"todo":1,"inProgress":1,"needsReview":0,"done":0,"backlog":0,"needingAgentAttention":2}}'
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
  "hook_event_name": "Stop",
  "stop_hook_active": true
}
EOF
)
run_test "Signal triggered when needingAgentAttention > 0" "$INPUT" 0

# Verify TEST_MODE message in stderr (signal would be triggered)
if echo "$LAST_STDERR" | grep -q "TEST_MODE: Would send SIGTERM"; then
    echo "Verified: Signal would be triggered when needingAgentAttention > 0"
    echo "Stderr: $LAST_STDERR"
else
    echo -e "${RED}FAIL${NC} - Signal should be triggered when needingAgentAttention > 0"
    echo "Stderr: $LAST_STDERR"
    TESTS_PASSED=$((TESTS_PASSED - 1))
fi

# Test 13: First stop blocks with library prompt (stop_hook_active=false)
echo -e "\n${YELLOW}=== Test 13: First stop blocks with library prompt (stop_hook_active=false) ===${NC}"
setup_mock_home
create_mock_curl '{"branch":"main","issues":[],"summary":{"total":0,"todo":0,"inProgress":0,"needsReview":0,"done":0,"backlog":0,"needingAgentAttention":0}}'
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
  "hook_event_name": "Stop",
  "stop_hook_active": false
}
EOF
)

TESTS_RUN=$((TESTS_RUN + 1))
echo -e "\n${YELLOW}TEST: First stop blocks with library prompt${NC}"

# Capture stdout
STDOUT_FILE="$TEST_DIR/stdout_first_stop"
STDERR_FILE="$TEST_DIR/stderr_first_stop"
echo "$INPUT" | "$TARGET_SCRIPT" > "$STDOUT_FILE" 2>"$STDERR_FILE"
EXIT_CODE=$?

echo "Exit code: $EXIT_CODE (expected: 0)"

if [ $EXIT_CODE -ne 0 ]; then
    echo -e "${RED}FAIL${NC} - unexpected exit code"
    cat "$STDERR_FILE"
else
    # Verify stdout contains block decision
    STDOUT=$(cat "$STDOUT_FILE")
    if echo "$STDOUT" | grep -q '"decision": "block"'; then
        echo "Verified: Output contains block decision"
    else
        echo -e "${RED}FAIL${NC} - Expected block decision in output"
        echo "Stdout: $STDOUT"
        EXIT_CODE=1
    fi

    # Verify stdout contains library prompt text
    if echo "$STDOUT" | grep -q "review your work"; then
        echo "Verified: Output contains library prompt text"
    else
        echo -e "${RED}FAIL${NC} - Expected library prompt text in output"
        echo "Stdout: $STDOUT"
        EXIT_CODE=1
    fi

    # Verify NO curl calls made (blocked before API call)
    CURL_CALLS=$(cat "$MOCK_CURL_CALLS_FILE" 2>/dev/null | wc -l)
    if [ "$CURL_CALLS" -eq 0 ]; then
        echo "Verified: No API call made when blocked"
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

# Test 14: First stop blocks with library prompt (stop_hook_active missing, defaults to false)
echo -e "\n${YELLOW}=== Test 14: First stop blocks when stop_hook_active missing ===${NC}"
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
echo -e "\n${YELLOW}TEST: First stop blocks when stop_hook_active missing${NC}"

# Capture stdout
STDOUT_FILE="$TEST_DIR/stdout_missing_flag"
STDERR_FILE="$TEST_DIR/stderr_missing_flag"
echo "$INPUT" | "$TARGET_SCRIPT" > "$STDOUT_FILE" 2>"$STDERR_FILE"
EXIT_CODE=$?

echo "Exit code: $EXIT_CODE (expected: 0)"

if [ $EXIT_CODE -ne 0 ]; then
    echo -e "${RED}FAIL${NC} - unexpected exit code"
    cat "$STDERR_FILE"
else
    # Verify stdout contains block decision
    STDOUT=$(cat "$STDOUT_FILE")
    if echo "$STDOUT" | grep -q '"decision": "block"'; then
        echo "Verified: Output contains block decision (defaults to false)"
    else
        echo -e "${RED}FAIL${NC} - Expected block decision when stop_hook_active missing"
        echo "Stdout: $STDOUT"
        EXIT_CODE=1
    fi
fi

if [ $EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}PASS${NC}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
fi

rm -f "$STDOUT_FILE" "$STDERR_FILE"

# Test 15: Second stop allows through (stop_hook_active=true)
echo -e "\n${YELLOW}=== Test 15: Second stop allows through (stop_hook_active=true) ===${NC}"
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
  "hook_event_name": "Stop",
  "stop_hook_active": true
}
EOF
)

TESTS_RUN=$((TESTS_RUN + 1))
echo -e "\n${YELLOW}TEST: Second stop allows through${NC}"

# Capture stdout
STDOUT_FILE="$TEST_DIR/stdout_second_stop"
STDERR_FILE="$TEST_DIR/stderr_second_stop"
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
        echo "Verified: API calls made when stop_hook_active=true"
        if cat "$MOCK_CURL_CALLS_FILE" | grep -q "session/stop"; then
            echo "Verified: API call made to /session/stop"
        else
            echo -e "${RED}FAIL${NC} - Expected curl call to /session/stop"
            EXIT_CODE=1
        fi
    else
        echo -e "${RED}FAIL${NC} - Expected curl calls when stop_hook_active=true"
        EXIT_CODE=1
    fi

    # Verify NO block decision in output
    STDOUT=$(cat "$STDOUT_FILE")
    if echo "$STDOUT" | grep -q '"decision": "block"'; then
        echo -e "${RED}FAIL${NC} - Should NOT contain block decision when stop_hook_active=true"
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

# Test 16: No block when issuesApiLoaded=true but issueIds is empty (first stop)
echo -e "\n${YELLOW}=== Test 16: No block when issueIds is empty (first stop) ===${NC}"
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
  "hook_event_name": "Stop",
  "stop_hook_active": false
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
    # Verify NO block decision in output (script exits early due to empty issueIds)
    STDOUT=$(cat "$STDOUT_FILE")
    if [ -z "$STDOUT" ] || ! echo "$STDOUT" | grep -q '"decision": "block"'; then
        echo "Verified: No block decision when issueIds is empty"
    else
        echo -e "${RED}FAIL${NC} - Should NOT contain block decision when issueIds is empty"
        echo "Stdout: $STDOUT"
        EXIT_CODE=1
    fi

    # Verify no curl calls made (exited before API calls)
    CURL_CALLS=$(cat "$MOCK_CURL_CALLS_FILE" 2>/dev/null | wc -l)
    if [ "$CURL_CALLS" -eq 0 ]; then
        echo "Verified: No API call made when issueIds is empty"
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

# Test 17: No block when issuesApiLoaded=false (even with stop_hook_active=false)
echo -e "\n${YELLOW}=== Test 17: No block when issuesApiLoaded=false ===${NC}"
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
  "hook_event_name": "Stop",
  "stop_hook_active": false
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

# Test 18: Second stop exits early when SEND_SIGTERM_TO_CLAUDE is not set
echo -e "\n${YELLOW}=== Test 18: Second stop exits early without SEND_SIGTERM_TO_CLAUDE ===${NC}"
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
  "hook_event_name": "Stop",
  "stop_hook_active": true
}
EOF
)

TESTS_RUN=$((TESTS_RUN + 1))
echo -e "\n${YELLOW}TEST: Second stop exits early without SEND_SIGTERM_TO_CLAUDE${NC}"

# Temporarily unset SEND_SIGTERM_TO_CLAUDE
SAVED_SEND_SIGTERM="$SEND_SIGTERM_TO_CLAUDE"
unset SEND_SIGTERM_TO_CLAUDE

# Capture stdout
STDOUT_FILE="$TEST_DIR/stdout_no_sigterm_env"
STDERR_FILE="$TEST_DIR/stderr_no_sigterm_env"
echo "$INPUT" | "$TARGET_SCRIPT" > "$STDOUT_FILE" 2>"$STDERR_FILE"
EXIT_CODE=$?

# Restore SEND_SIGTERM_TO_CLAUDE
export SEND_SIGTERM_TO_CLAUDE="$SAVED_SEND_SIGTERM"

echo "Exit code: $EXIT_CODE (expected: 0)"

if [ $EXIT_CODE -ne 0 ]; then
    echo -e "${RED}FAIL${NC} - unexpected exit code"
    cat "$STDERR_FILE"
else
    # Verify NO curl calls made (exited before API calls)
    CURL_CALLS=$(cat "$MOCK_CURL_CALLS_FILE" 2>/dev/null | wc -l)
    if [ "$CURL_CALLS" -eq 0 ]; then
        echo "Verified: No API call made when SEND_SIGTERM_TO_CLAUDE is not set"
    else
        echo -e "${RED}FAIL${NC} - Expected no curl calls, got: $CURL_CALLS"
        EXIT_CODE=1
    fi

    # Verify NO signal messages in stderr
    STDERR=$(cat "$STDERR_FILE")
    if echo "$STDERR" | grep -q "TEST_MODE"; then
        echo -e "${RED}FAIL${NC} - Should NOT have signal messages without SEND_SIGTERM_TO_CLAUDE"
        echo "Stderr: $STDERR"
        EXIT_CODE=1
    else
        echo "Verified: No signal messages without SEND_SIGTERM_TO_CLAUDE"
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
