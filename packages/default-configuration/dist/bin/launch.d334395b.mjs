import { createRequire as __createRequire } from 'node:module';
const require = __createRequire(import.meta.url);

if (!process.env['CARDS_HOOKS_LOG_FILE']) {
  process.env['CARDS_HOOKS_LOG_FILE'] = "/workspace/.worktrees/cards/main-84/1/public/packages/default-configuration/.cards/logs/cards-default-configuration-hooks.log";
}

// src/actions/launch.ts
import { randomUUID } from "node:crypto";

// ../sdk/src/config/factories/action.ts
function defineAction(config, handler) {
  const fn = async (input, context) => {
    await handler(input, context);
  };
  fn.factoryType = "action";
  fn.id = config.id;
  fn.actionName = config.actionName;
  fn.description = config.description;
  fn.icon = config.icon;
  fn.supportsBackgroundMode = config.supportsBackgroundMode;
  fn.allowConcurrent = config.allowConcurrent;
  fn.timeout = config.timeout;
  fn.sourcePath = config.sourcePath;
  return fn;
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
function getActionName() {
  const value = process.env[CARDS_ENV_VARS.ACTION_NAME];
  if (value === void 0 || value === "") {
    throw new Error(`Missing required environment variable: ${CARDS_ENV_VARS.ACTION_NAME}`);
  }
  return value;
}
function getExecutionMode() {
  const value = process.env[CARDS_ENV_VARS.EXECUTION_MODE];
  if (value === void 0 || value === "") {
    throw new Error(`Missing required environment variable: ${CARDS_ENV_VARS.EXECUTION_MODE}`);
  }
  if (value !== "interactive" && value !== "background") {
    throw new Error(`Invalid ${CARDS_ENV_VARS.EXECUTION_MODE}: expected 'interactive' or 'background', got "${value}"`);
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
function getCodingAgent() {
  const value = process.env[CARDS_ENV_VARS.CODING_AGENT];
  if (value === void 0 || value === "") {
    return void 0;
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
function getFilePath() {
  const value = process.env[CARDS_ENV_VARS.FILE_PATH];
  if (value === void 0 || value === "") {
    throw new Error(`Missing required environment variable: ${CARDS_ENV_VARS.FILE_PATH}`);
  }
  return value;
}
function getFileSize() {
  const value = process.env[CARDS_ENV_VARS.FILE_SIZE];
  if (value === void 0 || value === "") {
    throw new Error(`Missing required environment variable: ${CARDS_ENV_VARS.FILE_SIZE}`);
  }
  const size = Number.parseInt(value, 10);
  if (Number.isNaN(size)) {
    throw new Error(`Invalid ${CARDS_ENV_VARS.FILE_SIZE}: expected number, got "${value}"`);
  }
  return size;
}
function getSha256() {
  const value = process.env[CARDS_ENV_VARS.SHA256];
  if (value === void 0 || value === "") {
    throw new Error(`Missing required environment variable: ${CARDS_ENV_VARS.SHA256}`);
  }
  return value;
}
function getContentType() {
  const value = process.env[CARDS_ENV_VARS.CONTENT_TYPE];
  if (value === void 0 || value === "") {
    throw new Error(`Missing required environment variable: ${CARDS_ENV_VARS.CONTENT_TYPE}`);
  }
  return value;
}
function getSwitchToInteractiveDataPath() {
  const value = process.env[CARDS_ENV_VARS.SWITCH_TO_INTERACTIVE_DATA_PATH];
  if (value === void 0 || value === "") {
    return void 0;
  }
  return value;
}
function getConfigPath() {
  const value = process.env[CARDS_ENV_VARS.CONFIG_PATH];
  if (value === void 0 || value === "") {
    throw new Error(`Missing required environment variable: ${CARDS_ENV_VARS.CONFIG_PATH}`);
  }
  return value;
}
function getRepoRoot() {
  const value = process.env[CARDS_ENV_VARS.REPO_ROOT];
  if (value === void 0 || value === "") {
    throw new Error(`Missing required environment variable: ${CARDS_ENV_VARS.REPO_ROOT}`);
  }
  return value;
}
function getCardRepoPath() {
  const value = process.env[CARDS_ENV_VARS.CARD_REPO_PATH];
  if (value === void 0 || value === "") {
    throw new Error(`Missing required environment variable: ${CARDS_ENV_VARS.CARD_REPO_PATH}`);
  }
  return value;
}
function getExtensionPath() {
  const value = process.env[CARDS_ENV_VARS.EXTENSION_PATH];
  if (value === void 0 || value === "") {
    throw new Error(`Missing required environment variable: ${CARDS_ENV_VARS.EXTENSION_PATH}`);
  }
  return value;
}
function readSwitchToInteractiveData() {
  const dataPath = getSwitchToInteractiveDataPath();
  if (dataPath === void 0) {
    return void 0;
  }
  const content = readFileSync(dataPath, "utf-8");
  return JSON.parse(content);
}
function extractActionInput() {
  return {
    cardId: getCardId(),
    actionName: getActionName(),
    environment: getEnvironment(),
    executionMode: getExecutionMode(),
    apiBaseUrl: getApiBaseUrl(),
    apiAccessToken: getApiAccessToken(),
    codingAgent: getCodingAgent(),
    switchToInteractiveData: readSwitchToInteractiveData(),
    repoRoot: getRepoRoot(),
    cardRepoPath: getCardRepoPath(),
    configPath: getConfigPath(),
    extensionPath: getExtensionPath()
  };
}
function extractTypeInput() {
  return {
    cardId: getCardId(),
    environment: getEnvironment(),
    typeName: getTypeName(),
    typeVersion: getTypeVersion(),
    fileName: getFileName(),
    filePath: getFilePath(),
    fileSize: getFileSize(),
    fileSha256: getSha256(),
    contentType: getContentType(),
    apiBaseUrl: getApiBaseUrl(),
    apiAccessToken: getApiAccessToken()
  };
}

// ../sdk/src/config/exit-codes.ts
var EXIT_CODES = {
  /** Handler completed successfully. */
  SUCCESS: 0,
  /** Handler threw an error. */
  ERROR: 1,
  /** Handler processed switchToInteractive and is exiting for relaunch. */
  SWITCH_TO_INTERACTIVE: 42
};
function writeError(message) {
  process.stderr.write(`${message}
`);
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

// ../sdk/src/config/socket-client.ts
import * as net from "node:net";
var SocketClient = class _SocketClient {
  socket;
  buffer = "";
  commandHandler;
  constructor(socket) {
    this.socket = socket;
    socket.on("data", (chunk) => {
      this.buffer += chunk.toString();
      const lines = this.buffer.split("\n");
      this.buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (line.trim() === "") continue;
        try {
          const parsed = JSON.parse(line);
          this.commandHandler?.(parsed);
        } catch {
        }
      }
    });
  }
  /**
   * Connect to a Unix domain socket at the given path.
   *
   * @param socketPath - Path to the Unix domain socket
   * @returns A connected SocketClient instance
   * @throws Error if the connection fails
   */
  static connect(socketPath) {
    return new Promise((resolve2, reject) => {
      const socket = net.createConnection(socketPath, () => {
        resolve2(new _SocketClient(socket));
      });
      socket.on("error", reject);
    });
  }
  /**
   * Register a handler for incoming socket commands.
   *
   * Only one handler can be registered at a time. Subsequent calls replace
   * the previous handler.
   *
   * @param handler - Function to call when a command is received
   */
  onCommand(handler) {
    this.commandHandler = handler;
  }
  /**
   * Send a response back to the ActionDispatcher.
   *
   * @param response - The response to send as NDJSON
   */
  sendResponse(response) {
    this.socket.write(`${JSON.stringify(response)}
`);
  }
  /**
   * Send a response and call callback when flushed.
   *
   * Used to guarantee flush before process.exit.
   *
   * @param response - The response to send as NDJSON
   * @param callback - Called after the data is flushed to the socket
   */
  sendResponseThen(response, callback) {
    this.socket.write(`${JSON.stringify(response)}
`, callback);
  }
  /**
   * Close the socket connection.
   */
  close() {
    this.socket.destroy();
  }
};

// ../sdk/src/config/runtime.ts
function getErrorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}
function cleanupAndExit(exitCode) {
  logger.clearContext();
  logger.close();
  process.exit(exitCode);
}
function handleEnvExtractionError(error) {
  const message = getErrorMessage(error);
  logger.error(`Failed to extract input from environment: ${message}`);
  writeError(`Handler failed: ${message}`);
  cleanupAndExit(EXIT_CODES.ERROR);
}
function handleHandlerError(error) {
  const errorOutput = error instanceof Error ? error.stack ?? error.message : String(error);
  process.stderr.write(`${errorOutput}
`);
  logger.error(`Handler error: ${getErrorMessage(error)}`);
  cleanupAndExit(EXIT_CODES.ERROR);
}
async function executeCommand(command) {
  try {
    let input;
    try {
      if (command.factoryType === "action") {
        input = extractActionInput();
      } else {
        input = extractTypeInput();
      }
    } catch (error) {
      return handleEnvExtractionError(error);
    }
    logger.setContext(command.factoryType, { ...input });
    if (command.factoryType === "action") {
      let socketClient;
      const socketPath = process.env[CARDS_ENV_VARS.SOCKET_PATH];
      if (socketPath) {
        try {
          socketClient = await SocketClient.connect(socketPath);
        } catch (error) {
          logger.warn(`Failed to connect to socket at ${socketPath}: ${getErrorMessage(error)}`);
        }
      }
      let cancelCallback;
      let switchToInteractiveCallback;
      let commandProcessed = false;
      const context = {
        logger,
        cwd: process.cwd(),
        onCancel: (callback) => {
          cancelCallback = callback;
        },
        onSwitchToInteractive: (callback) => {
          switchToInteractiveCallback = callback;
        }
      };
      if (socketClient) {
        socketClient.onCommand((cmd) => {
          if (commandProcessed) return;
          commandProcessed = true;
          if (cmd.type === "cancel") {
            handleCancelCommand(cancelCallback, socketClient);
          } else if (cmd.type === "switchToInteractive") {
            handleSwitchToInteractiveCommand(switchToInteractiveCallback, socketClient);
          }
        });
      }
      try {
        await command(input, context);
      } catch (error) {
        socketClient?.close();
        return handleHandlerError(error);
      }
      socketClient?.close();
      cleanupAndExit(EXIT_CODES.SUCCESS);
    } else {
      const context = {
        logger,
        cwd: process.cwd()
      };
      try {
        await command(input, context);
      } catch (error) {
        return handleHandlerError(error);
      }
      cleanupAndExit(EXIT_CODES.SUCCESS);
    }
  } catch (error) {
    logger.error(`Unexpected runtime error: ${getErrorMessage(error)}`);
    cleanupAndExit(EXIT_CODES.ERROR);
  }
}
function toPromise(result) {
  if (result && typeof result.then === "function") {
    return result;
  }
  return Promise.resolve(result);
}
function handleCancelCommand(callback, socketClient) {
  if (!callback) {
    process.kill(process.pid, "SIGTERM");
    return;
  }
  toPromise(callback()).then(
    () => {
      socketClient?.close();
      cleanupAndExit(EXIT_CODES.ERROR);
    },
    () => {
      socketClient?.close();
      cleanupAndExit(EXIT_CODES.ERROR);
    }
  );
}
function handleSwitchToInteractiveCommand(callback, socketClient) {
  if (!callback) {
    return;
  }
  toPromise(callback()).then(
    (data) => {
      socketClient.sendResponseThen({ type: "switchToInteractiveResponse", data }, () => {
        cleanupAndExit(EXIT_CODES.SWITCH_TO_INTERACTIVE);
      });
    },
    (error) => {
      logger.error(`switchToInteractive callback error: ${getErrorMessage(error)}`);
      socketClient.close();
      cleanupAndExit(EXIT_CODES.ERROR);
    }
  );
}

// src/lib/claude-session.ts
import { execFile as execFile2, spawn as spawn2 } from "node:child_process";
import * as fs3 from "node:fs/promises";
import * as path4 from "node:path";
import { promisify as promisify2 } from "node:util";

// ../sdk/src/client/types/errors.ts
var ApiError = class extends Error {
  /**
   * Creates a new ApiError instance.
   *
   * @param message - Human-readable error message
   * @param code - Machine-readable error code
   * @param fields - Optional array of field-specific validation errors
   */
  constructor(message, code, fields) {
    super(message);
    this.code = code;
    this.fields = fields;
    this.name = "ApiError";
  }
};
var NetworkError = class extends Error {
  /**
   * Creates a new NetworkError instance.
   *
   * @param message - Human-readable error message
   * @param cause - Optional underlying error that caused this network failure
   */
  constructor(message, cause) {
    super(message);
    this.cause = cause;
    this.name = "NetworkError";
  }
};

// ../sdk/src/client/cardsClient.ts
var INITIAL_TIMEOUT_MS = 3e3;
var MAX_TIMEOUT_MS = 1e4;
var MAX_TIMEOUT_RETRIES = 2;
var CardsClient = class {
  /**
   * Creates a new CardsClient instance.
   *
   * @param options - Configuration options including base URL and auth token.
   * @param httpClient - Optional HTTP client for dependency injection.
   */
  constructor(options, httpClient) {
    this.options = options;
    this._httpClient = httpClient;
  }
  _httpClient;
  /** Current timeout in milliseconds, increases with consecutive failures. */
  _currentTimeoutMs = INITIAL_TIMEOUT_MS;
  /**
   * Returns the base URL used to build API requests.
   *
   * @returns The base URL string as provided in {@link CardsClientOptions}.
   */
  getBaseUrl() {
    return this.options.baseUrl;
  }
  /**
   * Returns whether an HTTP client was injected.
   *
   * @returns True if an HTTP client was provided during construction.
   * @internal Used for testing dependency injection.
   */
  hasHttpClient() {
    return this._httpClient !== void 0;
  }
  /**
   * Returns an AbortSignal that fires after the current backoff timeout.
   * Uses caller's signal if provided (for DI/testing), otherwise applies the backoff timeout.
   *
   * @param existingSignal - Optional caller-provided signal to reuse instead of creating a timeout signal.
   * @returns AbortSignal that controls request cancellation for the current operation.
   */
  getTimeoutSignal(existingSignal) {
    if (existingSignal) return existingSignal;
    return AbortSignal.timeout(this._currentTimeoutMs);
  }
  /**
   * Records a successful request and resets the timeout backoff.
   */
  onRequestSuccess() {
    this._currentTimeoutMs = INITIAL_TIMEOUT_MS;
  }
  /**
   * Records a failed request and increases the timeout via exponential backoff.
   */
  onRequestFailure() {
    this._currentTimeoutMs = Math.min(this._currentTimeoutMs * 2, MAX_TIMEOUT_MS);
  }
  /**
   * Default HTTP client implementation using fetch + JSON payloads.
   *
   * Each fetch call includes an AbortSignal.timeout that starts at 3 seconds
   * and doubles on consecutive failures up to 10 seconds.
   */
  defaultHttpClient = {
    get: async (url, options) => {
      const response = await fetch(url, {
        ...options,
        headers: { ...this.getHeaders(), ...options?.headers },
        signal: this.getTimeoutSignal(options?.signal)
      });
      if (!response.ok) throw response;
      return response.json();
    },
    post: async (url, body, options) => {
      const response = await fetch(url, {
        ...options,
        method: "POST",
        headers: { ...this.getHeaders(), ...options?.headers },
        body: body ? JSON.stringify(body) : void 0,
        signal: this.getTimeoutSignal(options?.signal)
      });
      if (!response.ok) throw response;
      return response.json();
    },
    put: async (url, body, options) => {
      const response = await fetch(url, {
        ...options,
        method: "PUT",
        headers: { ...this.getHeaders(), ...options?.headers },
        body: body ? JSON.stringify(body) : void 0,
        signal: this.getTimeoutSignal(options?.signal)
      });
      if (!response.ok) throw response;
      return response.json();
    },
    patch: async (url, body, options) => {
      const response = await fetch(url, {
        ...options,
        method: "PATCH",
        headers: { ...this.getHeaders(), ...options?.headers },
        body: body ? JSON.stringify(body) : void 0,
        signal: this.getTimeoutSignal(options?.signal)
      });
      if (!response.ok) throw response;
      return response.json();
    },
    delete: async (url, options) => {
      const response = await fetch(url, {
        ...options,
        method: "DELETE",
        headers: { ...this.getHeaders(), ...options?.headers },
        signal: this.getTimeoutSignal(options?.signal)
      });
      if (!response.ok) throw response;
    }
  };
  /**
   * Gets HTTP headers for JSON API requests.
   *
   * @returns Headers with JSON content type and optional bearer token.
   */
  getHeaders() {
    const headers = { "Content-Type": "application/json" };
    if (this.options.accessToken) {
      headers["Authorization"] = `Bearer ${this.options.accessToken}`;
    }
    return headers;
  }
  /**
   * Gets the HTTP client to use for requests.
   *
   * @returns Injected HTTP client when provided, otherwise the default fetch-based client.
   */
  getHttpClient() {
    return this._httpClient ?? this.defaultHttpClient;
  }
  /**
   * Builds a URL relative to the configured base URL.
   *
   * Undefined and null query params are omitted. Values are stringified.
   *
   * @param path - Relative API path to append to the configured base URL.
   * @param params - Optional query parameters to encode onto the URL.
   * @returns Fully-qualified request URL string.
   */
  buildUrl(path5, params) {
    const url = new URL(path5, this.options.baseUrl);
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value !== void 0 && value !== null) {
          url.searchParams.set(key, String(value));
        }
      }
    }
    return url.toString();
  }
  /**
   * Wraps a request with consistent error handling.
   *
   * @param fn - Async request function to execute.
   * @returns The resolved value from the request function.
   * @throws ApiError when the server responds with a non-2xx status.
   * @throws NetworkError for network failures or unexpected exceptions.
   */
  async request(fn) {
    let lastTimeoutError;
    for (let attempt = 0; attempt <= MAX_TIMEOUT_RETRIES; attempt++) {
      try {
        const result = await fn();
        this.onRequestSuccess();
        return result;
      } catch (error) {
        if (error instanceof Response) {
          this.onRequestSuccess();
          let body = {};
          try {
            body = await error.json();
          } catch (parseError) {
            if (!(parseError instanceof SyntaxError)) {
              console.warn("[CardsClient] Unexpected error parsing error response:", parseError);
            }
          }
          const message = body["error"] || body["message"] || error.statusText;
          const code = body["code"] || String(error.status);
          const fields = body["fields"];
          throw new ApiError(message, code, fields);
        }
        this.onRequestFailure();
        if (error instanceof DOMException && error.name === "TimeoutError") {
          lastTimeoutError = new NetworkError("Request timed out", error);
          continue;
        }
        throw new NetworkError("Request failed", error instanceof Error ? error : void 0);
      }
    }
    throw lastTimeoutError;
  }
  // --- Card Operations ---
  /**
   * Lists cards with optional filtering.
   *
   * @param options - Optional filter and pagination options.
   * @returns Promise resolving to matching cards.
   * @throws ApiError when the server responds with an error.
   * @throws NetworkError when the request fails to reach the server.
   */
  async listCards(options) {
    const urlStr = this.buildUrl("/cards", {
      workspacePath: this.options.workspacePath,
      status: options?.status,
      search: options?.search,
      limit: options?.limit,
      offset: options?.offset
    });
    const url = new URL(urlStr);
    for (const t of options?.tags ?? []) {
      url.searchParams.append("tag", t);
    }
    return this.request(() => this.getHttpClient().get(url.toString()));
  }
  /**
   * Lists cards as lightweight summaries for list views.
   *
   * Returns pre-flattened fields suitable for direct use in list rendering,
   * omitting heavyweight fields like `planContent` and `repositoryPath`.
   *
   * @template T - The expected summary shape (default `Record<string, unknown>`).
   * @returns Promise resolving to card summaries.
   * @throws ApiError when the server responds with an error.
   * @throws NetworkError when the request fails to reach the server.
   */
  async listCardSummaries() {
    const url = this.buildUrl("/cards/list", {
      workspacePath: this.options.workspacePath
    });
    return this.request(() => this.getHttpClient().get(url));
  }
  /**
   * Gets a single card by id.
   *
   * @param cardId - The id of the card to retrieve.
   * @returns Promise resolving to the card.
   * @throws ApiError when the server responds with an error.
   * @throws NetworkError when the request fails to reach the server.
   */
  async getCard(cardId) {
    const url = this.buildUrl(`/cards/${cardId}`, {
      workspacePath: this.options.workspacePath
    });
    return this.request(() => this.getHttpClient().get(url));
  }
  /**
   * Creates a new card.
   *
   * @param data - Card creation payload.
   * @returns Promise resolving to the created card.
   * @throws ApiError when the server rejects the payload.
   * @throws NetworkError when the request fails to reach the server.
   */
  async createCard(data) {
    const url = this.buildUrl("/cards");
    const body = {
      ...data,
      workspacePath: this.options.workspacePath
    };
    return this.request(() => this.getHttpClient().post(url, body));
  }
  /**
   * Updates an existing card.
   *
   * @param cardId - The id of the card to update.
   * @param data - The fields to update.
   * @returns Promise resolving to the updated card.
   * @throws ApiError when the server rejects the update.
   * @throws NetworkError when the request fails to reach the server.
   * @deprecated Use direct git operations instead. This endpoint will be removed.
   */
  async updateCard(cardId, data) {
    const url = this.buildUrl(`/cards/${cardId}`);
    return this.request(() => this.getHttpClient().patch(url, data));
  }
  /**
   * Deletes a card.
   *
   * @param cardId - The id of the card to delete.
   * @returns Promise resolving when deletion is complete.
   * @throws ApiError when the server rejects the delete.
   * @throws NetworkError when the request fails to reach the server.
   * @deprecated Use direct git operations instead. This endpoint will be removed.
   */
  async deleteCard(cardId) {
    const url = this.buildUrl(`/cards/${cardId}`);
    return this.request(() => this.getHttpClient().delete(url));
  }
  // --- Comment Operations ---
  /**
   * Gets all comments for a card.
   *
   * @param cardId - Identifier of the target card for this request.
   * @returns Promise resolving to the comment list.
   * @throws ApiError when the server responds with an error.
   * @throws NetworkError when the request fails to reach the server.
   */
  async getComments(cardId) {
    const url = this.buildUrl(`/cards/${cardId}/comments`);
    return this.request(() => this.getHttpClient().get(url));
  }
  /**
   * Gets a single comment by id.
   *
   * @param cardId - Identifier of the card that owns the requested comment.
   * @param commentId - Identifier of the comment to retrieve.
   * @returns Promise resolving to the comment.
   * @throws ApiError when the server responds with an error.
   * @throws NetworkError when the request fails to reach the server.
   */
  async getComment(cardId, commentId) {
    const url = this.buildUrl(`/cards/${cardId}/comments/${commentId}`);
    return this.request(() => this.getHttpClient().get(url));
  }
  /**
   * Creates a new comment on a card.
   *
   * @param cardId - Identifier of the card that will receive the new comment.
   * @param data - Comment creation payload.
   * @returns Promise resolving to the created comment.
   * @throws ApiError when the server rejects the payload.
   * @throws NetworkError when the request fails to reach the server.
   * @deprecated Use direct git operations instead. This endpoint will be removed.
   */
  async createComment(cardId, data) {
    const url = this.buildUrl(`/cards/${cardId}/comments`);
    return this.request(() => this.getHttpClient().post(url, data));
  }
  /**
   * Updates an existing comment.
   *
   * @param cardId - Identifier of the card that owns the comment.
   * @param commentId - Identifier of the comment to update.
   * @param data - Comment update payload.
   * @returns Promise resolving to the updated comment.
   * @throws ApiError when the server rejects the update.
   * @throws NetworkError when the request fails to reach the server.
   * @deprecated Use direct git operations instead. This endpoint will be removed.
   */
  async updateComment(cardId, commentId, data) {
    const url = this.buildUrl(`/cards/${cardId}/comments/${commentId}`);
    return this.request(() => this.getHttpClient().patch(url, data));
  }
  /**
   * Deletes a comment.
   *
   * @param cardId - Identifier of the card that owns the comment.
   * @param commentId - Identifier of the comment to remove.
   * @returns Promise resolving when deletion is complete.
   * @throws ApiError when the server rejects the delete.
   * @throws NetworkError when the request fails to reach the server.
   * @deprecated Use direct git operations instead. This endpoint will be removed.
   */
  async deleteComment(cardId, commentId) {
    const url = this.buildUrl(`/cards/${cardId}/comments/${commentId}`);
    return this.request(() => this.getHttpClient().delete(url));
  }
  // --- Attachment Operations ---
  /**
   * Uploads an attachment to a card using binary PUT.
   *
   * This is the preferred method - sends raw binary data directly without
   * base64 encoding, resulting in 33% smaller payloads.
   *
   * @param cardId - Identifier of the card that will receive the attachment.
   * @param name - File name including extension.
   * @param data - Binary data as Blob, ArrayBuffer, or base64 string.
   * @returns Promise resolving to attachment metadata.
   * @throws ApiError when the server rejects the upload.
   * @throws NetworkError when the request fails to reach the server.
   */
  async uploadAttachment(cardId, name, data) {
    const url = this.buildUrl(`/cards/${cardId}/attachments/${encodeURIComponent(name)}`);
    let body;
    if (data instanceof Blob) {
      body = data;
    } else if (data instanceof ArrayBuffer) {
      body = new Blob([data]);
    } else {
      const binaryString = atob(data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      body = new Blob([bytes]);
    }
    return this.request(async () => {
      const response = await fetch(url, {
        method: "PUT",
        headers: {
          ...this.getHeaders(),
          "Content-Type": "application/octet-stream"
        },
        body,
        signal: this.getTimeoutSignal()
      });
      if (!response.ok) throw response;
      return response.json();
    });
  }
  /**
   * Downloads an attachment as a Blob.
   *
   * This method uses `fetch` directly so binary data is preserved.
   *
   * @param cardId - Identifier of the card that owns the attachment.
   * @param attachmentId - Identifier of the attachment blob to download.
   * @returns Promise resolving to an attachment Blob.
   * @throws ApiError when the server responds with an error.
   * @throws NetworkError when the request fails to reach the server.
   */
  async getAttachment(cardId, attachmentId) {
    const url = this.buildUrl(`/cards/${cardId}/attachments/${attachmentId}`);
    return this.request(async () => {
      const response = await fetch(url, {
        headers: this.getHeaders(),
        signal: this.getTimeoutSignal()
      });
      if (!response.ok) throw response;
      return response.blob();
    });
  }
  /**
   * Lists attachments for a card.
   *
   * @param cardId - Identifier of the card whose attachments should be listed.
   * @returns Promise resolving to attachment metadata.
   * @throws ApiError when the server responds with an error.
   * @throws NetworkError when the request fails to reach the server.
   */
  async listAttachments(cardId) {
    const url = this.buildUrl(`/cards/${cardId}/attachments`);
    return this.request(() => this.getHttpClient().get(url));
  }
  // --- Timeline Operations ---
  /**
   * Gets timeline entries for a card with optional pagination.
   *
   * @param cardId - Identifier of the card whose timeline entries should be returned.
   * @param options - Optional pagination controls.
   * @returns Promise resolving to timeline entries.
   * @throws ApiError when the server responds with an error.
   * @throws NetworkError when the request fails to reach the server.
   */
  async getTimeline(cardId, options) {
    const url = this.buildUrl(`/cards/${cardId}/timeline`, {
      before: options?.before,
      limit: options?.limit
    });
    return this.request(() => this.getHttpClient().get(url));
  }
  // --- Plan Operations ---
  /**
   * Gets the plan document for a card as markdown.
   *
   * @param cardId - Identifier of the card whose plan markdown should be returned.
   * @returns Promise resolving to plan markdown.
   * @throws ApiError when the server responds with an error.
   * @throws NetworkError when the request fails to reach the server.
   */
  async getPlan(cardId) {
    const url = this.buildUrl(`/cards/${cardId}/plan`);
    const response = await this.request(() => this.getHttpClient().get(url));
    return response.content;
  }
  /**
   * Updates the plan document for a card.
   *
   * @param cardId - Identifier of the card whose plan markdown should be updated.
   * @param content - Plan markdown content.
   * @returns Promise resolving when the plan is saved.
   * @throws ApiError when the server rejects the update.
   * @throws NetworkError when the request fails to reach the server.
   * @deprecated Use direct git operations instead. This endpoint will be removed.
   */
  async updatePlan(cardId, content) {
    const url = this.buildUrl(`/cards/${cardId}/plan`);
    return this.request(() => this.getHttpClient().put(url, content));
  }
  // --- Gate Operations ---
  /**
   * Approves a gate for a card.
   *
   * @param cardId - Identifier of the card whose gate state should be updated.
   * @param gateName - Gate name to approve.
   * @returns Promise resolving to gate approval metadata.
   * @throws ApiError when the server rejects the approval.
   * @throws NetworkError when the request fails to reach the server.
   * @deprecated Use direct git operations instead. This endpoint will be removed.
   */
  async approveGate(cardId, gateName) {
    const url = this.buildUrl(`/cards/${cardId}/gates/${gateName}/approve`);
    return this.request(() => this.getHttpClient().post(url, void 0));
  }
  // --- Commit Operations ---
  /**
   * Gets all commits associated with a card.
   *
   * @param cardId - Identifier of the card whose commits should be returned.
   * @returns Promise resolving to commit metadata.
   * @throws ApiError when the server responds with an error.
   * @throws NetworkError when the request fails to reach the server.
   */
  async getCommits(cardId) {
    const url = this.buildUrl(`/cards/${cardId}/commits`);
    return this.request(() => this.getHttpClient().get(url));
  }
  /**
   * Adds a commit to a card.
   *
   * @param cardId - Identifier of the card to associate with the commit SHA.
   * @param sha - Git commit sha.
   * @returns Promise resolving to commit metadata.
   * @throws ApiError when the server rejects the update.
   * @throws NetworkError when the request fails to reach the server.
   */
  async addCommit(cardId, sha) {
    const url = this.buildUrl(`/cards/${cardId}/commits`);
    return this.request(() => this.getHttpClient().post(url, { sha }));
  }
  /**
   * Removes a commit from a card.
   *
   * @param cardId - Identifier of the card to detach from the commit SHA.
   * @param sha - Git commit sha.
   * @param options - Optional parameters.
   * @param options.sessionId - Claude Code session ID forwarded as `X-Cards-Session-Id` header so the card repo post-commit hook can attribute the commit.
   * @returns Promise resolving when removal is complete.
   * @throws ApiError when the server rejects the update.
   * @throws NetworkError when the request fails to reach the server.
   */
  async removeCommit(cardId, sha, options) {
    const url = this.buildUrl(`/cards/${cardId}/commits/${sha}`);
    const headers = {};
    if (options?.sessionId) {
      headers["X-Cards-Session-Id"] = options.sessionId;
    }
    return this.request(() => this.getHttpClient().delete(url, { headers }));
  }
  // --- Branch Operations ---
  /**
   * Gets all branches tracked on a card.
   *
   * @param cardId - Unique identifier of the card whose branches to retrieve.
   * @param options - Optional query parameters.
   * @param options.workspacePath - Workspace path for computing isMerged and commit containment.
   * @returns Promise resolving to branches response.
   */
  async getBranches(cardId, options) {
    const url = this.buildUrl(`/cards/${cardId}/branches`, {
      workspacePath: options?.workspacePath
    });
    return this.request(() => this.getHttpClient().get(url));
  }
  /**
   * Adds a branch to a card.
   *
   * @param cardId - Unique identifier of the card to add the branch to.
   * @param data - Branch data including name and optional worktree path.
   * @param options - Optional parameters.
   * @param options.sessionId - Claude Code session ID forwarded as `X-Cards-Session-Id` header so the card repo post-commit hook can attribute the commit.
   * @returns Promise resolving when the branch is added.
   */
  async addBranch(cardId, data, options) {
    const url = this.buildUrl(`/cards/${cardId}/branches`);
    const headers = {};
    if (options?.sessionId) {
      headers["X-Cards-Session-Id"] = options.sessionId;
    }
    await this.request(() => this.getHttpClient().post(url, data, { headers }));
  }
  /**
   * Removes a branch from a card.
   *
   * @param cardId - Unique identifier of the card to remove the branch from.
   * @param name - Branch name to remove (will be URL-encoded).
   * @param options - Optional parameters.
   * @param options.sessionId - Claude Code session ID forwarded as `X-Cards-Session-Id` header so the card repo post-commit hook can attribute the commit.
   * @returns Promise resolving when the branch is removed.
   */
  async removeBranch(cardId, name, options) {
    const url = this.buildUrl(`/cards/${cardId}/branches/${encodeURIComponent(name)}`);
    const headers = {};
    if (options?.sessionId) {
      headers["X-Cards-Session-Id"] = options.sessionId;
    }
    return this.request(() => this.getHttpClient().delete(url, { headers }));
  }
  // --- Tag Operations ---
  /**
   * Gets all available tags.
   *
   * @returns Promise resolving to tag strings.
   * @throws ApiError when the server responds with an error.
   * @throws NetworkError when the request fails to reach the server.
   */
  async getTags() {
    const url = this.buildUrl("/tags", {
      workspacePath: this.options.workspacePath
    });
    return this.request(() => this.getHttpClient().get(url));
  }
  // --- Environment Operations ---
  /**
   * Fetches available agent environments.
   *
   * @returns Promise resolving to environment metadata.
   * @throws ApiError when the server responds with an error.
   * @throws NetworkError when the request fails to reach the server.
   */
  async getEnvironments() {
    const url = this.buildUrl("/environments");
    return this.request(() => this.getHttpClient().get(url));
  }
  // --- Typed File Operations ---
  /**
   * Submits an adaptive card action by writing an `adaptive-card-submission` typed file.
   *
   * @param cardId - The card containing the adaptive card.
   * @param actionId - The action ID from the adaptive card submit action.
   * @param data - The form data collected by the adaptive card.
   * @returns Promise resolving when the submission is persisted.
   * @throws ApiError when the server rejects the submission (e.g. validation failure).
   * @throws NetworkError when the request fails to reach the server.
   */
  async submitCardAction(cardId, actionId, data) {
    const fileName = `${actionId}-${Date.now()}.json`;
    const url = this.buildUrl(`/cards/${cardId}/adaptive-card-submission/${encodeURIComponent(fileName)}`);
    const body = { cardId, actionId, data };
    await this.request(() => this.getHttpClient().put(url, body));
  }
  // --- Type Schema Operations ---
  /**
   * Gets type schemas and descriptions for a card's environment.
   *
   * Returns metadata about each registered type in the card's environment,
   * including version, schema, and description. Command details are excluded.
   *
   * @param cardId - Identifier of the card whose type schema metadata should be fetched.
   * @returns Promise resolving to type schema information.
   * @throws ApiError when the server responds with an error.
   * @throws NetworkError when the request fails to reach the server.
   */
  async getTypeSchemas(cardId) {
    const url = this.buildUrl(`/cards/${cardId}/schema`);
    return this.request(() => this.getHttpClient().get(url));
  }
  // --- Stream Operations ---
  /**
   * Lists all streams attached to a card, sorted by creation time.
   *
   * @param cardId - Card ID to query.
   * @returns Stream metadata array (may be empty).
   * @throws ApiError when the server responds with an error (e.g., 404 for unknown card).
   * @throws NetworkError when the request fails to reach the server.
   */
  async listStreams(cardId) {
    const url = this.buildUrl(`/cards/${cardId}/streams`);
    return this.request(() => this.getHttpClient().get(url));
  }
  /**
   * Retrieves a stream's metadata and all raw lines.
   *
   * The `streamType` and `filename` are URI-encoded automatically. For completed
   * streams the returned `lines` array is the full content; for active streams it
   * is a snapshot that may grow while the caller processes it.
   *
   * @param cardId - Identifier of the card that owns the requested stream.
   * @param streamType - Stream type key (e.g., `"claude-code-session"`).
   * @param filename - Stream filename (e.g., `"session.log"`).
   * @returns Metadata and content lines.
   * @throws ApiError on 404 (unknown card or stream) or other server errors.
   * @throws NetworkError when the request fails to reach the server.
   */
  async getStream(cardId, streamType, filename) {
    const url = this.buildUrl(
      `/cards/${cardId}/streams/${encodeURIComponent(streamType)}/${encodeURIComponent(filename)}`
    );
    return this.request(() => this.getHttpClient().get(url));
  }
  /**
   * Opens a chunked JSONL stream to the server and returns a writer.
   *
   * The writer sends each line in real-time over a single HTTP POST using a
   * `ReadableStream` body. Call {@link StreamWriter.close} when the producer
   * is finished to end the request and retrieve the server's summary.
   *
   * @param cardId - Card ID to attach the stream to.
   * @param streamType - Stream type key from settings.json (e.g., `"claude-code-session"`).
   * @param filename - Stream filename (e.g., `"session-abc.jsonl"`).
   * @param options - Optional title and session ID metadata.
   * @returns A {@link StreamWriter} for pushing lines and closing the stream.
   *
   * @example
   * ```typescript
   * const stream = client.openStream(cardId, 'claude-code-session', 'run.jsonl');
   * stream.write(JSON.stringify({ type: 'init' }));
   * stream.write(JSON.stringify({ type: 'result' }));
   * const result = await stream.close();
   * ```
   */
  openStream(cardId, streamType, filename, options) {
    const encoder = new TextEncoder();
    let controller;
    const body = new ReadableStream({
      start(c) {
        controller = c;
      }
    });
    const url = this.buildUrl(
      `/cards/${cardId}/streams/${encodeURIComponent(streamType)}/${encodeURIComponent(filename)}`
    );
    const headers = {
      "Content-Type": "application/x-ndjson"
    };
    if (this.options.accessToken) {
      headers["Authorization"] = `Bearer ${this.options.accessToken}`;
    }
    if (options?.title) {
      headers["X-Stream-Title"] = options.title;
    }
    if (options?.sessionId) {
      headers["X-Stream-Session-Id"] = options.sessionId;
    }
    const fetchOptions = {
      method: "POST",
      headers,
      body,
      duplex: "half"
    };
    const responsePromise = fetch(url, fetchOptions);
    let earlyError = null;
    responsePromise.then((response) => {
      if (!response.ok) {
        earlyError = new ApiError(response.statusText, String(response.status));
      }
    }).catch((err) => {
      earlyError = err instanceof Error ? err : new Error(String(err));
    });
    return {
      write(line) {
        if (earlyError) throw earlyError;
        controller.enqueue(encoder.encode(`${line}
`));
      },
      close: async () => {
        controller.close();
        return this.request(async () => {
          const response = await responsePromise;
          if (!response.ok) throw response;
          return response.json();
        });
      }
    };
  }
  /**
   * Opens a WebSocket-backed JSONL stream to the server and returns a session.
   *
   * The session keeps a persistent WebSocket connection for the entire session
   * lifetime. The server sends a `ready` message with `resumeFrom` before the
   * caller writes any lines, so the watcher can skip lines the server already has.
   *
   * Call {@link WsStreamSession.close} when the producer is finished to send a
   * graceful close message and await the server's acknowledgement.
   *
   * @param cardId - Card ID to attach the stream to.
   * @param streamType - Stream type key from settings.json (e.g., `"claude-code-session"`).
   * @param filename - Stream filename (e.g., `"session-abc.jsonl"`).
   * @param options - Title and session ID metadata forwarded to the server as URL query parameters.
   * @param wsFactory - WebSocket factory for creating the connection. Use the `ws` package in Node.js environments.
   * @returns A {@link WsStreamSession} with `resumeFrom` set to the server's current line count.
   * @throws Error when the WebSocket fails to connect or the server sends an error before `ready`.
   */
  async openStreamWebSocket(cardId, streamType, filename, options, wsFactory) {
    const factory = wsFactory;
    const baseUrl = this.options.baseUrl.replace(/^http/, "ws");
    const basePath = `${baseUrl}/cards/${encodeURIComponent(cardId)}/streams/${encodeURIComponent(streamType)}/${encodeURIComponent(filename)}`;
    const queryParams = new URLSearchParams();
    if (options?.title) queryParams.set("title", options.title);
    if (options?.sessionId) queryParams.set("sessionId", options.sessionId);
    const queryString = queryParams.toString();
    const url = queryString ? `${basePath}?${queryString}` : basePath;
    const headers = {};
    if (this.options.accessToken) {
      headers["Authorization"] = `Bearer ${this.options.accessToken}`;
    }
    const ws = factory(url, { headers });
    const resumeFrom = await new Promise((resolve2, reject) => {
      const onReady = (event) => {
        try {
          const msg = JSON.parse(String(event.data));
          if (msg.type === "ready") {
            ws.removeEventListener("message", onReady);
            ws.removeEventListener("error", onError);
            ws.removeEventListener("close", onClose);
            resolve2(msg.resumeFrom ?? 0);
          } else if (msg.type === "error") {
            ws.removeEventListener("message", onReady);
            ws.removeEventListener("error", onError);
            ws.removeEventListener("close", onClose);
            reject(new Error(msg.message ?? "Server error"));
          }
        } catch {
          reject(new Error("Failed to parse server ready message"));
        }
      };
      const onError = (event) => {
        ws.removeEventListener("message", onReady);
        ws.removeEventListener("error", onError);
        ws.removeEventListener("close", onClose);
        reject(new Error(`WebSocket error: ${String(event)}`));
      };
      const onClose = (event) => {
        ws.removeEventListener("message", onReady);
        ws.removeEventListener("error", onError);
        ws.removeEventListener("close", onClose);
        reject(new Error(`WebSocket closed before ready: code=${String(event.code)}`));
      };
      ws.addEventListener("message", onReady);
      ws.addEventListener("error", onError);
      ws.addEventListener("close", onClose);
    });
    let linesSent = resumeFrom;
    return {
      get resumeFrom() {
        return resumeFrom;
      },
      get linesSent() {
        return linesSent;
      },
      write(line) {
        linesSent++;
        ws.send(JSON.stringify({ type: "line", lineNumber: linesSent, content: line }));
      },
      async close() {
        ws.send(JSON.stringify({ type: "close" }));
        await new Promise((resolve2) => {
          const onClose = () => {
            ws.removeEventListener("close", onClose);
            resolve2();
          };
          ws.addEventListener("close", onClose);
          if (ws.readyState === ws.CLOSED) {
            ws.removeEventListener("close", onClose);
            resolve2();
          }
        });
        return {
          filename,
          streamType,
          lineCount: linesSent,
          status: "completed"
        };
      }
    };
  }
  // --- Action Operations ---
  /**
   * Executes an action on a card via the server relay.
   *
   * @param cardId - Identifier of the card to execute the action on.
   * @param actionName - Action identifier (e.g., 'launch').
   * @returns Promise resolving to the action execution result.
   * @throws ApiError when the server rejects the request.
   * @throws NetworkError when the request fails to reach the server.
   */
  async executeAction(cardId, actionName) {
    const url = this.buildUrl(`/cards/${cardId}/actions/${encodeURIComponent(actionName)}`);
    return this.request(() => this.getHttpClient().post(url, void 0));
  }
  // --- Compare Operations ---
  /**
   * Sets or replaces the active comparison on the server.
   *
   * @param request - Compare request specifying the comparison mode.
   * @returns Promise resolving to the resulting compare state.
   */
  async setCompare(request) {
    const url = this.buildUrl("/compare");
    return this.request(() => this.getHttpClient().post(url, request));
  }
  /**
   * Returns the current compare state, or null if no comparison is active.
   *
   * The server returns 204 when no comparison is active, which this method
   * maps to null rather than throwing.
   *
   * @returns Promise resolving to the current compare state, or null if none active.
   */
  async getCompare() {
    const url = this.buildUrl("/compare");
    return this.request(async () => {
      const response = await fetch(url, {
        headers: this.getHeaders(),
        signal: this.getTimeoutSignal()
      });
      if (response.status === 204) {
        return null;
      }
      if (!response.ok) throw response;
      return response.json();
    });
  }
  /**
   * Clears the active comparison on the server.
   *
   * @returns Promise resolving when the comparison is cleared.
   */
  async clearCompare() {
    const url = this.buildUrl("/compare");
    return this.request(() => this.getHttpClient().delete(url));
  }
};

// ../sdk/src/marketplace.ts
import * as fs from "node:fs/promises";
import { homedir } from "node:os";
import * as path from "node:path";
async function resolveClaudeConfigDir() {
  const home = homedir();
  const candidates = [];
  const claudeConfigDir = process.env["CLAUDE_CONFIG_DIR"];
  if (claudeConfigDir) candidates.push(claudeConfigDir);
  const xdgDataHome = process.env["XDG_DATA_HOME"];
  if (xdgDataHome) candidates.push(path.join(xdgDataHome, "claude"));
  const xdgConfigHome = process.env["XDG_CONFIG_HOME"];
  if (xdgConfigHome) candidates.push(path.join(xdgConfigHome, "claude"));
  candidates.push(path.join(home, ".config", "claude"));
  candidates.push(path.join(home, ".claude"));
  for (const candidate of candidates) {
    try {
      await fs.access(path.join(candidate, "plugins"));
      return candidate;
    } catch (error) {
      if (error instanceof Error && "code" in error && error.code === "ENOENT") {
        continue;
      }
      throw error;
    }
  }
  return null;
}
async function updateMarketplaceRegistration(marketplacePath, logger2) {
  const configDir = await resolveClaudeConfigDir();
  if (!configDir) {
    logger2.debug("Claude config directory not found, skipping marketplace registration update");
    return;
  }
  const knownPath = path.join(configDir, "plugins", "known_marketplaces.json");
  let raw;
  try {
    raw = await fs.readFile(knownPath, "utf-8");
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      logger2.debug("known_marketplaces.json not found, skipping");
      return;
    }
    throw error;
  }
  const data = JSON.parse(raw);
  const entry = data["cards.management"];
  if (!entry?.source || entry.source.source !== "directory") return;
  if (entry.source.path === marketplacePath && entry.installLocation === marketplacePath) {
    logger2.debug("Marketplace registration already points to extension bundle");
    return;
  }
  entry.source.path = marketplacePath;
  entry.installLocation = marketplacePath;
  entry.lastUpdated = (/* @__PURE__ */ new Date()).toISOString();
  await fs.writeFile(knownPath, `${JSON.stringify(data, null, 4)}
`);
  logger2.info("Updated marketplace registration to extension bundle", { marketplacePath });
}

// ../sdk/src/worktree.ts
import { execFile } from "node:child_process";
import * as fs2 from "node:fs/promises";
import * as path2 from "node:path";
import { promisify } from "node:util";
var execFileAsync = promisify(execFile);
function validateBranchName(name) {
  const branchNameRegex = /^[a-zA-Z0-9][a-zA-Z0-9/_-]*$/;
  if (!branchNameRegex.test(name)) {
    throw new Error("Error: Invalid branch name format.");
  }
}
function isNestedUnder(dir, parentSet) {
  let current = dir;
  while (current.includes("/")) {
    current = current.substring(0, current.lastIndexOf("/"));
    if (parentSet.has(current)) {
      return true;
    }
  }
  return false;
}
function isInternalSymlink(target) {
  return target.startsWith("../");
}
async function createWorktree(ref, options) {
  const { sourceRoot, repoRoot } = await findGitRoots(options?.cwd ?? process.cwd());
  let refType;
  try {
    refType = await resolveRefType(repoRoot, ref);
  } catch {
    validateBranchName(ref);
    refType = "branch";
  }
  if (refType === "branch") {
    validateBranchName(ref);
  }
  const worktreeDir = path2.join(repoRoot, ".worktrees", ref);
  const worktreeExists = await checkWorktreeExists(repoRoot, worktreeDir);
  if (worktreeExists) {
    throw new Error(`Error: Worktree already exists at ${worktreeDir}`);
  }
  await cleanStaleWorktreeDir(repoRoot, worktreeDir);
  if (refType === "branch") {
    const startPoint = await resolveHead(sourceRoot);
    const branchExists = await checkBranchExists(repoRoot, ref);
    await addWorktree({ repoRoot, worktreeDir, branchName: ref, branchExists, startPoint });
  } else {
    await addDetachedWorktree(repoRoot, worktreeDir, ref);
  }
  const ignored = await discoverIgnoredPaths(sourceRoot);
  await copyExistingSymlinks(sourceRoot, worktreeDir);
  await symlinkIgnoredPaths({ sourceRoot, worktreeDir, ignored });
  const reroutedCount = await rerouteAllNodeModules({ sourceRoot, worktreeDir, repoRoot });
  const [, baseSha] = await Promise.all([
    updateGitExclude({ worktreeDir, repoRoot, directories: ignored.directories, files: ignored.files }),
    resolveHead(worktreeDir)
  ]);
  const result = {
    branch: ref,
    worktree: worktreeDir,
    baseSha
  };
  if (reroutedCount > 0) {
    result.reroutedSymlinks = reroutedCount;
  }
  return result;
}
async function cleanStaleWorktreeDir(repoRoot, worktreeDir) {
  try {
    await fs2.access(worktreeDir);
    await fs2.rm(worktreeDir, { recursive: true });
    await execFileAsync("git", ["worktree", "prune"], { cwd: repoRoot, timeout: 3e4 });
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
  }
}
async function findGitRoots(startDir) {
  let currentDir = path2.resolve(startDir);
  while (currentDir !== "/") {
    const gitPath = path2.join(currentDir, ".git");
    try {
      const stats = await fs2.lstat(gitPath);
      if (stats.isDirectory()) {
        return {
          sourceRoot: currentDir,
          repoRoot: currentDir
        };
      }
      if (stats.isFile()) {
        const gitFileContent = await fs2.readFile(gitPath, "utf-8");
        const gitdirLine = gitFileContent.trim();
        const gitdirPath = gitdirLine.replace(/^gitdir:\s*/, "");
        const mainGitDir = gitdirPath.replace(/\/worktrees\/[^/]+$/, "");
        const repoRoot = mainGitDir.replace(/\/\.git$/, "");
        return {
          sourceRoot: currentDir,
          repoRoot
        };
      }
    } catch (error) {
      if (error.code !== "ENOENT") {
        throw error;
      }
    }
    currentDir = path2.dirname(currentDir);
  }
  throw new Error("Not in a git repository");
}
async function resolveHead(cwd) {
  const { stdout } = await execFileAsync("git", ["rev-parse", "HEAD"], { cwd, timeout: 5e3 });
  return stdout.trim();
}
async function checkWorktreeExists(repoRoot, worktreeDir) {
  const { stdout } = await execFileAsync("git", ["worktree", "list"], { cwd: repoRoot, timeout: 3e4 });
  return stdout.includes(worktreeDir);
}
async function checkBranchExists(repoRoot, branchName) {
  const { stdout } = await execFileAsync("git", ["branch", "--list", branchName], {
    cwd: repoRoot,
    timeout: 3e4
  });
  return stdout.trim().length > 0;
}
async function resolveRefType(repoRoot, ref) {
  const branchExists = await checkBranchExists(repoRoot, ref);
  if (branchExists) return "branch";
  const { stdout: tagOutput } = await execFileAsync("git", ["tag", "--list", ref], {
    cwd: repoRoot,
    timeout: 3e4
  });
  if (tagOutput.trim().length > 0) return "tag";
  try {
    await execFileAsync("git", ["rev-parse", "--verify", `${ref}^{commit}`], {
      cwd: repoRoot,
      timeout: 5e3
    });
    return "commit";
  } catch {
    throw new Error(`Error: '${ref}' does not resolve to a branch, tag, or commit.`);
  }
}
async function addWorktree(opts) {
  const args = opts.branchExists ? ["worktree", "add", opts.worktreeDir, opts.branchName] : ["worktree", "add", "-b", opts.branchName, opts.worktreeDir, opts.startPoint];
  await execFileAsync("git", args, { cwd: opts.repoRoot, timeout: 3e4 });
}
async function addDetachedWorktree(repoRoot, worktreeDir, ref) {
  await execFileAsync("git", ["worktree", "add", "--detach", worktreeDir, ref], {
    cwd: repoRoot,
    timeout: 3e4
  });
}
async function discoverIgnoredPaths(sourceRoot) {
  const { stdout } = await execFileAsync(
    "git",
    ["-C", sourceRoot, "ls-files", "--ignored", "--exclude-standard", "--directory", "--others"],
    { cwd: sourceRoot, timeout: 3e4 }
  );
  const lines = stdout.split("\n").filter((line) => line.length > 0 && !line.startsWith(".worktrees"));
  const directories = lines.filter((l) => l.endsWith("/")).map((l) => l.slice(0, -1));
  const files = lines.filter((l) => !l.endsWith("/"));
  return { directories, files };
}
async function symlinkIgnoredPaths(opts) {
  const { sourceRoot, worktreeDir, ignored } = opts;
  const dirSet = new Set(ignored.directories);
  const nonNestedDirs = ignored.directories.filter((dir) => !isNestedUnder(dir, dirSet));
  const createDirSymlink = async (dir) => {
    try {
      const sourcePath = path2.join(sourceRoot, dir);
      try {
        await fs2.lstat(sourcePath);
      } catch (error) {
        if (error.code === "ENOENT") {
          return false;
        }
        process.stderr.write(
          `create-worktree: unexpected error in lstat: ${error instanceof Error ? error.message : String(error)}
`
        );
        return false;
      }
      const destPath = path2.join(worktreeDir, dir);
      const parentDir = path2.dirname(dir);
      if (parentDir !== ".") {
        await fs2.mkdir(path2.join(worktreeDir, parentDir), { recursive: true });
      }
      await fs2.symlink(sourcePath, destPath);
      return true;
    } catch (error) {
      const code = error.code;
      if (code === "EEXIST" || code === "ENOENT") {
        return false;
      }
      process.stderr.write(
        `create-worktree: unexpected error in symlink: ${error instanceof Error ? error.message : String(error)}
`
      );
      return false;
    }
  };
  const createFileSymlink = async (file) => {
    try {
      const sourcePath = path2.join(sourceRoot, file);
      try {
        await fs2.lstat(sourcePath);
      } catch (error) {
        if (error.code === "ENOENT") {
          return false;
        }
        process.stderr.write(
          `create-worktree: unexpected error in lstat: ${error instanceof Error ? error.message : String(error)}
`
        );
        return false;
      }
      const destPath = path2.join(worktreeDir, file);
      const parentDir = path2.dirname(file);
      if (parentDir !== ".") {
        await fs2.mkdir(path2.join(worktreeDir, parentDir), { recursive: true });
      }
      await fs2.symlink(sourcePath, destPath);
      return true;
    } catch (error) {
      const code = error.code;
      if (code === "EEXIST" || code === "ENOENT") {
        return false;
      }
      process.stderr.write(
        `create-worktree: unexpected error in symlink: ${error instanceof Error ? error.message : String(error)}
`
      );
      return false;
    }
  };
  const dirResults = await Promise.all(nonNestedDirs.map(createDirSymlink));
  const nonNestedFiles = ignored.files.filter((file) => !isNestedUnder(file, dirSet));
  const fileResults = await Promise.all(nonNestedFiles.map(createFileSymlink));
  const dirCount = dirResults.filter((r) => r).length;
  const fileCount = fileResults.filter((r) => r).length;
  return { dirCount, fileCount };
}
async function copyExistingSymlinks(sourceRoot, worktreeDir) {
  const entries = await fs2.readdir(sourceRoot, { withFileTypes: true });
  const symlinks = entries.filter((e) => e.isSymbolicLink() && e.name !== ".git" && e.name !== ".worktrees");
  const copySymlink = async (name) => {
    const destPath = path2.join(worktreeDir, name);
    try {
      await fs2.lstat(destPath);
      return false;
    } catch (error) {
      if (error.code !== "ENOENT") {
        throw error;
      }
    }
    const sourceLinkPath = path2.join(sourceRoot, name);
    const target = await fs2.readlink(sourceLinkPath);
    const resolvedTarget = path2.resolve(sourceRoot, target);
    if (resolvedTarget === sourceLinkPath) {
      return false;
    }
    await fs2.symlink(sourceLinkPath, destPath);
    return true;
  };
  const results = await Promise.all(symlinks.map((e) => copySymlink(e.name)));
  return results.filter((r) => r).length;
}
async function rerouteNodeModules(opts) {
  const { sourceNodeModules, destNodeModules } = opts;
  try {
    await fs2.lstat(sourceNodeModules);
  } catch (error) {
    if (error.code === "ENOENT") {
      return 0;
    }
    throw error;
  }
  try {
    const destStats = await fs2.lstat(destNodeModules);
    if (destStats.isSymbolicLink()) {
      await fs2.unlink(destNodeModules);
    }
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
  }
  await fs2.mkdir(destNodeModules, { recursive: true });
  const entries = await fs2.readdir(sourceNodeModules, { withFileTypes: true });
  const counts = await Promise.all(
    entries.map(async (entry) => {
      const sourcePath = path2.join(sourceNodeModules, entry.name);
      const destPath = path2.join(destNodeModules, entry.name);
      if (entry.isSymbolicLink()) {
        const target = await fs2.readlink(sourcePath);
        if (isInternalSymlink(target)) {
          await fs2.symlink(target, destPath);
          return 1;
        } else {
          await fs2.symlink(sourcePath, destPath);
          return 0;
        }
      } else if (entry.isDirectory() && entry.name.startsWith("@")) {
        await fs2.mkdir(destPath, { recursive: true });
        const scopeEntries = await fs2.readdir(sourcePath, { withFileTypes: true });
        const scopeCounts = await Promise.all(
          scopeEntries.map(async (scopeEntry) => {
            const scopeSourcePath = path2.join(sourcePath, scopeEntry.name);
            const scopeDestPath = path2.join(destPath, scopeEntry.name);
            if (scopeEntry.isSymbolicLink()) {
              const target = await fs2.readlink(scopeSourcePath);
              if (isInternalSymlink(target)) {
                await fs2.symlink(target, scopeDestPath);
                return 1;
              } else {
                await fs2.symlink(scopeSourcePath, scopeDestPath);
                return 0;
              }
            } else {
              await fs2.symlink(scopeSourcePath, scopeDestPath);
              return 0;
            }
          })
        );
        return scopeCounts.reduce((sum, c) => sum + c, 0);
      } else {
        await fs2.symlink(sourcePath, destPath);
        return 0;
      }
    })
  );
  return counts.reduce((sum, c) => sum + c, 0);
}
async function rerouteAllNodeModules(opts) {
  const { sourceRoot, worktreeDir, repoRoot } = opts;
  let packageJson;
  try {
    const packageJsonContent = await fs2.readFile(path2.join(repoRoot, "package.json"), "utf-8");
    packageJson = JSON.parse(packageJsonContent);
  } catch (error) {
    if (error.code === "ENOENT") {
      return 0;
    }
    throw error;
  }
  if (!packageJson.workspaces) {
    return 0;
  }
  let totalCount = 0;
  totalCount += await rerouteNodeModules({
    sourceNodeModules: path2.join(sourceRoot, "node_modules"),
    destNodeModules: path2.join(worktreeDir, "node_modules")
  });
  const packagesDir = path2.join(sourceRoot, "packages");
  try {
    const packageEntries = await fs2.readdir(packagesDir, { withFileTypes: true });
    for (const entry of packageEntries) {
      if (entry.isDirectory()) {
        const pkgNodeModules = path2.join(packagesDir, entry.name, "node_modules");
        let nodeModulesExists = false;
        try {
          await fs2.lstat(pkgNodeModules);
          nodeModulesExists = true;
        } catch (error) {
          if (error.code !== "ENOENT") {
            throw error;
          }
        }
        if (nodeModulesExists) {
          const destPackageDir = path2.join(worktreeDir, "packages", entry.name);
          await fs2.mkdir(destPackageDir, { recursive: true });
          totalCount += await rerouteNodeModules({
            sourceNodeModules: pkgNodeModules,
            destNodeModules: path2.join(destPackageDir, "node_modules")
          });
        }
      }
    }
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
  }
  return totalCount;
}
async function updateGitExclude(opts) {
  const { worktreeDir, repoRoot, directories, files } = opts;
  const { stdout: gitDir } = await execFileAsync("git", ["-C", worktreeDir, "rev-parse", "--git-dir"], {
    timeout: 5e3
  });
  const excludePath = path2.join(gitDir.trim(), "info", "exclude");
  await fs2.mkdir(path2.dirname(excludePath), { recursive: true });
  const lines = ["# Symlinks created by instant-worktree"];
  for (const dir of directories) {
    if (!dir) continue;
    try {
      const stats = await fs2.lstat(path2.join(worktreeDir, dir));
      if (stats.isSymbolicLink()) lines.push(dir);
    } catch (error) {
      if (error.code !== "ENOENT") {
        throw error;
      }
    }
  }
  for (const file of files) {
    if (!file) continue;
    try {
      const stats = await fs2.lstat(path2.join(worktreeDir, file));
      if (stats.isSymbolicLink()) lines.push(file);
    } catch (error) {
      if (error.code !== "ENOENT") {
        throw error;
      }
    }
  }
  await fs2.appendFile(excludePath, `${lines.join("\n")}
`);
  try {
    await execFileAsync("git", ["-C", repoRoot, "config", "extensions.worktreeConfig", "true"], { timeout: 5e3 });
  } catch (error) {
    process.stderr.write(
      `create-worktree: failed to set worktreeConfig extension: ${error instanceof Error ? error.message : String(error)}
`
    );
  }
  try {
    await execFileAsync("git", ["-C", worktreeDir, "config", "--worktree", "core.excludesFile", excludePath], {
      timeout: 5e3
    });
  } catch (error) {
    process.stderr.write(
      `create-worktree: failed to set core.excludesFile: ${error instanceof Error ? error.message : String(error)}
`
    );
  }
}

// src/lib/branch-cleanup-watcher.ts
import { spawn } from "node:child_process";
import * as path3 from "node:path";
function spawnBranchCleanupWatcher(params) {
  const selfPath = new URL(import.meta.url).pathname;
  const nodeBin = process.execPath;
  let child;
  try {
    child = spawn(nodeBin, [selfPath, "--branch-cleanup"], {
      detached: true,
      stdio: ["pipe", "ignore", "ignore"]
    });
  } catch (error) {
    console.error(`[branch-cleanup-watcher] Failed to spawn watcher: ${errorMessage(error)}`);
    return;
  }
  child.stdin.on("error", (err) => {
    console.error(`[branch-cleanup-watcher] Stdin pipe error: ${errorMessage(err)}`);
  });
  child.stdin.write(`${JSON.stringify(params)}
`);
  child.stdin.end();
  child.unref();
}
if (process.argv.includes("--branch-cleanup")) {
  const chunks = [];
  process.stdin.on("data", (chunk) => {
    chunks.push(chunk);
  });
  process.stdin.on("end", () => {
    void (async () => {
      const raw = Buffer.concat(chunks).toString("utf8");
      let params;
      try {
        params = JSON.parse(raw);
      } catch (error) {
        console.error(`[branch-cleanup-watcher] Failed to parse params: ${errorMessage(error)}`);
        process.exit(1);
      }
      const { cardId, repoRoot, apiBaseUrl, apiAccessToken, sessionId } = params;
      const input = {
        cardId,
        repoRoot,
        apiBaseUrl,
        apiAccessToken,
        actionName: "branch-cleanup-watcher",
        environment: "",
        executionMode: "background",
        codingAgent: void 0,
        switchToInteractiveData: void 0,
        cardRepoPath: "",
        configPath: "",
        extensionPath: ""
      };
      const client = new CardsClient({
        baseUrl: apiBaseUrl,
        accessToken: apiAccessToken
      });
      const logger2 = new Logger({
        logFilePath: path3.join(repoRoot, ".cards", "logs", "cards-default-configuration-hooks.log")
      });
      try {
        await cleanupMergedBranches(input, client, logger2, sessionId);
      } catch (error) {
        const message = errorMessage(error);
        logger2.error("Branch cleanup watcher failed", { error: message, sessionId });
      } finally {
        logger2.close();
      }
    })();
  });
}

// src/lib/claude-session.ts
var execFileAsync2 = promisify2(execFile2);
function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}
function resolveMarketplacePath() {
  const extensionPath = process.env[CARDS_ENV_VARS.EXTENSION_PATH];
  if (!extensionPath) {
    throw new Error(`Missing required environment variable: ${CARDS_ENV_VARS.EXTENSION_PATH}`);
  }
  return path4.join(extensionPath, "dist", "marketplace");
}
function buildPluginSettings(marketplacePath) {
  return JSON.stringify({
    enabledPlugins: { "runtime@cards.management": true },
    extraKnownMarketplaces: {
      "cards.management": {
        source: { source: "directory", path: marketplacePath }
      }
    }
  });
}
function buildArgs(prompt, sessionId, resume, mode, cardRepoPath, marketplacePath) {
  const args = [];
  if (resume) {
    args.push("--resume", sessionId);
  } else {
    args.push(prompt);
    args.push("--session-id", sessionId);
  }
  args.push("--settings", buildPluginSettings(marketplacePath));
  args.push("--add-dir", cardRepoPath);
  if (mode === "background") {
    args.push("--print");
  }
  return args;
}
function cardIdFromBranch(branchName) {
  const match = branchName.match(/^cards\/(.+)\/\d+$/);
  return match?.[1] ?? null;
}
async function resolveBaseBranch(workspacePath, client) {
  const { stdout } = await execFileAsync2("git", ["rev-parse", "--abbrev-ref", "HEAD"], {
    cwd: workspacePath
  });
  let branch = stdout.trim();
  const visited = /* @__PURE__ */ new Set();
  while (branch.startsWith("cards/")) {
    if (visited.has(branch)) {
      throw new Error(`Circular parentBranch chain detected: ${[...visited, branch].join(" \u2192 ")}`);
    }
    visited.add(branch);
    const cardId = cardIdFromBranch(branch);
    if (!cardId || !client) {
      throw new Error(
        `Workspace HEAD is on card branch "${branch}" but cannot resolve its parent. Switch the main checkout to a non-card branch (e.g., main).`
      );
    }
    const { branches } = await client.getBranches(cardId, { workspacePath });
    const record = branches.find((b) => b.name === branch);
    if (!record?.parentBranch) {
      throw new Error(
        `Card branch "${branch}" has no parentBranch record. Switch the main checkout to a non-card branch (e.g., main).`
      );
    }
    branch = record.parentBranch;
  }
  return branch;
}
async function worktreeExistsOnDisk(worktreePath) {
  try {
    await fs3.access(worktreePath);
    return true;
  } catch {
    return false;
  }
}
async function resolveOrCreateWorktree(input, client, baseBranch, logger2, sessionId) {
  const { branches } = await client.getBranches(input.cardId, { workspacePath: input.repoRoot });
  for (const branch of branches) {
    if (!branch.exists || !branch.worktree) continue;
    if (!await worktreeExistsOnDisk(branch.worktree)) continue;
    logger2.info("Reusing existing worktree", { branch: branch.name, worktree: branch.worktree });
    return { worktreePath: branch.worktree, branchName: branch.name, parentBranch: branch.parentBranch };
  }
  for (const branch of branches) {
    if (!branch.exists) continue;
    if (!branch.name.startsWith(`cards/${input.cardId}/`)) continue;
    logger2.info("Reattaching worktree for existing branch", { branch: branch.name });
    const result2 = await createWorktree(branch.name, { cwd: input.repoRoot });
    await client.addBranch(
      input.cardId,
      { name: branch.name, worktree: result2.worktree, parentBranch: branch.parentBranch },
      { sessionId }
    );
    return { worktreePath: result2.worktree, branchName: branch.name, parentBranch: branch.parentBranch };
  }
  const prefix = `cards/${input.cardId}/`;
  const existingNumbers = branches.filter((b) => b.name.startsWith(prefix)).map((b) => parseInt(b.name.slice(prefix.length), 10)).filter((n) => !Number.isNaN(n));
  let nextNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1;
  const { repoRoot } = await findGitRoots(input.repoRoot);
  while (await checkWorktreeExists(repoRoot, path4.join(repoRoot, ".worktrees", `${prefix}${nextNumber}`))) {
    logger2.warn("Worktree already exists in git but not in API, skipping", {
      branch: `${prefix}${nextNumber}`
    });
    nextNumber++;
  }
  const branchName = `${prefix}${nextNumber}`;
  const result = await createWorktree(branchName, { cwd: input.repoRoot });
  await client.addBranch(
    input.cardId,
    { name: branchName, worktree: result.worktree, parentBranch: baseBranch },
    { sessionId }
  );
  logger2.info("Created new worktree", { branch: branchName, worktree: result.worktree });
  return { worktreePath: result.worktree, branchName, parentBranch: baseBranch };
}
async function tryCleanupStep(step, label, branchName, logger2) {
  try {
    await step();
  } catch (error) {
    logger2.warn(label, { branch: branchName, error: errorMessage(error) });
  }
}
async function cleanupMergedBranches(input, client, logger2, sessionId) {
  let t0 = performance.now();
  const { branches } = await client.getBranches(input.cardId, { workspacePath: input.repoRoot });
  logger2.debug("getBranches completed", {
    cardId: input.cardId,
    branchCount: branches.length,
    elapsedMs: Math.round(performance.now() - t0)
  });
  for (const branch of branches) {
    if (!branch.exists) continue;
    if (branch.parentBranch === branch.name) {
      throw new Error(
        `Branch "${branch.name}" has self-referential parentBranch \u2014 refusing to run cleanup. This is a data corruption bug: a branch cannot be its own parent.`
      );
    }
    t0 = performance.now();
    try {
      await execFileAsync2("git", ["merge-base", "--is-ancestor", branch.name, branch.parentBranch], {
        cwd: input.repoRoot
      });
    } catch {
      logger2.debug("Branch not merged, skipping cleanup", {
        branch: branch.name,
        elapsedMs: Math.round(performance.now() - t0)
      });
      continue;
    }
    logger2.debug("merge-base check completed (merged)", {
      branch: branch.name,
      elapsedMs: Math.round(performance.now() - t0)
    });
    if (branch.worktree) {
      t0 = performance.now();
      await tryCleanupStep(
        () => execFileAsync2("git", ["worktree", "remove", branch.worktree], { cwd: input.repoRoot }),
        "Failed to remove worktree",
        branch.name,
        logger2
      );
      logger2.debug("Worktree removal completed", {
        branch: branch.name,
        elapsedMs: Math.round(performance.now() - t0)
      });
    }
    t0 = performance.now();
    let branchDeleted = false;
    try {
      await execFileAsync2("git", ["branch", "-d", branch.name], { cwd: input.repoRoot });
      branchDeleted = true;
    } catch (error) {
      logger2.warn("Failed to delete branch", { branch: branch.name, error: errorMessage(error) });
    }
    logger2.debug("Branch deletion completed", {
      branch: branch.name,
      branchDeleted,
      elapsedMs: Math.round(performance.now() - t0)
    });
    if (branchDeleted) {
      t0 = performance.now();
      await tryCleanupStep(
        () => client.removeBranch(input.cardId, branch.name, { sessionId }),
        "Failed to remove branch from API",
        branch.name,
        logger2
      );
      logger2.debug("API branch removal completed", {
        branch: branch.name,
        elapsedMs: Math.round(performance.now() - t0)
      });
      logger2.info("Cleaned up merged branch", { branch: branch.name });
    } else {
      logger2.info("Skipped API record removal \u2014 git branch still exists", { branch: branch.name });
    }
  }
}
async function spawnClaudeSession(input, context, options) {
  const { prompt, sessionId, resume, supportsSwitchToInteractive } = options;
  context.logger.info(`${input.actionName} action started`, {
    cardId: input.cardId,
    environment: input.environment,
    executionMode: input.executionMode,
    sessionId
  });
  const client = new CardsClient({
    baseUrl: input.apiBaseUrl,
    accessToken: input.apiAccessToken
  });
  const baseBranch = await resolveBaseBranch(input.repoRoot, client);
  const worktreeResult = await resolveOrCreateWorktree(input, client, baseBranch, context.logger, sessionId);
  const { worktreePath: cwd, branchName, parentBranch } = worktreeResult;
  context.logger.info("Using worktree", { cwd, branch: branchName, baseBranch, parentBranch });
  const marketplacePath = resolveMarketplacePath();
  await updateMarketplaceRegistration(marketplacePath, context.logger);
  const args = buildArgs(prompt, sessionId, resume, input.executionMode, input.cardRepoPath, marketplacePath);
  const isInteractive = input.executionMode === "interactive";
  const child = spawn2("claude", args, {
    cwd,
    stdio: isInteractive ? "inherit" : ["ignore", "ignore", "pipe"],
    env: {
      ...process.env,
      WORKSPACE_PATH: cwd,
      CLAUDE_CODE_TASK_LIST_ID: `cards-extension-${input.cardId}`,
      CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS: "1",
      BASE_BRANCH: baseBranch,
      PARENT_BRANCH: parentBranch,
      WORKSPACE_BRANCH: branchName
    }
  });
  context.onCancel(() => {
    context.logger.info(`${input.actionName} action cancelled, terminating claude`, { sessionId });
    child.kill("SIGTERM");
  });
  if (supportsSwitchToInteractive) {
    context.onSwitchToInteractive(() => {
      context.logger.info("Switching to interactive mode", { sessionId });
      child.kill("SIGTERM");
      return { sessionId };
    });
  }
  if (!isInteractive) {
    child.stderr?.on("data", (chunk) => {
      const text = chunk.toString().trim();
      if (text) {
        context.logger.warn(text);
      }
    });
  }
  const exitCode = await new Promise((resolve2) => {
    child.on("close", resolve2);
  });
  context.logger.info(`${input.actionName} action completed`, { sessionId, exitCode });
  if (isInteractive) {
    try {
      spawnBranchCleanupWatcher({
        cardId: input.cardId,
        repoRoot: input.repoRoot,
        apiBaseUrl: input.apiBaseUrl,
        apiAccessToken: input.apiAccessToken,
        sessionId
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      context.logger.warn("Failed to spawn branch-cleanup watcher (non-fatal)", { error: message, sessionId });
    }
  } else {
    const cleanupStart = performance.now();
    try {
      await cleanupMergedBranches(input, client, context.logger, sessionId);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes("self-referential parentBranch") || message.includes("data corruption")) {
        throw error;
      }
      context.logger.warn("Post-exit cleanup failed (non-fatal)", { error: message, sessionId });
    }
    context.logger.debug("Post-exit cleanup finished", {
      sessionId,
      elapsedMs: Math.round(performance.now() - cleanupStart)
    });
  }
}

// src/actions/launch.ts
var launch_default = defineAction(
  {
    actionName: "Launch",
    description: "Start a Claude session for the card",
    supportsBackgroundMode: true,
    timeout: 36e5
  },
  async (input, context) => {
    const switchData = input.switchToInteractiveData;
    const [sessionId, resume] = [switchData?.sessionId ?? randomUUID(), !!switchData?.sessionId];
    await spawnClaudeSession(input, context, {
      prompt: "Load the `runtime:card-repo` and `runtime:card-routing` skills then follow the `<instructions>`.",
      sessionId,
      resume,
      supportsSwitchToInteractive: true
    });
  }
);

// src/actions/hook-wrapper.ts
if (!process.argv.includes("--branch-cleanup")) {
  executeCommand(launch_default);
}
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vLi4vc3JjL2FjdGlvbnMvbGF1bmNoLnRzIiwgIi4uLy4uLy4uL3Nkay9zcmMvY29uZmlnL2ZhY3Rvcmllcy9hY3Rpb24udHMiLCAiLi4vLi4vLi4vc2RrL3NyYy9jb25maWcvZW52LnRzIiwgIi4uLy4uLy4uL3Nkay9zcmMvY29uZmlnL2V4aXQtY29kZXMudHMiLCAiLi4vLi4vLi4vc2RrL3NyYy9jb25maWcvbG9nZ2VyLnRzIiwgIi4uLy4uLy4uL3Nkay9zcmMvY29uZmlnL3NvY2tldC1jbGllbnQudHMiLCAiLi4vLi4vLi4vc2RrL3NyYy9jb25maWcvcnVudGltZS50cyIsICIuLi8uLi9zcmMvbGliL2NsYXVkZS1zZXNzaW9uLnRzIiwgIi4uLy4uLy4uL3Nkay9zcmMvY2xpZW50L3R5cGVzL2Vycm9ycy50cyIsICIuLi8uLi8uLi9zZGsvc3JjL2NsaWVudC9jYXJkc0NsaWVudC50cyIsICIuLi8uLi8uLi9zZGsvc3JjL21hcmtldHBsYWNlLnRzIiwgIi4uLy4uLy4uL3Nkay9zcmMvd29ya3RyZWUudHMiLCAiLi4vLi4vc3JjL2xpYi9icmFuY2gtY2xlYW51cC13YXRjaGVyLnRzIiwgIi4uLy4uL3NyYy9hY3Rpb25zL2hvb2std3JhcHBlci50cyJdLAogICJzb3VyY2VzQ29udGVudCI6IFsiLyoqXG4gKiBMYXVuY2ggYWN0aW9uIGZvciBDbGF1ZGUgQ29kZSB3b3JrZmxvd3MuXG4gKlxuICogU3Bhd25zIHRoZSBgY2xhdWRlYCBDTEkgZm9yIHRoZSBjdXJyZW50IGNhcmQuIEluIGludGVyYWN0aXZlIG1vZGUsIHRoZVxuICogcHJvY2VzcyBpbmhlcml0cyBzdGRpbyBzbyB0aGUgdXNlciBnZXRzIGRpcmVjdCB0ZXJtaW5hbCBjb250cm9sLiBJblxuICogYmFja2dyb3VuZCBtb2RlLCBDbGF1ZGUgcnVucyB3aXRoIGAtLXByaW50YCBzbyBpdCBleGVjdXRlcyBub24taW50ZXJhY3RpdmVseVxuICogKHRha2VzIGEgcHJvbXB0LCBydW5zLCBhbmQgZXhpdHMpLiBUaGUgd2F0Y2hlciBoYW5kbGVzIGFsbCB0cmFuc2NyaXB0XG4gKiBzdHJlYW1pbmc7IGxhdW5jaC50cyBkb2VzIG5vdCBvcGVuIGFueSBzdHJlYW0gZW5kcG9pbnQuXG4gKlxuICogVGhlIGFjdGlvbiBhd2FpdHMgcHJvY2VzcyBleGl0IGJlZm9yZSByZXNvbHZpbmcsIHNvIHRoZSB0ZXJtaW5hbCBjbG9zZXNcbiAqIG9ubHkgYWZ0ZXIgQ2xhdWRlIGZpbmlzaGVzIGFuZCBjbGVhbnVwIGlzIGNvbXBsZXRlLlxuICpcbiAqIEBzdW1tYXJ5IExhdW5jaCBhY3Rpb24gZm9yIENsYXVkZSBDb2RlIHdvcmtmbG93c1xuICogQG1vZHVsZVxuICogQHNlZSB7QGxpbmsgZGVmaW5lQWN0aW9ufSBmb3IgZmFjdG9yeSBiZWhhdmlvciBhbmQgbWV0YWRhdGEgYXR0YWNobWVudFxuICovXG5cbmltcG9ydCB7IHJhbmRvbVVVSUQgfSBmcm9tICdub2RlOmNyeXB0byc7XG5pbXBvcnQgeyB0eXBlIEFjdGlvbkNvbnRleHQsIHR5cGUgQWN0aW9uSW5wdXQsIGRlZmluZUFjdGlvbiB9IGZyb20gJ0BjYXJkcy9zZGsvY29uZmlnJztcbmltcG9ydCB7IHNwYXduQ2xhdWRlU2Vzc2lvbiB9IGZyb20gJy4uL2xpYi9jbGF1ZGUtc2Vzc2lvbi5qcyc7XG5cbi8qKlxuICogTGF1bmNoIGFjdGlvbiBoYW5kbGVyLlxuICpcbiAqIFNwYXducyB0aGUgYGNsYXVkZWAgQ0xJIGFzIGEgY2hpbGQgcHJvY2VzcywgcHJvdmlkaW5nIHRoZSBjYXJkIElEIGFuZFxuICogcmVwb3NpdG9yeSBwYXRoIGFzIHByb21wdCBjb250ZXh0LiBUaGUgcHJvY2VzcyBsaWZlY3ljbGUgaXMgdGllZCB0byB0aGVcbiAqIGFjdGlvbjogY2FuY2VsbGF0aW9uIHNlbmRzIFNJR1RFUk0sIGFuZCBzd2l0Y2hpbmcgdG8gaW50ZXJhY3RpdmUgbW9kZVxuICogcHJlc2VydmVzIHRoZSBzZXNzaW9uIElEIGZvciByZXN1bXB0aW9uLlxuICovXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVBY3Rpb24oXG4gIHtcbiAgICBhY3Rpb25OYW1lOiAnTGF1bmNoJyxcbiAgICBkZXNjcmlwdGlvbjogJ1N0YXJ0IGEgQ2xhdWRlIHNlc3Npb24gZm9yIHRoZSBjYXJkJyxcbiAgICBzdXBwb3J0c0JhY2tncm91bmRNb2RlOiB0cnVlLFxuICAgIHRpbWVvdXQ6IDM2MDAwMDBcbiAgfSxcbiAgYXN5bmMgKGlucHV0OiBBY3Rpb25JbnB1dCwgY29udGV4dDogQWN0aW9uQ29udGV4dCkgPT4ge1xuICAgIGNvbnN0IHN3aXRjaERhdGEgPSBpbnB1dC5zd2l0Y2hUb0ludGVyYWN0aXZlRGF0YSBhcyB7IHNlc3Npb25JZD86IHN0cmluZyB9IHwgdW5kZWZpbmVkO1xuICAgIGNvbnN0IFtzZXNzaW9uSWQsIHJlc3VtZV0gPSBbc3dpdGNoRGF0YT8uc2Vzc2lvbklkID8/IHJhbmRvbVVVSUQoKSwgISFzd2l0Y2hEYXRhPy5zZXNzaW9uSWRdO1xuXG4gICAgYXdhaXQgc3Bhd25DbGF1ZGVTZXNzaW9uKGlucHV0LCBjb250ZXh0LCB7XG4gICAgICBwcm9tcHQ6ICdMb2FkIHRoZSBgcnVudGltZTpjYXJkLXJlcG9gIGFuZCBgcnVudGltZTpjYXJkLXJvdXRpbmdgIHNraWxscyB0aGVuIGZvbGxvdyB0aGUgYDxpbnN0cnVjdGlvbnM+YC4nLFxuICAgICAgc2Vzc2lvbklkLFxuICAgICAgcmVzdW1lLFxuICAgICAgc3VwcG9ydHNTd2l0Y2hUb0ludGVyYWN0aXZlOiB0cnVlXG4gICAgfSk7XG4gIH1cbik7XG4iLCAiLyoqXG4gKiBGYWN0b3J5IGZ1bmN0aW9uIGZvciBjcmVhdGluZyBhY3Rpb24gaGFuZGxlcnMuXG4gKlxuICogVGhpcyBpcyB0aGUgcHJpbWFyeSBhdXRob3JpbmcgQVBJIGZvciBhY3Rpb24gZGV2ZWxvcGVycy4gSXQgd3JhcHMgYSBoYW5kbGVyXG4gKiBmdW5jdGlvbiBhbmQgYXR0YWNoZXMgbWV0YWRhdGEgZm9yIHNldHRpbmdzLmpzb24gZ2VuZXJhdGlvbi4gVGhlIFNhbWVTaGFwZVxuICogdXRpbGl0eSBwcm92aWRlcyBjb21waWxlLXRpbWUgdHlwbyBkZXRlY3Rpb24uXG4gKlxuICpcbiAqIEBzdW1tYXJ5IEZhY3RvcnkgZnVuY3Rpb24gZm9yIGNyZWF0aW5nIGFjdGlvbiBoYW5kbGVyc1xuICogQG1vZHVsZVxuICovXG5cbmltcG9ydCB0eXBlIHsgQWN0aW9uQ29tbWFuZCB9IGZyb20gJy4uL2NvbW1hbmQtdHlwZXMuanMnO1xuaW1wb3J0IHR5cGUgeyBBY3Rpb25Db250ZXh0LCBBY3Rpb25JbnB1dCB9IGZyb20gJy4uL2lucHV0cy5qcyc7XG5pbXBvcnQgdHlwZSB7IFNhbWVTaGFwZSB9IGZyb20gJy4uL3R5cGUtdXRpbHMuanMnO1xuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBDb25maWd1cmF0aW9uIFR5cGVzXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbi8qKlxuICogQ29uZmlndXJhdGlvbiBmb3Ige0BsaW5rIGRlZmluZUFjdGlvbn0gZmFjdG9yeS5cbiAqXG4gKiBBbGwgZmllbGRzIGV4Y2VwdCBgYWN0aW9uTmFtZWAgYXJlIG9wdGlvbmFsIGFuZCBmb3J3YXJkZWQgdG8gc2V0dGluZ3MuanNvbi5cbiAqIFRoZSBDTEkgZXh0cmFjdHMgdGhpcyBtZXRhZGF0YSB2aWEgQVNUIGFuYWx5c2lzLCBzbyB2YWx1ZXMgbXVzdCBiZSBzdHJpbmdcbiAqIGxpdGVyYWxzIG9yIGJvb2xlYW4vbnVtYmVyIGxpdGVyYWxzIGluIHRoZSBzb3VyY2UgY29kZS5cbiAqXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogY29uc3QgY29uZmlnOiBBY3Rpb25Db25maWcgPSB7XG4gKiAgIGFjdGlvbk5hbWU6ICdMYXVuY2ggQ2xhdWRlJyxcbiAqICAgZGVzY3JpcHRpb246ICdTdGFydCBhIENsYXVkZSBjb2Rpbmcgc2Vzc2lvbicsXG4gKiAgIGljb246ICcuL2ljb25zL2NsYXVkZS5zdmcnLFxuICogICBzdXBwb3J0c0JhY2tncm91bmRNb2RlOiB0cnVlLFxuICogICB0aW1lb3V0OiAzMDAwMFxuICogfTtcbiAqIGBgYFxuICovXG5leHBvcnQgaW50ZXJmYWNlIEFjdGlvbkNvbmZpZyB7XG4gIC8qKlxuICAgKiBTdGFibGUgaWRlbnRpZmllciBmb3IgdGhlIGFjdGlvbiB1c2VkIGluIHRlbGVtZXRyeSwgbG9jYWxpemF0aW9uLCBhbmQgQVBJIGxvb2t1cHMuXG4gICAqXG4gICAqIFNob3VsZCBiZSBsb3dlcmNhc2Ugd2l0aCBoeXBoZW5zIChlLmcuLCAnbGF1bmNoLWNsYXVkZScsICdydW4tdGVzdHMnKS5cbiAgICogSWYgb21pdHRlZCwgdGhlIENMSSBnZW5lcmF0ZXMgYW4gSUQgYnkgc2x1Z2lmeWluZyBgYWN0aW9uTmFtZWAuXG4gICAqL1xuICBpZD86IHN0cmluZztcblxuICAvKipcbiAgICogVGhlIGFjdGlvbiBuYW1lIHVzZWQgdG8gaWRlbnRpZnkgdGhlIGFjdGlvbiBpbiBzZXR0aW5ncy5qc29uLlxuICAgKlxuICAgKiBUaGlzIG5hbWUgYXBwZWFycyBpbiB0aGUgVUkuIEtlZXAgaXQgY29uY2lzZSBidXQgZGVzY3JpcHRpdmUuXG4gICAqL1xuICBhY3Rpb25OYW1lOiBzdHJpbmc7XG5cbiAgLyoqXG4gICAqIEh1bWFuLXJlYWRhYmxlIGRlc2NyaXB0aW9uIHNob3duIGluIGJ1dHRvbiB0b29sdGlwLlxuICAgKlxuICAgKiBFeHBsYWluIHdoYXQgdGhlIGFjdGlvbiBkb2VzIGluIGEgZmV3IHdvcmRzLiBTaG93biBvbiBob3ZlciBpbiB0aGUgVUkuXG4gICAqL1xuICBkZXNjcmlwdGlvbj86IHN0cmluZztcblxuICAvKipcbiAgICogUGF0aCB0byBpY29uIGZpbGUgZm9yIHRoZSBhY3Rpb24gYnV0dG9uLlxuICAgKlxuICAgKiBQYXRocyBhcmUgcmVsYXRpdmUgdG8gdGhlIHNldHRpbmdzLmpzb24gZmlsZSBsb2NhdGlvbi5cbiAgICogU1ZHIGZvcm1hdCByZWNvbW1lbmRlZCBmb3IgY3Jpc3AgcmVuZGVyaW5nIGF0IGFueSBzaXplLlxuICAgKi9cbiAgaWNvbj86IHN0cmluZztcblxuICAvKipcbiAgICogV2hldGhlciB0byBzaG93IHRoZSBleGVjdXRpb24gbW9kZSB0b2dnbGUgaW4gdGhlIFVJLlxuICAgKlxuICAgKiBXaGVuIHRydWUsIHVzZXJzIGNhbiBjaG9vc2UgYmV0d2VlbiBpbnRlcmFjdGl2ZSBhbmQgYmFja2dyb3VuZCBtb2Rlcy5cbiAgICogV2hlbiBmYWxzZSAoZGVmYXVsdCksIHRoZSBhY3Rpb24gYWx3YXlzIHJ1bnMgaW4gaW50ZXJhY3RpdmUgbW9kZS5cbiAgICovXG4gIHN1cHBvcnRzQmFja2dyb3VuZE1vZGU/OiBib29sZWFuO1xuXG4gIC8qKlxuICAgKiBXaGV0aGVyIG11bHRpcGxlIGluc3RhbmNlcyBjYW4gcnVuIHNpbXVsdGFuZW91c2x5IG9uIHRoZSBzYW1lIGNhcmQuXG4gICAqXG4gICAqIFdoZW4gZmFsc2UgKGRlZmF1bHQpLCBzdGFydGluZyB0aGUgYWN0aW9uIHdoaWxlIGl0J3MgcnVubmluZyB3aWxsIGJlXG4gICAqIGJsb2NrZWQuIFNldCB0byB0cnVlIGZvciBpZGVtcG90ZW50IGFjdGlvbnMgdGhhdCBjYW4gc2FmZWx5IG92ZXJsYXAuXG4gICAqL1xuICBhbGxvd0NvbmN1cnJlbnQ/OiBib29sZWFuO1xuXG4gIC8qKlxuICAgKiBNYXhpbXVtIGV4ZWN1dGlvbiB0aW1lIGluIG1pbGxpc2Vjb25kcy5cbiAgICpcbiAgICogSWYgdGhlIGFjdGlvbiBleGNlZWRzIHRoaXMgdGltZW91dCwgdGhlIHJ1bnRpbWUgd2lsbCB0ZXJtaW5hdGUgaXQuXG4gICAqIE9taXQgdG8gdXNlIHRoZSBwbGF0Zm9ybSdzIGRlZmF1bHQgdGltZW91dCBwb2xpY3kuXG4gICAqL1xuICB0aW1lb3V0PzogbnVtYmVyO1xuXG4gIC8qKlxuICAgKiBIYW5kbGVyIHNvdXJjZSBmaWxlIHBhdGgsIGluamVjdGVkIGJ5IHRoZSBgaW5qZWN0U291cmNlUGF0aGAgZXNidWlsZFxuICAgKiBwbHVnaW4gZHVyaW5nIGNvbmZpZyBsb2FkaW5nLiBEbyBub3Qgc2V0IG1hbnVhbGx5LlxuICAgKlxuICAgKiBAaW50ZXJuYWxcbiAgICovXG4gIHNvdXJjZVBhdGg/OiBzdHJpbmc7XG59XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIEhhbmRsZXIgVHlwZXNcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuLyoqXG4gKiBIYW5kbGVyIGZ1bmN0aW9uIHNpZ25hdHVyZSBmb3IgYWN0aW9uIGV2ZW50cy5cbiAqXG4gKiBUaHJvd2luZyBhbiBlcnJvciBzaWduYWxzIGFjdGlvbiBmYWlsdXJlLiBUaGUgZXJyb3IgbWVzc2FnZSBpcyBsb2dnZWQgYW5kXG4gKiBzdXJmYWNlZCB0byB0aGUgdXNlci4gRm9yIGV4cGVjdGVkIGVycm9ycywgdGhyb3cgd2l0aCBhIGRlc2NyaXB0aXZlIG1lc3NhZ2UuXG4gKlxuICogQHBhcmFtIGlucHV0IC0gQWN0aW9uIGlucHV0IHBheWxvYWQgZnJvbSBlbnZpcm9ubWVudCB2YXJpYWJsZXNcbiAqIEBwYXJhbSBjb250ZXh0IC0gUnVudGltZSBjb250ZXh0IHdpdGggbG9nZ2VyLCBjd2QsIGFuZCBjYWxsYmFjayBtZXRob2RzXG4gKiBAcmV0dXJucyBQcm9taXNlIHRoYXQgcmVzb2x2ZXMgd2hlbiB0aGUgYWN0aW9uIGNvbXBsZXRlc1xuICpcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBjb25zdCBoYW5kbGVyOiBBY3Rpb25IYW5kbGVyID0gYXN5bmMgKGlucHV0LCB7IGxvZ2dlciwgb25DYW5jZWwgfSkgPT4ge1xuICogICBvbkNhbmNlbCgoKSA9PiB7XG4gKiAgICAgbG9nZ2VyLmluZm8oJ0NhbmNlbGxpbmcgYWN0aW9uJyk7XG4gKiAgIH0pO1xuICpcbiAqICAgdHJ5IHtcbiAqICAgICBsb2dnZXIuaW5mbygnU3RhcnRpbmcgYWN0aW9uJywgeyBjYXJkSWQ6IGlucHV0LmNhcmRJZCB9KTtcbiAqICAgICBhd2FpdCBwZXJmb3JtQWN0aW9uKGlucHV0KTtcbiAqICAgICBsb2dnZXIuaW5mbygnQWN0aW9uIGNvbXBsZXRlZCBzdWNjZXNzZnVsbHknKTtcbiAqICAgfSBjYXRjaCAoZXJyKSB7XG4gKiAgICAgbG9nZ2VyLmxvZ0Vycm9yKGVyciwgJ0FjdGlvbiBmYWlsZWQnKTtcbiAqICAgICB0aHJvdyBlcnI7IC8vIFJlLXRocm93IHRvIHNpZ25hbCBmYWlsdXJlXG4gKiAgIH1cbiAqIH07XG4gKiBgYGBcbiAqL1xuZXhwb3J0IHR5cGUgQWN0aW9uSGFuZGxlciA9IChpbnB1dDogQWN0aW9uSW5wdXQsIGNvbnRleHQ6IEFjdGlvbkNvbnRleHQpID0+IHZvaWQgfCBQcm9taXNlPHZvaWQ+O1xuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBGYWN0b3J5IEZ1bmN0aW9uXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbi8qKlxuICogQ3JlYXRlcyBhbiBhY3Rpb24gaGFuZGxlciB3aXRoIG1ldGFkYXRhIGZvciBzZXR0aW5ncy5qc29uIGdlbmVyYXRpb24uXG4gKlxuICogVGhpcyBmYWN0b3J5IHdyYXBzIHlvdXIgaGFuZGxlciBmdW5jdGlvbiBhbmQgYXR0YWNoZXMgbWV0YWRhdGEgdGhhdCB0aGUgQ0xJXG4gKiBleHRyYWN0cyB3aGVuIGJ1aWxkaW5nIHNldHRpbmdzLmpzb24uIFRoZSByZXR1cm5lZCBjb21tYW5kIGlzIGJvdGggY2FsbGFibGVcbiAqIChmb3IgdGhlIHJ1bnRpbWUpIGFuZCBpbnNwZWN0YWJsZSAoZm9yIHRoZSBDTEkpLlxuICpcbiAqIFRoZSBnZW5lcmljIHBhcmFtZXRlciBwcmVzZXJ2ZXMgdGhlIGFjdGlvbiBuYW1lIGFzIGEgbGl0ZXJhbCB0eXBlLlxuICpcbiAqIEB0ZW1wbGF0ZSBUIC0gVGhlIGNvbmZpZyB0eXBlIGV4dGVuZGluZyBBY3Rpb25Db25maWdcbiAqIEBwYXJhbSBjb25maWcgLSBBY3Rpb24gbWV0YWRhdGEgKHVzZXMgU2FtZVNoYXBlIHRvIGNhdGNoIHR5cG9zKVxuICogQHBhcmFtIGhhbmRsZXIgLSBBc3luYyBmdW5jdGlvbiB0aGF0IGltcGxlbWVudHMgdGhlIGFjdGlvbiBsb2dpY1xuICogQHJldHVybnMgQSBjYWxsYWJsZSBjb21tYW5kIHdpdGggYXR0YWNoZWQgbWV0YWRhdGFcbiAqXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogLy8gQmFzaWMgdXNhZ2VcbiAqIGV4cG9ydCBkZWZhdWx0IGRlZmluZUFjdGlvbihcbiAqICAgeyBhY3Rpb25OYW1lOiAnTGF1bmNoIENsYXVkZScgfSxcbiAqICAgYXN5bmMgKGlucHV0LCB7IGxvZ2dlciB9KSA9PiB7XG4gKiAgICAgbG9nZ2VyLmluZm8oJ0xhdW5jaGluZyBDbGF1ZGUnLCB7IGNhcmRJZDogaW5wdXQuY2FyZElkIH0pO1xuICogICAgIGF3YWl0IHNwYXduQ2xhdWRlKGlucHV0KTtcbiAqICAgfVxuICogKTtcbiAqIGBgYFxuICpcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiAvLyBXaXRoIGZ1bGwgY29uZmlndXJhdGlvblxuICogZXhwb3J0IGRlZmF1bHQgZGVmaW5lQWN0aW9uKFxuICogICB7XG4gKiAgICAgYWN0aW9uTmFtZTogJ0RlcGxveSBBcHBsaWNhdGlvbicsXG4gKiAgICAgZGVzY3JpcHRpb246ICdEZXBsb3kgdG8gcHJvZHVjdGlvbicsXG4gKiAgICAgaWNvbjogJy4vaWNvbnMvZGVwbG95LnN2ZycsXG4gKiAgICAgc3VwcG9ydHNCYWNrZ3JvdW5kTW9kZTogdHJ1ZSxcbiAqICAgICBhbGxvd0NvbmN1cnJlbnQ6IGZhbHNlLFxuICogICAgIHRpbWVvdXQ6IDYwMDAwXG4gKiAgIH0sXG4gKiAgIGFzeW5jIChpbnB1dCwgY29udGV4dCkgPT4ge1xuICogICAgIGNvbnRleHQub25DYW5jZWwoKCkgPT4gY2xlYW51cCgpKTtcbiAqICAgICBhd2FpdCBkZXBsb3koaW5wdXQsIGNvbnRleHQpO1xuICogICB9XG4gKiApO1xuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBkZWZpbmVBY3Rpb248VCBleHRlbmRzIEFjdGlvbkNvbmZpZz4oXG4gIGNvbmZpZzogU2FtZVNoYXBlPEFjdGlvbkNvbmZpZywgVD4sXG4gIGhhbmRsZXI6IEFjdGlvbkhhbmRsZXJcbik6IEFjdGlvbkNvbW1hbmQ8VFsnYWN0aW9uTmFtZSddPiB7XG4gIGNvbnN0IGZuID0gYXN5bmMgKGlucHV0OiBBY3Rpb25JbnB1dCwgY29udGV4dDogQWN0aW9uQ29udGV4dCk6IFByb21pc2U8dm9pZD4gPT4ge1xuICAgIGF3YWl0IGhhbmRsZXIoaW5wdXQsIGNvbnRleHQpO1xuICB9O1xuXG4gIGZuLmZhY3RvcnlUeXBlID0gJ2FjdGlvbicgYXMgY29uc3Q7XG4gIGZuLmlkID0gY29uZmlnLmlkO1xuICBmbi5hY3Rpb25OYW1lID0gY29uZmlnLmFjdGlvbk5hbWU7XG4gIGZuLmRlc2NyaXB0aW9uID0gY29uZmlnLmRlc2NyaXB0aW9uO1xuICBmbi5pY29uID0gY29uZmlnLmljb247XG4gIGZuLnN1cHBvcnRzQmFja2dyb3VuZE1vZGUgPSBjb25maWcuc3VwcG9ydHNCYWNrZ3JvdW5kTW9kZTtcbiAgZm4uYWxsb3dDb25jdXJyZW50ID0gY29uZmlnLmFsbG93Q29uY3VycmVudDtcbiAgZm4udGltZW91dCA9IGNvbmZpZy50aW1lb3V0O1xuICBmbi5zb3VyY2VQYXRoID0gY29uZmlnLnNvdXJjZVBhdGg7XG5cbiAgcmV0dXJuIGZuIGFzIEFjdGlvbkNvbW1hbmQ8VFsnYWN0aW9uTmFtZSddPjtcbn1cbiIsICIvKipcbiAqIEVudmlyb25tZW50IHZhcmlhYmxlIHV0aWxpdGllcyBmb3IgQ2FyZHMgRXh0ZW5zaW9uIGFjdGlvbnMgYW5kIHR5cGUgaG9va3MuXG4gKlxuICogVGhlIGV4ZWN1dGlvbiB3cmFwcGVyIGluamVjdHMgYWN0aW9uIGFuZCB0eXBlIGhvb2sgaW5wdXRzIHZpYSBwcm9jZXNzLmVudi5cbiAqIFRoaXMgbW9kdWxlIHByb3ZpZGVzIHN0cmljdCBnZXR0ZXJzIGFuZCB0eXBlZCBleHRyYWN0b3JzIHNvIGhhbmRsZXJzIGRvIG5vdFxuICogbmVlZCB0byBwYXJzZSBlbnZpcm9ubWVudCB2YXJpYWJsZXMgbWFudWFsbHkuXG4gKlxuICogVXNlIHRoZSBpbmRpdmlkdWFsIGdldHRlcnMgd2hlbiB5b3Ugb25seSBuZWVkIG9uZSB2YWx1ZTsgdXNlXG4gKiB7QGxpbmsgZXh0cmFjdEFjdGlvbklucHV0fSBvciB7QGxpbmsgZXh0cmFjdFR5cGVJbnB1dH0gd2hlbiB5b3UgbmVlZCBhIGZ1bGxcbiAqIHR5cGVkIHBheWxvYWQgZm9yIGFuIGFjdGlvbiBvciB0eXBlIGhvb2suXG4gKlxuICpcbiAqIEBzdW1tYXJ5IEVudmlyb25tZW50IHZhcmlhYmxlIHV0aWxpdGllcyBmb3IgQ2FyZHMgRXh0ZW5zaW9uIGFjdGlvbnMgYW5kIHR5cGUgaG9va3NcbiAqIEBtb2R1bGVcbiAqL1xuXG5pbXBvcnQgeyByZWFkRmlsZVN5bmMgfSBmcm9tICdub2RlOmZzJztcbmltcG9ydCB0eXBlIHsgQWN0aW9uSW5wdXQsIFR5cGVIb29rSW5wdXQgfSBmcm9tICcuL2lucHV0cy5qcyc7XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIENvbnN0YW50c1xuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4vKipcbiAqIEVudmlyb25tZW50IHZhcmlhYmxlIG5hbWVzIHNldCBieSB0aGUgQ2FyZHMgZXhlY3V0aW9uIHdyYXBwZXIuXG4gKlxuICogVGhpcyBpcyB0aGUgc2luZ2xlIHNvdXJjZSBvZiB0cnV0aCBmb3IgZW52IHZhciBrZXlzIHVzZWQgYnkgYWN0aW9uIGFuZCB0eXBlXG4gKiBob29rIHByb2Nlc3Nlcy4gS2VlcCBpdCBpbiBzeW5jIHdpdGggdGhlIHdyYXBwZXIgdG8gYXZvaWQgc3VidGxlIFwidW5kZWZpbmVkXG4gKiBpbnB1dFwiIGJ1Z3MuXG4gKi9cbmV4cG9ydCBjb25zdCBDQVJEU19FTlZfVkFSUyA9IHtcbiAgLyoqXG4gICAqIFVuaXF1ZSBpZGVudGlmaWVyIGZvciB0aGUgY3VycmVudCBjYXJkLlxuICAgKiBBdmFpbGFibGUgaW4gYWxsIGFjdGlvbnMgYW5kIHR5cGUgaG9va3MuXG4gICAqL1xuICBDQVJEX0lEOiAnQ0FSRF9JRCcsXG5cbiAgLyoqXG4gICAqIFRoZSBlbnZpcm9ubWVudCBuYW1lIGZyb20gc2V0dGluZ3MuanNvbi5cbiAgICogQXZhaWxhYmxlIGluIGFsbCBhY3Rpb25zIGFuZCB0eXBlIGhvb2tzLlxuICAgKi9cbiAgRU5WSVJPTk1FTlQ6ICdFTlZJUk9OTUVOVCcsXG5cbiAgLyoqXG4gICAqIERpc3BsYXkgbmFtZSBvZiB0aGUgYWN0aW9uIGJ1dHRvbiB0aGF0IHRyaWdnZXJlZCB0aGlzIGhhbmRsZXIuXG4gICAqIEF2YWlsYWJsZSBpbiBhY3Rpb25zIG9ubHkgKG5vdCB0eXBlIGhvb2tzKS5cbiAgICovXG4gIEFDVElPTl9OQU1FOiAnQUNUSU9OX05BTUUnLFxuXG4gIC8qKlxuICAgKiBDYXJkJ3MgZXhlY3V0aW9uIG1vZGUsIGRldGVybWluaW5nIFVJIGludGVyYWN0aW9uIG1vZGVsLlxuICAgKiBBdmFpbGFibGUgaW4gYWN0aW9ucyBvbmx5IChub3QgdHlwZSBob29rcykuXG4gICAqIFZhbGlkIHZhbHVlczogJ2ludGVyYWN0aXZlJyB8ICdiYWNrZ3JvdW5kJ1xuICAgKi9cbiAgRVhFQ1VUSU9OX01PREU6ICdFWEVDVVRJT05fTU9ERScsXG5cbiAgLyoqXG4gICAqIENhcmRzIHNlcnZlciBiYXNlIFVSTCBmb3IgQVBJIGNhbGxzLlxuICAgKiBBdmFpbGFibGUgaW4gYWxsIGFjdGlvbnMgYW5kIHR5cGUgaG9va3MuXG4gICAqL1xuICBBUElfQkFTRV9VUkw6ICdBUElfQkFTRV9VUkwnLFxuXG4gIC8qKlxuICAgKiBBdXRoZW50aWNhdGlvbiB0b2tlbiBmb3IgQVBJIGNhbGxzLlxuICAgKiBBdmFpbGFibGUgaW4gYWxsIGFjdGlvbnMgYW5kIHR5cGUgaG9va3MuXG4gICAqL1xuICBBUElfQUNDRVNTX1RPS0VOOiAnQVBJX0FDQ0VTU19UT0tFTicsXG5cbiAgLyoqXG4gICAqIENvbmZpZ3VyZWQgY29kaW5nIGFnZW50IGlkZW50aWZpZXIgZnJvbSBjYXJkcy5jb2RpbmdBZ2VudCBzZXR0aW5nLlxuICAgKiBBdmFpbGFibGUgaW4gYWN0aW9ucyBvbmx5IChub3QgdHlwZSBob29rcykuXG4gICAqIE9wdGlvbmFsLlxuICAgKi9cbiAgQ09ESU5HX0FHRU5UOiAnQ09ESU5HX0FHRU5UJyxcblxuICAvKipcbiAgICogVGhlIHJlZ2lzdGVyZWQgdHlwZSBuYW1lLlxuICAgKiBBdmFpbGFibGUgaW4gdHlwZSBob29rcyBvbmx5LlxuICAgKi9cbiAgVFlQRV9OQU1FOiAnVFlQRV9OQU1FJyxcblxuICAvKipcbiAgICogVGhlIHR5cGUncyB2ZXJzaW9uIHN0cmluZyBmcm9tIHNldHRpbmdzLmpzb24gY29uZmlndXJhdGlvbi5cbiAgICogQXZhaWxhYmxlIGluIHR5cGUgaG9va3Mgb25seS5cbiAgICovXG4gIFRZUEVfVkVSU0lPTjogJ1RZUEVfVkVSU0lPTicsXG5cbiAgLyoqXG4gICAqIFRoZSBmaWxlIG5hbWUgd2l0aGluIHRoZSB0eXBlIGRpcmVjdG9yeS5cbiAgICogQXZhaWxhYmxlIGluIHR5cGUgaG9va3Mgb25seS5cbiAgICovXG4gIEZJTEVfTkFNRTogJ0ZJTEVfTkFNRScsXG5cbiAgLyoqXG4gICAqIEZ1bGwgcGF0aCB0byB0aGUgZmlsZS5cbiAgICogQXZhaWxhYmxlIGluIHR5cGUgaG9va3Mgb25seS5cbiAgICovXG4gIEZJTEVfUEFUSDogJ0ZJTEVfUEFUSCcsXG5cbiAgLyoqXG4gICAqIEZpbGUgc2l6ZSBpbiBieXRlcy5cbiAgICogQXZhaWxhYmxlIGluIHR5cGUgaG9va3Mgb25seS5cbiAgICovXG4gIEZJTEVfU0laRTogJ0ZJTEVfU0laRScsXG5cbiAgLyoqXG4gICAqIFNIQTI1NiBoYXNoIG9mIGNvbnRlbnQuXG4gICAqIEF2YWlsYWJsZSBpbiB0eXBlIGhvb2tzIG9ubHkuXG4gICAqL1xuICBTSEEyNTY6ICdTSEEyNTYnLFxuXG4gIC8qKlxuICAgKiBNSU1FIHR5cGUgb2YgdGhlIGNvbnRlbnQuXG4gICAqIEF2YWlsYWJsZSBpbiB0eXBlIGhvb2tzIG9ubHkuXG4gICAqL1xuICBDT05URU5UX1RZUEU6ICdDT05URU5UX1RZUEUnLFxuXG4gIC8qKlxuICAgKiBQYXRoIHRvIHRoZSBWUyBDb2RlIGJ1bmRsZWQgTm9kZS5qcyBpbnRlcnByZXRlci5cbiAgICpcbiAgICogU2V0IGJ5IHRoZSBleHRlbnNpb24gaG9zdCBmcm9tIGBwcm9jZXNzLmV4ZWNQYXRoYCAod2l0aFxuICAgKiBgRUxFQ1RST05fUlVOX0FTX05PREU9MWApLiBDb21tYW5kcyBpbiBzZXR0aW5ncy5qc29uIHVzZVxuICAgKiBgJFZTQ09ERV9OT0RFIC4vYmluLy4uLmAgc28gdGhleSB3b3JrIHJlZ2FyZGxlc3Mgb2ZcbiAgICogd2hldGhlciBgbm9kZWAgaXMgb24gdGhlIHN5c3RlbSBQQVRILlxuICAgKlxuICAgKiBBdmFpbGFibGUgaW4gYWxsIGFjdGlvbnMgYW5kIHR5cGUgaG9va3MuXG4gICAqL1xuICBWU0NPREVfTk9ERTogJ1ZTQ09ERV9OT0RFJyxcblxuICAvKipcbiAgICogUGF0aCB0byB0aGUgTm9kZS5qcyBpbnRlcnByZXRlciBydW5uaW5nIHRoZSB3cmFwcGVyIHByb2Nlc3MuXG4gICAqXG4gICAqIFNldCBieSB0aGUgd3JhcHBlciBmcm9tIGBwcm9jZXNzLmV4ZWNQYXRoYC4gVXNlIGAkTk9ERWAgaW4gZW1iZWRkZWRcbiAgICogYmFzaCBzdGF0ZW1lbnRzIHRvIGludm9rZSBOb2RlIHNjcmlwdHMgcG9ydGFibHkuXG4gICAqXG4gICAqIEF2YWlsYWJsZSBpbiBhbGwgYWN0aW9ucy5cbiAgICovXG4gIE5PREU6ICdOT0RFJyxcblxuICAvKipcbiAgICogUGF0aCB0byB0aGUgVW5peCBkb21haW4gc29ja2V0IGZvciBydW50aW1lLXRvLWRpc3BhdGNoZXIgY29tbXVuaWNhdGlvbi5cbiAgICogQXZhaWxhYmxlIGluIGFjdGlvbnMgb25seS5cbiAgICovXG4gIFNPQ0tFVF9QQVRIOiAnU09DS0VUX1BBVEgnLFxuXG4gIC8qKlxuICAgKiBQYXRoIHRvIGEgSlNPTiBmaWxlIGNvbnRhaW5pbmcgc3dpdGNoVG9JbnRlcmFjdGl2ZSBkYXRhIGZyb20gYSBwcmV2aW91cyBoYW5kbGVyLlxuICAgKiBBdmFpbGFibGUgaW4gYWN0aW9ucyBvbmx5LiBPcHRpb25hbC5cbiAgICovXG4gIFNXSVRDSF9UT19JTlRFUkFDVElWRV9EQVRBX1BBVEg6ICdTV0lUQ0hfVE9fSU5URVJBQ1RJVkVfREFUQV9QQVRIJyxcblxuICAvKipcbiAgICogUGF0aCB0byB0aGUgc2V0dGluZ3MgY29uZmlndXJhdGlvbiBkaXJlY3RvcnkuXG4gICAqIEF2YWlsYWJsZSBpbiBhY3Rpb25zIG9ubHkuXG4gICAqL1xuICBDT05GSUdfUEFUSDogJ0NPTkZJR19QQVRIJyxcblxuICAvKipcbiAgICogUGF0aCB0byB0aGUgVlMgQ29kZSB3b3Jrc3BhY2Ugcm9vdCBkaXJlY3RvcnkuXG4gICAqIFNldCBieSB0aGUgYWN0aW9uIGhhbmRsZXIgKGUuZy4sIGxhdW5jaC50cykgdG8gdGhlIHdvcmt0cmVlIHBhdGguXG4gICAqIEF2YWlsYWJsZSBpbiBob29rcyBydW5uaW5nIGluc2lkZSB0aGUgY2xhdWRlIENMSS5cbiAgICovXG4gIFdPUktTUEFDRV9QQVRIOiAnV09SS1NQQUNFX1BBVEgnLFxuXG4gIC8qKlxuICAgKiBBYnNvbHV0ZSBwYXRoIHRvIHRoZSBtYWluIGdpdCByZXBvc2l0b3J5IHJvb3QgKE5PVCBhIHdvcmt0cmVlKS5cbiAgICogU2V0IGJ5IEFjdGlvbkRpc3BhdGNoZXI7IGNvbnN1bWVkIGJ5IHRoZSB3cmFwcGVyIGFuZCB3YXRjaGVyIGZvclxuICAgKiBnaXQgb3BlcmF0aW9ucyAod29ya3RyZWUgcmVtb3ZhbCwgYnJhbmNoIGRlbGV0aW9uKSB0aGF0IG11c3QgcnVuXG4gICAqIGFnYWluc3QgdGhlIG1haW4gcmVwb3NpdG9yeS5cbiAgICovXG4gIFJFUE9fUk9PVDogJ1JFUE9fUk9PVCcsXG5cbiAgLyoqXG4gICAqIFBhdGggdG8gdGhlIGNhcmQncyByZXBvc2l0b3J5IGRpcmVjdG9yeS5cbiAgICogQXZhaWxhYmxlIGluIGFjdGlvbnMgb25seS5cbiAgICovXG4gIENBUkRfUkVQT19QQVRIOiAnQ0FSRF9SRVBPX1BBVEgnLFxuXG4gIC8qKlxuICAgKiBSZXNvbHZlZCBzaGVsbCBjb21tYW5kIGZvciB0aGUgd3JhcHBlciB0byBzcGF3biBhcyB0aGUgYWN0aW9uIGhhbmRsZXIuXG4gICAqIFNldCBieSBBY3Rpb25EaXNwYXRjaGVyOyBjb25zdW1lZCBieSB0aGUgd3JhcHBlciAobm90IGJ5IGFjdGlvbiBoYW5kbGVycykuXG4gICAqL1xuICBBQ1RJT05fQ09NTUFORDogJ0FDVElPTl9DT01NQU5EJyxcblxuICAvKipcbiAgICogR2l0IGJyYW5jaCB0aGF0IHRoZSBjYXJkJ3Mgd29ya3NwYWNlIGJyYW5jaCB3aWxsIG1lcmdlIGludG8uXG4gICAqIFJlc29sdmVkIGZyb20gdGhlIHdvcmtzcGFjZSBIRUFEIGF0IGxhdW5jaCB0aW1lLlxuICAgKiBTZXQgYnkgdGhlIGxhdW5jaCBhY3Rpb24uXG4gICAqIEF2YWlsYWJsZSBpbiBhY3Rpb25zIG9ubHkuXG4gICAqL1xuICBCQVNFX0JSQU5DSDogJ0JBU0VfQlJBTkNIJyxcblxuICAvKipcbiAgICogR2l0IGJyYW5jaCBmcm9tIHdoaWNoIHRoZSBjYXJkJ3Mgd29ya3NwYWNlIGJyYW5jaCB3YXMgY3JlYXRlZC5cbiAgICogTWF5IGRpZmZlciBmcm9tIEJBU0VfQlJBTkNIIHdoZW4gdGhlIHdvcmt0cmVlIHdhcyBjcmVhdGVkIGFnYWluc3RcbiAgICogYSBkaWZmZXJlbnQgcmVmIHRoYW4gdGhlIGN1cnJlbnQgd29ya3NwYWNlIEhFQUQuXG4gICAqIFNldCBieSB0aGUgbGF1bmNoIGFjdGlvbi5cbiAgICogQXZhaWxhYmxlIGluIGFjdGlvbnMgb25seS5cbiAgICovXG4gIFBBUkVOVF9CUkFOQ0g6ICdQQVJFTlRfQlJBTkNIJyxcblxuICAvKipcbiAgICogR2l0IGJyYW5jaCBuYW1lIGZvciB0aGUgY2FyZCdzIHdvcmtzcGFjZSBpbXBsZW1lbnRhdGlvbi5cbiAgICogU2V0IGJ5IHRoZSBsYXVuY2ggYWN0aW9uIGFmdGVyIHJlc29sdmluZyBvciBjcmVhdGluZyB0aGUgd29ya3RyZWUuXG4gICAqIEF2YWlsYWJsZSBpbiBhY3Rpb25zIG9ubHkuXG4gICAqL1xuICBXT1JLU1BBQ0VfQlJBTkNIOiAnV09SS1NQQUNFX0JSQU5DSCcsXG5cbiAgLyoqXG4gICAqIFNlc3Npb24gSUQgcGVyc2lzdGVkIGJ5IHRoZSBzZXNzaW9uLXN0YXJ0IGhvb2sgdmlhIGBwZXJzaXN0RW52VmFyYC5cbiAgICpcbiAgICogQXZhaWxhYmxlIGluIEJhc2ggdG9vbCBzaGVsbCBkZXNjZW5kYW50cyAoY29tbWFuZHMsIGdpdCBob29rcykgYWZ0ZXJcbiAgICogc2Vzc2lvbiBzdGFydC4gTk9UIGF2YWlsYWJsZSBpbiBob29rcyBzcGF3bmVkIGRpcmVjdGx5IGJ5IENsYXVkZSBDb2RlXG4gICAqIChzdG9wLCBzZXNzaW9uLWVuZCwgZXRjLikgXHUyMDE0IHRob3NlIHJlY2VpdmUgdGhlIHNlc3Npb24gSUQgdmlhIGhvb2sgaW5wdXQuXG4gICAqXG4gICAqIFRoZSBjYXJkLXJlcG8gcG9zdC1jb21taXQgaG9vayByZWFkcyB0aGlzIHRvIHJlY29yZCBjb21taXRzIGRpcmVjdGx5XG4gICAqIHdpdGhvdXQgbmVlZGluZyBhIHByb2Nlc3MtdHJlZSB3YWxrIG9yIFBJRCByZWdpc3RyeSBsb29rdXAuXG4gICAqL1xuICBDQVJEU19TRVNTSU9OX0lEOiAnQ0FSRFNfU0VTU0lPTl9JRCcsXG5cbiAgLyoqXG4gICAqIEFic29sdXRlIHBhdGggdG8gdGhlIFZTIENvZGUgZXh0ZW5zaW9uIGluc3RhbGxhdGlvbiBkaXJlY3RvcnkuXG4gICAqXG4gICAqIFNldCBieSB0aGUgZXh0ZW5zaW9uIGhvc3QgZnJvbSBgY29udGV4dC5leHRlbnNpb25VcmkuZnNQYXRoYCBhbmQgaW5qZWN0ZWRcbiAgICogaW50byBhbGwgc3Bhd25lZCBhY3Rpb24gcHJvY2Vzc2VzLiBVc2UgdGhpcyB0byBsb2NhdGUgYnVuZGxlZCBhc3NldHMgc3VjaFxuICAgKiBhcyB0aGUgcnVudGltZSBwbHVnaW4gZGlyZWN0b3J5IChgPGV4dGVuc2lvblBhdGg+L2Rpc3QvcGx1Z2lucy9ydW50aW1lYCkuXG4gICAqXG4gICAqIEF2YWlsYWJsZSBpbiBhY3Rpb25zIG9ubHkgKG5vdCB0eXBlIGhvb2tzKS5cbiAgICovXG4gIEVYVEVOU0lPTl9QQVRIOiAnRVhURU5TSU9OX1BBVEgnXG59IGFzIGNvbnN0O1xuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBJbmRpdmlkdWFsIEdldHRlcnNcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuLyoqXG4gKiBSZWFkcyB0aGUgY2FyZCBpZGVudGlmaWVyIGZyb20gdGhlIGVudmlyb25tZW50LlxuICpcbiAqIFRoZSBleGVjdXRpb24gd3JhcHBlciBhbHdheXMgc2V0cyB0aGlzIGZvciBldmVyeSBhY3Rpb24gYW5kIHR5cGUgaG9vay5cbiAqIEByZXR1cm5zIFRoZSBjdXJyZW50IGNhcmQgSURcbiAqIEB0aHJvd3MgRXJyb3IgaWYgQ0FSRF9JRCBpcyBtaXNzaW5nIG9yIGVtcHR5XG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogY29uc3QgY2FyZElkID0gZ2V0Q2FyZElkKCk7XG4gKiBjb25zb2xlLmxvZyhgUHJvY2Vzc2luZyBjYXJkOiAke2NhcmRJZH1gKTtcbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0Q2FyZElkKCk6IHN0cmluZyB7XG4gIGNvbnN0IHZhbHVlID0gcHJvY2Vzcy5lbnZbQ0FSRFNfRU5WX1ZBUlMuQ0FSRF9JRF07XG4gIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IHZhbHVlID09PSAnJykge1xuICAgIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyByZXF1aXJlZCBlbnZpcm9ubWVudCB2YXJpYWJsZTogJHtDQVJEU19FTlZfVkFSUy5DQVJEX0lEfWApO1xuICB9XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuLyoqXG4gKiBSZWFkcyB0aGUgZW52aXJvbm1lbnQgbmFtZSBmcm9tIHRoZSBlbnZpcm9ubWVudC5cbiAqXG4gKiBUaGlzIHZhbHVlIG1hdGNoZXMgdGhlIGVudmlyb25tZW50IGtleSBpbiBzZXR0aW5ncy5qc29uIChlLmcuLCBcImRlZmF1bHRcIiwgXCJzdGFnaW5nXCIpLlxuICogQHJldHVybnMgVGhlIGVudmlyb25tZW50IG5hbWVcbiAqIEB0aHJvd3MgRXJyb3IgaWYgRU5WSVJPTk1FTlQgaXMgbWlzc2luZyBvciBlbXB0eVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGNvbnN0IGVudmlyb25tZW50ID0gZ2V0RW52aXJvbm1lbnQoKTtcbiAqIGNvbnNvbGUubG9nKGBFbnZpcm9ubWVudDogJHtlbnZpcm9ubWVudH1gKTtcbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0RW52aXJvbm1lbnQoKTogc3RyaW5nIHtcbiAgY29uc3QgdmFsdWUgPSBwcm9jZXNzLmVudltDQVJEU19FTlZfVkFSUy5FTlZJUk9OTUVOVF07XG4gIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IHZhbHVlID09PSAnJykge1xuICAgIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyByZXF1aXJlZCBlbnZpcm9ubWVudCB2YXJpYWJsZTogJHtDQVJEU19FTlZfVkFSUy5FTlZJUk9OTUVOVH1gKTtcbiAgfVxuICByZXR1cm4gdmFsdWU7XG59XG5cbi8qKlxuICogUmVhZHMgdGhlIGFjdGlvbiBidXR0b24gbmFtZSBmcm9tIHRoZSBlbnZpcm9ubWVudC5cbiAqXG4gKiBUaGlzIGlzIHRoZSBkaXNwbGF5IG5hbWUgb2YgdGhlIGFjdGlvbiB0aGF0IHRyaWdnZXJlZCB0aGUgaGFuZGxlciwgbWF0Y2hpbmdcbiAqIHRoZSBgYWN0aW9uTmFtZWAgZmllbGQgZnJvbSBgZGVmaW5lQWN0aW9uYC5cbiAqIEByZXR1cm5zIERpc3BsYXkgbmFtZSBvZiB0aGUgYWN0aW9uIHRoYXQgdHJpZ2dlcmVkIHRoZSBjdXJyZW50IGhhbmRsZXIgcnVuLlxuICogQHRocm93cyBFcnJvciBpZiBBQ1RJT05fTkFNRSBpcyBtaXNzaW5nIG9yIGVtcHR5XG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogY29uc3QgYWN0aW9uTmFtZSA9IGdldEFjdGlvbk5hbWUoKTtcbiAqIGNvbnNvbGUubG9nKGBSdW5uaW5nIGFjdGlvbjogJHthY3Rpb25OYW1lfWApO1xuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRBY3Rpb25OYW1lKCk6IHN0cmluZyB7XG4gIGNvbnN0IHZhbHVlID0gcHJvY2Vzcy5lbnZbQ0FSRFNfRU5WX1ZBUlMuQUNUSU9OX05BTUVdO1xuICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gJycpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYE1pc3NpbmcgcmVxdWlyZWQgZW52aXJvbm1lbnQgdmFyaWFibGU6ICR7Q0FSRFNfRU5WX1ZBUlMuQUNUSU9OX05BTUV9YCk7XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG4vKipcbiAqIFJlYWRzIHRoZSBleGVjdXRpb24gbW9kZSBmcm9tIHRoZSBlbnZpcm9ubWVudC5cbiAqXG4gKiBEZXRlcm1pbmVzIHRoZSBVSSBpbnRlcmFjdGlvbiBtb2RlbCBmb3IgYWN0aW9ucy5cbiAqIEByZXR1cm5zIFRoZSBleGVjdXRpb24gbW9kZSAoJ2ludGVyYWN0aXZlJyBvciAnYmFja2dyb3VuZCcpXG4gKiBAdGhyb3dzIEVycm9yIGlmIEVYRUNVVElPTl9NT0RFIGlzIG1pc3NpbmcsIGVtcHR5LCBvciBpbnZhbGlkXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogY29uc3QgbW9kZSA9IGdldEV4ZWN1dGlvbk1vZGUoKTtcbiAqIGlmIChtb2RlID09PSAnaW50ZXJhY3RpdmUnKSB7XG4gKiAgIC8vIFNob3cgdXNlciBwcm9tcHRzXG4gKiB9XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldEV4ZWN1dGlvbk1vZGUoKTogJ2ludGVyYWN0aXZlJyB8ICdiYWNrZ3JvdW5kJyB7XG4gIGNvbnN0IHZhbHVlID0gcHJvY2Vzcy5lbnZbQ0FSRFNfRU5WX1ZBUlMuRVhFQ1VUSU9OX01PREVdO1xuICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gJycpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYE1pc3NpbmcgcmVxdWlyZWQgZW52aXJvbm1lbnQgdmFyaWFibGU6ICR7Q0FSRFNfRU5WX1ZBUlMuRVhFQ1VUSU9OX01PREV9YCk7XG4gIH1cbiAgaWYgKHZhbHVlICE9PSAnaW50ZXJhY3RpdmUnICYmIHZhbHVlICE9PSAnYmFja2dyb3VuZCcpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYEludmFsaWQgJHtDQVJEU19FTlZfVkFSUy5FWEVDVVRJT05fTU9ERX06IGV4cGVjdGVkICdpbnRlcmFjdGl2ZScgb3IgJ2JhY2tncm91bmQnLCBnb3QgXCIke3ZhbHVlfVwiYCk7XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG4vKipcbiAqIFJlYWRzIHRoZSBBUEkgYmFzZSBVUkwgZnJvbSB0aGUgZW52aXJvbm1lbnQuXG4gKlxuICogVXNlIHRoaXMgYXMgdGhlIGJhc2UgZm9yIGNvbnN0cnVjdGluZyBBUEkgZW5kcG9pbnRzLiBUaGUgVVJMIGRvZXMgbm90IGluY2x1ZGVcbiAqIGEgdHJhaWxpbmcgc2xhc2guXG4gKiBAcmV0dXJucyBCYXNlIFVSTCB1c2VkIHRvIGNvbnN0cnVjdCBDYXJkcyBBUEkgZW5kcG9pbnRzIGZvciB0aGlzIGV4ZWN1dGlvbi5cbiAqIEB0aHJvd3MgRXJyb3IgaWYgQVBJX0JBU0VfVVJMIGlzIG1pc3Npbmcgb3IgZW1wdHlcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBjb25zdCBhcGlVcmwgPSBnZXRBcGlCYXNlVXJsKCk7XG4gKiBjb25zdCBlbmRwb2ludCA9IGAke2FwaVVybH0vY2FyZHMvJHtjYXJkSWR9YDtcbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0QXBpQmFzZVVybCgpOiBzdHJpbmcge1xuICBjb25zdCB2YWx1ZSA9IHByb2Nlc3MuZW52W0NBUkRTX0VOVl9WQVJTLkFQSV9CQVNFX1VSTF07XG4gIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IHZhbHVlID09PSAnJykge1xuICAgIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyByZXF1aXJlZCBlbnZpcm9ubWVudCB2YXJpYWJsZTogJHtDQVJEU19FTlZfVkFSUy5BUElfQkFTRV9VUkx9YCk7XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG4vKipcbiAqIFJlYWRzIHRoZSBBUEkgYWNjZXNzIHRva2VuIGZyb20gdGhlIGVudmlyb25tZW50LlxuICpcbiAqIEJlYXJlciB0b2tlbiB2YWxpZCBmb3IgdGhlIGR1cmF0aW9uIG9mIHRoaXMgYWN0aW9uIG9yIHR5cGUgaG9vayBleGVjdXRpb24uXG4gKiBJbmNsdWRlIGluIEF1dGhvcml6YXRpb24gaGVhZGVycyB3aGVuIGNhbGxpbmcgdGhlIENhcmRzIEFQSS5cbiAqIEByZXR1cm5zIEJlYXJlciB0b2tlbiB0aGF0IGF1dGhvcml6ZXMgQVBJIHJlcXVlc3RzIGZvciB0aGlzIGV4ZWN1dGlvbiBjb250ZXh0LlxuICogQHRocm93cyBFcnJvciBpZiBBUElfQUNDRVNTX1RPS0VOIGlzIG1pc3Npbmcgb3IgZW1wdHlcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBjb25zdCB0b2tlbiA9IGdldEFwaUFjY2Vzc1Rva2VuKCk7XG4gKiBjb25zdCByZXNwb25zZSA9IGF3YWl0IGZldGNoKGFwaVVybCwge1xuICogICBoZWFkZXJzOiB7IEF1dGhvcml6YXRpb246IGBCZWFyZXIgJHt0b2tlbn1gIH1cbiAqIH0pO1xuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRBcGlBY2Nlc3NUb2tlbigpOiBzdHJpbmcge1xuICBjb25zdCB2YWx1ZSA9IHByb2Nlc3MuZW52W0NBUkRTX0VOVl9WQVJTLkFQSV9BQ0NFU1NfVE9LRU5dO1xuICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gJycpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYE1pc3NpbmcgcmVxdWlyZWQgZW52aXJvbm1lbnQgdmFyaWFibGU6ICR7Q0FSRFNfRU5WX1ZBUlMuQVBJX0FDQ0VTU19UT0tFTn1gKTtcbiAgfVxuICByZXR1cm4gdmFsdWU7XG59XG5cbi8qKlxuICogUmVhZHMgdGhlIGNvbmZpZ3VyZWQgY29kaW5nIGFnZW50IGlkZW50aWZpZXIgZnJvbSB0aGUgZW52aXJvbm1lbnQuXG4gKlxuICogT3B0aW9uYWwgdmFsdWUgZnJvbSBjYXJkcy5jb2RpbmdBZ2VudCBzZXR0aW5nLiBXaGVuIHNldCwgaW5kaWNhdGVzIHdoaWNoIEFJXG4gKiBjb2RpbmcgYXNzaXN0YW50IHRoZSB1c2VyIHByZWZlcnMuIEFjdGlvbnMgY2FuIHVzZSB0aGlzIHRvIGN1c3RvbWl6ZSBiZWhhdmlvclxuICogb3IgcHJvbXB0cyBmb3IgZGlmZmVyZW50IGFnZW50cy5cbiAqIEByZXR1cm5zIFRoZSBjb2RpbmcgYWdlbnQgaWRlbnRpZmllciwgb3IgdW5kZWZpbmVkIGlmIG5vdCBzZXRcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBjb25zdCBjb2RpbmdBZ2VudCA9IGdldENvZGluZ0FnZW50KCk7XG4gKiBpZiAoY29kaW5nQWdlbnQgPT09ICdjbGF1ZGUnKSB7XG4gKiAgIC8vIEN1c3RvbWl6ZSBmb3IgQ2xhdWRlXG4gKiB9XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldENvZGluZ0FnZW50KCk6IHN0cmluZyB8IHVuZGVmaW5lZCB7XG4gIGNvbnN0IHZhbHVlID0gcHJvY2Vzcy5lbnZbQ0FSRFNfRU5WX1ZBUlMuQ09ESU5HX0FHRU5UXTtcbiAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQgfHwgdmFsdWUgPT09ICcnKSB7XG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfVxuICByZXR1cm4gdmFsdWU7XG59XG5cbi8qKlxuICogUmVhZHMgdGhlIHJlZ2lzdGVyZWQgdHlwZSBuYW1lIGZvciB0eXBlIGhvb2tzLlxuICpcbiAqIFRoaXMgdmFsdWUgaXMgb25seSBwcmVzZW50IGZvciB0eXBlIGhvb2sgZXZlbnRzLlxuICogQHJldHVybnMgVGhlIHJlZ2lzdGVyZWQgdHlwZSBuYW1lXG4gKiBAdGhyb3dzIEVycm9yIGlmIFRZUEVfTkFNRSBpcyBtaXNzaW5nIG9yIGVtcHR5XG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogY29uc3QgdHlwZU5hbWUgPSBnZXRUeXBlTmFtZSgpO1xuICogY29uc29sZS5sb2coYFR5cGU6ICR7dHlwZU5hbWV9YCk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldFR5cGVOYW1lKCk6IHN0cmluZyB7XG4gIGNvbnN0IHZhbHVlID0gcHJvY2Vzcy5lbnZbQ0FSRFNfRU5WX1ZBUlMuVFlQRV9OQU1FXTtcbiAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQgfHwgdmFsdWUgPT09ICcnKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIHJlcXVpcmVkIGVudmlyb25tZW50IHZhcmlhYmxlOiAke0NBUkRTX0VOVl9WQVJTLlRZUEVfTkFNRX1gKTtcbiAgfVxuICByZXR1cm4gdmFsdWU7XG59XG5cbi8qKlxuICogUmVhZHMgdGhlIHR5cGUgdmVyc2lvbiBmcm9tIHRoZSBlbnZpcm9ubWVudC5cbiAqXG4gKiBUaGlzIHZlcnNpb24gY29tZXMgZnJvbSB0aGUgdHlwZSBjb25maWd1cmF0aW9uIGluIHNldHRpbmdzLmpzb24uXG4gKiBAcmV0dXJucyBUaGUgdmVyc2lvbiBzdHJpbmcgZnJvbSB0eXBlIGNvbmZpZ1xuICogQHRocm93cyBFcnJvciBpZiBUWVBFX1ZFUlNJT04gaXMgbWlzc2luZyBvciBlbXB0eVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGNvbnN0IHZlcnNpb24gPSBnZXRUeXBlVmVyc2lvbigpO1xuICogY29uc29sZS5sb2coYFZlcnNpb246ICR7dmVyc2lvbn1gKTtcbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0VHlwZVZlcnNpb24oKTogc3RyaW5nIHtcbiAgY29uc3QgdmFsdWUgPSBwcm9jZXNzLmVudltDQVJEU19FTlZfVkFSUy5UWVBFX1ZFUlNJT05dO1xuICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gJycpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYE1pc3NpbmcgcmVxdWlyZWQgZW52aXJvbm1lbnQgdmFyaWFibGU6ICR7Q0FSRFNfRU5WX1ZBUlMuVFlQRV9WRVJTSU9OfWApO1xuICB9XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuLyoqXG4gKiBSZWFkcyB0aGUgdHlwZWQgZmlsZSBuYW1lIGZvciB0eXBlIGhvb2sgZXZlbnRzLlxuICpcbiAqIFRoaXMgaXMgdGhlIGZpbGUgbmFtZSByZWxhdGl2ZSB0byB0aGUgdHlwZSBkaXJlY3RvcnksIG5vdCBhIGZ1bGwgcGF0aC5cbiAqIEByZXR1cm5zIFRoZSBmaWxlIG5hbWUgd2l0aGluIHRoZSB0eXBlIGRpcmVjdG9yeVxuICogQHRocm93cyBFcnJvciBpZiBGSUxFX05BTUUgaXMgbWlzc2luZyBvciBlbXB0eVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGNvbnN0IGZpbGVOYW1lID0gZ2V0RmlsZU5hbWUoKTtcbiAqIGNvbnNvbGUubG9nKGBGaWxlOiAke2ZpbGVOYW1lfWApO1xuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRGaWxlTmFtZSgpOiBzdHJpbmcge1xuICBjb25zdCB2YWx1ZSA9IHByb2Nlc3MuZW52W0NBUkRTX0VOVl9WQVJTLkZJTEVfTkFNRV07XG4gIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IHZhbHVlID09PSAnJykge1xuICAgIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyByZXF1aXJlZCBlbnZpcm9ubWVudCB2YXJpYWJsZTogJHtDQVJEU19FTlZfVkFSUy5GSUxFX05BTUV9YCk7XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG4vKipcbiAqIFJlYWRzIHRoZSBhYnNvbHV0ZSBwYXRoIHRvIHRoZSB0eXBlZCBmaWxlLlxuICpcbiAqIFRoaXMgaXMgdGhlIGZ1bGx5IHJlc29sdmVkIHBhdGggb24gZGlzayBwcm92aWRlZCBieSB0aGUgZXhlY3V0aW9uIHdyYXBwZXIuXG4gKiBAcmV0dXJucyBUaGUgZnVsbCBwYXRoIHRvIHRoZSBmaWxlXG4gKiBAdGhyb3dzIEVycm9yIGlmIEZJTEVfUEFUSCBpcyBtaXNzaW5nIG9yIGVtcHR5XG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogY29uc3QgZmlsZVBhdGggPSBnZXRGaWxlUGF0aCgpO1xuICogY29uc29sZS5sb2coYFBhdGg6ICR7ZmlsZVBhdGh9YCk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldEZpbGVQYXRoKCk6IHN0cmluZyB7XG4gIGNvbnN0IHZhbHVlID0gcHJvY2Vzcy5lbnZbQ0FSRFNfRU5WX1ZBUlMuRklMRV9QQVRIXTtcbiAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQgfHwgdmFsdWUgPT09ICcnKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIHJlcXVpcmVkIGVudmlyb25tZW50IHZhcmlhYmxlOiAke0NBUkRTX0VOVl9WQVJTLkZJTEVfUEFUSH1gKTtcbiAgfVxuICByZXR1cm4gdmFsdWU7XG59XG5cbi8qKlxuICogUmVhZHMgdGhlIHR5cGVkIGZpbGUgc2l6ZSBmcm9tIHRoZSBlbnZpcm9ubWVudC5cbiAqXG4gKiBUaGUgdmFsdWUgaXMgcGFyc2VkIGFzIGEgYmFzZS0xMCBpbnRlZ2VyLlxuICogQHJldHVybnMgVGhlIGZpbGUgc2l6ZSBpbiBieXRlc1xuICogQHRocm93cyBFcnJvciBpZiBGSUxFX1NJWkUgaXMgbWlzc2luZyBvciBub3QgYSBudW1iZXJcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBjb25zdCBzaXplID0gZ2V0RmlsZVNpemUoKTtcbiAqIGNvbnNvbGUubG9nKGBTaXplOiAke3NpemV9IGJ5dGVzYCk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldEZpbGVTaXplKCk6IG51bWJlciB7XG4gIGNvbnN0IHZhbHVlID0gcHJvY2Vzcy5lbnZbQ0FSRFNfRU5WX1ZBUlMuRklMRV9TSVpFXTtcbiAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQgfHwgdmFsdWUgPT09ICcnKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIHJlcXVpcmVkIGVudmlyb25tZW50IHZhcmlhYmxlOiAke0NBUkRTX0VOVl9WQVJTLkZJTEVfU0laRX1gKTtcbiAgfVxuICBjb25zdCBzaXplID0gTnVtYmVyLnBhcnNlSW50KHZhbHVlLCAxMCk7XG4gIGlmIChOdW1iZXIuaXNOYU4oc2l6ZSkpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYEludmFsaWQgJHtDQVJEU19FTlZfVkFSUy5GSUxFX1NJWkV9OiBleHBlY3RlZCBudW1iZXIsIGdvdCBcIiR7dmFsdWV9XCJgKTtcbiAgfVxuICByZXR1cm4gc2l6ZTtcbn1cblxuLyoqXG4gKiBSZWFkcyB0aGUgU0hBMjU2IGhhc2ggZm9yIHRoZSB0eXBlZCBmaWxlIGNvbnRlbnQuXG4gKlxuICogVXNlZnVsIGZvciBkZXRlY3RpbmcgY29udGVudCBjaGFuZ2VzIHdpdGhvdXQgcmVhZGluZyB0aGUgZmlsZSBhZ2Fpbi5cbiAqIEByZXR1cm5zIFRoZSBTSEEyNTYgaGFzaCBvZiB0aGUgY29udGVudFxuICogQHRocm93cyBFcnJvciBpZiBTSEEyNTYgaXMgbWlzc2luZyBvciBlbXB0eVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGNvbnN0IGhhc2ggPSBnZXRTaGEyNTYoKTtcbiAqIGNvbnNvbGUubG9nKGBIYXNoOiAke2hhc2h9YCk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldFNoYTI1NigpOiBzdHJpbmcge1xuICBjb25zdCB2YWx1ZSA9IHByb2Nlc3MuZW52W0NBUkRTX0VOVl9WQVJTLlNIQTI1Nl07XG4gIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IHZhbHVlID09PSAnJykge1xuICAgIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyByZXF1aXJlZCBlbnZpcm9ubWVudCB2YXJpYWJsZTogJHtDQVJEU19FTlZfVkFSUy5TSEEyNTZ9YCk7XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG4vKipcbiAqIFJlYWRzIHRoZSBNSU1FIHR5cGUgZm9yIHRoZSB0eXBlZCBmaWxlIGNvbnRlbnQuXG4gKlxuICogUHJvdmlkZWQgZm9yIHR5cGUgaG9vayBldmVudHMgc28gdmFsaWRhdG9ycyBjYW4gYnJhbmNoIG9uIGNvbnRlbnQgdHlwZS5cbiAqIEByZXR1cm5zIFRoZSBNSU1FIHR5cGUgb2YgdGhlIGNvbnRlbnRcbiAqIEB0aHJvd3MgRXJyb3IgaWYgQ09OVEVOVF9UWVBFIGlzIG1pc3Npbmcgb3IgZW1wdHlcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBjb25zdCBjb250ZW50VHlwZSA9IGdldENvbnRlbnRUeXBlKCk7XG4gKiBjb25zb2xlLmxvZyhgQ29udGVudCB0eXBlOiAke2NvbnRlbnRUeXBlfWApO1xuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRDb250ZW50VHlwZSgpOiBzdHJpbmcge1xuICBjb25zdCB2YWx1ZSA9IHByb2Nlc3MuZW52W0NBUkRTX0VOVl9WQVJTLkNPTlRFTlRfVFlQRV07XG4gIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IHZhbHVlID09PSAnJykge1xuICAgIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyByZXF1aXJlZCBlbnZpcm9ubWVudCB2YXJpYWJsZTogJHtDQVJEU19FTlZfVkFSUy5DT05URU5UX1RZUEV9YCk7XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG4vKipcbiAqIFJlYWRzIHRoZSBWUyBDb2RlIGJ1bmRsZWQgTm9kZS5qcyBpbnRlcnByZXRlciBwYXRoIGZyb20gdGhlIGVudmlyb25tZW50LlxuICpcbiAqIFRoaXMgaXMgc2V0IGJ5IHRoZSBleHRlbnNpb24gZHVyaW5nIGFjdGl2YXRpb24gYW5kIGluamVjdGVkIGludG8gYWxsXG4gKiBzcGF3bmVkIGFjdGlvbi9ob29rIHByb2Nlc3Nlcy4gQ29uZmlndXJhdGlvbiBhdXRob3JzIGNhbiB1c2UgaXQgdG8gaW52b2tlXG4gKiBOb2RlLmpzIHdpdGhvdXQgcmVseWluZyBvbiB0aGUgc3lzdGVtIFBBVEguXG4gKlxuICogQHJldHVybnMgVGhlIHBhdGggdG8gdGhlIE5vZGUuanMgaW50ZXJwcmV0ZXJcbiAqIEB0aHJvd3MgRXJyb3IgaWYgVlNDT0RFX05PREUgaXMgbWlzc2luZyBvciBlbXB0eVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGNvbnN0IG5vZGVQYXRoID0gZ2V0VnNjb2RlTm9kZVBhdGgoKTtcbiAqIGV4ZWNGaWxlU3luYyhub2RlUGF0aCwgWydzY3JpcHQuanMnXSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldFZzY29kZU5vZGVQYXRoKCk6IHN0cmluZyB7XG4gIGNvbnN0IHZhbHVlID0gcHJvY2Vzcy5lbnZbQ0FSRFNfRU5WX1ZBUlMuVlNDT0RFX05PREVdO1xuICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gJycpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYE1pc3NpbmcgcmVxdWlyZWQgZW52aXJvbm1lbnQgdmFyaWFibGU6ICR7Q0FSRFNfRU5WX1ZBUlMuVlNDT0RFX05PREV9YCk7XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG4vKipcbiAqIFJlYWRzIHRoZSBVbml4IGRvbWFpbiBzb2NrZXQgcGF0aCBmb3IgcnVudGltZS10by1kaXNwYXRjaGVyIGNvbW11bmljYXRpb24uXG4gKlxuICogQHJldHVybnMgVW5peCBzb2NrZXQgcGF0aCB1c2VkIHRvIHNlbmQgcnVudGltZSBjb250cm9sIG1lc3NhZ2VzLlxuICogQHRocm93cyBFcnJvciBpZiBTT0NLRVRfUEFUSCBpcyBtaXNzaW5nIG9yIGVtcHR5XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRTb2NrZXRQYXRoKCk6IHN0cmluZyB7XG4gIGNvbnN0IHZhbHVlID0gcHJvY2Vzcy5lbnZbQ0FSRFNfRU5WX1ZBUlMuU09DS0VUX1BBVEhdO1xuICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gJycpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYE1pc3NpbmcgcmVxdWlyZWQgZW52aXJvbm1lbnQgdmFyaWFibGU6ICR7Q0FSRFNfRU5WX1ZBUlMuU09DS0VUX1BBVEh9YCk7XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG4vKipcbiAqIFJlYWRzIHRoZSBwYXRoIHRvIHRoZSBzd2l0Y2hUb0ludGVyYWN0aXZlIGRhdGEgZmlsZS5cbiAqXG4gKiBUaGlzIGlzIG9wdGlvbmFsIFx1MjAxNCByZXR1cm5zIHVuZGVmaW5lZCB3aGVuIG5vdCBzZXQgKGkuZS4sIHRoZSBhY3Rpb25cbiAqIHdhcyBub3QgcmVsYXVuY2hlZCB2aWEgc3dpdGNoVG9JbnRlcmFjdGl2ZSkuXG4gKlxuICogQHJldHVybnMgVGhlIGZpbGUgcGF0aCwgb3IgdW5kZWZpbmVkIGlmIG5vdCBzZXRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldFN3aXRjaFRvSW50ZXJhY3RpdmVEYXRhUGF0aCgpOiBzdHJpbmcgfCB1bmRlZmluZWQge1xuICBjb25zdCB2YWx1ZSA9IHByb2Nlc3MuZW52W0NBUkRTX0VOVl9WQVJTLlNXSVRDSF9UT19JTlRFUkFDVElWRV9EQVRBX1BBVEhdO1xuICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gJycpIHtcbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuLyoqXG4gKiBSZWFkcyB0aGUgc2V0dGluZ3MgY29uZmlndXJhdGlvbiBkaXJlY3RvcnkgcGF0aC5cbiAqXG4gKiBAcmV0dXJucyBBYnNvbHV0ZSBwYXRoIHRvIHRoZSBkaXJlY3RvcnkgY29udGFpbmluZyBnZW5lcmF0ZWQgc2V0dGluZ3MgYXJ0aWZhY3RzLlxuICogQHRocm93cyBFcnJvciBpZiBDT05GSUdfUEFUSCBpcyBtaXNzaW5nIG9yIGVtcHR5XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRDb25maWdQYXRoKCk6IHN0cmluZyB7XG4gIGNvbnN0IHZhbHVlID0gcHJvY2Vzcy5lbnZbQ0FSRFNfRU5WX1ZBUlMuQ09ORklHX1BBVEhdO1xuICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gJycpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYE1pc3NpbmcgcmVxdWlyZWQgZW52aXJvbm1lbnQgdmFyaWFibGU6ICR7Q0FSRFNfRU5WX1ZBUlMuQ09ORklHX1BBVEh9YCk7XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG4vKipcbiAqIFJlYWRzIHRoZSB3b3Jrc3BhY2UgcGF0aCBzZXQgYnkgdGhlIGFjdGlvbiBoYW5kbGVyIChlLmcuLCB0aGUgd29ya3RyZWUgcGF0aCkuXG4gKlxuICogVGhpcyBpcyBmb3IgaG9va3MgcnVubmluZyBpbnNpZGUgdGhlIENsYXVkZSBDTEksICoqbm90KiogZm9yIGFjdGlvbiBoYW5kbGVycy5cbiAqIEFjdGlvbiBoYW5kbGVycyBzaG91bGQgdXNlIHtAbGluayBnZXRSZXBvUm9vdH0gaW5zdGVhZC5cbiAqXG4gKiBAcmV0dXJucyBBYnNvbHV0ZSBwYXRoIHRvIHRoZSBhY3RpdmUgd29ya3NwYWNlIC8gd29ya3RyZWUuXG4gKiBAdGhyb3dzIEVycm9yIGlmIFdPUktTUEFDRV9QQVRIIGlzIG1pc3Npbmcgb3IgZW1wdHlcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldFdvcmtzcGFjZVBhdGgoKTogc3RyaW5nIHtcbiAgY29uc3QgdmFsdWUgPSBwcm9jZXNzLmVudltDQVJEU19FTlZfVkFSUy5XT1JLU1BBQ0VfUEFUSF07XG4gIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IHZhbHVlID09PSAnJykge1xuICAgIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyByZXF1aXJlZCBlbnZpcm9ubWVudCB2YXJpYWJsZTogJHtDQVJEU19FTlZfVkFSUy5XT1JLU1BBQ0VfUEFUSH1gKTtcbiAgfVxuICByZXR1cm4gdmFsdWU7XG59XG5cbi8qKlxuICogUmVhZHMgdGhlIG1haW4gZ2l0IHJlcG9zaXRvcnkgcm9vdCBwYXRoLlxuICpcbiAqIFNldCBieSBBY3Rpb25EaXNwYXRjaGVyOyB1c2VkIGJ5IGFjdGlvbiBoYW5kbGVycyB0byByZXNvbHZlIHdvcmt0cmVlc1xuICogYW5kIHBlcmZvcm0gZ2l0IG9wZXJhdGlvbnMgYWdhaW5zdCB0aGUgbWFpbiByZXBvc2l0b3J5LlxuICpcbiAqIEByZXR1cm5zIEFic29sdXRlIHBhdGggdG8gdGhlIG1haW4gZ2l0IHJlcG9zaXRvcnkgcm9vdCAoTk9UIGEgd29ya3RyZWUpLlxuICogQHRocm93cyBFcnJvciBpZiBSRVBPX1JPT1QgaXMgbWlzc2luZyBvciBlbXB0eVxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0UmVwb1Jvb3QoKTogc3RyaW5nIHtcbiAgY29uc3QgdmFsdWUgPSBwcm9jZXNzLmVudltDQVJEU19FTlZfVkFSUy5SRVBPX1JPT1RdO1xuICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gJycpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYE1pc3NpbmcgcmVxdWlyZWQgZW52aXJvbm1lbnQgdmFyaWFibGU6ICR7Q0FSRFNfRU5WX1ZBUlMuUkVQT19ST09UfWApO1xuICB9XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuLyoqXG4gKiBSZWFkcyB0aGUgY2FyZCdzIHJlcG9zaXRvcnkgZGlyZWN0b3J5IHBhdGguXG4gKlxuICogQHJldHVybnMgQWJzb2x1dGUgcGF0aCB0byB0aGUgcmVwb3NpdG9yeSBhc3NvY2lhdGVkIHdpdGggdGhlIGFjdGl2ZSBjYXJkLlxuICogQHRocm93cyBFcnJvciBpZiBDQVJEX1JFUE9fUEFUSCBpcyBtaXNzaW5nIG9yIGVtcHR5XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRDYXJkUmVwb1BhdGgoKTogc3RyaW5nIHtcbiAgY29uc3QgdmFsdWUgPSBwcm9jZXNzLmVudltDQVJEU19FTlZfVkFSUy5DQVJEX1JFUE9fUEFUSF07XG4gIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IHZhbHVlID09PSAnJykge1xuICAgIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyByZXF1aXJlZCBlbnZpcm9ubWVudCB2YXJpYWJsZTogJHtDQVJEU19FTlZfVkFSUy5DQVJEX1JFUE9fUEFUSH1gKTtcbiAgfVxuICByZXR1cm4gdmFsdWU7XG59XG5cbi8qKlxuICogUmVhZHMgdGhlIFZTIENvZGUgZXh0ZW5zaW9uIGluc3RhbGxhdGlvbiBkaXJlY3RvcnkgcGF0aC5cbiAqXG4gKiBTZXQgYnkgdGhlIGV4dGVuc2lvbiBob3N0IGZyb20gYGNvbnRleHQuZXh0ZW5zaW9uVXJpLmZzUGF0aGAgYW5kIGluamVjdGVkXG4gKiBpbnRvIGFsbCBzcGF3bmVkIGFjdGlvbiBwcm9jZXNzZXMuIFVzZSB0aGlzIHRvIGxvY2F0ZSBidW5kbGVkIGFzc2V0cyBzdWNoXG4gKiBhcyB0aGUgcnVudGltZSBwbHVnaW4gZGlyZWN0b3J5IChgPGV4dGVuc2lvblBhdGg+L2Rpc3QvcGx1Z2lucy9ydW50aW1lYCkuXG4gKlxuICogQHJldHVybnMgQWJzb2x1dGUgcGF0aCB0byB0aGUgZXh0ZW5zaW9uIGluc3RhbGxhdGlvbiBkaXJlY3RvcnkuXG4gKiBAdGhyb3dzIEVycm9yIGlmIEVYVEVOU0lPTl9QQVRIIGlzIG1pc3Npbmcgb3IgZW1wdHlcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldEV4dGVuc2lvblBhdGgoKTogc3RyaW5nIHtcbiAgY29uc3QgdmFsdWUgPSBwcm9jZXNzLmVudltDQVJEU19FTlZfVkFSUy5FWFRFTlNJT05fUEFUSF07XG4gIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IHZhbHVlID09PSAnJykge1xuICAgIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyByZXF1aXJlZCBlbnZpcm9ubWVudCB2YXJpYWJsZTogJHtDQVJEU19FTlZfVkFSUy5FWFRFTlNJT05fUEFUSH1gKTtcbiAgfVxuICByZXR1cm4gdmFsdWU7XG59XG5cbi8qKlxuICogUmVhZHMgYW5kIHBhcnNlcyB0aGUgc3dpdGNoVG9JbnRlcmFjdGl2ZSBkYXRhIGZpbGUuXG4gKlxuICogV2hlbiBgU1dJVENIX1RPX0lOVEVSQUNUSVZFX0RBVEFfUEFUSGAgaXMgc2V0LCByZWFkcyB0aGUgZmlsZSBhdCB0aGF0IHBhdGhcbiAqIGFuZCBwYXJzZXMgaXQgYXMgSlNPTi4gUmV0dXJucyB1bmRlZmluZWQgaWYgdGhlIGVudiB2YXIgaXMgbm90IHNldC5cbiAqXG4gKiBAcmV0dXJucyBUaGUgcGFyc2VkIGRhdGEsIG9yIHVuZGVmaW5lZCBpZiB0aGUgcGF0aCBpcyBub3Qgc2V0XG4gKiBAdGhyb3dzIEVycm9yIGlmIHRoZSBmaWxlIGNhbm5vdCBiZSByZWFkIG9yIGNvbnRhaW5zIGludmFsaWQgSlNPTlxuICovXG5leHBvcnQgZnVuY3Rpb24gcmVhZFN3aXRjaFRvSW50ZXJhY3RpdmVEYXRhKCk6IHVua25vd24gfCB1bmRlZmluZWQge1xuICBjb25zdCBkYXRhUGF0aCA9IGdldFN3aXRjaFRvSW50ZXJhY3RpdmVEYXRhUGF0aCgpO1xuICBpZiAoZGF0YVBhdGggPT09IHVuZGVmaW5lZCkge1xuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cbiAgY29uc3QgY29udGVudCA9IHJlYWRGaWxlU3luYyhkYXRhUGF0aCwgJ3V0Zi04Jyk7XG4gIHJldHVybiBKU09OLnBhcnNlKGNvbnRlbnQpO1xufVxuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBUeXBlZCBJbnB1dCBFeHRyYWN0aW9uXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbi8qKlxuICogQnVpbGRzIGEgdHlwZWQgYWN0aW9uIGlucHV0IG9iamVjdCBmcm9tIGVudmlyb25tZW50IHZhcmlhYmxlcy5cbiAqXG4gKiBFeHRyYWN0cyBhbGwgZmllbGRzIHJlcXVpcmVkIGZvciBhY3Rpb24gaGFuZGxlcnMuXG4gKlxuICogQHJldHVybnMgVHlwZWQgQWN0aW9uSW5wdXQgb2JqZWN0XG4gKiBAdGhyb3dzIEVycm9yIGlmIHJlcXVpcmVkIGVudiB2YXJzIGFyZSBtaXNzaW5nIG9yIGludmFsaWRcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiAvLyBGb3IgYW4gYWN0aW9uIGhhbmRsZXJcbiAqIGNvbnN0IGlucHV0ID0gZXh0cmFjdEFjdGlvbklucHV0KCk7XG4gKiBjb25zb2xlLmxvZyhpbnB1dC5jYXJkSWQpO1xuICogY29uc29sZS5sb2coaW5wdXQuZXhlY3V0aW9uTW9kZSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGV4dHJhY3RBY3Rpb25JbnB1dCgpOiBBY3Rpb25JbnB1dCB7XG4gIHJldHVybiB7XG4gICAgY2FyZElkOiBnZXRDYXJkSWQoKSxcbiAgICBhY3Rpb25OYW1lOiBnZXRBY3Rpb25OYW1lKCksXG4gICAgZW52aXJvbm1lbnQ6IGdldEVudmlyb25tZW50KCksXG4gICAgZXhlY3V0aW9uTW9kZTogZ2V0RXhlY3V0aW9uTW9kZSgpLFxuICAgIGFwaUJhc2VVcmw6IGdldEFwaUJhc2VVcmwoKSxcbiAgICBhcGlBY2Nlc3NUb2tlbjogZ2V0QXBpQWNjZXNzVG9rZW4oKSxcbiAgICBjb2RpbmdBZ2VudDogZ2V0Q29kaW5nQWdlbnQoKSxcbiAgICBzd2l0Y2hUb0ludGVyYWN0aXZlRGF0YTogcmVhZFN3aXRjaFRvSW50ZXJhY3RpdmVEYXRhKCksXG4gICAgcmVwb1Jvb3Q6IGdldFJlcG9Sb290KCksXG4gICAgY2FyZFJlcG9QYXRoOiBnZXRDYXJkUmVwb1BhdGgoKSxcbiAgICBjb25maWdQYXRoOiBnZXRDb25maWdQYXRoKCksXG4gICAgZXh0ZW5zaW9uUGF0aDogZ2V0RXh0ZW5zaW9uUGF0aCgpXG4gIH07XG59XG5cbi8qKlxuICogQnVpbGRzIGEgdHlwZWQgdHlwZSBob29rIGlucHV0IG9iamVjdCBmcm9tIGVudmlyb25tZW50IHZhcmlhYmxlcy5cbiAqXG4gKiBFeHRyYWN0cyBhbGwgZmllbGRzIHJlcXVpcmVkIGZvciB0eXBlIGxpZmVjeWNsZSBob29rcyAodmFsaWRhdG9yLCBjcmVhdGUsXG4gKiB1cGRhdGUsIGRlbGV0ZSkuXG4gKlxuICogQHJldHVybnMgVHlwZWQgVHlwZUhvb2tJbnB1dCBvYmplY3RcbiAqIEB0aHJvd3MgRXJyb3IgaWYgcmVxdWlyZWQgZW52IHZhcnMgYXJlIG1pc3Npbmcgb3IgaW52YWxpZFxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIC8vIEZvciBhIHR5cGUgaG9vayBoYW5kbGVyXG4gKiBjb25zdCBpbnB1dCA9IGV4dHJhY3RUeXBlSW5wdXQoKTtcbiAqIGNvbnNvbGUubG9nKGlucHV0LnR5cGVOYW1lKTtcbiAqIGNvbnNvbGUubG9nKGlucHV0LmZpbGVOYW1lKTtcbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gZXh0cmFjdFR5cGVJbnB1dCgpOiBUeXBlSG9va0lucHV0IHtcbiAgcmV0dXJuIHtcbiAgICBjYXJkSWQ6IGdldENhcmRJZCgpLFxuICAgIGVudmlyb25tZW50OiBnZXRFbnZpcm9ubWVudCgpLFxuICAgIHR5cGVOYW1lOiBnZXRUeXBlTmFtZSgpLFxuICAgIHR5cGVWZXJzaW9uOiBnZXRUeXBlVmVyc2lvbigpLFxuICAgIGZpbGVOYW1lOiBnZXRGaWxlTmFtZSgpLFxuICAgIGZpbGVQYXRoOiBnZXRGaWxlUGF0aCgpLFxuICAgIGZpbGVTaXplOiBnZXRGaWxlU2l6ZSgpLFxuICAgIGZpbGVTaGEyNTY6IGdldFNoYTI1NigpLFxuICAgIGNvbnRlbnRUeXBlOiBnZXRDb250ZW50VHlwZSgpLFxuICAgIGFwaUJhc2VVcmw6IGdldEFwaUJhc2VVcmwoKSxcbiAgICBhcGlBY2Nlc3NUb2tlbjogZ2V0QXBpQWNjZXNzVG9rZW4oKVxuICB9O1xufVxuIiwgIi8qKlxuICogRXhpdCBjb2RlIGNvbnN0YW50cyBhbmQgaGVscGVycyBmb3IgQ2FyZHMgRXh0ZW5zaW9uIGhvb2tzLlxuICpcbiAqIENhcmRzIGhvb2tzIGNvbW11bmljYXRlIHN1Y2Nlc3MgYW5kIGZhaWx1cmUgdmlhIHByb2Nlc3MgZXhpdCBjb2RlcyBhbmRcbiAqIHN0ZGVyciBvdXRwdXQuIFRoaXMgbW9kdWxlIGNlbnRyYWxpemVzIHRob3NlIGNvbnZlbnRpb25zIHNvIHRoZSBydW50aW1lXG4gKiBhbmQgaG9va3Mgc3BlYWsgdGhlIHNhbWUgcHJvdG9jb2wuXG4gKlxuICogQHN1bW1hcnkgRXhpdCBjb2RlIGNvbnN0YW50cyBhbmQgaGVscGVycyBmb3IgQ2FyZHMgRXh0ZW5zaW9uIGhvb2tzXG4gKiBAbW9kdWxlXG4gKi9cblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gRXhpdCBDb2RlIENvbnN0YW50c1xuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4vKipcbiAqIEV4aXQgY29kZXMgdXNlZCBieSBDYXJkcyBob29rcy5cbiAqXG4gKiBUaGUgQ2FyZHMgcnVudGltZSBpbnRlcnByZXRzIGFueSBub24temVybyBleGl0IGNvZGUgYXMgZmFpbHVyZS5cbiAqL1xuZXhwb3J0IGNvbnN0IEVYSVRfQ09ERVMgPSB7XG4gIC8qKiBIYW5kbGVyIGNvbXBsZXRlZCBzdWNjZXNzZnVsbHkuICovXG4gIFNVQ0NFU1M6IDAsXG4gIC8qKiBIYW5kbGVyIHRocmV3IGFuIGVycm9yLiAqL1xuICBFUlJPUjogMSxcbiAgLyoqIEhhbmRsZXIgcHJvY2Vzc2VkIHN3aXRjaFRvSW50ZXJhY3RpdmUgYW5kIGlzIGV4aXRpbmcgZm9yIHJlbGF1bmNoLiAqL1xuICBTV0lUQ0hfVE9fSU5URVJBQ1RJVkU6IDQyXG59IGFzIGNvbnN0O1xuXG4vKipcbiAqIFVuaW9uIG9mIHZhbGlkIENhcmRzIGhvb2sgZXhpdCBjb2Rlcy5cbiAqL1xuZXhwb3J0IHR5cGUgRXhpdENvZGUgPSAodHlwZW9mIEVYSVRfQ09ERVMpW2tleW9mIHR5cGVvZiBFWElUX0NPREVTXTtcblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gRXJyb3IgT3V0cHV0IEhlbHBlcnNcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuLyoqXG4gKiBXcml0ZXMgYW4gZXJyb3IgbWVzc2FnZSB0byBzdGRlcnIgd2l0aCBhIHRyYWlsaW5nIG5ld2xpbmUuXG4gKlxuICogVXNlIHRoaXMgd2hlbiBhIGhvb2sgbmVlZHMgdG8gcmVwb3J0IGEgZmFpbHVyZSB3aXRob3V0IHBvbGx1dGluZyBzdGRvdXQuXG4gKiBAcGFyYW0gbWVzc2FnZSAtIEVycm9yIG1lc3NhZ2UgdG8gd3JpdGVcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiB3cml0ZUVycm9yKCdGYWlsZWQgdG8gY29ubmVjdCB0byBkYXRhYmFzZScpO1xuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB3cml0ZUVycm9yKG1lc3NhZ2U6IHN0cmluZyk6IHZvaWQge1xuICBwcm9jZXNzLnN0ZGVyci53cml0ZShgJHttZXNzYWdlfVxcbmApO1xufVxuXG4vKipcbiAqIFdyaXRlcyBhbiBlcnJvciBtZXNzYWdlIHRvIHN0ZGVyciBhbmQgZXhpdHMgd2l0aCBFUlJPUiBjb2RlLlxuICpcbiAqIFRoaXMgdGVybWluYXRlcyB0aGUgcHJvY2VzcyBpbW1lZGlhdGVseSwgc28gYW55IHBlbmRpbmcgYXN5bmMgd29yayB3aWxsXG4gKiBub3QgZmluaXNoIHVubGVzcyBpdCB3YXMgYWxyZWFkeSBhd2FpdGVkLlxuICogQHBhcmFtIG1lc3NhZ2UgLSBFcnJvciBtZXNzYWdlIHRvIHdyaXRlIGJlZm9yZSBleGl0aW5nXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogaWYgKCFpc1ZhbGlkKSB7XG4gKiAgIGV4aXRXaXRoRXJyb3IoJ0ludmFsaWQgY29uZmlndXJhdGlvbicpO1xuICogfVxuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBleGl0V2l0aEVycm9yKG1lc3NhZ2U6IHN0cmluZyk6IG5ldmVyIHtcbiAgd3JpdGVFcnJvcihtZXNzYWdlKTtcbiAgcHJvY2Vzcy5leGl0KEVYSVRfQ09ERVMuRVJST1IpO1xufVxuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBJbnRlcm5hbCBSZXN1bHQgVHJhY2tpbmdcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuLyoqXG4gKiBJbnRlcm5hbCBydW50aW1lIGJvb2trZWVwaW5nIGZvciBob29rIGV4ZWN1dGlvbiByZXN1bHRzLlxuICpcbiAqIFRoaXMgc3RydWN0dXJlIGFsbG93cyB0aGUgcnVudGltZSB0byBjYXJyeSBlcnJvciBkZXRhaWxzIHdpdGhvdXQgY2hhbmdpbmdcbiAqIHRoZSBleGl0LWNvZGUgcHJvdG9jb2wuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgSG9va0V4ZWN1dGlvblJlc3VsdCB7XG4gIC8qKiBXaGV0aGVyIHRoZSBob29rIGV4ZWN1dGVkIHN1Y2Nlc3NmdWxseS4gKi9cbiAgc3VjY2VzczogYm9vbGVhbjtcbiAgLyoqIFRoZSBleGl0IGNvZGUgdG8gdXNlIHdoZW4gZXhpdGluZy4gKi9cbiAgZXhpdENvZGU6IEV4aXRDb2RlO1xuICAvKiogVGhlIGVycm9yIHRoYXQgb2NjdXJyZWQsIGlmIGFueS4gKi9cbiAgZXJyb3I/OiBFcnJvcjtcbn1cbiIsICIvKipcbiAqIFN0cnVjdHVyZWQgbG9nZ2luZyBmb3IgQ2FyZHMgRXh0ZW5zaW9uIGhvb2tzLlxuICpcbiAqIE91dHB1dCBpcyBvcHQtaW46IHRoZSBsb2dnZXIgb25seSBlbWl0cyB0byByZWdpc3RlcmVkIGhhbmRsZXJzIG9yIGFcbiAqIGNvbmZpZ3VyZWQgbG9nIGZpbGUuIElmIHlvdSBjb25maWd1cmUgbm90aGluZywgdGhlIGxvZ2dlciBwb2xpdGVseSBzYXlzXG4gKiBub3RoaW5nIGF0IGFsbC4gSXQgbmV2ZXIgd3JpdGVzIHRvIHN0ZG91dCBhbmQgYXZvaWRzIHN0ZGVyciB0byBrZWVwIGhvb2tcbiAqIHByb3RvY29scyBjbGVhbi5cbiAqXG4gKiBAc3VtbWFyeSBTdHJ1Y3R1cmVkIGxvZ2dpbmcgZm9yIENhcmRzIEV4dGVuc2lvbiBob29rc1xuICogQG1vZHVsZVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGltcG9ydCB7IGxvZ2dlciB9IGZyb20gJ0BjYXJkcy9zZGsvY29uZmlnJztcbiAqXG4gKiAvLyBTdWJzY3JpYmUgdG8gbG9nIGV2ZW50c1xuICogY29uc3QgdW5zdWJzY3JpYmUgPSBsb2dnZXIub24oJ2Vycm9yJywgKGV2ZW50KSA9PiB7XG4gKiAgIGNvbnNvbGUuZXJyb3IoYEVycm9yIGluICR7ZXZlbnQuaG9va1R5cGV9OiAke2V2ZW50Lm1lc3NhZ2V9YCk7XG4gKiB9KTtcbiAqXG4gKiAvLyBMYXRlciwgY2xlYW4gdXBcbiAqIHVuc3Vic2NyaWJlKCk7XG4gKiBgYGBcbiAqL1xuXG5pbXBvcnQgeyBjbG9zZVN5bmMsIGV4aXN0c1N5bmMsIG1rZGlyU3luYywgb3BlblN5bmMsIHdyaXRlU3luYyB9IGZyb20gJ25vZGU6ZnMnO1xuaW1wb3J0IHsgZGlybmFtZSB9IGZyb20gJ25vZGU6cGF0aCc7XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIExvZyBMZXZlbCBUeXBlc1xuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4vKipcbiAqIEF2YWlsYWJsZSBsb2cgbGV2ZWxzLlxuICpcbiAqIHwgTGV2ZWwgfCBTZXZlcml0eSB8IFVzZSBDYXNlIHxcbiAqIHwtLS0tLS0tfC0tLS0tLS0tLS18LS0tLS0tLS0tLXxcbiAqIHwgYGRlYnVnYCB8IExvd2VzdCB8IERldGFpbGVkIGRlYnVnZ2luZyBpbmZvcm1hdGlvbiB8XG4gKiB8IGBpbmZvYCB8IExvdyB8IEdlbmVyYWwgb3BlcmF0aW9uYWwgZXZlbnRzIHxcbiAqIHwgYHdhcm5gIHwgTWVkaXVtIHwgV2FybmluZyBjb25kaXRpb25zIHRoYXQgbWF5IGluZGljYXRlIGlzc3VlcyB8XG4gKiB8IGBlcnJvcmAgfCBIaWdoIHwgRXJyb3IgY29uZGl0aW9ucyByZXF1aXJpbmcgYXR0ZW50aW9uIHxcbiAqL1xuZXhwb3J0IHR5cGUgTG9nTGV2ZWwgPSAnZGVidWcnIHwgJ2luZm8nIHwgJ3dhcm4nIHwgJ2Vycm9yJztcblxuLyoqXG4gKiBBbGwgbG9nIGxldmVscyBpbiBvcmRlciBvZiBzZXZlcml0eSAobG93ZXN0IHRvIGhpZ2hlc3QpLlxuICovXG5leHBvcnQgY29uc3QgTE9HX0xFVkVMUyA9IFsnZGVidWcnLCAnaW5mbycsICd3YXJuJywgJ2Vycm9yJ10gYXMgY29uc3Qgc2F0aXNmaWVzIHJlYWRvbmx5IExvZ0xldmVsW107XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIExvZyBFdmVudCBUeXBlXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbi8qKlxuICogU3RydWN0dXJlZCBsb2cgZXZlbnQgZW1pdHRlZCBieSB0aGUgbG9nZ2VyLlxuICpcbiAqIEV2ZW50cyBpbmNsdWRlIGNvbnRleHR1YWwgZGV0YWlscyBhYm91dCBob29rIGV4ZWN1dGlvbiBhbmQgYXJlIHN1aXRhYmxlIGZvclxuICogZGVidWdnaW5nLCBtb25pdG9yaW5nLCBhbmQgYW5hbHl0aWNzIHBpcGVsaW5lcy5cbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiAvLyBFeGFtcGxlIGxvZyBldmVudFxuICogY29uc3QgZXZlbnQ6IExvZ0V2ZW50ID0ge1xuICogICB0aW1lc3RhbXA6ICcyMDI0LTAxLTE1VDEwOjMwOjAwLjAwMFonLFxuICogICBsZXZlbDogJ3dhcm4nLFxuICogICBob29rVHlwZTogJ2FjdGlvbi1zdGFydCcsXG4gKiAgIG1lc3NhZ2U6ICdDYXJkIHN0YXJ0ZWQnLFxuICogICBpbnB1dDogeyBjYXJkSWQ6ICdjYXJkLTEyMycgfVxuICogfTtcbiAqIGBgYFxuICovXG5leHBvcnQgaW50ZXJmYWNlIExvZ0V2ZW50IHtcbiAgLyoqXG4gICAqIElTTyA4NjAxIHRpbWVzdGFtcCBvZiB3aGVuIHRoZSBldmVudCBvY2N1cnJlZC5cbiAgICogQGV4YW1wbGUgJzIwMjQtMDEtMTVUMTA6MzA6MDAuMDAwWidcbiAgICovXG4gIHRpbWVzdGFtcDogc3RyaW5nO1xuXG4gIC8qKlxuICAgKiBTZXZlcml0eSBsZXZlbCBvZiB0aGUgbG9nIGV2ZW50LlxuICAgKi9cbiAgbGV2ZWw6IExvZ0xldmVsO1xuXG4gIC8qKlxuICAgKiBUeXBlIG9mIGhvb2sgdGhhdCBnZW5lcmF0ZWQgdGhpcyBldmVudC5cbiAgICogTWF5IGJlIHVuZGVmaW5lZCBmb3IgZXZlbnRzIG91dHNpZGUgaG9vayBjb250ZXh0LlxuICAgKi9cbiAgaG9va1R5cGU/OiBzdHJpbmc7XG5cbiAgLyoqXG4gICAqIEh1bWFuLXJlYWRhYmxlIGRlc2NyaXB0aW9uIG9mIHdoYXQgaGFwcGVuZWQuXG4gICAqL1xuICBtZXNzYWdlOiBzdHJpbmc7XG5cbiAgLyoqXG4gICAqIEhvb2sgaW5wdXQgZGF0YSBhdCB0aGUgdGltZSBvZiBsb2dnaW5nLlxuICAgKlxuICAgKiBUaGlzIGlzIHBhcnRpYWwgYnkgZGVzaWduLCBzbyB5b3UgY2FuIGF2b2lkIGxvZ2dpbmcgbGFyZ2Ugb3Igc2Vuc2l0aXZlXG4gICAqIHBheWxvYWRzIHdoaWxlIHN0aWxsIGNhcHR1cmluZyBrZXkgaWRlbnRpZmllcnMuXG4gICAqL1xuICBpbnB1dD86IFJlY29yZDxzdHJpbmcsIHVua25vd24+O1xuXG4gIC8qKlxuICAgKiBFcnJvciBpbmZvcm1hdGlvbiBpZiB0aGlzIGV2ZW50IHJlcHJlc2VudHMgYW4gZXJyb3IuXG4gICAqIENvbnRhaW5zIHN0cnVjdHVyZWQgZXJyb3IgZGV0YWlscyBmb3IgYW5hbHlzaXMuXG4gICAqL1xuICBlcnJvcj86IExvZ0V2ZW50RXJyb3I7XG5cbiAgLyoqXG4gICAqIEFkZGl0aW9uYWwgY29udGV4dCBkYXRhIHByb3ZpZGVkIGJ5IHRoZSBjYWxsZXIuXG4gICAqXG4gICAqIFVzZSB0aGlzIGZvciBzdHJ1Y3R1cmVkIG1ldGFkYXRhIHRoYXQgeW91IHdhbnQgZG93bnN0cmVhbSBoYW5kbGVyc1xuICAgKiB0byByZWNlaXZlIChlLmcuLCByZXF1ZXN0IElEcywgdGltaW5nIGRhdGEpLlxuICAgKi9cbiAgY29udGV4dD86IFJlY29yZDxzdHJpbmcsIHVua25vd24+O1xufVxuXG4vKipcbiAqIFN0cnVjdHVyZWQgZXJyb3IgaW5mb3JtYXRpb24gd2l0aGluIGEgbG9nIGV2ZW50LlxuICpcbiAqIEVycm9ycyBhcmUgbm9ybWFsaXplZCBzbyBoYW5kbGVycyBjYW4gZGVwZW5kIG9uIGNvbnNpc3RlbnQgc2hhcGUsIGV2ZW4gd2hlblxuICogY2FsbGVycyB0aHJvdyBub24tRXJyb3IgdmFsdWVzLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIExvZ0V2ZW50RXJyb3Ige1xuICAvKipcbiAgICogRXJyb3IgbmFtZSAoZS5nLiwgJ1R5cGVFcnJvcicsICdWYWxpZGF0aW9uRXJyb3InKS5cbiAgICovXG4gIG5hbWU6IHN0cmluZztcblxuICAvKipcbiAgICogRXJyb3IgbWVzc2FnZSBkZXNjcmliaW5nIHdoYXQgd2VudCB3cm9uZy5cbiAgICovXG4gIG1lc3NhZ2U6IHN0cmluZztcblxuICAvKipcbiAgICogU3RhY2sgdHJhY2UgaWYgYXZhaWxhYmxlLlxuICAgKi9cbiAgc3RhY2s/OiBzdHJpbmc7XG5cbiAgLyoqXG4gICAqIEVycm9yIGNhdXNlIGNoYWluIGlmIHRoZSBlcnJvciB3YXMgd3JhcHBlZC5cbiAgICovXG4gIGNhdXNlPzogTG9nRXZlbnRFcnJvcjtcbn1cblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gRXZlbnQgSGFuZGxlciBUeXBlXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbi8qKlxuICogSGFuZGxlciBpbnZva2VkIHdoZW4gYSBsb2cgZXZlbnQgaXMgZW1pdHRlZC5cbiAqXG4gKiBIYW5kbGVycyBydW4gc3luY2hyb25vdXNseS4gRXJyb3JzIHRocm93biBieSBhIGhhbmRsZXIgYXJlIHN3YWxsb3dlZCBzb1xuICogbG9nZ2luZyBjYW5ub3QgYnJlYWsgaG9vayBleGVjdXRpb24uXG4gKiBAcGFyYW0gZXZlbnQgLSBUaGUgbG9nIGV2ZW50IHRvIGhhbmRsZVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIC8vIEZvcndhcmQgdG8gZXh0ZXJuYWwgbG9nZ2luZyBzZXJ2aWNlXG4gKiBjb25zdCBoYW5kbGVyOiBMb2dFdmVudEhhbmRsZXIgPSAoZXZlbnQpID0+IHtcbiAqICAgZXh0ZXJuYWxMb2dnZXIubG9nKHtcbiAqICAgICBsZXZlbDogZXZlbnQubGV2ZWwsXG4gKiAgICAgbWVzc2FnZTogZXZlbnQubWVzc2FnZSxcbiAqICAgICBtZXRhZGF0YTogeyBob29rVHlwZTogZXZlbnQuaG9va1R5cGUgfVxuICogICB9KTtcbiAqIH07XG4gKiBgYGBcbiAqL1xuZXhwb3J0IHR5cGUgTG9nRXZlbnRIYW5kbGVyID0gKGV2ZW50OiBMb2dFdmVudCkgPT4gdm9pZDtcblxuLyoqXG4gKiBGdW5jdGlvbiB0byB1bnN1YnNjcmliZSBhIGxvZyBldmVudCBoYW5kbGVyLlxuICpcbiAqIENhbGwgdGhpcyBmdW5jdGlvbiB0byBzdG9wIHJlY2VpdmluZyBsb2cgZXZlbnRzLiBBbHdheXMgY2FsbCB1bnN1YnNjcmliZVxuICogd2hlbiB0aGUgaGFuZGxlciBpcyBubyBsb25nZXIgbmVlZGVkIHRvIHByZXZlbnQgbWVtb3J5IGxlYWtzLlxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGNvbnN0IHVuc3Vic2NyaWJlID0gbG9nZ2VyLm9uKCdlcnJvcicsIGhhbmRsZUVycm9yKTtcbiAqIC8vIC4uLiBsYXRlclxuICogdW5zdWJzY3JpYmUoKTsgLy8gU3RvcCByZWNlaXZpbmcgZXZlbnRzXG4gKiBgYGBcbiAqL1xuZXhwb3J0IHR5cGUgVW5zdWJzY3JpYmUgPSAoKSA9PiB2b2lkO1xuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBMb2dnZXIgQ29uZmlndXJhdGlvblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4vKipcbiAqIENvbmZpZ3VyYXRpb24gb3B0aW9ucyBmb3IgdGhlIExvZ2dlci5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBMb2dnZXJDb25maWcge1xuICAvKipcbiAgICogUGF0aCB0byB0aGUgbG9nIGZpbGUgZm9yIEpTT04gTGluZXMgb3V0cHV0LlxuICAgKlxuICAgKiBJZiBub3Qgc2V0LCBmaWxlIGxvZ2dpbmcgaXMgZGlzYWJsZWQuIENhbiBhbHNvIGJlIHNldCB2aWEgdGhlXG4gICAqIGBDQVJEU19IT09LU19MT0dfRklMRWAgZW52aXJvbm1lbnQgdmFyaWFibGUuXG4gICAqL1xuICBsb2dGaWxlUGF0aD86IHN0cmluZztcbn1cblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gTG9nZ2VyIEludGVyZmFjZSAoZm9yIHRlc3RpbmcgYW5kIHR5cGUgY29tcGF0aWJpbGl0eSlcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuLyoqXG4gKiBMb2dnZXIgaW50ZXJmYWNlIGZvciBzdHJ1Y3R1cmVkLCBjb250ZXh0LWF3YXJlIGxvZ2dpbmcuXG4gKlxuICogVGhpcyBpbnRlcmZhY2UgZGVmaW5lcyB0aGUgcHVibGljIEFQSSBvZiB0aGUgTG9nZ2VyIGNsYXNzLiBJdCBleGlzdHNcbiAqIHByaW1hcmlseSBmb3IgdHlwZSBjb21wYXRpYmlsaXR5IGFuZCB0ZXN0aW5nIHB1cnBvc2VzLCBhbGxvd2luZyB0ZXN0c1xuICogdG8gbW9jayB0aGUgbG9nZ2VyIHdpdGhvdXQgbmVlZGluZyB0byBpbXBsZW1lbnQgYWxsIGludGVybmFsIG1ldGhvZHMuXG4gKlxuICogRm9yIHByb2R1Y3Rpb24gdXNlLCB1c2UgdGhlIHtAbGluayBMb2dnZXJ9IGNsYXNzIG9yIHRoZSB7QGxpbmsgbG9nZ2VyfVxuICogc2luZ2xldG9uIGV4cG9ydC5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBJTG9nZ2VyIHtcbiAgLyoqXG4gICAqIExvZ3MgYSBkZWJ1ZyBtZXNzYWdlLlxuICAgKiBAcGFyYW0gbWVzc2FnZSAtIERpYWdub3N0aWMgdGV4dCBkZXNjcmliaW5nIGxvdy1sZXZlbCBleGVjdXRpb24gZGV0YWlscy5cbiAgICogQHBhcmFtIGNvbnRleHQgLSBPcHRpb25hbCBzdHJ1Y3R1cmVkIG1ldGFkYXRhIG1lcmdlZCBpbnRvIHRoZSBlbWl0dGVkIGV2ZW50LlxuICAgKi9cbiAgZGVidWcobWVzc2FnZTogc3RyaW5nLCBjb250ZXh0PzogUmVjb3JkPHN0cmluZywgdW5rbm93bj4pOiB2b2lkO1xuXG4gIC8qKlxuICAgKiBMb2dzIGFuIGluZm8gbWVzc2FnZS5cbiAgICogQHBhcmFtIG1lc3NhZ2UgLSBPcGVyYXRpb25hbCBtZXNzYWdlIGRlc2NyaWJpbmcgbm9ybWFsIGhvb2sgcHJvZ3Jlc3MuXG4gICAqIEBwYXJhbSBjb250ZXh0IC0gT3B0aW9uYWwgc3RydWN0dXJlZCBtZXRhZGF0YSBtZXJnZWQgaW50byB0aGUgZW1pdHRlZCBldmVudC5cbiAgICovXG4gIGluZm8obWVzc2FnZTogc3RyaW5nLCBjb250ZXh0PzogUmVjb3JkPHN0cmluZywgdW5rbm93bj4pOiB2b2lkO1xuXG4gIC8qKlxuICAgKiBMb2dzIGEgd2FybmluZyBtZXNzYWdlLlxuICAgKiBAcGFyYW0gbWVzc2FnZSAtIFdhcm5pbmcgdGV4dCBmb3IgcmVjb3ZlcmFibGUgb3Igc3VzcGljaW91cyBjb25kaXRpb25zLlxuICAgKiBAcGFyYW0gY29udGV4dCAtIE9wdGlvbmFsIHN0cnVjdHVyZWQgbWV0YWRhdGEgbWVyZ2VkIGludG8gdGhlIGVtaXR0ZWQgZXZlbnQuXG4gICAqL1xuICB3YXJuKG1lc3NhZ2U6IHN0cmluZywgY29udGV4dD86IFJlY29yZDxzdHJpbmcsIHVua25vd24+KTogdm9pZDtcblxuICAvKipcbiAgICogTG9ncyBhbiBlcnJvciBtZXNzYWdlLlxuICAgKiBAcGFyYW0gbWVzc2FnZSAtIEVycm9yIHRleHQgZGVzY3JpYmluZyBhIGhhbmRsZWQgZmFpbHVyZSBjb25kaXRpb24uXG4gICAqIEBwYXJhbSBjb250ZXh0IC0gT3B0aW9uYWwgc3RydWN0dXJlZCBtZXRhZGF0YSBtZXJnZWQgaW50byB0aGUgZW1pdHRlZCBldmVudC5cbiAgICovXG4gIGVycm9yKG1lc3NhZ2U6IHN0cmluZywgY29udGV4dD86IFJlY29yZDxzdHJpbmcsIHVua25vd24+KTogdm9pZDtcblxuICAvKipcbiAgICogTG9ncyBhIHN0cnVjdHVyZWQgZXJyb3Igd2l0aCBmdWxsIGVycm9yIGRldGFpbHMuXG4gICAqIEBwYXJhbSBlcnJvciAtIFRoZSBlcnJvciB0byBsb2dcbiAgICogQHBhcmFtIG1lc3NhZ2UgLSBIdW1hbi1yZWFkYWJsZSBkZXNjcmlwdGlvbiBvZiB3aGF0IGZhaWxlZFxuICAgKiBAcGFyYW0gY29udGV4dCAtIE9wdGlvbmFsIHN0cnVjdHVyZWQgbWV0YWRhdGEgbWVyZ2VkIGludG8gdGhlIGVtaXR0ZWQgZXZlbnQuXG4gICAqL1xuICBsb2dFcnJvcihlcnJvcjogdW5rbm93biwgbWVzc2FnZTogc3RyaW5nLCBjb250ZXh0PzogUmVjb3JkPHN0cmluZywgdW5rbm93bj4pOiB2b2lkO1xufVxuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBMb2dnZXIgQ2xhc3Ncbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuLyoqXG4gKiBMb2dnZXIgZm9yIENhcmRzIEV4dGVuc2lvbiBob29rcyB3aXRoIGV2ZW50IHN1YnNjcmlwdGlvbiBhbmQgZmlsZSBvdXRwdXQuXG4gKlxuICogT3V0cHV0IGlzIG9wdC1pbiBhbmQgYmVzdC1lZmZvcnQ6XG4gKiAtIFdpdGggbm8gaGFuZGxlcnMgYW5kIG5vIGxvZyBmaWxlLCBldmVudHMgYXJlIGRyb3BwZWQuXG4gKiAtIEhhbmRsZXIgZXJyb3JzIGFyZSBzd2FsbG93ZWQgc28gbG9nZ2luZyBjYW5ub3QgYnJlYWsgaG9va3MuXG4gKiAtIEZpbGUgb3V0cHV0IHVzZXMgSlNPTiBMaW5lcyBhbmQgaWdub3JlcyB3cml0ZSBmYWlsdXJlcy5cbiAqXG4gKiBUaGUgbG9nZ2VyIG5ldmVyIHdyaXRlcyB0byBzdGRvdXQgb3Igc3RkZXJyLlxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGltcG9ydCB7IGxvZ2dlciB9IGZyb20gJ0BjYXJkcy9zZGsvY29uZmlnJztcbiAqXG4gKiAvLyBTdWJzY3JpYmUgdG8gZXZlbnRzIGF0IHNwZWNpZmljIGxldmVsXG4gKiBsb2dnZXIub24oJ3dhcm4nLCAoZXZlbnQpID0+IHtcbiAqICAgc2VuZEFsZXJ0KGV2ZW50Lm1lc3NhZ2UpO1xuICogfSk7XG4gKlxuICogLy8gTG9nIHdpdGhpbiBhIGhvb2sgaGFuZGxlclxuICogbG9nZ2VyLndhcm4oJ0Fib3V0IHRvIGV4ZWN1dGUgdGFzaycpO1xuICogYGBgXG4gKi9cbmV4cG9ydCBjbGFzcyBMb2dnZXIge1xuICAvKipcbiAgICogUmVnaXN0ZXJlZCBldmVudCBoYW5kbGVycyBieSBsb2cgbGV2ZWwuXG4gICAqL1xuICBwcml2YXRlIGhhbmRsZXJzOiBNYXA8TG9nTGV2ZWwsIFNldDxMb2dFdmVudEhhbmRsZXI+PiA9IG5ldyBNYXAoKTtcblxuICAvKipcbiAgICogRmlsZSBkZXNjcmlwdG9yIGZvciBsb2cgZmlsZSBvdXRwdXQuXG4gICAqIExhemlseSBpbml0aWFsaXplZCBvbiBmaXJzdCB3cml0ZS5cbiAgICovXG4gIHByaXZhdGUgbG9nRmlsZUZkOiBudW1iZXIgfCBudWxsID0gbnVsbDtcblxuICAvKipcbiAgICogUGF0aCB0byB0aGUgbG9nIGZpbGUsIGlmIGNvbmZpZ3VyZWQuXG4gICAqL1xuICBwcml2YXRlIGxvZ0ZpbGVQYXRoOiBzdHJpbmcgfCBudWxsID0gbnVsbDtcblxuICAvKipcbiAgICogV2hldGhlciBmaWxlIGluaXRpYWxpemF0aW9uIGhhcyBiZWVuIGF0dGVtcHRlZC5cbiAgICovXG4gIHByaXZhdGUgZmlsZUluaXRpYWxpemVkID0gZmFsc2U7XG5cbiAgLyoqXG4gICAqIEN1cnJlbnQgaG9vayBjb250ZXh0IGZvciBlbnJpY2hpbmcgbG9nIGV2ZW50cy5cbiAgICovXG4gIHByaXZhdGUgY3VycmVudEhvb2tUeXBlOiBzdHJpbmcgfCB1bmRlZmluZWQ7XG5cbiAgLyoqXG4gICAqIEN1cnJlbnQgaG9vayBpbnB1dCBmb3IgZW5yaWNoaW5nIGxvZyBldmVudHMuXG4gICAqL1xuICBwcml2YXRlIGN1cnJlbnRJbnB1dDogUmVjb3JkPHN0cmluZywgdW5rbm93bj4gfCB1bmRlZmluZWQ7XG5cbiAgLyoqXG4gICAqIENyZWF0ZXMgYSBuZXcgTG9nZ2VyIGluc3RhbmNlLlxuICAgKlxuICAgKiBUeXBpY2FsbHkgeW91IHNob3VsZCB1c2UgdGhlIGV4cG9ydGVkIGBsb2dnZXJgIHNpbmdsZXRvbiByYXRoZXIgdGhhblxuICAgKiBjcmVhdGluZyBuZXcgaW5zdGFuY2VzLlxuICAgKiBAcGFyYW0gY29uZmlnIC0gT3B0aW9uYWwgY29uZmlndXJhdGlvblxuICAgKiBAZXhhbXBsZVxuICAgKiBgYGB0eXBlc2NyaXB0XG4gICAqIC8vIFVzZSBzaW5nbGV0b24gKHJlY29tbWVuZGVkKVxuICAgKiBpbXBvcnQgeyBsb2dnZXIgfSBmcm9tICdAY2FyZHMvc2RrL2NvbmZpZyc7XG4gICAqXG4gICAqIC8vIE9yIGNyZWF0ZSBjdXN0b20gaW5zdGFuY2VcbiAgICogY29uc3QgY3VzdG9tTG9nZ2VyID0gbmV3IExvZ2dlcih7IGxvZ0ZpbGVQYXRoOiAnL3Zhci9sb2cvaG9va3MubG9nJyB9KTtcbiAgICogYGBgXG4gICAqL1xuICBjb25zdHJ1Y3Rvcihjb25maWc6IExvZ2dlckNvbmZpZyA9IHt9KSB7XG4gICAgLy8gSW5pdGlhbGl6ZSBoYW5kbGVycyBtYXAgZm9yIGVhY2ggbGV2ZWxcbiAgICBmb3IgKGNvbnN0IGxldmVsIG9mIExPR19MRVZFTFMpIHtcbiAgICAgIHRoaXMuaGFuZGxlcnMuc2V0KGxldmVsLCBuZXcgU2V0KCkpO1xuICAgIH1cblxuICAgIC8vIFNldCBsb2cgZmlsZSBwYXRoIGZyb20gY29uZmlnIG9yIGVudmlyb25tZW50XG4gICAgdGhpcy5sb2dGaWxlUGF0aCA9IGNvbmZpZy5sb2dGaWxlUGF0aCA/PyBwcm9jZXNzLmVudlsnQ0FSRFNfSE9PS1NfTE9HX0ZJTEUnXSA/PyBudWxsO1xuICB9XG5cbiAgLyoqXG4gICAqIExvZ3MgYSBkZWJ1ZyBtZXNzYWdlLlxuICAgKlxuICAgKiBVc2UgZm9yIGRldGFpbGVkIGRlYnVnZ2luZyBpbmZvcm1hdGlvbiB0aGF0IGlzIHR5cGljYWxseSBvbmx5IHVzZWZ1bFxuICAgKiBkdXJpbmcgZGV2ZWxvcG1lbnQgb3IgdHJvdWJsZXNob290aW5nLlxuICAgKiBAcGFyYW0gbWVzc2FnZSAtIERpYWdub3N0aWMgdGV4dCBkZXNjcmliaW5nIGxvdy1sZXZlbCBleGVjdXRpb24gZGV0YWlscy5cbiAgICogQHBhcmFtIGNvbnRleHQgLSBPcHRpb25hbCBzdHJ1Y3R1cmVkIG1ldGFkYXRhIG1lcmdlZCBpbnRvIHRoZSBlbWl0dGVkIGV2ZW50LlxuICAgKiBAZXhhbXBsZVxuICAgKiBgYGB0eXBlc2NyaXB0XG4gICAqIGxvZ2dlci5kZWJ1ZygnUHJvY2Vzc2luZyBob29rIGlucHV0JywgeyB0YXNrSWQ6ICd0YXNrLTEyMycsIGlucHV0U2l6ZTogMjU2IH0pO1xuICAgKiBgYGBcbiAgICovXG4gIGRlYnVnKG1lc3NhZ2U6IHN0cmluZywgY29udGV4dD86IFJlY29yZDxzdHJpbmcsIHVua25vd24+KTogdm9pZCB7XG4gICAgdGhpcy5lbWl0KCdkZWJ1ZycsIG1lc3NhZ2UsIGNvbnRleHQpO1xuICB9XG5cbiAgLyoqXG4gICAqIExvZ3MgYW4gaW5mbyBtZXNzYWdlLlxuICAgKlxuICAgKiBVc2UgZm9yIGdlbmVyYWwgb3BlcmF0aW9uYWwgZXZlbnRzIGxpa2UgaG9vayBpbnZvY2F0aW9ucywgc3VjY2Vzc2Z1bFxuICAgKiBjb21wbGV0aW9ucywgb3Igc3RhdGUgY2hhbmdlcy5cbiAgICogQHBhcmFtIG1lc3NhZ2UgLSBPcGVyYXRpb25hbCBtZXNzYWdlIGRlc2NyaWJpbmcgbm9ybWFsIGhvb2sgcHJvZ3Jlc3MuXG4gICAqIEBwYXJhbSBjb250ZXh0IC0gT3B0aW9uYWwgc3RydWN0dXJlZCBtZXRhZGF0YSBtZXJnZWQgaW50byB0aGUgZW1pdHRlZCBldmVudC5cbiAgICogQGV4YW1wbGVcbiAgICogYGBgdHlwZXNjcmlwdFxuICAgKiBsb2dnZXIuaW5mbygnVGFzayBzdGFydGVkJywgeyB0YXNrSWQ6ICd0YXNrLTEyMycsIGNhcmRJZDogJ2NhcmQtNDU2JyB9KTtcbiAgICogYGBgXG4gICAqL1xuICBpbmZvKG1lc3NhZ2U6IHN0cmluZywgY29udGV4dD86IFJlY29yZDxzdHJpbmcsIHVua25vd24+KTogdm9pZCB7XG4gICAgdGhpcy5lbWl0KCdpbmZvJywgbWVzc2FnZSwgY29udGV4dCk7XG4gIH1cblxuICAvKipcbiAgICogTG9ncyBhIHdhcm5pbmcgbWVzc2FnZS5cbiAgICpcbiAgICogVXNlIGZvciBjb25kaXRpb25zIHRoYXQgbWF5IGluZGljYXRlIGNhcmRzIGJ1dCBkb24ndCBwcmV2ZW50XG4gICAqIG9wZXJhdGlvbiwgc3VjaCBhcyBkZXByZWNhdGVkIHBhdHRlcm5zIG9yIHBlcmZvcm1hbmNlIGNvbmNlcm5zLlxuICAgKiBAcGFyYW0gbWVzc2FnZSAtIFdhcm5pbmcgdGV4dCBmb3IgcmVjb3ZlcmFibGUgb3Igc3VzcGljaW91cyBjb25kaXRpb25zLlxuICAgKiBAcGFyYW0gY29udGV4dCAtIE9wdGlvbmFsIHN0cnVjdHVyZWQgbWV0YWRhdGEgbWVyZ2VkIGludG8gdGhlIGVtaXR0ZWQgZXZlbnQuXG4gICAqIEBleGFtcGxlXG4gICAqIGBgYHR5cGVzY3JpcHRcbiAgICogbG9nZ2VyLndhcm4oJ0RlcHJlY2F0ZWQgaG9vayBwYXR0ZXJuIGRldGVjdGVkJywgeyBwYXR0ZXJuOiAnbGVnYWN5TWF0Y2hlcicgfSk7XG4gICAqIGBgYFxuICAgKi9cbiAgd2FybihtZXNzYWdlOiBzdHJpbmcsIGNvbnRleHQ/OiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPik6IHZvaWQge1xuICAgIHRoaXMuZW1pdCgnd2FybicsIG1lc3NhZ2UsIGNvbnRleHQpO1xuICB9XG5cbiAgLyoqXG4gICAqIExvZ3MgYW4gZXJyb3IgbWVzc2FnZS5cbiAgICpcbiAgICogVXNlIGZvciBlcnJvciBjb25kaXRpb25zIHRoYXQgcmVxdWlyZSBhdHRlbnRpb24gYnV0IHdlcmUgaGFuZGxlZFxuICAgKiBncmFjZWZ1bGx5LiBGb3IgZXhjZXB0aW9ucywgcHJlZmVyIHtAbGluayBsb2dFcnJvcn0uXG4gICAqIEBwYXJhbSBtZXNzYWdlIC0gRXJyb3IgdGV4dCBkZXNjcmliaW5nIGEgaGFuZGxlZCBmYWlsdXJlIGNvbmRpdGlvbi5cbiAgICogQHBhcmFtIGNvbnRleHQgLSBPcHRpb25hbCBzdHJ1Y3R1cmVkIG1ldGFkYXRhIG1lcmdlZCBpbnRvIHRoZSBlbWl0dGVkIGV2ZW50LlxuICAgKiBAZXhhbXBsZVxuICAgKiBgYGB0eXBlc2NyaXB0XG4gICAqIGxvZ2dlci5lcnJvcignRmFpbGVkIHRvIHZhbGlkYXRlIGhvb2sgaW5wdXQnLCB7IHJlYXNvbjogJ2VtcHR5IHRhc2tJZCcgfSk7XG4gICAqIGBgYFxuICAgKi9cbiAgZXJyb3IobWVzc2FnZTogc3RyaW5nLCBjb250ZXh0PzogUmVjb3JkPHN0cmluZywgdW5rbm93bj4pOiB2b2lkIHtcbiAgICB0aGlzLmVtaXQoJ2Vycm9yJywgbWVzc2FnZSwgY29udGV4dCk7XG4gIH1cblxuICAvKipcbiAgICogTG9ncyBhIHN0cnVjdHVyZWQgZXJyb3Igd2l0aCBmdWxsIGVycm9yIGRldGFpbHMuXG4gICAqXG4gICAqIFVzZSB0aGlzIGZvciBjYXVnaHQgZXhjZXB0aW9ucy4gTm9uLUVycm9yIHZhbHVlcyBhcmUgbm9ybWFsaXplZCBzbyBoYW5kbGVyc1xuICAgKiBhbHdheXMgcmVjZWl2ZSBhIGNvbnNpc3RlbnQgZXJyb3Igc2hhcGUuXG4gICAqIEBwYXJhbSBlcnJvciAtIFRoZSBlcnJvciB0byBsb2dcbiAgICogQHBhcmFtIG1lc3NhZ2UgLSBIdW1hbi1yZWFkYWJsZSBkZXNjcmlwdGlvbiBvZiB3aGF0IGZhaWxlZFxuICAgKiBAcGFyYW0gY29udGV4dCAtIE9wdGlvbmFsIHN0cnVjdHVyZWQgbWV0YWRhdGEgbWVyZ2VkIGludG8gdGhlIGVtaXR0ZWQgZXZlbnQuXG4gICAqIEBleGFtcGxlXG4gICAqIGBgYHR5cGVzY3JpcHRcbiAgICogdHJ5IHtcbiAgICogICBhd2FpdCBkYW5nZXJvdXNPcGVyYXRpb24oKTtcbiAgICogfSBjYXRjaCAoZXJyKSB7XG4gICAqICAgbG9nZ2VyLmxvZ0Vycm9yKGVyciwgJ0ZhaWxlZCB0byBleGVjdXRlIGRhbmdlcm91cyBvcGVyYXRpb24nLCB7XG4gICAqICAgICBvcGVyYXRpb246ICdkZWxldGUnLFxuICAgKiAgICAgdGFyZ2V0OiAnL2ltcG9ydGFudC9maWxlLnR4dCdcbiAgICogICB9KTtcbiAgICogfVxuICAgKiBgYGBcbiAgICovXG4gIGxvZ0Vycm9yKGVycm9yOiB1bmtub3duLCBtZXNzYWdlOiBzdHJpbmcsIGNvbnRleHQ/OiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPik6IHZvaWQge1xuICAgIGNvbnN0IGVycm9ySW5mbyA9IHRoaXMuZXh0cmFjdEVycm9ySW5mbyhlcnJvcik7XG5cbiAgICBjb25zdCBldmVudDogTG9nRXZlbnQgPSB7XG4gICAgICB0aW1lc3RhbXA6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcbiAgICAgIGxldmVsOiAnZXJyb3InLFxuICAgICAgaG9va1R5cGU6IHRoaXMuY3VycmVudEhvb2tUeXBlLFxuICAgICAgbWVzc2FnZSxcbiAgICAgIGlucHV0OiB0aGlzLmN1cnJlbnRJbnB1dCxcbiAgICAgIGVycm9yOiBlcnJvckluZm8sXG4gICAgICBjb250ZXh0XG4gICAgfTtcblxuICAgIHRoaXMuZGVsaXZlckV2ZW50KGV2ZW50KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBTdWJzY3JpYmVzIGEgaGFuZGxlciB0byBsb2cgZXZlbnRzIGF0IHRoZSBzcGVjaWZpZWQgbGV2ZWwuXG4gICAqXG4gICAqIFRoZSBoYW5kbGVyIHdpbGwgYmUgY2FsbGVkIGZvciBldmVyeSBsb2cgZXZlbnQgYXQgdGhlIHNwZWNpZmllZCBsZXZlbC5cbiAgICogUmV0dXJucyBhbiB1bnN1YnNjcmliZSBmdW5jdGlvbiB0aGF0IHNob3VsZCBiZSBjYWxsZWQgd2hlbiB0aGUgaGFuZGxlclxuICAgKiBpcyBubyBsb25nZXIgbmVlZGVkLiBIYW5kbGVyIGVycm9ycyBhcmUgaWdub3JlZCB0byBhdm9pZCBkaXNydXB0aW5nIGhvb2tzLlxuICAgKiBAcGFyYW0gbGV2ZWwgLSBUaGUgbG9nIGxldmVsIHRvIHN1YnNjcmliZSB0b1xuICAgKiBAcGFyYW0gaGFuZGxlciAtIFRoZSBoYW5kbGVyIGZ1bmN0aW9uIHRvIGNhbGwgZm9yIGVhY2ggZXZlbnRcbiAgICogQHJldHVybnMgQSBmdW5jdGlvbiB0byB1bnN1YnNjcmliZSB0aGUgaGFuZGxlclxuICAgKiBAZXhhbXBsZVxuICAgKiBgYGB0eXBlc2NyaXB0XG4gICAqIC8vIFN1YnNjcmliZSB0byBlcnJvciBldmVudHNcbiAgICogY29uc3QgdW5zdWJzY3JpYmUgPSBsb2dnZXIub24oJ2Vycm9yJywgKGV2ZW50KSA9PiB7XG4gICAqICAgY29uc29sZS5lcnJvcihgWyR7ZXZlbnQuaG9va1R5cGV9XSAke2V2ZW50Lm1lc3NhZ2V9YCk7XG4gICAqICAgaWYgKGV2ZW50LmVycm9yKSB7XG4gICAqICAgICBjb25zb2xlLmVycm9yKGV2ZW50LmVycm9yLnN0YWNrKTtcbiAgICogICB9XG4gICAqIH0pO1xuICAgKlxuICAgKiAvLyBMYXRlciwgY2xlYW4gdXBcbiAgICogdW5zdWJzY3JpYmUoKTtcbiAgICogYGBgXG4gICAqIEBleGFtcGxlXG4gICAqIGBgYHR5cGVzY3JpcHRcbiAgICogLy8gRm9yd2FyZCB0byBleHRlcm5hbCBsb2dnaW5nIGxpYnJhcnlcbiAgICogaW1wb3J0IHBpbm8gZnJvbSAncGlubyc7XG4gICAqIGNvbnN0IHBpbm9Mb2dnZXIgPSBwaW5vKCk7XG4gICAqXG4gICAqIGxvZ2dlci5vbignaW5mbycsIChldmVudCkgPT4gcGlub0xvZ2dlci5pbmZvKGV2ZW50LCBldmVudC5tZXNzYWdlKSk7XG4gICAqIGxvZ2dlci5vbignd2FybicsIChldmVudCkgPT4gcGlub0xvZ2dlci53YXJuKGV2ZW50LCBldmVudC5tZXNzYWdlKSk7XG4gICAqIGxvZ2dlci5vbignZXJyb3InLCAoZXZlbnQpID0+IHBpbm9Mb2dnZXIuZXJyb3IoZXZlbnQsIGV2ZW50Lm1lc3NhZ2UpKTtcbiAgICogYGBgXG4gICAqL1xuICBvbihsZXZlbDogTG9nTGV2ZWwsIGhhbmRsZXI6IExvZ0V2ZW50SGFuZGxlcik6IFVuc3Vic2NyaWJlIHtcbiAgICBjb25zdCBsZXZlbEhhbmRsZXJzID0gdGhpcy5oYW5kbGVycy5nZXQobGV2ZWwpO1xuICAgIGlmIChsZXZlbEhhbmRsZXJzKSB7XG4gICAgICBsZXZlbEhhbmRsZXJzLmFkZChoYW5kbGVyKTtcbiAgICB9XG5cbiAgICByZXR1cm4gKCkgPT4ge1xuICAgICAgbGV2ZWxIYW5kbGVycz8uZGVsZXRlKGhhbmRsZXIpO1xuICAgIH07XG4gIH1cblxuICAvKipcbiAgICogU2V0cyB0aGUgY3VycmVudCBob29rIGNvbnRleHQgZm9yIGVucmljaGluZyBsb2cgZXZlbnRzLlxuICAgKlxuICAgKiBUaGlzIGlzIGNhbGxlZCBpbnRlcm5hbGx5IGJ5IHRoZSBydW50aW1lIGJlZm9yZSBpbnZva2luZyBob29rIGhhbmRsZXJzLlxuICAgKiBZb3UgdHlwaWNhbGx5IGRvbid0IG5lZWQgdG8gY2FsbCB0aGlzIGRpcmVjdGx5LlxuICAgKiBAcGFyYW0gaG9va1R5cGUgLSBUaGUgdHlwZSBvZiBob29rIGJlaW5nIGV4ZWN1dGVkXG4gICAqIEBwYXJhbSBpbnB1dCAtIFRoZSBob29rIGlucHV0IGRhdGFcbiAgICogQGludGVybmFsXG4gICAqL1xuICBzZXRDb250ZXh0KGhvb2tUeXBlOiBzdHJpbmcgfCB1bmRlZmluZWQsIGlucHV0OiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPiB8IHVuZGVmaW5lZCk6IHZvaWQge1xuICAgIHRoaXMuY3VycmVudEhvb2tUeXBlID0gaG9va1R5cGU7XG4gICAgdGhpcy5jdXJyZW50SW5wdXQgPSBpbnB1dDtcbiAgfVxuXG4gIC8qKlxuICAgKiBDbGVhcnMgdGhlIGN1cnJlbnQgaG9vayBjb250ZXh0LlxuICAgKlxuICAgKiBDYWxsZWQgaW50ZXJuYWxseSBieSB0aGUgcnVudGltZSBhZnRlciBob29rIGV4ZWN1dGlvbiBjb21wbGV0ZXMuXG4gICAqIEBpbnRlcm5hbFxuICAgKi9cbiAgY2xlYXJDb250ZXh0KCk6IHZvaWQge1xuICAgIHRoaXMuY3VycmVudEhvb2tUeXBlID0gdW5kZWZpbmVkO1xuICAgIHRoaXMuY3VycmVudElucHV0ID0gdW5kZWZpbmVkO1xuICB9XG5cbiAgLyoqXG4gICAqIFNldHMgYSBkZWZhdWx0IGxvZyBmaWxlIHBhdGggdGhhdCBvbmx5IHRha2VzIGVmZmVjdCBpZiBubyBvdGhlciBzb3VyY2VcbiAgICogaGFzIGNvbmZpZ3VyZWQgZmlsZSBsb2dnaW5nLlxuICAgKlxuICAgKiBUaGlzIGlzIHRoZSBsb3dlc3QtcHJpb3JpdHkgZmlsZSBwYXRoIHNvdXJjZS4gSXQgd2lsbCBiZSBpZ25vcmVkIGlmXG4gICAqIGFueSBvZiB0aGVzZSBoYXZlIGFscmVhZHkgc2V0IGEgcGF0aDpcbiAgICogLSBgbG9nRmlsZVBhdGhgIGluIHRoZSBjb25zdHJ1Y3RvciBjb25maWdcbiAgICogLSBgQ0FSRFNfSE9PS1NfTE9HX0ZJTEVgIGVudmlyb25tZW50IHZhcmlhYmxlXG4gICAqIC0ge0BsaW5rIHNldExvZ0ZpbGV9IGNhbGxlZCBhdCBydW50aW1lXG4gICAqXG4gICAqIEludGVuZGVkIGZvciB1c2UgYnkgQ0xJIGVudHJ5IHBvaW50cyAoZS5nLiwgdGhlIGAtLWxvZ2AgZmxhZykuXG4gICAqIEBwYXJhbSBmaWxlUGF0aCAtIERlZmF1bHQgcGF0aCB0byB0aGUgbG9nIGZpbGVcbiAgICogQGV4YW1wbGVcbiAgICogYGBgdHlwZXNjcmlwdFxuICAgKiAvLyBXaXJlIC0tbG9nIENMSSBhcmd1bWVudCBhcyBhIGZhbGxiYWNrXG4gICAqIGlmIChhcmdzLmxvZykge1xuICAgKiAgIGxvZ2dlci5zZXREZWZhdWx0TG9nRmlsZShhcmdzLmxvZyk7XG4gICAqIH1cbiAgICogYGBgXG4gICAqL1xuICBzZXREZWZhdWx0TG9nRmlsZShmaWxlUGF0aDogc3RyaW5nKTogdm9pZCB7XG4gICAgaWYgKHRoaXMubG9nRmlsZVBhdGggPT09IG51bGwpIHtcbiAgICAgIHRoaXMubG9nRmlsZVBhdGggPSBmaWxlUGF0aDtcbiAgICAgIHRoaXMuZmlsZUluaXRpYWxpemVkID0gZmFsc2U7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIENvbmZpZ3VyZXMgdGhlIGxvZyBmaWxlIHBhdGggYXQgcnVudGltZS5cbiAgICpcbiAgICogQ2FsbCB0aGlzIHRvIGVuYWJsZSBvciBjaGFuZ2UgZmlsZSBsb2dnaW5nLiBTZXR0aW5nIHRvIGBudWxsYCBkaXNhYmxlc1xuICAgKiBmaWxlIGxvZ2dpbmcgYW5kIGNsb3NlcyBhbnkgb3BlbiBmaWxlIGhhbmRsZS4gRGlyZWN0b3JpZXMgYXJlIGNyZWF0ZWRcbiAgICogb24gZGVtYW5kIHdoZW4gdGhlIGZpcnN0IHdyaXRlIG9jY3Vycy5cbiAgICogQHBhcmFtIGZpbGVQYXRoIC0gUGF0aCB0byB0aGUgbG9nIGZpbGUsIG9yIG51bGwgdG8gZGlzYWJsZVxuICAgKiBAZXhhbXBsZVxuICAgKiBgYGB0eXBlc2NyaXB0XG4gICAqIC8vIEVuYWJsZSBmaWxlIGxvZ2dpbmcgYXQgcnVudGltZVxuICAgKiBsb2dnZXIuc2V0TG9nRmlsZSgnL3Zhci9sb2cvY2FyZHMtc2RrLmxvZycpO1xuICAgKlxuICAgKiAvLyBEaXNhYmxlIGZpbGUgbG9nZ2luZ1xuICAgKiBsb2dnZXIuc2V0TG9nRmlsZShudWxsKTtcbiAgICogYGBgXG4gICAqL1xuICBzZXRMb2dGaWxlKGZpbGVQYXRoOiBzdHJpbmcgfCBudWxsKTogdm9pZCB7XG4gICAgLy8gQ2xvc2UgZXhpc3RpbmcgZmlsZSBpZiBvcGVuXG4gICAgaWYgKHRoaXMubG9nRmlsZUZkICE9PSBudWxsKSB7XG4gICAgICB0cnkge1xuICAgICAgICBjbG9zZVN5bmModGhpcy5sb2dGaWxlRmQpO1xuICAgICAgfSBjYXRjaCB7XG4gICAgICAgIC8vIElnbm9yZSBlcnJvcnMgb24gY2xvc2VcbiAgICAgIH1cbiAgICAgIHRoaXMubG9nRmlsZUZkID0gbnVsbDtcbiAgICB9XG5cbiAgICB0aGlzLmxvZ0ZpbGVQYXRoID0gZmlsZVBhdGg7XG4gICAgdGhpcy5maWxlSW5pdGlhbGl6ZWQgPSBmYWxzZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDbG9zZXMgYWxsIHJlc291cmNlcyBoZWxkIGJ5IHRoZSBsb2dnZXIuXG4gICAqXG4gICAqIENhbGwgdGhpcyBkdXJpbmcgZ3JhY2VmdWwgc2h1dGRvd24gdG8gZW5zdXJlIGFsbCBsb2cgZGF0YSBpcyBmbHVzaGVkLlxuICAgKiBTYWZlIHRvIGNhbGwgbXVsdGlwbGUgdGltZXMuXG4gICAqIEBleGFtcGxlXG4gICAqIGBgYHR5cGVzY3JpcHRcbiAgICogcHJvY2Vzcy5vbignZXhpdCcsICgpID0+IHtcbiAgICogICBsb2dnZXIuY2xvc2UoKTtcbiAgICogfSk7XG4gICAqIGBgYFxuICAgKi9cbiAgY2xvc2UoKTogdm9pZCB7XG4gICAgaWYgKHRoaXMubG9nRmlsZUZkICE9PSBudWxsKSB7XG4gICAgICB0cnkge1xuICAgICAgICBjbG9zZVN5bmModGhpcy5sb2dGaWxlRmQpO1xuICAgICAgfSBjYXRjaCB7XG4gICAgICAgIC8vIElnbm9yZSBlcnJvcnMgb24gY2xvc2VcbiAgICAgIH1cbiAgICAgIHRoaXMubG9nRmlsZUZkID0gbnVsbDtcbiAgICB9XG4gICAgdGhpcy5maWxlSW5pdGlhbGl6ZWQgPSBmYWxzZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDaGVja3MgaWYgdGhlcmUgYXJlIGFueSBhY3RpdmUgaGFuZGxlcnMgb3IgZGVzdGluYXRpb25zLlxuICAgKlxuICAgKiBSZXR1cm5zIHRydWUgaWYgYW55IGhhbmRsZXJzIGFyZSByZWdpc3RlcmVkIG9yIGZpbGUgbG9nZ2luZyBpcyBlbmFibGVkLlxuICAgKiBVc2VmdWwgZm9yIGRlY2lkaW5nIHdoZXRoZXIgdG8gY29tcHV0ZSBleHBlbnNpdmUgbG9nIGNvbnRleHQuXG4gICAqIEByZXR1cm5zIFdoZXRoZXIgdGhlIGxvZ2dlciBoYXMgYW55IGFjdGl2ZSBvdXRwdXQgZGVzdGluYXRpb25zXG4gICAqL1xuICBoYXNEZXN0aW5hdGlvbnMoKTogYm9vbGVhbiB7XG4gICAgY29uc3QgaGFzSGFuZGxlcnMgPSBBcnJheS5mcm9tKHRoaXMuaGFuZGxlcnMudmFsdWVzKCkpLnNvbWUoKGhhbmRsZXJzKSA9PiBoYW5kbGVycy5zaXplID4gMCk7XG4gICAgcmV0dXJuIGhhc0hhbmRsZXJzIHx8IHRoaXMubG9nRmlsZVBhdGggIT09IG51bGw7XG4gIH1cblxuICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gIC8vIFByaXZhdGUgTWV0aG9kc1xuICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbiAgLyoqXG4gICAqIEVtaXRzIGEgbG9nIGV2ZW50LlxuICAgKiBAcGFyYW0gbGV2ZWwgLSBUaGUgc2V2ZXJpdHkgbGV2ZWwgb2YgdGhlIGV2ZW50XG4gICAqIEBwYXJhbSBtZXNzYWdlIC0gVGhlIGxvZyBtZXNzYWdlXG4gICAqIEBwYXJhbSBjb250ZXh0IC0gT3B0aW9uYWwgYWRkaXRpb25hbCBjb250ZXh0IGRhdGFcbiAgICovXG4gIHByaXZhdGUgZW1pdChsZXZlbDogTG9nTGV2ZWwsIG1lc3NhZ2U6IHN0cmluZywgY29udGV4dD86IFJlY29yZDxzdHJpbmcsIHVua25vd24+KTogdm9pZCB7XG4gICAgY29uc3QgZXZlbnQ6IExvZ0V2ZW50ID0ge1xuICAgICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXG4gICAgICBsZXZlbCxcbiAgICAgIGhvb2tUeXBlOiB0aGlzLmN1cnJlbnRIb29rVHlwZSxcbiAgICAgIG1lc3NhZ2UsXG4gICAgICBpbnB1dDogdGhpcy5jdXJyZW50SW5wdXQsXG4gICAgICBjb250ZXh0XG4gICAgfTtcblxuICAgIHRoaXMuZGVsaXZlckV2ZW50KGV2ZW50KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBEZWxpdmVycyBhbiBldmVudCB0byBhbGwgcmVnaXN0ZXJlZCBkZXN0aW5hdGlvbnMuXG4gICAqIEBwYXJhbSBldmVudCAtIFRoZSBsb2cgZXZlbnQgdG8gZGVsaXZlclxuICAgKi9cbiAgcHJpdmF0ZSBkZWxpdmVyRXZlbnQoZXZlbnQ6IExvZ0V2ZW50KTogdm9pZCB7XG4gICAgLy8gRGVsaXZlciB0byBldmVudCBoYW5kbGVyc1xuICAgIGNvbnN0IGxldmVsSGFuZGxlcnMgPSB0aGlzLmhhbmRsZXJzLmdldChldmVudC5sZXZlbCk7XG4gICAgaWYgKGxldmVsSGFuZGxlcnMpIHtcbiAgICAgIGZvciAoY29uc3QgaGFuZGxlciBvZiBsZXZlbEhhbmRsZXJzKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgaGFuZGxlcihldmVudCk7XG4gICAgICAgIH0gY2F0Y2gge1xuICAgICAgICAgIC8vIFNpbGVudGx5IGlnbm9yZSBoYW5kbGVyIGVycm9ycyB0byBub3QgZGlzcnVwdCBob29rIGV4ZWN1dGlvblxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gV3JpdGUgdG8gZmlsZSBpZiBjb25maWd1cmVkXG4gICAgdGhpcy53cml0ZVRvRmlsZShldmVudCk7XG4gIH1cblxuICAvKipcbiAgICogV3JpdGVzIGFuIGV2ZW50IHRvIHRoZSBsb2cgZmlsZS5cbiAgICogQHBhcmFtIGV2ZW50IC0gVGhlIGxvZyBldmVudCB0byB3cml0ZVxuICAgKi9cbiAgcHJpdmF0ZSB3cml0ZVRvRmlsZShldmVudDogTG9nRXZlbnQpOiB2b2lkIHtcbiAgICBpZiAoIXRoaXMubG9nRmlsZVBhdGgpIHJldHVybjtcblxuICAgIC8vIExhenkgaW5pdGlhbGl6YXRpb24gb2YgZmlsZSBoYW5kbGVcbiAgICBpZiAoIXRoaXMuZmlsZUluaXRpYWxpemVkKSB7XG4gICAgICB0aGlzLmluaXRpYWxpemVGaWxlKCk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMubG9nRmlsZUZkID09PSBudWxsKSByZXR1cm47XG5cbiAgICB0cnkge1xuICAgICAgY29uc3QgbGluZSA9IGAke0pTT04uc3RyaW5naWZ5KGV2ZW50KX1cXG5gO1xuICAgICAgd3JpdGVTeW5jKHRoaXMubG9nRmlsZUZkLCBsaW5lKTtcbiAgICB9IGNhdGNoIHtcbiAgICAgIC8vIFNpbGVudGx5IGlnbm9yZSBmaWxlIHdyaXRlIGVycm9ycyB0byBub3QgZGlzcnVwdCBob29rIGV4ZWN1dGlvblxuICAgICAgLy8gVGhpcyBmb2xsb3dzIHRoZSByaXNrIG1pdGlnYXRpb246IFwiR3JhY2VmdWwgZGVncmFkYXRpb24gLSBsb2cgd3JpdGVcbiAgICAgIC8vIGZhaWx1cmVzIGFyZSBzaWxlbnRseSBpZ25vcmVkIHRvIG5vdCBkaXNydXB0IGhvb2sgZXhlY3V0aW9uXCJcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogSW5pdGlhbGl6ZXMgdGhlIGxvZyBmaWxlIGZvciB3cml0aW5nLlxuICAgKi9cbiAgcHJpdmF0ZSBpbml0aWFsaXplRmlsZSgpOiB2b2lkIHtcbiAgICB0aGlzLmZpbGVJbml0aWFsaXplZCA9IHRydWU7XG5cbiAgICBpZiAoIXRoaXMubG9nRmlsZVBhdGgpIHJldHVybjtcblxuICAgIHRyeSB7XG4gICAgICAvLyBFbnN1cmUgZGlyZWN0b3J5IGV4aXN0c1xuICAgICAgY29uc3QgZGlyID0gZGlybmFtZSh0aGlzLmxvZ0ZpbGVQYXRoKTtcbiAgICAgIGlmICghZXhpc3RzU3luYyhkaXIpKSB7XG4gICAgICAgIG1rZGlyU3luYyhkaXIsIHsgcmVjdXJzaXZlOiB0cnVlIH0pO1xuICAgICAgfVxuXG4gICAgICAvLyBPcGVuIGZpbGUgZm9yIGFwcGVuZGluZ1xuICAgICAgdGhpcy5sb2dGaWxlRmQgPSBvcGVuU3luYyh0aGlzLmxvZ0ZpbGVQYXRoLCAnYScpO1xuICAgIH0gY2F0Y2gge1xuICAgICAgLy8gU2lsZW50bHkgaWdub3JlIGZpbGUgaW5pdGlhbGl6YXRpb24gZXJyb3JzXG4gICAgICB0aGlzLmxvZ0ZpbGVGZCA9IG51bGw7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEV4dHJhY3RzIHN0cnVjdHVyZWQgZXJyb3IgaW5mb3JtYXRpb24gZnJvbSBhbiB1bmtub3duIGVycm9yLlxuICAgKiBAcGFyYW0gZXJyb3IgLSBUaGUgZXJyb3IgdG8gZXh0cmFjdCBpbmZvcm1hdGlvbiBmcm9tXG4gICAqIEByZXR1cm5zIFN0cnVjdHVyZWQgZXJyb3IgaW5mb3JtYXRpb25cbiAgICovXG4gIHByaXZhdGUgZXh0cmFjdEVycm9ySW5mbyhlcnJvcjogdW5rbm93bik6IExvZ0V2ZW50RXJyb3Ige1xuICAgIGlmIChlcnJvciBpbnN0YW5jZW9mIEVycm9yKSB7XG4gICAgICBjb25zdCBpbmZvOiBMb2dFdmVudEVycm9yID0ge1xuICAgICAgICBuYW1lOiBlcnJvci5uYW1lLFxuICAgICAgICBtZXNzYWdlOiBlcnJvci5tZXNzYWdlLFxuICAgICAgICBzdGFjazogZXJyb3Iuc3RhY2tcbiAgICAgIH07XG5cbiAgICAgIC8vIEV4dHJhY3QgY2F1c2UgY2hhaW4gaWYgcHJlc2VudFxuICAgICAgaWYgKGVycm9yLmNhdXNlICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgaW5mby5jYXVzZSA9IHRoaXMuZXh0cmFjdEVycm9ySW5mbyhlcnJvci5jYXVzZSk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBpbmZvO1xuICAgIH1cblxuICAgIC8vIEhhbmRsZSBub24tRXJyb3IgdmFsdWVzXG4gICAgcmV0dXJuIHtcbiAgICAgIG5hbWU6ICdVbmtub3duRXJyb3InLFxuICAgICAgbWVzc2FnZTogU3RyaW5nKGVycm9yKVxuICAgIH07XG4gIH1cbn1cblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gU2luZ2xldG9uIEV4cG9ydFxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4vKipcbiAqIEdsb2JhbCBsb2dnZXIgaW5zdGFuY2UgZm9yIENhcmRzIEV4dGVuc2lvbiBob29rcy5cbiAqXG4gKiBVc2UgdGhpcyBzaW5nbGV0b24gZm9yIGFsbCBsb2dnaW5nIHdpdGhpbiBob29rcy4gVGhlIGxvZ2dlciBpcyBjb25maWd1cmVkXG4gKiB2aWEgZW52aXJvbm1lbnQgdmFyaWFibGVzIGFuZCBzdXBwb3J0cyBldmVudCBzdWJzY3JpcHRpb24gZm9yIGN1c3RvbVxuICogZGVzdGluYXRpb25zLlxuICpcbiAqICMjIENvbmZpZ3VyYXRpb25cbiAqXG4gKiB8IEVudmlyb25tZW50IFZhcmlhYmxlIHwgRGVzY3JpcHRpb24gfFxuICogfC0tLS0tLS0tLS0tLS0tLS0tLS0tLXwtLS0tLS0tLS0tLS0tfFxuICogfCBgQ0FSRFNfSE9PS1NfTE9HX0ZJTEVgIHwgUGF0aCB0byBsb2cgZmlsZSAoSlNPTiBMaW5lcyBmb3JtYXQpIHxcbiAqXG4gKiAjIyBVc2FnZSBpbiBIb29rc1xuICpcbiAqIFRoZSBsb2dnZXIgY2FuIGJlIHVzZWQgZGlyZWN0bHkgd2l0aGluIGhvb2sgaGFuZGxlcnM6XG4gKlxuICogYGBgdHlwZXNjcmlwdFxuICogaW1wb3J0IHsgbG9nZ2VyIH0gZnJvbSAnQGNhcmRzL3Nkay9jb25maWcnO1xuICpcbiAqIC8vIEluIGEgaG9vayBoYW5kbGVyXG4gKiBsb2dnZXIud2FybignVGFzayBzdGFydGluZyBpbiBpbnRlcmFjdGl2ZSBtb2RlJyk7XG4gKiBgYGBcbiAqXG4gKiAjIyBFeHRlcm5hbCBJbnRlZ3JhdGlvblxuICpcbiAqIFN1YnNjcmliZSB0byBldmVudHMgdG8gZm9yd2FyZCBsb2dzIHRvIGV4dGVybmFsIHN5c3RlbXM6XG4gKlxuICogYGBgdHlwZXNjcmlwdFxuICogaW1wb3J0IHsgbG9nZ2VyIH0gZnJvbSAnQGNhcmRzL3Nkay9jb25maWcnO1xuICogaW1wb3J0IHBpbm8gZnJvbSAncGlubyc7XG4gKlxuICogY29uc3QgcGlub0xvZ2dlciA9IHBpbm8oeyBsZXZlbDogJ2RlYnVnJyB9KTtcbiAqXG4gKiBsb2dnZXIub24oJ2RlYnVnJywgKGV2ZW50KSA9PiBwaW5vTG9nZ2VyLmRlYnVnKGV2ZW50LCBldmVudC5tZXNzYWdlKSk7XG4gKiBsb2dnZXIub24oJ2luZm8nLCAoZXZlbnQpID0+IHBpbm9Mb2dnZXIuaW5mbyhldmVudCwgZXZlbnQubWVzc2FnZSkpO1xuICogbG9nZ2VyLm9uKCd3YXJuJywgKGV2ZW50KSA9PiBwaW5vTG9nZ2VyLndhcm4oZXZlbnQsIGV2ZW50Lm1lc3NhZ2UpKTtcbiAqIGxvZ2dlci5vbignZXJyb3InLCAoZXZlbnQpID0+IHBpbm9Mb2dnZXIuZXJyb3IoZXZlbnQsIGV2ZW50Lm1lc3NhZ2UpKTtcbiAqIGBgYFxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIC8vIERpcmVjdCB1c2FnZVxuICogaW1wb3J0IHsgbG9nZ2VyIH0gZnJvbSAnQGNhcmRzL3Nkay9jb25maWcnO1xuICpcbiAqIGxvZ2dlci5pbmZvKCdTdGFydGluZyBvcGVyYXRpb24nKTtcbiAqIGxvZ2dlci53YXJuKCdSZXNvdXJjZSBsaW1pdCBhcHByb2FjaGluZycsIHsgdXNhZ2U6IDAuOSB9KTtcbiAqXG4gKiB0cnkge1xuICogICBhd2FpdCByaXNreU9wZXJhdGlvbigpO1xuICogfSBjYXRjaCAoZXJyKSB7XG4gKiAgIGxvZ2dlci5sb2dFcnJvcihlcnIsICdSaXNreSBvcGVyYXRpb24gZmFpbGVkJyk7XG4gKiB9XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNvbnN0IGxvZ2dlciA9IG5ldyBMb2dnZXIoKTtcbiIsICIvKipcbiAqIFNvY2tldCBjbGllbnQgZm9yIHJ1bnRpbWUtdG8tZGlzcGF0Y2hlciBjb21tdW5pY2F0aW9uLlxuICpcbiAqIENvbm5lY3RzIHRvIGEgVW5peCBkb21haW4gc29ja2V0IGNyZWF0ZWQgYnkgQWN0aW9uRGlzcGF0Y2hlciBhbmQgaGFuZGxlc1xuICogTkRKU09OIChuZXdsaW5lLWRlbGltaXRlZCBKU09OKSBwcm90b2NvbCBmb3IgcmVjZWl2aW5nIGNvbW1hbmRzIGFuZCBzZW5kaW5nXG4gKiByZXNwb25zZXMuXG4gKlxuICpcbiAqIEBzdW1tYXJ5IFNvY2tldCBjbGllbnQgZm9yIHJ1bnRpbWUtdG8tZGlzcGF0Y2hlciBjb21tdW5pY2F0aW9uXG4gKiBAbW9kdWxlXG4gKi9cblxuaW1wb3J0ICogYXMgbmV0IGZyb20gJ25vZGU6bmV0JztcblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gVHlwZXNcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuLyoqXG4gKiBDb21tYW5kcyB0aGF0IGNhbiBiZSByZWNlaXZlZCBmcm9tIHRoZSBBY3Rpb25EaXNwYXRjaGVyIHZpYSBzb2NrZXQuXG4gKlxuICogVXNlcyBOREpTT04gKG5ld2xpbmUtZGVsaW1pdGVkIEpTT04pIHByb3RvY29sLlxuICovXG5leHBvcnQgdHlwZSBTb2NrZXRDb21tYW5kID0geyB0eXBlOiAnY2FuY2VsJyB9IHwgeyB0eXBlOiAnc3dpdGNoVG9JbnRlcmFjdGl2ZScgfTtcblxuLyoqXG4gKiBSZXNwb25zZSBzZW50IGJhY2sgdG8gdGhlIEFjdGlvbkRpc3BhdGNoZXIgd2hlbiBzd2l0Y2hUb0ludGVyYWN0aXZlIGlzIGhhbmRsZWQuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgU3dpdGNoVG9JbnRlcmFjdGl2ZVJlc3BvbnNlIHtcbiAgdHlwZTogJ3N3aXRjaFRvSW50ZXJhY3RpdmVSZXNwb25zZSc7XG4gIGRhdGE6IHVua25vd247XG59XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIFNvY2tldENsaWVudFxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4vKipcbiAqIENsaWVudCBmb3IgdGhlIE5ESlNPTiBzb2NrZXQgcHJvdG9jb2wgYmV0d2VlbiB0aGUgYWN0aW9uIHJ1bnRpbWUgYW5kXG4gKiBBY3Rpb25EaXNwYXRjaGVyLlxuICpcbiAqIFJlY2VpdmVzIGNvbW1hbmRzIChjYW5jZWwsIHN3aXRjaFRvSW50ZXJhY3RpdmUpIGFuZCBzZW5kcyByZXNwb25zZXNcbiAqIChzd2l0Y2hUb0ludGVyYWN0aXZlUmVzcG9uc2UpIG92ZXIgYSBVbml4IGRvbWFpbiBzb2NrZXQuXG4gKlxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGNvbnN0IGNsaWVudCA9IGF3YWl0IFNvY2tldENsaWVudC5jb25uZWN0KCcvcGF0aC90by9zb2NrZXQnKTtcbiAqIGNsaWVudC5vbkNvbW1hbmQoKGNvbW1hbmQpID0+IHtcbiAqICAgaWYgKGNvbW1hbmQudHlwZSA9PT0gJ2NhbmNlbCcpIHsgLi4uIH1cbiAqIH0pO1xuICogYGBgXG4gKi9cbmV4cG9ydCBjbGFzcyBTb2NrZXRDbGllbnQge1xuICBwcml2YXRlIHNvY2tldDogbmV0LlNvY2tldDtcbiAgcHJpdmF0ZSBidWZmZXIgPSAnJztcbiAgcHJpdmF0ZSBjb21tYW5kSGFuZGxlcj86IChjb21tYW5kOiBTb2NrZXRDb21tYW5kKSA9PiB2b2lkO1xuXG4gIHByaXZhdGUgY29uc3RydWN0b3Ioc29ja2V0OiBuZXQuU29ja2V0KSB7XG4gICAgdGhpcy5zb2NrZXQgPSBzb2NrZXQ7XG5cbiAgICBzb2NrZXQub24oJ2RhdGEnLCAoY2h1bmspID0+IHtcbiAgICAgIHRoaXMuYnVmZmVyICs9IGNodW5rLnRvU3RyaW5nKCk7XG4gICAgICAvLyBQYXJzZSBOREpTT04gLSBzcGxpdCBieSBuZXdsaW5lc1xuICAgICAgY29uc3QgbGluZXMgPSB0aGlzLmJ1ZmZlci5zcGxpdCgnXFxuJyk7XG4gICAgICB0aGlzLmJ1ZmZlciA9IGxpbmVzLnBvcCgpID8/ICcnOyAvLyBLZWVwIGluY29tcGxldGUgbGluZSBpbiBidWZmZXJcblxuICAgICAgZm9yIChjb25zdCBsaW5lIG9mIGxpbmVzKSB7XG4gICAgICAgIGlmIChsaW5lLnRyaW0oKSA9PT0gJycpIGNvbnRpbnVlO1xuICAgICAgICB0cnkge1xuICAgICAgICAgIGNvbnN0IHBhcnNlZCA9IEpTT04ucGFyc2UobGluZSkgYXMgU29ja2V0Q29tbWFuZDtcbiAgICAgICAgICB0aGlzLmNvbW1hbmRIYW5kbGVyPy4ocGFyc2VkKTtcbiAgICAgICAgfSBjYXRjaCB7XG4gICAgICAgICAgLy8gTWFsZm9ybWVkIEpTT04gb24gc29ja2V0IGlzIGlnbm9yZWQgKHBlciBwbGFuKVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogQ29ubmVjdCB0byBhIFVuaXggZG9tYWluIHNvY2tldCBhdCB0aGUgZ2l2ZW4gcGF0aC5cbiAgICpcbiAgICogQHBhcmFtIHNvY2tldFBhdGggLSBQYXRoIHRvIHRoZSBVbml4IGRvbWFpbiBzb2NrZXRcbiAgICogQHJldHVybnMgQSBjb25uZWN0ZWQgU29ja2V0Q2xpZW50IGluc3RhbmNlXG4gICAqIEB0aHJvd3MgRXJyb3IgaWYgdGhlIGNvbm5lY3Rpb24gZmFpbHNcbiAgICovXG4gIHN0YXRpYyBjb25uZWN0KHNvY2tldFBhdGg6IHN0cmluZyk6IFByb21pc2U8U29ja2V0Q2xpZW50PiB7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgIGNvbnN0IHNvY2tldCA9IG5ldC5jcmVhdGVDb25uZWN0aW9uKHNvY2tldFBhdGgsICgpID0+IHtcbiAgICAgICAgcmVzb2x2ZShuZXcgU29ja2V0Q2xpZW50KHNvY2tldCkpO1xuICAgICAgfSk7XG4gICAgICBzb2NrZXQub24oJ2Vycm9yJywgcmVqZWN0KTtcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZWdpc3RlciBhIGhhbmRsZXIgZm9yIGluY29taW5nIHNvY2tldCBjb21tYW5kcy5cbiAgICpcbiAgICogT25seSBvbmUgaGFuZGxlciBjYW4gYmUgcmVnaXN0ZXJlZCBhdCBhIHRpbWUuIFN1YnNlcXVlbnQgY2FsbHMgcmVwbGFjZVxuICAgKiB0aGUgcHJldmlvdXMgaGFuZGxlci5cbiAgICpcbiAgICogQHBhcmFtIGhhbmRsZXIgLSBGdW5jdGlvbiB0byBjYWxsIHdoZW4gYSBjb21tYW5kIGlzIHJlY2VpdmVkXG4gICAqL1xuICBvbkNvbW1hbmQoaGFuZGxlcjogKGNvbW1hbmQ6IFNvY2tldENvbW1hbmQpID0+IHZvaWQpOiB2b2lkIHtcbiAgICB0aGlzLmNvbW1hbmRIYW5kbGVyID0gaGFuZGxlcjtcbiAgfVxuXG4gIC8qKlxuICAgKiBTZW5kIGEgcmVzcG9uc2UgYmFjayB0byB0aGUgQWN0aW9uRGlzcGF0Y2hlci5cbiAgICpcbiAgICogQHBhcmFtIHJlc3BvbnNlIC0gVGhlIHJlc3BvbnNlIHRvIHNlbmQgYXMgTkRKU09OXG4gICAqL1xuICBzZW5kUmVzcG9uc2UocmVzcG9uc2U6IFN3aXRjaFRvSW50ZXJhY3RpdmVSZXNwb25zZSk6IHZvaWQge1xuICAgIHRoaXMuc29ja2V0LndyaXRlKGAke0pTT04uc3RyaW5naWZ5KHJlc3BvbnNlKX1cXG5gKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBTZW5kIGEgcmVzcG9uc2UgYW5kIGNhbGwgY2FsbGJhY2sgd2hlbiBmbHVzaGVkLlxuICAgKlxuICAgKiBVc2VkIHRvIGd1YXJhbnRlZSBmbHVzaCBiZWZvcmUgcHJvY2Vzcy5leGl0LlxuICAgKlxuICAgKiBAcGFyYW0gcmVzcG9uc2UgLSBUaGUgcmVzcG9uc2UgdG8gc2VuZCBhcyBOREpTT05cbiAgICogQHBhcmFtIGNhbGxiYWNrIC0gQ2FsbGVkIGFmdGVyIHRoZSBkYXRhIGlzIGZsdXNoZWQgdG8gdGhlIHNvY2tldFxuICAgKi9cbiAgc2VuZFJlc3BvbnNlVGhlbihyZXNwb25zZTogU3dpdGNoVG9JbnRlcmFjdGl2ZVJlc3BvbnNlLCBjYWxsYmFjazogKCkgPT4gdm9pZCk6IHZvaWQge1xuICAgIHRoaXMuc29ja2V0LndyaXRlKGAke0pTT04uc3RyaW5naWZ5KHJlc3BvbnNlKX1cXG5gLCBjYWxsYmFjayk7XG4gIH1cblxuICAvKipcbiAgICogQ2xvc2UgdGhlIHNvY2tldCBjb25uZWN0aW9uLlxuICAgKi9cbiAgY2xvc2UoKTogdm9pZCB7XG4gICAgdGhpcy5zb2NrZXQuZGVzdHJveSgpO1xuICB9XG59XG4iLCAiLyoqXG4gKiBSdW50aW1lIG9yY2hlc3RyYXRpb24gZm9yIGNvbXBpbGVkIENhcmRzIGFjdGlvbiBhbmQgdHlwZSBoYW5kbGVycy5cbiAqXG4gKiBUaGlzIG1vZHVsZSBpcyBidW5kbGVkIGludG8gY29tcGlsZWQgaGFuZGxlcnMgYnkgdGhlIENMSS4gSXQgcHJvdmlkZXMgdGhlXG4gKiBleGVjdXRpb24gaGFybmVzcyB0aGF0IHJlYWRzIGhhbmRsZXIgaW5wdXQgZnJvbSBlbnZpcm9ubWVudCB2YXJpYWJsZXMsIHNldHNcbiAqIHVwIHRoZSBsb2dnZXIgY29udGV4dCwgaW52b2tlcyB0aGUgdXNlcidzIGhhbmRsZXIsIGFuZCBleGl0cyB0aGUgcHJvY2Vzc1xuICogd2l0aCB0aGUgYXBwcm9wcmlhdGUgY29kZS5cbiAqXG4gKiBUaGUgcnVudGltZSBpcyBkZXNpZ25lZCB0byBuZXZlciByZXR1cm4gaW4gbm9ybWFsIHVzZS4gQWxsIGNvZGUgcGF0aHNcbiAqIHRlcm1pbmF0ZSB3aXRoIGBwcm9jZXNzLmV4aXQoKWAuIFRoZSBvbmx5IGV4Y2VwdGlvbiBpcyB0ZXN0IHNjZW5hcmlvc1xuICogd2hlcmUgYHByb2Nlc3MuZXhpdGAgaXMgbW9ja2VkLlxuICpcbiAqICMjIEV4ZWN1dGlvbiBGbG93XG4gKlxuICogMS4gRXh0cmFjdCBpbnB1dCBwYXlsb2FkIGZyb20gZW52aXJvbm1lbnQgdmFyaWFibGVzIGJhc2VkIG9uIGNvbW1hbmQgdHlwZVxuICogMi4gU2V0IGxvZ2dlciBjb250ZXh0IHdpdGggY29tbWFuZCB0eXBlIGFuZCBpbnB1dFxuICogMy4gT3B0aW9uYWxseSBjb25uZWN0IHRvIFNPQ0tFVF9QQVRIIGZvciBjb21tYW5kIGRpc3BhdGNoIChmYWlsLW9wZW4pXG4gKiA0LiBCdWlsZCBBY3Rpb25Db250ZXh0IHdpdGggbG9nZ2VyLCBjd2QsIGFuZCBzb2NrZXQtYmFja2VkIGNhbGxiYWNrc1xuICogNS4gSW52b2tlIHRoZSBjb21tYW5kIHdpdGggaW5wdXQgYW5kIGNvbnRleHRcbiAqIDYuIE9uIHN1Y2Nlc3M6IGNsZWFuIHVwIHNvY2tldCBhbmQgZXhpdCB3aXRoIGNvZGUgMFxuICogNy4gT24gZXJyb3I6IGxvZyBlcnJvciwgd3JpdGUgdG8gc3RkZXJyLCBjbGVhbiB1cCBhbmQgZXhpdCB3aXRoIGNvZGUgMVxuICpcbiAqXG4gKiBAc3VtbWFyeSBSdW50aW1lIG9yY2hlc3RyYXRpb24gZm9yIGNvbXBpbGVkIENhcmRzIGFjdGlvbiBhbmQgdHlwZSBoYW5kbGVyc1xuICogQG1vZHVsZVxuICogQHNlZSB7QGxpbmsgZXhlY3V0ZUNvbW1hbmR9IGZvciB0aGUgbWFpbiBlbnRyeSBwb2ludFxuICpcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiAvLyBUaGlzIGlzIHdoYXQgY29tcGlsZWQgaGFuZGxlcnMgbG9vayBsaWtlIGludGVybmFsbHlcbiAqIGltcG9ydCB7IGV4ZWN1dGVDb21tYW5kIH0gZnJvbSAnQGNhcmRzL3Nkay9jb25maWcvcnVudGltZSc7XG4gKiBpbXBvcnQgbXlDb21tYW5kIGZyb20gJy4vbXktY29tbWFuZC5qcyc7XG4gKlxuICogZXhlY3V0ZUNvbW1hbmQobXlDb21tYW5kKTtcbiAqIGBgYFxuICovXG5cbmltcG9ydCB0eXBlIHsgQWN0aW9uQ29tbWFuZCwgVHlwZUNyZWF0ZUNvbW1hbmQsIFR5cGVEZWxldGVDb21tYW5kLCBUeXBlVXBkYXRlQ29tbWFuZCB9IGZyb20gJy4vY29tbWFuZC10eXBlcy5qcyc7XG5pbXBvcnQgeyBDQVJEU19FTlZfVkFSUywgZXh0cmFjdEFjdGlvbklucHV0LCBleHRyYWN0VHlwZUlucHV0IH0gZnJvbSAnLi9lbnYuanMnO1xuaW1wb3J0IHsgRVhJVF9DT0RFUywgd3JpdGVFcnJvciB9IGZyb20gJy4vZXhpdC1jb2Rlcy5qcyc7XG5pbXBvcnQgdHlwZSB7IEFjdGlvbkNvbnRleHQsIEFjdGlvbklucHV0LCBUeXBlSG9va0NvbnRleHQsIFR5cGVIb29rSW5wdXQgfSBmcm9tICcuL2lucHV0cy5qcyc7XG5pbXBvcnQgeyBsb2dnZXIgfSBmcm9tICcuL2xvZ2dlci5qcyc7XG5pbXBvcnQgdHlwZSB7IFNvY2tldENvbW1hbmQgfSBmcm9tICcuL3NvY2tldC1jbGllbnQuanMnO1xuaW1wb3J0IHsgU29ja2V0Q2xpZW50IH0gZnJvbSAnLi9zb2NrZXQtY2xpZW50LmpzJztcblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gQ29tbWFuZCBUeXBlIFVuaW9uXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbi8qKlxuICogVW5pb24gb2YgYWxsIGNvbW1hbmQgdHlwZXMgc3VwcG9ydGVkIGJ5IHRoZSBydW50aW1lLlxuICpcbiAqIFRoaXMgdHlwZSB1bmlvbiBhbGxvd3Mge0BsaW5rIGV4ZWN1dGVDb21tYW5kfSB0byBhY2NlcHQgYW55IGNvbW1hbmQgcmV0dXJuZWQgYnlcbiAqIHRoZSBmYWN0b3J5IGZ1bmN0aW9ucy4gVGhlIHJ1bnRpbWUgZGlzcGF0Y2hlcyBiYXNlZCBvbiB0aGUgYGZhY3RvcnlUeXBlYFxuICogZGlzY3JpbWluYW50LlxuICpcbiAqIE5vdGU6IFR5cGVWYWxpZGF0b3JDb21tYW5kIGlzIGV4Y2x1ZGVkIGJlY2F1c2UgdmFsaWRhdG9ycyB1c2UgYSBkaWZmZXJlbnRcbiAqIGV4ZWN1dGlvbiBtb2RlbCAoZmlsZS1wYXRoIHByb3RvY29sIHZpYSB7QGxpbmsgZXhlY3V0ZVZhbGlkYXRpb259KS5cbiAqXG4gKiBAaW50ZXJuYWxcbiAqL1xudHlwZSBBbnlDb21tYW5kID0gQWN0aW9uQ29tbWFuZCB8IFR5cGVDcmVhdGVDb21tYW5kIHwgVHlwZVVwZGF0ZUNvbW1hbmQgfCBUeXBlRGVsZXRlQ29tbWFuZDtcblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gSGVscGVyIEZ1bmN0aW9uc1xuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4vKipcbiAqIE5vcm1hbGl6ZXMgYW4gdW5rbm93biBlcnJvciB2YWx1ZSBpbnRvIGEgaHVtYW4tcmVhZGFibGUgbWVzc2FnZS5cbiAqXG4gKiBFcnJvcnMgaW4gSmF2YVNjcmlwdCBjYW4gYmUgdGhyb3duIHdpdGggYW55IHZhbHVlLiBUaGlzIGZ1bmN0aW9uIGVuc3VyZXNcbiAqIHdlIGFsd2F5cyBnZXQgYSBzdHJpbmcgbWVzc2FnZSByZWdhcmRsZXNzIG9mIHdoYXQgd2FzIHRocm93bi5cbiAqXG4gKiBAcGFyYW0gZXJyb3IgLSBUaGUgY2F1Z2h0IGVycm9yIHZhbHVlLCB3aGljaCBtYXkgb3IgbWF5IG5vdCBiZSBhbiBFcnJvciBpbnN0YW5jZVxuICogQHJldHVybnMgQSBzdHJpbmcgbWVzc2FnZSBzdWl0YWJsZSBmb3IgbG9nZ2luZyBvciBkaXNwbGF5XG4gKlxuICogQGludGVybmFsXG4gKi9cbmZ1bmN0aW9uIGdldEVycm9yTWVzc2FnZShlcnJvcjogdW5rbm93bik6IHN0cmluZyB7XG4gIHJldHVybiBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6IFN0cmluZyhlcnJvcik7XG59XG5cbi8qKlxuICogQ2xlYW5zIHVwIGxvZ2dlciBzdGF0ZSBhbmQgdGVybWluYXRlcyB0aGUgcHJvY2Vzcy5cbiAqXG4gKiBUaGlzIGZ1bmN0aW9uIG5ldmVyIHJldHVybnMuIEl0IGNsZWFycyB0aGUgbG9nZ2VyJ3MgY29udGV4dCwgY2xvc2VzXG4gKiBvcGVuIGZpbGUgaGFuZGxlcyB0byBmbHVzaCBwZW5kaW5nIHdyaXRlcywgYW5kIGV4aXRzIHdpdGggdGhlIHNwZWNpZmllZFxuICogY29kZS5cbiAqXG4gKiBAcGFyYW0gZXhpdENvZGUgLSBUaGUgZXhpdCBjb2RlIHRvIHBhc3MgdG8gYHByb2Nlc3MuZXhpdCgpYFxuICogQHJldHVybnMgTmV2ZXIgcmV0dXJuczsgcHJvY2VzcyB0ZXJtaW5hdGVzXG4gKlxuICogQGludGVybmFsXG4gKi9cbmZ1bmN0aW9uIGNsZWFudXBBbmRFeGl0KGV4aXRDb2RlOiBudW1iZXIpOiBuZXZlciB7XG4gIGxvZ2dlci5jbGVhckNvbnRleHQoKTtcbiAgbG9nZ2VyLmNsb3NlKCk7XG4gIHByb2Nlc3MuZXhpdChleGl0Q29kZSk7XG59XG5cbi8qKlxuICogSGFuZGxlcyBlcnJvcnMgZHVyaW5nIGVudmlyb25tZW50IHZhcmlhYmxlIGV4dHJhY3Rpb24uXG4gKlxuICogRW52aXJvbm1lbnQgZXh0cmFjdGlvbiBjYW4gZmFpbCBpZiByZXF1aXJlZCB2YXJpYWJsZXMgYXJlIG1pc3Npbmcgb3JcbiAqIG1hbGZvcm1lZC4gVGhpcyBwcm92aWRlcyB1c2VyLWZyaWVuZGx5IGVycm9yIG91dHB1dCBhbmQgZW5zdXJlcyBwcm9wZXJcbiAqIGNsZWFudXAgYmVmb3JlIGV4aXQuXG4gKlxuICogQHBhcmFtIGVycm9yIC0gVGhlIGVycm9yIHRocm93biBkdXJpbmcgZXh0cmFjdGlvblxuICogQHJldHVybnMgTmV2ZXIgcmV0dXJuczsgcHJvY2VzcyB0ZXJtaW5hdGVzIHdpdGggZXJyb3IgY29kZVxuICpcbiAqIEBpbnRlcm5hbFxuICovXG5mdW5jdGlvbiBoYW5kbGVFbnZFeHRyYWN0aW9uRXJyb3IoZXJyb3I6IHVua25vd24pOiBuZXZlciB7XG4gIGNvbnN0IG1lc3NhZ2UgPSBnZXRFcnJvck1lc3NhZ2UoZXJyb3IpO1xuICBsb2dnZXIuZXJyb3IoYEZhaWxlZCB0byBleHRyYWN0IGlucHV0IGZyb20gZW52aXJvbm1lbnQ6ICR7bWVzc2FnZX1gKTtcbiAgd3JpdGVFcnJvcihgSGFuZGxlciBmYWlsZWQ6ICR7bWVzc2FnZX1gKTtcbiAgY2xlYW51cEFuZEV4aXQoRVhJVF9DT0RFUy5FUlJPUik7XG59XG5cbi8qKlxuICogSGFuZGxlcyBlcnJvcnMgdGhyb3duIGJ5IHRoZSB1c2VyJ3MgY29tbWFuZCBoYW5kbGVyLlxuICpcbiAqIFdoZW4gYSBoYW5kbGVyIHRocm93cyBvciByZWplY3RzLCB3ZSB3YW50IHRvIHByb3ZpZGUgdXNlZnVsIGRlYnVnZ2luZ1xuICogaW5mb3JtYXRpb24uIFRoaXMgd3JpdGVzIHRoZSBmdWxsIHN0YWNrIHRyYWNlIHRvIHN0ZGVyciAod2hpY2ggdGhlXG4gKiBleGVjdXRpb24gd3JhcHBlciBjYXB0dXJlcykgYW5kIGxvZ3MgYSBzdHJ1Y3R1cmVkIGVycm9yIGV2ZW50LlxuICpcbiAqIEBwYXJhbSBlcnJvciAtIFRoZSBlcnJvciB0aHJvd24gb3IgcmVqZWN0aW9uIHJlYXNvbiBmcm9tIHRoZSBoYW5kbGVyXG4gKiBAcmV0dXJucyBOZXZlciByZXR1cm5zOyBwcm9jZXNzIHRlcm1pbmF0ZXMgd2l0aCBlcnJvciBjb2RlXG4gKlxuICogQGludGVybmFsXG4gKi9cbmZ1bmN0aW9uIGhhbmRsZUhhbmRsZXJFcnJvcihlcnJvcjogdW5rbm93bik6IG5ldmVyIHtcbiAgY29uc3QgZXJyb3JPdXRwdXQgPSBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gKGVycm9yLnN0YWNrID8/IGVycm9yLm1lc3NhZ2UpIDogU3RyaW5nKGVycm9yKTtcbiAgcHJvY2Vzcy5zdGRlcnIud3JpdGUoYCR7ZXJyb3JPdXRwdXR9XFxuYCk7XG4gIGxvZ2dlci5lcnJvcihgSGFuZGxlciBlcnJvcjogJHtnZXRFcnJvck1lc3NhZ2UoZXJyb3IpfWApO1xuICBjbGVhbnVwQW5kRXhpdChFWElUX0NPREVTLkVSUk9SKTtcbn1cblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gRXhlY3V0ZSBGdW5jdGlvblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4vKipcbiAqIEV4ZWN1dGVzIGEgY29tbWFuZCBoYW5kbGVyIHdpdGggZnVsbCBydW50aW1lIG9yY2hlc3RyYXRpb24uXG4gKlxuICogVGhpcyBpcyB0aGUgbWFpbiBlbnRyeSBwb2ludCB0aGF0IGNvbXBpbGVkIGhhbmRsZXJzIHVzZS4gVGhlIENMSSBnZW5lcmF0ZXNcbiAqIHdyYXBwZXIgY29kZSB0aGF0IGltcG9ydHMgdGhlIHVzZXIncyBjb21tYW5kIGFuZCBwYXNzZXMgaXQgdG8gdGhpcyBmdW5jdGlvbi5cbiAqIEZyb20gdGhlcmUsIGV4ZWN1dGVDb21tYW5kIGhhbmRsZXMgYWxsIHRoZSBjZXJlbW9ueTogZW52aXJvbm1lbnQgcGFyc2luZywgbG9nZ2luZ1xuICogc2V0dXAsIGhhbmRsZXIgaW52b2NhdGlvbiwgZXJyb3IgaGFuZGxpbmcsIGFuZCBwcm9jZXNzIHRlcm1pbmF0aW9uLlxuICpcbiAqIFRoZSBmdW5jdGlvbiBleGl0cyB0aGUgcHJvY2VzcyBpbiBhbGwgbm9ybWFsIGNvZGUgcGF0aHMuIFRoZSByZXR1cm5lZFxuICogcHJvbWlzZSBvbmx5IHJlc29sdmVzIGlmIGBwcm9jZXNzLmV4aXRgIGlzIG1vY2tlZCwgd2hpY2ggaGFwcGVucyBpbiB0ZXN0XG4gKiBzY2VuYXJpb3MuIFByb2R1Y3Rpb24gY29kZSBzaG91bGQgbm90IGF3YWl0IHRoaXMgZnVuY3Rpb24gb3IgZXhwZWN0IGl0XG4gKiB0byByZXR1cm4uXG4gKlxuICogIyMgU3VwcG9ydGVkIENvbW1hbmQgVHlwZXNcbiAqXG4gKiAtICoqQWN0aW9uKiogKGBhY3Rpb25gKTogSW52b2tlZCB3aGVuIGFuIGFjdGlvbiBpcyB0cmlnZ2VyZWRcbiAqIC0gKipUeXBlIENyZWF0ZSoqIChgdHlwZUNyZWF0ZWApOiBSdW5zIGFmdGVyIG5ldyB0eXBlZCBmaWxlIGNyZWF0aW9uXG4gKiAtICoqVHlwZSBVcGRhdGUqKiAoYHR5cGVVcGRhdGVgKTogUnVucyBhZnRlciB0eXBlZCBmaWxlIG1vZGlmaWNhdGlvblxuICogLSAqKlR5cGUgRGVsZXRlKiogKGB0eXBlRGVsZXRlYCk6IFJ1bnMgd2hlbiB0eXBlZCBmaWxlIGlzIGRlbGV0ZWRcbiAqXG4gKiBOb3RlOiBUeXBlIHZhbGlkYXRvcnMgdXNlIGEgZGlmZmVyZW50IGV4ZWN1dGlvbiBtb2RlbCAoZmlsZS1wYXRoIHByb3RvY29sKVxuICogYW5kIHNob3VsZCBiZSBleGVjdXRlZCB2aWEge0BsaW5rIGV4ZWN1dGVWYWxpZGF0aW9ufSBpbnN0ZWFkLlxuICpcbiAqICMjIEVycm9yIEhhbmRsaW5nXG4gKlxuICogRXJyb3JzIGFyZSBoYW5kbGVkIGF0IHRocmVlIGxldmVsczpcbiAqXG4gKiAxLiAqKkVudmlyb25tZW50IGV4dHJhY3Rpb24gZXJyb3JzKiogKG1pc3NpbmcvaW52YWxpZCB2YXJpYWJsZXMpOiBMb2cgdGhlXG4gKiAgICBlcnJvciBhbmQgZXhpdC4gVGhlc2UgaW5kaWNhdGUgYSBwcm9ibGVtIHdpdGggaG93IHRoZSBoYW5kbGVyIHdhcyBpbnZva2VkLlxuICpcbiAqIDIuICoqSGFuZGxlciBlcnJvcnMqKiAodXNlciBjb2RlIHRocm93cyk6IFdyaXRlIHRoZSBzdGFjayB0cmFjZSB0byBzdGRlcnIsXG4gKiAgICBsb2cgYSBzdHJ1Y3R1cmVkIGVycm9yLCBhbmQgZXhpdC4gVGhlIGV4ZWN1dGlvbiB3cmFwcGVyIGNhcHR1cmVzIHN0ZGVyclxuICogICAgZm9yIGRlYnVnZ2luZy5cbiAqXG4gKiAzLiAqKlVuZXhwZWN0ZWQgZXJyb3JzKio6IENhdGNoLWFsbCBmb3IgYW55IG90aGVyIGZhaWx1cmVzIGR1cmluZyBydW50aW1lXG4gKiAgICBvcmNoZXN0cmF0aW9uLlxuICpcbiAqIEBwYXJhbSBjb21tYW5kIC0gVGhlIGNvbW1hbmQgdG8gZXhlY3V0ZSwgcmV0dXJuZWQgZnJvbSBhIGZhY3RvcnkgZnVuY3Rpb25cbiAqIEByZXR1cm5zIEEgcHJvbWlzZSB0aGF0IHJlc29sdmVzIG9ubHkgd2hlbiBgcHJvY2Vzcy5leGl0YCBpcyBtb2NrZWQgKHRlc3RzKVxuICpcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiAvLyBHZW5lcmF0ZWQgd3JhcHBlciBjb2RlIChwcm9kdWNlZCBieSBDTEkpXG4gKiBpbXBvcnQgeyBleGVjdXRlQ29tbWFuZCB9IGZyb20gJ0BjYXJkcy9zZGsvY29uZmlnL3J1bnRpbWUnO1xuICogaW1wb3J0IGNvbW1hbmQgZnJvbSAnLi91c2VyLWNvbW1hbmQuanMnO1xuICpcbiAqIC8vIFRoaXMgY2FsbCBuZXZlciByZXR1cm5zIGluIHByb2R1Y3Rpb25cbiAqIGV4ZWN1dGVDb21tYW5kKGNvbW1hbmQpO1xuICogYGBgXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBleGVjdXRlQ29tbWFuZChjb21tYW5kOiBBbnlDb21tYW5kKTogUHJvbWlzZTx2b2lkPiB7XG4gIHRyeSB7XG4gICAgbGV0IGlucHV0OiBBY3Rpb25JbnB1dCB8IFR5cGVIb29rSW5wdXQ7XG5cbiAgICB0cnkge1xuICAgICAgaWYgKGNvbW1hbmQuZmFjdG9yeVR5cGUgPT09ICdhY3Rpb24nKSB7XG4gICAgICAgIGlucHV0ID0gZXh0cmFjdEFjdGlvbklucHV0KCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpbnB1dCA9IGV4dHJhY3RUeXBlSW5wdXQoKTtcbiAgICAgIH1cbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgcmV0dXJuIGhhbmRsZUVudkV4dHJhY3Rpb25FcnJvcihlcnJvcik7XG4gICAgfVxuXG4gICAgLy8gU2V0IGxvZ2dlciBjb250ZXh0IHdpdGggY29tbWFuZCB0eXBlXG4gICAgbG9nZ2VyLnNldENvbnRleHQoY29tbWFuZC5mYWN0b3J5VHlwZSwgeyAuLi5pbnB1dCB9KTtcblxuICAgIGlmIChjb21tYW5kLmZhY3RvcnlUeXBlID09PSAnYWN0aW9uJykge1xuICAgICAgLy8gU29ja2V0IGNvbm5lY3Rpb24gYW5kIEFjdGlvbkNvbnRleHQgZm9yIGFjdGlvbiBjb21tYW5kc1xuICAgICAgbGV0IHNvY2tldENsaWVudDogU29ja2V0Q2xpZW50IHwgdW5kZWZpbmVkO1xuICAgICAgY29uc3Qgc29ja2V0UGF0aCA9IHByb2Nlc3MuZW52W0NBUkRTX0VOVl9WQVJTLlNPQ0tFVF9QQVRIXTtcbiAgICAgIGlmIChzb2NrZXRQYXRoKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgc29ja2V0Q2xpZW50ID0gYXdhaXQgU29ja2V0Q2xpZW50LmNvbm5lY3Qoc29ja2V0UGF0aCk7XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgbG9nZ2VyLndhcm4oYEZhaWxlZCB0byBjb25uZWN0IHRvIHNvY2tldCBhdCAke3NvY2tldFBhdGh9OiAke2dldEVycm9yTWVzc2FnZShlcnJvcil9YCk7XG4gICAgICAgICAgLy8gRmFpbC1vcGVuOiBjb250aW51ZSB3aXRob3V0IHNvY2tldFxuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIC8vIENhbGxiYWNrIHJlZ2lzdHJhdGlvbiBzdGF0ZVxuICAgICAgbGV0IGNhbmNlbENhbGxiYWNrOiAoKCkgPT4gdm9pZCB8IFByb21pc2U8dm9pZD4pIHwgdW5kZWZpbmVkO1xuICAgICAgbGV0IHN3aXRjaFRvSW50ZXJhY3RpdmVDYWxsYmFjazogKCgpID0+IHVua25vd24gfCBQcm9taXNlPHVua25vd24+KSB8IHVuZGVmaW5lZDtcbiAgICAgIGxldCBjb21tYW5kUHJvY2Vzc2VkID0gZmFsc2U7XG5cbiAgICAgIC8vIEJ1aWxkIEFjdGlvbkNvbnRleHQgd2l0aCBsb2dnZXIsIGN3ZCwgYW5kIHNvY2tldC1iYWNrZWQgY2FsbGJhY2tzXG4gICAgICBjb25zdCBjb250ZXh0OiBBY3Rpb25Db250ZXh0ID0ge1xuICAgICAgICBsb2dnZXIsXG4gICAgICAgIGN3ZDogcHJvY2Vzcy5jd2QoKSxcbiAgICAgICAgb25DYW5jZWw6IChjYWxsYmFjaykgPT4ge1xuICAgICAgICAgIGNhbmNlbENhbGxiYWNrID0gY2FsbGJhY2s7XG4gICAgICAgIH0sXG4gICAgICAgIG9uU3dpdGNoVG9JbnRlcmFjdGl2ZTogKGNhbGxiYWNrKSA9PiB7XG4gICAgICAgICAgc3dpdGNoVG9JbnRlcmFjdGl2ZUNhbGxiYWNrID0gY2FsbGJhY2s7XG4gICAgICAgIH1cbiAgICAgIH07XG5cbiAgICAgIC8vIFdpcmUgc29ja2V0IGNvbW1hbmQgZGlzcGF0Y2hcbiAgICAgIGlmIChzb2NrZXRDbGllbnQpIHtcbiAgICAgICAgc29ja2V0Q2xpZW50Lm9uQ29tbWFuZCgoY21kOiBTb2NrZXRDb21tYW5kKSA9PiB7XG4gICAgICAgICAgLy8gRmlyc3Qtd2lucyBzZW1hbnRpY3M6IGlnbm9yZSBzdWJzZXF1ZW50IGNvbW1hbmRzXG4gICAgICAgICAgaWYgKGNvbW1hbmRQcm9jZXNzZWQpIHJldHVybjtcbiAgICAgICAgICBjb21tYW5kUHJvY2Vzc2VkID0gdHJ1ZTtcblxuICAgICAgICAgIGlmIChjbWQudHlwZSA9PT0gJ2NhbmNlbCcpIHtcbiAgICAgICAgICAgIGhhbmRsZUNhbmNlbENvbW1hbmQoY2FuY2VsQ2FsbGJhY2ssIHNvY2tldENsaWVudCk7XG4gICAgICAgICAgfSBlbHNlIGlmIChjbWQudHlwZSA9PT0gJ3N3aXRjaFRvSW50ZXJhY3RpdmUnKSB7XG4gICAgICAgICAgICBoYW5kbGVTd2l0Y2hUb0ludGVyYWN0aXZlQ29tbWFuZChzd2l0Y2hUb0ludGVyYWN0aXZlQ2FsbGJhY2ssIHNvY2tldENsaWVudCEpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIC8vIEV4ZWN1dGUgdGhlIGFjdGlvbiBjb21tYW5kIGhhbmRsZXJcbiAgICAgIHRyeSB7XG4gICAgICAgIGF3YWl0IGNvbW1hbmQoaW5wdXQgYXMgQWN0aW9uSW5wdXQsIGNvbnRleHQpO1xuICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgc29ja2V0Q2xpZW50Py5jbG9zZSgpO1xuICAgICAgICByZXR1cm4gaGFuZGxlSGFuZGxlckVycm9yKGVycm9yKTtcbiAgICAgIH1cblxuICAgICAgLy8gQ2xlYW4gdXAgc29ja2V0IGFuZCBleGl0IHN1Y2Nlc3NmdWxseVxuICAgICAgc29ja2V0Q2xpZW50Py5jbG9zZSgpO1xuICAgICAgY2xlYW51cEFuZEV4aXQoRVhJVF9DT0RFUy5TVUNDRVNTKTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gVHlwZUhvb2tDb250ZXh0IGZvciB0eXBlIGxpZmVjeWNsZSBob29rc1xuICAgICAgY29uc3QgY29udGV4dDogVHlwZUhvb2tDb250ZXh0ID0ge1xuICAgICAgICBsb2dnZXIsXG4gICAgICAgIGN3ZDogcHJvY2Vzcy5jd2QoKVxuICAgICAgfTtcblxuICAgICAgLy8gRXhlY3V0ZSB0aGUgdHlwZSBob29rIGNvbW1hbmQgaGFuZGxlclxuICAgICAgdHJ5IHtcbiAgICAgICAgYXdhaXQgY29tbWFuZChpbnB1dCBhcyBUeXBlSG9va0lucHV0LCBjb250ZXh0KTtcbiAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgIHJldHVybiBoYW5kbGVIYW5kbGVyRXJyb3IoZXJyb3IpO1xuICAgICAgfVxuXG4gICAgICBjbGVhbnVwQW5kRXhpdChFWElUX0NPREVTLlNVQ0NFU1MpO1xuICAgIH1cbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAvLyBVbmV4cGVjdGVkIGVycm9yIC0gdHJ5IHRvIGNsZWFuIHVwIGFuZCBleGl0XG4gICAgbG9nZ2VyLmVycm9yKGBVbmV4cGVjdGVkIHJ1bnRpbWUgZXJyb3I6ICR7Z2V0RXJyb3JNZXNzYWdlKGVycm9yKX1gKTtcbiAgICBjbGVhbnVwQW5kRXhpdChFWElUX0NPREVTLkVSUk9SKTtcbiAgfVxufVxuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBTb2NrZXQgQ29tbWFuZCBIYW5kbGVyc1xuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4vKipcbiAqIFJlc29sdmVzIGEgY2FsbGJhY2sgcmVzdWx0IHRoYXQgbWF5IGJlIHN5bmMgb3IgYXN5bmMgaW50byBhIFByb21pc2UuXG4gKlxuICogVXNlci1yZWdpc3RlcmVkIGNhbGxiYWNrcyBtYXkgcmV0dXJuIHZvaWQsIGEgdmFsdWUsIG9yIGEgUHJvbWlzZS5cbiAqIFRoaXMgbm9ybWFsaXplcyBhbGwgY2FzZXMgaW50byBhIHNpbmdsZSBQcm9taXNlIGZvciBjb25zaXN0ZW50IGhhbmRsaW5nLlxuICpcbiAqIEBwYXJhbSByZXN1bHQgLSBDYWxsYmFjayByZXR1cm4gdmFsdWUgdGhhdCBtYXkgYWxyZWFkeSBiZSBhIHByb21pc2UuXG4gKiBAcmV0dXJucyBQcm9taXNlIHJlc29sdmluZyB0byB0aGUgY2FsbGJhY2sgcmVzdWx0LlxuICogQGludGVybmFsXG4gKi9cbmZ1bmN0aW9uIHRvUHJvbWlzZTxUPihyZXN1bHQ6IFQgfCBQcm9taXNlPFQ+KTogUHJvbWlzZTxUPiB7XG4gIGlmIChyZXN1bHQgJiYgdHlwZW9mIChyZXN1bHQgYXMgUHJvbWlzZTxUPikudGhlbiA9PT0gJ2Z1bmN0aW9uJykge1xuICAgIHJldHVybiByZXN1bHQgYXMgUHJvbWlzZTxUPjtcbiAgfVxuICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKHJlc3VsdCk7XG59XG5cbi8qKlxuICogSGFuZGxlcyBhIGBjYW5jZWxgIGNvbW1hbmQgZnJvbSB0aGUgc29ja2V0LlxuICpcbiAqIElmIGEgY2FuY2VsIGNhbGxiYWNrIHdhcyByZWdpc3RlcmVkLCBpdCBpcyBpbnZva2VkLiBPdGhlcndpc2UsIFNJR1RFUk1cbiAqIGlzIHNlbnQgdG8gdGhlIGN1cnJlbnQgcHJvY2VzcyBhcyBhIGZhbGxiYWNrLiBBZnRlciB0aGUgY2FsbGJhY2sgY29tcGxldGVzXG4gKiAob3IgaW1tZWRpYXRlbHkgaWYgbm8gY2FsbGJhY2spLCB0aGUgcHJvY2VzcyBleGl0cyB3aXRoIGVycm9yIGNvZGUuXG4gKlxuICogQHBhcmFtIGNhbGxiYWNrIC0gVGhlIHJlZ2lzdGVyZWQgY2FuY2VsIGNhbGxiYWNrLCBpZiBhbnlcbiAqIEBwYXJhbSBzb2NrZXRDbGllbnQgLSBUaGUgc29ja2V0IGNsaWVudCB0byBjbG9zZSBiZWZvcmUgZXhpdGluZ1xuICpcbiAqIEBpbnRlcm5hbFxuICovXG5mdW5jdGlvbiBoYW5kbGVDYW5jZWxDb21tYW5kKFxuICBjYWxsYmFjazogKCgpID0+IHZvaWQgfCBQcm9taXNlPHZvaWQ+KSB8IHVuZGVmaW5lZCxcbiAgc29ja2V0Q2xpZW50OiBTb2NrZXRDbGllbnQgfCB1bmRlZmluZWRcbik6IHZvaWQge1xuICBpZiAoIWNhbGxiYWNrKSB7XG4gICAgcHJvY2Vzcy5raWxsKHByb2Nlc3MucGlkLCAnU0lHVEVSTScpO1xuICAgIHJldHVybjtcbiAgfVxuXG4gIHRvUHJvbWlzZShjYWxsYmFjaygpKS50aGVuKFxuICAgICgpID0+IHtcbiAgICAgIHNvY2tldENsaWVudD8uY2xvc2UoKTtcbiAgICAgIGNsZWFudXBBbmRFeGl0KEVYSVRfQ09ERVMuRVJST1IpO1xuICAgIH0sXG4gICAgKCkgPT4ge1xuICAgICAgc29ja2V0Q2xpZW50Py5jbG9zZSgpO1xuICAgICAgY2xlYW51cEFuZEV4aXQoRVhJVF9DT0RFUy5FUlJPUik7XG4gICAgfVxuICApO1xufVxuXG4vKipcbiAqIEhhbmRsZXMgYSBgc3dpdGNoVG9JbnRlcmFjdGl2ZWAgY29tbWFuZCBmcm9tIHRoZSBzb2NrZXQuXG4gKlxuICogSWYgbm8gY2FsbGJhY2sgd2FzIHJlZ2lzdGVyZWQsIHRoZSBjb21tYW5kIGlzIGlnbm9yZWQgKG5vLW9wKS4gT3RoZXJ3aXNlLFxuICogdGhlIGNhbGxiYWNrIGlzIGludm9rZWQgYW5kIGl0cyByZXR1cm4gdmFsdWUgaXMgc2VudCBhc1xuICogYHN3aXRjaFRvSW50ZXJhY3RpdmVSZXNwb25zZWAgb24gdGhlIHNvY2tldC4gYHByb2Nlc3MuZXhpdCg0MilgIGlzIGNhbGxlZFxuICogaW5zaWRlIHRoZSBgd3JpdGUoKWAgY2FsbGJhY2sgdG8gZ3VhcmFudGVlIHRoZSByZXNwb25zZSBpcyBmbHVzaGVkIGJlZm9yZVxuICogdGhlIGV2ZW50IGxvb3AgdGVhcnMgZG93bi5cbiAqXG4gKiBAcGFyYW0gY2FsbGJhY2sgLSBUaGUgcmVnaXN0ZXJlZCBzd2l0Y2hUb0ludGVyYWN0aXZlIGNhbGxiYWNrLCBpZiBhbnlcbiAqIEBwYXJhbSBzb2NrZXRDbGllbnQgLSBUaGUgc29ja2V0IGNsaWVudCB1c2VkIHRvIHNlbmQgdGhlIHJlc3BvbnNlXG4gKlxuICogQGludGVybmFsXG4gKi9cbmZ1bmN0aW9uIGhhbmRsZVN3aXRjaFRvSW50ZXJhY3RpdmVDb21tYW5kKFxuICBjYWxsYmFjazogKCgpID0+IHVua25vd24gfCBQcm9taXNlPHVua25vd24+KSB8IHVuZGVmaW5lZCxcbiAgc29ja2V0Q2xpZW50OiBTb2NrZXRDbGllbnRcbik6IHZvaWQge1xuICBpZiAoIWNhbGxiYWNrKSB7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgdG9Qcm9taXNlKGNhbGxiYWNrKCkpLnRoZW4oXG4gICAgKGRhdGEpID0+IHtcbiAgICAgIHNvY2tldENsaWVudC5zZW5kUmVzcG9uc2VUaGVuKHsgdHlwZTogJ3N3aXRjaFRvSW50ZXJhY3RpdmVSZXNwb25zZScsIGRhdGEgfSwgKCkgPT4ge1xuICAgICAgICBjbGVhbnVwQW5kRXhpdChFWElUX0NPREVTLlNXSVRDSF9UT19JTlRFUkFDVElWRSk7XG4gICAgICB9KTtcbiAgICB9LFxuICAgIChlcnJvcikgPT4ge1xuICAgICAgbG9nZ2VyLmVycm9yKGBzd2l0Y2hUb0ludGVyYWN0aXZlIGNhbGxiYWNrIGVycm9yOiAke2dldEVycm9yTWVzc2FnZShlcnJvcil9YCk7XG4gICAgICBzb2NrZXRDbGllbnQuY2xvc2UoKTtcbiAgICAgIGNsZWFudXBBbmRFeGl0KEVYSVRfQ09ERVMuRVJST1IpO1xuICAgIH1cbiAgKTtcbn1cbiIsICIvKipcbiAqIFNoYXJlZCBzZXNzaW9uIHV0aWxpdGllcyBmb3IgQ2xhdWRlIENvZGUgYWN0aW9uIHdvcmtmbG93cy5cbiAqXG4gKiBQcm92aWRlcyByZXVzYWJsZSBidWlsZGluZyBibG9ja3MgZm9yIGFjdGlvbnMgdGhhdCBzcGF3biB0aGUgYGNsYXVkZWAgQ0xJOlxuICogcGx1Z2luIHNldHRpbmdzIGNvbnN0cnVjdGlvbiwgQ0xJIGFyZyBidWlsZGluZywgd29ya3RyZWUgbGlmZWN5Y2xlIG1hbmFnZW1lbnQsXG4gKiBhbmQgYnJhbmNoIGNsZWFudXAuIEJvdGggdGhlIGBsYXVuY2hgIGFuZCBgaW50ZXJ2aWV3YCBhY3Rpb25zIGNvbnN1bWUgdGhlc2VcbiAqIHV0aWxpdGllcy5cbiAqXG4gKiBAc3VtbWFyeSBTaGFyZWQgc2Vzc2lvbiB1dGlsaXRpZXMgZm9yIENsYXVkZSBDb2RlIGFjdGlvbiB3b3JrZmxvd3NcbiAqIEBtb2R1bGVcbiAqL1xuXG5pbXBvcnQgeyB0eXBlIENoaWxkUHJvY2VzcywgZXhlY0ZpbGUsIHNwYXduIH0gZnJvbSAnbm9kZTpjaGlsZF9wcm9jZXNzJztcbmltcG9ydCAqIGFzIGZzIGZyb20gJ25vZGU6ZnMvcHJvbWlzZXMnO1xuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdub2RlOnBhdGgnO1xuaW1wb3J0IHsgcHJvbWlzaWZ5IH0gZnJvbSAnbm9kZTp1dGlsJztcbmltcG9ydCB7IENhcmRzQ2xpZW50IH0gZnJvbSAnQGNhcmRzL3Nkay9jbGllbnQnO1xuaW1wb3J0IHsgdHlwZSBBY3Rpb25Db250ZXh0LCB0eXBlIEFjdGlvbklucHV0LCBDQVJEU19FTlZfVkFSUyB9IGZyb20gJ0BjYXJkcy9zZGsvY29uZmlnJztcbmltcG9ydCB7IHJlc29sdmVDbGF1ZGVDb25maWdEaXIsIHVwZGF0ZU1hcmtldHBsYWNlUmVnaXN0cmF0aW9uIH0gZnJvbSAnQGNhcmRzL3Nkay9tYXJrZXRwbGFjZSc7XG5leHBvcnQgeyByZXNvbHZlQ2xhdWRlQ29uZmlnRGlyLCB1cGRhdGVNYXJrZXRwbGFjZVJlZ2lzdHJhdGlvbiB9O1xuXG5pbXBvcnQgeyBjaGVja1dvcmt0cmVlRXhpc3RzLCBjcmVhdGVXb3JrdHJlZSwgZmluZEdpdFJvb3RzIH0gZnJvbSAnQGNhcmRzL3Nkay93b3JrdHJlZSc7XG5pbXBvcnQgeyBzcGF3bkJyYW5jaENsZWFudXBXYXRjaGVyIH0gZnJvbSAnLi9icmFuY2gtY2xlYW51cC13YXRjaGVyLmpzJztcblxuY29uc3QgZXhlY0ZpbGVBc3luYyA9IHByb21pc2lmeShleGVjRmlsZSk7XG5cbi8qKlxuICogRXh0cmFjdHMgYSBodW1hbi1yZWFkYWJsZSBtZXNzYWdlIGZyb20gYW4gdW5rbm93biBjYXRjaCB2YWx1ZS5cbiAqIEBwYXJhbSBlcnJvciAtIFRoZSBjYXVnaHQgdmFsdWUgdG8gZXh0cmFjdCBhIG1lc3NhZ2UgZnJvbS5cbiAqIEByZXR1cm5zIFRoZSBlcnJvciBtZXNzYWdlIHN0cmluZy5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGVycm9yTWVzc2FnZShlcnJvcjogdW5rbm93bik6IHN0cmluZyB7XG4gIHJldHVybiBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6IFN0cmluZyhlcnJvcik7XG59XG5cbi8qKlxuICogUmVzb2x2ZXMgdGhlIG1hcmtldHBsYWNlIGRpcmVjdG9yeSBidW5kbGVkIHdpdGggdGhlIGluc3RhbGxlZCBleHRlbnNpb24uXG4gKiBVc2VzIHRoZSBFWFRFTlNJT05fUEFUSCBlbnZpcm9ubWVudCB2YXJpYWJsZSBpbmplY3RlZCBieSBBY3Rpb25EaXNwYXRjaGVyLlxuICpcbiAqIEByZXR1cm5zIEFic29sdXRlIHBhdGggdG8gdGhlIGJ1bmRsZWQgbWFya2V0cGxhY2UgZGlyZWN0b3J5LlxuICogQHRocm93cyBFcnJvciBpZiBFWFRFTlNJT05fUEFUSCBpcyBub3Qgc2V0LlxuICovXG5leHBvcnQgZnVuY3Rpb24gcmVzb2x2ZU1hcmtldHBsYWNlUGF0aCgpOiBzdHJpbmcge1xuICBjb25zdCBleHRlbnNpb25QYXRoID0gcHJvY2Vzcy5lbnZbQ0FSRFNfRU5WX1ZBUlMuRVhURU5TSU9OX1BBVEhdO1xuICBpZiAoIWV4dGVuc2lvblBhdGgpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYE1pc3NpbmcgcmVxdWlyZWQgZW52aXJvbm1lbnQgdmFyaWFibGU6ICR7Q0FSRFNfRU5WX1ZBUlMuRVhURU5TSU9OX1BBVEh9YCk7XG4gIH1cbiAgcmV0dXJuIHBhdGguam9pbihleHRlbnNpb25QYXRoLCAnZGlzdCcsICdtYXJrZXRwbGFjZScpO1xufVxuXG4vKipcbiAqIEJ1aWxkcyB0aGUgYC0tc2V0dGluZ3NgIEpTT04gdGhhdCBlbmFibGVzIHRoZSBgcnVudGltZWAgcGx1Z2luIGFuZCByZWdpc3RlcnNcbiAqIHRoZSBgY2FyZHMubWFuYWdlbWVudGAgbWFya2V0cGxhY2Ugc291cmNlIHNvIHRoZSBzcGF3bmVkIGBjbGF1ZGVgIHByb2Nlc3NcbiAqIGNhbiByZXNvbHZlIHRoZSBwbHVnaW4gZnJvbSB0aGUgZXh0ZW5zaW9uJ3MgYnVuZGxlZCBtYXJrZXRwbGFjZS5cbiAqXG4gKiBVc2VzIHRoZSBtYXJrZXRwbGFjZSBidW5kbGVkIGluc2lkZSB0aGUgZXh0ZW5zaW9uIGluc3RhbGwgZGlyZWN0b3J5XG4gKiAoYDxFWFRFTlNJT05fUEFUSD4vZGlzdC9tYXJrZXRwbGFjZWApIHNvIHRoZSBzcGF3bmVkIHNlc3Npb24gYWx3YXlzIGxvYWRzIHRoZVxuICogcGx1Z2luIHZlcnNpb24gdGhhdCBzaGlwcGVkIHdpdGggdGhlIGV4dGVuc2lvbiwgcmVnYXJkbGVzcyBvZiB3b3JrdHJlZSBzdGF0ZS5cbiAqXG4gKiBAcGFyYW0gbWFya2V0cGxhY2VQYXRoIC0gQWJzb2x1dGUgcGF0aCB0byB0aGUgYnVuZGxlZCBtYXJrZXRwbGFjZSBkaXJlY3RvcnkuXG4gKiBAcmV0dXJucyBTZXJpYWxpc2VkIHNldHRpbmdzIEpTT04gc3RyaW5nLlxuICovXG5leHBvcnQgZnVuY3Rpb24gYnVpbGRQbHVnaW5TZXR0aW5ncyhtYXJrZXRwbGFjZVBhdGg6IHN0cmluZyk6IHN0cmluZyB7XG4gIHJldHVybiBKU09OLnN0cmluZ2lmeSh7XG4gICAgZW5hYmxlZFBsdWdpbnM6IHsgJ3J1bnRpbWVAY2FyZHMubWFuYWdlbWVudCc6IHRydWUgfSxcbiAgICBleHRyYUtub3duTWFya2V0cGxhY2VzOiB7XG4gICAgICAnY2FyZHMubWFuYWdlbWVudCc6IHtcbiAgICAgICAgc291cmNlOiB7IHNvdXJjZTogJ2RpcmVjdG9yeScsIHBhdGg6IG1hcmtldHBsYWNlUGF0aCB9XG4gICAgICB9XG4gICAgfVxuICB9KTtcbn1cblxuLyoqXG4gKiBCdWlsZHMgdGhlIENMSSBhcmd1bWVudCBsaXN0IGZvciB0aGUgYGNsYXVkZWAgcHJvY2Vzcy5cbiAqXG4gKiBAcGFyYW0gcHJvbXB0IC0gVGhlIHByb21wdCBzdHJpbmcgZm9yIG5ldyBzZXNzaW9ucy5cbiAqIEBwYXJhbSBzZXNzaW9uSWQgLSBTZXNzaW9uIGlkZW50aWZpZXIgKHVzZWQgZm9yIGAtLXNlc3Npb24taWRgIG9yIGAtLXJlc3VtZWApLlxuICogQHBhcmFtIHJlc3VtZSAtIFdoZW4gdHJ1ZSwgcGFzc2VzIGAtLXJlc3VtZWAgaW5zdGVhZCBvZiBzdGFydGluZyBhIG5ldyBzZXNzaW9uLlxuICogQHBhcmFtIG1vZGUgLSBFeGVjdXRpb24gbW9kZTsgYCdiYWNrZ3JvdW5kJ2AgYXBwZW5kcyBgLS1wcmludGAuXG4gKiBAcGFyYW0gY2FyZFJlcG9QYXRoIC0gQWJzb2x1dGUgcGF0aCBwYXNzZWQgdmlhIGAtLWFkZC1kaXJgLlxuICogQHBhcmFtIG1hcmtldHBsYWNlUGF0aCAtIEFic29sdXRlIHBhdGggdG8gdGhlIGJ1bmRsZWQgbWFya2V0cGxhY2UgZGlyZWN0b3J5LlxuICogQHJldHVybnMgQXJyYXkgb2YgQ0xJIGFyZ3VtZW50cy5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGJ1aWxkQXJncyhcbiAgcHJvbXB0OiBzdHJpbmcsXG4gIHNlc3Npb25JZDogc3RyaW5nLFxuICByZXN1bWU6IGJvb2xlYW4sXG4gIG1vZGU6IEFjdGlvbklucHV0WydleGVjdXRpb25Nb2RlJ10sXG4gIGNhcmRSZXBvUGF0aDogc3RyaW5nLFxuICBtYXJrZXRwbGFjZVBhdGg6IHN0cmluZ1xuKTogc3RyaW5nW10ge1xuICBjb25zdCBhcmdzOiBzdHJpbmdbXSA9IFtdO1xuXG4gIGlmIChyZXN1bWUpIHtcbiAgICBhcmdzLnB1c2goJy0tcmVzdW1lJywgc2Vzc2lvbklkKTtcbiAgfSBlbHNlIHtcbiAgICBhcmdzLnB1c2gocHJvbXB0KTtcbiAgICBhcmdzLnB1c2goJy0tc2Vzc2lvbi1pZCcsIHNlc3Npb25JZCk7XG4gIH1cbiAgYXJncy5wdXNoKCctLXNldHRpbmdzJywgYnVpbGRQbHVnaW5TZXR0aW5ncyhtYXJrZXRwbGFjZVBhdGgpKTtcbiAgYXJncy5wdXNoKCctLWFkZC1kaXInLCBjYXJkUmVwb1BhdGgpO1xuICBpZiAobW9kZSA9PT0gJ2JhY2tncm91bmQnKSB7XG4gICAgYXJncy5wdXNoKCctLXByaW50Jyk7XG4gIH1cblxuICByZXR1cm4gYXJncztcbn1cblxuLyoqXG4gKiBFeHRyYWN0cyB0aGUgY2FyZCBJRCBmcm9tIGEgYGNhcmRzLzxjYXJkSWQ+LzxuPmAgYnJhbmNoIG5hbWUuXG4gKlxuICogQHBhcmFtIGJyYW5jaE5hbWUgLSBCcmFuY2ggbmFtZSB0byBwYXJzZS5cbiAqIEByZXR1cm5zIFRoZSBjYXJkIElELCBvciBgbnVsbGAgaWYgdGhlIGJyYW5jaCBkb2Vzbid0IG1hdGNoIHRoZSBwYXR0ZXJuLlxuICovXG5mdW5jdGlvbiBjYXJkSWRGcm9tQnJhbmNoKGJyYW5jaE5hbWU6IHN0cmluZyk6IHN0cmluZyB8IG51bGwge1xuICBjb25zdCBtYXRjaCA9IGJyYW5jaE5hbWUubWF0Y2goL15jYXJkc1xcLyguKylcXC9cXGQrJC8pO1xuICByZXR1cm4gbWF0Y2g/LlsxXSA/PyBudWxsO1xufVxuXG4vKipcbiAqIFJlc29sdmVzIHRoZSBiYXNlIGJyYW5jaCBmb3IgdGhlIHdvcmtzcGFjZSwgZm9sbG93aW5nIHRoZSBgcGFyZW50QnJhbmNoYFxuICogY2hhaW4gd2hlbiBIRUFEIGlzIGEgYGNhcmRzLypgIHdvcmt0cmVlIGJyYW5jaC5cbiAqXG4gKiBDYXJkIGJyYW5jaGVzIGFyZSBlcGhlbWVyYWwgYW5kIG5vdCB2YWxpZCBtZXJnZSB0YXJnZXRzLiBXaGVuIHRoZSB3b3Jrc3BhY2VcbiAqIEhFQUQgaGFwcGVucyB0byBiZSBvbiBvbmUgKGUuZy4sIHRoZSBtYWluIGNoZWNrb3V0IHdhcyBsZWZ0IG9uIGEgY2FyZFxuICogYnJhbmNoKSwgdGhpcyBmdW5jdGlvbiBxdWVyaWVzIHRoZSBBUEkgZm9yIHRoYXQgYnJhbmNoJ3MgYHBhcmVudEJyYW5jaGBcbiAqIGFuZCByZWN1cnNlcyB1bnRpbCBpdCBmaW5kcyBhIG5vbi1gY2FyZHMvKmAgYnJhbmNoLlxuICpcbiAqIEBwYXJhbSB3b3Jrc3BhY2VQYXRoIC0gRGlyZWN0b3J5IHdoZXJlIGBnaXQgcmV2LXBhcnNlYCBydW5zLlxuICogQHBhcmFtIGNsaWVudCAtIENhcmRzIEFQSSBjbGllbnQgZm9yIHJlc29sdmluZyBwYXJlbnRCcmFuY2ggb2YgY2FyZCBicmFuY2hlcy5cbiAqIEByZXR1cm5zIFRoZSBmaXJzdCBub24tYGNhcmRzLypgIGJyYW5jaCBpbiB0aGUgcGFyZW50IGNoYWluLlxuICogQHRocm93cyBFcnJvciBpZiB0aGUgcGFyZW50IGNoYWluIGNhbm5vdCBiZSByZXNvbHZlZCAobWlzc2luZyBBUEkgcmVjb3JkcywgY3ljbGVzKS5cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHJlc29sdmVCYXNlQnJhbmNoKHdvcmtzcGFjZVBhdGg6IHN0cmluZywgY2xpZW50PzogQ2FyZHNDbGllbnQpOiBQcm9taXNlPHN0cmluZz4ge1xuICBjb25zdCB7IHN0ZG91dCB9ID0gYXdhaXQgZXhlY0ZpbGVBc3luYygnZ2l0JywgWydyZXYtcGFyc2UnLCAnLS1hYmJyZXYtcmVmJywgJ0hFQUQnXSwge1xuICAgIGN3ZDogd29ya3NwYWNlUGF0aFxuICB9KTtcbiAgbGV0IGJyYW5jaCA9IHN0ZG91dC50cmltKCk7XG5cbiAgY29uc3QgdmlzaXRlZCA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuICB3aGlsZSAoYnJhbmNoLnN0YXJ0c1dpdGgoJ2NhcmRzLycpKSB7XG4gICAgaWYgKHZpc2l0ZWQuaGFzKGJyYW5jaCkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgQ2lyY3VsYXIgcGFyZW50QnJhbmNoIGNoYWluIGRldGVjdGVkOiAke1suLi52aXNpdGVkLCBicmFuY2hdLmpvaW4oJyBcdTIxOTIgJyl9YCk7XG4gICAgfVxuICAgIHZpc2l0ZWQuYWRkKGJyYW5jaCk7XG5cbiAgICBjb25zdCBjYXJkSWQgPSBjYXJkSWRGcm9tQnJhbmNoKGJyYW5jaCk7XG4gICAgaWYgKCFjYXJkSWQgfHwgIWNsaWVudCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICBgV29ya3NwYWNlIEhFQUQgaXMgb24gY2FyZCBicmFuY2ggXCIke2JyYW5jaH1cIiBidXQgY2Fubm90IHJlc29sdmUgaXRzIHBhcmVudC4gYCArXG4gICAgICAgICAgJ1N3aXRjaCB0aGUgbWFpbiBjaGVja291dCB0byBhIG5vbi1jYXJkIGJyYW5jaCAoZS5nLiwgbWFpbikuJ1xuICAgICAgKTtcbiAgICB9XG5cbiAgICBjb25zdCB7IGJyYW5jaGVzIH0gPSBhd2FpdCBjbGllbnQuZ2V0QnJhbmNoZXMoY2FyZElkLCB7IHdvcmtzcGFjZVBhdGggfSk7XG4gICAgY29uc3QgcmVjb3JkID0gYnJhbmNoZXMuZmluZCgoYikgPT4gYi5uYW1lID09PSBicmFuY2gpO1xuICAgIGlmICghcmVjb3JkPy5wYXJlbnRCcmFuY2gpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgYENhcmQgYnJhbmNoIFwiJHticmFuY2h9XCIgaGFzIG5vIHBhcmVudEJyYW5jaCByZWNvcmQuIGAgK1xuICAgICAgICAgICdTd2l0Y2ggdGhlIG1haW4gY2hlY2tvdXQgdG8gYSBub24tY2FyZCBicmFuY2ggKGUuZy4sIG1haW4pLidcbiAgICAgICk7XG4gICAgfVxuXG4gICAgYnJhbmNoID0gcmVjb3JkLnBhcmVudEJyYW5jaDtcbiAgfVxuXG4gIHJldHVybiBicmFuY2g7XG59XG5cbi8qKlxuICogQ2hlY2tzIHdoZXRoZXIgYSB3b3JrdHJlZSBwYXRoIGV4aXN0cyBvbiBkaXNrLlxuICpcbiAqIEBwYXJhbSB3b3JrdHJlZVBhdGggLSBBYnNvbHV0ZSBwYXRoIHRvIHRlc3QuXG4gKiBAcmV0dXJucyBUcnVlIHdoZW4gdGhlIHBhdGggaXMgYWNjZXNzaWJsZS5cbiAqL1xuYXN5bmMgZnVuY3Rpb24gd29ya3RyZWVFeGlzdHNPbkRpc2sod29ya3RyZWVQYXRoOiBzdHJpbmcpOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgdHJ5IHtcbiAgICBhd2FpdCBmcy5hY2Nlc3Mod29ya3RyZWVQYXRoKTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSBjYXRjaCB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG59XG5cbi8qKlxuICogRmluZHMgb3IgY3JlYXRlcyBhIHdvcmt0cmVlIGZvciB0aGUgY2FyZC5cbiAqXG4gKiBUcmllcyB0byByZXVzZSBhbiBleGlzdGluZyBicmFuY2ggd2hvc2Ugd29ya3RyZWUgaXMgc3RpbGwgb24gZGlzay4gV2hlbiBub1xuICogdmFsaWQgYnJhbmNoIGV4aXN0cywgY3JlYXRlcyBhIG5ldyBvbmUgYW5kIHJlZ2lzdGVycyBpdCB3aXRoIHRoZSBBUEkuXG4gKlxuICogQHBhcmFtIGlucHV0IC0gQWN0aW9uIGlucHV0IGNvbnRhaW5pbmcgY2FyZElkIGFuZCB3b3Jrc3BhY2UgcGF0aHMuXG4gKiBAcGFyYW0gY2xpZW50IC0gQ2FyZHMgQVBJIGNsaWVudCBmb3IgYnJhbmNoIENSVUQuXG4gKiBAcGFyYW0gYmFzZUJyYW5jaCAtIEN1cnJlbnQgYnJhbmNoIGluIHRoZSB3b3Jrc3BhY2UgKHVzZWQgYXMgcGFyZW50KS5cbiAqIEBwYXJhbSBsb2dnZXIgLSBMb2dnZXIgZm9yIGRpYWdub3N0aWMgb3V0cHV0LlxuICogQHBhcmFtIHNlc3Npb25JZCAtIENsYXVkZSBDb2RlIHNlc3Npb24gSUQgZm9yd2FyZGVkIHRvIHRoZSBBUEkgc28gdGhlIGNhcmQgcmVwbyBwb3N0LWNvbW1pdCBob29rIGNhbiBhdHRyaWJ1dGUgdGhlIGNvbW1pdC5cbiAqIEByZXR1cm5zIFdvcmt0cmVlIHBhdGgsIGJyYW5jaCBuYW1lLCBhbmQgcGFyZW50IGJyYW5jaCBuYW1lLlxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcmVzb2x2ZU9yQ3JlYXRlV29ya3RyZWUoXG4gIGlucHV0OiBBY3Rpb25JbnB1dCxcbiAgY2xpZW50OiBDYXJkc0NsaWVudCxcbiAgYmFzZUJyYW5jaDogc3RyaW5nLFxuICBsb2dnZXI6IEFjdGlvbkNvbnRleHRbJ2xvZ2dlciddLFxuICBzZXNzaW9uSWQ/OiBzdHJpbmdcbik6IFByb21pc2U8eyB3b3JrdHJlZVBhdGg6IHN0cmluZzsgYnJhbmNoTmFtZTogc3RyaW5nOyBwYXJlbnRCcmFuY2g6IHN0cmluZyB9PiB7XG4gIGNvbnN0IHsgYnJhbmNoZXMgfSA9IGF3YWl0IGNsaWVudC5nZXRCcmFuY2hlcyhpbnB1dC5jYXJkSWQsIHsgd29ya3NwYWNlUGF0aDogaW5wdXQucmVwb1Jvb3QgfSk7XG5cbiAgLy8gU3RlcCAxOiBUcnkgdG8gcmV1c2UgYW4gZXhpc3RpbmcgYnJhbmNoIHdpdGggYSB2YWxpZCB3b3JrdHJlZSBvbiBkaXNrXG4gIGZvciAoY29uc3QgYnJhbmNoIG9mIGJyYW5jaGVzKSB7XG4gICAgaWYgKCFicmFuY2guZXhpc3RzIHx8ICFicmFuY2gud29ya3RyZWUpIGNvbnRpbnVlO1xuICAgIGlmICghKGF3YWl0IHdvcmt0cmVlRXhpc3RzT25EaXNrKGJyYW5jaC53b3JrdHJlZSkpKSBjb250aW51ZTtcblxuICAgIGxvZ2dlci5pbmZvKCdSZXVzaW5nIGV4aXN0aW5nIHdvcmt0cmVlJywgeyBicmFuY2g6IGJyYW5jaC5uYW1lLCB3b3JrdHJlZTogYnJhbmNoLndvcmt0cmVlIH0pO1xuICAgIHJldHVybiB7IHdvcmt0cmVlUGF0aDogYnJhbmNoLndvcmt0cmVlLCBicmFuY2hOYW1lOiBicmFuY2gubmFtZSwgcGFyZW50QnJhbmNoOiBicmFuY2gucGFyZW50QnJhbmNoIH07XG4gIH1cblxuICAvLyBTdGVwIDI6IFRyeSB0byBjcmVhdGUgYSB3b3JrdHJlZSBmb3IgYW4gZXhpc3RpbmcgYnJhbmNoIHdob3NlIHdvcmt0cmVlXG4gIC8vIGlzIG1pc3NpbmcgZnJvbSBkaXNrIChlLmcuIGNsZWFuZWQgdXAgYnkgYSBwcmV2aW91cyBzZXNzaW9uIGNyYXNoKS5cbiAgZm9yIChjb25zdCBicmFuY2ggb2YgYnJhbmNoZXMpIHtcbiAgICBpZiAoIWJyYW5jaC5leGlzdHMpIGNvbnRpbnVlO1xuICAgIGlmICghYnJhbmNoLm5hbWUuc3RhcnRzV2l0aChgY2FyZHMvJHtpbnB1dC5jYXJkSWR9L2ApKSBjb250aW51ZTtcblxuICAgIGxvZ2dlci5pbmZvKCdSZWF0dGFjaGluZyB3b3JrdHJlZSBmb3IgZXhpc3RpbmcgYnJhbmNoJywgeyBicmFuY2g6IGJyYW5jaC5uYW1lIH0pO1xuICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGNyZWF0ZVdvcmt0cmVlKGJyYW5jaC5uYW1lLCB7IGN3ZDogaW5wdXQucmVwb1Jvb3QgfSk7XG5cbiAgICAvLyBVcGRhdGUgdGhlIEFQSSByZWNvcmQgd2l0aCB0aGUgbmV3IHdvcmt0cmVlIHBhdGhcbiAgICBhd2FpdCBjbGllbnQuYWRkQnJhbmNoKFxuICAgICAgaW5wdXQuY2FyZElkLFxuICAgICAgeyBuYW1lOiBicmFuY2gubmFtZSwgd29ya3RyZWU6IHJlc3VsdC53b3JrdHJlZSwgcGFyZW50QnJhbmNoOiBicmFuY2gucGFyZW50QnJhbmNoIH0sXG4gICAgICB7IHNlc3Npb25JZCB9XG4gICAgKTtcblxuICAgIHJldHVybiB7IHdvcmt0cmVlUGF0aDogcmVzdWx0Lndvcmt0cmVlLCBicmFuY2hOYW1lOiBicmFuY2gubmFtZSwgcGFyZW50QnJhbmNoOiBicmFuY2gucGFyZW50QnJhbmNoIH07XG4gIH1cblxuICAvLyBTdGVwIDM6IE5vIHZhbGlkIGV4aXN0aW5nIGJyYW5jaCBcdTIwMTQgY3JlYXRlIG5ldyBvbmUuXG4gIC8vIFRoZSBBUEkgbWF5IGJlIG91dCBvZiBzeW5jIHdpdGggZ2l0IChlLmcuIGEgcHJldmlvdXMgd29ya3RyZWUgd2FzIGNyZWF0ZWRcbiAgLy8gYnV0IG5ldmVyIHJlZ2lzdGVyZWQsIG9yIGl0cyBBUEkgcmVjb3JkIHdhcyBkZWxldGVkKS4gVG8gYXZvaWQgY29sbGlkaW5nXG4gIC8vIHdpdGggd29ya3RyZWVzIGdpdCBhbHJlYWR5IGtub3dzIGFib3V0LCBwcm9iZSBnaXQncyBhY3R1YWwgc3RhdGUgYW5kXG4gIC8vIGluY3JlbWVudCBwYXN0IGFueSBvY2N1cGllZCBzbG90cy5cbiAgY29uc3QgcHJlZml4ID0gYGNhcmRzLyR7aW5wdXQuY2FyZElkfS9gO1xuICBjb25zdCBleGlzdGluZ051bWJlcnMgPSBicmFuY2hlc1xuICAgIC5maWx0ZXIoKGIpID0+IGIubmFtZS5zdGFydHNXaXRoKHByZWZpeCkpXG4gICAgLm1hcCgoYikgPT4gcGFyc2VJbnQoYi5uYW1lLnNsaWNlKHByZWZpeC5sZW5ndGgpLCAxMCkpXG4gICAgLmZpbHRlcigobikgPT4gIU51bWJlci5pc05hTihuKSk7XG4gIGxldCBuZXh0TnVtYmVyID0gZXhpc3RpbmdOdW1iZXJzLmxlbmd0aCA+IDAgPyBNYXRoLm1heCguLi5leGlzdGluZ051bWJlcnMpICsgMSA6IDE7XG5cbiAgY29uc3QgeyByZXBvUm9vdCB9ID0gYXdhaXQgZmluZEdpdFJvb3RzKGlucHV0LnJlcG9Sb290KTtcbiAgd2hpbGUgKGF3YWl0IGNoZWNrV29ya3RyZWVFeGlzdHMocmVwb1Jvb3QsIHBhdGguam9pbihyZXBvUm9vdCwgJy53b3JrdHJlZXMnLCBgJHtwcmVmaXh9JHtuZXh0TnVtYmVyfWApKSkge1xuICAgIGxvZ2dlci53YXJuKCdXb3JrdHJlZSBhbHJlYWR5IGV4aXN0cyBpbiBnaXQgYnV0IG5vdCBpbiBBUEksIHNraXBwaW5nJywge1xuICAgICAgYnJhbmNoOiBgJHtwcmVmaXh9JHtuZXh0TnVtYmVyfWBcbiAgICB9KTtcbiAgICBuZXh0TnVtYmVyKys7XG4gIH1cblxuICBjb25zdCBicmFuY2hOYW1lID0gYCR7cHJlZml4fSR7bmV4dE51bWJlcn1gO1xuICBjb25zdCByZXN1bHQgPSBhd2FpdCBjcmVhdGVXb3JrdHJlZShicmFuY2hOYW1lLCB7IGN3ZDogaW5wdXQucmVwb1Jvb3QgfSk7XG4gIGF3YWl0IGNsaWVudC5hZGRCcmFuY2goXG4gICAgaW5wdXQuY2FyZElkLFxuICAgIHsgbmFtZTogYnJhbmNoTmFtZSwgd29ya3RyZWU6IHJlc3VsdC53b3JrdHJlZSwgcGFyZW50QnJhbmNoOiBiYXNlQnJhbmNoIH0sXG4gICAgeyBzZXNzaW9uSWQgfVxuICApO1xuXG4gIGxvZ2dlci5pbmZvKCdDcmVhdGVkIG5ldyB3b3JrdHJlZScsIHsgYnJhbmNoOiBicmFuY2hOYW1lLCB3b3JrdHJlZTogcmVzdWx0Lndvcmt0cmVlIH0pO1xuICByZXR1cm4geyB3b3JrdHJlZVBhdGg6IHJlc3VsdC53b3JrdHJlZSwgYnJhbmNoTmFtZSwgcGFyZW50QnJhbmNoOiBiYXNlQnJhbmNoIH07XG59XG5cbi8qKlxuICogUnVucyBhIHNpbmdsZSBjbGVhbnVwIHN0ZXAsIGxvZ2dpbmcgYSB3YXJuaW5nIG9uIGZhaWx1cmUgcmF0aGVyIHRoYW5cbiAqIGFib3J0aW5nIHRoZSBzd2VlcC4gRWFjaCBzdGVwICh3b3JrdHJlZSByZW1vdmFsLCBicmFuY2ggZGVsZXRpb24sIEFQSVxuICogcmVjb3JkIHJlbW92YWwpIGlzIGluZGVwZW5kZW50IFx1MjAxNCBhIGZhaWx1cmUgaW4gb25lIG11c3Qgbm90IHByZXZlbnQgdGhlXG4gKiBvdGhlcnMgZnJvbSBydW5uaW5nLlxuICpcbiAqIEBwYXJhbSBzdGVwIC0gQXN5bmMgb3BlcmF0aW9uIHRvIGF0dGVtcHQuXG4gKiBAcGFyYW0gbGFiZWwgLSBIdW1hbi1yZWFkYWJsZSBsYWJlbCBsb2dnZWQgb24gZmFpbHVyZS5cbiAqIEBwYXJhbSBicmFuY2hOYW1lIC0gQnJhbmNoIG5hbWUgaW5jbHVkZWQgaW4gZGlhZ25vc3RpYyBvdXRwdXQuXG4gKiBAcGFyYW0gbG9nZ2VyIC0gTG9nZ2VyIGZvciBkaWFnbm9zdGljIG91dHB1dC5cbiAqL1xuYXN5bmMgZnVuY3Rpb24gdHJ5Q2xlYW51cFN0ZXAoXG4gIHN0ZXA6ICgpID0+IFByb21pc2U8dW5rbm93bj4sXG4gIGxhYmVsOiBzdHJpbmcsXG4gIGJyYW5jaE5hbWU6IHN0cmluZyxcbiAgbG9nZ2VyOiBBY3Rpb25Db250ZXh0Wydsb2dnZXInXVxuKTogUHJvbWlzZTx2b2lkPiB7XG4gIHRyeSB7XG4gICAgYXdhaXQgc3RlcCgpO1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGxvZ2dlci53YXJuKGxhYmVsLCB7IGJyYW5jaDogYnJhbmNoTmFtZSwgZXJyb3I6IGVycm9yTWVzc2FnZShlcnJvcikgfSk7XG4gIH1cbn1cblxuLyoqXG4gKiBSZW1vdmVzIGJyYW5jaGVzIHRoYXQgYXJlIGZ1bGx5IG1lcmdlZCBpbnRvIHRoZWlyIHBhcmVudCBicmFuY2guXG4gKlxuICogRm9yIGVhY2ggbWVyZ2VkIGJyYW5jaCB0aGUgd29ya3RyZWUgZGlyZWN0b3J5IGlzIHJlbW92ZWQsIHRoZSBsb2NhbCBicmFuY2hcbiAqIHJlZiBpcyBkZWxldGVkLCBhbmQgdGhlIGJyYW5jaCByZWNvcmQgaXMgcmVtb3ZlZCBmcm9tIHRoZSBBUEkuIFdvcmt0cmVlXG4gKiByZW1vdmFsIGZhaWx1cmVzIGFyZSBsb2dnZWQgYW5kIGRvIG5vdCBibG9jayBicmFuY2ggZGVsZXRpb24uIEhvd2V2ZXIsIHRoZVxuICogQVBJIHJlY29yZCBpcyBvbmx5IHJlbW92ZWQgYWZ0ZXIgY29uZmlybWluZyB0aGUgZ2l0IGJyYW5jaCB3YXMgZGVsZXRlZCBcdTIwMTRcbiAqIHJlbW92aW5nIHRoZSByZWNvcmQgd2hpbGUgdGhlIGJyYW5jaCBzdGlsbCBleGlzdHMgd291bGQgY2F1c2Ugc3Vic2VxdWVudFxuICogc2Vzc2lvbnMgdG8gbG9zZSB0cmFjayBvZiBpdCBhbmQgY3JlYXRlIGR1cGxpY2F0ZXMuXG4gKlxuICogRWFjaCBicmFuY2ggaXMgY2hlY2tlZCBhZ2FpbnN0IGl0cyBvd24gYHBhcmVudEJyYW5jaGAgKHRoZSBicmFuY2ggaXQgd2FzXG4gKiBjcmVhdGVkIGZyb20pLCBub3QgdGhlIHdvcmtzcGFjZSdzIGN1cnJlbnQgSEVBRC4gVGhpcyBlbnN1cmVzIGJyYW5jaGVzIGFyZVxuICogb25seSBjbGVhbmVkIHVwIHdoZW4gdHJ1bHkgbWVyZ2VkIGludG8gdGhlaXIgaW50ZW5kZWQgdGFyZ2V0LlxuICpcbiAqIEBwYXJhbSBpbnB1dCAtIEFjdGlvbiBpbnB1dCBjb250YWluaW5nIGNhcmRJZCBhbmQgd29ya3NwYWNlIHBhdGhzLlxuICogQHBhcmFtIGNsaWVudCAtIENhcmRzIEFQSSBjbGllbnQgZm9yIGJyYW5jaCByZW1vdmFsLlxuICogQHBhcmFtIGxvZ2dlciAtIExvZ2dlciBmb3IgZGlhZ25vc3RpYyBvdXRwdXQuXG4gKiBAcGFyYW0gc2Vzc2lvbklkIC0gQ2xhdWRlIENvZGUgc2Vzc2lvbiBJRCBmb3J3YXJkZWQgdG8gdGhlIEFQSSBzbyB0aGUgY2FyZCByZXBvIHBvc3QtY29tbWl0IGhvb2sgY2FuIGF0dHJpYnV0ZSB0aGUgY29tbWl0LlxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gY2xlYW51cE1lcmdlZEJyYW5jaGVzKFxuICBpbnB1dDogQWN0aW9uSW5wdXQsXG4gIGNsaWVudDogQ2FyZHNDbGllbnQsXG4gIGxvZ2dlcjogQWN0aW9uQ29udGV4dFsnbG9nZ2VyJ10sXG4gIHNlc3Npb25JZD86IHN0cmluZ1xuKTogUHJvbWlzZTx2b2lkPiB7XG4gIGxldCB0MCA9IHBlcmZvcm1hbmNlLm5vdygpO1xuICBjb25zdCB7IGJyYW5jaGVzIH0gPSBhd2FpdCBjbGllbnQuZ2V0QnJhbmNoZXMoaW5wdXQuY2FyZElkLCB7IHdvcmtzcGFjZVBhdGg6IGlucHV0LnJlcG9Sb290IH0pO1xuICBsb2dnZXIuZGVidWcoJ2dldEJyYW5jaGVzIGNvbXBsZXRlZCcsIHtcbiAgICBjYXJkSWQ6IGlucHV0LmNhcmRJZCxcbiAgICBicmFuY2hDb3VudDogYnJhbmNoZXMubGVuZ3RoLFxuICAgIGVsYXBzZWRNczogTWF0aC5yb3VuZChwZXJmb3JtYW5jZS5ub3coKSAtIHQwKVxuICB9KTtcblxuICBmb3IgKGNvbnN0IGJyYW5jaCBvZiBicmFuY2hlcykge1xuICAgIGlmICghYnJhbmNoLmV4aXN0cykgY29udGludWU7XG5cbiAgICAvLyBTZWxmLXJlZmVyZW50aWFsIHBhcmVudEJyYW5jaCBpcyBhIGNvcnJ1cHQgc3RhdGUgXHUyMDE0IGBtZXJnZS1iYXNlIC0taXMtYW5jZXN0b3IgWCBYYFxuICAgIC8vIHRyaXZpYWxseSBzdWNjZWVkcywgc28gY2xlYW51cCB3b3VsZCBpbmNvcnJlY3RseSByZW1vdmUgdW5tZXJnZWQgd29yay5cbiAgICBpZiAoYnJhbmNoLnBhcmVudEJyYW5jaCA9PT0gYnJhbmNoLm5hbWUpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgYEJyYW5jaCBcIiR7YnJhbmNoLm5hbWV9XCIgaGFzIHNlbGYtcmVmZXJlbnRpYWwgcGFyZW50QnJhbmNoIFx1MjAxNCByZWZ1c2luZyB0byBydW4gY2xlYW51cC4gYCArXG4gICAgICAgICAgJ1RoaXMgaXMgYSBkYXRhIGNvcnJ1cHRpb24gYnVnOiBhIGJyYW5jaCBjYW5ub3QgYmUgaXRzIG93biBwYXJlbnQuJ1xuICAgICAgKTtcbiAgICB9XG5cbiAgICB0MCA9IHBlcmZvcm1hbmNlLm5vdygpO1xuICAgIHRyeSB7XG4gICAgICAvLyBtZXJnZS1iYXNlIC0taXMtYW5jZXN0b3IgZXhpdHMgbm9uLXplcm8gd2hlbiBOT1QgYW4gYW5jZXN0b3IgKG5vdCBtZXJnZWQpLlxuICAgICAgLy8gQ2hlY2sgYWdhaW5zdCB0aGUgYnJhbmNoJ3Mgb3duIHBhcmVudEJyYW5jaCwgbm90IHRoZSB3b3Jrc3BhY2UgSEVBRC5cbiAgICAgIGF3YWl0IGV4ZWNGaWxlQXN5bmMoJ2dpdCcsIFsnbWVyZ2UtYmFzZScsICctLWlzLWFuY2VzdG9yJywgYnJhbmNoLm5hbWUsIGJyYW5jaC5wYXJlbnRCcmFuY2hdLCB7XG4gICAgICAgIGN3ZDogaW5wdXQucmVwb1Jvb3RcbiAgICAgIH0pO1xuICAgIH0gY2F0Y2gge1xuICAgICAgLy8gRXhwZWN0ZWQgZm9yIHVubWVyZ2VkIGJyYW5jaGVzIFx1MjAxNCBza2lwIGNsZWFudXBcbiAgICAgIGxvZ2dlci5kZWJ1ZygnQnJhbmNoIG5vdCBtZXJnZWQsIHNraXBwaW5nIGNsZWFudXAnLCB7XG4gICAgICAgIGJyYW5jaDogYnJhbmNoLm5hbWUsXG4gICAgICAgIGVsYXBzZWRNczogTWF0aC5yb3VuZChwZXJmb3JtYW5jZS5ub3coKSAtIHQwKVxuICAgICAgfSk7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG4gICAgbG9nZ2VyLmRlYnVnKCdtZXJnZS1iYXNlIGNoZWNrIGNvbXBsZXRlZCAobWVyZ2VkKScsIHtcbiAgICAgIGJyYW5jaDogYnJhbmNoLm5hbWUsXG4gICAgICBlbGFwc2VkTXM6IE1hdGgucm91bmQocGVyZm9ybWFuY2Uubm93KCkgLSB0MClcbiAgICB9KTtcblxuICAgIC8vIEJyYW5jaCBpcyBtZXJnZWQgXHUyMDE0IGNsZWFuIHVwIHdvcmt0cmVlLCBicmFuY2ggcmVmLCBhbmQgQVBJIHJlY29yZFxuICAgIGlmIChicmFuY2gud29ya3RyZWUpIHtcbiAgICAgIHQwID0gcGVyZm9ybWFuY2Uubm93KCk7XG4gICAgICBhd2FpdCB0cnlDbGVhbnVwU3RlcChcbiAgICAgICAgKCkgPT4gZXhlY0ZpbGVBc3luYygnZ2l0JywgWyd3b3JrdHJlZScsICdyZW1vdmUnLCBicmFuY2gud29ya3RyZWUhXSwgeyBjd2Q6IGlucHV0LnJlcG9Sb290IH0pLFxuICAgICAgICAnRmFpbGVkIHRvIHJlbW92ZSB3b3JrdHJlZScsXG4gICAgICAgIGJyYW5jaC5uYW1lLFxuICAgICAgICBsb2dnZXJcbiAgICAgICk7XG4gICAgICBsb2dnZXIuZGVidWcoJ1dvcmt0cmVlIHJlbW92YWwgY29tcGxldGVkJywge1xuICAgICAgICBicmFuY2g6IGJyYW5jaC5uYW1lLFxuICAgICAgICBlbGFwc2VkTXM6IE1hdGgucm91bmQocGVyZm9ybWFuY2Uubm93KCkgLSB0MClcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIHQwID0gcGVyZm9ybWFuY2Uubm93KCk7XG4gICAgbGV0IGJyYW5jaERlbGV0ZWQgPSBmYWxzZTtcbiAgICB0cnkge1xuICAgICAgYXdhaXQgZXhlY0ZpbGVBc3luYygnZ2l0JywgWydicmFuY2gnLCAnLWQnLCBicmFuY2gubmFtZV0sIHsgY3dkOiBpbnB1dC5yZXBvUm9vdCB9KTtcbiAgICAgIGJyYW5jaERlbGV0ZWQgPSB0cnVlO1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICBsb2dnZXIud2FybignRmFpbGVkIHRvIGRlbGV0ZSBicmFuY2gnLCB7IGJyYW5jaDogYnJhbmNoLm5hbWUsIGVycm9yOiBlcnJvck1lc3NhZ2UoZXJyb3IpIH0pO1xuICAgIH1cbiAgICBsb2dnZXIuZGVidWcoJ0JyYW5jaCBkZWxldGlvbiBjb21wbGV0ZWQnLCB7XG4gICAgICBicmFuY2g6IGJyYW5jaC5uYW1lLFxuICAgICAgYnJhbmNoRGVsZXRlZCxcbiAgICAgIGVsYXBzZWRNczogTWF0aC5yb3VuZChwZXJmb3JtYW5jZS5ub3coKSAtIHQwKVxuICAgIH0pO1xuXG4gICAgaWYgKGJyYW5jaERlbGV0ZWQpIHtcbiAgICAgIHQwID0gcGVyZm9ybWFuY2Uubm93KCk7XG4gICAgICBhd2FpdCB0cnlDbGVhbnVwU3RlcChcbiAgICAgICAgKCkgPT4gY2xpZW50LnJlbW92ZUJyYW5jaChpbnB1dC5jYXJkSWQsIGJyYW5jaC5uYW1lLCB7IHNlc3Npb25JZCB9KSxcbiAgICAgICAgJ0ZhaWxlZCB0byByZW1vdmUgYnJhbmNoIGZyb20gQVBJJyxcbiAgICAgICAgYnJhbmNoLm5hbWUsXG4gICAgICAgIGxvZ2dlclxuICAgICAgKTtcbiAgICAgIGxvZ2dlci5kZWJ1ZygnQVBJIGJyYW5jaCByZW1vdmFsIGNvbXBsZXRlZCcsIHtcbiAgICAgICAgYnJhbmNoOiBicmFuY2gubmFtZSxcbiAgICAgICAgZWxhcHNlZE1zOiBNYXRoLnJvdW5kKHBlcmZvcm1hbmNlLm5vdygpIC0gdDApXG4gICAgICB9KTtcblxuICAgICAgbG9nZ2VyLmluZm8oJ0NsZWFuZWQgdXAgbWVyZ2VkIGJyYW5jaCcsIHsgYnJhbmNoOiBicmFuY2gubmFtZSB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgbG9nZ2VyLmluZm8oJ1NraXBwZWQgQVBJIHJlY29yZCByZW1vdmFsIFx1MjAxNCBnaXQgYnJhbmNoIHN0aWxsIGV4aXN0cycsIHsgYnJhbmNoOiBicmFuY2gubmFtZSB9KTtcbiAgICB9XG4gIH1cbn1cblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gVW5pZmllZCBzZXNzaW9uIHNwYXduZXJcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuLyoqXG4gKiBPcHRpb25zIGZvciB7QGxpbmsgc3Bhd25DbGF1ZGVTZXNzaW9ufS5cbiAqXG4gKiBBY3Rpb25zIHByb3ZpZGUgdGhlIHZhcmlhYmxlIHBhcnRzIChwcm9tcHQsIHNlc3Npb24gaWRlbnRpdHksIHN3aXRjaC10by1cbiAqIGludGVyYWN0aXZlIHN1cHBvcnQpOyB0aGUgaGVscGVyIGhhbmRsZXMgZXZlcnl0aGluZyBlbHNlOiB3b3JrdHJlZVxuICogcmVzb2x1dGlvbiwgbWFya2V0cGxhY2UgcmVnaXN0cmF0aW9uLCBlbnYgY29uc3RydWN0aW9uLCBzcGF3biwgbGlmZWN5Y2xlXG4gKiBjYWxsYmFja3MsIGFuZCBwb3N0LWV4aXQgYnJhbmNoIGNsZWFudXAuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgQ2xhdWRlU2Vzc2lvbk9wdGlvbnMge1xuICAvKiogUHJvbXB0IHN0cmluZyBwYXNzZWQgdG8gdGhlIENsYXVkZSBDTEkuICovXG4gIHByb21wdDogc3RyaW5nO1xuICAvKiogU2Vzc2lvbiBpZGVudGlmaWVyICh1c2VkIGZvciBgLS1zZXNzaW9uLWlkYCBvciBgLS1yZXN1bWVgKS4gKi9cbiAgc2Vzc2lvbklkOiBzdHJpbmc7XG4gIC8qKiBXaGVuIHRydWUsIHBhc3NlcyBgLS1yZXN1bWVgIGluc3RlYWQgb2Ygc3RhcnRpbmcgYSBuZXcgc2Vzc2lvbi4gKi9cbiAgcmVzdW1lOiBib29sZWFuO1xuICAvKipcbiAgICogV2hlbiB0cnVlLCByZWdpc3RlcnMge0BsaW5rIEFjdGlvbkNvbnRleHQub25Td2l0Y2hUb0ludGVyYWN0aXZlfSBzb1xuICAgKiBiYWNrZ3JvdW5kLW1vZGUgc2Vzc2lvbnMgY2FuIGJlIHByb21vdGVkIHRvIGludGVyYWN0aXZlLlxuICAgKi9cbiAgc3VwcG9ydHNTd2l0Y2hUb0ludGVyYWN0aXZlOiBib29sZWFuO1xufVxuXG4vKipcbiAqIFNwYXducyBhIGBjbGF1ZGVgIENMSSBzZXNzaW9uIHdpdGggZnVsbCB3b3JrdHJlZSwgbWFya2V0cGxhY2UsIGFuZFxuICogbGlmZWN5Y2xlIG1hbmFnZW1lbnQuXG4gKlxuICogQ2VudHJhbGlzZXMgdGhlIHNwYXduIGxvZ2ljIHNoYXJlZCBieSB0aGUgYGxhdW5jaGAgYW5kIGBpbnRlcnZpZXdgXG4gKiBhY3Rpb25zIHNvIGVudmlyb25tZW50IHZhcmlhYmxlIGNvbnN0cnVjdGlvbiwgd29ya3RyZWUgcmVzb2x1dGlvbixcbiAqIG1hcmtldHBsYWNlIHJlZ2lzdHJhdGlvbiwgYW5kIHBvc3QtZXhpdCBjbGVhbnVwIGNhbm5vdCBkcmlmdCBiZXR3ZWVuXG4gKiBjYWxsZXJzLlxuICpcbiAqIFN0ZXBzOlxuICogMS4gQ3JlYXRlIHtAbGluayBDYXJkc0NsaWVudH1cbiAqIDIuIFJlc29sdmUgYmFzZSBicmFuY2ggYW5kIHdvcmt0cmVlXG4gKiAzLiBSZWdpc3RlciBtYXJrZXRwbGFjZVxuICogNC4gQnVpbGQgQ0xJIGFyZ3MgYW5kIHNwYXduIGBjbGF1ZGVgXG4gKiA1LiBXaXJlIG9uQ2FuY2VsIChhbmQgb3B0aW9uYWxseSBvblN3aXRjaFRvSW50ZXJhY3RpdmUpXG4gKiA2LiBDYXB0dXJlIHN0ZGVyciBpbiBiYWNrZ3JvdW5kIG1vZGVcbiAqIDcuIEF3YWl0IHByb2Nlc3MgZXhpdFxuICogOC4gQ2xlYW4gdXAgZnVsbHktbWVyZ2VkIGJyYW5jaGVzIChiYWNrZ3JvdW5kIG1vZGUgb25seTsgaW4gaW50ZXJhY3RpdmVcbiAqICAgIG1vZGUgdGhlIHdhdGNoZXIgYW5kIGV4dGVuc2lvbiBoYW5kbGUgY2xlYW51cCBhZnRlciB0aGUgYWN0aW9uIGV4aXRzKVxuICpcbiAqIEBwYXJhbSBpbnB1dCAtIFBhcnNlZCBhY3Rpb24gaW5wdXQgZnJvbSB0aGUgZW52aXJvbm1lbnQuXG4gKiBAcGFyYW0gY29udGV4dCAtIEFjdGlvbiBjb250ZXh0IHByb3ZpZGluZyBsb2dnZXIgYW5kIGxpZmVjeWNsZSBob29rcy5cbiAqIEBwYXJhbSBvcHRpb25zIC0gU2Vzc2lvbi1zcGVjaWZpYyBwYXJhbWV0ZXJzIChwcm9tcHQsIHNlc3Npb24gSUQsIGV0Yy4pLlxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gc3Bhd25DbGF1ZGVTZXNzaW9uKFxuICBpbnB1dDogQWN0aW9uSW5wdXQsXG4gIGNvbnRleHQ6IEFjdGlvbkNvbnRleHQsXG4gIG9wdGlvbnM6IENsYXVkZVNlc3Npb25PcHRpb25zXG4pOiBQcm9taXNlPHZvaWQ+IHtcbiAgY29uc3QgeyBwcm9tcHQsIHNlc3Npb25JZCwgcmVzdW1lLCBzdXBwb3J0c1N3aXRjaFRvSW50ZXJhY3RpdmUgfSA9IG9wdGlvbnM7XG5cbiAgY29udGV4dC5sb2dnZXIuaW5mbyhgJHtpbnB1dC5hY3Rpb25OYW1lfSBhY3Rpb24gc3RhcnRlZGAsIHtcbiAgICBjYXJkSWQ6IGlucHV0LmNhcmRJZCxcbiAgICBlbnZpcm9ubWVudDogaW5wdXQuZW52aXJvbm1lbnQsXG4gICAgZXhlY3V0aW9uTW9kZTogaW5wdXQuZXhlY3V0aW9uTW9kZSxcbiAgICBzZXNzaW9uSWRcbiAgfSk7XG5cbiAgY29uc3QgY2xpZW50ID0gbmV3IENhcmRzQ2xpZW50KHtcbiAgICBiYXNlVXJsOiBpbnB1dC5hcGlCYXNlVXJsLFxuICAgIGFjY2Vzc1Rva2VuOiBpbnB1dC5hcGlBY2Nlc3NUb2tlblxuICB9KTtcblxuICBjb25zdCBiYXNlQnJhbmNoID0gYXdhaXQgcmVzb2x2ZUJhc2VCcmFuY2goaW5wdXQucmVwb1Jvb3QsIGNsaWVudCk7XG5cbiAgY29uc3Qgd29ya3RyZWVSZXN1bHQgPSBhd2FpdCByZXNvbHZlT3JDcmVhdGVXb3JrdHJlZShpbnB1dCwgY2xpZW50LCBiYXNlQnJhbmNoLCBjb250ZXh0LmxvZ2dlciwgc2Vzc2lvbklkKTtcblxuICBjb25zdCB7IHdvcmt0cmVlUGF0aDogY3dkLCBicmFuY2hOYW1lLCBwYXJlbnRCcmFuY2ggfSA9IHdvcmt0cmVlUmVzdWx0O1xuICBjb250ZXh0LmxvZ2dlci5pbmZvKCdVc2luZyB3b3JrdHJlZScsIHsgY3dkLCBicmFuY2g6IGJyYW5jaE5hbWUsIGJhc2VCcmFuY2gsIHBhcmVudEJyYW5jaCB9KTtcblxuICBjb25zdCBtYXJrZXRwbGFjZVBhdGggPSByZXNvbHZlTWFya2V0cGxhY2VQYXRoKCk7XG4gIGF3YWl0IHVwZGF0ZU1hcmtldHBsYWNlUmVnaXN0cmF0aW9uKG1hcmtldHBsYWNlUGF0aCwgY29udGV4dC5sb2dnZXIpO1xuXG4gIGNvbnN0IGFyZ3MgPSBidWlsZEFyZ3MocHJvbXB0LCBzZXNzaW9uSWQsIHJlc3VtZSwgaW5wdXQuZXhlY3V0aW9uTW9kZSwgaW5wdXQuY2FyZFJlcG9QYXRoLCBtYXJrZXRwbGFjZVBhdGgpO1xuICBjb25zdCBpc0ludGVyYWN0aXZlID0gaW5wdXQuZXhlY3V0aW9uTW9kZSA9PT0gJ2ludGVyYWN0aXZlJztcblxuICBjb25zdCBjaGlsZDogQ2hpbGRQcm9jZXNzID0gc3Bhd24oJ2NsYXVkZScsIGFyZ3MsIHtcbiAgICBjd2QsXG4gICAgc3RkaW86IGlzSW50ZXJhY3RpdmUgPyAnaW5oZXJpdCcgOiBbJ2lnbm9yZScsICdpZ25vcmUnLCAncGlwZSddLFxuICAgIGVudjoge1xuICAgICAgLi4ucHJvY2Vzcy5lbnYsXG4gICAgICBXT1JLU1BBQ0VfUEFUSDogY3dkLFxuICAgICAgQ0xBVURFX0NPREVfVEFTS19MSVNUX0lEOiBgY2FyZHMtZXh0ZW5zaW9uLSR7aW5wdXQuY2FyZElkfWAsXG4gICAgICBDTEFVREVfQ09ERV9FWFBFUklNRU5UQUxfQUdFTlRfVEVBTVM6ICcxJyxcbiAgICAgIEJBU0VfQlJBTkNIOiBiYXNlQnJhbmNoLFxuICAgICAgUEFSRU5UX0JSQU5DSDogcGFyZW50QnJhbmNoLFxuICAgICAgV09SS1NQQUNFX0JSQU5DSDogYnJhbmNoTmFtZVxuICAgIH1cbiAgfSk7XG5cbiAgY29udGV4dC5vbkNhbmNlbCgoKSA9PiB7XG4gICAgY29udGV4dC5sb2dnZXIuaW5mbyhgJHtpbnB1dC5hY3Rpb25OYW1lfSBhY3Rpb24gY2FuY2VsbGVkLCB0ZXJtaW5hdGluZyBjbGF1ZGVgLCB7IHNlc3Npb25JZCB9KTtcbiAgICBjaGlsZC5raWxsKCdTSUdURVJNJyk7XG4gIH0pO1xuXG4gIGlmIChzdXBwb3J0c1N3aXRjaFRvSW50ZXJhY3RpdmUpIHtcbiAgICBjb250ZXh0Lm9uU3dpdGNoVG9JbnRlcmFjdGl2ZSgoKSA9PiB7XG4gICAgICBjb250ZXh0LmxvZ2dlci5pbmZvKCdTd2l0Y2hpbmcgdG8gaW50ZXJhY3RpdmUgbW9kZScsIHsgc2Vzc2lvbklkIH0pO1xuICAgICAgY2hpbGQua2lsbCgnU0lHVEVSTScpO1xuICAgICAgcmV0dXJuIHsgc2Vzc2lvbklkIH07XG4gICAgfSk7XG4gIH1cblxuICAvLyBCYWNrZ3JvdW5kIG1vZGU6IGNhcHR1cmUgc3RkZXJyIGZvciBkaWFnbm9zdGljIGxvZ2dpbmdcbiAgaWYgKCFpc0ludGVyYWN0aXZlKSB7XG4gICAgY2hpbGQuc3RkZXJyPy5vbignZGF0YScsIChjaHVuazogQnVmZmVyKSA9PiB7XG4gICAgICBjb25zdCB0ZXh0ID0gY2h1bmsudG9TdHJpbmcoKS50cmltKCk7XG4gICAgICBpZiAodGV4dCkge1xuICAgICAgICBjb250ZXh0LmxvZ2dlci53YXJuKHRleHQpO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgY29uc3QgZXhpdENvZGUgPSBhd2FpdCBuZXcgUHJvbWlzZTxudW1iZXIgfCBudWxsPigocmVzb2x2ZSkgPT4ge1xuICAgIGNoaWxkLm9uKCdjbG9zZScsIHJlc29sdmUpO1xuICB9KTtcblxuICBjb250ZXh0LmxvZ2dlci5pbmZvKGAke2lucHV0LmFjdGlvbk5hbWV9IGFjdGlvbiBjb21wbGV0ZWRgLCB7IHNlc3Npb25JZCwgZXhpdENvZGUgfSk7XG5cbiAgLy8gUG9zdC1leGl0IGNsZWFudXA6IHJlbW92ZSBmdWxseS1tZXJnZWQgYnJhbmNoZXMuXG4gIC8vIEluIGJhY2tncm91bmQgbW9kZSB0aGVyZSBpcyBubyB3YXRjaGVyLCBzbyB3ZSBydW4gY2xlYW51cCBpbmxpbmUuXG4gIC8vIEluIGludGVyYWN0aXZlIG1vZGUgd2Ugc3Bhd24gYSBkZXRhY2hlZCBwcm9jZXNzIHNvIHRoZSB0ZXJtaW5hbCBjbG9zZXNcbiAgLy8gaW1tZWRpYXRlbHkgXHUyMDE0IHRoZSB3YXRjaGVyIGNhbGxzIHRoZSBzYW1lIGNsZWFudXBNZXJnZWRCcmFuY2hlcyBmdW5jdGlvbi5cbiAgaWYgKGlzSW50ZXJhY3RpdmUpIHtcbiAgICB0cnkge1xuICAgICAgc3Bhd25CcmFuY2hDbGVhbnVwV2F0Y2hlcih7XG4gICAgICAgIGNhcmRJZDogaW5wdXQuY2FyZElkLFxuICAgICAgICByZXBvUm9vdDogaW5wdXQucmVwb1Jvb3QsXG4gICAgICAgIGFwaUJhc2VVcmw6IGlucHV0LmFwaUJhc2VVcmwsXG4gICAgICAgIGFwaUFjY2Vzc1Rva2VuOiBpbnB1dC5hcGlBY2Nlc3NUb2tlbixcbiAgICAgICAgc2Vzc2lvbklkXG4gICAgICB9KTtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgY29uc3QgbWVzc2FnZSA9IGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogU3RyaW5nKGVycm9yKTtcbiAgICAgIGNvbnRleHQubG9nZ2VyLndhcm4oJ0ZhaWxlZCB0byBzcGF3biBicmFuY2gtY2xlYW51cCB3YXRjaGVyIChub24tZmF0YWwpJywgeyBlcnJvcjogbWVzc2FnZSwgc2Vzc2lvbklkIH0pO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICBjb25zdCBjbGVhbnVwU3RhcnQgPSBwZXJmb3JtYW5jZS5ub3coKTtcbiAgICB0cnkge1xuICAgICAgYXdhaXQgY2xlYW51cE1lcmdlZEJyYW5jaGVzKGlucHV0LCBjbGllbnQsIGNvbnRleHQubG9nZ2VyLCBzZXNzaW9uSWQpO1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICBjb25zdCBtZXNzYWdlID0gZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiBTdHJpbmcoZXJyb3IpO1xuICAgICAgaWYgKG1lc3NhZ2UuaW5jbHVkZXMoJ3NlbGYtcmVmZXJlbnRpYWwgcGFyZW50QnJhbmNoJykgfHwgbWVzc2FnZS5pbmNsdWRlcygnZGF0YSBjb3JydXB0aW9uJykpIHtcbiAgICAgICAgdGhyb3cgZXJyb3I7XG4gICAgICB9XG4gICAgICBjb250ZXh0LmxvZ2dlci53YXJuKCdQb3N0LWV4aXQgY2xlYW51cCBmYWlsZWQgKG5vbi1mYXRhbCknLCB7IGVycm9yOiBtZXNzYWdlLCBzZXNzaW9uSWQgfSk7XG4gICAgfVxuICAgIGNvbnRleHQubG9nZ2VyLmRlYnVnKCdQb3N0LWV4aXQgY2xlYW51cCBmaW5pc2hlZCcsIHtcbiAgICAgIHNlc3Npb25JZCxcbiAgICAgIGVsYXBzZWRNczogTWF0aC5yb3VuZChwZXJmb3JtYW5jZS5ub3coKSAtIGNsZWFudXBTdGFydClcbiAgICB9KTtcbiAgfVxufVxuIiwgIi8qKlxuICogRXJyb3IgY2xhc3NlcyBmb3IgdGhlIENhcmRzIFYyIFNESy5cbiAqXG4gKiBUaGVzZSBlcnJvcnMgbm9ybWFsaXplIHNlcnZlciByZXNwb25zZXMgYW5kIG5ldHdvcmsgZmFpbHVyZXMgc28gY2FsbGVycyBjYW5cbiAqIGRpc3Rpbmd1aXNoIEFQSSB2YWxpZGF0aW9uIHByb2JsZW1zIGZyb20gdHJhbnNwb3J0IGlzc3Vlcy5cbiAqXG4gKlxuICogQHN1bW1hcnkgRXJyb3IgY2xhc3NlcyBmb3IgdGhlIENhcmRzIFYyIFNES1xuICogQG1vZHVsZSB0eXBlcy9lcnJvcnNcbiAqL1xuXG5pbXBvcnQgdHlwZSB7IEZpZWxkRXJyb3IgfSBmcm9tICcuLi8uLi9wcm90b2NvbC9pbmRleC5qcyc7XG5cbi8qKlxuICogRXJyb3IgdGhyb3duIHdoZW4gYW4gQVBJIHJlcXVlc3QgZmFpbHMgd2l0aCBhbiBlcnJvciByZXNwb25zZS5cbiAqXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogdHJ5IHtcbiAqICAgYXdhaXQgY2xpZW50LmNyZWF0ZUNhcmQoZGF0YSk7XG4gKiB9IGNhdGNoIChlcnJvcikge1xuICogICBpZiAoZXJyb3IgaW5zdGFuY2VvZiBBcGlFcnJvcikge1xuICogICAgIGNvbnNvbGUuZXJyb3IoYEFQSSBlcnJvciBbJHtlcnJvci5jb2RlfV06ICR7ZXJyb3IubWVzc2FnZX1gKTtcbiAqICAgICBpZiAoZXJyb3IuZmllbGRzKSB7XG4gKiAgICAgICBlcnJvci5maWVsZHMuZm9yRWFjaChmID0+IGNvbnNvbGUuZXJyb3IoYCAgJHtmLmZpZWxkfTogJHtmLm1lc3NhZ2V9YCkpO1xuICogICAgIH1cbiAqICAgfVxuICogfVxuICogYGBgXG4gKi9cbmV4cG9ydCBjbGFzcyBBcGlFcnJvciBleHRlbmRzIEVycm9yIHtcbiAgLyoqXG4gICAqIENyZWF0ZXMgYSBuZXcgQXBpRXJyb3IgaW5zdGFuY2UuXG4gICAqXG4gICAqIEBwYXJhbSBtZXNzYWdlIC0gSHVtYW4tcmVhZGFibGUgZXJyb3IgbWVzc2FnZVxuICAgKiBAcGFyYW0gY29kZSAtIE1hY2hpbmUtcmVhZGFibGUgZXJyb3IgY29kZVxuICAgKiBAcGFyYW0gZmllbGRzIC0gT3B0aW9uYWwgYXJyYXkgb2YgZmllbGQtc3BlY2lmaWMgdmFsaWRhdGlvbiBlcnJvcnNcbiAgICovXG4gIGNvbnN0cnVjdG9yKFxuICAgIG1lc3NhZ2U6IHN0cmluZyxcbiAgICBwdWJsaWMgcmVhZG9ubHkgY29kZTogc3RyaW5nLFxuICAgIHB1YmxpYyByZWFkb25seSBmaWVsZHM/OiBGaWVsZEVycm9yW11cbiAgKSB7XG4gICAgc3VwZXIobWVzc2FnZSk7XG4gICAgdGhpcy5uYW1lID0gJ0FwaUVycm9yJztcbiAgfVxufVxuXG4vKipcbiAqIEVycm9yIHRocm93biB3aGVuIGEgbmV0d29yayByZXF1ZXN0IGZhaWxzIGR1ZSB0byBjb25uZWN0aXZpdHkgaXNzdWVzLlxuICpcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiB0cnkge1xuICogICBhd2FpdCBjbGllbnQubGlzdENhcmRzKCk7XG4gKiB9IGNhdGNoIChlcnJvcikge1xuICogICBpZiAoZXJyb3IgaW5zdGFuY2VvZiBOZXR3b3JrRXJyb3IpIHtcbiAqICAgICBjb25zb2xlLmVycm9yKGBOZXR3b3JrIGVycm9yOiAke2Vycm9yLm1lc3NhZ2V9YCk7XG4gKiAgICAgaWYgKGVycm9yLmNhdXNlKSB7XG4gKiAgICAgICBjb25zb2xlLmVycm9yKGBDYXVzZWQgYnk6ICR7ZXJyb3IuY2F1c2UubWVzc2FnZX1gKTtcbiAqICAgICB9XG4gKiAgIH1cbiAqIH1cbiAqIGBgYFxuICovXG5leHBvcnQgY2xhc3MgTmV0d29ya0Vycm9yIGV4dGVuZHMgRXJyb3Ige1xuICAvKipcbiAgICogQ3JlYXRlcyBhIG5ldyBOZXR3b3JrRXJyb3IgaW5zdGFuY2UuXG4gICAqXG4gICAqIEBwYXJhbSBtZXNzYWdlIC0gSHVtYW4tcmVhZGFibGUgZXJyb3IgbWVzc2FnZVxuICAgKiBAcGFyYW0gY2F1c2UgLSBPcHRpb25hbCB1bmRlcmx5aW5nIGVycm9yIHRoYXQgY2F1c2VkIHRoaXMgbmV0d29yayBmYWlsdXJlXG4gICAqL1xuICBjb25zdHJ1Y3RvcihcbiAgICBtZXNzYWdlOiBzdHJpbmcsXG4gICAgcHVibGljIHJlYWRvbmx5IGNhdXNlPzogRXJyb3JcbiAgKSB7XG4gICAgc3VwZXIobWVzc2FnZSk7XG4gICAgdGhpcy5uYW1lID0gJ05ldHdvcmtFcnJvcic7XG4gIH1cbn1cbiIsICIvKipcbiAqIEhUVFAgY2xpZW50IGZvciB0aGUgQ2FyZHMgVjIgUkVTVCBBUEkuXG4gKlxuICpcbiAqIEBzdW1tYXJ5IEhUVFAgY2xpZW50IGZvciB0aGUgQ2FyZHMgVjIgUkVTVCBBUElcbiAqIEBtb2R1bGUgc2RrL0NhcmRzQ2xpZW50XG4gKi9cblxuaW1wb3J0IHR5cGUge1xuICBBY3Rpb25SZXN1bHQsXG4gIENhcmQsXG4gIENvbXBhcmVSZXF1ZXN0LFxuICBDb21wYXJlU3RhdGUsXG4gIEh0dHBDbGllbnQsXG4gIFN0cmVhbU1ldGEsXG4gIFRpbWVsaW5lSXRlbVxufSBmcm9tICcuLi9wcm90b2NvbC9pbmRleC5qcyc7XG5pbXBvcnQgdHlwZSB7XG4gIEFkZEJyYW5jaFJlcXVlc3QsXG4gIEF0dGFjaG1lbnRSZXNwb25zZSxcbiAgQnJhbmNoZXNSZXNwb25zZSxcbiAgQ2FyZENyZWF0ZURhdGEsXG4gIENhcmRzQ2xpZW50T3B0aW9ucyxcbiAgQ2FyZFVwZGF0ZURhdGEsXG4gIENvbW1lbnQsXG4gIENvbW1lbnRDcmVhdGVEYXRhLFxuICBDb21tZW50VXBkYXRlRGF0YSxcbiAgQ29tbWl0SW5mbyxcbiAgR2F0ZUFwcHJvdmFsUmVzcG9uc2UsXG4gIEluZ2VzdFdzRmFjdG9yeSxcbiAgTGlzdENhcmRzT3B0aW9ucyxcbiAgU3RyZWFtUmVzdWx0LFxuICBTdHJlYW1Xcml0ZXIsXG4gIFN0cmVhbVdyaXRlck9wdGlvbnMsXG4gIFRpbWVsaW5lT3B0aW9ucyxcbiAgVHlwZVNjaGVtYXNSZXNwb25zZSxcbiAgV3NTdHJlYW1TZXNzaW9uXG59IGZyb20gJy4vdHlwZXMvY2xpZW50LmpzJztcbmltcG9ydCB7IEFwaUVycm9yLCBOZXR3b3JrRXJyb3IgfSBmcm9tICcuL3R5cGVzL2Vycm9ycy5qcyc7XG5cbi8qKiBJbml0aWFsIHJlcXVlc3QgdGltZW91dCBpbiBtaWxsaXNlY29uZHMgKDMgc2Vjb25kcyB0byBhY2NvbW1vZGF0ZSBnaXQtYmFja2VkIGVuZHBvaW50cykuICovXG5jb25zdCBJTklUSUFMX1RJTUVPVVRfTVMgPSAzXzAwMDtcblxuLyoqIE1heGltdW0gcmVxdWVzdCB0aW1lb3V0IGluIG1pbGxpc2Vjb25kcyBhZnRlciBleHBvbmVudGlhbCBiYWNrb2ZmLiAqL1xuY29uc3QgTUFYX1RJTUVPVVRfTVMgPSAxMF8wMDA7XG5cbi8qKiBNYXhpbXVtIG51bWJlciBvZiBhdXRvbWF0aWMgcmV0cmllcyBmb3IgdGltZW91dCBlcnJvcnMgYmVmb3JlIGdpdmluZyB1cC4gKi9cbmNvbnN0IE1BWF9USU1FT1VUX1JFVFJJRVMgPSAyO1xuXG4vKipcbiAqIFR5cGUtc2FmZSBIVFRQIGNsaWVudCBmb3IgdGhlIENhcmRzIFYyIFJFU1QgQVBJLlxuICpcbiAqIFVzZXMgdGhlIEZldGNoIEFQSSBieSBkZWZhdWx0IGFuZCBzdXBwb3J0cyBkZXBlbmRlbmN5IGluamVjdGlvbiBvZiBhblxuICogYWx0ZXJuYXRlIHtAbGluayBIdHRwQ2xpZW50fSBmb3IgdGVzdHMgb3IgY3VzdG9tIHRyYW5zcG9ydHMuIEFsbCBwdWJsaWNcbiAqIG1ldGhvZHMgc3VyZmFjZSBzZXJ2ZXIgZmFpbHVyZXMgYXMge0BsaW5rIEFwaUVycm9yfSBhbmQgdHJhbnNwb3J0IGZhaWx1cmVzXG4gKiBhcyB7QGxpbmsgTmV0d29ya0Vycm9yfS5cbiAqXG4gKiBUaGUgZGVmYXVsdCBIVFRQIGNsaWVudCBhcHBsaWVzIGFuIGV4cG9uZW50aWFsIGJhY2tvZmYgdGltZW91dCB0byBmZXRjaFxuICogcmVxdWVzdHM6IHN0YXJ0aW5nIGF0IDMgc2Vjb25kcywgZG91Ymxpbmcgb24gZWFjaCBjb25zZWN1dGl2ZSBmYWlsdXJlIHVwXG4gKiB0byBhIDEwLXNlY29uZCBjYXAsIGFuZCByZXNldHRpbmcgb24gYW55IHN1Y2Nlc3NmdWwgcmVzcG9uc2UuIFRoaXMgZW5zdXJlc1xuICogZmFzdCBmYWlsdXJlIGRldGVjdGlvbiB3aGVuIHRoZSBzZXJ2ZXIgaXMgZG93biB3aGlsZSBhbGxvd2luZyBzbG93ZXJcbiAqIHJlc3BvbnNlcyBkdXJpbmcgcmVjb3ZlcnkuXG4gKlxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGNvbnN0IGNsaWVudCA9IG5ldyBDYXJkc0NsaWVudCh7IGJhc2VVcmw6ICdodHRwOi8vbG9jYWxob3N0OjMwMDAnLCBhY2Nlc3NUb2tlbjogJ3Rva2VuJyB9KTtcbiAqXG4gKiBjb25zdCBjYXJkcyA9IGF3YWl0IGNsaWVudC5saXN0Q2FyZHMoeyBzdGF0dXM6ICdhY3RpdmUnIH0pO1xuICogYXdhaXQgY2xpZW50LnVwZGF0ZUNhcmQoY2FyZElkLCB7IHN0YXR1czogJ2RvbmUnIH0pO1xuICogYGBgXG4gKi9cbmV4cG9ydCBjbGFzcyBDYXJkc0NsaWVudCB7XG4gIHByaXZhdGUgcmVhZG9ubHkgX2h0dHBDbGllbnQ/OiBIdHRwQ2xpZW50O1xuXG4gIC8qKiBDdXJyZW50IHRpbWVvdXQgaW4gbWlsbGlzZWNvbmRzLCBpbmNyZWFzZXMgd2l0aCBjb25zZWN1dGl2ZSBmYWlsdXJlcy4gKi9cbiAgcHJpdmF0ZSBfY3VycmVudFRpbWVvdXRNcyA9IElOSVRJQUxfVElNRU9VVF9NUztcblxuICAvKipcbiAgICogQ3JlYXRlcyBhIG5ldyBDYXJkc0NsaWVudCBpbnN0YW5jZS5cbiAgICpcbiAgICogQHBhcmFtIG9wdGlvbnMgLSBDb25maWd1cmF0aW9uIG9wdGlvbnMgaW5jbHVkaW5nIGJhc2UgVVJMIGFuZCBhdXRoIHRva2VuLlxuICAgKiBAcGFyYW0gaHR0cENsaWVudCAtIE9wdGlvbmFsIEhUVFAgY2xpZW50IGZvciBkZXBlbmRlbmN5IGluamVjdGlvbi5cbiAgICovXG4gIGNvbnN0cnVjdG9yKFxuICAgIHByaXZhdGUgcmVhZG9ubHkgb3B0aW9uczogQ2FyZHNDbGllbnRPcHRpb25zLFxuICAgIGh0dHBDbGllbnQ/OiBIdHRwQ2xpZW50XG4gICkge1xuICAgIHRoaXMuX2h0dHBDbGllbnQgPSBodHRwQ2xpZW50O1xuICB9XG5cbiAgLyoqXG4gICAqIFJldHVybnMgdGhlIGJhc2UgVVJMIHVzZWQgdG8gYnVpbGQgQVBJIHJlcXVlc3RzLlxuICAgKlxuICAgKiBAcmV0dXJucyBUaGUgYmFzZSBVUkwgc3RyaW5nIGFzIHByb3ZpZGVkIGluIHtAbGluayBDYXJkc0NsaWVudE9wdGlvbnN9LlxuICAgKi9cbiAgZ2V0QmFzZVVybCgpOiBzdHJpbmcge1xuICAgIHJldHVybiB0aGlzLm9wdGlvbnMuYmFzZVVybDtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXR1cm5zIHdoZXRoZXIgYW4gSFRUUCBjbGllbnQgd2FzIGluamVjdGVkLlxuICAgKlxuICAgKiBAcmV0dXJucyBUcnVlIGlmIGFuIEhUVFAgY2xpZW50IHdhcyBwcm92aWRlZCBkdXJpbmcgY29uc3RydWN0aW9uLlxuICAgKiBAaW50ZXJuYWwgVXNlZCBmb3IgdGVzdGluZyBkZXBlbmRlbmN5IGluamVjdGlvbi5cbiAgICovXG4gIGhhc0h0dHBDbGllbnQoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuX2h0dHBDbGllbnQgIT09IHVuZGVmaW5lZDtcbiAgfVxuICAvKipcbiAgICogUmV0dXJucyBhbiBBYm9ydFNpZ25hbCB0aGF0IGZpcmVzIGFmdGVyIHRoZSBjdXJyZW50IGJhY2tvZmYgdGltZW91dC5cbiAgICogVXNlcyBjYWxsZXIncyBzaWduYWwgaWYgcHJvdmlkZWQgKGZvciBESS90ZXN0aW5nKSwgb3RoZXJ3aXNlIGFwcGxpZXMgdGhlIGJhY2tvZmYgdGltZW91dC5cbiAgICpcbiAgICogQHBhcmFtIGV4aXN0aW5nU2lnbmFsIC0gT3B0aW9uYWwgY2FsbGVyLXByb3ZpZGVkIHNpZ25hbCB0byByZXVzZSBpbnN0ZWFkIG9mIGNyZWF0aW5nIGEgdGltZW91dCBzaWduYWwuXG4gICAqIEByZXR1cm5zIEFib3J0U2lnbmFsIHRoYXQgY29udHJvbHMgcmVxdWVzdCBjYW5jZWxsYXRpb24gZm9yIHRoZSBjdXJyZW50IG9wZXJhdGlvbi5cbiAgICovXG4gIHByaXZhdGUgZ2V0VGltZW91dFNpZ25hbChleGlzdGluZ1NpZ25hbD86IEFib3J0U2lnbmFsIHwgbnVsbCk6IEFib3J0U2lnbmFsIHtcbiAgICBpZiAoZXhpc3RpbmdTaWduYWwpIHJldHVybiBleGlzdGluZ1NpZ25hbDtcbiAgICByZXR1cm4gQWJvcnRTaWduYWwudGltZW91dCh0aGlzLl9jdXJyZW50VGltZW91dE1zKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZWNvcmRzIGEgc3VjY2Vzc2Z1bCByZXF1ZXN0IGFuZCByZXNldHMgdGhlIHRpbWVvdXQgYmFja29mZi5cbiAgICovXG4gIHByaXZhdGUgb25SZXF1ZXN0U3VjY2VzcygpOiB2b2lkIHtcbiAgICB0aGlzLl9jdXJyZW50VGltZW91dE1zID0gSU5JVElBTF9USU1FT1VUX01TO1xuICB9XG5cbiAgLyoqXG4gICAqIFJlY29yZHMgYSBmYWlsZWQgcmVxdWVzdCBhbmQgaW5jcmVhc2VzIHRoZSB0aW1lb3V0IHZpYSBleHBvbmVudGlhbCBiYWNrb2ZmLlxuICAgKi9cbiAgcHJpdmF0ZSBvblJlcXVlc3RGYWlsdXJlKCk6IHZvaWQge1xuICAgIHRoaXMuX2N1cnJlbnRUaW1lb3V0TXMgPSBNYXRoLm1pbih0aGlzLl9jdXJyZW50VGltZW91dE1zICogMiwgTUFYX1RJTUVPVVRfTVMpO1xuICB9XG5cbiAgLyoqXG4gICAqIERlZmF1bHQgSFRUUCBjbGllbnQgaW1wbGVtZW50YXRpb24gdXNpbmcgZmV0Y2ggKyBKU09OIHBheWxvYWRzLlxuICAgKlxuICAgKiBFYWNoIGZldGNoIGNhbGwgaW5jbHVkZXMgYW4gQWJvcnRTaWduYWwudGltZW91dCB0aGF0IHN0YXJ0cyBhdCAzIHNlY29uZHNcbiAgICogYW5kIGRvdWJsZXMgb24gY29uc2VjdXRpdmUgZmFpbHVyZXMgdXAgdG8gMTAgc2Vjb25kcy5cbiAgICovXG4gIHByaXZhdGUgZGVmYXVsdEh0dHBDbGllbnQ6IEh0dHBDbGllbnQgPSB7XG4gICAgZ2V0OiBhc3luYyA8VD4odXJsOiBzdHJpbmcsIG9wdGlvbnM/OiBSZXF1ZXN0SW5pdCk6IFByb21pc2U8VD4gPT4ge1xuICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBmZXRjaCh1cmwsIHtcbiAgICAgICAgLi4ub3B0aW9ucyxcbiAgICAgICAgaGVhZGVyczogeyAuLi50aGlzLmdldEhlYWRlcnMoKSwgLi4ub3B0aW9ucz8uaGVhZGVycyB9LFxuICAgICAgICBzaWduYWw6IHRoaXMuZ2V0VGltZW91dFNpZ25hbChvcHRpb25zPy5zaWduYWwpXG4gICAgICB9KTtcbiAgICAgIGlmICghcmVzcG9uc2Uub2spIHRocm93IHJlc3BvbnNlO1xuICAgICAgcmV0dXJuIHJlc3BvbnNlLmpzb24oKSBhcyBQcm9taXNlPFQ+O1xuICAgIH0sXG4gICAgcG9zdDogYXN5bmMgPFQ+KHVybDogc3RyaW5nLCBib2R5OiB1bmtub3duLCBvcHRpb25zPzogUmVxdWVzdEluaXQpOiBQcm9taXNlPFQ+ID0+IHtcbiAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZmV0Y2godXJsLCB7XG4gICAgICAgIC4uLm9wdGlvbnMsXG4gICAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgICBoZWFkZXJzOiB7IC4uLnRoaXMuZ2V0SGVhZGVycygpLCAuLi5vcHRpb25zPy5oZWFkZXJzIH0sXG4gICAgICAgIGJvZHk6IGJvZHkgPyBKU09OLnN0cmluZ2lmeShib2R5KSA6IHVuZGVmaW5lZCxcbiAgICAgICAgc2lnbmFsOiB0aGlzLmdldFRpbWVvdXRTaWduYWwob3B0aW9ucz8uc2lnbmFsKVxuICAgICAgfSk7XG4gICAgICBpZiAoIXJlc3BvbnNlLm9rKSB0aHJvdyByZXNwb25zZTtcbiAgICAgIHJldHVybiByZXNwb25zZS5qc29uKCkgYXMgUHJvbWlzZTxUPjtcbiAgICB9LFxuICAgIHB1dDogYXN5bmMgPFQ+KHVybDogc3RyaW5nLCBib2R5OiB1bmtub3duLCBvcHRpb25zPzogUmVxdWVzdEluaXQpOiBQcm9taXNlPFQ+ID0+IHtcbiAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZmV0Y2godXJsLCB7XG4gICAgICAgIC4uLm9wdGlvbnMsXG4gICAgICAgIG1ldGhvZDogJ1BVVCcsXG4gICAgICAgIGhlYWRlcnM6IHsgLi4udGhpcy5nZXRIZWFkZXJzKCksIC4uLm9wdGlvbnM/LmhlYWRlcnMgfSxcbiAgICAgICAgYm9keTogYm9keSA/IEpTT04uc3RyaW5naWZ5KGJvZHkpIDogdW5kZWZpbmVkLFxuICAgICAgICBzaWduYWw6IHRoaXMuZ2V0VGltZW91dFNpZ25hbChvcHRpb25zPy5zaWduYWwpXG4gICAgICB9KTtcbiAgICAgIGlmICghcmVzcG9uc2Uub2spIHRocm93IHJlc3BvbnNlO1xuICAgICAgcmV0dXJuIHJlc3BvbnNlLmpzb24oKSBhcyBQcm9taXNlPFQ+O1xuICAgIH0sXG4gICAgcGF0Y2g6IGFzeW5jIDxUPih1cmw6IHN0cmluZywgYm9keTogdW5rbm93biwgb3B0aW9ucz86IFJlcXVlc3RJbml0KTogUHJvbWlzZTxUPiA9PiB7XG4gICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGZldGNoKHVybCwge1xuICAgICAgICAuLi5vcHRpb25zLFxuICAgICAgICBtZXRob2Q6ICdQQVRDSCcsXG4gICAgICAgIGhlYWRlcnM6IHsgLi4udGhpcy5nZXRIZWFkZXJzKCksIC4uLm9wdGlvbnM/LmhlYWRlcnMgfSxcbiAgICAgICAgYm9keTogYm9keSA/IEpTT04uc3RyaW5naWZ5KGJvZHkpIDogdW5kZWZpbmVkLFxuICAgICAgICBzaWduYWw6IHRoaXMuZ2V0VGltZW91dFNpZ25hbChvcHRpb25zPy5zaWduYWwpXG4gICAgICB9KTtcbiAgICAgIGlmICghcmVzcG9uc2Uub2spIHRocm93IHJlc3BvbnNlO1xuICAgICAgcmV0dXJuIHJlc3BvbnNlLmpzb24oKSBhcyBQcm9taXNlPFQ+O1xuICAgIH0sXG4gICAgZGVsZXRlOiBhc3luYyAodXJsOiBzdHJpbmcsIG9wdGlvbnM/OiBSZXF1ZXN0SW5pdCk6IFByb21pc2U8dm9pZD4gPT4ge1xuICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBmZXRjaCh1cmwsIHtcbiAgICAgICAgLi4ub3B0aW9ucyxcbiAgICAgICAgbWV0aG9kOiAnREVMRVRFJyxcbiAgICAgICAgaGVhZGVyczogeyAuLi50aGlzLmdldEhlYWRlcnMoKSwgLi4ub3B0aW9ucz8uaGVhZGVycyB9LFxuICAgICAgICBzaWduYWw6IHRoaXMuZ2V0VGltZW91dFNpZ25hbChvcHRpb25zPy5zaWduYWwpXG4gICAgICB9KTtcbiAgICAgIGlmICghcmVzcG9uc2Uub2spIHRocm93IHJlc3BvbnNlO1xuICAgIH1cbiAgfTtcblxuICAvKipcbiAgICogR2V0cyBIVFRQIGhlYWRlcnMgZm9yIEpTT04gQVBJIHJlcXVlc3RzLlxuICAgKlxuICAgKiBAcmV0dXJucyBIZWFkZXJzIHdpdGggSlNPTiBjb250ZW50IHR5cGUgYW5kIG9wdGlvbmFsIGJlYXJlciB0b2tlbi5cbiAgICovXG4gIHByaXZhdGUgZ2V0SGVhZGVycygpOiBIZWFkZXJzSW5pdCB7XG4gICAgY29uc3QgaGVhZGVyczogSGVhZGVyc0luaXQgPSB7ICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicgfTtcbiAgICBpZiAodGhpcy5vcHRpb25zLmFjY2Vzc1Rva2VuKSB7XG4gICAgICBoZWFkZXJzWydBdXRob3JpemF0aW9uJ10gPSBgQmVhcmVyICR7dGhpcy5vcHRpb25zLmFjY2Vzc1Rva2VufWA7XG4gICAgfVxuICAgIHJldHVybiBoZWFkZXJzO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldHMgdGhlIEhUVFAgY2xpZW50IHRvIHVzZSBmb3IgcmVxdWVzdHMuXG4gICAqXG4gICAqIEByZXR1cm5zIEluamVjdGVkIEhUVFAgY2xpZW50IHdoZW4gcHJvdmlkZWQsIG90aGVyd2lzZSB0aGUgZGVmYXVsdCBmZXRjaC1iYXNlZCBjbGllbnQuXG4gICAqL1xuICBwcml2YXRlIGdldEh0dHBDbGllbnQoKTogSHR0cENsaWVudCB7XG4gICAgcmV0dXJuIHRoaXMuX2h0dHBDbGllbnQgPz8gdGhpcy5kZWZhdWx0SHR0cENsaWVudDtcbiAgfVxuXG4gIC8qKlxuICAgKiBCdWlsZHMgYSBVUkwgcmVsYXRpdmUgdG8gdGhlIGNvbmZpZ3VyZWQgYmFzZSBVUkwuXG4gICAqXG4gICAqIFVuZGVmaW5lZCBhbmQgbnVsbCBxdWVyeSBwYXJhbXMgYXJlIG9taXR0ZWQuIFZhbHVlcyBhcmUgc3RyaW5naWZpZWQuXG4gICAqXG4gICAqIEBwYXJhbSBwYXRoIC0gUmVsYXRpdmUgQVBJIHBhdGggdG8gYXBwZW5kIHRvIHRoZSBjb25maWd1cmVkIGJhc2UgVVJMLlxuICAgKiBAcGFyYW0gcGFyYW1zIC0gT3B0aW9uYWwgcXVlcnkgcGFyYW1ldGVycyB0byBlbmNvZGUgb250byB0aGUgVVJMLlxuICAgKiBAcmV0dXJucyBGdWxseS1xdWFsaWZpZWQgcmVxdWVzdCBVUkwgc3RyaW5nLlxuICAgKi9cbiAgcHJpdmF0ZSBidWlsZFVybChwYXRoOiBzdHJpbmcsIHBhcmFtcz86IFJlY29yZDxzdHJpbmcsIHVua25vd24+KTogc3RyaW5nIHtcbiAgICBjb25zdCB1cmwgPSBuZXcgVVJMKHBhdGgsIHRoaXMub3B0aW9ucy5iYXNlVXJsKTtcbiAgICBpZiAocGFyYW1zKSB7XG4gICAgICBmb3IgKGNvbnN0IFtrZXksIHZhbHVlXSBvZiBPYmplY3QuZW50cmllcyhwYXJhbXMpKSB7XG4gICAgICAgIGlmICh2YWx1ZSAhPT0gdW5kZWZpbmVkICYmIHZhbHVlICE9PSBudWxsKSB7XG4gICAgICAgICAgdXJsLnNlYXJjaFBhcmFtcy5zZXQoa2V5LCBTdHJpbmcodmFsdWUpKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdXJsLnRvU3RyaW5nKCk7XG4gIH1cblxuICAvKipcbiAgICogV3JhcHMgYSByZXF1ZXN0IHdpdGggY29uc2lzdGVudCBlcnJvciBoYW5kbGluZy5cbiAgICpcbiAgICogQHBhcmFtIGZuIC0gQXN5bmMgcmVxdWVzdCBmdW5jdGlvbiB0byBleGVjdXRlLlxuICAgKiBAcmV0dXJucyBUaGUgcmVzb2x2ZWQgdmFsdWUgZnJvbSB0aGUgcmVxdWVzdCBmdW5jdGlvbi5cbiAgICogQHRocm93cyBBcGlFcnJvciB3aGVuIHRoZSBzZXJ2ZXIgcmVzcG9uZHMgd2l0aCBhIG5vbi0yeHggc3RhdHVzLlxuICAgKiBAdGhyb3dzIE5ldHdvcmtFcnJvciBmb3IgbmV0d29yayBmYWlsdXJlcyBvciB1bmV4cGVjdGVkIGV4Y2VwdGlvbnMuXG4gICAqL1xuICBwcml2YXRlIGFzeW5jIHJlcXVlc3Q8VD4oZm46ICgpID0+IFByb21pc2U8VD4pOiBQcm9taXNlPFQ+IHtcbiAgICBsZXQgbGFzdFRpbWVvdXRFcnJvcjogTmV0d29ya0Vycm9yIHwgdW5kZWZpbmVkO1xuXG4gICAgZm9yIChsZXQgYXR0ZW1wdCA9IDA7IGF0dGVtcHQgPD0gTUFYX1RJTUVPVVRfUkVUUklFUzsgYXR0ZW1wdCsrKSB7XG4gICAgICB0cnkge1xuICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBmbigpO1xuICAgICAgICB0aGlzLm9uUmVxdWVzdFN1Y2Nlc3MoKTtcbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgIGlmIChlcnJvciBpbnN0YW5jZW9mIFJlc3BvbnNlKSB7XG4gICAgICAgICAgLy8gU2VydmVyIHJlc3BvbmRlZCAoZXZlbiB3aXRoIGFuIGVycm9yIHN0YXR1cykgLSBjb25uZWN0aW9uIGlzIGFsaXZlLCByZXNldCBiYWNrb2ZmXG4gICAgICAgICAgdGhpcy5vblJlcXVlc3RTdWNjZXNzKCk7XG4gICAgICAgICAgbGV0IGJvZHk6IFJlY29yZDxzdHJpbmcsIHVua25vd24+ID0ge307XG4gICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGJvZHkgPSBhd2FpdCBlcnJvci5qc29uKCk7XG4gICAgICAgICAgfSBjYXRjaCAocGFyc2VFcnJvcikge1xuICAgICAgICAgICAgLy8gU3ludGF4RXJyb3IgaXMgZXhwZWN0ZWQgd2hlbiBzZXJ2ZXIgcmV0dXJucyBub24tSlNPTiBlcnJvciByZXNwb25zZSAoZS5nLiwgSFRNTCBlcnJvciBwYWdlKVxuICAgICAgICAgICAgaWYgKCEocGFyc2VFcnJvciBpbnN0YW5jZW9mIFN5bnRheEVycm9yKSkge1xuICAgICAgICAgICAgICBjb25zb2xlLndhcm4oJ1tDYXJkc0NsaWVudF0gVW5leHBlY3RlZCBlcnJvciBwYXJzaW5nIGVycm9yIHJlc3BvbnNlOicsIHBhcnNlRXJyb3IpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBjb25zdCBtZXNzYWdlID1cbiAgICAgICAgICAgIChib2R5WydlcnJvciddIGFzIHN0cmluZyB8IHVuZGVmaW5lZCkgfHwgKGJvZHlbJ21lc3NhZ2UnXSBhcyBzdHJpbmcgfCB1bmRlZmluZWQpIHx8IGVycm9yLnN0YXR1c1RleHQ7XG4gICAgICAgICAgY29uc3QgY29kZSA9IChib2R5Wydjb2RlJ10gYXMgc3RyaW5nIHwgdW5kZWZpbmVkKSB8fCBTdHJpbmcoZXJyb3Iuc3RhdHVzKTtcbiAgICAgICAgICBjb25zdCBmaWVsZHMgPSBib2R5WydmaWVsZHMnXSBhcyBBcnJheTx7IGZpZWxkOiBzdHJpbmc7IG1lc3NhZ2U6IHN0cmluZyB9PiB8IHVuZGVmaW5lZDtcbiAgICAgICAgICB0aHJvdyBuZXcgQXBpRXJyb3IobWVzc2FnZSwgY29kZSwgZmllbGRzKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIE5ldHdvcmsgb3IgdGltZW91dCBmYWlsdXJlIC0gaW5jcmVhc2UgYmFja29mZiBmb3IgbmV4dCBhdHRlbXB0XG4gICAgICAgIHRoaXMub25SZXF1ZXN0RmFpbHVyZSgpO1xuXG4gICAgICAgIGlmIChlcnJvciBpbnN0YW5jZW9mIERPTUV4Y2VwdGlvbiAmJiBlcnJvci5uYW1lID09PSAnVGltZW91dEVycm9yJykge1xuICAgICAgICAgIGxhc3RUaW1lb3V0RXJyb3IgPSBuZXcgTmV0d29ya0Vycm9yKCdSZXF1ZXN0IHRpbWVkIG91dCcsIGVycm9yKTtcbiAgICAgICAgICAvLyBSZXRyeSBvbiB0aW1lb3V0IC0gb25SZXF1ZXN0RmFpbHVyZSgpIGFscmVhZHkgaW5jcmVhc2VkIF9jdXJyZW50VGltZW91dE1zXG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBOb24tdGltZW91dCBuZXR3b3JrIGVycm9ycyAoRE5TIGZhaWx1cmUsIGNvbm5lY3Rpb24gcmVmdXNlZCkgYXJlIG5vdCByZXRyaWVkXG4gICAgICAgIHRocm93IG5ldyBOZXR3b3JrRXJyb3IoJ1JlcXVlc3QgZmFpbGVkJywgZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yIDogdW5kZWZpbmVkKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBBbGwgcmV0cnkgYXR0ZW1wdHMgZXhoYXVzdGVkXG4gICAgdGhyb3cgbGFzdFRpbWVvdXRFcnJvciE7XG4gIH1cblxuICAvLyAtLS0gQ2FyZCBPcGVyYXRpb25zIC0tLVxuXG4gIC8qKlxuICAgKiBMaXN0cyBjYXJkcyB3aXRoIG9wdGlvbmFsIGZpbHRlcmluZy5cbiAgICpcbiAgICogQHBhcmFtIG9wdGlvbnMgLSBPcHRpb25hbCBmaWx0ZXIgYW5kIHBhZ2luYXRpb24gb3B0aW9ucy5cbiAgICogQHJldHVybnMgUHJvbWlzZSByZXNvbHZpbmcgdG8gbWF0Y2hpbmcgY2FyZHMuXG4gICAqIEB0aHJvd3MgQXBpRXJyb3Igd2hlbiB0aGUgc2VydmVyIHJlc3BvbmRzIHdpdGggYW4gZXJyb3IuXG4gICAqIEB0aHJvd3MgTmV0d29ya0Vycm9yIHdoZW4gdGhlIHJlcXVlc3QgZmFpbHMgdG8gcmVhY2ggdGhlIHNlcnZlci5cbiAgICovXG4gIGFzeW5jIGxpc3RDYXJkcyhvcHRpb25zPzogTGlzdENhcmRzT3B0aW9ucyk6IFByb21pc2U8Q2FyZFtdPiB7XG4gICAgY29uc3QgdXJsU3RyID0gdGhpcy5idWlsZFVybCgnL2NhcmRzJywge1xuICAgICAgd29ya3NwYWNlUGF0aDogdGhpcy5vcHRpb25zLndvcmtzcGFjZVBhdGgsXG4gICAgICBzdGF0dXM6IG9wdGlvbnM/LnN0YXR1cyxcbiAgICAgIHNlYXJjaDogb3B0aW9ucz8uc2VhcmNoLFxuICAgICAgbGltaXQ6IG9wdGlvbnM/LmxpbWl0LFxuICAgICAgb2Zmc2V0OiBvcHRpb25zPy5vZmZzZXRcbiAgICB9KTtcbiAgICBjb25zdCB1cmwgPSBuZXcgVVJMKHVybFN0cik7XG4gICAgZm9yIChjb25zdCB0IG9mIG9wdGlvbnM/LnRhZ3MgPz8gW10pIHtcbiAgICAgIHVybC5zZWFyY2hQYXJhbXMuYXBwZW5kKCd0YWcnLCB0KTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMucmVxdWVzdCgoKSA9PiB0aGlzLmdldEh0dHBDbGllbnQoKS5nZXQ8Q2FyZFtdPih1cmwudG9TdHJpbmcoKSkpO1xuICB9XG5cbiAgLyoqXG4gICAqIExpc3RzIGNhcmRzIGFzIGxpZ2h0d2VpZ2h0IHN1bW1hcmllcyBmb3IgbGlzdCB2aWV3cy5cbiAgICpcbiAgICogUmV0dXJucyBwcmUtZmxhdHRlbmVkIGZpZWxkcyBzdWl0YWJsZSBmb3IgZGlyZWN0IHVzZSBpbiBsaXN0IHJlbmRlcmluZyxcbiAgICogb21pdHRpbmcgaGVhdnl3ZWlnaHQgZmllbGRzIGxpa2UgYHBsYW5Db250ZW50YCBhbmQgYHJlcG9zaXRvcnlQYXRoYC5cbiAgICpcbiAgICogQHRlbXBsYXRlIFQgLSBUaGUgZXhwZWN0ZWQgc3VtbWFyeSBzaGFwZSAoZGVmYXVsdCBgUmVjb3JkPHN0cmluZywgdW5rbm93bj5gKS5cbiAgICogQHJldHVybnMgUHJvbWlzZSByZXNvbHZpbmcgdG8gY2FyZCBzdW1tYXJpZXMuXG4gICAqIEB0aHJvd3MgQXBpRXJyb3Igd2hlbiB0aGUgc2VydmVyIHJlc3BvbmRzIHdpdGggYW4gZXJyb3IuXG4gICAqIEB0aHJvd3MgTmV0d29ya0Vycm9yIHdoZW4gdGhlIHJlcXVlc3QgZmFpbHMgdG8gcmVhY2ggdGhlIHNlcnZlci5cbiAgICovXG4gIGFzeW5jIGxpc3RDYXJkU3VtbWFyaWVzPFQgPSBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPj4oKTogUHJvbWlzZTxUW10+IHtcbiAgICBjb25zdCB1cmwgPSB0aGlzLmJ1aWxkVXJsKCcvY2FyZHMvbGlzdCcsIHtcbiAgICAgIHdvcmtzcGFjZVBhdGg6IHRoaXMub3B0aW9ucy53b3Jrc3BhY2VQYXRoXG4gICAgfSk7XG4gICAgcmV0dXJuIHRoaXMucmVxdWVzdCgoKSA9PiB0aGlzLmdldEh0dHBDbGllbnQoKS5nZXQ8VFtdPih1cmwpKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXRzIGEgc2luZ2xlIGNhcmQgYnkgaWQuXG4gICAqXG4gICAqIEBwYXJhbSBjYXJkSWQgLSBUaGUgaWQgb2YgdGhlIGNhcmQgdG8gcmV0cmlldmUuXG4gICAqIEByZXR1cm5zIFByb21pc2UgcmVzb2x2aW5nIHRvIHRoZSBjYXJkLlxuICAgKiBAdGhyb3dzIEFwaUVycm9yIHdoZW4gdGhlIHNlcnZlciByZXNwb25kcyB3aXRoIGFuIGVycm9yLlxuICAgKiBAdGhyb3dzIE5ldHdvcmtFcnJvciB3aGVuIHRoZSByZXF1ZXN0IGZhaWxzIHRvIHJlYWNoIHRoZSBzZXJ2ZXIuXG4gICAqL1xuICBhc3luYyBnZXRDYXJkKGNhcmRJZDogc3RyaW5nKTogUHJvbWlzZTxDYXJkPiB7XG4gICAgY29uc3QgdXJsID0gdGhpcy5idWlsZFVybChgL2NhcmRzLyR7Y2FyZElkfWAsIHtcbiAgICAgIHdvcmtzcGFjZVBhdGg6IHRoaXMub3B0aW9ucy53b3Jrc3BhY2VQYXRoXG4gICAgfSk7XG4gICAgcmV0dXJuIHRoaXMucmVxdWVzdCgoKSA9PiB0aGlzLmdldEh0dHBDbGllbnQoKS5nZXQ8Q2FyZD4odXJsKSk7XG4gIH1cblxuICAvKipcbiAgICogQ3JlYXRlcyBhIG5ldyBjYXJkLlxuICAgKlxuICAgKiBAcGFyYW0gZGF0YSAtIENhcmQgY3JlYXRpb24gcGF5bG9hZC5cbiAgICogQHJldHVybnMgUHJvbWlzZSByZXNvbHZpbmcgdG8gdGhlIGNyZWF0ZWQgY2FyZC5cbiAgICogQHRocm93cyBBcGlFcnJvciB3aGVuIHRoZSBzZXJ2ZXIgcmVqZWN0cyB0aGUgcGF5bG9hZC5cbiAgICogQHRocm93cyBOZXR3b3JrRXJyb3Igd2hlbiB0aGUgcmVxdWVzdCBmYWlscyB0byByZWFjaCB0aGUgc2VydmVyLlxuICAgKi9cbiAgYXN5bmMgY3JlYXRlQ2FyZChkYXRhOiBDYXJkQ3JlYXRlRGF0YSk6IFByb21pc2U8Q2FyZD4ge1xuICAgIGNvbnN0IHVybCA9IHRoaXMuYnVpbGRVcmwoJy9jYXJkcycpO1xuICAgIGNvbnN0IGJvZHkgPSB7XG4gICAgICAuLi5kYXRhLFxuICAgICAgd29ya3NwYWNlUGF0aDogdGhpcy5vcHRpb25zLndvcmtzcGFjZVBhdGhcbiAgICB9O1xuICAgIHJldHVybiB0aGlzLnJlcXVlc3QoKCkgPT4gdGhpcy5nZXRIdHRwQ2xpZW50KCkucG9zdDxDYXJkPih1cmwsIGJvZHkpKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBVcGRhdGVzIGFuIGV4aXN0aW5nIGNhcmQuXG4gICAqXG4gICAqIEBwYXJhbSBjYXJkSWQgLSBUaGUgaWQgb2YgdGhlIGNhcmQgdG8gdXBkYXRlLlxuICAgKiBAcGFyYW0gZGF0YSAtIFRoZSBmaWVsZHMgdG8gdXBkYXRlLlxuICAgKiBAcmV0dXJucyBQcm9taXNlIHJlc29sdmluZyB0byB0aGUgdXBkYXRlZCBjYXJkLlxuICAgKiBAdGhyb3dzIEFwaUVycm9yIHdoZW4gdGhlIHNlcnZlciByZWplY3RzIHRoZSB1cGRhdGUuXG4gICAqIEB0aHJvd3MgTmV0d29ya0Vycm9yIHdoZW4gdGhlIHJlcXVlc3QgZmFpbHMgdG8gcmVhY2ggdGhlIHNlcnZlci5cbiAgICogQGRlcHJlY2F0ZWQgVXNlIGRpcmVjdCBnaXQgb3BlcmF0aW9ucyBpbnN0ZWFkLiBUaGlzIGVuZHBvaW50IHdpbGwgYmUgcmVtb3ZlZC5cbiAgICovXG4gIGFzeW5jIHVwZGF0ZUNhcmQoY2FyZElkOiBzdHJpbmcsIGRhdGE6IENhcmRVcGRhdGVEYXRhKTogUHJvbWlzZTxDYXJkPiB7XG4gICAgY29uc3QgdXJsID0gdGhpcy5idWlsZFVybChgL2NhcmRzLyR7Y2FyZElkfWApO1xuICAgIHJldHVybiB0aGlzLnJlcXVlc3QoKCkgPT4gdGhpcy5nZXRIdHRwQ2xpZW50KCkucGF0Y2g8Q2FyZD4odXJsLCBkYXRhKSk7XG4gIH1cblxuICAvKipcbiAgICogRGVsZXRlcyBhIGNhcmQuXG4gICAqXG4gICAqIEBwYXJhbSBjYXJkSWQgLSBUaGUgaWQgb2YgdGhlIGNhcmQgdG8gZGVsZXRlLlxuICAgKiBAcmV0dXJucyBQcm9taXNlIHJlc29sdmluZyB3aGVuIGRlbGV0aW9uIGlzIGNvbXBsZXRlLlxuICAgKiBAdGhyb3dzIEFwaUVycm9yIHdoZW4gdGhlIHNlcnZlciByZWplY3RzIHRoZSBkZWxldGUuXG4gICAqIEB0aHJvd3MgTmV0d29ya0Vycm9yIHdoZW4gdGhlIHJlcXVlc3QgZmFpbHMgdG8gcmVhY2ggdGhlIHNlcnZlci5cbiAgICogQGRlcHJlY2F0ZWQgVXNlIGRpcmVjdCBnaXQgb3BlcmF0aW9ucyBpbnN0ZWFkLiBUaGlzIGVuZHBvaW50IHdpbGwgYmUgcmVtb3ZlZC5cbiAgICovXG4gIGFzeW5jIGRlbGV0ZUNhcmQoY2FyZElkOiBzdHJpbmcpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zdCB1cmwgPSB0aGlzLmJ1aWxkVXJsKGAvY2FyZHMvJHtjYXJkSWR9YCk7XG4gICAgcmV0dXJuIHRoaXMucmVxdWVzdCgoKSA9PiB0aGlzLmdldEh0dHBDbGllbnQoKS5kZWxldGUodXJsKSk7XG4gIH1cblxuICAvLyAtLS0gQ29tbWVudCBPcGVyYXRpb25zIC0tLVxuXG4gIC8qKlxuICAgKiBHZXRzIGFsbCBjb21tZW50cyBmb3IgYSBjYXJkLlxuICAgKlxuICAgKiBAcGFyYW0gY2FyZElkIC0gSWRlbnRpZmllciBvZiB0aGUgdGFyZ2V0IGNhcmQgZm9yIHRoaXMgcmVxdWVzdC5cbiAgICogQHJldHVybnMgUHJvbWlzZSByZXNvbHZpbmcgdG8gdGhlIGNvbW1lbnQgbGlzdC5cbiAgICogQHRocm93cyBBcGlFcnJvciB3aGVuIHRoZSBzZXJ2ZXIgcmVzcG9uZHMgd2l0aCBhbiBlcnJvci5cbiAgICogQHRocm93cyBOZXR3b3JrRXJyb3Igd2hlbiB0aGUgcmVxdWVzdCBmYWlscyB0byByZWFjaCB0aGUgc2VydmVyLlxuICAgKi9cbiAgYXN5bmMgZ2V0Q29tbWVudHMoY2FyZElkOiBzdHJpbmcpOiBQcm9taXNlPENvbW1lbnRbXT4ge1xuICAgIGNvbnN0IHVybCA9IHRoaXMuYnVpbGRVcmwoYC9jYXJkcy8ke2NhcmRJZH0vY29tbWVudHNgKTtcbiAgICByZXR1cm4gdGhpcy5yZXF1ZXN0KCgpID0+IHRoaXMuZ2V0SHR0cENsaWVudCgpLmdldDxDb21tZW50W10+KHVybCkpO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldHMgYSBzaW5nbGUgY29tbWVudCBieSBpZC5cbiAgICpcbiAgICogQHBhcmFtIGNhcmRJZCAtIElkZW50aWZpZXIgb2YgdGhlIGNhcmQgdGhhdCBvd25zIHRoZSByZXF1ZXN0ZWQgY29tbWVudC5cbiAgICogQHBhcmFtIGNvbW1lbnRJZCAtIElkZW50aWZpZXIgb2YgdGhlIGNvbW1lbnQgdG8gcmV0cmlldmUuXG4gICAqIEByZXR1cm5zIFByb21pc2UgcmVzb2x2aW5nIHRvIHRoZSBjb21tZW50LlxuICAgKiBAdGhyb3dzIEFwaUVycm9yIHdoZW4gdGhlIHNlcnZlciByZXNwb25kcyB3aXRoIGFuIGVycm9yLlxuICAgKiBAdGhyb3dzIE5ldHdvcmtFcnJvciB3aGVuIHRoZSByZXF1ZXN0IGZhaWxzIHRvIHJlYWNoIHRoZSBzZXJ2ZXIuXG4gICAqL1xuICBhc3luYyBnZXRDb21tZW50KGNhcmRJZDogc3RyaW5nLCBjb21tZW50SWQ6IHN0cmluZyk6IFByb21pc2U8Q29tbWVudD4ge1xuICAgIGNvbnN0IHVybCA9IHRoaXMuYnVpbGRVcmwoYC9jYXJkcy8ke2NhcmRJZH0vY29tbWVudHMvJHtjb21tZW50SWR9YCk7XG4gICAgcmV0dXJuIHRoaXMucmVxdWVzdCgoKSA9PiB0aGlzLmdldEh0dHBDbGllbnQoKS5nZXQ8Q29tbWVudD4odXJsKSk7XG4gIH1cblxuICAvKipcbiAgICogQ3JlYXRlcyBhIG5ldyBjb21tZW50IG9uIGEgY2FyZC5cbiAgICpcbiAgICogQHBhcmFtIGNhcmRJZCAtIElkZW50aWZpZXIgb2YgdGhlIGNhcmQgdGhhdCB3aWxsIHJlY2VpdmUgdGhlIG5ldyBjb21tZW50LlxuICAgKiBAcGFyYW0gZGF0YSAtIENvbW1lbnQgY3JlYXRpb24gcGF5bG9hZC5cbiAgICogQHJldHVybnMgUHJvbWlzZSByZXNvbHZpbmcgdG8gdGhlIGNyZWF0ZWQgY29tbWVudC5cbiAgICogQHRocm93cyBBcGlFcnJvciB3aGVuIHRoZSBzZXJ2ZXIgcmVqZWN0cyB0aGUgcGF5bG9hZC5cbiAgICogQHRocm93cyBOZXR3b3JrRXJyb3Igd2hlbiB0aGUgcmVxdWVzdCBmYWlscyB0byByZWFjaCB0aGUgc2VydmVyLlxuICAgKiBAZGVwcmVjYXRlZCBVc2UgZGlyZWN0IGdpdCBvcGVyYXRpb25zIGluc3RlYWQuIFRoaXMgZW5kcG9pbnQgd2lsbCBiZSByZW1vdmVkLlxuICAgKi9cbiAgYXN5bmMgY3JlYXRlQ29tbWVudChjYXJkSWQ6IHN0cmluZywgZGF0YTogQ29tbWVudENyZWF0ZURhdGEpOiBQcm9taXNlPENvbW1lbnQ+IHtcbiAgICBjb25zdCB1cmwgPSB0aGlzLmJ1aWxkVXJsKGAvY2FyZHMvJHtjYXJkSWR9L2NvbW1lbnRzYCk7XG4gICAgcmV0dXJuIHRoaXMucmVxdWVzdCgoKSA9PiB0aGlzLmdldEh0dHBDbGllbnQoKS5wb3N0PENvbW1lbnQ+KHVybCwgZGF0YSkpO1xuICB9XG5cbiAgLyoqXG4gICAqIFVwZGF0ZXMgYW4gZXhpc3RpbmcgY29tbWVudC5cbiAgICpcbiAgICogQHBhcmFtIGNhcmRJZCAtIElkZW50aWZpZXIgb2YgdGhlIGNhcmQgdGhhdCBvd25zIHRoZSBjb21tZW50LlxuICAgKiBAcGFyYW0gY29tbWVudElkIC0gSWRlbnRpZmllciBvZiB0aGUgY29tbWVudCB0byB1cGRhdGUuXG4gICAqIEBwYXJhbSBkYXRhIC0gQ29tbWVudCB1cGRhdGUgcGF5bG9hZC5cbiAgICogQHJldHVybnMgUHJvbWlzZSByZXNvbHZpbmcgdG8gdGhlIHVwZGF0ZWQgY29tbWVudC5cbiAgICogQHRocm93cyBBcGlFcnJvciB3aGVuIHRoZSBzZXJ2ZXIgcmVqZWN0cyB0aGUgdXBkYXRlLlxuICAgKiBAdGhyb3dzIE5ldHdvcmtFcnJvciB3aGVuIHRoZSByZXF1ZXN0IGZhaWxzIHRvIHJlYWNoIHRoZSBzZXJ2ZXIuXG4gICAqIEBkZXByZWNhdGVkIFVzZSBkaXJlY3QgZ2l0IG9wZXJhdGlvbnMgaW5zdGVhZC4gVGhpcyBlbmRwb2ludCB3aWxsIGJlIHJlbW92ZWQuXG4gICAqL1xuICBhc3luYyB1cGRhdGVDb21tZW50KGNhcmRJZDogc3RyaW5nLCBjb21tZW50SWQ6IHN0cmluZywgZGF0YTogQ29tbWVudFVwZGF0ZURhdGEpOiBQcm9taXNlPENvbW1lbnQ+IHtcbiAgICBjb25zdCB1cmwgPSB0aGlzLmJ1aWxkVXJsKGAvY2FyZHMvJHtjYXJkSWR9L2NvbW1lbnRzLyR7Y29tbWVudElkfWApO1xuICAgIHJldHVybiB0aGlzLnJlcXVlc3QoKCkgPT4gdGhpcy5nZXRIdHRwQ2xpZW50KCkucGF0Y2g8Q29tbWVudD4odXJsLCBkYXRhKSk7XG4gIH1cblxuICAvKipcbiAgICogRGVsZXRlcyBhIGNvbW1lbnQuXG4gICAqXG4gICAqIEBwYXJhbSBjYXJkSWQgLSBJZGVudGlmaWVyIG9mIHRoZSBjYXJkIHRoYXQgb3ducyB0aGUgY29tbWVudC5cbiAgICogQHBhcmFtIGNvbW1lbnRJZCAtIElkZW50aWZpZXIgb2YgdGhlIGNvbW1lbnQgdG8gcmVtb3ZlLlxuICAgKiBAcmV0dXJucyBQcm9taXNlIHJlc29sdmluZyB3aGVuIGRlbGV0aW9uIGlzIGNvbXBsZXRlLlxuICAgKiBAdGhyb3dzIEFwaUVycm9yIHdoZW4gdGhlIHNlcnZlciByZWplY3RzIHRoZSBkZWxldGUuXG4gICAqIEB0aHJvd3MgTmV0d29ya0Vycm9yIHdoZW4gdGhlIHJlcXVlc3QgZmFpbHMgdG8gcmVhY2ggdGhlIHNlcnZlci5cbiAgICogQGRlcHJlY2F0ZWQgVXNlIGRpcmVjdCBnaXQgb3BlcmF0aW9ucyBpbnN0ZWFkLiBUaGlzIGVuZHBvaW50IHdpbGwgYmUgcmVtb3ZlZC5cbiAgICovXG4gIGFzeW5jIGRlbGV0ZUNvbW1lbnQoY2FyZElkOiBzdHJpbmcsIGNvbW1lbnRJZDogc3RyaW5nKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc3QgdXJsID0gdGhpcy5idWlsZFVybChgL2NhcmRzLyR7Y2FyZElkfS9jb21tZW50cy8ke2NvbW1lbnRJZH1gKTtcbiAgICByZXR1cm4gdGhpcy5yZXF1ZXN0KCgpID0+IHRoaXMuZ2V0SHR0cENsaWVudCgpLmRlbGV0ZSh1cmwpKTtcbiAgfVxuXG4gIC8vIC0tLSBBdHRhY2htZW50IE9wZXJhdGlvbnMgLS0tXG5cbiAgLyoqXG4gICAqIFVwbG9hZHMgYW4gYXR0YWNobWVudCB0byBhIGNhcmQgdXNpbmcgYmluYXJ5IFBVVC5cbiAgICpcbiAgICogVGhpcyBpcyB0aGUgcHJlZmVycmVkIG1ldGhvZCAtIHNlbmRzIHJhdyBiaW5hcnkgZGF0YSBkaXJlY3RseSB3aXRob3V0XG4gICAqIGJhc2U2NCBlbmNvZGluZywgcmVzdWx0aW5nIGluIDMzJSBzbWFsbGVyIHBheWxvYWRzLlxuICAgKlxuICAgKiBAcGFyYW0gY2FyZElkIC0gSWRlbnRpZmllciBvZiB0aGUgY2FyZCB0aGF0IHdpbGwgcmVjZWl2ZSB0aGUgYXR0YWNobWVudC5cbiAgICogQHBhcmFtIG5hbWUgLSBGaWxlIG5hbWUgaW5jbHVkaW5nIGV4dGVuc2lvbi5cbiAgICogQHBhcmFtIGRhdGEgLSBCaW5hcnkgZGF0YSBhcyBCbG9iLCBBcnJheUJ1ZmZlciwgb3IgYmFzZTY0IHN0cmluZy5cbiAgICogQHJldHVybnMgUHJvbWlzZSByZXNvbHZpbmcgdG8gYXR0YWNobWVudCBtZXRhZGF0YS5cbiAgICogQHRocm93cyBBcGlFcnJvciB3aGVuIHRoZSBzZXJ2ZXIgcmVqZWN0cyB0aGUgdXBsb2FkLlxuICAgKiBAdGhyb3dzIE5ldHdvcmtFcnJvciB3aGVuIHRoZSByZXF1ZXN0IGZhaWxzIHRvIHJlYWNoIHRoZSBzZXJ2ZXIuXG4gICAqL1xuICBhc3luYyB1cGxvYWRBdHRhY2htZW50KGNhcmRJZDogc3RyaW5nLCBuYW1lOiBzdHJpbmcsIGRhdGE6IEJsb2IgfCBBcnJheUJ1ZmZlciB8IHN0cmluZyk6IFByb21pc2U8QXR0YWNobWVudFJlc3BvbnNlPiB7XG4gICAgY29uc3QgdXJsID0gdGhpcy5idWlsZFVybChgL2NhcmRzLyR7Y2FyZElkfS9hdHRhY2htZW50cy8ke2VuY29kZVVSSUNvbXBvbmVudChuYW1lKX1gKTtcblxuICAgIC8vIENvbnZlcnQgZGF0YSB0byBCbG9iIGZvciBmZXRjaCBib2R5XG4gICAgbGV0IGJvZHk6IEJsb2I7XG4gICAgaWYgKGRhdGEgaW5zdGFuY2VvZiBCbG9iKSB7XG4gICAgICBib2R5ID0gZGF0YTtcbiAgICB9IGVsc2UgaWYgKGRhdGEgaW5zdGFuY2VvZiBBcnJheUJ1ZmZlcikge1xuICAgICAgYm9keSA9IG5ldyBCbG9iKFtkYXRhXSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIGJhc2U2NCBzdHJpbmcgLSBkZWNvZGUgdG8gYmluYXJ5XG4gICAgICBjb25zdCBiaW5hcnlTdHJpbmcgPSBhdG9iKGRhdGEpO1xuICAgICAgY29uc3QgYnl0ZXMgPSBuZXcgVWludDhBcnJheShiaW5hcnlTdHJpbmcubGVuZ3RoKTtcbiAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgYmluYXJ5U3RyaW5nLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGJ5dGVzW2ldID0gYmluYXJ5U3RyaW5nLmNoYXJDb2RlQXQoaSk7XG4gICAgICB9XG4gICAgICBib2R5ID0gbmV3IEJsb2IoW2J5dGVzXSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMucmVxdWVzdChhc3luYyAoKSA9PiB7XG4gICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGZldGNoKHVybCwge1xuICAgICAgICBtZXRob2Q6ICdQVVQnLFxuICAgICAgICBoZWFkZXJzOiB7XG4gICAgICAgICAgLi4udGhpcy5nZXRIZWFkZXJzKCksXG4gICAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9vY3RldC1zdHJlYW0nXG4gICAgICAgIH0sXG4gICAgICAgIGJvZHksXG4gICAgICAgIHNpZ25hbDogdGhpcy5nZXRUaW1lb3V0U2lnbmFsKClcbiAgICAgIH0pO1xuICAgICAgaWYgKCFyZXNwb25zZS5vaykgdGhyb3cgcmVzcG9uc2U7XG4gICAgICByZXR1cm4gcmVzcG9uc2UuanNvbigpIGFzIFByb21pc2U8QXR0YWNobWVudFJlc3BvbnNlPjtcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBEb3dubG9hZHMgYW4gYXR0YWNobWVudCBhcyBhIEJsb2IuXG4gICAqXG4gICAqIFRoaXMgbWV0aG9kIHVzZXMgYGZldGNoYCBkaXJlY3RseSBzbyBiaW5hcnkgZGF0YSBpcyBwcmVzZXJ2ZWQuXG4gICAqXG4gICAqIEBwYXJhbSBjYXJkSWQgLSBJZGVudGlmaWVyIG9mIHRoZSBjYXJkIHRoYXQgb3ducyB0aGUgYXR0YWNobWVudC5cbiAgICogQHBhcmFtIGF0dGFjaG1lbnRJZCAtIElkZW50aWZpZXIgb2YgdGhlIGF0dGFjaG1lbnQgYmxvYiB0byBkb3dubG9hZC5cbiAgICogQHJldHVybnMgUHJvbWlzZSByZXNvbHZpbmcgdG8gYW4gYXR0YWNobWVudCBCbG9iLlxuICAgKiBAdGhyb3dzIEFwaUVycm9yIHdoZW4gdGhlIHNlcnZlciByZXNwb25kcyB3aXRoIGFuIGVycm9yLlxuICAgKiBAdGhyb3dzIE5ldHdvcmtFcnJvciB3aGVuIHRoZSByZXF1ZXN0IGZhaWxzIHRvIHJlYWNoIHRoZSBzZXJ2ZXIuXG4gICAqL1xuICBhc3luYyBnZXRBdHRhY2htZW50KGNhcmRJZDogc3RyaW5nLCBhdHRhY2htZW50SWQ6IHN0cmluZyk6IFByb21pc2U8QmxvYj4ge1xuICAgIGNvbnN0IHVybCA9IHRoaXMuYnVpbGRVcmwoYC9jYXJkcy8ke2NhcmRJZH0vYXR0YWNobWVudHMvJHthdHRhY2htZW50SWR9YCk7XG4gICAgcmV0dXJuIHRoaXMucmVxdWVzdChhc3luYyAoKSA9PiB7XG4gICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGZldGNoKHVybCwge1xuICAgICAgICBoZWFkZXJzOiB0aGlzLmdldEhlYWRlcnMoKSxcbiAgICAgICAgc2lnbmFsOiB0aGlzLmdldFRpbWVvdXRTaWduYWwoKVxuICAgICAgfSk7XG4gICAgICBpZiAoIXJlc3BvbnNlLm9rKSB0aHJvdyByZXNwb25zZTtcbiAgICAgIHJldHVybiByZXNwb25zZS5ibG9iKCk7XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogTGlzdHMgYXR0YWNobWVudHMgZm9yIGEgY2FyZC5cbiAgICpcbiAgICogQHBhcmFtIGNhcmRJZCAtIElkZW50aWZpZXIgb2YgdGhlIGNhcmQgd2hvc2UgYXR0YWNobWVudHMgc2hvdWxkIGJlIGxpc3RlZC5cbiAgICogQHJldHVybnMgUHJvbWlzZSByZXNvbHZpbmcgdG8gYXR0YWNobWVudCBtZXRhZGF0YS5cbiAgICogQHRocm93cyBBcGlFcnJvciB3aGVuIHRoZSBzZXJ2ZXIgcmVzcG9uZHMgd2l0aCBhbiBlcnJvci5cbiAgICogQHRocm93cyBOZXR3b3JrRXJyb3Igd2hlbiB0aGUgcmVxdWVzdCBmYWlscyB0byByZWFjaCB0aGUgc2VydmVyLlxuICAgKi9cbiAgYXN5bmMgbGlzdEF0dGFjaG1lbnRzKGNhcmRJZDogc3RyaW5nKTogUHJvbWlzZTxBdHRhY2htZW50UmVzcG9uc2VbXT4ge1xuICAgIGNvbnN0IHVybCA9IHRoaXMuYnVpbGRVcmwoYC9jYXJkcy8ke2NhcmRJZH0vYXR0YWNobWVudHNgKTtcbiAgICByZXR1cm4gdGhpcy5yZXF1ZXN0KCgpID0+IHRoaXMuZ2V0SHR0cENsaWVudCgpLmdldDxBdHRhY2htZW50UmVzcG9uc2VbXT4odXJsKSk7XG4gIH1cblxuICAvLyAtLS0gVGltZWxpbmUgT3BlcmF0aW9ucyAtLS1cblxuICAvKipcbiAgICogR2V0cyB0aW1lbGluZSBlbnRyaWVzIGZvciBhIGNhcmQgd2l0aCBvcHRpb25hbCBwYWdpbmF0aW9uLlxuICAgKlxuICAgKiBAcGFyYW0gY2FyZElkIC0gSWRlbnRpZmllciBvZiB0aGUgY2FyZCB3aG9zZSB0aW1lbGluZSBlbnRyaWVzIHNob3VsZCBiZSByZXR1cm5lZC5cbiAgICogQHBhcmFtIG9wdGlvbnMgLSBPcHRpb25hbCBwYWdpbmF0aW9uIGNvbnRyb2xzLlxuICAgKiBAcmV0dXJucyBQcm9taXNlIHJlc29sdmluZyB0byB0aW1lbGluZSBlbnRyaWVzLlxuICAgKiBAdGhyb3dzIEFwaUVycm9yIHdoZW4gdGhlIHNlcnZlciByZXNwb25kcyB3aXRoIGFuIGVycm9yLlxuICAgKiBAdGhyb3dzIE5ldHdvcmtFcnJvciB3aGVuIHRoZSByZXF1ZXN0IGZhaWxzIHRvIHJlYWNoIHRoZSBzZXJ2ZXIuXG4gICAqL1xuICBhc3luYyBnZXRUaW1lbGluZShjYXJkSWQ6IHN0cmluZywgb3B0aW9ucz86IFRpbWVsaW5lT3B0aW9ucyk6IFByb21pc2U8VGltZWxpbmVJdGVtW10+IHtcbiAgICBjb25zdCB1cmwgPSB0aGlzLmJ1aWxkVXJsKGAvY2FyZHMvJHtjYXJkSWR9L3RpbWVsaW5lYCwge1xuICAgICAgYmVmb3JlOiBvcHRpb25zPy5iZWZvcmUsXG4gICAgICBsaW1pdDogb3B0aW9ucz8ubGltaXRcbiAgICB9KTtcbiAgICByZXR1cm4gdGhpcy5yZXF1ZXN0KCgpID0+IHRoaXMuZ2V0SHR0cENsaWVudCgpLmdldDxUaW1lbGluZUl0ZW1bXT4odXJsKSk7XG4gIH1cblxuICAvLyAtLS0gUGxhbiBPcGVyYXRpb25zIC0tLVxuXG4gIC8qKlxuICAgKiBHZXRzIHRoZSBwbGFuIGRvY3VtZW50IGZvciBhIGNhcmQgYXMgbWFya2Rvd24uXG4gICAqXG4gICAqIEBwYXJhbSBjYXJkSWQgLSBJZGVudGlmaWVyIG9mIHRoZSBjYXJkIHdob3NlIHBsYW4gbWFya2Rvd24gc2hvdWxkIGJlIHJldHVybmVkLlxuICAgKiBAcmV0dXJucyBQcm9taXNlIHJlc29sdmluZyB0byBwbGFuIG1hcmtkb3duLlxuICAgKiBAdGhyb3dzIEFwaUVycm9yIHdoZW4gdGhlIHNlcnZlciByZXNwb25kcyB3aXRoIGFuIGVycm9yLlxuICAgKiBAdGhyb3dzIE5ldHdvcmtFcnJvciB3aGVuIHRoZSByZXF1ZXN0IGZhaWxzIHRvIHJlYWNoIHRoZSBzZXJ2ZXIuXG4gICAqL1xuICBhc3luYyBnZXRQbGFuKGNhcmRJZDogc3RyaW5nKTogUHJvbWlzZTxzdHJpbmc+IHtcbiAgICBjb25zdCB1cmwgPSB0aGlzLmJ1aWxkVXJsKGAvY2FyZHMvJHtjYXJkSWR9L3BsYW5gKTtcbiAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IHRoaXMucmVxdWVzdCgoKSA9PiB0aGlzLmdldEh0dHBDbGllbnQoKS5nZXQ8eyBjb250ZW50OiBzdHJpbmcgfT4odXJsKSk7XG4gICAgcmV0dXJuIHJlc3BvbnNlLmNvbnRlbnQ7XG4gIH1cblxuICAvKipcbiAgICogVXBkYXRlcyB0aGUgcGxhbiBkb2N1bWVudCBmb3IgYSBjYXJkLlxuICAgKlxuICAgKiBAcGFyYW0gY2FyZElkIC0gSWRlbnRpZmllciBvZiB0aGUgY2FyZCB3aG9zZSBwbGFuIG1hcmtkb3duIHNob3VsZCBiZSB1cGRhdGVkLlxuICAgKiBAcGFyYW0gY29udGVudCAtIFBsYW4gbWFya2Rvd24gY29udGVudC5cbiAgICogQHJldHVybnMgUHJvbWlzZSByZXNvbHZpbmcgd2hlbiB0aGUgcGxhbiBpcyBzYXZlZC5cbiAgICogQHRocm93cyBBcGlFcnJvciB3aGVuIHRoZSBzZXJ2ZXIgcmVqZWN0cyB0aGUgdXBkYXRlLlxuICAgKiBAdGhyb3dzIE5ldHdvcmtFcnJvciB3aGVuIHRoZSByZXF1ZXN0IGZhaWxzIHRvIHJlYWNoIHRoZSBzZXJ2ZXIuXG4gICAqIEBkZXByZWNhdGVkIFVzZSBkaXJlY3QgZ2l0IG9wZXJhdGlvbnMgaW5zdGVhZC4gVGhpcyBlbmRwb2ludCB3aWxsIGJlIHJlbW92ZWQuXG4gICAqL1xuICBhc3luYyB1cGRhdGVQbGFuKGNhcmRJZDogc3RyaW5nLCBjb250ZW50OiBzdHJpbmcpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zdCB1cmwgPSB0aGlzLmJ1aWxkVXJsKGAvY2FyZHMvJHtjYXJkSWR9L3BsYW5gKTtcbiAgICByZXR1cm4gdGhpcy5yZXF1ZXN0KCgpID0+IHRoaXMuZ2V0SHR0cENsaWVudCgpLnB1dDx2b2lkPih1cmwsIGNvbnRlbnQpKTtcbiAgfVxuXG4gIC8vIC0tLSBHYXRlIE9wZXJhdGlvbnMgLS0tXG5cbiAgLyoqXG4gICAqIEFwcHJvdmVzIGEgZ2F0ZSBmb3IgYSBjYXJkLlxuICAgKlxuICAgKiBAcGFyYW0gY2FyZElkIC0gSWRlbnRpZmllciBvZiB0aGUgY2FyZCB3aG9zZSBnYXRlIHN0YXRlIHNob3VsZCBiZSB1cGRhdGVkLlxuICAgKiBAcGFyYW0gZ2F0ZU5hbWUgLSBHYXRlIG5hbWUgdG8gYXBwcm92ZS5cbiAgICogQHJldHVybnMgUHJvbWlzZSByZXNvbHZpbmcgdG8gZ2F0ZSBhcHByb3ZhbCBtZXRhZGF0YS5cbiAgICogQHRocm93cyBBcGlFcnJvciB3aGVuIHRoZSBzZXJ2ZXIgcmVqZWN0cyB0aGUgYXBwcm92YWwuXG4gICAqIEB0aHJvd3MgTmV0d29ya0Vycm9yIHdoZW4gdGhlIHJlcXVlc3QgZmFpbHMgdG8gcmVhY2ggdGhlIHNlcnZlci5cbiAgICogQGRlcHJlY2F0ZWQgVXNlIGRpcmVjdCBnaXQgb3BlcmF0aW9ucyBpbnN0ZWFkLiBUaGlzIGVuZHBvaW50IHdpbGwgYmUgcmVtb3ZlZC5cbiAgICovXG4gIGFzeW5jIGFwcHJvdmVHYXRlKGNhcmRJZDogc3RyaW5nLCBnYXRlTmFtZTogJ3BsYW4nIHwgJ21lcmdlUmVxdWVzdCcpOiBQcm9taXNlPEdhdGVBcHByb3ZhbFJlc3BvbnNlPiB7XG4gICAgY29uc3QgdXJsID0gdGhpcy5idWlsZFVybChgL2NhcmRzLyR7Y2FyZElkfS9nYXRlcy8ke2dhdGVOYW1lfS9hcHByb3ZlYCk7XG4gICAgcmV0dXJuIHRoaXMucmVxdWVzdCgoKSA9PiB0aGlzLmdldEh0dHBDbGllbnQoKS5wb3N0PEdhdGVBcHByb3ZhbFJlc3BvbnNlPih1cmwsIHVuZGVmaW5lZCkpO1xuICB9XG5cbiAgLy8gLS0tIENvbW1pdCBPcGVyYXRpb25zIC0tLVxuXG4gIC8qKlxuICAgKiBHZXRzIGFsbCBjb21taXRzIGFzc29jaWF0ZWQgd2l0aCBhIGNhcmQuXG4gICAqXG4gICAqIEBwYXJhbSBjYXJkSWQgLSBJZGVudGlmaWVyIG9mIHRoZSBjYXJkIHdob3NlIGNvbW1pdHMgc2hvdWxkIGJlIHJldHVybmVkLlxuICAgKiBAcmV0dXJucyBQcm9taXNlIHJlc29sdmluZyB0byBjb21taXQgbWV0YWRhdGEuXG4gICAqIEB0aHJvd3MgQXBpRXJyb3Igd2hlbiB0aGUgc2VydmVyIHJlc3BvbmRzIHdpdGggYW4gZXJyb3IuXG4gICAqIEB0aHJvd3MgTmV0d29ya0Vycm9yIHdoZW4gdGhlIHJlcXVlc3QgZmFpbHMgdG8gcmVhY2ggdGhlIHNlcnZlci5cbiAgICovXG4gIGFzeW5jIGdldENvbW1pdHMoY2FyZElkOiBzdHJpbmcpOiBQcm9taXNlPENvbW1pdEluZm9bXT4ge1xuICAgIGNvbnN0IHVybCA9IHRoaXMuYnVpbGRVcmwoYC9jYXJkcy8ke2NhcmRJZH0vY29tbWl0c2ApO1xuICAgIHJldHVybiB0aGlzLnJlcXVlc3QoKCkgPT4gdGhpcy5nZXRIdHRwQ2xpZW50KCkuZ2V0PENvbW1pdEluZm9bXT4odXJsKSk7XG4gIH1cblxuICAvKipcbiAgICogQWRkcyBhIGNvbW1pdCB0byBhIGNhcmQuXG4gICAqXG4gICAqIEBwYXJhbSBjYXJkSWQgLSBJZGVudGlmaWVyIG9mIHRoZSBjYXJkIHRvIGFzc29jaWF0ZSB3aXRoIHRoZSBjb21taXQgU0hBLlxuICAgKiBAcGFyYW0gc2hhIC0gR2l0IGNvbW1pdCBzaGEuXG4gICAqIEByZXR1cm5zIFByb21pc2UgcmVzb2x2aW5nIHRvIGNvbW1pdCBtZXRhZGF0YS5cbiAgICogQHRocm93cyBBcGlFcnJvciB3aGVuIHRoZSBzZXJ2ZXIgcmVqZWN0cyB0aGUgdXBkYXRlLlxuICAgKiBAdGhyb3dzIE5ldHdvcmtFcnJvciB3aGVuIHRoZSByZXF1ZXN0IGZhaWxzIHRvIHJlYWNoIHRoZSBzZXJ2ZXIuXG4gICAqL1xuICBhc3luYyBhZGRDb21taXQoY2FyZElkOiBzdHJpbmcsIHNoYTogc3RyaW5nKTogUHJvbWlzZTxDb21taXRJbmZvPiB7XG4gICAgY29uc3QgdXJsID0gdGhpcy5idWlsZFVybChgL2NhcmRzLyR7Y2FyZElkfS9jb21taXRzYCk7XG4gICAgcmV0dXJuIHRoaXMucmVxdWVzdCgoKSA9PiB0aGlzLmdldEh0dHBDbGllbnQoKS5wb3N0PENvbW1pdEluZm8+KHVybCwgeyBzaGEgfSkpO1xuICB9XG5cbiAgLyoqXG4gICAqIFJlbW92ZXMgYSBjb21taXQgZnJvbSBhIGNhcmQuXG4gICAqXG4gICAqIEBwYXJhbSBjYXJkSWQgLSBJZGVudGlmaWVyIG9mIHRoZSBjYXJkIHRvIGRldGFjaCBmcm9tIHRoZSBjb21taXQgU0hBLlxuICAgKiBAcGFyYW0gc2hhIC0gR2l0IGNvbW1pdCBzaGEuXG4gICAqIEBwYXJhbSBvcHRpb25zIC0gT3B0aW9uYWwgcGFyYW1ldGVycy5cbiAgICogQHBhcmFtIG9wdGlvbnMuc2Vzc2lvbklkIC0gQ2xhdWRlIENvZGUgc2Vzc2lvbiBJRCBmb3J3YXJkZWQgYXMgYFgtQ2FyZHMtU2Vzc2lvbi1JZGAgaGVhZGVyIHNvIHRoZSBjYXJkIHJlcG8gcG9zdC1jb21taXQgaG9vayBjYW4gYXR0cmlidXRlIHRoZSBjb21taXQuXG4gICAqIEByZXR1cm5zIFByb21pc2UgcmVzb2x2aW5nIHdoZW4gcmVtb3ZhbCBpcyBjb21wbGV0ZS5cbiAgICogQHRocm93cyBBcGlFcnJvciB3aGVuIHRoZSBzZXJ2ZXIgcmVqZWN0cyB0aGUgdXBkYXRlLlxuICAgKiBAdGhyb3dzIE5ldHdvcmtFcnJvciB3aGVuIHRoZSByZXF1ZXN0IGZhaWxzIHRvIHJlYWNoIHRoZSBzZXJ2ZXIuXG4gICAqL1xuICBhc3luYyByZW1vdmVDb21taXQoY2FyZElkOiBzdHJpbmcsIHNoYTogc3RyaW5nLCBvcHRpb25zPzogeyBzZXNzaW9uSWQ/OiBzdHJpbmcgfSk6IFByb21pc2U8dm9pZD4ge1xuICAgIGNvbnN0IHVybCA9IHRoaXMuYnVpbGRVcmwoYC9jYXJkcy8ke2NhcmRJZH0vY29tbWl0cy8ke3NoYX1gKTtcbiAgICBjb25zdCBoZWFkZXJzOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ID0ge307XG4gICAgaWYgKG9wdGlvbnM/LnNlc3Npb25JZCkge1xuICAgICAgaGVhZGVyc1snWC1DYXJkcy1TZXNzaW9uLUlkJ10gPSBvcHRpb25zLnNlc3Npb25JZDtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMucmVxdWVzdCgoKSA9PiB0aGlzLmdldEh0dHBDbGllbnQoKS5kZWxldGUodXJsLCB7IGhlYWRlcnMgfSkpO1xuICB9XG5cbiAgLy8gLS0tIEJyYW5jaCBPcGVyYXRpb25zIC0tLVxuXG4gIC8qKlxuICAgKiBHZXRzIGFsbCBicmFuY2hlcyB0cmFja2VkIG9uIGEgY2FyZC5cbiAgICpcbiAgICogQHBhcmFtIGNhcmRJZCAtIFVuaXF1ZSBpZGVudGlmaWVyIG9mIHRoZSBjYXJkIHdob3NlIGJyYW5jaGVzIHRvIHJldHJpZXZlLlxuICAgKiBAcGFyYW0gb3B0aW9ucyAtIE9wdGlvbmFsIHF1ZXJ5IHBhcmFtZXRlcnMuXG4gICAqIEBwYXJhbSBvcHRpb25zLndvcmtzcGFjZVBhdGggLSBXb3Jrc3BhY2UgcGF0aCBmb3IgY29tcHV0aW5nIGlzTWVyZ2VkIGFuZCBjb21taXQgY29udGFpbm1lbnQuXG4gICAqIEByZXR1cm5zIFByb21pc2UgcmVzb2x2aW5nIHRvIGJyYW5jaGVzIHJlc3BvbnNlLlxuICAgKi9cbiAgYXN5bmMgZ2V0QnJhbmNoZXMoY2FyZElkOiBzdHJpbmcsIG9wdGlvbnM/OiB7IHdvcmtzcGFjZVBhdGg/OiBzdHJpbmcgfSk6IFByb21pc2U8QnJhbmNoZXNSZXNwb25zZT4ge1xuICAgIGNvbnN0IHVybCA9IHRoaXMuYnVpbGRVcmwoYC9jYXJkcy8ke2NhcmRJZH0vYnJhbmNoZXNgLCB7XG4gICAgICB3b3Jrc3BhY2VQYXRoOiBvcHRpb25zPy53b3Jrc3BhY2VQYXRoXG4gICAgfSk7XG4gICAgcmV0dXJuIHRoaXMucmVxdWVzdCgoKSA9PiB0aGlzLmdldEh0dHBDbGllbnQoKS5nZXQ8QnJhbmNoZXNSZXNwb25zZT4odXJsKSk7XG4gIH1cblxuICAvKipcbiAgICogQWRkcyBhIGJyYW5jaCB0byBhIGNhcmQuXG4gICAqXG4gICAqIEBwYXJhbSBjYXJkSWQgLSBVbmlxdWUgaWRlbnRpZmllciBvZiB0aGUgY2FyZCB0byBhZGQgdGhlIGJyYW5jaCB0by5cbiAgICogQHBhcmFtIGRhdGEgLSBCcmFuY2ggZGF0YSBpbmNsdWRpbmcgbmFtZSBhbmQgb3B0aW9uYWwgd29ya3RyZWUgcGF0aC5cbiAgICogQHBhcmFtIG9wdGlvbnMgLSBPcHRpb25hbCBwYXJhbWV0ZXJzLlxuICAgKiBAcGFyYW0gb3B0aW9ucy5zZXNzaW9uSWQgLSBDbGF1ZGUgQ29kZSBzZXNzaW9uIElEIGZvcndhcmRlZCBhcyBgWC1DYXJkcy1TZXNzaW9uLUlkYCBoZWFkZXIgc28gdGhlIGNhcmQgcmVwbyBwb3N0LWNvbW1pdCBob29rIGNhbiBhdHRyaWJ1dGUgdGhlIGNvbW1pdC5cbiAgICogQHJldHVybnMgUHJvbWlzZSByZXNvbHZpbmcgd2hlbiB0aGUgYnJhbmNoIGlzIGFkZGVkLlxuICAgKi9cbiAgYXN5bmMgYWRkQnJhbmNoKGNhcmRJZDogc3RyaW5nLCBkYXRhOiBBZGRCcmFuY2hSZXF1ZXN0LCBvcHRpb25zPzogeyBzZXNzaW9uSWQ/OiBzdHJpbmcgfSk6IFByb21pc2U8dm9pZD4ge1xuICAgIGNvbnN0IHVybCA9IHRoaXMuYnVpbGRVcmwoYC9jYXJkcy8ke2NhcmRJZH0vYnJhbmNoZXNgKTtcbiAgICBjb25zdCBoZWFkZXJzOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ID0ge307XG4gICAgaWYgKG9wdGlvbnM/LnNlc3Npb25JZCkge1xuICAgICAgaGVhZGVyc1snWC1DYXJkcy1TZXNzaW9uLUlkJ10gPSBvcHRpb25zLnNlc3Npb25JZDtcbiAgICB9XG4gICAgYXdhaXQgdGhpcy5yZXF1ZXN0KCgpID0+IHRoaXMuZ2V0SHR0cENsaWVudCgpLnBvc3Q8dW5rbm93bj4odXJsLCBkYXRhLCB7IGhlYWRlcnMgfSkpO1xuICB9XG5cbiAgLyoqXG4gICAqIFJlbW92ZXMgYSBicmFuY2ggZnJvbSBhIGNhcmQuXG4gICAqXG4gICAqIEBwYXJhbSBjYXJkSWQgLSBVbmlxdWUgaWRlbnRpZmllciBvZiB0aGUgY2FyZCB0byByZW1vdmUgdGhlIGJyYW5jaCBmcm9tLlxuICAgKiBAcGFyYW0gbmFtZSAtIEJyYW5jaCBuYW1lIHRvIHJlbW92ZSAod2lsbCBiZSBVUkwtZW5jb2RlZCkuXG4gICAqIEBwYXJhbSBvcHRpb25zIC0gT3B0aW9uYWwgcGFyYW1ldGVycy5cbiAgICogQHBhcmFtIG9wdGlvbnMuc2Vzc2lvbklkIC0gQ2xhdWRlIENvZGUgc2Vzc2lvbiBJRCBmb3J3YXJkZWQgYXMgYFgtQ2FyZHMtU2Vzc2lvbi1JZGAgaGVhZGVyIHNvIHRoZSBjYXJkIHJlcG8gcG9zdC1jb21taXQgaG9vayBjYW4gYXR0cmlidXRlIHRoZSBjb21taXQuXG4gICAqIEByZXR1cm5zIFByb21pc2UgcmVzb2x2aW5nIHdoZW4gdGhlIGJyYW5jaCBpcyByZW1vdmVkLlxuICAgKi9cbiAgYXN5bmMgcmVtb3ZlQnJhbmNoKGNhcmRJZDogc3RyaW5nLCBuYW1lOiBzdHJpbmcsIG9wdGlvbnM/OiB7IHNlc3Npb25JZD86IHN0cmluZyB9KTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc3QgdXJsID0gdGhpcy5idWlsZFVybChgL2NhcmRzLyR7Y2FyZElkfS9icmFuY2hlcy8ke2VuY29kZVVSSUNvbXBvbmVudChuYW1lKX1gKTtcbiAgICBjb25zdCBoZWFkZXJzOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ID0ge307XG4gICAgaWYgKG9wdGlvbnM/LnNlc3Npb25JZCkge1xuICAgICAgaGVhZGVyc1snWC1DYXJkcy1TZXNzaW9uLUlkJ10gPSBvcHRpb25zLnNlc3Npb25JZDtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMucmVxdWVzdCgoKSA9PiB0aGlzLmdldEh0dHBDbGllbnQoKS5kZWxldGUodXJsLCB7IGhlYWRlcnMgfSkpO1xuICB9XG5cbiAgLy8gLS0tIFRhZyBPcGVyYXRpb25zIC0tLVxuXG4gIC8qKlxuICAgKiBHZXRzIGFsbCBhdmFpbGFibGUgdGFncy5cbiAgICpcbiAgICogQHJldHVybnMgUHJvbWlzZSByZXNvbHZpbmcgdG8gdGFnIHN0cmluZ3MuXG4gICAqIEB0aHJvd3MgQXBpRXJyb3Igd2hlbiB0aGUgc2VydmVyIHJlc3BvbmRzIHdpdGggYW4gZXJyb3IuXG4gICAqIEB0aHJvd3MgTmV0d29ya0Vycm9yIHdoZW4gdGhlIHJlcXVlc3QgZmFpbHMgdG8gcmVhY2ggdGhlIHNlcnZlci5cbiAgICovXG4gIGFzeW5jIGdldFRhZ3MoKTogUHJvbWlzZTxzdHJpbmdbXT4ge1xuICAgIGNvbnN0IHVybCA9IHRoaXMuYnVpbGRVcmwoJy90YWdzJywge1xuICAgICAgd29ya3NwYWNlUGF0aDogdGhpcy5vcHRpb25zLndvcmtzcGFjZVBhdGhcbiAgICB9KTtcbiAgICByZXR1cm4gdGhpcy5yZXF1ZXN0KCgpID0+IHRoaXMuZ2V0SHR0cENsaWVudCgpLmdldDxzdHJpbmdbXT4odXJsKSk7XG4gIH1cblxuICAvLyAtLS0gRW52aXJvbm1lbnQgT3BlcmF0aW9ucyAtLS1cblxuICAvKipcbiAgICogRmV0Y2hlcyBhdmFpbGFibGUgYWdlbnQgZW52aXJvbm1lbnRzLlxuICAgKlxuICAgKiBAcmV0dXJucyBQcm9taXNlIHJlc29sdmluZyB0byBlbnZpcm9ubWVudCBtZXRhZGF0YS5cbiAgICogQHRocm93cyBBcGlFcnJvciB3aGVuIHRoZSBzZXJ2ZXIgcmVzcG9uZHMgd2l0aCBhbiBlcnJvci5cbiAgICogQHRocm93cyBOZXR3b3JrRXJyb3Igd2hlbiB0aGUgcmVxdWVzdCBmYWlscyB0byByZWFjaCB0aGUgc2VydmVyLlxuICAgKi9cbiAgYXN5bmMgZ2V0RW52aXJvbm1lbnRzKCk6IFByb21pc2U8QXJyYXk8eyBuYW1lOiBzdHJpbmc7IGRlc2NyaXB0aW9uPzogc3RyaW5nIH0+PiB7XG4gICAgY29uc3QgdXJsID0gdGhpcy5idWlsZFVybCgnL2Vudmlyb25tZW50cycpO1xuICAgIHJldHVybiB0aGlzLnJlcXVlc3QoKCkgPT4gdGhpcy5nZXRIdHRwQ2xpZW50KCkuZ2V0PEFycmF5PHsgbmFtZTogc3RyaW5nOyBkZXNjcmlwdGlvbj86IHN0cmluZyB9Pj4odXJsKSk7XG4gIH1cblxuICAvLyAtLS0gVHlwZWQgRmlsZSBPcGVyYXRpb25zIC0tLVxuXG4gIC8qKlxuICAgKiBTdWJtaXRzIGFuIGFkYXB0aXZlIGNhcmQgYWN0aW9uIGJ5IHdyaXRpbmcgYW4gYGFkYXB0aXZlLWNhcmQtc3VibWlzc2lvbmAgdHlwZWQgZmlsZS5cbiAgICpcbiAgICogQHBhcmFtIGNhcmRJZCAtIFRoZSBjYXJkIGNvbnRhaW5pbmcgdGhlIGFkYXB0aXZlIGNhcmQuXG4gICAqIEBwYXJhbSBhY3Rpb25JZCAtIFRoZSBhY3Rpb24gSUQgZnJvbSB0aGUgYWRhcHRpdmUgY2FyZCBzdWJtaXQgYWN0aW9uLlxuICAgKiBAcGFyYW0gZGF0YSAtIFRoZSBmb3JtIGRhdGEgY29sbGVjdGVkIGJ5IHRoZSBhZGFwdGl2ZSBjYXJkLlxuICAgKiBAcmV0dXJucyBQcm9taXNlIHJlc29sdmluZyB3aGVuIHRoZSBzdWJtaXNzaW9uIGlzIHBlcnNpc3RlZC5cbiAgICogQHRocm93cyBBcGlFcnJvciB3aGVuIHRoZSBzZXJ2ZXIgcmVqZWN0cyB0aGUgc3VibWlzc2lvbiAoZS5nLiB2YWxpZGF0aW9uIGZhaWx1cmUpLlxuICAgKiBAdGhyb3dzIE5ldHdvcmtFcnJvciB3aGVuIHRoZSByZXF1ZXN0IGZhaWxzIHRvIHJlYWNoIHRoZSBzZXJ2ZXIuXG4gICAqL1xuICBhc3luYyBzdWJtaXRDYXJkQWN0aW9uKGNhcmRJZDogc3RyaW5nLCBhY3Rpb25JZDogc3RyaW5nLCBkYXRhOiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPik6IFByb21pc2U8dm9pZD4ge1xuICAgIGNvbnN0IGZpbGVOYW1lID0gYCR7YWN0aW9uSWR9LSR7RGF0ZS5ub3coKX0uanNvbmA7XG4gICAgY29uc3QgdXJsID0gdGhpcy5idWlsZFVybChgL2NhcmRzLyR7Y2FyZElkfS9hZGFwdGl2ZS1jYXJkLXN1Ym1pc3Npb24vJHtlbmNvZGVVUklDb21wb25lbnQoZmlsZU5hbWUpfWApO1xuICAgIGNvbnN0IGJvZHkgPSB7IGNhcmRJZCwgYWN0aW9uSWQsIGRhdGEgfTtcbiAgICBhd2FpdCB0aGlzLnJlcXVlc3QoKCkgPT4gdGhpcy5nZXRIdHRwQ2xpZW50KCkucHV0PHVua25vd24+KHVybCwgYm9keSkpO1xuICB9XG5cbiAgLy8gLS0tIFR5cGUgU2NoZW1hIE9wZXJhdGlvbnMgLS0tXG5cbiAgLyoqXG4gICAqIEdldHMgdHlwZSBzY2hlbWFzIGFuZCBkZXNjcmlwdGlvbnMgZm9yIGEgY2FyZCdzIGVudmlyb25tZW50LlxuICAgKlxuICAgKiBSZXR1cm5zIG1ldGFkYXRhIGFib3V0IGVhY2ggcmVnaXN0ZXJlZCB0eXBlIGluIHRoZSBjYXJkJ3MgZW52aXJvbm1lbnQsXG4gICAqIGluY2x1ZGluZyB2ZXJzaW9uLCBzY2hlbWEsIGFuZCBkZXNjcmlwdGlvbi4gQ29tbWFuZCBkZXRhaWxzIGFyZSBleGNsdWRlZC5cbiAgICpcbiAgICogQHBhcmFtIGNhcmRJZCAtIElkZW50aWZpZXIgb2YgdGhlIGNhcmQgd2hvc2UgdHlwZSBzY2hlbWEgbWV0YWRhdGEgc2hvdWxkIGJlIGZldGNoZWQuXG4gICAqIEByZXR1cm5zIFByb21pc2UgcmVzb2x2aW5nIHRvIHR5cGUgc2NoZW1hIGluZm9ybWF0aW9uLlxuICAgKiBAdGhyb3dzIEFwaUVycm9yIHdoZW4gdGhlIHNlcnZlciByZXNwb25kcyB3aXRoIGFuIGVycm9yLlxuICAgKiBAdGhyb3dzIE5ldHdvcmtFcnJvciB3aGVuIHRoZSByZXF1ZXN0IGZhaWxzIHRvIHJlYWNoIHRoZSBzZXJ2ZXIuXG4gICAqL1xuICBhc3luYyBnZXRUeXBlU2NoZW1hcyhjYXJkSWQ6IHN0cmluZyk6IFByb21pc2U8VHlwZVNjaGVtYXNSZXNwb25zZT4ge1xuICAgIGNvbnN0IHVybCA9IHRoaXMuYnVpbGRVcmwoYC9jYXJkcy8ke2NhcmRJZH0vc2NoZW1hYCk7XG4gICAgcmV0dXJuIHRoaXMucmVxdWVzdCgoKSA9PiB0aGlzLmdldEh0dHBDbGllbnQoKS5nZXQ8VHlwZVNjaGVtYXNSZXNwb25zZT4odXJsKSk7XG4gIH1cblxuICAvLyAtLS0gU3RyZWFtIE9wZXJhdGlvbnMgLS0tXG5cbiAgLyoqXG4gICAqIExpc3RzIGFsbCBzdHJlYW1zIGF0dGFjaGVkIHRvIGEgY2FyZCwgc29ydGVkIGJ5IGNyZWF0aW9uIHRpbWUuXG4gICAqXG4gICAqIEBwYXJhbSBjYXJkSWQgLSBDYXJkIElEIHRvIHF1ZXJ5LlxuICAgKiBAcmV0dXJucyBTdHJlYW0gbWV0YWRhdGEgYXJyYXkgKG1heSBiZSBlbXB0eSkuXG4gICAqIEB0aHJvd3MgQXBpRXJyb3Igd2hlbiB0aGUgc2VydmVyIHJlc3BvbmRzIHdpdGggYW4gZXJyb3IgKGUuZy4sIDQwNCBmb3IgdW5rbm93biBjYXJkKS5cbiAgICogQHRocm93cyBOZXR3b3JrRXJyb3Igd2hlbiB0aGUgcmVxdWVzdCBmYWlscyB0byByZWFjaCB0aGUgc2VydmVyLlxuICAgKi9cbiAgYXN5bmMgbGlzdFN0cmVhbXMoY2FyZElkOiBzdHJpbmcpOiBQcm9taXNlPFN0cmVhbU1ldGFbXT4ge1xuICAgIGNvbnN0IHVybCA9IHRoaXMuYnVpbGRVcmwoYC9jYXJkcy8ke2NhcmRJZH0vc3RyZWFtc2ApO1xuICAgIHJldHVybiB0aGlzLnJlcXVlc3QoKCkgPT4gdGhpcy5nZXRIdHRwQ2xpZW50KCkuZ2V0PFN0cmVhbU1ldGFbXT4odXJsKSk7XG4gIH1cblxuICAvKipcbiAgICogUmV0cmlldmVzIGEgc3RyZWFtJ3MgbWV0YWRhdGEgYW5kIGFsbCByYXcgbGluZXMuXG4gICAqXG4gICAqIFRoZSBgc3RyZWFtVHlwZWAgYW5kIGBmaWxlbmFtZWAgYXJlIFVSSS1lbmNvZGVkIGF1dG9tYXRpY2FsbHkuIEZvciBjb21wbGV0ZWRcbiAgICogc3RyZWFtcyB0aGUgcmV0dXJuZWQgYGxpbmVzYCBhcnJheSBpcyB0aGUgZnVsbCBjb250ZW50OyBmb3IgYWN0aXZlIHN0cmVhbXMgaXRcbiAgICogaXMgYSBzbmFwc2hvdCB0aGF0IG1heSBncm93IHdoaWxlIHRoZSBjYWxsZXIgcHJvY2Vzc2VzIGl0LlxuICAgKlxuICAgKiBAcGFyYW0gY2FyZElkIC0gSWRlbnRpZmllciBvZiB0aGUgY2FyZCB0aGF0IG93bnMgdGhlIHJlcXVlc3RlZCBzdHJlYW0uXG4gICAqIEBwYXJhbSBzdHJlYW1UeXBlIC0gU3RyZWFtIHR5cGUga2V5IChlLmcuLCBgXCJjbGF1ZGUtY29kZS1zZXNzaW9uXCJgKS5cbiAgICogQHBhcmFtIGZpbGVuYW1lIC0gU3RyZWFtIGZpbGVuYW1lIChlLmcuLCBgXCJzZXNzaW9uLmxvZ1wiYCkuXG4gICAqIEByZXR1cm5zIE1ldGFkYXRhIGFuZCBjb250ZW50IGxpbmVzLlxuICAgKiBAdGhyb3dzIEFwaUVycm9yIG9uIDQwNCAodW5rbm93biBjYXJkIG9yIHN0cmVhbSkgb3Igb3RoZXIgc2VydmVyIGVycm9ycy5cbiAgICogQHRocm93cyBOZXR3b3JrRXJyb3Igd2hlbiB0aGUgcmVxdWVzdCBmYWlscyB0byByZWFjaCB0aGUgc2VydmVyLlxuICAgKi9cbiAgYXN5bmMgZ2V0U3RyZWFtKFxuICAgIGNhcmRJZDogc3RyaW5nLFxuICAgIHN0cmVhbVR5cGU6IHN0cmluZyxcbiAgICBmaWxlbmFtZTogc3RyaW5nXG4gICk6IFByb21pc2U8eyBtZXRhOiBTdHJlYW1NZXRhOyBsaW5lczogc3RyaW5nW10gfT4ge1xuICAgIGNvbnN0IHVybCA9IHRoaXMuYnVpbGRVcmwoXG4gICAgICBgL2NhcmRzLyR7Y2FyZElkfS9zdHJlYW1zLyR7ZW5jb2RlVVJJQ29tcG9uZW50KHN0cmVhbVR5cGUpfS8ke2VuY29kZVVSSUNvbXBvbmVudChmaWxlbmFtZSl9YFxuICAgICk7XG4gICAgcmV0dXJuIHRoaXMucmVxdWVzdCgoKSA9PiB0aGlzLmdldEh0dHBDbGllbnQoKS5nZXQ8eyBtZXRhOiBTdHJlYW1NZXRhOyBsaW5lczogc3RyaW5nW10gfT4odXJsKSk7XG4gIH1cblxuICAvKipcbiAgICogT3BlbnMgYSBjaHVua2VkIEpTT05MIHN0cmVhbSB0byB0aGUgc2VydmVyIGFuZCByZXR1cm5zIGEgd3JpdGVyLlxuICAgKlxuICAgKiBUaGUgd3JpdGVyIHNlbmRzIGVhY2ggbGluZSBpbiByZWFsLXRpbWUgb3ZlciBhIHNpbmdsZSBIVFRQIFBPU1QgdXNpbmcgYVxuICAgKiBgUmVhZGFibGVTdHJlYW1gIGJvZHkuIENhbGwge0BsaW5rIFN0cmVhbVdyaXRlci5jbG9zZX0gd2hlbiB0aGUgcHJvZHVjZXJcbiAgICogaXMgZmluaXNoZWQgdG8gZW5kIHRoZSByZXF1ZXN0IGFuZCByZXRyaWV2ZSB0aGUgc2VydmVyJ3Mgc3VtbWFyeS5cbiAgICpcbiAgICogQHBhcmFtIGNhcmRJZCAtIENhcmQgSUQgdG8gYXR0YWNoIHRoZSBzdHJlYW0gdG8uXG4gICAqIEBwYXJhbSBzdHJlYW1UeXBlIC0gU3RyZWFtIHR5cGUga2V5IGZyb20gc2V0dGluZ3MuanNvbiAoZS5nLiwgYFwiY2xhdWRlLWNvZGUtc2Vzc2lvblwiYCkuXG4gICAqIEBwYXJhbSBmaWxlbmFtZSAtIFN0cmVhbSBmaWxlbmFtZSAoZS5nLiwgYFwic2Vzc2lvbi1hYmMuanNvbmxcImApLlxuICAgKiBAcGFyYW0gb3B0aW9ucyAtIE9wdGlvbmFsIHRpdGxlIGFuZCBzZXNzaW9uIElEIG1ldGFkYXRhLlxuICAgKiBAcmV0dXJucyBBIHtAbGluayBTdHJlYW1Xcml0ZXJ9IGZvciBwdXNoaW5nIGxpbmVzIGFuZCBjbG9zaW5nIHRoZSBzdHJlYW0uXG4gICAqXG4gICAqIEBleGFtcGxlXG4gICAqIGBgYHR5cGVzY3JpcHRcbiAgICogY29uc3Qgc3RyZWFtID0gY2xpZW50Lm9wZW5TdHJlYW0oY2FyZElkLCAnY2xhdWRlLWNvZGUtc2Vzc2lvbicsICdydW4uanNvbmwnKTtcbiAgICogc3RyZWFtLndyaXRlKEpTT04uc3RyaW5naWZ5KHsgdHlwZTogJ2luaXQnIH0pKTtcbiAgICogc3RyZWFtLndyaXRlKEpTT04uc3RyaW5naWZ5KHsgdHlwZTogJ3Jlc3VsdCcgfSkpO1xuICAgKiBjb25zdCByZXN1bHQgPSBhd2FpdCBzdHJlYW0uY2xvc2UoKTtcbiAgICogYGBgXG4gICAqL1xuICBvcGVuU3RyZWFtKGNhcmRJZDogc3RyaW5nLCBzdHJlYW1UeXBlOiBzdHJpbmcsIGZpbGVuYW1lOiBzdHJpbmcsIG9wdGlvbnM/OiBTdHJlYW1Xcml0ZXJPcHRpb25zKTogU3RyZWFtV3JpdGVyIHtcbiAgICBjb25zdCBlbmNvZGVyID0gbmV3IFRleHRFbmNvZGVyKCk7XG4gICAgbGV0IGNvbnRyb2xsZXIhOiBSZWFkYWJsZVN0cmVhbURlZmF1bHRDb250cm9sbGVyPFVpbnQ4QXJyYXk+O1xuXG4gICAgY29uc3QgYm9keSA9IG5ldyBSZWFkYWJsZVN0cmVhbTxVaW50OEFycmF5Pih7XG4gICAgICBzdGFydChjKSB7XG4gICAgICAgIGNvbnRyb2xsZXIgPSBjO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgY29uc3QgdXJsID0gdGhpcy5idWlsZFVybChcbiAgICAgIGAvY2FyZHMvJHtjYXJkSWR9L3N0cmVhbXMvJHtlbmNvZGVVUklDb21wb25lbnQoc3RyZWFtVHlwZSl9LyR7ZW5jb2RlVVJJQ29tcG9uZW50KGZpbGVuYW1lKX1gXG4gICAgKTtcblxuICAgIGNvbnN0IGhlYWRlcnM6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4gPSB7XG4gICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL3gtbmRqc29uJ1xuICAgIH07XG4gICAgaWYgKHRoaXMub3B0aW9ucy5hY2Nlc3NUb2tlbikge1xuICAgICAgaGVhZGVyc1snQXV0aG9yaXphdGlvbiddID0gYEJlYXJlciAke3RoaXMub3B0aW9ucy5hY2Nlc3NUb2tlbn1gO1xuICAgIH1cbiAgICBpZiAob3B0aW9ucz8udGl0bGUpIHtcbiAgICAgIGhlYWRlcnNbJ1gtU3RyZWFtLVRpdGxlJ10gPSBvcHRpb25zLnRpdGxlO1xuICAgIH1cbiAgICBpZiAob3B0aW9ucz8uc2Vzc2lvbklkKSB7XG4gICAgICBoZWFkZXJzWydYLVN0cmVhbS1TZXNzaW9uLUlkJ10gPSBvcHRpb25zLnNlc3Npb25JZDtcbiAgICB9XG5cbiAgICAvLyBgZHVwbGV4OiAnaGFsZidgIGlzIHJlcXVpcmVkIGJ5IHVuZGljaSBmb3Igc3RyZWFtaW5nIHJlcXVlc3QgYm9kaWVzXG4gICAgLy8gYnV0IGlzIG5vdCB5ZXQgaW4gdGhlIHN0YW5kYXJkIGxpYi5kb20gUmVxdWVzdEluaXQgdHlwZS5cbiAgICBjb25zdCBmZXRjaE9wdGlvbnM6IFJlcXVlc3RJbml0ICYgeyBkdXBsZXg6IHN0cmluZyB9ID0ge1xuICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICBoZWFkZXJzLFxuICAgICAgYm9keSxcbiAgICAgIGR1cGxleDogJ2hhbGYnXG4gICAgfTtcblxuICAgIGNvbnN0IHJlc3BvbnNlUHJvbWlzZSA9IGZldGNoKHVybCwgZmV0Y2hPcHRpb25zKTtcblxuICAgIC8vIFRyYWNrIGVhcmx5IHJlamVjdGlvbiBmcm9tIHRoZSBzZXJ2ZXIgKGUuZy4gNDA5IFwiU3RyZWFtIGFscmVhZHlcbiAgICAvLyBleGlzdHMgYW5kIGlzIGFjdGl2ZVwiKS4gIEZvciBhIHN1Y2Nlc3NmdWwgc3RyZWFtIHRoZSByZXNwb25zZSBzdGF5c1xuICAgIC8vIHBlbmRpbmcgdW50aWwgY2xvc2UoKSBlbmRzIHRoZSBib2R5IFx1MjAxNCBidXQgZXJyb3IgcmVzcG9uc2VzIGFycml2ZVxuICAgIC8vIGltbWVkaWF0ZWx5IGFuZCBtdXN0IGJlIHN1cmZhY2VkIHdpdGhvdXQgd2FpdGluZyBmb3IgY2xvc2UoKS5cbiAgICAvLyBOb3RlOiBvbmx5IHJlYWRzIHJlc3BvbnNlLm9rL3N0YXR1c1RleHQgKG5vdCB0aGUgYm9keSkgc28gY2xvc2UoKVxuICAgIC8vIGNhbiBzdGlsbCBwYXJzZSB0aGUgZnVsbCBlcnJvciByZXNwb25zZS5cbiAgICBsZXQgZWFybHlFcnJvcjogRXJyb3IgfCBudWxsID0gbnVsbDtcbiAgICByZXNwb25zZVByb21pc2VcbiAgICAgIC50aGVuKChyZXNwb25zZSkgPT4ge1xuICAgICAgICBpZiAoIXJlc3BvbnNlLm9rKSB7XG4gICAgICAgICAgZWFybHlFcnJvciA9IG5ldyBBcGlFcnJvcihyZXNwb25zZS5zdGF0dXNUZXh0LCBTdHJpbmcocmVzcG9uc2Uuc3RhdHVzKSk7XG4gICAgICAgIH1cbiAgICAgIH0pXG4gICAgICAuY2F0Y2goKGVycjogdW5rbm93bikgPT4ge1xuICAgICAgICBlYXJseUVycm9yID0gZXJyIGluc3RhbmNlb2YgRXJyb3IgPyBlcnIgOiBuZXcgRXJyb3IoU3RyaW5nKGVycikpO1xuICAgICAgfSk7XG5cbiAgICByZXR1cm4ge1xuICAgICAgd3JpdGUobGluZTogc3RyaW5nKTogdm9pZCB7XG4gICAgICAgIGlmIChlYXJseUVycm9yKSB0aHJvdyBlYXJseUVycm9yO1xuICAgICAgICBjb250cm9sbGVyLmVucXVldWUoZW5jb2Rlci5lbmNvZGUoYCR7bGluZX1cXG5gKSk7XG4gICAgICB9LFxuICAgICAgY2xvc2U6IGFzeW5jICgpOiBQcm9taXNlPFN0cmVhbVJlc3VsdD4gPT4ge1xuICAgICAgICBjb250cm9sbGVyLmNsb3NlKCk7XG4gICAgICAgIHJldHVybiB0aGlzLnJlcXVlc3QoYXN5bmMgKCkgPT4ge1xuICAgICAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgcmVzcG9uc2VQcm9taXNlO1xuICAgICAgICAgIGlmICghcmVzcG9uc2Uub2spIHRocm93IHJlc3BvbnNlO1xuICAgICAgICAgIHJldHVybiByZXNwb25zZS5qc29uKCkgYXMgUHJvbWlzZTxTdHJlYW1SZXN1bHQ+O1xuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9O1xuICB9XG5cbiAgLyoqXG4gICAqIE9wZW5zIGEgV2ViU29ja2V0LWJhY2tlZCBKU09OTCBzdHJlYW0gdG8gdGhlIHNlcnZlciBhbmQgcmV0dXJucyBhIHNlc3Npb24uXG4gICAqXG4gICAqIFRoZSBzZXNzaW9uIGtlZXBzIGEgcGVyc2lzdGVudCBXZWJTb2NrZXQgY29ubmVjdGlvbiBmb3IgdGhlIGVudGlyZSBzZXNzaW9uXG4gICAqIGxpZmV0aW1lLiBUaGUgc2VydmVyIHNlbmRzIGEgYHJlYWR5YCBtZXNzYWdlIHdpdGggYHJlc3VtZUZyb21gIGJlZm9yZSB0aGVcbiAgICogY2FsbGVyIHdyaXRlcyBhbnkgbGluZXMsIHNvIHRoZSB3YXRjaGVyIGNhbiBza2lwIGxpbmVzIHRoZSBzZXJ2ZXIgYWxyZWFkeSBoYXMuXG4gICAqXG4gICAqIENhbGwge0BsaW5rIFdzU3RyZWFtU2Vzc2lvbi5jbG9zZX0gd2hlbiB0aGUgcHJvZHVjZXIgaXMgZmluaXNoZWQgdG8gc2VuZCBhXG4gICAqIGdyYWNlZnVsIGNsb3NlIG1lc3NhZ2UgYW5kIGF3YWl0IHRoZSBzZXJ2ZXIncyBhY2tub3dsZWRnZW1lbnQuXG4gICAqXG4gICAqIEBwYXJhbSBjYXJkSWQgLSBDYXJkIElEIHRvIGF0dGFjaCB0aGUgc3RyZWFtIHRvLlxuICAgKiBAcGFyYW0gc3RyZWFtVHlwZSAtIFN0cmVhbSB0eXBlIGtleSBmcm9tIHNldHRpbmdzLmpzb24gKGUuZy4sIGBcImNsYXVkZS1jb2RlLXNlc3Npb25cImApLlxuICAgKiBAcGFyYW0gZmlsZW5hbWUgLSBTdHJlYW0gZmlsZW5hbWUgKGUuZy4sIGBcInNlc3Npb24tYWJjLmpzb25sXCJgKS5cbiAgICogQHBhcmFtIG9wdGlvbnMgLSBUaXRsZSBhbmQgc2Vzc2lvbiBJRCBtZXRhZGF0YSBmb3J3YXJkZWQgdG8gdGhlIHNlcnZlciBhcyBVUkwgcXVlcnkgcGFyYW1ldGVycy5cbiAgICogQHBhcmFtIHdzRmFjdG9yeSAtIFdlYlNvY2tldCBmYWN0b3J5IGZvciBjcmVhdGluZyB0aGUgY29ubmVjdGlvbi4gVXNlIHRoZSBgd3NgIHBhY2thZ2UgaW4gTm9kZS5qcyBlbnZpcm9ubWVudHMuXG4gICAqIEByZXR1cm5zIEEge0BsaW5rIFdzU3RyZWFtU2Vzc2lvbn0gd2l0aCBgcmVzdW1lRnJvbWAgc2V0IHRvIHRoZSBzZXJ2ZXIncyBjdXJyZW50IGxpbmUgY291bnQuXG4gICAqIEB0aHJvd3MgRXJyb3Igd2hlbiB0aGUgV2ViU29ja2V0IGZhaWxzIHRvIGNvbm5lY3Qgb3IgdGhlIHNlcnZlciBzZW5kcyBhbiBlcnJvciBiZWZvcmUgYHJlYWR5YC5cbiAgICovXG4gIGFzeW5jIG9wZW5TdHJlYW1XZWJTb2NrZXQoXG4gICAgY2FyZElkOiBzdHJpbmcsXG4gICAgc3RyZWFtVHlwZTogc3RyaW5nLFxuICAgIGZpbGVuYW1lOiBzdHJpbmcsXG4gICAgb3B0aW9uczogU3RyZWFtV3JpdGVyT3B0aW9ucyxcbiAgICB3c0ZhY3Rvcnk6IEluZ2VzdFdzRmFjdG9yeVxuICApOiBQcm9taXNlPFdzU3RyZWFtU2Vzc2lvbj4ge1xuICAgIGNvbnN0IGZhY3RvcnkgPSB3c0ZhY3Rvcnk7XG5cbiAgICAvLyBDb252ZXJ0IGh0dHAvaHR0cHMgdG8gd3Mvd3NzXG4gICAgY29uc3QgYmFzZVVybCA9IHRoaXMub3B0aW9ucy5iYXNlVXJsLnJlcGxhY2UoL15odHRwLywgJ3dzJyk7XG4gICAgY29uc3QgYmFzZVBhdGggPSBgJHtiYXNlVXJsfS9jYXJkcy8ke2VuY29kZVVSSUNvbXBvbmVudChjYXJkSWQpfS9zdHJlYW1zLyR7ZW5jb2RlVVJJQ29tcG9uZW50KHN0cmVhbVR5cGUpfS8ke2VuY29kZVVSSUNvbXBvbmVudChmaWxlbmFtZSl9YDtcbiAgICBjb25zdCBxdWVyeVBhcmFtcyA9IG5ldyBVUkxTZWFyY2hQYXJhbXMoKTtcbiAgICBpZiAob3B0aW9ucz8udGl0bGUpIHF1ZXJ5UGFyYW1zLnNldCgndGl0bGUnLCBvcHRpb25zLnRpdGxlKTtcbiAgICBpZiAob3B0aW9ucz8uc2Vzc2lvbklkKSBxdWVyeVBhcmFtcy5zZXQoJ3Nlc3Npb25JZCcsIG9wdGlvbnMuc2Vzc2lvbklkKTtcbiAgICBjb25zdCBxdWVyeVN0cmluZyA9IHF1ZXJ5UGFyYW1zLnRvU3RyaW5nKCk7XG4gICAgY29uc3QgdXJsID0gcXVlcnlTdHJpbmcgPyBgJHtiYXNlUGF0aH0/JHtxdWVyeVN0cmluZ31gIDogYmFzZVBhdGg7XG5cbiAgICBjb25zdCBoZWFkZXJzOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ID0ge307XG4gICAgaWYgKHRoaXMub3B0aW9ucy5hY2Nlc3NUb2tlbikge1xuICAgICAgaGVhZGVyc1snQXV0aG9yaXphdGlvbiddID0gYEJlYXJlciAke3RoaXMub3B0aW9ucy5hY2Nlc3NUb2tlbn1gO1xuICAgIH1cblxuICAgIGNvbnN0IHdzID0gZmFjdG9yeSh1cmwsIHsgaGVhZGVycyB9KTtcblxuICAgIC8vIEF3YWl0IHRoZSAncmVhZHknIG1lc3NhZ2UgZnJvbSB0aGUgc2VydmVyIGJlZm9yZSByZXR1cm5pbmcgdG8gdGhlIGNhbGxlci5cbiAgICAvLyBBbnkgZXJyb3Igb3IgcHJlbWF0dXJlIGNsb3NlIGJlZm9yZSAncmVhZHknIHJlamVjdHMgdGhlIHByb21pc2UuXG4gICAgY29uc3QgcmVzdW1lRnJvbSA9IGF3YWl0IG5ldyBQcm9taXNlPG51bWJlcj4oKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgY29uc3Qgb25SZWFkeSA9IChldmVudDogTWVzc2FnZUV2ZW50PHVua25vd24+KSA9PiB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgY29uc3QgbXNnID0gSlNPTi5wYXJzZShTdHJpbmcoZXZlbnQuZGF0YSkpIGFzIHsgdHlwZTogc3RyaW5nOyByZXN1bWVGcm9tPzogbnVtYmVyOyBtZXNzYWdlPzogc3RyaW5nIH07XG4gICAgICAgICAgaWYgKG1zZy50eXBlID09PSAncmVhZHknKSB7XG4gICAgICAgICAgICB3cy5yZW1vdmVFdmVudExpc3RlbmVyKCdtZXNzYWdlJywgb25SZWFkeSk7XG4gICAgICAgICAgICB3cy5yZW1vdmVFdmVudExpc3RlbmVyKCdlcnJvcicsIG9uRXJyb3IpO1xuICAgICAgICAgICAgd3MucmVtb3ZlRXZlbnRMaXN0ZW5lcignY2xvc2UnLCBvbkNsb3NlKTtcbiAgICAgICAgICAgIHJlc29sdmUobXNnLnJlc3VtZUZyb20gPz8gMCk7XG4gICAgICAgICAgfSBlbHNlIGlmIChtc2cudHlwZSA9PT0gJ2Vycm9yJykge1xuICAgICAgICAgICAgd3MucmVtb3ZlRXZlbnRMaXN0ZW5lcignbWVzc2FnZScsIG9uUmVhZHkpO1xuICAgICAgICAgICAgd3MucmVtb3ZlRXZlbnRMaXN0ZW5lcignZXJyb3InLCBvbkVycm9yKTtcbiAgICAgICAgICAgIHdzLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2Nsb3NlJywgb25DbG9zZSk7XG4gICAgICAgICAgICByZWplY3QobmV3IEVycm9yKG1zZy5tZXNzYWdlID8/ICdTZXJ2ZXIgZXJyb3InKSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIC8vIE90aGVyIG1lc3NhZ2UgdHlwZXMgYmVmb3JlICdyZWFkeScgYXJlIHNpbGVudGx5IGlnbm9yZWRcbiAgICAgICAgfSBjYXRjaCB7XG4gICAgICAgICAgcmVqZWN0KG5ldyBFcnJvcignRmFpbGVkIHRvIHBhcnNlIHNlcnZlciByZWFkeSBtZXNzYWdlJykpO1xuICAgICAgICB9XG4gICAgICB9O1xuICAgICAgY29uc3Qgb25FcnJvciA9IChldmVudDogRXZlbnQpID0+IHtcbiAgICAgICAgd3MucmVtb3ZlRXZlbnRMaXN0ZW5lcignbWVzc2FnZScsIG9uUmVhZHkpO1xuICAgICAgICB3cy5yZW1vdmVFdmVudExpc3RlbmVyKCdlcnJvcicsIG9uRXJyb3IpO1xuICAgICAgICB3cy5yZW1vdmVFdmVudExpc3RlbmVyKCdjbG9zZScsIG9uQ2xvc2UpO1xuICAgICAgICByZWplY3QobmV3IEVycm9yKGBXZWJTb2NrZXQgZXJyb3I6ICR7U3RyaW5nKGV2ZW50KX1gKSk7XG4gICAgICB9O1xuICAgICAgY29uc3Qgb25DbG9zZSA9IChldmVudDogQ2xvc2VFdmVudCkgPT4ge1xuICAgICAgICB3cy5yZW1vdmVFdmVudExpc3RlbmVyKCdtZXNzYWdlJywgb25SZWFkeSk7XG4gICAgICAgIHdzLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2Vycm9yJywgb25FcnJvcik7XG4gICAgICAgIHdzLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2Nsb3NlJywgb25DbG9zZSk7XG4gICAgICAgIHJlamVjdChuZXcgRXJyb3IoYFdlYlNvY2tldCBjbG9zZWQgYmVmb3JlIHJlYWR5OiBjb2RlPSR7U3RyaW5nKGV2ZW50LmNvZGUpfWApKTtcbiAgICAgIH07XG4gICAgICB3cy5hZGRFdmVudExpc3RlbmVyKCdtZXNzYWdlJywgb25SZWFkeSk7XG4gICAgICB3cy5hZGRFdmVudExpc3RlbmVyKCdlcnJvcicsIG9uRXJyb3IpO1xuICAgICAgd3MuYWRkRXZlbnRMaXN0ZW5lcignY2xvc2UnLCBvbkNsb3NlKTtcbiAgICB9KTtcblxuICAgIGxldCBsaW5lc1NlbnQgPSByZXN1bWVGcm9tO1xuXG4gICAgcmV0dXJuIHtcbiAgICAgIGdldCByZXN1bWVGcm9tKCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiByZXN1bWVGcm9tO1xuICAgICAgfSxcbiAgICAgIGdldCBsaW5lc1NlbnQoKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIGxpbmVzU2VudDtcbiAgICAgIH0sXG4gICAgICB3cml0ZShsaW5lOiBzdHJpbmcpOiB2b2lkIHtcbiAgICAgICAgbGluZXNTZW50Kys7XG4gICAgICAgIHdzLnNlbmQoSlNPTi5zdHJpbmdpZnkoeyB0eXBlOiAnbGluZScsIGxpbmVOdW1iZXI6IGxpbmVzU2VudCwgY29udGVudDogbGluZSB9KSk7XG4gICAgICB9LFxuICAgICAgYXN5bmMgY2xvc2UoKTogUHJvbWlzZTxTdHJlYW1SZXN1bHQ+IHtcbiAgICAgICAgd3Muc2VuZChKU09OLnN0cmluZ2lmeSh7IHR5cGU6ICdjbG9zZScgfSkpO1xuICAgICAgICBhd2FpdCBuZXcgUHJvbWlzZTx2b2lkPigocmVzb2x2ZSkgPT4ge1xuICAgICAgICAgIGNvbnN0IG9uQ2xvc2UgPSAoKSA9PiB7XG4gICAgICAgICAgICB3cy5yZW1vdmVFdmVudExpc3RlbmVyKCdjbG9zZScsIG9uQ2xvc2UpO1xuICAgICAgICAgICAgcmVzb2x2ZSgpO1xuICAgICAgICAgIH07XG4gICAgICAgICAgd3MuYWRkRXZlbnRMaXN0ZW5lcignY2xvc2UnLCBvbkNsb3NlKTtcbiAgICAgICAgICAvLyBJZiBhbHJlYWR5IGNsb3NlZCwgcmVzb2x2ZSBpbW1lZGlhdGVseVxuICAgICAgICAgIGlmICh3cy5yZWFkeVN0YXRlID09PSB3cy5DTE9TRUQpIHtcbiAgICAgICAgICAgIHdzLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2Nsb3NlJywgb25DbG9zZSk7XG4gICAgICAgICAgICByZXNvbHZlKCk7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICBmaWxlbmFtZSxcbiAgICAgICAgICBzdHJlYW1UeXBlLFxuICAgICAgICAgIGxpbmVDb3VudDogbGluZXNTZW50LFxuICAgICAgICAgIHN0YXR1czogJ2NvbXBsZXRlZCdcbiAgICAgICAgfTtcbiAgICAgIH1cbiAgICB9O1xuICB9XG5cbiAgLy8gLS0tIEFjdGlvbiBPcGVyYXRpb25zIC0tLVxuXG4gIC8qKlxuICAgKiBFeGVjdXRlcyBhbiBhY3Rpb24gb24gYSBjYXJkIHZpYSB0aGUgc2VydmVyIHJlbGF5LlxuICAgKlxuICAgKiBAcGFyYW0gY2FyZElkIC0gSWRlbnRpZmllciBvZiB0aGUgY2FyZCB0byBleGVjdXRlIHRoZSBhY3Rpb24gb24uXG4gICAqIEBwYXJhbSBhY3Rpb25OYW1lIC0gQWN0aW9uIGlkZW50aWZpZXIgKGUuZy4sICdsYXVuY2gnKS5cbiAgICogQHJldHVybnMgUHJvbWlzZSByZXNvbHZpbmcgdG8gdGhlIGFjdGlvbiBleGVjdXRpb24gcmVzdWx0LlxuICAgKiBAdGhyb3dzIEFwaUVycm9yIHdoZW4gdGhlIHNlcnZlciByZWplY3RzIHRoZSByZXF1ZXN0LlxuICAgKiBAdGhyb3dzIE5ldHdvcmtFcnJvciB3aGVuIHRoZSByZXF1ZXN0IGZhaWxzIHRvIHJlYWNoIHRoZSBzZXJ2ZXIuXG4gICAqL1xuICBhc3luYyBleGVjdXRlQWN0aW9uKGNhcmRJZDogc3RyaW5nLCBhY3Rpb25OYW1lOiBzdHJpbmcpOiBQcm9taXNlPEFjdGlvblJlc3VsdD4ge1xuICAgIGNvbnN0IHVybCA9IHRoaXMuYnVpbGRVcmwoYC9jYXJkcy8ke2NhcmRJZH0vYWN0aW9ucy8ke2VuY29kZVVSSUNvbXBvbmVudChhY3Rpb25OYW1lKX1gKTtcbiAgICByZXR1cm4gdGhpcy5yZXF1ZXN0KCgpID0+IHRoaXMuZ2V0SHR0cENsaWVudCgpLnBvc3Q8QWN0aW9uUmVzdWx0Pih1cmwsIHVuZGVmaW5lZCkpO1xuICB9XG5cbiAgLy8gLS0tIENvbXBhcmUgT3BlcmF0aW9ucyAtLS1cblxuICAvKipcbiAgICogU2V0cyBvciByZXBsYWNlcyB0aGUgYWN0aXZlIGNvbXBhcmlzb24gb24gdGhlIHNlcnZlci5cbiAgICpcbiAgICogQHBhcmFtIHJlcXVlc3QgLSBDb21wYXJlIHJlcXVlc3Qgc3BlY2lmeWluZyB0aGUgY29tcGFyaXNvbiBtb2RlLlxuICAgKiBAcmV0dXJucyBQcm9taXNlIHJlc29sdmluZyB0byB0aGUgcmVzdWx0aW5nIGNvbXBhcmUgc3RhdGUuXG4gICAqL1xuICBhc3luYyBzZXRDb21wYXJlKHJlcXVlc3Q6IENvbXBhcmVSZXF1ZXN0KTogUHJvbWlzZTxDb21wYXJlU3RhdGU+IHtcbiAgICBjb25zdCB1cmwgPSB0aGlzLmJ1aWxkVXJsKCcvY29tcGFyZScpO1xuICAgIHJldHVybiB0aGlzLnJlcXVlc3QoKCkgPT4gdGhpcy5nZXRIdHRwQ2xpZW50KCkucG9zdDxDb21wYXJlU3RhdGU+KHVybCwgcmVxdWVzdCkpO1xuICB9XG5cbiAgLyoqXG4gICAqIFJldHVybnMgdGhlIGN1cnJlbnQgY29tcGFyZSBzdGF0ZSwgb3IgbnVsbCBpZiBubyBjb21wYXJpc29uIGlzIGFjdGl2ZS5cbiAgICpcbiAgICogVGhlIHNlcnZlciByZXR1cm5zIDIwNCB3aGVuIG5vIGNvbXBhcmlzb24gaXMgYWN0aXZlLCB3aGljaCB0aGlzIG1ldGhvZFxuICAgKiBtYXBzIHRvIG51bGwgcmF0aGVyIHRoYW4gdGhyb3dpbmcuXG4gICAqXG4gICAqIEByZXR1cm5zIFByb21pc2UgcmVzb2x2aW5nIHRvIHRoZSBjdXJyZW50IGNvbXBhcmUgc3RhdGUsIG9yIG51bGwgaWYgbm9uZSBhY3RpdmUuXG4gICAqL1xuICBhc3luYyBnZXRDb21wYXJlKCk6IFByb21pc2U8Q29tcGFyZVN0YXRlIHwgbnVsbD4ge1xuICAgIGNvbnN0IHVybCA9IHRoaXMuYnVpbGRVcmwoJy9jb21wYXJlJyk7XG4gICAgcmV0dXJuIHRoaXMucmVxdWVzdChhc3luYyAoKSA9PiB7XG4gICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGZldGNoKHVybCwge1xuICAgICAgICBoZWFkZXJzOiB0aGlzLmdldEhlYWRlcnMoKSBhcyBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+LFxuICAgICAgICBzaWduYWw6IHRoaXMuZ2V0VGltZW91dFNpZ25hbCgpXG4gICAgICB9KTtcbiAgICAgIGlmIChyZXNwb25zZS5zdGF0dXMgPT09IDIwNCkge1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH1cbiAgICAgIGlmICghcmVzcG9uc2Uub2spIHRocm93IHJlc3BvbnNlO1xuICAgICAgcmV0dXJuIHJlc3BvbnNlLmpzb24oKSBhcyBQcm9taXNlPENvbXBhcmVTdGF0ZT47XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogQ2xlYXJzIHRoZSBhY3RpdmUgY29tcGFyaXNvbiBvbiB0aGUgc2VydmVyLlxuICAgKlxuICAgKiBAcmV0dXJucyBQcm9taXNlIHJlc29sdmluZyB3aGVuIHRoZSBjb21wYXJpc29uIGlzIGNsZWFyZWQuXG4gICAqL1xuICBhc3luYyBjbGVhckNvbXBhcmUoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc3QgdXJsID0gdGhpcy5idWlsZFVybCgnL2NvbXBhcmUnKTtcbiAgICByZXR1cm4gdGhpcy5yZXF1ZXN0KCgpID0+IHRoaXMuZ2V0SHR0cENsaWVudCgpLmRlbGV0ZSh1cmwpKTtcbiAgfVxufVxuIiwgIi8qKlxuICogQ2xhdWRlIENvZGUgbWFya2V0cGxhY2UgcmVnaXN0cmF0aW9uIHV0aWxpdGllcy5cbiAqXG4gKiBQcm92aWRlcyBmdW5jdGlvbnMgZm9yIHJlc29sdmluZyB0aGUgQ2xhdWRlIENvZGUgY29uZmlndXJhdGlvbiBkaXJlY3RvcnlcbiAqIGFuZCB1cGRhdGluZyB0aGUgYGtub3duX21hcmtldHBsYWNlcy5qc29uYCBmaWxlIHNvIHRoYXQgcGx1Z2luIHZlcnNpb25cbiAqIGNoZWNrcyBoaXQgdGhlIGNhY2hlIGluc3RlYWQgb2YgcmUtc2Nhbm5pbmcgdGhlIHNvdXJjZSBkaXJlY3RvcnkuXG4gKlxuICogQHN1bW1hcnkgQ2xhdWRlIENvZGUgbWFya2V0cGxhY2UgcmVnaXN0cmF0aW9uIHV0aWxpdGllc1xuICogQG1vZHVsZVxuICovXG5cbmltcG9ydCAqIGFzIGZzIGZyb20gJ25vZGU6ZnMvcHJvbWlzZXMnO1xuaW1wb3J0IHsgaG9tZWRpciB9IGZyb20gJ25vZGU6b3MnO1xuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdub2RlOnBhdGgnO1xuaW1wb3J0IHR5cGUgeyBJTG9nZ2VyIH0gZnJvbSAnLi9jb25maWcvbG9nZ2VyLmpzJztcblxuLyoqXG4gKiBSZXNvbHZlcyB0aGUgQ2xhdWRlIENvZGUgY29uZmlndXJhdGlvbiBkaXJlY3RvcnkgdXNpbmcgdGhlIHN0YW5kYXJkXG4gKiBmYWxsYmFjayBjaGFpbjogJENMQVVERV9DT05GSUdfRElSIFx1MjE5MiAkWERHX0RBVEFfSE9NRS9jbGF1ZGUgXHUyMTkyXG4gKiAkWERHX0NPTkZJR19IT01FL2NsYXVkZSBcdTIxOTIgfi8uY29uZmlnL2NsYXVkZSBcdTIxOTIgfi8uY2xhdWRlLlxuICpcbiAqIFJldHVybnMgdGhlIGZpcnN0IGNhbmRpZGF0ZSB0aGF0IGV4aXN0cyBvbiBkaXNrLCBvciBudWxsIGlmIG5vbmUgaXMgZm91bmQuXG4gKlxuICogQHJldHVybnMgVGhlIGZpcnN0IGV4aXN0aW5nIENsYXVkZSBjb25maWcgZGlyZWN0b3J5IHBhdGgsIG9yIG51bGwgaWYgbm9uZSBmb3VuZC5cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHJlc29sdmVDbGF1ZGVDb25maWdEaXIoKTogUHJvbWlzZTxzdHJpbmcgfCBudWxsPiB7XG4gIGNvbnN0IGhvbWUgPSBob21lZGlyKCk7XG4gIGNvbnN0IGNhbmRpZGF0ZXM6IHN0cmluZ1tdID0gW107XG5cbiAgY29uc3QgY2xhdWRlQ29uZmlnRGlyID0gcHJvY2Vzcy5lbnZbJ0NMQVVERV9DT05GSUdfRElSJ107XG4gIGlmIChjbGF1ZGVDb25maWdEaXIpIGNhbmRpZGF0ZXMucHVzaChjbGF1ZGVDb25maWdEaXIpO1xuXG4gIGNvbnN0IHhkZ0RhdGFIb21lID0gcHJvY2Vzcy5lbnZbJ1hER19EQVRBX0hPTUUnXTtcbiAgaWYgKHhkZ0RhdGFIb21lKSBjYW5kaWRhdGVzLnB1c2gocGF0aC5qb2luKHhkZ0RhdGFIb21lLCAnY2xhdWRlJykpO1xuXG4gIGNvbnN0IHhkZ0NvbmZpZ0hvbWUgPSBwcm9jZXNzLmVudlsnWERHX0NPTkZJR19IT01FJ107XG4gIGlmICh4ZGdDb25maWdIb21lKSBjYW5kaWRhdGVzLnB1c2gocGF0aC5qb2luKHhkZ0NvbmZpZ0hvbWUsICdjbGF1ZGUnKSk7XG5cbiAgY2FuZGlkYXRlcy5wdXNoKHBhdGguam9pbihob21lLCAnLmNvbmZpZycsICdjbGF1ZGUnKSk7XG4gIGNhbmRpZGF0ZXMucHVzaChwYXRoLmpvaW4oaG9tZSwgJy5jbGF1ZGUnKSk7XG5cbiAgZm9yIChjb25zdCBjYW5kaWRhdGUgb2YgY2FuZGlkYXRlcykge1xuICAgIHRyeSB7XG4gICAgICBhd2FpdCBmcy5hY2Nlc3MocGF0aC5qb2luKGNhbmRpZGF0ZSwgJ3BsdWdpbnMnKSk7XG4gICAgICByZXR1cm4gY2FuZGlkYXRlO1xuICAgIH0gY2F0Y2ggKGVycm9yOiB1bmtub3duKSB7XG4gICAgICBpZiAoZXJyb3IgaW5zdGFuY2VvZiBFcnJvciAmJiAnY29kZScgaW4gZXJyb3IgJiYgZXJyb3IuY29kZSA9PT0gJ0VOT0VOVCcpIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICB0aHJvdyBlcnJvcjtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIG51bGw7XG59XG5cbi8qKlxuICogVXBkYXRlcyB0aGUgYGNhcmRzLm1hbmFnZW1lbnRgIGVudHJ5IGluIENsYXVkZSBDb2RlJ3MgYGtub3duX21hcmtldHBsYWNlcy5qc29uYFxuICogdG8gcG9pbnQgdG8gdGhlIGV4dGVuc2lvbi1idW5kbGVkIG1hcmtldHBsYWNlIHVzaW5nIGFuIGFic29sdXRlIHBhdGguXG4gKlxuICogQ2xhdWRlIENvZGUgcmVzb2x2ZXMgZGlyZWN0b3J5IG1hcmtldHBsYWNlIHNvdXJjZXMgcmVsYXRpdmUgdG8gdGhlIHNwYXduZWRcbiAqIHNlc3Npb24ncyBDV0QuIFdoZW4gc2Vzc2lvbnMgcnVuIGluIGEgd29ya3RyZWUsIGEgcmVsYXRpdmUgcGF0aCBsaWtlIGBcInB1YmxpY1wiYFxuICogcmVzb2x2ZXMgdG8gdGhlIHdvcmt0cmVlJ3MgY29weSBcdTIwMTQgd2hpY2ggbWF5IGNvbnRhaW4gYSBzdGFsZSBwbHVnaW4gdmVyc2lvbi5cbiAqIFdyaXRpbmcgYW4gYWJzb2x1dGUgcGF0aCBlbnN1cmVzIENsYXVkZSBDb2RlIGFsd2F5cyByZWFkcyBmcm9tIHRoZSBleHRlbnNpb24nc1xuICogYnVuZGxlZCBtYXJrZXRwbGFjZSwgcmVnYXJkbGVzcyBvZiBDV0QuXG4gKlxuICogIyMgSG93IENsYXVkZSBDb2RlJ3MgcGx1Z2luIHZlcnNpb24gc3luY2luZyB3b3Jrc1xuICpcbiAqIFRoaXMgcmVnaXN0cmF0aW9uIHVwZGF0ZSBpcyB0aGUgKipvbmx5KiogaW50ZXJ2ZW50aW9uIHdlIG5lZWQuIENsYXVkZSBDb2RlJ3NcbiAqIGJ1aWx0LWluIGF1dG8tdXBkYXRlIHN5c3RlbSBoYW5kbGVzIHRoZSByZXN0OlxuICpcbiAqIDEuICoqVmVyc2lvbiBkZXRlY3Rpb24qKiBcdTIwMTQgT24gc2Vzc2lvbiBzdGFydCwgQ2xhdWRlIENvZGUgcmVhZHMgdGhlIG1hcmtldHBsYWNlXG4gKiAgICBzb3VyY2UgZGlyZWN0b3J5ICh0aGUgYHNvdXJjZS5wYXRoYCB3cml0dGVuIGhlcmUpIGFuZCBleHRyYWN0cyB0aGUgdmVyc2lvblxuICogICAgZnJvbSBlYWNoIHBsdWdpbidzIGAuY2xhdWRlLXBsdWdpbi9wbHVnaW4uanNvbmAuXG4gKlxuICogMi4gKipDYWNoZS1wZXItdmVyc2lvbioqIFx1MjAxNCBFYWNoIHBsdWdpbiB2ZXJzaW9uIGlzIGNhY2hlZCBpbmRlcGVuZGVudGx5IHVuZGVyXG4gKiAgICBgPGNvbmZpZ0Rpcj4vcGx1Z2lucy9jYWNoZS88bWFya2V0cGxhY2U+LzxwbHVnaW4+Lzx2ZXJzaW9uPi9gLiBUaGUgYWN0aXZlXG4gKiAgICB2ZXJzaW9uJ3MgcGF0aCBpcyByZWNvcmRlZCBhcyBgaW5zdGFsbFBhdGhgIGluIGBpbnN0YWxsZWRfcGx1Z2lucy5qc29uYC5cbiAqXG4gKiAzLiAqKkF1dG8tdXBkYXRlKiogXHUyMDE0IFdoZW4gdGhlIHNvdXJjZSBkaXJlY3RvcnkgY29udGFpbnMgYSBuZXdlciB2ZXJzaW9uIHRoYW5cbiAqICAgIHdoYXQncyBjYWNoZWQsIENsYXVkZSBDb2RlIGNvcGllcyB0aGUgc291cmNlIGludG8gYSBuZXcgdmVyc2lvbmVkIGNhY2hlXG4gKiAgICBkaXJlY3RvcnksIHVwZGF0ZXMgYGluc3RhbGxlZF9wbHVnaW5zLmpzb25gIHRvIHBvaW50IHRvIGl0LCBhbmQgd3JpdGVzIGFcbiAqICAgIGAub3JwaGFuZWRfYXRgIHRpbWVzdGFtcCBpbnRvIHRoZSBvbGQgdmVyc2lvbidzIGNhY2hlIGRpcmVjdG9yeS5cbiAqXG4gKiA0LiAqKk9ycGhhbiBHQyoqIFx1MjAxNCBBIGJhY2tncm91bmQgaG91c2VrZWVwaW5nIHRhc2sgcnVucyBldmVyeSAxMCBtaW51dGVzLiBJdFxuICogICAgd2Fsa3MgdGhlIGNhY2hlLCBtYXJrcyBhbnkgdmVyc2lvbiBkaXJlY3Rvcnkgbm90IHJlZmVyZW5jZWQgYnlcbiAqICAgIGBpbnN0YWxsZWRfcGx1Z2lucy5qc29uYCB3aXRoIGAub3JwaGFuZWRfYXRgLCBhbmQgZGVsZXRlcyBvcnBoYW5lZFxuICogICAgZGlyZWN0b3JpZXMgb25seSBhZnRlciBhICoqNy1kYXkqKiBncmFjZSBwZXJpb2QuIFRoaXMgZW5zdXJlcyB0aGF0XG4gKiAgICBjb25jdXJyZW50bHkgcnVubmluZyBzZXNzaW9ucyBhcmUgbmV2ZXIgZGlzcnVwdGVkIGJ5IGNhY2hlIGRlbGV0aW9uLlxuICpcbiAqIFdlIHByZXZpb3VzbHkgZm9yY2UtZGVsZXRlZCBzdGFsZSBjYWNoZSBlbnRyaWVzIChgZXZpY3RTdGFsZVJ1bnRpbWVDYWNoZWApLFxuICogd2hpY2ggYnlwYXNzZWQgdGhlIDctZGF5IGdyYWNlIHBlcmlvZCBhbmQgY2F1c2VkIEVOT0VOVCBlcnJvcnMgaW4gc2Vzc2lvbnNcbiAqIHN0aWxsIHJlZmVyZW5jaW5nIHRoZSBkZWxldGVkIHBhdGhzLlxuICpcbiAqIEBwYXJhbSBtYXJrZXRwbGFjZVBhdGggLSBBYnNvbHV0ZSBwYXRoIHRvIHRoZSBidW5kbGVkIG1hcmtldHBsYWNlIGRpcmVjdG9yeS5cbiAqIEBwYXJhbSBsb2dnZXIgLSBMb2dnZXIgZm9yIGRpYWdub3N0aWMgb3V0cHV0LlxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gdXBkYXRlTWFya2V0cGxhY2VSZWdpc3RyYXRpb24obWFya2V0cGxhY2VQYXRoOiBzdHJpbmcsIGxvZ2dlcjogSUxvZ2dlcik6IFByb21pc2U8dm9pZD4ge1xuICBjb25zdCBjb25maWdEaXIgPSBhd2FpdCByZXNvbHZlQ2xhdWRlQ29uZmlnRGlyKCk7XG4gIGlmICghY29uZmlnRGlyKSB7XG4gICAgbG9nZ2VyLmRlYnVnKCdDbGF1ZGUgY29uZmlnIGRpcmVjdG9yeSBub3QgZm91bmQsIHNraXBwaW5nIG1hcmtldHBsYWNlIHJlZ2lzdHJhdGlvbiB1cGRhdGUnKTtcbiAgICByZXR1cm47XG4gIH1cblxuICBjb25zdCBrbm93blBhdGggPSBwYXRoLmpvaW4oY29uZmlnRGlyLCAncGx1Z2lucycsICdrbm93bl9tYXJrZXRwbGFjZXMuanNvbicpO1xuICBsZXQgcmF3OiBzdHJpbmc7XG4gIHRyeSB7XG4gICAgcmF3ID0gYXdhaXQgZnMucmVhZEZpbGUoa25vd25QYXRoLCAndXRmLTgnKTtcbiAgfSBjYXRjaCAoZXJyb3I6IHVua25vd24pIHtcbiAgICBpZiAoZXJyb3IgaW5zdGFuY2VvZiBFcnJvciAmJiAnY29kZScgaW4gZXJyb3IgJiYgZXJyb3IuY29kZSA9PT0gJ0VOT0VOVCcpIHtcbiAgICAgIGxvZ2dlci5kZWJ1Zygna25vd25fbWFya2V0cGxhY2VzLmpzb24gbm90IGZvdW5kLCBza2lwcGluZycpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB0aHJvdyBlcnJvcjtcbiAgfVxuXG4gIGNvbnN0IGRhdGEgPSBKU09OLnBhcnNlKHJhdykgYXMgUmVjb3JkPFxuICAgIHN0cmluZyxcbiAgICB7IHNvdXJjZT86IHsgc291cmNlPzogc3RyaW5nOyBwYXRoPzogc3RyaW5nIH07IGluc3RhbGxMb2NhdGlvbj86IHN0cmluZzsgbGFzdFVwZGF0ZWQ/OiBzdHJpbmcgfVxuICA+O1xuICBjb25zdCBlbnRyeSA9IGRhdGFbJ2NhcmRzLm1hbmFnZW1lbnQnXTtcbiAgaWYgKCFlbnRyeT8uc291cmNlIHx8IGVudHJ5LnNvdXJjZS5zb3VyY2UgIT09ICdkaXJlY3RvcnknKSByZXR1cm47XG5cbiAgaWYgKGVudHJ5LnNvdXJjZS5wYXRoID09PSBtYXJrZXRwbGFjZVBhdGggJiYgZW50cnkuaW5zdGFsbExvY2F0aW9uID09PSBtYXJrZXRwbGFjZVBhdGgpIHtcbiAgICBsb2dnZXIuZGVidWcoJ01hcmtldHBsYWNlIHJlZ2lzdHJhdGlvbiBhbHJlYWR5IHBvaW50cyB0byBleHRlbnNpb24gYnVuZGxlJyk7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgZW50cnkuc291cmNlLnBhdGggPSBtYXJrZXRwbGFjZVBhdGg7XG4gIGVudHJ5Lmluc3RhbGxMb2NhdGlvbiA9IG1hcmtldHBsYWNlUGF0aDtcbiAgZW50cnkubGFzdFVwZGF0ZWQgPSBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCk7XG4gIGF3YWl0IGZzLndyaXRlRmlsZShrbm93blBhdGgsIGAke0pTT04uc3RyaW5naWZ5KGRhdGEsIG51bGwsIDQpfVxcbmApO1xuICBsb2dnZXIuaW5mbygnVXBkYXRlZCBtYXJrZXRwbGFjZSByZWdpc3RyYXRpb24gdG8gZXh0ZW5zaW9uIGJ1bmRsZScsIHsgbWFya2V0cGxhY2VQYXRoIH0pO1xufVxuIiwgIi8qKlxuICogR2l0IHdvcmt0cmVlIGxpZmVjeWNsZSBtYW5hZ2VtZW50IGZvciBtb25vcmVwbyB3b3Jrc3BhY2VzLlxuICpcbiAqIENyZWF0ZXMgd29ya3RyZWVzIHdpdGggc3ltbGlua2VkIG5vZGVfbW9kdWxlcywgaWdub3JlZCBwYXRocywgYW5kXG4gKiBwZXItd29ya3RyZWUgZ2l0IGV4Y2x1ZGVzIHNvIHRoZSB3b3JrdHJlZSBpcyBpbW1lZGlhdGVseSB1c2FibGUgZm9yXG4gKiBidWlsZHMgYW5kIHRlc3RzIHdpdGhvdXQgYSBzZXBhcmF0ZSBgeWFybiBpbnN0YWxsYC5cbiAqXG4gKiBTdXBwb3J0cyBib3RoIGJyYW5jaC1iYXNlZCB3b3JrdHJlZXMgKGZvciBpbXBsZW1lbnRhdGlvbiB3b3JrKSBhbmRcbiAqIGRldGFjaGVkIHdvcmt0cmVlcyAoZm9yIHZlcmlmeWluZyBzdGF0ZSBhdCBhIHRhZyBvciBjb21taXQpLlxuICpcbiAqIEBzdW1tYXJ5IEdpdCB3b3JrdHJlZSBjcmVhdGlvbiB3aXRoIG1vbm9yZXBvIHN5bWxpbmsgd2lyaW5nXG4gKiBAbW9kdWxlIHdvcmt0cmVlXG4gKi9cblxuaW1wb3J0IHsgZXhlY0ZpbGUgfSBmcm9tICdub2RlOmNoaWxkX3Byb2Nlc3MnO1xuaW1wb3J0ICogYXMgZnMgZnJvbSAnbm9kZTpmcy9wcm9taXNlcyc7XG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ25vZGU6cGF0aCc7XG5pbXBvcnQgeyBwcm9taXNpZnkgfSBmcm9tICdub2RlOnV0aWwnO1xuXG5jb25zdCBleGVjRmlsZUFzeW5jID0gcHJvbWlzaWZ5KGV4ZWNGaWxlKTtcblxuLyoqXG4gKiBWYWxpZGF0ZXMgYSBicmFuY2ggbmFtZSBhZ2FpbnN0IHRoZSBDTEkncyBzYWZlIHN1YnNldC5cbiAqXG4gKiBUaGUgbmFtZSBtdXN0IHN0YXJ0IHdpdGggYW4gYWxwaGFudW1lcmljIGNoYXJhY3RlciBhbmQgbWF5IHRoZW4gaW5jbHVkZVxuICogYWxwaGFudW1lcmljcywgc2xhc2hlcywgdW5kZXJzY29yZXMsIG9yIGRhc2hlcy5cbiAqXG4gKiBAcGFyYW0gbmFtZSAtIENhbmRpZGF0ZSBicmFuY2ggbmFtZSBzdXBwbGllZCBieSB0aGUgY2FsbGVyLlxuICogQHRocm93cyB7RXJyb3J9IFdoZW4gdGhlIGJyYW5jaCBuYW1lIGRvZXMgbm90IG1hdGNoIHRoZSBzdXBwb3J0ZWQgZm9ybWF0LlxuICogQHJldHVybnMgTm8gdmFsdWUuIFRocm93cyBvbiBpbnZhbGlkIGlucHV0LlxuICovXG5leHBvcnQgZnVuY3Rpb24gdmFsaWRhdGVCcmFuY2hOYW1lKG5hbWU6IHN0cmluZyk6IHZvaWQge1xuICBjb25zdCBicmFuY2hOYW1lUmVnZXggPSAvXlthLXpBLVowLTldW2EtekEtWjAtOS9fLV0qJC87XG4gIGlmICghYnJhbmNoTmFtZVJlZ2V4LnRlc3QobmFtZSkpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0Vycm9yOiBJbnZhbGlkIGJyYW5jaCBuYW1lIGZvcm1hdC4nKTtcbiAgfVxufVxuXG4vKipcbiAqIERldGVybWluZXMgd2hldGhlciBhIHJlbGF0aXZlIHBhdGggaXMgbmVzdGVkIHVuZGVyIGFueSBrbm93biBwYXJlbnQgcGF0aC5cbiAqXG4gKiBUaGUgY2hlY2sgd2Fsa3MgYW5jZXN0b3Igc2VnbWVudHMgb2YgYGRpcmAgYW5kIHJldHVybnMgdHJ1ZSBvbiB0aGUgZmlyc3RcbiAqIG1hdGNoIGluIGBwYXJlbnRTZXRgLlxuICpcbiAqIEBwYXJhbSBkaXIgLSBSZWxhdGl2ZSBwYXRoIHRvIHRlc3QuXG4gKiBAcGFyYW0gcGFyZW50U2V0IC0gQ2FuZGlkYXRlIHBhcmVudCBkaXJlY3RvcmllcyByZXByZXNlbnRlZCBhcyByZWxhdGl2ZSBwYXRocy5cbiAqIEByZXR1cm5zIFRydWUgd2hlbiBgZGlyYCBpcyBuZXN0ZWQgdW5kZXIgYSBwYXRoIGluIGBwYXJlbnRTZXRgLlxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNOZXN0ZWRVbmRlcihkaXI6IHN0cmluZywgcGFyZW50U2V0OiBTZXQ8c3RyaW5nPik6IGJvb2xlYW4ge1xuICBsZXQgY3VycmVudCA9IGRpcjtcbiAgd2hpbGUgKGN1cnJlbnQuaW5jbHVkZXMoJy8nKSkge1xuICAgIGN1cnJlbnQgPSBjdXJyZW50LnN1YnN0cmluZygwLCBjdXJyZW50Lmxhc3RJbmRleE9mKCcvJykpO1xuICAgIGlmIChwYXJlbnRTZXQuaGFzKGN1cnJlbnQpKSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIGZhbHNlO1xufVxuXG4vKipcbiAqIENoZWNrcyB3aGV0aGVyIGEgc3ltbGluayB0YXJnZXQgcG9pbnRzIHRvIGtub3duIG1vbm9yZXBvLWludGVybmFsIGxvY2F0aW9ucy5cbiAqXG4gKiBJbnRlcm5hbCB0YXJnZXRzIGFyZSBwcmVzZXJ2ZWQgYXMgcmVsYXRpdmUgbGlua3MgZHVyaW5nIG5vZGVfbW9kdWxlcyByZXJvdXRlXG4gKiBzbyB3b3Jrc3BhY2UgbGlua3Mga2VlcCB3b3JraW5nIGluc2lkZSBhIHdvcmt0cmVlLlxuICpcbiAqIEBwYXJhbSB0YXJnZXQgLSBTeW1saW5rIHRhcmdldCByZWFkIGZyb20gdGhlIHNvdXJjZSBub2RlX21vZHVsZXMgZW50cnkuXG4gKiBAcmV0dXJucyBUcnVlIHdoZW4gdGhlIHRhcmdldCBzdGFydHMgd2l0aCBhbiBpbnRlcm5hbCBwcmVmaXguXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc0ludGVybmFsU3ltbGluayh0YXJnZXQ6IHN0cmluZyk6IGJvb2xlYW4ge1xuICByZXR1cm4gdGFyZ2V0LnN0YXJ0c1dpdGgoJy4uLycpO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIENyZWF0ZVdvcmt0cmVlUmVzdWx0IHtcbiAgYnJhbmNoOiBzdHJpbmc7XG4gIHdvcmt0cmVlOiBzdHJpbmc7XG4gIGJhc2VTaGE6IHN0cmluZztcbiAgcmVyb3V0ZWRTeW1saW5rcz86IG51bWJlcjtcbn1cblxuLyoqXG4gKiBDcmVhdGVzIGFuZCBjb25maWd1cmVzIGEgbmV3IGdpdCB3b3JrdHJlZS5cbiAqXG4gKiBUaGUgd29ya2Zsb3cgdmFsaWRhdGVzIHRoZSByZWYsIGNyZWF0ZXMgdGhlIHdvcmt0cmVlLCBtaXJyb3JzIGV4aXN0aW5nIHJvb3RcbiAqIHN5bWxpbmtzLCBzeW1saW5rcyBpZ25vcmVkIHBhdGhzLCByZXJvdXRlcyBub2RlX21vZHVsZXMgbGlua3MsIGFuZCB1cGRhdGVzXG4gKiBwZXItd29ya3RyZWUgZ2l0IGV4Y2x1ZGVzLlxuICpcbiAqIFdoZW4gYHJlZmAgaXMgYSBicmFuY2ggbmFtZSwgdGhlIHdvcmt0cmVlIGNoZWNrcyBvdXQgdGhhdCBicmFuY2ggKGNyZWF0aW5nXG4gKiBpdCBpZiBuZWVkZWQpLiBXaGVuIGByZWZgIGlzIGEgdGFnIG9yIGNvbW1pdCBTSEEsIHRoZSB3b3JrdHJlZSBpcyBjcmVhdGVkXG4gKiBpbiBkZXRhY2hlZCBIRUFEIG1vZGUuXG4gKlxuICogQHBhcmFtIHJlZiAtIEJyYW5jaCBuYW1lLCB0YWcgbmFtZSwgb3IgY29tbWl0IFNIQS5cbiAqIEBwYXJhbSBvcHRpb25zIC0gT3B0aW9uYWwgY29uZmlndXJhdGlvbi5cbiAqIEBwYXJhbSBvcHRpb25zLmN3ZCAtIFdvcmtpbmcgZGlyZWN0b3J5IHRvIHVzZSB3aGVuIGxvY2F0aW5nIGdpdCByb290cy4gRGVmYXVsdHMgdG8gYHByb2Nlc3MuY3dkKClgLlxuICogQHJldHVybnMgTWV0YWRhdGEgZGVzY3JpYmluZyB0aGUgY3JlYXRlZCB3b3JrdHJlZSBhbmQgYmFzZSBjb21taXQuXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBjcmVhdGVXb3JrdHJlZShyZWY6IHN0cmluZywgb3B0aW9ucz86IHsgY3dkPzogc3RyaW5nIH0pOiBQcm9taXNlPENyZWF0ZVdvcmt0cmVlUmVzdWx0PiB7XG4gIGNvbnN0IHsgc291cmNlUm9vdCwgcmVwb1Jvb3QgfSA9IGF3YWl0IGZpbmRHaXRSb290cyhvcHRpb25zPy5jd2QgPz8gcHJvY2Vzcy5jd2QoKSk7XG5cbiAgLy8gRGV0ZXJtaW5lIHdoZXRoZXIgdGhpcyBpcyBhbiBleGlzdGluZyByZWYgb3IgYSBuZXcgYnJhbmNoIG5hbWUuXG4gIC8vIHJlc29sdmVSZWZUeXBlIHRocm93cyBmb3IgdW5rbm93biByZWZzOyBhIHZhbGlkIGJyYW5jaCBuYW1lIHRoYXRcbiAgLy8gZG9lc24ndCBleGlzdCB5ZXQgaXMgdHJlYXRlZCBhcyBhIG5ldyBicmFuY2ggdG8gY3JlYXRlLlxuICBsZXQgcmVmVHlwZTogJ2JyYW5jaCcgfCAndGFnJyB8ICdjb21taXQnO1xuICB0cnkge1xuICAgIHJlZlR5cGUgPSBhd2FpdCByZXNvbHZlUmVmVHlwZShyZXBvUm9vdCwgcmVmKTtcbiAgfSBjYXRjaCB7XG4gICAgdmFsaWRhdGVCcmFuY2hOYW1lKHJlZik7XG4gICAgcmVmVHlwZSA9ICdicmFuY2gnO1xuICB9XG5cbiAgaWYgKHJlZlR5cGUgPT09ICdicmFuY2gnKSB7XG4gICAgdmFsaWRhdGVCcmFuY2hOYW1lKHJlZik7XG4gIH1cblxuICBjb25zdCB3b3JrdHJlZURpciA9IHBhdGguam9pbihyZXBvUm9vdCwgJy53b3JrdHJlZXMnLCByZWYpO1xuXG4gIGNvbnN0IHdvcmt0cmVlRXhpc3RzID0gYXdhaXQgY2hlY2tXb3JrdHJlZUV4aXN0cyhyZXBvUm9vdCwgd29ya3RyZWVEaXIpO1xuICBpZiAod29ya3RyZWVFeGlzdHMpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYEVycm9yOiBXb3JrdHJlZSBhbHJlYWR5IGV4aXN0cyBhdCAke3dvcmt0cmVlRGlyfWApO1xuICB9XG5cbiAgYXdhaXQgY2xlYW5TdGFsZVdvcmt0cmVlRGlyKHJlcG9Sb290LCB3b3JrdHJlZURpcik7XG5cbiAgaWYgKHJlZlR5cGUgPT09ICdicmFuY2gnKSB7XG4gICAgY29uc3Qgc3RhcnRQb2ludCA9IGF3YWl0IHJlc29sdmVIZWFkKHNvdXJjZVJvb3QpO1xuICAgIGNvbnN0IGJyYW5jaEV4aXN0cyA9IGF3YWl0IGNoZWNrQnJhbmNoRXhpc3RzKHJlcG9Sb290LCByZWYpO1xuICAgIGF3YWl0IGFkZFdvcmt0cmVlKHsgcmVwb1Jvb3QsIHdvcmt0cmVlRGlyLCBicmFuY2hOYW1lOiByZWYsIGJyYW5jaEV4aXN0cywgc3RhcnRQb2ludCB9KTtcbiAgfSBlbHNlIHtcbiAgICBhd2FpdCBhZGREZXRhY2hlZFdvcmt0cmVlKHJlcG9Sb290LCB3b3JrdHJlZURpciwgcmVmKTtcbiAgfVxuXG4gIGNvbnN0IGlnbm9yZWQgPSBhd2FpdCBkaXNjb3Zlcklnbm9yZWRQYXRocyhzb3VyY2VSb290KTtcbiAgYXdhaXQgY29weUV4aXN0aW5nU3ltbGlua3Moc291cmNlUm9vdCwgd29ya3RyZWVEaXIpO1xuICBhd2FpdCBzeW1saW5rSWdub3JlZFBhdGhzKHsgc291cmNlUm9vdCwgd29ya3RyZWVEaXIsIGlnbm9yZWQgfSk7XG5cbiAgY29uc3QgcmVyb3V0ZWRDb3VudCA9IGF3YWl0IHJlcm91dGVBbGxOb2RlTW9kdWxlcyh7IHNvdXJjZVJvb3QsIHdvcmt0cmVlRGlyLCByZXBvUm9vdCB9KTtcblxuICBjb25zdCBbLCBiYXNlU2hhXSA9IGF3YWl0IFByb21pc2UuYWxsKFtcbiAgICB1cGRhdGVHaXRFeGNsdWRlKHsgd29ya3RyZWVEaXIsIHJlcG9Sb290LCBkaXJlY3RvcmllczogaWdub3JlZC5kaXJlY3RvcmllcywgZmlsZXM6IGlnbm9yZWQuZmlsZXMgfSksXG4gICAgcmVzb2x2ZUhlYWQod29ya3RyZWVEaXIpXG4gIF0pO1xuXG4gIGNvbnN0IHJlc3VsdDogQ3JlYXRlV29ya3RyZWVSZXN1bHQgPSB7XG4gICAgYnJhbmNoOiByZWYsXG4gICAgd29ya3RyZWU6IHdvcmt0cmVlRGlyLFxuICAgIGJhc2VTaGFcbiAgfTtcblxuICBpZiAocmVyb3V0ZWRDb3VudCA+IDApIHtcbiAgICByZXN1bHQucmVyb3V0ZWRTeW1saW5rcyA9IHJlcm91dGVkQ291bnQ7XG4gIH1cblxuICByZXR1cm4gcmVzdWx0O1xufVxuXG4vKipcbiAqIFJlbW92ZXMgc3RhbGUgZGlyZWN0b3J5IHJlbW5hbnRzIGxlZnQgYnkgYSBjcmFzaGVkIHByZXZpb3VzIHNlc3Npb24uXG4gKlxuICogR2l0IGRvZXNuJ3QgdHJhY2sgdGhlIHdvcmt0cmVlLCBidXQgdGhlIGRpcmVjdG9yeSBtYXkgc3RpbGwgZXhpc3Qgb24gZGlzayxcbiAqIHdoaWNoIGNhdXNlcyBgZ2l0IHdvcmt0cmVlIGFkZGAgdG8gZmFpbCB3aXRoIFwiYWxyZWFkeSBleGlzdHNcIi5cbiAqXG4gKiBAcGFyYW0gcmVwb1Jvb3QgLSBQcmltYXJ5IHJlcG9zaXRvcnkgcm9vdCB3aGVyZSBnaXQgY29tbWFuZHMgcnVuLlxuICogQHBhcmFtIHdvcmt0cmVlRGlyIC0gQWJzb2x1dGUgd29ya3RyZWUgcGF0aCBiZWluZyBjcmVhdGVkLlxuICovXG5hc3luYyBmdW5jdGlvbiBjbGVhblN0YWxlV29ya3RyZWVEaXIocmVwb1Jvb3Q6IHN0cmluZywgd29ya3RyZWVEaXI6IHN0cmluZyk6IFByb21pc2U8dm9pZD4ge1xuICB0cnkge1xuICAgIGF3YWl0IGZzLmFjY2Vzcyh3b3JrdHJlZURpcik7XG4gICAgYXdhaXQgZnMucm0od29ya3RyZWVEaXIsIHsgcmVjdXJzaXZlOiB0cnVlIH0pO1xuICAgIGF3YWl0IGV4ZWNGaWxlQXN5bmMoJ2dpdCcsIFsnd29ya3RyZWUnLCAncHJ1bmUnXSwgeyBjd2Q6IHJlcG9Sb290LCB0aW1lb3V0OiAzMF8wMDAgfSk7XG4gIH0gY2F0Y2ggKGVycm9yOiB1bmtub3duKSB7XG4gICAgaWYgKChlcnJvciBhcyBOb2RlSlMuRXJybm9FeGNlcHRpb24pLmNvZGUgIT09ICdFTk9FTlQnKSB7XG4gICAgICB0aHJvdyBlcnJvcjtcbiAgICB9XG4gIH1cbn1cblxuaW50ZXJmYWNlIEdpdFJvb3RzIHtcbiAgc291cmNlUm9vdDogc3RyaW5nO1xuICByZXBvUm9vdDogc3RyaW5nO1xufVxuXG4vKipcbiAqIExvY2F0ZXMgdGhlIGN1cnJlbnQgZ2l0IHNvdXJjZSByb290IGFuZCBwcmltYXJ5IHJlcG9zaXRvcnkgcm9vdC5cbiAqXG4gKiBTdXBwb3J0cyBib3RoIHN0YW5kYXJkIGNoZWNrb3V0cyAoYC5naXRgIGRpcmVjdG9yeSkgYW5kIHdvcmt0cmVlIGNoZWNrb3V0c1xuICogKGAuZ2l0YCBmaWxlIHBvaW50aW5nIGludG8gYC5naXQvd29ya3RyZWVzLy4uLmApLlxuICpcbiAqIEBwYXJhbSBzdGFydERpciAtIERpcmVjdG9yeSB3aGVyZSB1cHdhcmQgc2VhcmNoIGJlZ2lucy5cbiAqIEB0aHJvd3Mge0Vycm9yfSBXaGVuIG5vIGdpdCByZXBvc2l0b3J5IG1hcmtlciBpcyBmb3VuZC5cbiAqIEByZXR1cm5zIFBhdGhzIGZvciB0aGUgY3VycmVudCBjaGVja291dCByb290IGFuZCB0aGUgcHJpbWFyeSByZXBvIHJvb3QuXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBmaW5kR2l0Um9vdHMoc3RhcnREaXI6IHN0cmluZyk6IFByb21pc2U8R2l0Um9vdHM+IHtcbiAgbGV0IGN1cnJlbnREaXIgPSBwYXRoLnJlc29sdmUoc3RhcnREaXIpO1xuICB3aGlsZSAoY3VycmVudERpciAhPT0gJy8nKSB7XG4gICAgY29uc3QgZ2l0UGF0aCA9IHBhdGguam9pbihjdXJyZW50RGlyLCAnLmdpdCcpO1xuICAgIHRyeSB7XG4gICAgICBjb25zdCBzdGF0cyA9IGF3YWl0IGZzLmxzdGF0KGdpdFBhdGgpO1xuICAgICAgaWYgKHN0YXRzLmlzRGlyZWN0b3J5KCkpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICBzb3VyY2VSb290OiBjdXJyZW50RGlyLFxuICAgICAgICAgIHJlcG9Sb290OiBjdXJyZW50RGlyXG4gICAgICAgIH07XG4gICAgICB9XG4gICAgICBpZiAoc3RhdHMuaXNGaWxlKCkpIHtcbiAgICAgICAgY29uc3QgZ2l0RmlsZUNvbnRlbnQgPSBhd2FpdCBmcy5yZWFkRmlsZShnaXRQYXRoLCAndXRmLTgnKTtcbiAgICAgICAgY29uc3QgZ2l0ZGlyTGluZSA9IGdpdEZpbGVDb250ZW50LnRyaW0oKTtcbiAgICAgICAgY29uc3QgZ2l0ZGlyUGF0aCA9IGdpdGRpckxpbmUucmVwbGFjZSgvXmdpdGRpcjpcXHMqLywgJycpO1xuICAgICAgICBjb25zdCBtYWluR2l0RGlyID0gZ2l0ZGlyUGF0aC5yZXBsYWNlKC9cXC93b3JrdHJlZXNcXC9bXi9dKyQvLCAnJyk7XG4gICAgICAgIGNvbnN0IHJlcG9Sb290ID0gbWFpbkdpdERpci5yZXBsYWNlKC9cXC9cXC5naXQkLywgJycpO1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgIHNvdXJjZVJvb3Q6IGN1cnJlbnREaXIsXG4gICAgICAgICAgcmVwb1Jvb3RcbiAgICAgICAgfTtcbiAgICAgIH1cbiAgICB9IGNhdGNoIChlcnJvcjogdW5rbm93bikge1xuICAgICAgaWYgKChlcnJvciBhcyBOb2RlSlMuRXJybm9FeGNlcHRpb24pLmNvZGUgIT09ICdFTk9FTlQnKSB7XG4gICAgICAgIHRocm93IGVycm9yO1xuICAgICAgfVxuICAgIH1cbiAgICBjdXJyZW50RGlyID0gcGF0aC5kaXJuYW1lKGN1cnJlbnREaXIpO1xuICB9XG4gIHRocm93IG5ldyBFcnJvcignTm90IGluIGEgZ2l0IHJlcG9zaXRvcnknKTtcbn1cblxuLyoqXG4gKiBSZXNvbHZlcyB0aGUgSEVBRCBjb21taXQgU0hBIGZvciBhIHJlcG9zaXRvcnkgZGlyZWN0b3J5LlxuICpcbiAqIEBwYXJhbSBjd2QgLSBSZXBvc2l0b3J5IGRpcmVjdG9yeSBwYXNzZWQgdG8gYGdpdCByZXYtcGFyc2UgSEVBRGAuXG4gKiBAcmV0dXJucyBUcmltbWVkIGNvbW1pdCBTSEEgc3RyaW5nLlxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcmVzb2x2ZUhlYWQoY3dkOiBzdHJpbmcpOiBQcm9taXNlPHN0cmluZz4ge1xuICBjb25zdCB7IHN0ZG91dCB9ID0gYXdhaXQgZXhlY0ZpbGVBc3luYygnZ2l0JywgWydyZXYtcGFyc2UnLCAnSEVBRCddLCB7IGN3ZCwgdGltZW91dDogNV8wMDAgfSk7XG4gIHJldHVybiBzdGRvdXQudHJpbSgpO1xufVxuXG4vKipcbiAqIENoZWNrcyB3aGV0aGVyIGEgd29ya3RyZWUgcGF0aCBpcyBhbHJlYWR5IHJlZ2lzdGVyZWQgd2l0aCBnaXQuXG4gKlxuICogQHBhcmFtIHJlcG9Sb290IC0gUHJpbWFyeSByZXBvc2l0b3J5IHJvb3Qgd2hlcmUgZ2l0IGNvbW1hbmRzIHJ1bi5cbiAqIEBwYXJhbSB3b3JrdHJlZURpciAtIEFic29sdXRlIHdvcmt0cmVlIHBhdGggYmVpbmcgY3JlYXRlZC5cbiAqIEByZXR1cm5zIFRydWUgd2hlbiBgZ2l0IHdvcmt0cmVlIGxpc3RgIGFscmVhZHkgY29udGFpbnMgYHdvcmt0cmVlRGlyYC5cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGNoZWNrV29ya3RyZWVFeGlzdHMocmVwb1Jvb3Q6IHN0cmluZywgd29ya3RyZWVEaXI6IHN0cmluZyk6IFByb21pc2U8Ym9vbGVhbj4ge1xuICBjb25zdCB7IHN0ZG91dCB9ID0gYXdhaXQgZXhlY0ZpbGVBc3luYygnZ2l0JywgWyd3b3JrdHJlZScsICdsaXN0J10sIHsgY3dkOiByZXBvUm9vdCwgdGltZW91dDogMzBfMDAwIH0pO1xuICByZXR1cm4gc3Rkb3V0LmluY2x1ZGVzKHdvcmt0cmVlRGlyKTtcbn1cblxuLyoqXG4gKiBDaGVja3Mgd2hldGhlciBhIGJyYW5jaCBhbHJlYWR5IGV4aXN0cyBpbiB0aGUgcmVwb3NpdG9yeS5cbiAqXG4gKiBAcGFyYW0gcmVwb1Jvb3QgLSBQcmltYXJ5IHJlcG9zaXRvcnkgcm9vdCB3aGVyZSBnaXQgY29tbWFuZHMgcnVuLlxuICogQHBhcmFtIGJyYW5jaE5hbWUgLSBCcmFuY2ggbmFtZSB0byBxdWVyeS5cbiAqIEByZXR1cm5zIFRydWUgd2hlbiBhdCBsZWFzdCBvbmUgbWF0Y2hpbmcgbG9jYWwgYnJhbmNoIGlzIGxpc3RlZC5cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGNoZWNrQnJhbmNoRXhpc3RzKHJlcG9Sb290OiBzdHJpbmcsIGJyYW5jaE5hbWU6IHN0cmluZyk6IFByb21pc2U8Ym9vbGVhbj4ge1xuICBjb25zdCB7IHN0ZG91dCB9ID0gYXdhaXQgZXhlY0ZpbGVBc3luYygnZ2l0JywgWydicmFuY2gnLCAnLS1saXN0JywgYnJhbmNoTmFtZV0sIHtcbiAgICBjd2Q6IHJlcG9Sb290LFxuICAgIHRpbWVvdXQ6IDMwXzAwMFxuICB9KTtcbiAgcmV0dXJuIHN0ZG91dC50cmltKCkubGVuZ3RoID4gMDtcbn1cblxuLyoqXG4gKiBEZXRlcm1pbmVzIHdoZXRoZXIgYSBnaXQgcmVmIGlzIGEgYnJhbmNoLCB0YWcsIG9yIGNvbW1pdCBTSEEuXG4gKlxuICogQ2hlY2tzIGxvY2FsIGJyYW5jaGVzIGZpcnN0LCB0aGVuIHRhZ3MsIHRoZW4gZmFsbHMgYmFjayB0byB2ZXJpZnlpbmdcbiAqIHRoZSByZWYgcmVzb2x2ZXMgYXMgYSBjb21taXQuXG4gKlxuICogQHBhcmFtIHJlcG9Sb290IC0gUHJpbWFyeSByZXBvc2l0b3J5IHJvb3Qgd2hlcmUgZ2l0IGNvbW1hbmRzIHJ1bi5cbiAqIEBwYXJhbSByZWYgLSBUaGUgcmVmIHRvIGNsYXNzaWZ5LlxuICogQHRocm93cyB7RXJyb3J9IFdoZW4gdGhlIHJlZiBkb2VzIG5vdCByZXNvbHZlIHRvIGFueSBrbm93biBnaXQgb2JqZWN0LlxuICogQHJldHVybnMgVGhlIHJlZiB0eXBlOiBgJ2JyYW5jaCdgLCBgJ3RhZydgLCBvciBgJ2NvbW1pdCdgLlxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcmVzb2x2ZVJlZlR5cGUocmVwb1Jvb3Q6IHN0cmluZywgcmVmOiBzdHJpbmcpOiBQcm9taXNlPCdicmFuY2gnIHwgJ3RhZycgfCAnY29tbWl0Jz4ge1xuICBjb25zdCBicmFuY2hFeGlzdHMgPSBhd2FpdCBjaGVja0JyYW5jaEV4aXN0cyhyZXBvUm9vdCwgcmVmKTtcbiAgaWYgKGJyYW5jaEV4aXN0cykgcmV0dXJuICdicmFuY2gnO1xuXG4gIGNvbnN0IHsgc3Rkb3V0OiB0YWdPdXRwdXQgfSA9IGF3YWl0IGV4ZWNGaWxlQXN5bmMoJ2dpdCcsIFsndGFnJywgJy0tbGlzdCcsIHJlZl0sIHtcbiAgICBjd2Q6IHJlcG9Sb290LFxuICAgIHRpbWVvdXQ6IDMwXzAwMFxuICB9KTtcbiAgaWYgKHRhZ091dHB1dC50cmltKCkubGVuZ3RoID4gMCkgcmV0dXJuICd0YWcnO1xuXG4gIHRyeSB7XG4gICAgYXdhaXQgZXhlY0ZpbGVBc3luYygnZ2l0JywgWydyZXYtcGFyc2UnLCAnLS12ZXJpZnknLCBgJHtyZWZ9Xntjb21taXR9YF0sIHtcbiAgICAgIGN3ZDogcmVwb1Jvb3QsXG4gICAgICB0aW1lb3V0OiA1XzAwMFxuICAgIH0pO1xuICAgIHJldHVybiAnY29tbWl0JztcbiAgfSBjYXRjaCB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBFcnJvcjogJyR7cmVmfScgZG9lcyBub3QgcmVzb2x2ZSB0byBhIGJyYW5jaCwgdGFnLCBvciBjb21taXQuYCk7XG4gIH1cbn1cblxuaW50ZXJmYWNlIEFkZFdvcmt0cmVlT3B0aW9ucyB7XG4gIHJlcG9Sb290OiBzdHJpbmc7XG4gIHdvcmt0cmVlRGlyOiBzdHJpbmc7XG4gIGJyYW5jaE5hbWU6IHN0cmluZztcbiAgYnJhbmNoRXhpc3RzOiBib29sZWFuO1xuICBzdGFydFBvaW50OiBzdHJpbmc7XG59XG5cbi8qKlxuICogQWRkcyBhIGdpdCB3b3JrdHJlZSwgY3JlYXRpbmcgdGhlIGJyYW5jaCB3aGVuIG5lZWRlZC5cbiAqXG4gKiBVc2VzIGBnaXQgd29ya3RyZWUgYWRkIC1iYCBmb3IgbmV3IGJyYW5jaGVzIGFuZCBwbGFpbiBgZ2l0IHdvcmt0cmVlIGFkZGBcbiAqIHdoZW4gYXR0YWNoaW5nIHRvIGFuIGV4aXN0aW5nIGJyYW5jaC5cbiAqXG4gKiBAcGFyYW0gb3B0cyAtIFdvcmt0cmVlIGNyZWF0aW9uIG9wdGlvbnMgYW5kIGJyYW5jaCBleGlzdGVuY2Ugc3RhdGUuXG4gKiBAcmV0dXJucyBObyB2YWx1ZS5cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGFkZFdvcmt0cmVlKG9wdHM6IEFkZFdvcmt0cmVlT3B0aW9ucyk6IFByb21pc2U8dm9pZD4ge1xuICBjb25zdCBhcmdzID0gb3B0cy5icmFuY2hFeGlzdHNcbiAgICA/IFsnd29ya3RyZWUnLCAnYWRkJywgb3B0cy53b3JrdHJlZURpciwgb3B0cy5icmFuY2hOYW1lXVxuICAgIDogWyd3b3JrdHJlZScsICdhZGQnLCAnLWInLCBvcHRzLmJyYW5jaE5hbWUsIG9wdHMud29ya3RyZWVEaXIsIG9wdHMuc3RhcnRQb2ludF07XG4gIGF3YWl0IGV4ZWNGaWxlQXN5bmMoJ2dpdCcsIGFyZ3MsIHsgY3dkOiBvcHRzLnJlcG9Sb290LCB0aW1lb3V0OiAzMF8wMDAgfSk7XG59XG5cbi8qKlxuICogQWRkcyBhIGdpdCB3b3JrdHJlZSBpbiBkZXRhY2hlZCBIRUFEIG1vZGUgYXQgdGhlIGdpdmVuIHJlZi5cbiAqXG4gKiBVc2VkIGZvciB0YWdzIGFuZCBjb21taXQgU0hBcyB3aGVyZSBubyBicmFuY2ggYXNzb2NpYXRpb24gaXMgbmVlZGVkLlxuICpcbiAqIEBwYXJhbSByZXBvUm9vdCAtIFByaW1hcnkgcmVwb3NpdG9yeSByb290IHdoZXJlIGdpdCBjb21tYW5kcyBydW4uXG4gKiBAcGFyYW0gd29ya3RyZWVEaXIgLSBBYnNvbHV0ZSBwYXRoIGZvciB0aGUgbmV3IHdvcmt0cmVlLlxuICogQHBhcmFtIHJlZiAtIFRhZyBuYW1lIG9yIGNvbW1pdCBTSEEgdG8gY2hlY2sgb3V0LlxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gYWRkRGV0YWNoZWRXb3JrdHJlZShyZXBvUm9vdDogc3RyaW5nLCB3b3JrdHJlZURpcjogc3RyaW5nLCByZWY6IHN0cmluZyk6IFByb21pc2U8dm9pZD4ge1xuICBhd2FpdCBleGVjRmlsZUFzeW5jKCdnaXQnLCBbJ3dvcmt0cmVlJywgJ2FkZCcsICctLWRldGFjaCcsIHdvcmt0cmVlRGlyLCByZWZdLCB7XG4gICAgY3dkOiByZXBvUm9vdCxcbiAgICB0aW1lb3V0OiAzMF8wMDBcbiAgfSk7XG59XG5cbmludGVyZmFjZSBJZ25vcmVkUGF0aHMge1xuICBkaXJlY3Rvcmllczogc3RyaW5nW107XG4gIGZpbGVzOiBzdHJpbmdbXTtcbn1cblxuLyoqXG4gKiBEaXNjb3ZlcnMgaWdub3JlZCBmaWxlcyBhbmQgZGlyZWN0b3JpZXMgdW5kZXIgYSBzb3VyY2Ugcm9vdC5cbiAqXG4gKiBQYXRocyBhcmUgcmV0dXJuZWQgcmVsYXRpdmUgdG8gYHNvdXJjZVJvb3RgIGFuZCBgLndvcmt0cmVlc2AgY29udGVudCBpc1xuICogZmlsdGVyZWQgb3V0IHRvIGF2b2lkIHNlbGYtcmVmZXJlbnRpYWwgc3ltbGlua2luZy5cbiAqXG4gKiBAcGFyYW0gc291cmNlUm9vdCAtIFNvdXJjZSBjaGVja291dCByb290IHVzZWQgZm9yIGdpdCBkaXNjb3ZlcnkuXG4gKiBAcmV0dXJucyBTZXBhcmF0ZSBsaXN0cyBvZiBpZ25vcmVkIGRpcmVjdG9yaWVzIGFuZCBpZ25vcmVkIGZpbGVzLlxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZGlzY292ZXJJZ25vcmVkUGF0aHMoc291cmNlUm9vdDogc3RyaW5nKTogUHJvbWlzZTxJZ25vcmVkUGF0aHM+IHtcbiAgY29uc3QgeyBzdGRvdXQgfSA9IGF3YWl0IGV4ZWNGaWxlQXN5bmMoXG4gICAgJ2dpdCcsXG4gICAgWyctQycsIHNvdXJjZVJvb3QsICdscy1maWxlcycsICctLWlnbm9yZWQnLCAnLS1leGNsdWRlLXN0YW5kYXJkJywgJy0tZGlyZWN0b3J5JywgJy0tb3RoZXJzJ10sXG4gICAgeyBjd2Q6IHNvdXJjZVJvb3QsIHRpbWVvdXQ6IDMwXzAwMCB9XG4gICk7XG5cbiAgY29uc3QgbGluZXMgPSBzdGRvdXQuc3BsaXQoJ1xcbicpLmZpbHRlcigobGluZSkgPT4gbGluZS5sZW5ndGggPiAwICYmICFsaW5lLnN0YXJ0c1dpdGgoJy53b3JrdHJlZXMnKSk7XG4gIGNvbnN0IGRpcmVjdG9yaWVzID0gbGluZXMuZmlsdGVyKChsKSA9PiBsLmVuZHNXaXRoKCcvJykpLm1hcCgobCkgPT4gbC5zbGljZSgwLCAtMSkpO1xuICBjb25zdCBmaWxlcyA9IGxpbmVzLmZpbHRlcigobCkgPT4gIWwuZW5kc1dpdGgoJy8nKSk7XG5cbiAgcmV0dXJuIHsgZGlyZWN0b3JpZXMsIGZpbGVzIH07XG59XG5cbmludGVyZmFjZSBTeW1saW5rSWdub3JlZFBhdGhzT3B0aW9ucyB7XG4gIHNvdXJjZVJvb3Q6IHN0cmluZztcbiAgd29ya3RyZWVEaXI6IHN0cmluZztcbiAgaWdub3JlZDogSWdub3JlZFBhdGhzO1xufVxuXG5pbnRlcmZhY2UgU3ltbGlua0lnbm9yZWRQYXRoc1Jlc3VsdCB7XG4gIGRpckNvdW50OiBudW1iZXI7XG4gIGZpbGVDb3VudDogbnVtYmVyO1xufVxuXG4vKipcbiAqIFN5bWxpbmtzIGlnbm9yZWQgZGlyZWN0b3JpZXMgYW5kIGZpbGVzIGZyb20gc291cmNlIGNoZWNrb3V0IGludG8gYSB3b3JrdHJlZS5cbiAqXG4gKiBOZXN0ZWQgaWdub3JlZCBkaXJlY3RvcmllcyBhcmUgY29sbGFwc2VkIHNvIG9ubHkgdG9wLWxldmVsIGlnbm9yZWQgZGlyZWN0b3J5XG4gKiBsaW5rcyBhcmUgY3JlYXRlZC5cbiAqXG4gKiBAcGFyYW0gb3B0cyAtIFNvdXJjZSByb290LCBkZXN0aW5hdGlvbiB3b3JrdHJlZSwgYW5kIGlnbm9yZWQgcGF0aCBsaXN0cy5cbiAqIEByZXR1cm5zIENvdW50cyBvZiBzdWNjZXNzZnVsbHkgY3JlYXRlZCBkaXJlY3RvcnkgYW5kIGZpbGUgc3ltbGlua3MuXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBzeW1saW5rSWdub3JlZFBhdGhzKG9wdHM6IFN5bWxpbmtJZ25vcmVkUGF0aHNPcHRpb25zKTogUHJvbWlzZTxTeW1saW5rSWdub3JlZFBhdGhzUmVzdWx0PiB7XG4gIGNvbnN0IHsgc291cmNlUm9vdCwgd29ya3RyZWVEaXIsIGlnbm9yZWQgfSA9IG9wdHM7XG4gIGNvbnN0IGRpclNldCA9IG5ldyBTZXQoaWdub3JlZC5kaXJlY3Rvcmllcyk7XG4gIGNvbnN0IG5vbk5lc3RlZERpcnMgPSBpZ25vcmVkLmRpcmVjdG9yaWVzLmZpbHRlcigoZGlyKSA9PiAhaXNOZXN0ZWRVbmRlcihkaXIsIGRpclNldCkpO1xuXG4gIGNvbnN0IGNyZWF0ZURpclN5bWxpbmsgPSBhc3luYyAoZGlyOiBzdHJpbmcpOiBQcm9taXNlPGJvb2xlYW4+ID0+IHtcbiAgICB0cnkge1xuICAgICAgY29uc3Qgc291cmNlUGF0aCA9IHBhdGguam9pbihzb3VyY2VSb290LCBkaXIpO1xuICAgICAgdHJ5IHtcbiAgICAgICAgYXdhaXQgZnMubHN0YXQoc291cmNlUGF0aCk7XG4gICAgICB9IGNhdGNoIChlcnJvcjogdW5rbm93bikge1xuICAgICAgICBpZiAoKGVycm9yIGFzIE5vZGVKUy5FcnJub0V4Y2VwdGlvbikuY29kZSA9PT0gJ0VOT0VOVCcpIHtcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgcHJvY2Vzcy5zdGRlcnIud3JpdGUoXG4gICAgICAgICAgYGNyZWF0ZS13b3JrdHJlZTogdW5leHBlY3RlZCBlcnJvciBpbiBsc3RhdDogJHtlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6IFN0cmluZyhlcnJvcil9XFxuYFxuICAgICAgICApO1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgICBjb25zdCBkZXN0UGF0aCA9IHBhdGguam9pbih3b3JrdHJlZURpciwgZGlyKTtcbiAgICAgIGNvbnN0IHBhcmVudERpciA9IHBhdGguZGlybmFtZShkaXIpO1xuICAgICAgaWYgKHBhcmVudERpciAhPT0gJy4nKSB7XG4gICAgICAgIGF3YWl0IGZzLm1rZGlyKHBhdGguam9pbih3b3JrdHJlZURpciwgcGFyZW50RGlyKSwgeyByZWN1cnNpdmU6IHRydWUgfSk7XG4gICAgICB9XG4gICAgICBhd2FpdCBmcy5zeW1saW5rKHNvdXJjZVBhdGgsIGRlc3RQYXRoKTtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH0gY2F0Y2ggKGVycm9yOiB1bmtub3duKSB7XG4gICAgICBjb25zdCBjb2RlID0gKGVycm9yIGFzIE5vZGVKUy5FcnJub0V4Y2VwdGlvbikuY29kZTtcbiAgICAgIGlmIChjb2RlID09PSAnRUVYSVNUJyB8fCBjb2RlID09PSAnRU5PRU5UJykge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgICBwcm9jZXNzLnN0ZGVyci53cml0ZShcbiAgICAgICAgYGNyZWF0ZS13b3JrdHJlZTogdW5leHBlY3RlZCBlcnJvciBpbiBzeW1saW5rOiAke2Vycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogU3RyaW5nKGVycm9yKX1cXG5gXG4gICAgICApO1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgfTtcblxuICBjb25zdCBjcmVhdGVGaWxlU3ltbGluayA9IGFzeW5jIChmaWxlOiBzdHJpbmcpOiBQcm9taXNlPGJvb2xlYW4+ID0+IHtcbiAgICB0cnkge1xuICAgICAgY29uc3Qgc291cmNlUGF0aCA9IHBhdGguam9pbihzb3VyY2VSb290LCBmaWxlKTtcbiAgICAgIHRyeSB7XG4gICAgICAgIGF3YWl0IGZzLmxzdGF0KHNvdXJjZVBhdGgpO1xuICAgICAgfSBjYXRjaCAoZXJyb3I6IHVua25vd24pIHtcbiAgICAgICAgaWYgKChlcnJvciBhcyBOb2RlSlMuRXJybm9FeGNlcHRpb24pLmNvZGUgPT09ICdFTk9FTlQnKSB7XG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIHByb2Nlc3Muc3RkZXJyLndyaXRlKFxuICAgICAgICAgIGBjcmVhdGUtd29ya3RyZWU6IHVuZXhwZWN0ZWQgZXJyb3IgaW4gbHN0YXQ6ICR7ZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiBTdHJpbmcoZXJyb3IpfVxcbmBcbiAgICAgICAgKTtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgICAgY29uc3QgZGVzdFBhdGggPSBwYXRoLmpvaW4od29ya3RyZWVEaXIsIGZpbGUpO1xuICAgICAgY29uc3QgcGFyZW50RGlyID0gcGF0aC5kaXJuYW1lKGZpbGUpO1xuICAgICAgaWYgKHBhcmVudERpciAhPT0gJy4nKSB7XG4gICAgICAgIGF3YWl0IGZzLm1rZGlyKHBhdGguam9pbih3b3JrdHJlZURpciwgcGFyZW50RGlyKSwgeyByZWN1cnNpdmU6IHRydWUgfSk7XG4gICAgICB9XG4gICAgICBhd2FpdCBmcy5zeW1saW5rKHNvdXJjZVBhdGgsIGRlc3RQYXRoKTtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH0gY2F0Y2ggKGVycm9yOiB1bmtub3duKSB7XG4gICAgICBjb25zdCBjb2RlID0gKGVycm9yIGFzIE5vZGVKUy5FcnJub0V4Y2VwdGlvbikuY29kZTtcbiAgICAgIGlmIChjb2RlID09PSAnRUVYSVNUJyB8fCBjb2RlID09PSAnRU5PRU5UJykge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgICBwcm9jZXNzLnN0ZGVyci53cml0ZShcbiAgICAgICAgYGNyZWF0ZS13b3JrdHJlZTogdW5leHBlY3RlZCBlcnJvciBpbiBzeW1saW5rOiAke2Vycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogU3RyaW5nKGVycm9yKX1cXG5gXG4gICAgICApO1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgfTtcblxuICBjb25zdCBkaXJSZXN1bHRzID0gYXdhaXQgUHJvbWlzZS5hbGwobm9uTmVzdGVkRGlycy5tYXAoY3JlYXRlRGlyU3ltbGluaykpO1xuICBjb25zdCBub25OZXN0ZWRGaWxlcyA9IGlnbm9yZWQuZmlsZXMuZmlsdGVyKChmaWxlKSA9PiAhaXNOZXN0ZWRVbmRlcihmaWxlLCBkaXJTZXQpKTtcbiAgY29uc3QgZmlsZVJlc3VsdHMgPSBhd2FpdCBQcm9taXNlLmFsbChub25OZXN0ZWRGaWxlcy5tYXAoY3JlYXRlRmlsZVN5bWxpbmspKTtcblxuICBjb25zdCBkaXJDb3VudCA9IGRpclJlc3VsdHMuZmlsdGVyKChyKSA9PiByKS5sZW5ndGg7XG4gIGNvbnN0IGZpbGVDb3VudCA9IGZpbGVSZXN1bHRzLmZpbHRlcigocikgPT4gcikubGVuZ3RoO1xuXG4gIHJldHVybiB7IGRpckNvdW50LCBmaWxlQ291bnQgfTtcbn1cblxuLyoqXG4gKiBSZXBsaWNhdGVzIHJvb3QtbGV2ZWwgc3ltbGlua3MgZnJvbSB0aGUgc291cmNlIGNoZWNrb3V0IGludG8gdGhlIHdvcmt0cmVlLlxuICpcbiAqIEV4aXN0aW5nIGRlc3RpbmF0aW9uIGVudHJpZXMgYXJlIGxlZnQgdW50b3VjaGVkLlxuICpcbiAqIEBwYXJhbSBzb3VyY2VSb290IC0gU291cmNlIGNoZWNrb3V0IHJvb3QuXG4gKiBAcGFyYW0gd29ya3RyZWVEaXIgLSBEZXN0aW5hdGlvbiB3b3JrdHJlZSByb290LlxuICogQHJldHVybnMgTnVtYmVyIG9mIHN5bWxpbmtzIGNyZWF0ZWQgaW4gdGhlIGRlc3RpbmF0aW9uIHJvb3QuXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBjb3B5RXhpc3RpbmdTeW1saW5rcyhzb3VyY2VSb290OiBzdHJpbmcsIHdvcmt0cmVlRGlyOiBzdHJpbmcpOiBQcm9taXNlPG51bWJlcj4ge1xuICBjb25zdCBlbnRyaWVzID0gYXdhaXQgZnMucmVhZGRpcihzb3VyY2VSb290LCB7IHdpdGhGaWxlVHlwZXM6IHRydWUgfSk7XG4gIGNvbnN0IHN5bWxpbmtzID0gZW50cmllcy5maWx0ZXIoKGUpID0+IGUuaXNTeW1ib2xpY0xpbmsoKSAmJiBlLm5hbWUgIT09ICcuZ2l0JyAmJiBlLm5hbWUgIT09ICcud29ya3RyZWVzJyk7XG5cbiAgY29uc3QgY29weVN5bWxpbmsgPSBhc3luYyAobmFtZTogc3RyaW5nKTogUHJvbWlzZTxib29sZWFuPiA9PiB7XG4gICAgY29uc3QgZGVzdFBhdGggPSBwYXRoLmpvaW4od29ya3RyZWVEaXIsIG5hbWUpO1xuICAgIHRyeSB7XG4gICAgICBhd2FpdCBmcy5sc3RhdChkZXN0UGF0aCk7XG4gICAgICByZXR1cm4gZmFsc2U7IC8vIERlc3RpbmF0aW9uIGFscmVhZHkgZXhpc3RzXG4gICAgfSBjYXRjaCAoZXJyb3I6IHVua25vd24pIHtcbiAgICAgIGlmICgoZXJyb3IgYXMgTm9kZUpTLkVycm5vRXhjZXB0aW9uKS5jb2RlICE9PSAnRU5PRU5UJykge1xuICAgICAgICB0aHJvdyBlcnJvcjtcbiAgICAgIH1cbiAgICB9XG4gICAgY29uc3Qgc291cmNlTGlua1BhdGggPSBwYXRoLmpvaW4oc291cmNlUm9vdCwgbmFtZSk7XG5cbiAgICAvLyBTa2lwIHNlbGYtcmVmZXJlbmNpbmcgc3ltbGlua3MgKHRhcmdldCByZXNvbHZlcyBiYWNrIHRvIHRoZSBzeW1saW5rIGl0c2VsZilcbiAgICBjb25zdCB0YXJnZXQgPSBhd2FpdCBmcy5yZWFkbGluayhzb3VyY2VMaW5rUGF0aCk7XG4gICAgY29uc3QgcmVzb2x2ZWRUYXJnZXQgPSBwYXRoLnJlc29sdmUoc291cmNlUm9vdCwgdGFyZ2V0KTtcbiAgICBpZiAocmVzb2x2ZWRUYXJnZXQgPT09IHNvdXJjZUxpbmtQYXRoKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgYXdhaXQgZnMuc3ltbGluayhzb3VyY2VMaW5rUGF0aCwgZGVzdFBhdGgpO1xuICAgIHJldHVybiB0cnVlO1xuICB9O1xuXG4gIGNvbnN0IHJlc3VsdHMgPSBhd2FpdCBQcm9taXNlLmFsbChzeW1saW5rcy5tYXAoKGUpID0+IGNvcHlTeW1saW5rKGUubmFtZSkpKTtcbiAgcmV0dXJuIHJlc3VsdHMuZmlsdGVyKChyKSA9PiByKS5sZW5ndGg7XG59XG5cbmludGVyZmFjZSBSZXJvdXRlTm9kZU1vZHVsZXNPcHRpb25zIHtcbiAgc291cmNlTm9kZU1vZHVsZXM6IHN0cmluZztcbiAgZGVzdE5vZGVNb2R1bGVzOiBzdHJpbmc7XG59XG5cbi8qKlxuICogTWlycm9ycyBhIG5vZGVfbW9kdWxlcyB0cmVlIGludG8gdGhlIHdvcmt0cmVlIHVzaW5nIHN5bWxpbmtzLlxuICpcbiAqIEludGVybmFsIHdvcmtzcGFjZSBsaW5rcyBrZWVwIHRoZWlyIG9yaWdpbmFsIHJlbGF0aXZlIHRhcmdldHMgd2hpbGUgZXh0ZXJuYWxcbiAqIGxpbmtzIGFuZCBub24tbGluayBlbnRyaWVzIGFyZSByZXByZXNlbnRlZCBhcyBzeW1saW5rcyB0byBzb3VyY2UgcGF0aHMuXG4gKlxuICogQHBhcmFtIG9wdHMgLSBTb3VyY2UgYW5kIGRlc3RpbmF0aW9uIG5vZGVfbW9kdWxlcyBkaXJlY3Rvcmllcy5cbiAqIEByZXR1cm5zIENvdW50IG9mIGludGVybmFsIHdvcmtzcGFjZSBzeW1saW5rcyByZWNyZWF0ZWQgYnkgdGFyZ2V0IHBhdGguXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiByZXJvdXRlTm9kZU1vZHVsZXMob3B0czogUmVyb3V0ZU5vZGVNb2R1bGVzT3B0aW9ucyk6IFByb21pc2U8bnVtYmVyPiB7XG4gIGNvbnN0IHsgc291cmNlTm9kZU1vZHVsZXMsIGRlc3ROb2RlTW9kdWxlcyB9ID0gb3B0cztcblxuICB0cnkge1xuICAgIGF3YWl0IGZzLmxzdGF0KHNvdXJjZU5vZGVNb2R1bGVzKTtcbiAgfSBjYXRjaCAoZXJyb3I6IHVua25vd24pIHtcbiAgICBpZiAoKGVycm9yIGFzIE5vZGVKUy5FcnJub0V4Y2VwdGlvbikuY29kZSA9PT0gJ0VOT0VOVCcpIHtcbiAgICAgIHJldHVybiAwO1xuICAgIH1cbiAgICB0aHJvdyBlcnJvcjtcbiAgfVxuXG4gIHRyeSB7XG4gICAgY29uc3QgZGVzdFN0YXRzID0gYXdhaXQgZnMubHN0YXQoZGVzdE5vZGVNb2R1bGVzKTtcbiAgICBpZiAoZGVzdFN0YXRzLmlzU3ltYm9saWNMaW5rKCkpIHtcbiAgICAgIGF3YWl0IGZzLnVubGluayhkZXN0Tm9kZU1vZHVsZXMpO1xuICAgIH1cbiAgfSBjYXRjaCAoZXJyb3I6IHVua25vd24pIHtcbiAgICBpZiAoKGVycm9yIGFzIE5vZGVKUy5FcnJub0V4Y2VwdGlvbikuY29kZSAhPT0gJ0VOT0VOVCcpIHtcbiAgICAgIHRocm93IGVycm9yO1xuICAgIH1cbiAgfVxuXG4gIGF3YWl0IGZzLm1rZGlyKGRlc3ROb2RlTW9kdWxlcywgeyByZWN1cnNpdmU6IHRydWUgfSk7XG5cbiAgY29uc3QgZW50cmllcyA9IGF3YWl0IGZzLnJlYWRkaXIoc291cmNlTm9kZU1vZHVsZXMsIHsgd2l0aEZpbGVUeXBlczogdHJ1ZSB9KTtcbiAgY29uc3QgY291bnRzID0gYXdhaXQgUHJvbWlzZS5hbGwoXG4gICAgZW50cmllcy5tYXAoYXN5bmMgKGVudHJ5KTogUHJvbWlzZTxudW1iZXI+ID0+IHtcbiAgICAgIGNvbnN0IHNvdXJjZVBhdGggPSBwYXRoLmpvaW4oc291cmNlTm9kZU1vZHVsZXMsIGVudHJ5Lm5hbWUpO1xuICAgICAgY29uc3QgZGVzdFBhdGggPSBwYXRoLmpvaW4oZGVzdE5vZGVNb2R1bGVzLCBlbnRyeS5uYW1lKTtcblxuICAgICAgaWYgKGVudHJ5LmlzU3ltYm9saWNMaW5rKCkpIHtcbiAgICAgICAgY29uc3QgdGFyZ2V0ID0gYXdhaXQgZnMucmVhZGxpbmsoc291cmNlUGF0aCk7XG4gICAgICAgIGlmIChpc0ludGVybmFsU3ltbGluayh0YXJnZXQpKSB7XG4gICAgICAgICAgYXdhaXQgZnMuc3ltbGluayh0YXJnZXQsIGRlc3RQYXRoKTtcbiAgICAgICAgICByZXR1cm4gMTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBhd2FpdCBmcy5zeW1saW5rKHNvdXJjZVBhdGgsIGRlc3RQYXRoKTtcbiAgICAgICAgICByZXR1cm4gMDtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIGlmIChlbnRyeS5pc0RpcmVjdG9yeSgpICYmIGVudHJ5Lm5hbWUuc3RhcnRzV2l0aCgnQCcpKSB7XG4gICAgICAgIGF3YWl0IGZzLm1rZGlyKGRlc3RQYXRoLCB7IHJlY3Vyc2l2ZTogdHJ1ZSB9KTtcbiAgICAgICAgY29uc3Qgc2NvcGVFbnRyaWVzID0gYXdhaXQgZnMucmVhZGRpcihzb3VyY2VQYXRoLCB7IHdpdGhGaWxlVHlwZXM6IHRydWUgfSk7XG4gICAgICAgIGNvbnN0IHNjb3BlQ291bnRzID0gYXdhaXQgUHJvbWlzZS5hbGwoXG4gICAgICAgICAgc2NvcGVFbnRyaWVzLm1hcChhc3luYyAoc2NvcGVFbnRyeSk6IFByb21pc2U8bnVtYmVyPiA9PiB7XG4gICAgICAgICAgICBjb25zdCBzY29wZVNvdXJjZVBhdGggPSBwYXRoLmpvaW4oc291cmNlUGF0aCwgc2NvcGVFbnRyeS5uYW1lKTtcbiAgICAgICAgICAgIGNvbnN0IHNjb3BlRGVzdFBhdGggPSBwYXRoLmpvaW4oZGVzdFBhdGgsIHNjb3BlRW50cnkubmFtZSk7XG5cbiAgICAgICAgICAgIGlmIChzY29wZUVudHJ5LmlzU3ltYm9saWNMaW5rKCkpIHtcbiAgICAgICAgICAgICAgY29uc3QgdGFyZ2V0ID0gYXdhaXQgZnMucmVhZGxpbmsoc2NvcGVTb3VyY2VQYXRoKTtcbiAgICAgICAgICAgICAgaWYgKGlzSW50ZXJuYWxTeW1saW5rKHRhcmdldCkpIHtcbiAgICAgICAgICAgICAgICBhd2FpdCBmcy5zeW1saW5rKHRhcmdldCwgc2NvcGVEZXN0UGF0aCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIDE7XG4gICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgYXdhaXQgZnMuc3ltbGluayhzY29wZVNvdXJjZVBhdGgsIHNjb3BlRGVzdFBhdGgpO1xuICAgICAgICAgICAgICAgIHJldHVybiAwO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBhd2FpdCBmcy5zeW1saW5rKHNjb3BlU291cmNlUGF0aCwgc2NvcGVEZXN0UGF0aCk7XG4gICAgICAgICAgICAgIHJldHVybiAwO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pXG4gICAgICAgICk7XG4gICAgICAgIHJldHVybiBzY29wZUNvdW50cy5yZWR1Y2UoKHN1bSwgYykgPT4gc3VtICsgYywgMCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBhd2FpdCBmcy5zeW1saW5rKHNvdXJjZVBhdGgsIGRlc3RQYXRoKTtcbiAgICAgICAgcmV0dXJuIDA7XG4gICAgICB9XG4gICAgfSlcbiAgKTtcblxuICByZXR1cm4gY291bnRzLnJlZHVjZSgoc3VtLCBjKSA9PiBzdW0gKyBjLCAwKTtcbn1cblxuaW50ZXJmYWNlIFJlcm91dGVBbGxOb2RlTW9kdWxlc09wdGlvbnMge1xuICBzb3VyY2VSb290OiBzdHJpbmc7XG4gIHdvcmt0cmVlRGlyOiBzdHJpbmc7XG4gIHJlcG9Sb290OiBzdHJpbmc7XG59XG5cbi8qKlxuICogUmVyb3V0ZXMgcm9vdCBhbmQgcGVyLXBhY2thZ2Ugbm9kZV9tb2R1bGVzIGRpcmVjdG9yaWVzIGludG8gdGhlIHdvcmt0cmVlLlxuICpcbiAqIFRoZSBvcGVyYXRpb24gaXMgc2tpcHBlZCB3aGVuIHRoZSByZXBvc2l0b3J5IGhhcyBubyB3b3Jrc3BhY2UgY29uZmlndXJhdGlvbi5cbiAqXG4gKiBAcGFyYW0gb3B0cyAtIFNvdXJjZSByb290LCBkZXN0aW5hdGlvbiB3b3JrdHJlZSByb290LCBhbmQgcmVwbyByb290LlxuICogQHJldHVybnMgVG90YWwgbnVtYmVyIG9mIHJlY3JlYXRlZCBpbnRlcm5hbCB3b3Jrc3BhY2Ugc3ltbGlua3MuXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiByZXJvdXRlQWxsTm9kZU1vZHVsZXMob3B0czogUmVyb3V0ZUFsbE5vZGVNb2R1bGVzT3B0aW9ucyk6IFByb21pc2U8bnVtYmVyPiB7XG4gIGNvbnN0IHsgc291cmNlUm9vdCwgd29ya3RyZWVEaXIsIHJlcG9Sb290IH0gPSBvcHRzO1xuXG4gIGxldCBwYWNrYWdlSnNvbjogeyB3b3Jrc3BhY2VzPzogc3RyaW5nW10gfTtcbiAgdHJ5IHtcbiAgICBjb25zdCBwYWNrYWdlSnNvbkNvbnRlbnQgPSBhd2FpdCBmcy5yZWFkRmlsZShwYXRoLmpvaW4ocmVwb1Jvb3QsICdwYWNrYWdlLmpzb24nKSwgJ3V0Zi04Jyk7XG4gICAgcGFja2FnZUpzb24gPSBKU09OLnBhcnNlKHBhY2thZ2VKc29uQ29udGVudCk7XG4gIH0gY2F0Y2ggKGVycm9yOiB1bmtub3duKSB7XG4gICAgaWYgKChlcnJvciBhcyBOb2RlSlMuRXJybm9FeGNlcHRpb24pLmNvZGUgPT09ICdFTk9FTlQnKSB7XG4gICAgICByZXR1cm4gMDtcbiAgICB9XG4gICAgdGhyb3cgZXJyb3I7XG4gIH1cblxuICBpZiAoIXBhY2thZ2VKc29uLndvcmtzcGFjZXMpIHtcbiAgICByZXR1cm4gMDtcbiAgfVxuXG4gIGxldCB0b3RhbENvdW50ID0gMDtcblxuICB0b3RhbENvdW50ICs9IGF3YWl0IHJlcm91dGVOb2RlTW9kdWxlcyh7XG4gICAgc291cmNlTm9kZU1vZHVsZXM6IHBhdGguam9pbihzb3VyY2VSb290LCAnbm9kZV9tb2R1bGVzJyksXG4gICAgZGVzdE5vZGVNb2R1bGVzOiBwYXRoLmpvaW4od29ya3RyZWVEaXIsICdub2RlX21vZHVsZXMnKVxuICB9KTtcblxuICBjb25zdCBwYWNrYWdlc0RpciA9IHBhdGguam9pbihzb3VyY2VSb290LCAncGFja2FnZXMnKTtcbiAgdHJ5IHtcbiAgICBjb25zdCBwYWNrYWdlRW50cmllcyA9IGF3YWl0IGZzLnJlYWRkaXIocGFja2FnZXNEaXIsIHsgd2l0aEZpbGVUeXBlczogdHJ1ZSB9KTtcbiAgICBmb3IgKGNvbnN0IGVudHJ5IG9mIHBhY2thZ2VFbnRyaWVzKSB7XG4gICAgICBpZiAoZW50cnkuaXNEaXJlY3RvcnkoKSkge1xuICAgICAgICBjb25zdCBwa2dOb2RlTW9kdWxlcyA9IHBhdGguam9pbihwYWNrYWdlc0RpciwgZW50cnkubmFtZSwgJ25vZGVfbW9kdWxlcycpO1xuICAgICAgICBsZXQgbm9kZU1vZHVsZXNFeGlzdHMgPSBmYWxzZTtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBhd2FpdCBmcy5sc3RhdChwa2dOb2RlTW9kdWxlcyk7XG4gICAgICAgICAgbm9kZU1vZHVsZXNFeGlzdHMgPSB0cnVlO1xuICAgICAgICB9IGNhdGNoIChlcnJvcjogdW5rbm93bikge1xuICAgICAgICAgIGlmICgoZXJyb3IgYXMgTm9kZUpTLkVycm5vRXhjZXB0aW9uKS5jb2RlICE9PSAnRU5PRU5UJykge1xuICAgICAgICAgICAgdGhyb3cgZXJyb3I7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChub2RlTW9kdWxlc0V4aXN0cykge1xuICAgICAgICAgIGNvbnN0IGRlc3RQYWNrYWdlRGlyID0gcGF0aC5qb2luKHdvcmt0cmVlRGlyLCAncGFja2FnZXMnLCBlbnRyeS5uYW1lKTtcbiAgICAgICAgICBhd2FpdCBmcy5ta2RpcihkZXN0UGFja2FnZURpciwgeyByZWN1cnNpdmU6IHRydWUgfSk7XG4gICAgICAgICAgdG90YWxDb3VudCArPSBhd2FpdCByZXJvdXRlTm9kZU1vZHVsZXMoe1xuICAgICAgICAgICAgc291cmNlTm9kZU1vZHVsZXM6IHBrZ05vZGVNb2R1bGVzLFxuICAgICAgICAgICAgZGVzdE5vZGVNb2R1bGVzOiBwYXRoLmpvaW4oZGVzdFBhY2thZ2VEaXIsICdub2RlX21vZHVsZXMnKVxuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9IGNhdGNoIChlcnJvcjogdW5rbm93bikge1xuICAgIGlmICgoZXJyb3IgYXMgTm9kZUpTLkVycm5vRXhjZXB0aW9uKS5jb2RlICE9PSAnRU5PRU5UJykge1xuICAgICAgdGhyb3cgZXJyb3I7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHRvdGFsQ291bnQ7XG59XG5cbmludGVyZmFjZSBVcGRhdGVHaXRFeGNsdWRlT3B0aW9ucyB7XG4gIHdvcmt0cmVlRGlyOiBzdHJpbmc7XG4gIHJlcG9Sb290OiBzdHJpbmc7XG4gIGRpcmVjdG9yaWVzOiBzdHJpbmdbXTtcbiAgZmlsZXM6IHN0cmluZ1tdO1xufVxuXG4vKipcbiAqIEFwcGVuZHMgc3ltbGlua2VkIGlnbm9yZWQgcGF0aHMgdG8gdGhlIHdvcmt0cmVlLXNwZWNpZmljIGdpdCBleGNsdWRlIGZpbGUuXG4gKlxuICogQWxzbyBlbmFibGVzIGBleHRlbnNpb25zLndvcmt0cmVlQ29uZmlnYCBhbmQgc2V0cyB3b3JrdHJlZS1sb2NhbFxuICogYGNvcmUuZXhjbHVkZXNGaWxlYCBzbyBnaXQgc3RhdHVzIGluIHRoZSB3b3JrdHJlZSBpZ25vcmVzIGluamVjdGVkIGxpbmtzLlxuICpcbiAqIEBwYXJhbSBvcHRzIC0gV29ya3RyZWUgcGF0aCwgcmVwbyByb290LCBhbmQgaWdub3JlZCBwYXRoIGNhbmRpZGF0ZXMuXG4gKiBAcmV0dXJucyBObyB2YWx1ZS5cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHVwZGF0ZUdpdEV4Y2x1ZGUob3B0czogVXBkYXRlR2l0RXhjbHVkZU9wdGlvbnMpOiBQcm9taXNlPHZvaWQ+IHtcbiAgY29uc3QgeyB3b3JrdHJlZURpciwgcmVwb1Jvb3QsIGRpcmVjdG9yaWVzLCBmaWxlcyB9ID0gb3B0cztcblxuICBjb25zdCB7IHN0ZG91dDogZ2l0RGlyIH0gPSBhd2FpdCBleGVjRmlsZUFzeW5jKCdnaXQnLCBbJy1DJywgd29ya3RyZWVEaXIsICdyZXYtcGFyc2UnLCAnLS1naXQtZGlyJ10sIHtcbiAgICB0aW1lb3V0OiA1XzAwMFxuICB9KTtcbiAgY29uc3QgZXhjbHVkZVBhdGggPSBwYXRoLmpvaW4oZ2l0RGlyLnRyaW0oKSwgJ2luZm8nLCAnZXhjbHVkZScpO1xuICBhd2FpdCBmcy5ta2RpcihwYXRoLmRpcm5hbWUoZXhjbHVkZVBhdGgpLCB7IHJlY3Vyc2l2ZTogdHJ1ZSB9KTtcblxuICBjb25zdCBsaW5lcyA9IFsnIyBTeW1saW5rcyBjcmVhdGVkIGJ5IGluc3RhbnQtd29ya3RyZWUnXTtcblxuICBmb3IgKGNvbnN0IGRpciBvZiBkaXJlY3Rvcmllcykge1xuICAgIGlmICghZGlyKSBjb250aW51ZTtcbiAgICB0cnkge1xuICAgICAgY29uc3Qgc3RhdHMgPSBhd2FpdCBmcy5sc3RhdChwYXRoLmpvaW4od29ya3RyZWVEaXIsIGRpcikpO1xuICAgICAgaWYgKHN0YXRzLmlzU3ltYm9saWNMaW5rKCkpIGxpbmVzLnB1c2goZGlyKTtcbiAgICB9IGNhdGNoIChlcnJvcjogdW5rbm93bikge1xuICAgICAgaWYgKChlcnJvciBhcyBOb2RlSlMuRXJybm9FeGNlcHRpb24pLmNvZGUgIT09ICdFTk9FTlQnKSB7XG4gICAgICAgIHRocm93IGVycm9yO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGZvciAoY29uc3QgZmlsZSBvZiBmaWxlcykge1xuICAgIGlmICghZmlsZSkgY29udGludWU7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHN0YXRzID0gYXdhaXQgZnMubHN0YXQocGF0aC5qb2luKHdvcmt0cmVlRGlyLCBmaWxlKSk7XG4gICAgICBpZiAoc3RhdHMuaXNTeW1ib2xpY0xpbmsoKSkgbGluZXMucHVzaChmaWxlKTtcbiAgICB9IGNhdGNoIChlcnJvcjogdW5rbm93bikge1xuICAgICAgaWYgKChlcnJvciBhcyBOb2RlSlMuRXJybm9FeGNlcHRpb24pLmNvZGUgIT09ICdFTk9FTlQnKSB7XG4gICAgICAgIHRocm93IGVycm9yO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGF3YWl0IGZzLmFwcGVuZEZpbGUoZXhjbHVkZVBhdGgsIGAke2xpbmVzLmpvaW4oJ1xcbicpfVxcbmApO1xuXG4gIHRyeSB7XG4gICAgYXdhaXQgZXhlY0ZpbGVBc3luYygnZ2l0JywgWyctQycsIHJlcG9Sb290LCAnY29uZmlnJywgJ2V4dGVuc2lvbnMud29ya3RyZWVDb25maWcnLCAndHJ1ZSddLCB7IHRpbWVvdXQ6IDVfMDAwIH0pO1xuICB9IGNhdGNoIChlcnJvcjogdW5rbm93bikge1xuICAgIHByb2Nlc3Muc3RkZXJyLndyaXRlKFxuICAgICAgYGNyZWF0ZS13b3JrdHJlZTogZmFpbGVkIHRvIHNldCB3b3JrdHJlZUNvbmZpZyBleHRlbnNpb246ICR7ZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiBTdHJpbmcoZXJyb3IpfVxcbmBcbiAgICApO1xuICB9XG5cbiAgdHJ5IHtcbiAgICBhd2FpdCBleGVjRmlsZUFzeW5jKCdnaXQnLCBbJy1DJywgd29ya3RyZWVEaXIsICdjb25maWcnLCAnLS13b3JrdHJlZScsICdjb3JlLmV4Y2x1ZGVzRmlsZScsIGV4Y2x1ZGVQYXRoXSwge1xuICAgICAgdGltZW91dDogNV8wMDBcbiAgICB9KTtcbiAgfSBjYXRjaCAoZXJyb3I6IHVua25vd24pIHtcbiAgICBwcm9jZXNzLnN0ZGVyci53cml0ZShcbiAgICAgIGBjcmVhdGUtd29ya3RyZWU6IGZhaWxlZCB0byBzZXQgY29yZS5leGNsdWRlc0ZpbGU6ICR7ZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiBTdHJpbmcoZXJyb3IpfVxcbmBcbiAgICApO1xuICB9XG59XG4iLCAiLyoqXG4gKiBEZXRhY2hlZCBicmFuY2gtY2xlYW51cCB3YXRjaGVyIGZvciBpbnRlcmFjdGl2ZSBzZXNzaW9ucy5cbiAqXG4gKiBQcm92aWRlcyBhIGZpcmUtYW5kLWZvcmdldCBtZWNoYW5pc20gZm9yIHJ1bm5pbmcgYnJhbmNoIGNsZWFudXAgYWZ0ZXIgdGhlXG4gKiBpbnRlcmFjdGl2ZSBDTEkgZXhpdHMuIFRoZSB3YXRjaGVyIHNwYXducyBpdHNlbGYgYXMgYSBkZXRhY2hlZCBOb2RlLmpzXG4gKiBwcm9jZXNzLCByZWNlaXZlcyBjbGVhbnVwIHBhcmFtZXRlcnMgdmlhIHN0ZGluLCBjYWxsc1xuICoge0BsaW5rIGNsZWFudXBNZXJnZWRCcmFuY2hlc30sIHRoZW4gZXhpdHMuXG4gKlxuICogQHN1bW1hcnkgRGV0YWNoZWQgYnJhbmNoLWNsZWFudXAgd2F0Y2hlciBmb3IgaW50ZXJhY3RpdmUgc2Vzc2lvbnNcbiAqIEBtb2R1bGVcbiAqL1xuXG5pbXBvcnQgeyB0eXBlIENoaWxkUHJvY2Vzcywgc3Bhd24gfSBmcm9tICdub2RlOmNoaWxkX3Byb2Nlc3MnO1xuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdub2RlOnBhdGgnO1xuaW1wb3J0IHsgQ2FyZHNDbGllbnQgfSBmcm9tICdAY2FyZHMvc2RrL2NsaWVudCc7XG5pbXBvcnQgeyB0eXBlIEFjdGlvbklucHV0LCBMb2dnZXIgfSBmcm9tICdAY2FyZHMvc2RrL2NvbmZpZyc7XG5pbXBvcnQgeyBjbGVhbnVwTWVyZ2VkQnJhbmNoZXMsIGVycm9yTWVzc2FnZSB9IGZyb20gJy4vY2xhdWRlLXNlc3Npb24uanMnO1xuXG4vKipcbiAqIFBhcmFtZXRlcnMgcmVxdWlyZWQgdG8gcnVuIGJyYW5jaCBjbGVhbnVwIGluIGEgZGV0YWNoZWQgcHJvY2Vzcy5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBCcmFuY2hDbGVhbnVwUGFyYW1zIHtcbiAgLyoqIFRoZSBjYXJkIElEIGZvciB0aGUgc2Vzc2lvbiBiZWluZyBjbGVhbmVkIHVwLiAqL1xuICBjYXJkSWQ6IHN0cmluZztcbiAgLyoqIEFic29sdXRlIHBhdGggdG8gdGhlIHJlcG9zaXRvcnkgcm9vdC4gKi9cbiAgcmVwb1Jvb3Q6IHN0cmluZztcbiAgLyoqIEJhc2UgVVJMIGZvciB0aGUgQ2FyZHMgQVBJLiAqL1xuICBhcGlCYXNlVXJsOiBzdHJpbmc7XG4gIC8qKiBBY2Nlc3MgdG9rZW4gZm9yIHRoZSBDYXJkcyBBUEkuICovXG4gIGFwaUFjY2Vzc1Rva2VuOiBzdHJpbmc7XG4gIC8qKiBPcHRpb25hbCBzZXNzaW9uIElEIGZvciBsb2cgY29ycmVsYXRpb24uICovXG4gIHNlc3Npb25JZD86IHN0cmluZztcbn1cblxuLyoqXG4gKiBTcGF3bnMgYSBkZXRhY2hlZCBOb2RlLmpzIHByb2Nlc3MgdGhhdCBjYWxscyB7QGxpbmsgY2xlYW51cE1lcmdlZEJyYW5jaGVzfVxuICogYWZ0ZXIgcmVjZWl2aW5nIHNlcmlhbGl6ZWQgcGFyYW1ldGVycyB2aWEgc3RkaW4uXG4gKlxuICogVGhlIHNwYXduZWQgcHJvY2VzcyBpcyBmdWxseSBkZXRhY2hlZCAoYGRldGFjaGVkOiB0cnVlYCwgYGNoaWxkLnVucmVmKClgKVxuICogYW5kIHN1cnZpdmVzIHBhcmVudCBleGl0LiBTdGRvdXQgYW5kIHN0ZGVyciBhcmUgZGlzY2FyZGVkOyBlcnJvcnMgYXJlXG4gKiB3cml0dGVuIHRvIHRoZSBzaGFyZWQgYWN0aW9uLWhhbmRsZXIgbG9nIGZpbGUgaW4gdGhlIHJlcG8gcm9vdC5cbiAqXG4gKiBAcGFyYW0gcGFyYW1zIC0gUGFyYW1ldGVycyBmb3IgdGhlIGNsZWFudXAgcnVuLlxuICovXG5leHBvcnQgZnVuY3Rpb24gc3Bhd25CcmFuY2hDbGVhbnVwV2F0Y2hlcihwYXJhbXM6IEJyYW5jaENsZWFudXBQYXJhbXMpOiB2b2lkIHtcbiAgY29uc3Qgc2VsZlBhdGggPSBuZXcgVVJMKGltcG9ydC5tZXRhLnVybCkucGF0aG5hbWU7XG4gIGNvbnN0IG5vZGVCaW4gPSBwcm9jZXNzLmV4ZWNQYXRoO1xuXG4gIGxldCBjaGlsZDogQ2hpbGRQcm9jZXNzO1xuICB0cnkge1xuICAgIGNoaWxkID0gc3Bhd24obm9kZUJpbiwgW3NlbGZQYXRoLCAnLS1icmFuY2gtY2xlYW51cCddLCB7XG4gICAgICBkZXRhY2hlZDogdHJ1ZSxcbiAgICAgIHN0ZGlvOiBbJ3BpcGUnLCAnaWdub3JlJywgJ2lnbm9yZSddXG4gICAgfSk7XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgLy8gRmFpbC1vcGVuOiBsb2cgYW5kIHJldHVybjsgY2xlYW51cCB3aWxsIG5vdCBydW4gdGhpcyBzZXNzaW9uXG4gICAgY29uc29sZS5lcnJvcihgW2JyYW5jaC1jbGVhbnVwLXdhdGNoZXJdIEZhaWxlZCB0byBzcGF3biB3YXRjaGVyOiAke2Vycm9yTWVzc2FnZShlcnJvcil9YCk7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgY2hpbGQuc3RkaW4hLm9uKCdlcnJvcicsIChlcnIpID0+IHtcbiAgICAvLyBUaGUgcGFyZW50IG1heSBleGl0IGJlZm9yZSBzdGRpbiBpcyBmdWxseSBkcmFpbmVkOyB0aGlzIGlzIGV4cGVjdGVkXG4gICAgY29uc29sZS5lcnJvcihgW2JyYW5jaC1jbGVhbnVwLXdhdGNoZXJdIFN0ZGluIHBpcGUgZXJyb3I6ICR7ZXJyb3JNZXNzYWdlKGVycil9YCk7XG4gIH0pO1xuXG4gIGNoaWxkLnN0ZGluIS53cml0ZShgJHtKU09OLnN0cmluZ2lmeShwYXJhbXMpfVxcbmApO1xuICBjaGlsZC5zdGRpbiEuZW5kKCk7XG5cbiAgY2hpbGQudW5yZWYoKTtcbn1cblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gRGV0YWNoZWQgZW50cnkgcG9pbnRcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuaWYgKHByb2Nlc3MuYXJndi5pbmNsdWRlcygnLS1icmFuY2gtY2xlYW51cCcpKSB7XG4gIGNvbnN0IGNodW5rczogQnVmZmVyW10gPSBbXTtcblxuICBwcm9jZXNzLnN0ZGluLm9uKCdkYXRhJywgKGNodW5rOiBCdWZmZXIpID0+IHtcbiAgICBjaHVua3MucHVzaChjaHVuayk7XG4gIH0pO1xuXG4gIHByb2Nlc3Muc3RkaW4ub24oJ2VuZCcsICgpID0+IHtcbiAgICB2b2lkIChhc3luYyAoKSA9PiB7XG4gICAgICBjb25zdCByYXcgPSBCdWZmZXIuY29uY2F0KGNodW5rcykudG9TdHJpbmcoJ3V0ZjgnKTtcbiAgICAgIGxldCBwYXJhbXM6IEJyYW5jaENsZWFudXBQYXJhbXM7XG4gICAgICB0cnkge1xuICAgICAgICBwYXJhbXMgPSBKU09OLnBhcnNlKHJhdykgYXMgQnJhbmNoQ2xlYW51cFBhcmFtcztcbiAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoYFticmFuY2gtY2xlYW51cC13YXRjaGVyXSBGYWlsZWQgdG8gcGFyc2UgcGFyYW1zOiAke2Vycm9yTWVzc2FnZShlcnJvcil9YCk7XG4gICAgICAgIHByb2Nlc3MuZXhpdCgxKTtcbiAgICAgIH1cblxuICAgICAgY29uc3QgeyBjYXJkSWQsIHJlcG9Sb290LCBhcGlCYXNlVXJsLCBhcGlBY2Nlc3NUb2tlbiwgc2Vzc2lvbklkIH0gPSBwYXJhbXM7XG5cbiAgICAgIGNvbnN0IGlucHV0OiBBY3Rpb25JbnB1dCA9IHtcbiAgICAgICAgY2FyZElkLFxuICAgICAgICByZXBvUm9vdCxcbiAgICAgICAgYXBpQmFzZVVybCxcbiAgICAgICAgYXBpQWNjZXNzVG9rZW4sXG4gICAgICAgIGFjdGlvbk5hbWU6ICdicmFuY2gtY2xlYW51cC13YXRjaGVyJyxcbiAgICAgICAgZW52aXJvbm1lbnQ6ICcnLFxuICAgICAgICBleGVjdXRpb25Nb2RlOiAnYmFja2dyb3VuZCcsXG4gICAgICAgIGNvZGluZ0FnZW50OiB1bmRlZmluZWQsXG4gICAgICAgIHN3aXRjaFRvSW50ZXJhY3RpdmVEYXRhOiB1bmRlZmluZWQsXG4gICAgICAgIGNhcmRSZXBvUGF0aDogJycsXG4gICAgICAgIGNvbmZpZ1BhdGg6ICcnLFxuICAgICAgICBleHRlbnNpb25QYXRoOiAnJ1xuICAgICAgfTtcblxuICAgICAgY29uc3QgY2xpZW50ID0gbmV3IENhcmRzQ2xpZW50KHtcbiAgICAgICAgYmFzZVVybDogYXBpQmFzZVVybCxcbiAgICAgICAgYWNjZXNzVG9rZW46IGFwaUFjY2Vzc1Rva2VuXG4gICAgICB9KTtcblxuICAgICAgY29uc3QgbG9nZ2VyID0gbmV3IExvZ2dlcih7XG4gICAgICAgIGxvZ0ZpbGVQYXRoOiBwYXRoLmpvaW4ocmVwb1Jvb3QsICcuY2FyZHMnLCAnbG9ncycsICdjYXJkcy1kZWZhdWx0LWNvbmZpZ3VyYXRpb24taG9va3MubG9nJylcbiAgICAgIH0pO1xuXG4gICAgICB0cnkge1xuICAgICAgICBhd2FpdCBjbGVhbnVwTWVyZ2VkQnJhbmNoZXMoaW5wdXQsIGNsaWVudCwgbG9nZ2VyLCBzZXNzaW9uSWQpO1xuICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgY29uc3QgbWVzc2FnZSA9IGVycm9yTWVzc2FnZShlcnJvcik7XG4gICAgICAgIGxvZ2dlci5lcnJvcignQnJhbmNoIGNsZWFudXAgd2F0Y2hlciBmYWlsZWQnLCB7IGVycm9yOiBtZXNzYWdlLCBzZXNzaW9uSWQgfSk7XG4gICAgICB9IGZpbmFsbHkge1xuICAgICAgICBsb2dnZXIuY2xvc2UoKTtcbiAgICAgIH1cbiAgICB9KSgpO1xuICB9KTtcbn1cbiIsICJcbmltcG9ydCBoYW5kbGVyIGZyb20gJy4vbGF1bmNoLnRzJztcbmltcG9ydCB7IGV4ZWN1dGVDb21tYW5kIH0gZnJvbSAnLi4vLi4vLi4vc2RrL3NyYy9jb25maWcvcnVudGltZS50cyc7XG5cbmlmICghcHJvY2Vzcy5hcmd2LmluY2x1ZGVzKCctLWJyYW5jaC1jbGVhbnVwJykpIHtcbiAgZXhlY3V0ZUNvbW1hbmQoaGFuZGxlcik7XG59XG4iXSwKICAibWFwcGluZ3MiOiAiOzs7Ozs7OztBQWlCQSxTQUFTLGtCQUFrQjs7O0FDd0twQixTQUFTLGFBQ2QsUUFDQSxTQUNnQztBQUNoQyxRQUFNLEtBQUssT0FBTyxPQUFvQixZQUEwQztBQUM5RSxVQUFNLFFBQVEsT0FBTyxPQUFPO0FB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QUNqRDtBQUFBLE1BQ0EsV0FBVyxLQUFLLE1BQU0sWUFBWSxJQUFJLElBQUksWUFBWTtBQUFBLElBQ3hELENBQUM7QUFBQSxFQUNIO0FBQ0Y7OztBUHRoQkEsSUFBTyxpQkFBUTtBQUFBLEVBQ2I7QUFBQSxJQUNFLFlBQVk7QUFBQSxJQUNaLGFBQWE7QUFBQSxJQUNiLHdCQUF3QjtBQUFBLElBQ3hCLFNBQVM7QUFBQSxFQUNYO0FBQUEsRUFDQSxPQUFPLE9BQW9CLFlBQTJCO0FBQ3BELFVBQU0sYUFBYSxNQUFNO0FBQ3pCLFVBQU0sQ0FBQyxXQUFXLE1BQU0sSUFBSSxDQUFDLFlBQVksYUFBYSxXQUFXLEdBQUcsQ0FBQyxDQUFDLFlBQVksU0FBUztBQUUzRixVQUFNLG1CQUFtQixPQUFPLFNBQVM7QUFBQSxNQUN2QyxRQUFRO0FBQUEsTUFDUjtBQUFBLE1BQ0E7QUFBQSxNQUNBLDZCQUE2QjtBQUFBLElBQy9CLENBQUM7QUFBQSxFQUNIO0FBQ0Y7OztBYTNDQSxJQUFJLENBQUMsUUFBUSxLQUFLLFNBQVMsa0JBQWtCLEdBQUc7QUFDOUMsaUJBQWUsY0FBTztBQUN4QjsiLAogICJuYW1lcyI6IFsicmVzb2x2ZSIsICJleGVjRmlsZSIsICJzcGF3biIsICJmcyIsICJwYXRoIiwgInByb21pc2lmeSIsICJwYXRoIiwgInJlc29sdmUiLCAibG9nZ2VyIiwgImZzIiwgInBhdGgiLCAicGF0aCIsICJsb2dnZXIiLCAiZXhlY0ZpbGVBc3luYyIsICJwcm9taXNpZnkiLCAiZXhlY0ZpbGUiLCAibG9nZ2VyIiwgInJlc3VsdCIsICJzcGF3biIsICJyZXNvbHZlIl0KfQo=
