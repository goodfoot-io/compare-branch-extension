/**
 * CwdChanged hook for ad-hoc session attribution.
 *
 * When a plain (non-action) Claude session `cd`s into a card-owned worktree,
 * this hook marks the card `active`, captures its transcript (reusing the
 * existing transcript-watcher), and arranges for it to return to `needs_review`
 * when the Claude agent PID dies. The action/wrapper path is left entirely
 * untouched — an action subprocess (identified by the `ACTION_NAME` env guard)
 * is a complete no-op.
 *
 * The PID is resolved and validated (findAgentPid + comm-check) before any
 * lock, spawn, or status write. A null or invalid PID is an immediate no-op:
 * a card is never marked active unless it can be monitored.
 *
 * A card is only (re)activated when it is in a working/pre-work state: a plain
 * session entering the worktree of a finished or review-exit card no-ops rather
 * than force-reactivating it.
 *
 * Both detached spawns (transcript-watcher and adhoc-cleanup) are gated behind
 * a single O_EXCL lock keyed on `input.session_id`, with stale-lock recovery
 * (dead lock-owner PID → unlink + retry once). The lock records the cardId the
 * session is bound to; a session is bound to the first card-worktree it enters
 * and is not re-targeted (the single per-session transcript-watcher cannot be
 * re-targeted without tearing itself down).
 *
 * @summary CwdChanged hook for ad-hoc session attribution
 * @module cwd-changed
 */

import type { FileHandle } from 'node:fs/promises';
import { mkdir, open, readFile, unlink } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { findAgentPid, resolveGlobalCardsConfigDir } from '@cards/sdk';
import {
  isAdhocActivatableStatus,
  isKnownAgentComm,
  isProcessAlive,
  readCardStatus
} from '@cards/sdk/bin/process-utils';
import { spawnAdhocCleanup } from '@cards/sdk/bin/spawn-adhoc-cleanup';
import { spawnTranscriptWatcher } from '@cards/sdk/bin/spawn-transcript-watcher';
import { cwdChangedHook, cwdChangedOutput } from '@goodfoot/claude-code-hooks';

/** Maximum number of parent directories to walk searching for `.cards/CARD_ID`. */
const MAX_WALK_LEVELS = 20;

/**
 * Minimal logger interface used by the helpers below.
 */
interface CwdLogger {
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
export async function resolveCardRepoPath(cardId: string, logger: CwdLogger): Promise<string | null> {
  const discoveryPath = process.env['CARDS_DISCOVERY_PATH'] ?? join(homedir(), '.cards', 'cards-api.json');
  let config: { reposPath?: unknown };
  try {
    config = JSON.parse(await readFile(discoveryPath, 'utf-8')) as { reposPath?: unknown };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      logger.warn('cwd-changed: failed to read discovery file', {
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
  logger: CwdLogger
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
    if (boundCardId && boundCardId !== cardId) {
      logger.warn('cwd-changed: session already bound to a different card — keeping original binding', {
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
      logger.warn('cwd-changed: failed to unlink stale lock', {
        lockPath,
        error: error instanceof Error ? error.message : String(error)
      });
      return false;
    }
  }

  return writeLock();
}

export default cwdChangedHook({}, async (input, { logger }) => {
  // 1. Walk up from new_cwd to find .cards/CARD_ID.
  const cardId = await resolveWorktreeCardId(input.new_cwd);
  if (!cardId) return cwdChangedOutput({});

  // 2. Derive cardRepoPath from the discovery file.
  const cardRepoPath = await resolveCardRepoPath(cardId, logger);
  if (!cardRepoPath) return cwdChangedOutput({});

  // 3. Action-subprocess guard — never fight the wrapper.
  if (process.env['ACTION_NAME']) return cwdChangedOutput({});

  // 4. Entry source-state guard — only (re)activate a card that is in a
  //    working/pre-work state. cd-ing a plain session into a finished or
  //    review-exit card's worktree must NOT force-reactivate it (which would
  //    then strand it in needs_review on teardown). This guard sits BEFORE lock
  //    acquisition so a rejected entry never orphans a lock and is symmetric
  //    with the guarded teardown. A null status (no CARD.meta.json) is treated
  //    as not-activatable — fail closed.
  const currentStatus = await readCardStatus(cardRepoPath);
  if (!isAdhocActivatableStatus(currentStatus ?? undefined)) {
    logger.warn('cwd-changed: card not in an activatable state — no-op', {
      cardId,
      status: currentStatus
    });
    return cwdChangedOutput({});
  }

  // 5. PID first — fail open on missing or wrong PID.
  const agentPid = findAgentPid();
  if (!agentPid) return cwdChangedOutput({});
  if (!isKnownAgentComm(agentPid, logger)) return cwdChangedOutput({});

  // 6. Atomic de-dupe lock (gates both spawns).
  //
  //    The lock is keyed on session_id and records the cardId this session is
  //    bound to. A session is bound to the FIRST card-worktree it enters and
  //    stays bound for the life of the session. This is intentional, not a
  //    limitation to work around: the transcript-watcher's watcherId IS the
  //    session_id, and the extension's WatcherRegistry enforces a takeover
  //    invariant — a single session can have only one live transcript-watcher.
  //    Re-targeting a second card would require tearing down and re-spawning
  //    that single watcher (churn + a transcript-sync gap) and is therefore
  //    precluded. A session that later cd's into a DIFFERENT card's worktree
  //    correctly no-ops here (its first card keeps the attribution); re-entering
  //    the SAME worktree also no-ops.
  const lockPath = join(resolveGlobalCardsConfigDir(), 'adhoc-sessions', `${input.session_id}.lock`);
  const acquired = await acquireLock(lockPath, agentPid, cardId, logger);
  if (!acquired) return cwdChangedOutput({});

  // 6. Spawn transcript-watcher (non-fatal).
  spawnTranscriptWatcher(agentPid, input.session_id, input.transcript_path, cardId, cardRepoPath, logger);

  // 7. Spawn adhoc-cleanup (non-fatal).
  spawnAdhocCleanup(agentPid, input.session_id, cardId, cardRepoPath, lockPath, logger);

  return cwdChangedOutput({});
});
