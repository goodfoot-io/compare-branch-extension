#!/bin/bash

# Test suite for discover-api utility
# Tests API discovery and eval-able variable output (API_BASE, ACCESS_TOKEN)

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

# Get the discover-api script path
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DISCOVER_API="$SCRIPT_DIR/discover-api.sh"

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
        echo -e "${RED}✗ FAIL${NC} - unexpected exit code"
        if [ -n "$stderr_output" ]; then
            echo "Stderr: $stderr_output"
        fi
        return 1
    fi

    # Check expected output if provided
    if [ -n "$expected_output" ]; then
        # Normalize multi-line output for comparison
        local normalized_output
        normalized_output=$(echo "$output" | tr '\n' '|')
        local normalized_expected
        normalized_expected=$(echo "$expected_output" | tr '\n' '|')
        if [ "$normalized_output" = "$normalized_expected" ]; then
            echo "Output: $output"
            echo -e "${GREEN}✓ PASS${NC}"
            TESTS_PASSED=$((TESTS_PASSED + 1))
            return 0
        else
            echo "Expected: $expected_output"
            echo "Actual: $output"
            echo -e "${RED}✗ FAIL${NC} - output mismatch"
            return 1
        fi
    else
        echo -e "${GREEN}✓ PASS${NC}"
        TESTS_PASSED=$((TESTS_PASSED + 1))
        return 0
    fi
}

echo "Running discover-api tests..."
echo "===================================="
echo "Test directory: $TEST_DIR"
echo "Script path: $DISCOVER_API"

# Test 1: Discovery file not found
echo -e "\n${YELLOW}=== Test 1: Discovery file not found ===${NC}"
setup_mock_home
run_test "No discovery file" 2

# Test 2: Flat discovery file with port and host
echo -e "\n${YELLOW}=== Test 2: Flat discovery file ===${NC}"
setup_mock_home

cat > "$HOME/.cards/cards-api.json" <<EOF
{
  "port": 54321,
  "host": "127.0.0.1",
  "pid": 12345,

  "accessToken": "abc123",
  "startedAt": "2024-01-15T10:00:00.000Z"
}
EOF

EXPECTED=$(printf 'API_BASE="http://127.0.0.1:54321"\nACCESS_TOKEN="abc123"')
run_test "Flat discovery file" 0 "$EXPECTED"

# Test 3: Empty discovery file (no port/host)
echo -e "\n${YELLOW}=== Test 3: Empty discovery file ===${NC}"
setup_mock_home
echo '{}' > "$HOME/.cards/cards-api.json"
run_test "Empty discovery file" 2

# Test 4: Invalid JSON in discovery file
echo -e "\n${YELLOW}=== Test 4: Invalid JSON in discovery file ===${NC}"
setup_mock_home
echo 'not valid json' > "$HOME/.cards/cards-api.json"
# Note: jq returns exit code 4 for parse errors, which causes script to fail
run_test "Invalid JSON in discovery file" 4

# Test 5: Discovery file missing accessToken
echo -e "\n${YELLOW}=== Test 5: Missing accessToken ===${NC}"
setup_mock_home

cat > "$HOME/.cards/cards-api.json" <<EOF
{
  "port": 54321,
  "host": "127.0.0.1",
  "pid": 12345,
  "startedAt": "2024-01-15T10:00:00.000Z"
}
EOF

run_test "Missing accessToken" 2

# Test 6: Discovery file with custom host
echo -e "\n${YELLOW}=== Test 6: Custom host in discovery file ===${NC}"
setup_mock_home

cat > "$HOME/.cards/cards-api.json" <<EOF
{
  "port": 9999,
  "host": "0.0.0.0",
  "pid": 67890,

  "accessToken": "def456",
  "startedAt": "2024-01-15T11:00:00.000Z"
}
EOF

EXPECTED=$(printf 'API_BASE="http://0.0.0.0:9999"\nACCESS_TOKEN="def456"')
run_test "Custom host" 0 "$EXPECTED"

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
