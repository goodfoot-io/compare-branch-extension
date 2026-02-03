# Claude Code CLI Plugin

## Quick Architecture Reference

The plugin implements a **prompt → skill → agent → bin** architecture for issue-driven development.

### Call Chain Flow

```
.cards/prompt.md (entry point)
       │
       ▼
  cards:api + skill-routing
       │
       ▼
  ┌────────────────────────────────────────┐
  │  SKILL (routes based on issue state)   │
  │  skills/skill-routing/SKILL.md         │
  └────────────────────────────────────────┘
       │
       ▼
  ┌────────────────────────────────────────┐
  │  SKILL (domain-specific instructions)  │
  │  e.g., issue-plan, issue-implementation│
  └────────────────────────────────────────┘
       │
       ├──► spawns AGENTS (isolated context)
       │    agents/*.md
       │
       └──► invokes BIN scripts
            bin/*.sh
```

### Component Layers

| Layer | Files | Purpose |
|-------|-------|---------|
| **Prompt** | `.cards/prompt.md` | Entry point, invokes initial skills |
| **Skills** | `skills/*/SKILL.md` | Knowledge + routing instructions |
| **Agents** | `agents/*.md` | Isolated execution with own context |
| **Bin** | `bin/*.sh` | Shell utilities (git, API calls) |
| **Hooks** | `bin/hooks/{domain}/*.sh` | Event-driven automation scripts |
| **Lib** | `bin/lib/*.sh` | Shared utilities for hooks |
| **Methodology** | `skills/*/methodology/*.md` | Reference docs loaded on demand |

### Connection Graph

See `connections.json` for the complete mapping of:
- Which skills invoke which agents
- Which skills/agents invoke which bin scripts
- Hook event → bin script mappings
- Skill chaining (e.g., `issue-plan` → `issue-implementation`)

### Hotspots (High-Traffic Files)

1. **`skills/skill-routing/SKILL.md`** — All issue flows route through here
2. **`skills/issue-implementation-with-plan/SKILL.md`** — Full implementation orchestration
3. **`hooks/hooks.json`** — Session lifecycle automation
4. **`bin/create-worktree.sh`** — Git isolation with API integration

### Key Patterns

**Skill invokes Agent:**
```xml
<invoke name="Task">
  <parameter name="subagent_type">claude-code-cli:plan-assessor</parameter>
  <parameter name="prompt">...</parameter>
</invoke>
```

**Skill invokes Bin:**
```bash
"${CLAUDE_PLUGIN_ROOT}/bin/create-worktree.sh" "[BRANCH_NAME]"
```

**Agent loads Skills:**
```yaml
# agents/*.md frontmatter
skills: cards:api, claude-code-cli:plan
```

**Hook triggers Bin:**
```json
{
  "hooks": {
    "SessionStart": [{"type": "command", "command": "${CLAUDE_PLUGIN_ROOT}/bin/hooks/issue/session.start.sh"}]
  }
}
```

### Hook Organization

Hooks follow the naming convention `{domain}/{resource}.{lifecycle}.sh`:

| Domain | Resource | Purpose |
|--------|----------|---------|
| `issue/` | `context.*` | Load/check issue data into Claude's context |
| `issue/` | `session.*` | Manage session-to-issue linkage |
| `skills/` | `state.*` | Track and restore skill state across compaction |
| `ipc/` | `dispatcher.*` | Signal session state to orchestrating process |

### Shared Libraries

| Library | Purpose |
|---------|---------|
| `lib/api.sh` | API discovery and HTTP operations |
| `lib/state.sh` | Session state file management with locking |
| `lib/output.sh` | JSON output formatting for hook responses |

### When to Consult Claude Code Documentation

Use the `claude-code-guide` subagent to look up official specifications when:

**YAML Frontmatter Formats:**
- Adding/modifying skill frontmatter (`name`, `description`, `args`)
- Adding/modifying agent frontmatter (`name`, `description`, `tools`, `skills`, `model`, `color`)
- Checking available frontmatter fields and their valid values
- Understanding how `model: inherit` vs explicit model selection works

**Hook Configuration:**
- Available hook events (`PreToolUse`, `PostToolUse`, `SessionStart`, `Stop`, etc.)
- Hook matchers (filtering by tool name, source type)
- Hook output JSON formats for decision control (`decision`, `reason`, `suppressOutput`)
- Command vs prompt hook types
- Environment variables available in hooks

**Tool Invocation:**
- Task tool parameters (`subagent_type`, `run_in_background`, `model`, `resume`)
- Skill tool invocation syntax
- Available built-in subagent types (`Explore`, `Plan`, `general-purpose`, etc.)

**Plugin Structure:**
- Required files in `.claude-plugin/` directory
- Plugin discovery and loading behavior
- Skill/agent namespacing (`plugin-name:skill-name`)

**Invocation pattern:**
```xml
<invoke name="Task">
  <parameter name="subagent_type">claude-code-guide</parameter>
  <parameter name="prompt">What YAML frontmatter fields are available for agent definitions? Include valid values for model and tools.</parameter>
</invoke>
```

**Common lookup scenarios:**
| Scenario | Query Example |
|----------|---------------|
| New agent creation | "What frontmatter fields can agents have?" |
| Hook output format | "How do hooks return decisions to block tool use?" |
| Skill inheritance | "How do agents inherit skills from parent?" |
| Background agents | "How does run_in_background work with Task tool?" |
| Session lifecycle | "What hook events fire during session start/resume/compact?" |

### Maintenance Instructions

**When editing any `*.md` file in this directory:**

1. Check if the file is referenced in `connections.json`
2. If adding new skill/agent/bin connections, update `connections.json`
3. If renaming files, update all references in `connections.json`

**Keeping `connections.json` Current:**

The JSON documents:
- `skills.*` — Skill files and what they invoke
- `agents.*` — Agent files and their loaded skills
- `bin.*` — Bin scripts and what calls them
- `hooks.events` — Hook events and their scripts
- `hotspots` — Most important files for understanding the system

Update the relevant section when:
- A skill starts invoking a new agent
- A skill/agent starts calling a new bin script
- New hooks are added
- New skills/agents/bin scripts are created

### File Index

**Skills (decision + instruction):**
- `skill-routing` — Routes to appropriate skill based on issue state
- `issue-plan` — Create plans requiring user approval
- `issue-implementation` — Implement without plan (simple issues)
- `issue-implementation-with-plan` — Orchestrate implementation pipeline
- `issue-merge` — Merge worktree to base branch
- `plan` — Plan format reference
- `refactoring` — Refactoring reference
- `spike` — Technical investigations
- `session` — Session transcript lookup

**Agents (isolated execution):**
- `plan-assessor` — Structural plan validation
- `plan-refactor` — Senior engineering judgment on plans
- `implementer` — TDD-driven code production
- `refactor` — Pre-validation code cleanup
- `implementation-evaluator` — Production readiness gate
- `session` — Session transcript research

**Bin (shell utilities):**
- `create-worktree.sh` — Git worktree creation with hooks
- `remove-worktree.sh` — Worktree cleanup
- `discover-workspace-api.sh` — API endpoint discovery
- `hooks/issue/context.*.sh` — Issue data loading and update checking
- `hooks/issue/session.*.sh` — Session-to-issue linkage
- `hooks/skills/state.*.sh` — Skill state tracking and reload
- `hooks/ipc/dispatcher.*.sh` — Session activity signaling
- `lib/*.sh` — Shared utilities for hooks
