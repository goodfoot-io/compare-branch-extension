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
 * Spawns a detached transcript watcher process for crash-resilient transcript upload.
 *
 * The watcher monitors the agent PID and uploads the transcript if the process
 * exits without the session-end hook having run (crash/SIGKILL).
 *
 * @param pid - Agent process ID to monitor.
 * @param sessionId - Session identifier for the transcript.
 * @param transcriptPath - Path to the transcript file.
 * @param cardId - Card identifier for the upload target.
 * @param cardRepoPath - Path to the card repository.
 * @param logger - Logger for structured error output when the watcher cannot be launched.
 */
export function spawnTranscriptWatcher(
  pid: number,
  sessionId: string,
  transcriptPath: string,
  cardId: string,
  cardRepoPath: string,
  logger: TranscriptWatcherLogger
): void {
  // `transcript-watcher` is a shell wrapper published on PATH by the SDK plugin tree
  // (public/plugins/cards/bin/transcript-watcher). It exec's the .mjs via VSCODE_NODE,
  // so this helper does not need to know either location.
  const readiness = spawnSync('sh', ['-c', 'command -v transcript-watcher'], { stdio: 'ignore' });
  if (readiness.error || readiness.status !== 0) {
    logger.error('transcript-watcher not resolvable on PATH — skipping spawn', {
      status: readiness.status ?? undefined,
      error: readiness.error instanceof Error ? readiness.error.message : undefined,
      pid,
      sessionId
    });
    return;
  }

  const spawnArgs = [String(pid), sessionId, transcriptPath, cardId, cardRepoPath];

  const child = spawn('transcript-watcher', spawnArgs, {
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
}
