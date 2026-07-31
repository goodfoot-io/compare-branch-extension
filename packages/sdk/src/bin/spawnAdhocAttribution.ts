/**
 * Shared helper that owns the full attribution-spawn path for ad-hoc sessions.
 *
 * Consolidates the activatable-status guard, O_EXCL de-dupe lock acquisition,
 * and both detached spawns (stream-sync-watcher + adhoc-cleanup) into a single
 * function called by `cards create` (first-bind) and the EnterWorktree hook
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

import { acquireLock } from '@cards.management/sdk/adhoc-attribution';
import { isAdhocActivatableStatus, readCardStatus } from '@cards.management/sdk/bin/process-utils';
import { spawnAdhocCleanup } from '@cards.management/sdk/bin/spawn-adhoc-cleanup';
import { spawnStreamSyncWatcher } from '@cards.management/sdk/bin/spawn-stream-sync-watcher';
import { buildManifestForRuntime } from '../transcript-sync/adapters/index.js';

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
  /**
   * Open runtime identifier for this session, e.g. `'claude-code'` or
   * `'codex'` — selects the {@link SessionSyncManifest} adapter used to build
   * the manifest for the stream-sync-watcher spawn. Unlike the Claude/Codex
   * SessionStart hooks (which know their own runtime statically), this
   * helper serves both ad-hoc attach call sites through one code path and so
   * must be told; an unrecognized value fails the watcher spawn closed (see
   * {@link buildManifestForRuntime}) without touching adhoc-cleanup below.
   */
  runtime: string;
}

/**
 * Structured result of {@link spawnAdhocAttribution}.
 *
 * `activated: true` means the per-card adhoc-cleanup spawn was attempted — the
 * card's activation and ref registration are underway regardless of whether
 * this bind also owns the session's stream-sync-watcher. `activated: false`
 * means activation was skipped, with `reason` identifying the guard:
 *
 * - `'not-activatable'` — the card's status is not in the activatable set (or
 *   `CARD.meta.json` is missing).
 *
 * A held session de-dupe lock is deliberately NOT a skip: the lock gates only
 * the stream-sync-watcher spawn, so a second card bound in the same session
 * still activates.
 */
export type SpawnAdhocAttributionOutcome = { activated: true } | { activated: false; reason: 'not-activatable' };

/**
 * Runs the full attribution-spawn path: activatable-status guard, de-dupe lock
 * acquisition, stream-sync-watcher spawn, and adhoc-cleanup spawn.
 *
 * 1. **Activatable-status guard** — reads the card's current status from
 *    `CARD.meta.json`. If the status is not in `['todo', 'active',
 *    'needs_review']` (or the file is absent), logs a warning and returns
 *    without spawning anything. This prevents force-reactivating a card that is
 *    in a terminal or review-exit state.
 *
 * 2. **De-dupe lock** — acquires an O_EXCL lock at `lockPath` recording
 *    `agentPid` (the agent PID, never the node process PID). The lock guards
 *    ONLY the session-scoped stream-sync-watcher spawn (one live watcher per
 *    session). If the lock is already held by a live process, the watcher
 *    spawn is skipped but the per-card adhoc-cleanup spawn still happens. On a
 *    stale lock from a crashed hook, the lock is unlinked and re-acquired.
 *
 * 3. **Spawn stream-sync-watcher** (non-fatal, lock-gated) — builds a
 *    {@link SessionSyncManifest} for `params.runtime` and spawns the detached
 *    `stream-sync-watcher` bin only when this bind acquired the session lock.
 *    Manifest-build failure (unsupported runtime, transcriptPath/sessionId
 *    mismatch) and spawn failure are both logged and do not propagate.
 *
 * 4. **Spawn adhoc-cleanup** (non-fatal, per-card) — spawns the detached
 *    `adhoc-cleanup` bin for every bound card, so each card's status
 *    activation and ref registration happens even when the session lock is
 *    held by an earlier bind. The lock path is forwarded only when this bind
 *    owns the lock; non-owner cleanups receive an empty lock path so they
 *    never release a lock another card's cleanup owns. Spawn failure is
 *    logged and does not propagate.
 *
 * @param params - All parameters needed for the spawn path.
 * @param logger - Structured logger for warn and error output.
 * @returns Structured outcome: `{ activated: true }` when the spawns were
 *   attempted, or `{ activated: false, reason }` when a guard skipped
 *   activation — so callers (e.g. `cards <id> bind`) can fail closed instead of
 *   reporting success on a silently skipped activation.
 */
export async function spawnAdhocAttribution(
  params: SpawnAdhocAttributionParams,
  logger: SpawnAdhocAttributionLogger
): Promise<SpawnAdhocAttributionOutcome> {
  const { agentPid, sessionId, transcriptPath, cardId, cardRepoPath, lockPath, runtime } = params;

  // 1. Activatable-status guard — fail closed on null status (missing meta).
  const currentStatus = await readCardStatus(cardRepoPath);
  if (!isAdhocActivatableStatus(currentStatus ?? undefined)) {
    logger.warn('spawnAdhocAttribution: card not in an activatable state — no-op', {
      cardId,
      status: currentStatus
    });
    return { activated: false, reason: 'not-activatable' };
  }

  // 2. O_EXCL de-dupe lock. Records the AGENT PID (passed in by the caller),
  //    never the node process PID. Returns false if the session is already
  //    tracked; a stale lock from a crashed hook is unlinked and retried once.
  //    The lock gates only the session-scoped stream-sync-watcher below — the
  //    per-card adhoc-cleanup spawn must happen regardless, otherwise a second
  //    card bound in the same session is never activated.
  const acquired = await acquireLock(lockPath, agentPid, cardId, logger);

  if (acquired) {
    // 3. Spawn stream-sync-watcher (non-fatal, one per session). Attach mode
    //    runs with the `cards` plugin enabled so its bin — and the
    //    `stream-sync-watcher` wrapper — is on PATH; omitting extensionPath
    //    resolves the platform-correct bare name (`.cmd` on win32) there.
    //    Manifest construction is fail-closed: an unsupported runtime or a
    //    transcriptPath/sessionId mismatch is logged and the watcher spawn is
    //    skipped, without touching the adhoc-cleanup spawn below (per-card
    //    activation is decoupled from the watcher's session lock).
    try {
      const manifest = buildManifestForRuntime(runtime, {
        sessionId,
        cardId,
        transcriptPath,
        monitorPid: agentPid,
        cardRepoPath
      });
      spawnStreamSyncWatcher({ manifest, logger });
    } catch (error) {
      logger.error('spawnAdhocAttribution: failed to build sync manifest — skipping watcher spawn', {
        runtime,
        cardId,
        sessionId,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  // 4. Spawn adhoc-cleanup (non-fatal, one per bound card). Only the
  //    lock-owning bind forwards the lock path; non-owners pass an empty path
  //    so their teardown never unlinks a lock owned by an earlier card's
  //    cleanup (which would break the watcher de-dupe invariant).
  //
  //    win32 `.mjs` resolution needs the extension's `dist/bin`. Attach mode
  //    runs with the cards bin on PATH, so the extension injects CARDS_BIN_PATH
  //    (`<extensionPath>/dist/bin`) into the action env; the empty-string
  //    fallback lets resolveWin32AdhocMjs use the on-PATH `where` lookup.
  const binPath = (process.env['CARDS_BIN_PATH'] ?? '').trim();
  spawnAdhocCleanup(binPath, agentPid, sessionId, cardId, cardRepoPath, acquired ? lockPath : '', logger);

  return { activated: true };
}
