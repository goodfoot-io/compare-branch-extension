---
name: card-implementation-feedback
description: Triage user feedback on completed implementations into inline fixes or follow-on plans.
---


<instructions>

## 1. Read Feedback

Read:
- The latest user comment in the card repository (the feedback)
- Plan files from the `plan/` directory in the card repository (prior approach and context)
- `CARD.md` for the card's broader purpose
- Recent workspace commits on the current branch (what was already delivered)

Based on the latest user comment:
- **Empty or does not indicate what changes are needed**: Write a comment requesting clarification, commit, and **STOP**

```bash
cd $CARD_REPO_PATH
cat <<'EOF' > comment/feedback-clarification.md
[clarification request: what specific changes are needed based on the feedback?]
EOF
git add comment/feedback-clarification.md
git commit -m "[single sentence describing what clarification is needed about the feedback]"  # <card-repo-commit-style>
```

Then **STOP**.

- **Contains clear feedback on what needs to change**: Proceed to Step 2

---

## 2. Triage Feedback

Assess the scope of the requested change. Apply the same judgment a senior engineer would when reading a code review comment: "Is this a comment-level fix, or does this need its own design?"

### Trivial fix

All of the following are true:

- Affects one or two lines of code
- The correct change is obvious from the feedback (no design decisions)
- No new files, no new interfaces, no behavioral changes beyond the immediate fix
- Examples: typo, wrong variable name, missing import, off-by-one, incorrect string literal

**→ Proceed to Step 3.**

### Needs a plan

Any of the following are true:

- Feedback requests a different approach or architecture
- Feedback adds scope the current implementation doesn't support
- Feedback identifies a structural concern requiring design work
- The change touches multiple files or introduces new interfaces
- The correct fix requires choosing between alternatives
- You are uncertain whether the change is trivial

**→ Proceed to Step 4.**

---

## 3. Apply Trivial Fix

Load the `cards:markdown` and `runtime:workspace-commit-style` skills.

Apply the fix directly. Commit:

```bash
git add -A
git diff --cached --quiet || git commit -m "$(cat <<'COMMITMSG'
[commit message per <workspace-commit-style>]
COMMITMSG
)"
```

Run validation in each package containing modified files (`yarn typecheck`, `yarn lint`, `yarn test`).

- **Validation passes**: Write a comment summarizing the fix. Commit to the card repository. **STOP**.

```bash
cd $CARD_REPO_PATH
cat <<'EOF' > comment/feedback-applied.md
[what was changed and why, confirming the feedback was addressed]
EOF
git add comment/feedback-applied.md
git commit -m "[single sentence summarizing the trivial fix applied]"  # <card-repo-commit-style>
```

- **Validation fails on your change**: Revert and treat as needing a plan (Step 4).
- **Validation fails on code outside your change**: Add `blocked` to `tags` in `CARD.meta.json`. Write failure details to `comment/feedback-validation-failed.md`. Commit both files and **STOP**.

---

## 4. Create Follow-On Plan

Write a comment to the card repository explaining why the feedback requires a new plan rather than an inline fix. Be specific about what design decisions or scope expansion drove the assessment.

```bash
cd $CARD_REPO_PATH
cat <<'EOF' > comment/feedback-needs-plan.md
[explanation of why a plan is needed: what the feedback asks for, why it exceeds a trivial fix, and what the plan should address]
EOF
git add comment/feedback-needs-plan.md
git commit -m "[single sentence explaining why feedback requires a follow-on plan]"  # <card-repo-commit-style>
```

Load the `runtime:card-plan` skill and follow its instructions. The planner will read the existing plan files and implementation context to create a follow-on plan.

</instructions>
