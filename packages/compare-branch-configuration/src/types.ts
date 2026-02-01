/**
 * Type definitions for Cards Extension hooks.
 *
 * This module provides:
 * - Hook input types (environment variable based)
 * - Hook event name union type
 * - Type helper for extracting input type from event name
 * @see documentation/cards-v2-planning/hook-based-workflow.md
 * @module
 */

// ============================================================================
// Hook Event Names
// ============================================================================

/**
 * Hook event name literal union.
 *
 * All valid hook event names for Cards Extension hooks.
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
 * Useful for iteration and validation.
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
 * Base input fields present in all hook inputs.
 *
 * Every hook receives these base fields providing execution context.
 * Hook-specific inputs extend this base with additional fields.
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
 * Provides file metadata and validation context for custom type files.
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
   * Optional metadata from validator.
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
 * Discriminated union of all hook input types.
 *
 * Use this type when handling multiple hook types in a single handler
 * or when the hook type is not known statically.
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
 * Type helper for extracting input type from event name.
 *
 * @template T - The hook event name
 * @example
 * ```typescript
 * type StartCardIn = HookInputForEvent<'StartCard'>;
 * // StartCardIn is StartCardInput & { hookEventName: 'StartCard' }
 * ```
 */
export type HookInputForEvent<T extends HookEventName> = Extract<HookInput, { hookEventName: T }>;
