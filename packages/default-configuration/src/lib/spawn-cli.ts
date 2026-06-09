/**
 * Cross-platform launcher for coding-agent CLIs (`claude`, `codex`, ...).
 *
 * On POSIX the bare command name is spawned directly. On win32 the on-PATH
 * launcher is a PATHEXT shim (`claude.cmd`) that Node's `spawn` cannot handle
 * cleanly either way:
 *
 * - `spawn(name, args)` (no shell) fails with `ENOENT` — Node resolves only exact
 *   filenames against PATH, not PATHEXT, and modern Node refuses to spawn a
 *   `.cmd`/`.bat` without a shell.
 * - `spawn(name, args, { shell: true })` resolves the shim via cmd.exe, but Node
 *   then concatenates the arguments into the command line **unquoted**, so cmd.exe
 *   mangles any argument containing its metacharacters or embedded quotes. The
 *   agent launch passes a `--settings '{…JSON…}'` argument (and a multi-line
 *   `--append-system-prompt`), whose `"`/`{`/`}` get corrupted — claude then exits
 *   non-zero with "Invalid JSON" / "cannot find the file specified" before its
 *   session starts, so no SessionStart hook fires and nothing streams.
 *
 * `cross-spawn` resolves the Windows PATHEXT shim to its real target AND escapes
 * each argument correctly for the cmd.exe it routes through, so complex args
 * survive intact. On POSIX it is a thin pass-through to `child_process.spawn`,
 * so behaviour there is unchanged.
 *
 * @summary Cross-platform launcher for agent CLIs
 * @module
 */

import type { ChildProcess, SpawnOptions } from 'node:child_process';
import spawn from 'cross-spawn';

/**
 * Spawns an agent CLI cross-platform.
 *
 * Delegates to `cross-spawn`, which on win32 resolves the PATHEXT launcher shim
 * (`name.cmd`) and escapes arguments for cmd.exe; on POSIX it spawns the bare
 * name directly. Options (cwd, stdio, env) are forwarded unchanged.
 *
 * @param name - Bare CLI name to launch (e.g. `'claude'`, `'codex'`).
 * @param args - CLI arguments.
 * @param options - Spawn options forwarded unchanged (cwd, stdio, env).
 * @returns The spawned child process.
 */
export function spawnAgentCli(name: string, args: string[], options: SpawnOptions): ChildProcess {
  return spawn(name, args, options);
}
