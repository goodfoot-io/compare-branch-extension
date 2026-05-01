
<placeholder-variables>
[CARD_ID] — The card identifier, used to scope the validation team's name
</placeholder-variables>

<instructions>

This reference fires when card work exists (`commits.csv` has commit SHAs and/or the worktree has uncommitted changes) and no stronger signal claims the card — typically after the card emerged from a `blocked` state, after a session crashed or terminated mid-flow, or when work exists without an approved plan or pending merge approval.

**Output asymmetry.** This skill may route backward to planning or implementation on the orchestrator's judgment alone. It cannot route forward to merge on its own — finalize requires `failure-mode` `VERDICT: APPROVED`.

**Depth.** This skill always runs Standard depth (single `failure-mode` evaluator); it does not dispatch `experience-evaluator`. Re-validation is a focused safety check on already-committed work, not a full Deep evaluation.

## 1. Prepare Environment

### 1.1 Baseline Tag

If `implement/$CARD_ID/baseline` does not exist, create it at the prior committed state — the latest commit recorded in `commits.csv` when present, otherwise current `HEAD` (which represents the workspace branch tip before any uncommitted work is staged in Step 1.2).

```bash
if git rev-parse "implement/$CARD_ID/baseline" >/dev/null 2>&1; then
  echo "Baseline tag already exists — resuming from prior checkpoint."
else
  baseline_sha=$(tail -n 1 "$CARD_REPO_PATH/commits.csv" 2>/dev/null | cut -d, -f1)
  if [ -z "$baseline_sha" ]; then
    baseline_sha=$(git rev-parse HEAD)
  fi
  git tag "implement/$CARD_ID/baseline" "$baseline_sha"
fi
```

### 1.2 Stage Uncommitted Work

**You must load the `cards:markdown` and `runtime:workspace-commit-style` skills before the first commit.**

If the worktree contains uncommitted changes — typical after a crashed session that left work unsaved — commit them so validation and the failure-mode evaluator analyze a coherent implementation:

```bash
git add -A
git diff --cached --quiet || git commit -m "$(cat <<'COMMITMSG'
[commit message per <workspace-commit-style>; fragment-link every named file, function, and type per <markdown-guidelines> — describe the uncommitted changes recovered from the worktree]
COMMITMSG
)"
```

## 2. Pre-Evaluator Validation

Run the workspace's typecheck, lint, and tests. If a plan file in `plan/` declares custom validation commands, run those instead.

Based on the result:
- **All validations pass**: Proceed to Step 3.
- **Failure not obviously the active card's work** (anything ambiguous, unfamiliar, or that "feels" pre-existing): Dispatch `runtime:card:pre-existing-condition` per the dispatch shape used by `./implementation-with-plan.md` Step 3. Do not investigate the failure inline.
  - On COMPLETED: re-run the validation command. If it passes, proceed to Step 3.
  - On NOT_PRE_EXISTING: the agent verified the failure is in scope of the active card's work. Proceed to Step 3 — the orchestrator escape hatch should fire on this evidence.
  - On NEEDS_REVISION or BLOCKED: add `blocked` to `tags` in `CARD.meta.json`, write the agent's report and exact failure output to `comment/validation-failed.md`, commit, **STOP**.
- **Failure clearly originates in files the active card's diff touched**: Proceed to Step 3 — the validation suite is reporting that the work is not actually done.

## 3. Optional Escape Hatch — Orchestrator Judgment

Before dispatching the evaluator, you may bail out if your reading of `plan/`, `commits.csv`, `CARD.md`, the diff against `implement/$CARD_ID/baseline`, and the pre-evaluator validation result indicates the implementation is not ready for evaluation. The trigger is your judgment — there is no checklist.

This skill cannot finalize the card on its own. The escape hatch may only re-route backward, never forward to merge:

- **Plan file exists in `plan/`**: Read `./implementation-with-plan.md` and follow its instructions. Its Step 2.1 detects partial-implementation and resumes the work.
- **No plan file**: Read `./plan.md` and follow its instructions.

If you choose not to bail out, continue to Step 4.

## 4. Dispatch failure-mode

Create a single-evaluator team scoped to this validation pass:

```xml
<invoke name="TeamCreate">
  <parameter name="team_name">card-validate-[CARD_ID]</parameter>
  <parameter name="description">Re-validation team for card [CARD_ID]</parameter>
</invoke>
```

Read the diff and the card before writing the prompt — the prompt must reflect this specific implementation, not generic instructions.

```xml
<invoke name="Agent">
<parameter name="description">Re-validate prior implementation</parameter>
<parameter name="subagent_type">runtime:card:failure-mode</parameter>
<parameter name="model">opus</parameter>
<parameter name="name">failure-mode</parameter>
<parameter name="team_name">card-validate-[CARD_ID]</parameter>
<parameter name="run_in_background">true</parameter>
<parameter name="prompt">
**IMPORTANT: Load the `runtime:card-failure-mode` skill immediately.**

Follow the skill from the top. Draft the failure-mode questions for this implementation, then evaluate against them. DM each finding as `FINDING:` to `team-lead`, and DM `VERDICT: APPROVED`, `VERDICT: CHANGES_REQUESTED`, or `VERDICT: BLOCKED` to `team-lead` when analysis is complete. The marker goes in the `summary` field; the body in `message`.

## Team Name
Your team is `card-validate-[CARD_ID]`.

This is a re-validation pass — the implementation was committed in a prior session and is being re-checked before finalize. Weight completeness against the card's acceptance criteria alongside the usual failure-mode questions.

## Card Repository
[CARD_REPO_PATH]

## Workspace
[WORKSPACE_PATH]

## Baseline
Changes are relative to git tag: `implement/[CARD_ID]/baseline`

## Validation
Workspace validation passed before this dispatch. Focus on runtime behavior, semantic failures, completeness against the card's intent, and gaps the validation suite does not cover.

[Describe the specific failure risks this implementation presents based on the diff and the card. Where is the implementer's attention concentrated, and where are the blind spots most likely? Write this from what you found, not as generic instructions.]
</parameter>
</invoke>
```

## 5. Collect Verdict and Route

Monitor inbound DMs from the evaluator. Record each `FINDING:` (label and body) for the routing branches below. Wait for the evaluator's `VERDICT:` DM.

Every branch tears down the team the same way: DM the evaluator a shutdown request, wait for it to exit, then `TeamDelete`. Do this before any branch-specific routing.

```xml
<invoke name="SendMessage">
  <parameter name="to">failure-mode</parameter>
  <parameter name="message">{"type": "shutdown_request"}</parameter>
</invoke>
```

Wait for the evaluator to shut down, then:

```xml
<invoke name="TeamDelete" />
```

Then route on the verdict:
- **`VERDICT: APPROVED`**: Proceed to Step 6: Finalize.
- **`VERDICT: CHANGES_REQUESTED`**: Route based on plan presence. "Plan file exists" means at least one non-`.meta.json` `.md` file under `plan/` in the card repository:
  - **Plan file exists**: Read `./implementation-with-plan.md` and follow its instructions. Carry the recorded findings into your context so its Step 2.2 routing sees the same scope the evaluator named.
  - **No plan file**: Read `./plan.md` and follow its instructions. The findings inform the next planning pass.
- **`VERDICT: BLOCKED`**: Add `blocked` to `tags` in `CARD.meta.json`, write the evaluator's rationale to `comment/validation-failed.md`, commit both, **STOP**.

## 6. Finalize

Only enter this step on `VERDICT: APPROVED`.

### 6.1 Stage Remaining Changes

Stage any artifacts the evaluator wave or finalize prep produced:

```bash
git add -A
git diff --cached --quiet || git commit -m "$(cat <<'COMMITMSG'
[commit message per <workspace-commit-style>; fragment-link every named file, function, and type per <markdown-guidelines>]
COMMITMSG
)"
```

### 6.2 Tag Cleanup

Remove the baseline tag — the pre-implementation rollback window is closed once finalize commits land.

```bash
git tag -d "implement/$CARD_ID/baseline" 2>/dev/null
```

### 6.3 Complete or Await Review

Based on `gates.mergeRequestRequired`:
- **false or unset**: Read `./merge.md` and follow its `<instructions>`.
- **true**: **STOP** — Merge occurs after user approval.

</instructions>

<rollback>

| Tag | Created At | Advances | Purpose |
|-----|------------|----------|---------|
| `implement/[CARD_ID]/baseline` | Step 1.1: Baseline Tag (if missing) | Never | Comparison ref for the failure-mode evaluator and rollback target if Step 3's escape hatch fires. Pinned at last commits.csv SHA, or HEAD when commits.csv is empty. |

</rollback>

<orchestrator-constraints>
You coordinate — you do NOT implement code yourself.

| Orchestrator handles directly | Agents handle via delegation |
|------------------------------|------------------------------|
| Syntax errors visible in output | Feature implementation |
| Import path corrections | Business logic changes |
| Config file typos | Complex debugging |
| Test setup/polyfills | Multi-file refactoring |
| | Investigation work |

The escape hatch in Step 3 may route backward only — to planning or implementation. Forward progress to merge requires `failure-mode` `VERDICT: APPROVED` in Step 5. Never finalize the card from this skill without that verdict, regardless of how complete the implementation appears.

**Never update card status directly. Never include commitSha in comments after commits** — hooks handle commit tracking automatically.
</orchestrator-constraints>
