---
name: issue-implementation
description: Implement issue work in an isolated git worktree for code, research, analysis, or documentation.
---

<placeholder-variables>
[BRANCH_NAME] — `issue-[ISSUE_ID]-[slugified-title]` (`:` and `/` replaced with `-`)
</placeholder-variables>

<tools>

**instant-worktree** — Creates git worktree with symlinked dependencies (~2 seconds).

```bash
instant-worktree "[BRANCH_NAME]"
```

Creates worktree at `.worktrees/[BRANCH_NAME]`. Creates a new branch if it doesn't exist, or attaches to an existing branch. Fails if worktree path is already occupied.

</tools>

<instructions>

## 1. Prepare Environment

Determine environment path using the first matching condition:

| Condition | Action |
|-----------|--------|
| [IS_RESUMABLE] AND worktree exists | **Resume**: Navigate to existing worktree |
| [IS_RESUMABLE] AND branch exists (no worktree) | **Recreate**: Attach worktree to branch |
| Otherwise | **New**: Create checkpoint and worktree |

### Resume (worktree exists)

```bash
cd ".worktrees/[BRANCH_NAME]"
git stash --include-untracked  # Save uncommitted work; restore with git stash pop after step 2
```

If "Implementation Complete" comment exists on the issue, skip to **3. Finalize**. Otherwise continue to **2. Implement**.

### Recreate (branch exists, no worktree)

```bash
instant-worktree "[BRANCH_NAME]"
cd ".worktrees/[BRANCH_NAME]"
```

If "Implementation Complete" comment exists on the issue, skip to **3. Finalize**. Otherwise continue to **2. Implement**.

### New (fresh start)

1. Create worktree:
   ```bash
   WORKTREE_JSON=$(instant-worktree "[BRANCH_NAME]")
   WORKTREE_DIR=$(echo "$WORKTREE_JSON" | jq -r '.worktree')
   BASE_SHA=$(echo "$WORKTREE_JSON" | jq -r '.baseSha')
   cd "$WORKTREE_DIR"
   ```

2. Initialize implementation:
   ```
   PATCH /issues/[ISSUE_ID]
   {
     "status": "in_progress"
   }
   ```
   ```
   POST /issues/[ISSUE_ID]/comments
   {
     "body": "I'm starting implementation by [1-sentence: the approach or first step, in gerund form (-ing)]",
     "author": "agent",
     "commitSha": "${BASE_SHA}"
   }
   ```

3. Assess title accuracy:

   Evaluate whether the issue title still accurately describes the work:

   **RENAME when:**
   - Title references wrong component, file, or feature
   - Title describes symptom but implementation addresses root cause
   - Scope has significantly changed from original request

   **DO NOT RENAME when:**
   - Minor phrasing improvements only
   - Synonyms or style preferences
   - Title is accurate but could be "better"

   If renaming is warranted:
   ```
   PATCH /issues/[ISSUE_ID]
   {
     "title": "[NEW_TITLE]"
   }
   ```

   Include the title change and rationale in the implementation summary comment.

## 2. Implement

Work in the worktree directory.

1. Read and understand existing code before making changes
2. Make required changes
3. Run linting and tests
4. Fix any issues

**If validation fails after 3 attempts:** Post failure comment and **STOP**:
```
POST /issues/[ISSUE_ID]/comments
{
  "body": "## Validation Failed\n\n[1-sentence: what failed (lint/test/type check)]\n\n### Failures\n[bullet list: specific errors that could not be resolved]\n\n### Attempted Fixes\n[bullet list: approaches tried]",
  "author": "agent"
}
```
```
PATCH /issues/[ISSUE_ID]
{
  "status": "needs_review"
}
```

Commit using conventional commit format (feat, fix, docs, refactor, test, chore):
```bash
git add -A
git commit -m "[type]: [description]

Issue: [ISSUE_ID]

[Detailed changes]"
```

Post implementation comment:
```
POST /issues/[ISSUE_ID]/comments
{
  "body": "## Implementation Complete\n\n[2-3 sentence summary: what was implemented and key decisions made]\n\n### Testing\n[bullet list: test commands run and pass/fail status]",
  "author": "agent",
  "commitSha": "${git rev-parse HEAD}",
  "codeReferences": [
    {
      "path": "[file]",
      "startLine": [n],
      "endLine": [n]
    }
  ]
}
```

## 3. Finalize

### If [REVIEW_REQUIRED]:

```
POST /issues/[ISSUE_ID]/comments
{
  "body": "## Implementation Ready for Review\n\n[2-3 sentence summary: what was implemented and key decisions made]\n\n### Files Modified\n[bullet list: key files modified, max 5]\n\n### Testing\n[bullet list: test commands run and pass/fail status]\n\nAwaiting approval.",
  "author": "agent",
  "commitSha": "${git rev-parse HEAD}",
  "codeReferences": [
    {
      "path": "[file]",
      "startLine": [n],
      "endLine": [n]
    }
  ]
}
```
```
PATCH /issues/[ISSUE_ID]
{
  "status": "needs_review"
}
```

Stop here. Merge occurs via `issue-merge-approved` skill after user approval.

### If NOT [REVIEW_REQUIRED]:

```xml
<invoke name="Skill">
  <parameter name="skill">claude-code-cli:issue-merge-approved</parameter>
</invoke>
```

</instructions>
