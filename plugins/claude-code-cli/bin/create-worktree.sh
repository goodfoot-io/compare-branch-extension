#!/bin/bash

# create-worktree: Create a git worktree with symlinked ignored directories
#
# This script creates a git worktree with symlinked ignored directories and
# passthrough hooks for pre-commit and pre-push to chain to project hooks.
# Commit tracking is handled by Claude Code hooks (PostToolUse), not git hooks.
#
# This is a standalone script that does not depend on external worktree utilities.
#
# Usage: ISSUE_ID=<id> create-worktree <branch-name>
#
# Environment:
#   ISSUE_ID    Required. The issue ID to associate with the worktree (e.g., main:259)
#
# Options:
#   --help      Show this help message
#
# Output: JSON with branch, worktree, and issueId
# Exit codes:
#   0 - Success
#   2 - Failure (error details on stderr)

set -e

# Get the directory where this script is located (plugin bin directory)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Parse arguments
BRANCH_NAME=""
SHOW_HELP=false

while [ $# -gt 0 ]; do
    case "$1" in
        --help|-h)
            SHOW_HELP=true
            shift
            ;;
        -*)
            printf '%s\n' "Error: Unknown option '$1'" >&2
            printf '%s\n' "Usage: ISSUE_ID=<id> create-worktree <branch-name>" >&2
            exit 2
            ;;
        *)
            if [ -z "$BRANCH_NAME" ]; then
                BRANCH_NAME="$1"
            else
                printf '%s\n' "Error: Unexpected argument '$1'" >&2
                printf '%s\n' "Usage: ISSUE_ID=<id> create-worktree <branch-name>" >&2
                exit 2
            fi
            shift
            ;;
    esac
done

# Show help if requested
if [ "$SHOW_HELP" = "true" ]; then
    printf '%s\n' "Usage: ISSUE_ID=<id> create-worktree <branch-name>"
    printf '%s\n' ""
    printf '%s\n' "Creates a git worktree with symlinked ignored directories."
    printf '%s\n' ""
    printf '%s\n' "Environment:"
    printf '%s\n' "  ISSUE_ID    Required. The issue ID to associate with the worktree (e.g., main:259)"
    printf '%s\n' ""
    printf '%s\n' "Options:"
    printf '%s\n' "  --help      Show this help message"
    printf '%s\n' ""
    printf '%s\n' "The script creates symlinks to ignored directories and installs passthrough"
    printf '%s\n' "hooks to chain to project pre-commit/pre-push hooks."
    exit 0
fi

# Validate required environment variables
if [ -z "${ISSUE_WORKSPACE_PATH:-}" ]; then
    printf '%s\n' "Error: ISSUE_WORKSPACE_PATH environment variable is not set." >&2
    printf '%s\n' "This script must be called from a Claude session with issue tracking enabled." >&2
    exit 2
fi

if [ -z "$ISSUE_ID" ]; then
    printf '%s\n' "Error: ISSUE_ID environment variable is required" >&2
    printf '%s\n' "Usage: ISSUE_ID=<id> create-worktree <branch-name>" >&2
    exit 2
fi

if [ -z "$BRANCH_NAME" ]; then
    printf '%s\n' "Error: branch-name argument is required" >&2
    printf '%s\n' "Usage: ISSUE_ID=<id> create-worktree <branch-name>" >&2
    exit 2
fi

# Validate branch name format (alphanumeric, hyphens, underscores, slashes for feature branches)
if ! printf '%s\n' "$BRANCH_NAME" | grep -qE '^[a-zA-Z0-9][a-zA-Z0-9/_-]*$'; then
    printf '%s\n' "Error: Invalid branch name format." >&2
    printf '%s\n' "Use alphanumeric characters, hyphens, underscores, and slashes." >&2
    exit 2
fi

# Find both the source workspace (where we're running from) and repository root
# SOURCE_ROOT: Current workspace (main or worktree) - used for discovering ignored files
# REPO_ROOT: Main repository root - used for git worktree operations
SOURCE_ROOT=""
REPO_ROOT=""
current_dir="$(pwd)"

while [ "$current_dir" != "/" ]; do
    if [ -d "$current_dir/.git" ]; then
        # Main repository - source and repo are the same
        SOURCE_ROOT="$current_dir"
        REPO_ROOT="$current_dir"
        break
    elif [ -f "$current_dir/.git" ]; then
        # Worktree - source is here, repo root is main
        SOURCE_ROOT="$current_dir"
        gitdir_line=$(cat "$current_dir/.git")
        gitdir_path="${gitdir_line#gitdir: }"
        # Strip /worktrees/<name> to get main .git dir, then get parent for repo root
        main_git_dir="${gitdir_path%/worktrees/*}"
        REPO_ROOT="${main_git_dir%/.git}"
        break
    fi
    current_dir="$(dirname "$current_dir")"
done

if [ -z "$SOURCE_ROOT" ] || [ -z "$REPO_ROOT" ]; then
    printf '%s\n' "Error: Could not find git repository root" >&2
    exit 2
fi

# Capture current HEAD before changing directories (for branching from current context)
ORIGINAL_HEAD=$(git rev-parse HEAD 2>/dev/null)
if [ -z "$ORIGINAL_HEAD" ]; then
    printf '%s\n' "Error: Could not determine current HEAD" >&2
    exit 2
fi

# Determine base branch for merge-base calculations (default to main)
BASE_BRANCH=$(git -C "$SOURCE_ROOT" branch --show-current 2>/dev/null || true)
if [ -z "$BASE_BRANCH" ] || [ "$BASE_BRANCH" = "HEAD" ]; then
    BASE_BRANCH="main"
fi

# Change to repo root for git worktree operations
cd "$REPO_ROOT"

WORKTREE_DIR="${REPO_ROOT}/.worktrees/${BRANCH_NAME}"

# Check git worktree list for existing worktree at target path
if git worktree list | grep -q "${WORKTREE_DIR}"; then
    printf '%s\n' "Error: Worktree already exists at ${WORKTREE_DIR}" >&2
    exit 2
fi

# Check git branch list for existing branch with same name
BRANCH_EXISTS=false
if git branch --list "$BRANCH_NAME" | grep -q .; then
    BRANCH_EXISTS=true
fi

# Create worktree - attach to existing branch or create new branch
if [ "$BRANCH_EXISTS" = "true" ]; then
    if ! git_output=$(git worktree add "$WORKTREE_DIR" "$BRANCH_NAME" 2>&1); then
        printf '%s\n' "Error: Failed to create worktree for existing branch" >&2
        printf '%s\n' "$git_output" >&2
        exit 2
    fi
else
    if ! git_output=$(git worktree add -b "$BRANCH_NAME" "$WORKTREE_DIR" "$ORIGINAL_HEAD" 2>&1); then
        printf '%s\n' "Error: Failed to create worktree" >&2
        printf '%s\n' "$git_output" >&2
        exit 2
    fi
fi

# Discover ignored items using git's built-in gitignore parsing from SOURCE workspace
# Note: git ls-files shows directories with trailing '/' but files without '/'
# Separate directories and files
all_ignored=$(git -C "$SOURCE_ROOT" ls-files --ignored --exclude-standard --directory --others 2>/dev/null | \
    grep -v '^\.worktrees' | sort)

# Extract directories (those with trailing /)
all_dirs=$(echo "$all_ignored" | grep '/$' | sed 's|/$||')

# Extract files (those without trailing /)
all_files=$(echo "$all_ignored" | grep -v '/$')

dir_symlink_count=0
file_symlink_count=0

# Also find existing symlinks in the source workspace root (for worktree-to-worktree creation)
# These won't be detected by git ls-files --ignored since they're symlinks, not real directories
# Exclude .git and .worktrees but include other dotfiles like .env
existing_symlinks=$(find "$SOURCE_ROOT" -maxdepth 1 -type l 2>/dev/null | \
    sed "s|^$SOURCE_ROOT/||" | grep -v '^\(\.git\|\.worktrees\)$' | sort || true)

# Copy existing top-level symlinks to the new worktree
# Use ln -snf to create new symlinks pointing to SOURCE_ROOT rather than preserving original targets
while IFS= read -r link; do
    [ -z "$link" ] && continue
    [ -L "$SOURCE_ROOT/$link" ] || continue

    # Skip if already exists in worktree
    { [ -e "$WORKTREE_DIR/$link" ] || [ -L "$WORKTREE_DIR/$link" ]; } && continue

    ln -snf "$SOURCE_ROOT/$link" "$WORKTREE_DIR/$link"
    dir_symlink_count=$((dir_symlink_count + 1))
done <<< "$existing_symlinks"

# For each directory, check if any parent is also in the list
while IFS= read -r dir; do
    [ -z "$dir" ] && continue

    # Only process directories that actually exist on disk (including symlinks to directories)
    [ -d "$SOURCE_ROOT/$dir" ] || [ -L "$SOURCE_ROOT/$dir" ] || continue

    # Check if any parent directory is in the ignored list
    parent="$dir"
    is_nested=false
    while [[ "$parent" == */* ]]; do
        parent="${parent%/*}"
        if echo "$all_dirs" | grep -qx "$parent"; then
            is_nested=true
            break
        fi
    done

    if [ "$is_nested" = "false" ]; then
        # Create parent directory in worktree if needed for nested symlinks
        parent_dir=$(dirname "$dir")
        if [ "$parent_dir" != "." ]; then
            mkdir -p "$WORKTREE_DIR/$parent_dir"
        fi

        # Always create a new symlink to the source workspace
        # This ensures worktrees inherit from their source, not from main
        # Use -n to avoid following symlinks in the source
        ln -snf "$SOURCE_ROOT/$dir" "$WORKTREE_DIR/$dir"
        dir_symlink_count=$((dir_symlink_count + 1))
    fi
done <<< "$all_dirs"

# Symlink ignored files (already filtered to exclude files inside ignored directories)
while IFS= read -r file; do
    [ -z "$file" ] && continue

    # Only process files that actually exist on disk (including symlinks to files)
    [ -f "$SOURCE_ROOT/$file" ] || [ -L "$SOURCE_ROOT/$file" ] || continue

    # Create parent directory in worktree if needed for nested files
    parent_dir=$(dirname "$file")
    if [ "$parent_dir" != "." ]; then
        mkdir -p "$WORKTREE_DIR/$parent_dir"
    fi

    # Always create a new symlink to the source workspace
    # This ensures worktrees inherit from their source, not from main
    # Use -n to avoid following symlinks in the source
    ln -snf "$SOURCE_ROOT/$file" "$WORKTREE_DIR/$file"
    file_symlink_count=$((file_symlink_count + 1))
done <<< "$all_files"

# Add symlinked paths to worktree's local exclude file
# (Symlinks aren't matched by gitignore patterns with trailing slashes)
worktree_git_dir=$(git -C "$WORKTREE_DIR" rev-parse --git-dir 2>/dev/null)
if [ -n "$worktree_git_dir" ]; then
    exclude_file="$worktree_git_dir/info/exclude"
    mkdir -p "$(dirname "$exclude_file")"
    {
        echo "# Symlinks created by create-worktree"
        while IFS= read -r dir; do
            [ -z "$dir" ] && continue
            [ -L "$WORKTREE_DIR/$dir" ] && echo "$dir"
        done <<< "$all_dirs"
        while IFS= read -r file; do
            [ -z "$file" ] && continue
            [ -L "$WORKTREE_DIR/$file" ] && echo "$file"
        done <<< "$all_files"
    } >> "$exclude_file"

    # Enable worktree-specific config and set excludesFile for this worktree
    # These are non-critical - worktree is still usable without them
    if ! git -C "$REPO_ROOT" config extensions.worktreeConfig true 2>/dev/null; then
        echo "Warning: Could not enable worktree-specific config" >&2
        echo "Symlinked paths may appear as unstaged changes. Run: git config extensions.worktreeConfig true" >&2
    fi
    if ! git -C "$WORKTREE_DIR" config --worktree core.excludesFile "$exclude_file" 2>/dev/null; then
        echo "Warning: Could not set worktree excludes file" >&2
        echo "Symlinked paths may appear as unstaged changes in this worktree." >&2
    fi
fi

# Get the base commit SHA (the checkpoint commit created for this issue)
BASE_SHA=$(git -C "$WORKTREE_DIR" rev-parse HEAD 2>/dev/null)

# Get the worktree's git directory for hook installation
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
git -C "$WORKTREE_DIR" config --worktree issue.pluginBinDir "$SCRIPT_DIR" 2>/dev/null || {
    printf '%s\n' "Error: Failed to store issue.pluginBinDir in worktree git config" >&2
    exit 2
}
git -C "$WORKTREE_DIR" config --worktree issue.workspacePath "$ISSUE_WORKSPACE_PATH" 2>/dev/null || {
    printf '%s\n' "Error: Failed to store issue.workspacePath in worktree git config" >&2
    exit 2
}
git -C "$WORKTREE_DIR" config --worktree issue.baseSha "$BASE_SHA" 2>/dev/null || {
    printf '%s\n' "Error: Failed to store issue.baseSha in worktree git config" >&2
    exit 2
}
git -C "$WORKTREE_DIR" config --worktree issue.baseBranch "$BASE_BRANCH" 2>/dev/null || {
    printf '%s\n' "Error: Failed to store issue.baseBranch in worktree git config" >&2
    exit 2
}

# Capture the original core.hooksPath before overriding (for passthrough chaining)
ORIGINAL_HOOKS_PATH=$(git -C "$WORKTREE_DIR" config core.hooksPath 2>/dev/null || echo "")
if [ -n "$ORIGINAL_HOOKS_PATH" ]; then
    # Critical: worktree hooks depend on this to chain to original hooks (e.g., pre-commit)
    if ! git -C "$WORKTREE_DIR" config --worktree issue.originalHooksPath "$ORIGINAL_HOOKS_PATH" 2>/dev/null; then
        printf '%s\n' "Error: Failed to store original hooks path in worktree git config" >&2
        printf '%s\n' "This is required for worktree hooks to chain to your pre-commit/pre-push hooks." >&2
        printf '%s\n' "Ensure you have write access to the worktree git config." >&2
        exit 2
    fi
fi

# Override core.hooksPath for this worktree to use hooks in the git directory
# This prevents hooks from being committed (they live in .git/worktrees/.../hooks/)
# while still allowing us to chain to the original hooks
git -C "$WORKTREE_DIR" config --worktree core.hooksPath "$WORKTREE_GIT_DIR/hooks" 2>/dev/null || {
    printf '%s\n' "Error: Failed to set core.hooksPath in worktree git config" >&2
    exit 2
}

# Create hooks directory if it doesn't exist
HOOKS_DIR="${WORKTREE_GIT_DIR}/hooks"
mkdir -p "$HOOKS_DIR"

# Helper function embedded in hooks to find original hook
# Reads issue.originalHooksPath from git config, resolves relative to repo root
HOOK_CHAIN_HELPER='
get_original_hook() {
    local hook_name="$1"
    local original_path=$(git config --worktree issue.originalHooksPath 2>/dev/null)
    if [ -z "$original_path" ]; then
        return 1
    fi
    local repo_root=$(git rev-parse --show-toplevel 2>/dev/null)
    if [ -z "$repo_root" ]; then
        return 1
    fi
    # Resolve relative path against repo root
    if [[ "$original_path" != /* ]]; then
        original_path="$repo_root/$original_path"
    fi
    local hook_file="$original_path/$hook_name"
    if [ -x "$hook_file" ]; then
        echo "$hook_file"
        return 0
    fi
    return 1
}
'

# Install pre-commit hook (passthrough only)
cat > "${HOOKS_DIR}/pre-commit" << HOOK_EOF
#!/bin/bash
# pre-commit hook - passthrough to original hooks
# Installed by create-worktree.sh

$HOOK_CHAIN_HELPER

ORIGINAL_HOOK=\$(get_original_hook "pre-commit")
if [ -n "\$ORIGINAL_HOOK" ]; then
    exec "\$ORIGINAL_HOOK" "\$@"
fi
exit 0
HOOK_EOF
chmod +x "${HOOKS_DIR}/pre-commit"

# Install pre-push hook (passthrough only)
cat > "${HOOKS_DIR}/pre-push" << HOOK_EOF
#!/bin/bash
# pre-push hook - passthrough to original hooks
# Installed by create-worktree.sh

$HOOK_CHAIN_HELPER

ORIGINAL_HOOK=\$(get_original_hook "pre-push")
if [ -n "\$ORIGINAL_HOOK" ]; then
    exec "\$ORIGINAL_HOOK" "\$@"
fi
exit 0
HOOK_EOF
chmod +x "${HOOKS_DIR}/pre-push"

# Install post-commit hook (Issues API + passthrough)
cat > "${HOOKS_DIR}/post-commit" << HOOK_EOF
#!/bin/bash
# post-commit hook - posts commit info to Issues API, then chains to original hook
# Installed by create-worktree.sh
# Errors are logged to stderr but do not block git operations
#
# This hook handles:
# 1. Posting the new commit SHA to the Issues API
# 2. Chained hooks that create additional commits (e.g., git subtree split --rejoin)
# 3. Cleaning up orphaned commitSha comments after squash operations
#
# The orphan cleanup runs after every commit. It identifies commits that are no
# longer reachable from HEAD (e.g., after git reset --soft + commit) and deletes
# their associated commitSha comments from the issue.

set -o pipefail

$HOOK_CHAIN_HELPER

# Helper function to post a commit SHA to the Issues API
post_commit_sha() {
    local sha="\$1"
    local issue_id="\$2"
    local api_base="\$3"

    curl -s -X POST "\$api_base/issues/\$issue_id/comments" \\
        -H "Content-Type: application/json" \\
        -d "{\"author\": \"agent\", \"commitSha\": \"\$sha\"}" \\
        >/dev/null 2>&1 || true
}

# --- Setup API connection ---
ISSUE_ID=\$(git config --worktree issue.id 2>/dev/null)
WORKSPACE_PATH=\$(git config --worktree issue.workspacePath 2>/dev/null)
API_BASE=""

if [ -n "\$ISSUE_ID" ] && [ -n "\$WORKSPACE_PATH" ]; then
    DISCOVERY_FILE="\$HOME/.compare-branch/issues-api.json"
    if [ -f "\$DISCOVERY_FILE" ]; then
        PORT=\$(jq -r --arg ws "\$WORKSPACE_PATH" '.[\$ws].port // empty' "\$DISCOVERY_FILE" 2>/dev/null)
        HOST=\$(jq -r --arg ws "\$WORKSPACE_PATH" '.[\$ws].host // empty' "\$DISCOVERY_FILE" 2>/dev/null)

        if [ -n "\$PORT" ] && [ -n "\$HOST" ]; then
            API_BASE="http://\${HOST}:\${PORT}/api/v1"
        fi
    fi
fi

# --- Record HEAD before any operations ---
HEAD_BEFORE=\$(git rev-parse HEAD 2>/dev/null)

# --- Post the current commit ---
if [ -n "\$API_BASE" ] && [ -n "\$HEAD_BEFORE" ]; then
    post_commit_sha "\$HEAD_BEFORE" "\$ISSUE_ID" "\$API_BASE"
fi

# --- Chain to original hook ---
ORIGINAL_HOOK=\$(get_original_hook "post-commit")
if [ -n "\$ORIGINAL_HOOK" ]; then
    "\$ORIGINAL_HOOK" "\$@"
fi

# --- Check if HEAD changed after chaining ---
# Chained hooks may create additional commits (e.g., subtree split --rejoin)
HEAD_AFTER=\$(git rev-parse HEAD 2>/dev/null)
if [ -n "\$API_BASE" ] && [ -n "\$HEAD_AFTER" ] && [ "\$HEAD_AFTER" != "\$HEAD_BEFORE" ]; then
    post_commit_sha "\$HEAD_AFTER" "\$ISSUE_ID" "\$API_BASE"
fi

# --- Clean up orphaned commit comments ---
# After squash (git reset --soft + commit), old commits become unreachable.
# This cleanup removes commitSha comments for commits no longer on the branch.
# Valid commits: baseSha + all commits between baseSha and current HEAD.
if [ -n "\$API_BASE" ]; then
    BASE_SHA=\$(git config --worktree issue.baseSha 2>/dev/null)
    if [ -n "\$BASE_SHA" ]; then
        # Build set of valid SHAs (baseSha + descendants)
        VALID_SHAS=\$(git rev-list "\$BASE_SHA"..HEAD 2>/dev/null || true)
        VALID_SHAS="\$BASE_SHA"\$'\\n'"\$VALID_SHAS"

        # Fetch all comments and delete orphaned commitSha comments
        COMMENTS=\$(curl -s "\$API_BASE/issues/\$ISSUE_ID/comments" 2>/dev/null) || true
        if [ -n "\$COMMENTS" ]; then
            echo "\$COMMENTS" | jq -r '.[] | select(.commitSha != null) | "\\(.id) \\(.commitSha)"' 2>/dev/null | \\
            while read -r comment_id commit_sha; do
                if [ -n "\$commit_sha" ] && ! echo "\$VALID_SHAS" | grep -qx "\$commit_sha"; then
                    curl -s -X DELETE "\$API_BASE/issues/\$ISSUE_ID/comments/\$comment_id" >/dev/null 2>&1 || true
                fi
            done
        fi
    fi
fi

exit 0
HOOK_EOF
chmod +x "${HOOKS_DIR}/post-commit"

# Install post-rewrite hook (Issues API + passthrough)
cat > "${HOOKS_DIR}/post-rewrite" << HOOK_EOF
#!/bin/bash
# post-rewrite hook - handles rebase/amend, then chains to original hook
# Installed by create-worktree.sh
# Errors are logged to stderr but do not block git operations

set -o pipefail

$HOOK_CHAIN_HELPER

# Capture stdin for potential passthrough (post-rewrite receives old/new SHA pairs)
STDIN_DATA=\$(cat)

# --- Issues API posting ---
ISSUE_ID=\$(git config --worktree issue.id 2>/dev/null)
WORKSPACE_PATH=\$(git config --worktree issue.workspacePath 2>/dev/null)
# Update baseSha after rewrite using stored baseBranch
BASE_BRANCH=\$(git config --worktree issue.baseBranch 2>/dev/null)
BASE_SHA_OLD=\$(git config --worktree issue.baseSha 2>/dev/null)
BASE_SHA_NEW=""
BASE_SHA_UPDATED=false
BASE_SHA_SHOULD_REPLACE=false

if [ -n "\$BASE_BRANCH" ]; then
    BASE_SHA_NEW=\$(git merge-base HEAD "\$BASE_BRANCH" 2>/dev/null || true)
fi

if [ -n "\$BASE_SHA_NEW" ] && [ "\$BASE_SHA_NEW" != "\$BASE_SHA_OLD" ]; then
    BASE_SHA_SHOULD_REPLACE=true
    if git config --worktree issue.baseSha "\$BASE_SHA_NEW" 2>/dev/null; then
        BASE_SHA_UPDATED=true
    fi
fi

if [ -n "\$ISSUE_ID" ] && [ -n "\$WORKSPACE_PATH" ]; then
    DISCOVERY_FILE="\$HOME/.compare-branch/issues-api.json"
    if [ -f "\$DISCOVERY_FILE" ]; then
        PORT=\$(jq -r --arg ws "\$WORKSPACE_PATH" '.[\$ws].port // empty' "\$DISCOVERY_FILE" 2>/dev/null)
        HOST=\$(jq -r --arg ws "\$WORKSPACE_PATH" '.[\$ws].host // empty' "\$DISCOVERY_FILE" 2>/dev/null)

        if [ -n "\$PORT" ] && [ -n "\$HOST" ]; then
            API_BASE="http://\${HOST}:\${PORT}/api/v1"
            NEW_SHA=\$(git rev-parse HEAD)

            # Collect old SHAs from stdin data
            OLD_SHAS=()
            while read old_sha new_sha extra; do
                OLD_SHAS+=("\$old_sha")
            done <<< "\$STDIN_DATA"

            BASE_SHA_OLD_DERIVED=""
            if [ -n "\$BASE_BRANCH" ] && [ "\${#OLD_SHAS[@]}" -gt 0 ]; then
                BASE_SHA_OLD_DERIVED=\$(git merge-base "\${OLD_SHAS[0]}" "\$BASE_BRANCH" 2>/dev/null || true)
            fi
            if [ -n "\$BASE_SHA_OLD_DERIVED" ] && [ "\$BASE_SHA_OLD_DERIVED" != "\$BASE_SHA_NEW" ]; then
                BASE_SHA_OLD="\$BASE_SHA_OLD_DERIVED"
                BASE_SHA_SHOULD_REPLACE=true
            fi

            COMMENTS=""
            if [ "\${#OLD_SHAS[@]}" -gt 0 ]; then
                COMMENTS=\$(curl -s "\$API_BASE/issues/\$ISSUE_ID/comments" 2>/dev/null) || true
            fi

            # Post new commit comment
            curl -s -X POST "\$API_BASE/issues/\$ISSUE_ID/comments" \\
                -H "Content-Type: application/json" \\
                -d "{\"author\": \"agent\", \"commitSha\": \"\$NEW_SHA\"}" \\
                >/dev/null 2>&1 || true

            # Delete old commit comments
            if [ -n "\$COMMENTS" ]; then
                for old_sha in "\${OLD_SHAS[@]}"; do
                    COMMENT_ID=\$(echo "\$COMMENTS" | jq -r --arg sha "\$old_sha" '.[] | select(.commitSha == $sha) | .id' 2>/dev/null)
                    if [ -n "\$COMMENT_ID" ] && [ "\$COMMENT_ID" != "null" ]; then
                        curl -s -X DELETE "\$API_BASE/issues/\$ISSUE_ID/comments/\$COMMENT_ID" >/dev/null 2>&1 || true
                    fi
                done
            fi
        fi
    fi
fi

# --- Chain to original hook ---
ORIGINAL_HOOK=\$(get_original_hook "post-rewrite")
if [ -n "\$ORIGINAL_HOOK" ]; then
    echo "\$STDIN_DATA" | exec "\$ORIGINAL_HOOK" "\$@"
fi
exit 0
HOOK_EOF
chmod +x "${HOOKS_DIR}/post-rewrite"

# Output results as JSON with baseSha and issueId included
printf '%s\n' "{\"branch\":\"$BRANCH_NAME\",\"worktree\":\"$WORKTREE_DIR\",\"baseSha\":\"$BASE_SHA\",\"issueId\":\"$ISSUE_ID\"}"
