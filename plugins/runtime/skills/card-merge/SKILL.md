---
name: card-merge
description: Merge implementation branch to base branch.
---


<instructions>

## 1. Check for Changes

Count the commits on `$WORKSPACE_BRANCH` relative to `$BASE_BRANCH` (`git rev-list --count $BASE_BRANCH..$WORKSPACE_BRANCH` in `$WORKSPACE_PATH`).

Based on commit count:
- **COMMIT_COUNT = 0**: No changes to merge. Write a comment to the card repository noting no changes were found. Commit to the card repository and **STOP**.

```bash
cd $CARD_REPO_PATH
export COMMENT_ID=$($NODE ${CLAUDE_PLUGIN_ROOT}/bin/uuid7.mjs)
cat <<'EOF' > comment/$COMMENT_ID.md
[No changes were found on $WORKSPACE_BRANCH relative to $BASE_BRANCH. Nothing to merge.]
EOF
git add comment/$COMMENT_ID.md
git commit -m "no changes to merge"  # <card-repo-commit-style>
```

- **COMMIT_COUNT >= 1**: Proceed to Step 2

## 2. Prepare Final Commit

- **COMMIT_COUNT = 1**: Review the existing commit message against `<workspace-commit-style>`. If it doesn't meet the standard, amend it with `git commit --amend`.
- **COMMIT_COUNT >= 2**: Squash into a single commit with a message per `<workspace-commit-style>`:

```bash
cd $WORKSPACE_PATH
git reset --soft $(git merge-base $WORKSPACE_BRANCH $BASE_BRANCH)
git commit -m "$(cat <<'COMMITMSG'
[final commit message per <workspace-commit-style>]
COMMITMSG
)"
```

## 3. Rebase and Validate

Rebase the squashed commit onto local `$BASE_BRANCH` to keep history linear:

```bash
cd $WORKSPACE_PATH
git rebase $BASE_BRANCH
```

Based on rebase result:
- **Conflicts occur**: Run the command above to identify all conflicted files before resolving.

```bash
cd $WORKSPACE_PATH
git diff --name-only --diff-filter=U
```

Identify conflicted files first (see below) and stage each resolved file by name rather than using `git add -A`.

```bash
cd $WORKSPACE_PATH
# Stage only the conflict-resolved files by name
git add <resolved-file-1> <resolved-file-2>
git rebase --continue
```

- **Conflicts cannot be resolved**: Write an error comment to the card repository, add `blocked` tag to `CARD.meta.json`, commit to the card repository, and **STOP** — Awaiting user intervention.

```bash
cd $CARD_REPO_PATH
$NODE -e "const f='CARD.meta.json',d=JSON.parse(require('fs').readFileSync(f,'utf8')); if(!d.tags.includes('blocked')) d.tags.push('blocked'); require('fs').writeFileSync(f,JSON.stringify(d,null,2)+'\n')"
export COMMENT_ID=$($NODE ${CLAUDE_PLUGIN_ROOT}/bin/uuid7.mjs)
cat <<'EOF' > comment/$COMMENT_ID.md
[rebase conflict details, files involved, manual resolution steps]
EOF
git add CARD.meta.json comment/$COMMENT_ID.md
git commit -m "blocked: unresolvable rebase conflict"  # <card-repo-commit-style>
```

After rebase completes, run linting, type checking, and tests.

**Validation rules:**
- All validation commands must execute and pass. A command that errors before producing results is a failure.
- Fix any errors you encounter. Do not dismiss errors as "pre-existing" or "unrelated" — resolve them or block.
- "Resolve or block" is the only valid outcome. There is no "proceed despite errors" path.
- Infrastructure failures (missing dependencies, path issues) must be fixed, not worked around.
- If blocked, report the failure by adding to existing open cards about the block, or by creating a new card with "backlog" status.

Blocking is not failure — it is honest acknowledgment that human intervention is needed. A clean block with clear documentation serves the project better than a rationalized merge.

Based on validation result:
- **All validation passes**: Proceed to Step 4
- **Validation fails and attempts < 3**: Fix errors, re-run validation
- **Validation fails and attempts >= 3**: Write a comment to the card repository explaining what failed and what you attempted. Add `blocked` tag to `CARD.meta.json`. Commit to the card repository and **STOP** — Awaiting user intervention.

```bash
cd $CARD_REPO_PATH
$NODE -e "const f='CARD.meta.json',d=JSON.parse(require('fs').readFileSync(f,'utf8')); if(!d.tags.includes('blocked')) d.tags.push('blocked'); require('fs').writeFileSync(f,JSON.stringify(d,null,2)+'\n')"
export COMMENT_ID=$($NODE ${CLAUDE_PLUGIN_ROOT}/bin/uuid7.mjs)
cat <<'EOF' > comment/$COMMENT_ID.md
[validation failure details, what was attempted, what intervention is needed]
EOF
git add CARD.meta.json comment/$COMMENT_ID.md
git commit -m "blocked: unresolvable rebase conflict"  # <card-repo-commit-style>
```

## 4. Fast-Forward Merge

`$WORKSPACE_PATH` is a worktree — `$BASE_BRANCH` is checked out elsewhere. Find where `$BASE_BRANCH` is checked out and merge there:

```bash
BASE_WORKTREE=$(git -C "$WORKSPACE_PATH" worktree list --porcelain \
  | awk -v b="$BASE_BRANCH" '/^worktree /{wt=$2} /^branch refs\/heads\//{if($2=="refs/heads/"b) print wt}')
cd "$BASE_WORKTREE"
git merge --ff-only "$WORKSPACE_BRANCH"
```

**STOP** — Merge complete. Awaiting user verification.
- **Merge fails**: Post error comment, add `blocked` tag, **STOP** — Branch is not a fast-forward of `$BASE_BRANCH` (rebase may be missing or outdated).

```bash
cd $CARD_REPO_PATH
$NODE -e "const f='CARD.meta.json',d=JSON.parse(require('fs').readFileSync(f,'utf8')); if(!d.tags.includes('blocked')) d.tags.push('blocked'); require('fs').writeFileSync(f,JSON.stringify(d,null,2)+'\n')"
export COMMENT_ID=$($NODE ${CLAUDE_PLUGIN_ROOT}/bin/uuid7.mjs)
cat <<'EOF' > comment/$COMMENT_ID.md
[merge failure details: branch is not a fast-forward of $BASE_BRANCH, likely cause and resolution steps]
EOF
git add CARD.meta.json comment/$COMMENT_ID.md
git commit -m "blocked: unresolvable rebase conflict"  # <card-repo-commit-style>
```

</instructions>
