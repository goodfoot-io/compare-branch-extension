/**
 * SubagentStart hook implementation.
 *
 * Gives subagents card awareness via additional context injection and
 * spawns a detached transcript watcher for the subagent's transcript.
 * Uses the shared {@link buildAdditionalContext} for context and
 * {@link spawnTranscriptWatcher} with `agentId` for transcript streaming.
 *
 * @summary SubagentStart hook — card context injection and transcript watcher for subagents
 * @see https://code.claude.com/docs/en/hooks#subagentstart
 */

import { findClaudePid } from '@cards/claude-code-sessions';
import { extractActionInput } from '@cards/sdk/config';
import { subagentStartHook, subagentStartOutput } from '@goodfoot/claude-code-hooks';
import { buildAdditionalContext, CardRepoAccessError } from './lib/context.js';
import { spawnTranscriptWatcher } from './session-start.js';

export default subagentStartHook({}, async (input, { logger }) => {
  let actionInput: ReturnType<typeof extractActionInput>;
  try {
    actionInput = extractActionInput();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error('Not running inside an action subprocess', { error: message });
    return subagentStartOutput({
      systemMessage: 'SubagentStart hook: not running inside an action subprocess.'
    });
  }

  const claudePid = findClaudePid();
  if (!claudePid) {
    logger.error('Could not find Claude PID', { sessionId: input.session_id, ppid: process.ppid });
    return subagentStartOutput({
      continue: false,
      systemMessage: [
        'Could not locate the Claude Code process in the ancestor chain.',
        '',
        `Session: ${input.session_id}`,
        `Agent: ${input.agent_id}`,
        `Hook PPID: ${process.ppid}`,
        '',
        'Transcript monitoring requires a valid Claude PID.',
        'This is a fatal error when running inside an action subprocess (CARD_ID is set).',
        '',
        'To resolve:',
        '1. Ensure Claude Code is running as a process named "claude"',
        '2. Check that `ps` can see ancestor processes (no PID namespace isolation)',
        '3. Verify the process tree depth is within the allowed limit'
      ].join('\n'),
      stopReason: `Could not find Claude PID (ppid=${process.ppid}, session=${input.session_id})`
    });
  }

  try {
    spawnTranscriptWatcher(
      claudePid,
      input.session_id,
      input.transcript_path,
      actionInput.cardId,
      actionInput.cardRepoPath,
      input.agent_id
    );
    logger.info('Spawned subagent transcript watcher', {
      pid: claudePid,
      sessionId: input.session_id,
      agentId: input.agent_id
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.warn('Transcript watcher spawn failed', { error: message });
  }

  let systemMessage: string;
  try {
    systemMessage = buildAdditionalContext(actionInput);
  } catch (error) {
    if (error instanceof CardRepoAccessError) {
      logger.error('Card repo inaccessible', { repoPath: error.repoPath, error: error.message });
      return subagentStartOutput({
        continue: false,
        ...error.toHookFailure('subagent')
      });
    }
    throw error;
  }

  return subagentStartOutput({
    systemMessage,
    hookSpecificOutput: {
      additionalContext: systemMessage
    }
  });
});
