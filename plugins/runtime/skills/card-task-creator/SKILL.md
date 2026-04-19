---
name: card-task-creator
description: Seed and reconcile the card's task graph from plan files and feedback artifacts.
---

<constraints>
The task list is the primary artifact. Follow the `<take-notes>` instructions for observations that help a future run; do not post comments or write other files.

Idempotent — safe to run at every card-plan re-entry. Match existing tasks by `subject` before creating new ones.

Treat `completed` tasks as immutable except on reopen: a macro whose `blockedBy` gains a non-completed child must be transitioned back to `pending`, along with every downstream macro in the chain.

Never skip an older plan file. Layering is additive.

Do not verify committed plan layers against the workspace. The commit log and `mergeRequestApproval` records are authoritative.
</constraints>


<card-task-schema>

## 1. Macro Tasks

Five fixed macros drive the card through implementation to merge. Macros are identified by `subject` and chained via `addBlocks` in the order below.

```yaml
- id: "1"
  subject: Implementation
  status: pending
  description: |
    Collector for implementation sub-tasks. Mark completed after every sub-task in `blockedBy` reaches completed.
  blocks: ["2"]

- id: "2"
  subject: Validation
  status: pending
  description: |
    Run the validation commands declared in the plan's validation section. Block on failure.
  blockedBy: ["1"]
  blocks: ["3"]

- id: "3"
  subject: Evaluation
  status: pending
  description: |
    Load `runtime:card-implementation-evaluation` and follow its instructions.
  blockedBy: ["2"]
  blocks: ["4"]

- id: "4"
  subject: Stage
  status: pending
  description: |
    Stage and commit any remaining implementation artifacts.
  blockedBy: ["3"]
  blocks: ["5"]

- id: "5"
  subject: Merge
  status: pending
  description: |
    Load `runtime:card-merge` and follow its instructions. Gated on `gates.mergeRequestRequired`.
  blockedBy: ["4"]
```

## 2. Plan-Derived Sub-Tasks

Sub-tasks sourced from plan files. Every plan-derived sub-task is wired into the Implementation macro via `addBlockedBy`, so `blocks: ["1"]` always appears.

```yaml
id: "[TASK_ID]"
subject: "[PLAN_STEM] § [TASK_SLUG]"
status: pending
description: |
  [SHORT_IMPERATIVE_SUMMARY]

  From `[PLAN_PATH]`:
  - [SECTION_HEADING] (lines [LINE_START]–[LINE_END])
  [additional section bullets if the sub-task spans multiple sections]

  Plan commit `[PLAN_COMMIT_SHA]`. Layer [PLAN_ORDER] ([committed | active]).
blockedBy: ["[PREREQUISITE_TASK_ID]", ...]
blocks: ["1"]
```

`subject` is the identity key — `[PLAN_STEM] § [TASK_SLUG]`. `[PLAN_STEM]` is the plan file's basename without extension (e.g. `plan/initial.md` → `initial`). `[TASK_SLUG]` is a stable, semantic slug chosen for this unit of work (e.g., `flip-agentid-type`, `literal-replacements`, `test-updates`). Re-use the slug across plan revisions when the same unit of work persists — the slug is the matching key, not the heading text. A sub-task may cover any number of plan sections; list each covered section as a bullet in the description.

`blockedBy` lists other sub-task IDs that must complete before this one. Peer sub-tasks that share no `blockedBy` edge are parallelizable at dispatch time; encode parallelism only through the absence of dependency edges, not through any other field.

The plan commit records the card-repo commit that last modified the plan file. Layer is the layering index (`0` is the oldest plan file). Layer state is `committed` when workspace commits or a `mergeRequestApproval` record already represent this layer's work, or `active` when this layer is the current implementation target.

## 3. Feedback-Derived Sub-Tasks

Sub-tasks sourced from user feedback artifacts that have not been promoted to a plan file. Every feedback-derived sub-task is wired into the Implementation macro via `addBlockedBy`, so `blocks: ["1"]` always appears.

```yaml
id: "[TASK_ID]"
subject: "[FEEDBACK_PATH]"
status: pending
description: |
  [SHORT_IMPERATIVE_SUMMARY]

  From `[FEEDBACK_PATH]` (commit `[FEEDBACK_COMMIT_SHA]`).
blocks: ["1"]
```

## 4. Identifier Check

For an active-layer sub-task, verify across every plan section the sub-task covers:

- **Files the covered sections create**: exist on disk
- **Files the covered sections delete**: absent from disk
- **Files the covered sections modify**: contain identifiers newly introduced by this layer (grep)

Extract identifiers from a plan layer by reading its markdown text and collecting every symbol appearing in fenced code blocks or in inline backticks. Compute the active layer's identifier set minus the union of every prior committed layer's identifier set — the remainder is "newly introduced." Bare on-disk presence of an identifier is not evidence, since an overlapping older layer may already have produced it.

## 5. Writing Rules

- **Seed macros before sub-tasks.** Macros must exist with known IDs before any sub-task is created, so sub-task `blocks` can reference the Implementation macro.
- **Batch creation, then batch wiring.** In each seeding step, issue all `TaskCreate` calls in a single parallel message, then issue all `TaskUpdate` dependency-wiring calls in a second parallel message. Never interleave creation and wiring calls.
- **`subject` is the sub-task identity key.** Match existing sub-tasks by exact `subject` string before creating duplicates:
  - **Plan-derived**: `subject` is `[PLAN_STEM] § [TASK_SLUG]`.
  - **Feedback-derived**: `subject` is `[FEEDBACK_PATH]`.
- **Treat `completed` tasks as immutable except on reopen.** Do not re-check, re-wire, or delete a task whose status is `completed`. A macro whose `blockedBy` gains a non-completed child is reopened: transition it and every downstream macro in the chain to `pending`. The chain is Implementation → Validation → Evaluation → Stage → Merge as wired by the seeded `addBlocks` relationships.

</card-task-schema>

<instructions>

## 1. Read State

Gather the state:

- For each plan file under `$CARD_REPO_PATH/plan/`, capture its last-modifying card-repo commit SHA and timestamp — layering orders by timestamp, oldest first:

  ```bash
  git -C "$CARD_REPO_PATH" log -1 --format="%H %ct" -- plan/[file].md
  ```

- Read any `mergeRequestApproval` records in the card repo — §2 classifies a layer as committed when a record references its plan.
- Read the workspace commit log. Capture the current workspace HEAD SHA as `[WORKSPACE_HEAD]`.
- List feedback artifacts in the card repo whose commit timestamp is later than the most recent plan commit — these are candidates for §5: Seed Feedback-Derived Sub-Tasks. Comments already in context from the planning run that predate the newest plan commit were incorporated into plan revisions and are not feedback-derived.
- Call `TaskList` to collect existing task subjects, statuses, and IDs.
- Read `$CARD_REPO_PATH/notes/task-creator-last-reconciled-head.md` to retrieve `[LAST_RECONCILED_HEAD]`, if the file exists.

## 2. Classify Plan Layers

Assign each plan file a status:

- **Committed**: a `mergeRequestApproval` record references this plan, or workspace commits fall within this plan's implementation window (between its card-repo commit and the next plan's card-repo commit).
- **Active**: the newest plan whose implementation window is still open. At most one plan is Active.

## 3. Seed Macro Tasks

Match existing macros by `subject`. In a single parallel message, `TaskCreate` every macro among `Implementation`, `Validation`, `Evaluation`, `Stage`, `Merge` that does not yet exist. Then in a second parallel message, `TaskUpdate` all wiring via `addBlocks` in order: `Implementation` → `Validation` → `Evaluation` → `Stage` → `Merge`. Skip wiring that already matches.

Record the Implementation macro's ID for use in Step 4: Seed Plan-Derived Sub-Tasks and Step 5: Seed Feedback-Derived Sub-Tasks.

After wiring sub-tasks in Steps 4 and 5, `TaskUpdate` any `completed` macro whose `blockedBy` now includes a non-completed sub-task back to `pending`. Also transition every macro downstream of it in the chain to `pending`.

## 4. Seed Plan-Derived Sub-Tasks

For each plan file in layering order, decompose the plan into a complete set of implementable sub-tasks. An implementable sub-task is one unit of work assignable to a single developer agent in one dispatch — not a plan heading, a plan phase, or a file.

**Group by operation, not by plan structure.** Mechanical literal replacements spanning several plan sections are one sub-task. A type rename and its direct callers are one sub-task. Test updates that follow source changes are a separate sub-task from those source changes. Ancillary documentation is a separate sub-task from the surface it documents.

**Frame ordering with `blockedBy`.** When one sub-task must complete before another, record the prerequisite's ID in `blockedBy`. Peer sub-tasks that share no `blockedBy` edge are parallelizable — do not encode parallelism anywhere else.

**Pick stable semantic slugs.** The slug is the identity that persists across plan revisions. Re-use a prior round's slug when the same unit of work survives the revision; mint a new slug only when the unit is genuinely new. A lazy rename across rounds creates an orphan in Step 7: Prune Revised References.

Framing, constraints, rationale, risks, and validation are not sub-tasks — the Validation macro already covers validation.

Compute the identity `subject` for each sub-task per `<card-task-schema>` — `[PLAN_STEM] § [TASK_SLUG]`. Then, in a single parallel message, issue all `TaskCreate` and `TaskUpdate` status/description calls:

- **Subject matches an existing task with status `completed`**: leave untouched (immutable per §5 Writing Rules).
- **Subject matches an existing task with status `deleted`**: `TaskUpdate` status to `pending` and refresh `description` against the current breakdown.
- **Subject matches an existing task**: `TaskUpdate` `description` against the current breakdown; leave `status` unchanged.
- **No match**: `TaskCreate` with the plan-derived format from `<card-task-schema>`, carrying the plan file's layer status (`committed` or `active`) into the description.

After all tasks exist with known IDs, issue a second parallel message with `TaskUpdate` calls to wire every `addBlockedBy` (prerequisite sub-task IDs) and `addBlocks` (Implementation macro ID) relationship across all newly created and updated tasks.

## 5. Seed Feedback-Derived Sub-Tasks

For each feedback artifact from Step 1: Read State, the identity `subject` is `[FEEDBACK_PATH]`. In a single parallel message, `TaskCreate` every artifact that has no matching task. Then in a second parallel message, `TaskUpdate` all newly created tasks with `addBlocks` to the Implementation macro's ID. Skip artifacts whose subject already matches an existing task.

## 6. Reconcile Sub-Task Status

For each plan-derived sub-task whose status is not `completed`:

- **Layer status `committed`**: `TaskUpdate` status to `completed`.
- **Layer status `active` and `[WORKSPACE_HEAD]` equals `[LAST_RECONCILED_HEAD]`**: skip the identifier check — workspace state is unchanged since the last reconciliation.
- **Layer status `active` and `[WORKSPACE_HEAD]` differs from `[LAST_RECONCILED_HEAD]`**: Run the identifier check per `<card-task-schema>` across the sub-task's covered plan sections.
  - **Check passes**: `TaskUpdate` status to `completed`.
  - **Otherwise**: leave status unchanged.

Feedback-derived sub-tasks: leave status unchanged.

After reconciliation, follow the `<take-notes>` instructions to write `[WORKSPACE_HEAD]` to a note with slug `task-creator-last-reconciled-head`. This note is a skip-optimization for the next run's identifier check — it is not a source of truth for implementation progress.

## 7. Prune Revised References

For each sub-task whose status is not `completed` and whose source no longer resolves in the card repo: `TaskUpdate` with `status: deleted`.

A source "no longer resolves" when a plan-derived sub-task's `subject` (`[PLAN_STEM] § [TASK_SLUG]`) is not in the current breakdown for that plan file, or when a feedback-derived sub-task's `subject` (`[FEEDBACK_PATH]`) is absent from the card repo.

</instructions>
