/**
 * UserPromptSubmit hook that nudges agents to load the `cards:cards` skill when
 * a prompt mentions card concepts.
 *
 * Fires on every prompt submission (no matcher). The hook short-circuits when
 * the `cards:cards` skill has already been loaded this session (checked via
 * {@link hasSessionSkillLoaded}), then scans the prompt for two signals:
 *
 * 1. **Term match** — the standalone word "cards" (case-insensitive,
 *    bounded by whitespace or string start/end, not `\b`, so it won't match
 *    inside identifiers/paths like `@cards.management/sessions`).
 * 2. **Card ID detection** — regex-captures `<prefix>-<counter>` tokens,
 *    validates the counter with last-hyphen split logic (mirroring
 *    `parseCardId`), and confirms the card exists on disk at
 *    `~/.cards/cards-repos/<candidate>`.
 *
 * When a signal is found, the hook injects an `additionalContext` nudge
 * instructing the agent to load the skill, and lists any confirmed card IDs
 * with their repo paths.
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
 * Case-insensitive scan for the standalone word "cards", bounded by
 * whitespace (or string start/end) rather than `\b`, so identifiers like
 * `@cards.management/sessions/card-repo` don't match — `\b` treats `/` and `@` as word
 * boundaries too, which caused false positives on package paths.
 *
 * @param prompt - The user's prompt text to scan.
 * @returns `true` when the prompt contains "cards" as a standalone word.
 */
function promptHasCardTerm(prompt: string): boolean {
  return /(?:^|\s)cards(?:\s|$)/i.test(prompt);
}

// ---------------------------------------------------------------------------
// Nudge output
// ---------------------------------------------------------------------------

/**
 * Builds the `additionalContext` nudge string from confirmed card IDs.
 *
 * Always includes the instruction to load `cards:cards`. When card IDs are
 * found, appends one sentence per card with its repo path.
 *
 * @param cardIds - Confirmed card IDs to include in the nudge.
 * @returns The formatted nudge context string wrapped in `<cards-extension>`.
 */
function buildNudgeContext(cardIds: string[]): string {
  const lines: string[] = [];

  lines.push('Load the `cards:cards` skill.');

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
    const cardIds = findCardIds(input.prompt);

    if (!hasTerm && cardIds.length === 0) return undefined;

    logger.info('Nudging to load cards:cards', {
      sessionId: input.session_id,
      hasTerm,
      cardIds
    });

    const additionalContext = buildNudgeContext(cardIds);

    return userPromptSubmitOutput({ additionalContext });
  } catch (error) {
    logger.warn('UserPromptSubmit card-nudge hook failed (fail-open)', { error });
    return undefined;
  }
});
