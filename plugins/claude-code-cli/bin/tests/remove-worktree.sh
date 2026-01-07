#!/bin/bash

# Test suite for remove-worktree utility
# Tests run in /tmp/ test repositories

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Create a test directory in /tmp/
TEST_DIR="/tmp/test-remove-worktree-hooks-$$"
mkdir -p "$TEST_DIR"

# Test counters
PASSED=0
FAILED=0

# Cleanup function
cleanup() {
    cd /
    if [ -d "$TEST_DIR" ]; then
        # Remove any worktrees first to avoid git errors
        if [ -d "$TEST_DIR/repo" ]; then
            cd "$TEST_DIR/repo" 2>/dev/null && git worktree list 2>/dev/null | grep -v "$(pwd)" | awk '{print $1}' | while read -r wt; do
                git worktree remove --force "$wt" 2>/dev/null || true
            done
            git worktree prune 2>/dev/null || true
        fi
        rm -rf "$TEST_DIR"
    fi
}

# Set up trap to clean up on exit
trap cleanup EXIT

# Initialize a test git repository
init_test_repo() {
    local repo_dir="$1"
    mkdir -p "$repo_dir"
    cd "$repo_dir"
    git init --initial-branch=main >/dev/null 2>&1
    git config user.email "test@test.com"
    git config user.name "Test User"

    # Create some initial content
    echo "# Test Project" > README.md
    mkdir -p src
    echo "console.log('hello');" > src/index.js

    # Create a .gitignore with typical patterns
    cat > .gitignore << 'EOF'
node_modules/
.env
dist/
*.log
EOF

    git add .
    git commit -m "Initial commit" >/dev/null 2>&1

    # Create ignored directories that would be symlinked
    mkdir -p node_modules/some-package
    echo '{"name": "test"}' > node_modules/some-package/package.json
    mkdir -p dist
    echo "compiled code" > dist/bundle.js
    echo "SECRET=value" > .env

    cd - >/dev/null
}

# Run a test
run_test() {
    local test_name="$1"
    local expected_exit_code="${2:-0}"
    shift 2
    local command=("$@")

    echo -e "\n${YELLOW}TEST: $test_name${NC}"

    # Run the command and capture output and exit code
    local output
    local stderr_file="/tmp/remove_hooks_stderr_$$"
    output=$("${command[@]}" 2>"$stderr_file")
    local exit_code=$?
    local stderr_output=$(cat "$stderr_file")
    rm -f "$stderr_file"

    echo "Exit code: $exit_code (expected: $expected_exit_code)"
    if [ -n "$output" ]; then
        echo "Output: $output"
    fi
    if [ -n "$stderr_output" ]; then
        echo "Stderr: $stderr_output"
    fi

    if [ "$exit_code" -eq "$expected_exit_code" ]; then
        echo -e "${GREEN}PASS${NC}"
        ((PASSED++))
        # Return output for further validation
        echo "$output"
        return 0
    else
        echo -e "${RED}FAIL${NC} - Expected exit code $expected_exit_code, got $exit_code"
        ((FAILED++))
        return 1
    fi
}

# Verify a condition
verify() {
    local description="$1"
    local condition="$2"

    if eval "$condition"; then
        echo -e "  ${GREEN}PASS${NC}: $description"
        ((PASSED++))
        return 0
    else
        echo -e "  ${RED}FAIL${NC}: $description"
        ((FAILED++))
        return 1
    fi
}

echo "Test directory: $TEST_DIR"
echo "Creating test repository..."
init_test_repo "$TEST_DIR/repo"

# Set up required directory structure for the tests
mkdir -p "$TEST_DIR/repo/.devcontainer/utilities"
# Copy the actual utilities (we need working implementations)
if [ -f "/workspace/.devcontainer/utilities/instant-worktree" ]; then
    cp "/workspace/.devcontainer/utilities/instant-worktree" "$TEST_DIR/repo/.devcontainer/utilities/"
    chmod +x "$TEST_DIR/repo/.devcontainer/utilities/instant-worktree"
else
    echo -e "${RED}Error: instant-worktree not found at /workspace/.devcontainer/utilities/instant-worktree${NC}"
    exit 1
fi

if [ -f "/workspace/.devcontainer/utilities/remove-instant-worktree" ]; then
    cp "/workspace/.devcontainer/utilities/remove-instant-worktree" "$TEST_DIR/repo/.devcontainer/utilities/"
    chmod +x "$TEST_DIR/repo/.devcontainer/utilities/remove-instant-worktree"
else
    echo -e "${RED}Error: remove-instant-worktree not found at /workspace/.devcontainer/utilities/remove-instant-worktree${NC}"
    exit 1
fi

# Determine script paths
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CREATE_UTILITY="${SCRIPT_DIR}/../create-worktree.sh"
REMOVE_UTILITY="${SCRIPT_DIR}/../remove-worktree.sh"

# Fall back to direct paths if running from main workspace
if [ ! -x "$CREATE_UTILITY" ]; then
    CREATE_UTILITY="/workspace/public/plugins/claude-code-cli/bin/create-worktree.sh"
fi
if [ ! -x "$REMOVE_UTILITY" ]; then
    REMOVE_UTILITY="/workspace/public/plugins/claude-code-cli/bin/remove-worktree.sh"
fi

# Check for worktree paths
if [ ! -x "$CREATE_UTILITY" ]; then
    CREATE_UTILITY="/workspace/.worktrees/issue-main-259-worktree-hooks/public/plugins/claude-code-cli/bin/create-worktree.sh"
fi
if [ ! -x "$REMOVE_UTILITY" ]; then
    REMOVE_UTILITY="/workspace/.worktrees/issue-main-259-worktree-hooks/public/plugins/claude-code-cli/bin/remove-worktree.sh"
fi

if [ ! -x "$CREATE_UTILITY" ]; then
    echo -e "${RED}Error: create-worktree.sh not found${NC}"
    exit 1
fi
if [ ! -x "$REMOVE_UTILITY" ]; then
    echo -e "${RED}Error: remove-worktree.sh not found${NC}"
    exit 1
fi

echo "Using create utility: $CREATE_UTILITY"
echo "Using remove utility: $REMOVE_UTILITY"

cd "$TEST_DIR/repo"

echo -e "\n${YELLOW}=== Test 1: Missing branch name argument should fail with exit 2 ===${NC}"
run_test "Missing argument" 2 "$REMOVE_UTILITY"

echo -e "\n${YELLOW}=== Test 2: Basic worktree removal should succeed ===${NC}"
# First create a worktree
ISSUE_ID="test:123" ISSUE_WORKSPACE_PATH="$TEST_DIR/repo" "$CREATE_UTILITY" "remove-test-1" >/dev/null 2>&1
# Capture the worktree git directory for cleanup verification
WORKTREE_GIT_DIR=$(git -C ".worktrees/remove-test-1" rev-parse --git-dir 2>/dev/null)
# Get the expected SHA
EXPECTED_SHA=$(git rev-parse "remove-test-1" 2>/dev/null)
echo "Branch SHA before removal: $EXPECTED_SHA"

# Run removal and capture SHA output
output=$("$REMOVE_UTILITY" "remove-test-1" 2>/dev/null)
exit_code=$?
echo "Exit code: $exit_code"
echo "Output SHA: $output"

if [ "$exit_code" -eq 0 ]; then
    echo -e "${GREEN}PASS${NC}: Removal succeeded"
    ((PASSED++))
else
    echo -e "${RED}FAIL${NC}: Removal failed"
    ((FAILED++))
fi

verify "Worktree directory removed" "[ ! -d '.worktrees/remove-test-1' ]"
verify "Worktree git dir removed" "[ -z '$WORKTREE_GIT_DIR' ] || [ ! -d '$WORKTREE_GIT_DIR' ]"
verify "Branch deleted" "! git branch --list remove-test-1 | grep -q remove-test-1"

echo -e "\n${YELLOW}=== Test 3: Returns final commit SHA ===${NC}"
verify "Output SHA matches expected" "[ '$output' = '$EXPECTED_SHA' ]"
verify "Output is valid SHA format" "echo '$output' | grep -qE '^[a-f0-9]{40}$'"

echo -e "\n${YELLOW}=== Test 4: Force flag (-f) works for uncommitted changes ===${NC}"
ISSUE_ID="test:456" ISSUE_WORKSPACE_PATH="$TEST_DIR/repo" "$CREATE_UTILITY" "uncommitted-test" >/dev/null 2>&1
# Add uncommitted changes in the worktree
echo "modified content" > ".worktrees/uncommitted-test/README.md"

# Should fail without -f
stderr_file="/tmp/uncommitted_stderr_$$"
output=$("$REMOVE_UTILITY" "uncommitted-test" 2>"$stderr_file")
exit_code=$?
stderr_output=$(cat "$stderr_file")
rm -f "$stderr_file"

echo "Exit code without -f: $exit_code (expected: 2)"
if [ "$exit_code" -eq 2 ]; then
    echo -e "${GREEN}PASS${NC}: Correctly refused to remove without -f"
    ((PASSED++))
else
    echo -e "${RED}FAIL${NC}: Should have failed without -f"
    ((FAILED++))
fi

verify "Error mentions uncommitted changes" "echo '$stderr_output' | grep -qi 'uncommitted'"
verify "Worktree still exists" "[ -d '.worktrees/uncommitted-test' ]"

# Now try with -f
EXPECTED_SHA=$(git rev-parse "uncommitted-test" 2>/dev/null)
output=$("$REMOVE_UTILITY" -f "uncommitted-test" 2>/dev/null)
exit_code=$?

echo "Exit code with -f: $exit_code"
if [ "$exit_code" -eq 0 ]; then
    echo -e "${GREEN}PASS${NC}: Force removal succeeded"
    ((PASSED++))
else
    echo -e "${RED}FAIL${NC}: Force removal failed"
    ((FAILED++))
fi
verify "Worktree removed with -f" "[ ! -d '.worktrees/uncommitted-test' ]"
verify "SHA returned after force removal" "[ '$output' = '$EXPECTED_SHA' ]"

echo -e "\n${YELLOW}=== Test 5: --force long option works ===${NC}"
ISSUE_ID="test:789" ISSUE_WORKSPACE_PATH="$TEST_DIR/repo" "$CREATE_UTILITY" "force-long-test" >/dev/null 2>&1
echo "new file" > ".worktrees/force-long-test/newfile.txt"
EXPECTED_SHA=$(git rev-parse "force-long-test" 2>/dev/null)

output=$("$REMOVE_UTILITY" --force "force-long-test" 2>/dev/null)
exit_code=$?

if [ "$exit_code" -eq 0 ]; then
    echo -e "${GREEN}PASS${NC}: --force long option works"
    ((PASSED++))
else
    echo -e "${RED}FAIL${NC}: --force long option failed"
    ((FAILED++))
fi
verify "Worktree removed with --force" "[ ! -d '.worktrees/force-long-test' ]"

echo -e "\n${YELLOW}=== Test 6: Non-existent branch should fail ===${NC}"
run_test "Non-existent branch" 2 "$REMOVE_UTILITY" "non-existent-branch"

echo -e "\n${YELLOW}=== Test 7: Not in git repository should fail ===${NC}"
cd /tmp
run_test "Not in git repo" 2 "$REMOVE_UTILITY" "any-branch"
cd "$TEST_DIR/repo"

echo -e "\n${YELLOW}=== Test 8: --help flag should show usage ===${NC}"
help_output=$("$REMOVE_UTILITY" --help 2>&1)
exit_code=$?
if [ "$exit_code" -eq 0 ]; then
    echo -e "${GREEN}PASS${NC}: --help exits with 0"
    ((PASSED++))
else
    echo -e "${RED}FAIL${NC}: --help should exit with 0, got $exit_code"
    ((FAILED++))
fi
verify "--help output mentions -f" "echo '$help_output' | grep -q '\-f'"
verify "--help output mentions --force" "echo '$help_output' | grep -q '\-\-force'"
verify "--help output mentions branch-name" "echo '$help_output' | grep -q 'branch-name'"

echo -e "\n${YELLOW}=== Test 9: Verify error output goes to stderr ===${NC}"
stderr_output=$("$REMOVE_UTILITY" 2>&1 >/dev/null)
verify "Error message goes to stderr" "[ -n '$stderr_output' ]"

echo -e "\n${YELLOW}=== Test 10: Running from subdirectory should work ===${NC}"
ISSUE_ID="test:subdir" ISSUE_WORKSPACE_PATH="$TEST_DIR/repo" "$CREATE_UTILITY" "subdir-remove-test" >/dev/null 2>&1
cd "$TEST_DIR/repo/src"
output=$("$REMOVE_UTILITY" "subdir-remove-test" 2>/dev/null)
exit_code=$?

if [ "$exit_code" -eq 0 ]; then
    echo -e "${GREEN}PASS${NC}: Removal from subdirectory succeeded"
    ((PASSED++))
else
    echo -e "${RED}FAIL${NC}: Removal from subdirectory failed"
    ((FAILED++))
fi
cd "$TEST_DIR/repo"
verify "Worktree removed from subdirectory call" "[ ! -d '.worktrees/subdir-remove-test' ]"

echo -e "\n${YELLOW}=== Test 11: Feature branch with slash should work ===${NC}"
ISSUE_ID="test:feature" ISSUE_WORKSPACE_PATH="$TEST_DIR/repo" "$CREATE_UTILITY" "feature/remove-test" >/dev/null 2>&1
EXPECTED_SHA=$(git rev-parse "feature/remove-test" 2>/dev/null)

output=$("$REMOVE_UTILITY" "feature/remove-test" 2>/dev/null)
exit_code=$?

if [ "$exit_code" -eq 0 ]; then
    echo -e "${GREEN}PASS${NC}: Feature branch removal succeeded"
    ((PASSED++))
else
    echo -e "${RED}FAIL${NC}: Feature branch removal failed"
    ((FAILED++))
fi
verify "Feature branch worktree removed" "[ ! -d '.worktrees/feature/remove-test' ]"
verify "SHA returned for feature branch" "[ -n '$output' ]"

echo -e "\n${YELLOW}=== Test 12: Worktree with commits returns correct SHA ===${NC}"
ISSUE_ID="test:commits" ISSUE_WORKSPACE_PATH="$TEST_DIR/repo" "$CREATE_UTILITY" "commits-test" >/dev/null 2>&1
# Make commits in the worktree
cd ".worktrees/commits-test"
echo "new file" > new-file.txt
git add new-file.txt
git commit -m "Add new file" >/dev/null 2>&1
echo "another change" >> new-file.txt
git add new-file.txt
git commit -m "Update file" >/dev/null 2>&1
EXPECTED_SHA=$(git rev-parse HEAD)
cd "$TEST_DIR/repo"

output=$("$REMOVE_UTILITY" "commits-test" 2>/dev/null)
exit_code=$?

if [ "$exit_code" -eq 0 ]; then
    echo -e "${GREEN}PASS${NC}: Worktree with commits removed"
    ((PASSED++))
else
    echo -e "${RED}FAIL${NC}: Worktree with commits removal failed"
    ((FAILED++))
fi
verify "SHA matches latest commit" "[ '$output' = '$EXPECTED_SHA' ]"

# Summary
echo -e "\n${YELLOW}===== TEST SUMMARY =====${NC}"
echo -e "Passed: ${GREEN}$PASSED${NC}"
echo -e "Failed: ${RED}$FAILED${NC}"
echo "Total: $((PASSED + FAILED))"

if [ $FAILED -eq 0 ]; then
    echo -e "\n${GREEN}All tests passed!${NC}"
    exit 0
else
    echo -e "\n${RED}Some tests failed!${NC}"
    exit 1
fi
