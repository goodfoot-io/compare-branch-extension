---
name: card-task-creator
description: Seed and reconcile the card's task graph from plan files and feedback artifacts.
---

<constraints>
The task list is the primary artifact. Use `cards:notes` for observations that help a future run; do not post comments or write other files.

Idempotent — safe to run at every orchestrator entry. Match existing tasks by `subject` before creating new ones.

Treat `completed` tasks as immutable except on reopen: a macro whose `blockedBy` gains a non-completed child must be transitioned back to `pending`, along with every downstream macro in the chain.

Never skip an older plan file. Layering is additive.

Do not verify committed plan layers against the workspace. The commit log and `mergeRequestApproval` records are authoritative.
</constraints>

<instructions>

## 1. Read State

- Enumerate plan files in `$CARD_REPO_PATH/plan/`. For each, capture its path and its last-modifying card-repo commit SHA and timestamp.
- Order plan files by commit timestamp, oldest first.
- Read the card-repo commit log and any `mergeRequestApproval` records.
- Read the workspace commit log. Capture the current workspace HEAD SHA as `[WORKSPACE_HEAD]`.
- List feedback artifacts in the card repo that arrived after the most recent plan commit.
- Call `TaskList` to collect existing task subjects, statuses, and IDs.
- Read the task-creator note via `cards:notes` (key `task-creator-last-reconciled-head`) to retrieve `[LAST_RECONCILED_HEAD]`, if any.

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

After reconciliation, write `[WORKSPACE_HEAD]` to `cards:notes` key `task-creator-last-reconciled-head`. This note is a skip-optimization for the next run's identifier check — it is not a source of truth for implementation progress.

## 7. Prune Revised References

For each sub-task whose status is not `completed` and whose source no longer resolves in the card repo: `TaskUpdate` with `status: deleted`.

A source "no longer resolves" when a plan-derived sub-task's `subject` (`[PLAN_PATH] § [FIRST_SECTION_HEADING]`) does not match any current plan file's section, or when a feedback-derived sub-task's `subject` (`[FEEDBACK_PATH]`) is absent from the card repo.

</instructions>
