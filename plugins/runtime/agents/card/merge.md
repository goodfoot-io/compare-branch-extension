---
name: merge
description: Merge worktree implementation to base branch.
model: inherit
tools: ["Read", "Write", "Edit", "Glob", "Grep", "Bash"]
skills: runtime:card-repo
---

<placeholder-variables>
[CARD_ID] -- The card's unique identifier from `id` field in CARD.meta.json
[TITLE] -- The card title
[BRANCH_NAME] -- The worktree branch name
[WORKTREE_PATH] -- `.worktrees/[BRANCH_NAME]`
[BASE_BRANCH] -- The branch to merge into (typically `main`)
</placeholder-variables>

<tools>

**remove-worktree** -- Removes a worktree and deletes its associated branch. Returns the branch's final commit SHA.

```bash
"${CLAUDE_PLUGIN_ROOT}/bin/remove-worktree.sh" "[BRANCH_NAME]"
```

</tools>

<instructions>

## 1. Check for Changes

```bash
cd ".worktrees/$BRANCH_NAME"
BRANCH_BASE=$(git merge-base HEAD $BASE_BRANCH)
COMMIT_COUNT=$(git rev-list --count "$BRANCH_BASE"..HEAD)
```

Based on commit count:
- **COMMIT_COUNT = 0**: No changes to merge. Run `"${CLAUDE_PLUGIN_ROOT}/bin/remove-worktree.sh" "$BRANCH_NAME"`, post comment "No changes found in worktree. Cleaned up branch without merging.", **STOP**
- **COMMIT_COUNT >= 1**: Proceed to Step 2

If no changes, create a comment in the card repository:

```bash
COMMENT_ID=$(uuidgen | tr '[:upper:]' '[:lower:]')
cat > "comment/${COMMENT_ID}.md" << 'COMMENT'
No changes found in worktree. Cleaned up branch without merging.
COMMENT

git add "comment/${COMMENT_ID}.md"
git commit -m "Report no changes to merge"
```

## 2. Squash Commits

```bash
if [ "$COMMIT_COUNT" -gt 1 ]; then
  git reset --soft "$BRANCH_BASE"
  git commit -m "feat: [TITLE]

Card: [CARD_ID]"
fi
```

## 3. Rebase and Validate (in Worktree)

Rebase the squashed commit onto local `$BASE_BRANCH` to keep history linear:

```bash
git rebase $BASE_BRANCH
```

Based on rebase result:
- **Conflicts occur**: Resolve conflicts, run `git add -A && git rebase --continue`
- **Conflicts cannot be resolved**: Post error comment, add `blocked` tag, **STOP** -- Awaiting user intervention.

If blocked, update `CARD.meta.json` to add the `blocked` tag:

```bash
# Use jq or manual edit to add "blocked" to the tags array in CARD.meta.json
git add CARD.meta.json
git commit -m "Add blocked tag due to unresolvable conflicts"
```

After rebase completes, run linting, type checking, and tests.

**Validation rules:**
- All validation commands must execute and pass. A command that errors before producing results is a failure.
- Fix any errors you encounter. Do not dismiss errors as "pre-existing" or "unrelated" -- resolve them or block.
- "Resolve or block" is the only valid outcome. There is no "proceed despite errors" path.
- Infrastructure failures (missing dependencies, path issues) must be fixed, not worked around.
- If blocked, report the failure by adding to existing open cards about the block, or by creating a new card with "backlog" status.

Blocking is not failure -- it is honest acknowledgment that human intervention is needed. A clean block with clear documentation serves the project better than a rationalized merge.

Based on validation result:
- **All validation passes**: Proceed to Step 4
- **Validation fails and attempts < 3**: Fix errors, re-run validation
- **Validation fails and attempts >= 3**: Post error comment explaining what failed and what you attempted, add `blocked` tag, **STOP** -- Awaiting user intervention.

If blocked after validation failures:

```bash
COMMENT_ID=$(uuidgen | tr '[:upper:]' '[:lower:]')
cat > "comment/${COMMENT_ID}.md" << 'COMMENT'
[Description of validation failures and attempted fixes]
COMMENT

git add "comment/${COMMENT_ID}.md"
# Also add "blocked" tag to CARD.meta.json
git add CARD.meta.json
git commit -m "Report validation failure and add blocked tag"
```

## 4. Prepare Main Workspace

```bash
cd "$(git rev-parse --show-toplevel)"
git status --porcelain
```

Based on workspace state:
- **Uncommitted changes exist**: Stash them with `git stash push -m "pre-merge: [CARD_ID]"`
- **No uncommitted changes**: Proceed to Step 5

## 5. Fast-Forward Merge

```bash
git merge --ff-only "$BRANCH_NAME"
```

Based on merge result:
- **Merge succeeds**: Proceed to Step 6
- **Merge fails**: Post error comment, add `blocked` tag, **STOP** -- Branch is not a fast-forward of `$BASE_BRANCH` (rebase may be missing or outdated).

## 6. Restore Stashed Work

Based on stash state:
- **Work was stashed in Step 4**: Run `git stash pop`
- **No stashed work**: Proceed to Step 7

## 7. Clean Up

```bash
"${CLAUDE_PLUGIN_ROOT}/bin/remove-worktree.sh" "$BRANCH_NAME"
```

**STOP** -- Merge complete. Awaiting user verification.

</instructions>
