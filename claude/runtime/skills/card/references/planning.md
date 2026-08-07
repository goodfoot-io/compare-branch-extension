# Planning Procedure

Shared procedure for creating an implementation plan from a card. Loaded by `./plan.md` for tier 2 self-planning and by the `runtime:card-planner` subagent in tiers 3–4.

<placeholder-variables>
[PLAN_FILE] — The plan file path relative to the card repository root (e.g., `plans/initial.md` for self-planning, `plans/[AGENT_NAME].md` for a contest planner subagent)
[CARD_REPO_PATH] — Absolute path to the card repository
[WORKSPACE_PATH] — Absolute path to the card's workspace worktree
</placeholder-variables>

<instructions>

## 1. Assess Starting State

Read `CARD.md` for goals and constraints. Read CARD.meta.json for current `title`, `gates`, and `tags`. Read the contents of the 5 most recent `comments/*.md` files for context.

Check whether any plan files exist in `plans/` in the card repository:

- **`plans/` contains at least one `.md` file**: Go to Step 1.1.
- **No plan files exist**: Go to Step 1.2.

### 1.1 Evaluate Existing Plans

Read all plan files from the `plans/` directory. Compare the plans against the current card state — comments added after a plan was last modified may contain new requirements, feedback, or context.

Determine whether prior plans have been implemented by checking for workspace commits on the current branch that correspond to plan tasks.

- **Prior plan(s) implemented and new work requested** (follow-on): Go to Step 1.2 to create a new plan file. Treat prior plans and their implementation as established context — do not revise completed plans.
- **Plan is current and no new information**: If operating as a subagent (tier 3–4), return to the parent `card-planner` skill's Step 3 (DM Plan State); if operating inline (tier 2), return to the caller's next step. This procedure has no Step 3 of its own.
- **New information requires plan revision**: Incorporate changes into `[PLAN_FILE]`, commit, then go to Step 2.

### 1.2 Create Plan

#### Commander's Intent

Distill from the card what the situation looks like when the work is done and what constraints must hold regardless of approach. Lead with the done state, not the problem.

#### Research

Review all relevant resources: files, web searches, tools. Identify every consumer of each symbol, field, and boundary the plan will touch. A component discovered during implementation that belongs in the plan is a research failure. When the plan writes to or depends on another system's files or protocol, read that system's source at the deployed version: check for a native mechanism first; record the invariants it enforces.

When correctness depends on the shape of real-world data the plan will process (live payloads, environment-injected values, file formats), capture a real sample **now** and commit it as a fixture in the card repo's `notes/`. A coverage claim without a fixture is an unverified assumption for Step 2.

Follow the `<take-notes>` instructions from `cards:notes` skill — write a note to the card repository for each architectural discovery made during research.

#### Apply Markdown Guidelines

When writing the plan file, fragment-link every named file, function, and type per `<markdown-guidelines>`. Use mermaid diagrams for multi-component interactions, state transitions, and data flows. Use fenced code blocks with language tags for configuration and code examples.

The plan file is stored in the card repository (`$CARD_REPO_PATH`), but the card's workspace may be at a different path (`$WORKSPACE_PATH`). Fragment links must be relative to `$WORKSPACE_PATH` — use `./packages/foo/bar.ts`, not a filesystem path from the card repository or your working directory to the workspace.

#### Consider Bootstrap Sequencing

When the card introduces new behavior whose contract is worth validating ahead of implementation — a new public function, API, data type, schema, or algorithm — **you must consult the `<tdd-bootstrap>` instructions** from the `runtime:tdd-bootstrap` skill and structure the plan's implementation steps along the three phases. Skip the bootstrap for refactors, spikes, UI or visual work, glue code, one-shot scripts, framework-determined shapes, and small in-place edits.

#### Write and Store Plan

Write the plan to `[PLAN_FILE]` in the card repository. Before committing, re-verify every file, line, symbol, and behavior claim the plan makes against current source — read or grep each one; do not trust your earlier research pass.

Create a sidecar at `[PLAN_FILE].meta.json` with a `title` prefixed with `"Plan: "` followed by a description of at most ten words (e.g., `"title": "Plan: Three-phase migration starting with schema"`). Commit to the card repository:

```bash
cd $CARD_REPO_PATH
git add plans/
git commit -m "[single sentence summarizing the approach and key decisions]"
```

## 2. Investigate Testable Uncertainties

Scan the plan for assumptions — both explicit and implicit (statements presented as facts not read from source — including CARD.md claims about third-party behavior). Any assumption that affects a planned implementation step warrants investigation; spike it per the procedure below. Load-bearing assumptions are work items for this step, not questions to surface to the user as a choice — converting a spike into an (a)/(b) prompt is a protocol violation. Skip only when no load-bearing assumptions exist.

For each testable uncertainty, load the `runtime:spike` skill and follow its instructions. That skill owns spike classification (comparison vs. validation), subagent invocation, artifact layout, quality checks, and the commit flow.

After spikes return, revise `[PLAN_FILE]` to incorporate their results — a spike that disproves a load-bearing assumption invalidates the plan from intent through approach, so rewrite rather than patch.

</instructions>
