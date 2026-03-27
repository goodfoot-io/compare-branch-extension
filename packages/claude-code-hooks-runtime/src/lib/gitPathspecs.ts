/**
 * Shared git pathspec exclusions for runtime bookkeeping files.
 *
 * @summary Shared git pathspec exclusions for runtime bookkeeping files
 */
import { WORKSPACE_BRANCHES_FILE, WORKSPACE_COMMITS_FILE } from '@cards/sdk/protocol';

/**
 * Git pathspec exclusions for system-managed bookkeeping files.
 *
 * These paths are updated by Cards infrastructure and should not be treated
 * as user-authored work when building repo logs or stop-time attribution.
 */
export const BOOKKEEPING_PATHSPEC_EXCLUSIONS = [
  ':!streams/claude-code-session/',
  `:!${WORKSPACE_COMMITS_FILE}`,
  `:!${WORKSPACE_BRANCHES_FILE}`
] as const;

/**
 * Pathspec exclusions for card-repo log rendering.
 *
 * The repo log hides the full `streams/` tree to keep high-frequency
 * transcript writes out of the visible summary.
 */
export const CARD_REPO_LOG_PATHSPEC_EXCLUSIONS = [
  ':!streams/',
  `:!${WORKSPACE_COMMITS_FILE}`,
  `:!${WORKSPACE_BRANCHES_FILE}`
] as const;
