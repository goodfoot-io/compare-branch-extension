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

import { execFile } from 'node:child_process';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { promisify } from 'node:util';
import type { CardsClient } from '@cards/sdk/client';
import type { ActionContext, ActionInput } from '@cards/sdk/config';
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
 * Builds the `--settings` JSON that enables the `runtime` plugin and registers
 * the `cards.management` marketplace source so the spawned `claude` process
 * can resolve the plugin independently of the parent session's settings.
 *
 * The marketplace `directory` source path must be absolute because inline JSON
 * passed via `--settings` has no file-system anchor for relative-path resolution
 * (same class of bug as Card #11278).
 *
 * @param worktreePath - Absolute path to the worktree where `claude` runs.
 * @returns Serialised settings JSON string.
 */
export function buildPluginSettings(worktreePath: string): string {
  return JSON.stringify({
    enabledPlugins: { 'runtime@cards.management': true },
    extraKnownMarketplaces: {
      'cards.management': {
        source: { source: 'directory', path: path.join(worktreePath, 'public') }
      }
    }
  });
}

/**
 * Builds the CLI argument list for the `claude` process.
 *
 * @param prompt - The prompt string for new sessions.
 * @param sessionId - Session identifier (used for `--session-id` or `--resume`).
 * @param resume - When true, passes `--resume` instead of starting a new session.
 * @param mode - Execution mode; `'background'` appends `--print`.
 * @param cardRepoPath - Absolute path passed via `--add-dir`.
 * @param worktreePath - Absolute path to the worktree (used to build settings).
 * @returns Array of CLI arguments.
 */
export function buildArgs(
  prompt: string,
  sessionId: string,
  resume: boolean,
  mode: ActionInput['executionMode'],
  cardRepoPath: string,
  worktreePath: string
): string[] {
  const args: string[] = [];

  if (resume) {
    args.push('--resume', sessionId);
  } else {
    args.push(prompt);
    args.push('--session-id', sessionId);
  }
  args.push('--settings', buildPluginSettings(worktreePath));
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
      // Check if branch is merged into baseBranch (exits non-zero when NOT merged)
      await execFileAsync('git', ['merge-base', '--is-ancestor', branch.name, baseBranch], {
        cwd: input.workspacePath
      });

      // Branch is merged — clean up worktree, branch ref, and API record
      if (branch.worktree) {
        try {
          await execFileAsync('git', ['worktree', 'remove', branch.worktree], {
            cwd: input.workspacePath
          });
        } catch (wtError) {
          logger.warn('Failed to remove worktree', {
            branch: branch.name,
            error: errorMessage(wtError)
          });
        }
      }

      try {
        await execFileAsync('git', ['branch', '-d', branch.name], {
          cwd: input.workspacePath
        });
      } catch (brError) {
        logger.warn('Failed to delete branch', {
          branch: branch.name,
          error: errorMessage(brError)
        });
      }

      try {
        await client.removeBranch(input.cardId, branch.name);
      } catch (apiError) {
        logger.warn('Failed to remove branch from API', {
          branch: branch.name,
          error: errorMessage(apiError)
        });
      }

      logger.info('Cleaned up merged branch', { branch: branch.name });
    } catch {
      // merge-base --is-ancestor exits non-zero when NOT an ancestor (not merged).
      // This is expected for unmerged branches — no action needed.
      logger.debug('Branch not merged, skipping cleanup', { branch: branch.name });
    }
  }
}
