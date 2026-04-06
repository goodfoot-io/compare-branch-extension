/**
 * Shared card repository filtering and attribution utilities.
 *
 * These are pure functions with no Node-only dependencies and are safe for
 * browser contexts. The git pathspec exclusion constants are shared across
 * the stop hook, the context builder, and the default-configuration package.
 *
 * @summary Shared card repository filtering and attribution utilities
 * @module
 */

import type { CardCommit } from '../protocol/index.js';
import { BRANCHES_FILE, COMMITS_FILE } from '../protocol/index.js';

const SESSION_STREAM_PREFIX = 'streams/claude-code-session/';

/**
 * Git pathspec exclusions for system-managed bookkeeping files.
 *
 * These paths are updated by Cards infrastructure and should not be treated
 * as user-authored work when building repo logs or stop-time attribution.
 *
 * Exclusions:
 * - `streams/claude-code-session/` — session stream files
 * - `commits.csv` — session commit records
 * - `branches.json` — tracked branch records
 */
export const BOOKKEEPING_PATHSPEC_EXCLUSIONS = [
  ':!streams/claude-code-session/',
  `:!${COMMITS_FILE}`,
  `:!${BRANCHES_FILE}`
] as const;

/**
 * Pathspec exclusions for card-repo log rendering.
 *
 * The repo log hides the full `streams/` tree to keep high-frequency
 * transcript writes out of the visible summary.
 */
export const CARD_REPO_LOG_PATHSPEC_EXCLUSIONS = [':!streams/', `:!${COMMITS_FILE}`, `:!${BRANCHES_FILE}`] as const;

/**
 * Returns true when every file in the commit matches a bookkeeping exclusion
 * pattern, meaning the commit should be suppressed from notifications.
 *
 * Exclusions mirror the stop hook:
 * - `streams/claude-code-session/` (prefix match)
 * - `commits.csv` (exact match)
 * - `branches.json` (exact match)
 *
 * A commit with zero changed files is treated as bookkeeping-only (nothing
 * user-visible changed).
 *
 * @param commit - Commit metadata with per-file diff.
 * @returns `true` if every changed file is a bookkeeping path; `false` otherwise.
 */
export function isBookkeepingCommit(commit: CardCommit): boolean {
  return commit.diff.files.every(
    (f) => f.file === COMMITS_FILE || f.file === BRANCHES_FILE || f.file.startsWith(SESSION_STREAM_PREFIX)
  );
}

/**
 * Returns commits from allCommits that are NOT in sessionCommits.
 *
 * @param allCommits - Full commit list detected since session start.
 * @param sessionCommits - Commits already attributed to the current session.
 * @returns SHAs that still need attribution review.
 */
export function getUnattributedCommits(allCommits: string[], sessionCommits: string[]): string[] {
  const sessionSet = new Set(sessionCommits);
  return allCommits.filter((sha) => !sessionSet.has(sha));
}

/**
 * Formats a card repository commit as a compact diffstat string.
 *
 * @param commit - Commit metadata including per-file diff.
 * @returns Multi-line string with header and one file-status line per changed file.
 */
export function formatCommit(commit: CardCommit): string {
  const shortSha = commit.hash.slice(0, 7);
  const header = `${shortSha} - ${commit.author_name}: ${commit.message}`;

  const fileLines = commit.diff.files.map((f) => {
    if (f.status.startsWith('R') && f.from !== undefined) {
      return ` ${f.status} ${f.from} -> ${f.file}`;
    }
    return ` ${f.status} ${f.file}`;
  });

  return [header, ...fileLines].join('\n');
}
