# Inspecting Settings Files

Scope: all settings files across Claude Code, Codex, and Cards — their tiers (user / project / local), merge behavior, and how the Cards extension reads and writes them. Agent-retrieval keywords: settings.json, settings.local.json, config.toml, cards.config.toml, enabledPlugins, extraKnownMarketplaces, known_marketplaces.json, marketplace.json, profile config.

Source of truth: this file owns the settings file tier structure, the keys the Cards extension writes to each, and the inline `--settings` JSON format. Plugin cache → `inspect-plugin-cache.md`. Hook enablement → `diagnose-hooks.md`.

Completeness: every settings file the Cards extension reads or writes across all three systems (Claude, Codex, Cards) as of version 1.0.x. Excludes agent CLI internal settings not touched by Cards.

Cross-refs: `diagnose-hooks.md` (hook enablement in settings), `diagnose-agent-launch.md` (inline `--settings` JSON vs. file settings), `inspect-plugin-cache.md` (marketplace registration).

Parent: `../SKILL.md`

## Quick Diagnostics

```bash
# Claude Code settings (user tier)
cat ~/.claude/settings.json 2>/dev/null | jq '{enabledPlugins, extraKnownMarketplaces, env}'

# Claude Code settings (project tiers)
cat .claude/settings.json 2>/dev/null | jq '{enabledPlugins, extraKnownMarketplaces, env}'
cat .claude/settings.local.json 2>/dev/null | jq '{enabledPlugins, extraKnownMarketplaces, env}'

# Codex config
cat ~/.codex/config.toml 2>/dev/null
cat ~/.codex/cards.config.toml 2>/dev/null
cat ~/.codex/cards-assistant.config.toml 2>/dev/null

# Cards settings
cat ~/.cards/settings.json 2>/dev/null | jq '{environments, cardsAssistant}'
cat .cards/settings.json 2>/dev/null | jq '{environments, cardsAssistant}'

# Marketplace registration
cat ~/.claude/plugins/known_marketplaces.json 2>/dev/null | jq '.["cards.management"]'
cat ~/.agents/plugins/marketplace.json 2>/dev/null | jq '.plugins'
```

## Claude Code Settings Tiers

| Tier | Path | Managed by | Git | Status |
|------|------|-----------|-----|--------|
| **User** | `~/.claude/settings.json` (or `$CLAUDE_CONFIG_DIR/settings.json`) | `CodexInstaller` writes here on user-scope install | No | current |
| **Project** | `{repoRoot}/.claude/settings.json` | `ClaudeSettingsService`, `ClaudeInstaller` | Yes (committed) | current |
| **Local** | `{repoRoot}/.claude/settings.local.json` | `ClaudeSettingsService`, `ClaudeInstaller` | No (gitignored) | current |

**Resolution**: `$CLAUDE_CONFIG_DIR` → `os.homedir()/.claude`.

**Format**: JSON with comment preservation (`comment-json` library). The Cards extension reads with `comment-json` and writes atomically via temp file + rename to avoid comment loss.

**Keys written by Cards** (`ClaudeSettingsService.installPlugin()` at `packages/extension/src/services/ClaudeSettingsService.ts`):
- `enabledPlugins["cards@cards.management"] = true` — status: current
- `extraKnownMarketplaces["cards.management"] = { source: { source: "directory", path: <marketplacePath> } }` — status: current
- `env.CARDS_CLAUDE_CODE_HOOKS_LOG_FILE = "<workspace>/.cards/logs/claude-code-cards-api-hooks.log"` — status: current

**Keys removed on uninstall** (`removePluginConfig()`): same three keys, removed by identity.

## Codex Settings

### User Config

| Path | Format | Purpose | Status |
|------|--------|---------|--------|
| `~/.codex/config.toml` | TOML | User-level Codex config — `features.plugins = true`, plugin enables | current |
| `~/.codex/cards.config.toml` | TOML | Cards launch profile — plugin enables + trusted hook hashes | current |
| `~/.codex/cards-assistant.config.toml` | TOML | Cards Assistant profile | current |

**Resolution**: `$CODEX_HOME` → `os.homedir()/.codex`.

### Profile Config Contents

```toml
features.plugins = true

[plugins]
"cards@local".enabled = true
"runtime@local".enabled = true

[hooks.state."cards@local:hooks/hooks.json:SessionStart:0:0"]
trusted_hash = "sha256:<hex>"
```

**Source**: `public/packages/default-configuration/src/lib/codex-session.ts`::`writeCodexProfileConfig()`, `public/packages/default-configuration/src/lib/applyCodexConfig.ts`::`applyCodexConfig()`.

**Legacy collision check**: Before writing, `assertNoLegacyProfileCollision()` reads `config.toml` to check for legacy `profile = "cards"` or `[profiles.cards]` — Codex refuses a `--profile` launch when these exist, and the error is surfaced before spawn.

### Marketplace Registration

| Path | Purpose | Status |
|------|---------|--------|
| `~/.agents/plugins/marketplace.json` | User-level Codex plugin registry | current |
| `{repoRoot}/.agents/plugins/marketplace.json` | Project-level Codex plugin registry | current |
| `{ext}/public/codex/.agents/plugins/marketplace.json` | Bundled registry (committed at build time) | current |

### Install Detection

`agentDetection.ts` and `AgentCapabilityService.ts` read all three tiers to determine if an agent is configured. Detection checks: `config.toml` for `features.plugins = true` + plugin enables, `marketplace.json` for `cards` plugin entry.

## Cards Settings

| Tier | Path | Purpose | Status |
|------|------|---------|--------|
| **User** | `~/.cards/settings.json` | User-level action/environment config | current |
| **Project** | `{repoRoot}/.cards/settings.json` | Project-level action/environment config | current |
| **Default** | `{ext}/dist/config/settings.json` | Bundled fallback (generated by `cards-sdk build`) | current |

**Merged by**: `SettingsLoader.load()` in `packages/cards/server/src/runtime/SettingsLoader.ts`.

**Cards Assistant config**: Read from merged settings via `settingsLoader.getCardsAssistant()` — returns `{ cardsAssistant: CardsAssistant, configPath: string }` or `undefined` if not configured.

## Inline `--settings` JSON (At Spawn Time)

For Claude Code sessions, the handler passes settings inline rather than relying on file tiers:

**Cards Assistant** (`cards-assistant.ts`):
```json
{
  "enabledPlugins": {
    "cards@cards.management": true,
    "cards-assistant@cards.management": true
  },
  "extraKnownMarketplaces": {
    "cards.management": {
      "source": { "source": "directory", "path": "<marketplacePath>" }
    }
  }
}
```

**Action launches** (`claude-session.ts`):
```json
{
  "enabledPlugins": {
    "runtime@cards.management": true
  },
  "extraKnownMarketplaces": {
    "cards.management": {
      "source": { "source": "directory", "path": "<marketplacePath>" }
    }
  }
}
```

Passed as `--settings '<json>'` — single-quoted on POSIX, double-quoted on Windows through cross-spawn escaping. **Status: current**.

## Out of Scope

- Plugin cache staging (settings reference marketplace paths) → `inspect-plugin-cache.md`
- Hook registration in settings → `diagnose-hooks.md`
- Agent launch (settings consumed at spawn) → `diagnose-agent-launch.md`
- Platform-specific settings file paths → `platform-reference.md`
