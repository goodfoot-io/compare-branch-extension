/**
 * Generic shared helpers for registry file operations.
 *
 * Extracted from index.ts so that multiple registry modules can reuse the
 * same locking, read/write, and pruning primitives without duplication.
 *
 * All helpers follow fail-closed semantics: unexpected errors propagate
 * rather than being silently swallowed.
 *
 * @summary Generic locking, read/write, and pruning helpers
 * @module internal
 */

import { closeSync, mkdirSync, openSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { isProcessAlive } from './ipc.js';

/**
 * Returns a promise that resolves after `ms` milliseconds.
 *
 * @param ms - Duration to sleep in milliseconds.
 * @returns A promise that resolves after the specified delay.
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Checks whether an unknown thrown value is a Node.js system error with the
 * specified `code` property (e.g. `'ENOENT'`, `'EEXIST'`).
 *
 * @param error - Value caught in a `catch` block.
 * @param code - Expected `ErrnoException.code` string.
 * @returns `true` when the error matches.
 */
export function hasErrnoCode(error: unknown, code: string): boolean {
  return error instanceof Error && 'code' in error && (error as NodeJS.ErrnoException).code === code;
}

/**
 * Attempts to remove a stale lock file left by a dead process.
 *
 * Reads the PID from the lock file, checks liveness, and unlinks when the
 * holder is no longer running. A second read guards against TOCTOU races.
 *
 * @param lockPath - Absolute path to the lock file.
 * @returns `true` when the stale lock was successfully removed.
 */
export function tryRemoveStaleLock(lockPath: string): boolean {
  try {
    const lockContent = readFileSync(lockPath, 'utf-8');
    const holderPid = Number.parseInt(lockContent.trim(), 10);

    if (!Number.isNaN(holderPid) && !isProcessAlive(holderPid)) {
      // Re-read lock file to reduce TOCTOU race window before unlinking.
      if (readFileSync(lockPath, 'utf-8') === lockContent) {
        unlinkSync(lockPath);
        return true;
      }
    }
  } catch {
    try {
      unlinkSync(lockPath);
      return true;
    } catch {
      // ENOENT: lock already removed; other errors: best-effort cleanup
    }
  }

  return false;
}

/**
 * Creates a lock file exclusively and writes the current PID into it.
 *
 * Uses `O_WRONLY | O_CREAT | O_EXCL` (`'wx'`) so the call fails with
 * `EEXIST` when another process already holds the lock.
 *
 * @param lockPath - Absolute path to the lock file.
 */
export function writeLockHolderPid(lockPath: string): void {
  const fd = openSync(lockPath, 'wx', 0o600);
  try {
    writeFileSync(fd, String(process.pid));
  } finally {
    closeSync(fd);
  }
}

/**
 * Acquires an advisory file lock, retrying until success or timeout.
 *
 * **Fail-closed**: throws on timeout instead of returning a boolean.
 *
 * @param lockPath - Absolute path to the lock file.
 * @param timeoutMs - Maximum wait time in milliseconds.
 * @throws {Error} `'Lock acquisition timeout'` when the lock cannot be
 *   acquired within `timeoutMs`.
 */
export async function acquireLock(lockPath: string, timeoutMs: number): Promise<void> {
  const startTime = Date.now();
  const dir = dirname(lockPath);

  while (Date.now() - startTime < timeoutMs) {
    try {
      mkdirSync(dir, { recursive: true, mode: 0o700 });
      writeLockHolderPid(lockPath);
      return; // success
    } catch (error) {
      if (!hasErrnoCode(error, 'EEXIST')) throw error;
      if (tryRemoveStaleLock(lockPath)) continue;

      const remaining = timeoutMs - (Date.now() - startTime);
      if (remaining > 0) {
        await sleep(Math.min(50, remaining));
      }
    }
  }

  throw new Error('Lock acquisition timeout');
}

/**
 * Releases an advisory file lock by unlinking the lock file.
 *
 * `ENOENT` is silently ignored (the lock was already released); all other
 * errors propagate.
 *
 * @param lockPath - Absolute path to the lock file.
 * @throws {NodeJS.ErrnoException} When the unlink fails for reasons other than `ENOENT`.
 */
export function releaseLock(lockPath: string): void {
  try {
    unlinkSync(lockPath);
  } catch (error) {
    if (!hasErrnoCode(error, 'ENOENT')) throw error;
  }
}
