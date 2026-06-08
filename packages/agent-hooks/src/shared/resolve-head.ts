/**
 * Resolves a git repository's HEAD SHA from file reads only.
 *
 * Avoids spawning a git subprocess on the hot path. Handles the common
 * case (loose ref) and the packed-refs fallback. Does not handle
 * worktrees — card repos are never worktrees.
 *
 * @summary File-read-only HEAD SHA resolution for git repositories
 * @module lib/resolve-head
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/** Pattern for a valid full 40-character git SHA. */
const SHA_PATTERN = /^[0-9a-f]{40}$/i;

/**
 * Reads a file synchronously and returns its trimmed content, or `null` on
 * any error (including ENOENT).
 *
 * @param filePath - Absolute path to the file.
 * @returns Trimmed file content, or `null` on error.
 */
function readTrimmed(filePath: string): string | null {
  try {
    return readFileSync(filePath, 'utf-8').trim();
  } catch {
    return null;
  }
}

/**
 * Searches `packed-refs` for a line whose ref path ends with `refPath`.
 *
 * packed-refs format: lines beginning with `#` are comments; data lines
 * are `{sha} {ref}`.
 *
 * @param packedRefsPath - Absolute path to the packed-refs file.
 * @param refPath - Ref path to match (e.g. `refs/heads/main`).
 * @returns Full 40-character SHA, or `null` when not found.
 */
function findInPackedRefs(packedRefsPath: string, refPath: string): string | null {
  const content = readTrimmed(packedRefsPath);
  if (content === null) return null;

  for (const line of content.split('\n')) {
    if (line.startsWith('#')) continue;
    const parts = line.trim().split(' ');
    if (parts.length >= 2 && parts[1] === refPath) {
      const sha = parts[0]!;
      return SHA_PATTERN.test(sha) ? sha : null;
    }
  }

  return null;
}

/**
 * Resolves the current HEAD commit SHA for a git repository using
 * file reads only — no child_process or git subprocess.
 *
 * Resolution order:
 * 1. Read `{repoPath}/.git/HEAD`.
 * 2. If it starts with `ref: `, extract the ref path and try the loose ref file.
 * 3. If the loose ref is absent, scan `{repoPath}/.git/packed-refs`.
 * 4. If HEAD contains a bare SHA (detached HEAD), return it directly.
 * 5. Return `null` on any error (ENOENT, parse failure).
 *
 * @param repoPath - Absolute path to the root of the git repository.
 * @returns Full 40-character SHA string, or `null` when resolution fails.
 */
export function resolveHeadFromFiles(repoPath: string): string | null {
  const gitDir = join(repoPath, '.git');
  const headContent = readTrimmed(join(gitDir, 'HEAD'));
  if (headContent === null) return null;

  if (headContent.startsWith('ref: ')) {
    const refPath = headContent.slice('ref: '.length).trim();
    if (!refPath) return null;

    // Try loose ref first
    const looseRef = readTrimmed(join(gitDir, refPath));
    if (looseRef !== null) {
      return SHA_PATTERN.test(looseRef) ? looseRef : null;
    }

    // Fall back to packed-refs
    return findInPackedRefs(join(gitDir, 'packed-refs'), refPath);
  }

  // Detached HEAD: bare SHA
  return SHA_PATTERN.test(headContent) ? headContent : null;
}
