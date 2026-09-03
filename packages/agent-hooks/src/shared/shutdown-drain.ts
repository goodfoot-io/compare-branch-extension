/**
 * Shared shutdown drain-acknowledgement logic for Claude runtime hooks.
 *
 * Correlates a pending `cards shutdown` request against a strict, fail-closed
 * idle check (tracked subagents plus the launcher-owned process tree) and only
 * then signals readiness back to the action dispatcher over the request's
 * per-action socket. Extracted so both the `Stop` hook
 * (`stop-shutdown-drain.ts`, fires after a turn completes) and the
 * `Notification(idle_prompt)` hook (`notification-shutdown-drain.ts`, fires
 * even before a session's first turn) can attempt the same drain without
 * duplicating the fail-open/fail-closed semantics.
 *
 * @summary Shared shutdown drain-acknowledgement logic for Claude runtime hooks
 * @module shutdown-drain
 */

import {
  clearPendingShutdownRequest,
  readPendingShutdownRequest,
  sendShutdownReady
} from '@cards.management/sdk/config';
import type { Logger } from '@goodfoot/agent-hooks/claude-code';
import { isSessionIdle } from './session-idle.js';

/**
 * Attempts to acknowledge a pending shutdown request for the given session.
 *
 * Fail-open on infra issues unrelated to idleness (missing/unreadable
 * pending-request marker, readiness socket write failure); fail-closed on the
 * idle determination itself (never assumes idle on error).
 *
 * @param sessionId - The session to check and, if idle, drain.
 * @param logger - Hook logger for warn/error diagnostics on fail-open paths.
 * @param sourceLabel - Log-message prefix identifying the calling hook.
 */
export async function attemptShutdownDrain(sessionId: string, logger: Logger, sourceLabel: string): Promise<void> {
  let pendingRequest: ReturnType<typeof readPendingShutdownRequest>;
  try {
    pendingRequest = readPendingShutdownRequest(sessionId);
  } catch (error) {
    logger.warn(`${sourceLabel}: failed to read pending shutdown request`, {
      error: error instanceof Error ? error.message : String(error)
    });
    return;
  }

  if (!pendingRequest) {
    return;
  }

  let idle: boolean;
  try {
    idle = await isSessionIdle(sessionId, { strict: true });
  } catch (error) {
    logger.warn(`${sourceLabel}: strict idle authority failed`, {
      error: error instanceof Error ? error.message : String(error)
    });
    return;
  }

  if (!idle) {
    return;
  }

  try {
    await sendShutdownReady(pendingRequest.socketPath, {
      type: 'shutdownReady',
      requestId: pendingRequest.requestId
    });
    clearPendingShutdownRequest(sessionId, pendingRequest.requestId);
  } catch (error) {
    logger.warn(`${sourceLabel}: failed to acknowledge shutdown readiness`, {
      error: error instanceof Error ? error.message : String(error)
    });
  }
}
