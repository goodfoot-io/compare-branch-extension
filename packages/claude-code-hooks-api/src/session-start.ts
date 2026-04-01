/**
 * SessionStart hook that persists the CARD_CLI environment variable.
 *
 * Resolves the absolute path to the `card-cli` wrapper script (a sibling of
 * `card.mjs` in the plugin `bin/` directory) and makes it available to all
 * subsequent Bash tool invocations via {@link persistEnvVar}.
 *
 * @summary SessionStart hook that persists CARD_CLI env var
 */

import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { sessionStartHook, sessionStartOutput } from '@goodfoot/claude-code-hooks';

/**
 * Resolves the absolute path to the `card-cli` wrapper script.
 *
 * The compiled hook lives at `plugins/cards/hooks/bin/<hash>.mjs` and
 * `card-cli` is at `plugins/cards/bin/card-cli`, two directories up
 * from the compiled hook location.
 *
 * @returns Absolute path to the card-cli wrapper.
 */
export function resolveCardCli(): string {
  return resolve(dirname(fileURLToPath(import.meta.url)), '../../bin/card-cli');
}

export default sessionStartHook({}, (_input, { logger, persistEnvVar }) => {
  const cardCli = resolveCardCli();

  if (!existsSync(cardCli)) {
    logger.warn('card-cli wrapper not found', { path: cardCli });
    return sessionStartOutput({
      systemMessage: `SessionStart: card-cli wrapper not found at ${cardCli}. Card CLI commands may not work.`
    });
  }

  persistEnvVar('CARD_CLI', cardCli);
  logger.info('Persisted CARD_CLI', { path: cardCli });

  return sessionStartOutput({});
});
