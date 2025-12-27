---
name: issue-question-response
description: Respond to user questions without code changes. Use when [HAS_QUESTION] is true.
---

<instructions>

Answer user questions before proceeding with any implementation work.

## 1. Initialize

```
PATCH /issues/[ISSUE_ID]
{
  "status": "in_progress"
}
```

## 2. Research the Answer

Search the codebase to find accurate information. When referencing code, include file paths and line numbers.

## 3. Post the Response

```
POST /issues/[ISSUE_ID]/comments
{
  "body": "[Your answer]",
  "author": "agent",
  "codeReferences": [{"path": "[file]", "startLine": [n], "endLine": [n]}]
}
```

Based on answer content:
- **If referencing specific code locations**: Include `codeReferences` array
- **Otherwise**: Omit `codeReferences`

## 4. Restore Issue Status

```
PATCH /issues/[ISSUE_ID]
{
  "status": "[STATUS]",
  "needsAgentAttention": false
}
```

**STOP** — Question answered; do not proceed to implementation

</instructions>
