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
 * Also short-circuits when the execution wrapper's `CARD_ID` env var matches
 * one of the confirmed card IDs in the prompt — the agent is already working
 * that card, so naming it again is not a signal to nudge.
 *
 * When a signal is found, the hook injects an `additionalContext` nudge
 * instructing the agent to load the skill, and lists any confirmed card IDs
 * with their repo paths, followed by a single trailing "Read CARD.md in the
 * repository for more information." line (not repeated per card). When
 * creation intent fires, the nudge is a stronger, more specific steer toward
 * the create-card flow rather than the generic "load the skill" line.
 *
 * Fail-open: any unexpected error is logged and the hook returns `undefined`.
 *
 * @summary UserPromptSubmit hook nudging agents to load cards:cards
 * @module user-prompt-submit
 */

import { hasSessionSkillLoaded } from '@cards.management/sessions/card-repo';
import { userPromptSubmitHook, userPromptSubmitOutput } from '@goodfoot/codex-hooks';
import {
  buildNudgeContext,
  findCardIds,
  promptHasCardTerm,
  promptHasCreationIntent,
  TASK_NOTIFICATION_RE
} from '../../shared/card-mention.js';

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export default userPromptSubmitHook({}, async (input, { logger }) => {
  try {
    // Short-circuit when the skill has already been loaded this session.
    if (hasSessionSkillLoaded(input.session_id, 'cards:cards')) return undefined;

    // Short-circuit on task-notification bodies — agent-authored prose, not a
    // real user prompt, so incidental "card"/"cards" mentions shouldn't nudge.
    if (TASK_NOTIFICATION_RE.test(input.prompt)) return undefined;

    const hasTerm = promptHasCardTerm(input.prompt);
    const hasCreationIntent = promptHasCreationIntent(input.prompt);
    const cardIds = findCardIds(input.prompt);

    // Already working the identified card (CARD_ID env set by the execution
    // wrapper) — the prompt naming that same card is not a signal to nudge.
    const currentCardId = process.env['CARD_ID']?.trim();
    if (currentCardId && cardIds.includes(currentCardId)) return undefined;

    if (!hasTerm && !hasCreationIntent && cardIds.length === 0) return undefined;

    logger.info('Nudging to load cards:cards', {
      sessionId: input.session_id,
      hasTerm,
      hasCreationIntent,
      cardIds
    });

    const additionalContext = buildNudgeContext(cardIds, hasCreationIntent, 'cards:cards');

    return userPromptSubmitOutput({ additionalContext });
  } catch (error) {
    logger.warn('UserPromptSubmit card-nudge hook failed (fail-open)', { error });
    return undefined;
  }
});
