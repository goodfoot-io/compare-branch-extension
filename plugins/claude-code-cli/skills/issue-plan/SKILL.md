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

## 1. Create Plan

### 1.1 Load Plan Skill

Load the `claude-code-cli:plan` skill for structure requirements and examples.

### 1.2 Research

- Read relevant files in the codebase (track paths for `codeReferences` in step 3)
- Understand existing patterns and architecture
- Identify dependencies and risks

### 1.3 Write and Store Plan

Create a plan based on the style and structure from the `claude-code-cli:plan` skill. 

Then store the plan on the issue:

```
PATCH /issues/[ISSUE_ID]
{
  "planContent": "[drafted plan markdown]"
}
```

## 2. Assess Plan

### 2.1 Launch Assessment Subagents

Then launch both assessments in parallel (one message):

```xml
<invoke name="Task">
  <parameter name="description">Structural Assessment</parameter>
  <parameter name="subagent_type">claude-code-cli:plan-assessor</parameter>
  <parameter name="prompt">Issue: [ISSUE_ID]
  
1. Read the plan:
```
GET /issues/[ISSUE_ID]/plan-content
```

2. Assess the plan and post a report per your `<instructions>`.
</parameter>
</invoke>

<invoke name="Task">
  <parameter name="description">Strategic Assessment</parameter>
  <parameter name="subagent_type">claude-code-cli:plan-refactor</parameter>
  <parameter name="prompt">Issue: [ISSUE_ID]
  
1. Read the plan:
```
GET /issues/[ISSUE_ID]/plan-content
```

2. Assess the plan and post a report per your `<instructions>`.
</parameter>
</invoke>
```

### 2.2 Address Assessment Findings

Read the assessments:

```
GET /issues/[ISSUE_ID]/plan-assessments
```

### Combined Assessment Priority Levels
- **CRITICAL/RECONSIDER**: Must be addressed before implementation
- **HIGH/CONCERNS**: Should be addressed or explicitly accepted
- **MEDIUM**: Implementation clarity, risk coverage, dependency analysis
- **LOW**: Style suggestions, format variations

### Interpreting Combined Results

Based on combined assessment results:

- **Ready: Yes AND READY**: Proceed to step 3
- **Ready: Yes AND DISCUSS**: Proceed, but document accepted concerns
- **Ready: Yes AND RECONSIDER**: Treat as "Not Ready" - address strategic issues
- **Ready: Yes (suggestions) AND READY/DISCUSS**: Proceed with awareness of suggestions
- **Ready: No**: Address structural issues first
- **RECONSIDER (any Ready state)**: Address strategic issues before proceeding

#### After Both Assessments Complete (Always)

1. **Resolve questions through research**
2. **Surface considerations visibly** as you work through them
3. **Track subjective decisions**: Collect design choices and judgment calls (not factual resolutions like "Is X compatible with Y?") for inclusion in the final summary. These help reviewers know where to focus.
4. **Make decisions** for non-blocking issues and document them in the plan revision
5. **Only ask the user** for blocking issues or intent clarity
6. **Determine next action** based on combined results (see "Interpreting Combined Results" above)

#### If Either Assessment Fails (Ready: No OR CRITICAL/RECONSIDER OR HIGH/MEDIUM/CONCERNS issues)

Return to **1.3 Write and Store Plan** and revise.

#### If Both Assessments Pass (Ready: Yes + READY/DISCUSS)

If Plan Refactor returned DISCUSS, log accepted concerns:

```
POST /issues/[ISSUE_ID]/comments
{
  "body": "## Accepted Concerns\n\nThe following strategic concerns were noted but accepted:\n   - [Concern from plan-refactor evaluation]\n   - [Rationale for accepting]",
  "author": "agent"
}
```

Proceed to **3. Submit for Approval**

## 3. Submit for Approval

**Present summary to user** including:

- Plan location and version
- **Subjective decisions made**: List design choices and judgment calls with brief reasoning (e.g., "Chose server-side rendering for initial load performance"). Omit factual resolutions.
- Any accepted concerns from DISCUSS assessment
- Prompt for feedback

```
POST /issues/[ISSUE_ID]/comments
{
  "body": "[summary]",
  "author": "agent"
}
```

**STOP** — Wait for user feedback on plan

</instructions>
