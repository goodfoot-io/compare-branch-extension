/**
 * Cross-platform launcher for coding-agent CLIs (`claude`, `codex`, ...).
 *
 * On POSIX the bare command name is spawned directly. On win32 the on-PATH
 * launcher is a PATHEXT shim (`claude.cmd`): Node's `spawn` without a shell
 * resolves only exact filenames against PATH — it does not consult PATHEXT — so
 * spawning the bare name fails with ENOENT, and naming the `.cmd` explicitly
 * throws EINVAL (modern Node refuses to spawn a `.cmd`/`.bat` without a shell).
 * Routing through the shell on win32 lets cmd.exe resolve the shim via PATHEXT.
 *
 * This mirrors the established repo convention for spawning PATH-published
 * wrappers on Windows (`packages/cards/server/src/runtime/wrapper.ts`,
 * `public/packages/sdk/src/bin/spawn-adhoc-cleanup.ts`).
 *
 * @summary Cross-platform launcher for agent CLIs
 * @module
 */

import { type ChildProcess, type SpawnOptions, spawn } from 'node:child_process';

/**
 * Spawns an agent CLI cross-platform.
 *
 * POSIX: `spawn(name, args, options)` — the bare name, no shell. win32: the same
 * call with `shell: true` so cmd.exe resolves the PATHEXT shim (`name.cmd`).
 *
 * @param name - Bare CLI name to launch (e.g. `'claude'`, `'codex'`).
 * @param args - CLI arguments.
 * @param options - Spawn options forwarded unchanged (cwd, stdio, env).
 * @returns The spawned child process.
 */
export function spawnAgentCli(name: string, args: string[], options: SpawnOptions): ChildProcess {
  return spawn(name, args, { ...options, shell: process.platform === 'win32' });
}
