/**
 * Type-safe Compare Branch Extension hooks library.
 *
 * Provides typed hook factories, environment variable extraction,
 * exit code handling, and logging system for building Compare Branch
 * Extension hooks with full type safety.
 * @module
 */
export { HOOK_FACTORY_TO_EVENT } from './constants.js';
export { COMPARE_BRANCH_ENV_VARS, extractInput, getExecutionWrapperPid, getHookIpcSocket, getIssueId } from './env.js';
export type { ExitCode, HookExecutionResult } from './exit-codes.js';
export { EXIT_CODES, exitWithError, writeError } from './exit-codes.js';
export type { HookConfig, HookContext, HookFunction, HookHandler } from './hooks.js';
export {
  endInterviewHook,
  endIssueHook,
  startInterviewHook,
  startIssueHook,
  typedFileCreatedHook,
  typedFileDeletedHook,
  typedFileUpdatedHook
} from './hooks.js';
export type { LogEvent, LogEventError, LogEventHandler, LoggerConfig, LogLevel, Unsubscribe } from './logger.js';
export { LOG_LEVELS, Logger, logger } from './logger.js';
export { execute } from './runtime.js';
export type { ScaffoldOptions } from './scaffold.js';
export { scaffoldProject } from './scaffold.js';
export type {
  BaseHookInput,
  EndInterviewInput,
  EndIssueInput,
  HookEventName,
  HookInput,
  HookInputForEvent,
  InterviewHookInput,
  IssueHookInput,
  StartInterviewInput,
  StartIssueInput,
  TypedFileCreatedInput,
  TypedFileDeletedInput,
  TypedFileUpdatedInput
} from './types.js';
export { HOOK_EVENT_NAMES } from './types.js';
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
export type { TestRequestOptions, TestValidationOptions, TestValidationResult } from './testing.js';
export { createTestRequest, testValidation } from './testing.js';
//# sourceMappingURL=index.d.ts.map
