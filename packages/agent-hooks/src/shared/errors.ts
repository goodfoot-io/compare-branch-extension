/**
 * Shared error classes for commit attribution hooks.
 *
 * Used by both the Stop hook and PostToolUse hook to report failures
 * during commit log retrieval and session CSV recording.
 *
 * @summary Shared error classes for commit attribution hooks
 * @module lib/errors
 */

/**
 * Error thrown when `git log` fails to list commits since a baseline SHA.
 */
export class CommitLogError extends Error {
  override readonly name = 'CommitLogError';

  constructor(
    public readonly repoPath: string,
    public readonly sinceSha: string,
    cause: unknown
  ) {
    const reason = cause instanceof Error ? cause.message : String(cause);
    super(`Failed to list commits since ${sinceSha} in ${repoPath}: ${reason}`);
    this.cause = cause;
  }
}

/**
 * Error thrown when recording an unattributed commit to the session CSV fails.
 */
export class CommitRecordError extends Error {
  override readonly name = 'CommitRecordError';

  constructor(
    public readonly sessionId: string,
    public readonly sha: string,
    cause: unknown
  ) {
    const reason = cause instanceof Error ? cause.message : String(cause);
    super(`Failed to record commit ${sha} for session ${sessionId}: ${reason}`);
    this.cause = cause;
  }
}
