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

Only proceed to **3. Start Review** when ALL validations pass.

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

## 4. Review Loop

This is an iterative review loop. Each iteration waits for both the maintainer and failure-mode analyst, then processes their findings. The loop terminates only when one of these conditions is met:

- **APPROVED**: The maintainer's verdict is APPROVED and no unaddressed failure-mode findings remain
- **BLOCKED**: The maintainer's verdict is BLOCKED

Every code revision — whether from maintainer findings, failure-mode findings, or both — requires a full round of re-review from all agents before the loop can terminate.

### 4.1 Wait for Reports

Wait for both the maintainer's review report and the failure-mode analyst's findings.

Based on report arrival:
- **Both arrived**: Proceed to Step 4.2
- **Maintainer arrived, failure-mode pending**: Proceed to Step 4.2 — incorporate failure-mode findings when they arrive in Step 4.4

### 4.2 Process Maintainer Verdict

The maintainer's verdict determines the path. Apply the first matching condition:

- **BLOCKED**: Go to Step 5. Document in comment, add `blocked` tag, commit, **STOP**.
- **CHANGES_REQUESTED**: Go to Step 4.3.
- **APPROVED and no unaddressed failure-mode findings**: Go to Step 5. Proceed to the next step in the implementation workflow. Do not modify gates in `CARD.meta.json`.
- **APPROVED and unaddressed failure-mode findings remain**: Go to Step 4.4 — failure-mode findings may require revision, which triggers re-review.

### 4.3 Engage with Maintainer Review

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

### 4.4 Review Failure-Mode Findings

Review the failure-mode analyst's findings. Approach-level findings — runtime risks, silent failure paths, data flow gaps — deserve the most consideration. Every finding must be addressed — "pre-existing" or "not introduced by this change" is not grounds for dismissal. For each finding, decide:
- Fix the code
- Add mitigations
- Acknowledge an accepted risk with explicit justification of why the risk is tolerable in context

**Out-of-scope issues**: If you or a reviewer discover an issue in code the change does not interact with, do not treat it as a finding on this review. Instead, load the `cards:api` skill and create a new card about the issue with a `related` relation to the current card. Add the reciprocal relation to the current card's `CARD.meta.json`. Alert the team via `SendMessage`, then continue.

### 4.5 Address Changes and Re-submit

For each required change from the maintainer's report:
- **Viable**: Create a todo with "[Review fix]" prefix. **Delegate — do not implement directly.** Return to Step 2.2 of `runtime:card-implementation-with-plan` skill, then assess and delegate via Steps 2.3–2.4.
- **Not viable**: Note the reason (e.g., attempted but introduced a regression, rejected during planning, blocked by an external constraint). Include this in the re-submission message.

Apply any failure-mode fixes decided in Step 4.4 using the same delegation pattern.

After all fixes are delegated and complete, stage and re-validate:

```bash
git add -A
git diff --cached --quiet || git commit -m "$(cat <<'COMMITMSG'
[commit message per <workspace-commit-style> — describe the uncommitted changes]
COMMITMSG
)"
```

Run validation per the plan's validation commands. On failure, delegate fixes (same as Step 2), then stage and re-validate.

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

Return to Step 4.1.

## 5. Shut Down Team

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
