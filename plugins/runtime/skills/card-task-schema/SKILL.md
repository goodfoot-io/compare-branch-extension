---
name: card-task-schema
description: Task graph schema for card implementation — macro phases and sub-task shapes.
---

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
