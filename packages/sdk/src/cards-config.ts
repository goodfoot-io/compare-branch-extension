/**
 * Shared Cards configuration directory helpers.
 *
 * Keeps global Cards path resolution consistent across packages that need to
 * read or stage user-scoped Cards-managed assets.
 *
 * @summary Shared Cards configuration directory helpers
 * @module
 */

import { createHash } from 'node:crypto';
import { homedir } from 'node:os';
import * as path from 'node:path';

/** Name of the Cards configuration directory. */
export const CARDS_DIR_NAME = '.cards';

/**
 * Resolves the Cards global configuration directory using the standard fallback chain.
 *
 * Resolution order:
 * 1. `$CARDS_HOME`
 * 2. `$XDG_DATA_HOME/.cards`
 * 3. `$XDG_CONFIG_HOME/.cards`
 * 4. `~/.cards`
 *
 * @returns Absolute path to the Cards global configuration directory.
 */
export function resolveGlobalCardsConfigDir(): string {
  const cardsHome = process.env['CARDS_HOME'];
  if (cardsHome) {
    return cardsHome;
  }

  const xdgDataHome = process.env['XDG_DATA_HOME'];
  if (xdgDataHome) {
    return path.join(xdgDataHome, CARDS_DIR_NAME);
  }

  const xdgConfigHome = process.env['XDG_CONFIG_HOME'];
  if (xdgConfigHome) {
    return path.join(xdgConfigHome, CARDS_DIR_NAME);
  }

  return path.join(homedir(), CARDS_DIR_NAME);
}

/**
 * Generates a stable, unique identifier for a repository root path.
 *
 * @param repoRoot - Absolute path to the repository root.
 * @returns A short stable hash (8 chars) prefixed with the directory name.
 */
export function generateRepoId(repoRoot: string): string {
  const dirName = path.basename(repoRoot);
  const hash = createHash('sha256').update(repoRoot).digest('hex').slice(0, 8);
  return `${dirName}-${hash}`;
}

/**
 * Resolves the centralized worktree directory for a given repository and ref.
 *
 * Path pattern: `$CARDS_HOME/worktrees/<repo-id>/<ref>`
 *
 * @param repoRoot - Absolute path to the repository root.
 * @param ref - Git reference (branch, tag, or SHA).
 * @returns Absolute path to the worktree directory.
 */
export function resolveWorktreeDir(repoRoot: string, ref: string): string {
  // Tests can override the root to keep worktrees inside their temp workspace
  const overrideRoot = process.env['CARDS_WORKTREES_ROOT_OVERRIDE'];
  if (overrideRoot) {
    return path.join(overrideRoot, ref);
  }

  const globalDir = resolveGlobalCardsConfigDir();
  const repoId = generateRepoId(repoRoot);
  return path.join(globalDir, 'worktrees', repoId, ref);
}
