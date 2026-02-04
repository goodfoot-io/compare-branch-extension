/**
 * Input types for action and type lifecycle handlers.
 *
 * These types define the input payloads that handlers receive when actions are
 * triggered or type lifecycle events occur. The runtime extracts these values
 * from environment variables and passes them to handlers as typed objects.
 *
 * @module
 */

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
   * Uses the {@link ILogger} interface to allow for easy mocking in tests
   * while accepting the full {@link Logger} class in production.
   *
   * @see {@link Logger} for the full Logger class implementation
   * @see {@link ILogger} for the logger interface
   */
  logger: import('./logger.js').ILogger;

  /**
   * Current working directory for the action.
   *
   * Set by the runtime based on the card's project directory. Use this
   * as the base for relative file operations.
   */
  cwd: string;
}

// ============================================================================
// Type Validator Types
// ============================================================================

/**
 * HTTP request for type validators.
 *
 * Validators receive the full HTTP request including headers and body.
 * The file is NOT saved to disk until validation passes, so validators
 * work with the request body directly.
 *
 * @example
 * ```typescript
 * async (request: TypeValidatorRequest, context) => {
 *   // Access HTTP headers
 *   const contentType = request.headers['content-type'];
 *
 *   // Parse body as JSON
 *   const data = request.bodyJson<MyType>();
 *
 *   // Validate and return response
 *   if (!data.id) {
 *     return validationError(400, [{ code: 'MISSING_ID', message: 'id is required' }]);
 *   }
 *   return validationCreated();
 * }
 * ```
 */
export interface TypeValidatorRequest {
  /**
   * HTTP method (e.g., 'PUT', 'POST').
   */
  method: string;

  /**
   * Request path (e.g., '/note/my-note.md').
   */
  path: string;

  /**
   * HTTP version (e.g., 'HTTP/1.1').
   */
  httpVersion: string;

  /**
   * HTTP headers as key-value pairs.
   * Header names are normalized to lowercase.
   */
  headers: Record<string, string>;

  /**
   * Raw body content as a Buffer.
   * This is the file content being validated.
   */
  body: Buffer;

  /**
   * Body as UTF-8 string.
   */
  bodyText: string;

  /**
   * Parse body as JSON.
   * @throws {SyntaxError} If body is not valid JSON
   */
  bodyJson: <T = unknown>() => T;
}

/**
 * Context for type validators.
 *
 * Provides logger, type metadata, and card context for validation handlers.
 *
 * @example
 * ```typescript
 * async (request, context: TypeValidatorContext) => {
 *   context.logger.info('Validating', {
 *     type: context.typeName,
 *     file: context.fileName
 *   });
 * }
 * ```
 */
export interface TypeValidatorContext {
  /**
   * Logger for structured logging during validation.
   */
  logger: import('./logger.js').ILogger;

  /**
   * Current working directory.
   */
  cwd: string;

  /**
   * The registered type name (e.g., 'adaptive-card', 'note').
   */
  typeName: string;

  /**
   * The type's version string from settings.json.
   */
  typeVersion: string;

  /**
   * The filename being validated (e.g., 'my-note.md').
   */
  fileName: string;

  /**
   * Unique identifier for the current card.
   */
  cardId: string;

  /**
   * The environment name from settings.json.
   */
  environment: string;

  /**
   * Cards server base URL for API calls.
   */
  apiBaseUrl: string;

  /**
   * Authentication token for API calls.
   */
  apiAccessToken: string;
}
