---
name: card-implementation-evaluation
description: Evaluate implementation quality by requesting a maintainer review.
---


<instructions>

## 1. Pre-Evaluation Checkpoint

Commit a checkpoint:

```bash
git add -A  # checkpoint: stage all workspace files before evaluation
git commit --allow-empty -m "checkpoint: before evaluation — implementation complete for card $CARD_ID"
```

## 2. Pre-Evaluation Validation

Run validation per the plan's "Validation Commands" section.

**On any failure:** Create todos with "[Pre-eval fix]" prefix from all validation failures. **Delegate them — do not implement directly.** Return to (Step 2.2 of `runtime:card-implementation-with-plan` skill): checkpoint, then assess and delegate the new todos to a developer agent via Steps 2.3–2.4. After fixes, return to Step 1.

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

You are the maintainer of this repository. Your verdict is final — APPROVED, CHANGES_REQUESTED, or BLOCKED. Evaluate both code quality and end-to-end wiring. Everything is on the table, including major refactors.
</parameter>
</invoke>
```

## 4. Wait for Review

Wait for the maintainer to deliver the review report via SendMessage.

## 5. Process Verdict

The maintainer's verdict is final. Apply the first matching condition:

1. **BLOCKED**: Shut down the team (Step 7). Document in comment, add `blocked` tag, commit, **STOP**.
2. **CHANGES_REQUESTED**: For each required change, assess viability and either delegate the fix or note why it cannot be done (see Step 6). After all changes are addressed, proceed to Step 6.
3. **APPROVED**: Shut down the team (Step 7). Proceed to the next step in the implementation workflow.

## 6. Address Changes and Re-submit

For each required change from the maintainer's report:

- **Viable**: Create a todo with "[Review fix]" prefix. **Delegate — do not implement directly.** Return to [RETURN_POINT] (Step 2.2 of `runtime:card-implementation-with-plan` skill): checkpoint, then assess and delegate via Steps 2.3–2.4.
- **Not viable**: Note the reason (e.g., attempted but introduced a regression, rejected during planning, blocked by an external constraint). Include this in the re-submission message.

After all fixes are delegated and complete, re-checkpoint and re-validate:

```bash
git add -A  # checkpoint: stage all workspace files before re-review
git commit --allow-empty -m "checkpoint: before re-review — fixes applied for card $CARD_ID"
```

Run validation per the plan's "Validation Commands" section. On failure, delegate fixes (same as Step 2), then re-checkpoint.

Message the existing maintainer to re-review. Include feedback on any changes that could not be made:

```xml
<invoke name="SendMessage">
<parameter name="recipient">maintainer</parameter>
<parameter name="content">
Fixes applied. Please re-review.

All validations pass.

## Changes Applied
[List of changes that were made]

## Feedback
[For any requested change that was not made, explain why:
 - what was attempted
 - what went wrong or why it is not viable
 - what alternative (if any) was used instead]
</parameter>
</invoke>
```

Return to Step 4.

## 7. Shut Down Team

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
