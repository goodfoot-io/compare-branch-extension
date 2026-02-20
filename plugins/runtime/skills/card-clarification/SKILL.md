---
name: clarification
description: Request clarification when Definition of Ready is unmet.
---


<instructions>

## 1. Check for Existing Clarification

Read the card description and comments in the card repository to understand the requirements and comment history.

Based on comments and prior clarification requests:

- **No existing "## Clarification Needed" comment**: Proceed to Step 2

- **Existing clarification request AND later comment from non-agent author**: Write a comment to the card repository acknowledging the new information and explaining how it affects requirements analysis. Commit and **STOP** — the router will re-evaluate with the new information.

- **Existing clarification request AND no new user response**: Write a comment to the card repository confirming you are still waiting for the previously requested information, referencing which questions remain unanswered. Commit and **STOP** — already waiting for user clarification.

## 2. Identify Missing Requirements

Mark as MISSING if not present or inferable from the card description and comments:

- **Problem statement**: What problem this solves
- **Acceptance criteria**: Testable completion conditions
- **Dependencies**: Blockers or prerequisites
- **Technical feasibility**: Enough detail to determine approach
- **Unanswered questions**: All comment questions answered

## 3. Research Context

Search the workspace codebase for keywords from the card description:
1. Look for similar implementations
2. Check tests for expected behavior
3. Identify relevant file paths for code references

Based on research results:
- **If research resolves all gaps**: Write findings as a comment to the card repository, commit, and **STOP** — the router will route to implementation
- **If gaps remain**: Note findings for the clarification request, proceed to Step 4

## 4. Post Clarification Request

Write a comment to the card repository presenting the specific questions needed to proceed with implementation. Prioritize by what is most blocking, explain why each piece of information is needed, and reference relevant workspace code where applicable.

## 5. Commit

Commit to the card repository:

```bash
cd $CARD_REPO_PATH
export COMMENT_ID=$($NODE !`echo $CLAUDE_PLUGIN_ROOT`/bin/uuid7.mjs)
cat <<'EOF' > comment/$COMMENT_ID.md
[specific questions needed to proceed, prioritized by what is most blocking, with explanation of why each is needed and references to relevant workspace code]
EOF
git add comment/$COMMENT_ID.md
git commit -m "[which requirements are missing, what questions were asked, and what research was done to try to answer them first]"
```

**STOP**

</instructions>
