/**
 * Factory function for creating action end handlers.
 *
 * Action end handlers run after the corresponding start handler exits successfully
 * (exit code 0). They are useful for cleanup, logging, or notifying external
 * systems about action completion.
 *
 * @module
 */
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
 * import { defineActionEnd } from '@cards/configuration';
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
 * import { defineActionStart, defineActionEnd } from '@cards/configuration';
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
export function defineActionEnd(config, handler) {
    const fn = async (input, context) => {
        await handler(input, context);
    };
    fn.factoryType = 'actionEnd';
    fn.actionName = config.actionName;
    fn.timeout = config.timeout;
    fn.sourcePath = config.sourcePath;
    return fn;
}
