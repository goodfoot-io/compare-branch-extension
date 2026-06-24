/**
 * SessionStart hook that persists session identity environment variables.
 *
 * Makes `CARDS_SESSION_ID` and `CARDS_TRANSCRIPT_PATH` available to all
 * subsequent Bash tool invocations via {@link persistSessionEnv}. CLI tools
 * reach sessions purely through the `dist/bin`-on-PATH delivery mechanism; no
 * env var indirects any wrapper path.
 *
 * @summary SessionStart hook that persists session env vars
 */

import { sessionStartHook } from '@goodfoot/claude-code-hooks';
import { persistSessionEnv } from '../../shared/session-env.js';

export default sessionStartHook({}, (input, { logger, persistEnvVar }) => {
  // Persist session identity vars so CARDS_SESSION_ID and CARDS_TRANSCRIPT_PATH
  // are available in every plain-interactive session, not just action subprocesses.
  persistSessionEnv(input.session_id, input.transcript_path, persistEnvVar);
  logger.info('Persisted session env vars to environment', {
    sessionId: input.session_id,
    transcriptPath: input.transcript_path
  });

  return null;
});
