---
name: clarification
description: Request clarification when Definition of Ready is unmet.
model: inherit
tools: ["Read", "Write", "Edit", "Glob", "Grep", "Bash"]
skills: runtime:card-repo
---

<instructions>

## 1. Check for Existing Clarification

Read `CARD.md` and all comment files in `comment/` to understand the card description, requirements, and comment history:

```bash
cat CARD.md
for f in comment/*.md; do echo "--- $f ---"; cat "$f"; done
```

Based on comments and prior clarification requests:

- **No existing "## Clarification Needed" comment**: Proceed to Step 2

- **Existing clarification request AND later comment from non-agent author**: Acknowledge the new information and explain how it affects requirements analysis. Create a new comment file:

  ```bash
  COMMENT_ID=$(uuidgen | tr '[:upper:]' '[:lower:]')
  cat > "comment/${COMMENT_ID}.md" << 'COMMENT'
  [Acknowledgment of new information and impact on requirements]
  COMMENT
  ```

  Stage and commit. Then **STOP** -- the router will re-evaluate with the new information.

- **Existing clarification request AND no new user response**: Confirm you are still waiting for the previously requested information. Reference which questions remain unanswered. Create a new comment file:

  ```bash
  COMMENT_ID=$(uuidgen | tr '[:upper:]' '[:lower:]')
  cat > "comment/${COMMENT_ID}.md" << 'COMMENT'
  [Confirmation that previous questions remain unanswered, with references]
  COMMENT
  ```

  Stage and commit. Then **STOP** -- already waiting for user clarification.

## 2. Identify Missing Requirements

Mark as MISSING if not present or inferable from the card description and comments:

- **Problem statement**: What problem this solves
- **Acceptance criteria**: Testable completion conditions
- **Dependencies**: Blockers or prerequisites
- **Technical feasibility**: Enough detail to determine approach
- **Unanswered questions**: All comment questions answered

## 3. Research Context

1. Search for keywords from the card description in code and documentation
2. Look for similar implementations
3. Check tests for expected behavior

Based on research results:
- **If research resolves all gaps**: Post findings as a comment and **STOP** -- the router will route to implementation
- **If gaps remain**: Note findings for the clarification request, proceed to Step 4

## 4. Post Clarification Request

Create a new comment file presenting the specific questions needed to proceed with implementation. Prioritize by what is most blocking, explain why each piece of information is needed, and reference relevant code where applicable.

```bash
COMMENT_ID=$(uuidgen | tr '[:upper:]' '[:lower:]')
cat > "comment/${COMMENT_ID}.md" << 'COMMENT'
## Clarification Needed

[Specific questions organized by priority, with explanations and code references]

- [Question 1 — why it matters, relevant code: `path/to/file.ts#L10-L20`]
- [Question 2 — why it matters]
COMMENT
```

## 5. Stage and Commit

Stage and commit all changes:

```bash
git add comment/
git commit -m "Request clarification for missing requirements"
```

**STOP**

</instructions>
