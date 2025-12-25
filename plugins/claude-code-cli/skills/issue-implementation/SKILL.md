---
name: issue-implementation
description: Implement issue work in an isolated git worktree. Use for ALL work types (code, research, analysis, documentation) based on [DESCRIPTION] or [LATEST_USER_COMMENT].
---

<input-format>
Extract from issue data:

**Required Fields:**
- [ISSUE_ID] = The issue's unique identifier (`id`)
- [TITLE] = The issue title (`title`)
- [DESCRIPTION] = The issue description with requirements (`description`)
- [REVIEW_REQUIRED] = Whether merge approval is needed (`review` field, default: false)

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

[Detailed description of changes]"
IMPL_SHA=$(git rev-parse HEAD)
```

Post implementation commit to issue:
```
POST /issues/[ISSUE_ID]/comments
{
  "body": "## Implementation Complete\n\n[Summary of changes]\n\n### Testing\n- [test results]",
  "author": "agent",
  "commitSha": "[IMPL_SHA]",
  "codeReferences": [/* all modified files with line ranges */]
}
```

## Phase 3: Integrate and Finalize

### Step 3.1: Check Review Requirement

**If [REVIEW_REQUIRED] is true:**

Post implementation summary for user review (do NOT merge yet):

```bash
cd ".worktrees/$BRANCH_NAME"
IMPL_SHA=$(git rev-parse HEAD)
```

```
POST /issues/[ISSUE_ID]/comments
{
  "body": "## Implementation Ready for Review\n\n[Summary of changes]\n\n### Files Modified\n- [list of files]\n\n### Testing\n- [test results]\n\nAwaiting approval to merge.",
  "author": "agent",
  "commitSha": "[IMPL_SHA]",
  "codeReferences": [/* all modified files with line ranges */]
}
```

```
PATCH /issues/[ISSUE_ID]
{
  "status": "needs_review"
}
```

**STOP here.** The merge will occur after user approval via the `issue-merge-approved` skill.

---

**If [REVIEW_REQUIRED] is false:**

Load the `claude-code-cli:issue-merge-approved` skill to merge the implementation:

```xml
<invoke name="Skill">
<parameter name="skill">claude-code-cli:issue-merge-approved</parameter>
</invoke>
```

</instructions>
