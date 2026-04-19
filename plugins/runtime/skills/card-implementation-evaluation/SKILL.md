---
name: card-implementation-evaluation
description: Evaluate implementation via failure-mode subagents. The orchestrator streams findings as tasks to a developer who applies fixes in parallel.
---


<placeholder-variables>
[CARD_ID] — The card identifier, used to scope the evaluation team's name
</placeholder-variables>

<instructions>

## 1. Stage Uncommitted Changes

### 1.1 Load Skills

Load the `cards:markdown` and `runtime:workspace-commit-style` skills. The `<workspace-commit-style>` convention used in workspace commit messages throughout these instructions is defined in `runtime:workspace-commit-style` — it must be loaded before any commits are made.

### 1.2 Commit

Ensure all workspace changes are committed before evaluation:

```bash
git add -A
git diff --cached --quiet || git commit -m "$(cat <<'COMMITMSG'
[commit message per <workspace-commit-style>; fragment-link every named file, function, and type per <markdown-guidelines> — describe the uncommitted changes]
COMMITMSG
)"
```

## 2. Pre-Evaluation Validation

Run validation per the plan's validation commands.

**On any failure:** `TaskCreate` a `[Pre-eval fix]` task per failure with the failure output in the description — for orchestrator tracking only. **Delegate fixes — do not implement directly.** Assess coherence of the failures, choose a model, and dispatch a developer agent with each failure's full content inlined in its prompt (developers cannot read tasks). When the developer returns, `TaskUpdate` each `[Pre-eval fix]` task to `completed` yourself. After all fixes complete, return to **1. Stage Uncommitted Changes**.

Only proceed to **3. Dispatch Subagents** when ALL validations pass.

## 3. Dispatch Subagents

Diff the workspace against the baseline to see the full scope of changes. Select depth based on the number of changed files, types of changes, and runtime risk signals:

| Depth | What runs |
|-------|-----------|
| Standard | One `failure-mode` subagent |
| Deep | One `failure-mode` subagent + one `experience-evaluator` subagent |

Use deep when the implementation touches many files, introduces new API boundaries, modifies shared state, adds significant async or error-path logic, or makes substantial changes to user-facing behavior.

### 3.1 Create Evaluation Team

Before dispatching evaluators, create a team to scope their broadcasts:

```xml
<invoke name="TeamCreate">
  <parameter name="team_name">card-impl-eval-[CARD_ID]</parameter>
  <parameter name="description">Implementation evaluation team for card [CARD_ID]</parameter>
</invoke>
```

Every evaluator dispatched in §3.2 joins the team via `team_name=card-impl-eval-[CARD_ID]`. The developer dispatched in §3.3 does **not** join the team — the orchestrator addresses it directly by name.

### 3.2 Dispatch Evaluators

Before writing the prompts, read the diff and the card. Each prompt must reflect the specific nature of this implementation and this card.

#### Standard

Spawn one failure-mode subagent in background mode, in the team:

```xml
<invoke name="Agent">
<parameter name="description">Failure mode analysis</parameter>
<parameter name="subagent_type">runtime:card:failure-mode</parameter>
<parameter name="model">opus</parameter>
<parameter name="name">failure-mode</parameter>
<parameter name="team_name">card-impl-eval-[CARD_ID]</parameter>
<parameter name="run_in_background">true</parameter>
<parameter name="prompt">
Identify potential failure modes in this implementation.

## Card Repository
[CARD_REPO_PATH]

## Workspace
[WORKSPACE_PATH]

## Baseline
Changes are relative to git tag: `implement/[CARD_ID]/baseline`

## Validation
All validation has passed. Focus on runtime behavior, semantic failures, and gaps the validation suite does not cover.

[Describe the specific failure risks this implementation presents — both technical and user-facing. Where does the diff suggest the implementer's attention was concentrated, and where are the blind spots most likely? Which runtime paths are unexercised by tests, which contracts may drift silently, and which consumer assumptions break? Then translate the card's requirements into user scenarios: what would a user experience as broken, wrong, or missing? Write this from what you found in the diff and the card, not as generic instructions.]
</parameter>
</invoke>
```

#### Deep

Spawn both evaluators in parallel in background mode, in the team:

```xml
<invoke name="Agent">
<parameter name="description">Failure mode analysis</parameter>
<parameter name="subagent_type">runtime:card:failure-mode</parameter>
<parameter name="model">opus</parameter>
<parameter name="name">failure-mode</parameter>
<parameter name="team_name">card-impl-eval-[CARD_ID]</parameter>
<parameter name="run_in_background">true</parameter>
<parameter name="prompt">
Identify potential failure modes in this implementation.

## Card Repository
[CARD_REPO_PATH]

## Workspace
[WORKSPACE_PATH]

## Baseline
Changes are relative to git tag: `implement/[CARD_ID]/baseline`

## Validation
All validation has passed. Focus on runtime behavior, semantic failures, and gaps the validation suite does not cover.

[Describe the specific internal failure risks this implementation presents. Where does the diff suggest the implementer's attention was concentrated — and where are the blind spots most likely? Which §3 failure patterns are most probable given the nature of the changes: new async boundaries, shared state mutations, type contract changes, new error paths, consumer impact? Write this from what you found in the diff, not as a generic description.]
</parameter>
</invoke>
```

```xml
<invoke name="Agent">
<parameter name="description">Experience evaluation</parameter>
<parameter name="subagent_type">runtime:card:experience-evaluator</parameter>
<parameter name="model">opus</parameter>
<parameter name="name">experience-evaluator</parameter>
<parameter name="team_name">card-impl-eval-[CARD_ID]</parameter>
<parameter name="run_in_background">true</parameter>
<parameter name="prompt">
Find failure modes in this implementation as a user would experience them.

## Card Repository
[CARD_REPO_PATH]

## Workspace
[WORKSPACE_PATH]

## Baseline
Changes are relative to git tag: `implement/[CARD_ID]/baseline`

## Validation
All validation has passed. Focus on what a user would experience as broken, wrong, or missing that the validation suite does not cover.

[Translate the card's requirements into user scenarios this implementation must satisfy:
- The specific acceptance criteria to verify
- The user-facing entry points — the surfaces, endpoints, or interactions a user encounters with this feature
- What a user testing against the card should do and what they should observe

Write this from what you found in the card, not as a generic description.]
</parameter>
</invoke>
```

## 4. Stream Findings to Developers

While evaluators run in the team, monitor team broadcasts. Each evaluator broadcasts two kinds of message:

- **`FINDING:` broadcast**: A finding is ready. `TaskCreate` a `[Review fix]` task, then route the task to a developer per §4.1: Coherence Routing.
- **`VERDICT:` broadcast**: Record the evaluator's verdict and the broadcast body for use in **5. Read Verdicts and Decide**.

Continue until every dispatched evaluator has broadcast `VERDICT:`. Then proceed.

### 4.1 Coherence Routing

Maintain a registry of dispatched developers (`developer-1`, `developer-2`, …) keyed by the file scope they own. For each `[Review fix]` task created from a `FINDING:` broadcast, route by coherence:

- **Coherent with an existing developer's scope** (same files, same logical refactor, depends on its prior task): SendMessage that developer with the finding body inlined (developers cannot read tasks).
- **Independent of every existing developer's scope** (no shared files, no data-flow dependency): dispatch a new developer per §4.2 with the finding as its initial scope.

Coherence is the same routing principle as `card-implementation-with-plan` §2.2: coupled work flows through a single developer; independent work runs in parallel.

When a finding's file scope cannot be inferred from its broadcast body, treat it as independent and dispatch a fresh developer.

### 4.2 Dispatch a Developer

A developer is **not** a team member; the orchestrator addresses it directly by name. Each developer owns the files referenced in its assigned tasks — never dispatch a new developer with files another live developer owns.

```xml
<invoke name="Agent">
<parameter name="description">Apply review fixes ([SCOPE_SUMMARY])</parameter>
<parameter name="subagent_type">runtime:card:developer</parameter>
<parameter name="model">opus</parameter>
<parameter name="name">developer-[N]</parameter>
<parameter name="run_in_background">true</parameter>
<parameter name="prompt">
Apply fixes for review findings streamed by the orchestrator. You cannot read tasks — every finding you must address is delivered inline in this prompt or in a subsequent SendMessage.

## Card Repository
[CARD_REPO_PATH]

## Workspace
[WORKSPACE_PATH]

## Baseline
The implementation under evaluation is committed at HEAD. The implementation baseline is git tag `implement/[CARD_ID]/baseline`.

## Initial Findings

### [short label]
[full finding body — include the file or runtime path it applies to]

[Repeat per initial finding.]

## File Ownership
This developer owns: [absolute paths the initial findings touch — never modify files outside this set without orchestrator confirmation]

## Validation
[Validation commands from the plan that must pass before returning]

## Loop

The orchestrator will SendMessage you additional findings as they arrive in your scope, then a finalize trigger when all evaluators have broadcast verdicts.

1. **For each finding (initial or notified):** apply the fix in the workspace and commit per `<workspace-commit-style>`. One commit per finding. Do not run full validation between findings.
2. **On the finalize trigger:** run validation scoped to your owned files. If validation fails, fix and re-run — up to three attempts. If validation still fails, return with the unresolved failure named.
3. **Return** when validation passes (or attempts exhausted). Your final response must list each finding by its short label and the commit SHA that addressed it, plus any finding left unresolved with the reason.

A finding may only be left unfixed if it was attempted and introduced a regression, or if an external constraint prevents the fix. "Follow-up candidate," "known limitation," and "out of scope" are not valid reasons.
</parameter>
</invoke>
```

When dispatching the first developer for a round, also issue the corresponding `TaskCreate` (for orchestrator tracking only) in the same parallel message. For coherent routing of subsequent findings, issue `TaskCreate` and `SendMessage to: developer-[N]` together — the SendMessage inlines the finding body because developers cannot read tasks:

```xml
<invoke name="TaskCreate">
  <parameter name="subject">[Review fix] [short label]</parameter>
  <parameter name="description">[full finding body — include the file or runtime path it applies to]</parameter>
</invoke>
<invoke name="SendMessage">
  <parameter name="to">developer-[N]</parameter>
  <parameter name="summary">New finding: [short label]</parameter>
  <parameter name="message">
### [short label]
[full finding body — include the file or runtime path it applies to]
  </parameter>
</invoke>
```

## 5. Read Verdicts and Decide

Send a finalize trigger to every dispatched developer in parallel so each finishes any in-flight fixes, validates its owned files, and returns:

```xml
<invoke name="SendMessage">
  <parameter name="to">developer-1</parameter>
  <parameter name="summary">Finalize fixes</parameter>
  <parameter name="message">All evaluators have broadcast verdicts. Finish any remaining findings in your scope, run validation, and return your finding→commit mapping.</parameter>
</invoke>
<invoke name="SendMessage">
  <parameter name="to">developer-2</parameter>
  <parameter name="summary">Finalize fixes</parameter>
  <parameter name="message">All evaluators have broadcast verdicts. Finish any remaining findings in your scope, run validation, and return your finding→commit mapping.</parameter>
</invoke>
```

Wait for every developer to return. Each return lists finding labels → commit SHAs; match each label to the `[Review fix]` task you created for it and `TaskUpdate` that task to `completed` yourself. Collect any findings left unresolved. After all developers have returned, run the plan's full validation across the workspace; if it fails, `TaskCreate` new `[Review fix]` tasks for each failure and return to **4.1 Coherence Routing** (re-dispatching as needed) before continuing.

Read the `VERDICT:` line from each evaluator's broadcast. The decision is determined by their verdicts, not your assessment of the findings:

- **All APPROVED**: Proceed to **6. Tear Down Team**.
- **Any CHANGES_REQUESTED**: Send a re-evaluation trigger to each evaluator dispatched in §3.2, including the aggregated mapping so each evaluator can verify the fix that addressed its findings:

  ```xml
  <invoke name="SendMessage">
    <parameter name="to">failure-mode</parameter>
    <parameter name="summary">Fixes applied — re-evaluate</parameter>
    <parameter name="message">
  The developers have applied fixes and revalidated. Re-evaluate based on your prior findings.

  Finding → commit mapping (aggregated across developers):
  [paste the aggregated mapping, keyed by finding label]
    </parameter>
  </invoke>
  ```

  Send the same trigger to `experience-evaluator` if dispatched. Clear the developer registry — every prior developer has returned — and return to **4. Stream Findings to Developers**. New findings in the next round will dispatch fresh developers via §4.1.

- **BLOCKED** (any developer's return names a task it could not fix, or an external constraint prevents addressing a `CHANGES_REQUESTED` finding): Document the constraint and the specific finding in a comment, add `blocked` tag, commit. Complete **6. Tear Down Team**, then **STOP**.

You may not override a reviewer's verdict, reclassify a finding as a "limitation" or "follow-up," or document it as a known issue in lieu of fixing it. Approval is the reviewers' call.

## 6. Tear Down Team

```xml
<invoke name="TeamDelete" />
```

Based on Step 5 outcome:
- **BLOCKED**: **STOP**.
- **All APPROVED**: Proceed to **7. Finalize**.

## 7. Finalize

Only enter this step when every reviewer broadcast `VERDICT: APPROVED` in **5. Read Verdicts and Decide**. Do not modify gates in `CARD.meta.json`.

</instructions>
