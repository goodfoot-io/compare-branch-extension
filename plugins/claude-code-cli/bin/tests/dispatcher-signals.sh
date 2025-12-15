#!/bin/bash
#
# Test suite for dispatcher signal handling
# Tests the two-signal state machine:
# - SIGURG: Claude is actively processing (from SessionStart/UserPromptSubmit)
# - SIGWINCH: Claude is idle/waiting for input (from Stop hook)
#
# This test creates nested processes to simulate:
# - The dispatcher (parent) listening for signals
# - Hook scripts (children) sending signals to dispatcher PID
#

set -euo pipefail

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Test counters
TESTS_RUN=0
TESTS_PASSED=0

# Create test directory
TEST_DIR=$(mktemp -d)
trap 'rm -rf "$TEST_DIR"' EXIT

echo "Running dispatcher signal tests..."
echo "=================================="
echo "Test directory: $TEST_DIR"

# Test 1: Single SIGURG creates file
test_single_sigurg() {
    echo -e "\n${YELLOW}=== Test 1: Single SIGURG creates .CLAUDE_ACTIVE ===${NC}"
    TESTS_RUN=$((TESTS_RUN + 1))

    local test_subdir="$TEST_DIR/test1"
    mkdir -p "$test_subdir"

    # Create a mini dispatcher that listens for SIGURG
    cat > "$test_subdir/mini-dispatcher.sh" << 'EOF'
#!/bin/bash
cd "$1"
CLAUDE_ACTIVE=0
TEST_MODE=1

handle_sigurg() {
    if [ "$CLAUDE_ACTIVE" -eq 0 ]; then
        CLAUDE_ACTIVE=1
        touch ".CLAUDE_ACTIVE"
        echo "ACTIVE=1" >> signal.log
    fi
}

trap handle_sigurg URG
echo $$ > dispatcher.pid
echo "DISPATCHER_READY" > ready.flag
for i in {1..50}; do
    sleep 0.1
    [ -f "done.flag" ] && break
done
echo "FINAL_STATE=$CLAUDE_ACTIVE" >> signal.log
EOF
    chmod +x "$test_subdir/mini-dispatcher.sh"

    "$test_subdir/mini-dispatcher.sh" "$test_subdir" &
    local dispatcher_pid=$!

    for i in {1..20}; do
        [ -f "$test_subdir/ready.flag" ] && break
        sleep 0.1
    done

    # Send SIGURG directly to dispatcher PID
    kill -URG "$dispatcher_pid" 2>/dev/null || true
    sleep 0.2

    if [ -f "$test_subdir/.CLAUDE_ACTIVE" ]; then
        echo -e "${GREEN}PASS${NC} - .CLAUDE_ACTIVE file created after SIGURG"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        echo -e "${RED}FAIL${NC} - .CLAUDE_ACTIVE file not created"
        cat "$test_subdir/signal.log" 2>/dev/null || echo "(no log)"
    fi

    touch "$test_subdir/done.flag"
    wait $dispatcher_pid 2>/dev/null || true
}

# Test 2: Multiple SIGURGs stay active (idempotent)
test_multiple_sigurg_idempotent() {
    echo -e "\n${YELLOW}=== Test 2: Multiple SIGURGs stay active (idempotent) ===${NC}"
    TESTS_RUN=$((TESTS_RUN + 1))

    local test_subdir="$TEST_DIR/test2"
    mkdir -p "$test_subdir"

    cat > "$test_subdir/mini-dispatcher.sh" << 'EOF'
#!/bin/bash
cd "$1"
CLAUDE_ACTIVE=0
TEST_MODE=1

handle_sigurg() {
    if [ "$CLAUDE_ACTIVE" -eq 0 ]; then
        CLAUDE_ACTIVE=1
        touch ".CLAUDE_ACTIVE"
        echo "ACTIVE=1 (was 0)" >> signal.log
    else
        echo "ACTIVE=1 (already active)" >> signal.log
    fi
}

trap handle_sigurg URG
echo $$ > dispatcher.pid
echo "DISPATCHER_READY" > ready.flag
for i in {1..50}; do
    sleep 0.1
    [ -f "done.flag" ] && break
done
echo "FINAL_STATE=$CLAUDE_ACTIVE" >> signal.log
EOF
    chmod +x "$test_subdir/mini-dispatcher.sh"

    "$test_subdir/mini-dispatcher.sh" "$test_subdir" &
    local dispatcher_pid=$!

    for i in {1..20}; do
        [ -f "$test_subdir/ready.flag" ] && break
        sleep 0.1
    done

    # Send SIGURG multiple times (simulates SessionStart + multiple UserPromptSubmit)
    kill -URG "$dispatcher_pid" 2>/dev/null || true
    sleep 0.2
    kill -URG "$dispatcher_pid" 2>/dev/null || true
    sleep 0.2
    kill -URG "$dispatcher_pid" 2>/dev/null || true
    sleep 0.2

    if [ -f "$test_subdir/.CLAUDE_ACTIVE" ]; then
        echo -e "${GREEN}PASS${NC} - File persists after multiple SIGURGs"
        echo "Signal log:"
        cat "$test_subdir/signal.log" 2>/dev/null | sed 's/^/  /'
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        echo -e "${RED}FAIL${NC} - File was removed"
        cat "$test_subdir/signal.log" 2>/dev/null | sed 's/^/  /'
    fi

    touch "$test_subdir/done.flag"
    wait $dispatcher_pid 2>/dev/null || true
}

# Test 3: SIGWINCH sets idle state
test_sigwinch_sets_idle() {
    echo -e "\n${YELLOW}=== Test 3: SIGWINCH sets idle state ===${NC}"
    TESTS_RUN=$((TESTS_RUN + 1))

    local test_subdir="$TEST_DIR/test3"
    mkdir -p "$test_subdir"

    cat > "$test_subdir/mini-dispatcher.sh" << 'EOF'
#!/bin/bash
cd "$1"
CLAUDE_ACTIVE=0
TEST_MODE=1

handle_sigurg() {
    if [ "$CLAUDE_ACTIVE" -eq 0 ]; then
        CLAUDE_ACTIVE=1
        touch ".CLAUDE_ACTIVE"
        echo "ACTIVE=1" >> signal.log
    fi
}

handle_sigwinch() {
    if [ "$CLAUDE_ACTIVE" -eq 1 ]; then
        CLAUDE_ACTIVE=0
        rm -f ".CLAUDE_ACTIVE"
        echo "IDLE=0" >> signal.log
    fi
}

trap handle_sigurg URG
trap handle_sigwinch WINCH
echo $$ > dispatcher.pid
echo "DISPATCHER_READY" > ready.flag
for i in {1..50}; do
    sleep 0.1
    [ -f "done.flag" ] && break
done
echo "FINAL_STATE=$CLAUDE_ACTIVE" >> signal.log
EOF
    chmod +x "$test_subdir/mini-dispatcher.sh"

    "$test_subdir/mini-dispatcher.sh" "$test_subdir" &
    local dispatcher_pid=$!

    for i in {1..20}; do
        [ -f "$test_subdir/ready.flag" ] && break
        sleep 0.1
    done

    # First set active
    kill -URG "$dispatcher_pid" 2>/dev/null || true
    sleep 0.2

    if [ ! -f "$test_subdir/.CLAUDE_ACTIVE" ]; then
        echo -e "${RED}FAIL${NC} - File not created after SIGURG"
        touch "$test_subdir/done.flag"
        wait $dispatcher_pid 2>/dev/null || true
        return
    fi

    # Now set idle with SIGWINCH
    kill -WINCH "$dispatcher_pid" 2>/dev/null || true
    sleep 0.2

    if [ ! -f "$test_subdir/.CLAUDE_ACTIVE" ]; then
        echo -e "${GREEN}PASS${NC} - File removed after SIGWINCH"
        echo "Signal log:"
        cat "$test_subdir/signal.log" 2>/dev/null | sed 's/^/  /'
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        echo -e "${RED}FAIL${NC} - File still exists after SIGWINCH"
        cat "$test_subdir/signal.log" 2>/dev/null | sed 's/^/  /'
    fi

    touch "$test_subdir/done.flag"
    wait $dispatcher_pid 2>/dev/null || true
}

# Test 4: Full state machine cycle
test_full_state_machine() {
    echo -e "\n${YELLOW}=== Test 4: Full state machine cycle (active -> idle -> active -> idle) ===${NC}"
    TESTS_RUN=$((TESTS_RUN + 1))

    local test_subdir="$TEST_DIR/test4"
    mkdir -p "$test_subdir"

    cat > "$test_subdir/mini-dispatcher.sh" << 'EOF'
#!/bin/bash
cd "$1"
CLAUDE_ACTIVE=0
TEST_MODE=1

handle_sigurg() {
    if [ "$CLAUDE_ACTIVE" -eq 0 ]; then
        CLAUDE_ACTIVE=1
        touch ".CLAUDE_ACTIVE"
        echo "ACTIVE=1" >> signal.log
    fi
}

handle_sigwinch() {
    if [ "$CLAUDE_ACTIVE" -eq 1 ]; then
        CLAUDE_ACTIVE=0
        rm -f ".CLAUDE_ACTIVE"
        echo "IDLE=0" >> signal.log
    fi
}

trap handle_sigurg URG
trap handle_sigwinch WINCH
echo $$ > dispatcher.pid
echo "DISPATCHER_READY" > ready.flag
for i in {1..50}; do
    sleep 0.1
    [ -f "done.flag" ] && break
done
echo "FINAL_STATE=$CLAUDE_ACTIVE" >> signal.log
EOF
    chmod +x "$test_subdir/mini-dispatcher.sh"

    "$test_subdir/mini-dispatcher.sh" "$test_subdir" &
    local dispatcher_pid=$!

    for i in {1..20}; do
        [ -f "$test_subdir/ready.flag" ] && break
        sleep 0.1
    done

    local failed=0

    # Step 1: SessionStart -> active
    kill -URG "$dispatcher_pid" 2>/dev/null || true
    sleep 0.2
    [ -f "$test_subdir/.CLAUDE_ACTIVE" ] || { echo "Step 1 failed: file not created"; failed=1; }

    # Step 2: Stop -> idle
    kill -WINCH "$dispatcher_pid" 2>/dev/null || true
    sleep 0.2
    [ ! -f "$test_subdir/.CLAUDE_ACTIVE" ] || { echo "Step 2 failed: file not removed"; failed=1; }

    # Step 3: UserPromptSubmit -> active
    kill -URG "$dispatcher_pid" 2>/dev/null || true
    sleep 0.2
    [ -f "$test_subdir/.CLAUDE_ACTIVE" ] || { echo "Step 3 failed: file not created"; failed=1; }

    # Step 4: Stop -> idle
    kill -WINCH "$dispatcher_pid" 2>/dev/null || true
    sleep 0.2
    [ ! -f "$test_subdir/.CLAUDE_ACTIVE" ] || { echo "Step 4 failed: file not removed"; failed=1; }

    if [ "$failed" -eq 0 ]; then
        echo -e "${GREEN}PASS${NC} - Full state machine cycle works correctly"
        echo "Signal log:"
        cat "$test_subdir/signal.log" 2>/dev/null | sed 's/^/  /'
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        echo -e "${RED}FAIL${NC} - State machine cycle failed"
        echo "Signal log:"
        cat "$test_subdir/signal.log" 2>/dev/null | sed 's/^/  /'
    fi

    touch "$test_subdir/done.flag"
    wait $dispatcher_pid 2>/dev/null || true
}

# Test 5: Direct PID targeting works
test_direct_pid_targeting() {
    echo -e "\n${YELLOW}=== Test 5: Direct PID targeting (child sends to specific PID) ===${NC}"
    TESTS_RUN=$((TESTS_RUN + 1))

    local test_subdir="$TEST_DIR/test5"
    mkdir -p "$test_subdir"

    cat > "$test_subdir/mini-dispatcher.sh" << 'EOF'
#!/bin/bash
cd "$1"
CLAUDE_ACTIVE=0
TEST_MODE=1
export DISPATCHER_PID=$$

handle_sigurg() {
    if [ "$CLAUDE_ACTIVE" -eq 0 ]; then
        CLAUDE_ACTIVE=1
        touch ".CLAUDE_ACTIVE"
        echo "ACTIVE=1" >> signal.log
    fi
}

handle_sigwinch() {
    if [ "$CLAUDE_ACTIVE" -eq 1 ]; then
        CLAUDE_ACTIVE=0
        rm -f ".CLAUDE_ACTIVE"
        echo "IDLE=0" >> signal.log
    fi
}

trap handle_sigurg URG
trap handle_sigwinch WINCH
echo $$ > dispatcher.pid
echo "DISPATCHER_READY" > ready.flag

# Launch child that sends signals directly to DISPATCHER_PID
(
    sleep 0.3
    echo "CHILD: Sending SIGURG to $DISPATCHER_PID" >> "$1/signal.log"
    kill -URG "$DISPATCHER_PID" 2>/dev/null || true
    sleep 0.3
    echo "CHILD: Sending SIGWINCH to $DISPATCHER_PID" >> "$1/signal.log"
    kill -WINCH "$DISPATCHER_PID" 2>/dev/null || true
) &

for i in {1..50}; do
    sleep 0.1
    [ -f "done.flag" ] && break
done
echo "FINAL_STATE=$CLAUDE_ACTIVE" >> signal.log
EOF
    chmod +x "$test_subdir/mini-dispatcher.sh"

    "$test_subdir/mini-dispatcher.sh" "$test_subdir" &
    local dispatcher_pid=$!

    # Wait for child to send signals and states to settle
    sleep 1.5

    # After SIGURG then SIGWINCH, should be idle (no file)
    if [ ! -f "$test_subdir/.CLAUDE_ACTIVE" ]; then
        echo -e "${GREEN}PASS${NC} - Child process signals via direct PID work correctly"
        echo "Signal log:"
        cat "$test_subdir/signal.log" 2>/dev/null | sed 's/^/  /'
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        echo -e "${RED}FAIL${NC} - State not as expected after child signals"
        echo "Signal log:"
        cat "$test_subdir/signal.log" 2>/dev/null | sed 's/^/  /'
    fi

    touch "$test_subdir/done.flag"
    wait $dispatcher_pid 2>/dev/null || true
}

# Run all tests
test_single_sigurg
test_multiple_sigurg_idempotent
test_sigwinch_sets_idle
test_full_state_machine
test_direct_pid_targeting

# Summary
echo
echo "=================================="
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
