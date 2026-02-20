/**
 * SessionEnd hook implementation.
 *
 * Runs on graceful session exit. Writes a sentinel file to signal the
 * transcript watcher to flush remaining lines and close the stream
 * gracefully. The sentinel file also provides defense against PID reuse —
 * it distinguishes a graceful exit from a new process reusing the same PID.
 *
 * Fails open on all errors — the transcript watcher provides crash resilience
 * so a failed sentinel write does not lose the transcript.
 *
 * @summary SessionEnd hook — writes sentinel file to signal watcher on graceful exit
 * @see https://code.claude.com/docs/en/hooks#sessionend
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
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

  return sessionEndOutput({});
});
