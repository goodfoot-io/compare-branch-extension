---
name: card-implementation-evaluation
description: Evaluate implementation quality using implementation and end-to-end evaluators.
---


<instructions>

## 1. Pre-Evaluation Checkpoint

Commit a checkpoint:

```bash
cd $WORKSPACE_PATH
git add -A  # checkpoint: stage all workspace files before evaluation
git commit --allow-empty -m "checkpoint: before evaluation — implementation complete for card $CARD_ID"
```

## 2. Synthesize Commander's Intent

Identify the `CARD.md` goals.

Synthesize [COMMANDERS_INTENT] — a 2-4 sentence statement capturing:
- The problem the card exists to solve
- The outcome the user expects
- Any implicit requirements beyond the plan's literal tasks
- Behavioral invariants that must hold across all code paths — if the feature has multiple data sources (initial load, real-time events, cache), state that they must produce equivalent results for consumers

## 3. Pre-Evaluation Validation

Run validation per the plan's "Validation Commands" section.

**On any failure:** Create todos with "[Pre-eval fix]" prefix from all validation failures, return to task execution in the implementation steps.

Only proceed to **4. Create Evaluation Team** when ALL validations pass.

## 4. Create Evaluation Team

```xml
<invoke name="TeamCreate">
<parameter name="team_name">eval-!` echo $CARD_ID`</parameter>
<parameter name="description">!` echo $CARD_ID`: quality evaluation</parameter>
</invoke>
```

Spawn both evaluators as teammates:

```xml
<invoke name="Task">
<parameter name="description">Implementation evaluation</parameter>
<parameter name="subagent_type">runtime:card:implementation-evaluator</parameter>
<parameter name="model">haiku</parameter>
<parameter name="team_name">eval-!` echo $CARD_ID`</parameter>
<parameter name="name">impl-evaluator</parameter>
<parameter name="prompt">
Evaluate for production readiness.

## Card Repository
!` echo $CARD_REPO_PATH`

## Validation Status
All validation commands from the plan's "Validation Commands" section passed before this evaluation was launched.

## Baseline
Changes are relative to git tag: `implement/!` echo $CARD_ID`/baseline`

## Modified Files
[PLAN_FILES]

You are a teammate in an evaluation team. The end-to-end evaluator ("e2e-evaluator") is evaluating alongside you. Share noteworthy findings that affect wiring or integration via SendMessage.
</parameter>
</invoke>
<invoke name="Task">
<parameter name="description">End-to-end evaluation</parameter>
<parameter name="subagent_type">runtime:card:end-to-end-evaluator</parameter>
<parameter name="model">opus</parameter>
<parameter name="team_name">eval-!` echo $CARD_ID`</parameter>
<parameter name="name">e2e-evaluator</parameter>
<parameter name="prompt">
Evaluate implementation against commander's intent.

## Commander's Intent
[COMMANDERS_INTENT]

## Card Repository
!` echo $CARD_REPO_PATH`

## Validation Status
All validation commands from the plan's "Validation Commands" section passed before this evaluation was launched.

## Baseline
Changes are relative to git tag: `implement/!` echo $CARD_ID`/baseline`

## Modified Files
[PLAN_FILES]

You are a teammate in an evaluation team. The implementation evaluator ("impl-evaluator") is evaluating code quality alongside you. Share noteworthy findings that affect code quality or structure via SendMessage.
</parameter>
</invoke>
```

## 5. Wait for Reports

Wait for both agents to complete their evaluations and deliver reports.

## 6. Shut Down Team

Send shutdown requests to both teammates. Wait for both to acknowledge before deleting the team:

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

After both teammates have shut down:

```xml
<invoke name="TeamDelete"/>
```

## 7. Process Results

Apply the first matching condition:
1. **Either evaluator returns BLOCKED**: Document in comment, add `blocked` tag, commit, **STOP**
2. **Implementation evaluator returns CONTINUE, or end-to-end evaluator returns CONTINUE (required findings exist)**: Create todos from all findings — required with "[Eval fix]" prefix, recommended with "[Recommended fix]" prefix (merged from both evaluators, deduplicated by file:line), return to task execution in the implementation steps. Some findings may predate the current implementation — fix them the same way.
3. **Both PRODUCTION_READY/SATISFIES_INTENT, but end-to-end evaluator has recommended findings**: Create todos from recommended findings with "[Recommended fix]" prefix, return to task execution in the implementation steps. If the prior fix iteration's changes were confined to test and documentation files, log unresolved recommendations as a card comment and proceed to the next step in the implementation workflow.
4. **Both PRODUCTION_READY/SATISFIES_INTENT with no findings**: Proceed to the next step in the implementation workflow.

Write unresolved recommended findings (if any) as a card comment:

```bash
cd $CARD_REPO_PATH
export COMMENT_ID=$($NODE ${CLAUDE_PLUGIN_ROOT}/bin/uuid7.mjs)
cat <<'EOF' > comment/$COMMENT_ID.md
## Recommended Improvements

[unresolved recommended findings from end-to-end evaluator]
EOF
git add comment/$COMMENT_ID.md
git commit -m "[single sentence summarizing the recommended improvements]"  # <card-repo-commit-style>
```

</instructions>
