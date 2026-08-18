
<instructions>

## 1. Read Feedback

Read:
- Recent user additions to the card repository — comments, attachments (screenshots, logs), and any updates to `CARD.md`
- Plan files from the `plans/` directory in the card repository (prior approach and context)
- `CARD.md` for the card's broader purpose
- Recent workspace commits on the current branch (what was already delivered)

Based on the user's feedback:
- **No actionable feedback found**: Write a comment requesting clarification, commit, and **STOP**

```bash
cd $CARD_REPO_PATH
cat <<'EOF' > comments/feedback-clarification.md
[clarification request: what specific changes are needed based on the feedback?]
EOF
git add comments/feedback-clarification.md
git commit -m "[single sentence describing what clarification is needed about the feedback]"  # <card-repo-commit-style>
```

Then **STOP**.

- **Contains clear feedback on what needs to change**: Proceed to Step 2: Triage Feedback.

---

## 2. Triage Feedback

Assess the scope of the requested change. Apply the same judgment a senior engineer would when reading a code review comment: "Is this a comment-level fix, or does this need its own design?"

### Trivial fix

All of the following are true:

- Affects one or two lines of code
- The correct change is obvious from the feedback (no design decisions)
- No new files, no new interfaces, no behavioral changes beyond the immediate fix
- Examples: typo, wrong variable name, missing import, off-by-one, incorrect string literal

**→ Read `./implementation.md` and follow its instructions.**

### Needs a plan

Any of the following are true:

- Feedback requests a different approach or architecture
- Feedback adds scope the current implementation doesn't support
- Feedback identifies a structural concern requiring design work
- The change touches multiple files or introduces new interfaces
- The correct fix requires choosing between alternatives
- You are uncertain whether the change is trivial

Read `./plan.md` and follow its instructions. It reads the existing plan files and implementation context and creates a follow-on plan.

</instructions>
