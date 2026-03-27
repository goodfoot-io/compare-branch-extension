---
name: card-plan-evaluation
description: Assess plan quality by requesting a maintainer review.
---


<instructions>

## 1. Start Review

Create the review team and spawn the maintainer and failure-mode analyst. Both begin analysis immediately in parallel. The failure-mode analyst typically finishes first and sends findings to the maintainer during their review, giving the maintainer richer input for the first pass.

```xml
<invoke name="TeamCreate">
<parameter name="team_name">plan-review-!` echo $CARD_ID`</parameter>
<parameter name="description">!` echo $CARD_ID`: plan review</parameter>
</invoke>
```

```xml
<invoke name="Agent">
<parameter name="description">Failure mode analysis</parameter>
<parameter name="subagent_type">runtime:card:failure-mode</parameter>
<parameter name="model">opus</parameter>
<parameter name="team_name">plan-review-!` echo $CARD_ID`</parameter>
<parameter name="name">failure-mode</parameter>
<parameter name="prompt">
Identify potential failure modes in this implementation plan.

## Card Repository
!` echo $CARD_REPO_PATH`

## Workspace
!` echo $WORKSPACE_PATH`

Read the plan from PLAN.md in the card repository. Read the workspace source files the plan references. Identify ways the approach could fail when built.
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

Read the plan from PLAN.md in the card repository. Verify plan claims against workspace source files. Send a review report per your instructions.

You are the maintainer of this repository. Your verdict is final — APPROVED, CHANGES_REQUESTED, or BLOCKED. Evaluate strategy and design first, completeness second, structure last. Everything is on the table, including fundamental redesigns.
</parameter>
</invoke>
```

## 2. Wait for Review

Wait for the maintainer to deliver the review report via SendMessage. The failure-mode analyst's findings may arrive before or during the maintainer's review — the maintainer incorporates them at their judgment. If the failure-mode report has not arrived by the time the maintainer reports, proceed — failure-mode findings will arrive and can inform the revision in Step 5.

## 3. Process Verdict

The maintainer's verdict is final. Apply the first matching condition:

1. **BLOCKED**: Shut down the team (Step 6). Document in comment, add `blocked` tag, commit, **STOP**.
2. **CHANGES_REQUESTED**: Proceed to Step 4.
3. **APPROVED**: Shut down the team (Step 6). Proceed to the next step in the planning workflow. Do not modify gates in `CARD.meta.json`.

## 4. Engage with Review

You are a contributor to this repository. Your goal is to submit work that definitely improves the overall code health of the system (Google's Code Review Standard). The maintainer has invested time reviewing your plan and their feedback is helping you reach that bar. Engage with the review before acting on it.

For each required change, formulate a question that demonstrates you understand the finding and surfaces what you need clarified — the reasoning behind the request, the intended scope, or whether an alternative you're considering would satisfy the concern. If you believe a finding is incorrect, present your case with evidence: "I went with X because of [tradeoffs]. My understanding is that Y would be worse because [reasons]. Are you suggesting Y better serves the codebase, or something else?" Do not ask questions answerable by reading the code.

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

Wait for the maintainer's response. Route empirically-testable uncertainties to spike investigation before revising. Make decisions for non-blocking issues and document them in the plan revision.

## 5. Revise and Re-submit

For each required change from the maintainer's report:

- **Viable**: Revise PLAN.md to address the finding.
- **Not viable**: Note the reason (e.g., simpler approach doesn't satisfy a constraint, structural requirement doesn't apply given scope).

Review the failure-mode analyst's findings. Approach-level findings — where the analyst identifies risks inherent to the plan's key bets or complexity disproportionate to the problem — deserve the most consideration. Decide what to do: revise the approach, add mitigations, acknowledge an accepted risk, or determine the finding doesn't apply. Not every finding requires a plan change. No response to the failure-mode analyst is required.

Commit the revised plan:

```bash
cd !` echo $CARD_REPO_PATH`
git add PLAN.md
git commit -m "[single sentence summarizing what findings were addressed]"  # <card-repo-commit-style>
```

When a finding reveals an unclear plan section, revise the plan to be self-explanatory — explanations in the re-submission message do not help future readers of PLAN.md.

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
<parameter name="recipient">failure-mode</parameter>
<parameter name="content">
The plan has been revised. Re-read PLAN.md and send updated findings to both the team lead and the maintainer.
</parameter>
</invoke>
```

Return to Step 2.

## 6. Shut Down Team

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

Proceed to the next step in the planning workflow.

</instructions>
