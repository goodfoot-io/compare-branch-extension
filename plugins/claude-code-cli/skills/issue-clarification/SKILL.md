---
name: issue-clarification
description: Request clarification when Definition of Ready is not met. Use when [STATUS] is "todo" but [DOR_MET] is false.
---

<placeholder-variables>
[DESCRIPTION] — The issue description with requirements (`description`)
[COMMENTS] — Array of comments with author, body, timestamps (`comments`)
</placeholder-variables>

<instructions>

## 1. Check for Existing Clarification

If [COMMENTS] contains a "## Clarification Needed" comment:

**If a later comment exists from a non-agent author:**

Acknowledge what new information was received and briefly explain how it affects the requirements analysis. This lets stakeholders know their response was registered before the issue is re-routed.

```
POST /issues/[ISSUE_ID]/comments
{
  "body": "[comment content]",
  "author": "agent"
}
```

```
PATCH /issues/[ISSUE_ID]
{
  "needsAgentAttention": false
}
```

**STOP** — Router will re-evaluate with new information.

**Otherwise (no new user response):**

Confirm that you're still waiting for the previously requested information. Reference which specific questions remain unanswered and clarify that work is blocked until they're addressed.

```
POST /issues/[ISSUE_ID]/comments
{
  "body": "[comment content]",
  "author": "agent"
}
```

```
PATCH /issues/[ISSUE_ID]
{
  "needsAgentAttention": false
}
```

**STOP** — Already waiting for user clarification.

## 2. Identify Missing Requirements

Mark as MISSING if not present or inferable from [DESCRIPTION] and [COMMENTS]:

- **Problem statement**: What problem this solves
- **Acceptance criteria**: Testable completion conditions
- **Dependencies**: Blockers or prerequisites
- **Technical feasibility**: Enough detail to determine approach
- **Unanswered questions**: All comment questions answered

## 3. Research Context

1. Search for [DESCRIPTION] keywords in code and documentation
2. Look for similar implementations
3. Check tests for expected behavior

**If research resolves all gaps**: Post findings as a comment and **STOP** — Router will route to implementation.

**If gaps remain**: Note findings for clarification request.

## 4. Post Clarification Request

Present the specific questions needed to proceed with implementation. Prioritize by what's most blocking, explain why each piece of information is needed, and reference relevant code where applicable.

```
POST /issues/[ISSUE_ID]/comments
{
  "body": "[comment content]",
  "author": "agent",
  "codeReferences": [{"path": "[file]", "startLine": [n], "endLine": [n]}]
}
```

## 5. Update Status and Stop

```
PATCH /issues/[ISSUE_ID]
{
  "status": "needs_review",
  "needsAgentAttention": false
}
```

**STOP**

</instructions>
