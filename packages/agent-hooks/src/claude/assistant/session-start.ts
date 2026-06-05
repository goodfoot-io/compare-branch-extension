/**
 * SessionStart hook implementation for the Cards Assistant.
 *
 * Announces the assistant once at startup. Silent on resume, clear, and
 * compact — the announcement fires exactly once per session.
 *
 * @module
 * @summary SessionStart hook for the Cards Assistant
 * @see https://code.claude.com/docs/en/hooks#sessionstart
 */

import { sessionStartHook, sessionStartOutput } from '@goodfoot/claude-code-hooks';

export const ANNOUNCEMENT =
  'The Cards Assistant can help create or update cards, or help you provide feedback on the Cards extension.';

export default sessionStartHook({}, async (input) => {
  if (input.source !== 'startup') {
    return sessionStartOutput({});
  }
  return sessionStartOutput({ systemMessage: ANNOUNCEMENT });
});
