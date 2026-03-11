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
import { resolveMarketplacePath } from '../lib/claude-session.js';
import { resolveCodexSkillPath, spawnCodexSession } from '../lib/codex-session.js';

/**
 * Codex action handler.
 *
 * Starts an interactive Codex session rooted at the card worktree and tells
 * Codex to load the packaged `cards-runtime` skill from the marketplace bundle.
 */
export default defineAction(
  {
    actionName: 'Codex',
    description: 'Start a Codex session for the card',
    supportsBackgroundMode: false,
    timeout: 3600000
  },
  async (input: ActionInput, context: ActionContext) => {
    const codexSkillPath = resolveCodexSkillPath(resolveMarketplacePath());
    await spawnCodexSession(input, context, {
      prompt: `Load the skill file at ${JSON.stringify(codexSkillPath)} before doing any work. Read that SKILL.md, follow its instructions, and then continue work on the card.`
    });
  }
);
