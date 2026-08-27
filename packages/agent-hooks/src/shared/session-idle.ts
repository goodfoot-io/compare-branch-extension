/**
 * Shared session-idle check for Stop hooks.
 *
 * Replaces WAITING_STEM_RE text-sniffing with a structural check against
 * actual subagent and background-process state. Exported so any hook that
 * needs an idle determination can call a single authority.
 *
 * @summary Shared session-idle check for Stop hooks
 * @module session-idle
 */

import { findAgentPid, isAgentProcessTreeDrained } from '@cards.management/sdk/process-tree';
import { getActiveSubagentCount } from '@cards.management/sessions/card-repo';

/**
 * Returns `true` when the session has no active subagents or background
 * processes — i.e., the agent is genuinely idle and safe to nudge toward
 * shutdown, merge, or routing.
 *
 * Fail-open: if the underlying state read throws, the error is caught
 * and `true` is returned (treat as idle rather than blocking indefinitely).
 *
 * @param sessionId - Session to check for active work.
 * @param options - Optional strict authority mode for shutdown readiness.
 * @param options.strict - Require both tracking and owned process-tree proof.
 * @returns `true` when the session is idle.
 */
export function isSessionIdle(sessionId: string, options: { strict: true }): Promise<boolean>;
export function isSessionIdle(sessionId: string): boolean;
export function isSessionIdle(sessionId: string, options?: { strict: true }): boolean | Promise<boolean> {
  if (options?.strict) {
    return (async () => {
      try {
        if (getActiveSubagentCount(sessionId) !== 0) return false;
        const agentPid = await findAgentPid(process.ppid);
        if (agentPid === null) return false;
        return (await isAgentProcessTreeDrained(agentPid)) === true;
      } catch (error) {
        console.warn('isSessionIdle: strict state query failed, treating as busy:', error);
        return false;
      }
    })();
  }
  try {
    return getActiveSubagentCount(sessionId) === 0;
  } catch (error) {
    console.warn('isSessionIdle: error reading subagent state, treating as idle:', error);
    return true;
  }
}
