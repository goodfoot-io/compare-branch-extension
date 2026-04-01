/**
 * Input types for action and type lifecycle handlers.
 *
 * These types define the input payloads that handlers receive when actions are
 * triggered or type lifecycle events occur. The runtime extracts these values
 * from environment variables and passes them to handlers as typed objects.
 *
 *
 * @summary Input types for action and type lifecycle handlers
 * @module
 */

/**
 * Input payload for action handlers.
 *
 * These values are injected as environment variables by the action dispatcher
 * when spawning action commands. The runtime extracts them and passes them to
 * your handler as a typed object.
 *
 * @example
 * ```typescript
 * async (input: ActionInput, { logger }) => {
 *   // Access card context
 *   logger.info(`Processing card ${input.cardId}`);
 * }
 * ```
 */
export interface ActionInput {
  /**
   * Unique identifier for the current card.
   *
   * This ID is stable across action invocations and can be used to track
   * state or make API calls related to the card.
   */
  cardId: string;

  /**
   * Display name of the action button that triggered this handler.
   *
   * Matches the `actionName` field from the `defineAction` factory config
   * (e.g., "Launch Claude", "Interview"). Useful for logging and analytics.
   */
  actionName: string;

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
   * Configured coding agent identifier from `cards.codingAgent` setting.
   *
   * When set, indicates which AI coding assistant the user prefers. Actions
   * can use this to customize behavior or prompts for different agents.
   */
  codingAgent?: string;

  /**
   * Data passed from a previous switchToInteractive response.
   *
   * When an action is relaunched in interactive mode after a background-to-interactive
   * switch, this field contains the serialized data returned by the previous handler's
   * `onSwitchToInteractive` callback. The data is read from a file at
   * `SWITCH_TO_INTERACTIVE_DATA_PATH`.
   *
   * Undefined when the action is launched normally (not via switchToInteractive).
   */
  switchToInteractiveData?: unknown;

  /**
   * Absolute path to the main git repository root (NOT a worktree).
   * Read from REPO_ROOT, set by ActionDispatcher.
   */
  repoRoot: string;

  /**
   * Path to the card's repository directory.
   */
  cardRepoPath: string;

  /**
   * Path to the settings configuration directory.
   */
  configPath: string;

  /**
   * Absolute path to the VS Code extension installation directory.
   *
   * Use this to locate bundled assets such as the runtime plugin directory
   * (`<extensionPath>/dist/plugins/runtime`).
   */
  extensionPath: string;
}

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
}

/**
 * Runtime context injected when an action executes.
 *
 * The context is created by the runtime and provides utilities for logging,
 * accessing the working directory, and registering lifecycle callbacks.
 *
 * @example
 * ```typescript
 * async (input, context: ActionContext) => {
 *   context.logger.info('Action started', { cwd: context.cwd });
 *
 *   // Register lifecycle callbacks
 *   context.onCancel(() => {
 *     context.logger.info('Action cancelled');
 *   });
 *
 *   context.onSwitchToInteractive(() => {
 *     return { sessionId: 'abc123' };
 *   });
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

  /**
   * Register a callback to be invoked when the action is cancelled.
   *
   * The callback is called when the runtime receives a cancel command
   * via the socket connection. If no callback is registered, the runtime
   * will send SIGTERM to terminate the process.
   *
   * @param callback - Function to call on cancellation
   */
  onCancel(callback: () => void | Promise<void>): void;

  /**
   * Register a callback to handle switching from background to interactive mode.
   *
   * The callback should return serializable data that will be passed to the
   * relaunched handler via `ActionInput.switchToInteractiveData`. The runtime
   * will send this data back to the dispatcher and exit with a special exit code.
   *
   * If no callback is registered when the switchToInteractive command arrives,
   * the command is ignored (no-op).
   *
   * @param callback - Function that returns data to pass to the relaunched handler
   */
  onSwitchToInteractive(callback: () => unknown | Promise<unknown>): void;
}

/**
 * Runtime context injected when a type lifecycle hook executes.
 *
 * Unlike {@link ActionContext}, type hooks do not support `onCancel` or
 * `onSwitchToInteractive` callbacks because the runtime does not connect
 * a socket for type commands.
 *
 * @example
 * ```typescript
 * async (input: TypeHookInput, context: TypeHookContext) => {
 *   context.logger.info('Processing type event', { cwd: context.cwd });
 * }
 * ```
 */
export interface TypeHookContext {
  /**
   * Logger for structured, context-aware logging.
   */
  logger: import('./logger.js').ILogger;

  /**
   * Current working directory.
   */
  cwd: string;
}
