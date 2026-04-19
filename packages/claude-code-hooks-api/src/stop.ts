/**
 * Stop hook that cleans up PID registry entries.
 *
 * Always approves: cleanup is best-effort and never blocks the agent from
 * stopping, even when session registry IO fails.
 *
 *
 * @summary Stop hook that cleans up PID registry entries
 * @module stop
 */

import { findAgentPid, removePidEntry } from '@cards/sessions';
import { stopHook, stopOutput } from '@goodfoot/claude-code-hooks';

export default stopHook({}, async (_input, { logger }) => {
  // If CARD_ID is set, the execution wrapper manages lifecycle
  if (process.env['CARD_ID']) {
    return null;
  }

  try {
    const agentPid = findAgentPid();
    if (agentPid) {
      await removePidEntry(agentPid);
    }
  } catch (error) {
    // Fail-open: never block Claude from stopping
    logger.debug('Stop hook cleanup error', { error: String(error) });
  }

  return null;
});
