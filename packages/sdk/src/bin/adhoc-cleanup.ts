/**
 * Detached ad-hoc session cleanup process.
 *
 * Spawned by the EnterWorktree (PostToolUse) hook when a plain (non-action)
 * Claude session enters a card-owned worktree. Marks the card `active` via the API client,
 * writes a per-card reference file (recording the agent PID and its start-time
 * to defeat PID reuse), then polls the agent PID. On PID death it performs
 * ref-counted teardown — flipping the card to `needs_review` (API first,
 * filesystem fallback) only when no other live ad-hoc session remains AND no
 * live action wrapper is present (the wrapper owns the lifecycle of a card it
 * is operating on). When the flip is deferred to a live action wrapper this
 * session's (dead-PID) ref is RETAINED so the reconciliation sweep settles the
 * card once the action clears; the ref is removed only on the paths where the
 * card's status is actually resolved. The de-dupe lock is always released.
 *
 * Touches status only — no `git clean -fd` (that is the wrapper's job for
 * action-spawned sessions).
 *
 * @summary Detached ad-hoc session cleanup process
 * @module
 */

import { mkdir, unlink } from 'node:fs/promises';
import { createCardsClient } from '../client/api-discovery.js';
import type { CardUpdateData } from '../client/types/client.js';
import { adhocActiveDir, liveActionPresent, liveRefsRemain, removeRef, writeRef } from './adhoc-refs.js';
import { isProcessAliveWithStartTime, readProcessStartTime, transitionCardStatus } from './process-utils.js';

export { adhocActiveDir, liveRefsRemain } from './adhoc-refs.js';

/** Interval for periodic PID liveness checks (5 seconds). */
export const PID_POLL_INTERVAL_MS = 5_000;

/**
 * Arguments parsed from process.argv for the ad-hoc cleanup process.
 */
export interface AdhocCleanupArgs {
  /** PID of the Claude agent process to monitor. */
  agentPid: number;
  /** Session identifier (UUID) for this ad-hoc session. */
  sessionId: string;
  /** Card identifier (e.g. `main-96`). */
  cardId: string;
  /** Filesystem path to the card repository. */
  cardRepoPath: string;
  /** Filesystem path to the de-dupe lock file to remove on exit. */
  lockPath: string;
}

/**
 * Parses cleanup arguments from process.argv.
 *
 * Expects argv in the format:
 * `[node, script, agentPid, sessionId, cardId, cardRepoPath, lockPath]`
 *
 * @param argv - The process.argv array.
 * @returns Parsed cleanup arguments.
 */
export function parseArgs(argv: string[]): AdhocCleanupArgs {
  return {
    agentPid: Number(argv[2]),
    sessionId: argv[3]!,
    cardId: argv[4]!,
    cardRepoPath: argv[5]!,
    lockPath: argv[6]!
  };
}

/**
 * Minimal logger interface used by ad-hoc cleanup.
 */
export interface CleanupLogger {
  warn(message: string, data?: Record<string, unknown>): void;
}

/**
 * Minimal Cards client surface the teardown depends on — just the status
 * update. Declared as a structural interface so {@link performTeardown} can be
 * exercised against a real in-test implementation rather than the full client.
 */
export interface TeardownClient {
  updateCard(cardId: string, data: CardUpdateData): Promise<unknown>;
}

const consoleLogger: CleanupLogger = {
  warn(message, data) {
    process.stderr.write(`adhoc-cleanup: ${message}${data ? ` ${JSON.stringify(data)}` : ''}\n`);
  }
};

/**
 * Removes a file, ignoring ENOENT.
 *
 * @param path - Absolute path to remove.
 */
async function unlinkIfExists(path: string): Promise<void> {
  try {
    await unlink(path);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
  }
}

/**
 * Main entry point for the detached ad-hoc cleanup process.
 *
 * The agent PID's start-time is captured up front (and persisted in the ref
 * file) so the poll loop treats a recycled PID — same number, different
 * process — as dead rather than waiting forever on a stranger.
 *
 * @param logger - Logger for warn output (defaults to a stderr logger).
 */
export async function main(logger: CleanupLogger = consoleLogger): Promise<void> {
  const { agentPid, sessionId, cardId, cardRepoPath, lockPath } = parseArgs(process.argv);

  // Capture the monitored PID's start-time to defeat PID reuse.
  const startTime = readProcessStartTime(agentPid);

  const client = await createCardsClient();
  if (client === null) {
    // No server means no watchable card. Skip active write and teardown,
    // remove the lock, and exit.
    await unlinkIfExists(lockPath);
    return;
  }

  // 1. Mark active via API. (The hook's entry guard has already confirmed the
  //    card is in a working/pre-work state before spawning this process.)
  try {
    await client.updateCard(cardId, { status: 'active', author: 'system <system@cards.local>' });
  } catch (error) {
    // Transient API error — leave the lock in place so stale-recovery covers it.
    logger.warn('failed to mark card active — exiting without lock removal', {
      cardId,
      error: error instanceof Error ? error.message : String(error)
    });
    return;
  }

  // 2. Write the per-card reference file (records pid + start-time).
  await mkdir(adhocActiveDir(cardId), { recursive: true });
  await writeRef(cardId, sessionId, agentPid);

  // 3. Poll the PID until it dies (or is recycled to a different process).
  while (isProcessAliveWithStartTime(agentPid, startTime)) {
    await new Promise<void>((resolve) => setTimeout(resolve, PID_POLL_INTERVAL_MS));
  }

  // 4 + 5. Teardown (status resolution + lock release).
  await performTeardown(client, { sessionId, cardId, cardRepoPath, lockPath }, logger);
}

/**
 * Teardown invoked once the monitored agent PID is dead: resolve the card's
 * status and release the de-dupe lock.
 *
 * The de-dupe lock is keyed on this (now-dead) session, so it is always
 * released on exit — but this session's REF is only removed once the card's
 * status is actually resolved. Crucially the ref-removal decision happens AFTER
 * the deferral decision: if the flip is deferred because a live action owns the
 * card, this session's (dead-PID) ref is RETAINED so the reconciliation sweep
 * can settle the card later, once the action clears. Removing it here would
 * strand the card `active` with an empty ref dir that the sweep skips.
 *
 * @param client - Cards client used for the `needs_review` API write.
 * @param args - The session/card/lock identifiers for this teardown.
 * @param logger - Logger for warn output.
 */
export async function performTeardown(
  client: TeardownClient,
  args: Pick<AdhocCleanupArgs, 'sessionId' | 'cardId' | 'cardRepoPath' | 'lockPath'>,
  logger: CleanupLogger
): Promise<void> {
  const { sessionId, cardId, cardRepoPath, lockPath } = args;
  try {
    if (await liveRefsRemain(cardId, sessionId, logger)) {
      // Another live ad-hoc session already owns `active`. This session's ref
      // is no longer needed; remove it and leave status to the surviving ref.
      await removeRef(cardId, sessionId);
    } else if (await liveActionPresent(logger)) {
      // A live action wrapper owns this card's status lifecycle; a second
      // writer would race it (the wrapper writes no ad-hoc ref, so
      // liveRefsRemain cannot see it). Fail closed — defer the flip to the
      // wrapper and RETAIN this session's ref so the reconciliation sweep
      // settles the card once the action clears.
      logger.warn('live action detected at teardown — deferring status flip to the wrapper', { cardId });
    } else {
      // No other live ad-hoc session and no live action: this session resolves
      // the card. Flip to needs_review (API first, filesystem fallback), then
      // remove this session's ref.
      try {
        await client.updateCard(cardId, { status: 'needs_review', author: 'system <system@cards.local>' });
      } catch (error) {
        logger.warn('API needs_review failed — falling back to filesystem', {
          cardId,
          error: error instanceof Error ? error.message : String(error)
        });
        await transitionCardStatus(cardRepoPath, logger);
      }
      await removeRef(cardId, sessionId);
    }
  } finally {
    // Release the de-dupe lock. In a `finally` so a rethrow from
    // transitionCardStatus (API-down + commit-failure) does not leak it.
    await unlinkIfExists(lockPath);
  }
}

if (process.argv[1]?.endsWith('adhoc-cleanup.mjs') || process.argv[1]?.endsWith('adhoc-cleanup.ts')) {
  main().catch((error) => {
    process.stderr.write(`adhoc-cleanup: fatal error: ${String(error)}\n`);
    process.exitCode = 1;
  });
}
