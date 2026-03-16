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

## 2. Synthesize Commander's Intent

Identify the `CARD.md` goals.

Synthesize [COMMANDERS_INTENT] — a 2-4 sentence statement capturing:
- The problem the card exists to solve
- The outcome the user expects
- Any implicit requirements beyond the plan's literal tasks
- Behavioral invariants that must hold across all code paths — if the feature has multiple data sources (initial load, real-time events, cache), state that they must produce equivalent results for consumers

## 3. Pre-Evaluation Validation

Run validation per the plan's "Validation Commands" section.

**On any failure:** Create todos with "[Pre-eval fix]" prefix from all validation failures. **Delegate them — do not implement directly.** Return to (Step 2.2 of `runtime:card-implementation-with-plan` skill): checkpoint, then assess and delegate the new todos to a developer agent via Steps 2.3–2.4.

Only proceed to **4. Request Maintainer Review** when ALL validations pass.

## 4. Request Maintainer Review

```xml
<invoke name="TeamCreate">
<parameter name="team_name">review-!` echo $CARD_ID`</parameter>
<parameter name="description">!` echo $CARD_ID`: maintainer review</parameter>
</invoke>
```

Spawn the maintainer as a teammate:

```xml
<invoke name="Agent">
<parameter name="description">Maintainer review</parameter>
<parameter name="subagent_type">runtime:card:maintainer</parameter>
<parameter name="model">opus</parameter>
<parameter name="team_name">review-!` echo $CARD_ID`</parameter>
<parameter name="name">maintainer</parameter>
<parameter name="prompt">
Review this implementation for production readiness.

## Commander's Intent
[COMMANDERS_INTENT]

## Card Repository
!` echo $CARD_REPO_PATH`

## Baseline
Changes are relative to git tag: `implement/!` echo $CARD_ID`/baseline`

## Modified Files
[PLAN_FILES]

## Prior Findings
[PRIOR_FINDINGS]

You are the maintainer of this repository. Your verdict is final — APPROVED, CHANGES_REQUESTED, or BLOCKED. Evaluate both code quality and end-to-end wiring. Everything is on the table, including major refactors.
</parameter>
</invoke>
```

## 5. Wait for Review

Wait for the maintainer to complete the review and deliver the report.

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

## 7. Process Verdict

The maintainer's verdict is final. Apply the first matching condition:

1. **BLOCKED**: Document in comment, add `blocked` tag, commit, **STOP**
2. **CHANGES_REQUESTED**: Create todos from all required changes with "[Review fix]" prefix. Populate `[PRIOR_FINDINGS]` with the Required Changes and Recommended Changes sections from the maintainer's report. **Delegate them — do not implement directly.** Return to [RETURN_POINT] (Step 2.2 of `runtime:card-implementation-with-plan` skill): checkpoint, then assess and delegate the new todos to a developer agent via Steps 2.3–2.4.
3. **APPROVED with recommended changes and `[PRIOR_FINDINGS]` was empty (first review pass)**: Create todos from recommended changes with "[Recommended fix]" prefix. Populate `[PRIOR_FINDINGS]` with the Required Changes and Recommended Changes sections from the maintainer's report. **Delegate them — do not implement directly.** Return to [RETURN_POINT] (Step 2.2 of `runtime:card-implementation-with-plan` skill): checkpoint, then assess and delegate the new todos to a developer agent via Steps 2.3–2.4.
4. **APPROVED with no required changes, and either no recommended changes or `[PRIOR_FINDINGS]` was non-empty (subsequent pass)**: Log any recommended changes as a card comment and proceed to the next step in the implementation workflow.

When populating `[PRIOR_FINDINGS]` for the next run, format it as:
```
### Required Changes
[paste Required Changes section from maintainer's report]

### Recommended Changes
[paste Recommended Changes section from maintainer's report]
```

Write unresolved recommended changes (if any) as a card comment:

```bash
cd !` echo $CARD_REPO_PATH`
export COMMENT_ID=$($NODE ${CLAUDE_PLUGIN_ROOT}/bin/uuid7.mjs)
cat <<'EOF' > comment/$COMMENT_ID.md
## Recommended Improvements

[unresolved recommended changes from maintainer review]
EOF
git add comment/$COMMENT_ID.md
git commit -m "[single sentence summarizing the recommended improvements]"  # <card-repo-commit-style>
```

</instructions>
