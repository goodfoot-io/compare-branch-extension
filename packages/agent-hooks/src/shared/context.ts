/**
 * Shared context-building utilities for SessionStart and SubagentStart hooks.
 *
 * Both hooks need identical card context injection. This module extracts the
 * shared logic so it can be reused without duplication.
 *
 * @summary Shared context-building utilities for session and subagent hooks
 * @module lib/context
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ActionInput } from '@cards.management/sdk/config';
import { CARDS_ENV_VARS } from '@cards.management/sdk/config';
import { buildCardRepoLogBlock, buildDependsOnBlock, buildWorkspaceRepoLogBlocks } from '@cards.management/sdk/context';

export { buildCardRepoLogBlock, buildDependsOnBlock, buildWorkspaceRepoLogBlocks } from '@cards.management/sdk/context';

/**
 * Error thrown when the card repository cannot be read.
 *
 * Wraps the underlying filesystem error with the repository path for
 * structured error handling in session and subagent hooks.
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

  /**
   * Builds a user-facing system message explaining the card repo access failure.
   *
   * @param actor - Human-readable noun for the failing entity (e.g. "session", "subagent").
   * @returns Object with `systemMessage` and `stopReason` strings.
   */
  toHookFailure(actor: string): { systemMessage: string; stopReason: string } {
    return {
      systemMessage: [
        `The card repository at '${this.repoPath}' is not accessible.`,
        '',
        `Error: ${this.message}`,
        '',
        `This ${actor} cannot proceed without a valid card repository. To resolve:`,
        `1. Verify the card repository directory exists at: ${this.repoPath}`,
        '2. Ensure the current process has read permissions for the directory and its contents',
        '3. Check that the CARD_REPO_PATH environment variable points to a valid card repository'
      ].join('\n'),
      stopReason: `Card repository inaccessible at ${this.repoPath}: ${this.message}`
    };
  }
}

// ============================================================================
// Env block
// ============================================================================

/**
 * Builds the fenced bash env block with card environment variables.
 *
 * @param actionInput - Parsed action input from the environment.
 * @returns Fenced bash block string with env vars.
 */
export function buildEnvBlock(actionInput: ActionInput): string {
  const workspacePath = process.env[CARDS_ENV_VARS.WORKSPACE_PATH] ?? '';
  const baseBranch = process.env[CARDS_ENV_VARS.BASE_BRANCH] ?? '';
  const workspaceBranch = process.env[CARDS_ENV_VARS.WORKSPACE_BRANCH] ?? '';

  const lines = [
    `CARD_ID=${actionInput.cardId}`,
    `CARD_REPO_PATH=${actionInput.cardRepoPath}`,
    `WORKSPACE_PATH=${workspacePath}`,
    `BASE_BRANCH=${baseBranch}`,
    `WORKSPACE_BRANCH=${workspaceBranch}`,
    `EXECUTION_MODE=${actionInput.executionMode}`,
    `EXIT_WHEN_DONE=${actionInput.exitWhenDone}`
  ];

  return `\`\`\`bash\n${lines.join('\n')}\n\`\`\``;
}

// ============================================================================
// Combined context
// ============================================================================

/**
 * Builds the combined additional context string for session and subagent hooks.
 *
 * Produces: env block, optionally `<card-repo-log>`, and optionally
 * `<workspace-repo-log>` blocks. Asserts CARD.meta.json is readable so
 * {@link CardRepoAccessError} surfaces at session start rather than at
 * first agent read.
 *
 * @param actionInput - Parsed action input from the environment.
 * @returns Combined context string with env block and XML blocks.
 * @throws {CardRepoAccessError} When the card repository cannot be read.
 */
export function buildAdditionalContext(actionInput: ActionInput): string {
  try {
    readFileSync(join(actionInput.cardRepoPath, 'CARD.meta.json'), 'utf-8');
  } catch (error) {
    throw new CardRepoAccessError(actionInput.cardRepoPath, error);
  }

  const envBlock = buildEnvBlock(actionInput);
  const logBlock = buildCardRepoLogBlock(actionInput.cardRepoPath);
  const workspaceLogBlocks = buildWorkspaceRepoLogBlocks(actionInput.repoRoot, actionInput.cardRepoPath);
  const dependsOnBlock = buildDependsOnBlock(actionInput.cardRepoPath);

  const parts = [envBlock];
  if (logBlock) parts.push(logBlock);
  parts.push(...workspaceLogBlocks);
  if (dependsOnBlock) parts.push(dependsOnBlock);
  return parts.join('\n\n');
}
