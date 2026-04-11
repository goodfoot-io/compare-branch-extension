---
name: card-implementation-evaluation
description: Dispatch failure-mode subagents and decide whether the implementation is ready to proceed.
---


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

**On any failure:** Create todos with "[Pre-eval fix]" prefix from all validation failures. **Delegate them — do not implement directly.** Return to Step 2.2 of `runtime:card-implementation-with-plan` skill, then assess and delegate the new todos to a developer agent via Steps 2.3–2.4. After fixes, return to Step 1.

Only proceed to **3. Dispatch Subagents** when ALL validations pass.

## 3. Dispatch Subagents

Diff the workspace against the baseline to see the full scope of changes. Select depth based on the number of changed files, types of changes, and runtime risk signals:

| Depth | What runs |
|-------|-----------|
| Standard | One `failure-mode` subagent |
| Deep | One `failure-mode` subagent + one `experience-evaluator` subagent |

Use deep when the implementation touches many files, introduces new API boundaries, modifies shared state, adds significant async or error-path logic, or makes substantial changes to user-facing behavior.

### Standard

Spawn one failure-mode subagent in background mode:

```xml
<invoke name="Agent">
<parameter name="description">Failure mode analysis</parameter>
<parameter name="subagent_type">runtime:card:failure-mode</parameter>
<parameter name="model">opus</parameter>
<parameter name="name">failure-mode</parameter>
<parameter name="run_in_background">true</parameter>
<parameter name="prompt">
Identify potential failure modes in this implementation.

## Card Repository
[CARD_REPO_PATH]

## Workspace
[WORKSPACE_PATH]

## Baseline
Changes are relative to git tag: `implement/[CARD_ID]/baseline`

Diff the workspace against the baseline to identify changed files. Read every changed file, then search the workspace for consumers of every symbol, type, and file the implementation modifies. Return your findings.

Also evaluate the implementation from the user's perspective: enter at the user-facing surfaces and identify what a user would experience as broken, wrong, or missing relative to what the card requires. Look for intent drift, wrong outcomes that technically-correct code produces, and user-facing scenarios the implementation doesn't handle.
</parameter>
</invoke>
```

### Deep

Before writing either prompt, read the diff and the card. Each prompt must reflect the specific nature of this implementation and this card.

Spawn both agents in parallel in background mode:

```xml
<invoke name="Agent">
<parameter name="description">Failure mode analysis</parameter>
<parameter name="subagent_type">runtime:card:failure-mode</parameter>
<parameter name="model">opus</parameter>
<parameter name="name">failure-mode</parameter>
<parameter name="run_in_background">true</parameter>
<parameter name="prompt">
Identify potential failure modes in this implementation.

## Card Repository
[CARD_REPO_PATH]

## Workspace
[WORKSPACE_PATH]

## Baseline
Changes are relative to git tag: `implement/[CARD_ID]/baseline`

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
<parameter name="run_in_background">true</parameter>
<parameter name="prompt">
Evaluate whether this implementation delivers the user experience the card requires.

## Card Repository
[CARD_REPO_PATH]

## Workspace
[WORKSPACE_PATH]

## Baseline
Changes are relative to git tag: `implement/[CARD_ID]/baseline`

[Translate the card's requirements into user scenarios this implementation must satisfy:
- The specific acceptance criteria to verify
- The user-facing entry points — the surfaces, endpoints, or interactions a user encounters with this feature
- What a user testing against the card should do and what they should observe

Write this from what you found in the card, not as a generic description.]
</parameter>
</invoke>
```

## 5. Read Findings and Decide

After all subagents return, read their output. Decide:

- **APPROVED**: No blocking findings — proceed to Step 6.
- **CHANGES_REQUESTED**: Findings require fixes — go to Step 5.1.
- **BLOCKED**: External constraints prevent completion — document in comment, add `blocked` tag, commit, **STOP**.

When deciding, apply the same bar a maintainer would: broken wiring, contract drift, unmet requirements, unsafe defaults, and missing behavioral coverage require fixes. Nits and style observations do not block.

### 5.1 Address Changes

For each finding:
- **Viable**: Create a todo with "[Review fix]" prefix. **Delegate — do not implement directly.** Return to Step 2.2 of `runtime:card-implementation-with-plan` skill, then assess and delegate via Steps 2.3–2.4.
- **Not viable**: Note the reason (e.g., attempted but introduced a regression, rejected during planning, blocked by an external constraint).

After all fixes are delegated and complete, stage and re-validate:

```bash
git add -A
git diff --cached --quiet || git commit -m "$(cat <<'COMMITMSG'
[commit message per <workspace-commit-style>; fragment-link every named file, function, and type per <markdown-guidelines> — describe the uncommitted changes]
COMMITMSG
)"
```

Run validation per the plan's validation commands. On failure, delegate fixes (same as Step 2), then stage and re-validate.

Once validation passes, send each agent a message. Each agent retains its prior findings and knows how to triage them — the message should deliver what only the orchestrator knows. Compose each message separately; do not route one agent's findings through the other.

**failure-mode**: Deliver the code-level fix context:
- Which findings were addressed and by which fix commits — map each `[Review fix]` todo to the finding it targeted, so the agent can verify root-cause resolution rather than just symptom disappearance
- Which findings were not addressed, and why
- That the fix commits are new implementation scope requiring the same §3 scrutiny as the original change — fixes introduce their own silent errors, type escape hatches, and consumer blindness
- Which runtime paths to execute for each addressed finding — reading the fix is not sufficient

**experience-evaluator**: Deliver the user-experience fix context:
- Which user-experience gaps were addressed, described in terms of what the user should now experience — not what code changed, but what the user encounters differently
- Which gaps were not addressed and why
- Which acceptance criteria to re-verify and which user entry points to re-exercise
- Any new user-facing behavior the fix introduced that was not present in the original implementation

Wait for all agents to return, then read their findings and decide again.

## 6. Finalize

Proceed to the next step in the implementation workflow. Do not modify gates in `CARD.meta.json`.

</instructions>
