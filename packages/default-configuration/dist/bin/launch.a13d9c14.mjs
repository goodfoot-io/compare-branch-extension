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
import { execFile as execFile2, spawn } from "node:child_process";
import * as fs3 from "node:fs/promises";
import * as path3 from "node:path";
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
  buildUrl(path4, params) {
    const url = new URL(path4, this.options.baseUrl);
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
  return path3.join(extensionPath, "dist", "marketplace");
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
  while (await checkWorktreeExists(repoRoot, path3.join(repoRoot, ".worktrees", `${prefix}${nextNumber}`))) {
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
      logger2.debug("Skipping branch with self-referential parentBranch", { branch: branch.name });
      continue;
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
  const child = spawn("claude", args, {
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
  const cleanupStart = performance.now();
  try {
    await cleanupMergedBranches(input, client, context.logger, sessionId);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    context.logger.warn("Post-exit cleanup failed (non-fatal)", { error: message, sessionId });
  }
  context.logger.debug("Post-exit cleanup finished", {
    sessionId,
    elapsedMs: Math.round(performance.now() - cleanupStart)
  });
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vLi4vc3JjL2FjdGlvbnMvbGF1bmNoLnRzIiwgIi4uLy4uLy4uL3Nkay9zcmMvY29uZmlnL2ZhY3Rvcmllcy9hY3Rpb24udHMiLCAiLi4vLi4vLi4vc2RrL3NyYy9jb25maWcvZW52LnRzIiwgIi4uLy4uLy4uL3Nkay9zcmMvY29uZmlnL2V4aXQtY29kZXMudHMiLCAiLi4vLi4vLi4vc2RrL3NyYy9jb25maWcvbG9nZ2VyLnRzIiwgIi4uLy4uLy4uL3Nkay9zcmMvY29uZmlnL3NvY2tldC1jbGllbnQudHMiLCAiLi4vLi4vLi4vc2RrL3NyYy9jb25maWcvcnVudGltZS50cyIsICIuLi8uLi9zcmMvbGliL2NsYXVkZS1zZXNzaW9uLnRzIiwgIi4uLy4uLy4uL3Nkay9zcmMvY2xpZW50L3R5cGVzL2Vycm9ycy50cyIsICIuLi8uLi8uLi9zZGsvc3JjL2NsaWVudC9jYXJkc0NsaWVudC50cyIsICIuLi8uLi8uLi9zZGsvc3JjL21hcmtldHBsYWNlLnRzIiwgIi4uLy4uLy4uL3Nkay9zcmMvd29ya3RyZWUudHMiLCAiLi4vLi4vc3JjL2FjdGlvbnMvaG9vay13cmFwcGVyLnRzIl0sCiAgInNvdXJjZXNDb250ZW50IjogWyIvKipcbiAqIExhdW5jaCBhY3Rpb24gZm9yIENsYXVkZSBDb2RlIHdvcmtmbG93cy5cbiAqXG4gKiBTcGF3bnMgdGhlIGBjbGF1ZGVgIENMSSBmb3IgdGhlIGN1cnJlbnQgY2FyZC4gSW4gaW50ZXJhY3RpdmUgbW9kZSwgdGhlXG4gKiBwcm9jZXNzIGluaGVyaXRzIHN0ZGlvIHNvIHRoZSB1c2VyIGdldHMgZGlyZWN0IHRlcm1pbmFsIGNvbnRyb2wuIEluXG4gKiBiYWNrZ3JvdW5kIG1vZGUsIENsYXVkZSBydW5zIHdpdGggYC0tcHJpbnRgIHNvIGl0IGV4ZWN1dGVzIG5vbi1pbnRlcmFjdGl2ZWx5XG4gKiAodGFrZXMgYSBwcm9tcHQsIHJ1bnMsIGFuZCBleGl0cykuIFRoZSB3YXRjaGVyIGhhbmRsZXMgYWxsIHRyYW5zY3JpcHRcbiAqIHN0cmVhbWluZzsgbGF1bmNoLnRzIGRvZXMgbm90IG9wZW4gYW55IHN0cmVhbSBlbmRwb2ludC5cbiAqXG4gKiBUaGUgYWN0aW9uIGF3YWl0cyBwcm9jZXNzIGV4aXQgYmVmb3JlIHJlc29sdmluZywgc28gdGhlIHRlcm1pbmFsIGNsb3Nlc1xuICogb25seSBhZnRlciBDbGF1ZGUgZmluaXNoZXMgYW5kIGNsZWFudXAgaXMgY29tcGxldGUuXG4gKlxuICogQHN1bW1hcnkgTGF1bmNoIGFjdGlvbiBmb3IgQ2xhdWRlIENvZGUgd29ya2Zsb3dzXG4gKiBAbW9kdWxlXG4gKiBAc2VlIHtAbGluayBkZWZpbmVBY3Rpb259IGZvciBmYWN0b3J5IGJlaGF2aW9yIGFuZCBtZXRhZGF0YSBhdHRhY2htZW50XG4gKi9cblxuaW1wb3J0IHsgcmFuZG9tVVVJRCB9IGZyb20gJ25vZGU6Y3J5cHRvJztcbmltcG9ydCB7IHR5cGUgQWN0aW9uQ29udGV4dCwgdHlwZSBBY3Rpb25JbnB1dCwgZGVmaW5lQWN0aW9uIH0gZnJvbSAnQGNhcmRzL3Nkay9jb25maWcnO1xuaW1wb3J0IHsgc3Bhd25DbGF1ZGVTZXNzaW9uIH0gZnJvbSAnLi4vbGliL2NsYXVkZS1zZXNzaW9uLmpzJztcblxuLyoqXG4gKiBMYXVuY2ggYWN0aW9uIGhhbmRsZXIuXG4gKlxuICogU3Bhd25zIHRoZSBgY2xhdWRlYCBDTEkgYXMgYSBjaGlsZCBwcm9jZXNzLCBwcm92aWRpbmcgdGhlIGNhcmQgSUQgYW5kXG4gKiByZXBvc2l0b3J5IHBhdGggYXMgcHJvbXB0IGNvbnRleHQuIFRoZSBwcm9jZXNzIGxpZmVjeWNsZSBpcyB0aWVkIHRvIHRoZVxuICogYWN0aW9uOiBjYW5jZWxsYXRpb24gc2VuZHMgU0lHVEVSTSwgYW5kIHN3aXRjaGluZyB0byBpbnRlcmFjdGl2ZSBtb2RlXG4gKiBwcmVzZXJ2ZXMgdGhlIHNlc3Npb24gSUQgZm9yIHJlc3VtcHRpb24uXG4gKi9cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUFjdGlvbihcbiAge1xuICAgIGFjdGlvbk5hbWU6ICdMYXVuY2gnLFxuICAgIGRlc2NyaXB0aW9uOiAnU3RhcnQgYSBDbGF1ZGUgc2Vzc2lvbiBmb3IgdGhlIGNhcmQnLFxuICAgIHN1cHBvcnRzQmFja2dyb3VuZE1vZGU6IHRydWUsXG4gICAgdGltZW91dDogMzYwMDAwMFxuICB9LFxuICBhc3luYyAoaW5wdXQ6IEFjdGlvbklucHV0LCBjb250ZXh0OiBBY3Rpb25Db250ZXh0KSA9PiB7XG4gICAgY29uc3Qgc3dpdGNoRGF0YSA9IGlucHV0LnN3aXRjaFRvSW50ZXJhY3RpdmVEYXRhIGFzIHsgc2Vzc2lvbklkPzogc3RyaW5nIH0gfCB1bmRlZmluZWQ7XG4gICAgY29uc3QgW3Nlc3Npb25JZCwgcmVzdW1lXSA9IFtzd2l0Y2hEYXRhPy5zZXNzaW9uSWQgPz8gcmFuZG9tVVVJRCgpLCAhIXN3aXRjaERhdGE/LnNlc3Npb25JZF07XG5cbiAgICBhd2FpdCBzcGF3bkNsYXVkZVNlc3Npb24oaW5wdXQsIGNvbnRleHQsIHtcbiAgICAgIHByb21wdDogJ0xvYWQgdGhlIGBydW50aW1lOmNhcmQtcmVwb2AgYW5kIGBydW50aW1lOmNhcmQtcm91dGluZ2Agc2tpbGxzIHRoZW4gZm9sbG93IHRoZSBgPGluc3RydWN0aW9ucz5gLicsXG4gICAgICBzZXNzaW9uSWQsXG4gICAgICByZXN1bWUsXG4gICAgICBzdXBwb3J0c1N3aXRjaFRvSW50ZXJhY3RpdmU6IHRydWVcbiAgICB9KTtcbiAgfVxuKTtcbiIsICIvKipcbiAqIEZhY3RvcnkgZnVuY3Rpb24gZm9yIGNyZWF0aW5nIGFjdGlvbiBoYW5kbGVycy5cbiAqXG4gKiBUaGlzIGlzIHRoZSBwcmltYXJ5IGF1dGhvcmluZyBBUEkgZm9yIGFjdGlvbiBkZXZlbG9wZXJzLiBJdCB3cmFwcyBhIGhhbmRsZXJcbiAqIGZ1bmN0aW9uIGFuZCBhdHRhY2hlcyBtZXRhZGF0YSBmb3Igc2V0dGluZ3MuanNvbiBnZW5lcmF0aW9uLiBUaGUgU2FtZVNoYXBlXG4gKiB1dGlsaXR5IHByb3ZpZGVzIGNvbXBpbGUtdGltZSB0eXBvIGRldGVjdGlvbi5cbiAqXG4gKlxuICogQHN1bW1hcnkgRmFjdG9yeSBmdW5jdGlvbiBmb3IgY3JlYXRpbmcgYWN0aW9uIGhhbmRsZXJzXG4gKiBAbW9kdWxlXG4gKi9cblxuaW1wb3J0IHR5cGUgeyBBY3Rpb25Db21tYW5kIH0gZnJvbSAnLi4vY29tbWFuZC10eXBlcy5qcyc7XG5pbXBvcnQgdHlwZSB7IEFjdGlvbkNvbnRleHQsIEFjdGlvbklucHV0IH0gZnJvbSAnLi4vaW5wdXRzLmpzJztcbmltcG9ydCB0eXBlIHsgU2FtZVNoYXBlIH0gZnJvbSAnLi4vdHlwZS11dGlscy5qcyc7XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIENvbmZpZ3VyYXRpb24gVHlwZXNcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuLyoqXG4gKiBDb25maWd1cmF0aW9uIGZvciB7QGxpbmsgZGVmaW5lQWN0aW9ufSBmYWN0b3J5LlxuICpcbiAqIEFsbCBmaWVsZHMgZXhjZXB0IGBhY3Rpb25OYW1lYCBhcmUgb3B0aW9uYWwgYW5kIGZvcndhcmRlZCB0byBzZXR0aW5ncy5qc29uLlxuICogVGhlIENMSSBleHRyYWN0cyB0aGlzIG1ldGFkYXRhIHZpYSBBU1QgYW5hbHlzaXMsIHNvIHZhbHVlcyBtdXN0IGJlIHN0cmluZ1xuICogbGl0ZXJhbHMgb3IgYm9vbGVhbi9udW1iZXIgbGl0ZXJhbHMgaW4gdGhlIHNvdXJjZSBjb2RlLlxuICpcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBjb25zdCBjb25maWc6IEFjdGlvbkNvbmZpZyA9IHtcbiAqICAgYWN0aW9uTmFtZTogJ0xhdW5jaCBDbGF1ZGUnLFxuICogICBkZXNjcmlwdGlvbjogJ1N0YXJ0IGEgQ2xhdWRlIGNvZGluZyBzZXNzaW9uJyxcbiAqICAgaWNvbjogJy4vaWNvbnMvY2xhdWRlLnN2ZycsXG4gKiAgIHN1cHBvcnRzQmFja2dyb3VuZE1vZGU6IHRydWUsXG4gKiAgIHRpbWVvdXQ6IDMwMDAwXG4gKiB9O1xuICogYGBgXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgQWN0aW9uQ29uZmlnIHtcbiAgLyoqXG4gICAqIFN0YWJsZSBpZGVudGlmaWVyIGZvciB0aGUgYWN0aW9uIHVzZWQgaW4gdGVsZW1ldHJ5LCBsb2NhbGl6YXRpb24sIGFuZCBBUEkgbG9va3Vwcy5cbiAgICpcbiAgICogU2hvdWxkIGJlIGxvd2VyY2FzZSB3aXRoIGh5cGhlbnMgKGUuZy4sICdsYXVuY2gtY2xhdWRlJywgJ3J1bi10ZXN0cycpLlxuICAgKiBJZiBvbWl0dGVkLCB0aGUgQ0xJIGdlbmVyYXRlcyBhbiBJRCBieSBzbHVnaWZ5aW5nIGBhY3Rpb25OYW1lYC5cbiAgICovXG4gIGlkPzogc3RyaW5nO1xuXG4gIC8qKlxuICAgKiBUaGUgYWN0aW9uIG5hbWUgdXNlZCB0byBpZGVudGlmeSB0aGUgYWN0aW9uIGluIHNldHRpbmdzLmpzb24uXG4gICAqXG4gICAqIFRoaXMgbmFtZSBhcHBlYXJzIGluIHRoZSBVSS4gS2VlcCBpdCBjb25jaXNlIGJ1dCBkZXNjcmlwdGl2ZS5cbiAgICovXG4gIGFjdGlvbk5hbWU6IHN0cmluZztcblxuICAvKipcbiAgICogSHVtYW4tcmVhZGFibGUgZGVzY3JpcHRpb24gc2hvd24gaW4gYnV0dG9uIHRvb2x0aXAuXG4gICAqXG4gICAqIEV4cGxhaW4gd2hhdCB0aGUgYWN0aW9uIGRvZXMgaW4gYSBmZXcgd29yZHMuIFNob3duIG9uIGhvdmVyIGluIHRoZSBVSS5cbiAgICovXG4gIGRlc2NyaXB0aW9uPzogc3RyaW5nO1xuXG4gIC8qKlxuICAgKiBQYXRoIHRvIGljb24gZmlsZSBmb3IgdGhlIGFjdGlvbiBidXR0b24uXG4gICAqXG4gICAqIFBhdGhzIGFyZSByZWxhdGl2ZSB0byB0aGUgc2V0dGluZ3MuanNvbiBmaWxlIGxvY2F0aW9uLlxuICAgKiBTVkcgZm9ybWF0IHJlY29tbWVuZGVkIGZvciBjcmlzcCByZW5kZXJpbmcgYXQgYW55IHNpemUuXG4gICAqL1xuICBpY29uPzogc3RyaW5nO1xuXG4gIC8qKlxuICAgKiBXaGV0aGVyIHRvIHNob3cgdGhlIGV4ZWN1dGlvbiBtb2RlIHRvZ2dsZSBpbiB0aGUgVUkuXG4gICAqXG4gICAqIFdoZW4gdHJ1ZSwgdXNlcnMgY2FuIGNob29zZSBiZXR3ZWVuIGludGVyYWN0aXZlIGFuZCBiYWNrZ3JvdW5kIG1vZGVzLlxuICAgKiBXaGVuIGZhbHNlIChkZWZhdWx0KSwgdGhlIGFjdGlvbiBhbHdheXMgcnVucyBpbiBpbnRlcmFjdGl2ZSBtb2RlLlxuICAgKi9cbiAgc3VwcG9ydHNCYWNrZ3JvdW5kTW9kZT86IGJvb2xlYW47XG5cbiAgLyoqXG4gICAqIFdoZXRoZXIgbXVsdGlwbGUgaW5zdGFuY2VzIGNhbiBydW4gc2ltdWx0YW5lb3VzbHkgb24gdGhlIHNhbWUgY2FyZC5cbiAgICpcbiAgICogV2hlbiBmYWxzZSAoZGVmYXVsdCksIHN0YXJ0aW5nIHRoZSBhY3Rpb24gd2hpbGUgaXQncyBydW5uaW5nIHdpbGwgYmVcbiAgICogYmxvY2tlZC4gU2V0IHRvIHRydWUgZm9yIGlkZW1wb3RlbnQgYWN0aW9ucyB0aGF0IGNhbiBzYWZlbHkgb3ZlcmxhcC5cbiAgICovXG4gIGFsbG93Q29uY3VycmVudD86IGJvb2xlYW47XG5cbiAgLyoqXG4gICAqIE1heGltdW0gZXhlY3V0aW9uIHRpbWUgaW4gbWlsbGlzZWNvbmRzLlxuICAgKlxuICAgKiBJZiB0aGUgYWN0aW9uIGV4Y2VlZHMgdGhpcyB0aW1lb3V0LCB0aGUgcnVudGltZSB3aWxsIHRlcm1pbmF0ZSBpdC5cbiAgICogT21pdCB0byB1c2UgdGhlIHBsYXRmb3JtJ3MgZGVmYXVsdCB0aW1lb3V0IHBvbGljeS5cbiAgICovXG4gIHRpbWVvdXQ/OiBudW1iZXI7XG5cbiAgLyoqXG4gICAqIEhhbmRsZXIgc291cmNlIGZpbGUgcGF0aCwgaW5qZWN0ZWQgYnkgdGhlIGBpbmplY3RTb3VyY2VQYXRoYCBlc2J1aWxkXG4gICAqIHBsdWdpbiBkdXJpbmcgY29uZmlnIGxvYWRpbmcuIERvIG5vdCBzZXQgbWFudWFsbHkuXG4gICAqXG4gICAqIEBpbnRlcm5hbFxuICAgKi9cbiAgc291cmNlUGF0aD86IHN0cmluZztcbn1cblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gSGFuZGxlciBUeXBlc1xuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4vKipcbiAqIEhhbmRsZXIgZnVuY3Rpb24gc2lnbmF0dXJlIGZvciBhY3Rpb24gZXZlbnRzLlxuICpcbiAqIFRocm93aW5nIGFuIGVycm9yIHNpZ25hbHMgYWN0aW9uIGZhaWx1cmUuIFRoZSBlcnJvciBtZXNzYWdlIGlzIGxvZ2dlZCBhbmRcbiAqIHN1cmZhY2VkIHRvIHRoZSB1c2VyLiBGb3IgZXhwZWN0ZWQgZXJyb3JzLCB0aHJvdyB3aXRoIGEgZGVzY3JpcHRpdmUgbWVzc2FnZS5cbiAqXG4gKiBAcGFyYW0gaW5wdXQgLSBBY3Rpb24gaW5wdXQgcGF5bG9hZCBmcm9tIGVudmlyb25tZW50IHZhcmlhYmxlc1xuICogQHBhcmFtIGNvbnRleHQgLSBSdW50aW1lIGNvbnRleHQgd2l0aCBsb2dnZXIsIGN3ZCwgYW5kIGNhbGxiYWNrIG1ldGhvZHNcbiAqIEByZXR1cm5zIFByb21pc2UgdGhhdCByZXNvbHZlcyB3aGVuIHRoZSBhY3Rpb24gY29tcGxldGVzXG4gKlxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGNvbnN0IGhhbmRsZXI6IEFjdGlvbkhhbmRsZXIgPSBhc3luYyAoaW5wdXQsIHsgbG9nZ2VyLCBvbkNhbmNlbCB9KSA9PiB7XG4gKiAgIG9uQ2FuY2VsKCgpID0+IHtcbiAqICAgICBsb2dnZXIuaW5mbygnQ2FuY2VsbGluZyBhY3Rpb24nKTtcbiAqICAgfSk7XG4gKlxuICogICB0cnkge1xuICogICAgIGxvZ2dlci5pbmZvKCdTdGFydGluZyBhY3Rpb24nLCB7IGNhcmRJZDogaW5wdXQuY2FyZElkIH0pO1xuICogICAgIGF3YWl0IHBlcmZvcm1BY3Rpb24oaW5wdXQpO1xuICogICAgIGxvZ2dlci5pbmZvKCdBY3Rpb24gY29tcGxldGVkIHN1Y2Nlc3NmdWxseScpO1xuICogICB9IGNhdGNoIChlcnIpIHtcbiAqICAgICBsb2dnZXIubG9nRXJyb3IoZXJyLCAnQWN0aW9uIGZhaWxlZCcpO1xuICogICAgIHRocm93IGVycjsgLy8gUmUtdGhyb3cgdG8gc2lnbmFsIGZhaWx1cmVcbiAqICAgfVxuICogfTtcbiAqIGBgYFxuICovXG5leHBvcnQgdHlwZSBBY3Rpb25IYW5kbGVyID0gKGlucHV0OiBBY3Rpb25JbnB1dCwgY29udGV4dDogQWN0aW9uQ29udGV4dCkgPT4gdm9pZCB8IFByb21pc2U8dm9pZD47XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIEZhY3RvcnkgRnVuY3Rpb25cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuLyoqXG4gKiBDcmVhdGVzIGFuIGFjdGlvbiBoYW5kbGVyIHdpdGggbWV0YWRhdGEgZm9yIHNldHRpbmdzLmpzb24gZ2VuZXJhdGlvbi5cbiAqXG4gKiBUaGlzIGZhY3Rvcnkgd3JhcHMgeW91ciBoYW5kbGVyIGZ1bmN0aW9uIGFuZCBhdHRhY2hlcyBtZXRhZGF0YSB0aGF0IHRoZSBDTElcbiAqIGV4dHJhY3RzIHdoZW4gYnVpbGRpbmcgc2V0dGluZ3MuanNvbi4gVGhlIHJldHVybmVkIGNvbW1hbmQgaXMgYm90aCBjYWxsYWJsZVxuICogKGZvciB0aGUgcnVudGltZSkgYW5kIGluc3BlY3RhYmxlIChmb3IgdGhlIENMSSkuXG4gKlxuICogVGhlIGdlbmVyaWMgcGFyYW1ldGVyIHByZXNlcnZlcyB0aGUgYWN0aW9uIG5hbWUgYXMgYSBsaXRlcmFsIHR5cGUuXG4gKlxuICogQHRlbXBsYXRlIFQgLSBUaGUgY29uZmlnIHR5cGUgZXh0ZW5kaW5nIEFjdGlvbkNvbmZpZ1xuICogQHBhcmFtIGNvbmZpZyAtIEFjdGlvbiBtZXRhZGF0YSAodXNlcyBTYW1lU2hhcGUgdG8gY2F0Y2ggdHlwb3MpXG4gKiBAcGFyYW0gaGFuZGxlciAtIEFzeW5jIGZ1bmN0aW9uIHRoYXQgaW1wbGVtZW50cyB0aGUgYWN0aW9uIGxvZ2ljXG4gKiBAcmV0dXJucyBBIGNhbGxhYmxlIGNvbW1hbmQgd2l0aCBhdHRhY2hlZCBtZXRhZGF0YVxuICpcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiAvLyBCYXNpYyB1c2FnZVxuICogZXhwb3J0IGRlZmF1bHQgZGVmaW5lQWN0aW9uKFxuICogICB7IGFjdGlvbk5hbWU6ICdMYXVuY2ggQ2xhdWRlJyB9LFxuICogICBhc3luYyAoaW5wdXQsIHsgbG9nZ2VyIH0pID0+IHtcbiAqICAgICBsb2dnZXIuaW5mbygnTGF1bmNoaW5nIENsYXVkZScsIHsgY2FyZElkOiBpbnB1dC5jYXJkSWQgfSk7XG4gKiAgICAgYXdhaXQgc3Bhd25DbGF1ZGUoaW5wdXQpO1xuICogICB9XG4gKiApO1xuICogYGBgXG4gKlxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIC8vIFdpdGggZnVsbCBjb25maWd1cmF0aW9uXG4gKiBleHBvcnQgZGVmYXVsdCBkZWZpbmVBY3Rpb24oXG4gKiAgIHtcbiAqICAgICBhY3Rpb25OYW1lOiAnRGVwbG95IEFwcGxpY2F0aW9uJyxcbiAqICAgICBkZXNjcmlwdGlvbjogJ0RlcGxveSB0byBwcm9kdWN0aW9uJyxcbiAqICAgICBpY29uOiAnLi9pY29ucy9kZXBsb3kuc3ZnJyxcbiAqICAgICBzdXBwb3J0c0JhY2tncm91bmRNb2RlOiB0cnVlLFxuICogICAgIGFsbG93Q29uY3VycmVudDogZmFsc2UsXG4gKiAgICAgdGltZW91dDogNjAwMDBcbiAqICAgfSxcbiAqICAgYXN5bmMgKGlucHV0LCBjb250ZXh0KSA9PiB7XG4gKiAgICAgY29udGV4dC5vbkNhbmNlbCgoKSA9PiBjbGVhbnVwKCkpO1xuICogICAgIGF3YWl0IGRlcGxveShpbnB1dCwgY29udGV4dCk7XG4gKiAgIH1cbiAqICk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGRlZmluZUFjdGlvbjxUIGV4dGVuZHMgQWN0aW9uQ29uZmlnPihcbiAgY29uZmlnOiBTYW1lU2hhcGU8QWN0aW9uQ29uZmlnLCBUPixcbiAgaGFuZGxlcjogQWN0aW9uSGFuZGxlclxuKTogQWN0aW9uQ29tbWFuZDxUWydhY3Rpb25OYW1lJ10+IHtcbiAgY29uc3QgZm4gPSBhc3luYyAoaW5wdXQ6IEFjdGlvbklucHV0LCBjb250ZXh0OiBBY3Rpb25Db250ZXh0KTogUHJvbWlzZTx2b2lkPiA9PiB7XG4gICAgYXdhaXQgaGFuZGxlcihpbnB1dCwgY29udGV4dCk7XG4gIH07XG5cbiAgZm4uZmFjdG9yeVR5cGUgPSAnYWN0aW9uJyBhcyBjb25zdDtcbiAgZm4uaWQgPSBjb25maWcuaWQ7XG4gIGZuLmFjdGlvbk5hbWUgPSBjb25maWcuYWN0aW9uTmFtZTtcbiAgZm4uZGVzY3JpcHRpb24gPSBjb25maWcuZGVzY3JpcHRpb247XG4gIGZuLmljb24gPSBjb25maWcuaWNvbjtcbiAgZm4uc3VwcG9ydHNCYWNrZ3JvdW5kTW9kZSA9IGNvbmZpZy5zdXBwb3J0c0JhY2tncm91bmRNb2RlO1xuICBmbi5hbGxvd0NvbmN1cnJlbnQgPSBjb25maWcuYWxsb3dDb25jdXJyZW50O1xuICBmbi50aW1lb3V0ID0gY29uZmlnLnRpbWVvdXQ7XG4gIGZuLnNvdXJjZVBhdGggPSBjb25maWcuc291cmNlUGF0aDtcblxuICByZXR1cm4gZm4gYXMgQWN0aW9uQ29tbWFuZDxUWydhY3Rpb25OYW1lJ10+O1xufVxuIiwgIi8qKlxuICogRW52aXJvbm1lbnQgdmFyaWFibGUgdXRpbGl0aWVzIGZvciBDYXJkcyBFeHRlbnNpb24gYWN0aW9ucyBhbmQgdHlwZSBob29rcy5cbiAqXG4gKiBUaGUgZXhlY3V0aW9uIHdyYXBwZXIgaW5qZWN0cyBhY3Rpb24gYW5kIHR5cGUgaG9vayBpbnB1dHMgdmlhIHByb2Nlc3MuZW52LlxuICogVGhpcyBtb2R1bGUgcHJvdmlkZXMgc3RyaWN0IGdldHRlcnMgYW5kIHR5cGVkIGV4dHJhY3RvcnMgc28gaGFuZGxlcnMgZG8gbm90XG4gKiBuZWVkIHRvIHBhcnNlIGVudmlyb25tZW50IHZhcmlhYmxlcyBtYW51YWxseS5cbiAqXG4gKiBVc2UgdGhlIGluZGl2aWR1YWwgZ2V0dGVycyB3aGVuIHlvdSBvbmx5IG5lZWQgb25lIHZhbHVlOyB1c2VcbiAqIHtAbGluayBleHRyYWN0QWN0aW9uSW5wdXR9IG9yIHtAbGluayBleHRyYWN0VHlwZUlucHV0fSB3aGVuIHlvdSBuZWVkIGEgZnVsbFxuICogdHlwZWQgcGF5bG9hZCBmb3IgYW4gYWN0aW9uIG9yIHR5cGUgaG9vay5cbiAqXG4gKlxuICogQHN1bW1hcnkgRW52aXJvbm1lbnQgdmFyaWFibGUgdXRpbGl0aWVzIGZvciBDYXJkcyBFeHRlbnNpb24gYWN0aW9ucyBhbmQgdHlwZSBob29rc1xuICogQG1vZHVsZVxuICovXG5cbmltcG9ydCB7IHJlYWRGaWxlU3luYyB9IGZyb20gJ25vZGU6ZnMnO1xuaW1wb3J0IHR5cGUgeyBBY3Rpb25JbnB1dCwgVHlwZUhvb2tJbnB1dCB9IGZyb20gJy4vaW5wdXRzLmpzJztcblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gQ29uc3RhbnRzXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbi8qKlxuICogRW52aXJvbm1lbnQgdmFyaWFibGUgbmFtZXMgc2V0IGJ5IHRoZSBDYXJkcyBleGVjdXRpb24gd3JhcHBlci5cbiAqXG4gKiBUaGlzIGlzIHRoZSBzaW5nbGUgc291cmNlIG9mIHRydXRoIGZvciBlbnYgdmFyIGtleXMgdXNlZCBieSBhY3Rpb24gYW5kIHR5cGVcbiAqIGhvb2sgcHJvY2Vzc2VzLiBLZWVwIGl0IGluIHN5bmMgd2l0aCB0aGUgd3JhcHBlciB0byBhdm9pZCBzdWJ0bGUgXCJ1bmRlZmluZWRcbiAqIGlucHV0XCIgYnVncy5cbiAqL1xuZXhwb3J0IGNvbnN0IENBUkRTX0VOVl9WQVJTID0ge1xuICAvKipcbiAgICogVW5pcXVlIGlkZW50aWZpZXIgZm9yIHRoZSBjdXJyZW50IGNhcmQuXG4gICAqIEF2YWlsYWJsZSBpbiBhbGwgYWN0aW9ucyBhbmQgdHlwZSBob29rcy5cbiAgICovXG4gIENBUkRfSUQ6ICdDQVJEX0lEJyxcblxuICAvKipcbiAgICogVGhlIGVudmlyb25tZW50IG5hbWUgZnJvbSBzZXR0aW5ncy5qc29uLlxuICAgKiBBdmFpbGFibGUgaW4gYWxsIGFjdGlvbnMgYW5kIHR5cGUgaG9va3MuXG4gICAqL1xuICBFTlZJUk9OTUVOVDogJ0VOVklST05NRU5UJyxcblxuICAvKipcbiAgICogRGlzcGxheSBuYW1lIG9mIHRoZSBhY3Rpb24gYnV0dG9uIHRoYXQgdHJpZ2dlcmVkIHRoaXMgaGFuZGxlci5cbiAgICogQXZhaWxhYmxlIGluIGFjdGlvbnMgb25seSAobm90IHR5cGUgaG9va3MpLlxuICAgKi9cbiAgQUNUSU9OX05BTUU6ICdBQ1RJT05fTkFNRScsXG5cbiAgLyoqXG4gICAqIENhcmQncyBleGVjdXRpb24gbW9kZSwgZGV0ZXJtaW5pbmcgVUkgaW50ZXJhY3Rpb24gbW9kZWwuXG4gICAqIEF2YWlsYWJsZSBpbiBhY3Rpb25zIG9ubHkgKG5vdCB0eXBlIGhvb2tzKS5cbiAgICogVmFsaWQgdmFsdWVzOiAnaW50ZXJhY3RpdmUnIHwgJ2JhY2tncm91bmQnXG4gICAqL1xuICBFWEVDVVRJT05fTU9ERTogJ0VYRUNVVElPTl9NT0RFJyxcblxuICAvKipcbiAgICogQ2FyZHMgc2VydmVyIGJhc2UgVVJMIGZvciBBUEkgY2FsbHMuXG4gICAqIEF2YWlsYWJsZSBpbiBhbGwgYWN0aW9ucyBhbmQgdHlwZSBob29rcy5cbiAgICovXG4gIEFQSV9CQVNFX1VSTDogJ0FQSV9CQVNFX1VSTCcsXG5cbiAgLyoqXG4gICAqIEF1dGhlbnRpY2F0aW9uIHRva2VuIGZvciBBUEkgY2FsbHMuXG4gICAqIEF2YWlsYWJsZSBpbiBhbGwgYWN0aW9ucyBhbmQgdHlwZSBob29rcy5cbiAgICovXG4gIEFQSV9BQ0NFU1NfVE9LRU46ICdBUElfQUNDRVNTX1RPS0VOJyxcblxuICAvKipcbiAgICogQ29uZmlndXJlZCBjb2RpbmcgYWdlbnQgaWRlbnRpZmllciBmcm9tIGNhcmRzLmNvZGluZ0FnZW50IHNldHRpbmcuXG4gICAqIEF2YWlsYWJsZSBpbiBhY3Rpb25zIG9ubHkgKG5vdCB0eXBlIGhvb2tzKS5cbiAgICogT3B0aW9uYWwuXG4gICAqL1xuICBDT0RJTkdfQUdFTlQ6ICdDT0RJTkdfQUdFTlQnLFxuXG4gIC8qKlxuICAgKiBUaGUgcmVnaXN0ZXJlZCB0eXBlIG5hbWUuXG4gICAqIEF2YWlsYWJsZSBpbiB0eXBlIGhvb2tzIG9ubHkuXG4gICAqL1xuICBUWVBFX05BTUU6ICdUWVBFX05BTUUnLFxuXG4gIC8qKlxuICAgKiBUaGUgdHlwZSdzIHZlcnNpb24gc3RyaW5nIGZyb20gc2V0dGluZ3MuanNvbiBjb25maWd1cmF0aW9uLlxuICAgKiBBdmFpbGFibGUgaW4gdHlwZSBob29rcyBvbmx5LlxuICAgKi9cbiAgVFlQRV9WRVJTSU9OOiAnVFlQRV9WRVJTSU9OJyxcblxuICAvKipcbiAgICogVGhlIGZpbGUgbmFtZSB3aXRoaW4gdGhlIHR5cGUgZGlyZWN0b3J5LlxuICAgKiBBdmFpbGFibGUgaW4gdHlwZSBob29rcyBvbmx5LlxuICAgKi9cbiAgRklMRV9OQU1FOiAnRklMRV9OQU1FJyxcblxuICAvKipcbiAgICogRnVsbCBwYXRoIHRvIHRoZSBmaWxlLlxuICAgKiBBdmFpbGFibGUgaW4gdHlwZSBob29rcyBvbmx5LlxuICAgKi9cbiAgRklMRV9QQVRIOiAnRklMRV9QQVRIJyxcblxuICAvKipcbiAgICogRmlsZSBzaXplIGluIGJ5dGVzLlxuICAgKiBBdmFpbGFibGUgaW4gdHlwZSBob29rcyBvbmx5LlxuICAgKi9cbiAgRklMRV9TSVpFOiAnRklMRV9TSVpFJyxcblxuICAvKipcbiAgICogU0hBMjU2IGhhc2ggb2YgY29udGVudC5cbiAgICogQXZhaWxhYmxlIGluIHR5cGUgaG9va3Mgb25seS5cbiAgICovXG4gIFNIQTI1NjogJ1NIQTI1NicsXG5cbiAgLyoqXG4gICAqIE1JTUUgdHlwZSBvZiB0aGUgY29udGVudC5cbiAgICogQXZhaWxhYmxlIGluIHR5cGUgaG9va3Mgb25seS5cbiAgICovXG4gIENPTlRFTlRfVFlQRTogJ0NPTlRFTlRfVFlQRScsXG5cbiAgLyoqXG4gICAqIFBhdGggdG8gdGhlIFZTIENvZGUgYnVuZGxlZCBOb2RlLmpzIGludGVycHJldGVyLlxuICAgKlxuICAgKiBTZXQgYnkgdGhlIGV4dGVuc2lvbiBob3N0IGZyb20gYHByb2Nlc3MuZXhlY1BhdGhgICh3aXRoXG4gICAqIGBFTEVDVFJPTl9SVU5fQVNfTk9ERT0xYCkuIENvbW1hbmRzIGluIHNldHRpbmdzLmpzb24gdXNlXG4gICAqIGAkVlNDT0RFX05PREUgLi9iaW4vLi4uYCBzbyB0aGV5IHdvcmsgcmVnYXJkbGVzcyBvZlxuICAgKiB3aGV0aGVyIGBub2RlYCBpcyBvbiB0aGUgc3lzdGVtIFBBVEguXG4gICAqXG4gICAqIEF2YWlsYWJsZSBpbiBhbGwgYWN0aW9ucyBhbmQgdHlwZSBob29rcy5cbiAgICovXG4gIFZTQ09ERV9OT0RFOiAnVlNDT0RFX05PREUnLFxuXG4gIC8qKlxuICAgKiBQYXRoIHRvIHRoZSBOb2RlLmpzIGludGVycHJldGVyIHJ1bm5pbmcgdGhlIHdyYXBwZXIgcHJvY2Vzcy5cbiAgICpcbiAgICogU2V0IGJ5IHRoZSB3cmFwcGVyIGZyb20gYHByb2Nlc3MuZXhlY1BhdGhgLiBVc2UgYCROT0RFYCBpbiBlbWJlZGRlZFxuICAgKiBiYXNoIHN0YXRlbWVudHMgdG8gaW52b2tlIE5vZGUgc2NyaXB0cyBwb3J0YWJseS5cbiAgICpcbiAgICogQXZhaWxhYmxlIGluIGFsbCBhY3Rpb25zLlxuICAgKi9cbiAgTk9ERTogJ05PREUnLFxuXG4gIC8qKlxuICAgKiBQYXRoIHRvIHRoZSBVbml4IGRvbWFpbiBzb2NrZXQgZm9yIHJ1bnRpbWUtdG8tZGlzcGF0Y2hlciBjb21tdW5pY2F0aW9uLlxuICAgKiBBdmFpbGFibGUgaW4gYWN0aW9ucyBvbmx5LlxuICAgKi9cbiAgU09DS0VUX1BBVEg6ICdTT0NLRVRfUEFUSCcsXG5cbiAgLyoqXG4gICAqIFBhdGggdG8gYSBKU09OIGZpbGUgY29udGFpbmluZyBzd2l0Y2hUb0ludGVyYWN0aXZlIGRhdGEgZnJvbSBhIHByZXZpb3VzIGhhbmRsZXIuXG4gICAqIEF2YWlsYWJsZSBpbiBhY3Rpb25zIG9ubHkuIE9wdGlvbmFsLlxuICAgKi9cbiAgU1dJVENIX1RPX0lOVEVSQUNUSVZFX0RBVEFfUEFUSDogJ1NXSVRDSF9UT19JTlRFUkFDVElWRV9EQVRBX1BBVEgnLFxuXG4gIC8qKlxuICAgKiBQYXRoIHRvIHRoZSBzZXR0aW5ncyBjb25maWd1cmF0aW9uIGRpcmVjdG9yeS5cbiAgICogQXZhaWxhYmxlIGluIGFjdGlvbnMgb25seS5cbiAgICovXG4gIENPTkZJR19QQVRIOiAnQ09ORklHX1BBVEgnLFxuXG4gIC8qKlxuICAgKiBQYXRoIHRvIHRoZSBWUyBDb2RlIHdvcmtzcGFjZSByb290IGRpcmVjdG9yeS5cbiAgICogU2V0IGJ5IHRoZSBhY3Rpb24gaGFuZGxlciAoZS5nLiwgbGF1bmNoLnRzKSB0byB0aGUgd29ya3RyZWUgcGF0aC5cbiAgICogQXZhaWxhYmxlIGluIGhvb2tzIHJ1bm5pbmcgaW5zaWRlIHRoZSBjbGF1ZGUgQ0xJLlxuICAgKi9cbiAgV09SS1NQQUNFX1BBVEg6ICdXT1JLU1BBQ0VfUEFUSCcsXG5cbiAgLyoqXG4gICAqIEFic29sdXRlIHBhdGggdG8gdGhlIG1haW4gZ2l0IHJlcG9zaXRvcnkgcm9vdCAoTk9UIGEgd29ya3RyZWUpLlxuICAgKiBTZXQgYnkgQWN0aW9uRGlzcGF0Y2hlcjsgY29uc3VtZWQgYnkgdGhlIHdyYXBwZXIgYW5kIHdhdGNoZXIgZm9yXG4gICAqIGdpdCBvcGVyYXRpb25zICh3b3JrdHJlZSByZW1vdmFsLCBicmFuY2ggZGVsZXRpb24pIHRoYXQgbXVzdCBydW5cbiAgICogYWdhaW5zdCB0aGUgbWFpbiByZXBvc2l0b3J5LlxuICAgKi9cbiAgUkVQT19ST09UOiAnUkVQT19ST09UJyxcblxuICAvKipcbiAgICogUGF0aCB0byB0aGUgY2FyZCdzIHJlcG9zaXRvcnkgZGlyZWN0b3J5LlxuICAgKiBBdmFpbGFibGUgaW4gYWN0aW9ucyBvbmx5LlxuICAgKi9cbiAgQ0FSRF9SRVBPX1BBVEg6ICdDQVJEX1JFUE9fUEFUSCcsXG5cbiAgLyoqXG4gICAqIFJlc29sdmVkIHNoZWxsIGNvbW1hbmQgZm9yIHRoZSB3cmFwcGVyIHRvIHNwYXduIGFzIHRoZSBhY3Rpb24gaGFuZGxlci5cbiAgICogU2V0IGJ5IEFjdGlvbkRpc3BhdGNoZXI7IGNvbnN1bWVkIGJ5IHRoZSB3cmFwcGVyIChub3QgYnkgYWN0aW9uIGhhbmRsZXJzKS5cbiAgICovXG4gIEFDVElPTl9DT01NQU5EOiAnQUNUSU9OX0NPTU1BTkQnLFxuXG4gIC8qKlxuICAgKiBHaXQgYnJhbmNoIHRoYXQgdGhlIGNhcmQncyB3b3Jrc3BhY2UgYnJhbmNoIHdpbGwgbWVyZ2UgaW50by5cbiAgICogUmVzb2x2ZWQgZnJvbSB0aGUgd29ya3NwYWNlIEhFQUQgYXQgbGF1bmNoIHRpbWUuXG4gICAqIFNldCBieSB0aGUgbGF1bmNoIGFjdGlvbi5cbiAgICogQXZhaWxhYmxlIGluIGFjdGlvbnMgb25seS5cbiAgICovXG4gIEJBU0VfQlJBTkNIOiAnQkFTRV9CUkFOQ0gnLFxuXG4gIC8qKlxuICAgKiBHaXQgYnJhbmNoIGZyb20gd2hpY2ggdGhlIGNhcmQncyB3b3Jrc3BhY2UgYnJhbmNoIHdhcyBjcmVhdGVkLlxuICAgKiBNYXkgZGlmZmVyIGZyb20gQkFTRV9CUkFOQ0ggd2hlbiB0aGUgd29ya3RyZWUgd2FzIGNyZWF0ZWQgYWdhaW5zdFxuICAgKiBhIGRpZmZlcmVudCByZWYgdGhhbiB0aGUgY3VycmVudCB3b3Jrc3BhY2UgSEVBRC5cbiAgICogU2V0IGJ5IHRoZSBsYXVuY2ggYWN0aW9uLlxuICAgKiBBdmFpbGFibGUgaW4gYWN0aW9ucyBvbmx5LlxuICAgKi9cbiAgUEFSRU5UX0JSQU5DSDogJ1BBUkVOVF9CUkFOQ0gnLFxuXG4gIC8qKlxuICAgKiBHaXQgYnJhbmNoIG5hbWUgZm9yIHRoZSBjYXJkJ3Mgd29ya3NwYWNlIGltcGxlbWVudGF0aW9uLlxuICAgKiBTZXQgYnkgdGhlIGxhdW5jaCBhY3Rpb24gYWZ0ZXIgcmVzb2x2aW5nIG9yIGNyZWF0aW5nIHRoZSB3b3JrdHJlZS5cbiAgICogQXZhaWxhYmxlIGluIGFjdGlvbnMgb25seS5cbiAgICovXG4gIFdPUktTUEFDRV9CUkFOQ0g6ICdXT1JLU1BBQ0VfQlJBTkNIJyxcblxuICAvKipcbiAgICogU2Vzc2lvbiBJRCBwZXJzaXN0ZWQgYnkgdGhlIHNlc3Npb24tc3RhcnQgaG9vayB2aWEgYHBlcnNpc3RFbnZWYXJgLlxuICAgKlxuICAgKiBBdmFpbGFibGUgaW4gQmFzaCB0b29sIHNoZWxsIGRlc2NlbmRhbnRzIChjb21tYW5kcywgZ2l0IGhvb2tzKSBhZnRlclxuICAgKiBzZXNzaW9uIHN0YXJ0LiBOT1QgYXZhaWxhYmxlIGluIGhvb2tzIHNwYXduZWQgZGlyZWN0bHkgYnkgQ2xhdWRlIENvZGVcbiAgICogKHN0b3AsIHNlc3Npb24tZW5kLCBldGMuKSBcdTIwMTQgdGhvc2UgcmVjZWl2ZSB0aGUgc2Vzc2lvbiBJRCB2aWEgaG9vayBpbnB1dC5cbiAgICpcbiAgICogVGhlIGNhcmQtcmVwbyBwb3N0LWNvbW1pdCBob29rIHJlYWRzIHRoaXMgdG8gcmVjb3JkIGNvbW1pdHMgZGlyZWN0bHlcbiAgICogd2l0aG91dCBuZWVkaW5nIGEgcHJvY2Vzcy10cmVlIHdhbGsgb3IgUElEIHJlZ2lzdHJ5IGxvb2t1cC5cbiAgICovXG4gIENBUkRTX1NFU1NJT05fSUQ6ICdDQVJEU19TRVNTSU9OX0lEJyxcblxuICAvKipcbiAgICogQWJzb2x1dGUgcGF0aCB0byB0aGUgVlMgQ29kZSBleHRlbnNpb24gaW5zdGFsbGF0aW9uIGRpcmVjdG9yeS5cbiAgICpcbiAgICogU2V0IGJ5IHRoZSBleHRlbnNpb24gaG9zdCBmcm9tIGBjb250ZXh0LmV4dGVuc2lvblVyaS5mc1BhdGhgIGFuZCBpbmplY3RlZFxuICAgKiBpbnRvIGFsbCBzcGF3bmVkIGFjdGlvbiBwcm9jZXNzZXMuIFVzZSB0aGlzIHRvIGxvY2F0ZSBidW5kbGVkIGFzc2V0cyBzdWNoXG4gICAqIGFzIHRoZSBydW50aW1lIHBsdWdpbiBkaXJlY3RvcnkgKGA8ZXh0ZW5zaW9uUGF0aD4vZGlzdC9wbHVnaW5zL3J1bnRpbWVgKS5cbiAgICpcbiAgICogQXZhaWxhYmxlIGluIGFjdGlvbnMgb25seSAobm90IHR5cGUgaG9va3MpLlxuICAgKi9cbiAgRVhURU5TSU9OX1BBVEg6ICdFWFRFTlNJT05fUEFUSCcsXG5cbiAgLyoqXG4gICAqIEFic29sdXRlIHBhdGggdG8gdGhlIENhcmRzIGhvb2tzIGxvZyBmaWxlLlxuICAgKlxuICAgKiBTZXQgYnkgQWN0aW9uRGlzcGF0Y2hlciBhdCBydW50aW1lLiBSZWFkIGJ5IHRoZSBMb2dnZXIgc2luZ2xldG9uXG4gICAqIGF0IGNvbnN0cnVjdGlvbiB0aW1lIHRvIGRldGVybWluZSB3aGVyZSBob29rIGV4ZWN1dGlvbiBsb2dzIGFyZSB3cml0dGVuLlxuICAgKlxuICAgKiBBdmFpbGFibGUgaW4gYWxsIGFjdGlvbnMgYW5kIHR5cGUgaG9va3MuXG4gICAqL1xuICBIT09LU19MT0dfRklMRTogJ0NBUkRTX0hPT0tTX0xPR19GSUxFJ1xufSBhcyBjb25zdDtcblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gSW5kaXZpZHVhbCBHZXR0ZXJzXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbi8qKlxuICogUmVhZHMgdGhlIGNhcmQgaWRlbnRpZmllciBmcm9tIHRoZSBlbnZpcm9ubWVudC5cbiAqXG4gKiBUaGUgZXhlY3V0aW9uIHdyYXBwZXIgYWx3YXlzIHNldHMgdGhpcyBmb3IgZXZlcnkgYWN0aW9uIGFuZCB0eXBlIGhvb2suXG4gKiBAcmV0dXJucyBUaGUgY3VycmVudCBjYXJkIElEXG4gKiBAdGhyb3dzIEVycm9yIGlmIENBUkRfSUQgaXMgbWlzc2luZyBvciBlbXB0eVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGNvbnN0IGNhcmRJZCA9IGdldENhcmRJZCgpO1xuICogY29uc29sZS5sb2coYFByb2Nlc3NpbmcgY2FyZDogJHtjYXJkSWR9YCk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldENhcmRJZCgpOiBzdHJpbmcge1xuICBjb25zdCB2YWx1ZSA9IHByb2Nlc3MuZW52W0NBUkRTX0VOVl9WQVJTLkNBUkRfSURdO1xuICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gJycpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYE1pc3NpbmcgcmVxdWlyZWQgZW52aXJvbm1lbnQgdmFyaWFibGU6ICR7Q0FSRFNfRU5WX1ZBUlMuQ0FSRF9JRH1gKTtcbiAgfVxuICByZXR1cm4gdmFsdWU7XG59XG5cbi8qKlxuICogUmVhZHMgdGhlIGVudmlyb25tZW50IG5hbWUgZnJvbSB0aGUgZW52aXJvbm1lbnQuXG4gKlxuICogVGhpcyB2YWx1ZSBtYXRjaGVzIHRoZSBlbnZpcm9ubWVudCBrZXkgaW4gc2V0dGluZ3MuanNvbiAoZS5nLiwgXCJkZWZhdWx0XCIsIFwic3RhZ2luZ1wiKS5cbiAqIEByZXR1cm5zIFRoZSBlbnZpcm9ubWVudCBuYW1lXG4gKiBAdGhyb3dzIEVycm9yIGlmIEVOVklST05NRU5UIGlzIG1pc3Npbmcgb3IgZW1wdHlcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBjb25zdCBlbnZpcm9ubWVudCA9IGdldEVudmlyb25tZW50KCk7XG4gKiBjb25zb2xlLmxvZyhgRW52aXJvbm1lbnQ6ICR7ZW52aXJvbm1lbnR9YCk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldEVudmlyb25tZW50KCk6IHN0cmluZyB7XG4gIGNvbnN0IHZhbHVlID0gcHJvY2Vzcy5lbnZbQ0FSRFNfRU5WX1ZBUlMuRU5WSVJPTk1FTlRdO1xuICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gJycpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYE1pc3NpbmcgcmVxdWlyZWQgZW52aXJvbm1lbnQgdmFyaWFibGU6ICR7Q0FSRFNfRU5WX1ZBUlMuRU5WSVJPTk1FTlR9YCk7XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG4vKipcbiAqIFJlYWRzIHRoZSBhY3Rpb24gYnV0dG9uIG5hbWUgZnJvbSB0aGUgZW52aXJvbm1lbnQuXG4gKlxuICogVGhpcyBpcyB0aGUgZGlzcGxheSBuYW1lIG9mIHRoZSBhY3Rpb24gdGhhdCB0cmlnZ2VyZWQgdGhlIGhhbmRsZXIsIG1hdGNoaW5nXG4gKiB0aGUgYGFjdGlvbk5hbWVgIGZpZWxkIGZyb20gYGRlZmluZUFjdGlvbmAuXG4gKiBAcmV0dXJucyBEaXNwbGF5IG5hbWUgb2YgdGhlIGFjdGlvbiB0aGF0IHRyaWdnZXJlZCB0aGUgY3VycmVudCBoYW5kbGVyIHJ1bi5cbiAqIEB0aHJvd3MgRXJyb3IgaWYgQUNUSU9OX05BTUUgaXMgbWlzc2luZyBvciBlbXB0eVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGNvbnN0IGFjdGlvbk5hbWUgPSBnZXRBY3Rpb25OYW1lKCk7XG4gKiBjb25zb2xlLmxvZyhgUnVubmluZyBhY3Rpb246ICR7YWN0aW9uTmFtZX1gKTtcbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0QWN0aW9uTmFtZSgpOiBzdHJpbmcge1xuICBjb25zdCB2YWx1ZSA9IHByb2Nlc3MuZW52W0NBUkRTX0VOVl9WQVJTLkFDVElPTl9OQU1FXTtcbiAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQgfHwgdmFsdWUgPT09ICcnKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIHJlcXVpcmVkIGVudmlyb25tZW50IHZhcmlhYmxlOiAke0NBUkRTX0VOVl9WQVJTLkFDVElPTl9OQU1FfWApO1xuICB9XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuLyoqXG4gKiBSZWFkcyB0aGUgZXhlY3V0aW9uIG1vZGUgZnJvbSB0aGUgZW52aXJvbm1lbnQuXG4gKlxuICogRGV0ZXJtaW5lcyB0aGUgVUkgaW50ZXJhY3Rpb24gbW9kZWwgZm9yIGFjdGlvbnMuXG4gKiBAcmV0dXJucyBUaGUgZXhlY3V0aW9uIG1vZGUgKCdpbnRlcmFjdGl2ZScgb3IgJ2JhY2tncm91bmQnKVxuICogQHRocm93cyBFcnJvciBpZiBFWEVDVVRJT05fTU9ERSBpcyBtaXNzaW5nLCBlbXB0eSwgb3IgaW52YWxpZFxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGNvbnN0IG1vZGUgPSBnZXRFeGVjdXRpb25Nb2RlKCk7XG4gKiBpZiAobW9kZSA9PT0gJ2ludGVyYWN0aXZlJykge1xuICogICAvLyBTaG93IHVzZXIgcHJvbXB0c1xuICogfVxuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRFeGVjdXRpb25Nb2RlKCk6ICdpbnRlcmFjdGl2ZScgfCAnYmFja2dyb3VuZCcge1xuICBjb25zdCB2YWx1ZSA9IHByb2Nlc3MuZW52W0NBUkRTX0VOVl9WQVJTLkVYRUNVVElPTl9NT0RFXTtcbiAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQgfHwgdmFsdWUgPT09ICcnKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIHJlcXVpcmVkIGVudmlyb25tZW50IHZhcmlhYmxlOiAke0NBUkRTX0VOVl9WQVJTLkVYRUNVVElPTl9NT0RFfWApO1xuICB9XG4gIGlmICh2YWx1ZSAhPT0gJ2ludGVyYWN0aXZlJyAmJiB2YWx1ZSAhPT0gJ2JhY2tncm91bmQnKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBJbnZhbGlkICR7Q0FSRFNfRU5WX1ZBUlMuRVhFQ1VUSU9OX01PREV9OiBleHBlY3RlZCAnaW50ZXJhY3RpdmUnIG9yICdiYWNrZ3JvdW5kJywgZ290IFwiJHt2YWx1ZX1cImApO1xuICB9XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuLyoqXG4gKiBSZWFkcyB0aGUgQVBJIGJhc2UgVVJMIGZyb20gdGhlIGVudmlyb25tZW50LlxuICpcbiAqIFVzZSB0aGlzIGFzIHRoZSBiYXNlIGZvciBjb25zdHJ1Y3RpbmcgQVBJIGVuZHBvaW50cy4gVGhlIFVSTCBkb2VzIG5vdCBpbmNsdWRlXG4gKiBhIHRyYWlsaW5nIHNsYXNoLlxuICogQHJldHVybnMgQmFzZSBVUkwgdXNlZCB0byBjb25zdHJ1Y3QgQ2FyZHMgQVBJIGVuZHBvaW50cyBmb3IgdGhpcyBleGVjdXRpb24uXG4gKiBAdGhyb3dzIEVycm9yIGlmIEFQSV9CQVNFX1VSTCBpcyBtaXNzaW5nIG9yIGVtcHR5XG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogY29uc3QgYXBpVXJsID0gZ2V0QXBpQmFzZVVybCgpO1xuICogY29uc3QgZW5kcG9pbnQgPSBgJHthcGlVcmx9L2NhcmRzLyR7Y2FyZElkfWA7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldEFwaUJhc2VVcmwoKTogc3RyaW5nIHtcbiAgY29uc3QgdmFsdWUgPSBwcm9jZXNzLmVudltDQVJEU19FTlZfVkFSUy5BUElfQkFTRV9VUkxdO1xuICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gJycpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYE1pc3NpbmcgcmVxdWlyZWQgZW52aXJvbm1lbnQgdmFyaWFibGU6ICR7Q0FSRFNfRU5WX1ZBUlMuQVBJX0JBU0VfVVJMfWApO1xuICB9XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuLyoqXG4gKiBSZWFkcyB0aGUgQVBJIGFjY2VzcyB0b2tlbiBmcm9tIHRoZSBlbnZpcm9ubWVudC5cbiAqXG4gKiBCZWFyZXIgdG9rZW4gdmFsaWQgZm9yIHRoZSBkdXJhdGlvbiBvZiB0aGlzIGFjdGlvbiBvciB0eXBlIGhvb2sgZXhlY3V0aW9uLlxuICogSW5jbHVkZSBpbiBBdXRob3JpemF0aW9uIGhlYWRlcnMgd2hlbiBjYWxsaW5nIHRoZSBDYXJkcyBBUEkuXG4gKiBAcmV0dXJucyBCZWFyZXIgdG9rZW4gdGhhdCBhdXRob3JpemVzIEFQSSByZXF1ZXN0cyBmb3IgdGhpcyBleGVjdXRpb24gY29udGV4dC5cbiAqIEB0aHJvd3MgRXJyb3IgaWYgQVBJX0FDQ0VTU19UT0tFTiBpcyBtaXNzaW5nIG9yIGVtcHR5XG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogY29uc3QgdG9rZW4gPSBnZXRBcGlBY2Nlc3NUb2tlbigpO1xuICogY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBmZXRjaChhcGlVcmwsIHtcbiAqICAgaGVhZGVyczogeyBBdXRob3JpemF0aW9uOiBgQmVhcmVyICR7dG9rZW59YCB9XG4gKiB9KTtcbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0QXBpQWNjZXNzVG9rZW4oKTogc3RyaW5nIHtcbiAgY29uc3QgdmFsdWUgPSBwcm9jZXNzLmVudltDQVJEU19FTlZfVkFSUy5BUElfQUNDRVNTX1RPS0VOXTtcbiAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQgfHwgdmFsdWUgPT09ICcnKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIHJlcXVpcmVkIGVudmlyb25tZW50IHZhcmlhYmxlOiAke0NBUkRTX0VOVl9WQVJTLkFQSV9BQ0NFU1NfVE9LRU59YCk7XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG4vKipcbiAqIFJlYWRzIHRoZSBjb25maWd1cmVkIGNvZGluZyBhZ2VudCBpZGVudGlmaWVyIGZyb20gdGhlIGVudmlyb25tZW50LlxuICpcbiAqIE9wdGlvbmFsIHZhbHVlIGZyb20gY2FyZHMuY29kaW5nQWdlbnQgc2V0dGluZy4gV2hlbiBzZXQsIGluZGljYXRlcyB3aGljaCBBSVxuICogY29kaW5nIGFzc2lzdGFudCB0aGUgdXNlciBwcmVmZXJzLiBBY3Rpb25zIGNhbiB1c2UgdGhpcyB0byBjdXN0b21pemUgYmVoYXZpb3JcbiAqIG9yIHByb21wdHMgZm9yIGRpZmZlcmVudCBhZ2VudHMuXG4gKiBAcmV0dXJucyBUaGUgY29kaW5nIGFnZW50IGlkZW50aWZpZXIsIG9yIHVuZGVmaW5lZCBpZiBub3Qgc2V0XG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogY29uc3QgY29kaW5nQWdlbnQgPSBnZXRDb2RpbmdBZ2VudCgpO1xuICogaWYgKGNvZGluZ0FnZW50ID09PSAnY2xhdWRlJykge1xuICogICAvLyBDdXN0b21pemUgZm9yIENsYXVkZVxuICogfVxuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRDb2RpbmdBZ2VudCgpOiBzdHJpbmcgfCB1bmRlZmluZWQge1xuICBjb25zdCB2YWx1ZSA9IHByb2Nlc3MuZW52W0NBUkRTX0VOVl9WQVJTLkNPRElOR19BR0VOVF07XG4gIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IHZhbHVlID09PSAnJykge1xuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG4vKipcbiAqIFJlYWRzIHRoZSByZWdpc3RlcmVkIHR5cGUgbmFtZSBmb3IgdHlwZSBob29rcy5cbiAqXG4gKiBUaGlzIHZhbHVlIGlzIG9ubHkgcHJlc2VudCBmb3IgdHlwZSBob29rIGV2ZW50cy5cbiAqIEByZXR1cm5zIFRoZSByZWdpc3RlcmVkIHR5cGUgbmFtZVxuICogQHRocm93cyBFcnJvciBpZiBUWVBFX05BTUUgaXMgbWlzc2luZyBvciBlbXB0eVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGNvbnN0IHR5cGVOYW1lID0gZ2V0VHlwZU5hbWUoKTtcbiAqIGNvbnNvbGUubG9nKGBUeXBlOiAke3R5cGVOYW1lfWApO1xuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRUeXBlTmFtZSgpOiBzdHJpbmcge1xuICBjb25zdCB2YWx1ZSA9IHByb2Nlc3MuZW52W0NBUkRTX0VOVl9WQVJTLlRZUEVfTkFNRV07XG4gIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IHZhbHVlID09PSAnJykge1xuICAgIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyByZXF1aXJlZCBlbnZpcm9ubWVudCB2YXJpYWJsZTogJHtDQVJEU19FTlZfVkFSUy5UWVBFX05BTUV9YCk7XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG4vKipcbiAqIFJlYWRzIHRoZSB0eXBlIHZlcnNpb24gZnJvbSB0aGUgZW52aXJvbm1lbnQuXG4gKlxuICogVGhpcyB2ZXJzaW9uIGNvbWVzIGZyb20gdGhlIHR5cGUgY29uZmlndXJhdGlvbiBpbiBzZXR0aW5ncy5qc29uLlxuICogQHJldHVybnMgVGhlIHZlcnNpb24gc3RyaW5nIGZyb20gdHlwZSBjb25maWdcbiAqIEB0aHJvd3MgRXJyb3IgaWYgVFlQRV9WRVJTSU9OIGlzIG1pc3Npbmcgb3IgZW1wdHlcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBjb25zdCB2ZXJzaW9uID0gZ2V0VHlwZVZlcnNpb24oKTtcbiAqIGNvbnNvbGUubG9nKGBWZXJzaW9uOiAke3ZlcnNpb259YCk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldFR5cGVWZXJzaW9uKCk6IHN0cmluZyB7XG4gIGNvbnN0IHZhbHVlID0gcHJvY2Vzcy5lbnZbQ0FSRFNfRU5WX1ZBUlMuVFlQRV9WRVJTSU9OXTtcbiAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQgfHwgdmFsdWUgPT09ICcnKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIHJlcXVpcmVkIGVudmlyb25tZW50IHZhcmlhYmxlOiAke0NBUkRTX0VOVl9WQVJTLlRZUEVfVkVSU0lPTn1gKTtcbiAgfVxuICByZXR1cm4gdmFsdWU7XG59XG5cbi8qKlxuICogUmVhZHMgdGhlIHR5cGVkIGZpbGUgbmFtZSBmb3IgdHlwZSBob29rIGV2ZW50cy5cbiAqXG4gKiBUaGlzIGlzIHRoZSBmaWxlIG5hbWUgcmVsYXRpdmUgdG8gdGhlIHR5cGUgZGlyZWN0b3J5LCBub3QgYSBmdWxsIHBhdGguXG4gKiBAcmV0dXJucyBUaGUgZmlsZSBuYW1lIHdpdGhpbiB0aGUgdHlwZSBkaXJlY3RvcnlcbiAqIEB0aHJvd3MgRXJyb3IgaWYgRklMRV9OQU1FIGlzIG1pc3Npbmcgb3IgZW1wdHlcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBjb25zdCBmaWxlTmFtZSA9IGdldEZpbGVOYW1lKCk7XG4gKiBjb25zb2xlLmxvZyhgRmlsZTogJHtmaWxlTmFtZX1gKTtcbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0RmlsZU5hbWUoKTogc3RyaW5nIHtcbiAgY29uc3QgdmFsdWUgPSBwcm9jZXNzLmVudltDQVJEU19FTlZfVkFSUy5GSUxFX05BTUVdO1xuICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gJycpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYE1pc3NpbmcgcmVxdWlyZWQgZW52aXJvbm1lbnQgdmFyaWFibGU6ICR7Q0FSRFNfRU5WX1ZBUlMuRklMRV9OQU1FfWApO1xuICB9XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuLyoqXG4gKiBSZWFkcyB0aGUgYWJzb2x1dGUgcGF0aCB0byB0aGUgdHlwZWQgZmlsZS5cbiAqXG4gKiBUaGlzIGlzIHRoZSBmdWxseSByZXNvbHZlZCBwYXRoIG9uIGRpc2sgcHJvdmlkZWQgYnkgdGhlIGV4ZWN1dGlvbiB3cmFwcGVyLlxuICogQHJldHVybnMgVGhlIGZ1bGwgcGF0aCB0byB0aGUgZmlsZVxuICogQHRocm93cyBFcnJvciBpZiBGSUxFX1BBVEggaXMgbWlzc2luZyBvciBlbXB0eVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGNvbnN0IGZpbGVQYXRoID0gZ2V0RmlsZVBhdGgoKTtcbiAqIGNvbnNvbGUubG9nKGBQYXRoOiAke2ZpbGVQYXRofWApO1xuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRGaWxlUGF0aCgpOiBzdHJpbmcge1xuICBjb25zdCB2YWx1ZSA9IHByb2Nlc3MuZW52W0NBUkRTX0VOVl9WQVJTLkZJTEVfUEFUSF07XG4gIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IHZhbHVlID09PSAnJykge1xuICAgIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyByZXF1aXJlZCBlbnZpcm9ubWVudCB2YXJpYWJsZTogJHtDQVJEU19FTlZfVkFSUy5GSUxFX1BBVEh9YCk7XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG4vKipcbiAqIFJlYWRzIHRoZSB0eXBlZCBmaWxlIHNpemUgZnJvbSB0aGUgZW52aXJvbm1lbnQuXG4gKlxuICogVGhlIHZhbHVlIGlzIHBhcnNlZCBhcyBhIGJhc2UtMTAgaW50ZWdlci5cbiAqIEByZXR1cm5zIFRoZSBmaWxlIHNpemUgaW4gYnl0ZXNcbiAqIEB0aHJvd3MgRXJyb3IgaWYgRklMRV9TSVpFIGlzIG1pc3Npbmcgb3Igbm90IGEgbnVtYmVyXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogY29uc3Qgc2l6ZSA9IGdldEZpbGVTaXplKCk7XG4gKiBjb25zb2xlLmxvZyhgU2l6ZTogJHtzaXplfSBieXRlc2ApO1xuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRGaWxlU2l6ZSgpOiBudW1iZXIge1xuICBjb25zdCB2YWx1ZSA9IHByb2Nlc3MuZW52W0NBUkRTX0VOVl9WQVJTLkZJTEVfU0laRV07XG4gIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IHZhbHVlID09PSAnJykge1xuICAgIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyByZXF1aXJlZCBlbnZpcm9ubWVudCB2YXJpYWJsZTogJHtDQVJEU19FTlZfVkFSUy5GSUxFX1NJWkV9YCk7XG4gIH1cbiAgY29uc3Qgc2l6ZSA9IE51bWJlci5wYXJzZUludCh2YWx1ZSwgMTApO1xuICBpZiAoTnVtYmVyLmlzTmFOKHNpemUpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBJbnZhbGlkICR7Q0FSRFNfRU5WX1ZBUlMuRklMRV9TSVpFfTogZXhwZWN0ZWQgbnVtYmVyLCBnb3QgXCIke3ZhbHVlfVwiYCk7XG4gIH1cbiAgcmV0dXJuIHNpemU7XG59XG5cbi8qKlxuICogUmVhZHMgdGhlIFNIQTI1NiBoYXNoIGZvciB0aGUgdHlwZWQgZmlsZSBjb250ZW50LlxuICpcbiAqIFVzZWZ1bCBmb3IgZGV0ZWN0aW5nIGNvbnRlbnQgY2hhbmdlcyB3aXRob3V0IHJlYWRpbmcgdGhlIGZpbGUgYWdhaW4uXG4gKiBAcmV0dXJucyBUaGUgU0hBMjU2IGhhc2ggb2YgdGhlIGNvbnRlbnRcbiAqIEB0aHJvd3MgRXJyb3IgaWYgU0hBMjU2IGlzIG1pc3Npbmcgb3IgZW1wdHlcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBjb25zdCBoYXNoID0gZ2V0U2hhMjU2KCk7XG4gKiBjb25zb2xlLmxvZyhgSGFzaDogJHtoYXNofWApO1xuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRTaGEyNTYoKTogc3RyaW5nIHtcbiAgY29uc3QgdmFsdWUgPSBwcm9jZXNzLmVudltDQVJEU19FTlZfVkFSUy5TSEEyNTZdO1xuICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gJycpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYE1pc3NpbmcgcmVxdWlyZWQgZW52aXJvbm1lbnQgdmFyaWFibGU6ICR7Q0FSRFNfRU5WX1ZBUlMuU0hBMjU2fWApO1xuICB9XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuLyoqXG4gKiBSZWFkcyB0aGUgTUlNRSB0eXBlIGZvciB0aGUgdHlwZWQgZmlsZSBjb250ZW50LlxuICpcbiAqIFByb3ZpZGVkIGZvciB0eXBlIGhvb2sgZXZlbnRzIHNvIHZhbGlkYXRvcnMgY2FuIGJyYW5jaCBvbiBjb250ZW50IHR5cGUuXG4gKiBAcmV0dXJucyBUaGUgTUlNRSB0eXBlIG9mIHRoZSBjb250ZW50XG4gKiBAdGhyb3dzIEVycm9yIGlmIENPTlRFTlRfVFlQRSBpcyBtaXNzaW5nIG9yIGVtcHR5XG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogY29uc3QgY29udGVudFR5cGUgPSBnZXRDb250ZW50VHlwZSgpO1xuICogY29uc29sZS5sb2coYENvbnRlbnQgdHlwZTogJHtjb250ZW50VHlwZX1gKTtcbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0Q29udGVudFR5cGUoKTogc3RyaW5nIHtcbiAgY29uc3QgdmFsdWUgPSBwcm9jZXNzLmVudltDQVJEU19FTlZfVkFSUy5DT05URU5UX1RZUEVdO1xuICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gJycpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYE1pc3NpbmcgcmVxdWlyZWQgZW52aXJvbm1lbnQgdmFyaWFibGU6ICR7Q0FSRFNfRU5WX1ZBUlMuQ09OVEVOVF9UWVBFfWApO1xuICB9XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuLyoqXG4gKiBSZWFkcyB0aGUgVlMgQ29kZSBidW5kbGVkIE5vZGUuanMgaW50ZXJwcmV0ZXIgcGF0aCBmcm9tIHRoZSBlbnZpcm9ubWVudC5cbiAqXG4gKiBUaGlzIGlzIHNldCBieSB0aGUgZXh0ZW5zaW9uIGR1cmluZyBhY3RpdmF0aW9uIGFuZCBpbmplY3RlZCBpbnRvIGFsbFxuICogc3Bhd25lZCBhY3Rpb24vaG9vayBwcm9jZXNzZXMuIENvbmZpZ3VyYXRpb24gYXV0aG9ycyBjYW4gdXNlIGl0IHRvIGludm9rZVxuICogTm9kZS5qcyB3aXRob3V0IHJlbHlpbmcgb24gdGhlIHN5c3RlbSBQQVRILlxuICpcbiAqIEByZXR1cm5zIFRoZSBwYXRoIHRvIHRoZSBOb2RlLmpzIGludGVycHJldGVyXG4gKiBAdGhyb3dzIEVycm9yIGlmIFZTQ09ERV9OT0RFIGlzIG1pc3Npbmcgb3IgZW1wdHlcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBjb25zdCBub2RlUGF0aCA9IGdldFZzY29kZU5vZGVQYXRoKCk7XG4gKiBleGVjRmlsZVN5bmMobm9kZVBhdGgsIFsnc2NyaXB0LmpzJ10pO1xuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRWc2NvZGVOb2RlUGF0aCgpOiBzdHJpbmcge1xuICBjb25zdCB2YWx1ZSA9IHByb2Nlc3MuZW52W0NBUkRTX0VOVl9WQVJTLlZTQ09ERV9OT0RFXTtcbiAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQgfHwgdmFsdWUgPT09ICcnKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIHJlcXVpcmVkIGVudmlyb25tZW50IHZhcmlhYmxlOiAke0NBUkRTX0VOVl9WQVJTLlZTQ09ERV9OT0RFfWApO1xuICB9XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuLyoqXG4gKiBSZWFkcyB0aGUgVW5peCBkb21haW4gc29ja2V0IHBhdGggZm9yIHJ1bnRpbWUtdG8tZGlzcGF0Y2hlciBjb21tdW5pY2F0aW9uLlxuICpcbiAqIEByZXR1cm5zIFVuaXggc29ja2V0IHBhdGggdXNlZCB0byBzZW5kIHJ1bnRpbWUgY29udHJvbCBtZXNzYWdlcy5cbiAqIEB0aHJvd3MgRXJyb3IgaWYgU09DS0VUX1BBVEggaXMgbWlzc2luZyBvciBlbXB0eVxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0U29ja2V0UGF0aCgpOiBzdHJpbmcge1xuICBjb25zdCB2YWx1ZSA9IHByb2Nlc3MuZW52W0NBUkRTX0VOVl9WQVJTLlNPQ0tFVF9QQVRIXTtcbiAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQgfHwgdmFsdWUgPT09ICcnKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIHJlcXVpcmVkIGVudmlyb25tZW50IHZhcmlhYmxlOiAke0NBUkRTX0VOVl9WQVJTLlNPQ0tFVF9QQVRIfWApO1xuICB9XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuLyoqXG4gKiBSZWFkcyB0aGUgcGF0aCB0byB0aGUgc3dpdGNoVG9JbnRlcmFjdGl2ZSBkYXRhIGZpbGUuXG4gKlxuICogVGhpcyBpcyBvcHRpb25hbCBcdTIwMTQgcmV0dXJucyB1bmRlZmluZWQgd2hlbiBub3Qgc2V0IChpLmUuLCB0aGUgYWN0aW9uXG4gKiB3YXMgbm90IHJlbGF1bmNoZWQgdmlhIHN3aXRjaFRvSW50ZXJhY3RpdmUpLlxuICpcbiAqIEByZXR1cm5zIFRoZSBmaWxlIHBhdGgsIG9yIHVuZGVmaW5lZCBpZiBub3Qgc2V0XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRTd2l0Y2hUb0ludGVyYWN0aXZlRGF0YVBhdGgoKTogc3RyaW5nIHwgdW5kZWZpbmVkIHtcbiAgY29uc3QgdmFsdWUgPSBwcm9jZXNzLmVudltDQVJEU19FTlZfVkFSUy5TV0lUQ0hfVE9fSU5URVJBQ1RJVkVfREFUQV9QQVRIXTtcbiAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQgfHwgdmFsdWUgPT09ICcnKSB7XG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfVxuICByZXR1cm4gdmFsdWU7XG59XG5cbi8qKlxuICogUmVhZHMgdGhlIHNldHRpbmdzIGNvbmZpZ3VyYXRpb24gZGlyZWN0b3J5IHBhdGguXG4gKlxuICogQHJldHVybnMgQWJzb2x1dGUgcGF0aCB0byB0aGUgZGlyZWN0b3J5IGNvbnRhaW5pbmcgZ2VuZXJhdGVkIHNldHRpbmdzIGFydGlmYWN0cy5cbiAqIEB0aHJvd3MgRXJyb3IgaWYgQ09ORklHX1BBVEggaXMgbWlzc2luZyBvciBlbXB0eVxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0Q29uZmlnUGF0aCgpOiBzdHJpbmcge1xuICBjb25zdCB2YWx1ZSA9IHByb2Nlc3MuZW52W0NBUkRTX0VOVl9WQVJTLkNPTkZJR19QQVRIXTtcbiAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQgfHwgdmFsdWUgPT09ICcnKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIHJlcXVpcmVkIGVudmlyb25tZW50IHZhcmlhYmxlOiAke0NBUkRTX0VOVl9WQVJTLkNPTkZJR19QQVRIfWApO1xuICB9XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuLyoqXG4gKiBSZWFkcyB0aGUgd29ya3NwYWNlIHBhdGggc2V0IGJ5IHRoZSBhY3Rpb24gaGFuZGxlciAoZS5nLiwgdGhlIHdvcmt0cmVlIHBhdGgpLlxuICpcbiAqIFRoaXMgaXMgZm9yIGhvb2tzIHJ1bm5pbmcgaW5zaWRlIHRoZSBDbGF1ZGUgQ0xJLCAqKm5vdCoqIGZvciBhY3Rpb24gaGFuZGxlcnMuXG4gKiBBY3Rpb24gaGFuZGxlcnMgc2hvdWxkIHVzZSB7QGxpbmsgZ2V0UmVwb1Jvb3R9IGluc3RlYWQuXG4gKlxuICogQHJldHVybnMgQWJzb2x1dGUgcGF0aCB0byB0aGUgYWN0aXZlIHdvcmtzcGFjZSAvIHdvcmt0cmVlLlxuICogQHRocm93cyBFcnJvciBpZiBXT1JLU1BBQ0VfUEFUSCBpcyBtaXNzaW5nIG9yIGVtcHR5XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRXb3Jrc3BhY2VQYXRoKCk6IHN0cmluZyB7XG4gIGNvbnN0IHZhbHVlID0gcHJvY2Vzcy5lbnZbQ0FSRFNfRU5WX1ZBUlMuV09SS1NQQUNFX1BBVEhdO1xuICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gJycpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYE1pc3NpbmcgcmVxdWlyZWQgZW52aXJvbm1lbnQgdmFyaWFibGU6ICR7Q0FSRFNfRU5WX1ZBUlMuV09SS1NQQUNFX1BBVEh9YCk7XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG4vKipcbiAqIFJlYWRzIHRoZSBtYWluIGdpdCByZXBvc2l0b3J5IHJvb3QgcGF0aC5cbiAqXG4gKiBTZXQgYnkgQWN0aW9uRGlzcGF0Y2hlcjsgdXNlZCBieSBhY3Rpb24gaGFuZGxlcnMgdG8gcmVzb2x2ZSB3b3JrdHJlZXNcbiAqIGFuZCBwZXJmb3JtIGdpdCBvcGVyYXRpb25zIGFnYWluc3QgdGhlIG1haW4gcmVwb3NpdG9yeS5cbiAqXG4gKiBAcmV0dXJucyBBYnNvbHV0ZSBwYXRoIHRvIHRoZSBtYWluIGdpdCByZXBvc2l0b3J5IHJvb3QgKE5PVCBhIHdvcmt0cmVlKS5cbiAqIEB0aHJvd3MgRXJyb3IgaWYgUkVQT19ST09UIGlzIG1pc3Npbmcgb3IgZW1wdHlcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldFJlcG9Sb290KCk6IHN0cmluZyB7XG4gIGNvbnN0IHZhbHVlID0gcHJvY2Vzcy5lbnZbQ0FSRFNfRU5WX1ZBUlMuUkVQT19ST09UXTtcbiAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQgfHwgdmFsdWUgPT09ICcnKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIHJlcXVpcmVkIGVudmlyb25tZW50IHZhcmlhYmxlOiAke0NBUkRTX0VOVl9WQVJTLlJFUE9fUk9PVH1gKTtcbiAgfVxuICByZXR1cm4gdmFsdWU7XG59XG5cbi8qKlxuICogUmVhZHMgdGhlIGNhcmQncyByZXBvc2l0b3J5IGRpcmVjdG9yeSBwYXRoLlxuICpcbiAqIEByZXR1cm5zIEFic29sdXRlIHBhdGggdG8gdGhlIHJlcG9zaXRvcnkgYXNzb2NpYXRlZCB3aXRoIHRoZSBhY3RpdmUgY2FyZC5cbiAqIEB0aHJvd3MgRXJyb3IgaWYgQ0FSRF9SRVBPX1BBVEggaXMgbWlzc2luZyBvciBlbXB0eVxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0Q2FyZFJlcG9QYXRoKCk6IHN0cmluZyB7XG4gIGNvbnN0IHZhbHVlID0gcHJvY2Vzcy5lbnZbQ0FSRFNfRU5WX1ZBUlMuQ0FSRF9SRVBPX1BBVEhdO1xuICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gJycpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYE1pc3NpbmcgcmVxdWlyZWQgZW52aXJvbm1lbnQgdmFyaWFibGU6ICR7Q0FSRFNfRU5WX1ZBUlMuQ0FSRF9SRVBPX1BBVEh9YCk7XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG4vKipcbiAqIFJlYWRzIHRoZSBWUyBDb2RlIGV4dGVuc2lvbiBpbnN0YWxsYXRpb24gZGlyZWN0b3J5IHBhdGguXG4gKlxuICogU2V0IGJ5IHRoZSBleHRlbnNpb24gaG9zdCBmcm9tIGBjb250ZXh0LmV4dGVuc2lvblVyaS5mc1BhdGhgIGFuZCBpbmplY3RlZFxuICogaW50byBhbGwgc3Bhd25lZCBhY3Rpb24gcHJvY2Vzc2VzLiBVc2UgdGhpcyB0byBsb2NhdGUgYnVuZGxlZCBhc3NldHMgc3VjaFxuICogYXMgdGhlIHJ1bnRpbWUgcGx1Z2luIGRpcmVjdG9yeSAoYDxleHRlbnNpb25QYXRoPi9kaXN0L3BsdWdpbnMvcnVudGltZWApLlxuICpcbiAqIEByZXR1cm5zIEFic29sdXRlIHBhdGggdG8gdGhlIGV4dGVuc2lvbiBpbnN0YWxsYXRpb24gZGlyZWN0b3J5LlxuICogQHRocm93cyBFcnJvciBpZiBFWFRFTlNJT05fUEFUSCBpcyBtaXNzaW5nIG9yIGVtcHR5XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRFeHRlbnNpb25QYXRoKCk6IHN0cmluZyB7XG4gIGNvbnN0IHZhbHVlID0gcHJvY2Vzcy5lbnZbQ0FSRFNfRU5WX1ZBUlMuRVhURU5TSU9OX1BBVEhdO1xuICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gJycpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYE1pc3NpbmcgcmVxdWlyZWQgZW52aXJvbm1lbnQgdmFyaWFibGU6ICR7Q0FSRFNfRU5WX1ZBUlMuRVhURU5TSU9OX1BBVEh9YCk7XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG4vKipcbiAqIFJlYWRzIGFuZCBwYXJzZXMgdGhlIHN3aXRjaFRvSW50ZXJhY3RpdmUgZGF0YSBmaWxlLlxuICpcbiAqIFdoZW4gYFNXSVRDSF9UT19JTlRFUkFDVElWRV9EQVRBX1BBVEhgIGlzIHNldCwgcmVhZHMgdGhlIGZpbGUgYXQgdGhhdCBwYXRoXG4gKiBhbmQgcGFyc2VzIGl0IGFzIEpTT04uIFJldHVybnMgdW5kZWZpbmVkIGlmIHRoZSBlbnYgdmFyIGlzIG5vdCBzZXQuXG4gKlxuICogQHJldHVybnMgVGhlIHBhcnNlZCBkYXRhLCBvciB1bmRlZmluZWQgaWYgdGhlIHBhdGggaXMgbm90IHNldFxuICogQHRocm93cyBFcnJvciBpZiB0aGUgZmlsZSBjYW5ub3QgYmUgcmVhZCBvciBjb250YWlucyBpbnZhbGlkIEpTT05cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJlYWRTd2l0Y2hUb0ludGVyYWN0aXZlRGF0YSgpOiB1bmtub3duIHwgdW5kZWZpbmVkIHtcbiAgY29uc3QgZGF0YVBhdGggPSBnZXRTd2l0Y2hUb0ludGVyYWN0aXZlRGF0YVBhdGgoKTtcbiAgaWYgKGRhdGFQYXRoID09PSB1bmRlZmluZWQpIHtcbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9XG4gIGNvbnN0IGNvbnRlbnQgPSByZWFkRmlsZVN5bmMoZGF0YVBhdGgsICd1dGYtOCcpO1xuICByZXR1cm4gSlNPTi5wYXJzZShjb250ZW50KTtcbn1cblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gVHlwZWQgSW5wdXQgRXh0cmFjdGlvblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4vKipcbiAqIEJ1aWxkcyBhIHR5cGVkIGFjdGlvbiBpbnB1dCBvYmplY3QgZnJvbSBlbnZpcm9ubWVudCB2YXJpYWJsZXMuXG4gKlxuICogRXh0cmFjdHMgYWxsIGZpZWxkcyByZXF1aXJlZCBmb3IgYWN0aW9uIGhhbmRsZXJzLlxuICpcbiAqIEByZXR1cm5zIFR5cGVkIEFjdGlvbklucHV0IG9iamVjdFxuICogQHRocm93cyBFcnJvciBpZiByZXF1aXJlZCBlbnYgdmFycyBhcmUgbWlzc2luZyBvciBpbnZhbGlkXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogLy8gRm9yIGFuIGFjdGlvbiBoYW5kbGVyXG4gKiBjb25zdCBpbnB1dCA9IGV4dHJhY3RBY3Rpb25JbnB1dCgpO1xuICogY29uc29sZS5sb2coaW5wdXQuY2FyZElkKTtcbiAqIGNvbnNvbGUubG9nKGlucHV0LmV4ZWN1dGlvbk1vZGUpO1xuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBleHRyYWN0QWN0aW9uSW5wdXQoKTogQWN0aW9uSW5wdXQge1xuICByZXR1cm4ge1xuICAgIGNhcmRJZDogZ2V0Q2FyZElkKCksXG4gICAgYWN0aW9uTmFtZTogZ2V0QWN0aW9uTmFtZSgpLFxuICAgIGVudmlyb25tZW50OiBnZXRFbnZpcm9ubWVudCgpLFxuICAgIGV4ZWN1dGlvbk1vZGU6IGdldEV4ZWN1dGlvbk1vZGUoKSxcbiAgICBhcGlCYXNlVXJsOiBnZXRBcGlCYXNlVXJsKCksXG4gICAgYXBpQWNjZXNzVG9rZW46IGdldEFwaUFjY2Vzc1Rva2VuKCksXG4gICAgY29kaW5nQWdlbnQ6IGdldENvZGluZ0FnZW50KCksXG4gICAgc3dpdGNoVG9JbnRlcmFjdGl2ZURhdGE6IHJlYWRTd2l0Y2hUb0ludGVyYWN0aXZlRGF0YSgpLFxuICAgIHJlcG9Sb290OiBnZXRSZXBvUm9vdCgpLFxuICAgIGNhcmRSZXBvUGF0aDogZ2V0Q2FyZFJlcG9QYXRoKCksXG4gICAgY29uZmlnUGF0aDogZ2V0Q29uZmlnUGF0aCgpLFxuICAgIGV4dGVuc2lvblBhdGg6IGdldEV4dGVuc2lvblBhdGgoKVxuICB9O1xufVxuXG4vKipcbiAqIEJ1aWxkcyBhIHR5cGVkIHR5cGUgaG9vayBpbnB1dCBvYmplY3QgZnJvbSBlbnZpcm9ubWVudCB2YXJpYWJsZXMuXG4gKlxuICogRXh0cmFjdHMgYWxsIGZpZWxkcyByZXF1aXJlZCBmb3IgdHlwZSBsaWZlY3ljbGUgaG9va3MgKHZhbGlkYXRvciwgY3JlYXRlLFxuICogdXBkYXRlLCBkZWxldGUpLlxuICpcbiAqIEByZXR1cm5zIFR5cGVkIFR5cGVIb29rSW5wdXQgb2JqZWN0XG4gKiBAdGhyb3dzIEVycm9yIGlmIHJlcXVpcmVkIGVudiB2YXJzIGFyZSBtaXNzaW5nIG9yIGludmFsaWRcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiAvLyBGb3IgYSB0eXBlIGhvb2sgaGFuZGxlclxuICogY29uc3QgaW5wdXQgPSBleHRyYWN0VHlwZUlucHV0KCk7XG4gKiBjb25zb2xlLmxvZyhpbnB1dC50eXBlTmFtZSk7XG4gKiBjb25zb2xlLmxvZyhpbnB1dC5maWxlTmFtZSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGV4dHJhY3RUeXBlSW5wdXQoKTogVHlwZUhvb2tJbnB1dCB7XG4gIHJldHVybiB7XG4gICAgY2FyZElkOiBnZXRDYXJkSWQoKSxcbiAgICBlbnZpcm9ubWVudDogZ2V0RW52aXJvbm1lbnQoKSxcbiAgICB0eXBlTmFtZTogZ2V0VHlwZU5hbWUoKSxcbiAgICB0eXBlVmVyc2lvbjogZ2V0VHlwZVZlcnNpb24oKSxcbiAgICBmaWxlTmFtZTogZ2V0RmlsZU5hbWUoKSxcbiAgICBmaWxlUGF0aDogZ2V0RmlsZVBhdGgoKSxcbiAgICBmaWxlU2l6ZTogZ2V0RmlsZVNpemUoKSxcbiAgICBmaWxlU2hhMjU2OiBnZXRTaGEyNTYoKSxcbiAgICBjb250ZW50VHlwZTogZ2V0Q29udGVudFR5cGUoKSxcbiAgICBhcGlCYXNlVXJsOiBnZXRBcGlCYXNlVXJsKCksXG4gICAgYXBpQWNjZXNzVG9rZW46IGdldEFwaUFjY2Vzc1Rva2VuKClcbiAgfTtcbn1cbiIsICIvKipcbiAqIEV4aXQgY29kZSBjb25zdGFudHMgYW5kIGhlbHBlcnMgZm9yIENhcmRzIEV4dGVuc2lvbiBob29rcy5cbiAqXG4gKiBDYXJkcyBob29rcyBjb21tdW5pY2F0ZSBzdWNjZXNzIGFuZCBmYWlsdXJlIHZpYSBwcm9jZXNzIGV4aXQgY29kZXMgYW5kXG4gKiBzdGRlcnIgb3V0cHV0LiBUaGlzIG1vZHVsZSBjZW50cmFsaXplcyB0aG9zZSBjb252ZW50aW9ucyBzbyB0aGUgcnVudGltZVxuICogYW5kIGhvb2tzIHNwZWFrIHRoZSBzYW1lIHByb3RvY29sLlxuICpcbiAqIEBzdW1tYXJ5IEV4aXQgY29kZSBjb25zdGFudHMgYW5kIGhlbHBlcnMgZm9yIENhcmRzIEV4dGVuc2lvbiBob29rc1xuICogQG1vZHVsZVxuICovXG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIEV4aXQgQ29kZSBDb25zdGFudHNcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuLyoqXG4gKiBFeGl0IGNvZGVzIHVzZWQgYnkgQ2FyZHMgaG9va3MuXG4gKlxuICogVGhlIENhcmRzIHJ1bnRpbWUgaW50ZXJwcmV0cyBhbnkgbm9uLXplcm8gZXhpdCBjb2RlIGFzIGZhaWx1cmUuXG4gKi9cbmV4cG9ydCBjb25zdCBFWElUX0NPREVTID0ge1xuICAvKiogSGFuZGxlciBjb21wbGV0ZWQgc3VjY2Vzc2Z1bGx5LiAqL1xuICBTVUNDRVNTOiAwLFxuICAvKiogSGFuZGxlciB0aHJldyBhbiBlcnJvci4gKi9cbiAgRVJST1I6IDEsXG4gIC8qKiBIYW5kbGVyIHByb2Nlc3NlZCBzd2l0Y2hUb0ludGVyYWN0aXZlIGFuZCBpcyBleGl0aW5nIGZvciByZWxhdW5jaC4gKi9cbiAgU1dJVENIX1RPX0lOVEVSQUNUSVZFOiA0MlxufSBhcyBjb25zdDtcblxuLyoqXG4gKiBVbmlvbiBvZiB2YWxpZCBDYXJkcyBob29rIGV4aXQgY29kZXMuXG4gKi9cbmV4cG9ydCB0eXBlIEV4aXRDb2RlID0gKHR5cGVvZiBFWElUX0NPREVTKVtrZXlvZiB0eXBlb2YgRVhJVF9DT0RFU107XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIEVycm9yIE91dHB1dCBIZWxwZXJzXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbi8qKlxuICogV3JpdGVzIGFuIGVycm9yIG1lc3NhZ2UgdG8gc3RkZXJyIHdpdGggYSB0cmFpbGluZyBuZXdsaW5lLlxuICpcbiAqIFVzZSB0aGlzIHdoZW4gYSBob29rIG5lZWRzIHRvIHJlcG9ydCBhIGZhaWx1cmUgd2l0aG91dCBwb2xsdXRpbmcgc3Rkb3V0LlxuICogQHBhcmFtIG1lc3NhZ2UgLSBFcnJvciBtZXNzYWdlIHRvIHdyaXRlXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogd3JpdGVFcnJvcignRmFpbGVkIHRvIGNvbm5lY3QgdG8gZGF0YWJhc2UnKTtcbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gd3JpdGVFcnJvcihtZXNzYWdlOiBzdHJpbmcpOiB2b2lkIHtcbiAgcHJvY2Vzcy5zdGRlcnIud3JpdGUoYCR7bWVzc2FnZX1cXG5gKTtcbn1cblxuLyoqXG4gKiBXcml0ZXMgYW4gZXJyb3IgbWVzc2FnZSB0byBzdGRlcnIgYW5kIGV4aXRzIHdpdGggRVJST1IgY29kZS5cbiAqXG4gKiBUaGlzIHRlcm1pbmF0ZXMgdGhlIHByb2Nlc3MgaW1tZWRpYXRlbHksIHNvIGFueSBwZW5kaW5nIGFzeW5jIHdvcmsgd2lsbFxuICogbm90IGZpbmlzaCB1bmxlc3MgaXQgd2FzIGFscmVhZHkgYXdhaXRlZC5cbiAqIEBwYXJhbSBtZXNzYWdlIC0gRXJyb3IgbWVzc2FnZSB0byB3cml0ZSBiZWZvcmUgZXhpdGluZ1xuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGlmICghaXNWYWxpZCkge1xuICogICBleGl0V2l0aEVycm9yKCdJbnZhbGlkIGNvbmZpZ3VyYXRpb24nKTtcbiAqIH1cbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gZXhpdFdpdGhFcnJvcihtZXNzYWdlOiBzdHJpbmcpOiBuZXZlciB7XG4gIHdyaXRlRXJyb3IobWVzc2FnZSk7XG4gIHByb2Nlc3MuZXhpdChFWElUX0NPREVTLkVSUk9SKTtcbn1cblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gSW50ZXJuYWwgUmVzdWx0IFRyYWNraW5nXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbi8qKlxuICogSW50ZXJuYWwgcnVudGltZSBib29ra2VlcGluZyBmb3IgaG9vayBleGVjdXRpb24gcmVzdWx0cy5cbiAqXG4gKiBUaGlzIHN0cnVjdHVyZSBhbGxvd3MgdGhlIHJ1bnRpbWUgdG8gY2FycnkgZXJyb3IgZGV0YWlscyB3aXRob3V0IGNoYW5naW5nXG4gKiB0aGUgZXhpdC1jb2RlIHByb3RvY29sLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIEhvb2tFeGVjdXRpb25SZXN1bHQge1xuICAvKiogV2hldGhlciB0aGUgaG9vayBleGVjdXRlZCBzdWNjZXNzZnVsbHkuICovXG4gIHN1Y2Nlc3M6IGJvb2xlYW47XG4gIC8qKiBUaGUgZXhpdCBjb2RlIHRvIHVzZSB3aGVuIGV4aXRpbmcuICovXG4gIGV4aXRDb2RlOiBFeGl0Q29kZTtcbiAgLyoqIFRoZSBlcnJvciB0aGF0IG9jY3VycmVkLCBpZiBhbnkuICovXG4gIGVycm9yPzogRXJyb3I7XG59XG4iLCAiLyoqXG4gKiBTdHJ1Y3R1cmVkIGxvZ2dpbmcgZm9yIENhcmRzIEV4dGVuc2lvbiBob29rcy5cbiAqXG4gKiBPdXRwdXQgaXMgb3B0LWluOiB0aGUgbG9nZ2VyIG9ubHkgZW1pdHMgdG8gcmVnaXN0ZXJlZCBoYW5kbGVycyBvciBhXG4gKiBjb25maWd1cmVkIGxvZyBmaWxlLiBJZiB5b3UgY29uZmlndXJlIG5vdGhpbmcsIHRoZSBsb2dnZXIgcG9saXRlbHkgc2F5c1xuICogbm90aGluZyBhdCBhbGwuIEl0IG5ldmVyIHdyaXRlcyB0byBzdGRvdXQgYW5kIGF2b2lkcyBzdGRlcnIgdG8ga2VlcCBob29rXG4gKiBwcm90b2NvbHMgY2xlYW4uXG4gKlxuICogQHN1bW1hcnkgU3RydWN0dXJlZCBsb2dnaW5nIGZvciBDYXJkcyBFeHRlbnNpb24gaG9va3NcbiAqIEBtb2R1bGVcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBpbXBvcnQgeyBsb2dnZXIgfSBmcm9tICdAY2FyZHMvc2RrL2NvbmZpZyc7XG4gKlxuICogLy8gU3Vic2NyaWJlIHRvIGxvZyBldmVudHNcbiAqIGNvbnN0IHVuc3Vic2NyaWJlID0gbG9nZ2VyLm9uKCdlcnJvcicsIChldmVudCkgPT4ge1xuICogICBjb25zb2xlLmVycm9yKGBFcnJvciBpbiAke2V2ZW50Lmhvb2tUeXBlfTogJHtldmVudC5tZXNzYWdlfWApO1xuICogfSk7XG4gKlxuICogLy8gTGF0ZXIsIGNsZWFuIHVwXG4gKiB1bnN1YnNjcmliZSgpO1xuICogYGBgXG4gKi9cblxuaW1wb3J0IHsgY2xvc2VTeW5jLCBleGlzdHNTeW5jLCBta2RpclN5bmMsIG9wZW5TeW5jLCB3cml0ZVN5bmMgfSBmcm9tICdub2RlOmZzJztcbmltcG9ydCB7IGRpcm5hbWUgfSBmcm9tICdub2RlOnBhdGgnO1xuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBMb2cgTGV2ZWwgVHlwZXNcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuLyoqXG4gKiBBdmFpbGFibGUgbG9nIGxldmVscy5cbiAqXG4gKiB8IExldmVsIHwgU2V2ZXJpdHkgfCBVc2UgQ2FzZSB8XG4gKiB8LS0tLS0tLXwtLS0tLS0tLS0tfC0tLS0tLS0tLS18XG4gKiB8IGBkZWJ1Z2AgfCBMb3dlc3QgfCBEZXRhaWxlZCBkZWJ1Z2dpbmcgaW5mb3JtYXRpb24gfFxuICogfCBgaW5mb2AgfCBMb3cgfCBHZW5lcmFsIG9wZXJhdGlvbmFsIGV2ZW50cyB8XG4gKiB8IGB3YXJuYCB8IE1lZGl1bSB8IFdhcm5pbmcgY29uZGl0aW9ucyB0aGF0IG1heSBpbmRpY2F0ZSBpc3N1ZXMgfFxuICogfCBgZXJyb3JgIHwgSGlnaCB8IEVycm9yIGNvbmRpdGlvbnMgcmVxdWlyaW5nIGF0dGVudGlvbiB8XG4gKi9cbmV4cG9ydCB0eXBlIExvZ0xldmVsID0gJ2RlYnVnJyB8ICdpbmZvJyB8ICd3YXJuJyB8ICdlcnJvcic7XG5cbi8qKlxuICogQWxsIGxvZyBsZXZlbHMgaW4gb3JkZXIgb2Ygc2V2ZXJpdHkgKGxvd2VzdCB0byBoaWdoZXN0KS5cbiAqL1xuZXhwb3J0IGNvbnN0IExPR19MRVZFTFMgPSBbJ2RlYnVnJywgJ2luZm8nLCAnd2FybicsICdlcnJvciddIGFzIGNvbnN0IHNhdGlzZmllcyByZWFkb25seSBMb2dMZXZlbFtdO1xuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBMb2cgRXZlbnQgVHlwZVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4vKipcbiAqIFN0cnVjdHVyZWQgbG9nIGV2ZW50IGVtaXR0ZWQgYnkgdGhlIGxvZ2dlci5cbiAqXG4gKiBFdmVudHMgaW5jbHVkZSBjb250ZXh0dWFsIGRldGFpbHMgYWJvdXQgaG9vayBleGVjdXRpb24gYW5kIGFyZSBzdWl0YWJsZSBmb3JcbiAqIGRlYnVnZ2luZywgbW9uaXRvcmluZywgYW5kIGFuYWx5dGljcyBwaXBlbGluZXMuXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogLy8gRXhhbXBsZSBsb2cgZXZlbnRcbiAqIGNvbnN0IGV2ZW50OiBMb2dFdmVudCA9IHtcbiAqICAgdGltZXN0YW1wOiAnMjAyNC0wMS0xNVQxMDozMDowMC4wMDBaJyxcbiAqICAgbGV2ZWw6ICd3YXJuJyxcbiAqICAgaG9va1R5cGU6ICdhY3Rpb24tc3RhcnQnLFxuICogICBtZXNzYWdlOiAnQ2FyZCBzdGFydGVkJyxcbiAqICAgaW5wdXQ6IHsgY2FyZElkOiAnY2FyZC0xMjMnIH1cbiAqIH07XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBMb2dFdmVudCB7XG4gIC8qKlxuICAgKiBJU08gODYwMSB0aW1lc3RhbXAgb2Ygd2hlbiB0aGUgZXZlbnQgb2NjdXJyZWQuXG4gICAqIEBleGFtcGxlICcyMDI0LTAxLTE1VDEwOjMwOjAwLjAwMFonXG4gICAqL1xuICB0aW1lc3RhbXA6IHN0cmluZztcblxuICAvKipcbiAgICogU2V2ZXJpdHkgbGV2ZWwgb2YgdGhlIGxvZyBldmVudC5cbiAgICovXG4gIGxldmVsOiBMb2dMZXZlbDtcblxuICAvKipcbiAgICogVHlwZSBvZiBob29rIHRoYXQgZ2VuZXJhdGVkIHRoaXMgZXZlbnQuXG4gICAqIE1heSBiZSB1bmRlZmluZWQgZm9yIGV2ZW50cyBvdXRzaWRlIGhvb2sgY29udGV4dC5cbiAgICovXG4gIGhvb2tUeXBlPzogc3RyaW5nO1xuXG4gIC8qKlxuICAgKiBIdW1hbi1yZWFkYWJsZSBkZXNjcmlwdGlvbiBvZiB3aGF0IGhhcHBlbmVkLlxuICAgKi9cbiAgbWVzc2FnZTogc3RyaW5nO1xuXG4gIC8qKlxuICAgKiBIb29rIGlucHV0IGRhdGEgYXQgdGhlIHRpbWUgb2YgbG9nZ2luZy5cbiAgICpcbiAgICogVGhpcyBpcyBwYXJ0aWFsIGJ5IGRlc2lnbiwgc28geW91IGNhbiBhdm9pZCBsb2dnaW5nIGxhcmdlIG9yIHNlbnNpdGl2ZVxuICAgKiBwYXlsb2FkcyB3aGlsZSBzdGlsbCBjYXB0dXJpbmcga2V5IGlkZW50aWZpZXJzLlxuICAgKi9cbiAgaW5wdXQ/OiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPjtcblxuICAvKipcbiAgICogRXJyb3IgaW5mb3JtYXRpb24gaWYgdGhpcyBldmVudCByZXByZXNlbnRzIGFuIGVycm9yLlxuICAgKiBDb250YWlucyBzdHJ1Y3R1cmVkIGVycm9yIGRldGFpbHMgZm9yIGFuYWx5c2lzLlxuICAgKi9cbiAgZXJyb3I/OiBMb2dFdmVudEVycm9yO1xuXG4gIC8qKlxuICAgKiBBZGRpdGlvbmFsIGNvbnRleHQgZGF0YSBwcm92aWRlZCBieSB0aGUgY2FsbGVyLlxuICAgKlxuICAgKiBVc2UgdGhpcyBmb3Igc3RydWN0dXJlZCBtZXRhZGF0YSB0aGF0IHlvdSB3YW50IGRvd25zdHJlYW0gaGFuZGxlcnNcbiAgICogdG8gcmVjZWl2ZSAoZS5nLiwgcmVxdWVzdCBJRHMsIHRpbWluZyBkYXRhKS5cbiAgICovXG4gIGNvbnRleHQ/OiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPjtcbn1cblxuLyoqXG4gKiBTdHJ1Y3R1cmVkIGVycm9yIGluZm9ybWF0aW9uIHdpdGhpbiBhIGxvZyBldmVudC5cbiAqXG4gKiBFcnJvcnMgYXJlIG5vcm1hbGl6ZWQgc28gaGFuZGxlcnMgY2FuIGRlcGVuZCBvbiBjb25zaXN0ZW50IHNoYXBlLCBldmVuIHdoZW5cbiAqIGNhbGxlcnMgdGhyb3cgbm9uLUVycm9yIHZhbHVlcy5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBMb2dFdmVudEVycm9yIHtcbiAgLyoqXG4gICAqIEVycm9yIG5hbWUgKGUuZy4sICdUeXBlRXJyb3InLCAnVmFsaWRhdGlvbkVycm9yJykuXG4gICAqL1xuICBuYW1lOiBzdHJpbmc7XG5cbiAgLyoqXG4gICAqIEVycm9yIG1lc3NhZ2UgZGVzY3JpYmluZyB3aGF0IHdlbnQgd3JvbmcuXG4gICAqL1xuICBtZXNzYWdlOiBzdHJpbmc7XG5cbiAgLyoqXG4gICAqIFN0YWNrIHRyYWNlIGlmIGF2YWlsYWJsZS5cbiAgICovXG4gIHN0YWNrPzogc3RyaW5nO1xuXG4gIC8qKlxuICAgKiBFcnJvciBjYXVzZSBjaGFpbiBpZiB0aGUgZXJyb3Igd2FzIHdyYXBwZWQuXG4gICAqL1xuICBjYXVzZT86IExvZ0V2ZW50RXJyb3I7XG59XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIEV2ZW50IEhhbmRsZXIgVHlwZVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4vKipcbiAqIEhhbmRsZXIgaW52b2tlZCB3aGVuIGEgbG9nIGV2ZW50IGlzIGVtaXR0ZWQuXG4gKlxuICogSGFuZGxlcnMgcnVuIHN5bmNocm9ub3VzbHkuIEVycm9ycyB0aHJvd24gYnkgYSBoYW5kbGVyIGFyZSBzd2FsbG93ZWQgc29cbiAqIGxvZ2dpbmcgY2Fubm90IGJyZWFrIGhvb2sgZXhlY3V0aW9uLlxuICogQHBhcmFtIGV2ZW50IC0gVGhlIGxvZyBldmVudCB0byBoYW5kbGVcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiAvLyBGb3J3YXJkIHRvIGV4dGVybmFsIGxvZ2dpbmcgc2VydmljZVxuICogY29uc3QgaGFuZGxlcjogTG9nRXZlbnRIYW5kbGVyID0gKGV2ZW50KSA9PiB7XG4gKiAgIGV4dGVybmFsTG9nZ2VyLmxvZyh7XG4gKiAgICAgbGV2ZWw6IGV2ZW50LmxldmVsLFxuICogICAgIG1lc3NhZ2U6IGV2ZW50Lm1lc3NhZ2UsXG4gKiAgICAgbWV0YWRhdGE6IHsgaG9va1R5cGU6IGV2ZW50Lmhvb2tUeXBlIH1cbiAqICAgfSk7XG4gKiB9O1xuICogYGBgXG4gKi9cbmV4cG9ydCB0eXBlIExvZ0V2ZW50SGFuZGxlciA9IChldmVudDogTG9nRXZlbnQpID0+IHZvaWQ7XG5cbi8qKlxuICogRnVuY3Rpb24gdG8gdW5zdWJzY3JpYmUgYSBsb2cgZXZlbnQgaGFuZGxlci5cbiAqXG4gKiBDYWxsIHRoaXMgZnVuY3Rpb24gdG8gc3RvcCByZWNlaXZpbmcgbG9nIGV2ZW50cy4gQWx3YXlzIGNhbGwgdW5zdWJzY3JpYmVcbiAqIHdoZW4gdGhlIGhhbmRsZXIgaXMgbm8gbG9uZ2VyIG5lZWRlZCB0byBwcmV2ZW50IG1lbW9yeSBsZWFrcy5cbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBjb25zdCB1bnN1YnNjcmliZSA9IGxvZ2dlci5vbignZXJyb3InLCBoYW5kbGVFcnJvcik7XG4gKiAvLyAuLi4gbGF0ZXJcbiAqIHVuc3Vic2NyaWJlKCk7IC8vIFN0b3AgcmVjZWl2aW5nIGV2ZW50c1xuICogYGBgXG4gKi9cbmV4cG9ydCB0eXBlIFVuc3Vic2NyaWJlID0gKCkgPT4gdm9pZDtcblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gTG9nZ2VyIENvbmZpZ3VyYXRpb25cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuLyoqXG4gKiBDb25maWd1cmF0aW9uIG9wdGlvbnMgZm9yIHRoZSBMb2dnZXIuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgTG9nZ2VyQ29uZmlnIHtcbiAgLyoqXG4gICAqIFBhdGggdG8gdGhlIGxvZyBmaWxlIGZvciBKU09OIExpbmVzIG91dHB1dC5cbiAgICpcbiAgICogSWYgbm90IHNldCwgZmlsZSBsb2dnaW5nIGlzIGRpc2FibGVkLiBDYW4gYWxzbyBiZSBzZXQgdmlhIHRoZVxuICAgKiBgQ0FSRFNfSE9PS1NfTE9HX0ZJTEVgIGVudmlyb25tZW50IHZhcmlhYmxlLlxuICAgKi9cbiAgbG9nRmlsZVBhdGg/OiBzdHJpbmc7XG59XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIExvZ2dlciBJbnRlcmZhY2UgKGZvciB0ZXN0aW5nIGFuZCB0eXBlIGNvbXBhdGliaWxpdHkpXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbi8qKlxuICogTG9nZ2VyIGludGVyZmFjZSBmb3Igc3RydWN0dXJlZCwgY29udGV4dC1hd2FyZSBsb2dnaW5nLlxuICpcbiAqIFRoaXMgaW50ZXJmYWNlIGRlZmluZXMgdGhlIHB1YmxpYyBBUEkgb2YgdGhlIExvZ2dlciBjbGFzcy4gSXQgZXhpc3RzXG4gKiBwcmltYXJpbHkgZm9yIHR5cGUgY29tcGF0aWJpbGl0eSBhbmQgdGVzdGluZyBwdXJwb3NlcywgYWxsb3dpbmcgdGVzdHNcbiAqIHRvIG1vY2sgdGhlIGxvZ2dlciB3aXRob3V0IG5lZWRpbmcgdG8gaW1wbGVtZW50IGFsbCBpbnRlcm5hbCBtZXRob2RzLlxuICpcbiAqIEZvciBwcm9kdWN0aW9uIHVzZSwgdXNlIHRoZSB7QGxpbmsgTG9nZ2VyfSBjbGFzcyBvciB0aGUge0BsaW5rIGxvZ2dlcn1cbiAqIHNpbmdsZXRvbiBleHBvcnQuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgSUxvZ2dlciB7XG4gIC8qKlxuICAgKiBMb2dzIGEgZGVidWcgbWVzc2FnZS5cbiAgICogQHBhcmFtIG1lc3NhZ2UgLSBEaWFnbm9zdGljIHRleHQgZGVzY3JpYmluZyBsb3ctbGV2ZWwgZXhlY3V0aW9uIGRldGFpbHMuXG4gICAqIEBwYXJhbSBjb250ZXh0IC0gT3B0aW9uYWwgc3RydWN0dXJlZCBtZXRhZGF0YSBtZXJnZWQgaW50byB0aGUgZW1pdHRlZCBldmVudC5cbiAgICovXG4gIGRlYnVnKG1lc3NhZ2U6IHN0cmluZywgY29udGV4dD86IFJlY29yZDxzdHJpbmcsIHVua25vd24+KTogdm9pZDtcblxuICAvKipcbiAgICogTG9ncyBhbiBpbmZvIG1lc3NhZ2UuXG4gICAqIEBwYXJhbSBtZXNzYWdlIC0gT3BlcmF0aW9uYWwgbWVzc2FnZSBkZXNjcmliaW5nIG5vcm1hbCBob29rIHByb2dyZXNzLlxuICAgKiBAcGFyYW0gY29udGV4dCAtIE9wdGlvbmFsIHN0cnVjdHVyZWQgbWV0YWRhdGEgbWVyZ2VkIGludG8gdGhlIGVtaXR0ZWQgZXZlbnQuXG4gICAqL1xuICBpbmZvKG1lc3NhZ2U6IHN0cmluZywgY29udGV4dD86IFJlY29yZDxzdHJpbmcsIHVua25vd24+KTogdm9pZDtcblxuICAvKipcbiAgICogTG9ncyBhIHdhcm5pbmcgbWVzc2FnZS5cbiAgICogQHBhcmFtIG1lc3NhZ2UgLSBXYXJuaW5nIHRleHQgZm9yIHJlY292ZXJhYmxlIG9yIHN1c3BpY2lvdXMgY29uZGl0aW9ucy5cbiAgICogQHBhcmFtIGNvbnRleHQgLSBPcHRpb25hbCBzdHJ1Y3R1cmVkIG1ldGFkYXRhIG1lcmdlZCBpbnRvIHRoZSBlbWl0dGVkIGV2ZW50LlxuICAgKi9cbiAgd2FybihtZXNzYWdlOiBzdHJpbmcsIGNvbnRleHQ/OiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPik6IHZvaWQ7XG5cbiAgLyoqXG4gICAqIExvZ3MgYW4gZXJyb3IgbWVzc2FnZS5cbiAgICogQHBhcmFtIG1lc3NhZ2UgLSBFcnJvciB0ZXh0IGRlc2NyaWJpbmcgYSBoYW5kbGVkIGZhaWx1cmUgY29uZGl0aW9uLlxuICAgKiBAcGFyYW0gY29udGV4dCAtIE9wdGlvbmFsIHN0cnVjdHVyZWQgbWV0YWRhdGEgbWVyZ2VkIGludG8gdGhlIGVtaXR0ZWQgZXZlbnQuXG4gICAqL1xuICBlcnJvcihtZXNzYWdlOiBzdHJpbmcsIGNvbnRleHQ/OiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPik6IHZvaWQ7XG5cbiAgLyoqXG4gICAqIExvZ3MgYSBzdHJ1Y3R1cmVkIGVycm9yIHdpdGggZnVsbCBlcnJvciBkZXRhaWxzLlxuICAgKiBAcGFyYW0gZXJyb3IgLSBUaGUgZXJyb3IgdG8gbG9nXG4gICAqIEBwYXJhbSBtZXNzYWdlIC0gSHVtYW4tcmVhZGFibGUgZGVzY3JpcHRpb24gb2Ygd2hhdCBmYWlsZWRcbiAgICogQHBhcmFtIGNvbnRleHQgLSBPcHRpb25hbCBzdHJ1Y3R1cmVkIG1ldGFkYXRhIG1lcmdlZCBpbnRvIHRoZSBlbWl0dGVkIGV2ZW50LlxuICAgKi9cbiAgbG9nRXJyb3IoZXJyb3I6IHVua25vd24sIG1lc3NhZ2U6IHN0cmluZywgY29udGV4dD86IFJlY29yZDxzdHJpbmcsIHVua25vd24+KTogdm9pZDtcbn1cblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gTG9nZ2VyIENsYXNzXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbi8qKlxuICogTG9nZ2VyIGZvciBDYXJkcyBFeHRlbnNpb24gaG9va3Mgd2l0aCBldmVudCBzdWJzY3JpcHRpb24gYW5kIGZpbGUgb3V0cHV0LlxuICpcbiAqIE91dHB1dCBpcyBvcHQtaW4gYW5kIGJlc3QtZWZmb3J0OlxuICogLSBXaXRoIG5vIGhhbmRsZXJzIGFuZCBubyBsb2cgZmlsZSwgZXZlbnRzIGFyZSBkcm9wcGVkLlxuICogLSBIYW5kbGVyIGVycm9ycyBhcmUgc3dhbGxvd2VkIHNvIGxvZ2dpbmcgY2Fubm90IGJyZWFrIGhvb2tzLlxuICogLSBGaWxlIG91dHB1dCB1c2VzIEpTT04gTGluZXMgYW5kIGlnbm9yZXMgd3JpdGUgZmFpbHVyZXMuXG4gKlxuICogVGhlIGxvZ2dlciBuZXZlciB3cml0ZXMgdG8gc3Rkb3V0IG9yIHN0ZGVyci5cbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBpbXBvcnQgeyBsb2dnZXIgfSBmcm9tICdAY2FyZHMvc2RrL2NvbmZpZyc7XG4gKlxuICogLy8gU3Vic2NyaWJlIHRvIGV2ZW50cyBhdCBzcGVjaWZpYyBsZXZlbFxuICogbG9nZ2VyLm9uKCd3YXJuJywgKGV2ZW50KSA9PiB7XG4gKiAgIHNlbmRBbGVydChldmVudC5tZXNzYWdlKTtcbiAqIH0pO1xuICpcbiAqIC8vIExvZyB3aXRoaW4gYSBob29rIGhhbmRsZXJcbiAqIGxvZ2dlci53YXJuKCdBYm91dCB0byBleGVjdXRlIHRhc2snKTtcbiAqIGBgYFxuICovXG5leHBvcnQgY2xhc3MgTG9nZ2VyIHtcbiAgLyoqXG4gICAqIFJlZ2lzdGVyZWQgZXZlbnQgaGFuZGxlcnMgYnkgbG9nIGxldmVsLlxuICAgKi9cbiAgcHJpdmF0ZSBoYW5kbGVyczogTWFwPExvZ0xldmVsLCBTZXQ8TG9nRXZlbnRIYW5kbGVyPj4gPSBuZXcgTWFwKCk7XG5cbiAgLyoqXG4gICAqIEZpbGUgZGVzY3JpcHRvciBmb3IgbG9nIGZpbGUgb3V0cHV0LlxuICAgKiBMYXppbHkgaW5pdGlhbGl6ZWQgb24gZmlyc3Qgd3JpdGUuXG4gICAqL1xuICBwcml2YXRlIGxvZ0ZpbGVGZDogbnVtYmVyIHwgbnVsbCA9IG51bGw7XG5cbiAgLyoqXG4gICAqIFBhdGggdG8gdGhlIGxvZyBmaWxlLCBpZiBjb25maWd1cmVkLlxuICAgKi9cbiAgcHJpdmF0ZSBsb2dGaWxlUGF0aDogc3RyaW5nIHwgbnVsbCA9IG51bGw7XG5cbiAgLyoqXG4gICAqIFdoZXRoZXIgZmlsZSBpbml0aWFsaXphdGlvbiBoYXMgYmVlbiBhdHRlbXB0ZWQuXG4gICAqL1xuICBwcml2YXRlIGZpbGVJbml0aWFsaXplZCA9IGZhbHNlO1xuXG4gIC8qKlxuICAgKiBDdXJyZW50IGhvb2sgY29udGV4dCBmb3IgZW5yaWNoaW5nIGxvZyBldmVudHMuXG4gICAqL1xuICBwcml2YXRlIGN1cnJlbnRIb29rVHlwZTogc3RyaW5nIHwgdW5kZWZpbmVkO1xuXG4gIC8qKlxuICAgKiBDdXJyZW50IGhvb2sgaW5wdXQgZm9yIGVucmljaGluZyBsb2cgZXZlbnRzLlxuICAgKi9cbiAgcHJpdmF0ZSBjdXJyZW50SW5wdXQ6IFJlY29yZDxzdHJpbmcsIHVua25vd24+IHwgdW5kZWZpbmVkO1xuXG4gIC8qKlxuICAgKiBDcmVhdGVzIGEgbmV3IExvZ2dlciBpbnN0YW5jZS5cbiAgICpcbiAgICogVHlwaWNhbGx5IHlvdSBzaG91bGQgdXNlIHRoZSBleHBvcnRlZCBgbG9nZ2VyYCBzaW5nbGV0b24gcmF0aGVyIHRoYW5cbiAgICogY3JlYXRpbmcgbmV3IGluc3RhbmNlcy5cbiAgICogQHBhcmFtIGNvbmZpZyAtIE9wdGlvbmFsIGNvbmZpZ3VyYXRpb25cbiAgICogQGV4YW1wbGVcbiAgICogYGBgdHlwZXNjcmlwdFxuICAgKiAvLyBVc2Ugc2luZ2xldG9uIChyZWNvbW1lbmRlZClcbiAgICogaW1wb3J0IHsgbG9nZ2VyIH0gZnJvbSAnQGNhcmRzL3Nkay9jb25maWcnO1xuICAgKlxuICAgKiAvLyBPciBjcmVhdGUgY3VzdG9tIGluc3RhbmNlXG4gICAqIGNvbnN0IGN1c3RvbUxvZ2dlciA9IG5ldyBMb2dnZXIoeyBsb2dGaWxlUGF0aDogJy92YXIvbG9nL2hvb2tzLmxvZycgfSk7XG4gICAqIGBgYFxuICAgKi9cbiAgY29uc3RydWN0b3IoY29uZmlnOiBMb2dnZXJDb25maWcgPSB7fSkge1xuICAgIC8vIEluaXRpYWxpemUgaGFuZGxlcnMgbWFwIGZvciBlYWNoIGxldmVsXG4gICAgZm9yIChjb25zdCBsZXZlbCBvZiBMT0dfTEVWRUxTKSB7XG4gICAgICB0aGlzLmhhbmRsZXJzLnNldChsZXZlbCwgbmV3IFNldCgpKTtcbiAgICB9XG5cbiAgICAvLyBTZXQgbG9nIGZpbGUgcGF0aCBmcm9tIGNvbmZpZyBvciBlbnZpcm9ubWVudFxuICAgIHRoaXMubG9nRmlsZVBhdGggPSBjb25maWcubG9nRmlsZVBhdGggPz8gcHJvY2Vzcy5lbnZbJ0NBUkRTX0hPT0tTX0xPR19GSUxFJ10gPz8gbnVsbDtcbiAgfVxuXG4gIC8qKlxuICAgKiBMb2dzIGEgZGVidWcgbWVzc2FnZS5cbiAgICpcbiAgICogVXNlIGZvciBkZXRhaWxlZCBkZWJ1Z2dpbmcgaW5mb3JtYXRpb24gdGhhdCBpcyB0eXBpY2FsbHkgb25seSB1c2VmdWxcbiAgICogZHVyaW5nIGRldmVsb3BtZW50IG9yIHRyb3VibGVzaG9vdGluZy5cbiAgICogQHBhcmFtIG1lc3NhZ2UgLSBEaWFnbm9zdGljIHRleHQgZGVzY3JpYmluZyBsb3ctbGV2ZWwgZXhlY3V0aW9uIGRldGFpbHMuXG4gICAqIEBwYXJhbSBjb250ZXh0IC0gT3B0aW9uYWwgc3RydWN0dXJlZCBtZXRhZGF0YSBtZXJnZWQgaW50byB0aGUgZW1pdHRlZCBldmVudC5cbiAgICogQGV4YW1wbGVcbiAgICogYGBgdHlwZXNjcmlwdFxuICAgKiBsb2dnZXIuZGVidWcoJ1Byb2Nlc3NpbmcgaG9vayBpbnB1dCcsIHsgdGFza0lkOiAndGFzay0xMjMnLCBpbnB1dFNpemU6IDI1NiB9KTtcbiAgICogYGBgXG4gICAqL1xuICBkZWJ1ZyhtZXNzYWdlOiBzdHJpbmcsIGNvbnRleHQ/OiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPik6IHZvaWQge1xuICAgIHRoaXMuZW1pdCgnZGVidWcnLCBtZXNzYWdlLCBjb250ZXh0KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBMb2dzIGFuIGluZm8gbWVzc2FnZS5cbiAgICpcbiAgICogVXNlIGZvciBnZW5lcmFsIG9wZXJhdGlvbmFsIGV2ZW50cyBsaWtlIGhvb2sgaW52b2NhdGlvbnMsIHN1Y2Nlc3NmdWxcbiAgICogY29tcGxldGlvbnMsIG9yIHN0YXRlIGNoYW5nZXMuXG4gICAqIEBwYXJhbSBtZXNzYWdlIC0gT3BlcmF0aW9uYWwgbWVzc2FnZSBkZXNjcmliaW5nIG5vcm1hbCBob29rIHByb2dyZXNzLlxuICAgKiBAcGFyYW0gY29udGV4dCAtIE9wdGlvbmFsIHN0cnVjdHVyZWQgbWV0YWRhdGEgbWVyZ2VkIGludG8gdGhlIGVtaXR0ZWQgZXZlbnQuXG4gICAqIEBleGFtcGxlXG4gICAqIGBgYHR5cGVzY3JpcHRcbiAgICogbG9nZ2VyLmluZm8oJ1Rhc2sgc3RhcnRlZCcsIHsgdGFza0lkOiAndGFzay0xMjMnLCBjYXJkSWQ6ICdjYXJkLTQ1NicgfSk7XG4gICAqIGBgYFxuICAgKi9cbiAgaW5mbyhtZXNzYWdlOiBzdHJpbmcsIGNvbnRleHQ/OiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPik6IHZvaWQge1xuICAgIHRoaXMuZW1pdCgnaW5mbycsIG1lc3NhZ2UsIGNvbnRleHQpO1xuICB9XG5cbiAgLyoqXG4gICAqIExvZ3MgYSB3YXJuaW5nIG1lc3NhZ2UuXG4gICAqXG4gICAqIFVzZSBmb3IgY29uZGl0aW9ucyB0aGF0IG1heSBpbmRpY2F0ZSBjYXJkcyBidXQgZG9uJ3QgcHJldmVudFxuICAgKiBvcGVyYXRpb24sIHN1Y2ggYXMgZGVwcmVjYXRlZCBwYXR0ZXJucyBvciBwZXJmb3JtYW5jZSBjb25jZXJucy5cbiAgICogQHBhcmFtIG1lc3NhZ2UgLSBXYXJuaW5nIHRleHQgZm9yIHJlY292ZXJhYmxlIG9yIHN1c3BpY2lvdXMgY29uZGl0aW9ucy5cbiAgICogQHBhcmFtIGNvbnRleHQgLSBPcHRpb25hbCBzdHJ1Y3R1cmVkIG1ldGFkYXRhIG1lcmdlZCBpbnRvIHRoZSBlbWl0dGVkIGV2ZW50LlxuICAgKiBAZXhhbXBsZVxuICAgKiBgYGB0eXBlc2NyaXB0XG4gICAqIGxvZ2dlci53YXJuKCdEZXByZWNhdGVkIGhvb2sgcGF0dGVybiBkZXRlY3RlZCcsIHsgcGF0dGVybjogJ2xlZ2FjeU1hdGNoZXInIH0pO1xuICAgKiBgYGBcbiAgICovXG4gIHdhcm4obWVzc2FnZTogc3RyaW5nLCBjb250ZXh0PzogUmVjb3JkPHN0cmluZywgdW5rbm93bj4pOiB2b2lkIHtcbiAgICB0aGlzLmVtaXQoJ3dhcm4nLCBtZXNzYWdlLCBjb250ZXh0KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBMb2dzIGFuIGVycm9yIG1lc3NhZ2UuXG4gICAqXG4gICAqIFVzZSBmb3IgZXJyb3IgY29uZGl0aW9ucyB0aGF0IHJlcXVpcmUgYXR0ZW50aW9uIGJ1dCB3ZXJlIGhhbmRsZWRcbiAgICogZ3JhY2VmdWxseS4gRm9yIGV4Y2VwdGlvbnMsIHByZWZlciB7QGxpbmsgbG9nRXJyb3J9LlxuICAgKiBAcGFyYW0gbWVzc2FnZSAtIEVycm9yIHRleHQgZGVzY3JpYmluZyBhIGhhbmRsZWQgZmFpbHVyZSBjb25kaXRpb24uXG4gICAqIEBwYXJhbSBjb250ZXh0IC0gT3B0aW9uYWwgc3RydWN0dXJlZCBtZXRhZGF0YSBtZXJnZWQgaW50byB0aGUgZW1pdHRlZCBldmVudC5cbiAgICogQGV4YW1wbGVcbiAgICogYGBgdHlwZXNjcmlwdFxuICAgKiBsb2dnZXIuZXJyb3IoJ0ZhaWxlZCB0byB2YWxpZGF0ZSBob29rIGlucHV0JywgeyByZWFzb246ICdlbXB0eSB0YXNrSWQnIH0pO1xuICAgKiBgYGBcbiAgICovXG4gIGVycm9yKG1lc3NhZ2U6IHN0cmluZywgY29udGV4dD86IFJlY29yZDxzdHJpbmcsIHVua25vd24+KTogdm9pZCB7XG4gICAgdGhpcy5lbWl0KCdlcnJvcicsIG1lc3NhZ2UsIGNvbnRleHQpO1xuICB9XG5cbiAgLyoqXG4gICAqIExvZ3MgYSBzdHJ1Y3R1cmVkIGVycm9yIHdpdGggZnVsbCBlcnJvciBkZXRhaWxzLlxuICAgKlxuICAgKiBVc2UgdGhpcyBmb3IgY2F1Z2h0IGV4Y2VwdGlvbnMuIE5vbi1FcnJvciB2YWx1ZXMgYXJlIG5vcm1hbGl6ZWQgc28gaGFuZGxlcnNcbiAgICogYWx3YXlzIHJlY2VpdmUgYSBjb25zaXN0ZW50IGVycm9yIHNoYXBlLlxuICAgKiBAcGFyYW0gZXJyb3IgLSBUaGUgZXJyb3IgdG8gbG9nXG4gICAqIEBwYXJhbSBtZXNzYWdlIC0gSHVtYW4tcmVhZGFibGUgZGVzY3JpcHRpb24gb2Ygd2hhdCBmYWlsZWRcbiAgICogQHBhcmFtIGNvbnRleHQgLSBPcHRpb25hbCBzdHJ1Y3R1cmVkIG1ldGFkYXRhIG1lcmdlZCBpbnRvIHRoZSBlbWl0dGVkIGV2ZW50LlxuICAgKiBAZXhhbXBsZVxuICAgKiBgYGB0eXBlc2NyaXB0XG4gICAqIHRyeSB7XG4gICAqICAgYXdhaXQgZGFuZ2Vyb3VzT3BlcmF0aW9uKCk7XG4gICAqIH0gY2F0Y2ggKGVycikge1xuICAgKiAgIGxvZ2dlci5sb2dFcnJvcihlcnIsICdGYWlsZWQgdG8gZXhlY3V0ZSBkYW5nZXJvdXMgb3BlcmF0aW9uJywge1xuICAgKiAgICAgb3BlcmF0aW9uOiAnZGVsZXRlJyxcbiAgICogICAgIHRhcmdldDogJy9pbXBvcnRhbnQvZmlsZS50eHQnXG4gICAqICAgfSk7XG4gICAqIH1cbiAgICogYGBgXG4gICAqL1xuICBsb2dFcnJvcihlcnJvcjogdW5rbm93biwgbWVzc2FnZTogc3RyaW5nLCBjb250ZXh0PzogUmVjb3JkPHN0cmluZywgdW5rbm93bj4pOiB2b2lkIHtcbiAgICBjb25zdCBlcnJvckluZm8gPSB0aGlzLmV4dHJhY3RFcnJvckluZm8oZXJyb3IpO1xuXG4gICAgY29uc3QgZXZlbnQ6IExvZ0V2ZW50ID0ge1xuICAgICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXG4gICAgICBsZXZlbDogJ2Vycm9yJyxcbiAgICAgIGhvb2tUeXBlOiB0aGlzLmN1cnJlbnRIb29rVHlwZSxcbiAgICAgIG1lc3NhZ2UsXG4gICAgICBpbnB1dDogdGhpcy5jdXJyZW50SW5wdXQsXG4gICAgICBlcnJvcjogZXJyb3JJbmZvLFxuICAgICAgY29udGV4dFxuICAgIH07XG5cbiAgICB0aGlzLmRlbGl2ZXJFdmVudChldmVudCk7XG4gIH1cblxuICAvKipcbiAgICogU3Vic2NyaWJlcyBhIGhhbmRsZXIgdG8gbG9nIGV2ZW50cyBhdCB0aGUgc3BlY2lmaWVkIGxldmVsLlxuICAgKlxuICAgKiBUaGUgaGFuZGxlciB3aWxsIGJlIGNhbGxlZCBmb3IgZXZlcnkgbG9nIGV2ZW50IGF0IHRoZSBzcGVjaWZpZWQgbGV2ZWwuXG4gICAqIFJldHVybnMgYW4gdW5zdWJzY3JpYmUgZnVuY3Rpb24gdGhhdCBzaG91bGQgYmUgY2FsbGVkIHdoZW4gdGhlIGhhbmRsZXJcbiAgICogaXMgbm8gbG9uZ2VyIG5lZWRlZC4gSGFuZGxlciBlcnJvcnMgYXJlIGlnbm9yZWQgdG8gYXZvaWQgZGlzcnVwdGluZyBob29rcy5cbiAgICogQHBhcmFtIGxldmVsIC0gVGhlIGxvZyBsZXZlbCB0byBzdWJzY3JpYmUgdG9cbiAgICogQHBhcmFtIGhhbmRsZXIgLSBUaGUgaGFuZGxlciBmdW5jdGlvbiB0byBjYWxsIGZvciBlYWNoIGV2ZW50XG4gICAqIEByZXR1cm5zIEEgZnVuY3Rpb24gdG8gdW5zdWJzY3JpYmUgdGhlIGhhbmRsZXJcbiAgICogQGV4YW1wbGVcbiAgICogYGBgdHlwZXNjcmlwdFxuICAgKiAvLyBTdWJzY3JpYmUgdG8gZXJyb3IgZXZlbnRzXG4gICAqIGNvbnN0IHVuc3Vic2NyaWJlID0gbG9nZ2VyLm9uKCdlcnJvcicsIChldmVudCkgPT4ge1xuICAgKiAgIGNvbnNvbGUuZXJyb3IoYFske2V2ZW50Lmhvb2tUeXBlfV0gJHtldmVudC5tZXNzYWdlfWApO1xuICAgKiAgIGlmIChldmVudC5lcnJvcikge1xuICAgKiAgICAgY29uc29sZS5lcnJvcihldmVudC5lcnJvci5zdGFjayk7XG4gICAqICAgfVxuICAgKiB9KTtcbiAgICpcbiAgICogLy8gTGF0ZXIsIGNsZWFuIHVwXG4gICAqIHVuc3Vic2NyaWJlKCk7XG4gICAqIGBgYFxuICAgKiBAZXhhbXBsZVxuICAgKiBgYGB0eXBlc2NyaXB0XG4gICAqIC8vIEZvcndhcmQgdG8gZXh0ZXJuYWwgbG9nZ2luZyBsaWJyYXJ5XG4gICAqIGltcG9ydCBwaW5vIGZyb20gJ3Bpbm8nO1xuICAgKiBjb25zdCBwaW5vTG9nZ2VyID0gcGlubygpO1xuICAgKlxuICAgKiBsb2dnZXIub24oJ2luZm8nLCAoZXZlbnQpID0+IHBpbm9Mb2dnZXIuaW5mbyhldmVudCwgZXZlbnQubWVzc2FnZSkpO1xuICAgKiBsb2dnZXIub24oJ3dhcm4nLCAoZXZlbnQpID0+IHBpbm9Mb2dnZXIud2FybihldmVudCwgZXZlbnQubWVzc2FnZSkpO1xuICAgKiBsb2dnZXIub24oJ2Vycm9yJywgKGV2ZW50KSA9PiBwaW5vTG9nZ2VyLmVycm9yKGV2ZW50LCBldmVudC5tZXNzYWdlKSk7XG4gICAqIGBgYFxuICAgKi9cbiAgb24obGV2ZWw6IExvZ0xldmVsLCBoYW5kbGVyOiBMb2dFdmVudEhhbmRsZXIpOiBVbnN1YnNjcmliZSB7XG4gICAgY29uc3QgbGV2ZWxIYW5kbGVycyA9IHRoaXMuaGFuZGxlcnMuZ2V0KGxldmVsKTtcbiAgICBpZiAobGV2ZWxIYW5kbGVycykge1xuICAgICAgbGV2ZWxIYW5kbGVycy5hZGQoaGFuZGxlcik7XG4gICAgfVxuXG4gICAgcmV0dXJuICgpID0+IHtcbiAgICAgIGxldmVsSGFuZGxlcnM/LmRlbGV0ZShoYW5kbGVyKTtcbiAgICB9O1xuICB9XG5cbiAgLyoqXG4gICAqIFNldHMgdGhlIGN1cnJlbnQgaG9vayBjb250ZXh0IGZvciBlbnJpY2hpbmcgbG9nIGV2ZW50cy5cbiAgICpcbiAgICogVGhpcyBpcyBjYWxsZWQgaW50ZXJuYWxseSBieSB0aGUgcnVudGltZSBiZWZvcmUgaW52b2tpbmcgaG9vayBoYW5kbGVycy5cbiAgICogWW91IHR5cGljYWxseSBkb24ndCBuZWVkIHRvIGNhbGwgdGhpcyBkaXJlY3RseS5cbiAgICogQHBhcmFtIGhvb2tUeXBlIC0gVGhlIHR5cGUgb2YgaG9vayBiZWluZyBleGVjdXRlZFxuICAgKiBAcGFyYW0gaW5wdXQgLSBUaGUgaG9vayBpbnB1dCBkYXRhXG4gICAqIEBpbnRlcm5hbFxuICAgKi9cbiAgc2V0Q29udGV4dChob29rVHlwZTogc3RyaW5nIHwgdW5kZWZpbmVkLCBpbnB1dDogUmVjb3JkPHN0cmluZywgdW5rbm93bj4gfCB1bmRlZmluZWQpOiB2b2lkIHtcbiAgICB0aGlzLmN1cnJlbnRIb29rVHlwZSA9IGhvb2tUeXBlO1xuICAgIHRoaXMuY3VycmVudElucHV0ID0gaW5wdXQ7XG4gIH1cblxuICAvKipcbiAgICogQ2xlYXJzIHRoZSBjdXJyZW50IGhvb2sgY29udGV4dC5cbiAgICpcbiAgICogQ2FsbGVkIGludGVybmFsbHkgYnkgdGhlIHJ1bnRpbWUgYWZ0ZXIgaG9vayBleGVjdXRpb24gY29tcGxldGVzLlxuICAgKiBAaW50ZXJuYWxcbiAgICovXG4gIGNsZWFyQ29udGV4dCgpOiB2b2lkIHtcbiAgICB0aGlzLmN1cnJlbnRIb29rVHlwZSA9IHVuZGVmaW5lZDtcbiAgICB0aGlzLmN1cnJlbnRJbnB1dCA9IHVuZGVmaW5lZDtcbiAgfVxuXG4gIC8qKlxuICAgKiBTZXRzIGEgZGVmYXVsdCBsb2cgZmlsZSBwYXRoIHRoYXQgb25seSB0YWtlcyBlZmZlY3QgaWYgbm8gb3RoZXIgc291cmNlXG4gICAqIGhhcyBjb25maWd1cmVkIGZpbGUgbG9nZ2luZy5cbiAgICpcbiAgICogVGhpcyBpcyB0aGUgbG93ZXN0LXByaW9yaXR5IGZpbGUgcGF0aCBzb3VyY2UuIEl0IHdpbGwgYmUgaWdub3JlZCBpZlxuICAgKiBhbnkgb2YgdGhlc2UgaGF2ZSBhbHJlYWR5IHNldCBhIHBhdGg6XG4gICAqIC0gYGxvZ0ZpbGVQYXRoYCBpbiB0aGUgY29uc3RydWN0b3IgY29uZmlnXG4gICAqIC0gYENBUkRTX0hPT0tTX0xPR19GSUxFYCBlbnZpcm9ubWVudCB2YXJpYWJsZVxuICAgKiAtIHtAbGluayBzZXRMb2dGaWxlfSBjYWxsZWQgYXQgcnVudGltZVxuICAgKlxuICAgKiBJbnRlbmRlZCBmb3IgdXNlIGJ5IENMSSBlbnRyeSBwb2ludHMgKGUuZy4sIHRoZSBgLS1sb2dgIGZsYWcpLlxuICAgKiBAcGFyYW0gZmlsZVBhdGggLSBEZWZhdWx0IHBhdGggdG8gdGhlIGxvZyBmaWxlXG4gICAqIEBleGFtcGxlXG4gICAqIGBgYHR5cGVzY3JpcHRcbiAgICogLy8gV2lyZSAtLWxvZyBDTEkgYXJndW1lbnQgYXMgYSBmYWxsYmFja1xuICAgKiBpZiAoYXJncy5sb2cpIHtcbiAgICogICBsb2dnZXIuc2V0RGVmYXVsdExvZ0ZpbGUoYXJncy5sb2cpO1xuICAgKiB9XG4gICAqIGBgYFxuICAgKi9cbiAgc2V0RGVmYXVsdExvZ0ZpbGUoZmlsZVBhdGg6IHN0cmluZyk6IHZvaWQge1xuICAgIGlmICh0aGlzLmxvZ0ZpbGVQYXRoID09PSBudWxsKSB7XG4gICAgICB0aGlzLmxvZ0ZpbGVQYXRoID0gZmlsZVBhdGg7XG4gICAgICB0aGlzLmZpbGVJbml0aWFsaXplZCA9IGZhbHNlO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBDb25maWd1cmVzIHRoZSBsb2cgZmlsZSBwYXRoIGF0IHJ1bnRpbWUuXG4gICAqXG4gICAqIENhbGwgdGhpcyB0byBlbmFibGUgb3IgY2hhbmdlIGZpbGUgbG9nZ2luZy4gU2V0dGluZyB0byBgbnVsbGAgZGlzYWJsZXNcbiAgICogZmlsZSBsb2dnaW5nIGFuZCBjbG9zZXMgYW55IG9wZW4gZmlsZSBoYW5kbGUuIERpcmVjdG9yaWVzIGFyZSBjcmVhdGVkXG4gICAqIG9uIGRlbWFuZCB3aGVuIHRoZSBmaXJzdCB3cml0ZSBvY2N1cnMuXG4gICAqIEBwYXJhbSBmaWxlUGF0aCAtIFBhdGggdG8gdGhlIGxvZyBmaWxlLCBvciBudWxsIHRvIGRpc2FibGVcbiAgICogQGV4YW1wbGVcbiAgICogYGBgdHlwZXNjcmlwdFxuICAgKiAvLyBFbmFibGUgZmlsZSBsb2dnaW5nIGF0IHJ1bnRpbWVcbiAgICogbG9nZ2VyLnNldExvZ0ZpbGUoJy92YXIvbG9nL2NhcmRzLXNkay5sb2cnKTtcbiAgICpcbiAgICogLy8gRGlzYWJsZSBmaWxlIGxvZ2dpbmdcbiAgICogbG9nZ2VyLnNldExvZ0ZpbGUobnVsbCk7XG4gICAqIGBgYFxuICAgKi9cbiAgc2V0TG9nRmlsZShmaWxlUGF0aDogc3RyaW5nIHwgbnVsbCk6IHZvaWQge1xuICAgIC8vIENsb3NlIGV4aXN0aW5nIGZpbGUgaWYgb3BlblxuICAgIGlmICh0aGlzLmxvZ0ZpbGVGZCAhPT0gbnVsbCkge1xuICAgICAgdHJ5IHtcbiAgICAgICAgY2xvc2VTeW5jKHRoaXMubG9nRmlsZUZkKTtcbiAgICAgIH0gY2F0Y2gge1xuICAgICAgICAvLyBJZ25vcmUgZXJyb3JzIG9uIGNsb3NlXG4gICAgICB9XG4gICAgICB0aGlzLmxvZ0ZpbGVGZCA9IG51bGw7XG4gICAgfVxuXG4gICAgdGhpcy5sb2dGaWxlUGF0aCA9IGZpbGVQYXRoO1xuICAgIHRoaXMuZmlsZUluaXRpYWxpemVkID0gZmFsc2U7XG4gIH1cblxuICAvKipcbiAgICogQ2xvc2VzIGFsbCByZXNvdXJjZXMgaGVsZCBieSB0aGUgbG9nZ2VyLlxuICAgKlxuICAgKiBDYWxsIHRoaXMgZHVyaW5nIGdyYWNlZnVsIHNodXRkb3duIHRvIGVuc3VyZSBhbGwgbG9nIGRhdGEgaXMgZmx1c2hlZC5cbiAgICogU2FmZSB0byBjYWxsIG11bHRpcGxlIHRpbWVzLlxuICAgKiBAZXhhbXBsZVxuICAgKiBgYGB0eXBlc2NyaXB0XG4gICAqIHByb2Nlc3Mub24oJ2V4aXQnLCAoKSA9PiB7XG4gICAqICAgbG9nZ2VyLmNsb3NlKCk7XG4gICAqIH0pO1xuICAgKiBgYGBcbiAgICovXG4gIGNsb3NlKCk6IHZvaWQge1xuICAgIGlmICh0aGlzLmxvZ0ZpbGVGZCAhPT0gbnVsbCkge1xuICAgICAgdHJ5IHtcbiAgICAgICAgY2xvc2VTeW5jKHRoaXMubG9nRmlsZUZkKTtcbiAgICAgIH0gY2F0Y2gge1xuICAgICAgICAvLyBJZ25vcmUgZXJyb3JzIG9uIGNsb3NlXG4gICAgICB9XG4gICAgICB0aGlzLmxvZ0ZpbGVGZCA9IG51bGw7XG4gICAgfVxuICAgIHRoaXMuZmlsZUluaXRpYWxpemVkID0gZmFsc2U7XG4gIH1cblxuICAvKipcbiAgICogQ2hlY2tzIGlmIHRoZXJlIGFyZSBhbnkgYWN0aXZlIGhhbmRsZXJzIG9yIGRlc3RpbmF0aW9ucy5cbiAgICpcbiAgICogUmV0dXJucyB0cnVlIGlmIGFueSBoYW5kbGVycyBhcmUgcmVnaXN0ZXJlZCBvciBmaWxlIGxvZ2dpbmcgaXMgZW5hYmxlZC5cbiAgICogVXNlZnVsIGZvciBkZWNpZGluZyB3aGV0aGVyIHRvIGNvbXB1dGUgZXhwZW5zaXZlIGxvZyBjb250ZXh0LlxuICAgKiBAcmV0dXJucyBXaGV0aGVyIHRoZSBsb2dnZXIgaGFzIGFueSBhY3RpdmUgb3V0cHV0IGRlc3RpbmF0aW9uc1xuICAgKi9cbiAgaGFzRGVzdGluYXRpb25zKCk6IGJvb2xlYW4ge1xuICAgIGNvbnN0IGhhc0hhbmRsZXJzID0gQXJyYXkuZnJvbSh0aGlzLmhhbmRsZXJzLnZhbHVlcygpKS5zb21lKChoYW5kbGVycykgPT4gaGFuZGxlcnMuc2l6ZSA+IDApO1xuICAgIHJldHVybiBoYXNIYW5kbGVycyB8fCB0aGlzLmxvZ0ZpbGVQYXRoICE9PSBudWxsO1xuICB9XG5cbiAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAvLyBQcml2YXRlIE1ldGhvZHNcbiAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4gIC8qKlxuICAgKiBFbWl0cyBhIGxvZyBldmVudC5cbiAgICogQHBhcmFtIGxldmVsIC0gVGhlIHNldmVyaXR5IGxldmVsIG9mIHRoZSBldmVudFxuICAgKiBAcGFyYW0gbWVzc2FnZSAtIFRoZSBsb2cgbWVzc2FnZVxuICAgKiBAcGFyYW0gY29udGV4dCAtIE9wdGlvbmFsIGFkZGl0aW9uYWwgY29udGV4dCBkYXRhXG4gICAqL1xuICBwcml2YXRlIGVtaXQobGV2ZWw6IExvZ0xldmVsLCBtZXNzYWdlOiBzdHJpbmcsIGNvbnRleHQ/OiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPik6IHZvaWQge1xuICAgIGNvbnN0IGV2ZW50OiBMb2dFdmVudCA9IHtcbiAgICAgIHRpbWVzdGFtcDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxuICAgICAgbGV2ZWwsXG4gICAgICBob29rVHlwZTogdGhpcy5jdXJyZW50SG9va1R5cGUsXG4gICAgICBtZXNzYWdlLFxuICAgICAgaW5wdXQ6IHRoaXMuY3VycmVudElucHV0LFxuICAgICAgY29udGV4dFxuICAgIH07XG5cbiAgICB0aGlzLmRlbGl2ZXJFdmVudChldmVudCk7XG4gIH1cblxuICAvKipcbiAgICogRGVsaXZlcnMgYW4gZXZlbnQgdG8gYWxsIHJlZ2lzdGVyZWQgZGVzdGluYXRpb25zLlxuICAgKiBAcGFyYW0gZXZlbnQgLSBUaGUgbG9nIGV2ZW50IHRvIGRlbGl2ZXJcbiAgICovXG4gIHByaXZhdGUgZGVsaXZlckV2ZW50KGV2ZW50OiBMb2dFdmVudCk6IHZvaWQge1xuICAgIC8vIERlbGl2ZXIgdG8gZXZlbnQgaGFuZGxlcnNcbiAgICBjb25zdCBsZXZlbEhhbmRsZXJzID0gdGhpcy5oYW5kbGVycy5nZXQoZXZlbnQubGV2ZWwpO1xuICAgIGlmIChsZXZlbEhhbmRsZXJzKSB7XG4gICAgICBmb3IgKGNvbnN0IGhhbmRsZXIgb2YgbGV2ZWxIYW5kbGVycykge1xuICAgICAgICB0cnkge1xuICAgICAgICAgIGhhbmRsZXIoZXZlbnQpO1xuICAgICAgICB9IGNhdGNoIHtcbiAgICAgICAgICAvLyBTaWxlbnRseSBpZ25vcmUgaGFuZGxlciBlcnJvcnMgdG8gbm90IGRpc3J1cHQgaG9vayBleGVjdXRpb25cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIC8vIFdyaXRlIHRvIGZpbGUgaWYgY29uZmlndXJlZFxuICAgIHRoaXMud3JpdGVUb0ZpbGUoZXZlbnQpO1xuICB9XG5cbiAgLyoqXG4gICAqIFdyaXRlcyBhbiBldmVudCB0byB0aGUgbG9nIGZpbGUuXG4gICAqIEBwYXJhbSBldmVudCAtIFRoZSBsb2cgZXZlbnQgdG8gd3JpdGVcbiAgICovXG4gIHByaXZhdGUgd3JpdGVUb0ZpbGUoZXZlbnQ6IExvZ0V2ZW50KTogdm9pZCB7XG4gICAgaWYgKCF0aGlzLmxvZ0ZpbGVQYXRoKSByZXR1cm47XG5cbiAgICAvLyBMYXp5IGluaXRpYWxpemF0aW9uIG9mIGZpbGUgaGFuZGxlXG4gICAgaWYgKCF0aGlzLmZpbGVJbml0aWFsaXplZCkge1xuICAgICAgdGhpcy5pbml0aWFsaXplRmlsZSgpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLmxvZ0ZpbGVGZCA9PT0gbnVsbCkgcmV0dXJuO1xuXG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IGxpbmUgPSBgJHtKU09OLnN0cmluZ2lmeShldmVudCl9XFxuYDtcbiAgICAgIHdyaXRlU3luYyh0aGlzLmxvZ0ZpbGVGZCwgbGluZSk7XG4gICAgfSBjYXRjaCB7XG4gICAgICAvLyBTaWxlbnRseSBpZ25vcmUgZmlsZSB3cml0ZSBlcnJvcnMgdG8gbm90IGRpc3J1cHQgaG9vayBleGVjdXRpb25cbiAgICAgIC8vIFRoaXMgZm9sbG93cyB0aGUgcmlzayBtaXRpZ2F0aW9uOiBcIkdyYWNlZnVsIGRlZ3JhZGF0aW9uIC0gbG9nIHdyaXRlXG4gICAgICAvLyBmYWlsdXJlcyBhcmUgc2lsZW50bHkgaWdub3JlZCB0byBub3QgZGlzcnVwdCBob29rIGV4ZWN1dGlvblwiXG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEluaXRpYWxpemVzIHRoZSBsb2cgZmlsZSBmb3Igd3JpdGluZy5cbiAgICovXG4gIHByaXZhdGUgaW5pdGlhbGl6ZUZpbGUoKTogdm9pZCB7XG4gICAgdGhpcy5maWxlSW5pdGlhbGl6ZWQgPSB0cnVlO1xuXG4gICAgaWYgKCF0aGlzLmxvZ0ZpbGVQYXRoKSByZXR1cm47XG5cbiAgICB0cnkge1xuICAgICAgLy8gRW5zdXJlIGRpcmVjdG9yeSBleGlzdHNcbiAgICAgIGNvbnN0IGRpciA9IGRpcm5hbWUodGhpcy5sb2dGaWxlUGF0aCk7XG4gICAgICBpZiAoIWV4aXN0c1N5bmMoZGlyKSkge1xuICAgICAgICBta2RpclN5bmMoZGlyLCB7IHJlY3Vyc2l2ZTogdHJ1ZSB9KTtcbiAgICAgIH1cblxuICAgICAgLy8gT3BlbiBmaWxlIGZvciBhcHBlbmRpbmdcbiAgICAgIHRoaXMubG9nRmlsZUZkID0gb3BlblN5bmModGhpcy5sb2dGaWxlUGF0aCwgJ2EnKTtcbiAgICB9IGNhdGNoIHtcbiAgICAgIC8vIFNpbGVudGx5IGlnbm9yZSBmaWxlIGluaXRpYWxpemF0aW9uIGVycm9yc1xuICAgICAgdGhpcy5sb2dGaWxlRmQgPSBudWxsO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBFeHRyYWN0cyBzdHJ1Y3R1cmVkIGVycm9yIGluZm9ybWF0aW9uIGZyb20gYW4gdW5rbm93biBlcnJvci5cbiAgICogQHBhcmFtIGVycm9yIC0gVGhlIGVycm9yIHRvIGV4dHJhY3QgaW5mb3JtYXRpb24gZnJvbVxuICAgKiBAcmV0dXJucyBTdHJ1Y3R1cmVkIGVycm9yIGluZm9ybWF0aW9uXG4gICAqL1xuICBwcml2YXRlIGV4dHJhY3RFcnJvckluZm8oZXJyb3I6IHVua25vd24pOiBMb2dFdmVudEVycm9yIHtcbiAgICBpZiAoZXJyb3IgaW5zdGFuY2VvZiBFcnJvcikge1xuICAgICAgY29uc3QgaW5mbzogTG9nRXZlbnRFcnJvciA9IHtcbiAgICAgICAgbmFtZTogZXJyb3IubmFtZSxcbiAgICAgICAgbWVzc2FnZTogZXJyb3IubWVzc2FnZSxcbiAgICAgICAgc3RhY2s6IGVycm9yLnN0YWNrXG4gICAgICB9O1xuXG4gICAgICAvLyBFeHRyYWN0IGNhdXNlIGNoYWluIGlmIHByZXNlbnRcbiAgICAgIGlmIChlcnJvci5jYXVzZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGluZm8uY2F1c2UgPSB0aGlzLmV4dHJhY3RFcnJvckluZm8oZXJyb3IuY2F1c2UpO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gaW5mbztcbiAgICB9XG5cbiAgICAvLyBIYW5kbGUgbm9uLUVycm9yIHZhbHVlc1xuICAgIHJldHVybiB7XG4gICAgICBuYW1lOiAnVW5rbm93bkVycm9yJyxcbiAgICAgIG1lc3NhZ2U6IFN0cmluZyhlcnJvcilcbiAgICB9O1xuICB9XG59XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIFNpbmdsZXRvbiBFeHBvcnRcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuLyoqXG4gKiBHbG9iYWwgbG9nZ2VyIGluc3RhbmNlIGZvciBDYXJkcyBFeHRlbnNpb24gaG9va3MuXG4gKlxuICogVXNlIHRoaXMgc2luZ2xldG9uIGZvciBhbGwgbG9nZ2luZyB3aXRoaW4gaG9va3MuIFRoZSBsb2dnZXIgaXMgY29uZmlndXJlZFxuICogdmlhIGVudmlyb25tZW50IHZhcmlhYmxlcyBhbmQgc3VwcG9ydHMgZXZlbnQgc3Vic2NyaXB0aW9uIGZvciBjdXN0b21cbiAqIGRlc3RpbmF0aW9ucy5cbiAqXG4gKiAjIyBDb25maWd1cmF0aW9uXG4gKlxuICogfCBFbnZpcm9ubWVudCBWYXJpYWJsZSB8IERlc2NyaXB0aW9uIHxcbiAqIHwtLS0tLS0tLS0tLS0tLS0tLS0tLS18LS0tLS0tLS0tLS0tLXxcbiAqIHwgYENBUkRTX0hPT0tTX0xPR19GSUxFYCB8IFBhdGggdG8gbG9nIGZpbGUgKEpTT04gTGluZXMgZm9ybWF0KSB8XG4gKlxuICogIyMgVXNhZ2UgaW4gSG9va3NcbiAqXG4gKiBUaGUgbG9nZ2VyIGNhbiBiZSB1c2VkIGRpcmVjdGx5IHdpdGhpbiBob29rIGhhbmRsZXJzOlxuICpcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGltcG9ydCB7IGxvZ2dlciB9IGZyb20gJ0BjYXJkcy9zZGsvY29uZmlnJztcbiAqXG4gKiAvLyBJbiBhIGhvb2sgaGFuZGxlclxuICogbG9nZ2VyLndhcm4oJ1Rhc2sgc3RhcnRpbmcgaW4gaW50ZXJhY3RpdmUgbW9kZScpO1xuICogYGBgXG4gKlxuICogIyMgRXh0ZXJuYWwgSW50ZWdyYXRpb25cbiAqXG4gKiBTdWJzY3JpYmUgdG8gZXZlbnRzIHRvIGZvcndhcmQgbG9ncyB0byBleHRlcm5hbCBzeXN0ZW1zOlxuICpcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGltcG9ydCB7IGxvZ2dlciB9IGZyb20gJ0BjYXJkcy9zZGsvY29uZmlnJztcbiAqIGltcG9ydCBwaW5vIGZyb20gJ3Bpbm8nO1xuICpcbiAqIGNvbnN0IHBpbm9Mb2dnZXIgPSBwaW5vKHsgbGV2ZWw6ICdkZWJ1ZycgfSk7XG4gKlxuICogbG9nZ2VyLm9uKCdkZWJ1ZycsIChldmVudCkgPT4gcGlub0xvZ2dlci5kZWJ1ZyhldmVudCwgZXZlbnQubWVzc2FnZSkpO1xuICogbG9nZ2VyLm9uKCdpbmZvJywgKGV2ZW50KSA9PiBwaW5vTG9nZ2VyLmluZm8oZXZlbnQsIGV2ZW50Lm1lc3NhZ2UpKTtcbiAqIGxvZ2dlci5vbignd2FybicsIChldmVudCkgPT4gcGlub0xvZ2dlci53YXJuKGV2ZW50LCBldmVudC5tZXNzYWdlKSk7XG4gKiBsb2dnZXIub24oJ2Vycm9yJywgKGV2ZW50KSA9PiBwaW5vTG9nZ2VyLmVycm9yKGV2ZW50LCBldmVudC5tZXNzYWdlKSk7XG4gKiBgYGBcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiAvLyBEaXJlY3QgdXNhZ2VcbiAqIGltcG9ydCB7IGxvZ2dlciB9IGZyb20gJ0BjYXJkcy9zZGsvY29uZmlnJztcbiAqXG4gKiBsb2dnZXIuaW5mbygnU3RhcnRpbmcgb3BlcmF0aW9uJyk7XG4gKiBsb2dnZXIud2FybignUmVzb3VyY2UgbGltaXQgYXBwcm9hY2hpbmcnLCB7IHVzYWdlOiAwLjkgfSk7XG4gKlxuICogdHJ5IHtcbiAqICAgYXdhaXQgcmlza3lPcGVyYXRpb24oKTtcbiAqIH0gY2F0Y2ggKGVycikge1xuICogICBsb2dnZXIubG9nRXJyb3IoZXJyLCAnUmlza3kgb3BlcmF0aW9uIGZhaWxlZCcpO1xuICogfVxuICogYGBgXG4gKi9cbmV4cG9ydCBjb25zdCBsb2dnZXIgPSBuZXcgTG9nZ2VyKCk7XG4iLCAiLyoqXG4gKiBTb2NrZXQgY2xpZW50IGZvciBydW50aW1lLXRvLWRpc3BhdGNoZXIgY29tbXVuaWNhdGlvbi5cbiAqXG4gKiBDb25uZWN0cyB0byBhIFVuaXggZG9tYWluIHNvY2tldCBjcmVhdGVkIGJ5IEFjdGlvbkRpc3BhdGNoZXIgYW5kIGhhbmRsZXNcbiAqIE5ESlNPTiAobmV3bGluZS1kZWxpbWl0ZWQgSlNPTikgcHJvdG9jb2wgZm9yIHJlY2VpdmluZyBjb21tYW5kcyBhbmQgc2VuZGluZ1xuICogcmVzcG9uc2VzLlxuICpcbiAqXG4gKiBAc3VtbWFyeSBTb2NrZXQgY2xpZW50IGZvciBydW50aW1lLXRvLWRpc3BhdGNoZXIgY29tbXVuaWNhdGlvblxuICogQG1vZHVsZVxuICovXG5cbmltcG9ydCAqIGFzIG5ldCBmcm9tICdub2RlOm5ldCc7XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIFR5cGVzXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbi8qKlxuICogQ29tbWFuZHMgdGhhdCBjYW4gYmUgcmVjZWl2ZWQgZnJvbSB0aGUgQWN0aW9uRGlzcGF0Y2hlciB2aWEgc29ja2V0LlxuICpcbiAqIFVzZXMgTkRKU09OIChuZXdsaW5lLWRlbGltaXRlZCBKU09OKSBwcm90b2NvbC5cbiAqL1xuZXhwb3J0IHR5cGUgU29ja2V0Q29tbWFuZCA9IHsgdHlwZTogJ2NhbmNlbCcgfSB8IHsgdHlwZTogJ3N3aXRjaFRvSW50ZXJhY3RpdmUnIH07XG5cbi8qKlxuICogUmVzcG9uc2Ugc2VudCBiYWNrIHRvIHRoZSBBY3Rpb25EaXNwYXRjaGVyIHdoZW4gc3dpdGNoVG9JbnRlcmFjdGl2ZSBpcyBoYW5kbGVkLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIFN3aXRjaFRvSW50ZXJhY3RpdmVSZXNwb25zZSB7XG4gIHR5cGU6ICdzd2l0Y2hUb0ludGVyYWN0aXZlUmVzcG9uc2UnO1xuICBkYXRhOiB1bmtub3duO1xufVxuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBTb2NrZXRDbGllbnRcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuLyoqXG4gKiBDbGllbnQgZm9yIHRoZSBOREpTT04gc29ja2V0IHByb3RvY29sIGJldHdlZW4gdGhlIGFjdGlvbiBydW50aW1lIGFuZFxuICogQWN0aW9uRGlzcGF0Y2hlci5cbiAqXG4gKiBSZWNlaXZlcyBjb21tYW5kcyAoY2FuY2VsLCBzd2l0Y2hUb0ludGVyYWN0aXZlKSBhbmQgc2VuZHMgcmVzcG9uc2VzXG4gKiAoc3dpdGNoVG9JbnRlcmFjdGl2ZVJlc3BvbnNlKSBvdmVyIGEgVW5peCBkb21haW4gc29ja2V0LlxuICpcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBjb25zdCBjbGllbnQgPSBhd2FpdCBTb2NrZXRDbGllbnQuY29ubmVjdCgnL3BhdGgvdG8vc29ja2V0Jyk7XG4gKiBjbGllbnQub25Db21tYW5kKChjb21tYW5kKSA9PiB7XG4gKiAgIGlmIChjb21tYW5kLnR5cGUgPT09ICdjYW5jZWwnKSB7IC4uLiB9XG4gKiB9KTtcbiAqIGBgYFxuICovXG5leHBvcnQgY2xhc3MgU29ja2V0Q2xpZW50IHtcbiAgcHJpdmF0ZSBzb2NrZXQ6IG5ldC5Tb2NrZXQ7XG4gIHByaXZhdGUgYnVmZmVyID0gJyc7XG4gIHByaXZhdGUgY29tbWFuZEhhbmRsZXI/OiAoY29tbWFuZDogU29ja2V0Q29tbWFuZCkgPT4gdm9pZDtcblxuICBwcml2YXRlIGNvbnN0cnVjdG9yKHNvY2tldDogbmV0LlNvY2tldCkge1xuICAgIHRoaXMuc29ja2V0ID0gc29ja2V0O1xuXG4gICAgc29ja2V0Lm9uKCdkYXRhJywgKGNodW5rKSA9PiB7XG4gICAgICB0aGlzLmJ1ZmZlciArPSBjaHVuay50b1N0cmluZygpO1xuICAgICAgLy8gUGFyc2UgTkRKU09OIC0gc3BsaXQgYnkgbmV3bGluZXNcbiAgICAgIGNvbnN0IGxpbmVzID0gdGhpcy5idWZmZXIuc3BsaXQoJ1xcbicpO1xuICAgICAgdGhpcy5idWZmZXIgPSBsaW5lcy5wb3AoKSA/PyAnJzsgLy8gS2VlcCBpbmNvbXBsZXRlIGxpbmUgaW4gYnVmZmVyXG5cbiAgICAgIGZvciAoY29uc3QgbGluZSBvZiBsaW5lcykge1xuICAgICAgICBpZiAobGluZS50cmltKCkgPT09ICcnKSBjb250aW51ZTtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBjb25zdCBwYXJzZWQgPSBKU09OLnBhcnNlKGxpbmUpIGFzIFNvY2tldENvbW1hbmQ7XG4gICAgICAgICAgdGhpcy5jb21tYW5kSGFuZGxlcj8uKHBhcnNlZCk7XG4gICAgICAgIH0gY2F0Y2gge1xuICAgICAgICAgIC8vIE1hbGZvcm1lZCBKU09OIG9uIHNvY2tldCBpcyBpZ25vcmVkIChwZXIgcGxhbilcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIENvbm5lY3QgdG8gYSBVbml4IGRvbWFpbiBzb2NrZXQgYXQgdGhlIGdpdmVuIHBhdGguXG4gICAqXG4gICAqIEBwYXJhbSBzb2NrZXRQYXRoIC0gUGF0aCB0byB0aGUgVW5peCBkb21haW4gc29ja2V0XG4gICAqIEByZXR1cm5zIEEgY29ubmVjdGVkIFNvY2tldENsaWVudCBpbnN0YW5jZVxuICAgKiBAdGhyb3dzIEVycm9yIGlmIHRoZSBjb25uZWN0aW9uIGZhaWxzXG4gICAqL1xuICBzdGF0aWMgY29ubmVjdChzb2NrZXRQYXRoOiBzdHJpbmcpOiBQcm9taXNlPFNvY2tldENsaWVudD4ge1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICBjb25zdCBzb2NrZXQgPSBuZXQuY3JlYXRlQ29ubmVjdGlvbihzb2NrZXRQYXRoLCAoKSA9PiB7XG4gICAgICAgIHJlc29sdmUobmV3IFNvY2tldENsaWVudChzb2NrZXQpKTtcbiAgICAgIH0pO1xuICAgICAgc29ja2V0Lm9uKCdlcnJvcicsIHJlamVjdCk7XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogUmVnaXN0ZXIgYSBoYW5kbGVyIGZvciBpbmNvbWluZyBzb2NrZXQgY29tbWFuZHMuXG4gICAqXG4gICAqIE9ubHkgb25lIGhhbmRsZXIgY2FuIGJlIHJlZ2lzdGVyZWQgYXQgYSB0aW1lLiBTdWJzZXF1ZW50IGNhbGxzIHJlcGxhY2VcbiAgICogdGhlIHByZXZpb3VzIGhhbmRsZXIuXG4gICAqXG4gICAqIEBwYXJhbSBoYW5kbGVyIC0gRnVuY3Rpb24gdG8gY2FsbCB3aGVuIGEgY29tbWFuZCBpcyByZWNlaXZlZFxuICAgKi9cbiAgb25Db21tYW5kKGhhbmRsZXI6IChjb21tYW5kOiBTb2NrZXRDb21tYW5kKSA9PiB2b2lkKTogdm9pZCB7XG4gICAgdGhpcy5jb21tYW5kSGFuZGxlciA9IGhhbmRsZXI7XG4gIH1cblxuICAvKipcbiAgICogU2VuZCBhIHJlc3BvbnNlIGJhY2sgdG8gdGhlIEFjdGlvbkRpc3BhdGNoZXIuXG4gICAqXG4gICAqIEBwYXJhbSByZXNwb25zZSAtIFRoZSByZXNwb25zZSB0byBzZW5kIGFzIE5ESlNPTlxuICAgKi9cbiAgc2VuZFJlc3BvbnNlKHJlc3BvbnNlOiBTd2l0Y2hUb0ludGVyYWN0aXZlUmVzcG9uc2UpOiB2b2lkIHtcbiAgICB0aGlzLnNvY2tldC53cml0ZShgJHtKU09OLnN0cmluZ2lmeShyZXNwb25zZSl9XFxuYCk7XG4gIH1cblxuICAvKipcbiAgICogU2VuZCBhIHJlc3BvbnNlIGFuZCBjYWxsIGNhbGxiYWNrIHdoZW4gZmx1c2hlZC5cbiAgICpcbiAgICogVXNlZCB0byBndWFyYW50ZWUgZmx1c2ggYmVmb3JlIHByb2Nlc3MuZXhpdC5cbiAgICpcbiAgICogQHBhcmFtIHJlc3BvbnNlIC0gVGhlIHJlc3BvbnNlIHRvIHNlbmQgYXMgTkRKU09OXG4gICAqIEBwYXJhbSBjYWxsYmFjayAtIENhbGxlZCBhZnRlciB0aGUgZGF0YSBpcyBmbHVzaGVkIHRvIHRoZSBzb2NrZXRcbiAgICovXG4gIHNlbmRSZXNwb25zZVRoZW4ocmVzcG9uc2U6IFN3aXRjaFRvSW50ZXJhY3RpdmVSZXNwb25zZSwgY2FsbGJhY2s6ICgpID0+IHZvaWQpOiB2b2lkIHtcbiAgICB0aGlzLnNvY2tldC53cml0ZShgJHtKU09OLnN0cmluZ2lmeShyZXNwb25zZSl9XFxuYCwgY2FsbGJhY2spO1xuICB9XG5cbiAgLyoqXG4gICAqIENsb3NlIHRoZSBzb2NrZXQgY29ubmVjdGlvbi5cbiAgICovXG4gIGNsb3NlKCk6IHZvaWQge1xuICAgIHRoaXMuc29ja2V0LmRlc3Ryb3koKTtcbiAgfVxufVxuIiwgIi8qKlxuICogUnVudGltZSBvcmNoZXN0cmF0aW9uIGZvciBjb21waWxlZCBDYXJkcyBhY3Rpb24gYW5kIHR5cGUgaGFuZGxlcnMuXG4gKlxuICogVGhpcyBtb2R1bGUgaXMgYnVuZGxlZCBpbnRvIGNvbXBpbGVkIGhhbmRsZXJzIGJ5IHRoZSBDTEkuIEl0IHByb3ZpZGVzIHRoZVxuICogZXhlY3V0aW9uIGhhcm5lc3MgdGhhdCByZWFkcyBoYW5kbGVyIGlucHV0IGZyb20gZW52aXJvbm1lbnQgdmFyaWFibGVzLCBzZXRzXG4gKiB1cCB0aGUgbG9nZ2VyIGNvbnRleHQsIGludm9rZXMgdGhlIHVzZXIncyBoYW5kbGVyLCBhbmQgZXhpdHMgdGhlIHByb2Nlc3NcbiAqIHdpdGggdGhlIGFwcHJvcHJpYXRlIGNvZGUuXG4gKlxuICogVGhlIHJ1bnRpbWUgaXMgZGVzaWduZWQgdG8gbmV2ZXIgcmV0dXJuIGluIG5vcm1hbCB1c2UuIEFsbCBjb2RlIHBhdGhzXG4gKiB0ZXJtaW5hdGUgd2l0aCBgcHJvY2Vzcy5leGl0KClgLiBUaGUgb25seSBleGNlcHRpb24gaXMgdGVzdCBzY2VuYXJpb3NcbiAqIHdoZXJlIGBwcm9jZXNzLmV4aXRgIGlzIG1vY2tlZC5cbiAqXG4gKiAjIyBFeGVjdXRpb24gRmxvd1xuICpcbiAqIDEuIEV4dHJhY3QgaW5wdXQgcGF5bG9hZCBmcm9tIGVudmlyb25tZW50IHZhcmlhYmxlcyBiYXNlZCBvbiBjb21tYW5kIHR5cGVcbiAqIDIuIFNldCBsb2dnZXIgY29udGV4dCB3aXRoIGNvbW1hbmQgdHlwZSBhbmQgaW5wdXRcbiAqIDMuIE9wdGlvbmFsbHkgY29ubmVjdCB0byBTT0NLRVRfUEFUSCBmb3IgY29tbWFuZCBkaXNwYXRjaCAoZmFpbC1vcGVuKVxuICogNC4gQnVpbGQgQWN0aW9uQ29udGV4dCB3aXRoIGxvZ2dlciwgY3dkLCBhbmQgc29ja2V0LWJhY2tlZCBjYWxsYmFja3NcbiAqIDUuIEludm9rZSB0aGUgY29tbWFuZCB3aXRoIGlucHV0IGFuZCBjb250ZXh0XG4gKiA2LiBPbiBzdWNjZXNzOiBjbGVhbiB1cCBzb2NrZXQgYW5kIGV4aXQgd2l0aCBjb2RlIDBcbiAqIDcuIE9uIGVycm9yOiBsb2cgZXJyb3IsIHdyaXRlIHRvIHN0ZGVyciwgY2xlYW4gdXAgYW5kIGV4aXQgd2l0aCBjb2RlIDFcbiAqXG4gKlxuICogQHN1bW1hcnkgUnVudGltZSBvcmNoZXN0cmF0aW9uIGZvciBjb21waWxlZCBDYXJkcyBhY3Rpb24gYW5kIHR5cGUgaGFuZGxlcnNcbiAqIEBtb2R1bGVcbiAqIEBzZWUge0BsaW5rIGV4ZWN1dGVDb21tYW5kfSBmb3IgdGhlIG1haW4gZW50cnkgcG9pbnRcbiAqXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogLy8gVGhpcyBpcyB3aGF0IGNvbXBpbGVkIGhhbmRsZXJzIGxvb2sgbGlrZSBpbnRlcm5hbGx5XG4gKiBpbXBvcnQgeyBleGVjdXRlQ29tbWFuZCB9IGZyb20gJ0BjYXJkcy9zZGsvY29uZmlnL3J1bnRpbWUnO1xuICogaW1wb3J0IG15Q29tbWFuZCBmcm9tICcuL215LWNvbW1hbmQuanMnO1xuICpcbiAqIGV4ZWN1dGVDb21tYW5kKG15Q29tbWFuZCk7XG4gKiBgYGBcbiAqL1xuXG5pbXBvcnQgdHlwZSB7IEFjdGlvbkNvbW1hbmQsIFR5cGVDcmVhdGVDb21tYW5kLCBUeXBlRGVsZXRlQ29tbWFuZCwgVHlwZVVwZGF0ZUNvbW1hbmQgfSBmcm9tICcuL2NvbW1hbmQtdHlwZXMuanMnO1xuaW1wb3J0IHsgQ0FSRFNfRU5WX1ZBUlMsIGV4dHJhY3RBY3Rpb25JbnB1dCwgZXh0cmFjdFR5cGVJbnB1dCB9IGZyb20gJy4vZW52LmpzJztcbmltcG9ydCB7IEVYSVRfQ09ERVMsIHdyaXRlRXJyb3IgfSBmcm9tICcuL2V4aXQtY29kZXMuanMnO1xuaW1wb3J0IHR5cGUgeyBBY3Rpb25Db250ZXh0LCBBY3Rpb25JbnB1dCwgVHlwZUhvb2tDb250ZXh0LCBUeXBlSG9va0lucHV0IH0gZnJvbSAnLi9pbnB1dHMuanMnO1xuaW1wb3J0IHsgbG9nZ2VyIH0gZnJvbSAnLi9sb2dnZXIuanMnO1xuaW1wb3J0IHR5cGUgeyBTb2NrZXRDb21tYW5kIH0gZnJvbSAnLi9zb2NrZXQtY2xpZW50LmpzJztcbmltcG9ydCB7IFNvY2tldENsaWVudCB9IGZyb20gJy4vc29ja2V0LWNsaWVudC5qcyc7XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIENvbW1hbmQgVHlwZSBVbmlvblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4vKipcbiAqIFVuaW9uIG9mIGFsbCBjb21tYW5kIHR5cGVzIHN1cHBvcnRlZCBieSB0aGUgcnVudGltZS5cbiAqXG4gKiBUaGlzIHR5cGUgdW5pb24gYWxsb3dzIHtAbGluayBleGVjdXRlQ29tbWFuZH0gdG8gYWNjZXB0IGFueSBjb21tYW5kIHJldHVybmVkIGJ5XG4gKiB0aGUgZmFjdG9yeSBmdW5jdGlvbnMuIFRoZSBydW50aW1lIGRpc3BhdGNoZXMgYmFzZWQgb24gdGhlIGBmYWN0b3J5VHlwZWBcbiAqIGRpc2NyaW1pbmFudC5cbiAqXG4gKiBOb3RlOiBUeXBlVmFsaWRhdG9yQ29tbWFuZCBpcyBleGNsdWRlZCBiZWNhdXNlIHZhbGlkYXRvcnMgdXNlIGEgZGlmZmVyZW50XG4gKiBleGVjdXRpb24gbW9kZWwgKGZpbGUtcGF0aCBwcm90b2NvbCB2aWEge0BsaW5rIGV4ZWN1dGVWYWxpZGF0aW9ufSkuXG4gKlxuICogQGludGVybmFsXG4gKi9cbnR5cGUgQW55Q29tbWFuZCA9IEFjdGlvbkNvbW1hbmQgfCBUeXBlQ3JlYXRlQ29tbWFuZCB8IFR5cGVVcGRhdGVDb21tYW5kIHwgVHlwZURlbGV0ZUNvbW1hbmQ7XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIEhlbHBlciBGdW5jdGlvbnNcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuLyoqXG4gKiBOb3JtYWxpemVzIGFuIHVua25vd24gZXJyb3IgdmFsdWUgaW50byBhIGh1bWFuLXJlYWRhYmxlIG1lc3NhZ2UuXG4gKlxuICogRXJyb3JzIGluIEphdmFTY3JpcHQgY2FuIGJlIHRocm93biB3aXRoIGFueSB2YWx1ZS4gVGhpcyBmdW5jdGlvbiBlbnN1cmVzXG4gKiB3ZSBhbHdheXMgZ2V0IGEgc3RyaW5nIG1lc3NhZ2UgcmVnYXJkbGVzcyBvZiB3aGF0IHdhcyB0aHJvd24uXG4gKlxuICogQHBhcmFtIGVycm9yIC0gVGhlIGNhdWdodCBlcnJvciB2YWx1ZSwgd2hpY2ggbWF5IG9yIG1heSBub3QgYmUgYW4gRXJyb3IgaW5zdGFuY2VcbiAqIEByZXR1cm5zIEEgc3RyaW5nIG1lc3NhZ2Ugc3VpdGFibGUgZm9yIGxvZ2dpbmcgb3IgZGlzcGxheVxuICpcbiAqIEBpbnRlcm5hbFxuICovXG5mdW5jdGlvbiBnZXRFcnJvck1lc3NhZ2UoZXJyb3I6IHVua25vd24pOiBzdHJpbmcge1xuICByZXR1cm4gZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiBTdHJpbmcoZXJyb3IpO1xufVxuXG4vKipcbiAqIENsZWFucyB1cCBsb2dnZXIgc3RhdGUgYW5kIHRlcm1pbmF0ZXMgdGhlIHByb2Nlc3MuXG4gKlxuICogVGhpcyBmdW5jdGlvbiBuZXZlciByZXR1cm5zLiBJdCBjbGVhcnMgdGhlIGxvZ2dlcidzIGNvbnRleHQsIGNsb3Nlc1xuICogb3BlbiBmaWxlIGhhbmRsZXMgdG8gZmx1c2ggcGVuZGluZyB3cml0ZXMsIGFuZCBleGl0cyB3aXRoIHRoZSBzcGVjaWZpZWRcbiAqIGNvZGUuXG4gKlxuICogQHBhcmFtIGV4aXRDb2RlIC0gVGhlIGV4aXQgY29kZSB0byBwYXNzIHRvIGBwcm9jZXNzLmV4aXQoKWBcbiAqIEByZXR1cm5zIE5ldmVyIHJldHVybnM7IHByb2Nlc3MgdGVybWluYXRlc1xuICpcbiAqIEBpbnRlcm5hbFxuICovXG5mdW5jdGlvbiBjbGVhbnVwQW5kRXhpdChleGl0Q29kZTogbnVtYmVyKTogbmV2ZXIge1xuICBsb2dnZXIuY2xlYXJDb250ZXh0KCk7XG4gIGxvZ2dlci5jbG9zZSgpO1xuICBwcm9jZXNzLmV4aXQoZXhpdENvZGUpO1xufVxuXG4vKipcbiAqIEhhbmRsZXMgZXJyb3JzIGR1cmluZyBlbnZpcm9ubWVudCB2YXJpYWJsZSBleHRyYWN0aW9uLlxuICpcbiAqIEVudmlyb25tZW50IGV4dHJhY3Rpb24gY2FuIGZhaWwgaWYgcmVxdWlyZWQgdmFyaWFibGVzIGFyZSBtaXNzaW5nIG9yXG4gKiBtYWxmb3JtZWQuIFRoaXMgcHJvdmlkZXMgdXNlci1mcmllbmRseSBlcnJvciBvdXRwdXQgYW5kIGVuc3VyZXMgcHJvcGVyXG4gKiBjbGVhbnVwIGJlZm9yZSBleGl0LlxuICpcbiAqIEBwYXJhbSBlcnJvciAtIFRoZSBlcnJvciB0aHJvd24gZHVyaW5nIGV4dHJhY3Rpb25cbiAqIEByZXR1cm5zIE5ldmVyIHJldHVybnM7IHByb2Nlc3MgdGVybWluYXRlcyB3aXRoIGVycm9yIGNvZGVcbiAqXG4gKiBAaW50ZXJuYWxcbiAqL1xuZnVuY3Rpb24gaGFuZGxlRW52RXh0cmFjdGlvbkVycm9yKGVycm9yOiB1bmtub3duKTogbmV2ZXIge1xuICBjb25zdCBtZXNzYWdlID0gZ2V0RXJyb3JNZXNzYWdlKGVycm9yKTtcbiAgbG9nZ2VyLmVycm9yKGBGYWlsZWQgdG8gZXh0cmFjdCBpbnB1dCBmcm9tIGVudmlyb25tZW50OiAke21lc3NhZ2V9YCk7XG4gIHdyaXRlRXJyb3IoYEhhbmRsZXIgZmFpbGVkOiAke21lc3NhZ2V9YCk7XG4gIGNsZWFudXBBbmRFeGl0KEVYSVRfQ09ERVMuRVJST1IpO1xufVxuXG4vKipcbiAqIEhhbmRsZXMgZXJyb3JzIHRocm93biBieSB0aGUgdXNlcidzIGNvbW1hbmQgaGFuZGxlci5cbiAqXG4gKiBXaGVuIGEgaGFuZGxlciB0aHJvd3Mgb3IgcmVqZWN0cywgd2Ugd2FudCB0byBwcm92aWRlIHVzZWZ1bCBkZWJ1Z2dpbmdcbiAqIGluZm9ybWF0aW9uLiBUaGlzIHdyaXRlcyB0aGUgZnVsbCBzdGFjayB0cmFjZSB0byBzdGRlcnIgKHdoaWNoIHRoZVxuICogZXhlY3V0aW9uIHdyYXBwZXIgY2FwdHVyZXMpIGFuZCBsb2dzIGEgc3RydWN0dXJlZCBlcnJvciBldmVudC5cbiAqXG4gKiBAcGFyYW0gZXJyb3IgLSBUaGUgZXJyb3IgdGhyb3duIG9yIHJlamVjdGlvbiByZWFzb24gZnJvbSB0aGUgaGFuZGxlclxuICogQHJldHVybnMgTmV2ZXIgcmV0dXJuczsgcHJvY2VzcyB0ZXJtaW5hdGVzIHdpdGggZXJyb3IgY29kZVxuICpcbiAqIEBpbnRlcm5hbFxuICovXG5mdW5jdGlvbiBoYW5kbGVIYW5kbGVyRXJyb3IoZXJyb3I6IHVua25vd24pOiBuZXZlciB7XG4gIGNvbnN0IGVycm9yT3V0cHV0ID0gZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IChlcnJvci5zdGFjayA/PyBlcnJvci5tZXNzYWdlKSA6IFN0cmluZyhlcnJvcik7XG4gIHByb2Nlc3Muc3RkZXJyLndyaXRlKGAke2Vycm9yT3V0cHV0fVxcbmApO1xuICBsb2dnZXIuZXJyb3IoYEhhbmRsZXIgZXJyb3I6ICR7Z2V0RXJyb3JNZXNzYWdlKGVycm9yKX1gKTtcbiAgY2xlYW51cEFuZEV4aXQoRVhJVF9DT0RFUy5FUlJPUik7XG59XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIEV4ZWN1dGUgRnVuY3Rpb25cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuLyoqXG4gKiBFeGVjdXRlcyBhIGNvbW1hbmQgaGFuZGxlciB3aXRoIGZ1bGwgcnVudGltZSBvcmNoZXN0cmF0aW9uLlxuICpcbiAqIFRoaXMgaXMgdGhlIG1haW4gZW50cnkgcG9pbnQgdGhhdCBjb21waWxlZCBoYW5kbGVycyB1c2UuIFRoZSBDTEkgZ2VuZXJhdGVzXG4gKiB3cmFwcGVyIGNvZGUgdGhhdCBpbXBvcnRzIHRoZSB1c2VyJ3MgY29tbWFuZCBhbmQgcGFzc2VzIGl0IHRvIHRoaXMgZnVuY3Rpb24uXG4gKiBGcm9tIHRoZXJlLCBleGVjdXRlQ29tbWFuZCBoYW5kbGVzIGFsbCB0aGUgY2VyZW1vbnk6IGVudmlyb25tZW50IHBhcnNpbmcsIGxvZ2dpbmdcbiAqIHNldHVwLCBoYW5kbGVyIGludm9jYXRpb24sIGVycm9yIGhhbmRsaW5nLCBhbmQgcHJvY2VzcyB0ZXJtaW5hdGlvbi5cbiAqXG4gKiBUaGUgZnVuY3Rpb24gZXhpdHMgdGhlIHByb2Nlc3MgaW4gYWxsIG5vcm1hbCBjb2RlIHBhdGhzLiBUaGUgcmV0dXJuZWRcbiAqIHByb21pc2Ugb25seSByZXNvbHZlcyBpZiBgcHJvY2Vzcy5leGl0YCBpcyBtb2NrZWQsIHdoaWNoIGhhcHBlbnMgaW4gdGVzdFxuICogc2NlbmFyaW9zLiBQcm9kdWN0aW9uIGNvZGUgc2hvdWxkIG5vdCBhd2FpdCB0aGlzIGZ1bmN0aW9uIG9yIGV4cGVjdCBpdFxuICogdG8gcmV0dXJuLlxuICpcbiAqICMjIFN1cHBvcnRlZCBDb21tYW5kIFR5cGVzXG4gKlxuICogLSAqKkFjdGlvbioqIChgYWN0aW9uYCk6IEludm9rZWQgd2hlbiBhbiBhY3Rpb24gaXMgdHJpZ2dlcmVkXG4gKiAtICoqVHlwZSBDcmVhdGUqKiAoYHR5cGVDcmVhdGVgKTogUnVucyBhZnRlciBuZXcgdHlwZWQgZmlsZSBjcmVhdGlvblxuICogLSAqKlR5cGUgVXBkYXRlKiogKGB0eXBlVXBkYXRlYCk6IFJ1bnMgYWZ0ZXIgdHlwZWQgZmlsZSBtb2RpZmljYXRpb25cbiAqIC0gKipUeXBlIERlbGV0ZSoqIChgdHlwZURlbGV0ZWApOiBSdW5zIHdoZW4gdHlwZWQgZmlsZSBpcyBkZWxldGVkXG4gKlxuICogTm90ZTogVHlwZSB2YWxpZGF0b3JzIHVzZSBhIGRpZmZlcmVudCBleGVjdXRpb24gbW9kZWwgKGZpbGUtcGF0aCBwcm90b2NvbClcbiAqIGFuZCBzaG91bGQgYmUgZXhlY3V0ZWQgdmlhIHtAbGluayBleGVjdXRlVmFsaWRhdGlvbn0gaW5zdGVhZC5cbiAqXG4gKiAjIyBFcnJvciBIYW5kbGluZ1xuICpcbiAqIEVycm9ycyBhcmUgaGFuZGxlZCBhdCB0aHJlZSBsZXZlbHM6XG4gKlxuICogMS4gKipFbnZpcm9ubWVudCBleHRyYWN0aW9uIGVycm9ycyoqIChtaXNzaW5nL2ludmFsaWQgdmFyaWFibGVzKTogTG9nIHRoZVxuICogICAgZXJyb3IgYW5kIGV4aXQuIFRoZXNlIGluZGljYXRlIGEgcHJvYmxlbSB3aXRoIGhvdyB0aGUgaGFuZGxlciB3YXMgaW52b2tlZC5cbiAqXG4gKiAyLiAqKkhhbmRsZXIgZXJyb3JzKiogKHVzZXIgY29kZSB0aHJvd3MpOiBXcml0ZSB0aGUgc3RhY2sgdHJhY2UgdG8gc3RkZXJyLFxuICogICAgbG9nIGEgc3RydWN0dXJlZCBlcnJvciwgYW5kIGV4aXQuIFRoZSBleGVjdXRpb24gd3JhcHBlciBjYXB0dXJlcyBzdGRlcnJcbiAqICAgIGZvciBkZWJ1Z2dpbmcuXG4gKlxuICogMy4gKipVbmV4cGVjdGVkIGVycm9ycyoqOiBDYXRjaC1hbGwgZm9yIGFueSBvdGhlciBmYWlsdXJlcyBkdXJpbmcgcnVudGltZVxuICogICAgb3JjaGVzdHJhdGlvbi5cbiAqXG4gKiBAcGFyYW0gY29tbWFuZCAtIFRoZSBjb21tYW5kIHRvIGV4ZWN1dGUsIHJldHVybmVkIGZyb20gYSBmYWN0b3J5IGZ1bmN0aW9uXG4gKiBAcmV0dXJucyBBIHByb21pc2UgdGhhdCByZXNvbHZlcyBvbmx5IHdoZW4gYHByb2Nlc3MuZXhpdGAgaXMgbW9ja2VkICh0ZXN0cylcbiAqXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogLy8gR2VuZXJhdGVkIHdyYXBwZXIgY29kZSAocHJvZHVjZWQgYnkgQ0xJKVxuICogaW1wb3J0IHsgZXhlY3V0ZUNvbW1hbmQgfSBmcm9tICdAY2FyZHMvc2RrL2NvbmZpZy9ydW50aW1lJztcbiAqIGltcG9ydCBjb21tYW5kIGZyb20gJy4vdXNlci1jb21tYW5kLmpzJztcbiAqXG4gKiAvLyBUaGlzIGNhbGwgbmV2ZXIgcmV0dXJucyBpbiBwcm9kdWN0aW9uXG4gKiBleGVjdXRlQ29tbWFuZChjb21tYW5kKTtcbiAqIGBgYFxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZXhlY3V0ZUNvbW1hbmQoY29tbWFuZDogQW55Q29tbWFuZCk6IFByb21pc2U8dm9pZD4ge1xuICB0cnkge1xuICAgIGxldCBpbnB1dDogQWN0aW9uSW5wdXQgfCBUeXBlSG9va0lucHV0O1xuXG4gICAgdHJ5IHtcbiAgICAgIGlmIChjb21tYW5kLmZhY3RvcnlUeXBlID09PSAnYWN0aW9uJykge1xuICAgICAgICBpbnB1dCA9IGV4dHJhY3RBY3Rpb25JbnB1dCgpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaW5wdXQgPSBleHRyYWN0VHlwZUlucHV0KCk7XG4gICAgICB9XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIHJldHVybiBoYW5kbGVFbnZFeHRyYWN0aW9uRXJyb3IoZXJyb3IpO1xuICAgIH1cblxuICAgIC8vIFNldCBsb2dnZXIgY29udGV4dCB3aXRoIGNvbW1hbmQgdHlwZVxuICAgIGxvZ2dlci5zZXRDb250ZXh0KGNvbW1hbmQuZmFjdG9yeVR5cGUsIHsgLi4uaW5wdXQgfSk7XG5cbiAgICBpZiAoY29tbWFuZC5mYWN0b3J5VHlwZSA9PT0gJ2FjdGlvbicpIHtcbiAgICAgIC8vIFNvY2tldCBjb25uZWN0aW9uIGFuZCBBY3Rpb25Db250ZXh0IGZvciBhY3Rpb24gY29tbWFuZHNcbiAgICAgIGxldCBzb2NrZXRDbGllbnQ6IFNvY2tldENsaWVudCB8IHVuZGVmaW5lZDtcbiAgICAgIGNvbnN0IHNvY2tldFBhdGggPSBwcm9jZXNzLmVudltDQVJEU19FTlZfVkFSUy5TT0NLRVRfUEFUSF07XG4gICAgICBpZiAoc29ja2V0UGF0aCkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgIHNvY2tldENsaWVudCA9IGF3YWl0IFNvY2tldENsaWVudC5jb25uZWN0KHNvY2tldFBhdGgpO1xuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgIGxvZ2dlci53YXJuKGBGYWlsZWQgdG8gY29ubmVjdCB0byBzb2NrZXQgYXQgJHtzb2NrZXRQYXRofTogJHtnZXRFcnJvck1lc3NhZ2UoZXJyb3IpfWApO1xuICAgICAgICAgIC8vIEZhaWwtb3BlbjogY29udGludWUgd2l0aG91dCBzb2NrZXRcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICAvLyBDYWxsYmFjayByZWdpc3RyYXRpb24gc3RhdGVcbiAgICAgIGxldCBjYW5jZWxDYWxsYmFjazogKCgpID0+IHZvaWQgfCBQcm9taXNlPHZvaWQ+KSB8IHVuZGVmaW5lZDtcbiAgICAgIGxldCBzd2l0Y2hUb0ludGVyYWN0aXZlQ2FsbGJhY2s6ICgoKSA9PiB1bmtub3duIHwgUHJvbWlzZTx1bmtub3duPikgfCB1bmRlZmluZWQ7XG4gICAgICBsZXQgY29tbWFuZFByb2Nlc3NlZCA9IGZhbHNlO1xuXG4gICAgICAvLyBCdWlsZCBBY3Rpb25Db250ZXh0IHdpdGggbG9nZ2VyLCBjd2QsIGFuZCBzb2NrZXQtYmFja2VkIGNhbGxiYWNrc1xuICAgICAgY29uc3QgY29udGV4dDogQWN0aW9uQ29udGV4dCA9IHtcbiAgICAgICAgbG9nZ2VyLFxuICAgICAgICBjd2Q6IHByb2Nlc3MuY3dkKCksXG4gICAgICAgIG9uQ2FuY2VsOiAoY2FsbGJhY2spID0+IHtcbiAgICAgICAgICBjYW5jZWxDYWxsYmFjayA9IGNhbGxiYWNrO1xuICAgICAgICB9LFxuICAgICAgICBvblN3aXRjaFRvSW50ZXJhY3RpdmU6IChjYWxsYmFjaykgPT4ge1xuICAgICAgICAgIHN3aXRjaFRvSW50ZXJhY3RpdmVDYWxsYmFjayA9IGNhbGxiYWNrO1xuICAgICAgICB9XG4gICAgICB9O1xuXG4gICAgICAvLyBXaXJlIHNvY2tldCBjb21tYW5kIGRpc3BhdGNoXG4gICAgICBpZiAoc29ja2V0Q2xpZW50KSB7XG4gICAgICAgIHNvY2tldENsaWVudC5vbkNvbW1hbmQoKGNtZDogU29ja2V0Q29tbWFuZCkgPT4ge1xuICAgICAgICAgIC8vIEZpcnN0LXdpbnMgc2VtYW50aWNzOiBpZ25vcmUgc3Vic2VxdWVudCBjb21tYW5kc1xuICAgICAgICAgIGlmIChjb21tYW5kUHJvY2Vzc2VkKSByZXR1cm47XG4gICAgICAgICAgY29tbWFuZFByb2Nlc3NlZCA9IHRydWU7XG5cbiAgICAgICAgICBpZiAoY21kLnR5cGUgPT09ICdjYW5jZWwnKSB7XG4gICAgICAgICAgICBoYW5kbGVDYW5jZWxDb21tYW5kKGNhbmNlbENhbGxiYWNrLCBzb2NrZXRDbGllbnQpO1xuICAgICAgICAgIH0gZWxzZSBpZiAoY21kLnR5cGUgPT09ICdzd2l0Y2hUb0ludGVyYWN0aXZlJykge1xuICAgICAgICAgICAgaGFuZGxlU3dpdGNoVG9JbnRlcmFjdGl2ZUNvbW1hbmQoc3dpdGNoVG9JbnRlcmFjdGl2ZUNhbGxiYWNrLCBzb2NrZXRDbGllbnQhKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgICAvLyBFeGVjdXRlIHRoZSBhY3Rpb24gY29tbWFuZCBoYW5kbGVyXG4gICAgICB0cnkge1xuICAgICAgICBhd2FpdCBjb21tYW5kKGlucHV0IGFzIEFjdGlvbklucHV0LCBjb250ZXh0KTtcbiAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgIHNvY2tldENsaWVudD8uY2xvc2UoKTtcbiAgICAgICAgcmV0dXJuIGhhbmRsZUhhbmRsZXJFcnJvcihlcnJvcik7XG4gICAgICB9XG5cbiAgICAgIC8vIENsZWFuIHVwIHNvY2tldCBhbmQgZXhpdCBzdWNjZXNzZnVsbHlcbiAgICAgIHNvY2tldENsaWVudD8uY2xvc2UoKTtcbiAgICAgIGNsZWFudXBBbmRFeGl0KEVYSVRfQ09ERVMuU1VDQ0VTUyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIFR5cGVIb29rQ29udGV4dCBmb3IgdHlwZSBsaWZlY3ljbGUgaG9va3NcbiAgICAgIGNvbnN0IGNvbnRleHQ6IFR5cGVIb29rQ29udGV4dCA9IHtcbiAgICAgICAgbG9nZ2VyLFxuICAgICAgICBjd2Q6IHByb2Nlc3MuY3dkKClcbiAgICAgIH07XG5cbiAgICAgIC8vIEV4ZWN1dGUgdGhlIHR5cGUgaG9vayBjb21tYW5kIGhhbmRsZXJcbiAgICAgIHRyeSB7XG4gICAgICAgIGF3YWl0IGNvbW1hbmQoaW5wdXQgYXMgVHlwZUhvb2tJbnB1dCwgY29udGV4dCk7XG4gICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICByZXR1cm4gaGFuZGxlSGFuZGxlckVycm9yKGVycm9yKTtcbiAgICAgIH1cblxuICAgICAgY2xlYW51cEFuZEV4aXQoRVhJVF9DT0RFUy5TVUNDRVNTKTtcbiAgICB9XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgLy8gVW5leHBlY3RlZCBlcnJvciAtIHRyeSB0byBjbGVhbiB1cCBhbmQgZXhpdFxuICAgIGxvZ2dlci5lcnJvcihgVW5leHBlY3RlZCBydW50aW1lIGVycm9yOiAke2dldEVycm9yTWVzc2FnZShlcnJvcil9YCk7XG4gICAgY2xlYW51cEFuZEV4aXQoRVhJVF9DT0RFUy5FUlJPUik7XG4gIH1cbn1cblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gU29ja2V0IENvbW1hbmQgSGFuZGxlcnNcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuLyoqXG4gKiBSZXNvbHZlcyBhIGNhbGxiYWNrIHJlc3VsdCB0aGF0IG1heSBiZSBzeW5jIG9yIGFzeW5jIGludG8gYSBQcm9taXNlLlxuICpcbiAqIFVzZXItcmVnaXN0ZXJlZCBjYWxsYmFja3MgbWF5IHJldHVybiB2b2lkLCBhIHZhbHVlLCBvciBhIFByb21pc2UuXG4gKiBUaGlzIG5vcm1hbGl6ZXMgYWxsIGNhc2VzIGludG8gYSBzaW5nbGUgUHJvbWlzZSBmb3IgY29uc2lzdGVudCBoYW5kbGluZy5cbiAqXG4gKiBAcGFyYW0gcmVzdWx0IC0gQ2FsbGJhY2sgcmV0dXJuIHZhbHVlIHRoYXQgbWF5IGFscmVhZHkgYmUgYSBwcm9taXNlLlxuICogQHJldHVybnMgUHJvbWlzZSByZXNvbHZpbmcgdG8gdGhlIGNhbGxiYWNrIHJlc3VsdC5cbiAqIEBpbnRlcm5hbFxuICovXG5mdW5jdGlvbiB0b1Byb21pc2U8VD4ocmVzdWx0OiBUIHwgUHJvbWlzZTxUPik6IFByb21pc2U8VD4ge1xuICBpZiAocmVzdWx0ICYmIHR5cGVvZiAocmVzdWx0IGFzIFByb21pc2U8VD4pLnRoZW4gPT09ICdmdW5jdGlvbicpIHtcbiAgICByZXR1cm4gcmVzdWx0IGFzIFByb21pc2U8VD47XG4gIH1cbiAgcmV0dXJuIFByb21pc2UucmVzb2x2ZShyZXN1bHQpO1xufVxuXG4vKipcbiAqIEhhbmRsZXMgYSBgY2FuY2VsYCBjb21tYW5kIGZyb20gdGhlIHNvY2tldC5cbiAqXG4gKiBJZiBhIGNhbmNlbCBjYWxsYmFjayB3YXMgcmVnaXN0ZXJlZCwgaXQgaXMgaW52b2tlZC4gT3RoZXJ3aXNlLCBTSUdURVJNXG4gKiBpcyBzZW50IHRvIHRoZSBjdXJyZW50IHByb2Nlc3MgYXMgYSBmYWxsYmFjay4gQWZ0ZXIgdGhlIGNhbGxiYWNrIGNvbXBsZXRlc1xuICogKG9yIGltbWVkaWF0ZWx5IGlmIG5vIGNhbGxiYWNrKSwgdGhlIHByb2Nlc3MgZXhpdHMgd2l0aCBlcnJvciBjb2RlLlxuICpcbiAqIEBwYXJhbSBjYWxsYmFjayAtIFRoZSByZWdpc3RlcmVkIGNhbmNlbCBjYWxsYmFjaywgaWYgYW55XG4gKiBAcGFyYW0gc29ja2V0Q2xpZW50IC0gVGhlIHNvY2tldCBjbGllbnQgdG8gY2xvc2UgYmVmb3JlIGV4aXRpbmdcbiAqXG4gKiBAaW50ZXJuYWxcbiAqL1xuZnVuY3Rpb24gaGFuZGxlQ2FuY2VsQ29tbWFuZChcbiAgY2FsbGJhY2s6ICgoKSA9PiB2b2lkIHwgUHJvbWlzZTx2b2lkPikgfCB1bmRlZmluZWQsXG4gIHNvY2tldENsaWVudDogU29ja2V0Q2xpZW50IHwgdW5kZWZpbmVkXG4pOiB2b2lkIHtcbiAgaWYgKCFjYWxsYmFjaykge1xuICAgIHByb2Nlc3Mua2lsbChwcm9jZXNzLnBpZCwgJ1NJR1RFUk0nKTtcbiAgICByZXR1cm47XG4gIH1cblxuICB0b1Byb21pc2UoY2FsbGJhY2soKSkudGhlbihcbiAgICAoKSA9PiB7XG4gICAgICBzb2NrZXRDbGllbnQ/LmNsb3NlKCk7XG4gICAgICBjbGVhbnVwQW5kRXhpdChFWElUX0NPREVTLkVSUk9SKTtcbiAgICB9LFxuICAgICgpID0+IHtcbiAgICAgIHNvY2tldENsaWVudD8uY2xvc2UoKTtcbiAgICAgIGNsZWFudXBBbmRFeGl0KEVYSVRfQ09ERVMuRVJST1IpO1xuICAgIH1cbiAgKTtcbn1cblxuLyoqXG4gKiBIYW5kbGVzIGEgYHN3aXRjaFRvSW50ZXJhY3RpdmVgIGNvbW1hbmQgZnJvbSB0aGUgc29ja2V0LlxuICpcbiAqIElmIG5vIGNhbGxiYWNrIHdhcyByZWdpc3RlcmVkLCB0aGUgY29tbWFuZCBpcyBpZ25vcmVkIChuby1vcCkuIE90aGVyd2lzZSxcbiAqIHRoZSBjYWxsYmFjayBpcyBpbnZva2VkIGFuZCBpdHMgcmV0dXJuIHZhbHVlIGlzIHNlbnQgYXNcbiAqIGBzd2l0Y2hUb0ludGVyYWN0aXZlUmVzcG9uc2VgIG9uIHRoZSBzb2NrZXQuIGBwcm9jZXNzLmV4aXQoNDIpYCBpcyBjYWxsZWRcbiAqIGluc2lkZSB0aGUgYHdyaXRlKClgIGNhbGxiYWNrIHRvIGd1YXJhbnRlZSB0aGUgcmVzcG9uc2UgaXMgZmx1c2hlZCBiZWZvcmVcbiAqIHRoZSBldmVudCBsb29wIHRlYXJzIGRvd24uXG4gKlxuICogQHBhcmFtIGNhbGxiYWNrIC0gVGhlIHJlZ2lzdGVyZWQgc3dpdGNoVG9JbnRlcmFjdGl2ZSBjYWxsYmFjaywgaWYgYW55XG4gKiBAcGFyYW0gc29ja2V0Q2xpZW50IC0gVGhlIHNvY2tldCBjbGllbnQgdXNlZCB0byBzZW5kIHRoZSByZXNwb25zZVxuICpcbiAqIEBpbnRlcm5hbFxuICovXG5mdW5jdGlvbiBoYW5kbGVTd2l0Y2hUb0ludGVyYWN0aXZlQ29tbWFuZChcbiAgY2FsbGJhY2s6ICgoKSA9PiB1bmtub3duIHwgUHJvbWlzZTx1bmtub3duPikgfCB1bmRlZmluZWQsXG4gIHNvY2tldENsaWVudDogU29ja2V0Q2xpZW50XG4pOiB2b2lkIHtcbiAgaWYgKCFjYWxsYmFjaykge1xuICAgIHJldHVybjtcbiAgfVxuXG4gIHRvUHJvbWlzZShjYWxsYmFjaygpKS50aGVuKFxuICAgIChkYXRhKSA9PiB7XG4gICAgICBzb2NrZXRDbGllbnQuc2VuZFJlc3BvbnNlVGhlbih7IHR5cGU6ICdzd2l0Y2hUb0ludGVyYWN0aXZlUmVzcG9uc2UnLCBkYXRhIH0sICgpID0+IHtcbiAgICAgICAgY2xlYW51cEFuZEV4aXQoRVhJVF9DT0RFUy5TV0lUQ0hfVE9fSU5URVJBQ1RJVkUpO1xuICAgICAgfSk7XG4gICAgfSxcbiAgICAoZXJyb3IpID0+IHtcbiAgICAgIGxvZ2dlci5lcnJvcihgc3dpdGNoVG9JbnRlcmFjdGl2ZSBjYWxsYmFjayBlcnJvcjogJHtnZXRFcnJvck1lc3NhZ2UoZXJyb3IpfWApO1xuICAgICAgc29ja2V0Q2xpZW50LmNsb3NlKCk7XG4gICAgICBjbGVhbnVwQW5kRXhpdChFWElUX0NPREVTLkVSUk9SKTtcbiAgICB9XG4gICk7XG59XG4iLCAiLyoqXG4gKiBTaGFyZWQgc2Vzc2lvbiB1dGlsaXRpZXMgZm9yIENsYXVkZSBDb2RlIGFjdGlvbiB3b3JrZmxvd3MuXG4gKlxuICogUHJvdmlkZXMgcmV1c2FibGUgYnVpbGRpbmcgYmxvY2tzIGZvciBhY3Rpb25zIHRoYXQgc3Bhd24gdGhlIGBjbGF1ZGVgIENMSTpcbiAqIHBsdWdpbiBzZXR0aW5ncyBjb25zdHJ1Y3Rpb24sIENMSSBhcmcgYnVpbGRpbmcsIHdvcmt0cmVlIGxpZmVjeWNsZSBtYW5hZ2VtZW50LFxuICogYW5kIGJyYW5jaCBjbGVhbnVwLiBCb3RoIHRoZSBgbGF1bmNoYCBhbmQgYGludGVydmlld2AgYWN0aW9ucyBjb25zdW1lIHRoZXNlXG4gKiB1dGlsaXRpZXMuXG4gKlxuICogQHN1bW1hcnkgU2hhcmVkIHNlc3Npb24gdXRpbGl0aWVzIGZvciBDbGF1ZGUgQ29kZSBhY3Rpb24gd29ya2Zsb3dzXG4gKiBAbW9kdWxlXG4gKi9cblxuaW1wb3J0IHsgdHlwZSBDaGlsZFByb2Nlc3MsIGV4ZWNGaWxlLCBzcGF3biB9IGZyb20gJ25vZGU6Y2hpbGRfcHJvY2Vzcyc7XG5pbXBvcnQgKiBhcyBmcyBmcm9tICdub2RlOmZzL3Byb21pc2VzJztcbmltcG9ydCAqIGFzIHBhdGggZnJvbSAnbm9kZTpwYXRoJztcbmltcG9ydCB7IHByb21pc2lmeSB9IGZyb20gJ25vZGU6dXRpbCc7XG5pbXBvcnQgeyBDYXJkc0NsaWVudCB9IGZyb20gJ0BjYXJkcy9zZGsvY2xpZW50JztcbmltcG9ydCB7IHR5cGUgQWN0aW9uQ29udGV4dCwgdHlwZSBBY3Rpb25JbnB1dCwgQ0FSRFNfRU5WX1ZBUlMgfSBmcm9tICdAY2FyZHMvc2RrL2NvbmZpZyc7XG5pbXBvcnQgeyByZXNvbHZlQ2xhdWRlQ29uZmlnRGlyLCB1cGRhdGVNYXJrZXRwbGFjZVJlZ2lzdHJhdGlvbiB9IGZyb20gJ0BjYXJkcy9zZGsvbWFya2V0cGxhY2UnO1xuZXhwb3J0IHsgcmVzb2x2ZUNsYXVkZUNvbmZpZ0RpciwgdXBkYXRlTWFya2V0cGxhY2VSZWdpc3RyYXRpb24gfTtcblxuaW1wb3J0IHsgY2hlY2tXb3JrdHJlZUV4aXN0cywgY3JlYXRlV29ya3RyZWUsIGZpbmRHaXRSb290cyB9IGZyb20gJ0BjYXJkcy9zZGsvd29ya3RyZWUnO1xuXG5jb25zdCBleGVjRmlsZUFzeW5jID0gcHJvbWlzaWZ5KGV4ZWNGaWxlKTtcblxuLyoqXG4gKiBFeHRyYWN0cyBhIGh1bWFuLXJlYWRhYmxlIG1lc3NhZ2UgZnJvbSBhbiB1bmtub3duIGNhdGNoIHZhbHVlLlxuICogQHBhcmFtIGVycm9yIC0gVGhlIGNhdWdodCB2YWx1ZSB0byBleHRyYWN0IGEgbWVzc2FnZSBmcm9tLlxuICogQHJldHVybnMgVGhlIGVycm9yIG1lc3NhZ2Ugc3RyaW5nLlxuICovXG5leHBvcnQgZnVuY3Rpb24gZXJyb3JNZXNzYWdlKGVycm9yOiB1bmtub3duKTogc3RyaW5nIHtcbiAgcmV0dXJuIGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogU3RyaW5nKGVycm9yKTtcbn1cblxuLyoqXG4gKiBSZXNvbHZlcyB0aGUgbWFya2V0cGxhY2UgZGlyZWN0b3J5IGJ1bmRsZWQgd2l0aCB0aGUgaW5zdGFsbGVkIGV4dGVuc2lvbi5cbiAqIFVzZXMgdGhlIEVYVEVOU0lPTl9QQVRIIGVudmlyb25tZW50IHZhcmlhYmxlIGluamVjdGVkIGJ5IEFjdGlvbkRpc3BhdGNoZXIuXG4gKlxuICogQHJldHVybnMgQWJzb2x1dGUgcGF0aCB0byB0aGUgYnVuZGxlZCBtYXJrZXRwbGFjZSBkaXJlY3RvcnkuXG4gKiBAdGhyb3dzIEVycm9yIGlmIEVYVEVOU0lPTl9QQVRIIGlzIG5vdCBzZXQuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiByZXNvbHZlTWFya2V0cGxhY2VQYXRoKCk6IHN0cmluZyB7XG4gIGNvbnN0IGV4dGVuc2lvblBhdGggPSBwcm9jZXNzLmVudltDQVJEU19FTlZfVkFSUy5FWFRFTlNJT05fUEFUSF07XG4gIGlmICghZXh0ZW5zaW9uUGF0aCkge1xuICAgIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyByZXF1aXJlZCBlbnZpcm9ubWVudCB2YXJpYWJsZTogJHtDQVJEU19FTlZfVkFSUy5FWFRFTlNJT05fUEFUSH1gKTtcbiAgfVxuICByZXR1cm4gcGF0aC5qb2luKGV4dGVuc2lvblBhdGgsICdkaXN0JywgJ21hcmtldHBsYWNlJyk7XG59XG5cbi8qKlxuICogQnVpbGRzIHRoZSBgLS1zZXR0aW5nc2AgSlNPTiB0aGF0IGVuYWJsZXMgdGhlIGBydW50aW1lYCBwbHVnaW4gYW5kIHJlZ2lzdGVyc1xuICogdGhlIGBjYXJkcy5tYW5hZ2VtZW50YCBtYXJrZXRwbGFjZSBzb3VyY2Ugc28gdGhlIHNwYXduZWQgYGNsYXVkZWAgcHJvY2Vzc1xuICogY2FuIHJlc29sdmUgdGhlIHBsdWdpbiBmcm9tIHRoZSBleHRlbnNpb24ncyBidW5kbGVkIG1hcmtldHBsYWNlLlxuICpcbiAqIFVzZXMgdGhlIG1hcmtldHBsYWNlIGJ1bmRsZWQgaW5zaWRlIHRoZSBleHRlbnNpb24gaW5zdGFsbCBkaXJlY3RvcnlcbiAqIChgPEVYVEVOU0lPTl9QQVRIPi9kaXN0L21hcmtldHBsYWNlYCkgc28gdGhlIHNwYXduZWQgc2Vzc2lvbiBhbHdheXMgbG9hZHMgdGhlXG4gKiBwbHVnaW4gdmVyc2lvbiB0aGF0IHNoaXBwZWQgd2l0aCB0aGUgZXh0ZW5zaW9uLCByZWdhcmRsZXNzIG9mIHdvcmt0cmVlIHN0YXRlLlxuICpcbiAqIEBwYXJhbSBtYXJrZXRwbGFjZVBhdGggLSBBYnNvbHV0ZSBwYXRoIHRvIHRoZSBidW5kbGVkIG1hcmtldHBsYWNlIGRpcmVjdG9yeS5cbiAqIEByZXR1cm5zIFNlcmlhbGlzZWQgc2V0dGluZ3MgSlNPTiBzdHJpbmcuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBidWlsZFBsdWdpblNldHRpbmdzKG1hcmtldHBsYWNlUGF0aDogc3RyaW5nKTogc3RyaW5nIHtcbiAgcmV0dXJuIEpTT04uc3RyaW5naWZ5KHtcbiAgICBlbmFibGVkUGx1Z2luczogeyAncnVudGltZUBjYXJkcy5tYW5hZ2VtZW50JzogdHJ1ZSB9LFxuICAgIGV4dHJhS25vd25NYXJrZXRwbGFjZXM6IHtcbiAgICAgICdjYXJkcy5tYW5hZ2VtZW50Jzoge1xuICAgICAgICBzb3VyY2U6IHsgc291cmNlOiAnZGlyZWN0b3J5JywgcGF0aDogbWFya2V0cGxhY2VQYXRoIH1cbiAgICAgIH1cbiAgICB9XG4gIH0pO1xufVxuXG4vKipcbiAqIEJ1aWxkcyB0aGUgQ0xJIGFyZ3VtZW50IGxpc3QgZm9yIHRoZSBgY2xhdWRlYCBwcm9jZXNzLlxuICpcbiAqIEBwYXJhbSBwcm9tcHQgLSBUaGUgcHJvbXB0IHN0cmluZyBmb3IgbmV3IHNlc3Npb25zLlxuICogQHBhcmFtIHNlc3Npb25JZCAtIFNlc3Npb24gaWRlbnRpZmllciAodXNlZCBmb3IgYC0tc2Vzc2lvbi1pZGAgb3IgYC0tcmVzdW1lYCkuXG4gKiBAcGFyYW0gcmVzdW1lIC0gV2hlbiB0cnVlLCBwYXNzZXMgYC0tcmVzdW1lYCBpbnN0ZWFkIG9mIHN0YXJ0aW5nIGEgbmV3IHNlc3Npb24uXG4gKiBAcGFyYW0gbW9kZSAtIEV4ZWN1dGlvbiBtb2RlOyBgJ2JhY2tncm91bmQnYCBhcHBlbmRzIGAtLXByaW50YC5cbiAqIEBwYXJhbSBjYXJkUmVwb1BhdGggLSBBYnNvbHV0ZSBwYXRoIHBhc3NlZCB2aWEgYC0tYWRkLWRpcmAuXG4gKiBAcGFyYW0gbWFya2V0cGxhY2VQYXRoIC0gQWJzb2x1dGUgcGF0aCB0byB0aGUgYnVuZGxlZCBtYXJrZXRwbGFjZSBkaXJlY3RvcnkuXG4gKiBAcmV0dXJucyBBcnJheSBvZiBDTEkgYXJndW1lbnRzLlxuICovXG5leHBvcnQgZnVuY3Rpb24gYnVpbGRBcmdzKFxuICBwcm9tcHQ6IHN0cmluZyxcbiAgc2Vzc2lvbklkOiBzdHJpbmcsXG4gIHJlc3VtZTogYm9vbGVhbixcbiAgbW9kZTogQWN0aW9uSW5wdXRbJ2V4ZWN1dGlvbk1vZGUnXSxcbiAgY2FyZFJlcG9QYXRoOiBzdHJpbmcsXG4gIG1hcmtldHBsYWNlUGF0aDogc3RyaW5nXG4pOiBzdHJpbmdbXSB7XG4gIGNvbnN0IGFyZ3M6IHN0cmluZ1tdID0gW107XG5cbiAgaWYgKHJlc3VtZSkge1xuICAgIGFyZ3MucHVzaCgnLS1yZXN1bWUnLCBzZXNzaW9uSWQpO1xuICB9IGVsc2Uge1xuICAgIGFyZ3MucHVzaChwcm9tcHQpO1xuICAgIGFyZ3MucHVzaCgnLS1zZXNzaW9uLWlkJywgc2Vzc2lvbklkKTtcbiAgfVxuICBhcmdzLnB1c2goJy0tc2V0dGluZ3MnLCBidWlsZFBsdWdpblNldHRpbmdzKG1hcmtldHBsYWNlUGF0aCkpO1xuICBhcmdzLnB1c2goJy0tYWRkLWRpcicsIGNhcmRSZXBvUGF0aCk7XG4gIGlmIChtb2RlID09PSAnYmFja2dyb3VuZCcpIHtcbiAgICBhcmdzLnB1c2goJy0tcHJpbnQnKTtcbiAgfVxuXG4gIHJldHVybiBhcmdzO1xufVxuXG4vKipcbiAqIEV4dHJhY3RzIHRoZSBjYXJkIElEIGZyb20gYSBgY2FyZHMvPGNhcmRJZD4vPG4+YCBicmFuY2ggbmFtZS5cbiAqXG4gKiBAcGFyYW0gYnJhbmNoTmFtZSAtIEJyYW5jaCBuYW1lIHRvIHBhcnNlLlxuICogQHJldHVybnMgVGhlIGNhcmQgSUQsIG9yIGBudWxsYCBpZiB0aGUgYnJhbmNoIGRvZXNuJ3QgbWF0Y2ggdGhlIHBhdHRlcm4uXG4gKi9cbmZ1bmN0aW9uIGNhcmRJZEZyb21CcmFuY2goYnJhbmNoTmFtZTogc3RyaW5nKTogc3RyaW5nIHwgbnVsbCB7XG4gIGNvbnN0IG1hdGNoID0gYnJhbmNoTmFtZS5tYXRjaCgvXmNhcmRzXFwvKC4rKVxcL1xcZCskLyk7XG4gIHJldHVybiBtYXRjaD8uWzFdID8/IG51bGw7XG59XG5cbi8qKlxuICogUmVzb2x2ZXMgdGhlIGJhc2UgYnJhbmNoIGZvciB0aGUgd29ya3NwYWNlLCBmb2xsb3dpbmcgdGhlIGBwYXJlbnRCcmFuY2hgXG4gKiBjaGFpbiB3aGVuIEhFQUQgaXMgYSBgY2FyZHMvKmAgd29ya3RyZWUgYnJhbmNoLlxuICpcbiAqIENhcmQgYnJhbmNoZXMgYXJlIGVwaGVtZXJhbCBhbmQgbm90IHZhbGlkIG1lcmdlIHRhcmdldHMuIFdoZW4gdGhlIHdvcmtzcGFjZVxuICogSEVBRCBoYXBwZW5zIHRvIGJlIG9uIG9uZSAoZS5nLiwgdGhlIG1haW4gY2hlY2tvdXQgd2FzIGxlZnQgb24gYSBjYXJkXG4gKiBicmFuY2gpLCB0aGlzIGZ1bmN0aW9uIHF1ZXJpZXMgdGhlIEFQSSBmb3IgdGhhdCBicmFuY2gncyBgcGFyZW50QnJhbmNoYFxuICogYW5kIHJlY3Vyc2VzIHVudGlsIGl0IGZpbmRzIGEgbm9uLWBjYXJkcy8qYCBicmFuY2guXG4gKlxuICogQHBhcmFtIHdvcmtzcGFjZVBhdGggLSBEaXJlY3Rvcnkgd2hlcmUgYGdpdCByZXYtcGFyc2VgIHJ1bnMuXG4gKiBAcGFyYW0gY2xpZW50IC0gQ2FyZHMgQVBJIGNsaWVudCBmb3IgcmVzb2x2aW5nIHBhcmVudEJyYW5jaCBvZiBjYXJkIGJyYW5jaGVzLlxuICogQHJldHVybnMgVGhlIGZpcnN0IG5vbi1gY2FyZHMvKmAgYnJhbmNoIGluIHRoZSBwYXJlbnQgY2hhaW4uXG4gKiBAdGhyb3dzIEVycm9yIGlmIHRoZSBwYXJlbnQgY2hhaW4gY2Fubm90IGJlIHJlc29sdmVkIChtaXNzaW5nIEFQSSByZWNvcmRzLCBjeWNsZXMpLlxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcmVzb2x2ZUJhc2VCcmFuY2god29ya3NwYWNlUGF0aDogc3RyaW5nLCBjbGllbnQ/OiBDYXJkc0NsaWVudCk6IFByb21pc2U8c3RyaW5nPiB7XG4gIGNvbnN0IHsgc3Rkb3V0IH0gPSBhd2FpdCBleGVjRmlsZUFzeW5jKCdnaXQnLCBbJ3Jldi1wYXJzZScsICctLWFiYnJldi1yZWYnLCAnSEVBRCddLCB7XG4gICAgY3dkOiB3b3Jrc3BhY2VQYXRoXG4gIH0pO1xuICBsZXQgYnJhbmNoID0gc3Rkb3V0LnRyaW0oKTtcblxuICBjb25zdCB2aXNpdGVkID0gbmV3IFNldDxzdHJpbmc+KCk7XG4gIHdoaWxlIChicmFuY2guc3RhcnRzV2l0aCgnY2FyZHMvJykpIHtcbiAgICBpZiAodmlzaXRlZC5oYXMoYnJhbmNoKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBDaXJjdWxhciBwYXJlbnRCcmFuY2ggY2hhaW4gZGV0ZWN0ZWQ6ICR7Wy4uLnZpc2l0ZWQsIGJyYW5jaF0uam9pbignIFx1MjE5MiAnKX1gKTtcbiAgICB9XG4gICAgdmlzaXRlZC5hZGQoYnJhbmNoKTtcblxuICAgIGNvbnN0IGNhcmRJZCA9IGNhcmRJZEZyb21CcmFuY2goYnJhbmNoKTtcbiAgICBpZiAoIWNhcmRJZCB8fCAhY2xpZW50KSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgIGBXb3Jrc3BhY2UgSEVBRCBpcyBvbiBjYXJkIGJyYW5jaCBcIiR7YnJhbmNofVwiIGJ1dCBjYW5ub3QgcmVzb2x2ZSBpdHMgcGFyZW50LiBgICtcbiAgICAgICAgICAnU3dpdGNoIHRoZSBtYWluIGNoZWNrb3V0IHRvIGEgbm9uLWNhcmQgYnJhbmNoIChlLmcuLCBtYWluKS4nXG4gICAgICApO1xuICAgIH1cblxuICAgIGNvbnN0IHsgYnJhbmNoZXMgfSA9IGF3YWl0IGNsaWVudC5nZXRCcmFuY2hlcyhjYXJkSWQsIHsgd29ya3NwYWNlUGF0aCB9KTtcbiAgICBjb25zdCByZWNvcmQgPSBicmFuY2hlcy5maW5kKChiKSA9PiBiLm5hbWUgPT09IGJyYW5jaCk7XG4gICAgaWYgKCFyZWNvcmQ/LnBhcmVudEJyYW5jaCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICBgQ2FyZCBicmFuY2ggXCIke2JyYW5jaH1cIiBoYXMgbm8gcGFyZW50QnJhbmNoIHJlY29yZC4gYCArXG4gICAgICAgICAgJ1N3aXRjaCB0aGUgbWFpbiBjaGVja291dCB0byBhIG5vbi1jYXJkIGJyYW5jaCAoZS5nLiwgbWFpbikuJ1xuICAgICAgKTtcbiAgICB9XG5cbiAgICBicmFuY2ggPSByZWNvcmQucGFyZW50QnJhbmNoO1xuICB9XG5cbiAgcmV0dXJuIGJyYW5jaDtcbn1cblxuLyoqXG4gKiBDaGVja3Mgd2hldGhlciBhIHdvcmt0cmVlIHBhdGggZXhpc3RzIG9uIGRpc2suXG4gKlxuICogQHBhcmFtIHdvcmt0cmVlUGF0aCAtIEFic29sdXRlIHBhdGggdG8gdGVzdC5cbiAqIEByZXR1cm5zIFRydWUgd2hlbiB0aGUgcGF0aCBpcyBhY2Nlc3NpYmxlLlxuICovXG5hc3luYyBmdW5jdGlvbiB3b3JrdHJlZUV4aXN0c09uRGlzayh3b3JrdHJlZVBhdGg6IHN0cmluZyk6IFByb21pc2U8Ym9vbGVhbj4ge1xuICB0cnkge1xuICAgIGF3YWl0IGZzLmFjY2Vzcyh3b3JrdHJlZVBhdGgpO1xuICAgIHJldHVybiB0cnVlO1xuICB9IGNhdGNoIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbn1cblxuLyoqXG4gKiBGaW5kcyBvciBjcmVhdGVzIGEgd29ya3RyZWUgZm9yIHRoZSBjYXJkLlxuICpcbiAqIFRyaWVzIHRvIHJldXNlIGFuIGV4aXN0aW5nIGJyYW5jaCB3aG9zZSB3b3JrdHJlZSBpcyBzdGlsbCBvbiBkaXNrLiBXaGVuIG5vXG4gKiB2YWxpZCBicmFuY2ggZXhpc3RzLCBjcmVhdGVzIGEgbmV3IG9uZSBhbmQgcmVnaXN0ZXJzIGl0IHdpdGggdGhlIEFQSS5cbiAqXG4gKiBAcGFyYW0gaW5wdXQgLSBBY3Rpb24gaW5wdXQgY29udGFpbmluZyBjYXJkSWQgYW5kIHdvcmtzcGFjZSBwYXRocy5cbiAqIEBwYXJhbSBjbGllbnQgLSBDYXJkcyBBUEkgY2xpZW50IGZvciBicmFuY2ggQ1JVRC5cbiAqIEBwYXJhbSBiYXNlQnJhbmNoIC0gQ3VycmVudCBicmFuY2ggaW4gdGhlIHdvcmtzcGFjZSAodXNlZCBhcyBwYXJlbnQpLlxuICogQHBhcmFtIGxvZ2dlciAtIExvZ2dlciBmb3IgZGlhZ25vc3RpYyBvdXRwdXQuXG4gKiBAcGFyYW0gc2Vzc2lvbklkIC0gQ2xhdWRlIENvZGUgc2Vzc2lvbiBJRCBmb3J3YXJkZWQgdG8gdGhlIEFQSSBzbyB0aGUgY2FyZCByZXBvIHBvc3QtY29tbWl0IGhvb2sgY2FuIGF0dHJpYnV0ZSB0aGUgY29tbWl0LlxuICogQHJldHVybnMgV29ya3RyZWUgcGF0aCwgYnJhbmNoIG5hbWUsIGFuZCBwYXJlbnQgYnJhbmNoIG5hbWUuXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiByZXNvbHZlT3JDcmVhdGVXb3JrdHJlZShcbiAgaW5wdXQ6IEFjdGlvbklucHV0LFxuICBjbGllbnQ6IENhcmRzQ2xpZW50LFxuICBiYXNlQnJhbmNoOiBzdHJpbmcsXG4gIGxvZ2dlcjogQWN0aW9uQ29udGV4dFsnbG9nZ2VyJ10sXG4gIHNlc3Npb25JZD86IHN0cmluZ1xuKTogUHJvbWlzZTx7IHdvcmt0cmVlUGF0aDogc3RyaW5nOyBicmFuY2hOYW1lOiBzdHJpbmc7IHBhcmVudEJyYW5jaDogc3RyaW5nIH0+IHtcbiAgY29uc3QgeyBicmFuY2hlcyB9ID0gYXdhaXQgY2xpZW50LmdldEJyYW5jaGVzKGlucHV0LmNhcmRJZCwgeyB3b3Jrc3BhY2VQYXRoOiBpbnB1dC5yZXBvUm9vdCB9KTtcblxuICAvLyBTdGVwIDE6IFRyeSB0byByZXVzZSBhbiBleGlzdGluZyBicmFuY2ggd2l0aCBhIHZhbGlkIHdvcmt0cmVlIG9uIGRpc2tcbiAgZm9yIChjb25zdCBicmFuY2ggb2YgYnJhbmNoZXMpIHtcbiAgICBpZiAoIWJyYW5jaC5leGlzdHMgfHwgIWJyYW5jaC53b3JrdHJlZSkgY29udGludWU7XG4gICAgaWYgKCEoYXdhaXQgd29ya3RyZWVFeGlzdHNPbkRpc2soYnJhbmNoLndvcmt0cmVlKSkpIGNvbnRpbnVlO1xuXG4gICAgbG9nZ2VyLmluZm8oJ1JldXNpbmcgZXhpc3Rpbmcgd29ya3RyZWUnLCB7IGJyYW5jaDogYnJhbmNoLm5hbWUsIHdvcmt0cmVlOiBicmFuY2gud29ya3RyZWUgfSk7XG4gICAgcmV0dXJuIHsgd29ya3RyZWVQYXRoOiBicmFuY2gud29ya3RyZWUsIGJyYW5jaE5hbWU6IGJyYW5jaC5uYW1lLCBwYXJlbnRCcmFuY2g6IGJyYW5jaC5wYXJlbnRCcmFuY2ggfTtcbiAgfVxuXG4gIC8vIFN0ZXAgMjogVHJ5IHRvIGNyZWF0ZSBhIHdvcmt0cmVlIGZvciBhbiBleGlzdGluZyBicmFuY2ggd2hvc2Ugd29ya3RyZWVcbiAgLy8gaXMgbWlzc2luZyBmcm9tIGRpc2sgKGUuZy4gY2xlYW5lZCB1cCBieSBhIHByZXZpb3VzIHNlc3Npb24gY3Jhc2gpLlxuICBmb3IgKGNvbnN0IGJyYW5jaCBvZiBicmFuY2hlcykge1xuICAgIGlmICghYnJhbmNoLmV4aXN0cykgY29udGludWU7XG4gICAgaWYgKCFicmFuY2gubmFtZS5zdGFydHNXaXRoKGBjYXJkcy8ke2lucHV0LmNhcmRJZH0vYCkpIGNvbnRpbnVlO1xuXG4gICAgbG9nZ2VyLmluZm8oJ1JlYXR0YWNoaW5nIHdvcmt0cmVlIGZvciBleGlzdGluZyBicmFuY2gnLCB7IGJyYW5jaDogYnJhbmNoLm5hbWUgfSk7XG4gICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgY3JlYXRlV29ya3RyZWUoYnJhbmNoLm5hbWUsIHsgY3dkOiBpbnB1dC5yZXBvUm9vdCB9KTtcblxuICAgIC8vIFVwZGF0ZSB0aGUgQVBJIHJlY29yZCB3aXRoIHRoZSBuZXcgd29ya3RyZWUgcGF0aFxuICAgIGF3YWl0IGNsaWVudC5hZGRCcmFuY2goXG4gICAgICBpbnB1dC5jYXJkSWQsXG4gICAgICB7IG5hbWU6IGJyYW5jaC5uYW1lLCB3b3JrdHJlZTogcmVzdWx0Lndvcmt0cmVlLCBwYXJlbnRCcmFuY2g6IGJyYW5jaC5wYXJlbnRCcmFuY2ggfSxcbiAgICAgIHsgc2Vzc2lvbklkIH1cbiAgICApO1xuXG4gICAgcmV0dXJuIHsgd29ya3RyZWVQYXRoOiByZXN1bHQud29ya3RyZWUsIGJyYW5jaE5hbWU6IGJyYW5jaC5uYW1lLCBwYXJlbnRCcmFuY2g6IGJyYW5jaC5wYXJlbnRCcmFuY2ggfTtcbiAgfVxuXG4gIC8vIFN0ZXAgMzogTm8gdmFsaWQgZXhpc3RpbmcgYnJhbmNoIFx1MjAxNCBjcmVhdGUgbmV3IG9uZS5cbiAgLy8gVGhlIEFQSSBtYXkgYmUgb3V0IG9mIHN5bmMgd2l0aCBnaXQgKGUuZy4gYSBwcmV2aW91cyB3b3JrdHJlZSB3YXMgY3JlYXRlZFxuICAvLyBidXQgbmV2ZXIgcmVnaXN0ZXJlZCwgb3IgaXRzIEFQSSByZWNvcmQgd2FzIGRlbGV0ZWQpLiBUbyBhdm9pZCBjb2xsaWRpbmdcbiAgLy8gd2l0aCB3b3JrdHJlZXMgZ2l0IGFscmVhZHkga25vd3MgYWJvdXQsIHByb2JlIGdpdCdzIGFjdHVhbCBzdGF0ZSBhbmRcbiAgLy8gaW5jcmVtZW50IHBhc3QgYW55IG9jY3VwaWVkIHNsb3RzLlxuICBjb25zdCBwcmVmaXggPSBgY2FyZHMvJHtpbnB1dC5jYXJkSWR9L2A7XG4gIGNvbnN0IGV4aXN0aW5nTnVtYmVycyA9IGJyYW5jaGVzXG4gICAgLmZpbHRlcigoYikgPT4gYi5uYW1lLnN0YXJ0c1dpdGgocHJlZml4KSlcbiAgICAubWFwKChiKSA9PiBwYXJzZUludChiLm5hbWUuc2xpY2UocHJlZml4Lmxlbmd0aCksIDEwKSlcbiAgICAuZmlsdGVyKChuKSA9PiAhTnVtYmVyLmlzTmFOKG4pKTtcbiAgbGV0IG5leHROdW1iZXIgPSBleGlzdGluZ051bWJlcnMubGVuZ3RoID4gMCA/IE1hdGgubWF4KC4uLmV4aXN0aW5nTnVtYmVycykgKyAxIDogMTtcblxuICBjb25zdCB7IHJlcG9Sb290IH0gPSBhd2FpdCBmaW5kR2l0Um9vdHMoaW5wdXQucmVwb1Jvb3QpO1xuICB3aGlsZSAoYXdhaXQgY2hlY2tXb3JrdHJlZUV4aXN0cyhyZXBvUm9vdCwgcGF0aC5qb2luKHJlcG9Sb290LCAnLndvcmt0cmVlcycsIGAke3ByZWZpeH0ke25leHROdW1iZXJ9YCkpKSB7XG4gICAgbG9nZ2VyLndhcm4oJ1dvcmt0cmVlIGFscmVhZHkgZXhpc3RzIGluIGdpdCBidXQgbm90IGluIEFQSSwgc2tpcHBpbmcnLCB7XG4gICAgICBicmFuY2g6IGAke3ByZWZpeH0ke25leHROdW1iZXJ9YFxuICAgIH0pO1xuICAgIG5leHROdW1iZXIrKztcbiAgfVxuXG4gIGNvbnN0IGJyYW5jaE5hbWUgPSBgJHtwcmVmaXh9JHtuZXh0TnVtYmVyfWA7XG4gIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGNyZWF0ZVdvcmt0cmVlKGJyYW5jaE5hbWUsIHsgY3dkOiBpbnB1dC5yZXBvUm9vdCB9KTtcbiAgYXdhaXQgY2xpZW50LmFkZEJyYW5jaChcbiAgICBpbnB1dC5jYXJkSWQsXG4gICAgeyBuYW1lOiBicmFuY2hOYW1lLCB3b3JrdHJlZTogcmVzdWx0Lndvcmt0cmVlLCBwYXJlbnRCcmFuY2g6IGJhc2VCcmFuY2ggfSxcbiAgICB7IHNlc3Npb25JZCB9XG4gICk7XG5cbiAgbG9nZ2VyLmluZm8oJ0NyZWF0ZWQgbmV3IHdvcmt0cmVlJywgeyBicmFuY2g6IGJyYW5jaE5hbWUsIHdvcmt0cmVlOiByZXN1bHQud29ya3RyZWUgfSk7XG4gIHJldHVybiB7IHdvcmt0cmVlUGF0aDogcmVzdWx0Lndvcmt0cmVlLCBicmFuY2hOYW1lLCBwYXJlbnRCcmFuY2g6IGJhc2VCcmFuY2ggfTtcbn1cblxuLyoqXG4gKiBSdW5zIGEgc2luZ2xlIGNsZWFudXAgc3RlcCwgbG9nZ2luZyBhIHdhcm5pbmcgb24gZmFpbHVyZSByYXRoZXIgdGhhblxuICogYWJvcnRpbmcgdGhlIHN3ZWVwLiBFYWNoIHN0ZXAgKHdvcmt0cmVlIHJlbW92YWwsIGJyYW5jaCBkZWxldGlvbiwgQVBJXG4gKiByZWNvcmQgcmVtb3ZhbCkgaXMgaW5kZXBlbmRlbnQgXHUyMDE0IGEgZmFpbHVyZSBpbiBvbmUgbXVzdCBub3QgcHJldmVudCB0aGVcbiAqIG90aGVycyBmcm9tIHJ1bm5pbmcuXG4gKlxuICogQHBhcmFtIHN0ZXAgLSBBc3luYyBvcGVyYXRpb24gdG8gYXR0ZW1wdC5cbiAqIEBwYXJhbSBsYWJlbCAtIEh1bWFuLXJlYWRhYmxlIGxhYmVsIGxvZ2dlZCBvbiBmYWlsdXJlLlxuICogQHBhcmFtIGJyYW5jaE5hbWUgLSBCcmFuY2ggbmFtZSBpbmNsdWRlZCBpbiBkaWFnbm9zdGljIG91dHB1dC5cbiAqIEBwYXJhbSBsb2dnZXIgLSBMb2dnZXIgZm9yIGRpYWdub3N0aWMgb3V0cHV0LlxuICovXG5hc3luYyBmdW5jdGlvbiB0cnlDbGVhbnVwU3RlcChcbiAgc3RlcDogKCkgPT4gUHJvbWlzZTx1bmtub3duPixcbiAgbGFiZWw6IHN0cmluZyxcbiAgYnJhbmNoTmFtZTogc3RyaW5nLFxuICBsb2dnZXI6IEFjdGlvbkNvbnRleHRbJ2xvZ2dlciddXG4pOiBQcm9taXNlPHZvaWQ+IHtcbiAgdHJ5IHtcbiAgICBhd2FpdCBzdGVwKCk7XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgbG9nZ2VyLndhcm4obGFiZWwsIHsgYnJhbmNoOiBicmFuY2hOYW1lLCBlcnJvcjogZXJyb3JNZXNzYWdlKGVycm9yKSB9KTtcbiAgfVxufVxuXG4vKipcbiAqIFJlbW92ZXMgYnJhbmNoZXMgdGhhdCBhcmUgZnVsbHkgbWVyZ2VkIGludG8gdGhlaXIgcGFyZW50IGJyYW5jaC5cbiAqXG4gKiBGb3IgZWFjaCBtZXJnZWQgYnJhbmNoIHRoZSB3b3JrdHJlZSBkaXJlY3RvcnkgaXMgcmVtb3ZlZCwgdGhlIGxvY2FsIGJyYW5jaFxuICogcmVmIGlzIGRlbGV0ZWQsIGFuZCB0aGUgYnJhbmNoIHJlY29yZCBpcyByZW1vdmVkIGZyb20gdGhlIEFQSS4gV29ya3RyZWVcbiAqIHJlbW92YWwgZmFpbHVyZXMgYXJlIGxvZ2dlZCBhbmQgZG8gbm90IGJsb2NrIGJyYW5jaCBkZWxldGlvbi4gSG93ZXZlciwgdGhlXG4gKiBBUEkgcmVjb3JkIGlzIG9ubHkgcmVtb3ZlZCBhZnRlciBjb25maXJtaW5nIHRoZSBnaXQgYnJhbmNoIHdhcyBkZWxldGVkIFx1MjAxNFxuICogcmVtb3ZpbmcgdGhlIHJlY29yZCB3aGlsZSB0aGUgYnJhbmNoIHN0aWxsIGV4aXN0cyB3b3VsZCBjYXVzZSBzdWJzZXF1ZW50XG4gKiBzZXNzaW9ucyB0byBsb3NlIHRyYWNrIG9mIGl0IGFuZCBjcmVhdGUgZHVwbGljYXRlcy5cbiAqXG4gKiBFYWNoIGJyYW5jaCBpcyBjaGVja2VkIGFnYWluc3QgaXRzIG93biBgcGFyZW50QnJhbmNoYCAodGhlIGJyYW5jaCBpdCB3YXNcbiAqIGNyZWF0ZWQgZnJvbSksIG5vdCB0aGUgd29ya3NwYWNlJ3MgY3VycmVudCBIRUFELiBUaGlzIGVuc3VyZXMgYnJhbmNoZXMgYXJlXG4gKiBvbmx5IGNsZWFuZWQgdXAgd2hlbiB0cnVseSBtZXJnZWQgaW50byB0aGVpciBpbnRlbmRlZCB0YXJnZXQuXG4gKlxuICogQHBhcmFtIGlucHV0IC0gQWN0aW9uIGlucHV0IGNvbnRhaW5pbmcgY2FyZElkIGFuZCB3b3Jrc3BhY2UgcGF0aHMuXG4gKiBAcGFyYW0gY2xpZW50IC0gQ2FyZHMgQVBJIGNsaWVudCBmb3IgYnJhbmNoIHJlbW92YWwuXG4gKiBAcGFyYW0gbG9nZ2VyIC0gTG9nZ2VyIGZvciBkaWFnbm9zdGljIG91dHB1dC5cbiAqIEBwYXJhbSBzZXNzaW9uSWQgLSBDbGF1ZGUgQ29kZSBzZXNzaW9uIElEIGZvcndhcmRlZCB0byB0aGUgQVBJIHNvIHRoZSBjYXJkIHJlcG8gcG9zdC1jb21taXQgaG9vayBjYW4gYXR0cmlidXRlIHRoZSBjb21taXQuXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBjbGVhbnVwTWVyZ2VkQnJhbmNoZXMoXG4gIGlucHV0OiBBY3Rpb25JbnB1dCxcbiAgY2xpZW50OiBDYXJkc0NsaWVudCxcbiAgbG9nZ2VyOiBBY3Rpb25Db250ZXh0Wydsb2dnZXInXSxcbiAgc2Vzc2lvbklkPzogc3RyaW5nXG4pOiBQcm9taXNlPHZvaWQ+IHtcbiAgbGV0IHQwID0gcGVyZm9ybWFuY2Uubm93KCk7XG4gIGNvbnN0IHsgYnJhbmNoZXMgfSA9IGF3YWl0IGNsaWVudC5nZXRCcmFuY2hlcyhpbnB1dC5jYXJkSWQsIHsgd29ya3NwYWNlUGF0aDogaW5wdXQucmVwb1Jvb3QgfSk7XG4gIGxvZ2dlci5kZWJ1ZygnZ2V0QnJhbmNoZXMgY29tcGxldGVkJywge1xuICAgIGNhcmRJZDogaW5wdXQuY2FyZElkLFxuICAgIGJyYW5jaENvdW50OiBicmFuY2hlcy5sZW5ndGgsXG4gICAgZWxhcHNlZE1zOiBNYXRoLnJvdW5kKHBlcmZvcm1hbmNlLm5vdygpIC0gdDApXG4gIH0pO1xuXG4gIGZvciAoY29uc3QgYnJhbmNoIG9mIGJyYW5jaGVzKSB7XG4gICAgaWYgKCFicmFuY2guZXhpc3RzKSBjb250aW51ZTtcblxuICAgIC8vIFNlbGYtcmVmZXJlbnRpYWwgcGFyZW50QnJhbmNoOiBgbWVyZ2UtYmFzZSAtLWlzLWFuY2VzdG9yIFggWGAgdHJpdmlhbGx5XG4gICAgLy8gc3VjY2VlZHMsIHNvIGNsZWFudXAgd291bGQgaW5jb3JyZWN0bHkgcmVtb3ZlIHVubWVyZ2VkIHdvcmsuIFRoaXMgb2NjdXJzXG4gICAgLy8gbGVnaXRpbWF0ZWx5IGZvciBiYXNlIGJyYW5jaGVzIHJlZ2lzdGVyZWQgYnkgY2FyZCBhdHRhY2ggKGUuZy4gXCJtYWluXCJcbiAgICAvLyB3aXRoIHBhcmVudEJyYW5jaCBcIm1haW5cIikuIFNraXAgcmF0aGVyIHRoYW4gdGhyb3cgXHUyMDE0IGl0J3Mgbm90IGFjdGlvbmFibGUuXG4gICAgaWYgKGJyYW5jaC5wYXJlbnRCcmFuY2ggPT09IGJyYW5jaC5uYW1lKSB7XG4gICAgICBsb2dnZXIuZGVidWcoJ1NraXBwaW5nIGJyYW5jaCB3aXRoIHNlbGYtcmVmZXJlbnRpYWwgcGFyZW50QnJhbmNoJywgeyBicmFuY2g6IGJyYW5jaC5uYW1lIH0pO1xuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgdDAgPSBwZXJmb3JtYW5jZS5ub3coKTtcbiAgICB0cnkge1xuICAgICAgLy8gbWVyZ2UtYmFzZSAtLWlzLWFuY2VzdG9yIGV4aXRzIG5vbi16ZXJvIHdoZW4gTk9UIGFuIGFuY2VzdG9yIChub3QgbWVyZ2VkKS5cbiAgICAgIC8vIENoZWNrIGFnYWluc3QgdGhlIGJyYW5jaCdzIG93biBwYXJlbnRCcmFuY2gsIG5vdCB0aGUgd29ya3NwYWNlIEhFQUQuXG4gICAgICBhd2FpdCBleGVjRmlsZUFzeW5jKCdnaXQnLCBbJ21lcmdlLWJhc2UnLCAnLS1pcy1hbmNlc3RvcicsIGJyYW5jaC5uYW1lLCBicmFuY2gucGFyZW50QnJhbmNoXSwge1xuICAgICAgICBjd2Q6IGlucHV0LnJlcG9Sb290XG4gICAgICB9KTtcbiAgICB9IGNhdGNoIHtcbiAgICAgIC8vIEV4cGVjdGVkIGZvciB1bm1lcmdlZCBicmFuY2hlcyBcdTIwMTQgc2tpcCBjbGVhbnVwXG4gICAgICBsb2dnZXIuZGVidWcoJ0JyYW5jaCBub3QgbWVyZ2VkLCBza2lwcGluZyBjbGVhbnVwJywge1xuICAgICAgICBicmFuY2g6IGJyYW5jaC5uYW1lLFxuICAgICAgICBlbGFwc2VkTXM6IE1hdGgucm91bmQocGVyZm9ybWFuY2Uubm93KCkgLSB0MClcbiAgICAgIH0pO1xuICAgICAgY29udGludWU7XG4gICAgfVxuICAgIGxvZ2dlci5kZWJ1ZygnbWVyZ2UtYmFzZSBjaGVjayBjb21wbGV0ZWQgKG1lcmdlZCknLCB7XG4gICAgICBicmFuY2g6IGJyYW5jaC5uYW1lLFxuICAgICAgZWxhcHNlZE1zOiBNYXRoLnJvdW5kKHBlcmZvcm1hbmNlLm5vdygpIC0gdDApXG4gICAgfSk7XG5cbiAgICAvLyBCcmFuY2ggaXMgbWVyZ2VkIFx1MjAxNCBjbGVhbiB1cCB3b3JrdHJlZSwgYnJhbmNoIHJlZiwgYW5kIEFQSSByZWNvcmRcbiAgICBpZiAoYnJhbmNoLndvcmt0cmVlKSB7XG4gICAgICB0MCA9IHBlcmZvcm1hbmNlLm5vdygpO1xuICAgICAgYXdhaXQgdHJ5Q2xlYW51cFN0ZXAoXG4gICAgICAgICgpID0+IGV4ZWNGaWxlQXN5bmMoJ2dpdCcsIFsnd29ya3RyZWUnLCAncmVtb3ZlJywgJy0tZm9yY2UnLCBicmFuY2gud29ya3RyZWUhXSwgeyBjd2Q6IGlucHV0LnJlcG9Sb290IH0pLFxuICAgICAgICAnRmFpbGVkIHRvIHJlbW92ZSB3b3JrdHJlZScsXG4gICAgICAgIGJyYW5jaC5uYW1lLFxuICAgICAgICBsb2dnZXJcbiAgICAgICk7XG4gICAgICBsb2dnZXIuZGVidWcoJ1dvcmt0cmVlIHJlbW92YWwgY29tcGxldGVkJywge1xuICAgICAgICBicmFuY2g6IGJyYW5jaC5uYW1lLFxuICAgICAgICBlbGFwc2VkTXM6IE1hdGgucm91bmQocGVyZm9ybWFuY2Uubm93KCkgLSB0MClcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIHQwID0gcGVyZm9ybWFuY2Uubm93KCk7XG4gICAgbGV0IGJyYW5jaERlbGV0ZWQgPSBmYWxzZTtcbiAgICB0cnkge1xuICAgICAgYXdhaXQgZXhlY0ZpbGVBc3luYygnZ2l0JywgWydicmFuY2gnLCAnLWQnLCBicmFuY2gubmFtZV0sIHsgY3dkOiBpbnB1dC5yZXBvUm9vdCB9KTtcbiAgICAgIGJyYW5jaERlbGV0ZWQgPSB0cnVlO1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICBsb2dnZXIud2FybignRmFpbGVkIHRvIGRlbGV0ZSBicmFuY2gnLCB7IGJyYW5jaDogYnJhbmNoLm5hbWUsIGVycm9yOiBlcnJvck1lc3NhZ2UoZXJyb3IpIH0pO1xuICAgIH1cbiAgICBsb2dnZXIuZGVidWcoJ0JyYW5jaCBkZWxldGlvbiBjb21wbGV0ZWQnLCB7XG4gICAgICBicmFuY2g6IGJyYW5jaC5uYW1lLFxuICAgICAgYnJhbmNoRGVsZXRlZCxcbiAgICAgIGVsYXBzZWRNczogTWF0aC5yb3VuZChwZXJmb3JtYW5jZS5ub3coKSAtIHQwKVxuICAgIH0pO1xuXG4gICAgaWYgKGJyYW5jaERlbGV0ZWQpIHtcbiAgICAgIHQwID0gcGVyZm9ybWFuY2Uubm93KCk7XG4gICAgICBhd2FpdCB0cnlDbGVhbnVwU3RlcChcbiAgICAgICAgKCkgPT4gY2xpZW50LnJlbW92ZUJyYW5jaChpbnB1dC5jYXJkSWQsIGJyYW5jaC5uYW1lLCB7IHNlc3Npb25JZCB9KSxcbiAgICAgICAgJ0ZhaWxlZCB0byByZW1vdmUgYnJhbmNoIGZyb20gQVBJJyxcbiAgICAgICAgYnJhbmNoLm5hbWUsXG4gICAgICAgIGxvZ2dlclxuICAgICAgKTtcbiAgICAgIGxvZ2dlci5kZWJ1ZygnQVBJIGJyYW5jaCByZW1vdmFsIGNvbXBsZXRlZCcsIHtcbiAgICAgICAgYnJhbmNoOiBicmFuY2gubmFtZSxcbiAgICAgICAgZWxhcHNlZE1zOiBNYXRoLnJvdW5kKHBlcmZvcm1hbmNlLm5vdygpIC0gdDApXG4gICAgICB9KTtcblxuICAgICAgbG9nZ2VyLmluZm8oJ0NsZWFuZWQgdXAgbWVyZ2VkIGJyYW5jaCcsIHsgYnJhbmNoOiBicmFuY2gubmFtZSB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgbG9nZ2VyLmluZm8oJ1NraXBwZWQgQVBJIHJlY29yZCByZW1vdmFsIFx1MjAxNCBnaXQgYnJhbmNoIHN0aWxsIGV4aXN0cycsIHsgYnJhbmNoOiBicmFuY2gubmFtZSB9KTtcbiAgICB9XG4gIH1cbn1cblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gVW5pZmllZCBzZXNzaW9uIHNwYXduZXJcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuLyoqXG4gKiBPcHRpb25zIGZvciB7QGxpbmsgc3Bhd25DbGF1ZGVTZXNzaW9ufS5cbiAqXG4gKiBBY3Rpb25zIHByb3ZpZGUgdGhlIHZhcmlhYmxlIHBhcnRzIChwcm9tcHQsIHNlc3Npb24gaWRlbnRpdHksIHN3aXRjaC10by1cbiAqIGludGVyYWN0aXZlIHN1cHBvcnQpOyB0aGUgaGVscGVyIGhhbmRsZXMgZXZlcnl0aGluZyBlbHNlOiB3b3JrdHJlZVxuICogcmVzb2x1dGlvbiwgbWFya2V0cGxhY2UgcmVnaXN0cmF0aW9uLCBlbnYgY29uc3RydWN0aW9uLCBzcGF3biwgbGlmZWN5Y2xlXG4gKiBjYWxsYmFja3MsIGFuZCBwb3N0LWV4aXQgYnJhbmNoIGNsZWFudXAuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgQ2xhdWRlU2Vzc2lvbk9wdGlvbnMge1xuICAvKiogUHJvbXB0IHN0cmluZyBwYXNzZWQgdG8gdGhlIENsYXVkZSBDTEkuICovXG4gIHByb21wdDogc3RyaW5nO1xuICAvKiogU2Vzc2lvbiBpZGVudGlmaWVyICh1c2VkIGZvciBgLS1zZXNzaW9uLWlkYCBvciBgLS1yZXN1bWVgKS4gKi9cbiAgc2Vzc2lvbklkOiBzdHJpbmc7XG4gIC8qKiBXaGVuIHRydWUsIHBhc3NlcyBgLS1yZXN1bWVgIGluc3RlYWQgb2Ygc3RhcnRpbmcgYSBuZXcgc2Vzc2lvbi4gKi9cbiAgcmVzdW1lOiBib29sZWFuO1xuICAvKipcbiAgICogV2hlbiB0cnVlLCByZWdpc3RlcnMge0BsaW5rIEFjdGlvbkNvbnRleHQub25Td2l0Y2hUb0ludGVyYWN0aXZlfSBzb1xuICAgKiBiYWNrZ3JvdW5kLW1vZGUgc2Vzc2lvbnMgY2FuIGJlIHByb21vdGVkIHRvIGludGVyYWN0aXZlLlxuICAgKi9cbiAgc3VwcG9ydHNTd2l0Y2hUb0ludGVyYWN0aXZlOiBib29sZWFuO1xufVxuXG4vKipcbiAqIFNwYXducyBhIGBjbGF1ZGVgIENMSSBzZXNzaW9uIHdpdGggZnVsbCB3b3JrdHJlZSwgbWFya2V0cGxhY2UsIGFuZFxuICogbGlmZWN5Y2xlIG1hbmFnZW1lbnQuXG4gKlxuICogQ2VudHJhbGlzZXMgdGhlIHNwYXduIGxvZ2ljIHNoYXJlZCBieSB0aGUgYGxhdW5jaGAgYW5kIGBpbnRlcnZpZXdgXG4gKiBhY3Rpb25zIHNvIGVudmlyb25tZW50IHZhcmlhYmxlIGNvbnN0cnVjdGlvbiwgd29ya3RyZWUgcmVzb2x1dGlvbixcbiAqIG1hcmtldHBsYWNlIHJlZ2lzdHJhdGlvbiwgYW5kIHBvc3QtZXhpdCBjbGVhbnVwIGNhbm5vdCBkcmlmdCBiZXR3ZWVuXG4gKiBjYWxsZXJzLlxuICpcbiAqIFN0ZXBzOlxuICogMS4gQ3JlYXRlIHtAbGluayBDYXJkc0NsaWVudH1cbiAqIDIuIFJlc29sdmUgYmFzZSBicmFuY2ggYW5kIHdvcmt0cmVlXG4gKiAzLiBSZWdpc3RlciBtYXJrZXRwbGFjZVxuICogNC4gQnVpbGQgQ0xJIGFyZ3MgYW5kIHNwYXduIGBjbGF1ZGVgXG4gKiA1LiBXaXJlIG9uQ2FuY2VsIChhbmQgb3B0aW9uYWxseSBvblN3aXRjaFRvSW50ZXJhY3RpdmUpXG4gKiA2LiBDYXB0dXJlIHN0ZGVyciBpbiBiYWNrZ3JvdW5kIG1vZGVcbiAqIDcuIEF3YWl0IHByb2Nlc3MgZXhpdFxuICogOC4gQ2xlYW4gdXAgZnVsbHktbWVyZ2VkIGJyYW5jaGVzIChiYWNrZ3JvdW5kIG1vZGUgb25seTsgaW4gaW50ZXJhY3RpdmVcbiAqICAgIG1vZGUgdGhlIHdhdGNoZXIgYW5kIGV4dGVuc2lvbiBoYW5kbGUgY2xlYW51cCBhZnRlciB0aGUgYWN0aW9uIGV4aXRzKVxuICpcbiAqIEBwYXJhbSBpbnB1dCAtIFBhcnNlZCBhY3Rpb24gaW5wdXQgZnJvbSB0aGUgZW52aXJvbm1lbnQuXG4gKiBAcGFyYW0gY29udGV4dCAtIEFjdGlvbiBjb250ZXh0IHByb3ZpZGluZyBsb2dnZXIgYW5kIGxpZmVjeWNsZSBob29rcy5cbiAqIEBwYXJhbSBvcHRpb25zIC0gU2Vzc2lvbi1zcGVjaWZpYyBwYXJhbWV0ZXJzIChwcm9tcHQsIHNlc3Npb24gSUQsIGV0Yy4pLlxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gc3Bhd25DbGF1ZGVTZXNzaW9uKFxuICBpbnB1dDogQWN0aW9uSW5wdXQsXG4gIGNvbnRleHQ6IEFjdGlvbkNvbnRleHQsXG4gIG9wdGlvbnM6IENsYXVkZVNlc3Npb25PcHRpb25zXG4pOiBQcm9taXNlPHZvaWQ+IHtcbiAgY29uc3QgeyBwcm9tcHQsIHNlc3Npb25JZCwgcmVzdW1lLCBzdXBwb3J0c1N3aXRjaFRvSW50ZXJhY3RpdmUgfSA9IG9wdGlvbnM7XG5cbiAgY29udGV4dC5sb2dnZXIuaW5mbyhgJHtpbnB1dC5hY3Rpb25OYW1lfSBhY3Rpb24gc3RhcnRlZGAsIHtcbiAgICBjYXJkSWQ6IGlucHV0LmNhcmRJZCxcbiAgICBlbnZpcm9ubWVudDogaW5wdXQuZW52aXJvbm1lbnQsXG4gICAgZXhlY3V0aW9uTW9kZTogaW5wdXQuZXhlY3V0aW9uTW9kZSxcbiAgICBzZXNzaW9uSWRcbiAgfSk7XG5cbiAgY29uc3QgY2xpZW50ID0gbmV3IENhcmRzQ2xpZW50KHtcbiAgICBiYXNlVXJsOiBpbnB1dC5hcGlCYXNlVXJsLFxuICAgIGFjY2Vzc1Rva2VuOiBpbnB1dC5hcGlBY2Nlc3NUb2tlblxuICB9KTtcblxuICBjb25zdCBiYXNlQnJhbmNoID0gYXdhaXQgcmVzb2x2ZUJhc2VCcmFuY2goaW5wdXQucmVwb1Jvb3QsIGNsaWVudCk7XG5cbiAgY29uc3Qgd29ya3RyZWVSZXN1bHQgPSBhd2FpdCByZXNvbHZlT3JDcmVhdGVXb3JrdHJlZShpbnB1dCwgY2xpZW50LCBiYXNlQnJhbmNoLCBjb250ZXh0LmxvZ2dlciwgc2Vzc2lvbklkKTtcblxuICBjb25zdCB7IHdvcmt0cmVlUGF0aDogY3dkLCBicmFuY2hOYW1lLCBwYXJlbnRCcmFuY2ggfSA9IHdvcmt0cmVlUmVzdWx0O1xuICBjb250ZXh0LmxvZ2dlci5pbmZvKCdVc2luZyB3b3JrdHJlZScsIHsgY3dkLCBicmFuY2g6IGJyYW5jaE5hbWUsIGJhc2VCcmFuY2gsIHBhcmVudEJyYW5jaCB9KTtcblxuICBjb25zdCBtYXJrZXRwbGFjZVBhdGggPSByZXNvbHZlTWFya2V0cGxhY2VQYXRoKCk7XG4gIGF3YWl0IHVwZGF0ZU1hcmtldHBsYWNlUmVnaXN0cmF0aW9uKG1hcmtldHBsYWNlUGF0aCwgY29udGV4dC5sb2dnZXIpO1xuXG4gIGNvbnN0IGFyZ3MgPSBidWlsZEFyZ3MocHJvbXB0LCBzZXNzaW9uSWQsIHJlc3VtZSwgaW5wdXQuZXhlY3V0aW9uTW9kZSwgaW5wdXQuY2FyZFJlcG9QYXRoLCBtYXJrZXRwbGFjZVBhdGgpO1xuICBjb25zdCBpc0ludGVyYWN0aXZlID0gaW5wdXQuZXhlY3V0aW9uTW9kZSA9PT0gJ2ludGVyYWN0aXZlJztcblxuICBjb25zdCBjaGlsZDogQ2hpbGRQcm9jZXNzID0gc3Bhd24oJ2NsYXVkZScsIGFyZ3MsIHtcbiAgICBjd2QsXG4gICAgc3RkaW86IGlzSW50ZXJhY3RpdmUgPyAnaW5oZXJpdCcgOiBbJ2lnbm9yZScsICdpZ25vcmUnLCAncGlwZSddLFxuICAgIGVudjoge1xuICAgICAgLi4ucHJvY2Vzcy5lbnYsXG4gICAgICBXT1JLU1BBQ0VfUEFUSDogY3dkLFxuICAgICAgQ0xBVURFX0NPREVfVEFTS19MSVNUX0lEOiBgY2FyZHMtZXh0ZW5zaW9uLSR7aW5wdXQuY2FyZElkfWAsXG4gICAgICBDTEFVREVfQ09ERV9FWFBFUklNRU5UQUxfQUdFTlRfVEVBTVM6ICcxJyxcbiAgICAgIEJBU0VfQlJBTkNIOiBiYXNlQnJhbmNoLFxuICAgICAgUEFSRU5UX0JSQU5DSDogcGFyZW50QnJhbmNoLFxuICAgICAgV09SS1NQQUNFX0JSQU5DSDogYnJhbmNoTmFtZVxuICAgIH1cbiAgfSk7XG5cbiAgY29udGV4dC5vbkNhbmNlbCgoKSA9PiB7XG4gICAgY29udGV4dC5sb2dnZXIuaW5mbyhgJHtpbnB1dC5hY3Rpb25OYW1lfSBhY3Rpb24gY2FuY2VsbGVkLCB0ZXJtaW5hdGluZyBjbGF1ZGVgLCB7IHNlc3Npb25JZCB9KTtcbiAgICBjaGlsZC5raWxsKCdTSUdURVJNJyk7XG4gIH0pO1xuXG4gIGlmIChzdXBwb3J0c1N3aXRjaFRvSW50ZXJhY3RpdmUpIHtcbiAgICBjb250ZXh0Lm9uU3dpdGNoVG9JbnRlcmFjdGl2ZSgoKSA9PiB7XG4gICAgICBjb250ZXh0LmxvZ2dlci5pbmZvKCdTd2l0Y2hpbmcgdG8gaW50ZXJhY3RpdmUgbW9kZScsIHsgc2Vzc2lvbklkIH0pO1xuICAgICAgY2hpbGQua2lsbCgnU0lHVEVSTScpO1xuICAgICAgcmV0dXJuIHsgc2Vzc2lvbklkIH07XG4gICAgfSk7XG4gIH1cblxuICAvLyBCYWNrZ3JvdW5kIG1vZGU6IGNhcHR1cmUgc3RkZXJyIGZvciBkaWFnbm9zdGljIGxvZ2dpbmdcbiAgaWYgKCFpc0ludGVyYWN0aXZlKSB7XG4gICAgY2hpbGQuc3RkZXJyPy5vbignZGF0YScsIChjaHVuazogQnVmZmVyKSA9PiB7XG4gICAgICBjb25zdCB0ZXh0ID0gY2h1bmsudG9TdHJpbmcoKS50cmltKCk7XG4gICAgICBpZiAodGV4dCkge1xuICAgICAgICBjb250ZXh0LmxvZ2dlci53YXJuKHRleHQpO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgY29uc3QgZXhpdENvZGUgPSBhd2FpdCBuZXcgUHJvbWlzZTxudW1iZXIgfCBudWxsPigocmVzb2x2ZSkgPT4ge1xuICAgIGNoaWxkLm9uKCdjbG9zZScsIHJlc29sdmUpO1xuICB9KTtcblxuICBjb250ZXh0LmxvZ2dlci5pbmZvKGAke2lucHV0LmFjdGlvbk5hbWV9IGFjdGlvbiBjb21wbGV0ZWRgLCB7IHNlc3Npb25JZCwgZXhpdENvZGUgfSk7XG5cbiAgLy8gUG9zdC1leGl0IGNsZWFudXA6IHJlbW92ZSBmdWxseS1tZXJnZWQgYnJhbmNoZXMuXG4gIC8vIFJ1bnMgaW5saW5lIGluIGFsbCBtb2RlcyBcdTIwMTQgdGhlIHdyYXBwZXIncyBTSUdIVVAvU0lHVEVSTSBoYW5kbGVyIGVuc3VyZXNcbiAgLy8gY2xlYW51cCBjb21wbGV0ZXMgZXZlbiB3aGVuIHRoZSB0ZXJtaW5hbCBjbG9zZXMuXG4gIGNvbnN0IGNsZWFudXBTdGFydCA9IHBlcmZvcm1hbmNlLm5vdygpO1xuICB0cnkge1xuICAgIGF3YWl0IGNsZWFudXBNZXJnZWRCcmFuY2hlcyhpbnB1dCwgY2xpZW50LCBjb250ZXh0LmxvZ2dlciwgc2Vzc2lvbklkKTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBjb25zdCBtZXNzYWdlID0gZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiBTdHJpbmcoZXJyb3IpO1xuICAgIGNvbnRleHQubG9nZ2VyLndhcm4oJ1Bvc3QtZXhpdCBjbGVhbnVwIGZhaWxlZCAobm9uLWZhdGFsKScsIHsgZXJyb3I6IG1lc3NhZ2UsIHNlc3Npb25JZCB9KTtcbiAgfVxuICBjb250ZXh0LmxvZ2dlci5kZWJ1ZygnUG9zdC1leGl0IGNsZWFudXAgZmluaXNoZWQnLCB7XG4gICAgc2Vzc2lvbklkLFxuICAgIGVsYXBzZWRNczogTWF0aC5yb3VuZChwZXJmb3JtYW5jZS5ub3coKSAtIGNsZWFudXBTdGFydClcbiAgfSk7XG59XG4iLCAiLyoqXG4gKiBFcnJvciBjbGFzc2VzIGZvciB0aGUgQ2FyZHMgVjIgU0RLLlxuICpcbiAqIFRoZXNlIGVycm9ycyBub3JtYWxpemUgc2VydmVyIHJlc3BvbnNlcyBhbmQgbmV0d29yayBmYWlsdXJlcyBzbyBjYWxsZXJzIGNhblxuICogZGlzdGluZ3Vpc2ggQVBJIHZhbGlkYXRpb24gcHJvYmxlbXMgZnJvbSB0cmFuc3BvcnQgaXNzdWVzLlxuICpcbiAqXG4gKiBAc3VtbWFyeSBFcnJvciBjbGFzc2VzIGZvciB0aGUgQ2FyZHMgVjIgU0RLXG4gKiBAbW9kdWxlIHR5cGVzL2Vycm9yc1xuICovXG5cbmltcG9ydCB0eXBlIHsgRmllbGRFcnJvciB9IGZyb20gJy4uLy4uL3Byb3RvY29sL2luZGV4LmpzJztcblxuLyoqXG4gKiBFcnJvciB0aHJvd24gd2hlbiBhbiBBUEkgcmVxdWVzdCBmYWlscyB3aXRoIGFuIGVycm9yIHJlc3BvbnNlLlxuICpcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiB0cnkge1xuICogICBhd2FpdCBjbGllbnQuY3JlYXRlQ2FyZChkYXRhKTtcbiAqIH0gY2F0Y2ggKGVycm9yKSB7XG4gKiAgIGlmIChlcnJvciBpbnN0YW5jZW9mIEFwaUVycm9yKSB7XG4gKiAgICAgY29uc29sZS5lcnJvcihgQVBJIGVycm9yIFske2Vycm9yLmNvZGV9XTogJHtlcnJvci5tZXNzYWdlfWApO1xuICogICAgIGlmIChlcnJvci5maWVsZHMpIHtcbiAqICAgICAgIGVycm9yLmZpZWxkcy5mb3JFYWNoKGYgPT4gY29uc29sZS5lcnJvcihgICAke2YuZmllbGR9OiAke2YubWVzc2FnZX1gKSk7XG4gKiAgICAgfVxuICogICB9XG4gKiB9XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNsYXNzIEFwaUVycm9yIGV4dGVuZHMgRXJyb3Ige1xuICAvKipcbiAgICogQ3JlYXRlcyBhIG5ldyBBcGlFcnJvciBpbnN0YW5jZS5cbiAgICpcbiAgICogQHBhcmFtIG1lc3NhZ2UgLSBIdW1hbi1yZWFkYWJsZSBlcnJvciBtZXNzYWdlXG4gICAqIEBwYXJhbSBjb2RlIC0gTWFjaGluZS1yZWFkYWJsZSBlcnJvciBjb2RlXG4gICAqIEBwYXJhbSBmaWVsZHMgLSBPcHRpb25hbCBhcnJheSBvZiBmaWVsZC1zcGVjaWZpYyB2YWxpZGF0aW9uIGVycm9yc1xuICAgKi9cbiAgY29uc3RydWN0b3IoXG4gICAgbWVzc2FnZTogc3RyaW5nLFxuICAgIHB1YmxpYyByZWFkb25seSBjb2RlOiBzdHJpbmcsXG4gICAgcHVibGljIHJlYWRvbmx5IGZpZWxkcz86IEZpZWxkRXJyb3JbXVxuICApIHtcbiAgICBzdXBlcihtZXNzYWdlKTtcbiAgICB0aGlzLm5hbWUgPSAnQXBpRXJyb3InO1xuICB9XG59XG5cbi8qKlxuICogRXJyb3IgdGhyb3duIHdoZW4gYSBuZXR3b3JrIHJlcXVlc3QgZmFpbHMgZHVlIHRvIGNvbm5lY3Rpdml0eSBpc3N1ZXMuXG4gKlxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIHRyeSB7XG4gKiAgIGF3YWl0IGNsaWVudC5saXN0Q2FyZHMoKTtcbiAqIH0gY2F0Y2ggKGVycm9yKSB7XG4gKiAgIGlmIChlcnJvciBpbnN0YW5jZW9mIE5ldHdvcmtFcnJvcikge1xuICogICAgIGNvbnNvbGUuZXJyb3IoYE5ldHdvcmsgZXJyb3I6ICR7ZXJyb3IubWVzc2FnZX1gKTtcbiAqICAgICBpZiAoZXJyb3IuY2F1c2UpIHtcbiAqICAgICAgIGNvbnNvbGUuZXJyb3IoYENhdXNlZCBieTogJHtlcnJvci5jYXVzZS5tZXNzYWdlfWApO1xuICogICAgIH1cbiAqICAgfVxuICogfVxuICogYGBgXG4gKi9cbmV4cG9ydCBjbGFzcyBOZXR3b3JrRXJyb3IgZXh0ZW5kcyBFcnJvciB7XG4gIC8qKlxuICAgKiBDcmVhdGVzIGEgbmV3IE5ldHdvcmtFcnJvciBpbnN0YW5jZS5cbiAgICpcbiAgICogQHBhcmFtIG1lc3NhZ2UgLSBIdW1hbi1yZWFkYWJsZSBlcnJvciBtZXNzYWdlXG4gICAqIEBwYXJhbSBjYXVzZSAtIE9wdGlvbmFsIHVuZGVybHlpbmcgZXJyb3IgdGhhdCBjYXVzZWQgdGhpcyBuZXR3b3JrIGZhaWx1cmVcbiAgICovXG4gIGNvbnN0cnVjdG9yKFxuICAgIG1lc3NhZ2U6IHN0cmluZyxcbiAgICBwdWJsaWMgcmVhZG9ubHkgY2F1c2U/OiBFcnJvclxuICApIHtcbiAgICBzdXBlcihtZXNzYWdlKTtcbiAgICB0aGlzLm5hbWUgPSAnTmV0d29ya0Vycm9yJztcbiAgfVxufVxuIiwgIi8qKlxuICogSFRUUCBjbGllbnQgZm9yIHRoZSBDYXJkcyBWMiBSRVNUIEFQSS5cbiAqXG4gKlxuICogQHN1bW1hcnkgSFRUUCBjbGllbnQgZm9yIHRoZSBDYXJkcyBWMiBSRVNUIEFQSVxuICogQG1vZHVsZSBzZGsvQ2FyZHNDbGllbnRcbiAqL1xuXG5pbXBvcnQgdHlwZSB7XG4gIEFjdGlvblJlc3VsdCxcbiAgQ2FyZCxcbiAgQ29tcGFyZVJlcXVlc3QsXG4gIENvbXBhcmVTdGF0ZSxcbiAgSHR0cENsaWVudCxcbiAgU3RyZWFtTWV0YSxcbiAgVGltZWxpbmVJdGVtXG59IGZyb20gJy4uL3Byb3RvY29sL2luZGV4LmpzJztcbmltcG9ydCB0eXBlIHtcbiAgQWRkQnJhbmNoUmVxdWVzdCxcbiAgQXR0YWNobWVudFJlc3BvbnNlLFxuICBCcmFuY2hlc1Jlc3BvbnNlLFxuICBDYXJkQ3JlYXRlRGF0YSxcbiAgQ2FyZHNDbGllbnRPcHRpb25zLFxuICBDYXJkVXBkYXRlRGF0YSxcbiAgQ29tbWVudCxcbiAgQ29tbWVudENyZWF0ZURhdGEsXG4gIENvbW1lbnRVcGRhdGVEYXRhLFxuICBDb21taXRJbmZvLFxuICBHYXRlQXBwcm92YWxSZXNwb25zZSxcbiAgSW5nZXN0V3NGYWN0b3J5LFxuICBMaXN0Q2FyZHNPcHRpb25zLFxuICBTdHJlYW1SZXN1bHQsXG4gIFN0cmVhbVdyaXRlcixcbiAgU3RyZWFtV3JpdGVyT3B0aW9ucyxcbiAgVGltZWxpbmVPcHRpb25zLFxuICBUeXBlU2NoZW1hc1Jlc3BvbnNlLFxuICBXc1N0cmVhbVNlc3Npb25cbn0gZnJvbSAnLi90eXBlcy9jbGllbnQuanMnO1xuaW1wb3J0IHsgQXBpRXJyb3IsIE5ldHdvcmtFcnJvciB9IGZyb20gJy4vdHlwZXMvZXJyb3JzLmpzJztcblxuLyoqIEluaXRpYWwgcmVxdWVzdCB0aW1lb3V0IGluIG1pbGxpc2Vjb25kcyAoMyBzZWNvbmRzIHRvIGFjY29tbW9kYXRlIGdpdC1iYWNrZWQgZW5kcG9pbnRzKS4gKi9cbmNvbnN0IElOSVRJQUxfVElNRU9VVF9NUyA9IDNfMDAwO1xuXG4vKiogTWF4aW11bSByZXF1ZXN0IHRpbWVvdXQgaW4gbWlsbGlzZWNvbmRzIGFmdGVyIGV4cG9uZW50aWFsIGJhY2tvZmYuICovXG5jb25zdCBNQVhfVElNRU9VVF9NUyA9IDEwXzAwMDtcblxuLyoqIE1heGltdW0gbnVtYmVyIG9mIGF1dG9tYXRpYyByZXRyaWVzIGZvciB0aW1lb3V0IGVycm9ycyBiZWZvcmUgZ2l2aW5nIHVwLiAqL1xuY29uc3QgTUFYX1RJTUVPVVRfUkVUUklFUyA9IDI7XG5cbi8qKlxuICogVHlwZS1zYWZlIEhUVFAgY2xpZW50IGZvciB0aGUgQ2FyZHMgVjIgUkVTVCBBUEkuXG4gKlxuICogVXNlcyB0aGUgRmV0Y2ggQVBJIGJ5IGRlZmF1bHQgYW5kIHN1cHBvcnRzIGRlcGVuZGVuY3kgaW5qZWN0aW9uIG9mIGFuXG4gKiBhbHRlcm5hdGUge0BsaW5rIEh0dHBDbGllbnR9IGZvciB0ZXN0cyBvciBjdXN0b20gdHJhbnNwb3J0cy4gQWxsIHB1YmxpY1xuICogbWV0aG9kcyBzdXJmYWNlIHNlcnZlciBmYWlsdXJlcyBhcyB7QGxpbmsgQXBpRXJyb3J9IGFuZCB0cmFuc3BvcnQgZmFpbHVyZXNcbiAqIGFzIHtAbGluayBOZXR3b3JrRXJyb3J9LlxuICpcbiAqIFRoZSBkZWZhdWx0IEhUVFAgY2xpZW50IGFwcGxpZXMgYW4gZXhwb25lbnRpYWwgYmFja29mZiB0aW1lb3V0IHRvIGZldGNoXG4gKiByZXF1ZXN0czogc3RhcnRpbmcgYXQgMyBzZWNvbmRzLCBkb3VibGluZyBvbiBlYWNoIGNvbnNlY3V0aXZlIGZhaWx1cmUgdXBcbiAqIHRvIGEgMTAtc2Vjb25kIGNhcCwgYW5kIHJlc2V0dGluZyBvbiBhbnkgc3VjY2Vzc2Z1bCByZXNwb25zZS4gVGhpcyBlbnN1cmVzXG4gKiBmYXN0IGZhaWx1cmUgZGV0ZWN0aW9uIHdoZW4gdGhlIHNlcnZlciBpcyBkb3duIHdoaWxlIGFsbG93aW5nIHNsb3dlclxuICogcmVzcG9uc2VzIGR1cmluZyByZWNvdmVyeS5cbiAqXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogY29uc3QgY2xpZW50ID0gbmV3IENhcmRzQ2xpZW50KHsgYmFzZVVybDogJ2h0dHA6Ly9sb2NhbGhvc3Q6MzAwMCcsIGFjY2Vzc1Rva2VuOiAndG9rZW4nIH0pO1xuICpcbiAqIGNvbnN0IGNhcmRzID0gYXdhaXQgY2xpZW50Lmxpc3RDYXJkcyh7IHN0YXR1czogJ2FjdGl2ZScgfSk7XG4gKiBhd2FpdCBjbGllbnQudXBkYXRlQ2FyZChjYXJkSWQsIHsgc3RhdHVzOiAnZG9uZScgfSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNsYXNzIENhcmRzQ2xpZW50IHtcbiAgcHJpdmF0ZSByZWFkb25seSBfaHR0cENsaWVudD86IEh0dHBDbGllbnQ7XG5cbiAgLyoqIEN1cnJlbnQgdGltZW91dCBpbiBtaWxsaXNlY29uZHMsIGluY3JlYXNlcyB3aXRoIGNvbnNlY3V0aXZlIGZhaWx1cmVzLiAqL1xuICBwcml2YXRlIF9jdXJyZW50VGltZW91dE1zID0gSU5JVElBTF9USU1FT1VUX01TO1xuXG4gIC8qKlxuICAgKiBDcmVhdGVzIGEgbmV3IENhcmRzQ2xpZW50IGluc3RhbmNlLlxuICAgKlxuICAgKiBAcGFyYW0gb3B0aW9ucyAtIENvbmZpZ3VyYXRpb24gb3B0aW9ucyBpbmNsdWRpbmcgYmFzZSBVUkwgYW5kIGF1dGggdG9rZW4uXG4gICAqIEBwYXJhbSBodHRwQ2xpZW50IC0gT3B0aW9uYWwgSFRUUCBjbGllbnQgZm9yIGRlcGVuZGVuY3kgaW5qZWN0aW9uLlxuICAgKi9cbiAgY29uc3RydWN0b3IoXG4gICAgcHJpdmF0ZSByZWFkb25seSBvcHRpb25zOiBDYXJkc0NsaWVudE9wdGlvbnMsXG4gICAgaHR0cENsaWVudD86IEh0dHBDbGllbnRcbiAgKSB7XG4gICAgdGhpcy5faHR0cENsaWVudCA9IGh0dHBDbGllbnQ7XG4gIH1cblxuICAvKipcbiAgICogUmV0dXJucyB0aGUgYmFzZSBVUkwgdXNlZCB0byBidWlsZCBBUEkgcmVxdWVzdHMuXG4gICAqXG4gICAqIEByZXR1cm5zIFRoZSBiYXNlIFVSTCBzdHJpbmcgYXMgcHJvdmlkZWQgaW4ge0BsaW5rIENhcmRzQ2xpZW50T3B0aW9uc30uXG4gICAqL1xuICBnZXRCYXNlVXJsKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMub3B0aW9ucy5iYXNlVXJsO1xuICB9XG5cbiAgLyoqXG4gICAqIFJldHVybnMgd2hldGhlciBhbiBIVFRQIGNsaWVudCB3YXMgaW5qZWN0ZWQuXG4gICAqXG4gICAqIEByZXR1cm5zIFRydWUgaWYgYW4gSFRUUCBjbGllbnQgd2FzIHByb3ZpZGVkIGR1cmluZyBjb25zdHJ1Y3Rpb24uXG4gICAqIEBpbnRlcm5hbCBVc2VkIGZvciB0ZXN0aW5nIGRlcGVuZGVuY3kgaW5qZWN0aW9uLlxuICAgKi9cbiAgaGFzSHR0cENsaWVudCgpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5faHR0cENsaWVudCAhPT0gdW5kZWZpbmVkO1xuICB9XG4gIC8qKlxuICAgKiBSZXR1cm5zIGFuIEFib3J0U2lnbmFsIHRoYXQgZmlyZXMgYWZ0ZXIgdGhlIGN1cnJlbnQgYmFja29mZiB0aW1lb3V0LlxuICAgKiBVc2VzIGNhbGxlcidzIHNpZ25hbCBpZiBwcm92aWRlZCAoZm9yIERJL3Rlc3RpbmcpLCBvdGhlcndpc2UgYXBwbGllcyB0aGUgYmFja29mZiB0aW1lb3V0LlxuICAgKlxuICAgKiBAcGFyYW0gZXhpc3RpbmdTaWduYWwgLSBPcHRpb25hbCBjYWxsZXItcHJvdmlkZWQgc2lnbmFsIHRvIHJldXNlIGluc3RlYWQgb2YgY3JlYXRpbmcgYSB0aW1lb3V0IHNpZ25hbC5cbiAgICogQHJldHVybnMgQWJvcnRTaWduYWwgdGhhdCBjb250cm9scyByZXF1ZXN0IGNhbmNlbGxhdGlvbiBmb3IgdGhlIGN1cnJlbnQgb3BlcmF0aW9uLlxuICAgKi9cbiAgcHJpdmF0ZSBnZXRUaW1lb3V0U2lnbmFsKGV4aXN0aW5nU2lnbmFsPzogQWJvcnRTaWduYWwgfCBudWxsKTogQWJvcnRTaWduYWwge1xuICAgIGlmIChleGlzdGluZ1NpZ25hbCkgcmV0dXJuIGV4aXN0aW5nU2lnbmFsO1xuICAgIHJldHVybiBBYm9ydFNpZ25hbC50aW1lb3V0KHRoaXMuX2N1cnJlbnRUaW1lb3V0TXMpO1xuICB9XG5cbiAgLyoqXG4gICAqIFJlY29yZHMgYSBzdWNjZXNzZnVsIHJlcXVlc3QgYW5kIHJlc2V0cyB0aGUgdGltZW91dCBiYWNrb2ZmLlxuICAgKi9cbiAgcHJpdmF0ZSBvblJlcXVlc3RTdWNjZXNzKCk6IHZvaWQge1xuICAgIHRoaXMuX2N1cnJlbnRUaW1lb3V0TXMgPSBJTklUSUFMX1RJTUVPVVRfTVM7XG4gIH1cblxuICAvKipcbiAgICogUmVjb3JkcyBhIGZhaWxlZCByZXF1ZXN0IGFuZCBpbmNyZWFzZXMgdGhlIHRpbWVvdXQgdmlhIGV4cG9uZW50aWFsIGJhY2tvZmYuXG4gICAqL1xuICBwcml2YXRlIG9uUmVxdWVzdEZhaWx1cmUoKTogdm9pZCB7XG4gICAgdGhpcy5fY3VycmVudFRpbWVvdXRNcyA9IE1hdGgubWluKHRoaXMuX2N1cnJlbnRUaW1lb3V0TXMgKiAyLCBNQVhfVElNRU9VVF9NUyk7XG4gIH1cblxuICAvKipcbiAgICogRGVmYXVsdCBIVFRQIGNsaWVudCBpbXBsZW1lbnRhdGlvbiB1c2luZyBmZXRjaCArIEpTT04gcGF5bG9hZHMuXG4gICAqXG4gICAqIEVhY2ggZmV0Y2ggY2FsbCBpbmNsdWRlcyBhbiBBYm9ydFNpZ25hbC50aW1lb3V0IHRoYXQgc3RhcnRzIGF0IDMgc2Vjb25kc1xuICAgKiBhbmQgZG91YmxlcyBvbiBjb25zZWN1dGl2ZSBmYWlsdXJlcyB1cCB0byAxMCBzZWNvbmRzLlxuICAgKi9cbiAgcHJpdmF0ZSBkZWZhdWx0SHR0cENsaWVudDogSHR0cENsaWVudCA9IHtcbiAgICBnZXQ6IGFzeW5jIDxUPih1cmw6IHN0cmluZywgb3B0aW9ucz86IFJlcXVlc3RJbml0KTogUHJvbWlzZTxUPiA9PiB7XG4gICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGZldGNoKHVybCwge1xuICAgICAgICAuLi5vcHRpb25zLFxuICAgICAgICBoZWFkZXJzOiB7IC4uLnRoaXMuZ2V0SGVhZGVycygpLCAuLi5vcHRpb25zPy5oZWFkZXJzIH0sXG4gICAgICAgIHNpZ25hbDogdGhpcy5nZXRUaW1lb3V0U2lnbmFsKG9wdGlvbnM/LnNpZ25hbClcbiAgICAgIH0pO1xuICAgICAgaWYgKCFyZXNwb25zZS5vaykgdGhyb3cgcmVzcG9uc2U7XG4gICAgICByZXR1cm4gcmVzcG9uc2UuanNvbigpIGFzIFByb21pc2U8VD47XG4gICAgfSxcbiAgICBwb3N0OiBhc3luYyA8VD4odXJsOiBzdHJpbmcsIGJvZHk6IHVua25vd24sIG9wdGlvbnM/OiBSZXF1ZXN0SW5pdCk6IFByb21pc2U8VD4gPT4ge1xuICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBmZXRjaCh1cmwsIHtcbiAgICAgICAgLi4ub3B0aW9ucyxcbiAgICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICAgIGhlYWRlcnM6IHsgLi4udGhpcy5nZXRIZWFkZXJzKCksIC4uLm9wdGlvbnM/LmhlYWRlcnMgfSxcbiAgICAgICAgYm9keTogYm9keSA/IEpTT04uc3RyaW5naWZ5KGJvZHkpIDogdW5kZWZpbmVkLFxuICAgICAgICBzaWduYWw6IHRoaXMuZ2V0VGltZW91dFNpZ25hbChvcHRpb25zPy5zaWduYWwpXG4gICAgICB9KTtcbiAgICAgIGlmICghcmVzcG9uc2Uub2spIHRocm93IHJlc3BvbnNlO1xuICAgICAgcmV0dXJuIHJlc3BvbnNlLmpzb24oKSBhcyBQcm9taXNlPFQ+O1xuICAgIH0sXG4gICAgcHV0OiBhc3luYyA8VD4odXJsOiBzdHJpbmcsIGJvZHk6IHVua25vd24sIG9wdGlvbnM/OiBSZXF1ZXN0SW5pdCk6IFByb21pc2U8VD4gPT4ge1xuICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBmZXRjaCh1cmwsIHtcbiAgICAgICAgLi4ub3B0aW9ucyxcbiAgICAgICAgbWV0aG9kOiAnUFVUJyxcbiAgICAgICAgaGVhZGVyczogeyAuLi50aGlzLmdldEhlYWRlcnMoKSwgLi4ub3B0aW9ucz8uaGVhZGVycyB9LFxuICAgICAgICBib2R5OiBib2R5ID8gSlNPTi5zdHJpbmdpZnkoYm9keSkgOiB1bmRlZmluZWQsXG4gICAgICAgIHNpZ25hbDogdGhpcy5nZXRUaW1lb3V0U2lnbmFsKG9wdGlvbnM/LnNpZ25hbClcbiAgICAgIH0pO1xuICAgICAgaWYgKCFyZXNwb25zZS5vaykgdGhyb3cgcmVzcG9uc2U7XG4gICAgICByZXR1cm4gcmVzcG9uc2UuanNvbigpIGFzIFByb21pc2U8VD47XG4gICAgfSxcbiAgICBwYXRjaDogYXN5bmMgPFQ+KHVybDogc3RyaW5nLCBib2R5OiB1bmtub3duLCBvcHRpb25zPzogUmVxdWVzdEluaXQpOiBQcm9taXNlPFQ+ID0+IHtcbiAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZmV0Y2godXJsLCB7XG4gICAgICAgIC4uLm9wdGlvbnMsXG4gICAgICAgIG1ldGhvZDogJ1BBVENIJyxcbiAgICAgICAgaGVhZGVyczogeyAuLi50aGlzLmdldEhlYWRlcnMoKSwgLi4ub3B0aW9ucz8uaGVhZGVycyB9LFxuICAgICAgICBib2R5OiBib2R5ID8gSlNPTi5zdHJpbmdpZnkoYm9keSkgOiB1bmRlZmluZWQsXG4gICAgICAgIHNpZ25hbDogdGhpcy5nZXRUaW1lb3V0U2lnbmFsKG9wdGlvbnM/LnNpZ25hbClcbiAgICAgIH0pO1xuICAgICAgaWYgKCFyZXNwb25zZS5vaykgdGhyb3cgcmVzcG9uc2U7XG4gICAgICByZXR1cm4gcmVzcG9uc2UuanNvbigpIGFzIFByb21pc2U8VD47XG4gICAgfSxcbiAgICBkZWxldGU6IGFzeW5jICh1cmw6IHN0cmluZywgb3B0aW9ucz86IFJlcXVlc3RJbml0KTogUHJvbWlzZTx2b2lkPiA9PiB7XG4gICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGZldGNoKHVybCwge1xuICAgICAgICAuLi5vcHRpb25zLFxuICAgICAgICBtZXRob2Q6ICdERUxFVEUnLFxuICAgICAgICBoZWFkZXJzOiB7IC4uLnRoaXMuZ2V0SGVhZGVycygpLCAuLi5vcHRpb25zPy5oZWFkZXJzIH0sXG4gICAgICAgIHNpZ25hbDogdGhpcy5nZXRUaW1lb3V0U2lnbmFsKG9wdGlvbnM/LnNpZ25hbClcbiAgICAgIH0pO1xuICAgICAgaWYgKCFyZXNwb25zZS5vaykgdGhyb3cgcmVzcG9uc2U7XG4gICAgfVxuICB9O1xuXG4gIC8qKlxuICAgKiBHZXRzIEhUVFAgaGVhZGVycyBmb3IgSlNPTiBBUEkgcmVxdWVzdHMuXG4gICAqXG4gICAqIEByZXR1cm5zIEhlYWRlcnMgd2l0aCBKU09OIGNvbnRlbnQgdHlwZSBhbmQgb3B0aW9uYWwgYmVhcmVyIHRva2VuLlxuICAgKi9cbiAgcHJpdmF0ZSBnZXRIZWFkZXJzKCk6IEhlYWRlcnNJbml0IHtcbiAgICBjb25zdCBoZWFkZXJzOiBIZWFkZXJzSW5pdCA9IHsgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyB9O1xuICAgIGlmICh0aGlzLm9wdGlvbnMuYWNjZXNzVG9rZW4pIHtcbiAgICAgIGhlYWRlcnNbJ0F1dGhvcml6YXRpb24nXSA9IGBCZWFyZXIgJHt0aGlzLm9wdGlvbnMuYWNjZXNzVG9rZW59YDtcbiAgICB9XG4gICAgcmV0dXJuIGhlYWRlcnM7XG4gIH1cblxuICAvKipcbiAgICogR2V0cyB0aGUgSFRUUCBjbGllbnQgdG8gdXNlIGZvciByZXF1ZXN0cy5cbiAgICpcbiAgICogQHJldHVybnMgSW5qZWN0ZWQgSFRUUCBjbGllbnQgd2hlbiBwcm92aWRlZCwgb3RoZXJ3aXNlIHRoZSBkZWZhdWx0IGZldGNoLWJhc2VkIGNsaWVudC5cbiAgICovXG4gIHByaXZhdGUgZ2V0SHR0cENsaWVudCgpOiBIdHRwQ2xpZW50IHtcbiAgICByZXR1cm4gdGhpcy5faHR0cENsaWVudCA/PyB0aGlzLmRlZmF1bHRIdHRwQ2xpZW50O1xuICB9XG5cbiAgLyoqXG4gICAqIEJ1aWxkcyBhIFVSTCByZWxhdGl2ZSB0byB0aGUgY29uZmlndXJlZCBiYXNlIFVSTC5cbiAgICpcbiAgICogVW5kZWZpbmVkIGFuZCBudWxsIHF1ZXJ5IHBhcmFtcyBhcmUgb21pdHRlZC4gVmFsdWVzIGFyZSBzdHJpbmdpZmllZC5cbiAgICpcbiAgICogQHBhcmFtIHBhdGggLSBSZWxhdGl2ZSBBUEkgcGF0aCB0byBhcHBlbmQgdG8gdGhlIGNvbmZpZ3VyZWQgYmFzZSBVUkwuXG4gICAqIEBwYXJhbSBwYXJhbXMgLSBPcHRpb25hbCBxdWVyeSBwYXJhbWV0ZXJzIHRvIGVuY29kZSBvbnRvIHRoZSBVUkwuXG4gICAqIEByZXR1cm5zIEZ1bGx5LXF1YWxpZmllZCByZXF1ZXN0IFVSTCBzdHJpbmcuXG4gICAqL1xuICBwcml2YXRlIGJ1aWxkVXJsKHBhdGg6IHN0cmluZywgcGFyYW1zPzogUmVjb3JkPHN0cmluZywgdW5rbm93bj4pOiBzdHJpbmcge1xuICAgIGNvbnN0IHVybCA9IG5ldyBVUkwocGF0aCwgdGhpcy5vcHRpb25zLmJhc2VVcmwpO1xuICAgIGlmIChwYXJhbXMpIHtcbiAgICAgIGZvciAoY29uc3QgW2tleSwgdmFsdWVdIG9mIE9iamVjdC5lbnRyaWVzKHBhcmFtcykpIHtcbiAgICAgICAgaWYgKHZhbHVlICE9PSB1bmRlZmluZWQgJiYgdmFsdWUgIT09IG51bGwpIHtcbiAgICAgICAgICB1cmwuc2VhcmNoUGFyYW1zLnNldChrZXksIFN0cmluZyh2YWx1ZSkpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiB1cmwudG9TdHJpbmcoKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBXcmFwcyBhIHJlcXVlc3Qgd2l0aCBjb25zaXN0ZW50IGVycm9yIGhhbmRsaW5nLlxuICAgKlxuICAgKiBAcGFyYW0gZm4gLSBBc3luYyByZXF1ZXN0IGZ1bmN0aW9uIHRvIGV4ZWN1dGUuXG4gICAqIEByZXR1cm5zIFRoZSByZXNvbHZlZCB2YWx1ZSBmcm9tIHRoZSByZXF1ZXN0IGZ1bmN0aW9uLlxuICAgKiBAdGhyb3dzIEFwaUVycm9yIHdoZW4gdGhlIHNlcnZlciByZXNwb25kcyB3aXRoIGEgbm9uLTJ4eCBzdGF0dXMuXG4gICAqIEB0aHJvd3MgTmV0d29ya0Vycm9yIGZvciBuZXR3b3JrIGZhaWx1cmVzIG9yIHVuZXhwZWN0ZWQgZXhjZXB0aW9ucy5cbiAgICovXG4gIHByaXZhdGUgYXN5bmMgcmVxdWVzdDxUPihmbjogKCkgPT4gUHJvbWlzZTxUPik6IFByb21pc2U8VD4ge1xuICAgIGxldCBsYXN0VGltZW91dEVycm9yOiBOZXR3b3JrRXJyb3IgfCB1bmRlZmluZWQ7XG5cbiAgICBmb3IgKGxldCBhdHRlbXB0ID0gMDsgYXR0ZW1wdCA8PSBNQVhfVElNRU9VVF9SRVRSSUVTOyBhdHRlbXB0KyspIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGZuKCk7XG4gICAgICAgIHRoaXMub25SZXF1ZXN0U3VjY2VzcygpO1xuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgaWYgKGVycm9yIGluc3RhbmNlb2YgUmVzcG9uc2UpIHtcbiAgICAgICAgICAvLyBTZXJ2ZXIgcmVzcG9uZGVkIChldmVuIHdpdGggYW4gZXJyb3Igc3RhdHVzKSAtIGNvbm5lY3Rpb24gaXMgYWxpdmUsIHJlc2V0IGJhY2tvZmZcbiAgICAgICAgICB0aGlzLm9uUmVxdWVzdFN1Y2Nlc3MoKTtcbiAgICAgICAgICBsZXQgYm9keTogUmVjb3JkPHN0cmluZywgdW5rbm93bj4gPSB7fTtcbiAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgYm9keSA9IGF3YWl0IGVycm9yLmpzb24oKTtcbiAgICAgICAgICB9IGNhdGNoIChwYXJzZUVycm9yKSB7XG4gICAgICAgICAgICAvLyBTeW50YXhFcnJvciBpcyBleHBlY3RlZCB3aGVuIHNlcnZlciByZXR1cm5zIG5vbi1KU09OIGVycm9yIHJlc3BvbnNlIChlLmcuLCBIVE1MIGVycm9yIHBhZ2UpXG4gICAgICAgICAgICBpZiAoIShwYXJzZUVycm9yIGluc3RhbmNlb2YgU3ludGF4RXJyb3IpKSB7XG4gICAgICAgICAgICAgIGNvbnNvbGUud2FybignW0NhcmRzQ2xpZW50XSBVbmV4cGVjdGVkIGVycm9yIHBhcnNpbmcgZXJyb3IgcmVzcG9uc2U6JywgcGFyc2VFcnJvcik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGNvbnN0IG1lc3NhZ2UgPVxuICAgICAgICAgICAgKGJvZHlbJ2Vycm9yJ10gYXMgc3RyaW5nIHwgdW5kZWZpbmVkKSB8fCAoYm9keVsnbWVzc2FnZSddIGFzIHN0cmluZyB8IHVuZGVmaW5lZCkgfHwgZXJyb3Iuc3RhdHVzVGV4dDtcbiAgICAgICAgICBjb25zdCBjb2RlID0gKGJvZHlbJ2NvZGUnXSBhcyBzdHJpbmcgfCB1bmRlZmluZWQpIHx8IFN0cmluZyhlcnJvci5zdGF0dXMpO1xuICAgICAgICAgIGNvbnN0IGZpZWxkcyA9IGJvZHlbJ2ZpZWxkcyddIGFzIEFycmF5PHsgZmllbGQ6IHN0cmluZzsgbWVzc2FnZTogc3RyaW5nIH0+IHwgdW5kZWZpbmVkO1xuICAgICAgICAgIHRocm93IG5ldyBBcGlFcnJvcihtZXNzYWdlLCBjb2RlLCBmaWVsZHMpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gTmV0d29yayBvciB0aW1lb3V0IGZhaWx1cmUgLSBpbmNyZWFzZSBiYWNrb2ZmIGZvciBuZXh0IGF0dGVtcHRcbiAgICAgICAgdGhpcy5vblJlcXVlc3RGYWlsdXJlKCk7XG5cbiAgICAgICAgaWYgKGVycm9yIGluc3RhbmNlb2YgRE9NRXhjZXB0aW9uICYmIGVycm9yLm5hbWUgPT09ICdUaW1lb3V0RXJyb3InKSB7XG4gICAgICAgICAgbGFzdFRpbWVvdXRFcnJvciA9IG5ldyBOZXR3b3JrRXJyb3IoJ1JlcXVlc3QgdGltZWQgb3V0JywgZXJyb3IpO1xuICAgICAgICAgIC8vIFJldHJ5IG9uIHRpbWVvdXQgLSBvblJlcXVlc3RGYWlsdXJlKCkgYWxyZWFkeSBpbmNyZWFzZWQgX2N1cnJlbnRUaW1lb3V0TXNcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIE5vbi10aW1lb3V0IG5ldHdvcmsgZXJyb3JzIChETlMgZmFpbHVyZSwgY29ubmVjdGlvbiByZWZ1c2VkKSBhcmUgbm90IHJldHJpZWRcbiAgICAgICAgdGhyb3cgbmV3IE5ldHdvcmtFcnJvcignUmVxdWVzdCBmYWlsZWQnLCBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IgOiB1bmRlZmluZWQpO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIEFsbCByZXRyeSBhdHRlbXB0cyBleGhhdXN0ZWRcbiAgICB0aHJvdyBsYXN0VGltZW91dEVycm9yITtcbiAgfVxuXG4gIC8vIC0tLSBDYXJkIE9wZXJhdGlvbnMgLS0tXG5cbiAgLyoqXG4gICAqIExpc3RzIGNhcmRzIHdpdGggb3B0aW9uYWwgZmlsdGVyaW5nLlxuICAgKlxuICAgKiBAcGFyYW0gb3B0aW9ucyAtIE9wdGlvbmFsIGZpbHRlciBhbmQgcGFnaW5hdGlvbiBvcHRpb25zLlxuICAgKiBAcmV0dXJucyBQcm9taXNlIHJlc29sdmluZyB0byBtYXRjaGluZyBjYXJkcy5cbiAgICogQHRocm93cyBBcGlFcnJvciB3aGVuIHRoZSBzZXJ2ZXIgcmVzcG9uZHMgd2l0aCBhbiBlcnJvci5cbiAgICogQHRocm93cyBOZXR3b3JrRXJyb3Igd2hlbiB0aGUgcmVxdWVzdCBmYWlscyB0byByZWFjaCB0aGUgc2VydmVyLlxuICAgKi9cbiAgYXN5bmMgbGlzdENhcmRzKG9wdGlvbnM/OiBMaXN0Q2FyZHNPcHRpb25zKTogUHJvbWlzZTxDYXJkW10+IHtcbiAgICBjb25zdCB1cmxTdHIgPSB0aGlzLmJ1aWxkVXJsKCcvY2FyZHMnLCB7XG4gICAgICB3b3Jrc3BhY2VQYXRoOiB0aGlzLm9wdGlvbnMud29ya3NwYWNlUGF0aCxcbiAgICAgIHN0YXR1czogb3B0aW9ucz8uc3RhdHVzLFxuICAgICAgc2VhcmNoOiBvcHRpb25zPy5zZWFyY2gsXG4gICAgICBsaW1pdDogb3B0aW9ucz8ubGltaXQsXG4gICAgICBvZmZzZXQ6IG9wdGlvbnM/Lm9mZnNldFxuICAgIH0pO1xuICAgIGNvbnN0IHVybCA9IG5ldyBVUkwodXJsU3RyKTtcbiAgICBmb3IgKGNvbnN0IHQgb2Ygb3B0aW9ucz8udGFncyA/PyBbXSkge1xuICAgICAgdXJsLnNlYXJjaFBhcmFtcy5hcHBlbmQoJ3RhZycsIHQpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5yZXF1ZXN0KCgpID0+IHRoaXMuZ2V0SHR0cENsaWVudCgpLmdldDxDYXJkW10+KHVybC50b1N0cmluZygpKSk7XG4gIH1cblxuICAvKipcbiAgICogTGlzdHMgY2FyZHMgYXMgbGlnaHR3ZWlnaHQgc3VtbWFyaWVzIGZvciBsaXN0IHZpZXdzLlxuICAgKlxuICAgKiBSZXR1cm5zIHByZS1mbGF0dGVuZWQgZmllbGRzIHN1aXRhYmxlIGZvciBkaXJlY3QgdXNlIGluIGxpc3QgcmVuZGVyaW5nLFxuICAgKiBvbWl0dGluZyBoZWF2eXdlaWdodCBmaWVsZHMgbGlrZSBgcGxhbkNvbnRlbnRgIGFuZCBgcmVwb3NpdG9yeVBhdGhgLlxuICAgKlxuICAgKiBAdGVtcGxhdGUgVCAtIFRoZSBleHBlY3RlZCBzdW1tYXJ5IHNoYXBlIChkZWZhdWx0IGBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPmApLlxuICAgKiBAcmV0dXJucyBQcm9taXNlIHJlc29sdmluZyB0byBjYXJkIHN1bW1hcmllcy5cbiAgICogQHRocm93cyBBcGlFcnJvciB3aGVuIHRoZSBzZXJ2ZXIgcmVzcG9uZHMgd2l0aCBhbiBlcnJvci5cbiAgICogQHRocm93cyBOZXR3b3JrRXJyb3Igd2hlbiB0aGUgcmVxdWVzdCBmYWlscyB0byByZWFjaCB0aGUgc2VydmVyLlxuICAgKi9cbiAgYXN5bmMgbGlzdENhcmRTdW1tYXJpZXM8VCA9IFJlY29yZDxzdHJpbmcsIHVua25vd24+PigpOiBQcm9taXNlPFRbXT4ge1xuICAgIGNvbnN0IHVybCA9IHRoaXMuYnVpbGRVcmwoJy9jYXJkcy9saXN0Jywge1xuICAgICAgd29ya3NwYWNlUGF0aDogdGhpcy5vcHRpb25zLndvcmtzcGFjZVBhdGhcbiAgICB9KTtcbiAgICByZXR1cm4gdGhpcy5yZXF1ZXN0KCgpID0+IHRoaXMuZ2V0SHR0cENsaWVudCgpLmdldDxUW10+KHVybCkpO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldHMgYSBzaW5nbGUgY2FyZCBieSBpZC5cbiAgICpcbiAgICogQHBhcmFtIGNhcmRJZCAtIFRoZSBpZCBvZiB0aGUgY2FyZCB0byByZXRyaWV2ZS5cbiAgICogQHJldHVybnMgUHJvbWlzZSByZXNvbHZpbmcgdG8gdGhlIGNhcmQuXG4gICAqIEB0aHJvd3MgQXBpRXJyb3Igd2hlbiB0aGUgc2VydmVyIHJlc3BvbmRzIHdpdGggYW4gZXJyb3IuXG4gICAqIEB0aHJvd3MgTmV0d29ya0Vycm9yIHdoZW4gdGhlIHJlcXVlc3QgZmFpbHMgdG8gcmVhY2ggdGhlIHNlcnZlci5cbiAgICovXG4gIGFzeW5jIGdldENhcmQoY2FyZElkOiBzdHJpbmcpOiBQcm9taXNlPENhcmQ+IHtcbiAgICBjb25zdCB1cmwgPSB0aGlzLmJ1aWxkVXJsKGAvY2FyZHMvJHtjYXJkSWR9YCwge1xuICAgICAgd29ya3NwYWNlUGF0aDogdGhpcy5vcHRpb25zLndvcmtzcGFjZVBhdGhcbiAgICB9KTtcbiAgICByZXR1cm4gdGhpcy5yZXF1ZXN0KCgpID0+IHRoaXMuZ2V0SHR0cENsaWVudCgpLmdldDxDYXJkPih1cmwpKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDcmVhdGVzIGEgbmV3IGNhcmQuXG4gICAqXG4gICAqIEBwYXJhbSBkYXRhIC0gQ2FyZCBjcmVhdGlvbiBwYXlsb2FkLlxuICAgKiBAcmV0dXJucyBQcm9taXNlIHJlc29sdmluZyB0byB0aGUgY3JlYXRlZCBjYXJkLlxuICAgKiBAdGhyb3dzIEFwaUVycm9yIHdoZW4gdGhlIHNlcnZlciByZWplY3RzIHRoZSBwYXlsb2FkLlxuICAgKiBAdGhyb3dzIE5ldHdvcmtFcnJvciB3aGVuIHRoZSByZXF1ZXN0IGZhaWxzIHRvIHJlYWNoIHRoZSBzZXJ2ZXIuXG4gICAqL1xuICBhc3luYyBjcmVhdGVDYXJkKGRhdGE6IENhcmRDcmVhdGVEYXRhKTogUHJvbWlzZTxDYXJkPiB7XG4gICAgY29uc3QgdXJsID0gdGhpcy5idWlsZFVybCgnL2NhcmRzJyk7XG4gICAgY29uc3QgYm9keSA9IHtcbiAgICAgIC4uLmRhdGEsXG4gICAgICB3b3Jrc3BhY2VQYXRoOiB0aGlzLm9wdGlvbnMud29ya3NwYWNlUGF0aFxuICAgIH07XG4gICAgcmV0dXJuIHRoaXMucmVxdWVzdCgoKSA9PiB0aGlzLmdldEh0dHBDbGllbnQoKS5wb3N0PENhcmQ+KHVybCwgYm9keSkpO1xuICB9XG5cbiAgLyoqXG4gICAqIFVwZGF0ZXMgYW4gZXhpc3RpbmcgY2FyZC5cbiAgICpcbiAgICogQHBhcmFtIGNhcmRJZCAtIFRoZSBpZCBvZiB0aGUgY2FyZCB0byB1cGRhdGUuXG4gICAqIEBwYXJhbSBkYXRhIC0gVGhlIGZpZWxkcyB0byB1cGRhdGUuXG4gICAqIEByZXR1cm5zIFByb21pc2UgcmVzb2x2aW5nIHRvIHRoZSB1cGRhdGVkIGNhcmQuXG4gICAqIEB0aHJvd3MgQXBpRXJyb3Igd2hlbiB0aGUgc2VydmVyIHJlamVjdHMgdGhlIHVwZGF0ZS5cbiAgICogQHRocm93cyBOZXR3b3JrRXJyb3Igd2hlbiB0aGUgcmVxdWVzdCBmYWlscyB0byByZWFjaCB0aGUgc2VydmVyLlxuICAgKiBAZGVwcmVjYXRlZCBVc2UgZGlyZWN0IGdpdCBvcGVyYXRpb25zIGluc3RlYWQuIFRoaXMgZW5kcG9pbnQgd2lsbCBiZSByZW1vdmVkLlxuICAgKi9cbiAgYXN5bmMgdXBkYXRlQ2FyZChjYXJkSWQ6IHN0cmluZywgZGF0YTogQ2FyZFVwZGF0ZURhdGEpOiBQcm9taXNlPENhcmQ+IHtcbiAgICBjb25zdCB1cmwgPSB0aGlzLmJ1aWxkVXJsKGAvY2FyZHMvJHtjYXJkSWR9YCk7XG4gICAgcmV0dXJuIHRoaXMucmVxdWVzdCgoKSA9PiB0aGlzLmdldEh0dHBDbGllbnQoKS5wYXRjaDxDYXJkPih1cmwsIGRhdGEpKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBEZWxldGVzIGEgY2FyZC5cbiAgICpcbiAgICogQHBhcmFtIGNhcmRJZCAtIFRoZSBpZCBvZiB0aGUgY2FyZCB0byBkZWxldGUuXG4gICAqIEByZXR1cm5zIFByb21pc2UgcmVzb2x2aW5nIHdoZW4gZGVsZXRpb24gaXMgY29tcGxldGUuXG4gICAqIEB0aHJvd3MgQXBpRXJyb3Igd2hlbiB0aGUgc2VydmVyIHJlamVjdHMgdGhlIGRlbGV0ZS5cbiAgICogQHRocm93cyBOZXR3b3JrRXJyb3Igd2hlbiB0aGUgcmVxdWVzdCBmYWlscyB0byByZWFjaCB0aGUgc2VydmVyLlxuICAgKiBAZGVwcmVjYXRlZCBVc2UgZGlyZWN0IGdpdCBvcGVyYXRpb25zIGluc3RlYWQuIFRoaXMgZW5kcG9pbnQgd2lsbCBiZSByZW1vdmVkLlxuICAgKi9cbiAgYXN5bmMgZGVsZXRlQ2FyZChjYXJkSWQ6IHN0cmluZyk6IFByb21pc2U8dm9pZD4ge1xuICAgIGNvbnN0IHVybCA9IHRoaXMuYnVpbGRVcmwoYC9jYXJkcy8ke2NhcmRJZH1gKTtcbiAgICByZXR1cm4gdGhpcy5yZXF1ZXN0KCgpID0+IHRoaXMuZ2V0SHR0cENsaWVudCgpLmRlbGV0ZSh1cmwpKTtcbiAgfVxuXG4gIC8vIC0tLSBDb21tZW50IE9wZXJhdGlvbnMgLS0tXG5cbiAgLyoqXG4gICAqIEdldHMgYWxsIGNvbW1lbnRzIGZvciBhIGNhcmQuXG4gICAqXG4gICAqIEBwYXJhbSBjYXJkSWQgLSBJZGVudGlmaWVyIG9mIHRoZSB0YXJnZXQgY2FyZCBmb3IgdGhpcyByZXF1ZXN0LlxuICAgKiBAcmV0dXJucyBQcm9taXNlIHJlc29sdmluZyB0byB0aGUgY29tbWVudCBsaXN0LlxuICAgKiBAdGhyb3dzIEFwaUVycm9yIHdoZW4gdGhlIHNlcnZlciByZXNwb25kcyB3aXRoIGFuIGVycm9yLlxuICAgKiBAdGhyb3dzIE5ldHdvcmtFcnJvciB3aGVuIHRoZSByZXF1ZXN0IGZhaWxzIHRvIHJlYWNoIHRoZSBzZXJ2ZXIuXG4gICAqL1xuICBhc3luYyBnZXRDb21tZW50cyhjYXJkSWQ6IHN0cmluZyk6IFByb21pc2U8Q29tbWVudFtdPiB7XG4gICAgY29uc3QgdXJsID0gdGhpcy5idWlsZFVybChgL2NhcmRzLyR7Y2FyZElkfS9jb21tZW50c2ApO1xuICAgIHJldHVybiB0aGlzLnJlcXVlc3QoKCkgPT4gdGhpcy5nZXRIdHRwQ2xpZW50KCkuZ2V0PENvbW1lbnRbXT4odXJsKSk7XG4gIH1cblxuICAvKipcbiAgICogR2V0cyBhIHNpbmdsZSBjb21tZW50IGJ5IGlkLlxuICAgKlxuICAgKiBAcGFyYW0gY2FyZElkIC0gSWRlbnRpZmllciBvZiB0aGUgY2FyZCB0aGF0IG93bnMgdGhlIHJlcXVlc3RlZCBjb21tZW50LlxuICAgKiBAcGFyYW0gY29tbWVudElkIC0gSWRlbnRpZmllciBvZiB0aGUgY29tbWVudCB0byByZXRyaWV2ZS5cbiAgICogQHJldHVybnMgUHJvbWlzZSByZXNvbHZpbmcgdG8gdGhlIGNvbW1lbnQuXG4gICAqIEB0aHJvd3MgQXBpRXJyb3Igd2hlbiB0aGUgc2VydmVyIHJlc3BvbmRzIHdpdGggYW4gZXJyb3IuXG4gICAqIEB0aHJvd3MgTmV0d29ya0Vycm9yIHdoZW4gdGhlIHJlcXVlc3QgZmFpbHMgdG8gcmVhY2ggdGhlIHNlcnZlci5cbiAgICovXG4gIGFzeW5jIGdldENvbW1lbnQoY2FyZElkOiBzdHJpbmcsIGNvbW1lbnRJZDogc3RyaW5nKTogUHJvbWlzZTxDb21tZW50PiB7XG4gICAgY29uc3QgdXJsID0gdGhpcy5idWlsZFVybChgL2NhcmRzLyR7Y2FyZElkfS9jb21tZW50cy8ke2NvbW1lbnRJZH1gKTtcbiAgICByZXR1cm4gdGhpcy5yZXF1ZXN0KCgpID0+IHRoaXMuZ2V0SHR0cENsaWVudCgpLmdldDxDb21tZW50Pih1cmwpKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDcmVhdGVzIGEgbmV3IGNvbW1lbnQgb24gYSBjYXJkLlxuICAgKlxuICAgKiBAcGFyYW0gY2FyZElkIC0gSWRlbnRpZmllciBvZiB0aGUgY2FyZCB0aGF0IHdpbGwgcmVjZWl2ZSB0aGUgbmV3IGNvbW1lbnQuXG4gICAqIEBwYXJhbSBkYXRhIC0gQ29tbWVudCBjcmVhdGlvbiBwYXlsb2FkLlxuICAgKiBAcmV0dXJucyBQcm9taXNlIHJlc29sdmluZyB0byB0aGUgY3JlYXRlZCBjb21tZW50LlxuICAgKiBAdGhyb3dzIEFwaUVycm9yIHdoZW4gdGhlIHNlcnZlciByZWplY3RzIHRoZSBwYXlsb2FkLlxuICAgKiBAdGhyb3dzIE5ldHdvcmtFcnJvciB3aGVuIHRoZSByZXF1ZXN0IGZhaWxzIHRvIHJlYWNoIHRoZSBzZXJ2ZXIuXG4gICAqIEBkZXByZWNhdGVkIFVzZSBkaXJlY3QgZ2l0IG9wZXJhdGlvbnMgaW5zdGVhZC4gVGhpcyBlbmRwb2ludCB3aWxsIGJlIHJlbW92ZWQuXG4gICAqL1xuICBhc3luYyBjcmVhdGVDb21tZW50KGNhcmRJZDogc3RyaW5nLCBkYXRhOiBDb21tZW50Q3JlYXRlRGF0YSk6IFByb21pc2U8Q29tbWVudD4ge1xuICAgIGNvbnN0IHVybCA9IHRoaXMuYnVpbGRVcmwoYC9jYXJkcy8ke2NhcmRJZH0vY29tbWVudHNgKTtcbiAgICByZXR1cm4gdGhpcy5yZXF1ZXN0KCgpID0+IHRoaXMuZ2V0SHR0cENsaWVudCgpLnBvc3Q8Q29tbWVudD4odXJsLCBkYXRhKSk7XG4gIH1cblxuICAvKipcbiAgICogVXBkYXRlcyBhbiBleGlzdGluZyBjb21tZW50LlxuICAgKlxuICAgKiBAcGFyYW0gY2FyZElkIC0gSWRlbnRpZmllciBvZiB0aGUgY2FyZCB0aGF0IG93bnMgdGhlIGNvbW1lbnQuXG4gICAqIEBwYXJhbSBjb21tZW50SWQgLSBJZGVudGlmaWVyIG9mIHRoZSBjb21tZW50IHRvIHVwZGF0ZS5cbiAgICogQHBhcmFtIGRhdGEgLSBDb21tZW50IHVwZGF0ZSBwYXlsb2FkLlxuICAgKiBAcmV0dXJucyBQcm9taXNlIHJlc29sdmluZyB0byB0aGUgdXBkYXRlZCBjb21tZW50LlxuICAgKiBAdGhyb3dzIEFwaUVycm9yIHdoZW4gdGhlIHNlcnZlciByZWplY3RzIHRoZSB1cGRhdGUuXG4gICAqIEB0aHJvd3MgTmV0d29ya0Vycm9yIHdoZW4gdGhlIHJlcXVlc3QgZmFpbHMgdG8gcmVhY2ggdGhlIHNlcnZlci5cbiAgICogQGRlcHJlY2F0ZWQgVXNlIGRpcmVjdCBnaXQgb3BlcmF0aW9ucyBpbnN0ZWFkLiBUaGlzIGVuZHBvaW50IHdpbGwgYmUgcmVtb3ZlZC5cbiAgICovXG4gIGFzeW5jIHVwZGF0ZUNvbW1lbnQoY2FyZElkOiBzdHJpbmcsIGNvbW1lbnRJZDogc3RyaW5nLCBkYXRhOiBDb21tZW50VXBkYXRlRGF0YSk6IFByb21pc2U8Q29tbWVudD4ge1xuICAgIGNvbnN0IHVybCA9IHRoaXMuYnVpbGRVcmwoYC9jYXJkcy8ke2NhcmRJZH0vY29tbWVudHMvJHtjb21tZW50SWR9YCk7XG4gICAgcmV0dXJuIHRoaXMucmVxdWVzdCgoKSA9PiB0aGlzLmdldEh0dHBDbGllbnQoKS5wYXRjaDxDb21tZW50Pih1cmwsIGRhdGEpKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBEZWxldGVzIGEgY29tbWVudC5cbiAgICpcbiAgICogQHBhcmFtIGNhcmRJZCAtIElkZW50aWZpZXIgb2YgdGhlIGNhcmQgdGhhdCBvd25zIHRoZSBjb21tZW50LlxuICAgKiBAcGFyYW0gY29tbWVudElkIC0gSWRlbnRpZmllciBvZiB0aGUgY29tbWVudCB0byByZW1vdmUuXG4gICAqIEByZXR1cm5zIFByb21pc2UgcmVzb2x2aW5nIHdoZW4gZGVsZXRpb24gaXMgY29tcGxldGUuXG4gICAqIEB0aHJvd3MgQXBpRXJyb3Igd2hlbiB0aGUgc2VydmVyIHJlamVjdHMgdGhlIGRlbGV0ZS5cbiAgICogQHRocm93cyBOZXR3b3JrRXJyb3Igd2hlbiB0aGUgcmVxdWVzdCBmYWlscyB0byByZWFjaCB0aGUgc2VydmVyLlxuICAgKiBAZGVwcmVjYXRlZCBVc2UgZGlyZWN0IGdpdCBvcGVyYXRpb25zIGluc3RlYWQuIFRoaXMgZW5kcG9pbnQgd2lsbCBiZSByZW1vdmVkLlxuICAgKi9cbiAgYXN5bmMgZGVsZXRlQ29tbWVudChjYXJkSWQ6IHN0cmluZywgY29tbWVudElkOiBzdHJpbmcpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zdCB1cmwgPSB0aGlzLmJ1aWxkVXJsKGAvY2FyZHMvJHtjYXJkSWR9L2NvbW1lbnRzLyR7Y29tbWVudElkfWApO1xuICAgIHJldHVybiB0aGlzLnJlcXVlc3QoKCkgPT4gdGhpcy5nZXRIdHRwQ2xpZW50KCkuZGVsZXRlKHVybCkpO1xuICB9XG5cbiAgLy8gLS0tIEF0dGFjaG1lbnQgT3BlcmF0aW9ucyAtLS1cblxuICAvKipcbiAgICogVXBsb2FkcyBhbiBhdHRhY2htZW50IHRvIGEgY2FyZCB1c2luZyBiaW5hcnkgUFVULlxuICAgKlxuICAgKiBUaGlzIGlzIHRoZSBwcmVmZXJyZWQgbWV0aG9kIC0gc2VuZHMgcmF3IGJpbmFyeSBkYXRhIGRpcmVjdGx5IHdpdGhvdXRcbiAgICogYmFzZTY0IGVuY29kaW5nLCByZXN1bHRpbmcgaW4gMzMlIHNtYWxsZXIgcGF5bG9hZHMuXG4gICAqXG4gICAqIEBwYXJhbSBjYXJkSWQgLSBJZGVudGlmaWVyIG9mIHRoZSBjYXJkIHRoYXQgd2lsbCByZWNlaXZlIHRoZSBhdHRhY2htZW50LlxuICAgKiBAcGFyYW0gbmFtZSAtIEZpbGUgbmFtZSBpbmNsdWRpbmcgZXh0ZW5zaW9uLlxuICAgKiBAcGFyYW0gZGF0YSAtIEJpbmFyeSBkYXRhIGFzIEJsb2IsIEFycmF5QnVmZmVyLCBvciBiYXNlNjQgc3RyaW5nLlxuICAgKiBAcmV0dXJucyBQcm9taXNlIHJlc29sdmluZyB0byBhdHRhY2htZW50IG1ldGFkYXRhLlxuICAgKiBAdGhyb3dzIEFwaUVycm9yIHdoZW4gdGhlIHNlcnZlciByZWplY3RzIHRoZSB1cGxvYWQuXG4gICAqIEB0aHJvd3MgTmV0d29ya0Vycm9yIHdoZW4gdGhlIHJlcXVlc3QgZmFpbHMgdG8gcmVhY2ggdGhlIHNlcnZlci5cbiAgICovXG4gIGFzeW5jIHVwbG9hZEF0dGFjaG1lbnQoY2FyZElkOiBzdHJpbmcsIG5hbWU6IHN0cmluZywgZGF0YTogQmxvYiB8IEFycmF5QnVmZmVyIHwgc3RyaW5nKTogUHJvbWlzZTxBdHRhY2htZW50UmVzcG9uc2U+IHtcbiAgICBjb25zdCB1cmwgPSB0aGlzLmJ1aWxkVXJsKGAvY2FyZHMvJHtjYXJkSWR9L2F0dGFjaG1lbnRzLyR7ZW5jb2RlVVJJQ29tcG9uZW50KG5hbWUpfWApO1xuXG4gICAgLy8gQ29udmVydCBkYXRhIHRvIEJsb2IgZm9yIGZldGNoIGJvZHlcbiAgICBsZXQgYm9keTogQmxvYjtcbiAgICBpZiAoZGF0YSBpbnN0YW5jZW9mIEJsb2IpIHtcbiAgICAgIGJvZHkgPSBkYXRhO1xuICAgIH0gZWxzZSBpZiAoZGF0YSBpbnN0YW5jZW9mIEFycmF5QnVmZmVyKSB7XG4gICAgICBib2R5ID0gbmV3IEJsb2IoW2RhdGFdKTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gYmFzZTY0IHN0cmluZyAtIGRlY29kZSB0byBiaW5hcnlcbiAgICAgIGNvbnN0IGJpbmFyeVN0cmluZyA9IGF0b2IoZGF0YSk7XG4gICAgICBjb25zdCBieXRlcyA9IG5ldyBVaW50OEFycmF5KGJpbmFyeVN0cmluZy5sZW5ndGgpO1xuICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBiaW5hcnlTdHJpbmcubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgYnl0ZXNbaV0gPSBiaW5hcnlTdHJpbmcuY2hhckNvZGVBdChpKTtcbiAgICAgIH1cbiAgICAgIGJvZHkgPSBuZXcgQmxvYihbYnl0ZXNdKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5yZXF1ZXN0KGFzeW5jICgpID0+IHtcbiAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZmV0Y2godXJsLCB7XG4gICAgICAgIG1ldGhvZDogJ1BVVCcsXG4gICAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgICAuLi50aGlzLmdldEhlYWRlcnMoKSxcbiAgICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL29jdGV0LXN0cmVhbSdcbiAgICAgICAgfSxcbiAgICAgICAgYm9keSxcbiAgICAgICAgc2lnbmFsOiB0aGlzLmdldFRpbWVvdXRTaWduYWwoKVxuICAgICAgfSk7XG4gICAgICBpZiAoIXJlc3BvbnNlLm9rKSB0aHJvdyByZXNwb25zZTtcbiAgICAgIHJldHVybiByZXNwb25zZS5qc29uKCkgYXMgUHJvbWlzZTxBdHRhY2htZW50UmVzcG9uc2U+O1xuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIERvd25sb2FkcyBhbiBhdHRhY2htZW50IGFzIGEgQmxvYi5cbiAgICpcbiAgICogVGhpcyBtZXRob2QgdXNlcyBgZmV0Y2hgIGRpcmVjdGx5IHNvIGJpbmFyeSBkYXRhIGlzIHByZXNlcnZlZC5cbiAgICpcbiAgICogQHBhcmFtIGNhcmRJZCAtIElkZW50aWZpZXIgb2YgdGhlIGNhcmQgdGhhdCBvd25zIHRoZSBhdHRhY2htZW50LlxuICAgKiBAcGFyYW0gYXR0YWNobWVudElkIC0gSWRlbnRpZmllciBvZiB0aGUgYXR0YWNobWVudCBibG9iIHRvIGRvd25sb2FkLlxuICAgKiBAcmV0dXJucyBQcm9taXNlIHJlc29sdmluZyB0byBhbiBhdHRhY2htZW50IEJsb2IuXG4gICAqIEB0aHJvd3MgQXBpRXJyb3Igd2hlbiB0aGUgc2VydmVyIHJlc3BvbmRzIHdpdGggYW4gZXJyb3IuXG4gICAqIEB0aHJvd3MgTmV0d29ya0Vycm9yIHdoZW4gdGhlIHJlcXVlc3QgZmFpbHMgdG8gcmVhY2ggdGhlIHNlcnZlci5cbiAgICovXG4gIGFzeW5jIGdldEF0dGFjaG1lbnQoY2FyZElkOiBzdHJpbmcsIGF0dGFjaG1lbnRJZDogc3RyaW5nKTogUHJvbWlzZTxCbG9iPiB7XG4gICAgY29uc3QgdXJsID0gdGhpcy5idWlsZFVybChgL2NhcmRzLyR7Y2FyZElkfS9hdHRhY2htZW50cy8ke2F0dGFjaG1lbnRJZH1gKTtcbiAgICByZXR1cm4gdGhpcy5yZXF1ZXN0KGFzeW5jICgpID0+IHtcbiAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZmV0Y2godXJsLCB7XG4gICAgICAgIGhlYWRlcnM6IHRoaXMuZ2V0SGVhZGVycygpLFxuICAgICAgICBzaWduYWw6IHRoaXMuZ2V0VGltZW91dFNpZ25hbCgpXG4gICAgICB9KTtcbiAgICAgIGlmICghcmVzcG9uc2Uub2spIHRocm93IHJlc3BvbnNlO1xuICAgICAgcmV0dXJuIHJlc3BvbnNlLmJsb2IoKTtcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBMaXN0cyBhdHRhY2htZW50cyBmb3IgYSBjYXJkLlxuICAgKlxuICAgKiBAcGFyYW0gY2FyZElkIC0gSWRlbnRpZmllciBvZiB0aGUgY2FyZCB3aG9zZSBhdHRhY2htZW50cyBzaG91bGQgYmUgbGlzdGVkLlxuICAgKiBAcmV0dXJucyBQcm9taXNlIHJlc29sdmluZyB0byBhdHRhY2htZW50IG1ldGFkYXRhLlxuICAgKiBAdGhyb3dzIEFwaUVycm9yIHdoZW4gdGhlIHNlcnZlciByZXNwb25kcyB3aXRoIGFuIGVycm9yLlxuICAgKiBAdGhyb3dzIE5ldHdvcmtFcnJvciB3aGVuIHRoZSByZXF1ZXN0IGZhaWxzIHRvIHJlYWNoIHRoZSBzZXJ2ZXIuXG4gICAqL1xuICBhc3luYyBsaXN0QXR0YWNobWVudHMoY2FyZElkOiBzdHJpbmcpOiBQcm9taXNlPEF0dGFjaG1lbnRSZXNwb25zZVtdPiB7XG4gICAgY29uc3QgdXJsID0gdGhpcy5idWlsZFVybChgL2NhcmRzLyR7Y2FyZElkfS9hdHRhY2htZW50c2ApO1xuICAgIHJldHVybiB0aGlzLnJlcXVlc3QoKCkgPT4gdGhpcy5nZXRIdHRwQ2xpZW50KCkuZ2V0PEF0dGFjaG1lbnRSZXNwb25zZVtdPih1cmwpKTtcbiAgfVxuXG4gIC8vIC0tLSBUaW1lbGluZSBPcGVyYXRpb25zIC0tLVxuXG4gIC8qKlxuICAgKiBHZXRzIHRpbWVsaW5lIGVudHJpZXMgZm9yIGEgY2FyZCB3aXRoIG9wdGlvbmFsIHBhZ2luYXRpb24uXG4gICAqXG4gICAqIEBwYXJhbSBjYXJkSWQgLSBJZGVudGlmaWVyIG9mIHRoZSBjYXJkIHdob3NlIHRpbWVsaW5lIGVudHJpZXMgc2hvdWxkIGJlIHJldHVybmVkLlxuICAgKiBAcGFyYW0gb3B0aW9ucyAtIE9wdGlvbmFsIHBhZ2luYXRpb24gY29udHJvbHMuXG4gICAqIEByZXR1cm5zIFByb21pc2UgcmVzb2x2aW5nIHRvIHRpbWVsaW5lIGVudHJpZXMuXG4gICAqIEB0aHJvd3MgQXBpRXJyb3Igd2hlbiB0aGUgc2VydmVyIHJlc3BvbmRzIHdpdGggYW4gZXJyb3IuXG4gICAqIEB0aHJvd3MgTmV0d29ya0Vycm9yIHdoZW4gdGhlIHJlcXVlc3QgZmFpbHMgdG8gcmVhY2ggdGhlIHNlcnZlci5cbiAgICovXG4gIGFzeW5jIGdldFRpbWVsaW5lKGNhcmRJZDogc3RyaW5nLCBvcHRpb25zPzogVGltZWxpbmVPcHRpb25zKTogUHJvbWlzZTxUaW1lbGluZUl0ZW1bXT4ge1xuICAgIGNvbnN0IHVybCA9IHRoaXMuYnVpbGRVcmwoYC9jYXJkcy8ke2NhcmRJZH0vdGltZWxpbmVgLCB7XG4gICAgICBiZWZvcmU6IG9wdGlvbnM/LmJlZm9yZSxcbiAgICAgIGxpbWl0OiBvcHRpb25zPy5saW1pdFxuICAgIH0pO1xuICAgIHJldHVybiB0aGlzLnJlcXVlc3QoKCkgPT4gdGhpcy5nZXRIdHRwQ2xpZW50KCkuZ2V0PFRpbWVsaW5lSXRlbVtdPih1cmwpKTtcbiAgfVxuXG4gIC8vIC0tLSBQbGFuIE9wZXJhdGlvbnMgLS0tXG5cbiAgLyoqXG4gICAqIEdldHMgdGhlIHBsYW4gZG9jdW1lbnQgZm9yIGEgY2FyZCBhcyBtYXJrZG93bi5cbiAgICpcbiAgICogQHBhcmFtIGNhcmRJZCAtIElkZW50aWZpZXIgb2YgdGhlIGNhcmQgd2hvc2UgcGxhbiBtYXJrZG93biBzaG91bGQgYmUgcmV0dXJuZWQuXG4gICAqIEByZXR1cm5zIFByb21pc2UgcmVzb2x2aW5nIHRvIHBsYW4gbWFya2Rvd24uXG4gICAqIEB0aHJvd3MgQXBpRXJyb3Igd2hlbiB0aGUgc2VydmVyIHJlc3BvbmRzIHdpdGggYW4gZXJyb3IuXG4gICAqIEB0aHJvd3MgTmV0d29ya0Vycm9yIHdoZW4gdGhlIHJlcXVlc3QgZmFpbHMgdG8gcmVhY2ggdGhlIHNlcnZlci5cbiAgICovXG4gIGFzeW5jIGdldFBsYW4oY2FyZElkOiBzdHJpbmcpOiBQcm9taXNlPHN0cmluZz4ge1xuICAgIGNvbnN0IHVybCA9IHRoaXMuYnVpbGRVcmwoYC9jYXJkcy8ke2NhcmRJZH0vcGxhbmApO1xuICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgdGhpcy5yZXF1ZXN0KCgpID0+IHRoaXMuZ2V0SHR0cENsaWVudCgpLmdldDx7IGNvbnRlbnQ6IHN0cmluZyB9Pih1cmwpKTtcbiAgICByZXR1cm4gcmVzcG9uc2UuY29udGVudDtcbiAgfVxuXG4gIC8qKlxuICAgKiBVcGRhdGVzIHRoZSBwbGFuIGRvY3VtZW50IGZvciBhIGNhcmQuXG4gICAqXG4gICAqIEBwYXJhbSBjYXJkSWQgLSBJZGVudGlmaWVyIG9mIHRoZSBjYXJkIHdob3NlIHBsYW4gbWFya2Rvd24gc2hvdWxkIGJlIHVwZGF0ZWQuXG4gICAqIEBwYXJhbSBjb250ZW50IC0gUGxhbiBtYXJrZG93biBjb250ZW50LlxuICAgKiBAcmV0dXJucyBQcm9taXNlIHJlc29sdmluZyB3aGVuIHRoZSBwbGFuIGlzIHNhdmVkLlxuICAgKiBAdGhyb3dzIEFwaUVycm9yIHdoZW4gdGhlIHNlcnZlciByZWplY3RzIHRoZSB1cGRhdGUuXG4gICAqIEB0aHJvd3MgTmV0d29ya0Vycm9yIHdoZW4gdGhlIHJlcXVlc3QgZmFpbHMgdG8gcmVhY2ggdGhlIHNlcnZlci5cbiAgICogQGRlcHJlY2F0ZWQgVXNlIGRpcmVjdCBnaXQgb3BlcmF0aW9ucyBpbnN0ZWFkLiBUaGlzIGVuZHBvaW50IHdpbGwgYmUgcmVtb3ZlZC5cbiAgICovXG4gIGFzeW5jIHVwZGF0ZVBsYW4oY2FyZElkOiBzdHJpbmcsIGNvbnRlbnQ6IHN0cmluZyk6IFByb21pc2U8dm9pZD4ge1xuICAgIGNvbnN0IHVybCA9IHRoaXMuYnVpbGRVcmwoYC9jYXJkcy8ke2NhcmRJZH0vcGxhbmApO1xuICAgIHJldHVybiB0aGlzLnJlcXVlc3QoKCkgPT4gdGhpcy5nZXRIdHRwQ2xpZW50KCkucHV0PHZvaWQ+KHVybCwgY29udGVudCkpO1xuICB9XG5cbiAgLy8gLS0tIEdhdGUgT3BlcmF0aW9ucyAtLS1cblxuICAvKipcbiAgICogQXBwcm92ZXMgYSBnYXRlIGZvciBhIGNhcmQuXG4gICAqXG4gICAqIEBwYXJhbSBjYXJkSWQgLSBJZGVudGlmaWVyIG9mIHRoZSBjYXJkIHdob3NlIGdhdGUgc3RhdGUgc2hvdWxkIGJlIHVwZGF0ZWQuXG4gICAqIEBwYXJhbSBnYXRlTmFtZSAtIEdhdGUgbmFtZSB0byBhcHByb3ZlLlxuICAgKiBAcmV0dXJucyBQcm9taXNlIHJlc29sdmluZyB0byBnYXRlIGFwcHJvdmFsIG1ldGFkYXRhLlxuICAgKiBAdGhyb3dzIEFwaUVycm9yIHdoZW4gdGhlIHNlcnZlciByZWplY3RzIHRoZSBhcHByb3ZhbC5cbiAgICogQHRocm93cyBOZXR3b3JrRXJyb3Igd2hlbiB0aGUgcmVxdWVzdCBmYWlscyB0byByZWFjaCB0aGUgc2VydmVyLlxuICAgKiBAZGVwcmVjYXRlZCBVc2UgZGlyZWN0IGdpdCBvcGVyYXRpb25zIGluc3RlYWQuIFRoaXMgZW5kcG9pbnQgd2lsbCBiZSByZW1vdmVkLlxuICAgKi9cbiAgYXN5bmMgYXBwcm92ZUdhdGUoY2FyZElkOiBzdHJpbmcsIGdhdGVOYW1lOiAncGxhbicgfCAnbWVyZ2VSZXF1ZXN0Jyk6IFByb21pc2U8R2F0ZUFwcHJvdmFsUmVzcG9uc2U+IHtcbiAgICBjb25zdCB1cmwgPSB0aGlzLmJ1aWxkVXJsKGAvY2FyZHMvJHtjYXJkSWR9L2dhdGVzLyR7Z2F0ZU5hbWV9L2FwcHJvdmVgKTtcbiAgICByZXR1cm4gdGhpcy5yZXF1ZXN0KCgpID0+IHRoaXMuZ2V0SHR0cENsaWVudCgpLnBvc3Q8R2F0ZUFwcHJvdmFsUmVzcG9uc2U+KHVybCwgdW5kZWZpbmVkKSk7XG4gIH1cblxuICAvLyAtLS0gQ29tbWl0IE9wZXJhdGlvbnMgLS0tXG5cbiAgLyoqXG4gICAqIEdldHMgYWxsIGNvbW1pdHMgYXNzb2NpYXRlZCB3aXRoIGEgY2FyZC5cbiAgICpcbiAgICogQHBhcmFtIGNhcmRJZCAtIElkZW50aWZpZXIgb2YgdGhlIGNhcmQgd2hvc2UgY29tbWl0cyBzaG91bGQgYmUgcmV0dXJuZWQuXG4gICAqIEByZXR1cm5zIFByb21pc2UgcmVzb2x2aW5nIHRvIGNvbW1pdCBtZXRhZGF0YS5cbiAgICogQHRocm93cyBBcGlFcnJvciB3aGVuIHRoZSBzZXJ2ZXIgcmVzcG9uZHMgd2l0aCBhbiBlcnJvci5cbiAgICogQHRocm93cyBOZXR3b3JrRXJyb3Igd2hlbiB0aGUgcmVxdWVzdCBmYWlscyB0byByZWFjaCB0aGUgc2VydmVyLlxuICAgKi9cbiAgYXN5bmMgZ2V0Q29tbWl0cyhjYXJkSWQ6IHN0cmluZyk6IFByb21pc2U8Q29tbWl0SW5mb1tdPiB7XG4gICAgY29uc3QgdXJsID0gdGhpcy5idWlsZFVybChgL2NhcmRzLyR7Y2FyZElkfS9jb21taXRzYCk7XG4gICAgcmV0dXJuIHRoaXMucmVxdWVzdCgoKSA9PiB0aGlzLmdldEh0dHBDbGllbnQoKS5nZXQ8Q29tbWl0SW5mb1tdPih1cmwpKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBZGRzIGEgY29tbWl0IHRvIGEgY2FyZC5cbiAgICpcbiAgICogQHBhcmFtIGNhcmRJZCAtIElkZW50aWZpZXIgb2YgdGhlIGNhcmQgdG8gYXNzb2NpYXRlIHdpdGggdGhlIGNvbW1pdCBTSEEuXG4gICAqIEBwYXJhbSBzaGEgLSBHaXQgY29tbWl0IHNoYS5cbiAgICogQHJldHVybnMgUHJvbWlzZSByZXNvbHZpbmcgdG8gY29tbWl0IG1ldGFkYXRhLlxuICAgKiBAdGhyb3dzIEFwaUVycm9yIHdoZW4gdGhlIHNlcnZlciByZWplY3RzIHRoZSB1cGRhdGUuXG4gICAqIEB0aHJvd3MgTmV0d29ya0Vycm9yIHdoZW4gdGhlIHJlcXVlc3QgZmFpbHMgdG8gcmVhY2ggdGhlIHNlcnZlci5cbiAgICovXG4gIGFzeW5jIGFkZENvbW1pdChjYXJkSWQ6IHN0cmluZywgc2hhOiBzdHJpbmcpOiBQcm9taXNlPENvbW1pdEluZm8+IHtcbiAgICBjb25zdCB1cmwgPSB0aGlzLmJ1aWxkVXJsKGAvY2FyZHMvJHtjYXJkSWR9L2NvbW1pdHNgKTtcbiAgICByZXR1cm4gdGhpcy5yZXF1ZXN0KCgpID0+IHRoaXMuZ2V0SHR0cENsaWVudCgpLnBvc3Q8Q29tbWl0SW5mbz4odXJsLCB7IHNoYSB9KSk7XG4gIH1cblxuICAvKipcbiAgICogUmVtb3ZlcyBhIGNvbW1pdCBmcm9tIGEgY2FyZC5cbiAgICpcbiAgICogQHBhcmFtIGNhcmRJZCAtIElkZW50aWZpZXIgb2YgdGhlIGNhcmQgdG8gZGV0YWNoIGZyb20gdGhlIGNvbW1pdCBTSEEuXG4gICAqIEBwYXJhbSBzaGEgLSBHaXQgY29tbWl0IHNoYS5cbiAgICogQHBhcmFtIG9wdGlvbnMgLSBPcHRpb25hbCBwYXJhbWV0ZXJzLlxuICAgKiBAcGFyYW0gb3B0aW9ucy5zZXNzaW9uSWQgLSBDbGF1ZGUgQ29kZSBzZXNzaW9uIElEIGZvcndhcmRlZCBhcyBgWC1DYXJkcy1TZXNzaW9uLUlkYCBoZWFkZXIgc28gdGhlIGNhcmQgcmVwbyBwb3N0LWNvbW1pdCBob29rIGNhbiBhdHRyaWJ1dGUgdGhlIGNvbW1pdC5cbiAgICogQHJldHVybnMgUHJvbWlzZSByZXNvbHZpbmcgd2hlbiByZW1vdmFsIGlzIGNvbXBsZXRlLlxuICAgKiBAdGhyb3dzIEFwaUVycm9yIHdoZW4gdGhlIHNlcnZlciByZWplY3RzIHRoZSB1cGRhdGUuXG4gICAqIEB0aHJvd3MgTmV0d29ya0Vycm9yIHdoZW4gdGhlIHJlcXVlc3QgZmFpbHMgdG8gcmVhY2ggdGhlIHNlcnZlci5cbiAgICovXG4gIGFzeW5jIHJlbW92ZUNvbW1pdChjYXJkSWQ6IHN0cmluZywgc2hhOiBzdHJpbmcsIG9wdGlvbnM/OiB7IHNlc3Npb25JZD86IHN0cmluZyB9KTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc3QgdXJsID0gdGhpcy5idWlsZFVybChgL2NhcmRzLyR7Y2FyZElkfS9jb21taXRzLyR7c2hhfWApO1xuICAgIGNvbnN0IGhlYWRlcnM6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4gPSB7fTtcbiAgICBpZiAob3B0aW9ucz8uc2Vzc2lvbklkKSB7XG4gICAgICBoZWFkZXJzWydYLUNhcmRzLVNlc3Npb24tSWQnXSA9IG9wdGlvbnMuc2Vzc2lvbklkO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5yZXF1ZXN0KCgpID0+IHRoaXMuZ2V0SHR0cENsaWVudCgpLmRlbGV0ZSh1cmwsIHsgaGVhZGVycyB9KSk7XG4gIH1cblxuICAvLyAtLS0gQnJhbmNoIE9wZXJhdGlvbnMgLS0tXG5cbiAgLyoqXG4gICAqIEdldHMgYWxsIGJyYW5jaGVzIHRyYWNrZWQgb24gYSBjYXJkLlxuICAgKlxuICAgKiBAcGFyYW0gY2FyZElkIC0gVW5pcXVlIGlkZW50aWZpZXIgb2YgdGhlIGNhcmQgd2hvc2UgYnJhbmNoZXMgdG8gcmV0cmlldmUuXG4gICAqIEBwYXJhbSBvcHRpb25zIC0gT3B0aW9uYWwgcXVlcnkgcGFyYW1ldGVycy5cbiAgICogQHBhcmFtIG9wdGlvbnMud29ya3NwYWNlUGF0aCAtIFdvcmtzcGFjZSBwYXRoIGZvciBjb21wdXRpbmcgaXNNZXJnZWQgYW5kIGNvbW1pdCBjb250YWlubWVudC5cbiAgICogQHJldHVybnMgUHJvbWlzZSByZXNvbHZpbmcgdG8gYnJhbmNoZXMgcmVzcG9uc2UuXG4gICAqL1xuICBhc3luYyBnZXRCcmFuY2hlcyhjYXJkSWQ6IHN0cmluZywgb3B0aW9ucz86IHsgd29ya3NwYWNlUGF0aD86IHN0cmluZyB9KTogUHJvbWlzZTxCcmFuY2hlc1Jlc3BvbnNlPiB7XG4gICAgY29uc3QgdXJsID0gdGhpcy5idWlsZFVybChgL2NhcmRzLyR7Y2FyZElkfS9icmFuY2hlc2AsIHtcbiAgICAgIHdvcmtzcGFjZVBhdGg6IG9wdGlvbnM/LndvcmtzcGFjZVBhdGhcbiAgICB9KTtcbiAgICByZXR1cm4gdGhpcy5yZXF1ZXN0KCgpID0+IHRoaXMuZ2V0SHR0cENsaWVudCgpLmdldDxCcmFuY2hlc1Jlc3BvbnNlPih1cmwpKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBZGRzIGEgYnJhbmNoIHRvIGEgY2FyZC5cbiAgICpcbiAgICogQHBhcmFtIGNhcmRJZCAtIFVuaXF1ZSBpZGVudGlmaWVyIG9mIHRoZSBjYXJkIHRvIGFkZCB0aGUgYnJhbmNoIHRvLlxuICAgKiBAcGFyYW0gZGF0YSAtIEJyYW5jaCBkYXRhIGluY2x1ZGluZyBuYW1lIGFuZCBvcHRpb25hbCB3b3JrdHJlZSBwYXRoLlxuICAgKiBAcGFyYW0gb3B0aW9ucyAtIE9wdGlvbmFsIHBhcmFtZXRlcnMuXG4gICAqIEBwYXJhbSBvcHRpb25zLnNlc3Npb25JZCAtIENsYXVkZSBDb2RlIHNlc3Npb24gSUQgZm9yd2FyZGVkIGFzIGBYLUNhcmRzLVNlc3Npb24tSWRgIGhlYWRlciBzbyB0aGUgY2FyZCByZXBvIHBvc3QtY29tbWl0IGhvb2sgY2FuIGF0dHJpYnV0ZSB0aGUgY29tbWl0LlxuICAgKiBAcmV0dXJucyBQcm9taXNlIHJlc29sdmluZyB3aGVuIHRoZSBicmFuY2ggaXMgYWRkZWQuXG4gICAqL1xuICBhc3luYyBhZGRCcmFuY2goY2FyZElkOiBzdHJpbmcsIGRhdGE6IEFkZEJyYW5jaFJlcXVlc3QsIG9wdGlvbnM/OiB7IHNlc3Npb25JZD86IHN0cmluZyB9KTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc3QgdXJsID0gdGhpcy5idWlsZFVybChgL2NhcmRzLyR7Y2FyZElkfS9icmFuY2hlc2ApO1xuICAgIGNvbnN0IGhlYWRlcnM6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4gPSB7fTtcbiAgICBpZiAob3B0aW9ucz8uc2Vzc2lvbklkKSB7XG4gICAgICBoZWFkZXJzWydYLUNhcmRzLVNlc3Npb24tSWQnXSA9IG9wdGlvbnMuc2Vzc2lvbklkO1xuICAgIH1cbiAgICBhd2FpdCB0aGlzLnJlcXVlc3QoKCkgPT4gdGhpcy5nZXRIdHRwQ2xpZW50KCkucG9zdDx1bmtub3duPih1cmwsIGRhdGEsIHsgaGVhZGVycyB9KSk7XG4gIH1cblxuICAvKipcbiAgICogUmVtb3ZlcyBhIGJyYW5jaCBmcm9tIGEgY2FyZC5cbiAgICpcbiAgICogQHBhcmFtIGNhcmRJZCAtIFVuaXF1ZSBpZGVudGlmaWVyIG9mIHRoZSBjYXJkIHRvIHJlbW92ZSB0aGUgYnJhbmNoIGZyb20uXG4gICAqIEBwYXJhbSBuYW1lIC0gQnJhbmNoIG5hbWUgdG8gcmVtb3ZlICh3aWxsIGJlIFVSTC1lbmNvZGVkKS5cbiAgICogQHBhcmFtIG9wdGlvbnMgLSBPcHRpb25hbCBwYXJhbWV0ZXJzLlxuICAgKiBAcGFyYW0gb3B0aW9ucy5zZXNzaW9uSWQgLSBDbGF1ZGUgQ29kZSBzZXNzaW9uIElEIGZvcndhcmRlZCBhcyBgWC1DYXJkcy1TZXNzaW9uLUlkYCBoZWFkZXIgc28gdGhlIGNhcmQgcmVwbyBwb3N0LWNvbW1pdCBob29rIGNhbiBhdHRyaWJ1dGUgdGhlIGNvbW1pdC5cbiAgICogQHJldHVybnMgUHJvbWlzZSByZXNvbHZpbmcgd2hlbiB0aGUgYnJhbmNoIGlzIHJlbW92ZWQuXG4gICAqL1xuICBhc3luYyByZW1vdmVCcmFuY2goY2FyZElkOiBzdHJpbmcsIG5hbWU6IHN0cmluZywgb3B0aW9ucz86IHsgc2Vzc2lvbklkPzogc3RyaW5nIH0pOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zdCB1cmwgPSB0aGlzLmJ1aWxkVXJsKGAvY2FyZHMvJHtjYXJkSWR9L2JyYW5jaGVzLyR7ZW5jb2RlVVJJQ29tcG9uZW50KG5hbWUpfWApO1xuICAgIGNvbnN0IGhlYWRlcnM6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4gPSB7fTtcbiAgICBpZiAob3B0aW9ucz8uc2Vzc2lvbklkKSB7XG4gICAgICBoZWFkZXJzWydYLUNhcmRzLVNlc3Npb24tSWQnXSA9IG9wdGlvbnMuc2Vzc2lvbklkO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5yZXF1ZXN0KCgpID0+IHRoaXMuZ2V0SHR0cENsaWVudCgpLmRlbGV0ZSh1cmwsIHsgaGVhZGVycyB9KSk7XG4gIH1cblxuICAvLyAtLS0gVGFnIE9wZXJhdGlvbnMgLS0tXG5cbiAgLyoqXG4gICAqIEdldHMgYWxsIGF2YWlsYWJsZSB0YWdzLlxuICAgKlxuICAgKiBAcmV0dXJucyBQcm9taXNlIHJlc29sdmluZyB0byB0YWcgc3RyaW5ncy5cbiAgICogQHRocm93cyBBcGlFcnJvciB3aGVuIHRoZSBzZXJ2ZXIgcmVzcG9uZHMgd2l0aCBhbiBlcnJvci5cbiAgICogQHRocm93cyBOZXR3b3JrRXJyb3Igd2hlbiB0aGUgcmVxdWVzdCBmYWlscyB0byByZWFjaCB0aGUgc2VydmVyLlxuICAgKi9cbiAgYXN5bmMgZ2V0VGFncygpOiBQcm9taXNlPHN0cmluZ1tdPiB7XG4gICAgY29uc3QgdXJsID0gdGhpcy5idWlsZFVybCgnL3RhZ3MnLCB7XG4gICAgICB3b3Jrc3BhY2VQYXRoOiB0aGlzLm9wdGlvbnMud29ya3NwYWNlUGF0aFxuICAgIH0pO1xuICAgIHJldHVybiB0aGlzLnJlcXVlc3QoKCkgPT4gdGhpcy5nZXRIdHRwQ2xpZW50KCkuZ2V0PHN0cmluZ1tdPih1cmwpKTtcbiAgfVxuXG4gIC8vIC0tLSBFbnZpcm9ubWVudCBPcGVyYXRpb25zIC0tLVxuXG4gIC8qKlxuICAgKiBGZXRjaGVzIGF2YWlsYWJsZSBhZ2VudCBlbnZpcm9ubWVudHMuXG4gICAqXG4gICAqIEByZXR1cm5zIFByb21pc2UgcmVzb2x2aW5nIHRvIGVudmlyb25tZW50IG1ldGFkYXRhLlxuICAgKiBAdGhyb3dzIEFwaUVycm9yIHdoZW4gdGhlIHNlcnZlciByZXNwb25kcyB3aXRoIGFuIGVycm9yLlxuICAgKiBAdGhyb3dzIE5ldHdvcmtFcnJvciB3aGVuIHRoZSByZXF1ZXN0IGZhaWxzIHRvIHJlYWNoIHRoZSBzZXJ2ZXIuXG4gICAqL1xuICBhc3luYyBnZXRFbnZpcm9ubWVudHMoKTogUHJvbWlzZTxBcnJheTx7IG5hbWU6IHN0cmluZzsgZGVzY3JpcHRpb24/OiBzdHJpbmcgfT4+IHtcbiAgICBjb25zdCB1cmwgPSB0aGlzLmJ1aWxkVXJsKCcvZW52aXJvbm1lbnRzJyk7XG4gICAgcmV0dXJuIHRoaXMucmVxdWVzdCgoKSA9PiB0aGlzLmdldEh0dHBDbGllbnQoKS5nZXQ8QXJyYXk8eyBuYW1lOiBzdHJpbmc7IGRlc2NyaXB0aW9uPzogc3RyaW5nIH0+Pih1cmwpKTtcbiAgfVxuXG4gIC8vIC0tLSBUeXBlZCBGaWxlIE9wZXJhdGlvbnMgLS0tXG5cbiAgLyoqXG4gICAqIFN1Ym1pdHMgYW4gYWRhcHRpdmUgY2FyZCBhY3Rpb24gYnkgd3JpdGluZyBhbiBgYWRhcHRpdmUtY2FyZC1zdWJtaXNzaW9uYCB0eXBlZCBmaWxlLlxuICAgKlxuICAgKiBAcGFyYW0gY2FyZElkIC0gVGhlIGNhcmQgY29udGFpbmluZyB0aGUgYWRhcHRpdmUgY2FyZC5cbiAgICogQHBhcmFtIGFjdGlvbklkIC0gVGhlIGFjdGlvbiBJRCBmcm9tIHRoZSBhZGFwdGl2ZSBjYXJkIHN1Ym1pdCBhY3Rpb24uXG4gICAqIEBwYXJhbSBkYXRhIC0gVGhlIGZvcm0gZGF0YSBjb2xsZWN0ZWQgYnkgdGhlIGFkYXB0aXZlIGNhcmQuXG4gICAqIEByZXR1cm5zIFByb21pc2UgcmVzb2x2aW5nIHdoZW4gdGhlIHN1Ym1pc3Npb24gaXMgcGVyc2lzdGVkLlxuICAgKiBAdGhyb3dzIEFwaUVycm9yIHdoZW4gdGhlIHNlcnZlciByZWplY3RzIHRoZSBzdWJtaXNzaW9uIChlLmcuIHZhbGlkYXRpb24gZmFpbHVyZSkuXG4gICAqIEB0aHJvd3MgTmV0d29ya0Vycm9yIHdoZW4gdGhlIHJlcXVlc3QgZmFpbHMgdG8gcmVhY2ggdGhlIHNlcnZlci5cbiAgICovXG4gIGFzeW5jIHN1Ym1pdENhcmRBY3Rpb24oY2FyZElkOiBzdHJpbmcsIGFjdGlvbklkOiBzdHJpbmcsIGRhdGE6IFJlY29yZDxzdHJpbmcsIHVua25vd24+KTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc3QgZmlsZU5hbWUgPSBgJHthY3Rpb25JZH0tJHtEYXRlLm5vdygpfS5qc29uYDtcbiAgICBjb25zdCB1cmwgPSB0aGlzLmJ1aWxkVXJsKGAvY2FyZHMvJHtjYXJkSWR9L2FkYXB0aXZlLWNhcmQtc3VibWlzc2lvbi8ke2VuY29kZVVSSUNvbXBvbmVudChmaWxlTmFtZSl9YCk7XG4gICAgY29uc3QgYm9keSA9IHsgY2FyZElkLCBhY3Rpb25JZCwgZGF0YSB9O1xuICAgIGF3YWl0IHRoaXMucmVxdWVzdCgoKSA9PiB0aGlzLmdldEh0dHBDbGllbnQoKS5wdXQ8dW5rbm93bj4odXJsLCBib2R5KSk7XG4gIH1cblxuICAvLyAtLS0gVHlwZSBTY2hlbWEgT3BlcmF0aW9ucyAtLS1cblxuICAvKipcbiAgICogR2V0cyB0eXBlIHNjaGVtYXMgYW5kIGRlc2NyaXB0aW9ucyBmb3IgYSBjYXJkJ3MgZW52aXJvbm1lbnQuXG4gICAqXG4gICAqIFJldHVybnMgbWV0YWRhdGEgYWJvdXQgZWFjaCByZWdpc3RlcmVkIHR5cGUgaW4gdGhlIGNhcmQncyBlbnZpcm9ubWVudCxcbiAgICogaW5jbHVkaW5nIHZlcnNpb24sIHNjaGVtYSwgYW5kIGRlc2NyaXB0aW9uLiBDb21tYW5kIGRldGFpbHMgYXJlIGV4Y2x1ZGVkLlxuICAgKlxuICAgKiBAcGFyYW0gY2FyZElkIC0gSWRlbnRpZmllciBvZiB0aGUgY2FyZCB3aG9zZSB0eXBlIHNjaGVtYSBtZXRhZGF0YSBzaG91bGQgYmUgZmV0Y2hlZC5cbiAgICogQHJldHVybnMgUHJvbWlzZSByZXNvbHZpbmcgdG8gdHlwZSBzY2hlbWEgaW5mb3JtYXRpb24uXG4gICAqIEB0aHJvd3MgQXBpRXJyb3Igd2hlbiB0aGUgc2VydmVyIHJlc3BvbmRzIHdpdGggYW4gZXJyb3IuXG4gICAqIEB0aHJvd3MgTmV0d29ya0Vycm9yIHdoZW4gdGhlIHJlcXVlc3QgZmFpbHMgdG8gcmVhY2ggdGhlIHNlcnZlci5cbiAgICovXG4gIGFzeW5jIGdldFR5cGVTY2hlbWFzKGNhcmRJZDogc3RyaW5nKTogUHJvbWlzZTxUeXBlU2NoZW1hc1Jlc3BvbnNlPiB7XG4gICAgY29uc3QgdXJsID0gdGhpcy5idWlsZFVybChgL2NhcmRzLyR7Y2FyZElkfS9zY2hlbWFgKTtcbiAgICByZXR1cm4gdGhpcy5yZXF1ZXN0KCgpID0+IHRoaXMuZ2V0SHR0cENsaWVudCgpLmdldDxUeXBlU2NoZW1hc1Jlc3BvbnNlPih1cmwpKTtcbiAgfVxuXG4gIC8vIC0tLSBTdHJlYW0gT3BlcmF0aW9ucyAtLS1cblxuICAvKipcbiAgICogTGlzdHMgYWxsIHN0cmVhbXMgYXR0YWNoZWQgdG8gYSBjYXJkLCBzb3J0ZWQgYnkgY3JlYXRpb24gdGltZS5cbiAgICpcbiAgICogQHBhcmFtIGNhcmRJZCAtIENhcmQgSUQgdG8gcXVlcnkuXG4gICAqIEByZXR1cm5zIFN0cmVhbSBtZXRhZGF0YSBhcnJheSAobWF5IGJlIGVtcHR5KS5cbiAgICogQHRocm93cyBBcGlFcnJvciB3aGVuIHRoZSBzZXJ2ZXIgcmVzcG9uZHMgd2l0aCBhbiBlcnJvciAoZS5nLiwgNDA0IGZvciB1bmtub3duIGNhcmQpLlxuICAgKiBAdGhyb3dzIE5ldHdvcmtFcnJvciB3aGVuIHRoZSByZXF1ZXN0IGZhaWxzIHRvIHJlYWNoIHRoZSBzZXJ2ZXIuXG4gICAqL1xuICBhc3luYyBsaXN0U3RyZWFtcyhjYXJkSWQ6IHN0cmluZyk6IFByb21pc2U8U3RyZWFtTWV0YVtdPiB7XG4gICAgY29uc3QgdXJsID0gdGhpcy5idWlsZFVybChgL2NhcmRzLyR7Y2FyZElkfS9zdHJlYW1zYCk7XG4gICAgcmV0dXJuIHRoaXMucmVxdWVzdCgoKSA9PiB0aGlzLmdldEh0dHBDbGllbnQoKS5nZXQ8U3RyZWFtTWV0YVtdPih1cmwpKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXRyaWV2ZXMgYSBzdHJlYW0ncyBtZXRhZGF0YSBhbmQgYWxsIHJhdyBsaW5lcy5cbiAgICpcbiAgICogVGhlIGBzdHJlYW1UeXBlYCBhbmQgYGZpbGVuYW1lYCBhcmUgVVJJLWVuY29kZWQgYXV0b21hdGljYWxseS4gRm9yIGNvbXBsZXRlZFxuICAgKiBzdHJlYW1zIHRoZSByZXR1cm5lZCBgbGluZXNgIGFycmF5IGlzIHRoZSBmdWxsIGNvbnRlbnQ7IGZvciBhY3RpdmUgc3RyZWFtcyBpdFxuICAgKiBpcyBhIHNuYXBzaG90IHRoYXQgbWF5IGdyb3cgd2hpbGUgdGhlIGNhbGxlciBwcm9jZXNzZXMgaXQuXG4gICAqXG4gICAqIEBwYXJhbSBjYXJkSWQgLSBJZGVudGlmaWVyIG9mIHRoZSBjYXJkIHRoYXQgb3ducyB0aGUgcmVxdWVzdGVkIHN0cmVhbS5cbiAgICogQHBhcmFtIHN0cmVhbVR5cGUgLSBTdHJlYW0gdHlwZSBrZXkgKGUuZy4sIGBcImNsYXVkZS1jb2RlLXNlc3Npb25cImApLlxuICAgKiBAcGFyYW0gZmlsZW5hbWUgLSBTdHJlYW0gZmlsZW5hbWUgKGUuZy4sIGBcInNlc3Npb24ubG9nXCJgKS5cbiAgICogQHJldHVybnMgTWV0YWRhdGEgYW5kIGNvbnRlbnQgbGluZXMuXG4gICAqIEB0aHJvd3MgQXBpRXJyb3Igb24gNDA0ICh1bmtub3duIGNhcmQgb3Igc3RyZWFtKSBvciBvdGhlciBzZXJ2ZXIgZXJyb3JzLlxuICAgKiBAdGhyb3dzIE5ldHdvcmtFcnJvciB3aGVuIHRoZSByZXF1ZXN0IGZhaWxzIHRvIHJlYWNoIHRoZSBzZXJ2ZXIuXG4gICAqL1xuICBhc3luYyBnZXRTdHJlYW0oXG4gICAgY2FyZElkOiBzdHJpbmcsXG4gICAgc3RyZWFtVHlwZTogc3RyaW5nLFxuICAgIGZpbGVuYW1lOiBzdHJpbmdcbiAgKTogUHJvbWlzZTx7IG1ldGE6IFN0cmVhbU1ldGE7IGxpbmVzOiBzdHJpbmdbXSB9PiB7XG4gICAgY29uc3QgdXJsID0gdGhpcy5idWlsZFVybChcbiAgICAgIGAvY2FyZHMvJHtjYXJkSWR9L3N0cmVhbXMvJHtlbmNvZGVVUklDb21wb25lbnQoc3RyZWFtVHlwZSl9LyR7ZW5jb2RlVVJJQ29tcG9uZW50KGZpbGVuYW1lKX1gXG4gICAgKTtcbiAgICByZXR1cm4gdGhpcy5yZXF1ZXN0KCgpID0+IHRoaXMuZ2V0SHR0cENsaWVudCgpLmdldDx7IG1ldGE6IFN0cmVhbU1ldGE7IGxpbmVzOiBzdHJpbmdbXSB9Pih1cmwpKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBPcGVucyBhIGNodW5rZWQgSlNPTkwgc3RyZWFtIHRvIHRoZSBzZXJ2ZXIgYW5kIHJldHVybnMgYSB3cml0ZXIuXG4gICAqXG4gICAqIFRoZSB3cml0ZXIgc2VuZHMgZWFjaCBsaW5lIGluIHJlYWwtdGltZSBvdmVyIGEgc2luZ2xlIEhUVFAgUE9TVCB1c2luZyBhXG4gICAqIGBSZWFkYWJsZVN0cmVhbWAgYm9keS4gQ2FsbCB7QGxpbmsgU3RyZWFtV3JpdGVyLmNsb3NlfSB3aGVuIHRoZSBwcm9kdWNlclxuICAgKiBpcyBmaW5pc2hlZCB0byBlbmQgdGhlIHJlcXVlc3QgYW5kIHJldHJpZXZlIHRoZSBzZXJ2ZXIncyBzdW1tYXJ5LlxuICAgKlxuICAgKiBAcGFyYW0gY2FyZElkIC0gQ2FyZCBJRCB0byBhdHRhY2ggdGhlIHN0cmVhbSB0by5cbiAgICogQHBhcmFtIHN0cmVhbVR5cGUgLSBTdHJlYW0gdHlwZSBrZXkgZnJvbSBzZXR0aW5ncy5qc29uIChlLmcuLCBgXCJjbGF1ZGUtY29kZS1zZXNzaW9uXCJgKS5cbiAgICogQHBhcmFtIGZpbGVuYW1lIC0gU3RyZWFtIGZpbGVuYW1lIChlLmcuLCBgXCJzZXNzaW9uLWFiYy5qc29ubFwiYCkuXG4gICAqIEBwYXJhbSBvcHRpb25zIC0gT3B0aW9uYWwgdGl0bGUgYW5kIHNlc3Npb24gSUQgbWV0YWRhdGEuXG4gICAqIEByZXR1cm5zIEEge0BsaW5rIFN0cmVhbVdyaXRlcn0gZm9yIHB1c2hpbmcgbGluZXMgYW5kIGNsb3NpbmcgdGhlIHN0cmVhbS5cbiAgICpcbiAgICogQGV4YW1wbGVcbiAgICogYGBgdHlwZXNjcmlwdFxuICAgKiBjb25zdCBzdHJlYW0gPSBjbGllbnQub3BlblN0cmVhbShjYXJkSWQsICdjbGF1ZGUtY29kZS1zZXNzaW9uJywgJ3J1bi5qc29ubCcpO1xuICAgKiBzdHJlYW0ud3JpdGUoSlNPTi5zdHJpbmdpZnkoeyB0eXBlOiAnaW5pdCcgfSkpO1xuICAgKiBzdHJlYW0ud3JpdGUoSlNPTi5zdHJpbmdpZnkoeyB0eXBlOiAncmVzdWx0JyB9KSk7XG4gICAqIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHN0cmVhbS5jbG9zZSgpO1xuICAgKiBgYGBcbiAgICovXG4gIG9wZW5TdHJlYW0oY2FyZElkOiBzdHJpbmcsIHN0cmVhbVR5cGU6IHN0cmluZywgZmlsZW5hbWU6IHN0cmluZywgb3B0aW9ucz86IFN0cmVhbVdyaXRlck9wdGlvbnMpOiBTdHJlYW1Xcml0ZXIge1xuICAgIGNvbnN0IGVuY29kZXIgPSBuZXcgVGV4dEVuY29kZXIoKTtcbiAgICBsZXQgY29udHJvbGxlciE6IFJlYWRhYmxlU3RyZWFtRGVmYXVsdENvbnRyb2xsZXI8VWludDhBcnJheT47XG5cbiAgICBjb25zdCBib2R5ID0gbmV3IFJlYWRhYmxlU3RyZWFtPFVpbnQ4QXJyYXk+KHtcbiAgICAgIHN0YXJ0KGMpIHtcbiAgICAgICAgY29udHJvbGxlciA9IGM7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICBjb25zdCB1cmwgPSB0aGlzLmJ1aWxkVXJsKFxuICAgICAgYC9jYXJkcy8ke2NhcmRJZH0vc3RyZWFtcy8ke2VuY29kZVVSSUNvbXBvbmVudChzdHJlYW1UeXBlKX0vJHtlbmNvZGVVUklDb21wb25lbnQoZmlsZW5hbWUpfWBcbiAgICApO1xuXG4gICAgY29uc3QgaGVhZGVyczogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHtcbiAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24veC1uZGpzb24nXG4gICAgfTtcbiAgICBpZiAodGhpcy5vcHRpb25zLmFjY2Vzc1Rva2VuKSB7XG4gICAgICBoZWFkZXJzWydBdXRob3JpemF0aW9uJ10gPSBgQmVhcmVyICR7dGhpcy5vcHRpb25zLmFjY2Vzc1Rva2VufWA7XG4gICAgfVxuICAgIGlmIChvcHRpb25zPy50aXRsZSkge1xuICAgICAgaGVhZGVyc1snWC1TdHJlYW0tVGl0bGUnXSA9IG9wdGlvbnMudGl0bGU7XG4gICAgfVxuICAgIGlmIChvcHRpb25zPy5zZXNzaW9uSWQpIHtcbiAgICAgIGhlYWRlcnNbJ1gtU3RyZWFtLVNlc3Npb24tSWQnXSA9IG9wdGlvbnMuc2Vzc2lvbklkO1xuICAgIH1cblxuICAgIC8vIGBkdXBsZXg6ICdoYWxmJ2AgaXMgcmVxdWlyZWQgYnkgdW5kaWNpIGZvciBzdHJlYW1pbmcgcmVxdWVzdCBib2RpZXNcbiAgICAvLyBidXQgaXMgbm90IHlldCBpbiB0aGUgc3RhbmRhcmQgbGliLmRvbSBSZXF1ZXN0SW5pdCB0eXBlLlxuICAgIGNvbnN0IGZldGNoT3B0aW9uczogUmVxdWVzdEluaXQgJiB7IGR1cGxleDogc3RyaW5nIH0gPSB7XG4gICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgIGhlYWRlcnMsXG4gICAgICBib2R5LFxuICAgICAgZHVwbGV4OiAnaGFsZidcbiAgICB9O1xuXG4gICAgY29uc3QgcmVzcG9uc2VQcm9taXNlID0gZmV0Y2godXJsLCBmZXRjaE9wdGlvbnMpO1xuXG4gICAgLy8gVHJhY2sgZWFybHkgcmVqZWN0aW9uIGZyb20gdGhlIHNlcnZlciAoZS5nLiA0MDkgXCJTdHJlYW0gYWxyZWFkeVxuICAgIC8vIGV4aXN0cyBhbmQgaXMgYWN0aXZlXCIpLiAgRm9yIGEgc3VjY2Vzc2Z1bCBzdHJlYW0gdGhlIHJlc3BvbnNlIHN0YXlzXG4gICAgLy8gcGVuZGluZyB1bnRpbCBjbG9zZSgpIGVuZHMgdGhlIGJvZHkgXHUyMDE0IGJ1dCBlcnJvciByZXNwb25zZXMgYXJyaXZlXG4gICAgLy8gaW1tZWRpYXRlbHkgYW5kIG11c3QgYmUgc3VyZmFjZWQgd2l0aG91dCB3YWl0aW5nIGZvciBjbG9zZSgpLlxuICAgIC8vIE5vdGU6IG9ubHkgcmVhZHMgcmVzcG9uc2Uub2svc3RhdHVzVGV4dCAobm90IHRoZSBib2R5KSBzbyBjbG9zZSgpXG4gICAgLy8gY2FuIHN0aWxsIHBhcnNlIHRoZSBmdWxsIGVycm9yIHJlc3BvbnNlLlxuICAgIGxldCBlYXJseUVycm9yOiBFcnJvciB8IG51bGwgPSBudWxsO1xuICAgIHJlc3BvbnNlUHJvbWlzZVxuICAgICAgLnRoZW4oKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgIGlmICghcmVzcG9uc2Uub2spIHtcbiAgICAgICAgICBlYXJseUVycm9yID0gbmV3IEFwaUVycm9yKHJlc3BvbnNlLnN0YXR1c1RleHQsIFN0cmluZyhyZXNwb25zZS5zdGF0dXMpKTtcbiAgICAgICAgfVxuICAgICAgfSlcbiAgICAgIC5jYXRjaCgoZXJyOiB1bmtub3duKSA9PiB7XG4gICAgICAgIGVhcmx5RXJyb3IgPSBlcnIgaW5zdGFuY2VvZiBFcnJvciA/IGVyciA6IG5ldyBFcnJvcihTdHJpbmcoZXJyKSk7XG4gICAgICB9KTtcblxuICAgIHJldHVybiB7XG4gICAgICB3cml0ZShsaW5lOiBzdHJpbmcpOiB2b2lkIHtcbiAgICAgICAgaWYgKGVhcmx5RXJyb3IpIHRocm93IGVhcmx5RXJyb3I7XG4gICAgICAgIGNvbnRyb2xsZXIuZW5xdWV1ZShlbmNvZGVyLmVuY29kZShgJHtsaW5lfVxcbmApKTtcbiAgICAgIH0sXG4gICAgICBjbG9zZTogYXN5bmMgKCk6IFByb21pc2U8U3RyZWFtUmVzdWx0PiA9PiB7XG4gICAgICAgIGNvbnRyb2xsZXIuY2xvc2UoKTtcbiAgICAgICAgcmV0dXJuIHRoaXMucmVxdWVzdChhc3luYyAoKSA9PiB7XG4gICAgICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCByZXNwb25zZVByb21pc2U7XG4gICAgICAgICAgaWYgKCFyZXNwb25zZS5vaykgdGhyb3cgcmVzcG9uc2U7XG4gICAgICAgICAgcmV0dXJuIHJlc3BvbnNlLmpzb24oKSBhcyBQcm9taXNlPFN0cmVhbVJlc3VsdD47XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH07XG4gIH1cblxuICAvKipcbiAgICogT3BlbnMgYSBXZWJTb2NrZXQtYmFja2VkIEpTT05MIHN0cmVhbSB0byB0aGUgc2VydmVyIGFuZCByZXR1cm5zIGEgc2Vzc2lvbi5cbiAgICpcbiAgICogVGhlIHNlc3Npb24ga2VlcHMgYSBwZXJzaXN0ZW50IFdlYlNvY2tldCBjb25uZWN0aW9uIGZvciB0aGUgZW50aXJlIHNlc3Npb25cbiAgICogbGlmZXRpbWUuIFRoZSBzZXJ2ZXIgc2VuZHMgYSBgcmVhZHlgIG1lc3NhZ2Ugd2l0aCBgcmVzdW1lRnJvbWAgYmVmb3JlIHRoZVxuICAgKiBjYWxsZXIgd3JpdGVzIGFueSBsaW5lcywgc28gdGhlIHdhdGNoZXIgY2FuIHNraXAgbGluZXMgdGhlIHNlcnZlciBhbHJlYWR5IGhhcy5cbiAgICpcbiAgICogQ2FsbCB7QGxpbmsgV3NTdHJlYW1TZXNzaW9uLmNsb3NlfSB3aGVuIHRoZSBwcm9kdWNlciBpcyBmaW5pc2hlZCB0byBzZW5kIGFcbiAgICogZ3JhY2VmdWwgY2xvc2UgbWVzc2FnZSBhbmQgYXdhaXQgdGhlIHNlcnZlcidzIGFja25vd2xlZGdlbWVudC5cbiAgICpcbiAgICogQHBhcmFtIGNhcmRJZCAtIENhcmQgSUQgdG8gYXR0YWNoIHRoZSBzdHJlYW0gdG8uXG4gICAqIEBwYXJhbSBzdHJlYW1UeXBlIC0gU3RyZWFtIHR5cGUga2V5IGZyb20gc2V0dGluZ3MuanNvbiAoZS5nLiwgYFwiY2xhdWRlLWNvZGUtc2Vzc2lvblwiYCkuXG4gICAqIEBwYXJhbSBmaWxlbmFtZSAtIFN0cmVhbSBmaWxlbmFtZSAoZS5nLiwgYFwic2Vzc2lvbi1hYmMuanNvbmxcImApLlxuICAgKiBAcGFyYW0gb3B0aW9ucyAtIFRpdGxlIGFuZCBzZXNzaW9uIElEIG1ldGFkYXRhIGZvcndhcmRlZCB0byB0aGUgc2VydmVyIGFzIFVSTCBxdWVyeSBwYXJhbWV0ZXJzLlxuICAgKiBAcGFyYW0gd3NGYWN0b3J5IC0gV2ViU29ja2V0IGZhY3RvcnkgZm9yIGNyZWF0aW5nIHRoZSBjb25uZWN0aW9uLiBVc2UgdGhlIGB3c2AgcGFja2FnZSBpbiBOb2RlLmpzIGVudmlyb25tZW50cy5cbiAgICogQHJldHVybnMgQSB7QGxpbmsgV3NTdHJlYW1TZXNzaW9ufSB3aXRoIGByZXN1bWVGcm9tYCBzZXQgdG8gdGhlIHNlcnZlcidzIGN1cnJlbnQgbGluZSBjb3VudC5cbiAgICogQHRocm93cyBFcnJvciB3aGVuIHRoZSBXZWJTb2NrZXQgZmFpbHMgdG8gY29ubmVjdCBvciB0aGUgc2VydmVyIHNlbmRzIGFuIGVycm9yIGJlZm9yZSBgcmVhZHlgLlxuICAgKi9cbiAgYXN5bmMgb3BlblN0cmVhbVdlYlNvY2tldChcbiAgICBjYXJkSWQ6IHN0cmluZyxcbiAgICBzdHJlYW1UeXBlOiBzdHJpbmcsXG4gICAgZmlsZW5hbWU6IHN0cmluZyxcbiAgICBvcHRpb25zOiBTdHJlYW1Xcml0ZXJPcHRpb25zLFxuICAgIHdzRmFjdG9yeTogSW5nZXN0V3NGYWN0b3J5XG4gICk6IFByb21pc2U8V3NTdHJlYW1TZXNzaW9uPiB7XG4gICAgY29uc3QgZmFjdG9yeSA9IHdzRmFjdG9yeTtcblxuICAgIC8vIENvbnZlcnQgaHR0cC9odHRwcyB0byB3cy93c3NcbiAgICBjb25zdCBiYXNlVXJsID0gdGhpcy5vcHRpb25zLmJhc2VVcmwucmVwbGFjZSgvXmh0dHAvLCAnd3MnKTtcbiAgICBjb25zdCBiYXNlUGF0aCA9IGAke2Jhc2VVcmx9L2NhcmRzLyR7ZW5jb2RlVVJJQ29tcG9uZW50KGNhcmRJZCl9L3N0cmVhbXMvJHtlbmNvZGVVUklDb21wb25lbnQoc3RyZWFtVHlwZSl9LyR7ZW5jb2RlVVJJQ29tcG9uZW50KGZpbGVuYW1lKX1gO1xuICAgIGNvbnN0IHF1ZXJ5UGFyYW1zID0gbmV3IFVSTFNlYXJjaFBhcmFtcygpO1xuICAgIGlmIChvcHRpb25zPy50aXRsZSkgcXVlcnlQYXJhbXMuc2V0KCd0aXRsZScsIG9wdGlvbnMudGl0bGUpO1xuICAgIGlmIChvcHRpb25zPy5zZXNzaW9uSWQpIHF1ZXJ5UGFyYW1zLnNldCgnc2Vzc2lvbklkJywgb3B0aW9ucy5zZXNzaW9uSWQpO1xuICAgIGNvbnN0IHF1ZXJ5U3RyaW5nID0gcXVlcnlQYXJhbXMudG9TdHJpbmcoKTtcbiAgICBjb25zdCB1cmwgPSBxdWVyeVN0cmluZyA/IGAke2Jhc2VQYXRofT8ke3F1ZXJ5U3RyaW5nfWAgOiBiYXNlUGF0aDtcblxuICAgIGNvbnN0IGhlYWRlcnM6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4gPSB7fTtcbiAgICBpZiAodGhpcy5vcHRpb25zLmFjY2Vzc1Rva2VuKSB7XG4gICAgICBoZWFkZXJzWydBdXRob3JpemF0aW9uJ10gPSBgQmVhcmVyICR7dGhpcy5vcHRpb25zLmFjY2Vzc1Rva2VufWA7XG4gICAgfVxuXG4gICAgY29uc3Qgd3MgPSBmYWN0b3J5KHVybCwgeyBoZWFkZXJzIH0pO1xuXG4gICAgLy8gQXdhaXQgdGhlICdyZWFkeScgbWVzc2FnZSBmcm9tIHRoZSBzZXJ2ZXIgYmVmb3JlIHJldHVybmluZyB0byB0aGUgY2FsbGVyLlxuICAgIC8vIEFueSBlcnJvciBvciBwcmVtYXR1cmUgY2xvc2UgYmVmb3JlICdyZWFkeScgcmVqZWN0cyB0aGUgcHJvbWlzZS5cbiAgICBjb25zdCByZXN1bWVGcm9tID0gYXdhaXQgbmV3IFByb21pc2U8bnVtYmVyPigocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICBjb25zdCBvblJlYWR5ID0gKGV2ZW50OiBNZXNzYWdlRXZlbnQ8dW5rbm93bj4pID0+IHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBjb25zdCBtc2cgPSBKU09OLnBhcnNlKFN0cmluZyhldmVudC5kYXRhKSkgYXMgeyB0eXBlOiBzdHJpbmc7IHJlc3VtZUZyb20/OiBudW1iZXI7IG1lc3NhZ2U/OiBzdHJpbmcgfTtcbiAgICAgICAgICBpZiAobXNnLnR5cGUgPT09ICdyZWFkeScpIHtcbiAgICAgICAgICAgIHdzLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ21lc3NhZ2UnLCBvblJlYWR5KTtcbiAgICAgICAgICAgIHdzLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2Vycm9yJywgb25FcnJvcik7XG4gICAgICAgICAgICB3cy5yZW1vdmVFdmVudExpc3RlbmVyKCdjbG9zZScsIG9uQ2xvc2UpO1xuICAgICAgICAgICAgcmVzb2x2ZShtc2cucmVzdW1lRnJvbSA/PyAwKTtcbiAgICAgICAgICB9IGVsc2UgaWYgKG1zZy50eXBlID09PSAnZXJyb3InKSB7XG4gICAgICAgICAgICB3cy5yZW1vdmVFdmVudExpc3RlbmVyKCdtZXNzYWdlJywgb25SZWFkeSk7XG4gICAgICAgICAgICB3cy5yZW1vdmVFdmVudExpc3RlbmVyKCdlcnJvcicsIG9uRXJyb3IpO1xuICAgICAgICAgICAgd3MucmVtb3ZlRXZlbnRMaXN0ZW5lcignY2xvc2UnLCBvbkNsb3NlKTtcbiAgICAgICAgICAgIHJlamVjdChuZXcgRXJyb3IobXNnLm1lc3NhZ2UgPz8gJ1NlcnZlciBlcnJvcicpKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgLy8gT3RoZXIgbWVzc2FnZSB0eXBlcyBiZWZvcmUgJ3JlYWR5JyBhcmUgc2lsZW50bHkgaWdub3JlZFxuICAgICAgICB9IGNhdGNoIHtcbiAgICAgICAgICByZWplY3QobmV3IEVycm9yKCdGYWlsZWQgdG8gcGFyc2Ugc2VydmVyIHJlYWR5IG1lc3NhZ2UnKSk7XG4gICAgICAgIH1cbiAgICAgIH07XG4gICAgICBjb25zdCBvbkVycm9yID0gKGV2ZW50OiBFdmVudCkgPT4ge1xuICAgICAgICB3cy5yZW1vdmVFdmVudExpc3RlbmVyKCdtZXNzYWdlJywgb25SZWFkeSk7XG4gICAgICAgIHdzLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2Vycm9yJywgb25FcnJvcik7XG4gICAgICAgIHdzLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2Nsb3NlJywgb25DbG9zZSk7XG4gICAgICAgIHJlamVjdChuZXcgRXJyb3IoYFdlYlNvY2tldCBlcnJvcjogJHtTdHJpbmcoZXZlbnQpfWApKTtcbiAgICAgIH07XG4gICAgICBjb25zdCBvbkNsb3NlID0gKGV2ZW50OiBDbG9zZUV2ZW50KSA9PiB7XG4gICAgICAgIHdzLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ21lc3NhZ2UnLCBvblJlYWR5KTtcbiAgICAgICAgd3MucmVtb3ZlRXZlbnRMaXN0ZW5lcignZXJyb3InLCBvbkVycm9yKTtcbiAgICAgICAgd3MucmVtb3ZlRXZlbnRMaXN0ZW5lcignY2xvc2UnLCBvbkNsb3NlKTtcbiAgICAgICAgcmVqZWN0KG5ldyBFcnJvcihgV2ViU29ja2V0IGNsb3NlZCBiZWZvcmUgcmVhZHk6IGNvZGU9JHtTdHJpbmcoZXZlbnQuY29kZSl9YCkpO1xuICAgICAgfTtcbiAgICAgIHdzLmFkZEV2ZW50TGlzdGVuZXIoJ21lc3NhZ2UnLCBvblJlYWR5KTtcbiAgICAgIHdzLmFkZEV2ZW50TGlzdGVuZXIoJ2Vycm9yJywgb25FcnJvcik7XG4gICAgICB3cy5hZGRFdmVudExpc3RlbmVyKCdjbG9zZScsIG9uQ2xvc2UpO1xuICAgIH0pO1xuXG4gICAgbGV0IGxpbmVzU2VudCA9IHJlc3VtZUZyb207XG5cbiAgICByZXR1cm4ge1xuICAgICAgZ2V0IHJlc3VtZUZyb20oKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHJlc3VtZUZyb207XG4gICAgICB9LFxuICAgICAgZ2V0IGxpbmVzU2VudCgpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gbGluZXNTZW50O1xuICAgICAgfSxcbiAgICAgIHdyaXRlKGxpbmU6IHN0cmluZyk6IHZvaWQge1xuICAgICAgICBsaW5lc1NlbnQrKztcbiAgICAgICAgd3Muc2VuZChKU09OLnN0cmluZ2lmeSh7IHR5cGU6ICdsaW5lJywgbGluZU51bWJlcjogbGluZXNTZW50LCBjb250ZW50OiBsaW5lIH0pKTtcbiAgICAgIH0sXG4gICAgICBhc3luYyBjbG9zZSgpOiBQcm9taXNlPFN0cmVhbVJlc3VsdD4ge1xuICAgICAgICB3cy5zZW5kKEpTT04uc3RyaW5naWZ5KHsgdHlwZTogJ2Nsb3NlJyB9KSk7XG4gICAgICAgIGF3YWl0IG5ldyBQcm9taXNlPHZvaWQ+KChyZXNvbHZlKSA9PiB7XG4gICAgICAgICAgY29uc3Qgb25DbG9zZSA9ICgpID0+IHtcbiAgICAgICAgICAgIHdzLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2Nsb3NlJywgb25DbG9zZSk7XG4gICAgICAgICAgICByZXNvbHZlKCk7XG4gICAgICAgICAgfTtcbiAgICAgICAgICB3cy5hZGRFdmVudExpc3RlbmVyKCdjbG9zZScsIG9uQ2xvc2UpO1xuICAgICAgICAgIC8vIElmIGFscmVhZHkgY2xvc2VkLCByZXNvbHZlIGltbWVkaWF0ZWx5XG4gICAgICAgICAgaWYgKHdzLnJlYWR5U3RhdGUgPT09IHdzLkNMT1NFRCkge1xuICAgICAgICAgICAgd3MucmVtb3ZlRXZlbnRMaXN0ZW5lcignY2xvc2UnLCBvbkNsb3NlKTtcbiAgICAgICAgICAgIHJlc29sdmUoKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgIGZpbGVuYW1lLFxuICAgICAgICAgIHN0cmVhbVR5cGUsXG4gICAgICAgICAgbGluZUNvdW50OiBsaW5lc1NlbnQsXG4gICAgICAgICAgc3RhdHVzOiAnY29tcGxldGVkJ1xuICAgICAgICB9O1xuICAgICAgfVxuICAgIH07XG4gIH1cblxuICAvLyAtLS0gQWN0aW9uIE9wZXJhdGlvbnMgLS0tXG5cbiAgLyoqXG4gICAqIEV4ZWN1dGVzIGFuIGFjdGlvbiBvbiBhIGNhcmQgdmlhIHRoZSBzZXJ2ZXIgcmVsYXkuXG4gICAqXG4gICAqIEBwYXJhbSBjYXJkSWQgLSBJZGVudGlmaWVyIG9mIHRoZSBjYXJkIHRvIGV4ZWN1dGUgdGhlIGFjdGlvbiBvbi5cbiAgICogQHBhcmFtIGFjdGlvbk5hbWUgLSBBY3Rpb24gaWRlbnRpZmllciAoZS5nLiwgJ2xhdW5jaCcpLlxuICAgKiBAcmV0dXJucyBQcm9taXNlIHJlc29sdmluZyB0byB0aGUgYWN0aW9uIGV4ZWN1dGlvbiByZXN1bHQuXG4gICAqIEB0aHJvd3MgQXBpRXJyb3Igd2hlbiB0aGUgc2VydmVyIHJlamVjdHMgdGhlIHJlcXVlc3QuXG4gICAqIEB0aHJvd3MgTmV0d29ya0Vycm9yIHdoZW4gdGhlIHJlcXVlc3QgZmFpbHMgdG8gcmVhY2ggdGhlIHNlcnZlci5cbiAgICovXG4gIGFzeW5jIGV4ZWN1dGVBY3Rpb24oY2FyZElkOiBzdHJpbmcsIGFjdGlvbk5hbWU6IHN0cmluZyk6IFByb21pc2U8QWN0aW9uUmVzdWx0PiB7XG4gICAgY29uc3QgdXJsID0gdGhpcy5idWlsZFVybChgL2NhcmRzLyR7Y2FyZElkfS9hY3Rpb25zLyR7ZW5jb2RlVVJJQ29tcG9uZW50KGFjdGlvbk5hbWUpfWApO1xuICAgIHJldHVybiB0aGlzLnJlcXVlc3QoKCkgPT4gdGhpcy5nZXRIdHRwQ2xpZW50KCkucG9zdDxBY3Rpb25SZXN1bHQ+KHVybCwgdW5kZWZpbmVkKSk7XG4gIH1cblxuICAvLyAtLS0gQ29tcGFyZSBPcGVyYXRpb25zIC0tLVxuXG4gIC8qKlxuICAgKiBTZXRzIG9yIHJlcGxhY2VzIHRoZSBhY3RpdmUgY29tcGFyaXNvbiBvbiB0aGUgc2VydmVyLlxuICAgKlxuICAgKiBAcGFyYW0gcmVxdWVzdCAtIENvbXBhcmUgcmVxdWVzdCBzcGVjaWZ5aW5nIHRoZSBjb21wYXJpc29uIG1vZGUuXG4gICAqIEByZXR1cm5zIFByb21pc2UgcmVzb2x2aW5nIHRvIHRoZSByZXN1bHRpbmcgY29tcGFyZSBzdGF0ZS5cbiAgICovXG4gIGFzeW5jIHNldENvbXBhcmUocmVxdWVzdDogQ29tcGFyZVJlcXVlc3QpOiBQcm9taXNlPENvbXBhcmVTdGF0ZT4ge1xuICAgIGNvbnN0IHVybCA9IHRoaXMuYnVpbGRVcmwoJy9jb21wYXJlJyk7XG4gICAgcmV0dXJuIHRoaXMucmVxdWVzdCgoKSA9PiB0aGlzLmdldEh0dHBDbGllbnQoKS5wb3N0PENvbXBhcmVTdGF0ZT4odXJsLCByZXF1ZXN0KSk7XG4gIH1cblxuICAvKipcbiAgICogUmV0dXJucyB0aGUgY3VycmVudCBjb21wYXJlIHN0YXRlLCBvciBudWxsIGlmIG5vIGNvbXBhcmlzb24gaXMgYWN0aXZlLlxuICAgKlxuICAgKiBUaGUgc2VydmVyIHJldHVybnMgMjA0IHdoZW4gbm8gY29tcGFyaXNvbiBpcyBhY3RpdmUsIHdoaWNoIHRoaXMgbWV0aG9kXG4gICAqIG1hcHMgdG8gbnVsbCByYXRoZXIgdGhhbiB0aHJvd2luZy5cbiAgICpcbiAgICogQHJldHVybnMgUHJvbWlzZSByZXNvbHZpbmcgdG8gdGhlIGN1cnJlbnQgY29tcGFyZSBzdGF0ZSwgb3IgbnVsbCBpZiBub25lIGFjdGl2ZS5cbiAgICovXG4gIGFzeW5jIGdldENvbXBhcmUoKTogUHJvbWlzZTxDb21wYXJlU3RhdGUgfCBudWxsPiB7XG4gICAgY29uc3QgdXJsID0gdGhpcy5idWlsZFVybCgnL2NvbXBhcmUnKTtcbiAgICByZXR1cm4gdGhpcy5yZXF1ZXN0KGFzeW5jICgpID0+IHtcbiAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZmV0Y2godXJsLCB7XG4gICAgICAgIGhlYWRlcnM6IHRoaXMuZ2V0SGVhZGVycygpIGFzIFJlY29yZDxzdHJpbmcsIHN0cmluZz4sXG4gICAgICAgIHNpZ25hbDogdGhpcy5nZXRUaW1lb3V0U2lnbmFsKClcbiAgICAgIH0pO1xuICAgICAgaWYgKHJlc3BvbnNlLnN0YXR1cyA9PT0gMjA0KSB7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfVxuICAgICAgaWYgKCFyZXNwb25zZS5vaykgdGhyb3cgcmVzcG9uc2U7XG4gICAgICByZXR1cm4gcmVzcG9uc2UuanNvbigpIGFzIFByb21pc2U8Q29tcGFyZVN0YXRlPjtcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDbGVhcnMgdGhlIGFjdGl2ZSBjb21wYXJpc29uIG9uIHRoZSBzZXJ2ZXIuXG4gICAqXG4gICAqIEByZXR1cm5zIFByb21pc2UgcmVzb2x2aW5nIHdoZW4gdGhlIGNvbXBhcmlzb24gaXMgY2xlYXJlZC5cbiAgICovXG4gIGFzeW5jIGNsZWFyQ29tcGFyZSgpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zdCB1cmwgPSB0aGlzLmJ1aWxkVXJsKCcvY29tcGFyZScpO1xuICAgIHJldHVybiB0aGlzLnJlcXVlc3QoKCkgPT4gdGhpcy5nZXRIdHRwQ2xpZW50KCkuZGVsZXRlKHVybCkpO1xuICB9XG59XG4iLCAiLyoqXG4gKiBDbGF1ZGUgQ29kZSBtYXJrZXRwbGFjZSByZWdpc3RyYXRpb24gdXRpbGl0aWVzLlxuICpcbiAqIFByb3ZpZGVzIGZ1bmN0aW9ucyBmb3IgcmVzb2x2aW5nIHRoZSBDbGF1ZGUgQ29kZSBjb25maWd1cmF0aW9uIGRpcmVjdG9yeVxuICogYW5kIHVwZGF0aW5nIHRoZSBga25vd25fbWFya2V0cGxhY2VzLmpzb25gIGZpbGUgc28gdGhhdCBwbHVnaW4gdmVyc2lvblxuICogY2hlY2tzIGhpdCB0aGUgY2FjaGUgaW5zdGVhZCBvZiByZS1zY2FubmluZyB0aGUgc291cmNlIGRpcmVjdG9yeS5cbiAqXG4gKiBAc3VtbWFyeSBDbGF1ZGUgQ29kZSBtYXJrZXRwbGFjZSByZWdpc3RyYXRpb24gdXRpbGl0aWVzXG4gKiBAbW9kdWxlXG4gKi9cblxuaW1wb3J0ICogYXMgZnMgZnJvbSAnbm9kZTpmcy9wcm9taXNlcyc7XG5pbXBvcnQgeyBob21lZGlyIH0gZnJvbSAnbm9kZTpvcyc7XG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ25vZGU6cGF0aCc7XG5pbXBvcnQgdHlwZSB7IElMb2dnZXIgfSBmcm9tICcuL2NvbmZpZy9sb2dnZXIuanMnO1xuXG4vKipcbiAqIFJlc29sdmVzIHRoZSBDbGF1ZGUgQ29kZSBjb25maWd1cmF0aW9uIGRpcmVjdG9yeSB1c2luZyB0aGUgc3RhbmRhcmRcbiAqIGZhbGxiYWNrIGNoYWluOiAkQ0xBVURFX0NPTkZJR19ESVIgXHUyMTkyICRYREdfREFUQV9IT01FL2NsYXVkZSBcdTIxOTJcbiAqICRYREdfQ09ORklHX0hPTUUvY2xhdWRlIFx1MjE5MiB+Ly5jb25maWcvY2xhdWRlIFx1MjE5MiB+Ly5jbGF1ZGUuXG4gKlxuICogUmV0dXJucyB0aGUgZmlyc3QgY2FuZGlkYXRlIHRoYXQgZXhpc3RzIG9uIGRpc2ssIG9yIG51bGwgaWYgbm9uZSBpcyBmb3VuZC5cbiAqXG4gKiBAcmV0dXJucyBUaGUgZmlyc3QgZXhpc3RpbmcgQ2xhdWRlIGNvbmZpZyBkaXJlY3RvcnkgcGF0aCwgb3IgbnVsbCBpZiBub25lIGZvdW5kLlxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcmVzb2x2ZUNsYXVkZUNvbmZpZ0RpcigpOiBQcm9taXNlPHN0cmluZyB8IG51bGw+IHtcbiAgY29uc3QgaG9tZSA9IGhvbWVkaXIoKTtcbiAgY29uc3QgY2FuZGlkYXRlczogc3RyaW5nW10gPSBbXTtcblxuICBjb25zdCBjbGF1ZGVDb25maWdEaXIgPSBwcm9jZXNzLmVudlsnQ0xBVURFX0NPTkZJR19ESVInXTtcbiAgaWYgKGNsYXVkZUNvbmZpZ0RpcikgY2FuZGlkYXRlcy5wdXNoKGNsYXVkZUNvbmZpZ0Rpcik7XG5cbiAgY29uc3QgeGRnRGF0YUhvbWUgPSBwcm9jZXNzLmVudlsnWERHX0RBVEFfSE9NRSddO1xuICBpZiAoeGRnRGF0YUhvbWUpIGNhbmRpZGF0ZXMucHVzaChwYXRoLmpvaW4oeGRnRGF0YUhvbWUsICdjbGF1ZGUnKSk7XG5cbiAgY29uc3QgeGRnQ29uZmlnSG9tZSA9IHByb2Nlc3MuZW52WydYREdfQ09ORklHX0hPTUUnXTtcbiAgaWYgKHhkZ0NvbmZpZ0hvbWUpIGNhbmRpZGF0ZXMucHVzaChwYXRoLmpvaW4oeGRnQ29uZmlnSG9tZSwgJ2NsYXVkZScpKTtcblxuICBjYW5kaWRhdGVzLnB1c2gocGF0aC5qb2luKGhvbWUsICcuY29uZmlnJywgJ2NsYXVkZScpKTtcbiAgY2FuZGlkYXRlcy5wdXNoKHBhdGguam9pbihob21lLCAnLmNsYXVkZScpKTtcblxuICBmb3IgKGNvbnN0IGNhbmRpZGF0ZSBvZiBjYW5kaWRhdGVzKSB7XG4gICAgdHJ5IHtcbiAgICAgIGF3YWl0IGZzLmFjY2VzcyhwYXRoLmpvaW4oY2FuZGlkYXRlLCAncGx1Z2lucycpKTtcbiAgICAgIHJldHVybiBjYW5kaWRhdGU7XG4gICAgfSBjYXRjaCAoZXJyb3I6IHVua25vd24pIHtcbiAgICAgIGlmIChlcnJvciBpbnN0YW5jZW9mIEVycm9yICYmICdjb2RlJyBpbiBlcnJvciAmJiBlcnJvci5jb2RlID09PSAnRU5PRU5UJykge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIHRocm93IGVycm9yO1xuICAgIH1cbiAgfVxuICByZXR1cm4gbnVsbDtcbn1cblxuLyoqXG4gKiBVcGRhdGVzIHRoZSBgY2FyZHMubWFuYWdlbWVudGAgZW50cnkgaW4gQ2xhdWRlIENvZGUncyBga25vd25fbWFya2V0cGxhY2VzLmpzb25gXG4gKiB0byBwb2ludCB0byB0aGUgZXh0ZW5zaW9uLWJ1bmRsZWQgbWFya2V0cGxhY2UgdXNpbmcgYW4gYWJzb2x1dGUgcGF0aC5cbiAqXG4gKiBDbGF1ZGUgQ29kZSByZXNvbHZlcyBkaXJlY3RvcnkgbWFya2V0cGxhY2Ugc291cmNlcyByZWxhdGl2ZSB0byB0aGUgc3Bhd25lZFxuICogc2Vzc2lvbidzIENXRC4gV2hlbiBzZXNzaW9ucyBydW4gaW4gYSB3b3JrdHJlZSwgYSByZWxhdGl2ZSBwYXRoIGxpa2UgYFwicHVibGljXCJgXG4gKiByZXNvbHZlcyB0byB0aGUgd29ya3RyZWUncyBjb3B5IFx1MjAxNCB3aGljaCBtYXkgY29udGFpbiBhIHN0YWxlIHBsdWdpbiB2ZXJzaW9uLlxuICogV3JpdGluZyBhbiBhYnNvbHV0ZSBwYXRoIGVuc3VyZXMgQ2xhdWRlIENvZGUgYWx3YXlzIHJlYWRzIGZyb20gdGhlIGV4dGVuc2lvbidzXG4gKiBidW5kbGVkIG1hcmtldHBsYWNlLCByZWdhcmRsZXNzIG9mIENXRC5cbiAqXG4gKiAjIyBIb3cgQ2xhdWRlIENvZGUncyBwbHVnaW4gdmVyc2lvbiBzeW5jaW5nIHdvcmtzXG4gKlxuICogVGhpcyByZWdpc3RyYXRpb24gdXBkYXRlIGlzIHRoZSAqKm9ubHkqKiBpbnRlcnZlbnRpb24gd2UgbmVlZC4gQ2xhdWRlIENvZGUnc1xuICogYnVpbHQtaW4gYXV0by11cGRhdGUgc3lzdGVtIGhhbmRsZXMgdGhlIHJlc3Q6XG4gKlxuICogMS4gKipWZXJzaW9uIGRldGVjdGlvbioqIFx1MjAxNCBPbiBzZXNzaW9uIHN0YXJ0LCBDbGF1ZGUgQ29kZSByZWFkcyB0aGUgbWFya2V0cGxhY2VcbiAqICAgIHNvdXJjZSBkaXJlY3RvcnkgKHRoZSBgc291cmNlLnBhdGhgIHdyaXR0ZW4gaGVyZSkgYW5kIGV4dHJhY3RzIHRoZSB2ZXJzaW9uXG4gKiAgICBmcm9tIGVhY2ggcGx1Z2luJ3MgYC5jbGF1ZGUtcGx1Z2luL3BsdWdpbi5qc29uYC5cbiAqXG4gKiAyLiAqKkNhY2hlLXBlci12ZXJzaW9uKiogXHUyMDE0IEVhY2ggcGx1Z2luIHZlcnNpb24gaXMgY2FjaGVkIGluZGVwZW5kZW50bHkgdW5kZXJcbiAqICAgIGA8Y29uZmlnRGlyPi9wbHVnaW5zL2NhY2hlLzxtYXJrZXRwbGFjZT4vPHBsdWdpbj4vPHZlcnNpb24+L2AuIFRoZSBhY3RpdmVcbiAqICAgIHZlcnNpb24ncyBwYXRoIGlzIHJlY29yZGVkIGFzIGBpbnN0YWxsUGF0aGAgaW4gYGluc3RhbGxlZF9wbHVnaW5zLmpzb25gLlxuICpcbiAqIDMuICoqQXV0by11cGRhdGUqKiBcdTIwMTQgV2hlbiB0aGUgc291cmNlIGRpcmVjdG9yeSBjb250YWlucyBhIG5ld2VyIHZlcnNpb24gdGhhblxuICogICAgd2hhdCdzIGNhY2hlZCwgQ2xhdWRlIENvZGUgY29waWVzIHRoZSBzb3VyY2UgaW50byBhIG5ldyB2ZXJzaW9uZWQgY2FjaGVcbiAqICAgIGRpcmVjdG9yeSwgdXBkYXRlcyBgaW5zdGFsbGVkX3BsdWdpbnMuanNvbmAgdG8gcG9pbnQgdG8gaXQsIGFuZCB3cml0ZXMgYVxuICogICAgYC5vcnBoYW5lZF9hdGAgdGltZXN0YW1wIGludG8gdGhlIG9sZCB2ZXJzaW9uJ3MgY2FjaGUgZGlyZWN0b3J5LlxuICpcbiAqIDQuICoqT3JwaGFuIEdDKiogXHUyMDE0IEEgYmFja2dyb3VuZCBob3VzZWtlZXBpbmcgdGFzayBydW5zIGV2ZXJ5IDEwIG1pbnV0ZXMuIEl0XG4gKiAgICB3YWxrcyB0aGUgY2FjaGUsIG1hcmtzIGFueSB2ZXJzaW9uIGRpcmVjdG9yeSBub3QgcmVmZXJlbmNlZCBieVxuICogICAgYGluc3RhbGxlZF9wbHVnaW5zLmpzb25gIHdpdGggYC5vcnBoYW5lZF9hdGAsIGFuZCBkZWxldGVzIG9ycGhhbmVkXG4gKiAgICBkaXJlY3RvcmllcyBvbmx5IGFmdGVyIGEgKio3LWRheSoqIGdyYWNlIHBlcmlvZC4gVGhpcyBlbnN1cmVzIHRoYXRcbiAqICAgIGNvbmN1cnJlbnRseSBydW5uaW5nIHNlc3Npb25zIGFyZSBuZXZlciBkaXNydXB0ZWQgYnkgY2FjaGUgZGVsZXRpb24uXG4gKlxuICogV2UgcHJldmlvdXNseSBmb3JjZS1kZWxldGVkIHN0YWxlIGNhY2hlIGVudHJpZXMgKGBldmljdFN0YWxlUnVudGltZUNhY2hlYCksXG4gKiB3aGljaCBieXBhc3NlZCB0aGUgNy1kYXkgZ3JhY2UgcGVyaW9kIGFuZCBjYXVzZWQgRU5PRU5UIGVycm9ycyBpbiBzZXNzaW9uc1xuICogc3RpbGwgcmVmZXJlbmNpbmcgdGhlIGRlbGV0ZWQgcGF0aHMuXG4gKlxuICogQHBhcmFtIG1hcmtldHBsYWNlUGF0aCAtIEFic29sdXRlIHBhdGggdG8gdGhlIGJ1bmRsZWQgbWFya2V0cGxhY2UgZGlyZWN0b3J5LlxuICogQHBhcmFtIGxvZ2dlciAtIExvZ2dlciBmb3IgZGlhZ25vc3RpYyBvdXRwdXQuXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiB1cGRhdGVNYXJrZXRwbGFjZVJlZ2lzdHJhdGlvbihtYXJrZXRwbGFjZVBhdGg6IHN0cmluZywgbG9nZ2VyOiBJTG9nZ2VyKTogUHJvbWlzZTx2b2lkPiB7XG4gIGNvbnN0IGNvbmZpZ0RpciA9IGF3YWl0IHJlc29sdmVDbGF1ZGVDb25maWdEaXIoKTtcbiAgaWYgKCFjb25maWdEaXIpIHtcbiAgICBsb2dnZXIuZGVidWcoJ0NsYXVkZSBjb25maWcgZGlyZWN0b3J5IG5vdCBmb3VuZCwgc2tpcHBpbmcgbWFya2V0cGxhY2UgcmVnaXN0cmF0aW9uIHVwZGF0ZScpO1xuICAgIHJldHVybjtcbiAgfVxuXG4gIGNvbnN0IGtub3duUGF0aCA9IHBhdGguam9pbihjb25maWdEaXIsICdwbHVnaW5zJywgJ2tub3duX21hcmtldHBsYWNlcy5qc29uJyk7XG4gIGxldCByYXc6IHN0cmluZztcbiAgdHJ5IHtcbiAgICByYXcgPSBhd2FpdCBmcy5yZWFkRmlsZShrbm93blBhdGgsICd1dGYtOCcpO1xuICB9IGNhdGNoIChlcnJvcjogdW5rbm93bikge1xuICAgIGlmIChlcnJvciBpbnN0YW5jZW9mIEVycm9yICYmICdjb2RlJyBpbiBlcnJvciAmJiBlcnJvci5jb2RlID09PSAnRU5PRU5UJykge1xuICAgICAgbG9nZ2VyLmRlYnVnKCdrbm93bl9tYXJrZXRwbGFjZXMuanNvbiBub3QgZm91bmQsIHNraXBwaW5nJyk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHRocm93IGVycm9yO1xuICB9XG5cbiAgY29uc3QgZGF0YSA9IEpTT04ucGFyc2UocmF3KSBhcyBSZWNvcmQ8XG4gICAgc3RyaW5nLFxuICAgIHsgc291cmNlPzogeyBzb3VyY2U/OiBzdHJpbmc7IHBhdGg/OiBzdHJpbmcgfTsgaW5zdGFsbExvY2F0aW9uPzogc3RyaW5nOyBsYXN0VXBkYXRlZD86IHN0cmluZyB9XG4gID47XG4gIGNvbnN0IGVudHJ5ID0gZGF0YVsnY2FyZHMubWFuYWdlbWVudCddO1xuICBpZiAoIWVudHJ5Py5zb3VyY2UgfHwgZW50cnkuc291cmNlLnNvdXJjZSAhPT0gJ2RpcmVjdG9yeScpIHJldHVybjtcblxuICBpZiAoZW50cnkuc291cmNlLnBhdGggPT09IG1hcmtldHBsYWNlUGF0aCAmJiBlbnRyeS5pbnN0YWxsTG9jYXRpb24gPT09IG1hcmtldHBsYWNlUGF0aCkge1xuICAgIGxvZ2dlci5kZWJ1ZygnTWFya2V0cGxhY2UgcmVnaXN0cmF0aW9uIGFscmVhZHkgcG9pbnRzIHRvIGV4dGVuc2lvbiBidW5kbGUnKTtcbiAgICByZXR1cm47XG4gIH1cblxuICBlbnRyeS5zb3VyY2UucGF0aCA9IG1hcmtldHBsYWNlUGF0aDtcbiAgZW50cnkuaW5zdGFsbExvY2F0aW9uID0gbWFya2V0cGxhY2VQYXRoO1xuICBlbnRyeS5sYXN0VXBkYXRlZCA9IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKTtcbiAgYXdhaXQgZnMud3JpdGVGaWxlKGtub3duUGF0aCwgYCR7SlNPTi5zdHJpbmdpZnkoZGF0YSwgbnVsbCwgNCl9XFxuYCk7XG4gIGxvZ2dlci5pbmZvKCdVcGRhdGVkIG1hcmtldHBsYWNlIHJlZ2lzdHJhdGlvbiB0byBleHRlbnNpb24gYnVuZGxlJywgeyBtYXJrZXRwbGFjZVBhdGggfSk7XG59XG4iLCAiLyoqXG4gKiBHaXQgd29ya3RyZWUgbGlmZWN5Y2xlIG1hbmFnZW1lbnQgZm9yIG1vbm9yZXBvIHdvcmtzcGFjZXMuXG4gKlxuICogQ3JlYXRlcyB3b3JrdHJlZXMgd2l0aCBzeW1saW5rZWQgbm9kZV9tb2R1bGVzLCBpZ25vcmVkIHBhdGhzLCBhbmRcbiAqIHBlci13b3JrdHJlZSBnaXQgZXhjbHVkZXMgc28gdGhlIHdvcmt0cmVlIGlzIGltbWVkaWF0ZWx5IHVzYWJsZSBmb3JcbiAqIGJ1aWxkcyBhbmQgdGVzdHMgd2l0aG91dCBhIHNlcGFyYXRlIGB5YXJuIGluc3RhbGxgLlxuICpcbiAqIFN1cHBvcnRzIGJvdGggYnJhbmNoLWJhc2VkIHdvcmt0cmVlcyAoZm9yIGltcGxlbWVudGF0aW9uIHdvcmspIGFuZFxuICogZGV0YWNoZWQgd29ya3RyZWVzIChmb3IgdmVyaWZ5aW5nIHN0YXRlIGF0IGEgdGFnIG9yIGNvbW1pdCkuXG4gKlxuICogQHN1bW1hcnkgR2l0IHdvcmt0cmVlIGNyZWF0aW9uIHdpdGggbW9ub3JlcG8gc3ltbGluayB3aXJpbmdcbiAqIEBtb2R1bGUgd29ya3RyZWVcbiAqL1xuXG5pbXBvcnQgeyBleGVjRmlsZSB9IGZyb20gJ25vZGU6Y2hpbGRfcHJvY2Vzcyc7XG5pbXBvcnQgKiBhcyBmcyBmcm9tICdub2RlOmZzL3Byb21pc2VzJztcbmltcG9ydCAqIGFzIHBhdGggZnJvbSAnbm9kZTpwYXRoJztcbmltcG9ydCB7IHByb21pc2lmeSB9IGZyb20gJ25vZGU6dXRpbCc7XG5cbmNvbnN0IGV4ZWNGaWxlQXN5bmMgPSBwcm9taXNpZnkoZXhlY0ZpbGUpO1xuXG4vKipcbiAqIFZhbGlkYXRlcyBhIGJyYW5jaCBuYW1lIGFnYWluc3QgdGhlIENMSSdzIHNhZmUgc3Vic2V0LlxuICpcbiAqIFRoZSBuYW1lIG11c3Qgc3RhcnQgd2l0aCBhbiBhbHBoYW51bWVyaWMgY2hhcmFjdGVyIGFuZCBtYXkgdGhlbiBpbmNsdWRlXG4gKiBhbHBoYW51bWVyaWNzLCBzbGFzaGVzLCB1bmRlcnNjb3Jlcywgb3IgZGFzaGVzLlxuICpcbiAqIEBwYXJhbSBuYW1lIC0gQ2FuZGlkYXRlIGJyYW5jaCBuYW1lIHN1cHBsaWVkIGJ5IHRoZSBjYWxsZXIuXG4gKiBAdGhyb3dzIHtFcnJvcn0gV2hlbiB0aGUgYnJhbmNoIG5hbWUgZG9lcyBub3QgbWF0Y2ggdGhlIHN1cHBvcnRlZCBmb3JtYXQuXG4gKiBAcmV0dXJucyBObyB2YWx1ZS4gVGhyb3dzIG9uIGludmFsaWQgaW5wdXQuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB2YWxpZGF0ZUJyYW5jaE5hbWUobmFtZTogc3RyaW5nKTogdm9pZCB7XG4gIGNvbnN0IGJyYW5jaE5hbWVSZWdleCA9IC9eW2EtekEtWjAtOV1bYS16QS1aMC05L18tXSokLztcbiAgaWYgKCFicmFuY2hOYW1lUmVnZXgudGVzdChuYW1lKSkge1xuICAgIHRocm93IG5ldyBFcnJvcignRXJyb3I6IEludmFsaWQgYnJhbmNoIG5hbWUgZm9ybWF0LicpO1xuICB9XG59XG5cbi8qKlxuICogRGV0ZXJtaW5lcyB3aGV0aGVyIGEgcmVsYXRpdmUgcGF0aCBpcyBuZXN0ZWQgdW5kZXIgYW55IGtub3duIHBhcmVudCBwYXRoLlxuICpcbiAqIFRoZSBjaGVjayB3YWxrcyBhbmNlc3RvciBzZWdtZW50cyBvZiBgZGlyYCBhbmQgcmV0dXJucyB0cnVlIG9uIHRoZSBmaXJzdFxuICogbWF0Y2ggaW4gYHBhcmVudFNldGAuXG4gKlxuICogQHBhcmFtIGRpciAtIFJlbGF0aXZlIHBhdGggdG8gdGVzdC5cbiAqIEBwYXJhbSBwYXJlbnRTZXQgLSBDYW5kaWRhdGUgcGFyZW50IGRpcmVjdG9yaWVzIHJlcHJlc2VudGVkIGFzIHJlbGF0aXZlIHBhdGhzLlxuICogQHJldHVybnMgVHJ1ZSB3aGVuIGBkaXJgIGlzIG5lc3RlZCB1bmRlciBhIHBhdGggaW4gYHBhcmVudFNldGAuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc05lc3RlZFVuZGVyKGRpcjogc3RyaW5nLCBwYXJlbnRTZXQ6IFNldDxzdHJpbmc+KTogYm9vbGVhbiB7XG4gIGxldCBjdXJyZW50ID0gZGlyO1xuICB3aGlsZSAoY3VycmVudC5pbmNsdWRlcygnLycpKSB7XG4gICAgY3VycmVudCA9IGN1cnJlbnQuc3Vic3RyaW5nKDAsIGN1cnJlbnQubGFzdEluZGV4T2YoJy8nKSk7XG4gICAgaWYgKHBhcmVudFNldC5oYXMoY3VycmVudCkpIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgfVxuICByZXR1cm4gZmFsc2U7XG59XG5cbi8qKlxuICogQ2hlY2tzIHdoZXRoZXIgYSBzeW1saW5rIHRhcmdldCBwb2ludHMgdG8ga25vd24gbW9ub3JlcG8taW50ZXJuYWwgbG9jYXRpb25zLlxuICpcbiAqIEludGVybmFsIHRhcmdldHMgYXJlIHByZXNlcnZlZCBhcyByZWxhdGl2ZSBsaW5rcyBkdXJpbmcgbm9kZV9tb2R1bGVzIHJlcm91dGVcbiAqIHNvIHdvcmtzcGFjZSBsaW5rcyBrZWVwIHdvcmtpbmcgaW5zaWRlIGEgd29ya3RyZWUuXG4gKlxuICogQHBhcmFtIHRhcmdldCAtIFN5bWxpbmsgdGFyZ2V0IHJlYWQgZnJvbSB0aGUgc291cmNlIG5vZGVfbW9kdWxlcyBlbnRyeS5cbiAqIEByZXR1cm5zIFRydWUgd2hlbiB0aGUgdGFyZ2V0IHN0YXJ0cyB3aXRoIGFuIGludGVybmFsIHByZWZpeC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzSW50ZXJuYWxTeW1saW5rKHRhcmdldDogc3RyaW5nKTogYm9vbGVhbiB7XG4gIHJldHVybiB0YXJnZXQuc3RhcnRzV2l0aCgnLi4vJyk7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgQ3JlYXRlV29ya3RyZWVSZXN1bHQge1xuICBicmFuY2g6IHN0cmluZztcbiAgd29ya3RyZWU6IHN0cmluZztcbiAgYmFzZVNoYTogc3RyaW5nO1xuICByZXJvdXRlZFN5bWxpbmtzPzogbnVtYmVyO1xufVxuXG4vKipcbiAqIENyZWF0ZXMgYW5kIGNvbmZpZ3VyZXMgYSBuZXcgZ2l0IHdvcmt0cmVlLlxuICpcbiAqIFRoZSB3b3JrZmxvdyB2YWxpZGF0ZXMgdGhlIHJlZiwgY3JlYXRlcyB0aGUgd29ya3RyZWUsIG1pcnJvcnMgZXhpc3Rpbmcgcm9vdFxuICogc3ltbGlua3MsIHN5bWxpbmtzIGlnbm9yZWQgcGF0aHMsIHJlcm91dGVzIG5vZGVfbW9kdWxlcyBsaW5rcywgYW5kIHVwZGF0ZXNcbiAqIHBlci13b3JrdHJlZSBnaXQgZXhjbHVkZXMuXG4gKlxuICogV2hlbiBgcmVmYCBpcyBhIGJyYW5jaCBuYW1lLCB0aGUgd29ya3RyZWUgY2hlY2tzIG91dCB0aGF0IGJyYW5jaCAoY3JlYXRpbmdcbiAqIGl0IGlmIG5lZWRlZCkuIFdoZW4gYHJlZmAgaXMgYSB0YWcgb3IgY29tbWl0IFNIQSwgdGhlIHdvcmt0cmVlIGlzIGNyZWF0ZWRcbiAqIGluIGRldGFjaGVkIEhFQUQgbW9kZS5cbiAqXG4gKiBAcGFyYW0gcmVmIC0gQnJhbmNoIG5hbWUsIHRhZyBuYW1lLCBvciBjb21taXQgU0hBLlxuICogQHBhcmFtIG9wdGlvbnMgLSBPcHRpb25hbCBjb25maWd1cmF0aW9uLlxuICogQHBhcmFtIG9wdGlvbnMuY3dkIC0gV29ya2luZyBkaXJlY3RvcnkgdG8gdXNlIHdoZW4gbG9jYXRpbmcgZ2l0IHJvb3RzLiBEZWZhdWx0cyB0byBgcHJvY2Vzcy5jd2QoKWAuXG4gKiBAcmV0dXJucyBNZXRhZGF0YSBkZXNjcmliaW5nIHRoZSBjcmVhdGVkIHdvcmt0cmVlIGFuZCBiYXNlIGNvbW1pdC5cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGNyZWF0ZVdvcmt0cmVlKHJlZjogc3RyaW5nLCBvcHRpb25zPzogeyBjd2Q/OiBzdHJpbmcgfSk6IFByb21pc2U8Q3JlYXRlV29ya3RyZWVSZXN1bHQ+IHtcbiAgY29uc3QgeyBzb3VyY2VSb290LCByZXBvUm9vdCB9ID0gYXdhaXQgZmluZEdpdFJvb3RzKG9wdGlvbnM/LmN3ZCA/PyBwcm9jZXNzLmN3ZCgpKTtcblxuICAvLyBEZXRlcm1pbmUgd2hldGhlciB0aGlzIGlzIGFuIGV4aXN0aW5nIHJlZiBvciBhIG5ldyBicmFuY2ggbmFtZS5cbiAgLy8gcmVzb2x2ZVJlZlR5cGUgdGhyb3dzIGZvciB1bmtub3duIHJlZnM7IGEgdmFsaWQgYnJhbmNoIG5hbWUgdGhhdFxuICAvLyBkb2Vzbid0IGV4aXN0IHlldCBpcyB0cmVhdGVkIGFzIGEgbmV3IGJyYW5jaCB0byBjcmVhdGUuXG4gIGxldCByZWZUeXBlOiAnYnJhbmNoJyB8ICd0YWcnIHwgJ2NvbW1pdCc7XG4gIHRyeSB7XG4gICAgcmVmVHlwZSA9IGF3YWl0IHJlc29sdmVSZWZUeXBlKHJlcG9Sb290LCByZWYpO1xuICB9IGNhdGNoIHtcbiAgICB2YWxpZGF0ZUJyYW5jaE5hbWUocmVmKTtcbiAgICByZWZUeXBlID0gJ2JyYW5jaCc7XG4gIH1cblxuICBpZiAocmVmVHlwZSA9PT0gJ2JyYW5jaCcpIHtcbiAgICB2YWxpZGF0ZUJyYW5jaE5hbWUocmVmKTtcbiAgfVxuXG4gIGNvbnN0IHdvcmt0cmVlRGlyID0gcGF0aC5qb2luKHJlcG9Sb290LCAnLndvcmt0cmVlcycsIHJlZik7XG5cbiAgY29uc3Qgd29ya3RyZWVFeGlzdHMgPSBhd2FpdCBjaGVja1dvcmt0cmVlRXhpc3RzKHJlcG9Sb290LCB3b3JrdHJlZURpcik7XG4gIGlmICh3b3JrdHJlZUV4aXN0cykge1xuICAgIHRocm93IG5ldyBFcnJvcihgRXJyb3I6IFdvcmt0cmVlIGFscmVhZHkgZXhpc3RzIGF0ICR7d29ya3RyZWVEaXJ9YCk7XG4gIH1cblxuICBhd2FpdCBjbGVhblN0YWxlV29ya3RyZWVEaXIocmVwb1Jvb3QsIHdvcmt0cmVlRGlyKTtcblxuICBpZiAocmVmVHlwZSA9PT0gJ2JyYW5jaCcpIHtcbiAgICBjb25zdCBzdGFydFBvaW50ID0gYXdhaXQgcmVzb2x2ZUhlYWQoc291cmNlUm9vdCk7XG4gICAgY29uc3QgYnJhbmNoRXhpc3RzID0gYXdhaXQgY2hlY2tCcmFuY2hFeGlzdHMocmVwb1Jvb3QsIHJlZik7XG4gICAgYXdhaXQgYWRkV29ya3RyZWUoeyByZXBvUm9vdCwgd29ya3RyZWVEaXIsIGJyYW5jaE5hbWU6IHJlZiwgYnJhbmNoRXhpc3RzLCBzdGFydFBvaW50IH0pO1xuICB9IGVsc2Uge1xuICAgIGF3YWl0IGFkZERldGFjaGVkV29ya3RyZWUocmVwb1Jvb3QsIHdvcmt0cmVlRGlyLCByZWYpO1xuICB9XG5cbiAgY29uc3QgaWdub3JlZCA9IGF3YWl0IGRpc2NvdmVySWdub3JlZFBhdGhzKHNvdXJjZVJvb3QpO1xuICBhd2FpdCBjb3B5RXhpc3RpbmdTeW1saW5rcyhzb3VyY2VSb290LCB3b3JrdHJlZURpcik7XG4gIGF3YWl0IHN5bWxpbmtJZ25vcmVkUGF0aHMoeyBzb3VyY2VSb290LCB3b3JrdHJlZURpciwgaWdub3JlZCB9KTtcblxuICBjb25zdCByZXJvdXRlZENvdW50ID0gYXdhaXQgcmVyb3V0ZUFsbE5vZGVNb2R1bGVzKHsgc291cmNlUm9vdCwgd29ya3RyZWVEaXIsIHJlcG9Sb290IH0pO1xuXG4gIGNvbnN0IFssIGJhc2VTaGFdID0gYXdhaXQgUHJvbWlzZS5hbGwoW1xuICAgIHVwZGF0ZUdpdEV4Y2x1ZGUoeyB3b3JrdHJlZURpciwgcmVwb1Jvb3QsIGRpcmVjdG9yaWVzOiBpZ25vcmVkLmRpcmVjdG9yaWVzLCBmaWxlczogaWdub3JlZC5maWxlcyB9KSxcbiAgICByZXNvbHZlSGVhZCh3b3JrdHJlZURpcilcbiAgXSk7XG5cbiAgY29uc3QgcmVzdWx0OiBDcmVhdGVXb3JrdHJlZVJlc3VsdCA9IHtcbiAgICBicmFuY2g6IHJlZixcbiAgICB3b3JrdHJlZTogd29ya3RyZWVEaXIsXG4gICAgYmFzZVNoYVxuICB9O1xuXG4gIGlmIChyZXJvdXRlZENvdW50ID4gMCkge1xuICAgIHJlc3VsdC5yZXJvdXRlZFN5bWxpbmtzID0gcmVyb3V0ZWRDb3VudDtcbiAgfVxuXG4gIHJldHVybiByZXN1bHQ7XG59XG5cbi8qKlxuICogUmVtb3ZlcyBzdGFsZSBkaXJlY3RvcnkgcmVtbmFudHMgbGVmdCBieSBhIGNyYXNoZWQgcHJldmlvdXMgc2Vzc2lvbi5cbiAqXG4gKiBHaXQgZG9lc24ndCB0cmFjayB0aGUgd29ya3RyZWUsIGJ1dCB0aGUgZGlyZWN0b3J5IG1heSBzdGlsbCBleGlzdCBvbiBkaXNrLFxuICogd2hpY2ggY2F1c2VzIGBnaXQgd29ya3RyZWUgYWRkYCB0byBmYWlsIHdpdGggXCJhbHJlYWR5IGV4aXN0c1wiLlxuICpcbiAqIEBwYXJhbSByZXBvUm9vdCAtIFByaW1hcnkgcmVwb3NpdG9yeSByb290IHdoZXJlIGdpdCBjb21tYW5kcyBydW4uXG4gKiBAcGFyYW0gd29ya3RyZWVEaXIgLSBBYnNvbHV0ZSB3b3JrdHJlZSBwYXRoIGJlaW5nIGNyZWF0ZWQuXG4gKi9cbmFzeW5jIGZ1bmN0aW9uIGNsZWFuU3RhbGVXb3JrdHJlZURpcihyZXBvUm9vdDogc3RyaW5nLCB3b3JrdHJlZURpcjogc3RyaW5nKTogUHJvbWlzZTx2b2lkPiB7XG4gIHRyeSB7XG4gICAgYXdhaXQgZnMuYWNjZXNzKHdvcmt0cmVlRGlyKTtcbiAgICBhd2FpdCBmcy5ybSh3b3JrdHJlZURpciwgeyByZWN1cnNpdmU6IHRydWUgfSk7XG4gICAgYXdhaXQgZXhlY0ZpbGVBc3luYygnZ2l0JywgWyd3b3JrdHJlZScsICdwcnVuZSddLCB7IGN3ZDogcmVwb1Jvb3QsIHRpbWVvdXQ6IDMwXzAwMCB9KTtcbiAgfSBjYXRjaCAoZXJyb3I6IHVua25vd24pIHtcbiAgICBpZiAoKGVycm9yIGFzIE5vZGVKUy5FcnJub0V4Y2VwdGlvbikuY29kZSAhPT0gJ0VOT0VOVCcpIHtcbiAgICAgIHRocm93IGVycm9yO1xuICAgIH1cbiAgfVxufVxuXG5pbnRlcmZhY2UgR2l0Um9vdHMge1xuICBzb3VyY2VSb290OiBzdHJpbmc7XG4gIHJlcG9Sb290OiBzdHJpbmc7XG59XG5cbi8qKlxuICogTG9jYXRlcyB0aGUgY3VycmVudCBnaXQgc291cmNlIHJvb3QgYW5kIHByaW1hcnkgcmVwb3NpdG9yeSByb290LlxuICpcbiAqIFN1cHBvcnRzIGJvdGggc3RhbmRhcmQgY2hlY2tvdXRzIChgLmdpdGAgZGlyZWN0b3J5KSBhbmQgd29ya3RyZWUgY2hlY2tvdXRzXG4gKiAoYC5naXRgIGZpbGUgcG9pbnRpbmcgaW50byBgLmdpdC93b3JrdHJlZXMvLi4uYCkuXG4gKlxuICogQHBhcmFtIHN0YXJ0RGlyIC0gRGlyZWN0b3J5IHdoZXJlIHVwd2FyZCBzZWFyY2ggYmVnaW5zLlxuICogQHRocm93cyB7RXJyb3J9IFdoZW4gbm8gZ2l0IHJlcG9zaXRvcnkgbWFya2VyIGlzIGZvdW5kLlxuICogQHJldHVybnMgUGF0aHMgZm9yIHRoZSBjdXJyZW50IGNoZWNrb3V0IHJvb3QgYW5kIHRoZSBwcmltYXJ5IHJlcG8gcm9vdC5cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGZpbmRHaXRSb290cyhzdGFydERpcjogc3RyaW5nKTogUHJvbWlzZTxHaXRSb290cz4ge1xuICBsZXQgY3VycmVudERpciA9IHBhdGgucmVzb2x2ZShzdGFydERpcik7XG4gIHdoaWxlIChjdXJyZW50RGlyICE9PSAnLycpIHtcbiAgICBjb25zdCBnaXRQYXRoID0gcGF0aC5qb2luKGN1cnJlbnREaXIsICcuZ2l0Jyk7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHN0YXRzID0gYXdhaXQgZnMubHN0YXQoZ2l0UGF0aCk7XG4gICAgICBpZiAoc3RhdHMuaXNEaXJlY3RvcnkoKSkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgIHNvdXJjZVJvb3Q6IGN1cnJlbnREaXIsXG4gICAgICAgICAgcmVwb1Jvb3Q6IGN1cnJlbnREaXJcbiAgICAgICAgfTtcbiAgICAgIH1cbiAgICAgIGlmIChzdGF0cy5pc0ZpbGUoKSkge1xuICAgICAgICBjb25zdCBnaXRGaWxlQ29udGVudCA9IGF3YWl0IGZzLnJlYWRGaWxlKGdpdFBhdGgsICd1dGYtOCcpO1xuICAgICAgICBjb25zdCBnaXRkaXJMaW5lID0gZ2l0RmlsZUNvbnRlbnQudHJpbSgpO1xuICAgICAgICBjb25zdCBnaXRkaXJQYXRoID0gZ2l0ZGlyTGluZS5yZXBsYWNlKC9eZ2l0ZGlyOlxccyovLCAnJyk7XG4gICAgICAgIGNvbnN0IG1haW5HaXREaXIgPSBnaXRkaXJQYXRoLnJlcGxhY2UoL1xcL3dvcmt0cmVlc1xcL1teL10rJC8sICcnKTtcbiAgICAgICAgY29uc3QgcmVwb1Jvb3QgPSBtYWluR2l0RGlyLnJlcGxhY2UoL1xcL1xcLmdpdCQvLCAnJyk7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgc291cmNlUm9vdDogY3VycmVudERpcixcbiAgICAgICAgICByZXBvUm9vdFxuICAgICAgICB9O1xuICAgICAgfVxuICAgIH0gY2F0Y2ggKGVycm9yOiB1bmtub3duKSB7XG4gICAgICBpZiAoKGVycm9yIGFzIE5vZGVKUy5FcnJub0V4Y2VwdGlvbikuY29kZSAhPT0gJ0VOT0VOVCcpIHtcbiAgICAgICAgdGhyb3cgZXJyb3I7XG4gICAgICB9XG4gICAgfVxuICAgIGN1cnJlbnREaXIgPSBwYXRoLmRpcm5hbWUoY3VycmVudERpcik7XG4gIH1cbiAgdGhyb3cgbmV3IEVycm9yKCdOb3QgaW4gYSBnaXQgcmVwb3NpdG9yeScpO1xufVxuXG4vKipcbiAqIFJlc29sdmVzIHRoZSBIRUFEIGNvbW1pdCBTSEEgZm9yIGEgcmVwb3NpdG9yeSBkaXJlY3RvcnkuXG4gKlxuICogQHBhcmFtIGN3ZCAtIFJlcG9zaXRvcnkgZGlyZWN0b3J5IHBhc3NlZCB0byBgZ2l0IHJldi1wYXJzZSBIRUFEYC5cbiAqIEByZXR1cm5zIFRyaW1tZWQgY29tbWl0IFNIQSBzdHJpbmcuXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiByZXNvbHZlSGVhZChjd2Q6IHN0cmluZyk6IFByb21pc2U8c3RyaW5nPiB7XG4gIGNvbnN0IHsgc3Rkb3V0IH0gPSBhd2FpdCBleGVjRmlsZUFzeW5jKCdnaXQnLCBbJ3Jldi1wYXJzZScsICdIRUFEJ10sIHsgY3dkLCB0aW1lb3V0OiA1XzAwMCB9KTtcbiAgcmV0dXJuIHN0ZG91dC50cmltKCk7XG59XG5cbi8qKlxuICogQ2hlY2tzIHdoZXRoZXIgYSB3b3JrdHJlZSBwYXRoIGlzIGFscmVhZHkgcmVnaXN0ZXJlZCB3aXRoIGdpdC5cbiAqXG4gKiBAcGFyYW0gcmVwb1Jvb3QgLSBQcmltYXJ5IHJlcG9zaXRvcnkgcm9vdCB3aGVyZSBnaXQgY29tbWFuZHMgcnVuLlxuICogQHBhcmFtIHdvcmt0cmVlRGlyIC0gQWJzb2x1dGUgd29ya3RyZWUgcGF0aCBiZWluZyBjcmVhdGVkLlxuICogQHJldHVybnMgVHJ1ZSB3aGVuIGBnaXQgd29ya3RyZWUgbGlzdGAgYWxyZWFkeSBjb250YWlucyBgd29ya3RyZWVEaXJgLlxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gY2hlY2tXb3JrdHJlZUV4aXN0cyhyZXBvUm9vdDogc3RyaW5nLCB3b3JrdHJlZURpcjogc3RyaW5nKTogUHJvbWlzZTxib29sZWFuPiB7XG4gIGNvbnN0IHsgc3Rkb3V0IH0gPSBhd2FpdCBleGVjRmlsZUFzeW5jKCdnaXQnLCBbJ3dvcmt0cmVlJywgJ2xpc3QnXSwgeyBjd2Q6IHJlcG9Sb290LCB0aW1lb3V0OiAzMF8wMDAgfSk7XG4gIHJldHVybiBzdGRvdXQuaW5jbHVkZXMod29ya3RyZWVEaXIpO1xufVxuXG4vKipcbiAqIENoZWNrcyB3aGV0aGVyIGEgYnJhbmNoIGFscmVhZHkgZXhpc3RzIGluIHRoZSByZXBvc2l0b3J5LlxuICpcbiAqIEBwYXJhbSByZXBvUm9vdCAtIFByaW1hcnkgcmVwb3NpdG9yeSByb290IHdoZXJlIGdpdCBjb21tYW5kcyBydW4uXG4gKiBAcGFyYW0gYnJhbmNoTmFtZSAtIEJyYW5jaCBuYW1lIHRvIHF1ZXJ5LlxuICogQHJldHVybnMgVHJ1ZSB3aGVuIGF0IGxlYXN0IG9uZSBtYXRjaGluZyBsb2NhbCBicmFuY2ggaXMgbGlzdGVkLlxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gY2hlY2tCcmFuY2hFeGlzdHMocmVwb1Jvb3Q6IHN0cmluZywgYnJhbmNoTmFtZTogc3RyaW5nKTogUHJvbWlzZTxib29sZWFuPiB7XG4gIGNvbnN0IHsgc3Rkb3V0IH0gPSBhd2FpdCBleGVjRmlsZUFzeW5jKCdnaXQnLCBbJ2JyYW5jaCcsICctLWxpc3QnLCBicmFuY2hOYW1lXSwge1xuICAgIGN3ZDogcmVwb1Jvb3QsXG4gICAgdGltZW91dDogMzBfMDAwXG4gIH0pO1xuICByZXR1cm4gc3Rkb3V0LnRyaW0oKS5sZW5ndGggPiAwO1xufVxuXG4vKipcbiAqIERldGVybWluZXMgd2hldGhlciBhIGdpdCByZWYgaXMgYSBicmFuY2gsIHRhZywgb3IgY29tbWl0IFNIQS5cbiAqXG4gKiBDaGVja3MgbG9jYWwgYnJhbmNoZXMgZmlyc3QsIHRoZW4gdGFncywgdGhlbiBmYWxscyBiYWNrIHRvIHZlcmlmeWluZ1xuICogdGhlIHJlZiByZXNvbHZlcyBhcyBhIGNvbW1pdC5cbiAqXG4gKiBAcGFyYW0gcmVwb1Jvb3QgLSBQcmltYXJ5IHJlcG9zaXRvcnkgcm9vdCB3aGVyZSBnaXQgY29tbWFuZHMgcnVuLlxuICogQHBhcmFtIHJlZiAtIFRoZSByZWYgdG8gY2xhc3NpZnkuXG4gKiBAdGhyb3dzIHtFcnJvcn0gV2hlbiB0aGUgcmVmIGRvZXMgbm90IHJlc29sdmUgdG8gYW55IGtub3duIGdpdCBvYmplY3QuXG4gKiBAcmV0dXJucyBUaGUgcmVmIHR5cGU6IGAnYnJhbmNoJ2AsIGAndGFnJ2AsIG9yIGAnY29tbWl0J2AuXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiByZXNvbHZlUmVmVHlwZShyZXBvUm9vdDogc3RyaW5nLCByZWY6IHN0cmluZyk6IFByb21pc2U8J2JyYW5jaCcgfCAndGFnJyB8ICdjb21taXQnPiB7XG4gIGNvbnN0IGJyYW5jaEV4aXN0cyA9IGF3YWl0IGNoZWNrQnJhbmNoRXhpc3RzKHJlcG9Sb290LCByZWYpO1xuICBpZiAoYnJhbmNoRXhpc3RzKSByZXR1cm4gJ2JyYW5jaCc7XG5cbiAgY29uc3QgeyBzdGRvdXQ6IHRhZ091dHB1dCB9ID0gYXdhaXQgZXhlY0ZpbGVBc3luYygnZ2l0JywgWyd0YWcnLCAnLS1saXN0JywgcmVmXSwge1xuICAgIGN3ZDogcmVwb1Jvb3QsXG4gICAgdGltZW91dDogMzBfMDAwXG4gIH0pO1xuICBpZiAodGFnT3V0cHV0LnRyaW0oKS5sZW5ndGggPiAwKSByZXR1cm4gJ3RhZyc7XG5cbiAgdHJ5IHtcbiAgICBhd2FpdCBleGVjRmlsZUFzeW5jKCdnaXQnLCBbJ3Jldi1wYXJzZScsICctLXZlcmlmeScsIGAke3JlZn1ee2NvbW1pdH1gXSwge1xuICAgICAgY3dkOiByZXBvUm9vdCxcbiAgICAgIHRpbWVvdXQ6IDVfMDAwXG4gICAgfSk7XG4gICAgcmV0dXJuICdjb21taXQnO1xuICB9IGNhdGNoIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYEVycm9yOiAnJHtyZWZ9JyBkb2VzIG5vdCByZXNvbHZlIHRvIGEgYnJhbmNoLCB0YWcsIG9yIGNvbW1pdC5gKTtcbiAgfVxufVxuXG5pbnRlcmZhY2UgQWRkV29ya3RyZWVPcHRpb25zIHtcbiAgcmVwb1Jvb3Q6IHN0cmluZztcbiAgd29ya3RyZWVEaXI6IHN0cmluZztcbiAgYnJhbmNoTmFtZTogc3RyaW5nO1xuICBicmFuY2hFeGlzdHM6IGJvb2xlYW47XG4gIHN0YXJ0UG9pbnQ6IHN0cmluZztcbn1cblxuLyoqXG4gKiBBZGRzIGEgZ2l0IHdvcmt0cmVlLCBjcmVhdGluZyB0aGUgYnJhbmNoIHdoZW4gbmVlZGVkLlxuICpcbiAqIFVzZXMgYGdpdCB3b3JrdHJlZSBhZGQgLWJgIGZvciBuZXcgYnJhbmNoZXMgYW5kIHBsYWluIGBnaXQgd29ya3RyZWUgYWRkYFxuICogd2hlbiBhdHRhY2hpbmcgdG8gYW4gZXhpc3RpbmcgYnJhbmNoLlxuICpcbiAqIEBwYXJhbSBvcHRzIC0gV29ya3RyZWUgY3JlYXRpb24gb3B0aW9ucyBhbmQgYnJhbmNoIGV4aXN0ZW5jZSBzdGF0ZS5cbiAqIEByZXR1cm5zIE5vIHZhbHVlLlxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gYWRkV29ya3RyZWUob3B0czogQWRkV29ya3RyZWVPcHRpb25zKTogUHJvbWlzZTx2b2lkPiB7XG4gIGNvbnN0IGFyZ3MgPSBvcHRzLmJyYW5jaEV4aXN0c1xuICAgID8gWyd3b3JrdHJlZScsICdhZGQnLCBvcHRzLndvcmt0cmVlRGlyLCBvcHRzLmJyYW5jaE5hbWVdXG4gICAgOiBbJ3dvcmt0cmVlJywgJ2FkZCcsICctYicsIG9wdHMuYnJhbmNoTmFtZSwgb3B0cy53b3JrdHJlZURpciwgb3B0cy5zdGFydFBvaW50XTtcbiAgYXdhaXQgZXhlY0ZpbGVBc3luYygnZ2l0JywgYXJncywgeyBjd2Q6IG9wdHMucmVwb1Jvb3QsIHRpbWVvdXQ6IDMwXzAwMCB9KTtcbn1cblxuLyoqXG4gKiBBZGRzIGEgZ2l0IHdvcmt0cmVlIGluIGRldGFjaGVkIEhFQUQgbW9kZSBhdCB0aGUgZ2l2ZW4gcmVmLlxuICpcbiAqIFVzZWQgZm9yIHRhZ3MgYW5kIGNvbW1pdCBTSEFzIHdoZXJlIG5vIGJyYW5jaCBhc3NvY2lhdGlvbiBpcyBuZWVkZWQuXG4gKlxuICogQHBhcmFtIHJlcG9Sb290IC0gUHJpbWFyeSByZXBvc2l0b3J5IHJvb3Qgd2hlcmUgZ2l0IGNvbW1hbmRzIHJ1bi5cbiAqIEBwYXJhbSB3b3JrdHJlZURpciAtIEFic29sdXRlIHBhdGggZm9yIHRoZSBuZXcgd29ya3RyZWUuXG4gKiBAcGFyYW0gcmVmIC0gVGFnIG5hbWUgb3IgY29tbWl0IFNIQSB0byBjaGVjayBvdXQuXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBhZGREZXRhY2hlZFdvcmt0cmVlKHJlcG9Sb290OiBzdHJpbmcsIHdvcmt0cmVlRGlyOiBzdHJpbmcsIHJlZjogc3RyaW5nKTogUHJvbWlzZTx2b2lkPiB7XG4gIGF3YWl0IGV4ZWNGaWxlQXN5bmMoJ2dpdCcsIFsnd29ya3RyZWUnLCAnYWRkJywgJy0tZGV0YWNoJywgd29ya3RyZWVEaXIsIHJlZl0sIHtcbiAgICBjd2Q6IHJlcG9Sb290LFxuICAgIHRpbWVvdXQ6IDMwXzAwMFxuICB9KTtcbn1cblxuaW50ZXJmYWNlIElnbm9yZWRQYXRocyB7XG4gIGRpcmVjdG9yaWVzOiBzdHJpbmdbXTtcbiAgZmlsZXM6IHN0cmluZ1tdO1xufVxuXG4vKipcbiAqIERpc2NvdmVycyBpZ25vcmVkIGZpbGVzIGFuZCBkaXJlY3RvcmllcyB1bmRlciBhIHNvdXJjZSByb290LlxuICpcbiAqIFBhdGhzIGFyZSByZXR1cm5lZCByZWxhdGl2ZSB0byBgc291cmNlUm9vdGAgYW5kIGAud29ya3RyZWVzYCBjb250ZW50IGlzXG4gKiBmaWx0ZXJlZCBvdXQgdG8gYXZvaWQgc2VsZi1yZWZlcmVudGlhbCBzeW1saW5raW5nLlxuICpcbiAqIEBwYXJhbSBzb3VyY2VSb290IC0gU291cmNlIGNoZWNrb3V0IHJvb3QgdXNlZCBmb3IgZ2l0IGRpc2NvdmVyeS5cbiAqIEByZXR1cm5zIFNlcGFyYXRlIGxpc3RzIG9mIGlnbm9yZWQgZGlyZWN0b3JpZXMgYW5kIGlnbm9yZWQgZmlsZXMuXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBkaXNjb3Zlcklnbm9yZWRQYXRocyhzb3VyY2VSb290OiBzdHJpbmcpOiBQcm9taXNlPElnbm9yZWRQYXRocz4ge1xuICBjb25zdCB7IHN0ZG91dCB9ID0gYXdhaXQgZXhlY0ZpbGVBc3luYyhcbiAgICAnZ2l0JyxcbiAgICBbJy1DJywgc291cmNlUm9vdCwgJ2xzLWZpbGVzJywgJy0taWdub3JlZCcsICctLWV4Y2x1ZGUtc3RhbmRhcmQnLCAnLS1kaXJlY3RvcnknLCAnLS1vdGhlcnMnXSxcbiAgICB7IGN3ZDogc291cmNlUm9vdCwgdGltZW91dDogMzBfMDAwIH1cbiAgKTtcblxuICBjb25zdCBsaW5lcyA9IHN0ZG91dC5zcGxpdCgnXFxuJykuZmlsdGVyKChsaW5lKSA9PiBsaW5lLmxlbmd0aCA+IDAgJiYgIWxpbmUuc3RhcnRzV2l0aCgnLndvcmt0cmVlcycpKTtcbiAgY29uc3QgZGlyZWN0b3JpZXMgPSBsaW5lcy5maWx0ZXIoKGwpID0+IGwuZW5kc1dpdGgoJy8nKSkubWFwKChsKSA9PiBsLnNsaWNlKDAsIC0xKSk7XG4gIGNvbnN0IGZpbGVzID0gbGluZXMuZmlsdGVyKChsKSA9PiAhbC5lbmRzV2l0aCgnLycpKTtcblxuICByZXR1cm4geyBkaXJlY3RvcmllcywgZmlsZXMgfTtcbn1cblxuaW50ZXJmYWNlIFN5bWxpbmtJZ25vcmVkUGF0aHNPcHRpb25zIHtcbiAgc291cmNlUm9vdDogc3RyaW5nO1xuICB3b3JrdHJlZURpcjogc3RyaW5nO1xuICBpZ25vcmVkOiBJZ25vcmVkUGF0aHM7XG59XG5cbmludGVyZmFjZSBTeW1saW5rSWdub3JlZFBhdGhzUmVzdWx0IHtcbiAgZGlyQ291bnQ6IG51bWJlcjtcbiAgZmlsZUNvdW50OiBudW1iZXI7XG59XG5cbi8qKlxuICogU3ltbGlua3MgaWdub3JlZCBkaXJlY3RvcmllcyBhbmQgZmlsZXMgZnJvbSBzb3VyY2UgY2hlY2tvdXQgaW50byBhIHdvcmt0cmVlLlxuICpcbiAqIE5lc3RlZCBpZ25vcmVkIGRpcmVjdG9yaWVzIGFyZSBjb2xsYXBzZWQgc28gb25seSB0b3AtbGV2ZWwgaWdub3JlZCBkaXJlY3RvcnlcbiAqIGxpbmtzIGFyZSBjcmVhdGVkLlxuICpcbiAqIEBwYXJhbSBvcHRzIC0gU291cmNlIHJvb3QsIGRlc3RpbmF0aW9uIHdvcmt0cmVlLCBhbmQgaWdub3JlZCBwYXRoIGxpc3RzLlxuICogQHJldHVybnMgQ291bnRzIG9mIHN1Y2Nlc3NmdWxseSBjcmVhdGVkIGRpcmVjdG9yeSBhbmQgZmlsZSBzeW1saW5rcy5cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHN5bWxpbmtJZ25vcmVkUGF0aHMob3B0czogU3ltbGlua0lnbm9yZWRQYXRoc09wdGlvbnMpOiBQcm9taXNlPFN5bWxpbmtJZ25vcmVkUGF0aHNSZXN1bHQ+IHtcbiAgY29uc3QgeyBzb3VyY2VSb290LCB3b3JrdHJlZURpciwgaWdub3JlZCB9ID0gb3B0cztcbiAgY29uc3QgZGlyU2V0ID0gbmV3IFNldChpZ25vcmVkLmRpcmVjdG9yaWVzKTtcbiAgY29uc3Qgbm9uTmVzdGVkRGlycyA9IGlnbm9yZWQuZGlyZWN0b3JpZXMuZmlsdGVyKChkaXIpID0+ICFpc05lc3RlZFVuZGVyKGRpciwgZGlyU2V0KSk7XG5cbiAgY29uc3QgY3JlYXRlRGlyU3ltbGluayA9IGFzeW5jIChkaXI6IHN0cmluZyk6IFByb21pc2U8Ym9vbGVhbj4gPT4ge1xuICAgIHRyeSB7XG4gICAgICBjb25zdCBzb3VyY2VQYXRoID0gcGF0aC5qb2luKHNvdXJjZVJvb3QsIGRpcik7XG4gICAgICB0cnkge1xuICAgICAgICBhd2FpdCBmcy5sc3RhdChzb3VyY2VQYXRoKTtcbiAgICAgIH0gY2F0Y2ggKGVycm9yOiB1bmtub3duKSB7XG4gICAgICAgIGlmICgoZXJyb3IgYXMgTm9kZUpTLkVycm5vRXhjZXB0aW9uKS5jb2RlID09PSAnRU5PRU5UJykge1xuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBwcm9jZXNzLnN0ZGVyci53cml0ZShcbiAgICAgICAgICBgY3JlYXRlLXdvcmt0cmVlOiB1bmV4cGVjdGVkIGVycm9yIGluIGxzdGF0OiAke2Vycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogU3RyaW5nKGVycm9yKX1cXG5gXG4gICAgICAgICk7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IGRlc3RQYXRoID0gcGF0aC5qb2luKHdvcmt0cmVlRGlyLCBkaXIpO1xuICAgICAgY29uc3QgcGFyZW50RGlyID0gcGF0aC5kaXJuYW1lKGRpcik7XG4gICAgICBpZiAocGFyZW50RGlyICE9PSAnLicpIHtcbiAgICAgICAgYXdhaXQgZnMubWtkaXIocGF0aC5qb2luKHdvcmt0cmVlRGlyLCBwYXJlbnREaXIpLCB7IHJlY3Vyc2l2ZTogdHJ1ZSB9KTtcbiAgICAgIH1cbiAgICAgIGF3YWl0IGZzLnN5bWxpbmsoc291cmNlUGF0aCwgZGVzdFBhdGgpO1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSBjYXRjaCAoZXJyb3I6IHVua25vd24pIHtcbiAgICAgIGNvbnN0IGNvZGUgPSAoZXJyb3IgYXMgTm9kZUpTLkVycm5vRXhjZXB0aW9uKS5jb2RlO1xuICAgICAgaWYgKGNvZGUgPT09ICdFRVhJU1QnIHx8IGNvZGUgPT09ICdFTk9FTlQnKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICAgIHByb2Nlc3Muc3RkZXJyLndyaXRlKFxuICAgICAgICBgY3JlYXRlLXdvcmt0cmVlOiB1bmV4cGVjdGVkIGVycm9yIGluIHN5bWxpbms6ICR7ZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiBTdHJpbmcoZXJyb3IpfVxcbmBcbiAgICAgICk7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICB9O1xuXG4gIGNvbnN0IGNyZWF0ZUZpbGVTeW1saW5rID0gYXN5bmMgKGZpbGU6IHN0cmluZyk6IFByb21pc2U8Ym9vbGVhbj4gPT4ge1xuICAgIHRyeSB7XG4gICAgICBjb25zdCBzb3VyY2VQYXRoID0gcGF0aC5qb2luKHNvdXJjZVJvb3QsIGZpbGUpO1xuICAgICAgdHJ5IHtcbiAgICAgICAgYXdhaXQgZnMubHN0YXQoc291cmNlUGF0aCk7XG4gICAgICB9IGNhdGNoIChlcnJvcjogdW5rbm93bikge1xuICAgICAgICBpZiAoKGVycm9yIGFzIE5vZGVKUy5FcnJub0V4Y2VwdGlvbikuY29kZSA9PT0gJ0VOT0VOVCcpIHtcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgcHJvY2Vzcy5zdGRlcnIud3JpdGUoXG4gICAgICAgICAgYGNyZWF0ZS13b3JrdHJlZTogdW5leHBlY3RlZCBlcnJvciBpbiBsc3RhdDogJHtlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6IFN0cmluZyhlcnJvcil9XFxuYFxuICAgICAgICApO1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgICBjb25zdCBkZXN0UGF0aCA9IHBhdGguam9pbih3b3JrdHJlZURpciwgZmlsZSk7XG4gICAgICBjb25zdCBwYXJlbnREaXIgPSBwYXRoLmRpcm5hbWUoZmlsZSk7XG4gICAgICBpZiAocGFyZW50RGlyICE9PSAnLicpIHtcbiAgICAgICAgYXdhaXQgZnMubWtkaXIocGF0aC5qb2luKHdvcmt0cmVlRGlyLCBwYXJlbnREaXIpLCB7IHJlY3Vyc2l2ZTogdHJ1ZSB9KTtcbiAgICAgIH1cbiAgICAgIGF3YWl0IGZzLnN5bWxpbmsoc291cmNlUGF0aCwgZGVzdFBhdGgpO1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSBjYXRjaCAoZXJyb3I6IHVua25vd24pIHtcbiAgICAgIGNvbnN0IGNvZGUgPSAoZXJyb3IgYXMgTm9kZUpTLkVycm5vRXhjZXB0aW9uKS5jb2RlO1xuICAgICAgaWYgKGNvZGUgPT09ICdFRVhJU1QnIHx8IGNvZGUgPT09ICdFTk9FTlQnKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICAgIHByb2Nlc3Muc3RkZXJyLndyaXRlKFxuICAgICAgICBgY3JlYXRlLXdvcmt0cmVlOiB1bmV4cGVjdGVkIGVycm9yIGluIHN5bWxpbms6ICR7ZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiBTdHJpbmcoZXJyb3IpfVxcbmBcbiAgICAgICk7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICB9O1xuXG4gIGNvbnN0IGRpclJlc3VsdHMgPSBhd2FpdCBQcm9taXNlLmFsbChub25OZXN0ZWREaXJzLm1hcChjcmVhdGVEaXJTeW1saW5rKSk7XG4gIGNvbnN0IG5vbk5lc3RlZEZpbGVzID0gaWdub3JlZC5maWxlcy5maWx0ZXIoKGZpbGUpID0+ICFpc05lc3RlZFVuZGVyKGZpbGUsIGRpclNldCkpO1xuICBjb25zdCBmaWxlUmVzdWx0cyA9IGF3YWl0IFByb21pc2UuYWxsKG5vbk5lc3RlZEZpbGVzLm1hcChjcmVhdGVGaWxlU3ltbGluaykpO1xuXG4gIGNvbnN0IGRpckNvdW50ID0gZGlyUmVzdWx0cy5maWx0ZXIoKHIpID0+IHIpLmxlbmd0aDtcbiAgY29uc3QgZmlsZUNvdW50ID0gZmlsZVJlc3VsdHMuZmlsdGVyKChyKSA9PiByKS5sZW5ndGg7XG5cbiAgcmV0dXJuIHsgZGlyQ291bnQsIGZpbGVDb3VudCB9O1xufVxuXG4vKipcbiAqIFJlcGxpY2F0ZXMgcm9vdC1sZXZlbCBzeW1saW5rcyBmcm9tIHRoZSBzb3VyY2UgY2hlY2tvdXQgaW50byB0aGUgd29ya3RyZWUuXG4gKlxuICogRXhpc3RpbmcgZGVzdGluYXRpb24gZW50cmllcyBhcmUgbGVmdCB1bnRvdWNoZWQuXG4gKlxuICogQHBhcmFtIHNvdXJjZVJvb3QgLSBTb3VyY2UgY2hlY2tvdXQgcm9vdC5cbiAqIEBwYXJhbSB3b3JrdHJlZURpciAtIERlc3RpbmF0aW9uIHdvcmt0cmVlIHJvb3QuXG4gKiBAcmV0dXJucyBOdW1iZXIgb2Ygc3ltbGlua3MgY3JlYXRlZCBpbiB0aGUgZGVzdGluYXRpb24gcm9vdC5cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGNvcHlFeGlzdGluZ1N5bWxpbmtzKHNvdXJjZVJvb3Q6IHN0cmluZywgd29ya3RyZWVEaXI6IHN0cmluZyk6IFByb21pc2U8bnVtYmVyPiB7XG4gIGNvbnN0IGVudHJpZXMgPSBhd2FpdCBmcy5yZWFkZGlyKHNvdXJjZVJvb3QsIHsgd2l0aEZpbGVUeXBlczogdHJ1ZSB9KTtcbiAgY29uc3Qgc3ltbGlua3MgPSBlbnRyaWVzLmZpbHRlcigoZSkgPT4gZS5pc1N5bWJvbGljTGluaygpICYmIGUubmFtZSAhPT0gJy5naXQnICYmIGUubmFtZSAhPT0gJy53b3JrdHJlZXMnKTtcblxuICBjb25zdCBjb3B5U3ltbGluayA9IGFzeW5jIChuYW1lOiBzdHJpbmcpOiBQcm9taXNlPGJvb2xlYW4+ID0+IHtcbiAgICBjb25zdCBkZXN0UGF0aCA9IHBhdGguam9pbih3b3JrdHJlZURpciwgbmFtZSk7XG4gICAgdHJ5IHtcbiAgICAgIGF3YWl0IGZzLmxzdGF0KGRlc3RQYXRoKTtcbiAgICAgIHJldHVybiBmYWxzZTsgLy8gRGVzdGluYXRpb24gYWxyZWFkeSBleGlzdHNcbiAgICB9IGNhdGNoIChlcnJvcjogdW5rbm93bikge1xuICAgICAgaWYgKChlcnJvciBhcyBOb2RlSlMuRXJybm9FeGNlcHRpb24pLmNvZGUgIT09ICdFTk9FTlQnKSB7XG4gICAgICAgIHRocm93IGVycm9yO1xuICAgICAgfVxuICAgIH1cbiAgICBjb25zdCBzb3VyY2VMaW5rUGF0aCA9IHBhdGguam9pbihzb3VyY2VSb290LCBuYW1lKTtcblxuICAgIC8vIFNraXAgc2VsZi1yZWZlcmVuY2luZyBzeW1saW5rcyAodGFyZ2V0IHJlc29sdmVzIGJhY2sgdG8gdGhlIHN5bWxpbmsgaXRzZWxmKVxuICAgIGNvbnN0IHRhcmdldCA9IGF3YWl0IGZzLnJlYWRsaW5rKHNvdXJjZUxpbmtQYXRoKTtcbiAgICBjb25zdCByZXNvbHZlZFRhcmdldCA9IHBhdGgucmVzb2x2ZShzb3VyY2VSb290LCB0YXJnZXQpO1xuICAgIGlmIChyZXNvbHZlZFRhcmdldCA9PT0gc291cmNlTGlua1BhdGgpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICBhd2FpdCBmcy5zeW1saW5rKHNvdXJjZUxpbmtQYXRoLCBkZXN0UGF0aCk7XG4gICAgcmV0dXJuIHRydWU7XG4gIH07XG5cbiAgY29uc3QgcmVzdWx0cyA9IGF3YWl0IFByb21pc2UuYWxsKHN5bWxpbmtzLm1hcCgoZSkgPT4gY29weVN5bWxpbmsoZS5uYW1lKSkpO1xuICByZXR1cm4gcmVzdWx0cy5maWx0ZXIoKHIpID0+IHIpLmxlbmd0aDtcbn1cblxuaW50ZXJmYWNlIFJlcm91dGVOb2RlTW9kdWxlc09wdGlvbnMge1xuICBzb3VyY2VOb2RlTW9kdWxlczogc3RyaW5nO1xuICBkZXN0Tm9kZU1vZHVsZXM6IHN0cmluZztcbn1cblxuLyoqXG4gKiBNaXJyb3JzIGEgbm9kZV9tb2R1bGVzIHRyZWUgaW50byB0aGUgd29ya3RyZWUgdXNpbmcgc3ltbGlua3MuXG4gKlxuICogSW50ZXJuYWwgd29ya3NwYWNlIGxpbmtzIGtlZXAgdGhlaXIgb3JpZ2luYWwgcmVsYXRpdmUgdGFyZ2V0cyB3aGlsZSBleHRlcm5hbFxuICogbGlua3MgYW5kIG5vbi1saW5rIGVudHJpZXMgYXJlIHJlcHJlc2VudGVkIGFzIHN5bWxpbmtzIHRvIHNvdXJjZSBwYXRocy5cbiAqXG4gKiBAcGFyYW0gb3B0cyAtIFNvdXJjZSBhbmQgZGVzdGluYXRpb24gbm9kZV9tb2R1bGVzIGRpcmVjdG9yaWVzLlxuICogQHJldHVybnMgQ291bnQgb2YgaW50ZXJuYWwgd29ya3NwYWNlIHN5bWxpbmtzIHJlY3JlYXRlZCBieSB0YXJnZXQgcGF0aC5cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHJlcm91dGVOb2RlTW9kdWxlcyhvcHRzOiBSZXJvdXRlTm9kZU1vZHVsZXNPcHRpb25zKTogUHJvbWlzZTxudW1iZXI+IHtcbiAgY29uc3QgeyBzb3VyY2VOb2RlTW9kdWxlcywgZGVzdE5vZGVNb2R1bGVzIH0gPSBvcHRzO1xuXG4gIHRyeSB7XG4gICAgYXdhaXQgZnMubHN0YXQoc291cmNlTm9kZU1vZHVsZXMpO1xuICB9IGNhdGNoIChlcnJvcjogdW5rbm93bikge1xuICAgIGlmICgoZXJyb3IgYXMgTm9kZUpTLkVycm5vRXhjZXB0aW9uKS5jb2RlID09PSAnRU5PRU5UJykge1xuICAgICAgcmV0dXJuIDA7XG4gICAgfVxuICAgIHRocm93IGVycm9yO1xuICB9XG5cbiAgdHJ5IHtcbiAgICBjb25zdCBkZXN0U3RhdHMgPSBhd2FpdCBmcy5sc3RhdChkZXN0Tm9kZU1vZHVsZXMpO1xuICAgIGlmIChkZXN0U3RhdHMuaXNTeW1ib2xpY0xpbmsoKSkge1xuICAgICAgYXdhaXQgZnMudW5saW5rKGRlc3ROb2RlTW9kdWxlcyk7XG4gICAgfVxuICB9IGNhdGNoIChlcnJvcjogdW5rbm93bikge1xuICAgIGlmICgoZXJyb3IgYXMgTm9kZUpTLkVycm5vRXhjZXB0aW9uKS5jb2RlICE9PSAnRU5PRU5UJykge1xuICAgICAgdGhyb3cgZXJyb3I7XG4gICAgfVxuICB9XG5cbiAgYXdhaXQgZnMubWtkaXIoZGVzdE5vZGVNb2R1bGVzLCB7IHJlY3Vyc2l2ZTogdHJ1ZSB9KTtcblxuICBjb25zdCBlbnRyaWVzID0gYXdhaXQgZnMucmVhZGRpcihzb3VyY2VOb2RlTW9kdWxlcywgeyB3aXRoRmlsZVR5cGVzOiB0cnVlIH0pO1xuICBjb25zdCBjb3VudHMgPSBhd2FpdCBQcm9taXNlLmFsbChcbiAgICBlbnRyaWVzLm1hcChhc3luYyAoZW50cnkpOiBQcm9taXNlPG51bWJlcj4gPT4ge1xuICAgICAgY29uc3Qgc291cmNlUGF0aCA9IHBhdGguam9pbihzb3VyY2VOb2RlTW9kdWxlcywgZW50cnkubmFtZSk7XG4gICAgICBjb25zdCBkZXN0UGF0aCA9IHBhdGguam9pbihkZXN0Tm9kZU1vZHVsZXMsIGVudHJ5Lm5hbWUpO1xuXG4gICAgICBpZiAoZW50cnkuaXNTeW1ib2xpY0xpbmsoKSkge1xuICAgICAgICBjb25zdCB0YXJnZXQgPSBhd2FpdCBmcy5yZWFkbGluayhzb3VyY2VQYXRoKTtcbiAgICAgICAgaWYgKGlzSW50ZXJuYWxTeW1saW5rKHRhcmdldCkpIHtcbiAgICAgICAgICBhd2FpdCBmcy5zeW1saW5rKHRhcmdldCwgZGVzdFBhdGgpO1xuICAgICAgICAgIHJldHVybiAxO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGF3YWl0IGZzLnN5bWxpbmsoc291cmNlUGF0aCwgZGVzdFBhdGgpO1xuICAgICAgICAgIHJldHVybiAwO1xuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYgKGVudHJ5LmlzRGlyZWN0b3J5KCkgJiYgZW50cnkubmFtZS5zdGFydHNXaXRoKCdAJykpIHtcbiAgICAgICAgYXdhaXQgZnMubWtkaXIoZGVzdFBhdGgsIHsgcmVjdXJzaXZlOiB0cnVlIH0pO1xuICAgICAgICBjb25zdCBzY29wZUVudHJpZXMgPSBhd2FpdCBmcy5yZWFkZGlyKHNvdXJjZVBhdGgsIHsgd2l0aEZpbGVUeXBlczogdHJ1ZSB9KTtcbiAgICAgICAgY29uc3Qgc2NvcGVDb3VudHMgPSBhd2FpdCBQcm9taXNlLmFsbChcbiAgICAgICAgICBzY29wZUVudHJpZXMubWFwKGFzeW5jIChzY29wZUVudHJ5KTogUHJvbWlzZTxudW1iZXI+ID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHNjb3BlU291cmNlUGF0aCA9IHBhdGguam9pbihzb3VyY2VQYXRoLCBzY29wZUVudHJ5Lm5hbWUpO1xuICAgICAgICAgICAgY29uc3Qgc2NvcGVEZXN0UGF0aCA9IHBhdGguam9pbihkZXN0UGF0aCwgc2NvcGVFbnRyeS5uYW1lKTtcblxuICAgICAgICAgICAgaWYgKHNjb3BlRW50cnkuaXNTeW1ib2xpY0xpbmsoKSkge1xuICAgICAgICAgICAgICBjb25zdCB0YXJnZXQgPSBhd2FpdCBmcy5yZWFkbGluayhzY29wZVNvdXJjZVBhdGgpO1xuICAgICAgICAgICAgICBpZiAoaXNJbnRlcm5hbFN5bWxpbmsodGFyZ2V0KSkge1xuICAgICAgICAgICAgICAgIGF3YWl0IGZzLnN5bWxpbmsodGFyZ2V0LCBzY29wZURlc3RQYXRoKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gMTtcbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBhd2FpdCBmcy5zeW1saW5rKHNjb3BlU291cmNlUGF0aCwgc2NvcGVEZXN0UGF0aCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIDA7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIGF3YWl0IGZzLnN5bWxpbmsoc2NvcGVTb3VyY2VQYXRoLCBzY29wZURlc3RQYXRoKTtcbiAgICAgICAgICAgICAgcmV0dXJuIDA7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSlcbiAgICAgICAgKTtcbiAgICAgICAgcmV0dXJuIHNjb3BlQ291bnRzLnJlZHVjZSgoc3VtLCBjKSA9PiBzdW0gKyBjLCAwKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGF3YWl0IGZzLnN5bWxpbmsoc291cmNlUGF0aCwgZGVzdFBhdGgpO1xuICAgICAgICByZXR1cm4gMDtcbiAgICAgIH1cbiAgICB9KVxuICApO1xuXG4gIHJldHVybiBjb3VudHMucmVkdWNlKChzdW0sIGMpID0+IHN1bSArIGMsIDApO1xufVxuXG5pbnRlcmZhY2UgUmVyb3V0ZUFsbE5vZGVNb2R1bGVzT3B0aW9ucyB7XG4gIHNvdXJjZVJvb3Q6IHN0cmluZztcbiAgd29ya3RyZWVEaXI6IHN0cmluZztcbiAgcmVwb1Jvb3Q6IHN0cmluZztcbn1cblxuLyoqXG4gKiBSZXJvdXRlcyByb290IGFuZCBwZXItcGFja2FnZSBub2RlX21vZHVsZXMgZGlyZWN0b3JpZXMgaW50byB0aGUgd29ya3RyZWUuXG4gKlxuICogVGhlIG9wZXJhdGlvbiBpcyBza2lwcGVkIHdoZW4gdGhlIHJlcG9zaXRvcnkgaGFzIG5vIHdvcmtzcGFjZSBjb25maWd1cmF0aW9uLlxuICpcbiAqIEBwYXJhbSBvcHRzIC0gU291cmNlIHJvb3QsIGRlc3RpbmF0aW9uIHdvcmt0cmVlIHJvb3QsIGFuZCByZXBvIHJvb3QuXG4gKiBAcmV0dXJucyBUb3RhbCBudW1iZXIgb2YgcmVjcmVhdGVkIGludGVybmFsIHdvcmtzcGFjZSBzeW1saW5rcy5cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHJlcm91dGVBbGxOb2RlTW9kdWxlcyhvcHRzOiBSZXJvdXRlQWxsTm9kZU1vZHVsZXNPcHRpb25zKTogUHJvbWlzZTxudW1iZXI+IHtcbiAgY29uc3QgeyBzb3VyY2VSb290LCB3b3JrdHJlZURpciwgcmVwb1Jvb3QgfSA9IG9wdHM7XG5cbiAgbGV0IHBhY2thZ2VKc29uOiB7IHdvcmtzcGFjZXM/OiBzdHJpbmdbXSB9O1xuICB0cnkge1xuICAgIGNvbnN0IHBhY2thZ2VKc29uQ29udGVudCA9IGF3YWl0IGZzLnJlYWRGaWxlKHBhdGguam9pbihyZXBvUm9vdCwgJ3BhY2thZ2UuanNvbicpLCAndXRmLTgnKTtcbiAgICBwYWNrYWdlSnNvbiA9IEpTT04ucGFyc2UocGFja2FnZUpzb25Db250ZW50KTtcbiAgfSBjYXRjaCAoZXJyb3I6IHVua25vd24pIHtcbiAgICBpZiAoKGVycm9yIGFzIE5vZGVKUy5FcnJub0V4Y2VwdGlvbikuY29kZSA9PT0gJ0VOT0VOVCcpIHtcbiAgICAgIHJldHVybiAwO1xuICAgIH1cbiAgICB0aHJvdyBlcnJvcjtcbiAgfVxuXG4gIGlmICghcGFja2FnZUpzb24ud29ya3NwYWNlcykge1xuICAgIHJldHVybiAwO1xuICB9XG5cbiAgbGV0IHRvdGFsQ291bnQgPSAwO1xuXG4gIHRvdGFsQ291bnQgKz0gYXdhaXQgcmVyb3V0ZU5vZGVNb2R1bGVzKHtcbiAgICBzb3VyY2VOb2RlTW9kdWxlczogcGF0aC5qb2luKHNvdXJjZVJvb3QsICdub2RlX21vZHVsZXMnKSxcbiAgICBkZXN0Tm9kZU1vZHVsZXM6IHBhdGguam9pbih3b3JrdHJlZURpciwgJ25vZGVfbW9kdWxlcycpXG4gIH0pO1xuXG4gIGNvbnN0IHBhY2thZ2VzRGlyID0gcGF0aC5qb2luKHNvdXJjZVJvb3QsICdwYWNrYWdlcycpO1xuICB0cnkge1xuICAgIGNvbnN0IHBhY2thZ2VFbnRyaWVzID0gYXdhaXQgZnMucmVhZGRpcihwYWNrYWdlc0RpciwgeyB3aXRoRmlsZVR5cGVzOiB0cnVlIH0pO1xuICAgIGZvciAoY29uc3QgZW50cnkgb2YgcGFja2FnZUVudHJpZXMpIHtcbiAgICAgIGlmIChlbnRyeS5pc0RpcmVjdG9yeSgpKSB7XG4gICAgICAgIGNvbnN0IHBrZ05vZGVNb2R1bGVzID0gcGF0aC5qb2luKHBhY2thZ2VzRGlyLCBlbnRyeS5uYW1lLCAnbm9kZV9tb2R1bGVzJyk7XG4gICAgICAgIGxldCBub2RlTW9kdWxlc0V4aXN0cyA9IGZhbHNlO1xuICAgICAgICB0cnkge1xuICAgICAgICAgIGF3YWl0IGZzLmxzdGF0KHBrZ05vZGVNb2R1bGVzKTtcbiAgICAgICAgICBub2RlTW9kdWxlc0V4aXN0cyA9IHRydWU7XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yOiB1bmtub3duKSB7XG4gICAgICAgICAgaWYgKChlcnJvciBhcyBOb2RlSlMuRXJybm9FeGNlcHRpb24pLmNvZGUgIT09ICdFTk9FTlQnKSB7XG4gICAgICAgICAgICB0aHJvdyBlcnJvcjtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKG5vZGVNb2R1bGVzRXhpc3RzKSB7XG4gICAgICAgICAgY29uc3QgZGVzdFBhY2thZ2VEaXIgPSBwYXRoLmpvaW4od29ya3RyZWVEaXIsICdwYWNrYWdlcycsIGVudHJ5Lm5hbWUpO1xuICAgICAgICAgIGF3YWl0IGZzLm1rZGlyKGRlc3RQYWNrYWdlRGlyLCB7IHJlY3Vyc2l2ZTogdHJ1ZSB9KTtcbiAgICAgICAgICB0b3RhbENvdW50ICs9IGF3YWl0IHJlcm91dGVOb2RlTW9kdWxlcyh7XG4gICAgICAgICAgICBzb3VyY2VOb2RlTW9kdWxlczogcGtnTm9kZU1vZHVsZXMsXG4gICAgICAgICAgICBkZXN0Tm9kZU1vZHVsZXM6IHBhdGguam9pbihkZXN0UGFja2FnZURpciwgJ25vZGVfbW9kdWxlcycpXG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH0gY2F0Y2ggKGVycm9yOiB1bmtub3duKSB7XG4gICAgaWYgKChlcnJvciBhcyBOb2RlSlMuRXJybm9FeGNlcHRpb24pLmNvZGUgIT09ICdFTk9FTlQnKSB7XG4gICAgICB0aHJvdyBlcnJvcjtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gdG90YWxDb3VudDtcbn1cblxuaW50ZXJmYWNlIFVwZGF0ZUdpdEV4Y2x1ZGVPcHRpb25zIHtcbiAgd29ya3RyZWVEaXI6IHN0cmluZztcbiAgcmVwb1Jvb3Q6IHN0cmluZztcbiAgZGlyZWN0b3JpZXM6IHN0cmluZ1tdO1xuICBmaWxlczogc3RyaW5nW107XG59XG5cbi8qKlxuICogQXBwZW5kcyBzeW1saW5rZWQgaWdub3JlZCBwYXRocyB0byB0aGUgd29ya3RyZWUtc3BlY2lmaWMgZ2l0IGV4Y2x1ZGUgZmlsZS5cbiAqXG4gKiBBbHNvIGVuYWJsZXMgYGV4dGVuc2lvbnMud29ya3RyZWVDb25maWdgIGFuZCBzZXRzIHdvcmt0cmVlLWxvY2FsXG4gKiBgY29yZS5leGNsdWRlc0ZpbGVgIHNvIGdpdCBzdGF0dXMgaW4gdGhlIHdvcmt0cmVlIGlnbm9yZXMgaW5qZWN0ZWQgbGlua3MuXG4gKlxuICogQHBhcmFtIG9wdHMgLSBXb3JrdHJlZSBwYXRoLCByZXBvIHJvb3QsIGFuZCBpZ25vcmVkIHBhdGggY2FuZGlkYXRlcy5cbiAqIEByZXR1cm5zIE5vIHZhbHVlLlxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gdXBkYXRlR2l0RXhjbHVkZShvcHRzOiBVcGRhdGVHaXRFeGNsdWRlT3B0aW9ucyk6IFByb21pc2U8dm9pZD4ge1xuICBjb25zdCB7IHdvcmt0cmVlRGlyLCByZXBvUm9vdCwgZGlyZWN0b3JpZXMsIGZpbGVzIH0gPSBvcHRzO1xuXG4gIGNvbnN0IHsgc3Rkb3V0OiBnaXREaXIgfSA9IGF3YWl0IGV4ZWNGaWxlQXN5bmMoJ2dpdCcsIFsnLUMnLCB3b3JrdHJlZURpciwgJ3Jldi1wYXJzZScsICctLWdpdC1kaXInXSwge1xuICAgIHRpbWVvdXQ6IDVfMDAwXG4gIH0pO1xuICBjb25zdCBleGNsdWRlUGF0aCA9IHBhdGguam9pbihnaXREaXIudHJpbSgpLCAnaW5mbycsICdleGNsdWRlJyk7XG4gIGF3YWl0IGZzLm1rZGlyKHBhdGguZGlybmFtZShleGNsdWRlUGF0aCksIHsgcmVjdXJzaXZlOiB0cnVlIH0pO1xuXG4gIGNvbnN0IGxpbmVzID0gWycjIFN5bWxpbmtzIGNyZWF0ZWQgYnkgaW5zdGFudC13b3JrdHJlZSddO1xuXG4gIGZvciAoY29uc3QgZGlyIG9mIGRpcmVjdG9yaWVzKSB7XG4gICAgaWYgKCFkaXIpIGNvbnRpbnVlO1xuICAgIHRyeSB7XG4gICAgICBjb25zdCBzdGF0cyA9IGF3YWl0IGZzLmxzdGF0KHBhdGguam9pbih3b3JrdHJlZURpciwgZGlyKSk7XG4gICAgICBpZiAoc3RhdHMuaXNTeW1ib2xpY0xpbmsoKSkgbGluZXMucHVzaChkaXIpO1xuICAgIH0gY2F0Y2ggKGVycm9yOiB1bmtub3duKSB7XG4gICAgICBpZiAoKGVycm9yIGFzIE5vZGVKUy5FcnJub0V4Y2VwdGlvbikuY29kZSAhPT0gJ0VOT0VOVCcpIHtcbiAgICAgICAgdGhyb3cgZXJyb3I7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgZm9yIChjb25zdCBmaWxlIG9mIGZpbGVzKSB7XG4gICAgaWYgKCFmaWxlKSBjb250aW51ZTtcbiAgICB0cnkge1xuICAgICAgY29uc3Qgc3RhdHMgPSBhd2FpdCBmcy5sc3RhdChwYXRoLmpvaW4od29ya3RyZWVEaXIsIGZpbGUpKTtcbiAgICAgIGlmIChzdGF0cy5pc1N5bWJvbGljTGluaygpKSBsaW5lcy5wdXNoKGZpbGUpO1xuICAgIH0gY2F0Y2ggKGVycm9yOiB1bmtub3duKSB7XG4gICAgICBpZiAoKGVycm9yIGFzIE5vZGVKUy5FcnJub0V4Y2VwdGlvbikuY29kZSAhPT0gJ0VOT0VOVCcpIHtcbiAgICAgICAgdGhyb3cgZXJyb3I7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgYXdhaXQgZnMuYXBwZW5kRmlsZShleGNsdWRlUGF0aCwgYCR7bGluZXMuam9pbignXFxuJyl9XFxuYCk7XG5cbiAgdHJ5IHtcbiAgICBhd2FpdCBleGVjRmlsZUFzeW5jKCdnaXQnLCBbJy1DJywgcmVwb1Jvb3QsICdjb25maWcnLCAnZXh0ZW5zaW9ucy53b3JrdHJlZUNvbmZpZycsICd0cnVlJ10sIHsgdGltZW91dDogNV8wMDAgfSk7XG4gIH0gY2F0Y2ggKGVycm9yOiB1bmtub3duKSB7XG4gICAgcHJvY2Vzcy5zdGRlcnIud3JpdGUoXG4gICAgICBgY3JlYXRlLXdvcmt0cmVlOiBmYWlsZWQgdG8gc2V0IHdvcmt0cmVlQ29uZmlnIGV4dGVuc2lvbjogJHtlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6IFN0cmluZyhlcnJvcil9XFxuYFxuICAgICk7XG4gIH1cblxuICB0cnkge1xuICAgIGF3YWl0IGV4ZWNGaWxlQXN5bmMoJ2dpdCcsIFsnLUMnLCB3b3JrdHJlZURpciwgJ2NvbmZpZycsICctLXdvcmt0cmVlJywgJ2NvcmUuZXhjbHVkZXNGaWxlJywgZXhjbHVkZVBhdGhdLCB7XG4gICAgICB0aW1lb3V0OiA1XzAwMFxuICAgIH0pO1xuICB9IGNhdGNoIChlcnJvcjogdW5rbm93bikge1xuICAgIHByb2Nlc3Muc3RkZXJyLndyaXRlKFxuICAgICAgYGNyZWF0ZS13b3JrdHJlZTogZmFpbGVkIHRvIHNldCBjb3JlLmV4Y2x1ZGVzRmlsZTogJHtlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6IFN0cmluZyhlcnJvcil9XFxuYFxuICAgICk7XG4gIH1cbn1cbiIsICJcbmltcG9ydCBoYW5kbGVyIGZyb20gJy4vbGF1bmNoLnRzJztcbmltcG9ydCB7IGV4ZWN1dGVDb21tYW5kIH0gZnJvbSAnLi4vLi4vLi4vc2RrL3NyYy9jb25maWcvcnVudGltZS50cyc7XG5cbmlmICghcHJvY2Vzcy5hcmd2LmluY2x1ZGVzKCctLWJyYW5jaC1jbGVhbnVwJykpIHtcbiAgZXhlY3V0ZUNvbW1hbmQoaGFuZGxlcik7XG59XG4iXSwKICAibWFwcGluZ3MiOiAiOzs7O0FBaUJBLFNBQVMsa0JBQWtCOzs7QUN3S3BCLFNBQVMsYUFDZCxRQUNBLFNBQ2dDO0FBQ2hDLFFBQU0sS0FBSyxPQUFPLE9BQW9CLFlBQTBDO0FBQzlFLFVBQU0sUUFBUSxPQUFPLE9BQU87QUFBQSxFQUM5QjtBQUVBLEtBQUcsY0FBYztBQUNqQixLQUFHLEtBQUssT0FBTztBQUNmLEtBQUcsYUFBYSxPQUFPO0FBQ3ZCLEtBQUcsY0FBYyxPQUFPO0FBQ3hCLEtBQUcsT0FBTyxPQUFPO0FBQ2pCLEtBQUcseUJBQXlCLE9BQU87QUFDbkMsS0FBRyxrQkFBa0IsT0FBTztBQUM1QixLQUFHLFVBQVUsT0FBTztBQUNwQixLQUFHLGFBQWEsT0FBTztBQUV2QixTQUFPO0FBQ1Q7OztBQzVMQSxTQUFTLG9CQUFvQjtBQWN0QixJQUFNLGlCQUFpQjtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFL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QU8sRUFBRSxVQUFVO0FBQUEsSUFDckIsQ0FBQztBQUFBLEVBQ0g7QUFHQSxNQUFJLENBQUMsZUFBZTtBQUNsQixVQUFNLFFBQVEsR0FBRyxRQUFRLENBQUMsVUFBa0I7QUFDMUMsWUFBTSxPQUFPLE1BQU0sU0FBUyxFQUFFLEtBQUs7QUFDbkMsVUFBSSxNQUFNO0FBQ1IsZ0JBQVEsT0FBTyxLQUFLLElBQUk7QUFBQSxNQUMxQjtBQUFBLElBQ0YsQ0FBQztBQUFBLEVBQ0g7QUFFQSxRQUFNLFdBQVcsTUFBTSxJQUFJLFFBQXVCLENBQUNFLGFBQVk7QUFDN0QsVUFBTSxHQUFHLFNBQVNBLFFBQU87QUFBQSxFQUMzQixDQUFDO0FBRUQsVUFBUSxPQUFPLEtBQUssR0FBRyxNQUFNLFVBQVUscUJBQXFCLEVBQUUsV0FBVyxTQUFTLENBQUM7QUFLbkYsUUFBTSxlQUFlLFlBQVksSUFBSTtBQUNyQyxNQUFJO0FBQ0YsVUFBTSxzQkFBc0IsT0FBTyxRQUFRLFFBQVEsUUFBUSxTQUFTO0FBQUEsRUFDdEUsU0FBUyxPQUFPO0FBQ2QsVUFBTSxVQUFVLGlCQUFpQixRQUFRLE1BQU0sVUFBVSxPQUFPLEtBQUs7QUFDckUsWUFBUSxPQUFPLEtBQUssd0NBQXdDLEVBQUUsT0FBTyxTQUFTLFVBQVUsQ0FBQztBQUFBLEVBQzNGO0FBQ0EsVUFBUSxPQUFPLE1BQU0sOEJBQThCO0FBQUEsSUFDakQ7QUFBQSxJQUNBLFdBQVcsS0FBSyxNQUFNLFlBQVksSUFBSSxJQUFJLFlBQVk7QUFBQSxFQUN4RCxDQUFDO0FBQ0g7OztBUGxnQkEsSUFBTyxpQkFBUTtBQUFBLEVBQ2I7QUFBQSxJQUNFLFlBQVk7QUFBQSxJQUNaLGFBQWE7QUFBQSxJQUNiLHdCQUF3QjtBQUFBLElBQ3hCLFNBQVM7QUFBQSxFQUNYO0FBQUEsRUFDQSxPQUFPLE9BQW9CLFlBQTJCO0FBQ3BELFVBQU0sYUFBYSxNQUFNO0FBQ3pCLFVBQU0sQ0FBQyxXQUFXLE1BQU0sSUFBSSxDQUFDLFlBQVksYUFBYSxXQUFXLEdBQUcsQ0FBQyxDQUFDLFlBQVksU0FBUztBQUUzRixVQUFNLG1CQUFtQixPQUFPLFNBQVM7QUFBQSxNQUN2QyxRQUFRO0FBQUEsTUFDUjtBQUFBLE1BQ0E7QUFBQSxNQUNBLDZCQUE2QjtBQUFBLElBQy9CLENBQUM7QUFBQSxFQUNIO0FBQ0Y7OztBWTNDQSxJQUFJLENBQUMsUUFBUSxLQUFLLFNBQVMsa0JBQWtCLEdBQUc7QUFDOUMsaUJBQWUsY0FBTztBQUN4QjsiLAogICJuYW1lcyI6IFsicmVzb2x2ZSIsICJleGVjRmlsZSIsICJmcyIsICJwYXRoIiwgInByb21pc2lmeSIsICJwYXRoIiwgInJlc29sdmUiLCAibG9nZ2VyIiwgImZzIiwgInBhdGgiLCAiZXhlY0ZpbGVBc3luYyIsICJwcm9taXNpZnkiLCAiZXhlY0ZpbGUiLCAibG9nZ2VyIiwgInJlc3VsdCIsICJyZXNvbHZlIl0KfQo=
