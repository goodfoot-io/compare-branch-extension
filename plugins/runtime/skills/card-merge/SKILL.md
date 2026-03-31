---
name: card-merge
description: Merge implementation branch to base branch.
---


<instructions>

## 1. Check for Changes

Count the commits on `$WORKSPACE_BRANCH` relative to `$BASE_BRANCH` (`git rev-list --count $BASE_BRANCH..$WORKSPACE_BRANCH` in `$WORKSPACE_PATH`).

Based on commit count:
- **COMMIT_COUNT = 0**: No changes to merge. **STOP**.
- **COMMIT_COUNT >= 1**: Proceed to Step 2

## 2. Rebase and Validate

Rebase the branch onto local `$BASE_BRANCH` to keep history linear:

```bash
git rebase --empty=drop $BASE_BRANCH
```

Based on rebase result:
- **Conflicts occur**: Run the command above to identify all conflicted files before resolving.

```bash
git diff --name-only --diff-filter=U
```

Identify conflicted files first (see below) and stage each resolved file by name rather than using `git add -A`.

```bash
# Stage only the conflict-resolved files by name
git add <resolved-file-1> <resolved-file-2>
git rebase --continue
```

- **Conflicts cannot be resolved**: Write an error comment to the card repository, add `blocked` tag to `CARD.meta.json`, commit to the card repository, and **STOP** — Awaiting user intervention.

```bash
cd !` echo $CARD_REPO_PATH`
$NODE -e "const f='CARD.meta.json',d=JSON.parse(require('fs').readFileSync(f,'utf8')); if(!d.tags.includes('blocked')) d.tags.push('blocked'); require('fs').writeFileSync(f,JSON.stringify(d,null,2)+'\n')"
cat <<'EOF' > comment/merge-conflict.md
[rebase conflict details, files involved, manual resolution steps]
EOF
git add CARD.meta.json comment/merge-conflict.md
git commit -m "[single sentence describing the conflict or validation failure and what intervention is needed]"  # <card-repo-commit-style>
```

- **Rebase completes with 0 commits ahead of `$BASE_BRANCH`** (commit was dropped as empty): The changes are already present in `$BASE_BRANCH`. Write a comment to the card repository noting this, and **STOP** — nothing to merge.

After rebase completes, run linting, type checking, and tests.

**Validation rules:**
- All validation commands must execute and pass — a command that errors before producing results is a failure
- Fix any errors you encounter — do not dismiss errors as "pre-existing" or "unrelated"
- "Resolve or block" is the only valid outcome — there is no "proceed despite errors" path
- Fix infrastructure failures (missing dependencies, path issues) directly — do not work around them
- **If blocked**: Report by adding to existing open cards about the block, or create a new card with "backlog" status

Based on validation result:
- **All validation passes**: Proceed to Step 3
- **Validation fails and attempts < 3**: Fix errors, re-run validation
- **Validation fails and attempts >= 3**: Write a comment to the card repository explaining what failed and what you attempted. Add `blocked` tag to `CARD.meta.json`. Commit to the card repository and **STOP** — Awaiting user intervention.

```bash
cd !` echo $CARD_REPO_PATH`
$NODE -e "const f='CARD.meta.json',d=JSON.parse(require('fs').readFileSync(f,'utf8')); if(!d.tags.includes('blocked')) d.tags.push('blocked'); require('fs').writeFileSync(f,JSON.stringify(d,null,2)+'\n')"
cat <<'EOF' > comment/validation-failed.md
[validation failure details, what was attempted, what intervention is needed]
EOF
git add CARD.meta.json comment/validation-failed.md
git commit -m "[single sentence describing the conflict or validation failure and what intervention is needed]"  # <card-repo-commit-style>
```

## 3. Fast-Forward Merge

`$WORKSPACE_PATH` is a worktree — `$BASE_BRANCH` is checked out elsewhere. Find where `$BASE_BRANCH` is checked out and merge there:

```bash
BASE_WORKTREE=$(git -C "$WORKSPACE_PATH" worktree list --porcelain \
  | awk -v b="$BASE_BRANCH" '/^worktree /{wt=$2} /^branch refs\/heads\//{if($2=="refs/heads/"b) print wt}')
cd "$BASE_WORKTREE"
git merge --ff-only "$WORKSPACE_BRANCH"
```

**STOP** — Merge complete. Do not update card status, write comments, or take further action.

- **Merge fails**: Post error comment, add `blocked` tag, **STOP** — Branch is not a fast-forward of `$BASE_BRANCH` (rebase may be missing or outdated).

```bash
cd !` echo $CARD_REPO_PATH`
$NODE -e "const f='CARD.meta.json',d=JSON.parse(require('fs').readFileSync(f,'utf8')); if(!d.tags.includes('blocked')) d.tags.push('blocked'); require('fs').writeFileSync(f,JSON.stringify(d,null,2)+'\n')"
cat <<'EOF' > comment/merge-failed.md
[merge failure details: branch is not a fast-forward of $BASE_BRANCH, likely cause and resolution steps]
EOF
git add CARD.meta.json comment/merge-failed.md
git commit -m "[single sentence describing the conflict or validation failure and what intervention is needed]"  # <card-repo-commit-style>
```

</instructions>
