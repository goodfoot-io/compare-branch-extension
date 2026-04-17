/**
 * Shared coding-agent resolver for action handlers.
 *
 * Encapsulates the single-chokepoint legacy-tolerant mapping from the
 * `cards.codingAgent` setting value (carried on {@link ActionInput.codingAgent})
 * to the canonical handler branch. Legacy pre-main-319 values map to Claude;
 * the canonical Codex value `'codex-cli'` maps to Codex; any other literal
 * fails closed so typos and stale sentinels surface explicitly.
 *
 * @summary Resolve `cards.codingAgent` to a canonical coding-agent branch
 * @module
 */

import type { ActionInput } from '@cards/sdk/config';

/**
 * Canonical coding-agent identifiers that action handlers branch on.
 */
export type CodingAgent = 'claude-code-cli' | 'codex-cli';

/**
 * Pre-main-319 legacy values that resolve to Claude for backward compatibility.
 *
 * Keeping `''`, `undefined`, `'claude-code-extension'`, and `'claude-code-cli'`
 * mapped to Claude prevents every pre-configured user from bricking on the
 * action surface during the window where main-334 has landed but a user's
 * setting has not yet been migrated to `'codex-cli'`.
 */
const LEGACY_CLAUDE_VALUES: ReadonlySet<string | undefined> = new Set([
  undefined,
  '',
  'claude-code-cli',
  'claude-code-extension'
]);

/**
 * Resolves an {@link ActionInput}'s `codingAgent` field to a canonical
 * {@link CodingAgent} branch for action handlers.
 *
 * @param input - Action input carrying the raw `cards.codingAgent` setting value.
 * @returns The canonical coding-agent identifier for handler branching.
 * @throws {Error} When `input.codingAgent` is neither a recognized legacy value
 *   nor `'codex-cli'`. The message names the offending value and points at the
 *   `cards.codingAgent` setting.
 */
export function resolveCodingAgent(input: ActionInput): CodingAgent {
  const value = input.codingAgent;
  if (value === 'codex-cli') {
    return 'codex-cli';
  }
  if (LEGACY_CLAUDE_VALUES.has(value)) {
    return 'claude-code-cli';
  }
  throw new Error(
    `cards.codingAgent='${value}' is not a supported value. ` +
      `Set cards.codingAgent (or cards.defaultCodingAgent) to 'claude-code-cli' or 'codex-cli' ` +
      `in VS Code settings, or open the Cards setup wizard.`
  );
}
