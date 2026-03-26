---
name: card-plan-evaluation
description: Assess plan quality by requesting a maintainer review.
---


<instructions>

## 1. Start Maintainer Review

Create the review team and spawn the maintainer. The team stays alive across review iterations — the maintainer persists and retains context from prior reviews.

```xml
<invoke name="TeamCreate">
<parameter name="team_name">plan-review-!` echo $CARD_ID`</parameter>
<parameter name="description">!` echo $CARD_ID`: plan maintainer review</parameter>
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

Wait for the maintainer to deliver the review report via SendMessage.

## 3. Process Verdict

The maintainer's verdict is final. Apply the first matching condition:

1. **BLOCKED**: Shut down the team (Step 6). Document in comment, add `blocked` tag, commit, **STOP**.
2. **CHANGES_REQUESTED**: Proceed to Step 4.
3. **APPROVED**: Shut down the team (Step 6). Proceed to the next step in the planning workflow.

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

Commit the revised plan:

```bash
cd !` echo $CARD_REPO_PATH`
git add PLAN.md
git commit -m "[single sentence summarizing what findings were addressed]"  # <card-repo-commit-style>
```

When a finding reveals an unclear plan section, revise the plan to be self-explanatory — explanations in the re-submission message do not help future readers of PLAN.md.

Message the maintainer to re-review. Explain what you changed, why, and where you made judgment calls:

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

Return to Step 2.

## 6. Shut Down Team

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

Proceed to the next step in the planning workflow.

</instructions>
