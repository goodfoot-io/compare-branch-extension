/**
 * Shared session utilities for Gemini CLI action workflows.
 *
 * Reuses the existing worktree lifecycle used by Claude-based actions.
 *
 * @summary Shared session utilities for Gemini CLI action workflows
 * @module
 */

import { spawn } from 'node:child_process';
import { createCardsClient } from '@cards/sdk/client/discovery';
import type { ActionContext, ActionInput } from '@cards/sdk/config';
import { spawnBranchCleanupWatcher } from './branch-cleanup-watcher.js';
import { errorMessage, resolveBaseBranch, resolveOrCreateWorktree } from './claude-session.js';

/**
 * Options for {@link spawnGeminiSession}.
 */
export interface GeminiSessionOptions {
  /** Prompt string passed to the Gemini CLI. */
  prompt?: string;
  /** Session identifier (used for `-r` or `--resume`). */
  sessionId: string;
  /** When true, passes `-r` to resume the session. */
  resume: boolean;
}

/**
 * Spawns a `gemini` CLI session with full worktree and lifecycle management.
 *
 * @param input - Parsed action input from the environment.
 * @param context - Action context providing logger and lifecycle hooks.
 * @param options - Session-specific parameters.
 */
export async function spawnGeminiSession(
  input: ActionInput,
  context: ActionContext,
  options: GeminiSessionOptions
): Promise<void> {
  const { prompt, sessionId, resume } = options;

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
  const {
    worktreePath: cwd,
    branchName,
    parentBranch
  } = await resolveOrCreateWorktree(input, client, baseBranch, context.logger, sessionId);

  context.logger.info('Using worktree', { cwd, branch: branchName, baseBranch, parentBranch });

  const args: string[] = [];
  if (resume) {
    args.push('-r', sessionId);
  } else {
    if (prompt) {
      if (input.executionMode === 'interactive') {
        args.push('-i', prompt);
      } else {
        args.push('-p', prompt);
      }
    }
  }

  if (input.executionMode === 'background') {
    args.push('--yolo');
  }

  const isInteractive = input.executionMode === 'interactive';

  const child = spawn('gemini', args, {
    cwd,
    stdio: isInteractive ? 'inherit' : ['ignore', 'ignore', 'pipe'],
    env: {
      ...process.env,
      WORKSPACE_PATH: cwd,
      BASE_BRANCH: baseBranch,
      PARENT_BRANCH: parentBranch,
      WORKSPACE_BRANCH: branchName
    }
  });

  context.onCancel(() => {
    context.logger.info(`${input.actionName} action cancelled, terminating gemini`, { sessionId });
    child.kill('SIGTERM');
  });

  const exitCode = await new Promise<number | null>((resolve) => {
    child.on('close', resolve);
  });

  context.logger.info(`${input.actionName} action completed`, { sessionId, exitCode });

  if (isInteractive) {
    try {
      spawnBranchCleanupWatcher({
        cardId: input.cardId,
        repoRoot: input.repoRoot,
        cardRepoPath: input.cardRepoPath,
        sessionId
      });
    } catch (error) {
      context.logger.warn('Failed to spawn branch-cleanup watcher (non-fatal)', {
        error: errorMessage(error),
        sessionId
      });
    }
  }
}
