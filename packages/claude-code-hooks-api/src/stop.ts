/**
 * Stop hook that cleans up PID registry entries.
 *
 * Always approves: never blocks Claude from stopping.
 *
 * @module stop
 */

import { stopHook, stopOutput } from '@goodfoot/claude-code-hooks';
import { removePidEntry } from './lib/claude-sessions.js';
import { findClaudePid } from './lib/process-tree.js';

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
