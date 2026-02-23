---
name: question-response
description: Respond to user questions without code changes.
---


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

## 2. Write Comment and Commit

Write a comment to the card repository with the answer. When referencing specific code locations, use GitHub-style fragment links (`path/to/file.ts#L10-L20`).

Commit to the card repository:

```bash
cd $CARD_REPO_PATH
export COMMENT_ID=$($NODE ${CLAUDE_PLUGIN_ROOT}/bin/uuid7.mjs)
cat <<'EOF' > comment/$COMMENT_ID.md
[answer to the question with GitHub-style fragment links for any code references]
EOF
git add comment/$COMMENT_ID.md
git commit -m "answered: [topic of question]"  # <card-repo-commit-style>
```

**STOP** — Question answered; do not proceed to implementation.

</instructions>
