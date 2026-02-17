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

import { closeSync, mkdirSync, openSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { isProcessAlive } from './ipc.js';

export { isProcessAlive } from './ipc.js';

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

/**
 * Removes stale entries from a PID-keyed registry object.
 *
 * An entry is considered stale when:
 * 1. Its key is not a valid integer PID.
 * 2. Its `updatedAt` timestamp is older than `maxAgeMs`.
 * 3. The process identified by its key is no longer alive.
 *
 * @param registry - Mutable PID-keyed record to prune in place.
 * @param isAlive - Liveness check function (typically {@link isProcessAlive}).
 * @param maxAgeMs - Maximum entry age in milliseconds.
 */
export function pruneStaleEntries<T extends { updatedAt: string }>(
  registry: Record<string, T>,
  isAlive: (pid: number) => boolean,
  maxAgeMs: number
): void {
  const now = Date.now();

  for (const [pidStr, entry] of Object.entries(registry)) {
    const pid = Number.parseInt(pidStr, 10);

    if (Number.isNaN(pid)) {
      delete registry[pidStr];
      continue;
    }

    try {
      const updatedAt = new Date(entry.updatedAt).getTime();
      if (now - updatedAt > maxAgeMs) {
        delete registry[pidStr];
        continue;
      }
    } catch {
      delete registry[pidStr];
      continue;
    }

    try {
      if (!isAlive(pid)) {
        delete registry[pidStr];
      }
    } catch {
      // isProcessAlive throws on unexpected errors - keep entry
    }
  }
}

/**
 * Reads and parses a JSON registry file.
 *
 * **Fail-closed**: returns `defaultValue` only when the file does not exist
 * (`ENOENT`). Parse errors and other I/O failures propagate as exceptions.
 *
 * @param path - Absolute path to the registry JSON file.
 * @param defaultValue - Value returned when the file does not exist.
 * @returns Parsed registry contents, or `defaultValue` on `ENOENT`.
 * @throws {SyntaxError} When the file contains invalid JSON.
 * @throws {NodeJS.ErrnoException} On I/O errors other than `ENOENT`.
 */
export function readRegistry<T>(path: string, defaultValue: T): T {
  try {
    const content = readFileSync(path, 'utf-8');
    return JSON.parse(content) as T;
  } catch (error) {
    if (hasErrnoCode(error, 'ENOENT')) return defaultValue;
    throw error; // FAIL-CLOSED: throw on parse errors
  }
}

/**
 * Atomically writes a registry object as pretty-printed JSON.
 *
 * Writes to a temporary `.tmp` sibling first, then renames into place so
 * readers never observe a partially-written file.
 *
 * @param registry - Object to serialize.
 * @param registryPath - Absolute path to the target registry file.
 * @throws {NodeJS.ErrnoException} On filesystem write or rename failures.
 */
export function writeRegistryLocked<T>(registry: T, registryPath: string): void {
  const dir = dirname(registryPath);
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  const tempPath = `${registryPath}.tmp`;
  try {
    writeFileSync(tempPath, JSON.stringify(registry, null, 2), { mode: 0o600 });
    renameSync(tempPath, registryPath);
  } catch (error) {
    try {
      unlinkSync(tempPath);
    } catch {
      /* cleanup best-effort */
    }
    throw error;
  }
}

/**
 * Executes a read-modify-write transaction under an advisory file lock.
 *
 * 1. Acquires lock.
 * 2. Reads registry (or uses `defaultRegistry` if file absent).
 * 3. Optionally prunes stale entries.
 * 4. Calls `operation` with the mutable registry.
 * 5. Writes the registry back.
 * 6. Releases lock (guaranteed via `finally`).
 *
 * @param registryPath - Absolute path to the registry JSON file.
 * @param lockPath - Absolute path to the lock file.
 * @param operation - Callback that mutates the registry and returns a result.
 * @param pruner - Optional callback to prune stale entries before the operation.
 * @param defaultRegistry - Default value when the registry file does not exist.
 * @param lockTimeoutMs - Lock acquisition timeout (default 2000 ms).
 * @returns The value returned by `operation`.
 */
export async function executeTransaction<TRegistry, TResult>(
  registryPath: string,
  lockPath: string,
  operation: (registry: TRegistry) => TResult,
  pruner?: (registry: TRegistry) => void,
  defaultRegistry?: TRegistry,
  lockTimeoutMs?: number
): Promise<TResult> {
  await acquireLock(lockPath, lockTimeoutMs ?? 2000);
  try {
    const registry = readRegistry<TRegistry>(registryPath, defaultRegistry as TRegistry);
    if (pruner) pruner(registry);
    const result = operation(registry);
    writeRegistryLocked(registry, registryPath);
    return result;
  } finally {
    releaseLock(lockPath);
  }
}
