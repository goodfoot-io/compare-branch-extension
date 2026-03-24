/**
 * Claude Code marketplace registration utilities.
 *
 * Provides functions for resolving the Claude Code configuration directory
 * and updating the `known_marketplaces.json` file so that plugin version
 * checks hit the cache instead of re-scanning the source directory.
 *
 * @summary Claude Code marketplace registration utilities
 * @module
 */

import * as fs from 'node:fs/promises';
import { homedir } from 'node:os';
import * as path from 'node:path';
import type { ILogger } from './config/logger.js';

/**
 * Resolves the Claude Code configuration directory using the standard
 * fallback chain: $CLAUDE_CONFIG_DIR → $XDG_DATA_HOME/claude →
 * $XDG_CONFIG_HOME/claude → ~/.config/claude → ~/.claude.
 *
 * Returns the first candidate that exists on disk, or null if none is found.
 *
 * @returns The first existing Claude config directory path, or null if none found.
 */
export async function resolveClaudeConfigDir(): Promise<string | null> {
  const home = homedir();
  const candidates: string[] = [];

  const claudeConfigDir = process.env['CLAUDE_CONFIG_DIR'];
  if (claudeConfigDir) candidates.push(claudeConfigDir);

  const xdgDataHome = process.env['XDG_DATA_HOME'];
  if (xdgDataHome) candidates.push(path.join(xdgDataHome, 'claude'));

  const xdgConfigHome = process.env['XDG_CONFIG_HOME'];
  if (xdgConfigHome) candidates.push(path.join(xdgConfigHome, 'claude'));

  candidates.push(path.join(home, '.config', 'claude'));
  candidates.push(path.join(home, '.claude'));

  for (const candidate of candidates) {
    try {
      await fs.access(path.join(candidate, 'plugins'));
      return candidate;
    } catch (error: unknown) {
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
        continue;
      }
      throw error;
    }
  }
  return null;
}

/**
 * Updates the `cards.management` entry in Claude Code's `known_marketplaces.json`
 * to point to the extension-bundled marketplace using an absolute path.
 *
 * Claude Code resolves directory marketplace sources relative to the spawned
 * session's CWD. When sessions run in a worktree, a relative path like `"public"`
 * resolves to the worktree's copy — which may contain a stale plugin version.
 * Writing an absolute path ensures Claude Code always reads from the extension's
 * bundled marketplace, regardless of CWD.
 *
 * ## How Claude Code's plugin version syncing works
 *
 * This registration update is the **only** intervention we need. Claude Code's
 * built-in auto-update system handles the rest:
 *
 * 1. **Version detection** — On session start, Claude Code reads the marketplace
 *    source directory (the `source.path` written here) and extracts the version
 *    from each plugin's `.claude-plugin/plugin.json`.
 *
 * 2. **Cache-per-version** — Each plugin version is cached independently under
 *    `<configDir>/plugins/cache/<marketplace>/<plugin>/<version>/`. The active
 *    version's path is recorded as `installPath` in `installed_plugins.json`.
 *
 * 3. **Auto-update** — When the source directory contains a newer version than
 *    what's cached, Claude Code copies the source into a new versioned cache
 *    directory, updates `installed_plugins.json` to point to it, and writes a
 *    `.orphaned_at` timestamp into the old version's cache directory.
 *
 * 4. **Orphan GC** — A background housekeeping task runs every 10 minutes. It
 *    walks the cache, marks any version directory not referenced by
 *    `installed_plugins.json` with `.orphaned_at`, and deletes orphaned
 *    directories only after a **7-day** grace period. This ensures that
 *    concurrently running sessions are never disrupted by cache deletion.
 *
 * We previously force-deleted stale cache entries (`evictStaleRuntimeCache`),
 * which bypassed the 7-day grace period and caused ENOENT errors in sessions
 * still referencing the deleted paths.
 *
 * @param marketplacePath - Absolute path to the bundled marketplace directory.
 * @param logger - Logger for diagnostic output.
 */
export async function updateMarketplaceRegistration(marketplacePath: string, logger: ILogger): Promise<void> {
  const configDir = await resolveClaudeConfigDir();
  if (!configDir) {
    logger.debug('Claude config directory not found, skipping marketplace registration update');
    return;
  }

  const knownPath = path.join(configDir, 'plugins', 'known_marketplaces.json');
  let raw: string;
  try {
    raw = await fs.readFile(knownPath, 'utf-8');
  } catch (error: unknown) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      logger.debug('known_marketplaces.json not found, skipping');
      return;
    }
    throw error;
  }

  const data = JSON.parse(raw) as Record<
    string,
    { source?: { source?: string; path?: string }; installLocation?: string; lastUpdated?: string }
  >;
  const entry = data['cards.management'];
  if (!entry?.source || entry.source.source !== 'directory') return;

  if (entry.source.path === marketplacePath && entry.installLocation === marketplacePath) {
    logger.debug('Marketplace registration already points to extension bundle');
    return;
  }

  entry.source.path = marketplacePath;
  entry.installLocation = marketplacePath;
  entry.lastUpdated = new Date().toISOString();
  await fs.writeFile(knownPath, `${JSON.stringify(data, null, 4)}\n`);
  logger.info('Updated marketplace registration to extension bundle', { marketplacePath });
}
