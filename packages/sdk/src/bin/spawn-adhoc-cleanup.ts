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
 * Returns the platform-correct basename of the `adhoc-cleanup` wrapper:
 * `adhoc-cleanup.cmd` on win32 (Windows cannot exec the extension-less POSIX
 * script) and `adhoc-cleanup` elsewhere. Both wrappers honour the identical
 * positional-argument and env-var contract.
 *
 * @returns The wrapper basename for the current platform.
 */
export function adhocCleanupWrapperName(): string {
  return process.platform === 'win32' ? 'adhoc-cleanup.cmd' : 'adhoc-cleanup';
}

/**
 * Probes whether the `adhoc-cleanup` wrapper resolves on PATH, platform-correctly.
 *
 * There is no `sh` on Windows, so the PATH lookup uses `where` on win32 and
 * `command -v` via `sh` on POSIX. Both exit 0 only when the name is found.
 *
 * @param command - Bare wrapper name to probe.
 * @returns True when the command resolves on PATH.
 */
function isOnPath(command: string): boolean {
  if (process.platform === 'win32') {
    const probe = spawnSync('where', [command], { stdio: 'ignore' });
    return !probe.error && probe.status === 0;
  }
  const probe = spawnSync('sh', ['-c', 'command -v "$1"', 'sh', command], { stdio: 'ignore' });
  return !probe.error && probe.status === 0;
}

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
  // (public/claude/cards/bin/adhoc-cleanup{,.cmd}). It exec's the .mjs via
  // VSCODE_NODE, so this helper does not need to know either location — it only
  // selects the platform-correct wrapper name and verifies it resolves on PATH.
  const wrapper = adhocCleanupWrapperName();
  if (!isOnPath(wrapper)) {
    logger.error('adhoc-cleanup not resolvable on PATH — skipping spawn', {
      wrapper,
      agentPid,
      sessionId
    });
    return;
  }

  const spawnArgs = [String(agentPid), sessionId, cardId, cardRepoPath, lockPath];

  // On Windows the wrapper is a `.cmd`; Node refuses to spawn a `.cmd` without a
  // shell (EINVAL), so route through the shell there. POSIX execs the script
  // directly.
  const child = spawn(wrapper, spawnArgs, {
    detached: true,
    stdio: 'ignore',
    env: { ...process.env },
    shell: process.platform === 'win32'
  });
  child.on('error', (err) => {
    logger.error('adhoc-cleanup spawn failed', {
      error: err instanceof Error ? err.message : String(err),
      spawnArgs: spawnArgs.join(' ')
    });
  });
  child.unref();
}
