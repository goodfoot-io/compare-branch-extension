/**
 * Tracks associations between agent process IDs and cards on disk, buffering
 * pending commit SHAs until an association is established. The registry uses
 * atomic file writes, advisory file locking, and automatic stale-entry pruning
 * to remain correct under concurrent access.
 *
 * @summary PID-to-card session registry with commit buffering
 * @module sessions
 */

import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { executeTransaction, hasErrnoCode, isProcessAlive, pruneStaleEntries } from './internal.js';

export { findAgentPid, findAllAgentPids, PROCESS_TREE_MAX_DEPTH } from './process-tree.js';

function getCardsDir(): string {
  return join(homedir(), '.cards');
}

/**
 * Returns the canonical on-disk location for the session registry JSON file.
 *
 * @returns Absolute path to `~/.cards/sessions.json`.
 */
export function getRegistryPath(): string {
  return join(getCardsDir(), 'sessions.json');
}

/**
 * Returns the canonical on-disk location for the session lock file.
 *
 * @returns Absolute path to `~/.cards/sessions.lock`.
 */
export function getLockPath(): string {
  return join(getCardsDir(), 'sessions.lock');
}

export const LOCK_TIMEOUT_MS = 2000;
export const MAX_ENTRY_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

/** Session data stored per PID in the registry file. */
export interface SessionEntry {
  cardId?: string;
  pendingCommits: string[];
  updatedAt: string;
}

/** JSON payload stored at `~/.cards/sessions.json`. */
export interface SessionRegistry {
  sessions: Record<string, SessionEntry>;
}

/** Extended session entry that includes session ID. */
export interface PidSessionEntry {
  sessionId: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Associates PID with card. If the entry already has a `cardId`, returns `[]`
 * (first-write-wins). Otherwise sets `cardId`, extracts and clears
 * `pendingCommits`, and returns the extracted commits.
 *
 * @param pid - Agent process ID to associate.
 * @param cardId - Card identifier to bind to the PID.
 * @returns Pending SHAs captured before association, or `[]` on first-write conflict.
 */
export async function associatePidWithCard(pid: number, cardId: string): Promise<string[]> {
  return executeTransaction<SessionRegistry, string[]>(
    getRegistryPath(),
    getLockPath(),
    (registry) => {
      const pidStr = String(pid);
      const entry = registry.sessions[pidStr];

      if (entry?.cardId) return [];

      const pendingCommits = entry?.pendingCommits ?? [];

      registry.sessions[pidStr] = {
        cardId,
        pendingCommits: [],
        updatedAt: new Date().toISOString()
      };

      return pendingCommits;
    },
    (registry) => pruneStaleEntries(registry.sessions, isProcessAlive, MAX_ENTRY_AGE_MS),
    { sessions: {} } as SessionRegistry,
    LOCK_TIMEOUT_MS
  );
}

/**
 * Appends SHA to `pendingCommits` for PID (deduplicating). Creates the entry
 * if it does not exist.
 *
 * @param pid - Agent process ID that produced the commit.
 * @param sha - Commit SHA to record for later attribution.
 */
export async function recordPendingCommit(pid: number, sha: string): Promise<void> {
  await executeTransaction<SessionRegistry, void>(
    getRegistryPath(),
    getLockPath(),
    (registry) => {
      const pidStr = String(pid);
      const entry = registry.sessions[pidStr] ?? {
        pendingCommits: [],
        updatedAt: new Date().toISOString()
      };

      if (!entry.pendingCommits.includes(sha)) {
        entry.pendingCommits.push(sha);
      }

      entry.updatedAt = new Date().toISOString();
      registry.sessions[pidStr] = entry;
    },
    (registry) => pruneStaleEntries(registry.sessions, isProcessAlive, MAX_ENTRY_AGE_MS),
    { sessions: {} } as SessionRegistry,
    LOCK_TIMEOUT_MS
  );
}

/**
 * Returns `cardId` for PID if it exists, null otherwise.
 *
 * @param pid - Agent process ID to resolve.
 * @returns Associated card ID, or `null` when unknown.
 */
export async function getPidCardId(pid: number): Promise<string | null> {
  return executeTransaction<SessionRegistry, string | null>(
    getRegistryPath(),
    getLockPath(),
    (registry) => {
      const pidStr = String(pid);
      return registry.sessions[pidStr]?.cardId ?? null;
    },
    (registry) => pruneStaleEntries(registry.sessions, isProcessAlive, MAX_ENTRY_AGE_MS),
    { sessions: {} } as SessionRegistry,
    LOCK_TIMEOUT_MS
  );
}

/**
 * Removes and returns the PID's entry. Returns null if not found.
 *
 * @param pid - Agent process ID to remove.
 * @returns Removed registry entry, or `null` when no entry existed.
 */
export async function removePidEntry(pid: number): Promise<SessionEntry | null> {
  return executeTransaction<SessionRegistry, SessionEntry | null>(
    getRegistryPath(),
    getLockPath(),
    (registry) => {
      const pidStr = String(pid);
      const entry = registry.sessions[pidStr];

      if (entry) {
        delete registry.sessions[pidStr];
        return entry;
      }

      return null;
    },
    (registry) => pruneStaleEntries(registry.sessions, isProcessAlive, MAX_ENTRY_AGE_MS),
    { sessions: {} } as SessionRegistry,
    LOCK_TIMEOUT_MS
  );
}

// ---------------------------------------------------------------------------
// Card-repo PID registry (pids.json)
// ---------------------------------------------------------------------------

/** JSON payload stored at `~/.cards/card-repo-commits/pids.json`. */
interface CardRepoPidRegistry {
  sessions: Record<string, PidSessionEntry>;
}

function getCardRepoPidsRegistryPath(): string {
  return join(getCardsDir(), 'card-repo-commits', 'pids.json');
}

function getCardRepoPidsLockPath(): string {
  return join(getCardsDir(), 'card-repo-commits', 'pids.lock');
}

/**
 * Registers a session for an agent process ID in the card-repo PID registry.
 *
 * @param pid - Agent process ID to register.
 * @param sessionId - Session identifier to associate with the PID.
 */
export async function registerSession(pid: number, sessionId: string): Promise<void> {
  await executeTransaction<CardRepoPidRegistry, void>(
    getCardRepoPidsRegistryPath(),
    getCardRepoPidsLockPath(),
    (registry) => {
      registry.sessions[String(pid)] = {
        sessionId,
        updatedAt: new Date().toISOString()
      };
    },
    undefined,
    { sessions: {} } as CardRepoPidRegistry,
    LOCK_TIMEOUT_MS
  );
}

/**
 * Removes a PID entry from the card-repo PID registry.
 *
 * @param pid - Agent process ID to remove.
 */
export async function removeSessionPid(pid: number): Promise<void> {
  await executeTransaction<CardRepoPidRegistry, void>(
    getCardRepoPidsRegistryPath(),
    getCardRepoPidsLockPath(),
    (registry) => {
      delete registry.sessions[String(pid)];
    },
    undefined,
    { sessions: {} } as CardRepoPidRegistry,
    LOCK_TIMEOUT_MS
  );
}

/**
 * Returns the session ID for an agent process ID.
 *
 * @param pid - Agent process ID to look up.
 * @returns Session ID, or `null` when the entry is absent.
 */
export async function getSessionIdForPid(pid: number): Promise<string | null> {
  const registryPath = getCardRepoPidsRegistryPath();
  try {
    const content = await readFile(registryPath, 'utf-8');
    const registry = JSON.parse(content) as CardRepoPidRegistry;
    return registry.sessions[String(pid)]?.sessionId ?? null;
  } catch (error) {
    if (hasErrnoCode(error, 'ENOENT')) return null;
    throw error;
  }
}
