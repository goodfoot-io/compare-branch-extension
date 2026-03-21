---
name: card-implementation-feedback
description: Apply user feedback to completed implementations.
---


<placeholder-variables>
[MODIFIED_FILES] — Files changed since the feedback baseline tag (determined in Step 5.3 via git diff; passed to maintainer as modified-file context)
</placeholder-variables>

<instructions>

## 1. Read Feedback

Read the latest user comment in the card repository to identify the feedback on the completed implementation.

Read `PLAN.md` from the card repository if it exists (for validation commands and context).

Read `CARD.md` for the card's broader purpose.

Based on the latest user comment:
- **Empty or does not indicate what changes are needed**: Write a comment to the card repository requesting clarification, commit, and **STOP**

```bash
cd !` echo $CARD_REPO_PATH`
export COMMENT_ID=$($NODE ${CLAUDE_PLUGIN_ROOT}/bin/uuid7.mjs)
cat <<'EOF' > comment/$COMMENT_ID.md
[clarification request: what specific changes are needed based on the feedback?]
EOF
git add comment/$COMMENT_ID.md
git commit -m "[single sentence describing what clarification is needed about the feedback]"  # <card-repo-commit-style>
```

Then **STOP**.

- **Contains clear feedback on what needs to change**: Proceed to Step 2

---

## 2. Acknowledge Feedback

Write a comment to the card repository acknowledging the feedback and describing the targeted changes you will make. Commit to the card repository:

```bash
cd !` echo $CARD_REPO_PATH`
export COMMENT_ID=$($NODE ${CLAUDE_PLUGIN_ROOT}/bin/uuid7.mjs)
cat <<'EOF' > comment/$COMMENT_ID.md
[acknowledgment of the user's feedback, confirmation of understanding, and what targeted changes will be made]
EOF
git add comment/$COMMENT_ID.md
git commit -m "[single sentence summarizing the feedback and the targeted changes planned]"  # <card-repo-commit-style>
```

---

## 3. Prepare Environment

Create a baseline tag for the update:

```bash
git tag -f "feedback/!` echo $CARD_ID`/baseline" HEAD
```

---

## 4. Implement

Implement the targeted changes based on the user's feedback. Load the `runtime:card-developer` skill for implementation approach (TDD, no mocks, real implementations).

Focus only on what the feedback requests — do not re-implement unrelated parts of the original implementation.

1. Read the relevant files identified in the feedback
2. Implement the change
3. Commit logically grouped changes

For new functions or methods, load the `runtime:tdd-implementation` skill and follow its instructions.

### 4.1 Validation Gate

**Requirement:** ALL validation commands must pass before proceeding.

If `PLAN.md` exists, run validation per its "Validation Commands" section. Otherwise, run `yarn typecheck`, `yarn lint`, and `yarn test` in each package containing modified files.

Based on failure:
- **Error in code you can modify**: Fix it, re-run validation
- **Error outside your scope**: Block immediately

**When blocked:** Write exact failure output as a comment, add `blocked` tag to `CARD.meta.json`, commit, and **STOP**:

```bash
cd !` echo $CARD_REPO_PATH`
$NODE -e "const f='CARD.meta.json',d=JSON.parse(require('fs').readFileSync(f,'utf8')); if(!d.tags.includes('blocked')) d.tags.push('blocked'); require('fs').writeFileSync(f,JSON.stringify(d,null,2)+'\n')"
export COMMENT_ID=$($NODE ${CLAUDE_PLUGIN_ROOT}/bin/uuid7.mjs)
cat <<'EOF' > comment/$COMMENT_ID.md
[exact validation failure output]
EOF
git add comment/$COMMENT_ID.md CARD.meta.json
git commit -m "[single sentence describing the validation failure]"  # <card-repo-commit-style>
```

Only proceed to **5. Evaluate Quality** when ALL validations pass.

---

## 5. Evaluate Quality

### 5.1 Pre-Evaluation Checkpoint

Commit a checkpoint:

```bash
git add -A  # checkpoint: stage all workspace files before evaluation
git commit --allow-empty -m "checkpoint: before evaluation — feedback changes complete for card $CARD_ID"
```

### 5.2 Pre-Evaluation Validation

Run validation per the plan's "Validation Commands" section (or `yarn typecheck`, `yarn lint`, `yarn test` in each package containing modified files if no plan exists).

**On any failure:** Fix all validation failures, then re-run validation. Only proceed to **Step 5.3** when ALL validations pass.

### 5.3 Determine Modified Files

Get the list of files modified since the feedback baseline:

```bash
git diff "feedback/!` echo $CARD_ID`/baseline" --name-only
```

Use this as [MODIFIED_FILES] for the maintainer.

### 5.4 Start Maintainer Review

Create the review team and spawn the maintainer. The team stays alive across review iterations — the maintainer persists and retains context from prior reviews.

```xml
<invoke name="TeamCreate">
<parameter name="team_name">review-feedback-!` echo $CARD_ID`</parameter>
<parameter name="description">!` echo $CARD_ID`: feedback update review</parameter>
</invoke>
```

```xml
<invoke name="Agent">
<parameter name="description">Maintainer review</parameter>
<parameter name="subagent_type">runtime:card:maintainer</parameter>
<parameter name="model">opus</parameter>
<parameter name="team_name">review-feedback-!` echo $CARD_ID`</parameter>
<parameter name="name">maintainer</parameter>
<parameter name="prompt">
Review this targeted update for production readiness. This is a feedback-driven change, not a full implementation.

## Card Repository
!` echo $CARD_REPO_PATH`

## Baseline
Changes are relative to git tag: `feedback/!` echo $CARD_ID`/baseline`

## Modified Files
[MODIFIED_FILES]

You are the maintainer of this repository. Your verdict is final — APPROVED, CHANGES_REQUESTED, or BLOCKED. Evaluate both code quality and end-to-end wiring. Everything is on the table, including major refactors.
</parameter>
</invoke>
```

### 5.5 Wait for Review

Wait for the maintainer to deliver the review report via SendMessage.

### 5.6 Process Verdict

The maintainer's verdict is final. Apply the first matching condition:

1. **BLOCKED**: Shut down the team (Step 5.8). Document in comment, add `blocked` tag, commit, **STOP**.
2. **CHANGES_REQUESTED**: For each required change, assess viability and either fix it directly or note why it cannot be done. Re-run validation. If validation passes, proceed to Step 5.7. If validation fails on code outside your scope, shut down the team (Step 5.8) and block.
3. **APPROVED**: Shut down the team (Step 5.8). Proceed to Step 6.

### 5.7 Re-submit for Review

Re-checkpoint:

```bash
git add -A  # checkpoint: stage all workspace files before re-review
git commit --allow-empty -m "checkpoint: before re-review — fixes applied for card $CARD_ID"
```

Message the existing maintainer to re-review. Include feedback on any changes that could not be made:

```xml
<invoke name="SendMessage">
<parameter name="recipient">maintainer</parameter>
<parameter name="content">
Fixes applied. Please re-review.

All validations pass.

## Changes Applied
[List of changes that were made]

## Feedback
[For any requested change that was not made, explain why:
 - what was attempted
 - what went wrong or why it is not viable
 - what alternative (if any) was used instead]
</parameter>
</invoke>
```

Return to Step 5.5.

### 5.8 Shut Down Team

Send shutdown request to the maintainer. Wait for acknowledgment before deleting the team:

```xml
<invoke name="SendMessage">
<parameter name="type">shutdown_request</parameter>
<parameter name="recipient">maintainer</parameter>
<parameter name="content">Review complete.</parameter>
</invoke>
```

After the maintainer has shut down:

```xml
<invoke name="TeamDelete"/>
```

---

## 6. Finalize

### 6.1 Complete or Await Review

Based on review gate:

- **gates.mergeRequestRequired is true**: **STOP** — Merge occurs after user approval. Workspace commits describe the feedback-driven changes.

- **gates.mergeRequestRequired is false or unset**: Load the `runtime:card-merge` skill and follow its `<instructions>`.

### 6.2 Tag Cleanup

Clean up the feedback baseline tag:

```bash
git tag -d "feedback/!` echo $CARD_ID`/baseline" 2>/dev/null
```

</instructions>
