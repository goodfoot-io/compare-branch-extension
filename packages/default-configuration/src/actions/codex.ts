/**
 * Codex action for Cards workflows.
 *
 * Spawns the `codex` CLI for the current card. The session always runs
 * interactively so Codex can continue work directly in the terminal while
 * receiving explicit instructions for loading the packaged runtime skill.
 *
 * @summary Codex action for Cards workflows
 * @module
 */

import { type ActionContext, type ActionInput, defineAction } from '@cards/sdk/config';
import { spawnCodexSession } from '../lib/codex-session.js';

/**
 * Codex action handler.
 *
 * Starts an interactive Codex session rooted at the card worktree with the
 * packaged `codex-runtime` plugin enabled for `cards-runtime` skill discovery.
 */
export default defineAction(
  {
    actionName: 'Codex',
    description: 'Start a Codex session for the card',
    supportsBackgroundMode: false,
    timeout: 3600000
  },
  async (input: ActionInput, context: ActionContext) => {
    await spawnCodexSession(input, context, {
      prompt: 'Use the `cards-runtime` skill for card repository conventions, then continue work on the card.'
    });
  }
);
