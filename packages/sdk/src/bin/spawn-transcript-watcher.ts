/**
 * Extracted helper for spawning the detached transcript watcher process.
 *
 * Shared between `session-start.ts` (launch-mode) and `cards.ts` (attach-mode)
 * so neither must import from the other's package.
 *
 * @summary Spawn the detached transcript-watcher subprocess
 * @module
 */

import { spawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { isAbsolute, join } from 'node:path';
import { resolveDetachedNodeInterpreter } from './detached-node.js';

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
 * Resolves the absolute path to the `transcript-watcher` wrapper within the
 * extension's bin directory.
 *
 * The wrapper is produced by the extension build into `<extensionPath>/dist/bin`.
 * The runtime plugin's SessionStart hook cannot rely on it being on PATH — a
 * background Launch action enables only the `runtime` plugin, so the `cards`
 * plugin's bin is never prepended to PATH. Resolving an absolute path from the
 * caller-supplied `binPath` removes that cross-plugin PATH dependency.
 *
 * The bin tree publishes a platform pair of wrappers: an extension-less POSIX
 * script (`transcript-watcher`) and a Windows batch sibling
 * (`transcript-watcher.cmd`). Windows cannot exec the extension-less script, so
 * the `.cmd` sibling is selected on win32. Both wrappers honour the identical
 * positional-argument and env-var contract.
 *
 * @param binPath - Absolute path to the extension's `dist/bin` directory.
 * @returns Absolute path to the platform-correct `transcript-watcher` wrapper
 *   under `<binPath>/`.
 */
export function resolveTranscriptWatcher(binPath: string): string {
  return join(binPath, transcriptWatcherWrapperName());
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
 * Probes whether a POSIX wrapper command is launchable.
 *
 * - **Absolute path:** verified with `fs.existsSync` (the file either exists at
 *   the resolved location or it does not).
 * - **Bare name (PATH lookup):** resolved with `sh -c 'command -v "$1"'`, which
 *   exits 0 only when the name is found on PATH.
 *
 * (win32 resolution does not use this — it resolves the interpreter and sibling
 * `.mjs` directly; see {@link spawnTranscriptWatcher}.)
 *
 * Exported for reuse by `spawn-stream-sync-watcher.ts`, which shares this
 * exact POSIX-wrapper-availability check for its own detached spawn.
 *
 * @param command - Absolute path or bare wrapper name to probe.
 * @returns True when the command is launchable.
 */
export function isPosixWrapperAvailable(command: string): boolean {
  if (isAbsolute(command)) {
    return existsSync(command);
  }
  const probe = spawnSync('sh', ['-c', 'command -v "$1"', 'sh', command], { stdio: 'ignore' });
  return !probe.error && probe.status === 0;
}

/**
 * Resolves the absolute `transcript-watcher.mjs` that the wrapper would exec on
 * win32, from the wrapper reference the caller passed.
 *
 * - **Absolute `.cmd` path (launch mode):** the `.mjs` is the sibling the `.cmd`
 *   invokes (`%~dp0transcript-watcher.mjs`), i.e. the same path with the `.cmd`
 *   extension swapped for `.mjs`.
 * - **Bare name (attach mode):** `where <name>` is run to capture the absolute
 *   `.cmd` path it resolves to on PATH, then the extension is swapped. `where`'s
 *   exit status alone is insufficient here — the absolute path is needed to find
 *   the sibling `.mjs`.
 *
 * Exported for reuse by `spawn-stream-sync-watcher.ts`, which shares this
 * exact `.cmd` → `.mjs` sibling-resolution logic for its own detached spawn.
 *
 * @param watcher - Absolute `.cmd` path or bare wrapper name.
 * @returns The absolute `.mjs` path, or `null` when it cannot be resolved or the
 *   resolved file does not exist.
 */
export function resolveWin32WatcherMjs(watcher: string): string | null {
  let cmdPath: string | null = null;
  if (isAbsolute(watcher)) {
    cmdPath = watcher;
  } else {
    const probe = spawnSync('where', [watcher], { encoding: 'utf-8', windowsHide: true });
    if (probe.error || probe.status !== 0 || typeof probe.stdout !== 'string') return null;
    // `where` may print multiple matches (one per line); take the first.
    cmdPath = probe.stdout.split(/\r?\n/).map((line) => line.trim())[0] || null;
  }
  if (!cmdPath) return null;

  const mjsPath = cmdPath.replace(/\.cmd$/i, '.mjs');
  if (mjsPath === cmdPath) return null;
  return existsSync(mjsPath) ? mjsPath : null;
}

/**
 * Spawns a detached transcript watcher process for crash-resilient transcript upload.
 *
 * The watcher monitors the agent PID and uploads the transcript if the process
 * exits without the session-end hook having run (crash/SIGKILL).
 *
 * On **win32** the watcher is spawned as `node.exe <transcript-watcher.mjs>
 * ...args` with **no shell and no `.cmd` hop**: the `.cmd` → `node.exe` hop would
 * pop a console window inside this detached (console-less) tree once the win32
 * interpreter is stock `node.exe`. The interpreter is resolved fail-closed
 * (env `VSCODE_NODE` → `~/.cards/VSCODE_NODE` → PATH `node`, existence-checked)
 * and the sibling `.mjs` the `.cmd` would have invoked is resolved directly. On
 * resolution failure the spawn is skipped (logged), never silently routed
 * through a shell. **POSIX** is unchanged: the extension-less wrapper script is
 * exec'd directly.
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
  const spawnArgs = [String(pid), sessionId, transcriptPath, cardId, cardRepoPath];

  if (process.platform === 'win32') {
    // Resolve a console-subsystem interpreter and the sibling .mjs, then spawn
    // directly — no `.cmd`, no shell — so the detached tree stays windowless.
    const nodeExe = resolveDetachedNodeInterpreter();
    if (!nodeExe) {
      logger.error('transcript-watcher: no usable Node interpreter — skipping spawn', {
        watcher,
        pid,
        sessionId
      });
      return false;
    }
    const mjs = resolveWin32WatcherMjs(watcher);
    if (!mjs) {
      logger.error('transcript-watcher .mjs not resolvable — skipping spawn', {
        watcher,
        pid,
        sessionId
      });
      return false;
    }

    const child = spawn(nodeExe, [mjs, ...spawnArgs], {
      detached: true,
      stdio: 'ignore',
      env: { ...process.env },
      windowsHide: true
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

  // POSIX: the wrapper exec's the .mjs via VSCODE_NODE; this helper only needs a
  // way to invoke it. An absolute path (launch mode) is checked with
  // `fs.existsSync`; a bare name (attach mode) is resolved against PATH with
  // `command -v`. The extension-less script is exec'd directly.
  if (!isPosixWrapperAvailable(watcher)) {
    logger.error('transcript-watcher not resolvable — skipping spawn', {
      watcher,
      pid,
      sessionId
    });
    return false;
  }

  const child = spawn(watcher, spawnArgs, {
    detached: true,
    stdio: 'ignore',
    env: { ...process.env }
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
