/**
 * Tracks associations between Claude process IDs and cards on disk, buffering
 * pending commit SHAs until an association is established. The registry uses
 * atomic file writes, advisory file locking, and automatic stale-entry pruning
 * to remain correct under concurrent access.
 *
 * @summary PID-to-card session registry with commit buffering
 * @module claude-code-sessions
 */

import { homedir } from 'node:os';
import { join } from 'node:path';
import { executeTransaction, isProcessAlive, pruneStaleEntries } from './internal.js';

export { findAllClaudePids, findClaudePid, PROCESS_TREE_MAX_DEPTH } from './process-tree.js';

/** Minimal logger interface matching the methods used by this module. */
interface Logger {
  debug?(...args: unknown[]): void;
  warn?(...args: unknown[]): void;
  error?(...args: unknown[]): void;
}

function getCardsDir(): string {
  return join(homedir(), '.cards');
}

/**
 * Returns the canonical on-disk location for the session registry JSON file.
 *
 * @returns Absolute path to `~/.cards/claude-sessions.json`.
 */
export function getRegistryPath(): string {
  return join(getCardsDir(), 'claude-sessions.json');
}

/**
 * Returns the canonical on-disk location for the session lock file.
 *
 * @returns Absolute path to `~/.cards/claude-sessions.lock`.
 */
export function getLockPath(): string {
  return join(getCardsDir(), 'claude-sessions.lock');
}

export const LOCK_TIMEOUT_MS = 2000;
export const MAX_ENTRY_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

/** Session data stored per PID in the registry file. */
export interface ClaudeSessionEntry {
  cardId?: string;
  pendingCommits: string[];
  updatedAt: string;
}

/** JSON payload stored at `~/.cards/claude-sessions.json`. */
export interface ClaudeSessionRegistry {
  sessions: Record<string, ClaudeSessionEntry>;
}

/** Extended session entry that includes session ID and transcript path. */
export interface PidSessionEntry {
  sessionId: string;
  transcriptPath: string;
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
 * @param pid - Claude process ID to associate.
 * @param cardId - Card identifier to bind to the PID.
 * @param logger - Optional logger (kept for API compatibility).
 * @returns Pending SHAs captured before association, or `[]` on first-write conflict.
 */
export async function associatePidWithCard(pid: number, cardId: string, _logger?: Logger): Promise<string[]> {
  return executeTransaction<ClaudeSessionRegistry, string[]>(
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
    { sessions: {} } as ClaudeSessionRegistry,
    LOCK_TIMEOUT_MS
  );
}

/**
 * Appends SHA to `pendingCommits` for PID (deduplicating). Creates the entry
 * if it does not exist.
 *
 * @param pid - Claude process ID that produced the commit.
 * @param sha - Commit SHA to record for later attribution.
 * @param logger - Optional logger (kept for API compatibility).
 */
export async function recordPendingCommit(pid: number, sha: string, _logger?: Logger): Promise<void> {
  await executeTransaction<ClaudeSessionRegistry, void>(
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
    { sessions: {} } as ClaudeSessionRegistry,
    LOCK_TIMEOUT_MS
  );
}

/**
 * Returns `cardId` for PID if it exists, null otherwise.
 *
 * @param pid - Claude process ID to resolve.
 * @param logger - Optional logger (kept for API compatibility).
 * @returns Associated card ID, or `null` when unknown.
 */
export async function getPidCardId(pid: number, _logger?: Logger): Promise<string | null> {
  return executeTransaction<ClaudeSessionRegistry, string | null>(
    getRegistryPath(),
    getLockPath(),
    (registry) => {
      const pidStr = String(pid);
      return registry.sessions[pidStr]?.cardId ?? null;
    },
    (registry) => pruneStaleEntries(registry.sessions, isProcessAlive, MAX_ENTRY_AGE_MS),
    { sessions: {} } as ClaudeSessionRegistry,
    LOCK_TIMEOUT_MS
  );
}

/**
 * Removes and returns the PID's entry. Returns null if not found.
 *
 * @param pid - Claude process ID to remove.
 * @param logger - Optional logger (kept for API compatibility).
 * @returns Removed registry entry, or `null` when no entry existed.
 */
export async function removePidEntry(pid: number, _logger?: Logger): Promise<ClaudeSessionEntry | null> {
  return executeTransaction<ClaudeSessionRegistry, ClaudeSessionEntry | null>(
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
    { sessions: {} } as ClaudeSessionRegistry,
    LOCK_TIMEOUT_MS
  );
}
