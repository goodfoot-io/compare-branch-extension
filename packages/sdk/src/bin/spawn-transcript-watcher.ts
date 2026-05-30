/**
 * Extracted helper for spawning the detached transcript watcher process.
 *
 * Shared between `session-start.ts` (launch-mode) and `card.ts` (attach-mode)
 * so neither must import from the other's package.
 *
 * @summary Spawn the detached transcript-watcher subprocess
 * @module
 */

import { spawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { isAbsolute, join } from 'node:path';

/**
 * Minimal logger interface required by spawnTranscriptWatcher.
 *
 * Accepts any logger that exposes `error` and `warn` methods taking
 * a message string plus an optional structured-data argument.
 */
export interface TranscriptWatcherLogger {
  error(message: string, data?: Record<string, unknown>): void;
  warn(message: string, data?: Record<string, unknown>): void;
}

/**
 * Resolves the absolute path to the `transcript-watcher` wrapper within a
 * packaged marketplace.
 *
 * The wrapper is published by the `cards` plugin's bin tree. The runtime
 * plugin's SessionStart hook cannot rely on it being on PATH — a background
 * Launch action enables only the `runtime` plugin, so the `cards` plugin's
 * `bin/` is never prepended to PATH. Resolving an absolute path from the
 * action's `marketplacePath` removes that cross-plugin PATH dependency.
 *
 * Mirrors the marketplace-path convention used by `resolveScaffoldDir`.
 *
 * The bin tree publishes a platform pair of wrappers: an extension-less POSIX
 * script (`transcript-watcher`) and a Windows batch sibling
 * (`transcript-watcher.cmd`). Windows cannot exec the extension-less script, so
 * the `.cmd` sibling is selected on win32. Both wrappers honour the identical
 * positional-argument and env-var contract.
 *
 * @param marketplacePath - Absolute path to the bundled marketplace directory.
 * @returns Absolute path to the platform-correct `transcript-watcher` wrapper
 *   under `<marketplacePath>/claude/cards/bin/`.
 */
export function resolveTranscriptWatcher(marketplacePath: string): string {
  return join(marketplacePath, 'claude', 'cards', 'bin', transcriptWatcherWrapperName());
}

/**
 * Returns the platform-correct basename of the `transcript-watcher` wrapper:
 * `transcript-watcher.cmd` on win32 (Windows cannot exec the extension-less
 * POSIX script) and `transcript-watcher` elsewhere.
 *
 * @returns The wrapper basename for the current platform.
 */
export function transcriptWatcherWrapperName(): string {
  return process.platform === 'win32' ? 'transcript-watcher.cmd' : 'transcript-watcher';
}

/**
 * Probes whether a wrapper command is launchable, platform-correctly.
 *
 * - **Absolute path:** verified with `fs.existsSync` on every platform (the file
 *   either exists at the resolved location or it does not).
 * - **Bare name (PATH lookup), POSIX:** resolved with `sh -c 'command -v "$1"'`,
 *   which exits 0 only when the name is found on PATH.
 * - **Bare name (PATH lookup), win32:** resolved with `where <name>` — there is
 *   no `sh` on Windows, and `where` exits 0 only when the name resolves on PATH.
 *
 * @param command - Absolute path or bare wrapper name to probe.
 * @returns True when the command is launchable.
 */
function isWrapperAvailable(command: string): boolean {
  if (isAbsolute(command)) {
    return existsSync(command);
  }
  if (process.platform === 'win32') {
    const probe = spawnSync('where', [command], { stdio: 'ignore' });
    return !probe.error && probe.status === 0;
  }
  const probe = spawnSync('sh', ['-c', 'command -v "$1"', 'sh', command], { stdio: 'ignore' });
  return !probe.error && probe.status === 0;
}

/**
 * Spawns a detached transcript watcher process for crash-resilient transcript upload.
 *
 * The watcher monitors the agent PID and uploads the transcript if the process
 * exits without the session-end hook having run (crash/SIGKILL).
 *
 * @param watcher - Executable to launch: an absolute path (launch mode, where
 *   the `cards` plugin bin is not on PATH) or the bare name `transcript-watcher`
 *   (attach mode, where the `cards` plugin is enabled and its bin is on PATH).
 * @param pid - Agent process ID to monitor.
 * @param sessionId - Session identifier for the transcript.
 * @param transcriptPath - Path to the transcript file.
 * @param cardId - Card identifier for the upload target.
 * @param cardRepoPath - Path to the card repository.
 * @param logger - Logger for structured error output when the watcher cannot be launched.
 * @returns `true` when the watcher was spawned, `false` when it was skipped
 *   because `watcher` could not be resolved. Callers gate any success log on
 *   this so a skipped spawn is never reported as a success.
 */
export function spawnTranscriptWatcher(
  watcher: string,
  pid: number,
  sessionId: string,
  transcriptPath: string,
  cardId: string,
  cardRepoPath: string,
  logger: TranscriptWatcherLogger
): boolean {
  // The `transcript-watcher` wrapper exec's the .mjs via VSCODE_NODE; this
  // helper only needs a way to invoke it. `isWrapperAvailable` covers both call
  // sites and every platform: an absolute path (launch mode) is checked with
  // `fs.existsSync`, and a bare name (attach mode) is resolved against PATH with
  // `where` on win32 or `command -v` on POSIX.
  if (!isWrapperAvailable(watcher)) {
    logger.error('transcript-watcher not resolvable — skipping spawn', {
      watcher,
      pid,
      sessionId
    });
    return false;
  }

  const spawnArgs = [String(pid), sessionId, transcriptPath, cardId, cardRepoPath];

  // On Windows the wrapper is a `.cmd`; Node refuses to spawn a `.cmd` without a
  // shell (EINVAL), so route through the shell there. POSIX execs the script
  // directly.
  const child = spawn(watcher, spawnArgs, {
    detached: true,
    stdio: 'ignore',
    env: { ...process.env },
    shell: process.platform === 'win32'
  });
  child.on('error', (err) => {
    logger.error('transcript-watcher spawn failed', {
      error: err instanceof Error ? err.message : String(err),
      spawnArgs: spawnArgs.join(' ')
    });
  });
  child.unref();
  return true;
}
