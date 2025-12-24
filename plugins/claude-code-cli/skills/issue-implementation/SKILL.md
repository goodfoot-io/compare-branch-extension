---
name: issue-implementation
description: Implement issue work in an isolated git worktree. Use for ALL work types (code, research, analysis, documentation) based on [DESCRIPTION] or [LATEST_USER_COMMENT].
---

<input-format>
Extract from issue data:

**Required Fields:**
- [TITLE] = The issue title (`title`)
- [DESCRIPTION] = The issue description with requirements (`description`)

**Derived Fields:**
- [LATEST_USER_COMMENT] = Most recent comment from `author: "user"` (if any)
- [FILES_TO_MODIFY] = Files referenced in [DESCRIPTION] or [COMMENTS]
- [BRANCH_NAME] = Generated branch name: `issue-[ISSUE_ID with : and / replaced by -]-[slugified-short-title]`
</input-format>

<tools>

## Worktree Management Tools

### instant-worktree

Creates a git worktree with symlinked dependencies for fast setup (~2 seconds).

**Usage:**
```bash
instant-worktree "branch-name"
```

**Output:** Prints the created worktree path and branch name:
```
Created branch: branch-name
Created worktree directory: .worktrees/branch-name
```

**Behavior:**
- Creates worktree at `.worktrees/[BRANCH_NAME]`
- Creates a new branch with the given name
- Fails if branch already exists or worktree path is occupied

### remove-instant-worktree

Removes a worktree, deletes its associated branch, and returns the final commit SHA.

**Usage:**
```bash
FINAL_SHA=$(remove-instant-worktree "branch-name")
```

**Output:** Prints the branch's final commit SHA before removal.

**Behavior:**
- Removes the worktree at `.worktrees/[BRANCH_NAME]`
- Deletes the local branch
- Returns the commit SHA for recording in issue comments

</tools>

<instructions>

## Phase 1: Prepare Implementation Environment

Use for ALL work types (code, research, analysis, documentation) based on [DESCRIPTION] or [LATEST_USER_COMMENT]. All modifications happen in an isolated worktree.

### Step 1.1: Check for Existing Work (Resumption Detection)

If [IS_RESUMABLE] is true (prior work exists without completion):
1. Check if worktree exists:
   ```bash
   ls -d .worktrees/issue-[ISSUE_ID]-* 2>/dev/null
   ```
2. If worktree exists:
   - Navigate to it: `cd ".worktrees/$BRANCH_NAME"`
   - Run `git status` to check for uncommitted changes
   - If uncommitted changes exist, review and decide whether to commit or stash
   - Skip to Step 3.1
3. If worktree doesn't exist, check if branch exists:
   ```bash
   git branch --list "$BRANCH_NAME"
   ```
   - If branch exists: Attach worktree to existing branch:
     ```bash
     git worktree add ".worktrees/$BRANCH_NAME" "$BRANCH_NAME"
     ```
   - If branch doesn't exist: The previous work may be lost. Start fresh with Step 1.2.
4. Skip checkpoint commit (already exists from original session)

If [IS_RESUMABLE] is false (new work or addressing feedback), proceed to Step 1.2.

### Step 1.2: Record Start of Work
Get current commit SHA and record it on the issue (status is already `in_progress` from Instructions Step 3):
```bash
CURRENT_SHA=$(git rev-parse HEAD)
```

```
PATCH /issues/[ISSUE_ID]
{
  "commitSha": "[CURRENT_SHA]"
}
```

### Step 1.3: Create Checkpoint Commit (New Work Only)

**Skip this step if [IS_RESUMABLE] is true OR [HAS_MODIFICATION_REQUEST] is true** — a checkpoint already exists from the original implementation.

For new work only, create a checkpoint marker on [BASE_BRANCH]:
```bash
git commit --allow-empty -m "checkpoint: [ISSUE_ID] before implementation

Issue: [ISSUE_ID]
Title: [TITLE]"
```

**Note:** Do not stage files for the checkpoint. The checkpoint is just a marker in git history. Any uncommitted files in the working directory (artifacts from concurrent agents, user's pending work) should remain uncommitted.

### Step 1.4: Create Worktree

Generate branch name (escape special characters) and create isolated worktree:
```bash
# Branch format: issue-[escaped-issue-id]-[short-title-slug]
# Replace colons and slashes with hyphens to avoid path issues
BRANCH_NAME="issue-[ISSUE_ID with : and / replaced by -]-[slugified-short-title]"

# Example: issue "project:123" becomes branch "issue-project-123-fix-bug"

# Create worktree
instant-worktree "$BRANCH_NAME"

# Navigate to worktree (path is .worktrees/[BRANCH_NAME])
cd ".worktrees/$BRANCH_NAME"
```

## Phase 2: Execute Implementation

### Step 2.1: Implement Changes
Working ONLY in the worktree directory:
1. Read and understand existing code
2. Make required changes
3. Run linting and tests
4. Fix any issues that arise

### Step 2.2: Commit in Worktree
```bash
git add -A
git commit -m "[type]: [description]

Issue: [ISSUE_ID]

[Detailed description of changes]

🤖 Generated with Claude Code"
```

## Phase 3: Integrate and Finalize

### Step 3.1: Merge Back to Main

First, return to the main workspace and check for uncommitted files:
```bash
cd "$(git rev-parse --show-toplevel)"
git status --porcelain
```

If uncommitted files exist, assess and handle them before merging:
- **Known artifacts** (e.g., `.compare-branch/claude-launcher-*.mjs`): Delete them
- **Legitimate uncommitted work**: Stash and restore after merge
- **Potential conflicts with incoming changes**: Resolve before proceeding

Then merge:
```bash
git merge --no-ff "$BRANCH_NAME" -m "Merge branch '$BRANCH_NAME'

Issue: [ISSUE_ID]
Title: [TITLE]"
MERGE_SHA=$(git rev-parse HEAD)
```

**If merge conflict occurs:**
1. Abort merge on [BASE_BRANCH]: `git merge --abort`
2. Attempt resolution in worktree via rebase
3. If unresolvable, switch to `<error-recovery-protocol>`

### Step 3.2: Clean Up Worktree
After successful merge, remove the worktree and branch:
```bash
remove-instant-worktree "$BRANCH_NAME"
```

### Step 3.3: Post Completion Comment
```
POST /issues/[ISSUE_ID]/comments
{
  "body": "## Implementation Complete\n\n[Summary of changes]\n\n### Files Modified\n- [list of files]\n\n### Testing\n- [test results]\n\nReady for review.",
  "author": "agent",
  "commitSha": "[MERGE_SHA]",
  "codeReferences": [/* all modified files with line ranges */]
}
```

### Step 3.4: Update Status

**IMPORTANT:** Always set status to `needs_review`, NOT `done`. Only the user marks issues as done.

```
PATCH /issues/[ISSUE_ID]
{
  "status": "needs_review",
  "commitSha": "[MERGE_SHA]"
}
```

</instructions>
