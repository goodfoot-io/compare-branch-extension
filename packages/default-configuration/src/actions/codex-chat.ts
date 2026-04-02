/**
 * Codex chat action for Cards workflows.
 *
 * Spawns the `codex` CLI for the current card without a seed prompt so the
 * user can begin a direct interactive chat in the staged Codex environment.
 *
 * @summary Codex chat action for Cards workflows
 * @module
 */

import { type ActionContext, type ActionInput, defineAction } from '@cards/sdk/config';
import { spawnCodexSession } from '../lib/codex-session.js';

/**
 * Codex chat action handler.
 *
 * Starts an interactive Codex session rooted at the card worktree with the
 * packaged runtime plugin enabled and no initial prompt.
 */
export default defineAction(
  {
    actionName: 'Codex Chat',
    description: 'Start a Codex chat session for the card',
    supportsBackgroundMode: false,
    timeout: 3600000
  },
  async (input: ActionInput, context: ActionContext) => {
    await spawnCodexSession(input, context, {});
  }
);
