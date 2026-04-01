/**
 * Type-safe configuration authoring for the Cards extension, providing factory
 * functions to define actions, type hooks, and stream transforms along with
 * environment helpers, structured logging, and a runtime executor that compiles
 * configuration into deployable settings.
 *
 * @summary Configuration authoring and runtime execution for Cards extensions
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
  type TypeConfig,
  type TypeHandler
} from './factories/type-hooks.js';

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
  TypeHookInput
} from './inputs.js';

// ============================================================================
// Command Types
// ============================================================================

export type {
  ActionCommand,
  TypeCreateCommand,
  TypeDeleteCommand,
  TypeUpdateCommand
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
