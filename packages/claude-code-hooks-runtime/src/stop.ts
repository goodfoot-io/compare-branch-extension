/**
 * Stop hook implementation.
 *
 * Runs as a subprocess of an action. Uses {@link extractActionInput} to
 * confirm we are inside an action subprocess and to expose the action
 * process environment variables.
 *
 * @see https://code.claude.com/docs/en/hooks#stop
 */

import type { ActionInput } from '@cards/sdk/config';
import { extractActionInput } from '@cards/sdk/config';
import { stopHook, stopOutput } from '@goodfoot/claude-code-hooks';

export default stopHook({}, (_input, { logger }) => {
  let actionInput: ActionInput;
  try {
    actionInput = extractActionInput();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error('Not running inside an action subprocess', { error: message });
    return stopOutput({
      decision: 'approve',
      systemMessage: 'Stop hook: not running inside an action subprocess.'
    });
  }

  logger.info('Action subprocess confirmed — stop requested', {
    cardId: actionInput.cardId,
    actionName: actionInput.actionName,
    environment: actionInput.environment,
    executionMode: actionInput.executionMode
  });

  return stopOutput({
    decision: 'approve',
    systemMessage: [
      `Stop approved for action: ${actionInput.actionName}`,
      `Card: ${actionInput.cardId}`,
      `Mode: ${actionInput.executionMode}`
    ].join(' | ')
  });
});
