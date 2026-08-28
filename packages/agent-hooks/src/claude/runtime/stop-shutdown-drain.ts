/**
 * Stop hook — Claude shutdown drain readiness acknowledgement.
 *
 * Correlates a pending `cards shutdown` request against a strict, fail-closed
 * idle check (tracked subagents plus the launcher-owned process tree) and only
 * then signals readiness back to the action dispatcher over the request's
 * per-action socket. Matcher-less so it composes alongside `stop.ts`'s
 * unattributed-commit check in the same Stop event group; each hook is
 * independent and neither blocks nor depends on the other.
 *
 * @summary Stop hook — Claude shutdown drain readiness acknowledgement
 * @see https://code.claude.com/docs/en/hooks#stop
 */

import {
  clearPendingShutdownRequest,
  extractActionInput,
  readPendingShutdownRequest,
  sendShutdownReady
} from '@cards.management/sdk/config';
import { stopHook } from '@goodfoot/agent-hooks/claude-code';
import { isSessionIdle } from '../../shared/session-idle.js';

export default stopHook({}, async (input, { logger }) => {
  try {
    extractActionInput();
  } catch (error) {
    logger.warn('stop-shutdown-drain: not inside an action subprocess', {
      error: error instanceof Error ? error.message : String(error)
    });
    return null;
  }

  let pendingRequest: ReturnType<typeof readPendingShutdownRequest>;
  try {
    pendingRequest = readPendingShutdownRequest(input.session_id);
  } catch (error) {
    logger.warn('stop-shutdown-drain: failed to read pending shutdown request', {
      error: error instanceof Error ? error.message : String(error)
    });
    return null;
  }

  if (!pendingRequest) {
    return null;
  }

  let idle: boolean;
  try {
    idle = await isSessionIdle(input.session_id, { strict: true });
  } catch (error) {
    logger.warn('stop-shutdown-drain: strict idle authority failed', {
      error: error instanceof Error ? error.message : String(error)
    });
    return null;
  }

  if (!idle) {
    return null;
  }

  try {
    await sendShutdownReady(pendingRequest.socketPath, {
      type: 'shutdownReady',
      requestId: pendingRequest.requestId
    });
    clearPendingShutdownRequest(input.session_id, pendingRequest.requestId);
  } catch (error) {
    logger.warn('stop-shutdown-drain: failed to acknowledge shutdown readiness', {
      error: error instanceof Error ? error.message : String(error)
    });
  }

  return null;
});
