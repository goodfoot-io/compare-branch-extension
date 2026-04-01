/**
 * Type-safe configuration authoring for the Cards extension, providing factory
 * functions to define actions and stream transforms along with environment
 * helpers, structured logging, and a runtime executor that compiles
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
// Configuration
// ============================================================================

export type {
  EnvironmentConfig,
  SettingsConfig,
  StreamConfigDefinition
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
  StreamDefinition
} from './schema.js';

// ============================================================================
// Input Types
// ============================================================================

export type {
  ActionContext,
  ActionInput
} from './inputs.js';

// ============================================================================
// Command Types
// ============================================================================

export type { ActionCommand } from './command-types.js';

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
