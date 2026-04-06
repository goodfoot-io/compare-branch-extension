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
[commit message per <workspace-commit-style> — describe the uncommitted changes]
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
| Deep | Multiple `failure-mode` subagents, each scoped to a different area |

Use deep when the implementation touches many files, introduces new API boundaries, modifies shared state, or adds significant async or error-path logic.

### Standard

Spawn one failure-mode subagent:

```xml
<invoke name="Agent">
<parameter name="description">Failure mode analysis</parameter>
<parameter name="subagent_type">runtime:card:failure-mode</parameter>
<parameter name="model">opus</parameter>
<parameter name="prompt">
Identify potential failure modes in this implementation.

## Card Repository
[CARD_REPO_PATH]

## Workspace
[WORKSPACE_PATH]

## Baseline
Changes are relative to git tag: `implement/[CARD_ID]/baseline`

Diff the workspace against the baseline to identify changed files. Read every changed file, then search the workspace for consumers of every symbol, type, and file the implementation modifies. Return your findings.
</parameter>
</invoke>
```

### Deep

Spawn multiple failure-mode subagents in parallel, each with a focused scope:

```xml
<invoke name="Agent">
<parameter name="description">Failure mode analysis — data flow and multi-file impact</parameter>
<parameter name="subagent_type">runtime:card:failure-mode</parameter>
<parameter name="model">opus</parameter>
<parameter name="prompt">
Identify potential failure modes in this implementation. Focus on data-flow gaps and multi-file impact.

## Card Repository
[CARD_REPO_PATH]

## Workspace
[WORKSPACE_PATH]

## Baseline
Changes are relative to git tag: `implement/[CARD_ID]/baseline`

Diff the workspace against the baseline to identify changed files. Read every changed file, then search the workspace for consumers of every symbol, type, and file the implementation modifies. Return your findings.
</parameter>
<parameter name="run_in_background">true</parameter>
</invoke>
<invoke name="Agent">
<parameter name="description">Failure mode analysis — error paths and async hazards</parameter>
<parameter name="subagent_type">runtime:card:failure-mode</parameter>
<parameter name="model">opus</parameter>
<parameter name="prompt">
Identify potential failure modes in this implementation. Focus on error paths, silent error conversion, and async hazards.

## Card Repository
[CARD_REPO_PATH]

## Workspace
[WORKSPACE_PATH]

## Baseline
Changes are relative to git tag: `implement/[CARD_ID]/baseline`

Diff the workspace against the baseline to identify changed files. Read every changed file, then search the workspace for consumers of every symbol, type, and file the implementation modifies. Return your findings.
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
[commit message per <workspace-commit-style> — describe the uncommitted changes]
COMMITMSG
)"
```

Run validation per the plan's validation commands. On failure, delegate fixes (same as Step 2), then stage and re-validate.

Return to Step 3 to re-dispatch subagents.

## 6. Finalize

Proceed to the next step in the implementation workflow. Do not modify gates in `CARD.meta.json`.

</instructions>
