/**
 * File-based PID-to-card session registry.
 *
 * Hooks use this registry to track which Claude PID is associated with which
 * card, and to buffer pending commit SHAs until an association is established.
 *
 * Design invariants:
 * - **First-write-wins**: once a PID has a cardId it cannot be overwritten.
 * - **Fail-open**: every public function catches errors and returns a safe default.
 * - **Atomic writes**: the registry file is written via temp file + rename.
 * - **Stale-entry pruning**: entries older than 24 h or belonging to dead PIDs
 *   are removed on every transaction.
 *
 * @module lib/claude-sessions
 */

import { mkdirSync, openSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import type { Logger } from '@goodfoot/claude-code-hooks';
import { isProcessAlive } from './ipc.js';

function getCardsDir(): string {
  return join(homedir(), '.cards');
}

export function getRegistryPath(): string {
  return join(getCardsDir(), 'claude-sessions.json');
}

export function getLockPath(): string {
  return join(getCardsDir(), 'claude-sessions.lock');
}

export const LOCK_TIMEOUT_MS = 2000;
export const MAX_ENTRY_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

/** Single session entry in the registry. */
export interface ClaudeSessionEntry {
  cardId?: string;
  pendingCommits: string[];
  updatedAt: string;
}

/** Full registry structure stored at `~/.cards/claude-sessions.json`. */
export interface ClaudeSessionRegistry {
  sessions: Record<string, ClaudeSessionEntry>;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function acquireLock(logger?: Logger): boolean {
  const startTime = Date.now();
  const lockPath = getLockPath();

  while (Date.now() - startTime < LOCK_TIMEOUT_MS) {
    try {
      mkdirSync(getCardsDir(), { recursive: true, mode: 0o700 });
      const fd = openSync(lockPath, 'wx', 0o600);
      writeFileSync(fd, String(process.pid));
      return true;
    } catch (error) {
      if (error instanceof Error && 'code' in error) {
        const code = (error as NodeJS.ErrnoException).code;
        if (code === 'EEXIST') {
          try {
            const lockContent = readFileSync(lockPath, 'utf-8');
            const holderPid = Number.parseInt(lockContent.trim(), 10);

            if (!Number.isNaN(holderPid) && !isProcessAlive(holderPid)) {
              logger?.debug?.(`Removing stale lock from dead process ${holderPid}`);
              unlinkSync(lockPath);
              continue;
            }
          } catch {
            try {
              unlinkSync(lockPath);
              continue;
            } catch {
              // Ignore
            }
          }

          const elapsed = Date.now() - startTime;
          if (elapsed < LOCK_TIMEOUT_MS) {
            const sleepTime = Math.min(50, LOCK_TIMEOUT_MS - elapsed);
            const sleepUntil = Date.now() + sleepTime;
            while (Date.now() < sleepUntil) {
              // Busy wait
            }
          }
          continue;
        }
      }
      throw error;
    }
  }

  logger?.warn?.('Lock acquisition timeout, proceeding without lock (fail-open)');
  return false;
}

function releaseLock(logger?: Logger): void {
  try {
    unlinkSync(getLockPath());
  } catch (error) {
    logger?.debug?.(`Error releasing lock: ${error}`);
  }
}

function readRegistryLocked(): ClaudeSessionRegistry {
  try {
    const content = readFileSync(getRegistryPath(), 'utf-8');
    return JSON.parse(content) as ClaudeSessionRegistry;
  } catch {
    return { sessions: {} };
  }
}

function writeRegistryLocked(registry: ClaudeSessionRegistry): void {
  mkdirSync(getCardsDir(), { recursive: true, mode: 0o700 });

  const registryPath = getRegistryPath();
  const tempPath = `${registryPath}.tmp`;
  writeFileSync(tempPath, JSON.stringify(registry, null, 2), { mode: 0o600 });
  renameSync(tempPath, registryPath);
}

function pruneStaleEntries(registry: ClaudeSessionRegistry, logger?: Logger): void {
  const now = Date.now();

  for (const [pidStr, entry] of Object.entries(registry.sessions)) {
    const pid = Number.parseInt(pidStr, 10);

    if (Number.isNaN(pid)) {
      logger?.debug?.(`Removing entry for invalid PID: ${pidStr}`);
      delete registry.sessions[pidStr];
      continue;
    }

    try {
      const updatedAt = new Date(entry.updatedAt).getTime();
      if (now - updatedAt > MAX_ENTRY_AGE_MS) {
        logger?.debug?.(`Removing stale entry for PID ${pid} (age: ${now - updatedAt}ms)`);
        delete registry.sessions[pidStr];
        continue;
      }
    } catch {
      logger?.debug?.(`Removing entry for PID ${pid} with invalid timestamp`);
      delete registry.sessions[pidStr];
      continue;
    }

    try {
      if (!isProcessAlive(pid)) {
        logger?.debug?.(`Removing entry for dead PID ${pid}`);
        delete registry.sessions[pidStr];
      }
    } catch (error) {
      logger?.debug?.(`Error checking liveness of PID ${pid}: ${error}`);
    }
  }
}

async function executeTransaction<T>(operation: (registry: ClaudeSessionRegistry) => T, logger?: Logger): Promise<T> {
  const lockAcquired = acquireLock(logger);

  try {
    const registry = readRegistryLocked();
    pruneStaleEntries(registry, logger);
    const result = operation(registry);
    writeRegistryLocked(registry);
    return result;
  } catch (error) {
    logger?.error?.(`Transaction error: ${error}`);
    throw error;
  } finally {
    if (lockAcquired) {
      releaseLock(logger);
    }
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Associates PID with card. If the entry already has a `cardId`, returns `[]`
 * (first-write-wins). Otherwise sets `cardId`, extracts and clears
 * `pendingCommits`, and returns the extracted commits.
 */
export async function associatePidWithCard(pid: number, cardId: string, logger?: Logger): Promise<string[]> {
  try {
    return await executeTransaction((registry) => {
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
    }, logger);
  } catch (error) {
    logger?.error?.(`Error in associatePidWithCard: ${error}`);
    return [];
  }
}

/**
 * Appends SHA to `pendingCommits` for PID (deduplicating). Creates the entry
 * if it does not exist.
 */
export async function recordPendingCommit(pid: number, sha: string, logger?: Logger): Promise<void> {
  try {
    await executeTransaction((registry) => {
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
    }, logger);
  } catch (error) {
    logger?.error?.(`Error in recordPendingCommit: ${error}`);
  }
}

/**
 * Returns `cardId` for PID if it exists, null otherwise.
 */
export async function getPidCardId(pid: number, logger?: Logger): Promise<string | null> {
  try {
    return await executeTransaction((registry) => {
      const pidStr = String(pid);
      return registry.sessions[pidStr]?.cardId ?? null;
    }, logger);
  } catch (error) {
    logger?.error?.(`Error in getPidCardId: ${error}`);
    return null;
  }
}

/**
 * Removes and returns the PID's entry. Returns null if not found.
 */
export async function removePidEntry(pid: number, logger?: Logger): Promise<ClaudeSessionEntry | null> {
  try {
    return await executeTransaction((registry) => {
      const pidStr = String(pid);
      const entry = registry.sessions[pidStr];

      if (entry) {
        delete registry.sessions[pidStr];
        return entry;
      }

      return null;
    }, logger);
  } catch (error) {
    logger?.error?.(`Error in removePidEntry: ${error}`);
    return null;
  }
}
