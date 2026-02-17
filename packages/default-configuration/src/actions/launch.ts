/**
 * Launch action for Claude Code workflows.
 *
 * Spawns the `claude` CLI for the current card. In interactive mode, the
 * process inherits stdio so the user gets direct terminal control. In
 * background mode, Claude runs with `--print --output-format stream-json`
 * and each stdout line is streamed to the server's `claude-code-session`
 * stream endpoint via {@link CardsClient.openStream}.
 *
 * The action awaits process exit before resolving, so the terminal closes
 * only after Claude finishes and cleanup is complete.
 *
 * @summary Launch action for Claude Code workflows
 * @module
 * @see {@link defineAction} for factory behavior and metadata attachment
 */

import { type ChildProcess, execFile, spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import * as fs from 'node:fs/promises';
import { promisify } from 'node:util';
import { CardsClient } from '@cards/sdk/client';
import { type ActionContext, type ActionInput, defineAction } from '@cards/sdk/config';
import { createWorktree } from '../lib/create-worktree.js';

const execFileAsync = promisify(execFile);

/** Extracts a human-readable message from an unknown catch value. */
function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Settings JSON that enables the `claude-code-cli-v2` plugin and includes
 * the `cards.management` marketplace source so the spawned `claude` process
 * can resolve the plugin independently of the parent session's settings.
 */
const PLUGIN_SETTINGS = JSON.stringify({
  enabledPlugins: { 'runtime@cards.management': true },
  extraKnownMarketplaces: {
    'cards.management': {
      //      source: { source: 'github', repo: 'goodfoot-io/compare-branch-extension' }
      source: { source: 'directory', path: 'public' }
    }
  }
});

function buildArgs(
  prompt: string,
  sessionId: string,
  resume: boolean,
  mode: ActionInput['executionMode'],
  cardRepoPath: string
): string[] {
  const args: string[] = [];

  if (resume) {
    args.push('--resume', sessionId);
  } else {
    args.push(prompt);
    args.push('--session-id', sessionId);
  }
  args.push('--agent', 'runtime:router');
  args.push('--settings', PLUGIN_SETTINGS);
  args.push('--add-dir', cardRepoPath);
  if (mode === 'background') {
    args.push('--print', '--output-format', 'stream-json');
  }

  return args;
}

/**
 * Resolves the current branch name in the given workspace.
 *
 * @param workspacePath - Directory where `git rev-parse` runs.
 * @returns The abbreviated branch name at HEAD.
 */
async function resolveBaseBranch(workspacePath: string): Promise<string> {
  const { stdout } = await execFileAsync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
    cwd: workspacePath
  });
  return stdout.trim();
}

/**
 * Attempts to fast-forward a branch to its parent HEAD when no unique commits exist.
 *
 * Silently skips when the parent branch is missing, git log fails, or the
 * branch already has unique commits.
 *
 * @param branchName - Name of the branch to fast-forward.
 * @param worktreePath - Worktree directory for the branch.
 * @param parentBranch - Parent branch to fast-forward to.
 * @param workspacePath - Workspace root for git operations.
 * @param logger - Logger for diagnostic output.
 */
async function tryFastForward(
  branchName: string,
  worktreePath: string,
  parentBranch: string,
  workspacePath: string,
  logger: ActionContext['logger']
): Promise<void> {
  let uniqueCommits: string;
  try {
    const { stdout } = await execFileAsync('git', ['log', branchName, '--not', parentBranch, '--oneline'], {
      cwd: workspacePath
    });
    uniqueCommits = stdout.trim();
  } catch (logError) {
    // Parent branch may not exist or git log failed — skip fast-forward
    logger.debug('Skipping fast-forward check', { branch: branchName, error: errorMessage(logError) });
    return;
  }

  if (uniqueCommits) return;

  try {
    await execFileAsync('git', ['-C', worktreePath, 'merge', '--ff-only', parentBranch], {
      cwd: worktreePath
    });
    logger.info('Fast-forwarded branch to parent HEAD', { branch: branchName, parentBranch });
  } catch (ffError) {
    logger.warn('Fast-forward failed, continuing with existing state', {
      branch: branchName,
      error: errorMessage(ffError)
    });
  }
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
 * Tries to reuse an existing branch whose worktree is still on disk. If the
 * branch has no unique commits relative to its parent, attempts a fast-forward
 * merge. When no valid branch exists, creates a new one and registers it with
 * the API.
 *
 * @param input - Action input containing cardId and workspace paths.
 * @param client - Cards API client for branch CRUD.
 * @param baseBranch - Current branch in the workspace (used as parent).
 * @param logger - Logger for diagnostic output.
 * @returns Worktree path, branch name, and parent branch name.
 */
async function resolveOrCreateWorktree(
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
    await tryFastForward(branch.name, branch.worktree, parentBranch, input.workspacePath, logger);

    logger.info('Reusing existing worktree', { branch: branch.name, worktree: branch.worktree });
    return { worktreePath: branch.worktree, branchName: branch.name, parentBranch };
  }

  // No valid existing branch — create new one
  const prefix = `cards/${input.cardId}/`;
  const existingNumbers = branches
    .filter((b) => b.name.startsWith(prefix))
    .map((b) => parseInt(b.name.slice(prefix.length), 10))
    .filter((n) => !Number.isNaN(n));
  const nextNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1;
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
 * ref is deleted, and the branch record is removed from the API.  Individual
 * failures are logged and do not abort the sweep.
 *
 * @param input - Action input containing cardId and workspace paths.
 * @param client - Cards API client for branch removal.
 * @param baseBranch - Branch to check merge status against.
 * @param logger - Logger for diagnostic output.
 */
async function cleanupMergedBranches(
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

/**
 * Launch action handler.
 *
 * Spawns the `claude` CLI as a child process, providing the card ID and
 * repository path as prompt context. The process lifecycle is tied to the
 * action: cancellation sends SIGTERM, and switching to interactive mode
 * preserves the session ID for resumption.
 */
export default defineAction(
  {
    actionName: 'Launch',
    description: 'Start a Claude session for the card',
    supportsBackgroundMode: true,
    timeout: 3600000
  },
  async (input: ActionInput, context: ActionContext) => {
    const switchData = input.switchToInteractiveData as { sessionId?: string } | undefined;
    const [sessionId, resume] = [switchData?.sessionId ?? randomUUID(), !!switchData?.sessionId];

    const prompt = `Review the card repo and stop.`;

    context.logger.info('Launch action started', {
      cardId: input.cardId,
      environment: input.environment,
      executionMode: input.executionMode,
      sessionId
    });

    const client = new CardsClient({
      baseUrl: input.apiBaseUrl,
      accessToken: input.apiAccessToken
    });

    // Resolve worktree — fail-open to workspacePath
    let cwd = input.workspacePath;
    let baseBranch: string | undefined;
    let parentBranch: string | undefined;

    try {
      baseBranch = await resolveBaseBranch(input.workspacePath);
      const worktreeResult = await resolveOrCreateWorktree(input, client, baseBranch, context.logger);
      cwd = worktreeResult.worktreePath;
      parentBranch = worktreeResult.parentBranch;
      context.logger.info('Using worktree', {
        cwd,
        branch: worktreeResult.branchName,
        baseBranch,
        parentBranch
      });
    } catch (error) {
      context.logger.warn('Worktree setup failed, falling back to workspacePath', {
        error: errorMessage(error),
        workspacePath: input.workspacePath
      });
    }

    const args = buildArgs(prompt, sessionId, resume, input.executionMode, input.cardRepoPath);
    const isInteractive = input.executionMode === 'interactive';

    const child: ChildProcess = spawn('claude', args, {
      cwd,
      stdio: isInteractive ? 'inherit' : ['ignore', 'pipe', 'pipe'],
      env: {
        ...process.env,
        CLAUDE_CODE_TASK_LIST_ID: `cards-extension-${input.cardId}`,
        CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS: '1',
        ...(baseBranch ? { BASE_BRANCH: baseBranch } : {}),
        ...(parentBranch ? { PARENT_BRANCH: parentBranch } : {})
      }
    });

    context.onCancel(() => {
      context.logger.info('Launch action cancelled, terminating claude', { sessionId });
      child.kill('SIGTERM');
    });

    context.onSwitchToInteractive(() => {
      context.logger.info('Switching to interactive mode', { sessionId });
      child.kill('SIGTERM');
      return { sessionId };
    });

    if (!isInteractive) {
      const stream = client.openStream(input.cardId, 'claude-code-session', `${sessionId}.jsonl`, {
        title: `Claude session for ${input.cardId}`,
        sessionId
      });

      child.stdout?.on('data', (chunk: Buffer) => {
        for (const line of chunk.toString().split('\n')) {
          if (line.trim()) {
            stream.write(line);
          }
        }
      });

      child.stderr?.on('data', (chunk: Buffer) => {
        const text = chunk.toString().trim();
        if (text) {
          context.logger.warn(text);
        }
      });

      const exitCode = await new Promise<number | null>((resolve) => {
        child.on('close', resolve);
      });

      const result = await stream.close();
      context.logger.info('Launch action completed', { sessionId, exitCode, ...result });
    } else {
      const exitCode = await new Promise<number | null>((resolve) => {
        child.on('close', resolve);
      });

      context.logger.info('Launch action completed', { sessionId, exitCode });
    }

    // Post-exit cleanup: remove fully-merged branches
    if (baseBranch) {
      try {
        await cleanupMergedBranches(input, client, baseBranch, context.logger);
      } catch (error) {
        context.logger.warn('Branch cleanup failed', {
          error: errorMessage(error)
        });
      }
    }
  }
);
