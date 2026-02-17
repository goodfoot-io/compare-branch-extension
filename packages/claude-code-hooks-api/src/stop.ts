/**
 * Stop hook that cleans up PID registry entries.
 *
 * Always approves: cleanup is best-effort and never blocks Claude from
 * stopping, even when session registry IO fails.
 *
 *
 * @summary Stop hook that cleans up PID registry entries
 * @module stop
 */

import { removePidEntry } from '@cards/claude-code-sessions';
import { stopHook, stopOutput } from '@goodfoot/claude-code-hooks';
import { findClaudePid } from '@cards/claude-code-sessions';

export default stopHook({}, async (_input, { logger }) => {
  // If CARD_ID is set, the execution wrapper manages lifecycle
  if (process.env.CARD_ID) {
    return stopOutput({ decision: 'approve' });
  }

  try {
    const claudePid = findClaudePid();
    if (claudePid) {
      await removePidEntry(claudePid, logger);
    }
  } catch (error) {
    // Fail-open: never block Claude from stopping
    logger.debug('Stop hook cleanup error', { error: String(error) });
  }

  return stopOutput({ decision: 'approve' });
});
