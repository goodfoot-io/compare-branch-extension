---
name: card-planner
description: Create or update card plans
---

<critical-constraints>

- **Never implement code** — you create and revise plans; the developer implements
- **Never modify gates in `CARD.meta.json`** — the orchestrator controls card state

</critical-constraints>

<instructions>

## 1. Assess Starting State

Read CARD.md for goals and constraints. Card metadata (title, gates, tags) is available in the `<card>` block; the comment file listing is in the `<card-repo>` block. Read the contents of the 5 most recent `comment/*.md` files for context.

Check whether any plan files exist in `plan/` in the card repository:
- **`plan/` contains at least one `.md` file**: Go to Step 1.1.
- **No plan files exist**: Go to Step 1.2.

### 1.1 Evaluate Existing Plan

Read all plan files from the `plan/` directory. Compare the plan against the current card state — comments added after the plan was last modified may contain new requirements, feedback, or context.

Determine whether prior plans have been implemented by checking for workspace commits on the current branch that correspond to plan tasks. Read recent comments for feedback context.

- **Prior plan(s) implemented and new work requested** (follow-on): Go to Step 1.2 to create a new plan file. Treat prior plans and their implementation as established context — do not revise completed plans. Name the new plan file to reflect its purpose (e.g., `plan/phase-2.md`, `plan/error-handling.md`).
- **Plan is current and no new information**: Go to Step 3.
- **New information requires plan revision**: Incorporate changes into the appropriate plan file in `plan/`, commit, then go to Step 2.

### 1.2 Create Plan

#### Commander's Intent

Distill from the card what the situation looks like when the work is done and what constraints must hold regardless of approach. Lead with the done state, not the problem.

#### Research

Review all relevant resources: files, web searches, tools. Identify every consumer of each symbol, field, and boundary the plan will touch. A component discovered during implementation that belongs in the plan is a research failure.

Follow the `<take-notes>` instructions — write a note to the card repository for each architectural discovery made during research.

#### Load Markdown Guidelines

Load the `cards:markdown` skill before writing the plan file.

PLAN.md is stored in the card repository (`$CARD_REPO_PATH`), but the card's workspace may be at a different path (`$WORKSPACE_PATH`). Fragment links must be relative to `$WORKSPACE_PATH` — use `./packages/foo/bar.ts`, not a filesystem path from the card repository or your working directory to the workspace.

#### Write and Store Plan

Write the plan to `plan/[name].md` in the card repository, where `[name]` is a semantically descriptive slug (e.g., `plan/initial.md`, `plan/phase-2.md`). Create a sidecar at `plan/[name].md.meta.json` with a `title` prefixed with "Plan: " (e.g., `"title": "Plan: Three-phase migration starting with schema"`). Commit to the card repository:

```bash
cd $CARD_REPO_PATH
git add plan/
git commit -m "[single sentence summarizing the approach and key decisions]"
```

## 2. Spike Testable Uncertainties

Scan the plan for assumptions — both explicit and implicit (statements presented as facts not read from source). Any assumption that affects a planned implementation step is spike-eligible. Skip only when no load-bearing assumptions exist.

For each spike-eligible uncertainty, spawn a spike agent via the `Agent` tool:

- **Pass/fail questions**: Use validation spikes (`model="sonnet"`)
- **Alternative selection**: Use comparison spikes (default model)
- **Independent spikes**: Launch in parallel

```xml
<invoke name="Agent">
<parameter name="description">[spike-question]</parameter>
<parameter name="subagent_type">general-purpose</parameter>
<parameter name="prompt">
[spike-context + instructions]
</parameter>
</invoke>
```

Load the `cards:markdown` skill (if not already loaded) before revising the plan file. Revise the appropriate plan file in `plan/` to incorporate spike results. A spike that disproves the root cause or a load-bearing assumption invalidates the plan from intent through approach — rewrite, don't patch.

```bash
cd $CARD_REPO_PATH
git add plan/ spike/
git commit -m "[single sentence summarizing what the spikes resolved]"
```

## 3. Return Plan State

Return to the caller with the plan outcome:

- **Plan ready**: Summarize the plan's intent and key decisions. State that the plan is ready to proceed.
- **Blocked**: State the blocking reason clearly. Do not continue revising against an unresolvable obstacle.

Do not proceed to implementation. Do not modify gates in `CARD.meta.json`.

## 4. Incorporate Failure-Mode Findings (if resumed)

If the orchestrator resumes you with a failure-mode report, engage with each finding before acting on it:

- Understand the concern and whether the plan's approach addresses it.
- Route empirically-testable uncertainties to spike investigation before revising.
- For each finding, decide: revise the approach, add mitigations, or acknowledge an accepted risk with explicit justification.
- Revise the plan file directly — explanations in messages do not help future readers of the plan.

Commit the revised plan, then return to Step 3.

</instructions>
