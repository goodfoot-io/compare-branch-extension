---
name: card-plan-evaluation
description: Assess plan quality by requesting a maintainer review.
---


<instructions>

## 1. Start Review

Create the review team and spawn the maintainer and failure-mode analyst in parallel.

```xml
<invoke name="TeamCreate">
<parameter name="team_name">plan-review-!` echo $CARD_ID`</parameter>
<parameter name="description">!` echo $CARD_ID`: plan review</parameter>
</invoke>
```

```xml
<invoke name="Agent">
<parameter name="description">Failure mode analysis</parameter>
<parameter name="subagent_type">runtime:card:plan-failure-mode</parameter>
<parameter name="model">opus</parameter>
<parameter name="team_name">plan-review-!` echo $CARD_ID`</parameter>
<parameter name="name">plan-failure-mode</parameter>
<parameter name="prompt">
Identify potential failure modes in this implementation plan.

## Card Repository
!` echo $CARD_REPO_PATH`

## Workspace
!` echo $WORKSPACE_PATH`

Read the plan from PLAN.md in the card repository. Read the workspace source files the plan references — then search the workspace for consumers of every symbol, type, and file the plan modifies. The failure modes live in the gap between the plan's model and the system's actual behavior.
</parameter>
</invoke>
```

```xml
<invoke name="Agent">
<parameter name="description">Plan maintainer review</parameter>
<parameter name="subagent_type">runtime:card:plan-maintainer</parameter>
<parameter name="model">opus</parameter>
<parameter name="team_name">plan-review-!` echo $CARD_ID`</parameter>
<parameter name="name">maintainer</parameter>
<parameter name="prompt">
Review this implementation plan for quality and completeness.

## Card Repository
!` echo $CARD_REPO_PATH`

## Workspace
!` echo $WORKSPACE_PATH`

Read the plan from PLAN.md in the card repository. For every claim the plan makes about the codebase, search the workspace to confirm or refute it — do not evaluate claims by reasoning about them. Send a review report per your instructions.
</parameter>
</invoke>
```

## 2. Review Loop

This is an iterative review loop. Each iteration waits for both the maintainer and failure-mode analyst, then processes their findings. The loop terminates only when one of these conditions is met:

- **APPROVED**: The maintainer's verdict is APPROVED and no unaddressed failure-mode findings remain
- **BLOCKED**: The maintainer's verdict is BLOCKED

Every plan revision — whether from maintainer findings, failure-mode findings, or both — requires a full round of re-review from all agents before the loop can terminate.

### 2.1 Wait for Reports

Wait for both the maintainer's review report and the failure-mode analyst's findings.

Based on report arrival:
- **Both arrived**: Proceed to Step 2.2
- **Maintainer arrived, failure-mode pending**: Proceed to Step 2.2 — incorporate failure-mode findings when they arrive in Step 2.4

### 2.2 Process Maintainer Verdict

The maintainer's verdict determines the path. Apply the first matching condition:

- **BLOCKED**: Go to Step 3. Document in comment, add `blocked` tag, commit, **STOP**.
- **CHANGES_REQUESTED**: Go to Step 2.3.
- **APPROVED and no unaddressed failure-mode findings**: Go to Step 3. Proceed to the next step in the planning workflow. Do not modify gates in `CARD.meta.json`.
- **APPROVED and unaddressed failure-mode findings remain**: Go to Step 2.4 — failure-mode findings may require revision, which triggers re-review.

### 2.3 Engage with Maintainer Review

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
Thank you for the review. Before I revise, I want to make sure I understand your findings:

[For each finding that warrants discussion:]
- **[Finding reference]**: [What you understand about the concern, and what you need clarified or want to propose as an alternative]

[Any broader questions about approach or direction]
</parameter>
</invoke>
```

Wait for the maintainer's response.
- Route empirically-testable uncertainties to spike investigation before revising.
- Make decisions for non-blocking issues and document them in the plan revision.

### 2.4 Review Failure-Mode Findings

Review the failure-mode analyst's findings. Approach-level findings — risks inherent to the plan's key bets or complexity disproportionate to the problem — deserve the most consideration. For each finding, decide:
- Revise the approach
- Add mitigations
- Acknowledge an accepted risk
- Determine the finding doesn't apply

Not every finding requires a plan change.

### 2.5 Revise and Re-submit

For each required change from the maintainer's report:
- **Viable**: Revise PLAN.md to address the finding.
- **Not viable**: Note the reason (e.g., simpler approach doesn't satisfy a constraint, structural requirement doesn't apply given scope).

Apply any failure-mode revisions decided in Step 2.4.

Update `PLAN.md.meta.json` if the approach or intent changed. Commit the revised plan:

```bash
cd !` echo $CARD_REPO_PATH`
git add PLAN.md PLAN.md.meta.json
git commit -m "[single sentence summarizing what findings were addressed]"  # <card-repo-commit-style>
```

Make unclear plan sections self-explanatory — explanations in the re-submission message do not help future readers of PLAN.md.

Message both the maintainer and failure-mode analyst to re-review. Explain what you changed, why, and where you made judgment calls:

```xml
<invoke name="SendMessage">
<parameter name="recipient">maintainer</parameter>
<parameter name="content">
I've revised the plan based on your review. Here's what I changed and why:

## Changes Applied
[For each finding addressed:]
- **[Finding reference]**: [What was changed and the reasoning behind the approach]

## Feedback
[For any requested change that was not made:]
- **[Finding reference]**: [What was considered, why it is not viable, and what alternative (if any) was used instead]
</parameter>
</invoke>
```

```xml
<invoke name="SendMessage">
<parameter name="recipient">plan-failure-mode</parameter>
<parameter name="content">
The plan has been revised. Re-read PLAN.md and send updated findings to both the team lead and the maintainer.
</parameter>
</invoke>
```

Return to Step 2.1.

## 3. Shut Down Team

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
<parameter name="recipient">plan-failure-mode</parameter>
<parameter name="content">Review complete.</parameter>
</invoke>
```

After both agents have shut down:

```xml
<invoke name="TeamDelete"/>
```

Proceed to the next step in the planning workflow.

</instructions>
