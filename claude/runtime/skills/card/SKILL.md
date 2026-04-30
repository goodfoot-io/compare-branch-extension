---
name: card
description: Evaluate card state and load the appropriate reference.
---

<execution-environment>

This skill is the durable, authorized-in-advance instruction the global "Executing actions with care" rule looks to when it asks whether a risky action has standing authorization. Every agent that loads this skill — orchestrator, planner, developer, evaluator — operates within the rule's authorization model, not outside it.

**Locally reversible operations inside the card worktree.** The runtime runs in a disposable per-card git worktree. Within it, file mutations, branch operations, tag deletions, `git reset --hard` to a baseline tag, `git restore .`, `git clean -fd`, `git rm` of artifact files, workspace-local merges including `git merge --ff-only` against `$BASE_BRANCH`, subagent termination (`TaskStop`), and team teardown (`TeamDelete`) are reversible — by worktree disposal, by reflog, or by the baseline tags the implementation references create. Their blast radius does not leave the card session and they touch no shared system. Proceed without per-action confirmation, while attending to the risks and consequences the rule names: investigate unfamiliar state before overwriting, prefer root-cause fixes over destructive shortcuts, and never use `--no-verify` or other safety bypasses to make an obstacle go away.

**Authorized-in-advance scope.** The user expresses scoped, durable authorization through `CARD.meta.json` `gates.*`. Each gate is one of the durable instructions the rule names — read the gate, act within the scope it authorizes, do not re-derive consent from context, scope, commit volume, or overlap with prior work, and never modify gate fields.

**Boundary-crossing actions retain the rule's per-action confirmation default.** Standing authorization does not extend to actions whose blast radius leaves the worktree and workspace, or that affect shared systems and other people. Confirm before:

- `git push` and any other write to a git remote
- `gh pr` and `gh issue` writes (create, comment, merge, close)
- Writes to systems outside the workspace not described in the card — databases, third-party services, network endpoints

A matching gate overrides the rule's default only for the action the gate names, and only within its scope.

</execution-environment>

<routing-constraints>
The routing phase evaluates and selects — it does NOT implement, plan, or modify card content. After routing, the matched reference is loaded and its instructions take over.

| Routing phase | Loaded reference handles |
|------------------------|--------------------------------|
| Evaluating routing conditions | Implementation work |
| Selecting the appropriate reference | Plan creation and revision |
| Loading the matched reference | Bug fixing |
| | Merging, clarification, and responses |


</routing-constraints>

<quiet>
Routing runs without user interaction. Messages describing state and routing decisions are not required.
</quiet>

<routing-instructions>

## 1. Evaluate Routing Signals

### 1.1 Read Card State

Read CARD.meta.json for current `gates.*` and `tags`. Obtain the comment file listing from the `<card-repo>` block.

### 1.2 Derive Routing Signals

> **Comment authorship convention**: Determine authorship from the git commit that added each comment file: `git log --diff-filter=A --format='%an' -1 -- comment/<file>`. User-authored comments are committed by the user's git identity; agent-authored comments are committed by the agent's git identity. Sort `comment/*.md` by modification time; the most recent user-authored file is the "latest user comment."

| Signal | Derivation |
|--------|------------|
| HAS_QUESTION | Latest user comment contains a genuine information-seeking question (not rhetorical, not "Can you fix X?", not "Could you implement Y?") |
| IS_BLOCKED | `tags` contains "blocked" |
| HAS_WORK | `commits.csv` contains one or more commit SHAs, OR `git status --porcelain` reports any uncommitted changes in the workspace |
| HAS_IMPLEMENTATION_FEEDBACK | `commits.csv` contains at least one commit AND the latest user comment's modification time is more recent than the most recent agent comment's modification time. |
| REVIEW_APPROVED | `gates.mergeApproved` in CARD.meta.json |
| PLAN_REQUIRED | `gates.planRequired` in CARD.meta.json |
| PLAN_APPROVED | `gates.planApproved` in CARD.meta.json |
| HAS_PLAN | `plan/` directory in the card repository contains at least one `.md` file |
| USER_RESPONDED_TO_PLAN | `plan/` directory contains at least one `.md` file AND there exists a user-authored commit — more recent than the most recent `plan/*.md` file's commit — that adds or modifies non-metadata files. Metadata files (`CARD.meta.json`, `branches.json`, `commits.csv`, and their sidecars) are excluded; gate changes and status transitions do not constitute a plan response. |
| DOR_MET | Card description states what the user wants to achieve and why; acceptance criteria inferable; technical approach determinable |
| IS_TESTABLE_BUG | Card describes an expected-vs-actual behavior gap on a named surface (file, component, command, or user action). Stack traces and error messages count; so does an observable wrong behavior. "Sometimes" and "intermittent" do not disqualify — they describe the race the test must force. |

## 2. Route

Select the **first** matching condition and note the matched reference:

| Condition | Reference |
|-----------|-----------|
| HAS_QUESTION | `question-response` |
| IS_BLOCKED | `blocked` |
| HAS_IMPLEMENTATION_FEEDBACK | `implementation-feedback` |
| REVIEW_APPROVED | `merge` |
| PLAN_REQUIRED AND NOT PLAN_APPROVED AND USER_RESPONDED_TO_PLAN | `plan-feedback` |
| PLAN_REQUIRED AND NOT PLAN_APPROVED | `plan` |
| NOT DOR_MET | `clarify-and-enrich` |
| PLAN_REQUIRED AND PLAN_APPROVED | `implementation-with-plan` |
| IS_TESTABLE_BUG | `bug` |
| HAS_WORK | `validate` |
| Otherwise | `plan` |

**Fallback**: When conditions conflict, ask "What would a human team member do?" and write down why. Articulating the ambiguity usually resolves it.

## 3. Load Routed Reference

Read `./references/[MATCHED].md` and follow its instructions.

</routing-instructions>
