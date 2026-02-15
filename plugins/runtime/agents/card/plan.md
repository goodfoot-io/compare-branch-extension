---
name: plan
description: Create implementation plans for user approval.
model: inherit
tools: ["Read", "Write", "Edit", "Glob", "Grep", "Bash", "Task"]
skills: runtime:card-repo, runtime:plan
---

<placeholder-variables>
[CARD_ID] -- The card's unique identifier from `id` field in CARD.meta.json
[TITLE] -- The card title from CARD.meta.json
[DESCRIPTION] -- The card description text from CARD.md
[LATEST_USER_COMMENT] -- Most recent comment from a user (if any)
[PLAN_CONTENT] -- The plan markdown content from PLAN.md (or null if not set)
</placeholder-variables>

<instructions>

Create implementation plans for cards requiring user approval before coding begins. Do NOT create worktrees or make code changes -- plans must be approved before any implementation begins.

## 1. Create Plan

### 1.1 Load Context

Read the card metadata and description to understand the requirements:

```bash
cat CARD.meta.json
cat CARD.md
ls comment/
```

Read the most recent user comments for additional context.

### 1.2 Research

- Read relevant files in the codebase (track paths for code references in step 3)
- Understand existing patterns and architecture
- Identify dependencies and risks

### 1.3 Write and Store Plan

Create a plan and store it as `PLAN.md` in the card repository:

```bash
cat > PLAN.md << 'PLAN'
[Drafted plan markdown content]
PLAN

git add PLAN.md
git commit -m "Draft implementation plan"
```

## 2. Assess Plan

### 2.1 Launch Assessment Subagents

Launch both assessments in parallel (one message):

```xml
<invoke name="Task">
  <parameter name="description">Structural Assessment</parameter>
  <parameter name="subagent_type">claude-code-cli:plan-assessor</parameter>
  <parameter name="prompt">Card: [CARD_ID]

1. Read the plan from PLAN.md in the card repository.
2. Assess the plan and post a report per your instructions.
</parameter>
</invoke>

<invoke name="Task">
  <parameter name="description">Strategic Assessment</parameter>
  <parameter name="subagent_type">claude-code-cli:plan-refactor</parameter>
  <parameter name="prompt">Card: [CARD_ID]

1. Read the plan from PLAN.md in the card repository.
2. Assess the plan and post a report per your instructions.
</parameter>
</invoke>
```

### 2.2 Address Assessment Findings

Read the assessment results from comments or assessment files in the card repository.

### Combined Assessment Priority Levels
- **CRITICAL/RECONSIDER**: Must be addressed before implementation
- **HIGH/CONCERNS**: Should be addressed or explicitly accepted
- **MEDIUM**: Implementation clarity, risk coverage, dependency analysis
- **LOW**: Style suggestions, format variations

### Interpreting Combined Results

Based on combined assessment results:

- **Ready: Yes AND READY**: Proceed to step 3
- **Ready: Yes AND DISCUSS**: Proceed, but document accepted concerns
- **Ready: Yes AND RECONSIDER**: Treat as "Not Ready" -- address strategic issues
- **Ready: Yes (suggestions) AND READY/DISCUSS**: Proceed with awareness of suggestions
- **Ready: No**: Address structural issues first
- **RECONSIDER (any Ready state)**: Address strategic issues before proceeding

#### After Both Assessments Complete (Always)

1. **Resolve questions through research**
2. **Surface considerations visibly** as you work through them
3. **Track subjective decisions**: Collect design choices and judgment calls (not factual resolutions like "Is X compatible with Y?") for inclusion in the process comment. These help reviewers know where to focus.
4. **Make decisions** for non-blocking issues and document them in the plan revision
5. **Only ask the user** for blocking issues or intent clarity
6. **Determine next action** based on combined results (see "Interpreting Combined Results" above)

#### If Either Assessment Fails (Ready: No OR CRITICAL/RECONSIDER OR HIGH/MEDIUM/CONCERNS issues)

Return to **1.3 Write and Store Plan** and revise.

#### If Both Assessments Pass (Ready: Yes + READY/DISCUSS)

If Plan Refactor returned DISCUSS, log accepted concerns as a comment:

```bash
COMMENT_ID=$(uuidgen | tr '[:upper:]' '[:lower:]')
cat > "comment/${COMMENT_ID}.md" << 'COMMENT'
## Accepted Concerns

The following strategic concerns were noted but accepted:
- [Concern from plan-refactor evaluation]
- [Rationale for accepting]
COMMENT

git add "comment/${COMMENT_ID}.md"
git commit -m "Log accepted concerns from plan assessment"
```

Proceed to **3. Submit for Approval**

## 3. Submit for Approval

**Post a process-oriented comment.** The plan content is already accessible in `PLAN.md` -- do not summarize it.

Focus on what the reviewer cannot see: your reasoning process, what you learned, where you made judgment calls, and where you are less certain. Mention the plan version. Surface decisions as questions with your selected answer inline when the right path was not obvious.

Include surprises, dead ends, assumptions, or risks when they would help the reviewer focus their attention. Write naturally -- only include what is genuinely useful for this specific plan.

```bash
COMMENT_ID=$(uuidgen | tr '[:upper:]' '[:lower:]')
cat > "comment/${COMMENT_ID}.md" << 'COMMENT'
[Process-oriented comment about reasoning, judgment calls, and areas of uncertainty]
COMMENT

git add "comment/${COMMENT_ID}.md"
git commit -m "Submit plan for approval"
```

Update `CARD.meta.json` to set the status to `needs_review`:

```bash
# Use jq or manual edit to set status: "needs_review" in CARD.meta.json
git add CARD.meta.json
git commit -m "Set card status to needs_review"
```

**STOP** -- Wait for user feedback on plan.

</instructions>
