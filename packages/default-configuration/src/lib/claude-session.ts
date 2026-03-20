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
 * Extracts the card ID from a `cards/<cardId>/<n>` branch name.
 *
 * @param branchName - Branch name to parse.
 * @returns The card ID, or `null` if the branch doesn't match the pattern.
 */
function cardIdFromBranch(branchName: string): string | null {
  const match = branchName.match(/^cards\/(.+)\/\d+$/);
  return match?.[1] ?? null;
}

/**
 * Resolves the base branch for the workspace, following the `parentBranch`
 * chain when HEAD is a `cards/*` worktree branch.
 *
 * Card branches are ephemeral and not valid merge targets. When the workspace
 * HEAD happens to be on one (e.g., the main checkout was left on a card
 * branch), this function queries the API for that branch's `parentBranch`
 * and recurses until it finds a non-`cards/*` branch.
 *
 * @param workspacePath - Directory where `git rev-parse` runs.
 * @param client - Cards API client for resolving parentBranch of card branches.
 * @returns The first non-`cards/*` branch in the parent chain.
 * @throws Error if the parent chain cannot be resolved (missing API records, cycles).
 */
export async function resolveBaseBranch(workspacePath: string, client?: CardsClient): Promise<string> {
  const { stdout } = await execFileAsync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
    cwd: workspacePath
  });
  let branch = stdout.trim();

  const visited = new Set<string>();
  while (branch.startsWith('cards/')) {
    if (visited.has(branch)) {
      throw new Error(`Circular parentBranch chain detected: ${[...visited, branch].join(' → ')}`);
    }
    visited.add(branch);

    const cardId = cardIdFromBranch(branch);
    if (!cardId || !client) {
      throw new Error(
        `Workspace HEAD is on card branch "${branch}" but cannot resolve its parent. ` +
          'Switch the main checkout to a non-card branch (e.g., main).'
      );
    }

    const { branches } = await client.getBranches(cardId, { workspacePath });
    const record = branches.find((b) => b.name === branch);
    if (!record?.parentBranch) {
      throw new Error(
        `Card branch "${branch}" has no parentBranch record. ` +
          'Switch the main checkout to a non-card branch (e.g., main).'
      );
    }

    branch = record.parentBranch;
  }

  return branch;
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
 * @param sessionId - Claude Code session ID forwarded to the API so the card repo post-commit hook can attribute the commit.
 * @returns Worktree path, branch name, and parent branch name.
 */
export async function resolveOrCreateWorktree(
  input: ActionInput,
  client: CardsClient,
  baseBranch: string,
  logger: ActionContext['logger'],
  sessionId?: string
): Promise<{ worktreePath: string; branchName: string; parentBranch: string }> {
  const { branches } = await client.getBranches(input.cardId, { workspacePath: input.repoRoot });

  // Step 1: Try to reuse an existing branch with a valid worktree on disk
  for (const branch of branches) {
    if (!branch.exists || !branch.worktree) continue;
    if (!(await worktreeExistsOnDisk(branch.worktree))) continue;

    logger.info('Reusing existing worktree', { branch: branch.name, worktree: branch.worktree });
    return { worktreePath: branch.worktree, branchName: branch.name, parentBranch: branch.parentBranch };
  }

  // Step 2: Try to create a worktree for an existing branch whose worktree
  // is missing from disk (e.g. cleaned up by a previous session crash).
  for (const branch of branches) {
    if (!branch.exists) continue;

    logger.info('Reattaching worktree for existing branch', { branch: branch.name });
    const result = await createWorktree(branch.name, { cwd: input.repoRoot });

    // Update the API record with the new worktree path
    await client.addBranch(
      input.cardId,
      { name: branch.name, worktree: result.worktree, parentBranch: branch.parentBranch },
      { sessionId }
    );

    return { worktreePath: result.worktree, branchName: branch.name, parentBranch: branch.parentBranch };
  }

  // Step 3: No valid existing branch — create new one.
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

  const { repoRoot } = await findGitRoots(input.repoRoot);
  while (await checkWorktreeExists(repoRoot, path.join(repoRoot, '.worktrees', `${prefix}${nextNumber}`))) {
    logger.warn('Worktree already exists in git but not in API, skipping', {
      branch: `${prefix}${nextNumber}`
    });
    nextNumber++;
  }

  const branchName = `${prefix}${nextNumber}`;
  const result = await createWorktree(branchName, { cwd: input.repoRoot });
  await client.addBranch(
    input.cardId,
    { name: branchName, worktree: result.worktree, parentBranch: baseBranch },
    { sessionId }
  );

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
 * Removes branches that are fully merged into their parent branch.
 *
 * For each merged branch the worktree directory is removed, the local branch
 * ref is deleted, and the branch record is removed from the API. Individual
 * failures are logged and do not abort the sweep.
 *
 * Each branch is checked against its own `parentBranch` (the branch it was
 * created from), not the workspace's current HEAD. This ensures branches are
 * only cleaned up when truly merged into their intended target.
 *
 * @param input - Action input containing cardId and workspace paths.
 * @param client - Cards API client for branch removal.
 * @param logger - Logger for diagnostic output.
 * @param sessionId - Claude Code session ID forwarded to the API so the card repo post-commit hook can attribute the commit.
 */
export async function cleanupMergedBranches(
  input: ActionInput,
  client: CardsClient,
  logger: ActionContext['logger'],
  sessionId?: string
): Promise<void> {
  const { branches } = await client.getBranches(input.cardId, { workspacePath: input.repoRoot });

  for (const branch of branches) {
    if (!branch.exists) continue;

    // Self-referential parentBranch is a corrupt state — `merge-base --is-ancestor X X`
    // trivially succeeds, so cleanup would incorrectly remove unmerged work.
    if (branch.parentBranch === branch.name) {
      throw new Error(
        `Branch "${branch.name}" has self-referential parentBranch — refusing to run cleanup. ` +
          'This is a data corruption bug: a branch cannot be its own parent.'
      );
    }

    try {
      // merge-base --is-ancestor exits non-zero when NOT an ancestor (not merged).
      // Check against the branch's own parentBranch, not the workspace HEAD.
      await execFileAsync('git', ['merge-base', '--is-ancestor', branch.name, branch.parentBranch], {
        cwd: input.repoRoot
      });
    } catch {
      // Expected for unmerged branches — skip cleanup
      logger.debug('Branch not merged, skipping cleanup', { branch: branch.name });
      continue;
    }

    // Branch is merged — clean up worktree, branch ref, and API record
    if (branch.worktree) {
      await tryCleanupStep(
        () => execFileAsync('git', ['worktree', 'remove', branch.worktree!], { cwd: input.repoRoot }),
        'Failed to remove worktree',
        branch.name,
        logger
      );
    }

    await tryCleanupStep(
      () => execFileAsync('git', ['branch', '-d', branch.name], { cwd: input.repoRoot }),
      'Failed to delete branch',
      branch.name,
      logger
    );

    await tryCleanupStep(
      () => client.removeBranch(input.cardId, branch.name, { sessionId }),
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
 * 3. Register marketplace
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

  const baseBranch = await resolveBaseBranch(input.repoRoot, client);

  const worktreeResult = await resolveOrCreateWorktree(input, client, baseBranch, context.logger, sessionId);

  const { worktreePath: cwd, branchName, parentBranch } = worktreeResult;
  context.logger.info('Using worktree', { cwd, branch: branchName, baseBranch, parentBranch });

  const marketplacePath = resolveMarketplacePath();
  await updateMarketplaceRegistration(marketplacePath, context.logger);

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

  // Post-exit cleanup: remove fully-merged branches.
  // Data corruption (e.g. self-referential parentBranch) propagates as a hard
  // failure. Network/transient errors are logged as warnings — the watcher and
  // extension provide redundant cleanup paths.
  try {
    await cleanupMergedBranches(input, client, context.logger, sessionId);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('self-referential parentBranch') || message.includes('data corruption')) {
      throw error;
    }
    context.logger.warn('Post-exit cleanup failed (non-fatal)', { error: message, sessionId });
  }
}
