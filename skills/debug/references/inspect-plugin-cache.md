# Inspecting Plugin Caches

Scope: how Cards plugins reach the Claude Code and Codex plugin caches, version management, stale cache cleanup. Agent-retrieval keywords: plugin cache, marketplace symlink, populateCodexPluginCache, updateMarketplaceRegistration, installed_plugins.json, known_marketplaces.json, .codex-plugin, plugin staging, version pruning.

Source of truth: this file owns the plugin inventory, cache directory structures, and the cache staging flows for both Claude and Codex. Plugin enablement → `inspect-settings.md`. Hook binaries in cache → `diagnose-hooks.md`.

Completeness: every plugin shipped by the Cards extension and every cache directory it creates as of version 1.0.x. Excludes agent CLI internal cache management (Claude Code auto-update, 7-day orphan GC).

Cross-refs: `inspect-settings.md` (plugin enablement), `diagnose-hooks.md` (hook binaries in cache), `diagnose-agent-launch.md` (how plugin cache is used at spawn time).

Parent: `../SKILL.md`

## Quick Diagnostics

```bash
# Claude Code plugin cache
find ~/.claude/plugins/cache/cards.management -maxdepth 3 -type d 2>/dev/null
cat ~/.claude/plugins/installed_plugins.json 2>/dev/null | jq '.["cards.management"]'

# Codex plugin cache
find ~/.codex/plugins/cache/local -maxdepth 2 -type d 2>/dev/null

# Marketplace symlink (stable across extension upgrades)
ls -la ~/.config/Code/User/globalStorage/goodfoot.cards/marketplace 2>/dev/null

# Codex plugin manifests in cache
find ~/.codex/plugins/cache/local -name "plugin.json" -path "*/.codex-plugin/*" -type f 2>/dev/null
```

## Plugin Bundle Layout

The Cards extension ships four Claude Code plugins and four Codex plugins:

```
{ext}/dist/marketplace/claude/
  cards/                 → Plugin "cards@cards.cards"       Status: current
  cards-assistant/       → Plugin "cards-assistant@cards.cards"  Status: current
  cards-sdk/             → Plugin "cards-sdk@cards.cards"       Status: current
  runtime/               → Plugin "runtime@cards.cards"         Status: current

{ext}/dist/codex/
  cards/                 → Codex plugin "cards"                  Status: current
  cards-assistant/       → Codex plugin "cards-assistant"         Status: current
  cards-sdk/             → Codex plugin "cards-sdk"               Status: current
  runtime/               → Codex plugin "runtime"                 Status: current
```

Each contains a `.claude-plugin/plugin.json` or `.codex-plugin/plugin.json` with `name` and `version`.

## Marketplace Symlink

**Path**: `{globalStorage}/marketplace` → `{ext}/dist/marketplace`. **Status**: current.

**Created by**: `ensureMarketplaceSymlink()` in `packages/extension/src/services/marketplaceSymlink.ts`. On POSIX: native symlink. On Windows: directory junction. Removed and recreated on every extension activation so upgrades point to the latest version.

**Why stable**: VS Code installs each extension version to a versioned directory (e.g. `~/.vscode/extensions/publisher.extension-1.2.3/`). A symlink in `globalStorage` survives upgrades — agent settings reference a path that doesn't change.

A `codex` symlink follows the same pattern: `{globalStorage}/codex` → `{ext}/dist/codex`.

The `MARKETPLACE_PATH` env var injected into agent processes holds the stable symlink path.

## Claude Code Plugin Cache

**Path**: `{claudeConfigDir}/plugins/cache/cards.management/{plugin}/{version}/`. **Status**: current.

**Resolution**: `resolveClaudeConfigDir()` in `public/packages/sdk/src/marketplace.ts` — honors `$CLAUDE_CONFIG_DIR`, then `$XDG_DATA_HOME/claude` → `$XDG_CONFIG_HOME/claude` → `~/.config/claude` → `~/.claude`. This is a disk-probe resolver (requires the `plugins/` subdirectory to exist for fallthrough).

### Registration Files

| Path | Purpose | Schema | Status |
|------|---------|--------|--------|
| `known_marketplaces.json` | Marketplace registry | `{ "<name>": { "source": { "source": "directory", "path": "<dir>" }, "installLocation": "<dir>" } }` | current |
| `installed_plugins.json` | Active plugin version pointers | `{ "<name>": { "version": "<ver>", "installPath": "<path>", "installedAt": "<ISO>" } }` | current |

**Source**: `public/packages/sdk/src/marketplace.ts`::`updateMarketplaceRegistration()`.

### Registration Flow

1. Reads `known_marketplaces.json`
2. Updates the `cards.management` entry's `source.path` and `installLocation` to the stable marketplace path
3. Writes back atomically

This ensures plugin version checks hit the cache instead of re-scanning the source directory.

### Headless Session Materialization

For background (headless) `claude --print` sessions that don't auto-sync marketplaces, the `ClaudeInstaller` calls:

```bash
claude plugin marketplace add <marketplacePath> --scope <scope>
claude plugin install cards@cards.cards --scope <scope>
```

This populates the plugin store so `--print` sessions can discover the plugins.

## Codex Plugin Cache

**Path**: `{codexHome}/plugins/cache/local/{pluginName}/{version}/`. **Status**: current.

### Staging Flow

`populateCodexPluginCache()` in `public/packages/default-configuration/src/lib/codex-session.ts`:

1. Reads the bundled `{bundlePath}/.agents/plugins/marketplace.json` to discover plugins
2. For each plugin, reads its `.codex-plugin/plugin.json` for the version
3. Staging: creates a temp dir under `{marketplaceDir}/.plugin-install-XXXXXX`, copies source files with `fs.cp`, then atomically renames to `{marketplaceDir}/{pluginName}/{version}/`
4. Prunes superseded versions via `pruneSupersededPluginVersions()` — keeps only the highest semver

### Plugins Staged for Launch

`CODEX_LAUNCH_PLUGIN_NAMES`: `['cards', 'runtime']`. `CODEX_ASSISTANT_PLUGIN_NAMES`: `['cards', 'cards-assistant']`. **Status**: current.

The `cards-sdk` plugin is NOT staged — it's only consumed at build time.

## Which Plugins Are Used When

| Mode | Plugin names | Purpose | Status |
|------|-------------|---------|--------|
| **Action launch** (Claude) | `runtime@cards.cards` | Runtime hooks (session management, transcript streaming, commit attribution) | current |
| **Action launch** (Codex) | `cards`, `runtime` | Same, Codex equivalents | current |
| **Cards Assistant** (Claude) | `cards@cards.cards`, `cards-assistant@cards.cards` | Card management + interview bootstrapping | current |
| **Cards Assistant** (Codex) | `cards`, `cards-assistant` | Same, Codex equivalents | current |

## Staleness & Cleanup

Based on cache state:
- **Claude cache has old versions**: Managed by Claude Code's own plugin system — 7-day orphan GC on unused versions.
- **Codex cache has old versions**: `pruneSupersededPluginVersions()` deletes all but the highest semver at each cache population.
- **Marketplace symlink unchanged**: Recreated on every extension activation — always points to the current version.
- **Extension upgraded but settings reference old paths**: The marketplace symlink is stable — `MARKETPLACE_PATH` doesn't change. But installed plugin pointers in `installed_plugins.json` may point to a stale cache directory. Re-running the agent install flow refreshes them.

## Out of Scope

- Plugin enablement in settings files → `inspect-settings.md`
- Hook registration and execution → `diagnose-hooks.md`
- Agent launch (cache consumed at spawn) → `diagnose-agent-launch.md`
- Agent CLI internal cache management → Claude Code / Codex documentation
