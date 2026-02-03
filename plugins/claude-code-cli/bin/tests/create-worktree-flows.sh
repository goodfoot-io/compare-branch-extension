#!/bin/bash

# Integration test suite for create-worktree and remove-worktree
# Tests the complete workflow of creating and removing worktrees with hooks

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Create a test directory in /tmp/
TEST_DIR="/tmp/test-worktree-hooks-flows-$$"
mkdir -p "$TEST_DIR"

# Test counters
PASSED=0
FAILED=0

# Cleanup function
cleanup() {
    cd /
    if [ -n "${MOCK_SERVER_PID:-}" ]; then
        kill "$MOCK_SERVER_PID" 2>/dev/null || true
        wait "$MOCK_SERVER_PID" 2>/dev/null || true
    fi
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

echo "Integration Test Suite: create-worktree + remove-worktree"
echo "Test directory: $TEST_DIR"
echo "Creating test repository..."
init_test_repo "$TEST_DIR/repo"

# Set up required directory structure for the tests
mkdir -p "$TEST_DIR/repo/.devcontainer/utilities"
# Copy the actual utilities
if [ -f "/workspace/.devcontainer/utilities/instant-worktree" ]; then
    cp "/workspace/.devcontainer/utilities/instant-worktree" "$TEST_DIR/repo/.devcontainer/utilities/"
    chmod +x "$TEST_DIR/repo/.devcontainer/utilities/instant-worktree"
else
    echo -e "${RED}Error: instant-worktree not found${NC}"
    exit 1
fi

if [ -f "/workspace/.devcontainer/utilities/remove-instant-worktree" ]; then
    cp "/workspace/.devcontainer/utilities/remove-instant-worktree" "$TEST_DIR/repo/.devcontainer/utilities/"
    chmod +x "$TEST_DIR/repo/.devcontainer/utilities/remove-instant-worktree"
else
    echo -e "${RED}Error: remove-instant-worktree not found${NC}"
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

echo -e "\n${YELLOW}=== Flow 1: Complete create/remove lifecycle ===${NC}"
echo "Creating worktree with hooks..."
create_output=$(ISSUE_ID="flow:1" ISSUE_WORKSPACE_PATH="$TEST_DIR/repo" "$CREATE_UTILITY" "flow-test-1" 2>&1)
create_exit=$?

verify "Worktree created successfully" "[ $create_exit -eq 0 ]"
verify "Worktree directory exists" "[ -d '.worktrees/flow-test-1' ]"
verify "Branch exists" "git branch --list flow-test-1 | grep -q flow-test-1"

# Verify JSON output
CREATE_BASE_SHA=$(echo "$create_output" | python3 -c 'import json,sys; print(json.load(sys.stdin)["baseSha"])' 2>/dev/null)
CREATE_ISSUE_ID=$(echo "$create_output" | python3 -c 'import json,sys; print(json.load(sys.stdin)["issueId"])' 2>/dev/null)
verify "JSON output contains valid baseSha" "[ -n '$CREATE_BASE_SHA' ] && [ \${#CREATE_BASE_SHA} -eq 40 ]"
verify "JSON output contains issueId" "[ '$CREATE_ISSUE_ID' = 'flow:1' ]"

# Capture SHA before removal
EXPECTED_SHA=$(git rev-parse "flow-test-1" 2>/dev/null)
verify "baseSha matches branch HEAD" "[ '$CREATE_BASE_SHA' = '$EXPECTED_SHA' ]"
CREATE_BASE_BRANCH=$(git -C ".worktrees/flow-test-1" config --worktree issue.baseBranch 2>/dev/null)
verify "baseBranch stored for worktree" "[ '$CREATE_BASE_BRANCH' = 'main' ]"

# Verify hooks exist
WORKTREE_GIT_DIR=$(git -C ".worktrees/flow-test-1" rev-parse --git-dir 2>/dev/null)
verify "post-commit hook installed" "[ -x '$WORKTREE_GIT_DIR/hooks/post-commit' ]"
verify "post-rewrite hook installed" "[ -x '$WORKTREE_GIT_DIR/hooks/post-rewrite' ]"

echo "Removing worktree..."
remove_output=$("$REMOVE_UTILITY" "flow-test-1" 2>&1)
remove_exit=$?

verify "Worktree removed successfully" "[ $remove_exit -eq 0 ]"
verify "Worktree directory removed" "[ ! -d '.worktrees/flow-test-1' ]"
verify "Branch deleted" "! git branch --list flow-test-1 | grep -q flow-test-1"
verify "SHA returned matches" "[ '$remove_output' = '$EXPECTED_SHA' ]"

echo -e "\n${YELLOW}=== Flow 2: Create worktree, make commit, verify hook execution ===${NC}"
echo "Creating worktree..."
ISSUE_ID="flow:2" ISSUE_WORKSPACE_PATH="$TEST_DIR/repo" "$CREATE_UTILITY" "flow-test-2" >/dev/null 2>&1
verify "Worktree created" "[ -d '.worktrees/flow-test-2' ]"

# Verify config is set correctly for hooks to use
STORED_ISSUE_ID=$(git -C ".worktrees/flow-test-2" config --worktree issue.id 2>/dev/null)
STORED_PLUGIN_BIN=$(git -C ".worktrees/flow-test-2" config --worktree issue.pluginBinDir 2>/dev/null)
verify "issue.id stored for hooks" "[ '$STORED_ISSUE_ID' = 'flow:2' ]"
verify "issue.pluginBinDir stored for hooks" "[ -n '$STORED_PLUGIN_BIN' ]"

echo "Making changes in worktree..."
cd ".worktrees/flow-test-2"
echo "new feature code" > src/feature.js
git add src/feature.js
# Commit will trigger post-commit hook - we just verify it doesn't fail
git commit -m "Add new feature" >/dev/null 2>&1
COMMIT_SHA=$(git rev-parse HEAD)
cd "$TEST_DIR/repo"

verify "Commit succeeded (hook didn't block)" "[ -n '$COMMIT_SHA' ]"
verify "Commit created new SHA" "[ '$COMMIT_SHA' != '$CREATE_BASE_SHA' ]"

echo "Removing worktree with commits..."
remove_output=$("$REMOVE_UTILITY" "flow-test-2" 2>&1)
remove_exit=$?

verify "Worktree with commits removed" "[ $remove_exit -eq 0 ]"
verify "SHA matches the latest commit" "[ '$remove_output' = '$COMMIT_SHA' ]"
verify "Directory cleaned up" "[ ! -d '.worktrees/flow-test-2' ]"

echo -e "\n${YELLOW}=== Flow 3: Worktree git config persists across operations ===${NC}"
echo "Creating worktree..."
ISSUE_ID="flow:3:complex:id" ISSUE_WORKSPACE_PATH="$TEST_DIR/repo" "$CREATE_UTILITY" "flow-test-3" >/dev/null 2>&1

# Verify initial config
INITIAL_ISSUE_ID=$(git -C ".worktrees/flow-test-3" config --worktree issue.id 2>/dev/null)
INITIAL_BASE_SHA=$(git -C ".worktrees/flow-test-3" config --worktree issue.baseSha 2>/dev/null)
INITIAL_BASE_BRANCH=$(git -C ".worktrees/flow-test-3" config --worktree issue.baseBranch 2>/dev/null)
INITIAL_PLUGIN_BIN=$(git -C ".worktrees/flow-test-3" config --worktree issue.pluginBinDir 2>/dev/null)

verify "Initial issue.id correct" "[ '$INITIAL_ISSUE_ID' = 'flow:3:complex:id' ]"
verify "Initial baseSha stored" "[ -n '$INITIAL_BASE_SHA' ]"
verify "Initial baseBranch stored" "[ '$INITIAL_BASE_BRANCH' = 'main' ]"
verify "Initial pluginBinDir stored" "[ -n '$INITIAL_PLUGIN_BIN' ]"

# Make multiple commits
cd ".worktrees/flow-test-3"
for i in 1 2 3; do
    echo "change $i" > "file$i.txt"
    git add "file$i.txt"
    git commit -m "Change $i" >/dev/null 2>&1
done
cd "$TEST_DIR/repo"

# Config should still be correct after commits
POST_COMMIT_ISSUE_ID=$(git -C ".worktrees/flow-test-3" config --worktree issue.id 2>/dev/null)
POST_COMMIT_BASE_SHA=$(git -C ".worktrees/flow-test-3" config --worktree issue.baseSha 2>/dev/null)
POST_COMMIT_BASE_BRANCH=$(git -C ".worktrees/flow-test-3" config --worktree issue.baseBranch 2>/dev/null)
POST_COMMIT_PLUGIN_BIN=$(git -C ".worktrees/flow-test-3" config --worktree issue.pluginBinDir 2>/dev/null)

verify "issue.id persists after commits" "[ '$POST_COMMIT_ISSUE_ID' = '$INITIAL_ISSUE_ID' ]"
verify "baseSha persists after commits" "[ '$POST_COMMIT_BASE_SHA' = '$INITIAL_BASE_SHA' ]"
verify "baseBranch persists after commits" "[ '$POST_COMMIT_BASE_BRANCH' = '$INITIAL_BASE_BRANCH' ]"
verify "pluginBinDir persists after commits" "[ '$POST_COMMIT_PLUGIN_BIN' = '$INITIAL_PLUGIN_BIN' ]"

# Cleanup
"$REMOVE_UTILITY" "flow-test-3" >/dev/null 2>&1

echo -e "\n${YELLOW}=== Flow 4: Multiple worktrees with different issue IDs ===${NC}"
echo "Creating multiple worktrees..."
ISSUE_ID="issue:alpha" ISSUE_WORKSPACE_PATH="$TEST_DIR/repo" "$CREATE_UTILITY" "parallel-1" >/dev/null 2>&1
ISSUE_ID="issue:beta" ISSUE_WORKSPACE_PATH="$TEST_DIR/repo" "$CREATE_UTILITY" "parallel-2" >/dev/null 2>&1
ISSUE_ID="issue:gamma" ISSUE_WORKSPACE_PATH="$TEST_DIR/repo" "$CREATE_UTILITY" "parallel-3" >/dev/null 2>&1

verify "All worktrees created" "[ -d '.worktrees/parallel-1' ] && [ -d '.worktrees/parallel-2' ] && [ -d '.worktrees/parallel-3' ]"

# Verify each has correct issue ID
ID1=$(git -C ".worktrees/parallel-1" config --worktree issue.id 2>/dev/null)
ID2=$(git -C ".worktrees/parallel-2" config --worktree issue.id 2>/dev/null)
ID3=$(git -C ".worktrees/parallel-3" config --worktree issue.id 2>/dev/null)

verify "parallel-1 has correct issue ID" "[ '$ID1' = 'issue:alpha' ]"
verify "parallel-2 has correct issue ID" "[ '$ID2' = 'issue:beta' ]"
verify "parallel-3 has correct issue ID" "[ '$ID3' = 'issue:gamma' ]"

# Each worktree should have its own hooks
for wt in parallel-1 parallel-2 parallel-3; do
    GIT_DIR=$(git -C ".worktrees/$wt" rev-parse --git-dir 2>/dev/null)
    verify "$wt has post-commit hook" "[ -x '$GIT_DIR/hooks/post-commit' ]"
done

# Cleanup all
"$REMOVE_UTILITY" "parallel-1" >/dev/null 2>&1
"$REMOVE_UTILITY" "parallel-2" >/dev/null 2>&1
"$REMOVE_UTILITY" "parallel-3" >/dev/null 2>&1

verify "All worktrees removed" "[ ! -d '.worktrees/parallel-1' ] && [ ! -d '.worktrees/parallel-2' ] && [ ! -d '.worktrees/parallel-3' ]"

echo -e "\n${YELLOW}=== Flow 5: Create from within an existing worktree ===${NC}"
echo "Creating parent worktree..."
ISSUE_ID="issue:parent" ISSUE_WORKSPACE_PATH="$TEST_DIR/repo" "$CREATE_UTILITY" "parent-worktree" >/dev/null 2>&1
verify "Parent worktree exists" "[ -d '.worktrees/parent-worktree' ]"

# Run create from inside the parent worktree
cd "$TEST_DIR/repo/.worktrees/parent-worktree"
ISSUE_ID="issue:child" ISSUE_WORKSPACE_PATH="$TEST_DIR/repo" "$CREATE_UTILITY" "child-from-worktree" >/dev/null 2>&1
cd "$TEST_DIR/repo"

# The new worktree should be at the main repo root, not nested
verify "Child worktree created at repo root (not nested)" "[ -d '.worktrees/child-from-worktree' ]"
verify "No nested .worktrees directory in parent" "[ ! -d '.worktrees/parent-worktree/.worktrees' ]"

# Verify child has correct config
CHILD_ISSUE=$(git -C ".worktrees/child-from-worktree" config --worktree issue.id 2>/dev/null)
verify "Child has correct issue ID" "[ '$CHILD_ISSUE' = 'issue:child' ]"

# Cleanup
"$REMOVE_UTILITY" "child-from-worktree" >/dev/null 2>&1
"$REMOVE_UTILITY" "parent-worktree" >/dev/null 2>&1

echo -e "\n${YELLOW}=== Flow 6: Symlinks preserved during lifecycle ===${NC}"
echo "Creating worktree and verifying symlinks..."
ISSUE_ID="issue:symlink" ISSUE_WORKSPACE_PATH="$TEST_DIR/repo" "$CREATE_UTILITY" "symlink-test" >/dev/null 2>&1

verify "node_modules is symlinked" "[ -L '.worktrees/symlink-test/node_modules' ]"
verify "dist is symlinked" "[ -L '.worktrees/symlink-test/dist' ]"
verify "Symlinked content accessible" "[ -f '.worktrees/symlink-test/node_modules/some-package/package.json' ]"

# Verify hooks are still installed alongside symlinks
SYMLINK_GIT_DIR=$(git -C ".worktrees/symlink-test" rev-parse --git-dir 2>/dev/null)
verify "Hooks exist with symlinks" "[ -x '$SYMLINK_GIT_DIR/hooks/post-commit' ]"

"$REMOVE_UTILITY" "symlink-test" >/dev/null 2>&1

verify "Original node_modules still exists after removal" "[ -d 'node_modules' ]"

echo -e "\n${YELLOW}=== Flow 7: SHA recovery scenario ===${NC}"
echo "Simulating branch recovery using returned SHA..."
ISSUE_ID="issue:recovery" ISSUE_WORKSPACE_PATH="$TEST_DIR/repo" "$CREATE_UTILITY" "recovery-test" >/dev/null 2>&1

# Make some commits
cd ".worktrees/recovery-test"
echo "important work" > important.txt
git add important.txt
git commit -m "Important commit" >/dev/null 2>&1
IMPORTANT_SHA=$(git rev-parse HEAD)
cd "$TEST_DIR/repo"

# Remove and capture SHA
RETURNED_SHA=$("$REMOVE_UTILITY" "recovery-test" 2>/dev/null)

verify "Returned SHA matches important commit" "[ '$RETURNED_SHA' = '$IMPORTANT_SHA' ]"

# Verify we can recover the commit using the SHA
git show "$RETURNED_SHA" --quiet >/dev/null 2>&1
verify "Commit is recoverable via SHA" "[ $? -eq 0 ]"

echo -e "\n${YELLOW}=== Flow 8: Error handling consistency ===${NC}"
echo "Testing error conditions..."

# Try to create with same issue but different branches (should succeed)
ISSUE_ID="error:test" ISSUE_WORKSPACE_PATH="$TEST_DIR/repo" "$CREATE_UTILITY" "error-branch-1" >/dev/null 2>&1
ISSUE_ID="error:test" ISSUE_WORKSPACE_PATH="$TEST_DIR/repo" "$CREATE_UTILITY" "error-branch-2" >/dev/null 2>&1
verify "Same issue ID on different branches allowed" "[ -d '.worktrees/error-branch-1' ] && [ -d '.worktrees/error-branch-2' ]"

# Both should have same issue ID
ID_A=$(git -C ".worktrees/error-branch-1" config --worktree issue.id 2>/dev/null)
ID_B=$(git -C ".worktrees/error-branch-2" config --worktree issue.id 2>/dev/null)
verify "Both branches have same issue ID" "[ '$ID_A' = '$ID_B' ]"

# Try to create duplicate branch (should fail)
create_dup_exit=$(ISSUE_ID="error:dup" ISSUE_WORKSPACE_PATH="$TEST_DIR/repo" "$CREATE_UTILITY" "error-branch-1" 2>&1; echo $?)
create_dup_exit=$(echo "$create_dup_exit" | tail -1)
verify "Creating duplicate branch fails with exit 2" "[ '$create_dup_exit' = '2' ]"

# Cleanup
"$REMOVE_UTILITY" -f "error-branch-1" >/dev/null 2>&1
"$REMOVE_UTILITY" -f "error-branch-2" >/dev/null 2>&1

echo -e "\n${YELLOW}=== Flow 9: Hook content verification ===${NC}"
echo "Verifying hook scripts have required content..."
ISSUE_ID="hook:verify" ISSUE_WORKSPACE_PATH="$TEST_DIR/repo" "$CREATE_UTILITY" "hook-content-test" >/dev/null 2>&1

HOOK_GIT_DIR=$(git -C ".worktrees/hook-content-test" rev-parse --git-dir 2>/dev/null)
POST_COMMIT_HOOK="$HOOK_GIT_DIR/hooks/post-commit"
POST_REWRITE_HOOK="$HOOK_GIT_DIR/hooks/post-rewrite"

# Verify post-commit hook has required elements (using grep directly on files)
verify "post-commit reads issue.id from config" "grep -q 'issue.id' '$POST_COMMIT_HOOK'"
verify "post-commit reads workspacePath from config" "grep -q 'issue.workspacePath' '$POST_COMMIT_HOOK'"
verify "post-commit uses issues-api.json" "grep -q 'issues-api.json' '$POST_COMMIT_HOOK'"
verify "post-commit posts to issues API" "grep -q 'issues/\$ISSUE_ID/comments' '$POST_COMMIT_HOOK'"

# Verify post-rewrite hook has required elements
verify "post-rewrite reads issue.id from config" "grep -q 'issue.id' '$POST_REWRITE_HOOK'"
verify "post-rewrite reads issue.baseBranch from config" "grep -q 'issue.baseBranch' '$POST_REWRITE_HOOK'"
verify "post-rewrite recalculates baseSha" "grep -q 'merge-base' '$POST_REWRITE_HOOK'"
verify "post-rewrite handles old SHA pairs" "grep -q 'OLD_SHAS' '$POST_REWRITE_HOOK'"
verify "post-rewrite deletes old comments" "grep -q 'DELETE' '$POST_REWRITE_HOOK'"

"$REMOVE_UTILITY" "hook-content-test" >/dev/null 2>&1

echo -e "\n${YELLOW}=== Flow 10: Recreate after removal ===${NC}"
echo "Creating, removing, then recreating same branch with different issue..."
ISSUE_ID="first:issue" ISSUE_WORKSPACE_PATH="$TEST_DIR/repo" "$CREATE_UTILITY" "recreate-test" >/dev/null 2>&1
FIRST_ISSUE=$(git -C ".worktrees/recreate-test" config --worktree issue.id 2>/dev/null)
verify "First worktree has first issue ID" "[ '$FIRST_ISSUE' = 'first:issue' ]"

"$REMOVE_UTILITY" "recreate-test" >/dev/null 2>&1
verify "First worktree removed" "[ ! -d '.worktrees/recreate-test' ]"

ISSUE_ID="second:issue" ISSUE_WORKSPACE_PATH="$TEST_DIR/repo" "$CREATE_UTILITY" "recreate-test" >/dev/null 2>&1
SECOND_ISSUE=$(git -C ".worktrees/recreate-test" config --worktree issue.id 2>/dev/null)
verify "Second worktree has second issue ID" "[ '$SECOND_ISSUE' = 'second:issue' ]"
verify "Issue IDs are different" "[ '$FIRST_ISSUE' != '$SECOND_ISSUE' ]"

# Verify hooks still work in recreated worktree
RECREATE_GIT_DIR=$(git -C ".worktrees/recreate-test" rev-parse --git-dir 2>/dev/null)
verify "Recreated worktree has hooks" "[ -x '$RECREATE_GIT_DIR/hooks/post-commit' ]"

"$REMOVE_UTILITY" "recreate-test" >/dev/null 2>&1

echo -e "\n${YELLOW}=== Flow 11: Rebase updates baseSha and comments ===${NC}"
MOCK_HOME="$TEST_DIR/mock-home"
MOCK_SERVER_DIR="$TEST_DIR/mock-issues"
mkdir -p "$MOCK_HOME/.cards"
mkdir -p "$MOCK_SERVER_DIR"

SERVER_DATA="$MOCK_SERVER_DIR/state.json"
SERVER_PORT_FILE="$MOCK_SERVER_DIR/port.txt"
SERVER_SCRIPT="$MOCK_SERVER_DIR/server.js"

cat > "$SERVER_SCRIPT" << 'EOF'
const http = require('http');
const fs = require('fs');

const dataPath = process.argv[2];
const portFile = process.argv[3];

let state = { nextId: 1, cards: {} };

const save = () => {
  fs.writeFileSync(dataPath, JSON.stringify(state), 'utf8');
};

const sendJson = (res, status, body) => {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
};

const readBody = (req) => new Promise((resolve) => {
  let data = '';
  req.on('data', (chunk) => { data += chunk; });
  req.on('end', () => resolve(data));
});

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1');
  const parts = url.pathname.split('/').filter(Boolean);
  if (parts.length >= 4 && parts[0] === 'api' && parts[1] === 'v1' && parts[2] === 'issues') {
    const issueId = decodeURIComponent(parts[3] || '');
    if (!state.issues[issueId]) {
      state.issues[issueId] = [];
    }
    if (parts.length === 5 && parts[4] === 'comments') {
      if (req.method === 'GET') {
        sendJson(res, 200, state.issues[issueId]);
        return;
      }
      if (req.method === 'POST') {
        const raw = await readBody(req);
        let body = {};
        try {
          body = JSON.parse(raw || '{}');
        } catch {
          body = {};
        }
        const comment = { id: String(state.nextId++), commitSha: body.commitSha || null };
        state.issues[issueId].push(comment);
        save();
        sendJson(res, 201, comment);
        return;
      }
    }
    if (parts.length === 6 && parts[4] === 'comments' && req.method === 'DELETE') {
      const commentId = parts[5];
      state.issues[issueId] = state.issues[issueId].filter((c) => c.id !== commentId);
      save();
      res.statusCode = 204;
      res.end('');
      return;
    }
    if (parts.length === 4 && req.method === 'PATCH') {
      save();
      res.statusCode = 200;
      res.end('');
      return;
    }
  }
  res.statusCode = 404;
  res.end('not found');
});

server.listen(0, '127.0.0.1', () => {
  const port = server.address().port;
  fs.writeFileSync(portFile, String(port), 'utf8');
});

process.on('SIGTERM', () => {
  server.close(() => process.exit(0));
});
EOF

node "$SERVER_SCRIPT" "$SERVER_DATA" "$SERVER_PORT_FILE" >/dev/null 2>&1 &
MOCK_SERVER_PID=$!

for i in $(seq 1 50); do
    if [ -s "$SERVER_PORT_FILE" ]; then
        break
    fi
    sleep 0.1
done

MOCK_SERVER_PORT=$(cat "$SERVER_PORT_FILE" 2>/dev/null || echo "")
verify "Mock issues API started" "[ -n '$MOCK_SERVER_PORT' ]"

cat > "$MOCK_HOME/.cards/issues-api.json" << EOF
{
  "$TEST_DIR/repo": { "host": "127.0.0.1", "port": $MOCK_SERVER_PORT }
}
EOF

ISSUE_ID="flow:rebase"
ISSUE_ID_URL=$(ISSUE_ID="$ISSUE_ID" python3 - <<'PY'
import os
import urllib.parse
print(urllib.parse.quote(os.environ["ISSUE_ID"]))
PY
)

create_output=$(HOME="$MOCK_HOME" ISSUE_ID="$ISSUE_ID" ISSUE_WORKSPACE_PATH="$TEST_DIR/repo" "$CREATE_UTILITY" "flow-rebase" 2>&1)
create_exit=$?
verify "Worktree created for rebase flow" "[ $create_exit -eq 0 ]"

BASE_SHA_INITIAL=$(git -C ".worktrees/flow-rebase" config --worktree issue.baseSha 2>/dev/null)
BASE_COMMENT_ID_INITIAL=$(git -C ".worktrees/flow-rebase" config --worktree issue.baseShaCommentId 2>/dev/null)

cd ".worktrees/flow-rebase"
echo "rebase feature" > src/rebase-feature.txt
git add src/rebase-feature.txt
HOME="$MOCK_HOME" git commit -m "Rebase feature" >/dev/null 2>&1
COMMIT_SHA_BEFORE=$(git rev-parse HEAD)
cd "$TEST_DIR/repo"

COMMENTS=$(curl -s "http://127.0.0.1:$MOCK_SERVER_PORT/api/v1/issues/$ISSUE_ID_URL/comments" 2>/dev/null)
verify "Commit comment matches feature commit" "echo '$COMMENTS' | jq -e --arg sha '$COMMIT_SHA_BEFORE' '.[] | select(.commitSha == \$sha)' >/dev/null"

echo "main update" >> README.md
git add README.md
git commit -m "Main update" >/dev/null 2>&1
MAIN_SHA=$(git rev-parse HEAD)

cd ".worktrees/flow-rebase"
HOME="$MOCK_HOME" git rebase main >/dev/null 2>&1
COMMIT_SHA_AFTER=$(git rev-parse HEAD)
BASE_SHA_UPDATED=$(git config --worktree issue.baseSha 2>/dev/null)
cd "$TEST_DIR/repo"

verify "Rebase rewrote commit SHA" "[ '$COMMIT_SHA_AFTER' != '$COMMIT_SHA_BEFORE' ]"
verify "BaseSha updated to new main" "[ '$BASE_SHA_UPDATED' = '$MAIN_SHA' ]"

COMMENTS=$(curl -s "http://127.0.0.1:$MOCK_SERVER_PORT/api/v1/issues/$ISSUE_ID_URL/comments" 2>/dev/null)
verify "Old baseSha comment removed" "! echo '$COMMENTS' | jq -e --arg sha '$BASE_SHA_INITIAL' '.[] | select(.commitSha == \$sha)' >/dev/null"
verify "New commit comment posted after rebase" "echo '$COMMENTS' | jq -e --arg sha '$COMMIT_SHA_AFTER' '.[] | select(.commitSha == \$sha)' >/dev/null"
verify "Old commit comment removed" "! echo '$COMMENTS' | jq -e --arg sha '$COMMIT_SHA_BEFORE' '.[] | select(.commitSha == \$sha)' >/dev/null"

cd ".worktrees/flow-rebase"
sleep 1
HOME="$MOCK_HOME" git commit --amend --no-edit >/dev/null 2>&1
COMMIT_SHA_AMENDED=$(git rev-parse HEAD)
BASE_SHA_AMENDED=$(git config --worktree issue.baseSha 2>/dev/null)
cd "$TEST_DIR/repo"

verify "Amend rewrote commit SHA" "[ '$COMMIT_SHA_AMENDED' != '$COMMIT_SHA_AFTER' ]"
verify "BaseSha unchanged on amend" "[ '$BASE_SHA_AMENDED' = '$BASE_SHA_UPDATED' ]"

COMMENTS=$(curl -s "http://127.0.0.1:$MOCK_SERVER_PORT/api/v1/issues/$ISSUE_ID_URL/comments" 2>/dev/null)
verify "Amended commit comment posted" "echo '$COMMENTS' | jq -e --arg sha '$COMMIT_SHA_AMENDED' '.[] | select(.commitSha == \$sha)' >/dev/null"
verify "Prior commit comment removed on amend" "! echo '$COMMENTS' | jq -e --arg sha '$COMMIT_SHA_AFTER' '.[] | select(.commitSha == \$sha)' >/dev/null"

"$REMOVE_UTILITY" "flow-rebase" >/dev/null 2>&1
kill "$MOCK_SERVER_PID" 2>/dev/null || true
wait "$MOCK_SERVER_PID" 2>/dev/null || true
MOCK_SERVER_PID=""

# Summary
echo -e "\n${YELLOW}===== INTEGRATION TEST SUMMARY =====${NC}"
echo -e "Passed: ${GREEN}$PASSED${NC}"
echo -e "Failed: ${RED}$FAILED${NC}"
echo "Total: $((PASSED + FAILED))"

if [ $FAILED -eq 0 ]; then
    echo -e "\n${GREEN}All integration tests passed!${NC}"
    exit 0
else
    echo -e "\n${RED}Some integration tests failed!${NC}"
    exit 1
fi
