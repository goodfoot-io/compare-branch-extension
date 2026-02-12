/**
 * Stop hook implementation.
 *
 * Runs as a subprocess of an action. Uses {@link extractActionInput} to
 * confirm we are inside an action subprocess and to expose the action
 * process environment variables.
 *
 * After confirming the action context, the hook checks for unattributed
 * commits in the card repo since the session started (tracked via
 * `SESSION_GIT_HEAD_SHA`). Unattributed commits are those not recorded
 * in the session's CSV by the card-repo post-commit hook.
 *
 * @see https://code.claude.com/docs/en/hooks#stop
 */

import { execSync } from 'node:child_process';
import {
  appendCommitToSession,
  getSessionCommits,
  removeSessionCsv,
  removeSessionPid
} from '@cards/git-hooks/lib/card-repo-sessions';
import { findClaudePid } from '@cards/git-hooks/lib/process-tree';
import type { ActionInput } from '@cards/sdk/config';
import { extractActionInput } from '@cards/sdk/config';
import type { Logger } from '@goodfoot/claude-code-hooks';
import { stopHook, stopOutput } from '@goodfoot/claude-code-hooks';

/**
 * Well-known git empty tree SHA, used as a diff base for initial commits.
 * This is a deterministic value that never changes.
 */
const EMPTY_TREE_SHA = '4b825dc642cb6eb9a060e54bf899d15363d7aa09';

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Returns all commit SHAs between sinceSha and HEAD in the given repo.
 * Runs: git log --format=%H sinceSha..HEAD
 *
 * @param repoPath - Card repository path where git commands should execute.
 * @param sinceSha - Baseline SHA captured at session start.
 * @returns Newer commit SHAs in reverse chronological order (newest first).
 */
export function getCommitsSince(repoPath: string, sinceSha: string): string[] {
  const output = execSync(`git log --format=%H ${sinceSha}..HEAD`, {
    cwd: repoPath,
    encoding: 'utf-8',
    timeout: 10000,
    stdio: ['pipe', 'pipe', 'pipe']
  }).trim();
  if (!output) return [];
  return output.split('\n');
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
 * Returns the combined diff content for the given commit SHAs.
 * Uses the range from oldest unattributed commit's parent to HEAD.
 * Falls back to empty tree SHA if oldest commit is the initial commit.
 *
 * @param repoPath - Card repository path where git commands should execute.
 * @param shas - Unattributed commit SHAs (newest first from {@link getCommitsSince}).
 * @returns Unified diff text for all unattributed changes.
 */
export function getDiffForCommits(repoPath: string, shas: string[]): string {
  if (shas.length === 0) return '';
  // shas are in reverse chronological order (newest first from git log)
  // oldest is last element
  const oldest = shas[shas.length - 1]!;
  try {
    return execSync(`git diff ${oldest}~1..HEAD`, {
      cwd: repoPath,
      encoding: 'utf-8',
      timeout: 10000,
      stdio: ['pipe', 'pipe', 'pipe']
    }).trim();
  } catch {
    // Fallback for initial commits that have no parent
    return execSync(`git diff ${EMPTY_TREE_SHA}..HEAD`, {
      cwd: repoPath,
      encoding: 'utf-8',
      timeout: 10000,
      stdio: ['pipe', 'pipe', 'pipe']
    }).trim();
  }
}

export default stopHook({}, async (input, { logger }) => {
  let actionInput: ActionInput;
  try {
    actionInput = extractActionInput();
  } catch (error) {
    const message = errorMessage(error);
    logger.error('Not running inside an action subprocess', { error: message });
    return stopOutput({
      decision: 'approve',
      systemMessage: 'Stop hook: not running inside an action subprocess.'
    });
  }

  const headSha = process.env['SESSION_GIT_HEAD_SHA'];
  if (!headSha) {
    logger.info('No SESSION_GIT_HEAD_SHA — skipping commit attribution check');
    return stopOutput({
      decision: 'approve',
      systemMessage: 'Stop approved (no HEAD SHA tracked for this session).'
    });
  }

  const sessionId = input.session_id;

  // Get all commits since session start
  let allCommits: string[];
  try {
    allCommits = getCommitsSince(actionInput.cardRepoPath, headSha);
  } catch (error) {
    const message = errorMessage(error);
    logger.error('Failed to get commits since session start', { error: message });
    return stopOutput({
      decision: 'block',
      reason: `Cannot determine commit attribution: git log failed: ${message}`
    });
  }

  if (allCommits.length === 0) {
    // No commits since session start — approve
    await cleanupSession(logger, sessionId);
    return stopOutput({
      decision: 'approve',
      systemMessage: 'Stop approved — no commits since session start.'
    });
  }

  // Get session's attributed commits
  let sessionCommits: string[];
  try {
    sessionCommits = getSessionCommits(sessionId);
  } catch (error) {
    const message = errorMessage(error);
    logger.error('Failed to read session commits', { error: message });
    return stopOutput({
      decision: 'block',
      reason: `Cannot determine commit attribution: CSV read failed: ${message}`
    });
  }

  const unattributed = getUnattributedCommits(allCommits, sessionCommits);

  if (unattributed.length === 0) {
    // All commits attributed — approve
    await cleanupSession(logger, sessionId);
    return stopOutput({
      decision: 'approve',
      systemMessage: `Stop approved — all ${allCommits.length} commits attributed to this session.`
    });
  }

  // Unattributed commits found — block with diff
  let diffContent: string;
  try {
    diffContent = getDiffForCommits(actionInput.cardRepoPath, unattributed);
  } catch (error) {
    const message = errorMessage(error);
    diffContent = `(Could not generate diff: ${message})`;
  }

  await recordUnattributedCommits(sessionId, unattributed, logger);
  await cleanupSession(logger, sessionId);

  return stopOutput({
    decision: 'block',
    reason: `External changes detected in card repo (${unattributed.length} unattributed commit${unattributed.length > 1 ? 's' : ''}):\n\n${diffContent}`
  });
});

/**
 * Records unattributed commits so they are treated as acknowledged on the next stop.
 *
 * @param sessionId - Session ID whose commit CSV should be updated.
 * @param shas - Unattributed commit SHAs to persist.
 * @param logger - Hook logger for best-effort error reporting.
 * @returns Resolves after all SHAs have been attempted.
 */
async function recordUnattributedCommits(sessionId: string, shas: string[], logger: Logger): Promise<void> {
  for (const sha of shas) {
    try {
      await appendCommitToSession(sessionId, sha);
    } catch (error) {
      logger.error('Failed to record unattributed commit', { sha, error });
    }
  }
}

/**
 * Removes PID/session artifacts created during session-start.
 *
 * @param logger - Hook logger used for diagnostic output.
 * @param sessionId - Session ID whose CSV buffer should be cleaned up.
 * @returns Resolves after best-effort cleanup.
 */
async function cleanupSession(logger: Logger, sessionId: string): Promise<void> {
  // Use persisted PID from session-start, fall back to findClaudePid()
  const envPid = process.env['SESSION_CLAUDE_PID'];
  const pid = envPid ? Number.parseInt(envPid, 10) : null;
  const resolvedPid = pid && !Number.isNaN(pid) ? pid : findClaudePid();

  if (resolvedPid) {
    try {
      await removeSessionPid(resolvedPid);
      logger.info('Cleaned up PID registration', { pid: resolvedPid });
    } catch (error) {
      logger.error('Failed to clean up PID registration', { error });
    }
  }

  try {
    removeSessionCsv(sessionId);
    logger.info('Cleaned up session CSV', { sessionId });
  } catch (error) {
    logger.error('Failed to clean up session CSV', { error });
  }
}
