/**
 * UserPromptSubmit hook that nudges agents to load the `cards:cards` skill when
 * a prompt mentions card concepts.
 *
 * Fires on every prompt submission (no matcher). The hook short-circuits when
 * the `cards:cards` skill has already been loaded this session (checked via
 * {@link hasSessionSkillLoaded}), or when the prompt is a `<task-notification>`
 * body (a background subagent's completion report, not user-typed text — see
 * {@link TASK_NOTIFICATION_RE}), then scans the prompt for three signals:
 *
 * 1. **Term match** — the standalone word "card" or "cards" (case-insensitive,
 *    bounded by whitespace or string start/end, not `\b`, so it won't match
 *    inside identifiers/paths like `@cards.management/sessions` or
 *    compound words like `card-repo`).
 * 2. **Creation intent** — a creation verb (create, make, add, open, start,
 *    file, log, raise, submit, draft, record, capture, track, note, register)
 *    within a few words of a card term (see {@link promptHasCreationIntent}).
 *    Verb-anchored only; does not attempt to catch verbless framings like
 *    "this should be a card".
 * 3. **Card ID detection** — regex-captures `<prefix>-<counter>` tokens,
 *    validates the counter with last-hyphen split logic (mirroring
 *    `parseCardId`), and confirms the card exists on disk at
 *    `~/.cards/cards-repos/<candidate>`.
 *
 * Also short-circuits when the agent is already working one of the confirmed
 * card IDs — either because the execution wrapper's `CARD_ID` env var matches
 * it, or because `input.cwd` resolves (via {@link resolveWorktreeCardId}) to
 * it — since naming a card the agent is already inside is not a signal to
 * nudge.
 *
 * When a signal is found, the hook injects an `additionalContext` nudge
 * instructing the agent to load the skill, and lists any confirmed card IDs
 * with their repo paths, followed by a single trailing "Read CARD.md in the
 * repository for more information." line (not repeated per card). When
 * creation intent fires, the nudge is a stronger, more specific steer toward
 * the create-card flow rather than the generic "load the skill" line. The
 * same content is mirrored as `systemMessage` so the user sees the nudge too.
 *
 * Fail-open: any unexpected error is logged and the hook returns `null`.
 *
 * @summary UserPromptSubmit hook nudging agents to load cards:cards
 * @module user-prompt-submit
 */

import { resolveWorktreeCardId } from '@cards.management/sdk/adhoc-attribution';
import { hasSessionSkillLoaded } from '@cards.management/sessions/card-repo';
import { userPromptSubmitHook, userPromptSubmitOutput } from '@goodfoot/claude-code-hooks';
import {
  buildNudgeContext,
  findCardIds,
  promptHasCardTerm,
  promptHasCreationIntent,
  TASK_NOTIFICATION_RE
} from '../../shared/card-mention.js';
import { applyDefaultLogFile } from '../../shared/default-log-file.js';

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export default userPromptSubmitHook({}, async (input, { logger }) => {
  // Point hook file logging at <mainRepoRoot>/.cards/logs/claude-code-cards-api-hooks.log,
  // computed from the payload cwd. No-op under an explicit CLAUDE_CODE_HOOKS_LOG_FILE.
  applyDefaultLogFile(input.cwd);

  try {
    // Short-circuit when the skill has already been loaded this session.
    if (hasSessionSkillLoaded(input.session_id, 'cards:cards')) return null;

    // Short-circuit on task-notification bodies — agent-authored prose, not a
    // real user prompt, so incidental "card"/"cards" mentions shouldn't nudge.
    if (TASK_NOTIFICATION_RE.test(input.prompt)) return null;

    const hasTerm = promptHasCardTerm(input.prompt);
    const hasCreationIntent = promptHasCreationIntent(input.prompt);
    const cardIds = findCardIds(input.prompt);

    // Already working the identified card (CARD_ID env set by the execution
    // wrapper, or cwd inside that card's worktree) — the prompt naming that
    // same card is not a signal to nudge.
    const currentCardId = process.env['CARD_ID']?.trim() || (await resolveWorktreeCardId(input.cwd));
    if (currentCardId && cardIds.includes(currentCardId)) return null;

    if (!hasTerm && !hasCreationIntent && cardIds.length === 0) return null;

    logger.info('Nudging to load cards:cards', {
      sessionId: input.session_id,
      hasTerm,
      hasCreationIntent,
      cardIds
    });

    const additionalContext = buildNudgeContext(cardIds, hasCreationIntent);

    // systemMessage surfaces to the user, additionalContext is injected into the agent's context.
    return userPromptSubmitOutput({
      systemMessage: additionalContext,
      hookSpecificOutput: { additionalContext }
    });
  } catch (error) {
    logger.warn('UserPromptSubmit card-nudge hook failed (fail-open)', { error });
    return null;
  }
});
