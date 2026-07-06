/**
 * Extracted helper for spawning the detached, manifest-driven
 * `stream-sync-watcher` subprocess.
 *
 * Shared between the Claude Code and Codex SessionStart hooks (launch-mode,
 * resolving the wrapper by absolute path under the extension's `dist/bin`)
 * and `spawnAdhocAttribution` (attach-mode, resolving the bare wrapper name
 * on PATH). Mirrors `spawn-transcript-watcher.ts`'s process hygiene and win32
 * `.cmd`-avoidance exactly — the only difference is the argv contract: this
 * watcher takes a single JSON argument (a serialized {@link SessionSyncManifest})
 * instead of five positional strings, so both spawn paths use array-form
 * `spawn` with `shell: false` throughout (never string-concatenated), which
 * is safe regardless of quotes/spaces inside the JSON payload.
 *
 * @summary Spawn the detached, manifest-driven stream-sync-watcher subprocess
 * @module
 */

import { spawn } from 'node:child_process';
import { join } from 'node:path';
import { type SessionSyncManifest, serializeManifest } from '../transcript-sync/manifest.js';
import { resolveDetachedNodeInterpreter } from './detached-node.js';
import {
  isPosixWrapperAvailable,
  resolveWin32WatcherMjs,
  type TranscriptWatcherLogger
} from './spawn-transcript-watcher.js';

/** No-op logger used when a caller does not supply one. */
const NOOP_LOGGER: TranscriptWatcherLogger = {
  error: () => undefined,
  warn: () => undefined
};

/**
 * Returns the platform-correct basename of the `stream-sync-watcher` wrapper:
 * `stream-sync-watcher.cmd` on win32 (Windows cannot exec the extension-less
 * POSIX script) and `stream-sync-watcher` elsewhere.
 *
 * @returns The wrapper basename for the current platform.
 */
export function streamSyncWatcherWrapperName(): string {
  return process.platform === 'win32' ? 'stream-sync-watcher.cmd' : 'stream-sync-watcher';
}

/**
 * Resolves the absolute path to the `stream-sync-watcher` wrapper within the
 * extension's bin directory. See {@link resolveTranscriptWatcher} in
 * `spawn-transcript-watcher.ts` for the full launch-mode-vs-attach-mode
 * rationale, which applies identically here.
 *
 * @param binPath - Absolute path to the extension's `dist/bin` directory.
 * @returns Absolute path to the platform-correct `stream-sync-watcher` wrapper
 *   under `<binPath>/`.
 */
export function resolveStreamSyncWatcher(binPath: string): string {
  return join(binPath, streamSyncWatcherWrapperName());
}

/** Options for {@link spawnStreamSyncWatcher}. */
export interface SpawnStreamSyncWatcherOptions {
  /** The manifest describing the session to sync; serialized as the watcher's sole argv entry. */
  manifest: SessionSyncManifest;
  /**
   * Absolute path to the extension root. When supplied, the wrapper is
   * resolved by absolute path under `<extensionPath>/dist/bin` (launch mode,
   * where the `cards` plugin bin is not on PATH). When omitted, the bare
   * wrapper name is used (attach mode, where the `cards` plugin is enabled
   * and its bin is on PATH).
   */
  extensionPath?: string;
  /** Logger for structured error output when the watcher cannot be launched. Defaults to a no-op logger. */
  logger?: TranscriptWatcherLogger;
}

/**
 * Spawns a detached stream-sync-watcher process for crash-resilient
 * transcript upload, driven entirely by the supplied manifest.
 *
 * Process hygiene is identical to {@link spawnTranscriptWatcher}: detached,
 * `stdio: 'ignore'`, `unref()`'d, and — on win32 — spawned as `node.exe
 * <stream-sync-watcher.mjs> <manifestJson>` with no shell and no `.cmd` hop
 * (avoiding a console-window pop in the detached tree), using the same
 * fail-closed interpreter resolution (`VSCODE_NODE` env → `~/.cards/VSCODE_NODE`
 * file → PATH `node`). On resolution failure the spawn is skipped (logged),
 * never silently routed through a shell. POSIX exec's the extension-less
 * wrapper script directly.
 *
 * @param options - The manifest to serialize, optional extension path for
 *   launch-mode resolution, and an optional logger.
 * @returns `true` when the watcher was spawned, `false` when it was skipped
 *   because the wrapper could not be resolved. Callers gate any success log on
 *   this so a skipped spawn is never reported as a success.
 */
export function spawnStreamSyncWatcher(options: SpawnStreamSyncWatcherOptions): boolean {
  const { manifest, extensionPath, logger = NOOP_LOGGER } = options;

  const watcher = extensionPath
    ? resolveStreamSyncWatcher(join(extensionPath, 'dist', 'bin'))
    : streamSyncWatcherWrapperName();

  const spawnArgs = [serializeManifest(manifest)];
  const { sessionId, cardId, monitorPid } = manifest;

  if (process.platform === 'win32') {
    // Resolve a console-subsystem interpreter and the sibling .mjs, then spawn
    // directly — no `.cmd`, no shell — so the detached tree stays windowless.
    const nodeExe = resolveDetachedNodeInterpreter();
    if (!nodeExe) {
      logger.error('stream-sync-watcher: no usable Node interpreter — skipping spawn', {
        watcher,
        pid: monitorPid,
        sessionId
      });
      return false;
    }
    const mjs = resolveWin32WatcherMjs(watcher);
    if (!mjs) {
      logger.error('stream-sync-watcher .mjs not resolvable — skipping spawn', {
        watcher,
        pid: monitorPid,
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
      logger.error('stream-sync-watcher spawn failed', {
        error: err instanceof Error ? err.message : String(err),
        sessionId,
        cardId
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
    logger.error('stream-sync-watcher not resolvable — skipping spawn', {
      watcher,
      pid: monitorPid,
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
    logger.error('stream-sync-watcher spawn failed', {
      error: err instanceof Error ? err.message : String(err),
      sessionId,
      cardId
    });
  });
  child.unref();
  return true;
}
