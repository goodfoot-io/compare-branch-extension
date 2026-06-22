/**
 * Windows-robust recursive directory removal for tests that create real git
 * repositories/worktrees.
 *
 * git marks loose objects and pack files read-only. On POSIX a writable parent
 * directory is sufficient to unlink a read-only child, so `fs.rm` tears the tree
 * down fine. On Windows the read-only *attribute itself* blocks deletion with
 * `EPERM`, and neither `force: true` nor `maxRetries` clears it (the retry sees
 * the same persistent permission error, not a transient lock). On that EPERM we
 * walk the tree clearing the read-only bit, then remove again.
 *
 * @summary Recursively remove a directory tree, clearing read-only files on Windows.
 * @module sdk-test/helpers/forceRemove
 */

import { chmodSync, readdirSync, rmSync, statSync } from 'node:fs';
import { join } from 'node:path';

const RM_OPTS = { recursive: true, force: true, maxRetries: 10, retryDelay: 100 } as const;

/**
 * Recursively clears the read-only attribute on `target` and its descendants.
 * Tolerates entries that vanish mid-walk (a concurrent unlink races us).
 *
 * @param target - Absolute path to chmod recursively.
 * @throws When `statSync`/`chmodSync` fails with anything other than `ENOENT`.
 */
function clearReadOnlyRecursive(target: string): void {
  let stat: ReturnType<typeof statSync>;
  try {
    stat = statSync(target);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return;
    throw error;
  }
  try {
    // Only the write bit is meaningful on Windows; setting it clears the
    // read-only attribute that blocks unlink.
    chmodSync(target, 0o700);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
  if (stat.isDirectory()) {
    for (const entry of readdirSync(target)) {
      clearReadOnlyRecursive(join(target, entry));
    }
  }
}

/**
 * Removes a directory tree, retrying after clearing read-only attributes when
 * Windows rejects the unlink of a git-created read-only file with `EPERM`.
 *
 * @param target - Absolute path of the directory (or file) to remove.
 * @throws When removal fails for any reason other than a clearable `EPERM`.
 */
export function forceRemoveSync(target: string): void {
  try {
    rmSync(target, RM_OPTS);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EPERM') throw error;
    clearReadOnlyRecursive(target);
    rmSync(target, RM_OPTS);
  }
}
