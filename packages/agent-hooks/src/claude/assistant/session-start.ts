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

import { sessionStartHook, sessionStartOutput } from '@goodfoot/agent-hooks/claude-code';

export const ANNOUNCEMENT = `I can help you:
- create or update a card
- start work on an existing card
- use the extension
- send feedback or file a bug report`;

export default sessionStartHook({}, async (input) => {
  if (input.source !== 'startup') {
    return sessionStartOutput({});
  }
  return sessionStartOutput({ systemMessage: ANNOUNCEMENT });
});
