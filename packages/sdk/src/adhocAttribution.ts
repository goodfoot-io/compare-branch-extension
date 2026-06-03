/**
 * Shared helpers for ad-hoc session attribution.
 *
 * These primitives are used by both the EnterWorktree hook and the `card
 * create` CLI to resolve a card's repository path, locate the card ID from
 * a worktree directory, and acquire an O_EXCL de-dupe lock for the session.
 *
 * @summary Shared helpers for ad-hoc session attribution
 * @module adhocAttribution
 */

import type { FileHandle } from 'node:fs/promises';
import { mkdir, open, readFile, unlink } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { isProcessAlive } from '@cards/sdk/bin/process-utils';

/** Maximum number of parent directories to walk searching for `.cards/CARD_ID`. */
export const MAX_WALK_LEVELS = 20;

/**
 * Minimal logger interface used by the helpers below.
 */
export interface AdhocAttributionLogger {
  warn(message: string, data?: Record<string, unknown>): void;
}

/**
 * Walks upward from `cwd` toward `/`, up to {@link MAX_WALK_LEVELS} levels,
 * looking for a `.cards/CARD_ID` file. Returns the trimmed card ID from the
 * first hit, or `null` when none is found.
 *
 * @param cwd - Directory to start the walk from.
 * @returns The card ID, or null when the cwd is not inside a card worktree.
 */
export async function resolveWorktreeCardId(cwd: string): Promise<string | null> {
  let dir = cwd;
  for (let level = 0; level < MAX_WALK_LEVELS; level++) {
    const cardIdPath = join(dir, '.cards', 'CARD_ID');
    try {
      const cardId = (await readFile(cardIdPath, 'utf-8')).trim();
      if (cardId) return cardId;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }

    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

/**
 * Resolves the card repository path from the API discovery file.
 *
 * Reads `~/.cards/cards-api.json`, extracts `reposPath`, and returns
 * `join(reposPath, cardId)`. Returns `null` when the discovery file is absent,
 * malformed, or missing `reposPath` — in which case there is no server to
 * notify and the hook no-ops.
 *
 * @param cardId - Card identifier.
 * @param logger - Logger for warn output on read failure.
 * @returns The card repository path, or null when unresolvable.
 */
export async function resolveCardRepoPath(cardId: string, logger: AdhocAttributionLogger): Promise<string | null> {
  const discoveryPath = process.env['CARDS_DISCOVERY_PATH'] ?? join(homedir(), '.cards', 'cards-api.json');
  let config: { reposPath?: unknown };
  try {
    config = JSON.parse(await readFile(discoveryPath, 'utf-8')) as { reposPath?: unknown };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      logger.warn('enter-worktree: failed to read discovery file', {
        discoveryPath,
        error: error instanceof Error ? error.message : String(error)
      });
    }
    return null;
  }

  if (typeof config.reposPath !== 'string' || config.reposPath.length === 0) {
    return null;
  }

  return join(config.reposPath, cardId);
}

/**
 * Acquires an O_EXCL de-dupe lock at `lockPath`, recording `agentPid` and the
 * `cardId` this session is bound to.
 *
 * On EEXIST, reads the existing lock and parses its owner PID and bound cardId.
 * If that PID is alive, the session is already tracked → returns false (no-op).
 * When the live lock is bound to a DIFFERENT card (the session moved to another
 * worktree), this is logged explicitly: the session stays bound to its first
 * card because the single per-session transcript-watcher cannot be re-targeted
 * without tearing itself down. If the PID is dead (stale lock from a crashed
 * hook), unlinks the lock and retries O_EXCL once.
 *
 * @param lockPath - Absolute path to the lock file.
 * @param agentPid - Agent PID to record in the lock.
 * @param cardId - Card id this session is being bound to.
 * @param logger - Logger for warn output.
 * @returns True when the lock was acquired, false when this session is already tracked.
 */
export async function acquireLock(
  lockPath: string,
  agentPid: number,
  cardId: string,
  logger: AdhocAttributionLogger
): Promise<boolean> {
  await mkdir(dirname(lockPath), { recursive: true });

  const writeLock = async (): Promise<boolean> => {
    let handle: FileHandle;
    try {
      handle = await open(lockPath, 'wx');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'EEXIST') {
        return false;
      }
      throw error;
    }
    try {
      await handle.writeFile(`${agentPid}\n${cardId}`);
    } finally {
      await handle.close();
    }
    return true;
  };

  if (await writeLock()) {
    return true;
  }

  // Lock exists — inspect the owner PID and the card it is bound to.
  let ownerLines: string[];
  try {
    ownerLines = (await readFile(lockPath, 'utf-8')).split('\n');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      // Lock vanished between EEXIST and read — retry once.
      return writeLock();
    }
    throw error;
  }

  const ownerPid = Number(ownerLines[0]?.trim());
  const boundCardId = ownerLines[1]?.trim();

  if (Number.isFinite(ownerPid) && isProcessAlive(ownerPid)) {
    // Already tracked by this live session. Re-entering the same worktree is a
    // clean no-op; moving to a different worktree keeps the original binding.
    //
    // KNOWN LIMITATION (intentional): a single ad-hoc session attributes only
    // the FIRST card-worktree it enters. The transcript-watcher's watcherId is
    // the session id, and the WatcherRegistry takeover invariant permits only
    // one live watcher per session — re-targeting a second card would tear down
    // the first watcher (churn + a transcript-sync gap), which the card's "reuse
    // the transcript-watcher as-is" constraint forbids. Consequence: work done
    // after entering a second card's worktree within the same session streams
    // its transcript into the FIRST card. The warning below surfaces this so a
    // contributor switching worktrees mid-session is not surprised by it.
    if (boundCardId && boundCardId !== cardId) {
      logger.warn('enter-worktree: session already bound to a different card — keeping original binding', {
        boundCardId,
        attemptedCardId: cardId,
        ownerPid
      });
    }
    return false;
  }

  // Stale lock from a crashed hook — unlink and retry once.
  try {
    await unlink(lockPath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      logger.warn('enter-worktree: failed to unlink stale lock', {
        lockPath,
        error: error instanceof Error ? error.message : String(error)
      });
      return false;
    }
  }

  return writeLock();
}
