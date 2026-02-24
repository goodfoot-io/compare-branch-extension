/**
 * Shared context-building utilities for SessionStart and SubagentStart hooks.
 *
 * Both hooks need identical card context injection. This module extracts the
 * shared logic so it can be reused without duplication.
 *
 *
 * @summary Shared context-building utilities for session and subagent hooks
 * @module lib/context
 */

import { readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import type { ActionInput } from '@cards/sdk/config';
import { CARDS_ENV_VARS } from '@cards/sdk/config';

/**
 * Error thrown when the card repository cannot be read.
 *
 * Wraps the underlying filesystem error with the repository path for
 * structured error handling in the session-start hook.
 */
export class CardRepoAccessError extends Error {
  override readonly name = 'CardRepoAccessError';

  constructor(
    public readonly repoPath: string,
    cause: unknown
  ) {
    const reason = cause instanceof Error ? cause.message : String(cause);
    super(`Cannot read card repository at ${repoPath}: ${reason}`);
    this.cause = cause;
  }
}

/**
 * Builds a directory listing of `rootPath` as relative file paths.
 *
 * Each entry is a relative path from `rootPath`. Directories are suffixed
 * with `/` and recursed into. The `.git` directory is excluded.
 *
 * @param cardId - Card identifier used in the listing header message.
 * @param rootPath - Root directory of the card repository to traverse.
 * @returns Multi-line listing string used as additional session context.
 * @throws {CardRepoAccessError} When the directory cannot be read.
 */
export function buildCardRepoListing(cardId: string, rootPath: string): string {
  const lines: string[] = [`The card \`${cardId}\` repository at ${rootPath} contains the following files:`];

  function walk(dir: string): void {
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name === '.git') continue;
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        // Include the directory itself in the listing
        lines.push(`${relative(rootPath, fullPath)}/`);
        walk(fullPath);
      } else {
        lines.push(relative(rootPath, fullPath));
      }
    }
  }

  try {
    walk(rootPath);
  } catch (error) {
    throw new CardRepoAccessError(rootPath, error);
  }

  return lines.join('\n');
}

/**
 * Builds a prose paragraph describing the runtime context for this session.
 *
 * Surfaces env vars that are not stored in CARD.meta.json so skills and
 * subagents can access them without placeholder passthrough.
 *
 * @param actionInput - Parsed action input from the environment.
 * @returns A natural-language paragraph describing the session context.
 */
export function buildRuntimeContext(actionInput: ActionInput): string {
  const workspaceBranch = process.env[CARDS_ENV_VARS.WORKSPACE_BRANCH];
  const baseBranch = process.env[CARDS_ENV_VARS.BASE_BRANCH];

  let sentence = `This session is running the ${actionInput.actionName} action in ${actionInput.executionMode} mode`;

  if (workspaceBranch) {
    sentence += ` on branch \`${workspaceBranch}\``;
    if (baseBranch) {
      sentence += `, merging into \`${baseBranch}\``;
    }
  }

  sentence += `.`;

  return `${sentence} The card repository is at ${actionInput.cardRepoPath}.`;
}

/**
 * Builds the combined additional context string for session and subagent hooks.
 *
 * Concatenates the runtime context paragraph and the card repository file
 * listing, separated by a blank line. Let {@link CardRepoAccessError}
 * propagate to the caller for structured error handling.
 *
 * @param actionInput - Parsed action input from the environment.
 * @returns Combined context string: runtime context followed by repo listing.
 * @throws {CardRepoAccessError} When the card repository cannot be read.
 */
export function buildAdditionalContext(actionInput: ActionInput): string {
  const runtimeContext = buildRuntimeContext(actionInput);
  const cardRepoListing = buildCardRepoListing(actionInput.cardId, actionInput.cardRepoPath);
  return `${runtimeContext}\n\n${cardRepoListing}`;
}
