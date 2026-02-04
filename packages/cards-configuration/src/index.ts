/**
 * Type-safe Cards Extension configuration and hooks library.
 *
 * This is the primary entry point for action authors. It re-exports action
 * factories, runtime helpers, validation tools, and shared types so your
 * project can depend on a single module for all Cards Extension integration.
 *
 * ## Quick Start
 *
 * Most developers need just the action factories:
 *
 * ```typescript
 * import { actionStart, actionEnd, typeValidator } from '@cards/configuration';
 *
 * // Define an action
 * export default actionStart(
 *   { actionName: 'My Action', description: 'Does something useful' },
 *   async (input, { logger }) => {
 *     logger.info('Action started', { cardId: input.cardId });
 *   }
 * );
 * ```
 *
 * ## Module Organization
 *
 * - **Action Factories**: {@link actionStart}, {@link actionEnd}, {@link typeValidator}, etc.
 * - **Constants**: Factory type names for tooling integration
 * - **Environment**: Helpers for reading hook environment variables
 * - **Exit Codes**: Standard exit codes and error utilities
 * - **Logger**: Structured logging with event subscription
 * - **Runtime**: The {@link execute} function used by compiled hooks
 * - **Scaffold**: Project scaffolding utilities
 * - **Types**: Input payloads and event name definitions
 * - **Validation**: Type validation helpers and HTTP parsing
 * - **Testing**: Test utilities for validation hooks
 *
 * @module
 * @see {@link actionStart} for creating action handlers
 * @see {@link typeValidator} for creating type validators
 * @see {@link execute} for runtime execution details
 */

// ============================================================================
// Action Factories (New)
// ============================================================================

export type {
  ActionContext,
  ActionEndCommand,
  ActionEndConfig,
  ActionEndInput,
  ActionHandler,
  ActionStartCommand,
  ActionStartConfig,
  ActionStartInput,
  TypeConfig,
  TypeCreateCommand,
  TypeDeleteCommand,
  TypeHandler,
  TypeHookInput,
  TypeUpdateCommand,
  TypeValidatorCommand
} from './actions.js';
export {
  actionEnd,
  actionStart,
  typeCreate,
  typeDelete,
  typeUpdate,
  typeValidator
} from './actions.js';

// ============================================================================
// Constants
// ============================================================================

export type { ActionFactoryType, FactoryType, TypeFactoryType } from './constants.js';
export {
  ACTION_FACTORY_NAMES,
  ALL_FACTORY_NAMES,
  HOOK_FACTORY_TO_EVENT,
  TYPE_FACTORY_NAMES
} from './constants.js';

// ============================================================================
// Environment Variables
// ============================================================================

export {
  // Environment variable name constants
  CARDS_ENV_VARS,
  // Typed extraction
  extractInput,
  // Individual getters
  getCardId,
  getExecutionWrapperPid,
  getHookIpcSocket
} from './env.js';

// ============================================================================
// Exit Codes
// ============================================================================

export type { ExitCode, HookExecutionResult } from './exit-codes.js';
export {
  EXIT_CODES,
  exitWithError,
  writeError
} from './exit-codes.js';

// ============================================================================
// Hook Types (for runtime compatibility)
// ============================================================================

export type {
  HookConfig,
  HookContext,
  HookFunction,
  HookHandler
} from './hooks.js';

// ============================================================================
// Logger
// ============================================================================

export type {
  LogEvent,
  LogEventError,
  LogEventHandler,
  LoggerConfig,
  LogLevel,
  Unsubscribe
} from './logger.js';
export { LOG_LEVELS, Logger, logger } from './logger.js';

// ============================================================================
// Runtime
// ============================================================================

export { execute } from './runtime.js';

// ============================================================================
// Scaffold
// ============================================================================

export type { ScaffoldOptions } from './scaffold.js';
export { scaffoldProject } from './scaffold.js';

// ============================================================================
// Types
// ============================================================================

export type {
  // Base types
  BaseHookInput,
  CardHookInput,
  EndCardInput,
  EndInterviewInput,
  // Event names
  HookEventName,
  // Discriminated union
  HookInput,
  // Type helper
  HookInputForEvent,
  InterviewHookInput,
  // Specific input types
  StartCardInput,
  StartInterviewInput,
  TypedFileCreatedInput,
  TypedFileDeletedInput,
  TypedFileUpdatedInput
} from './types.js';
export { HOOK_EVENT_NAMES } from './types.js';

// ============================================================================
// Validation
// ============================================================================

export { parseHttpRequest } from './http-parser.js';
export type {
  ValidationConfig,
  ValidationContext,
  ValidationError,
  ValidationFunction,
  ValidationHandler,
  ValidationRequest,
  ValidationResponse
} from './validation.js';
export {
  executeValidation,
  typeValidation,
  validationCreated,
  validationError,
  validationResponse,
  validationUpdated
} from './validation.js';

// ============================================================================
// Testing Utilities
// ============================================================================

export type {
  TestRequestOptions,
  TestValidationOptions,
  TestValidationResult
} from './testing.js';
export {
  createTestRequest,
  testValidation
} from './testing.js';
