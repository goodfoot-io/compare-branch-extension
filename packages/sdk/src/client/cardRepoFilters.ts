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
 * The header carries the short SHA, the full author identity (name + email in
 * git's canonical `Name <email>` form, falling back to name only when the email
 * is empty), and the subject; the commit body — when present — follows as an
 * indented block, and each changed file gets one status line. `cards watch` is
 * the sole consumer, and a caller deciding how to attribute a commit needs the
 * author email and the body, not just the subject.
 *
 * @param commit - Commit metadata including per-file diff.
 * @returns Multi-line string with header, optional body block, and one
 *   file-status line per changed file.
 */
export function formatCommit(commit: CardCommit): string {
  const shortSha = commit.hash.slice(0, 7);
  const author = commit.author_email ? `${commit.author_name} <${commit.author_email}>` : commit.author_name;
  const header = `${shortSha} - ${author}: ${commit.message}`;

  const lines = [header];

  const body = commit.body.trim();
  if (body.length > 0) {
    for (const line of body.split('\n')) lines.push(`    ${line}`);
  }

  for (const f of commit.diff.files) {
    if (f.status.startsWith('R') && f.from !== undefined) {
      lines.push(` ${f.status} ${f.from} -> ${f.file}`);
    } else {
      lines.push(` ${f.status} ${f.file}`);
    }
  }

  return lines.join('\n');
}
