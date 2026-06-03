/**
 * Per-session file operations for card-repo commit attribution.
 *
 * Manages per-session CSV files and .head files under `~/.cards/card-repo-commits/`.
 * Each session gets its own CSV file for commit SHAs and a .head file tracking
 * the HEAD SHA at session start.
 *
 * Design invariants:
 * - **Fail-closed**: unexpected errors propagate; only `ENOENT` is silently handled.
 * - **Per-session locking**: CSV appends acquire a per-session lock to prevent
 *   duplicate writes under concurrent access.
 * - **Deduplication**: SHAs are deduplicated before appending.
 *
 * @summary Per-session CSV and .head file operations for card-repo commit attribution
 * @module card-repo
 */

import { appendFileSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { acquireLock, hasErrnoCode, releaseLock } from './internal.js';

const LOCK_TIMEOUT_MS = 2000;

// ---------------------------------------------------------------------------
// Internal path helpers
// ---------------------------------------------------------------------------

function getCardRepoCommitsDir(): string {
  return join(homedir(), '.cards', 'card-repo-commits');
}

function getSessionCsvPath(sessionId: string): string {
  return join(getCardRepoCommitsDir(), `${sessionId}.csv`);
}

function getSessionCsvLockPath(sessionId: string): string {
  return join(getCardRepoCommitsDir(), `${sessionId}.csv.lock`);
}

function getSessionHeadShaPath(sessionId: string): string {
  return join(getCardRepoCommitsDir(), `${sessionId}.head`);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Appends a commit SHA to the session's CSV file. Deduplicates SHAs.
 * Creates directory and CSV file if they don't exist.
 *
 * Deduplication is read-before-append under a per-session lock, so concurrent
 * writers do not produce duplicate lines for the same SHA.
 *
 * @param sessionId - Session whose commit buffer should be updated.
 * @param sha - Full commit SHA to append.
 * @returns Resolves once the SHA is persisted or skipped as duplicate.
 * @throws Error on lock acquisition, read, or append failures.
 */
export async function appendCommitToSession(sessionId: string, sha: string): Promise<void> {
  mkdirSync(getCardRepoCommitsDir(), { recursive: true, mode: 0o700 });

  const csvLockPath = getSessionCsvLockPath(sessionId);
  await acquireLock(csvLockPath, LOCK_TIMEOUT_MS);

  try {
    const csvPath = getSessionCsvPath(sessionId);
    const existingCommits = getSessionCommits(sessionId);

    if (!existingCommits.includes(sha)) {
      appendFileSync(csvPath, `${sha}\n`, { mode: 0o600 });
    }
  } finally {
    releaseLock(csvLockPath);
  }
}

/**
 * Reads and returns all commit SHAs for a session from its CSV file.
 * Returns empty array if CSV doesn't exist.
 *
 * @param sessionId - Session whose commit buffer should be read.
 * @returns Ordered list of non-empty SHA lines. Returns `[]` when the CSV is absent.
 * @throws Error on read failure (except `ENOENT`).
 */
export function getSessionCommits(sessionId: string): string[] {
  try {
    const csvPath = getSessionCsvPath(sessionId);
    const content = readFileSync(csvPath, 'utf-8');
    return content
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
  } catch (error) {
    if (hasErrnoCode(error, 'ENOENT')) return [];
    throw error;
  }
}

/**
 * Removes the session's CSV file and its lock file.
 * No-op if files don't exist.
 *
 * @param sessionId - Session whose CSV artifacts should be deleted.
 * @throws Error when deleting either file fails for reasons other than `ENOENT`.
 */
export function removeSessionCsv(sessionId: string): void {
  const csvPath = getSessionCsvPath(sessionId);
  const csvLockPath = getSessionCsvLockPath(sessionId);

  try {
    unlinkSync(csvPath);
  } catch (error) {
    if (!hasErrnoCode(error, 'ENOENT')) throw error;
  }

  try {
    unlinkSync(csvLockPath);
  } catch (error) {
    if (!hasErrnoCode(error, 'ENOENT')) throw error;
  }
}

/**
 * Writes a git HEAD SHA to the session's .head file.
 * Creates directory if it doesn't exist.
 *
 * @param sessionId - Session whose HEAD SHA should be stored.
 * @param sha - Git commit SHA to persist.
 * @throws Error when directory creation or file write fails.
 */
export function writeSessionHeadSha(sessionId: string, sha: string): void {
  mkdirSync(getCardRepoCommitsDir(), { recursive: true, mode: 0o700 });
  writeFileSync(getSessionHeadShaPath(sessionId), sha, { mode: 0o600 });
}

/**
 * Reads the git HEAD SHA from the session's .head file.
 *
 * @param sessionId - Session whose HEAD SHA should be retrieved.
 * @returns The stored SHA with whitespace trimmed, or `null` when the file is absent.
 * @throws Error when file read fails for reasons other than `ENOENT`.
 */
export function readSessionHeadSha(sessionId: string): string | null {
  try {
    return readFileSync(getSessionHeadShaPath(sessionId), 'utf-8').trim();
  } catch (error) {
    if (hasErrnoCode(error, 'ENOENT')) return null;
    throw error;
  }
}

/**
 * Removes the session's .head file.
 * No-op if file doesn't exist.
 *
 * @param sessionId - Session whose .head file should be deleted.
 * @throws Error when deleting the file fails for reasons other than `ENOENT`.
 */
export function removeSessionHeadSha(sessionId: string): void {
  try {
    unlinkSync(getSessionHeadShaPath(sessionId));
  } catch (error) {
    if (!hasErrnoCode(error, 'ENOENT')) throw error;
  }
}

// ---------------------------------------------------------------------------
// Per-session route-nudge marker
// ---------------------------------------------------------------------------

function getSessionRouteNudgePath(sessionId: string): string {
  return join(getCardRepoCommitsDir(), `${sessionId}.route-nudge`);
}

/**
 * Creates the per-session route-nudge marker file.
 * Creates directory if it doesn't exist.
 *
 * @param sessionId - Session to mark as having received a route nudge.
 * @throws Error when directory creation or file write fails.
 */
export function markSessionRouteNudgeFired(sessionId: string): void {
  mkdirSync(getCardRepoCommitsDir(), { recursive: true, mode: 0o700 });
  writeFileSync(getSessionRouteNudgePath(sessionId), '', { mode: 0o600 });
}

/**
 * Returns whether the per-session route-nudge marker file exists.
 *
 * @param sessionId - Session to check.
 * @returns `true` when the marker exists, `false` on `ENOENT`.
 * @throws Error when the check fails for reasons other than `ENOENT`.
 */
export function hasSessionRouteNudgeFired(sessionId: string): boolean {
  try {
    readFileSync(getSessionRouteNudgePath(sessionId));
    return true;
  } catch (error) {
    if (hasErrnoCode(error, 'ENOENT')) return false;
    throw error;
  }
}

/**
 * Removes the per-session route-nudge marker file.
 * No-op if file doesn't exist.
 *
 * @param sessionId - Session whose route-nudge marker should be deleted.
 * @throws Error when deleting the file fails for reasons other than `ENOENT`.
 */
export function removeSessionRouteNudge(sessionId: string): void {
  try {
    unlinkSync(getSessionRouteNudgePath(sessionId));
  } catch (error) {
    if (!hasErrnoCode(error, 'ENOENT')) throw error;
  }
}
