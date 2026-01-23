/**
 * Hook factory functions for Compare Branch Extension hooks.
 *
 * Provides typed factory functions for all 6 hook types that handle:
 * - Input type narrowing based on hook event type
 * - Handler metadata attachment for CLI analysis
 * - Logger context injection
 *
 * Each factory accepts a HookConfig with optional timeout setting,
 * and returns a function that the runtime invokes when the hook file executes.
 * @module
 * @example
 * ```typescript
 * import { startTaskHook } from '@goodfoot/compare-branch-hooks';
 *
 * export default startTaskHook({}, async (input, { logger }) => {
 *   logger.info('Task starting', { taskId: input.taskId });
 * });
 * ```
 */
import type { Logger } from "./logger.js";
import type { EndInterviewInput, EndIssueInput, EndTaskInput, HookEventName, StartInterviewInput, StartIssueInput, StartTaskInput } from "./types.js";
/**
 * Configuration options for hook factories.
 *
 * Controls handler timeout behavior.
 * @example
 * ```typescript
 * // Set handler timeout
 * startTaskHook({ timeout: 5000 }, handler);
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
 * export default startTaskHook({}, async (input, { logger }) => {
 *   logger.info('Processing task', { taskId: input.taskId });
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
 * Creates a StartIssue hook handler.
 *
 * StartIssue hooks fire when a new issue execution begins.
 *
 * @param config - Hook configuration with optional timeout
 * @param handler - The handler function to execute
 * @returns A hook function that can be exported as the default export
 * @example
 * ```typescript
 * import { startIssueHook } from '@goodfoot/compare-branch-hooks';
 *
 * export default startIssueHook({}, async (input, { logger }) => {
 *   logger.info('Issue started', { issueId: input.issueId });
 * });
 * ```
 */
export declare function startIssueHook(config: HookConfig, handler: HookHandler<StartIssueInput>): HookFunction<StartIssueInput>;
/**
 * Creates a StartTask hook handler.
 *
 * StartTask hooks fire when a task begins within an issue.
 *
 * @param config - Hook configuration with optional timeout
 * @param handler - The handler function to execute
 * @returns A hook function that can be exported as the default export
 * @example
 * ```typescript
 * import { startTaskHook } from '@goodfoot/compare-branch-hooks';
 *
 * export default startTaskHook({}, async (input, { logger }) => {
 *   logger.info('Task started', {
 *     taskId: input.taskId,
 *     interactiveMode: input.interactiveMode,
 *   });
 * });
 * ```
 */
export declare function startTaskHook(config: HookConfig, handler: HookHandler<StartTaskInput>): HookFunction<StartTaskInput>;
/**
 * Creates an EndTask hook handler.
 *
 * EndTask hooks fire when a task completes within an issue.
 *
 * @param config - Hook configuration with optional timeout
 * @param handler - The handler function to execute
 * @returns A hook function that can be exported as the default export
 * @example
 * ```typescript
 * import { endTaskHook } from '@goodfoot/compare-branch-hooks';
 *
 * export default endTaskHook({}, async (input, { logger }) => {
 *   logger.info('Task completed', { taskId: input.taskId });
 * });
 * ```
 */
export declare function endTaskHook(config: HookConfig, handler: HookHandler<EndTaskInput>): HookFunction<EndTaskInput>;
/**
 * Creates an EndIssue hook handler.
 *
 * EndIssue hooks fire when an issue execution completes.
 *
 * @param config - Hook configuration with optional timeout
 * @param handler - The handler function to execute
 * @returns A hook function that can be exported as the default export
 * @example
 * ```typescript
 * import { endIssueHook } from '@goodfoot/compare-branch-hooks';
 *
 * export default endIssueHook({}, async (input, { logger }) => {
 *   logger.info('Issue completed', { issueId: input.issueId });
 * });
 * ```
 */
export declare function endIssueHook(config: HookConfig, handler: HookHandler<EndIssueInput>): HookFunction<EndIssueInput>;
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
 * import { startInterviewHook } from '@goodfoot/compare-branch-hooks';
 *
 * export default startInterviewHook({}, async (input, { logger }) => {
 *   logger.info('Interview started', { issueId: input.issueId });
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
 * import { endInterviewHook } from '@goodfoot/compare-branch-hooks';
 *
 * export default endInterviewHook({}, async (input, { logger }) => {
 *   logger.info('Interview completed', { issueId: input.issueId });
 * });
 * ```
 */
export declare function endInterviewHook(config: HookConfig, handler: HookHandler<EndInterviewInput>): HookFunction<EndInterviewInput>;
//# sourceMappingURL=hooks.d.ts.map