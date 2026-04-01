/**
 * SessionStart hook that persists CLI wrapper environment variables.
 *
 * Resolves the absolute paths to the CLI wrapper scripts in the plugin
 * `bin/` directory and makes them available to all subsequent Bash tool
 * invocations via {@link persistEnvVar}. Each wrapper self-resolves the
 * Node.js binary from `~/.cards/VSCODE_NODE`.
 *
 * @summary SessionStart hook that persists CLI env vars
 */

import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { sessionStartHook, sessionStartOutput } from '@goodfoot/claude-code-hooks';

/**
 * CLI wrapper definitions: env var name and filename in `bin/`.
 */
const CLI_WRAPPERS = [
  { envVar: 'CARD_CLI', filename: 'card-cli' },
  { envVar: 'NOTIFICATION_CLI', filename: 'notification-cli' },
  { envVar: 'COMPARE_CLI', filename: 'compare-cli' },
  { envVar: 'CARDS_DEV_CLI', filename: 'cards-dev-cli' }
] as const;

/**
 * Resolves the absolute path to a CLI wrapper script in the plugin `bin/` directory.
 *
 * The compiled hook lives at `plugins/cards/hooks/bin/<hash>.mjs` and
 * wrappers are at `plugins/cards/bin/<name>`, two directories up
 * from the compiled hook location.
 *
 * @param filename - Wrapper script filename (e.g. `card-cli`).
 * @returns Absolute path to the wrapper.
 */
export function resolveCliWrapper(filename: string): string {
  return resolve(dirname(fileURLToPath(import.meta.url)), '../../bin', filename);
}

export default sessionStartHook({}, (_input, { logger, persistEnvVar }) => {
  const missing: string[] = [];

  for (const { envVar, filename } of CLI_WRAPPERS) {
    const wrapperPath = resolveCliWrapper(filename);

    if (!existsSync(wrapperPath)) {
      logger.warn(`${filename} wrapper not found`, { path: wrapperPath });
      missing.push(filename);
      continue;
    }

    persistEnvVar(envVar, wrapperPath);
    logger.info(`Persisted ${envVar}`, { path: wrapperPath });
  }

  if (missing.length > 0) {
    return sessionStartOutput({
      systemMessage: `SessionStart: CLI wrapper(s) not found: ${missing.join(', ')}. Some CLI commands may not work.`
    });
  }

  return sessionStartOutput({});
});
