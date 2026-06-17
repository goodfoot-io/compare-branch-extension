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
import { BRANCHES_DIR, COMMITS_DIR } from '../protocol/index.js';

const SESSION_STREAM_PREFIX = 'streams/claude-code-session/';
const COMMITS_DIR_PREFIX = `${COMMITS_DIR}/`;
const BRANCHES_DIR_PREFIX = `${BRANCHES_DIR}/`;

/**
 * Git pathspec exclusions for system-managed bookkeeping files.
 *
 * These paths are updated by Cards infrastructure and should not be treated
 * as user-authored work when building repo logs or stop-time attribution.
 *
 * Exclusions:
 * - `streams/claude-code-session/` — session stream files
 * - `commits/` — per-commit attribution entry files
 * - `branches/` — per-branch tracking entry files
 */
export const BOOKKEEPING_PATHSPEC_EXCLUSIONS = [
  ':!streams/claude-code-session/',
  `:!${COMMITS_DIR_PREFIX}`,
  `:!${BRANCHES_DIR_PREFIX}`
] as const;

/**
 * Pathspec exclusions for card-repo log rendering.
 *
 * The repo log hides the full `streams/` tree to keep high-frequency
 * transcript writes out of the visible summary.
 */
export const CARD_REPO_LOG_PATHSPEC_EXCLUSIONS = [
  ':!streams/',
  `:!${COMMITS_DIR_PREFIX}`,
  `:!${BRANCHES_DIR_PREFIX}`
] as const;

/**
 * Returns true when every file in the commit matches a bookkeeping exclusion
 * pattern, meaning the commit should be suppressed from notifications.
 *
 * Exclusions mirror the stop hook:
 * - `streams/claude-code-session/` (prefix match)
 * - `commits/` (prefix match)
 * - `branches/` (prefix match)
 *
 * A commit with zero changed files is treated as bookkeeping-only (nothing
 * user-visible changed).
 *
 * @param commit - Commit metadata with per-file diff.
 * @returns `true` if every changed file is a bookkeeping path; `false` otherwise.
 */
export function isBookkeepingCommit(commit: CardCommit): boolean {
  return commit.diff.files.every(
    (f) =>
      f.file.startsWith(COMMITS_DIR_PREFIX) ||
      f.file.startsWith(BRANCHES_DIR_PREFIX) ||
      f.file.startsWith(SESSION_STREAM_PREFIX)
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
 * The header carries the short SHA and full author metadata in git's canonical
 * `Name <email>` form, followed by the commit subject. When the commit has a
 * body (the multi-line description after the subject), it is rendered on its own
 * indented lines between the header and the file list. This is the surface
 * `card <id> watch` prints, so it must include the author email and body — the
 * `CardCommit` carries both (`author_email`, `body`) and the documented contract
 * is that watch prints the commit's "author metadata, body, and changed files".
 *
 * @param commit - Commit metadata including per-file diff.
 * @returns Multi-line string: header, optional body lines, one file-status line
 *   per changed file.
 */
export function formatCommit(commit: CardCommit): string {
  const shortSha = commit.hash.slice(0, 7);
  const author = commit.author_email ? `${commit.author_name} <${commit.author_email}>` : commit.author_name;
  const header = `${shortSha} - ${author}: ${commit.message}`;

  // Body (if present) on its own indented lines, between header and files.
  const bodyLines =
    commit.body.trim().length > 0
      ? commit.body
          .replace(/\s+$/, '')
          .split('\n')
          .map((line) => `    ${line}`)
      : [];

  const fileLines = commit.diff.files.map((f) => {
    if (f.status.startsWith('R') && f.from !== undefined) {
      return ` ${f.status} ${f.from} -> ${f.file}`;
    }
    return ` ${f.status} ${f.file}`;
  });

  return [header, ...bodyLines, ...fileLines].join('\n');
}
