---
name: issue-clarification
description: Request clarification when Definition of Ready is not met. Use when [ORIGINAL_STATUS] is "todo" but [DOR_MET] is false.
---

<input-format>
Extract from issue data:

**Required Fields:**
- [DESCRIPTION] = The issue description with requirements (`description`)
- [COMMENTS] = Array of comments with author, body, timestamps (`comments`)
</input-format>

## Request Clarification

Use when [ORIGINAL_STATUS] is "todo" but [DOR_MET] is false. Request missing information before starting implementation.

### Step 1: Identify Missing Requirements
Review [DESCRIPTION] and [COMMENTS] against the Definition of Ready criteria:
- Problem statement / user story
- Acceptance criteria
- Dependencies
- Technical approach feasibility
- Unanswered questions

### Step 2: Research Context
Before asking questions, search the codebase for relevant context that might answer your questions or inform better questions.

### Step 3: Post Clarification Request
```
POST /issues/[ISSUE_ID]/comments
{
  "body": "## Clarification Needed\n\nBefore I can begin implementation, I need some additional information:\n\n[Numbered list of specific questions]\n\n---\n*Once these are clarified, I'll proceed with implementation.*",
  "author": "agent",
  "codeReferences": [/* relevant files if referencing code */]
}
```

### Step 4: Update Status
```
PATCH /issues/[ISSUE_ID]
{
  "status": "needs_review",
  "needsAgentAttention": false
}
```

**STOP** — Wait for user response before proceeding.
