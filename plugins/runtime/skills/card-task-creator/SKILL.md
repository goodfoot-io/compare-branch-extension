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
subject: "[PLAN_PATH] § [SECTION_HEADING]"
status: pending
description: |
  [SHORT_IMPERATIVE_SUMMARY]

  From `[PLAN_PATH]`:
  - [SECTION_HEADING] (lines [LINE_START]–[LINE_END])

  Plan commit `[PLAN_COMMIT_SHA]`. Layer [PLAN_ORDER] ([committed | active]).
blocks: ["1"]
```

`subject` is the identity key — an exact `[PLAN_PATH] § [FIRST_SECTION_HEADING]` string. When a sub-task covers multiple sections of one plan file, the first section is the identity anchor; add additional sections as more bullets under the description's section list. The plan commit records the card-repo commit that last modified the plan file. Layer is the layering index (`0` is the oldest plan file). Layer state is `committed` when workspace commits or a `mergeRequestApproval` record already represent this layer's work, or `active` when this layer is the current implementation target.

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

For an active-layer plan section, verify:

- **Files the section creates**: exist on disk
- **Files the section deletes**: absent from disk
- **Files the section modifies**: contain identifiers newly introduced by this layer (grep)

Extract identifiers from a plan layer by reading its markdown text and collecting every symbol appearing in fenced code blocks or in inline backticks. Compute the active layer's identifier set minus the union of every prior committed layer's identifier set — the remainder is "newly introduced." Bare on-disk presence of an identifier is not evidence, since an overlapping older layer may already have produced it.

## 5. Writing Rules

- **Seed macros before sub-tasks.** Macros must exist with known IDs before any sub-task is created, so sub-task `blocks` can reference the Implementation macro.
- **`subject` is the sub-task identity key.** Match existing sub-tasks by exact `subject` string before creating duplicates:
  - **Plan-derived**: `subject` is `[PLAN_PATH] § [FIRST_SECTION_HEADING]`.
  - **Feedback-derived**: `subject` is `[FEEDBACK_PATH]`.
- **Treat `completed` tasks as immutable except on reopen.** Do not re-check, re-wire, or delete a task whose status is `completed`. A macro whose `blockedBy` gains a non-completed child is reopened: transition it and every downstream macro in the chain to `pending`. The chain is Implementation → Validation → Evaluation → Stage → Merge as wired by the seeded `addBlocks` relationships.

</card-task-schema>

<instructions>

## 1. Read State

- Enumerate plan files in `$CARD_REPO_PATH/plan/`. For each, capture its path and its last-modifying card-repo commit SHA and timestamp.
- Order plan files by commit timestamp, oldest first.
- Read the card-repo commit log and any `mergeRequestApproval` records.
- Read the workspace commit log. Capture the current workspace HEAD SHA as `[WORKSPACE_HEAD]`.
- List feedback artifacts in the card repo that arrived after the most recent plan commit.
- Call `TaskList` to collect existing task subjects, statuses, and IDs.
- Read `$CARD_REPO_PATH/notes/task-creator-last-reconciled-head.md` to retrieve `[LAST_RECONCILED_HEAD]`, if the file exists.

## 2. Classify Plan Layers

Assign each plan file a status:

- **Committed**: a `mergeRequestApproval` record references this plan, or workspace commits fall within this plan's implementation window (between its card-repo commit and the next plan's card-repo commit).
- **Active**: the newest plan whose implementation window is still open. At most one plan is Active.

## 3. Seed Macro Tasks

Match existing macros by `subject`. For each of `Implementation`, `Validation`, `Evaluation`, `Stage`, `Merge` that does not exist, `TaskCreate` it using the description from `<card-task-schema>`.

Wire macros with `addBlocks` in order: `Implementation` → `Validation` → `Evaluation` → `Stage` → `Merge`. Skip wiring that already matches.

Record the Implementation macro's ID for use in Step 4: Seed Plan-Derived Sub-Tasks and Step 5: Seed Feedback-Derived Sub-Tasks.

After wiring sub-tasks in Steps 4 and 5, `TaskUpdate` any `completed` macro whose `blockedBy` now includes a non-completed sub-task back to `pending`. Also transition every macro downstream of it in the chain to `pending`.

## 4. Seed Plan-Derived Sub-Tasks

For each plan file, walk each top-level `##` heading after the plan overview in layering order. For each heading, compute the identity `subject` per `<card-task-schema>` — `[PLAN_PATH] § [FIRST_SECTION_HEADING]`. Then:

- **Subject matches an existing task with status `deleted`**: `TaskUpdate` it to `pending` — the plan section has been restored.
- **Subject matches an existing task**: leave the task in place.
- **No match**: `TaskCreate` with the plan-derived format from `<card-task-schema>`. Set `blocks` to the Implementation macro's ID. Carry the plan file's layer status (`committed` or `active`) into the description.

## 5. Seed Feedback-Derived Sub-Tasks

For each feedback artifact from Step 1: Read State, the identity `subject` is `[FEEDBACK_PATH]`. Then:

- **Subject matches an existing task**: leave the task in place.
- **No match**: `TaskCreate` with the feedback-derived format from `<card-task-schema>`. Set `blocks` to the Implementation macro's ID.

## 6. Reconcile Sub-Task Status

For each plan-derived sub-task whose status is not `completed`:

- **Layer status `committed`**: `TaskUpdate` status to `completed`.
- **Layer status `active` and `[WORKSPACE_HEAD]` equals `[LAST_RECONCILED_HEAD]`**: skip the identifier check — workspace state is unchanged since the last reconciliation.
- **Layer status `active` and `[WORKSPACE_HEAD]` differs from `[LAST_RECONCILED_HEAD]`**: Run the identifier check per `<card-task-schema>` on the sub-task's plan section.
  - **Check passes**: `TaskUpdate` status to `completed`.
  - **Otherwise**: leave status unchanged.

Feedback-derived sub-tasks: leave status unchanged.

After reconciliation, follow the `<take-notes>` instructions to write `[WORKSPACE_HEAD]` to a note with slug `task-creator-last-reconciled-head`. This note is a skip-optimization for the next run's identifier check — it is not a source of truth for implementation progress.

## 7. Prune Revised References

For each sub-task whose status is not `completed` and whose source no longer resolves in the card repo: `TaskUpdate` with `status: deleted`.

A source "no longer resolves" when a plan-derived sub-task's `subject` (`[PLAN_PATH] § [FIRST_SECTION_HEADING]`) does not match any current plan file's section, or when a feedback-derived sub-task's `subject` (`[FEEDBACK_PATH]`) is absent from the card repo.

</instructions>
