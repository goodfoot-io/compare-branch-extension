---
name: issue-plan
description: Create and submit implementation plans with dual assessment. Use when [PLAN_REQUIRED] is true and [PLAN_APPROVED] is false.
---

<input-format>
Extract from issue data:

**Derived Fields:**
- [LATEST_USER_COMMENT] = Most recent comment from `author: "user"` (if any)
- [PLAN_CONTENT] = The plan markdown content from `planContent` field (string or null if not set)

Note: [ISSUE_ID], [TITLE], and [DESCRIPTION] are defined in `prompt.md`.
</input-format>

<instructions>

# Plan Creation Skill

Create implementation plans for issues requiring user approval before coding begins. Do NOT create worktrees or make code changes—plans must be approved before any implementation begins.

## Entry Check

Evaluate conditions in order. "Previous plan" = [PLAN_CONTENT] is not null. "Already submitted" = agent comment exists containing "## Implementation Plan".

| Condition | Action |
|-----------|--------|
| Previous plan AND [LATEST_USER_COMMENT] contains approval language | Routing error: invoke `claude-code-cli:issue-implementation` via Skill tool |
| Previous plan AND [LATEST_USER_COMMENT] is null AND already submitted | Skip to step 7 (Wait) |
| Previous plan AND [LATEST_USER_COMMENT] is null AND not submitted | Skip to step 6 (Submit) |
| Previous plan AND [LATEST_USER_COMMENT] contains revision request or is ambiguous | Revise plan. Start at step 2 or 3 depending on scope. Assessment cycles reset. |
| No previous plan | Create new plan. Start at step 1. |

## Classifying User Feedback

**Default: When intent is unclear, treat as revision request.**

<approval-signals>
These signals cause the routing layer to redirect to implementation on the next invocation:
- Explicit: "Approved", "LGTM", "Go ahead", "Proceed", "Ship it", or equivalent affirmative
- Implicit: "This looks good", "Perfect", "Great plan", "Yes", "OK", "Do it"
</approval-signals>

<revision-signals>
These signals mean stay in this skill and revise:
- Qualified positive: "Looks good, but...", "Mostly good, however..."
- Suggestions: "Can you consider...", "Can you also...", "What about..."
- Uncertainty: "I'm not sure about...", "Maybe we should..."
- Alternative proposals: "Why not use X instead?"
</revision-signals>

## Workflow

### 1. Load Plan Skill

Invoke `claude-code-cli:plan` for structure requirements and examples.

### 2. Research

- Read relevant files in the codebase (track paths for `codeReferences` in step 6)
- Understand existing patterns and architecture
- Identify dependencies and risks

### 3. Draft Plan

Include:
- Objective and scope
- Proposed approach with steps
- Files to be modified
- Testing strategy
- Risks and mitigations
- Questions or decision points

For revisions: Add a "## Changes from Previous Version" section listing each modification.

### 4. Store and Assess

First, store the drafted plan:
```http
PATCH /issues/[ISSUE_ID]
{ "planContent": "[drafted plan markdown]" }
```

Then launch both assessments in parallel (one message):
```xml
<invoke name="Task">
  <parameter name="description">Structural Assessment</parameter>
  <parameter name="subagent_type">claude-code-cli:plan-assessor</parameter>
  <parameter name="prompt">Assess the plan for structural compliance, technical feasibility, and completeness.

Issue: [ISSUE_ID] - [TITLE]
Description: [DESCRIPTION]</parameter>
</invoke>

<invoke name="Task">
  <parameter name="description">Strategic Assessment</parameter>
  <parameter name="subagent_type">claude-code-cli:plan-refactor</parameter>
  <parameter name="prompt">Evaluate the plan using the seven evaluation principles. Challenge assumptions, identify structural issues, and surface design decisions that warrant reconsideration.

Issue: [ISSUE_ID] - [TITLE]
Description: [DESCRIPTION]</parameter>
</invoke>
```

### 5. Address Findings

Review both assessment reports. If CRITICAL or HIGH priority issues exist:
1. Revise the plan to address findings
2. Re-store the revised plan via PATCH
3. Re-run step 4 assessments (maximum 2 total cycles per revision—if issues persist, document unresolved concerns and proceed)
4. Document changes and decisions in the plan

### 6. Submit for Approval

```http
POST /issues/[ISSUE_ID]/comments
{
  "body": "## Implementation Plan\n\n[detailed plan]\n\n---\n**Please review and approve this plan before I proceed with implementation.**",
  "author": "agent",
  "codeReferences": ["/path/to/reviewed/file.ts"]
}
```

```http
PATCH /issues/[ISSUE_ID]
{ "status": "needs_approval" }
```

### 7. Wait

**STOP execution.** Output:
> "Plan submitted for review. Awaiting your approval or feedback."

The orchestration layer will re-invoke when user responds:
- Approval → routes to `claude-code-cli:issue-implementation`
- Revision request → re-invokes this skill; Entry Check routes to step 2 or 3

</instructions>
