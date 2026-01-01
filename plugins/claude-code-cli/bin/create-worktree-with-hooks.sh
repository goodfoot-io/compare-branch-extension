#!/bin/bash

# create-worktree-with-hooks: Create a git worktree with automatic commitSha posting via git hooks
#
# This script wraps instant-worktree and installs git hooks that automatically post
# commit information to the Issues API. The hooks handle both regular commits and
# rebase/amend scenarios.
#
# Usage: create-worktree-with-hooks --issue <ISSUE_ID> <branch-name>
#
# Options:
#   --issue <ID>    Required. The issue ID to associate with commits (e.g., main:259)
#   --help          Show this help message
#
# Output: JSON with branch, worktree, baseSha, and issueId
# Exit codes:
#   0 - Success
#   2 - Failure (error details on stderr)
#
# The script installs two hooks in the worktree's git directory:
#   - post-commit: Posts commit info to Issues API after each commit
#   - post-rewrite: Handles rebase/amend by posting new commit and cleaning up old comments

set -e

# Get the directory where this script is located (plugin bin directory)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Parse arguments
ISSUE_ID=""
BRANCH_NAME=""
SHOW_HELP=false

while [ $# -gt 0 ]; do
    case "$1" in
        --issue)
            if [ -z "$2" ]; then
                printf '%s\n' "Error: --issue requires an argument" >&2
                exit 2
            fi
            ISSUE_ID="$2"
            shift 2
            ;;
        --help|-h)
            SHOW_HELP=true
            shift
            ;;
        -*)
            printf '%s\n' "Error: Unknown option '$1'" >&2
            printf '%s\n' "Usage: create-worktree-with-hooks --issue <ISSUE_ID> <branch-name>" >&2
            exit 2
            ;;
        *)
            if [ -z "$BRANCH_NAME" ]; then
                BRANCH_NAME="$1"
            else
                printf '%s\n' "Error: Unexpected argument '$1'" >&2
                printf '%s\n' "Usage: create-worktree-with-hooks --issue <ISSUE_ID> <branch-name>" >&2
                exit 2
            fi
            shift
            ;;
    esac
done

# Show help if requested
if [ "$SHOW_HELP" = "true" ]; then
    printf '%s\n' "Usage: create-worktree-with-hooks --issue <ISSUE_ID> <branch-name>"
    printf '%s\n' ""
    printf '%s\n' "Creates a git worktree with automatic commitSha posting via git hooks."
    printf '%s\n' ""
    printf '%s\n' "Options:"
    printf '%s\n' "  --issue <ID>    Required. The issue ID to associate with commits"
    printf '%s\n' "  --help          Show this help message"
    printf '%s\n' ""
    printf '%s\n' "The script installs hooks that automatically post commit information"
    printf '%s\n' "to the Issues API after each commit or rebase."
    exit 0
fi

# Validate required arguments
if [ -z "$ISSUE_ID" ]; then
    printf '%s\n' "Error: --issue <ISSUE_ID> is required" >&2
    printf '%s\n' "Usage: create-worktree-with-hooks --issue <ISSUE_ID> <branch-name>" >&2
    exit 2
fi

if [ -z "$BRANCH_NAME" ]; then
    printf '%s\n' "Error: branch-name argument is required" >&2
    printf '%s\n' "Usage: create-worktree-with-hooks --issue <ISSUE_ID> <branch-name>" >&2
    exit 2
fi

# Find workspace root by walking up directory tree looking for .git directory or file
WORKSPACE_ROOT=""
current_dir="$(pwd)"
while [ "$current_dir" != "/" ]; do
    if [ -d "$current_dir/.git" ]; then
        # .git directory means this is the main repository root
        WORKSPACE_ROOT="$current_dir"
        break
    elif [ -f "$current_dir/.git" ]; then
        # .git file means this is a worktree - resolve to main repository
        gitdir_line=$(cat "$current_dir/.git")
        gitdir_path="${gitdir_line#gitdir: }"
        main_git_dir="${gitdir_path%/worktrees/*}"
        WORKSPACE_ROOT="${main_git_dir%/.git}"
        break
    fi
    current_dir="$(dirname "$current_dir")"
done

if [ -z "$WORKSPACE_ROOT" ]; then
    printf '%s\n' "Error: Could not find git repository root" >&2
    exit 2
fi

# Find instant-worktree utility
INSTANT_WORKTREE="${WORKSPACE_ROOT}/.devcontainer/utilities/instant-worktree"
if [ ! -x "$INSTANT_WORKTREE" ]; then
    printf '%s\n' "Error: instant-worktree not found at $INSTANT_WORKTREE" >&2
    exit 2
fi

# Create the worktree using instant-worktree
RESULT=$("$INSTANT_WORKTREE" "$BRANCH_NAME" 2>&1) || {
    # Forward any error from instant-worktree
    printf '%s\n' "$RESULT" >&2
    exit 2
}

# Parse the JSON result to extract worktree path and baseSha
WORKTREE_DIR=$(printf '%s\n' "$RESULT" | jq -r '.worktree')
BASE_SHA=$(printf '%s\n' "$RESULT" | jq -r '.baseSha')

if [ -z "$WORKTREE_DIR" ] || [ "$WORKTREE_DIR" = "null" ]; then
    printf '%s\n' "Error: Failed to parse worktree path from instant-worktree output" >&2
    exit 2
fi

# Get the worktree's git directory
WORKTREE_GIT_DIR=$(git -C "$WORKTREE_DIR" rev-parse --git-dir 2>/dev/null)
if [ -z "$WORKTREE_GIT_DIR" ]; then
    printf '%s\n' "Error: Could not determine git directory for worktree" >&2
    exit 2
fi

# Store issue context in worktree git config
git -C "$WORKTREE_DIR" config --worktree issue.id "$ISSUE_ID" 2>/dev/null || {
    printf '%s\n' "Error: Failed to store issue.id in worktree git config" >&2
    exit 2
}
git -C "$WORKTREE_DIR" config --worktree issue.baseSha "$BASE_SHA" 2>/dev/null || {
    printf '%s\n' "Error: Failed to store issue.baseSha in worktree git config" >&2
    exit 2
}
git -C "$WORKTREE_DIR" config --worktree issue.pluginBinDir "$SCRIPT_DIR" 2>/dev/null || {
    printf '%s\n' "Error: Failed to store issue.pluginBinDir in worktree git config" >&2
    exit 2
}

# Create hooks directory if it doesn't exist
HOOKS_DIR="${WORKTREE_GIT_DIR}/hooks"
mkdir -p "$HOOKS_DIR"

# Install post-commit hook
cat > "${HOOKS_DIR}/post-commit" << 'HOOK_EOF'
#!/bin/bash
# post-commit hook - posts commit info to Issues API
# Installed by create-worktree-with-hooks.sh
# Errors are logged to stderr but do not block git operations

set -o pipefail

ISSUE_ID=$(git config --worktree issue.id 2>/dev/null)
PLUGIN_BIN_DIR=$(git config --worktree issue.pluginBinDir 2>/dev/null)

if [ -z "$ISSUE_ID" ] || [ -z "$PLUGIN_BIN_DIR" ]; then
  exit 0  # Not a tracked worktree, silently skip
fi

SHA=$(git rev-parse HEAD)
MSG=$(git log -1 --format="%s" HEAD | head -c 100)  # Truncate long messages

# Escape special characters in message for JSON
MSG=$(printf '%s' "$MSG" | sed 's/\\/\\\\/g; s/"/\\"/g; s/	/\\t/g' | tr '\n' ' ')

API_BASE=$("${PLUGIN_BIN_DIR}/discover-api.sh" 2>/dev/null) || exit 0
curl -s -X POST "$API_BASE/issues/$ISSUE_ID/comments" \
  -H "Content-Type: application/json" \
  -d "{\"body\": \"Committed: $MSG\", \"author\": \"agent\", \"commitSha\": \"$SHA\"}" \
  >/dev/null 2>&1 || true

exit 0
HOOK_EOF

chmod +x "${HOOKS_DIR}/post-commit"

# Install post-rewrite hook
cat > "${HOOKS_DIR}/post-rewrite" << 'HOOK_EOF'
#!/bin/bash
# post-rewrite hook - handles rebase/amend by posting new commit and cleaning up old ones
# Installed by create-worktree-with-hooks.sh
# Errors are logged to stderr but do not block git operations

set -o pipefail

ISSUE_ID=$(git config --worktree issue.id 2>/dev/null)
PLUGIN_BIN_DIR=$(git config --worktree issue.pluginBinDir 2>/dev/null)

if [ -z "$ISSUE_ID" ] || [ -z "$PLUGIN_BIN_DIR" ]; then
  exit 0
fi

API_BASE=$("${PLUGIN_BIN_DIR}/discover-api.sh" 2>/dev/null) || exit 0
NEW_SHA=$(git rev-parse HEAD)

# Count rewritten commits and collect old SHAs
REWRITE_COUNT=0
OLD_SHAS=()
while read old_sha new_sha extra; do
  OLD_SHAS+=("$old_sha")
  ((REWRITE_COUNT++))
done

# Post new commit comment
MSG=$(git log -1 --format="%s" HEAD | head -c 100)
# Escape special characters in message for JSON
MSG=$(printf '%s' "$MSG" | sed 's/\\/\\\\/g; s/"/\\"/g; s/	/\\t/g' | tr '\n' ' ')

curl -s -X POST "$API_BASE/issues/$ISSUE_ID/comments" \
  -H "Content-Type: application/json" \
  -d "{\"body\": \"Rebased ($REWRITE_COUNT commits): $MSG\", \"author\": \"agent\", \"commitSha\": \"$NEW_SHA\"}" \
  >/dev/null 2>&1 || true

# Delete old commit comments
COMMENTS=$(curl -s "$API_BASE/issues/$ISSUE_ID/comments" 2>/dev/null) || exit 0
for old_sha in "${OLD_SHAS[@]}"; do
  COMMENT_ID=$(echo "$COMMENTS" | jq -r ".[] | select(.commitSha == \"$old_sha\") | .id" 2>/dev/null)
  if [ -n "$COMMENT_ID" ] && [ "$COMMENT_ID" != "null" ]; then
    curl -s -X DELETE "$API_BASE/issues/$ISSUE_ID/comments/$COMMENT_ID" >/dev/null 2>&1 || true
  fi
done

exit 0
HOOK_EOF

chmod +x "${HOOKS_DIR}/post-rewrite"

# Output results as JSON with issueId included
printf '%s\n' "{\"branch\":\"$BRANCH_NAME\",\"worktree\":\"$WORKTREE_DIR\",\"baseSha\":\"$BASE_SHA\",\"issueId\":\"$ISSUE_ID\"}"
