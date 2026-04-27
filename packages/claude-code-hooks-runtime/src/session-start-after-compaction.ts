/**
 * SessionStart hook for post-compaction sessions.
 *
 * After context compaction the agent loses its conversation history. This hook
 * re-injects the routing reminder so the agent re-evaluates `<routing-instructions>`
 * and reloads the appropriate skills from conversation history and card state.
 *
 * For attach-mode sessions the hook also rotates the transcript watcher:
 * 1. Stops the outgoing watcher via DELETE /internal/cards/:cardId/watchers.
 * 2. Registers the new session ID.
 * 3. Spawns a fresh watcher for the new session.
 * 4. Persists updated CARDS_SESSION_ID and CARDS_TRANSCRIPT_PATH env vars.
 *
 * Each step is best-effort: failures are logged but never block the routing-reminder
 * return.
 *
 * @summary SessionStart hook — watcher rotation + routing reminder after compaction
 * @see https://code.claude.com/docs/en/hooks#sessionstart
 */

import { spawnTranscriptWatcher } from '@cards/sdk/bin/spawn-transcript-watcher';
import { createCardsClient, discoverApiInfo } from '@cards/sdk/client/discovery';
import { findAgentPid, getPidCardAssociation, registerSession } from '@cards/sessions';
import { sessionStartHook, sessionStartOutput } from '@goodfoot/claude-code-hooks';

const ROUTING_REMINDER = '**IMPORTANT: Immediately load skills based on the `<routing-instructions>`.**';

export default sessionStartHook({ matcher: 'compact' }, async (input, { logger, persistEnvVar }) => {
  logger.info('Post-compaction session start: checking for attach-mode watcher rotation');

  const agentPid = findAgentPid();
  if (agentPid == null) {
    logger.info('Post-compaction session start: no agent PID found, injecting routing reminder only');
    return sessionStartOutput({
      systemMessage: ROUTING_REMINDER,
      hookSpecificOutput: {
        additionalContext: ROUTING_REMINDER
      }
    });
  }

  const association = await getPidCardAssociation(agentPid).catch((err: unknown) => {
    logger.warn('Post-compaction session start: failed to look up PID association', {
      pid: agentPid,
      error: err instanceof Error ? err.message : String(err)
    });
    return null;
  });

  if (association == null || association.mode !== 'attach') {
    logger.info('Post-compaction session start: no attach-mode association, injecting routing reminder only', {
      pid: agentPid,
      mode: association?.mode ?? 'none'
    });
    return sessionStartOutput({
      systemMessage: ROUTING_REMINDER,
      hookSpecificOutput: {
        additionalContext: ROUTING_REMINDER
      }
    });
  }

  const { cardId, workspacePath } = association;

  logger.info('Post-compaction session start: attach-mode — rotating transcript watcher', {
    pid: agentPid,
    cardId,
    newSessionId: input.session_id
  });

  // Step 1: Stop the outgoing watcher BEFORE spawning the new one.
  try {
    const apiInfo = await discoverApiInfo();
    if (apiInfo) {
      const url = `http://${apiInfo.host}:${apiInfo.port}/internal/cards/${encodeURIComponent(cardId)}/watchers`;
      const response = await fetch(url, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${apiInfo.accessToken}` },
        signal: AbortSignal.timeout(4000)
      });
      if (response.ok) {
        const body = (await response.json()) as { stopped: string[]; timedOut: string[] };
        logger.info('Post-compaction session start: stopped outgoing watcher', {
          cardId,
          stopped: body.stopped,
          timedOut: body.timedOut
        });
      } else {
        logger.warn('Post-compaction session start: DELETE watcher returned non-OK', {
          cardId,
          status: response.status
        });
      }
    } else {
      logger.warn('Post-compaction session start: extension API not available, skipping watcher stop', { cardId });
    }
  } catch (err: unknown) {
    logger.warn('Post-compaction session start: failed to stop outgoing watcher (proceeding)', {
      cardId,
      error: err instanceof Error ? err.message : String(err)
    });
  }

  // Step 2: Register the new session.
  try {
    await registerSession(agentPid, input.session_id);
    logger.info('Post-compaction session start: registered new session', {
      pid: agentPid,
      sessionId: input.session_id
    });
  } catch (err: unknown) {
    logger.warn('Post-compaction session start: failed to register new session (proceeding)', {
      pid: agentPid,
      sessionId: input.session_id,
      error: err instanceof Error ? err.message : String(err)
    });
  }

  // Step 3: Persist updated env vars BEFORE spawning the watcher, so that
  // any bash subshells launched after the hook returns read the new values
  // immediately. Earlier is strictly safer for subshell observability.
  persistEnvVar('CARDS_SESSION_ID', input.session_id);
  persistEnvVar('CARDS_TRANSCRIPT_PATH', input.transcript_path);
  logger.info('Post-compaction session start: persisted updated session env vars', {
    sessionId: input.session_id,
    transcriptPath: input.transcript_path
  });

  // Step 4: Spawn a fresh watcher for the new session.
  try {
    const client = await createCardsClient();
    if (client) {
      const card = await client.getCard(cardId);
      const cardRepoPath = card.repositoryPath;
      spawnTranscriptWatcher(agentPid, input.session_id, input.transcript_path, cardId, cardRepoPath, logger);
      logger.info('Post-compaction session start: spawned new transcript watcher', {
        pid: agentPid,
        sessionId: input.session_id,
        cardRepoPath
      });
    } else {
      logger.warn('Post-compaction session start: client unavailable, skipping watcher spawn', { cardId });
    }
  } catch (err: unknown) {
    logger.warn('Post-compaction session start: failed to spawn new transcript watcher (proceeding)', {
      cardId,
      sessionId: input.session_id,
      error: err instanceof Error ? err.message : String(err)
    });
  }

  void workspacePath; // consumed by getPidCardAssociation; logged above

  return sessionStartOutput({
    systemMessage: ROUTING_REMINDER,
    hookSpecificOutput: {
      additionalContext: ROUTING_REMINDER
    }
  });
});
