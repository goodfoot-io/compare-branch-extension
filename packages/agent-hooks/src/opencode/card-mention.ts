/**
 * Card-mention detection for the OpenCode prompt-nudge hook.
 *
 * The implementation lives in {@link ../shared/card-mention} so the Claude,
 * Codex, and OpenCode nudges share one copy; this module re-exports it under
 * the OpenCode bundle's established import path.
 *
 * @summary Card-mention detection predicates shared by the OpenCode nudge
 * @module card-mention
 */

export {
  buildNudgeContext,
  CARD_ID_RE,
  CREATION_INTENT_PROXIMITY,
  CREATION_VERBS,
  findCardIds,
  isValidCardId,
  promptHasCardTerm,
  promptHasCreationIntent,
  TASK_NOTIFICATION_RE
} from '../shared/card-mention.js';
