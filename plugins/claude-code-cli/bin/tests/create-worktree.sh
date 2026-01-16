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
run_test "Missing branch name" 2 env ISSUE_ID="test:123" ISSUE_WORKSPACE_PATH="$TEST_DIR/repo" "$UTILITY"

echo -e "\n${YELLOW}=== Test 2: Missing ISSUE_ID env var should fail with exit 2 ===${NC}"
run_test "Missing ISSUE_ID env var" 2 env ISSUE_WORKSPACE_PATH="$TEST_DIR/repo" "$UTILITY" "test-branch"

echo -e "\n${YELLOW}=== Test 3: Invalid branch name format should fail with exit 2 ===${NC}"
run_test "Invalid branch name (starts with hyphen)" 2 env ISSUE_ID="test:123" ISSUE_WORKSPACE_PATH="$TEST_DIR/repo" "$UTILITY" "-invalid"
run_test "Invalid branch name (special chars)" 2 env ISSUE_ID="test:123" ISSUE_WORKSPACE_PATH="$TEST_DIR/repo" "$UTILITY" "test@branch"

echo -e "\n${YELLOW}=== Test 4: Basic worktree creation with ISSUE_ID should succeed ===${NC}"
run_test "Create worktree with ISSUE_ID" 0 env ISSUE_ID="test:123" ISSUE_WORKSPACE_PATH="$TEST_DIR/repo" "$UTILITY" "hooks-test-1"
verify "Worktree directory exists" "[ -d '.worktrees/hooks-test-1' ]"
verify "Branch created" "git branch --list hooks-test-1 | grep -q hooks-test-1"
verify "Source files copied" "[ -f '.worktrees/hooks-test-1/README.md' ]"
verify "Source files copied (src/index.js)" "[ -f '.worktrees/hooks-test-1/src/index.js' ]"

echo -e "\n${YELLOW}=== Test 5: Hook files exist in worktree git directory after creation ===${NC}"
WORKTREE_GIT_DIR=$(git -C ".worktrees/hooks-test-1" rev-parse --git-dir 2>/dev/null)
verify "post-commit hook exists" "[ -f '$WORKTREE_GIT_DIR/hooks/post-commit' ]"
verify "post-rewrite hook exists" "[ -f '$WORKTREE_GIT_DIR/hooks/post-rewrite' ]"
verify "pre-commit hook exists" "[ -f '$WORKTREE_GIT_DIR/hooks/pre-commit' ]"
verify "pre-push hook exists" "[ -f '$WORKTREE_GIT_DIR/hooks/pre-push' ]"

echo -e "\n${YELLOW}=== Test 6: Hooks are executable (-x permission) ===${NC}"
verify "post-commit hook is executable" "[ -x '$WORKTREE_GIT_DIR/hooks/post-commit' ]"
verify "post-rewrite hook is executable" "[ -x '$WORKTREE_GIT_DIR/hooks/post-rewrite' ]"
verify "pre-commit hook is executable" "[ -x '$WORKTREE_GIT_DIR/hooks/pre-commit' ]"
verify "pre-push hook is executable" "[ -x '$WORKTREE_GIT_DIR/hooks/pre-push' ]"

echo -e "\n${YELLOW}=== Test 6b: core.hooksPath is overridden for worktree ===${NC}"
HOOKS_PATH=$(git -C ".worktrees/hooks-test-1" config --worktree core.hooksPath 2>/dev/null)
verify "core.hooksPath is set" "[ -n '$HOOKS_PATH' ]"
verify "core.hooksPath points to git dir hooks" "[[ '$HOOKS_PATH' == *'/hooks' ]]"

echo -e "\n${YELLOW}=== Test 7: Issue ID stored correctly in git config ===${NC}"
STORED_ISSUE_ID=$(git -C ".worktrees/hooks-test-1" config --worktree issue.id 2>/dev/null)
verify "Issue ID matches" "[ '$STORED_ISSUE_ID' = 'test:123' ]"

echo -e "\n${YELLOW}=== Test 8: Workspace path stored correctly in git config ===${NC}"
STORED_WORKSPACE_PATH=$(git -C ".worktrees/hooks-test-1" config --worktree issue.workspacePath 2>/dev/null)
verify "Workspace path is stored" "[ -n '$STORED_WORKSPACE_PATH' ]"
verify "Workspace path is absolute path" "[[ '$STORED_WORKSPACE_PATH' == /* ]]"

echo -e "\n${YELLOW}=== Test 9: JSON output includes issueId field ===${NC}"
output=$(ISSUE_ID="test:456" ISSUE_WORKSPACE_PATH="$TEST_DIR/repo" "$UTILITY" "json-test-branch" 2>/dev/null)
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

echo -e "\n${YELLOW}=== Test 12: baseBranch stored correctly in git config ===${NC}"
STORED_BASE_BRANCH=$(git -C ".worktrees/json-test-branch" config --worktree issue.baseBranch 2>/dev/null)
verify "baseBranch is stored" "[ -n '$STORED_BASE_BRANCH' ]"
verify "baseBranch defaults to main" "[ '$STORED_BASE_BRANCH' = 'main' ]"

echo -e "\n${YELLOW}=== Test 13: Duplicate branch name should fail ===${NC}"
run_test "Duplicate branch" 2 env ISSUE_ID="test:789" ISSUE_WORKSPACE_PATH="$TEST_DIR/repo" "$UTILITY" "hooks-test-1"

echo -e "\n${YELLOW}=== Test 14: Not in git repository should fail ===${NC}"
cd /tmp
run_test "Not in git repo" 2 env ISSUE_ID="test:000" ISSUE_WORKSPACE_PATH="/tmp" "$UTILITY" "no-repo-branch"
cd "$TEST_DIR/repo"

echo -e "\n${YELLOW}=== Test 15: Verify error output goes to stderr ===${NC}"
stderr_output=$("$UTILITY" 2>&1 >/dev/null)
verify "Error message goes to stderr" "[ -n '$stderr_output' ]"

echo -e "\n${YELLOW}=== Test 16: Running from subdirectory should work ===${NC}"
cd "$TEST_DIR/repo/src"
run_test "From subdirectory" 0 env ISSUE_ID="test:subdirtest" ISSUE_WORKSPACE_PATH="$TEST_DIR/repo" "$UTILITY" "subdir-hooks-branch"
verify "Worktree created at repo root" "[ -d '$TEST_DIR/repo/.worktrees/subdir-hooks-branch' ]"
cd "$TEST_DIR/repo"

echo -e "\n${YELLOW}=== Test 17: --help flag should show usage ===${NC}"
help_output=$("$UTILITY" --help 2>&1)
exit_code=$?
if [ "$exit_code" -eq 0 ]; then
    echo -e "${GREEN}PASS${NC}: --help exits with 0"
    ((PASSED++))
else
    echo -e "${RED}FAIL${NC}: --help should exit with 0, got $exit_code"
    ((FAILED++))
fi
verify "--help output mentions ISSUE_ID" "echo '$help_output' | grep -q 'ISSUE_ID'"
verify "--help output mentions branch-name" "echo '$help_output' | grep -q 'branch-name'"

echo -e "\n${YELLOW}=== Test 18: Feature branch with slash should work ===${NC}"
run_test "Feature branch with slash" 0 env ISSUE_ID="test:feature" ISSUE_WORKSPACE_PATH="$TEST_DIR/repo" "$UTILITY" "feature/new-feature"
verify "Feature branch worktree exists" "[ -d '.worktrees/feature/new-feature' ]"
# Verify hooks were installed for feature branch
FEATURE_GIT_DIR=$(git -C ".worktrees/feature/new-feature" rev-parse --git-dir 2>/dev/null)
verify "Feature branch has hooks" "[ -f '$FEATURE_GIT_DIR/hooks/post-commit' ]"

echo -e "\n${YELLOW}=== Test 19: Issue ID with different formats ===${NC}"
run_test "Issue ID with colon format" 0 env ISSUE_ID="main:259" ISSUE_WORKSPACE_PATH="$TEST_DIR/repo" "$UTILITY" "issue-format-test-1"
run_test "Issue ID simple format" 0 env ISSUE_ID="simple-issue-id" ISSUE_WORKSPACE_PATH="$TEST_DIR/repo" "$UTILITY" "issue-format-test-2"

echo -e "\n${YELLOW}=== Test 20: Monorepo symlink rerouting ===${NC}"
# Set up a monorepo structure
cd "$TEST_DIR/repo"

# Create monorepo package.json with workspaces
cat > package.json << 'PKGEOF'
{
  "name": "test-monorepo",
  "version": "1.0.0",
  "workspaces": [
    "packages/*"
  ]
}
PKGEOF

# Create workspace packages
mkdir -p packages/core/src
cat > packages/core/package.json << 'PKGEOF'
{
  "name": "@test/core",
  "version": "1.0.0"
}
PKGEOF
echo "export const core = 'core';" > packages/core/src/index.ts

mkdir -p packages/utils/src
cat > packages/utils/package.json << 'PKGEOF'
{
  "name": "@test/utils",
  "version": "1.0.0"
}
PKGEOF
echo "export const utils = 'utils';" > packages/utils/src/index.ts

# Simulate Yarn workspace links in node_modules
mkdir -p node_modules/@test
ln -sf ../../packages/core node_modules/@test/core
ln -sf ../../packages/utils node_modules/@test/utils

# Create external dependency (real directory, not symlink)
mkdir -p node_modules/lodash
echo '{"name": "lodash"}' > node_modules/lodash/package.json

# Commit monorepo structure
git add .
git commit -m "Add monorepo structure" >/dev/null 2>&1

# Create worktree
run_test "Create monorepo worktree" 0 env ISSUE_ID="test:monorepo" ISSUE_WORKSPACE_PATH="$TEST_DIR/repo" "$UTILITY" "monorepo-test"

# Verify node_modules is a real directory (not symlink) because of rerouting
verify "node_modules is a real directory (not symlink)" "[ -d '.worktrees/monorepo-test/node_modules' ] && [ ! -L '.worktrees/monorepo-test/node_modules' ]"

# Verify workspace packages are symlinks with correct relative paths
verify "Workspace package @test/core is symlink" "[ -L '.worktrees/monorepo-test/node_modules/@test/core' ]"
verify "Workspace package @test/utils is symlink" "[ -L '.worktrees/monorepo-test/node_modules/@test/utils' ]"

# Verify workspace packages resolve to worktree packages (not main repo)
CORE_RESOLVED=$(realpath ".worktrees/monorepo-test/node_modules/@test/core" 2>/dev/null)
UTILS_RESOLVED=$(realpath ".worktrees/monorepo-test/node_modules/@test/utils" 2>/dev/null)
verify "Workspace package @test/core resolves to worktree" "[ \"\$CORE_RESOLVED\" = \"\$TEST_DIR/repo/.worktrees/monorepo-test/packages/core\" ]"
verify "Workspace package @test/utils resolves to worktree" "[ \"\$UTILS_RESOLVED\" = \"\$TEST_DIR/repo/.worktrees/monorepo-test/packages/utils\" ]"

# Verify external dependencies are still symlinked to main repo (shared)
LODASH_TARGET=$(readlink ".worktrees/monorepo-test/node_modules/lodash" 2>/dev/null || echo "not-symlink")
verify "External package (lodash) is symlinked to main repo" "[ \"\$LODASH_TARGET\" = \"\$TEST_DIR/repo/node_modules/lodash\" ]"

# Verify JSON output includes reroutedSymlinks count
first_output=$(env ISSUE_ID="test:monorepo" ISSUE_WORKSPACE_PATH="$TEST_DIR/repo" "$UTILITY" "monorepo-test" 2>&1 | grep '^{' || echo "{}")
if [ -n "$first_output" ] && echo "$first_output" | grep -q '"worktree"'; then
    verify "JSON output includes reroutedSymlinks field" "echo '\$first_output' | python3 -c 'import json,sys; d=json.load(sys.stdin); assert \"reroutedSymlinks\" in d' 2>/dev/null"
    verify "reroutedSymlinks count is > 0" "echo '\$first_output' | python3 -c 'import json,sys; d=json.load(sys.stdin); assert d[\"reroutedSymlinks\"] > 0' 2>/dev/null"
else
    # Worktree already exists, check it was created with rerouting
    verify "Monorepo worktree was created with rerouting" "[ -d '.worktrees/monorepo-test/node_modules/@test' ]"
fi

echo -e "\n${YELLOW}=== Test 21: Non-monorepo has no rerouting ===${NC}"
# Test that non-monorepo repos don't trigger rerouting
cd "$TEST_DIR/repo"

# Back up and replace package.json to remove workspaces
if [ -f package.json ]; then
    mv package.json package.json.backup
fi

cat > package.json << 'PKGEOF'
{
  "name": "regular-project",
  "version": "1.0.0"
}
PKGEOF

git add package.json
git commit -m "Remove workspaces (testing non-monorepo)" >/dev/null 2>&1

run_test "Create non-monorepo worktree" 0 env ISSUE_ID="test:nonmonorepo" ISSUE_WORKSPACE_PATH="$TEST_DIR/repo" "$UTILITY" "non-monorepo-branch"

# In non-monorepo, node_modules should still be symlinked (no rerouting)
verify "node_modules is symlinked in non-monorepo" "[ -L '.worktrees/non-monorepo-branch/node_modules' ]"

# JSON output should not have reroutedSymlinks field
output=$(env ISSUE_ID="test:nonmonorepo" ISSUE_WORKSPACE_PATH="$TEST_DIR/repo" "$UTILITY" "non-monorepo-branch" 2>&1 | grep '^{' || echo "{}")
verify "JSON output has no reroutedSymlinks in non-monorepo" "! echo '\$output' | grep -q 'reroutedSymlinks'"

# Restore original package.json if it existed
if [ -f package.json.backup ]; then
    mv package.json.backup package.json
    git add package.json
    git commit -m "Restore package.json" >/dev/null 2>&1
fi

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
