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

Run validation per the plan's "Validation Commands" section.

**On any failure:** Create todos with "[Pre-eval fix]" prefix from all validation failures. **Delegate them — do not implement directly.** Return to Step 2.2 of `runtime:card-implementation-with-plan` skill, then assess and delegate the new todos to a developer agent via Steps 2.3–2.4. After fixes, return to Step 1.

Only proceed to **3. Start Maintainer Review** when ALL validations pass.

## 3. Start Maintainer Review

Create the review team and spawn the maintainer. The team stays alive across review iterations — the maintainer persists and retains context from prior reviews.

```xml
<invoke name="TeamCreate">
<parameter name="team_name">review-!` echo $CARD_ID`</parameter>
<parameter name="description">!` echo $CARD_ID`: maintainer review</parameter>
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

You are the maintainer of this repository. Your verdict is final — APPROVED, CHANGES_REQUESTED, or BLOCKED. Evaluate design and approach first, end-to-end wiring second, code quality last. Everything is on the table, including major refactors.
</parameter>
</invoke>
```

## 4. Wait for Review

Wait for the maintainer to deliver the review report via SendMessage.

## 5. Process Verdict

The maintainer's verdict is final. Apply the first matching condition:

1. **BLOCKED**: Shut down the team (Step 8). Document in comment, add `blocked` tag, commit, **STOP**.
2. **CHANGES_REQUESTED**: Proceed to Step 6.
3. **APPROVED**: Shut down the team (Step 8). Proceed to the next step in the implementation workflow.

## 6. Engage with Review

You are a contributor to this repository. Your goal is to submit work that definitely improves the overall code health of the system (Google's Code Review Standard). The maintainer has invested time reviewing your implementation and their feedback is helping you reach that bar. Engage with the review before acting on it.

For each required change, formulate a question that demonstrates you understand the finding and surfaces what you need clarified — the reasoning behind the request, the intended scope, or whether an alternative you're considering would satisfy the concern. Do not ask questions answerable by reading the code.

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

Run validation per the plan's "Validation Commands" section. On failure, delegate fixes (same as Step 2), then stage and re-validate.

Message the maintainer to re-review. Explain what you changed, why, and where you made judgment calls:

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

Return to Step 4.

## 8. Shut Down Team

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

</instructions>
