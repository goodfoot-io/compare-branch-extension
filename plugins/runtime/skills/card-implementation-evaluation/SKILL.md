---
name: card-implementation-evaluation
description: Evaluate implementation quality using implementation and end-to-end evaluators.
---


<instructions>

## 1. Pre-Evaluation Checkpoint

Commit a checkpoint:

```bash
cd "!` echo $WORKSPACE_PATH`"
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

**On any failure:** Create todos with "[Pre-eval fix]" prefix from all validation failures. **Delegate them — do not implement directly.** Return to (Step 2.2 of `runtime:card-implementation-with-plan` skill): checkpoint, then assess and delegate the new todos to a developer agent via Steps 2.3–2.4.

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
<invoke name="Agent">
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

## Prior Findings
[PRIOR_FINDINGS]

When `[PRIOR_FINDINGS]` is non-empty: prior required findings are evidence that this implementation has systematic gaps — issues cluster. Apply every evaluation dimension with heightened scrutiny. The goal is to surface all remaining issues in this pass so the implementation can be fixed completely rather than incrementally.

You are a teammate in an evaluation team. The end-to-end evaluator ("e2e-evaluator") is evaluating alongside you. Share noteworthy findings that affect wiring or integration via SendMessage.
</parameter>
</invoke>
<invoke name="Agent">
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

## Prior Findings
[PRIOR_FINDINGS]

When `[PRIOR_FINDINGS]` is non-empty: prior required findings are evidence that this implementation has systematic gaps — issues cluster. Apply every evaluation dimension with heightened scrutiny. The goal is to surface all remaining issues in this pass so the implementation can be fixed completely rather than incrementally.

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
2. **Implementation evaluator returns CONTINUE, or end-to-end evaluator returns CONTINUE (required findings exist)**: Create todos from all required findings with "[Eval fix]" prefix (merged from both evaluators, deduplicated by file:line). Populate `[PRIOR_FINDINGS]` with the Required Findings and Recommended Findings sections from both evaluators' reports. **Delegate them — do not implement directly.** Return to [RETURN_POINT] (Step 2.2 of `runtime:card-implementation-with-plan` skill): checkpoint, then assess and delegate the new todos to a developer agent via Steps 2.3–2.4.
3. **Both PRODUCTION_READY/SATISFIES_INTENT, end-to-end evaluator has recommended findings, and `[PRIOR_FINDINGS]` was empty (first evaluation pass)**: Create todos from recommended findings with "[Recommended fix]" prefix. Populate `[PRIOR_FINDINGS]` with the Required Findings and Recommended Findings sections from both evaluators' reports. **Delegate them — do not implement directly.** Return to [RETURN_POINT] (Step 2.2 of `runtime:card-implementation-with-plan` skill): checkpoint, then assess and delegate the new todos to a developer agent via Steps 2.3–2.4.
4. **Both PRODUCTION_READY/SATISFIES_INTENT, and either there are no findings or `[PRIOR_FINDINGS]` was non-empty (subsequent pass)**: Log any recommended findings as a card comment and proceed to the next step in the implementation workflow.

When populating `[PRIOR_FINDINGS]` for the next run, format it as:
```
### Implementation Evaluator — Required Findings
[paste Required Findings section]

### Implementation Evaluator — Recommended Findings
[paste Recommended Findings section]

### End-to-End Evaluator — Required Findings
[paste Required Findings section]

### End-to-End Evaluator — Recommended Findings
[paste Recommended Findings section]
```

Write unresolved recommended findings (if any) as a card comment:

```bash
cd !` echo $CARD_REPO_PATH`
export COMMENT_ID=$($NODE ${CLAUDE_PLUGIN_ROOT}/bin/uuid7.mjs)
cat <<'EOF' > comment/$COMMENT_ID.md
## Recommended Improvements

[unresolved recommended findings from end-to-end evaluator]
EOF
git add comment/$COMMENT_ID.md
git commit -m "[single sentence summarizing the recommended improvements]"  # <card-repo-commit-style>
```

</instructions>
