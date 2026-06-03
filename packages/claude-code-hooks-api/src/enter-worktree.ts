/**
 * EnterWorktree (PostToolUse) hook for ad-hoc session attribution.
 *
 * When a plain (non-action) Claude session enters a card-owned worktree via the
 * `EnterWorktree` tool, this hook marks the card `active`, captures its
 * transcript (reusing the existing transcript-watcher), and arranges for it to
 * return to `needs_review` when the Claude agent PID dies. The action/wrapper
 * path is left entirely untouched — an action subprocess (identified by the
 * `ACTION_NAME` env guard) is a complete no-op.
 *
 * This is a `PostToolUse` hook matched to the `EnterWorktree` tool. It fires
 * after the tool switches the session's working directory, so `input.cwd` is
 * the freshly-entered worktree. (The harness-native `CwdChanged` event is never
 * emitted in this environment, so the directory transition is observed through
 * the tool that performs it instead.) Matching on `EnterWorktree` keeps the
 * hook from spawning a process on every tool call. Entering an existing card
 * worktree by `path` is covered too — not just create-and-enter.
 *
 * The PID is resolved and validated (findAgentPid + comm-check) before any
 * lock, spawn, or status write. A null or invalid PID is an immediate no-op:
 * a card is never marked active unless it can be monitored.
 *
 * A card is only (re)activated when it is in a working/pre-work state: a plain
 * session entering the worktree of a finished or review-exit card no-ops rather
 * than force-reactivating it.
 *
 * Both detached spawns (transcript-watcher and adhoc-cleanup) are gated behind
 * a single O_EXCL lock keyed on `input.session_id`, with stale-lock recovery
 * (dead lock-owner PID → unlink + retry once). The lock records the cardId the
 * session is bound to; a session is bound to the first card-worktree it enters
 * and is not re-targeted (the single per-session transcript-watcher cannot be
 * re-targeted without tearing itself down).
 *
 * @summary EnterWorktree PostToolUse hook for ad-hoc session attribution
 * @module enter-worktree
 */

import { join } from 'node:path';
import { findAgentPid, resolveGlobalCardsConfigDir } from '@cards/sdk';
import { acquireLock, resolveCardRepoPath, resolveWorktreeCardId } from '@cards/sdk/adhoc-attribution';
import { isAdhocActivatableStatus, isKnownAgentComm, readCardStatus } from '@cards/sdk/bin/process-utils';
import { spawnAdhocCleanup } from '@cards/sdk/bin/spawn-adhoc-cleanup';
import { spawnTranscriptWatcher, transcriptWatcherWrapperName } from '@cards/sdk/bin/spawn-transcript-watcher';
import { postToolUseHook, postToolUseOutput } from '@goodfoot/claude-code-hooks';

export { acquireLock, resolveCardRepoPath, resolveWorktreeCardId } from '@cards/sdk/adhoc-attribution';

export default postToolUseHook({ matcher: 'EnterWorktree' }, async (input, { logger }) => {
  // 1. Walk up from the entered worktree (post-tool cwd) to find .cards/CARD_ID.
  const cardId = await resolveWorktreeCardId(input.cwd);
  if (!cardId) return postToolUseOutput({});

  // 2. Derive cardRepoPath from the discovery file.
  const cardRepoPath = await resolveCardRepoPath(cardId, logger);
  if (!cardRepoPath) return postToolUseOutput({});

  // 3. Action-subprocess guard — never fight the wrapper.
  if (process.env['ACTION_NAME']) return postToolUseOutput({});

  // 4. Entry source-state guard — only (re)activate a card that is in a
  //    working/pre-work state. Entering a finished or review-exit card's
  //    worktree must NOT force-reactivate it (which would then strand it in
  //    needs_review on teardown). This guard sits BEFORE lock acquisition so a
  //    rejected entry never orphans a lock and is symmetric with the guarded
  //    teardown. A null status (no CARD.meta.json) is treated as
  //    not-activatable — fail closed.
  const currentStatus = await readCardStatus(cardRepoPath);
  if (!isAdhocActivatableStatus(currentStatus ?? undefined)) {
    logger.warn('enter-worktree: card not in an activatable state — no-op', {
      cardId,
      status: currentStatus
    });
    return postToolUseOutput({});
  }

  // 5. PID first — fail open on missing or wrong PID.
  const agentPid = findAgentPid();
  if (!agentPid) return postToolUseOutput({});
  if (!isKnownAgentComm(agentPid, logger)) return postToolUseOutput({});

  // 6. Atomic de-dupe lock (gates both spawns).
  //
  //    The lock is keyed on session_id and records the cardId this session is
  //    bound to. A session is bound to the FIRST card-worktree it enters and
  //    stays bound for the life of the session. This is intentional, not a
  //    limitation to work around: the transcript-watcher's watcherId IS the
  //    session_id, and the extension's WatcherRegistry enforces a takeover
  //    invariant — a single session can have only one live transcript-watcher.
  //    Re-targeting a second card would require tearing down and re-spawning
  //    that single watcher (churn + a transcript-sync gap) and is therefore
  //    precluded. A session that later enters a DIFFERENT card's worktree
  //    correctly no-ops here (its first card keeps the attribution); re-entering
  //    the SAME worktree also no-ops.
  const lockPath = join(resolveGlobalCardsConfigDir(), 'adhoc-sessions', `${input.session_id}.lock`);
  const acquired = await acquireLock(lockPath, agentPid, cardId, logger);
  if (!acquired) return postToolUseOutput({});

  // 7. Spawn transcript-watcher (non-fatal). Attach mode runs with the `cards`
  //    plugin enabled, so its bin — and the `transcript-watcher` wrapper — is on
  //    PATH; the platform-correct bare name (`.cmd` on win32) resolves there.
  spawnTranscriptWatcher(
    transcriptWatcherWrapperName(),
    agentPid,
    input.session_id,
    input.transcript_path,
    cardId,
    cardRepoPath,
    logger
  );

  // 8. Spawn adhoc-cleanup (non-fatal).
  spawnAdhocCleanup(agentPid, input.session_id, cardId, cardRepoPath, lockPath, logger);

  return postToolUseOutput({});
});
