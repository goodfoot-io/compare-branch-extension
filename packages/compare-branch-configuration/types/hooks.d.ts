/**
 * Hook factory functions for Cards Extension hooks.
 *
 * Provides typed factory functions for all 4 hook types that handle:
 * - Input type narrowing based on hook event type
 * - Handler metadata attachment for CLI analysis
 * - Logger context injection
 *
 * Each factory accepts a HookConfig with optional timeout setting,
 * and returns a function that the runtime invokes when the hook file executes.
 * @module
 * @example
 * ```typescript
 * import { startCardHook } from '@goodfoot/compare-branch-configuration';
 *
 * export default startCardHook({}, async (input, { logger }) => {
 *   logger.info('Card starting', { cardId: input.cardId });
 * });
 * ```
 */
import type { Logger } from './logger.js';
import type { EndCardInput, EndInterviewInput, HookEventName, StartCardInput, StartInterviewInput, TypedFileCreatedInput, TypedFileDeletedInput, TypedFileUpdatedInput } from './types.js';
/**
 * Configuration options for hook factories.
 *
 * Controls handler timeout behavior.
 * @example
 * ```typescript
 * // Set handler timeout
 * startCardHook({ timeout: 5000 }, handler);
 * ```
 */
export interface HookConfig {
    /**
     * Handler execution timeout in milliseconds.
     *
     * If the handler does not complete within this time, it will be
     * terminated and an error will be logged.
     *
     * If not provided, uses the default timeout from the runtime.
     * @example
     * ```typescript
     * { timeout: 5000 }  // 5 second timeout
     * { timeout: 30000 } // 30 second timeout for long operations
     * ```
     */
    timeout?: number;
}
/**
 * Context provided to hook handlers.
 *
 * Contains utilities and state available during hook execution.
 * The context is injected by the runtime and should not be created manually.
 * @example
 * ```typescript
 * export default startCardHook({}, async (input, { logger }) => {
 *   logger.info('Processing card', { cardId: input.cardId });
 * });
 * ```
 */
export interface HookContext {
    /**
     * Logger instance for structured logging.
     *
     * The logger is pre-configured with the hook context (hookType, input)
     * so log events are automatically enriched.
     */
    logger: Logger;
}
/**
 * Handler function for a specific hook type.
 *
 * Receives the typed input and context, returns void or Promise<void>.
 * Can be async for operations that require awaiting.
 * @template TInput - The input type for this hook
 * @template TContext - The context type (defaults to HookContext)
 */
export type HookHandler<TInput, TContext extends HookContext = HookContext> = (input: TInput, context: TContext) => void | Promise<void>;
/**
 * The result of a hook factory - a function that wraps the handler.
 *
 * This is what gets exported from hook files and invoked by the runtime.
 * @template TInput - The input type for this hook
 * @template TContext - The context type (defaults to HookContext)
 */
export interface HookFunction<TInput, TContext extends HookContext = HookContext> {
    /**
     * Execute the hook handler with the given input and context.
     * @param input - The hook input data
     * @param context - The hook execution context
     */
    (input: TInput, context: TContext): Promise<void>;
    /**
     * The hook event name this handler is for.
     */
    hookEventName: HookEventName;
    /**
     * The timeout in milliseconds, if configured.
     */
    timeout?: number;
}
/**
 * Creates a StartCard hook handler.
 *
 * StartCard hooks fire when a new card execution begins.
 *
 * @param config - Hook configuration with optional timeout
 * @param handler - The handler function to execute
 * @returns A hook function that can be exported as the default export
 * @example
 * ```typescript
 * import { startCardHook } from '@goodfoot/compare-branch-configuration';
 *
 * export default startCardHook({}, async (input, { logger }) => {
 *   logger.info('Card started', { cardId: input.cardId });
 * });
 * ```
 */
export declare function startCardHook(config: HookConfig, handler: HookHandler<StartCardInput>): HookFunction<StartCardInput>;
/**
 * Creates an EndCard hook handler.
 *
 * EndCard hooks fire when an card execution completes.
 *
 * @param config - Hook configuration with optional timeout
 * @param handler - The handler function to execute
 * @returns A hook function that can be exported as the default export
 * @example
 * ```typescript
 * import { endCardHook } from '@goodfoot/compare-branch-configuration';
 *
 * export default endCardHook({}, async (input, { logger }) => {
 *   logger.info('Card completed', { cardId: input.cardId });
 * });
 * ```
 */
export declare function endCardHook(config: HookConfig, handler: HookHandler<EndCardInput>): HookFunction<EndCardInput>;
/**
 * Creates a StartInterview hook handler.
 *
 * StartInterview hooks fire when an interview session begins.
 *
 * @param config - Hook configuration with optional timeout
 * @param handler - The handler function to execute
 * @returns A hook function that can be exported as the default export
 * @example
 * ```typescript
 * import { startInterviewHook } from '@goodfoot/compare-branch-configuration';
 *
 * export default startInterviewHook({}, async (input, { logger }) => {
 *   logger.info('Interview started', { cardId: input.cardId });
 * });
 * ```
 */
export declare function startInterviewHook(config: HookConfig, handler: HookHandler<StartInterviewInput>): HookFunction<StartInterviewInput>;
/**
 * Creates an EndInterview hook handler.
 *
 * EndInterview hooks fire when an interview session completes.
 *
 * @param config - Hook configuration with optional timeout
 * @param handler - The handler function to execute
 * @returns A hook function that can be exported as the default export
 * @example
 * ```typescript
 * import { endInterviewHook } from '@goodfoot/compare-branch-configuration';
 *
 * export default endInterviewHook({}, async (input, { logger }) => {
 *   logger.info('Interview completed', { cardId: input.cardId });
 * });
 * ```
 */
export declare function endInterviewHook(config: HookConfig, handler: HookHandler<EndInterviewInput>): HookFunction<EndInterviewInput>;
/**
 * Creates a TypedFileCreated hook handler.
 *
 * TypedFileCreated hooks fire when a typed file is created.
 *
 * @param config - Hook configuration with optional timeout
 * @param handler - The handler function to execute
 * @returns A hook function that can be exported as the default export
 * @example
 * ```typescript
 * import { typedFileCreatedHook } from '@goodfoot/compare-branch-configuration';
 *
 * export default typedFileCreatedHook({}, async (input, { logger }) => {
 *   logger.info('Typed file created', { typeName: input.typeName, fileName: input.fileName });
 * });
 * ```
 */
export declare function typedFileCreatedHook(config: HookConfig, handler: HookHandler<TypedFileCreatedInput>): HookFunction<TypedFileCreatedInput>;
/**
 * Creates a TypedFileUpdated hook handler.
 *
 * TypedFileUpdated hooks fire when a typed file is updated.
 *
 * @param config - Hook configuration with optional timeout
 * @param handler - The handler function to execute
 * @returns A hook function that can be exported as the default export
 * @example
 * ```typescript
 * import { typedFileUpdatedHook } from '@goodfoot/compare-branch-configuration';
 *
 * export default typedFileUpdatedHook({}, async (input, { logger }) => {
 *   logger.info('Typed file updated', { typeName: input.typeName, fileName: input.fileName });
 * });
 * ```
 */
export declare function typedFileUpdatedHook(config: HookConfig, handler: HookHandler<TypedFileUpdatedInput>): HookFunction<TypedFileUpdatedInput>;
/**
 * Creates a TypedFileDeleted hook handler.
 *
 * TypedFileDeleted hooks fire when a typed file is deleted.
 *
 * @param config - Hook configuration with optional timeout
 * @param handler - The handler function to execute
 * @returns A hook function that can be exported as the default export
 * @example
 * ```typescript
 * import { typedFileDeletedHook } from '@goodfoot/compare-branch-configuration';
 *
 * export default typedFileDeletedHook({}, async (input, { logger }) => {
 *   logger.info('Typed file deleted', { typeName: input.typeName, fileName: input.fileName });
 * });
 * ```
 */
export declare function typedFileDeletedHook(config: HookConfig, handler: HookHandler<TypedFileDeletedInput>): HookFunction<TypedFileDeletedInput>;
//# sourceMappingURL=hooks.d.ts.map