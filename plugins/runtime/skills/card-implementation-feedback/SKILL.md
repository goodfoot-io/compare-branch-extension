---
name: card-implementation-feedback
description: Apply user feedback to completed implementations.
---


<placeholder-variables>
[MODIFIED_FILES] — Files changed since the feedback baseline tag (determined in Step 5.3 via git diff; passed to maintainer as modified-file context)
</placeholder-variables>

<instructions>

## 1. Read Feedback

Read:
- The latest user comment in the card repository (the feedback)
- `PLAN.md` from the card repository if it exists (validation commands and context)
- `CARD.md` for the card's broader purpose

Based on the latest user comment:
- **Empty or does not indicate what changes are needed**: Write a comment requesting clarification, commit, and **STOP**

```bash
cd !` echo $CARD_REPO_PATH`
cat <<'EOF' > comment/feedback-clarification.md
[clarification request: what specific changes are needed based on the feedback?]
EOF
git add comment/feedback-clarification.md
git commit -m "[single sentence describing what clarification is needed about the feedback]"  # <card-repo-commit-style>
```

Then **STOP**.

- **Contains clear feedback on what needs to change**: Proceed to Step 2

---

## 2. Acknowledge Feedback

Write a comment to the card repository acknowledging the feedback and describing the targeted changes you will make. Commit to the card repository:

```bash
cd !` echo $CARD_REPO_PATH`
cat <<'EOF' > comment/feedback-acknowledged.md
[acknowledgment of the user's feedback, confirmation of understanding, and what targeted changes will be made]
EOF
git add comment/feedback-acknowledged.md
git commit -m "[single sentence summarizing the feedback and the targeted changes planned]"  # <card-repo-commit-style>
```

---

## 3. Prepare Environment

Create a baseline tag if one does not already exist:

```bash
if git rev-parse "feedback/!` echo $CARD_ID`/baseline" >/dev/null 2>&1; then
  echo "Baseline tag already exists — resuming from prior checkpoint."
else
  git tag "feedback/!` echo $CARD_ID`/baseline" HEAD
fi
```

---

## 4. Implement

Implement the targeted changes based on the user's feedback. Load the `runtime:card-developer` skill for implementation approach (TDD, no mocks, real implementations).

Focus only on what the feedback requests — do not re-implement unrelated parts of the original implementation.

1. Read the relevant files identified in the feedback
2. Implement the change
3. Commit logically grouped changes:

```bash
git add -A
git diff --cached --quiet || git commit -m "$(cat <<'COMMITMSG'
[commit message per <workspace-commit-style>]
COMMITMSG
)"
```

### 4.1 Validation Gate

ALL validation commands must pass before proceeding.

**`PLAN.md` exists:** Run validation per its validation commands.
**`PLAN.md` absent:** Run typecheck, lint, and test in each package containing modified files.

- **Error in code you can modify**: Fix it, re-run validation.
- **Error outside your scope**: Block immediately.

**When blocked:** Write exact failure output as a comment, add `blocked` tag to `CARD.meta.json`, commit, and **STOP**:

```bash
cd !` echo $CARD_REPO_PATH`
$NODE -e "const f='CARD.meta.json',d=JSON.parse(require('fs').readFileSync(f,'utf8')); if(!d.tags.includes('blocked')) d.tags.push('blocked'); require('fs').writeFileSync(f,JSON.stringify(d,null,2)+'\n')"
cat <<'EOF' > comment/feedback-validation-failed.md
[exact validation failure output]
EOF
git add comment/feedback-validation-failed.md CARD.meta.json
git commit -m "[single sentence describing the validation failure]"  # <card-repo-commit-style>
```

Only proceed to **5. Evaluate Quality** when ALL validations pass.

---

## 5. Evaluate Quality

### 5.1 Stage Uncommitted Changes

Ensure all feedback changes are committed before evaluation:

```bash
git add -A
git diff --cached --quiet || git commit -m "$(cat <<'COMMITMSG'
[commit message per <workspace-commit-style> — describe the uncommitted changes]
COMMITMSG
)"
```

### 5.2 Pre-Evaluation Validation

Run validation per the plan's validation commands (or `yarn typecheck`, `yarn lint`, `yarn test` in each package containing modified files if no plan exists).

**On any failure:** Fix all validation failures, then re-run validation. Only proceed to **Step 5.3** when ALL validations pass.

### 5.3 Determine Modified Files

Get the list of files modified since the feedback baseline:

```bash
git diff "feedback/!` echo $CARD_ID`/baseline" --name-only
```

Use this as [MODIFIED_FILES] for the maintainer.

### 5.4 Start Review

Create the review team and spawn the maintainer and failure-mode analyst in parallel. The team stays alive across review iterations — both agents persist and retain context from prior reviews.

```xml
<invoke name="TeamCreate">
<parameter name="team_name">review-feedback-!` echo $CARD_ID`</parameter>
<parameter name="description">!` echo $CARD_ID`: feedback update review</parameter>
</invoke>
```

```xml
<invoke name="Agent">
<parameter name="description">Failure mode analysis</parameter>
<parameter name="subagent_type">runtime:card:failure-mode</parameter>
<parameter name="model">opus</parameter>
<parameter name="team_name">review-feedback-!` echo $CARD_ID`</parameter>
<parameter name="name">failure-mode</parameter>
<parameter name="prompt">
Identify potential failure modes in this feedback-driven update.

## Card Repository
!` echo $CARD_REPO_PATH`

## Workspace
!` echo $WORKSPACE_PATH`

## Baseline
Changes are relative to git tag: `feedback/!` echo $CARD_ID`/baseline`

Diff the workspace against the baseline to identify changed files. Read every changed file, then search the workspace for consumers of every symbol, type, and file the implementation modifies. The failure modes live in the gap between the implementer's model and the system's actual behavior.
</parameter>
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

For every claim the code makes about the system — type contracts, error handling assumptions, consumer expectations — verify by running or tracing the code. Do not evaluate claims by reasoning about them. Send a review report per your instructions.
</parameter>
</invoke>
```

### 5.5 Wait for Review

Wait for the maintainer to deliver the review report via SendMessage. The maintainer incorporates failure-mode findings at their judgment.

**Failure-mode report not yet arrived when maintainer reports:** Proceed — findings will arrive and can inform revision in Step 5.8.

### 5.6 Process Verdict

The maintainer's verdict is final. Apply the first matching condition:

1. **BLOCKED**: Shut down the team (Step 5.9). Document in comment, add `blocked` tag, commit, **STOP**.
2. **CHANGES_REQUESTED**: Proceed to Step 5.7.
3. **APPROVED**: Shut down the team (Step 5.9). Proceed to Step 6.

### 5.7 Engage with Review

Your goal is to submit work that definitely improves the overall code health of the system (Google's Code Review Standard). Engage with the review before acting on it.

For each required change, formulate a question that:
- Demonstrates you understand the finding
- Surfaces what you need clarified — the reasoning, the intended scope, or whether an alternative would satisfy the concern

**Finding you believe is incorrect:** Present your case with evidence: "I went with X because of [tradeoffs]. My understanding is that Y would be worse because [reasons]. Are you suggesting Y better serves the codebase, or something else?"

Do not ask questions answerable by reading the code.

```xml
<invoke name="SendMessage">
<parameter name="recipient">maintainer</parameter>
<parameter name="content">
Thank you for the review. Before I address these, I want to make sure I understand your findings:

[For each finding that warrants discussion:]
- **[Finding reference]**: [What you understand about the concern, and what you need clarified or want to propose as an alternative]

[Any broader questions about approach or direction]
</parameter>
</invoke>
```

Wait for the maintainer's response. Use their answers to inform your fixes.

### 5.8 Address Changes and Re-submit

For each required change, assess viability and either fix directly or note why it cannot be done. Make unclear code self-explanatory — explanations in the re-submission message do not help future code readers.

Re-run validation. **Validation fails on code outside your scope:** Shut down the team (Step 5.9) and block.

Stage any uncommitted review fixes:

```bash
git add -A
git diff --cached --quiet || git commit -m "$(cat <<'COMMITMSG'
[commit message per <workspace-commit-style> — describe the uncommitted changes]
COMMITMSG
)"
```

Review the failure-mode analyst's findings. Approach-level findings — runtime risks, silent failure paths, data flow gaps — deserve the most consideration. Decide what to do:
- Fix the code
- Add mitigations
- Acknowledge an accepted risk
- Determine the finding doesn't apply

Not every finding requires a code change. No response to the failure-mode analyst is required.

Message both the maintainer and failure-mode analyst to re-review. Explain what you changed, why, and where you made judgment calls:

```xml
<invoke name="SendMessage">
<parameter name="recipient">maintainer</parameter>
<parameter name="content">
I've addressed your review findings. Here's what I changed and why:

All validations pass.

## Changes Applied
[For each finding addressed:]
- **[Finding reference]**: [What was changed and the reasoning behind the approach]

## Feedback
[For any requested change that was not made:]
- **[Finding reference]**: [What was attempted, why it is not viable, and what alternative (if any) was used instead]
</parameter>
</invoke>
```

```xml
<invoke name="SendMessage">
<parameter name="recipient">failure-mode</parameter>
<parameter name="content">
The implementation has been revised. Diff the workspace against the baseline again and send updated findings to both the team lead and the maintainer.
</parameter>
</invoke>
```

Return to Step 5.5.

### 5.9 Shut Down Team

Send shutdown requests to both agents. Wait for acknowledgment before deleting the team:

```xml
<invoke name="SendMessage">
<parameter name="type">shutdown_request</parameter>
<parameter name="recipient">maintainer</parameter>
<parameter name="content">Review complete.</parameter>
</invoke>
```

```xml
<invoke name="SendMessage">
<parameter name="type">shutdown_request</parameter>
<parameter name="recipient">failure-mode</parameter>
<parameter name="content">Review complete.</parameter>
</invoke>
```

After both agents have shut down:

```xml
<invoke name="TeamDelete"/>
```

---

## 6. Finalize

### 6.1 Complete or Await Review

- **gates.mergeRequestRequired is true**: **STOP** — Merge occurs after user approval.
- **gates.mergeRequestRequired is false or unset**: Load the `runtime:card-merge` skill and follow its `<instructions>`.

### 6.2 Tag Cleanup

Clean up the feedback baseline tag:

```bash
git tag -d "feedback/!` echo $CARD_ID`/baseline" 2>/dev/null
```

</instructions>
