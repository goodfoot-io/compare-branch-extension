---
name: card-question-response
description: Respond to user questions without code changes.
---


<instructions>

Answer user questions before proceeding with any implementation work.

## 1. Research the Answer

Read the most recent user comment in the card repository to identify the question.

Trace code and data flow paths in the workspace to find information relevant to the question. Use whatever combination of searches, reads, and tools best fits the question. When referencing code, include file paths and line numbers.

## 2. Write Comment and Commit

Write a comment to the card repository with the answer. When referencing specific code locations, use GitHub-style fragment links (`path/to/file.ts#L10-L20`).

Commit to the card repository:

```bash
cd !` echo $CARD_REPO_PATH`
export COMMENT_ID=$($NODE ${CLAUDE_PLUGIN_ROOT}/bin/uuid7.mjs)
cat <<'EOF' > comment/$COMMENT_ID.md
[answer to the question with GitHub-style fragment links for any code references]
EOF
git add comment/$COMMENT_ID.md
git commit -m "[single sentence summarizing the answer to the question]"  # <card-repo-commit-style>
```

**STOP** — Question answered; do not proceed to implementation.

</instructions>
