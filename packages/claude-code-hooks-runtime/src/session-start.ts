/**
 * SessionStart hook implementation.
 *
 * Runs as a subprocess of an action. Uses {@link extractActionInput} to
 * confirm we are inside an action subprocess and to expose the action
 * process environment variables to the session context.
 *
 * @summary SessionStart hook implementation
 * @see https://code.claude.com/docs/en/hooks#sessionstart
 */

import { execFileSync } from 'node:child_process';
import { spawnTranscriptWatcher } from '@cards/sdk/bin/spawn-transcript-watcher';
import type { ActionInput } from '@cards/sdk/config';
import { extractActionInput } from '@cards/sdk/config';
import { associatePidWithCard, findAgentPid, registerSession } from '@cards/sessions';
import { writeSessionHeadSha } from '@cards/sessions/card-repo';
import { sessionStartHook, sessionStartOutput } from '@goodfoot/claude-code-hooks';
import {
  buildAdditionalContext,
  buildCardRepoLogBlock,
  buildEnvBlock,
  buildWorkspaceRepoLogBlocks,
  CardRepoAccessError
} from './lib/context.js';

export { buildCardRepoLogBlock, buildEnvBlock, buildWorkspaceRepoLogBlocks, CardRepoAccessError };

/**
 * Error thrown when PID-to-session registration fails.
 *
 * Wraps the underlying error with the PID and session ID for
 * structured error handling in the session-start hook.
 */
export class SessionRegistrationError extends Error {
  override readonly name = 'SessionRegistrationError';

  constructor(
    public readonly pid: number,
    public readonly sessionId: string,
    cause: unknown
  ) {
    const reason = cause instanceof Error ? cause.message : String(cause);
    super(`Failed to register PID ${pid} for session ${sessionId}: ${reason}`);
    this.cause = cause;
  }
}

/**
 * Resolves the git HEAD sha for a repository path.
 *
 * Returns `null` when the path is not a git repository or git is
 * unavailable. Intentionally fails open so hook failures do not block
 * Claude.
 *
 * @param repoPath - Repository directory where `git rev-parse HEAD` should run.
 * @returns Current `HEAD` SHA, or `null` when unavailable.
 */
export function resolveHeadSha(repoPath: string): string | null {
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd: repoPath,
      encoding: 'utf-8',
      timeout: 5000,
      stdio: ['pipe', 'pipe', 'pipe']
    }).trim();
  } catch {
    return null;
  }
}

/**
 * Registers the agent PID for commit attribution and spawns the transcript watcher.
 *
 * Returns a failure output if PID registration fails (blocking), or `null` on
 * success. Watcher spawn failure is non-fatal and only logged.
 *
 * @param agentPid - agent process ID to register and monitor.
 * @param sessionId - Session identifier for the registration.
 * @param transcriptPath - Path to the transcript file for the watcher.
 * @param actionInput - Parsed action input containing card context.
 * @param logger - Logger for structured output.
 * @returns A session-start failure output on registration error, or `null` on success.
 */
async function registerPidAndSpawnWatcher(
  agentPid: number,
  sessionId: string,
  transcriptPath: string,
  actionInput: ActionInput,
  logger: Parameters<Parameters<typeof sessionStartHook>[1]>[1]['logger']
): Promise<ReturnType<typeof sessionStartOutput> | null> {
  try {
    await registerSession(agentPid, sessionId);
    logger.info('Registered PID for commit attribution', { pid: agentPid, sessionId });
  } catch (cause) {
    const error = new SessionRegistrationError(agentPid, sessionId, cause);
    logger.error('Session registration failed', { pid: error.pid, sessionId: error.sessionId, error: error.message });
    return sessionStartOutput({
      continue: false,
      systemMessage: [
        `Session registration failed for PID ${error.pid} (session ${error.sessionId}).`,
        '',
        `Error: ${error.message}`,
        '',
        `Card: ${actionInput.cardId}`,
        `Card repo: ${actionInput.cardRepoPath}`,
        `Action: ${actionInput.actionName}`,
        '',
        'Commit attribution requires a valid PID-to-session mapping. To resolve:',
        '1. Verify the session registry is accessible and not locked by another process',
        '2. Ensure sufficient disk space for the session registry file',
        `3. Check that the agent process (PID ${String(error.pid)}) is still running`
      ].join('\n'),
      stopReason: `Session registration failed: ${error.message}`
    });
  }

  try {
    await associatePidWithCard(agentPid, actionInput.cardId, {
      mode: 'launch',
      workspacePath: process.cwd()
    });
    logger.info('Enrolled launch-mode PID-to-card association', {
      pid: agentPid,
      cardId: actionInput.cardId,
      workspacePath: process.cwd()
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.warn('Launch-mode PID-to-card association failed', {
      pid: agentPid,
      cardId: actionInput.cardId,
      error: message
    });
  }

  try {
    spawnTranscriptWatcher(agentPid, sessionId, transcriptPath, actionInput.cardId, actionInput.cardRepoPath, logger);
    logger.info('Spawned transcript watcher', { pid: agentPid, sessionId });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.warn('Transcript watcher spawn failed', { error: message });
  }

  return null;
}

/**
 * Environment variable names persisted into the Bash tool shell environment.
 *
 * CARDS_SESSION_ID: read by the card-repo post-commit hook to record commits
 * without a process-tree walk.
 * CARDS_TRANSCRIPT_PATH: read by attach-mode watcher spawn to target the
 * correct transcript file.
 */
const CARDS_SESSION_ID_ENV = 'CARDS_SESSION_ID';
const CARDS_TRANSCRIPT_PATH_ENV = 'CARDS_TRANSCRIPT_PATH';

export default sessionStartHook({}, async (input, { logger, persistEnvVar }) => {
  // Persist session env vars unconditionally — before extractActionInput so
  // they are available in every session, including non-action subprocesses.
  persistEnvVar(CARDS_SESSION_ID_ENV, input.session_id);
  persistEnvVar(CARDS_TRANSCRIPT_PATH_ENV, input.transcript_path);
  logger.info('Persisted session env vars to environment', {
    sessionId: input.session_id,
    transcriptPath: input.transcript_path
  });

  let actionInput: ActionInput;
  try {
    actionInput = extractActionInput();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error('Not running inside an action subprocess', { error: message });
    return sessionStartOutput({
      systemMessage: 'SessionStart hook: not running inside an action subprocess.'
    });
  }

  const headSha = resolveHeadSha(actionInput.cardRepoPath);
  if (headSha) {
    writeSessionHeadSha(input.session_id, headSha);
    logger.info('Stored git HEAD sha', { headSha, repoPath: actionInput.cardRepoPath });
  } else {
    logger.warn('Could not resolve git HEAD sha', { repoPath: actionInput.cardRepoPath });
  }

  const agentPid = findAgentPid();
  if (agentPid) {
    const failure = await registerPidAndSpawnWatcher(
      agentPid,
      input.session_id,
      input.transcript_path,
      actionInput,
      logger
    );
    if (failure) return failure;
  } else {
    // Card identity is already known via actionInput.cardId, and workspace commit
    // attribution now resolves the card via resolveCardId (env → worktree-file)
    // independent of the PID-keyed session entry. The PID-keyed entry only feeds
    // best-effort transcript watching; its absence is a warning, not a fatal.
    logger.warn('Could not identify agent PID; transcript watcher disabled', {
      sessionId: input.session_id,
      ppid: process.ppid,
      cardId: actionInput.cardId,
      cardRepoPath: actionInput.cardRepoPath,
      actionName: actionInput.actionName
    });
  }

  logger.info('Action subprocess confirmed', {
    cardId: actionInput.cardId,
    actionName: actionInput.actionName,
    environment: actionInput.environment,
    executionMode: actionInput.executionMode
  });

  let systemMessage: string;
  try {
    systemMessage = buildAdditionalContext(actionInput);
  } catch (error) {
    if (error instanceof CardRepoAccessError) {
      logger.error('Card repo inaccessible', { repoPath: error.repoPath, error: error.message });
      return sessionStartOutput({
        continue: false,
        ...error.toHookFailure('session')
      });
    }
    throw error;
  }

  return sessionStartOutput({
    systemMessage,
    hookSpecificOutput: {
      additionalContext: systemMessage
    }
  });
});
