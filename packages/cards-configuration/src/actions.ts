/**
 * Action factory functions for Cards Extension actions.
 *
 * Each factory wraps a handler and attaches metadata that the CLI uses for
 * settings.json generation and the runtime uses for input extraction. The
 * pattern is intentionally simple: call a factory with config and handler,
 * then default-export the result. The CLI's AST analyzer will find it.
 *
 * The factory functions are the primary authoring API for action developers.
 * They provide type safety for inputs, automatic metadata attachment for
 * settings.json generation, and a consistent execution model across all
 * action types.
 *
 * @module
 * @see {@link actionStart} for creating action start handlers
 * @see {@link typeValidator} for creating type validation hooks
 */

import type { Logger } from './logger.js';

// ============================================================================
// Input Types
// ============================================================================

/**
 * Input payload for action start and end handlers.
 *
 * These values are injected as environment variables by the action dispatcher
 * when spawning action commands. The runtime extracts them and passes them to
 * your handler as a typed object.
 *
 * The `apiBaseUrl` and `apiAccessToken` fields enable actions to make
 * authenticated API calls back to the Cards server for operations like
 * updating card state or fetching additional data.
 *
 * @example
 * ```typescript
 * async (input: ActionStartInput, { logger }) => {
 *   // Access card context
 *   logger.info(`Processing card ${input.cardId}`);
 *
 *   // Make authenticated API calls
 *   const response = await fetch(`${input.apiBaseUrl}/cards/${input.cardId}`, {
 *     headers: { Authorization: `Bearer ${input.apiAccessToken}` }
 *   });
 * }
 * ```
 */
export interface ActionStartInput {
  /**
   * Unique identifier for the current card.
   *
   * This ID is stable across action invocations and can be used to track
   * state or make API calls related to the card.
   */
  cardId: string;

  /**
   * The environment name this action belongs to.
   *
   * Matches the environment key in settings.json (e.g., "default", "staging").
   * Useful for environment-specific behavior or logging.
   */
  environment: string;

  /**
   * Card's execution mode, determining UI interaction model.
   *
   * - `interactive`: User is actively engaged; UI is visible
   * - `background`: Action runs without user attention; minimize prompts
   */
  executionMode: 'interactive' | 'background';

  /**
   * Cards server base URL for API calls.
   *
   * Use this as the base for constructing API endpoints. The URL does not
   * include a trailing slash.
   */
  apiBaseUrl: string;

  /**
   * Authentication token for API calls.
   *
   * Bearer token valid for the duration of this action execution. Include
   * in Authorization headers when calling the Cards API.
   */
  apiAccessToken: string;

  /**
   * Configured coding agent identifier from `cards.codingAgent` setting.
   *
   * When set, indicates which AI coding assistant the user prefers. Actions
   * can use this to customize behavior or prompts for different agents.
   */
  codingAgent?: string;
}

/**
 * Input payload for action end handlers.
 *
 * Structurally identical to {@link ActionStartInput}. The end handler is only
 * invoked when the start handler exits successfully (code 0), so no exit code
 * or error information is included.
 *
 * @see {@link ActionStartInput} for field descriptions
 */
export type ActionEndInput = ActionStartInput;

/**
 * Input payload for type lifecycle hooks.
 *
 * Contains file metadata computed by the execution wrapper when typed file
 * events occur. The `fileSha256` enables content-based caching and change
 * detection without reading file contents.
 *
 * @example
 * ```typescript
 * async (input: TypeHookInput, { logger }) => {
 *   logger.info('Processing typed file', {
 *     type: input.typeName,
 *     file: input.fileName,
 *     size: input.fileSize
 *   });
 *
 *   // Read and validate the file
 *   const content = await fs.readFile(input.filePath, 'utf-8');
 *   const parsed = JSON.parse(content);
 *   validateSchema(input.typeName, parsed);
 * }
 * ```
 */
export interface TypeHookInput {
  /**
   * Unique identifier for the current card.
   */
  cardId: string;

  /**
   * The environment name from settings.json.
   */
  environment: string;

  /**
   * The registered type name (e.g., `adaptive-card`, `task-spec`).
   *
   * Matches the type key in settings.json's `types` section.
   */
  typeName: string;

  /**
   * The type's version string from settings.json configuration.
   *
   * Follows semver conventions. Validators can use this to apply
   * version-specific validation rules.
   */
  typeVersion: string;

  /**
   * The filename within the type directory (e.g., `card.json`).
   *
   * This is the basename only, not a path.
   */
  fileName: string;

  /**
   * Full absolute path to the file on disk.
   *
   * Safe to read directly. The file exists at the time of hook invocation.
   */
  filePath: string;

  /**
   * File size in bytes.
   *
   * Useful for size validation or deciding whether to read the file into
   * memory vs. streaming.
   */
  fileSize: number;

  /**
   * SHA-256 hash of file content as a hex string.
   *
   * Enables content-based caching and deduplication without reading the
   * file. The hash is computed by the execution wrapper before invoking
   * the hook.
   */
  fileSha256: string;

  /**
   * MIME type of the file (e.g., `application/json`, `text/plain`).
   *
   * Detected from file content or extension. Use this to decide how to
   * parse or process the file.
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
 * Runtime context injected when an action executes.
 *
 * The context is created by the runtime and provides utilities for logging
 * and accessing the working directory. It is intentionally minimal to avoid
 * coupling actions to runtime internals.
 *
 * @example
 * ```typescript
 * async (input, context: ActionContext) => {
 *   context.logger.info('Action started', { cwd: context.cwd });
 *
 *   // Use cwd for file operations
 *   const configPath = path.join(context.cwd, 'config.json');
 *   if (await fs.exists(configPath)) {
 *     // ...
 *   }
 * }
 * ```
 */
export interface ActionContext {
  /**
   * Logger for structured, context-aware logging.
   *
   * Pre-configured with action type and input metadata. Log events are
   * enriched automatically; you only need to provide the message and
   * optional context data.
   *
   * @see {@link Logger} for logging methods and configuration
   */
  logger: Logger;

  /**
   * Current working directory for the action.
   *
   * Set by the runtime based on the card's project directory. Use this
   * as the base for relative file operations.
   */
  cwd: string;
}

// ============================================================================
// Handler Types
// ============================================================================

/**
 * Handler function signature for action start and end events.
 *
 * Throwing an error or returning a rejected promise signals failure and
 * causes the runtime to exit with a non-zero code. For graceful error
 * handling, catch exceptions and log them before re-throwing.
 *
 * @example
 * ```typescript
 * const handler: ActionHandler = async (input, { logger }) => {
 *   try {
 *     await performAction(input.cardId);
 *     logger.info('Action completed successfully');
 *   } catch (err) {
 *     logger.logError(err, 'Action failed');
 *     throw err; // Re-throw to signal failure
 *   }
 * };
 * ```
 */
export type ActionHandler = (input: ActionStartInput | ActionEndInput, context: ActionContext) => void | Promise<void>;

/**
 * Handler function signature for type lifecycle events.
 *
 * Throwing an error signals validation failure or hook error. For validators,
 * throw with a descriptive message that will help the user understand what
 * needs to be fixed.
 *
 * @example
 * ```typescript
 * const handler: TypeHandler = async (input, { logger }) => {
 *   const content = await fs.readFile(input.filePath, 'utf-8');
 *   const data = JSON.parse(content);
 *
 *   if (!data.version) {
 *     throw new Error('Missing required "version" field');
 *   }
 *
 *   logger.info('Validation passed', { typeName: input.typeName });
 * };
 * ```
 */
export type TypeHandler = (input: TypeHookInput, context: ActionContext) => void | Promise<void>;

// ============================================================================
// Configuration Types
// ============================================================================

/**
 * Configuration for {@link actionStart} factory.
 *
 * All fields except `actionName` are optional and forwarded to settings.json.
 * The CLI extracts this metadata via AST analysis, so values must be string
 * literals or boolean/number literals in the source code.
 *
 * @example
 * ```typescript
 * const config: ActionStartConfig = {
 *   actionName: 'Launch Claude',
 *   description: 'Start a Claude coding session',
 *   icon: './icons/claude.svg',
 *   supportsBackgroundMode: true,
 *   timeout: 30000
 * };
 * ```
 */
export interface ActionStartConfig {
  /**
   * The action name used to group start/end commands in settings.json.
   *
   * This name appears in the UI and must match between actionStart and
   * actionEnd if you have both. Keep it concise but descriptive.
   */
  actionName: string;

  /**
   * Human-readable description shown in button tooltip.
   *
   * Explain what the action does in a few words. Shown on hover in the UI.
   */
  description?: string;

  /**
   * Path to icon file for the action button.
   *
   * Paths are relative to the settings.json file location.
   * SVG format recommended for crisp rendering at any size.
   */
  icon?: string;

  /**
   * Whether to show the execution mode toggle in the UI.
   *
   * When true, users can choose between interactive and background modes.
   * When false (default), the action always runs in interactive mode.
   */
  supportsBackgroundMode?: boolean;

  /**
   * Whether multiple instances can run simultaneously on the same card.
   *
   * When false (default), starting the action while it's running will be
   * blocked. Set to true for idempotent actions that can safely overlap.
   */
  allowConcurrent?: boolean;

  /**
   * Maximum execution time in milliseconds.
   *
   * If the action exceeds this timeout, the runtime will terminate it.
   * Omit to use the platform's default timeout policy.
   */
  timeout?: number;
}

/**
 * Configuration for {@link actionEnd} factory.
 *
 * The end handler shares an actionName with its corresponding start handler
 * to form a complete action lifecycle.
 */
export interface ActionEndConfig {
  /**
   * The action name, matching the corresponding {@link ActionStartConfig.actionName}.
   */
  actionName: string;

  /**
   * Maximum execution time in milliseconds.
   */
  timeout?: number;
}

/**
 * Configuration for type factory functions.
 *
 * Used by {@link typeValidator}, {@link typeCreate}, {@link typeUpdate},
 * and {@link typeDelete} factories.
 */
export interface TypeConfig {
  /**
   * The type name to handle (e.g., `adaptive-card`).
   *
   * Must match a type key in settings.json's `types` section.
   */
  typeName: string;

  /**
   * Maximum execution time in milliseconds.
   */
  timeout?: number;
}

// ============================================================================
// Command Types (Return Types)
// ============================================================================

/**
 * Callable command returned by {@link actionStart}.
 *
 * This interface combines the callable signature with metadata properties
 * that the CLI and runtime use. The function is what the runtime invokes;
 * the properties are what the CLI extracts for settings.json generation.
 *
 * @example
 * ```typescript
 * // The command can be called directly (by the runtime)
 * await command(input, context);
 *
 * // And inspected for metadata (by the CLI)
 * console.log(command.factoryType); // 'actionStart'
 * console.log(command.actionName);  // 'Launch Claude'
 * ```
 */
export interface ActionStartCommand {
  /**
   * Invokes the wrapped handler with the provided input and context.
   * @param input - Action input payload from environment variables
   * @param context - Runtime context with logger and cwd
   * @returns Resolves when the handler completes
   */
  (input: ActionStartInput, context: ActionContext): Promise<void>;

  /** Discriminant for the CLI's AST analyzer. */
  factoryType: 'actionStart';

  /** Action name from config. */
  actionName: string;

  /** Description from config, if provided. */
  description?: string;

  /** Icon path from config, if provided. */
  icon?: string;

  /** Background mode flag from config, if provided. */
  supportsBackgroundMode?: boolean;

  /** Concurrent execution flag from config, if provided. */
  allowConcurrent?: boolean;

  /** Timeout from config, if provided. */
  timeout?: number;
}

/**
 * Callable command returned by {@link actionEnd}.
 *
 * @see {@link ActionStartCommand} for usage pattern
 */
export interface ActionEndCommand {
  (input: ActionEndInput, context: ActionContext): Promise<void>;
  factoryType: 'actionEnd';
  actionName: string;
  timeout?: number;
}

/**
 * Callable command returned by {@link typeValidator}.
 *
 * Validators run before create/update hooks and can reject invalid content
 * by throwing an error.
 */
export interface TypeValidatorCommand {
  (input: TypeHookInput, context: ActionContext): Promise<void>;
  factoryType: 'typeValidator';
  typeName: string;
  timeout?: number;
}

/**
 * Callable command returned by {@link typeCreate}.
 *
 * Runs after a new typed file passes validation.
 */
export interface TypeCreateCommand {
  (input: TypeHookInput, context: ActionContext): Promise<void>;
  factoryType: 'typeCreate';
  typeName: string;
  timeout?: number;
}

/**
 * Callable command returned by {@link typeUpdate}.
 *
 * Runs after an existing typed file is modified and passes validation.
 */
export interface TypeUpdateCommand {
  (input: TypeHookInput, context: ActionContext): Promise<void>;
  factoryType: 'typeUpdate';
  typeName: string;
  timeout?: number;
}

/**
 * Callable command returned by {@link typeDelete}.
 *
 * Runs when a typed file is deleted. The file may already be gone from disk
 * by the time this hook runs; use the metadata in input rather than reading
 * the file.
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
 * Creates an action start handler with attached metadata.
 *
 * This is the primary factory for defining card actions. The returned command
 * should be the default export of your action file. The CLI will discover it
 * via AST analysis and generate the appropriate settings.json entry.
 *
 * The handler runs when a user clicks the action button in the Cards UI. Use
 * the input to access card context and the logger for observability.
 *
 * @param config - Action metadata including name, description, and behavioral flags
 * @param handler - Async function that implements the action logic
 * @returns A command wrapper suitable for default export
 *
 * @example
 * ```typescript
 * // actions/launch-claude.ts
 * import { actionStart } from '@cards/configuration';
 * import { spawn } from 'node:child_process';
 *
 * export default actionStart(
 *   {
 *     actionName: 'Launch Claude',
 *     description: 'Open Claude Code in a new terminal',
 *     icon: './icons/claude.svg',
 *     supportsBackgroundMode: true
 *   },
 *   async (input, { logger, cwd }) => {
 *     logger.info('Launching Claude', { cardId: input.cardId, mode: input.executionMode });
 *
 *     const process = spawn('claude', ['--card', input.cardId], {
 *       cwd,
 *       detached: input.executionMode === 'background'
 *     });
 *
 *     if (input.executionMode === 'interactive') {
 *       await new Promise((resolve) => process.on('close', resolve));
 *     }
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
 * Creates an action end handler for cleanup or finalization.
 *
 * End handlers run after the corresponding start handler exits with code 0.
 * If the start handler fails, the end handler is not invoked. Use this for
 * cleanup, logging completion, or triggering downstream workflows.
 *
 * @param config - Action metadata, must have matching actionName with start
 * @param handler - Async function that implements cleanup logic
 * @returns A command wrapper suitable for default export
 *
 * @example
 * ```typescript
 * // actions/launch-claude-end.ts
 * import { actionEnd } from '@cards/configuration';
 *
 * export default actionEnd(
 *   { actionName: 'Launch Claude' },
 *   async (input, { logger }) => {
 *     logger.info('Claude session ended', { cardId: input.cardId });
 *
 *     // Notify external systems
 *     await notifySlack(`Claude session completed for card ${input.cardId}`);
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
 * Creates a type validator for content validation.
 *
 * Validators run before create and update hooks. Throwing an error rejects
 * the file and prevents the create/update hooks from running. The error
 * message should clearly explain what validation failed and how to fix it.
 *
 * Validators should be fast and side-effect-free. They validate content
 * structure, not business logic that depends on external state.
 *
 * @param config - Type metadata including the type name to validate
 * @param handler - Async function that validates file content
 * @returns A command wrapper suitable for default export
 *
 * @example
 * ```typescript
 * // types/adaptive-card/validator.ts
 * import { typeValidator } from '@cards/configuration';
 * import Ajv from 'ajv';
 * import schema from './adaptive-card.schema.json';
 *
 * const ajv = new Ajv();
 * const validate = ajv.compile(schema);
 *
 * export default typeValidator(
 *   { typeName: 'adaptive-card', timeout: 5000 },
 *   async (input, { logger }) => {
 *     const content = await fs.readFile(input.filePath, 'utf-8');
 *     const data = JSON.parse(content);
 *
 *     if (!validate(data)) {
 *       const errors = validate.errors?.map(e => e.message).join(', ');
 *       throw new Error(`Invalid adaptive card: ${errors}`);
 *     }
 *
 *     logger.debug('Validation passed', { file: input.fileName });
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
 * Creates a type create hook for new file events.
 *
 * Runs after a new typed file passes validation. Use this for side effects
 * like indexing, notifications, or syncing with external systems.
 *
 * @param config - Type metadata including the type name
 * @param handler - Async function that handles the create event
 * @returns A command wrapper suitable for default export
 *
 * @example
 * ```typescript
 * // types/adaptive-card/create.ts
 * import { typeCreate } from '@cards/configuration';
 *
 * export default typeCreate(
 *   { typeName: 'adaptive-card' },
 *   async (input, { logger }) => {
 *     logger.info('New adaptive card created', {
 *       file: input.fileName,
 *       size: input.fileSize
 *     });
 *
 *     // Index for search
 *     await searchIndex.add({
 *       id: input.fileSha256,
 *       path: input.filePath,
 *       type: input.typeName
 *     });
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
 * Creates a type update hook for modified file events.
 *
 * Runs after an existing typed file is modified and passes validation.
 * The input includes the new file hash, enabling efficient change detection.
 *
 * @param config - Type metadata including the type name
 * @param handler - Async function that handles the update event
 * @returns A command wrapper suitable for default export
 *
 * @example
 * ```typescript
 * // types/adaptive-card/update.ts
 * import { typeUpdate } from '@cards/configuration';
 *
 * export default typeUpdate(
 *   { typeName: 'adaptive-card' },
 *   async (input, { logger }) => {
 *     logger.info('Adaptive card updated', {
 *       file: input.fileName,
 *       newHash: input.fileSha256.slice(0, 8)
 *     });
 *
 *     // Update search index
 *     await searchIndex.update(input.filePath, {
 *       hash: input.fileSha256,
 *       updatedAt: new Date().toISOString()
 *     });
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
 * Creates a type delete hook for file removal events.
 *
 * Runs when a typed file is deleted. The file may already be removed from
 * disk when this hook executes, so use the metadata in input rather than
 * attempting to read the file.
 *
 * @param config - Type metadata including the type name
 * @param handler - Async function that handles the delete event
 * @returns A command wrapper suitable for default export
 *
 * @example
 * ```typescript
 * // types/adaptive-card/delete.ts
 * import { typeDelete } from '@cards/configuration';
 *
 * export default typeDelete(
 *   { typeName: 'adaptive-card' },
 *   async (input, { logger }) => {
 *     logger.info('Adaptive card deleted', { file: input.fileName });
 *
 *     // Remove from search index
 *     await searchIndex.remove(input.filePath);
 *
 *     // Clean up any cached renders
 *     await renderCache.invalidate(input.fileSha256);
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
