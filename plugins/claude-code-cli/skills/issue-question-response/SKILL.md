---
name: issue-question-response
description: Respond to user questions without code changes. Use when [HAS_QUESTION] is true.
---

<instructions>

Answer user questions before proceeding with any implementation work.

## 1. Research the Answer

Search the codebase to find accurate information. When referencing code, include file paths and line numbers.

## 2. Post the Response

```
POST /issues/[ISSUE_ID]/comments
{
  "body": "[Your answer]",
  "author": "agent",
  "codeReferences": [{"path": "[file]", "startLine": [n], "endLine": [n]}]
}
```

Include `codeReferences` when your answer references specific code locations.

## 3. Restore Issue Status

```
PATCH /issues/[ISSUE_ID]
{
  "status": "[STATUS]",
  "needsAgentAttention": false
}
```

**STOP** — The question has been answered. Do not proceed to implementation. If the user has follow-up questions or requests implementation, the system will re-invoke with updated issue data.

</instructions>
