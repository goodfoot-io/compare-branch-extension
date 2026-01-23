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
  getExecutionWrapperPid,
  getHookIpcSocket,
  // Individual getters
  getIssueId,
  getTaskId,
  isInteractiveMode
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
  endInterviewHook,
  endIssueHook,
  endTaskHook,
  startInterviewHook,
  startIssueHook,
  startTaskHook
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
  EndInterviewInput,
  EndIssueInput,
  EndTaskInput,
  // Event names
  HookEventName,
  // Discriminated union
  HookInput,
  // Type helper
  HookInputForEvent,
  InterviewHookInput,
  IssueHookInput,
  StartInterviewInput,
  // Specific input types
  StartIssueInput,
  StartTaskInput,
  TaskHookInput
} from './types.js';
export { HOOK_EVENT_NAMES } from './types.js';
