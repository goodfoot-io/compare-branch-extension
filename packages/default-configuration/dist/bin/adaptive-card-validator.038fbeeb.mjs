import { createRequire as __createRequire } from 'node:module';
const require = __createRequire(import.meta.url);

if (!process.env['CARDS_HOOKS_LOG_FILE']) {
  process.env['CARDS_HOOKS_LOG_FILE'] = "/workspace/public/packages/default-configuration/.cards/logs/cards-default-configuration-hooks.log";
}

// src/validators/adaptive-card-validator.ts
import { readFileSync as readFileSync3 } from "node:fs";

// ../sdk/src/config/factories/type-hooks.ts
function defineTypeValidator(config, handler) {
  const fn = async (request, context) => {
    return await Promise.resolve(handler(request, context));
  };
  return Object.assign(fn, {
    factoryType: "typeValidator",
    typeName: config.typeName,
    timeout: config.timeout,
    sourcePath: config.sourcePath,
    schema: config.schema,
    description: config.description
  });
}

// ../sdk/src/config/env.ts
import { readFileSync } from "node:fs";
var CARDS_ENV_VARS = {
  /**
   * Unique identifier for the current card.
   * Available in all actions and type hooks.
   */
  CARD_ID: "CARD_ID",
  /**
   * The environment name from settings.json.
   * Available in all actions and type hooks.
   */
  ENVIRONMENT: "ENVIRONMENT",
  /**
   * Display name of the action button that triggered this handler.
   * Available in actions only (not type hooks).
   */
  ACTION_NAME: "ACTION_NAME",
  /**
   * Card's execution mode, determining UI interaction model.
   * Available in actions only (not type hooks).
   * Valid values: 'interactive' | 'background'
   */
  EXECUTION_MODE: "EXECUTION_MODE",
  /**
   * Cards server base URL for API calls.
   * Available in all actions and type hooks.
   */
  API_BASE_URL: "API_BASE_URL",
  /**
   * Authentication token for API calls.
   * Available in all actions and type hooks.
   */
  API_ACCESS_TOKEN: "API_ACCESS_TOKEN",
  /**
   * Configured coding agent identifier from cards.codingAgent setting.
   * Available in actions only (not type hooks).
   * Optional.
   */
  CODING_AGENT: "CODING_AGENT",
  /**
   * The registered type name.
   * Available in type hooks only.
   */
  TYPE_NAME: "TYPE_NAME",
  /**
   * The type's version string from settings.json configuration.
   * Available in type hooks only.
   */
  TYPE_VERSION: "TYPE_VERSION",
  /**
   * The file name within the type directory.
   * Available in type hooks only.
   */
  FILE_NAME: "FILE_NAME",
  /**
   * Full path to the file.
   * Available in type hooks only.
   */
  FILE_PATH: "FILE_PATH",
  /**
   * File size in bytes.
   * Available in type hooks only.
   */
  FILE_SIZE: "FILE_SIZE",
  /**
   * SHA256 hash of content.
   * Available in type hooks only.
   */
  SHA256: "SHA256",
  /**
   * MIME type of the content.
   * Available in type hooks only.
   */
  CONTENT_TYPE: "CONTENT_TYPE",
  /**
   * Path to the VS Code bundled Node.js interpreter.
   *
   * Set by the extension host from `process.execPath` (with
   * `ELECTRON_RUN_AS_NODE=1`). Commands in settings.json use
   * `$VSCODE_NODE ./bin/...` so they work regardless of
   * whether `node` is on the system PATH.
   *
   * Available in all actions and type hooks.
   */
  VSCODE_NODE: "VSCODE_NODE",
  /**
   * Path to the Node.js interpreter running the wrapper process.
   *
   * Set by the wrapper from `process.execPath`. Use `$NODE` in embedded
   * bash statements to invoke Node scripts portably.
   *
   * Available in all actions.
   */
  NODE: "NODE",
  /**
   * Path to the Unix domain socket for runtime-to-dispatcher communication.
   * Available in actions only.
   */
  SOCKET_PATH: "SOCKET_PATH",
  /**
   * Path to a JSON file containing switchToInteractive data from a previous handler.
   * Available in actions only. Optional.
   */
  SWITCH_TO_INTERACTIVE_DATA_PATH: "SWITCH_TO_INTERACTIVE_DATA_PATH",
  /**
   * Path to the settings configuration directory.
   * Available in actions only.
   */
  CONFIG_PATH: "CONFIG_PATH",
  /**
   * Path to the VS Code workspace root directory.
   * Set by the action handler (e.g., launch.ts) to the worktree path.
   * Available in hooks running inside the claude CLI.
   */
  WORKSPACE_PATH: "WORKSPACE_PATH",
  /**
   * Absolute path to the main git repository root (NOT a worktree).
   * Set by ActionDispatcher; consumed by the wrapper and watcher for
   * git operations (worktree removal, branch deletion) that must run
   * against the main repository.
   */
  REPO_ROOT: "REPO_ROOT",
  /**
   * Path to the card's repository directory.
   * Available in actions only.
   */
  CARD_REPO_PATH: "CARD_REPO_PATH",
  /**
   * Resolved shell command for the wrapper to spawn as the action handler.
   * Set by ActionDispatcher; consumed by the wrapper (not by action handlers).
   */
  ACTION_COMMAND: "ACTION_COMMAND",
  /**
   * Git branch that the card's workspace branch will merge into.
   * Resolved from the workspace HEAD at launch time.
   * Set by the launch action.
   * Available in actions only.
   */
  BASE_BRANCH: "BASE_BRANCH",
  /**
   * Git branch from which the card's workspace branch was created.
   * May differ from BASE_BRANCH when the worktree was created against
   * a different ref than the current workspace HEAD.
   * Set by the launch action.
   * Available in actions only.
   */
  PARENT_BRANCH: "PARENT_BRANCH",
  /**
   * Git branch name for the card's workspace implementation.
   * Set by the launch action after resolving or creating the worktree.
   * Available in actions only.
   */
  WORKSPACE_BRANCH: "WORKSPACE_BRANCH",
  /**
   * Session ID persisted by the session-start hook via `persistEnvVar`.
   *
   * Available in Bash tool shell descendants (commands, git hooks) after
   * session start. NOT available in hooks spawned directly by Claude Code
   * (stop, session-end, etc.) — those receive the session ID via hook input.
   *
   * The card-repo post-commit hook reads this to record commits directly
   * without needing a process-tree walk or PID registry lookup.
   */
  CARDS_SESSION_ID: "CARDS_SESSION_ID",
  /**
   * Absolute path to the VS Code extension installation directory.
   *
   * Set by the extension host from `context.extensionUri.fsPath` and injected
   * into all spawned action processes. Use this to locate bundled assets such
   * as the runtime plugin directory (`<extensionPath>/dist/plugins/runtime`).
   *
   * Available in actions only (not type hooks).
   */
  EXTENSION_PATH: "EXTENSION_PATH"
};
function getCardId() {
  const value = process.env[CARDS_ENV_VARS.CARD_ID];
  if (value === void 0 || value === "") {
    throw new Error(`Missing required environment variable: ${CARDS_ENV_VARS.CARD_ID}`);
  }
  return value;
}
function getEnvironment() {
  const value = process.env[CARDS_ENV_VARS.ENVIRONMENT];
  if (value === void 0 || value === "") {
    throw new Error(`Missing required environment variable: ${CARDS_ENV_VARS.ENVIRONMENT}`);
  }
  return value;
}
function getApiBaseUrl() {
  const value = process.env[CARDS_ENV_VARS.API_BASE_URL];
  if (value === void 0 || value === "") {
    throw new Error(`Missing required environment variable: ${CARDS_ENV_VARS.API_BASE_URL}`);
  }
  return value;
}
function getApiAccessToken() {
  const value = process.env[CARDS_ENV_VARS.API_ACCESS_TOKEN];
  if (value === void 0 || value === "") {
    throw new Error(`Missing required environment variable: ${CARDS_ENV_VARS.API_ACCESS_TOKEN}`);
  }
  return value;
}
function getTypeName() {
  const value = process.env[CARDS_ENV_VARS.TYPE_NAME];
  if (value === void 0 || value === "") {
    throw new Error(`Missing required environment variable: ${CARDS_ENV_VARS.TYPE_NAME}`);
  }
  return value;
}
function getTypeVersion() {
  const value = process.env[CARDS_ENV_VARS.TYPE_VERSION];
  if (value === void 0 || value === "") {
    throw new Error(`Missing required environment variable: ${CARDS_ENV_VARS.TYPE_VERSION}`);
  }
  return value;
}
function getFileName() {
  const value = process.env[CARDS_ENV_VARS.FILE_NAME];
  if (value === void 0 || value === "") {
    throw new Error(`Missing required environment variable: ${CARDS_ENV_VARS.FILE_NAME}`);
  }
  return value;
}

// ../sdk/src/config/logger.ts
import { closeSync, existsSync, mkdirSync, openSync, writeSync } from "node:fs";
import { dirname } from "node:path";
var LOG_LEVELS = ["debug", "info", "warn", "error"];
var Logger = class {
  /**
   * Registered event handlers by log level.
   */
  handlers = /* @__PURE__ */ new Map();
  /**
   * File descriptor for log file output.
   * Lazily initialized on first write.
   */
  logFileFd = null;
  /**
   * Path to the log file, if configured.
   */
  logFilePath = null;
  /**
   * Whether file initialization has been attempted.
   */
  fileInitialized = false;
  /**
   * Current hook context for enriching log events.
   */
  currentHookType;
  /**
   * Current hook input for enriching log events.
   */
  currentInput;
  /**
   * Creates a new Logger instance.
   *
   * Typically you should use the exported `logger` singleton rather than
   * creating new instances.
   * @param config - Optional configuration
   * @example
   * ```typescript
   * // Use singleton (recommended)
   * import { logger } from '@cards/sdk/config';
   *
   * // Or create custom instance
   * const customLogger = new Logger({ logFilePath: '/var/log/hooks.log' });
   * ```
   */
  constructor(config = {}) {
    for (const level of LOG_LEVELS) {
      this.handlers.set(level, /* @__PURE__ */ new Set());
    }
    this.logFilePath = config.logFilePath ?? process.env["CARDS_HOOKS_LOG_FILE"] ?? null;
  }
  /**
   * Logs a debug message.
   *
   * Use for detailed debugging information that is typically only useful
   * during development or troubleshooting.
   * @param message - Diagnostic text describing low-level execution details.
   * @param context - Optional structured metadata merged into the emitted event.
   * @example
   * ```typescript
   * logger.debug('Processing hook input', { taskId: 'task-123', inputSize: 256 });
   * ```
   */
  debug(message, context) {
    this.emit("debug", message, context);
  }
  /**
   * Logs an info message.
   *
   * Use for general operational events like hook invocations, successful
   * completions, or state changes.
   * @param message - Operational message describing normal hook progress.
   * @param context - Optional structured metadata merged into the emitted event.
   * @example
   * ```typescript
   * logger.info('Task started', { taskId: 'task-123', cardId: 'card-456' });
   * ```
   */
  info(message, context) {
    this.emit("info", message, context);
  }
  /**
   * Logs a warning message.
   *
   * Use for conditions that may indicate cards but don't prevent
   * operation, such as deprecated patterns or performance concerns.
   * @param message - Warning text for recoverable or suspicious conditions.
   * @param context - Optional structured metadata merged into the emitted event.
   * @example
   * ```typescript
   * logger.warn('Deprecated hook pattern detected', { pattern: 'legacyMatcher' });
   * ```
   */
  warn(message, context) {
    this.emit("warn", message, context);
  }
  /**
   * Logs an error message.
   *
   * Use for error conditions that require attention but were handled
   * gracefully. For exceptions, prefer {@link logError}.
   * @param message - Error text describing a handled failure condition.
   * @param context - Optional structured metadata merged into the emitted event.
   * @example
   * ```typescript
   * logger.error('Failed to validate hook input', { reason: 'empty taskId' });
   * ```
   */
  error(message, context) {
    this.emit("error", message, context);
  }
  /**
   * Logs a structured error with full error details.
   *
   * Use this for caught exceptions. Non-Error values are normalized so handlers
   * always receive a consistent error shape.
   * @param error - The error to log
   * @param message - Human-readable description of what failed
   * @param context - Optional structured metadata merged into the emitted event.
   * @example
   * ```typescript
   * try {
   *   await dangerousOperation();
   * } catch (err) {
   *   logger.logError(err, 'Failed to execute dangerous operation', {
   *     operation: 'delete',
   *     target: '/important/file.txt'
   *   });
   * }
   * ```
   */
  logError(error, message, context) {
    const errorInfo = this.extractErrorInfo(error);
    const event = {
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      level: "error",
      hookType: this.currentHookType,
      message,
      input: this.currentInput,
      error: errorInfo,
      context
    };
    this.deliverEvent(event);
  }
  /**
   * Subscribes a handler to log events at the specified level.
   *
   * The handler will be called for every log event at the specified level.
   * Returns an unsubscribe function that should be called when the handler
   * is no longer needed. Handler errors are ignored to avoid disrupting hooks.
   * @param level - The log level to subscribe to
   * @param handler - The handler function to call for each event
   * @returns A function to unsubscribe the handler
   * @example
   * ```typescript
   * // Subscribe to error events
   * const unsubscribe = logger.on('error', (event) => {
   *   console.error(`[${event.hookType}] ${event.message}`);
   *   if (event.error) {
   *     console.error(event.error.stack);
   *   }
   * });
   *
   * // Later, clean up
   * unsubscribe();
   * ```
   * @example
   * ```typescript
   * // Forward to external logging library
   * import pino from 'pino';
   * const pinoLogger = pino();
   *
   * logger.on('info', (event) => pinoLogger.info(event, event.message));
   * logger.on('warn', (event) => pinoLogger.warn(event, event.message));
   * logger.on('error', (event) => pinoLogger.error(event, event.message));
   * ```
   */
  on(level, handler) {
    const levelHandlers = this.handlers.get(level);
    if (levelHandlers) {
      levelHandlers.add(handler);
    }
    return () => {
      levelHandlers?.delete(handler);
    };
  }
  /**
   * Sets the current hook context for enriching log events.
   *
   * This is called internally by the runtime before invoking hook handlers.
   * You typically don't need to call this directly.
   * @param hookType - The type of hook being executed
   * @param input - The hook input data
   * @internal
   */
  setContext(hookType, input) {
    this.currentHookType = hookType;
    this.currentInput = input;
  }
  /**
   * Clears the current hook context.
   *
   * Called internally by the runtime after hook execution completes.
   * @internal
   */
  clearContext() {
    this.currentHookType = void 0;
    this.currentInput = void 0;
  }
  /**
   * Sets a default log file path that only takes effect if no other source
   * has configured file logging.
   *
   * This is the lowest-priority file path source. It will be ignored if
   * any of these have already set a path:
   * - `logFilePath` in the constructor config
   * - `CARDS_HOOKS_LOG_FILE` environment variable
   * - {@link setLogFile} called at runtime
   *
   * Intended for use by CLI entry points (e.g., the `--log` flag).
   * @param filePath - Default path to the log file
   * @example
   * ```typescript
   * // Wire --log CLI argument as a fallback
   * if (args.log) {
   *   logger.setDefaultLogFile(args.log);
   * }
   * ```
   */
  setDefaultLogFile(filePath) {
    if (this.logFilePath === null) {
      this.logFilePath = filePath;
      this.fileInitialized = false;
    }
  }
  /**
   * Configures the log file path at runtime.
   *
   * Call this to enable or change file logging. Setting to `null` disables
   * file logging and closes any open file handle. Directories are created
   * on demand when the first write occurs.
   * @param filePath - Path to the log file, or null to disable
   * @example
   * ```typescript
   * // Enable file logging at runtime
   * logger.setLogFile('/var/log/cards-sdk.log');
   *
   * // Disable file logging
   * logger.setLogFile(null);
   * ```
   */
  setLogFile(filePath) {
    if (this.logFileFd !== null) {
      try {
        closeSync(this.logFileFd);
      } catch {
      }
      this.logFileFd = null;
    }
    this.logFilePath = filePath;
    this.fileInitialized = false;
  }
  /**
   * Closes all resources held by the logger.
   *
   * Call this during graceful shutdown to ensure all log data is flushed.
   * Safe to call multiple times.
   * @example
   * ```typescript
   * process.on('exit', () => {
   *   logger.close();
   * });
   * ```
   */
  close() {
    if (this.logFileFd !== null) {
      try {
        closeSync(this.logFileFd);
      } catch {
      }
      this.logFileFd = null;
    }
    this.fileInitialized = false;
  }
  /**
   * Checks if there are any active handlers or destinations.
   *
   * Returns true if any handlers are registered or file logging is enabled.
   * Useful for deciding whether to compute expensive log context.
   * @returns Whether the logger has any active output destinations
   */
  hasDestinations() {
    const hasHandlers = Array.from(this.handlers.values()).some((handlers) => handlers.size > 0);
    return hasHandlers || this.logFilePath !== null;
  }
  // ============================================================================
  // Private Methods
  // ============================================================================
  /**
   * Emits a log event.
   * @param level - The severity level of the event
   * @param message - The log message
   * @param context - Optional additional context data
   */
  emit(level, message, context) {
    const event = {
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      level,
      hookType: this.currentHookType,
      message,
      input: this.currentInput,
      context
    };
    this.deliverEvent(event);
  }
  /**
   * Delivers an event to all registered destinations.
   * @param event - The log event to deliver
   */
  deliverEvent(event) {
    const levelHandlers = this.handlers.get(event.level);
    if (levelHandlers) {
      for (const handler of levelHandlers) {
        try {
          handler(event);
        } catch {
        }
      }
    }
    this.writeToFile(event);
  }
  /**
   * Writes an event to the log file.
   * @param event - The log event to write
   */
  writeToFile(event) {
    if (!this.logFilePath) return;
    if (!this.fileInitialized) {
      this.initializeFile();
    }
    if (this.logFileFd === null) return;
    try {
      const line = `${JSON.stringify(event)}
`;
      writeSync(this.logFileFd, line);
    } catch {
    }
  }
  /**
   * Initializes the log file for writing.
   */
  initializeFile() {
    this.fileInitialized = true;
    if (!this.logFilePath) return;
    try {
      const dir = dirname(this.logFilePath);
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
      this.logFileFd = openSync(this.logFilePath, "a");
    } catch {
      this.logFileFd = null;
    }
  }
  /**
   * Extracts structured error information from an unknown error.
   * @param error - The error to extract information from
   * @returns Structured error information
   */
  extractErrorInfo(error) {
    if (error instanceof Error) {
      const info = {
        name: error.name,
        message: error.message,
        stack: error.stack
      };
      if (error.cause !== void 0) {
        info.cause = this.extractErrorInfo(error.cause);
      }
      return info;
    }
    return {
      name: "UnknownError",
      message: String(error)
    };
  }
};
var logger = new Logger();

// ../sdk/src/config/validation.ts
import { readFileSync as readFileSync2 } from "node:fs";
function validationSuccess(metadata) {
  if (metadata !== void 0) {
    return { valid: true, metadata };
  }
  return { valid: true };
}
function validationError(errors) {
  return { valid: false, errors };
}
async function executeValidation(validation) {
  const logger2 = new Logger();
  try {
    const filePath = process.env[CARDS_ENV_VARS.FILE_PATH];
    if (!filePath) {
      process.stdout.write(JSON.stringify({ valid: false, errors: ["FILE_PATH environment variable is not set"] }));
      return process.exit(0);
    }
    let metadata;
    try {
      const sidecarContent = readFileSync2(`${filePath}.meta.json`, "utf-8");
      metadata = JSON.parse(sidecarContent);
    } catch {
    }
    const request = {
      filePath,
      metadata
    };
    const context = {
      logger: logger2,
      cwd: process.cwd(),
      typeName: getTypeName(),
      typeVersion: getTypeVersion(),
      fileName: getFileName(),
      cardId: getCardId(),
      environment: getEnvironment(),
      apiBaseUrl: getApiBaseUrl(),
      apiAccessToken: getApiAccessToken()
    };
    const result = await validation(request, context);
    process.stdout.write(JSON.stringify(result));
    process.exit(0);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger2.error("Validation error", { error: errorMessage });
    process.stdout.write(JSON.stringify({ valid: false, errors: [errorMessage] }));
    process.exit(0);
  }
}

// src/validators/adaptive-card-validator.ts
var MAX_SUMMARY_LENGTH = 200;
function isObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function validateRequiredString(obj, field, errors) {
  const value = obj[field];
  if (value === void 0 || value === null) {
    errors.push({ code: "REQUIRED", message: `${field} is required`, field });
  } else if (typeof value !== "string") {
    errors.push({ code: "INVALID_TYPE", message: `${field} must be a string`, field });
  } else if (value.trim().length === 0) {
    errors.push({ code: "EMPTY", message: `${field} must not be empty`, field });
  }
}
function validateOptionalArray(obj, field, path, errors) {
  const value = obj[field];
  if (value !== void 0 && value !== null && !Array.isArray(value)) {
    errors.push({ code: "INVALID_TYPE", message: `${path} must be an array`, field: path });
  }
}
function validateAdaptiveCardSchema(adaptiveCard, errors) {
  if (adaptiveCard["type"] === void 0 || adaptiveCard["type"] === null) {
    errors.push({ code: "REQUIRED", message: "payload.type is required", field: "payload.type" });
  } else if (adaptiveCard["type"] !== "AdaptiveCard") {
    errors.push({ code: "INVALID_VALUE", message: "payload.type must be 'AdaptiveCard'", field: "payload.type" });
  }
  validateOptionalArray(adaptiveCard, "body", "payload.body", errors);
  validateOptionalArray(adaptiveCard, "actions", "payload.actions", errors);
}
var adaptive_card_validator_default = defineTypeValidator(
  {
    typeName: "adaptive-card",
    schema: "JSON object with id, summary, author, and payload (Adaptive Card schema with type, body, actions)",
    description: "Interactive Adaptive Card definitions for user-facing UI components",
    timeout: 3e4
  },
  async (request, context) => {
    const errors = [];
    context.logger.info("Validating adaptive card", { fileName: context.fileName });
    let data;
    try {
      const content = readFileSync3(request.filePath, "utf-8");
      data = JSON.parse(content);
    } catch {
      return validationError(["File must contain valid JSON"]);
    }
    validateRequiredString(data, "id", errors);
    validateRequiredString(data, "summary", errors);
    if (typeof data.summary === "string" && data.summary.length > MAX_SUMMARY_LENGTH) {
      errors.push({
        code: "SUMMARY_TOO_LONG",
        message: `summary must not exceed ${MAX_SUMMARY_LENGTH} characters`,
        field: "summary"
      });
    }
    validateRequiredString(data, "author", errors);
    if (data.payload === void 0 || data.payload === null) {
      errors.push({ code: "REQUIRED", message: "payload is required", field: "payload" });
    } else if (!isObject(data.payload)) {
      errors.push({ code: "INVALID_TYPE", message: "payload must be an object", field: "payload" });
    } else {
      validateAdaptiveCardSchema(data.payload, errors);
    }
    if (errors.length > 0) {
      return validationError(errors.map((e) => e.field ? `**${e.field}**: ${e.message}` : e.message));
    }
    context.logger.info("Adaptive card validation succeeded", {
      cardId: data.id,
      author: data.author
    });
    return validationSuccess({ cardId: data.id });
  }
);

// src/validators/hook-wrapper.ts
executeValidation(adaptive_card_validator_default);
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vLi4vc3JjL3ZhbGlkYXRvcnMvYWRhcHRpdmUtY2FyZC12YWxpZGF0b3IudHMiLCAiLi4vLi4vLi4vc2RrL3NyYy9jb25maWcvZmFjdG9yaWVzL3R5cGUtaG9va3MudHMiLCAiLi4vLi4vLi4vc2RrL3NyYy9jb25maWcvZW52LnRzIiwgIi4uLy4uLy4uL3Nkay9zcmMvY29uZmlnL2xvZ2dlci50cyIsICIuLi8uLi8uLi9zZGsvc3JjL2NvbmZpZy92YWxpZGF0aW9uLnRzIiwgIi4uLy4uL3NyYy92YWxpZGF0b3JzL2hvb2std3JhcHBlci50cyJdLAogICJzb3VyY2VzQ29udGVudCI6IFsiLyoqXG4gKiBBZGFwdGl2ZSBDYXJkIHZhbGlkYXRvciBmb3IgY3VzdG9tIHR5cGVzIHZhbGlkYXRpb24gc3lzdGVtLlxuICpcbiAqIFZhbGlkYXRlcyBBZGFwdGl2ZSBDYXJkIHN0cnVjdHVyZSBmb3IgdGhlICdhZGFwdGl2ZS1jYXJkJyBjdXN0b20gdHlwZS5cbiAqIFJldXNlcyB2YWxpZGF0aW9uIGxvZ2ljIHBhdHRlcm5zIGZyb20gQGNhcmRzL3ZhbGlkYXRvci5cbiAqXG4gKiBJTVBPUlRBTlQ6IFN0YXR1cyBpcyBOT1Qgc3RvcmVkIGluIHRoZSBmaWxlIC0gaXQncyBkZXJpdmVkIGF0IHJlYWQgdGltZSBmcm9tXG4gKiBhZGFwdGl2ZS1jYXJkLXN1Ym1pc3Npb24gZXhpc3RlbmNlLiBUaGUgdmFsaWRhdG9yIGRvZXMgTk9UIHZhbGlkYXRlIHN0YXR1cyBmaWVsZC5cbiAqXG4gKiBAc3VtbWFyeSBBZGFwdGl2ZSBDYXJkIHZhbGlkYXRvciBmb3IgY3VzdG9tIHR5cGVzIHZhbGlkYXRpb24gc3lzdGVtXG4gKi9cblxuaW1wb3J0IHsgcmVhZEZpbGVTeW5jIH0gZnJvbSAnbm9kZTpmcyc7XG5pbXBvcnQgeyBkZWZpbmVUeXBlVmFsaWRhdG9yLCB2YWxpZGF0aW9uRXJyb3IsIHZhbGlkYXRpb25TdWNjZXNzIH0gZnJvbSAnQGNhcmRzL3Nkay9jb25maWcnO1xuXG4vKipcbiAqIEFkYXB0aXZlIENhcmQgaW5wdXQgc3RydWN0dXJlICh3aXRob3V0IHN0YXR1cyAtIGl0J3MgZGVyaXZlZCwgbm90IHN0b3JlZClcbiAqL1xuaW50ZXJmYWNlIEFkYXB0aXZlQ2FyZElucHV0IHtcbiAgaWQ/OiB1bmtub3duO1xuICBzdW1tYXJ5PzogdW5rbm93bjtcbiAgYXV0aG9yPzogdW5rbm93bjtcbiAgcGF5bG9hZD86IHVua25vd247XG4gIFtrZXk6IHN0cmluZ106IHVua25vd247XG59XG5cbmNvbnN0IE1BWF9TVU1NQVJZX0xFTkdUSCA9IDIwMDtcblxuLyoqXG4gKiBDaGVja3MgaWYgYSB2YWx1ZSBpcyBhIG5vbi1udWxsLCBub24tYXJyYXkgb2JqZWN0LlxuICpcbiAqIEBwYXJhbSB2YWx1ZSBWYWx1ZSB0byB0ZXN0IGFzIGEgcGxhaW4gb2JqZWN0LlxuICogQHJldHVybnMgVHJ1ZSB3aGVuIHRoZSB2YWx1ZSBpcyBhbiBvYmplY3QgcmVjb3JkLlxuICovXG5mdW5jdGlvbiBpc09iamVjdCh2YWx1ZTogdW5rbm93bik6IHZhbHVlIGlzIFJlY29yZDxzdHJpbmcsIHVua25vd24+IHtcbiAgcmV0dXJuIHR5cGVvZiB2YWx1ZSA9PT0gJ29iamVjdCcgJiYgdmFsdWUgIT09IG51bGwgJiYgIUFycmF5LmlzQXJyYXkodmFsdWUpO1xufVxuXG4vKipcbiAqIFZhbGlkYXRpb24gZXJyb3IgdHlwZSBhbGlhcy5cbiAqL1xudHlwZSBWYWxFcnJvciA9IHsgY29kZTogc3RyaW5nOyBtZXNzYWdlOiBzdHJpbmc7IGZpZWxkPzogc3RyaW5nIH07XG5cbi8qKlxuICogVmFsaWRhdGVzIHJlcXVpcmVkIHN0cmluZyBmaWVsZC5cbiAqXG4gKiBAcGFyYW0gb2JqIE9iamVjdCBiZWluZyB2YWxpZGF0ZWQuXG4gKiBAcGFyYW0gZmllbGQgRmllbGQgbmFtZSB0aGF0IG11c3QgYmUgYSBub24tZW1wdHkgc3RyaW5nLlxuICogQHBhcmFtIGVycm9ycyBDb2xsZWN0aW9uIHdoZXJlIHZhbGlkYXRpb24gZXJyb3JzIGFyZSBhY2N1bXVsYXRlZC5cbiAqL1xuZnVuY3Rpb24gdmFsaWRhdGVSZXF1aXJlZFN0cmluZyhvYmo6IFJlY29yZDxzdHJpbmcsIHVua25vd24+LCBmaWVsZDogc3RyaW5nLCBlcnJvcnM6IFZhbEVycm9yW10pOiB2b2lkIHtcbiAgY29uc3QgdmFsdWUgPSBvYmpbZmllbGRdO1xuICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gbnVsbCkge1xuICAgIGVycm9ycy5wdXNoKHsgY29kZTogJ1JFUVVJUkVEJywgbWVzc2FnZTogYCR7ZmllbGR9IGlzIHJlcXVpcmVkYCwgZmllbGQgfSk7XG4gIH0gZWxzZSBpZiAodHlwZW9mIHZhbHVlICE9PSAnc3RyaW5nJykge1xuICAgIGVycm9ycy5wdXNoKHsgY29kZTogJ0lOVkFMSURfVFlQRScsIG1lc3NhZ2U6IGAke2ZpZWxkfSBtdXN0IGJlIGEgc3RyaW5nYCwgZmllbGQgfSk7XG4gIH0gZWxzZSBpZiAodmFsdWUudHJpbSgpLmxlbmd0aCA9PT0gMCkge1xuICAgIGVycm9ycy5wdXNoKHsgY29kZTogJ0VNUFRZJywgbWVzc2FnZTogYCR7ZmllbGR9IG11c3Qgbm90IGJlIGVtcHR5YCwgZmllbGQgfSk7XG4gIH1cbn1cblxuLyoqXG4gKiBWYWxpZGF0ZXMgdGhhdCBhbiBvcHRpb25hbCBmaWVsZCBpcyBhbiBhcnJheSBpZiBwcmVzZW50LlxuICpcbiAqIEBwYXJhbSBvYmogT2JqZWN0IGJlaW5nIHZhbGlkYXRlZC5cbiAqIEBwYXJhbSBmaWVsZCBGaWVsZCBuYW1lIHRoYXQgbWF5IGNvbnRhaW4gYW4gYXJyYXkuXG4gKiBAcGFyYW0gcGF0aCBFcnJvciBmaWVsZCBwYXRoIHVzZWQgaW4gbWVzc2FnZXMuXG4gKiBAcGFyYW0gZXJyb3JzIENvbGxlY3Rpb24gd2hlcmUgdmFsaWRhdGlvbiBlcnJvcnMgYXJlIGFjY3VtdWxhdGVkLlxuICovXG5mdW5jdGlvbiB2YWxpZGF0ZU9wdGlvbmFsQXJyYXkob2JqOiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPiwgZmllbGQ6IHN0cmluZywgcGF0aDogc3RyaW5nLCBlcnJvcnM6IFZhbEVycm9yW10pOiB2b2lkIHtcbiAgY29uc3QgdmFsdWUgPSBvYmpbZmllbGRdO1xuICBpZiAodmFsdWUgIT09IHVuZGVmaW5lZCAmJiB2YWx1ZSAhPT0gbnVsbCAmJiAhQXJyYXkuaXNBcnJheSh2YWx1ZSkpIHtcbiAgICBlcnJvcnMucHVzaCh7IGNvZGU6ICdJTlZBTElEX1RZUEUnLCBtZXNzYWdlOiBgJHtwYXRofSBtdXN0IGJlIGFuIGFycmF5YCwgZmllbGQ6IHBhdGggfSk7XG4gIH1cbn1cblxuLyoqXG4gKiBWYWxpZGF0ZXMgdGhlIEFkYXB0aXZlIENhcmQgc2NoZW1hLlxuICpcbiAqIEBwYXJhbSBhZGFwdGl2ZUNhcmQgUGF5bG9hZCBvYmplY3QgZXhwZWN0ZWQgdG8gbWF0Y2ggQWRhcHRpdmUgQ2FyZCBzY2hlbWEuXG4gKiBAcGFyYW0gZXJyb3JzIENvbGxlY3Rpb24gd2hlcmUgc2NoZW1hIHZhbGlkYXRpb24gZXJyb3JzIGFyZSBhY2N1bXVsYXRlZC5cbiAqL1xuZnVuY3Rpb24gdmFsaWRhdGVBZGFwdGl2ZUNhcmRTY2hlbWEoYWRhcHRpdmVDYXJkOiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPiwgZXJyb3JzOiBWYWxFcnJvcltdKTogdm9pZCB7XG4gIC8vIHR5cGUgaXMgcmVxdWlyZWQgYW5kIG11c3QgYmUgJ0FkYXB0aXZlQ2FyZCdcbiAgaWYgKGFkYXB0aXZlQ2FyZFsndHlwZSddID09PSB1bmRlZmluZWQgfHwgYWRhcHRpdmVDYXJkWyd0eXBlJ10gPT09IG51bGwpIHtcbiAgICBlcnJvcnMucHVzaCh7IGNvZGU6ICdSRVFVSVJFRCcsIG1lc3NhZ2U6ICdwYXlsb2FkLnR5cGUgaXMgcmVxdWlyZWQnLCBmaWVsZDogJ3BheWxvYWQudHlwZScgfSk7XG4gIH0gZWxzZSBpZiAoYWRhcHRpdmVDYXJkWyd0eXBlJ10gIT09ICdBZGFwdGl2ZUNhcmQnKSB7XG4gICAgZXJyb3JzLnB1c2goeyBjb2RlOiAnSU5WQUxJRF9WQUxVRScsIG1lc3NhZ2U6IFwicGF5bG9hZC50eXBlIG11c3QgYmUgJ0FkYXB0aXZlQ2FyZCdcIiwgZmllbGQ6ICdwYXlsb2FkLnR5cGUnIH0pO1xuICB9XG5cbiAgLy8gYm9keSBpcyBvcHRpb25hbCBidXQgbXVzdCBiZSBhbiBhcnJheSBpZiBwcmVzZW50XG4gIHZhbGlkYXRlT3B0aW9uYWxBcnJheShhZGFwdGl2ZUNhcmQsICdib2R5JywgJ3BheWxvYWQuYm9keScsIGVycm9ycyk7XG5cbiAgLy8gYWN0aW9ucyBpcyBvcHRpb25hbCBidXQgbXVzdCBiZSBhbiBhcnJheSBpZiBwcmVzZW50XG4gIHZhbGlkYXRlT3B0aW9uYWxBcnJheShhZGFwdGl2ZUNhcmQsICdhY3Rpb25zJywgJ3BheWxvYWQuYWN0aW9ucycsIGVycm9ycyk7XG59XG5cbi8qKlxuICogVHlwZSB2YWxpZGF0b3IgZm9yIGFkYXB0aXZlLWNhcmQgZmlsZXMuXG4gKlxuICogVmFsaWRhdGVzIEpTT04gc3RydWN0dXJlIGluY2x1ZGluZyByZXF1aXJlZCBmaWVsZHMgKGlkLCBzdW1tYXJ5LCBhdXRob3IsIHBheWxvYWQpXG4gKiBhbmQgdGhlIEFkYXB0aXZlIENhcmQgc2NoZW1hIHdpdGhpbiB0aGUgcGF5bG9hZC5cbiAqL1xuZXhwb3J0IGRlZmF1bHQgZGVmaW5lVHlwZVZhbGlkYXRvcihcbiAge1xuICAgIHR5cGVOYW1lOiAnYWRhcHRpdmUtY2FyZCcsXG4gICAgc2NoZW1hOiAnSlNPTiBvYmplY3Qgd2l0aCBpZCwgc3VtbWFyeSwgYXV0aG9yLCBhbmQgcGF5bG9hZCAoQWRhcHRpdmUgQ2FyZCBzY2hlbWEgd2l0aCB0eXBlLCBib2R5LCBhY3Rpb25zKScsXG4gICAgZGVzY3JpcHRpb246ICdJbnRlcmFjdGl2ZSBBZGFwdGl2ZSBDYXJkIGRlZmluaXRpb25zIGZvciB1c2VyLWZhY2luZyBVSSBjb21wb25lbnRzJyxcbiAgICB0aW1lb3V0OiAzMDAwMFxuICB9LFxuICBhc3luYyAocmVxdWVzdCwgY29udGV4dCkgPT4ge1xuICAgIGNvbnN0IGVycm9yczogVmFsRXJyb3JbXSA9IFtdO1xuXG4gICAgY29udGV4dC5sb2dnZXIuaW5mbygnVmFsaWRhdGluZyBhZGFwdGl2ZSBjYXJkJywgeyBmaWxlTmFtZTogY29udGV4dC5maWxlTmFtZSB9KTtcblxuICAgIC8vIFBhcnNlIEpTT04gZnJvbSBmaWxlXG4gICAgbGV0IGRhdGE6IEFkYXB0aXZlQ2FyZElucHV0O1xuICAgIHRyeSB7XG4gICAgICBjb25zdCBjb250ZW50ID0gcmVhZEZpbGVTeW5jKHJlcXVlc3QuZmlsZVBhdGgsICd1dGYtOCcpO1xuICAgICAgZGF0YSA9IEpTT04ucGFyc2UoY29udGVudCkgYXMgQWRhcHRpdmVDYXJkSW5wdXQ7XG4gICAgfSBjYXRjaCB7XG4gICAgICByZXR1cm4gdmFsaWRhdGlvbkVycm9yKFsnRmlsZSBtdXN0IGNvbnRhaW4gdmFsaWQgSlNPTiddKTtcbiAgICB9XG5cbiAgICAvLyBWYWxpZGF0ZSBpZCBmaWVsZFxuICAgIHZhbGlkYXRlUmVxdWlyZWRTdHJpbmcoZGF0YSwgJ2lkJywgZXJyb3JzKTtcblxuICAgIC8vIFZhbGlkYXRlIHN1bW1hcnkgZmllbGQgd2l0aCBsZW5ndGggY29uc3RyYWludFxuICAgIHZhbGlkYXRlUmVxdWlyZWRTdHJpbmcoZGF0YSwgJ3N1bW1hcnknLCBlcnJvcnMpO1xuICAgIGlmICh0eXBlb2YgZGF0YS5zdW1tYXJ5ID09PSAnc3RyaW5nJyAmJiBkYXRhLnN1bW1hcnkubGVuZ3RoID4gTUFYX1NVTU1BUllfTEVOR1RIKSB7XG4gICAgICBlcnJvcnMucHVzaCh7XG4gICAgICAgIGNvZGU6ICdTVU1NQVJZX1RPT19MT05HJyxcbiAgICAgICAgbWVzc2FnZTogYHN1bW1hcnkgbXVzdCBub3QgZXhjZWVkICR7TUFYX1NVTU1BUllfTEVOR1RIfSBjaGFyYWN0ZXJzYCxcbiAgICAgICAgZmllbGQ6ICdzdW1tYXJ5J1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgLy8gVmFsaWRhdGUgYXV0aG9yIGZpZWxkXG4gICAgdmFsaWRhdGVSZXF1aXJlZFN0cmluZyhkYXRhLCAnYXV0aG9yJywgZXJyb3JzKTtcblxuICAgIC8vIFZhbGlkYXRlIHBheWxvYWQgZmllbGQgKHJlcXVpcmVkIG9iamVjdCB3aXRoIEFkYXB0aXZlIENhcmQgc2NoZW1hKVxuICAgIGlmIChkYXRhLnBheWxvYWQgPT09IHVuZGVmaW5lZCB8fCBkYXRhLnBheWxvYWQgPT09IG51bGwpIHtcbiAgICAgIGVycm9ycy5wdXNoKHsgY29kZTogJ1JFUVVJUkVEJywgbWVzc2FnZTogJ3BheWxvYWQgaXMgcmVxdWlyZWQnLCBmaWVsZDogJ3BheWxvYWQnIH0pO1xuICAgIH0gZWxzZSBpZiAoIWlzT2JqZWN0KGRhdGEucGF5bG9hZCkpIHtcbiAgICAgIGVycm9ycy5wdXNoKHsgY29kZTogJ0lOVkFMSURfVFlQRScsIG1lc3NhZ2U6ICdwYXlsb2FkIG11c3QgYmUgYW4gb2JqZWN0JywgZmllbGQ6ICdwYXlsb2FkJyB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgdmFsaWRhdGVBZGFwdGl2ZUNhcmRTY2hlbWEoZGF0YS5wYXlsb2FkLCBlcnJvcnMpO1xuICAgIH1cblxuICAgIGlmIChlcnJvcnMubGVuZ3RoID4gMCkge1xuICAgICAgcmV0dXJuIHZhbGlkYXRpb25FcnJvcihlcnJvcnMubWFwKChlKSA9PiAoZS5maWVsZCA/IGAqKiR7ZS5maWVsZH0qKjogJHtlLm1lc3NhZ2V9YCA6IGUubWVzc2FnZSkpKTtcbiAgICB9XG5cbiAgICBjb250ZXh0LmxvZ2dlci5pbmZvKCdBZGFwdGl2ZSBjYXJkIHZhbGlkYXRpb24gc3VjY2VlZGVkJywge1xuICAgICAgY2FyZElkOiBkYXRhLmlkIGFzIHN0cmluZyxcbiAgICAgIGF1dGhvcjogZGF0YS5hdXRob3IgYXMgc3RyaW5nXG4gICAgfSk7XG5cbiAgICByZXR1cm4gdmFsaWRhdGlvblN1Y2Nlc3MoeyBjYXJkSWQ6IGRhdGEuaWQgYXMgc3RyaW5nIH0pO1xuICB9XG4pO1xuIiwgIi8qKlxuICogVHlwZSBsaWZlY3ljbGUgaG9vayBmYWN0b3JpZXMuXG4gKlxuICogVGhlc2UgZmFjdG9yaWVzIGNyZWF0ZSB0eXBlLXNwZWNpZmljIGhvb2tzIGZvciB2YWxpZGF0aW9uIGFuZCBsaWZlY3ljbGUgZXZlbnRzLlxuICogVGhleSB1c2UgU2FtZVNoYXBlIGZvciBjb21waWxlLXRpbWUgdHlwbyBkZXRlY3Rpb24gYW5kIHByZXNlcnZlIHRoZSB0eXBlIG5hbWVcbiAqIGFzIGEgZ2VuZXJpYyBwYXJhbWV0ZXIuXG4gKlxuICpcbiAqIEBzdW1tYXJ5IFR5cGUgbGlmZWN5Y2xlIGhvb2sgZmFjdG9yaWVzXG4gKiBAbW9kdWxlIGZhY3Rvcmllcy90eXBlLWhvb2tzXG4gKi9cblxuaW1wb3J0IHR5cGUgeyBWYWxpZGF0aW9uUmVzdWx0IH0gZnJvbSAnLi4vLi4vcHJvdG9jb2wvaW5kZXguanMnO1xuaW1wb3J0IHR5cGUge1xuICBUeXBlQ3JlYXRlQ29tbWFuZCxcbiAgVHlwZURlbGV0ZUNvbW1hbmQsXG4gIFR5cGVVcGRhdGVDb21tYW5kLFxuICBUeXBlVmFsaWRhdG9yQ29tbWFuZFxufSBmcm9tICcuLi9jb21tYW5kLXR5cGVzLmpzJztcbmltcG9ydCB0eXBlIHsgVHlwZUhvb2tDb250ZXh0LCBUeXBlSG9va0lucHV0LCBUeXBlVmFsaWRhdG9yQ29udGV4dCwgVmFsaWRhdG9yRmlsZVJlcXVlc3QgfSBmcm9tICcuLi9pbnB1dHMuanMnO1xuaW1wb3J0IHR5cGUgeyBTYW1lU2hhcGUgfSBmcm9tICcuLi90eXBlLXV0aWxzLmpzJztcblxuLyoqXG4gKiBDb25maWd1cmF0aW9uIGZvciB0eXBlIGxpZmVjeWNsZSBob29rcy5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBUeXBlQ29uZmlnIHtcbiAgLyoqIFRoZSB0eXBlIG5hbWUgKGUuZy4sICdhZGFwdGl2ZS1jYXJkJykuICovXG4gIHR5cGVOYW1lOiBzdHJpbmc7XG4gIC8qKiBPcHRpb25hbCB0aW1lb3V0IGluIG1pbGxpc2Vjb25kcy4gKi9cbiAgdGltZW91dD86IG51bWJlcjtcblxuICAvKipcbiAgICogSGFuZGxlciBzb3VyY2UgZmlsZSBwYXRoLCBpbmplY3RlZCBieSB0aGUgYGluamVjdFNvdXJjZVBhdGhgIGVzYnVpbGRcbiAgICogcGx1Z2luIGR1cmluZyBjb25maWcgbG9hZGluZy4gRG8gbm90IHNldCBtYW51YWxseS5cbiAgICpcbiAgICogQGludGVybmFsXG4gICAqL1xuICBzb3VyY2VQYXRoPzogc3RyaW5nO1xufVxuXG4vKipcbiAqIENvbmZpZ3VyYXRpb24gZm9yIHR5cGUgdmFsaWRhdG9ycywgZXh0ZW5kaW5nIFR5cGVDb25maWcgd2l0aCBzY2hlbWEgbWV0YWRhdGEuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgVHlwZVZhbGlkYXRvckNvbmZpZyBleHRlbmRzIFR5cGVDb25maWcge1xuICAvKiogSHVtYW4tcmVhZGFibGUgc2NoZW1hIGRlc2NyaWJpbmcgdGhlIGV4cGVjdGVkIGZpbGUgZm9ybWF0LiAqL1xuICBzY2hlbWE6IHN0cmluZztcbiAgLyoqIERlc2NyaXB0aW9uIG9mIHRoZSB0eXBlJ3MgcHVycG9zZS4gKi9cbiAgZGVzY3JpcHRpb246IHN0cmluZztcbn1cblxuLyoqXG4gKiBIYW5kbGVyIGZ1bmN0aW9uIGZvciB0eXBlIGxpZmVjeWNsZSBldmVudHMgKGNyZWF0ZSwgdXBkYXRlLCBkZWxldGUpLlxuICpcbiAqIEBwYXJhbSBpbnB1dCAtIFR5cGUgaG9vayBpbnB1dCBjb250YWluaW5nIGZpbGUgbWV0YWRhdGFcbiAqIEBwYXJhbSBjb250ZXh0IC0gQWN0aW9uIGNvbnRleHQgd2l0aCBsb2dnZXIgYW5kIHV0aWxpdGllc1xuICovXG5leHBvcnQgdHlwZSBUeXBlSGFuZGxlciA9IChpbnB1dDogVHlwZUhvb2tJbnB1dCwgY29udGV4dDogVHlwZUhvb2tDb250ZXh0KSA9PiB2b2lkIHwgUHJvbWlzZTx2b2lkPjtcblxuLyoqXG4gKiBIYW5kbGVyIGZ1bmN0aW9uIGZvciB0eXBlIHZhbGlkYXRvcnMuXG4gKlxuICogUmVjZWl2ZXMgYSBmaWxlIHJlcXVlc3Qgd2l0aCB0aGUgcGF0aCBhbmQgb3B0aW9uYWwgc2lkZWNhciBtZXRhZGF0YS5cbiAqIFRoZSBmaWxlIGlzIGFscmVhZHkgb24gZGlzazsgdmFsaWRhdG9ycyByZWFkIGl0IHRoZW1zZWx2ZXMuXG4gKlxuICogQHBhcmFtIHJlcXVlc3QgLSBGaWxlIHJlcXVlc3Qgd2l0aCBwYXRoIGFuZCBvcHRpb25hbCBtZXRhZGF0YVxuICogQHBhcmFtIGNvbnRleHQgLSBWYWxpZGF0b3IgY29udGV4dCB3aXRoIHR5cGUgbWV0YWRhdGFcbiAqIEByZXR1cm5zIFZhbGlkYXRpb24gcmVzdWx0IGluZGljYXRpbmcgc3VjY2VzcyBvciBmYWlsdXJlXG4gKi9cbmV4cG9ydCB0eXBlIFR5cGVWYWxpZGF0b3JIYW5kbGVyID0gKFxuICByZXF1ZXN0OiBWYWxpZGF0b3JGaWxlUmVxdWVzdCxcbiAgY29udGV4dDogVHlwZVZhbGlkYXRvckNvbnRleHRcbikgPT4gVmFsaWRhdGlvblJlc3VsdCB8IFByb21pc2U8VmFsaWRhdGlvblJlc3VsdD47XG5cbi8qKlxuICogQ3JlYXRlcyBhIHR5cGUgdmFsaWRhdG9yIGhvb2sgZm9yIGZpbGUgdmFsaWRhdGlvbi5cbiAqXG4gKiBWYWxpZGF0b3JzIHJlY2VpdmUgdGhlIGZpbGUgcGF0aCBhbmQgb3B0aW9uYWwgc2lkZWNhciBtZXRhZGF0YS5cbiAqIFRoZSBmaWxlIGlzIGFscmVhZHkgb24gZGlzazsgdmFsaWRhdG9ycyByZWFkIGl0IHRoZW1zZWx2ZXMuIFJldHVybiBhXG4gKiBgVmFsaWRhdGlvblJlc3VsdGAgdG8gaW5kaWNhdGUgc3VjY2VzcyBvciBmYWlsdXJlLlxuICpcbiAqIEB0ZW1wbGF0ZSBUIC0gQ29uZmlnIHR5cGUgKGluZmVycmVkKVxuICogQHBhcmFtIGNvbmZpZyAtIFR5cGUgbWV0YWRhdGEgaW5jbHVkaW5nIHRoZSB0eXBlIG5hbWVcbiAqIEBwYXJhbSBoYW5kbGVyIC0gRnVuY3Rpb24gdGhhdCB2YWxpZGF0ZXMgdGhlIGZpbGUgYW5kIHJldHVybnMgYSByZXN1bHRcbiAqIEByZXR1cm5zIEEgY29tbWFuZCB3cmFwcGVyIHN1aXRhYmxlIGZvciBkZWZhdWx0IGV4cG9ydFxuICpcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiAvLyB2YWxpZGF0b3JzL2FkYXB0aXZlLWNhcmQtdmFsaWRhdG9yLnRzXG4gKiBpbXBvcnQgeyByZWFkRmlsZVN5bmMgfSBmcm9tICdub2RlOmZzJztcbiAqIGltcG9ydCB7IGRlZmluZVR5cGVWYWxpZGF0b3IsIHZhbGlkYXRpb25TdWNjZXNzLCB2YWxpZGF0aW9uRXJyb3IgfSBmcm9tICdAY2FyZHMvc2RrL2NvbmZpZyc7XG4gKlxuICogZXhwb3J0IGRlZmF1bHQgZGVmaW5lVHlwZVZhbGlkYXRvcihcbiAqICAgeyB0eXBlTmFtZTogJ2FkYXB0aXZlLWNhcmQnIH0sXG4gKiAgIGFzeW5jIChyZXF1ZXN0LCBjb250ZXh0KSA9PiB7XG4gKiAgICAgY29uc3QgY29udGVudCA9IHJlYWRGaWxlU3luYyhyZXF1ZXN0LmZpbGVQYXRoLCAndXRmLTgnKTtcbiAqICAgICBjb25zdCBjYXJkID0gSlNPTi5wYXJzZShjb250ZW50KSBhcyBBZGFwdGl2ZUNhcmQ7XG4gKlxuICogICAgIGNvbnN0IGVycm9ycyA9IHZhbGlkYXRlQWRhcHRpdmVDYXJkKGNhcmQpO1xuICogICAgIGlmIChlcnJvcnMubGVuZ3RoID4gMCkge1xuICogICAgICAgcmV0dXJuIHZhbGlkYXRpb25FcnJvcihlcnJvcnMubWFwKGUgPT4gZS5tZXNzYWdlKSk7XG4gKiAgICAgfVxuICpcbiAqICAgICBjb250ZXh0LmxvZ2dlci5pbmZvKCdWYWxpZGF0aW9uIHBhc3NlZCcsIHsgZmlsZTogY29udGV4dC5maWxlTmFtZSB9KTtcbiAqICAgICByZXR1cm4gdmFsaWRhdGlvblN1Y2Nlc3MoeyBjYXJkSWQ6IGNhcmQuaWQgfSk7XG4gKiAgIH1cbiAqICk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGRlZmluZVR5cGVWYWxpZGF0b3I8VCBleHRlbmRzIFR5cGVWYWxpZGF0b3JDb25maWc+KFxuICBjb25maWc6IFNhbWVTaGFwZTxUeXBlVmFsaWRhdG9yQ29uZmlnLCBUPixcbiAgaGFuZGxlcjogVHlwZVZhbGlkYXRvckhhbmRsZXJcbik6IFR5cGVWYWxpZGF0b3JDb21tYW5kPFRbJ3R5cGVOYW1lJ10+IHtcbiAgY29uc3QgZm4gPSBhc3luYyAocmVxdWVzdDogVmFsaWRhdG9yRmlsZVJlcXVlc3QsIGNvbnRleHQ6IFR5cGVWYWxpZGF0b3JDb250ZXh0KTogUHJvbWlzZTxWYWxpZGF0aW9uUmVzdWx0PiA9PiB7XG4gICAgcmV0dXJuIGF3YWl0IFByb21pc2UucmVzb2x2ZShoYW5kbGVyKHJlcXVlc3QsIGNvbnRleHQpKTtcbiAgfTtcblxuICByZXR1cm4gT2JqZWN0LmFzc2lnbihmbiwge1xuICAgIGZhY3RvcnlUeXBlOiAndHlwZVZhbGlkYXRvcicgYXMgY29uc3QsXG4gICAgdHlwZU5hbWU6IGNvbmZpZy50eXBlTmFtZSxcbiAgICB0aW1lb3V0OiBjb25maWcudGltZW91dCxcbiAgICBzb3VyY2VQYXRoOiBjb25maWcuc291cmNlUGF0aCxcbiAgICBzY2hlbWE6IGNvbmZpZy5zY2hlbWEsXG4gICAgZGVzY3JpcHRpb246IGNvbmZpZy5kZXNjcmlwdGlvblxuICB9KSBhcyBUeXBlVmFsaWRhdG9yQ29tbWFuZDxUWyd0eXBlTmFtZSddPjtcbn1cblxuLyoqXG4gKiBDcmVhdGVzIGEgdHlwZSBjcmVhdGUgaG9vayBmb3IgbmV3IGZpbGUgZXZlbnRzLlxuICpcbiAqIFJ1bnMgYWZ0ZXIgYSBuZXcgdHlwZWQgZmlsZSBwYXNzZXMgdmFsaWRhdGlvbi4gVXNlIHRoaXMgZm9yIHNpZGUgZWZmZWN0c1xuICogbGlrZSBpbmRleGluZywgbm90aWZpY2F0aW9ucywgb3Igc3luY2luZyB3aXRoIGV4dGVybmFsIHN5c3RlbXMuXG4gKlxuICogQHRlbXBsYXRlIFQgLSBDb25maWcgdHlwZSAoaW5mZXJyZWQpXG4gKiBAcGFyYW0gY29uZmlnIC0gVHlwZSBtZXRhZGF0YSBpbmNsdWRpbmcgdGhlIHR5cGUgbmFtZVxuICogQHBhcmFtIGhhbmRsZXIgLSBBc3luYyBmdW5jdGlvbiB0aGF0IGhhbmRsZXMgdGhlIGNyZWF0ZSBldmVudFxuICogQHJldHVybnMgQSBjb21tYW5kIHdyYXBwZXIgc3VpdGFibGUgZm9yIGRlZmF1bHQgZXhwb3J0XG4gKlxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIC8vIHR5cGVzL2FkYXB0aXZlLWNhcmQvY3JlYXRlLnRzXG4gKiBpbXBvcnQgeyBkZWZpbmVUeXBlQ3JlYXRlIH0gZnJvbSAnQGNhcmRzL3Nkay9jb25maWcnO1xuICpcbiAqIGV4cG9ydCBkZWZhdWx0IGRlZmluZVR5cGVDcmVhdGUoXG4gKiAgIHsgdHlwZU5hbWU6ICdhZGFwdGl2ZS1jYXJkJyB9LFxuICogICBhc3luYyAoaW5wdXQsIHsgbG9nZ2VyIH0pID0+IHtcbiAqICAgICBsb2dnZXIuaW5mbygnTmV3IGFkYXB0aXZlIGNhcmQgY3JlYXRlZCcsIHtcbiAqICAgICAgIGZpbGU6IGlucHV0LmZpbGVOYW1lLFxuICogICAgICAgc2l6ZTogaW5wdXQuZmlsZVNpemVcbiAqICAgICB9KTtcbiAqXG4gKiAgICAgLy8gSW5kZXggZm9yIHNlYXJjaFxuICogICAgIGF3YWl0IHNlYXJjaEluZGV4LmFkZCh7XG4gKiAgICAgICBpZDogaW5wdXQuZmlsZVNoYTI1NixcbiAqICAgICAgIHBhdGg6IGlucHV0LmZpbGVQYXRoLFxuICogICAgICAgdHlwZTogaW5wdXQudHlwZU5hbWVcbiAqICAgICB9KTtcbiAqICAgfVxuICogKTtcbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gZGVmaW5lVHlwZUNyZWF0ZTxUIGV4dGVuZHMgVHlwZUNvbmZpZz4oXG4gIGNvbmZpZzogU2FtZVNoYXBlPFR5cGVDb25maWcsIFQ+LFxuICBoYW5kbGVyOiBUeXBlSGFuZGxlclxuKTogVHlwZUNyZWF0ZUNvbW1hbmQ8VFsndHlwZU5hbWUnXT4ge1xuICBjb25zdCBmbiA9IGFzeW5jIChpbnB1dDogVHlwZUhvb2tJbnB1dCwgY29udGV4dDogVHlwZUhvb2tDb250ZXh0KTogUHJvbWlzZTx2b2lkPiA9PiB7XG4gICAgYXdhaXQgaGFuZGxlcihpbnB1dCwgY29udGV4dCk7XG4gIH07XG5cbiAgZm4uZmFjdG9yeVR5cGUgPSAndHlwZUNyZWF0ZScgYXMgY29uc3Q7XG4gIGZuLnR5cGVOYW1lID0gY29uZmlnLnR5cGVOYW1lO1xuICBmbi50aW1lb3V0ID0gY29uZmlnLnRpbWVvdXQ7XG4gIGZuLnNvdXJjZVBhdGggPSBjb25maWcuc291cmNlUGF0aDtcblxuICByZXR1cm4gZm4gYXMgVHlwZUNyZWF0ZUNvbW1hbmQ8VFsndHlwZU5hbWUnXT47XG59XG5cbi8qKlxuICogQ3JlYXRlcyBhIHR5cGUgdXBkYXRlIGhvb2sgZm9yIG1vZGlmaWVkIGZpbGUgZXZlbnRzLlxuICpcbiAqIFJ1bnMgYWZ0ZXIgYW4gZXhpc3RpbmcgdHlwZWQgZmlsZSBpcyBtb2RpZmllZCBhbmQgcGFzc2VzIHZhbGlkYXRpb24uXG4gKiBUaGUgaW5wdXQgaW5jbHVkZXMgdGhlIG5ldyBmaWxlIGhhc2gsIGVuYWJsaW5nIGVmZmljaWVudCBjaGFuZ2UgZGV0ZWN0aW9uLlxuICpcbiAqIEB0ZW1wbGF0ZSBUIC0gQ29uZmlnIHR5cGUgKGluZmVycmVkKVxuICogQHBhcmFtIGNvbmZpZyAtIFR5cGUgbWV0YWRhdGEgaW5jbHVkaW5nIHRoZSB0eXBlIG5hbWVcbiAqIEBwYXJhbSBoYW5kbGVyIC0gQXN5bmMgZnVuY3Rpb24gdGhhdCBoYW5kbGVzIHRoZSB1cGRhdGUgZXZlbnRcbiAqIEByZXR1cm5zIEEgY29tbWFuZCB3cmFwcGVyIHN1aXRhYmxlIGZvciBkZWZhdWx0IGV4cG9ydFxuICpcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiAvLyB0eXBlcy9hZGFwdGl2ZS1jYXJkL3VwZGF0ZS50c1xuICogaW1wb3J0IHsgZGVmaW5lVHlwZVVwZGF0ZSB9IGZyb20gJ0BjYXJkcy9zZGsvY29uZmlnJztcbiAqXG4gKiBleHBvcnQgZGVmYXVsdCBkZWZpbmVUeXBlVXBkYXRlKFxuICogICB7IHR5cGVOYW1lOiAnYWRhcHRpdmUtY2FyZCcgfSxcbiAqICAgYXN5bmMgKGlucHV0LCB7IGxvZ2dlciB9KSA9PiB7XG4gKiAgICAgbG9nZ2VyLmluZm8oJ0FkYXB0aXZlIGNhcmQgdXBkYXRlZCcsIHtcbiAqICAgICAgIGZpbGU6IGlucHV0LmZpbGVOYW1lLFxuICogICAgICAgbmV3SGFzaDogaW5wdXQuZmlsZVNoYTI1Ni5zbGljZSgwLCA4KVxuICogICAgIH0pO1xuICpcbiAqICAgICAvLyBVcGRhdGUgc2VhcmNoIGluZGV4XG4gKiAgICAgYXdhaXQgc2VhcmNoSW5kZXgudXBkYXRlKGlucHV0LmZpbGVQYXRoLCB7XG4gKiAgICAgICBoYXNoOiBpbnB1dC5maWxlU2hhMjU2LFxuICogICAgICAgdXBkYXRlZEF0OiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKClcbiAqICAgICB9KTtcbiAqICAgfVxuICogKTtcbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gZGVmaW5lVHlwZVVwZGF0ZTxUIGV4dGVuZHMgVHlwZUNvbmZpZz4oXG4gIGNvbmZpZzogU2FtZVNoYXBlPFR5cGVDb25maWcsIFQ+LFxuICBoYW5kbGVyOiBUeXBlSGFuZGxlclxuKTogVHlwZVVwZGF0ZUNvbW1hbmQ8VFsndHlwZU5hbWUnXT4ge1xuICBjb25zdCBmbiA9IGFzeW5jIChpbnB1dDogVHlwZUhvb2tJbnB1dCwgY29udGV4dDogVHlwZUhvb2tDb250ZXh0KTogUHJvbWlzZTx2b2lkPiA9PiB7XG4gICAgYXdhaXQgaGFuZGxlcihpbnB1dCwgY29udGV4dCk7XG4gIH07XG5cbiAgZm4uZmFjdG9yeVR5cGUgPSAndHlwZVVwZGF0ZScgYXMgY29uc3Q7XG4gIGZuLnR5cGVOYW1lID0gY29uZmlnLnR5cGVOYW1lO1xuICBmbi50aW1lb3V0ID0gY29uZmlnLnRpbWVvdXQ7XG4gIGZuLnNvdXJjZVBhdGggPSBjb25maWcuc291cmNlUGF0aDtcblxuICByZXR1cm4gZm4gYXMgVHlwZVVwZGF0ZUNvbW1hbmQ8VFsndHlwZU5hbWUnXT47XG59XG5cbi8qKlxuICogQ3JlYXRlcyBhIHR5cGUgZGVsZXRlIGhvb2sgZm9yIGZpbGUgcmVtb3ZhbCBldmVudHMuXG4gKlxuICogUnVucyB3aGVuIGEgdHlwZWQgZmlsZSBpcyBkZWxldGVkLiBUaGUgZmlsZSBtYXkgYWxyZWFkeSBiZSByZW1vdmVkIGZyb21cbiAqIGRpc2sgd2hlbiB0aGlzIGhvb2sgZXhlY3V0ZXMsIHNvIHVzZSB0aGUgbWV0YWRhdGEgaW4gaW5wdXQgcmF0aGVyIHRoYW5cbiAqIGF0dGVtcHRpbmcgdG8gcmVhZCB0aGUgZmlsZS5cbiAqXG4gKiBAdGVtcGxhdGUgVCAtIENvbmZpZyB0eXBlIChpbmZlcnJlZClcbiAqIEBwYXJhbSBjb25maWcgLSBUeXBlIG1ldGFkYXRhIGluY2x1ZGluZyB0aGUgdHlwZSBuYW1lXG4gKiBAcGFyYW0gaGFuZGxlciAtIEFzeW5jIGZ1bmN0aW9uIHRoYXQgaGFuZGxlcyB0aGUgZGVsZXRlIGV2ZW50XG4gKiBAcmV0dXJucyBBIGNvbW1hbmQgd3JhcHBlciBzdWl0YWJsZSBmb3IgZGVmYXVsdCBleHBvcnRcbiAqXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogLy8gdHlwZXMvYWRhcHRpdmUtY2FyZC9kZWxldGUudHNcbiAqIGltcG9ydCB7IGRlZmluZVR5cGVEZWxldGUgfSBmcm9tICdAY2FyZHMvc2RrL2NvbmZpZyc7XG4gKlxuICogZXhwb3J0IGRlZmF1bHQgZGVmaW5lVHlwZURlbGV0ZShcbiAqICAgeyB0eXBlTmFtZTogJ2FkYXB0aXZlLWNhcmQnIH0sXG4gKiAgIGFzeW5jIChpbnB1dCwgeyBsb2dnZXIgfSkgPT4ge1xuICogICAgIGxvZ2dlci5pbmZvKCdBZGFwdGl2ZSBjYXJkIGRlbGV0ZWQnLCB7IGZpbGU6IGlucHV0LmZpbGVOYW1lIH0pO1xuICpcbiAqICAgICAvLyBSZW1vdmUgZnJvbSBzZWFyY2ggaW5kZXhcbiAqICAgICBhd2FpdCBzZWFyY2hJbmRleC5yZW1vdmUoaW5wdXQuZmlsZVBhdGgpO1xuICpcbiAqICAgICAvLyBDbGVhbiB1cCBhbnkgY2FjaGVkIHJlbmRlcnNcbiAqICAgICBhd2FpdCByZW5kZXJDYWNoZS5pbnZhbGlkYXRlKGlucHV0LmZpbGVTaGEyNTYpO1xuICogICB9XG4gKiApO1xuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBkZWZpbmVUeXBlRGVsZXRlPFQgZXh0ZW5kcyBUeXBlQ29uZmlnPihcbiAgY29uZmlnOiBTYW1lU2hhcGU8VHlwZUNvbmZpZywgVD4sXG4gIGhhbmRsZXI6IFR5cGVIYW5kbGVyXG4pOiBUeXBlRGVsZXRlQ29tbWFuZDxUWyd0eXBlTmFtZSddPiB7XG4gIGNvbnN0IGZuID0gYXN5bmMgKGlucHV0OiBUeXBlSG9va0lucHV0LCBjb250ZXh0OiBUeXBlSG9va0NvbnRleHQpOiBQcm9taXNlPHZvaWQ+ID0+IHtcbiAgICBhd2FpdCBoYW5kbGVyKGlucHV0LCBjb250ZXh0KTtcbiAgfTtcblxuICBmbi5mYWN0b3J5VHlwZSA9ICd0eXBlRGVsZXRlJyBhcyBjb25zdDtcbiAgZm4udHlwZU5hbWUgPSBjb25maWcudHlwZU5hbWU7XG4gIGZuLnRpbWVvdXQgPSBjb25maWcudGltZW91dDtcbiAgZm4uc291cmNlUGF0aCA9IGNvbmZpZy5zb3VyY2VQYXRoO1xuXG4gIHJldHVybiBmbiBhcyBUeXBlRGVsZXRlQ29tbWFuZDxUWyd0eXBlTmFtZSddPjtcbn1cbiIsICIvKipcbiAqIEVudmlyb25tZW50IHZhcmlhYmxlIHV0aWxpdGllcyBmb3IgQ2FyZHMgRXh0ZW5zaW9uIGFjdGlvbnMgYW5kIHR5cGUgaG9va3MuXG4gKlxuICogVGhlIGV4ZWN1dGlvbiB3cmFwcGVyIGluamVjdHMgYWN0aW9uIGFuZCB0eXBlIGhvb2sgaW5wdXRzIHZpYSBwcm9jZXNzLmVudi5cbiAqIFRoaXMgbW9kdWxlIHByb3ZpZGVzIHN0cmljdCBnZXR0ZXJzIGFuZCB0eXBlZCBleHRyYWN0b3JzIHNvIGhhbmRsZXJzIGRvIG5vdFxuICogbmVlZCB0byBwYXJzZSBlbnZpcm9ubWVudCB2YXJpYWJsZXMgbWFudWFsbHkuXG4gKlxuICogVXNlIHRoZSBpbmRpdmlkdWFsIGdldHRlcnMgd2hlbiB5b3Ugb25seSBuZWVkIG9uZSB2YWx1ZTsgdXNlXG4gKiB7QGxpbmsgZXh0cmFjdEFjdGlvbklucHV0fSBvciB7QGxpbmsgZXh0cmFjdFR5cGVJbnB1dH0gd2hlbiB5b3UgbmVlZCBhIGZ1bGxcbiAqIHR5cGVkIHBheWxvYWQgZm9yIGFuIGFjdGlvbiBvciB0eXBlIGhvb2suXG4gKlxuICpcbiAqIEBzdW1tYXJ5IEVudmlyb25tZW50IHZhcmlhYmxlIHV0aWxpdGllcyBmb3IgQ2FyZHMgRXh0ZW5zaW9uIGFjdGlvbnMgYW5kIHR5cGUgaG9va3NcbiAqIEBtb2R1bGVcbiAqL1xuXG5pbXBvcnQgeyByZWFkRmlsZVN5bmMgfSBmcm9tICdub2RlOmZzJztcbmltcG9ydCB0eXBlIHsgQWN0aW9uSW5wdXQsIFR5cGVIb29rSW5wdXQgfSBmcm9tICcuL2lucHV0cy5qcyc7XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIENvbnN0YW50c1xuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4vKipcbiAqIEVudmlyb25tZW50IHZhcmlhYmxlIG5hbWVzIHNldCBieSB0aGUgQ2FyZHMgZXhlY3V0aW9uIHdyYXBwZXIuXG4gKlxuICogVGhpcyBpcyB0aGUgc2luZ2xlIHNvdXJjZSBvZiB0cnV0aCBmb3IgZW52IHZhciBrZXlzIHVzZWQgYnkgYWN0aW9uIGFuZCB0eXBlXG4gKiBob29rIHByb2Nlc3Nlcy4gS2VlcCBpdCBpbiBzeW5jIHdpdGggdGhlIHdyYXBwZXIgdG8gYXZvaWQgc3VidGxlIFwidW5kZWZpbmVkXG4gKiBpbnB1dFwiIGJ1Z3MuXG4gKi9cbmV4cG9ydCBjb25zdCBDQVJEU19FTlZfVkFSUyA9IHtcbiAgLyoqXG4gICAqIFVuaXF1ZSBpZGVudGlmaWVyIGZvciB0aGUgY3VycmVudCBjYXJkLlxuICAgKiBBdmFpbGFibGUgaW4gYWxsIGFjdGlvbnMgYW5kIHR5cGUgaG9va3MuXG4gICAqL1xuICBDQVJEX0lEOiAnQ0FSRF9JRCcsXG5cbiAgLyoqXG4gICAqIFRoZSBlbnZpcm9ubWVudCBuYW1lIGZyb20gc2V0dGluZ3MuanNvbi5cbiAgICogQXZhaWxhYmxlIGluIGFsbCBhY3Rpb25zIGFuZCB0eXBlIGhvb2tzLlxuICAgKi9cbiAgRU5WSVJPTk1FTlQ6ICdFTlZJUk9OTUVOVCcsXG5cbiAgLyoqXG4gICAqIERpc3BsYXkgbmFtZSBvZiB0aGUgYWN0aW9uIGJ1dHRvbiB0aGF0IHRyaWdnZXJlZCB0aGlzIGhhbmRsZXIuXG4gICAqIEF2YWlsYWJsZSBpbiBhY3Rpb25zIG9ubHkgKG5vdCB0eXBlIGhvb2tzKS5cbiAgICovXG4gIEFDVElPTl9OQU1FOiAnQUNUSU9OX05BTUUnLFxuXG4gIC8qKlxuICAgKiBDYXJkJ3MgZXhlY3V0aW9uIG1vZGUsIGRldGVybWluaW5nIFVJIGludGVyYWN0aW9uIG1vZGVsLlxuICAgKiBBdmFpbGFibGUgaW4gYWN0aW9ucyBvbmx5IChub3QgdHlwZSBob29rcykuXG4gICAqIFZhbGlkIHZhbHVlczogJ2ludGVyYWN0aXZlJyB8ICdiYWNrZ3JvdW5kJ1xuICAgKi9cbiAgRVhFQ1VUSU9OX01PREU6ICdFWEVDVVRJT05fTU9ERScsXG5cbiAgLyoqXG4gICAqIENhcmRzIHNlcnZlciBiYXNlIFVSTCBmb3IgQVBJIGNhbGxzLlxuICAgKiBBdmFpbGFibGUgaW4gYWxsIGFjdGlvbnMgYW5kIHR5cGUgaG9va3MuXG4gICAqL1xuICBBUElfQkFTRV9VUkw6ICdBUElfQkFTRV9VUkwnLFxuXG4gIC8qKlxuICAgKiBBdXRoZW50aWNhdGlvbiB0b2tlbiBmb3IgQVBJIGNhbGxzLlxuICAgKiBBdmFpbGFibGUgaW4gYWxsIGFjdGlvbnMgYW5kIHR5cGUgaG9va3MuXG4gICAqL1xuICBBUElfQUNDRVNTX1RPS0VOOiAnQVBJX0FDQ0VTU19UT0tFTicsXG5cbiAgLyoqXG4gICAqIENvbmZpZ3VyZWQgY29kaW5nIGFnZW50IGlkZW50aWZpZXIgZnJvbSBjYXJkcy5jb2RpbmdBZ2VudCBzZXR0aW5nLlxuICAgKiBBdmFpbGFibGUgaW4gYWN0aW9ucyBvbmx5IChub3QgdHlwZSBob29rcykuXG4gICAqIE9wdGlvbmFsLlxuICAgKi9cbiAgQ09ESU5HX0FHRU5UOiAnQ09ESU5HX0FHRU5UJyxcblxuICAvKipcbiAgICogVGhlIHJlZ2lzdGVyZWQgdHlwZSBuYW1lLlxuICAgKiBBdmFpbGFibGUgaW4gdHlwZSBob29rcyBvbmx5LlxuICAgKi9cbiAgVFlQRV9OQU1FOiAnVFlQRV9OQU1FJyxcblxuICAvKipcbiAgICogVGhlIHR5cGUncyB2ZXJzaW9uIHN0cmluZyBmcm9tIHNldHRpbmdzLmpzb24gY29uZmlndXJhdGlvbi5cbiAgICogQXZhaWxhYmxlIGluIHR5cGUgaG9va3Mgb25seS5cbiAgICovXG4gIFRZUEVfVkVSU0lPTjogJ1RZUEVfVkVSU0lPTicsXG5cbiAgLyoqXG4gICAqIFRoZSBmaWxlIG5hbWUgd2l0aGluIHRoZSB0eXBlIGRpcmVjdG9yeS5cbiAgICogQXZhaWxhYmxlIGluIHR5cGUgaG9va3Mgb25seS5cbiAgICovXG4gIEZJTEVfTkFNRTogJ0ZJTEVfTkFNRScsXG5cbiAgLyoqXG4gICAqIEZ1bGwgcGF0aCB0byB0aGUgZmlsZS5cbiAgICogQXZhaWxhYmxlIGluIHR5cGUgaG9va3Mgb25seS5cbiAgICovXG4gIEZJTEVfUEFUSDogJ0ZJTEVfUEFUSCcsXG5cbiAgLyoqXG4gICAqIEZpbGUgc2l6ZSBpbiBieXRlcy5cbiAgICogQXZhaWxhYmxlIGluIHR5cGUgaG9va3Mgb25seS5cbiAgICovXG4gIEZJTEVfU0laRTogJ0ZJTEVfU0laRScsXG5cbiAgLyoqXG4gICAqIFNIQTI1NiBoYXNoIG9mIGNvbnRlbnQuXG4gICAqIEF2YWlsYWJsZSBpbiB0eXBlIGhvb2tzIG9ubHkuXG4gICAqL1xuICBTSEEyNTY6ICdTSEEyNTYnLFxuXG4gIC8qKlxuICAgKiBNSU1FIHR5cGUgb2YgdGhlIGNvbnRlbnQuXG4gICAqIEF2YWlsYWJsZSBpbiB0eXBlIGhvb2tzIG9ubHkuXG4gICAqL1xuICBDT05URU5UX1RZUEU6ICdDT05URU5UX1RZUEUnLFxuXG4gIC8qKlxuICAgKiBQYXRoIHRvIHRoZSBWUyBDb2RlIGJ1bmRsZWQgTm9kZS5qcyBpbnRlcnByZXRlci5cbiAgICpcbiAgICogU2V0IGJ5IHRoZSBleHRlbnNpb24gaG9zdCBmcm9tIGBwcm9jZXNzLmV4ZWNQYXRoYCAod2l0aFxuICAgKiBgRUxFQ1RST05fUlVOX0FTX05PREU9MWApLiBDb21tYW5kcyBpbiBzZXR0aW5ncy5qc29uIHVzZVxuICAgKiBgJFZTQ09ERV9OT0RFIC4vYmluLy4uLmAgc28gdGhleSB3b3JrIHJlZ2FyZGxlc3Mgb2ZcbiAgICogd2hldGhlciBgbm9kZWAgaXMgb24gdGhlIHN5c3RlbSBQQVRILlxuICAgKlxuICAgKiBBdmFpbGFibGUgaW4gYWxsIGFjdGlvbnMgYW5kIHR5cGUgaG9va3MuXG4gICAqL1xuICBWU0NPREVfTk9ERTogJ1ZTQ09ERV9OT0RFJyxcblxuICAvKipcbiAgICogUGF0aCB0byB0aGUgTm9kZS5qcyBpbnRlcnByZXRlciBydW5uaW5nIHRoZSB3cmFwcGVyIHByb2Nlc3MuXG4gICAqXG4gICAqIFNldCBieSB0aGUgd3JhcHBlciBmcm9tIGBwcm9jZXNzLmV4ZWNQYXRoYC4gVXNlIGAkTk9ERWAgaW4gZW1iZWRkZWRcbiAgICogYmFzaCBzdGF0ZW1lbnRzIHRvIGludm9rZSBOb2RlIHNjcmlwdHMgcG9ydGFibHkuXG4gICAqXG4gICAqIEF2YWlsYWJsZSBpbiBhbGwgYWN0aW9ucy5cbiAgICovXG4gIE5PREU6ICdOT0RFJyxcblxuICAvKipcbiAgICogUGF0aCB0byB0aGUgVW5peCBkb21haW4gc29ja2V0IGZvciBydW50aW1lLXRvLWRpc3BhdGNoZXIgY29tbXVuaWNhdGlvbi5cbiAgICogQXZhaWxhYmxlIGluIGFjdGlvbnMgb25seS5cbiAgICovXG4gIFNPQ0tFVF9QQVRIOiAnU09DS0VUX1BBVEgnLFxuXG4gIC8qKlxuICAgKiBQYXRoIHRvIGEgSlNPTiBmaWxlIGNvbnRhaW5pbmcgc3dpdGNoVG9JbnRlcmFjdGl2ZSBkYXRhIGZyb20gYSBwcmV2aW91cyBoYW5kbGVyLlxuICAgKiBBdmFpbGFibGUgaW4gYWN0aW9ucyBvbmx5LiBPcHRpb25hbC5cbiAgICovXG4gIFNXSVRDSF9UT19JTlRFUkFDVElWRV9EQVRBX1BBVEg6ICdTV0lUQ0hfVE9fSU5URVJBQ1RJVkVfREFUQV9QQVRIJyxcblxuICAvKipcbiAgICogUGF0aCB0byB0aGUgc2V0dGluZ3MgY29uZmlndXJhdGlvbiBkaXJlY3RvcnkuXG4gICAqIEF2YWlsYWJsZSBpbiBhY3Rpb25zIG9ubHkuXG4gICAqL1xuICBDT05GSUdfUEFUSDogJ0NPTkZJR19QQVRIJyxcblxuICAvKipcbiAgICogUGF0aCB0byB0aGUgVlMgQ29kZSB3b3Jrc3BhY2Ugcm9vdCBkaXJlY3RvcnkuXG4gICAqIFNldCBieSB0aGUgYWN0aW9uIGhhbmRsZXIgKGUuZy4sIGxhdW5jaC50cykgdG8gdGhlIHdvcmt0cmVlIHBhdGguXG4gICAqIEF2YWlsYWJsZSBpbiBob29rcyBydW5uaW5nIGluc2lkZSB0aGUgY2xhdWRlIENMSS5cbiAgICovXG4gIFdPUktTUEFDRV9QQVRIOiAnV09SS1NQQUNFX1BBVEgnLFxuXG4gIC8qKlxuICAgKiBBYnNvbHV0ZSBwYXRoIHRvIHRoZSBtYWluIGdpdCByZXBvc2l0b3J5IHJvb3QgKE5PVCBhIHdvcmt0cmVlKS5cbiAgICogU2V0IGJ5IEFjdGlvbkRpc3BhdGNoZXI7IGNvbnN1bWVkIGJ5IHRoZSB3cmFwcGVyIGFuZCB3YXRjaGVyIGZvclxuICAgKiBnaXQgb3BlcmF0aW9ucyAod29ya3RyZWUgcmVtb3ZhbCwgYnJhbmNoIGRlbGV0aW9uKSB0aGF0IG11c3QgcnVuXG4gICAqIGFnYWluc3QgdGhlIG1haW4gcmVwb3NpdG9yeS5cbiAgICovXG4gIFJFUE9fUk9PVDogJ1JFUE9fUk9PVCcsXG5cbiAgLyoqXG4gICAqIFBhdGggdG8gdGhlIGNhcmQncyByZXBvc2l0b3J5IGRpcmVjdG9yeS5cbiAgICogQXZhaWxhYmxlIGluIGFjdGlvbnMgb25seS5cbiAgICovXG4gIENBUkRfUkVQT19QQVRIOiAnQ0FSRF9SRVBPX1BBVEgnLFxuXG4gIC8qKlxuICAgKiBSZXNvbHZlZCBzaGVsbCBjb21tYW5kIGZvciB0aGUgd3JhcHBlciB0byBzcGF3biBhcyB0aGUgYWN0aW9uIGhhbmRsZXIuXG4gICAqIFNldCBieSBBY3Rpb25EaXNwYXRjaGVyOyBjb25zdW1lZCBieSB0aGUgd3JhcHBlciAobm90IGJ5IGFjdGlvbiBoYW5kbGVycykuXG4gICAqL1xuICBBQ1RJT05fQ09NTUFORDogJ0FDVElPTl9DT01NQU5EJyxcblxuICAvKipcbiAgICogR2l0IGJyYW5jaCB0aGF0IHRoZSBjYXJkJ3Mgd29ya3NwYWNlIGJyYW5jaCB3aWxsIG1lcmdlIGludG8uXG4gICAqIFJlc29sdmVkIGZyb20gdGhlIHdvcmtzcGFjZSBIRUFEIGF0IGxhdW5jaCB0aW1lLlxuICAgKiBTZXQgYnkgdGhlIGxhdW5jaCBhY3Rpb24uXG4gICAqIEF2YWlsYWJsZSBpbiBhY3Rpb25zIG9ubHkuXG4gICAqL1xuICBCQVNFX0JSQU5DSDogJ0JBU0VfQlJBTkNIJyxcblxuICAvKipcbiAgICogR2l0IGJyYW5jaCBmcm9tIHdoaWNoIHRoZSBjYXJkJ3Mgd29ya3NwYWNlIGJyYW5jaCB3YXMgY3JlYXRlZC5cbiAgICogTWF5IGRpZmZlciBmcm9tIEJBU0VfQlJBTkNIIHdoZW4gdGhlIHdvcmt0cmVlIHdhcyBjcmVhdGVkIGFnYWluc3RcbiAgICogYSBkaWZmZXJlbnQgcmVmIHRoYW4gdGhlIGN1cnJlbnQgd29ya3NwYWNlIEhFQUQuXG4gICAqIFNldCBieSB0aGUgbGF1bmNoIGFjdGlvbi5cbiAgICogQXZhaWxhYmxlIGluIGFjdGlvbnMgb25seS5cbiAgICovXG4gIFBBUkVOVF9CUkFOQ0g6ICdQQVJFTlRfQlJBTkNIJyxcblxuICAvKipcbiAgICogR2l0IGJyYW5jaCBuYW1lIGZvciB0aGUgY2FyZCdzIHdvcmtzcGFjZSBpbXBsZW1lbnRhdGlvbi5cbiAgICogU2V0IGJ5IHRoZSBsYXVuY2ggYWN0aW9uIGFmdGVyIHJlc29sdmluZyBvciBjcmVhdGluZyB0aGUgd29ya3RyZWUuXG4gICAqIEF2YWlsYWJsZSBpbiBhY3Rpb25zIG9ubHkuXG4gICAqL1xuICBXT1JLU1BBQ0VfQlJBTkNIOiAnV09SS1NQQUNFX0JSQU5DSCcsXG5cbiAgLyoqXG4gICAqIFNlc3Npb24gSUQgcGVyc2lzdGVkIGJ5IHRoZSBzZXNzaW9uLXN0YXJ0IGhvb2sgdmlhIGBwZXJzaXN0RW52VmFyYC5cbiAgICpcbiAgICogQXZhaWxhYmxlIGluIEJhc2ggdG9vbCBzaGVsbCBkZXNjZW5kYW50cyAoY29tbWFuZHMsIGdpdCBob29rcykgYWZ0ZXJcbiAgICogc2Vzc2lvbiBzdGFydC4gTk9UIGF2YWlsYWJsZSBpbiBob29rcyBzcGF3bmVkIGRpcmVjdGx5IGJ5IENsYXVkZSBDb2RlXG4gICAqIChzdG9wLCBzZXNzaW9uLWVuZCwgZXRjLikgXHUyMDE0IHRob3NlIHJlY2VpdmUgdGhlIHNlc3Npb24gSUQgdmlhIGhvb2sgaW5wdXQuXG4gICAqXG4gICAqIFRoZSBjYXJkLXJlcG8gcG9zdC1jb21taXQgaG9vayByZWFkcyB0aGlzIHRvIHJlY29yZCBjb21taXRzIGRpcmVjdGx5XG4gICAqIHdpdGhvdXQgbmVlZGluZyBhIHByb2Nlc3MtdHJlZSB3YWxrIG9yIFBJRCByZWdpc3RyeSBsb29rdXAuXG4gICAqL1xuICBDQVJEU19TRVNTSU9OX0lEOiAnQ0FSRFNfU0VTU0lPTl9JRCcsXG5cbiAgLyoqXG4gICAqIEFic29sdXRlIHBhdGggdG8gdGhlIFZTIENvZGUgZXh0ZW5zaW9uIGluc3RhbGxhdGlvbiBkaXJlY3RvcnkuXG4gICAqXG4gICAqIFNldCBieSB0aGUgZXh0ZW5zaW9uIGhvc3QgZnJvbSBgY29udGV4dC5leHRlbnNpb25VcmkuZnNQYXRoYCBhbmQgaW5qZWN0ZWRcbiAgICogaW50byBhbGwgc3Bhd25lZCBhY3Rpb24gcHJvY2Vzc2VzLiBVc2UgdGhpcyB0byBsb2NhdGUgYnVuZGxlZCBhc3NldHMgc3VjaFxuICAgKiBhcyB0aGUgcnVudGltZSBwbHVnaW4gZGlyZWN0b3J5IChgPGV4dGVuc2lvblBhdGg+L2Rpc3QvcGx1Z2lucy9ydW50aW1lYCkuXG4gICAqXG4gICAqIEF2YWlsYWJsZSBpbiBhY3Rpb25zIG9ubHkgKG5vdCB0eXBlIGhvb2tzKS5cbiAgICovXG4gIEVYVEVOU0lPTl9QQVRIOiAnRVhURU5TSU9OX1BBVEgnXG59IGFzIGNvbnN0O1xuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBJbmRpdmlkdWFsIEdldHRlcnNcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuLyoqXG4gKiBSZWFkcyB0aGUgY2FyZCBpZGVudGlmaWVyIGZyb20gdGhlIGVudmlyb25tZW50LlxuICpcbiAqIFRoZSBleGVjdXRpb24gd3JhcHBlciBhbHdheXMgc2V0cyB0aGlzIGZvciBldmVyeSBhY3Rpb24gYW5kIHR5cGUgaG9vay5cbiAqIEByZXR1cm5zIFRoZSBjdXJyZW50IGNhcmQgSURcbiAqIEB0aHJvd3MgRXJyb3IgaWYgQ0FSRF9JRCBpcyBtaXNzaW5nIG9yIGVtcHR5XG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogY29uc3QgY2FyZElkID0gZ2V0Q2FyZElkKCk7XG4gKiBjb25zb2xlLmxvZyhgUHJvY2Vzc2luZyBjYXJkOiAke2NhcmRJZH1gKTtcbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0Q2FyZElkKCk6IHN0cmluZyB7XG4gIGNvbnN0IHZhbHVlID0gcHJvY2Vzcy5lbnZbQ0FSRFNfRU5WX1ZBUlMuQ0FSRF9JRF07XG4gIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IHZhbHVlID09PSAnJykge1xuICAgIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyByZXF1aXJlZCBlbnZpcm9ubWVudCB2YXJpYWJsZTogJHtDQVJEU19FTlZfVkFSUy5DQVJEX0lEfWApO1xuICB9XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuLyoqXG4gKiBSZWFkcyB0aGUgZW52aXJvbm1lbnQgbmFtZSBmcm9tIHRoZSBlbnZpcm9ubWVudC5cbiAqXG4gKiBUaGlzIHZhbHVlIG1hdGNoZXMgdGhlIGVudmlyb25tZW50IGtleSBpbiBzZXR0aW5ncy5qc29uIChlLmcuLCBcImRlZmF1bHRcIiwgXCJzdGFnaW5nXCIpLlxuICogQHJldHVybnMgVGhlIGVudmlyb25tZW50IG5hbWVcbiAqIEB0aHJvd3MgRXJyb3IgaWYgRU5WSVJPTk1FTlQgaXMgbWlzc2luZyBvciBlbXB0eVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGNvbnN0IGVudmlyb25tZW50ID0gZ2V0RW52aXJvbm1lbnQoKTtcbiAqIGNvbnNvbGUubG9nKGBFbnZpcm9ubWVudDogJHtlbnZpcm9ubWVudH1gKTtcbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0RW52aXJvbm1lbnQoKTogc3RyaW5nIHtcbiAgY29uc3QgdmFsdWUgPSBwcm9jZXNzLmVudltDQVJEU19FTlZfVkFSUy5FTlZJUk9OTUVOVF07XG4gIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IHZhbHVlID09PSAnJykge1xuICAgIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyByZXF1aXJlZCBlbnZpcm9ubWVudCB2YXJpYWJsZTogJHtDQVJEU19FTlZfVkFSUy5FTlZJUk9OTUVOVH1gKTtcbiAgfVxuICByZXR1cm4gdmFsdWU7XG59XG5cbi8qKlxuICogUmVhZHMgdGhlIGFjdGlvbiBidXR0b24gbmFtZSBmcm9tIHRoZSBlbnZpcm9ubWVudC5cbiAqXG4gKiBUaGlzIGlzIHRoZSBkaXNwbGF5IG5hbWUgb2YgdGhlIGFjdGlvbiB0aGF0IHRyaWdnZXJlZCB0aGUgaGFuZGxlciwgbWF0Y2hpbmdcbiAqIHRoZSBgYWN0aW9uTmFtZWAgZmllbGQgZnJvbSBgZGVmaW5lQWN0aW9uYC5cbiAqIEByZXR1cm5zIERpc3BsYXkgbmFtZSBvZiB0aGUgYWN0aW9uIHRoYXQgdHJpZ2dlcmVkIHRoZSBjdXJyZW50IGhhbmRsZXIgcnVuLlxuICogQHRocm93cyBFcnJvciBpZiBBQ1RJT05fTkFNRSBpcyBtaXNzaW5nIG9yIGVtcHR5XG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogY29uc3QgYWN0aW9uTmFtZSA9IGdldEFjdGlvbk5hbWUoKTtcbiAqIGNvbnNvbGUubG9nKGBSdW5uaW5nIGFjdGlvbjogJHthY3Rpb25OYW1lfWApO1xuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRBY3Rpb25OYW1lKCk6IHN0cmluZyB7XG4gIGNvbnN0IHZhbHVlID0gcHJvY2Vzcy5lbnZbQ0FSRFNfRU5WX1ZBUlMuQUNUSU9OX05BTUVdO1xuICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gJycpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYE1pc3NpbmcgcmVxdWlyZWQgZW52aXJvbm1lbnQgdmFyaWFibGU6ICR7Q0FSRFNfRU5WX1ZBUlMuQUNUSU9OX05BTUV9YCk7XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG4vKipcbiAqIFJlYWRzIHRoZSBleGVjdXRpb24gbW9kZSBmcm9tIHRoZSBlbnZpcm9ubWVudC5cbiAqXG4gKiBEZXRlcm1pbmVzIHRoZSBVSSBpbnRlcmFjdGlvbiBtb2RlbCBmb3IgYWN0aW9ucy5cbiAqIEByZXR1cm5zIFRoZSBleGVjdXRpb24gbW9kZSAoJ2ludGVyYWN0aXZlJyBvciAnYmFja2dyb3VuZCcpXG4gKiBAdGhyb3dzIEVycm9yIGlmIEVYRUNVVElPTl9NT0RFIGlzIG1pc3NpbmcsIGVtcHR5LCBvciBpbnZhbGlkXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogY29uc3QgbW9kZSA9IGdldEV4ZWN1dGlvbk1vZGUoKTtcbiAqIGlmIChtb2RlID09PSAnaW50ZXJhY3RpdmUnKSB7XG4gKiAgIC8vIFNob3cgdXNlciBwcm9tcHRzXG4gKiB9XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldEV4ZWN1dGlvbk1vZGUoKTogJ2ludGVyYWN0aXZlJyB8ICdiYWNrZ3JvdW5kJyB7XG4gIGNvbnN0IHZhbHVlID0gcHJvY2Vzcy5lbnZbQ0FSRFNfRU5WX1ZBUlMuRVhFQ1VUSU9OX01PREVdO1xuICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gJycpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYE1pc3NpbmcgcmVxdWlyZWQgZW52aXJvbm1lbnQgdmFyaWFibGU6ICR7Q0FSRFNfRU5WX1ZBUlMuRVhFQ1VUSU9OX01PREV9YCk7XG4gIH1cbiAgaWYgKHZhbHVlICE9PSAnaW50ZXJhY3RpdmUnICYmIHZhbHVlICE9PSAnYmFja2dyb3VuZCcpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYEludmFsaWQgJHtDQVJEU19FTlZfVkFSUy5FWEVDVVRJT05fTU9ERX06IGV4cGVjdGVkICdpbnRlcmFjdGl2ZScgb3IgJ2JhY2tncm91bmQnLCBnb3QgXCIke3ZhbHVlfVwiYCk7XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG4vKipcbiAqIFJlYWRzIHRoZSBBUEkgYmFzZSBVUkwgZnJvbSB0aGUgZW52aXJvbm1lbnQuXG4gKlxuICogVXNlIHRoaXMgYXMgdGhlIGJhc2UgZm9yIGNvbnN0cnVjdGluZyBBUEkgZW5kcG9pbnRzLiBUaGUgVVJMIGRvZXMgbm90IGluY2x1ZGVcbiAqIGEgdHJhaWxpbmcgc2xhc2guXG4gKiBAcmV0dXJucyBCYXNlIFVSTCB1c2VkIHRvIGNvbnN0cnVjdCBDYXJkcyBBUEkgZW5kcG9pbnRzIGZvciB0aGlzIGV4ZWN1dGlvbi5cbiAqIEB0aHJvd3MgRXJyb3IgaWYgQVBJX0JBU0VfVVJMIGlzIG1pc3Npbmcgb3IgZW1wdHlcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBjb25zdCBhcGlVcmwgPSBnZXRBcGlCYXNlVXJsKCk7XG4gKiBjb25zdCBlbmRwb2ludCA9IGAke2FwaVVybH0vY2FyZHMvJHtjYXJkSWR9YDtcbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0QXBpQmFzZVVybCgpOiBzdHJpbmcge1xuICBjb25zdCB2YWx1ZSA9IHByb2Nlc3MuZW52W0NBUkRTX0VOVl9WQVJTLkFQSV9CQVNFX1VSTF07XG4gIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IHZhbHVlID09PSAnJykge1xuICAgIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyByZXF1aXJlZCBlbnZpcm9ubWVudCB2YXJpYWJsZTogJHtDQVJEU19FTlZfVkFSUy5BUElfQkFTRV9VUkx9YCk7XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG4vKipcbiAqIFJlYWRzIHRoZSBBUEkgYWNjZXNzIHRva2VuIGZyb20gdGhlIGVudmlyb25tZW50LlxuICpcbiAqIEJlYXJlciB0b2tlbiB2YWxpZCBmb3IgdGhlIGR1cmF0aW9uIG9mIHRoaXMgYWN0aW9uIG9yIHR5cGUgaG9vayBleGVjdXRpb24uXG4gKiBJbmNsdWRlIGluIEF1dGhvcml6YXRpb24gaGVhZGVycyB3aGVuIGNhbGxpbmcgdGhlIENhcmRzIEFQSS5cbiAqIEByZXR1cm5zIEJlYXJlciB0b2tlbiB0aGF0IGF1dGhvcml6ZXMgQVBJIHJlcXVlc3RzIGZvciB0aGlzIGV4ZWN1dGlvbiBjb250ZXh0LlxuICogQHRocm93cyBFcnJvciBpZiBBUElfQUNDRVNTX1RPS0VOIGlzIG1pc3Npbmcgb3IgZW1wdHlcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBjb25zdCB0b2tlbiA9IGdldEFwaUFjY2Vzc1Rva2VuKCk7XG4gKiBjb25zdCByZXNwb25zZSA9IGF3YWl0IGZldGNoKGFwaVVybCwge1xuICogICBoZWFkZXJzOiB7IEF1dGhvcml6YXRpb246IGBCZWFyZXIgJHt0b2tlbn1gIH1cbiAqIH0pO1xuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRBcGlBY2Nlc3NUb2tlbigpOiBzdHJpbmcge1xuICBjb25zdCB2YWx1ZSA9IHByb2Nlc3MuZW52W0NBUkRTX0VOVl9WQVJTLkFQSV9BQ0NFU1NfVE9LRU5dO1xuICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gJycpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYE1pc3NpbmcgcmVxdWlyZWQgZW52aXJvbm1lbnQgdmFyaWFibGU6ICR7Q0FSRFNfRU5WX1ZBUlMuQVBJX0FDQ0VTU19UT0tFTn1gKTtcbiAgfVxuICByZXR1cm4gdmFsdWU7XG59XG5cbi8qKlxuICogUmVhZHMgdGhlIGNvbmZpZ3VyZWQgY29kaW5nIGFnZW50IGlkZW50aWZpZXIgZnJvbSB0aGUgZW52aXJvbm1lbnQuXG4gKlxuICogT3B0aW9uYWwgdmFsdWUgZnJvbSBjYXJkcy5jb2RpbmdBZ2VudCBzZXR0aW5nLiBXaGVuIHNldCwgaW5kaWNhdGVzIHdoaWNoIEFJXG4gKiBjb2RpbmcgYXNzaXN0YW50IHRoZSB1c2VyIHByZWZlcnMuIEFjdGlvbnMgY2FuIHVzZSB0aGlzIHRvIGN1c3RvbWl6ZSBiZWhhdmlvclxuICogb3IgcHJvbXB0cyBmb3IgZGlmZmVyZW50IGFnZW50cy5cbiAqIEByZXR1cm5zIFRoZSBjb2RpbmcgYWdlbnQgaWRlbnRpZmllciwgb3IgdW5kZWZpbmVkIGlmIG5vdCBzZXRcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBjb25zdCBjb2RpbmdBZ2VudCA9IGdldENvZGluZ0FnZW50KCk7XG4gKiBpZiAoY29kaW5nQWdlbnQgPT09ICdjbGF1ZGUnKSB7XG4gKiAgIC8vIEN1c3RvbWl6ZSBmb3IgQ2xhdWRlXG4gKiB9XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldENvZGluZ0FnZW50KCk6IHN0cmluZyB8IHVuZGVmaW5lZCB7XG4gIGNvbnN0IHZhbHVlID0gcHJvY2Vzcy5lbnZbQ0FSRFNfRU5WX1ZBUlMuQ09ESU5HX0FHRU5UXTtcbiAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQgfHwgdmFsdWUgPT09ICcnKSB7XG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfVxuICByZXR1cm4gdmFsdWU7XG59XG5cbi8qKlxuICogUmVhZHMgdGhlIHJlZ2lzdGVyZWQgdHlwZSBuYW1lIGZvciB0eXBlIGhvb2tzLlxuICpcbiAqIFRoaXMgdmFsdWUgaXMgb25seSBwcmVzZW50IGZvciB0eXBlIGhvb2sgZXZlbnRzLlxuICogQHJldHVybnMgVGhlIHJlZ2lzdGVyZWQgdHlwZSBuYW1lXG4gKiBAdGhyb3dzIEVycm9yIGlmIFRZUEVfTkFNRSBpcyBtaXNzaW5nIG9yIGVtcHR5XG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogY29uc3QgdHlwZU5hbWUgPSBnZXRUeXBlTmFtZSgpO1xuICogY29uc29sZS5sb2coYFR5cGU6ICR7dHlwZU5hbWV9YCk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldFR5cGVOYW1lKCk6IHN0cmluZyB7XG4gIGNvbnN0IHZhbHVlID0gcHJvY2Vzcy5lbnZbQ0FSRFNfRU5WX1ZBUlMuVFlQRV9OQU1FXTtcbiAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQgfHwgdmFsdWUgPT09ICcnKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIHJlcXVpcmVkIGVudmlyb25tZW50IHZhcmlhYmxlOiAke0NBUkRTX0VOVl9WQVJTLlRZUEVfTkFNRX1gKTtcbiAgfVxuICByZXR1cm4gdmFsdWU7XG59XG5cbi8qKlxuICogUmVhZHMgdGhlIHR5cGUgdmVyc2lvbiBmcm9tIHRoZSBlbnZpcm9ubWVudC5cbiAqXG4gKiBUaGlzIHZlcnNpb24gY29tZXMgZnJvbSB0aGUgdHlwZSBjb25maWd1cmF0aW9uIGluIHNldHRpbmdzLmpzb24uXG4gKiBAcmV0dXJucyBUaGUgdmVyc2lvbiBzdHJpbmcgZnJvbSB0eXBlIGNvbmZpZ1xuICogQHRocm93cyBFcnJvciBpZiBUWVBFX1ZFUlNJT04gaXMgbWlzc2luZyBvciBlbXB0eVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGNvbnN0IHZlcnNpb24gPSBnZXRUeXBlVmVyc2lvbigpO1xuICogY29uc29sZS5sb2coYFZlcnNpb246ICR7dmVyc2lvbn1gKTtcbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0VHlwZVZlcnNpb24oKTogc3RyaW5nIHtcbiAgY29uc3QgdmFsdWUgPSBwcm9jZXNzLmVudltDQVJEU19FTlZfVkFSUy5UWVBFX1ZFUlNJT05dO1xuICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gJycpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYE1pc3NpbmcgcmVxdWlyZWQgZW52aXJvbm1lbnQgdmFyaWFibGU6ICR7Q0FSRFNfRU5WX1ZBUlMuVFlQRV9WRVJTSU9OfWApO1xuICB9XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuLyoqXG4gKiBSZWFkcyB0aGUgdHlwZWQgZmlsZSBuYW1lIGZvciB0eXBlIGhvb2sgZXZlbnRzLlxuICpcbiAqIFRoaXMgaXMgdGhlIGZpbGUgbmFtZSByZWxhdGl2ZSB0byB0aGUgdHlwZSBkaXJlY3RvcnksIG5vdCBhIGZ1bGwgcGF0aC5cbiAqIEByZXR1cm5zIFRoZSBmaWxlIG5hbWUgd2l0aGluIHRoZSB0eXBlIGRpcmVjdG9yeVxuICogQHRocm93cyBFcnJvciBpZiBGSUxFX05BTUUgaXMgbWlzc2luZyBvciBlbXB0eVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGNvbnN0IGZpbGVOYW1lID0gZ2V0RmlsZU5hbWUoKTtcbiAqIGNvbnNvbGUubG9nKGBGaWxlOiAke2ZpbGVOYW1lfWApO1xuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRGaWxlTmFtZSgpOiBzdHJpbmcge1xuICBjb25zdCB2YWx1ZSA9IHByb2Nlc3MuZW52W0NBUkRTX0VOVl9WQVJTLkZJTEVfTkFNRV07XG4gIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IHZhbHVlID09PSAnJykge1xuICAgIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyByZXF1aXJlZCBlbnZpcm9ubWVudCB2YXJpYWJsZTogJHtDQVJEU19FTlZfVkFSUy5GSUxFX05BTUV9YCk7XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG4vKipcbiAqIFJlYWRzIHRoZSBhYnNvbHV0ZSBwYXRoIHRvIHRoZSB0eXBlZCBmaWxlLlxuICpcbiAqIFRoaXMgaXMgdGhlIGZ1bGx5IHJlc29sdmVkIHBhdGggb24gZGlzayBwcm92aWRlZCBieSB0aGUgZXhlY3V0aW9uIHdyYXBwZXIuXG4gKiBAcmV0dXJucyBUaGUgZnVsbCBwYXRoIHRvIHRoZSBmaWxlXG4gKiBAdGhyb3dzIEVycm9yIGlmIEZJTEVfUEFUSCBpcyBtaXNzaW5nIG9yIGVtcHR5XG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogY29uc3QgZmlsZVBhdGggPSBnZXRGaWxlUGF0aCgpO1xuICogY29uc29sZS5sb2coYFBhdGg6ICR7ZmlsZVBhdGh9YCk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldEZpbGVQYXRoKCk6IHN0cmluZyB7XG4gIGNvbnN0IHZhbHVlID0gcHJvY2Vzcy5lbnZbQ0FSRFNfRU5WX1ZBUlMuRklMRV9QQVRIXTtcbiAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQgfHwgdmFsdWUgPT09ICcnKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIHJlcXVpcmVkIGVudmlyb25tZW50IHZhcmlhYmxlOiAke0NBUkRTX0VOVl9WQVJTLkZJTEVfUEFUSH1gKTtcbiAgfVxuICByZXR1cm4gdmFsdWU7XG59XG5cbi8qKlxuICogUmVhZHMgdGhlIHR5cGVkIGZpbGUgc2l6ZSBmcm9tIHRoZSBlbnZpcm9ubWVudC5cbiAqXG4gKiBUaGUgdmFsdWUgaXMgcGFyc2VkIGFzIGEgYmFzZS0xMCBpbnRlZ2VyLlxuICogQHJldHVybnMgVGhlIGZpbGUgc2l6ZSBpbiBieXRlc1xuICogQHRocm93cyBFcnJvciBpZiBGSUxFX1NJWkUgaXMgbWlzc2luZyBvciBub3QgYSBudW1iZXJcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBjb25zdCBzaXplID0gZ2V0RmlsZVNpemUoKTtcbiAqIGNvbnNvbGUubG9nKGBTaXplOiAke3NpemV9IGJ5dGVzYCk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldEZpbGVTaXplKCk6IG51bWJlciB7XG4gIGNvbnN0IHZhbHVlID0gcHJvY2Vzcy5lbnZbQ0FSRFNfRU5WX1ZBUlMuRklMRV9TSVpFXTtcbiAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQgfHwgdmFsdWUgPT09ICcnKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIHJlcXVpcmVkIGVudmlyb25tZW50IHZhcmlhYmxlOiAke0NBUkRTX0VOVl9WQVJTLkZJTEVfU0laRX1gKTtcbiAgfVxuICBjb25zdCBzaXplID0gTnVtYmVyLnBhcnNlSW50KHZhbHVlLCAxMCk7XG4gIGlmIChOdW1iZXIuaXNOYU4oc2l6ZSkpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYEludmFsaWQgJHtDQVJEU19FTlZfVkFSUy5GSUxFX1NJWkV9OiBleHBlY3RlZCBudW1iZXIsIGdvdCBcIiR7dmFsdWV9XCJgKTtcbiAgfVxuICByZXR1cm4gc2l6ZTtcbn1cblxuLyoqXG4gKiBSZWFkcyB0aGUgU0hBMjU2IGhhc2ggZm9yIHRoZSB0eXBlZCBmaWxlIGNvbnRlbnQuXG4gKlxuICogVXNlZnVsIGZvciBkZXRlY3RpbmcgY29udGVudCBjaGFuZ2VzIHdpdGhvdXQgcmVhZGluZyB0aGUgZmlsZSBhZ2Fpbi5cbiAqIEByZXR1cm5zIFRoZSBTSEEyNTYgaGFzaCBvZiB0aGUgY29udGVudFxuICogQHRocm93cyBFcnJvciBpZiBTSEEyNTYgaXMgbWlzc2luZyBvciBlbXB0eVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGNvbnN0IGhhc2ggPSBnZXRTaGEyNTYoKTtcbiAqIGNvbnNvbGUubG9nKGBIYXNoOiAke2hhc2h9YCk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldFNoYTI1NigpOiBzdHJpbmcge1xuICBjb25zdCB2YWx1ZSA9IHByb2Nlc3MuZW52W0NBUkRTX0VOVl9WQVJTLlNIQTI1Nl07XG4gIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IHZhbHVlID09PSAnJykge1xuICAgIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyByZXF1aXJlZCBlbnZpcm9ubWVudCB2YXJpYWJsZTogJHtDQVJEU19FTlZfVkFSUy5TSEEyNTZ9YCk7XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG4vKipcbiAqIFJlYWRzIHRoZSBNSU1FIHR5cGUgZm9yIHRoZSB0eXBlZCBmaWxlIGNvbnRlbnQuXG4gKlxuICogUHJvdmlkZWQgZm9yIHR5cGUgaG9vayBldmVudHMgc28gdmFsaWRhdG9ycyBjYW4gYnJhbmNoIG9uIGNvbnRlbnQgdHlwZS5cbiAqIEByZXR1cm5zIFRoZSBNSU1FIHR5cGUgb2YgdGhlIGNvbnRlbnRcbiAqIEB0aHJvd3MgRXJyb3IgaWYgQ09OVEVOVF9UWVBFIGlzIG1pc3Npbmcgb3IgZW1wdHlcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBjb25zdCBjb250ZW50VHlwZSA9IGdldENvbnRlbnRUeXBlKCk7XG4gKiBjb25zb2xlLmxvZyhgQ29udGVudCB0eXBlOiAke2NvbnRlbnRUeXBlfWApO1xuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRDb250ZW50VHlwZSgpOiBzdHJpbmcge1xuICBjb25zdCB2YWx1ZSA9IHByb2Nlc3MuZW52W0NBUkRTX0VOVl9WQVJTLkNPTlRFTlRfVFlQRV07XG4gIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IHZhbHVlID09PSAnJykge1xuICAgIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyByZXF1aXJlZCBlbnZpcm9ubWVudCB2YXJpYWJsZTogJHtDQVJEU19FTlZfVkFSUy5DT05URU5UX1RZUEV9YCk7XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG4vKipcbiAqIFJlYWRzIHRoZSBWUyBDb2RlIGJ1bmRsZWQgTm9kZS5qcyBpbnRlcnByZXRlciBwYXRoIGZyb20gdGhlIGVudmlyb25tZW50LlxuICpcbiAqIFRoaXMgaXMgc2V0IGJ5IHRoZSBleHRlbnNpb24gZHVyaW5nIGFjdGl2YXRpb24gYW5kIGluamVjdGVkIGludG8gYWxsXG4gKiBzcGF3bmVkIGFjdGlvbi9ob29rIHByb2Nlc3Nlcy4gQ29uZmlndXJhdGlvbiBhdXRob3JzIGNhbiB1c2UgaXQgdG8gaW52b2tlXG4gKiBOb2RlLmpzIHdpdGhvdXQgcmVseWluZyBvbiB0aGUgc3lzdGVtIFBBVEguXG4gKlxuICogQHJldHVybnMgVGhlIHBhdGggdG8gdGhlIE5vZGUuanMgaW50ZXJwcmV0ZXJcbiAqIEB0aHJvd3MgRXJyb3IgaWYgVlNDT0RFX05PREUgaXMgbWlzc2luZyBvciBlbXB0eVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGNvbnN0IG5vZGVQYXRoID0gZ2V0VnNjb2RlTm9kZVBhdGgoKTtcbiAqIGV4ZWNGaWxlU3luYyhub2RlUGF0aCwgWydzY3JpcHQuanMnXSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldFZzY29kZU5vZGVQYXRoKCk6IHN0cmluZyB7XG4gIGNvbnN0IHZhbHVlID0gcHJvY2Vzcy5lbnZbQ0FSRFNfRU5WX1ZBUlMuVlNDT0RFX05PREVdO1xuICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gJycpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYE1pc3NpbmcgcmVxdWlyZWQgZW52aXJvbm1lbnQgdmFyaWFibGU6ICR7Q0FSRFNfRU5WX1ZBUlMuVlNDT0RFX05PREV9YCk7XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG4vKipcbiAqIFJlYWRzIHRoZSBVbml4IGRvbWFpbiBzb2NrZXQgcGF0aCBmb3IgcnVudGltZS10by1kaXNwYXRjaGVyIGNvbW11bmljYXRpb24uXG4gKlxuICogQHJldHVybnMgVW5peCBzb2NrZXQgcGF0aCB1c2VkIHRvIHNlbmQgcnVudGltZSBjb250cm9sIG1lc3NhZ2VzLlxuICogQHRocm93cyBFcnJvciBpZiBTT0NLRVRfUEFUSCBpcyBtaXNzaW5nIG9yIGVtcHR5XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRTb2NrZXRQYXRoKCk6IHN0cmluZyB7XG4gIGNvbnN0IHZhbHVlID0gcHJvY2Vzcy5lbnZbQ0FSRFNfRU5WX1ZBUlMuU09DS0VUX1BBVEhdO1xuICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gJycpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYE1pc3NpbmcgcmVxdWlyZWQgZW52aXJvbm1lbnQgdmFyaWFibGU6ICR7Q0FSRFNfRU5WX1ZBUlMuU09DS0VUX1BBVEh9YCk7XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG4vKipcbiAqIFJlYWRzIHRoZSBwYXRoIHRvIHRoZSBzd2l0Y2hUb0ludGVyYWN0aXZlIGRhdGEgZmlsZS5cbiAqXG4gKiBUaGlzIGlzIG9wdGlvbmFsIFx1MjAxNCByZXR1cm5zIHVuZGVmaW5lZCB3aGVuIG5vdCBzZXQgKGkuZS4sIHRoZSBhY3Rpb25cbiAqIHdhcyBub3QgcmVsYXVuY2hlZCB2aWEgc3dpdGNoVG9JbnRlcmFjdGl2ZSkuXG4gKlxuICogQHJldHVybnMgVGhlIGZpbGUgcGF0aCwgb3IgdW5kZWZpbmVkIGlmIG5vdCBzZXRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldFN3aXRjaFRvSW50ZXJhY3RpdmVEYXRhUGF0aCgpOiBzdHJpbmcgfCB1bmRlZmluZWQge1xuICBjb25zdCB2YWx1ZSA9IHByb2Nlc3MuZW52W0NBUkRTX0VOVl9WQVJTLlNXSVRDSF9UT19JTlRFUkFDVElWRV9EQVRBX1BBVEhdO1xuICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gJycpIHtcbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuLyoqXG4gKiBSZWFkcyB0aGUgc2V0dGluZ3MgY29uZmlndXJhdGlvbiBkaXJlY3RvcnkgcGF0aC5cbiAqXG4gKiBAcmV0dXJucyBBYnNvbHV0ZSBwYXRoIHRvIHRoZSBkaXJlY3RvcnkgY29udGFpbmluZyBnZW5lcmF0ZWQgc2V0dGluZ3MgYXJ0aWZhY3RzLlxuICogQHRocm93cyBFcnJvciBpZiBDT05GSUdfUEFUSCBpcyBtaXNzaW5nIG9yIGVtcHR5XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRDb25maWdQYXRoKCk6IHN0cmluZyB7XG4gIGNvbnN0IHZhbHVlID0gcHJvY2Vzcy5lbnZbQ0FSRFNfRU5WX1ZBUlMuQ09ORklHX1BBVEhdO1xuICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gJycpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYE1pc3NpbmcgcmVxdWlyZWQgZW52aXJvbm1lbnQgdmFyaWFibGU6ICR7Q0FSRFNfRU5WX1ZBUlMuQ09ORklHX1BBVEh9YCk7XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG4vKipcbiAqIFJlYWRzIHRoZSB3b3Jrc3BhY2UgcGF0aCBzZXQgYnkgdGhlIGFjdGlvbiBoYW5kbGVyIChlLmcuLCB0aGUgd29ya3RyZWUgcGF0aCkuXG4gKlxuICogVGhpcyBpcyBmb3IgaG9va3MgcnVubmluZyBpbnNpZGUgdGhlIENsYXVkZSBDTEksICoqbm90KiogZm9yIGFjdGlvbiBoYW5kbGVycy5cbiAqIEFjdGlvbiBoYW5kbGVycyBzaG91bGQgdXNlIHtAbGluayBnZXRSZXBvUm9vdH0gaW5zdGVhZC5cbiAqXG4gKiBAcmV0dXJucyBBYnNvbHV0ZSBwYXRoIHRvIHRoZSBhY3RpdmUgd29ya3NwYWNlIC8gd29ya3RyZWUuXG4gKiBAdGhyb3dzIEVycm9yIGlmIFdPUktTUEFDRV9QQVRIIGlzIG1pc3Npbmcgb3IgZW1wdHlcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldFdvcmtzcGFjZVBhdGgoKTogc3RyaW5nIHtcbiAgY29uc3QgdmFsdWUgPSBwcm9jZXNzLmVudltDQVJEU19FTlZfVkFSUy5XT1JLU1BBQ0VfUEFUSF07XG4gIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IHZhbHVlID09PSAnJykge1xuICAgIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyByZXF1aXJlZCBlbnZpcm9ubWVudCB2YXJpYWJsZTogJHtDQVJEU19FTlZfVkFSUy5XT1JLU1BBQ0VfUEFUSH1gKTtcbiAgfVxuICByZXR1cm4gdmFsdWU7XG59XG5cbi8qKlxuICogUmVhZHMgdGhlIG1haW4gZ2l0IHJlcG9zaXRvcnkgcm9vdCBwYXRoLlxuICpcbiAqIFNldCBieSBBY3Rpb25EaXNwYXRjaGVyOyB1c2VkIGJ5IGFjdGlvbiBoYW5kbGVycyB0byByZXNvbHZlIHdvcmt0cmVlc1xuICogYW5kIHBlcmZvcm0gZ2l0IG9wZXJhdGlvbnMgYWdhaW5zdCB0aGUgbWFpbiByZXBvc2l0b3J5LlxuICpcbiAqIEByZXR1cm5zIEFic29sdXRlIHBhdGggdG8gdGhlIG1haW4gZ2l0IHJlcG9zaXRvcnkgcm9vdCAoTk9UIGEgd29ya3RyZWUpLlxuICogQHRocm93cyBFcnJvciBpZiBSRVBPX1JPT1QgaXMgbWlzc2luZyBvciBlbXB0eVxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0UmVwb1Jvb3QoKTogc3RyaW5nIHtcbiAgY29uc3QgdmFsdWUgPSBwcm9jZXNzLmVudltDQVJEU19FTlZfVkFSUy5SRVBPX1JPT1RdO1xuICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gJycpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYE1pc3NpbmcgcmVxdWlyZWQgZW52aXJvbm1lbnQgdmFyaWFibGU6ICR7Q0FSRFNfRU5WX1ZBUlMuUkVQT19ST09UfWApO1xuICB9XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuLyoqXG4gKiBSZWFkcyB0aGUgY2FyZCdzIHJlcG9zaXRvcnkgZGlyZWN0b3J5IHBhdGguXG4gKlxuICogQHJldHVybnMgQWJzb2x1dGUgcGF0aCB0byB0aGUgcmVwb3NpdG9yeSBhc3NvY2lhdGVkIHdpdGggdGhlIGFjdGl2ZSBjYXJkLlxuICogQHRocm93cyBFcnJvciBpZiBDQVJEX1JFUE9fUEFUSCBpcyBtaXNzaW5nIG9yIGVtcHR5XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRDYXJkUmVwb1BhdGgoKTogc3RyaW5nIHtcbiAgY29uc3QgdmFsdWUgPSBwcm9jZXNzLmVudltDQVJEU19FTlZfVkFSUy5DQVJEX1JFUE9fUEFUSF07XG4gIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IHZhbHVlID09PSAnJykge1xuICAgIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyByZXF1aXJlZCBlbnZpcm9ubWVudCB2YXJpYWJsZTogJHtDQVJEU19FTlZfVkFSUy5DQVJEX1JFUE9fUEFUSH1gKTtcbiAgfVxuICByZXR1cm4gdmFsdWU7XG59XG5cbi8qKlxuICogUmVhZHMgdGhlIFZTIENvZGUgZXh0ZW5zaW9uIGluc3RhbGxhdGlvbiBkaXJlY3RvcnkgcGF0aC5cbiAqXG4gKiBTZXQgYnkgdGhlIGV4dGVuc2lvbiBob3N0IGZyb20gYGNvbnRleHQuZXh0ZW5zaW9uVXJpLmZzUGF0aGAgYW5kIGluamVjdGVkXG4gKiBpbnRvIGFsbCBzcGF3bmVkIGFjdGlvbiBwcm9jZXNzZXMuIFVzZSB0aGlzIHRvIGxvY2F0ZSBidW5kbGVkIGFzc2V0cyBzdWNoXG4gKiBhcyB0aGUgcnVudGltZSBwbHVnaW4gZGlyZWN0b3J5IChgPGV4dGVuc2lvblBhdGg+L2Rpc3QvcGx1Z2lucy9ydW50aW1lYCkuXG4gKlxuICogQHJldHVybnMgQWJzb2x1dGUgcGF0aCB0byB0aGUgZXh0ZW5zaW9uIGluc3RhbGxhdGlvbiBkaXJlY3RvcnkuXG4gKiBAdGhyb3dzIEVycm9yIGlmIEVYVEVOU0lPTl9QQVRIIGlzIG1pc3Npbmcgb3IgZW1wdHlcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldEV4dGVuc2lvblBhdGgoKTogc3RyaW5nIHtcbiAgY29uc3QgdmFsdWUgPSBwcm9jZXNzLmVudltDQVJEU19FTlZfVkFSUy5FWFRFTlNJT05fUEFUSF07XG4gIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IHZhbHVlID09PSAnJykge1xuICAgIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyByZXF1aXJlZCBlbnZpcm9ubWVudCB2YXJpYWJsZTogJHtDQVJEU19FTlZfVkFSUy5FWFRFTlNJT05fUEFUSH1gKTtcbiAgfVxuICByZXR1cm4gdmFsdWU7XG59XG5cbi8qKlxuICogUmVhZHMgYW5kIHBhcnNlcyB0aGUgc3dpdGNoVG9JbnRlcmFjdGl2ZSBkYXRhIGZpbGUuXG4gKlxuICogV2hlbiBgU1dJVENIX1RPX0lOVEVSQUNUSVZFX0RBVEFfUEFUSGAgaXMgc2V0LCByZWFkcyB0aGUgZmlsZSBhdCB0aGF0IHBhdGhcbiAqIGFuZCBwYXJzZXMgaXQgYXMgSlNPTi4gUmV0dXJucyB1bmRlZmluZWQgaWYgdGhlIGVudiB2YXIgaXMgbm90IHNldC5cbiAqXG4gKiBAcmV0dXJucyBUaGUgcGFyc2VkIGRhdGEsIG9yIHVuZGVmaW5lZCBpZiB0aGUgcGF0aCBpcyBub3Qgc2V0XG4gKiBAdGhyb3dzIEVycm9yIGlmIHRoZSBmaWxlIGNhbm5vdCBiZSByZWFkIG9yIGNvbnRhaW5zIGludmFsaWQgSlNPTlxuICovXG5leHBvcnQgZnVuY3Rpb24gcmVhZFN3aXRjaFRvSW50ZXJhY3RpdmVEYXRhKCk6IHVua25vd24gfCB1bmRlZmluZWQge1xuICBjb25zdCBkYXRhUGF0aCA9IGdldFN3aXRjaFRvSW50ZXJhY3RpdmVEYXRhUGF0aCgpO1xuICBpZiAoZGF0YVBhdGggPT09IHVuZGVmaW5lZCkge1xuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cbiAgY29uc3QgY29udGVudCA9IHJlYWRGaWxlU3luYyhkYXRhUGF0aCwgJ3V0Zi04Jyk7XG4gIHJldHVybiBKU09OLnBhcnNlKGNvbnRlbnQpO1xufVxuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBUeXBlZCBJbnB1dCBFeHRyYWN0aW9uXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbi8qKlxuICogQnVpbGRzIGEgdHlwZWQgYWN0aW9uIGlucHV0IG9iamVjdCBmcm9tIGVudmlyb25tZW50IHZhcmlhYmxlcy5cbiAqXG4gKiBFeHRyYWN0cyBhbGwgZmllbGRzIHJlcXVpcmVkIGZvciBhY3Rpb24gaGFuZGxlcnMuXG4gKlxuICogQHJldHVybnMgVHlwZWQgQWN0aW9uSW5wdXQgb2JqZWN0XG4gKiBAdGhyb3dzIEVycm9yIGlmIHJlcXVpcmVkIGVudiB2YXJzIGFyZSBtaXNzaW5nIG9yIGludmFsaWRcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiAvLyBGb3IgYW4gYWN0aW9uIGhhbmRsZXJcbiAqIGNvbnN0IGlucHV0ID0gZXh0cmFjdEFjdGlvbklucHV0KCk7XG4gKiBjb25zb2xlLmxvZyhpbnB1dC5jYXJkSWQpO1xuICogY29uc29sZS5sb2coaW5wdXQuZXhlY3V0aW9uTW9kZSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGV4dHJhY3RBY3Rpb25JbnB1dCgpOiBBY3Rpb25JbnB1dCB7XG4gIHJldHVybiB7XG4gICAgY2FyZElkOiBnZXRDYXJkSWQoKSxcbiAgICBhY3Rpb25OYW1lOiBnZXRBY3Rpb25OYW1lKCksXG4gICAgZW52aXJvbm1lbnQ6IGdldEVudmlyb25tZW50KCksXG4gICAgZXhlY3V0aW9uTW9kZTogZ2V0RXhlY3V0aW9uTW9kZSgpLFxuICAgIGFwaUJhc2VVcmw6IGdldEFwaUJhc2VVcmwoKSxcbiAgICBhcGlBY2Nlc3NUb2tlbjogZ2V0QXBpQWNjZXNzVG9rZW4oKSxcbiAgICBjb2RpbmdBZ2VudDogZ2V0Q29kaW5nQWdlbnQoKSxcbiAgICBzd2l0Y2hUb0ludGVyYWN0aXZlRGF0YTogcmVhZFN3aXRjaFRvSW50ZXJhY3RpdmVEYXRhKCksXG4gICAgcmVwb1Jvb3Q6IGdldFJlcG9Sb290KCksXG4gICAgY2FyZFJlcG9QYXRoOiBnZXRDYXJkUmVwb1BhdGgoKSxcbiAgICBjb25maWdQYXRoOiBnZXRDb25maWdQYXRoKCksXG4gICAgZXh0ZW5zaW9uUGF0aDogZ2V0RXh0ZW5zaW9uUGF0aCgpXG4gIH07XG59XG5cbi8qKlxuICogQnVpbGRzIGEgdHlwZWQgdHlwZSBob29rIGlucHV0IG9iamVjdCBmcm9tIGVudmlyb25tZW50IHZhcmlhYmxlcy5cbiAqXG4gKiBFeHRyYWN0cyBhbGwgZmllbGRzIHJlcXVpcmVkIGZvciB0eXBlIGxpZmVjeWNsZSBob29rcyAodmFsaWRhdG9yLCBjcmVhdGUsXG4gKiB1cGRhdGUsIGRlbGV0ZSkuXG4gKlxuICogQHJldHVybnMgVHlwZWQgVHlwZUhvb2tJbnB1dCBvYmplY3RcbiAqIEB0aHJvd3MgRXJyb3IgaWYgcmVxdWlyZWQgZW52IHZhcnMgYXJlIG1pc3Npbmcgb3IgaW52YWxpZFxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIC8vIEZvciBhIHR5cGUgaG9vayBoYW5kbGVyXG4gKiBjb25zdCBpbnB1dCA9IGV4dHJhY3RUeXBlSW5wdXQoKTtcbiAqIGNvbnNvbGUubG9nKGlucHV0LnR5cGVOYW1lKTtcbiAqIGNvbnNvbGUubG9nKGlucHV0LmZpbGVOYW1lKTtcbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gZXh0cmFjdFR5cGVJbnB1dCgpOiBUeXBlSG9va0lucHV0IHtcbiAgcmV0dXJuIHtcbiAgICBjYXJkSWQ6IGdldENhcmRJZCgpLFxuICAgIGVudmlyb25tZW50OiBnZXRFbnZpcm9ubWVudCgpLFxuICAgIHR5cGVOYW1lOiBnZXRUeXBlTmFtZSgpLFxuICAgIHR5cGVWZXJzaW9uOiBnZXRUeXBlVmVyc2lvbigpLFxuICAgIGZpbGVOYW1lOiBnZXRGaWxlTmFtZSgpLFxuICAgIGZpbGVQYXRoOiBnZXRGaWxlUGF0aCgpLFxuICAgIGZpbGVTaXplOiBnZXRGaWxlU2l6ZSgpLFxuICAgIGZpbGVTaGEyNTY6IGdldFNoYTI1NigpLFxuICAgIGNvbnRlbnRUeXBlOiBnZXRDb250ZW50VHlwZSgpLFxuICAgIGFwaUJhc2VVcmw6IGdldEFwaUJhc2VVcmwoKSxcbiAgICBhcGlBY2Nlc3NUb2tlbjogZ2V0QXBpQWNjZXNzVG9rZW4oKVxuICB9O1xufVxuIiwgIi8qKlxuICogU3RydWN0dXJlZCBsb2dnaW5nIGZvciBDYXJkcyBFeHRlbnNpb24gaG9va3MuXG4gKlxuICogT3V0cHV0IGlzIG9wdC1pbjogdGhlIGxvZ2dlciBvbmx5IGVtaXRzIHRvIHJlZ2lzdGVyZWQgaGFuZGxlcnMgb3IgYVxuICogY29uZmlndXJlZCBsb2cgZmlsZS4gSWYgeW91IGNvbmZpZ3VyZSBub3RoaW5nLCB0aGUgbG9nZ2VyIHBvbGl0ZWx5IHNheXNcbiAqIG5vdGhpbmcgYXQgYWxsLiBJdCBuZXZlciB3cml0ZXMgdG8gc3Rkb3V0IGFuZCBhdm9pZHMgc3RkZXJyIHRvIGtlZXAgaG9va1xuICogcHJvdG9jb2xzIGNsZWFuLlxuICpcbiAqIEBzdW1tYXJ5IFN0cnVjdHVyZWQgbG9nZ2luZyBmb3IgQ2FyZHMgRXh0ZW5zaW9uIGhvb2tzXG4gKiBAbW9kdWxlXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogaW1wb3J0IHsgbG9nZ2VyIH0gZnJvbSAnQGNhcmRzL3Nkay9jb25maWcnO1xuICpcbiAqIC8vIFN1YnNjcmliZSB0byBsb2cgZXZlbnRzXG4gKiBjb25zdCB1bnN1YnNjcmliZSA9IGxvZ2dlci5vbignZXJyb3InLCAoZXZlbnQpID0+IHtcbiAqICAgY29uc29sZS5lcnJvcihgRXJyb3IgaW4gJHtldmVudC5ob29rVHlwZX06ICR7ZXZlbnQubWVzc2FnZX1gKTtcbiAqIH0pO1xuICpcbiAqIC8vIExhdGVyLCBjbGVhbiB1cFxuICogdW5zdWJzY3JpYmUoKTtcbiAqIGBgYFxuICovXG5cbmltcG9ydCB7IGNsb3NlU3luYywgZXhpc3RzU3luYywgbWtkaXJTeW5jLCBvcGVuU3luYywgd3JpdGVTeW5jIH0gZnJvbSAnbm9kZTpmcyc7XG5pbXBvcnQgeyBkaXJuYW1lIH0gZnJvbSAnbm9kZTpwYXRoJztcblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gTG9nIExldmVsIFR5cGVzXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbi8qKlxuICogQXZhaWxhYmxlIGxvZyBsZXZlbHMuXG4gKlxuICogfCBMZXZlbCB8IFNldmVyaXR5IHwgVXNlIENhc2UgfFxuICogfC0tLS0tLS18LS0tLS0tLS0tLXwtLS0tLS0tLS0tfFxuICogfCBgZGVidWdgIHwgTG93ZXN0IHwgRGV0YWlsZWQgZGVidWdnaW5nIGluZm9ybWF0aW9uIHxcbiAqIHwgYGluZm9gIHwgTG93IHwgR2VuZXJhbCBvcGVyYXRpb25hbCBldmVudHMgfFxuICogfCBgd2FybmAgfCBNZWRpdW0gfCBXYXJuaW5nIGNvbmRpdGlvbnMgdGhhdCBtYXkgaW5kaWNhdGUgaXNzdWVzIHxcbiAqIHwgYGVycm9yYCB8IEhpZ2ggfCBFcnJvciBjb25kaXRpb25zIHJlcXVpcmluZyBhdHRlbnRpb24gfFxuICovXG5leHBvcnQgdHlwZSBMb2dMZXZlbCA9ICdkZWJ1ZycgfCAnaW5mbycgfCAnd2FybicgfCAnZXJyb3InO1xuXG4vKipcbiAqIEFsbCBsb2cgbGV2ZWxzIGluIG9yZGVyIG9mIHNldmVyaXR5IChsb3dlc3QgdG8gaGlnaGVzdCkuXG4gKi9cbmV4cG9ydCBjb25zdCBMT0dfTEVWRUxTID0gWydkZWJ1ZycsICdpbmZvJywgJ3dhcm4nLCAnZXJyb3InXSBhcyBjb25zdCBzYXRpc2ZpZXMgcmVhZG9ubHkgTG9nTGV2ZWxbXTtcblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gTG9nIEV2ZW50IFR5cGVcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuLyoqXG4gKiBTdHJ1Y3R1cmVkIGxvZyBldmVudCBlbWl0dGVkIGJ5IHRoZSBsb2dnZXIuXG4gKlxuICogRXZlbnRzIGluY2x1ZGUgY29udGV4dHVhbCBkZXRhaWxzIGFib3V0IGhvb2sgZXhlY3V0aW9uIGFuZCBhcmUgc3VpdGFibGUgZm9yXG4gKiBkZWJ1Z2dpbmcsIG1vbml0b3JpbmcsIGFuZCBhbmFseXRpY3MgcGlwZWxpbmVzLlxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIC8vIEV4YW1wbGUgbG9nIGV2ZW50XG4gKiBjb25zdCBldmVudDogTG9nRXZlbnQgPSB7XG4gKiAgIHRpbWVzdGFtcDogJzIwMjQtMDEtMTVUMTA6MzA6MDAuMDAwWicsXG4gKiAgIGxldmVsOiAnd2FybicsXG4gKiAgIGhvb2tUeXBlOiAnYWN0aW9uLXN0YXJ0JyxcbiAqICAgbWVzc2FnZTogJ0NhcmQgc3RhcnRlZCcsXG4gKiAgIGlucHV0OiB7IGNhcmRJZDogJ2NhcmQtMTIzJyB9XG4gKiB9O1xuICogYGBgXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgTG9nRXZlbnQge1xuICAvKipcbiAgICogSVNPIDg2MDEgdGltZXN0YW1wIG9mIHdoZW4gdGhlIGV2ZW50IG9jY3VycmVkLlxuICAgKiBAZXhhbXBsZSAnMjAyNC0wMS0xNVQxMDozMDowMC4wMDBaJ1xuICAgKi9cbiAgdGltZXN0YW1wOiBzdHJpbmc7XG5cbiAgLyoqXG4gICAqIFNldmVyaXR5IGxldmVsIG9mIHRoZSBsb2cgZXZlbnQuXG4gICAqL1xuICBsZXZlbDogTG9nTGV2ZWw7XG5cbiAgLyoqXG4gICAqIFR5cGUgb2YgaG9vayB0aGF0IGdlbmVyYXRlZCB0aGlzIGV2ZW50LlxuICAgKiBNYXkgYmUgdW5kZWZpbmVkIGZvciBldmVudHMgb3V0c2lkZSBob29rIGNvbnRleHQuXG4gICAqL1xuICBob29rVHlwZT86IHN0cmluZztcblxuICAvKipcbiAgICogSHVtYW4tcmVhZGFibGUgZGVzY3JpcHRpb24gb2Ygd2hhdCBoYXBwZW5lZC5cbiAgICovXG4gIG1lc3NhZ2U6IHN0cmluZztcblxuICAvKipcbiAgICogSG9vayBpbnB1dCBkYXRhIGF0IHRoZSB0aW1lIG9mIGxvZ2dpbmcuXG4gICAqXG4gICAqIFRoaXMgaXMgcGFydGlhbCBieSBkZXNpZ24sIHNvIHlvdSBjYW4gYXZvaWQgbG9nZ2luZyBsYXJnZSBvciBzZW5zaXRpdmVcbiAgICogcGF5bG9hZHMgd2hpbGUgc3RpbGwgY2FwdHVyaW5nIGtleSBpZGVudGlmaWVycy5cbiAgICovXG4gIGlucHV0PzogUmVjb3JkPHN0cmluZywgdW5rbm93bj47XG5cbiAgLyoqXG4gICAqIEVycm9yIGluZm9ybWF0aW9uIGlmIHRoaXMgZXZlbnQgcmVwcmVzZW50cyBhbiBlcnJvci5cbiAgICogQ29udGFpbnMgc3RydWN0dXJlZCBlcnJvciBkZXRhaWxzIGZvciBhbmFseXNpcy5cbiAgICovXG4gIGVycm9yPzogTG9nRXZlbnRFcnJvcjtcblxuICAvKipcbiAgICogQWRkaXRpb25hbCBjb250ZXh0IGRhdGEgcHJvdmlkZWQgYnkgdGhlIGNhbGxlci5cbiAgICpcbiAgICogVXNlIHRoaXMgZm9yIHN0cnVjdHVyZWQgbWV0YWRhdGEgdGhhdCB5b3Ugd2FudCBkb3duc3RyZWFtIGhhbmRsZXJzXG4gICAqIHRvIHJlY2VpdmUgKGUuZy4sIHJlcXVlc3QgSURzLCB0aW1pbmcgZGF0YSkuXG4gICAqL1xuICBjb250ZXh0PzogUmVjb3JkPHN0cmluZywgdW5rbm93bj47XG59XG5cbi8qKlxuICogU3RydWN0dXJlZCBlcnJvciBpbmZvcm1hdGlvbiB3aXRoaW4gYSBsb2cgZXZlbnQuXG4gKlxuICogRXJyb3JzIGFyZSBub3JtYWxpemVkIHNvIGhhbmRsZXJzIGNhbiBkZXBlbmQgb24gY29uc2lzdGVudCBzaGFwZSwgZXZlbiB3aGVuXG4gKiBjYWxsZXJzIHRocm93IG5vbi1FcnJvciB2YWx1ZXMuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgTG9nRXZlbnRFcnJvciB7XG4gIC8qKlxuICAgKiBFcnJvciBuYW1lIChlLmcuLCAnVHlwZUVycm9yJywgJ1ZhbGlkYXRpb25FcnJvcicpLlxuICAgKi9cbiAgbmFtZTogc3RyaW5nO1xuXG4gIC8qKlxuICAgKiBFcnJvciBtZXNzYWdlIGRlc2NyaWJpbmcgd2hhdCB3ZW50IHdyb25nLlxuICAgKi9cbiAgbWVzc2FnZTogc3RyaW5nO1xuXG4gIC8qKlxuICAgKiBTdGFjayB0cmFjZSBpZiBhdmFpbGFibGUuXG4gICAqL1xuICBzdGFjaz86IHN0cmluZztcblxuICAvKipcbiAgICogRXJyb3IgY2F1c2UgY2hhaW4gaWYgdGhlIGVycm9yIHdhcyB3cmFwcGVkLlxuICAgKi9cbiAgY2F1c2U/OiBMb2dFdmVudEVycm9yO1xufVxuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBFdmVudCBIYW5kbGVyIFR5cGVcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuLyoqXG4gKiBIYW5kbGVyIGludm9rZWQgd2hlbiBhIGxvZyBldmVudCBpcyBlbWl0dGVkLlxuICpcbiAqIEhhbmRsZXJzIHJ1biBzeW5jaHJvbm91c2x5LiBFcnJvcnMgdGhyb3duIGJ5IGEgaGFuZGxlciBhcmUgc3dhbGxvd2VkIHNvXG4gKiBsb2dnaW5nIGNhbm5vdCBicmVhayBob29rIGV4ZWN1dGlvbi5cbiAqIEBwYXJhbSBldmVudCAtIFRoZSBsb2cgZXZlbnQgdG8gaGFuZGxlXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogLy8gRm9yd2FyZCB0byBleHRlcm5hbCBsb2dnaW5nIHNlcnZpY2VcbiAqIGNvbnN0IGhhbmRsZXI6IExvZ0V2ZW50SGFuZGxlciA9IChldmVudCkgPT4ge1xuICogICBleHRlcm5hbExvZ2dlci5sb2coe1xuICogICAgIGxldmVsOiBldmVudC5sZXZlbCxcbiAqICAgICBtZXNzYWdlOiBldmVudC5tZXNzYWdlLFxuICogICAgIG1ldGFkYXRhOiB7IGhvb2tUeXBlOiBldmVudC5ob29rVHlwZSB9XG4gKiAgIH0pO1xuICogfTtcbiAqIGBgYFxuICovXG5leHBvcnQgdHlwZSBMb2dFdmVudEhhbmRsZXIgPSAoZXZlbnQ6IExvZ0V2ZW50KSA9PiB2b2lkO1xuXG4vKipcbiAqIEZ1bmN0aW9uIHRvIHVuc3Vic2NyaWJlIGEgbG9nIGV2ZW50IGhhbmRsZXIuXG4gKlxuICogQ2FsbCB0aGlzIGZ1bmN0aW9uIHRvIHN0b3AgcmVjZWl2aW5nIGxvZyBldmVudHMuIEFsd2F5cyBjYWxsIHVuc3Vic2NyaWJlXG4gKiB3aGVuIHRoZSBoYW5kbGVyIGlzIG5vIGxvbmdlciBuZWVkZWQgdG8gcHJldmVudCBtZW1vcnkgbGVha3MuXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogY29uc3QgdW5zdWJzY3JpYmUgPSBsb2dnZXIub24oJ2Vycm9yJywgaGFuZGxlRXJyb3IpO1xuICogLy8gLi4uIGxhdGVyXG4gKiB1bnN1YnNjcmliZSgpOyAvLyBTdG9wIHJlY2VpdmluZyBldmVudHNcbiAqIGBgYFxuICovXG5leHBvcnQgdHlwZSBVbnN1YnNjcmliZSA9ICgpID0+IHZvaWQ7XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIExvZ2dlciBDb25maWd1cmF0aW9uXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbi8qKlxuICogQ29uZmlndXJhdGlvbiBvcHRpb25zIGZvciB0aGUgTG9nZ2VyLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIExvZ2dlckNvbmZpZyB7XG4gIC8qKlxuICAgKiBQYXRoIHRvIHRoZSBsb2cgZmlsZSBmb3IgSlNPTiBMaW5lcyBvdXRwdXQuXG4gICAqXG4gICAqIElmIG5vdCBzZXQsIGZpbGUgbG9nZ2luZyBpcyBkaXNhYmxlZC4gQ2FuIGFsc28gYmUgc2V0IHZpYSB0aGVcbiAgICogYENBUkRTX0hPT0tTX0xPR19GSUxFYCBlbnZpcm9ubWVudCB2YXJpYWJsZS5cbiAgICovXG4gIGxvZ0ZpbGVQYXRoPzogc3RyaW5nO1xufVxuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBMb2dnZXIgSW50ZXJmYWNlIChmb3IgdGVzdGluZyBhbmQgdHlwZSBjb21wYXRpYmlsaXR5KVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4vKipcbiAqIExvZ2dlciBpbnRlcmZhY2UgZm9yIHN0cnVjdHVyZWQsIGNvbnRleHQtYXdhcmUgbG9nZ2luZy5cbiAqXG4gKiBUaGlzIGludGVyZmFjZSBkZWZpbmVzIHRoZSBwdWJsaWMgQVBJIG9mIHRoZSBMb2dnZXIgY2xhc3MuIEl0IGV4aXN0c1xuICogcHJpbWFyaWx5IGZvciB0eXBlIGNvbXBhdGliaWxpdHkgYW5kIHRlc3RpbmcgcHVycG9zZXMsIGFsbG93aW5nIHRlc3RzXG4gKiB0byBtb2NrIHRoZSBsb2dnZXIgd2l0aG91dCBuZWVkaW5nIHRvIGltcGxlbWVudCBhbGwgaW50ZXJuYWwgbWV0aG9kcy5cbiAqXG4gKiBGb3IgcHJvZHVjdGlvbiB1c2UsIHVzZSB0aGUge0BsaW5rIExvZ2dlcn0gY2xhc3Mgb3IgdGhlIHtAbGluayBsb2dnZXJ9XG4gKiBzaW5nbGV0b24gZXhwb3J0LlxuICovXG5leHBvcnQgaW50ZXJmYWNlIElMb2dnZXIge1xuICAvKipcbiAgICogTG9ncyBhIGRlYnVnIG1lc3NhZ2UuXG4gICAqIEBwYXJhbSBtZXNzYWdlIC0gRGlhZ25vc3RpYyB0ZXh0IGRlc2NyaWJpbmcgbG93LWxldmVsIGV4ZWN1dGlvbiBkZXRhaWxzLlxuICAgKiBAcGFyYW0gY29udGV4dCAtIE9wdGlvbmFsIHN0cnVjdHVyZWQgbWV0YWRhdGEgbWVyZ2VkIGludG8gdGhlIGVtaXR0ZWQgZXZlbnQuXG4gICAqL1xuICBkZWJ1ZyhtZXNzYWdlOiBzdHJpbmcsIGNvbnRleHQ/OiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPik6IHZvaWQ7XG5cbiAgLyoqXG4gICAqIExvZ3MgYW4gaW5mbyBtZXNzYWdlLlxuICAgKiBAcGFyYW0gbWVzc2FnZSAtIE9wZXJhdGlvbmFsIG1lc3NhZ2UgZGVzY3JpYmluZyBub3JtYWwgaG9vayBwcm9ncmVzcy5cbiAgICogQHBhcmFtIGNvbnRleHQgLSBPcHRpb25hbCBzdHJ1Y3R1cmVkIG1ldGFkYXRhIG1lcmdlZCBpbnRvIHRoZSBlbWl0dGVkIGV2ZW50LlxuICAgKi9cbiAgaW5mbyhtZXNzYWdlOiBzdHJpbmcsIGNvbnRleHQ/OiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPik6IHZvaWQ7XG5cbiAgLyoqXG4gICAqIExvZ3MgYSB3YXJuaW5nIG1lc3NhZ2UuXG4gICAqIEBwYXJhbSBtZXNzYWdlIC0gV2FybmluZyB0ZXh0IGZvciByZWNvdmVyYWJsZSBvciBzdXNwaWNpb3VzIGNvbmRpdGlvbnMuXG4gICAqIEBwYXJhbSBjb250ZXh0IC0gT3B0aW9uYWwgc3RydWN0dXJlZCBtZXRhZGF0YSBtZXJnZWQgaW50byB0aGUgZW1pdHRlZCBldmVudC5cbiAgICovXG4gIHdhcm4obWVzc2FnZTogc3RyaW5nLCBjb250ZXh0PzogUmVjb3JkPHN0cmluZywgdW5rbm93bj4pOiB2b2lkO1xuXG4gIC8qKlxuICAgKiBMb2dzIGFuIGVycm9yIG1lc3NhZ2UuXG4gICAqIEBwYXJhbSBtZXNzYWdlIC0gRXJyb3IgdGV4dCBkZXNjcmliaW5nIGEgaGFuZGxlZCBmYWlsdXJlIGNvbmRpdGlvbi5cbiAgICogQHBhcmFtIGNvbnRleHQgLSBPcHRpb25hbCBzdHJ1Y3R1cmVkIG1ldGFkYXRhIG1lcmdlZCBpbnRvIHRoZSBlbWl0dGVkIGV2ZW50LlxuICAgKi9cbiAgZXJyb3IobWVzc2FnZTogc3RyaW5nLCBjb250ZXh0PzogUmVjb3JkPHN0cmluZywgdW5rbm93bj4pOiB2b2lkO1xuXG4gIC8qKlxuICAgKiBMb2dzIGEgc3RydWN0dXJlZCBlcnJvciB3aXRoIGZ1bGwgZXJyb3IgZGV0YWlscy5cbiAgICogQHBhcmFtIGVycm9yIC0gVGhlIGVycm9yIHRvIGxvZ1xuICAgKiBAcGFyYW0gbWVzc2FnZSAtIEh1bWFuLXJlYWRhYmxlIGRlc2NyaXB0aW9uIG9mIHdoYXQgZmFpbGVkXG4gICAqIEBwYXJhbSBjb250ZXh0IC0gT3B0aW9uYWwgc3RydWN0dXJlZCBtZXRhZGF0YSBtZXJnZWQgaW50byB0aGUgZW1pdHRlZCBldmVudC5cbiAgICovXG4gIGxvZ0Vycm9yKGVycm9yOiB1bmtub3duLCBtZXNzYWdlOiBzdHJpbmcsIGNvbnRleHQ/OiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPik6IHZvaWQ7XG59XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIExvZ2dlciBDbGFzc1xuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4vKipcbiAqIExvZ2dlciBmb3IgQ2FyZHMgRXh0ZW5zaW9uIGhvb2tzIHdpdGggZXZlbnQgc3Vic2NyaXB0aW9uIGFuZCBmaWxlIG91dHB1dC5cbiAqXG4gKiBPdXRwdXQgaXMgb3B0LWluIGFuZCBiZXN0LWVmZm9ydDpcbiAqIC0gV2l0aCBubyBoYW5kbGVycyBhbmQgbm8gbG9nIGZpbGUsIGV2ZW50cyBhcmUgZHJvcHBlZC5cbiAqIC0gSGFuZGxlciBlcnJvcnMgYXJlIHN3YWxsb3dlZCBzbyBsb2dnaW5nIGNhbm5vdCBicmVhayBob29rcy5cbiAqIC0gRmlsZSBvdXRwdXQgdXNlcyBKU09OIExpbmVzIGFuZCBpZ25vcmVzIHdyaXRlIGZhaWx1cmVzLlxuICpcbiAqIFRoZSBsb2dnZXIgbmV2ZXIgd3JpdGVzIHRvIHN0ZG91dCBvciBzdGRlcnIuXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogaW1wb3J0IHsgbG9nZ2VyIH0gZnJvbSAnQGNhcmRzL3Nkay9jb25maWcnO1xuICpcbiAqIC8vIFN1YnNjcmliZSB0byBldmVudHMgYXQgc3BlY2lmaWMgbGV2ZWxcbiAqIGxvZ2dlci5vbignd2FybicsIChldmVudCkgPT4ge1xuICogICBzZW5kQWxlcnQoZXZlbnQubWVzc2FnZSk7XG4gKiB9KTtcbiAqXG4gKiAvLyBMb2cgd2l0aGluIGEgaG9vayBoYW5kbGVyXG4gKiBsb2dnZXIud2FybignQWJvdXQgdG8gZXhlY3V0ZSB0YXNrJyk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNsYXNzIExvZ2dlciB7XG4gIC8qKlxuICAgKiBSZWdpc3RlcmVkIGV2ZW50IGhhbmRsZXJzIGJ5IGxvZyBsZXZlbC5cbiAgICovXG4gIHByaXZhdGUgaGFuZGxlcnM6IE1hcDxMb2dMZXZlbCwgU2V0PExvZ0V2ZW50SGFuZGxlcj4+ID0gbmV3IE1hcCgpO1xuXG4gIC8qKlxuICAgKiBGaWxlIGRlc2NyaXB0b3IgZm9yIGxvZyBmaWxlIG91dHB1dC5cbiAgICogTGF6aWx5IGluaXRpYWxpemVkIG9uIGZpcnN0IHdyaXRlLlxuICAgKi9cbiAgcHJpdmF0ZSBsb2dGaWxlRmQ6IG51bWJlciB8IG51bGwgPSBudWxsO1xuXG4gIC8qKlxuICAgKiBQYXRoIHRvIHRoZSBsb2cgZmlsZSwgaWYgY29uZmlndXJlZC5cbiAgICovXG4gIHByaXZhdGUgbG9nRmlsZVBhdGg6IHN0cmluZyB8IG51bGwgPSBudWxsO1xuXG4gIC8qKlxuICAgKiBXaGV0aGVyIGZpbGUgaW5pdGlhbGl6YXRpb24gaGFzIGJlZW4gYXR0ZW1wdGVkLlxuICAgKi9cbiAgcHJpdmF0ZSBmaWxlSW5pdGlhbGl6ZWQgPSBmYWxzZTtcblxuICAvKipcbiAgICogQ3VycmVudCBob29rIGNvbnRleHQgZm9yIGVucmljaGluZyBsb2cgZXZlbnRzLlxuICAgKi9cbiAgcHJpdmF0ZSBjdXJyZW50SG9va1R5cGU6IHN0cmluZyB8IHVuZGVmaW5lZDtcblxuICAvKipcbiAgICogQ3VycmVudCBob29rIGlucHV0IGZvciBlbnJpY2hpbmcgbG9nIGV2ZW50cy5cbiAgICovXG4gIHByaXZhdGUgY3VycmVudElucHV0OiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPiB8IHVuZGVmaW5lZDtcblxuICAvKipcbiAgICogQ3JlYXRlcyBhIG5ldyBMb2dnZXIgaW5zdGFuY2UuXG4gICAqXG4gICAqIFR5cGljYWxseSB5b3Ugc2hvdWxkIHVzZSB0aGUgZXhwb3J0ZWQgYGxvZ2dlcmAgc2luZ2xldG9uIHJhdGhlciB0aGFuXG4gICAqIGNyZWF0aW5nIG5ldyBpbnN0YW5jZXMuXG4gICAqIEBwYXJhbSBjb25maWcgLSBPcHRpb25hbCBjb25maWd1cmF0aW9uXG4gICAqIEBleGFtcGxlXG4gICAqIGBgYHR5cGVzY3JpcHRcbiAgICogLy8gVXNlIHNpbmdsZXRvbiAocmVjb21tZW5kZWQpXG4gICAqIGltcG9ydCB7IGxvZ2dlciB9IGZyb20gJ0BjYXJkcy9zZGsvY29uZmlnJztcbiAgICpcbiAgICogLy8gT3IgY3JlYXRlIGN1c3RvbSBpbnN0YW5jZVxuICAgKiBjb25zdCBjdXN0b21Mb2dnZXIgPSBuZXcgTG9nZ2VyKHsgbG9nRmlsZVBhdGg6ICcvdmFyL2xvZy9ob29rcy5sb2cnIH0pO1xuICAgKiBgYGBcbiAgICovXG4gIGNvbnN0cnVjdG9yKGNvbmZpZzogTG9nZ2VyQ29uZmlnID0ge30pIHtcbiAgICAvLyBJbml0aWFsaXplIGhhbmRsZXJzIG1hcCBmb3IgZWFjaCBsZXZlbFxuICAgIGZvciAoY29uc3QgbGV2ZWwgb2YgTE9HX0xFVkVMUykge1xuICAgICAgdGhpcy5oYW5kbGVycy5zZXQobGV2ZWwsIG5ldyBTZXQoKSk7XG4gICAgfVxuXG4gICAgLy8gU2V0IGxvZyBmaWxlIHBhdGggZnJvbSBjb25maWcgb3IgZW52aXJvbm1lbnRcbiAgICB0aGlzLmxvZ0ZpbGVQYXRoID0gY29uZmlnLmxvZ0ZpbGVQYXRoID8/IHByb2Nlc3MuZW52WydDQVJEU19IT09LU19MT0dfRklMRSddID8/IG51bGw7XG4gIH1cblxuICAvKipcbiAgICogTG9ncyBhIGRlYnVnIG1lc3NhZ2UuXG4gICAqXG4gICAqIFVzZSBmb3IgZGV0YWlsZWQgZGVidWdnaW5nIGluZm9ybWF0aW9uIHRoYXQgaXMgdHlwaWNhbGx5IG9ubHkgdXNlZnVsXG4gICAqIGR1cmluZyBkZXZlbG9wbWVudCBvciB0cm91Ymxlc2hvb3RpbmcuXG4gICAqIEBwYXJhbSBtZXNzYWdlIC0gRGlhZ25vc3RpYyB0ZXh0IGRlc2NyaWJpbmcgbG93LWxldmVsIGV4ZWN1dGlvbiBkZXRhaWxzLlxuICAgKiBAcGFyYW0gY29udGV4dCAtIE9wdGlvbmFsIHN0cnVjdHVyZWQgbWV0YWRhdGEgbWVyZ2VkIGludG8gdGhlIGVtaXR0ZWQgZXZlbnQuXG4gICAqIEBleGFtcGxlXG4gICAqIGBgYHR5cGVzY3JpcHRcbiAgICogbG9nZ2VyLmRlYnVnKCdQcm9jZXNzaW5nIGhvb2sgaW5wdXQnLCB7IHRhc2tJZDogJ3Rhc2stMTIzJywgaW5wdXRTaXplOiAyNTYgfSk7XG4gICAqIGBgYFxuICAgKi9cbiAgZGVidWcobWVzc2FnZTogc3RyaW5nLCBjb250ZXh0PzogUmVjb3JkPHN0cmluZywgdW5rbm93bj4pOiB2b2lkIHtcbiAgICB0aGlzLmVtaXQoJ2RlYnVnJywgbWVzc2FnZSwgY29udGV4dCk7XG4gIH1cblxuICAvKipcbiAgICogTG9ncyBhbiBpbmZvIG1lc3NhZ2UuXG4gICAqXG4gICAqIFVzZSBmb3IgZ2VuZXJhbCBvcGVyYXRpb25hbCBldmVudHMgbGlrZSBob29rIGludm9jYXRpb25zLCBzdWNjZXNzZnVsXG4gICAqIGNvbXBsZXRpb25zLCBvciBzdGF0ZSBjaGFuZ2VzLlxuICAgKiBAcGFyYW0gbWVzc2FnZSAtIE9wZXJhdGlvbmFsIG1lc3NhZ2UgZGVzY3JpYmluZyBub3JtYWwgaG9vayBwcm9ncmVzcy5cbiAgICogQHBhcmFtIGNvbnRleHQgLSBPcHRpb25hbCBzdHJ1Y3R1cmVkIG1ldGFkYXRhIG1lcmdlZCBpbnRvIHRoZSBlbWl0dGVkIGV2ZW50LlxuICAgKiBAZXhhbXBsZVxuICAgKiBgYGB0eXBlc2NyaXB0XG4gICAqIGxvZ2dlci5pbmZvKCdUYXNrIHN0YXJ0ZWQnLCB7IHRhc2tJZDogJ3Rhc2stMTIzJywgY2FyZElkOiAnY2FyZC00NTYnIH0pO1xuICAgKiBgYGBcbiAgICovXG4gIGluZm8obWVzc2FnZTogc3RyaW5nLCBjb250ZXh0PzogUmVjb3JkPHN0cmluZywgdW5rbm93bj4pOiB2b2lkIHtcbiAgICB0aGlzLmVtaXQoJ2luZm8nLCBtZXNzYWdlLCBjb250ZXh0KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBMb2dzIGEgd2FybmluZyBtZXNzYWdlLlxuICAgKlxuICAgKiBVc2UgZm9yIGNvbmRpdGlvbnMgdGhhdCBtYXkgaW5kaWNhdGUgY2FyZHMgYnV0IGRvbid0IHByZXZlbnRcbiAgICogb3BlcmF0aW9uLCBzdWNoIGFzIGRlcHJlY2F0ZWQgcGF0dGVybnMgb3IgcGVyZm9ybWFuY2UgY29uY2VybnMuXG4gICAqIEBwYXJhbSBtZXNzYWdlIC0gV2FybmluZyB0ZXh0IGZvciByZWNvdmVyYWJsZSBvciBzdXNwaWNpb3VzIGNvbmRpdGlvbnMuXG4gICAqIEBwYXJhbSBjb250ZXh0IC0gT3B0aW9uYWwgc3RydWN0dXJlZCBtZXRhZGF0YSBtZXJnZWQgaW50byB0aGUgZW1pdHRlZCBldmVudC5cbiAgICogQGV4YW1wbGVcbiAgICogYGBgdHlwZXNjcmlwdFxuICAgKiBsb2dnZXIud2FybignRGVwcmVjYXRlZCBob29rIHBhdHRlcm4gZGV0ZWN0ZWQnLCB7IHBhdHRlcm46ICdsZWdhY3lNYXRjaGVyJyB9KTtcbiAgICogYGBgXG4gICAqL1xuICB3YXJuKG1lc3NhZ2U6IHN0cmluZywgY29udGV4dD86IFJlY29yZDxzdHJpbmcsIHVua25vd24+KTogdm9pZCB7XG4gICAgdGhpcy5lbWl0KCd3YXJuJywgbWVzc2FnZSwgY29udGV4dCk7XG4gIH1cblxuICAvKipcbiAgICogTG9ncyBhbiBlcnJvciBtZXNzYWdlLlxuICAgKlxuICAgKiBVc2UgZm9yIGVycm9yIGNvbmRpdGlvbnMgdGhhdCByZXF1aXJlIGF0dGVudGlvbiBidXQgd2VyZSBoYW5kbGVkXG4gICAqIGdyYWNlZnVsbHkuIEZvciBleGNlcHRpb25zLCBwcmVmZXIge0BsaW5rIGxvZ0Vycm9yfS5cbiAgICogQHBhcmFtIG1lc3NhZ2UgLSBFcnJvciB0ZXh0IGRlc2NyaWJpbmcgYSBoYW5kbGVkIGZhaWx1cmUgY29uZGl0aW9uLlxuICAgKiBAcGFyYW0gY29udGV4dCAtIE9wdGlvbmFsIHN0cnVjdHVyZWQgbWV0YWRhdGEgbWVyZ2VkIGludG8gdGhlIGVtaXR0ZWQgZXZlbnQuXG4gICAqIEBleGFtcGxlXG4gICAqIGBgYHR5cGVzY3JpcHRcbiAgICogbG9nZ2VyLmVycm9yKCdGYWlsZWQgdG8gdmFsaWRhdGUgaG9vayBpbnB1dCcsIHsgcmVhc29uOiAnZW1wdHkgdGFza0lkJyB9KTtcbiAgICogYGBgXG4gICAqL1xuICBlcnJvcihtZXNzYWdlOiBzdHJpbmcsIGNvbnRleHQ/OiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPik6IHZvaWQge1xuICAgIHRoaXMuZW1pdCgnZXJyb3InLCBtZXNzYWdlLCBjb250ZXh0KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBMb2dzIGEgc3RydWN0dXJlZCBlcnJvciB3aXRoIGZ1bGwgZXJyb3IgZGV0YWlscy5cbiAgICpcbiAgICogVXNlIHRoaXMgZm9yIGNhdWdodCBleGNlcHRpb25zLiBOb24tRXJyb3IgdmFsdWVzIGFyZSBub3JtYWxpemVkIHNvIGhhbmRsZXJzXG4gICAqIGFsd2F5cyByZWNlaXZlIGEgY29uc2lzdGVudCBlcnJvciBzaGFwZS5cbiAgICogQHBhcmFtIGVycm9yIC0gVGhlIGVycm9yIHRvIGxvZ1xuICAgKiBAcGFyYW0gbWVzc2FnZSAtIEh1bWFuLXJlYWRhYmxlIGRlc2NyaXB0aW9uIG9mIHdoYXQgZmFpbGVkXG4gICAqIEBwYXJhbSBjb250ZXh0IC0gT3B0aW9uYWwgc3RydWN0dXJlZCBtZXRhZGF0YSBtZXJnZWQgaW50byB0aGUgZW1pdHRlZCBldmVudC5cbiAgICogQGV4YW1wbGVcbiAgICogYGBgdHlwZXNjcmlwdFxuICAgKiB0cnkge1xuICAgKiAgIGF3YWl0IGRhbmdlcm91c09wZXJhdGlvbigpO1xuICAgKiB9IGNhdGNoIChlcnIpIHtcbiAgICogICBsb2dnZXIubG9nRXJyb3IoZXJyLCAnRmFpbGVkIHRvIGV4ZWN1dGUgZGFuZ2Vyb3VzIG9wZXJhdGlvbicsIHtcbiAgICogICAgIG9wZXJhdGlvbjogJ2RlbGV0ZScsXG4gICAqICAgICB0YXJnZXQ6ICcvaW1wb3J0YW50L2ZpbGUudHh0J1xuICAgKiAgIH0pO1xuICAgKiB9XG4gICAqIGBgYFxuICAgKi9cbiAgbG9nRXJyb3IoZXJyb3I6IHVua25vd24sIG1lc3NhZ2U6IHN0cmluZywgY29udGV4dD86IFJlY29yZDxzdHJpbmcsIHVua25vd24+KTogdm9pZCB7XG4gICAgY29uc3QgZXJyb3JJbmZvID0gdGhpcy5leHRyYWN0RXJyb3JJbmZvKGVycm9yKTtcblxuICAgIGNvbnN0IGV2ZW50OiBMb2dFdmVudCA9IHtcbiAgICAgIHRpbWVzdGFtcDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxuICAgICAgbGV2ZWw6ICdlcnJvcicsXG4gICAgICBob29rVHlwZTogdGhpcy5jdXJyZW50SG9va1R5cGUsXG4gICAgICBtZXNzYWdlLFxuICAgICAgaW5wdXQ6IHRoaXMuY3VycmVudElucHV0LFxuICAgICAgZXJyb3I6IGVycm9ySW5mbyxcbiAgICAgIGNvbnRleHRcbiAgICB9O1xuXG4gICAgdGhpcy5kZWxpdmVyRXZlbnQoZXZlbnQpO1xuICB9XG5cbiAgLyoqXG4gICAqIFN1YnNjcmliZXMgYSBoYW5kbGVyIHRvIGxvZyBldmVudHMgYXQgdGhlIHNwZWNpZmllZCBsZXZlbC5cbiAgICpcbiAgICogVGhlIGhhbmRsZXIgd2lsbCBiZSBjYWxsZWQgZm9yIGV2ZXJ5IGxvZyBldmVudCBhdCB0aGUgc3BlY2lmaWVkIGxldmVsLlxuICAgKiBSZXR1cm5zIGFuIHVuc3Vic2NyaWJlIGZ1bmN0aW9uIHRoYXQgc2hvdWxkIGJlIGNhbGxlZCB3aGVuIHRoZSBoYW5kbGVyXG4gICAqIGlzIG5vIGxvbmdlciBuZWVkZWQuIEhhbmRsZXIgZXJyb3JzIGFyZSBpZ25vcmVkIHRvIGF2b2lkIGRpc3J1cHRpbmcgaG9va3MuXG4gICAqIEBwYXJhbSBsZXZlbCAtIFRoZSBsb2cgbGV2ZWwgdG8gc3Vic2NyaWJlIHRvXG4gICAqIEBwYXJhbSBoYW5kbGVyIC0gVGhlIGhhbmRsZXIgZnVuY3Rpb24gdG8gY2FsbCBmb3IgZWFjaCBldmVudFxuICAgKiBAcmV0dXJucyBBIGZ1bmN0aW9uIHRvIHVuc3Vic2NyaWJlIHRoZSBoYW5kbGVyXG4gICAqIEBleGFtcGxlXG4gICAqIGBgYHR5cGVzY3JpcHRcbiAgICogLy8gU3Vic2NyaWJlIHRvIGVycm9yIGV2ZW50c1xuICAgKiBjb25zdCB1bnN1YnNjcmliZSA9IGxvZ2dlci5vbignZXJyb3InLCAoZXZlbnQpID0+IHtcbiAgICogICBjb25zb2xlLmVycm9yKGBbJHtldmVudC5ob29rVHlwZX1dICR7ZXZlbnQubWVzc2FnZX1gKTtcbiAgICogICBpZiAoZXZlbnQuZXJyb3IpIHtcbiAgICogICAgIGNvbnNvbGUuZXJyb3IoZXZlbnQuZXJyb3Iuc3RhY2spO1xuICAgKiAgIH1cbiAgICogfSk7XG4gICAqXG4gICAqIC8vIExhdGVyLCBjbGVhbiB1cFxuICAgKiB1bnN1YnNjcmliZSgpO1xuICAgKiBgYGBcbiAgICogQGV4YW1wbGVcbiAgICogYGBgdHlwZXNjcmlwdFxuICAgKiAvLyBGb3J3YXJkIHRvIGV4dGVybmFsIGxvZ2dpbmcgbGlicmFyeVxuICAgKiBpbXBvcnQgcGlubyBmcm9tICdwaW5vJztcbiAgICogY29uc3QgcGlub0xvZ2dlciA9IHBpbm8oKTtcbiAgICpcbiAgICogbG9nZ2VyLm9uKCdpbmZvJywgKGV2ZW50KSA9PiBwaW5vTG9nZ2VyLmluZm8oZXZlbnQsIGV2ZW50Lm1lc3NhZ2UpKTtcbiAgICogbG9nZ2VyLm9uKCd3YXJuJywgKGV2ZW50KSA9PiBwaW5vTG9nZ2VyLndhcm4oZXZlbnQsIGV2ZW50Lm1lc3NhZ2UpKTtcbiAgICogbG9nZ2VyLm9uKCdlcnJvcicsIChldmVudCkgPT4gcGlub0xvZ2dlci5lcnJvcihldmVudCwgZXZlbnQubWVzc2FnZSkpO1xuICAgKiBgYGBcbiAgICovXG4gIG9uKGxldmVsOiBMb2dMZXZlbCwgaGFuZGxlcjogTG9nRXZlbnRIYW5kbGVyKTogVW5zdWJzY3JpYmUge1xuICAgIGNvbnN0IGxldmVsSGFuZGxlcnMgPSB0aGlzLmhhbmRsZXJzLmdldChsZXZlbCk7XG4gICAgaWYgKGxldmVsSGFuZGxlcnMpIHtcbiAgICAgIGxldmVsSGFuZGxlcnMuYWRkKGhhbmRsZXIpO1xuICAgIH1cblxuICAgIHJldHVybiAoKSA9PiB7XG4gICAgICBsZXZlbEhhbmRsZXJzPy5kZWxldGUoaGFuZGxlcik7XG4gICAgfTtcbiAgfVxuXG4gIC8qKlxuICAgKiBTZXRzIHRoZSBjdXJyZW50IGhvb2sgY29udGV4dCBmb3IgZW5yaWNoaW5nIGxvZyBldmVudHMuXG4gICAqXG4gICAqIFRoaXMgaXMgY2FsbGVkIGludGVybmFsbHkgYnkgdGhlIHJ1bnRpbWUgYmVmb3JlIGludm9raW5nIGhvb2sgaGFuZGxlcnMuXG4gICAqIFlvdSB0eXBpY2FsbHkgZG9uJ3QgbmVlZCB0byBjYWxsIHRoaXMgZGlyZWN0bHkuXG4gICAqIEBwYXJhbSBob29rVHlwZSAtIFRoZSB0eXBlIG9mIGhvb2sgYmVpbmcgZXhlY3V0ZWRcbiAgICogQHBhcmFtIGlucHV0IC0gVGhlIGhvb2sgaW5wdXQgZGF0YVxuICAgKiBAaW50ZXJuYWxcbiAgICovXG4gIHNldENvbnRleHQoaG9va1R5cGU6IHN0cmluZyB8IHVuZGVmaW5lZCwgaW5wdXQ6IFJlY29yZDxzdHJpbmcsIHVua25vd24+IHwgdW5kZWZpbmVkKTogdm9pZCB7XG4gICAgdGhpcy5jdXJyZW50SG9va1R5cGUgPSBob29rVHlwZTtcbiAgICB0aGlzLmN1cnJlbnRJbnB1dCA9IGlucHV0O1xuICB9XG5cbiAgLyoqXG4gICAqIENsZWFycyB0aGUgY3VycmVudCBob29rIGNvbnRleHQuXG4gICAqXG4gICAqIENhbGxlZCBpbnRlcm5hbGx5IGJ5IHRoZSBydW50aW1lIGFmdGVyIGhvb2sgZXhlY3V0aW9uIGNvbXBsZXRlcy5cbiAgICogQGludGVybmFsXG4gICAqL1xuICBjbGVhckNvbnRleHQoKTogdm9pZCB7XG4gICAgdGhpcy5jdXJyZW50SG9va1R5cGUgPSB1bmRlZmluZWQ7XG4gICAgdGhpcy5jdXJyZW50SW5wdXQgPSB1bmRlZmluZWQ7XG4gIH1cblxuICAvKipcbiAgICogU2V0cyBhIGRlZmF1bHQgbG9nIGZpbGUgcGF0aCB0aGF0IG9ubHkgdGFrZXMgZWZmZWN0IGlmIG5vIG90aGVyIHNvdXJjZVxuICAgKiBoYXMgY29uZmlndXJlZCBmaWxlIGxvZ2dpbmcuXG4gICAqXG4gICAqIFRoaXMgaXMgdGhlIGxvd2VzdC1wcmlvcml0eSBmaWxlIHBhdGggc291cmNlLiBJdCB3aWxsIGJlIGlnbm9yZWQgaWZcbiAgICogYW55IG9mIHRoZXNlIGhhdmUgYWxyZWFkeSBzZXQgYSBwYXRoOlxuICAgKiAtIGBsb2dGaWxlUGF0aGAgaW4gdGhlIGNvbnN0cnVjdG9yIGNvbmZpZ1xuICAgKiAtIGBDQVJEU19IT09LU19MT0dfRklMRWAgZW52aXJvbm1lbnQgdmFyaWFibGVcbiAgICogLSB7QGxpbmsgc2V0TG9nRmlsZX0gY2FsbGVkIGF0IHJ1bnRpbWVcbiAgICpcbiAgICogSW50ZW5kZWQgZm9yIHVzZSBieSBDTEkgZW50cnkgcG9pbnRzIChlLmcuLCB0aGUgYC0tbG9nYCBmbGFnKS5cbiAgICogQHBhcmFtIGZpbGVQYXRoIC0gRGVmYXVsdCBwYXRoIHRvIHRoZSBsb2cgZmlsZVxuICAgKiBAZXhhbXBsZVxuICAgKiBgYGB0eXBlc2NyaXB0XG4gICAqIC8vIFdpcmUgLS1sb2cgQ0xJIGFyZ3VtZW50IGFzIGEgZmFsbGJhY2tcbiAgICogaWYgKGFyZ3MubG9nKSB7XG4gICAqICAgbG9nZ2VyLnNldERlZmF1bHRMb2dGaWxlKGFyZ3MubG9nKTtcbiAgICogfVxuICAgKiBgYGBcbiAgICovXG4gIHNldERlZmF1bHRMb2dGaWxlKGZpbGVQYXRoOiBzdHJpbmcpOiB2b2lkIHtcbiAgICBpZiAodGhpcy5sb2dGaWxlUGF0aCA9PT0gbnVsbCkge1xuICAgICAgdGhpcy5sb2dGaWxlUGF0aCA9IGZpbGVQYXRoO1xuICAgICAgdGhpcy5maWxlSW5pdGlhbGl6ZWQgPSBmYWxzZTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogQ29uZmlndXJlcyB0aGUgbG9nIGZpbGUgcGF0aCBhdCBydW50aW1lLlxuICAgKlxuICAgKiBDYWxsIHRoaXMgdG8gZW5hYmxlIG9yIGNoYW5nZSBmaWxlIGxvZ2dpbmcuIFNldHRpbmcgdG8gYG51bGxgIGRpc2FibGVzXG4gICAqIGZpbGUgbG9nZ2luZyBhbmQgY2xvc2VzIGFueSBvcGVuIGZpbGUgaGFuZGxlLiBEaXJlY3RvcmllcyBhcmUgY3JlYXRlZFxuICAgKiBvbiBkZW1hbmQgd2hlbiB0aGUgZmlyc3Qgd3JpdGUgb2NjdXJzLlxuICAgKiBAcGFyYW0gZmlsZVBhdGggLSBQYXRoIHRvIHRoZSBsb2cgZmlsZSwgb3IgbnVsbCB0byBkaXNhYmxlXG4gICAqIEBleGFtcGxlXG4gICAqIGBgYHR5cGVzY3JpcHRcbiAgICogLy8gRW5hYmxlIGZpbGUgbG9nZ2luZyBhdCBydW50aW1lXG4gICAqIGxvZ2dlci5zZXRMb2dGaWxlKCcvdmFyL2xvZy9jYXJkcy1zZGsubG9nJyk7XG4gICAqXG4gICAqIC8vIERpc2FibGUgZmlsZSBsb2dnaW5nXG4gICAqIGxvZ2dlci5zZXRMb2dGaWxlKG51bGwpO1xuICAgKiBgYGBcbiAgICovXG4gIHNldExvZ0ZpbGUoZmlsZVBhdGg6IHN0cmluZyB8IG51bGwpOiB2b2lkIHtcbiAgICAvLyBDbG9zZSBleGlzdGluZyBmaWxlIGlmIG9wZW5cbiAgICBpZiAodGhpcy5sb2dGaWxlRmQgIT09IG51bGwpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGNsb3NlU3luYyh0aGlzLmxvZ0ZpbGVGZCk7XG4gICAgICB9IGNhdGNoIHtcbiAgICAgICAgLy8gSWdub3JlIGVycm9ycyBvbiBjbG9zZVxuICAgICAgfVxuICAgICAgdGhpcy5sb2dGaWxlRmQgPSBudWxsO1xuICAgIH1cblxuICAgIHRoaXMubG9nRmlsZVBhdGggPSBmaWxlUGF0aDtcbiAgICB0aGlzLmZpbGVJbml0aWFsaXplZCA9IGZhbHNlO1xuICB9XG5cbiAgLyoqXG4gICAqIENsb3NlcyBhbGwgcmVzb3VyY2VzIGhlbGQgYnkgdGhlIGxvZ2dlci5cbiAgICpcbiAgICogQ2FsbCB0aGlzIGR1cmluZyBncmFjZWZ1bCBzaHV0ZG93biB0byBlbnN1cmUgYWxsIGxvZyBkYXRhIGlzIGZsdXNoZWQuXG4gICAqIFNhZmUgdG8gY2FsbCBtdWx0aXBsZSB0aW1lcy5cbiAgICogQGV4YW1wbGVcbiAgICogYGBgdHlwZXNjcmlwdFxuICAgKiBwcm9jZXNzLm9uKCdleGl0JywgKCkgPT4ge1xuICAgKiAgIGxvZ2dlci5jbG9zZSgpO1xuICAgKiB9KTtcbiAgICogYGBgXG4gICAqL1xuICBjbG9zZSgpOiB2b2lkIHtcbiAgICBpZiAodGhpcy5sb2dGaWxlRmQgIT09IG51bGwpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGNsb3NlU3luYyh0aGlzLmxvZ0ZpbGVGZCk7XG4gICAgICB9IGNhdGNoIHtcbiAgICAgICAgLy8gSWdub3JlIGVycm9ycyBvbiBjbG9zZVxuICAgICAgfVxuICAgICAgdGhpcy5sb2dGaWxlRmQgPSBudWxsO1xuICAgIH1cbiAgICB0aGlzLmZpbGVJbml0aWFsaXplZCA9IGZhbHNlO1xuICB9XG5cbiAgLyoqXG4gICAqIENoZWNrcyBpZiB0aGVyZSBhcmUgYW55IGFjdGl2ZSBoYW5kbGVycyBvciBkZXN0aW5hdGlvbnMuXG4gICAqXG4gICAqIFJldHVybnMgdHJ1ZSBpZiBhbnkgaGFuZGxlcnMgYXJlIHJlZ2lzdGVyZWQgb3IgZmlsZSBsb2dnaW5nIGlzIGVuYWJsZWQuXG4gICAqIFVzZWZ1bCBmb3IgZGVjaWRpbmcgd2hldGhlciB0byBjb21wdXRlIGV4cGVuc2l2ZSBsb2cgY29udGV4dC5cbiAgICogQHJldHVybnMgV2hldGhlciB0aGUgbG9nZ2VyIGhhcyBhbnkgYWN0aXZlIG91dHB1dCBkZXN0aW5hdGlvbnNcbiAgICovXG4gIGhhc0Rlc3RpbmF0aW9ucygpOiBib29sZWFuIHtcbiAgICBjb25zdCBoYXNIYW5kbGVycyA9IEFycmF5LmZyb20odGhpcy5oYW5kbGVycy52YWx1ZXMoKSkuc29tZSgoaGFuZGxlcnMpID0+IGhhbmRsZXJzLnNpemUgPiAwKTtcbiAgICByZXR1cm4gaGFzSGFuZGxlcnMgfHwgdGhpcy5sb2dGaWxlUGF0aCAhPT0gbnVsbDtcbiAgfVxuXG4gIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgLy8gUHJpdmF0ZSBNZXRob2RzXG4gIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuICAvKipcbiAgICogRW1pdHMgYSBsb2cgZXZlbnQuXG4gICAqIEBwYXJhbSBsZXZlbCAtIFRoZSBzZXZlcml0eSBsZXZlbCBvZiB0aGUgZXZlbnRcbiAgICogQHBhcmFtIG1lc3NhZ2UgLSBUaGUgbG9nIG1lc3NhZ2VcbiAgICogQHBhcmFtIGNvbnRleHQgLSBPcHRpb25hbCBhZGRpdGlvbmFsIGNvbnRleHQgZGF0YVxuICAgKi9cbiAgcHJpdmF0ZSBlbWl0KGxldmVsOiBMb2dMZXZlbCwgbWVzc2FnZTogc3RyaW5nLCBjb250ZXh0PzogUmVjb3JkPHN0cmluZywgdW5rbm93bj4pOiB2b2lkIHtcbiAgICBjb25zdCBldmVudDogTG9nRXZlbnQgPSB7XG4gICAgICB0aW1lc3RhbXA6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcbiAgICAgIGxldmVsLFxuICAgICAgaG9va1R5cGU6IHRoaXMuY3VycmVudEhvb2tUeXBlLFxuICAgICAgbWVzc2FnZSxcbiAgICAgIGlucHV0OiB0aGlzLmN1cnJlbnRJbnB1dCxcbiAgICAgIGNvbnRleHRcbiAgICB9O1xuXG4gICAgdGhpcy5kZWxpdmVyRXZlbnQoZXZlbnQpO1xuICB9XG5cbiAgLyoqXG4gICAqIERlbGl2ZXJzIGFuIGV2ZW50IHRvIGFsbCByZWdpc3RlcmVkIGRlc3RpbmF0aW9ucy5cbiAgICogQHBhcmFtIGV2ZW50IC0gVGhlIGxvZyBldmVudCB0byBkZWxpdmVyXG4gICAqL1xuICBwcml2YXRlIGRlbGl2ZXJFdmVudChldmVudDogTG9nRXZlbnQpOiB2b2lkIHtcbiAgICAvLyBEZWxpdmVyIHRvIGV2ZW50IGhhbmRsZXJzXG4gICAgY29uc3QgbGV2ZWxIYW5kbGVycyA9IHRoaXMuaGFuZGxlcnMuZ2V0KGV2ZW50LmxldmVsKTtcbiAgICBpZiAobGV2ZWxIYW5kbGVycykge1xuICAgICAgZm9yIChjb25zdCBoYW5kbGVyIG9mIGxldmVsSGFuZGxlcnMpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBoYW5kbGVyKGV2ZW50KTtcbiAgICAgICAgfSBjYXRjaCB7XG4gICAgICAgICAgLy8gU2lsZW50bHkgaWdub3JlIGhhbmRsZXIgZXJyb3JzIHRvIG5vdCBkaXNydXB0IGhvb2sgZXhlY3V0aW9uXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBXcml0ZSB0byBmaWxlIGlmIGNvbmZpZ3VyZWRcbiAgICB0aGlzLndyaXRlVG9GaWxlKGV2ZW50KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBXcml0ZXMgYW4gZXZlbnQgdG8gdGhlIGxvZyBmaWxlLlxuICAgKiBAcGFyYW0gZXZlbnQgLSBUaGUgbG9nIGV2ZW50IHRvIHdyaXRlXG4gICAqL1xuICBwcml2YXRlIHdyaXRlVG9GaWxlKGV2ZW50OiBMb2dFdmVudCk6IHZvaWQge1xuICAgIGlmICghdGhpcy5sb2dGaWxlUGF0aCkgcmV0dXJuO1xuXG4gICAgLy8gTGF6eSBpbml0aWFsaXphdGlvbiBvZiBmaWxlIGhhbmRsZVxuICAgIGlmICghdGhpcy5maWxlSW5pdGlhbGl6ZWQpIHtcbiAgICAgIHRoaXMuaW5pdGlhbGl6ZUZpbGUoKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5sb2dGaWxlRmQgPT09IG51bGwpIHJldHVybjtcblxuICAgIHRyeSB7XG4gICAgICBjb25zdCBsaW5lID0gYCR7SlNPTi5zdHJpbmdpZnkoZXZlbnQpfVxcbmA7XG4gICAgICB3cml0ZVN5bmModGhpcy5sb2dGaWxlRmQsIGxpbmUpO1xuICAgIH0gY2F0Y2gge1xuICAgICAgLy8gU2lsZW50bHkgaWdub3JlIGZpbGUgd3JpdGUgZXJyb3JzIHRvIG5vdCBkaXNydXB0IGhvb2sgZXhlY3V0aW9uXG4gICAgICAvLyBUaGlzIGZvbGxvd3MgdGhlIHJpc2sgbWl0aWdhdGlvbjogXCJHcmFjZWZ1bCBkZWdyYWRhdGlvbiAtIGxvZyB3cml0ZVxuICAgICAgLy8gZmFpbHVyZXMgYXJlIHNpbGVudGx5IGlnbm9yZWQgdG8gbm90IGRpc3J1cHQgaG9vayBleGVjdXRpb25cIlxuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBJbml0aWFsaXplcyB0aGUgbG9nIGZpbGUgZm9yIHdyaXRpbmcuXG4gICAqL1xuICBwcml2YXRlIGluaXRpYWxpemVGaWxlKCk6IHZvaWQge1xuICAgIHRoaXMuZmlsZUluaXRpYWxpemVkID0gdHJ1ZTtcblxuICAgIGlmICghdGhpcy5sb2dGaWxlUGF0aCkgcmV0dXJuO1xuXG4gICAgdHJ5IHtcbiAgICAgIC8vIEVuc3VyZSBkaXJlY3RvcnkgZXhpc3RzXG4gICAgICBjb25zdCBkaXIgPSBkaXJuYW1lKHRoaXMubG9nRmlsZVBhdGgpO1xuICAgICAgaWYgKCFleGlzdHNTeW5jKGRpcikpIHtcbiAgICAgICAgbWtkaXJTeW5jKGRpciwgeyByZWN1cnNpdmU6IHRydWUgfSk7XG4gICAgICB9XG5cbiAgICAgIC8vIE9wZW4gZmlsZSBmb3IgYXBwZW5kaW5nXG4gICAgICB0aGlzLmxvZ0ZpbGVGZCA9IG9wZW5TeW5jKHRoaXMubG9nRmlsZVBhdGgsICdhJyk7XG4gICAgfSBjYXRjaCB7XG4gICAgICAvLyBTaWxlbnRseSBpZ25vcmUgZmlsZSBpbml0aWFsaXphdGlvbiBlcnJvcnNcbiAgICAgIHRoaXMubG9nRmlsZUZkID0gbnVsbDtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogRXh0cmFjdHMgc3RydWN0dXJlZCBlcnJvciBpbmZvcm1hdGlvbiBmcm9tIGFuIHVua25vd24gZXJyb3IuXG4gICAqIEBwYXJhbSBlcnJvciAtIFRoZSBlcnJvciB0byBleHRyYWN0IGluZm9ybWF0aW9uIGZyb21cbiAgICogQHJldHVybnMgU3RydWN0dXJlZCBlcnJvciBpbmZvcm1hdGlvblxuICAgKi9cbiAgcHJpdmF0ZSBleHRyYWN0RXJyb3JJbmZvKGVycm9yOiB1bmtub3duKTogTG9nRXZlbnRFcnJvciB7XG4gICAgaWYgKGVycm9yIGluc3RhbmNlb2YgRXJyb3IpIHtcbiAgICAgIGNvbnN0IGluZm86IExvZ0V2ZW50RXJyb3IgPSB7XG4gICAgICAgIG5hbWU6IGVycm9yLm5hbWUsXG4gICAgICAgIG1lc3NhZ2U6IGVycm9yLm1lc3NhZ2UsXG4gICAgICAgIHN0YWNrOiBlcnJvci5zdGFja1xuICAgICAgfTtcblxuICAgICAgLy8gRXh0cmFjdCBjYXVzZSBjaGFpbiBpZiBwcmVzZW50XG4gICAgICBpZiAoZXJyb3IuY2F1c2UgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBpbmZvLmNhdXNlID0gdGhpcy5leHRyYWN0RXJyb3JJbmZvKGVycm9yLmNhdXNlKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIGluZm87XG4gICAgfVxuXG4gICAgLy8gSGFuZGxlIG5vbi1FcnJvciB2YWx1ZXNcbiAgICByZXR1cm4ge1xuICAgICAgbmFtZTogJ1Vua25vd25FcnJvcicsXG4gICAgICBtZXNzYWdlOiBTdHJpbmcoZXJyb3IpXG4gICAgfTtcbiAgfVxufVxuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBTaW5nbGV0b24gRXhwb3J0XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbi8qKlxuICogR2xvYmFsIGxvZ2dlciBpbnN0YW5jZSBmb3IgQ2FyZHMgRXh0ZW5zaW9uIGhvb2tzLlxuICpcbiAqIFVzZSB0aGlzIHNpbmdsZXRvbiBmb3IgYWxsIGxvZ2dpbmcgd2l0aGluIGhvb2tzLiBUaGUgbG9nZ2VyIGlzIGNvbmZpZ3VyZWRcbiAqIHZpYSBlbnZpcm9ubWVudCB2YXJpYWJsZXMgYW5kIHN1cHBvcnRzIGV2ZW50IHN1YnNjcmlwdGlvbiBmb3IgY3VzdG9tXG4gKiBkZXN0aW5hdGlvbnMuXG4gKlxuICogIyMgQ29uZmlndXJhdGlvblxuICpcbiAqIHwgRW52aXJvbm1lbnQgVmFyaWFibGUgfCBEZXNjcmlwdGlvbiB8XG4gKiB8LS0tLS0tLS0tLS0tLS0tLS0tLS0tfC0tLS0tLS0tLS0tLS18XG4gKiB8IGBDQVJEU19IT09LU19MT0dfRklMRWAgfCBQYXRoIHRvIGxvZyBmaWxlIChKU09OIExpbmVzIGZvcm1hdCkgfFxuICpcbiAqICMjIFVzYWdlIGluIEhvb2tzXG4gKlxuICogVGhlIGxvZ2dlciBjYW4gYmUgdXNlZCBkaXJlY3RseSB3aXRoaW4gaG9vayBoYW5kbGVyczpcbiAqXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBpbXBvcnQgeyBsb2dnZXIgfSBmcm9tICdAY2FyZHMvc2RrL2NvbmZpZyc7XG4gKlxuICogLy8gSW4gYSBob29rIGhhbmRsZXJcbiAqIGxvZ2dlci53YXJuKCdUYXNrIHN0YXJ0aW5nIGluIGludGVyYWN0aXZlIG1vZGUnKTtcbiAqIGBgYFxuICpcbiAqICMjIEV4dGVybmFsIEludGVncmF0aW9uXG4gKlxuICogU3Vic2NyaWJlIHRvIGV2ZW50cyB0byBmb3J3YXJkIGxvZ3MgdG8gZXh0ZXJuYWwgc3lzdGVtczpcbiAqXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBpbXBvcnQgeyBsb2dnZXIgfSBmcm9tICdAY2FyZHMvc2RrL2NvbmZpZyc7XG4gKiBpbXBvcnQgcGlubyBmcm9tICdwaW5vJztcbiAqXG4gKiBjb25zdCBwaW5vTG9nZ2VyID0gcGlubyh7IGxldmVsOiAnZGVidWcnIH0pO1xuICpcbiAqIGxvZ2dlci5vbignZGVidWcnLCAoZXZlbnQpID0+IHBpbm9Mb2dnZXIuZGVidWcoZXZlbnQsIGV2ZW50Lm1lc3NhZ2UpKTtcbiAqIGxvZ2dlci5vbignaW5mbycsIChldmVudCkgPT4gcGlub0xvZ2dlci5pbmZvKGV2ZW50LCBldmVudC5tZXNzYWdlKSk7XG4gKiBsb2dnZXIub24oJ3dhcm4nLCAoZXZlbnQpID0+IHBpbm9Mb2dnZXIud2FybihldmVudCwgZXZlbnQubWVzc2FnZSkpO1xuICogbG9nZ2VyLm9uKCdlcnJvcicsIChldmVudCkgPT4gcGlub0xvZ2dlci5lcnJvcihldmVudCwgZXZlbnQubWVzc2FnZSkpO1xuICogYGBgXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogLy8gRGlyZWN0IHVzYWdlXG4gKiBpbXBvcnQgeyBsb2dnZXIgfSBmcm9tICdAY2FyZHMvc2RrL2NvbmZpZyc7XG4gKlxuICogbG9nZ2VyLmluZm8oJ1N0YXJ0aW5nIG9wZXJhdGlvbicpO1xuICogbG9nZ2VyLndhcm4oJ1Jlc291cmNlIGxpbWl0IGFwcHJvYWNoaW5nJywgeyB1c2FnZTogMC45IH0pO1xuICpcbiAqIHRyeSB7XG4gKiAgIGF3YWl0IHJpc2t5T3BlcmF0aW9uKCk7XG4gKiB9IGNhdGNoIChlcnIpIHtcbiAqICAgbG9nZ2VyLmxvZ0Vycm9yKGVyciwgJ1Jpc2t5IG9wZXJhdGlvbiBmYWlsZWQnKTtcbiAqIH1cbiAqIGBgYFxuICovXG5leHBvcnQgY29uc3QgbG9nZ2VyID0gbmV3IExvZ2dlcigpO1xuIiwgIi8qKlxuICogT3V0cHV0IGJ1aWxkZXJzIGFuZCBydW50aW1lIGV4ZWN1dG9yIGZvciBjdXN0b20gdHlwZSB2YWxpZGF0b3JzLlxuICpcbiAqIFZhbGlkYXRvcnMgcnVuIGFzIGEgZmlsZS1wYXRoIHByb3RvY29sOiB0aGV5IHJlYWQgRklMRV9QQVRIIGZyb20gdGhlXG4gKiBlbnZpcm9ubWVudCwgb3B0aW9uYWxseSBsb2FkIGEgYC5tZXRhLmpzb25gIHNpZGVjYXIsIGFuZCB3cml0ZSBhXG4gKiBgVmFsaWRhdGlvblJlc3VsdGAgSlNPTiBvYmplY3QgdG8gc3Rkb3V0LiBUaGlzIG1vZHVsZSBwcm92aWRlc1xuICogcmVzdWx0IGhlbHBlcnMgYW5kIHRoZSBydW50aW1lIGV4ZWN1dG9yLlxuICpcbiAqIEBzdW1tYXJ5IE91dHB1dCBidWlsZGVycyBhbmQgcnVudGltZSBleGVjdXRvciBmb3IgY3VzdG9tIHR5cGUgdmFsaWRhdG9yc1xuICogQG1vZHVsZVxuICovXG5cbmltcG9ydCB7IHJlYWRGaWxlU3luYyB9IGZyb20gJ25vZGU6ZnMnO1xuaW1wb3J0IHR5cGUgeyBWYWxpZGF0aW9uUmVzdWx0IH0gZnJvbSAnLi4vcHJvdG9jb2wvaW5kZXguanMnO1xuaW1wb3J0IHR5cGUgeyBUeXBlVmFsaWRhdG9yQ29tbWFuZCB9IGZyb20gJy4vY29tbWFuZC10eXBlcy5qcyc7XG5pbXBvcnQge1xuICBDQVJEU19FTlZfVkFSUyxcbiAgZ2V0QXBpQWNjZXNzVG9rZW4sXG4gIGdldEFwaUJhc2VVcmwsXG4gIGdldENhcmRJZCxcbiAgZ2V0RW52aXJvbm1lbnQsXG4gIGdldEZpbGVOYW1lLFxuICBnZXRUeXBlTmFtZSxcbiAgZ2V0VHlwZVZlcnNpb25cbn0gZnJvbSAnLi9lbnYuanMnO1xuaW1wb3J0IHR5cGUgeyBUeXBlVmFsaWRhdG9yQ29udGV4dCwgVmFsaWRhdG9yRmlsZVJlcXVlc3QgfSBmcm9tICcuL2lucHV0cy5qcyc7XG5pbXBvcnQgeyBMb2dnZXIgfSBmcm9tICcuL2xvZ2dlci5qcyc7XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIE91dHB1dCBCdWlsZGVyc1xuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4vKipcbiAqIENyZWF0ZXMgYSBzdWNjZXNzZnVsIHZhbGlkYXRpb24gcmVzdWx0LlxuICpcbiAqIFVzZSB3aGVuIHZhbGlkYXRpb24gcGFzc2VzLiBPcHRpb25hbGx5IGluY2x1ZGUgbWV0YWRhdGEgdG8gc3RvcmUgaW4gdGhlXG4gKiBgLm1ldGEuanNvbmAgc2lkZWNhciBmaWxlLlxuICogQHBhcmFtIG1ldGFkYXRhIC0gT3B0aW9uYWwgbWV0YWRhdGEgdG8gc3RvcmUgaW4gLm1ldGEuanNvblxuICogQHJldHVybnMgVmFsaWRhdGlvblJlc3VsdCB3aXRoIGB2YWxpZDogdHJ1ZWBcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiByZXR1cm4gdmFsaWRhdGlvblN1Y2Nlc3MoeyB2ZXJzaW9uOiAnMS4wJywgY2hlY2tzdW06ICdhYmMxMjMnIH0pO1xuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB2YWxpZGF0aW9uU3VjY2VzcyhtZXRhZGF0YT86IFJlY29yZDxzdHJpbmcsIHVua25vd24+KTogVmFsaWRhdGlvblJlc3VsdCB7XG4gIGlmIChtZXRhZGF0YSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgcmV0dXJuIHsgdmFsaWQ6IHRydWUsIG1ldGFkYXRhIH07XG4gIH1cbiAgcmV0dXJuIHsgdmFsaWQ6IHRydWUgfTtcbn1cblxuLyoqXG4gKiBDcmVhdGVzIGEgZmFpbGVkIHZhbGlkYXRpb24gcmVzdWx0LlxuICpcbiAqIFVzZSB3aGVuIHZhbGlkYXRpb24gZmFpbHMuIEVycm9ycyBhcmUgbWFya2Rvd24tZm9ybWF0dGVkIHN0cmluZ3Mgc3VyZmFjZWRcbiAqIHRvIHRoZSBnaXQgY2xpZW50LlxuICogQHBhcmFtIGVycm9ycyAtIEFycmF5IG9mIG1hcmtkb3duLWZvcm1hdHRlZCBlcnJvciBtZXNzYWdlc1xuICogQHJldHVybnMgVmFsaWRhdGlvblJlc3VsdCB3aXRoIGB2YWxpZDogZmFsc2VgXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogcmV0dXJuIHZhbGlkYXRpb25FcnJvcihbXG4gKiAgICcqKm5hbWUqKiBmaWVsZCBpcyByZXF1aXJlZCcsXG4gKiAgICdgYWdlYCBtdXN0IGJlIGEgcG9zaXRpdmUgbnVtYmVyJ1xuICogXSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHZhbGlkYXRpb25FcnJvcihlcnJvcnM6IHN0cmluZ1tdKTogVmFsaWRhdGlvblJlc3VsdCB7XG4gIHJldHVybiB7IHZhbGlkOiBmYWxzZSwgZXJyb3JzIH07XG59XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIFJ1bnRpbWUgRXhlY3V0aW9uXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbi8qKlxuICogRXhlY3V0ZXMgYSB0eXBlIHZhbGlkYXRvciBjb21tYW5kIHdpdGggZmlsZS1wYXRoIHByb3RvY29sLlxuICpcbiAqIFJlYWRzIHRoZSBmaWxlIHBhdGggZnJvbSB0aGUgYEZJTEVfUEFUSGAgZW52aXJvbm1lbnQgdmFyaWFibGUsIGxvYWRzIHRoZVxuICogYC5tZXRhLmpzb25gIHNpZGVjYXIgaWYgcHJlc2VudCwgZXh0cmFjdHMgdHlwZSBjb250ZXh0IGZyb20gZW52aXJvbm1lbnRcbiAqIHZhcmlhYmxlcywgaW52b2tlcyB0aGUgdmFsaWRhdGlvbiBoYW5kbGVyLCBhbmQgd3JpdGVzIHRoZSBKU09OIHJlc3VsdFxuICogdG8gc3Rkb3V0LiBBbHdheXMgZXhpdHMgd2l0aCBjb2RlIDAgZm9yIGFsbCBjYXNlcy5cbiAqXG4gKiAjIyBQcm90b2NvbFxuICpcbiAqIC0gKipJbnB1dCoqOiBgRklMRV9QQVRIYCBlbnZpcm9ubWVudCB2YXJpYWJsZSBwb2ludGluZyB0byB0aGUgZmlsZVxuICogLSAqKlNpZGVjYXIqKjogYHtGSUxFX1BBVEh9Lm1ldGEuanNvbmAgcGFyc2VkIGFzIG1ldGFkYXRhIGlmIHByZXNlbnRcbiAqIC0gKipFbnZpcm9ubWVudCoqOiBUeXBlIG1ldGFkYXRhIGZyb20gZW52aXJvbm1lbnQgdmFyaWFibGVzXG4gKiAtICoqT3V0cHV0Kio6IGBWYWxpZGF0aW9uUmVzdWx0YCBKU09OIG9uIHN0ZG91dFxuICogLSAqKkV4aXQgQ29kZSoqOiAwIGZvciBhbGwgY2FzZXNcbiAqXG4gKiAjIyBFcnJvciBIYW5kbGluZ1xuICpcbiAqIHwgRXJyb3IgVHlwZSB8IE91dHB1dCB8IEV4aXQgQ29kZSB8XG4gKiB8LS0tLS0tLS0tLS0tfC0tLS0tLS0tfC0tLS0tLS0tLS0tfFxuICogfCBNaXNzaW5nIEZJTEVfUEFUSCB8IGB7IHZhbGlkOiBmYWxzZSwgZXJyb3JzOiBbLi4uXSB9YCB8IDAgfFxuICogfCBWYWxpZGF0aW9uIGZhaWx1cmUgfCBgeyB2YWxpZDogZmFsc2UsIGVycm9yczogWy4uLl0gfWAgfCAwIHxcbiAqIHwgSGFuZGxlciBleGNlcHRpb24gfCBgeyB2YWxpZDogZmFsc2UsIGVycm9yczogWy4uLl0gfWAgfCAwIHxcbiAqIHwgVmFsaWRhdGlvbiBzdWNjZXNzIHwgYHsgdmFsaWQ6IHRydWUsIC4uLiB9YCB8IDAgfFxuICpcbiAqIEBwYXJhbSB2YWxpZGF0aW9uIC0gVGhlIHR5cGUgdmFsaWRhdG9yIGNvbW1hbmQgdG8gZXhlY3V0ZVxuICogQHJldHVybnMgQSBwcm9taXNlIHRoYXQgcmVzb2x2ZXMgb25seSBpZiBwcm9jZXNzLmV4aXQgaXMgbW9ja2VkXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogLy8gdmFsaWRhdG9yLm1qc1xuICogaW1wb3J0IHsgcmVhZEZpbGVTeW5jIH0gZnJvbSAnbm9kZTpmcyc7XG4gKiBpbXBvcnQgeyBkZWZpbmVUeXBlVmFsaWRhdG9yLCBleGVjdXRlVmFsaWRhdGlvbiwgdmFsaWRhdGlvblN1Y2Nlc3MgfSBmcm9tICdAY2FyZHMvc2RrL2NvbmZpZyc7XG4gKlxuICogY29uc3QgdmFsaWRhdGUgPSBkZWZpbmVUeXBlVmFsaWRhdG9yKFxuICogICB7IHR5cGVOYW1lOiAnbm90ZScsIHRpbWVvdXQ6IDMwMDAwIH0sXG4gKiAgIChyZXF1ZXN0LCBjb250ZXh0KSA9PiB7XG4gKiAgICAgY29udGV4dC5sb2dnZXIuaW5mbygnVmFsaWRhdGluZyBmaWxlJywgeyBwYXRoOiByZXF1ZXN0LmZpbGVQYXRoIH0pO1xuICogICAgIGNvbnN0IGNvbnRlbnQgPSByZWFkRmlsZVN5bmMocmVxdWVzdC5maWxlUGF0aCwgJ3V0Zi04Jyk7XG4gKiAgICAgLy8gLi4uIHZhbGlkYXRpb24gbG9naWNcbiAqICAgICByZXR1cm4gdmFsaWRhdGlvblN1Y2Nlc3MoKTtcbiAqICAgfVxuICogKTtcbiAqXG4gKiBleGVjdXRlVmFsaWRhdGlvbih2YWxpZGF0ZSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGV4ZWN1dGVWYWxpZGF0aW9uKHZhbGlkYXRpb246IFR5cGVWYWxpZGF0b3JDb21tYW5kKTogUHJvbWlzZTx2b2lkPiB7XG4gIGNvbnN0IGxvZ2dlciA9IG5ldyBMb2dnZXIoKTtcblxuICB0cnkge1xuICAgIC8vIFJlYWQgRklMRV9QQVRIIGZyb20gZW52aXJvbm1lbnRcbiAgICBjb25zdCBmaWxlUGF0aCA9IHByb2Nlc3MuZW52W0NBUkRTX0VOVl9WQVJTLkZJTEVfUEFUSF07XG4gICAgaWYgKCFmaWxlUGF0aCkge1xuICAgICAgcHJvY2Vzcy5zdGRvdXQud3JpdGUoSlNPTi5zdHJpbmdpZnkoeyB2YWxpZDogZmFsc2UsIGVycm9yczogWydGSUxFX1BBVEggZW52aXJvbm1lbnQgdmFyaWFibGUgaXMgbm90IHNldCddIH0pKTtcbiAgICAgIHJldHVybiBwcm9jZXNzLmV4aXQoMCk7XG4gICAgfVxuXG4gICAgLy8gTG9vayBmb3IgLm1ldGEuanNvbiBzaWRlY2FyXG4gICAgbGV0IG1ldGFkYXRhOiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPiB8IHVuZGVmaW5lZDtcbiAgICB0cnkge1xuICAgICAgY29uc3Qgc2lkZWNhckNvbnRlbnQgPSByZWFkRmlsZVN5bmMoYCR7ZmlsZVBhdGh9Lm1ldGEuanNvbmAsICd1dGYtOCcpO1xuICAgICAgbWV0YWRhdGEgPSBKU09OLnBhcnNlKHNpZGVjYXJDb250ZW50KSBhcyBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPjtcbiAgICB9IGNhdGNoIHtcbiAgICAgIC8vIFNpZGVjYXIgZG9lc24ndCBleGlzdCBvciBpcyBpbnZhbGlkIC0gbWV0YWRhdGEgc3RheXMgdW5kZWZpbmVkXG4gICAgfVxuXG4gICAgLy8gQnVpbGQgVmFsaWRhdG9yRmlsZVJlcXVlc3RcbiAgICBjb25zdCByZXF1ZXN0OiBWYWxpZGF0b3JGaWxlUmVxdWVzdCA9IHtcbiAgICAgIGZpbGVQYXRoLFxuICAgICAgbWV0YWRhdGFcbiAgICB9O1xuXG4gICAgLy8gRXh0cmFjdCB0eXBlIGNvbnRleHQgZnJvbSBlbnZpcm9ubWVudCB2YXJpYWJsZXNcbiAgICBjb25zdCBjb250ZXh0OiBUeXBlVmFsaWRhdG9yQ29udGV4dCA9IHtcbiAgICAgIGxvZ2dlcixcbiAgICAgIGN3ZDogcHJvY2Vzcy5jd2QoKSxcbiAgICAgIHR5cGVOYW1lOiBnZXRUeXBlTmFtZSgpLFxuICAgICAgdHlwZVZlcnNpb246IGdldFR5cGVWZXJzaW9uKCksXG4gICAgICBmaWxlTmFtZTogZ2V0RmlsZU5hbWUoKSxcbiAgICAgIGNhcmRJZDogZ2V0Q2FyZElkKCksXG4gICAgICBlbnZpcm9ubWVudDogZ2V0RW52aXJvbm1lbnQoKSxcbiAgICAgIGFwaUJhc2VVcmw6IGdldEFwaUJhc2VVcmwoKSxcbiAgICAgIGFwaUFjY2Vzc1Rva2VuOiBnZXRBcGlBY2Nlc3NUb2tlbigpXG4gICAgfTtcblxuICAgIC8vIEV4ZWN1dGUgaGFuZGxlclxuICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHZhbGlkYXRpb24ocmVxdWVzdCwgY29udGV4dCk7XG5cbiAgICAvLyBXcml0ZSByZXN1bHRcbiAgICBwcm9jZXNzLnN0ZG91dC53cml0ZShKU09OLnN0cmluZ2lmeShyZXN1bHQpKTtcbiAgICBwcm9jZXNzLmV4aXQoMCk7XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgLy8gVW5oYW5kbGVkIGVycm9yIC0gcmV0dXJuIGZhaWx1cmUgcmVzdWx0XG4gICAgY29uc3QgZXJyb3JNZXNzYWdlID0gZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiBTdHJpbmcoZXJyb3IpO1xuICAgIGxvZ2dlci5lcnJvcignVmFsaWRhdGlvbiBlcnJvcicsIHsgZXJyb3I6IGVycm9yTWVzc2FnZSB9KTtcbiAgICBwcm9jZXNzLnN0ZG91dC53cml0ZShKU09OLnN0cmluZ2lmeSh7IHZhbGlkOiBmYWxzZSwgZXJyb3JzOiBbZXJyb3JNZXNzYWdlXSB9KSk7XG4gICAgcHJvY2Vzcy5leGl0KDApO1xuICB9XG59XG4iLCAiXG5pbXBvcnQgaGFuZGxlciBmcm9tICcuL2FkYXB0aXZlLWNhcmQtdmFsaWRhdG9yLnRzJztcbmltcG9ydCB7IGV4ZWN1dGVWYWxpZGF0aW9uIH0gZnJvbSAnLi4vLi4vLi4vc2RrL3NyYy9jb25maWcvdmFsaWRhdGlvbi50cyc7XG5cbmV4ZWN1dGVWYWxpZGF0aW9uKGhhbmRsZXIpO1xuIl0sCiAgIm1hcHBpbmdzIjogIjs7Ozs7Ozs7QUFZQSxTQUFTLGdCQUFBQSxxQkFBb0I7OztBQ2dHdEIsU0FBUyxvQkFDZCxRQUNBLFNBQ3FDO0FBQ3JDLFFBQU0sS0FBSyxPQUFPLFNBQStCLFlBQTZEO0FBQzVHLFdBQU8sTUFBTSxRQUFRLFFBQVEsUUFBUSxTQUFTLE9BQU8sQ0FBQztBQUFBLEVBQ3hEO0FBRUEsU0FBTyxPQUFPLE9BQU8sSUFBSTtBQUFBLElBQ3ZCLGFBQWE7QUFBQSxJQUNiLFVBQVUsT0FBTztBQUFBLElBQ2pCLFNBQVMsT0FBTztBQUFBLElBQ2hCLFlBQVksT0FBTztBQUFBLElBQ25CLFFBQVEsT0FBTztBQUFBLElBQ2YsYUFBYSxPQUFPO0FBQUEsRUFDdEIsQ0FBQztBQUNIOzs7QUM1R0EsU0FBUyxvQkFBb0I7QUFjdEIsSUFBTSxpQkFBaUI7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBSzVCLFNBQVM7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBTVQsYUFBYTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFNYixhQUFhO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBT2IsZ0JBQWdCO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQU1oQixjQUFjO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQU1kLGtCQUFrQjtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQU9sQixjQUFjO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQU1kLFdBQVc7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBTVgsY0FBYztBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFNZCxXQUFXO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQU1YLFdBQVc7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBTVgsV0FBVztBQUFBO0FBQUE7QUFB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O0FBR2xFLHdCQUFzQixjQUFjLFdBQVcsbUJBQW1CLE1BQU07QUFDMUU7QUFRQSxJQUFPLGtDQUFRO0FBQUEsRUFDYjtBQUFBLElBQ0UsVUFBVTtBQUFBLElBQ1YsUUFBUTtBQUFBLElBQ1IsYUFBYTtBQUFBLElBQ2IsU0FBUztBQUFBLEVBQ1g7QUFBQSxFQUNBLE9BQU8sU0FBUyxZQUFZO0FBQzFCLFVBQU0sU0FBcUIsQ0FBQztBQUU1QixZQUFRLE9BQU8sS0FBSyw0QkFBNEIsRUFBRSxVQUFVLFFBQVEsU0FBUyxDQUFDO0FBRzlFLFFBQUk7QUFDSixRQUFJO0FBQ0YsWUFBTSxVQUFVRSxjQUFhLFFBQVEsVUFBVSxPQUFPO0FBQ3RELGFBQU8sS0FBSyxNQUFNLE9BQU87QUFBQSxJQUMzQixRQUFRO0FBQ04sYUFBTyxnQkFBZ0IsQ0FBQyw4QkFBOEIsQ0FBQztBQUFBLElBQ3pEO0FBR0EsMkJBQXVCLE1BQU0sTUFBTSxNQUFNO0FBR3pDLDJCQUF1QixNQUFNLFdBQVcsTUFBTTtBQUM5QyxRQUFJLE9BQU8sS0FBSyxZQUFZLFlBQVksS0FBSyxRQUFRLFNBQVMsb0JBQW9CO0FBQ2hGLGFBQU8sS0FBSztBQUFBLFFBQ1YsTUFBTTtBQUFBLFFBQ04sU0FBUywyQkFBMkIsa0JBQWtCO0FBQUEsUUFDdEQsT0FBTztBQUFBLE1BQ1QsQ0FBQztBQUFBLElBQ0g7QUFHQSwyQkFBdUIsTUFBTSxVQUFVLE1BQU07QUFHN0MsUUFBSSxLQUFLLFlBQVksVUFBYSxLQUFLLFlBQVksTUFBTTtBQUN2RCxhQUFPLEtBQUssRUFBRSxNQUFNLFlBQVksU0FBUyx1QkFBdUIsT0FBTyxVQUFVLENBQUM7QUFBQSxJQUNwRixXQUFXLENBQUMsU0FBUyxLQUFLLE9BQU8sR0FBRztBQUNsQyxhQUFPLEtBQUssRUFBRSxNQUFNLGdCQUFnQixTQUFTLDZCQUE2QixPQUFPLFVBQVUsQ0FBQztBQUFBLElBQzlGLE9BQU87QUFDTCxpQ0FBMkIsS0FBSyxTQUFTLE1BQU07QUFBQSxJQUNqRDtBQUVBLFFBQUksT0FBTyxTQUFTLEdBQUc7QUFDckIsYUFBTyxnQkFBZ0IsT0FBTyxJQUFJLENBQUMsTUFBTyxFQUFFLFFBQVEsS0FBSyxFQUFFLEtBQUssT0FBTyxFQUFFLE9BQU8sS0FBSyxFQUFFLE9BQVEsQ0FBQztBQUFBLElBQ2xHO0FBRUEsWUFBUSxPQUFPLEtBQUssc0NBQXNDO0FBQUEsTUFDeEQsUUFBUSxLQUFLO0FBQUEsTUFDYixRQUFRLEtBQUs7QUFBQSxJQUNmLENBQUM7QUFFRCxXQUFPLGtCQUFrQixFQUFFLFFBQVEsS0FBSyxHQUFhLENBQUM7QUFBQSxFQUN4RDtBQUNGOzs7QUs1SkEsa0JBQWtCLCtCQUFPOyIsCiAgIm5hbWVzIjogWyJyZWFkRmlsZVN5bmMiLCAicmVhZEZpbGVTeW5jIiwgImxvZ2dlciIsICJyZWFkRmlsZVN5bmMiLCAicmVhZEZpbGVTeW5jIl0KfQo=
