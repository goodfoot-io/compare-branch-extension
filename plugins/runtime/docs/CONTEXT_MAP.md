# Runtime Plugin — Agent Context Map

A map of every agent, subagent, team member, and skill connection in the runtime plugin. Start from any entry point and follow the arrows to trace a full workflow.

---

## Entry Points

Three actions in `public/packages/default-configuration/src/actions/` start Claude sessions.

| Action | What it spawns | First skill / agent loaded |
|--------|---------------|---------------------------|
| `launch.ts` | Claude CLI (interactive or background) | `runtime:card-routing` skill |
| `interview.ts` | Claude CLI (interactive only) | `runtime:interview-routing` skill |
| `chat.ts` | Claude CLI as `runtime:chat` agent | `chat` agent |
| `codex.ts` | Codex CLI | *(separate workflow)* |

### Shared Context Injected at Launch

Every session started by `launch.ts` (and by extension every agent or subagent it spawns) receives:

- **add-dir** → `public/plugins/runtime/claude/` — causes all agents in the session to load `CLAUDE.md` (card-repo reference)
- **Appended system prompt** → `COMMIT_MESSAGE_STYLE.md` — workspace and card-repo commit conventions
- **Appended system prompt** → `card-routing/SKILL.md` — routing decision logic

Every session also has the **cards plugin** loaded (always co-loaded with runtime), giving access to `cards:api`, `cards:markdown`, and `cards:dev` skills.

---

## Interview Path (Card Creation)

```
interview.ts
    │
    └─── spawns Claude ─── loads: runtime:interview-routing
                                          │
                          ┌───────────────┼───────────────────────┐
                          ▼               ▼                       ▼
               interview-bug-report  interview-enhancement  interview-investigation
               interview-maintenance interview-operations   interview-documentation
                          │
                          └── produces: CARD.md + CARD.meta.json
```

---

## Launch Path (Card Execution)

```
launch.ts
    │
    └─── spawns Claude ─── loads: card-routing skill
                                          │
                       (evaluates 12 signals against card state)
                                          │
              ┌──────────────────────────────────────────────────────────┐
              │                   card-routing routes to:                │
              └──────────────────────────────────────────────────────────┘
              │
              ├─ HAS_QUESTION              ──► card-question-response
              ├─ IS_BLOCKED                ──► card-blocked
              ├─ HAS_IMPLEMENTATION_FEEDBACK ─► card-implementation-feedback
              ├─ REVIEW_APPROVED           ──► card-merge
              ├─ IS_STALE / !DOR_MET       ──► card-clarify-and-enrich
              ├─ PLAN_REQUIRED + USER_RESPONDED ► card-plan-feedback
              ├─ PLAN_REQUIRED + !PLAN_APPROVED ► card-plan ──────────────┐
              ├─ HAS_PLAN / PLAN_APPROVED  ──► card-implementation-with-plan ─┐
              ├─ IS_TESTABLE_BUG           ──► card-bug                    │  │
              ├─ EFFORT = low              ──► card-implementation         │  │
              └─ (default)                 ──► card-plan ──────────────────┘  │
                                                                               │
                    ┌──────────────────────────────────────────────────────────┘
                    │
```

---

## Planning Team

Spawned by the `card-plan` skill. Team name: `plan-[CARD_ID]`.

```
card-plan skill (team lead)
    │
    ├─ TeamCreate: plan-[CARD_ID]
    │
    ├─── Agent: runtime:card:planner                    (all effort levels)
    │        Loaded context: CLAUDE.md (add-dir), COMMIT_MESSAGE_STYLE.md
    │        Skills used: runtime:spike (for uncertainties)
    │        Creates: PLAN.md, spike/* artifacts
    │        Sends: review submissions → plan-maintainer, plan-failure-mode
    │        Sends: completion signal → team-lead (APPROVED or BLOCKED)
    │        │
    │        └─── Spawns spike subagents (parallel, as needed)
    │                 subagent_type: general-purpose
    │                 Writes: /spike/[name]/results.md
    │                 No team context (isolated, receives absolute paths)
    │
    ├─── Agent: runtime:card:plan-maintainer            (medium + high effort)
    │        Loaded context: CLAUDE.md (add-dir), COMMIT_MESSAGE_STYLE.md
    │        Reviews: PLAN.md (reads actual workspace code, not plan claims)
    │        Sends: verdict (APPROVED / CHANGES_REQUESTED / BLOCKED) → team-lead
    │
    ├─── Agent: runtime:card:plan-failure-mode          (high effort only)
    │        Loaded context: CLAUDE.md (add-dir), COMMIT_MESSAGE_STYLE.md
    │        Analyzes: PLAN.md bets, workspace code, referenced files
    │        Sends: findings (non-blocking) → team-lead + plan-maintainer
    │
    └─ TeamDelete (after planner signals completion)
```

**Message flow inside the planning team:**

```
plan-failure-mode ──► team-lead (findings, async, non-blocking)
plan-failure-mode ──► plan-maintainer (findings, async)
plan-maintainer   ──► team-lead (verdict)
planner           ──► plan-maintainer, plan-failure-mode (review request)
planner           ──► team-lead (APPROVED or BLOCKED)
```

---

## Implementation Team

Spawned by `card-implementation-with-plan` (or `card-implementation` for low effort). Team name: `implement-[CARD_ID]`.

```
card-implementation-with-plan skill (team lead)
    │
    ├─ Creates baseline tag: implement/[CARD_ID]/baseline
    ├─ Analyzes plan coherence → routes parallel / coherent / sequential
    │
    ├─── Agent: runtime:card:developer
    │        Loaded context: CLAUDE.md (add-dir), COMMIT_MESSAGE_STYLE.md
    │        Skills used:
    │            ├─ runtime:card-developer  (implementation principles)
    │            ├─ runtime:spike           (for uncertainties, if needed)
    │            └─ runtime:evaluation      (writes EVALUATION.md, if needed)
    │        Works in: $CARD_REPO_PATH (card's worktree)
    │        Sends: status (COMPLETED / NEEDS_REVISION / BLOCKED) → team-lead
    │
    ├─── Agent: runtime:card:maintainer
    │        Loaded context: CLAUDE.md (add-dir), COMMIT_MESSAGE_STYLE.md
    │        Reviews: implementation against PLAN.md + validation commands
    │        Checks: 8 known blind spots, end-to-end wiring (7 dimensions)
    │        Sends: verdict (APPROVED / CHANGES_REQUESTED / BLOCKED) → team-lead
    │
    └─── Agent: runtime:card:failure-mode              (medium + high effort)
             Loaded context: CLAUDE.md (add-dir), COMMIT_MESSAGE_STYLE.md
             Analyzes: git diff, changed files, consumers, data flow
             Sends: findings (non-blocking) → all teammates
```

**Message flow inside the implementation team:**

```
failure-mode  ──► all teammates (findings, async, non-blocking)
maintainer    ──► team-lead (verdict)
developer     ──► team-lead (status)
team-lead     ──► developer (revision request, if CHANGES_REQUESTED)
```

**Revision loop:**

```
maintainer verdict: CHANGES_REQUESTED
    └──► developer revises
    └──► maintainer re-reviews  (full re-review, no shortcuts)
    └──► failure-mode re-analyzes
    └──► loop until APPROVED or BLOCKED
```

---

## Merge Path

```
REVIEW_APPROVED (card-routing)
    │
    └──► card-merge skill
             ├─ Rebase $WORKSPACE_BRANCH onto $BASE_BRANCH
             ├─ Run lint + typecheck + test
             ├─ Fast-forward merge
             └─ Report merge failures to card if blocked
```

---

## Cards Plugin (Always Co-Loaded)

The cards plugin is always loaded when the runtime plugin is loaded (but not vice versa).

```
cards plugin skills (available in all runtime sessions):
    ├─ cards:api       — CRUD ops on cards via $CARD_CLI, notifications
    ├─ cards:markdown  — CARD.md content guidelines per card type
    └─ cards:dev       — developer-facing card utilities
```

---

## Effort-Based Team Composition Summary

| Agent | Low | Medium | High |
|-------|-----|--------|------|
| planner | ✓ | ✓ | ✓ |
| plan-maintainer | — | ✓ | ✓ |
| plan-failure-mode | — | — | ✓ |
| developer | ✓ | ✓ | ✓ |
| maintainer | ✓ | ✓ | ✓ |
| failure-mode (code) | — | ✓ | ✓ |

---

## Full Agent Roster

| Agent | File | subagent_type | Role |
|-------|------|--------------|------|
| chat | `agents/chat.md` | `runtime:chat` | Interactive card Q&A and focused changes |
| planner | `agents/card/planner.md` | `runtime:card:planner` | Creates and refines PLAN.md |
| developer | `agents/card/developer.md` | `runtime:card:developer` | Implements scoped work in card worktree |
| maintainer | `agents/card/maintainer.md` | `runtime:card:maintainer` | Reviews implementation; final verdict |
| failure-mode | `agents/card/failure-mode.md` | `runtime:card:failure-mode` | Analyzes code changes for failure modes |
| plan-failure-mode | `agents/card/plan-failure-mode.md` | `runtime:card:plan-failure-mode` | Analyzes plan for failure modes |
| plan-maintainer | `agents/card/plan-maintainer.md` | `runtime:card:plan-maintainer` | Reviews plan; final verdict |

---

## Full Skills Roster

| Skill | When Active | Spawns Agents? |
|-------|------------|----------------|
| `card-routing` | Every launch session | No (routes to others) |
| `interview-routing` | Every interview session | No (routes to others) |
| `interview-bug-report` | Bug interview | No |
| `interview-enhancement` | Feature interview | No |
| `interview-investigation` | Research interview | No |
| `interview-maintenance` | Refactor interview | No |
| `interview-operations` | Ops interview | No |
| `interview-documentation` | Docs interview | No |
| `card-question-response` | HAS_QUESTION | No |
| `card-blocked` | IS_BLOCKED | No |
| `card-clarify-and-enrich` | Stale / !DOR_MET | No |
| `card-plan` | PLAN_REQUIRED | **Yes** — planning team |
| `card-plan-feedback` | Plan revision | No |
| `card-implementation` | Low effort | No (uses card-developer) |
| `card-implementation-with-plan` | Has plan | **Yes** — implementation team |
| `card-implementation-feedback` | HAS_IMPL_FEEDBACK | No |
| `card-bug` | IS_TESTABLE_BUG | No |
| `card-merge` | REVIEW_APPROVED | No |
| `card-developer` | Loaded by developer agent | No |
| `spike` | Loaded by planner/developer | **Yes** — spike subagents |
| `evaluation` | Loaded by developer | No |
| `card-implementation-evaluation` | Loaded by developer | No |
| `refactoring` | Loaded by developer on refactoring cards | No |
| `card-reopen-and-implement` | *(re-open flow)* | No |
