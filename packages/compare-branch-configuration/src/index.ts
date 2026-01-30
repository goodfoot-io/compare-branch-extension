/**
 * Type-safe Compare Branch Extension hooks library.
 *
 * Provides typed hook factories, environment variable extraction,
 * exit code handling, and logging system for building Compare Branch
 * Extension hooks with full type safety.
 * @module
 */

// ============================================================================
// Constants
// ============================================================================

export { HOOK_FACTORY_TO_EVENT } from './constants.js';

// ============================================================================
// Environment Variables
// ============================================================================

export {
  // Environment variable name constants
  COMPARE_BRANCH_ENV_VARS,
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
// Hook Factories
// ============================================================================

export type {
  HookConfig,
  HookContext,
  HookFunction,
  HookHandler
} from './hooks.js';
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
