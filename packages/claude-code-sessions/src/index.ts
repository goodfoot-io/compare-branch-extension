/**
 * Tracks associations between Claude process IDs and cards on disk, buffering
 * pending commit SHAs until an association is established. The registry uses
 * atomic file writes, advisory file locking, and automatic stale-entry pruning
 * to remain correct under concurrent access.
 *
 * @summary PID-to-card session registry with commit buffering
 * @module claude-code-sessions
 */

import { existsSync, mkdirSync, readFileSync, watch, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { executeTransaction, hasErrnoCode, isProcessAlive, pruneStaleEntries } from './internal.js';

export { findAllClaudePids, findClaudePid, PROCESS_TREE_MAX_DEPTH } from './process-tree.js';

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
 * @returns Pending SHAs captured before association, or `[]` on first-write conflict.
 */
export async function associatePidWithCard(pid: number, cardId: string): Promise<string[]> {
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
 */
export async function recordPendingCommit(pid: number, sha: string): Promise<void> {
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
 * @returns Associated card ID, or `null` when unknown.
 */
export async function getPidCardId(pid: number): Promise<string | null> {
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
 * @returns Removed registry entry, or `null` when no entry existed.
 */
export async function removePidEntry(pid: number): Promise<ClaudeSessionEntry | null> {
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
 * Registers a session for a Claude process ID in the card-repo PID registry.
 *
 * @param pid - Claude process ID to register.
 * @param sessionId - Session identifier to associate with the PID.
 * @param transcriptPath - Path to the transcript file for this session.
 */
export async function registerSession(pid: number, sessionId: string, transcriptPath: string): Promise<void> {
  await executeTransaction<CardRepoPidRegistry, void>(
    getCardRepoPidsRegistryPath(),
    getCardRepoPidsLockPath(),
    (registry) => {
      registry.sessions[String(pid)] = {
        sessionId,
        transcriptPath,
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
 * @param pid - Claude process ID to remove.
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

function readRegistryEntry(registryPath: string, pid: number): PidSessionEntry | null {
  try {
    const content = readFileSync(registryPath, 'utf-8');
    const registry = JSON.parse(content) as CardRepoPidRegistry;
    return registry.sessions[String(pid)] ?? null;
  } catch (error) {
    if (hasErrnoCode(error, 'ENOENT')) return null;
    throw error;
  }
}

async function waitForPidEntry<T>(
  pid: number,
  timeout: number | undefined,
  extract: (entry: PidSessionEntry) => T
): Promise<T | null> {
  const registryPath = getCardRepoPidsRegistryPath();

  // 1. Immediate read
  const immediate = readRegistryEntry(registryPath, pid);
  if (immediate) return extract(immediate);

  // 2. No timeout → return null
  if (timeout === undefined || timeout <= 0) return null;

  // 3. Watch for changes
  const dir = dirname(registryPath);
  mkdirSync(dir, { recursive: true });
  // Touch file if absent so fs.watch has something to watch
  if (!existsSync(registryPath)) {
    writeFileSync(registryPath, JSON.stringify({ sessions: {} }, null, 2), { mode: 0o600 });
  }

  return new Promise<T | null>((resolve) => {
    let resolved = false;
    const cleanup = () => {
      if (!resolved) {
        resolved = true;
        watcher.close();
        clearTimeout(timer);
      }
    };

    const watcher = watch(registryPath, () => {
      try {
        const entry = readRegistryEntry(registryPath, pid);
        if (entry) {
          cleanup();
          resolve(extract(entry));
        }
      } catch {
        // readRegistryEntry only throws on non-ENOENT errors (corrupt JSON, permission denied).
        // In the watch callback context, we cannot propagate — clean up and resolve null.
        cleanup();
        resolve(null);
      }
    });

    const timer = setTimeout(() => {
      cleanup();
      resolve(null);
    }, timeout);

    // Handle watcher errors gracefully
    watcher.on('error', () => {
      cleanup();
      resolve(null);
    });
  });
}

/**
 * Returns the session ID for a Claude process ID, optionally waiting for it
 * to appear in the registry.
 *
 * @param pid - Claude process ID to look up.
 * @param timeout - Maximum time to wait in milliseconds. If omitted, returns immediately.
 * @returns Session ID, or `null` when the entry is absent (or timeout expires).
 */
export async function getSessionIdForPid(pid: number, timeout?: number): Promise<string | null> {
  return waitForPidEntry(pid, timeout, (e) => e.sessionId);
}

/**
 * Returns the transcript path for a Claude process ID, optionally waiting for it
 * to appear in the registry.
 *
 * @param pid - Claude process ID to look up.
 * @param timeout - Maximum time to wait in milliseconds. If omitted, returns immediately.
 * @returns Transcript path, or `null` when the entry is absent (or timeout expires).
 */
export async function getTranscriptPathForPid(pid: number, timeout?: number): Promise<string | null> {
  return waitForPidEntry(pid, timeout, (e) => e.transcriptPath);
}
