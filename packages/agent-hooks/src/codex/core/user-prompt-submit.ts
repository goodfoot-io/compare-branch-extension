/**
 * UserPromptSubmit hook that nudges agents to load the `cards:cards` skill when
 * a prompt mentions card concepts.
 *
 * Fires on every prompt submission (no matcher). The hook short-circuits when
 * the `cards:cards` skill has already been loaded this session (checked via
 * {@link hasSessionSkillLoaded}), then scans the prompt for three signals:
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
 * When a signal is found, the hook injects an `additionalContext` nudge
 * instructing the agent to load the skill, and lists any confirmed card IDs
 * with their repo paths. When creation intent fires, the nudge is a stronger,
 * more specific steer toward the create-card flow rather than the generic
 * "load the skill" line.
 *
 * Fail-open: any unexpected error is logged and the hook returns `undefined`.
 *
 * @summary UserPromptSubmit hook nudging agents to load cards:cards
 * @module user-prompt-submit
 */

import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { hasSessionSkillLoaded } from '@cards.management/sessions/card-repo';
import { userPromptSubmitHook, userPromptSubmitOutput } from '@goodfoot/codex-hooks';

// ---------------------------------------------------------------------------
// Card ID detection helpers
// ---------------------------------------------------------------------------

/**
 * Card ID candidate regex — captures tokens matching `<prefix>-<counter>`.
 *
 * - Prefix: one or more `[a-z0-9]` terms joined by hyphens.
 * - Counter: a positive integer suffix.
 *
 * Applied against the lowercased prompt.
 */
const CARD_ID_RE = /\b[a-z0-9]+(?:-[a-z0-9]+)*-\d+\b/g;

/**
 * Validates a candidate card ID with last-hyphen split logic mirroring
 * `parseCardId`: the suffix must be an integer >= 1, and the prefix must be
 * non-empty and not end with `-`.
 *
 * @param candidate - The candidate card ID string to validate.
 * @returns `true` when the candidate passes structural validation.
 */
function isValidCardId(candidate: string): boolean {
  const lastHyphen = candidate.lastIndexOf('-');
  if (lastHyphen <= 0) return false;

  const suffix = candidate.substring(lastHyphen + 1);
  const counter = Number(suffix);
  if (!Number.isInteger(counter) || counter < 1) return false;

  // `lastHyphen > 0` already guarantees prefix is non-empty, but guard against
  // a prefix that is empty or ends in `-` (would mean double-hyphen, caught
  // by the regex but worth defending).
  const prefix = candidate.substring(0, lastHyphen);
  if (prefix.length === 0 || prefix.endsWith('-')) return false;

  return true;
}

/**
 * Returns the set of card IDs found in the prompt that correspond to existing
 * card repositories on disk under `~/.cards/cards-repos/`.
 *
 * @param prompt - The user's prompt text to scan.
 * @returns Deduplicated array of confirmed card IDs (in discovery order).
 */
function findCardIds(prompt: string): string[] {
  const lower = prompt.toLowerCase();
  const seen = new Set<string>();

  for (const candidate of lower.matchAll(CARD_ID_RE)) {
    const id = candidate[0];
    if (!id || seen.has(id)) continue;
    if (!isValidCardId(id)) continue;

    const repoPath = join(homedir(), '.cards', 'cards-repos', id);
    if (existsSync(repoPath)) {
      seen.add(id);
    }
  }

  return [...seen];
}

/**
 * Case-insensitive scan for the standalone word "card" or "cards", bounded by
 * whitespace (or string start/end) rather than `\b`, so identifiers like
 * `@cards.management/sessions/card-repo` don't match — `\b` treats `/` and `@` as word
 * boundaries too, which caused false positives on package paths.
 *
 * @param prompt - The user's prompt text to scan.
 * @returns `true` when the prompt contains "card" or "cards" as a standalone word.
 */
function promptHasCardTerm(prompt: string): boolean {
  return /(?:^|\s)cards?(?:\s|$)/i.test(prompt);
}

/**
 * Creation verbs that, appearing near a card term, signal the user wants a
 * new card created rather than merely mentioning cards in passing.
 */
const CREATION_VERBS = new Set([
  'create',
  'make',
  'add',
  'open',
  'start',
  'file',
  'log',
  'raise',
  'submit',
  'draft',
  'record',
  'capture',
  'track',
  'note',
  'register'
]);

/**
 * Max word-token distance allowed between a creation verb and a card term for
 * {@link promptHasCreationIntent} to fire.
 */
const CREATION_INTENT_PROXIMITY = 5;

/**
 * Strips leading/trailing punctuation from a whitespace-delimited token and
 * lowercases it, without touching internal characters — so `card-repo` stays
 * `card-repo` (not split into `card` and `repo`) and `card,` becomes `card`.
 *
 * @param token - A single whitespace-delimited token from the prompt.
 * @returns The token with edge punctuation stripped, lowercased.
 */
function normalizeToken(token: string): string {
  return token.toLowerCase().replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, '');
}

/**
 * Detects creation intent: a creation verb appearing within
 * {@link CREATION_INTENT_PROXIMITY} word-tokens of a standalone "card" or
 * "cards" term, in either order. Intentionally verb-anchored — does not
 * attempt to catch verbless framings like "this should be a card" or "a card
 * for X", which require real intent parsing and risk false positives on
 * prose that merely discusses cards.
 *
 * @param prompt - The user's prompt text to scan.
 * @returns `true` when a creation verb is found near a card term.
 */
function promptHasCreationIntent(prompt: string): boolean {
  const tokens = prompt.split(/\s+/).filter(Boolean).map(normalizeToken);
  const cardIndices: number[] = [];
  const verbIndices: number[] = [];

  tokens.forEach((token, index) => {
    if (token === 'card' || token === 'cards') cardIndices.push(index);
    if (CREATION_VERBS.has(token)) verbIndices.push(index);
  });

  return cardIndices.some((cardIndex) =>
    verbIndices.some((verbIndex) => Math.abs(cardIndex - verbIndex) <= CREATION_INTENT_PROXIMITY)
  );
}

// ---------------------------------------------------------------------------
// Nudge output
// ---------------------------------------------------------------------------

/**
 * Builds the `additionalContext` nudge string from confirmed card IDs.
 *
 * When creation intent fired, leads with a stronger steer toward the
 * create-card flow; otherwise falls back to the generic skill-load
 * instruction. When card IDs are found, appends one sentence per card with
 * its repo path.
 *
 * @param cardIds - Confirmed card IDs to include in the nudge.
 * @param hasCreationIntent - Whether the prompt signaled creation intent.
 * @returns The formatted nudge context string wrapped in `<cards-extension>`.
 */
function buildNudgeContext(cardIds: string[], hasCreationIntent: boolean): string {
  const lines: string[] = [];

  lines.push(
    hasCreationIntent
      ? 'The user appears to want a new card created. Load the `cards:cards` skill and follow its create-card flow.'
      : 'Load the `cards:cards` skill.'
  );

  for (const id of cardIds) {
    const repoPath = join(homedir(), '.cards', 'cards-repos', id);
    lines.push(`Card \`${id}\` is available in the \`${repoPath}\` git repository. Read CARD.md for more information.`);
  }

  return `<cards-extension>\n${lines.join('\n')}\n</cards-extension>`;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export default userPromptSubmitHook({}, async (input, { logger }) => {
  try {
    // Short-circuit when the skill has already been loaded this session.
    if (hasSessionSkillLoaded(input.session_id, 'cards:cards')) return undefined;

    const hasTerm = promptHasCardTerm(input.prompt);
    const hasCreationIntent = promptHasCreationIntent(input.prompt);
    const cardIds = findCardIds(input.prompt);

    if (!hasTerm && !hasCreationIntent && cardIds.length === 0) return undefined;

    logger.info('Nudging to load cards:cards', {
      sessionId: input.session_id,
      hasTerm,
      hasCreationIntent,
      cardIds
    });

    const additionalContext = buildNudgeContext(cardIds, hasCreationIntent);

    return userPromptSubmitOutput({ additionalContext });
  } catch (error) {
    logger.warn('UserPromptSubmit card-nudge hook failed (fail-open)', { error });
    return undefined;
  }
});
