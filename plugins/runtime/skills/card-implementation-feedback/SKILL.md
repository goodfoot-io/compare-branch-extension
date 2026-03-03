---
name: card-implementation-feedback
description: Apply user feedback to completed implementations.
---


<placeholder-variables>
[MODIFIED_FILES] — Files changed since the feedback baseline tag (determined in Step 5.2 via git diff; passed to evaluators as modified-file context)
[COMMANDERS_INTENT] — 2-4 sentence statement of the card's broader purpose plus the specific feedback being addressed (synthesized in Step 5.1 from CARD.md, PLAN.md, and the user's feedback comment; passed to evaluators)
</placeholder-variables>

<instructions>

## 1. Read Feedback

Read the latest user comment in the card repository to identify the feedback on the completed implementation.

Read `PLAN.md` from the card repository if it exists (for validation commands and context).

Read `CARD.md` for the card's broader purpose.

Based on the latest user comment:
- **Empty or does not indicate what changes are needed**: Write a comment to the card repository requesting clarification, commit, and **STOP**

```bash
cd $CARD_REPO_PATH
export COMMENT_ID=$($NODE ${CLAUDE_PLUGIN_ROOT}/bin/uuid7.mjs)
cat <<'EOF' > comment/$COMMENT_ID.md
[clarification request: what specific changes are needed based on the feedback?]
EOF
git add comment/$COMMENT_ID.md
git commit -m "clarification needed: feedback unclear"  # <card-repo-commit-style>
```

Then **STOP**.

- **Contains clear feedback on what needs to change**: Proceed to Step 2

---

## 2. Acknowledge Feedback

Write a comment to the card repository acknowledging the feedback and describing the targeted changes you will make. Commit to the card repository:

```bash
cd $CARD_REPO_PATH
export COMMENT_ID=$($NODE ${CLAUDE_PLUGIN_ROOT}/bin/uuid7.mjs)
cat <<'EOF' > comment/$COMMENT_ID.md
[acknowledgment of the user's feedback, confirmation of understanding, and what targeted changes will be made]
EOF
git add comment/$COMMENT_ID.md
git commit -m "acknowledged: [summary of feedback]"  # <card-repo-commit-style>
```

---

## 3. Prepare Environment

Create a baseline tag for the update:

```bash
cd $WORKSPACE_PATH
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
cd $CARD_REPO_PATH
$NODE -e "const f='CARD.meta.json',d=JSON.parse(require('fs').readFileSync(f,'utf8')); if(!d.tags.includes('blocked')) d.tags.push('blocked'); require('fs').writeFileSync(f,JSON.stringify(d,null,2)+'\n')"
export COMMENT_ID=$($NODE ${CLAUDE_PLUGIN_ROOT}/bin/uuid7.mjs)
cat <<'EOF' > comment/$COMMENT_ID.md
[exact validation failure output]
EOF
git add comment/$COMMENT_ID.md CARD.meta.json
git commit -m "blocked: [reason]"  # <card-repo-commit-style>
```

Only proceed to **5. Evaluate Quality** when ALL validations pass.

---

## 5. Evaluate Quality

### 5.1 Synthesize Commander's Intent

Read `CARD.md` and `PLAN.md` (if it exists).

Synthesize [COMMANDERS_INTENT] — a 2-4 sentence statement capturing:
- The problem the card exists to solve
- The outcome the user expects
- The specific feedback being addressed in this update

### 5.2 Determine Modified Files

Get the list of files modified since the feedback baseline:

```bash
cd $WORKSPACE_PATH
git diff "feedback/!` echo $CARD_ID`/baseline" --name-only
```

Use this as [MODIFIED_FILES] for the evaluators.

### 5.3 Create Evaluation Team

```xml
<invoke name="TeamCreate">
<parameter name="team_name">eval-feedback-!` echo $CARD_ID`</parameter>
<parameter name="description">!` echo $CARD_ID`: feedback update evaluation</parameter>
</invoke>
```

Spawn both evaluators as teammates:

```xml
<invoke name="Task">
<parameter name="description">Implementation evaluation</parameter>
<parameter name="subagent_type">runtime:card:implementation-evaluator</parameter>
<parameter name="model">haiku</parameter>
<parameter name="team_name">eval-feedback-!` echo $CARD_ID`</parameter>
<parameter name="name">impl-evaluator</parameter>
<parameter name="prompt">
Evaluate for production readiness. This is a targeted update based on user feedback, not a full implementation.

## Validation Status
All validation commands passed before this evaluation was launched.

## Baseline
Changes are relative to git tag: `feedback/!` echo $CARD_ID`/baseline`

## Modified Files
[MODIFIED_FILES]

You are a teammate in an evaluation team. The end-to-end evaluator ("e2e-evaluator") is evaluating alongside you. Share noteworthy findings that affect behavioral correctness via SendMessage.
</parameter>
</invoke>
<invoke name="Task">
<parameter name="description">End-to-end evaluation</parameter>
<parameter name="subagent_type">runtime:card:end-to-end-evaluator</parameter>
<parameter name="model">opus</parameter>
<parameter name="team_name">eval-feedback-!` echo $CARD_ID`</parameter>
<parameter name="name">e2e-evaluator</parameter>
<parameter name="prompt">
Evaluate update against commander's intent. This is a targeted update based on user feedback, not a full implementation.

## Commander's Intent
[COMMANDERS_INTENT]

## Validation Status
All validation commands passed before this evaluation was launched.

## Baseline
Changes are relative to git tag: `feedback/!` echo $CARD_ID`/baseline`

## Modified Files
[MODIFIED_FILES]

You are a teammate in an evaluation team. The implementation evaluator ("impl-evaluator") is evaluating code quality alongside you. Share noteworthy findings that affect code quality or structure via SendMessage.
</parameter>
</invoke>
```

### 5.4 Wait for Reports

Wait for both agents to complete their evaluations and deliver reports.

### 5.5 Shut Down Team

Send shutdown requests to both teammates and delete the team:

```xml
<invoke name="SendMessage">
<parameter name="type">shutdown_request</parameter>
<parameter name="recipient">impl-evaluator</parameter>
<parameter name="content">Evaluation complete.</parameter>
</invoke>
<invoke name="SendMessage">
<parameter name="type">shutdown_request</parameter>
<parameter name="recipient">e2e-evaluator</parameter>
<parameter name="content">Evaluation complete.</parameter>
</invoke>
```

```xml
<invoke name="TeamDelete"/>
```

### 5.6 Process Results

Apply the first matching condition:
1. **Either evaluator returns BLOCKED**: Document in comment, add `blocked` tag, commit, **STOP**
2. **Implementation evaluator returns CONTINUE or end-to-end evaluator has required findings**: Fix findings directly, re-run validation. If validation passes, proceed to Step 6. If validation fails on code outside your scope, block.
3. **Both PRODUCTION_READY/SATISFIES_INTENT and no required e2e findings**: Proceed to Step 6
4. **End-to-end evaluator has only recommended findings**: Log recommended findings as a card comment, proceed to Step 6

Write recommended findings (if any) as a card comment:

```bash
cd $CARD_REPO_PATH
export COMMENT_ID=$($NODE ${CLAUDE_PLUGIN_ROOT}/bin/uuid7.mjs)
cat <<'EOF' > comment/$COMMENT_ID.md
## Recommended Improvements

[recommended findings from end-to-end evaluator — logged for future work]
EOF
git add comment/$COMMENT_ID.md
git commit -m "evaluation: recommended improvements"  # <card-repo-commit-style>
```

---

## 6. Finalize

### 6.1 Squash Update Commits

If there are multiple commits since the feedback baseline tag, squash them into a single commit with a message per `<workspace-commit-style>`:

```bash
cd $WORKSPACE_PATH
git reset --soft "feedback/!` echo $CARD_ID`/baseline"
git commit -m "$(cat <<'COMMITMSG'
[final commit message per <workspace-commit-style> — describe the feedback-driven changes]
COMMITMSG
)"
```

### 6.2 Complete or Await Review

Based on review gate:

- **gates.reviewRequired is true**: Write an updated summary comment to the card repository. Reference both the original implementation and the feedback-driven changes. List workspace files modified in the update and confirm all validation passed. Indicate awaiting approval. Commit to the card repository. **STOP** — Merge occurs after user approval.

  ```bash
  cd $CARD_REPO_PATH
  export COMMENT_ID=$($NODE ${CLAUDE_PLUGIN_ROOT}/bin/uuid7.mjs)
  cat <<'EOF' > comment/$COMMENT_ID.md
  ## Implementation Updated

  [what was changed in response to the user's feedback, workspace files modified in the update, validation confirmation, and that you are awaiting approval]
  EOF
  git add comment/$COMMENT_ID.md
  git commit -m "implementation updated, awaiting review"  # <card-repo-commit-style>
  ```

- **gates.reviewRequired is false or unset**: Write a completion comment to the card repository. Commit. Then load the `runtime:card-merge` skill and follow its `<instructions>`.

  ```bash
  cd $CARD_REPO_PATH
  export COMMENT_ID=$($NODE ${CLAUDE_PLUGIN_ROOT}/bin/uuid7.mjs)
  cat <<'EOF' > comment/$COMMENT_ID.md
  ## Implementation Updated

  [what was changed in response to the user's feedback, validation confirmation]
  EOF
  git add comment/$COMMENT_ID.md
  git commit -m "implementation updated"  # <card-repo-commit-style>
  ```

### 6.3 Tag Cleanup

Clean up the feedback baseline tag:

```bash
cd $WORKSPACE_PATH
git tag -d "feedback/!` echo $CARD_ID`/baseline" 2>/dev/null
```

</instructions>
