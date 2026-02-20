/**
 * SessionEnd hook implementation.
 *
 * Runs on graceful session exit. Reads the transcript file and uploads
 * it to the card repository via {@link CardsClient.openStream}, producing
 * the stream file that the transcript watcher checks for as a coordination
 * mechanism between the two upload paths.
 *
 * Fails open on all errors — the transcript watcher provides crash resilience
 * so a failed hook upload does not lose the transcript.
 *
 * @summary SessionEnd hook — uploads transcript to card repo on graceful exit
 * @see https://code.claude.com/docs/en/hooks#sessionend
 */

import { readFile } from 'node:fs/promises';
import { extractActionInput } from '@cards/sdk/config';
import { sessionEndHook, sessionEndOutput } from '@goodfoot/claude-code-hooks';
import { createCardsClient } from './lib/api-discovery.js';

/**
 * Error thrown when the transcript upload fails.
 *
 * Wraps the underlying error with the session ID for structured error
 * handling and logging in the session-end hook.
 */
export class TranscriptUploadError extends Error {
  override readonly name = 'TranscriptUploadError';

  constructor(
    public readonly sessionId: string,
    cause: unknown
  ) {
    const reason = cause instanceof Error ? cause.message : String(cause);
    super(`Transcript upload failed for session ${sessionId}: ${reason}`);
    this.cause = cause;
  }
}

export default sessionEndHook({}, async (input, { logger }) => {
  // 1. Extract action input — fail open if not in action subprocess
  let actionInput: ReturnType<typeof extractActionInput>;
  try {
    actionInput = extractActionInput();
  } catch {
    return sessionEndOutput({});
  }

  // 2. Try to upload transcript (wrapped in try/catch — non-fatal)
  try {
    // Read transcript
    const transcript = await readFile(input.transcript_path, 'utf-8');

    // Create client
    const client = await createCardsClient(logger);
    if (!client) {
      logger.warn('API discovery failed, skipping transcript upload', { sessionId: input.session_id });
      return sessionEndOutput({});
    }

    // Open stream
    const stream = client.openStream(actionInput.cardId, 'claude-code-session', `${input.session_id}.jsonl`, {
      title: `Claude session for ${actionInput.cardId}`,
      sessionId: input.session_id
    });

    // Write non-empty lines
    for (const line of transcript.split('\n')) {
      if (line.trim()) {
        stream.write(line);
      }
    }

    await stream.close();
    logger.info('Transcript uploaded', { sessionId: input.session_id, cardId: actionInput.cardId });
  } catch (error) {
    // Handle ENOENT (missing transcript) separately
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      logger.warn('Transcript file not found', { path: input.transcript_path });
      return sessionEndOutput({});
    }
    // All other errors: construct TranscriptUploadError, log, return
    const uploadError = new TranscriptUploadError(input.session_id, error);
    logger.error('Transcript upload failed', { sessionId: uploadError.sessionId, error: uploadError.message });
  }

  return sessionEndOutput({});
});
