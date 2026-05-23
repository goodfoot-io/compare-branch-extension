/**
 * Detached ad-hoc session cleanup process.
 *
 * Spawned by the CwdChanged hook when a plain (non-action) Claude session
 * enters a card-owned worktree. Marks the card `active` via the API client,
 * writes a per-card reference file (recording the agent PID and its start-time
 * to defeat PID reuse), then polls the agent PID. On PID death it performs
 * ref-counted teardown — flipping the card to `needs_review` (API first,
 * filesystem fallback) only when no other live ad-hoc session remains AND no
 * live action wrapper is present (the wrapper owns the lifecycle of a card it
 * is operating on) — and removes the de-dupe lock.
 *
 * Touches status only — no `git clean -fd` (that is the wrapper's job for
 * action-spawned sessions).
 *
 * @summary Detached ad-hoc session cleanup process
 * @module
 */

import { mkdir, unlink } from 'node:fs/promises';
import { createCardsClient } from '../client/api-discovery.js';
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

  // 4. Teardown.
  await removeRef(cardId, sessionId);

  if (!(await liveRefsRemain(cardId, sessionId, logger))) {
    // No other live ad-hoc session. Before flipping, check for a live action
    // wrapper: when one is present it owns this card's status lifecycle and a
    // second writer would race it (the wrapper writes no ad-hoc ref, so
    // liveRefsRemain cannot see it). Fail closed — leave status to the wrapper.
    if (await liveActionPresent(logger)) {
      logger.warn('live action detected at teardown — deferring status flip to the wrapper', { cardId });
    } else {
      // Flip to needs_review (API first, filesystem fallback).
      try {
        await client.updateCard(cardId, { status: 'needs_review', author: 'system <system@cards.local>' });
      } catch (error) {
        logger.warn('API needs_review failed — falling back to filesystem', {
          cardId,
          error: error instanceof Error ? error.message : String(error)
        });
        await transitionCardStatus(cardRepoPath, logger);
      }
    }
  }

  // 5. Remove the lock and exit.
  await unlinkIfExists(lockPath);
}

if (process.argv[1]?.endsWith('adhoc-cleanup.mjs') || process.argv[1]?.endsWith('adhoc-cleanup.ts')) {
  main().catch((error) => {
    process.stderr.write(`adhoc-cleanup: fatal error: ${String(error)}\n`);
    process.exitCode = 1;
  });
}
