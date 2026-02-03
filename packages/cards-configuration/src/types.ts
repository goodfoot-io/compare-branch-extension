/**
 * Type definitions for Cards Extension hook inputs and events.
 *
 * These types describe the payloads derived from execution-wrapper environment
 * variables and are used by hook factories and the runtime to provide
 * event-specific typing.
 * @see documentation/cards-v2-planning/hook-based-workflow.md
 * @module
 */

// ============================================================================
// Hook Event Names
// ============================================================================

/**
 * Hook event name literal union.
 *
 * These event names appear in hooks.json and drive which input payload is
 * built by {@link extractInput}.
 */
export type HookEventName =
  | 'StartCard'
  | 'EndCard'
  | 'StartInterview'
  | 'EndInterview'
  | 'TypedFileCreated'
  | 'TypedFileUpdated'
  | 'TypedFileDeleted';

/**
 * All hook event names as a readonly array.
 *
 * Useful for iteration and validation. The order is stable and matches the
 * literal union defined in this module.
 * @example
 * ```typescript
 * for (const eventName of HOOK_EVENT_NAMES) {
 *   console.log(`Supported hook: ${eventName}`);
 * }
 * ```
 */
export const HOOK_EVENT_NAMES = [
  'StartCard',
  'EndCard',
  'StartInterview',
  'EndInterview',
  'TypedFileCreated',
  'TypedFileUpdated',
  'TypedFileDeleted'
] as const satisfies readonly HookEventName[];

// ============================================================================
// Hook Input Types
// ============================================================================

/**
 * Base input fields present in every hook invocation.
 *
 * These values come directly from environment variables injected by the
 * execution wrapper. Hook-specific inputs extend this base with extra fields.
 * @example
 * ```typescript
 * const handleAnyHook = (input: BaseHookInput) => {
 *   console.log(`Card: ${input.cardId}`);
 *   console.log(`Wrapper PID: ${input.executionWrapperPid}`);
 *   console.log(`IPC Socket: ${input.hookIpcSocket}`);
 * };
 * ```
 */
export interface BaseHookInput {
  /**
   * Unique identifier for the current card.
   */
  cardId: string;

  /**
   * Process ID of the execution wrapper.
   */
  executionWrapperPid: number;

  /**
   * Path to the IPC socket for hook-to-wrapper communication.
   * Created by execution-wrapper.mjs for each hook process.
   */
  hookIpcSocket: string;
}

/**
 * Input for card-level hooks (StartCard, EndCard).
 *
 * Uses only the base input fields - no task-specific context.
 */
export interface CardHookInput extends BaseHookInput {}

/**
 * Input for interview hooks (StartInterview, EndInterview).
 *
 * Uses only the base input fields - interviews are always interactive.
 */
export interface InterviewHookInput extends BaseHookInput {}

/**
 * Input for typed file hooks (TypedFileCreated, TypedFileUpdated, TypedFileDeleted).
 *
 * Includes file metadata computed by the execution wrapper (name, path, size,
 * hash) plus optional validator metadata when available.
 */
export interface TypedFileInput extends BaseHookInput {
  /**
   * The registered type name.
   */
  typeName: string;

  /**
   * The file name within the type directory.
   */
  fileName: string;

  /**
   * Full path to the file.
   */
  filePath: string;

  /**
   * MIME type of the content.
   */
  contentType: string;

  /**
   * File size in bytes.
   */
  size: number;

  /**
   * SHA256 hash of content.
   */
  sha256: string;

  /**
   * Version from type config.
   */
  typeVersion: string;

  /**
   * Optional metadata produced by a type validator.
   */
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Specific Input Type Aliases
// ============================================================================

/**
 * Input type for StartCard hooks.
 */
export type StartCardInput = CardHookInput;

/**
 * Input type for EndCard hooks.
 */
export type EndCardInput = CardHookInput;

/**
 * Input type for StartInterview hooks.
 */
export type StartInterviewInput = InterviewHookInput;

/**
 * Input type for EndInterview hooks.
 */
export type EndInterviewInput = InterviewHookInput;

/**
 * Input type for TypedFileCreated hooks.
 */
export type TypedFileCreatedInput = TypedFileInput;

/**
 * Input type for TypedFileUpdated hooks.
 */
export type TypedFileUpdatedInput = TypedFileInput;

/**
 * Input type for TypedFileDeleted hooks.
 */
export type TypedFileDeletedInput = TypedFileInput;

// ============================================================================
// Discriminated Union
// ============================================================================

/**
 * Discriminated union of all hook input payloads.
 *
 * Use this type when you need to handle multiple hook events in one place.
 * The `hookEventName` field is the discriminant for safe narrowing.
 * @example
 * ```typescript
 * function handleHook(input: HookInput) {
 *   switch (input.hookEventName) {
 *     case 'StartCard':
 *       console.log(`Card: ${input.cardId}`);
 *       break;
 *     case 'StartInterview':
 *       console.log(`Interview for card: ${input.cardId}`);
 *       break;
 *   }
 * }
 * ```
 */
export type HookInput =
  | ({ hookEventName: 'StartCard' } & StartCardInput)
  | ({ hookEventName: 'EndCard' } & EndCardInput)
  | ({ hookEventName: 'StartInterview' } & StartInterviewInput)
  | ({ hookEventName: 'EndInterview' } & EndInterviewInput)
  | ({ hookEventName: 'TypedFileCreated' } & TypedFileCreatedInput)
  | ({ hookEventName: 'TypedFileUpdated' } & TypedFileUpdatedInput)
  | ({ hookEventName: 'TypedFileDeleted' } & TypedFileDeletedInput);

// ============================================================================
// Type Helpers
// ============================================================================

/**
 * Type helper for extracting the input payload for a specific event.
 *
 * This is the type-level companion to {@link extractInput}.
 * @template T - The hook event name
 * @example
 * ```typescript
 * type StartCardIn = HookInputForEvent<'StartCard'>;
 * // StartCardIn is StartCardInput & { hookEventName: 'StartCard' }
 * ```
 */
export type HookInputForEvent<T extends HookEventName> = Extract<HookInput, { hookEventName: T }>;
