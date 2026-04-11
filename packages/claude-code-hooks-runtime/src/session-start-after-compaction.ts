/**
 * SessionStart hook for post-compaction sessions.
 *
 * After context compaction the agent loses its conversation history. This hook
 * re-injects the routing reminder so the agent re-evaluates `<routing-instructions>`
 * and reloads the appropriate skills from conversation history and card state.
 *
 * @summary SessionStart hook — routing reminder after compaction
 * @see https://code.claude.com/docs/en/hooks#sessionstart
 */

import { sessionStartHook, sessionStartOutput } from '@goodfoot/claude-code-hooks';

const ROUTING_REMINDER ='**IMPORTANT: Immediately load skills based on the `<routing-instructions>`.**';

export default sessionStartHook({ matcher: 'compact' }, (_input, { logger }) => {
  logger.info('Post-compaction session start: injecting routing reminder');

  return sessionStartOutput({
    systemMessage: ROUTING_REMINDER,
    hookSpecificOutput: {
      additionalContext: ROUTING_REMINDER
    }
  });
});
