---
name: issue-implementation
description: Implement issues in isolated git worktree.
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
- **[IS_RESUMABLE] AND worktree exists**: Resume — Navigate to existing worktree
- **[IS_RESUMABLE] AND branch exists (no worktree)**: Recreate — Attach worktree to branch
- **Otherwise**: New — Create checkpoint and worktree

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

2. Signal work has started:
   ```
   PATCH /issues/[ISSUE_ID]
   {
     "status": "in_progress"
   }
   ```

3. Launch background Explore subagents (haiku model). Launch multiple subagents with distinct, targeted prompts based on the issue content:

   ```xml
   <invoke name="Task">
   <parameter name="description">explore-[target-a]</parameter>
   <parameter name="subagent_type">Explore</parameter>
   <parameter name="model">haiku</parameter>
   <parameter name="run_in_background">true</parameter>
   <parameter name="prompt">[Distinct exploration task derived from issue]</parameter>
   </invoke>
   <invoke name="Task">
   <parameter name="description">explore-[target-b]</parameter>
   <parameter name="subagent_type">Explore</parameter>
   <parameter name="model">haiku</parameter>
   <parameter name="run_in_background">true</parameter>
   <parameter name="prompt">[Distinct exploration task derived from issue]</parameter>
   </invoke>
   ```

4. Clarify issue:

   Evaluate whether the title and description are clear enough to begin work. A good title completes the sentence: *"To finish this ticket, I need to [TITLE]"*

   **Clarify title when:**
   - Title is truncated, incomplete, or doesn't start with an action verb
   - Title describes symptom rather than the work (e.g., "Page is slow" → "Optimize database queries")
   - Title references wrong component, file, or feature

   **Clarify description when:**
   - Description contains factual errors (wrong paths, incorrect component names)
   - Description lacks context needed to begin work

   **Leave unchanged when:** Only minor phrasing or style preferences would change.

   **Clarification principles:**
   - Preserve all user-provided details, requirements, and constraints
   - Maintain user intent — the clarified version must request the same outcome
   - Correct factual errors in the main text; append a footnote: `*Corrections: Changed X to Y (reason)*`

   **Enrich descriptions** with context discovered during exploration:
   - Relevant file paths and component names
   - Technical constraints or dependencies
   - Acceptance criteria (if inferable from user intent)
   - Brief background on why this change matters

   Do not expand scope beyond user intent.

   If changes are needed:
   ```
   PATCH /issues/[ISSUE_ID]
   {
     "title": "[CLARIFIED_TITLE]",
     "description": "[CLARIFIED_DESCRIPTION]"
   }
   ```

   Omit fields that don't need changes. Skip this PATCH entirely if no clarification is needed.

## 2. Implement

Collect background exploration results via TaskOutput. Launch additional Explore subagents if new information reveals unexplored areas.

Work in the worktree directory.

1. Read and understand existing code before making changes
2. Make required changes
3. Run linting, type checking, and tests
4. Fix any issues

**Validation rules:**
- All validation commands must execute and pass. A command that errors before producing results is a failure.
- Fix any errors you encounter. Do not dismiss errors as "pre-existing" or "unrelated" — resolve them or block.
- Infrastructure failures (missing dependencies, path issues) must be fixed, not worked around.
- If blocked, report the failure by adding to existing open issues about the block, or by creating a new issue with "backlog" status.

Based on validation result:
- **All validation passes**: Proceed to commit
- **Validation fails and attempts < 3**: Fix errors, re-run validation
- **Validation fails and attempts ≥ 3**: Post error comment explaining what failed and what you attempted, set status `needs_review`, add `blocked` tag, **STOP** — Awaiting user intervention.

Commit using conventional commit format (feat, fix, docs, refactor, test, chore):
```bash
git add -A
git commit -m "[type]: [description]

Issue: [ISSUE_ID]

[Detailed changes]"
```

Post a summary comment explaining what you implemented and any important decisions you made. Include which test commands you ran and their results. This comment documents the completion before merge.
```
POST /issues/[ISSUE_ID]/comments
{
  "body": "[comment content]",
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

Post a summary explaining what you implemented and key decisions you made. List the main files you modified and which validation commands passed. Indicate you're waiting for approval before merge.
```
POST /issues/[ISSUE_ID]/comments
{
  "body": "[comment content]",
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

Stop here. Merge occurs via `issue-merge` skill after user approval.

### If NOT [REVIEW_REQUIRED]:

```xml
<invoke name="Skill">
  <parameter name="skill">claude-code-cli:issue-merge</parameter>
</invoke>
```

</instructions>
