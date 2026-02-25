/**
 * Launch action for Claude Code workflows.
 *
 * Spawns the `claude` CLI for the current card. In interactive mode, the
 * process inherits stdio so the user gets direct terminal control. In
 * background mode, Claude runs with `--print` so it executes non-interactively
 * (takes a prompt, runs, and exits). The watcher handles all transcript
 * streaming; launch.ts does not open any stream endpoint.
 *
 * The action awaits process exit before resolving, so the terminal closes
 * only after Claude finishes and cleanup is complete.
 *
 * @summary Launch action for Claude Code workflows
 * @module
 * @see {@link defineAction} for factory behavior and metadata attachment
 */

import { type ChildProcess, spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { CardsClient } from '@cards/sdk/client';
import { type ActionContext, type ActionInput, defineAction } from '@cards/sdk/config';
import {
  buildArgs,
  cleanupMergedBranches,
  errorMessage,
  evictStaleRuntimeCache,
  resolveBaseBranch,
  resolveMarketplacePath,
  resolveOrCreateWorktree
} from '../lib/claude-session.js';

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

    const prompt = 'Load the `runtime:card-repo` and `runtime:card-routing` skills then follow the `<instructions>`.';

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

    const baseBranch = await resolveBaseBranch(input.workspacePath);

    const worktreeResult = await resolveOrCreateWorktree(input, client, baseBranch, context.logger);

    const { worktreePath: cwd, branchName, parentBranch } = worktreeResult;
    context.logger.info('Using worktree', { cwd, branch: branchName, baseBranch, parentBranch });

    const marketplacePath = resolveMarketplacePath();
    await evictStaleRuntimeCache(marketplacePath, context.logger);

    const args = buildArgs(prompt, sessionId, resume, input.executionMode, input.cardRepoPath, marketplacePath);
    const isInteractive = input.executionMode === 'interactive';

    const child: ChildProcess = spawn('claude', args, {
      cwd,
      stdio: isInteractive ? 'inherit' : ['ignore', 'ignore', 'pipe'],
      env: {
        ...process.env,
        CLAUDE_CODE_TASK_LIST_ID: `cards-extension-${input.cardId}`,
        CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS: '1',
        BASE_BRANCH: baseBranch,
        PARENT_BRANCH: parentBranch,
        WORKSPACE_BRANCH: branchName
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

    context.logger.info('Launch action completed', { sessionId, exitCode });

    // Post-exit cleanup: remove fully-merged branches
    try {
      await cleanupMergedBranches(input, client, baseBranch, context.logger);
    } catch (error) {
      context.logger.warn('Branch cleanup failed', {
        error: errorMessage(error)
      });
    }
  }
);
