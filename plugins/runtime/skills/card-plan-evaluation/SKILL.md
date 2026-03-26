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

1. **BLOCKED**: Shut down the team (Step 5). Document in comment, add `blocked` tag, commit, **STOP**.
2. **CHANGES_REQUESTED**: For each required change, assess viability and either revise PLAN.md or note why it cannot be done (see Step 4).
3. **APPROVED**: Shut down the team (Step 5). Proceed to the next step in the planning workflow.

### After Both Assessments Complete (Always)

1. **Resolve questions through research** — route empirically-testable uncertainties to spike investigation before revising
2. **Surface considerations visibly** as you work through them
3. **Make decisions** for non-blocking issues and document them in the plan revision
4. **Only ask the user** for blocking issues or intent clarity

Be thorough in your edits and analysis. Ask the maintainer for feedback on ideas and strategies using `SendMessage`. Trace all areas to understand the edges of the plan.

## 4. Revise and Re-submit

For each required change from the maintainer's report:

- **Viable**: Revise PLAN.md to address the finding.
- **Not viable**: Note the reason (e.g., simpler approach doesn't satisfy a constraint, structural requirement doesn't apply given scope).

Commit the revised plan:

```bash
cd !` echo $CARD_REPO_PATH`
git add PLAN.md
git commit -m "[single sentence summarizing what findings were addressed]"  # <card-repo-commit-style>
```

Message the existing maintainer to re-review. Include feedback on any changes that could not be made:

```xml
<invoke name="SendMessage">
<parameter name="recipient">maintainer</parameter>
<parameter name="content">
PLAN.md has been revised. Please re-review.

## Changes Applied
[List of changes that were made]

## Feedback
[For any requested change that was not made, explain why:
 - what was considered
 - why it is not viable or doesn't apply
 - what alternative (if any) was used instead]
</parameter>
</invoke>
```

Return to Step 2.

## 5. Shut Down Team

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
