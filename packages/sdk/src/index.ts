/**
 * Unified SDK for the Cards V2 extension ecosystem, consolidating protocol
 * type definitions, HTTP/WebSocket client capabilities, and type-safe
 * configuration authoring into a single importable surface.
 *
 * @summary Cards V2 SDK combining protocol types, client, and configuration utilities
 * @module
 */

export {
  CARDS_DIR_NAME,
  generateRepoId,
  resolveGlobalCardsConfigDir,
  resolveWorktreeDir,
  resolveWorktreesRoot
} from './cards-config.js';
// Re-export all protocol types at the top level for convenience
export * from './protocol/index.js';

// Re-export configuration exports, excluding names that collide with protocol.
// The colliding configuration types (Action, Command, Environment, Settings,
// StreamDefinition) are available via the `@cards/sdk/config` subpath export.

// --- Command Types ---
export type { ActionCommand } from './config/command-types.js';
// --- Configuration ---
export type {
  EnvironmentConfig,
  SettingsConfig,
  StreamConfigDefinition
} from './config/config.js';
export { defineConfig, serializeSettings } from './config/define-config.js';
// --- Environment Variables ---
export {
  CARDS_ENV_VARS,
  extractActionInput,
  getExecutionMode,
  readSwitchToInteractiveData,
  resolveExtensionPath
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
// --- Input Types ---
export type {
  ActionContext,
  ActionInput
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
// --- Type Utilities ---
export type { SameShape } from './config/type-utils.js';
// --- Process Tree ---
export { findAgentPid, PROCESS_TREE_MAX_DEPTH } from './process-tree.js';
// --- Session Resolver ---
export { resolveSessionId } from './session-resolver.js';
