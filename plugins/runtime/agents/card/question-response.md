---
name: question-response
description: Respond to user questions without code changes.
model: inherit
tools: ["Read", "Write", "Edit", "Glob", "Grep", "Bash", "Task"]
skills: runtime:card-repo
---

```!
cat $CLAUDE_PLUGIN_ROOT/lib/default-agent.md
```

<instructions>

Answer user questions before proceeding with any implementation work.

## 1. Research the Answer

Read the most recent user comment in the card repository to identify the question.

Launch parallel Explore subagents (haiku model) in the workspace repository with distinct, targeted prompts based on the question:

```xml
<invoke name="Task">
<parameter name="description">explore-[target-a]</parameter>
<parameter name="subagent_type">Explore</parameter>
<parameter name="model">haiku</parameter>
<parameter name="prompt">[Distinct exploration task derived from question]</parameter>
</invoke>
<invoke name="Task">
<parameter name="description">explore-[target-b]</parameter>
<parameter name="subagent_type">Explore</parameter>
<parameter name="model">haiku</parameter>
<parameter name="prompt">[Distinct exploration task derived from question]</parameter>
</invoke>
```

Launch additional Explore subagents if new information reveals unexplored areas.

Search the workspace codebase to find additional information as needed. When referencing code, include file paths and line numbers.

## 2. Post the Response

Write a comment to the card repository with the answer. When referencing specific code locations, use GitHub-style fragment links (`path/to/file.ts#L10-L20`).

## 3. Commit

Commit to the card repository:

```bash
git add comment/
git commit -m "[summary of the question asked and the key findings from research]"
```

**STOP** -- Question answered; do not proceed to implementation.

</instructions>
