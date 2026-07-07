/**
 * Per-file status reporting for the transcript-sync engine.
 *
 * Builds the heartbeat payload emitted on each steady tick from the
 * reconciler's tracked {@link FileSyncState}s, and implements the fail-closed
 * main-file invariant check: a `role: 'main'` file that has bytes on disk but
 * has had zero bytes consumed for more than one steady tick indicates the
 * tailer is stuck (e.g. matcher misconfiguration, or a permissions problem)
 * and must be surfaced as an error rather than silently retried forever.
 *
 * @summary Heartbeat payload construction and the main-file zero-consumption invariant
 * @module
 */

import type { SourceSpec } from '../manifest.js';
import type { FileSyncState } from './reconciler.js';

/** Per-file status entry included in the heartbeat payload. */
export interface FileStatus {
  relPath: string;
  role: SourceSpec['role'];
  sourceBytes: number;
  consumedBytes: number;
  lastSyncAt: number | null;
  failed?: string;
}

/** The `status` heartbeat event payload emitted each steady tick. */
export interface StatusHeartbeat {
  type: 'status';
  files: FileStatus[];
}

/**
 * Builds the heartbeat payload from the reconciler's current file states.
 *
 * @param states - Snapshot of tracked file states, e.g. from {@link Reconciler.getFileStates}.
 * @returns The `status` event payload.
 */
export function buildStatusHeartbeat(states: readonly FileSyncState[]): StatusHeartbeat {
  return {
    type: 'status',
    files: states.map((state) => ({
      relPath: state.relPath,
      role: state.role,
      sourceBytes: state.sourceBytes,
      consumedBytes: state.consumedBytes,
      lastSyncAt: state.lastSyncAt,
      ...(state.failed !== undefined ? { failed: state.failed } : {})
    }))
  };
}

/**
 * Detects a main file that has source bytes but has never consumed any of
 * them, for more than one consecutive steady tick, and reports it exactly
 * once.
 *
 * A single tick of zero consumption is not reported — it can be a transient
 * window right after the source file first appears — but two or more
 * consecutive steady ticks with source bytes present and zero bytes consumed
 * indicates the tailer is stuck, not merely lagging.
 */
export class MainFileInvariantChecker {
  private consecutiveZeroConsumptionTicks = 0;
  private reported = false;

  /**
   * Evaluates the current tick's main-file state.
   *
   * @param mainState - The tracked state for the manifest's `role: 'main'` file, if seen yet.
   * @returns An error message the first time the invariant is violated for two
   *   or more consecutive ticks, otherwise `null`.
   */
  check(mainState: FileSyncState | undefined): string | null {
    if (!mainState || mainState.sourceBytes === 0 || mainState.consumedBytes > 0) {
      this.consecutiveZeroConsumptionTicks = 0;
      return null;
    }

    this.consecutiveZeroConsumptionTicks += 1;

    if (this.consecutiveZeroConsumptionTicks > 1 && !this.reported) {
      this.reported = true;
      return `main file "${mainState.relPath}" has ${mainState.sourceBytes} bytes on disk but 0 bytes consumed after ${this.consecutiveZeroConsumptionTicks} consecutive steady ticks`;
    }

    return null;
  }
}
