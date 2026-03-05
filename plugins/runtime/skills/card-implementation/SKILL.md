---
name: card-implementation
description: Implement cards.
---


<placeholder-variables>
[PLAN_FILES] — All files the plan intends to modify (extracted from PLAN.md after writing it in Step 2)
</placeholder-variables>

<instructions>

## 1. Prepare Environment

Stash any uncommitted changes:

```bash
cd $WORKSPACE_PATH
git stash --include-untracked
```

Create baseline tag:

```bash
cd $WORKSPACE_PATH
git tag -f "implement/!` echo $CARD_ID`/baseline" HEAD
```

Restore any stashed changes: `git stash pop || true` (succeeds silently if stash is empty).

---

## 2. Plan

Write the plan to `PLAN.md` in the card repository following the `<annotated-plan-example>` from the `runtime:plan` skill. Base the plan on the card description and codebase exploration.

Commit to the card repository:

```bash
cd $CARD_REPO_PATH
git add PLAN.md
git commit -m "[single sentence summarizing the approach and key decisions]"  # <card-repo-commit-style>
```

Extract [PLAN_FILES] — all files the plan intends to modify (from the Technical Approach section).

### 2.1 Spike Testable Uncertainties

Scan the plan for assumptions, open questions, and risk assertions that can be answered with isolated code. Skip this step if none exist.

For each spike-eligible uncertainty, load the `runtime:spike` skill. Incorporate results into the plan and commit:

```bash
cd $CARD_REPO_PATH
git add PLAN.md
git commit -m "[single sentence summarizing what the spikes resolved]"  # <card-repo-commit-style>
```

---

## 3. Implement

Implement the plan directly. Load the `runtime:card-developer` skill for implementation approach (TDD, no mocks, real implementations).

For each step in the Technical Approach:
1. Read relevant files
2. Implement the change
3. Commit logically grouped changes
4. Tag the checkpoint for this step:

   ```bash
   cd $WORKSPACE_PATH
   git tag -f "implement/!` echo $CARD_ID`/step-N" HEAD
   ```

For new functions or methods, load the `runtime:tdd-implementation` skill and follow its instructions.

If an empirically-testable uncertainty surfaces during implementation, invoke the `runtime:spike` skill before proceeding. Update the plan with findings and commit to the card repo.

### 3.1 Validation Gate

**Requirement:** ALL validation commands from PLAN.md must pass before proceeding.

Run validation per the plan's "Validation Commands" section.

Based on failure:
- **Error in code you can modify**: Fix it, re-run validation
- **Error outside your scope**: Block immediately

**When blocked:** Write exact failure output as a comment, add `blocked` tag to `CARD.meta.json`, commit, and **STOP**:

```bash
cd $CARD_REPO_PATH
$NODE -e "const f='CARD.meta.json',d=JSON.parse(require('fs').readFileSync(f,'utf8')); if(!d.tags.includes('blocked')) d.tags.push('blocked'); require('fs').writeFileSync(f,JSON.stringify(d,null,2)+'\n')"
export COMMENT_ID=$($NODE ${CLAUDE_PLUGIN_ROOT}/bin/uuid7.mjs)
cat <<'EOF' > comment/$COMMENT_ID.md
[exact validation failure output]
EOF
git add comment/$COMMENT_ID.md CARD.meta.json
git commit -m "[single sentence describing the validation failure]"  # <card-repo-commit-style>
```

Only proceed to **4. Finalize** when ALL validations pass.

---

## 4. Finalize

### 4.1 Squash Commits

If there are multiple commits since the baseline tag, squash them into a single commit with a message per `<workspace-commit-style>`:

```bash
cd $WORKSPACE_PATH
git reset --soft "implement/!` echo $CARD_ID`/baseline"
git commit -m "$(cat <<'COMMITMSG'
[final commit message per <workspace-commit-style>]
COMMITMSG
)"
```

Clean up checkpoint tags:

```bash
cd $WORKSPACE_PATH
git tag -l "implement/!` echo $CARD_ID`/*" | xargs -r git tag -d
```

### 4.2 Complete

Based on review gate:

- **gates.reviewRequired is true**: Write a summary comment to the card repository explaining what was implemented and key decisions made. List the main workspace files modified and confirm all validation passed. Indicate awaiting approval. Commit to the card repository. **STOP** — Merge occurs after user approval.

  ```bash
  cd $CARD_REPO_PATH
  export COMMENT_ID=$($NODE ${CLAUDE_PLUGIN_ROOT}/bin/uuid7.mjs)
  cat <<'EOF' > comment/$COMMENT_ID.md
  [what was implemented and key decisions made, main workspace files modified, validation confirmation, and request for reviewer focus areas]
  EOF
  git add comment/$COMMENT_ID.md
  git commit -m "[single sentence summarizing what was implemented and that it is ready for review]"  # <card-repo-commit-style>
  ```

- **gates.reviewRequired is false or unset**: Write a completion comment to the card repository. Commit. Then load the `runtime:card-merge` skill and follow its `<instructions>`.

  ```bash
  cd $CARD_REPO_PATH
  export COMMENT_ID=$($NODE ${CLAUDE_PLUGIN_ROOT}/bin/uuid7.mjs)
  cat <<'EOF' > comment/$COMMENT_ID.md
  [completion summary: what was implemented, key decisions, files modified, validation confirmation]
  EOF
  git add comment/$COMMENT_ID.md
  git commit -m "[single sentence summarizing what was implemented and key decisions]"  # <card-repo-commit-style>
  ```

</instructions>
