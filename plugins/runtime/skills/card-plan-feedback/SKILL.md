---
name: card-plan-feedback
description: Incorporate user feedback into an existing plan and re-assess.
---


<instructions>

## 1. Review Feedback

### 1.1 Read Card State

```bash
cd !` echo $CARD_REPO_PATH`
```

Read `PLAN.md` and the most recent `comment/*.md` files in the card repository.

### 1.2 Analyze User Feedback

From the latest user comment, identify:

- **Requested changes**: Specific modifications to the plan
- **Concerns raised**: Issues the user wants addressed
- **Questions asked**: Clarifications needed before approval
- **Scope adjustments**: Features to add, remove, or modify

## 2. Revise Plan

### 2.1 Research (If Needed)

If feedback requires additional investigation in the workspace repository:

- Read relevant files in the workspace codebase — use fragment links per the `<markdown-guidelines>` in the `cards:markdown` skill when referencing code in the revised plan
- Understand implications of requested changes
  - **Feedback modifies Technical Approach** (changes data structures, shifts responsibility between components, replaces a component, simplifies a step): Re-verify the complete data-flow connections for the affected path — not only the changed sections. A design revision can disconnect wiring that was correct under the previous design. Verify that existing fragment links in PLAN.md still point to correct locations.
- Identify new dependencies or risks

### 2.2 Incorporate Feedback

Update the plan to address all feedback points:

- Apply requested changes
- Address raised concerns
- Answer questions within the plan context
- Adjust scope as directed

### 2.3 Store Revised Plan

Write the updated plan to `PLAN.md` in the card repository. Update `PLAN.md.meta.json` with a revised `title` prefixed with "Plan:" (4–10 words naming the approach or solution) and `summary` reflecting the feedback changes — a multi-paragraph mini-plan in natural prose (100–300 words). The first paragraph states what is changing and why — the intent and what is different when done. Subsequent paragraphs overview the approach: which areas of the codebase are touched, what the key moving parts are, and important constraints or boundaries. Write for a developer deciding whether to read the full plan — reduce cognitive load by referring to components by role rather than internal names. Follow the `<markdown-guidelines>` in the `cards:markdown` skill. Commit to the card repository:

```bash
cd !` echo $CARD_REPO_PATH`
git add PLAN.md PLAN.md.meta.json
git commit -m "[single sentence summarizing what feedback was incorporated into the plan]"  # <card-repo-commit-style>
```

## 3. Assess Revised Plan

Load the `runtime:card-plan-evaluation` skill and follow its instructions.

## 4. Submit for Re-Approval

Post a process-oriented comment. The plan content is already in `PLAN.md` — do not summarize it.

- Explain how you incorporated the feedback, especially where interpretation was required
- Focus on what the reviewer cannot see: reasoning process, judgment calls, areas of lower certainty
- **Ambiguous feedback**: Surface your interpretation as a question with your selected answer inline
- Include surprises, new assumptions, or risks discovered during revision when useful
- Mention the plan version

Write the comment to the card repository. Commit to the card repository:

```bash
cd !` echo $CARD_REPO_PATH`
cat <<'EOF' > comment/plan-revised.md
[how feedback was incorporated, reasoning process and judgment calls made, interpretations of ambiguous feedback, and any surprises, new assumptions, or risks discovered during revision]
EOF
git add comment/plan-revised.md
git commit -m "[single sentence summarizing how feedback was incorporated and key judgment calls]"  # <card-repo-commit-style>
```

**STOP** — Wait for user feedback or approval. Do not modify gates in `CARD.meta.json`.

</instructions>
