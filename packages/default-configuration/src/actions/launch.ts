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

import { randomUUID } from 'node:crypto';
import { type ActionContext, type ActionInput, defineAction } from '@cards/sdk/config';
import { spawnClaudeSession } from '../lib/claude-session.js';

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

    await spawnClaudeSession(input, context, {
      prompt: 'Load the `runtime:card-repo` and `runtime:card-routing` skills then follow the `<instructions>`.',
      sessionId,
      resume,
      supportsSwitchToInteractive: true
    });
  }
);
