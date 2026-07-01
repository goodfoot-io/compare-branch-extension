/**
 * SubagentStop hook implementation.
 *
 * Uploads the completed subagent transcript to the Cards API via streaming.
 * Uses `openStream` with stream type `claude-code-session` and filename
 * `{sessionId}-{agentId}.jsonl`.
 *
 * Approves unconditionally — upload failure is non-fatal since transcript
 * data may be partially available via other means.
 *
 * @summary SubagentStop hook — uploads subagent transcript to Cards API
 */

import { rmSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { createCardsClient } from '@cards.management/sdk/client/discovery';
import { extractActionInput } from '@cards.management/sdk/config';
import { removeActiveSubagent } from '@cards.management/sessions/card-repo';
import { subagentStopHook } from '@goodfoot/claude-code-hooks';

/**
 * Uploads the completed subagent transcript to the Cards API via streaming.
 *
 * Reads the transcript file and streams each non-empty line using `openStream`.
 * Fails open — caller logs warning on failure.
 *
 * @param cardId - Card identifier for the upload target
 * @param sessionId - Claude session identifier
 * @param agentId - Subagent identifier
 * @param transcriptPath - Absolute path to the completed transcript file
 */
async function uploadSubagentTranscript(
  cardId: string,
  sessionId: string,
  agentId: string,
  transcriptPath: string
): Promise<void> {
  const client = await createCardsClient();
  if (!client) return;

  const content = await readFile(transcriptPath, 'utf-8');
  const stream = client.openStream(cardId, 'claude-code-session', `${sessionId}-${agentId}.jsonl`, {
    title: `Subagent transcript for ${cardId}`,
    sessionId
  });

  const lines = content.split('\n');
  for (const line of lines) {
    if (line.trim() !== '') {
      stream.write(line);
    }
  }

  await stream.close();
}

export default subagentStopHook({}, async (input, { logger }) => {
  let actionInput: ReturnType<typeof extractActionInput>;
  try {
    actionInput = extractActionInput();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error('Not running inside an action subprocess', { error: message });
    return null;
  }

  try {
    await uploadSubagentTranscript(actionInput.cardId, input.session_id, input.agent_id, input.agent_transcript_path);
    logger.info('Transcript upload complete', {
      sessionId: input.session_id,
      agentId: input.agent_id,
      cardId: actionInput.cardId
    });
  } catch (error) {
    logger.warn('Failed to upload transcript', {
      sessionId: input.session_id,
      agentId: input.agent_id,
      error: error instanceof Error ? error.message : String(error)
    });
  }

  try {
    await removeActiveSubagent(input.session_id, input.agent_id);
  } catch (error) {
    logger.warn('Failed to remove active subagent', {
      sessionId: input.session_id,
      agentId: input.agent_id,
      error: error instanceof Error ? error.message : String(error)
    });

    // Recovery: if the structured remove failed, unlink the whole file to
    // prevent a permanent stale entry that blocks the session from reaching
    // idle. Future subagents will re-create the file atomically.
    const subagentsPath = join(homedir(), '.cards', 'card-repo-commits', `${input.session_id}.subagents`);
    try {
      rmSync(subagentsPath, { force: true });
    } catch (recoveryError) {
      logger.warn('Recovery unlink of subagents file also failed — session may be stuck', {
        sessionId: input.session_id,
        path: subagentsPath,
        error: recoveryError instanceof Error ? recoveryError.message : String(recoveryError)
      });
    }
  }

  return null;
});
