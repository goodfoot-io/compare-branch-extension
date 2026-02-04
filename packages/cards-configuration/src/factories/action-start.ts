/**
 * Factory function for creating action start handlers.
 *
 * This is the primary authoring API for action developers. It wraps a handler
 * function and attaches metadata for settings.json generation. The SameShape
 * utility provides compile-time typo detection.
 *
 * @module
 */

import type { ActionStartCommand } from '../command-types.js';
import type { ActionContext, ActionStartInput } from '../inputs.js';
import type { SameShape } from '../type-utils.js';

// ============================================================================
// Configuration Types
// ============================================================================

/**
 * Configuration for {@link defineActionStart} factory.
 *
 * All fields except `actionName` are optional and forwarded to settings.json.
 * The CLI extracts this metadata via AST analysis, so values must be string
 * literals or boolean/number literals in the source code.
 *
 * @example
 * ```typescript
 * const config: ActionStartConfig = {
 *   actionName: 'Launch Claude',
 *   description: 'Start a Claude coding session',
 *   icon: './icons/claude.svg',
 *   supportsBackgroundMode: true,
 *   timeout: 30000
 * };
 * ```
 */
export interface ActionStartConfig {
  /**
   * The action name used to group start/end commands in settings.json.
   *
   * This name appears in the UI and must match between actionStart and
   * actionEnd if you have both. Keep it concise but descriptive.
   */
  actionName: string;

  /**
   * Human-readable description shown in button tooltip.
   *
   * Explain what the action does in a few words. Shown on hover in the UI.
   */
  description?: string;

  /**
   * Path to icon file for the action button.
   *
   * Paths are relative to the settings.json file location.
   * SVG format recommended for crisp rendering at any size.
   */
  icon?: string;

  /**
   * Whether to show the execution mode toggle in the UI.
   *
   * When true, users can choose between interactive and background modes.
   * When false (default), the action always runs in interactive mode.
   */
  supportsBackgroundMode?: boolean;

  /**
   * Whether multiple instances can run simultaneously on the same card.
   *
   * When false (default), starting the action while it's running will be
   * blocked. Set to true for idempotent actions that can safely overlap.
   */
  allowConcurrent?: boolean;

  /**
   * Maximum execution time in milliseconds.
   *
   * If the action exceeds this timeout, the runtime will terminate it.
   * Omit to use the platform's default timeout policy.
   */
  timeout?: number;

  /**
   * Path to the handler source file for CLI compilation.
   *
   * When provided, the CLI will compile this file into a standalone bundle
   * and generate proper command paths (e.g., `node ./bin/handler.abc123.mjs`).
   *
   * If omitted, the CLI generates placeholder command strings. For full
   * feature parity with v1, always provide sourcePath.
   *
   * @example
   * ```typescript
   * defineActionStart({
   *   actionName: 'Launch Claude',
   *   sourcePath: import.meta.filename // or import.meta.url
   * }, handler);
   * ```
   */
  sourcePath?: string;
}

// ============================================================================
// Handler Types
// ============================================================================

/**
 * Handler function signature for action start events.
 *
 * Throwing an error signals action failure. The error message is logged and
 * surfaced to the user. For expected errors, throw with a descriptive message.
 *
 * @param input - Action input payload from environment variables
 * @param context - Runtime context with logger and cwd
 * @returns Promise that resolves when the action completes
 *
 * @example
 * ```typescript
 * const handler: ActionHandler = async (input, { logger }) => {
 *   try {
 *     logger.info('Starting action', { cardId: input.cardId });
 *     await performAction(input);
 *     logger.info('Action completed successfully');
 *   } catch (err) {
 *     logger.logError(err, 'Action failed');
 *     throw err; // Re-throw to signal failure
 *   }
 * };
 * ```
 */
export type ActionHandler = (input: ActionStartInput, context: ActionContext) => void | Promise<void>;

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Creates an action start handler with metadata for settings.json generation.
 *
 * This factory wraps your handler function and attaches metadata that the CLI
 * extracts when building settings.json. The returned command is both callable
 * (for the runtime) and inspectable (for the CLI).
 *
 * The generic parameter preserves the action name as a literal type, enabling
 * compile-time validation when pairing with action end handlers.
 *
 * @template T - The config type extending ActionStartConfig
 * @param config - Action metadata (uses SameShape to catch typos)
 * @param handler - Async function that implements the action logic
 * @returns A callable command with attached metadata
 *
 * @example
 * ```typescript
 * // Basic usage
 * export default defineActionStart(
 *   { actionName: 'Launch Claude' },
 *   async (input, { logger }) => {
 *     logger.info('Launching Claude', { cardId: input.cardId });
 *     await spawnClaude(input);
 *   }
 * );
 * ```
 *
 * @example
 * ```typescript
 * // With full configuration
 * export default defineActionStart(
 *   {
 *     actionName: 'Deploy Application',
 *     description: 'Deploy to production',
 *     icon: './icons/deploy.svg',
 *     supportsBackgroundMode: true,
 *     allowConcurrent: false,
 *     timeout: 60000
 *   },
 *   async (input, context) => {
 *     await deploy(input, context);
 *   }
 * );
 * ```
 *
 * @example
 * ```typescript
 * // Type-safe pairing with action end
 * const start = defineActionStart(
 *   { actionName: 'Launch' },
 *   async (input, ctx) => { ... }
 * );
 * // start has type: ActionStartCommand<'Launch'>
 *
 * // SameShape catches typos at compile time:
 * defineActionStart(
 *   { actionNme: 'Launch' }, // Error: Property 'actionNme' does not exist
 *   async (input, ctx) => { ... }
 * );
 * ```
 */
export function defineActionStart<T extends ActionStartConfig>(
  config: SameShape<ActionStartConfig, T>,
  handler: ActionHandler
): ActionStartCommand<T['actionName']> {
  const fn = async (input: ActionStartInput, context: ActionContext): Promise<void> => {
    await handler(input, context);
  };

  fn.factoryType = 'actionStart' as const;
  fn.actionName = config.actionName;
  fn.description = config.description;
  fn.icon = config.icon;
  fn.supportsBackgroundMode = config.supportsBackgroundMode;
  fn.allowConcurrent = config.allowConcurrent;
  fn.timeout = config.timeout;
  fn.sourcePath = config.sourcePath;

  return fn as ActionStartCommand<T['actionName']>;
}
