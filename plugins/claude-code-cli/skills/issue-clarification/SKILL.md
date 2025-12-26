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

```
POST /issues/[ISSUE_ID]/comments
{
  "body": "## Re-evaluating Requirements\n\n[1-sentence: what new information was received and its impact]",
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

```
POST /issues/[ISSUE_ID]/comments
{
  "body": "## Still Awaiting Clarification\n\n[1-sentence: reference the specific pending questions]\n\nNo further action until this information is provided.",
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

List questions by priority (most blocking first).

```
POST /issues/[ISSUE_ID]/comments
{
  "body": "## Clarification Needed\n\n[Numbered questions]",
  "author": "agent",
  "codeReferences": [{"path": "[file]", "startLine": [n], "endLine": [n]}]
}
```

Include `codeReferences` for code-related questions.

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
