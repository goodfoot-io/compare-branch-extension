# Developer Wave

Delegation machinery for implementation work you choose not to do inline. Loaded from `./implementation.md` (plan/card groups) and `./evaluation-wave.md` (finding fixes). The caller owns every gate, commit, and tag; developers implement and return.

<placeholder-variables>
[MODEL] — LLM model for developer delegation, per `<model-selection>`
</placeholder-variables>

<dispatch>

The unit of assignment is a **group** — it must reach a validation-passing state on its own and ends in a single commit by you.

**Compilability invariant.** Steps assigned to one agent must reach a validation-passing state without depending on work assigned to another agent or a later dispatch. If any step breaks the build, types, or tests until a later step lands, the unit of assignment is the smallest set of steps that restores green — never larger. This overrides every other routing consideration.

**Routing.** First match wins:

- **Parallel** — independent files, or uniform steps across files. Concurrent agents over independent groups; one commit after the group returns. Before dispatching, confirm the file sets assigned to each concurrent agent are disjoint — if any file appears in more than one agent's scope, route Coherent or Sequential instead; "independent" is a claim about the actual assigned paths, not a default.
- **Sequential** — multi-phase work, intermediate validation gates, or paired remove/add steps in the same scope. Each phase ends in a commit before the next dispatch.
- **Coherent** — dependent and varied steps, single phase, single end-of-scope validation gate. One agent, one commit. When uncertain between Coherent and Sequential, choose Sequential.

Trivial items (stale prose, wrong figures, comment drift) never justify their own group — batch each into whichever developer already owns the file.

**Dispatch constraints.** Agent prompts must be self-contained — agents have no conversation context. Every dispatched scope must reach a validation-passing state within a single agent session; a scope that cannot is too large — split it. When an agent returns BLOCKED with a proposed split, adopt the split as the new routing. For Parallel routing, place multiple foreground `<invoke>` blocks in a single message; they execute concurrently without backgrounding.

```xml
<invoke name="Agent">
<parameter name="description">[Implement TITLE (all steps) | Current phase | Group N]</parameter>
<parameter name="subagent_type">runtime:card:developer</parameter>
<parameter name="model">[MODEL]</parameter>
<parameter name="run_in_background">false</parameter>
<parameter name="prompt">
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
</parameter>
</invoke>
```

</dispatch>

<group-validation-gate>

Wait for every agent in the current group to return before validating.

Developers do not commit — record the group's pre-dispatch HEAD SHA before delegating, and on return compare it to current HEAD. If HEAD moved, an agent committed despite the constraint: `git reset --soft <pre-dispatch-SHA>` before validating, so the group's work folds into the single commit this gate produces rather than leaving a stray commit ahead of it.

Lint and typecheck per the project's CLAUDE.md validation conventions. Re-run only the failing test or suite until it passes; broaden to the changed package's suite once green, and defer cross-package or full-validation runs to the caller's final gate.

- **All pass** — commit the group's changes per `<workspace-commit-style>` and `<markdown-guidelines>`, then return to the caller's loop.
- **Mechanical error the wave introduced** (syntax, import correction, config typo, test polyfill) — fix inline and re-run.
- **Implementation error** — discard the group's uncommitted work (`git restore . && git clean -fd`) and re-dispatch with adjusted routing (split a group that failed to cohere; combine groups that produced conflicting changes).

</group-validation-gate>

<model-selection>

- **`haiku`** — bounded, low-ambiguity work; one component, short chain from prompt to solution.
- **`sonnet`** — multi-file or multi-subsystem work with interacting constraints.
- **`opus`** — system-level, high-ambiguity, or cross-cutting work where early decisions shape the rest.

</model-selection>
