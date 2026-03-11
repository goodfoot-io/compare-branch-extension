---
name: card-plan-evaluation
description: Assess implementation plan quality using structural and strategic evaluators as a persistent team.
---


<instructions>

## 1. Create Evaluation Team

```xml
<invoke name="TeamCreate">
<parameter name="team_name">plan-eval-!` echo $CARD_ID`</parameter>
<parameter name="description">!` echo $CARD_ID`: plan quality evaluation</parameter>
</invoke>
```

Spawn both evaluators as teammates:

```xml
<invoke name="Agent">
<parameter name="description">Structural plan evaluation</parameter>
<parameter name="subagent_type">runtime:card:plan-structure</parameter>
<parameter name="model">haiku</parameter>
<parameter name="team_name">plan-eval-!` echo $CARD_ID`</parameter>
<parameter name="name">structure-evaluator</parameter>
<parameter name="prompt">
Assess plan structural compliance.

## Card Repository
!` echo $CARD_REPO_PATH`

## Workspace
!` echo $WORKSPACE_PATH`

## Prior Findings
[PRIOR_FINDINGS]

When `[PRIOR_FINDINGS]` is non-empty: prior findings are evidence that this plan has systematic gaps — issues cluster. Apply every structural check with heightened scrutiny. The goal is to surface all remaining issues in this pass so the plan can be fixed completely rather than incrementally.

Read the plan from PLAN.md in the card repository. Assess the plan and send a report per your instructions.

You are a teammate in a plan evaluation team. The strategic evaluator ("strategy-evaluator") is evaluating alongside you. Share noteworthy findings that affect design or integration via SendMessage.
</parameter>
</invoke>
<invoke name="Agent">
<parameter name="description">Strategic plan evaluation</parameter>
<parameter name="subagent_type">runtime:card:plan-strategy</parameter>
<parameter name="model">opus</parameter>
<parameter name="team_name">plan-eval-!` echo $CARD_ID`</parameter>
<parameter name="name">strategy-evaluator</parameter>
<parameter name="prompt">
Evaluate plan design and completeness.

## Card Repository
!` echo $CARD_REPO_PATH`

## Workspace
!` echo $WORKSPACE_PATH`

## Prior Findings
[PRIOR_FINDINGS]

When `[PRIOR_FINDINGS]` is non-empty: prior findings are evidence that this plan has systematic gaps — issues cluster. Apply every evaluation dimension with heightened scrutiny. The goal is to surface all remaining issues in this pass so the plan can be fixed completely rather than incrementally.

1. Read the plan from PLAN.md in the card repository.
2. Verify plan claims against workspace source files (callers, consumers, producers, imports).
3. Assess the plan and send a report per your instructions.

You are a teammate in a plan evaluation team. The structural evaluator ("structure-evaluator") is evaluating alongside you. Share noteworthy findings that affect structural compliance or plan quality via SendMessage.
</parameter>
</invoke>
```

## 2. Wait for Reports

Wait for both agents to complete their initial evaluations and deliver reports.

## 3. Interpret and Act

The structural evaluator returns **"Ready for Implementation: Yes/No"** with issues categorized as CRITICAL/HIGH/MEDIUM/LOW. The strategic evaluator returns an **"Overall Assessment: READY/GAPS/RECONSIDER"**.

Apply the first matching condition:

1. **Structural evaluator returns "No"**: Revise PLAN.md to address the structural issues, then proceed to **4. Send Revision to Team** — structural issues must be fixed before design evaluation matters.
2. **Strategic evaluator returns RECONSIDER**: Revise PLAN.md to address the fundamental design findings, then proceed to **4. Send Revision to Team**.
3. **Structural evaluator returns "Yes" AND Strategic evaluator returns GAPS**: Incorporate the GAPS findings into PLAN.md, then proceed to **4. Send Revision to Team** — gaps are missing specs and must be filled before implementation.
4. **Structural evaluator returns "Yes" AND Strategic evaluator returns READY**: Proceed to **5. Shut Down Team**.

#### After Both Assessments Complete (Always)

1. **Resolve questions through research** — route empirically-testable uncertainties to spike investigation before revising
2. **Surface considerations visibly** as you work through them
3. **Track subjective decisions**: Collect design choices and judgment calls (not factual resolutions like "Is X compatible with Y?") for inclusion in the process comment. These help reviewers know where to focus.
4. **Incorporate process artifacts** from both evaluators (judgment calls, surprises, uncertainty) into your reasoning — these inform the process comment in the implementation workflow.
5. **Make decisions** for non-blocking issues and document them in the plan revision
6. **Only ask the user** for blocking issues or intent clarity

#### If Revision Required (Condition 1, 2, or 3)

Revise PLAN.md per findings, commit to the card repository, then proceed to **4. Send Revision to Team**.

```bash
cd !` echo $CARD_REPO_PATH`
git add PLAN.md
git commit -m "[single sentence summarizing what assessment findings were addressed]"  # <card-repo-commit-style>
```

## 4. Send Revision to Team

Send revision notifications to both evaluators with their prior findings:

```xml
<invoke name="SendMessage">
<parameter name="recipient">structure-evaluator</parameter>
<parameter name="content">
PLAN.md has been revised. Please re-evaluate.

## Revision Summary
[Brief description of what changed in this revision]

## Your Prior Findings
[Paste the structural evaluator's previous report]
</parameter>
</invoke>
<invoke name="SendMessage">
<parameter name="recipient">strategy-evaluator</parameter>
<parameter name="content">
PLAN.md has been revised. Please re-evaluate.

## Revision Summary
[Brief description of what changed in this revision]

## Your Prior Findings
[Paste the strategic evaluator's previous report]
</parameter>
</invoke>
```

Wait for both evaluators to deliver updated reports. Return to **3. Interpret and Act**.

## 5. Shut Down Team

Send shutdown requests to both teammates. Wait for both to acknowledge before deleting the team:

```xml
<invoke name="SendMessage">
<parameter name="type">shutdown_request</parameter>
<parameter name="recipient">structure-evaluator</parameter>
<parameter name="content">Evaluation complete.</parameter>
</invoke>
<invoke name="SendMessage">
<parameter name="type">shutdown_request</parameter>
<parameter name="recipient">strategy-evaluator</parameter>
<parameter name="content">Evaluation complete.</parameter>
</invoke>
```

After both teammates have shut down:

```xml
<invoke name="TeamDelete"/>
```

Proceed to the next step in the implementation workflow.

</instructions>
