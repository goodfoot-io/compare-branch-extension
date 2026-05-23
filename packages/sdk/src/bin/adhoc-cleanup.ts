/**
 * Detached ad-hoc session cleanup process.
 *
 * Spawned by the CwdChanged hook when a plain (non-action) Claude session
 * enters a card-owned worktree. Marks the card `active` via the API client,
 * writes a per-card reference file, then polls the agent PID. On PID death it
 * performs ref-counted teardown — flipping the card to `needs_review` (API
 * first, filesystem fallback) only when no other live ad-hoc session remains
 * for the card — and removes the de-dupe lock.
 *
 * Touches status only — no `git clean -fd` (that is the wrapper's job for
 * action-spawned sessions).
 *
 * @summary Detached ad-hoc session cleanup process
 * @module
 */

import { mkdir, readdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { resolveGlobalCardsConfigDir } from '../cards-config.js';
import { createCardsClient } from '../client/api-discovery.js';
import { isProcessAlive, transitionCardStatus } from './process-utils.js';

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
 * Returns the per-card reference directory path under `~/.cards/adhoc-active/`.
 *
 * This namespace is distinct from `adhoc-sessions/` (which holds the per-session
 * de-dupe lock files); the separation makes the two purposes explicit.
 *
 * @param cardId - Card identifier.
 * @returns Absolute path to the per-card reference directory.
 */
export function adhocActiveDir(cardId: string): string {
  return join(resolveGlobalCardsConfigDir(), 'adhoc-active', cardId);
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
 * Removes a reference file, ignoring ENOENT.
 *
 * @param refPath - Absolute path to the reference file.
 */
async function unlinkIfExists(refPath: string): Promise<void> {
  try {
    await unlink(refPath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
  }
}

/**
 * Scans the per-card reference directory and determines whether any other live
 * ad-hoc session remains. Removes stale ref files whose recorded PID is dead.
 *
 * @param cardId - Card identifier.
 * @param sessionId - The dying session's id (its ref is excluded from the scan).
 * @param logger - Logger for warn output.
 * @returns True when at least one other ref with a live PID remains.
 */
export async function liveRefsRemain(cardId: string, sessionId: string, logger: CleanupLogger): Promise<boolean> {
  const dir = adhocActiveDir(cardId);

  let entries: string[];
  try {
    entries = await readdir(dir);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return false;
    }
    throw error;
  }

  let anyLive = false;
  for (const entry of entries) {
    if (!entry.endsWith('.ref')) continue;
    if (entry === `${sessionId}.ref`) continue;

    const refPath = join(dir, entry);
    let pid: number;
    try {
      pid = Number((await readFile(refPath, 'utf-8')).trim());
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') continue;
      logger.warn('failed to read ref file', { refPath, error: String(error) });
      continue;
    }

    if (Number.isFinite(pid) && isProcessAlive(pid)) {
      anyLive = true;
    } else {
      // Stale ref from a crashed cleanup — unlink it.
      await unlinkIfExists(refPath);
    }
  }

  return anyLive;
}

/**
 * Main entry point for the detached ad-hoc cleanup process.
 *
 * @param logger - Logger for warn output (defaults to a stderr logger).
 */
export async function main(logger: CleanupLogger = consoleLogger): Promise<void> {
  const { agentPid, sessionId, cardId, cardRepoPath, lockPath } = parseArgs(process.argv);

  const client = await createCardsClient();
  if (client === null) {
    // No server means no watchable card. Skip active write and teardown,
    // remove the lock, and exit.
    await unlinkIfExists(lockPath);
    return;
  }

  // 1. Mark active via API.
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

  // 2. Write the per-card reference file.
  const dir = adhocActiveDir(cardId);
  const refPath = join(dir, `${sessionId}.ref`);
  await mkdir(dir, { recursive: true });
  await writeFile(refPath, String(agentPid), 'utf-8');

  // 3. Poll the PID until it dies.
  while (isProcessAlive(agentPid)) {
    await new Promise<void>((resolve) => setTimeout(resolve, PID_POLL_INTERVAL_MS));
  }

  // 4. Teardown.
  await unlinkIfExists(refPath);

  if (!(await liveRefsRemain(cardId, sessionId, logger))) {
    // No other live ad-hoc session — flip to needs_review (API first).
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

  // 5. Remove the lock and exit.
  await unlinkIfExists(lockPath);
}

if (process.argv[1]?.endsWith('adhoc-cleanup.mjs') || process.argv[1]?.endsWith('adhoc-cleanup.ts')) {
  main().catch((error) => {
    process.stderr.write(`adhoc-cleanup: fatal error: ${String(error)}\n`);
    process.exitCode = 1;
  });
}
