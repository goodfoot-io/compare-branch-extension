/**
 * Factory function for creating action end handlers.
 *
 * Action end handlers run after the corresponding start handler exits successfully
 * (exit code 0). They are useful for cleanup, logging, or notifying external
 * systems about action completion.
 *
 * @module
 */

import type { ActionEndCommand } from '../command-types.js';
import type { ActionContext, ActionEndInput } from '../inputs.js';
import type { SameShape } from '../type-utils.js';

// ============================================================================
// Configuration Interface
// ============================================================================

/**
 * Configuration for defining an action end handler.
 *
 * @property actionName - The name of the action this end handler corresponds to.
 *                        Must match the action name used in the start handler.
 * @property timeout - Optional timeout in milliseconds for handler execution.
 */
export interface ActionEndConfig {
  actionName: string;
  timeout?: number;
}

// ============================================================================
// Handler Type
// ============================================================================

/**
 * Handler function for action end events.
 *
 * Receives the action input and runtime context. Should not throw unless
 * a critical error occurs. Errors in end handlers are logged but do not
 * affect the action's success status.
 *
 * @param input - Action input payload with card context and API credentials
 * @param context - Runtime context with logger and working directory
 * @returns Promise that resolves when the handler completes
 *
 * @example
 * ```typescript
 * const handler: ActionEndHandler = async (input, { logger }) => {
 *   logger.info('Action completed', { cardId: input.cardId });
 *   await notifyExternalSystem(input.cardId);
 * };
 * ```
 */
export type ActionEndHandler = (input: ActionEndInput, context: ActionContext) => void | Promise<void>;

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Creates an action end handler command.
 *
 * This factory wraps your handler function with metadata that the CLI extracts
 * for settings.json generation. The returned command preserves the action name
 * as a literal type for compile-time pairing validation with the corresponding
 * start handler.
 *
 * The SameShape utility catches configuration typos at compile time. Any extra
 * or misspelled properties will cause a type error.
 *
 * @template T - The configuration type (inferred, preserves literal action name)
 * @param config - Configuration with action name and optional timeout
 * @param handler - Async handler function to invoke on action end
 * @returns Callable command with attached metadata
 *
 * @example
 * ```typescript
 * // actions/launch-claude-end.ts
 * import { defineActionEnd } from '@cards/configuration-v2';
 *
 * export default defineActionEnd(
 *   { actionName: 'Launch Claude' },
 *   async (input, { logger }) => {
 *     logger.info('Claude session ended', { cardId: input.cardId });
 *     await notifySlack(`Session completed for card ${input.cardId}`);
 *   }
 * );
 * ```
 *
 * @example
 * ```typescript
 * // Type-safe pairing with start handler
 * import { defineActionStart, defineActionEnd } from '@cards/configuration-v2';
 *
 * const start = defineActionStart(
 *   { actionName: 'Deploy' },
 *   async (input, context) => { ... }
 * );
 *
 * const end = defineActionEnd(
 *   { actionName: 'Deploy' }, // Must match!
 *   async (input, context) => { ... }
 * );
 *
 * // Type is ActionEndCommand<'Deploy'>
 * type EndType = typeof end; // ActionEndCommand<'Deploy'>
 * ```
 */
export function defineActionEnd<T extends ActionEndConfig>(
  config: SameShape<ActionEndConfig, T>,
  handler: ActionEndHandler
): ActionEndCommand<T['actionName']> {
  const fn = async (input: ActionEndInput, context: ActionContext): Promise<void> => {
    await handler(input, context);
  };

  fn.factoryType = 'actionEnd' as const;
  fn.actionName = config.actionName as T['actionName'];
  fn.timeout = config.timeout;

  return fn as ActionEndCommand<T['actionName']>;
}
