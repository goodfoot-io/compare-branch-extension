/**
 * Interview action for Claude Code workflows.
 *
 * Spawns the `claude` CLI with the `runtime:interview-routing` skill for the
 * current card. The process always runs interactively — stdio is inherited so
 * the user gets direct terminal control. Background mode is not supported
 * because interviews require active user participation.
 *
 * The action awaits process exit before resolving, so the terminal closes
 * only after Claude finishes and cleanup is complete.
 *
 * @summary Interview action for Claude Code workflows
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
  resolveBaseBranch,
  resolveOrCreateWorktree
} from '../lib/claude-session.js';

/**
 * Interview action handler.
 *
 * Spawns the `claude` CLI as a child process using the interview-routing skill.
 * The process lifecycle is tied to the action: cancellation sends SIGTERM.
 * Session resume is not supported — each interview always starts fresh.
 */
export default defineAction(
  {
    actionName: 'Interview',
    description: 'Start an interview session for the card',
    supportsBackgroundMode: false,
    timeout: 3600000
  },
  async (input: ActionInput, context: ActionContext) => {
    const sessionId = randomUUID();

    const prompt =
      'Load the `runtime:card-repo` and `runtime:interview-routing` skills then follow the `<instructions>`.';

    context.logger.info('Interview action started', {
      cardId: input.cardId,
      environment: input.environment,
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

    const args = buildArgs(prompt, sessionId, false, input.executionMode, input.cardRepoPath, cwd);

    const child: ChildProcess = spawn('claude', args, {
      cwd,
      stdio: 'inherit',
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
      context.logger.info('Interview action cancelled, terminating claude', { sessionId });
      child.kill('SIGTERM');
    });

    const exitCode = await new Promise<number | null>((resolve) => {
      child.on('close', resolve);
    });

    context.logger.info('Interview action completed', { sessionId, exitCode });

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
