/**
 * Window-suppressing child-process helpers for detached (console-less) trees.
 *
 * On win32 a freshly spawned `child_process` whose interpreter is the stock
 * `node.exe` (a console-subsystem image) allocates a **new visible console
 * window** when it has no parent console to attach to — which is exactly the
 * situation inside a detached watcher subtree (`detached: true` ⇒
 * `DETACHED_PROCESS`). Electron's bundled Node hid these windows by default, but
 * stock `node.exe` does not, so every `execFile`/`spawn` reachable from a
 * detached root would pop a console window once the win32 interpreter switches
 * from `Code.exe` to `node.exe`.
 *
 * These helpers force `windowsHide: true` so libuv passes `CREATE_NO_WINDOW`,
 * suppressing that window. The option is a no-op on POSIX and for
 * console-attached parents.
 *
 * **Scope (important):** these are for **non-inherited-stdio** spawns only.
 * libuv silently ignores `windowsHide` when any stdio fd is `'inherit'` (hiding
 * a shared console would hide the parent's window too), so callers that inherit
 * stdio — interactive launches — must NOT route through these helpers and must
 * not treat `windowsHide` as a guarantee. The correct fix for inherited-stdio
 * (interactive) chains is a console-subsystem interpreter at every hop, not this
 * option.
 *
 * @summary Window-suppressing child-process helpers for detached trees
 * @module
 */

import {
  type ChildProcess,
  type ExecFileOptions,
  type ExecFileSyncOptions,
  type ExecFileSyncOptionsWithStringEncoding,
  execFile,
  execFileSync,
  type SpawnOptions,
  spawn
} from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsyncImpl = promisify(execFile);

/**
 * Promisified `execFile` with `windowsHide: true` forced on, returning the
 * captured `{ stdout, stderr }` as strings (default UTF-8 string overload).
 *
 * This is the promise-form replacement for `promisify(execFile)` at every
 * detached-reachable call site. Use for non-inherited-stdio command invocations
 * (`git`, `where`, `which`, …) reachable from a detached console-less tree;
 * `windowsHide` cannot be overridden by the caller — that is the point.
 *
 * @param file - The executable to run.
 * @param args - Arguments passed to the executable.
 * @param options - execFile options; `windowsHide` is overridden to `true`.
 * @returns A promise resolving to the captured `{ stdout, stderr }`.
 */
export function execFileNoWindowAsync(
  file: string,
  args: readonly string[],
  options?: ExecFileOptions
): Promise<{ stdout: string; stderr: string }> {
  // promisify(execFile) with a default (string) encoding resolves stdout/stderr
  // as strings at runtime; the spread of options widens the static overload to
  // string|Buffer, so pin the string result the callers rely on.
  return execFileAsyncImpl(file, args as string[], { ...options, windowsHide: true }) as Promise<{
    stdout: string;
    stderr: string;
  }>;
}

/**
 * `child_process.execFileSync` with `windowsHide: true` forced on.
 *
 * Use for synchronous command invocations (`tasklist`, `git rev-parse`, …)
 * reachable from a detached console-less tree. The string-encoding overload is
 * preserved so callers that pass `{ encoding: 'utf-8' }` receive a `string`
 * (and can `.trim()`/`.split()` it) exactly as with the underlying
 * `execFileSync`.
 *
 * @param file - The executable to run.
 * @param args - Arguments passed to the executable.
 * @param options - execFileSync options; `windowsHide` is overridden to `true`.
 * @returns The captured stdout (string with a string encoding, else Buffer).
 */
export function execFileSyncNoWindow(
  file: string,
  args: readonly string[],
  options: ExecFileSyncOptionsWithStringEncoding
): string;
export function execFileSyncNoWindow(file: string, args: readonly string[], options?: ExecFileSyncOptions): Buffer;
export function execFileSyncNoWindow(
  file: string,
  args: readonly string[],
  options?: ExecFileSyncOptions
): string | Buffer {
  return execFileSync(file, args as string[], { ...options, windowsHide: true });
}

/**
 * `child_process.spawn` with `windowsHide: true` forced on.
 *
 * Use for detached-root spawns and any non-inherited-stdio spawn reachable from
 * a console-less tree. Do NOT use for inherited-stdio (interactive) spawns — see
 * the module-level scope note.
 *
 * @param command - The command to run.
 * @param args - Arguments passed to the command.
 * @param options - spawn options; `windowsHide` is overridden to `true`.
 * @returns The spawned child process.
 */
export function spawnNoWindow(command: string, args: readonly string[], options: SpawnOptions): ChildProcess {
  return spawn(command, args as string[], { ...options, windowsHide: true });
}
