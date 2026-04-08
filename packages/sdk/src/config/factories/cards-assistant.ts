/**
 * Factory function for creating cards-assistant handlers.
 *
 * Parallel to {@link defineAction} but for the workspace-scoped cards
 * assistant. The cards assistant operates outside the per-card action
 * pipeline (no card context, no worktree, no socket).
 *
 *
 * @summary Factory function for creating cards-assistant handlers
 * @module
 */

import type { CardsAssistantCommand } from '../command-types.js';
import type { CardsAssistantContext, CardsAssistantInput } from '../inputs.js';
import type { SameShape } from '../type-utils.js';

// ============================================================================
// Configuration Types
// ============================================================================

/**
 * Configuration for {@link defineCardsAssistant} factory.
 *
 * Minimal configuration since the cards assistant has no action-specific
 * metadata (no name, description, icon, etc.).
 *
 * @example
 * ```typescript
 * const config: CardsAssistantConfig = {};
 * // sourcePath is injected automatically by the esbuild plugin
 * ```
 */
export interface CardsAssistantConfig {
  /**
   * Handler source file path, injected by the `injectSourcePath` esbuild
   * plugin during config loading. Do not set manually.
   *
   * @internal
   */
  sourcePath?: string;
}

// ============================================================================
// Handler Types
// ============================================================================

/**
 * Handler function signature for the cards assistant.
 *
 * Throwing an error signals failure. The error message is logged and
 * surfaced to the user.
 *
 * @param input - Cards assistant input payload from environment variables
 * @param context - Runtime context with logger and cwd
 * @returns Promise that resolves when the handler completes
 *
 * @example
 * ```typescript
 * const handler: CardsAssistantHandler = async (input, { logger, cwd }) => {
 *   logger.info('Starting cards assistant', { cwd });
 *   await spawnClaude(input);
 * };
 * ```
 */
export type CardsAssistantHandler = (
  input: CardsAssistantInput,
  context: CardsAssistantContext
) => void | Promise<void>;

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Creates a cards-assistant handler with metadata for settings.json generation.
 *
 * This factory wraps your handler function and attaches metadata that the CLI
 * extracts when building settings.json. The returned command is both callable
 * (for the runtime) and inspectable (for the CLI).
 *
 * @param config - Cards assistant metadata (uses SameShape to catch typos)
 * @param handler - Async function that implements the cards assistant logic
 * @returns A callable command with attached metadata
 *
 * @example
 * ```typescript
 * export default defineCardsAssistant(
 *   {},
 *   async (input, { logger, cwd }) => {
 *     logger.info('Launching cards assistant');
 *     await spawnClaude(input);
 *   }
 * );
 * ```
 */
export function defineCardsAssistant<T extends CardsAssistantConfig>(
  config: SameShape<CardsAssistantConfig, T>,
  handler: CardsAssistantHandler
): CardsAssistantCommand {
  const fn = async (input: CardsAssistantInput, context: CardsAssistantContext): Promise<void> => {
    await handler(input, context);
  };

  fn.factoryType = 'cards-assistant' as const;
  fn.sourcePath = config.sourcePath;

  return fn as CardsAssistantCommand;
}
