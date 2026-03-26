import { createRequire as __createRequire } from 'node:module';
const require = __createRequire(import.meta.url);

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
  EXTENSION_PATH: "EXTENSION_PATH",
  /**
   * Absolute path to the Cards hooks log file.
   *
   * Set by ActionDispatcher at runtime. Read by the Logger singleton
   * at construction time to determine where hook execution logs are written.
   *
   * Available in all actions and type hooks.
   */
  HOOKS_LOG_FILE: "CARDS_HOOKS_LOG_FILE"
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
  process.on("SIGHUP", () => {
  });
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
  // --- Evaluation Operations ---
  /**
   * Gets the evaluation document for a card as markdown.
   *
   * @param cardId - Identifier of the card whose evaluation markdown should be returned.
   * @returns Promise resolving to evaluation markdown.
   * @throws ApiError when the server responds with an error.
   * @throws NetworkError when the request fails to reach the server.
   */
  async getEvaluation(cardId) {
    const url = this.buildUrl(`/cards/${cardId}/evaluation`);
    const response = await this.request(() => this.getHttpClient().get(url));
    return response.content;
  }
  /**
   * Updates the evaluation document for a card.
   *
   * @param cardId - Identifier of the card whose evaluation markdown should be updated.
   * @param content - Evaluation markdown content.
   * @returns Promise resolving when the evaluation is saved.
   * @throws ApiError when the server rejects the update.
   * @throws NetworkError when the request fails to reach the server.
   * @deprecated Use direct git operations instead. This endpoint will be removed.
   */
  async updateEvaluation(cardId, content) {
    const url = this.buildUrl(`/cards/${cardId}/evaluation`);
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
        () => execFileAsync2("git", ["worktree", "remove", "--force", branch.worktree], { cwd: input.repoRoot }),
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vLi4vc3JjL2FjdGlvbnMvbGF1bmNoLnRzIiwgIi4uLy4uLy4uL3Nkay9zcmMvY29uZmlnL2ZhY3Rvcmllcy9hY3Rpb24udHMiLCAiLi4vLi4vLi4vc2RrL3NyYy9jb25maWcvZW52LnRzIiwgIi4uLy4uLy4uL3Nkay9zcmMvY29uZmlnL2V4aXQtY29kZXMudHMiLCAiLi4vLi4vLi4vc2RrL3NyYy9jb25maWcvbG9nZ2VyLnRzIiwgIi4uLy4uLy4uL3Nkay9zcmMvY29uZmlnL3NvY2tldC1jbGllbnQudHMiLCAiLi4vLi4vLi4vc2RrL3NyYy9jb25maWcvcnVudGltZS50cyIsICIuLi8uLi9zcmMvbGliL2NsYXVkZS1zZXNzaW9uLnRzIiwgIi4uLy4uLy4uL3Nkay9zcmMvY2xpZW50L3R5cGVzL2Vycm9ycy50cyIsICIuLi8uLi8uLi9zZGsvc3JjL2NsaWVudC9jYXJkc0NsaWVudC50cyIsICIuLi8uLi8uLi9zZGsvc3JjL21hcmtldHBsYWNlLnRzIiwgIi4uLy4uLy4uL3Nkay9zcmMvd29ya3RyZWUudHMiLCAiLi4vLi4vc3JjL2xpYi9icmFuY2gtY2xlYW51cC13YXRjaGVyLnRzIiwgIi4uLy4uL3NyYy9hY3Rpb25zL2hvb2std3JhcHBlci50cyJdLAogICJzb3VyY2VzQ29udGVudCI6IFsiLyoqXG4gKiBMYXVuY2ggYWN0aW9uIGZvciBDbGF1ZGUgQ29kZSB3b3JrZmxvd3MuXG4gKlxuICogU3Bhd25zIHRoZSBgY2xhdWRlYCBDTEkgZm9yIHRoZSBjdXJyZW50IGNhcmQuIEluIGludGVyYWN0aXZlIG1vZGUsIHRoZVxuICogcHJvY2VzcyBpbmhlcml0cyBzdGRpbyBzbyB0aGUgdXNlciBnZXRzIGRpcmVjdCB0ZXJtaW5hbCBjb250cm9sLiBJblxuICogYmFja2dyb3VuZCBtb2RlLCBDbGF1ZGUgcnVucyB3aXRoIGAtLXByaW50YCBzbyBpdCBleGVjdXRlcyBub24taW50ZXJhY3RpdmVseVxuICogKHRha2VzIGEgcHJvbXB0LCBydW5zLCBhbmQgZXhpdHMpLiBUaGUgd2F0Y2hlciBoYW5kbGVzIGFsbCB0cmFuc2NyaXB0XG4gKiBzdHJlYW1pbmc7IGxhdW5jaC50cyBkb2VzIG5vdCBvcGVuIGFueSBzdHJlYW0gZW5kcG9pbnQuXG4gKlxuICogVGhlIGFjdGlvbiBhd2FpdHMgcHJvY2VzcyBleGl0IGJlZm9yZSByZXNvbHZpbmcsIHNvIHRoZSB0ZXJtaW5hbCBjbG9zZXNcbiAqIG9ubHkgYWZ0ZXIgQ2xhdWRlIGZpbmlzaGVzIGFuZCBjbGVhbnVwIGlzIGNvbXBsZXRlLlxuICpcbiAqIEBzdW1tYXJ5IExhdW5jaCBhY3Rpb24gZm9yIENsYXVkZSBDb2RlIHdvcmtmbG93c1xuICogQG1vZHVsZVxuICogQHNlZSB7QGxpbmsgZGVmaW5lQWN0aW9ufSBmb3IgZmFjdG9yeSBiZWhhdmlvciBhbmQgbWV0YWRhdGEgYXR0YWNobWVudFxuICovXG5cbmltcG9ydCB7IHJhbmRvbVVVSUQgfSBmcm9tICdub2RlOmNyeXB0byc7XG5pbXBvcnQgeyB0eXBlIEFjdGlvbkNvbnRleHQsIHR5cGUgQWN0aW9uSW5wdXQsIGRlZmluZUFjdGlvbiB9IGZyb20gJ0BjYXJkcy9zZGsvY29uZmlnJztcbmltcG9ydCB7IHNwYXduQ2xhdWRlU2Vzc2lvbiB9IGZyb20gJy4uL2xpYi9jbGF1ZGUtc2Vzc2lvbi5qcyc7XG5cbi8qKlxuICogTGF1bmNoIGFjdGlvbiBoYW5kbGVyLlxuICpcbiAqIFNwYXducyB0aGUgYGNsYXVkZWAgQ0xJIGFzIGEgY2hpbGQgcHJvY2VzcywgcHJvdmlkaW5nIHRoZSBjYXJkIElEIGFuZFxuICogcmVwb3NpdG9yeSBwYXRoIGFzIHByb21wdCBjb250ZXh0LiBUaGUgcHJvY2VzcyBsaWZlY3ljbGUgaXMgdGllZCB0byB0aGVcbiAqIGFjdGlvbjogY2FuY2VsbGF0aW9uIHNlbmRzIFNJR1RFUk0sIGFuZCBzd2l0Y2hpbmcgdG8gaW50ZXJhY3RpdmUgbW9kZVxuICogcHJlc2VydmVzIHRoZSBzZXNzaW9uIElEIGZvciByZXN1bXB0aW9uLlxuICovXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVBY3Rpb24oXG4gIHtcbiAgICBhY3Rpb25OYW1lOiAnTGF1bmNoJyxcbiAgICBkZXNjcmlwdGlvbjogJ1N0YXJ0IGEgQ2xhdWRlIHNlc3Npb24gZm9yIHRoZSBjYXJkJyxcbiAgICBzdXBwb3J0c0JhY2tncm91bmRNb2RlOiB0cnVlLFxuICAgIHRpbWVvdXQ6IDM2MDAwMDBcbiAgfSxcbiAgYXN5bmMgKGlucHV0OiBBY3Rpb25JbnB1dCwgY29udGV4dDogQWN0aW9uQ29udGV4dCkgPT4ge1xuICAgIGNvbnN0IHN3aXRjaERhdGEgPSBpbnB1dC5zd2l0Y2hUb0ludGVyYWN0aXZlRGF0YSBhcyB7IHNlc3Npb25JZD86IHN0cmluZyB9IHwgdW5kZWZpbmVkO1xuICAgIGNvbnN0IFtzZXNzaW9uSWQsIHJlc3VtZV0gPSBbc3dpdGNoRGF0YT8uc2Vzc2lvbklkID8/IHJhbmRvbVVVSUQoKSwgISFzd2l0Y2hEYXRhPy5zZXNzaW9uSWRdO1xuXG4gICAgYXdhaXQgc3Bhd25DbGF1ZGVTZXNzaW9uKGlucHV0LCBjb250ZXh0LCB7XG4gICAgICBwcm9tcHQ6ICdMb2FkIHRoZSBgcnVudGltZTpjYXJkLXJlcG9gIGFuZCBgcnVudGltZTpjYXJkLXJvdXRpbmdgIHNraWxscyB0aGVuIGZvbGxvdyB0aGUgYDxpbnN0cnVjdGlvbnM+YC4nLFxuICAgICAgc2Vzc2lvbklkLFxuICAgICAgcmVzdW1lLFxuICAgICAgc3VwcG9ydHNTd2l0Y2hUb0ludGVyYWN0aXZlOiB0cnVlXG4gICAgfSk7XG4gIH1cbik7XG4iLCAiLyoqXG4gKiBGYWN0b3J5IGZ1bmN0aW9uIGZvciBjcmVhdGluZyBhY3Rpb24gaGFuZGxlcnMuXG4gKlxuICogVGhpcyBpcyB0aGUgcHJpbWFyeSBhdXRob3JpbmcgQVBJIGZvciBhY3Rpb24gZGV2ZWxvcGVycy4gSXQgd3JhcHMgYSBoYW5kbGVyXG4gKiBmdW5jdGlvbiBhbmQgYXR0YWNoZXMgbWV0YWRhdGEgZm9yIHNldHRpbmdzLmpzb24gZ2VuZXJhdGlvbi4gVGhlIFNhbWVTaGFwZVxuICogdXRpbGl0eSBwcm92aWRlcyBjb21waWxlLXRpbWUgdHlwbyBkZXRlY3Rpb24uXG4gKlxuICpcbiAqIEBzdW1tYXJ5IEZhY3RvcnkgZnVuY3Rpb24gZm9yIGNyZWF0aW5nIGFjdGlvbiBoYW5kbGVyc1xuICogQG1vZHVsZVxuICovXG5cbmltcG9ydCB0eXBlIHsgQWN0aW9uQ29tbWFuZCB9IGZyb20gJy4uL2NvbW1hbmQtdHlwZXMuanMnO1xuaW1wb3J0IHR5cGUgeyBBY3Rpb25Db250ZXh0LCBBY3Rpb25JbnB1dCB9IGZyb20gJy4uL2lucHV0cy5qcyc7XG5pbXBvcnQgdHlwZSB7IFNhbWVTaGFwZSB9IGZyb20gJy4uL3R5cGUtdXRpbHMuanMnO1xuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBDb25maWd1cmF0aW9uIFR5cGVzXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbi8qKlxuICogQ29uZmlndXJhdGlvbiBmb3Ige0BsaW5rIGRlZmluZUFjdGlvbn0gZmFjdG9yeS5cbiAqXG4gKiBBbGwgZmllbGRzIGV4Y2VwdCBgYWN0aW9uTmFtZWAgYXJlIG9wdGlvbmFsIGFuZCBmb3J3YXJkZWQgdG8gc2V0dGluZ3MuanNvbi5cbiAqIFRoZSBDTEkgZXh0cmFjdHMgdGhpcyBtZXRhZGF0YSB2aWEgQVNUIGFuYWx5c2lzLCBzbyB2YWx1ZXMgbXVzdCBiZSBzdHJpbmdcbiAqIGxpdGVyYWxzIG9yIGJvb2xlYW4vbnVtYmVyIGxpdGVyYWxzIGluIHRoZSBzb3VyY2UgY29kZS5cbiAqXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogY29uc3QgY29uZmlnOiBBY3Rpb25Db25maWcgPSB7XG4gKiAgIGFjdGlvbk5hbWU6ICdMYXVuY2ggQ2xhdWRlJyxcbiAqICAgZGVzY3JpcHRpb246ICdTdGFydCBhIENsYXVkZSBjb2Rpbmcgc2Vzc2lvbicsXG4gKiAgIGljb246ICcuL2ljb25zL2NsYXVkZS5zdmcnLFxuICogICBzdXBwb3J0c0JhY2tncm91bmRNb2RlOiB0cnVlLFxuICogICB0aW1lb3V0OiAzMDAwMFxuICogfTtcbiAqIGBgYFxuICovXG5leHBvcnQgaW50ZXJmYWNlIEFjdGlvbkNvbmZpZyB7XG4gIC8qKlxuICAgKiBTdGFibGUgaWRlbnRpZmllciBmb3IgdGhlIGFjdGlvbiB1c2VkIGluIHRlbGVtZXRyeSwgbG9jYWxpemF0aW9uLCBhbmQgQVBJIGxvb2t1cHMuXG4gICAqXG4gICAqIFNob3VsZCBiZSBsb3dlcmNhc2Ugd2l0aCBoeXBoZW5zIChlLmcuLCAnbGF1bmNoLWNsYXVkZScsICdydW4tdGVzdHMnKS5cbiAgICogSWYgb21pdHRlZCwgdGhlIENMSSBnZW5lcmF0ZXMgYW4gSUQgYnkgc2x1Z2lmeWluZyBgYWN0aW9uTmFtZWAuXG4gICAqL1xuICBpZD86IHN0cmluZztcblxuICAvKipcbiAgICogVGhlIGFjdGlvbiBuYW1lIHVzZWQgdG8gaWRlbnRpZnkgdGhlIGFjdGlvbiBpbiBzZXR0aW5ncy5qc29uLlxuICAgKlxuICAgKiBUaGlzIG5hbWUgYXBwZWFycyBpbiB0aGUgVUkuIEtlZXAgaXQgY29uY2lzZSBidXQgZGVzY3JpcHRpdmUuXG4gICAqL1xuICBhY3Rpb25OYW1lOiBzdHJpbmc7XG5cbiAgLyoqXG4gICAqIEh1bWFuLXJlYWRhYmxlIGRlc2NyaXB0aW9uIHNob3duIGluIGJ1dHRvbiB0b29sdGlwLlxuICAgKlxuICAgKiBFeHBsYWluIHdoYXQgdGhlIGFjdGlvbiBkb2VzIGluIGEgZmV3IHdvcmRzLiBTaG93biBvbiBob3ZlciBpbiB0aGUgVUkuXG4gICAqL1xuICBkZXNjcmlwdGlvbj86IHN0cmluZztcblxuICAvKipcbiAgICogUGF0aCB0byBpY29uIGZpbGUgZm9yIHRoZSBhY3Rpb24gYnV0dG9uLlxuICAgKlxuICAgKiBQYXRocyBhcmUgcmVsYXRpdmUgdG8gdGhlIHNldHRpbmdzLmpzb24gZmlsZSBsb2NhdGlvbi5cbiAgICogU1ZHIGZvcm1hdCByZWNvbW1lbmRlZCBmb3IgY3Jpc3AgcmVuZGVyaW5nIGF0IGFueSBzaXplLlxuICAgKi9cbiAgaWNvbj86IHN0cmluZztcblxuICAvKipcbiAgICogV2hldGhlciB0byBzaG93IHRoZSBleGVjdXRpb24gbW9kZSB0b2dnbGUgaW4gdGhlIFVJLlxuICAgKlxuICAgKiBXaGVuIHRydWUsIHVzZXJzIGNhbiBjaG9vc2UgYmV0d2VlbiBpbnRlcmFjdGl2ZSBhbmQgYmFja2dyb3VuZCBtb2Rlcy5cbiAgICogV2hlbiBmYWxzZSAoZGVmYXVsdCksIHRoZSBhY3Rpb24gYWx3YXlzIHJ1bnMgaW4gaW50ZXJhY3RpdmUgbW9kZS5cbiAgICovXG4gIHN1cHBvcnRzQmFja2dyb3VuZE1vZGU/OiBib29sZWFuO1xuXG4gIC8qKlxuICAgKiBXaGV0aGVyIG11bHRpcGxlIGluc3RhbmNlcyBjYW4gcnVuIHNpbXVsdGFuZW91c2x5IG9uIHRoZSBzYW1lIGNhcmQuXG4gICAqXG4gICAqIFdoZW4gZmFsc2UgKGRlZmF1bHQpLCBzdGFydGluZyB0aGUgYWN0aW9uIHdoaWxlIGl0J3MgcnVubmluZyB3aWxsIGJlXG4gICAqIGJsb2NrZWQuIFNldCB0byB0cnVlIGZvciBpZGVtcG90ZW50IGFjdGlvbnMgdGhhdCBjYW4gc2FmZWx5IG92ZXJsYXAuXG4gICAqL1xuICBhbGxvd0NvbmN1cnJlbnQ/OiBib29sZWFuO1xuXG4gIC8qKlxuICAgKiBNYXhpbXVtIGV4ZWN1dGlvbiB0aW1lIGluIG1pbGxpc2Vjb25kcy5cbiAgICpcbiAgICogSWYgdGhlIGFjdGlvbiBleGNlZWRzIHRoaXMgdGltZW91dCwgdGhlIHJ1bnRpbWUgd2lsbCB0ZXJtaW5hdGUgaXQuXG4gICAqIE9taXQgdG8gdXNlIHRoZSBwbGF0Zm9ybSdzIGRlZmF1bHQgdGltZW91dCBwb2xpY3kuXG4gICAqL1xuICB0aW1lb3V0PzogbnVtYmVyO1xuXG4gIC8qKlxuICAgKiBIYW5kbGVyIHNvdXJjZSBmaWxlIHBhdGgsIGluamVjdGVkIGJ5IHRoZSBgaW5qZWN0U291cmNlUGF0aGAgZXNidWlsZFxuICAgKiBwbHVnaW4gZHVyaW5nIGNvbmZpZyBsb2FkaW5nLiBEbyBub3Qgc2V0IG1hbnVhbGx5LlxuICAgKlxuICAgKiBAaW50ZXJuYWxcbiAgICovXG4gIHNvdXJjZVBhdGg/OiBzdHJpbmc7XG59XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIEhhbmRsZXIgVHlwZXNcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuLyoqXG4gKiBIYW5kbGVyIGZ1bmN0aW9uIHNpZ25hdHVyZSBmb3IgYWN0aW9uIGV2ZW50cy5cbiAqXG4gKiBUaHJvd2luZyBhbiBlcnJvciBzaWduYWxzIGFjdGlvbiBmYWlsdXJlLiBUaGUgZXJyb3IgbWVzc2FnZSBpcyBsb2dnZWQgYW5kXG4gKiBzdXJmYWNlZCB0byB0aGUgdXNlci4gRm9yIGV4cGVjdGVkIGVycm9ycywgdGhyb3cgd2l0aCBhIGRlc2NyaXB0aXZlIG1lc3NhZ2UuXG4gKlxuICogQHBhcmFtIGlucHV0IC0gQWN0aW9uIGlucHV0IHBheWxvYWQgZnJvbSBlbnZpcm9ubWVudCB2YXJpYWJsZXNcbiAqIEBwYXJhbSBjb250ZXh0IC0gUnVudGltZSBjb250ZXh0IHdpdGggbG9nZ2VyLCBjd2QsIGFuZCBjYWxsYmFjayBtZXRob2RzXG4gKiBAcmV0dXJucyBQcm9taXNlIHRoYXQgcmVzb2x2ZXMgd2hlbiB0aGUgYWN0aW9uIGNvbXBsZXRlc1xuICpcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBjb25zdCBoYW5kbGVyOiBBY3Rpb25IYW5kbGVyID0gYXN5bmMgKGlucHV0LCB7IGxvZ2dlciwgb25DYW5jZWwgfSkgPT4ge1xuICogICBvbkNhbmNlbCgoKSA9PiB7XG4gKiAgICAgbG9nZ2VyLmluZm8oJ0NhbmNlbGxpbmcgYWN0aW9uJyk7XG4gKiAgIH0pO1xuICpcbiAqICAgdHJ5IHtcbiAqICAgICBsb2dnZXIuaW5mbygnU3RhcnRpbmcgYWN0aW9uJywgeyBjYXJkSWQ6IGlucHV0LmNhcmRJZCB9KTtcbiAqICAgICBhd2FpdCBwZXJmb3JtQWN0aW9uKGlucHV0KTtcbiAqICAgICBsb2dnZXIuaW5mbygnQWN0aW9uIGNvbXBsZXRlZCBzdWNjZXNzZnVsbHknKTtcbiAqICAgfSBjYXRjaCAoZXJyKSB7XG4gKiAgICAgbG9nZ2VyLmxvZ0Vycm9yKGVyciwgJ0FjdGlvbiBmYWlsZWQnKTtcbiAqICAgICB0aHJvdyBlcnI7IC8vIFJlLXRocm93IHRvIHNpZ25hbCBmYWlsdXJlXG4gKiAgIH1cbiAqIH07XG4gKiBgYGBcbiAqL1xuZXhwb3J0IHR5cGUgQWN0aW9uSGFuZGxlciA9IChpbnB1dDogQWN0aW9uSW5wdXQsIGNvbnRleHQ6IEFjdGlvbkNvbnRleHQpID0+IHZvaWQgfCBQcm9taXNlPHZvaWQ+O1xuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBGYWN0b3J5IEZ1bmN0aW9uXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbi8qKlxuICogQ3JlYXRlcyBhbiBhY3Rpb24gaGFuZGxlciB3aXRoIG1ldGFkYXRhIGZvciBzZXR0aW5ncy5qc29uIGdlbmVyYXRpb24uXG4gKlxuICogVGhpcyBmYWN0b3J5IHdyYXBzIHlvdXIgaGFuZGxlciBmdW5jdGlvbiBhbmQgYXR0YWNoZXMgbWV0YWRhdGEgdGhhdCB0aGUgQ0xJXG4gKiBleHRyYWN0cyB3aGVuIGJ1aWxkaW5nIHNldHRpbmdzLmpzb24uIFRoZSByZXR1cm5lZCBjb21tYW5kIGlzIGJvdGggY2FsbGFibGVcbiAqIChmb3IgdGhlIHJ1bnRpbWUpIGFuZCBpbnNwZWN0YWJsZSAoZm9yIHRoZSBDTEkpLlxuICpcbiAqIFRoZSBnZW5lcmljIHBhcmFtZXRlciBwcmVzZXJ2ZXMgdGhlIGFjdGlvbiBuYW1lIGFzIGEgbGl0ZXJhbCB0eXBlLlxuICpcbiAqIEB0ZW1wbGF0ZSBUIC0gVGhlIGNvbmZpZyB0eXBlIGV4dGVuZGluZyBBY3Rpb25Db25maWdcbiAqIEBwYXJhbSBjb25maWcgLSBBY3Rpb24gbWV0YWRhdGEgKHVzZXMgU2FtZVNoYXBlIHRvIGNhdGNoIHR5cG9zKVxuICogQHBhcmFtIGhhbmRsZXIgLSBBc3luYyBmdW5jdGlvbiB0aGF0IGltcGxlbWVudHMgdGhlIGFjdGlvbiBsb2dpY1xuICogQHJldHVybnMgQSBjYWxsYWJsZSBjb21tYW5kIHdpdGggYXR0YWNoZWQgbWV0YWRhdGFcbiAqXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogLy8gQmFzaWMgdXNhZ2VcbiAqIGV4cG9ydCBkZWZhdWx0IGRlZmluZUFjdGlvbihcbiAqICAgeyBhY3Rpb25OYW1lOiAnTGF1bmNoIENsYXVkZScgfSxcbiAqICAgYXN5bmMgKGlucHV0LCB7IGxvZ2dlciB9KSA9PiB7XG4gKiAgICAgbG9nZ2VyLmluZm8oJ0xhdW5jaGluZyBDbGF1ZGUnLCB7IGNhcmRJZDogaW5wdXQuY2FyZElkIH0pO1xuICogICAgIGF3YWl0IHNwYXduQ2xhdWRlKGlucHV0KTtcbiAqICAgfVxuICogKTtcbiAqIGBgYFxuICpcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiAvLyBXaXRoIGZ1bGwgY29uZmlndXJhdGlvblxuICogZXhwb3J0IGRlZmF1bHQgZGVmaW5lQWN0aW9uKFxuICogICB7XG4gKiAgICAgYWN0aW9uTmFtZTogJ0RlcGxveSBBcHBsaWNhdGlvbicsXG4gKiAgICAgZGVzY3JpcHRpb246ICdEZXBsb3kgdG8gcHJvZHVjdGlvbicsXG4gKiAgICAgaWNvbjogJy4vaWNvbnMvZGVwbG95LnN2ZycsXG4gKiAgICAgc3VwcG9ydHNCYWNrZ3JvdW5kTW9kZTogdHJ1ZSxcbiAqICAgICBhbGxvd0NvbmN1cnJlbnQ6IGZhbHNlLFxuICogICAgIHRpbWVvdXQ6IDYwMDAwXG4gKiAgIH0sXG4gKiAgIGFzeW5jIChpbnB1dCwgY29udGV4dCkgPT4ge1xuICogICAgIGNvbnRleHQub25DYW5jZWwoKCkgPT4gY2xlYW51cCgpKTtcbiAqICAgICBhd2FpdCBkZXBsb3koaW5wdXQsIGNvbnRleHQpO1xuICogICB9XG4gKiApO1xuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBkZWZpbmVBY3Rpb248VCBleHRlbmRzIEFjdGlvbkNvbmZpZz4oXG4gIGNvbmZpZzogU2FtZVNoYXBlPEFjdGlvbkNvbmZpZywgVD4sXG4gIGhhbmRsZXI6IEFjdGlvbkhhbmRsZXJcbik6IEFjdGlvbkNvbW1hbmQ8VFsnYWN0aW9uTmFtZSddPiB7XG4gIGNvbnN0IGZuID0gYXN5bmMgKGlucHV0OiBBY3Rpb25JbnB1dCwgY29udGV4dDogQWN0aW9uQ29udGV4dCk6IFByb21pc2U8dm9pZD4gPT4ge1xuICAgIGF3YWl0IGhhbmRsZXIoaW5wdXQsIGNvbnRleHQpO1xuICB9O1xuXG4gIGZuLmZhY3RvcnlUeXBlID0gJ2FjdGlvbicgYXMgY29uc3Q7XG4gIGZuLmlkID0gY29uZmlnLmlkO1xuICBmbi5hY3Rpb25OYW1lID0gY29uZmlnLmFjdGlvbk5hbWU7XG4gIGZuLmRlc2NyaXB0aW9uID0gY29uZmlnLmRlc2NyaXB0aW9uO1xuICBmbi5pY29uID0gY29uZmlnLmljb247XG4gIGZuLnN1cHBvcnRzQmFja2dyb3VuZE1vZGUgPSBjb25maWcuc3VwcG9ydHNCYWNrZ3JvdW5kTW9kZTtcbiAgZm4uYWxsb3dDb25jdXJyZW50ID0gY29uZmlnLmFsbG93Q29uY3VycmVudDtcbiAgZm4udGltZW91dCA9IGNvbmZpZy50aW1lb3V0O1xuICBmbi5zb3VyY2VQYXRoID0gY29uZmlnLnNvdXJjZVBhdGg7XG5cbiAgcmV0dXJuIGZuIGFzIEFjdGlvbkNvbW1hbmQ8VFsnYWN0aW9uTmFtZSddPjtcbn1cbiIsICIvKipcbiAqIEVudmlyb25tZW50IHZhcmlhYmxlIHV0aWxpdGllcyBmb3IgQ2FyZHMgRXh0ZW5zaW9uIGFjdGlvbnMgYW5kIHR5cGUgaG9va3MuXG4gKlxuICogVGhlIGV4ZWN1dGlvbiB3cmFwcGVyIGluamVjdHMgYWN0aW9uIGFuZCB0eXBlIGhvb2sgaW5wdXRzIHZpYSBwcm9jZXNzLmVudi5cbiAqIFRoaXMgbW9kdWxlIHByb3ZpZGVzIHN0cmljdCBnZXR0ZXJzIGFuZCB0eXBlZCBleHRyYWN0b3JzIHNvIGhhbmRsZXJzIGRvIG5vdFxuICogbmVlZCB0byBwYXJzZSBlbnZpcm9ubWVudCB2YXJpYWJsZXMgbWFudWFsbHkuXG4gKlxuICogVXNlIHRoZSBpbmRpdmlkdWFsIGdldHRlcnMgd2hlbiB5b3Ugb25seSBuZWVkIG9uZSB2YWx1ZTsgdXNlXG4gKiB7QGxpbmsgZXh0cmFjdEFjdGlvbklucHV0fSBvciB7QGxpbmsgZXh0cmFjdFR5cGVJbnB1dH0gd2hlbiB5b3UgbmVlZCBhIGZ1bGxcbiAqIHR5cGVkIHBheWxvYWQgZm9yIGFuIGFjdGlvbiBvciB0eXBlIGhvb2suXG4gKlxuICpcbiAqIEBzdW1tYXJ5IEVudmlyb25tZW50IHZhcmlhYmxlIHV0aWxpdGllcyBmb3IgQ2FyZHMgRXh0ZW5zaW9uIGFjdGlvbnMgYW5kIHR5cGUgaG9va3NcbiAqIEBtb2R1bGVcbiAqL1xuXG5pbXBvcnQgeyByZWFkRmlsZVN5bmMgfSBmcm9tICdub2RlOmZzJztcbmltcG9ydCB0eXBlIHsgQWN0aW9uSW5wdXQsIFR5cGVIb29rSW5wdXQgfSBmcm9tICcuL2lucHV0cy5qcyc7XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIENvbnN0YW50c1xuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4vKipcbiAqIEVudmlyb25tZW50IHZhcmlhYmxlIG5hbWVzIHNldCBieSB0aGUgQ2FyZHMgZXhlY3V0aW9uIHdyYXBwZXIuXG4gKlxuICogVGhpcyBpcyB0aGUgc2luZ2xlIHNvdXJjZSBvZiB0cnV0aCBmb3IgZW52IHZhciBrZXlzIHVzZWQgYnkgYWN0aW9uIGFuZCB0eXBlXG4gKiBob29rIHByb2Nlc3Nlcy4gS2VlcCBpdCBpbiBzeW5jIHdpdGggdGhlIHdyYXBwZXIgdG8gYXZvaWQgc3VidGxlIFwidW5kZWZpbmVkXG4gKiBpbnB1dFwiIGJ1Z3MuXG4gKi9cbmV4cG9ydCBjb25zdCBDQVJEU19FTlZfVkFSUyA9IHtcbiAgLyoqXG4gICAqIFVuaXF1ZSBpZGVudGlmaWVyIGZvciB0aGUgY3VycmVudCBjYXJkLlxuICAgKiBBdmFpbGFibGUgaW4gYWxsIGFjdGlvbnMgYW5kIHR5cGUgaG9va3MuXG4gICAqL1xuICBDQVJEX0lEOiAnQ0FSRF9JRCcsXG5cbiAgLyoqXG4gICAqIFRoZSBlbnZpcm9ubWVudCBuYW1lIGZyb20gc2V0dGluZ3MuanNvbi5cbiAgICogQXZhaWxhYmxlIGluIGFsbCBhY3Rpb25zIGFuZCB0eXBlIGhvb2tzLlxuICAgKi9cbiAgRU5WSVJPTk1FTlQ6ICdFTlZJUk9OTUVOVCcsXG5cbiAgLyoqXG4gICAqIERpc3BsYXkgbmFtZSBvZiB0aGUgYWN0aW9uIGJ1dHRvbiB0aGF0IHRyaWdnZXJlZCB0aGlzIGhhbmRsZXIuXG4gICAqIEF2YWlsYWJsZSBpbiBhY3Rpb25zIG9ubHkgKG5vdCB0eXBlIGhvb2tzKS5cbiAgICovXG4gIEFDVElPTl9OQU1FOiAnQUNUSU9OX05BTUUnLFxuXG4gIC8qKlxuICAgKiBDYXJkJ3MgZXhlY3V0aW9uIG1vZGUsIGRldGVybWluaW5nIFVJIGludGVyYWN0aW9uIG1vZGVsLlxuICAgKiBBdmFpbGFibGUgaW4gYWN0aW9ucyBvbmx5IChub3QgdHlwZSBob29rcykuXG4gICAqIFZhbGlkIHZhbHVlczogJ2ludGVyYWN0aXZlJyB8ICdiYWNrZ3JvdW5kJ1xuICAgKi9cbiAgRVhFQ1VUSU9OX01PREU6ICdFWEVDVVRJT05fTU9ERScsXG5cbiAgLyoqXG4gICAqIENhcmRzIHNlcnZlciBiYXNlIFVSTCBmb3IgQVBJIGNhbGxzLlxuICAgKiBBdmFpbGFibGUgaW4gYWxsIGFjdGlvbnMgYW5kIHR5cGUgaG9va3MuXG4gICAqL1xuICBBUElfQkFTRV9VUkw6ICdBUElfQkFTRV9VUkwnLFxuXG4gIC8qKlxuICAgKiBBdXRoZW50aWNhdGlvbiB0b2tlbiBmb3IgQVBJIGNhbGxzLlxuICAgKiBBdmFpbGFibGUgaW4gYWxsIGFjdGlvbnMgYW5kIHR5cGUgaG9va3MuXG4gICAqL1xuICBBUElfQUNDRVNTX1RPS0VOOiAnQVBJX0FDQ0VTU19UT0tFTicsXG5cbiAgLyoqXG4gICAqIENvbmZpZ3VyZWQgY29kaW5nIGFnZW50IGlkZW50aWZpZXIgZnJvbSBjYXJkcy5jb2RpbmdBZ2VudCBzZXR0aW5nLlxuICAgKiBBdmFpbGFibGUgaW4gYWN0aW9ucyBvbmx5IChub3QgdHlwZSBob29rcykuXG4gICAqIE9wdGlvbmFsLlxuICAgKi9cbiAgQ09ESU5HX0FHRU5UOiAnQ09ESU5HX0FHRU5UJyxcblxuICAvKipcbiAgICogVGhlIHJlZ2lzdGVyZWQgdHlwZSBuYW1lLlxuICAgKiBBdmFpbGFibGUgaW4gdHlwZSBob29rcyBvbmx5LlxuICAgKi9cbiAgVFlQRV9OQU1FOiAnVFlQRV9OQU1FJyxcblxuICAvKipcbiAgICogVGhlIHR5cGUncyB2ZXJzaW9uIHN0cmluZyBmcm9tIHNldHRpbmdzLmpzb24gY29uZmlndXJhdGlvbi5cbiAgICogQXZhaWxhYmxlIGluIHR5cGUgaG9va3Mgb25seS5cbiAgICovXG4gIFRZUEVfVkVSU0lPTjogJ1RZUEVfVkVSU0lPTicsXG5cbiAgLyoqXG4gICAqIFRoZSBmaWxlIG5hbWUgd2l0aGluIHRoZSB0eXBlIGRpcmVjdG9yeS5cbiAgICogQXZhaWxhYmxlIGluIHR5cGUgaG9va3Mgb25seS5cbiAgICovXG4gIEZJTEVfTkFNRTogJ0ZJTEVfTkFNRScsXG5cbiAgLyoqXG4gICAqIEZ1bGwgcGF0aCB0byB0aGUgZmlsZS5cbiAgICogQXZhaWxhYmxlIGluIHR5cGUgaG9va3Mgb25seS5cbiAgICovXG4gIEZJTEVfUEFUSDogJ0ZJTEVfUEFUSCcsXG5cbiAgLyoqXG4gICAqIEZpbGUgc2l6ZSBpbiBieXRlcy5cbiAgICogQXZhaWxhYmxlIGluIHR5cGUgaG9va3Mgb25seS5cbiAgICovXG4gIEZJTEVfU0laRTogJ0ZJTEVfU0laRScsXG5cbiAgLyoqXG4gICAqIFNIQTI1NiBoYXNoIG9mIGNvbnRlbnQuXG4gICAqIEF2YWlsYWJsZSBpbiB0eXBlIGhvb2tzIG9ubHkuXG4gICAqL1xuICBTSEEyNTY6ICdTSEEyNTYnLFxuXG4gIC8qKlxuICAgKiBNSU1FIHR5cGUgb2YgdGhlIGNvbnRlbnQuXG4gICAqIEF2YWlsYWJsZSBpbiB0eXBlIGhvb2tzIG9ubHkuXG4gICAqL1xuICBDT05URU5UX1RZUEU6ICdDT05URU5UX1RZUEUnLFxuXG4gIC8qKlxuICAgKiBQYXRoIHRvIHRoZSBWUyBDb2RlIGJ1bmRsZWQgTm9kZS5qcyBpbnRlcnByZXRlci5cbiAgICpcbiAgICogU2V0IGJ5IHRoZSBleHRlbnNpb24gaG9zdCBmcm9tIGBwcm9jZXNzLmV4ZWNQYXRoYCAod2l0aFxuICAgKiBgRUxFQ1RST05fUlVOX0FTX05PREU9MWApLiBDb21tYW5kcyBpbiBzZXR0aW5ncy5qc29uIHVzZVxuICAgKiBgJFZTQ09ERV9OT0RFIC4vYmluLy4uLmAgc28gdGhleSB3b3JrIHJlZ2FyZGxlc3Mgb2ZcbiAgICogd2hldGhlciBgbm9kZWAgaXMgb24gdGhlIHN5c3RlbSBQQVRILlxuICAgKlxuICAgKiBBdmFpbGFibGUgaW4gYWxsIGFjdGlvbnMgYW5kIHR5cGUgaG9va3MuXG4gICAqL1xuICBWU0NPREVfTk9ERTogJ1ZTQ09ERV9OT0RFJyxcblxuICAvKipcbiAgICogUGF0aCB0byB0aGUgTm9kZS5qcyBpbnRlcnByZXRlciBydW5uaW5nIHRoZSB3cmFwcGVyIHByb2Nlc3MuXG4gICAqXG4gICAqIFNldCBieSB0aGUgd3JhcHBlciBmcm9tIGBwcm9jZXNzLmV4ZWNQYXRoYC4gVXNlIGAkTk9ERWAgaW4gZW1iZWRkZWRcbiAgICogYmFzaCBzdGF0ZW1lbnRzIHRvIGludm9rZSBOb2RlIHNjcmlwdHMgcG9ydGFibHkuXG4gICAqXG4gICAqIEF2YWlsYWJsZSBpbiBhbGwgYWN0aW9ucy5cbiAgICovXG4gIE5PREU6ICdOT0RFJyxcblxuICAvKipcbiAgICogUGF0aCB0byB0aGUgVW5peCBkb21haW4gc29ja2V0IGZvciBydW50aW1lLXRvLWRpc3BhdGNoZXIgY29tbXVuaWNhdGlvbi5cbiAgICogQXZhaWxhYmxlIGluIGFjdGlvbnMgb25seS5cbiAgICovXG4gIFNPQ0tFVF9QQVRIOiAnU09DS0VUX1BBVEgnLFxuXG4gIC8qKlxuICAgKiBQYXRoIHRvIGEgSlNPTiBmaWxlIGNvbnRhaW5pbmcgc3dpdGNoVG9JbnRlcmFjdGl2ZSBkYXRhIGZyb20gYSBwcmV2aW91cyBoYW5kbGVyLlxuICAgKiBBdmFpbGFibGUgaW4gYWN0aW9ucyBvbmx5LiBPcHRpb25hbC5cbiAgICovXG4gIFNXSVRDSF9UT19JTlRFUkFDVElWRV9EQVRBX1BBVEg6ICdTV0lUQ0hfVE9fSU5URVJBQ1RJVkVfREFUQV9QQVRIJyxcblxuICAvKipcbiAgICogUGF0aCB0byB0aGUgc2V0dGluZ3MgY29uZmlndXJhdGlvbiBkaXJlY3RvcnkuXG4gICAqIEF2YWlsYWJsZSBpbiBhY3Rpb25zIG9ubHkuXG4gICAqL1xuICBDT05GSUdfUEFUSDogJ0NPTkZJR19QQVRIJyxcblxuICAvKipcbiAgICogUGF0aCB0byB0aGUgVlMgQ29kZSB3b3Jrc3BhY2Ugcm9vdCBkaXJlY3RvcnkuXG4gICAqIFNldCBieSB0aGUgYWN0aW9uIGhhbmRsZXIgKGUuZy4sIGxhdW5jaC50cykgdG8gdGhlIHdvcmt0cmVlIHBhdGguXG4gICAqIEF2YWlsYWJsZSBpbiBob29rcyBydW5uaW5nIGluc2lkZSB0aGUgY2xhdWRlIENMSS5cbiAgICovXG4gIFdPUktTUEFDRV9QQVRIOiAnV09SS1NQQUNFX1BBVEgnLFxuXG4gIC8qKlxuICAgKiBBYnNvbHV0ZSBwYXRoIHRvIHRoZSBtYWluIGdpdCByZXBvc2l0b3J5IHJvb3QgKE5PVCBhIHdvcmt0cmVlKS5cbiAgICogU2V0IGJ5IEFjdGlvbkRpc3BhdGNoZXI7IGNvbnN1bWVkIGJ5IHRoZSB3cmFwcGVyIGFuZCB3YXRjaGVyIGZvclxuICAgKiBnaXQgb3BlcmF0aW9ucyAod29ya3RyZWUgcmVtb3ZhbCwgYnJhbmNoIGRlbGV0aW9uKSB0aGF0IG11c3QgcnVuXG4gICAqIGFnYWluc3QgdGhlIG1haW4gcmVwb3NpdG9yeS5cbiAgICovXG4gIFJFUE9fUk9PVDogJ1JFUE9fUk9PVCcsXG5cbiAgLyoqXG4gICAqIFBhdGggdG8gdGhlIGNhcmQncyByZXBvc2l0b3J5IGRpcmVjdG9yeS5cbiAgICogQXZhaWxhYmxlIGluIGFjdGlvbnMgb25seS5cbiAgICovXG4gIENBUkRfUkVQT19QQVRIOiAnQ0FSRF9SRVBPX1BBVEgnLFxuXG4gIC8qKlxuICAgKiBSZXNvbHZlZCBzaGVsbCBjb21tYW5kIGZvciB0aGUgd3JhcHBlciB0byBzcGF3biBhcyB0aGUgYWN0aW9uIGhhbmRsZXIuXG4gICAqIFNldCBieSBBY3Rpb25EaXNwYXRjaGVyOyBjb25zdW1lZCBieSB0aGUgd3JhcHBlciAobm90IGJ5IGFjdGlvbiBoYW5kbGVycykuXG4gICAqL1xuICBBQ1RJT05fQ09NTUFORDogJ0FDVElPTl9DT01NQU5EJyxcblxuICAvKipcbiAgICogR2l0IGJyYW5jaCB0aGF0IHRoZSBjYXJkJ3Mgd29ya3NwYWNlIGJyYW5jaCB3aWxsIG1lcmdlIGludG8uXG4gICAqIFJlc29sdmVkIGZyb20gdGhlIHdvcmtzcGFjZSBIRUFEIGF0IGxhdW5jaCB0aW1lLlxuICAgKiBTZXQgYnkgdGhlIGxhdW5jaCBhY3Rpb24uXG4gICAqIEF2YWlsYWJsZSBpbiBhY3Rpb25zIG9ubHkuXG4gICAqL1xuICBCQVNFX0JSQU5DSDogJ0JBU0VfQlJBTkNIJyxcblxuICAvKipcbiAgICogR2l0IGJyYW5jaCBmcm9tIHdoaWNoIHRoZSBjYXJkJ3Mgd29ya3NwYWNlIGJyYW5jaCB3YXMgY3JlYXRlZC5cbiAgICogTWF5IGRpZmZlciBmcm9tIEJBU0VfQlJBTkNIIHdoZW4gdGhlIHdvcmt0cmVlIHdhcyBjcmVhdGVkIGFnYWluc3RcbiAgICogYSBkaWZmZXJlbnQgcmVmIHRoYW4gdGhlIGN1cnJlbnQgd29ya3NwYWNlIEhFQUQuXG4gICAqIFNldCBieSB0aGUgbGF1bmNoIGFjdGlvbi5cbiAgICogQXZhaWxhYmxlIGluIGFjdGlvbnMgb25seS5cbiAgICovXG4gIFBBUkVOVF9CUkFOQ0g6ICdQQVJFTlRfQlJBTkNIJyxcblxuICAvKipcbiAgICogR2l0IGJyYW5jaCBuYW1lIGZvciB0aGUgY2FyZCdzIHdvcmtzcGFjZSBpbXBsZW1lbnRhdGlvbi5cbiAgICogU2V0IGJ5IHRoZSBsYXVuY2ggYWN0aW9uIGFmdGVyIHJlc29sdmluZyBvciBjcmVhdGluZyB0aGUgd29ya3RyZWUuXG4gICAqIEF2YWlsYWJsZSBpbiBhY3Rpb25zIG9ubHkuXG4gICAqL1xuICBXT1JLU1BBQ0VfQlJBTkNIOiAnV09SS1NQQUNFX0JSQU5DSCcsXG5cbiAgLyoqXG4gICAqIFNlc3Npb24gSUQgcGVyc2lzdGVkIGJ5IHRoZSBzZXNzaW9uLXN0YXJ0IGhvb2sgdmlhIGBwZXJzaXN0RW52VmFyYC5cbiAgICpcbiAgICogQXZhaWxhYmxlIGluIEJhc2ggdG9vbCBzaGVsbCBkZXNjZW5kYW50cyAoY29tbWFuZHMsIGdpdCBob29rcykgYWZ0ZXJcbiAgICogc2Vzc2lvbiBzdGFydC4gTk9UIGF2YWlsYWJsZSBpbiBob29rcyBzcGF3bmVkIGRpcmVjdGx5IGJ5IENsYXVkZSBDb2RlXG4gICAqIChzdG9wLCBzZXNzaW9uLWVuZCwgZXRjLikgXHUyMDE0IHRob3NlIHJlY2VpdmUgdGhlIHNlc3Npb24gSUQgdmlhIGhvb2sgaW5wdXQuXG4gICAqXG4gICAqIFRoZSBjYXJkLXJlcG8gcG9zdC1jb21taXQgaG9vayByZWFkcyB0aGlzIHRvIHJlY29yZCBjb21taXRzIGRpcmVjdGx5XG4gICAqIHdpdGhvdXQgbmVlZGluZyBhIHByb2Nlc3MtdHJlZSB3YWxrIG9yIFBJRCByZWdpc3RyeSBsb29rdXAuXG4gICAqL1xuICBDQVJEU19TRVNTSU9OX0lEOiAnQ0FSRFNfU0VTU0lPTl9JRCcsXG5cbiAgLyoqXG4gICAqIEFic29sdXRlIHBhdGggdG8gdGhlIFZTIENvZGUgZXh0ZW5zaW9uIGluc3RhbGxhdGlvbiBkaXJlY3RvcnkuXG4gICAqXG4gICAqIFNldCBieSB0aGUgZXh0ZW5zaW9uIGhvc3QgZnJvbSBgY29udGV4dC5leHRlbnNpb25VcmkuZnNQYXRoYCBhbmQgaW5qZWN0ZWRcbiAgICogaW50byBhbGwgc3Bhd25lZCBhY3Rpb24gcHJvY2Vzc2VzLiBVc2UgdGhpcyB0byBsb2NhdGUgYnVuZGxlZCBhc3NldHMgc3VjaFxuICAgKiBhcyB0aGUgcnVudGltZSBwbHVnaW4gZGlyZWN0b3J5IChgPGV4dGVuc2lvblBhdGg+L2Rpc3QvcGx1Z2lucy9ydW50aW1lYCkuXG4gICAqXG4gICAqIEF2YWlsYWJsZSBpbiBhY3Rpb25zIG9ubHkgKG5vdCB0eXBlIGhvb2tzKS5cbiAgICovXG4gIEVYVEVOU0lPTl9QQVRIOiAnRVhURU5TSU9OX1BBVEgnLFxuXG4gIC8qKlxuICAgKiBBYnNvbHV0ZSBwYXRoIHRvIHRoZSBDYXJkcyBob29rcyBsb2cgZmlsZS5cbiAgICpcbiAgICogU2V0IGJ5IEFjdGlvbkRpc3BhdGNoZXIgYXQgcnVudGltZS4gUmVhZCBieSB0aGUgTG9nZ2VyIHNpbmdsZXRvblxuICAgKiBhdCBjb25zdHJ1Y3Rpb24gdGltZSB0byBkZXRlcm1pbmUgd2hlcmUgaG9vayBleGVjdXRpb24gbG9ncyBhcmUgd3JpdHRlbi5cbiAgICpcbiAgICogQXZhaWxhYmxlIGluIGFsbCBhY3Rpb25zIGFuZCB0eXBlIGhvb2tzLlxuICAgKi9cbiAgSE9PS1NfTE9HX0ZJTEU6ICdDQVJEU19IT09LU19MT0dfRklMRSdcbn0gYXMgY29uc3Q7XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIEluZGl2aWR1YWwgR2V0dGVyc1xuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4vKipcbiAqIFJlYWRzIHRoZSBjYXJkIGlkZW50aWZpZXIgZnJvbSB0aGUgZW52aXJvbm1lbnQuXG4gKlxuICogVGhlIGV4ZWN1dGlvbiB3cmFwcGVyIGFsd2F5cyBzZXRzIHRoaXMgZm9yIGV2ZXJ5IGFjdGlvbiBhbmQgdHlwZSBob29rLlxuICogQHJldHVybnMgVGhlIGN1cnJlbnQgY2FyZCBJRFxuICogQHRocm93cyBFcnJvciBpZiBDQVJEX0lEIGlzIG1pc3Npbmcgb3IgZW1wdHlcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBjb25zdCBjYXJkSWQgPSBnZXRDYXJkSWQoKTtcbiAqIGNvbnNvbGUubG9nKGBQcm9jZXNzaW5nIGNhcmQ6ICR7Y2FyZElkfWApO1xuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRDYXJkSWQoKTogc3RyaW5nIHtcbiAgY29uc3QgdmFsdWUgPSBwcm9jZXNzLmVudltDQVJEU19FTlZfVkFSUy5DQVJEX0lEXTtcbiAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQgfHwgdmFsdWUgPT09ICcnKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIHJlcXVpcmVkIGVudmlyb25tZW50IHZhcmlhYmxlOiAke0NBUkRTX0VOVl9WQVJTLkNBUkRfSUR9YCk7XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG4vKipcbiAqIFJlYWRzIHRoZSBlbnZpcm9ubWVudCBuYW1lIGZyb20gdGhlIGVudmlyb25tZW50LlxuICpcbiAqIFRoaXMgdmFsdWUgbWF0Y2hlcyB0aGUgZW52aXJvbm1lbnQga2V5IGluIHNldHRpbmdzLmpzb24gKGUuZy4sIFwiZGVmYXVsdFwiLCBcInN0YWdpbmdcIikuXG4gKiBAcmV0dXJucyBUaGUgZW52aXJvbm1lbnQgbmFtZVxuICogQHRocm93cyBFcnJvciBpZiBFTlZJUk9OTUVOVCBpcyBtaXNzaW5nIG9yIGVtcHR5XG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogY29uc3QgZW52aXJvbm1lbnQgPSBnZXRFbnZpcm9ubWVudCgpO1xuICogY29uc29sZS5sb2coYEVudmlyb25tZW50OiAke2Vudmlyb25tZW50fWApO1xuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRFbnZpcm9ubWVudCgpOiBzdHJpbmcge1xuICBjb25zdCB2YWx1ZSA9IHByb2Nlc3MuZW52W0NBUkRTX0VOVl9WQVJTLkVOVklST05NRU5UXTtcbiAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQgfHwgdmFsdWUgPT09ICcnKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIHJlcXVpcmVkIGVudmlyb25tZW50IHZhcmlhYmxlOiAke0NBUkRTX0VOVl9WQVJTLkVOVklST05NRU5UfWApO1xuICB9XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuLyoqXG4gKiBSZWFkcyB0aGUgYWN0aW9uIGJ1dHRvbiBuYW1lIGZyb20gdGhlIGVudmlyb25tZW50LlxuICpcbiAqIFRoaXMgaXMgdGhlIGRpc3BsYXkgbmFtZSBvZiB0aGUgYWN0aW9uIHRoYXQgdHJpZ2dlcmVkIHRoZSBoYW5kbGVyLCBtYXRjaGluZ1xuICogdGhlIGBhY3Rpb25OYW1lYCBmaWVsZCBmcm9tIGBkZWZpbmVBY3Rpb25gLlxuICogQHJldHVybnMgRGlzcGxheSBuYW1lIG9mIHRoZSBhY3Rpb24gdGhhdCB0cmlnZ2VyZWQgdGhlIGN1cnJlbnQgaGFuZGxlciBydW4uXG4gKiBAdGhyb3dzIEVycm9yIGlmIEFDVElPTl9OQU1FIGlzIG1pc3Npbmcgb3IgZW1wdHlcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBjb25zdCBhY3Rpb25OYW1lID0gZ2V0QWN0aW9uTmFtZSgpO1xuICogY29uc29sZS5sb2coYFJ1bm5pbmcgYWN0aW9uOiAke2FjdGlvbk5hbWV9YCk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldEFjdGlvbk5hbWUoKTogc3RyaW5nIHtcbiAgY29uc3QgdmFsdWUgPSBwcm9jZXNzLmVudltDQVJEU19FTlZfVkFSUy5BQ1RJT05fTkFNRV07XG4gIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IHZhbHVlID09PSAnJykge1xuICAgIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyByZXF1aXJlZCBlbnZpcm9ubWVudCB2YXJpYWJsZTogJHtDQVJEU19FTlZfVkFSUy5BQ1RJT05fTkFNRX1gKTtcbiAgfVxuICByZXR1cm4gdmFsdWU7XG59XG5cbi8qKlxuICogUmVhZHMgdGhlIGV4ZWN1dGlvbiBtb2RlIGZyb20gdGhlIGVudmlyb25tZW50LlxuICpcbiAqIERldGVybWluZXMgdGhlIFVJIGludGVyYWN0aW9uIG1vZGVsIGZvciBhY3Rpb25zLlxuICogQHJldHVybnMgVGhlIGV4ZWN1dGlvbiBtb2RlICgnaW50ZXJhY3RpdmUnIG9yICdiYWNrZ3JvdW5kJylcbiAqIEB0aHJvd3MgRXJyb3IgaWYgRVhFQ1VUSU9OX01PREUgaXMgbWlzc2luZywgZW1wdHksIG9yIGludmFsaWRcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBjb25zdCBtb2RlID0gZ2V0RXhlY3V0aW9uTW9kZSgpO1xuICogaWYgKG1vZGUgPT09ICdpbnRlcmFjdGl2ZScpIHtcbiAqICAgLy8gU2hvdyB1c2VyIHByb21wdHNcbiAqIH1cbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0RXhlY3V0aW9uTW9kZSgpOiAnaW50ZXJhY3RpdmUnIHwgJ2JhY2tncm91bmQnIHtcbiAgY29uc3QgdmFsdWUgPSBwcm9jZXNzLmVudltDQVJEU19FTlZfVkFSUy5FWEVDVVRJT05fTU9ERV07XG4gIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IHZhbHVlID09PSAnJykge1xuICAgIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyByZXF1aXJlZCBlbnZpcm9ubWVudCB2YXJpYWJsZTogJHtDQVJEU19FTlZfVkFSUy5FWEVDVVRJT05fTU9ERX1gKTtcbiAgfVxuICBpZiAodmFsdWUgIT09ICdpbnRlcmFjdGl2ZScgJiYgdmFsdWUgIT09ICdiYWNrZ3JvdW5kJykge1xuICAgIHRocm93IG5ldyBFcnJvcihgSW52YWxpZCAke0NBUkRTX0VOVl9WQVJTLkVYRUNVVElPTl9NT0RFfTogZXhwZWN0ZWQgJ2ludGVyYWN0aXZlJyBvciAnYmFja2dyb3VuZCcsIGdvdCBcIiR7dmFsdWV9XCJgKTtcbiAgfVxuICByZXR1cm4gdmFsdWU7XG59XG5cbi8qKlxuICogUmVhZHMgdGhlIEFQSSBiYXNlIFVSTCBmcm9tIHRoZSBlbnZpcm9ubWVudC5cbiAqXG4gKiBVc2UgdGhpcyBhcyB0aGUgYmFzZSBmb3IgY29uc3RydWN0aW5nIEFQSSBlbmRwb2ludHMuIFRoZSBVUkwgZG9lcyBub3QgaW5jbHVkZVxuICogYSB0cmFpbGluZyBzbGFzaC5cbiAqIEByZXR1cm5zIEJhc2UgVVJMIHVzZWQgdG8gY29uc3RydWN0IENhcmRzIEFQSSBlbmRwb2ludHMgZm9yIHRoaXMgZXhlY3V0aW9uLlxuICogQHRocm93cyBFcnJvciBpZiBBUElfQkFTRV9VUkwgaXMgbWlzc2luZyBvciBlbXB0eVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGNvbnN0IGFwaVVybCA9IGdldEFwaUJhc2VVcmwoKTtcbiAqIGNvbnN0IGVuZHBvaW50ID0gYCR7YXBpVXJsfS9jYXJkcy8ke2NhcmRJZH1gO1xuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRBcGlCYXNlVXJsKCk6IHN0cmluZyB7XG4gIGNvbnN0IHZhbHVlID0gcHJvY2Vzcy5lbnZbQ0FSRFNfRU5WX1ZBUlMuQVBJX0JBU0VfVVJMXTtcbiAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQgfHwgdmFsdWUgPT09ICcnKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIHJlcXVpcmVkIGVudmlyb25tZW50IHZhcmlhYmxlOiAke0NBUkRTX0VOVl9WQVJTLkFQSV9CQVNFX1VSTH1gKTtcbiAgfVxuICByZXR1cm4gdmFsdWU7XG59XG5cbi8qKlxuICogUmVhZHMgdGhlIEFQSSBhY2Nlc3MgdG9rZW4gZnJvbSB0aGUgZW52aXJvbm1lbnQuXG4gKlxuICogQmVhcmVyIHRva2VuIHZhbGlkIGZvciB0aGUgZHVyYXRpb24gb2YgdGhpcyBhY3Rpb24gb3IgdHlwZSBob29rIGV4ZWN1dGlvbi5cbiAqIEluY2x1ZGUgaW4gQXV0aG9yaXphdGlvbiBoZWFkZXJzIHdoZW4gY2FsbGluZyB0aGUgQ2FyZHMgQVBJLlxuICogQHJldHVybnMgQmVhcmVyIHRva2VuIHRoYXQgYXV0aG9yaXplcyBBUEkgcmVxdWVzdHMgZm9yIHRoaXMgZXhlY3V0aW9uIGNvbnRleHQuXG4gKiBAdGhyb3dzIEVycm9yIGlmIEFQSV9BQ0NFU1NfVE9LRU4gaXMgbWlzc2luZyBvciBlbXB0eVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGNvbnN0IHRva2VuID0gZ2V0QXBpQWNjZXNzVG9rZW4oKTtcbiAqIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZmV0Y2goYXBpVXJsLCB7XG4gKiAgIGhlYWRlcnM6IHsgQXV0aG9yaXphdGlvbjogYEJlYXJlciAke3Rva2VufWAgfVxuICogfSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldEFwaUFjY2Vzc1Rva2VuKCk6IHN0cmluZyB7XG4gIGNvbnN0IHZhbHVlID0gcHJvY2Vzcy5lbnZbQ0FSRFNfRU5WX1ZBUlMuQVBJX0FDQ0VTU19UT0tFTl07XG4gIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IHZhbHVlID09PSAnJykge1xuICAgIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyByZXF1aXJlZCBlbnZpcm9ubWVudCB2YXJpYWJsZTogJHtDQVJEU19FTlZfVkFSUy5BUElfQUNDRVNTX1RPS0VOfWApO1xuICB9XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuLyoqXG4gKiBSZWFkcyB0aGUgY29uZmlndXJlZCBjb2RpbmcgYWdlbnQgaWRlbnRpZmllciBmcm9tIHRoZSBlbnZpcm9ubWVudC5cbiAqXG4gKiBPcHRpb25hbCB2YWx1ZSBmcm9tIGNhcmRzLmNvZGluZ0FnZW50IHNldHRpbmcuIFdoZW4gc2V0LCBpbmRpY2F0ZXMgd2hpY2ggQUlcbiAqIGNvZGluZyBhc3Npc3RhbnQgdGhlIHVzZXIgcHJlZmVycy4gQWN0aW9ucyBjYW4gdXNlIHRoaXMgdG8gY3VzdG9taXplIGJlaGF2aW9yXG4gKiBvciBwcm9tcHRzIGZvciBkaWZmZXJlbnQgYWdlbnRzLlxuICogQHJldHVybnMgVGhlIGNvZGluZyBhZ2VudCBpZGVudGlmaWVyLCBvciB1bmRlZmluZWQgaWYgbm90IHNldFxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGNvbnN0IGNvZGluZ0FnZW50ID0gZ2V0Q29kaW5nQWdlbnQoKTtcbiAqIGlmIChjb2RpbmdBZ2VudCA9PT0gJ2NsYXVkZScpIHtcbiAqICAgLy8gQ3VzdG9taXplIGZvciBDbGF1ZGVcbiAqIH1cbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0Q29kaW5nQWdlbnQoKTogc3RyaW5nIHwgdW5kZWZpbmVkIHtcbiAgY29uc3QgdmFsdWUgPSBwcm9jZXNzLmVudltDQVJEU19FTlZfVkFSUy5DT0RJTkdfQUdFTlRdO1xuICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gJycpIHtcbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuLyoqXG4gKiBSZWFkcyB0aGUgcmVnaXN0ZXJlZCB0eXBlIG5hbWUgZm9yIHR5cGUgaG9va3MuXG4gKlxuICogVGhpcyB2YWx1ZSBpcyBvbmx5IHByZXNlbnQgZm9yIHR5cGUgaG9vayBldmVudHMuXG4gKiBAcmV0dXJucyBUaGUgcmVnaXN0ZXJlZCB0eXBlIG5hbWVcbiAqIEB0aHJvd3MgRXJyb3IgaWYgVFlQRV9OQU1FIGlzIG1pc3Npbmcgb3IgZW1wdHlcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBjb25zdCB0eXBlTmFtZSA9IGdldFR5cGVOYW1lKCk7XG4gKiBjb25zb2xlLmxvZyhgVHlwZTogJHt0eXBlTmFtZX1gKTtcbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0VHlwZU5hbWUoKTogc3RyaW5nIHtcbiAgY29uc3QgdmFsdWUgPSBwcm9jZXNzLmVudltDQVJEU19FTlZfVkFSUy5UWVBFX05BTUVdO1xuICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gJycpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYE1pc3NpbmcgcmVxdWlyZWQgZW52aXJvbm1lbnQgdmFyaWFibGU6ICR7Q0FSRFNfRU5WX1ZBUlMuVFlQRV9OQU1FfWApO1xuICB9XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuLyoqXG4gKiBSZWFkcyB0aGUgdHlwZSB2ZXJzaW9uIGZyb20gdGhlIGVudmlyb25tZW50LlxuICpcbiAqIFRoaXMgdmVyc2lvbiBjb21lcyBmcm9tIHRoZSB0eXBlIGNvbmZpZ3VyYXRpb24gaW4gc2V0dGluZ3MuanNvbi5cbiAqIEByZXR1cm5zIFRoZSB2ZXJzaW9uIHN0cmluZyBmcm9tIHR5cGUgY29uZmlnXG4gKiBAdGhyb3dzIEVycm9yIGlmIFRZUEVfVkVSU0lPTiBpcyBtaXNzaW5nIG9yIGVtcHR5XG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogY29uc3QgdmVyc2lvbiA9IGdldFR5cGVWZXJzaW9uKCk7XG4gKiBjb25zb2xlLmxvZyhgVmVyc2lvbjogJHt2ZXJzaW9ufWApO1xuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRUeXBlVmVyc2lvbigpOiBzdHJpbmcge1xuICBjb25zdCB2YWx1ZSA9IHByb2Nlc3MuZW52W0NBUkRTX0VOVl9WQVJTLlRZUEVfVkVSU0lPTl07XG4gIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IHZhbHVlID09PSAnJykge1xuICAgIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyByZXF1aXJlZCBlbnZpcm9ubWVudCB2YXJpYWJsZTogJHtDQVJEU19FTlZfVkFSUy5UWVBFX1ZFUlNJT059YCk7XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG4vKipcbiAqIFJlYWRzIHRoZSB0eXBlZCBmaWxlIG5hbWUgZm9yIHR5cGUgaG9vayBldmVudHMuXG4gKlxuICogVGhpcyBpcyB0aGUgZmlsZSBuYW1lIHJlbGF0aXZlIHRvIHRoZSB0eXBlIGRpcmVjdG9yeSwgbm90IGEgZnVsbCBwYXRoLlxuICogQHJldHVybnMgVGhlIGZpbGUgbmFtZSB3aXRoaW4gdGhlIHR5cGUgZGlyZWN0b3J5XG4gKiBAdGhyb3dzIEVycm9yIGlmIEZJTEVfTkFNRSBpcyBtaXNzaW5nIG9yIGVtcHR5XG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogY29uc3QgZmlsZU5hbWUgPSBnZXRGaWxlTmFtZSgpO1xuICogY29uc29sZS5sb2coYEZpbGU6ICR7ZmlsZU5hbWV9YCk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldEZpbGVOYW1lKCk6IHN0cmluZyB7XG4gIGNvbnN0IHZhbHVlID0gcHJvY2Vzcy5lbnZbQ0FSRFNfRU5WX1ZBUlMuRklMRV9OQU1FXTtcbiAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQgfHwgdmFsdWUgPT09ICcnKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIHJlcXVpcmVkIGVudmlyb25tZW50IHZhcmlhYmxlOiAke0NBUkRTX0VOVl9WQVJTLkZJTEVfTkFNRX1gKTtcbiAgfVxuICByZXR1cm4gdmFsdWU7XG59XG5cbi8qKlxuICogUmVhZHMgdGhlIGFic29sdXRlIHBhdGggdG8gdGhlIHR5cGVkIGZpbGUuXG4gKlxuICogVGhpcyBpcyB0aGUgZnVsbHkgcmVzb2x2ZWQgcGF0aCBvbiBkaXNrIHByb3ZpZGVkIGJ5IHRoZSBleGVjdXRpb24gd3JhcHBlci5cbiAqIEByZXR1cm5zIFRoZSBmdWxsIHBhdGggdG8gdGhlIGZpbGVcbiAqIEB0aHJvd3MgRXJyb3IgaWYgRklMRV9QQVRIIGlzIG1pc3Npbmcgb3IgZW1wdHlcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBjb25zdCBmaWxlUGF0aCA9IGdldEZpbGVQYXRoKCk7XG4gKiBjb25zb2xlLmxvZyhgUGF0aDogJHtmaWxlUGF0aH1gKTtcbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0RmlsZVBhdGgoKTogc3RyaW5nIHtcbiAgY29uc3QgdmFsdWUgPSBwcm9jZXNzLmVudltDQVJEU19FTlZfVkFSUy5GSUxFX1BBVEhdO1xuICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gJycpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYE1pc3NpbmcgcmVxdWlyZWQgZW52aXJvbm1lbnQgdmFyaWFibGU6ICR7Q0FSRFNfRU5WX1ZBUlMuRklMRV9QQVRIfWApO1xuICB9XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuLyoqXG4gKiBSZWFkcyB0aGUgdHlwZWQgZmlsZSBzaXplIGZyb20gdGhlIGVudmlyb25tZW50LlxuICpcbiAqIFRoZSB2YWx1ZSBpcyBwYXJzZWQgYXMgYSBiYXNlLTEwIGludGVnZXIuXG4gKiBAcmV0dXJucyBUaGUgZmlsZSBzaXplIGluIGJ5dGVzXG4gKiBAdGhyb3dzIEVycm9yIGlmIEZJTEVfU0laRSBpcyBtaXNzaW5nIG9yIG5vdCBhIG51bWJlclxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGNvbnN0IHNpemUgPSBnZXRGaWxlU2l6ZSgpO1xuICogY29uc29sZS5sb2coYFNpemU6ICR7c2l6ZX0gYnl0ZXNgKTtcbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0RmlsZVNpemUoKTogbnVtYmVyIHtcbiAgY29uc3QgdmFsdWUgPSBwcm9jZXNzLmVudltDQVJEU19FTlZfVkFSUy5GSUxFX1NJWkVdO1xuICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gJycpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYE1pc3NpbmcgcmVxdWlyZWQgZW52aXJvbm1lbnQgdmFyaWFibGU6ICR7Q0FSRFNfRU5WX1ZBUlMuRklMRV9TSVpFfWApO1xuICB9XG4gIGNvbnN0IHNpemUgPSBOdW1iZXIucGFyc2VJbnQodmFsdWUsIDEwKTtcbiAgaWYgKE51bWJlci5pc05hTihzaXplKSkge1xuICAgIHRocm93IG5ldyBFcnJvcihgSW52YWxpZCAke0NBUkRTX0VOVl9WQVJTLkZJTEVfU0laRX06IGV4cGVjdGVkIG51bWJlciwgZ290IFwiJHt2YWx1ZX1cImApO1xuICB9XG4gIHJldHVybiBzaXplO1xufVxuXG4vKipcbiAqIFJlYWRzIHRoZSBTSEEyNTYgaGFzaCBmb3IgdGhlIHR5cGVkIGZpbGUgY29udGVudC5cbiAqXG4gKiBVc2VmdWwgZm9yIGRldGVjdGluZyBjb250ZW50IGNoYW5nZXMgd2l0aG91dCByZWFkaW5nIHRoZSBmaWxlIGFnYWluLlxuICogQHJldHVybnMgVGhlIFNIQTI1NiBoYXNoIG9mIHRoZSBjb250ZW50XG4gKiBAdGhyb3dzIEVycm9yIGlmIFNIQTI1NiBpcyBtaXNzaW5nIG9yIGVtcHR5XG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogY29uc3QgaGFzaCA9IGdldFNoYTI1NigpO1xuICogY29uc29sZS5sb2coYEhhc2g6ICR7aGFzaH1gKTtcbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0U2hhMjU2KCk6IHN0cmluZyB7XG4gIGNvbnN0IHZhbHVlID0gcHJvY2Vzcy5lbnZbQ0FSRFNfRU5WX1ZBUlMuU0hBMjU2XTtcbiAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQgfHwgdmFsdWUgPT09ICcnKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIHJlcXVpcmVkIGVudmlyb25tZW50IHZhcmlhYmxlOiAke0NBUkRTX0VOVl9WQVJTLlNIQTI1Nn1gKTtcbiAgfVxuICByZXR1cm4gdmFsdWU7XG59XG5cbi8qKlxuICogUmVhZHMgdGhlIE1JTUUgdHlwZSBmb3IgdGhlIHR5cGVkIGZpbGUgY29udGVudC5cbiAqXG4gKiBQcm92aWRlZCBmb3IgdHlwZSBob29rIGV2ZW50cyBzbyB2YWxpZGF0b3JzIGNhbiBicmFuY2ggb24gY29udGVudCB0eXBlLlxuICogQHJldHVybnMgVGhlIE1JTUUgdHlwZSBvZiB0aGUgY29udGVudFxuICogQHRocm93cyBFcnJvciBpZiBDT05URU5UX1RZUEUgaXMgbWlzc2luZyBvciBlbXB0eVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGNvbnN0IGNvbnRlbnRUeXBlID0gZ2V0Q29udGVudFR5cGUoKTtcbiAqIGNvbnNvbGUubG9nKGBDb250ZW50IHR5cGU6ICR7Y29udGVudFR5cGV9YCk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldENvbnRlbnRUeXBlKCk6IHN0cmluZyB7XG4gIGNvbnN0IHZhbHVlID0gcHJvY2Vzcy5lbnZbQ0FSRFNfRU5WX1ZBUlMuQ09OVEVOVF9UWVBFXTtcbiAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQgfHwgdmFsdWUgPT09ICcnKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIHJlcXVpcmVkIGVudmlyb25tZW50IHZhcmlhYmxlOiAke0NBUkRTX0VOVl9WQVJTLkNPTlRFTlRfVFlQRX1gKTtcbiAgfVxuICByZXR1cm4gdmFsdWU7XG59XG5cbi8qKlxuICogUmVhZHMgdGhlIFZTIENvZGUgYnVuZGxlZCBOb2RlLmpzIGludGVycHJldGVyIHBhdGggZnJvbSB0aGUgZW52aXJvbm1lbnQuXG4gKlxuICogVGhpcyBpcyBzZXQgYnkgdGhlIGV4dGVuc2lvbiBkdXJpbmcgYWN0aXZhdGlvbiBhbmQgaW5qZWN0ZWQgaW50byBhbGxcbiAqIHNwYXduZWQgYWN0aW9uL2hvb2sgcHJvY2Vzc2VzLiBDb25maWd1cmF0aW9uIGF1dGhvcnMgY2FuIHVzZSBpdCB0byBpbnZva2VcbiAqIE5vZGUuanMgd2l0aG91dCByZWx5aW5nIG9uIHRoZSBzeXN0ZW0gUEFUSC5cbiAqXG4gKiBAcmV0dXJucyBUaGUgcGF0aCB0byB0aGUgTm9kZS5qcyBpbnRlcnByZXRlclxuICogQHRocm93cyBFcnJvciBpZiBWU0NPREVfTk9ERSBpcyBtaXNzaW5nIG9yIGVtcHR5XG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogY29uc3Qgbm9kZVBhdGggPSBnZXRWc2NvZGVOb2RlUGF0aCgpO1xuICogZXhlY0ZpbGVTeW5jKG5vZGVQYXRoLCBbJ3NjcmlwdC5qcyddKTtcbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0VnNjb2RlTm9kZVBhdGgoKTogc3RyaW5nIHtcbiAgY29uc3QgdmFsdWUgPSBwcm9jZXNzLmVudltDQVJEU19FTlZfVkFSUy5WU0NPREVfTk9ERV07XG4gIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IHZhbHVlID09PSAnJykge1xuICAgIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyByZXF1aXJlZCBlbnZpcm9ubWVudCB2YXJpYWJsZTogJHtDQVJEU19FTlZfVkFSUy5WU0NPREVfTk9ERX1gKTtcbiAgfVxuICByZXR1cm4gdmFsdWU7XG59XG5cbi8qKlxuICogUmVhZHMgdGhlIFVuaXggZG9tYWluIHNvY2tldCBwYXRoIGZvciBydW50aW1lLXRvLWRpc3BhdGNoZXIgY29tbXVuaWNhdGlvbi5cbiAqXG4gKiBAcmV0dXJucyBVbml4IHNvY2tldCBwYXRoIHVzZWQgdG8gc2VuZCBydW50aW1lIGNvbnRyb2wgbWVzc2FnZXMuXG4gKiBAdGhyb3dzIEVycm9yIGlmIFNPQ0tFVF9QQVRIIGlzIG1pc3Npbmcgb3IgZW1wdHlcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldFNvY2tldFBhdGgoKTogc3RyaW5nIHtcbiAgY29uc3QgdmFsdWUgPSBwcm9jZXNzLmVudltDQVJEU19FTlZfVkFSUy5TT0NLRVRfUEFUSF07XG4gIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IHZhbHVlID09PSAnJykge1xuICAgIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyByZXF1aXJlZCBlbnZpcm9ubWVudCB2YXJpYWJsZTogJHtDQVJEU19FTlZfVkFSUy5TT0NLRVRfUEFUSH1gKTtcbiAgfVxuICByZXR1cm4gdmFsdWU7XG59XG5cbi8qKlxuICogUmVhZHMgdGhlIHBhdGggdG8gdGhlIHN3aXRjaFRvSW50ZXJhY3RpdmUgZGF0YSBmaWxlLlxuICpcbiAqIFRoaXMgaXMgb3B0aW9uYWwgXHUyMDE0IHJldHVybnMgdW5kZWZpbmVkIHdoZW4gbm90IHNldCAoaS5lLiwgdGhlIGFjdGlvblxuICogd2FzIG5vdCByZWxhdW5jaGVkIHZpYSBzd2l0Y2hUb0ludGVyYWN0aXZlKS5cbiAqXG4gKiBAcmV0dXJucyBUaGUgZmlsZSBwYXRoLCBvciB1bmRlZmluZWQgaWYgbm90IHNldFxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0U3dpdGNoVG9JbnRlcmFjdGl2ZURhdGFQYXRoKCk6IHN0cmluZyB8IHVuZGVmaW5lZCB7XG4gIGNvbnN0IHZhbHVlID0gcHJvY2Vzcy5lbnZbQ0FSRFNfRU5WX1ZBUlMuU1dJVENIX1RPX0lOVEVSQUNUSVZFX0RBVEFfUEFUSF07XG4gIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IHZhbHVlID09PSAnJykge1xuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG4vKipcbiAqIFJlYWRzIHRoZSBzZXR0aW5ncyBjb25maWd1cmF0aW9uIGRpcmVjdG9yeSBwYXRoLlxuICpcbiAqIEByZXR1cm5zIEFic29sdXRlIHBhdGggdG8gdGhlIGRpcmVjdG9yeSBjb250YWluaW5nIGdlbmVyYXRlZCBzZXR0aW5ncyBhcnRpZmFjdHMuXG4gKiBAdGhyb3dzIEVycm9yIGlmIENPTkZJR19QQVRIIGlzIG1pc3Npbmcgb3IgZW1wdHlcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldENvbmZpZ1BhdGgoKTogc3RyaW5nIHtcbiAgY29uc3QgdmFsdWUgPSBwcm9jZXNzLmVudltDQVJEU19FTlZfVkFSUy5DT05GSUdfUEFUSF07XG4gIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IHZhbHVlID09PSAnJykge1xuICAgIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyByZXF1aXJlZCBlbnZpcm9ubWVudCB2YXJpYWJsZTogJHtDQVJEU19FTlZfVkFSUy5DT05GSUdfUEFUSH1gKTtcbiAgfVxuICByZXR1cm4gdmFsdWU7XG59XG5cbi8qKlxuICogUmVhZHMgdGhlIHdvcmtzcGFjZSBwYXRoIHNldCBieSB0aGUgYWN0aW9uIGhhbmRsZXIgKGUuZy4sIHRoZSB3b3JrdHJlZSBwYXRoKS5cbiAqXG4gKiBUaGlzIGlzIGZvciBob29rcyBydW5uaW5nIGluc2lkZSB0aGUgQ2xhdWRlIENMSSwgKipub3QqKiBmb3IgYWN0aW9uIGhhbmRsZXJzLlxuICogQWN0aW9uIGhhbmRsZXJzIHNob3VsZCB1c2Uge0BsaW5rIGdldFJlcG9Sb290fSBpbnN0ZWFkLlxuICpcbiAqIEByZXR1cm5zIEFic29sdXRlIHBhdGggdG8gdGhlIGFjdGl2ZSB3b3Jrc3BhY2UgLyB3b3JrdHJlZS5cbiAqIEB0aHJvd3MgRXJyb3IgaWYgV09SS1NQQUNFX1BBVEggaXMgbWlzc2luZyBvciBlbXB0eVxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0V29ya3NwYWNlUGF0aCgpOiBzdHJpbmcge1xuICBjb25zdCB2YWx1ZSA9IHByb2Nlc3MuZW52W0NBUkRTX0VOVl9WQVJTLldPUktTUEFDRV9QQVRIXTtcbiAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQgfHwgdmFsdWUgPT09ICcnKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIHJlcXVpcmVkIGVudmlyb25tZW50IHZhcmlhYmxlOiAke0NBUkRTX0VOVl9WQVJTLldPUktTUEFDRV9QQVRIfWApO1xuICB9XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuLyoqXG4gKiBSZWFkcyB0aGUgbWFpbiBnaXQgcmVwb3NpdG9yeSByb290IHBhdGguXG4gKlxuICogU2V0IGJ5IEFjdGlvbkRpc3BhdGNoZXI7IHVzZWQgYnkgYWN0aW9uIGhhbmRsZXJzIHRvIHJlc29sdmUgd29ya3RyZWVzXG4gKiBhbmQgcGVyZm9ybSBnaXQgb3BlcmF0aW9ucyBhZ2FpbnN0IHRoZSBtYWluIHJlcG9zaXRvcnkuXG4gKlxuICogQHJldHVybnMgQWJzb2x1dGUgcGF0aCB0byB0aGUgbWFpbiBnaXQgcmVwb3NpdG9yeSByb290IChOT1QgYSB3b3JrdHJlZSkuXG4gKiBAdGhyb3dzIEVycm9yIGlmIFJFUE9fUk9PVCBpcyBtaXNzaW5nIG9yIGVtcHR5XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRSZXBvUm9vdCgpOiBzdHJpbmcge1xuICBjb25zdCB2YWx1ZSA9IHByb2Nlc3MuZW52W0NBUkRTX0VOVl9WQVJTLlJFUE9fUk9PVF07XG4gIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IHZhbHVlID09PSAnJykge1xuICAgIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyByZXF1aXJlZCBlbnZpcm9ubWVudCB2YXJpYWJsZTogJHtDQVJEU19FTlZfVkFSUy5SRVBPX1JPT1R9YCk7XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG4vKipcbiAqIFJlYWRzIHRoZSBjYXJkJ3MgcmVwb3NpdG9yeSBkaXJlY3RvcnkgcGF0aC5cbiAqXG4gKiBAcmV0dXJucyBBYnNvbHV0ZSBwYXRoIHRvIHRoZSByZXBvc2l0b3J5IGFzc29jaWF0ZWQgd2l0aCB0aGUgYWN0aXZlIGNhcmQuXG4gKiBAdGhyb3dzIEVycm9yIGlmIENBUkRfUkVQT19QQVRIIGlzIG1pc3Npbmcgb3IgZW1wdHlcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldENhcmRSZXBvUGF0aCgpOiBzdHJpbmcge1xuICBjb25zdCB2YWx1ZSA9IHByb2Nlc3MuZW52W0NBUkRTX0VOVl9WQVJTLkNBUkRfUkVQT19QQVRIXTtcbiAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQgfHwgdmFsdWUgPT09ICcnKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIHJlcXVpcmVkIGVudmlyb25tZW50IHZhcmlhYmxlOiAke0NBUkRTX0VOVl9WQVJTLkNBUkRfUkVQT19QQVRIfWApO1xuICB9XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuLyoqXG4gKiBSZWFkcyB0aGUgVlMgQ29kZSBleHRlbnNpb24gaW5zdGFsbGF0aW9uIGRpcmVjdG9yeSBwYXRoLlxuICpcbiAqIFNldCBieSB0aGUgZXh0ZW5zaW9uIGhvc3QgZnJvbSBgY29udGV4dC5leHRlbnNpb25VcmkuZnNQYXRoYCBhbmQgaW5qZWN0ZWRcbiAqIGludG8gYWxsIHNwYXduZWQgYWN0aW9uIHByb2Nlc3Nlcy4gVXNlIHRoaXMgdG8gbG9jYXRlIGJ1bmRsZWQgYXNzZXRzIHN1Y2hcbiAqIGFzIHRoZSBydW50aW1lIHBsdWdpbiBkaXJlY3RvcnkgKGA8ZXh0ZW5zaW9uUGF0aD4vZGlzdC9wbHVnaW5zL3J1bnRpbWVgKS5cbiAqXG4gKiBAcmV0dXJucyBBYnNvbHV0ZSBwYXRoIHRvIHRoZSBleHRlbnNpb24gaW5zdGFsbGF0aW9uIGRpcmVjdG9yeS5cbiAqIEB0aHJvd3MgRXJyb3IgaWYgRVhURU5TSU9OX1BBVEggaXMgbWlzc2luZyBvciBlbXB0eVxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0RXh0ZW5zaW9uUGF0aCgpOiBzdHJpbmcge1xuICBjb25zdCB2YWx1ZSA9IHByb2Nlc3MuZW52W0NBUkRTX0VOVl9WQVJTLkVYVEVOU0lPTl9QQVRIXTtcbiAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQgfHwgdmFsdWUgPT09ICcnKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIHJlcXVpcmVkIGVudmlyb25tZW50IHZhcmlhYmxlOiAke0NBUkRTX0VOVl9WQVJTLkVYVEVOU0lPTl9QQVRIfWApO1xuICB9XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuLyoqXG4gKiBSZWFkcyBhbmQgcGFyc2VzIHRoZSBzd2l0Y2hUb0ludGVyYWN0aXZlIGRhdGEgZmlsZS5cbiAqXG4gKiBXaGVuIGBTV0lUQ0hfVE9fSU5URVJBQ1RJVkVfREFUQV9QQVRIYCBpcyBzZXQsIHJlYWRzIHRoZSBmaWxlIGF0IHRoYXQgcGF0aFxuICogYW5kIHBhcnNlcyBpdCBhcyBKU09OLiBSZXR1cm5zIHVuZGVmaW5lZCBpZiB0aGUgZW52IHZhciBpcyBub3Qgc2V0LlxuICpcbiAqIEByZXR1cm5zIFRoZSBwYXJzZWQgZGF0YSwgb3IgdW5kZWZpbmVkIGlmIHRoZSBwYXRoIGlzIG5vdCBzZXRcbiAqIEB0aHJvd3MgRXJyb3IgaWYgdGhlIGZpbGUgY2Fubm90IGJlIHJlYWQgb3IgY29udGFpbnMgaW52YWxpZCBKU09OXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiByZWFkU3dpdGNoVG9JbnRlcmFjdGl2ZURhdGEoKTogdW5rbm93biB8IHVuZGVmaW5lZCB7XG4gIGNvbnN0IGRhdGFQYXRoID0gZ2V0U3dpdGNoVG9JbnRlcmFjdGl2ZURhdGFQYXRoKCk7XG4gIGlmIChkYXRhUGF0aCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfVxuICBjb25zdCBjb250ZW50ID0gcmVhZEZpbGVTeW5jKGRhdGFQYXRoLCAndXRmLTgnKTtcbiAgcmV0dXJuIEpTT04ucGFyc2UoY29udGVudCk7XG59XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIFR5cGVkIElucHV0IEV4dHJhY3Rpb25cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuLyoqXG4gKiBCdWlsZHMgYSB0eXBlZCBhY3Rpb24gaW5wdXQgb2JqZWN0IGZyb20gZW52aXJvbm1lbnQgdmFyaWFibGVzLlxuICpcbiAqIEV4dHJhY3RzIGFsbCBmaWVsZHMgcmVxdWlyZWQgZm9yIGFjdGlvbiBoYW5kbGVycy5cbiAqXG4gKiBAcmV0dXJucyBUeXBlZCBBY3Rpb25JbnB1dCBvYmplY3RcbiAqIEB0aHJvd3MgRXJyb3IgaWYgcmVxdWlyZWQgZW52IHZhcnMgYXJlIG1pc3Npbmcgb3IgaW52YWxpZFxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIC8vIEZvciBhbiBhY3Rpb24gaGFuZGxlclxuICogY29uc3QgaW5wdXQgPSBleHRyYWN0QWN0aW9uSW5wdXQoKTtcbiAqIGNvbnNvbGUubG9nKGlucHV0LmNhcmRJZCk7XG4gKiBjb25zb2xlLmxvZyhpbnB1dC5leGVjdXRpb25Nb2RlKTtcbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gZXh0cmFjdEFjdGlvbklucHV0KCk6IEFjdGlvbklucHV0IHtcbiAgcmV0dXJuIHtcbiAgICBjYXJkSWQ6IGdldENhcmRJZCgpLFxuICAgIGFjdGlvbk5hbWU6IGdldEFjdGlvbk5hbWUoKSxcbiAgICBlbnZpcm9ubWVudDogZ2V0RW52aXJvbm1lbnQoKSxcbiAgICBleGVjdXRpb25Nb2RlOiBnZXRFeGVjdXRpb25Nb2RlKCksXG4gICAgYXBpQmFzZVVybDogZ2V0QXBpQmFzZVVybCgpLFxuICAgIGFwaUFjY2Vzc1Rva2VuOiBnZXRBcGlBY2Nlc3NUb2tlbigpLFxuICAgIGNvZGluZ0FnZW50OiBnZXRDb2RpbmdBZ2VudCgpLFxuICAgIHN3aXRjaFRvSW50ZXJhY3RpdmVEYXRhOiByZWFkU3dpdGNoVG9JbnRlcmFjdGl2ZURhdGEoKSxcbiAgICByZXBvUm9vdDogZ2V0UmVwb1Jvb3QoKSxcbiAgICBjYXJkUmVwb1BhdGg6IGdldENhcmRSZXBvUGF0aCgpLFxuICAgIGNvbmZpZ1BhdGg6IGdldENvbmZpZ1BhdGgoKSxcbiAgICBleHRlbnNpb25QYXRoOiBnZXRFeHRlbnNpb25QYXRoKClcbiAgfTtcbn1cblxuLyoqXG4gKiBCdWlsZHMgYSB0eXBlZCB0eXBlIGhvb2sgaW5wdXQgb2JqZWN0IGZyb20gZW52aXJvbm1lbnQgdmFyaWFibGVzLlxuICpcbiAqIEV4dHJhY3RzIGFsbCBmaWVsZHMgcmVxdWlyZWQgZm9yIHR5cGUgbGlmZWN5Y2xlIGhvb2tzICh2YWxpZGF0b3IsIGNyZWF0ZSxcbiAqIHVwZGF0ZSwgZGVsZXRlKS5cbiAqXG4gKiBAcmV0dXJucyBUeXBlZCBUeXBlSG9va0lucHV0IG9iamVjdFxuICogQHRocm93cyBFcnJvciBpZiByZXF1aXJlZCBlbnYgdmFycyBhcmUgbWlzc2luZyBvciBpbnZhbGlkXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogLy8gRm9yIGEgdHlwZSBob29rIGhhbmRsZXJcbiAqIGNvbnN0IGlucHV0ID0gZXh0cmFjdFR5cGVJbnB1dCgpO1xuICogY29uc29sZS5sb2coaW5wdXQudHlwZU5hbWUpO1xuICogY29uc29sZS5sb2coaW5wdXQuZmlsZU5hbWUpO1xuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBleHRyYWN0VHlwZUlucHV0KCk6IFR5cGVIb29rSW5wdXQge1xuICByZXR1cm4ge1xuICAgIGNhcmRJZDogZ2V0Q2FyZElkKCksXG4gICAgZW52aXJvbm1lbnQ6IGdldEVudmlyb25tZW50KCksXG4gICAgdHlwZU5hbWU6IGdldFR5cGVOYW1lKCksXG4gICAgdHlwZVZlcnNpb246IGdldFR5cGVWZXJzaW9uKCksXG4gICAgZmlsZU5hbWU6IGdldEZpbGVOYW1lKCksXG4gICAgZmlsZVBhdGg6IGdldEZpbGVQYXRoKCksXG4gICAgZmlsZVNpemU6IGdldEZpbGVTaXplKCksXG4gICAgZmlsZVNoYTI1NjogZ2V0U2hhMjU2KCksXG4gICAgY29udGVudFR5cGU6IGdldENvbnRlbnRUeXBlKCksXG4gICAgYXBpQmFzZVVybDogZ2V0QXBpQmFzZVVybCgpLFxuICAgIGFwaUFjY2Vzc1Rva2VuOiBnZXRBcGlBY2Nlc3NUb2tlbigpXG4gIH07XG59XG4iLCAiLyoqXG4gKiBFeGl0IGNvZGUgY29uc3RhbnRzIGFuZCBoZWxwZXJzIGZvciBDYXJkcyBFeHRlbnNpb24gaG9va3MuXG4gKlxuICogQ2FyZHMgaG9va3MgY29tbXVuaWNhdGUgc3VjY2VzcyBhbmQgZmFpbHVyZSB2aWEgcHJvY2VzcyBleGl0IGNvZGVzIGFuZFxuICogc3RkZXJyIG91dHB1dC4gVGhpcyBtb2R1bGUgY2VudHJhbGl6ZXMgdGhvc2UgY29udmVudGlvbnMgc28gdGhlIHJ1bnRpbWVcbiAqIGFuZCBob29rcyBzcGVhayB0aGUgc2FtZSBwcm90b2NvbC5cbiAqXG4gKiBAc3VtbWFyeSBFeGl0IGNvZGUgY29uc3RhbnRzIGFuZCBoZWxwZXJzIGZvciBDYXJkcyBFeHRlbnNpb24gaG9va3NcbiAqIEBtb2R1bGVcbiAqL1xuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBFeGl0IENvZGUgQ29uc3RhbnRzXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbi8qKlxuICogRXhpdCBjb2RlcyB1c2VkIGJ5IENhcmRzIGhvb2tzLlxuICpcbiAqIFRoZSBDYXJkcyBydW50aW1lIGludGVycHJldHMgYW55IG5vbi16ZXJvIGV4aXQgY29kZSBhcyBmYWlsdXJlLlxuICovXG5leHBvcnQgY29uc3QgRVhJVF9DT0RFUyA9IHtcbiAgLyoqIEhhbmRsZXIgY29tcGxldGVkIHN1Y2Nlc3NmdWxseS4gKi9cbiAgU1VDQ0VTUzogMCxcbiAgLyoqIEhhbmRsZXIgdGhyZXcgYW4gZXJyb3IuICovXG4gIEVSUk9SOiAxLFxuICAvKiogSGFuZGxlciBwcm9jZXNzZWQgc3dpdGNoVG9JbnRlcmFjdGl2ZSBhbmQgaXMgZXhpdGluZyBmb3IgcmVsYXVuY2guICovXG4gIFNXSVRDSF9UT19JTlRFUkFDVElWRTogNDJcbn0gYXMgY29uc3Q7XG5cbi8qKlxuICogVW5pb24gb2YgdmFsaWQgQ2FyZHMgaG9vayBleGl0IGNvZGVzLlxuICovXG5leHBvcnQgdHlwZSBFeGl0Q29kZSA9ICh0eXBlb2YgRVhJVF9DT0RFUylba2V5b2YgdHlwZW9mIEVYSVRfQ09ERVNdO1xuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBFcnJvciBPdXRwdXQgSGVscGVyc1xuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4vKipcbiAqIFdyaXRlcyBhbiBlcnJvciBtZXNzYWdlIHRvIHN0ZGVyciB3aXRoIGEgdHJhaWxpbmcgbmV3bGluZS5cbiAqXG4gKiBVc2UgdGhpcyB3aGVuIGEgaG9vayBuZWVkcyB0byByZXBvcnQgYSBmYWlsdXJlIHdpdGhvdXQgcG9sbHV0aW5nIHN0ZG91dC5cbiAqIEBwYXJhbSBtZXNzYWdlIC0gRXJyb3IgbWVzc2FnZSB0byB3cml0ZVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIHdyaXRlRXJyb3IoJ0ZhaWxlZCB0byBjb25uZWN0IHRvIGRhdGFiYXNlJyk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHdyaXRlRXJyb3IobWVzc2FnZTogc3RyaW5nKTogdm9pZCB7XG4gIHByb2Nlc3Muc3RkZXJyLndyaXRlKGAke21lc3NhZ2V9XFxuYCk7XG59XG5cbi8qKlxuICogV3JpdGVzIGFuIGVycm9yIG1lc3NhZ2UgdG8gc3RkZXJyIGFuZCBleGl0cyB3aXRoIEVSUk9SIGNvZGUuXG4gKlxuICogVGhpcyB0ZXJtaW5hdGVzIHRoZSBwcm9jZXNzIGltbWVkaWF0ZWx5LCBzbyBhbnkgcGVuZGluZyBhc3luYyB3b3JrIHdpbGxcbiAqIG5vdCBmaW5pc2ggdW5sZXNzIGl0IHdhcyBhbHJlYWR5IGF3YWl0ZWQuXG4gKiBAcGFyYW0gbWVzc2FnZSAtIEVycm9yIG1lc3NhZ2UgdG8gd3JpdGUgYmVmb3JlIGV4aXRpbmdcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBpZiAoIWlzVmFsaWQpIHtcbiAqICAgZXhpdFdpdGhFcnJvcignSW52YWxpZCBjb25maWd1cmF0aW9uJyk7XG4gKiB9XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGV4aXRXaXRoRXJyb3IobWVzc2FnZTogc3RyaW5nKTogbmV2ZXIge1xuICB3cml0ZUVycm9yKG1lc3NhZ2UpO1xuICBwcm9jZXNzLmV4aXQoRVhJVF9DT0RFUy5FUlJPUik7XG59XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIEludGVybmFsIFJlc3VsdCBUcmFja2luZ1xuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4vKipcbiAqIEludGVybmFsIHJ1bnRpbWUgYm9va2tlZXBpbmcgZm9yIGhvb2sgZXhlY3V0aW9uIHJlc3VsdHMuXG4gKlxuICogVGhpcyBzdHJ1Y3R1cmUgYWxsb3dzIHRoZSBydW50aW1lIHRvIGNhcnJ5IGVycm9yIGRldGFpbHMgd2l0aG91dCBjaGFuZ2luZ1xuICogdGhlIGV4aXQtY29kZSBwcm90b2NvbC5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBIb29rRXhlY3V0aW9uUmVzdWx0IHtcbiAgLyoqIFdoZXRoZXIgdGhlIGhvb2sgZXhlY3V0ZWQgc3VjY2Vzc2Z1bGx5LiAqL1xuICBzdWNjZXNzOiBib29sZWFuO1xuICAvKiogVGhlIGV4aXQgY29kZSB0byB1c2Ugd2hlbiBleGl0aW5nLiAqL1xuICBleGl0Q29kZTogRXhpdENvZGU7XG4gIC8qKiBUaGUgZXJyb3IgdGhhdCBvY2N1cnJlZCwgaWYgYW55LiAqL1xuICBlcnJvcj86IEVycm9yO1xufVxuIiwgIi8qKlxuICogU3RydWN0dXJlZCBsb2dnaW5nIGZvciBDYXJkcyBFeHRlbnNpb24gaG9va3MuXG4gKlxuICogT3V0cHV0IGlzIG9wdC1pbjogdGhlIGxvZ2dlciBvbmx5IGVtaXRzIHRvIHJlZ2lzdGVyZWQgaGFuZGxlcnMgb3IgYVxuICogY29uZmlndXJlZCBsb2cgZmlsZS4gSWYgeW91IGNvbmZpZ3VyZSBub3RoaW5nLCB0aGUgbG9nZ2VyIHBvbGl0ZWx5IHNheXNcbiAqIG5vdGhpbmcgYXQgYWxsLiBJdCBuZXZlciB3cml0ZXMgdG8gc3Rkb3V0IGFuZCBhdm9pZHMgc3RkZXJyIHRvIGtlZXAgaG9va1xuICogcHJvdG9jb2xzIGNsZWFuLlxuICpcbiAqIEBzdW1tYXJ5IFN0cnVjdHVyZWQgbG9nZ2luZyBmb3IgQ2FyZHMgRXh0ZW5zaW9uIGhvb2tzXG4gKiBAbW9kdWxlXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogaW1wb3J0IHsgbG9nZ2VyIH0gZnJvbSAnQGNhcmRzL3Nkay9jb25maWcnO1xuICpcbiAqIC8vIFN1YnNjcmliZSB0byBsb2cgZXZlbnRzXG4gKiBjb25zdCB1bnN1YnNjcmliZSA9IGxvZ2dlci5vbignZXJyb3InLCAoZXZlbnQpID0+IHtcbiAqICAgY29uc29sZS5lcnJvcihgRXJyb3IgaW4gJHtldmVudC5ob29rVHlwZX06ICR7ZXZlbnQubWVzc2FnZX1gKTtcbiAqIH0pO1xuICpcbiAqIC8vIExhdGVyLCBjbGVhbiB1cFxuICogdW5zdWJzY3JpYmUoKTtcbiAqIGBgYFxuICovXG5cbmltcG9ydCB7IGNsb3NlU3luYywgZXhpc3RzU3luYywgbWtkaXJTeW5jLCBvcGVuU3luYywgd3JpdGVTeW5jIH0gZnJvbSAnbm9kZTpmcyc7XG5pbXBvcnQgeyBkaXJuYW1lIH0gZnJvbSAnbm9kZTpwYXRoJztcblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gTG9nIExldmVsIFR5cGVzXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbi8qKlxuICogQXZhaWxhYmxlIGxvZyBsZXZlbHMuXG4gKlxuICogfCBMZXZlbCB8IFNldmVyaXR5IHwgVXNlIENhc2UgfFxuICogfC0tLS0tLS18LS0tLS0tLS0tLXwtLS0tLS0tLS0tfFxuICogfCBgZGVidWdgIHwgTG93ZXN0IHwgRGV0YWlsZWQgZGVidWdnaW5nIGluZm9ybWF0aW9uIHxcbiAqIHwgYGluZm9gIHwgTG93IHwgR2VuZXJhbCBvcGVyYXRpb25hbCBldmVudHMgfFxuICogfCBgd2FybmAgfCBNZWRpdW0gfCBXYXJuaW5nIGNvbmRpdGlvbnMgdGhhdCBtYXkgaW5kaWNhdGUgaXNzdWVzIHxcbiAqIHwgYGVycm9yYCB8IEhpZ2ggfCBFcnJvciBjb25kaXRpb25zIHJlcXVpcmluZyBhdHRlbnRpb24gfFxuICovXG5leHBvcnQgdHlwZSBMb2dMZXZlbCA9ICdkZWJ1ZycgfCAnaW5mbycgfCAnd2FybicgfCAnZXJyb3InO1xuXG4vKipcbiAqIEFsbCBsb2cgbGV2ZWxzIGluIG9yZGVyIG9mIHNldmVyaXR5IChsb3dlc3QgdG8gaGlnaGVzdCkuXG4gKi9cbmV4cG9ydCBjb25zdCBMT0dfTEVWRUxTID0gWydkZWJ1ZycsICdpbmZvJywgJ3dhcm4nLCAnZXJyb3InXSBhcyBjb25zdCBzYXRpc2ZpZXMgcmVhZG9ubHkgTG9nTGV2ZWxbXTtcblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gTG9nIEV2ZW50IFR5cGVcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuLyoqXG4gKiBTdHJ1Y3R1cmVkIGxvZyBldmVudCBlbWl0dGVkIGJ5IHRoZSBsb2dnZXIuXG4gKlxuICogRXZlbnRzIGluY2x1ZGUgY29udGV4dHVhbCBkZXRhaWxzIGFib3V0IGhvb2sgZXhlY3V0aW9uIGFuZCBhcmUgc3VpdGFibGUgZm9yXG4gKiBkZWJ1Z2dpbmcsIG1vbml0b3JpbmcsIGFuZCBhbmFseXRpY3MgcGlwZWxpbmVzLlxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIC8vIEV4YW1wbGUgbG9nIGV2ZW50XG4gKiBjb25zdCBldmVudDogTG9nRXZlbnQgPSB7XG4gKiAgIHRpbWVzdGFtcDogJzIwMjQtMDEtMTVUMTA6MzA6MDAuMDAwWicsXG4gKiAgIGxldmVsOiAnd2FybicsXG4gKiAgIGhvb2tUeXBlOiAnYWN0aW9uLXN0YXJ0JyxcbiAqICAgbWVzc2FnZTogJ0NhcmQgc3RhcnRlZCcsXG4gKiAgIGlucHV0OiB7IGNhcmRJZDogJ2NhcmQtMTIzJyB9XG4gKiB9O1xuICogYGBgXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgTG9nRXZlbnQge1xuICAvKipcbiAgICogSVNPIDg2MDEgdGltZXN0YW1wIG9mIHdoZW4gdGhlIGV2ZW50IG9jY3VycmVkLlxuICAgKiBAZXhhbXBsZSAnMjAyNC0wMS0xNVQxMDozMDowMC4wMDBaJ1xuICAgKi9cbiAgdGltZXN0YW1wOiBzdHJpbmc7XG5cbiAgLyoqXG4gICAqIFNldmVyaXR5IGxldmVsIG9mIHRoZSBsb2cgZXZlbnQuXG4gICAqL1xuICBsZXZlbDogTG9nTGV2ZWw7XG5cbiAgLyoqXG4gICAqIFR5cGUgb2YgaG9vayB0aGF0IGdlbmVyYXRlZCB0aGlzIGV2ZW50LlxuICAgKiBNYXkgYmUgdW5kZWZpbmVkIGZvciBldmVudHMgb3V0c2lkZSBob29rIGNvbnRleHQuXG4gICAqL1xuICBob29rVHlwZT86IHN0cmluZztcblxuICAvKipcbiAgICogSHVtYW4tcmVhZGFibGUgZGVzY3JpcHRpb24gb2Ygd2hhdCBoYXBwZW5lZC5cbiAgICovXG4gIG1lc3NhZ2U6IHN0cmluZztcblxuICAvKipcbiAgICogSG9vayBpbnB1dCBkYXRhIGF0IHRoZSB0aW1lIG9mIGxvZ2dpbmcuXG4gICAqXG4gICAqIFRoaXMgaXMgcGFydGlhbCBieSBkZXNpZ24sIHNvIHlvdSBjYW4gYXZvaWQgbG9nZ2luZyBsYXJnZSBvciBzZW5zaXRpdmVcbiAgICogcGF5bG9hZHMgd2hpbGUgc3RpbGwgY2FwdHVyaW5nIGtleSBpZGVudGlmaWVycy5cbiAgICovXG4gIGlucHV0PzogUmVjb3JkPHN0cmluZywgdW5rbm93bj47XG5cbiAgLyoqXG4gICAqIEVycm9yIGluZm9ybWF0aW9uIGlmIHRoaXMgZXZlbnQgcmVwcmVzZW50cyBhbiBlcnJvci5cbiAgICogQ29udGFpbnMgc3RydWN0dXJlZCBlcnJvciBkZXRhaWxzIGZvciBhbmFseXNpcy5cbiAgICovXG4gIGVycm9yPzogTG9nRXZlbnRFcnJvcjtcblxuICAvKipcbiAgICogQWRkaXRpb25hbCBjb250ZXh0IGRhdGEgcHJvdmlkZWQgYnkgdGhlIGNhbGxlci5cbiAgICpcbiAgICogVXNlIHRoaXMgZm9yIHN0cnVjdHVyZWQgbWV0YWRhdGEgdGhhdCB5b3Ugd2FudCBkb3duc3RyZWFtIGhhbmRsZXJzXG4gICAqIHRvIHJlY2VpdmUgKGUuZy4sIHJlcXVlc3QgSURzLCB0aW1pbmcgZGF0YSkuXG4gICAqL1xuICBjb250ZXh0PzogUmVjb3JkPHN0cmluZywgdW5rbm93bj47XG59XG5cbi8qKlxuICogU3RydWN0dXJlZCBlcnJvciBpbmZvcm1hdGlvbiB3aXRoaW4gYSBsb2cgZXZlbnQuXG4gKlxuICogRXJyb3JzIGFyZSBub3JtYWxpemVkIHNvIGhhbmRsZXJzIGNhbiBkZXBlbmQgb24gY29uc2lzdGVudCBzaGFwZSwgZXZlbiB3aGVuXG4gKiBjYWxsZXJzIHRocm93IG5vbi1FcnJvciB2YWx1ZXMuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgTG9nRXZlbnRFcnJvciB7XG4gIC8qKlxuICAgKiBFcnJvciBuYW1lIChlLmcuLCAnVHlwZUVycm9yJywgJ1ZhbGlkYXRpb25FcnJvcicpLlxuICAgKi9cbiAgbmFtZTogc3RyaW5nO1xuXG4gIC8qKlxuICAgKiBFcnJvciBtZXNzYWdlIGRlc2NyaWJpbmcgd2hhdCB3ZW50IHdyb25nLlxuICAgKi9cbiAgbWVzc2FnZTogc3RyaW5nO1xuXG4gIC8qKlxuICAgKiBTdGFjayB0cmFjZSBpZiBhdmFpbGFibGUuXG4gICAqL1xuICBzdGFjaz86IHN0cmluZztcblxuICAvKipcbiAgICogRXJyb3IgY2F1c2UgY2hhaW4gaWYgdGhlIGVycm9yIHdhcyB3cmFwcGVkLlxuICAgKi9cbiAgY2F1c2U/OiBMb2dFdmVudEVycm9yO1xufVxuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBFdmVudCBIYW5kbGVyIFR5cGVcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuLyoqXG4gKiBIYW5kbGVyIGludm9rZWQgd2hlbiBhIGxvZyBldmVudCBpcyBlbWl0dGVkLlxuICpcbiAqIEhhbmRsZXJzIHJ1biBzeW5jaHJvbm91c2x5LiBFcnJvcnMgdGhyb3duIGJ5IGEgaGFuZGxlciBhcmUgc3dhbGxvd2VkIHNvXG4gKiBsb2dnaW5nIGNhbm5vdCBicmVhayBob29rIGV4ZWN1dGlvbi5cbiAqIEBwYXJhbSBldmVudCAtIFRoZSBsb2cgZXZlbnQgdG8gaGFuZGxlXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogLy8gRm9yd2FyZCB0byBleHRlcm5hbCBsb2dnaW5nIHNlcnZpY2VcbiAqIGNvbnN0IGhhbmRsZXI6IExvZ0V2ZW50SGFuZGxlciA9IChldmVudCkgPT4ge1xuICogICBleHRlcm5hbExvZ2dlci5sb2coe1xuICogICAgIGxldmVsOiBldmVudC5sZXZlbCxcbiAqICAgICBtZXNzYWdlOiBldmVudC5tZXNzYWdlLFxuICogICAgIG1ldGFkYXRhOiB7IGhvb2tUeXBlOiBldmVudC5ob29rVHlwZSB9XG4gKiAgIH0pO1xuICogfTtcbiAqIGBgYFxuICovXG5leHBvcnQgdHlwZSBMb2dFdmVudEhhbmRsZXIgPSAoZXZlbnQ6IExvZ0V2ZW50KSA9PiB2b2lkO1xuXG4vKipcbiAqIEZ1bmN0aW9uIHRvIHVuc3Vic2NyaWJlIGEgbG9nIGV2ZW50IGhhbmRsZXIuXG4gKlxuICogQ2FsbCB0aGlzIGZ1bmN0aW9uIHRvIHN0b3AgcmVjZWl2aW5nIGxvZyBldmVudHMuIEFsd2F5cyBjYWxsIHVuc3Vic2NyaWJlXG4gKiB3aGVuIHRoZSBoYW5kbGVyIGlzIG5vIGxvbmdlciBuZWVkZWQgdG8gcHJldmVudCBtZW1vcnkgbGVha3MuXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogY29uc3QgdW5zdWJzY3JpYmUgPSBsb2dnZXIub24oJ2Vycm9yJywgaGFuZGxlRXJyb3IpO1xuICogLy8gLi4uIGxhdGVyXG4gKiB1bnN1YnNjcmliZSgpOyAvLyBTdG9wIHJlY2VpdmluZyBldmVudHNcbiAqIGBgYFxuICovXG5leHBvcnQgdHlwZSBVbnN1YnNjcmliZSA9ICgpID0+IHZvaWQ7XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIExvZ2dlciBDb25maWd1cmF0aW9uXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbi8qKlxuICogQ29uZmlndXJhdGlvbiBvcHRpb25zIGZvciB0aGUgTG9nZ2VyLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIExvZ2dlckNvbmZpZyB7XG4gIC8qKlxuICAgKiBQYXRoIHRvIHRoZSBsb2cgZmlsZSBmb3IgSlNPTiBMaW5lcyBvdXRwdXQuXG4gICAqXG4gICAqIElmIG5vdCBzZXQsIGZpbGUgbG9nZ2luZyBpcyBkaXNhYmxlZC4gQ2FuIGFsc28gYmUgc2V0IHZpYSB0aGVcbiAgICogYENBUkRTX0hPT0tTX0xPR19GSUxFYCBlbnZpcm9ubWVudCB2YXJpYWJsZS5cbiAgICovXG4gIGxvZ0ZpbGVQYXRoPzogc3RyaW5nO1xufVxuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBMb2dnZXIgSW50ZXJmYWNlIChmb3IgdGVzdGluZyBhbmQgdHlwZSBjb21wYXRpYmlsaXR5KVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4vKipcbiAqIExvZ2dlciBpbnRlcmZhY2UgZm9yIHN0cnVjdHVyZWQsIGNvbnRleHQtYXdhcmUgbG9nZ2luZy5cbiAqXG4gKiBUaGlzIGludGVyZmFjZSBkZWZpbmVzIHRoZSBwdWJsaWMgQVBJIG9mIHRoZSBMb2dnZXIgY2xhc3MuIEl0IGV4aXN0c1xuICogcHJpbWFyaWx5IGZvciB0eXBlIGNvbXBhdGliaWxpdHkgYW5kIHRlc3RpbmcgcHVycG9zZXMsIGFsbG93aW5nIHRlc3RzXG4gKiB0byBtb2NrIHRoZSBsb2dnZXIgd2l0aG91dCBuZWVkaW5nIHRvIGltcGxlbWVudCBhbGwgaW50ZXJuYWwgbWV0aG9kcy5cbiAqXG4gKiBGb3IgcHJvZHVjdGlvbiB1c2UsIHVzZSB0aGUge0BsaW5rIExvZ2dlcn0gY2xhc3Mgb3IgdGhlIHtAbGluayBsb2dnZXJ9XG4gKiBzaW5nbGV0b24gZXhwb3J0LlxuICovXG5leHBvcnQgaW50ZXJmYWNlIElMb2dnZXIge1xuICAvKipcbiAgICogTG9ncyBhIGRlYnVnIG1lc3NhZ2UuXG4gICAqIEBwYXJhbSBtZXNzYWdlIC0gRGlhZ25vc3RpYyB0ZXh0IGRlc2NyaWJpbmcgbG93LWxldmVsIGV4ZWN1dGlvbiBkZXRhaWxzLlxuICAgKiBAcGFyYW0gY29udGV4dCAtIE9wdGlvbmFsIHN0cnVjdHVyZWQgbWV0YWRhdGEgbWVyZ2VkIGludG8gdGhlIGVtaXR0ZWQgZXZlbnQuXG4gICAqL1xuICBkZWJ1ZyhtZXNzYWdlOiBzdHJpbmcsIGNvbnRleHQ/OiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPik6IHZvaWQ7XG5cbiAgLyoqXG4gICAqIExvZ3MgYW4gaW5mbyBtZXNzYWdlLlxuICAgKiBAcGFyYW0gbWVzc2FnZSAtIE9wZXJhdGlvbmFsIG1lc3NhZ2UgZGVzY3JpYmluZyBub3JtYWwgaG9vayBwcm9ncmVzcy5cbiAgICogQHBhcmFtIGNvbnRleHQgLSBPcHRpb25hbCBzdHJ1Y3R1cmVkIG1ldGFkYXRhIG1lcmdlZCBpbnRvIHRoZSBlbWl0dGVkIGV2ZW50LlxuICAgKi9cbiAgaW5mbyhtZXNzYWdlOiBzdHJpbmcsIGNvbnRleHQ/OiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPik6IHZvaWQ7XG5cbiAgLyoqXG4gICAqIExvZ3MgYSB3YXJuaW5nIG1lc3NhZ2UuXG4gICAqIEBwYXJhbSBtZXNzYWdlIC0gV2FybmluZyB0ZXh0IGZvciByZWNvdmVyYWJsZSBvciBzdXNwaWNpb3VzIGNvbmRpdGlvbnMuXG4gICAqIEBwYXJhbSBjb250ZXh0IC0gT3B0aW9uYWwgc3RydWN0dXJlZCBtZXRhZGF0YSBtZXJnZWQgaW50byB0aGUgZW1pdHRlZCBldmVudC5cbiAgICovXG4gIHdhcm4obWVzc2FnZTogc3RyaW5nLCBjb250ZXh0PzogUmVjb3JkPHN0cmluZywgdW5rbm93bj4pOiB2b2lkO1xuXG4gIC8qKlxuICAgKiBMb2dzIGFuIGVycm9yIG1lc3NhZ2UuXG4gICAqIEBwYXJhbSBtZXNzYWdlIC0gRXJyb3IgdGV4dCBkZXNjcmliaW5nIGEgaGFuZGxlZCBmYWlsdXJlIGNvbmRpdGlvbi5cbiAgICogQHBhcmFtIGNvbnRleHQgLSBPcHRpb25hbCBzdHJ1Y3R1cmVkIG1ldGFkYXRhIG1lcmdlZCBpbnRvIHRoZSBlbWl0dGVkIGV2ZW50LlxuICAgKi9cbiAgZXJyb3IobWVzc2FnZTogc3RyaW5nLCBjb250ZXh0PzogUmVjb3JkPHN0cmluZywgdW5rbm93bj4pOiB2b2lkO1xuXG4gIC8qKlxuICAgKiBMb2dzIGEgc3RydWN0dXJlZCBlcnJvciB3aXRoIGZ1bGwgZXJyb3IgZGV0YWlscy5cbiAgICogQHBhcmFtIGVycm9yIC0gVGhlIGVycm9yIHRvIGxvZ1xuICAgKiBAcGFyYW0gbWVzc2FnZSAtIEh1bWFuLXJlYWRhYmxlIGRlc2NyaXB0aW9uIG9mIHdoYXQgZmFpbGVkXG4gICAqIEBwYXJhbSBjb250ZXh0IC0gT3B0aW9uYWwgc3RydWN0dXJlZCBtZXRhZGF0YSBtZXJnZWQgaW50byB0aGUgZW1pdHRlZCBldmVudC5cbiAgICovXG4gIGxvZ0Vycm9yKGVycm9yOiB1bmtub3duLCBtZXNzYWdlOiBzdHJpbmcsIGNvbnRleHQ/OiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPik6IHZvaWQ7XG59XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIExvZ2dlciBDbGFzc1xuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4vKipcbiAqIExvZ2dlciBmb3IgQ2FyZHMgRXh0ZW5zaW9uIGhvb2tzIHdpdGggZXZlbnQgc3Vic2NyaXB0aW9uIGFuZCBmaWxlIG91dHB1dC5cbiAqXG4gKiBPdXRwdXQgaXMgb3B0LWluIGFuZCBiZXN0LWVmZm9ydDpcbiAqIC0gV2l0aCBubyBoYW5kbGVycyBhbmQgbm8gbG9nIGZpbGUsIGV2ZW50cyBhcmUgZHJvcHBlZC5cbiAqIC0gSGFuZGxlciBlcnJvcnMgYXJlIHN3YWxsb3dlZCBzbyBsb2dnaW5nIGNhbm5vdCBicmVhayBob29rcy5cbiAqIC0gRmlsZSBvdXRwdXQgdXNlcyBKU09OIExpbmVzIGFuZCBpZ25vcmVzIHdyaXRlIGZhaWx1cmVzLlxuICpcbiAqIFRoZSBsb2dnZXIgbmV2ZXIgd3JpdGVzIHRvIHN0ZG91dCBvciBzdGRlcnIuXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogaW1wb3J0IHsgbG9nZ2VyIH0gZnJvbSAnQGNhcmRzL3Nkay9jb25maWcnO1xuICpcbiAqIC8vIFN1YnNjcmliZSB0byBldmVudHMgYXQgc3BlY2lmaWMgbGV2ZWxcbiAqIGxvZ2dlci5vbignd2FybicsIChldmVudCkgPT4ge1xuICogICBzZW5kQWxlcnQoZXZlbnQubWVzc2FnZSk7XG4gKiB9KTtcbiAqXG4gKiAvLyBMb2cgd2l0aGluIGEgaG9vayBoYW5kbGVyXG4gKiBsb2dnZXIud2FybignQWJvdXQgdG8gZXhlY3V0ZSB0YXNrJyk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNsYXNzIExvZ2dlciB7XG4gIC8qKlxuICAgKiBSZWdpc3RlcmVkIGV2ZW50IGhhbmRsZXJzIGJ5IGxvZyBsZXZlbC5cbiAgICovXG4gIHByaXZhdGUgaGFuZGxlcnM6IE1hcDxMb2dMZXZlbCwgU2V0PExvZ0V2ZW50SGFuZGxlcj4+ID0gbmV3IE1hcCgpO1xuXG4gIC8qKlxuICAgKiBGaWxlIGRlc2NyaXB0b3IgZm9yIGxvZyBmaWxlIG91dHB1dC5cbiAgICogTGF6aWx5IGluaXRpYWxpemVkIG9uIGZpcnN0IHdyaXRlLlxuICAgKi9cbiAgcHJpdmF0ZSBsb2dGaWxlRmQ6IG51bWJlciB8IG51bGwgPSBudWxsO1xuXG4gIC8qKlxuICAgKiBQYXRoIHRvIHRoZSBsb2cgZmlsZSwgaWYgY29uZmlndXJlZC5cbiAgICovXG4gIHByaXZhdGUgbG9nRmlsZVBhdGg6IHN0cmluZyB8IG51bGwgPSBudWxsO1xuXG4gIC8qKlxuICAgKiBXaGV0aGVyIGZpbGUgaW5pdGlhbGl6YXRpb24gaGFzIGJlZW4gYXR0ZW1wdGVkLlxuICAgKi9cbiAgcHJpdmF0ZSBmaWxlSW5pdGlhbGl6ZWQgPSBmYWxzZTtcblxuICAvKipcbiAgICogQ3VycmVudCBob29rIGNvbnRleHQgZm9yIGVucmljaGluZyBsb2cgZXZlbnRzLlxuICAgKi9cbiAgcHJpdmF0ZSBjdXJyZW50SG9va1R5cGU6IHN0cmluZyB8IHVuZGVmaW5lZDtcblxuICAvKipcbiAgICogQ3VycmVudCBob29rIGlucHV0IGZvciBlbnJpY2hpbmcgbG9nIGV2ZW50cy5cbiAgICovXG4gIHByaXZhdGUgY3VycmVudElucHV0OiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPiB8IHVuZGVmaW5lZDtcblxuICAvKipcbiAgICogQ3JlYXRlcyBhIG5ldyBMb2dnZXIgaW5zdGFuY2UuXG4gICAqXG4gICAqIFR5cGljYWxseSB5b3Ugc2hvdWxkIHVzZSB0aGUgZXhwb3J0ZWQgYGxvZ2dlcmAgc2luZ2xldG9uIHJhdGhlciB0aGFuXG4gICAqIGNyZWF0aW5nIG5ldyBpbnN0YW5jZXMuXG4gICAqIEBwYXJhbSBjb25maWcgLSBPcHRpb25hbCBjb25maWd1cmF0aW9uXG4gICAqIEBleGFtcGxlXG4gICAqIGBgYHR5cGVzY3JpcHRcbiAgICogLy8gVXNlIHNpbmdsZXRvbiAocmVjb21tZW5kZWQpXG4gICAqIGltcG9ydCB7IGxvZ2dlciB9IGZyb20gJ0BjYXJkcy9zZGsvY29uZmlnJztcbiAgICpcbiAgICogLy8gT3IgY3JlYXRlIGN1c3RvbSBpbnN0YW5jZVxuICAgKiBjb25zdCBjdXN0b21Mb2dnZXIgPSBuZXcgTG9nZ2VyKHsgbG9nRmlsZVBhdGg6ICcvdmFyL2xvZy9ob29rcy5sb2cnIH0pO1xuICAgKiBgYGBcbiAgICovXG4gIGNvbnN0cnVjdG9yKGNvbmZpZzogTG9nZ2VyQ29uZmlnID0ge30pIHtcbiAgICAvLyBJbml0aWFsaXplIGhhbmRsZXJzIG1hcCBmb3IgZWFjaCBsZXZlbFxuICAgIGZvciAoY29uc3QgbGV2ZWwgb2YgTE9HX0xFVkVMUykge1xuICAgICAgdGhpcy5oYW5kbGVycy5zZXQobGV2ZWwsIG5ldyBTZXQoKSk7XG4gICAgfVxuXG4gICAgLy8gU2V0IGxvZyBmaWxlIHBhdGggZnJvbSBjb25maWcgb3IgZW52aXJvbm1lbnRcbiAgICB0aGlzLmxvZ0ZpbGVQYXRoID0gY29uZmlnLmxvZ0ZpbGVQYXRoID8/IHByb2Nlc3MuZW52WydDQVJEU19IT09LU19MT0dfRklMRSddID8/IG51bGw7XG4gIH1cblxuICAvKipcbiAgICogTG9ncyBhIGRlYnVnIG1lc3NhZ2UuXG4gICAqXG4gICAqIFVzZSBmb3IgZGV0YWlsZWQgZGVidWdnaW5nIGluZm9ybWF0aW9uIHRoYXQgaXMgdHlwaWNhbGx5IG9ubHkgdXNlZnVsXG4gICAqIGR1cmluZyBkZXZlbG9wbWVudCBvciB0cm91Ymxlc2hvb3RpbmcuXG4gICAqIEBwYXJhbSBtZXNzYWdlIC0gRGlhZ25vc3RpYyB0ZXh0IGRlc2NyaWJpbmcgbG93LWxldmVsIGV4ZWN1dGlvbiBkZXRhaWxzLlxuICAgKiBAcGFyYW0gY29udGV4dCAtIE9wdGlvbmFsIHN0cnVjdHVyZWQgbWV0YWRhdGEgbWVyZ2VkIGludG8gdGhlIGVtaXR0ZWQgZXZlbnQuXG4gICAqIEBleGFtcGxlXG4gICAqIGBgYHR5cGVzY3JpcHRcbiAgICogbG9nZ2VyLmRlYnVnKCdQcm9jZXNzaW5nIGhvb2sgaW5wdXQnLCB7IHRhc2tJZDogJ3Rhc2stMTIzJywgaW5wdXRTaXplOiAyNTYgfSk7XG4gICAqIGBgYFxuICAgKi9cbiAgZGVidWcobWVzc2FnZTogc3RyaW5nLCBjb250ZXh0PzogUmVjb3JkPHN0cmluZywgdW5rbm93bj4pOiB2b2lkIHtcbiAgICB0aGlzLmVtaXQoJ2RlYnVnJywgbWVzc2FnZSwgY29udGV4dCk7XG4gIH1cblxuICAvKipcbiAgICogTG9ncyBhbiBpbmZvIG1lc3NhZ2UuXG4gICAqXG4gICAqIFVzZSBmb3IgZ2VuZXJhbCBvcGVyYXRpb25hbCBldmVudHMgbGlrZSBob29rIGludm9jYXRpb25zLCBzdWNjZXNzZnVsXG4gICAqIGNvbXBsZXRpb25zLCBvciBzdGF0ZSBjaGFuZ2VzLlxuICAgKiBAcGFyYW0gbWVzc2FnZSAtIE9wZXJhdGlvbmFsIG1lc3NhZ2UgZGVzY3JpYmluZyBub3JtYWwgaG9vayBwcm9ncmVzcy5cbiAgICogQHBhcmFtIGNvbnRleHQgLSBPcHRpb25hbCBzdHJ1Y3R1cmVkIG1ldGFkYXRhIG1lcmdlZCBpbnRvIHRoZSBlbWl0dGVkIGV2ZW50LlxuICAgKiBAZXhhbXBsZVxuICAgKiBgYGB0eXBlc2NyaXB0XG4gICAqIGxvZ2dlci5pbmZvKCdUYXNrIHN0YXJ0ZWQnLCB7IHRhc2tJZDogJ3Rhc2stMTIzJywgY2FyZElkOiAnY2FyZC00NTYnIH0pO1xuICAgKiBgYGBcbiAgICovXG4gIGluZm8obWVzc2FnZTogc3RyaW5nLCBjb250ZXh0PzogUmVjb3JkPHN0cmluZywgdW5rbm93bj4pOiB2b2lkIHtcbiAgICB0aGlzLmVtaXQoJ2luZm8nLCBtZXNzYWdlLCBjb250ZXh0KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBMb2dzIGEgd2FybmluZyBtZXNzYWdlLlxuICAgKlxuICAgKiBVc2UgZm9yIGNvbmRpdGlvbnMgdGhhdCBtYXkgaW5kaWNhdGUgY2FyZHMgYnV0IGRvbid0IHByZXZlbnRcbiAgICogb3BlcmF0aW9uLCBzdWNoIGFzIGRlcHJlY2F0ZWQgcGF0dGVybnMgb3IgcGVyZm9ybWFuY2UgY29uY2VybnMuXG4gICAqIEBwYXJhbSBtZXNzYWdlIC0gV2FybmluZyB0ZXh0IGZvciByZWNvdmVyYWJsZSBvciBzdXNwaWNpb3VzIGNvbmRpdGlvbnMuXG4gICAqIEBwYXJhbSBjb250ZXh0IC0gT3B0aW9uYWwgc3RydWN0dXJlZCBtZXRhZGF0YSBtZXJnZWQgaW50byB0aGUgZW1pdHRlZCBldmVudC5cbiAgICogQGV4YW1wbGVcbiAgICogYGBgdHlwZXNjcmlwdFxuICAgKiBsb2dnZXIud2FybignRGVwcmVjYXRlZCBob29rIHBhdHRlcm4gZGV0ZWN0ZWQnLCB7IHBhdHRlcm46ICdsZWdhY3lNYXRjaGVyJyB9KTtcbiAgICogYGBgXG4gICAqL1xuICB3YXJuKG1lc3NhZ2U6IHN0cmluZywgY29udGV4dD86IFJlY29yZDxzdHJpbmcsIHVua25vd24+KTogdm9pZCB7XG4gICAgdGhpcy5lbWl0KCd3YXJuJywgbWVzc2FnZSwgY29udGV4dCk7XG4gIH1cblxuICAvKipcbiAgICogTG9ncyBhbiBlcnJvciBtZXNzYWdlLlxuICAgKlxuICAgKiBVc2UgZm9yIGVycm9yIGNvbmRpdGlvbnMgdGhhdCByZXF1aXJlIGF0dGVudGlvbiBidXQgd2VyZSBoYW5kbGVkXG4gICAqIGdyYWNlZnVsbHkuIEZvciBleGNlcHRpb25zLCBwcmVmZXIge0BsaW5rIGxvZ0Vycm9yfS5cbiAgICogQHBhcmFtIG1lc3NhZ2UgLSBFcnJvciB0ZXh0IGRlc2NyaWJpbmcgYSBoYW5kbGVkIGZhaWx1cmUgY29uZGl0aW9uLlxuICAgKiBAcGFyYW0gY29udGV4dCAtIE9wdGlvbmFsIHN0cnVjdHVyZWQgbWV0YWRhdGEgbWVyZ2VkIGludG8gdGhlIGVtaXR0ZWQgZXZlbnQuXG4gICAqIEBleGFtcGxlXG4gICAqIGBgYHR5cGVzY3JpcHRcbiAgICogbG9nZ2VyLmVycm9yKCdGYWlsZWQgdG8gdmFsaWRhdGUgaG9vayBpbnB1dCcsIHsgcmVhc29uOiAnZW1wdHkgdGFza0lkJyB9KTtcbiAgICogYGBgXG4gICAqL1xuICBlcnJvcihtZXNzYWdlOiBzdHJpbmcsIGNvbnRleHQ/OiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPik6IHZvaWQge1xuICAgIHRoaXMuZW1pdCgnZXJyb3InLCBtZXNzYWdlLCBjb250ZXh0KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBMb2dzIGEgc3RydWN0dXJlZCBlcnJvciB3aXRoIGZ1bGwgZXJyb3IgZGV0YWlscy5cbiAgICpcbiAgICogVXNlIHRoaXMgZm9yIGNhdWdodCBleGNlcHRpb25zLiBOb24tRXJyb3IgdmFsdWVzIGFyZSBub3JtYWxpemVkIHNvIGhhbmRsZXJzXG4gICAqIGFsd2F5cyByZWNlaXZlIGEgY29uc2lzdGVudCBlcnJvciBzaGFwZS5cbiAgICogQHBhcmFtIGVycm9yIC0gVGhlIGVycm9yIHRvIGxvZ1xuICAgKiBAcGFyYW0gbWVzc2FnZSAtIEh1bWFuLXJlYWRhYmxlIGRlc2NyaXB0aW9uIG9mIHdoYXQgZmFpbGVkXG4gICAqIEBwYXJhbSBjb250ZXh0IC0gT3B0aW9uYWwgc3RydWN0dXJlZCBtZXRhZGF0YSBtZXJnZWQgaW50byB0aGUgZW1pdHRlZCBldmVudC5cbiAgICogQGV4YW1wbGVcbiAgICogYGBgdHlwZXNjcmlwdFxuICAgKiB0cnkge1xuICAgKiAgIGF3YWl0IGRhbmdlcm91c09wZXJhdGlvbigpO1xuICAgKiB9IGNhdGNoIChlcnIpIHtcbiAgICogICBsb2dnZXIubG9nRXJyb3IoZXJyLCAnRmFpbGVkIHRvIGV4ZWN1dGUgZGFuZ2Vyb3VzIG9wZXJhdGlvbicsIHtcbiAgICogICAgIG9wZXJhdGlvbjogJ2RlbGV0ZScsXG4gICAqICAgICB0YXJnZXQ6ICcvaW1wb3J0YW50L2ZpbGUudHh0J1xuICAgKiAgIH0pO1xuICAgKiB9XG4gICAqIGBgYFxuICAgKi9cbiAgbG9nRXJyb3IoZXJyb3I6IHVua25vd24sIG1lc3NhZ2U6IHN0cmluZywgY29udGV4dD86IFJlY29yZDxzdHJpbmcsIHVua25vd24+KTogdm9pZCB7XG4gICAgY29uc3QgZXJyb3JJbmZvID0gdGhpcy5leHRyYWN0RXJyb3JJbmZvKGVycm9yKTtcblxuICAgIGNvbnN0IGV2ZW50OiBMb2dFdmVudCA9IHtcbiAgICAgIHRpbWVzdGFtcDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxuICAgICAgbGV2ZWw6ICdlcnJvcicsXG4gICAgICBob29rVHlwZTogdGhpcy5jdXJyZW50SG9va1R5cGUsXG4gICAgICBtZXNzYWdlLFxuICAgICAgaW5wdXQ6IHRoaXMuY3VycmVudElucHV0LFxuICAgICAgZXJyb3I6IGVycm9ySW5mbyxcbiAgICAgIGNvbnRleHRcbiAgICB9O1xuXG4gICAgdGhpcy5kZWxpdmVyRXZlbnQoZXZlbnQpO1xuICB9XG5cbiAgLyoqXG4gICAqIFN1YnNjcmliZXMgYSBoYW5kbGVyIHRvIGxvZyBldmVudHMgYXQgdGhlIHNwZWNpZmllZCBsZXZlbC5cbiAgICpcbiAgICogVGhlIGhhbmRsZXIgd2lsbCBiZSBjYWxsZWQgZm9yIGV2ZXJ5IGxvZyBldmVudCBhdCB0aGUgc3BlY2lmaWVkIGxldmVsLlxuICAgKiBSZXR1cm5zIGFuIHVuc3Vic2NyaWJlIGZ1bmN0aW9uIHRoYXQgc2hvdWxkIGJlIGNhbGxlZCB3aGVuIHRoZSBoYW5kbGVyXG4gICAqIGlzIG5vIGxvbmdlciBuZWVkZWQuIEhhbmRsZXIgZXJyb3JzIGFyZSBpZ25vcmVkIHRvIGF2b2lkIGRpc3J1cHRpbmcgaG9va3MuXG4gICAqIEBwYXJhbSBsZXZlbCAtIFRoZSBsb2cgbGV2ZWwgdG8gc3Vic2NyaWJlIHRvXG4gICAqIEBwYXJhbSBoYW5kbGVyIC0gVGhlIGhhbmRsZXIgZnVuY3Rpb24gdG8gY2FsbCBmb3IgZWFjaCBldmVudFxuICAgKiBAcmV0dXJucyBBIGZ1bmN0aW9uIHRvIHVuc3Vic2NyaWJlIHRoZSBoYW5kbGVyXG4gICAqIEBleGFtcGxlXG4gICAqIGBgYHR5cGVzY3JpcHRcbiAgICogLy8gU3Vic2NyaWJlIHRvIGVycm9yIGV2ZW50c1xuICAgKiBjb25zdCB1bnN1YnNjcmliZSA9IGxvZ2dlci5vbignZXJyb3InLCAoZXZlbnQpID0+IHtcbiAgICogICBjb25zb2xlLmVycm9yKGBbJHtldmVudC5ob29rVHlwZX1dICR7ZXZlbnQubWVzc2FnZX1gKTtcbiAgICogICBpZiAoZXZlbnQuZXJyb3IpIHtcbiAgICogICAgIGNvbnNvbGUuZXJyb3IoZXZlbnQuZXJyb3Iuc3RhY2spO1xuICAgKiAgIH1cbiAgICogfSk7XG4gICAqXG4gICAqIC8vIExhdGVyLCBjbGVhbiB1cFxuICAgKiB1bnN1YnNjcmliZSgpO1xuICAgKiBgYGBcbiAgICogQGV4YW1wbGVcbiAgICogYGBgdHlwZXNjcmlwdFxuICAgKiAvLyBGb3J3YXJkIHRvIGV4dGVybmFsIGxvZ2dpbmcgbGlicmFyeVxuICAgKiBpbXBvcnQgcGlubyBmcm9tICdwaW5vJztcbiAgICogY29uc3QgcGlub0xvZ2dlciA9IHBpbm8oKTtcbiAgICpcbiAgICogbG9nZ2VyLm9uKCdpbmZvJywgKGV2ZW50KSA9PiBwaW5vTG9nZ2VyLmluZm8oZXZlbnQsIGV2ZW50Lm1lc3NhZ2UpKTtcbiAgICogbG9nZ2VyLm9uKCd3YXJuJywgKGV2ZW50KSA9PiBwaW5vTG9nZ2VyLndhcm4oZXZlbnQsIGV2ZW50Lm1lc3NhZ2UpKTtcbiAgICogbG9nZ2VyLm9uKCdlcnJvcicsIChldmVudCkgPT4gcGlub0xvZ2dlci5lcnJvcihldmVudCwgZXZlbnQubWVzc2FnZSkpO1xuICAgKiBgYGBcbiAgICovXG4gIG9uKGxldmVsOiBMb2dMZXZlbCwgaGFuZGxlcjogTG9nRXZlbnRIYW5kbGVyKTogVW5zdWJzY3JpYmUge1xuICAgIGNvbnN0IGxldmVsSGFuZGxlcnMgPSB0aGlzLmhhbmRsZXJzLmdldChsZXZlbCk7XG4gICAgaWYgKGxldmVsSGFuZGxlcnMpIHtcbiAgICAgIGxldmVsSGFuZGxlcnMuYWRkKGhhbmRsZXIpO1xuICAgIH1cblxuICAgIHJldHVybiAoKSA9PiB7XG4gICAgICBsZXZlbEhhbmRsZXJzPy5kZWxldGUoaGFuZGxlcik7XG4gICAgfTtcbiAgfVxuXG4gIC8qKlxuICAgKiBTZXRzIHRoZSBjdXJyZW50IGhvb2sgY29udGV4dCBmb3IgZW5yaWNoaW5nIGxvZyBldmVudHMuXG4gICAqXG4gICAqIFRoaXMgaXMgY2FsbGVkIGludGVybmFsbHkgYnkgdGhlIHJ1bnRpbWUgYmVmb3JlIGludm9raW5nIGhvb2sgaGFuZGxlcnMuXG4gICAqIFlvdSB0eXBpY2FsbHkgZG9uJ3QgbmVlZCB0byBjYWxsIHRoaXMgZGlyZWN0bHkuXG4gICAqIEBwYXJhbSBob29rVHlwZSAtIFRoZSB0eXBlIG9mIGhvb2sgYmVpbmcgZXhlY3V0ZWRcbiAgICogQHBhcmFtIGlucHV0IC0gVGhlIGhvb2sgaW5wdXQgZGF0YVxuICAgKiBAaW50ZXJuYWxcbiAgICovXG4gIHNldENvbnRleHQoaG9va1R5cGU6IHN0cmluZyB8IHVuZGVmaW5lZCwgaW5wdXQ6IFJlY29yZDxzdHJpbmcsIHVua25vd24+IHwgdW5kZWZpbmVkKTogdm9pZCB7XG4gICAgdGhpcy5jdXJyZW50SG9va1R5cGUgPSBob29rVHlwZTtcbiAgICB0aGlzLmN1cnJlbnRJbnB1dCA9IGlucHV0O1xuICB9XG5cbiAgLyoqXG4gICAqIENsZWFycyB0aGUgY3VycmVudCBob29rIGNvbnRleHQuXG4gICAqXG4gICAqIENhbGxlZCBpbnRlcm5hbGx5IGJ5IHRoZSBydW50aW1lIGFmdGVyIGhvb2sgZXhlY3V0aW9uIGNvbXBsZXRlcy5cbiAgICogQGludGVybmFsXG4gICAqL1xuICBjbGVhckNvbnRleHQoKTogdm9pZCB7XG4gICAgdGhpcy5jdXJyZW50SG9va1R5cGUgPSB1bmRlZmluZWQ7XG4gICAgdGhpcy5jdXJyZW50SW5wdXQgPSB1bmRlZmluZWQ7XG4gIH1cblxuICAvKipcbiAgICogU2V0cyBhIGRlZmF1bHQgbG9nIGZpbGUgcGF0aCB0aGF0IG9ubHkgdGFrZXMgZWZmZWN0IGlmIG5vIG90aGVyIHNvdXJjZVxuICAgKiBoYXMgY29uZmlndXJlZCBmaWxlIGxvZ2dpbmcuXG4gICAqXG4gICAqIFRoaXMgaXMgdGhlIGxvd2VzdC1wcmlvcml0eSBmaWxlIHBhdGggc291cmNlLiBJdCB3aWxsIGJlIGlnbm9yZWQgaWZcbiAgICogYW55IG9mIHRoZXNlIGhhdmUgYWxyZWFkeSBzZXQgYSBwYXRoOlxuICAgKiAtIGBsb2dGaWxlUGF0aGAgaW4gdGhlIGNvbnN0cnVjdG9yIGNvbmZpZ1xuICAgKiAtIGBDQVJEU19IT09LU19MT0dfRklMRWAgZW52aXJvbm1lbnQgdmFyaWFibGVcbiAgICogLSB7QGxpbmsgc2V0TG9nRmlsZX0gY2FsbGVkIGF0IHJ1bnRpbWVcbiAgICpcbiAgICogSW50ZW5kZWQgZm9yIHVzZSBieSBDTEkgZW50cnkgcG9pbnRzIChlLmcuLCB0aGUgYC0tbG9nYCBmbGFnKS5cbiAgICogQHBhcmFtIGZpbGVQYXRoIC0gRGVmYXVsdCBwYXRoIHRvIHRoZSBsb2cgZmlsZVxuICAgKiBAZXhhbXBsZVxuICAgKiBgYGB0eXBlc2NyaXB0XG4gICAqIC8vIFdpcmUgLS1sb2cgQ0xJIGFyZ3VtZW50IGFzIGEgZmFsbGJhY2tcbiAgICogaWYgKGFyZ3MubG9nKSB7XG4gICAqICAgbG9nZ2VyLnNldERlZmF1bHRMb2dGaWxlKGFyZ3MubG9nKTtcbiAgICogfVxuICAgKiBgYGBcbiAgICovXG4gIHNldERlZmF1bHRMb2dGaWxlKGZpbGVQYXRoOiBzdHJpbmcpOiB2b2lkIHtcbiAgICBpZiAodGhpcy5sb2dGaWxlUGF0aCA9PT0gbnVsbCkge1xuICAgICAgdGhpcy5sb2dGaWxlUGF0aCA9IGZpbGVQYXRoO1xuICAgICAgdGhpcy5maWxlSW5pdGlhbGl6ZWQgPSBmYWxzZTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogQ29uZmlndXJlcyB0aGUgbG9nIGZpbGUgcGF0aCBhdCBydW50aW1lLlxuICAgKlxuICAgKiBDYWxsIHRoaXMgdG8gZW5hYmxlIG9yIGNoYW5nZSBmaWxlIGxvZ2dpbmcuIFNldHRpbmcgdG8gYG51bGxgIGRpc2FibGVzXG4gICAqIGZpbGUgbG9nZ2luZyBhbmQgY2xvc2VzIGFueSBvcGVuIGZpbGUgaGFuZGxlLiBEaXJlY3RvcmllcyBhcmUgY3JlYXRlZFxuICAgKiBvbiBkZW1hbmQgd2hlbiB0aGUgZmlyc3Qgd3JpdGUgb2NjdXJzLlxuICAgKiBAcGFyYW0gZmlsZVBhdGggLSBQYXRoIHRvIHRoZSBsb2cgZmlsZSwgb3IgbnVsbCB0byBkaXNhYmxlXG4gICAqIEBleGFtcGxlXG4gICAqIGBgYHR5cGVzY3JpcHRcbiAgICogLy8gRW5hYmxlIGZpbGUgbG9nZ2luZyBhdCBydW50aW1lXG4gICAqIGxvZ2dlci5zZXRMb2dGaWxlKCcvdmFyL2xvZy9jYXJkcy1zZGsubG9nJyk7XG4gICAqXG4gICAqIC8vIERpc2FibGUgZmlsZSBsb2dnaW5nXG4gICAqIGxvZ2dlci5zZXRMb2dGaWxlKG51bGwpO1xuICAgKiBgYGBcbiAgICovXG4gIHNldExvZ0ZpbGUoZmlsZVBhdGg6IHN0cmluZyB8IG51bGwpOiB2b2lkIHtcbiAgICAvLyBDbG9zZSBleGlzdGluZyBmaWxlIGlmIG9wZW5cbiAgICBpZiAodGhpcy5sb2dGaWxlRmQgIT09IG51bGwpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGNsb3NlU3luYyh0aGlzLmxvZ0ZpbGVGZCk7XG4gICAgICB9IGNhdGNoIHtcbiAgICAgICAgLy8gSWdub3JlIGVycm9ycyBvbiBjbG9zZVxuICAgICAgfVxuICAgICAgdGhpcy5sb2dGaWxlRmQgPSBudWxsO1xuICAgIH1cblxuICAgIHRoaXMubG9nRmlsZVBhdGggPSBmaWxlUGF0aDtcbiAgICB0aGlzLmZpbGVJbml0aWFsaXplZCA9IGZhbHNlO1xuICB9XG5cbiAgLyoqXG4gICAqIENsb3NlcyBhbGwgcmVzb3VyY2VzIGhlbGQgYnkgdGhlIGxvZ2dlci5cbiAgICpcbiAgICogQ2FsbCB0aGlzIGR1cmluZyBncmFjZWZ1bCBzaHV0ZG93biB0byBlbnN1cmUgYWxsIGxvZyBkYXRhIGlzIGZsdXNoZWQuXG4gICAqIFNhZmUgdG8gY2FsbCBtdWx0aXBsZSB0aW1lcy5cbiAgICogQGV4YW1wbGVcbiAgICogYGBgdHlwZXNjcmlwdFxuICAgKiBwcm9jZXNzLm9uKCdleGl0JywgKCkgPT4ge1xuICAgKiAgIGxvZ2dlci5jbG9zZSgpO1xuICAgKiB9KTtcbiAgICogYGBgXG4gICAqL1xuICBjbG9zZSgpOiB2b2lkIHtcbiAgICBpZiAodGhpcy5sb2dGaWxlRmQgIT09IG51bGwpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGNsb3NlU3luYyh0aGlzLmxvZ0ZpbGVGZCk7XG4gICAgICB9IGNhdGNoIHtcbiAgICAgICAgLy8gSWdub3JlIGVycm9ycyBvbiBjbG9zZVxuICAgICAgfVxuICAgICAgdGhpcy5sb2dGaWxlRmQgPSBudWxsO1xuICAgIH1cbiAgICB0aGlzLmZpbGVJbml0aWFsaXplZCA9IGZhbHNlO1xuICB9XG5cbiAgLyoqXG4gICAqIENoZWNrcyBpZiB0aGVyZSBhcmUgYW55IGFjdGl2ZSBoYW5kbGVycyBvciBkZXN0aW5hdGlvbnMuXG4gICAqXG4gICAqIFJldHVybnMgdHJ1ZSBpZiBhbnkgaGFuZGxlcnMgYXJlIHJlZ2lzdGVyZWQgb3IgZmlsZSBsb2dnaW5nIGlzIGVuYWJsZWQuXG4gICAqIFVzZWZ1bCBmb3IgZGVjaWRpbmcgd2hldGhlciB0byBjb21wdXRlIGV4cGVuc2l2ZSBsb2cgY29udGV4dC5cbiAgICogQHJldHVybnMgV2hldGhlciB0aGUgbG9nZ2VyIGhhcyBhbnkgYWN0aXZlIG91dHB1dCBkZXN0aW5hdGlvbnNcbiAgICovXG4gIGhhc0Rlc3RpbmF0aW9ucygpOiBib29sZWFuIHtcbiAgICBjb25zdCBoYXNIYW5kbGVycyA9IEFycmF5LmZyb20odGhpcy5oYW5kbGVycy52YWx1ZXMoKSkuc29tZSgoaGFuZGxlcnMpID0+IGhhbmRsZXJzLnNpemUgPiAwKTtcbiAgICByZXR1cm4gaGFzSGFuZGxlcnMgfHwgdGhpcy5sb2dGaWxlUGF0aCAhPT0gbnVsbDtcbiAgfVxuXG4gIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgLy8gUHJpdmF0ZSBNZXRob2RzXG4gIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuICAvKipcbiAgICogRW1pdHMgYSBsb2cgZXZlbnQuXG4gICAqIEBwYXJhbSBsZXZlbCAtIFRoZSBzZXZlcml0eSBsZXZlbCBvZiB0aGUgZXZlbnRcbiAgICogQHBhcmFtIG1lc3NhZ2UgLSBUaGUgbG9nIG1lc3NhZ2VcbiAgICogQHBhcmFtIGNvbnRleHQgLSBPcHRpb25hbCBhZGRpdGlvbmFsIGNvbnRleHQgZGF0YVxuICAgKi9cbiAgcHJpdmF0ZSBlbWl0KGxldmVsOiBMb2dMZXZlbCwgbWVzc2FnZTogc3RyaW5nLCBjb250ZXh0PzogUmVjb3JkPHN0cmluZywgdW5rbm93bj4pOiB2b2lkIHtcbiAgICBjb25zdCBldmVudDogTG9nRXZlbnQgPSB7XG4gICAgICB0aW1lc3RhbXA6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcbiAgICAgIGxldmVsLFxuICAgICAgaG9va1R5cGU6IHRoaXMuY3VycmVudEhvb2tUeXBlLFxuICAgICAgbWVzc2FnZSxcbiAgICAgIGlucHV0OiB0aGlzLmN1cnJlbnRJbnB1dCxcbiAgICAgIGNvbnRleHRcbiAgICB9O1xuXG4gICAgdGhpcy5kZWxpdmVyRXZlbnQoZXZlbnQpO1xuICB9XG5cbiAgLyoqXG4gICAqIERlbGl2ZXJzIGFuIGV2ZW50IHRvIGFsbCByZWdpc3RlcmVkIGRlc3RpbmF0aW9ucy5cbiAgICogQHBhcmFtIGV2ZW50IC0gVGhlIGxvZyBldmVudCB0byBkZWxpdmVyXG4gICAqL1xuICBwcml2YXRlIGRlbGl2ZXJFdmVudChldmVudDogTG9nRXZlbnQpOiB2b2lkIHtcbiAgICAvLyBEZWxpdmVyIHRvIGV2ZW50IGhhbmRsZXJzXG4gICAgY29uc3QgbGV2ZWxIYW5kbGVycyA9IHRoaXMuaGFuZGxlcnMuZ2V0KGV2ZW50LmxldmVsKTtcbiAgICBpZiAobGV2ZWxIYW5kbGVycykge1xuICAgICAgZm9yIChjb25zdCBoYW5kbGVyIG9mIGxldmVsSGFuZGxlcnMpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBoYW5kbGVyKGV2ZW50KTtcbiAgICAgICAgfSBjYXRjaCB7XG4gICAgICAgICAgLy8gU2lsZW50bHkgaWdub3JlIGhhbmRsZXIgZXJyb3JzIHRvIG5vdCBkaXNydXB0IGhvb2sgZXhlY3V0aW9uXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBXcml0ZSB0byBmaWxlIGlmIGNvbmZpZ3VyZWRcbiAgICB0aGlzLndyaXRlVG9GaWxlKGV2ZW50KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBXcml0ZXMgYW4gZXZlbnQgdG8gdGhlIGxvZyBmaWxlLlxuICAgKiBAcGFyYW0gZXZlbnQgLSBUaGUgbG9nIGV2ZW50IHRvIHdyaXRlXG4gICAqL1xuICBwcml2YXRlIHdyaXRlVG9GaWxlKGV2ZW50OiBMb2dFdmVudCk6IHZvaWQge1xuICAgIGlmICghdGhpcy5sb2dGaWxlUGF0aCkgcmV0dXJuO1xuXG4gICAgLy8gTGF6eSBpbml0aWFsaXphdGlvbiBvZiBmaWxlIGhhbmRsZVxuICAgIGlmICghdGhpcy5maWxlSW5pdGlhbGl6ZWQpIHtcbiAgICAgIHRoaXMuaW5pdGlhbGl6ZUZpbGUoKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5sb2dGaWxlRmQgPT09IG51bGwpIHJldHVybjtcblxuICAgIHRyeSB7XG4gICAgICBjb25zdCBsaW5lID0gYCR7SlNPTi5zdHJpbmdpZnkoZXZlbnQpfVxcbmA7XG4gICAgICB3cml0ZVN5bmModGhpcy5sb2dGaWxlRmQsIGxpbmUpO1xuICAgIH0gY2F0Y2gge1xuICAgICAgLy8gU2lsZW50bHkgaWdub3JlIGZpbGUgd3JpdGUgZXJyb3JzIHRvIG5vdCBkaXNydXB0IGhvb2sgZXhlY3V0aW9uXG4gICAgICAvLyBUaGlzIGZvbGxvd3MgdGhlIHJpc2sgbWl0aWdhdGlvbjogXCJHcmFjZWZ1bCBkZWdyYWRhdGlvbiAtIGxvZyB3cml0ZVxuICAgICAgLy8gZmFpbHVyZXMgYXJlIHNpbGVudGx5IGlnbm9yZWQgdG8gbm90IGRpc3J1cHQgaG9vayBleGVjdXRpb25cIlxuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBJbml0aWFsaXplcyB0aGUgbG9nIGZpbGUgZm9yIHdyaXRpbmcuXG4gICAqL1xuICBwcml2YXRlIGluaXRpYWxpemVGaWxlKCk6IHZvaWQge1xuICAgIHRoaXMuZmlsZUluaXRpYWxpemVkID0gdHJ1ZTtcblxuICAgIGlmICghdGhpcy5sb2dGaWxlUGF0aCkgcmV0dXJuO1xuXG4gICAgdHJ5IHtcbiAgICAgIC8vIEVuc3VyZSBkaXJlY3RvcnkgZXhpc3RzXG4gICAgICBjb25zdCBkaXIgPSBkaXJuYW1lKHRoaXMubG9nRmlsZVBhdGgpO1xuICAgICAgaWYgKCFleGlzdHNTeW5jKGRpcikpIHtcbiAgICAgICAgbWtkaXJTeW5jKGRpciwgeyByZWN1cnNpdmU6IHRydWUgfSk7XG4gICAgICB9XG5cbiAgICAgIC8vIE9wZW4gZmlsZSBmb3IgYXBwZW5kaW5nXG4gICAgICB0aGlzLmxvZ0ZpbGVGZCA9IG9wZW5TeW5jKHRoaXMubG9nRmlsZVBhdGgsICdhJyk7XG4gICAgfSBjYXRjaCB7XG4gICAgICAvLyBTaWxlbnRseSBpZ25vcmUgZmlsZSBpbml0aWFsaXphdGlvbiBlcnJvcnNcbiAgICAgIHRoaXMubG9nRmlsZUZkID0gbnVsbDtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogRXh0cmFjdHMgc3RydWN0dXJlZCBlcnJvciBpbmZvcm1hdGlvbiBmcm9tIGFuIHVua25vd24gZXJyb3IuXG4gICAqIEBwYXJhbSBlcnJvciAtIFRoZSBlcnJvciB0byBleHRyYWN0IGluZm9ybWF0aW9uIGZyb21cbiAgICogQHJldHVybnMgU3RydWN0dXJlZCBlcnJvciBpbmZvcm1hdGlvblxuICAgKi9cbiAgcHJpdmF0ZSBleHRyYWN0RXJyb3JJbmZvKGVycm9yOiB1bmtub3duKTogTG9nRXZlbnRFcnJvciB7XG4gICAgaWYgKGVycm9yIGluc3RhbmNlb2YgRXJyb3IpIHtcbiAgICAgIGNvbnN0IGluZm86IExvZ0V2ZW50RXJyb3IgPSB7XG4gICAgICAgIG5hbWU6IGVycm9yLm5hbWUsXG4gICAgICAgIG1lc3NhZ2U6IGVycm9yLm1lc3NhZ2UsXG4gICAgICAgIHN0YWNrOiBlcnJvci5zdGFja1xuICAgICAgfTtcblxuICAgICAgLy8gRXh0cmFjdCBjYXVzZSBjaGFpbiBpZiBwcmVzZW50XG4gICAgICBpZiAoZXJyb3IuY2F1c2UgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBpbmZvLmNhdXNlID0gdGhpcy5leHRyYWN0RXJyb3JJbmZvKGVycm9yLmNhdXNlKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIGluZm87XG4gICAgfVxuXG4gICAgLy8gSGFuZGxlIG5vbi1FcnJvciB2YWx1ZXNcbiAgICByZXR1cm4ge1xuICAgICAgbmFtZTogJ1Vua25vd25FcnJvcicsXG4gICAgICBtZXNzYWdlOiBTdHJpbmcoZXJyb3IpXG4gICAgfTtcbiAgfVxufVxuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBTaW5nbGV0b24gRXhwb3J0XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbi8qKlxuICogR2xvYmFsIGxvZ2dlciBpbnN0YW5jZSBmb3IgQ2FyZHMgRXh0ZW5zaW9uIGhvb2tzLlxuICpcbiAqIFVzZSB0aGlzIHNpbmdsZXRvbiBmb3IgYWxsIGxvZ2dpbmcgd2l0aGluIGhvb2tzLiBUaGUgbG9nZ2VyIGlzIGNvbmZpZ3VyZWRcbiAqIHZpYSBlbnZpcm9ubWVudCB2YXJpYWJsZXMgYW5kIHN1cHBvcnRzIGV2ZW50IHN1YnNjcmlwdGlvbiBmb3IgY3VzdG9tXG4gKiBkZXN0aW5hdGlvbnMuXG4gKlxuICogIyMgQ29uZmlndXJhdGlvblxuICpcbiAqIHwgRW52aXJvbm1lbnQgVmFyaWFibGUgfCBEZXNjcmlwdGlvbiB8XG4gKiB8LS0tLS0tLS0tLS0tLS0tLS0tLS0tfC0tLS0tLS0tLS0tLS18XG4gKiB8IGBDQVJEU19IT09LU19MT0dfRklMRWAgfCBQYXRoIHRvIGxvZyBmaWxlIChKU09OIExpbmVzIGZvcm1hdCkgfFxuICpcbiAqICMjIFVzYWdlIGluIEhvb2tzXG4gKlxuICogVGhlIGxvZ2dlciBjYW4gYmUgdXNlZCBkaXJlY3RseSB3aXRoaW4gaG9vayBoYW5kbGVyczpcbiAqXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBpbXBvcnQgeyBsb2dnZXIgfSBmcm9tICdAY2FyZHMvc2RrL2NvbmZpZyc7XG4gKlxuICogLy8gSW4gYSBob29rIGhhbmRsZXJcbiAqIGxvZ2dlci53YXJuKCdUYXNrIHN0YXJ0aW5nIGluIGludGVyYWN0aXZlIG1vZGUnKTtcbiAqIGBgYFxuICpcbiAqICMjIEV4dGVybmFsIEludGVncmF0aW9uXG4gKlxuICogU3Vic2NyaWJlIHRvIGV2ZW50cyB0byBmb3J3YXJkIGxvZ3MgdG8gZXh0ZXJuYWwgc3lzdGVtczpcbiAqXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBpbXBvcnQgeyBsb2dnZXIgfSBmcm9tICdAY2FyZHMvc2RrL2NvbmZpZyc7XG4gKiBpbXBvcnQgcGlubyBmcm9tICdwaW5vJztcbiAqXG4gKiBjb25zdCBwaW5vTG9nZ2VyID0gcGlubyh7IGxldmVsOiAnZGVidWcnIH0pO1xuICpcbiAqIGxvZ2dlci5vbignZGVidWcnLCAoZXZlbnQpID0+IHBpbm9Mb2dnZXIuZGVidWcoZXZlbnQsIGV2ZW50Lm1lc3NhZ2UpKTtcbiAqIGxvZ2dlci5vbignaW5mbycsIChldmVudCkgPT4gcGlub0xvZ2dlci5pbmZvKGV2ZW50LCBldmVudC5tZXNzYWdlKSk7XG4gKiBsb2dnZXIub24oJ3dhcm4nLCAoZXZlbnQpID0+IHBpbm9Mb2dnZXIud2FybihldmVudCwgZXZlbnQubWVzc2FnZSkpO1xuICogbG9nZ2VyLm9uKCdlcnJvcicsIChldmVudCkgPT4gcGlub0xvZ2dlci5lcnJvcihldmVudCwgZXZlbnQubWVzc2FnZSkpO1xuICogYGBgXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogLy8gRGlyZWN0IHVzYWdlXG4gKiBpbXBvcnQgeyBsb2dnZXIgfSBmcm9tICdAY2FyZHMvc2RrL2NvbmZpZyc7XG4gKlxuICogbG9nZ2VyLmluZm8oJ1N0YXJ0aW5nIG9wZXJhdGlvbicpO1xuICogbG9nZ2VyLndhcm4oJ1Jlc291cmNlIGxpbWl0IGFwcHJvYWNoaW5nJywgeyB1c2FnZTogMC45IH0pO1xuICpcbiAqIHRyeSB7XG4gKiAgIGF3YWl0IHJpc2t5T3BlcmF0aW9uKCk7XG4gKiB9IGNhdGNoIChlcnIpIHtcbiAqICAgbG9nZ2VyLmxvZ0Vycm9yKGVyciwgJ1Jpc2t5IG9wZXJhdGlvbiBmYWlsZWQnKTtcbiAqIH1cbiAqIGBgYFxuICovXG5leHBvcnQgY29uc3QgbG9nZ2VyID0gbmV3IExvZ2dlcigpO1xuIiwgIi8qKlxuICogU29ja2V0IGNsaWVudCBmb3IgcnVudGltZS10by1kaXNwYXRjaGVyIGNvbW11bmljYXRpb24uXG4gKlxuICogQ29ubmVjdHMgdG8gYSBVbml4IGRvbWFpbiBzb2NrZXQgY3JlYXRlZCBieSBBY3Rpb25EaXNwYXRjaGVyIGFuZCBoYW5kbGVzXG4gKiBOREpTT04gKG5ld2xpbmUtZGVsaW1pdGVkIEpTT04pIHByb3RvY29sIGZvciByZWNlaXZpbmcgY29tbWFuZHMgYW5kIHNlbmRpbmdcbiAqIHJlc3BvbnNlcy5cbiAqXG4gKlxuICogQHN1bW1hcnkgU29ja2V0IGNsaWVudCBmb3IgcnVudGltZS10by1kaXNwYXRjaGVyIGNvbW11bmljYXRpb25cbiAqIEBtb2R1bGVcbiAqL1xuXG5pbXBvcnQgKiBhcyBuZXQgZnJvbSAnbm9kZTpuZXQnO1xuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBUeXBlc1xuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4vKipcbiAqIENvbW1hbmRzIHRoYXQgY2FuIGJlIHJlY2VpdmVkIGZyb20gdGhlIEFjdGlvbkRpc3BhdGNoZXIgdmlhIHNvY2tldC5cbiAqXG4gKiBVc2VzIE5ESlNPTiAobmV3bGluZS1kZWxpbWl0ZWQgSlNPTikgcHJvdG9jb2wuXG4gKi9cbmV4cG9ydCB0eXBlIFNvY2tldENvbW1hbmQgPSB7IHR5cGU6ICdjYW5jZWwnIH0gfCB7IHR5cGU6ICdzd2l0Y2hUb0ludGVyYWN0aXZlJyB9O1xuXG4vKipcbiAqIFJlc3BvbnNlIHNlbnQgYmFjayB0byB0aGUgQWN0aW9uRGlzcGF0Y2hlciB3aGVuIHN3aXRjaFRvSW50ZXJhY3RpdmUgaXMgaGFuZGxlZC5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBTd2l0Y2hUb0ludGVyYWN0aXZlUmVzcG9uc2Uge1xuICB0eXBlOiAnc3dpdGNoVG9JbnRlcmFjdGl2ZVJlc3BvbnNlJztcbiAgZGF0YTogdW5rbm93bjtcbn1cblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gU29ja2V0Q2xpZW50XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbi8qKlxuICogQ2xpZW50IGZvciB0aGUgTkRKU09OIHNvY2tldCBwcm90b2NvbCBiZXR3ZWVuIHRoZSBhY3Rpb24gcnVudGltZSBhbmRcbiAqIEFjdGlvbkRpc3BhdGNoZXIuXG4gKlxuICogUmVjZWl2ZXMgY29tbWFuZHMgKGNhbmNlbCwgc3dpdGNoVG9JbnRlcmFjdGl2ZSkgYW5kIHNlbmRzIHJlc3BvbnNlc1xuICogKHN3aXRjaFRvSW50ZXJhY3RpdmVSZXNwb25zZSkgb3ZlciBhIFVuaXggZG9tYWluIHNvY2tldC5cbiAqXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogY29uc3QgY2xpZW50ID0gYXdhaXQgU29ja2V0Q2xpZW50LmNvbm5lY3QoJy9wYXRoL3RvL3NvY2tldCcpO1xuICogY2xpZW50Lm9uQ29tbWFuZCgoY29tbWFuZCkgPT4ge1xuICogICBpZiAoY29tbWFuZC50eXBlID09PSAnY2FuY2VsJykgeyAuLi4gfVxuICogfSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNsYXNzIFNvY2tldENsaWVudCB7XG4gIHByaXZhdGUgc29ja2V0OiBuZXQuU29ja2V0O1xuICBwcml2YXRlIGJ1ZmZlciA9ICcnO1xuICBwcml2YXRlIGNvbW1hbmRIYW5kbGVyPzogKGNvbW1hbmQ6IFNvY2tldENvbW1hbmQpID0+IHZvaWQ7XG5cbiAgcHJpdmF0ZSBjb25zdHJ1Y3Rvcihzb2NrZXQ6IG5ldC5Tb2NrZXQpIHtcbiAgICB0aGlzLnNvY2tldCA9IHNvY2tldDtcblxuICAgIHNvY2tldC5vbignZGF0YScsIChjaHVuaykgPT4ge1xuICAgICAgdGhpcy5idWZmZXIgKz0gY2h1bmsudG9TdHJpbmcoKTtcbiAgICAgIC8vIFBhcnNlIE5ESlNPTiAtIHNwbGl0IGJ5IG5ld2xpbmVzXG4gICAgICBjb25zdCBsaW5lcyA9IHRoaXMuYnVmZmVyLnNwbGl0KCdcXG4nKTtcbiAgICAgIHRoaXMuYnVmZmVyID0gbGluZXMucG9wKCkgPz8gJyc7IC8vIEtlZXAgaW5jb21wbGV0ZSBsaW5lIGluIGJ1ZmZlclxuXG4gICAgICBmb3IgKGNvbnN0IGxpbmUgb2YgbGluZXMpIHtcbiAgICAgICAgaWYgKGxpbmUudHJpbSgpID09PSAnJykgY29udGludWU7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgY29uc3QgcGFyc2VkID0gSlNPTi5wYXJzZShsaW5lKSBhcyBTb2NrZXRDb21tYW5kO1xuICAgICAgICAgIHRoaXMuY29tbWFuZEhhbmRsZXI/LihwYXJzZWQpO1xuICAgICAgICB9IGNhdGNoIHtcbiAgICAgICAgICAvLyBNYWxmb3JtZWQgSlNPTiBvbiBzb2NrZXQgaXMgaWdub3JlZCAocGVyIHBsYW4pXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDb25uZWN0IHRvIGEgVW5peCBkb21haW4gc29ja2V0IGF0IHRoZSBnaXZlbiBwYXRoLlxuICAgKlxuICAgKiBAcGFyYW0gc29ja2V0UGF0aCAtIFBhdGggdG8gdGhlIFVuaXggZG9tYWluIHNvY2tldFxuICAgKiBAcmV0dXJucyBBIGNvbm5lY3RlZCBTb2NrZXRDbGllbnQgaW5zdGFuY2VcbiAgICogQHRocm93cyBFcnJvciBpZiB0aGUgY29ubmVjdGlvbiBmYWlsc1xuICAgKi9cbiAgc3RhdGljIGNvbm5lY3Qoc29ja2V0UGF0aDogc3RyaW5nKTogUHJvbWlzZTxTb2NrZXRDbGllbnQ+IHtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgY29uc3Qgc29ja2V0ID0gbmV0LmNyZWF0ZUNvbm5lY3Rpb24oc29ja2V0UGF0aCwgKCkgPT4ge1xuICAgICAgICByZXNvbHZlKG5ldyBTb2NrZXRDbGllbnQoc29ja2V0KSk7XG4gICAgICB9KTtcbiAgICAgIHNvY2tldC5vbignZXJyb3InLCByZWplY3QpO1xuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIFJlZ2lzdGVyIGEgaGFuZGxlciBmb3IgaW5jb21pbmcgc29ja2V0IGNvbW1hbmRzLlxuICAgKlxuICAgKiBPbmx5IG9uZSBoYW5kbGVyIGNhbiBiZSByZWdpc3RlcmVkIGF0IGEgdGltZS4gU3Vic2VxdWVudCBjYWxscyByZXBsYWNlXG4gICAqIHRoZSBwcmV2aW91cyBoYW5kbGVyLlxuICAgKlxuICAgKiBAcGFyYW0gaGFuZGxlciAtIEZ1bmN0aW9uIHRvIGNhbGwgd2hlbiBhIGNvbW1hbmQgaXMgcmVjZWl2ZWRcbiAgICovXG4gIG9uQ29tbWFuZChoYW5kbGVyOiAoY29tbWFuZDogU29ja2V0Q29tbWFuZCkgPT4gdm9pZCk6IHZvaWQge1xuICAgIHRoaXMuY29tbWFuZEhhbmRsZXIgPSBoYW5kbGVyO1xuICB9XG5cbiAgLyoqXG4gICAqIFNlbmQgYSByZXNwb25zZSBiYWNrIHRvIHRoZSBBY3Rpb25EaXNwYXRjaGVyLlxuICAgKlxuICAgKiBAcGFyYW0gcmVzcG9uc2UgLSBUaGUgcmVzcG9uc2UgdG8gc2VuZCBhcyBOREpTT05cbiAgICovXG4gIHNlbmRSZXNwb25zZShyZXNwb25zZTogU3dpdGNoVG9JbnRlcmFjdGl2ZVJlc3BvbnNlKTogdm9pZCB7XG4gICAgdGhpcy5zb2NrZXQud3JpdGUoYCR7SlNPTi5zdHJpbmdpZnkocmVzcG9uc2UpfVxcbmApO1xuICB9XG5cbiAgLyoqXG4gICAqIFNlbmQgYSByZXNwb25zZSBhbmQgY2FsbCBjYWxsYmFjayB3aGVuIGZsdXNoZWQuXG4gICAqXG4gICAqIFVzZWQgdG8gZ3VhcmFudGVlIGZsdXNoIGJlZm9yZSBwcm9jZXNzLmV4aXQuXG4gICAqXG4gICAqIEBwYXJhbSByZXNwb25zZSAtIFRoZSByZXNwb25zZSB0byBzZW5kIGFzIE5ESlNPTlxuICAgKiBAcGFyYW0gY2FsbGJhY2sgLSBDYWxsZWQgYWZ0ZXIgdGhlIGRhdGEgaXMgZmx1c2hlZCB0byB0aGUgc29ja2V0XG4gICAqL1xuICBzZW5kUmVzcG9uc2VUaGVuKHJlc3BvbnNlOiBTd2l0Y2hUb0ludGVyYWN0aXZlUmVzcG9uc2UsIGNhbGxiYWNrOiAoKSA9PiB2b2lkKTogdm9pZCB7XG4gICAgdGhpcy5zb2NrZXQud3JpdGUoYCR7SlNPTi5zdHJpbmdpZnkocmVzcG9uc2UpfVxcbmAsIGNhbGxiYWNrKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDbG9zZSB0aGUgc29ja2V0IGNvbm5lY3Rpb24uXG4gICAqL1xuICBjbG9zZSgpOiB2b2lkIHtcbiAgICB0aGlzLnNvY2tldC5kZXN0cm95KCk7XG4gIH1cbn1cbiIsICIvKipcbiAqIFJ1bnRpbWUgb3JjaGVzdHJhdGlvbiBmb3IgY29tcGlsZWQgQ2FyZHMgYWN0aW9uIGFuZCB0eXBlIGhhbmRsZXJzLlxuICpcbiAqIFRoaXMgbW9kdWxlIGlzIGJ1bmRsZWQgaW50byBjb21waWxlZCBoYW5kbGVycyBieSB0aGUgQ0xJLiBJdCBwcm92aWRlcyB0aGVcbiAqIGV4ZWN1dGlvbiBoYXJuZXNzIHRoYXQgcmVhZHMgaGFuZGxlciBpbnB1dCBmcm9tIGVudmlyb25tZW50IHZhcmlhYmxlcywgc2V0c1xuICogdXAgdGhlIGxvZ2dlciBjb250ZXh0LCBpbnZva2VzIHRoZSB1c2VyJ3MgaGFuZGxlciwgYW5kIGV4aXRzIHRoZSBwcm9jZXNzXG4gKiB3aXRoIHRoZSBhcHByb3ByaWF0ZSBjb2RlLlxuICpcbiAqIFRoZSBydW50aW1lIGlzIGRlc2lnbmVkIHRvIG5ldmVyIHJldHVybiBpbiBub3JtYWwgdXNlLiBBbGwgY29kZSBwYXRoc1xuICogdGVybWluYXRlIHdpdGggYHByb2Nlc3MuZXhpdCgpYC4gVGhlIG9ubHkgZXhjZXB0aW9uIGlzIHRlc3Qgc2NlbmFyaW9zXG4gKiB3aGVyZSBgcHJvY2Vzcy5leGl0YCBpcyBtb2NrZWQuXG4gKlxuICogIyMgRXhlY3V0aW9uIEZsb3dcbiAqXG4gKiAxLiBFeHRyYWN0IGlucHV0IHBheWxvYWQgZnJvbSBlbnZpcm9ubWVudCB2YXJpYWJsZXMgYmFzZWQgb24gY29tbWFuZCB0eXBlXG4gKiAyLiBTZXQgbG9nZ2VyIGNvbnRleHQgd2l0aCBjb21tYW5kIHR5cGUgYW5kIGlucHV0XG4gKiAzLiBPcHRpb25hbGx5IGNvbm5lY3QgdG8gU09DS0VUX1BBVEggZm9yIGNvbW1hbmQgZGlzcGF0Y2ggKGZhaWwtb3BlbilcbiAqIDQuIEJ1aWxkIEFjdGlvbkNvbnRleHQgd2l0aCBsb2dnZXIsIGN3ZCwgYW5kIHNvY2tldC1iYWNrZWQgY2FsbGJhY2tzXG4gKiA1LiBJbnZva2UgdGhlIGNvbW1hbmQgd2l0aCBpbnB1dCBhbmQgY29udGV4dFxuICogNi4gT24gc3VjY2VzczogY2xlYW4gdXAgc29ja2V0IGFuZCBleGl0IHdpdGggY29kZSAwXG4gKiA3LiBPbiBlcnJvcjogbG9nIGVycm9yLCB3cml0ZSB0byBzdGRlcnIsIGNsZWFuIHVwIGFuZCBleGl0IHdpdGggY29kZSAxXG4gKlxuICpcbiAqIEBzdW1tYXJ5IFJ1bnRpbWUgb3JjaGVzdHJhdGlvbiBmb3IgY29tcGlsZWQgQ2FyZHMgYWN0aW9uIGFuZCB0eXBlIGhhbmRsZXJzXG4gKiBAbW9kdWxlXG4gKiBAc2VlIHtAbGluayBleGVjdXRlQ29tbWFuZH0gZm9yIHRoZSBtYWluIGVudHJ5IHBvaW50XG4gKlxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIC8vIFRoaXMgaXMgd2hhdCBjb21waWxlZCBoYW5kbGVycyBsb29rIGxpa2UgaW50ZXJuYWxseVxuICogaW1wb3J0IHsgZXhlY3V0ZUNvbW1hbmQgfSBmcm9tICdAY2FyZHMvc2RrL2NvbmZpZy9ydW50aW1lJztcbiAqIGltcG9ydCBteUNvbW1hbmQgZnJvbSAnLi9teS1jb21tYW5kLmpzJztcbiAqXG4gKiBleGVjdXRlQ29tbWFuZChteUNvbW1hbmQpO1xuICogYGBgXG4gKi9cblxuaW1wb3J0IHR5cGUgeyBBY3Rpb25Db21tYW5kLCBUeXBlQ3JlYXRlQ29tbWFuZCwgVHlwZURlbGV0ZUNvbW1hbmQsIFR5cGVVcGRhdGVDb21tYW5kIH0gZnJvbSAnLi9jb21tYW5kLXR5cGVzLmpzJztcbmltcG9ydCB7IENBUkRTX0VOVl9WQVJTLCBleHRyYWN0QWN0aW9uSW5wdXQsIGV4dHJhY3RUeXBlSW5wdXQgfSBmcm9tICcuL2Vudi5qcyc7XG5pbXBvcnQgeyBFWElUX0NPREVTLCB3cml0ZUVycm9yIH0gZnJvbSAnLi9leGl0LWNvZGVzLmpzJztcbmltcG9ydCB0eXBlIHsgQWN0aW9uQ29udGV4dCwgQWN0aW9uSW5wdXQsIFR5cGVIb29rQ29udGV4dCwgVHlwZUhvb2tJbnB1dCB9IGZyb20gJy4vaW5wdXRzLmpzJztcbmltcG9ydCB7IGxvZ2dlciB9IGZyb20gJy4vbG9nZ2VyLmpzJztcbmltcG9ydCB0eXBlIHsgU29ja2V0Q29tbWFuZCB9IGZyb20gJy4vc29ja2V0LWNsaWVudC5qcyc7XG5pbXBvcnQgeyBTb2NrZXRDbGllbnQgfSBmcm9tICcuL3NvY2tldC1jbGllbnQuanMnO1xuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBDb21tYW5kIFR5cGUgVW5pb25cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuLyoqXG4gKiBVbmlvbiBvZiBhbGwgY29tbWFuZCB0eXBlcyBzdXBwb3J0ZWQgYnkgdGhlIHJ1bnRpbWUuXG4gKlxuICogVGhpcyB0eXBlIHVuaW9uIGFsbG93cyB7QGxpbmsgZXhlY3V0ZUNvbW1hbmR9IHRvIGFjY2VwdCBhbnkgY29tbWFuZCByZXR1cm5lZCBieVxuICogdGhlIGZhY3RvcnkgZnVuY3Rpb25zLiBUaGUgcnVudGltZSBkaXNwYXRjaGVzIGJhc2VkIG9uIHRoZSBgZmFjdG9yeVR5cGVgXG4gKiBkaXNjcmltaW5hbnQuXG4gKlxuICogTm90ZTogVHlwZVZhbGlkYXRvckNvbW1hbmQgaXMgZXhjbHVkZWQgYmVjYXVzZSB2YWxpZGF0b3JzIHVzZSBhIGRpZmZlcmVudFxuICogZXhlY3V0aW9uIG1vZGVsIChmaWxlLXBhdGggcHJvdG9jb2wgdmlhIHtAbGluayBleGVjdXRlVmFsaWRhdGlvbn0pLlxuICpcbiAqIEBpbnRlcm5hbFxuICovXG50eXBlIEFueUNvbW1hbmQgPSBBY3Rpb25Db21tYW5kIHwgVHlwZUNyZWF0ZUNvbW1hbmQgfCBUeXBlVXBkYXRlQ29tbWFuZCB8IFR5cGVEZWxldGVDb21tYW5kO1xuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBIZWxwZXIgRnVuY3Rpb25zXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbi8qKlxuICogTm9ybWFsaXplcyBhbiB1bmtub3duIGVycm9yIHZhbHVlIGludG8gYSBodW1hbi1yZWFkYWJsZSBtZXNzYWdlLlxuICpcbiAqIEVycm9ycyBpbiBKYXZhU2NyaXB0IGNhbiBiZSB0aHJvd24gd2l0aCBhbnkgdmFsdWUuIFRoaXMgZnVuY3Rpb24gZW5zdXJlc1xuICogd2UgYWx3YXlzIGdldCBhIHN0cmluZyBtZXNzYWdlIHJlZ2FyZGxlc3Mgb2Ygd2hhdCB3YXMgdGhyb3duLlxuICpcbiAqIEBwYXJhbSBlcnJvciAtIFRoZSBjYXVnaHQgZXJyb3IgdmFsdWUsIHdoaWNoIG1heSBvciBtYXkgbm90IGJlIGFuIEVycm9yIGluc3RhbmNlXG4gKiBAcmV0dXJucyBBIHN0cmluZyBtZXNzYWdlIHN1aXRhYmxlIGZvciBsb2dnaW5nIG9yIGRpc3BsYXlcbiAqXG4gKiBAaW50ZXJuYWxcbiAqL1xuZnVuY3Rpb24gZ2V0RXJyb3JNZXNzYWdlKGVycm9yOiB1bmtub3duKTogc3RyaW5nIHtcbiAgcmV0dXJuIGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogU3RyaW5nKGVycm9yKTtcbn1cblxuLyoqXG4gKiBDbGVhbnMgdXAgbG9nZ2VyIHN0YXRlIGFuZCB0ZXJtaW5hdGVzIHRoZSBwcm9jZXNzLlxuICpcbiAqIFRoaXMgZnVuY3Rpb24gbmV2ZXIgcmV0dXJucy4gSXQgY2xlYXJzIHRoZSBsb2dnZXIncyBjb250ZXh0LCBjbG9zZXNcbiAqIG9wZW4gZmlsZSBoYW5kbGVzIHRvIGZsdXNoIHBlbmRpbmcgd3JpdGVzLCBhbmQgZXhpdHMgd2l0aCB0aGUgc3BlY2lmaWVkXG4gKiBjb2RlLlxuICpcbiAqIEBwYXJhbSBleGl0Q29kZSAtIFRoZSBleGl0IGNvZGUgdG8gcGFzcyB0byBgcHJvY2Vzcy5leGl0KClgXG4gKiBAcmV0dXJucyBOZXZlciByZXR1cm5zOyBwcm9jZXNzIHRlcm1pbmF0ZXNcbiAqXG4gKiBAaW50ZXJuYWxcbiAqL1xuZnVuY3Rpb24gY2xlYW51cEFuZEV4aXQoZXhpdENvZGU6IG51bWJlcik6IG5ldmVyIHtcbiAgbG9nZ2VyLmNsZWFyQ29udGV4dCgpO1xuICBsb2dnZXIuY2xvc2UoKTtcbiAgcHJvY2Vzcy5leGl0KGV4aXRDb2RlKTtcbn1cblxuLyoqXG4gKiBIYW5kbGVzIGVycm9ycyBkdXJpbmcgZW52aXJvbm1lbnQgdmFyaWFibGUgZXh0cmFjdGlvbi5cbiAqXG4gKiBFbnZpcm9ubWVudCBleHRyYWN0aW9uIGNhbiBmYWlsIGlmIHJlcXVpcmVkIHZhcmlhYmxlcyBhcmUgbWlzc2luZyBvclxuICogbWFsZm9ybWVkLiBUaGlzIHByb3ZpZGVzIHVzZXItZnJpZW5kbHkgZXJyb3Igb3V0cHV0IGFuZCBlbnN1cmVzIHByb3BlclxuICogY2xlYW51cCBiZWZvcmUgZXhpdC5cbiAqXG4gKiBAcGFyYW0gZXJyb3IgLSBUaGUgZXJyb3IgdGhyb3duIGR1cmluZyBleHRyYWN0aW9uXG4gKiBAcmV0dXJucyBOZXZlciByZXR1cm5zOyBwcm9jZXNzIHRlcm1pbmF0ZXMgd2l0aCBlcnJvciBjb2RlXG4gKlxuICogQGludGVybmFsXG4gKi9cbmZ1bmN0aW9uIGhhbmRsZUVudkV4dHJhY3Rpb25FcnJvcihlcnJvcjogdW5rbm93bik6IG5ldmVyIHtcbiAgY29uc3QgbWVzc2FnZSA9IGdldEVycm9yTWVzc2FnZShlcnJvcik7XG4gIGxvZ2dlci5lcnJvcihgRmFpbGVkIHRvIGV4dHJhY3QgaW5wdXQgZnJvbSBlbnZpcm9ubWVudDogJHttZXNzYWdlfWApO1xuICB3cml0ZUVycm9yKGBIYW5kbGVyIGZhaWxlZDogJHttZXNzYWdlfWApO1xuICBjbGVhbnVwQW5kRXhpdChFWElUX0NPREVTLkVSUk9SKTtcbn1cblxuLyoqXG4gKiBIYW5kbGVzIGVycm9ycyB0aHJvd24gYnkgdGhlIHVzZXIncyBjb21tYW5kIGhhbmRsZXIuXG4gKlxuICogV2hlbiBhIGhhbmRsZXIgdGhyb3dzIG9yIHJlamVjdHMsIHdlIHdhbnQgdG8gcHJvdmlkZSB1c2VmdWwgZGVidWdnaW5nXG4gKiBpbmZvcm1hdGlvbi4gVGhpcyB3cml0ZXMgdGhlIGZ1bGwgc3RhY2sgdHJhY2UgdG8gc3RkZXJyICh3aGljaCB0aGVcbiAqIGV4ZWN1dGlvbiB3cmFwcGVyIGNhcHR1cmVzKSBhbmQgbG9ncyBhIHN0cnVjdHVyZWQgZXJyb3IgZXZlbnQuXG4gKlxuICogQHBhcmFtIGVycm9yIC0gVGhlIGVycm9yIHRocm93biBvciByZWplY3Rpb24gcmVhc29uIGZyb20gdGhlIGhhbmRsZXJcbiAqIEByZXR1cm5zIE5ldmVyIHJldHVybnM7IHByb2Nlc3MgdGVybWluYXRlcyB3aXRoIGVycm9yIGNvZGVcbiAqXG4gKiBAaW50ZXJuYWxcbiAqL1xuZnVuY3Rpb24gaGFuZGxlSGFuZGxlckVycm9yKGVycm9yOiB1bmtub3duKTogbmV2ZXIge1xuICBjb25zdCBlcnJvck91dHB1dCA9IGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyAoZXJyb3Iuc3RhY2sgPz8gZXJyb3IubWVzc2FnZSkgOiBTdHJpbmcoZXJyb3IpO1xuICBwcm9jZXNzLnN0ZGVyci53cml0ZShgJHtlcnJvck91dHB1dH1cXG5gKTtcbiAgbG9nZ2VyLmVycm9yKGBIYW5kbGVyIGVycm9yOiAke2dldEVycm9yTWVzc2FnZShlcnJvcil9YCk7XG4gIGNsZWFudXBBbmRFeGl0KEVYSVRfQ09ERVMuRVJST1IpO1xufVxuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBFeGVjdXRlIEZ1bmN0aW9uXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbi8qKlxuICogRXhlY3V0ZXMgYSBjb21tYW5kIGhhbmRsZXIgd2l0aCBmdWxsIHJ1bnRpbWUgb3JjaGVzdHJhdGlvbi5cbiAqXG4gKiBUaGlzIGlzIHRoZSBtYWluIGVudHJ5IHBvaW50IHRoYXQgY29tcGlsZWQgaGFuZGxlcnMgdXNlLiBUaGUgQ0xJIGdlbmVyYXRlc1xuICogd3JhcHBlciBjb2RlIHRoYXQgaW1wb3J0cyB0aGUgdXNlcidzIGNvbW1hbmQgYW5kIHBhc3NlcyBpdCB0byB0aGlzIGZ1bmN0aW9uLlxuICogRnJvbSB0aGVyZSwgZXhlY3V0ZUNvbW1hbmQgaGFuZGxlcyBhbGwgdGhlIGNlcmVtb255OiBlbnZpcm9ubWVudCBwYXJzaW5nLCBsb2dnaW5nXG4gKiBzZXR1cCwgaGFuZGxlciBpbnZvY2F0aW9uLCBlcnJvciBoYW5kbGluZywgYW5kIHByb2Nlc3MgdGVybWluYXRpb24uXG4gKlxuICogVGhlIGZ1bmN0aW9uIGV4aXRzIHRoZSBwcm9jZXNzIGluIGFsbCBub3JtYWwgY29kZSBwYXRocy4gVGhlIHJldHVybmVkXG4gKiBwcm9taXNlIG9ubHkgcmVzb2x2ZXMgaWYgYHByb2Nlc3MuZXhpdGAgaXMgbW9ja2VkLCB3aGljaCBoYXBwZW5zIGluIHRlc3RcbiAqIHNjZW5hcmlvcy4gUHJvZHVjdGlvbiBjb2RlIHNob3VsZCBub3QgYXdhaXQgdGhpcyBmdW5jdGlvbiBvciBleHBlY3QgaXRcbiAqIHRvIHJldHVybi5cbiAqXG4gKiAjIyBTdXBwb3J0ZWQgQ29tbWFuZCBUeXBlc1xuICpcbiAqIC0gKipBY3Rpb24qKiAoYGFjdGlvbmApOiBJbnZva2VkIHdoZW4gYW4gYWN0aW9uIGlzIHRyaWdnZXJlZFxuICogLSAqKlR5cGUgQ3JlYXRlKiogKGB0eXBlQ3JlYXRlYCk6IFJ1bnMgYWZ0ZXIgbmV3IHR5cGVkIGZpbGUgY3JlYXRpb25cbiAqIC0gKipUeXBlIFVwZGF0ZSoqIChgdHlwZVVwZGF0ZWApOiBSdW5zIGFmdGVyIHR5cGVkIGZpbGUgbW9kaWZpY2F0aW9uXG4gKiAtICoqVHlwZSBEZWxldGUqKiAoYHR5cGVEZWxldGVgKTogUnVucyB3aGVuIHR5cGVkIGZpbGUgaXMgZGVsZXRlZFxuICpcbiAqIE5vdGU6IFR5cGUgdmFsaWRhdG9ycyB1c2UgYSBkaWZmZXJlbnQgZXhlY3V0aW9uIG1vZGVsIChmaWxlLXBhdGggcHJvdG9jb2wpXG4gKiBhbmQgc2hvdWxkIGJlIGV4ZWN1dGVkIHZpYSB7QGxpbmsgZXhlY3V0ZVZhbGlkYXRpb259IGluc3RlYWQuXG4gKlxuICogIyMgRXJyb3IgSGFuZGxpbmdcbiAqXG4gKiBFcnJvcnMgYXJlIGhhbmRsZWQgYXQgdGhyZWUgbGV2ZWxzOlxuICpcbiAqIDEuICoqRW52aXJvbm1lbnQgZXh0cmFjdGlvbiBlcnJvcnMqKiAobWlzc2luZy9pbnZhbGlkIHZhcmlhYmxlcyk6IExvZyB0aGVcbiAqICAgIGVycm9yIGFuZCBleGl0LiBUaGVzZSBpbmRpY2F0ZSBhIHByb2JsZW0gd2l0aCBob3cgdGhlIGhhbmRsZXIgd2FzIGludm9rZWQuXG4gKlxuICogMi4gKipIYW5kbGVyIGVycm9ycyoqICh1c2VyIGNvZGUgdGhyb3dzKTogV3JpdGUgdGhlIHN0YWNrIHRyYWNlIHRvIHN0ZGVycixcbiAqICAgIGxvZyBhIHN0cnVjdHVyZWQgZXJyb3IsIGFuZCBleGl0LiBUaGUgZXhlY3V0aW9uIHdyYXBwZXIgY2FwdHVyZXMgc3RkZXJyXG4gKiAgICBmb3IgZGVidWdnaW5nLlxuICpcbiAqIDMuICoqVW5leHBlY3RlZCBlcnJvcnMqKjogQ2F0Y2gtYWxsIGZvciBhbnkgb3RoZXIgZmFpbHVyZXMgZHVyaW5nIHJ1bnRpbWVcbiAqICAgIG9yY2hlc3RyYXRpb24uXG4gKlxuICogQHBhcmFtIGNvbW1hbmQgLSBUaGUgY29tbWFuZCB0byBleGVjdXRlLCByZXR1cm5lZCBmcm9tIGEgZmFjdG9yeSBmdW5jdGlvblxuICogQHJldHVybnMgQSBwcm9taXNlIHRoYXQgcmVzb2x2ZXMgb25seSB3aGVuIGBwcm9jZXNzLmV4aXRgIGlzIG1vY2tlZCAodGVzdHMpXG4gKlxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIC8vIEdlbmVyYXRlZCB3cmFwcGVyIGNvZGUgKHByb2R1Y2VkIGJ5IENMSSlcbiAqIGltcG9ydCB7IGV4ZWN1dGVDb21tYW5kIH0gZnJvbSAnQGNhcmRzL3Nkay9jb25maWcvcnVudGltZSc7XG4gKiBpbXBvcnQgY29tbWFuZCBmcm9tICcuL3VzZXItY29tbWFuZC5qcyc7XG4gKlxuICogLy8gVGhpcyBjYWxsIG5ldmVyIHJldHVybnMgaW4gcHJvZHVjdGlvblxuICogZXhlY3V0ZUNvbW1hbmQoY29tbWFuZCk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGV4ZWN1dGVDb21tYW5kKGNvbW1hbmQ6IEFueUNvbW1hbmQpOiBQcm9taXNlPHZvaWQ+IHtcbiAgLy8gUHJldmVudCBTSUdIVVAgZnJvbSBraWxsaW5nIHRoZSBhY3Rpb24gaGFuZGxlciBiZWZvcmUgcG9zdC1leGl0IGNsZWFudXBcbiAgLy8gKGUuZy4gc3Bhd25CcmFuY2hDbGVhbnVwV2F0Y2hlcikgY2FuIHJ1bi4gV2hlbiBhIFZTQ29kZSB0ZXJtaW5hbCBjbG9zZXMsXG4gIC8vIG5vZGUtcHR5IHNlbmRzIFNJR0hVUCB0byB0aGUgcHJvY2VzcyBncm91cC4gV2l0aG91dCB0aGlzIGhhbmRsZXIsIE5vZGUuanNcbiAgLy8gdGVybWluYXRlcyBpbW1lZGlhdGVseSBhbmQgYW55IHBvc3QtZXhpdCBjb2RlIGFmdGVyIHRoZSBhd2FpdGVkIGNoaWxkXG4gIC8vIHByb2Nlc3MgbmV2ZXIgZXhlY3V0ZXMuIFRoZSBoYW5kbGVyIGlzIGEgbm8tb3A6IHRoZSBjaGlsZCBwcm9jZXNzIChlLmcuXG4gIC8vIGNsYXVkZSBDTEkpIHdpbGwgcmVjZWl2ZSBTSUdIVVAgaW5kZXBlbmRlbnRseSwgZXhpdCwgYW5kIHRoZSBhd2FpdGluZ1xuICAvLyBjb2RlIHdpbGwgcmVzdW1lIHRvIHJ1biBwb3N0LWV4aXQgY2xlYW51cC5cbiAgcHJvY2Vzcy5vbignU0lHSFVQJywgKCkgPT4ge30pO1xuXG4gIHRyeSB7XG4gICAgbGV0IGlucHV0OiBBY3Rpb25JbnB1dCB8IFR5cGVIb29rSW5wdXQ7XG5cbiAgICB0cnkge1xuICAgICAgaWYgKGNvbW1hbmQuZmFjdG9yeVR5cGUgPT09ICdhY3Rpb24nKSB7XG4gICAgICAgIGlucHV0ID0gZXh0cmFjdEFjdGlvbklucHV0KCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpbnB1dCA9IGV4dHJhY3RUeXBlSW5wdXQoKTtcbiAgICAgIH1cbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgcmV0dXJuIGhhbmRsZUVudkV4dHJhY3Rpb25FcnJvcihlcnJvcik7XG4gICAgfVxuXG4gICAgLy8gU2V0IGxvZ2dlciBjb250ZXh0IHdpdGggY29tbWFuZCB0eXBlXG4gICAgbG9nZ2VyLnNldENvbnRleHQoY29tbWFuZC5mYWN0b3J5VHlwZSwgeyAuLi5pbnB1dCB9KTtcblxuICAgIGlmIChjb21tYW5kLmZhY3RvcnlUeXBlID09PSAnYWN0aW9uJykge1xuICAgICAgLy8gU29ja2V0IGNvbm5lY3Rpb24gYW5kIEFjdGlvbkNvbnRleHQgZm9yIGFjdGlvbiBjb21tYW5kc1xuICAgICAgbGV0IHNvY2tldENsaWVudDogU29ja2V0Q2xpZW50IHwgdW5kZWZpbmVkO1xuICAgICAgY29uc3Qgc29ja2V0UGF0aCA9IHByb2Nlc3MuZW52W0NBUkRTX0VOVl9WQVJTLlNPQ0tFVF9QQVRIXTtcbiAgICAgIGlmIChzb2NrZXRQYXRoKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgc29ja2V0Q2xpZW50ID0gYXdhaXQgU29ja2V0Q2xpZW50LmNvbm5lY3Qoc29ja2V0UGF0aCk7XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgbG9nZ2VyLndhcm4oYEZhaWxlZCB0byBjb25uZWN0IHRvIHNvY2tldCBhdCAke3NvY2tldFBhdGh9OiAke2dldEVycm9yTWVzc2FnZShlcnJvcil9YCk7XG4gICAgICAgICAgLy8gRmFpbC1vcGVuOiBjb250aW51ZSB3aXRob3V0IHNvY2tldFxuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIC8vIENhbGxiYWNrIHJlZ2lzdHJhdGlvbiBzdGF0ZVxuICAgICAgbGV0IGNhbmNlbENhbGxiYWNrOiAoKCkgPT4gdm9pZCB8IFByb21pc2U8dm9pZD4pIHwgdW5kZWZpbmVkO1xuICAgICAgbGV0IHN3aXRjaFRvSW50ZXJhY3RpdmVDYWxsYmFjazogKCgpID0+IHVua25vd24gfCBQcm9taXNlPHVua25vd24+KSB8IHVuZGVmaW5lZDtcbiAgICAgIGxldCBjb21tYW5kUHJvY2Vzc2VkID0gZmFsc2U7XG5cbiAgICAgIC8vIEJ1aWxkIEFjdGlvbkNvbnRleHQgd2l0aCBsb2dnZXIsIGN3ZCwgYW5kIHNvY2tldC1iYWNrZWQgY2FsbGJhY2tzXG4gICAgICBjb25zdCBjb250ZXh0OiBBY3Rpb25Db250ZXh0ID0ge1xuICAgICAgICBsb2dnZXIsXG4gICAgICAgIGN3ZDogcHJvY2Vzcy5jd2QoKSxcbiAgICAgICAgb25DYW5jZWw6IChjYWxsYmFjaykgPT4ge1xuICAgICAgICAgIGNhbmNlbENhbGxiYWNrID0gY2FsbGJhY2s7XG4gICAgICAgIH0sXG4gICAgICAgIG9uU3dpdGNoVG9JbnRlcmFjdGl2ZTogKGNhbGxiYWNrKSA9PiB7XG4gICAgICAgICAgc3dpdGNoVG9JbnRlcmFjdGl2ZUNhbGxiYWNrID0gY2FsbGJhY2s7XG4gICAgICAgIH1cbiAgICAgIH07XG5cbiAgICAgIC8vIFdpcmUgc29ja2V0IGNvbW1hbmQgZGlzcGF0Y2hcbiAgICAgIGlmIChzb2NrZXRDbGllbnQpIHtcbiAgICAgICAgc29ja2V0Q2xpZW50Lm9uQ29tbWFuZCgoY21kOiBTb2NrZXRDb21tYW5kKSA9PiB7XG4gICAgICAgICAgLy8gRmlyc3Qtd2lucyBzZW1hbnRpY3M6IGlnbm9yZSBzdWJzZXF1ZW50IGNvbW1hbmRzXG4gICAgICAgICAgaWYgKGNvbW1hbmRQcm9jZXNzZWQpIHJldHVybjtcbiAgICAgICAgICBjb21tYW5kUHJvY2Vzc2VkID0gdHJ1ZTtcblxuICAgICAgICAgIGlmIChjbWQudHlwZSA9PT0gJ2NhbmNlbCcpIHtcbiAgICAgICAgICAgIGhhbmRsZUNhbmNlbENvbW1hbmQoY2FuY2VsQ2FsbGJhY2ssIHNvY2tldENsaWVudCk7XG4gICAgICAgICAgfSBlbHNlIGlmIChjbWQudHlwZSA9PT0gJ3N3aXRjaFRvSW50ZXJhY3RpdmUnKSB7XG4gICAgICAgICAgICBoYW5kbGVTd2l0Y2hUb0ludGVyYWN0aXZlQ29tbWFuZChzd2l0Y2hUb0ludGVyYWN0aXZlQ2FsbGJhY2ssIHNvY2tldENsaWVudCEpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIC8vIEV4ZWN1dGUgdGhlIGFjdGlvbiBjb21tYW5kIGhhbmRsZXJcbiAgICAgIHRyeSB7XG4gICAgICAgIGF3YWl0IGNvbW1hbmQoaW5wdXQgYXMgQWN0aW9uSW5wdXQsIGNvbnRleHQpO1xuICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgc29ja2V0Q2xpZW50Py5jbG9zZSgpO1xuICAgICAgICByZXR1cm4gaGFuZGxlSGFuZGxlckVycm9yKGVycm9yKTtcbiAgICAgIH1cblxuICAgICAgLy8gQ2xlYW4gdXAgc29ja2V0IGFuZCBleGl0IHN1Y2Nlc3NmdWxseVxuICAgICAgc29ja2V0Q2xpZW50Py5jbG9zZSgpO1xuICAgICAgY2xlYW51cEFuZEV4aXQoRVhJVF9DT0RFUy5TVUNDRVNTKTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gVHlwZUhvb2tDb250ZXh0IGZvciB0eXBlIGxpZmVjeWNsZSBob29rc1xuICAgICAgY29uc3QgY29udGV4dDogVHlwZUhvb2tDb250ZXh0ID0ge1xuICAgICAgICBsb2dnZXIsXG4gICAgICAgIGN3ZDogcHJvY2Vzcy5jd2QoKVxuICAgICAgfTtcblxuICAgICAgLy8gRXhlY3V0ZSB0aGUgdHlwZSBob29rIGNvbW1hbmQgaGFuZGxlclxuICAgICAgdHJ5IHtcbiAgICAgICAgYXdhaXQgY29tbWFuZChpbnB1dCBhcyBUeXBlSG9va0lucHV0LCBjb250ZXh0KTtcbiAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgIHJldHVybiBoYW5kbGVIYW5kbGVyRXJyb3IoZXJyb3IpO1xuICAgICAgfVxuXG4gICAgICBjbGVhbnVwQW5kRXhpdChFWElUX0NPREVTLlNVQ0NFU1MpO1xuICAgIH1cbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAvLyBVbmV4cGVjdGVkIGVycm9yIC0gdHJ5IHRvIGNsZWFuIHVwIGFuZCBleGl0XG4gICAgbG9nZ2VyLmVycm9yKGBVbmV4cGVjdGVkIHJ1bnRpbWUgZXJyb3I6ICR7Z2V0RXJyb3JNZXNzYWdlKGVycm9yKX1gKTtcbiAgICBjbGVhbnVwQW5kRXhpdChFWElUX0NPREVTLkVSUk9SKTtcbiAgfVxufVxuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBTb2NrZXQgQ29tbWFuZCBIYW5kbGVyc1xuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4vKipcbiAqIFJlc29sdmVzIGEgY2FsbGJhY2sgcmVzdWx0IHRoYXQgbWF5IGJlIHN5bmMgb3IgYXN5bmMgaW50byBhIFByb21pc2UuXG4gKlxuICogVXNlci1yZWdpc3RlcmVkIGNhbGxiYWNrcyBtYXkgcmV0dXJuIHZvaWQsIGEgdmFsdWUsIG9yIGEgUHJvbWlzZS5cbiAqIFRoaXMgbm9ybWFsaXplcyBhbGwgY2FzZXMgaW50byBhIHNpbmdsZSBQcm9taXNlIGZvciBjb25zaXN0ZW50IGhhbmRsaW5nLlxuICpcbiAqIEBwYXJhbSByZXN1bHQgLSBDYWxsYmFjayByZXR1cm4gdmFsdWUgdGhhdCBtYXkgYWxyZWFkeSBiZSBhIHByb21pc2UuXG4gKiBAcmV0dXJucyBQcm9taXNlIHJlc29sdmluZyB0byB0aGUgY2FsbGJhY2sgcmVzdWx0LlxuICogQGludGVybmFsXG4gKi9cbmZ1bmN0aW9uIHRvUHJvbWlzZTxUPihyZXN1bHQ6IFQgfCBQcm9taXNlPFQ+KTogUHJvbWlzZTxUPiB7XG4gIGlmIChyZXN1bHQgJiYgdHlwZW9mIChyZXN1bHQgYXMgUHJvbWlzZTxUPikudGhlbiA9PT0gJ2Z1bmN0aW9uJykge1xuICAgIHJldHVybiByZXN1bHQgYXMgUHJvbWlzZTxUPjtcbiAgfVxuICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKHJlc3VsdCk7XG59XG5cbi8qKlxuICogSGFuZGxlcyBhIGBjYW5jZWxgIGNvbW1hbmQgZnJvbSB0aGUgc29ja2V0LlxuICpcbiAqIElmIGEgY2FuY2VsIGNhbGxiYWNrIHdhcyByZWdpc3RlcmVkLCBpdCBpcyBpbnZva2VkLiBPdGhlcndpc2UsIFNJR1RFUk1cbiAqIGlzIHNlbnQgdG8gdGhlIGN1cnJlbnQgcHJvY2VzcyBhcyBhIGZhbGxiYWNrLiBBZnRlciB0aGUgY2FsbGJhY2sgY29tcGxldGVzXG4gKiAob3IgaW1tZWRpYXRlbHkgaWYgbm8gY2FsbGJhY2spLCB0aGUgcHJvY2VzcyBleGl0cyB3aXRoIGVycm9yIGNvZGUuXG4gKlxuICogQHBhcmFtIGNhbGxiYWNrIC0gVGhlIHJlZ2lzdGVyZWQgY2FuY2VsIGNhbGxiYWNrLCBpZiBhbnlcbiAqIEBwYXJhbSBzb2NrZXRDbGllbnQgLSBUaGUgc29ja2V0IGNsaWVudCB0byBjbG9zZSBiZWZvcmUgZXhpdGluZ1xuICpcbiAqIEBpbnRlcm5hbFxuICovXG5mdW5jdGlvbiBoYW5kbGVDYW5jZWxDb21tYW5kKFxuICBjYWxsYmFjazogKCgpID0+IHZvaWQgfCBQcm9taXNlPHZvaWQ+KSB8IHVuZGVmaW5lZCxcbiAgc29ja2V0Q2xpZW50OiBTb2NrZXRDbGllbnQgfCB1bmRlZmluZWRcbik6IHZvaWQge1xuICBpZiAoIWNhbGxiYWNrKSB7XG4gICAgcHJvY2Vzcy5raWxsKHByb2Nlc3MucGlkLCAnU0lHVEVSTScpO1xuICAgIHJldHVybjtcbiAgfVxuXG4gIHRvUHJvbWlzZShjYWxsYmFjaygpKS50aGVuKFxuICAgICgpID0+IHtcbiAgICAgIHNvY2tldENsaWVudD8uY2xvc2UoKTtcbiAgICAgIGNsZWFudXBBbmRFeGl0KEVYSVRfQ09ERVMuRVJST1IpO1xuICAgIH0sXG4gICAgKCkgPT4ge1xuICAgICAgc29ja2V0Q2xpZW50Py5jbG9zZSgpO1xuICAgICAgY2xlYW51cEFuZEV4aXQoRVhJVF9DT0RFUy5FUlJPUik7XG4gICAgfVxuICApO1xufVxuXG4vKipcbiAqIEhhbmRsZXMgYSBgc3dpdGNoVG9JbnRlcmFjdGl2ZWAgY29tbWFuZCBmcm9tIHRoZSBzb2NrZXQuXG4gKlxuICogSWYgbm8gY2FsbGJhY2sgd2FzIHJlZ2lzdGVyZWQsIHRoZSBjb21tYW5kIGlzIGlnbm9yZWQgKG5vLW9wKS4gT3RoZXJ3aXNlLFxuICogdGhlIGNhbGxiYWNrIGlzIGludm9rZWQgYW5kIGl0cyByZXR1cm4gdmFsdWUgaXMgc2VudCBhc1xuICogYHN3aXRjaFRvSW50ZXJhY3RpdmVSZXNwb25zZWAgb24gdGhlIHNvY2tldC4gYHByb2Nlc3MuZXhpdCg0MilgIGlzIGNhbGxlZFxuICogaW5zaWRlIHRoZSBgd3JpdGUoKWAgY2FsbGJhY2sgdG8gZ3VhcmFudGVlIHRoZSByZXNwb25zZSBpcyBmbHVzaGVkIGJlZm9yZVxuICogdGhlIGV2ZW50IGxvb3AgdGVhcnMgZG93bi5cbiAqXG4gKiBAcGFyYW0gY2FsbGJhY2sgLSBUaGUgcmVnaXN0ZXJlZCBzd2l0Y2hUb0ludGVyYWN0aXZlIGNhbGxiYWNrLCBpZiBhbnlcbiAqIEBwYXJhbSBzb2NrZXRDbGllbnQgLSBUaGUgc29ja2V0IGNsaWVudCB1c2VkIHRvIHNlbmQgdGhlIHJlc3BvbnNlXG4gKlxuICogQGludGVybmFsXG4gKi9cbmZ1bmN0aW9uIGhhbmRsZVN3aXRjaFRvSW50ZXJhY3RpdmVDb21tYW5kKFxuICBjYWxsYmFjazogKCgpID0+IHVua25vd24gfCBQcm9taXNlPHVua25vd24+KSB8IHVuZGVmaW5lZCxcbiAgc29ja2V0Q2xpZW50OiBTb2NrZXRDbGllbnRcbik6IHZvaWQge1xuICBpZiAoIWNhbGxiYWNrKSB7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgdG9Qcm9taXNlKGNhbGxiYWNrKCkpLnRoZW4oXG4gICAgKGRhdGEpID0+IHtcbiAgICAgIHNvY2tldENsaWVudC5zZW5kUmVzcG9uc2VUaGVuKHsgdHlwZTogJ3N3aXRjaFRvSW50ZXJhY3RpdmVSZXNwb25zZScsIGRhdGEgfSwgKCkgPT4ge1xuICAgICAgICBjbGVhbnVwQW5kRXhpdChFWElUX0NPREVTLlNXSVRDSF9UT19JTlRFUkFDVElWRSk7XG4gICAgICB9KTtcbiAgICB9LFxuICAgIChlcnJvcikgPT4ge1xuICAgICAgbG9nZ2VyLmVycm9yKGBzd2l0Y2hUb0ludGVyYWN0aXZlIGNhbGxiYWNrIGVycm9yOiAke2dldEVycm9yTWVzc2FnZShlcnJvcil9YCk7XG4gICAgICBzb2NrZXRDbGllbnQuY2xvc2UoKTtcbiAgICAgIGNsZWFudXBBbmRFeGl0KEVYSVRfQ09ERVMuRVJST1IpO1xuICAgIH1cbiAgKTtcbn1cbiIsICIvKipcbiAqIFNoYXJlZCBzZXNzaW9uIHV0aWxpdGllcyBmb3IgQ2xhdWRlIENvZGUgYWN0aW9uIHdvcmtmbG93cy5cbiAqXG4gKiBQcm92aWRlcyByZXVzYWJsZSBidWlsZGluZyBibG9ja3MgZm9yIGFjdGlvbnMgdGhhdCBzcGF3biB0aGUgYGNsYXVkZWAgQ0xJOlxuICogcGx1Z2luIHNldHRpbmdzIGNvbnN0cnVjdGlvbiwgQ0xJIGFyZyBidWlsZGluZywgd29ya3RyZWUgbGlmZWN5Y2xlIG1hbmFnZW1lbnQsXG4gKiBhbmQgYnJhbmNoIGNsZWFudXAuIEJvdGggdGhlIGBsYXVuY2hgIGFuZCBgaW50ZXJ2aWV3YCBhY3Rpb25zIGNvbnN1bWUgdGhlc2VcbiAqIHV0aWxpdGllcy5cbiAqXG4gKiBAc3VtbWFyeSBTaGFyZWQgc2Vzc2lvbiB1dGlsaXRpZXMgZm9yIENsYXVkZSBDb2RlIGFjdGlvbiB3b3JrZmxvd3NcbiAqIEBtb2R1bGVcbiAqL1xuXG5pbXBvcnQgeyB0eXBlIENoaWxkUHJvY2VzcywgZXhlY0ZpbGUsIHNwYXduIH0gZnJvbSAnbm9kZTpjaGlsZF9wcm9jZXNzJztcbmltcG9ydCAqIGFzIGZzIGZyb20gJ25vZGU6ZnMvcHJvbWlzZXMnO1xuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdub2RlOnBhdGgnO1xuaW1wb3J0IHsgcHJvbWlzaWZ5IH0gZnJvbSAnbm9kZTp1dGlsJztcbmltcG9ydCB7IENhcmRzQ2xpZW50IH0gZnJvbSAnQGNhcmRzL3Nkay9jbGllbnQnO1xuaW1wb3J0IHsgdHlwZSBBY3Rpb25Db250ZXh0LCB0eXBlIEFjdGlvbklucHV0LCBDQVJEU19FTlZfVkFSUyB9IGZyb20gJ0BjYXJkcy9zZGsvY29uZmlnJztcbmltcG9ydCB7IHJlc29sdmVDbGF1ZGVDb25maWdEaXIsIHVwZGF0ZU1hcmtldHBsYWNlUmVnaXN0cmF0aW9uIH0gZnJvbSAnQGNhcmRzL3Nkay9tYXJrZXRwbGFjZSc7XG5leHBvcnQgeyByZXNvbHZlQ2xhdWRlQ29uZmlnRGlyLCB1cGRhdGVNYXJrZXRwbGFjZVJlZ2lzdHJhdGlvbiB9O1xuXG5pbXBvcnQgeyBjaGVja1dvcmt0cmVlRXhpc3RzLCBjcmVhdGVXb3JrdHJlZSwgZmluZEdpdFJvb3RzIH0gZnJvbSAnQGNhcmRzL3Nkay93b3JrdHJlZSc7XG5pbXBvcnQgeyBzcGF3bkJyYW5jaENsZWFudXBXYXRjaGVyIH0gZnJvbSAnLi9icmFuY2gtY2xlYW51cC13YXRjaGVyLmpzJztcblxuY29uc3QgZXhlY0ZpbGVBc3luYyA9IHByb21pc2lmeShleGVjRmlsZSk7XG5cbi8qKlxuICogRXh0cmFjdHMgYSBodW1hbi1yZWFkYWJsZSBtZXNzYWdlIGZyb20gYW4gdW5rbm93biBjYXRjaCB2YWx1ZS5cbiAqIEBwYXJhbSBlcnJvciAtIFRoZSBjYXVnaHQgdmFsdWUgdG8gZXh0cmFjdCBhIG1lc3NhZ2UgZnJvbS5cbiAqIEByZXR1cm5zIFRoZSBlcnJvciBtZXNzYWdlIHN0cmluZy5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGVycm9yTWVzc2FnZShlcnJvcjogdW5rbm93bik6IHN0cmluZyB7XG4gIHJldHVybiBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6IFN0cmluZyhlcnJvcik7XG59XG5cbi8qKlxuICogUmVzb2x2ZXMgdGhlIG1hcmtldHBsYWNlIGRpcmVjdG9yeSBidW5kbGVkIHdpdGggdGhlIGluc3RhbGxlZCBleHRlbnNpb24uXG4gKiBVc2VzIHRoZSBFWFRFTlNJT05fUEFUSCBlbnZpcm9ubWVudCB2YXJpYWJsZSBpbmplY3RlZCBieSBBY3Rpb25EaXNwYXRjaGVyLlxuICpcbiAqIEByZXR1cm5zIEFic29sdXRlIHBhdGggdG8gdGhlIGJ1bmRsZWQgbWFya2V0cGxhY2UgZGlyZWN0b3J5LlxuICogQHRocm93cyBFcnJvciBpZiBFWFRFTlNJT05fUEFUSCBpcyBub3Qgc2V0LlxuICovXG5leHBvcnQgZnVuY3Rpb24gcmVzb2x2ZU1hcmtldHBsYWNlUGF0aCgpOiBzdHJpbmcge1xuICBjb25zdCBleHRlbnNpb25QYXRoID0gcHJvY2Vzcy5lbnZbQ0FSRFNfRU5WX1ZBUlMuRVhURU5TSU9OX1BBVEhdO1xuICBpZiAoIWV4dGVuc2lvblBhdGgpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYE1pc3NpbmcgcmVxdWlyZWQgZW52aXJvbm1lbnQgdmFyaWFibGU6ICR7Q0FSRFNfRU5WX1ZBUlMuRVhURU5TSU9OX1BBVEh9YCk7XG4gIH1cbiAgcmV0dXJuIHBhdGguam9pbihleHRlbnNpb25QYXRoLCAnZGlzdCcsICdtYXJrZXRwbGFjZScpO1xufVxuXG4vKipcbiAqIEJ1aWxkcyB0aGUgYC0tc2V0dGluZ3NgIEpTT04gdGhhdCBlbmFibGVzIHRoZSBgcnVudGltZWAgcGx1Z2luIGFuZCByZWdpc3RlcnNcbiAqIHRoZSBgY2FyZHMubWFuYWdlbWVudGAgbWFya2V0cGxhY2Ugc291cmNlIHNvIHRoZSBzcGF3bmVkIGBjbGF1ZGVgIHByb2Nlc3NcbiAqIGNhbiByZXNvbHZlIHRoZSBwbHVnaW4gZnJvbSB0aGUgZXh0ZW5zaW9uJ3MgYnVuZGxlZCBtYXJrZXRwbGFjZS5cbiAqXG4gKiBVc2VzIHRoZSBtYXJrZXRwbGFjZSBidW5kbGVkIGluc2lkZSB0aGUgZXh0ZW5zaW9uIGluc3RhbGwgZGlyZWN0b3J5XG4gKiAoYDxFWFRFTlNJT05fUEFUSD4vZGlzdC9tYXJrZXRwbGFjZWApIHNvIHRoZSBzcGF3bmVkIHNlc3Npb24gYWx3YXlzIGxvYWRzIHRoZVxuICogcGx1Z2luIHZlcnNpb24gdGhhdCBzaGlwcGVkIHdpdGggdGhlIGV4dGVuc2lvbiwgcmVnYXJkbGVzcyBvZiB3b3JrdHJlZSBzdGF0ZS5cbiAqXG4gKiBAcGFyYW0gbWFya2V0cGxhY2VQYXRoIC0gQWJzb2x1dGUgcGF0aCB0byB0aGUgYnVuZGxlZCBtYXJrZXRwbGFjZSBkaXJlY3RvcnkuXG4gKiBAcmV0dXJucyBTZXJpYWxpc2VkIHNldHRpbmdzIEpTT04gc3RyaW5nLlxuICovXG5leHBvcnQgZnVuY3Rpb24gYnVpbGRQbHVnaW5TZXR0aW5ncyhtYXJrZXRwbGFjZVBhdGg6IHN0cmluZyk6IHN0cmluZyB7XG4gIHJldHVybiBKU09OLnN0cmluZ2lmeSh7XG4gICAgZW5hYmxlZFBsdWdpbnM6IHsgJ3J1bnRpbWVAY2FyZHMubWFuYWdlbWVudCc6IHRydWUgfSxcbiAgICBleHRyYUtub3duTWFya2V0cGxhY2VzOiB7XG4gICAgICAnY2FyZHMubWFuYWdlbWVudCc6IHtcbiAgICAgICAgc291cmNlOiB7IHNvdXJjZTogJ2RpcmVjdG9yeScsIHBhdGg6IG1hcmtldHBsYWNlUGF0aCB9XG4gICAgICB9XG4gICAgfVxuICB9KTtcbn1cblxuLyoqXG4gKiBCdWlsZHMgdGhlIENMSSBhcmd1bWVudCBsaXN0IGZvciB0aGUgYGNsYXVkZWAgcHJvY2Vzcy5cbiAqXG4gKiBAcGFyYW0gcHJvbXB0IC0gVGhlIHByb21wdCBzdHJpbmcgZm9yIG5ldyBzZXNzaW9ucy5cbiAqIEBwYXJhbSBzZXNzaW9uSWQgLSBTZXNzaW9uIGlkZW50aWZpZXIgKHVzZWQgZm9yIGAtLXNlc3Npb24taWRgIG9yIGAtLXJlc3VtZWApLlxuICogQHBhcmFtIHJlc3VtZSAtIFdoZW4gdHJ1ZSwgcGFzc2VzIGAtLXJlc3VtZWAgaW5zdGVhZCBvZiBzdGFydGluZyBhIG5ldyBzZXNzaW9uLlxuICogQHBhcmFtIG1vZGUgLSBFeGVjdXRpb24gbW9kZTsgYCdiYWNrZ3JvdW5kJ2AgYXBwZW5kcyBgLS1wcmludGAuXG4gKiBAcGFyYW0gY2FyZFJlcG9QYXRoIC0gQWJzb2x1dGUgcGF0aCBwYXNzZWQgdmlhIGAtLWFkZC1kaXJgLlxuICogQHBhcmFtIG1hcmtldHBsYWNlUGF0aCAtIEFic29sdXRlIHBhdGggdG8gdGhlIGJ1bmRsZWQgbWFya2V0cGxhY2UgZGlyZWN0b3J5LlxuICogQHJldHVybnMgQXJyYXkgb2YgQ0xJIGFyZ3VtZW50cy5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGJ1aWxkQXJncyhcbiAgcHJvbXB0OiBzdHJpbmcsXG4gIHNlc3Npb25JZDogc3RyaW5nLFxuICByZXN1bWU6IGJvb2xlYW4sXG4gIG1vZGU6IEFjdGlvbklucHV0WydleGVjdXRpb25Nb2RlJ10sXG4gIGNhcmRSZXBvUGF0aDogc3RyaW5nLFxuICBtYXJrZXRwbGFjZVBhdGg6IHN0cmluZ1xuKTogc3RyaW5nW10ge1xuICBjb25zdCBhcmdzOiBzdHJpbmdbXSA9IFtdO1xuXG4gIGlmIChyZXN1bWUpIHtcbiAgICBhcmdzLnB1c2goJy0tcmVzdW1lJywgc2Vzc2lvbklkKTtcbiAgfSBlbHNlIHtcbiAgICBhcmdzLnB1c2gocHJvbXB0KTtcbiAgICBhcmdzLnB1c2goJy0tc2Vzc2lvbi1pZCcsIHNlc3Npb25JZCk7XG4gIH1cbiAgYXJncy5wdXNoKCctLXNldHRpbmdzJywgYnVpbGRQbHVnaW5TZXR0aW5ncyhtYXJrZXRwbGFjZVBhdGgpKTtcbiAgYXJncy5wdXNoKCctLWFkZC1kaXInLCBjYXJkUmVwb1BhdGgpO1xuICBpZiAobW9kZSA9PT0gJ2JhY2tncm91bmQnKSB7XG4gICAgYXJncy5wdXNoKCctLXByaW50Jyk7XG4gIH1cblxuICByZXR1cm4gYXJncztcbn1cblxuLyoqXG4gKiBFeHRyYWN0cyB0aGUgY2FyZCBJRCBmcm9tIGEgYGNhcmRzLzxjYXJkSWQ+LzxuPmAgYnJhbmNoIG5hbWUuXG4gKlxuICogQHBhcmFtIGJyYW5jaE5hbWUgLSBCcmFuY2ggbmFtZSB0byBwYXJzZS5cbiAqIEByZXR1cm5zIFRoZSBjYXJkIElELCBvciBgbnVsbGAgaWYgdGhlIGJyYW5jaCBkb2Vzbid0IG1hdGNoIHRoZSBwYXR0ZXJuLlxuICovXG5mdW5jdGlvbiBjYXJkSWRGcm9tQnJhbmNoKGJyYW5jaE5hbWU6IHN0cmluZyk6IHN0cmluZyB8IG51bGwge1xuICBjb25zdCBtYXRjaCA9IGJyYW5jaE5hbWUubWF0Y2goL15jYXJkc1xcLyguKylcXC9cXGQrJC8pO1xuICByZXR1cm4gbWF0Y2g/LlsxXSA/PyBudWxsO1xufVxuXG4vKipcbiAqIFJlc29sdmVzIHRoZSBiYXNlIGJyYW5jaCBmb3IgdGhlIHdvcmtzcGFjZSwgZm9sbG93aW5nIHRoZSBgcGFyZW50QnJhbmNoYFxuICogY2hhaW4gd2hlbiBIRUFEIGlzIGEgYGNhcmRzLypgIHdvcmt0cmVlIGJyYW5jaC5cbiAqXG4gKiBDYXJkIGJyYW5jaGVzIGFyZSBlcGhlbWVyYWwgYW5kIG5vdCB2YWxpZCBtZXJnZSB0YXJnZXRzLiBXaGVuIHRoZSB3b3Jrc3BhY2VcbiAqIEhFQUQgaGFwcGVucyB0byBiZSBvbiBvbmUgKGUuZy4sIHRoZSBtYWluIGNoZWNrb3V0IHdhcyBsZWZ0IG9uIGEgY2FyZFxuICogYnJhbmNoKSwgdGhpcyBmdW5jdGlvbiBxdWVyaWVzIHRoZSBBUEkgZm9yIHRoYXQgYnJhbmNoJ3MgYHBhcmVudEJyYW5jaGBcbiAqIGFuZCByZWN1cnNlcyB1bnRpbCBpdCBmaW5kcyBhIG5vbi1gY2FyZHMvKmAgYnJhbmNoLlxuICpcbiAqIEBwYXJhbSB3b3Jrc3BhY2VQYXRoIC0gRGlyZWN0b3J5IHdoZXJlIGBnaXQgcmV2LXBhcnNlYCBydW5zLlxuICogQHBhcmFtIGNsaWVudCAtIENhcmRzIEFQSSBjbGllbnQgZm9yIHJlc29sdmluZyBwYXJlbnRCcmFuY2ggb2YgY2FyZCBicmFuY2hlcy5cbiAqIEByZXR1cm5zIFRoZSBmaXJzdCBub24tYGNhcmRzLypgIGJyYW5jaCBpbiB0aGUgcGFyZW50IGNoYWluLlxuICogQHRocm93cyBFcnJvciBpZiB0aGUgcGFyZW50IGNoYWluIGNhbm5vdCBiZSByZXNvbHZlZCAobWlzc2luZyBBUEkgcmVjb3JkcywgY3ljbGVzKS5cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHJlc29sdmVCYXNlQnJhbmNoKHdvcmtzcGFjZVBhdGg6IHN0cmluZywgY2xpZW50PzogQ2FyZHNDbGllbnQpOiBQcm9taXNlPHN0cmluZz4ge1xuICBjb25zdCB7IHN0ZG91dCB9ID0gYXdhaXQgZXhlY0ZpbGVBc3luYygnZ2l0JywgWydyZXYtcGFyc2UnLCAnLS1hYmJyZXYtcmVmJywgJ0hFQUQnXSwge1xuICAgIGN3ZDogd29ya3NwYWNlUGF0aFxuICB9KTtcbiAgbGV0IGJyYW5jaCA9IHN0ZG91dC50cmltKCk7XG5cbiAgY29uc3QgdmlzaXRlZCA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuICB3aGlsZSAoYnJhbmNoLnN0YXJ0c1dpdGgoJ2NhcmRzLycpKSB7XG4gICAgaWYgKHZpc2l0ZWQuaGFzKGJyYW5jaCkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgQ2lyY3VsYXIgcGFyZW50QnJhbmNoIGNoYWluIGRldGVjdGVkOiAke1suLi52aXNpdGVkLCBicmFuY2hdLmpvaW4oJyBcdTIxOTIgJyl9YCk7XG4gICAgfVxuICAgIHZpc2l0ZWQuYWRkKGJyYW5jaCk7XG5cbiAgICBjb25zdCBjYXJkSWQgPSBjYXJkSWRGcm9tQnJhbmNoKGJyYW5jaCk7XG4gICAgaWYgKCFjYXJkSWQgfHwgIWNsaWVudCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICBgV29ya3NwYWNlIEhFQUQgaXMgb24gY2FyZCBicmFuY2ggXCIke2JyYW5jaH1cIiBidXQgY2Fubm90IHJlc29sdmUgaXRzIHBhcmVudC4gYCArXG4gICAgICAgICAgJ1N3aXRjaCB0aGUgbWFpbiBjaGVja291dCB0byBhIG5vbi1jYXJkIGJyYW5jaCAoZS5nLiwgbWFpbikuJ1xuICAgICAgKTtcbiAgICB9XG5cbiAgICBjb25zdCB7IGJyYW5jaGVzIH0gPSBhd2FpdCBjbGllbnQuZ2V0QnJhbmNoZXMoY2FyZElkLCB7IHdvcmtzcGFjZVBhdGggfSk7XG4gICAgY29uc3QgcmVjb3JkID0gYnJhbmNoZXMuZmluZCgoYikgPT4gYi5uYW1lID09PSBicmFuY2gpO1xuICAgIGlmICghcmVjb3JkPy5wYXJlbnRCcmFuY2gpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgYENhcmQgYnJhbmNoIFwiJHticmFuY2h9XCIgaGFzIG5vIHBhcmVudEJyYW5jaCByZWNvcmQuIGAgK1xuICAgICAgICAgICdTd2l0Y2ggdGhlIG1haW4gY2hlY2tvdXQgdG8gYSBub24tY2FyZCBicmFuY2ggKGUuZy4sIG1haW4pLidcbiAgICAgICk7XG4gICAgfVxuXG4gICAgYnJhbmNoID0gcmVjb3JkLnBhcmVudEJyYW5jaDtcbiAgfVxuXG4gIHJldHVybiBicmFuY2g7XG59XG5cbi8qKlxuICogQ2hlY2tzIHdoZXRoZXIgYSB3b3JrdHJlZSBwYXRoIGV4aXN0cyBvbiBkaXNrLlxuICpcbiAqIEBwYXJhbSB3b3JrdHJlZVBhdGggLSBBYnNvbHV0ZSBwYXRoIHRvIHRlc3QuXG4gKiBAcmV0dXJucyBUcnVlIHdoZW4gdGhlIHBhdGggaXMgYWNjZXNzaWJsZS5cbiAqL1xuYXN5bmMgZnVuY3Rpb24gd29ya3RyZWVFeGlzdHNPbkRpc2sod29ya3RyZWVQYXRoOiBzdHJpbmcpOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgdHJ5IHtcbiAgICBhd2FpdCBmcy5hY2Nlc3Mod29ya3RyZWVQYXRoKTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSBjYXRjaCB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG59XG5cbi8qKlxuICogRmluZHMgb3IgY3JlYXRlcyBhIHdvcmt0cmVlIGZvciB0aGUgY2FyZC5cbiAqXG4gKiBUcmllcyB0byByZXVzZSBhbiBleGlzdGluZyBicmFuY2ggd2hvc2Ugd29ya3RyZWUgaXMgc3RpbGwgb24gZGlzay4gV2hlbiBub1xuICogdmFsaWQgYnJhbmNoIGV4aXN0cywgY3JlYXRlcyBhIG5ldyBvbmUgYW5kIHJlZ2lzdGVycyBpdCB3aXRoIHRoZSBBUEkuXG4gKlxuICogQHBhcmFtIGlucHV0IC0gQWN0aW9uIGlucHV0IGNvbnRhaW5pbmcgY2FyZElkIGFuZCB3b3Jrc3BhY2UgcGF0aHMuXG4gKiBAcGFyYW0gY2xpZW50IC0gQ2FyZHMgQVBJIGNsaWVudCBmb3IgYnJhbmNoIENSVUQuXG4gKiBAcGFyYW0gYmFzZUJyYW5jaCAtIEN1cnJlbnQgYnJhbmNoIGluIHRoZSB3b3Jrc3BhY2UgKHVzZWQgYXMgcGFyZW50KS5cbiAqIEBwYXJhbSBsb2dnZXIgLSBMb2dnZXIgZm9yIGRpYWdub3N0aWMgb3V0cHV0LlxuICogQHBhcmFtIHNlc3Npb25JZCAtIENsYXVkZSBDb2RlIHNlc3Npb24gSUQgZm9yd2FyZGVkIHRvIHRoZSBBUEkgc28gdGhlIGNhcmQgcmVwbyBwb3N0LWNvbW1pdCBob29rIGNhbiBhdHRyaWJ1dGUgdGhlIGNvbW1pdC5cbiAqIEByZXR1cm5zIFdvcmt0cmVlIHBhdGgsIGJyYW5jaCBuYW1lLCBhbmQgcGFyZW50IGJyYW5jaCBuYW1lLlxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcmVzb2x2ZU9yQ3JlYXRlV29ya3RyZWUoXG4gIGlucHV0OiBBY3Rpb25JbnB1dCxcbiAgY2xpZW50OiBDYXJkc0NsaWVudCxcbiAgYmFzZUJyYW5jaDogc3RyaW5nLFxuICBsb2dnZXI6IEFjdGlvbkNvbnRleHRbJ2xvZ2dlciddLFxuICBzZXNzaW9uSWQ/OiBzdHJpbmdcbik6IFByb21pc2U8eyB3b3JrdHJlZVBhdGg6IHN0cmluZzsgYnJhbmNoTmFtZTogc3RyaW5nOyBwYXJlbnRCcmFuY2g6IHN0cmluZyB9PiB7XG4gIGNvbnN0IHsgYnJhbmNoZXMgfSA9IGF3YWl0IGNsaWVudC5nZXRCcmFuY2hlcyhpbnB1dC5jYXJkSWQsIHsgd29ya3NwYWNlUGF0aDogaW5wdXQucmVwb1Jvb3QgfSk7XG5cbiAgLy8gU3RlcCAxOiBUcnkgdG8gcmV1c2UgYW4gZXhpc3RpbmcgYnJhbmNoIHdpdGggYSB2YWxpZCB3b3JrdHJlZSBvbiBkaXNrXG4gIGZvciAoY29uc3QgYnJhbmNoIG9mIGJyYW5jaGVzKSB7XG4gICAgaWYgKCFicmFuY2guZXhpc3RzIHx8ICFicmFuY2gud29ya3RyZWUpIGNvbnRpbnVlO1xuICAgIGlmICghKGF3YWl0IHdvcmt0cmVlRXhpc3RzT25EaXNrKGJyYW5jaC53b3JrdHJlZSkpKSBjb250aW51ZTtcblxuICAgIGxvZ2dlci5pbmZvKCdSZXVzaW5nIGV4aXN0aW5nIHdvcmt0cmVlJywgeyBicmFuY2g6IGJyYW5jaC5uYW1lLCB3b3JrdHJlZTogYnJhbmNoLndvcmt0cmVlIH0pO1xuICAgIHJldHVybiB7IHdvcmt0cmVlUGF0aDogYnJhbmNoLndvcmt0cmVlLCBicmFuY2hOYW1lOiBicmFuY2gubmFtZSwgcGFyZW50QnJhbmNoOiBicmFuY2gucGFyZW50QnJhbmNoIH07XG4gIH1cblxuICAvLyBTdGVwIDI6IFRyeSB0byBjcmVhdGUgYSB3b3JrdHJlZSBmb3IgYW4gZXhpc3RpbmcgYnJhbmNoIHdob3NlIHdvcmt0cmVlXG4gIC8vIGlzIG1pc3NpbmcgZnJvbSBkaXNrIChlLmcuIGNsZWFuZWQgdXAgYnkgYSBwcmV2aW91cyBzZXNzaW9uIGNyYXNoKS5cbiAgZm9yIChjb25zdCBicmFuY2ggb2YgYnJhbmNoZXMpIHtcbiAgICBpZiAoIWJyYW5jaC5leGlzdHMpIGNvbnRpbnVlO1xuICAgIGlmICghYnJhbmNoLm5hbWUuc3RhcnRzV2l0aChgY2FyZHMvJHtpbnB1dC5jYXJkSWR9L2ApKSBjb250aW51ZTtcblxuICAgIGxvZ2dlci5pbmZvKCdSZWF0dGFjaGluZyB3b3JrdHJlZSBmb3IgZXhpc3RpbmcgYnJhbmNoJywgeyBicmFuY2g6IGJyYW5jaC5uYW1lIH0pO1xuICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGNyZWF0ZVdvcmt0cmVlKGJyYW5jaC5uYW1lLCB7IGN3ZDogaW5wdXQucmVwb1Jvb3QgfSk7XG5cbiAgICAvLyBVcGRhdGUgdGhlIEFQSSByZWNvcmQgd2l0aCB0aGUgbmV3IHdvcmt0cmVlIHBhdGhcbiAgICBhd2FpdCBjbGllbnQuYWRkQnJhbmNoKFxuICAgICAgaW5wdXQuY2FyZElkLFxuICAgICAgeyBuYW1lOiBicmFuY2gubmFtZSwgd29ya3RyZWU6IHJlc3VsdC53b3JrdHJlZSwgcGFyZW50QnJhbmNoOiBicmFuY2gucGFyZW50QnJhbmNoIH0sXG4gICAgICB7IHNlc3Npb25JZCB9XG4gICAgKTtcblxuICAgIHJldHVybiB7IHdvcmt0cmVlUGF0aDogcmVzdWx0Lndvcmt0cmVlLCBicmFuY2hOYW1lOiBicmFuY2gubmFtZSwgcGFyZW50QnJhbmNoOiBicmFuY2gucGFyZW50QnJhbmNoIH07XG4gIH1cblxuICAvLyBTdGVwIDM6IE5vIHZhbGlkIGV4aXN0aW5nIGJyYW5jaCBcdTIwMTQgY3JlYXRlIG5ldyBvbmUuXG4gIC8vIFRoZSBBUEkgbWF5IGJlIG91dCBvZiBzeW5jIHdpdGggZ2l0IChlLmcuIGEgcHJldmlvdXMgd29ya3RyZWUgd2FzIGNyZWF0ZWRcbiAgLy8gYnV0IG5ldmVyIHJlZ2lzdGVyZWQsIG9yIGl0cyBBUEkgcmVjb3JkIHdhcyBkZWxldGVkKS4gVG8gYXZvaWQgY29sbGlkaW5nXG4gIC8vIHdpdGggd29ya3RyZWVzIGdpdCBhbHJlYWR5IGtub3dzIGFib3V0LCBwcm9iZSBnaXQncyBhY3R1YWwgc3RhdGUgYW5kXG4gIC8vIGluY3JlbWVudCBwYXN0IGFueSBvY2N1cGllZCBzbG90cy5cbiAgY29uc3QgcHJlZml4ID0gYGNhcmRzLyR7aW5wdXQuY2FyZElkfS9gO1xuICBjb25zdCBleGlzdGluZ051bWJlcnMgPSBicmFuY2hlc1xuICAgIC5maWx0ZXIoKGIpID0+IGIubmFtZS5zdGFydHNXaXRoKHByZWZpeCkpXG4gICAgLm1hcCgoYikgPT4gcGFyc2VJbnQoYi5uYW1lLnNsaWNlKHByZWZpeC5sZW5ndGgpLCAxMCkpXG4gICAgLmZpbHRlcigobikgPT4gIU51bWJlci5pc05hTihuKSk7XG4gIGxldCBuZXh0TnVtYmVyID0gZXhpc3RpbmdOdW1iZXJzLmxlbmd0aCA+IDAgPyBNYXRoLm1heCguLi5leGlzdGluZ051bWJlcnMpICsgMSA6IDE7XG5cbiAgY29uc3QgeyByZXBvUm9vdCB9ID0gYXdhaXQgZmluZEdpdFJvb3RzKGlucHV0LnJlcG9Sb290KTtcbiAgd2hpbGUgKGF3YWl0IGNoZWNrV29ya3RyZWVFeGlzdHMocmVwb1Jvb3QsIHBhdGguam9pbihyZXBvUm9vdCwgJy53b3JrdHJlZXMnLCBgJHtwcmVmaXh9JHtuZXh0TnVtYmVyfWApKSkge1xuICAgIGxvZ2dlci53YXJuKCdXb3JrdHJlZSBhbHJlYWR5IGV4aXN0cyBpbiBnaXQgYnV0IG5vdCBpbiBBUEksIHNraXBwaW5nJywge1xuICAgICAgYnJhbmNoOiBgJHtwcmVmaXh9JHtuZXh0TnVtYmVyfWBcbiAgICB9KTtcbiAgICBuZXh0TnVtYmVyKys7XG4gIH1cblxuICBjb25zdCBicmFuY2hOYW1lID0gYCR7cHJlZml4fSR7bmV4dE51bWJlcn1gO1xuICBjb25zdCByZXN1bHQgPSBhd2FpdCBjcmVhdGVXb3JrdHJlZShicmFuY2hOYW1lLCB7IGN3ZDogaW5wdXQucmVwb1Jvb3QgfSk7XG4gIGF3YWl0IGNsaWVudC5hZGRCcmFuY2goXG4gICAgaW5wdXQuY2FyZElkLFxuICAgIHsgbmFtZTogYnJhbmNoTmFtZSwgd29ya3RyZWU6IHJlc3VsdC53b3JrdHJlZSwgcGFyZW50QnJhbmNoOiBiYXNlQnJhbmNoIH0sXG4gICAgeyBzZXNzaW9uSWQgfVxuICApO1xuXG4gIGxvZ2dlci5pbmZvKCdDcmVhdGVkIG5ldyB3b3JrdHJlZScsIHsgYnJhbmNoOiBicmFuY2hOYW1lLCB3b3JrdHJlZTogcmVzdWx0Lndvcmt0cmVlIH0pO1xuICByZXR1cm4geyB3b3JrdHJlZVBhdGg6IHJlc3VsdC53b3JrdHJlZSwgYnJhbmNoTmFtZSwgcGFyZW50QnJhbmNoOiBiYXNlQnJhbmNoIH07XG59XG5cbi8qKlxuICogUnVucyBhIHNpbmdsZSBjbGVhbnVwIHN0ZXAsIGxvZ2dpbmcgYSB3YXJuaW5nIG9uIGZhaWx1cmUgcmF0aGVyIHRoYW5cbiAqIGFib3J0aW5nIHRoZSBzd2VlcC4gRWFjaCBzdGVwICh3b3JrdHJlZSByZW1vdmFsLCBicmFuY2ggZGVsZXRpb24sIEFQSVxuICogcmVjb3JkIHJlbW92YWwpIGlzIGluZGVwZW5kZW50IFx1MjAxNCBhIGZhaWx1cmUgaW4gb25lIG11c3Qgbm90IHByZXZlbnQgdGhlXG4gKiBvdGhlcnMgZnJvbSBydW5uaW5nLlxuICpcbiAqIEBwYXJhbSBzdGVwIC0gQXN5bmMgb3BlcmF0aW9uIHRvIGF0dGVtcHQuXG4gKiBAcGFyYW0gbGFiZWwgLSBIdW1hbi1yZWFkYWJsZSBsYWJlbCBsb2dnZWQgb24gZmFpbHVyZS5cbiAqIEBwYXJhbSBicmFuY2hOYW1lIC0gQnJhbmNoIG5hbWUgaW5jbHVkZWQgaW4gZGlhZ25vc3RpYyBvdXRwdXQuXG4gKiBAcGFyYW0gbG9nZ2VyIC0gTG9nZ2VyIGZvciBkaWFnbm9zdGljIG91dHB1dC5cbiAqL1xuYXN5bmMgZnVuY3Rpb24gdHJ5Q2xlYW51cFN0ZXAoXG4gIHN0ZXA6ICgpID0+IFByb21pc2U8dW5rbm93bj4sXG4gIGxhYmVsOiBzdHJpbmcsXG4gIGJyYW5jaE5hbWU6IHN0cmluZyxcbiAgbG9nZ2VyOiBBY3Rpb25Db250ZXh0Wydsb2dnZXInXVxuKTogUHJvbWlzZTx2b2lkPiB7XG4gIHRyeSB7XG4gICAgYXdhaXQgc3RlcCgpO1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGxvZ2dlci53YXJuKGxhYmVsLCB7IGJyYW5jaDogYnJhbmNoTmFtZSwgZXJyb3I6IGVycm9yTWVzc2FnZShlcnJvcikgfSk7XG4gIH1cbn1cblxuLyoqXG4gKiBSZW1vdmVzIGJyYW5jaGVzIHRoYXQgYXJlIGZ1bGx5IG1lcmdlZCBpbnRvIHRoZWlyIHBhcmVudCBicmFuY2guXG4gKlxuICogRm9yIGVhY2ggbWVyZ2VkIGJyYW5jaCB0aGUgd29ya3RyZWUgZGlyZWN0b3J5IGlzIHJlbW92ZWQsIHRoZSBsb2NhbCBicmFuY2hcbiAqIHJlZiBpcyBkZWxldGVkLCBhbmQgdGhlIGJyYW5jaCByZWNvcmQgaXMgcmVtb3ZlZCBmcm9tIHRoZSBBUEkuIFdvcmt0cmVlXG4gKiByZW1vdmFsIGZhaWx1cmVzIGFyZSBsb2dnZWQgYW5kIGRvIG5vdCBibG9jayBicmFuY2ggZGVsZXRpb24uIEhvd2V2ZXIsIHRoZVxuICogQVBJIHJlY29yZCBpcyBvbmx5IHJlbW92ZWQgYWZ0ZXIgY29uZmlybWluZyB0aGUgZ2l0IGJyYW5jaCB3YXMgZGVsZXRlZCBcdTIwMTRcbiAqIHJlbW92aW5nIHRoZSByZWNvcmQgd2hpbGUgdGhlIGJyYW5jaCBzdGlsbCBleGlzdHMgd291bGQgY2F1c2Ugc3Vic2VxdWVudFxuICogc2Vzc2lvbnMgdG8gbG9zZSB0cmFjayBvZiBpdCBhbmQgY3JlYXRlIGR1cGxpY2F0ZXMuXG4gKlxuICogRWFjaCBicmFuY2ggaXMgY2hlY2tlZCBhZ2FpbnN0IGl0cyBvd24gYHBhcmVudEJyYW5jaGAgKHRoZSBicmFuY2ggaXQgd2FzXG4gKiBjcmVhdGVkIGZyb20pLCBub3QgdGhlIHdvcmtzcGFjZSdzIGN1cnJlbnQgSEVBRC4gVGhpcyBlbnN1cmVzIGJyYW5jaGVzIGFyZVxuICogb25seSBjbGVhbmVkIHVwIHdoZW4gdHJ1bHkgbWVyZ2VkIGludG8gdGhlaXIgaW50ZW5kZWQgdGFyZ2V0LlxuICpcbiAqIEBwYXJhbSBpbnB1dCAtIEFjdGlvbiBpbnB1dCBjb250YWluaW5nIGNhcmRJZCBhbmQgd29ya3NwYWNlIHBhdGhzLlxuICogQHBhcmFtIGNsaWVudCAtIENhcmRzIEFQSSBjbGllbnQgZm9yIGJyYW5jaCByZW1vdmFsLlxuICogQHBhcmFtIGxvZ2dlciAtIExvZ2dlciBmb3IgZGlhZ25vc3RpYyBvdXRwdXQuXG4gKiBAcGFyYW0gc2Vzc2lvbklkIC0gQ2xhdWRlIENvZGUgc2Vzc2lvbiBJRCBmb3J3YXJkZWQgdG8gdGhlIEFQSSBzbyB0aGUgY2FyZCByZXBvIHBvc3QtY29tbWl0IGhvb2sgY2FuIGF0dHJpYnV0ZSB0aGUgY29tbWl0LlxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gY2xlYW51cE1lcmdlZEJyYW5jaGVzKFxuICBpbnB1dDogQWN0aW9uSW5wdXQsXG4gIGNsaWVudDogQ2FyZHNDbGllbnQsXG4gIGxvZ2dlcjogQWN0aW9uQ29udGV4dFsnbG9nZ2VyJ10sXG4gIHNlc3Npb25JZD86IHN0cmluZ1xuKTogUHJvbWlzZTx2b2lkPiB7XG4gIGxldCB0MCA9IHBlcmZvcm1hbmNlLm5vdygpO1xuICBjb25zdCB7IGJyYW5jaGVzIH0gPSBhd2FpdCBjbGllbnQuZ2V0QnJhbmNoZXMoaW5wdXQuY2FyZElkLCB7IHdvcmtzcGFjZVBhdGg6IGlucHV0LnJlcG9Sb290IH0pO1xuICBsb2dnZXIuZGVidWcoJ2dldEJyYW5jaGVzIGNvbXBsZXRlZCcsIHtcbiAgICBjYXJkSWQ6IGlucHV0LmNhcmRJZCxcbiAgICBicmFuY2hDb3VudDogYnJhbmNoZXMubGVuZ3RoLFxuICAgIGVsYXBzZWRNczogTWF0aC5yb3VuZChwZXJmb3JtYW5jZS5ub3coKSAtIHQwKVxuICB9KTtcblxuICBmb3IgKGNvbnN0IGJyYW5jaCBvZiBicmFuY2hlcykge1xuICAgIGlmICghYnJhbmNoLmV4aXN0cykgY29udGludWU7XG5cbiAgICAvLyBTZWxmLXJlZmVyZW50aWFsIHBhcmVudEJyYW5jaCBpcyBhIGNvcnJ1cHQgc3RhdGUgXHUyMDE0IGBtZXJnZS1iYXNlIC0taXMtYW5jZXN0b3IgWCBYYFxuICAgIC8vIHRyaXZpYWxseSBzdWNjZWVkcywgc28gY2xlYW51cCB3b3VsZCBpbmNvcnJlY3RseSByZW1vdmUgdW5tZXJnZWQgd29yay5cbiAgICBpZiAoYnJhbmNoLnBhcmVudEJyYW5jaCA9PT0gYnJhbmNoLm5hbWUpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgYEJyYW5jaCBcIiR7YnJhbmNoLm5hbWV9XCIgaGFzIHNlbGYtcmVmZXJlbnRpYWwgcGFyZW50QnJhbmNoIFx1MjAxNCByZWZ1c2luZyB0byBydW4gY2xlYW51cC4gYCArXG4gICAgICAgICAgJ1RoaXMgaXMgYSBkYXRhIGNvcnJ1cHRpb24gYnVnOiBhIGJyYW5jaCBjYW5ub3QgYmUgaXRzIG93biBwYXJlbnQuJ1xuICAgICAgKTtcbiAgICB9XG5cbiAgICB0MCA9IHBlcmZvcm1hbmNlLm5vdygpO1xuICAgIHRyeSB7XG4gICAgICAvLyBtZXJnZS1iYXNlIC0taXMtYW5jZXN0b3IgZXhpdHMgbm9uLXplcm8gd2hlbiBOT1QgYW4gYW5jZXN0b3IgKG5vdCBtZXJnZWQpLlxuICAgICAgLy8gQ2hlY2sgYWdhaW5zdCB0aGUgYnJhbmNoJ3Mgb3duIHBhcmVudEJyYW5jaCwgbm90IHRoZSB3b3Jrc3BhY2UgSEVBRC5cbiAgICAgIGF3YWl0IGV4ZWNGaWxlQXN5bmMoJ2dpdCcsIFsnbWVyZ2UtYmFzZScsICctLWlzLWFuY2VzdG9yJywgYnJhbmNoLm5hbWUsIGJyYW5jaC5wYXJlbnRCcmFuY2hdLCB7XG4gICAgICAgIGN3ZDogaW5wdXQucmVwb1Jvb3RcbiAgICAgIH0pO1xuICAgIH0gY2F0Y2gge1xuICAgICAgLy8gRXhwZWN0ZWQgZm9yIHVubWVyZ2VkIGJyYW5jaGVzIFx1MjAxNCBza2lwIGNsZWFudXBcbiAgICAgIGxvZ2dlci5kZWJ1ZygnQnJhbmNoIG5vdCBtZXJnZWQsIHNraXBwaW5nIGNsZWFudXAnLCB7XG4gICAgICAgIGJyYW5jaDogYnJhbmNoLm5hbWUsXG4gICAgICAgIGVsYXBzZWRNczogTWF0aC5yb3VuZChwZXJmb3JtYW5jZS5ub3coKSAtIHQwKVxuICAgICAgfSk7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG4gICAgbG9nZ2VyLmRlYnVnKCdtZXJnZS1iYXNlIGNoZWNrIGNvbXBsZXRlZCAobWVyZ2VkKScsIHtcbiAgICAgIGJyYW5jaDogYnJhbmNoLm5hbWUsXG4gICAgICBlbGFwc2VkTXM6IE1hdGgucm91bmQocGVyZm9ybWFuY2Uubm93KCkgLSB0MClcbiAgICB9KTtcblxuICAgIC8vIEJyYW5jaCBpcyBtZXJnZWQgXHUyMDE0IGNsZWFuIHVwIHdvcmt0cmVlLCBicmFuY2ggcmVmLCBhbmQgQVBJIHJlY29yZFxuICAgIGlmIChicmFuY2gud29ya3RyZWUpIHtcbiAgICAgIHQwID0gcGVyZm9ybWFuY2Uubm93KCk7XG4gICAgICBhd2FpdCB0cnlDbGVhbnVwU3RlcChcbiAgICAgICAgKCkgPT4gZXhlY0ZpbGVBc3luYygnZ2l0JywgWyd3b3JrdHJlZScsICdyZW1vdmUnLCAnLS1mb3JjZScsIGJyYW5jaC53b3JrdHJlZSFdLCB7IGN3ZDogaW5wdXQucmVwb1Jvb3QgfSksXG4gICAgICAgICdGYWlsZWQgdG8gcmVtb3ZlIHdvcmt0cmVlJyxcbiAgICAgICAgYnJhbmNoLm5hbWUsXG4gICAgICAgIGxvZ2dlclxuICAgICAgKTtcbiAgICAgIGxvZ2dlci5kZWJ1ZygnV29ya3RyZWUgcmVtb3ZhbCBjb21wbGV0ZWQnLCB7XG4gICAgICAgIGJyYW5jaDogYnJhbmNoLm5hbWUsXG4gICAgICAgIGVsYXBzZWRNczogTWF0aC5yb3VuZChwZXJmb3JtYW5jZS5ub3coKSAtIHQwKVxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgdDAgPSBwZXJmb3JtYW5jZS5ub3coKTtcbiAgICBsZXQgYnJhbmNoRGVsZXRlZCA9IGZhbHNlO1xuICAgIHRyeSB7XG4gICAgICBhd2FpdCBleGVjRmlsZUFzeW5jKCdnaXQnLCBbJ2JyYW5jaCcsICctZCcsIGJyYW5jaC5uYW1lXSwgeyBjd2Q6IGlucHV0LnJlcG9Sb290IH0pO1xuICAgICAgYnJhbmNoRGVsZXRlZCA9IHRydWU7XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIGxvZ2dlci53YXJuKCdGYWlsZWQgdG8gZGVsZXRlIGJyYW5jaCcsIHsgYnJhbmNoOiBicmFuY2gubmFtZSwgZXJyb3I6IGVycm9yTWVzc2FnZShlcnJvcikgfSk7XG4gICAgfVxuICAgIGxvZ2dlci5kZWJ1ZygnQnJhbmNoIGRlbGV0aW9uIGNvbXBsZXRlZCcsIHtcbiAgICAgIGJyYW5jaDogYnJhbmNoLm5hbWUsXG4gICAgICBicmFuY2hEZWxldGVkLFxuICAgICAgZWxhcHNlZE1zOiBNYXRoLnJvdW5kKHBlcmZvcm1hbmNlLm5vdygpIC0gdDApXG4gICAgfSk7XG5cbiAgICBpZiAoYnJhbmNoRGVsZXRlZCkge1xuICAgICAgdDAgPSBwZXJmb3JtYW5jZS5ub3coKTtcbiAgICAgIGF3YWl0IHRyeUNsZWFudXBTdGVwKFxuICAgICAgICAoKSA9PiBjbGllbnQucmVtb3ZlQnJhbmNoKGlucHV0LmNhcmRJZCwgYnJhbmNoLm5hbWUsIHsgc2Vzc2lvbklkIH0pLFxuICAgICAgICAnRmFpbGVkIHRvIHJlbW92ZSBicmFuY2ggZnJvbSBBUEknLFxuICAgICAgICBicmFuY2gubmFtZSxcbiAgICAgICAgbG9nZ2VyXG4gICAgICApO1xuICAgICAgbG9nZ2VyLmRlYnVnKCdBUEkgYnJhbmNoIHJlbW92YWwgY29tcGxldGVkJywge1xuICAgICAgICBicmFuY2g6IGJyYW5jaC5uYW1lLFxuICAgICAgICBlbGFwc2VkTXM6IE1hdGgucm91bmQocGVyZm9ybWFuY2Uubm93KCkgLSB0MClcbiAgICAgIH0pO1xuXG4gICAgICBsb2dnZXIuaW5mbygnQ2xlYW5lZCB1cCBtZXJnZWQgYnJhbmNoJywgeyBicmFuY2g6IGJyYW5jaC5uYW1lIH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICBsb2dnZXIuaW5mbygnU2tpcHBlZCBBUEkgcmVjb3JkIHJlbW92YWwgXHUyMDE0IGdpdCBicmFuY2ggc3RpbGwgZXhpc3RzJywgeyBicmFuY2g6IGJyYW5jaC5uYW1lIH0pO1xuICAgIH1cbiAgfVxufVxuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBVbmlmaWVkIHNlc3Npb24gc3Bhd25lclxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4vKipcbiAqIE9wdGlvbnMgZm9yIHtAbGluayBzcGF3bkNsYXVkZVNlc3Npb259LlxuICpcbiAqIEFjdGlvbnMgcHJvdmlkZSB0aGUgdmFyaWFibGUgcGFydHMgKHByb21wdCwgc2Vzc2lvbiBpZGVudGl0eSwgc3dpdGNoLXRvLVxuICogaW50ZXJhY3RpdmUgc3VwcG9ydCk7IHRoZSBoZWxwZXIgaGFuZGxlcyBldmVyeXRoaW5nIGVsc2U6IHdvcmt0cmVlXG4gKiByZXNvbHV0aW9uLCBtYXJrZXRwbGFjZSByZWdpc3RyYXRpb24sIGVudiBjb25zdHJ1Y3Rpb24sIHNwYXduLCBsaWZlY3ljbGVcbiAqIGNhbGxiYWNrcywgYW5kIHBvc3QtZXhpdCBicmFuY2ggY2xlYW51cC5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBDbGF1ZGVTZXNzaW9uT3B0aW9ucyB7XG4gIC8qKiBQcm9tcHQgc3RyaW5nIHBhc3NlZCB0byB0aGUgQ2xhdWRlIENMSS4gKi9cbiAgcHJvbXB0OiBzdHJpbmc7XG4gIC8qKiBTZXNzaW9uIGlkZW50aWZpZXIgKHVzZWQgZm9yIGAtLXNlc3Npb24taWRgIG9yIGAtLXJlc3VtZWApLiAqL1xuICBzZXNzaW9uSWQ6IHN0cmluZztcbiAgLyoqIFdoZW4gdHJ1ZSwgcGFzc2VzIGAtLXJlc3VtZWAgaW5zdGVhZCBvZiBzdGFydGluZyBhIG5ldyBzZXNzaW9uLiAqL1xuICByZXN1bWU6IGJvb2xlYW47XG4gIC8qKlxuICAgKiBXaGVuIHRydWUsIHJlZ2lzdGVycyB7QGxpbmsgQWN0aW9uQ29udGV4dC5vblN3aXRjaFRvSW50ZXJhY3RpdmV9IHNvXG4gICAqIGJhY2tncm91bmQtbW9kZSBzZXNzaW9ucyBjYW4gYmUgcHJvbW90ZWQgdG8gaW50ZXJhY3RpdmUuXG4gICAqL1xuICBzdXBwb3J0c1N3aXRjaFRvSW50ZXJhY3RpdmU6IGJvb2xlYW47XG59XG5cbi8qKlxuICogU3Bhd25zIGEgYGNsYXVkZWAgQ0xJIHNlc3Npb24gd2l0aCBmdWxsIHdvcmt0cmVlLCBtYXJrZXRwbGFjZSwgYW5kXG4gKiBsaWZlY3ljbGUgbWFuYWdlbWVudC5cbiAqXG4gKiBDZW50cmFsaXNlcyB0aGUgc3Bhd24gbG9naWMgc2hhcmVkIGJ5IHRoZSBgbGF1bmNoYCBhbmQgYGludGVydmlld2BcbiAqIGFjdGlvbnMgc28gZW52aXJvbm1lbnQgdmFyaWFibGUgY29uc3RydWN0aW9uLCB3b3JrdHJlZSByZXNvbHV0aW9uLFxuICogbWFya2V0cGxhY2UgcmVnaXN0cmF0aW9uLCBhbmQgcG9zdC1leGl0IGNsZWFudXAgY2Fubm90IGRyaWZ0IGJldHdlZW5cbiAqIGNhbGxlcnMuXG4gKlxuICogU3RlcHM6XG4gKiAxLiBDcmVhdGUge0BsaW5rIENhcmRzQ2xpZW50fVxuICogMi4gUmVzb2x2ZSBiYXNlIGJyYW5jaCBhbmQgd29ya3RyZWVcbiAqIDMuIFJlZ2lzdGVyIG1hcmtldHBsYWNlXG4gKiA0LiBCdWlsZCBDTEkgYXJncyBhbmQgc3Bhd24gYGNsYXVkZWBcbiAqIDUuIFdpcmUgb25DYW5jZWwgKGFuZCBvcHRpb25hbGx5IG9uU3dpdGNoVG9JbnRlcmFjdGl2ZSlcbiAqIDYuIENhcHR1cmUgc3RkZXJyIGluIGJhY2tncm91bmQgbW9kZVxuICogNy4gQXdhaXQgcHJvY2VzcyBleGl0XG4gKiA4LiBDbGVhbiB1cCBmdWxseS1tZXJnZWQgYnJhbmNoZXMgKGJhY2tncm91bmQgbW9kZSBvbmx5OyBpbiBpbnRlcmFjdGl2ZVxuICogICAgbW9kZSB0aGUgd2F0Y2hlciBhbmQgZXh0ZW5zaW9uIGhhbmRsZSBjbGVhbnVwIGFmdGVyIHRoZSBhY3Rpb24gZXhpdHMpXG4gKlxuICogQHBhcmFtIGlucHV0IC0gUGFyc2VkIGFjdGlvbiBpbnB1dCBmcm9tIHRoZSBlbnZpcm9ubWVudC5cbiAqIEBwYXJhbSBjb250ZXh0IC0gQWN0aW9uIGNvbnRleHQgcHJvdmlkaW5nIGxvZ2dlciBhbmQgbGlmZWN5Y2xlIGhvb2tzLlxuICogQHBhcmFtIG9wdGlvbnMgLSBTZXNzaW9uLXNwZWNpZmljIHBhcmFtZXRlcnMgKHByb21wdCwgc2Vzc2lvbiBJRCwgZXRjLikuXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBzcGF3bkNsYXVkZVNlc3Npb24oXG4gIGlucHV0OiBBY3Rpb25JbnB1dCxcbiAgY29udGV4dDogQWN0aW9uQ29udGV4dCxcbiAgb3B0aW9uczogQ2xhdWRlU2Vzc2lvbk9wdGlvbnNcbik6IFByb21pc2U8dm9pZD4ge1xuICBjb25zdCB7IHByb21wdCwgc2Vzc2lvbklkLCByZXN1bWUsIHN1cHBvcnRzU3dpdGNoVG9JbnRlcmFjdGl2ZSB9ID0gb3B0aW9ucztcblxuICBjb250ZXh0LmxvZ2dlci5pbmZvKGAke2lucHV0LmFjdGlvbk5hbWV9IGFjdGlvbiBzdGFydGVkYCwge1xuICAgIGNhcmRJZDogaW5wdXQuY2FyZElkLFxuICAgIGVudmlyb25tZW50OiBpbnB1dC5lbnZpcm9ubWVudCxcbiAgICBleGVjdXRpb25Nb2RlOiBpbnB1dC5leGVjdXRpb25Nb2RlLFxuICAgIHNlc3Npb25JZFxuICB9KTtcblxuICBjb25zdCBjbGllbnQgPSBuZXcgQ2FyZHNDbGllbnQoe1xuICAgIGJhc2VVcmw6IGlucHV0LmFwaUJhc2VVcmwsXG4gICAgYWNjZXNzVG9rZW46IGlucHV0LmFwaUFjY2Vzc1Rva2VuXG4gIH0pO1xuXG4gIGNvbnN0IGJhc2VCcmFuY2ggPSBhd2FpdCByZXNvbHZlQmFzZUJyYW5jaChpbnB1dC5yZXBvUm9vdCwgY2xpZW50KTtcblxuICBjb25zdCB3b3JrdHJlZVJlc3VsdCA9IGF3YWl0IHJlc29sdmVPckNyZWF0ZVdvcmt0cmVlKGlucHV0LCBjbGllbnQsIGJhc2VCcmFuY2gsIGNvbnRleHQubG9nZ2VyLCBzZXNzaW9uSWQpO1xuXG4gIGNvbnN0IHsgd29ya3RyZWVQYXRoOiBjd2QsIGJyYW5jaE5hbWUsIHBhcmVudEJyYW5jaCB9ID0gd29ya3RyZWVSZXN1bHQ7XG4gIGNvbnRleHQubG9nZ2VyLmluZm8oJ1VzaW5nIHdvcmt0cmVlJywgeyBjd2QsIGJyYW5jaDogYnJhbmNoTmFtZSwgYmFzZUJyYW5jaCwgcGFyZW50QnJhbmNoIH0pO1xuXG4gIGNvbnN0IG1hcmtldHBsYWNlUGF0aCA9IHJlc29sdmVNYXJrZXRwbGFjZVBhdGgoKTtcbiAgYXdhaXQgdXBkYXRlTWFya2V0cGxhY2VSZWdpc3RyYXRpb24obWFya2V0cGxhY2VQYXRoLCBjb250ZXh0LmxvZ2dlcik7XG5cbiAgY29uc3QgYXJncyA9IGJ1aWxkQXJncyhwcm9tcHQsIHNlc3Npb25JZCwgcmVzdW1lLCBpbnB1dC5leGVjdXRpb25Nb2RlLCBpbnB1dC5jYXJkUmVwb1BhdGgsIG1hcmtldHBsYWNlUGF0aCk7XG4gIGNvbnN0IGlzSW50ZXJhY3RpdmUgPSBpbnB1dC5leGVjdXRpb25Nb2RlID09PSAnaW50ZXJhY3RpdmUnO1xuXG4gIGNvbnN0IGNoaWxkOiBDaGlsZFByb2Nlc3MgPSBzcGF3bignY2xhdWRlJywgYXJncywge1xuICAgIGN3ZCxcbiAgICBzdGRpbzogaXNJbnRlcmFjdGl2ZSA/ICdpbmhlcml0JyA6IFsnaWdub3JlJywgJ2lnbm9yZScsICdwaXBlJ10sXG4gICAgZW52OiB7XG4gICAgICAuLi5wcm9jZXNzLmVudixcbiAgICAgIFdPUktTUEFDRV9QQVRIOiBjd2QsXG4gICAgICBDTEFVREVfQ09ERV9UQVNLX0xJU1RfSUQ6IGBjYXJkcy1leHRlbnNpb24tJHtpbnB1dC5jYXJkSWR9YCxcbiAgICAgIENMQVVERV9DT0RFX0VYUEVSSU1FTlRBTF9BR0VOVF9URUFNUzogJzEnLFxuICAgICAgQkFTRV9CUkFOQ0g6IGJhc2VCcmFuY2gsXG4gICAgICBQQVJFTlRfQlJBTkNIOiBwYXJlbnRCcmFuY2gsXG4gICAgICBXT1JLU1BBQ0VfQlJBTkNIOiBicmFuY2hOYW1lXG4gICAgfVxuICB9KTtcblxuICBjb250ZXh0Lm9uQ2FuY2VsKCgpID0+IHtcbiAgICBjb250ZXh0LmxvZ2dlci5pbmZvKGAke2lucHV0LmFjdGlvbk5hbWV9IGFjdGlvbiBjYW5jZWxsZWQsIHRlcm1pbmF0aW5nIGNsYXVkZWAsIHsgc2Vzc2lvbklkIH0pO1xuICAgIGNoaWxkLmtpbGwoJ1NJR1RFUk0nKTtcbiAgfSk7XG5cbiAgaWYgKHN1cHBvcnRzU3dpdGNoVG9JbnRlcmFjdGl2ZSkge1xuICAgIGNvbnRleHQub25Td2l0Y2hUb0ludGVyYWN0aXZlKCgpID0+IHtcbiAgICAgIGNvbnRleHQubG9nZ2VyLmluZm8oJ1N3aXRjaGluZyB0byBpbnRlcmFjdGl2ZSBtb2RlJywgeyBzZXNzaW9uSWQgfSk7XG4gICAgICBjaGlsZC5raWxsKCdTSUdURVJNJyk7XG4gICAgICByZXR1cm4geyBzZXNzaW9uSWQgfTtcbiAgICB9KTtcbiAgfVxuXG4gIC8vIEJhY2tncm91bmQgbW9kZTogY2FwdHVyZSBzdGRlcnIgZm9yIGRpYWdub3N0aWMgbG9nZ2luZ1xuICBpZiAoIWlzSW50ZXJhY3RpdmUpIHtcbiAgICBjaGlsZC5zdGRlcnI/Lm9uKCdkYXRhJywgKGNodW5rOiBCdWZmZXIpID0+IHtcbiAgICAgIGNvbnN0IHRleHQgPSBjaHVuay50b1N0cmluZygpLnRyaW0oKTtcbiAgICAgIGlmICh0ZXh0KSB7XG4gICAgICAgIGNvbnRleHQubG9nZ2VyLndhcm4odGV4dCk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICBjb25zdCBleGl0Q29kZSA9IGF3YWl0IG5ldyBQcm9taXNlPG51bWJlciB8IG51bGw+KChyZXNvbHZlKSA9PiB7XG4gICAgY2hpbGQub24oJ2Nsb3NlJywgcmVzb2x2ZSk7XG4gIH0pO1xuXG4gIGNvbnRleHQubG9nZ2VyLmluZm8oYCR7aW5wdXQuYWN0aW9uTmFtZX0gYWN0aW9uIGNvbXBsZXRlZGAsIHsgc2Vzc2lvbklkLCBleGl0Q29kZSB9KTtcblxuICAvLyBQb3N0LWV4aXQgY2xlYW51cDogcmVtb3ZlIGZ1bGx5LW1lcmdlZCBicmFuY2hlcy5cbiAgLy8gSW4gYmFja2dyb3VuZCBtb2RlIHRoZXJlIGlzIG5vIHdhdGNoZXIsIHNvIHdlIHJ1biBjbGVhbnVwIGlubGluZS5cbiAgLy8gSW4gaW50ZXJhY3RpdmUgbW9kZSB3ZSBzcGF3biBhIGRldGFjaGVkIHByb2Nlc3Mgc28gdGhlIHRlcm1pbmFsIGNsb3Nlc1xuICAvLyBpbW1lZGlhdGVseSBcdTIwMTQgdGhlIHdhdGNoZXIgY2FsbHMgdGhlIHNhbWUgY2xlYW51cE1lcmdlZEJyYW5jaGVzIGZ1bmN0aW9uLlxuICBpZiAoaXNJbnRlcmFjdGl2ZSkge1xuICAgIHRyeSB7XG4gICAgICBzcGF3bkJyYW5jaENsZWFudXBXYXRjaGVyKHtcbiAgICAgICAgY2FyZElkOiBpbnB1dC5jYXJkSWQsXG4gICAgICAgIHJlcG9Sb290OiBpbnB1dC5yZXBvUm9vdCxcbiAgICAgICAgYXBpQmFzZVVybDogaW5wdXQuYXBpQmFzZVVybCxcbiAgICAgICAgYXBpQWNjZXNzVG9rZW46IGlucHV0LmFwaUFjY2Vzc1Rva2VuLFxuICAgICAgICBzZXNzaW9uSWRcbiAgICAgIH0pO1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICBjb25zdCBtZXNzYWdlID0gZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiBTdHJpbmcoZXJyb3IpO1xuICAgICAgY29udGV4dC5sb2dnZXIud2FybignRmFpbGVkIHRvIHNwYXduIGJyYW5jaC1jbGVhbnVwIHdhdGNoZXIgKG5vbi1mYXRhbCknLCB7IGVycm9yOiBtZXNzYWdlLCBzZXNzaW9uSWQgfSk7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIGNvbnN0IGNsZWFudXBTdGFydCA9IHBlcmZvcm1hbmNlLm5vdygpO1xuICAgIHRyeSB7XG4gICAgICBhd2FpdCBjbGVhbnVwTWVyZ2VkQnJhbmNoZXMoaW5wdXQsIGNsaWVudCwgY29udGV4dC5sb2dnZXIsIHNlc3Npb25JZCk7XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIGNvbnN0IG1lc3NhZ2UgPSBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6IFN0cmluZyhlcnJvcik7XG4gICAgICBpZiAobWVzc2FnZS5pbmNsdWRlcygnc2VsZi1yZWZlcmVudGlhbCBwYXJlbnRCcmFuY2gnKSB8fCBtZXNzYWdlLmluY2x1ZGVzKCdkYXRhIGNvcnJ1cHRpb24nKSkge1xuICAgICAgICB0aHJvdyBlcnJvcjtcbiAgICAgIH1cbiAgICAgIGNvbnRleHQubG9nZ2VyLndhcm4oJ1Bvc3QtZXhpdCBjbGVhbnVwIGZhaWxlZCAobm9uLWZhdGFsKScsIHsgZXJyb3I6IG1lc3NhZ2UsIHNlc3Npb25JZCB9KTtcbiAgICB9XG4gICAgY29udGV4dC5sb2dnZXIuZGVidWcoJ1Bvc3QtZXhpdCBjbGVhbnVwIGZpbmlzaGVkJywge1xuICAgICAgc2Vzc2lvbklkLFxuICAgICAgZWxhcHNlZE1zOiBNYXRoLnJvdW5kKHBlcmZvcm1hbmNlLm5vdygpIC0gY2xlYW51cFN0YXJ0KVxuICAgIH0pO1xuICB9XG59XG4iLCAiLyoqXG4gKiBFcnJvciBjbGFzc2VzIGZvciB0aGUgQ2FyZHMgVjIgU0RLLlxuICpcbiAqIFRoZXNlIGVycm9ycyBub3JtYWxpemUgc2VydmVyIHJlc3BvbnNlcyBhbmQgbmV0d29yayBmYWlsdXJlcyBzbyBjYWxsZXJzIGNhblxuICogZGlzdGluZ3Vpc2ggQVBJIHZhbGlkYXRpb24gcHJvYmxlbXMgZnJvbSB0cmFuc3BvcnQgaXNzdWVzLlxuICpcbiAqXG4gKiBAc3VtbWFyeSBFcnJvciBjbGFzc2VzIGZvciB0aGUgQ2FyZHMgVjIgU0RLXG4gKiBAbW9kdWxlIHR5cGVzL2Vycm9yc1xuICovXG5cbmltcG9ydCB0eXBlIHsgRmllbGRFcnJvciB9IGZyb20gJy4uLy4uL3Byb3RvY29sL2luZGV4LmpzJztcblxuLyoqXG4gKiBFcnJvciB0aHJvd24gd2hlbiBhbiBBUEkgcmVxdWVzdCBmYWlscyB3aXRoIGFuIGVycm9yIHJlc3BvbnNlLlxuICpcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiB0cnkge1xuICogICBhd2FpdCBjbGllbnQuY3JlYXRlQ2FyZChkYXRhKTtcbiAqIH0gY2F0Y2ggKGVycm9yKSB7XG4gKiAgIGlmIChlcnJvciBpbnN0YW5jZW9mIEFwaUVycm9yKSB7XG4gKiAgICAgY29uc29sZS5lcnJvcihgQVBJIGVycm9yIFske2Vycm9yLmNvZGV9XTogJHtlcnJvci5tZXNzYWdlfWApO1xuICogICAgIGlmIChlcnJvci5maWVsZHMpIHtcbiAqICAgICAgIGVycm9yLmZpZWxkcy5mb3JFYWNoKGYgPT4gY29uc29sZS5lcnJvcihgICAke2YuZmllbGR9OiAke2YubWVzc2FnZX1gKSk7XG4gKiAgICAgfVxuICogICB9XG4gKiB9XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNsYXNzIEFwaUVycm9yIGV4dGVuZHMgRXJyb3Ige1xuICAvKipcbiAgICogQ3JlYXRlcyBhIG5ldyBBcGlFcnJvciBpbnN0YW5jZS5cbiAgICpcbiAgICogQHBhcmFtIG1lc3NhZ2UgLSBIdW1hbi1yZWFkYWJsZSBlcnJvciBtZXNzYWdlXG4gICAqIEBwYXJhbSBjb2RlIC0gTWFjaGluZS1yZWFkYWJsZSBlcnJvciBjb2RlXG4gICAqIEBwYXJhbSBmaWVsZHMgLSBPcHRpb25hbCBhcnJheSBvZiBmaWVsZC1zcGVjaWZpYyB2YWxpZGF0aW9uIGVycm9yc1xuICAgKi9cbiAgY29uc3RydWN0b3IoXG4gICAgbWVzc2FnZTogc3RyaW5nLFxuICAgIHB1YmxpYyByZWFkb25seSBjb2RlOiBzdHJpbmcsXG4gICAgcHVibGljIHJlYWRvbmx5IGZpZWxkcz86IEZpZWxkRXJyb3JbXVxuICApIHtcbiAgICBzdXBlcihtZXNzYWdlKTtcbiAgICB0aGlzLm5hbWUgPSAnQXBpRXJyb3InO1xuICB9XG59XG5cbi8qKlxuICogRXJyb3IgdGhyb3duIHdoZW4gYSBuZXR3b3JrIHJlcXVlc3QgZmFpbHMgZHVlIHRvIGNvbm5lY3Rpdml0eSBpc3N1ZXMuXG4gKlxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIHRyeSB7XG4gKiAgIGF3YWl0IGNsaWVudC5saXN0Q2FyZHMoKTtcbiAqIH0gY2F0Y2ggKGVycm9yKSB7XG4gKiAgIGlmIChlcnJvciBpbnN0YW5jZW9mIE5ldHdvcmtFcnJvcikge1xuICogICAgIGNvbnNvbGUuZXJyb3IoYE5ldHdvcmsgZXJyb3I6ICR7ZXJyb3IubWVzc2FnZX1gKTtcbiAqICAgICBpZiAoZXJyb3IuY2F1c2UpIHtcbiAqICAgICAgIGNvbnNvbGUuZXJyb3IoYENhdXNlZCBieTogJHtlcnJvci5jYXVzZS5tZXNzYWdlfWApO1xuICogICAgIH1cbiAqICAgfVxuICogfVxuICogYGBgXG4gKi9cbmV4cG9ydCBjbGFzcyBOZXR3b3JrRXJyb3IgZXh0ZW5kcyBFcnJvciB7XG4gIC8qKlxuICAgKiBDcmVhdGVzIGEgbmV3IE5ldHdvcmtFcnJvciBpbnN0YW5jZS5cbiAgICpcbiAgICogQHBhcmFtIG1lc3NhZ2UgLSBIdW1hbi1yZWFkYWJsZSBlcnJvciBtZXNzYWdlXG4gICAqIEBwYXJhbSBjYXVzZSAtIE9wdGlvbmFsIHVuZGVybHlpbmcgZXJyb3IgdGhhdCBjYXVzZWQgdGhpcyBuZXR3b3JrIGZhaWx1cmVcbiAgICovXG4gIGNvbnN0cnVjdG9yKFxuICAgIG1lc3NhZ2U6IHN0cmluZyxcbiAgICBwdWJsaWMgcmVhZG9ubHkgY2F1c2U/OiBFcnJvclxuICApIHtcbiAgICBzdXBlcihtZXNzYWdlKTtcbiAgICB0aGlzLm5hbWUgPSAnTmV0d29ya0Vycm9yJztcbiAgfVxufVxuIiwgIi8qKlxuICogSFRUUCBjbGllbnQgZm9yIHRoZSBDYXJkcyBWMiBSRVNUIEFQSS5cbiAqXG4gKlxuICogQHN1bW1hcnkgSFRUUCBjbGllbnQgZm9yIHRoZSBDYXJkcyBWMiBSRVNUIEFQSVxuICogQG1vZHVsZSBzZGsvQ2FyZHNDbGllbnRcbiAqL1xuXG5pbXBvcnQgdHlwZSB7XG4gIEFjdGlvblJlc3VsdCxcbiAgQ2FyZCxcbiAgQ29tcGFyZVJlcXVlc3QsXG4gIENvbXBhcmVTdGF0ZSxcbiAgSHR0cENsaWVudCxcbiAgU3RyZWFtTWV0YSxcbiAgVGltZWxpbmVJdGVtXG59IGZyb20gJy4uL3Byb3RvY29sL2luZGV4LmpzJztcbmltcG9ydCB0eXBlIHtcbiAgQWRkQnJhbmNoUmVxdWVzdCxcbiAgQXR0YWNobWVudFJlc3BvbnNlLFxuICBCcmFuY2hlc1Jlc3BvbnNlLFxuICBDYXJkQ3JlYXRlRGF0YSxcbiAgQ2FyZHNDbGllbnRPcHRpb25zLFxuICBDYXJkVXBkYXRlRGF0YSxcbiAgQ29tbWVudCxcbiAgQ29tbWVudENyZWF0ZURhdGEsXG4gIENvbW1lbnRVcGRhdGVEYXRhLFxuICBDb21taXRJbmZvLFxuICBHYXRlQXBwcm92YWxSZXNwb25zZSxcbiAgSW5nZXN0V3NGYWN0b3J5LFxuICBMaXN0Q2FyZHNPcHRpb25zLFxuICBTdHJlYW1SZXN1bHQsXG4gIFN0cmVhbVdyaXRlcixcbiAgU3RyZWFtV3JpdGVyT3B0aW9ucyxcbiAgVGltZWxpbmVPcHRpb25zLFxuICBUeXBlU2NoZW1hc1Jlc3BvbnNlLFxuICBXc1N0cmVhbVNlc3Npb25cbn0gZnJvbSAnLi90eXBlcy9jbGllbnQuanMnO1xuaW1wb3J0IHsgQXBpRXJyb3IsIE5ldHdvcmtFcnJvciB9IGZyb20gJy4vdHlwZXMvZXJyb3JzLmpzJztcblxuLyoqIEluaXRpYWwgcmVxdWVzdCB0aW1lb3V0IGluIG1pbGxpc2Vjb25kcyAoMyBzZWNvbmRzIHRvIGFjY29tbW9kYXRlIGdpdC1iYWNrZWQgZW5kcG9pbnRzKS4gKi9cbmNvbnN0IElOSVRJQUxfVElNRU9VVF9NUyA9IDNfMDAwO1xuXG4vKiogTWF4aW11bSByZXF1ZXN0IHRpbWVvdXQgaW4gbWlsbGlzZWNvbmRzIGFmdGVyIGV4cG9uZW50aWFsIGJhY2tvZmYuICovXG5jb25zdCBNQVhfVElNRU9VVF9NUyA9IDEwXzAwMDtcblxuLyoqIE1heGltdW0gbnVtYmVyIG9mIGF1dG9tYXRpYyByZXRyaWVzIGZvciB0aW1lb3V0IGVycm9ycyBiZWZvcmUgZ2l2aW5nIHVwLiAqL1xuY29uc3QgTUFYX1RJTUVPVVRfUkVUUklFUyA9IDI7XG5cbi8qKlxuICogVHlwZS1zYWZlIEhUVFAgY2xpZW50IGZvciB0aGUgQ2FyZHMgVjIgUkVTVCBBUEkuXG4gKlxuICogVXNlcyB0aGUgRmV0Y2ggQVBJIGJ5IGRlZmF1bHQgYW5kIHN1cHBvcnRzIGRlcGVuZGVuY3kgaW5qZWN0aW9uIG9mIGFuXG4gKiBhbHRlcm5hdGUge0BsaW5rIEh0dHBDbGllbnR9IGZvciB0ZXN0cyBvciBjdXN0b20gdHJhbnNwb3J0cy4gQWxsIHB1YmxpY1xuICogbWV0aG9kcyBzdXJmYWNlIHNlcnZlciBmYWlsdXJlcyBhcyB7QGxpbmsgQXBpRXJyb3J9IGFuZCB0cmFuc3BvcnQgZmFpbHVyZXNcbiAqIGFzIHtAbGluayBOZXR3b3JrRXJyb3J9LlxuICpcbiAqIFRoZSBkZWZhdWx0IEhUVFAgY2xpZW50IGFwcGxpZXMgYW4gZXhwb25lbnRpYWwgYmFja29mZiB0aW1lb3V0IHRvIGZldGNoXG4gKiByZXF1ZXN0czogc3RhcnRpbmcgYXQgMyBzZWNvbmRzLCBkb3VibGluZyBvbiBlYWNoIGNvbnNlY3V0aXZlIGZhaWx1cmUgdXBcbiAqIHRvIGEgMTAtc2Vjb25kIGNhcCwgYW5kIHJlc2V0dGluZyBvbiBhbnkgc3VjY2Vzc2Z1bCByZXNwb25zZS4gVGhpcyBlbnN1cmVzXG4gKiBmYXN0IGZhaWx1cmUgZGV0ZWN0aW9uIHdoZW4gdGhlIHNlcnZlciBpcyBkb3duIHdoaWxlIGFsbG93aW5nIHNsb3dlclxuICogcmVzcG9uc2VzIGR1cmluZyByZWNvdmVyeS5cbiAqXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogY29uc3QgY2xpZW50ID0gbmV3IENhcmRzQ2xpZW50KHsgYmFzZVVybDogJ2h0dHA6Ly9sb2NhbGhvc3Q6MzAwMCcsIGFjY2Vzc1Rva2VuOiAndG9rZW4nIH0pO1xuICpcbiAqIGNvbnN0IGNhcmRzID0gYXdhaXQgY2xpZW50Lmxpc3RDYXJkcyh7IHN0YXR1czogJ2FjdGl2ZScgfSk7XG4gKiBhd2FpdCBjbGllbnQudXBkYXRlQ2FyZChjYXJkSWQsIHsgc3RhdHVzOiAnZG9uZScgfSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNsYXNzIENhcmRzQ2xpZW50IHtcbiAgcHJpdmF0ZSByZWFkb25seSBfaHR0cENsaWVudD86IEh0dHBDbGllbnQ7XG5cbiAgLyoqIEN1cnJlbnQgdGltZW91dCBpbiBtaWxsaXNlY29uZHMsIGluY3JlYXNlcyB3aXRoIGNvbnNlY3V0aXZlIGZhaWx1cmVzLiAqL1xuICBwcml2YXRlIF9jdXJyZW50VGltZW91dE1zID0gSU5JVElBTF9USU1FT1VUX01TO1xuXG4gIC8qKlxuICAgKiBDcmVhdGVzIGEgbmV3IENhcmRzQ2xpZW50IGluc3RhbmNlLlxuICAgKlxuICAgKiBAcGFyYW0gb3B0aW9ucyAtIENvbmZpZ3VyYXRpb24gb3B0aW9ucyBpbmNsdWRpbmcgYmFzZSBVUkwgYW5kIGF1dGggdG9rZW4uXG4gICAqIEBwYXJhbSBodHRwQ2xpZW50IC0gT3B0aW9uYWwgSFRUUCBjbGllbnQgZm9yIGRlcGVuZGVuY3kgaW5qZWN0aW9uLlxuICAgKi9cbiAgY29uc3RydWN0b3IoXG4gICAgcHJpdmF0ZSByZWFkb25seSBvcHRpb25zOiBDYXJkc0NsaWVudE9wdGlvbnMsXG4gICAgaHR0cENsaWVudD86IEh0dHBDbGllbnRcbiAgKSB7XG4gICAgdGhpcy5faHR0cENsaWVudCA9IGh0dHBDbGllbnQ7XG4gIH1cblxuICAvKipcbiAgICogUmV0dXJucyB0aGUgYmFzZSBVUkwgdXNlZCB0byBidWlsZCBBUEkgcmVxdWVzdHMuXG4gICAqXG4gICAqIEByZXR1cm5zIFRoZSBiYXNlIFVSTCBzdHJpbmcgYXMgcHJvdmlkZWQgaW4ge0BsaW5rIENhcmRzQ2xpZW50T3B0aW9uc30uXG4gICAqL1xuICBnZXRCYXNlVXJsKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMub3B0aW9ucy5iYXNlVXJsO1xuICB9XG5cbiAgLyoqXG4gICAqIFJldHVybnMgd2hldGhlciBhbiBIVFRQIGNsaWVudCB3YXMgaW5qZWN0ZWQuXG4gICAqXG4gICAqIEByZXR1cm5zIFRydWUgaWYgYW4gSFRUUCBjbGllbnQgd2FzIHByb3ZpZGVkIGR1cmluZyBjb25zdHJ1Y3Rpb24uXG4gICAqIEBpbnRlcm5hbCBVc2VkIGZvciB0ZXN0aW5nIGRlcGVuZGVuY3kgaW5qZWN0aW9uLlxuICAgKi9cbiAgaGFzSHR0cENsaWVudCgpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5faHR0cENsaWVudCAhPT0gdW5kZWZpbmVkO1xuICB9XG4gIC8qKlxuICAgKiBSZXR1cm5zIGFuIEFib3J0U2lnbmFsIHRoYXQgZmlyZXMgYWZ0ZXIgdGhlIGN1cnJlbnQgYmFja29mZiB0aW1lb3V0LlxuICAgKiBVc2VzIGNhbGxlcidzIHNpZ25hbCBpZiBwcm92aWRlZCAoZm9yIERJL3Rlc3RpbmcpLCBvdGhlcndpc2UgYXBwbGllcyB0aGUgYmFja29mZiB0aW1lb3V0LlxuICAgKlxuICAgKiBAcGFyYW0gZXhpc3RpbmdTaWduYWwgLSBPcHRpb25hbCBjYWxsZXItcHJvdmlkZWQgc2lnbmFsIHRvIHJldXNlIGluc3RlYWQgb2YgY3JlYXRpbmcgYSB0aW1lb3V0IHNpZ25hbC5cbiAgICogQHJldHVybnMgQWJvcnRTaWduYWwgdGhhdCBjb250cm9scyByZXF1ZXN0IGNhbmNlbGxhdGlvbiBmb3IgdGhlIGN1cnJlbnQgb3BlcmF0aW9uLlxuICAgKi9cbiAgcHJpdmF0ZSBnZXRUaW1lb3V0U2lnbmFsKGV4aXN0aW5nU2lnbmFsPzogQWJvcnRTaWduYWwgfCBudWxsKTogQWJvcnRTaWduYWwge1xuICAgIGlmIChleGlzdGluZ1NpZ25hbCkgcmV0dXJuIGV4aXN0aW5nU2lnbmFsO1xuICAgIHJldHVybiBBYm9ydFNpZ25hbC50aW1lb3V0KHRoaXMuX2N1cnJlbnRUaW1lb3V0TXMpO1xuICB9XG5cbiAgLyoqXG4gICAqIFJlY29yZHMgYSBzdWNjZXNzZnVsIHJlcXVlc3QgYW5kIHJlc2V0cyB0aGUgdGltZW91dCBiYWNrb2ZmLlxuICAgKi9cbiAgcHJpdmF0ZSBvblJlcXVlc3RTdWNjZXNzKCk6IHZvaWQge1xuICAgIHRoaXMuX2N1cnJlbnRUaW1lb3V0TXMgPSBJTklUSUFMX1RJTUVPVVRfTVM7XG4gIH1cblxuICAvKipcbiAgICogUmVjb3JkcyBhIGZhaWxlZCByZXF1ZXN0IGFuZCBpbmNyZWFzZXMgdGhlIHRpbWVvdXQgdmlhIGV4cG9uZW50aWFsIGJhY2tvZmYuXG4gICAqL1xuICBwcml2YXRlIG9uUmVxdWVzdEZhaWx1cmUoKTogdm9pZCB7XG4gICAgdGhpcy5fY3VycmVudFRpbWVvdXRNcyA9IE1hdGgubWluKHRoaXMuX2N1cnJlbnRUaW1lb3V0TXMgKiAyLCBNQVhfVElNRU9VVF9NUyk7XG4gIH1cblxuICAvKipcbiAgICogRGVmYXVsdCBIVFRQIGNsaWVudCBpbXBsZW1lbnRhdGlvbiB1c2luZyBmZXRjaCArIEpTT04gcGF5bG9hZHMuXG4gICAqXG4gICAqIEVhY2ggZmV0Y2ggY2FsbCBpbmNsdWRlcyBhbiBBYm9ydFNpZ25hbC50aW1lb3V0IHRoYXQgc3RhcnRzIGF0IDMgc2Vjb25kc1xuICAgKiBhbmQgZG91YmxlcyBvbiBjb25zZWN1dGl2ZSBmYWlsdXJlcyB1cCB0byAxMCBzZWNvbmRzLlxuICAgKi9cbiAgcHJpdmF0ZSBkZWZhdWx0SHR0cENsaWVudDogSHR0cENsaWVudCA9IHtcbiAgICBnZXQ6IGFzeW5jIDxUPih1cmw6IHN0cmluZywgb3B0aW9ucz86IFJlcXVlc3RJbml0KTogUHJvbWlzZTxUPiA9PiB7XG4gICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGZldGNoKHVybCwge1xuICAgICAgICAuLi5vcHRpb25zLFxuICAgICAgICBoZWFkZXJzOiB7IC4uLnRoaXMuZ2V0SGVhZGVycygpLCAuLi5vcHRpb25zPy5oZWFkZXJzIH0sXG4gICAgICAgIHNpZ25hbDogdGhpcy5nZXRUaW1lb3V0U2lnbmFsKG9wdGlvbnM/LnNpZ25hbClcbiAgICAgIH0pO1xuICAgICAgaWYgKCFyZXNwb25zZS5vaykgdGhyb3cgcmVzcG9uc2U7XG4gICAgICByZXR1cm4gcmVzcG9uc2UuanNvbigpIGFzIFByb21pc2U8VD47XG4gICAgfSxcbiAgICBwb3N0OiBhc3luYyA8VD4odXJsOiBzdHJpbmcsIGJvZHk6IHVua25vd24sIG9wdGlvbnM/OiBSZXF1ZXN0SW5pdCk6IFByb21pc2U8VD4gPT4ge1xuICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBmZXRjaCh1cmwsIHtcbiAgICAgICAgLi4ub3B0aW9ucyxcbiAgICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICAgIGhlYWRlcnM6IHsgLi4udGhpcy5nZXRIZWFkZXJzKCksIC4uLm9wdGlvbnM/LmhlYWRlcnMgfSxcbiAgICAgICAgYm9keTogYm9keSA/IEpTT04uc3RyaW5naWZ5KGJvZHkpIDogdW5kZWZpbmVkLFxuICAgICAgICBzaWduYWw6IHRoaXMuZ2V0VGltZW91dFNpZ25hbChvcHRpb25zPy5zaWduYWwpXG4gICAgICB9KTtcbiAgICAgIGlmICghcmVzcG9uc2Uub2spIHRocm93IHJlc3BvbnNlO1xuICAgICAgcmV0dXJuIHJlc3BvbnNlLmpzb24oKSBhcyBQcm9taXNlPFQ+O1xuICAgIH0sXG4gICAgcHV0OiBhc3luYyA8VD4odXJsOiBzdHJpbmcsIGJvZHk6IHVua25vd24sIG9wdGlvbnM/OiBSZXF1ZXN0SW5pdCk6IFByb21pc2U8VD4gPT4ge1xuICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBmZXRjaCh1cmwsIHtcbiAgICAgICAgLi4ub3B0aW9ucyxcbiAgICAgICAgbWV0aG9kOiAnUFVUJyxcbiAgICAgICAgaGVhZGVyczogeyAuLi50aGlzLmdldEhlYWRlcnMoKSwgLi4ub3B0aW9ucz8uaGVhZGVycyB9LFxuICAgICAgICBib2R5OiBib2R5ID8gSlNPTi5zdHJpbmdpZnkoYm9keSkgOiB1bmRlZmluZWQsXG4gICAgICAgIHNpZ25hbDogdGhpcy5nZXRUaW1lb3V0U2lnbmFsKG9wdGlvbnM/LnNpZ25hbClcbiAgICAgIH0pO1xuICAgICAgaWYgKCFyZXNwb25zZS5vaykgdGhyb3cgcmVzcG9uc2U7XG4gICAgICByZXR1cm4gcmVzcG9uc2UuanNvbigpIGFzIFByb21pc2U8VD47XG4gICAgfSxcbiAgICBwYXRjaDogYXN5bmMgPFQ+KHVybDogc3RyaW5nLCBib2R5OiB1bmtub3duLCBvcHRpb25zPzogUmVxdWVzdEluaXQpOiBQcm9taXNlPFQ+ID0+IHtcbiAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZmV0Y2godXJsLCB7XG4gICAgICAgIC4uLm9wdGlvbnMsXG4gICAgICAgIG1ldGhvZDogJ1BBVENIJyxcbiAgICAgICAgaGVhZGVyczogeyAuLi50aGlzLmdldEhlYWRlcnMoKSwgLi4ub3B0aW9ucz8uaGVhZGVycyB9LFxuICAgICAgICBib2R5OiBib2R5ID8gSlNPTi5zdHJpbmdpZnkoYm9keSkgOiB1bmRlZmluZWQsXG4gICAgICAgIHNpZ25hbDogdGhpcy5nZXRUaW1lb3V0U2lnbmFsKG9wdGlvbnM/LnNpZ25hbClcbiAgICAgIH0pO1xuICAgICAgaWYgKCFyZXNwb25zZS5vaykgdGhyb3cgcmVzcG9uc2U7XG4gICAgICByZXR1cm4gcmVzcG9uc2UuanNvbigpIGFzIFByb21pc2U8VD47XG4gICAgfSxcbiAgICBkZWxldGU6IGFzeW5jICh1cmw6IHN0cmluZywgb3B0aW9ucz86IFJlcXVlc3RJbml0KTogUHJvbWlzZTx2b2lkPiA9PiB7XG4gICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGZldGNoKHVybCwge1xuICAgICAgICAuLi5vcHRpb25zLFxuICAgICAgICBtZXRob2Q6ICdERUxFVEUnLFxuICAgICAgICBoZWFkZXJzOiB7IC4uLnRoaXMuZ2V0SGVhZGVycygpLCAuLi5vcHRpb25zPy5oZWFkZXJzIH0sXG4gICAgICAgIHNpZ25hbDogdGhpcy5nZXRUaW1lb3V0U2lnbmFsKG9wdGlvbnM/LnNpZ25hbClcbiAgICAgIH0pO1xuICAgICAgaWYgKCFyZXNwb25zZS5vaykgdGhyb3cgcmVzcG9uc2U7XG4gICAgfVxuICB9O1xuXG4gIC8qKlxuICAgKiBHZXRzIEhUVFAgaGVhZGVycyBmb3IgSlNPTiBBUEkgcmVxdWVzdHMuXG4gICAqXG4gICAqIEByZXR1cm5zIEhlYWRlcnMgd2l0aCBKU09OIGNvbnRlbnQgdHlwZSBhbmQgb3B0aW9uYWwgYmVhcmVyIHRva2VuLlxuICAgKi9cbiAgcHJpdmF0ZSBnZXRIZWFkZXJzKCk6IEhlYWRlcnNJbml0IHtcbiAgICBjb25zdCBoZWFkZXJzOiBIZWFkZXJzSW5pdCA9IHsgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyB9O1xuICAgIGlmICh0aGlzLm9wdGlvbnMuYWNjZXNzVG9rZW4pIHtcbiAgICAgIGhlYWRlcnNbJ0F1dGhvcml6YXRpb24nXSA9IGBCZWFyZXIgJHt0aGlzLm9wdGlvbnMuYWNjZXNzVG9rZW59YDtcbiAgICB9XG4gICAgcmV0dXJuIGhlYWRlcnM7XG4gIH1cblxuICAvKipcbiAgICogR2V0cyB0aGUgSFRUUCBjbGllbnQgdG8gdXNlIGZvciByZXF1ZXN0cy5cbiAgICpcbiAgICogQHJldHVybnMgSW5qZWN0ZWQgSFRUUCBjbGllbnQgd2hlbiBwcm92aWRlZCwgb3RoZXJ3aXNlIHRoZSBkZWZhdWx0IGZldGNoLWJhc2VkIGNsaWVudC5cbiAgICovXG4gIHByaXZhdGUgZ2V0SHR0cENsaWVudCgpOiBIdHRwQ2xpZW50IHtcbiAgICByZXR1cm4gdGhpcy5faHR0cENsaWVudCA/PyB0aGlzLmRlZmF1bHRIdHRwQ2xpZW50O1xuICB9XG5cbiAgLyoqXG4gICAqIEJ1aWxkcyBhIFVSTCByZWxhdGl2ZSB0byB0aGUgY29uZmlndXJlZCBiYXNlIFVSTC5cbiAgICpcbiAgICogVW5kZWZpbmVkIGFuZCBudWxsIHF1ZXJ5IHBhcmFtcyBhcmUgb21pdHRlZC4gVmFsdWVzIGFyZSBzdHJpbmdpZmllZC5cbiAgICpcbiAgICogQHBhcmFtIHBhdGggLSBSZWxhdGl2ZSBBUEkgcGF0aCB0byBhcHBlbmQgdG8gdGhlIGNvbmZpZ3VyZWQgYmFzZSBVUkwuXG4gICAqIEBwYXJhbSBwYXJhbXMgLSBPcHRpb25hbCBxdWVyeSBwYXJhbWV0ZXJzIHRvIGVuY29kZSBvbnRvIHRoZSBVUkwuXG4gICAqIEByZXR1cm5zIEZ1bGx5LXF1YWxpZmllZCByZXF1ZXN0IFVSTCBzdHJpbmcuXG4gICAqL1xuICBwcml2YXRlIGJ1aWxkVXJsKHBhdGg6IHN0cmluZywgcGFyYW1zPzogUmVjb3JkPHN0cmluZywgdW5rbm93bj4pOiBzdHJpbmcge1xuICAgIGNvbnN0IHVybCA9IG5ldyBVUkwocGF0aCwgdGhpcy5vcHRpb25zLmJhc2VVcmwpO1xuICAgIGlmIChwYXJhbXMpIHtcbiAgICAgIGZvciAoY29uc3QgW2tleSwgdmFsdWVdIG9mIE9iamVjdC5lbnRyaWVzKHBhcmFtcykpIHtcbiAgICAgICAgaWYgKHZhbHVlICE9PSB1bmRlZmluZWQgJiYgdmFsdWUgIT09IG51bGwpIHtcbiAgICAgICAgICB1cmwuc2VhcmNoUGFyYW1zLnNldChrZXksIFN0cmluZyh2YWx1ZSkpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiB1cmwudG9TdHJpbmcoKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBXcmFwcyBhIHJlcXVlc3Qgd2l0aCBjb25zaXN0ZW50IGVycm9yIGhhbmRsaW5nLlxuICAgKlxuICAgKiBAcGFyYW0gZm4gLSBBc3luYyByZXF1ZXN0IGZ1bmN0aW9uIHRvIGV4ZWN1dGUuXG4gICAqIEByZXR1cm5zIFRoZSByZXNvbHZlZCB2YWx1ZSBmcm9tIHRoZSByZXF1ZXN0IGZ1bmN0aW9uLlxuICAgKiBAdGhyb3dzIEFwaUVycm9yIHdoZW4gdGhlIHNlcnZlciByZXNwb25kcyB3aXRoIGEgbm9uLTJ4eCBzdGF0dXMuXG4gICAqIEB0aHJvd3MgTmV0d29ya0Vycm9yIGZvciBuZXR3b3JrIGZhaWx1cmVzIG9yIHVuZXhwZWN0ZWQgZXhjZXB0aW9ucy5cbiAgICovXG4gIHByaXZhdGUgYXN5bmMgcmVxdWVzdDxUPihmbjogKCkgPT4gUHJvbWlzZTxUPik6IFByb21pc2U8VD4ge1xuICAgIGxldCBsYXN0VGltZW91dEVycm9yOiBOZXR3b3JrRXJyb3IgfCB1bmRlZmluZWQ7XG5cbiAgICBmb3IgKGxldCBhdHRlbXB0ID0gMDsgYXR0ZW1wdCA8PSBNQVhfVElNRU9VVF9SRVRSSUVTOyBhdHRlbXB0KyspIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGZuKCk7XG4gICAgICAgIHRoaXMub25SZXF1ZXN0U3VjY2VzcygpO1xuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgaWYgKGVycm9yIGluc3RhbmNlb2YgUmVzcG9uc2UpIHtcbiAgICAgICAgICAvLyBTZXJ2ZXIgcmVzcG9uZGVkIChldmVuIHdpdGggYW4gZXJyb3Igc3RhdHVzKSAtIGNvbm5lY3Rpb24gaXMgYWxpdmUsIHJlc2V0IGJhY2tvZmZcbiAgICAgICAgICB0aGlzLm9uUmVxdWVzdFN1Y2Nlc3MoKTtcbiAgICAgICAgICBsZXQgYm9keTogUmVjb3JkPHN0cmluZywgdW5rbm93bj4gPSB7fTtcbiAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgYm9keSA9IGF3YWl0IGVycm9yLmpzb24oKTtcbiAgICAgICAgICB9IGNhdGNoIChwYXJzZUVycm9yKSB7XG4gICAgICAgICAgICAvLyBTeW50YXhFcnJvciBpcyBleHBlY3RlZCB3aGVuIHNlcnZlciByZXR1cm5zIG5vbi1KU09OIGVycm9yIHJlc3BvbnNlIChlLmcuLCBIVE1MIGVycm9yIHBhZ2UpXG4gICAgICAgICAgICBpZiAoIShwYXJzZUVycm9yIGluc3RhbmNlb2YgU3ludGF4RXJyb3IpKSB7XG4gICAgICAgICAgICAgIGNvbnNvbGUud2FybignW0NhcmRzQ2xpZW50XSBVbmV4cGVjdGVkIGVycm9yIHBhcnNpbmcgZXJyb3IgcmVzcG9uc2U6JywgcGFyc2VFcnJvcik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGNvbnN0IG1lc3NhZ2UgPVxuICAgICAgICAgICAgKGJvZHlbJ2Vycm9yJ10gYXMgc3RyaW5nIHwgdW5kZWZpbmVkKSB8fCAoYm9keVsnbWVzc2FnZSddIGFzIHN0cmluZyB8IHVuZGVmaW5lZCkgfHwgZXJyb3Iuc3RhdHVzVGV4dDtcbiAgICAgICAgICBjb25zdCBjb2RlID0gKGJvZHlbJ2NvZGUnXSBhcyBzdHJpbmcgfCB1bmRlZmluZWQpIHx8IFN0cmluZyhlcnJvci5zdGF0dXMpO1xuICAgICAgICAgIGNvbnN0IGZpZWxkcyA9IGJvZHlbJ2ZpZWxkcyddIGFzIEFycmF5PHsgZmllbGQ6IHN0cmluZzsgbWVzc2FnZTogc3RyaW5nIH0+IHwgdW5kZWZpbmVkO1xuICAgICAgICAgIHRocm93IG5ldyBBcGlFcnJvcihtZXNzYWdlLCBjb2RlLCBmaWVsZHMpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gTmV0d29yayBvciB0aW1lb3V0IGZhaWx1cmUgLSBpbmNyZWFzZSBiYWNrb2ZmIGZvciBuZXh0IGF0dGVtcHRcbiAgICAgICAgdGhpcy5vblJlcXVlc3RGYWlsdXJlKCk7XG5cbiAgICAgICAgaWYgKGVycm9yIGluc3RhbmNlb2YgRE9NRXhjZXB0aW9uICYmIGVycm9yLm5hbWUgPT09ICdUaW1lb3V0RXJyb3InKSB7XG4gICAgICAgICAgbGFzdFRpbWVvdXRFcnJvciA9IG5ldyBOZXR3b3JrRXJyb3IoJ1JlcXVlc3QgdGltZWQgb3V0JywgZXJyb3IpO1xuICAgICAgICAgIC8vIFJldHJ5IG9uIHRpbWVvdXQgLSBvblJlcXVlc3RGYWlsdXJlKCkgYWxyZWFkeSBpbmNyZWFzZWQgX2N1cnJlbnRUaW1lb3V0TXNcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIE5vbi10aW1lb3V0IG5ldHdvcmsgZXJyb3JzIChETlMgZmFpbHVyZSwgY29ubmVjdGlvbiByZWZ1c2VkKSBhcmUgbm90IHJldHJpZWRcbiAgICAgICAgdGhyb3cgbmV3IE5ldHdvcmtFcnJvcignUmVxdWVzdCBmYWlsZWQnLCBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IgOiB1bmRlZmluZWQpO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIEFsbCByZXRyeSBhdHRlbXB0cyBleGhhdXN0ZWRcbiAgICB0aHJvdyBsYXN0VGltZW91dEVycm9yITtcbiAgfVxuXG4gIC8vIC0tLSBDYXJkIE9wZXJhdGlvbnMgLS0tXG5cbiAgLyoqXG4gICAqIExpc3RzIGNhcmRzIHdpdGggb3B0aW9uYWwgZmlsdGVyaW5nLlxuICAgKlxuICAgKiBAcGFyYW0gb3B0aW9ucyAtIE9wdGlvbmFsIGZpbHRlciBhbmQgcGFnaW5hdGlvbiBvcHRpb25zLlxuICAgKiBAcmV0dXJucyBQcm9taXNlIHJlc29sdmluZyB0byBtYXRjaGluZyBjYXJkcy5cbiAgICogQHRocm93cyBBcGlFcnJvciB3aGVuIHRoZSBzZXJ2ZXIgcmVzcG9uZHMgd2l0aCBhbiBlcnJvci5cbiAgICogQHRocm93cyBOZXR3b3JrRXJyb3Igd2hlbiB0aGUgcmVxdWVzdCBmYWlscyB0byByZWFjaCB0aGUgc2VydmVyLlxuICAgKi9cbiAgYXN5bmMgbGlzdENhcmRzKG9wdGlvbnM/OiBMaXN0Q2FyZHNPcHRpb25zKTogUHJvbWlzZTxDYXJkW10+IHtcbiAgICBjb25zdCB1cmxTdHIgPSB0aGlzLmJ1aWxkVXJsKCcvY2FyZHMnLCB7XG4gICAgICB3b3Jrc3BhY2VQYXRoOiB0aGlzLm9wdGlvbnMud29ya3NwYWNlUGF0aCxcbiAgICAgIHN0YXR1czogb3B0aW9ucz8uc3RhdHVzLFxuICAgICAgc2VhcmNoOiBvcHRpb25zPy5zZWFyY2gsXG4gICAgICBsaW1pdDogb3B0aW9ucz8ubGltaXQsXG4gICAgICBvZmZzZXQ6IG9wdGlvbnM/Lm9mZnNldFxuICAgIH0pO1xuICAgIGNvbnN0IHVybCA9IG5ldyBVUkwodXJsU3RyKTtcbiAgICBmb3IgKGNvbnN0IHQgb2Ygb3B0aW9ucz8udGFncyA/PyBbXSkge1xuICAgICAgdXJsLnNlYXJjaFBhcmFtcy5hcHBlbmQoJ3RhZycsIHQpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5yZXF1ZXN0KCgpID0+IHRoaXMuZ2V0SHR0cENsaWVudCgpLmdldDxDYXJkW10+KHVybC50b1N0cmluZygpKSk7XG4gIH1cblxuICAvKipcbiAgICogTGlzdHMgY2FyZHMgYXMgbGlnaHR3ZWlnaHQgc3VtbWFyaWVzIGZvciBsaXN0IHZpZXdzLlxuICAgKlxuICAgKiBSZXR1cm5zIHByZS1mbGF0dGVuZWQgZmllbGRzIHN1aXRhYmxlIGZvciBkaXJlY3QgdXNlIGluIGxpc3QgcmVuZGVyaW5nLFxuICAgKiBvbWl0dGluZyBoZWF2eXdlaWdodCBmaWVsZHMgbGlrZSBgcGxhbkNvbnRlbnRgIGFuZCBgcmVwb3NpdG9yeVBhdGhgLlxuICAgKlxuICAgKiBAdGVtcGxhdGUgVCAtIFRoZSBleHBlY3RlZCBzdW1tYXJ5IHNoYXBlIChkZWZhdWx0IGBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPmApLlxuICAgKiBAcmV0dXJucyBQcm9taXNlIHJlc29sdmluZyB0byBjYXJkIHN1bW1hcmllcy5cbiAgICogQHRocm93cyBBcGlFcnJvciB3aGVuIHRoZSBzZXJ2ZXIgcmVzcG9uZHMgd2l0aCBhbiBlcnJvci5cbiAgICogQHRocm93cyBOZXR3b3JrRXJyb3Igd2hlbiB0aGUgcmVxdWVzdCBmYWlscyB0byByZWFjaCB0aGUgc2VydmVyLlxuICAgKi9cbiAgYXN5bmMgbGlzdENhcmRTdW1tYXJpZXM8VCA9IFJlY29yZDxzdHJpbmcsIHVua25vd24+PigpOiBQcm9taXNlPFRbXT4ge1xuICAgIGNvbnN0IHVybCA9IHRoaXMuYnVpbGRVcmwoJy9jYXJkcy9saXN0Jywge1xuICAgICAgd29ya3NwYWNlUGF0aDogdGhpcy5vcHRpb25zLndvcmtzcGFjZVBhdGhcbiAgICB9KTtcbiAgICByZXR1cm4gdGhpcy5yZXF1ZXN0KCgpID0+IHRoaXMuZ2V0SHR0cENsaWVudCgpLmdldDxUW10+KHVybCkpO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldHMgYSBzaW5nbGUgY2FyZCBieSBpZC5cbiAgICpcbiAgICogQHBhcmFtIGNhcmRJZCAtIFRoZSBpZCBvZiB0aGUgY2FyZCB0byByZXRyaWV2ZS5cbiAgICogQHJldHVybnMgUHJvbWlzZSByZXNvbHZpbmcgdG8gdGhlIGNhcmQuXG4gICAqIEB0aHJvd3MgQXBpRXJyb3Igd2hlbiB0aGUgc2VydmVyIHJlc3BvbmRzIHdpdGggYW4gZXJyb3IuXG4gICAqIEB0aHJvd3MgTmV0d29ya0Vycm9yIHdoZW4gdGhlIHJlcXVlc3QgZmFpbHMgdG8gcmVhY2ggdGhlIHNlcnZlci5cbiAgICovXG4gIGFzeW5jIGdldENhcmQoY2FyZElkOiBzdHJpbmcpOiBQcm9taXNlPENhcmQ+IHtcbiAgICBjb25zdCB1cmwgPSB0aGlzLmJ1aWxkVXJsKGAvY2FyZHMvJHtjYXJkSWR9YCwge1xuICAgICAgd29ya3NwYWNlUGF0aDogdGhpcy5vcHRpb25zLndvcmtzcGFjZVBhdGhcbiAgICB9KTtcbiAgICByZXR1cm4gdGhpcy5yZXF1ZXN0KCgpID0+IHRoaXMuZ2V0SHR0cENsaWVudCgpLmdldDxDYXJkPih1cmwpKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDcmVhdGVzIGEgbmV3IGNhcmQuXG4gICAqXG4gICAqIEBwYXJhbSBkYXRhIC0gQ2FyZCBjcmVhdGlvbiBwYXlsb2FkLlxuICAgKiBAcmV0dXJucyBQcm9taXNlIHJlc29sdmluZyB0byB0aGUgY3JlYXRlZCBjYXJkLlxuICAgKiBAdGhyb3dzIEFwaUVycm9yIHdoZW4gdGhlIHNlcnZlciByZWplY3RzIHRoZSBwYXlsb2FkLlxuICAgKiBAdGhyb3dzIE5ldHdvcmtFcnJvciB3aGVuIHRoZSByZXF1ZXN0IGZhaWxzIHRvIHJlYWNoIHRoZSBzZXJ2ZXIuXG4gICAqL1xuICBhc3luYyBjcmVhdGVDYXJkKGRhdGE6IENhcmRDcmVhdGVEYXRhKTogUHJvbWlzZTxDYXJkPiB7XG4gICAgY29uc3QgdXJsID0gdGhpcy5idWlsZFVybCgnL2NhcmRzJyk7XG4gICAgY29uc3QgYm9keSA9IHtcbiAgICAgIC4uLmRhdGEsXG4gICAgICB3b3Jrc3BhY2VQYXRoOiB0aGlzLm9wdGlvbnMud29ya3NwYWNlUGF0aFxuICAgIH07XG4gICAgcmV0dXJuIHRoaXMucmVxdWVzdCgoKSA9PiB0aGlzLmdldEh0dHBDbGllbnQoKS5wb3N0PENhcmQ+KHVybCwgYm9keSkpO1xuICB9XG5cbiAgLyoqXG4gICAqIFVwZGF0ZXMgYW4gZXhpc3RpbmcgY2FyZC5cbiAgICpcbiAgICogQHBhcmFtIGNhcmRJZCAtIFRoZSBpZCBvZiB0aGUgY2FyZCB0byB1cGRhdGUuXG4gICAqIEBwYXJhbSBkYXRhIC0gVGhlIGZpZWxkcyB0byB1cGRhdGUuXG4gICAqIEByZXR1cm5zIFByb21pc2UgcmVzb2x2aW5nIHRvIHRoZSB1cGRhdGVkIGNhcmQuXG4gICAqIEB0aHJvd3MgQXBpRXJyb3Igd2hlbiB0aGUgc2VydmVyIHJlamVjdHMgdGhlIHVwZGF0ZS5cbiAgICogQHRocm93cyBOZXR3b3JrRXJyb3Igd2hlbiB0aGUgcmVxdWVzdCBmYWlscyB0byByZWFjaCB0aGUgc2VydmVyLlxuICAgKiBAZGVwcmVjYXRlZCBVc2UgZGlyZWN0IGdpdCBvcGVyYXRpb25zIGluc3RlYWQuIFRoaXMgZW5kcG9pbnQgd2lsbCBiZSByZW1vdmVkLlxuICAgKi9cbiAgYXN5bmMgdXBkYXRlQ2FyZChjYXJkSWQ6IHN0cmluZywgZGF0YTogQ2FyZFVwZGF0ZURhdGEpOiBQcm9taXNlPENhcmQ+IHtcbiAgICBjb25zdCB1cmwgPSB0aGlzLmJ1aWxkVXJsKGAvY2FyZHMvJHtjYXJkSWR9YCk7XG4gICAgcmV0dXJuIHRoaXMucmVxdWVzdCgoKSA9PiB0aGlzLmdldEh0dHBDbGllbnQoKS5wYXRjaDxDYXJkPih1cmwsIGRhdGEpKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBEZWxldGVzIGEgY2FyZC5cbiAgICpcbiAgICogQHBhcmFtIGNhcmRJZCAtIFRoZSBpZCBvZiB0aGUgY2FyZCB0byBkZWxldGUuXG4gICAqIEByZXR1cm5zIFByb21pc2UgcmVzb2x2aW5nIHdoZW4gZGVsZXRpb24gaXMgY29tcGxldGUuXG4gICAqIEB0aHJvd3MgQXBpRXJyb3Igd2hlbiB0aGUgc2VydmVyIHJlamVjdHMgdGhlIGRlbGV0ZS5cbiAgICogQHRocm93cyBOZXR3b3JrRXJyb3Igd2hlbiB0aGUgcmVxdWVzdCBmYWlscyB0byByZWFjaCB0aGUgc2VydmVyLlxuICAgKiBAZGVwcmVjYXRlZCBVc2UgZGlyZWN0IGdpdCBvcGVyYXRpb25zIGluc3RlYWQuIFRoaXMgZW5kcG9pbnQgd2lsbCBiZSByZW1vdmVkLlxuICAgKi9cbiAgYXN5bmMgZGVsZXRlQ2FyZChjYXJkSWQ6IHN0cmluZyk6IFByb21pc2U8dm9pZD4ge1xuICAgIGNvbnN0IHVybCA9IHRoaXMuYnVpbGRVcmwoYC9jYXJkcy8ke2NhcmRJZH1gKTtcbiAgICByZXR1cm4gdGhpcy5yZXF1ZXN0KCgpID0+IHRoaXMuZ2V0SHR0cENsaWVudCgpLmRlbGV0ZSh1cmwpKTtcbiAgfVxuXG4gIC8vIC0tLSBDb21tZW50IE9wZXJhdGlvbnMgLS0tXG5cbiAgLyoqXG4gICAqIEdldHMgYWxsIGNvbW1lbnRzIGZvciBhIGNhcmQuXG4gICAqXG4gICAqIEBwYXJhbSBjYXJkSWQgLSBJZGVudGlmaWVyIG9mIHRoZSB0YXJnZXQgY2FyZCBmb3IgdGhpcyByZXF1ZXN0LlxuICAgKiBAcmV0dXJucyBQcm9taXNlIHJlc29sdmluZyB0byB0aGUgY29tbWVudCBsaXN0LlxuICAgKiBAdGhyb3dzIEFwaUVycm9yIHdoZW4gdGhlIHNlcnZlciByZXNwb25kcyB3aXRoIGFuIGVycm9yLlxuICAgKiBAdGhyb3dzIE5ldHdvcmtFcnJvciB3aGVuIHRoZSByZXF1ZXN0IGZhaWxzIHRvIHJlYWNoIHRoZSBzZXJ2ZXIuXG4gICAqL1xuICBhc3luYyBnZXRDb21tZW50cyhjYXJkSWQ6IHN0cmluZyk6IFByb21pc2U8Q29tbWVudFtdPiB7XG4gICAgY29uc3QgdXJsID0gdGhpcy5idWlsZFVybChgL2NhcmRzLyR7Y2FyZElkfS9jb21tZW50c2ApO1xuICAgIHJldHVybiB0aGlzLnJlcXVlc3QoKCkgPT4gdGhpcy5nZXRIdHRwQ2xpZW50KCkuZ2V0PENvbW1lbnRbXT4odXJsKSk7XG4gIH1cblxuICAvKipcbiAgICogR2V0cyBhIHNpbmdsZSBjb21tZW50IGJ5IGlkLlxuICAgKlxuICAgKiBAcGFyYW0gY2FyZElkIC0gSWRlbnRpZmllciBvZiB0aGUgY2FyZCB0aGF0IG93bnMgdGhlIHJlcXVlc3RlZCBjb21tZW50LlxuICAgKiBAcGFyYW0gY29tbWVudElkIC0gSWRlbnRpZmllciBvZiB0aGUgY29tbWVudCB0byByZXRyaWV2ZS5cbiAgICogQHJldHVybnMgUHJvbWlzZSByZXNvbHZpbmcgdG8gdGhlIGNvbW1lbnQuXG4gICAqIEB0aHJvd3MgQXBpRXJyb3Igd2hlbiB0aGUgc2VydmVyIHJlc3BvbmRzIHdpdGggYW4gZXJyb3IuXG4gICAqIEB0aHJvd3MgTmV0d29ya0Vycm9yIHdoZW4gdGhlIHJlcXVlc3QgZmFpbHMgdG8gcmVhY2ggdGhlIHNlcnZlci5cbiAgICovXG4gIGFzeW5jIGdldENvbW1lbnQoY2FyZElkOiBzdHJpbmcsIGNvbW1lbnRJZDogc3RyaW5nKTogUHJvbWlzZTxDb21tZW50PiB7XG4gICAgY29uc3QgdXJsID0gdGhpcy5idWlsZFVybChgL2NhcmRzLyR7Y2FyZElkfS9jb21tZW50cy8ke2NvbW1lbnRJZH1gKTtcbiAgICByZXR1cm4gdGhpcy5yZXF1ZXN0KCgpID0+IHRoaXMuZ2V0SHR0cENsaWVudCgpLmdldDxDb21tZW50Pih1cmwpKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDcmVhdGVzIGEgbmV3IGNvbW1lbnQgb24gYSBjYXJkLlxuICAgKlxuICAgKiBAcGFyYW0gY2FyZElkIC0gSWRlbnRpZmllciBvZiB0aGUgY2FyZCB0aGF0IHdpbGwgcmVjZWl2ZSB0aGUgbmV3IGNvbW1lbnQuXG4gICAqIEBwYXJhbSBkYXRhIC0gQ29tbWVudCBjcmVhdGlvbiBwYXlsb2FkLlxuICAgKiBAcmV0dXJucyBQcm9taXNlIHJlc29sdmluZyB0byB0aGUgY3JlYXRlZCBjb21tZW50LlxuICAgKiBAdGhyb3dzIEFwaUVycm9yIHdoZW4gdGhlIHNlcnZlciByZWplY3RzIHRoZSBwYXlsb2FkLlxuICAgKiBAdGhyb3dzIE5ldHdvcmtFcnJvciB3aGVuIHRoZSByZXF1ZXN0IGZhaWxzIHRvIHJlYWNoIHRoZSBzZXJ2ZXIuXG4gICAqIEBkZXByZWNhdGVkIFVzZSBkaXJlY3QgZ2l0IG9wZXJhdGlvbnMgaW5zdGVhZC4gVGhpcyBlbmRwb2ludCB3aWxsIGJlIHJlbW92ZWQuXG4gICAqL1xuICBhc3luYyBjcmVhdGVDb21tZW50KGNhcmRJZDogc3RyaW5nLCBkYXRhOiBDb21tZW50Q3JlYXRlRGF0YSk6IFByb21pc2U8Q29tbWVudD4ge1xuICAgIGNvbnN0IHVybCA9IHRoaXMuYnVpbGRVcmwoYC9jYXJkcy8ke2NhcmRJZH0vY29tbWVudHNgKTtcbiAgICByZXR1cm4gdGhpcy5yZXF1ZXN0KCgpID0+IHRoaXMuZ2V0SHR0cENsaWVudCgpLnBvc3Q8Q29tbWVudD4odXJsLCBkYXRhKSk7XG4gIH1cblxuICAvKipcbiAgICogVXBkYXRlcyBhbiBleGlzdGluZyBjb21tZW50LlxuICAgKlxuICAgKiBAcGFyYW0gY2FyZElkIC0gSWRlbnRpZmllciBvZiB0aGUgY2FyZCB0aGF0IG93bnMgdGhlIGNvbW1lbnQuXG4gICAqIEBwYXJhbSBjb21tZW50SWQgLSBJZGVudGlmaWVyIG9mIHRoZSBjb21tZW50IHRvIHVwZGF0ZS5cbiAgICogQHBhcmFtIGRhdGEgLSBDb21tZW50IHVwZGF0ZSBwYXlsb2FkLlxuICAgKiBAcmV0dXJucyBQcm9taXNlIHJlc29sdmluZyB0byB0aGUgdXBkYXRlZCBjb21tZW50LlxuICAgKiBAdGhyb3dzIEFwaUVycm9yIHdoZW4gdGhlIHNlcnZlciByZWplY3RzIHRoZSB1cGRhdGUuXG4gICAqIEB0aHJvd3MgTmV0d29ya0Vycm9yIHdoZW4gdGhlIHJlcXVlc3QgZmFpbHMgdG8gcmVhY2ggdGhlIHNlcnZlci5cbiAgICogQGRlcHJlY2F0ZWQgVXNlIGRpcmVjdCBnaXQgb3BlcmF0aW9ucyBpbnN0ZWFkLiBUaGlzIGVuZHBvaW50IHdpbGwgYmUgcmVtb3ZlZC5cbiAgICovXG4gIGFzeW5jIHVwZGF0ZUNvbW1lbnQoY2FyZElkOiBzdHJpbmcsIGNvbW1lbnRJZDogc3RyaW5nLCBkYXRhOiBDb21tZW50VXBkYXRlRGF0YSk6IFByb21pc2U8Q29tbWVudD4ge1xuICAgIGNvbnN0IHVybCA9IHRoaXMuYnVpbGRVcmwoYC9jYXJkcy8ke2NhcmRJZH0vY29tbWVudHMvJHtjb21tZW50SWR9YCk7XG4gICAgcmV0dXJuIHRoaXMucmVxdWVzdCgoKSA9PiB0aGlzLmdldEh0dHBDbGllbnQoKS5wYXRjaDxDb21tZW50Pih1cmwsIGRhdGEpKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBEZWxldGVzIGEgY29tbWVudC5cbiAgICpcbiAgICogQHBhcmFtIGNhcmRJZCAtIElkZW50aWZpZXIgb2YgdGhlIGNhcmQgdGhhdCBvd25zIHRoZSBjb21tZW50LlxuICAgKiBAcGFyYW0gY29tbWVudElkIC0gSWRlbnRpZmllciBvZiB0aGUgY29tbWVudCB0byByZW1vdmUuXG4gICAqIEByZXR1cm5zIFByb21pc2UgcmVzb2x2aW5nIHdoZW4gZGVsZXRpb24gaXMgY29tcGxldGUuXG4gICAqIEB0aHJvd3MgQXBpRXJyb3Igd2hlbiB0aGUgc2VydmVyIHJlamVjdHMgdGhlIGRlbGV0ZS5cbiAgICogQHRocm93cyBOZXR3b3JrRXJyb3Igd2hlbiB0aGUgcmVxdWVzdCBmYWlscyB0byByZWFjaCB0aGUgc2VydmVyLlxuICAgKiBAZGVwcmVjYXRlZCBVc2UgZGlyZWN0IGdpdCBvcGVyYXRpb25zIGluc3RlYWQuIFRoaXMgZW5kcG9pbnQgd2lsbCBiZSByZW1vdmVkLlxuICAgKi9cbiAgYXN5bmMgZGVsZXRlQ29tbWVudChjYXJkSWQ6IHN0cmluZywgY29tbWVudElkOiBzdHJpbmcpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zdCB1cmwgPSB0aGlzLmJ1aWxkVXJsKGAvY2FyZHMvJHtjYXJkSWR9L2NvbW1lbnRzLyR7Y29tbWVudElkfWApO1xuICAgIHJldHVybiB0aGlzLnJlcXVlc3QoKCkgPT4gdGhpcy5nZXRIdHRwQ2xpZW50KCkuZGVsZXRlKHVybCkpO1xuICB9XG5cbiAgLy8gLS0tIEF0dGFjaG1lbnQgT3BlcmF0aW9ucyAtLS1cblxuICAvKipcbiAgICogVXBsb2FkcyBhbiBhdHRhY2htZW50IHRvIGEgY2FyZCB1c2luZyBiaW5hcnkgUFVULlxuICAgKlxuICAgKiBUaGlzIGlzIHRoZSBwcmVmZXJyZWQgbWV0aG9kIC0gc2VuZHMgcmF3IGJpbmFyeSBkYXRhIGRpcmVjdGx5IHdpdGhvdXRcbiAgICogYmFzZTY0IGVuY29kaW5nLCByZXN1bHRpbmcgaW4gMzMlIHNtYWxsZXIgcGF5bG9hZHMuXG4gICAqXG4gICAqIEBwYXJhbSBjYXJkSWQgLSBJZGVudGlmaWVyIG9mIHRoZSBjYXJkIHRoYXQgd2lsbCByZWNlaXZlIHRoZSBhdHRhY2htZW50LlxuICAgKiBAcGFyYW0gbmFtZSAtIEZpbGUgbmFtZSBpbmNsdWRpbmcgZXh0ZW5zaW9uLlxuICAgKiBAcGFyYW0gZGF0YSAtIEJpbmFyeSBkYXRhIGFzIEJsb2IsIEFycmF5QnVmZmVyLCBvciBiYXNlNjQgc3RyaW5nLlxuICAgKiBAcmV0dXJucyBQcm9taXNlIHJlc29sdmluZyB0byBhdHRhY2htZW50IG1ldGFkYXRhLlxuICAgKiBAdGhyb3dzIEFwaUVycm9yIHdoZW4gdGhlIHNlcnZlciByZWplY3RzIHRoZSB1cGxvYWQuXG4gICAqIEB0aHJvd3MgTmV0d29ya0Vycm9yIHdoZW4gdGhlIHJlcXVlc3QgZmFpbHMgdG8gcmVhY2ggdGhlIHNlcnZlci5cbiAgICovXG4gIGFzeW5jIHVwbG9hZEF0dGFjaG1lbnQoY2FyZElkOiBzdHJpbmcsIG5hbWU6IHN0cmluZywgZGF0YTogQmxvYiB8IEFycmF5QnVmZmVyIHwgc3RyaW5nKTogUHJvbWlzZTxBdHRhY2htZW50UmVzcG9uc2U+IHtcbiAgICBjb25zdCB1cmwgPSB0aGlzLmJ1aWxkVXJsKGAvY2FyZHMvJHtjYXJkSWR9L2F0dGFjaG1lbnRzLyR7ZW5jb2RlVVJJQ29tcG9uZW50KG5hbWUpfWApO1xuXG4gICAgLy8gQ29udmVydCBkYXRhIHRvIEJsb2IgZm9yIGZldGNoIGJvZHlcbiAgICBsZXQgYm9keTogQmxvYjtcbiAgICBpZiAoZGF0YSBpbnN0YW5jZW9mIEJsb2IpIHtcbiAgICAgIGJvZHkgPSBkYXRhO1xuICAgIH0gZWxzZSBpZiAoZGF0YSBpbnN0YW5jZW9mIEFycmF5QnVmZmVyKSB7XG4gICAgICBib2R5ID0gbmV3IEJsb2IoW2RhdGFdKTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gYmFzZTY0IHN0cmluZyAtIGRlY29kZSB0byBiaW5hcnlcbiAgICAgIGNvbnN0IGJpbmFyeVN0cmluZyA9IGF0b2IoZGF0YSk7XG4gICAgICBjb25zdCBieXRlcyA9IG5ldyBVaW50OEFycmF5KGJpbmFyeVN0cmluZy5sZW5ndGgpO1xuICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBiaW5hcnlTdHJpbmcubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgYnl0ZXNbaV0gPSBiaW5hcnlTdHJpbmcuY2hhckNvZGVBdChpKTtcbiAgICAgIH1cbiAgICAgIGJvZHkgPSBuZXcgQmxvYihbYnl0ZXNdKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5yZXF1ZXN0KGFzeW5jICgpID0+IHtcbiAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZmV0Y2godXJsLCB7XG4gICAgICAgIG1ldGhvZDogJ1BVVCcsXG4gICAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgICAuLi50aGlzLmdldEhlYWRlcnMoKSxcbiAgICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL29jdGV0LXN0cmVhbSdcbiAgICAgICAgfSxcbiAgICAgICAgYm9keSxcbiAgICAgICAgc2lnbmFsOiB0aGlzLmdldFRpbWVvdXRTaWduYWwoKVxuICAgICAgfSk7XG4gICAgICBpZiAoIXJlc3BvbnNlLm9rKSB0aHJvdyByZXNwb25zZTtcbiAgICAgIHJldHVybiByZXNwb25zZS5qc29uKCkgYXMgUHJvbWlzZTxBdHRhY2htZW50UmVzcG9uc2U+O1xuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIERvd25sb2FkcyBhbiBhdHRhY2htZW50IGFzIGEgQmxvYi5cbiAgICpcbiAgICogVGhpcyBtZXRob2QgdXNlcyBgZmV0Y2hgIGRpcmVjdGx5IHNvIGJpbmFyeSBkYXRhIGlzIHByZXNlcnZlZC5cbiAgICpcbiAgICogQHBhcmFtIGNhcmRJZCAtIElkZW50aWZpZXIgb2YgdGhlIGNhcmQgdGhhdCBvd25zIHRoZSBhdHRhY2htZW50LlxuICAgKiBAcGFyYW0gYXR0YWNobWVudElkIC0gSWRlbnRpZmllciBvZiB0aGUgYXR0YWNobWVudCBibG9iIHRvIGRvd25sb2FkLlxuICAgKiBAcmV0dXJucyBQcm9taXNlIHJlc29sdmluZyB0byBhbiBhdHRhY2htZW50IEJsb2IuXG4gICAqIEB0aHJvd3MgQXBpRXJyb3Igd2hlbiB0aGUgc2VydmVyIHJlc3BvbmRzIHdpdGggYW4gZXJyb3IuXG4gICAqIEB0aHJvd3MgTmV0d29ya0Vycm9yIHdoZW4gdGhlIHJlcXVlc3QgZmFpbHMgdG8gcmVhY2ggdGhlIHNlcnZlci5cbiAgICovXG4gIGFzeW5jIGdldEF0dGFjaG1lbnQoY2FyZElkOiBzdHJpbmcsIGF0dGFjaG1lbnRJZDogc3RyaW5nKTogUHJvbWlzZTxCbG9iPiB7XG4gICAgY29uc3QgdXJsID0gdGhpcy5idWlsZFVybChgL2NhcmRzLyR7Y2FyZElkfS9hdHRhY2htZW50cy8ke2F0dGFjaG1lbnRJZH1gKTtcbiAgICByZXR1cm4gdGhpcy5yZXF1ZXN0KGFzeW5jICgpID0+IHtcbiAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZmV0Y2godXJsLCB7XG4gICAgICAgIGhlYWRlcnM6IHRoaXMuZ2V0SGVhZGVycygpLFxuICAgICAgICBzaWduYWw6IHRoaXMuZ2V0VGltZW91dFNpZ25hbCgpXG4gICAgICB9KTtcbiAgICAgIGlmICghcmVzcG9uc2Uub2spIHRocm93IHJlc3BvbnNlO1xuICAgICAgcmV0dXJuIHJlc3BvbnNlLmJsb2IoKTtcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBMaXN0cyBhdHRhY2htZW50cyBmb3IgYSBjYXJkLlxuICAgKlxuICAgKiBAcGFyYW0gY2FyZElkIC0gSWRlbnRpZmllciBvZiB0aGUgY2FyZCB3aG9zZSBhdHRhY2htZW50cyBzaG91bGQgYmUgbGlzdGVkLlxuICAgKiBAcmV0dXJucyBQcm9taXNlIHJlc29sdmluZyB0byBhdHRhY2htZW50IG1ldGFkYXRhLlxuICAgKiBAdGhyb3dzIEFwaUVycm9yIHdoZW4gdGhlIHNlcnZlciByZXNwb25kcyB3aXRoIGFuIGVycm9yLlxuICAgKiBAdGhyb3dzIE5ldHdvcmtFcnJvciB3aGVuIHRoZSByZXF1ZXN0IGZhaWxzIHRvIHJlYWNoIHRoZSBzZXJ2ZXIuXG4gICAqL1xuICBhc3luYyBsaXN0QXR0YWNobWVudHMoY2FyZElkOiBzdHJpbmcpOiBQcm9taXNlPEF0dGFjaG1lbnRSZXNwb25zZVtdPiB7XG4gICAgY29uc3QgdXJsID0gdGhpcy5idWlsZFVybChgL2NhcmRzLyR7Y2FyZElkfS9hdHRhY2htZW50c2ApO1xuICAgIHJldHVybiB0aGlzLnJlcXVlc3QoKCkgPT4gdGhpcy5nZXRIdHRwQ2xpZW50KCkuZ2V0PEF0dGFjaG1lbnRSZXNwb25zZVtdPih1cmwpKTtcbiAgfVxuXG4gIC8vIC0tLSBUaW1lbGluZSBPcGVyYXRpb25zIC0tLVxuXG4gIC8qKlxuICAgKiBHZXRzIHRpbWVsaW5lIGVudHJpZXMgZm9yIGEgY2FyZCB3aXRoIG9wdGlvbmFsIHBhZ2luYXRpb24uXG4gICAqXG4gICAqIEBwYXJhbSBjYXJkSWQgLSBJZGVudGlmaWVyIG9mIHRoZSBjYXJkIHdob3NlIHRpbWVsaW5lIGVudHJpZXMgc2hvdWxkIGJlIHJldHVybmVkLlxuICAgKiBAcGFyYW0gb3B0aW9ucyAtIE9wdGlvbmFsIHBhZ2luYXRpb24gY29udHJvbHMuXG4gICAqIEByZXR1cm5zIFByb21pc2UgcmVzb2x2aW5nIHRvIHRpbWVsaW5lIGVudHJpZXMuXG4gICAqIEB0aHJvd3MgQXBpRXJyb3Igd2hlbiB0aGUgc2VydmVyIHJlc3BvbmRzIHdpdGggYW4gZXJyb3IuXG4gICAqIEB0aHJvd3MgTmV0d29ya0Vycm9yIHdoZW4gdGhlIHJlcXVlc3QgZmFpbHMgdG8gcmVhY2ggdGhlIHNlcnZlci5cbiAgICovXG4gIGFzeW5jIGdldFRpbWVsaW5lKGNhcmRJZDogc3RyaW5nLCBvcHRpb25zPzogVGltZWxpbmVPcHRpb25zKTogUHJvbWlzZTxUaW1lbGluZUl0ZW1bXT4ge1xuICAgIGNvbnN0IHVybCA9IHRoaXMuYnVpbGRVcmwoYC9jYXJkcy8ke2NhcmRJZH0vdGltZWxpbmVgLCB7XG4gICAgICBiZWZvcmU6IG9wdGlvbnM/LmJlZm9yZSxcbiAgICAgIGxpbWl0OiBvcHRpb25zPy5saW1pdFxuICAgIH0pO1xuICAgIHJldHVybiB0aGlzLnJlcXVlc3QoKCkgPT4gdGhpcy5nZXRIdHRwQ2xpZW50KCkuZ2V0PFRpbWVsaW5lSXRlbVtdPih1cmwpKTtcbiAgfVxuXG4gIC8vIC0tLSBQbGFuIE9wZXJhdGlvbnMgLS0tXG5cbiAgLyoqXG4gICAqIEdldHMgdGhlIHBsYW4gZG9jdW1lbnQgZm9yIGEgY2FyZCBhcyBtYXJrZG93bi5cbiAgICpcbiAgICogQHBhcmFtIGNhcmRJZCAtIElkZW50aWZpZXIgb2YgdGhlIGNhcmQgd2hvc2UgcGxhbiBtYXJrZG93biBzaG91bGQgYmUgcmV0dXJuZWQuXG4gICAqIEByZXR1cm5zIFByb21pc2UgcmVzb2x2aW5nIHRvIHBsYW4gbWFya2Rvd24uXG4gICAqIEB0aHJvd3MgQXBpRXJyb3Igd2hlbiB0aGUgc2VydmVyIHJlc3BvbmRzIHdpdGggYW4gZXJyb3IuXG4gICAqIEB0aHJvd3MgTmV0d29ya0Vycm9yIHdoZW4gdGhlIHJlcXVlc3QgZmFpbHMgdG8gcmVhY2ggdGhlIHNlcnZlci5cbiAgICovXG4gIGFzeW5jIGdldFBsYW4oY2FyZElkOiBzdHJpbmcpOiBQcm9taXNlPHN0cmluZz4ge1xuICAgIGNvbnN0IHVybCA9IHRoaXMuYnVpbGRVcmwoYC9jYXJkcy8ke2NhcmRJZH0vcGxhbmApO1xuICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgdGhpcy5yZXF1ZXN0KCgpID0+IHRoaXMuZ2V0SHR0cENsaWVudCgpLmdldDx7IGNvbnRlbnQ6IHN0cmluZyB9Pih1cmwpKTtcbiAgICByZXR1cm4gcmVzcG9uc2UuY29udGVudDtcbiAgfVxuXG4gIC8qKlxuICAgKiBVcGRhdGVzIHRoZSBwbGFuIGRvY3VtZW50IGZvciBhIGNhcmQuXG4gICAqXG4gICAqIEBwYXJhbSBjYXJkSWQgLSBJZGVudGlmaWVyIG9mIHRoZSBjYXJkIHdob3NlIHBsYW4gbWFya2Rvd24gc2hvdWxkIGJlIHVwZGF0ZWQuXG4gICAqIEBwYXJhbSBjb250ZW50IC0gUGxhbiBtYXJrZG93biBjb250ZW50LlxuICAgKiBAcmV0dXJucyBQcm9taXNlIHJlc29sdmluZyB3aGVuIHRoZSBwbGFuIGlzIHNhdmVkLlxuICAgKiBAdGhyb3dzIEFwaUVycm9yIHdoZW4gdGhlIHNlcnZlciByZWplY3RzIHRoZSB1cGRhdGUuXG4gICAqIEB0aHJvd3MgTmV0d29ya0Vycm9yIHdoZW4gdGhlIHJlcXVlc3QgZmFpbHMgdG8gcmVhY2ggdGhlIHNlcnZlci5cbiAgICogQGRlcHJlY2F0ZWQgVXNlIGRpcmVjdCBnaXQgb3BlcmF0aW9ucyBpbnN0ZWFkLiBUaGlzIGVuZHBvaW50IHdpbGwgYmUgcmVtb3ZlZC5cbiAgICovXG4gIGFzeW5jIHVwZGF0ZVBsYW4oY2FyZElkOiBzdHJpbmcsIGNvbnRlbnQ6IHN0cmluZyk6IFByb21pc2U8dm9pZD4ge1xuICAgIGNvbnN0IHVybCA9IHRoaXMuYnVpbGRVcmwoYC9jYXJkcy8ke2NhcmRJZH0vcGxhbmApO1xuICAgIHJldHVybiB0aGlzLnJlcXVlc3QoKCkgPT4gdGhpcy5nZXRIdHRwQ2xpZW50KCkucHV0PHZvaWQ+KHVybCwgY29udGVudCkpO1xuICB9XG5cbiAgLy8gLS0tIEV2YWx1YXRpb24gT3BlcmF0aW9ucyAtLS1cblxuICAvKipcbiAgICogR2V0cyB0aGUgZXZhbHVhdGlvbiBkb2N1bWVudCBmb3IgYSBjYXJkIGFzIG1hcmtkb3duLlxuICAgKlxuICAgKiBAcGFyYW0gY2FyZElkIC0gSWRlbnRpZmllciBvZiB0aGUgY2FyZCB3aG9zZSBldmFsdWF0aW9uIG1hcmtkb3duIHNob3VsZCBiZSByZXR1cm5lZC5cbiAgICogQHJldHVybnMgUHJvbWlzZSByZXNvbHZpbmcgdG8gZXZhbHVhdGlvbiBtYXJrZG93bi5cbiAgICogQHRocm93cyBBcGlFcnJvciB3aGVuIHRoZSBzZXJ2ZXIgcmVzcG9uZHMgd2l0aCBhbiBlcnJvci5cbiAgICogQHRocm93cyBOZXR3b3JrRXJyb3Igd2hlbiB0aGUgcmVxdWVzdCBmYWlscyB0byByZWFjaCB0aGUgc2VydmVyLlxuICAgKi9cbiAgYXN5bmMgZ2V0RXZhbHVhdGlvbihjYXJkSWQ6IHN0cmluZyk6IFByb21pc2U8c3RyaW5nPiB7XG4gICAgY29uc3QgdXJsID0gdGhpcy5idWlsZFVybChgL2NhcmRzLyR7Y2FyZElkfS9ldmFsdWF0aW9uYCk7XG4gICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCB0aGlzLnJlcXVlc3QoKCkgPT4gdGhpcy5nZXRIdHRwQ2xpZW50KCkuZ2V0PHsgY29udGVudDogc3RyaW5nIH0+KHVybCkpO1xuICAgIHJldHVybiByZXNwb25zZS5jb250ZW50O1xuICB9XG5cbiAgLyoqXG4gICAqIFVwZGF0ZXMgdGhlIGV2YWx1YXRpb24gZG9jdW1lbnQgZm9yIGEgY2FyZC5cbiAgICpcbiAgICogQHBhcmFtIGNhcmRJZCAtIElkZW50aWZpZXIgb2YgdGhlIGNhcmQgd2hvc2UgZXZhbHVhdGlvbiBtYXJrZG93biBzaG91bGQgYmUgdXBkYXRlZC5cbiAgICogQHBhcmFtIGNvbnRlbnQgLSBFdmFsdWF0aW9uIG1hcmtkb3duIGNvbnRlbnQuXG4gICAqIEByZXR1cm5zIFByb21pc2UgcmVzb2x2aW5nIHdoZW4gdGhlIGV2YWx1YXRpb24gaXMgc2F2ZWQuXG4gICAqIEB0aHJvd3MgQXBpRXJyb3Igd2hlbiB0aGUgc2VydmVyIHJlamVjdHMgdGhlIHVwZGF0ZS5cbiAgICogQHRocm93cyBOZXR3b3JrRXJyb3Igd2hlbiB0aGUgcmVxdWVzdCBmYWlscyB0byByZWFjaCB0aGUgc2VydmVyLlxuICAgKiBAZGVwcmVjYXRlZCBVc2UgZGlyZWN0IGdpdCBvcGVyYXRpb25zIGluc3RlYWQuIFRoaXMgZW5kcG9pbnQgd2lsbCBiZSByZW1vdmVkLlxuICAgKi9cbiAgYXN5bmMgdXBkYXRlRXZhbHVhdGlvbihjYXJkSWQ6IHN0cmluZywgY29udGVudDogc3RyaW5nKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc3QgdXJsID0gdGhpcy5idWlsZFVybChgL2NhcmRzLyR7Y2FyZElkfS9ldmFsdWF0aW9uYCk7XG4gICAgcmV0dXJuIHRoaXMucmVxdWVzdCgoKSA9PiB0aGlzLmdldEh0dHBDbGllbnQoKS5wdXQ8dm9pZD4odXJsLCBjb250ZW50KSk7XG4gIH1cblxuICAvLyAtLS0gR2F0ZSBPcGVyYXRpb25zIC0tLVxuXG4gIC8qKlxuICAgKiBBcHByb3ZlcyBhIGdhdGUgZm9yIGEgY2FyZC5cbiAgICpcbiAgICogQHBhcmFtIGNhcmRJZCAtIElkZW50aWZpZXIgb2YgdGhlIGNhcmQgd2hvc2UgZ2F0ZSBzdGF0ZSBzaG91bGQgYmUgdXBkYXRlZC5cbiAgICogQHBhcmFtIGdhdGVOYW1lIC0gR2F0ZSBuYW1lIHRvIGFwcHJvdmUuXG4gICAqIEByZXR1cm5zIFByb21pc2UgcmVzb2x2aW5nIHRvIGdhdGUgYXBwcm92YWwgbWV0YWRhdGEuXG4gICAqIEB0aHJvd3MgQXBpRXJyb3Igd2hlbiB0aGUgc2VydmVyIHJlamVjdHMgdGhlIGFwcHJvdmFsLlxuICAgKiBAdGhyb3dzIE5ldHdvcmtFcnJvciB3aGVuIHRoZSByZXF1ZXN0IGZhaWxzIHRvIHJlYWNoIHRoZSBzZXJ2ZXIuXG4gICAqIEBkZXByZWNhdGVkIFVzZSBkaXJlY3QgZ2l0IG9wZXJhdGlvbnMgaW5zdGVhZC4gVGhpcyBlbmRwb2ludCB3aWxsIGJlIHJlbW92ZWQuXG4gICAqL1xuICBhc3luYyBhcHByb3ZlR2F0ZShjYXJkSWQ6IHN0cmluZywgZ2F0ZU5hbWU6ICdwbGFuJyB8ICdtZXJnZVJlcXVlc3QnKTogUHJvbWlzZTxHYXRlQXBwcm92YWxSZXNwb25zZT4ge1xuICAgIGNvbnN0IHVybCA9IHRoaXMuYnVpbGRVcmwoYC9jYXJkcy8ke2NhcmRJZH0vZ2F0ZXMvJHtnYXRlTmFtZX0vYXBwcm92ZWApO1xuICAgIHJldHVybiB0aGlzLnJlcXVlc3QoKCkgPT4gdGhpcy5nZXRIdHRwQ2xpZW50KCkucG9zdDxHYXRlQXBwcm92YWxSZXNwb25zZT4odXJsLCB1bmRlZmluZWQpKTtcbiAgfVxuXG4gIC8vIC0tLSBDb21taXQgT3BlcmF0aW9ucyAtLS1cblxuICAvKipcbiAgICogR2V0cyBhbGwgY29tbWl0cyBhc3NvY2lhdGVkIHdpdGggYSBjYXJkLlxuICAgKlxuICAgKiBAcGFyYW0gY2FyZElkIC0gSWRlbnRpZmllciBvZiB0aGUgY2FyZCB3aG9zZSBjb21taXRzIHNob3VsZCBiZSByZXR1cm5lZC5cbiAgICogQHJldHVybnMgUHJvbWlzZSByZXNvbHZpbmcgdG8gY29tbWl0IG1ldGFkYXRhLlxuICAgKiBAdGhyb3dzIEFwaUVycm9yIHdoZW4gdGhlIHNlcnZlciByZXNwb25kcyB3aXRoIGFuIGVycm9yLlxuICAgKiBAdGhyb3dzIE5ldHdvcmtFcnJvciB3aGVuIHRoZSByZXF1ZXN0IGZhaWxzIHRvIHJlYWNoIHRoZSBzZXJ2ZXIuXG4gICAqL1xuICBhc3luYyBnZXRDb21taXRzKGNhcmRJZDogc3RyaW5nKTogUHJvbWlzZTxDb21taXRJbmZvW10+IHtcbiAgICBjb25zdCB1cmwgPSB0aGlzLmJ1aWxkVXJsKGAvY2FyZHMvJHtjYXJkSWR9L2NvbW1pdHNgKTtcbiAgICByZXR1cm4gdGhpcy5yZXF1ZXN0KCgpID0+IHRoaXMuZ2V0SHR0cENsaWVudCgpLmdldDxDb21taXRJbmZvW10+KHVybCkpO1xuICB9XG5cbiAgLyoqXG4gICAqIEFkZHMgYSBjb21taXQgdG8gYSBjYXJkLlxuICAgKlxuICAgKiBAcGFyYW0gY2FyZElkIC0gSWRlbnRpZmllciBvZiB0aGUgY2FyZCB0byBhc3NvY2lhdGUgd2l0aCB0aGUgY29tbWl0IFNIQS5cbiAgICogQHBhcmFtIHNoYSAtIEdpdCBjb21taXQgc2hhLlxuICAgKiBAcmV0dXJucyBQcm9taXNlIHJlc29sdmluZyB0byBjb21taXQgbWV0YWRhdGEuXG4gICAqIEB0aHJvd3MgQXBpRXJyb3Igd2hlbiB0aGUgc2VydmVyIHJlamVjdHMgdGhlIHVwZGF0ZS5cbiAgICogQHRocm93cyBOZXR3b3JrRXJyb3Igd2hlbiB0aGUgcmVxdWVzdCBmYWlscyB0byByZWFjaCB0aGUgc2VydmVyLlxuICAgKi9cbiAgYXN5bmMgYWRkQ29tbWl0KGNhcmRJZDogc3RyaW5nLCBzaGE6IHN0cmluZyk6IFByb21pc2U8Q29tbWl0SW5mbz4ge1xuICAgIGNvbnN0IHVybCA9IHRoaXMuYnVpbGRVcmwoYC9jYXJkcy8ke2NhcmRJZH0vY29tbWl0c2ApO1xuICAgIHJldHVybiB0aGlzLnJlcXVlc3QoKCkgPT4gdGhpcy5nZXRIdHRwQ2xpZW50KCkucG9zdDxDb21taXRJbmZvPih1cmwsIHsgc2hhIH0pKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZW1vdmVzIGEgY29tbWl0IGZyb20gYSBjYXJkLlxuICAgKlxuICAgKiBAcGFyYW0gY2FyZElkIC0gSWRlbnRpZmllciBvZiB0aGUgY2FyZCB0byBkZXRhY2ggZnJvbSB0aGUgY29tbWl0IFNIQS5cbiAgICogQHBhcmFtIHNoYSAtIEdpdCBjb21taXQgc2hhLlxuICAgKiBAcGFyYW0gb3B0aW9ucyAtIE9wdGlvbmFsIHBhcmFtZXRlcnMuXG4gICAqIEBwYXJhbSBvcHRpb25zLnNlc3Npb25JZCAtIENsYXVkZSBDb2RlIHNlc3Npb24gSUQgZm9yd2FyZGVkIGFzIGBYLUNhcmRzLVNlc3Npb24tSWRgIGhlYWRlciBzbyB0aGUgY2FyZCByZXBvIHBvc3QtY29tbWl0IGhvb2sgY2FuIGF0dHJpYnV0ZSB0aGUgY29tbWl0LlxuICAgKiBAcmV0dXJucyBQcm9taXNlIHJlc29sdmluZyB3aGVuIHJlbW92YWwgaXMgY29tcGxldGUuXG4gICAqIEB0aHJvd3MgQXBpRXJyb3Igd2hlbiB0aGUgc2VydmVyIHJlamVjdHMgdGhlIHVwZGF0ZS5cbiAgICogQHRocm93cyBOZXR3b3JrRXJyb3Igd2hlbiB0aGUgcmVxdWVzdCBmYWlscyB0byByZWFjaCB0aGUgc2VydmVyLlxuICAgKi9cbiAgYXN5bmMgcmVtb3ZlQ29tbWl0KGNhcmRJZDogc3RyaW5nLCBzaGE6IHN0cmluZywgb3B0aW9ucz86IHsgc2Vzc2lvbklkPzogc3RyaW5nIH0pOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zdCB1cmwgPSB0aGlzLmJ1aWxkVXJsKGAvY2FyZHMvJHtjYXJkSWR9L2NvbW1pdHMvJHtzaGF9YCk7XG4gICAgY29uc3QgaGVhZGVyczogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHt9O1xuICAgIGlmIChvcHRpb25zPy5zZXNzaW9uSWQpIHtcbiAgICAgIGhlYWRlcnNbJ1gtQ2FyZHMtU2Vzc2lvbi1JZCddID0gb3B0aW9ucy5zZXNzaW9uSWQ7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLnJlcXVlc3QoKCkgPT4gdGhpcy5nZXRIdHRwQ2xpZW50KCkuZGVsZXRlKHVybCwgeyBoZWFkZXJzIH0pKTtcbiAgfVxuXG4gIC8vIC0tLSBCcmFuY2ggT3BlcmF0aW9ucyAtLS1cblxuICAvKipcbiAgICogR2V0cyBhbGwgYnJhbmNoZXMgdHJhY2tlZCBvbiBhIGNhcmQuXG4gICAqXG4gICAqIEBwYXJhbSBjYXJkSWQgLSBVbmlxdWUgaWRlbnRpZmllciBvZiB0aGUgY2FyZCB3aG9zZSBicmFuY2hlcyB0byByZXRyaWV2ZS5cbiAgICogQHBhcmFtIG9wdGlvbnMgLSBPcHRpb25hbCBxdWVyeSBwYXJhbWV0ZXJzLlxuICAgKiBAcGFyYW0gb3B0aW9ucy53b3Jrc3BhY2VQYXRoIC0gV29ya3NwYWNlIHBhdGggZm9yIGNvbXB1dGluZyBpc01lcmdlZCBhbmQgY29tbWl0IGNvbnRhaW5tZW50LlxuICAgKiBAcmV0dXJucyBQcm9taXNlIHJlc29sdmluZyB0byBicmFuY2hlcyByZXNwb25zZS5cbiAgICovXG4gIGFzeW5jIGdldEJyYW5jaGVzKGNhcmRJZDogc3RyaW5nLCBvcHRpb25zPzogeyB3b3Jrc3BhY2VQYXRoPzogc3RyaW5nIH0pOiBQcm9taXNlPEJyYW5jaGVzUmVzcG9uc2U+IHtcbiAgICBjb25zdCB1cmwgPSB0aGlzLmJ1aWxkVXJsKGAvY2FyZHMvJHtjYXJkSWR9L2JyYW5jaGVzYCwge1xuICAgICAgd29ya3NwYWNlUGF0aDogb3B0aW9ucz8ud29ya3NwYWNlUGF0aFxuICAgIH0pO1xuICAgIHJldHVybiB0aGlzLnJlcXVlc3QoKCkgPT4gdGhpcy5nZXRIdHRwQ2xpZW50KCkuZ2V0PEJyYW5jaGVzUmVzcG9uc2U+KHVybCkpO1xuICB9XG5cbiAgLyoqXG4gICAqIEFkZHMgYSBicmFuY2ggdG8gYSBjYXJkLlxuICAgKlxuICAgKiBAcGFyYW0gY2FyZElkIC0gVW5pcXVlIGlkZW50aWZpZXIgb2YgdGhlIGNhcmQgdG8gYWRkIHRoZSBicmFuY2ggdG8uXG4gICAqIEBwYXJhbSBkYXRhIC0gQnJhbmNoIGRhdGEgaW5jbHVkaW5nIG5hbWUgYW5kIG9wdGlvbmFsIHdvcmt0cmVlIHBhdGguXG4gICAqIEBwYXJhbSBvcHRpb25zIC0gT3B0aW9uYWwgcGFyYW1ldGVycy5cbiAgICogQHBhcmFtIG9wdGlvbnMuc2Vzc2lvbklkIC0gQ2xhdWRlIENvZGUgc2Vzc2lvbiBJRCBmb3J3YXJkZWQgYXMgYFgtQ2FyZHMtU2Vzc2lvbi1JZGAgaGVhZGVyIHNvIHRoZSBjYXJkIHJlcG8gcG9zdC1jb21taXQgaG9vayBjYW4gYXR0cmlidXRlIHRoZSBjb21taXQuXG4gICAqIEByZXR1cm5zIFByb21pc2UgcmVzb2x2aW5nIHdoZW4gdGhlIGJyYW5jaCBpcyBhZGRlZC5cbiAgICovXG4gIGFzeW5jIGFkZEJyYW5jaChjYXJkSWQ6IHN0cmluZywgZGF0YTogQWRkQnJhbmNoUmVxdWVzdCwgb3B0aW9ucz86IHsgc2Vzc2lvbklkPzogc3RyaW5nIH0pOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zdCB1cmwgPSB0aGlzLmJ1aWxkVXJsKGAvY2FyZHMvJHtjYXJkSWR9L2JyYW5jaGVzYCk7XG4gICAgY29uc3QgaGVhZGVyczogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHt9O1xuICAgIGlmIChvcHRpb25zPy5zZXNzaW9uSWQpIHtcbiAgICAgIGhlYWRlcnNbJ1gtQ2FyZHMtU2Vzc2lvbi1JZCddID0gb3B0aW9ucy5zZXNzaW9uSWQ7XG4gICAgfVxuICAgIGF3YWl0IHRoaXMucmVxdWVzdCgoKSA9PiB0aGlzLmdldEh0dHBDbGllbnQoKS5wb3N0PHVua25vd24+KHVybCwgZGF0YSwgeyBoZWFkZXJzIH0pKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZW1vdmVzIGEgYnJhbmNoIGZyb20gYSBjYXJkLlxuICAgKlxuICAgKiBAcGFyYW0gY2FyZElkIC0gVW5pcXVlIGlkZW50aWZpZXIgb2YgdGhlIGNhcmQgdG8gcmVtb3ZlIHRoZSBicmFuY2ggZnJvbS5cbiAgICogQHBhcmFtIG5hbWUgLSBCcmFuY2ggbmFtZSB0byByZW1vdmUgKHdpbGwgYmUgVVJMLWVuY29kZWQpLlxuICAgKiBAcGFyYW0gb3B0aW9ucyAtIE9wdGlvbmFsIHBhcmFtZXRlcnMuXG4gICAqIEBwYXJhbSBvcHRpb25zLnNlc3Npb25JZCAtIENsYXVkZSBDb2RlIHNlc3Npb24gSUQgZm9yd2FyZGVkIGFzIGBYLUNhcmRzLVNlc3Npb24tSWRgIGhlYWRlciBzbyB0aGUgY2FyZCByZXBvIHBvc3QtY29tbWl0IGhvb2sgY2FuIGF0dHJpYnV0ZSB0aGUgY29tbWl0LlxuICAgKiBAcmV0dXJucyBQcm9taXNlIHJlc29sdmluZyB3aGVuIHRoZSBicmFuY2ggaXMgcmVtb3ZlZC5cbiAgICovXG4gIGFzeW5jIHJlbW92ZUJyYW5jaChjYXJkSWQ6IHN0cmluZywgbmFtZTogc3RyaW5nLCBvcHRpb25zPzogeyBzZXNzaW9uSWQ/OiBzdHJpbmcgfSk6IFByb21pc2U8dm9pZD4ge1xuICAgIGNvbnN0IHVybCA9IHRoaXMuYnVpbGRVcmwoYC9jYXJkcy8ke2NhcmRJZH0vYnJhbmNoZXMvJHtlbmNvZGVVUklDb21wb25lbnQobmFtZSl9YCk7XG4gICAgY29uc3QgaGVhZGVyczogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHt9O1xuICAgIGlmIChvcHRpb25zPy5zZXNzaW9uSWQpIHtcbiAgICAgIGhlYWRlcnNbJ1gtQ2FyZHMtU2Vzc2lvbi1JZCddID0gb3B0aW9ucy5zZXNzaW9uSWQ7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLnJlcXVlc3QoKCkgPT4gdGhpcy5nZXRIdHRwQ2xpZW50KCkuZGVsZXRlKHVybCwgeyBoZWFkZXJzIH0pKTtcbiAgfVxuXG4gIC8vIC0tLSBUYWcgT3BlcmF0aW9ucyAtLS1cblxuICAvKipcbiAgICogR2V0cyBhbGwgYXZhaWxhYmxlIHRhZ3MuXG4gICAqXG4gICAqIEByZXR1cm5zIFByb21pc2UgcmVzb2x2aW5nIHRvIHRhZyBzdHJpbmdzLlxuICAgKiBAdGhyb3dzIEFwaUVycm9yIHdoZW4gdGhlIHNlcnZlciByZXNwb25kcyB3aXRoIGFuIGVycm9yLlxuICAgKiBAdGhyb3dzIE5ldHdvcmtFcnJvciB3aGVuIHRoZSByZXF1ZXN0IGZhaWxzIHRvIHJlYWNoIHRoZSBzZXJ2ZXIuXG4gICAqL1xuICBhc3luYyBnZXRUYWdzKCk6IFByb21pc2U8c3RyaW5nW10+IHtcbiAgICBjb25zdCB1cmwgPSB0aGlzLmJ1aWxkVXJsKCcvdGFncycsIHtcbiAgICAgIHdvcmtzcGFjZVBhdGg6IHRoaXMub3B0aW9ucy53b3Jrc3BhY2VQYXRoXG4gICAgfSk7XG4gICAgcmV0dXJuIHRoaXMucmVxdWVzdCgoKSA9PiB0aGlzLmdldEh0dHBDbGllbnQoKS5nZXQ8c3RyaW5nW10+KHVybCkpO1xuICB9XG5cbiAgLy8gLS0tIEVudmlyb25tZW50IE9wZXJhdGlvbnMgLS0tXG5cbiAgLyoqXG4gICAqIEZldGNoZXMgYXZhaWxhYmxlIGFnZW50IGVudmlyb25tZW50cy5cbiAgICpcbiAgICogQHJldHVybnMgUHJvbWlzZSByZXNvbHZpbmcgdG8gZW52aXJvbm1lbnQgbWV0YWRhdGEuXG4gICAqIEB0aHJvd3MgQXBpRXJyb3Igd2hlbiB0aGUgc2VydmVyIHJlc3BvbmRzIHdpdGggYW4gZXJyb3IuXG4gICAqIEB0aHJvd3MgTmV0d29ya0Vycm9yIHdoZW4gdGhlIHJlcXVlc3QgZmFpbHMgdG8gcmVhY2ggdGhlIHNlcnZlci5cbiAgICovXG4gIGFzeW5jIGdldEVudmlyb25tZW50cygpOiBQcm9taXNlPEFycmF5PHsgbmFtZTogc3RyaW5nOyBkZXNjcmlwdGlvbj86IHN0cmluZyB9Pj4ge1xuICAgIGNvbnN0IHVybCA9IHRoaXMuYnVpbGRVcmwoJy9lbnZpcm9ubWVudHMnKTtcbiAgICByZXR1cm4gdGhpcy5yZXF1ZXN0KCgpID0+IHRoaXMuZ2V0SHR0cENsaWVudCgpLmdldDxBcnJheTx7IG5hbWU6IHN0cmluZzsgZGVzY3JpcHRpb24/OiBzdHJpbmcgfT4+KHVybCkpO1xuICB9XG5cbiAgLy8gLS0tIFR5cGVkIEZpbGUgT3BlcmF0aW9ucyAtLS1cblxuICAvKipcbiAgICogU3VibWl0cyBhbiBhZGFwdGl2ZSBjYXJkIGFjdGlvbiBieSB3cml0aW5nIGFuIGBhZGFwdGl2ZS1jYXJkLXN1Ym1pc3Npb25gIHR5cGVkIGZpbGUuXG4gICAqXG4gICAqIEBwYXJhbSBjYXJkSWQgLSBUaGUgY2FyZCBjb250YWluaW5nIHRoZSBhZGFwdGl2ZSBjYXJkLlxuICAgKiBAcGFyYW0gYWN0aW9uSWQgLSBUaGUgYWN0aW9uIElEIGZyb20gdGhlIGFkYXB0aXZlIGNhcmQgc3VibWl0IGFjdGlvbi5cbiAgICogQHBhcmFtIGRhdGEgLSBUaGUgZm9ybSBkYXRhIGNvbGxlY3RlZCBieSB0aGUgYWRhcHRpdmUgY2FyZC5cbiAgICogQHJldHVybnMgUHJvbWlzZSByZXNvbHZpbmcgd2hlbiB0aGUgc3VibWlzc2lvbiBpcyBwZXJzaXN0ZWQuXG4gICAqIEB0aHJvd3MgQXBpRXJyb3Igd2hlbiB0aGUgc2VydmVyIHJlamVjdHMgdGhlIHN1Ym1pc3Npb24gKGUuZy4gdmFsaWRhdGlvbiBmYWlsdXJlKS5cbiAgICogQHRocm93cyBOZXR3b3JrRXJyb3Igd2hlbiB0aGUgcmVxdWVzdCBmYWlscyB0byByZWFjaCB0aGUgc2VydmVyLlxuICAgKi9cbiAgYXN5bmMgc3VibWl0Q2FyZEFjdGlvbihjYXJkSWQ6IHN0cmluZywgYWN0aW9uSWQ6IHN0cmluZywgZGF0YTogUmVjb3JkPHN0cmluZywgdW5rbm93bj4pOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zdCBmaWxlTmFtZSA9IGAke2FjdGlvbklkfS0ke0RhdGUubm93KCl9Lmpzb25gO1xuICAgIGNvbnN0IHVybCA9IHRoaXMuYnVpbGRVcmwoYC9jYXJkcy8ke2NhcmRJZH0vYWRhcHRpdmUtY2FyZC1zdWJtaXNzaW9uLyR7ZW5jb2RlVVJJQ29tcG9uZW50KGZpbGVOYW1lKX1gKTtcbiAgICBjb25zdCBib2R5ID0geyBjYXJkSWQsIGFjdGlvbklkLCBkYXRhIH07XG4gICAgYXdhaXQgdGhpcy5yZXF1ZXN0KCgpID0+IHRoaXMuZ2V0SHR0cENsaWVudCgpLnB1dDx1bmtub3duPih1cmwsIGJvZHkpKTtcbiAgfVxuXG4gIC8vIC0tLSBUeXBlIFNjaGVtYSBPcGVyYXRpb25zIC0tLVxuXG4gIC8qKlxuICAgKiBHZXRzIHR5cGUgc2NoZW1hcyBhbmQgZGVzY3JpcHRpb25zIGZvciBhIGNhcmQncyBlbnZpcm9ubWVudC5cbiAgICpcbiAgICogUmV0dXJucyBtZXRhZGF0YSBhYm91dCBlYWNoIHJlZ2lzdGVyZWQgdHlwZSBpbiB0aGUgY2FyZCdzIGVudmlyb25tZW50LFxuICAgKiBpbmNsdWRpbmcgdmVyc2lvbiwgc2NoZW1hLCBhbmQgZGVzY3JpcHRpb24uIENvbW1hbmQgZGV0YWlscyBhcmUgZXhjbHVkZWQuXG4gICAqXG4gICAqIEBwYXJhbSBjYXJkSWQgLSBJZGVudGlmaWVyIG9mIHRoZSBjYXJkIHdob3NlIHR5cGUgc2NoZW1hIG1ldGFkYXRhIHNob3VsZCBiZSBmZXRjaGVkLlxuICAgKiBAcmV0dXJucyBQcm9taXNlIHJlc29sdmluZyB0byB0eXBlIHNjaGVtYSBpbmZvcm1hdGlvbi5cbiAgICogQHRocm93cyBBcGlFcnJvciB3aGVuIHRoZSBzZXJ2ZXIgcmVzcG9uZHMgd2l0aCBhbiBlcnJvci5cbiAgICogQHRocm93cyBOZXR3b3JrRXJyb3Igd2hlbiB0aGUgcmVxdWVzdCBmYWlscyB0byByZWFjaCB0aGUgc2VydmVyLlxuICAgKi9cbiAgYXN5bmMgZ2V0VHlwZVNjaGVtYXMoY2FyZElkOiBzdHJpbmcpOiBQcm9taXNlPFR5cGVTY2hlbWFzUmVzcG9uc2U+IHtcbiAgICBjb25zdCB1cmwgPSB0aGlzLmJ1aWxkVXJsKGAvY2FyZHMvJHtjYXJkSWR9L3NjaGVtYWApO1xuICAgIHJldHVybiB0aGlzLnJlcXVlc3QoKCkgPT4gdGhpcy5nZXRIdHRwQ2xpZW50KCkuZ2V0PFR5cGVTY2hlbWFzUmVzcG9uc2U+KHVybCkpO1xuICB9XG5cbiAgLy8gLS0tIFN0cmVhbSBPcGVyYXRpb25zIC0tLVxuXG4gIC8qKlxuICAgKiBMaXN0cyBhbGwgc3RyZWFtcyBhdHRhY2hlZCB0byBhIGNhcmQsIHNvcnRlZCBieSBjcmVhdGlvbiB0aW1lLlxuICAgKlxuICAgKiBAcGFyYW0gY2FyZElkIC0gQ2FyZCBJRCB0byBxdWVyeS5cbiAgICogQHJldHVybnMgU3RyZWFtIG1ldGFkYXRhIGFycmF5IChtYXkgYmUgZW1wdHkpLlxuICAgKiBAdGhyb3dzIEFwaUVycm9yIHdoZW4gdGhlIHNlcnZlciByZXNwb25kcyB3aXRoIGFuIGVycm9yIChlLmcuLCA0MDQgZm9yIHVua25vd24gY2FyZCkuXG4gICAqIEB0aHJvd3MgTmV0d29ya0Vycm9yIHdoZW4gdGhlIHJlcXVlc3QgZmFpbHMgdG8gcmVhY2ggdGhlIHNlcnZlci5cbiAgICovXG4gIGFzeW5jIGxpc3RTdHJlYW1zKGNhcmRJZDogc3RyaW5nKTogUHJvbWlzZTxTdHJlYW1NZXRhW10+IHtcbiAgICBjb25zdCB1cmwgPSB0aGlzLmJ1aWxkVXJsKGAvY2FyZHMvJHtjYXJkSWR9L3N0cmVhbXNgKTtcbiAgICByZXR1cm4gdGhpcy5yZXF1ZXN0KCgpID0+IHRoaXMuZ2V0SHR0cENsaWVudCgpLmdldDxTdHJlYW1NZXRhW10+KHVybCkpO1xuICB9XG5cbiAgLyoqXG4gICAqIFJldHJpZXZlcyBhIHN0cmVhbSdzIG1ldGFkYXRhIGFuZCBhbGwgcmF3IGxpbmVzLlxuICAgKlxuICAgKiBUaGUgYHN0cmVhbVR5cGVgIGFuZCBgZmlsZW5hbWVgIGFyZSBVUkktZW5jb2RlZCBhdXRvbWF0aWNhbGx5LiBGb3IgY29tcGxldGVkXG4gICAqIHN0cmVhbXMgdGhlIHJldHVybmVkIGBsaW5lc2AgYXJyYXkgaXMgdGhlIGZ1bGwgY29udGVudDsgZm9yIGFjdGl2ZSBzdHJlYW1zIGl0XG4gICAqIGlzIGEgc25hcHNob3QgdGhhdCBtYXkgZ3JvdyB3aGlsZSB0aGUgY2FsbGVyIHByb2Nlc3NlcyBpdC5cbiAgICpcbiAgICogQHBhcmFtIGNhcmRJZCAtIElkZW50aWZpZXIgb2YgdGhlIGNhcmQgdGhhdCBvd25zIHRoZSByZXF1ZXN0ZWQgc3RyZWFtLlxuICAgKiBAcGFyYW0gc3RyZWFtVHlwZSAtIFN0cmVhbSB0eXBlIGtleSAoZS5nLiwgYFwiY2xhdWRlLWNvZGUtc2Vzc2lvblwiYCkuXG4gICAqIEBwYXJhbSBmaWxlbmFtZSAtIFN0cmVhbSBmaWxlbmFtZSAoZS5nLiwgYFwic2Vzc2lvbi5sb2dcImApLlxuICAgKiBAcmV0dXJucyBNZXRhZGF0YSBhbmQgY29udGVudCBsaW5lcy5cbiAgICogQHRocm93cyBBcGlFcnJvciBvbiA0MDQgKHVua25vd24gY2FyZCBvciBzdHJlYW0pIG9yIG90aGVyIHNlcnZlciBlcnJvcnMuXG4gICAqIEB0aHJvd3MgTmV0d29ya0Vycm9yIHdoZW4gdGhlIHJlcXVlc3QgZmFpbHMgdG8gcmVhY2ggdGhlIHNlcnZlci5cbiAgICovXG4gIGFzeW5jIGdldFN0cmVhbShcbiAgICBjYXJkSWQ6IHN0cmluZyxcbiAgICBzdHJlYW1UeXBlOiBzdHJpbmcsXG4gICAgZmlsZW5hbWU6IHN0cmluZ1xuICApOiBQcm9taXNlPHsgbWV0YTogU3RyZWFtTWV0YTsgbGluZXM6IHN0cmluZ1tdIH0+IHtcbiAgICBjb25zdCB1cmwgPSB0aGlzLmJ1aWxkVXJsKFxuICAgICAgYC9jYXJkcy8ke2NhcmRJZH0vc3RyZWFtcy8ke2VuY29kZVVSSUNvbXBvbmVudChzdHJlYW1UeXBlKX0vJHtlbmNvZGVVUklDb21wb25lbnQoZmlsZW5hbWUpfWBcbiAgICApO1xuICAgIHJldHVybiB0aGlzLnJlcXVlc3QoKCkgPT4gdGhpcy5nZXRIdHRwQ2xpZW50KCkuZ2V0PHsgbWV0YTogU3RyZWFtTWV0YTsgbGluZXM6IHN0cmluZ1tdIH0+KHVybCkpO1xuICB9XG5cbiAgLyoqXG4gICAqIE9wZW5zIGEgY2h1bmtlZCBKU09OTCBzdHJlYW0gdG8gdGhlIHNlcnZlciBhbmQgcmV0dXJucyBhIHdyaXRlci5cbiAgICpcbiAgICogVGhlIHdyaXRlciBzZW5kcyBlYWNoIGxpbmUgaW4gcmVhbC10aW1lIG92ZXIgYSBzaW5nbGUgSFRUUCBQT1NUIHVzaW5nIGFcbiAgICogYFJlYWRhYmxlU3RyZWFtYCBib2R5LiBDYWxsIHtAbGluayBTdHJlYW1Xcml0ZXIuY2xvc2V9IHdoZW4gdGhlIHByb2R1Y2VyXG4gICAqIGlzIGZpbmlzaGVkIHRvIGVuZCB0aGUgcmVxdWVzdCBhbmQgcmV0cmlldmUgdGhlIHNlcnZlcidzIHN1bW1hcnkuXG4gICAqXG4gICAqIEBwYXJhbSBjYXJkSWQgLSBDYXJkIElEIHRvIGF0dGFjaCB0aGUgc3RyZWFtIHRvLlxuICAgKiBAcGFyYW0gc3RyZWFtVHlwZSAtIFN0cmVhbSB0eXBlIGtleSBmcm9tIHNldHRpbmdzLmpzb24gKGUuZy4sIGBcImNsYXVkZS1jb2RlLXNlc3Npb25cImApLlxuICAgKiBAcGFyYW0gZmlsZW5hbWUgLSBTdHJlYW0gZmlsZW5hbWUgKGUuZy4sIGBcInNlc3Npb24tYWJjLmpzb25sXCJgKS5cbiAgICogQHBhcmFtIG9wdGlvbnMgLSBPcHRpb25hbCB0aXRsZSBhbmQgc2Vzc2lvbiBJRCBtZXRhZGF0YS5cbiAgICogQHJldHVybnMgQSB7QGxpbmsgU3RyZWFtV3JpdGVyfSBmb3IgcHVzaGluZyBsaW5lcyBhbmQgY2xvc2luZyB0aGUgc3RyZWFtLlxuICAgKlxuICAgKiBAZXhhbXBsZVxuICAgKiBgYGB0eXBlc2NyaXB0XG4gICAqIGNvbnN0IHN0cmVhbSA9IGNsaWVudC5vcGVuU3RyZWFtKGNhcmRJZCwgJ2NsYXVkZS1jb2RlLXNlc3Npb24nLCAncnVuLmpzb25sJyk7XG4gICAqIHN0cmVhbS53cml0ZShKU09OLnN0cmluZ2lmeSh7IHR5cGU6ICdpbml0JyB9KSk7XG4gICAqIHN0cmVhbS53cml0ZShKU09OLnN0cmluZ2lmeSh7IHR5cGU6ICdyZXN1bHQnIH0pKTtcbiAgICogY29uc3QgcmVzdWx0ID0gYXdhaXQgc3RyZWFtLmNsb3NlKCk7XG4gICAqIGBgYFxuICAgKi9cbiAgb3BlblN0cmVhbShjYXJkSWQ6IHN0cmluZywgc3RyZWFtVHlwZTogc3RyaW5nLCBmaWxlbmFtZTogc3RyaW5nLCBvcHRpb25zPzogU3RyZWFtV3JpdGVyT3B0aW9ucyk6IFN0cmVhbVdyaXRlciB7XG4gICAgY29uc3QgZW5jb2RlciA9IG5ldyBUZXh0RW5jb2RlcigpO1xuICAgIGxldCBjb250cm9sbGVyITogUmVhZGFibGVTdHJlYW1EZWZhdWx0Q29udHJvbGxlcjxVaW50OEFycmF5PjtcblxuICAgIGNvbnN0IGJvZHkgPSBuZXcgUmVhZGFibGVTdHJlYW08VWludDhBcnJheT4oe1xuICAgICAgc3RhcnQoYykge1xuICAgICAgICBjb250cm9sbGVyID0gYztcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIGNvbnN0IHVybCA9IHRoaXMuYnVpbGRVcmwoXG4gICAgICBgL2NhcmRzLyR7Y2FyZElkfS9zdHJlYW1zLyR7ZW5jb2RlVVJJQ29tcG9uZW50KHN0cmVhbVR5cGUpfS8ke2VuY29kZVVSSUNvbXBvbmVudChmaWxlbmFtZSl9YFxuICAgICk7XG5cbiAgICBjb25zdCBoZWFkZXJzOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ID0ge1xuICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi94LW5kanNvbidcbiAgICB9O1xuICAgIGlmICh0aGlzLm9wdGlvbnMuYWNjZXNzVG9rZW4pIHtcbiAgICAgIGhlYWRlcnNbJ0F1dGhvcml6YXRpb24nXSA9IGBCZWFyZXIgJHt0aGlzLm9wdGlvbnMuYWNjZXNzVG9rZW59YDtcbiAgICB9XG4gICAgaWYgKG9wdGlvbnM/LnRpdGxlKSB7XG4gICAgICBoZWFkZXJzWydYLVN0cmVhbS1UaXRsZSddID0gb3B0aW9ucy50aXRsZTtcbiAgICB9XG4gICAgaWYgKG9wdGlvbnM/LnNlc3Npb25JZCkge1xuICAgICAgaGVhZGVyc1snWC1TdHJlYW0tU2Vzc2lvbi1JZCddID0gb3B0aW9ucy5zZXNzaW9uSWQ7XG4gICAgfVxuXG4gICAgLy8gYGR1cGxleDogJ2hhbGYnYCBpcyByZXF1aXJlZCBieSB1bmRpY2kgZm9yIHN0cmVhbWluZyByZXF1ZXN0IGJvZGllc1xuICAgIC8vIGJ1dCBpcyBub3QgeWV0IGluIHRoZSBzdGFuZGFyZCBsaWIuZG9tIFJlcXVlc3RJbml0IHR5cGUuXG4gICAgY29uc3QgZmV0Y2hPcHRpb25zOiBSZXF1ZXN0SW5pdCAmIHsgZHVwbGV4OiBzdHJpbmcgfSA9IHtcbiAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgaGVhZGVycyxcbiAgICAgIGJvZHksXG4gICAgICBkdXBsZXg6ICdoYWxmJ1xuICAgIH07XG5cbiAgICBjb25zdCByZXNwb25zZVByb21pc2UgPSBmZXRjaCh1cmwsIGZldGNoT3B0aW9ucyk7XG5cbiAgICAvLyBUcmFjayBlYXJseSByZWplY3Rpb24gZnJvbSB0aGUgc2VydmVyIChlLmcuIDQwOSBcIlN0cmVhbSBhbHJlYWR5XG4gICAgLy8gZXhpc3RzIGFuZCBpcyBhY3RpdmVcIikuICBGb3IgYSBzdWNjZXNzZnVsIHN0cmVhbSB0aGUgcmVzcG9uc2Ugc3RheXNcbiAgICAvLyBwZW5kaW5nIHVudGlsIGNsb3NlKCkgZW5kcyB0aGUgYm9keSBcdTIwMTQgYnV0IGVycm9yIHJlc3BvbnNlcyBhcnJpdmVcbiAgICAvLyBpbW1lZGlhdGVseSBhbmQgbXVzdCBiZSBzdXJmYWNlZCB3aXRob3V0IHdhaXRpbmcgZm9yIGNsb3NlKCkuXG4gICAgLy8gTm90ZTogb25seSByZWFkcyByZXNwb25zZS5vay9zdGF0dXNUZXh0IChub3QgdGhlIGJvZHkpIHNvIGNsb3NlKClcbiAgICAvLyBjYW4gc3RpbGwgcGFyc2UgdGhlIGZ1bGwgZXJyb3IgcmVzcG9uc2UuXG4gICAgbGV0IGVhcmx5RXJyb3I6IEVycm9yIHwgbnVsbCA9IG51bGw7XG4gICAgcmVzcG9uc2VQcm9taXNlXG4gICAgICAudGhlbigocmVzcG9uc2UpID0+IHtcbiAgICAgICAgaWYgKCFyZXNwb25zZS5vaykge1xuICAgICAgICAgIGVhcmx5RXJyb3IgPSBuZXcgQXBpRXJyb3IocmVzcG9uc2Uuc3RhdHVzVGV4dCwgU3RyaW5nKHJlc3BvbnNlLnN0YXR1cykpO1xuICAgICAgICB9XG4gICAgICB9KVxuICAgICAgLmNhdGNoKChlcnI6IHVua25vd24pID0+IHtcbiAgICAgICAgZWFybHlFcnJvciA9IGVyciBpbnN0YW5jZW9mIEVycm9yID8gZXJyIDogbmV3IEVycm9yKFN0cmluZyhlcnIpKTtcbiAgICAgIH0pO1xuXG4gICAgcmV0dXJuIHtcbiAgICAgIHdyaXRlKGxpbmU6IHN0cmluZyk6IHZvaWQge1xuICAgICAgICBpZiAoZWFybHlFcnJvcikgdGhyb3cgZWFybHlFcnJvcjtcbiAgICAgICAgY29udHJvbGxlci5lbnF1ZXVlKGVuY29kZXIuZW5jb2RlKGAke2xpbmV9XFxuYCkpO1xuICAgICAgfSxcbiAgICAgIGNsb3NlOiBhc3luYyAoKTogUHJvbWlzZTxTdHJlYW1SZXN1bHQ+ID0+IHtcbiAgICAgICAgY29udHJvbGxlci5jbG9zZSgpO1xuICAgICAgICByZXR1cm4gdGhpcy5yZXF1ZXN0KGFzeW5jICgpID0+IHtcbiAgICAgICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IHJlc3BvbnNlUHJvbWlzZTtcbiAgICAgICAgICBpZiAoIXJlc3BvbnNlLm9rKSB0aHJvdyByZXNwb25zZTtcbiAgICAgICAgICByZXR1cm4gcmVzcG9uc2UuanNvbigpIGFzIFByb21pc2U8U3RyZWFtUmVzdWx0PjtcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfTtcbiAgfVxuXG4gIC8qKlxuICAgKiBPcGVucyBhIFdlYlNvY2tldC1iYWNrZWQgSlNPTkwgc3RyZWFtIHRvIHRoZSBzZXJ2ZXIgYW5kIHJldHVybnMgYSBzZXNzaW9uLlxuICAgKlxuICAgKiBUaGUgc2Vzc2lvbiBrZWVwcyBhIHBlcnNpc3RlbnQgV2ViU29ja2V0IGNvbm5lY3Rpb24gZm9yIHRoZSBlbnRpcmUgc2Vzc2lvblxuICAgKiBsaWZldGltZS4gVGhlIHNlcnZlciBzZW5kcyBhIGByZWFkeWAgbWVzc2FnZSB3aXRoIGByZXN1bWVGcm9tYCBiZWZvcmUgdGhlXG4gICAqIGNhbGxlciB3cml0ZXMgYW55IGxpbmVzLCBzbyB0aGUgd2F0Y2hlciBjYW4gc2tpcCBsaW5lcyB0aGUgc2VydmVyIGFscmVhZHkgaGFzLlxuICAgKlxuICAgKiBDYWxsIHtAbGluayBXc1N0cmVhbVNlc3Npb24uY2xvc2V9IHdoZW4gdGhlIHByb2R1Y2VyIGlzIGZpbmlzaGVkIHRvIHNlbmQgYVxuICAgKiBncmFjZWZ1bCBjbG9zZSBtZXNzYWdlIGFuZCBhd2FpdCB0aGUgc2VydmVyJ3MgYWNrbm93bGVkZ2VtZW50LlxuICAgKlxuICAgKiBAcGFyYW0gY2FyZElkIC0gQ2FyZCBJRCB0byBhdHRhY2ggdGhlIHN0cmVhbSB0by5cbiAgICogQHBhcmFtIHN0cmVhbVR5cGUgLSBTdHJlYW0gdHlwZSBrZXkgZnJvbSBzZXR0aW5ncy5qc29uIChlLmcuLCBgXCJjbGF1ZGUtY29kZS1zZXNzaW9uXCJgKS5cbiAgICogQHBhcmFtIGZpbGVuYW1lIC0gU3RyZWFtIGZpbGVuYW1lIChlLmcuLCBgXCJzZXNzaW9uLWFiYy5qc29ubFwiYCkuXG4gICAqIEBwYXJhbSBvcHRpb25zIC0gVGl0bGUgYW5kIHNlc3Npb24gSUQgbWV0YWRhdGEgZm9yd2FyZGVkIHRvIHRoZSBzZXJ2ZXIgYXMgVVJMIHF1ZXJ5IHBhcmFtZXRlcnMuXG4gICAqIEBwYXJhbSB3c0ZhY3RvcnkgLSBXZWJTb2NrZXQgZmFjdG9yeSBmb3IgY3JlYXRpbmcgdGhlIGNvbm5lY3Rpb24uIFVzZSB0aGUgYHdzYCBwYWNrYWdlIGluIE5vZGUuanMgZW52aXJvbm1lbnRzLlxuICAgKiBAcmV0dXJucyBBIHtAbGluayBXc1N0cmVhbVNlc3Npb259IHdpdGggYHJlc3VtZUZyb21gIHNldCB0byB0aGUgc2VydmVyJ3MgY3VycmVudCBsaW5lIGNvdW50LlxuICAgKiBAdGhyb3dzIEVycm9yIHdoZW4gdGhlIFdlYlNvY2tldCBmYWlscyB0byBjb25uZWN0IG9yIHRoZSBzZXJ2ZXIgc2VuZHMgYW4gZXJyb3IgYmVmb3JlIGByZWFkeWAuXG4gICAqL1xuICBhc3luYyBvcGVuU3RyZWFtV2ViU29ja2V0KFxuICAgIGNhcmRJZDogc3RyaW5nLFxuICAgIHN0cmVhbVR5cGU6IHN0cmluZyxcbiAgICBmaWxlbmFtZTogc3RyaW5nLFxuICAgIG9wdGlvbnM6IFN0cmVhbVdyaXRlck9wdGlvbnMsXG4gICAgd3NGYWN0b3J5OiBJbmdlc3RXc0ZhY3RvcnlcbiAgKTogUHJvbWlzZTxXc1N0cmVhbVNlc3Npb24+IHtcbiAgICBjb25zdCBmYWN0b3J5ID0gd3NGYWN0b3J5O1xuXG4gICAgLy8gQ29udmVydCBodHRwL2h0dHBzIHRvIHdzL3dzc1xuICAgIGNvbnN0IGJhc2VVcmwgPSB0aGlzLm9wdGlvbnMuYmFzZVVybC5yZXBsYWNlKC9eaHR0cC8sICd3cycpO1xuICAgIGNvbnN0IGJhc2VQYXRoID0gYCR7YmFzZVVybH0vY2FyZHMvJHtlbmNvZGVVUklDb21wb25lbnQoY2FyZElkKX0vc3RyZWFtcy8ke2VuY29kZVVSSUNvbXBvbmVudChzdHJlYW1UeXBlKX0vJHtlbmNvZGVVUklDb21wb25lbnQoZmlsZW5hbWUpfWA7XG4gICAgY29uc3QgcXVlcnlQYXJhbXMgPSBuZXcgVVJMU2VhcmNoUGFyYW1zKCk7XG4gICAgaWYgKG9wdGlvbnM/LnRpdGxlKSBxdWVyeVBhcmFtcy5zZXQoJ3RpdGxlJywgb3B0aW9ucy50aXRsZSk7XG4gICAgaWYgKG9wdGlvbnM/LnNlc3Npb25JZCkgcXVlcnlQYXJhbXMuc2V0KCdzZXNzaW9uSWQnLCBvcHRpb25zLnNlc3Npb25JZCk7XG4gICAgY29uc3QgcXVlcnlTdHJpbmcgPSBxdWVyeVBhcmFtcy50b1N0cmluZygpO1xuICAgIGNvbnN0IHVybCA9IHF1ZXJ5U3RyaW5nID8gYCR7YmFzZVBhdGh9PyR7cXVlcnlTdHJpbmd9YCA6IGJhc2VQYXRoO1xuXG4gICAgY29uc3QgaGVhZGVyczogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHt9O1xuICAgIGlmICh0aGlzLm9wdGlvbnMuYWNjZXNzVG9rZW4pIHtcbiAgICAgIGhlYWRlcnNbJ0F1dGhvcml6YXRpb24nXSA9IGBCZWFyZXIgJHt0aGlzLm9wdGlvbnMuYWNjZXNzVG9rZW59YDtcbiAgICB9XG5cbiAgICBjb25zdCB3cyA9IGZhY3RvcnkodXJsLCB7IGhlYWRlcnMgfSk7XG5cbiAgICAvLyBBd2FpdCB0aGUgJ3JlYWR5JyBtZXNzYWdlIGZyb20gdGhlIHNlcnZlciBiZWZvcmUgcmV0dXJuaW5nIHRvIHRoZSBjYWxsZXIuXG4gICAgLy8gQW55IGVycm9yIG9yIHByZW1hdHVyZSBjbG9zZSBiZWZvcmUgJ3JlYWR5JyByZWplY3RzIHRoZSBwcm9taXNlLlxuICAgIGNvbnN0IHJlc3VtZUZyb20gPSBhd2FpdCBuZXcgUHJvbWlzZTxudW1iZXI+KChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgIGNvbnN0IG9uUmVhZHkgPSAoZXZlbnQ6IE1lc3NhZ2VFdmVudDx1bmtub3duPikgPT4ge1xuICAgICAgICB0cnkge1xuICAgICAgICAgIGNvbnN0IG1zZyA9IEpTT04ucGFyc2UoU3RyaW5nKGV2ZW50LmRhdGEpKSBhcyB7IHR5cGU6IHN0cmluZzsgcmVzdW1lRnJvbT86IG51bWJlcjsgbWVzc2FnZT86IHN0cmluZyB9O1xuICAgICAgICAgIGlmIChtc2cudHlwZSA9PT0gJ3JlYWR5Jykge1xuICAgICAgICAgICAgd3MucmVtb3ZlRXZlbnRMaXN0ZW5lcignbWVzc2FnZScsIG9uUmVhZHkpO1xuICAgICAgICAgICAgd3MucmVtb3ZlRXZlbnRMaXN0ZW5lcignZXJyb3InLCBvbkVycm9yKTtcbiAgICAgICAgICAgIHdzLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2Nsb3NlJywgb25DbG9zZSk7XG4gICAgICAgICAgICByZXNvbHZlKG1zZy5yZXN1bWVGcm9tID8/IDApO1xuICAgICAgICAgIH0gZWxzZSBpZiAobXNnLnR5cGUgPT09ICdlcnJvcicpIHtcbiAgICAgICAgICAgIHdzLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ21lc3NhZ2UnLCBvblJlYWR5KTtcbiAgICAgICAgICAgIHdzLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2Vycm9yJywgb25FcnJvcik7XG4gICAgICAgICAgICB3cy5yZW1vdmVFdmVudExpc3RlbmVyKCdjbG9zZScsIG9uQ2xvc2UpO1xuICAgICAgICAgICAgcmVqZWN0KG5ldyBFcnJvcihtc2cubWVzc2FnZSA/PyAnU2VydmVyIGVycm9yJykpO1xuICAgICAgICAgIH1cbiAgICAgICAgICAvLyBPdGhlciBtZXNzYWdlIHR5cGVzIGJlZm9yZSAncmVhZHknIGFyZSBzaWxlbnRseSBpZ25vcmVkXG4gICAgICAgIH0gY2F0Y2gge1xuICAgICAgICAgIHJlamVjdChuZXcgRXJyb3IoJ0ZhaWxlZCB0byBwYXJzZSBzZXJ2ZXIgcmVhZHkgbWVzc2FnZScpKTtcbiAgICAgICAgfVxuICAgICAgfTtcbiAgICAgIGNvbnN0IG9uRXJyb3IgPSAoZXZlbnQ6IEV2ZW50KSA9PiB7XG4gICAgICAgIHdzLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ21lc3NhZ2UnLCBvblJlYWR5KTtcbiAgICAgICAgd3MucmVtb3ZlRXZlbnRMaXN0ZW5lcignZXJyb3InLCBvbkVycm9yKTtcbiAgICAgICAgd3MucmVtb3ZlRXZlbnRMaXN0ZW5lcignY2xvc2UnLCBvbkNsb3NlKTtcbiAgICAgICAgcmVqZWN0KG5ldyBFcnJvcihgV2ViU29ja2V0IGVycm9yOiAke1N0cmluZyhldmVudCl9YCkpO1xuICAgICAgfTtcbiAgICAgIGNvbnN0IG9uQ2xvc2UgPSAoZXZlbnQ6IENsb3NlRXZlbnQpID0+IHtcbiAgICAgICAgd3MucmVtb3ZlRXZlbnRMaXN0ZW5lcignbWVzc2FnZScsIG9uUmVhZHkpO1xuICAgICAgICB3cy5yZW1vdmVFdmVudExpc3RlbmVyKCdlcnJvcicsIG9uRXJyb3IpO1xuICAgICAgICB3cy5yZW1vdmVFdmVudExpc3RlbmVyKCdjbG9zZScsIG9uQ2xvc2UpO1xuICAgICAgICByZWplY3QobmV3IEVycm9yKGBXZWJTb2NrZXQgY2xvc2VkIGJlZm9yZSByZWFkeTogY29kZT0ke1N0cmluZyhldmVudC5jb2RlKX1gKSk7XG4gICAgICB9O1xuICAgICAgd3MuYWRkRXZlbnRMaXN0ZW5lcignbWVzc2FnZScsIG9uUmVhZHkpO1xuICAgICAgd3MuYWRkRXZlbnRMaXN0ZW5lcignZXJyb3InLCBvbkVycm9yKTtcbiAgICAgIHdzLmFkZEV2ZW50TGlzdGVuZXIoJ2Nsb3NlJywgb25DbG9zZSk7XG4gICAgfSk7XG5cbiAgICBsZXQgbGluZXNTZW50ID0gcmVzdW1lRnJvbTtcblxuICAgIHJldHVybiB7XG4gICAgICBnZXQgcmVzdW1lRnJvbSgpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gcmVzdW1lRnJvbTtcbiAgICAgIH0sXG4gICAgICBnZXQgbGluZXNTZW50KCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiBsaW5lc1NlbnQ7XG4gICAgICB9LFxuICAgICAgd3JpdGUobGluZTogc3RyaW5nKTogdm9pZCB7XG4gICAgICAgIGxpbmVzU2VudCsrO1xuICAgICAgICB3cy5zZW5kKEpTT04uc3RyaW5naWZ5KHsgdHlwZTogJ2xpbmUnLCBsaW5lTnVtYmVyOiBsaW5lc1NlbnQsIGNvbnRlbnQ6IGxpbmUgfSkpO1xuICAgICAgfSxcbiAgICAgIGFzeW5jIGNsb3NlKCk6IFByb21pc2U8U3RyZWFtUmVzdWx0PiB7XG4gICAgICAgIHdzLnNlbmQoSlNPTi5zdHJpbmdpZnkoeyB0eXBlOiAnY2xvc2UnIH0pKTtcbiAgICAgICAgYXdhaXQgbmV3IFByb21pc2U8dm9pZD4oKHJlc29sdmUpID0+IHtcbiAgICAgICAgICBjb25zdCBvbkNsb3NlID0gKCkgPT4ge1xuICAgICAgICAgICAgd3MucmVtb3ZlRXZlbnRMaXN0ZW5lcignY2xvc2UnLCBvbkNsb3NlKTtcbiAgICAgICAgICAgIHJlc29sdmUoKTtcbiAgICAgICAgICB9O1xuICAgICAgICAgIHdzLmFkZEV2ZW50TGlzdGVuZXIoJ2Nsb3NlJywgb25DbG9zZSk7XG4gICAgICAgICAgLy8gSWYgYWxyZWFkeSBjbG9zZWQsIHJlc29sdmUgaW1tZWRpYXRlbHlcbiAgICAgICAgICBpZiAod3MucmVhZHlTdGF0ZSA9PT0gd3MuQ0xPU0VEKSB7XG4gICAgICAgICAgICB3cy5yZW1vdmVFdmVudExpc3RlbmVyKCdjbG9zZScsIG9uQ2xvc2UpO1xuICAgICAgICAgICAgcmVzb2x2ZSgpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgZmlsZW5hbWUsXG4gICAgICAgICAgc3RyZWFtVHlwZSxcbiAgICAgICAgICBsaW5lQ291bnQ6IGxpbmVzU2VudCxcbiAgICAgICAgICBzdGF0dXM6ICdjb21wbGV0ZWQnXG4gICAgICAgIH07XG4gICAgICB9XG4gICAgfTtcbiAgfVxuXG4gIC8vIC0tLSBBY3Rpb24gT3BlcmF0aW9ucyAtLS1cblxuICAvKipcbiAgICogRXhlY3V0ZXMgYW4gYWN0aW9uIG9uIGEgY2FyZCB2aWEgdGhlIHNlcnZlciByZWxheS5cbiAgICpcbiAgICogQHBhcmFtIGNhcmRJZCAtIElkZW50aWZpZXIgb2YgdGhlIGNhcmQgdG8gZXhlY3V0ZSB0aGUgYWN0aW9uIG9uLlxuICAgKiBAcGFyYW0gYWN0aW9uTmFtZSAtIEFjdGlvbiBpZGVudGlmaWVyIChlLmcuLCAnbGF1bmNoJykuXG4gICAqIEByZXR1cm5zIFByb21pc2UgcmVzb2x2aW5nIHRvIHRoZSBhY3Rpb24gZXhlY3V0aW9uIHJlc3VsdC5cbiAgICogQHRocm93cyBBcGlFcnJvciB3aGVuIHRoZSBzZXJ2ZXIgcmVqZWN0cyB0aGUgcmVxdWVzdC5cbiAgICogQHRocm93cyBOZXR3b3JrRXJyb3Igd2hlbiB0aGUgcmVxdWVzdCBmYWlscyB0byByZWFjaCB0aGUgc2VydmVyLlxuICAgKi9cbiAgYXN5bmMgZXhlY3V0ZUFjdGlvbihjYXJkSWQ6IHN0cmluZywgYWN0aW9uTmFtZTogc3RyaW5nKTogUHJvbWlzZTxBY3Rpb25SZXN1bHQ+IHtcbiAgICBjb25zdCB1cmwgPSB0aGlzLmJ1aWxkVXJsKGAvY2FyZHMvJHtjYXJkSWR9L2FjdGlvbnMvJHtlbmNvZGVVUklDb21wb25lbnQoYWN0aW9uTmFtZSl9YCk7XG4gICAgcmV0dXJuIHRoaXMucmVxdWVzdCgoKSA9PiB0aGlzLmdldEh0dHBDbGllbnQoKS5wb3N0PEFjdGlvblJlc3VsdD4odXJsLCB1bmRlZmluZWQpKTtcbiAgfVxuXG4gIC8vIC0tLSBDb21wYXJlIE9wZXJhdGlvbnMgLS0tXG5cbiAgLyoqXG4gICAqIFNldHMgb3IgcmVwbGFjZXMgdGhlIGFjdGl2ZSBjb21wYXJpc29uIG9uIHRoZSBzZXJ2ZXIuXG4gICAqXG4gICAqIEBwYXJhbSByZXF1ZXN0IC0gQ29tcGFyZSByZXF1ZXN0IHNwZWNpZnlpbmcgdGhlIGNvbXBhcmlzb24gbW9kZS5cbiAgICogQHJldHVybnMgUHJvbWlzZSByZXNvbHZpbmcgdG8gdGhlIHJlc3VsdGluZyBjb21wYXJlIHN0YXRlLlxuICAgKi9cbiAgYXN5bmMgc2V0Q29tcGFyZShyZXF1ZXN0OiBDb21wYXJlUmVxdWVzdCk6IFByb21pc2U8Q29tcGFyZVN0YXRlPiB7XG4gICAgY29uc3QgdXJsID0gdGhpcy5idWlsZFVybCgnL2NvbXBhcmUnKTtcbiAgICByZXR1cm4gdGhpcy5yZXF1ZXN0KCgpID0+IHRoaXMuZ2V0SHR0cENsaWVudCgpLnBvc3Q8Q29tcGFyZVN0YXRlPih1cmwsIHJlcXVlc3QpKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXR1cm5zIHRoZSBjdXJyZW50IGNvbXBhcmUgc3RhdGUsIG9yIG51bGwgaWYgbm8gY29tcGFyaXNvbiBpcyBhY3RpdmUuXG4gICAqXG4gICAqIFRoZSBzZXJ2ZXIgcmV0dXJucyAyMDQgd2hlbiBubyBjb21wYXJpc29uIGlzIGFjdGl2ZSwgd2hpY2ggdGhpcyBtZXRob2RcbiAgICogbWFwcyB0byBudWxsIHJhdGhlciB0aGFuIHRocm93aW5nLlxuICAgKlxuICAgKiBAcmV0dXJucyBQcm9taXNlIHJlc29sdmluZyB0byB0aGUgY3VycmVudCBjb21wYXJlIHN0YXRlLCBvciBudWxsIGlmIG5vbmUgYWN0aXZlLlxuICAgKi9cbiAgYXN5bmMgZ2V0Q29tcGFyZSgpOiBQcm9taXNlPENvbXBhcmVTdGF0ZSB8IG51bGw+IHtcbiAgICBjb25zdCB1cmwgPSB0aGlzLmJ1aWxkVXJsKCcvY29tcGFyZScpO1xuICAgIHJldHVybiB0aGlzLnJlcXVlc3QoYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBmZXRjaCh1cmwsIHtcbiAgICAgICAgaGVhZGVyczogdGhpcy5nZXRIZWFkZXJzKCkgYXMgUmVjb3JkPHN0cmluZywgc3RyaW5nPixcbiAgICAgICAgc2lnbmFsOiB0aGlzLmdldFRpbWVvdXRTaWduYWwoKVxuICAgICAgfSk7XG4gICAgICBpZiAocmVzcG9uc2Uuc3RhdHVzID09PSAyMDQpIHtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9XG4gICAgICBpZiAoIXJlc3BvbnNlLm9rKSB0aHJvdyByZXNwb25zZTtcbiAgICAgIHJldHVybiByZXNwb25zZS5qc29uKCkgYXMgUHJvbWlzZTxDb21wYXJlU3RhdGU+O1xuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIENsZWFycyB0aGUgYWN0aXZlIGNvbXBhcmlzb24gb24gdGhlIHNlcnZlci5cbiAgICpcbiAgICogQHJldHVybnMgUHJvbWlzZSByZXNvbHZpbmcgd2hlbiB0aGUgY29tcGFyaXNvbiBpcyBjbGVhcmVkLlxuICAgKi9cbiAgYXN5bmMgY2xlYXJDb21wYXJlKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIGNvbnN0IHVybCA9IHRoaXMuYnVpbGRVcmwoJy9jb21wYXJlJyk7XG4gICAgcmV0dXJuIHRoaXMucmVxdWVzdCgoKSA9PiB0aGlzLmdldEh0dHBDbGllbnQoKS5kZWxldGUodXJsKSk7XG4gIH1cbn1cbiIsICIvKipcbiAqIENsYXVkZSBDb2RlIG1hcmtldHBsYWNlIHJlZ2lzdHJhdGlvbiB1dGlsaXRpZXMuXG4gKlxuICogUHJvdmlkZXMgZnVuY3Rpb25zIGZvciByZXNvbHZpbmcgdGhlIENsYXVkZSBDb2RlIGNvbmZpZ3VyYXRpb24gZGlyZWN0b3J5XG4gKiBhbmQgdXBkYXRpbmcgdGhlIGBrbm93bl9tYXJrZXRwbGFjZXMuanNvbmAgZmlsZSBzbyB0aGF0IHBsdWdpbiB2ZXJzaW9uXG4gKiBjaGVja3MgaGl0IHRoZSBjYWNoZSBpbnN0ZWFkIG9mIHJlLXNjYW5uaW5nIHRoZSBzb3VyY2UgZGlyZWN0b3J5LlxuICpcbiAqIEBzdW1tYXJ5IENsYXVkZSBDb2RlIG1hcmtldHBsYWNlIHJlZ2lzdHJhdGlvbiB1dGlsaXRpZXNcbiAqIEBtb2R1bGVcbiAqL1xuXG5pbXBvcnQgKiBhcyBmcyBmcm9tICdub2RlOmZzL3Byb21pc2VzJztcbmltcG9ydCB7IGhvbWVkaXIgfSBmcm9tICdub2RlOm9zJztcbmltcG9ydCAqIGFzIHBhdGggZnJvbSAnbm9kZTpwYXRoJztcbmltcG9ydCB0eXBlIHsgSUxvZ2dlciB9IGZyb20gJy4vY29uZmlnL2xvZ2dlci5qcyc7XG5cbi8qKlxuICogUmVzb2x2ZXMgdGhlIENsYXVkZSBDb2RlIGNvbmZpZ3VyYXRpb24gZGlyZWN0b3J5IHVzaW5nIHRoZSBzdGFuZGFyZFxuICogZmFsbGJhY2sgY2hhaW46ICRDTEFVREVfQ09ORklHX0RJUiBcdTIxOTIgJFhER19EQVRBX0hPTUUvY2xhdWRlIFx1MjE5MlxuICogJFhER19DT05GSUdfSE9NRS9jbGF1ZGUgXHUyMTkyIH4vLmNvbmZpZy9jbGF1ZGUgXHUyMTkyIH4vLmNsYXVkZS5cbiAqXG4gKiBSZXR1cm5zIHRoZSBmaXJzdCBjYW5kaWRhdGUgdGhhdCBleGlzdHMgb24gZGlzaywgb3IgbnVsbCBpZiBub25lIGlzIGZvdW5kLlxuICpcbiAqIEByZXR1cm5zIFRoZSBmaXJzdCBleGlzdGluZyBDbGF1ZGUgY29uZmlnIGRpcmVjdG9yeSBwYXRoLCBvciBudWxsIGlmIG5vbmUgZm91bmQuXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiByZXNvbHZlQ2xhdWRlQ29uZmlnRGlyKCk6IFByb21pc2U8c3RyaW5nIHwgbnVsbD4ge1xuICBjb25zdCBob21lID0gaG9tZWRpcigpO1xuICBjb25zdCBjYW5kaWRhdGVzOiBzdHJpbmdbXSA9IFtdO1xuXG4gIGNvbnN0IGNsYXVkZUNvbmZpZ0RpciA9IHByb2Nlc3MuZW52WydDTEFVREVfQ09ORklHX0RJUiddO1xuICBpZiAoY2xhdWRlQ29uZmlnRGlyKSBjYW5kaWRhdGVzLnB1c2goY2xhdWRlQ29uZmlnRGlyKTtcblxuICBjb25zdCB4ZGdEYXRhSG9tZSA9IHByb2Nlc3MuZW52WydYREdfREFUQV9IT01FJ107XG4gIGlmICh4ZGdEYXRhSG9tZSkgY2FuZGlkYXRlcy5wdXNoKHBhdGguam9pbih4ZGdEYXRhSG9tZSwgJ2NsYXVkZScpKTtcblxuICBjb25zdCB4ZGdDb25maWdIb21lID0gcHJvY2Vzcy5lbnZbJ1hER19DT05GSUdfSE9NRSddO1xuICBpZiAoeGRnQ29uZmlnSG9tZSkgY2FuZGlkYXRlcy5wdXNoKHBhdGguam9pbih4ZGdDb25maWdIb21lLCAnY2xhdWRlJykpO1xuXG4gIGNhbmRpZGF0ZXMucHVzaChwYXRoLmpvaW4oaG9tZSwgJy5jb25maWcnLCAnY2xhdWRlJykpO1xuICBjYW5kaWRhdGVzLnB1c2gocGF0aC5qb2luKGhvbWUsICcuY2xhdWRlJykpO1xuXG4gIGZvciAoY29uc3QgY2FuZGlkYXRlIG9mIGNhbmRpZGF0ZXMpIHtcbiAgICB0cnkge1xuICAgICAgYXdhaXQgZnMuYWNjZXNzKHBhdGguam9pbihjYW5kaWRhdGUsICdwbHVnaW5zJykpO1xuICAgICAgcmV0dXJuIGNhbmRpZGF0ZTtcbiAgICB9IGNhdGNoIChlcnJvcjogdW5rbm93bikge1xuICAgICAgaWYgKGVycm9yIGluc3RhbmNlb2YgRXJyb3IgJiYgJ2NvZGUnIGluIGVycm9yICYmIGVycm9yLmNvZGUgPT09ICdFTk9FTlQnKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgdGhyb3cgZXJyb3I7XG4gICAgfVxuICB9XG4gIHJldHVybiBudWxsO1xufVxuXG4vKipcbiAqIFVwZGF0ZXMgdGhlIGBjYXJkcy5tYW5hZ2VtZW50YCBlbnRyeSBpbiBDbGF1ZGUgQ29kZSdzIGBrbm93bl9tYXJrZXRwbGFjZXMuanNvbmBcbiAqIHRvIHBvaW50IHRvIHRoZSBleHRlbnNpb24tYnVuZGxlZCBtYXJrZXRwbGFjZSB1c2luZyBhbiBhYnNvbHV0ZSBwYXRoLlxuICpcbiAqIENsYXVkZSBDb2RlIHJlc29sdmVzIGRpcmVjdG9yeSBtYXJrZXRwbGFjZSBzb3VyY2VzIHJlbGF0aXZlIHRvIHRoZSBzcGF3bmVkXG4gKiBzZXNzaW9uJ3MgQ1dELiBXaGVuIHNlc3Npb25zIHJ1biBpbiBhIHdvcmt0cmVlLCBhIHJlbGF0aXZlIHBhdGggbGlrZSBgXCJwdWJsaWNcImBcbiAqIHJlc29sdmVzIHRvIHRoZSB3b3JrdHJlZSdzIGNvcHkgXHUyMDE0IHdoaWNoIG1heSBjb250YWluIGEgc3RhbGUgcGx1Z2luIHZlcnNpb24uXG4gKiBXcml0aW5nIGFuIGFic29sdXRlIHBhdGggZW5zdXJlcyBDbGF1ZGUgQ29kZSBhbHdheXMgcmVhZHMgZnJvbSB0aGUgZXh0ZW5zaW9uJ3NcbiAqIGJ1bmRsZWQgbWFya2V0cGxhY2UsIHJlZ2FyZGxlc3Mgb2YgQ1dELlxuICpcbiAqICMjIEhvdyBDbGF1ZGUgQ29kZSdzIHBsdWdpbiB2ZXJzaW9uIHN5bmNpbmcgd29ya3NcbiAqXG4gKiBUaGlzIHJlZ2lzdHJhdGlvbiB1cGRhdGUgaXMgdGhlICoqb25seSoqIGludGVydmVudGlvbiB3ZSBuZWVkLiBDbGF1ZGUgQ29kZSdzXG4gKiBidWlsdC1pbiBhdXRvLXVwZGF0ZSBzeXN0ZW0gaGFuZGxlcyB0aGUgcmVzdDpcbiAqXG4gKiAxLiAqKlZlcnNpb24gZGV0ZWN0aW9uKiogXHUyMDE0IE9uIHNlc3Npb24gc3RhcnQsIENsYXVkZSBDb2RlIHJlYWRzIHRoZSBtYXJrZXRwbGFjZVxuICogICAgc291cmNlIGRpcmVjdG9yeSAodGhlIGBzb3VyY2UucGF0aGAgd3JpdHRlbiBoZXJlKSBhbmQgZXh0cmFjdHMgdGhlIHZlcnNpb25cbiAqICAgIGZyb20gZWFjaCBwbHVnaW4ncyBgLmNsYXVkZS1wbHVnaW4vcGx1Z2luLmpzb25gLlxuICpcbiAqIDIuICoqQ2FjaGUtcGVyLXZlcnNpb24qKiBcdTIwMTQgRWFjaCBwbHVnaW4gdmVyc2lvbiBpcyBjYWNoZWQgaW5kZXBlbmRlbnRseSB1bmRlclxuICogICAgYDxjb25maWdEaXI+L3BsdWdpbnMvY2FjaGUvPG1hcmtldHBsYWNlPi88cGx1Z2luPi88dmVyc2lvbj4vYC4gVGhlIGFjdGl2ZVxuICogICAgdmVyc2lvbidzIHBhdGggaXMgcmVjb3JkZWQgYXMgYGluc3RhbGxQYXRoYCBpbiBgaW5zdGFsbGVkX3BsdWdpbnMuanNvbmAuXG4gKlxuICogMy4gKipBdXRvLXVwZGF0ZSoqIFx1MjAxNCBXaGVuIHRoZSBzb3VyY2UgZGlyZWN0b3J5IGNvbnRhaW5zIGEgbmV3ZXIgdmVyc2lvbiB0aGFuXG4gKiAgICB3aGF0J3MgY2FjaGVkLCBDbGF1ZGUgQ29kZSBjb3BpZXMgdGhlIHNvdXJjZSBpbnRvIGEgbmV3IHZlcnNpb25lZCBjYWNoZVxuICogICAgZGlyZWN0b3J5LCB1cGRhdGVzIGBpbnN0YWxsZWRfcGx1Z2lucy5qc29uYCB0byBwb2ludCB0byBpdCwgYW5kIHdyaXRlcyBhXG4gKiAgICBgLm9ycGhhbmVkX2F0YCB0aW1lc3RhbXAgaW50byB0aGUgb2xkIHZlcnNpb24ncyBjYWNoZSBkaXJlY3RvcnkuXG4gKlxuICogNC4gKipPcnBoYW4gR0MqKiBcdTIwMTQgQSBiYWNrZ3JvdW5kIGhvdXNla2VlcGluZyB0YXNrIHJ1bnMgZXZlcnkgMTAgbWludXRlcy4gSXRcbiAqICAgIHdhbGtzIHRoZSBjYWNoZSwgbWFya3MgYW55IHZlcnNpb24gZGlyZWN0b3J5IG5vdCByZWZlcmVuY2VkIGJ5XG4gKiAgICBgaW5zdGFsbGVkX3BsdWdpbnMuanNvbmAgd2l0aCBgLm9ycGhhbmVkX2F0YCwgYW5kIGRlbGV0ZXMgb3JwaGFuZWRcbiAqICAgIGRpcmVjdG9yaWVzIG9ubHkgYWZ0ZXIgYSAqKjctZGF5KiogZ3JhY2UgcGVyaW9kLiBUaGlzIGVuc3VyZXMgdGhhdFxuICogICAgY29uY3VycmVudGx5IHJ1bm5pbmcgc2Vzc2lvbnMgYXJlIG5ldmVyIGRpc3J1cHRlZCBieSBjYWNoZSBkZWxldGlvbi5cbiAqXG4gKiBXZSBwcmV2aW91c2x5IGZvcmNlLWRlbGV0ZWQgc3RhbGUgY2FjaGUgZW50cmllcyAoYGV2aWN0U3RhbGVSdW50aW1lQ2FjaGVgKSxcbiAqIHdoaWNoIGJ5cGFzc2VkIHRoZSA3LWRheSBncmFjZSBwZXJpb2QgYW5kIGNhdXNlZCBFTk9FTlQgZXJyb3JzIGluIHNlc3Npb25zXG4gKiBzdGlsbCByZWZlcmVuY2luZyB0aGUgZGVsZXRlZCBwYXRocy5cbiAqXG4gKiBAcGFyYW0gbWFya2V0cGxhY2VQYXRoIC0gQWJzb2x1dGUgcGF0aCB0byB0aGUgYnVuZGxlZCBtYXJrZXRwbGFjZSBkaXJlY3RvcnkuXG4gKiBAcGFyYW0gbG9nZ2VyIC0gTG9nZ2VyIGZvciBkaWFnbm9zdGljIG91dHB1dC5cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHVwZGF0ZU1hcmtldHBsYWNlUmVnaXN0cmF0aW9uKG1hcmtldHBsYWNlUGF0aDogc3RyaW5nLCBsb2dnZXI6IElMb2dnZXIpOiBQcm9taXNlPHZvaWQ+IHtcbiAgY29uc3QgY29uZmlnRGlyID0gYXdhaXQgcmVzb2x2ZUNsYXVkZUNvbmZpZ0RpcigpO1xuICBpZiAoIWNvbmZpZ0Rpcikge1xuICAgIGxvZ2dlci5kZWJ1ZygnQ2xhdWRlIGNvbmZpZyBkaXJlY3Rvcnkgbm90IGZvdW5kLCBza2lwcGluZyBtYXJrZXRwbGFjZSByZWdpc3RyYXRpb24gdXBkYXRlJyk7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgY29uc3Qga25vd25QYXRoID0gcGF0aC5qb2luKGNvbmZpZ0RpciwgJ3BsdWdpbnMnLCAna25vd25fbWFya2V0cGxhY2VzLmpzb24nKTtcbiAgbGV0IHJhdzogc3RyaW5nO1xuICB0cnkge1xuICAgIHJhdyA9IGF3YWl0IGZzLnJlYWRGaWxlKGtub3duUGF0aCwgJ3V0Zi04Jyk7XG4gIH0gY2F0Y2ggKGVycm9yOiB1bmtub3duKSB7XG4gICAgaWYgKGVycm9yIGluc3RhbmNlb2YgRXJyb3IgJiYgJ2NvZGUnIGluIGVycm9yICYmIGVycm9yLmNvZGUgPT09ICdFTk9FTlQnKSB7XG4gICAgICBsb2dnZXIuZGVidWcoJ2tub3duX21hcmtldHBsYWNlcy5qc29uIG5vdCBmb3VuZCwgc2tpcHBpbmcnKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdGhyb3cgZXJyb3I7XG4gIH1cblxuICBjb25zdCBkYXRhID0gSlNPTi5wYXJzZShyYXcpIGFzIFJlY29yZDxcbiAgICBzdHJpbmcsXG4gICAgeyBzb3VyY2U/OiB7IHNvdXJjZT86IHN0cmluZzsgcGF0aD86IHN0cmluZyB9OyBpbnN0YWxsTG9jYXRpb24/OiBzdHJpbmc7IGxhc3RVcGRhdGVkPzogc3RyaW5nIH1cbiAgPjtcbiAgY29uc3QgZW50cnkgPSBkYXRhWydjYXJkcy5tYW5hZ2VtZW50J107XG4gIGlmICghZW50cnk/LnNvdXJjZSB8fCBlbnRyeS5zb3VyY2Uuc291cmNlICE9PSAnZGlyZWN0b3J5JykgcmV0dXJuO1xuXG4gIGlmIChlbnRyeS5zb3VyY2UucGF0aCA9PT0gbWFya2V0cGxhY2VQYXRoICYmIGVudHJ5Lmluc3RhbGxMb2NhdGlvbiA9PT0gbWFya2V0cGxhY2VQYXRoKSB7XG4gICAgbG9nZ2VyLmRlYnVnKCdNYXJrZXRwbGFjZSByZWdpc3RyYXRpb24gYWxyZWFkeSBwb2ludHMgdG8gZXh0ZW5zaW9uIGJ1bmRsZScpO1xuICAgIHJldHVybjtcbiAgfVxuXG4gIGVudHJ5LnNvdXJjZS5wYXRoID0gbWFya2V0cGxhY2VQYXRoO1xuICBlbnRyeS5pbnN0YWxsTG9jYXRpb24gPSBtYXJrZXRwbGFjZVBhdGg7XG4gIGVudHJ5Lmxhc3RVcGRhdGVkID0gbmV3IERhdGUoKS50b0lTT1N0cmluZygpO1xuICBhd2FpdCBmcy53cml0ZUZpbGUoa25vd25QYXRoLCBgJHtKU09OLnN0cmluZ2lmeShkYXRhLCBudWxsLCA0KX1cXG5gKTtcbiAgbG9nZ2VyLmluZm8oJ1VwZGF0ZWQgbWFya2V0cGxhY2UgcmVnaXN0cmF0aW9uIHRvIGV4dGVuc2lvbiBidW5kbGUnLCB7IG1hcmtldHBsYWNlUGF0aCB9KTtcbn1cbiIsICIvKipcbiAqIEdpdCB3b3JrdHJlZSBsaWZlY3ljbGUgbWFuYWdlbWVudCBmb3IgbW9ub3JlcG8gd29ya3NwYWNlcy5cbiAqXG4gKiBDcmVhdGVzIHdvcmt0cmVlcyB3aXRoIHN5bWxpbmtlZCBub2RlX21vZHVsZXMsIGlnbm9yZWQgcGF0aHMsIGFuZFxuICogcGVyLXdvcmt0cmVlIGdpdCBleGNsdWRlcyBzbyB0aGUgd29ya3RyZWUgaXMgaW1tZWRpYXRlbHkgdXNhYmxlIGZvclxuICogYnVpbGRzIGFuZCB0ZXN0cyB3aXRob3V0IGEgc2VwYXJhdGUgYHlhcm4gaW5zdGFsbGAuXG4gKlxuICogU3VwcG9ydHMgYm90aCBicmFuY2gtYmFzZWQgd29ya3RyZWVzIChmb3IgaW1wbGVtZW50YXRpb24gd29yaykgYW5kXG4gKiBkZXRhY2hlZCB3b3JrdHJlZXMgKGZvciB2ZXJpZnlpbmcgc3RhdGUgYXQgYSB0YWcgb3IgY29tbWl0KS5cbiAqXG4gKiBAc3VtbWFyeSBHaXQgd29ya3RyZWUgY3JlYXRpb24gd2l0aCBtb25vcmVwbyBzeW1saW5rIHdpcmluZ1xuICogQG1vZHVsZSB3b3JrdHJlZVxuICovXG5cbmltcG9ydCB7IGV4ZWNGaWxlIH0gZnJvbSAnbm9kZTpjaGlsZF9wcm9jZXNzJztcbmltcG9ydCAqIGFzIGZzIGZyb20gJ25vZGU6ZnMvcHJvbWlzZXMnO1xuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdub2RlOnBhdGgnO1xuaW1wb3J0IHsgcHJvbWlzaWZ5IH0gZnJvbSAnbm9kZTp1dGlsJztcblxuY29uc3QgZXhlY0ZpbGVBc3luYyA9IHByb21pc2lmeShleGVjRmlsZSk7XG5cbi8qKlxuICogVmFsaWRhdGVzIGEgYnJhbmNoIG5hbWUgYWdhaW5zdCB0aGUgQ0xJJ3Mgc2FmZSBzdWJzZXQuXG4gKlxuICogVGhlIG5hbWUgbXVzdCBzdGFydCB3aXRoIGFuIGFscGhhbnVtZXJpYyBjaGFyYWN0ZXIgYW5kIG1heSB0aGVuIGluY2x1ZGVcbiAqIGFscGhhbnVtZXJpY3MsIHNsYXNoZXMsIHVuZGVyc2NvcmVzLCBvciBkYXNoZXMuXG4gKlxuICogQHBhcmFtIG5hbWUgLSBDYW5kaWRhdGUgYnJhbmNoIG5hbWUgc3VwcGxpZWQgYnkgdGhlIGNhbGxlci5cbiAqIEB0aHJvd3Mge0Vycm9yfSBXaGVuIHRoZSBicmFuY2ggbmFtZSBkb2VzIG5vdCBtYXRjaCB0aGUgc3VwcG9ydGVkIGZvcm1hdC5cbiAqIEByZXR1cm5zIE5vIHZhbHVlLiBUaHJvd3Mgb24gaW52YWxpZCBpbnB1dC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHZhbGlkYXRlQnJhbmNoTmFtZShuYW1lOiBzdHJpbmcpOiB2b2lkIHtcbiAgY29uc3QgYnJhbmNoTmFtZVJlZ2V4ID0gL15bYS16QS1aMC05XVthLXpBLVowLTkvXy1dKiQvO1xuICBpZiAoIWJyYW5jaE5hbWVSZWdleC50ZXN0KG5hbWUpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdFcnJvcjogSW52YWxpZCBicmFuY2ggbmFtZSBmb3JtYXQuJyk7XG4gIH1cbn1cblxuLyoqXG4gKiBEZXRlcm1pbmVzIHdoZXRoZXIgYSByZWxhdGl2ZSBwYXRoIGlzIG5lc3RlZCB1bmRlciBhbnkga25vd24gcGFyZW50IHBhdGguXG4gKlxuICogVGhlIGNoZWNrIHdhbGtzIGFuY2VzdG9yIHNlZ21lbnRzIG9mIGBkaXJgIGFuZCByZXR1cm5zIHRydWUgb24gdGhlIGZpcnN0XG4gKiBtYXRjaCBpbiBgcGFyZW50U2V0YC5cbiAqXG4gKiBAcGFyYW0gZGlyIC0gUmVsYXRpdmUgcGF0aCB0byB0ZXN0LlxuICogQHBhcmFtIHBhcmVudFNldCAtIENhbmRpZGF0ZSBwYXJlbnQgZGlyZWN0b3JpZXMgcmVwcmVzZW50ZWQgYXMgcmVsYXRpdmUgcGF0aHMuXG4gKiBAcmV0dXJucyBUcnVlIHdoZW4gYGRpcmAgaXMgbmVzdGVkIHVuZGVyIGEgcGF0aCBpbiBgcGFyZW50U2V0YC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzTmVzdGVkVW5kZXIoZGlyOiBzdHJpbmcsIHBhcmVudFNldDogU2V0PHN0cmluZz4pOiBib29sZWFuIHtcbiAgbGV0IGN1cnJlbnQgPSBkaXI7XG4gIHdoaWxlIChjdXJyZW50LmluY2x1ZGVzKCcvJykpIHtcbiAgICBjdXJyZW50ID0gY3VycmVudC5zdWJzdHJpbmcoMCwgY3VycmVudC5sYXN0SW5kZXhPZignLycpKTtcbiAgICBpZiAocGFyZW50U2V0LmhhcyhjdXJyZW50KSkge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICB9XG4gIHJldHVybiBmYWxzZTtcbn1cblxuLyoqXG4gKiBDaGVja3Mgd2hldGhlciBhIHN5bWxpbmsgdGFyZ2V0IHBvaW50cyB0byBrbm93biBtb25vcmVwby1pbnRlcm5hbCBsb2NhdGlvbnMuXG4gKlxuICogSW50ZXJuYWwgdGFyZ2V0cyBhcmUgcHJlc2VydmVkIGFzIHJlbGF0aXZlIGxpbmtzIGR1cmluZyBub2RlX21vZHVsZXMgcmVyb3V0ZVxuICogc28gd29ya3NwYWNlIGxpbmtzIGtlZXAgd29ya2luZyBpbnNpZGUgYSB3b3JrdHJlZS5cbiAqXG4gKiBAcGFyYW0gdGFyZ2V0IC0gU3ltbGluayB0YXJnZXQgcmVhZCBmcm9tIHRoZSBzb3VyY2Ugbm9kZV9tb2R1bGVzIGVudHJ5LlxuICogQHJldHVybnMgVHJ1ZSB3aGVuIHRoZSB0YXJnZXQgc3RhcnRzIHdpdGggYW4gaW50ZXJuYWwgcHJlZml4LlxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNJbnRlcm5hbFN5bWxpbmsodGFyZ2V0OiBzdHJpbmcpOiBib29sZWFuIHtcbiAgcmV0dXJuIHRhcmdldC5zdGFydHNXaXRoKCcuLi8nKTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBDcmVhdGVXb3JrdHJlZVJlc3VsdCB7XG4gIGJyYW5jaDogc3RyaW5nO1xuICB3b3JrdHJlZTogc3RyaW5nO1xuICBiYXNlU2hhOiBzdHJpbmc7XG4gIHJlcm91dGVkU3ltbGlua3M/OiBudW1iZXI7XG59XG5cbi8qKlxuICogQ3JlYXRlcyBhbmQgY29uZmlndXJlcyBhIG5ldyBnaXQgd29ya3RyZWUuXG4gKlxuICogVGhlIHdvcmtmbG93IHZhbGlkYXRlcyB0aGUgcmVmLCBjcmVhdGVzIHRoZSB3b3JrdHJlZSwgbWlycm9ycyBleGlzdGluZyByb290XG4gKiBzeW1saW5rcywgc3ltbGlua3MgaWdub3JlZCBwYXRocywgcmVyb3V0ZXMgbm9kZV9tb2R1bGVzIGxpbmtzLCBhbmQgdXBkYXRlc1xuICogcGVyLXdvcmt0cmVlIGdpdCBleGNsdWRlcy5cbiAqXG4gKiBXaGVuIGByZWZgIGlzIGEgYnJhbmNoIG5hbWUsIHRoZSB3b3JrdHJlZSBjaGVja3Mgb3V0IHRoYXQgYnJhbmNoIChjcmVhdGluZ1xuICogaXQgaWYgbmVlZGVkKS4gV2hlbiBgcmVmYCBpcyBhIHRhZyBvciBjb21taXQgU0hBLCB0aGUgd29ya3RyZWUgaXMgY3JlYXRlZFxuICogaW4gZGV0YWNoZWQgSEVBRCBtb2RlLlxuICpcbiAqIEBwYXJhbSByZWYgLSBCcmFuY2ggbmFtZSwgdGFnIG5hbWUsIG9yIGNvbW1pdCBTSEEuXG4gKiBAcGFyYW0gb3B0aW9ucyAtIE9wdGlvbmFsIGNvbmZpZ3VyYXRpb24uXG4gKiBAcGFyYW0gb3B0aW9ucy5jd2QgLSBXb3JraW5nIGRpcmVjdG9yeSB0byB1c2Ugd2hlbiBsb2NhdGluZyBnaXQgcm9vdHMuIERlZmF1bHRzIHRvIGBwcm9jZXNzLmN3ZCgpYC5cbiAqIEByZXR1cm5zIE1ldGFkYXRhIGRlc2NyaWJpbmcgdGhlIGNyZWF0ZWQgd29ya3RyZWUgYW5kIGJhc2UgY29tbWl0LlxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gY3JlYXRlV29ya3RyZWUocmVmOiBzdHJpbmcsIG9wdGlvbnM/OiB7IGN3ZD86IHN0cmluZyB9KTogUHJvbWlzZTxDcmVhdGVXb3JrdHJlZVJlc3VsdD4ge1xuICBjb25zdCB7IHNvdXJjZVJvb3QsIHJlcG9Sb290IH0gPSBhd2FpdCBmaW5kR2l0Um9vdHMob3B0aW9ucz8uY3dkID8/IHByb2Nlc3MuY3dkKCkpO1xuXG4gIC8vIERldGVybWluZSB3aGV0aGVyIHRoaXMgaXMgYW4gZXhpc3RpbmcgcmVmIG9yIGEgbmV3IGJyYW5jaCBuYW1lLlxuICAvLyByZXNvbHZlUmVmVHlwZSB0aHJvd3MgZm9yIHVua25vd24gcmVmczsgYSB2YWxpZCBicmFuY2ggbmFtZSB0aGF0XG4gIC8vIGRvZXNuJ3QgZXhpc3QgeWV0IGlzIHRyZWF0ZWQgYXMgYSBuZXcgYnJhbmNoIHRvIGNyZWF0ZS5cbiAgbGV0IHJlZlR5cGU6ICdicmFuY2gnIHwgJ3RhZycgfCAnY29tbWl0JztcbiAgdHJ5IHtcbiAgICByZWZUeXBlID0gYXdhaXQgcmVzb2x2ZVJlZlR5cGUocmVwb1Jvb3QsIHJlZik7XG4gIH0gY2F0Y2gge1xuICAgIHZhbGlkYXRlQnJhbmNoTmFtZShyZWYpO1xuICAgIHJlZlR5cGUgPSAnYnJhbmNoJztcbiAgfVxuXG4gIGlmIChyZWZUeXBlID09PSAnYnJhbmNoJykge1xuICAgIHZhbGlkYXRlQnJhbmNoTmFtZShyZWYpO1xuICB9XG5cbiAgY29uc3Qgd29ya3RyZWVEaXIgPSBwYXRoLmpvaW4ocmVwb1Jvb3QsICcud29ya3RyZWVzJywgcmVmKTtcblxuICBjb25zdCB3b3JrdHJlZUV4aXN0cyA9IGF3YWl0IGNoZWNrV29ya3RyZWVFeGlzdHMocmVwb1Jvb3QsIHdvcmt0cmVlRGlyKTtcbiAgaWYgKHdvcmt0cmVlRXhpc3RzKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBFcnJvcjogV29ya3RyZWUgYWxyZWFkeSBleGlzdHMgYXQgJHt3b3JrdHJlZURpcn1gKTtcbiAgfVxuXG4gIGF3YWl0IGNsZWFuU3RhbGVXb3JrdHJlZURpcihyZXBvUm9vdCwgd29ya3RyZWVEaXIpO1xuXG4gIGlmIChyZWZUeXBlID09PSAnYnJhbmNoJykge1xuICAgIGNvbnN0IHN0YXJ0UG9pbnQgPSBhd2FpdCByZXNvbHZlSGVhZChzb3VyY2VSb290KTtcbiAgICBjb25zdCBicmFuY2hFeGlzdHMgPSBhd2FpdCBjaGVja0JyYW5jaEV4aXN0cyhyZXBvUm9vdCwgcmVmKTtcbiAgICBhd2FpdCBhZGRXb3JrdHJlZSh7IHJlcG9Sb290LCB3b3JrdHJlZURpciwgYnJhbmNoTmFtZTogcmVmLCBicmFuY2hFeGlzdHMsIHN0YXJ0UG9pbnQgfSk7XG4gIH0gZWxzZSB7XG4gICAgYXdhaXQgYWRkRGV0YWNoZWRXb3JrdHJlZShyZXBvUm9vdCwgd29ya3RyZWVEaXIsIHJlZik7XG4gIH1cblxuICBjb25zdCBpZ25vcmVkID0gYXdhaXQgZGlzY292ZXJJZ25vcmVkUGF0aHMoc291cmNlUm9vdCk7XG4gIGF3YWl0IGNvcHlFeGlzdGluZ1N5bWxpbmtzKHNvdXJjZVJvb3QsIHdvcmt0cmVlRGlyKTtcbiAgYXdhaXQgc3ltbGlua0lnbm9yZWRQYXRocyh7IHNvdXJjZVJvb3QsIHdvcmt0cmVlRGlyLCBpZ25vcmVkIH0pO1xuXG4gIGNvbnN0IHJlcm91dGVkQ291bnQgPSBhd2FpdCByZXJvdXRlQWxsTm9kZU1vZHVsZXMoeyBzb3VyY2VSb290LCB3b3JrdHJlZURpciwgcmVwb1Jvb3QgfSk7XG5cbiAgY29uc3QgWywgYmFzZVNoYV0gPSBhd2FpdCBQcm9taXNlLmFsbChbXG4gICAgdXBkYXRlR2l0RXhjbHVkZSh7IHdvcmt0cmVlRGlyLCByZXBvUm9vdCwgZGlyZWN0b3JpZXM6IGlnbm9yZWQuZGlyZWN0b3JpZXMsIGZpbGVzOiBpZ25vcmVkLmZpbGVzIH0pLFxuICAgIHJlc29sdmVIZWFkKHdvcmt0cmVlRGlyKVxuICBdKTtcblxuICBjb25zdCByZXN1bHQ6IENyZWF0ZVdvcmt0cmVlUmVzdWx0ID0ge1xuICAgIGJyYW5jaDogcmVmLFxuICAgIHdvcmt0cmVlOiB3b3JrdHJlZURpcixcbiAgICBiYXNlU2hhXG4gIH07XG5cbiAgaWYgKHJlcm91dGVkQ291bnQgPiAwKSB7XG4gICAgcmVzdWx0LnJlcm91dGVkU3ltbGlua3MgPSByZXJvdXRlZENvdW50O1xuICB9XG5cbiAgcmV0dXJuIHJlc3VsdDtcbn1cblxuLyoqXG4gKiBSZW1vdmVzIHN0YWxlIGRpcmVjdG9yeSByZW1uYW50cyBsZWZ0IGJ5IGEgY3Jhc2hlZCBwcmV2aW91cyBzZXNzaW9uLlxuICpcbiAqIEdpdCBkb2Vzbid0IHRyYWNrIHRoZSB3b3JrdHJlZSwgYnV0IHRoZSBkaXJlY3RvcnkgbWF5IHN0aWxsIGV4aXN0IG9uIGRpc2ssXG4gKiB3aGljaCBjYXVzZXMgYGdpdCB3b3JrdHJlZSBhZGRgIHRvIGZhaWwgd2l0aCBcImFscmVhZHkgZXhpc3RzXCIuXG4gKlxuICogQHBhcmFtIHJlcG9Sb290IC0gUHJpbWFyeSByZXBvc2l0b3J5IHJvb3Qgd2hlcmUgZ2l0IGNvbW1hbmRzIHJ1bi5cbiAqIEBwYXJhbSB3b3JrdHJlZURpciAtIEFic29sdXRlIHdvcmt0cmVlIHBhdGggYmVpbmcgY3JlYXRlZC5cbiAqL1xuYXN5bmMgZnVuY3Rpb24gY2xlYW5TdGFsZVdvcmt0cmVlRGlyKHJlcG9Sb290OiBzdHJpbmcsIHdvcmt0cmVlRGlyOiBzdHJpbmcpOiBQcm9taXNlPHZvaWQ+IHtcbiAgdHJ5IHtcbiAgICBhd2FpdCBmcy5hY2Nlc3Mod29ya3RyZWVEaXIpO1xuICAgIGF3YWl0IGZzLnJtKHdvcmt0cmVlRGlyLCB7IHJlY3Vyc2l2ZTogdHJ1ZSB9KTtcbiAgICBhd2FpdCBleGVjRmlsZUFzeW5jKCdnaXQnLCBbJ3dvcmt0cmVlJywgJ3BydW5lJ10sIHsgY3dkOiByZXBvUm9vdCwgdGltZW91dDogMzBfMDAwIH0pO1xuICB9IGNhdGNoIChlcnJvcjogdW5rbm93bikge1xuICAgIGlmICgoZXJyb3IgYXMgTm9kZUpTLkVycm5vRXhjZXB0aW9uKS5jb2RlICE9PSAnRU5PRU5UJykge1xuICAgICAgdGhyb3cgZXJyb3I7XG4gICAgfVxuICB9XG59XG5cbmludGVyZmFjZSBHaXRSb290cyB7XG4gIHNvdXJjZVJvb3Q6IHN0cmluZztcbiAgcmVwb1Jvb3Q6IHN0cmluZztcbn1cblxuLyoqXG4gKiBMb2NhdGVzIHRoZSBjdXJyZW50IGdpdCBzb3VyY2Ugcm9vdCBhbmQgcHJpbWFyeSByZXBvc2l0b3J5IHJvb3QuXG4gKlxuICogU3VwcG9ydHMgYm90aCBzdGFuZGFyZCBjaGVja291dHMgKGAuZ2l0YCBkaXJlY3RvcnkpIGFuZCB3b3JrdHJlZSBjaGVja291dHNcbiAqIChgLmdpdGAgZmlsZSBwb2ludGluZyBpbnRvIGAuZ2l0L3dvcmt0cmVlcy8uLi5gKS5cbiAqXG4gKiBAcGFyYW0gc3RhcnREaXIgLSBEaXJlY3Rvcnkgd2hlcmUgdXB3YXJkIHNlYXJjaCBiZWdpbnMuXG4gKiBAdGhyb3dzIHtFcnJvcn0gV2hlbiBubyBnaXQgcmVwb3NpdG9yeSBtYXJrZXIgaXMgZm91bmQuXG4gKiBAcmV0dXJucyBQYXRocyBmb3IgdGhlIGN1cnJlbnQgY2hlY2tvdXQgcm9vdCBhbmQgdGhlIHByaW1hcnkgcmVwbyByb290LlxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZmluZEdpdFJvb3RzKHN0YXJ0RGlyOiBzdHJpbmcpOiBQcm9taXNlPEdpdFJvb3RzPiB7XG4gIGxldCBjdXJyZW50RGlyID0gcGF0aC5yZXNvbHZlKHN0YXJ0RGlyKTtcbiAgd2hpbGUgKGN1cnJlbnREaXIgIT09ICcvJykge1xuICAgIGNvbnN0IGdpdFBhdGggPSBwYXRoLmpvaW4oY3VycmVudERpciwgJy5naXQnKTtcbiAgICB0cnkge1xuICAgICAgY29uc3Qgc3RhdHMgPSBhd2FpdCBmcy5sc3RhdChnaXRQYXRoKTtcbiAgICAgIGlmIChzdGF0cy5pc0RpcmVjdG9yeSgpKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgc291cmNlUm9vdDogY3VycmVudERpcixcbiAgICAgICAgICByZXBvUm9vdDogY3VycmVudERpclxuICAgICAgICB9O1xuICAgICAgfVxuICAgICAgaWYgKHN0YXRzLmlzRmlsZSgpKSB7XG4gICAgICAgIGNvbnN0IGdpdEZpbGVDb250ZW50ID0gYXdhaXQgZnMucmVhZEZpbGUoZ2l0UGF0aCwgJ3V0Zi04Jyk7XG4gICAgICAgIGNvbnN0IGdpdGRpckxpbmUgPSBnaXRGaWxlQ29udGVudC50cmltKCk7XG4gICAgICAgIGNvbnN0IGdpdGRpclBhdGggPSBnaXRkaXJMaW5lLnJlcGxhY2UoL15naXRkaXI6XFxzKi8sICcnKTtcbiAgICAgICAgY29uc3QgbWFpbkdpdERpciA9IGdpdGRpclBhdGgucmVwbGFjZSgvXFwvd29ya3RyZWVzXFwvW14vXSskLywgJycpO1xuICAgICAgICBjb25zdCByZXBvUm9vdCA9IG1haW5HaXREaXIucmVwbGFjZSgvXFwvXFwuZ2l0JC8sICcnKTtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICBzb3VyY2VSb290OiBjdXJyZW50RGlyLFxuICAgICAgICAgIHJlcG9Sb290XG4gICAgICAgIH07XG4gICAgICB9XG4gICAgfSBjYXRjaCAoZXJyb3I6IHVua25vd24pIHtcbiAgICAgIGlmICgoZXJyb3IgYXMgTm9kZUpTLkVycm5vRXhjZXB0aW9uKS5jb2RlICE9PSAnRU5PRU5UJykge1xuICAgICAgICB0aHJvdyBlcnJvcjtcbiAgICAgIH1cbiAgICB9XG4gICAgY3VycmVudERpciA9IHBhdGguZGlybmFtZShjdXJyZW50RGlyKTtcbiAgfVxuICB0aHJvdyBuZXcgRXJyb3IoJ05vdCBpbiBhIGdpdCByZXBvc2l0b3J5Jyk7XG59XG5cbi8qKlxuICogUmVzb2x2ZXMgdGhlIEhFQUQgY29tbWl0IFNIQSBmb3IgYSByZXBvc2l0b3J5IGRpcmVjdG9yeS5cbiAqXG4gKiBAcGFyYW0gY3dkIC0gUmVwb3NpdG9yeSBkaXJlY3RvcnkgcGFzc2VkIHRvIGBnaXQgcmV2LXBhcnNlIEhFQURgLlxuICogQHJldHVybnMgVHJpbW1lZCBjb21taXQgU0hBIHN0cmluZy5cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHJlc29sdmVIZWFkKGN3ZDogc3RyaW5nKTogUHJvbWlzZTxzdHJpbmc+IHtcbiAgY29uc3QgeyBzdGRvdXQgfSA9IGF3YWl0IGV4ZWNGaWxlQXN5bmMoJ2dpdCcsIFsncmV2LXBhcnNlJywgJ0hFQUQnXSwgeyBjd2QsIHRpbWVvdXQ6IDVfMDAwIH0pO1xuICByZXR1cm4gc3Rkb3V0LnRyaW0oKTtcbn1cblxuLyoqXG4gKiBDaGVja3Mgd2hldGhlciBhIHdvcmt0cmVlIHBhdGggaXMgYWxyZWFkeSByZWdpc3RlcmVkIHdpdGggZ2l0LlxuICpcbiAqIEBwYXJhbSByZXBvUm9vdCAtIFByaW1hcnkgcmVwb3NpdG9yeSByb290IHdoZXJlIGdpdCBjb21tYW5kcyBydW4uXG4gKiBAcGFyYW0gd29ya3RyZWVEaXIgLSBBYnNvbHV0ZSB3b3JrdHJlZSBwYXRoIGJlaW5nIGNyZWF0ZWQuXG4gKiBAcmV0dXJucyBUcnVlIHdoZW4gYGdpdCB3b3JrdHJlZSBsaXN0YCBhbHJlYWR5IGNvbnRhaW5zIGB3b3JrdHJlZURpcmAuXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBjaGVja1dvcmt0cmVlRXhpc3RzKHJlcG9Sb290OiBzdHJpbmcsIHdvcmt0cmVlRGlyOiBzdHJpbmcpOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgY29uc3QgeyBzdGRvdXQgfSA9IGF3YWl0IGV4ZWNGaWxlQXN5bmMoJ2dpdCcsIFsnd29ya3RyZWUnLCAnbGlzdCddLCB7IGN3ZDogcmVwb1Jvb3QsIHRpbWVvdXQ6IDMwXzAwMCB9KTtcbiAgcmV0dXJuIHN0ZG91dC5pbmNsdWRlcyh3b3JrdHJlZURpcik7XG59XG5cbi8qKlxuICogQ2hlY2tzIHdoZXRoZXIgYSBicmFuY2ggYWxyZWFkeSBleGlzdHMgaW4gdGhlIHJlcG9zaXRvcnkuXG4gKlxuICogQHBhcmFtIHJlcG9Sb290IC0gUHJpbWFyeSByZXBvc2l0b3J5IHJvb3Qgd2hlcmUgZ2l0IGNvbW1hbmRzIHJ1bi5cbiAqIEBwYXJhbSBicmFuY2hOYW1lIC0gQnJhbmNoIG5hbWUgdG8gcXVlcnkuXG4gKiBAcmV0dXJucyBUcnVlIHdoZW4gYXQgbGVhc3Qgb25lIG1hdGNoaW5nIGxvY2FsIGJyYW5jaCBpcyBsaXN0ZWQuXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBjaGVja0JyYW5jaEV4aXN0cyhyZXBvUm9vdDogc3RyaW5nLCBicmFuY2hOYW1lOiBzdHJpbmcpOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgY29uc3QgeyBzdGRvdXQgfSA9IGF3YWl0IGV4ZWNGaWxlQXN5bmMoJ2dpdCcsIFsnYnJhbmNoJywgJy0tbGlzdCcsIGJyYW5jaE5hbWVdLCB7XG4gICAgY3dkOiByZXBvUm9vdCxcbiAgICB0aW1lb3V0OiAzMF8wMDBcbiAgfSk7XG4gIHJldHVybiBzdGRvdXQudHJpbSgpLmxlbmd0aCA+IDA7XG59XG5cbi8qKlxuICogRGV0ZXJtaW5lcyB3aGV0aGVyIGEgZ2l0IHJlZiBpcyBhIGJyYW5jaCwgdGFnLCBvciBjb21taXQgU0hBLlxuICpcbiAqIENoZWNrcyBsb2NhbCBicmFuY2hlcyBmaXJzdCwgdGhlbiB0YWdzLCB0aGVuIGZhbGxzIGJhY2sgdG8gdmVyaWZ5aW5nXG4gKiB0aGUgcmVmIHJlc29sdmVzIGFzIGEgY29tbWl0LlxuICpcbiAqIEBwYXJhbSByZXBvUm9vdCAtIFByaW1hcnkgcmVwb3NpdG9yeSByb290IHdoZXJlIGdpdCBjb21tYW5kcyBydW4uXG4gKiBAcGFyYW0gcmVmIC0gVGhlIHJlZiB0byBjbGFzc2lmeS5cbiAqIEB0aHJvd3Mge0Vycm9yfSBXaGVuIHRoZSByZWYgZG9lcyBub3QgcmVzb2x2ZSB0byBhbnkga25vd24gZ2l0IG9iamVjdC5cbiAqIEByZXR1cm5zIFRoZSByZWYgdHlwZTogYCdicmFuY2gnYCwgYCd0YWcnYCwgb3IgYCdjb21taXQnYC5cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHJlc29sdmVSZWZUeXBlKHJlcG9Sb290OiBzdHJpbmcsIHJlZjogc3RyaW5nKTogUHJvbWlzZTwnYnJhbmNoJyB8ICd0YWcnIHwgJ2NvbW1pdCc+IHtcbiAgY29uc3QgYnJhbmNoRXhpc3RzID0gYXdhaXQgY2hlY2tCcmFuY2hFeGlzdHMocmVwb1Jvb3QsIHJlZik7XG4gIGlmIChicmFuY2hFeGlzdHMpIHJldHVybiAnYnJhbmNoJztcblxuICBjb25zdCB7IHN0ZG91dDogdGFnT3V0cHV0IH0gPSBhd2FpdCBleGVjRmlsZUFzeW5jKCdnaXQnLCBbJ3RhZycsICctLWxpc3QnLCByZWZdLCB7XG4gICAgY3dkOiByZXBvUm9vdCxcbiAgICB0aW1lb3V0OiAzMF8wMDBcbiAgfSk7XG4gIGlmICh0YWdPdXRwdXQudHJpbSgpLmxlbmd0aCA+IDApIHJldHVybiAndGFnJztcblxuICB0cnkge1xuICAgIGF3YWl0IGV4ZWNGaWxlQXN5bmMoJ2dpdCcsIFsncmV2LXBhcnNlJywgJy0tdmVyaWZ5JywgYCR7cmVmfV57Y29tbWl0fWBdLCB7XG4gICAgICBjd2Q6IHJlcG9Sb290LFxuICAgICAgdGltZW91dDogNV8wMDBcbiAgICB9KTtcbiAgICByZXR1cm4gJ2NvbW1pdCc7XG4gIH0gY2F0Y2gge1xuICAgIHRocm93IG5ldyBFcnJvcihgRXJyb3I6ICcke3JlZn0nIGRvZXMgbm90IHJlc29sdmUgdG8gYSBicmFuY2gsIHRhZywgb3IgY29tbWl0LmApO1xuICB9XG59XG5cbmludGVyZmFjZSBBZGRXb3JrdHJlZU9wdGlvbnMge1xuICByZXBvUm9vdDogc3RyaW5nO1xuICB3b3JrdHJlZURpcjogc3RyaW5nO1xuICBicmFuY2hOYW1lOiBzdHJpbmc7XG4gIGJyYW5jaEV4aXN0czogYm9vbGVhbjtcbiAgc3RhcnRQb2ludDogc3RyaW5nO1xufVxuXG4vKipcbiAqIEFkZHMgYSBnaXQgd29ya3RyZWUsIGNyZWF0aW5nIHRoZSBicmFuY2ggd2hlbiBuZWVkZWQuXG4gKlxuICogVXNlcyBgZ2l0IHdvcmt0cmVlIGFkZCAtYmAgZm9yIG5ldyBicmFuY2hlcyBhbmQgcGxhaW4gYGdpdCB3b3JrdHJlZSBhZGRgXG4gKiB3aGVuIGF0dGFjaGluZyB0byBhbiBleGlzdGluZyBicmFuY2guXG4gKlxuICogQHBhcmFtIG9wdHMgLSBXb3JrdHJlZSBjcmVhdGlvbiBvcHRpb25zIGFuZCBicmFuY2ggZXhpc3RlbmNlIHN0YXRlLlxuICogQHJldHVybnMgTm8gdmFsdWUuXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBhZGRXb3JrdHJlZShvcHRzOiBBZGRXb3JrdHJlZU9wdGlvbnMpOiBQcm9taXNlPHZvaWQ+IHtcbiAgY29uc3QgYXJncyA9IG9wdHMuYnJhbmNoRXhpc3RzXG4gICAgPyBbJ3dvcmt0cmVlJywgJ2FkZCcsIG9wdHMud29ya3RyZWVEaXIsIG9wdHMuYnJhbmNoTmFtZV1cbiAgICA6IFsnd29ya3RyZWUnLCAnYWRkJywgJy1iJywgb3B0cy5icmFuY2hOYW1lLCBvcHRzLndvcmt0cmVlRGlyLCBvcHRzLnN0YXJ0UG9pbnRdO1xuICBhd2FpdCBleGVjRmlsZUFzeW5jKCdnaXQnLCBhcmdzLCB7IGN3ZDogb3B0cy5yZXBvUm9vdCwgdGltZW91dDogMzBfMDAwIH0pO1xufVxuXG4vKipcbiAqIEFkZHMgYSBnaXQgd29ya3RyZWUgaW4gZGV0YWNoZWQgSEVBRCBtb2RlIGF0IHRoZSBnaXZlbiByZWYuXG4gKlxuICogVXNlZCBmb3IgdGFncyBhbmQgY29tbWl0IFNIQXMgd2hlcmUgbm8gYnJhbmNoIGFzc29jaWF0aW9uIGlzIG5lZWRlZC5cbiAqXG4gKiBAcGFyYW0gcmVwb1Jvb3QgLSBQcmltYXJ5IHJlcG9zaXRvcnkgcm9vdCB3aGVyZSBnaXQgY29tbWFuZHMgcnVuLlxuICogQHBhcmFtIHdvcmt0cmVlRGlyIC0gQWJzb2x1dGUgcGF0aCBmb3IgdGhlIG5ldyB3b3JrdHJlZS5cbiAqIEBwYXJhbSByZWYgLSBUYWcgbmFtZSBvciBjb21taXQgU0hBIHRvIGNoZWNrIG91dC5cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGFkZERldGFjaGVkV29ya3RyZWUocmVwb1Jvb3Q6IHN0cmluZywgd29ya3RyZWVEaXI6IHN0cmluZywgcmVmOiBzdHJpbmcpOiBQcm9taXNlPHZvaWQ+IHtcbiAgYXdhaXQgZXhlY0ZpbGVBc3luYygnZ2l0JywgWyd3b3JrdHJlZScsICdhZGQnLCAnLS1kZXRhY2gnLCB3b3JrdHJlZURpciwgcmVmXSwge1xuICAgIGN3ZDogcmVwb1Jvb3QsXG4gICAgdGltZW91dDogMzBfMDAwXG4gIH0pO1xufVxuXG5pbnRlcmZhY2UgSWdub3JlZFBhdGhzIHtcbiAgZGlyZWN0b3JpZXM6IHN0cmluZ1tdO1xuICBmaWxlczogc3RyaW5nW107XG59XG5cbi8qKlxuICogRGlzY292ZXJzIGlnbm9yZWQgZmlsZXMgYW5kIGRpcmVjdG9yaWVzIHVuZGVyIGEgc291cmNlIHJvb3QuXG4gKlxuICogUGF0aHMgYXJlIHJldHVybmVkIHJlbGF0aXZlIHRvIGBzb3VyY2VSb290YCBhbmQgYC53b3JrdHJlZXNgIGNvbnRlbnQgaXNcbiAqIGZpbHRlcmVkIG91dCB0byBhdm9pZCBzZWxmLXJlZmVyZW50aWFsIHN5bWxpbmtpbmcuXG4gKlxuICogQHBhcmFtIHNvdXJjZVJvb3QgLSBTb3VyY2UgY2hlY2tvdXQgcm9vdCB1c2VkIGZvciBnaXQgZGlzY292ZXJ5LlxuICogQHJldHVybnMgU2VwYXJhdGUgbGlzdHMgb2YgaWdub3JlZCBkaXJlY3RvcmllcyBhbmQgaWdub3JlZCBmaWxlcy5cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGRpc2NvdmVySWdub3JlZFBhdGhzKHNvdXJjZVJvb3Q6IHN0cmluZyk6IFByb21pc2U8SWdub3JlZFBhdGhzPiB7XG4gIGNvbnN0IHsgc3Rkb3V0IH0gPSBhd2FpdCBleGVjRmlsZUFzeW5jKFxuICAgICdnaXQnLFxuICAgIFsnLUMnLCBzb3VyY2VSb290LCAnbHMtZmlsZXMnLCAnLS1pZ25vcmVkJywgJy0tZXhjbHVkZS1zdGFuZGFyZCcsICctLWRpcmVjdG9yeScsICctLW90aGVycyddLFxuICAgIHsgY3dkOiBzb3VyY2VSb290LCB0aW1lb3V0OiAzMF8wMDAgfVxuICApO1xuXG4gIGNvbnN0IGxpbmVzID0gc3Rkb3V0LnNwbGl0KCdcXG4nKS5maWx0ZXIoKGxpbmUpID0+IGxpbmUubGVuZ3RoID4gMCAmJiAhbGluZS5zdGFydHNXaXRoKCcud29ya3RyZWVzJykpO1xuICBjb25zdCBkaXJlY3RvcmllcyA9IGxpbmVzLmZpbHRlcigobCkgPT4gbC5lbmRzV2l0aCgnLycpKS5tYXAoKGwpID0+IGwuc2xpY2UoMCwgLTEpKTtcbiAgY29uc3QgZmlsZXMgPSBsaW5lcy5maWx0ZXIoKGwpID0+ICFsLmVuZHNXaXRoKCcvJykpO1xuXG4gIHJldHVybiB7IGRpcmVjdG9yaWVzLCBmaWxlcyB9O1xufVxuXG5pbnRlcmZhY2UgU3ltbGlua0lnbm9yZWRQYXRoc09wdGlvbnMge1xuICBzb3VyY2VSb290OiBzdHJpbmc7XG4gIHdvcmt0cmVlRGlyOiBzdHJpbmc7XG4gIGlnbm9yZWQ6IElnbm9yZWRQYXRocztcbn1cblxuaW50ZXJmYWNlIFN5bWxpbmtJZ25vcmVkUGF0aHNSZXN1bHQge1xuICBkaXJDb3VudDogbnVtYmVyO1xuICBmaWxlQ291bnQ6IG51bWJlcjtcbn1cblxuLyoqXG4gKiBTeW1saW5rcyBpZ25vcmVkIGRpcmVjdG9yaWVzIGFuZCBmaWxlcyBmcm9tIHNvdXJjZSBjaGVja291dCBpbnRvIGEgd29ya3RyZWUuXG4gKlxuICogTmVzdGVkIGlnbm9yZWQgZGlyZWN0b3JpZXMgYXJlIGNvbGxhcHNlZCBzbyBvbmx5IHRvcC1sZXZlbCBpZ25vcmVkIGRpcmVjdG9yeVxuICogbGlua3MgYXJlIGNyZWF0ZWQuXG4gKlxuICogQHBhcmFtIG9wdHMgLSBTb3VyY2Ugcm9vdCwgZGVzdGluYXRpb24gd29ya3RyZWUsIGFuZCBpZ25vcmVkIHBhdGggbGlzdHMuXG4gKiBAcmV0dXJucyBDb3VudHMgb2Ygc3VjY2Vzc2Z1bGx5IGNyZWF0ZWQgZGlyZWN0b3J5IGFuZCBmaWxlIHN5bWxpbmtzLlxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gc3ltbGlua0lnbm9yZWRQYXRocyhvcHRzOiBTeW1saW5rSWdub3JlZFBhdGhzT3B0aW9ucyk6IFByb21pc2U8U3ltbGlua0lnbm9yZWRQYXRoc1Jlc3VsdD4ge1xuICBjb25zdCB7IHNvdXJjZVJvb3QsIHdvcmt0cmVlRGlyLCBpZ25vcmVkIH0gPSBvcHRzO1xuICBjb25zdCBkaXJTZXQgPSBuZXcgU2V0KGlnbm9yZWQuZGlyZWN0b3JpZXMpO1xuICBjb25zdCBub25OZXN0ZWREaXJzID0gaWdub3JlZC5kaXJlY3Rvcmllcy5maWx0ZXIoKGRpcikgPT4gIWlzTmVzdGVkVW5kZXIoZGlyLCBkaXJTZXQpKTtcblxuICBjb25zdCBjcmVhdGVEaXJTeW1saW5rID0gYXN5bmMgKGRpcjogc3RyaW5nKTogUHJvbWlzZTxib29sZWFuPiA9PiB7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHNvdXJjZVBhdGggPSBwYXRoLmpvaW4oc291cmNlUm9vdCwgZGlyKTtcbiAgICAgIHRyeSB7XG4gICAgICAgIGF3YWl0IGZzLmxzdGF0KHNvdXJjZVBhdGgpO1xuICAgICAgfSBjYXRjaCAoZXJyb3I6IHVua25vd24pIHtcbiAgICAgICAgaWYgKChlcnJvciBhcyBOb2RlSlMuRXJybm9FeGNlcHRpb24pLmNvZGUgPT09ICdFTk9FTlQnKSB7XG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIHByb2Nlc3Muc3RkZXJyLndyaXRlKFxuICAgICAgICAgIGBjcmVhdGUtd29ya3RyZWU6IHVuZXhwZWN0ZWQgZXJyb3IgaW4gbHN0YXQ6ICR7ZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiBTdHJpbmcoZXJyb3IpfVxcbmBcbiAgICAgICAgKTtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgICAgY29uc3QgZGVzdFBhdGggPSBwYXRoLmpvaW4od29ya3RyZWVEaXIsIGRpcik7XG4gICAgICBjb25zdCBwYXJlbnREaXIgPSBwYXRoLmRpcm5hbWUoZGlyKTtcbiAgICAgIGlmIChwYXJlbnREaXIgIT09ICcuJykge1xuICAgICAgICBhd2FpdCBmcy5ta2RpcihwYXRoLmpvaW4od29ya3RyZWVEaXIsIHBhcmVudERpciksIHsgcmVjdXJzaXZlOiB0cnVlIH0pO1xuICAgICAgfVxuICAgICAgYXdhaXQgZnMuc3ltbGluayhzb3VyY2VQYXRoLCBkZXN0UGF0aCk7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9IGNhdGNoIChlcnJvcjogdW5rbm93bikge1xuICAgICAgY29uc3QgY29kZSA9IChlcnJvciBhcyBOb2RlSlMuRXJybm9FeGNlcHRpb24pLmNvZGU7XG4gICAgICBpZiAoY29kZSA9PT0gJ0VFWElTVCcgfHwgY29kZSA9PT0gJ0VOT0VOVCcpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgICAgcHJvY2Vzcy5zdGRlcnIud3JpdGUoXG4gICAgICAgIGBjcmVhdGUtd29ya3RyZWU6IHVuZXhwZWN0ZWQgZXJyb3IgaW4gc3ltbGluazogJHtlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6IFN0cmluZyhlcnJvcil9XFxuYFxuICAgICAgKTtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gIH07XG5cbiAgY29uc3QgY3JlYXRlRmlsZVN5bWxpbmsgPSBhc3luYyAoZmlsZTogc3RyaW5nKTogUHJvbWlzZTxib29sZWFuPiA9PiB7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHNvdXJjZVBhdGggPSBwYXRoLmpvaW4oc291cmNlUm9vdCwgZmlsZSk7XG4gICAgICB0cnkge1xuICAgICAgICBhd2FpdCBmcy5sc3RhdChzb3VyY2VQYXRoKTtcbiAgICAgIH0gY2F0Y2ggKGVycm9yOiB1bmtub3duKSB7XG4gICAgICAgIGlmICgoZXJyb3IgYXMgTm9kZUpTLkVycm5vRXhjZXB0aW9uKS5jb2RlID09PSAnRU5PRU5UJykge1xuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBwcm9jZXNzLnN0ZGVyci53cml0ZShcbiAgICAgICAgICBgY3JlYXRlLXdvcmt0cmVlOiB1bmV4cGVjdGVkIGVycm9yIGluIGxzdGF0OiAke2Vycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogU3RyaW5nKGVycm9yKX1cXG5gXG4gICAgICAgICk7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IGRlc3RQYXRoID0gcGF0aC5qb2luKHdvcmt0cmVlRGlyLCBmaWxlKTtcbiAgICAgIGNvbnN0IHBhcmVudERpciA9IHBhdGguZGlybmFtZShmaWxlKTtcbiAgICAgIGlmIChwYXJlbnREaXIgIT09ICcuJykge1xuICAgICAgICBhd2FpdCBmcy5ta2RpcihwYXRoLmpvaW4od29ya3RyZWVEaXIsIHBhcmVudERpciksIHsgcmVjdXJzaXZlOiB0cnVlIH0pO1xuICAgICAgfVxuICAgICAgYXdhaXQgZnMuc3ltbGluayhzb3VyY2VQYXRoLCBkZXN0UGF0aCk7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9IGNhdGNoIChlcnJvcjogdW5rbm93bikge1xuICAgICAgY29uc3QgY29kZSA9IChlcnJvciBhcyBOb2RlSlMuRXJybm9FeGNlcHRpb24pLmNvZGU7XG4gICAgICBpZiAoY29kZSA9PT0gJ0VFWElTVCcgfHwgY29kZSA9PT0gJ0VOT0VOVCcpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgICAgcHJvY2Vzcy5zdGRlcnIud3JpdGUoXG4gICAgICAgIGBjcmVhdGUtd29ya3RyZWU6IHVuZXhwZWN0ZWQgZXJyb3IgaW4gc3ltbGluazogJHtlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6IFN0cmluZyhlcnJvcil9XFxuYFxuICAgICAgKTtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gIH07XG5cbiAgY29uc3QgZGlyUmVzdWx0cyA9IGF3YWl0IFByb21pc2UuYWxsKG5vbk5lc3RlZERpcnMubWFwKGNyZWF0ZURpclN5bWxpbmspKTtcbiAgY29uc3Qgbm9uTmVzdGVkRmlsZXMgPSBpZ25vcmVkLmZpbGVzLmZpbHRlcigoZmlsZSkgPT4gIWlzTmVzdGVkVW5kZXIoZmlsZSwgZGlyU2V0KSk7XG4gIGNvbnN0IGZpbGVSZXN1bHRzID0gYXdhaXQgUHJvbWlzZS5hbGwobm9uTmVzdGVkRmlsZXMubWFwKGNyZWF0ZUZpbGVTeW1saW5rKSk7XG5cbiAgY29uc3QgZGlyQ291bnQgPSBkaXJSZXN1bHRzLmZpbHRlcigocikgPT4gcikubGVuZ3RoO1xuICBjb25zdCBmaWxlQ291bnQgPSBmaWxlUmVzdWx0cy5maWx0ZXIoKHIpID0+IHIpLmxlbmd0aDtcblxuICByZXR1cm4geyBkaXJDb3VudCwgZmlsZUNvdW50IH07XG59XG5cbi8qKlxuICogUmVwbGljYXRlcyByb290LWxldmVsIHN5bWxpbmtzIGZyb20gdGhlIHNvdXJjZSBjaGVja291dCBpbnRvIHRoZSB3b3JrdHJlZS5cbiAqXG4gKiBFeGlzdGluZyBkZXN0aW5hdGlvbiBlbnRyaWVzIGFyZSBsZWZ0IHVudG91Y2hlZC5cbiAqXG4gKiBAcGFyYW0gc291cmNlUm9vdCAtIFNvdXJjZSBjaGVja291dCByb290LlxuICogQHBhcmFtIHdvcmt0cmVlRGlyIC0gRGVzdGluYXRpb24gd29ya3RyZWUgcm9vdC5cbiAqIEByZXR1cm5zIE51bWJlciBvZiBzeW1saW5rcyBjcmVhdGVkIGluIHRoZSBkZXN0aW5hdGlvbiByb290LlxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gY29weUV4aXN0aW5nU3ltbGlua3Moc291cmNlUm9vdDogc3RyaW5nLCB3b3JrdHJlZURpcjogc3RyaW5nKTogUHJvbWlzZTxudW1iZXI+IHtcbiAgY29uc3QgZW50cmllcyA9IGF3YWl0IGZzLnJlYWRkaXIoc291cmNlUm9vdCwgeyB3aXRoRmlsZVR5cGVzOiB0cnVlIH0pO1xuICBjb25zdCBzeW1saW5rcyA9IGVudHJpZXMuZmlsdGVyKChlKSA9PiBlLmlzU3ltYm9saWNMaW5rKCkgJiYgZS5uYW1lICE9PSAnLmdpdCcgJiYgZS5uYW1lICE9PSAnLndvcmt0cmVlcycpO1xuXG4gIGNvbnN0IGNvcHlTeW1saW5rID0gYXN5bmMgKG5hbWU6IHN0cmluZyk6IFByb21pc2U8Ym9vbGVhbj4gPT4ge1xuICAgIGNvbnN0IGRlc3RQYXRoID0gcGF0aC5qb2luKHdvcmt0cmVlRGlyLCBuYW1lKTtcbiAgICB0cnkge1xuICAgICAgYXdhaXQgZnMubHN0YXQoZGVzdFBhdGgpO1xuICAgICAgcmV0dXJuIGZhbHNlOyAvLyBEZXN0aW5hdGlvbiBhbHJlYWR5IGV4aXN0c1xuICAgIH0gY2F0Y2ggKGVycm9yOiB1bmtub3duKSB7XG4gICAgICBpZiAoKGVycm9yIGFzIE5vZGVKUy5FcnJub0V4Y2VwdGlvbikuY29kZSAhPT0gJ0VOT0VOVCcpIHtcbiAgICAgICAgdGhyb3cgZXJyb3I7XG4gICAgICB9XG4gICAgfVxuICAgIGNvbnN0IHNvdXJjZUxpbmtQYXRoID0gcGF0aC5qb2luKHNvdXJjZVJvb3QsIG5hbWUpO1xuXG4gICAgLy8gU2tpcCBzZWxmLXJlZmVyZW5jaW5nIHN5bWxpbmtzICh0YXJnZXQgcmVzb2x2ZXMgYmFjayB0byB0aGUgc3ltbGluayBpdHNlbGYpXG4gICAgY29uc3QgdGFyZ2V0ID0gYXdhaXQgZnMucmVhZGxpbmsoc291cmNlTGlua1BhdGgpO1xuICAgIGNvbnN0IHJlc29sdmVkVGFyZ2V0ID0gcGF0aC5yZXNvbHZlKHNvdXJjZVJvb3QsIHRhcmdldCk7XG4gICAgaWYgKHJlc29sdmVkVGFyZ2V0ID09PSBzb3VyY2VMaW5rUGF0aCkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIGF3YWl0IGZzLnN5bWxpbmsoc291cmNlTGlua1BhdGgsIGRlc3RQYXRoKTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfTtcblxuICBjb25zdCByZXN1bHRzID0gYXdhaXQgUHJvbWlzZS5hbGwoc3ltbGlua3MubWFwKChlKSA9PiBjb3B5U3ltbGluayhlLm5hbWUpKSk7XG4gIHJldHVybiByZXN1bHRzLmZpbHRlcigocikgPT4gcikubGVuZ3RoO1xufVxuXG5pbnRlcmZhY2UgUmVyb3V0ZU5vZGVNb2R1bGVzT3B0aW9ucyB7XG4gIHNvdXJjZU5vZGVNb2R1bGVzOiBzdHJpbmc7XG4gIGRlc3ROb2RlTW9kdWxlczogc3RyaW5nO1xufVxuXG4vKipcbiAqIE1pcnJvcnMgYSBub2RlX21vZHVsZXMgdHJlZSBpbnRvIHRoZSB3b3JrdHJlZSB1c2luZyBzeW1saW5rcy5cbiAqXG4gKiBJbnRlcm5hbCB3b3Jrc3BhY2UgbGlua3Mga2VlcCB0aGVpciBvcmlnaW5hbCByZWxhdGl2ZSB0YXJnZXRzIHdoaWxlIGV4dGVybmFsXG4gKiBsaW5rcyBhbmQgbm9uLWxpbmsgZW50cmllcyBhcmUgcmVwcmVzZW50ZWQgYXMgc3ltbGlua3MgdG8gc291cmNlIHBhdGhzLlxuICpcbiAqIEBwYXJhbSBvcHRzIC0gU291cmNlIGFuZCBkZXN0aW5hdGlvbiBub2RlX21vZHVsZXMgZGlyZWN0b3JpZXMuXG4gKiBAcmV0dXJucyBDb3VudCBvZiBpbnRlcm5hbCB3b3Jrc3BhY2Ugc3ltbGlua3MgcmVjcmVhdGVkIGJ5IHRhcmdldCBwYXRoLlxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcmVyb3V0ZU5vZGVNb2R1bGVzKG9wdHM6IFJlcm91dGVOb2RlTW9kdWxlc09wdGlvbnMpOiBQcm9taXNlPG51bWJlcj4ge1xuICBjb25zdCB7IHNvdXJjZU5vZGVNb2R1bGVzLCBkZXN0Tm9kZU1vZHVsZXMgfSA9IG9wdHM7XG5cbiAgdHJ5IHtcbiAgICBhd2FpdCBmcy5sc3RhdChzb3VyY2VOb2RlTW9kdWxlcyk7XG4gIH0gY2F0Y2ggKGVycm9yOiB1bmtub3duKSB7XG4gICAgaWYgKChlcnJvciBhcyBOb2RlSlMuRXJybm9FeGNlcHRpb24pLmNvZGUgPT09ICdFTk9FTlQnKSB7XG4gICAgICByZXR1cm4gMDtcbiAgICB9XG4gICAgdGhyb3cgZXJyb3I7XG4gIH1cblxuICB0cnkge1xuICAgIGNvbnN0IGRlc3RTdGF0cyA9IGF3YWl0IGZzLmxzdGF0KGRlc3ROb2RlTW9kdWxlcyk7XG4gICAgaWYgKGRlc3RTdGF0cy5pc1N5bWJvbGljTGluaygpKSB7XG4gICAgICBhd2FpdCBmcy51bmxpbmsoZGVzdE5vZGVNb2R1bGVzKTtcbiAgICB9XG4gIH0gY2F0Y2ggKGVycm9yOiB1bmtub3duKSB7XG4gICAgaWYgKChlcnJvciBhcyBOb2RlSlMuRXJybm9FeGNlcHRpb24pLmNvZGUgIT09ICdFTk9FTlQnKSB7XG4gICAgICB0aHJvdyBlcnJvcjtcbiAgICB9XG4gIH1cblxuICBhd2FpdCBmcy5ta2RpcihkZXN0Tm9kZU1vZHVsZXMsIHsgcmVjdXJzaXZlOiB0cnVlIH0pO1xuXG4gIGNvbnN0IGVudHJpZXMgPSBhd2FpdCBmcy5yZWFkZGlyKHNvdXJjZU5vZGVNb2R1bGVzLCB7IHdpdGhGaWxlVHlwZXM6IHRydWUgfSk7XG4gIGNvbnN0IGNvdW50cyA9IGF3YWl0IFByb21pc2UuYWxsKFxuICAgIGVudHJpZXMubWFwKGFzeW5jIChlbnRyeSk6IFByb21pc2U8bnVtYmVyPiA9PiB7XG4gICAgICBjb25zdCBzb3VyY2VQYXRoID0gcGF0aC5qb2luKHNvdXJjZU5vZGVNb2R1bGVzLCBlbnRyeS5uYW1lKTtcbiAgICAgIGNvbnN0IGRlc3RQYXRoID0gcGF0aC5qb2luKGRlc3ROb2RlTW9kdWxlcywgZW50cnkubmFtZSk7XG5cbiAgICAgIGlmIChlbnRyeS5pc1N5bWJvbGljTGluaygpKSB7XG4gICAgICAgIGNvbnN0IHRhcmdldCA9IGF3YWl0IGZzLnJlYWRsaW5rKHNvdXJjZVBhdGgpO1xuICAgICAgICBpZiAoaXNJbnRlcm5hbFN5bWxpbmsodGFyZ2V0KSkge1xuICAgICAgICAgIGF3YWl0IGZzLnN5bWxpbmsodGFyZ2V0LCBkZXN0UGF0aCk7XG4gICAgICAgICAgcmV0dXJuIDE7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgYXdhaXQgZnMuc3ltbGluayhzb3VyY2VQYXRoLCBkZXN0UGF0aCk7XG4gICAgICAgICAgcmV0dXJuIDA7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAoZW50cnkuaXNEaXJlY3RvcnkoKSAmJiBlbnRyeS5uYW1lLnN0YXJ0c1dpdGgoJ0AnKSkge1xuICAgICAgICBhd2FpdCBmcy5ta2RpcihkZXN0UGF0aCwgeyByZWN1cnNpdmU6IHRydWUgfSk7XG4gICAgICAgIGNvbnN0IHNjb3BlRW50cmllcyA9IGF3YWl0IGZzLnJlYWRkaXIoc291cmNlUGF0aCwgeyB3aXRoRmlsZVR5cGVzOiB0cnVlIH0pO1xuICAgICAgICBjb25zdCBzY29wZUNvdW50cyA9IGF3YWl0IFByb21pc2UuYWxsKFxuICAgICAgICAgIHNjb3BlRW50cmllcy5tYXAoYXN5bmMgKHNjb3BlRW50cnkpOiBQcm9taXNlPG51bWJlcj4gPT4ge1xuICAgICAgICAgICAgY29uc3Qgc2NvcGVTb3VyY2VQYXRoID0gcGF0aC5qb2luKHNvdXJjZVBhdGgsIHNjb3BlRW50cnkubmFtZSk7XG4gICAgICAgICAgICBjb25zdCBzY29wZURlc3RQYXRoID0gcGF0aC5qb2luKGRlc3RQYXRoLCBzY29wZUVudHJ5Lm5hbWUpO1xuXG4gICAgICAgICAgICBpZiAoc2NvcGVFbnRyeS5pc1N5bWJvbGljTGluaygpKSB7XG4gICAgICAgICAgICAgIGNvbnN0IHRhcmdldCA9IGF3YWl0IGZzLnJlYWRsaW5rKHNjb3BlU291cmNlUGF0aCk7XG4gICAgICAgICAgICAgIGlmIChpc0ludGVybmFsU3ltbGluayh0YXJnZXQpKSB7XG4gICAgICAgICAgICAgICAgYXdhaXQgZnMuc3ltbGluayh0YXJnZXQsIHNjb3BlRGVzdFBhdGgpO1xuICAgICAgICAgICAgICAgIHJldHVybiAxO1xuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGF3YWl0IGZzLnN5bWxpbmsoc2NvcGVTb3VyY2VQYXRoLCBzY29wZURlc3RQYXRoKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gMDtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgYXdhaXQgZnMuc3ltbGluayhzY29wZVNvdXJjZVBhdGgsIHNjb3BlRGVzdFBhdGgpO1xuICAgICAgICAgICAgICByZXR1cm4gMDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KVxuICAgICAgICApO1xuICAgICAgICByZXR1cm4gc2NvcGVDb3VudHMucmVkdWNlKChzdW0sIGMpID0+IHN1bSArIGMsIDApO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgYXdhaXQgZnMuc3ltbGluayhzb3VyY2VQYXRoLCBkZXN0UGF0aCk7XG4gICAgICAgIHJldHVybiAwO1xuICAgICAgfVxuICAgIH0pXG4gICk7XG5cbiAgcmV0dXJuIGNvdW50cy5yZWR1Y2UoKHN1bSwgYykgPT4gc3VtICsgYywgMCk7XG59XG5cbmludGVyZmFjZSBSZXJvdXRlQWxsTm9kZU1vZHVsZXNPcHRpb25zIHtcbiAgc291cmNlUm9vdDogc3RyaW5nO1xuICB3b3JrdHJlZURpcjogc3RyaW5nO1xuICByZXBvUm9vdDogc3RyaW5nO1xufVxuXG4vKipcbiAqIFJlcm91dGVzIHJvb3QgYW5kIHBlci1wYWNrYWdlIG5vZGVfbW9kdWxlcyBkaXJlY3RvcmllcyBpbnRvIHRoZSB3b3JrdHJlZS5cbiAqXG4gKiBUaGUgb3BlcmF0aW9uIGlzIHNraXBwZWQgd2hlbiB0aGUgcmVwb3NpdG9yeSBoYXMgbm8gd29ya3NwYWNlIGNvbmZpZ3VyYXRpb24uXG4gKlxuICogQHBhcmFtIG9wdHMgLSBTb3VyY2Ugcm9vdCwgZGVzdGluYXRpb24gd29ya3RyZWUgcm9vdCwgYW5kIHJlcG8gcm9vdC5cbiAqIEByZXR1cm5zIFRvdGFsIG51bWJlciBvZiByZWNyZWF0ZWQgaW50ZXJuYWwgd29ya3NwYWNlIHN5bWxpbmtzLlxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcmVyb3V0ZUFsbE5vZGVNb2R1bGVzKG9wdHM6IFJlcm91dGVBbGxOb2RlTW9kdWxlc09wdGlvbnMpOiBQcm9taXNlPG51bWJlcj4ge1xuICBjb25zdCB7IHNvdXJjZVJvb3QsIHdvcmt0cmVlRGlyLCByZXBvUm9vdCB9ID0gb3B0cztcblxuICBsZXQgcGFja2FnZUpzb246IHsgd29ya3NwYWNlcz86IHN0cmluZ1tdIH07XG4gIHRyeSB7XG4gICAgY29uc3QgcGFja2FnZUpzb25Db250ZW50ID0gYXdhaXQgZnMucmVhZEZpbGUocGF0aC5qb2luKHJlcG9Sb290LCAncGFja2FnZS5qc29uJyksICd1dGYtOCcpO1xuICAgIHBhY2thZ2VKc29uID0gSlNPTi5wYXJzZShwYWNrYWdlSnNvbkNvbnRlbnQpO1xuICB9IGNhdGNoIChlcnJvcjogdW5rbm93bikge1xuICAgIGlmICgoZXJyb3IgYXMgTm9kZUpTLkVycm5vRXhjZXB0aW9uKS5jb2RlID09PSAnRU5PRU5UJykge1xuICAgICAgcmV0dXJuIDA7XG4gICAgfVxuICAgIHRocm93IGVycm9yO1xuICB9XG5cbiAgaWYgKCFwYWNrYWdlSnNvbi53b3Jrc3BhY2VzKSB7XG4gICAgcmV0dXJuIDA7XG4gIH1cblxuICBsZXQgdG90YWxDb3VudCA9IDA7XG5cbiAgdG90YWxDb3VudCArPSBhd2FpdCByZXJvdXRlTm9kZU1vZHVsZXMoe1xuICAgIHNvdXJjZU5vZGVNb2R1bGVzOiBwYXRoLmpvaW4oc291cmNlUm9vdCwgJ25vZGVfbW9kdWxlcycpLFxuICAgIGRlc3ROb2RlTW9kdWxlczogcGF0aC5qb2luKHdvcmt0cmVlRGlyLCAnbm9kZV9tb2R1bGVzJylcbiAgfSk7XG5cbiAgY29uc3QgcGFja2FnZXNEaXIgPSBwYXRoLmpvaW4oc291cmNlUm9vdCwgJ3BhY2thZ2VzJyk7XG4gIHRyeSB7XG4gICAgY29uc3QgcGFja2FnZUVudHJpZXMgPSBhd2FpdCBmcy5yZWFkZGlyKHBhY2thZ2VzRGlyLCB7IHdpdGhGaWxlVHlwZXM6IHRydWUgfSk7XG4gICAgZm9yIChjb25zdCBlbnRyeSBvZiBwYWNrYWdlRW50cmllcykge1xuICAgICAgaWYgKGVudHJ5LmlzRGlyZWN0b3J5KCkpIHtcbiAgICAgICAgY29uc3QgcGtnTm9kZU1vZHVsZXMgPSBwYXRoLmpvaW4ocGFja2FnZXNEaXIsIGVudHJ5Lm5hbWUsICdub2RlX21vZHVsZXMnKTtcbiAgICAgICAgbGV0IG5vZGVNb2R1bGVzRXhpc3RzID0gZmFsc2U7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgYXdhaXQgZnMubHN0YXQocGtnTm9kZU1vZHVsZXMpO1xuICAgICAgICAgIG5vZGVNb2R1bGVzRXhpc3RzID0gdHJ1ZTtcbiAgICAgICAgfSBjYXRjaCAoZXJyb3I6IHVua25vd24pIHtcbiAgICAgICAgICBpZiAoKGVycm9yIGFzIE5vZGVKUy5FcnJub0V4Y2VwdGlvbikuY29kZSAhPT0gJ0VOT0VOVCcpIHtcbiAgICAgICAgICAgIHRocm93IGVycm9yO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAobm9kZU1vZHVsZXNFeGlzdHMpIHtcbiAgICAgICAgICBjb25zdCBkZXN0UGFja2FnZURpciA9IHBhdGguam9pbih3b3JrdHJlZURpciwgJ3BhY2thZ2VzJywgZW50cnkubmFtZSk7XG4gICAgICAgICAgYXdhaXQgZnMubWtkaXIoZGVzdFBhY2thZ2VEaXIsIHsgcmVjdXJzaXZlOiB0cnVlIH0pO1xuICAgICAgICAgIHRvdGFsQ291bnQgKz0gYXdhaXQgcmVyb3V0ZU5vZGVNb2R1bGVzKHtcbiAgICAgICAgICAgIHNvdXJjZU5vZGVNb2R1bGVzOiBwa2dOb2RlTW9kdWxlcyxcbiAgICAgICAgICAgIGRlc3ROb2RlTW9kdWxlczogcGF0aC5qb2luKGRlc3RQYWNrYWdlRGlyLCAnbm9kZV9tb2R1bGVzJylcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfSBjYXRjaCAoZXJyb3I6IHVua25vd24pIHtcbiAgICBpZiAoKGVycm9yIGFzIE5vZGVKUy5FcnJub0V4Y2VwdGlvbikuY29kZSAhPT0gJ0VOT0VOVCcpIHtcbiAgICAgIHRocm93IGVycm9yO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiB0b3RhbENvdW50O1xufVxuXG5pbnRlcmZhY2UgVXBkYXRlR2l0RXhjbHVkZU9wdGlvbnMge1xuICB3b3JrdHJlZURpcjogc3RyaW5nO1xuICByZXBvUm9vdDogc3RyaW5nO1xuICBkaXJlY3Rvcmllczogc3RyaW5nW107XG4gIGZpbGVzOiBzdHJpbmdbXTtcbn1cblxuLyoqXG4gKiBBcHBlbmRzIHN5bWxpbmtlZCBpZ25vcmVkIHBhdGhzIHRvIHRoZSB3b3JrdHJlZS1zcGVjaWZpYyBnaXQgZXhjbHVkZSBmaWxlLlxuICpcbiAqIEFsc28gZW5hYmxlcyBgZXh0ZW5zaW9ucy53b3JrdHJlZUNvbmZpZ2AgYW5kIHNldHMgd29ya3RyZWUtbG9jYWxcbiAqIGBjb3JlLmV4Y2x1ZGVzRmlsZWAgc28gZ2l0IHN0YXR1cyBpbiB0aGUgd29ya3RyZWUgaWdub3JlcyBpbmplY3RlZCBsaW5rcy5cbiAqXG4gKiBAcGFyYW0gb3B0cyAtIFdvcmt0cmVlIHBhdGgsIHJlcG8gcm9vdCwgYW5kIGlnbm9yZWQgcGF0aCBjYW5kaWRhdGVzLlxuICogQHJldHVybnMgTm8gdmFsdWUuXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiB1cGRhdGVHaXRFeGNsdWRlKG9wdHM6IFVwZGF0ZUdpdEV4Y2x1ZGVPcHRpb25zKTogUHJvbWlzZTx2b2lkPiB7XG4gIGNvbnN0IHsgd29ya3RyZWVEaXIsIHJlcG9Sb290LCBkaXJlY3RvcmllcywgZmlsZXMgfSA9IG9wdHM7XG5cbiAgY29uc3QgeyBzdGRvdXQ6IGdpdERpciB9ID0gYXdhaXQgZXhlY0ZpbGVBc3luYygnZ2l0JywgWyctQycsIHdvcmt0cmVlRGlyLCAncmV2LXBhcnNlJywgJy0tZ2l0LWRpciddLCB7XG4gICAgdGltZW91dDogNV8wMDBcbiAgfSk7XG4gIGNvbnN0IGV4Y2x1ZGVQYXRoID0gcGF0aC5qb2luKGdpdERpci50cmltKCksICdpbmZvJywgJ2V4Y2x1ZGUnKTtcbiAgYXdhaXQgZnMubWtkaXIocGF0aC5kaXJuYW1lKGV4Y2x1ZGVQYXRoKSwgeyByZWN1cnNpdmU6IHRydWUgfSk7XG5cbiAgY29uc3QgbGluZXMgPSBbJyMgU3ltbGlua3MgY3JlYXRlZCBieSBpbnN0YW50LXdvcmt0cmVlJ107XG5cbiAgZm9yIChjb25zdCBkaXIgb2YgZGlyZWN0b3JpZXMpIHtcbiAgICBpZiAoIWRpcikgY29udGludWU7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHN0YXRzID0gYXdhaXQgZnMubHN0YXQocGF0aC5qb2luKHdvcmt0cmVlRGlyLCBkaXIpKTtcbiAgICAgIGlmIChzdGF0cy5pc1N5bWJvbGljTGluaygpKSBsaW5lcy5wdXNoKGRpcik7XG4gICAgfSBjYXRjaCAoZXJyb3I6IHVua25vd24pIHtcbiAgICAgIGlmICgoZXJyb3IgYXMgTm9kZUpTLkVycm5vRXhjZXB0aW9uKS5jb2RlICE9PSAnRU5PRU5UJykge1xuICAgICAgICB0aHJvdyBlcnJvcjtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBmb3IgKGNvbnN0IGZpbGUgb2YgZmlsZXMpIHtcbiAgICBpZiAoIWZpbGUpIGNvbnRpbnVlO1xuICAgIHRyeSB7XG4gICAgICBjb25zdCBzdGF0cyA9IGF3YWl0IGZzLmxzdGF0KHBhdGguam9pbih3b3JrdHJlZURpciwgZmlsZSkpO1xuICAgICAgaWYgKHN0YXRzLmlzU3ltYm9saWNMaW5rKCkpIGxpbmVzLnB1c2goZmlsZSk7XG4gICAgfSBjYXRjaCAoZXJyb3I6IHVua25vd24pIHtcbiAgICAgIGlmICgoZXJyb3IgYXMgTm9kZUpTLkVycm5vRXhjZXB0aW9uKS5jb2RlICE9PSAnRU5PRU5UJykge1xuICAgICAgICB0aHJvdyBlcnJvcjtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBhd2FpdCBmcy5hcHBlbmRGaWxlKGV4Y2x1ZGVQYXRoLCBgJHtsaW5lcy5qb2luKCdcXG4nKX1cXG5gKTtcblxuICB0cnkge1xuICAgIGF3YWl0IGV4ZWNGaWxlQXN5bmMoJ2dpdCcsIFsnLUMnLCByZXBvUm9vdCwgJ2NvbmZpZycsICdleHRlbnNpb25zLndvcmt0cmVlQ29uZmlnJywgJ3RydWUnXSwgeyB0aW1lb3V0OiA1XzAwMCB9KTtcbiAgfSBjYXRjaCAoZXJyb3I6IHVua25vd24pIHtcbiAgICBwcm9jZXNzLnN0ZGVyci53cml0ZShcbiAgICAgIGBjcmVhdGUtd29ya3RyZWU6IGZhaWxlZCB0byBzZXQgd29ya3RyZWVDb25maWcgZXh0ZW5zaW9uOiAke2Vycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogU3RyaW5nKGVycm9yKX1cXG5gXG4gICAgKTtcbiAgfVxuXG4gIHRyeSB7XG4gICAgYXdhaXQgZXhlY0ZpbGVBc3luYygnZ2l0JywgWyctQycsIHdvcmt0cmVlRGlyLCAnY29uZmlnJywgJy0td29ya3RyZWUnLCAnY29yZS5leGNsdWRlc0ZpbGUnLCBleGNsdWRlUGF0aF0sIHtcbiAgICAgIHRpbWVvdXQ6IDVfMDAwXG4gICAgfSk7XG4gIH0gY2F0Y2ggKGVycm9yOiB1bmtub3duKSB7XG4gICAgcHJvY2Vzcy5zdGRlcnIud3JpdGUoXG4gICAgICBgY3JlYXRlLXdvcmt0cmVlOiBmYWlsZWQgdG8gc2V0IGNvcmUuZXhjbHVkZXNGaWxlOiAke2Vycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogU3RyaW5nKGVycm9yKX1cXG5gXG4gICAgKTtcbiAgfVxufVxuIiwgIi8qKlxuICogRGV0YWNoZWQgYnJhbmNoLWNsZWFudXAgd2F0Y2hlciBmb3IgaW50ZXJhY3RpdmUgc2Vzc2lvbnMuXG4gKlxuICogUHJvdmlkZXMgYSBmaXJlLWFuZC1mb3JnZXQgbWVjaGFuaXNtIGZvciBydW5uaW5nIGJyYW5jaCBjbGVhbnVwIGFmdGVyIHRoZVxuICogaW50ZXJhY3RpdmUgQ0xJIGV4aXRzLiBUaGUgd2F0Y2hlciBzcGF3bnMgaXRzZWxmIGFzIGEgZGV0YWNoZWQgTm9kZS5qc1xuICogcHJvY2VzcywgcmVjZWl2ZXMgY2xlYW51cCBwYXJhbWV0ZXJzIHZpYSBzdGRpbiwgY2FsbHNcbiAqIHtAbGluayBjbGVhbnVwTWVyZ2VkQnJhbmNoZXN9LCB0aGVuIGV4aXRzLlxuICpcbiAqIEBzdW1tYXJ5IERldGFjaGVkIGJyYW5jaC1jbGVhbnVwIHdhdGNoZXIgZm9yIGludGVyYWN0aXZlIHNlc3Npb25zXG4gKiBAbW9kdWxlXG4gKi9cblxuaW1wb3J0IHsgdHlwZSBDaGlsZFByb2Nlc3MsIHNwYXduIH0gZnJvbSAnbm9kZTpjaGlsZF9wcm9jZXNzJztcbmltcG9ydCAqIGFzIHBhdGggZnJvbSAnbm9kZTpwYXRoJztcbmltcG9ydCB7IENhcmRzQ2xpZW50IH0gZnJvbSAnQGNhcmRzL3Nkay9jbGllbnQnO1xuaW1wb3J0IHsgdHlwZSBBY3Rpb25JbnB1dCwgTG9nZ2VyIH0gZnJvbSAnQGNhcmRzL3Nkay9jb25maWcnO1xuaW1wb3J0IHsgY2xlYW51cE1lcmdlZEJyYW5jaGVzLCBlcnJvck1lc3NhZ2UgfSBmcm9tICcuL2NsYXVkZS1zZXNzaW9uLmpzJztcblxuLyoqXG4gKiBQYXJhbWV0ZXJzIHJlcXVpcmVkIHRvIHJ1biBicmFuY2ggY2xlYW51cCBpbiBhIGRldGFjaGVkIHByb2Nlc3MuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgQnJhbmNoQ2xlYW51cFBhcmFtcyB7XG4gIC8qKiBUaGUgY2FyZCBJRCBmb3IgdGhlIHNlc3Npb24gYmVpbmcgY2xlYW5lZCB1cC4gKi9cbiAgY2FyZElkOiBzdHJpbmc7XG4gIC8qKiBBYnNvbHV0ZSBwYXRoIHRvIHRoZSByZXBvc2l0b3J5IHJvb3QuICovXG4gIHJlcG9Sb290OiBzdHJpbmc7XG4gIC8qKiBCYXNlIFVSTCBmb3IgdGhlIENhcmRzIEFQSS4gKi9cbiAgYXBpQmFzZVVybDogc3RyaW5nO1xuICAvKiogQWNjZXNzIHRva2VuIGZvciB0aGUgQ2FyZHMgQVBJLiAqL1xuICBhcGlBY2Nlc3NUb2tlbjogc3RyaW5nO1xuICAvKiogT3B0aW9uYWwgc2Vzc2lvbiBJRCBmb3IgbG9nIGNvcnJlbGF0aW9uLiAqL1xuICBzZXNzaW9uSWQ/OiBzdHJpbmc7XG59XG5cbi8qKlxuICogU3Bhd25zIGEgZGV0YWNoZWQgTm9kZS5qcyBwcm9jZXNzIHRoYXQgY2FsbHMge0BsaW5rIGNsZWFudXBNZXJnZWRCcmFuY2hlc31cbiAqIGFmdGVyIHJlY2VpdmluZyBzZXJpYWxpemVkIHBhcmFtZXRlcnMgdmlhIHN0ZGluLlxuICpcbiAqIFRoZSBzcGF3bmVkIHByb2Nlc3MgaXMgZnVsbHkgZGV0YWNoZWQgKGBkZXRhY2hlZDogdHJ1ZWAsIGBjaGlsZC51bnJlZigpYClcbiAqIGFuZCBzdXJ2aXZlcyBwYXJlbnQgZXhpdC4gU3Rkb3V0IGFuZCBzdGRlcnIgYXJlIGRpc2NhcmRlZDsgZXJyb3JzIGFyZVxuICogd3JpdHRlbiB0byB0aGUgc2hhcmVkIGFjdGlvbi1oYW5kbGVyIGxvZyBmaWxlIGluIHRoZSByZXBvIHJvb3QuXG4gKlxuICogQHBhcmFtIHBhcmFtcyAtIFBhcmFtZXRlcnMgZm9yIHRoZSBjbGVhbnVwIHJ1bi5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHNwYXduQnJhbmNoQ2xlYW51cFdhdGNoZXIocGFyYW1zOiBCcmFuY2hDbGVhbnVwUGFyYW1zKTogdm9pZCB7XG4gIGNvbnN0IHNlbGZQYXRoID0gbmV3IFVSTChpbXBvcnQubWV0YS51cmwpLnBhdGhuYW1lO1xuICBjb25zdCBub2RlQmluID0gcHJvY2Vzcy5leGVjUGF0aDtcblxuICBsZXQgY2hpbGQ6IENoaWxkUHJvY2VzcztcbiAgdHJ5IHtcbiAgICBjaGlsZCA9IHNwYXduKG5vZGVCaW4sIFtzZWxmUGF0aCwgJy0tYnJhbmNoLWNsZWFudXAnXSwge1xuICAgICAgZGV0YWNoZWQ6IHRydWUsXG4gICAgICBzdGRpbzogWydwaXBlJywgJ2lnbm9yZScsICdpZ25vcmUnXVxuICAgIH0pO1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIC8vIEZhaWwtb3BlbjogbG9nIGFuZCByZXR1cm47IGNsZWFudXAgd2lsbCBub3QgcnVuIHRoaXMgc2Vzc2lvblxuICAgIGNvbnNvbGUuZXJyb3IoYFticmFuY2gtY2xlYW51cC13YXRjaGVyXSBGYWlsZWQgdG8gc3Bhd24gd2F0Y2hlcjogJHtlcnJvck1lc3NhZ2UoZXJyb3IpfWApO1xuICAgIHJldHVybjtcbiAgfVxuXG4gIGNoaWxkLnN0ZGluIS5vbignZXJyb3InLCAoZXJyKSA9PiB7XG4gICAgLy8gVGhlIHBhcmVudCBtYXkgZXhpdCBiZWZvcmUgc3RkaW4gaXMgZnVsbHkgZHJhaW5lZDsgdGhpcyBpcyBleHBlY3RlZFxuICAgIGNvbnNvbGUuZXJyb3IoYFticmFuY2gtY2xlYW51cC13YXRjaGVyXSBTdGRpbiBwaXBlIGVycm9yOiAke2Vycm9yTWVzc2FnZShlcnIpfWApO1xuICB9KTtcblxuICBjaGlsZC5zdGRpbiEud3JpdGUoYCR7SlNPTi5zdHJpbmdpZnkocGFyYW1zKX1cXG5gKTtcbiAgY2hpbGQuc3RkaW4hLmVuZCgpO1xuXG4gIGNoaWxkLnVucmVmKCk7XG59XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIERldGFjaGVkIGVudHJ5IHBvaW50XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbmlmIChwcm9jZXNzLmFyZ3YuaW5jbHVkZXMoJy0tYnJhbmNoLWNsZWFudXAnKSkge1xuICBjb25zdCBjaHVua3M6IEJ1ZmZlcltdID0gW107XG5cbiAgcHJvY2Vzcy5zdGRpbi5vbignZGF0YScsIChjaHVuazogQnVmZmVyKSA9PiB7XG4gICAgY2h1bmtzLnB1c2goY2h1bmspO1xuICB9KTtcblxuICBwcm9jZXNzLnN0ZGluLm9uKCdlbmQnLCAoKSA9PiB7XG4gICAgdm9pZCAoYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3QgcmF3ID0gQnVmZmVyLmNvbmNhdChjaHVua3MpLnRvU3RyaW5nKCd1dGY4Jyk7XG4gICAgICBsZXQgcGFyYW1zOiBCcmFuY2hDbGVhbnVwUGFyYW1zO1xuICAgICAgdHJ5IHtcbiAgICAgICAgcGFyYW1zID0gSlNPTi5wYXJzZShyYXcpIGFzIEJyYW5jaENsZWFudXBQYXJhbXM7XG4gICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICBjb25zb2xlLmVycm9yKGBbYnJhbmNoLWNsZWFudXAtd2F0Y2hlcl0gRmFpbGVkIHRvIHBhcnNlIHBhcmFtczogJHtlcnJvck1lc3NhZ2UoZXJyb3IpfWApO1xuICAgICAgICBwcm9jZXNzLmV4aXQoMSk7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IHsgY2FyZElkLCByZXBvUm9vdCwgYXBpQmFzZVVybCwgYXBpQWNjZXNzVG9rZW4sIHNlc3Npb25JZCB9ID0gcGFyYW1zO1xuXG4gICAgICBjb25zdCBpbnB1dDogQWN0aW9uSW5wdXQgPSB7XG4gICAgICAgIGNhcmRJZCxcbiAgICAgICAgcmVwb1Jvb3QsXG4gICAgICAgIGFwaUJhc2VVcmwsXG4gICAgICAgIGFwaUFjY2Vzc1Rva2VuLFxuICAgICAgICBhY3Rpb25OYW1lOiAnYnJhbmNoLWNsZWFudXAtd2F0Y2hlcicsXG4gICAgICAgIGVudmlyb25tZW50OiAnJyxcbiAgICAgICAgZXhlY3V0aW9uTW9kZTogJ2JhY2tncm91bmQnLFxuICAgICAgICBjb2RpbmdBZ2VudDogdW5kZWZpbmVkLFxuICAgICAgICBzd2l0Y2hUb0ludGVyYWN0aXZlRGF0YTogdW5kZWZpbmVkLFxuICAgICAgICBjYXJkUmVwb1BhdGg6ICcnLFxuICAgICAgICBjb25maWdQYXRoOiAnJyxcbiAgICAgICAgZXh0ZW5zaW9uUGF0aDogJydcbiAgICAgIH07XG5cbiAgICAgIGNvbnN0IGNsaWVudCA9IG5ldyBDYXJkc0NsaWVudCh7XG4gICAgICAgIGJhc2VVcmw6IGFwaUJhc2VVcmwsXG4gICAgICAgIGFjY2Vzc1Rva2VuOiBhcGlBY2Nlc3NUb2tlblxuICAgICAgfSk7XG5cbiAgICAgIGNvbnN0IGxvZ2dlciA9IG5ldyBMb2dnZXIoe1xuICAgICAgICBsb2dGaWxlUGF0aDogcGF0aC5qb2luKHJlcG9Sb290LCAnLmNhcmRzJywgJ2xvZ3MnLCAnY2FyZHMtZGVmYXVsdC1jb25maWd1cmF0aW9uLWhvb2tzLmxvZycpXG4gICAgICB9KTtcblxuICAgICAgdHJ5IHtcbiAgICAgICAgYXdhaXQgY2xlYW51cE1lcmdlZEJyYW5jaGVzKGlucHV0LCBjbGllbnQsIGxvZ2dlciwgc2Vzc2lvbklkKTtcbiAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgIGNvbnN0IG1lc3NhZ2UgPSBlcnJvck1lc3NhZ2UoZXJyb3IpO1xuICAgICAgICBsb2dnZXIuZXJyb3IoJ0JyYW5jaCBjbGVhbnVwIHdhdGNoZXIgZmFpbGVkJywgeyBlcnJvcjogbWVzc2FnZSwgc2Vzc2lvbklkIH0pO1xuICAgICAgfSBmaW5hbGx5IHtcbiAgICAgICAgbG9nZ2VyLmNsb3NlKCk7XG4gICAgICB9XG4gICAgfSkoKTtcbiAgfSk7XG59XG4iLCAiXG5pbXBvcnQgaGFuZGxlciBmcm9tICcuL2xhdW5jaC50cyc7XG5pbXBvcnQgeyBleGVjdXRlQ29tbWFuZCB9IGZyb20gJy4uLy4uLy4uL3Nkay9zcmMvY29uZmlnL3J1bnRpbWUudHMnO1xuXG5pZiAoIXByb2Nlc3MuYXJndi5pbmNsdWRlcygnLS1icmFuY2gtY2xlYW51cCcpKSB7XG4gIGV4ZWN1dGVDb21tYW5kKGhhbmRsZXIpO1xufVxuIl0sCiAgIm1hcHBpbmdzIjogIjs7OztBQWlCQSxTQUFTLGtCQUFrQjs7O0FDd0twQixTQUFTLGFBQ2QsUUFDQSxTQUNnQztBQUNoQyxRQUFNLEtBQUssT0FBTyxPQUFvQixZQUEwQztBQUM5RSxVQUFNLFFBQVEsT0FBTyxPQUFPO0FBQUEsRUFDOUI7QUFFQSxLQUFHLGNBQWM7QUFDakIsS0FBRyxLQUFLLE9BQU87QUFDZixLQUFHLGFBQWEsT0FBTztBQUN2QixLQUFHLGNBQWMsT0FBTztBQUN4QixLQUFHLE9BQU8sT0FBTztBQUNqQixLQUFHLHlCQUF5QixPQUFPO0FBQ25DLEtBQUcsa0JBQWtCLE9BQU87QUFDNUIsS0FBRyxVQUFVLE9BQU87QUFDcEIsS0FBRyxhQUFhLE9BQU87QUFFdkIsU0FBTztBQUNUOzs7QUM1TEEsU0FBUyxvQkFBb0I7QUFjdEIsSUFBTSxpQkFBaUI7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBSzVCLFNBQVM7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBTVQsYUFBYTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFNYixhQUFhO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBT2IsZ0JBQWdCO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQU1oQixjQUFjO0FBQUE7QUFBQTtBQUFBO0FBQUE7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VUFBVSxDQUFDO0FBQUEsSUFDM0Y7QUFDQSxZQUFRLE9BQU8sTUFBTSw4QkFBOEI7QUFBQSxNQUNqRDtBQUFBLE1BQ0EsV0FBVyxLQUFLLE1BQU0sWUFBWSxJQUFJLElBQUksWUFBWTtBQUFBLElBQ3hELENBQUM7QUFBQSxFQUNIO0FBQ0Y7OztBUHRoQkEsSUFBTyxpQkFBUTtBQUFBLEVBQ2I7QUFBQSxJQUNFLFlBQVk7QUFBQSxJQUNaLGFBQWE7QUFBQSxJQUNiLHdCQUF3QjtBQUFBLElBQ3hCLFNBQVM7QUFBQSxFQUNYO0FBQUEsRUFDQSxPQUFPLE9BQW9CLFlBQTJCO0FBQ3BELFVBQU0sYUFBYSxNQUFNO0FBQ3pCLFVBQU0sQ0FBQyxXQUFXLE1BQU0sSUFBSSxDQUFDLFlBQVksYUFBYSxXQUFXLEdBQUcsQ0FBQyxDQUFDLFlBQVksU0FBUztBQUUzRixVQUFNLG1CQUFtQixPQUFPLFNBQVM7QUFBQSxNQUN2QyxRQUFRO0FBQUEsTUFDUjtBQUFBLE1BQ0E7QUFBQSxNQUNBLDZCQUE2QjtBQUFBLElBQy9CLENBQUM7QUFBQSxFQUNIO0FBQ0Y7OztBYTNDQSxJQUFJLENBQUMsUUFBUSxLQUFLLFNBQVMsa0JBQWtCLEdBQUc7QUFDOUMsaUJBQWUsY0FBTztBQUN4QjsiLAogICJuYW1lcyI6IFsicmVzb2x2ZSIsICJleGVjRmlsZSIsICJzcGF3biIsICJmcyIsICJwYXRoIiwgInByb21pc2lmeSIsICJwYXRoIiwgInJlc29sdmUiLCAibG9nZ2VyIiwgImZzIiwgInBhdGgiLCAicGF0aCIsICJsb2dnZXIiLCAiZXhlY0ZpbGVBc3luYyIsICJwcm9taXNpZnkiLCAiZXhlY0ZpbGUiLCAibG9nZ2VyIiwgInJlc3VsdCIsICJzcGF3biIsICJyZXNvbHZlIl0KfQo=
