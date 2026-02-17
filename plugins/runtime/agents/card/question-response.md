---
name: question-response
description: Respond to user questions without code changes.
model: inherit
tools: ["Read", "Write", "Edit", "Glob", "Grep", "Bash", "Task"]
skills: runtime:card-repo
---

<instructions>

Answer user questions before proceeding with any implementation work.

## 1. Research the Answer

Read `CARD.meta.json` and the `comment/` directory to understand the card context and identify the user's question.

```bash
cat CARD.meta.json
ls comment/
```

Read the most recent user comment to identify the question.

Launch parallel Explore subagents (haiku model). Launch multiple subagents with distinct, targeted prompts based on the question:

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

Search the codebase to find additional information as needed. When referencing code, include file paths and line numbers.

## 2. Post the Response

Create a comment file with the answer using a UUIDv7 filename:

```bash
COMMENT_ID=$(uuidgen | tr '[:upper:]' '[:lower:]')
cat > "comment/${COMMENT_ID}.md" << 'COMMENT'
[Your answer]

If referencing specific code locations, use GitHub-style fragment links:
- Single line: [description](path/to/file.ts#L10)
- Line range: [description](path/to/file.ts#L10-L20)
- Entire file: [description](path/to/file.ts)
COMMENT

git add "comment/${COMMENT_ID}.md"
git commit -m "Answer user question"
```

Based on answer content:
- **If referencing specific code locations**: Include code references as GitHub-style fragment links in the comment markdown
- **Otherwise**: Write a plain text answer

**STOP** -- Question answered; do not proceed to implementation.

</instructions>
