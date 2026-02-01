#!/bin/bash

# Test suite for discover-workspace-api utility
# Tests API discovery and base URL output with ISSUE_WORKSPACE_PATH validation

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

# Get the discover-workspace-api script path
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DISCOVER_API="$SCRIPT_DIR/discover-workspace-api.sh"

# Setup mock home directory
setup_mock_home() {
    export HOME="$TEST_DIR/mock-home"
    mkdir -p "$HOME/.cards"
}

# Cleanup mock home directory
cleanup_mock_home() {
    export HOME="$ORIGINAL_HOME"
}

# Function to run a test
run_test() {
    local test_name="$1"
    local expected_exit_code="${2:-0}"
    local expected_output="${3:-}"

    TESTS_RUN=$((TESTS_RUN + 1))

    echo -e "\n${YELLOW}TEST: $test_name${NC}"

    # Run the script and capture output
    local output
    local stderr_file="$TEST_DIR/stderr_$$"

    output=$("$DISCOVER_API" 2>"$stderr_file")
    local exit_code=$?
    local stderr_output=$(cat "$stderr_file" 2>/dev/null)
    rm -f "$stderr_file"

    echo "Exit code: $exit_code (expected: $expected_exit_code)"

    if [ $exit_code -ne "$expected_exit_code" ]; then
        echo -e "${RED}x FAIL${NC} - unexpected exit code"
        if [ -n "$stderr_output" ]; then
            echo "Stderr: $stderr_output"
        fi
        return 1
    fi

    # Check expected output if provided
    if [ -n "$expected_output" ]; then
        if [ "$output" = "$expected_output" ]; then
            echo "Output: $output"
            echo -e "${GREEN}+ PASS${NC}"
            TESTS_PASSED=$((TESTS_PASSED + 1))
            return 0
        else
            echo "Expected: $expected_output"
            echo "Actual: $output"
            echo -e "${RED}x FAIL${NC} - output mismatch"
            return 1
        fi
    else
        echo -e "${GREEN}+ PASS${NC}"
        TESTS_PASSED=$((TESTS_PASSED + 1))
        return 0
    fi
}

echo "Running discover-workspace-api tests..."
echo "===================================="
echo "Test directory: $TEST_DIR"
echo "Script path: $DISCOVER_API"

# Test 1: Missing ISSUE_WORKSPACE_PATH exits with code 2
echo -e "\n${YELLOW}=== Test 1: Missing ISSUE_WORKSPACE_PATH exits with code 2 ===${NC}"
setup_mock_home
unset ISSUE_WORKSPACE_PATH
run_test "Missing ISSUE_WORKSPACE_PATH" 2

# Test 2: Discovery file not found
echo -e "\n${YELLOW}=== Test 2: Discovery file not found ===${NC}"
setup_mock_home
TEST_WORKSPACE="$TEST_DIR/test-workspace"
mkdir -p "$TEST_WORKSPACE"
export ISSUE_WORKSPACE_PATH="$TEST_WORKSPACE"
# Don't create discovery file
run_test "No discovery file" 1

# Test 3: Discovery file exists with current workspace
echo -e "\n${YELLOW}=== Test 3: Current workspace in discovery file ===${NC}"
setup_mock_home
TEST_WORKSPACE="$TEST_DIR/test-workspace"
mkdir -p "$TEST_WORKSPACE"
export ISSUE_WORKSPACE_PATH="$TEST_WORKSPACE"

cat > "$HOME/.cards/issues-api.json" <<EOF
{
  "$TEST_WORKSPACE": {
    "port": 54321,
    "host": "127.0.0.1",
    "pid": 12345,
    "apiVersion": "v1",
    "startedAt": "2024-01-15T10:00:00.000Z"
  }
}
EOF

run_test "Current workspace found" 0 "http://127.0.0.1:54321/api/v1"

# Test 4: Workspace not in discovery file (no fallback - strict mode)
echo -e "\n${YELLOW}=== Test 4: Workspace not in discovery file (no fallback) ===${NC}"
setup_mock_home
TEST_WORKSPACE="$TEST_DIR/test-workspace"
mkdir -p "$TEST_WORKSPACE"
export ISSUE_WORKSPACE_PATH="$TEST_WORKSPACE"

cat > "$HOME/.cards/issues-api.json" <<EOF
{
  "/some/other/path": {
    "port": 55555,
    "host": "127.0.0.1",
    "pid": 99999,
    "apiVersion": "v1",
    "startedAt": "2024-01-15T10:00:00.000Z"
  }
}
EOF

run_test "Workspace not found, no fallback" 1

# Test 5: Empty discovery file
echo -e "\n${YELLOW}=== Test 5: Empty discovery file ===${NC}"
setup_mock_home
TEST_WORKSPACE="$TEST_DIR/test-workspace"
mkdir -p "$TEST_WORKSPACE"
export ISSUE_WORKSPACE_PATH="$TEST_WORKSPACE"
echo '{}' > "$HOME/.cards/issues-api.json"
run_test "Empty discovery file" 1

# Test 6: Invalid JSON in discovery file
echo -e "\n${YELLOW}=== Test 6: Invalid JSON in discovery file ===${NC}"
setup_mock_home
TEST_WORKSPACE="$TEST_DIR/test-workspace"
mkdir -p "$TEST_WORKSPACE"
export ISSUE_WORKSPACE_PATH="$TEST_WORKSPACE"
echo 'not valid json' > "$HOME/.cards/issues-api.json"
# Note: jq returns exit code 4 for parse errors, which causes script to fail
run_test "Invalid JSON in discovery file" 4

# Test 7: Multiple workspaces, exact match only
echo -e "\n${YELLOW}=== Test 7: Multiple workspaces, exact match only ===${NC}"
setup_mock_home
TEST_WORKSPACE="$TEST_DIR/test-workspace"
mkdir -p "$TEST_WORKSPACE"
export ISSUE_WORKSPACE_PATH="$TEST_WORKSPACE"

cat > "$HOME/.cards/issues-api.json" <<EOF
{
  "/some/other/path": {
    "port": 11111,
    "host": "127.0.0.1",
    "pid": 11111,
    "apiVersion": "v1",
    "startedAt": "2024-01-15T09:00:00.000Z"
  },
  "$TEST_WORKSPACE": {
    "port": 22222,
    "host": "127.0.0.1",
    "pid": 22222,
    "apiVersion": "v1",
    "startedAt": "2024-01-15T10:00:00.000Z"
  },
  "/another/path": {
    "port": 33333,
    "host": "127.0.0.1",
    "pid": 33333,
    "apiVersion": "v1",
    "startedAt": "2024-01-15T11:00:00.000Z"
  }
}
EOF

run_test "Exact workspace match among multiple" 0 "http://127.0.0.1:22222/api/v1"

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
