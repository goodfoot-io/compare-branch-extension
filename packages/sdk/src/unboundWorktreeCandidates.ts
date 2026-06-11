/**
 * Per-session on-disk candidate set for unbound worktrees.
 *
 * Each entry records a worktree that was created without a bound card — either
 * by the WorktreeCreate hook's unbound path or by the EnterWorktree hook when
 * it detects a hand-made linked worktree. The set is keyed by
 * `sha256(worktreeDir)` so each worktree occupies exactly one slot and
 * re-entering is an idempotent overwrite.
 *
 * Storage layout:
 *   `~/.cards/adhoc-sessions/<sessionId>/unbound-candidates/<sha256(worktreePath)>.json`
 *
 * The hash-file pattern mirrors the bind-lock pattern in
 * {@link worktreeForCard.ts}.
 *
 * @summary Unbound-worktree candidate set for per-session bind targeting
 * @module unboundWorktreeCandidates
 */

import { createHash } from 'node:crypto';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { resolveGlobalCardsConfigDir } from './cards-config.js';

/**
 * A single entry in the unbound-candidate set.
 *
 * Written by the WorktreeCreate hook (unbound path) or the EnterWorktree hook
 * (hand-made worktree). Consumed by `card create` bind-time resolution.
 */
export interface UnboundWorktreeCandidate {
  /** Absolute path to the unbound worktree root. */
  worktreeDir: string;
  /** Session that created or entered the worktree. */
  sessionId: string;
  /** Absolute path to the session transcript file. */
  transcriptPath: string;
}

/**
 * Resolves the directory that holds all unbound-candidate entries for a
 * given session.
 *
 * @param sessionId - Session identifier.
 * @returns Absolute path to the `unbound-candidates/` directory.
 */
function candidatesDir(sessionId: string): string {
  return path.join(resolveGlobalCardsConfigDir(), 'adhoc-sessions', sessionId, 'unbound-candidates');
}

/**
 * Derives the filename for a worktree's candidate entry.
 *
 * Uses `sha256(worktreePath)` — the same hashing strategy as the bind-lock
 * pattern — so path separators and length limits are never a concern.
 *
 * @param worktreeDir - Absolute path to the worktree root.
 * @returns Filename (not the full path) of the candidate JSON file.
 */
function candidateFilename(worktreeDir: string): string {
  const hash = createHash('sha256').update(worktreeDir).digest('hex');
  return `${hash}.json`;
}

/**
 * Resolves the absolute path for a worktree's candidate file.
 *
 * @param sessionId - Session identifier.
 * @param worktreeDir - Absolute path to the worktree root.
 * @returns Absolute path to the candidate JSON file.
 */
function candidatePath(sessionId: string, worktreeDir: string): string {
  return path.join(candidatesDir(sessionId), candidateFilename(worktreeDir));
}

/**
 * Adds or overwrites the unbound-candidate entry for a worktree.
 *
 * Idempotent: re-entering the same worktree in the same session simply
 * overwrites the existing file with the same (or updated) data.
 *
 * @param sessionId - Session that owns this worktree entry.
 * @param worktreeDir - Absolute path to the unbound worktree root.
 * @param transcriptPath - Absolute path to the session transcript file.
 */
export async function addUnboundCandidate(
  sessionId: string,
  worktreeDir: string,
  transcriptPath: string
): Promise<void> {
  const dir = candidatesDir(sessionId);
  await fs.mkdir(dir, { recursive: true });

  const entry: UnboundWorktreeCandidate = { worktreeDir, sessionId, transcriptPath };
  await fs.writeFile(candidatePath(sessionId, worktreeDir), JSON.stringify(entry), 'utf8');
}

/**
 * Returns the live unbound-candidate entries for a session.
 *
 * Filters out entries whose `worktreeDir` no longer exists on disk —
 * self-healing stale entries left by worktrees that were removed without
 * binding, or crash-orphaned entries. Unreadable or missing files are silently
 * skipped (ENOENT-tolerant for the directory itself too).
 *
 * @param sessionId - Session identifier.
 * @returns Array of live candidate entries (may be empty).
 */
export async function readUnboundCandidates(sessionId: string): Promise<UnboundWorktreeCandidate[]> {
  const dir = candidatesDir(sessionId);

  let filenames: string[];
  try {
    filenames = await fs.readdir(dir);
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return [];
    }
    throw error;
  }

  const jsonFiles = filenames.filter((f) => f.endsWith('.json'));
  const results: UnboundWorktreeCandidate[] = [];

  for (const filename of jsonFiles) {
    let raw: string;
    try {
      raw = await fs.readFile(path.join(dir, filename), 'utf8');
    } catch {
      // Silently skip unreadable or concurrently-removed files.
      continue;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      continue;
    }

    if (!isUnboundWorktreeCandidate(parsed)) {
      continue;
    }

    // Filter stale entries whose worktreeDir no longer exists.
    try {
      await fs.access(parsed.worktreeDir);
    } catch {
      continue;
    }

    results.push(parsed);
  }

  return results;
}

/**
 * Removes the unbound-candidate entry for a specific worktree.
 *
 * ENOENT-tolerant: if the entry is already gone (successfully bound,
 * concurrently removed, or never written) the function returns normally.
 *
 * @param sessionId - Session identifier.
 * @param worktreeDir - Absolute path to the worktree root.
 */
export async function removeUnboundCandidate(sessionId: string, worktreeDir: string): Promise<void> {
  try {
    await fs.unlink(candidatePath(sessionId, worktreeDir));
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
  }
}

/**
 * Clears all unbound-candidate entries for a session.
 *
 * Removes the `unbound-candidates/` directory and its contents. Called by
 * adhoc-cleanup teardown when the session ends. ENOENT-tolerant.
 *
 * @param sessionId - Session identifier.
 */
export async function clearUnboundCandidates(sessionId: string): Promise<void> {
  try {
    await fs.rm(candidatesDir(sessionId), { recursive: true });
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
  }
}

/**
 * Type guard for {@link UnboundWorktreeCandidate}.
 *
 * @param value - Value to check.
 * @returns `true` when `value` satisfies the {@link UnboundWorktreeCandidate} shape.
 */
function isUnboundWorktreeCandidate(value: unknown): value is UnboundWorktreeCandidate {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v['worktreeDir'] === 'string' &&
    v['worktreeDir'].length > 0 &&
    typeof v['sessionId'] === 'string' &&
    v['sessionId'].length > 0 &&
    typeof v['transcriptPath'] === 'string' &&
    v['transcriptPath'].length > 0
  );
}
