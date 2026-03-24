/**
 * Pathspec exclusion filter for card repository commits.
 *
 * Mirrors the stop hook's `PATHSPEC_EXCLUSIONS` — commits that only touch
 * system-managed bookkeeping files are not surfaced as external changes.
 *
 * @summary Pathspec exclusion filter for card repository commits
 * @module cards-mcp-server/pathspec
 */

import type { CardCommit } from '@cards/sdk/protocol';
import { WORKSPACE_BRANCHES_FILE, WORKSPACE_COMMITS_FILE } from '@cards/sdk/protocol';

const SESSION_STREAM_PREFIX = 'streams/claude-code-session/';

/**
 * Returns true when every file in the commit matches a bookkeeping exclusion
 * pattern, meaning the commit should be suppressed from notifications.
 *
 * Exclusions mirror the stop hook:
 * - `streams/claude-code-session/` (prefix match)
 * - `workspace-commits.csv` (exact match)
 * - `workspace-branches.json` (exact match)
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
      f.file === WORKSPACE_COMMITS_FILE ||
      f.file === WORKSPACE_BRANCHES_FILE ||
      f.file.startsWith(SESSION_STREAM_PREFIX)
  );
}
