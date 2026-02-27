---
name: card-implementation
description: Implement cards.
---


<placeholder-variables>
[PLAN_FILES] — All files the plan intends to modify (extracted from PLAN.md after writing it in Step 2)
</placeholder-variables>

<instructions>

## 1. Prepare Environment

Stash any uncommitted changes:

```bash
cd $WORKSPACE_PATH
git stash --include-untracked
```

Create baseline tag:

```bash
cd $WORKSPACE_PATH
git tag -f "implement/!` echo $CARD_ID`/baseline" HEAD
```

Restore any stashed changes: `git stash pop || true` (succeeds silently if stash is empty).

---

## 2. Create Team

```xml
<invoke name="TeamCreate">
<parameter name="team_name">impl-!` echo $CARD_ID`</parameter>
<parameter name="description">!` echo $CARD_ID`: implementation</parameter>
</invoke>
```

Spawn the implementation-pair so it warms up with card context during planning:

```xml
<invoke name="Task">
<parameter name="description">Implementation pair</parameter>
<parameter name="subagent_type">runtime:card:implementation-pair</parameter>
<parameter name="team_name">impl-!` echo $CARD_ID`</parameter>
<parameter name="name">impl-pair</parameter>
<parameter name="prompt">
Read CARD.md from the card repository to understand the requirements, then wait for further instructions.
</parameter>
</invoke>
```

---

## 3. Plan

Write the plan to `PLAN.md` in the card repository following the `<annotated-plan-example>` from the `runtime:plan-abbreviated` skill. Base the plan on the card description and codebase exploration.

Commit to the card repository:

```bash
cd $CARD_REPO_PATH
git add PLAN.md
git commit -m "plan: [approach and key decisions]"  # <card-repo-commit-style>
```

Extract [PLAN_FILES] — all files the plan intends to modify (from the Technical Approach section).

Create a task for each step in the Technical Approach to give the implementation-pair visibility into progress:

```xml
<!-- For each step N with title [STEP_TITLE]: -->
<invoke name="TaskCreate">
<parameter name="subject">Step N: [STEP_TITLE]</parameter>
<parameter name="description">[brief description of the step from PLAN.md]</parameter>
<parameter name="activeForm">Implementing step N</parameter>
</invoke>
```

---

## 4. Request Plan Review

Send the plan to the implementation-pair for review:

```xml
<invoke name="SendMessage">
<parameter name="type">message</parameter>
<parameter name="recipient">impl-pair</parameter>
<parameter name="summary">Review implementation plan</parameter>
<parameter name="content">
## Mode: Plan Review

Review the implementation plan. Read PLAN.md from the card repository. Assess completeness, precision, feasibility, scope risk, and missing risks.

Send your findings via SendMessage. I will begin implementing immediately — send critical findings as soon as possible.
</parameter>
</invoke>
```

**Do not wait for the plan review.** Proceed immediately to Step 5.

---

## 5. Implement

Implement the plan directly. Load the `runtime:card-developer` skill for implementation approach (TDD, no mocks, real implementations).

### 5.1 Work Through Tasks

For each step in the Technical Approach:
1. Mark the step's task `in_progress` via TaskUpdate
2. Read relevant files
3. Implement the change
4. Commit logically grouped changes
5. Mark the step's task `completed` via TaskUpdate
6. Send a brief progress message to the implementation-pair:

```xml
<invoke name="SendMessage">
<parameter name="type">message</parameter>
<parameter name="recipient">impl-pair</parameter>
<parameter name="summary">Completed step N/M</parameter>
<parameter name="content">Completed step N/M: [STEP_TITLE]</parameter>
</invoke>
```

For new functions or methods, load the `runtime:tdd-implementation` skill and follow its instructions.

### 5.2 Handle Plan Review Feedback

When the implementation-pair sends plan review feedback via message:

- **CRITICAL findings**: Pause current work. Assess the finding. If valid, adjust the implementation approach and update PLAN.md if the plan itself was wrong. Resume implementation.
- **CONCERN findings**: Note the concern. Factor it into remaining work. Address if straightforward; otherwise continue and let the evaluation phase catch it.
- **SUGGESTION findings**: Note for consideration. No action required during implementation.

If no feedback arrives before implementation completes, proceed — the evaluation phase provides the blocking quality gate.

### 5.3 Validation Gate

**Requirement:** ALL validation commands from PLAN.md must pass before proceeding.

Run validation per the plan's "Validation Commands" section.

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

Only proceed to **6. Evaluate** when ALL validations pass.

---

## 6. Evaluate

### 6.1 Request Evaluation

Send an evaluation request to the implementation-pair:

```xml
<invoke name="SendMessage">
<parameter name="type">message</parameter>
<parameter name="recipient">impl-pair</parameter>
<parameter name="summary">Requesting implementation evaluation</parameter>
<parameter name="content">
## Mode: Implementation Evaluation

Implementation is complete. All validation commands pass. Evaluate the implementation for end-to-end correctness.

## Baseline
Changes are relative to git tag: `implement/!` echo $CARD_ID`/baseline`

## Implementation Progress
[For each plan step, list: step number, title, and any deviations or deferrals from the plan. Example:]
- Step 1: [title] — Complete
- Step 2: [title] — Complete, deviated from plan: [what changed and why]
- Step 3: [title] — Complete, deferred: [what was deferred and why]

## Modified Files
[PLAN_FILES]
</parameter>
</invoke>
```

**Wait for the evaluation report.** This is a blocking step.

### 6.2 Process Evaluation Results

Determine path using the first matching condition:

- **BLOCKED**: Document in comment, add `blocked` tag, commit, **STOP** — evaluation cannot proceed.

  ```bash
  cd $CARD_REPO_PATH
  $NODE -e "const f='CARD.meta.json',d=JSON.parse(require('fs').readFileSync(f,'utf8')); if(!d.tags.includes('blocked')) d.tags.push('blocked'); require('fs').writeFileSync(f,JSON.stringify(d,null,2)+'\n')"
  export COMMENT_ID=$($NODE ${CLAUDE_PLUGIN_ROOT}/bin/uuid7.mjs)
  cat <<'EOF' > comment/$COMMENT_ID.md
  [blocking details from evaluation]
  EOF
  git add comment/$COMMENT_ID.md CARD.meta.json
  git commit -m "blocked: [reason]"  # <card-repo-commit-style>
  ```

- **CONTINUE and evaluation cycle < 3**: Fix the issues identified in the evaluation report. Re-run validation commands. Return to **Step 6.1** to request re-evaluation.
- **CONTINUE and evaluation cycle >= 3**: Write findings as a comment, add `blocked` tag, **STOP** — fix attempts exhausted.
- **SATISFIES_INTENT**: Write recommended findings (if any) as a card comment. Proceed to **7. Finalize**.

  ```bash
  cd $CARD_REPO_PATH
  export COMMENT_ID=$($NODE ${CLAUDE_PLUGIN_ROOT}/bin/uuid7.mjs)
  cat <<'EOF' > comment/$COMMENT_ID.md
  ## Recommended Improvements

  [recommended findings from evaluation — logged for future work]
  EOF
  git add comment/$COMMENT_ID.md
  git commit -m "evaluation: recommended improvements"  # <card-repo-commit-style>
  ```

---

## 7. Finalize

### 7.1 Shut Down Team

Send shutdown request and delete the team:

```xml
<invoke name="SendMessage">
<parameter name="type">shutdown_request</parameter>
<parameter name="recipient">impl-pair</parameter>
<parameter name="content">Implementation complete.</parameter>
</invoke>
```

```xml
<invoke name="TeamDelete"/>
```

### 7.2 Squash Commits

If there are multiple commits since the baseline tag, squash them into a single commit with a message per `<workspace-commit-style>`:

```bash
cd $WORKSPACE_PATH
git reset --soft "implement/!` echo $CARD_ID`/baseline"
git commit -m "$(cat <<'COMMITMSG'
[final commit message per <workspace-commit-style>]
COMMITMSG
)"
```

Clean up checkpoint tags:

```bash
cd $WORKSPACE_PATH
git tag -d "implement/!` echo $CARD_ID`/baseline" 2>/dev/null
```

### 7.3 Complete

Based on review gate:

- **gates.reviewRequired is true**: Write a summary comment to the card repository explaining what was implemented and key decisions made. List the main workspace files modified and confirm all validation passed. Indicate awaiting approval. Commit to the card repository. **STOP** — Merge occurs after user approval.

  ```bash
  cd $CARD_REPO_PATH
  export COMMENT_ID=$($NODE ${CLAUDE_PLUGIN_ROOT}/bin/uuid7.mjs)
  cat <<'EOF' > comment/$COMMENT_ID.md
  [what was implemented and key decisions made, main workspace files modified, validation confirmation, and request for reviewer focus areas]
  EOF
  git add comment/$COMMENT_ID.md
  git commit -m "implementation complete, awaiting review"  # <card-repo-commit-style>
  ```

- **gates.reviewRequired is false or unset**: Write a completion comment to the card repository. Commit. Then launch the merge agent.

  ```bash
  cd $CARD_REPO_PATH
  export COMMENT_ID=$($NODE ${CLAUDE_PLUGIN_ROOT}/bin/uuid7.mjs)
  cat <<'EOF' > comment/$COMMENT_ID.md
  [completion summary: what was implemented, key decisions, files modified, validation confirmation]
  EOF
  git add comment/$COMMENT_ID.md
  git commit -m "implementation complete"  # <card-repo-commit-style>
  ```

  ```xml
  <invoke name="Task">
  <parameter name="description">Merge</parameter>
  <parameter name="subagent_type">runtime:card:merge</parameter>
  <parameter name="prompt">!` echo "Merge the \"$WORKSPACE_BRANCH\" branch into the \"$BASE_BRANCH\" branch."`</parameter>
  </invoke>
  ```

</instructions>
