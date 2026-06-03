/**
 * Shared helper that owns the full attribution-spawn path for ad-hoc sessions.
 *
 * Consolidates the activatable-status guard, O_EXCL de-dupe lock acquisition,
 * and both detached spawns (transcript-watcher + adhoc-cleanup) into a single
 * function called by `card create` (first-bind) and the EnterWorktree hook
 * (re-attach). Keeping both call sites on the same code path prevents the
 * guards from drifting apart.
 *
 * The caller is responsible for resolving and validating the agent PID before
 * calling this function; the two call sites (CLI and hook) derive it
 * differently. This helper trusts the passed-in `agentPid`.
 *
 * @summary Shared helper for the attribution-spawn guard+lock+spawn path
 * @module spawnAdhocAttribution
 */

import { acquireLock } from '@cards/sdk/adhoc-attribution';
import { isAdhocActivatableStatus, readCardStatus } from '@cards/sdk/bin/process-utils';
import { spawnAdhocCleanup } from '@cards/sdk/bin/spawn-adhoc-cleanup';
import { spawnTranscriptWatcher, transcriptWatcherWrapperName } from '@cards/sdk/bin/spawn-transcript-watcher';

/**
 * Minimal logger interface required by spawnAdhocAttribution.
 *
 * Accepts any logger that exposes `warn` and `error` methods taking a message
 * string plus an optional structured-data argument.
 */
export interface SpawnAdhocAttributionLogger {
  warn(message: string, data?: Record<string, unknown>): void;
  error(message: string, data?: Record<string, unknown>): void;
}

/**
 * Parameters for the attribution-spawn path.
 */
export interface SpawnAdhocAttributionParams {
  /** Claude agent process ID to monitor. Already validated by the caller. */
  agentPid: number;
  /** Session identifier (UUID) for this ad-hoc session. */
  sessionId: string;
  /** Path to the transcript file to watch. */
  transcriptPath: string;
  /** Card identifier for the status target. */
  cardId: string;
  /** Absolute path to the card's git repository. */
  cardRepoPath: string;
  /** Absolute path to the O_EXCL de-dupe lock file. */
  lockPath: string;
}

/**
 * Runs the full attribution-spawn path: activatable-status guard, de-dupe lock
 * acquisition, transcript-watcher spawn, and adhoc-cleanup spawn.
 *
 * 1. **Activatable-status guard** — reads the card's current status from
 *    `CARD.meta.json`. If the status is not in `['todo', 'active',
 *    'needs_review']` (or the file is absent), logs a warning and returns
 *    without spawning anything. This prevents force-reactivating a card that is
 *    in a terminal or review-exit state.
 *
 * 2. **De-dupe lock** — acquires an O_EXCL lock at `lockPath` recording
 *    `agentPid` (the agent PID, never the node process PID). If the lock is
 *    already held by a live process, returns without spawning (the session is
 *    already tracked). On a stale lock from a crashed hook, the lock is
 *    unlinked and re-acquired.
 *
 * 3. **Spawn transcript-watcher** (non-fatal) — spawns the detached
 *    `transcript-watcher` bin. Spawn failure is logged and does not propagate.
 *
 * 4. **Spawn adhoc-cleanup** (non-fatal) — spawns the detached `adhoc-cleanup`
 *    bin. Spawn failure is logged and does not propagate.
 *
 * @param params - All parameters needed for the spawn path.
 * @param logger - Structured logger for warn and error output.
 */
export async function spawnAdhocAttribution(
  params: SpawnAdhocAttributionParams,
  logger: SpawnAdhocAttributionLogger
): Promise<void> {
  const { agentPid, sessionId, transcriptPath, cardId, cardRepoPath, lockPath } = params;

  // 1. Activatable-status guard — fail closed on null status (missing meta).
  const currentStatus = await readCardStatus(cardRepoPath);
  if (!isAdhocActivatableStatus(currentStatus ?? undefined)) {
    logger.warn('spawnAdhocAttribution: card not in an activatable state — no-op', {
      cardId,
      status: currentStatus
    });
    return;
  }

  // 2. O_EXCL de-dupe lock. Records the AGENT PID (passed in by the caller),
  //    never the node process PID. Returns false if the session is already
  //    tracked; a stale lock from a crashed hook is unlinked and retried once.
  const acquired = await acquireLock(lockPath, agentPid, cardId, logger);
  if (!acquired) return;

  // 3. Spawn transcript-watcher (non-fatal). Attach mode runs with the `cards`
  //    plugin enabled so its bin — and the `transcript-watcher` wrapper — is on
  //    PATH; the platform-correct bare name (`.cmd` on win32) resolves there.
  spawnTranscriptWatcher(
    transcriptWatcherWrapperName(),
    agentPid,
    sessionId,
    transcriptPath,
    cardId,
    cardRepoPath,
    logger
  );

  // 4. Spawn adhoc-cleanup (non-fatal).
  spawnAdhocCleanup(agentPid, sessionId, cardId, cardRepoPath, lockPath, logger);
}
