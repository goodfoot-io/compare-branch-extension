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
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { resolveDetachedNodeInterpreter } from './detached-node.js';

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
 * Probes whether the `adhoc-cleanup` wrapper resolves on PATH (POSIX).
 *
 * There is no `sh` on Windows; win32 resolution is handled separately by
 * {@link resolveWin32AdhocMjs}, which captures `where`'s output to derive the
 * sibling `.mjs`. On POSIX the PATH lookup uses `command -v` via `sh`, which
 * exits 0 only when the name is found.
 *
 * @param command - Bare wrapper name to probe.
 * @returns True when the command resolves on PATH.
 */
function isOnPathPosix(command: string): boolean {
  const probe = spawnSync('sh', ['-c', 'command -v "$1"', 'sh', command], { stdio: 'ignore' });
  return !probe.error && probe.status === 0;
}

/**
 * Resolves the absolute `adhoc-cleanup.mjs` the wrapper would exec on win32.
 *
 * Prefers `MARKETPLACE_PATH` when set (the bin tree publishes the `.mjs`
 * alongside the `.cmd` under `<marketplace>/claude/cards/bin/`); otherwise
 * captures `where adhoc-cleanup.cmd`'s **output** (the absolute `.cmd` path —
 * its exit status alone is insufficient) and swaps the extension.
 *
 * @returns The absolute `.mjs` path, or `null` when it cannot be resolved or the
 *   resolved file does not exist.
 */
function resolveWin32AdhocMjs(): string | null {
  const marketplacePath = (process.env['MARKETPLACE_PATH'] ?? '').trim();
  if (marketplacePath) {
    const mjs = join(marketplacePath, 'claude', 'cards', 'bin', 'adhoc-cleanup.mjs');
    if (existsSync(mjs)) return mjs;
  }

  const probe = spawnSync('where', ['adhoc-cleanup.cmd'], { encoding: 'utf-8', windowsHide: true });
  if (probe.error || probe.status !== 0 || typeof probe.stdout !== 'string') return null;
  const cmdPath = probe.stdout.split(/\r?\n/).map((line) => line.trim())[0] || null;
  if (!cmdPath) return null;
  const mjs = cmdPath.replace(/\.cmd$/i, '.mjs');
  if (mjs === cmdPath) return null;
  return existsSync(mjs) ? mjs : null;
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
 * On **win32** the cleanup is spawned as `node.exe <adhoc-cleanup.mjs> ...args`
 * with **no shell and no `.cmd` hop**, so the detached (console-less) tree stays
 * windowless under stock `node.exe`. The interpreter is resolved fail-closed
 * (env `VSCODE_NODE` → `~/.cards/VSCODE_NODE` → PATH `node`, existence-checked)
 * and the sibling `.mjs` is resolved from `MARKETPLACE_PATH` or `where`'s output.
 * **POSIX** is unchanged: the extension-less wrapper script is exec'd directly.
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
  const spawnArgs = [String(agentPid), sessionId, cardId, cardRepoPath, lockPath];

  if (process.platform === 'win32') {
    const nodeExe = resolveDetachedNodeInterpreter();
    if (!nodeExe) {
      logger.error('adhoc-cleanup: no usable Node interpreter — skipping spawn', { agentPid, sessionId });
      return;
    }
    const mjs = resolveWin32AdhocMjs();
    if (!mjs) {
      logger.error('adhoc-cleanup .mjs not resolvable — skipping spawn', { agentPid, sessionId });
      return;
    }

    const child = spawn(nodeExe, [mjs, ...spawnArgs], {
      detached: true,
      stdio: 'ignore',
      env: { ...process.env },
      windowsHide: true
    });
    child.on('error', (err) => {
      logger.error('adhoc-cleanup spawn failed', {
        error: err instanceof Error ? err.message : String(err),
        spawnArgs: spawnArgs.join(' ')
      });
    });
    child.unref();
    return;
  }

  // POSIX: `adhoc-cleanup` is a shell wrapper published on PATH by the SDK plugin
  // tree (public/claude/cards/bin/adhoc-cleanup). It exec's the .mjs via
  // VSCODE_NODE, so this helper only verifies it resolves on PATH and exec's it.
  const wrapper = adhocCleanupWrapperName();
  if (!isOnPathPosix(wrapper)) {
    logger.error('adhoc-cleanup not resolvable on PATH — skipping spawn', {
      wrapper,
      agentPid,
      sessionId
    });
    return;
  }

  const child = spawn(wrapper, spawnArgs, {
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
