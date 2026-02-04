/**
 * Hook type definitions for Cards Extension hooks.
 *
 * These types define the contract between hook authors and the runtime. The
 * actual hook factory functions have been replaced by the settings-based
 * actions system in {@link ./actions.js}, but these types remain for runtime
 * compatibility and for authors who need fine-grained control over hook
 * behavior.
 *
 * Most developers should use the action factories from `./actions.js` instead
 * of working with these types directly.
 *
 * @module
 * @see {@link ./actions.js} for the recommended action factory functions
 * @see {@link ./runtime.js} for how hooks are executed
 */

import type { Logger } from './logger.js';
import type { HookEventName } from './types.js';

// ============================================================================
// Configuration Types
// ============================================================================

/**
 * Configuration options for hook metadata.
 *
 * These options become properties on the hook function and are extracted by
 * the CLI during compilation. The SDK does not enforce timeouts locally;
 * enforcement (if any) happens in the Cards runtime based on hooks.json
 * configuration.
 *
 * @example
 * ```typescript
 * // Set a handler timeout for the Cards runtime
 * const config: HookConfig = { timeout: 5000 };
 *
 * // For long-running operations like file processing
 * const longRunningConfig: HookConfig = { timeout: 30000 };
 * ```
 */
export interface HookConfig {
  /**
   * Maximum handler runtime in milliseconds.
   *
   * This value is forwarded to hooks.json. If the Cards runtime enforces
   * timeouts, it will terminate the hook process after this duration.
   * Omitting this field lets the runtime apply its default timeout policy.
   *
   * Choose timeout values based on expected operation duration plus buffer
   * for I/O variance. For validation hooks that should be fast, use shorter
   * timeouts (5-10 seconds). For hooks that do network calls or heavy
   * processing, use longer timeouts (30+ seconds).
   *
   * @example
   * ```typescript
   * { timeout: 5000 }   // 5 seconds for fast validation
   * { timeout: 30000 }  // 30 seconds for API calls
   * { timeout: 120000 } // 2 minutes for heavy processing
   * ```
   */
  timeout?: number;
}

// ============================================================================
// Context Types
// ============================================================================

/**
 * Runtime context injected when a hook executes.
 *
 * The context is created by {@link execute} and is already scoped to the
 * current hook invocation. Log events are automatically enriched with hook
 * metadata, so you don't need to manually include hookType or cardId in
 * every log call.
 *
 * Do not construct this manually; it is intentionally minimal and owned by
 * the runtime. The interface may be extended in future versions to include
 * additional utilities.
 *
 * @example
 * ```typescript
 * async (input, { logger }: HookContext) => {
 *   // Logger is pre-configured with hook context
 *   logger.info('Processing card');
 *   logger.debug('Input details', { executionMode: input.executionMode });
 *
 *   try {
 *     await performWork();
 *     logger.info('Work completed');
 *   } catch (err) {
 *     logger.logError(err, 'Work failed');
 *     throw err;
 *   }
 * }
 * ```
 */
export interface HookContext {
  /**
   * Logger for structured, context-aware logging.
   *
   * The logger is pre-configured with hookType and input metadata. It writes
   * to configured destinations (file, handlers) but never to stdout/stderr
   * to keep hook output clean for protocol communication.
   *
   * @see {@link Logger} for available methods and configuration
   */
  logger: Logger;
}

// ============================================================================
// Handler Types
// ============================================================================

/**
 * Handler function signature for hook events.
 *
 * Handlers receive the event-specific input payload and a context object.
 * Throwing an error or returning a rejected promise signals failure; the
 * runtime will exit with a non-zero code and log the error.
 *
 * Handlers may be synchronous (return void) or asynchronous (return Promise).
 * Use async when the hook needs to perform I/O operations.
 *
 * @template TInput - The hook input payload type for the specific event
 * @template TContext - The context type, defaults to {@link HookContext}
 *
 * @example
 * ```typescript
 * // Synchronous handler for simple operations
 * const syncHandler: HookHandler<CardHookInput> = (input, context) => {
 *   context.logger.info('Card started', { cardId: input.cardId });
 * };
 *
 * // Async handler for I/O operations
 * const asyncHandler: HookHandler<TypedFileInput> = async (input, context) => {
 *   const content = await fs.readFile(input.filePath, 'utf-8');
 *   context.logger.info('File read', { size: content.length });
 * };
 * ```
 */
export type HookHandler<TInput, TContext extends HookContext = HookContext> = (
  input: TInput,
  context: TContext
) => void | Promise<void>;

/**
 * Callable hook wrapper returned by a factory.
 *
 * This is what you export from hook files. The runtime uses the attached
 * metadata to decide which input shape to build (based on hookEventName)
 * and which timeout to apply. The function itself is invoked with the
 * parsed input and runtime context.
 *
 * The interface combines a callable signature with metadata properties,
 * similar to how Express middleware can have attached properties.
 *
 * @template TInput - The hook input payload type for the specific event
 * @template TContext - The context type, defaults to {@link HookContext}
 *
 * @example
 * ```typescript
 * // A hook function has both callable and metadata aspects
 * const hook: HookFunction<StartCardInput> = Object.assign(
 *   async (input, context) => {
 *     context.logger.info('Card started');
 *   },
 *   {
 *     hookEventName: 'StartCard' as const,
 *     timeout: 5000
 *   }
 * );
 *
 * // Runtime invokes it
 * await hook(input, context);
 *
 * // CLI reads metadata
 * console.log(hook.hookEventName); // 'StartCard'
 * console.log(hook.timeout);       // 5000
 * ```
 */
export interface HookFunction<TInput, TContext extends HookContext = HookContext> {
  /**
   * Invoked by the runtime after building input and context.
   *
   * @param input - Event-specific input payload extracted from environment
   * @param context - Runtime-provided context utilities
   * @returns Resolves when the handler finishes; rejection signals error
   */
  (input: TInput, context: TContext): Promise<void>;

  /**
   * Hook event name used by the runtime for input extraction.
   *
   * The runtime uses this to determine which environment variables to read
   * and how to parse them into the input object.
   */
  hookEventName: HookEventName;

  /**
   * Optional timeout in milliseconds, forwarded to hooks.json.
   *
   * When present, the Cards runtime may enforce this as a hard limit on
   * handler execution time.
   */
  timeout?: number;
}
