# Developer Wave

Delegation machinery for implementation work you choose not to do inline. Loaded from `./implementation.md` (plan/card groups) and `./evaluation-wave.md` (finding fixes). You own every gate, commit, and tag; developer children implement and report back — they never commit.

The developer children are spawned as leaves of the tree and receive no follow-up after spawn: each `spawn_agent` message must be self-contained, since a child has no conversation context and no channel back into the contest-style relay used by `./contest.md`. There is no team to create and no peer channel between developers — you spawn them, they work independently within their assigned scope, and they report their result back to you when their task completes.

<placeholder-variables>
[EFFORT] — Exploration depth briefed to a spawned developer child, chosen by the work's complexity, per `<effort-selection>`
</placeholder-variables>

<dispatch>

The unit of assignment is a **group** — it must reach a validation-passing state on its own and ends in a single commit by you.

**Compilability invariant.** Steps assigned to one child must reach a validation-passing state without depending on work assigned to another child or a later dispatch. If any step breaks the build, types, or tests until a later step lands, the unit of assignment is the smallest set of steps that restores green — never larger. This overrides every other routing consideration.

**Routing.** First match wins:

- **Parallel** — independent files, or uniform steps across files. `spawn_agent` one child per independent group concurrently; one commit after the whole group returns. Before dispatching, confirm the file sets assigned to each concurrent child are disjoint — if any file appears in more than one child's scope, route Coherent or Sequential instead; "independent" is a claim about the actual assigned paths, not a default.
- **Sequential** — multi-phase work, intermediate validation gates, or paired remove/add steps in the same scope. Each phase ends in a commit before the next spawn.
- **Coherent** — dependent and varied steps, single phase, single end-of-scope validation gate. One child, one commit. When uncertain between Coherent and Sequential, choose Sequential.

Trivial items (stale prose, wrong figures, comment drift) never justify their own group — batch each into whichever developer already owns the file.

**Dispatch constraints.** Every dispatched scope must reach a validation-passing state within a single child's session; a scope that cannot is too large — split it. When a child returns BLOCKED with a proposed split, adopt the split as the new routing. For Parallel routing, issue all of that group's `spawn_agent` calls together so the children run concurrently, with descriptive `task_name`s (e.g., `group_1`, `phase_2`, `fix_group_1`).

Each spawn `message` tells the child to use `$runtime:card-developer`:

```
Use the $runtime:card-developer skill.

## Task
[Description with testing requirements — from the plan, card, or findings. Do not run full validation and do not commit — the orchestrator validates and commits after you return.]

## Card Repository
[CARD_REPO_PATH]

## Workspace
[WORKSPACE_PATH]

## Scope
[Coherent: Complete all implementation steps in sequence.]
[Sequential: Complete phase [N]: [phase step descriptions]. Return at gate: [GATE_CONDITION].]
[Parallel: Complete these steps: [independent group step descriptions]]

## Context
[Why this work exists; relevant exploration findings]

## File Ownership
This work owns: [absolute paths — do not modify files outside this set without orchestrator confirmation]

## Constraints
[Patterns, interfaces, dependencies to respect]

## Guidelines
- Only make requested changes
- Don't add unrequested features or abstractions
- Keep implementation minimal and focused
- When intent is ambiguous, the plan's opening (commander's intent) is the tiebreaker

## Success Criteria
- [ ] Implementation complete
- [ ] Tests pass (if applicable)
- [ ] Types correct
- [ ] Follows existing patterns
```

Pass `[EFFORT]` as the child's `agent_type` when a matching config role exists, per `<effort-selection>`.

</dispatch>

<group-validation-gate>

Wait for every child in the current group to return before validating.

Developers do not commit — record the group's pre-dispatch HEAD SHA before spawning, and on return compare it to current HEAD. If HEAD moved, a child committed despite the constraint: `git reset --soft <pre-dispatch-SHA>` before validating, so the group's work folds into the single commit this gate produces rather than leaving a stray commit ahead of it.

Lint and typecheck per the project's AGENTS.md validation conventions. Re-run only the failing test or suite until it passes; broaden to the changed package's suite once green, and defer cross-package or full-validation runs to the caller's final gate.

- **All pass** — commit the group's changes per `<workspace-commit-style>` and `<markdown-guidelines>`, then return to the caller's loop.
- **Mechanical error the wave introduced** (syntax, import correction, config typo, test polyfill) — fix inline and re-run.
- **Implementation error** — discard the group's uncommitted work (`git restore . && git clean -fd`) and re-dispatch with adjusted routing (split a group that failed to cohere; combine groups that produced conflicting changes).

</group-validation-gate>

<effort-selection>

`[EFFORT]` is the depth you brief a spawned child to apply, chosen by the work's complexity:

- **`light`** — bounded, low-ambiguity work; one component, short chain from prompt to solution.
- **`standard`** — multi-file or multi-subsystem work with interacting constraints.
- **`deep`** — system-level, high-ambiguity, or cross-cutting work where early decisions shape the rest.

</effort-selection>
