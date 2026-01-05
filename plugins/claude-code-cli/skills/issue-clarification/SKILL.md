---
name: issue-clarification
description: Request clarification when Definition of Ready unmet.
---

<placeholder-variables>
[DESCRIPTION] — The issue description with requirements (`description`)
[COMMENTS] — Array of comments with author, body, timestamps (`comments`)
</placeholder-variables>

<instructions>

## 1. Check for Existing Clarification

Based on [COMMENTS] and prior clarification requests:

- **No existing "## Clarification Needed" comment**: Proceed to Step 2

- **Existing clarification request AND later comment from non-agent author**: Acknowledge the new information and explain how it affects requirements analysis. Post acknowledgment, set `needsAgentAttention: false`, then **STOP** — Router will re-evaluate with new information.

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

- **Existing clarification request AND no new user response**: Confirm you're still waiting for the previously requested information. Reference which questions remain unanswered. Post confirmation, set `needsAgentAttention: false`, then **STOP** — Already waiting for user clarification.

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

Based on research results:
- **If research resolves all gaps**: Post findings as a comment and **STOP** — Router will route to implementation.
- **If gaps remain**: Note findings for clarification request, proceed to Step 4.

## 4. Post Clarification Request

Present the specific questions needed to proceed with implementation. Prioritize by what's most blocking, explain why each piece of information is needed, and reference relevant code where applicable.

```
POST /issues/[ISSUE_ID]/comments
{
  "body": "[comment content]",
  "author": "agent",
  "codeReferences": [{"uri": "[file]", "range": {"startLine": [n], "endLine": [n]}}]
}
```

## 5. Clear Attention Flag and Stop

```
PATCH /issues/[ISSUE_ID]
{
  "needsAgentAttention": false
}
```

**STOP**

</instructions>
