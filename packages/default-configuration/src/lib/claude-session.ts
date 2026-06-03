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
import * as fsSyncNs from 'node:fs';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { promisify } from 'node:util';
import { type ActionContext, type ActionInput, CARDS_ENV_VARS, resolveWorktreeDir } from '@cards/sdk';
import type { CardsClient } from '@cards/sdk/client';
import { createCardsClient } from '@cards/sdk/client/discovery';
import { resolveClaudeConfigDir, updateMarketplaceRegistration } from '@cards/sdk/marketplace';
import { BRANCHES_FILE } from '@cards/sdk/protocol';

export { resolveClaudeConfigDir, updateMarketplaceRegistration };

import type { CreateWorktreeResult } from '@cards/sdk/worktree';
import { checkWorktreeExists, findGitRoots } from '@cards/sdk/worktree';
import { createWorktreeForCard } from '@cards/sdk/worktree-for-card';
import { spawnBranchCleanupWatcher } from './branch-cleanup-watcher.js';

const execFileAsync = promisify(execFile);

let _cliExecutable: string | undefined;

/**
 * Resolves the CLI executable to use for spawning sessions.
 * Returns `'deepseek'` if it is available on the path, otherwise `'claude'`.
 * The result is cached for the process lifetime.
 *
 * @returns The CLI executable name.
 */
async function resolveCliExecutable(): Promise<string> {
  if (_cliExecutable !== undefined) return _cliExecutable;
  try {
    // `which` does not exist on native Windows; `where` is its equivalent.
    // Mirrors packages/extension/src/utils/nodeRuntime.ts. `where` prints to
    // stderr and exits non-zero when the executable is not found, which the
    // catch handles; on success it may print multiple lines (one per match).
    await execFileAsync(process.platform === 'win32' ? 'where' : 'which', ['deepseek']);
    _cliExecutable = 'deepseek';
  } catch {
    _cliExecutable = 'claude';
  }
  return _cliExecutable;
}

/**
 * Extracts a human-readable message from an unknown catch value.
 * @param error - The caught value to extract a message from.
 * @returns The error message string.
 */
export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Resolves the stable marketplace symlink path set by ActionDispatcher.
 * Uses the MARKETPLACE_PATH environment variable which points to the
 * global-storage symlink rather than the versioned extension install path.
 *
 * @returns Absolute path to the marketplace directory.
 * @throws Error if MARKETPLACE_PATH is not set.
 */
export function resolveMarketplacePath(): string {
  const value = process.env[CARDS_ENV_VARS.MARKETPLACE_PATH];
  if (!value) {
    throw new Error(`Missing required environment variable: ${CARDS_ENV_VARS.MARKETPLACE_PATH}`);
  }
  return value;
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
 * Builds the CLI argument list for the `claude` process.
 *
 * @param prompt - The prompt string for new sessions. Omit for prompt-less sessions.
 * @param sessionId - Session identifier (used for `--session-id` or `--resume`).
 * @param resume - When true, passes `--resume` instead of starting a new session.
 * @param mode - Execution mode; `'background'` appends `--print`.
 * @param cardRepoPath - Absolute path passed via `--add-dir`.
 * @param marketplacePath - Absolute path to the bundled marketplace directory.
 * @returns Array of CLI arguments.
 */
export function buildArgs(
  prompt: string | undefined,
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
    if (prompt !== undefined) {
      args.push(prompt);
    }
    args.push('--session-id', sessionId);
  }
  args.push('--settings', buildPluginSettings(marketplacePath));
  args.push('--add-dir', cardRepoPath);
  args.push('--disallowed-tools', 'EnterPlanMode, ExitPlanMode, NotebookEdit, TodoWrite');
  args.push('--teammate-mode', 'in-process');
  // Temporarily disable as this creates an interactive warning dialog
  // args.push('--dangerously-load-development-channels', 'plugin:runtime@cards.management');
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
      // Fallback: read card-level parentBranch from CARD.meta.json via API.
      // Parallel implementations: Router (POST /cards) and CardsViewProvider resolve via store.getBranches().
      let cardParentBranch: string | undefined;
      try {
        const card = await client.getCard(cardId);
        cardParentBranch = card.parentBranch;
      } catch (error) {
        console.warn(`resolveBaseBranch: getCard(${cardId}) failed, using branch-record error`, errorMessage(error));
      }
      if (cardParentBranch && !cardParentBranch.startsWith('cards/')) {
        return cardParentBranch;
      }
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
/**
 * Builds the `compiledScriptPaths` map for `createWorktree({ cardId })`.
 *
 * Points each Cards-active hook type at the compiled `.mjs` artifact bundled
 * with the extension (`<extensionPath>/dist/git-hooks/*.mjs`). Required when
 * `cardId` is set — without it `createWorktree` throws (D10a guard).
 *
 * @param extensionPath - Absolute path to the extension installation directory.
 * @returns Map of hook name to absolute compiled `.mjs` path.
 */
function compiledHookScriptPaths(extensionPath: string): Record<string, string> {
  const gitHooksDir = path.join(extensionPath, 'dist', 'git-hooks');
  return {
    'pre-commit': path.join(gitHooksDir, 'pre-commit.mjs'),
    'post-commit': path.join(gitHooksDir, 'post-commit.mjs'),
    'post-rewrite': path.join(gitHooksDir, 'post-rewrite.mjs')
  };
}

/**
 * Finds or creates a worktree for the card.
 *
 * Tries to reuse an existing branch whose worktree is still on disk. When no
 * valid branch exists, creates a new one and registers it with the API. New
 * card-bound worktrees are provisioned with the per-worktree hook dispatcher
 * (compiled `.mjs` paths from the extension install).
 *
 * @param input - Action input containing cardId and workspace paths.
 * @param client - Cards API client for branch CRUD.
 * @param baseBranch - Current branch in the workspace (used as parent).
 * @param logger - Logger for diagnostic output.
 * @param sessionId - Coding-agent session ID forwarded to the API so the card repo post-commit hook can attribute the commit.
 * @returns Worktree path, branch name, parent branch name, and optional settle promise.
 */
export async function resolveOrCreateWorktree(
  input: ActionInput,
  client: CardsClient,
  baseBranch: string,
  logger: ActionContext['logger'],
  sessionId?: string
): Promise<{
  worktreePath: string;
  branchName: string;
  parentBranch: string;
  settle?: Promise<CreateWorktreeResult>;
}> {
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
    if (!branch.name.startsWith(`cards/${input.cardId}/`)) continue;

    logger.info('Reattaching worktree for existing branch', { branch: branch.name });
    const { path: worktreePath, settle } = await createWorktreeForCard(client, branch.name, {
      cwd: input.repoRoot,
      cardId: input.cardId,
      compiledScriptPaths: compiledHookScriptPaths(input.extensionPath),
      parentBranch: branch.parentBranch,
      sessionId
    });

    return { worktreePath, branchName: branch.name, parentBranch: branch.parentBranch, settle };
  }

  // Step 3: No valid existing branch — create new one.
  //
  // Since every creator now routes through createWorktreeForCard, a newly
  // created worktree is always registered in the API the instant it exists on
  // disk, so this codepath can no longer leave git ahead of the API for
  // worktrees it produces. This git-probe loop is therefore a defensive safety
  // net, not load-bearing reconciliation: it recovers from *pre-existing*
  // orphaned worktrees (created before this consolidation, or whose API record
  // was deleted out-of-band) by probing git's actual state and incrementing
  // past any occupied slots so we never collide with a worktree git already
  // knows about. It is retained deliberately — removing it would risk
  // clobbering a legacy orphan on a user's disk.
  const prefix = `cards/${input.cardId}/`;
  const existingNumbers = branches
    .filter((b) => b.name.startsWith(prefix))
    .map((b) => parseInt(b.name.slice(prefix.length), 10))
    .filter((n) => !Number.isNaN(n));
  let nextNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1;

  const { repoRoot } = await findGitRoots(input.repoRoot);
  while (await checkWorktreeExists(repoRoot, resolveWorktreeDir(repoRoot, `${prefix}${nextNumber}`))) {
    logger.warn('Worktree already exists in git but not in API, skipping', {
      branch: `${prefix}${nextNumber}`
    });
    nextNumber++;
  }

  const branchName = `${prefix}${nextNumber}`;
  const { path: worktreePath, settle } = await createWorktreeForCard(client, branchName, {
    cwd: input.repoRoot,
    cardId: input.cardId,
    compiledScriptPaths: compiledHookScriptPaths(input.extensionPath),
    parentBranch: baseBranch,
    sessionId
  });

  logger.info('Created new worktree', { branch: branchName, worktree: worktreePath });
  return { worktreePath, branchName, parentBranch: baseBranch, settle };
}

/**
 * Kills processes whose current working directory is inside the given directory.
 *
 * Scans `/proc/[pid]/cwd` symlinks to find processes rooted under `dirPath`,
 * sends SIGTERM, waits briefly, then SIGKILL any survivors. Skips the current
 * process. Non-fatal: errors reading `/proc` entries are silently ignored.
 *
 * @param dirPath - Absolute path to the directory whose child processes should be killed.
 * @param logger - Logger for diagnostic output.
 */
export async function killProcessesInDirectory(dirPath: string, logger: ActionContext['logger']): Promise<void> {
  const resolvedDir = fsSyncNs.realpathSync(dirPath);
  const pidsToKill: number[] = [];

  let entries: string[];
  try {
    entries = await fs.readdir('/proc');
  } catch {
    return; // /proc not available (non-Linux)
  }

  for (const entry of entries) {
    if (!/^\d+$/.test(entry)) continue;
    const pid = parseInt(entry, 10);
    if (pid === process.pid) continue;

    try {
      const cwdLink = await fs.readlink(`/proc/${pid}/cwd`);
      if (cwdLink === resolvedDir || cwdLink.startsWith(`${resolvedDir}/`)) {
        pidsToKill.push(pid);
      }
    } catch (error: unknown) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code === 'ENOENT' || code === 'EACCES') continue;
      logger.debug('Failed to read /proc cwd symlink', { pid, error: errorMessage(error) });
    }
  }

  if (pidsToKill.length === 0) return;

  logger.info('Killing processes with cwd inside worktree', { dirPath, pids: pidsToKill });

  for (const pid of pidsToKill) {
    try {
      process.kill(pid, 'SIGTERM');
    } catch (error: unknown) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code !== 'ESRCH') {
        logger.debug('SIGTERM failed', { pid, error: errorMessage(error) });
      }
    }
  }

  await new Promise((resolve) => setTimeout(resolve, 300));

  for (const pid of pidsToKill) {
    try {
      process.kill(pid, 'SIGKILL');
    } catch (error: unknown) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code !== 'ESRCH') {
        logger.debug('SIGKILL failed', { pid, error: errorMessage(error) });
      }
    }
  }
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
 * ref is deleted, and the branch record is removed from the API. Worktree
 * removal failures are logged and do not block branch deletion. However, the
 * API record is only removed after confirming the git branch was deleted —
 * removing the record while the branch still exists would cause subsequent
 * sessions to lose track of it and create duplicates.
 *
 * Each branch is checked against its own `parentBranch` (the branch it was
 * created from), not the workspace's current HEAD. This ensures branches are
 * only cleaned up when truly merged into their intended target.
 *
 * @param input - Action input containing cardId and workspace paths.
 * @param cardRepoPath - Absolute path to the card's git repository.
 * @param logger - Logger for diagnostic output.
 * @param sessionId - Claude Code session ID set as CARDS_SESSION_ID in the git subprocess environment so the card repo post-commit hook can attribute the commit.
 */
export async function cleanupMergedBranches(
  input: Pick<ActionInput, 'cardId' | 'repoRoot'>,
  cardRepoPath: string,
  logger: ActionContext['logger'],
  sessionId?: string
): Promise<void> {
  let t0 = performance.now();

  // Read branches.json directly from the card repository
  const branchesPath = path.join(cardRepoPath, BRANCHES_FILE);
  let branchesJson: Record<string, { worktree?: string; parentBranch: string; addedAt: string }>;
  try {
    const content = await fs.readFile(branchesPath, 'utf-8');
    branchesJson = JSON.parse(content) as typeof branchesJson;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      logger.debug(`No ${BRANCHES_FILE} found, nothing to clean up`);
      return;
    }
    throw error;
  }

  // Compute existence for each branch via git
  const entries = Object.entries(branchesJson);
  logger.debug(`Read ${BRANCHES_FILE}`, {
    cardId: input.cardId,
    branchCount: entries.length,
    elapsedMs: Math.round(performance.now() - t0)
  });

  for (const [branchName, branchData] of entries) {
    // Check if branch exists in git
    let branchExists = false;
    try {
      const result = await execFileAsync('git', ['branch', '--list', branchName], { cwd: input.repoRoot });
      branchExists = result.stdout.trim().length > 0;
    } catch (error) {
      logger.debug('git branch --list failed, treating as non-existent', {
        branch: branchName,
        error: errorMessage(error)
      });
    }

    if (!branchExists) continue;

    // Self-referential parentBranch is a corrupt state — `merge-base --is-ancestor X X`
    // trivially succeeds, so cleanup would incorrectly remove unmerged work.
    if (branchData.parentBranch === branchName) {
      throw new Error(
        `Branch "${branchName}" has self-referential parentBranch — refusing to run cleanup. ` +
          'This is a data corruption bug: a branch cannot be its own parent.'
      );
    }

    t0 = performance.now();
    try {
      // merge-base --is-ancestor exits non-zero when NOT an ancestor (not merged).
      // Check against the branch's own parentBranch, not the workspace HEAD.
      await execFileAsync('git', ['merge-base', '--is-ancestor', branchName, branchData.parentBranch], {
        cwd: input.repoRoot
      });
    } catch {
      // Expected for unmerged branches — skip cleanup
      logger.debug('Branch not merged, skipping cleanup', {
        branch: branchName,
        elapsedMs: Math.round(performance.now() - t0)
      });
      continue;
    }
    logger.debug('merge-base check completed (merged)', {
      branch: branchName,
      elapsedMs: Math.round(performance.now() - t0)
    });

    // Branch is merged — clean up worktree, branch ref, and branch record
    if (branchData.worktree) {
      t0 = performance.now();
      await tryCleanupStep(
        () => killProcessesInDirectory(branchData.worktree!, logger),
        'Failed to kill processes in worktree',
        branchName,
        logger
      );
      await tryCleanupStep(
        () => execFileAsync('git', ['worktree', 'remove', '--force', branchData.worktree!], { cwd: input.repoRoot }),
        'Failed to remove worktree',
        branchName,
        logger
      );
      logger.debug('Worktree removal completed', {
        branch: branchName,
        elapsedMs: Math.round(performance.now() - t0)
      });
    }

    t0 = performance.now();
    let branchDeleted = false;
    try {
      await execFileAsync('git', ['branch', '-d', branchName], { cwd: input.repoRoot });
      branchDeleted = true;
    } catch (error) {
      logger.warn('Failed to delete branch', { branch: branchName, error: errorMessage(error) });
    }
    logger.debug('Branch deletion completed', {
      branch: branchName,
      branchDeleted,
      elapsedMs: Math.round(performance.now() - t0)
    });

    if (branchDeleted) {
      // Remove the branch entry from branches.json and commit
      t0 = performance.now();
      await tryCleanupStep(
        async () => {
          // Re-read to avoid stale data after earlier iterations
          const freshContent = await fs.readFile(branchesPath, 'utf-8');
          const freshBranches = JSON.parse(freshContent) as Record<string, unknown>;
          delete freshBranches[branchName];
          await fs.writeFile(branchesPath, `${JSON.stringify(freshBranches, null, 2)}\n`, 'utf-8');

          const gitEnv: Record<string, string> = {};
          if (sessionId) {
            gitEnv['CARDS_SESSION_ID'] = sessionId;
          }
          await execFileAsync('git', ['add', BRANCHES_FILE], {
            cwd: cardRepoPath,
            env: { ...process.env, ...gitEnv }
          });
          const branchCount = Object.keys(freshBranches).length;
          await execFileAsync(
            'git',
            ['commit', '-m', `Removed branch "${branchName}" (now tracking ${branchCount}).`],
            { cwd: cardRepoPath, env: { ...process.env, ...gitEnv } }
          );
        },
        'Failed to remove branch from card repo',
        branchName,
        logger
      );
      logger.debug('Card repo branch removal completed', {
        branch: branchName,
        elapsedMs: Math.round(performance.now() - t0)
      });

      logger.info('Cleaned up merged branch', { branch: branchName });
    } else {
      logger.info('Skipped branch record removal — git branch still exists', { branch: branchName });
    }
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
  /** Prompt string passed to the Claude CLI. Omit for prompt-less sessions. */
  prompt?: string;
  /** Session identifier (used for `--session-id` or `--resume`). */
  sessionId: string;
  /** When true, passes `--resume` instead of starting a new session. */
  resume: boolean;
  /**
   * When true, registers {@link ActionContext.onSwitchToInteractive} so
   * background-mode sessions can be promoted to interactive.
   */
  supportsSwitchToInteractive: boolean;
  /**
   * Content injected into the Claude CLI via `--append-system-prompt`.
   * When provided, appended after all other arguments.
   */
  appendSystemPrompt?: string;
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
 * 8. Clean up fully-merged branches (background mode only; in interactive
 *    mode the watcher and extension handle cleanup after the action exits)
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
  const { prompt, sessionId, resume, supportsSwitchToInteractive, appendSystemPrompt } = options;

  context.logger.info(`${input.actionName} action started`, {
    cardId: input.cardId,
    environment: input.environment,
    executionMode: input.executionMode,
    sessionId
  });

  const client = await createCardsClient(context.logger);
  if (!client) {
    throw new Error('Cards API discovery failed — cannot start session');
  }

  const baseBranch = await resolveBaseBranch(input.repoRoot, client);

  const worktreeResult = await resolveOrCreateWorktree(input, client, baseBranch, context.logger, sessionId);

  const { worktreePath: cwd, branchName, parentBranch, settle } = worktreeResult;
  context.logger.info('Using worktree', { cwd, branch: branchName, baseBranch, parentBranch });

  // Let the worktree settle (symlinks, node_modules, git excludes) run
  // concurrently with the claude spawn. Errors are logged, not swallowed.
  if (settle) {
    settle.catch((error) => {
      context.logger.error('Worktree settle failed', { error: errorMessage(error) });
    });
  }

  const marketplacePath = resolveMarketplacePath();
  await updateMarketplaceRegistration(marketplacePath, context.logger);

  const args = buildArgs(prompt, sessionId, resume, input.executionMode, input.cardRepoPath, marketplacePath);
  if (appendSystemPrompt) {
    args.push('--append-system-prompt', appendSystemPrompt);
  }
  const isInteractive = input.executionMode === 'interactive';
  const cliExecutable = await resolveCliExecutable();

  const child: ChildProcess = spawn(cliExecutable, args, {
    cwd,
    stdio: isInteractive ? 'inherit' : ['ignore', 'ignore', 'pipe'],
    env: {
      ...process.env,
      WORKSPACE_PATH: cwd,
      CLAUDE_CODE_TASK_LIST_ID: `cards-extension-${input.cardId}`,
      CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS: '1',
      CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD: '1',
      CLAUDE_CODE_ENABLE_AWAY_SUMMARY: '1',
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
  // In background mode there is no watcher, so we run cleanup inline.
  // In interactive mode we spawn a detached process so the terminal closes
  // immediately — the watcher calls the same cleanupMergedBranches function.
  if (isInteractive) {
    try {
      spawnBranchCleanupWatcher({
        cardId: input.cardId,
        repoRoot: input.repoRoot,
        cardRepoPath: input.cardRepoPath,
        sessionId
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      context.logger.warn('Failed to spawn branch-cleanup watcher (non-fatal)', { error: message, sessionId });
    }
  } else {
    const cleanupStart = performance.now();
    try {
      await cleanupMergedBranches(input, input.cardRepoPath, context.logger, sessionId);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes('self-referential parentBranch') || message.includes('data corruption')) {
        throw error;
      }
      context.logger.warn('Post-exit cleanup failed (non-fatal)', { error: message, sessionId });
    }
    context.logger.debug('Post-exit cleanup finished', {
      sessionId,
      elapsedMs: Math.round(performance.now() - cleanupStart)
    });
  }
}
