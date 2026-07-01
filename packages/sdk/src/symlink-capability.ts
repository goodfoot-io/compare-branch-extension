/**
 * Runtime symlink-capability probe for Windows.
 *
 * On Windows without Developer Mode (and without an elevated session),
 * `fs.symlink` fails with `EPERM`. This module provides a one-shot,
 * per-process-cached probe so callers can check capability before attempting
 * symlink operations and surface actionable guidance instead of an opaque OS
 * error.
 *
 * Non-Windows platforms short-circuit to `true` — no probe runs.
 *
 * @summary Runtime symlink-capability probe for Windows
 * @module symlink-capability
 */

import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';

/** Cached promise so concurrent callers share a single probe. */
let _probePromise: Promise<boolean> | undefined;

/**
 * Returns `true` when the current process can create symlinks.
 *
 * On non-Windows platforms this returns `true` immediately. On Windows it
 * attempts a real `fs.symlink` in `os.tmpdir()` and caches the result for the
 * lifetime of the process. `EPERM` and `EACCES` are treated as "cannot create
 * symlinks" (Developer Mode off, not elevated); any other unexpected error is
 * logged and treated as `false` (fail-closed).
 *
 * Memoized per-process: the first caller triggers the probe; subsequent callers
 * (including concurrent ones) receive the cached result. Call
 * {@link invalidateSymlinkCapability} to force a re-probe.
 *
 * @returns `true` when symlink creation is available.
 */
export async function canCreateSymlinks(): Promise<boolean> {
  if (process.platform !== 'win32') {
    return true;
  }

  if (_probePromise !== undefined) {
    return _probePromise;
  }

  _probePromise = probeSymlinkCapability();
  return _probePromise;
}

/**
 * Resets the memoized capability probe so the next call to
 * {@link canCreateSymlinks} re-runs the probe.
 *
 * Use in tests and in response to configuration changes (e.g. the user
 * enabling Developer Mode and reloading the window).
 */
export function invalidateSymlinkCapability(): void {
  _probePromise = undefined;
}

/**
 * Runs the actual symlink probe: creates a temp directory, writes a temp file,
 * attempts `fs.symlink`, then cleans up.
 *
 * @returns `true` when the symlink succeeds, `false` on EPERM/EACCES or an
 *   unexpected error (fail-closed).
 */
async function probeSymlinkCapability(): Promise<boolean> {
  let tmpDir: string | undefined;
  try {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cards-symlink-probe-'));
    const filePath = path.join(tmpDir, 'target');
    const linkPath = path.join(tmpDir, 'link');

    await fs.writeFile(filePath, '');
    await fs.symlink(filePath, linkPath);
    return true;
  } catch (error: unknown) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === 'EPERM' || code === 'EACCES') {
      return false;
    }
    // Unexpected error — treat as incapable (fail-closed) but write to stderr
    // so the cause is diagnosable rather than silently swallowed.
    process.stderr.write(
      `canCreateSymlinks: unexpected error during symlink probe: ` +
        `code=${(error as NodeJS.ErrnoException).code ?? 'unknown'}, ` +
        `message=${error instanceof Error ? error.message : String(error)}\n`
    );
    return false;
  } finally {
    if (tmpDir !== undefined) {
      try {
        await fs.rm(tmpDir, { recursive: true, force: true });
      } catch {
        // Best-effort cleanup — the temp dir is in os.tmpdir() and will be
        // reclaimed by the OS eventually.
      }
    }
  }
}
