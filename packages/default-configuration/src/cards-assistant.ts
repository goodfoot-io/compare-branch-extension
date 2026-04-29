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
import commitMessageStyle from '../../../claude/runtime/claude/COMMIT_MESSAGE_STYLE.md';
import { resolveClaudeDirPath, updateMarketplaceRegistration } from './lib/claude-session.js';

export default defineCardsAssistant({}, async (input, { logger }) => {
  const claudeDirPath = resolveClaudeDirPath(input.marketplacePath);

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
    '<instructions>Load the `cards:management` skill and assist the user. Do not implement a card unless instructed to do so by the user.</instructions>',
    '--append-system-prompt',
    commitMessageStyle.trim(),
    '--add-dir',
    claudeDirPath,
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
