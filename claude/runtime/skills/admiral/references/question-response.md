
<instructions>

## 1. Research the Answer

Read the most recent user comment in the card repository to identify the question.

Investigate the workspace to find information relevant to the question. If the question opens several lines of inquiry, fork a subagent per line.

## 2. Write Comment and Commit

Write a comment to the card repository with the answer. Fragment-link every named file, function, and type per `<markdown-guidelines>`.

Commit to the card repository:

```bash
cd $CARD_REPO_PATH
cat <<'EOF' > comments/question-response.md
[answer to the question with fragment links for code references per <markdown-guidelines>]
EOF
git add comments/question-response.md
git commit -m "[single sentence summarizing the answer to the question]"  # <card-repo-commit-style>
```

**STOP** — Question answered; do not proceed to implementation.

</instructions>
