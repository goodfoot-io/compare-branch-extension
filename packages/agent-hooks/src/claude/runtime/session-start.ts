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
import { runReconciliationSweep } from '@cards/sdk/bin/adhoc-refs';
import { resolveTranscriptWatcher, spawnTranscriptWatcher } from '@cards/sdk/bin/spawn-transcript-watcher';
import type { ActionInput } from '@cards/sdk/config';
import { extractActionInput } from '@cards/sdk/config';
import { findAgentPid } from '@cards/sdk/process-tree';
import { writeSessionHeadSha } from '@cards/sessions/card-repo';
import { sessionStartHook, sessionStartOutput } from '@goodfoot/claude-code-hooks';
import {
  buildAdditionalContext,
  buildCardRepoLogBlock,
  buildEnvBlock,
  buildWorkspaceRepoLogBlocks,
  CardRepoAccessError
} from '../../shared/context.js';

export { buildCardRepoLogBlock, buildEnvBlock, buildWorkspaceRepoLogBlocks, CardRepoAccessError };

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
 * Spawns the transcript watcher for the agent process.
 *
 * Watcher spawn failure is non-fatal and only logged.
 *
 * @param agentPid - agent process ID to monitor.
 * @param sessionId - Session identifier.
 * @param transcriptPath - Path to the transcript file for the watcher.
 * @param actionInput - Parsed action input containing card context.
 * @param logger - Logger for structured output.
 */
function spawnWatcher(
  agentPid: number,
  sessionId: string,
  transcriptPath: string,
  actionInput: ActionInput,
  logger: Parameters<Parameters<typeof sessionStartHook>[1]>[1]['logger']
): void {
  try {
    // Resolve the watcher by absolute path: a background Launch action enables
    // only the `runtime` plugin, so the `cards` plugin bin that publishes the
    // `transcript-watcher` wrapper is never on PATH. The success log is gated on
    // the spawn actually happening so a skipped spawn is not reported as success.
    const watcher = resolveTranscriptWatcher(actionInput.marketplacePath);
    const spawned = spawnTranscriptWatcher(
      watcher,
      agentPid,
      sessionId,
      transcriptPath,
      actionInput.cardId,
      actionInput.cardRepoPath,
      logger
    );
    if (spawned) {
      logger.info('Spawned transcript watcher', { pid: agentPid, sessionId, watcher });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.warn('Transcript watcher spawn failed', { error: message });
  }
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

  // Reconciliation sweep: settle any card left `active` by a dead ad-hoc
  // monitor (the detached cleanup process died — reboot/OOM/SIGKILL — before
  // the agent PID it was watching). Runs in EVERY session (before the
  // action-only path below) and is a pure, bounded reconciliation: it no-ops
  // for healthy cards and never touches a card whose monitor is still live.
  // Best-effort — never blocks session start.
  await runReconciliationSweep(logger);

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
    spawnWatcher(agentPid, input.session_id, input.transcript_path, actionInput, logger);
  } else {
    // Card identity is already known via actionInput.cardId, and workspace commit
    // attribution now resolves the card via resolveCardId (worktree-file only)
    // independent of the PID. The PID only feeds best-effort transcript watching;
    // its absence is a warning, not a fatal.
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
