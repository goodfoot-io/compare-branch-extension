#!/bin/bash

# create-worktree: Create a git worktree with automatic commitSha posting via git hooks
#
# This script creates a git worktree with symlinked ignored directories and installs
# git hooks that automatically post commit information to the Issues API. The hooks
# handle both regular commits and rebase/amend scenarios.
#
# This is a standalone script that does not depend on external worktree utilities.
#
# Usage: ISSUE_ID=<id> create-worktree <branch-name>
#
# Environment:
#   ISSUE_ID    Required. The issue ID to associate with commits (e.g., main:259)
#
# Options:
#   --help      Show this help message
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
    printf '%s\n' "Creates a git worktree with automatic commitSha posting via git hooks."
    printf '%s\n' ""
    printf '%s\n' "Environment:"
    printf '%s\n' "  ISSUE_ID    Required. The issue ID to associate with commits (e.g., main:259)"
    printf '%s\n' ""
    printf '%s\n' "Options:"
    printf '%s\n' "  --help      Show this help message"
    printf '%s\n' ""
    printf '%s\n' "The script installs hooks that automatically post commit information"
    printf '%s\n' "to the Issues API after each commit or rebase."
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

cd "$WORKSPACE_ROOT"

WORKTREE_DIR="${WORKSPACE_ROOT}/.worktrees/${BRANCH_NAME}"

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
    if ! git_output=$(git worktree add -b "$BRANCH_NAME" "$WORKTREE_DIR" 2>&1); then
        printf '%s\n' "Error: Failed to create worktree" >&2
        printf '%s\n' "$git_output" >&2
        exit 2
    fi
fi

# Discover ignored directories using git's built-in gitignore parsing
# Get all ignored directories, filter nested redundancies
all_dirs=$(git ls-files --ignored --exclude-standard --directory --others 2>/dev/null | \
    grep '/$' | sed 's|/$||' | grep -v '^\.worktrees' | sort)

# Discover ignored files efficiently using find + git check-ignore
# Build prune patterns from ignored directories (use basenames for -name matching)
prune_names=""
while IFS= read -r d; do
    [ -z "$d" ] && continue
    # Get basename of directory for -name matching
    base=$(basename "$d")
    # Add to prune pattern if not already present
    case "$prune_names" in
        *"-name '$base'"*) ;;  # Already present
        *) prune_names="$prune_names -name '$base' -o" ;;
    esac
done <<< "$all_dirs"
# Add .worktrees explicitly (always skip)
prune_names="$prune_names -name '.worktrees'"

# Find files, pruning ignored directories, then check which are ignored
all_files=$(eval "find '$WORKSPACE_ROOT' \\( $prune_names \\) -prune -o -type f -print" 2>/dev/null | \
    sed "s|^$WORKSPACE_ROOT/||" | \
    xargs -r git check-ignore 2>/dev/null | \
    grep -v '^\.git/' | \
    sort || true)

dir_symlink_count=0
file_symlink_count=0

# Also find existing symlinks in the workspace root (for worktree-to-worktree creation)
# These won't be detected by git ls-files --ignored since they're symlinks, not real directories
# Exclude .git and .worktrees but include other dotfiles like .env
existing_symlinks=$(find "$WORKSPACE_ROOT" -maxdepth 1 -type l 2>/dev/null | \
    sed "s|^$WORKSPACE_ROOT/||" | grep -v '^\(\.git\|\.worktrees\)$' | sort || true)

# Copy existing top-level symlinks to the new worktree
while IFS= read -r link; do
    [ -z "$link" ] && continue
    [ -L "$WORKSPACE_ROOT/$link" ] || continue

    # Skip if already exists in worktree
    { [ -e "$WORKTREE_DIR/$link" ] || [ -L "$WORKTREE_DIR/$link" ]; } && continue

    cp -P "$WORKSPACE_ROOT/$link" "$WORKTREE_DIR/$link"
    dir_symlink_count=$((dir_symlink_count + 1))
done <<< "$existing_symlinks"

# For each directory, check if any parent is also in the list
while IFS= read -r dir; do
    [ -z "$dir" ] && continue

    # Only process directories that actually exist on disk (including symlinks to directories)
    [ -d "$WORKSPACE_ROOT/$dir" ] || [ -L "$WORKSPACE_ROOT/$dir" ] || continue

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

        # If source is already a symlink, copy it to preserve original target
        # Otherwise create a new symlink to the source
        if [ -L "$WORKSPACE_ROOT/$dir" ]; then
            cp -P "$WORKSPACE_ROOT/$dir" "$WORKTREE_DIR/$dir"
        else
            ln -sf "$WORKSPACE_ROOT/$dir" "$WORKTREE_DIR/$dir"
        fi
        dir_symlink_count=$((dir_symlink_count + 1))
    fi
done <<< "$all_dirs"

# Symlink ignored files (already filtered to exclude files inside ignored directories)
while IFS= read -r file; do
    [ -z "$file" ] && continue

    # Only process files that actually exist on disk (including symlinks to files)
    [ -f "$WORKSPACE_ROOT/$file" ] || [ -L "$WORKSPACE_ROOT/$file" ] || continue

    # Create parent directory in worktree if needed for nested files
    parent_dir=$(dirname "$file")
    if [ "$parent_dir" != "." ]; then
        mkdir -p "$WORKTREE_DIR/$parent_dir"
    fi

    # If source is already a symlink, copy it to preserve original target
    # Otherwise create a new symlink to the source
    if [ -L "$WORKSPACE_ROOT/$file" ]; then
        cp -P "$WORKSPACE_ROOT/$file" "$WORKTREE_DIR/$file"
    else
        ln -sf "$WORKSPACE_ROOT/$file" "$WORKTREE_DIR/$file"
    fi
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
    git -C "$WORKSPACE_ROOT" config extensions.worktreeConfig true 2>/dev/null || true
    git -C "$WORKTREE_DIR" config --worktree core.excludesFile "$exclude_file" 2>/dev/null || true
fi

# Get the base commit SHA (the commit this worktree is based on)
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
git -C "$WORKTREE_DIR" config --worktree issue.baseSha "$BASE_SHA" 2>/dev/null || {
    printf '%s\n' "Error: Failed to store issue.baseSha in worktree git config" >&2
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

# Capture the original core.hooksPath before overriding (for passthrough chaining)
ORIGINAL_HOOKS_PATH=$(git -C "$WORKTREE_DIR" config core.hooksPath 2>/dev/null || echo "")
if [ -n "$ORIGINAL_HOOKS_PATH" ]; then
    git -C "$WORKTREE_DIR" config --worktree issue.originalHooksPath "$ORIGINAL_HOOKS_PATH" 2>/dev/null || true
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
# This hook handles the case where chained hooks create additional commits
# (e.g., git subtree split --rejoin). It tracks HEAD before and after chaining
# and posts any new commits that result from the chain.

set -o pipefail

$HOOK_CHAIN_HELPER

# Helper function to post a commit SHA to the Issues API
post_commit_sha() {
    local sha="\$1"
    local issue_id="\$2"
    local api_base="\$3"

    curl -s -X POST "\$api_base/issues/\$issue_id/comments" \
        -H "Content-Type: application/json" \
        -d "{\"author\": \"agent\", \"commitSha\": \"\$sha\"}" \
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

            # Post new commit comment
            curl -s -X POST "\$API_BASE/issues/\$ISSUE_ID/comments" \
                -H "Content-Type: application/json" \
                -d "{\"author\": \"agent\", \"commitSha\": \"\$NEW_SHA\"}" \
                >/dev/null 2>&1 || true

            # Delete old commit comments
            COMMENTS=\$(curl -s "\$API_BASE/issues/\$ISSUE_ID/comments" 2>/dev/null) || true
            for old_sha in "\${OLD_SHAS[@]}"; do
                COMMENT_ID=\$(echo "\$COMMENTS" | jq -r ".[] | select(.commitSha == \"\$old_sha\") | .id" 2>/dev/null)
                if [ -n "\$COMMENT_ID" ] && [ "\$COMMENT_ID" != "null" ]; then
                    curl -s -X DELETE "\$API_BASE/issues/\$ISSUE_ID/comments/\$COMMENT_ID" >/dev/null 2>&1 || true
                fi
            done
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

# Update issue with worktreePath (absolute path)
# This allows the UI to show "Open Worktree" button
# Discover API for the issue's workspace (using stored path, not pwd)
# Failure is non-fatal - worktree is still usable without this
DISCOVERY_FILE="$HOME/.compare-branch/issues-api.json"
if [ -f "$DISCOVERY_FILE" ]; then
    API_PORT=$(jq -r --arg ws "$ISSUE_WORKSPACE_PATH" '.[$ws].port // empty' "$DISCOVERY_FILE" 2>/dev/null)
    API_HOST=$(jq -r --arg ws "$ISSUE_WORKSPACE_PATH" '.[$ws].host // empty' "$DISCOVERY_FILE" 2>/dev/null)

    if [ -n "$API_PORT" ] && [ -n "$API_HOST" ]; then
        API_BASE="http://${API_HOST}:${API_PORT}/api/v1"

        curl -s -X PATCH "$API_BASE/issues/$ISSUE_ID" \
            -H "Content-Type: application/json" \
            -d "{\"worktreePath\": \"$WORKTREE_DIR\"}" \
            >/dev/null 2>&1 || true

        # Post initial baseSha as first commitSha comment
        # This ensures getFirstCommitSha() returns baseSha for complete diffs
        # Without this, the first actual commit's changes might be missing from comparisons
        curl -s -X POST "$API_BASE/issues/$ISSUE_ID/comments" \
            -H "Content-Type: application/json" \
            -d "{\"author\": \"agent\", \"commitSha\": \"$BASE_SHA\"}" \
            >/dev/null 2>&1 || true
    fi
fi

# Output results as JSON with issueId included
printf '%s\n' "{\"branch\":\"$BRANCH_NAME\",\"worktree\":\"$WORKTREE_DIR\",\"baseSha\":\"$BASE_SHA\",\"issueId\":\"$ISSUE_ID\"}"
