/**
 * @cards/sdk/config
 *
 * Type-safe configuration library v2 for the Cards Extension with hooks,
 * validators, and type configurations.
 *
 * This module provides action factories, type hook factories, configuration
 * utilities, environment helpers, logging, validation tools, and runtime
 * execution capabilities for Cards Extension integration.
 *
 * @module
 */

// ============================================================================
// Action Factories
// ============================================================================

export {
  type ActionConfig,
  type ActionHandler,
  defineAction
} from './factories/action.js';

// ============================================================================
// Type Hook Factories
// ============================================================================

export {
  defineTypeCreate,
  defineTypeDelete,
  defineTypeUpdate,
  defineTypeValidator,
  type TypeConfig,
  type TypeHandler,
  type TypeValidatorConfig,
  type TypeValidatorHandler
} from './factories/type-hooks.js';

// ============================================================================
// Stream Transform Factories
// ============================================================================

export {
  defineStreamTransform,
  type StreamInitHandler,
  type StreamTransformConfig,
  type StreamTransformHandler
} from './factories/stream-transform.js';

// ============================================================================
// Configuration
// ============================================================================

export type {
  EnvironmentConfig,
  SettingsConfig,
  StreamConfigDefinition,
  TypeConfigDefinition
} from './config.js';
export { defineConfig, serializeSettings } from './define-config.js';

// ============================================================================
// Schema Types
// ============================================================================

export type {
  Action,
  Command,
  Environment,
  Settings,
  StreamDefinition,
  TypeDefinition
} from './schema.js';

// ============================================================================
// Input Types
// ============================================================================

export type {
  ActionContext,
  ActionInput,
  TypeHookContext,
  TypeHookInput,
  TypeValidatorContext,
  ValidatorFileRequest
} from './inputs.js';

// ============================================================================
// Command Types
// ============================================================================

export type {
  ActionCommand,
  StreamInitContext,
  StreamTransformCommand,
  TransformContext,
  TypeCreateCommand,
  TypeDeleteCommand,
  TypeUpdateCommand,
  TypeValidatorCommand
} from './command-types.js';

// ============================================================================
// Type Utilities
// ============================================================================

export type { SameShape } from './type-utils.js';

// ============================================================================
// Environment Variables
// ============================================================================

export {
  CARDS_ENV_VARS,
  extractActionInput,
  extractTypeInput,
  getExecutionMode,
  readSwitchToInteractiveData
} from './env.js';

// ============================================================================
// Exit Codes
// ============================================================================

export {
  EXIT_CODES,
  type ExitCode,
  exitWithError,
  writeError
} from './exit-codes.js';

// ============================================================================
// Logger
// ============================================================================

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
} from './logger.js';

// ============================================================================
// Runtime
// ============================================================================

export { executeCommand } from './runtime.js';

// ============================================================================
// Validation
// ============================================================================

export {
  executeValidation,
  validationError,
  validationSuccess
} from './validation.js';

// ============================================================================
// Validation Result Types (from @cards/protocol)
// ============================================================================

export type {
  ValidationFailure,
  ValidationResult,
  ValidationSuccess
} from '../protocol/index.js';

// ============================================================================
// Testing Utilities
// ============================================================================

export type {
  TestRequestOptions,
  TestValidationOptions,
  TestValidationResult
} from './testing.js';
export { createTestRequest, testValidation } from './testing.js';
