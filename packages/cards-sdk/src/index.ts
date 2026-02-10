/**
 * @cards/sdk
 *
 * Unified SDK for the Cards V2 extension ecosystem.
 * Consolidates protocol types, client SDK, and configuration into a single package.
 *
 * @packageDocumentation
 */

// Re-export all protocol types at the top level for convenience
export * from './protocol/index.js';

// Re-export configuration exports, excluding names that collide with protocol.
// The colliding configuration types (Action, Command, Environment, Settings,
// StreamDefinition, TypeDefinition, TypeConfig, TransformContext) are available
// via the `@cards/sdk/config` subpath export.
// ValidationFailure, ValidationResult, ValidationSuccess are re-exported from
// protocol by the configuration barrel and are identical -- excluded here to
// avoid duplicate-export errors.

// --- Command Types (excluding TransformContext) ---
export type {
  ActionCommand,
  StreamInitContext,
  StreamTransformCommand,
  TypeCreateCommand,
  TypeDeleteCommand,
  TypeUpdateCommand,
  TypeValidatorCommand
} from './configuration/command-types.js';
// --- Configuration ---
export type {
  EnvironmentConfig,
  SettingsConfig,
  StreamConfigDefinition,
  TypeConfigDefinition
} from './configuration/config.js';
export { defineConfig, serializeSettings } from './configuration/define-config.js';
// --- Environment Variables ---
export {
  CARDS_ENV_VARS,
  extractActionInput,
  extractTypeInput,
  getExecutionMode,
  readSwitchToInteractiveData
} from './configuration/env.js';
// --- Exit Codes ---
export {
  EXIT_CODES,
  type ExitCode,
  exitWithError,
  writeError
} from './configuration/exit-codes.js';
// --- Action Factories ---
export {
  type ActionConfig,
  type ActionHandler,
  defineAction
} from './configuration/factories/action.js';
// --- Stream Transform Factories ---
export {
  defineStreamTransform,
  type StreamInitHandler,
  type StreamTransformConfig,
  type StreamTransformHandler
} from './configuration/factories/stream-transform.js';
// --- Type Hook Factories (excluding TypeConfig) ---
export {
  defineTypeCreate,
  defineTypeDelete,
  defineTypeUpdate,
  defineTypeValidator,
  type TypeHandler,
  type TypeValidatorHandler
} from './configuration/factories/type-hooks.js';
// --- Input Types ---
export type {
  ActionContext,
  ActionInput,
  TypeHookContext,
  TypeHookInput,
  TypeValidatorContext,
  ValidatorFileRequest
} from './configuration/inputs.js';
// --- Logger ---
export {
  type ILogger,
  LOG_LEVELS,
  type LogEvent,
  type LogEventError,
  type LogEventHandler,
  Logger,
  type LoggerConfig,
  type LogLevel,
  logger,
  type Unsubscribe
} from './configuration/logger.js';
// --- Runtime ---
export { executeCommand } from './configuration/runtime.js';
// --- Testing Utilities ---
export type {
  TestRequestOptions,
  TestValidationOptions,
  TestValidationResult
} from './configuration/testing.js';
export { createTestRequest, testValidation } from './configuration/testing.js';
// --- Type Utilities ---
export type { SameShape } from './configuration/type-utils.js';
// --- Validation ---
export {
  executeValidation,
  validationError,
  validationSuccess
} from './configuration/validation.js';
