---
name: card-assess-plan
description: Assess implementation plan quality using structural and strategic evaluators.
---


<instructions>

## 1. Launch Assessment Subagents

Launch both assessments in parallel (one message):

```xml
<invoke name="Task">
  <parameter name="description">Structural Assessment</parameter>
  <parameter name="subagent_type">runtime:card:plan-assessor</parameter>
  <parameter name="model">haiku</parameter>
  <parameter name="prompt">
Assess plan structural compliance.

## Card Repository
!` echo $CARD_REPO_PATH`

## Workspace
!` echo $WORKSPACE_PATH`

Read the plan from PLAN.md in the card repository. Assess the plan and post a report per your instructions.
</parameter>
</invoke>

<invoke name="Task">
  <parameter name="description">Strategic Assessment</parameter>
  <parameter name="subagent_type">runtime:card:plan-refactor</parameter>
  <parameter name="model">opus</parameter>
  <parameter name="prompt">
Evaluate plan design and completeness.

## Card Repository
!` echo $CARD_REPO_PATH`

## Workspace
!` echo $WORKSPACE_PATH`

1. Read the plan from PLAN.md in the card repository.
2. Verify plan claims against workspace source files (callers, consumers, producers, imports).
3. Assess the plan and post a report per your instructions.
</parameter>
</invoke>
```

## 2. Collect Assessment Results

Use `TaskOutput` to retrieve results from the Structural Assessment and Strategic Assessment tasks launched above. Both results must be present before proceeding.

## 3. Interpret and Act

The assessor returns **"Ready for Implementation: Yes/No"** with issues categorized as CRITICAL/HIGH/MEDIUM/LOW. The refactor returns an **"Overall Assessment: READY/GAPS/RECONSIDER"**.

Apply the first matching condition:

1. **Assessor returns "No"**: Revise PLAN.md to address the structural issues, then return to **1. Launch Assessment Subagents** — structural issues must be fixed before design evaluation matters.
2. **Refactor returns RECONSIDER**: Revise PLAN.md to address the fundamental design findings, then return to **1. Launch Assessment Subagents**.
3. **Assessor returns "Yes" AND Refactor returns GAPS**: Incorporate the GAPS findings into PLAN.md, then return to **1. Launch Assessment Subagents** — gaps are missing specs and must be filled before implementation.
4. **Assessor returns "Yes" AND Refactor returns READY**: Proceed to the next step in the implementation workflow.

#### After Both Assessments Complete (Always)

1. **Resolve questions through research** — route empirically-testable uncertainties to spike investigation before revising
2. **Surface considerations visibly** as you work through them
3. **Track subjective decisions**: Collect design choices and judgment calls (not factual resolutions like "Is X compatible with Y?") for inclusion in the process comment. These help reviewers know where to focus.
4. **Incorporate process artifacts** from both assessors (judgment calls, surprises, uncertainty) into your reasoning — these inform the process comment in the implementation workflow.
5. **Make decisions** for non-blocking issues and document them in the plan revision
6. **Only ask the user** for blocking issues or intent clarity

#### If Revision Required (Condition 1 or 2)

Revise PLAN.md per findings above, then re-run **1. Launch Assessment Subagents**.

```bash
cd $CARD_REPO_PATH
# Assessment failed — revise PLAN.md per findings above, then re-run section 1. Launch Assessment Subagents
```

#### If Assessor Passes with GAPS (Condition 3)

Revise PLAN.md to incorporate the GAPS findings, then re-run **1. Launch Assessment Subagents**.

```bash
cd $CARD_REPO_PATH
# GAPS found — incorporate findings into PLAN.md, then re-run section 1. Launch Assessment Subagents
```

</instructions>
