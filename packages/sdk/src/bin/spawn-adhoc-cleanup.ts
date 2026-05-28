/**
 * Extracted helper for spawning the detached ad-hoc cleanup process.
 *
 * Used by the EnterWorktree (PostToolUse) hook to launch the detached `adhoc-cleanup` bin that
 * monitors the agent PID and flips the card back to `needs_review` when the
 * session ends. Modelled on {@link spawnTranscriptWatcher}.
 *
 * @summary Spawn the detached adhoc-cleanup subprocess
 * @module
 */

import { spawn, spawnSync } from 'node:child_process';

/**
 * Minimal logger interface required by spawnAdhocCleanup.
 *
 * Accepts any logger that exposes `error` taking a message string plus an
 * optional structured-data argument.
 */
export interface AdhocCleanupLogger {
  error(message: string, data?: Record<string, unknown>): void;
}

/**
 * Spawns a detached ad-hoc cleanup process for ad-hoc session attribution.
 *
 * The cleanup process marks the card active, monitors the agent PID, and flips
 * the card back to `needs_review` when the process exits. Spawn failure is
 * non-fatal (logged) — transcript capture still works without it.
 *
 * @param agentPid - Claude agent process ID to monitor.
 * @param sessionId - Session identifier (UUID) for this ad-hoc session.
 * @param cardId - Card identifier for the status target.
 * @param cardRepoPath - Path to the card repository.
 * @param lockPath - Path to the de-dupe lock file removed on cleanup exit.
 * @param logger - Logger for structured error output when the process cannot be launched.
 */
export function spawnAdhocCleanup(
  agentPid: number,
  sessionId: string,
  cardId: string,
  cardRepoPath: string,
  lockPath: string,
  logger: AdhocCleanupLogger
): void {
  // `adhoc-cleanup` is a shell wrapper published on PATH by the SDK plugin tree
  // (public/claude/cards/bin/adhoc-cleanup). It exec's the .mjs via VSCODE_NODE,
  // so this helper does not need to know either location.
  const readiness = spawnSync('sh', ['-c', 'command -v adhoc-cleanup'], { stdio: 'ignore' });
  if (readiness.error || readiness.status !== 0) {
    logger.error('adhoc-cleanup not resolvable on PATH — skipping spawn', {
      status: readiness.status ?? undefined,
      error: readiness.error instanceof Error ? readiness.error.message : undefined,
      agentPid,
      sessionId
    });
    return;
  }

  const spawnArgs = [String(agentPid), sessionId, cardId, cardRepoPath, lockPath];

  const child = spawn('adhoc-cleanup', spawnArgs, {
    detached: true,
    stdio: 'ignore',
    env: { ...process.env }
  });
  child.on('error', (err) => {
    logger.error('adhoc-cleanup spawn failed', {
      error: err instanceof Error ? err.message : String(err),
      spawnArgs: spawnArgs.join(' ')
    });
  });
  child.unref();
}
