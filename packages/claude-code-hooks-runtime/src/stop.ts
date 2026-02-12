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
import { appendCommitToSession, getSessionCommits, removeSessionPid } from '@cards/git-hooks/lib/card-repo-sessions';
import { findClaudePid } from '@cards/git-hooks/lib/process-tree';
import type { ActionInput } from '@cards/sdk/config';
import { extractActionInput } from '@cards/sdk/config';
import type { Logger } from '@goodfoot/claude-code-hooks';
import { stopHook, stopOutput } from '@goodfoot/claude-code-hooks';

/**
 * Returns all commit SHAs between sinceSha and HEAD in the given repo.
 * Runs: git log --format=%H sinceSha..HEAD
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
 */
export function getUnattributedCommits(allCommits: string[], sessionCommits: string[]): string[] {
  const sessionSet = new Set(sessionCommits);
  return allCommits.filter((sha) => !sessionSet.has(sha));
}

/**
 * Returns the combined diff content for the given commit SHAs.
 * Uses the range from oldest unattributed commit's parent to HEAD.
 */
export function getDiffForCommits(repoPath: string, shas: string[]): string {
  if (shas.length === 0) return '';
  // shas are in reverse chronological order (newest first from git log)
  // oldest is last element
  const oldest = shas[shas.length - 1]!;
  return execSync(`git diff ${oldest}~1..HEAD`, {
    cwd: repoPath,
    encoding: 'utf-8',
    timeout: 10000,
    stdio: ['pipe', 'pipe', 'pipe']
  }).trim();
}

export default stopHook({}, (input, { logger }) => {
  let actionInput: ActionInput;
  try {
    actionInput = extractActionInput();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
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
    const message = error instanceof Error ? error.message : String(error);
    logger.error('Failed to get commits since session start', { error: message });
    return stopOutput({
      decision: 'block',
      reason: `Cannot determine commit attribution: git log failed: ${message}`
    });
  }

  if (allCommits.length === 0) {
    // No commits since session start — approve
    cleanupPid(logger);
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
    const message = error instanceof Error ? error.message : String(error);
    logger.error('Failed to read session commits', { error: message });
    return stopOutput({
      decision: 'block',
      reason: `Cannot determine commit attribution: CSV read failed: ${message}`
    });
  }

  const unattributed = getUnattributedCommits(allCommits, sessionCommits);

  if (unattributed.length === 0) {
    // All commits attributed — approve
    cleanupPid(logger);
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
    const message = error instanceof Error ? error.message : String(error);
    diffContent = `(Could not generate diff: ${message})`;
  }

  // Record unattributed commits so they won't be shown again on next stop
  for (const sha of unattributed) {
    try {
      appendCommitToSession(sessionId, sha);
    } catch (error) {
      logger.error('Failed to record unattributed commit', { sha, error });
    }
  }

  cleanupPid(logger);

  return stopOutput({
    decision: 'block',
    reason: `External changes detected in card repo (${unattributed.length} unattributed commit${unattributed.length > 1 ? 's' : ''}):\n\n${diffContent}`
  });
});

function cleanupPid(logger: Logger): void {
  try {
    const pid = findClaudePid();
    if (pid) {
      removeSessionPid(pid);
      logger.info('Cleaned up PID registration', { pid });
    }
  } catch (error) {
    logger.error('Failed to clean up PID registration', { error });
  }
}
