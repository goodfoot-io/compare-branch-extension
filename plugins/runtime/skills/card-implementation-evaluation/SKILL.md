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

Create the review team. Read `EFFORT` from the `<card>` block (default: `medium`). Spawn agents based on effort level:

- **Medium**: Maintainer only
- **High**: Maintainer and failure-mode analyst

The team stays alive across review iterations — agents persist and retain context from prior reviews.

```xml
<invoke name="TeamCreate">
<parameter name="team_name">review-[CARD_ID]</parameter>
<parameter name="description">[CARD_ID]: implementation review</parameter>
</invoke>
```

### Maintainer (medium and high effort)

```xml
<invoke name="Agent">
<parameter name="description">Maintainer review</parameter>
<parameter name="subagent_type">runtime:card:maintainer</parameter>
<parameter name="model">opus</parameter>
<parameter name="team_name">review-[CARD_ID]</parameter>
<parameter name="name">maintainer</parameter>
<parameter name="prompt">
Review this implementation for production readiness.

## Card Repository
[CARD_REPO_PATH]

## Baseline
Changes are relative to git tag: `implement/[CARD_ID]/baseline`

## Modified Files
[PLAN_FILES]

For every claim the code makes about the system — type contracts, error handling assumptions, consumer expectations — verify by running or tracing the code. Do not evaluate claims by reasoning about them. Send a review report per your instructions.
</parameter>
</invoke>
```

### Failure-Mode Analyst (high effort only)

```xml
<invoke name="Agent">
<parameter name="description">Failure mode analysis</parameter>
<parameter name="subagent_type">runtime:card:failure-mode</parameter>
<parameter name="model">opus</parameter>
<parameter name="team_name">review-[CARD_ID]</parameter>
<parameter name="name">failure-mode</parameter>
<parameter name="prompt">
Identify potential failure modes in this implementation.

## Card Repository
[CARD_REPO_PATH]

## Workspace
[WORKSPACE_PATH]

## Baseline
Changes are relative to git tag: `implement/[CARD_ID]/baseline`

Diff the workspace against the baseline to identify changed files. Read every changed file, then search the workspace for consumers of every symbol, type, and file the implementation modifies. The failure modes live in the gap between the implementer's model and the system's actual behavior.
</parameter>
</invoke>
```

## 4. Review Loop

This is an iterative review loop. Each iteration waits for teammates, processes their findings, and revises the code. The loop terminates only when:

- **APPROVED**: A teammate's verdict is APPROVED and no unaddressed findings remain
- **BLOCKED**: A teammate's verdict is BLOCKED

Every code revision requires a full round of re-review from all teammates before the loop can terminate.

### 4.1 Wait for Reports

Wait for reports from all teammates. If some teammates report before others, proceed once at least one report with a verdict arrives — incorporate late-arriving findings when they arrive in Step 4.3.

### 4.2 Process Verdict

Apply the first matching condition:

- **BLOCKED**: Go to Step 5. Document in comment, add `blocked` tag, commit, **STOP**.
- **CHANGES_REQUESTED or unaddressed findings**: Go to Step 4.3.
- **APPROVED and no unaddressed findings**: Go to Step 5. Proceed to the next step in the implementation workflow. Do not modify gates in `CARD.meta.json`.

### 4.3 Engage with Feedback

Your goal is to submit work that definitely improves the overall code health of the system. Engage with findings before acting on them.

For each finding, formulate a question that demonstrates you understand it and surfaces what you need clarified — the reasoning, the intended scope, or whether an alternative would satisfy the concern. Do not ask questions answerable by reading the code.

Every finding must be addressed — "pre-existing" or "not introduced by this change" is not grounds for dismissal. For each finding, decide:
- Fix the code
- Add mitigations
- Acknowledge an accepted risk with explicit justification

**Finding you believe is incorrect:** Present your case with evidence: "I went with X because of [tradeoffs]. My understanding is that Y would be worse because [reasons]. Are you suggesting Y better serves the codebase, or something else?"

**Out-of-scope issues**: If you or a teammate discover a latent issue in code the change does not interact with — visible only through code reading, not through validation output — do not treat it as a finding on this review. Instead, load the `cards:api` skill and create a new card about the issue with a `related` relation to the current card. Add the reciprocal relation to the current card's `CARD.meta.json`. Alert the team via `SendMessage`, then continue. Errors surfaced by validation (tests, lint, typecheck) are never out-of-scope — they must be fixed before proceeding.

### 4.4 Address Changes and Re-submit

For each finding:
- **Viable**: Create a todo with "[Review fix]" prefix. **Delegate — do not implement directly.** Return to Step 2.2 of `runtime:card-implementation-with-plan` skill, then assess and delegate via Steps 2.3–2.4.
- **Not viable**: Note the reason (e.g., attempted but introduced a regression, rejected during planning, blocked by an external constraint).

After all fixes are delegated and complete, stage and re-validate:

```bash
git add -A
git diff --cached --quiet || git commit -m "$(cat <<'COMMITMSG'
[commit message per <workspace-commit-style> — describe the uncommitted changes]
COMMITMSG
)"
```

Run validation per the plan's validation commands. On failure, delegate fixes (same as Step 2), then stage and re-validate.

Make unclear code self-explanatory — explanations in re-submission messages do not help future code readers.

Message all teammates to re-review. Include what changed and why, and feedback for any finding not addressed.

Return to Step 4.1.

## 5. Shut Down Team

Send shutdown messages to all spawned agents. Wait for acknowledgment, then delete the team:

```xml
<invoke name="TeamDelete"/>
```

</instructions>
