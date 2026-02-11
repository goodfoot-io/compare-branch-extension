/**
 * SessionStart hook implementation.
 *
 * Runs as a subprocess of an action. Uses {@link extractActionInput} to
 * confirm we are inside an action subprocess and to expose the action
 * process environment variables to the session context.
 *
 * @see https://code.claude.com/docs/en/hooks#sessionstart
 */

import type { ActionInput } from '@cards/sdk/config';
import { extractActionInput } from '@cards/sdk/config';
import { sessionStartHook, sessionStartOutput } from '@goodfoot/claude-code-hooks';

export default sessionStartHook({}, (_input, { logger }) => {
  let actionInput: ActionInput;
  try {
    actionInput = extractActionInput();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error('Not running inside an action subprocess', { error: message });
    return sessionStartOutput({
      systemMessage: 'SessionStart hook: not running inside an action subprocess.'
    });
  }

  logger.info('Action subprocess confirmed', {
    cardId: actionInput.cardId,
    actionName: actionInput.actionName,
    environment: actionInput.environment,
    executionMode: actionInput.executionMode
  });

  return sessionStartOutput({
    systemMessage: [
      `Action: ${actionInput.actionName}`,
      `Card: ${actionInput.cardId}`,
      `Environment: ${actionInput.environment}`,
      `Mode: ${actionInput.executionMode}`
    ].join(' | '),
    hookSpecificOutput: {
      additionalContext: JSON.stringify(actionInput)
    }
  });
});
