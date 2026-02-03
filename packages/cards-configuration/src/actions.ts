/**
 * Action factory functions for Cards Extension actions.
 *
 * Each factory wraps a handler and attaches metadata that the CLI uses for
 * settings.json generation and the runtime uses for input extraction.
 * @module
 */

import type { Logger } from './logger.js';

// ============================================================================
// Input Types
// ============================================================================

/**
 * Input for action start/end handlers.
 *
 * These values come from environment variables injected by the action
 * dispatcher when spawning action commands.
 */
export interface ActionStartInput {
  /**
   * Unique identifier for the current card.
   */
  cardId: string;

  /**
   * The environment name this action belongs to.
   */
  environment: string;

  /**
   * Card's execution mode.
   */
  executionMode: 'interactive' | 'background';

  /**
   * Cards server base URL for API calls.
   */
  apiBaseUrl: string;

  /**
   * Authentication token for API calls.
   */
  apiAccessToken: string;

  /**
   * Value of `cards.codingAgent` from settings.
   */
  codingAgent?: string;
}

/**
 * Input for action end handlers.
 *
 * Identical to ActionStartInput - end is only invoked when start exits with
 * code 0, so no exit code field is needed.
 */
export type ActionEndInput = ActionStartInput;

/**
 * Input for type lifecycle hooks.
 *
 * These values come from environment variables injected when typed file
 * events are dispatched.
 */
export interface TypeHookInput {
  /**
   * Unique identifier for the current card.
   */
  cardId: string;

  /**
   * The environment name.
   */
  environment: string;

  /**
   * The type name (e.g., `adaptive-card`).
   */
  typeName: string;

  /**
   * The type's version string.
   */
  typeVersion: string;

  /**
   * The filename within the type directory.
   */
  fileName: string;

  /**
   * Full absolute path to the file.
   */
  filePath: string;

  /**
   * File size in bytes.
   */
  fileSize: number;

  /**
   * SHA256 hash of file content.
   */
  fileSha256: string;

  /**
   * MIME type of the file.
   */
  contentType: string;

  /**
   * Cards server base URL for API calls.
   */
  apiBaseUrl: string;

  /**
   * Authentication token for API calls.
   */
  apiAccessToken: string;
}

// ============================================================================
// Context Types
// ============================================================================

/**
 * Context injected by the runtime when an action executes.
 *
 * The context is created by the runtime and provides utilities for logging
 * and accessing the working directory.
 */
export interface ActionContext {
  /**
   * Logger for structured, context-aware logging.
   */
  logger: Logger;

  /**
   * Current working directory for the action.
   */
  cwd: string;
}

// ============================================================================
// Handler Types
// ============================================================================

/**
 * Handler function for action start/end events.
 *
 * Throwing or rejecting signals failure and results in a non-zero exit code
 * from the runtime.
 */
export type ActionHandler = (input: ActionStartInput | ActionEndInput, context: ActionContext) => void | Promise<void>;

/**
 * Handler function for type lifecycle events.
 *
 * Throwing or rejecting signals failure and results in a non-zero exit code
 * from the runtime.
 */
export type TypeHandler = (input: TypeHookInput, context: ActionContext) => void | Promise<void>;

// ============================================================================
// Configuration Types
// ============================================================================

/**
 * Configuration for actionStart factory.
 *
 * All metadata except `actionName` is optional and forwarded to settings.json.
 */
export interface ActionStartConfig {
  /**
   * The action name used to group start/end commands.
   */
  actionName: string;

  /**
   * Human-readable description shown in button tooltip.
   */
  description?: string;

  /**
   * Path to icon file (supports path variables).
   */
  icon?: string;

  /**
   * Whether execution mode toggle is shown (default: false).
   */
  supportsBackgroundMode?: boolean;

  /**
   * Whether multiple instances can run on same card (default: false).
   */
  allowConcurrent?: boolean;

  /**
   * Timeout in milliseconds.
   */
  timeout?: number;
}

/**
 * Configuration for actionEnd factory.
 */
export interface ActionEndConfig {
  /**
   * The action name used to group start/end commands.
   */
  actionName: string;

  /**
   * Timeout in milliseconds.
   */
  timeout?: number;
}

/**
 * Configuration for type factories.
 */
export interface TypeConfig {
  /**
   * The type name (e.g., `adaptive-card`).
   */
  typeName: string;

  /**
   * Timeout in milliseconds.
   */
  timeout?: number;
}

// ============================================================================
// Command Types (Return Types)
// ============================================================================

/**
 * Action start command returned by actionStart factory.
 */
export interface ActionStartCommand {
  (input: ActionStartInput, context: ActionContext): Promise<void>;
  factoryType: 'actionStart';
  actionName: string;
  description?: string;
  icon?: string;
  supportsBackgroundMode?: boolean;
  allowConcurrent?: boolean;
  timeout?: number;
}

/**
 * Action end command returned by actionEnd factory.
 */
export interface ActionEndCommand {
  (input: ActionEndInput, context: ActionContext): Promise<void>;
  factoryType: 'actionEnd';
  actionName: string;
  timeout?: number;
}

/**
 * Type validator command returned by typeValidator factory.
 */
export interface TypeValidatorCommand {
  (input: TypeHookInput, context: ActionContext): Promise<void>;
  factoryType: 'typeValidator';
  typeName: string;
  timeout?: number;
}

/**
 * Type create command returned by typeCreate factory.
 */
export interface TypeCreateCommand {
  (input: TypeHookInput, context: ActionContext): Promise<void>;
  factoryType: 'typeCreate';
  typeName: string;
  timeout?: number;
}

/**
 * Type update command returned by typeUpdate factory.
 */
export interface TypeUpdateCommand {
  (input: TypeHookInput, context: ActionContext): Promise<void>;
  factoryType: 'typeUpdate';
  typeName: string;
  timeout?: number;
}

/**
 * Type delete command returned by typeDelete factory.
 */
export interface TypeDeleteCommand {
  (input: TypeHookInput, context: ActionContext): Promise<void>;
  factoryType: 'typeDelete';
  typeName: string;
  timeout?: number;
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Creates an action start handler.
 *
 * Action starts run when the user invokes an action on a card.
 * @param config - Action metadata (actionName, description, icon, etc.)
 * @param handler - Handler invoked for action start events
 * @returns A command wrapper suitable for default export
 * @example
 * ```typescript
 * import { actionStart } from '@cards/configuration';
 *
 * export default actionStart(
 *   { actionName: 'Launch Claude', description: 'Start Claude session' },
 *   async (input, { logger }) => {
 *     logger.info('Action started', { cardId: input.cardId });
 *   }
 * );
 * ```
 */
export function actionStart(config: ActionStartConfig, handler: ActionHandler): ActionStartCommand {
  const fn = async (input: ActionStartInput, context: ActionContext): Promise<void> => {
    await handler(input, context);
  };

  fn.factoryType = 'actionStart' as const;
  fn.actionName = config.actionName;
  fn.description = config.description;
  fn.icon = config.icon;
  fn.supportsBackgroundMode = config.supportsBackgroundMode;
  fn.allowConcurrent = config.allowConcurrent;
  fn.timeout = config.timeout;

  return fn;
}

/**
 * Creates an action end handler.
 *
 * Action ends run after a successful action start (exit code 0).
 * @param config - Action metadata (actionName, timeout)
 * @param handler - Handler invoked for action end events
 * @returns A command wrapper suitable for default export
 * @example
 * ```typescript
 * import { actionEnd } from '@cards/configuration';
 *
 * export default actionEnd(
 *   { actionName: 'Launch Claude' },
 *   async (input, { logger }) => {
 *     logger.info('Action ended', { cardId: input.cardId });
 *   }
 * );
 * ```
 */
export function actionEnd(config: ActionEndConfig, handler: ActionHandler): ActionEndCommand {
  const fn = async (input: ActionEndInput, context: ActionContext): Promise<void> => {
    await handler(input, context);
  };

  fn.factoryType = 'actionEnd' as const;
  fn.actionName = config.actionName;
  fn.timeout = config.timeout;

  return fn;
}

/**
 * Creates a type validator handler.
 *
 * Type validators run to validate typed file content.
 * @param config - Type metadata (typeName, timeout)
 * @param handler - Handler invoked for validation events
 * @returns A command wrapper suitable for default export
 * @example
 * ```typescript
 * import { typeValidator } from '@cards/configuration';
 *
 * export default typeValidator(
 *   { typeName: 'adaptive-card' },
 *   async (input, { logger }) => {
 *     logger.info('Validating file', { fileName: input.fileName });
 *   }
 * );
 * ```
 */
export function typeValidator(config: TypeConfig, handler: TypeHandler): TypeValidatorCommand {
  const fn = async (input: TypeHookInput, context: ActionContext): Promise<void> => {
    await handler(input, context);
  };

  fn.factoryType = 'typeValidator' as const;
  fn.typeName = config.typeName;
  fn.timeout = config.timeout;

  return fn;
}

/**
 * Creates a type create hook handler.
 *
 * Type create hooks run when a typed file is created.
 * @param config - Type metadata (typeName, timeout)
 * @param handler - Handler invoked for create events
 * @returns A command wrapper suitable for default export
 * @example
 * ```typescript
 * import { typeCreate } from '@cards/configuration';
 *
 * export default typeCreate(
 *   { typeName: 'adaptive-card' },
 *   async (input, { logger }) => {
 *     logger.info('File created', { fileName: input.fileName });
 *   }
 * );
 * ```
 */
export function typeCreate(config: TypeConfig, handler: TypeHandler): TypeCreateCommand {
  const fn = async (input: TypeHookInput, context: ActionContext): Promise<void> => {
    await handler(input, context);
  };

  fn.factoryType = 'typeCreate' as const;
  fn.typeName = config.typeName;
  fn.timeout = config.timeout;

  return fn;
}

/**
 * Creates a type update hook handler.
 *
 * Type update hooks run when a typed file is updated.
 * @param config - Type metadata (typeName, timeout)
 * @param handler - Handler invoked for update events
 * @returns A command wrapper suitable for default export
 * @example
 * ```typescript
 * import { typeUpdate } from '@cards/configuration';
 *
 * export default typeUpdate(
 *   { typeName: 'adaptive-card' },
 *   async (input, { logger }) => {
 *     logger.info('File updated', { fileName: input.fileName });
 *   }
 * );
 * ```
 */
export function typeUpdate(config: TypeConfig, handler: TypeHandler): TypeUpdateCommand {
  const fn = async (input: TypeHookInput, context: ActionContext): Promise<void> => {
    await handler(input, context);
  };

  fn.factoryType = 'typeUpdate' as const;
  fn.typeName = config.typeName;
  fn.timeout = config.timeout;

  return fn;
}

/**
 * Creates a type delete hook handler.
 *
 * Type delete hooks run when a typed file is deleted.
 * @param config - Type metadata (typeName, timeout)
 * @param handler - Handler invoked for delete events
 * @returns A command wrapper suitable for default export
 * @example
 * ```typescript
 * import { typeDelete } from '@cards/configuration';
 *
 * export default typeDelete(
 *   { typeName: 'adaptive-card' },
 *   async (input, { logger }) => {
 *     logger.info('File deleted', { fileName: input.fileName });
 *   }
 * );
 * ```
 */
export function typeDelete(config: TypeConfig, handler: TypeHandler): TypeDeleteCommand {
  const fn = async (input: TypeHookInput, context: ActionContext): Promise<void> => {
    await handler(input, context);
  };

  fn.factoryType = 'typeDelete' as const;
  fn.typeName = config.typeName;
  fn.timeout = config.timeout;

  return fn;
}
