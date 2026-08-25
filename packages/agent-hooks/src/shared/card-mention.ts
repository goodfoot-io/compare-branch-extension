/**
 * Card-mention detection shared by the Claude, Codex, and OpenCode
 * prompt-nudge hooks.
 *
 * Pure predicates deciding when a prompt should trigger a `<cards-extension>`
 * nudge toward the cards skill: whitespace-bounded card terms,
 * verb-anchored creation intent within a five-token proximity window, and
 * last-hyphen card-ID validation confirmed against `~/.cards/cards-repos/`.
 * The home directory is injectable so tests can point repo confirmation at a
 * temporary tree; production callers use the `os.homedir()` default. The
 * nudge's skill address is caller-supplied because the harnesses resolve it
 * differently — `cards:cards` under Claude Code/Codex namespacing, bare
 * `cards` under OpenCode's flat registry.
 *
 * @summary Card-mention detection predicates shared by all three agents
 * @module shared/card-mention
 */

import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

/**
 * Matches the literal `<task-notification>` wrapper tag that harnesses use to
 * deliver background subagent completions as a synthetic user turn.
 *
 * These bodies are agent-authored prose, not something the user typed, and can
 * incidentally contain a standalone "card"/"cards" term that would otherwise
 * false-positive the nudge.
 */
export const TASK_NOTIFICATION_RE = /^\s*<task-notification>/i;

/**
 * Card ID candidate regex — captures tokens matching `<prefix>-<counter>`,
 * applied against the lowercased prompt.
 *
 * - Prefix: one or more `[a-z0-9]` terms joined by hyphens.
 * - Counter: a positive integer suffix.
 */
export const CARD_ID_RE = /\b[a-z0-9]+(?:-[a-z0-9]+)*-\d+\b/g;

/**
 * Validates a candidate card ID with last-hyphen split logic mirroring
 * `parseCardId`: the suffix must be an integer >= 1, and the prefix must be
 * non-empty and not end with `-`.
 *
 * @param candidate - The candidate card ID string to validate.
 * @returns `true` when the candidate passes structural validation.
 */
export function isValidCardId(candidate: string): boolean {
  const lastHyphen = candidate.lastIndexOf('-');
  if (lastHyphen <= 0) return false;

  const suffix = candidate.substring(lastHyphen + 1);
  const counter = Number(suffix);
  if (!Number.isInteger(counter) || counter < 1) return false;

  // `lastHyphen > 0` already guarantees prefix is non-empty, but guard against
  // a prefix that ends in `-` (double hyphen — caught by the regex but worth
  // defending).
  const prefix = candidate.substring(0, lastHyphen);
  if (prefix.length === 0 || prefix.endsWith('-')) return false;

  return true;
}

/**
 * Returns the set of card IDs found in the prompt that correspond to existing
 * card repositories on disk under `~/.cards/cards-repos/`.
 *
 * @param prompt - The user's prompt text to scan.
 * @param homeDir - Home directory override for tests; defaults to `os.homedir()`.
 * @returns Deduplicated array of confirmed card IDs (in discovery order).
 */
export function findCardIds(prompt: string, homeDir: string = homedir()): string[] {
  const lower = prompt.toLowerCase();
  const seen = new Set<string>();

  for (const candidate of lower.matchAll(CARD_ID_RE)) {
    const id = candidate[0];
    if (!id || seen.has(id)) continue;
    if (!isValidCardId(id)) continue;

    const repoPath = join(homeDir, '.cards', 'cards-repos', id);
    if (existsSync(repoPath)) {
      seen.add(id);
    }
  }

  return [...seen];
}

/**
 * Case-insensitive scan for the standalone word "card" or "cards", bounded by
 * whitespace (or string start/end) rather than `\b`, so identifiers like
 * `@cards.management/sessions/card-repo` don't match — `\b` treats `/` and `@`
 * as word boundaries too, which caused false positives on package paths.
 *
 * @param prompt - The user's prompt text to scan.
 * @returns `true` when the prompt contains "card" or "cards" as a standalone word.
 */
export function promptHasCardTerm(prompt: string): boolean {
  return /(?:^|\s)cards?(?:\s|$)/i.test(prompt);
}

/**
 * Creation verbs that, appearing near a card term, signal the user wants a
 * new card created rather than merely mentioning cards in passing.
 */
export const CREATION_VERBS = new Set([
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

/** Max word-token distance allowed between a creation verb and a card term. */
export const CREATION_INTENT_PROXIMITY = 5;

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
export function promptHasCreationIntent(prompt: string): boolean {
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

/**
 * Builds the nudge string from confirmed card IDs, wrapped in
 * `<cards-extension>` — identical wording across all three agents' hooks.
 *
 * When creation intent fired, leads with a stronger steer toward the
 * create-card flow; otherwise falls back to the generic skill-load
 * instruction. When card IDs are found, appends one sentence per card with
 * its repo path, followed by a single trailing "Read CARD.md" line.
 *
 * @param cardIds - Confirmed card IDs to include in the nudge.
 * @param hasCreationIntent - Whether the prompt signaled creation intent.
 * @param skillAddress - The cards skill address the calling harness resolves:
 * `cards:cards` under Claude Code and Codex plugin namespacing, bare `cards`
 * under OpenCode's flat skill registry.
 * @param homeDir - Home directory override for tests; defaults to `os.homedir()`.
 * @returns The formatted nudge context string.
 */
export function buildNudgeContext(
  cardIds: string[],
  hasCreationIntent: boolean,
  skillAddress: string,
  homeDir: string = homedir()
): string {
  const lines: string[] = [];

  lines.push(
    hasCreationIntent
      ? `The user appears to want a new card created. Load the \`${skillAddress}\` skill and follow its create-card flow.`
      : `Load the \`${skillAddress}\` skill.`
  );

  for (const id of cardIds) {
    const repoPath = join(homeDir, '.cards', 'cards-repos', id);
    lines.push(`Card \`${id}\` is available in the \`${repoPath}\` git repository.`);
  }

  if (cardIds.length > 0) {
    lines.push('Read CARD.md in the repository for more information.');
  }

  return `<cards-extension>\n${lines.join('\n')}\n</cards-extension>`;
}
