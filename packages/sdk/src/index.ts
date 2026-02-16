/**
 * Unified SDK for the Cards V2 extension ecosystem, consolidating protocol
 * type definitions, HTTP/WebSocket client capabilities, and type-safe
 * configuration authoring into a single importable surface.
 *
 * @summary Cards V2 SDK combining protocol types, client, and configuration utilities
 * @module
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
} from './config/command-types.js';
// --- Configuration ---
export type {
  EnvironmentConfig,
  SettingsConfig,
  StreamConfigDefinition,
  TypeConfigDefinition
} from './config/config.js';
export { defineConfig, serializeSettings } from './config/define-config.js';
// --- Environment Variables ---
export {
  CARDS_ENV_VARS,
  extractActionInput,
  extractTypeInput,
  getExecutionMode,
  readSwitchToInteractiveData
} from './config/env.js';
// --- Exit Codes ---
export {
  EXIT_CODES,
  type ExitCode,
  exitWithError,
  writeError
} from './config/exit-codes.js';
// --- Action Factories ---
export {
  type ActionConfig,
  type ActionHandler,
  defineAction
} from './config/factories/action.js';
// --- Stream Transform Factories ---
export {
  defineStreamTransform,
  type StreamInitHandler,
  type StreamTransformConfig,
  type StreamTransformHandler
} from './config/factories/stream-transform.js';
// --- Type Hook Factories (excluding TypeConfig) ---
export {
  defineTypeCreate,
  defineTypeDelete,
  defineTypeUpdate,
  defineTypeValidator,
  type TypeHandler,
  type TypeValidatorHandler
} from './config/factories/type-hooks.js';
// --- Input Types ---
export type {
  ActionContext,
  ActionInput,
  TypeHookContext,
  TypeHookInput,
  TypeValidatorContext,
  ValidatorFileRequest
} from './config/inputs.js';
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
} from './config/logger.js';
// --- Runtime ---
export { executeCommand } from './config/runtime.js';
// --- Testing Utilities ---
export type {
  TestRequestOptions,
  TestValidationOptions,
  TestValidationResult
} from './config/testing.js';
export { createTestRequest, testValidation } from './config/testing.js';
// --- Type Utilities ---
export type { SameShape } from './config/type-utils.js';
// --- Validation ---
export {
  executeValidation,
  validationError,
  validationSuccess
} from './config/validation.js';
