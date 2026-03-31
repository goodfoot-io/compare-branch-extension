---
name: card-implementation
description: Implement cards.
---


<placeholder-variables>
[PLAN_FILES] — All files the plan intends to modify (extracted from PLAN.md after writing it in §2.3)
</placeholder-variables>

<instructions>

## 1. Prepare Environment

Create baseline tag if one does not already exist:

```bash
if git rev-parse "implement/!` echo $CARD_ID`/baseline" >/dev/null 2>&1; then
  echo "Baseline tag already exists — resuming from prior checkpoint."
else
  git tag "implement/!` echo $CARD_ID`/baseline" HEAD
fi
```

If you need to test against the baseline to verify a pre-existing failure, create a temporary worktree from the baseline tag — never switch branches or stash in the current workspace:

```bash
BASELINE_WORKTREE=$($NODE ${CLAUDE_PLUGIN_ROOT}/bin/create-worktree.mjs "implement/!` echo $CARD_ID`/baseline" | $NODE -e "process.stdout.write(JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')).worktree)")
# run tests in $BASELINE_WORKTREE, then clean up:
git worktree remove "$BASELINE_WORKTREE"
```

---

## 2. Plan

### 2.1 Commander's Intent

Distill from the card what the situation looks like when the work is done, and what constraints must hold regardless of implementation approach. Lead with the done state, not the problem. The card describes what the user needs; the plan's intent translates that into operational direction for the implementer.

### 2.2 Research

Research by reviewing any relevant resource available to you, including files, web searches, or tools. Identify every consumer of each symbol, field, and boundary the plan will touch. A component discovered during implementation that belongs in the plan is a research failure.

### 2.3 Write and Store Plan

Write the plan to `PLAN.md` in the card repository. Commit to the card repository:

```bash
cd !` echo $CARD_REPO_PATH`
git add PLAN.md
git commit -m "[single sentence summarizing the approach and key decisions]"  # <card-repo-commit-style>
```

Extract [PLAN_FILES] — all files the plan intends to modify.

---

## 3. Evaluate Plan

### 3.1 Spike Testable Uncertainties

Scan the plan for assumptions — both explicit (labeled as such) and implicit (statements presented as facts that were not read from source). Any assumption that affects a planned implementation step is spike-eligible. The cost of an incorrect assumption is a plan revision; the cost of a spike is smaller. Skip this step only when no load-bearing assumptions exist.

For each spike-eligible uncertainty, invoke the `runtime:spike` skill — use validation spikes for pass/fail questions, comparison spikes for alternative selection. Launch independent spikes in parallel.

Revise PLAN.md to incorporate spike results. A spike that disproves the root cause or a load-bearing assumption invalidates the plan from intent through approach — rewrite, don't patch.

```bash
cd !` echo $CARD_REPO_PATH`
git add PLAN.md
git commit -m "[single sentence summarizing what the spikes resolved]"  # <card-repo-commit-style>
```

---

## 4. Implement

Implement the plan directly. Load the `runtime:card-developer` skill for implementation approach (TDD, no mocks, real implementations).

For each step in the plan:
1. Read relevant files
2. Implement the change
3. Commit logically grouped changes
4. Tag the rollback point for this step:

   ```bash
      git tag -f "implement/!` echo $CARD_ID`/step-N" HEAD
   ```

For new functions or methods, load the `runtime:tdd-implementation` skill and follow its instructions.

If an empirically-testable uncertainty surfaces during implementation, invoke the `runtime:spike` skill before proceeding. Update the plan with findings and commit to the card repo.

### 4.1 Validation Gate

**Requirement:** ALL validation commands from PLAN.md must pass before proceeding.

Run validation per the plan's validation commands.

Based on failure:
- **Error in code you can modify**: Fix it, re-run validation
- **Error outside your scope**: Block immediately

**When blocked:** Write exact failure output as a comment, add `blocked` tag to `CARD.meta.json`, commit, and **STOP**:

```bash
cd !` echo $CARD_REPO_PATH`
$NODE -e "const f='CARD.meta.json',d=JSON.parse(require('fs').readFileSync(f,'utf8')); if(!d.tags.includes('blocked')) d.tags.push('blocked'); require('fs').writeFileSync(f,JSON.stringify(d,null,2)+'\n')"
cat <<'EOF' > comment/validation-failed.md
[exact validation failure output]
EOF
git add comment/validation-failed.md CARD.meta.json
git commit -m "[single sentence describing the validation failure]"  # <card-repo-commit-style>
```

Only proceed to **5. Finalize** when ALL validations pass.

---

## 5. Finalize

### 5.1 Clean Up Tags

Clean up rollback tags:

```bash
git tag -l "implement/!` echo $CARD_ID`/*" | xargs -r git tag -d
```

### 5.2 Complete

Based on review gate:

- **gates.mergeRequestRequired is true**: Commit to the card repository. **STOP** — Merge occurs after user approval.

- **gates.mergeRequestRequired is false or unset**: Load the `runtime:card-merge` skill and follow its `<instructions>`.

</instructions>
