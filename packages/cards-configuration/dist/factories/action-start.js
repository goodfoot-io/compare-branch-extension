/**
 * Factory function for creating action start handlers.
 *
 * This is the primary authoring API for action developers. It wraps a handler
 * function and attaches metadata for settings.json generation. The SameShape
 * utility provides compile-time typo detection.
 *
 * @module
 */
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
export function defineActionStart(config, handler) {
  const fn = async (input, context) => {
    await handler(input, context);
  };
  fn.factoryType = 'actionStart';
  fn.id = config.id;
  fn.actionName = config.actionName;
  fn.description = config.description;
  fn.icon = config.icon;
  fn.supportsBackgroundMode = config.supportsBackgroundMode;
  fn.allowConcurrent = config.allowConcurrent;
  fn.timeout = config.timeout;
  fn.sourcePath = config.sourcePath;
  return fn;
}
