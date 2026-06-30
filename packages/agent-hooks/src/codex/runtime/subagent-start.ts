/**
 * SubagentStart hook implementation.
 *
 * Gives subagents card awareness via context injection only.
 * Uses the shared {@link buildAdditionalContext} for context.
 *
 * @summary SubagentStart hook — card context injection only
 */

import { extractActionInput } from '@cards/sdk/config';
import { addActiveSubagent } from '@cards/sessions/card-repo';
import { subagentStartHook, subagentStartOutput } from '@goodfoot/codex-hooks';
import { buildAdditionalContext, CardRepoAccessError } from '../../shared/context.js';

export default subagentStartHook({}, async (_input, { logger }) => {
  let actionInput: ReturnType<typeof extractActionInput>;
  try {
    actionInput = extractActionInput();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error('Not running inside an action subprocess', { error: message });
    return subagentStartOutput({
      systemMessage: 'SubagentStart hook: not running inside an action subprocess.'
    });
  }

  let systemMessage: string;
  try {
    systemMessage = buildAdditionalContext(actionInput);
  } catch (error) {
    if (error instanceof CardRepoAccessError) {
      logger.error('Card repo inaccessible', { repoPath: error.repoPath, error: error.message });
      return subagentStartOutput({
        continue: false,
        ...error.toHookFailure('subagent')
      });
    }
    throw error;
  }

  try {
    await addActiveSubagent(_input.session_id, _input.agent_id);
  } catch (error) {
    logger.warn('Failed to record active subagent', {
      sessionId: _input.session_id,
      agentId: _input.agent_id,
      error: error instanceof Error ? error.message : String(error)
    });
  }

  return subagentStartOutput({
    systemMessage,
    additionalContext: systemMessage
  });
});
