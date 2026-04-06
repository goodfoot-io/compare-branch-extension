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
                       (evaluates 11 signals against card state)
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
              └─ (default)                 ──► card-plan ──────────────────┘  │
                                                                               │
                    ┌──────────────────────────────────────────────────────────┘
                    │
```

---

## Planning Team

Dispatched by the `card-plan` skill. The skill selects a tier based on card complexity, dispatches subagents, and makes the APPROVED / CHANGES_REQUESTED decision itself.

**Planning tiers:**

| Tier | What runs |
|------|-----------|
| 1 | No plan — proceed directly to implementation |
| 2 | `planner` subagent only |
| 3 | `planner` subagent + one `plan-failure-mode` subagent |
| 4 | `planner` subagent + multiple `plan-failure-mode` subagents, each scoped to a different area |

```
card-plan skill (orchestrator)
    │
    ├─── Agent: runtime:card:planner                    (tiers 2–4)
    │        Loaded context: CLAUDE.md (add-dir), COMMIT_MESSAGE_STYLE.md
    │        Skills used: runtime:spike (for uncertainties)
    │        Creates: PLAN.md, spike/* artifacts
    │        Returns: plan state (ready or blocked)
    │        │
    │        └─── Spawns spike subagents (parallel, as needed)
    │                 subagent_type: general-purpose
    │                 Writes: /spike/[name]/results.md
    │                 No team context (isolated, receives absolute paths)
    │
    ├─── Agent: runtime:card:plan-failure-mode          (tiers 3–4, one or more)
    │        Loaded context: CLAUDE.md (add-dir), COMMIT_MESSAGE_STYLE.md
    │        Analyzes: PLAN.md bets, workspace code, referenced files
    │        Returns: findings to orchestrator
    │        Tier 4: each instance scoped to a different area of concern
    │
    └── orchestrator reads findings → decides APPROVED or re-spawns planner with findings
```

---

## Implementation Team

Dispatched by `card-implementation-with-plan` and `card-implementation`. After validation, each skill assesses the scope of changes and decides whether to load `card-implementation-evaluation`. The evaluation skill dispatches failure-mode subagents and makes the APPROVED / CHANGES_REQUESTED decision.

```
card-implementation-with-plan / card-implementation skill (orchestrator)
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
    │        Returns: status (COMPLETED / NEEDS_REVISION / BLOCKED)
    │
    └── assesses scope → loads card-implementation-evaluation if needed
```

**Evaluation depth (inside `card-implementation-evaluation`, when loaded):**

| Depth | What runs |
|-------|-----------|
| Standard | One `failure-mode` subagent |
| Deep | Multiple `failure-mode` subagents, each scoped to a different area |

```
card-implementation-evaluation skill (orchestrator)
    │
    ├─── Agent: runtime:card:failure-mode              (one or more)
    │        Loaded context: CLAUDE.md (add-dir), COMMIT_MESSAGE_STYLE.md
    │        Analyzes: git diff, changed files, consumers, data flow
    │        Returns: findings to orchestrator
    │        Deep: each instance scoped to a different area of concern
    │
    └── orchestrator reads findings → decides APPROVED or delegates fixes to developer
```

**Revision loop:**

```
orchestrator decides: CHANGES_REQUESTED
    └──► developer revises
    └──► re-run evaluation (return to Step 3)
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

## Agent-Driven Escalation Tiers

**Planning tiers** (selected by `card-plan` based on card complexity):

| Tier | Subagents |
|------|-----------|
| 1 | None — proceed directly to implementation |
| 2 | `planner` |
| 3 | `planner` + one `plan-failure-mode` |
| 4 | `planner` + multiple `plan-failure-mode` (each scoped to a different area) |

**Implementation evaluation** (decided by the implementation skill based on scope; `card-implementation-evaluation` is loaded only when evaluation is needed):

| Depth | Subagents |
|-------|-----------|
| Standard | One `failure-mode` |
| Deep | Multiple `failure-mode` (each scoped to a different area) |

---

## Full Agent Roster

| Agent | File | subagent_type | Role |
|-------|------|--------------|------|
| chat | `agents/chat.md` | `runtime:chat` | Interactive card Q&A and focused changes |
| planner | `agents/card/planner.md` | `runtime:card:planner` | Creates PLAN.md via spikes; returns plan state to orchestrator |
| developer | `agents/card/developer.md` | `runtime:card:developer` | Implements scoped work in card worktree |
| failure-mode | `agents/card/failure-mode.md` | `runtime:card:failure-mode` | Analyzes code changes for failure modes; returns findings to orchestrator |
| plan-failure-mode | `agents/card/plan-failure-mode.md` | `runtime:card:plan-failure-mode` | Analyzes plan for failure modes; returns findings to orchestrator |

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
| `card-plan` | PLAN_REQUIRED | **Yes** — planner + plan-failure-mode subagents (tier-based) |
| `card-plan-feedback` | Plan revision | No |
| `card-implementation` | Tier 1 (no plan) | No (uses card-developer) |
| `card-implementation-with-plan` | Has plan | **Yes** — developer subagents |
| `card-implementation-feedback` | HAS_IMPL_FEEDBACK | No |
| `card-bug` | IS_TESTABLE_BUG | No |
| `card-merge` | REVIEW_APPROVED | No |
| `card-developer` | Loaded by developer agent | No |
| `spike` | Loaded by planner/developer | **Yes** — spike subagents |
| `evaluation` | Loaded by developer | No |
| `card-implementation-evaluation` | Loaded by implementation skills when evaluation needed | **Yes** — failure-mode subagents (standard or deep) |
| `refactoring` | Loaded by developer on refactoring cards | No |
| `card-reopen-and-implement` | *(re-open flow)* | No |
