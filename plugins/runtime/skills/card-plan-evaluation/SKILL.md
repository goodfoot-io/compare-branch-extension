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

## 2. Wait for Review

Wait for the maintainer to deliver the review report via SendMessage. The maintainer incorporates failure-mode findings at their judgment.

**Failure-mode report not yet arrived when maintainer reports:** Proceed — findings will arrive and can inform revision in Step 5.

## 3. Process Verdict

The maintainer's verdict is final. Apply the first matching condition:

1. **BLOCKED**: Shut down the team (Step 6). Document in comment, add `blocked` tag, commit, **STOP**.
2. **CHANGES_REQUESTED**: Proceed to Step 4.
3. **APPROVED**: Shut down the team (Step 6). Proceed to the next step in the planning workflow. Do not modify gates in `CARD.meta.json`.

## 4. Engage with Review

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

## 5. Revise and Re-submit

For each required change from the maintainer's report:

- **Viable**: Revise PLAN.md to address the finding.
- **Not viable**: Note the reason (e.g., simpler approach doesn't satisfy a constraint, structural requirement doesn't apply given scope).

Review the failure-mode analyst's findings. Approach-level findings — risks inherent to the plan's key bets or complexity disproportionate to the problem — deserve the most consideration. Decide what to do:
- Revise the approach
- Add mitigations
- Acknowledge an accepted risk
- Determine the finding doesn't apply

Not every finding requires a plan change. No response to the failure-mode analyst is required.

Commit the revised plan:

```bash
cd !` echo $CARD_REPO_PATH`
git add PLAN.md
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
