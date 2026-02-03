/**
 * Hook factory functions for Cards Extension hooks.
 *
 * Each factory wraps a handler and attaches metadata (`hookEventName`, `timeout`)
 * that the CLI uses for hooks.json generation and the runtime uses for input
 * extraction. Export the returned function as the default export of a hook file
 * so the CLI can discover it without evaluating your module.
 * @module
 * @example
 * ```typescript
 * import { startCardHook } from '@cards/configuration';
 *
 * export default startCardHook({}, async (input, { logger }) => {
 *   logger.info('Card starting', { cardId: input.cardId });
 * });
 * ```
 */

import type { Logger } from './logger.js';
import type {
  EndCardInput,
  EndInterviewInput,
  HookEventName,
  StartCardInput,
  StartInterviewInput,
  TypedFileCreatedInput,
  TypedFileDeletedInput,
  TypedFileUpdatedInput
} from './types.js';

// ============================================================================
// Configuration Types
// ============================================================================

/**
 * Configuration options that become metadata on the hook function.
 *
 * The CLI reads this metadata to populate hooks.json. The SDK does not enforce
 * timeouts locally; enforcement (if any) happens in the Cards runtime.
 * @example
 * ```typescript
 * // Set a handler timeout for the Cards runtime to enforce.
 * startCardHook({ timeout: 5000 }, handler);
 * ```
 */
export interface HookConfig {
  /**
   * Maximum handler runtime in milliseconds.
   *
   * This value is forwarded to hooks.json. If the Cards runtime enforces
   * timeouts, it will terminate the hook after this duration. Omitting it
   * lets the runtime apply its default policy.
   * @example
   * ```typescript
   * { timeout: 5000 }  // 5 second timeout
   * { timeout: 30000 } // 30 second timeout for long operations
   * ```
   */
  timeout?: number;
}

// ============================================================================
// Context Types
// ============================================================================

/**
 * Context injected by the runtime when a hook executes.
 *
 * The context is created by {@link execute} and already scoped to the current
 * hook, so logs are enriched with hook metadata automatically. Do not construct
 * this manually; it is intentionally small and runtime-owned.
 * @example
 * ```typescript
 * export default startCardHook({}, async (input, { logger }) => {
 *   logger.info('Processing card', { cardId: input.cardId });
 * });
 * ```
 */
export interface HookContext {
  /**
   * Logger for structured, context-aware logging.
   *
   * The logger is pre-configured with hookType and input, and it does not write
   * to stdout/stderr unless you configure destinations.
   */
  logger: Logger;
}

// ============================================================================
// Handler Types
// ============================================================================

/**
 * Handler function for a specific hook event.
 *
 * Throwing or rejecting signals failure and results in a non-zero exit code
 * from the runtime. Use async when the hook needs to await I/O.
 * @template TInput - Hook input payload for the event
 * @template TContext - Context type (defaults to HookContext)
 */
export type HookHandler<TInput, TContext extends HookContext = HookContext> = (
  input: TInput,
  context: TContext
) => void | Promise<void>;

/**
 * Callable hook wrapper returned by a factory.
 *
 * This is what you export from hook files. The runtime uses its metadata to
 * decide which input shape to build and which timeout to apply.
 * @template TInput - Hook input payload for the event
 * @template TContext - Context type (defaults to HookContext)
 */
export interface HookFunction<TInput, TContext extends HookContext = HookContext> {
  /**
   * Invoked by the runtime after it has built the input and context.
   * @param input - Event-specific input payload
   * @param context - Runtime-provided context utilities
   * @returns Resolves when the handler finishes
   */
  (input: TInput, context: TContext): Promise<void>;

  /**
   * Hook event name used by the runtime for input extraction.
   */
  hookEventName: HookEventName;

  /**
   * Optional timeout in milliseconds forwarded to hooks.json.
   */
  timeout?: number;
}

// ============================================================================
// Generic Factory
// ============================================================================

/**
 * Creates a hook wrapper and attaches discovery metadata.
 *
 * The wrapper preserves async behavior and stores `hookEventName` and `timeout`
 * on the function object so the runtime and CLI can inspect it later.
 * @param hookEventName - The event name to bind to this handler
 * @param config - Hook configuration metadata
 * @param handler - The handler function to wrap
 * @returns A callable hook wrapper with attached metadata
 * @internal
 */
function createHookFunction<TInput, TContext extends HookContext = HookContext>(
  hookEventName: HookEventName,
  config: HookConfig,
  handler: HookHandler<TInput, TContext>
): HookFunction<TInput, TContext> {
  const hookFn = async (input: TInput, context: TContext): Promise<void> => {
    await handler(input, context);
  };

  // Attach metadata for runtime inspection
  hookFn.hookEventName = hookEventName;
  hookFn.timeout = config.timeout;

  return hookFn;
}

// ============================================================================
// StartCard Hook Factory
// ============================================================================

/**
 * Creates a StartCard hook handler.
 *
 * StartCard runs at the beginning of a card execution. Use it for setup,
 * instrumentation, or early validation that should gate the rest of the run.
 * @param config - Hook metadata (timeout, etc.)
 * @param handler - Handler invoked for StartCard events
 * @returns A hook wrapper suitable for default export
 * @example
 * ```typescript
 * import { startCardHook } from '@cards/configuration';
 *
 * export default startCardHook({}, async (input, { logger }) => {
 *   logger.info('Card started', { cardId: input.cardId });
 * });
 * ```
 */
export function startCardHook(config: HookConfig, handler: HookHandler<StartCardInput>): HookFunction<StartCardInput> {
  return createHookFunction('StartCard', config, handler);
}

// ============================================================================
// EndCard Hook Factory
// ============================================================================

/**
 * Creates an EndCard hook handler.
 *
 * EndCard runs after a card execution completes. Use it for cleanup,
 * summarization, or reporting that should happen after work finishes.
 * @param config - Hook metadata (timeout, etc.)
 * @param handler - Handler invoked for EndCard events
 * @returns A hook wrapper suitable for default export
 * @example
 * ```typescript
 * import { endCardHook } from '@cards/configuration';
 *
 * export default endCardHook({}, async (input, { logger }) => {
 *   logger.info('Card completed', { cardId: input.cardId });
 * });
 * ```
 */
export function endCardHook(config: HookConfig, handler: HookHandler<EndCardInput>): HookFunction<EndCardInput> {
  return createHookFunction('EndCard', config, handler);
}

// ============================================================================
// StartInterview Hook Factory
// ============================================================================

/**
 * Creates a StartInterview hook handler.
 *
 * StartInterview runs when an interview session begins. Use it for
 * instrumentation or to prepare any interview-specific resources.
 * @param config - Hook metadata (timeout, etc.)
 * @param handler - Handler invoked for StartInterview events
 * @returns A hook wrapper suitable for default export
 * @example
 * ```typescript
 * import { startInterviewHook } from '@cards/configuration';
 *
 * export default startInterviewHook({}, async (input, { logger }) => {
 *   logger.info('Interview started', { cardId: input.cardId });
 * });
 * ```
 */
export function startInterviewHook(
  config: HookConfig,
  handler: HookHandler<StartInterviewInput>
): HookFunction<StartInterviewInput> {
  return createHookFunction('StartInterview', config, handler);
}

// ============================================================================
// EndInterview Hook Factory
// ============================================================================

/**
 * Creates an EndInterview hook handler.
 *
 * EndInterview runs after an interview completes. Use it for cleanup,
 * scoring, or post-interview reporting.
 * @param config - Hook metadata (timeout, etc.)
 * @param handler - Handler invoked for EndInterview events
 * @returns A hook wrapper suitable for default export
 * @example
 * ```typescript
 * import { endInterviewHook } from '@cards/configuration';
 *
 * export default endInterviewHook({}, async (input, { logger }) => {
 *   logger.info('Interview completed', { cardId: input.cardId });
 * });
 * ```
 */
export function endInterviewHook(
  config: HookConfig,
  handler: HookHandler<EndInterviewInput>
): HookFunction<EndInterviewInput> {
  return createHookFunction('EndInterview', config, handler);
}

// ============================================================================
// TypedFileCreated Hook Factory
// ============================================================================

/**
 * Creates a TypedFileCreated hook handler.
 *
 * TypedFileCreated runs when a new typed file is created. Inputs include file
 * metadata (type name, path, hash) so you can validate or react to changes.
 * @param config - Hook metadata (timeout, etc.)
 * @param handler - Handler invoked for TypedFileCreated events
 * @returns A hook wrapper suitable for default export
 * @example
 * ```typescript
 * import { typedFileCreatedHook } from '@cards/configuration';
 *
 * export default typedFileCreatedHook({}, async (input, { logger }) => {
 *   logger.info('Typed file created', { typeName: input.typeName, fileName: input.fileName });
 * });
 * ```
 */
export function typedFileCreatedHook(
  config: HookConfig,
  handler: HookHandler<TypedFileCreatedInput>
): HookFunction<TypedFileCreatedInput> {
  return createHookFunction('TypedFileCreated', config, handler);
}

// ============================================================================
// TypedFileUpdated Hook Factory
// ============================================================================

/**
 * Creates a TypedFileUpdated hook handler.
 *
 * TypedFileUpdated runs when a typed file changes. Use this to validate edits
 * or recompute derived metadata when content updates.
 * @param config - Hook metadata (timeout, etc.)
 * @param handler - Handler invoked for TypedFileUpdated events
 * @returns A hook wrapper suitable for default export
 * @example
 * ```typescript
 * import { typedFileUpdatedHook } from '@cards/configuration';
 *
 * export default typedFileUpdatedHook({}, async (input, { logger }) => {
 *   logger.info('Typed file updated', { typeName: input.typeName, fileName: input.fileName });
 * });
 * ```
 */
export function typedFileUpdatedHook(
  config: HookConfig,
  handler: HookHandler<TypedFileUpdatedInput>
): HookFunction<TypedFileUpdatedInput> {
  return createHookFunction('TypedFileUpdated', config, handler);
}

// ============================================================================
// TypedFileDeleted Hook Factory
// ============================================================================

/**
 * Creates a TypedFileDeleted hook handler.
 *
 * TypedFileDeleted runs when a typed file is removed. Use it to clean up any
 * derived state or external references tied to that file.
 * @param config - Hook metadata (timeout, etc.)
 * @param handler - Handler invoked for TypedFileDeleted events
 * @returns A hook wrapper suitable for default export
 * @example
 * ```typescript
 * import { typedFileDeletedHook } from '@cards/configuration';
 *
 * export default typedFileDeletedHook({}, async (input, { logger }) => {
 *   logger.info('Typed file deleted', { typeName: input.typeName, fileName: input.fileName });
 * });
 * ```
 */
export function typedFileDeletedHook(
  config: HookConfig,
  handler: HookHandler<TypedFileDeletedInput>
): HookFunction<TypedFileDeletedInput> {
  return createHookFunction('TypedFileDeleted', config, handler);
}
