---
name: card-implementation-evaluation
description: Evaluate implementation quality by requesting a maintainer review.
---


<instructions>

## 1. Stage Uncommitted Changes

Ensure all workspace changes are committed before evaluation:

```bash
git add -A
git diff --cached --quiet || git commit -m "$(cat <<'COMMITMSG'
[commit message per <workspace-commit-style> — describe the uncommitted changes]
COMMITMSG
)"
```

## 2. Pre-Evaluation Validation

Run validation per the plan's validation commands.

**On any failure:** Create todos with "[Pre-eval fix]" prefix from all validation failures. **Delegate them — do not implement directly.** Return to Step 2.2 of `runtime:card-implementation-with-plan` skill, then assess and delegate the new todos to a developer agent via Steps 2.3–2.4. After fixes, return to Step 1.

Only proceed to **3. Start Maintainer Review** when ALL validations pass.

## 3. Start Review

Create the review team and spawn the maintainer and failure-mode analyst in parallel. The team stays alive across review iterations — both agents persist and retain context from prior reviews.

```xml
<invoke name="TeamCreate">
<parameter name="team_name">review-!` echo $CARD_ID`</parameter>
<parameter name="description">!` echo $CARD_ID`: implementation review</parameter>
</invoke>
```

```xml
<invoke name="Agent">
<parameter name="description">Failure mode analysis</parameter>
<parameter name="subagent_type">runtime:card:failure-mode</parameter>
<parameter name="model">opus</parameter>
<parameter name="team_name">review-!` echo $CARD_ID`</parameter>
<parameter name="name">failure-mode</parameter>
<parameter name="prompt">
Identify potential failure modes in this implementation.

## Card Repository
!` echo $CARD_REPO_PATH`

## Workspace
!` echo $WORKSPACE_PATH`

## Baseline
Changes are relative to git tag: `implement/!` echo $CARD_ID`/baseline`

Diff the workspace against the baseline to identify changed files. Read every changed file, then search the workspace for consumers of every symbol, type, and file the implementation modifies. The failure modes live in the gap between the implementer's model and the system's actual behavior.
</parameter>
</invoke>
```

```xml
<invoke name="Agent">
<parameter name="description">Maintainer review</parameter>
<parameter name="subagent_type">runtime:card:maintainer</parameter>
<parameter name="model">opus</parameter>
<parameter name="team_name">review-!` echo $CARD_ID`</parameter>
<parameter name="name">maintainer</parameter>
<parameter name="prompt">
Review this implementation for production readiness.

## Card Repository
!` echo $CARD_REPO_PATH`

## Baseline
Changes are relative to git tag: `implement/!` echo $CARD_ID`/baseline`

## Modified Files
[PLAN_FILES]

For every claim the code makes about the system — type contracts, error handling assumptions, consumer expectations — verify by running or tracing the code. Do not evaluate claims by reasoning about them. Send a review report per your instructions.
</parameter>
</invoke>
```

## 4. Wait for Review

Wait for the maintainer to deliver the review report via SendMessage. The maintainer incorporates failure-mode findings at their judgment.

**Failure-mode report not yet arrived when maintainer reports:** Proceed — findings will arrive and can inform revision in Step 7.

## 5. Process Verdict

The maintainer's verdict is final. Apply the first matching condition:

1. **BLOCKED**: Shut down the team (Step 8). Document in comment, add `blocked` tag, commit, **STOP**.
2. **CHANGES_REQUESTED**: Proceed to Step 6.
3. **APPROVED**: Shut down the team (Step 8). Proceed to the next step in the implementation workflow. Do not modify gates in `CARD.meta.json`.

## 6. Engage with Review

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
Thank you for the review. Before I address these, I want to make sure I understand your findings:

[For each finding that warrants discussion:]
- **[Finding reference]**: [What you understand about the concern, and what you need clarified or want to propose as an alternative]

[Any broader questions about approach or direction]
</parameter>
</invoke>
```

Wait for the maintainer's response. Use their answers to inform your fixes.

## 7. Address Changes and Re-submit

For each required change from the maintainer's report:

- **Viable**: Create a todo with "[Review fix]" prefix. **Delegate — do not implement directly.** Return to Step 2.2 of `runtime:card-implementation-with-plan` skill, then assess and delegate via Steps 2.3–2.4.
- **Not viable**: Note the reason (e.g., attempted but introduced a regression, rejected during planning, blocked by an external constraint). Include this in the re-submission message.

After all fixes are delegated and complete, stage and re-validate:

```bash
git add -A
git diff --cached --quiet || git commit -m "$(cat <<'COMMITMSG'
[commit message per <workspace-commit-style> — describe the uncommitted changes]
COMMITMSG
)"
```

Run validation per the plan's validation commands. On failure, delegate fixes (same as Step 2), then stage and re-validate.

Review the failure-mode analyst's findings. Approach-level findings — runtime risks, silent failure paths, data flow gaps — deserve the most consideration. Decide what to do:
- Fix the code
- Add mitigations
- Acknowledge an accepted risk
- Determine the finding doesn't apply

Not every finding requires a code change. No response to the failure-mode analyst is required.

Make unclear code self-explanatory — explanations in the re-submission message do not help future code readers.

Message both the maintainer and failure-mode analyst to re-review. Explain what you changed, why, and where you made judgment calls:

```xml
<invoke name="SendMessage">
<parameter name="recipient">maintainer</parameter>
<parameter name="content">
I've addressed your review findings. Here's what I changed and why:

All validations pass.

## Changes Applied
[For each finding addressed:]
- **[Finding reference]**: [What was changed and the reasoning behind the approach]

## Feedback
[For any requested change that was not made:]
- **[Finding reference]**: [What was attempted, why it is not viable, and what alternative (if any) was used instead]
</parameter>
</invoke>
```

```xml
<invoke name="SendMessage">
<parameter name="recipient">failure-mode</parameter>
<parameter name="content">
The implementation has been revised. Diff the workspace against the baseline again and send updated findings to both the team lead and the maintainer.
</parameter>
</invoke>
```

Return to Step 4.

## 8. Shut Down Team

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

</instructions>
