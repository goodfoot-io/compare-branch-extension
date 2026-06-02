/**
 * Default cards assistant handler for the Cards extension.
 *
 * Spawns the `claude` CLI in the workspace root with the `cards@cards.management`
 * plugin enabled, giving Claude access to the `cards:management` skill. Unlike action
 * handlers, this handler has no card context, no worktree, and no socket.
 *
 * The handler replicates the behavior of the legacy `cards.startCardsAgent`
 * command but is now configurable and overridable via settings layers.
 *
 * @summary Default cards assistant handler
 * @module
 */

import { spawn } from 'node:child_process';
import { defineCardsAssistant } from '@cards/sdk/config';
import { updateMarketplaceRegistration } from './lib/claude-session.js';

export default defineCardsAssistant({}, async (input, { logger }) => {
  await updateMarketplaceRegistration(input.marketplacePath, logger);

  const settingsJson = JSON.stringify({
    enabledPlugins: { 'cards@cards.management': true },
    extraKnownMarketplaces: {
      'cards.management': {
        source: { source: 'directory', path: input.marketplacePath }
      }
    }
  });

  const shellArgs = [
    '--append-system-prompt',
    `<instructions>
    Load the \`cards:management\` skill. The user has requested that you interview them about every aspect of their task until you've reach a shared understanding. Walk down each branch of the design tree, resolving dependencies between decisions one-by-one. For each question, provide your recommended answer.
    
    Guidelines:
    - Ask the questions one at a time.
    - If a question can be answered by exploring the codebase, explore the codebase instead.
    - Use the AskUserQuestion tool for asking questions to the user.
    - If the user specifies a card, use the \`card\` CLI to explore that card
    - If the user discusses a potential task or project, load the appropriate 'interview' reference from the \`cards:management\` skill
 
    Do not implement a card unless instructed to do so by the user.

    </instructions>`,
    '--settings',
    settingsJson
  ];

  logger.info('Starting cards assistant', {
    cwd: input.repoRoot,
    marketplacePath: input.marketplacePath
  });

  const child = spawn('claude', shellArgs, {
    cwd: input.repoRoot,
    stdio: 'inherit'
  });

  const exitCode = await new Promise<number | null>((resolve) => {
    child.on('close', resolve);
  });

  logger.info('Cards assistant exited', { exitCode });
});
