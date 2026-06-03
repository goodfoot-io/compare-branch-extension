/**
 * Owner module for the `.cards/PENDING_BIND` on-disk marker.
 *
 * The marker carries a worktree's pending binding — the information needed to
 * bind an unbound worktree to a card when `card create` runs inside it. It is
 * written atomically (temp-rename) and read with fail-closed parsing so a torn
 * or malformed file is indistinguishable from "no marker" from the caller's
 * point of view.
 *
 * Marker path: `<worktreeDir>/.cards/PENDING_BIND`
 *
 * @summary Pending-bind marker read/write/clear operations
 * @module pendingBind
 */

import { randomUUID } from 'node:crypto';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

/**
 * Contents of a `.cards/PENDING_BIND` marker.
 *
 * Written by the WorktreeCreate hook when a worktree is created without a
 * pre-bound card. Read by the EnterWorktree hook (which may add
 * `transcriptPath`/`sessionId`) and consumed by `card create`.
 */
export interface PendingBind {
  /** Schema version — must be exactly `1`. */
  version: 1;
  /** Git branch that was current when the worktree was created. */
  parentBranch: string;
  /** Absolute path to the agent's transcript file, recorded by EnterWorktree. */
  transcriptPath?: string;
  /**
   * Session identifier, recorded by EnterWorktree as a validation tag so
   * `card create` can confirm the binder's own session matches.
   * NOT a spawn key — do not use as a process-spawn identifier.
   */
  sessionId?: string;
}

/**
 * Absolute path of the PENDING_BIND marker inside a worktree's `.cards/` dir.
 *
 * @param worktreeDir - Absolute path to the worktree root.
 * @returns Absolute path to the PENDING_BIND marker file.
 */
function markerPath(worktreeDir: string): string {
  return path.join(worktreeDir, '.cards', 'PENDING_BIND');
}

/**
 * Absolute path of the `.cards/` directory inside a worktree.
 *
 * @param worktreeDir - Absolute path to the worktree root.
 * @returns Absolute path to the `.cards/` directory.
 */
function cardsDir(worktreeDir: string): string {
  return path.join(worktreeDir, '.cards');
}

/**
 * Returns `true` when `value` is a well-formed {@link PendingBind}.
 *
 * Checked properties: `version` must equal `1`; `parentBranch` must be a
 * non-empty string. Optional fields are accepted only when they are strings.
 *
 * @param value - Parsed JSON value to validate.
 * @returns `true` when `value` satisfies the {@link PendingBind} shape.
 */
function isPendingBind(value: unknown): value is PendingBind {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const v = value as Record<string, unknown>;
  if (v['version'] !== 1) {
    return false;
  }
  if (typeof v['parentBranch'] !== 'string' || v['parentBranch'].length === 0) {
    return false;
  }
  if ('transcriptPath' in v && typeof v['transcriptPath'] !== 'string') {
    return false;
  }
  if ('sessionId' in v && typeof v['sessionId'] !== 'string') {
    return false;
  }
  return true;
}

/**
 * Reads the `.cards/PENDING_BIND` marker from the given worktree directory.
 *
 * Fail-closed: a missing file (ENOENT), malformed JSON, wrong or absent
 * `version`, or a shape missing the required `parentBranch` all return `null`.
 * This function never throws to the caller.
 *
 * @param worktreeDir - Absolute path to the worktree root.
 * @returns The parsed marker, or `null` when absent or unreadable.
 */
export async function readPendingBind(worktreeDir: string): Promise<PendingBind | null> {
  let raw: string;
  try {
    raw = await fs.readFile(markerPath(worktreeDir), 'utf8');
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }
    throw error;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  if (!isPendingBind(parsed)) {
    return null;
  }

  return parsed;
}

/**
 * Writes a `.cards/PENDING_BIND` marker atomically.
 *
 * Serialises `value` to JSON, writes to a temp file in the same `.cards/`
 * directory (`PENDING_BIND.<uuid>.tmp`), then renames it into place so a
 * concurrent reader or clearer never observes a torn file. Creates `.cards/`
 * if it does not already exist.
 *
 * @param worktreeDir - Absolute path to the worktree root.
 * @param value - Marker contents to write.
 */
export async function writePendingBind(worktreeDir: string, value: PendingBind): Promise<void> {
  const dir = cardsDir(worktreeDir);
  await fs.mkdir(dir, { recursive: true });

  const tmpFile = path.join(dir, `PENDING_BIND.${randomUUID()}.tmp`);
  const target = markerPath(worktreeDir);

  await fs.writeFile(tmpFile, JSON.stringify(value), 'utf8');
  await fs.rename(tmpFile, target);
}

/**
 * Removes the `.cards/PENDING_BIND` marker.
 *
 * ENOENT-tolerant: if the marker is already gone (never existed, or a
 * concurrent writer already cleared it) the function returns normally.
 *
 * @param worktreeDir - Absolute path to the worktree root.
 */
export async function clearPendingBind(worktreeDir: string): Promise<void> {
  try {
    await fs.unlink(markerPath(worktreeDir));
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
  }
}
