/**
 * Close-only session commit for the transcript-sync engine.
 *
 * On session close, removes the sentinel flush file and commits the synced
 * streams into the card repository. There is no open-side commit — streams
 * are committed once, at close, matching the old watcher's behavior in
 * `bin/transcript-watcher.ts`.
 *
 * @summary Sentinel removal + close-time git commit
 * @module
 */

import { access, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { execFileNoWindowAsync } from '../../bin/childProcess.js';
import type { SessionSyncManifest } from '../manifest.js';

/**
 * Returns the absolute path to a session's sentinel flush file.
 *
 * @param manifest - The session's manifest, which supplies `cardRepoPath`, `streamType`, and `sessionId`.
 * @returns The absolute sentinel file path.
 */
export function sentinelPath(manifest: SessionSyncManifest): string {
  return join(manifest.cardRepoPath, 'streams', manifest.streamType, `${manifest.sessionId}.flush`);
}

/**
 * Checks whether the sentinel flush file exists for this session.
 *
 * @param manifest - The session's manifest.
 * @returns True if the sentinel file exists.
 */
export async function sentinelExists(manifest: SessionSyncManifest): Promise<boolean> {
  try {
    await access(sentinelPath(manifest));
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return false;
    }
    throw error;
  }
}

/**
 * Removes the sentinel file after detection. Idempotent — handles ENOENT.
 *
 * @param manifest - The session's manifest.
 */
export async function removeSentinelFile(manifest: SessionSyncManifest): Promise<void> {
  try {
    await unlink(sentinelPath(manifest));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return;
    }
    throw error;
  }
}

/**
 * Removes the sentinel and commits the session's synced streams directory.
 *
 * Best-effort for sentinel removal (warned, not fatal); the git commit
 * failure is surfaced via `errorFn` rather than thrown, matching the old
 * watcher's tolerance for a commit that legitimately has nothing to commit
 * or that races another writer.
 *
 * @param manifest - Supplies `cardRepoPath`, `streamType`, and `sessionId` for the sentinel path and commit message.
 * @param warnFn - Called with a message if sentinel removal fails unexpectedly.
 * @param errorFn - Called with a message if the git commit fails.
 * @returns Resolves once cleanup and the commit attempt (successful or not) have finished.
 */
export async function commitSessionClose(
  manifest: SessionSyncManifest,
  warnFn: (message: string) => void,
  errorFn: (message: string) => void
): Promise<void> {
  try {
    await removeSentinelFile(manifest);
  } catch (error) {
    warnFn(`removeSentinelFile failed: ${String(error)}`);
  }

  try {
    await execFileNoWindowAsync('git', ['add', `streams/${manifest.streamType}/`], { cwd: manifest.cardRepoPath });
    await execFileNoWindowAsync('git', ['commit', '--no-gpg-sign', '-m', `Close session ${manifest.sessionId}.`], {
      cwd: manifest.cardRepoPath
    });
  } catch (error) {
    errorFn(`git commit failed for session ${manifest.sessionId}: ${String(error)}`);
  }
}
