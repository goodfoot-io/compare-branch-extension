# How to Maintain the Runtime Plugin Context Map

This guide explains the structure behind `CONTEXT_MAP.md` so you can keep it accurate as the runtime plugin evolves.

---

## What the Context Map Documents

The context map records three kinds of things:

1. **Entry points** — TypeScript actions that launch Claude CLI sessions
2. **Skills** — Markdown files that carry process instructions; loaded into a session at start or mid-session via routing
3. **Agents / team members** — Markdown files that define a specialized Claude instance; spawned via the `Agent` tool

The map traces how each entry point eventually reaches each agent, what connects them (skills and messages), and what context (CLAUDE.md, appended prompts, env vars) each agent receives.

---

## Where Each Piece Lives

| Piece | Location pattern |
|-------|-----------------|
| Actions (entry points) | `public/packages/default-configuration/src/actions/*.ts` |
| Plugin metadata | `public/plugins/runtime/.claude-plugin/plugin.json` |
| Agents | `public/plugins/runtime/agents/**/*.md` |
| Skills | `public/plugins/runtime/skills/*/SKILL.md` |
| Shared context | `public/plugins/runtime/claude/CLAUDE.md` |
| Commit style guide | `public/plugins/runtime/claude/COMMIT_MESSAGE_STYLE.md` |
| Cards plugin | `public/plugins/cards/` |

---

## How to Update the Map

### When an action changes (`launch.ts`, `interview.ts`, `chat.ts`)

Read the action file and check for:

- **`addDir` calls** — each path listed causes its `CLAUDE.md` to be loaded by all agents in that session; update the "Shared Context Injected at Launch" section
- **Appended system prompts** — listed as `appendSystemPrompt` or similar; update the appended-prompt list
- **First skill loaded** — look for the `--print` prompt or skill reference passed to Claude CLI; this is the entry skill in the "Entry Points" table
- **Context variables passed** — look for env vars like `$CARD_ID`, `$EFFORT`; add new ones to the context table in the full exploration document

### When an agent is added or changed (`agents/**/*.md`)

Read the agent file and check:

- **`name:`** — the identifier used in `Agent` tool calls and `SendMessage` routing
- **`description:`** — used by subagent dispatching to select the right agent
- **`tools:`** — if restricted (e.g. read-only), note in the agent roster table
- **Skills the agent loads** — search the agent file for skill names (e.g. `runtime:spike`); update the "Full Agent Roster" and relevant team diagram
- **Messages the agent sends** — search for `SendMessage` patterns; update the message-flow section for that team
- **Effort gating** — does the agent's spawning skill check `$EFFORT`? Update the effort table

Add the agent to:
1. The relevant team diagram (planning or implementation)
2. The message-flow block for that team
3. The "Full Agent Roster" table
4. The effort-based composition table (if gated by effort)

### When a skill is added or changed (`skills/*/SKILL.md`)

Read the skill file and check:

- **Does it spawn agents?** — Look for `Agent` tool calls or `TeamCreate` tool calls
- **Does it create a team?** — Look for `TeamCreate` / `TeamDelete`; if so, map the full team diagram
- **Is it reachable from card-routing?** — Look for the skill name in `card-routing/SKILL.md`; update the routing table and decision tree
- **Is it loaded by an agent?** — Search agent files for references to this skill; update the "Skills used" line in that agent's team diagram block

Add the skill to:
1. The "Full Skills Roster" table (with `Spawns Agents?` column)
2. The relevant routing or team section
3. If it forms a team, add a new "Team" section following the planning/implementation team format

### When team composition changes

The effort gating lives in the team-forming skill (e.g. `card-plan/SKILL.md`). Read that skill and find the conditional blocks that check `$EFFORT`. Update:

1. The effort-based composition table
2. The team diagram (which agents appear at which effort levels)

---

## Structural Conventions for New Teams

If a skill creates a new team, document it using this pattern:

```markdown
## [Team Name] Team

Spawned by the `[skill-name]` skill. Team name: `[team-name]-[CARD_ID]`.

[skill-name] skill (team lead)
    │
    ├─ TeamCreate: [team-name]-[CARD_ID]
    │
    ├─── Agent: runtime:[agent-type]                    ([effort levels])
    │        Loaded context: CLAUDE.md (add-dir), [other appended files]
    │        Skills used: [skill list]
    │        Sends: [messages and recipients]
    │
    └─ TeamDelete (after [completion condition])

**Message flow inside the [team] team:**

[sender] ──► [recipient] ([what, blocking or non-blocking])
```

---

## Cards Plugin Notes

The cards plugin is **always loaded when the runtime plugin is loaded** but the runtime plugin is not always loaded when the cards plugin is loaded. This means:

- All runtime agents have access to `cards:api`, `cards:markdown`, and `cards:dev`
- Never document cards plugin skills as if they are runtime plugin skills
- If the cards plugin adds a new skill, it becomes available in all runtime sessions automatically — no map update needed unless a runtime skill or agent explicitly references the new cards skill

---

## Checking for Context Map Drift

To verify the map is up to date, spot-check these:

1. **Count agents**: `ls public/plugins/runtime/agents/**/*.md | wc -l` — should match the roster table row count
2. **Count skills**: `ls public/plugins/runtime/skills/*/SKILL.md | wc -l` — should match the skills roster row count
3. **Check routing count**: Count the conditions in `card-routing/SKILL.md` — should match the routing table row count
4. **Check add-dir**: Search `launch.ts` for `addDir` — each path should appear in the "Shared Context" section
5. **Check team membership**: For each team-forming skill, check the effort conditionals match the effort table

---

## What Is Not in the Map

The context map does not document:

- **Hooks** (`hooks/hooks.json`) — these are event-triggered side effects, not agent pathways
- **MCP servers** (`.mcp.json`) — tool providers, not workflow participants
- **Card repository structure** — documented in `RUNTIME_PLUGIN_EXPLORATION.md`
- **Commit message conventions** — in `claude/COMMIT_MESSAGE_STYLE.md`
- **Cards plugin internals** — the cards plugin has its own documentation
