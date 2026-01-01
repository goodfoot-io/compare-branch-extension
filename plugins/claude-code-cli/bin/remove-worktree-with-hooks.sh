#!/bin/bash

# remove-worktree-with-hooks: Safely remove a git worktree created by create-worktree-with-hooks
#
# This script is a thin wrapper around remove-instant-worktree that removes a worktree
# and its associated branch. The git hooks installed by create-worktree-with-hooks
# are automatically cleaned up when the worktree is deleted.
#
# Usage: remove-worktree-with-hooks [-f|--force] <branch-name>
#
# Options:
#   -f, --force    Force removal even if worktree has uncommitted changes
#   --help         Show this help message
#
# Output: The final commit SHA of the deleted branch (on stdout)
# Exit codes:
#   0 - Success
#   2 - Failure (error details on stderr)

set -e

# Check for --help before other processing
for arg in "$@"; do
    if [ "$arg" = "--help" ] || [ "$arg" = "-h" ]; then
        printf '%s\n' "Usage: remove-worktree-with-hooks [-f|--force] <branch-name>"
        printf '%s\n' ""
        printf '%s\n' "Safely removes a git worktree and its associated branch."
        printf '%s\n' "Git hooks installed by create-worktree-with-hooks are automatically removed."
        printf '%s\n' ""
        printf '%s\n' "Options:"
        printf '%s\n' "  -f, --force    Force removal even if worktree has uncommitted changes"
        printf '%s\n' "  --help         Show this help message"
        printf '%s\n' ""
        printf '%s\n' "Output: The final commit SHA of the deleted branch"
        exit 0
    fi
done

# Find workspace root by walking up directory tree looking for .git directory or file
WORKSPACE_ROOT=""
current_dir="$(pwd)"
while [ "$current_dir" != "/" ]; do
    if [ -d "$current_dir/.git" ]; then
        WORKSPACE_ROOT="$current_dir"
        break
    elif [ -f "$current_dir/.git" ]; then
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

# Find remove-instant-worktree utility
REMOVE_INSTANT_WORKTREE="${WORKSPACE_ROOT}/.devcontainer/utilities/remove-instant-worktree"
if [ ! -x "$REMOVE_INSTANT_WORKTREE" ]; then
    printf '%s\n' "Error: remove-instant-worktree not found at $REMOVE_INSTANT_WORKTREE" >&2
    exit 2
fi

# Pass all arguments through to remove-instant-worktree
# This preserves the -f/--force flag and branch name handling
exec "$REMOVE_INSTANT_WORKTREE" "$@"
