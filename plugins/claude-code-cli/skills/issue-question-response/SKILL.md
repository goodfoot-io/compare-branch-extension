---
name: issue-question-response
description: Respond to user questions without code changes.
---

<instructions>

Answer user questions before proceeding with any implementation work.

## 1. Research the Answer

Launch background Explore subagents (haiku model). Launch multiple subagents with distinct, targeted prompts based on the question:

```xml
<invoke name="Task">
<parameter name="description">explore-[target-a]</parameter>
<parameter name="subagent_type">Explore</parameter>
<parameter name="model">haiku</parameter>
<parameter name="run_in_background">true</parameter>
<parameter name="prompt">[Distinct exploration task derived from question]</parameter>
</invoke>
<invoke name="Task">
<parameter name="description">explore-[target-b]</parameter>
<parameter name="subagent_type">Explore</parameter>
<parameter name="model">haiku</parameter>
<parameter name="run_in_background">true</parameter>
<parameter name="prompt">[Distinct exploration task derived from question]</parameter>
</invoke>
```

Collect background exploration results via TaskOutput. Launch additional Explore subagents if new information reveals unexplored areas.

Search the codebase to find additional information as needed. When referencing code, include file paths and line numbers.

Make sure to kill any Explore subagents that have not returned before moving to the next step.

## 2. Post the Response

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

## 3. Update `needsAgentAttention` field

```
PATCH /issues/[ISSUE_ID]
{
  "needsAgentAttention": false
}
```

**STOP** — Question answered; do not proceed to implementation

</instructions>
