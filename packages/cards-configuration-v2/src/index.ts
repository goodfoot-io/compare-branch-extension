/**
 * @cards/configuration-v2
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
  type ActionEndConfig,
  type ActionEndHandler,
  defineActionEnd
} from './factories/action-end.js';
export {
  type ActionHandler,
  type ActionStartConfig,
  defineActionStart
} from './factories/action-start.js';

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
  type TypeValidatorHandler
} from './factories/type-hooks.js';

// ============================================================================
// Configuration
// ============================================================================

export type {
  ActionPair,
  EnvironmentConfig,
  SettingsConfig,
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
  TypeDefinition
} from './schema.js';

// ============================================================================
// Input Types
// ============================================================================

export type {
  ActionContext,
  ActionEndInput,
  ActionStartInput,
  TypeHookInput,
  TypeValidatorContext,
  TypeValidatorRequest
} from './inputs.js';

// ============================================================================
// Command Types
// ============================================================================

export type {
  ActionEndCommand,
  ActionStartCommand,
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
  getApiAccessToken,
  getApiBaseUrl,
  getCardId,
  getCodingAgent,
  getContentType,
  getEnvironment,
  getExecutionMode,
  getFileName,
  getFilePath,
  getFileSize,
  getSha256,
  getTypeName,
  getTypeVersion
} from './env.js';

// ============================================================================
// Exit Codes
// ============================================================================

export {
  EXIT_CODES,
  type ExitCode,
  exitWithError,
  type HookExecutionResult,
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

export { execute } from './runtime.js';

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
export { createTestRequest, testValidation } from './testing.js';
