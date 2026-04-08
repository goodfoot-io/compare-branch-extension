/**
 * Codex action for Cards workflows.
 *
 * Spawns the `codex` CLI for the current card. The session always runs
 * interactively so Codex can continue work directly in the terminal while
 * receiving explicit instructions for loading the packaged runtime routing skill.
 *
 * @summary Codex action for Cards workflows
 * @module
 */

import { type ActionContext, type ActionInput, defineAction } from '@cards/sdk/config';
import cardRoutingSkill from '../../../../codex/runtime/skills/card-routing/SKILL.md';
import commitMessageStyle from '../../../../plugins/runtime/claude/COMMIT_MESSAGE_STYLE.md';
import { spawnCodexSession } from '../lib/codex-session.js';

function stripFrontmatter(md: string): string {
  return md.replace(/^---\n[\s\S]*?\n---\n*/, '');
}

const COMMIT_MESSAGE_STYLE = commitMessageStyle.trim();
const CARD_ROUTING_SKILL = stripFrontmatter(cardRoutingSkill).trim();

/**
 * Codex action handler.
 *
 * Starts an interactive Codex session rooted at the card worktree with the
 * packaged cards/runtime plugins enabled for routing-driven card workflows.
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
      prompt: ['Follow the routing `<instructions>`.', COMMIT_MESSAGE_STYLE, CARD_ROUTING_SKILL].join('\n\n')
    });
  }
);
