#!/bin/bash

# Test suite for create-worktree utility
# Tests run in /tmp/ test repositories

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Create a test directory in /tmp/
TEST_DIR="/tmp/test-create-worktree-hooks-$$"
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
    local stderr_file="/tmp/create_hooks_stderr_$$"
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
# The script expects to find instant-worktree in .devcontainer/utilities/
mkdir -p "$TEST_DIR/repo/.devcontainer/utilities"
# Copy the actual instant-worktree script (we need a working implementation)
if [ -f "/workspace/.devcontainer/utilities/instant-worktree" ]; then
    cp "/workspace/.devcontainer/utilities/instant-worktree" "$TEST_DIR/repo/.devcontainer/utilities/"
    chmod +x "$TEST_DIR/repo/.devcontainer/utilities/instant-worktree"
else
    echo -e "${RED}Error: instant-worktree not found at /workspace/.devcontainer/utilities/instant-worktree${NC}"
    exit 1
fi

# Determine the script path - use the worktree version if running from worktree
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
UTILITY="${SCRIPT_DIR}/../create-worktree.sh"

# Fall back to direct path if running from main workspace
if [ ! -x "$UTILITY" ]; then
    UTILITY="/workspace/public/plugins/claude-code-cli/bin/create-worktree.sh"
fi

# Also check for worktree path
if [ ! -x "$UTILITY" ]; then
    UTILITY="/workspace/.worktrees/issue-main-259-worktree-hooks/public/plugins/claude-code-cli/bin/create-worktree.sh"
fi

if [ ! -x "$UTILITY" ]; then
    echo -e "${RED}Error: create-worktree.sh not found${NC}"
    exit 1
fi

echo "Using utility: $UTILITY"

echo -e "\n${YELLOW}=== Test 1: Missing branch name argument should fail with exit 2 ===${NC}"
cd "$TEST_DIR/repo"
run_test "Missing branch name" 2 "$UTILITY" "--issue" "test:123"

echo -e "\n${YELLOW}=== Test 2: Missing --issue parameter should fail with exit 2 ===${NC}"
run_test "Missing --issue parameter" 2 "$UTILITY" "test-branch"

echo -e "\n${YELLOW}=== Test 3: Invalid branch name format should fail with exit 2 ===${NC}"
run_test "Invalid branch name (starts with hyphen)" 2 "$UTILITY" "--issue" "test:123" "-invalid"
run_test "Invalid branch name (special chars)" 2 "$UTILITY" "--issue" "test:123" "test@branch"

echo -e "\n${YELLOW}=== Test 4: Basic worktree creation with --issue parameter should succeed ===${NC}"
run_test "Create worktree with --issue" 0 "$UTILITY" "--issue" "test:123" "hooks-test-1"
verify "Worktree directory exists" "[ -d '.worktrees/hooks-test-1' ]"
verify "Branch created" "git branch --list hooks-test-1 | grep -q hooks-test-1"
verify "Source files copied" "[ -f '.worktrees/hooks-test-1/README.md' ]"
verify "Source files copied (src/index.js)" "[ -f '.worktrees/hooks-test-1/src/index.js' ]"

echo -e "\n${YELLOW}=== Test 5: Hook files exist in worktree git directory after creation ===${NC}"
WORKTREE_GIT_DIR=$(git -C ".worktrees/hooks-test-1" rev-parse --git-dir 2>/dev/null)
verify "post-commit hook exists" "[ -f '$WORKTREE_GIT_DIR/hooks/post-commit' ]"
verify "post-rewrite hook exists" "[ -f '$WORKTREE_GIT_DIR/hooks/post-rewrite' ]"

echo -e "\n${YELLOW}=== Test 6: Hooks are executable (-x permission) ===${NC}"
verify "post-commit hook is executable" "[ -x '$WORKTREE_GIT_DIR/hooks/post-commit' ]"
verify "post-rewrite hook is executable" "[ -x '$WORKTREE_GIT_DIR/hooks/post-rewrite' ]"

echo -e "\n${YELLOW}=== Test 7: Issue ID stored correctly in git config ===${NC}"
STORED_ISSUE_ID=$(git -C ".worktrees/hooks-test-1" config --worktree issue.id 2>/dev/null)
verify "Issue ID matches" "[ '$STORED_ISSUE_ID' = 'test:123' ]"

echo -e "\n${YELLOW}=== Test 8: Plugin bin path stored correctly in git config ===${NC}"
STORED_PLUGIN_BIN_DIR=$(git -C ".worktrees/hooks-test-1" config --worktree issue.pluginBinDir 2>/dev/null)
verify "Plugin bin dir is stored" "[ -n '$STORED_PLUGIN_BIN_DIR' ]"
verify "Plugin bin dir is absolute path" "[[ '$STORED_PLUGIN_BIN_DIR' == /* ]]"

echo -e "\n${YELLOW}=== Test 9: JSON output includes issueId field ===${NC}"
output=$("$UTILITY" "--issue" "test:456" "json-test-branch" 2>/dev/null)
verify "Output is valid JSON" "echo '$output' | python3 -c 'import json,sys; json.load(sys.stdin)' 2>/dev/null"
verify "JSON contains issueId field" "echo '$output' | python3 -c 'import json,sys; d=json.load(sys.stdin); assert d[\"issueId\"]==\"test:456\"' 2>/dev/null"

echo -e "\n${YELLOW}=== Test 10: JSON output includes branch, worktree, baseSha fields ===${NC}"
verify "JSON contains branch field" "echo '$output' | python3 -c 'import json,sys; d=json.load(sys.stdin); assert d[\"branch\"]==\"json-test-branch\"' 2>/dev/null"
verify "JSON contains worktree field" "echo '$output' | python3 -c 'import json,sys; d=json.load(sys.stdin); assert \".worktrees\" in d[\"worktree\"]' 2>/dev/null"
verify "JSON contains baseSha field (40 char hex)" "echo '$output' | python3 -c 'import json,sys,re; d=json.load(sys.stdin); assert re.match(r\"^[0-9a-f]{40}\$\", d[\"baseSha\"])' 2>/dev/null"

echo -e "\n${YELLOW}=== Test 11: baseSha stored correctly in git config ===${NC}"
STORED_BASE_SHA=$(git -C ".worktrees/json-test-branch" config --worktree issue.baseSha 2>/dev/null)
verify "baseSha is stored" "[ -n '$STORED_BASE_SHA' ]"
verify "baseSha is valid format (40 char hex)" "echo '$STORED_BASE_SHA' | grep -qE '^[a-f0-9]{40}$'"

echo -e "\n${YELLOW}=== Test 12: Duplicate branch name should fail ===${NC}"
run_test "Duplicate branch" 2 "$UTILITY" "--issue" "test:789" "hooks-test-1"

echo -e "\n${YELLOW}=== Test 13: Not in git repository should fail ===${NC}"
cd /tmp
run_test "Not in git repo" 2 "$UTILITY" "--issue" "test:000" "no-repo-branch"
cd "$TEST_DIR/repo"

echo -e "\n${YELLOW}=== Test 14: Verify error output goes to stderr ===${NC}"
stderr_output=$("$UTILITY" 2>&1 >/dev/null)
verify "Error message goes to stderr" "[ -n '$stderr_output' ]"

echo -e "\n${YELLOW}=== Test 15: Running from subdirectory should work ===${NC}"
cd "$TEST_DIR/repo/src"
run_test "From subdirectory" 0 "$UTILITY" "--issue" "test:subdirtest" "subdir-hooks-branch"
verify "Worktree created at repo root" "[ -d '$TEST_DIR/repo/.worktrees/subdir-hooks-branch' ]"
cd "$TEST_DIR/repo"

echo -e "\n${YELLOW}=== Test 16: --help flag should show usage ===${NC}"
help_output=$("$UTILITY" --help 2>&1)
exit_code=$?
if [ "$exit_code" -eq 0 ]; then
    echo -e "${GREEN}PASS${NC}: --help exits with 0"
    ((PASSED++))
else
    echo -e "${RED}FAIL${NC}: --help should exit with 0, got $exit_code"
    ((FAILED++))
fi
verify "--help output mentions --issue" "echo '$help_output' | grep -q '\-\-issue'"
verify "--help output mentions branch-name" "echo '$help_output' | grep -q 'branch-name'"

echo -e "\n${YELLOW}=== Test 17: Feature branch with slash should work ===${NC}"
run_test "Feature branch with slash" 0 "$UTILITY" "--issue" "test:feature" "feature/new-feature"
verify "Feature branch worktree exists" "[ -d '.worktrees/feature/new-feature' ]"
# Verify hooks were installed for feature branch
FEATURE_GIT_DIR=$(git -C ".worktrees/feature/new-feature" rev-parse --git-dir 2>/dev/null)
verify "Feature branch has hooks" "[ -f '$FEATURE_GIT_DIR/hooks/post-commit' ]"

echo -e "\n${YELLOW}=== Test 18: Issue parameter with different formats ===${NC}"
run_test "Issue ID with colon format" 0 "$UTILITY" "--issue" "main:259" "issue-format-test-1"
run_test "Issue ID simple format" 0 "$UTILITY" "--issue" "simple-issue-id" "issue-format-test-2"

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
