---
name: issue-plan
description: Create implementation plans for user approval.
---

<placeholder-variables>
[LATEST_USER_COMMENT] — Most recent comment from `author: "user"` (if any)
[PLAN_CONTENT] — The plan markdown content from `planContent` field (string or null if not set)

Note: [ISSUE_ID], [TITLE], and [DESCRIPTION] are defined in `prompt.md`.
</placeholder-variables>

<instructions>

Create implementation plans for issues requiring user approval before coding begins. Do NOT create worktrees or make code changes—plans must be approved before any implementation begins.

## 1. Entry Check

Evaluate conditions in order (first match wins). "Previous plan" = [PLAN_CONTENT] is not null. "Already submitted" = issue status is `needs_review`.

- **Previous plan AND [LATEST_USER_COMMENT] contains approval language**: Routing error: invoke `claude-code-cli:issue-implementation` via Skill tool
- **Previous plan AND [LATEST_USER_COMMENT] is null AND already submitted**: Skip to step 4.8 (Wait)
- **Previous plan AND [LATEST_USER_COMMENT] is null AND not submitted**: Skip to step 4.7 (Submit)
- **Previous plan AND [LATEST_USER_COMMENT] contains revision request or is ambiguous**: Revise plan. Start at step 3 or 4 depending on scope. Assessment cycles reset.
- **No previous plan**: Create new plan. Start at step 2.

## 2. Initialize

```
PATCH /issues/[ISSUE_ID]
{
  "status": "in_progress"
}
```

## 3. Classifying User Feedback

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

## 4. Workflow

### 4.1 Load Plan Skill

Invoke `claude-code-cli:plan` for structure requirements and examples.

### 4.2 Research

- Read relevant files in the codebase (track paths for `codeReferences` in step 4.7)
- Understand existing patterns and architecture
- Identify dependencies and risks

### 4.3 Clarify Title and Description

After research, evaluate whether the title and description clearly represent the planned work. A good title completes the sentence: *"To finish this ticket, I need to [TITLE]"*

**Clarify title when:**
- Title is truncated, incomplete, or doesn't start with an action verb
- Title describes symptom but research reveals root cause
- Title references wrong component, file, or feature

**Clarify description when:**
- Description contains factual errors (wrong paths, incorrect component names)
- Description lacks context needed to understand the planned work

**Leave unchanged when:** Only minor phrasing or style preferences would change.

**Clarification principles:**
- Preserve all user-provided details, requirements, and constraints
- Maintain user intent — the clarified version must request the same outcome
- Correct factual errors in the main text; append a footnote: `*Corrections: Changed X to Y (reason)*`

**Enrich descriptions** with context discovered during research:
- Relevant file paths and component names
- Technical constraints or dependencies
- Acceptance criteria (if inferable from user intent)
- Brief background on why this change matters

Do not expand scope beyond user intent.

```
PATCH /issues/[ISSUE_ID]
{
  "title": "[CLARIFIED_TITLE]",
  "description": "[CLARIFIED_DESCRIPTION]"
}
```

Omit `title` and `description` fields if no changes are needed. Document any changes in the plan's scope section.

### 4.4 Draft Plan

Include:
- Objective and scope
- Proposed approach with steps
- Files to be modified
- Testing strategy
- Risks and mitigations
- Questions or decision points

For revisions: Add a "## Changes from Previous Version" section listing each modification.

### 4.5 Store and Assess

First, store the drafted plan:
```
PATCH /issues/[ISSUE_ID]
{
  "planContent": "[drafted plan markdown]"
}
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

### 4.6 Address Findings

Review both assessment reports.

Based on assessment severity:
- **CRITICAL or HIGH priority issues exist**: Revise the plan to address findings, re-store via PATCH, re-run step 4.5 assessments (maximum 2 total cycles per revision—if issues persist, document unresolved concerns and proceed), document changes and decisions in the plan
- **Otherwise**: Proceed to step 4.7

### 4.7 Submit for Approval

Update the issue with the final plan and set status for review:

```
PATCH /issues/[ISSUE_ID]
{
  "planContent": "[detailed plan markdown with approval request footer]",
  "codeReferences": ["/path/to/reviewed/file.ts"],
  "status": "needs_review"
}
```

The plan should end with: `---\n**Please review and approve this plan before I proceed with implementation.**`

### 4.8 Wait

**STOP** — Plan submitted for review. Awaiting your approval or feedback.

The orchestration layer will re-invoke when user responds:
- Approval → routes to `claude-code-cli:issue-implementation`
- Revision request → re-invokes this skill; Entry Check routes to step 3 or 4

</instructions>
