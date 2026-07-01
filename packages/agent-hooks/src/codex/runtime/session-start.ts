/**
 * SessionStart hook implementation.
 *
 * Runs as a subprocess of an action. Uses {@link extractActionInput} to
 * confirm we are inside an action subprocess and to expose the action
 * process environment variables to the session context.
 *
 * @summary SessionStart hook implementation
 */

import { join } from 'node:path';
import { runReconciliationSweep } from '@cards.management/sdk/bin/adhoc-refs';
import { resolveTranscriptWatcher, spawnTranscriptWatcher } from '@cards.management/sdk/bin/spawn-transcript-watcher';
import type { ActionInput } from '@cards.management/sdk/config';
import { extractActionInput } from '@cards.management/sdk/config';
import { findAgentPid } from '@cards.management/sdk/process-tree';
import { sessionStartHook, sessionStartOutput } from '@goodfoot/codex-hooks';
import {
  buildAdditionalContext,
  buildCardRepoLogBlock,
  buildEnvBlock,
  buildWorkspaceRepoLogBlocks,
  CardRepoAccessError
} from '../../shared/context.js';

export { buildCardRepoLogBlock, buildEnvBlock, buildWorkspaceRepoLogBlocks, CardRepoAccessError };

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
    const watcher = resolveTranscriptWatcher(join(actionInput.extensionPath, 'dist', 'bin'));
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

export default sessionStartHook({}, async (input, { logger }) => {
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

  const agentPid = findAgentPid();
  if (agentPid && input.transcript_path) {
    spawnWatcher(agentPid, input.session_id, input.transcript_path, actionInput, logger);
  } else {
    // The PID only feeds best-effort transcript watching; its absence is a warning, not a fatal.
    // When the watcher does not spawn (null agentPid or null transcript_path), the route-nudge
    // marker written later by stop-route-nudge.ts for this session will not be cleaned up. This
    // is a bounded, harmless leak: the marker is an empty file keyed by a dead session id with
    // zero behavioral impact on future sessions. It is accepted because there is no SessionEnd
    // event on Codex, and a reaper's age-gating would risk deleting live sessions' artifacts.
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
    additionalContext: systemMessage
  });
});
