/**
 * Shared stream-sync-watcher spawn for SessionStart hooks.
 *
 * The Claude Code and Codex session-start hooks spawn the watcher
 * identically — build the runtime's manifest, resolve the wrapper by
 * absolute path, log success only when the spawn actually happened, and warn
 * (never throw) on manifest-build or spawn failure. Only the manifest
 * builder differs per runtime, so {@link createSpawnWatcher} takes it as the
 * single parameter.
 *
 * @summary Shared spawn-watcher factory for session-start hooks
 * @module shared/spawn-watcher
 */

import { spawnStreamSyncWatcher } from '@cards.management/sdk/bin/spawn-stream-sync-watcher';
import type { ActionInput } from '@cards.management/sdk/config';
import type { SessionSyncManifest } from '@cards.management/sdk/transcript-sync';

/** Minimal logger surface required to spawn the watcher. */
export interface SpawnWatcherLogger {
  debug?(message: string, data?: Record<string, unknown>): void;
  info(message: string, data?: Record<string, unknown>): void;
  warn(message: string, data?: Record<string, unknown>): void;
  error(message: string, data?: Record<string, unknown>): void;
}

/** Inputs to the per-runtime manifest builder. */
export interface SpawnWatcherInput {
  /** Agent process ID to monitor. */
  agentPid: number;
  /** Session identifier. */
  sessionId: string;
  /** Path to the agent's transcript (rollout) file. */
  transcriptPath: string;
  /** Parsed action input containing card context. */
  actionInput: ActionInput;
}

/** Spawns the watcher for one session; non-fatal by contract. */
export type SpawnWatcher = (
  agentPid: number,
  sessionId: string,
  transcriptPath: string,
  actionInput: ActionInput,
  logger: SpawnWatcherLogger
) => void;

/**
 * Builds a {@link SpawnWatcher} bound to one runtime's manifest builder.
 *
 * Manifest construction and watcher spawn are both non-fatal — a hook must
 * not crash the session. A throwing manifest builder is caught and warned
 * exactly like a spawn failure.
 *
 * @param buildManifest - Builds the runtime's {@link SessionSyncManifest}.
 * @returns A watcher spawn function for the session-start hook.
 */
export function createSpawnWatcher(buildManifest: (input: SpawnWatcherInput) => SessionSyncManifest): SpawnWatcher {
  return (agentPid, sessionId, transcriptPath, actionInput, logger) => {
    try {
      const manifest = buildManifest({ agentPid, sessionId, transcriptPath, actionInput });
      // Resolve the watcher by absolute path: a background Launch action enables
      // only the `runtime` plugin, so the `cards` plugin bin that publishes the
      // `stream-sync-watcher` wrapper is never on PATH. The success log is gated
      // on the spawn actually happening so a skipped spawn is not reported as
      // success.
      const spawned = spawnStreamSyncWatcher({ manifest, extensionPath: actionInput.extensionPath, logger });
      if (spawned) {
        logger.info('Spawned stream-sync-watcher', { pid: agentPid, sessionId });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.warn('stream-sync-watcher spawn failed', { error: message });
    }
  };
}
