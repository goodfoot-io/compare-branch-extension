/**
 * Type-safe Cards Extension hooks library.
 *
 * This is the primary entrypoint for hook authors. It re-exports hook
 * factories, runtime helpers, validation tools, and shared types so a hook
 * project can depend on a single module.
 * @module
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
// Hook Factories (Deprecated)
// ============================================================================

export type {
  HookConfig,
  HookContext,
  HookFunction,
  HookHandler
} from './hooks.js';
/**
 * @deprecated Use actionStart/actionEnd instead
 */
export {
  endCardHook,
  endInterviewHook,
  startCardHook,
  startInterviewHook,
  typedFileCreatedHook,
  typedFileDeletedHook,
  typedFileUpdatedHook
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
