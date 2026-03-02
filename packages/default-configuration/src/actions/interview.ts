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

import { randomUUID } from 'node:crypto';
import { type ActionContext, type ActionInput, defineAction } from '@cards/sdk/config';
import { spawnClaudeSession } from '../lib/claude-session.js';

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
    await spawnClaudeSession(input, context, {
      prompt: 'Load the `runtime:card-repo` and `runtime:interview-routing` skills then follow the `<instructions>`.',
      sessionId: randomUUID(),
      resume: false,
      supportsSwitchToInteractive: false
    });
  }
);
