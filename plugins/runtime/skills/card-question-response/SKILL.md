---
name: card-question-response
description: Respond to user questions without code changes.
---


<instructions>

## 1. Research the Answer

Read the most recent user comment in the card repository to identify the question.

Trace code and data flow paths in the workspace to find information relevant to the question. Use whatever combination of searches, reads, and tools best fits the question.

## 2. Write Comment and Commit

Load the `cards:markdown` skill. Write a comment to the card repository with the answer. Follow its `<markdown-guidelines>` for all file references and code locations.

Commit to the card repository:

```bash
cd $CARD_REPO_PATH
cat <<'EOF' > comment/question-response.md
[answer to the question with fragment links for code references per the cards:markdown skill]
EOF
git add comment/question-response.md
git commit -m "[single sentence summarizing the answer to the question]"  # <card-repo-commit-style>
```

**STOP** — Question answered; do not proceed to implementation.

</instructions>
