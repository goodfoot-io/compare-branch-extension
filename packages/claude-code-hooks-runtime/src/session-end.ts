/**
 * SessionEnd hook implementation.
 *
 * Runs on graceful session exit. Writes a sentinel file to signal the
 * transcript watcher to flush remaining lines and close the stream
 * gracefully. The sentinel file also provides defense against PID reuse —
 * it distinguishes a graceful exit from a new process reusing the same PID.
 *
 * After the sentinel write, cleans up session artifacts (PID registration,
 * HEAD SHA, and session CSV) that were created during session-start.
 * Cleanup is performed here — not in the Stop hook — because Stop fires
 * after every Claude response turn, while SessionEnd fires once when the
 * session truly ends.
 *
 * Fails open on all errors — the transcript watcher provides crash resilience
 * so a failed sentinel write does not lose the transcript, and leftover
 * session artifacts are harmless.
 *
 * @summary SessionEnd hook — writes sentinel file and cleans up session artifacts
 * @see https://code.claude.com/docs/en/hooks#sessionend
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { findClaudePid, removeSessionPid } from '@cards/claude-code-sessions';
import { removeSessionCsv, removeSessionHeadSha } from '@cards/claude-code-sessions/card-repo';
import { extractActionInput } from '@cards/sdk/config';
import { sessionEndHook, sessionEndOutput } from '@goodfoot/claude-code-hooks';

/**
 * Writes a sentinel file to signal the transcript watcher that the session
 * has ended gracefully.
 *
 * Creates parent directories if they do not exist. The file content is empty;
 * existence of the file is the signal.
 *
 * @param cardRepoPath - Absolute path to the card repository root
 * @param sessionId - Claude session ID used as the sentinel filename stem
 */
export async function writeSentinelFile(cardRepoPath: string, sessionId: string): Promise<void> {
  const dir = join(cardRepoPath, 'streams', 'claude-code-session');
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, `${sessionId}.flush`), '');
}

/**
 * Removes session artifacts (PID registration, HEAD SHA file, session CSV)
 * that were created during session-start.
 *
 * Each cleanup step is independent — a failure in one does not prevent the
 * others from running. Errors are collected and re-thrown as an aggregate
 * after all steps have been attempted.
 *
 * @param sessionId - Session ID whose artifacts should be cleaned up.
 * @param logger - Logger for diagnostic output.
 * @param logger.info - Log informational messages.
 * @param logger.warn - Log warning messages.
 * @throws {AggregateError} When one or more cleanup steps fail.
 */
export async function cleanupSessionArtifacts(
  sessionId: string,
  logger: {
    info: (msg: string, ctx?: Record<string, unknown>) => void;
    warn: (msg: string, ctx?: Record<string, unknown>) => void;
  }
): Promise<void> {
  const errors: Error[] = [];

  try {
    const resolvedPid = findClaudePid();
    if (resolvedPid) {
      await removeSessionPid(resolvedPid);
      logger.info('Cleaned up PID registration', { pid: resolvedPid });
    }
  } catch (error) {
    const e = error instanceof Error ? error : new Error(String(error));
    logger.warn('Failed to clean up PID registration', { error: e.message });
    errors.push(e);
  }

  try {
    removeSessionHeadSha(sessionId);
  } catch (error) {
    const e = error instanceof Error ? error : new Error(String(error));
    logger.warn('Failed to remove HEAD SHA', { sessionId, error: e.message });
    errors.push(e);
  }

  try {
    removeSessionCsv(sessionId);
  } catch (error) {
    const e = error instanceof Error ? error : new Error(String(error));
    logger.warn('Failed to remove session CSV', { sessionId, error: e.message });
    errors.push(e);
  }

  if (errors.length === 0) {
    logger.info('Cleaned up session artifacts', { sessionId });
  } else {
    throw new AggregateError(errors, `Session cleanup had ${errors.length} failure(s)`);
  }
}

export default sessionEndHook({}, async (input, { logger }) => {
  // 1. Extract action input — fail open if not in action subprocess
  let actionInput: ReturnType<typeof extractActionInput>;
  try {
    actionInput = extractActionInput();
  } catch {
    return sessionEndOutput({});
  }

  // 2. Write sentinel file to signal the watcher (wrapped in try/catch — non-fatal)
  try {
    await writeSentinelFile(actionInput.cardRepoPath, input.session_id);
    logger.info('Sentinel file written', { sessionId: input.session_id, cardRepoPath: actionInput.cardRepoPath });
  } catch (error) {
    logger.warn('Failed to write sentinel file', {
      sessionId: input.session_id,
      error: error instanceof Error ? error.message : String(error)
    });
  }

  // 3. Clean up session artifacts (PID, HEAD SHA, CSV) — non-fatal
  try {
    await cleanupSessionArtifacts(input.session_id, logger);
  } catch (error) {
    logger.warn('Failed to clean up session artifacts', {
      sessionId: input.session_id,
      error: error instanceof Error ? error.message : String(error)
    });
  }

  return sessionEndOutput({});
});
