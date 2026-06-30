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

/**
 * Returns `true` when the session has no active subagents or background
 * processes — i.e., the agent is genuinely idle and safe to nudge toward
 * shutdown, merge, or routing.
 *
 * Fail-open: if the underlying state read throws, the error is caught
 * and `true` is returned (treat as idle rather than blocking indefinitely).
 *
 * @param _sessionId - Session to check for active work.
 * @returns `true` when the session is idle.
 * @throws {Error} Not Implemented — stub.
 */
export function isSessionIdle(_sessionId: string): boolean {
  throw new Error('Not Implemented');
}
