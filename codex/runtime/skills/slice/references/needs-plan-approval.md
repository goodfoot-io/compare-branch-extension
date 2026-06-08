
<instructions>

The Slice action does not plan. This card has `gates.planRequired=true` and the plan has not been approved, so slicing cannot proceed until the plan gate is cleared.

## 1. Determine Plan State

Check whether the card repository's `plan/` directory contains any `.md` files:

```bash
cd "$CARD_REPO_PATH"
ls plan/*.md 2>/dev/null
```

Based on the result:
- **No plan files**: A plan has not been written. Proceed to Step 2 with `PLAN_STATE=missing`.
- **Plan files exist**: A plan is written but `planApproved` is false. Proceed to Step 2 with `PLAN_STATE=unapproved`.

## 2. Post a Comment and Stop

Skip if an open comment already exists that describes the same `PLAN_STATE`.

Write a comment explaining the handoff and what the user should do next:

```bash
cd "$CARD_REPO_PATH"
cat <<'EOF' > comment/needs-plan-approval.md
[PLAN_STATE=missing: explain that this card requires a plan (gates.planRequired=true) but none is written. Ask the user to run the Launch action so $runtime:card can route through card-plan, or to clear gates.planRequired if slicing without a plan is appropriate.]

[PLAN_STATE=unapproved: name the files in plan/ and explain that gates.planApproved is false. Ask the user to review the plan and approve it, after which the next Slice session will proceed to implementation.]
EOF
git add comment/needs-plan-approval.md
git commit -m "[single sentence naming which plan gate is blocking slicing and what the user should do]"  # <card-repo-commit-style>
```

**STOP** — Do not proceed until the plan gate is cleared. Routing will re-evaluate on the next session.

</instructions>
