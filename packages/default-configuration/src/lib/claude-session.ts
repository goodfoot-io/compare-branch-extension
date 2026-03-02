/**
 * Shared session utilities for Claude Code action workflows.
 *
 * Provides reusable building blocks for actions that spawn the `claude` CLI:
 * plugin settings construction, CLI arg building, worktree lifecycle management,
 * and branch cleanup. Both the `launch` and `interview` actions consume these
 * utilities.
 *
 * @summary Shared session utilities for Claude Code action workflows
 * @module
 */

import { type ChildProcess, execFile, spawn } from 'node:child_process';
import * as fs from 'node:fs/promises';
import { homedir } from 'node:os';
import * as path from 'node:path';
import { promisify } from 'node:util';
import { CardsClient } from '@cards/sdk/client';
import { type ActionContext, type ActionInput, CARDS_ENV_VARS } from '@cards/sdk/config';
import { checkWorktreeExists, createWorktree, findGitRoots } from './create-worktree.js';

const execFileAsync = promisify(execFile);

/**
 * Extracts a human-readable message from an unknown catch value.
 * @param error - The caught value to extract a message from.
 * @returns The error message string.
 */
export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Resolves the marketplace directory bundled with the installed extension.
 * Uses the EXTENSION_PATH environment variable injected by ActionDispatcher.
 *
 * @returns Absolute path to the bundled marketplace directory.
 * @throws Error if EXTENSION_PATH is not set.
 */
export function resolveMarketplacePath(): string {
  const extensionPath = process.env[CARDS_ENV_VARS.EXTENSION_PATH];
  if (!extensionPath) {
    throw new Error(`Missing required environment variable: ${CARDS_ENV_VARS.EXTENSION_PATH}`);
  }
  return path.join(extensionPath, 'dist', 'marketplace');
}

/**
 * Builds the `--settings` JSON that enables the `runtime` plugin and registers
 * the `cards.management` marketplace source so the spawned `claude` process
 * can resolve the plugin from the extension's bundled marketplace.
 *
 * Uses the marketplace bundled inside the extension install directory
 * (`<EXTENSION_PATH>/dist/marketplace`) so the spawned session always loads the
 * plugin version that shipped with the extension, regardless of worktree state.
 *
 * @param marketplacePath - Absolute path to the bundled marketplace directory.
 * @returns Serialised settings JSON string.
 */
export function buildPluginSettings(marketplacePath: string): string {
  return JSON.stringify({
    enabledPlugins: { 'runtime@cards.management': true },
    extraKnownMarketplaces: {
      'cards.management': {
        source: { source: 'directory', path: marketplacePath }
      }
    }
  });
}

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
    } catch {
      // Not found, try next
    }
  }
  return null;
}

/**
 * Reads the version from a plugin.json file.
 * Returns null if the file doesn't exist or can't be parsed.
 *
 * @param pluginJsonPath - Absolute path to the plugin.json file.
 * @returns The version string from the file, or null if unavailable.
 */
async function readPluginVersion(pluginJsonPath: string): Promise<string | null> {
  try {
    const content = await fs.readFile(pluginJsonPath, 'utf-8');
    const parsed = JSON.parse(content) as { version?: string };
    return parsed.version ?? null;
  } catch {
    return null;
  }
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
 * @param marketplacePath - Absolute path to the bundled marketplace directory.
 * @param logger - Logger for diagnostic output.
 */
export async function updateMarketplaceRegistration(
  marketplacePath: string,
  logger: ActionContext['logger']
): Promise<void> {
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

/**
 * Evicts the Claude Code plugin cache for `runtime@cards.management` when the
 * cached version is older than the version bundled with the extension.
 *
 * Reads the bundled runtime plugin.json version from the extension's marketplace
 * directory, then checks for cached versions under
 * `<configDir>/plugins/cache/cards-management/runtime/`. If any cached version
 * exists that is lower than the bundled version, the entire runtime cache
 * directory is removed so Claude Code re-caches from the directory source.
 *
 * @param marketplacePath - Absolute path to the bundled marketplace directory.
 * @param logger - Logger for diagnostic output.
 */
export async function evictStaleRuntimeCache(marketplacePath: string, logger: ActionContext['logger']): Promise<void> {
  const bundledVersion = await readPluginVersion(
    path.join(marketplacePath, 'plugins', 'runtime', '.claude-plugin', 'plugin.json')
  );
  if (!bundledVersion) {
    logger.warn('Could not read bundled runtime plugin version, skipping cache eviction');
    return;
  }

  const configDir = await resolveClaudeConfigDir();
  if (!configDir) {
    logger.debug('Claude config directory not found, skipping cache eviction');
    return;
  }

  const cacheDir = path.join(configDir, 'plugins', 'cache', 'cards-management', 'runtime');
  let entries: string[];
  try {
    entries = await fs.readdir(cacheDir);
  } catch {
    // No cache directory — nothing to evict
    return;
  }

  if (entries.length === 0) return;

  // Check if any cached version is stale (lower than bundled)
  const bundledParts = bundledVersion.split('.').map(Number);
  let hasStale = false;

  for (const entry of entries) {
    const parts = entry.split('.').map(Number);
    if (parts.some(Number.isNaN) || parts.length !== 3) continue;

    // Compare semver: stale if cached < bundled
    for (let i = 0; i < 3; i++) {
      const cached = parts[i] ?? 0;
      const bundled = bundledParts[i] ?? 0;
      if (cached < bundled) {
        hasStale = true;
        break;
      }
      if (cached > bundled) break;
    }
    if (hasStale) break;
  }

  if (!hasStale) {
    logger.debug('Runtime plugin cache is up to date', { bundledVersion, cachedVersions: entries });
    return;
  }

  logger.info('Evicting stale runtime plugin cache', { bundledVersion, cachedVersions: entries });
  await fs.rm(cacheDir, { recursive: true, force: true });
}

/**
 * Builds the CLI argument list for the `claude` process.
 *
 * @param prompt - The prompt string for new sessions.
 * @param sessionId - Session identifier (used for `--session-id` or `--resume`).
 * @param resume - When true, passes `--resume` instead of starting a new session.
 * @param mode - Execution mode; `'background'` appends `--print`.
 * @param cardRepoPath - Absolute path passed via `--add-dir`.
 * @param marketplacePath - Absolute path to the bundled marketplace directory.
 * @returns Array of CLI arguments.
 */
export function buildArgs(
  prompt: string,
  sessionId: string,
  resume: boolean,
  mode: ActionInput['executionMode'],
  cardRepoPath: string,
  marketplacePath: string
): string[] {
  const args: string[] = [];

  if (resume) {
    args.push('--resume', sessionId);
  } else {
    args.push(prompt);
    args.push('--session-id', sessionId);
  }
  args.push('--settings', buildPluginSettings(marketplacePath));
  args.push('--add-dir', cardRepoPath);
  if (mode === 'background') {
    args.push('--print');
  }

  return args;
}

/**
 * Resolves the current branch name in the given workspace.
 *
 * @param workspacePath - Directory where `git rev-parse` runs.
 * @returns The abbreviated branch name at HEAD.
 */
export async function resolveBaseBranch(workspacePath: string): Promise<string> {
  const { stdout } = await execFileAsync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
    cwd: workspacePath
  });
  return stdout.trim();
}

/**
 * Checks whether a worktree path exists on disk.
 *
 * @param worktreePath - Absolute path to test.
 * @returns True when the path is accessible.
 */
async function worktreeExistsOnDisk(worktreePath: string): Promise<boolean> {
  try {
    await fs.access(worktreePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Finds or creates a worktree for the card.
 *
 * Tries to reuse an existing branch whose worktree is still on disk. When no
 * valid branch exists, creates a new one and registers it with the API.
 *
 * @param input - Action input containing cardId and workspace paths.
 * @param client - Cards API client for branch CRUD.
 * @param baseBranch - Current branch in the workspace (used as parent).
 * @param logger - Logger for diagnostic output.
 * @returns Worktree path, branch name, and parent branch name.
 */
export async function resolveOrCreateWorktree(
  input: ActionInput,
  client: CardsClient,
  baseBranch: string,
  logger: ActionContext['logger']
): Promise<{ worktreePath: string; branchName: string; parentBranch: string }> {
  const { branches } = await client.getBranches(input.cardId, { workspacePath: input.workspacePath });

  // Try to reuse an existing branch with a valid worktree on disk
  for (const branch of branches) {
    if (!branch.exists || !branch.worktree) continue;
    if (!(await worktreeExistsOnDisk(branch.worktree))) continue;

    const parentBranch = branch.parentBranch ?? baseBranch;

    logger.info('Reusing existing worktree', { branch: branch.name, worktree: branch.worktree });
    return { worktreePath: branch.worktree, branchName: branch.name, parentBranch };
  }

  // No valid existing branch — create new one.
  // The API may be out of sync with git (e.g. a previous worktree was created
  // but never registered, or its API record was deleted). To avoid colliding
  // with worktrees git already knows about, probe git's actual state and
  // increment past any occupied slots.
  const prefix = `cards/${input.cardId}/`;
  const existingNumbers = branches
    .filter((b) => b.name.startsWith(prefix))
    .map((b) => parseInt(b.name.slice(prefix.length), 10))
    .filter((n) => !Number.isNaN(n));
  let nextNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1;

  const { repoRoot } = await findGitRoots(input.workspacePath);
  while (await checkWorktreeExists(repoRoot, path.join(repoRoot, '.worktrees', `${prefix}${nextNumber}`))) {
    logger.warn('Worktree already exists in git but not in API, skipping', {
      branch: `${prefix}${nextNumber}`
    });
    nextNumber++;
  }

  const branchName = `${prefix}${nextNumber}`;
  const result = await createWorktree(branchName, { cwd: input.workspacePath });
  await client.addBranch(input.cardId, { name: branchName, worktree: result.worktree, parentBranch: baseBranch });

  logger.info('Created new worktree', { branch: branchName, worktree: result.worktree });
  return { worktreePath: result.worktree, branchName, parentBranch: baseBranch };
}

/**
 * Runs a single cleanup step, logging a warning on failure rather than
 * aborting the sweep. Each step (worktree removal, branch deletion, API
 * record removal) is independent — a failure in one must not prevent the
 * others from running.
 *
 * @param step - Async operation to attempt.
 * @param label - Human-readable label logged on failure.
 * @param branchName - Branch name included in diagnostic output.
 * @param logger - Logger for diagnostic output.
 */
async function tryCleanupStep(
  step: () => Promise<unknown>,
  label: string,
  branchName: string,
  logger: ActionContext['logger']
): Promise<void> {
  try {
    await step();
  } catch (error) {
    logger.warn(label, { branch: branchName, error: errorMessage(error) });
  }
}

/**
 * Removes branches that are fully merged into the base branch.
 *
 * For each merged branch the worktree directory is removed, the local branch
 * ref is deleted, and the branch record is removed from the API. Individual
 * failures are logged and do not abort the sweep.
 *
 * @param input - Action input containing cardId and workspace paths.
 * @param client - Cards API client for branch removal.
 * @param baseBranch - Branch to check merge status against.
 * @param logger - Logger for diagnostic output.
 */
export async function cleanupMergedBranches(
  input: ActionInput,
  client: CardsClient,
  baseBranch: string,
  logger: ActionContext['logger']
): Promise<void> {
  const { branches } = await client.getBranches(input.cardId, { workspacePath: input.workspacePath });

  for (const branch of branches) {
    if (!branch.exists) continue;

    try {
      // merge-base --is-ancestor exits non-zero when NOT an ancestor (not merged)
      await execFileAsync('git', ['merge-base', '--is-ancestor', branch.name, baseBranch], {
        cwd: input.workspacePath
      });
    } catch {
      // Expected for unmerged branches — skip cleanup
      logger.debug('Branch not merged, skipping cleanup', { branch: branch.name });
      continue;
    }

    // Branch is merged — clean up worktree, branch ref, and API record
    if (branch.worktree) {
      await tryCleanupStep(
        () => execFileAsync('git', ['worktree', 'remove', branch.worktree!], { cwd: input.workspacePath }),
        'Failed to remove worktree',
        branch.name,
        logger
      );
    }

    await tryCleanupStep(
      () => execFileAsync('git', ['branch', '-d', branch.name], { cwd: input.workspacePath }),
      'Failed to delete branch',
      branch.name,
      logger
    );

    await tryCleanupStep(
      () => client.removeBranch(input.cardId, branch.name),
      'Failed to remove branch from API',
      branch.name,
      logger
    );

    logger.info('Cleaned up merged branch', { branch: branch.name });
  }
}

// ============================================================================
// Unified session spawner
// ============================================================================

/**
 * Options for {@link spawnClaudeSession}.
 *
 * Actions provide the variable parts (prompt, session identity, switch-to-
 * interactive support); the helper handles everything else: worktree
 * resolution, marketplace registration, env construction, spawn, lifecycle
 * callbacks, and post-exit branch cleanup.
 */
export interface ClaudeSessionOptions {
  /** Prompt string passed to the Claude CLI. */
  prompt: string;
  /** Session identifier (used for `--session-id` or `--resume`). */
  sessionId: string;
  /** When true, passes `--resume` instead of starting a new session. */
  resume: boolean;
  /**
   * When true, registers {@link ActionContext.onSwitchToInteractive} so
   * background-mode sessions can be promoted to interactive.
   */
  supportsSwitchToInteractive: boolean;
}

/**
 * Spawns a `claude` CLI session with full worktree, marketplace, and
 * lifecycle management.
 *
 * Centralises the spawn logic shared by the `launch` and `interview`
 * actions so environment variable construction, worktree resolution,
 * marketplace registration, and post-exit cleanup cannot drift between
 * callers.
 *
 * Steps:
 * 1. Create {@link CardsClient}
 * 2. Resolve base branch and worktree
 * 3. Register marketplace and evict stale cache
 * 4. Build CLI args and spawn `claude`
 * 5. Wire onCancel (and optionally onSwitchToInteractive)
 * 6. Capture stderr in background mode
 * 7. Await process exit
 * 8. Clean up fully-merged branches
 *
 * @param input - Parsed action input from the environment.
 * @param context - Action context providing logger and lifecycle hooks.
 * @param options - Session-specific parameters (prompt, session ID, etc.).
 */
export async function spawnClaudeSession(
  input: ActionInput,
  context: ActionContext,
  options: ClaudeSessionOptions
): Promise<void> {
  const { prompt, sessionId, resume, supportsSwitchToInteractive } = options;

  context.logger.info(`${input.actionName} action started`, {
    cardId: input.cardId,
    environment: input.environment,
    executionMode: input.executionMode,
    sessionId
  });

  const client = new CardsClient({
    baseUrl: input.apiBaseUrl,
    accessToken: input.apiAccessToken
  });

  const baseBranch = await resolveBaseBranch(input.workspacePath);

  const worktreeResult = await resolveOrCreateWorktree(input, client, baseBranch, context.logger);

  const { worktreePath: cwd, branchName, parentBranch } = worktreeResult;
  context.logger.info('Using worktree', { cwd, branch: branchName, baseBranch, parentBranch });

  const marketplacePath = resolveMarketplacePath();
  await updateMarketplaceRegistration(marketplacePath, context.logger);
  await evictStaleRuntimeCache(marketplacePath, context.logger);

  const args = buildArgs(prompt, sessionId, resume, input.executionMode, input.cardRepoPath, marketplacePath);
  const isInteractive = input.executionMode === 'interactive';

  const child: ChildProcess = spawn('claude', args, {
    cwd,
    stdio: isInteractive ? 'inherit' : ['ignore', 'ignore', 'pipe'],
    env: {
      ...process.env,
      WORKSPACE_PATH: cwd,
      CLAUDE_CODE_TASK_LIST_ID: `cards-extension-${input.cardId}`,
      CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS: '1',
      BASE_BRANCH: baseBranch,
      PARENT_BRANCH: parentBranch,
      WORKSPACE_BRANCH: branchName
    }
  });

  context.onCancel(() => {
    context.logger.info(`${input.actionName} action cancelled, terminating claude`, { sessionId });
    child.kill('SIGTERM');
  });

  if (supportsSwitchToInteractive) {
    context.onSwitchToInteractive(() => {
      context.logger.info('Switching to interactive mode', { sessionId });
      child.kill('SIGTERM');
      return { sessionId };
    });
  }

  // Background mode: capture stderr for diagnostic logging
  if (!isInteractive) {
    child.stderr?.on('data', (chunk: Buffer) => {
      const text = chunk.toString().trim();
      if (text) {
        context.logger.warn(text);
      }
    });
  }

  const exitCode = await new Promise<number | null>((resolve) => {
    child.on('close', resolve);
  });

  context.logger.info(`${input.actionName} action completed`, { sessionId, exitCode });

  // Post-exit cleanup: remove fully-merged branches
  try {
    await cleanupMergedBranches(input, client, baseBranch, context.logger);
  } catch (error) {
    context.logger.warn('Branch cleanup failed', {
      error: errorMessage(error)
    });
  }
}
