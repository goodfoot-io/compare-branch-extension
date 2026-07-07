/**
 * Per-session artifact cleanup for the transcript-sync engine.
 *
 * Ports `cleanupSessionArtifacts` from `bin/transcript-watcher.ts` verbatim:
 * removes the HEAD SHA file, session CSV, route-nudge marker, and
 * exit-when-done nudge marker written during a session's lifecycle.
 *
 * Called at the end of a watcher run on a genuine session-end exit (graceful
 * stop, flush sentinel, or process death), so that both Claude (which also
 * removes these in session-end.ts) and Codex (which has no SessionEnd hook)
 * clean up. It is intentionally skipped on the max-lifetime exit — the caller
 * gates this on the `maxLifetimeExceeded` flag returned by `./lifecycle.ts`'s
 * `runWatcherLoop`, where the watched session may still be alive. Each
 * removal is independent and best-effort: a failure in one does not prevent
 * the others, and errors are surfaced as warnings rather than thrown.
 *
 * @summary Best-effort removal of per-session artifact files
 * @module
 */

import {
  removeSessionCsv,
  removeSessionExitWhenDoneNudge,
  removeSessionHeadSha,
  removeSessionRouteNudge
} from '@cards.management/sessions/card-repo';

/**
 * Removes per-session artifact files written during the session lifecycle.
 *
 * @param sessionId - Session whose artifacts should be removed.
 * @param warnFn - Warning logger used to surface individual removal failures.
 */
export async function cleanupSessionArtifacts(sessionId: string, warnFn: (msg: string) => void): Promise<void> {
  try {
    removeSessionHeadSha(sessionId);
  } catch (error) {
    warnFn(`cleanupSessionArtifacts: removeSessionHeadSha failed: ${String(error)}`);
  }

  try {
    removeSessionCsv(sessionId);
  } catch (error) {
    warnFn(`cleanupSessionArtifacts: removeSessionCsv failed: ${String(error)}`);
  }

  try {
    removeSessionRouteNudge(sessionId);
  } catch (error) {
    warnFn(`cleanupSessionArtifacts: removeSessionRouteNudge failed: ${String(error)}`);
  }

  try {
    removeSessionExitWhenDoneNudge(sessionId);
  } catch (error) {
    warnFn(`cleanupSessionArtifacts: removeSessionExitWhenDoneNudge failed: ${String(error)}`);
  }
}
