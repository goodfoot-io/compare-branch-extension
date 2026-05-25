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
import { join } from 'node:path';

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
 * @param marketplacePath - Absolute path to the bundled marketplace directory.
 * @returns Absolute path to `<marketplacePath>/claude/cards/bin/transcript-watcher`.
 */
export function resolveTranscriptWatcher(marketplacePath: string): string {
  return join(marketplacePath, 'claude', 'cards', 'bin', 'transcript-watcher');
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
  // helper only needs a way to invoke it. `command -v "$1"` resolves both an
  // absolute path (verifying it exists and is executable) and a bare name
  // (resolving it against PATH), so the same probe covers both call sites.
  const readiness = spawnSync('sh', ['-c', 'command -v "$1"', 'sh', watcher], { stdio: 'ignore' });
  if (readiness.error || readiness.status !== 0) {
    logger.error('transcript-watcher not resolvable — skipping spawn', {
      watcher,
      status: readiness.status ?? undefined,
      error: readiness.error instanceof Error ? readiness.error.message : undefined,
      pid,
      sessionId
    });
    return false;
  }

  const spawnArgs = [String(pid), sessionId, transcriptPath, cardId, cardRepoPath];

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
