import { createRequire as __createRequire } from 'node:module';
const require = __createRequire(import.meta.url);

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

// src/lib/codex-session.ts
import { spawn as spawn2 } from "node:child_process";
import * as fs3 from "node:fs/promises";
import { homedir } from "node:os";
import * as path3 from "node:path";

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

// src/lib/claude-session.ts
import { execFile as execFile2, spawn } from "node:child_process";
import * as fs2 from "node:fs/promises";
import * as path2 from "node:path";
import { promisify as promisify2 } from "node:util";

// ../sdk/src/worktree.ts
import { execFile } from "node:child_process";
import * as fs from "node:fs/promises";
import * as path from "node:path";
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
  const worktreeDir = path.join(repoRoot, ".worktrees", ref);
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
    await fs.access(worktreeDir);
    await fs.rm(worktreeDir, { recursive: true });
    await execFileAsync("git", ["worktree", "prune"], { cwd: repoRoot, timeout: 3e4 });
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
  }
}
async function findGitRoots(startDir) {
  let currentDir = path.resolve(startDir);
  while (currentDir !== "/") {
    const gitPath = path.join(currentDir, ".git");
    try {
      const stats = await fs.lstat(gitPath);
      if (stats.isDirectory()) {
        return {
          sourceRoot: currentDir,
          repoRoot: currentDir
        };
      }
      if (stats.isFile()) {
        const gitFileContent = await fs.readFile(gitPath, "utf-8");
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
    currentDir = path.dirname(currentDir);
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
      const sourcePath = path.join(sourceRoot, dir);
      try {
        await fs.lstat(sourcePath);
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
      const destPath = path.join(worktreeDir, dir);
      const parentDir = path.dirname(dir);
      if (parentDir !== ".") {
        await fs.mkdir(path.join(worktreeDir, parentDir), { recursive: true });
      }
      await fs.symlink(sourcePath, destPath);
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
      const sourcePath = path.join(sourceRoot, file);
      try {
        await fs.lstat(sourcePath);
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
      const destPath = path.join(worktreeDir, file);
      const parentDir = path.dirname(file);
      if (parentDir !== ".") {
        await fs.mkdir(path.join(worktreeDir, parentDir), { recursive: true });
      }
      await fs.symlink(sourcePath, destPath);
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
  const entries = await fs.readdir(sourceRoot, { withFileTypes: true });
  const symlinks = entries.filter((e) => e.isSymbolicLink() && e.name !== ".git" && e.name !== ".worktrees");
  const copySymlink = async (name) => {
    const destPath = path.join(worktreeDir, name);
    try {
      await fs.lstat(destPath);
      return false;
    } catch (error) {
      if (error.code !== "ENOENT") {
        throw error;
      }
    }
    const sourceLinkPath = path.join(sourceRoot, name);
    const target = await fs.readlink(sourceLinkPath);
    const resolvedTarget = path.resolve(sourceRoot, target);
    if (resolvedTarget === sourceLinkPath) {
      return false;
    }
    await fs.symlink(sourceLinkPath, destPath);
    return true;
  };
  const results = await Promise.all(symlinks.map((e) => copySymlink(e.name)));
  return results.filter((r) => r).length;
}
async function rerouteNodeModules(opts) {
  const { sourceNodeModules, destNodeModules } = opts;
  try {
    await fs.lstat(sourceNodeModules);
  } catch (error) {
    if (error.code === "ENOENT") {
      return 0;
    }
    throw error;
  }
  try {
    const destStats = await fs.lstat(destNodeModules);
    if (destStats.isSymbolicLink()) {
      await fs.unlink(destNodeModules);
    }
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
  }
  await fs.mkdir(destNodeModules, { recursive: true });
  const entries = await fs.readdir(sourceNodeModules, { withFileTypes: true });
  const counts = await Promise.all(
    entries.map(async (entry) => {
      const sourcePath = path.join(sourceNodeModules, entry.name);
      const destPath = path.join(destNodeModules, entry.name);
      if (entry.isSymbolicLink()) {
        const target = await fs.readlink(sourcePath);
        if (isInternalSymlink(target)) {
          await fs.symlink(target, destPath);
          return 1;
        } else {
          await fs.symlink(sourcePath, destPath);
          return 0;
        }
      } else if (entry.isDirectory() && entry.name.startsWith("@")) {
        await fs.mkdir(destPath, { recursive: true });
        const scopeEntries = await fs.readdir(sourcePath, { withFileTypes: true });
        const scopeCounts = await Promise.all(
          scopeEntries.map(async (scopeEntry) => {
            const scopeSourcePath = path.join(sourcePath, scopeEntry.name);
            const scopeDestPath = path.join(destPath, scopeEntry.name);
            if (scopeEntry.isSymbolicLink()) {
              const target = await fs.readlink(scopeSourcePath);
              if (isInternalSymlink(target)) {
                await fs.symlink(target, scopeDestPath);
                return 1;
              } else {
                await fs.symlink(scopeSourcePath, scopeDestPath);
                return 0;
              }
            } else {
              await fs.symlink(scopeSourcePath, scopeDestPath);
              return 0;
            }
          })
        );
        return scopeCounts.reduce((sum, c) => sum + c, 0);
      } else {
        await fs.symlink(sourcePath, destPath);
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
    const packageJsonContent = await fs.readFile(path.join(repoRoot, "package.json"), "utf-8");
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
    sourceNodeModules: path.join(sourceRoot, "node_modules"),
    destNodeModules: path.join(worktreeDir, "node_modules")
  });
  const packagesDir = path.join(sourceRoot, "packages");
  try {
    const packageEntries = await fs.readdir(packagesDir, { withFileTypes: true });
    for (const entry of packageEntries) {
      if (entry.isDirectory()) {
        const pkgNodeModules = path.join(packagesDir, entry.name, "node_modules");
        let nodeModulesExists = false;
        try {
          await fs.lstat(pkgNodeModules);
          nodeModulesExists = true;
        } catch (error) {
          if (error.code !== "ENOENT") {
            throw error;
          }
        }
        if (nodeModulesExists) {
          const destPackageDir = path.join(worktreeDir, "packages", entry.name);
          await fs.mkdir(destPackageDir, { recursive: true });
          totalCount += await rerouteNodeModules({
            sourceNodeModules: pkgNodeModules,
            destNodeModules: path.join(destPackageDir, "node_modules")
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
  const excludePath = path.join(gitDir.trim(), "info", "exclude");
  await fs.mkdir(path.dirname(excludePath), { recursive: true });
  const lines = ["# Symlinks created by instant-worktree"];
  for (const dir of directories) {
    if (!dir) continue;
    try {
      const stats = await fs.lstat(path.join(worktreeDir, dir));
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
      const stats = await fs.lstat(path.join(worktreeDir, file));
      if (stats.isSymbolicLink()) lines.push(file);
    } catch (error) {
      if (error.code !== "ENOENT") {
        throw error;
      }
    }
  }
  await fs.appendFile(excludePath, `${lines.join("\n")}
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
  return path2.join(extensionPath, "dist", "marketplace");
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
    await fs2.access(worktreePath);
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
  while (await checkWorktreeExists(repoRoot, path2.join(repoRoot, ".worktrees", `${prefix}${nextNumber}`))) {
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

// src/lib/codex-session.ts
var CODEX_PLUGIN_NAME = "codex-runtime";
var CODEX_PLUGIN_MARKETPLACE = "local";
var CODEX_RUNTIME_SKILL_NAME = "cards-runtime";
function resolveCodexPluginPath(marketplacePath) {
  return path3.join(marketplacePath, "plugins", CODEX_PLUGIN_NAME);
}
function resolveCodexHome() {
  return process.env["CODEX_HOME"] ?? path3.join(homedir(), ".codex");
}
async function readCodexPluginManifest(pluginPath) {
  const manifestPath = path3.join(pluginPath, ".codex-plugin", "plugin.json");
  const manifest = JSON.parse(await fs3.readFile(manifestPath, "utf-8"));
  if (manifest.name !== CODEX_PLUGIN_NAME) {
    throw new Error(`Invalid Codex plugin manifest name at ${manifestPath}: expected "${CODEX_PLUGIN_NAME}"`);
  }
  if (typeof manifest.version !== "string" || manifest.version.length === 0) {
    throw new Error(`Invalid Codex plugin manifest version at ${manifestPath}`);
  }
  return {
    name: manifest.name,
    version: manifest.version
  };
}
async function ensureCodexPluginInstalled(marketplacePath) {
  const pluginPath = resolveCodexPluginPath(marketplacePath);
  const skillPath = path3.join(pluginPath, "skills", CODEX_RUNTIME_SKILL_NAME);
  await fs3.access(pluginPath);
  await fs3.access(skillPath);
  const manifest = await readCodexPluginManifest(pluginPath);
  const pluginVersionsPath = path3.join(
    resolveCodexHome(),
    "plugins",
    "cache",
    CODEX_PLUGIN_MARKETPLACE,
    CODEX_PLUGIN_NAME
  );
  const cachePath = path3.join(pluginVersionsPath, manifest.version);
  await fs3.rm(pluginVersionsPath, { recursive: true, force: true });
  await fs3.mkdir(pluginVersionsPath, { recursive: true });
  await fs3.symlink(pluginPath, cachePath, "junction");
  return {
    pluginPath,
    version: manifest.version,
    cachePath
  };
}
function buildCodexArgs(prompt, workspacePath, cardRepoPath) {
  return [
    "--dangerously-bypass-approvals-and-sandbox",
    "--cd",
    workspacePath,
    "--add-dir",
    cardRepoPath,
    "--config",
    "features.plugins=true",
    "--config",
    `plugins.${CODEX_PLUGIN_NAME}@${CODEX_PLUGIN_MARKETPLACE}.enabled=true`,
    prompt
  ];
}
async function spawnCodexSession(input, context, options) {
  const { prompt } = options;
  const marketplacePath = resolveMarketplacePath();
  context.logger.info(`${input.actionName} action started`, {
    cardId: input.cardId,
    environment: input.environment,
    executionMode: input.executionMode
  });
  const client = new CardsClient({
    baseUrl: input.apiBaseUrl,
    accessToken: input.apiAccessToken
  });
  const baseBranch = await resolveBaseBranch(input.repoRoot, client);
  const {
    worktreePath: cwd,
    branchName,
    parentBranch
  } = await resolveOrCreateWorktree(input, client, baseBranch, context.logger);
  context.logger.info("Using worktree", { cwd, branch: branchName, baseBranch, parentBranch });
  const { pluginPath, version, cachePath } = await ensureCodexPluginInstalled(marketplacePath);
  context.logger.info("Installed Codex runtime plugin", {
    pluginPath,
    version,
    cachePath
  });
  const args = buildCodexArgs(prompt, cwd, input.cardRepoPath);
  const child = spawn2("codex", args, {
    cwd,
    stdio: "inherit",
    env: {
      ...process.env,
      WORKSPACE_PATH: cwd,
      BASE_BRANCH: baseBranch,
      PARENT_BRANCH: parentBranch,
      WORKSPACE_BRANCH: branchName
    }
  });
  context.onCancel(() => {
    context.logger.info(`${input.actionName} action cancelled, terminating codex`);
    child.kill("SIGTERM");
  });
  const exitCode = await new Promise((resolve2) => {
    child.on("close", resolve2);
  });
  context.logger.info(`${input.actionName} action completed`, { exitCode });
  try {
    await cleanupMergedBranches(input, client, context.logger);
  } catch (error) {
    context.logger.warn("Post-exit cleanup failed (non-fatal)", { error: errorMessage(error) });
  }
}

// src/actions/codex.ts
var codex_default = defineAction(
  {
    actionName: "Codex",
    description: "Start a Codex session for the card",
    supportsBackgroundMode: false,
    timeout: 36e5
  },
  async (input, context) => {
    await spawnCodexSession(input, context, {
      prompt: "Use the `cards-runtime` skill for card repository conventions, then continue work on the card."
    });
  }
);

// src/actions/hook-wrapper.ts
if (!process.argv.includes("--branch-cleanup")) {
  executeCommand(codex_default);
}
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vLi4vLi4vc2RrL3NyYy9jb25maWcvZmFjdG9yaWVzL2FjdGlvbi50cyIsICIuLi8uLi8uLi9zZGsvc3JjL2NvbmZpZy9lbnYudHMiLCAiLi4vLi4vLi4vc2RrL3NyYy9jb25maWcvZXhpdC1jb2Rlcy50cyIsICIuLi8uLi8uLi9zZGsvc3JjL2NvbmZpZy9sb2dnZXIudHMiLCAiLi4vLi4vLi4vc2RrL3NyYy9jb25maWcvc29ja2V0LWNsaWVudC50cyIsICIuLi8uLi8uLi9zZGsvc3JjL2NvbmZpZy9ydW50aW1lLnRzIiwgIi4uLy4uL3NyYy9saWIvY29kZXgtc2Vzc2lvbi50cyIsICIuLi8uLi8uLi9zZGsvc3JjL2NsaWVudC90eXBlcy9lcnJvcnMudHMiLCAiLi4vLi4vLi4vc2RrL3NyYy9jbGllbnQvY2FyZHNDbGllbnQudHMiLCAiLi4vLi4vc3JjL2xpYi9jbGF1ZGUtc2Vzc2lvbi50cyIsICIuLi8uLi8uLi9zZGsvc3JjL3dvcmt0cmVlLnRzIiwgIi4uLy4uL3NyYy9hY3Rpb25zL2NvZGV4LnRzIiwgIi4uLy4uL3NyYy9hY3Rpb25zL2hvb2std3JhcHBlci50cyJdLAogICJzb3VyY2VzQ29udGVudCI6IFsiLyoqXG4gKiBGYWN0b3J5IGZ1bmN0aW9uIGZvciBjcmVhdGluZyBhY3Rpb24gaGFuZGxlcnMuXG4gKlxuICogVGhpcyBpcyB0aGUgcHJpbWFyeSBhdXRob3JpbmcgQVBJIGZvciBhY3Rpb24gZGV2ZWxvcGVycy4gSXQgd3JhcHMgYSBoYW5kbGVyXG4gKiBmdW5jdGlvbiBhbmQgYXR0YWNoZXMgbWV0YWRhdGEgZm9yIHNldHRpbmdzLmpzb24gZ2VuZXJhdGlvbi4gVGhlIFNhbWVTaGFwZVxuICogdXRpbGl0eSBwcm92aWRlcyBjb21waWxlLXRpbWUgdHlwbyBkZXRlY3Rpb24uXG4gKlxuICpcbiAqIEBzdW1tYXJ5IEZhY3RvcnkgZnVuY3Rpb24gZm9yIGNyZWF0aW5nIGFjdGlvbiBoYW5kbGVyc1xuICogQG1vZHVsZVxuICovXG5cbmltcG9ydCB0eXBlIHsgQWN0aW9uQ29tbWFuZCB9IGZyb20gJy4uL2NvbW1hbmQtdHlwZXMuanMnO1xuaW1wb3J0IHR5cGUgeyBBY3Rpb25Db250ZXh0LCBBY3Rpb25JbnB1dCB9IGZyb20gJy4uL2lucHV0cy5qcyc7XG5pbXBvcnQgdHlwZSB7IFNhbWVTaGFwZSB9IGZyb20gJy4uL3R5cGUtdXRpbHMuanMnO1xuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBDb25maWd1cmF0aW9uIFR5cGVzXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbi8qKlxuICogQ29uZmlndXJhdGlvbiBmb3Ige0BsaW5rIGRlZmluZUFjdGlvbn0gZmFjdG9yeS5cbiAqXG4gKiBBbGwgZmllbGRzIGV4Y2VwdCBgYWN0aW9uTmFtZWAgYXJlIG9wdGlvbmFsIGFuZCBmb3J3YXJkZWQgdG8gc2V0dGluZ3MuanNvbi5cbiAqIFRoZSBDTEkgZXh0cmFjdHMgdGhpcyBtZXRhZGF0YSB2aWEgQVNUIGFuYWx5c2lzLCBzbyB2YWx1ZXMgbXVzdCBiZSBzdHJpbmdcbiAqIGxpdGVyYWxzIG9yIGJvb2xlYW4vbnVtYmVyIGxpdGVyYWxzIGluIHRoZSBzb3VyY2UgY29kZS5cbiAqXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogY29uc3QgY29uZmlnOiBBY3Rpb25Db25maWcgPSB7XG4gKiAgIGFjdGlvbk5hbWU6ICdMYXVuY2ggQ2xhdWRlJyxcbiAqICAgZGVzY3JpcHRpb246ICdTdGFydCBhIENsYXVkZSBjb2Rpbmcgc2Vzc2lvbicsXG4gKiAgIGljb246ICcuL2ljb25zL2NsYXVkZS5zdmcnLFxuICogICBzdXBwb3J0c0JhY2tncm91bmRNb2RlOiB0cnVlLFxuICogICB0aW1lb3V0OiAzMDAwMFxuICogfTtcbiAqIGBgYFxuICovXG5leHBvcnQgaW50ZXJmYWNlIEFjdGlvbkNvbmZpZyB7XG4gIC8qKlxuICAgKiBTdGFibGUgaWRlbnRpZmllciBmb3IgdGhlIGFjdGlvbiB1c2VkIGluIHRlbGVtZXRyeSwgbG9jYWxpemF0aW9uLCBhbmQgQVBJIGxvb2t1cHMuXG4gICAqXG4gICAqIFNob3VsZCBiZSBsb3dlcmNhc2Ugd2l0aCBoeXBoZW5zIChlLmcuLCAnbGF1bmNoLWNsYXVkZScsICdydW4tdGVzdHMnKS5cbiAgICogSWYgb21pdHRlZCwgdGhlIENMSSBnZW5lcmF0ZXMgYW4gSUQgYnkgc2x1Z2lmeWluZyBgYWN0aW9uTmFtZWAuXG4gICAqL1xuICBpZD86IHN0cmluZztcblxuICAvKipcbiAgICogVGhlIGFjdGlvbiBuYW1lIHVzZWQgdG8gaWRlbnRpZnkgdGhlIGFjdGlvbiBpbiBzZXR0aW5ncy5qc29uLlxuICAgKlxuICAgKiBUaGlzIG5hbWUgYXBwZWFycyBpbiB0aGUgVUkuIEtlZXAgaXQgY29uY2lzZSBidXQgZGVzY3JpcHRpdmUuXG4gICAqL1xuICBhY3Rpb25OYW1lOiBzdHJpbmc7XG5cbiAgLyoqXG4gICAqIEh1bWFuLXJlYWRhYmxlIGRlc2NyaXB0aW9uIHNob3duIGluIGJ1dHRvbiB0b29sdGlwLlxuICAgKlxuICAgKiBFeHBsYWluIHdoYXQgdGhlIGFjdGlvbiBkb2VzIGluIGEgZmV3IHdvcmRzLiBTaG93biBvbiBob3ZlciBpbiB0aGUgVUkuXG4gICAqL1xuICBkZXNjcmlwdGlvbj86IHN0cmluZztcblxuICAvKipcbiAgICogUGF0aCB0byBpY29uIGZpbGUgZm9yIHRoZSBhY3Rpb24gYnV0dG9uLlxuICAgKlxuICAgKiBQYXRocyBhcmUgcmVsYXRpdmUgdG8gdGhlIHNldHRpbmdzLmpzb24gZmlsZSBsb2NhdGlvbi5cbiAgICogU1ZHIGZvcm1hdCByZWNvbW1lbmRlZCBmb3IgY3Jpc3AgcmVuZGVyaW5nIGF0IGFueSBzaXplLlxuICAgKi9cbiAgaWNvbj86IHN0cmluZztcblxuICAvKipcbiAgICogV2hldGhlciB0byBzaG93IHRoZSBleGVjdXRpb24gbW9kZSB0b2dnbGUgaW4gdGhlIFVJLlxuICAgKlxuICAgKiBXaGVuIHRydWUsIHVzZXJzIGNhbiBjaG9vc2UgYmV0d2VlbiBpbnRlcmFjdGl2ZSBhbmQgYmFja2dyb3VuZCBtb2Rlcy5cbiAgICogV2hlbiBmYWxzZSAoZGVmYXVsdCksIHRoZSBhY3Rpb24gYWx3YXlzIHJ1bnMgaW4gaW50ZXJhY3RpdmUgbW9kZS5cbiAgICovXG4gIHN1cHBvcnRzQmFja2dyb3VuZE1vZGU/OiBib29sZWFuO1xuXG4gIC8qKlxuICAgKiBXaGV0aGVyIG11bHRpcGxlIGluc3RhbmNlcyBjYW4gcnVuIHNpbXVsdGFuZW91c2x5IG9uIHRoZSBzYW1lIGNhcmQuXG4gICAqXG4gICAqIFdoZW4gZmFsc2UgKGRlZmF1bHQpLCBzdGFydGluZyB0aGUgYWN0aW9uIHdoaWxlIGl0J3MgcnVubmluZyB3aWxsIGJlXG4gICAqIGJsb2NrZWQuIFNldCB0byB0cnVlIGZvciBpZGVtcG90ZW50IGFjdGlvbnMgdGhhdCBjYW4gc2FmZWx5IG92ZXJsYXAuXG4gICAqL1xuICBhbGxvd0NvbmN1cnJlbnQ/OiBib29sZWFuO1xuXG4gIC8qKlxuICAgKiBNYXhpbXVtIGV4ZWN1dGlvbiB0aW1lIGluIG1pbGxpc2Vjb25kcy5cbiAgICpcbiAgICogSWYgdGhlIGFjdGlvbiBleGNlZWRzIHRoaXMgdGltZW91dCwgdGhlIHJ1bnRpbWUgd2lsbCB0ZXJtaW5hdGUgaXQuXG4gICAqIE9taXQgdG8gdXNlIHRoZSBwbGF0Zm9ybSdzIGRlZmF1bHQgdGltZW91dCBwb2xpY3kuXG4gICAqL1xuICB0aW1lb3V0PzogbnVtYmVyO1xuXG4gIC8qKlxuICAgKiBIYW5kbGVyIHNvdXJjZSBmaWxlIHBhdGgsIGluamVjdGVkIGJ5IHRoZSBgaW5qZWN0U291cmNlUGF0aGAgZXNidWlsZFxuICAgKiBwbHVnaW4gZHVyaW5nIGNvbmZpZyBsb2FkaW5nLiBEbyBub3Qgc2V0IG1hbnVhbGx5LlxuICAgKlxuICAgKiBAaW50ZXJuYWxcbiAgICovXG4gIHNvdXJjZVBhdGg/OiBzdHJpbmc7XG59XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIEhhbmRsZXIgVHlwZXNcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuLyoqXG4gKiBIYW5kbGVyIGZ1bmN0aW9uIHNpZ25hdHVyZSBmb3IgYWN0aW9uIGV2ZW50cy5cbiAqXG4gKiBUaHJvd2luZyBhbiBlcnJvciBzaWduYWxzIGFjdGlvbiBmYWlsdXJlLiBUaGUgZXJyb3IgbWVzc2FnZSBpcyBsb2dnZWQgYW5kXG4gKiBzdXJmYWNlZCB0byB0aGUgdXNlci4gRm9yIGV4cGVjdGVkIGVycm9ycywgdGhyb3cgd2l0aCBhIGRlc2NyaXB0aXZlIG1lc3NhZ2UuXG4gKlxuICogQHBhcmFtIGlucHV0IC0gQWN0aW9uIGlucHV0IHBheWxvYWQgZnJvbSBlbnZpcm9ubWVudCB2YXJpYWJsZXNcbiAqIEBwYXJhbSBjb250ZXh0IC0gUnVudGltZSBjb250ZXh0IHdpdGggbG9nZ2VyLCBjd2QsIGFuZCBjYWxsYmFjayBtZXRob2RzXG4gKiBAcmV0dXJucyBQcm9taXNlIHRoYXQgcmVzb2x2ZXMgd2hlbiB0aGUgYWN0aW9uIGNvbXBsZXRlc1xuICpcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBjb25zdCBoYW5kbGVyOiBBY3Rpb25IYW5kbGVyID0gYXN5bmMgKGlucHV0LCB7IGxvZ2dlciwgb25DYW5jZWwgfSkgPT4ge1xuICogICBvbkNhbmNlbCgoKSA9PiB7XG4gKiAgICAgbG9nZ2VyLmluZm8oJ0NhbmNlbGxpbmcgYWN0aW9uJyk7XG4gKiAgIH0pO1xuICpcbiAqICAgdHJ5IHtcbiAqICAgICBsb2dnZXIuaW5mbygnU3RhcnRpbmcgYWN0aW9uJywgeyBjYXJkSWQ6IGlucHV0LmNhcmRJZCB9KTtcbiAqICAgICBhd2FpdCBwZXJmb3JtQWN0aW9uKGlucHV0KTtcbiAqICAgICBsb2dnZXIuaW5mbygnQWN0aW9uIGNvbXBsZXRlZCBzdWNjZXNzZnVsbHknKTtcbiAqICAgfSBjYXRjaCAoZXJyKSB7XG4gKiAgICAgbG9nZ2VyLmxvZ0Vycm9yKGVyciwgJ0FjdGlvbiBmYWlsZWQnKTtcbiAqICAgICB0aHJvdyBlcnI7IC8vIFJlLXRocm93IHRvIHNpZ25hbCBmYWlsdXJlXG4gKiAgIH1cbiAqIH07XG4gKiBgYGBcbiAqL1xuZXhwb3J0IHR5cGUgQWN0aW9uSGFuZGxlciA9IChpbnB1dDogQWN0aW9uSW5wdXQsIGNvbnRleHQ6IEFjdGlvbkNvbnRleHQpID0+IHZvaWQgfCBQcm9taXNlPHZvaWQ+O1xuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBGYWN0b3J5IEZ1bmN0aW9uXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbi8qKlxuICogQ3JlYXRlcyBhbiBhY3Rpb24gaGFuZGxlciB3aXRoIG1ldGFkYXRhIGZvciBzZXR0aW5ncy5qc29uIGdlbmVyYXRpb24uXG4gKlxuICogVGhpcyBmYWN0b3J5IHdyYXBzIHlvdXIgaGFuZGxlciBmdW5jdGlvbiBhbmQgYXR0YWNoZXMgbWV0YWRhdGEgdGhhdCB0aGUgQ0xJXG4gKiBleHRyYWN0cyB3aGVuIGJ1aWxkaW5nIHNldHRpbmdzLmpzb24uIFRoZSByZXR1cm5lZCBjb21tYW5kIGlzIGJvdGggY2FsbGFibGVcbiAqIChmb3IgdGhlIHJ1bnRpbWUpIGFuZCBpbnNwZWN0YWJsZSAoZm9yIHRoZSBDTEkpLlxuICpcbiAqIFRoZSBnZW5lcmljIHBhcmFtZXRlciBwcmVzZXJ2ZXMgdGhlIGFjdGlvbiBuYW1lIGFzIGEgbGl0ZXJhbCB0eXBlLlxuICpcbiAqIEB0ZW1wbGF0ZSBUIC0gVGhlIGNvbmZpZyB0eXBlIGV4dGVuZGluZyBBY3Rpb25Db25maWdcbiAqIEBwYXJhbSBjb25maWcgLSBBY3Rpb24gbWV0YWRhdGEgKHVzZXMgU2FtZVNoYXBlIHRvIGNhdGNoIHR5cG9zKVxuICogQHBhcmFtIGhhbmRsZXIgLSBBc3luYyBmdW5jdGlvbiB0aGF0IGltcGxlbWVudHMgdGhlIGFjdGlvbiBsb2dpY1xuICogQHJldHVybnMgQSBjYWxsYWJsZSBjb21tYW5kIHdpdGggYXR0YWNoZWQgbWV0YWRhdGFcbiAqXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogLy8gQmFzaWMgdXNhZ2VcbiAqIGV4cG9ydCBkZWZhdWx0IGRlZmluZUFjdGlvbihcbiAqICAgeyBhY3Rpb25OYW1lOiAnTGF1bmNoIENsYXVkZScgfSxcbiAqICAgYXN5bmMgKGlucHV0LCB7IGxvZ2dlciB9KSA9PiB7XG4gKiAgICAgbG9nZ2VyLmluZm8oJ0xhdW5jaGluZyBDbGF1ZGUnLCB7IGNhcmRJZDogaW5wdXQuY2FyZElkIH0pO1xuICogICAgIGF3YWl0IHNwYXduQ2xhdWRlKGlucHV0KTtcbiAqICAgfVxuICogKTtcbiAqIGBgYFxuICpcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiAvLyBXaXRoIGZ1bGwgY29uZmlndXJhdGlvblxuICogZXhwb3J0IGRlZmF1bHQgZGVmaW5lQWN0aW9uKFxuICogICB7XG4gKiAgICAgYWN0aW9uTmFtZTogJ0RlcGxveSBBcHBsaWNhdGlvbicsXG4gKiAgICAgZGVzY3JpcHRpb246ICdEZXBsb3kgdG8gcHJvZHVjdGlvbicsXG4gKiAgICAgaWNvbjogJy4vaWNvbnMvZGVwbG95LnN2ZycsXG4gKiAgICAgc3VwcG9ydHNCYWNrZ3JvdW5kTW9kZTogdHJ1ZSxcbiAqICAgICBhbGxvd0NvbmN1cnJlbnQ6IGZhbHNlLFxuICogICAgIHRpbWVvdXQ6IDYwMDAwXG4gKiAgIH0sXG4gKiAgIGFzeW5jIChpbnB1dCwgY29udGV4dCkgPT4ge1xuICogICAgIGNvbnRleHQub25DYW5jZWwoKCkgPT4gY2xlYW51cCgpKTtcbiAqICAgICBhd2FpdCBkZXBsb3koaW5wdXQsIGNvbnRleHQpO1xuICogICB9XG4gKiApO1xuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBkZWZpbmVBY3Rpb248VCBleHRlbmRzIEFjdGlvbkNvbmZpZz4oXG4gIGNvbmZpZzogU2FtZVNoYXBlPEFjdGlvbkNvbmZpZywgVD4sXG4gIGhhbmRsZXI6IEFjdGlvbkhhbmRsZXJcbik6IEFjdGlvbkNvbW1hbmQ8VFsnYWN0aW9uTmFtZSddPiB7XG4gIGNvbnN0IGZuID0gYXN5bmMgKGlucHV0OiBBY3Rpb25JbnB1dCwgY29udGV4dDogQWN0aW9uQ29udGV4dCk6IFByb21pc2U8dm9pZD4gPT4ge1xuICAgIGF3YWl0IGhhbmRsZXIoaW5wdXQsIGNvbnRleHQpO1xuICB9O1xuXG4gIGZuLmZhY3RvcnlUeXBlID0gJ2FjdGlvbicgYXMgY29uc3Q7XG4gIGZuLmlkID0gY29uZmlnLmlkO1xuICBmbi5hY3Rpb25OYW1lID0gY29uZmlnLmFjdGlvbk5hbWU7XG4gIGZuLmRlc2NyaXB0aW9uID0gY29uZmlnLmRlc2NyaXB0aW9uO1xuICBmbi5pY29uID0gY29uZmlnLmljb247XG4gIGZuLnN1cHBvcnRzQmFja2dyb3VuZE1vZGUgPSBjb25maWcuc3VwcG9ydHNCYWNrZ3JvdW5kTW9kZTtcbiAgZm4uYWxsb3dDb25jdXJyZW50ID0gY29uZmlnLmFsbG93Q29uY3VycmVudDtcbiAgZm4udGltZW91dCA9IGNvbmZpZy50aW1lb3V0O1xuICBmbi5zb3VyY2VQYXRoID0gY29uZmlnLnNvdXJjZVBhdGg7XG5cbiAgcmV0dXJuIGZuIGFzIEFjdGlvbkNvbW1hbmQ8VFsnYWN0aW9uTmFtZSddPjtcbn1cbiIsICIvKipcbiAqIEVudmlyb25tZW50IHZhcmlhYmxlIHV0aWxpdGllcyBmb3IgQ2FyZHMgRXh0ZW5zaW9uIGFjdGlvbnMgYW5kIHR5cGUgaG9va3MuXG4gKlxuICogVGhlIGV4ZWN1dGlvbiB3cmFwcGVyIGluamVjdHMgYWN0aW9uIGFuZCB0eXBlIGhvb2sgaW5wdXRzIHZpYSBwcm9jZXNzLmVudi5cbiAqIFRoaXMgbW9kdWxlIHByb3ZpZGVzIHN0cmljdCBnZXR0ZXJzIGFuZCB0eXBlZCBleHRyYWN0b3JzIHNvIGhhbmRsZXJzIGRvIG5vdFxuICogbmVlZCB0byBwYXJzZSBlbnZpcm9ubWVudCB2YXJpYWJsZXMgbWFudWFsbHkuXG4gKlxuICogVXNlIHRoZSBpbmRpdmlkdWFsIGdldHRlcnMgd2hlbiB5b3Ugb25seSBuZWVkIG9uZSB2YWx1ZTsgdXNlXG4gKiB7QGxpbmsgZXh0cmFjdEFjdGlvbklucHV0fSBvciB7QGxpbmsgZXh0cmFjdFR5cGVJbnB1dH0gd2hlbiB5b3UgbmVlZCBhIGZ1bGxcbiAqIHR5cGVkIHBheWxvYWQgZm9yIGFuIGFjdGlvbiBvciB0eXBlIGhvb2suXG4gKlxuICpcbiAqIEBzdW1tYXJ5IEVudmlyb25tZW50IHZhcmlhYmxlIHV0aWxpdGllcyBmb3IgQ2FyZHMgRXh0ZW5zaW9uIGFjdGlvbnMgYW5kIHR5cGUgaG9va3NcbiAqIEBtb2R1bGVcbiAqL1xuXG5pbXBvcnQgeyByZWFkRmlsZVN5bmMgfSBmcm9tICdub2RlOmZzJztcbmltcG9ydCB0eXBlIHsgQWN0aW9uSW5wdXQsIFR5cGVIb29rSW5wdXQgfSBmcm9tICcuL2lucHV0cy5qcyc7XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIENvbnN0YW50c1xuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4vKipcbiAqIEVudmlyb25tZW50IHZhcmlhYmxlIG5hbWVzIHNldCBieSB0aGUgQ2FyZHMgZXhlY3V0aW9uIHdyYXBwZXIuXG4gKlxuICogVGhpcyBpcyB0aGUgc2luZ2xlIHNvdXJjZSBvZiB0cnV0aCBmb3IgZW52IHZhciBrZXlzIHVzZWQgYnkgYWN0aW9uIGFuZCB0eXBlXG4gKiBob29rIHByb2Nlc3Nlcy4gS2VlcCBpdCBpbiBzeW5jIHdpdGggdGhlIHdyYXBwZXIgdG8gYXZvaWQgc3VidGxlIFwidW5kZWZpbmVkXG4gKiBpbnB1dFwiIGJ1Z3MuXG4gKi9cbmV4cG9ydCBjb25zdCBDQVJEU19FTlZfVkFSUyA9IHtcbiAgLyoqXG4gICAqIFVuaXF1ZSBpZGVudGlmaWVyIGZvciB0aGUgY3VycmVudCBjYXJkLlxuICAgKiBBdmFpbGFibGUgaW4gYWxsIGFjdGlvbnMgYW5kIHR5cGUgaG9va3MuXG4gICAqL1xuICBDQVJEX0lEOiAnQ0FSRF9JRCcsXG5cbiAgLyoqXG4gICAqIFRoZSBlbnZpcm9ubWVudCBuYW1lIGZyb20gc2V0dGluZ3MuanNvbi5cbiAgICogQXZhaWxhYmxlIGluIGFsbCBhY3Rpb25zIGFuZCB0eXBlIGhvb2tzLlxuICAgKi9cbiAgRU5WSVJPTk1FTlQ6ICdFTlZJUk9OTUVOVCcsXG5cbiAgLyoqXG4gICAqIERpc3BsYXkgbmFtZSBvZiB0aGUgYWN0aW9uIGJ1dHRvbiB0aGF0IHRyaWdnZXJlZCB0aGlzIGhhbmRsZXIuXG4gICAqIEF2YWlsYWJsZSBpbiBhY3Rpb25zIG9ubHkgKG5vdCB0eXBlIGhvb2tzKS5cbiAgICovXG4gIEFDVElPTl9OQU1FOiAnQUNUSU9OX05BTUUnLFxuXG4gIC8qKlxuICAgKiBDYXJkJ3MgZXhlY3V0aW9uIG1vZGUsIGRldGVybWluaW5nIFVJIGludGVyYWN0aW9uIG1vZGVsLlxuICAgKiBBdmFpbGFibGUgaW4gYWN0aW9ucyBvbmx5IChub3QgdHlwZSBob29rcykuXG4gICAqIFZhbGlkIHZhbHVlczogJ2ludGVyYWN0aXZlJyB8ICdiYWNrZ3JvdW5kJ1xuICAgKi9cbiAgRVhFQ1VUSU9OX01PREU6ICdFWEVDVVRJT05fTU9ERScsXG5cbiAgLyoqXG4gICAqIENhcmRzIHNlcnZlciBiYXNlIFVSTCBmb3IgQVBJIGNhbGxzLlxuICAgKiBBdmFpbGFibGUgaW4gYWxsIGFjdGlvbnMgYW5kIHR5cGUgaG9va3MuXG4gICAqL1xuICBBUElfQkFTRV9VUkw6ICdBUElfQkFTRV9VUkwnLFxuXG4gIC8qKlxuICAgKiBBdXRoZW50aWNhdGlvbiB0b2tlbiBmb3IgQVBJIGNhbGxzLlxuICAgKiBBdmFpbGFibGUgaW4gYWxsIGFjdGlvbnMgYW5kIHR5cGUgaG9va3MuXG4gICAqL1xuICBBUElfQUNDRVNTX1RPS0VOOiAnQVBJX0FDQ0VTU19UT0tFTicsXG5cbiAgLyoqXG4gICAqIENvbmZpZ3VyZWQgY29kaW5nIGFnZW50IGlkZW50aWZpZXIgZnJvbSBjYXJkcy5jb2RpbmdBZ2VudCBzZXR0aW5nLlxuICAgKiBBdmFpbGFibGUgaW4gYWN0aW9ucyBvbmx5IChub3QgdHlwZSBob29rcykuXG4gICAqIE9wdGlvbmFsLlxuICAgKi9cbiAgQ09ESU5HX0FHRU5UOiAnQ09ESU5HX0FHRU5UJyxcblxuICAvKipcbiAgICogVGhlIHJlZ2lzdGVyZWQgdHlwZSBuYW1lLlxuICAgKiBBdmFpbGFibGUgaW4gdHlwZSBob29rcyBvbmx5LlxuICAgKi9cbiAgVFlQRV9OQU1FOiAnVFlQRV9OQU1FJyxcblxuICAvKipcbiAgICogVGhlIHR5cGUncyB2ZXJzaW9uIHN0cmluZyBmcm9tIHNldHRpbmdzLmpzb24gY29uZmlndXJhdGlvbi5cbiAgICogQXZhaWxhYmxlIGluIHR5cGUgaG9va3Mgb25seS5cbiAgICovXG4gIFRZUEVfVkVSU0lPTjogJ1RZUEVfVkVSU0lPTicsXG5cbiAgLyoqXG4gICAqIFRoZSBmaWxlIG5hbWUgd2l0aGluIHRoZSB0eXBlIGRpcmVjdG9yeS5cbiAgICogQXZhaWxhYmxlIGluIHR5cGUgaG9va3Mgb25seS5cbiAgICovXG4gIEZJTEVfTkFNRTogJ0ZJTEVfTkFNRScsXG5cbiAgLyoqXG4gICAqIEZ1bGwgcGF0aCB0byB0aGUgZmlsZS5cbiAgICogQXZhaWxhYmxlIGluIHR5cGUgaG9va3Mgb25seS5cbiAgICovXG4gIEZJTEVfUEFUSDogJ0ZJTEVfUEFUSCcsXG5cbiAgLyoqXG4gICAqIEZpbGUgc2l6ZSBpbiBieXRlcy5cbiAgICogQXZhaWxhYmxlIGluIHR5cGUgaG9va3Mgb25seS5cbiAgICovXG4gIEZJTEVfU0laRTogJ0ZJTEVfU0laRScsXG5cbiAgLyoqXG4gICAqIFNIQTI1NiBoYXNoIG9mIGNvbnRlbnQuXG4gICAqIEF2YWlsYWJsZSBpbiB0eXBlIGhvb2tzIG9ubHkuXG4gICAqL1xuICBTSEEyNTY6ICdTSEEyNTYnLFxuXG4gIC8qKlxuICAgKiBNSU1FIHR5cGUgb2YgdGhlIGNvbnRlbnQuXG4gICAqIEF2YWlsYWJsZSBpbiB0eXBlIGhvb2tzIG9ubHkuXG4gICAqL1xuICBDT05URU5UX1RZUEU6ICdDT05URU5UX1RZUEUnLFxuXG4gIC8qKlxuICAgKiBQYXRoIHRvIHRoZSBWUyBDb2RlIGJ1bmRsZWQgTm9kZS5qcyBpbnRlcnByZXRlci5cbiAgICpcbiAgICogU2V0IGJ5IHRoZSBleHRlbnNpb24gaG9zdCBmcm9tIGBwcm9jZXNzLmV4ZWNQYXRoYCAod2l0aFxuICAgKiBgRUxFQ1RST05fUlVOX0FTX05PREU9MWApLiBDb21tYW5kcyBpbiBzZXR0aW5ncy5qc29uIHVzZVxuICAgKiBgJFZTQ09ERV9OT0RFIC4vYmluLy4uLmAgc28gdGhleSB3b3JrIHJlZ2FyZGxlc3Mgb2ZcbiAgICogd2hldGhlciBgbm9kZWAgaXMgb24gdGhlIHN5c3RlbSBQQVRILlxuICAgKlxuICAgKiBBdmFpbGFibGUgaW4gYWxsIGFjdGlvbnMgYW5kIHR5cGUgaG9va3MuXG4gICAqL1xuICBWU0NPREVfTk9ERTogJ1ZTQ09ERV9OT0RFJyxcblxuICAvKipcbiAgICogUGF0aCB0byB0aGUgTm9kZS5qcyBpbnRlcnByZXRlciBydW5uaW5nIHRoZSB3cmFwcGVyIHByb2Nlc3MuXG4gICAqXG4gICAqIFNldCBieSB0aGUgd3JhcHBlciBmcm9tIGBwcm9jZXNzLmV4ZWNQYXRoYC4gVXNlIGAkTk9ERWAgaW4gZW1iZWRkZWRcbiAgICogYmFzaCBzdGF0ZW1lbnRzIHRvIGludm9rZSBOb2RlIHNjcmlwdHMgcG9ydGFibHkuXG4gICAqXG4gICAqIEF2YWlsYWJsZSBpbiBhbGwgYWN0aW9ucy5cbiAgICovXG4gIE5PREU6ICdOT0RFJyxcblxuICAvKipcbiAgICogUGF0aCB0byB0aGUgVW5peCBkb21haW4gc29ja2V0IGZvciBydW50aW1lLXRvLWRpc3BhdGNoZXIgY29tbXVuaWNhdGlvbi5cbiAgICogQXZhaWxhYmxlIGluIGFjdGlvbnMgb25seS5cbiAgICovXG4gIFNPQ0tFVF9QQVRIOiAnU09DS0VUX1BBVEgnLFxuXG4gIC8qKlxuICAgKiBQYXRoIHRvIGEgSlNPTiBmaWxlIGNvbnRhaW5pbmcgc3dpdGNoVG9JbnRlcmFjdGl2ZSBkYXRhIGZyb20gYSBwcmV2aW91cyBoYW5kbGVyLlxuICAgKiBBdmFpbGFibGUgaW4gYWN0aW9ucyBvbmx5LiBPcHRpb25hbC5cbiAgICovXG4gIFNXSVRDSF9UT19JTlRFUkFDVElWRV9EQVRBX1BBVEg6ICdTV0lUQ0hfVE9fSU5URVJBQ1RJVkVfREFUQV9QQVRIJyxcblxuICAvKipcbiAgICogUGF0aCB0byB0aGUgc2V0dGluZ3MgY29uZmlndXJhdGlvbiBkaXJlY3RvcnkuXG4gICAqIEF2YWlsYWJsZSBpbiBhY3Rpb25zIG9ubHkuXG4gICAqL1xuICBDT05GSUdfUEFUSDogJ0NPTkZJR19QQVRIJyxcblxuICAvKipcbiAgICogUGF0aCB0byB0aGUgVlMgQ29kZSB3b3Jrc3BhY2Ugcm9vdCBkaXJlY3RvcnkuXG4gICAqIFNldCBieSB0aGUgYWN0aW9uIGhhbmRsZXIgKGUuZy4sIGxhdW5jaC50cykgdG8gdGhlIHdvcmt0cmVlIHBhdGguXG4gICAqIEF2YWlsYWJsZSBpbiBob29rcyBydW5uaW5nIGluc2lkZSB0aGUgY2xhdWRlIENMSS5cbiAgICovXG4gIFdPUktTUEFDRV9QQVRIOiAnV09SS1NQQUNFX1BBVEgnLFxuXG4gIC8qKlxuICAgKiBBYnNvbHV0ZSBwYXRoIHRvIHRoZSBtYWluIGdpdCByZXBvc2l0b3J5IHJvb3QgKE5PVCBhIHdvcmt0cmVlKS5cbiAgICogU2V0IGJ5IEFjdGlvbkRpc3BhdGNoZXI7IGNvbnN1bWVkIGJ5IHRoZSB3cmFwcGVyIGFuZCB3YXRjaGVyIGZvclxuICAgKiBnaXQgb3BlcmF0aW9ucyAod29ya3RyZWUgcmVtb3ZhbCwgYnJhbmNoIGRlbGV0aW9uKSB0aGF0IG11c3QgcnVuXG4gICAqIGFnYWluc3QgdGhlIG1haW4gcmVwb3NpdG9yeS5cbiAgICovXG4gIFJFUE9fUk9PVDogJ1JFUE9fUk9PVCcsXG5cbiAgLyoqXG4gICAqIFBhdGggdG8gdGhlIGNhcmQncyByZXBvc2l0b3J5IGRpcmVjdG9yeS5cbiAgICogQXZhaWxhYmxlIGluIGFjdGlvbnMgb25seS5cbiAgICovXG4gIENBUkRfUkVQT19QQVRIOiAnQ0FSRF9SRVBPX1BBVEgnLFxuXG4gIC8qKlxuICAgKiBSZXNvbHZlZCBzaGVsbCBjb21tYW5kIGZvciB0aGUgd3JhcHBlciB0byBzcGF3biBhcyB0aGUgYWN0aW9uIGhhbmRsZXIuXG4gICAqIFNldCBieSBBY3Rpb25EaXNwYXRjaGVyOyBjb25zdW1lZCBieSB0aGUgd3JhcHBlciAobm90IGJ5IGFjdGlvbiBoYW5kbGVycykuXG4gICAqL1xuICBBQ1RJT05fQ09NTUFORDogJ0FDVElPTl9DT01NQU5EJyxcblxuICAvKipcbiAgICogR2l0IGJyYW5jaCB0aGF0IHRoZSBjYXJkJ3Mgd29ya3NwYWNlIGJyYW5jaCB3aWxsIG1lcmdlIGludG8uXG4gICAqIFJlc29sdmVkIGZyb20gdGhlIHdvcmtzcGFjZSBIRUFEIGF0IGxhdW5jaCB0aW1lLlxuICAgKiBTZXQgYnkgdGhlIGxhdW5jaCBhY3Rpb24uXG4gICAqIEF2YWlsYWJsZSBpbiBhY3Rpb25zIG9ubHkuXG4gICAqL1xuICBCQVNFX0JSQU5DSDogJ0JBU0VfQlJBTkNIJyxcblxuICAvKipcbiAgICogR2l0IGJyYW5jaCBmcm9tIHdoaWNoIHRoZSBjYXJkJ3Mgd29ya3NwYWNlIGJyYW5jaCB3YXMgY3JlYXRlZC5cbiAgICogTWF5IGRpZmZlciBmcm9tIEJBU0VfQlJBTkNIIHdoZW4gdGhlIHdvcmt0cmVlIHdhcyBjcmVhdGVkIGFnYWluc3RcbiAgICogYSBkaWZmZXJlbnQgcmVmIHRoYW4gdGhlIGN1cnJlbnQgd29ya3NwYWNlIEhFQUQuXG4gICAqIFNldCBieSB0aGUgbGF1bmNoIGFjdGlvbi5cbiAgICogQXZhaWxhYmxlIGluIGFjdGlvbnMgb25seS5cbiAgICovXG4gIFBBUkVOVF9CUkFOQ0g6ICdQQVJFTlRfQlJBTkNIJyxcblxuICAvKipcbiAgICogR2l0IGJyYW5jaCBuYW1lIGZvciB0aGUgY2FyZCdzIHdvcmtzcGFjZSBpbXBsZW1lbnRhdGlvbi5cbiAgICogU2V0IGJ5IHRoZSBsYXVuY2ggYWN0aW9uIGFmdGVyIHJlc29sdmluZyBvciBjcmVhdGluZyB0aGUgd29ya3RyZWUuXG4gICAqIEF2YWlsYWJsZSBpbiBhY3Rpb25zIG9ubHkuXG4gICAqL1xuICBXT1JLU1BBQ0VfQlJBTkNIOiAnV09SS1NQQUNFX0JSQU5DSCcsXG5cbiAgLyoqXG4gICAqIFNlc3Npb24gSUQgcGVyc2lzdGVkIGJ5IHRoZSBzZXNzaW9uLXN0YXJ0IGhvb2sgdmlhIGBwZXJzaXN0RW52VmFyYC5cbiAgICpcbiAgICogQXZhaWxhYmxlIGluIEJhc2ggdG9vbCBzaGVsbCBkZXNjZW5kYW50cyAoY29tbWFuZHMsIGdpdCBob29rcykgYWZ0ZXJcbiAgICogc2Vzc2lvbiBzdGFydC4gTk9UIGF2YWlsYWJsZSBpbiBob29rcyBzcGF3bmVkIGRpcmVjdGx5IGJ5IENsYXVkZSBDb2RlXG4gICAqIChzdG9wLCBzZXNzaW9uLWVuZCwgZXRjLikgXHUyMDE0IHRob3NlIHJlY2VpdmUgdGhlIHNlc3Npb24gSUQgdmlhIGhvb2sgaW5wdXQuXG4gICAqXG4gICAqIFRoZSBjYXJkLXJlcG8gcG9zdC1jb21taXQgaG9vayByZWFkcyB0aGlzIHRvIHJlY29yZCBjb21taXRzIGRpcmVjdGx5XG4gICAqIHdpdGhvdXQgbmVlZGluZyBhIHByb2Nlc3MtdHJlZSB3YWxrIG9yIFBJRCByZWdpc3RyeSBsb29rdXAuXG4gICAqL1xuICBDQVJEU19TRVNTSU9OX0lEOiAnQ0FSRFNfU0VTU0lPTl9JRCcsXG5cbiAgLyoqXG4gICAqIEFic29sdXRlIHBhdGggdG8gdGhlIFZTIENvZGUgZXh0ZW5zaW9uIGluc3RhbGxhdGlvbiBkaXJlY3RvcnkuXG4gICAqXG4gICAqIFNldCBieSB0aGUgZXh0ZW5zaW9uIGhvc3QgZnJvbSBgY29udGV4dC5leHRlbnNpb25VcmkuZnNQYXRoYCBhbmQgaW5qZWN0ZWRcbiAgICogaW50byBhbGwgc3Bhd25lZCBhY3Rpb24gcHJvY2Vzc2VzLiBVc2UgdGhpcyB0byBsb2NhdGUgYnVuZGxlZCBhc3NldHMgc3VjaFxuICAgKiBhcyB0aGUgcnVudGltZSBwbHVnaW4gZGlyZWN0b3J5IChgPGV4dGVuc2lvblBhdGg+L2Rpc3QvcGx1Z2lucy9ydW50aW1lYCkuXG4gICAqXG4gICAqIEF2YWlsYWJsZSBpbiBhY3Rpb25zIG9ubHkgKG5vdCB0eXBlIGhvb2tzKS5cbiAgICovXG4gIEVYVEVOU0lPTl9QQVRIOiAnRVhURU5TSU9OX1BBVEgnLFxuXG4gIC8qKlxuICAgKiBBYnNvbHV0ZSBwYXRoIHRvIHRoZSBDYXJkcyBob29rcyBsb2cgZmlsZS5cbiAgICpcbiAgICogU2V0IGJ5IEFjdGlvbkRpc3BhdGNoZXIgYXQgcnVudGltZS4gUmVhZCBieSB0aGUgTG9nZ2VyIHNpbmdsZXRvblxuICAgKiBhdCBjb25zdHJ1Y3Rpb24gdGltZSB0byBkZXRlcm1pbmUgd2hlcmUgaG9vayBleGVjdXRpb24gbG9ncyBhcmUgd3JpdHRlbi5cbiAgICpcbiAgICogQXZhaWxhYmxlIGluIGFsbCBhY3Rpb25zIGFuZCB0eXBlIGhvb2tzLlxuICAgKi9cbiAgSE9PS1NfTE9HX0ZJTEU6ICdDQVJEU19IT09LU19MT0dfRklMRSdcbn0gYXMgY29uc3Q7XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIEluZGl2aWR1YWwgR2V0dGVyc1xuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4vKipcbiAqIFJlYWRzIHRoZSBjYXJkIGlkZW50aWZpZXIgZnJvbSB0aGUgZW52aXJvbm1lbnQuXG4gKlxuICogVGhlIGV4ZWN1dGlvbiB3cmFwcGVyIGFsd2F5cyBzZXRzIHRoaXMgZm9yIGV2ZXJ5IGFjdGlvbiBhbmQgdHlwZSBob29rLlxuICogQHJldHVybnMgVGhlIGN1cnJlbnQgY2FyZCBJRFxuICogQHRocm93cyBFcnJvciBpZiBDQVJEX0lEIGlzIG1pc3Npbmcgb3IgZW1wdHlcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBjb25zdCBjYXJkSWQgPSBnZXRDYXJkSWQoKTtcbiAqIGNvbnNvbGUubG9nKGBQcm9jZXNzaW5nIGNhcmQ6ICR7Y2FyZElkfWApO1xuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRDYXJkSWQoKTogc3RyaW5nIHtcbiAgY29uc3QgdmFsdWUgPSBwcm9jZXNzLmVudltDQVJEU19FTlZfVkFSUy5DQVJEX0lEXTtcbiAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQgfHwgdmFsdWUgPT09ICcnKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIHJlcXVpcmVkIGVudmlyb25tZW50IHZhcmlhYmxlOiAke0NBUkRTX0VOVl9WQVJTLkNBUkRfSUR9YCk7XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG4vKipcbiAqIFJlYWRzIHRoZSBlbnZpcm9ubWVudCBuYW1lIGZyb20gdGhlIGVudmlyb25tZW50LlxuICpcbiAqIFRoaXMgdmFsdWUgbWF0Y2hlcyB0aGUgZW52aXJvbm1lbnQga2V5IGluIHNldHRpbmdzLmpzb24gKGUuZy4sIFwiZGVmYXVsdFwiLCBcInN0YWdpbmdcIikuXG4gKiBAcmV0dXJucyBUaGUgZW52aXJvbm1lbnQgbmFtZVxuICogQHRocm93cyBFcnJvciBpZiBFTlZJUk9OTUVOVCBpcyBtaXNzaW5nIG9yIGVtcHR5XG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogY29uc3QgZW52aXJvbm1lbnQgPSBnZXRFbnZpcm9ubWVudCgpO1xuICogY29uc29sZS5sb2coYEVudmlyb25tZW50OiAke2Vudmlyb25tZW50fWApO1xuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRFbnZpcm9ubWVudCgpOiBzdHJpbmcge1xuICBjb25zdCB2YWx1ZSA9IHByb2Nlc3MuZW52W0NBUkRTX0VOVl9WQVJTLkVOVklST05NRU5UXTtcbiAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQgfHwgdmFsdWUgPT09ICcnKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIHJlcXVpcmVkIGVudmlyb25tZW50IHZhcmlhYmxlOiAke0NBUkRTX0VOVl9WQVJTLkVOVklST05NRU5UfWApO1xuICB9XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuLyoqXG4gKiBSZWFkcyB0aGUgYWN0aW9uIGJ1dHRvbiBuYW1lIGZyb20gdGhlIGVudmlyb25tZW50LlxuICpcbiAqIFRoaXMgaXMgdGhlIGRpc3BsYXkgbmFtZSBvZiB0aGUgYWN0aW9uIHRoYXQgdHJpZ2dlcmVkIHRoZSBoYW5kbGVyLCBtYXRjaGluZ1xuICogdGhlIGBhY3Rpb25OYW1lYCBmaWVsZCBmcm9tIGBkZWZpbmVBY3Rpb25gLlxuICogQHJldHVybnMgRGlzcGxheSBuYW1lIG9mIHRoZSBhY3Rpb24gdGhhdCB0cmlnZ2VyZWQgdGhlIGN1cnJlbnQgaGFuZGxlciBydW4uXG4gKiBAdGhyb3dzIEVycm9yIGlmIEFDVElPTl9OQU1FIGlzIG1pc3Npbmcgb3IgZW1wdHlcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBjb25zdCBhY3Rpb25OYW1lID0gZ2V0QWN0aW9uTmFtZSgpO1xuICogY29uc29sZS5sb2coYFJ1bm5pbmcgYWN0aW9uOiAke2FjdGlvbk5hbWV9YCk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldEFjdGlvbk5hbWUoKTogc3RyaW5nIHtcbiAgY29uc3QgdmFsdWUgPSBwcm9jZXNzLmVudltDQVJEU19FTlZfVkFSUy5BQ1RJT05fTkFNRV07XG4gIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IHZhbHVlID09PSAnJykge1xuICAgIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyByZXF1aXJlZCBlbnZpcm9ubWVudCB2YXJpYWJsZTogJHtDQVJEU19FTlZfVkFSUy5BQ1RJT05fTkFNRX1gKTtcbiAgfVxuICByZXR1cm4gdmFsdWU7XG59XG5cbi8qKlxuICogUmVhZHMgdGhlIGV4ZWN1dGlvbiBtb2RlIGZyb20gdGhlIGVudmlyb25tZW50LlxuICpcbiAqIERldGVybWluZXMgdGhlIFVJIGludGVyYWN0aW9uIG1vZGVsIGZvciBhY3Rpb25zLlxuICogQHJldHVybnMgVGhlIGV4ZWN1dGlvbiBtb2RlICgnaW50ZXJhY3RpdmUnIG9yICdiYWNrZ3JvdW5kJylcbiAqIEB0aHJvd3MgRXJyb3IgaWYgRVhFQ1VUSU9OX01PREUgaXMgbWlzc2luZywgZW1wdHksIG9yIGludmFsaWRcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBjb25zdCBtb2RlID0gZ2V0RXhlY3V0aW9uTW9kZSgpO1xuICogaWYgKG1vZGUgPT09ICdpbnRlcmFjdGl2ZScpIHtcbiAqICAgLy8gU2hvdyB1c2VyIHByb21wdHNcbiAqIH1cbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0RXhlY3V0aW9uTW9kZSgpOiAnaW50ZXJhY3RpdmUnIHwgJ2JhY2tncm91bmQnIHtcbiAgY29uc3QgdmFsdWUgPSBwcm9jZXNzLmVudltDQVJEU19FTlZfVkFSUy5FWEVDVVRJT05fTU9ERV07XG4gIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IHZhbHVlID09PSAnJykge1xuICAgIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyByZXF1aXJlZCBlbnZpcm9ubWVudCB2YXJpYWJsZTogJHtDQVJEU19FTlZfVkFSUy5FWEVDVVRJT05fTU9ERX1gKTtcbiAgfVxuICBpZiAodmFsdWUgIT09ICdpbnRlcmFjdGl2ZScgJiYgdmFsdWUgIT09ICdiYWNrZ3JvdW5kJykge1xuICAgIHRocm93IG5ldyBFcnJvcihgSW52YWxpZCAke0NBUkRTX0VOVl9WQVJTLkVYRUNVVElPTl9NT0RFfTogZXhwZWN0ZWQgJ2ludGVyYWN0aXZlJyBvciAnYmFja2dyb3VuZCcsIGdvdCBcIiR7dmFsdWV9XCJgKTtcbiAgfVxuICByZXR1cm4gdmFsdWU7XG59XG5cbi8qKlxuICogUmVhZHMgdGhlIEFQSSBiYXNlIFVSTCBmcm9tIHRoZSBlbnZpcm9ubWVudC5cbiAqXG4gKiBVc2UgdGhpcyBhcyB0aGUgYmFzZSBmb3IgY29uc3RydWN0aW5nIEFQSSBlbmRwb2ludHMuIFRoZSBVUkwgZG9lcyBub3QgaW5jbHVkZVxuICogYSB0cmFpbGluZyBzbGFzaC5cbiAqIEByZXR1cm5zIEJhc2UgVVJMIHVzZWQgdG8gY29uc3RydWN0IENhcmRzIEFQSSBlbmRwb2ludHMgZm9yIHRoaXMgZXhlY3V0aW9uLlxuICogQHRocm93cyBFcnJvciBpZiBBUElfQkFTRV9VUkwgaXMgbWlzc2luZyBvciBlbXB0eVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGNvbnN0IGFwaVVybCA9IGdldEFwaUJhc2VVcmwoKTtcbiAqIGNvbnN0IGVuZHBvaW50ID0gYCR7YXBpVXJsfS9jYXJkcy8ke2NhcmRJZH1gO1xuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRBcGlCYXNlVXJsKCk6IHN0cmluZyB7XG4gIGNvbnN0IHZhbHVlID0gcHJvY2Vzcy5lbnZbQ0FSRFNfRU5WX1ZBUlMuQVBJX0JBU0VfVVJMXTtcbiAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQgfHwgdmFsdWUgPT09ICcnKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIHJlcXVpcmVkIGVudmlyb25tZW50IHZhcmlhYmxlOiAke0NBUkRTX0VOVl9WQVJTLkFQSV9CQVNFX1VSTH1gKTtcbiAgfVxuICByZXR1cm4gdmFsdWU7XG59XG5cbi8qKlxuICogUmVhZHMgdGhlIEFQSSBhY2Nlc3MgdG9rZW4gZnJvbSB0aGUgZW52aXJvbm1lbnQuXG4gKlxuICogQmVhcmVyIHRva2VuIHZhbGlkIGZvciB0aGUgZHVyYXRpb24gb2YgdGhpcyBhY3Rpb24gb3IgdHlwZSBob29rIGV4ZWN1dGlvbi5cbiAqIEluY2x1ZGUgaW4gQXV0aG9yaXphdGlvbiBoZWFkZXJzIHdoZW4gY2FsbGluZyB0aGUgQ2FyZHMgQVBJLlxuICogQHJldHVybnMgQmVhcmVyIHRva2VuIHRoYXQgYXV0aG9yaXplcyBBUEkgcmVxdWVzdHMgZm9yIHRoaXMgZXhlY3V0aW9uIGNvbnRleHQuXG4gKiBAdGhyb3dzIEVycm9yIGlmIEFQSV9BQ0NFU1NfVE9LRU4gaXMgbWlzc2luZyBvciBlbXB0eVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGNvbnN0IHRva2VuID0gZ2V0QXBpQWNjZXNzVG9rZW4oKTtcbiAqIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZmV0Y2goYXBpVXJsLCB7XG4gKiAgIGhlYWRlcnM6IHsgQXV0aG9yaXphdGlvbjogYEJlYXJlciAke3Rva2VufWAgfVxuICogfSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldEFwaUFjY2Vzc1Rva2VuKCk6IHN0cmluZyB7XG4gIGNvbnN0IHZhbHVlID0gcHJvY2Vzcy5lbnZbQ0FSRFNfRU5WX1ZBUlMuQVBJX0FDQ0VTU19UT0tFTl07XG4gIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IHZhbHVlID09PSAnJykge1xuICAgIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyByZXF1aXJlZCBlbnZpcm9ubWVudCB2YXJpYWJsZTogJHtDQVJEU19FTlZfVkFSUy5BUElfQUNDRVNTX1RPS0VOfWApO1xuICB9XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuLyoqXG4gKiBSZWFkcyB0aGUgY29uZmlndXJlZCBjb2RpbmcgYWdlbnQgaWRlbnRpZmllciBmcm9tIHRoZSBlbnZpcm9ubWVudC5cbiAqXG4gKiBPcHRpb25hbCB2YWx1ZSBmcm9tIGNhcmRzLmNvZGluZ0FnZW50IHNldHRpbmcuIFdoZW4gc2V0LCBpbmRpY2F0ZXMgd2hpY2ggQUlcbiAqIGNvZGluZyBhc3Npc3RhbnQgdGhlIHVzZXIgcHJlZmVycy4gQWN0aW9ucyBjYW4gdXNlIHRoaXMgdG8gY3VzdG9taXplIGJlaGF2aW9yXG4gKiBvciBwcm9tcHRzIGZvciBkaWZmZXJlbnQgYWdlbnRzLlxuICogQHJldHVybnMgVGhlIGNvZGluZyBhZ2VudCBpZGVudGlmaWVyLCBvciB1bmRlZmluZWQgaWYgbm90IHNldFxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGNvbnN0IGNvZGluZ0FnZW50ID0gZ2V0Q29kaW5nQWdlbnQoKTtcbiAqIGlmIChjb2RpbmdBZ2VudCA9PT0gJ2NsYXVkZScpIHtcbiAqICAgLy8gQ3VzdG9taXplIGZvciBDbGF1ZGVcbiAqIH1cbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0Q29kaW5nQWdlbnQoKTogc3RyaW5nIHwgdW5kZWZpbmVkIHtcbiAgY29uc3QgdmFsdWUgPSBwcm9jZXNzLmVudltDQVJEU19FTlZfVkFSUy5DT0RJTkdfQUdFTlRdO1xuICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gJycpIHtcbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuLyoqXG4gKiBSZWFkcyB0aGUgcmVnaXN0ZXJlZCB0eXBlIG5hbWUgZm9yIHR5cGUgaG9va3MuXG4gKlxuICogVGhpcyB2YWx1ZSBpcyBvbmx5IHByZXNlbnQgZm9yIHR5cGUgaG9vayBldmVudHMuXG4gKiBAcmV0dXJucyBUaGUgcmVnaXN0ZXJlZCB0eXBlIG5hbWVcbiAqIEB0aHJvd3MgRXJyb3IgaWYgVFlQRV9OQU1FIGlzIG1pc3Npbmcgb3IgZW1wdHlcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBjb25zdCB0eXBlTmFtZSA9IGdldFR5cGVOYW1lKCk7XG4gKiBjb25zb2xlLmxvZyhgVHlwZTogJHt0eXBlTmFtZX1gKTtcbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0VHlwZU5hbWUoKTogc3RyaW5nIHtcbiAgY29uc3QgdmFsdWUgPSBwcm9jZXNzLmVudltDQVJEU19FTlZfVkFSUy5UWVBFX05BTUVdO1xuICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gJycpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYE1pc3NpbmcgcmVxdWlyZWQgZW52aXJvbm1lbnQgdmFyaWFibGU6ICR7Q0FSRFNfRU5WX1ZBUlMuVFlQRV9OQU1FfWApO1xuICB9XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuLyoqXG4gKiBSZWFkcyB0aGUgdHlwZSB2ZXJzaW9uIGZyb20gdGhlIGVudmlyb25tZW50LlxuICpcbiAqIFRoaXMgdmVyc2lvbiBjb21lcyBmcm9tIHRoZSB0eXBlIGNvbmZpZ3VyYXRpb24gaW4gc2V0dGluZ3MuanNvbi5cbiAqIEByZXR1cm5zIFRoZSB2ZXJzaW9uIHN0cmluZyBmcm9tIHR5cGUgY29uZmlnXG4gKiBAdGhyb3dzIEVycm9yIGlmIFRZUEVfVkVSU0lPTiBpcyBtaXNzaW5nIG9yIGVtcHR5XG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogY29uc3QgdmVyc2lvbiA9IGdldFR5cGVWZXJzaW9uKCk7XG4gKiBjb25zb2xlLmxvZyhgVmVyc2lvbjogJHt2ZXJzaW9ufWApO1xuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRUeXBlVmVyc2lvbigpOiBzdHJpbmcge1xuICBjb25zdCB2YWx1ZSA9IHByb2Nlc3MuZW52W0NBUkRTX0VOVl9WQVJTLlRZUEVfVkVSU0lPTl07XG4gIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IHZhbHVlID09PSAnJykge1xuICAgIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyByZXF1aXJlZCBlbnZpcm9ubWVudCB2YXJpYWJsZTogJHtDQVJEU19FTlZfVkFSUy5UWVBFX1ZFUlNJT059YCk7XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG4vKipcbiAqIFJlYWRzIHRoZSB0eXBlZCBmaWxlIG5hbWUgZm9yIHR5cGUgaG9vayBldmVudHMuXG4gKlxuICogVGhpcyBpcyB0aGUgZmlsZSBuYW1lIHJlbGF0aXZlIHRvIHRoZSB0eXBlIGRpcmVjdG9yeSwgbm90IGEgZnVsbCBwYXRoLlxuICogQHJldHVybnMgVGhlIGZpbGUgbmFtZSB3aXRoaW4gdGhlIHR5cGUgZGlyZWN0b3J5XG4gKiBAdGhyb3dzIEVycm9yIGlmIEZJTEVfTkFNRSBpcyBtaXNzaW5nIG9yIGVtcHR5XG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogY29uc3QgZmlsZU5hbWUgPSBnZXRGaWxlTmFtZSgpO1xuICogY29uc29sZS5sb2coYEZpbGU6ICR7ZmlsZU5hbWV9YCk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldEZpbGVOYW1lKCk6IHN0cmluZyB7XG4gIGNvbnN0IHZhbHVlID0gcHJvY2Vzcy5lbnZbQ0FSRFNfRU5WX1ZBUlMuRklMRV9OQU1FXTtcbiAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQgfHwgdmFsdWUgPT09ICcnKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIHJlcXVpcmVkIGVudmlyb25tZW50IHZhcmlhYmxlOiAke0NBUkRTX0VOVl9WQVJTLkZJTEVfTkFNRX1gKTtcbiAgfVxuICByZXR1cm4gdmFsdWU7XG59XG5cbi8qKlxuICogUmVhZHMgdGhlIGFic29sdXRlIHBhdGggdG8gdGhlIHR5cGVkIGZpbGUuXG4gKlxuICogVGhpcyBpcyB0aGUgZnVsbHkgcmVzb2x2ZWQgcGF0aCBvbiBkaXNrIHByb3ZpZGVkIGJ5IHRoZSBleGVjdXRpb24gd3JhcHBlci5cbiAqIEByZXR1cm5zIFRoZSBmdWxsIHBhdGggdG8gdGhlIGZpbGVcbiAqIEB0aHJvd3MgRXJyb3IgaWYgRklMRV9QQVRIIGlzIG1pc3Npbmcgb3IgZW1wdHlcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBjb25zdCBmaWxlUGF0aCA9IGdldEZpbGVQYXRoKCk7XG4gKiBjb25zb2xlLmxvZyhgUGF0aDogJHtmaWxlUGF0aH1gKTtcbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0RmlsZVBhdGgoKTogc3RyaW5nIHtcbiAgY29uc3QgdmFsdWUgPSBwcm9jZXNzLmVudltDQVJEU19FTlZfVkFSUy5GSUxFX1BBVEhdO1xuICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gJycpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYE1pc3NpbmcgcmVxdWlyZWQgZW52aXJvbm1lbnQgdmFyaWFibGU6ICR7Q0FSRFNfRU5WX1ZBUlMuRklMRV9QQVRIfWApO1xuICB9XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuLyoqXG4gKiBSZWFkcyB0aGUgdHlwZWQgZmlsZSBzaXplIGZyb20gdGhlIGVudmlyb25tZW50LlxuICpcbiAqIFRoZSB2YWx1ZSBpcyBwYXJzZWQgYXMgYSBiYXNlLTEwIGludGVnZXIuXG4gKiBAcmV0dXJucyBUaGUgZmlsZSBzaXplIGluIGJ5dGVzXG4gKiBAdGhyb3dzIEVycm9yIGlmIEZJTEVfU0laRSBpcyBtaXNzaW5nIG9yIG5vdCBhIG51bWJlclxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGNvbnN0IHNpemUgPSBnZXRGaWxlU2l6ZSgpO1xuICogY29uc29sZS5sb2coYFNpemU6ICR7c2l6ZX0gYnl0ZXNgKTtcbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0RmlsZVNpemUoKTogbnVtYmVyIHtcbiAgY29uc3QgdmFsdWUgPSBwcm9jZXNzLmVudltDQVJEU19FTlZfVkFSUy5GSUxFX1NJWkVdO1xuICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gJycpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYE1pc3NpbmcgcmVxdWlyZWQgZW52aXJvbm1lbnQgdmFyaWFibGU6ICR7Q0FSRFNfRU5WX1ZBUlMuRklMRV9TSVpFfWApO1xuICB9XG4gIGNvbnN0IHNpemUgPSBOdW1iZXIucGFyc2VJbnQodmFsdWUsIDEwKTtcbiAgaWYgKE51bWJlci5pc05hTihzaXplKSkge1xuICAgIHRocm93IG5ldyBFcnJvcihgSW52YWxpZCAke0NBUkRTX0VOVl9WQVJTLkZJTEVfU0laRX06IGV4cGVjdGVkIG51bWJlciwgZ290IFwiJHt2YWx1ZX1cImApO1xuICB9XG4gIHJldHVybiBzaXplO1xufVxuXG4vKipcbiAqIFJlYWRzIHRoZSBTSEEyNTYgaGFzaCBmb3IgdGhlIHR5cGVkIGZpbGUgY29udGVudC5cbiAqXG4gKiBVc2VmdWwgZm9yIGRldGVjdGluZyBjb250ZW50IGNoYW5nZXMgd2l0aG91dCByZWFkaW5nIHRoZSBmaWxlIGFnYWluLlxuICogQHJldHVybnMgVGhlIFNIQTI1NiBoYXNoIG9mIHRoZSBjb250ZW50XG4gKiBAdGhyb3dzIEVycm9yIGlmIFNIQTI1NiBpcyBtaXNzaW5nIG9yIGVtcHR5XG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogY29uc3QgaGFzaCA9IGdldFNoYTI1NigpO1xuICogY29uc29sZS5sb2coYEhhc2g6ICR7aGFzaH1gKTtcbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0U2hhMjU2KCk6IHN0cmluZyB7XG4gIGNvbnN0IHZhbHVlID0gcHJvY2Vzcy5lbnZbQ0FSRFNfRU5WX1ZBUlMuU0hBMjU2XTtcbiAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQgfHwgdmFsdWUgPT09ICcnKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIHJlcXVpcmVkIGVudmlyb25tZW50IHZhcmlhYmxlOiAke0NBUkRTX0VOVl9WQVJTLlNIQTI1Nn1gKTtcbiAgfVxuICByZXR1cm4gdmFsdWU7XG59XG5cbi8qKlxuICogUmVhZHMgdGhlIE1JTUUgdHlwZSBmb3IgdGhlIHR5cGVkIGZpbGUgY29udGVudC5cbiAqXG4gKiBQcm92aWRlZCBmb3IgdHlwZSBob29rIGV2ZW50cyBzbyB2YWxpZGF0b3JzIGNhbiBicmFuY2ggb24gY29udGVudCB0eXBlLlxuICogQHJldHVybnMgVGhlIE1JTUUgdHlwZSBvZiB0aGUgY29udGVudFxuICogQHRocm93cyBFcnJvciBpZiBDT05URU5UX1RZUEUgaXMgbWlzc2luZyBvciBlbXB0eVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGNvbnN0IGNvbnRlbnRUeXBlID0gZ2V0Q29udGVudFR5cGUoKTtcbiAqIGNvbnNvbGUubG9nKGBDb250ZW50IHR5cGU6ICR7Y29udGVudFR5cGV9YCk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldENvbnRlbnRUeXBlKCk6IHN0cmluZyB7XG4gIGNvbnN0IHZhbHVlID0gcHJvY2Vzcy5lbnZbQ0FSRFNfRU5WX1ZBUlMuQ09OVEVOVF9UWVBFXTtcbiAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQgfHwgdmFsdWUgPT09ICcnKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIHJlcXVpcmVkIGVudmlyb25tZW50IHZhcmlhYmxlOiAke0NBUkRTX0VOVl9WQVJTLkNPTlRFTlRfVFlQRX1gKTtcbiAgfVxuICByZXR1cm4gdmFsdWU7XG59XG5cbi8qKlxuICogUmVhZHMgdGhlIFZTIENvZGUgYnVuZGxlZCBOb2RlLmpzIGludGVycHJldGVyIHBhdGggZnJvbSB0aGUgZW52aXJvbm1lbnQuXG4gKlxuICogVGhpcyBpcyBzZXQgYnkgdGhlIGV4dGVuc2lvbiBkdXJpbmcgYWN0aXZhdGlvbiBhbmQgaW5qZWN0ZWQgaW50byBhbGxcbiAqIHNwYXduZWQgYWN0aW9uL2hvb2sgcHJvY2Vzc2VzLiBDb25maWd1cmF0aW9uIGF1dGhvcnMgY2FuIHVzZSBpdCB0byBpbnZva2VcbiAqIE5vZGUuanMgd2l0aG91dCByZWx5aW5nIG9uIHRoZSBzeXN0ZW0gUEFUSC5cbiAqXG4gKiBAcmV0dXJucyBUaGUgcGF0aCB0byB0aGUgTm9kZS5qcyBpbnRlcnByZXRlclxuICogQHRocm93cyBFcnJvciBpZiBWU0NPREVfTk9ERSBpcyBtaXNzaW5nIG9yIGVtcHR5XG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogY29uc3Qgbm9kZVBhdGggPSBnZXRWc2NvZGVOb2RlUGF0aCgpO1xuICogZXhlY0ZpbGVTeW5jKG5vZGVQYXRoLCBbJ3NjcmlwdC5qcyddKTtcbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0VnNjb2RlTm9kZVBhdGgoKTogc3RyaW5nIHtcbiAgY29uc3QgdmFsdWUgPSBwcm9jZXNzLmVudltDQVJEU19FTlZfVkFSUy5WU0NPREVfTk9ERV07XG4gIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IHZhbHVlID09PSAnJykge1xuICAgIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyByZXF1aXJlZCBlbnZpcm9ubWVudCB2YXJpYWJsZTogJHtDQVJEU19FTlZfVkFSUy5WU0NPREVfTk9ERX1gKTtcbiAgfVxuICByZXR1cm4gdmFsdWU7XG59XG5cbi8qKlxuICogUmVhZHMgdGhlIFVuaXggZG9tYWluIHNvY2tldCBwYXRoIGZvciBydW50aW1lLXRvLWRpc3BhdGNoZXIgY29tbXVuaWNhdGlvbi5cbiAqXG4gKiBAcmV0dXJucyBVbml4IHNvY2tldCBwYXRoIHVzZWQgdG8gc2VuZCBydW50aW1lIGNvbnRyb2wgbWVzc2FnZXMuXG4gKiBAdGhyb3dzIEVycm9yIGlmIFNPQ0tFVF9QQVRIIGlzIG1pc3Npbmcgb3IgZW1wdHlcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldFNvY2tldFBhdGgoKTogc3RyaW5nIHtcbiAgY29uc3QgdmFsdWUgPSBwcm9jZXNzLmVudltDQVJEU19FTlZfVkFSUy5TT0NLRVRfUEFUSF07XG4gIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IHZhbHVlID09PSAnJykge1xuICAgIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyByZXF1aXJlZCBlbnZpcm9ubWVudCB2YXJpYWJsZTogJHtDQVJEU19FTlZfVkFSUy5TT0NLRVRfUEFUSH1gKTtcbiAgfVxuICByZXR1cm4gdmFsdWU7XG59XG5cbi8qKlxuICogUmVhZHMgdGhlIHBhdGggdG8gdGhlIHN3aXRjaFRvSW50ZXJhY3RpdmUgZGF0YSBmaWxlLlxuICpcbiAqIFRoaXMgaXMgb3B0aW9uYWwgXHUyMDE0IHJldHVybnMgdW5kZWZpbmVkIHdoZW4gbm90IHNldCAoaS5lLiwgdGhlIGFjdGlvblxuICogd2FzIG5vdCByZWxhdW5jaGVkIHZpYSBzd2l0Y2hUb0ludGVyYWN0aXZlKS5cbiAqXG4gKiBAcmV0dXJucyBUaGUgZmlsZSBwYXRoLCBvciB1bmRlZmluZWQgaWYgbm90IHNldFxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0U3dpdGNoVG9JbnRlcmFjdGl2ZURhdGFQYXRoKCk6IHN0cmluZyB8IHVuZGVmaW5lZCB7XG4gIGNvbnN0IHZhbHVlID0gcHJvY2Vzcy5lbnZbQ0FSRFNfRU5WX1ZBUlMuU1dJVENIX1RPX0lOVEVSQUNUSVZFX0RBVEFfUEFUSF07XG4gIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IHZhbHVlID09PSAnJykge1xuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG4vKipcbiAqIFJlYWRzIHRoZSBzZXR0aW5ncyBjb25maWd1cmF0aW9uIGRpcmVjdG9yeSBwYXRoLlxuICpcbiAqIEByZXR1cm5zIEFic29sdXRlIHBhdGggdG8gdGhlIGRpcmVjdG9yeSBjb250YWluaW5nIGdlbmVyYXRlZCBzZXR0aW5ncyBhcnRpZmFjdHMuXG4gKiBAdGhyb3dzIEVycm9yIGlmIENPTkZJR19QQVRIIGlzIG1pc3Npbmcgb3IgZW1wdHlcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldENvbmZpZ1BhdGgoKTogc3RyaW5nIHtcbiAgY29uc3QgdmFsdWUgPSBwcm9jZXNzLmVudltDQVJEU19FTlZfVkFSUy5DT05GSUdfUEFUSF07XG4gIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IHZhbHVlID09PSAnJykge1xuICAgIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyByZXF1aXJlZCBlbnZpcm9ubWVudCB2YXJpYWJsZTogJHtDQVJEU19FTlZfVkFSUy5DT05GSUdfUEFUSH1gKTtcbiAgfVxuICByZXR1cm4gdmFsdWU7XG59XG5cbi8qKlxuICogUmVhZHMgdGhlIHdvcmtzcGFjZSBwYXRoIHNldCBieSB0aGUgYWN0aW9uIGhhbmRsZXIgKGUuZy4sIHRoZSB3b3JrdHJlZSBwYXRoKS5cbiAqXG4gKiBUaGlzIGlzIGZvciBob29rcyBydW5uaW5nIGluc2lkZSB0aGUgQ2xhdWRlIENMSSwgKipub3QqKiBmb3IgYWN0aW9uIGhhbmRsZXJzLlxuICogQWN0aW9uIGhhbmRsZXJzIHNob3VsZCB1c2Uge0BsaW5rIGdldFJlcG9Sb290fSBpbnN0ZWFkLlxuICpcbiAqIEByZXR1cm5zIEFic29sdXRlIHBhdGggdG8gdGhlIGFjdGl2ZSB3b3Jrc3BhY2UgLyB3b3JrdHJlZS5cbiAqIEB0aHJvd3MgRXJyb3IgaWYgV09SS1NQQUNFX1BBVEggaXMgbWlzc2luZyBvciBlbXB0eVxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0V29ya3NwYWNlUGF0aCgpOiBzdHJpbmcge1xuICBjb25zdCB2YWx1ZSA9IHByb2Nlc3MuZW52W0NBUkRTX0VOVl9WQVJTLldPUktTUEFDRV9QQVRIXTtcbiAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQgfHwgdmFsdWUgPT09ICcnKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIHJlcXVpcmVkIGVudmlyb25tZW50IHZhcmlhYmxlOiAke0NBUkRTX0VOVl9WQVJTLldPUktTUEFDRV9QQVRIfWApO1xuICB9XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuLyoqXG4gKiBSZWFkcyB0aGUgbWFpbiBnaXQgcmVwb3NpdG9yeSByb290IHBhdGguXG4gKlxuICogU2V0IGJ5IEFjdGlvbkRpc3BhdGNoZXI7IHVzZWQgYnkgYWN0aW9uIGhhbmRsZXJzIHRvIHJlc29sdmUgd29ya3RyZWVzXG4gKiBhbmQgcGVyZm9ybSBnaXQgb3BlcmF0aW9ucyBhZ2FpbnN0IHRoZSBtYWluIHJlcG9zaXRvcnkuXG4gKlxuICogQHJldHVybnMgQWJzb2x1dGUgcGF0aCB0byB0aGUgbWFpbiBnaXQgcmVwb3NpdG9yeSByb290IChOT1QgYSB3b3JrdHJlZSkuXG4gKiBAdGhyb3dzIEVycm9yIGlmIFJFUE9fUk9PVCBpcyBtaXNzaW5nIG9yIGVtcHR5XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRSZXBvUm9vdCgpOiBzdHJpbmcge1xuICBjb25zdCB2YWx1ZSA9IHByb2Nlc3MuZW52W0NBUkRTX0VOVl9WQVJTLlJFUE9fUk9PVF07XG4gIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IHZhbHVlID09PSAnJykge1xuICAgIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyByZXF1aXJlZCBlbnZpcm9ubWVudCB2YXJpYWJsZTogJHtDQVJEU19FTlZfVkFSUy5SRVBPX1JPT1R9YCk7XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG4vKipcbiAqIFJlYWRzIHRoZSBjYXJkJ3MgcmVwb3NpdG9yeSBkaXJlY3RvcnkgcGF0aC5cbiAqXG4gKiBAcmV0dXJucyBBYnNvbHV0ZSBwYXRoIHRvIHRoZSByZXBvc2l0b3J5IGFzc29jaWF0ZWQgd2l0aCB0aGUgYWN0aXZlIGNhcmQuXG4gKiBAdGhyb3dzIEVycm9yIGlmIENBUkRfUkVQT19QQVRIIGlzIG1pc3Npbmcgb3IgZW1wdHlcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldENhcmRSZXBvUGF0aCgpOiBzdHJpbmcge1xuICBjb25zdCB2YWx1ZSA9IHByb2Nlc3MuZW52W0NBUkRTX0VOVl9WQVJTLkNBUkRfUkVQT19QQVRIXTtcbiAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQgfHwgdmFsdWUgPT09ICcnKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIHJlcXVpcmVkIGVudmlyb25tZW50IHZhcmlhYmxlOiAke0NBUkRTX0VOVl9WQVJTLkNBUkRfUkVQT19QQVRIfWApO1xuICB9XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuLyoqXG4gKiBSZWFkcyB0aGUgVlMgQ29kZSBleHRlbnNpb24gaW5zdGFsbGF0aW9uIGRpcmVjdG9yeSBwYXRoLlxuICpcbiAqIFNldCBieSB0aGUgZXh0ZW5zaW9uIGhvc3QgZnJvbSBgY29udGV4dC5leHRlbnNpb25VcmkuZnNQYXRoYCBhbmQgaW5qZWN0ZWRcbiAqIGludG8gYWxsIHNwYXduZWQgYWN0aW9uIHByb2Nlc3Nlcy4gVXNlIHRoaXMgdG8gbG9jYXRlIGJ1bmRsZWQgYXNzZXRzIHN1Y2hcbiAqIGFzIHRoZSBydW50aW1lIHBsdWdpbiBkaXJlY3RvcnkgKGA8ZXh0ZW5zaW9uUGF0aD4vZGlzdC9wbHVnaW5zL3J1bnRpbWVgKS5cbiAqXG4gKiBAcmV0dXJucyBBYnNvbHV0ZSBwYXRoIHRvIHRoZSBleHRlbnNpb24gaW5zdGFsbGF0aW9uIGRpcmVjdG9yeS5cbiAqIEB0aHJvd3MgRXJyb3IgaWYgRVhURU5TSU9OX1BBVEggaXMgbWlzc2luZyBvciBlbXB0eVxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0RXh0ZW5zaW9uUGF0aCgpOiBzdHJpbmcge1xuICBjb25zdCB2YWx1ZSA9IHByb2Nlc3MuZW52W0NBUkRTX0VOVl9WQVJTLkVYVEVOU0lPTl9QQVRIXTtcbiAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQgfHwgdmFsdWUgPT09ICcnKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIHJlcXVpcmVkIGVudmlyb25tZW50IHZhcmlhYmxlOiAke0NBUkRTX0VOVl9WQVJTLkVYVEVOU0lPTl9QQVRIfWApO1xuICB9XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuLyoqXG4gKiBSZWFkcyBhbmQgcGFyc2VzIHRoZSBzd2l0Y2hUb0ludGVyYWN0aXZlIGRhdGEgZmlsZS5cbiAqXG4gKiBXaGVuIGBTV0lUQ0hfVE9fSU5URVJBQ1RJVkVfREFUQV9QQVRIYCBpcyBzZXQsIHJlYWRzIHRoZSBmaWxlIGF0IHRoYXQgcGF0aFxuICogYW5kIHBhcnNlcyBpdCBhcyBKU09OLiBSZXR1cm5zIHVuZGVmaW5lZCBpZiB0aGUgZW52IHZhciBpcyBub3Qgc2V0LlxuICpcbiAqIEByZXR1cm5zIFRoZSBwYXJzZWQgZGF0YSwgb3IgdW5kZWZpbmVkIGlmIHRoZSBwYXRoIGlzIG5vdCBzZXRcbiAqIEB0aHJvd3MgRXJyb3IgaWYgdGhlIGZpbGUgY2Fubm90IGJlIHJlYWQgb3IgY29udGFpbnMgaW52YWxpZCBKU09OXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiByZWFkU3dpdGNoVG9JbnRlcmFjdGl2ZURhdGEoKTogdW5rbm93biB8IHVuZGVmaW5lZCB7XG4gIGNvbnN0IGRhdGFQYXRoID0gZ2V0U3dpdGNoVG9JbnRlcmFjdGl2ZURhdGFQYXRoKCk7XG4gIGlmIChkYXRhUGF0aCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfVxuICBjb25zdCBjb250ZW50ID0gcmVhZEZpbGVTeW5jKGRhdGFQYXRoLCAndXRmLTgnKTtcbiAgcmV0dXJuIEpTT04ucGFyc2UoY29udGVudCk7XG59XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIFR5cGVkIElucHV0IEV4dHJhY3Rpb25cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuLyoqXG4gKiBCdWlsZHMgYSB0eXBlZCBhY3Rpb24gaW5wdXQgb2JqZWN0IGZyb20gZW52aXJvbm1lbnQgdmFyaWFibGVzLlxuICpcbiAqIEV4dHJhY3RzIGFsbCBmaWVsZHMgcmVxdWlyZWQgZm9yIGFjdGlvbiBoYW5kbGVycy5cbiAqXG4gKiBAcmV0dXJucyBUeXBlZCBBY3Rpb25JbnB1dCBvYmplY3RcbiAqIEB0aHJvd3MgRXJyb3IgaWYgcmVxdWlyZWQgZW52IHZhcnMgYXJlIG1pc3Npbmcgb3IgaW52YWxpZFxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIC8vIEZvciBhbiBhY3Rpb24gaGFuZGxlclxuICogY29uc3QgaW5wdXQgPSBleHRyYWN0QWN0aW9uSW5wdXQoKTtcbiAqIGNvbnNvbGUubG9nKGlucHV0LmNhcmRJZCk7XG4gKiBjb25zb2xlLmxvZyhpbnB1dC5leGVjdXRpb25Nb2RlKTtcbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gZXh0cmFjdEFjdGlvbklucHV0KCk6IEFjdGlvbklucHV0IHtcbiAgcmV0dXJuIHtcbiAgICBjYXJkSWQ6IGdldENhcmRJZCgpLFxuICAgIGFjdGlvbk5hbWU6IGdldEFjdGlvbk5hbWUoKSxcbiAgICBlbnZpcm9ubWVudDogZ2V0RW52aXJvbm1lbnQoKSxcbiAgICBleGVjdXRpb25Nb2RlOiBnZXRFeGVjdXRpb25Nb2RlKCksXG4gICAgYXBpQmFzZVVybDogZ2V0QXBpQmFzZVVybCgpLFxuICAgIGFwaUFjY2Vzc1Rva2VuOiBnZXRBcGlBY2Nlc3NUb2tlbigpLFxuICAgIGNvZGluZ0FnZW50OiBnZXRDb2RpbmdBZ2VudCgpLFxuICAgIHN3aXRjaFRvSW50ZXJhY3RpdmVEYXRhOiByZWFkU3dpdGNoVG9JbnRlcmFjdGl2ZURhdGEoKSxcbiAgICByZXBvUm9vdDogZ2V0UmVwb1Jvb3QoKSxcbiAgICBjYXJkUmVwb1BhdGg6IGdldENhcmRSZXBvUGF0aCgpLFxuICAgIGNvbmZpZ1BhdGg6IGdldENvbmZpZ1BhdGgoKSxcbiAgICBleHRlbnNpb25QYXRoOiBnZXRFeHRlbnNpb25QYXRoKClcbiAgfTtcbn1cblxuLyoqXG4gKiBCdWlsZHMgYSB0eXBlZCB0eXBlIGhvb2sgaW5wdXQgb2JqZWN0IGZyb20gZW52aXJvbm1lbnQgdmFyaWFibGVzLlxuICpcbiAqIEV4dHJhY3RzIGFsbCBmaWVsZHMgcmVxdWlyZWQgZm9yIHR5cGUgbGlmZWN5Y2xlIGhvb2tzICh2YWxpZGF0b3IsIGNyZWF0ZSxcbiAqIHVwZGF0ZSwgZGVsZXRlKS5cbiAqXG4gKiBAcmV0dXJucyBUeXBlZCBUeXBlSG9va0lucHV0IG9iamVjdFxuICogQHRocm93cyBFcnJvciBpZiByZXF1aXJlZCBlbnYgdmFycyBhcmUgbWlzc2luZyBvciBpbnZhbGlkXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogLy8gRm9yIGEgdHlwZSBob29rIGhhbmRsZXJcbiAqIGNvbnN0IGlucHV0ID0gZXh0cmFjdFR5cGVJbnB1dCgpO1xuICogY29uc29sZS5sb2coaW5wdXQudHlwZU5hbWUpO1xuICogY29uc29sZS5sb2coaW5wdXQuZmlsZU5hbWUpO1xuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBleHRyYWN0VHlwZUlucHV0KCk6IFR5cGVIb29rSW5wdXQge1xuICByZXR1cm4ge1xuICAgIGNhcmRJZDogZ2V0Q2FyZElkKCksXG4gICAgZW52aXJvbm1lbnQ6IGdldEVudmlyb25tZW50KCksXG4gICAgdHlwZU5hbWU6IGdldFR5cGVOYW1lKCksXG4gICAgdHlwZVZlcnNpb246IGdldFR5cGVWZXJzaW9uKCksXG4gICAgZmlsZU5hbWU6IGdldEZpbGVOYW1lKCksXG4gICAgZmlsZVBhdGg6IGdldEZpbGVQYXRoKCksXG4gICAgZmlsZVNpemU6IGdldEZpbGVTaXplKCksXG4gICAgZmlsZVNoYTI1NjogZ2V0U2hhMjU2KCksXG4gICAgY29udGVudFR5cGU6IGdldENvbnRlbnRUeXBlKCksXG4gICAgYXBpQmFzZVVybDogZ2V0QXBpQmFzZVVybCgpLFxuICAgIGFwaUFjY2Vzc1Rva2VuOiBnZXRBcGlBY2Nlc3NUb2tlbigpXG4gIH07XG59XG4iLCAiLyoqXG4gKiBFeGl0IGNvZGUgY29uc3RhbnRzIGFuZCBoZWxwZXJzIGZvciBDYXJkcyBFeHRlbnNpb24gaG9va3MuXG4gKlxuICogQ2FyZHMgaG9va3MgY29tbXVuaWNhdGUgc3VjY2VzcyBhbmQgZmFpbHVyZSB2aWEgcHJvY2VzcyBleGl0IGNvZGVzIGFuZFxuICogc3RkZXJyIG91dHB1dC4gVGhpcyBtb2R1bGUgY2VudHJhbGl6ZXMgdGhvc2UgY29udmVudGlvbnMgc28gdGhlIHJ1bnRpbWVcbiAqIGFuZCBob29rcyBzcGVhayB0aGUgc2FtZSBwcm90b2NvbC5cbiAqXG4gKiBAc3VtbWFyeSBFeGl0IGNvZGUgY29uc3RhbnRzIGFuZCBoZWxwZXJzIGZvciBDYXJkcyBFeHRlbnNpb24gaG9va3NcbiAqIEBtb2R1bGVcbiAqL1xuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBFeGl0IENvZGUgQ29uc3RhbnRzXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbi8qKlxuICogRXhpdCBjb2RlcyB1c2VkIGJ5IENhcmRzIGhvb2tzLlxuICpcbiAqIFRoZSBDYXJkcyBydW50aW1lIGludGVycHJldHMgYW55IG5vbi16ZXJvIGV4aXQgY29kZSBhcyBmYWlsdXJlLlxuICovXG5leHBvcnQgY29uc3QgRVhJVF9DT0RFUyA9IHtcbiAgLyoqIEhhbmRsZXIgY29tcGxldGVkIHN1Y2Nlc3NmdWxseS4gKi9cbiAgU1VDQ0VTUzogMCxcbiAgLyoqIEhhbmRsZXIgdGhyZXcgYW4gZXJyb3IuICovXG4gIEVSUk9SOiAxLFxuICAvKiogSGFuZGxlciBwcm9jZXNzZWQgc3dpdGNoVG9JbnRlcmFjdGl2ZSBhbmQgaXMgZXhpdGluZyBmb3IgcmVsYXVuY2guICovXG4gIFNXSVRDSF9UT19JTlRFUkFDVElWRTogNDJcbn0gYXMgY29uc3Q7XG5cbi8qKlxuICogVW5pb24gb2YgdmFsaWQgQ2FyZHMgaG9vayBleGl0IGNvZGVzLlxuICovXG5leHBvcnQgdHlwZSBFeGl0Q29kZSA9ICh0eXBlb2YgRVhJVF9DT0RFUylba2V5b2YgdHlwZW9mIEVYSVRfQ09ERVNdO1xuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBFcnJvciBPdXRwdXQgSGVscGVyc1xuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4vKipcbiAqIFdyaXRlcyBhbiBlcnJvciBtZXNzYWdlIHRvIHN0ZGVyciB3aXRoIGEgdHJhaWxpbmcgbmV3bGluZS5cbiAqXG4gKiBVc2UgdGhpcyB3aGVuIGEgaG9vayBuZWVkcyB0byByZXBvcnQgYSBmYWlsdXJlIHdpdGhvdXQgcG9sbHV0aW5nIHN0ZG91dC5cbiAqIEBwYXJhbSBtZXNzYWdlIC0gRXJyb3IgbWVzc2FnZSB0byB3cml0ZVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIHdyaXRlRXJyb3IoJ0ZhaWxlZCB0byBjb25uZWN0IHRvIGRhdGFiYXNlJyk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHdyaXRlRXJyb3IobWVzc2FnZTogc3RyaW5nKTogdm9pZCB7XG4gIHByb2Nlc3Muc3RkZXJyLndyaXRlKGAke21lc3NhZ2V9XFxuYCk7XG59XG5cbi8qKlxuICogV3JpdGVzIGFuIGVycm9yIG1lc3NhZ2UgdG8gc3RkZXJyIGFuZCBleGl0cyB3aXRoIEVSUk9SIGNvZGUuXG4gKlxuICogVGhpcyB0ZXJtaW5hdGVzIHRoZSBwcm9jZXNzIGltbWVkaWF0ZWx5LCBzbyBhbnkgcGVuZGluZyBhc3luYyB3b3JrIHdpbGxcbiAqIG5vdCBmaW5pc2ggdW5sZXNzIGl0IHdhcyBhbHJlYWR5IGF3YWl0ZWQuXG4gKiBAcGFyYW0gbWVzc2FnZSAtIEVycm9yIG1lc3NhZ2UgdG8gd3JpdGUgYmVmb3JlIGV4aXRpbmdcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBpZiAoIWlzVmFsaWQpIHtcbiAqICAgZXhpdFdpdGhFcnJvcignSW52YWxpZCBjb25maWd1cmF0aW9uJyk7XG4gKiB9XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGV4aXRXaXRoRXJyb3IobWVzc2FnZTogc3RyaW5nKTogbmV2ZXIge1xuICB3cml0ZUVycm9yKG1lc3NhZ2UpO1xuICBwcm9jZXNzLmV4aXQoRVhJVF9DT0RFUy5FUlJPUik7XG59XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIEludGVybmFsIFJlc3VsdCBUcmFja2luZ1xuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4vKipcbiAqIEludGVybmFsIHJ1bnRpbWUgYm9va2tlZXBpbmcgZm9yIGhvb2sgZXhlY3V0aW9uIHJlc3VsdHMuXG4gKlxuICogVGhpcyBzdHJ1Y3R1cmUgYWxsb3dzIHRoZSBydW50aW1lIHRvIGNhcnJ5IGVycm9yIGRldGFpbHMgd2l0aG91dCBjaGFuZ2luZ1xuICogdGhlIGV4aXQtY29kZSBwcm90b2NvbC5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBIb29rRXhlY3V0aW9uUmVzdWx0IHtcbiAgLyoqIFdoZXRoZXIgdGhlIGhvb2sgZXhlY3V0ZWQgc3VjY2Vzc2Z1bGx5LiAqL1xuICBzdWNjZXNzOiBib29sZWFuO1xuICAvKiogVGhlIGV4aXQgY29kZSB0byB1c2Ugd2hlbiBleGl0aW5nLiAqL1xuICBleGl0Q29kZTogRXhpdENvZGU7XG4gIC8qKiBUaGUgZXJyb3IgdGhhdCBvY2N1cnJlZCwgaWYgYW55LiAqL1xuICBlcnJvcj86IEVycm9yO1xufVxuIiwgIi8qKlxuICogU3RydWN0dXJlZCBsb2dnaW5nIGZvciBDYXJkcyBFeHRlbnNpb24gaG9va3MuXG4gKlxuICogT3V0cHV0IGlzIG9wdC1pbjogdGhlIGxvZ2dlciBvbmx5IGVtaXRzIHRvIHJlZ2lzdGVyZWQgaGFuZGxlcnMgb3IgYVxuICogY29uZmlndXJlZCBsb2cgZmlsZS4gSWYgeW91IGNvbmZpZ3VyZSBub3RoaW5nLCB0aGUgbG9nZ2VyIHBvbGl0ZWx5IHNheXNcbiAqIG5vdGhpbmcgYXQgYWxsLiBJdCBuZXZlciB3cml0ZXMgdG8gc3Rkb3V0IGFuZCBhdm9pZHMgc3RkZXJyIHRvIGtlZXAgaG9va1xuICogcHJvdG9jb2xzIGNsZWFuLlxuICpcbiAqIEBzdW1tYXJ5IFN0cnVjdHVyZWQgbG9nZ2luZyBmb3IgQ2FyZHMgRXh0ZW5zaW9uIGhvb2tzXG4gKiBAbW9kdWxlXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogaW1wb3J0IHsgbG9nZ2VyIH0gZnJvbSAnQGNhcmRzL3Nkay9jb25maWcnO1xuICpcbiAqIC8vIFN1YnNjcmliZSB0byBsb2cgZXZlbnRzXG4gKiBjb25zdCB1bnN1YnNjcmliZSA9IGxvZ2dlci5vbignZXJyb3InLCAoZXZlbnQpID0+IHtcbiAqICAgY29uc29sZS5lcnJvcihgRXJyb3IgaW4gJHtldmVudC5ob29rVHlwZX06ICR7ZXZlbnQubWVzc2FnZX1gKTtcbiAqIH0pO1xuICpcbiAqIC8vIExhdGVyLCBjbGVhbiB1cFxuICogdW5zdWJzY3JpYmUoKTtcbiAqIGBgYFxuICovXG5cbmltcG9ydCB7IGNsb3NlU3luYywgZXhpc3RzU3luYywgbWtkaXJTeW5jLCBvcGVuU3luYywgd3JpdGVTeW5jIH0gZnJvbSAnbm9kZTpmcyc7XG5pbXBvcnQgeyBkaXJuYW1lIH0gZnJvbSAnbm9kZTpwYXRoJztcblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gTG9nIExldmVsIFR5cGVzXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbi8qKlxuICogQXZhaWxhYmxlIGxvZyBsZXZlbHMuXG4gKlxuICogfCBMZXZlbCB8IFNldmVyaXR5IHwgVXNlIENhc2UgfFxuICogfC0tLS0tLS18LS0tLS0tLS0tLXwtLS0tLS0tLS0tfFxuICogfCBgZGVidWdgIHwgTG93ZXN0IHwgRGV0YWlsZWQgZGVidWdnaW5nIGluZm9ybWF0aW9uIHxcbiAqIHwgYGluZm9gIHwgTG93IHwgR2VuZXJhbCBvcGVyYXRpb25hbCBldmVudHMgfFxuICogfCBgd2FybmAgfCBNZWRpdW0gfCBXYXJuaW5nIGNvbmRpdGlvbnMgdGhhdCBtYXkgaW5kaWNhdGUgaXNzdWVzIHxcbiAqIHwgYGVycm9yYCB8IEhpZ2ggfCBFcnJvciBjb25kaXRpb25zIHJlcXVpcmluZyBhdHRlbnRpb24gfFxuICovXG5leHBvcnQgdHlwZSBMb2dMZXZlbCA9ICdkZWJ1ZycgfCAnaW5mbycgfCAnd2FybicgfCAnZXJyb3InO1xuXG4vKipcbiAqIEFsbCBsb2cgbGV2ZWxzIGluIG9yZGVyIG9mIHNldmVyaXR5IChsb3dlc3QgdG8gaGlnaGVzdCkuXG4gKi9cbmV4cG9ydCBjb25zdCBMT0dfTEVWRUxTID0gWydkZWJ1ZycsICdpbmZvJywgJ3dhcm4nLCAnZXJyb3InXSBhcyBjb25zdCBzYXRpc2ZpZXMgcmVhZG9ubHkgTG9nTGV2ZWxbXTtcblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gTG9nIEV2ZW50IFR5cGVcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuLyoqXG4gKiBTdHJ1Y3R1cmVkIGxvZyBldmVudCBlbWl0dGVkIGJ5IHRoZSBsb2dnZXIuXG4gKlxuICogRXZlbnRzIGluY2x1ZGUgY29udGV4dHVhbCBkZXRhaWxzIGFib3V0IGhvb2sgZXhlY3V0aW9uIGFuZCBhcmUgc3VpdGFibGUgZm9yXG4gKiBkZWJ1Z2dpbmcsIG1vbml0b3JpbmcsIGFuZCBhbmFseXRpY3MgcGlwZWxpbmVzLlxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIC8vIEV4YW1wbGUgbG9nIGV2ZW50XG4gKiBjb25zdCBldmVudDogTG9nRXZlbnQgPSB7XG4gKiAgIHRpbWVzdGFtcDogJzIwMjQtMDEtMTVUMTA6MzA6MDAuMDAwWicsXG4gKiAgIGxldmVsOiAnd2FybicsXG4gKiAgIGhvb2tUeXBlOiAnYWN0aW9uLXN0YXJ0JyxcbiAqICAgbWVzc2FnZTogJ0NhcmQgc3RhcnRlZCcsXG4gKiAgIGlucHV0OiB7IGNhcmRJZDogJ2NhcmQtMTIzJyB9XG4gKiB9O1xuICogYGBgXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgTG9nRXZlbnQge1xuICAvKipcbiAgICogSVNPIDg2MDEgdGltZXN0YW1wIG9mIHdoZW4gdGhlIGV2ZW50IG9jY3VycmVkLlxuICAgKiBAZXhhbXBsZSAnMjAyNC0wMS0xNVQxMDozMDowMC4wMDBaJ1xuICAgKi9cbiAgdGltZXN0YW1wOiBzdHJpbmc7XG5cbiAgLyoqXG4gICAqIFNldmVyaXR5IGxldmVsIG9mIHRoZSBsb2cgZXZlbnQuXG4gICAqL1xuICBsZXZlbDogTG9nTGV2ZWw7XG5cbiAgLyoqXG4gICAqIFR5cGUgb2YgaG9vayB0aGF0IGdlbmVyYXRlZCB0aGlzIGV2ZW50LlxuICAgKiBNYXkgYmUgdW5kZWZpbmVkIGZvciBldmVudHMgb3V0c2lkZSBob29rIGNvbnRleHQuXG4gICAqL1xuICBob29rVHlwZT86IHN0cmluZztcblxuICAvKipcbiAgICogSHVtYW4tcmVhZGFibGUgZGVzY3JpcHRpb24gb2Ygd2hhdCBoYXBwZW5lZC5cbiAgICovXG4gIG1lc3NhZ2U6IHN0cmluZztcblxuICAvKipcbiAgICogSG9vayBpbnB1dCBkYXRhIGF0IHRoZSB0aW1lIG9mIGxvZ2dpbmcuXG4gICAqXG4gICAqIFRoaXMgaXMgcGFydGlhbCBieSBkZXNpZ24sIHNvIHlvdSBjYW4gYXZvaWQgbG9nZ2luZyBsYXJnZSBvciBzZW5zaXRpdmVcbiAgICogcGF5bG9hZHMgd2hpbGUgc3RpbGwgY2FwdHVyaW5nIGtleSBpZGVudGlmaWVycy5cbiAgICovXG4gIGlucHV0PzogUmVjb3JkPHN0cmluZywgdW5rbm93bj47XG5cbiAgLyoqXG4gICAqIEVycm9yIGluZm9ybWF0aW9uIGlmIHRoaXMgZXZlbnQgcmVwcmVzZW50cyBhbiBlcnJvci5cbiAgICogQ29udGFpbnMgc3RydWN0dXJlZCBlcnJvciBkZXRhaWxzIGZvciBhbmFseXNpcy5cbiAgICovXG4gIGVycm9yPzogTG9nRXZlbnRFcnJvcjtcblxuICAvKipcbiAgICogQWRkaXRpb25hbCBjb250ZXh0IGRhdGEgcHJvdmlkZWQgYnkgdGhlIGNhbGxlci5cbiAgICpcbiAgICogVXNlIHRoaXMgZm9yIHN0cnVjdHVyZWQgbWV0YWRhdGEgdGhhdCB5b3Ugd2FudCBkb3duc3RyZWFtIGhhbmRsZXJzXG4gICAqIHRvIHJlY2VpdmUgKGUuZy4sIHJlcXVlc3QgSURzLCB0aW1pbmcgZGF0YSkuXG4gICAqL1xuICBjb250ZXh0PzogUmVjb3JkPHN0cmluZywgdW5rbm93bj47XG59XG5cbi8qKlxuICogU3RydWN0dXJlZCBlcnJvciBpbmZvcm1hdGlvbiB3aXRoaW4gYSBsb2cgZXZlbnQuXG4gKlxuICogRXJyb3JzIGFyZSBub3JtYWxpemVkIHNvIGhhbmRsZXJzIGNhbiBkZXBlbmQgb24gY29uc2lzdGVudCBzaGFwZSwgZXZlbiB3aGVuXG4gKiBjYWxsZXJzIHRocm93IG5vbi1FcnJvciB2YWx1ZXMuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgTG9nRXZlbnRFcnJvciB7XG4gIC8qKlxuICAgKiBFcnJvciBuYW1lIChlLmcuLCAnVHlwZUVycm9yJywgJ1ZhbGlkYXRpb25FcnJvcicpLlxuICAgKi9cbiAgbmFtZTogc3RyaW5nO1xuXG4gIC8qKlxuICAgKiBFcnJvciBtZXNzYWdlIGRlc2NyaWJpbmcgd2hhdCB3ZW50IHdyb25nLlxuICAgKi9cbiAgbWVzc2FnZTogc3RyaW5nO1xuXG4gIC8qKlxuICAgKiBTdGFjayB0cmFjZSBpZiBhdmFpbGFibGUuXG4gICAqL1xuICBzdGFjaz86IHN0cmluZztcblxuICAvKipcbiAgICogRXJyb3IgY2F1c2UgY2hhaW4gaWYgdGhlIGVycm9yIHdhcyB3cmFwcGVkLlxuICAgKi9cbiAgY2F1c2U/OiBMb2dFdmVudEVycm9yO1xufVxuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBFdmVudCBIYW5kbGVyIFR5cGVcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuLyoqXG4gKiBIYW5kbGVyIGludm9rZWQgd2hlbiBhIGxvZyBldmVudCBpcyBlbWl0dGVkLlxuICpcbiAqIEhhbmRsZXJzIHJ1biBzeW5jaHJvbm91c2x5LiBFcnJvcnMgdGhyb3duIGJ5IGEgaGFuZGxlciBhcmUgc3dhbGxvd2VkIHNvXG4gKiBsb2dnaW5nIGNhbm5vdCBicmVhayBob29rIGV4ZWN1dGlvbi5cbiAqIEBwYXJhbSBldmVudCAtIFRoZSBsb2cgZXZlbnQgdG8gaGFuZGxlXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogLy8gRm9yd2FyZCB0byBleHRlcm5hbCBsb2dnaW5nIHNlcnZpY2VcbiAqIGNvbnN0IGhhbmRsZXI6IExvZ0V2ZW50SGFuZGxlciA9IChldmVudCkgPT4ge1xuICogICBleHRlcm5hbExvZ2dlci5sb2coe1xuICogICAgIGxldmVsOiBldmVudC5sZXZlbCxcbiAqICAgICBtZXNzYWdlOiBldmVudC5tZXNzYWdlLFxuICogICAgIG1ldGFkYXRhOiB7IGhvb2tUeXBlOiBldmVudC5ob29rVHlwZSB9XG4gKiAgIH0pO1xuICogfTtcbiAqIGBgYFxuICovXG5leHBvcnQgdHlwZSBMb2dFdmVudEhhbmRsZXIgPSAoZXZlbnQ6IExvZ0V2ZW50KSA9PiB2b2lkO1xuXG4vKipcbiAqIEZ1bmN0aW9uIHRvIHVuc3Vic2NyaWJlIGEgbG9nIGV2ZW50IGhhbmRsZXIuXG4gKlxuICogQ2FsbCB0aGlzIGZ1bmN0aW9uIHRvIHN0b3AgcmVjZWl2aW5nIGxvZyBldmVudHMuIEFsd2F5cyBjYWxsIHVuc3Vic2NyaWJlXG4gKiB3aGVuIHRoZSBoYW5kbGVyIGlzIG5vIGxvbmdlciBuZWVkZWQgdG8gcHJldmVudCBtZW1vcnkgbGVha3MuXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogY29uc3QgdW5zdWJzY3JpYmUgPSBsb2dnZXIub24oJ2Vycm9yJywgaGFuZGxlRXJyb3IpO1xuICogLy8gLi4uIGxhdGVyXG4gKiB1bnN1YnNjcmliZSgpOyAvLyBTdG9wIHJlY2VpdmluZyBldmVudHNcbiAqIGBgYFxuICovXG5leHBvcnQgdHlwZSBVbnN1YnNjcmliZSA9ICgpID0+IHZvaWQ7XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIExvZ2dlciBDb25maWd1cmF0aW9uXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbi8qKlxuICogQ29uZmlndXJhdGlvbiBvcHRpb25zIGZvciB0aGUgTG9nZ2VyLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIExvZ2dlckNvbmZpZyB7XG4gIC8qKlxuICAgKiBQYXRoIHRvIHRoZSBsb2cgZmlsZSBmb3IgSlNPTiBMaW5lcyBvdXRwdXQuXG4gICAqXG4gICAqIElmIG5vdCBzZXQsIGZpbGUgbG9nZ2luZyBpcyBkaXNhYmxlZC4gQ2FuIGFsc28gYmUgc2V0IHZpYSB0aGVcbiAgICogYENBUkRTX0hPT0tTX0xPR19GSUxFYCBlbnZpcm9ubWVudCB2YXJpYWJsZS5cbiAgICovXG4gIGxvZ0ZpbGVQYXRoPzogc3RyaW5nO1xufVxuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBMb2dnZXIgSW50ZXJmYWNlIChmb3IgdGVzdGluZyBhbmQgdHlwZSBjb21wYXRpYmlsaXR5KVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4vKipcbiAqIExvZ2dlciBpbnRlcmZhY2UgZm9yIHN0cnVjdHVyZWQsIGNvbnRleHQtYXdhcmUgbG9nZ2luZy5cbiAqXG4gKiBUaGlzIGludGVyZmFjZSBkZWZpbmVzIHRoZSBwdWJsaWMgQVBJIG9mIHRoZSBMb2dnZXIgY2xhc3MuIEl0IGV4aXN0c1xuICogcHJpbWFyaWx5IGZvciB0eXBlIGNvbXBhdGliaWxpdHkgYW5kIHRlc3RpbmcgcHVycG9zZXMsIGFsbG93aW5nIHRlc3RzXG4gKiB0byBtb2NrIHRoZSBsb2dnZXIgd2l0aG91dCBuZWVkaW5nIHRvIGltcGxlbWVudCBhbGwgaW50ZXJuYWwgbWV0aG9kcy5cbiAqXG4gKiBGb3IgcHJvZHVjdGlvbiB1c2UsIHVzZSB0aGUge0BsaW5rIExvZ2dlcn0gY2xhc3Mgb3IgdGhlIHtAbGluayBsb2dnZXJ9XG4gKiBzaW5nbGV0b24gZXhwb3J0LlxuICovXG5leHBvcnQgaW50ZXJmYWNlIElMb2dnZXIge1xuICAvKipcbiAgICogTG9ncyBhIGRlYnVnIG1lc3NhZ2UuXG4gICAqIEBwYXJhbSBtZXNzYWdlIC0gRGlhZ25vc3RpYyB0ZXh0IGRlc2NyaWJpbmcgbG93LWxldmVsIGV4ZWN1dGlvbiBkZXRhaWxzLlxuICAgKiBAcGFyYW0gY29udGV4dCAtIE9wdGlvbmFsIHN0cnVjdHVyZWQgbWV0YWRhdGEgbWVyZ2VkIGludG8gdGhlIGVtaXR0ZWQgZXZlbnQuXG4gICAqL1xuICBkZWJ1ZyhtZXNzYWdlOiBzdHJpbmcsIGNvbnRleHQ/OiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPik6IHZvaWQ7XG5cbiAgLyoqXG4gICAqIExvZ3MgYW4gaW5mbyBtZXNzYWdlLlxuICAgKiBAcGFyYW0gbWVzc2FnZSAtIE9wZXJhdGlvbmFsIG1lc3NhZ2UgZGVzY3JpYmluZyBub3JtYWwgaG9vayBwcm9ncmVzcy5cbiAgICogQHBhcmFtIGNvbnRleHQgLSBPcHRpb25hbCBzdHJ1Y3R1cmVkIG1ldGFkYXRhIG1lcmdlZCBpbnRvIHRoZSBlbWl0dGVkIGV2ZW50LlxuICAgKi9cbiAgaW5mbyhtZXNzYWdlOiBzdHJpbmcsIGNvbnRleHQ/OiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPik6IHZvaWQ7XG5cbiAgLyoqXG4gICAqIExvZ3MgYSB3YXJuaW5nIG1lc3NhZ2UuXG4gICAqIEBwYXJhbSBtZXNzYWdlIC0gV2FybmluZyB0ZXh0IGZvciByZWNvdmVyYWJsZSBvciBzdXNwaWNpb3VzIGNvbmRpdGlvbnMuXG4gICAqIEBwYXJhbSBjb250ZXh0IC0gT3B0aW9uYWwgc3RydWN0dXJlZCBtZXRhZGF0YSBtZXJnZWQgaW50byB0aGUgZW1pdHRlZCBldmVudC5cbiAgICovXG4gIHdhcm4obWVzc2FnZTogc3RyaW5nLCBjb250ZXh0PzogUmVjb3JkPHN0cmluZywgdW5rbm93bj4pOiB2b2lkO1xuXG4gIC8qKlxuICAgKiBMb2dzIGFuIGVycm9yIG1lc3NhZ2UuXG4gICAqIEBwYXJhbSBtZXNzYWdlIC0gRXJyb3IgdGV4dCBkZXNjcmliaW5nIGEgaGFuZGxlZCBmYWlsdXJlIGNvbmRpdGlvbi5cbiAgICogQHBhcmFtIGNvbnRleHQgLSBPcHRpb25hbCBzdHJ1Y3R1cmVkIG1ldGFkYXRhIG1lcmdlZCBpbnRvIHRoZSBlbWl0dGVkIGV2ZW50LlxuICAgKi9cbiAgZXJyb3IobWVzc2FnZTogc3RyaW5nLCBjb250ZXh0PzogUmVjb3JkPHN0cmluZywgdW5rbm93bj4pOiB2b2lkO1xuXG4gIC8qKlxuICAgKiBMb2dzIGEgc3RydWN0dXJlZCBlcnJvciB3aXRoIGZ1bGwgZXJyb3IgZGV0YWlscy5cbiAgICogQHBhcmFtIGVycm9yIC0gVGhlIGVycm9yIHRvIGxvZ1xuICAgKiBAcGFyYW0gbWVzc2FnZSAtIEh1bWFuLXJlYWRhYmxlIGRlc2NyaXB0aW9uIG9mIHdoYXQgZmFpbGVkXG4gICAqIEBwYXJhbSBjb250ZXh0IC0gT3B0aW9uYWwgc3RydWN0dXJlZCBtZXRhZGF0YSBtZXJnZWQgaW50byB0aGUgZW1pdHRlZCBldmVudC5cbiAgICovXG4gIGxvZ0Vycm9yKGVycm9yOiB1bmtub3duLCBtZXNzYWdlOiBzdHJpbmcsIGNvbnRleHQ/OiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPik6IHZvaWQ7XG59XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIExvZ2dlciBDbGFzc1xuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4vKipcbiAqIExvZ2dlciBmb3IgQ2FyZHMgRXh0ZW5zaW9uIGhvb2tzIHdpdGggZXZlbnQgc3Vic2NyaXB0aW9uIGFuZCBmaWxlIG91dHB1dC5cbiAqXG4gKiBPdXRwdXQgaXMgb3B0LWluIGFuZCBiZXN0LWVmZm9ydDpcbiAqIC0gV2l0aCBubyBoYW5kbGVycyBhbmQgbm8gbG9nIGZpbGUsIGV2ZW50cyBhcmUgZHJvcHBlZC5cbiAqIC0gSGFuZGxlciBlcnJvcnMgYXJlIHN3YWxsb3dlZCBzbyBsb2dnaW5nIGNhbm5vdCBicmVhayBob29rcy5cbiAqIC0gRmlsZSBvdXRwdXQgdXNlcyBKU09OIExpbmVzIGFuZCBpZ25vcmVzIHdyaXRlIGZhaWx1cmVzLlxuICpcbiAqIFRoZSBsb2dnZXIgbmV2ZXIgd3JpdGVzIHRvIHN0ZG91dCBvciBzdGRlcnIuXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogaW1wb3J0IHsgbG9nZ2VyIH0gZnJvbSAnQGNhcmRzL3Nkay9jb25maWcnO1xuICpcbiAqIC8vIFN1YnNjcmliZSB0byBldmVudHMgYXQgc3BlY2lmaWMgbGV2ZWxcbiAqIGxvZ2dlci5vbignd2FybicsIChldmVudCkgPT4ge1xuICogICBzZW5kQWxlcnQoZXZlbnQubWVzc2FnZSk7XG4gKiB9KTtcbiAqXG4gKiAvLyBMb2cgd2l0aGluIGEgaG9vayBoYW5kbGVyXG4gKiBsb2dnZXIud2FybignQWJvdXQgdG8gZXhlY3V0ZSB0YXNrJyk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNsYXNzIExvZ2dlciB7XG4gIC8qKlxuICAgKiBSZWdpc3RlcmVkIGV2ZW50IGhhbmRsZXJzIGJ5IGxvZyBsZXZlbC5cbiAgICovXG4gIHByaXZhdGUgaGFuZGxlcnM6IE1hcDxMb2dMZXZlbCwgU2V0PExvZ0V2ZW50SGFuZGxlcj4+ID0gbmV3IE1hcCgpO1xuXG4gIC8qKlxuICAgKiBGaWxlIGRlc2NyaXB0b3IgZm9yIGxvZyBmaWxlIG91dHB1dC5cbiAgICogTGF6aWx5IGluaXRpYWxpemVkIG9uIGZpcnN0IHdyaXRlLlxuICAgKi9cbiAgcHJpdmF0ZSBsb2dGaWxlRmQ6IG51bWJlciB8IG51bGwgPSBudWxsO1xuXG4gIC8qKlxuICAgKiBQYXRoIHRvIHRoZSBsb2cgZmlsZSwgaWYgY29uZmlndXJlZC5cbiAgICovXG4gIHByaXZhdGUgbG9nRmlsZVBhdGg6IHN0cmluZyB8IG51bGwgPSBudWxsO1xuXG4gIC8qKlxuICAgKiBXaGV0aGVyIGZpbGUgaW5pdGlhbGl6YXRpb24gaGFzIGJlZW4gYXR0ZW1wdGVkLlxuICAgKi9cbiAgcHJpdmF0ZSBmaWxlSW5pdGlhbGl6ZWQgPSBmYWxzZTtcblxuICAvKipcbiAgICogQ3VycmVudCBob29rIGNvbnRleHQgZm9yIGVucmljaGluZyBsb2cgZXZlbnRzLlxuICAgKi9cbiAgcHJpdmF0ZSBjdXJyZW50SG9va1R5cGU6IHN0cmluZyB8IHVuZGVmaW5lZDtcblxuICAvKipcbiAgICogQ3VycmVudCBob29rIGlucHV0IGZvciBlbnJpY2hpbmcgbG9nIGV2ZW50cy5cbiAgICovXG4gIHByaXZhdGUgY3VycmVudElucHV0OiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPiB8IHVuZGVmaW5lZDtcblxuICAvKipcbiAgICogQ3JlYXRlcyBhIG5ldyBMb2dnZXIgaW5zdGFuY2UuXG4gICAqXG4gICAqIFR5cGljYWxseSB5b3Ugc2hvdWxkIHVzZSB0aGUgZXhwb3J0ZWQgYGxvZ2dlcmAgc2luZ2xldG9uIHJhdGhlciB0aGFuXG4gICAqIGNyZWF0aW5nIG5ldyBpbnN0YW5jZXMuXG4gICAqIEBwYXJhbSBjb25maWcgLSBPcHRpb25hbCBjb25maWd1cmF0aW9uXG4gICAqIEBleGFtcGxlXG4gICAqIGBgYHR5cGVzY3JpcHRcbiAgICogLy8gVXNlIHNpbmdsZXRvbiAocmVjb21tZW5kZWQpXG4gICAqIGltcG9ydCB7IGxvZ2dlciB9IGZyb20gJ0BjYXJkcy9zZGsvY29uZmlnJztcbiAgICpcbiAgICogLy8gT3IgY3JlYXRlIGN1c3RvbSBpbnN0YW5jZVxuICAgKiBjb25zdCBjdXN0b21Mb2dnZXIgPSBuZXcgTG9nZ2VyKHsgbG9nRmlsZVBhdGg6ICcvdmFyL2xvZy9ob29rcy5sb2cnIH0pO1xuICAgKiBgYGBcbiAgICovXG4gIGNvbnN0cnVjdG9yKGNvbmZpZzogTG9nZ2VyQ29uZmlnID0ge30pIHtcbiAgICAvLyBJbml0aWFsaXplIGhhbmRsZXJzIG1hcCBmb3IgZWFjaCBsZXZlbFxuICAgIGZvciAoY29uc3QgbGV2ZWwgb2YgTE9HX0xFVkVMUykge1xuICAgICAgdGhpcy5oYW5kbGVycy5zZXQobGV2ZWwsIG5ldyBTZXQoKSk7XG4gICAgfVxuXG4gICAgLy8gU2V0IGxvZyBmaWxlIHBhdGggZnJvbSBjb25maWcgb3IgZW52aXJvbm1lbnRcbiAgICB0aGlzLmxvZ0ZpbGVQYXRoID0gY29uZmlnLmxvZ0ZpbGVQYXRoID8/IHByb2Nlc3MuZW52WydDQVJEU19IT09LU19MT0dfRklMRSddID8/IG51bGw7XG4gIH1cblxuICAvKipcbiAgICogTG9ncyBhIGRlYnVnIG1lc3NhZ2UuXG4gICAqXG4gICAqIFVzZSBmb3IgZGV0YWlsZWQgZGVidWdnaW5nIGluZm9ybWF0aW9uIHRoYXQgaXMgdHlwaWNhbGx5IG9ubHkgdXNlZnVsXG4gICAqIGR1cmluZyBkZXZlbG9wbWVudCBvciB0cm91Ymxlc2hvb3RpbmcuXG4gICAqIEBwYXJhbSBtZXNzYWdlIC0gRGlhZ25vc3RpYyB0ZXh0IGRlc2NyaWJpbmcgbG93LWxldmVsIGV4ZWN1dGlvbiBkZXRhaWxzLlxuICAgKiBAcGFyYW0gY29udGV4dCAtIE9wdGlvbmFsIHN0cnVjdHVyZWQgbWV0YWRhdGEgbWVyZ2VkIGludG8gdGhlIGVtaXR0ZWQgZXZlbnQuXG4gICAqIEBleGFtcGxlXG4gICAqIGBgYHR5cGVzY3JpcHRcbiAgICogbG9nZ2VyLmRlYnVnKCdQcm9jZXNzaW5nIGhvb2sgaW5wdXQnLCB7IHRhc2tJZDogJ3Rhc2stMTIzJywgaW5wdXRTaXplOiAyNTYgfSk7XG4gICAqIGBgYFxuICAgKi9cbiAgZGVidWcobWVzc2FnZTogc3RyaW5nLCBjb250ZXh0PzogUmVjb3JkPHN0cmluZywgdW5rbm93bj4pOiB2b2lkIHtcbiAgICB0aGlzLmVtaXQoJ2RlYnVnJywgbWVzc2FnZSwgY29udGV4dCk7XG4gIH1cblxuICAvKipcbiAgICogTG9ncyBhbiBpbmZvIG1lc3NhZ2UuXG4gICAqXG4gICAqIFVzZSBmb3IgZ2VuZXJhbCBvcGVyYXRpb25hbCBldmVudHMgbGlrZSBob29rIGludm9jYXRpb25zLCBzdWNjZXNzZnVsXG4gICAqIGNvbXBsZXRpb25zLCBvciBzdGF0ZSBjaGFuZ2VzLlxuICAgKiBAcGFyYW0gbWVzc2FnZSAtIE9wZXJhdGlvbmFsIG1lc3NhZ2UgZGVzY3JpYmluZyBub3JtYWwgaG9vayBwcm9ncmVzcy5cbiAgICogQHBhcmFtIGNvbnRleHQgLSBPcHRpb25hbCBzdHJ1Y3R1cmVkIG1ldGFkYXRhIG1lcmdlZCBpbnRvIHRoZSBlbWl0dGVkIGV2ZW50LlxuICAgKiBAZXhhbXBsZVxuICAgKiBgYGB0eXBlc2NyaXB0XG4gICAqIGxvZ2dlci5pbmZvKCdUYXNrIHN0YXJ0ZWQnLCB7IHRhc2tJZDogJ3Rhc2stMTIzJywgY2FyZElkOiAnY2FyZC00NTYnIH0pO1xuICAgKiBgYGBcbiAgICovXG4gIGluZm8obWVzc2FnZTogc3RyaW5nLCBjb250ZXh0PzogUmVjb3JkPHN0cmluZywgdW5rbm93bj4pOiB2b2lkIHtcbiAgICB0aGlzLmVtaXQoJ2luZm8nLCBtZXNzYWdlLCBjb250ZXh0KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBMb2dzIGEgd2FybmluZyBtZXNzYWdlLlxuICAgKlxuICAgKiBVc2UgZm9yIGNvbmRpdGlvbnMgdGhhdCBtYXkgaW5kaWNhdGUgY2FyZHMgYnV0IGRvbid0IHByZXZlbnRcbiAgICogb3BlcmF0aW9uLCBzdWNoIGFzIGRlcHJlY2F0ZWQgcGF0dGVybnMgb3IgcGVyZm9ybWFuY2UgY29uY2VybnMuXG4gICAqIEBwYXJhbSBtZXNzYWdlIC0gV2FybmluZyB0ZXh0IGZvciByZWNvdmVyYWJsZSBvciBzdXNwaWNpb3VzIGNvbmRpdGlvbnMuXG4gICAqIEBwYXJhbSBjb250ZXh0IC0gT3B0aW9uYWwgc3RydWN0dXJlZCBtZXRhZGF0YSBtZXJnZWQgaW50byB0aGUgZW1pdHRlZCBldmVudC5cbiAgICogQGV4YW1wbGVcbiAgICogYGBgdHlwZXNjcmlwdFxuICAgKiBsb2dnZXIud2FybignRGVwcmVjYXRlZCBob29rIHBhdHRlcm4gZGV0ZWN0ZWQnLCB7IHBhdHRlcm46ICdsZWdhY3lNYXRjaGVyJyB9KTtcbiAgICogYGBgXG4gICAqL1xuICB3YXJuKG1lc3NhZ2U6IHN0cmluZywgY29udGV4dD86IFJlY29yZDxzdHJpbmcsIHVua25vd24+KTogdm9pZCB7XG4gICAgdGhpcy5lbWl0KCd3YXJuJywgbWVzc2FnZSwgY29udGV4dCk7XG4gIH1cblxuICAvKipcbiAgICogTG9ncyBhbiBlcnJvciBtZXNzYWdlLlxuICAgKlxuICAgKiBVc2UgZm9yIGVycm9yIGNvbmRpdGlvbnMgdGhhdCByZXF1aXJlIGF0dGVudGlvbiBidXQgd2VyZSBoYW5kbGVkXG4gICAqIGdyYWNlZnVsbHkuIEZvciBleGNlcHRpb25zLCBwcmVmZXIge0BsaW5rIGxvZ0Vycm9yfS5cbiAgICogQHBhcmFtIG1lc3NhZ2UgLSBFcnJvciB0ZXh0IGRlc2NyaWJpbmcgYSBoYW5kbGVkIGZhaWx1cmUgY29uZGl0aW9uLlxuICAgKiBAcGFyYW0gY29udGV4dCAtIE9wdGlvbmFsIHN0cnVjdHVyZWQgbWV0YWRhdGEgbWVyZ2VkIGludG8gdGhlIGVtaXR0ZWQgZXZlbnQuXG4gICAqIEBleGFtcGxlXG4gICAqIGBgYHR5cGVzY3JpcHRcbiAgICogbG9nZ2VyLmVycm9yKCdGYWlsZWQgdG8gdmFsaWRhdGUgaG9vayBpbnB1dCcsIHsgcmVhc29uOiAnZW1wdHkgdGFza0lkJyB9KTtcbiAgICogYGBgXG4gICAqL1xuICBlcnJvcihtZXNzYWdlOiBzdHJpbmcsIGNvbnRleHQ/OiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPik6IHZvaWQge1xuICAgIHRoaXMuZW1pdCgnZXJyb3InLCBtZXNzYWdlLCBjb250ZXh0KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBMb2dzIGEgc3RydWN0dXJlZCBlcnJvciB3aXRoIGZ1bGwgZXJyb3IgZGV0YWlscy5cbiAgICpcbiAgICogVXNlIHRoaXMgZm9yIGNhdWdodCBleGNlcHRpb25zLiBOb24tRXJyb3IgdmFsdWVzIGFyZSBub3JtYWxpemVkIHNvIGhhbmRsZXJzXG4gICAqIGFsd2F5cyByZWNlaXZlIGEgY29uc2lzdGVudCBlcnJvciBzaGFwZS5cbiAgICogQHBhcmFtIGVycm9yIC0gVGhlIGVycm9yIHRvIGxvZ1xuICAgKiBAcGFyYW0gbWVzc2FnZSAtIEh1bWFuLXJlYWRhYmxlIGRlc2NyaXB0aW9uIG9mIHdoYXQgZmFpbGVkXG4gICAqIEBwYXJhbSBjb250ZXh0IC0gT3B0aW9uYWwgc3RydWN0dXJlZCBtZXRhZGF0YSBtZXJnZWQgaW50byB0aGUgZW1pdHRlZCBldmVudC5cbiAgICogQGV4YW1wbGVcbiAgICogYGBgdHlwZXNjcmlwdFxuICAgKiB0cnkge1xuICAgKiAgIGF3YWl0IGRhbmdlcm91c09wZXJhdGlvbigpO1xuICAgKiB9IGNhdGNoIChlcnIpIHtcbiAgICogICBsb2dnZXIubG9nRXJyb3IoZXJyLCAnRmFpbGVkIHRvIGV4ZWN1dGUgZGFuZ2Vyb3VzIG9wZXJhdGlvbicsIHtcbiAgICogICAgIG9wZXJhdGlvbjogJ2RlbGV0ZScsXG4gICAqICAgICB0YXJnZXQ6ICcvaW1wb3J0YW50L2ZpbGUudHh0J1xuICAgKiAgIH0pO1xuICAgKiB9XG4gICAqIGBgYFxuICAgKi9cbiAgbG9nRXJyb3IoZXJyb3I6IHVua25vd24sIG1lc3NhZ2U6IHN0cmluZywgY29udGV4dD86IFJlY29yZDxzdHJpbmcsIHVua25vd24+KTogdm9pZCB7XG4gICAgY29uc3QgZXJyb3JJbmZvID0gdGhpcy5leHRyYWN0RXJyb3JJbmZvKGVycm9yKTtcblxuICAgIGNvbnN0IGV2ZW50OiBMb2dFdmVudCA9IHtcbiAgICAgIHRpbWVzdGFtcDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxuICAgICAgbGV2ZWw6ICdlcnJvcicsXG4gICAgICBob29rVHlwZTogdGhpcy5jdXJyZW50SG9va1R5cGUsXG4gICAgICBtZXNzYWdlLFxuICAgICAgaW5wdXQ6IHRoaXMuY3VycmVudElucHV0LFxuICAgICAgZXJyb3I6IGVycm9ySW5mbyxcbiAgICAgIGNvbnRleHRcbiAgICB9O1xuXG4gICAgdGhpcy5kZWxpdmVyRXZlbnQoZXZlbnQpO1xuICB9XG5cbiAgLyoqXG4gICAqIFN1YnNjcmliZXMgYSBoYW5kbGVyIHRvIGxvZyBldmVudHMgYXQgdGhlIHNwZWNpZmllZCBsZXZlbC5cbiAgICpcbiAgICogVGhlIGhhbmRsZXIgd2lsbCBiZSBjYWxsZWQgZm9yIGV2ZXJ5IGxvZyBldmVudCBhdCB0aGUgc3BlY2lmaWVkIGxldmVsLlxuICAgKiBSZXR1cm5zIGFuIHVuc3Vic2NyaWJlIGZ1bmN0aW9uIHRoYXQgc2hvdWxkIGJlIGNhbGxlZCB3aGVuIHRoZSBoYW5kbGVyXG4gICAqIGlzIG5vIGxvbmdlciBuZWVkZWQuIEhhbmRsZXIgZXJyb3JzIGFyZSBpZ25vcmVkIHRvIGF2b2lkIGRpc3J1cHRpbmcgaG9va3MuXG4gICAqIEBwYXJhbSBsZXZlbCAtIFRoZSBsb2cgbGV2ZWwgdG8gc3Vic2NyaWJlIHRvXG4gICAqIEBwYXJhbSBoYW5kbGVyIC0gVGhlIGhhbmRsZXIgZnVuY3Rpb24gdG8gY2FsbCBmb3IgZWFjaCBldmVudFxuICAgKiBAcmV0dXJucyBBIGZ1bmN0aW9uIHRvIHVuc3Vic2NyaWJlIHRoZSBoYW5kbGVyXG4gICAqIEBleGFtcGxlXG4gICAqIGBgYHR5cGVzY3JpcHRcbiAgICogLy8gU3Vic2NyaWJlIHRvIGVycm9yIGV2ZW50c1xuICAgKiBjb25zdCB1bnN1YnNjcmliZSA9IGxvZ2dlci5vbignZXJyb3InLCAoZXZlbnQpID0+IHtcbiAgICogICBjb25zb2xlLmVycm9yKGBbJHtldmVudC5ob29rVHlwZX1dICR7ZXZlbnQubWVzc2FnZX1gKTtcbiAgICogICBpZiAoZXZlbnQuZXJyb3IpIHtcbiAgICogICAgIGNvbnNvbGUuZXJyb3IoZXZlbnQuZXJyb3Iuc3RhY2spO1xuICAgKiAgIH1cbiAgICogfSk7XG4gICAqXG4gICAqIC8vIExhdGVyLCBjbGVhbiB1cFxuICAgKiB1bnN1YnNjcmliZSgpO1xuICAgKiBgYGBcbiAgICogQGV4YW1wbGVcbiAgICogYGBgdHlwZXNjcmlwdFxuICAgKiAvLyBGb3J3YXJkIHRvIGV4dGVybmFsIGxvZ2dpbmcgbGlicmFyeVxuICAgKiBpbXBvcnQgcGlubyBmcm9tICdwaW5vJztcbiAgICogY29uc3QgcGlub0xvZ2dlciA9IHBpbm8oKTtcbiAgICpcbiAgICogbG9nZ2VyLm9uKCdpbmZvJywgKGV2ZW50KSA9PiBwaW5vTG9nZ2VyLmluZm8oZXZlbnQsIGV2ZW50Lm1lc3NhZ2UpKTtcbiAgICogbG9nZ2VyLm9uKCd3YXJuJywgKGV2ZW50KSA9PiBwaW5vTG9nZ2VyLndhcm4oZXZlbnQsIGV2ZW50Lm1lc3NhZ2UpKTtcbiAgICogbG9nZ2VyLm9uKCdlcnJvcicsIChldmVudCkgPT4gcGlub0xvZ2dlci5lcnJvcihldmVudCwgZXZlbnQubWVzc2FnZSkpO1xuICAgKiBgYGBcbiAgICovXG4gIG9uKGxldmVsOiBMb2dMZXZlbCwgaGFuZGxlcjogTG9nRXZlbnRIYW5kbGVyKTogVW5zdWJzY3JpYmUge1xuICAgIGNvbnN0IGxldmVsSGFuZGxlcnMgPSB0aGlzLmhhbmRsZXJzLmdldChsZXZlbCk7XG4gICAgaWYgKGxldmVsSGFuZGxlcnMpIHtcbiAgICAgIGxldmVsSGFuZGxlcnMuYWRkKGhhbmRsZXIpO1xuICAgIH1cblxuICAgIHJldHVybiAoKSA9PiB7XG4gICAgICBsZXZlbEhhbmRsZXJzPy5kZWxldGUoaGFuZGxlcik7XG4gICAgfTtcbiAgfVxuXG4gIC8qKlxuICAgKiBTZXRzIHRoZSBjdXJyZW50IGhvb2sgY29udGV4dCBmb3IgZW5yaWNoaW5nIGxvZyBldmVudHMuXG4gICAqXG4gICAqIFRoaXMgaXMgY2FsbGVkIGludGVybmFsbHkgYnkgdGhlIHJ1bnRpbWUgYmVmb3JlIGludm9raW5nIGhvb2sgaGFuZGxlcnMuXG4gICAqIFlvdSB0eXBpY2FsbHkgZG9uJ3QgbmVlZCB0byBjYWxsIHRoaXMgZGlyZWN0bHkuXG4gICAqIEBwYXJhbSBob29rVHlwZSAtIFRoZSB0eXBlIG9mIGhvb2sgYmVpbmcgZXhlY3V0ZWRcbiAgICogQHBhcmFtIGlucHV0IC0gVGhlIGhvb2sgaW5wdXQgZGF0YVxuICAgKiBAaW50ZXJuYWxcbiAgICovXG4gIHNldENvbnRleHQoaG9va1R5cGU6IHN0cmluZyB8IHVuZGVmaW5lZCwgaW5wdXQ6IFJlY29yZDxzdHJpbmcsIHVua25vd24+IHwgdW5kZWZpbmVkKTogdm9pZCB7XG4gICAgdGhpcy5jdXJyZW50SG9va1R5cGUgPSBob29rVHlwZTtcbiAgICB0aGlzLmN1cnJlbnRJbnB1dCA9IGlucHV0O1xuICB9XG5cbiAgLyoqXG4gICAqIENsZWFycyB0aGUgY3VycmVudCBob29rIGNvbnRleHQuXG4gICAqXG4gICAqIENhbGxlZCBpbnRlcm5hbGx5IGJ5IHRoZSBydW50aW1lIGFmdGVyIGhvb2sgZXhlY3V0aW9uIGNvbXBsZXRlcy5cbiAgICogQGludGVybmFsXG4gICAqL1xuICBjbGVhckNvbnRleHQoKTogdm9pZCB7XG4gICAgdGhpcy5jdXJyZW50SG9va1R5cGUgPSB1bmRlZmluZWQ7XG4gICAgdGhpcy5jdXJyZW50SW5wdXQgPSB1bmRlZmluZWQ7XG4gIH1cblxuICAvKipcbiAgICogU2V0cyBhIGRlZmF1bHQgbG9nIGZpbGUgcGF0aCB0aGF0IG9ubHkgdGFrZXMgZWZmZWN0IGlmIG5vIG90aGVyIHNvdXJjZVxuICAgKiBoYXMgY29uZmlndXJlZCBmaWxlIGxvZ2dpbmcuXG4gICAqXG4gICAqIFRoaXMgaXMgdGhlIGxvd2VzdC1wcmlvcml0eSBmaWxlIHBhdGggc291cmNlLiBJdCB3aWxsIGJlIGlnbm9yZWQgaWZcbiAgICogYW55IG9mIHRoZXNlIGhhdmUgYWxyZWFkeSBzZXQgYSBwYXRoOlxuICAgKiAtIGBsb2dGaWxlUGF0aGAgaW4gdGhlIGNvbnN0cnVjdG9yIGNvbmZpZ1xuICAgKiAtIGBDQVJEU19IT09LU19MT0dfRklMRWAgZW52aXJvbm1lbnQgdmFyaWFibGVcbiAgICogLSB7QGxpbmsgc2V0TG9nRmlsZX0gY2FsbGVkIGF0IHJ1bnRpbWVcbiAgICpcbiAgICogSW50ZW5kZWQgZm9yIHVzZSBieSBDTEkgZW50cnkgcG9pbnRzIChlLmcuLCB0aGUgYC0tbG9nYCBmbGFnKS5cbiAgICogQHBhcmFtIGZpbGVQYXRoIC0gRGVmYXVsdCBwYXRoIHRvIHRoZSBsb2cgZmlsZVxuICAgKiBAZXhhbXBsZVxuICAgKiBgYGB0eXBlc2NyaXB0XG4gICAqIC8vIFdpcmUgLS1sb2cgQ0xJIGFyZ3VtZW50IGFzIGEgZmFsbGJhY2tcbiAgICogaWYgKGFyZ3MubG9nKSB7XG4gICAqICAgbG9nZ2VyLnNldERlZmF1bHRMb2dGaWxlKGFyZ3MubG9nKTtcbiAgICogfVxuICAgKiBgYGBcbiAgICovXG4gIHNldERlZmF1bHRMb2dGaWxlKGZpbGVQYXRoOiBzdHJpbmcpOiB2b2lkIHtcbiAgICBpZiAodGhpcy5sb2dGaWxlUGF0aCA9PT0gbnVsbCkge1xuICAgICAgdGhpcy5sb2dGaWxlUGF0aCA9IGZpbGVQYXRoO1xuICAgICAgdGhpcy5maWxlSW5pdGlhbGl6ZWQgPSBmYWxzZTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogQ29uZmlndXJlcyB0aGUgbG9nIGZpbGUgcGF0aCBhdCBydW50aW1lLlxuICAgKlxuICAgKiBDYWxsIHRoaXMgdG8gZW5hYmxlIG9yIGNoYW5nZSBmaWxlIGxvZ2dpbmcuIFNldHRpbmcgdG8gYG51bGxgIGRpc2FibGVzXG4gICAqIGZpbGUgbG9nZ2luZyBhbmQgY2xvc2VzIGFueSBvcGVuIGZpbGUgaGFuZGxlLiBEaXJlY3RvcmllcyBhcmUgY3JlYXRlZFxuICAgKiBvbiBkZW1hbmQgd2hlbiB0aGUgZmlyc3Qgd3JpdGUgb2NjdXJzLlxuICAgKiBAcGFyYW0gZmlsZVBhdGggLSBQYXRoIHRvIHRoZSBsb2cgZmlsZSwgb3IgbnVsbCB0byBkaXNhYmxlXG4gICAqIEBleGFtcGxlXG4gICAqIGBgYHR5cGVzY3JpcHRcbiAgICogLy8gRW5hYmxlIGZpbGUgbG9nZ2luZyBhdCBydW50aW1lXG4gICAqIGxvZ2dlci5zZXRMb2dGaWxlKCcvdmFyL2xvZy9jYXJkcy1zZGsubG9nJyk7XG4gICAqXG4gICAqIC8vIERpc2FibGUgZmlsZSBsb2dnaW5nXG4gICAqIGxvZ2dlci5zZXRMb2dGaWxlKG51bGwpO1xuICAgKiBgYGBcbiAgICovXG4gIHNldExvZ0ZpbGUoZmlsZVBhdGg6IHN0cmluZyB8IG51bGwpOiB2b2lkIHtcbiAgICAvLyBDbG9zZSBleGlzdGluZyBmaWxlIGlmIG9wZW5cbiAgICBpZiAodGhpcy5sb2dGaWxlRmQgIT09IG51bGwpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGNsb3NlU3luYyh0aGlzLmxvZ0ZpbGVGZCk7XG4gICAgICB9IGNhdGNoIHtcbiAgICAgICAgLy8gSWdub3JlIGVycm9ycyBvbiBjbG9zZVxuICAgICAgfVxuICAgICAgdGhpcy5sb2dGaWxlRmQgPSBudWxsO1xuICAgIH1cblxuICAgIHRoaXMubG9nRmlsZVBhdGggPSBmaWxlUGF0aDtcbiAgICB0aGlzLmZpbGVJbml0aWFsaXplZCA9IGZhbHNlO1xuICB9XG5cbiAgLyoqXG4gICAqIENsb3NlcyBhbGwgcmVzb3VyY2VzIGhlbGQgYnkgdGhlIGxvZ2dlci5cbiAgICpcbiAgICogQ2FsbCB0aGlzIGR1cmluZyBncmFjZWZ1bCBzaHV0ZG93biB0byBlbnN1cmUgYWxsIGxvZyBkYXRhIGlzIGZsdXNoZWQuXG4gICAqIFNhZmUgdG8gY2FsbCBtdWx0aXBsZSB0aW1lcy5cbiAgICogQGV4YW1wbGVcbiAgICogYGBgdHlwZXNjcmlwdFxuICAgKiBwcm9jZXNzLm9uKCdleGl0JywgKCkgPT4ge1xuICAgKiAgIGxvZ2dlci5jbG9zZSgpO1xuICAgKiB9KTtcbiAgICogYGBgXG4gICAqL1xuICBjbG9zZSgpOiB2b2lkIHtcbiAgICBpZiAodGhpcy5sb2dGaWxlRmQgIT09IG51bGwpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGNsb3NlU3luYyh0aGlzLmxvZ0ZpbGVGZCk7XG4gICAgICB9IGNhdGNoIHtcbiAgICAgICAgLy8gSWdub3JlIGVycm9ycyBvbiBjbG9zZVxuICAgICAgfVxuICAgICAgdGhpcy5sb2dGaWxlRmQgPSBudWxsO1xuICAgIH1cbiAgICB0aGlzLmZpbGVJbml0aWFsaXplZCA9IGZhbHNlO1xuICB9XG5cbiAgLyoqXG4gICAqIENoZWNrcyBpZiB0aGVyZSBhcmUgYW55IGFjdGl2ZSBoYW5kbGVycyBvciBkZXN0aW5hdGlvbnMuXG4gICAqXG4gICAqIFJldHVybnMgdHJ1ZSBpZiBhbnkgaGFuZGxlcnMgYXJlIHJlZ2lzdGVyZWQgb3IgZmlsZSBsb2dnaW5nIGlzIGVuYWJsZWQuXG4gICAqIFVzZWZ1bCBmb3IgZGVjaWRpbmcgd2hldGhlciB0byBjb21wdXRlIGV4cGVuc2l2ZSBsb2cgY29udGV4dC5cbiAgICogQHJldHVybnMgV2hldGhlciB0aGUgbG9nZ2VyIGhhcyBhbnkgYWN0aXZlIG91dHB1dCBkZXN0aW5hdGlvbnNcbiAgICovXG4gIGhhc0Rlc3RpbmF0aW9ucygpOiBib29sZWFuIHtcbiAgICBjb25zdCBoYXNIYW5kbGVycyA9IEFycmF5LmZyb20odGhpcy5oYW5kbGVycy52YWx1ZXMoKSkuc29tZSgoaGFuZGxlcnMpID0+IGhhbmRsZXJzLnNpemUgPiAwKTtcbiAgICByZXR1cm4gaGFzSGFuZGxlcnMgfHwgdGhpcy5sb2dGaWxlUGF0aCAhPT0gbnVsbDtcbiAgfVxuXG4gIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgLy8gUHJpdmF0ZSBNZXRob2RzXG4gIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuICAvKipcbiAgICogRW1pdHMgYSBsb2cgZXZlbnQuXG4gICAqIEBwYXJhbSBsZXZlbCAtIFRoZSBzZXZlcml0eSBsZXZlbCBvZiB0aGUgZXZlbnRcbiAgICogQHBhcmFtIG1lc3NhZ2UgLSBUaGUgbG9nIG1lc3NhZ2VcbiAgICogQHBhcmFtIGNvbnRleHQgLSBPcHRpb25hbCBhZGRpdGlvbmFsIGNvbnRleHQgZGF0YVxuICAgKi9cbiAgcHJpdmF0ZSBlbWl0KGxldmVsOiBMb2dMZXZlbCwgbWVzc2FnZTogc3RyaW5nLCBjb250ZXh0PzogUmVjb3JkPHN0cmluZywgdW5rbm93bj4pOiB2b2lkIHtcbiAgICBjb25zdCBldmVudDogTG9nRXZlbnQgPSB7XG4gICAgICB0aW1lc3RhbXA6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcbiAgICAgIGxldmVsLFxuICAgICAgaG9va1R5cGU6IHRoaXMuY3VycmVudEhvb2tUeXBlLFxuICAgICAgbWVzc2FnZSxcbiAgICAgIGlucHV0OiB0aGlzLmN1cnJlbnRJbnB1dCxcbiAgICAgIGNvbnRleHRcbiAgICB9O1xuXG4gICAgdGhpcy5kZWxpdmVyRXZlbnQoZXZlbnQpO1xuICB9XG5cbiAgLyoqXG4gICAqIERlbGl2ZXJzIGFuIGV2ZW50IHRvIGFsbCByZWdpc3RlcmVkIGRlc3RpbmF0aW9ucy5cbiAgICogQHBhcmFtIGV2ZW50IC0gVGhlIGxvZyBldmVudCB0byBkZWxpdmVyXG4gICAqL1xuICBwcml2YXRlIGRlbGl2ZXJFdmVudChldmVudDogTG9nRXZlbnQpOiB2b2lkIHtcbiAgICAvLyBEZWxpdmVyIHRvIGV2ZW50IGhhbmRsZXJzXG4gICAgY29uc3QgbGV2ZWxIYW5kbGVycyA9IHRoaXMuaGFuZGxlcnMuZ2V0KGV2ZW50LmxldmVsKTtcbiAgICBpZiAobGV2ZWxIYW5kbGVycykge1xuICAgICAgZm9yIChjb25zdCBoYW5kbGVyIG9mIGxldmVsSGFuZGxlcnMpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBoYW5kbGVyKGV2ZW50KTtcbiAgICAgICAgfSBjYXRjaCB7XG4gICAgICAgICAgLy8gU2lsZW50bHkgaWdub3JlIGhhbmRsZXIgZXJyb3JzIHRvIG5vdCBkaXNydXB0IGhvb2sgZXhlY3V0aW9uXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBXcml0ZSB0byBmaWxlIGlmIGNvbmZpZ3VyZWRcbiAgICB0aGlzLndyaXRlVG9GaWxlKGV2ZW50KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBXcml0ZXMgYW4gZXZlbnQgdG8gdGhlIGxvZyBmaWxlLlxuICAgKiBAcGFyYW0gZXZlbnQgLSBUaGUgbG9nIGV2ZW50IHRvIHdyaXRlXG4gICAqL1xuICBwcml2YXRlIHdyaXRlVG9GaWxlKGV2ZW50OiBMb2dFdmVudCk6IHZvaWQge1xuICAgIGlmICghdGhpcy5sb2dGaWxlUGF0aCkgcmV0dXJuO1xuXG4gICAgLy8gTGF6eSBpbml0aWFsaXphdGlvbiBvZiBmaWxlIGhhbmRsZVxuICAgIGlmICghdGhpcy5maWxlSW5pdGlhbGl6ZWQpIHtcbiAgICAgIHRoaXMuaW5pdGlhbGl6ZUZpbGUoKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5sb2dGaWxlRmQgPT09IG51bGwpIHJldHVybjtcblxuICAgIHRyeSB7XG4gICAgICBjb25zdCBsaW5lID0gYCR7SlNPTi5zdHJpbmdpZnkoZXZlbnQpfVxcbmA7XG4gICAgICB3cml0ZVN5bmModGhpcy5sb2dGaWxlRmQsIGxpbmUpO1xuICAgIH0gY2F0Y2gge1xuICAgICAgLy8gU2lsZW50bHkgaWdub3JlIGZpbGUgd3JpdGUgZXJyb3JzIHRvIG5vdCBkaXNydXB0IGhvb2sgZXhlY3V0aW9uXG4gICAgICAvLyBUaGlzIGZvbGxvd3MgdGhlIHJpc2sgbWl0aWdhdGlvbjogXCJHcmFjZWZ1bCBkZWdyYWRhdGlvbiAtIGxvZyB3cml0ZVxuICAgICAgLy8gZmFpbHVyZXMgYXJlIHNpbGVudGx5IGlnbm9yZWQgdG8gbm90IGRpc3J1cHQgaG9vayBleGVjdXRpb25cIlxuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBJbml0aWFsaXplcyB0aGUgbG9nIGZpbGUgZm9yIHdyaXRpbmcuXG4gICAqL1xuICBwcml2YXRlIGluaXRpYWxpemVGaWxlKCk6IHZvaWQge1xuICAgIHRoaXMuZmlsZUluaXRpYWxpemVkID0gdHJ1ZTtcblxuICAgIGlmICghdGhpcy5sb2dGaWxlUGF0aCkgcmV0dXJuO1xuXG4gICAgdHJ5IHtcbiAgICAgIC8vIEVuc3VyZSBkaXJlY3RvcnkgZXhpc3RzXG4gICAgICBjb25zdCBkaXIgPSBkaXJuYW1lKHRoaXMubG9nRmlsZVBhdGgpO1xuICAgICAgaWYgKCFleGlzdHNTeW5jKGRpcikpIHtcbiAgICAgICAgbWtkaXJTeW5jKGRpciwgeyByZWN1cnNpdmU6IHRydWUgfSk7XG4gICAgICB9XG5cbiAgICAgIC8vIE9wZW4gZmlsZSBmb3IgYXBwZW5kaW5nXG4gICAgICB0aGlzLmxvZ0ZpbGVGZCA9IG9wZW5TeW5jKHRoaXMubG9nRmlsZVBhdGgsICdhJyk7XG4gICAgfSBjYXRjaCB7XG4gICAgICAvLyBTaWxlbnRseSBpZ25vcmUgZmlsZSBpbml0aWFsaXphdGlvbiBlcnJvcnNcbiAgICAgIHRoaXMubG9nRmlsZUZkID0gbnVsbDtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogRXh0cmFjdHMgc3RydWN0dXJlZCBlcnJvciBpbmZvcm1hdGlvbiBmcm9tIGFuIHVua25vd24gZXJyb3IuXG4gICAqIEBwYXJhbSBlcnJvciAtIFRoZSBlcnJvciB0byBleHRyYWN0IGluZm9ybWF0aW9uIGZyb21cbiAgICogQHJldHVybnMgU3RydWN0dXJlZCBlcnJvciBpbmZvcm1hdGlvblxuICAgKi9cbiAgcHJpdmF0ZSBleHRyYWN0RXJyb3JJbmZvKGVycm9yOiB1bmtub3duKTogTG9nRXZlbnRFcnJvciB7XG4gICAgaWYgKGVycm9yIGluc3RhbmNlb2YgRXJyb3IpIHtcbiAgICAgIGNvbnN0IGluZm86IExvZ0V2ZW50RXJyb3IgPSB7XG4gICAgICAgIG5hbWU6IGVycm9yLm5hbWUsXG4gICAgICAgIG1lc3NhZ2U6IGVycm9yLm1lc3NhZ2UsXG4gICAgICAgIHN0YWNrOiBlcnJvci5zdGFja1xuICAgICAgfTtcblxuICAgICAgLy8gRXh0cmFjdCBjYXVzZSBjaGFpbiBpZiBwcmVzZW50XG4gICAgICBpZiAoZXJyb3IuY2F1c2UgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBpbmZvLmNhdXNlID0gdGhpcy5leHRyYWN0RXJyb3JJbmZvKGVycm9yLmNhdXNlKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIGluZm87XG4gICAgfVxuXG4gICAgLy8gSGFuZGxlIG5vbi1FcnJvciB2YWx1ZXNcbiAgICByZXR1cm4ge1xuICAgICAgbmFtZTogJ1Vua25vd25FcnJvcicsXG4gICAgICBtZXNzYWdlOiBTdHJpbmcoZXJyb3IpXG4gICAgfTtcbiAgfVxufVxuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBTaW5nbGV0b24gRXhwb3J0XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbi8qKlxuICogR2xvYmFsIGxvZ2dlciBpbnN0YW5jZSBmb3IgQ2FyZHMgRXh0ZW5zaW9uIGhvb2tzLlxuICpcbiAqIFVzZSB0aGlzIHNpbmdsZXRvbiBmb3IgYWxsIGxvZ2dpbmcgd2l0aGluIGhvb2tzLiBUaGUgbG9nZ2VyIGlzIGNvbmZpZ3VyZWRcbiAqIHZpYSBlbnZpcm9ubWVudCB2YXJpYWJsZXMgYW5kIHN1cHBvcnRzIGV2ZW50IHN1YnNjcmlwdGlvbiBmb3IgY3VzdG9tXG4gKiBkZXN0aW5hdGlvbnMuXG4gKlxuICogIyMgQ29uZmlndXJhdGlvblxuICpcbiAqIHwgRW52aXJvbm1lbnQgVmFyaWFibGUgfCBEZXNjcmlwdGlvbiB8XG4gKiB8LS0tLS0tLS0tLS0tLS0tLS0tLS0tfC0tLS0tLS0tLS0tLS18XG4gKiB8IGBDQVJEU19IT09LU19MT0dfRklMRWAgfCBQYXRoIHRvIGxvZyBmaWxlIChKU09OIExpbmVzIGZvcm1hdCkgfFxuICpcbiAqICMjIFVzYWdlIGluIEhvb2tzXG4gKlxuICogVGhlIGxvZ2dlciBjYW4gYmUgdXNlZCBkaXJlY3RseSB3aXRoaW4gaG9vayBoYW5kbGVyczpcbiAqXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBpbXBvcnQgeyBsb2dnZXIgfSBmcm9tICdAY2FyZHMvc2RrL2NvbmZpZyc7XG4gKlxuICogLy8gSW4gYSBob29rIGhhbmRsZXJcbiAqIGxvZ2dlci53YXJuKCdUYXNrIHN0YXJ0aW5nIGluIGludGVyYWN0aXZlIG1vZGUnKTtcbiAqIGBgYFxuICpcbiAqICMjIEV4dGVybmFsIEludGVncmF0aW9uXG4gKlxuICogU3Vic2NyaWJlIHRvIGV2ZW50cyB0byBmb3J3YXJkIGxvZ3MgdG8gZXh0ZXJuYWwgc3lzdGVtczpcbiAqXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBpbXBvcnQgeyBsb2dnZXIgfSBmcm9tICdAY2FyZHMvc2RrL2NvbmZpZyc7XG4gKiBpbXBvcnQgcGlubyBmcm9tICdwaW5vJztcbiAqXG4gKiBjb25zdCBwaW5vTG9nZ2VyID0gcGlubyh7IGxldmVsOiAnZGVidWcnIH0pO1xuICpcbiAqIGxvZ2dlci5vbignZGVidWcnLCAoZXZlbnQpID0+IHBpbm9Mb2dnZXIuZGVidWcoZXZlbnQsIGV2ZW50Lm1lc3NhZ2UpKTtcbiAqIGxvZ2dlci5vbignaW5mbycsIChldmVudCkgPT4gcGlub0xvZ2dlci5pbmZvKGV2ZW50LCBldmVudC5tZXNzYWdlKSk7XG4gKiBsb2dnZXIub24oJ3dhcm4nLCAoZXZlbnQpID0+IHBpbm9Mb2dnZXIud2FybihldmVudCwgZXZlbnQubWVzc2FnZSkpO1xuICogbG9nZ2VyLm9uKCdlcnJvcicsIChldmVudCkgPT4gcGlub0xvZ2dlci5lcnJvcihldmVudCwgZXZlbnQubWVzc2FnZSkpO1xuICogYGBgXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogLy8gRGlyZWN0IHVzYWdlXG4gKiBpbXBvcnQgeyBsb2dnZXIgfSBmcm9tICdAY2FyZHMvc2RrL2NvbmZpZyc7XG4gKlxuICogbG9nZ2VyLmluZm8oJ1N0YXJ0aW5nIG9wZXJhdGlvbicpO1xuICogbG9nZ2VyLndhcm4oJ1Jlc291cmNlIGxpbWl0IGFwcHJvYWNoaW5nJywgeyB1c2FnZTogMC45IH0pO1xuICpcbiAqIHRyeSB7XG4gKiAgIGF3YWl0IHJpc2t5T3BlcmF0aW9uKCk7XG4gKiB9IGNhdGNoIChlcnIpIHtcbiAqICAgbG9nZ2VyLmxvZ0Vycm9yKGVyciwgJ1Jpc2t5IG9wZXJhdGlvbiBmYWlsZWQnKTtcbiAqIH1cbiAqIGBgYFxuICovXG5leHBvcnQgY29uc3QgbG9nZ2VyID0gbmV3IExvZ2dlcigpO1xuIiwgIi8qKlxuICogU29ja2V0IGNsaWVudCBmb3IgcnVudGltZS10by1kaXNwYXRjaGVyIGNvbW11bmljYXRpb24uXG4gKlxuICogQ29ubmVjdHMgdG8gYSBVbml4IGRvbWFpbiBzb2NrZXQgY3JlYXRlZCBieSBBY3Rpb25EaXNwYXRjaGVyIGFuZCBoYW5kbGVzXG4gKiBOREpTT04gKG5ld2xpbmUtZGVsaW1pdGVkIEpTT04pIHByb3RvY29sIGZvciByZWNlaXZpbmcgY29tbWFuZHMgYW5kIHNlbmRpbmdcbiAqIHJlc3BvbnNlcy5cbiAqXG4gKlxuICogQHN1bW1hcnkgU29ja2V0IGNsaWVudCBmb3IgcnVudGltZS10by1kaXNwYXRjaGVyIGNvbW11bmljYXRpb25cbiAqIEBtb2R1bGVcbiAqL1xuXG5pbXBvcnQgKiBhcyBuZXQgZnJvbSAnbm9kZTpuZXQnO1xuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBUeXBlc1xuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4vKipcbiAqIENvbW1hbmRzIHRoYXQgY2FuIGJlIHJlY2VpdmVkIGZyb20gdGhlIEFjdGlvbkRpc3BhdGNoZXIgdmlhIHNvY2tldC5cbiAqXG4gKiBVc2VzIE5ESlNPTiAobmV3bGluZS1kZWxpbWl0ZWQgSlNPTikgcHJvdG9jb2wuXG4gKi9cbmV4cG9ydCB0eXBlIFNvY2tldENvbW1hbmQgPSB7IHR5cGU6ICdjYW5jZWwnIH0gfCB7IHR5cGU6ICdzd2l0Y2hUb0ludGVyYWN0aXZlJyB9O1xuXG4vKipcbiAqIFJlc3BvbnNlIHNlbnQgYmFjayB0byB0aGUgQWN0aW9uRGlzcGF0Y2hlciB3aGVuIHN3aXRjaFRvSW50ZXJhY3RpdmUgaXMgaGFuZGxlZC5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBTd2l0Y2hUb0ludGVyYWN0aXZlUmVzcG9uc2Uge1xuICB0eXBlOiAnc3dpdGNoVG9JbnRlcmFjdGl2ZVJlc3BvbnNlJztcbiAgZGF0YTogdW5rbm93bjtcbn1cblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gU29ja2V0Q2xpZW50XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbi8qKlxuICogQ2xpZW50IGZvciB0aGUgTkRKU09OIHNvY2tldCBwcm90b2NvbCBiZXR3ZWVuIHRoZSBhY3Rpb24gcnVudGltZSBhbmRcbiAqIEFjdGlvbkRpc3BhdGNoZXIuXG4gKlxuICogUmVjZWl2ZXMgY29tbWFuZHMgKGNhbmNlbCwgc3dpdGNoVG9JbnRlcmFjdGl2ZSkgYW5kIHNlbmRzIHJlc3BvbnNlc1xuICogKHN3aXRjaFRvSW50ZXJhY3RpdmVSZXNwb25zZSkgb3ZlciBhIFVuaXggZG9tYWluIHNvY2tldC5cbiAqXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogY29uc3QgY2xpZW50ID0gYXdhaXQgU29ja2V0Q2xpZW50LmNvbm5lY3QoJy9wYXRoL3RvL3NvY2tldCcpO1xuICogY2xpZW50Lm9uQ29tbWFuZCgoY29tbWFuZCkgPT4ge1xuICogICBpZiAoY29tbWFuZC50eXBlID09PSAnY2FuY2VsJykgeyAuLi4gfVxuICogfSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNsYXNzIFNvY2tldENsaWVudCB7XG4gIHByaXZhdGUgc29ja2V0OiBuZXQuU29ja2V0O1xuICBwcml2YXRlIGJ1ZmZlciA9ICcnO1xuICBwcml2YXRlIGNvbW1hbmRIYW5kbGVyPzogKGNvbW1hbmQ6IFNvY2tldENvbW1hbmQpID0+IHZvaWQ7XG5cbiAgcHJpdmF0ZSBjb25zdHJ1Y3Rvcihzb2NrZXQ6IG5ldC5Tb2NrZXQpIHtcbiAgICB0aGlzLnNvY2tldCA9IHNvY2tldDtcblxuICAgIHNvY2tldC5vbignZGF0YScsIChjaHVuaykgPT4ge1xuICAgICAgdGhpcy5idWZmZXIgKz0gY2h1bmsudG9TdHJpbmcoKTtcbiAgICAgIC8vIFBhcnNlIE5ESlNPTiAtIHNwbGl0IGJ5IG5ld2xpbmVzXG4gICAgICBjb25zdCBsaW5lcyA9IHRoaXMuYnVmZmVyLnNwbGl0KCdcXG4nKTtcbiAgICAgIHRoaXMuYnVmZmVyID0gbGluZXMucG9wKCkgPz8gJyc7IC8vIEtlZXAgaW5jb21wbGV0ZSBsaW5lIGluIGJ1ZmZlclxuXG4gICAgICBmb3IgKGNvbnN0IGxpbmUgb2YgbGluZXMpIHtcbiAgICAgICAgaWYgKGxpbmUudHJpbSgpID09PSAnJykgY29udGludWU7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgY29uc3QgcGFyc2VkID0gSlNPTi5wYXJzZShsaW5lKSBhcyBTb2NrZXRDb21tYW5kO1xuICAgICAgICAgIHRoaXMuY29tbWFuZEhhbmRsZXI/LihwYXJzZWQpO1xuICAgICAgICB9IGNhdGNoIHtcbiAgICAgICAgICAvLyBNYWxmb3JtZWQgSlNPTiBvbiBzb2NrZXQgaXMgaWdub3JlZCAocGVyIHBsYW4pXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDb25uZWN0IHRvIGEgVW5peCBkb21haW4gc29ja2V0IGF0IHRoZSBnaXZlbiBwYXRoLlxuICAgKlxuICAgKiBAcGFyYW0gc29ja2V0UGF0aCAtIFBhdGggdG8gdGhlIFVuaXggZG9tYWluIHNvY2tldFxuICAgKiBAcmV0dXJucyBBIGNvbm5lY3RlZCBTb2NrZXRDbGllbnQgaW5zdGFuY2VcbiAgICogQHRocm93cyBFcnJvciBpZiB0aGUgY29ubmVjdGlvbiBmYWlsc1xuICAgKi9cbiAgc3RhdGljIGNvbm5lY3Qoc29ja2V0UGF0aDogc3RyaW5nKTogUHJvbWlzZTxTb2NrZXRDbGllbnQ+IHtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgY29uc3Qgc29ja2V0ID0gbmV0LmNyZWF0ZUNvbm5lY3Rpb24oc29ja2V0UGF0aCwgKCkgPT4ge1xuICAgICAgICByZXNvbHZlKG5ldyBTb2NrZXRDbGllbnQoc29ja2V0KSk7XG4gICAgICB9KTtcbiAgICAgIHNvY2tldC5vbignZXJyb3InLCByZWplY3QpO1xuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIFJlZ2lzdGVyIGEgaGFuZGxlciBmb3IgaW5jb21pbmcgc29ja2V0IGNvbW1hbmRzLlxuICAgKlxuICAgKiBPbmx5IG9uZSBoYW5kbGVyIGNhbiBiZSByZWdpc3RlcmVkIGF0IGEgdGltZS4gU3Vic2VxdWVudCBjYWxscyByZXBsYWNlXG4gICAqIHRoZSBwcmV2aW91cyBoYW5kbGVyLlxuICAgKlxuICAgKiBAcGFyYW0gaGFuZGxlciAtIEZ1bmN0aW9uIHRvIGNhbGwgd2hlbiBhIGNvbW1hbmQgaXMgcmVjZWl2ZWRcbiAgICovXG4gIG9uQ29tbWFuZChoYW5kbGVyOiAoY29tbWFuZDogU29ja2V0Q29tbWFuZCkgPT4gdm9pZCk6IHZvaWQge1xuICAgIHRoaXMuY29tbWFuZEhhbmRsZXIgPSBoYW5kbGVyO1xuICB9XG5cbiAgLyoqXG4gICAqIFNlbmQgYSByZXNwb25zZSBiYWNrIHRvIHRoZSBBY3Rpb25EaXNwYXRjaGVyLlxuICAgKlxuICAgKiBAcGFyYW0gcmVzcG9uc2UgLSBUaGUgcmVzcG9uc2UgdG8gc2VuZCBhcyBOREpTT05cbiAgICovXG4gIHNlbmRSZXNwb25zZShyZXNwb25zZTogU3dpdGNoVG9JbnRlcmFjdGl2ZVJlc3BvbnNlKTogdm9pZCB7XG4gICAgdGhpcy5zb2NrZXQud3JpdGUoYCR7SlNPTi5zdHJpbmdpZnkocmVzcG9uc2UpfVxcbmApO1xuICB9XG5cbiAgLyoqXG4gICAqIFNlbmQgYSByZXNwb25zZSBhbmQgY2FsbCBjYWxsYmFjayB3aGVuIGZsdXNoZWQuXG4gICAqXG4gICAqIFVzZWQgdG8gZ3VhcmFudGVlIGZsdXNoIGJlZm9yZSBwcm9jZXNzLmV4aXQuXG4gICAqXG4gICAqIEBwYXJhbSByZXNwb25zZSAtIFRoZSByZXNwb25zZSB0byBzZW5kIGFzIE5ESlNPTlxuICAgKiBAcGFyYW0gY2FsbGJhY2sgLSBDYWxsZWQgYWZ0ZXIgdGhlIGRhdGEgaXMgZmx1c2hlZCB0byB0aGUgc29ja2V0XG4gICAqL1xuICBzZW5kUmVzcG9uc2VUaGVuKHJlc3BvbnNlOiBTd2l0Y2hUb0ludGVyYWN0aXZlUmVzcG9uc2UsIGNhbGxiYWNrOiAoKSA9PiB2b2lkKTogdm9pZCB7XG4gICAgdGhpcy5zb2NrZXQud3JpdGUoYCR7SlNPTi5zdHJpbmdpZnkocmVzcG9uc2UpfVxcbmAsIGNhbGxiYWNrKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDbG9zZSB0aGUgc29ja2V0IGNvbm5lY3Rpb24uXG4gICAqL1xuICBjbG9zZSgpOiB2b2lkIHtcbiAgICB0aGlzLnNvY2tldC5kZXN0cm95KCk7XG4gIH1cbn1cbiIsICIvKipcbiAqIFJ1bnRpbWUgb3JjaGVzdHJhdGlvbiBmb3IgY29tcGlsZWQgQ2FyZHMgYWN0aW9uIGFuZCB0eXBlIGhhbmRsZXJzLlxuICpcbiAqIFRoaXMgbW9kdWxlIGlzIGJ1bmRsZWQgaW50byBjb21waWxlZCBoYW5kbGVycyBieSB0aGUgQ0xJLiBJdCBwcm92aWRlcyB0aGVcbiAqIGV4ZWN1dGlvbiBoYXJuZXNzIHRoYXQgcmVhZHMgaGFuZGxlciBpbnB1dCBmcm9tIGVudmlyb25tZW50IHZhcmlhYmxlcywgc2V0c1xuICogdXAgdGhlIGxvZ2dlciBjb250ZXh0LCBpbnZva2VzIHRoZSB1c2VyJ3MgaGFuZGxlciwgYW5kIGV4aXRzIHRoZSBwcm9jZXNzXG4gKiB3aXRoIHRoZSBhcHByb3ByaWF0ZSBjb2RlLlxuICpcbiAqIFRoZSBydW50aW1lIGlzIGRlc2lnbmVkIHRvIG5ldmVyIHJldHVybiBpbiBub3JtYWwgdXNlLiBBbGwgY29kZSBwYXRoc1xuICogdGVybWluYXRlIHdpdGggYHByb2Nlc3MuZXhpdCgpYC4gVGhlIG9ubHkgZXhjZXB0aW9uIGlzIHRlc3Qgc2NlbmFyaW9zXG4gKiB3aGVyZSBgcHJvY2Vzcy5leGl0YCBpcyBtb2NrZWQuXG4gKlxuICogIyMgRXhlY3V0aW9uIEZsb3dcbiAqXG4gKiAxLiBFeHRyYWN0IGlucHV0IHBheWxvYWQgZnJvbSBlbnZpcm9ubWVudCB2YXJpYWJsZXMgYmFzZWQgb24gY29tbWFuZCB0eXBlXG4gKiAyLiBTZXQgbG9nZ2VyIGNvbnRleHQgd2l0aCBjb21tYW5kIHR5cGUgYW5kIGlucHV0XG4gKiAzLiBPcHRpb25hbGx5IGNvbm5lY3QgdG8gU09DS0VUX1BBVEggZm9yIGNvbW1hbmQgZGlzcGF0Y2ggKGZhaWwtb3BlbilcbiAqIDQuIEJ1aWxkIEFjdGlvbkNvbnRleHQgd2l0aCBsb2dnZXIsIGN3ZCwgYW5kIHNvY2tldC1iYWNrZWQgY2FsbGJhY2tzXG4gKiA1LiBJbnZva2UgdGhlIGNvbW1hbmQgd2l0aCBpbnB1dCBhbmQgY29udGV4dFxuICogNi4gT24gc3VjY2VzczogY2xlYW4gdXAgc29ja2V0IGFuZCBleGl0IHdpdGggY29kZSAwXG4gKiA3LiBPbiBlcnJvcjogbG9nIGVycm9yLCB3cml0ZSB0byBzdGRlcnIsIGNsZWFuIHVwIGFuZCBleGl0IHdpdGggY29kZSAxXG4gKlxuICpcbiAqIEBzdW1tYXJ5IFJ1bnRpbWUgb3JjaGVzdHJhdGlvbiBmb3IgY29tcGlsZWQgQ2FyZHMgYWN0aW9uIGFuZCB0eXBlIGhhbmRsZXJzXG4gKiBAbW9kdWxlXG4gKiBAc2VlIHtAbGluayBleGVjdXRlQ29tbWFuZH0gZm9yIHRoZSBtYWluIGVudHJ5IHBvaW50XG4gKlxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIC8vIFRoaXMgaXMgd2hhdCBjb21waWxlZCBoYW5kbGVycyBsb29rIGxpa2UgaW50ZXJuYWxseVxuICogaW1wb3J0IHsgZXhlY3V0ZUNvbW1hbmQgfSBmcm9tICdAY2FyZHMvc2RrL2NvbmZpZy9ydW50aW1lJztcbiAqIGltcG9ydCBteUNvbW1hbmQgZnJvbSAnLi9teS1jb21tYW5kLmpzJztcbiAqXG4gKiBleGVjdXRlQ29tbWFuZChteUNvbW1hbmQpO1xuICogYGBgXG4gKi9cblxuaW1wb3J0IHR5cGUgeyBBY3Rpb25Db21tYW5kLCBUeXBlQ3JlYXRlQ29tbWFuZCwgVHlwZURlbGV0ZUNvbW1hbmQsIFR5cGVVcGRhdGVDb21tYW5kIH0gZnJvbSAnLi9jb21tYW5kLXR5cGVzLmpzJztcbmltcG9ydCB7IENBUkRTX0VOVl9WQVJTLCBleHRyYWN0QWN0aW9uSW5wdXQsIGV4dHJhY3RUeXBlSW5wdXQgfSBmcm9tICcuL2Vudi5qcyc7XG5pbXBvcnQgeyBFWElUX0NPREVTLCB3cml0ZUVycm9yIH0gZnJvbSAnLi9leGl0LWNvZGVzLmpzJztcbmltcG9ydCB0eXBlIHsgQWN0aW9uQ29udGV4dCwgQWN0aW9uSW5wdXQsIFR5cGVIb29rQ29udGV4dCwgVHlwZUhvb2tJbnB1dCB9IGZyb20gJy4vaW5wdXRzLmpzJztcbmltcG9ydCB7IGxvZ2dlciB9IGZyb20gJy4vbG9nZ2VyLmpzJztcbmltcG9ydCB0eXBlIHsgU29ja2V0Q29tbWFuZCB9IGZyb20gJy4vc29ja2V0LWNsaWVudC5qcyc7XG5pbXBvcnQgeyBTb2NrZXRDbGllbnQgfSBmcm9tICcuL3NvY2tldC1jbGllbnQuanMnO1xuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBDb21tYW5kIFR5cGUgVW5pb25cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuLyoqXG4gKiBVbmlvbiBvZiBhbGwgY29tbWFuZCB0eXBlcyBzdXBwb3J0ZWQgYnkgdGhlIHJ1bnRpbWUuXG4gKlxuICogVGhpcyB0eXBlIHVuaW9uIGFsbG93cyB7QGxpbmsgZXhlY3V0ZUNvbW1hbmR9IHRvIGFjY2VwdCBhbnkgY29tbWFuZCByZXR1cm5lZCBieVxuICogdGhlIGZhY3RvcnkgZnVuY3Rpb25zLiBUaGUgcnVudGltZSBkaXNwYXRjaGVzIGJhc2VkIG9uIHRoZSBgZmFjdG9yeVR5cGVgXG4gKiBkaXNjcmltaW5hbnQuXG4gKlxuICogTm90ZTogVHlwZVZhbGlkYXRvckNvbW1hbmQgaXMgZXhjbHVkZWQgYmVjYXVzZSB2YWxpZGF0b3JzIHVzZSBhIGRpZmZlcmVudFxuICogZXhlY3V0aW9uIG1vZGVsIChmaWxlLXBhdGggcHJvdG9jb2wgdmlhIHtAbGluayBleGVjdXRlVmFsaWRhdGlvbn0pLlxuICpcbiAqIEBpbnRlcm5hbFxuICovXG50eXBlIEFueUNvbW1hbmQgPSBBY3Rpb25Db21tYW5kIHwgVHlwZUNyZWF0ZUNvbW1hbmQgfCBUeXBlVXBkYXRlQ29tbWFuZCB8IFR5cGVEZWxldGVDb21tYW5kO1xuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBIZWxwZXIgRnVuY3Rpb25zXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbi8qKlxuICogTm9ybWFsaXplcyBhbiB1bmtub3duIGVycm9yIHZhbHVlIGludG8gYSBodW1hbi1yZWFkYWJsZSBtZXNzYWdlLlxuICpcbiAqIEVycm9ycyBpbiBKYXZhU2NyaXB0IGNhbiBiZSB0aHJvd24gd2l0aCBhbnkgdmFsdWUuIFRoaXMgZnVuY3Rpb24gZW5zdXJlc1xuICogd2UgYWx3YXlzIGdldCBhIHN0cmluZyBtZXNzYWdlIHJlZ2FyZGxlc3Mgb2Ygd2hhdCB3YXMgdGhyb3duLlxuICpcbiAqIEBwYXJhbSBlcnJvciAtIFRoZSBjYXVnaHQgZXJyb3IgdmFsdWUsIHdoaWNoIG1heSBvciBtYXkgbm90IGJlIGFuIEVycm9yIGluc3RhbmNlXG4gKiBAcmV0dXJucyBBIHN0cmluZyBtZXNzYWdlIHN1aXRhYmxlIGZvciBsb2dnaW5nIG9yIGRpc3BsYXlcbiAqXG4gKiBAaW50ZXJuYWxcbiAqL1xuZnVuY3Rpb24gZ2V0RXJyb3JNZXNzYWdlKGVycm9yOiB1bmtub3duKTogc3RyaW5nIHtcbiAgcmV0dXJuIGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogU3RyaW5nKGVycm9yKTtcbn1cblxuLyoqXG4gKiBDbGVhbnMgdXAgbG9nZ2VyIHN0YXRlIGFuZCB0ZXJtaW5hdGVzIHRoZSBwcm9jZXNzLlxuICpcbiAqIFRoaXMgZnVuY3Rpb24gbmV2ZXIgcmV0dXJucy4gSXQgY2xlYXJzIHRoZSBsb2dnZXIncyBjb250ZXh0LCBjbG9zZXNcbiAqIG9wZW4gZmlsZSBoYW5kbGVzIHRvIGZsdXNoIHBlbmRpbmcgd3JpdGVzLCBhbmQgZXhpdHMgd2l0aCB0aGUgc3BlY2lmaWVkXG4gKiBjb2RlLlxuICpcbiAqIEBwYXJhbSBleGl0Q29kZSAtIFRoZSBleGl0IGNvZGUgdG8gcGFzcyB0byBgcHJvY2Vzcy5leGl0KClgXG4gKiBAcmV0dXJucyBOZXZlciByZXR1cm5zOyBwcm9jZXNzIHRlcm1pbmF0ZXNcbiAqXG4gKiBAaW50ZXJuYWxcbiAqL1xuZnVuY3Rpb24gY2xlYW51cEFuZEV4aXQoZXhpdENvZGU6IG51bWJlcik6IG5ldmVyIHtcbiAgbG9nZ2VyLmNsZWFyQ29udGV4dCgpO1xuICBsb2dnZXIuY2xvc2UoKTtcbiAgcHJvY2Vzcy5leGl0KGV4aXRDb2RlKTtcbn1cblxuLyoqXG4gKiBIYW5kbGVzIGVycm9ycyBkdXJpbmcgZW52aXJvbm1lbnQgdmFyaWFibGUgZXh0cmFjdGlvbi5cbiAqXG4gKiBFbnZpcm9ubWVudCBleHRyYWN0aW9uIGNhbiBmYWlsIGlmIHJlcXVpcmVkIHZhcmlhYmxlcyBhcmUgbWlzc2luZyBvclxuICogbWFsZm9ybWVkLiBUaGlzIHByb3ZpZGVzIHVzZXItZnJpZW5kbHkgZXJyb3Igb3V0cHV0IGFuZCBlbnN1cmVzIHByb3BlclxuICogY2xlYW51cCBiZWZvcmUgZXhpdC5cbiAqXG4gKiBAcGFyYW0gZXJyb3IgLSBUaGUgZXJyb3IgdGhyb3duIGR1cmluZyBleHRyYWN0aW9uXG4gKiBAcmV0dXJucyBOZXZlciByZXR1cm5zOyBwcm9jZXNzIHRlcm1pbmF0ZXMgd2l0aCBlcnJvciBjb2RlXG4gKlxuICogQGludGVybmFsXG4gKi9cbmZ1bmN0aW9uIGhhbmRsZUVudkV4dHJhY3Rpb25FcnJvcihlcnJvcjogdW5rbm93bik6IG5ldmVyIHtcbiAgY29uc3QgbWVzc2FnZSA9IGdldEVycm9yTWVzc2FnZShlcnJvcik7XG4gIGxvZ2dlci5lcnJvcihgRmFpbGVkIHRvIGV4dHJhY3QgaW5wdXQgZnJvbSBlbnZpcm9ubWVudDogJHttZXNzYWdlfWApO1xuICB3cml0ZUVycm9yKGBIYW5kbGVyIGZhaWxlZDogJHttZXNzYWdlfWApO1xuICBjbGVhbnVwQW5kRXhpdChFWElUX0NPREVTLkVSUk9SKTtcbn1cblxuLyoqXG4gKiBIYW5kbGVzIGVycm9ycyB0aHJvd24gYnkgdGhlIHVzZXIncyBjb21tYW5kIGhhbmRsZXIuXG4gKlxuICogV2hlbiBhIGhhbmRsZXIgdGhyb3dzIG9yIHJlamVjdHMsIHdlIHdhbnQgdG8gcHJvdmlkZSB1c2VmdWwgZGVidWdnaW5nXG4gKiBpbmZvcm1hdGlvbi4gVGhpcyB3cml0ZXMgdGhlIGZ1bGwgc3RhY2sgdHJhY2UgdG8gc3RkZXJyICh3aGljaCB0aGVcbiAqIGV4ZWN1dGlvbiB3cmFwcGVyIGNhcHR1cmVzKSBhbmQgbG9ncyBhIHN0cnVjdHVyZWQgZXJyb3IgZXZlbnQuXG4gKlxuICogQHBhcmFtIGVycm9yIC0gVGhlIGVycm9yIHRocm93biBvciByZWplY3Rpb24gcmVhc29uIGZyb20gdGhlIGhhbmRsZXJcbiAqIEByZXR1cm5zIE5ldmVyIHJldHVybnM7IHByb2Nlc3MgdGVybWluYXRlcyB3aXRoIGVycm9yIGNvZGVcbiAqXG4gKiBAaW50ZXJuYWxcbiAqL1xuZnVuY3Rpb24gaGFuZGxlSGFuZGxlckVycm9yKGVycm9yOiB1bmtub3duKTogbmV2ZXIge1xuICBjb25zdCBlcnJvck91dHB1dCA9IGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyAoZXJyb3Iuc3RhY2sgPz8gZXJyb3IubWVzc2FnZSkgOiBTdHJpbmcoZXJyb3IpO1xuICBwcm9jZXNzLnN0ZGVyci53cml0ZShgJHtlcnJvck91dHB1dH1cXG5gKTtcbiAgbG9nZ2VyLmVycm9yKGBIYW5kbGVyIGVycm9yOiAke2dldEVycm9yTWVzc2FnZShlcnJvcil9YCk7XG4gIGNsZWFudXBBbmRFeGl0KEVYSVRfQ09ERVMuRVJST1IpO1xufVxuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBFeGVjdXRlIEZ1bmN0aW9uXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbi8qKlxuICogRXhlY3V0ZXMgYSBjb21tYW5kIGhhbmRsZXIgd2l0aCBmdWxsIHJ1bnRpbWUgb3JjaGVzdHJhdGlvbi5cbiAqXG4gKiBUaGlzIGlzIHRoZSBtYWluIGVudHJ5IHBvaW50IHRoYXQgY29tcGlsZWQgaGFuZGxlcnMgdXNlLiBUaGUgQ0xJIGdlbmVyYXRlc1xuICogd3JhcHBlciBjb2RlIHRoYXQgaW1wb3J0cyB0aGUgdXNlcidzIGNvbW1hbmQgYW5kIHBhc3NlcyBpdCB0byB0aGlzIGZ1bmN0aW9uLlxuICogRnJvbSB0aGVyZSwgZXhlY3V0ZUNvbW1hbmQgaGFuZGxlcyBhbGwgdGhlIGNlcmVtb255OiBlbnZpcm9ubWVudCBwYXJzaW5nLCBsb2dnaW5nXG4gKiBzZXR1cCwgaGFuZGxlciBpbnZvY2F0aW9uLCBlcnJvciBoYW5kbGluZywgYW5kIHByb2Nlc3MgdGVybWluYXRpb24uXG4gKlxuICogVGhlIGZ1bmN0aW9uIGV4aXRzIHRoZSBwcm9jZXNzIGluIGFsbCBub3JtYWwgY29kZSBwYXRocy4gVGhlIHJldHVybmVkXG4gKiBwcm9taXNlIG9ubHkgcmVzb2x2ZXMgaWYgYHByb2Nlc3MuZXhpdGAgaXMgbW9ja2VkLCB3aGljaCBoYXBwZW5zIGluIHRlc3RcbiAqIHNjZW5hcmlvcy4gUHJvZHVjdGlvbiBjb2RlIHNob3VsZCBub3QgYXdhaXQgdGhpcyBmdW5jdGlvbiBvciBleHBlY3QgaXRcbiAqIHRvIHJldHVybi5cbiAqXG4gKiAjIyBTdXBwb3J0ZWQgQ29tbWFuZCBUeXBlc1xuICpcbiAqIC0gKipBY3Rpb24qKiAoYGFjdGlvbmApOiBJbnZva2VkIHdoZW4gYW4gYWN0aW9uIGlzIHRyaWdnZXJlZFxuICogLSAqKlR5cGUgQ3JlYXRlKiogKGB0eXBlQ3JlYXRlYCk6IFJ1bnMgYWZ0ZXIgbmV3IHR5cGVkIGZpbGUgY3JlYXRpb25cbiAqIC0gKipUeXBlIFVwZGF0ZSoqIChgdHlwZVVwZGF0ZWApOiBSdW5zIGFmdGVyIHR5cGVkIGZpbGUgbW9kaWZpY2F0aW9uXG4gKiAtICoqVHlwZSBEZWxldGUqKiAoYHR5cGVEZWxldGVgKTogUnVucyB3aGVuIHR5cGVkIGZpbGUgaXMgZGVsZXRlZFxuICpcbiAqIE5vdGU6IFR5cGUgdmFsaWRhdG9ycyB1c2UgYSBkaWZmZXJlbnQgZXhlY3V0aW9uIG1vZGVsIChmaWxlLXBhdGggcHJvdG9jb2wpXG4gKiBhbmQgc2hvdWxkIGJlIGV4ZWN1dGVkIHZpYSB7QGxpbmsgZXhlY3V0ZVZhbGlkYXRpb259IGluc3RlYWQuXG4gKlxuICogIyMgRXJyb3IgSGFuZGxpbmdcbiAqXG4gKiBFcnJvcnMgYXJlIGhhbmRsZWQgYXQgdGhyZWUgbGV2ZWxzOlxuICpcbiAqIDEuICoqRW52aXJvbm1lbnQgZXh0cmFjdGlvbiBlcnJvcnMqKiAobWlzc2luZy9pbnZhbGlkIHZhcmlhYmxlcyk6IExvZyB0aGVcbiAqICAgIGVycm9yIGFuZCBleGl0LiBUaGVzZSBpbmRpY2F0ZSBhIHByb2JsZW0gd2l0aCBob3cgdGhlIGhhbmRsZXIgd2FzIGludm9rZWQuXG4gKlxuICogMi4gKipIYW5kbGVyIGVycm9ycyoqICh1c2VyIGNvZGUgdGhyb3dzKTogV3JpdGUgdGhlIHN0YWNrIHRyYWNlIHRvIHN0ZGVycixcbiAqICAgIGxvZyBhIHN0cnVjdHVyZWQgZXJyb3IsIGFuZCBleGl0LiBUaGUgZXhlY3V0aW9uIHdyYXBwZXIgY2FwdHVyZXMgc3RkZXJyXG4gKiAgICBmb3IgZGVidWdnaW5nLlxuICpcbiAqIDMuICoqVW5leHBlY3RlZCBlcnJvcnMqKjogQ2F0Y2gtYWxsIGZvciBhbnkgb3RoZXIgZmFpbHVyZXMgZHVyaW5nIHJ1bnRpbWVcbiAqICAgIG9yY2hlc3RyYXRpb24uXG4gKlxuICogQHBhcmFtIGNvbW1hbmQgLSBUaGUgY29tbWFuZCB0byBleGVjdXRlLCByZXR1cm5lZCBmcm9tIGEgZmFjdG9yeSBmdW5jdGlvblxuICogQHJldHVybnMgQSBwcm9taXNlIHRoYXQgcmVzb2x2ZXMgb25seSB3aGVuIGBwcm9jZXNzLmV4aXRgIGlzIG1vY2tlZCAodGVzdHMpXG4gKlxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIC8vIEdlbmVyYXRlZCB3cmFwcGVyIGNvZGUgKHByb2R1Y2VkIGJ5IENMSSlcbiAqIGltcG9ydCB7IGV4ZWN1dGVDb21tYW5kIH0gZnJvbSAnQGNhcmRzL3Nkay9jb25maWcvcnVudGltZSc7XG4gKiBpbXBvcnQgY29tbWFuZCBmcm9tICcuL3VzZXItY29tbWFuZC5qcyc7XG4gKlxuICogLy8gVGhpcyBjYWxsIG5ldmVyIHJldHVybnMgaW4gcHJvZHVjdGlvblxuICogZXhlY3V0ZUNvbW1hbmQoY29tbWFuZCk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGV4ZWN1dGVDb21tYW5kKGNvbW1hbmQ6IEFueUNvbW1hbmQpOiBQcm9taXNlPHZvaWQ+IHtcbiAgdHJ5IHtcbiAgICBsZXQgaW5wdXQ6IEFjdGlvbklucHV0IHwgVHlwZUhvb2tJbnB1dDtcblxuICAgIHRyeSB7XG4gICAgICBpZiAoY29tbWFuZC5mYWN0b3J5VHlwZSA9PT0gJ2FjdGlvbicpIHtcbiAgICAgICAgaW5wdXQgPSBleHRyYWN0QWN0aW9uSW5wdXQoKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGlucHV0ID0gZXh0cmFjdFR5cGVJbnB1dCgpO1xuICAgICAgfVxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICByZXR1cm4gaGFuZGxlRW52RXh0cmFjdGlvbkVycm9yKGVycm9yKTtcbiAgICB9XG5cbiAgICAvLyBTZXQgbG9nZ2VyIGNvbnRleHQgd2l0aCBjb21tYW5kIHR5cGVcbiAgICBsb2dnZXIuc2V0Q29udGV4dChjb21tYW5kLmZhY3RvcnlUeXBlLCB7IC4uLmlucHV0IH0pO1xuXG4gICAgaWYgKGNvbW1hbmQuZmFjdG9yeVR5cGUgPT09ICdhY3Rpb24nKSB7XG4gICAgICAvLyBTb2NrZXQgY29ubmVjdGlvbiBhbmQgQWN0aW9uQ29udGV4dCBmb3IgYWN0aW9uIGNvbW1hbmRzXG4gICAgICBsZXQgc29ja2V0Q2xpZW50OiBTb2NrZXRDbGllbnQgfCB1bmRlZmluZWQ7XG4gICAgICBjb25zdCBzb2NrZXRQYXRoID0gcHJvY2Vzcy5lbnZbQ0FSRFNfRU5WX1ZBUlMuU09DS0VUX1BBVEhdO1xuICAgICAgaWYgKHNvY2tldFBhdGgpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBzb2NrZXRDbGllbnQgPSBhd2FpdCBTb2NrZXRDbGllbnQuY29ubmVjdChzb2NrZXRQYXRoKTtcbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICBsb2dnZXIud2FybihgRmFpbGVkIHRvIGNvbm5lY3QgdG8gc29ja2V0IGF0ICR7c29ja2V0UGF0aH06ICR7Z2V0RXJyb3JNZXNzYWdlKGVycm9yKX1gKTtcbiAgICAgICAgICAvLyBGYWlsLW9wZW46IGNvbnRpbnVlIHdpdGhvdXQgc29ja2V0XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgLy8gQ2FsbGJhY2sgcmVnaXN0cmF0aW9uIHN0YXRlXG4gICAgICBsZXQgY2FuY2VsQ2FsbGJhY2s6ICgoKSA9PiB2b2lkIHwgUHJvbWlzZTx2b2lkPikgfCB1bmRlZmluZWQ7XG4gICAgICBsZXQgc3dpdGNoVG9JbnRlcmFjdGl2ZUNhbGxiYWNrOiAoKCkgPT4gdW5rbm93biB8IFByb21pc2U8dW5rbm93bj4pIHwgdW5kZWZpbmVkO1xuICAgICAgbGV0IGNvbW1hbmRQcm9jZXNzZWQgPSBmYWxzZTtcblxuICAgICAgLy8gQnVpbGQgQWN0aW9uQ29udGV4dCB3aXRoIGxvZ2dlciwgY3dkLCBhbmQgc29ja2V0LWJhY2tlZCBjYWxsYmFja3NcbiAgICAgIGNvbnN0IGNvbnRleHQ6IEFjdGlvbkNvbnRleHQgPSB7XG4gICAgICAgIGxvZ2dlcixcbiAgICAgICAgY3dkOiBwcm9jZXNzLmN3ZCgpLFxuICAgICAgICBvbkNhbmNlbDogKGNhbGxiYWNrKSA9PiB7XG4gICAgICAgICAgY2FuY2VsQ2FsbGJhY2sgPSBjYWxsYmFjaztcbiAgICAgICAgfSxcbiAgICAgICAgb25Td2l0Y2hUb0ludGVyYWN0aXZlOiAoY2FsbGJhY2spID0+IHtcbiAgICAgICAgICBzd2l0Y2hUb0ludGVyYWN0aXZlQ2FsbGJhY2sgPSBjYWxsYmFjaztcbiAgICAgICAgfVxuICAgICAgfTtcblxuICAgICAgLy8gV2lyZSBzb2NrZXQgY29tbWFuZCBkaXNwYXRjaFxuICAgICAgaWYgKHNvY2tldENsaWVudCkge1xuICAgICAgICBzb2NrZXRDbGllbnQub25Db21tYW5kKChjbWQ6IFNvY2tldENvbW1hbmQpID0+IHtcbiAgICAgICAgICAvLyBGaXJzdC13aW5zIHNlbWFudGljczogaWdub3JlIHN1YnNlcXVlbnQgY29tbWFuZHNcbiAgICAgICAgICBpZiAoY29tbWFuZFByb2Nlc3NlZCkgcmV0dXJuO1xuICAgICAgICAgIGNvbW1hbmRQcm9jZXNzZWQgPSB0cnVlO1xuXG4gICAgICAgICAgaWYgKGNtZC50eXBlID09PSAnY2FuY2VsJykge1xuICAgICAgICAgICAgaGFuZGxlQ2FuY2VsQ29tbWFuZChjYW5jZWxDYWxsYmFjaywgc29ja2V0Q2xpZW50KTtcbiAgICAgICAgICB9IGVsc2UgaWYgKGNtZC50eXBlID09PSAnc3dpdGNoVG9JbnRlcmFjdGl2ZScpIHtcbiAgICAgICAgICAgIGhhbmRsZVN3aXRjaFRvSW50ZXJhY3RpdmVDb21tYW5kKHN3aXRjaFRvSW50ZXJhY3RpdmVDYWxsYmFjaywgc29ja2V0Q2xpZW50ISk7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgICAgLy8gRXhlY3V0ZSB0aGUgYWN0aW9uIGNvbW1hbmQgaGFuZGxlclxuICAgICAgdHJ5IHtcbiAgICAgICAgYXdhaXQgY29tbWFuZChpbnB1dCBhcyBBY3Rpb25JbnB1dCwgY29udGV4dCk7XG4gICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICBzb2NrZXRDbGllbnQ/LmNsb3NlKCk7XG4gICAgICAgIHJldHVybiBoYW5kbGVIYW5kbGVyRXJyb3IoZXJyb3IpO1xuICAgICAgfVxuXG4gICAgICAvLyBDbGVhbiB1cCBzb2NrZXQgYW5kIGV4aXQgc3VjY2Vzc2Z1bGx5XG4gICAgICBzb2NrZXRDbGllbnQ/LmNsb3NlKCk7XG4gICAgICBjbGVhbnVwQW5kRXhpdChFWElUX0NPREVTLlNVQ0NFU1MpO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBUeXBlSG9va0NvbnRleHQgZm9yIHR5cGUgbGlmZWN5Y2xlIGhvb2tzXG4gICAgICBjb25zdCBjb250ZXh0OiBUeXBlSG9va0NvbnRleHQgPSB7XG4gICAgICAgIGxvZ2dlcixcbiAgICAgICAgY3dkOiBwcm9jZXNzLmN3ZCgpXG4gICAgICB9O1xuXG4gICAgICAvLyBFeGVjdXRlIHRoZSB0eXBlIGhvb2sgY29tbWFuZCBoYW5kbGVyXG4gICAgICB0cnkge1xuICAgICAgICBhd2FpdCBjb21tYW5kKGlucHV0IGFzIFR5cGVIb29rSW5wdXQsIGNvbnRleHQpO1xuICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgcmV0dXJuIGhhbmRsZUhhbmRsZXJFcnJvcihlcnJvcik7XG4gICAgICB9XG5cbiAgICAgIGNsZWFudXBBbmRFeGl0KEVYSVRfQ09ERVMuU1VDQ0VTUyk7XG4gICAgfVxuICB9IGNhdGNoIChlcnJvcikge1xuICAgIC8vIFVuZXhwZWN0ZWQgZXJyb3IgLSB0cnkgdG8gY2xlYW4gdXAgYW5kIGV4aXRcbiAgICBsb2dnZXIuZXJyb3IoYFVuZXhwZWN0ZWQgcnVudGltZSBlcnJvcjogJHtnZXRFcnJvck1lc3NhZ2UoZXJyb3IpfWApO1xuICAgIGNsZWFudXBBbmRFeGl0KEVYSVRfQ09ERVMuRVJST1IpO1xuICB9XG59XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIFNvY2tldCBDb21tYW5kIEhhbmRsZXJzXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbi8qKlxuICogUmVzb2x2ZXMgYSBjYWxsYmFjayByZXN1bHQgdGhhdCBtYXkgYmUgc3luYyBvciBhc3luYyBpbnRvIGEgUHJvbWlzZS5cbiAqXG4gKiBVc2VyLXJlZ2lzdGVyZWQgY2FsbGJhY2tzIG1heSByZXR1cm4gdm9pZCwgYSB2YWx1ZSwgb3IgYSBQcm9taXNlLlxuICogVGhpcyBub3JtYWxpemVzIGFsbCBjYXNlcyBpbnRvIGEgc2luZ2xlIFByb21pc2UgZm9yIGNvbnNpc3RlbnQgaGFuZGxpbmcuXG4gKlxuICogQHBhcmFtIHJlc3VsdCAtIENhbGxiYWNrIHJldHVybiB2YWx1ZSB0aGF0IG1heSBhbHJlYWR5IGJlIGEgcHJvbWlzZS5cbiAqIEByZXR1cm5zIFByb21pc2UgcmVzb2x2aW5nIHRvIHRoZSBjYWxsYmFjayByZXN1bHQuXG4gKiBAaW50ZXJuYWxcbiAqL1xuZnVuY3Rpb24gdG9Qcm9taXNlPFQ+KHJlc3VsdDogVCB8IFByb21pc2U8VD4pOiBQcm9taXNlPFQ+IHtcbiAgaWYgKHJlc3VsdCAmJiB0eXBlb2YgKHJlc3VsdCBhcyBQcm9taXNlPFQ+KS50aGVuID09PSAnZnVuY3Rpb24nKSB7XG4gICAgcmV0dXJuIHJlc3VsdCBhcyBQcm9taXNlPFQ+O1xuICB9XG4gIHJldHVybiBQcm9taXNlLnJlc29sdmUocmVzdWx0KTtcbn1cblxuLyoqXG4gKiBIYW5kbGVzIGEgYGNhbmNlbGAgY29tbWFuZCBmcm9tIHRoZSBzb2NrZXQuXG4gKlxuICogSWYgYSBjYW5jZWwgY2FsbGJhY2sgd2FzIHJlZ2lzdGVyZWQsIGl0IGlzIGludm9rZWQuIE90aGVyd2lzZSwgU0lHVEVSTVxuICogaXMgc2VudCB0byB0aGUgY3VycmVudCBwcm9jZXNzIGFzIGEgZmFsbGJhY2suIEFmdGVyIHRoZSBjYWxsYmFjayBjb21wbGV0ZXNcbiAqIChvciBpbW1lZGlhdGVseSBpZiBubyBjYWxsYmFjayksIHRoZSBwcm9jZXNzIGV4aXRzIHdpdGggZXJyb3IgY29kZS5cbiAqXG4gKiBAcGFyYW0gY2FsbGJhY2sgLSBUaGUgcmVnaXN0ZXJlZCBjYW5jZWwgY2FsbGJhY2ssIGlmIGFueVxuICogQHBhcmFtIHNvY2tldENsaWVudCAtIFRoZSBzb2NrZXQgY2xpZW50IHRvIGNsb3NlIGJlZm9yZSBleGl0aW5nXG4gKlxuICogQGludGVybmFsXG4gKi9cbmZ1bmN0aW9uIGhhbmRsZUNhbmNlbENvbW1hbmQoXG4gIGNhbGxiYWNrOiAoKCkgPT4gdm9pZCB8IFByb21pc2U8dm9pZD4pIHwgdW5kZWZpbmVkLFxuICBzb2NrZXRDbGllbnQ6IFNvY2tldENsaWVudCB8IHVuZGVmaW5lZFxuKTogdm9pZCB7XG4gIGlmICghY2FsbGJhY2spIHtcbiAgICBwcm9jZXNzLmtpbGwocHJvY2Vzcy5waWQsICdTSUdURVJNJyk7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgdG9Qcm9taXNlKGNhbGxiYWNrKCkpLnRoZW4oXG4gICAgKCkgPT4ge1xuICAgICAgc29ja2V0Q2xpZW50Py5jbG9zZSgpO1xuICAgICAgY2xlYW51cEFuZEV4aXQoRVhJVF9DT0RFUy5FUlJPUik7XG4gICAgfSxcbiAgICAoKSA9PiB7XG4gICAgICBzb2NrZXRDbGllbnQ/LmNsb3NlKCk7XG4gICAgICBjbGVhbnVwQW5kRXhpdChFWElUX0NPREVTLkVSUk9SKTtcbiAgICB9XG4gICk7XG59XG5cbi8qKlxuICogSGFuZGxlcyBhIGBzd2l0Y2hUb0ludGVyYWN0aXZlYCBjb21tYW5kIGZyb20gdGhlIHNvY2tldC5cbiAqXG4gKiBJZiBubyBjYWxsYmFjayB3YXMgcmVnaXN0ZXJlZCwgdGhlIGNvbW1hbmQgaXMgaWdub3JlZCAobm8tb3ApLiBPdGhlcndpc2UsXG4gKiB0aGUgY2FsbGJhY2sgaXMgaW52b2tlZCBhbmQgaXRzIHJldHVybiB2YWx1ZSBpcyBzZW50IGFzXG4gKiBgc3dpdGNoVG9JbnRlcmFjdGl2ZVJlc3BvbnNlYCBvbiB0aGUgc29ja2V0LiBgcHJvY2Vzcy5leGl0KDQyKWAgaXMgY2FsbGVkXG4gKiBpbnNpZGUgdGhlIGB3cml0ZSgpYCBjYWxsYmFjayB0byBndWFyYW50ZWUgdGhlIHJlc3BvbnNlIGlzIGZsdXNoZWQgYmVmb3JlXG4gKiB0aGUgZXZlbnQgbG9vcCB0ZWFycyBkb3duLlxuICpcbiAqIEBwYXJhbSBjYWxsYmFjayAtIFRoZSByZWdpc3RlcmVkIHN3aXRjaFRvSW50ZXJhY3RpdmUgY2FsbGJhY2ssIGlmIGFueVxuICogQHBhcmFtIHNvY2tldENsaWVudCAtIFRoZSBzb2NrZXQgY2xpZW50IHVzZWQgdG8gc2VuZCB0aGUgcmVzcG9uc2VcbiAqXG4gKiBAaW50ZXJuYWxcbiAqL1xuZnVuY3Rpb24gaGFuZGxlU3dpdGNoVG9JbnRlcmFjdGl2ZUNvbW1hbmQoXG4gIGNhbGxiYWNrOiAoKCkgPT4gdW5rbm93biB8IFByb21pc2U8dW5rbm93bj4pIHwgdW5kZWZpbmVkLFxuICBzb2NrZXRDbGllbnQ6IFNvY2tldENsaWVudFxuKTogdm9pZCB7XG4gIGlmICghY2FsbGJhY2spIHtcbiAgICByZXR1cm47XG4gIH1cblxuICB0b1Byb21pc2UoY2FsbGJhY2soKSkudGhlbihcbiAgICAoZGF0YSkgPT4ge1xuICAgICAgc29ja2V0Q2xpZW50LnNlbmRSZXNwb25zZVRoZW4oeyB0eXBlOiAnc3dpdGNoVG9JbnRlcmFjdGl2ZVJlc3BvbnNlJywgZGF0YSB9LCAoKSA9PiB7XG4gICAgICAgIGNsZWFudXBBbmRFeGl0KEVYSVRfQ09ERVMuU1dJVENIX1RPX0lOVEVSQUNUSVZFKTtcbiAgICAgIH0pO1xuICAgIH0sXG4gICAgKGVycm9yKSA9PiB7XG4gICAgICBsb2dnZXIuZXJyb3IoYHN3aXRjaFRvSW50ZXJhY3RpdmUgY2FsbGJhY2sgZXJyb3I6ICR7Z2V0RXJyb3JNZXNzYWdlKGVycm9yKX1gKTtcbiAgICAgIHNvY2tldENsaWVudC5jbG9zZSgpO1xuICAgICAgY2xlYW51cEFuZEV4aXQoRVhJVF9DT0RFUy5FUlJPUik7XG4gICAgfVxuICApO1xufVxuIiwgIi8qKlxuICogU2hhcmVkIHNlc3Npb24gdXRpbGl0aWVzIGZvciBDb2RleCBhY3Rpb24gd29ya2Zsb3dzLlxuICpcbiAqIFJldXNlcyB0aGUgZXhpc3Rpbmcgd29ya3RyZWUgbGlmZWN5Y2xlIHVzZWQgYnkgQ2xhdWRlLWJhc2VkIGFjdGlvbnMsIHdoaWxlXG4gKiB0YWlsb3JpbmcgcHJvY2VzcyBzcGF3biBhcmd1bWVudHMgYW5kIGVudmlyb25tZW50IGZvciB0aGUgYGNvZGV4YCBDTEkuXG4gKlxuICogQHN1bW1hcnkgU2hhcmVkIHNlc3Npb24gdXRpbGl0aWVzIGZvciBDb2RleCBhY3Rpb24gd29ya2Zsb3dzXG4gKiBAbW9kdWxlXG4gKi9cblxuaW1wb3J0IHsgdHlwZSBDaGlsZFByb2Nlc3MsIHNwYXduIH0gZnJvbSAnbm9kZTpjaGlsZF9wcm9jZXNzJztcbmltcG9ydCAqIGFzIGZzIGZyb20gJ25vZGU6ZnMvcHJvbWlzZXMnO1xuaW1wb3J0IHsgaG9tZWRpciB9IGZyb20gJ25vZGU6b3MnO1xuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdub2RlOnBhdGgnO1xuaW1wb3J0IHsgQ2FyZHNDbGllbnQgfSBmcm9tICdAY2FyZHMvc2RrL2NsaWVudCc7XG5pbXBvcnQgdHlwZSB7IEFjdGlvbkNvbnRleHQsIEFjdGlvbklucHV0IH0gZnJvbSAnQGNhcmRzL3Nkay9jb25maWcnO1xuaW1wb3J0IHtcbiAgY2xlYW51cE1lcmdlZEJyYW5jaGVzLFxuICBlcnJvck1lc3NhZ2UsXG4gIHJlc29sdmVCYXNlQnJhbmNoLFxuICByZXNvbHZlTWFya2V0cGxhY2VQYXRoLFxuICByZXNvbHZlT3JDcmVhdGVXb3JrdHJlZVxufSBmcm9tICcuL2NsYXVkZS1zZXNzaW9uLmpzJztcblxuLyoqXG4gKiBPcHRpb25zIGZvciB7QGxpbmsgc3Bhd25Db2RleFNlc3Npb259LlxuICovXG5leHBvcnQgaW50ZXJmYWNlIENvZGV4U2Vzc2lvbk9wdGlvbnMge1xuICAvKiogUHJvbXB0IHN0cmluZyBwYXNzZWQgdG8gdGhlIENvZGV4IENMSS4gKi9cbiAgcHJvbXB0OiBzdHJpbmc7XG59XG5cbi8qKlxuICogTWluaW1hbCBtYW5pZmVzdCBzaGFwZSByZXF1aXJlZCBieSB0aGUgQ29kZXggcGx1Z2luIGxvYWRlci5cbiAqL1xuaW50ZXJmYWNlIENvZGV4UGx1Z2luTWFuaWZlc3Qge1xuICBuYW1lOiBzdHJpbmc7XG4gIHZlcnNpb246IHN0cmluZztcbn1cblxuY29uc3QgQ09ERVhfUExVR0lOX05BTUUgPSAnY29kZXgtcnVudGltZSc7XG5jb25zdCBDT0RFWF9QTFVHSU5fTUFSS0VUUExBQ0UgPSAnbG9jYWwnO1xuY29uc3QgQ09ERVhfUlVOVElNRV9TS0lMTF9OQU1FID0gJ2NhcmRzLXJ1bnRpbWUnO1xuXG4vKipcbiAqIFJlc29sdmVzIHRoZSBwYWNrYWdlZCBDb2RleCBwbHVnaW4gYnVuZGxlZCBpbiB0aGUgZXh0ZW5zaW9uIG1hcmtldHBsYWNlLlxuICpcbiAqIEBwYXJhbSBtYXJrZXRwbGFjZVBhdGggLSBBYnNvbHV0ZSBwYXRoIHRvIHRoZSBwYWNrYWdlZCBtYXJrZXRwbGFjZSBkaXJlY3RvcnkuXG4gKiBAcmV0dXJucyBBYnNvbHV0ZSBwYXRoIHRvIHRoZSBwYWNrYWdlZCBDb2RleCBwbHVnaW4gZGlyZWN0b3J5LlxuICovXG5leHBvcnQgZnVuY3Rpb24gcmVzb2x2ZUNvZGV4UGx1Z2luUGF0aChtYXJrZXRwbGFjZVBhdGg6IHN0cmluZyk6IHN0cmluZyB7XG4gIHJldHVybiBwYXRoLmpvaW4obWFya2V0cGxhY2VQYXRoLCAncGx1Z2lucycsIENPREVYX1BMVUdJTl9OQU1FKTtcbn1cblxuLyoqXG4gKiBSZXNvbHZlcyB0aGUgQ29kZXggaG9tZSBkaXJlY3RvcnkgdXNlZCBmb3IgcGx1Z2luIGNhY2hlIGluc3RhbGxhdGlvbi5cbiAqXG4gKiBAcmV0dXJucyBBYnNvbHV0ZSBwYXRoIHRvIHRoZSBDb2RleCBob21lIGRpcmVjdG9yeS5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJlc29sdmVDb2RleEhvbWUoKTogc3RyaW5nIHtcbiAgcmV0dXJuIHByb2Nlc3MuZW52WydDT0RFWF9IT01FJ10gPz8gcGF0aC5qb2luKGhvbWVkaXIoKSwgJy5jb2RleCcpO1xufVxuXG4vKipcbiAqIFJlYWRzIGFuZCB2YWxpZGF0ZXMgdGhlIHBhY2thZ2VkIENvZGV4IHBsdWdpbiBtYW5pZmVzdC5cbiAqXG4gKiBAcGFyYW0gcGx1Z2luUGF0aCAtIEFic29sdXRlIHBhdGggdG8gdGhlIHBhY2thZ2VkIENvZGV4IHBsdWdpbiBkaXJlY3RvcnkuXG4gKiBAcmV0dXJucyBQYXJzZWQgcGx1Z2luIG1hbmlmZXN0LlxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcmVhZENvZGV4UGx1Z2luTWFuaWZlc3QocGx1Z2luUGF0aDogc3RyaW5nKTogUHJvbWlzZTxDb2RleFBsdWdpbk1hbmlmZXN0PiB7XG4gIGNvbnN0IG1hbmlmZXN0UGF0aCA9IHBhdGguam9pbihwbHVnaW5QYXRoLCAnLmNvZGV4LXBsdWdpbicsICdwbHVnaW4uanNvbicpO1xuICBjb25zdCBtYW5pZmVzdCA9IEpTT04ucGFyc2UoYXdhaXQgZnMucmVhZEZpbGUobWFuaWZlc3RQYXRoLCAndXRmLTgnKSkgYXMgUGFydGlhbDxDb2RleFBsdWdpbk1hbmlmZXN0PjtcblxuICBpZiAobWFuaWZlc3QubmFtZSAhPT0gQ09ERVhfUExVR0lOX05BTUUpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYEludmFsaWQgQ29kZXggcGx1Z2luIG1hbmlmZXN0IG5hbWUgYXQgJHttYW5pZmVzdFBhdGh9OiBleHBlY3RlZCBcIiR7Q09ERVhfUExVR0lOX05BTUV9XCJgKTtcbiAgfVxuICBpZiAodHlwZW9mIG1hbmlmZXN0LnZlcnNpb24gIT09ICdzdHJpbmcnIHx8IG1hbmlmZXN0LnZlcnNpb24ubGVuZ3RoID09PSAwKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBJbnZhbGlkIENvZGV4IHBsdWdpbiBtYW5pZmVzdCB2ZXJzaW9uIGF0ICR7bWFuaWZlc3RQYXRofWApO1xuICB9XG5cbiAgcmV0dXJuIHtcbiAgICBuYW1lOiBtYW5pZmVzdC5uYW1lLFxuICAgIHZlcnNpb246IG1hbmlmZXN0LnZlcnNpb25cbiAgfTtcbn1cblxuLyoqXG4gKiBJbnN0YWxscyB0aGUgcGFja2FnZWQgQ29kZXggcGx1Z2luIGludG8gdGhlIGxvY2FsIENvZGV4IHBsdWdpbiBjYWNoZS5cbiAqXG4gKiBUaGUgcGFja2FnZWQgZXh0ZW5zaW9uIGJ1bmRsZSByZW1haW5zIHRoZSBzb3VyY2Ugb2YgdHJ1dGguIFRoZSBjYWNoZSBlbnRyeSBpc1xuICogcmVwbGFjZWQgYXRvbWljYWxseSBhdCB0aGUgcGx1Z2luIHN1YnRyZWUgYm91bmRhcnkgc28gb25seSBgY29kZXgtcnVudGltZWBcbiAqIGVudHJpZXMgYXJlIHRvdWNoZWQuXG4gKlxuICogQHBhcmFtIG1hcmtldHBsYWNlUGF0aCAtIEFic29sdXRlIHBhdGggdG8gdGhlIHBhY2thZ2VkIG1hcmtldHBsYWNlIGRpcmVjdG9yeS5cbiAqIEByZXR1cm5zIEluc3RhbGxlZCBwbHVnaW4gY2FjaGUgbWV0YWRhdGEuXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBlbnN1cmVDb2RleFBsdWdpbkluc3RhbGxlZChtYXJrZXRwbGFjZVBhdGg6IHN0cmluZyk6IFByb21pc2U8e1xuICBwbHVnaW5QYXRoOiBzdHJpbmc7XG4gIHZlcnNpb246IHN0cmluZztcbiAgY2FjaGVQYXRoOiBzdHJpbmc7XG59PiB7XG4gIGNvbnN0IHBsdWdpblBhdGggPSByZXNvbHZlQ29kZXhQbHVnaW5QYXRoKG1hcmtldHBsYWNlUGF0aCk7XG4gIGNvbnN0IHNraWxsUGF0aCA9IHBhdGguam9pbihwbHVnaW5QYXRoLCAnc2tpbGxzJywgQ09ERVhfUlVOVElNRV9TS0lMTF9OQU1FKTtcblxuICBhd2FpdCBmcy5hY2Nlc3MocGx1Z2luUGF0aCk7XG4gIGF3YWl0IGZzLmFjY2Vzcyhza2lsbFBhdGgpO1xuXG4gIGNvbnN0IG1hbmlmZXN0ID0gYXdhaXQgcmVhZENvZGV4UGx1Z2luTWFuaWZlc3QocGx1Z2luUGF0aCk7XG4gIGNvbnN0IHBsdWdpblZlcnNpb25zUGF0aCA9IHBhdGguam9pbihcbiAgICByZXNvbHZlQ29kZXhIb21lKCksXG4gICAgJ3BsdWdpbnMnLFxuICAgICdjYWNoZScsXG4gICAgQ09ERVhfUExVR0lOX01BUktFVFBMQUNFLFxuICAgIENPREVYX1BMVUdJTl9OQU1FXG4gICk7XG4gIGNvbnN0IGNhY2hlUGF0aCA9IHBhdGguam9pbihwbHVnaW5WZXJzaW9uc1BhdGgsIG1hbmlmZXN0LnZlcnNpb24pO1xuXG4gIGF3YWl0IGZzLnJtKHBsdWdpblZlcnNpb25zUGF0aCwgeyByZWN1cnNpdmU6IHRydWUsIGZvcmNlOiB0cnVlIH0pO1xuICBhd2FpdCBmcy5ta2RpcihwbHVnaW5WZXJzaW9uc1BhdGgsIHsgcmVjdXJzaXZlOiB0cnVlIH0pO1xuICBhd2FpdCBmcy5zeW1saW5rKHBsdWdpblBhdGgsIGNhY2hlUGF0aCwgJ2p1bmN0aW9uJyk7XG5cbiAgcmV0dXJuIHtcbiAgICBwbHVnaW5QYXRoLFxuICAgIHZlcnNpb246IG1hbmlmZXN0LnZlcnNpb24sXG4gICAgY2FjaGVQYXRoXG4gIH07XG59XG5cbi8qKlxuICogQnVpbGRzIHRoZSBDTEkgYXJndW1lbnQgbGlzdCBmb3IgdGhlIGBjb2RleGAgcHJvY2Vzcy5cbiAqXG4gKiBAcGFyYW0gcHJvbXB0IC0gUHJvbXB0IHBhc3NlZCB0byBDb2RleC5cbiAqIEBwYXJhbSB3b3Jrc3BhY2VQYXRoIC0gQ2FyZCB3b3JrdHJlZSBwYXRoIHVzZWQgYXMgdGhlIENvZGV4IHdvcmtzcGFjZSByb290LlxuICogQHBhcmFtIGNhcmRSZXBvUGF0aCAtIEFkZGl0aW9uYWwgd3JpdGFibGUgZGlyZWN0b3J5IGZvciB0aGUgY2FyZCByZXBvLlxuICogQHJldHVybnMgQXJyYXkgb2YgQ0xJIGFyZ3VtZW50cy5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGJ1aWxkQ29kZXhBcmdzKHByb21wdDogc3RyaW5nLCB3b3Jrc3BhY2VQYXRoOiBzdHJpbmcsIGNhcmRSZXBvUGF0aDogc3RyaW5nKTogc3RyaW5nW10ge1xuICByZXR1cm4gW1xuICAgICctLWRhbmdlcm91c2x5LWJ5cGFzcy1hcHByb3ZhbHMtYW5kLXNhbmRib3gnLFxuICAgICctLWNkJyxcbiAgICB3b3Jrc3BhY2VQYXRoLFxuICAgICctLWFkZC1kaXInLFxuICAgIGNhcmRSZXBvUGF0aCxcbiAgICAnLS1jb25maWcnLFxuICAgICdmZWF0dXJlcy5wbHVnaW5zPXRydWUnLFxuICAgICctLWNvbmZpZycsXG4gICAgYHBsdWdpbnMuJHtDT0RFWF9QTFVHSU5fTkFNRX1AJHtDT0RFWF9QTFVHSU5fTUFSS0VUUExBQ0V9LmVuYWJsZWQ9dHJ1ZWAsXG4gICAgcHJvbXB0XG4gIF07XG59XG5cbi8qKlxuICogU3Bhd25zIGEgYGNvZGV4YCBDTEkgc2Vzc2lvbiB3aXRoIHdvcmt0cmVlIGxpZmVjeWNsZSBhbmQgcHJvbXB0LWJhc2VkIHNraWxsIGd1aWRhbmNlLlxuICpcbiAqIEBwYXJhbSBpbnB1dCAtIFBhcnNlZCBhY3Rpb24gaW5wdXQgZnJvbSB0aGUgZW52aXJvbm1lbnQuXG4gKiBAcGFyYW0gY29udGV4dCAtIEFjdGlvbiBjb250ZXh0IHByb3ZpZGluZyBsb2dnZXIgYW5kIGxpZmVjeWNsZSBob29rcy5cbiAqIEBwYXJhbSBvcHRpb25zIC0gU2Vzc2lvbi1zcGVjaWZpYyBwYXJhbWV0ZXJzLlxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gc3Bhd25Db2RleFNlc3Npb24oXG4gIGlucHV0OiBBY3Rpb25JbnB1dCxcbiAgY29udGV4dDogQWN0aW9uQ29udGV4dCxcbiAgb3B0aW9uczogQ29kZXhTZXNzaW9uT3B0aW9uc1xuKTogUHJvbWlzZTx2b2lkPiB7XG4gIGNvbnN0IHsgcHJvbXB0IH0gPSBvcHRpb25zO1xuICBjb25zdCBtYXJrZXRwbGFjZVBhdGggPSByZXNvbHZlTWFya2V0cGxhY2VQYXRoKCk7XG5cbiAgY29udGV4dC5sb2dnZXIuaW5mbyhgJHtpbnB1dC5hY3Rpb25OYW1lfSBhY3Rpb24gc3RhcnRlZGAsIHtcbiAgICBjYXJkSWQ6IGlucHV0LmNhcmRJZCxcbiAgICBlbnZpcm9ubWVudDogaW5wdXQuZW52aXJvbm1lbnQsXG4gICAgZXhlY3V0aW9uTW9kZTogaW5wdXQuZXhlY3V0aW9uTW9kZVxuICB9KTtcblxuICBjb25zdCBjbGllbnQgPSBuZXcgQ2FyZHNDbGllbnQoe1xuICAgIGJhc2VVcmw6IGlucHV0LmFwaUJhc2VVcmwsXG4gICAgYWNjZXNzVG9rZW46IGlucHV0LmFwaUFjY2Vzc1Rva2VuXG4gIH0pO1xuXG4gIGNvbnN0IGJhc2VCcmFuY2ggPSBhd2FpdCByZXNvbHZlQmFzZUJyYW5jaChpbnB1dC5yZXBvUm9vdCwgY2xpZW50KTtcbiAgY29uc3Qge1xuICAgIHdvcmt0cmVlUGF0aDogY3dkLFxuICAgIGJyYW5jaE5hbWUsXG4gICAgcGFyZW50QnJhbmNoXG4gIH0gPSBhd2FpdCByZXNvbHZlT3JDcmVhdGVXb3JrdHJlZShpbnB1dCwgY2xpZW50LCBiYXNlQnJhbmNoLCBjb250ZXh0LmxvZ2dlcik7XG5cbiAgY29udGV4dC5sb2dnZXIuaW5mbygnVXNpbmcgd29ya3RyZWUnLCB7IGN3ZCwgYnJhbmNoOiBicmFuY2hOYW1lLCBiYXNlQnJhbmNoLCBwYXJlbnRCcmFuY2ggfSk7XG4gIGNvbnN0IHsgcGx1Z2luUGF0aCwgdmVyc2lvbiwgY2FjaGVQYXRoIH0gPSBhd2FpdCBlbnN1cmVDb2RleFBsdWdpbkluc3RhbGxlZChtYXJrZXRwbGFjZVBhdGgpO1xuICBjb250ZXh0LmxvZ2dlci5pbmZvKCdJbnN0YWxsZWQgQ29kZXggcnVudGltZSBwbHVnaW4nLCB7XG4gICAgcGx1Z2luUGF0aCxcbiAgICB2ZXJzaW9uLFxuICAgIGNhY2hlUGF0aFxuICB9KTtcblxuICBjb25zdCBhcmdzID0gYnVpbGRDb2RleEFyZ3MocHJvbXB0LCBjd2QsIGlucHV0LmNhcmRSZXBvUGF0aCk7XG5cbiAgY29uc3QgY2hpbGQ6IENoaWxkUHJvY2VzcyA9IHNwYXduKCdjb2RleCcsIGFyZ3MsIHtcbiAgICBjd2QsXG4gICAgc3RkaW86ICdpbmhlcml0JyxcbiAgICBlbnY6IHtcbiAgICAgIC4uLnByb2Nlc3MuZW52LFxuICAgICAgV09SS1NQQUNFX1BBVEg6IGN3ZCxcbiAgICAgIEJBU0VfQlJBTkNIOiBiYXNlQnJhbmNoLFxuICAgICAgUEFSRU5UX0JSQU5DSDogcGFyZW50QnJhbmNoLFxuICAgICAgV09SS1NQQUNFX0JSQU5DSDogYnJhbmNoTmFtZVxuICAgIH1cbiAgfSk7XG5cbiAgY29udGV4dC5vbkNhbmNlbCgoKSA9PiB7XG4gICAgY29udGV4dC5sb2dnZXIuaW5mbyhgJHtpbnB1dC5hY3Rpb25OYW1lfSBhY3Rpb24gY2FuY2VsbGVkLCB0ZXJtaW5hdGluZyBjb2RleGApO1xuICAgIGNoaWxkLmtpbGwoJ1NJR1RFUk0nKTtcbiAgfSk7XG5cbiAgY29uc3QgZXhpdENvZGUgPSBhd2FpdCBuZXcgUHJvbWlzZTxudW1iZXIgfCBudWxsPigocmVzb2x2ZSkgPT4ge1xuICAgIGNoaWxkLm9uKCdjbG9zZScsIHJlc29sdmUpO1xuICB9KTtcblxuICBjb250ZXh0LmxvZ2dlci5pbmZvKGAke2lucHV0LmFjdGlvbk5hbWV9IGFjdGlvbiBjb21wbGV0ZWRgLCB7IGV4aXRDb2RlIH0pO1xuXG4gIC8vIFBvc3QtZXhpdCBjbGVhbnVwOiByZW1vdmUgZnVsbHktbWVyZ2VkIGJyYW5jaGVzLlxuICAvLyBSdW5zIGlubGluZSBcdTIwMTQgdGhlIHdyYXBwZXIncyBTSUdIVVAvU0lHVEVSTSBoYW5kbGVyIGVuc3VyZXMgY2xlYW51cFxuICAvLyBjb21wbGV0ZXMgZXZlbiB3aGVuIHRoZSB0ZXJtaW5hbCBjbG9zZXMuXG4gIHRyeSB7XG4gICAgYXdhaXQgY2xlYW51cE1lcmdlZEJyYW5jaGVzKGlucHV0LCBjbGllbnQsIGNvbnRleHQubG9nZ2VyKTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBjb250ZXh0LmxvZ2dlci53YXJuKCdQb3N0LWV4aXQgY2xlYW51cCBmYWlsZWQgKG5vbi1mYXRhbCknLCB7IGVycm9yOiBlcnJvck1lc3NhZ2UoZXJyb3IpIH0pO1xuICB9XG59XG4iLCAiLyoqXG4gKiBFcnJvciBjbGFzc2VzIGZvciB0aGUgQ2FyZHMgVjIgU0RLLlxuICpcbiAqIFRoZXNlIGVycm9ycyBub3JtYWxpemUgc2VydmVyIHJlc3BvbnNlcyBhbmQgbmV0d29yayBmYWlsdXJlcyBzbyBjYWxsZXJzIGNhblxuICogZGlzdGluZ3Vpc2ggQVBJIHZhbGlkYXRpb24gcHJvYmxlbXMgZnJvbSB0cmFuc3BvcnQgaXNzdWVzLlxuICpcbiAqXG4gKiBAc3VtbWFyeSBFcnJvciBjbGFzc2VzIGZvciB0aGUgQ2FyZHMgVjIgU0RLXG4gKiBAbW9kdWxlIHR5cGVzL2Vycm9yc1xuICovXG5cbmltcG9ydCB0eXBlIHsgRmllbGRFcnJvciB9IGZyb20gJy4uLy4uL3Byb3RvY29sL2luZGV4LmpzJztcblxuLyoqXG4gKiBFcnJvciB0aHJvd24gd2hlbiBhbiBBUEkgcmVxdWVzdCBmYWlscyB3aXRoIGFuIGVycm9yIHJlc3BvbnNlLlxuICpcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiB0cnkge1xuICogICBhd2FpdCBjbGllbnQuY3JlYXRlQ2FyZChkYXRhKTtcbiAqIH0gY2F0Y2ggKGVycm9yKSB7XG4gKiAgIGlmIChlcnJvciBpbnN0YW5jZW9mIEFwaUVycm9yKSB7XG4gKiAgICAgY29uc29sZS5lcnJvcihgQVBJIGVycm9yIFske2Vycm9yLmNvZGV9XTogJHtlcnJvci5tZXNzYWdlfWApO1xuICogICAgIGlmIChlcnJvci5maWVsZHMpIHtcbiAqICAgICAgIGVycm9yLmZpZWxkcy5mb3JFYWNoKGYgPT4gY29uc29sZS5lcnJvcihgICAke2YuZmllbGR9OiAke2YubWVzc2FnZX1gKSk7XG4gKiAgICAgfVxuICogICB9XG4gKiB9XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNsYXNzIEFwaUVycm9yIGV4dGVuZHMgRXJyb3Ige1xuICAvKipcbiAgICogQ3JlYXRlcyBhIG5ldyBBcGlFcnJvciBpbnN0YW5jZS5cbiAgICpcbiAgICogQHBhcmFtIG1lc3NhZ2UgLSBIdW1hbi1yZWFkYWJsZSBlcnJvciBtZXNzYWdlXG4gICAqIEBwYXJhbSBjb2RlIC0gTWFjaGluZS1yZWFkYWJsZSBlcnJvciBjb2RlXG4gICAqIEBwYXJhbSBmaWVsZHMgLSBPcHRpb25hbCBhcnJheSBvZiBmaWVsZC1zcGVjaWZpYyB2YWxpZGF0aW9uIGVycm9yc1xuICAgKi9cbiAgY29uc3RydWN0b3IoXG4gICAgbWVzc2FnZTogc3RyaW5nLFxuICAgIHB1YmxpYyByZWFkb25seSBjb2RlOiBzdHJpbmcsXG4gICAgcHVibGljIHJlYWRvbmx5IGZpZWxkcz86IEZpZWxkRXJyb3JbXVxuICApIHtcbiAgICBzdXBlcihtZXNzYWdlKTtcbiAgICB0aGlzLm5hbWUgPSAnQXBpRXJyb3InO1xuICB9XG59XG5cbi8qKlxuICogRXJyb3IgdGhyb3duIHdoZW4gYSBuZXR3b3JrIHJlcXVlc3QgZmFpbHMgZHVlIHRvIGNvbm5lY3Rpdml0eSBpc3N1ZXMuXG4gKlxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIHRyeSB7XG4gKiAgIGF3YWl0IGNsaWVudC5saXN0Q2FyZHMoKTtcbiAqIH0gY2F0Y2ggKGVycm9yKSB7XG4gKiAgIGlmIChlcnJvciBpbnN0YW5jZW9mIE5ldHdvcmtFcnJvcikge1xuICogICAgIGNvbnNvbGUuZXJyb3IoYE5ldHdvcmsgZXJyb3I6ICR7ZXJyb3IubWVzc2FnZX1gKTtcbiAqICAgICBpZiAoZXJyb3IuY2F1c2UpIHtcbiAqICAgICAgIGNvbnNvbGUuZXJyb3IoYENhdXNlZCBieTogJHtlcnJvci5jYXVzZS5tZXNzYWdlfWApO1xuICogICAgIH1cbiAqICAgfVxuICogfVxuICogYGBgXG4gKi9cbmV4cG9ydCBjbGFzcyBOZXR3b3JrRXJyb3IgZXh0ZW5kcyBFcnJvciB7XG4gIC8qKlxuICAgKiBDcmVhdGVzIGEgbmV3IE5ldHdvcmtFcnJvciBpbnN0YW5jZS5cbiAgICpcbiAgICogQHBhcmFtIG1lc3NhZ2UgLSBIdW1hbi1yZWFkYWJsZSBlcnJvciBtZXNzYWdlXG4gICAqIEBwYXJhbSBjYXVzZSAtIE9wdGlvbmFsIHVuZGVybHlpbmcgZXJyb3IgdGhhdCBjYXVzZWQgdGhpcyBuZXR3b3JrIGZhaWx1cmVcbiAgICovXG4gIGNvbnN0cnVjdG9yKFxuICAgIG1lc3NhZ2U6IHN0cmluZyxcbiAgICBwdWJsaWMgcmVhZG9ubHkgY2F1c2U/OiBFcnJvclxuICApIHtcbiAgICBzdXBlcihtZXNzYWdlKTtcbiAgICB0aGlzLm5hbWUgPSAnTmV0d29ya0Vycm9yJztcbiAgfVxufVxuIiwgIi8qKlxuICogSFRUUCBjbGllbnQgZm9yIHRoZSBDYXJkcyBWMiBSRVNUIEFQSS5cbiAqXG4gKlxuICogQHN1bW1hcnkgSFRUUCBjbGllbnQgZm9yIHRoZSBDYXJkcyBWMiBSRVNUIEFQSVxuICogQG1vZHVsZSBzZGsvQ2FyZHNDbGllbnRcbiAqL1xuXG5pbXBvcnQgdHlwZSB7XG4gIEFjdGlvblJlc3VsdCxcbiAgQ2FyZCxcbiAgQ29tcGFyZVJlcXVlc3QsXG4gIENvbXBhcmVTdGF0ZSxcbiAgSHR0cENsaWVudCxcbiAgU3RyZWFtTWV0YSxcbiAgVGltZWxpbmVJdGVtXG59IGZyb20gJy4uL3Byb3RvY29sL2luZGV4LmpzJztcbmltcG9ydCB0eXBlIHtcbiAgQWRkQnJhbmNoUmVxdWVzdCxcbiAgQXR0YWNobWVudFJlc3BvbnNlLFxuICBCcmFuY2hlc1Jlc3BvbnNlLFxuICBDYXJkQ3JlYXRlRGF0YSxcbiAgQ2FyZHNDbGllbnRPcHRpb25zLFxuICBDYXJkVXBkYXRlRGF0YSxcbiAgQ29tbWVudCxcbiAgQ29tbWVudENyZWF0ZURhdGEsXG4gIENvbW1lbnRVcGRhdGVEYXRhLFxuICBDb21taXRJbmZvLFxuICBHYXRlQXBwcm92YWxSZXNwb25zZSxcbiAgSW5nZXN0V3NGYWN0b3J5LFxuICBMaXN0Q2FyZHNPcHRpb25zLFxuICBTdHJlYW1SZXN1bHQsXG4gIFN0cmVhbVdyaXRlcixcbiAgU3RyZWFtV3JpdGVyT3B0aW9ucyxcbiAgVGltZWxpbmVPcHRpb25zLFxuICBUeXBlU2NoZW1hc1Jlc3BvbnNlLFxuICBXc1N0cmVhbVNlc3Npb25cbn0gZnJvbSAnLi90eXBlcy9jbGllbnQuanMnO1xuaW1wb3J0IHsgQXBpRXJyb3IsIE5ldHdvcmtFcnJvciB9IGZyb20gJy4vdHlwZXMvZXJyb3JzLmpzJztcblxuLyoqIEluaXRpYWwgcmVxdWVzdCB0aW1lb3V0IGluIG1pbGxpc2Vjb25kcyAoMyBzZWNvbmRzIHRvIGFjY29tbW9kYXRlIGdpdC1iYWNrZWQgZW5kcG9pbnRzKS4gKi9cbmNvbnN0IElOSVRJQUxfVElNRU9VVF9NUyA9IDNfMDAwO1xuXG4vKiogTWF4aW11bSByZXF1ZXN0IHRpbWVvdXQgaW4gbWlsbGlzZWNvbmRzIGFmdGVyIGV4cG9uZW50aWFsIGJhY2tvZmYuICovXG5jb25zdCBNQVhfVElNRU9VVF9NUyA9IDEwXzAwMDtcblxuLyoqIE1heGltdW0gbnVtYmVyIG9mIGF1dG9tYXRpYyByZXRyaWVzIGZvciB0aW1lb3V0IGVycm9ycyBiZWZvcmUgZ2l2aW5nIHVwLiAqL1xuY29uc3QgTUFYX1RJTUVPVVRfUkVUUklFUyA9IDI7XG5cbi8qKlxuICogVHlwZS1zYWZlIEhUVFAgY2xpZW50IGZvciB0aGUgQ2FyZHMgVjIgUkVTVCBBUEkuXG4gKlxuICogVXNlcyB0aGUgRmV0Y2ggQVBJIGJ5IGRlZmF1bHQgYW5kIHN1cHBvcnRzIGRlcGVuZGVuY3kgaW5qZWN0aW9uIG9mIGFuXG4gKiBhbHRlcm5hdGUge0BsaW5rIEh0dHBDbGllbnR9IGZvciB0ZXN0cyBvciBjdXN0b20gdHJhbnNwb3J0cy4gQWxsIHB1YmxpY1xuICogbWV0aG9kcyBzdXJmYWNlIHNlcnZlciBmYWlsdXJlcyBhcyB7QGxpbmsgQXBpRXJyb3J9IGFuZCB0cmFuc3BvcnQgZmFpbHVyZXNcbiAqIGFzIHtAbGluayBOZXR3b3JrRXJyb3J9LlxuICpcbiAqIFRoZSBkZWZhdWx0IEhUVFAgY2xpZW50IGFwcGxpZXMgYW4gZXhwb25lbnRpYWwgYmFja29mZiB0aW1lb3V0IHRvIGZldGNoXG4gKiByZXF1ZXN0czogc3RhcnRpbmcgYXQgMyBzZWNvbmRzLCBkb3VibGluZyBvbiBlYWNoIGNvbnNlY3V0aXZlIGZhaWx1cmUgdXBcbiAqIHRvIGEgMTAtc2Vjb25kIGNhcCwgYW5kIHJlc2V0dGluZyBvbiBhbnkgc3VjY2Vzc2Z1bCByZXNwb25zZS4gVGhpcyBlbnN1cmVzXG4gKiBmYXN0IGZhaWx1cmUgZGV0ZWN0aW9uIHdoZW4gdGhlIHNlcnZlciBpcyBkb3duIHdoaWxlIGFsbG93aW5nIHNsb3dlclxuICogcmVzcG9uc2VzIGR1cmluZyByZWNvdmVyeS5cbiAqXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogY29uc3QgY2xpZW50ID0gbmV3IENhcmRzQ2xpZW50KHsgYmFzZVVybDogJ2h0dHA6Ly9sb2NhbGhvc3Q6MzAwMCcsIGFjY2Vzc1Rva2VuOiAndG9rZW4nIH0pO1xuICpcbiAqIGNvbnN0IGNhcmRzID0gYXdhaXQgY2xpZW50Lmxpc3RDYXJkcyh7IHN0YXR1czogJ2FjdGl2ZScgfSk7XG4gKiBhd2FpdCBjbGllbnQudXBkYXRlQ2FyZChjYXJkSWQsIHsgc3RhdHVzOiAnZG9uZScgfSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNsYXNzIENhcmRzQ2xpZW50IHtcbiAgcHJpdmF0ZSByZWFkb25seSBfaHR0cENsaWVudD86IEh0dHBDbGllbnQ7XG5cbiAgLyoqIEN1cnJlbnQgdGltZW91dCBpbiBtaWxsaXNlY29uZHMsIGluY3JlYXNlcyB3aXRoIGNvbnNlY3V0aXZlIGZhaWx1cmVzLiAqL1xuICBwcml2YXRlIF9jdXJyZW50VGltZW91dE1zID0gSU5JVElBTF9USU1FT1VUX01TO1xuXG4gIC8qKlxuICAgKiBDcmVhdGVzIGEgbmV3IENhcmRzQ2xpZW50IGluc3RhbmNlLlxuICAgKlxuICAgKiBAcGFyYW0gb3B0aW9ucyAtIENvbmZpZ3VyYXRpb24gb3B0aW9ucyBpbmNsdWRpbmcgYmFzZSBVUkwgYW5kIGF1dGggdG9rZW4uXG4gICAqIEBwYXJhbSBodHRwQ2xpZW50IC0gT3B0aW9uYWwgSFRUUCBjbGllbnQgZm9yIGRlcGVuZGVuY3kgaW5qZWN0aW9uLlxuICAgKi9cbiAgY29uc3RydWN0b3IoXG4gICAgcHJpdmF0ZSByZWFkb25seSBvcHRpb25zOiBDYXJkc0NsaWVudE9wdGlvbnMsXG4gICAgaHR0cENsaWVudD86IEh0dHBDbGllbnRcbiAgKSB7XG4gICAgdGhpcy5faHR0cENsaWVudCA9IGh0dHBDbGllbnQ7XG4gIH1cblxuICAvKipcbiAgICogUmV0dXJucyB0aGUgYmFzZSBVUkwgdXNlZCB0byBidWlsZCBBUEkgcmVxdWVzdHMuXG4gICAqXG4gICAqIEByZXR1cm5zIFRoZSBiYXNlIFVSTCBzdHJpbmcgYXMgcHJvdmlkZWQgaW4ge0BsaW5rIENhcmRzQ2xpZW50T3B0aW9uc30uXG4gICAqL1xuICBnZXRCYXNlVXJsKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMub3B0aW9ucy5iYXNlVXJsO1xuICB9XG5cbiAgLyoqXG4gICAqIFJldHVybnMgd2hldGhlciBhbiBIVFRQIGNsaWVudCB3YXMgaW5qZWN0ZWQuXG4gICAqXG4gICAqIEByZXR1cm5zIFRydWUgaWYgYW4gSFRUUCBjbGllbnQgd2FzIHByb3ZpZGVkIGR1cmluZyBjb25zdHJ1Y3Rpb24uXG4gICAqIEBpbnRlcm5hbCBVc2VkIGZvciB0ZXN0aW5nIGRlcGVuZGVuY3kgaW5qZWN0aW9uLlxuICAgKi9cbiAgaGFzSHR0cENsaWVudCgpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5faHR0cENsaWVudCAhPT0gdW5kZWZpbmVkO1xuICB9XG4gIC8qKlxuICAgKiBSZXR1cm5zIGFuIEFib3J0U2lnbmFsIHRoYXQgZmlyZXMgYWZ0ZXIgdGhlIGN1cnJlbnQgYmFja29mZiB0aW1lb3V0LlxuICAgKiBVc2VzIGNhbGxlcidzIHNpZ25hbCBpZiBwcm92aWRlZCAoZm9yIERJL3Rlc3RpbmcpLCBvdGhlcndpc2UgYXBwbGllcyB0aGUgYmFja29mZiB0aW1lb3V0LlxuICAgKlxuICAgKiBAcGFyYW0gZXhpc3RpbmdTaWduYWwgLSBPcHRpb25hbCBjYWxsZXItcHJvdmlkZWQgc2lnbmFsIHRvIHJldXNlIGluc3RlYWQgb2YgY3JlYXRpbmcgYSB0aW1lb3V0IHNpZ25hbC5cbiAgICogQHJldHVybnMgQWJvcnRTaWduYWwgdGhhdCBjb250cm9scyByZXF1ZXN0IGNhbmNlbGxhdGlvbiBmb3IgdGhlIGN1cnJlbnQgb3BlcmF0aW9uLlxuICAgKi9cbiAgcHJpdmF0ZSBnZXRUaW1lb3V0U2lnbmFsKGV4aXN0aW5nU2lnbmFsPzogQWJvcnRTaWduYWwgfCBudWxsKTogQWJvcnRTaWduYWwge1xuICAgIGlmIChleGlzdGluZ1NpZ25hbCkgcmV0dXJuIGV4aXN0aW5nU2lnbmFsO1xuICAgIHJldHVybiBBYm9ydFNpZ25hbC50aW1lb3V0KHRoaXMuX2N1cnJlbnRUaW1lb3V0TXMpO1xuICB9XG5cbiAgLyoqXG4gICAqIFJlY29yZHMgYSBzdWNjZXNzZnVsIHJlcXVlc3QgYW5kIHJlc2V0cyB0aGUgdGltZW91dCBiYWNrb2ZmLlxuICAgKi9cbiAgcHJpdmF0ZSBvblJlcXVlc3RTdWNjZXNzKCk6IHZvaWQge1xuICAgIHRoaXMuX2N1cnJlbnRUaW1lb3V0TXMgPSBJTklUSUFMX1RJTUVPVVRfTVM7XG4gIH1cblxuICAvKipcbiAgICogUmVjb3JkcyBhIGZhaWxlZCByZXF1ZXN0IGFuZCBpbmNyZWFzZXMgdGhlIHRpbWVvdXQgdmlhIGV4cG9uZW50aWFsIGJhY2tvZmYuXG4gICAqL1xuICBwcml2YXRlIG9uUmVxdWVzdEZhaWx1cmUoKTogdm9pZCB7XG4gICAgdGhpcy5fY3VycmVudFRpbWVvdXRNcyA9IE1hdGgubWluKHRoaXMuX2N1cnJlbnRUaW1lb3V0TXMgKiAyLCBNQVhfVElNRU9VVF9NUyk7XG4gIH1cblxuICAvKipcbiAgICogRGVmYXVsdCBIVFRQIGNsaWVudCBpbXBsZW1lbnRhdGlvbiB1c2luZyBmZXRjaCArIEpTT04gcGF5bG9hZHMuXG4gICAqXG4gICAqIEVhY2ggZmV0Y2ggY2FsbCBpbmNsdWRlcyBhbiBBYm9ydFNpZ25hbC50aW1lb3V0IHRoYXQgc3RhcnRzIGF0IDMgc2Vjb25kc1xuICAgKiBhbmQgZG91YmxlcyBvbiBjb25zZWN1dGl2ZSBmYWlsdXJlcyB1cCB0byAxMCBzZWNvbmRzLlxuICAgKi9cbiAgcHJpdmF0ZSBkZWZhdWx0SHR0cENsaWVudDogSHR0cENsaWVudCA9IHtcbiAgICBnZXQ6IGFzeW5jIDxUPih1cmw6IHN0cmluZywgb3B0aW9ucz86IFJlcXVlc3RJbml0KTogUHJvbWlzZTxUPiA9PiB7XG4gICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGZldGNoKHVybCwge1xuICAgICAgICAuLi5vcHRpb25zLFxuICAgICAgICBoZWFkZXJzOiB7IC4uLnRoaXMuZ2V0SGVhZGVycygpLCAuLi5vcHRpb25zPy5oZWFkZXJzIH0sXG4gICAgICAgIHNpZ25hbDogdGhpcy5nZXRUaW1lb3V0U2lnbmFsKG9wdGlvbnM/LnNpZ25hbClcbiAgICAgIH0pO1xuICAgICAgaWYgKCFyZXNwb25zZS5vaykgdGhyb3cgcmVzcG9uc2U7XG4gICAgICByZXR1cm4gcmVzcG9uc2UuanNvbigpIGFzIFByb21pc2U8VD47XG4gICAgfSxcbiAgICBwb3N0OiBhc3luYyA8VD4odXJsOiBzdHJpbmcsIGJvZHk6IHVua25vd24sIG9wdGlvbnM/OiBSZXF1ZXN0SW5pdCk6IFByb21pc2U8VD4gPT4ge1xuICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBmZXRjaCh1cmwsIHtcbiAgICAgICAgLi4ub3B0aW9ucyxcbiAgICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICAgIGhlYWRlcnM6IHsgLi4udGhpcy5nZXRIZWFkZXJzKCksIC4uLm9wdGlvbnM/LmhlYWRlcnMgfSxcbiAgICAgICAgYm9keTogYm9keSA/IEpTT04uc3RyaW5naWZ5KGJvZHkpIDogdW5kZWZpbmVkLFxuICAgICAgICBzaWduYWw6IHRoaXMuZ2V0VGltZW91dFNpZ25hbChvcHRpb25zPy5zaWduYWwpXG4gICAgICB9KTtcbiAgICAgIGlmICghcmVzcG9uc2Uub2spIHRocm93IHJlc3BvbnNlO1xuICAgICAgcmV0dXJuIHJlc3BvbnNlLmpzb24oKSBhcyBQcm9taXNlPFQ+O1xuICAgIH0sXG4gICAgcHV0OiBhc3luYyA8VD4odXJsOiBzdHJpbmcsIGJvZHk6IHVua25vd24sIG9wdGlvbnM/OiBSZXF1ZXN0SW5pdCk6IFByb21pc2U8VD4gPT4ge1xuICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBmZXRjaCh1cmwsIHtcbiAgICAgICAgLi4ub3B0aW9ucyxcbiAgICAgICAgbWV0aG9kOiAnUFVUJyxcbiAgICAgICAgaGVhZGVyczogeyAuLi50aGlzLmdldEhlYWRlcnMoKSwgLi4ub3B0aW9ucz8uaGVhZGVycyB9LFxuICAgICAgICBib2R5OiBib2R5ID8gSlNPTi5zdHJpbmdpZnkoYm9keSkgOiB1bmRlZmluZWQsXG4gICAgICAgIHNpZ25hbDogdGhpcy5nZXRUaW1lb3V0U2lnbmFsKG9wdGlvbnM/LnNpZ25hbClcbiAgICAgIH0pO1xuICAgICAgaWYgKCFyZXNwb25zZS5vaykgdGhyb3cgcmVzcG9uc2U7XG4gICAgICByZXR1cm4gcmVzcG9uc2UuanNvbigpIGFzIFByb21pc2U8VD47XG4gICAgfSxcbiAgICBwYXRjaDogYXN5bmMgPFQ+KHVybDogc3RyaW5nLCBib2R5OiB1bmtub3duLCBvcHRpb25zPzogUmVxdWVzdEluaXQpOiBQcm9taXNlPFQ+ID0+IHtcbiAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZmV0Y2godXJsLCB7XG4gICAgICAgIC4uLm9wdGlvbnMsXG4gICAgICAgIG1ldGhvZDogJ1BBVENIJyxcbiAgICAgICAgaGVhZGVyczogeyAuLi50aGlzLmdldEhlYWRlcnMoKSwgLi4ub3B0aW9ucz8uaGVhZGVycyB9LFxuICAgICAgICBib2R5OiBib2R5ID8gSlNPTi5zdHJpbmdpZnkoYm9keSkgOiB1bmRlZmluZWQsXG4gICAgICAgIHNpZ25hbDogdGhpcy5nZXRUaW1lb3V0U2lnbmFsKG9wdGlvbnM/LnNpZ25hbClcbiAgICAgIH0pO1xuICAgICAgaWYgKCFyZXNwb25zZS5vaykgdGhyb3cgcmVzcG9uc2U7XG4gICAgICByZXR1cm4gcmVzcG9uc2UuanNvbigpIGFzIFByb21pc2U8VD47XG4gICAgfSxcbiAgICBkZWxldGU6IGFzeW5jICh1cmw6IHN0cmluZywgb3B0aW9ucz86IFJlcXVlc3RJbml0KTogUHJvbWlzZTx2b2lkPiA9PiB7XG4gICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGZldGNoKHVybCwge1xuICAgICAgICAuLi5vcHRpb25zLFxuICAgICAgICBtZXRob2Q6ICdERUxFVEUnLFxuICAgICAgICBoZWFkZXJzOiB7IC4uLnRoaXMuZ2V0SGVhZGVycygpLCAuLi5vcHRpb25zPy5oZWFkZXJzIH0sXG4gICAgICAgIHNpZ25hbDogdGhpcy5nZXRUaW1lb3V0U2lnbmFsKG9wdGlvbnM/LnNpZ25hbClcbiAgICAgIH0pO1xuICAgICAgaWYgKCFyZXNwb25zZS5vaykgdGhyb3cgcmVzcG9uc2U7XG4gICAgfVxuICB9O1xuXG4gIC8qKlxuICAgKiBHZXRzIEhUVFAgaGVhZGVycyBmb3IgSlNPTiBBUEkgcmVxdWVzdHMuXG4gICAqXG4gICAqIEByZXR1cm5zIEhlYWRlcnMgd2l0aCBKU09OIGNvbnRlbnQgdHlwZSBhbmQgb3B0aW9uYWwgYmVhcmVyIHRva2VuLlxuICAgKi9cbiAgcHJpdmF0ZSBnZXRIZWFkZXJzKCk6IEhlYWRlcnNJbml0IHtcbiAgICBjb25zdCBoZWFkZXJzOiBIZWFkZXJzSW5pdCA9IHsgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyB9O1xuICAgIGlmICh0aGlzLm9wdGlvbnMuYWNjZXNzVG9rZW4pIHtcbiAgICAgIGhlYWRlcnNbJ0F1dGhvcml6YXRpb24nXSA9IGBCZWFyZXIgJHt0aGlzLm9wdGlvbnMuYWNjZXNzVG9rZW59YDtcbiAgICB9XG4gICAgcmV0dXJuIGhlYWRlcnM7XG4gIH1cblxuICAvKipcbiAgICogR2V0cyB0aGUgSFRUUCBjbGllbnQgdG8gdXNlIGZvciByZXF1ZXN0cy5cbiAgICpcbiAgICogQHJldHVybnMgSW5qZWN0ZWQgSFRUUCBjbGllbnQgd2hlbiBwcm92aWRlZCwgb3RoZXJ3aXNlIHRoZSBkZWZhdWx0IGZldGNoLWJhc2VkIGNsaWVudC5cbiAgICovXG4gIHByaXZhdGUgZ2V0SHR0cENsaWVudCgpOiBIdHRwQ2xpZW50IHtcbiAgICByZXR1cm4gdGhpcy5faHR0cENsaWVudCA/PyB0aGlzLmRlZmF1bHRIdHRwQ2xpZW50O1xuICB9XG5cbiAgLyoqXG4gICAqIEJ1aWxkcyBhIFVSTCByZWxhdGl2ZSB0byB0aGUgY29uZmlndXJlZCBiYXNlIFVSTC5cbiAgICpcbiAgICogVW5kZWZpbmVkIGFuZCBudWxsIHF1ZXJ5IHBhcmFtcyBhcmUgb21pdHRlZC4gVmFsdWVzIGFyZSBzdHJpbmdpZmllZC5cbiAgICpcbiAgICogQHBhcmFtIHBhdGggLSBSZWxhdGl2ZSBBUEkgcGF0aCB0byBhcHBlbmQgdG8gdGhlIGNvbmZpZ3VyZWQgYmFzZSBVUkwuXG4gICAqIEBwYXJhbSBwYXJhbXMgLSBPcHRpb25hbCBxdWVyeSBwYXJhbWV0ZXJzIHRvIGVuY29kZSBvbnRvIHRoZSBVUkwuXG4gICAqIEByZXR1cm5zIEZ1bGx5LXF1YWxpZmllZCByZXF1ZXN0IFVSTCBzdHJpbmcuXG4gICAqL1xuICBwcml2YXRlIGJ1aWxkVXJsKHBhdGg6IHN0cmluZywgcGFyYW1zPzogUmVjb3JkPHN0cmluZywgdW5rbm93bj4pOiBzdHJpbmcge1xuICAgIGNvbnN0IHVybCA9IG5ldyBVUkwocGF0aCwgdGhpcy5vcHRpb25zLmJhc2VVcmwpO1xuICAgIGlmIChwYXJhbXMpIHtcbiAgICAgIGZvciAoY29uc3QgW2tleSwgdmFsdWVdIG9mIE9iamVjdC5lbnRyaWVzKHBhcmFtcykpIHtcbiAgICAgICAgaWYgKHZhbHVlICE9PSB1bmRlZmluZWQgJiYgdmFsdWUgIT09IG51bGwpIHtcbiAgICAgICAgICB1cmwuc2VhcmNoUGFyYW1zLnNldChrZXksIFN0cmluZyh2YWx1ZSkpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiB1cmwudG9TdHJpbmcoKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBXcmFwcyBhIHJlcXVlc3Qgd2l0aCBjb25zaXN0ZW50IGVycm9yIGhhbmRsaW5nLlxuICAgKlxuICAgKiBAcGFyYW0gZm4gLSBBc3luYyByZXF1ZXN0IGZ1bmN0aW9uIHRvIGV4ZWN1dGUuXG4gICAqIEByZXR1cm5zIFRoZSByZXNvbHZlZCB2YWx1ZSBmcm9tIHRoZSByZXF1ZXN0IGZ1bmN0aW9uLlxuICAgKiBAdGhyb3dzIEFwaUVycm9yIHdoZW4gdGhlIHNlcnZlciByZXNwb25kcyB3aXRoIGEgbm9uLTJ4eCBzdGF0dXMuXG4gICAqIEB0aHJvd3MgTmV0d29ya0Vycm9yIGZvciBuZXR3b3JrIGZhaWx1cmVzIG9yIHVuZXhwZWN0ZWQgZXhjZXB0aW9ucy5cbiAgICovXG4gIHByaXZhdGUgYXN5bmMgcmVxdWVzdDxUPihmbjogKCkgPT4gUHJvbWlzZTxUPik6IFByb21pc2U8VD4ge1xuICAgIGxldCBsYXN0VGltZW91dEVycm9yOiBOZXR3b3JrRXJyb3IgfCB1bmRlZmluZWQ7XG5cbiAgICBmb3IgKGxldCBhdHRlbXB0ID0gMDsgYXR0ZW1wdCA8PSBNQVhfVElNRU9VVF9SRVRSSUVTOyBhdHRlbXB0KyspIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGZuKCk7XG4gICAgICAgIHRoaXMub25SZXF1ZXN0U3VjY2VzcygpO1xuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgaWYgKGVycm9yIGluc3RhbmNlb2YgUmVzcG9uc2UpIHtcbiAgICAgICAgICAvLyBTZXJ2ZXIgcmVzcG9uZGVkIChldmVuIHdpdGggYW4gZXJyb3Igc3RhdHVzKSAtIGNvbm5lY3Rpb24gaXMgYWxpdmUsIHJlc2V0IGJhY2tvZmZcbiAgICAgICAgICB0aGlzLm9uUmVxdWVzdFN1Y2Nlc3MoKTtcbiAgICAgICAgICBsZXQgYm9keTogUmVjb3JkPHN0cmluZywgdW5rbm93bj4gPSB7fTtcbiAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgYm9keSA9IGF3YWl0IGVycm9yLmpzb24oKTtcbiAgICAgICAgICB9IGNhdGNoIChwYXJzZUVycm9yKSB7XG4gICAgICAgICAgICAvLyBTeW50YXhFcnJvciBpcyBleHBlY3RlZCB3aGVuIHNlcnZlciByZXR1cm5zIG5vbi1KU09OIGVycm9yIHJlc3BvbnNlIChlLmcuLCBIVE1MIGVycm9yIHBhZ2UpXG4gICAgICAgICAgICBpZiAoIShwYXJzZUVycm9yIGluc3RhbmNlb2YgU3ludGF4RXJyb3IpKSB7XG4gICAgICAgICAgICAgIGNvbnNvbGUud2FybignW0NhcmRzQ2xpZW50XSBVbmV4cGVjdGVkIGVycm9yIHBhcnNpbmcgZXJyb3IgcmVzcG9uc2U6JywgcGFyc2VFcnJvcik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGNvbnN0IG1lc3NhZ2UgPVxuICAgICAgICAgICAgKGJvZHlbJ2Vycm9yJ10gYXMgc3RyaW5nIHwgdW5kZWZpbmVkKSB8fCAoYm9keVsnbWVzc2FnZSddIGFzIHN0cmluZyB8IHVuZGVmaW5lZCkgfHwgZXJyb3Iuc3RhdHVzVGV4dDtcbiAgICAgICAgICBjb25zdCBjb2RlID0gKGJvZHlbJ2NvZGUnXSBhcyBzdHJpbmcgfCB1bmRlZmluZWQpIHx8IFN0cmluZyhlcnJvci5zdGF0dXMpO1xuICAgICAgICAgIGNvbnN0IGZpZWxkcyA9IGJvZHlbJ2ZpZWxkcyddIGFzIEFycmF5PHsgZmllbGQ6IHN0cmluZzsgbWVzc2FnZTogc3RyaW5nIH0+IHwgdW5kZWZpbmVkO1xuICAgICAgICAgIHRocm93IG5ldyBBcGlFcnJvcihtZXNzYWdlLCBjb2RlLCBmaWVsZHMpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gTmV0d29yayBvciB0aW1lb3V0IGZhaWx1cmUgLSBpbmNyZWFzZSBiYWNrb2ZmIGZvciBuZXh0IGF0dGVtcHRcbiAgICAgICAgdGhpcy5vblJlcXVlc3RGYWlsdXJlKCk7XG5cbiAgICAgICAgaWYgKGVycm9yIGluc3RhbmNlb2YgRE9NRXhjZXB0aW9uICYmIGVycm9yLm5hbWUgPT09ICdUaW1lb3V0RXJyb3InKSB7XG4gICAgICAgICAgbGFzdFRpbWVvdXRFcnJvciA9IG5ldyBOZXR3b3JrRXJyb3IoJ1JlcXVlc3QgdGltZWQgb3V0JywgZXJyb3IpO1xuICAgICAgICAgIC8vIFJldHJ5IG9uIHRpbWVvdXQgLSBvblJlcXVlc3RGYWlsdXJlKCkgYWxyZWFkeSBpbmNyZWFzZWQgX2N1cnJlbnRUaW1lb3V0TXNcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIE5vbi10aW1lb3V0IG5ldHdvcmsgZXJyb3JzIChETlMgZmFpbHVyZSwgY29ubmVjdGlvbiByZWZ1c2VkKSBhcmUgbm90IHJldHJpZWRcbiAgICAgICAgdGhyb3cgbmV3IE5ldHdvcmtFcnJvcignUmVxdWVzdCBmYWlsZWQnLCBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IgOiB1bmRlZmluZWQpO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIEFsbCByZXRyeSBhdHRlbXB0cyBleGhhdXN0ZWRcbiAgICB0aHJvdyBsYXN0VGltZW91dEVycm9yITtcbiAgfVxuXG4gIC8vIC0tLSBDYXJkIE9wZXJhdGlvbnMgLS0tXG5cbiAgLyoqXG4gICAqIExpc3RzIGNhcmRzIHdpdGggb3B0aW9uYWwgZmlsdGVyaW5nLlxuICAgKlxuICAgKiBAcGFyYW0gb3B0aW9ucyAtIE9wdGlvbmFsIGZpbHRlciBhbmQgcGFnaW5hdGlvbiBvcHRpb25zLlxuICAgKiBAcmV0dXJucyBQcm9taXNlIHJlc29sdmluZyB0byBtYXRjaGluZyBjYXJkcy5cbiAgICogQHRocm93cyBBcGlFcnJvciB3aGVuIHRoZSBzZXJ2ZXIgcmVzcG9uZHMgd2l0aCBhbiBlcnJvci5cbiAgICogQHRocm93cyBOZXR3b3JrRXJyb3Igd2hlbiB0aGUgcmVxdWVzdCBmYWlscyB0byByZWFjaCB0aGUgc2VydmVyLlxuICAgKi9cbiAgYXN5bmMgbGlzdENhcmRzKG9wdGlvbnM/OiBMaXN0Q2FyZHNPcHRpb25zKTogUHJvbWlzZTxDYXJkW10+IHtcbiAgICBjb25zdCB1cmxTdHIgPSB0aGlzLmJ1aWxkVXJsKCcvY2FyZHMnLCB7XG4gICAgICB3b3Jrc3BhY2VQYXRoOiB0aGlzLm9wdGlvbnMud29ya3NwYWNlUGF0aCxcbiAgICAgIHN0YXR1czogb3B0aW9ucz8uc3RhdHVzLFxuICAgICAgc2VhcmNoOiBvcHRpb25zPy5zZWFyY2gsXG4gICAgICBsaW1pdDogb3B0aW9ucz8ubGltaXQsXG4gICAgICBvZmZzZXQ6IG9wdGlvbnM/Lm9mZnNldFxuICAgIH0pO1xuICAgIGNvbnN0IHVybCA9IG5ldyBVUkwodXJsU3RyKTtcbiAgICBmb3IgKGNvbnN0IHQgb2Ygb3B0aW9ucz8udGFncyA/PyBbXSkge1xuICAgICAgdXJsLnNlYXJjaFBhcmFtcy5hcHBlbmQoJ3RhZycsIHQpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5yZXF1ZXN0KCgpID0+IHRoaXMuZ2V0SHR0cENsaWVudCgpLmdldDxDYXJkW10+KHVybC50b1N0cmluZygpKSk7XG4gIH1cblxuICAvKipcbiAgICogTGlzdHMgY2FyZHMgYXMgbGlnaHR3ZWlnaHQgc3VtbWFyaWVzIGZvciBsaXN0IHZpZXdzLlxuICAgKlxuICAgKiBSZXR1cm5zIHByZS1mbGF0dGVuZWQgZmllbGRzIHN1aXRhYmxlIGZvciBkaXJlY3QgdXNlIGluIGxpc3QgcmVuZGVyaW5nLFxuICAgKiBvbWl0dGluZyBoZWF2eXdlaWdodCBmaWVsZHMgbGlrZSBgcGxhbkNvbnRlbnRgIGFuZCBgcmVwb3NpdG9yeVBhdGhgLlxuICAgKlxuICAgKiBAdGVtcGxhdGUgVCAtIFRoZSBleHBlY3RlZCBzdW1tYXJ5IHNoYXBlIChkZWZhdWx0IGBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPmApLlxuICAgKiBAcmV0dXJucyBQcm9taXNlIHJlc29sdmluZyB0byBjYXJkIHN1bW1hcmllcy5cbiAgICogQHRocm93cyBBcGlFcnJvciB3aGVuIHRoZSBzZXJ2ZXIgcmVzcG9uZHMgd2l0aCBhbiBlcnJvci5cbiAgICogQHRocm93cyBOZXR3b3JrRXJyb3Igd2hlbiB0aGUgcmVxdWVzdCBmYWlscyB0byByZWFjaCB0aGUgc2VydmVyLlxuICAgKi9cbiAgYXN5bmMgbGlzdENhcmRTdW1tYXJpZXM8VCA9IFJlY29yZDxzdHJpbmcsIHVua25vd24+PigpOiBQcm9taXNlPFRbXT4ge1xuICAgIGNvbnN0IHVybCA9IHRoaXMuYnVpbGRVcmwoJy9jYXJkcy9saXN0Jywge1xuICAgICAgd29ya3NwYWNlUGF0aDogdGhpcy5vcHRpb25zLndvcmtzcGFjZVBhdGhcbiAgICB9KTtcbiAgICByZXR1cm4gdGhpcy5yZXF1ZXN0KCgpID0+IHRoaXMuZ2V0SHR0cENsaWVudCgpLmdldDxUW10+KHVybCkpO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldHMgYSBzaW5nbGUgY2FyZCBieSBpZC5cbiAgICpcbiAgICogQHBhcmFtIGNhcmRJZCAtIFRoZSBpZCBvZiB0aGUgY2FyZCB0byByZXRyaWV2ZS5cbiAgICogQHJldHVybnMgUHJvbWlzZSByZXNvbHZpbmcgdG8gdGhlIGNhcmQuXG4gICAqIEB0aHJvd3MgQXBpRXJyb3Igd2hlbiB0aGUgc2VydmVyIHJlc3BvbmRzIHdpdGggYW4gZXJyb3IuXG4gICAqIEB0aHJvd3MgTmV0d29ya0Vycm9yIHdoZW4gdGhlIHJlcXVlc3QgZmFpbHMgdG8gcmVhY2ggdGhlIHNlcnZlci5cbiAgICovXG4gIGFzeW5jIGdldENhcmQoY2FyZElkOiBzdHJpbmcpOiBQcm9taXNlPENhcmQ+IHtcbiAgICBjb25zdCB1cmwgPSB0aGlzLmJ1aWxkVXJsKGAvY2FyZHMvJHtjYXJkSWR9YCwge1xuICAgICAgd29ya3NwYWNlUGF0aDogdGhpcy5vcHRpb25zLndvcmtzcGFjZVBhdGhcbiAgICB9KTtcbiAgICByZXR1cm4gdGhpcy5yZXF1ZXN0KCgpID0+IHRoaXMuZ2V0SHR0cENsaWVudCgpLmdldDxDYXJkPih1cmwpKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDcmVhdGVzIGEgbmV3IGNhcmQuXG4gICAqXG4gICAqIEBwYXJhbSBkYXRhIC0gQ2FyZCBjcmVhdGlvbiBwYXlsb2FkLlxuICAgKiBAcmV0dXJucyBQcm9taXNlIHJlc29sdmluZyB0byB0aGUgY3JlYXRlZCBjYXJkLlxuICAgKiBAdGhyb3dzIEFwaUVycm9yIHdoZW4gdGhlIHNlcnZlciByZWplY3RzIHRoZSBwYXlsb2FkLlxuICAgKiBAdGhyb3dzIE5ldHdvcmtFcnJvciB3aGVuIHRoZSByZXF1ZXN0IGZhaWxzIHRvIHJlYWNoIHRoZSBzZXJ2ZXIuXG4gICAqL1xuICBhc3luYyBjcmVhdGVDYXJkKGRhdGE6IENhcmRDcmVhdGVEYXRhKTogUHJvbWlzZTxDYXJkPiB7XG4gICAgY29uc3QgdXJsID0gdGhpcy5idWlsZFVybCgnL2NhcmRzJyk7XG4gICAgY29uc3QgYm9keSA9IHtcbiAgICAgIC4uLmRhdGEsXG4gICAgICB3b3Jrc3BhY2VQYXRoOiB0aGlzLm9wdGlvbnMud29ya3NwYWNlUGF0aFxuICAgIH07XG4gICAgcmV0dXJuIHRoaXMucmVxdWVzdCgoKSA9PiB0aGlzLmdldEh0dHBDbGllbnQoKS5wb3N0PENhcmQ+KHVybCwgYm9keSkpO1xuICB9XG5cbiAgLyoqXG4gICAqIFVwZGF0ZXMgYW4gZXhpc3RpbmcgY2FyZC5cbiAgICpcbiAgICogQHBhcmFtIGNhcmRJZCAtIFRoZSBpZCBvZiB0aGUgY2FyZCB0byB1cGRhdGUuXG4gICAqIEBwYXJhbSBkYXRhIC0gVGhlIGZpZWxkcyB0byB1cGRhdGUuXG4gICAqIEByZXR1cm5zIFByb21pc2UgcmVzb2x2aW5nIHRvIHRoZSB1cGRhdGVkIGNhcmQuXG4gICAqIEB0aHJvd3MgQXBpRXJyb3Igd2hlbiB0aGUgc2VydmVyIHJlamVjdHMgdGhlIHVwZGF0ZS5cbiAgICogQHRocm93cyBOZXR3b3JrRXJyb3Igd2hlbiB0aGUgcmVxdWVzdCBmYWlscyB0byByZWFjaCB0aGUgc2VydmVyLlxuICAgKiBAZGVwcmVjYXRlZCBVc2UgZGlyZWN0IGdpdCBvcGVyYXRpb25zIGluc3RlYWQuIFRoaXMgZW5kcG9pbnQgd2lsbCBiZSByZW1vdmVkLlxuICAgKi9cbiAgYXN5bmMgdXBkYXRlQ2FyZChjYXJkSWQ6IHN0cmluZywgZGF0YTogQ2FyZFVwZGF0ZURhdGEpOiBQcm9taXNlPENhcmQ+IHtcbiAgICBjb25zdCB1cmwgPSB0aGlzLmJ1aWxkVXJsKGAvY2FyZHMvJHtjYXJkSWR9YCk7XG4gICAgcmV0dXJuIHRoaXMucmVxdWVzdCgoKSA9PiB0aGlzLmdldEh0dHBDbGllbnQoKS5wYXRjaDxDYXJkPih1cmwsIGRhdGEpKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBEZWxldGVzIGEgY2FyZC5cbiAgICpcbiAgICogQHBhcmFtIGNhcmRJZCAtIFRoZSBpZCBvZiB0aGUgY2FyZCB0byBkZWxldGUuXG4gICAqIEByZXR1cm5zIFByb21pc2UgcmVzb2x2aW5nIHdoZW4gZGVsZXRpb24gaXMgY29tcGxldGUuXG4gICAqIEB0aHJvd3MgQXBpRXJyb3Igd2hlbiB0aGUgc2VydmVyIHJlamVjdHMgdGhlIGRlbGV0ZS5cbiAgICogQHRocm93cyBOZXR3b3JrRXJyb3Igd2hlbiB0aGUgcmVxdWVzdCBmYWlscyB0byByZWFjaCB0aGUgc2VydmVyLlxuICAgKiBAZGVwcmVjYXRlZCBVc2UgZGlyZWN0IGdpdCBvcGVyYXRpb25zIGluc3RlYWQuIFRoaXMgZW5kcG9pbnQgd2lsbCBiZSByZW1vdmVkLlxuICAgKi9cbiAgYXN5bmMgZGVsZXRlQ2FyZChjYXJkSWQ6IHN0cmluZyk6IFByb21pc2U8dm9pZD4ge1xuICAgIGNvbnN0IHVybCA9IHRoaXMuYnVpbGRVcmwoYC9jYXJkcy8ke2NhcmRJZH1gKTtcbiAgICByZXR1cm4gdGhpcy5yZXF1ZXN0KCgpID0+IHRoaXMuZ2V0SHR0cENsaWVudCgpLmRlbGV0ZSh1cmwpKTtcbiAgfVxuXG4gIC8vIC0tLSBDb21tZW50IE9wZXJhdGlvbnMgLS0tXG5cbiAgLyoqXG4gICAqIEdldHMgYWxsIGNvbW1lbnRzIGZvciBhIGNhcmQuXG4gICAqXG4gICAqIEBwYXJhbSBjYXJkSWQgLSBJZGVudGlmaWVyIG9mIHRoZSB0YXJnZXQgY2FyZCBmb3IgdGhpcyByZXF1ZXN0LlxuICAgKiBAcmV0dXJucyBQcm9taXNlIHJlc29sdmluZyB0byB0aGUgY29tbWVudCBsaXN0LlxuICAgKiBAdGhyb3dzIEFwaUVycm9yIHdoZW4gdGhlIHNlcnZlciByZXNwb25kcyB3aXRoIGFuIGVycm9yLlxuICAgKiBAdGhyb3dzIE5ldHdvcmtFcnJvciB3aGVuIHRoZSByZXF1ZXN0IGZhaWxzIHRvIHJlYWNoIHRoZSBzZXJ2ZXIuXG4gICAqL1xuICBhc3luYyBnZXRDb21tZW50cyhjYXJkSWQ6IHN0cmluZyk6IFByb21pc2U8Q29tbWVudFtdPiB7XG4gICAgY29uc3QgdXJsID0gdGhpcy5idWlsZFVybChgL2NhcmRzLyR7Y2FyZElkfS9jb21tZW50c2ApO1xuICAgIHJldHVybiB0aGlzLnJlcXVlc3QoKCkgPT4gdGhpcy5nZXRIdHRwQ2xpZW50KCkuZ2V0PENvbW1lbnRbXT4odXJsKSk7XG4gIH1cblxuICAvKipcbiAgICogR2V0cyBhIHNpbmdsZSBjb21tZW50IGJ5IGlkLlxuICAgKlxuICAgKiBAcGFyYW0gY2FyZElkIC0gSWRlbnRpZmllciBvZiB0aGUgY2FyZCB0aGF0IG93bnMgdGhlIHJlcXVlc3RlZCBjb21tZW50LlxuICAgKiBAcGFyYW0gY29tbWVudElkIC0gSWRlbnRpZmllciBvZiB0aGUgY29tbWVudCB0byByZXRyaWV2ZS5cbiAgICogQHJldHVybnMgUHJvbWlzZSByZXNvbHZpbmcgdG8gdGhlIGNvbW1lbnQuXG4gICAqIEB0aHJvd3MgQXBpRXJyb3Igd2hlbiB0aGUgc2VydmVyIHJlc3BvbmRzIHdpdGggYW4gZXJyb3IuXG4gICAqIEB0aHJvd3MgTmV0d29ya0Vycm9yIHdoZW4gdGhlIHJlcXVlc3QgZmFpbHMgdG8gcmVhY2ggdGhlIHNlcnZlci5cbiAgICovXG4gIGFzeW5jIGdldENvbW1lbnQoY2FyZElkOiBzdHJpbmcsIGNvbW1lbnRJZDogc3RyaW5nKTogUHJvbWlzZTxDb21tZW50PiB7XG4gICAgY29uc3QgdXJsID0gdGhpcy5idWlsZFVybChgL2NhcmRzLyR7Y2FyZElkfS9jb21tZW50cy8ke2NvbW1lbnRJZH1gKTtcbiAgICByZXR1cm4gdGhpcy5yZXF1ZXN0KCgpID0+IHRoaXMuZ2V0SHR0cENsaWVudCgpLmdldDxDb21tZW50Pih1cmwpKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDcmVhdGVzIGEgbmV3IGNvbW1lbnQgb24gYSBjYXJkLlxuICAgKlxuICAgKiBAcGFyYW0gY2FyZElkIC0gSWRlbnRpZmllciBvZiB0aGUgY2FyZCB0aGF0IHdpbGwgcmVjZWl2ZSB0aGUgbmV3IGNvbW1lbnQuXG4gICAqIEBwYXJhbSBkYXRhIC0gQ29tbWVudCBjcmVhdGlvbiBwYXlsb2FkLlxuICAgKiBAcmV0dXJucyBQcm9taXNlIHJlc29sdmluZyB0byB0aGUgY3JlYXRlZCBjb21tZW50LlxuICAgKiBAdGhyb3dzIEFwaUVycm9yIHdoZW4gdGhlIHNlcnZlciByZWplY3RzIHRoZSBwYXlsb2FkLlxuICAgKiBAdGhyb3dzIE5ldHdvcmtFcnJvciB3aGVuIHRoZSByZXF1ZXN0IGZhaWxzIHRvIHJlYWNoIHRoZSBzZXJ2ZXIuXG4gICAqIEBkZXByZWNhdGVkIFVzZSBkaXJlY3QgZ2l0IG9wZXJhdGlvbnMgaW5zdGVhZC4gVGhpcyBlbmRwb2ludCB3aWxsIGJlIHJlbW92ZWQuXG4gICAqL1xuICBhc3luYyBjcmVhdGVDb21tZW50KGNhcmRJZDogc3RyaW5nLCBkYXRhOiBDb21tZW50Q3JlYXRlRGF0YSk6IFByb21pc2U8Q29tbWVudD4ge1xuICAgIGNvbnN0IHVybCA9IHRoaXMuYnVpbGRVcmwoYC9jYXJkcy8ke2NhcmRJZH0vY29tbWVudHNgKTtcbiAgICByZXR1cm4gdGhpcy5yZXF1ZXN0KCgpID0+IHRoaXMuZ2V0SHR0cENsaWVudCgpLnBvc3Q8Q29tbWVudD4odXJsLCBkYXRhKSk7XG4gIH1cblxuICAvKipcbiAgICogVXBkYXRlcyBhbiBleGlzdGluZyBjb21tZW50LlxuICAgKlxuICAgKiBAcGFyYW0gY2FyZElkIC0gSWRlbnRpZmllciBvZiB0aGUgY2FyZCB0aGF0IG93bnMgdGhlIGNvbW1lbnQuXG4gICAqIEBwYXJhbSBjb21tZW50SWQgLSBJZGVudGlmaWVyIG9mIHRoZSBjb21tZW50IHRvIHVwZGF0ZS5cbiAgICogQHBhcmFtIGRhdGEgLSBDb21tZW50IHVwZGF0ZSBwYXlsb2FkLlxuICAgKiBAcmV0dXJucyBQcm9taXNlIHJlc29sdmluZyB0byB0aGUgdXBkYXRlZCBjb21tZW50LlxuICAgKiBAdGhyb3dzIEFwaUVycm9yIHdoZW4gdGhlIHNlcnZlciByZWplY3RzIHRoZSB1cGRhdGUuXG4gICAqIEB0aHJvd3MgTmV0d29ya0Vycm9yIHdoZW4gdGhlIHJlcXVlc3QgZmFpbHMgdG8gcmVhY2ggdGhlIHNlcnZlci5cbiAgICogQGRlcHJlY2F0ZWQgVXNlIGRpcmVjdCBnaXQgb3BlcmF0aW9ucyBpbnN0ZWFkLiBUaGlzIGVuZHBvaW50IHdpbGwgYmUgcmVtb3ZlZC5cbiAgICovXG4gIGFzeW5jIHVwZGF0ZUNvbW1lbnQoY2FyZElkOiBzdHJpbmcsIGNvbW1lbnRJZDogc3RyaW5nLCBkYXRhOiBDb21tZW50VXBkYXRlRGF0YSk6IFByb21pc2U8Q29tbWVudD4ge1xuICAgIGNvbnN0IHVybCA9IHRoaXMuYnVpbGRVcmwoYC9jYXJkcy8ke2NhcmRJZH0vY29tbWVudHMvJHtjb21tZW50SWR9YCk7XG4gICAgcmV0dXJuIHRoaXMucmVxdWVzdCgoKSA9PiB0aGlzLmdldEh0dHBDbGllbnQoKS5wYXRjaDxDb21tZW50Pih1cmwsIGRhdGEpKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBEZWxldGVzIGEgY29tbWVudC5cbiAgICpcbiAgICogQHBhcmFtIGNhcmRJZCAtIElkZW50aWZpZXIgb2YgdGhlIGNhcmQgdGhhdCBvd25zIHRoZSBjb21tZW50LlxuICAgKiBAcGFyYW0gY29tbWVudElkIC0gSWRlbnRpZmllciBvZiB0aGUgY29tbWVudCB0byByZW1vdmUuXG4gICAqIEByZXR1cm5zIFByb21pc2UgcmVzb2x2aW5nIHdoZW4gZGVsZXRpb24gaXMgY29tcGxldGUuXG4gICAqIEB0aHJvd3MgQXBpRXJyb3Igd2hlbiB0aGUgc2VydmVyIHJlamVjdHMgdGhlIGRlbGV0ZS5cbiAgICogQHRocm93cyBOZXR3b3JrRXJyb3Igd2hlbiB0aGUgcmVxdWVzdCBmYWlscyB0byByZWFjaCB0aGUgc2VydmVyLlxuICAgKiBAZGVwcmVjYXRlZCBVc2UgZGlyZWN0IGdpdCBvcGVyYXRpb25zIGluc3RlYWQuIFRoaXMgZW5kcG9pbnQgd2lsbCBiZSByZW1vdmVkLlxuICAgKi9cbiAgYXN5bmMgZGVsZXRlQ29tbWVudChjYXJkSWQ6IHN0cmluZywgY29tbWVudElkOiBzdHJpbmcpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zdCB1cmwgPSB0aGlzLmJ1aWxkVXJsKGAvY2FyZHMvJHtjYXJkSWR9L2NvbW1lbnRzLyR7Y29tbWVudElkfWApO1xuICAgIHJldHVybiB0aGlzLnJlcXVlc3QoKCkgPT4gdGhpcy5nZXRIdHRwQ2xpZW50KCkuZGVsZXRlKHVybCkpO1xuICB9XG5cbiAgLy8gLS0tIEF0dGFjaG1lbnQgT3BlcmF0aW9ucyAtLS1cblxuICAvKipcbiAgICogVXBsb2FkcyBhbiBhdHRhY2htZW50IHRvIGEgY2FyZCB1c2luZyBiaW5hcnkgUFVULlxuICAgKlxuICAgKiBUaGlzIGlzIHRoZSBwcmVmZXJyZWQgbWV0aG9kIC0gc2VuZHMgcmF3IGJpbmFyeSBkYXRhIGRpcmVjdGx5IHdpdGhvdXRcbiAgICogYmFzZTY0IGVuY29kaW5nLCByZXN1bHRpbmcgaW4gMzMlIHNtYWxsZXIgcGF5bG9hZHMuXG4gICAqXG4gICAqIEBwYXJhbSBjYXJkSWQgLSBJZGVudGlmaWVyIG9mIHRoZSBjYXJkIHRoYXQgd2lsbCByZWNlaXZlIHRoZSBhdHRhY2htZW50LlxuICAgKiBAcGFyYW0gbmFtZSAtIEZpbGUgbmFtZSBpbmNsdWRpbmcgZXh0ZW5zaW9uLlxuICAgKiBAcGFyYW0gZGF0YSAtIEJpbmFyeSBkYXRhIGFzIEJsb2IsIEFycmF5QnVmZmVyLCBvciBiYXNlNjQgc3RyaW5nLlxuICAgKiBAcmV0dXJucyBQcm9taXNlIHJlc29sdmluZyB0byBhdHRhY2htZW50IG1ldGFkYXRhLlxuICAgKiBAdGhyb3dzIEFwaUVycm9yIHdoZW4gdGhlIHNlcnZlciByZWplY3RzIHRoZSB1cGxvYWQuXG4gICAqIEB0aHJvd3MgTmV0d29ya0Vycm9yIHdoZW4gdGhlIHJlcXVlc3QgZmFpbHMgdG8gcmVhY2ggdGhlIHNlcnZlci5cbiAgICovXG4gIGFzeW5jIHVwbG9hZEF0dGFjaG1lbnQoY2FyZElkOiBzdHJpbmcsIG5hbWU6IHN0cmluZywgZGF0YTogQmxvYiB8IEFycmF5QnVmZmVyIHwgc3RyaW5nKTogUHJvbWlzZTxBdHRhY2htZW50UmVzcG9uc2U+IHtcbiAgICBjb25zdCB1cmwgPSB0aGlzLmJ1aWxkVXJsKGAvY2FyZHMvJHtjYXJkSWR9L2F0dGFjaG1lbnRzLyR7ZW5jb2RlVVJJQ29tcG9uZW50KG5hbWUpfWApO1xuXG4gICAgLy8gQ29udmVydCBkYXRhIHRvIEJsb2IgZm9yIGZldGNoIGJvZHlcbiAgICBsZXQgYm9keTogQmxvYjtcbiAgICBpZiAoZGF0YSBpbnN0YW5jZW9mIEJsb2IpIHtcbiAgICAgIGJvZHkgPSBkYXRhO1xuICAgIH0gZWxzZSBpZiAoZGF0YSBpbnN0YW5jZW9mIEFycmF5QnVmZmVyKSB7XG4gICAgICBib2R5ID0gbmV3IEJsb2IoW2RhdGFdKTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gYmFzZTY0IHN0cmluZyAtIGRlY29kZSB0byBiaW5hcnlcbiAgICAgIGNvbnN0IGJpbmFyeVN0cmluZyA9IGF0b2IoZGF0YSk7XG4gICAgICBjb25zdCBieXRlcyA9IG5ldyBVaW50OEFycmF5KGJpbmFyeVN0cmluZy5sZW5ndGgpO1xuICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBiaW5hcnlTdHJpbmcubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgYnl0ZXNbaV0gPSBiaW5hcnlTdHJpbmcuY2hhckNvZGVBdChpKTtcbiAgICAgIH1cbiAgICAgIGJvZHkgPSBuZXcgQmxvYihbYnl0ZXNdKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5yZXF1ZXN0KGFzeW5jICgpID0+IHtcbiAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZmV0Y2godXJsLCB7XG4gICAgICAgIG1ldGhvZDogJ1BVVCcsXG4gICAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgICAuLi50aGlzLmdldEhlYWRlcnMoKSxcbiAgICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL29jdGV0LXN0cmVhbSdcbiAgICAgICAgfSxcbiAgICAgICAgYm9keSxcbiAgICAgICAgc2lnbmFsOiB0aGlzLmdldFRpbWVvdXRTaWduYWwoKVxuICAgICAgfSk7XG4gICAgICBpZiAoIXJlc3BvbnNlLm9rKSB0aHJvdyByZXNwb25zZTtcbiAgICAgIHJldHVybiByZXNwb25zZS5qc29uKCkgYXMgUHJvbWlzZTxBdHRhY2htZW50UmVzcG9uc2U+O1xuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIERvd25sb2FkcyBhbiBhdHRhY2htZW50IGFzIGEgQmxvYi5cbiAgICpcbiAgICogVGhpcyBtZXRob2QgdXNlcyBgZmV0Y2hgIGRpcmVjdGx5IHNvIGJpbmFyeSBkYXRhIGlzIHByZXNlcnZlZC5cbiAgICpcbiAgICogQHBhcmFtIGNhcmRJZCAtIElkZW50aWZpZXIgb2YgdGhlIGNhcmQgdGhhdCBvd25zIHRoZSBhdHRhY2htZW50LlxuICAgKiBAcGFyYW0gYXR0YWNobWVudElkIC0gSWRlbnRpZmllciBvZiB0aGUgYXR0YWNobWVudCBibG9iIHRvIGRvd25sb2FkLlxuICAgKiBAcmV0dXJucyBQcm9taXNlIHJlc29sdmluZyB0byBhbiBhdHRhY2htZW50IEJsb2IuXG4gICAqIEB0aHJvd3MgQXBpRXJyb3Igd2hlbiB0aGUgc2VydmVyIHJlc3BvbmRzIHdpdGggYW4gZXJyb3IuXG4gICAqIEB0aHJvd3MgTmV0d29ya0Vycm9yIHdoZW4gdGhlIHJlcXVlc3QgZmFpbHMgdG8gcmVhY2ggdGhlIHNlcnZlci5cbiAgICovXG4gIGFzeW5jIGdldEF0dGFjaG1lbnQoY2FyZElkOiBzdHJpbmcsIGF0dGFjaG1lbnRJZDogc3RyaW5nKTogUHJvbWlzZTxCbG9iPiB7XG4gICAgY29uc3QgdXJsID0gdGhpcy5idWlsZFVybChgL2NhcmRzLyR7Y2FyZElkfS9hdHRhY2htZW50cy8ke2F0dGFjaG1lbnRJZH1gKTtcbiAgICByZXR1cm4gdGhpcy5yZXF1ZXN0KGFzeW5jICgpID0+IHtcbiAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZmV0Y2godXJsLCB7XG4gICAgICAgIGhlYWRlcnM6IHRoaXMuZ2V0SGVhZGVycygpLFxuICAgICAgICBzaWduYWw6IHRoaXMuZ2V0VGltZW91dFNpZ25hbCgpXG4gICAgICB9KTtcbiAgICAgIGlmICghcmVzcG9uc2Uub2spIHRocm93IHJlc3BvbnNlO1xuICAgICAgcmV0dXJuIHJlc3BvbnNlLmJsb2IoKTtcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBMaXN0cyBhdHRhY2htZW50cyBmb3IgYSBjYXJkLlxuICAgKlxuICAgKiBAcGFyYW0gY2FyZElkIC0gSWRlbnRpZmllciBvZiB0aGUgY2FyZCB3aG9zZSBhdHRhY2htZW50cyBzaG91bGQgYmUgbGlzdGVkLlxuICAgKiBAcmV0dXJucyBQcm9taXNlIHJlc29sdmluZyB0byBhdHRhY2htZW50IG1ldGFkYXRhLlxuICAgKiBAdGhyb3dzIEFwaUVycm9yIHdoZW4gdGhlIHNlcnZlciByZXNwb25kcyB3aXRoIGFuIGVycm9yLlxuICAgKiBAdGhyb3dzIE5ldHdvcmtFcnJvciB3aGVuIHRoZSByZXF1ZXN0IGZhaWxzIHRvIHJlYWNoIHRoZSBzZXJ2ZXIuXG4gICAqL1xuICBhc3luYyBsaXN0QXR0YWNobWVudHMoY2FyZElkOiBzdHJpbmcpOiBQcm9taXNlPEF0dGFjaG1lbnRSZXNwb25zZVtdPiB7XG4gICAgY29uc3QgdXJsID0gdGhpcy5idWlsZFVybChgL2NhcmRzLyR7Y2FyZElkfS9hdHRhY2htZW50c2ApO1xuICAgIHJldHVybiB0aGlzLnJlcXVlc3QoKCkgPT4gdGhpcy5nZXRIdHRwQ2xpZW50KCkuZ2V0PEF0dGFjaG1lbnRSZXNwb25zZVtdPih1cmwpKTtcbiAgfVxuXG4gIC8vIC0tLSBUaW1lbGluZSBPcGVyYXRpb25zIC0tLVxuXG4gIC8qKlxuICAgKiBHZXRzIHRpbWVsaW5lIGVudHJpZXMgZm9yIGEgY2FyZCB3aXRoIG9wdGlvbmFsIHBhZ2luYXRpb24uXG4gICAqXG4gICAqIEBwYXJhbSBjYXJkSWQgLSBJZGVudGlmaWVyIG9mIHRoZSBjYXJkIHdob3NlIHRpbWVsaW5lIGVudHJpZXMgc2hvdWxkIGJlIHJldHVybmVkLlxuICAgKiBAcGFyYW0gb3B0aW9ucyAtIE9wdGlvbmFsIHBhZ2luYXRpb24gY29udHJvbHMuXG4gICAqIEByZXR1cm5zIFByb21pc2UgcmVzb2x2aW5nIHRvIHRpbWVsaW5lIGVudHJpZXMuXG4gICAqIEB0aHJvd3MgQXBpRXJyb3Igd2hlbiB0aGUgc2VydmVyIHJlc3BvbmRzIHdpdGggYW4gZXJyb3IuXG4gICAqIEB0aHJvd3MgTmV0d29ya0Vycm9yIHdoZW4gdGhlIHJlcXVlc3QgZmFpbHMgdG8gcmVhY2ggdGhlIHNlcnZlci5cbiAgICovXG4gIGFzeW5jIGdldFRpbWVsaW5lKGNhcmRJZDogc3RyaW5nLCBvcHRpb25zPzogVGltZWxpbmVPcHRpb25zKTogUHJvbWlzZTxUaW1lbGluZUl0ZW1bXT4ge1xuICAgIGNvbnN0IHVybCA9IHRoaXMuYnVpbGRVcmwoYC9jYXJkcy8ke2NhcmRJZH0vdGltZWxpbmVgLCB7XG4gICAgICBiZWZvcmU6IG9wdGlvbnM/LmJlZm9yZSxcbiAgICAgIGxpbWl0OiBvcHRpb25zPy5saW1pdFxuICAgIH0pO1xuICAgIHJldHVybiB0aGlzLnJlcXVlc3QoKCkgPT4gdGhpcy5nZXRIdHRwQ2xpZW50KCkuZ2V0PFRpbWVsaW5lSXRlbVtdPih1cmwpKTtcbiAgfVxuXG4gIC8vIC0tLSBQbGFuIE9wZXJhdGlvbnMgLS0tXG5cbiAgLyoqXG4gICAqIEdldHMgdGhlIHBsYW4gZG9jdW1lbnQgZm9yIGEgY2FyZCBhcyBtYXJrZG93bi5cbiAgICpcbiAgICogQHBhcmFtIGNhcmRJZCAtIElkZW50aWZpZXIgb2YgdGhlIGNhcmQgd2hvc2UgcGxhbiBtYXJrZG93biBzaG91bGQgYmUgcmV0dXJuZWQuXG4gICAqIEByZXR1cm5zIFByb21pc2UgcmVzb2x2aW5nIHRvIHBsYW4gbWFya2Rvd24uXG4gICAqIEB0aHJvd3MgQXBpRXJyb3Igd2hlbiB0aGUgc2VydmVyIHJlc3BvbmRzIHdpdGggYW4gZXJyb3IuXG4gICAqIEB0aHJvd3MgTmV0d29ya0Vycm9yIHdoZW4gdGhlIHJlcXVlc3QgZmFpbHMgdG8gcmVhY2ggdGhlIHNlcnZlci5cbiAgICovXG4gIGFzeW5jIGdldFBsYW4oY2FyZElkOiBzdHJpbmcpOiBQcm9taXNlPHN0cmluZz4ge1xuICAgIGNvbnN0IHVybCA9IHRoaXMuYnVpbGRVcmwoYC9jYXJkcy8ke2NhcmRJZH0vcGxhbmApO1xuICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgdGhpcy5yZXF1ZXN0KCgpID0+IHRoaXMuZ2V0SHR0cENsaWVudCgpLmdldDx7IGNvbnRlbnQ6IHN0cmluZyB9Pih1cmwpKTtcbiAgICByZXR1cm4gcmVzcG9uc2UuY29udGVudDtcbiAgfVxuXG4gIC8qKlxuICAgKiBVcGRhdGVzIHRoZSBwbGFuIGRvY3VtZW50IGZvciBhIGNhcmQuXG4gICAqXG4gICAqIEBwYXJhbSBjYXJkSWQgLSBJZGVudGlmaWVyIG9mIHRoZSBjYXJkIHdob3NlIHBsYW4gbWFya2Rvd24gc2hvdWxkIGJlIHVwZGF0ZWQuXG4gICAqIEBwYXJhbSBjb250ZW50IC0gUGxhbiBtYXJrZG93biBjb250ZW50LlxuICAgKiBAcmV0dXJucyBQcm9taXNlIHJlc29sdmluZyB3aGVuIHRoZSBwbGFuIGlzIHNhdmVkLlxuICAgKiBAdGhyb3dzIEFwaUVycm9yIHdoZW4gdGhlIHNlcnZlciByZWplY3RzIHRoZSB1cGRhdGUuXG4gICAqIEB0aHJvd3MgTmV0d29ya0Vycm9yIHdoZW4gdGhlIHJlcXVlc3QgZmFpbHMgdG8gcmVhY2ggdGhlIHNlcnZlci5cbiAgICogQGRlcHJlY2F0ZWQgVXNlIGRpcmVjdCBnaXQgb3BlcmF0aW9ucyBpbnN0ZWFkLiBUaGlzIGVuZHBvaW50IHdpbGwgYmUgcmVtb3ZlZC5cbiAgICovXG4gIGFzeW5jIHVwZGF0ZVBsYW4oY2FyZElkOiBzdHJpbmcsIGNvbnRlbnQ6IHN0cmluZyk6IFByb21pc2U8dm9pZD4ge1xuICAgIGNvbnN0IHVybCA9IHRoaXMuYnVpbGRVcmwoYC9jYXJkcy8ke2NhcmRJZH0vcGxhbmApO1xuICAgIHJldHVybiB0aGlzLnJlcXVlc3QoKCkgPT4gdGhpcy5nZXRIdHRwQ2xpZW50KCkucHV0PHZvaWQ+KHVybCwgY29udGVudCkpO1xuICB9XG5cbiAgLy8gLS0tIEdhdGUgT3BlcmF0aW9ucyAtLS1cblxuICAvKipcbiAgICogQXBwcm92ZXMgYSBnYXRlIGZvciBhIGNhcmQuXG4gICAqXG4gICAqIEBwYXJhbSBjYXJkSWQgLSBJZGVudGlmaWVyIG9mIHRoZSBjYXJkIHdob3NlIGdhdGUgc3RhdGUgc2hvdWxkIGJlIHVwZGF0ZWQuXG4gICAqIEBwYXJhbSBnYXRlTmFtZSAtIEdhdGUgbmFtZSB0byBhcHByb3ZlLlxuICAgKiBAcmV0dXJucyBQcm9taXNlIHJlc29sdmluZyB0byBnYXRlIGFwcHJvdmFsIG1ldGFkYXRhLlxuICAgKiBAdGhyb3dzIEFwaUVycm9yIHdoZW4gdGhlIHNlcnZlciByZWplY3RzIHRoZSBhcHByb3ZhbC5cbiAgICogQHRocm93cyBOZXR3b3JrRXJyb3Igd2hlbiB0aGUgcmVxdWVzdCBmYWlscyB0byByZWFjaCB0aGUgc2VydmVyLlxuICAgKiBAZGVwcmVjYXRlZCBVc2UgZGlyZWN0IGdpdCBvcGVyYXRpb25zIGluc3RlYWQuIFRoaXMgZW5kcG9pbnQgd2lsbCBiZSByZW1vdmVkLlxuICAgKi9cbiAgYXN5bmMgYXBwcm92ZUdhdGUoY2FyZElkOiBzdHJpbmcsIGdhdGVOYW1lOiAncGxhbicgfCAnbWVyZ2VSZXF1ZXN0Jyk6IFByb21pc2U8R2F0ZUFwcHJvdmFsUmVzcG9uc2U+IHtcbiAgICBjb25zdCB1cmwgPSB0aGlzLmJ1aWxkVXJsKGAvY2FyZHMvJHtjYXJkSWR9L2dhdGVzLyR7Z2F0ZU5hbWV9L2FwcHJvdmVgKTtcbiAgICByZXR1cm4gdGhpcy5yZXF1ZXN0KCgpID0+IHRoaXMuZ2V0SHR0cENsaWVudCgpLnBvc3Q8R2F0ZUFwcHJvdmFsUmVzcG9uc2U+KHVybCwgdW5kZWZpbmVkKSk7XG4gIH1cblxuICAvLyAtLS0gQ29tbWl0IE9wZXJhdGlvbnMgLS0tXG5cbiAgLyoqXG4gICAqIEdldHMgYWxsIGNvbW1pdHMgYXNzb2NpYXRlZCB3aXRoIGEgY2FyZC5cbiAgICpcbiAgICogQHBhcmFtIGNhcmRJZCAtIElkZW50aWZpZXIgb2YgdGhlIGNhcmQgd2hvc2UgY29tbWl0cyBzaG91bGQgYmUgcmV0dXJuZWQuXG4gICAqIEByZXR1cm5zIFByb21pc2UgcmVzb2x2aW5nIHRvIGNvbW1pdCBtZXRhZGF0YS5cbiAgICogQHRocm93cyBBcGlFcnJvciB3aGVuIHRoZSBzZXJ2ZXIgcmVzcG9uZHMgd2l0aCBhbiBlcnJvci5cbiAgICogQHRocm93cyBOZXR3b3JrRXJyb3Igd2hlbiB0aGUgcmVxdWVzdCBmYWlscyB0byByZWFjaCB0aGUgc2VydmVyLlxuICAgKi9cbiAgYXN5bmMgZ2V0Q29tbWl0cyhjYXJkSWQ6IHN0cmluZyk6IFByb21pc2U8Q29tbWl0SW5mb1tdPiB7XG4gICAgY29uc3QgdXJsID0gdGhpcy5idWlsZFVybChgL2NhcmRzLyR7Y2FyZElkfS9jb21taXRzYCk7XG4gICAgcmV0dXJuIHRoaXMucmVxdWVzdCgoKSA9PiB0aGlzLmdldEh0dHBDbGllbnQoKS5nZXQ8Q29tbWl0SW5mb1tdPih1cmwpKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBZGRzIGEgY29tbWl0IHRvIGEgY2FyZC5cbiAgICpcbiAgICogQHBhcmFtIGNhcmRJZCAtIElkZW50aWZpZXIgb2YgdGhlIGNhcmQgdG8gYXNzb2NpYXRlIHdpdGggdGhlIGNvbW1pdCBTSEEuXG4gICAqIEBwYXJhbSBzaGEgLSBHaXQgY29tbWl0IHNoYS5cbiAgICogQHJldHVybnMgUHJvbWlzZSByZXNvbHZpbmcgdG8gY29tbWl0IG1ldGFkYXRhLlxuICAgKiBAdGhyb3dzIEFwaUVycm9yIHdoZW4gdGhlIHNlcnZlciByZWplY3RzIHRoZSB1cGRhdGUuXG4gICAqIEB0aHJvd3MgTmV0d29ya0Vycm9yIHdoZW4gdGhlIHJlcXVlc3QgZmFpbHMgdG8gcmVhY2ggdGhlIHNlcnZlci5cbiAgICovXG4gIGFzeW5jIGFkZENvbW1pdChjYXJkSWQ6IHN0cmluZywgc2hhOiBzdHJpbmcpOiBQcm9taXNlPENvbW1pdEluZm8+IHtcbiAgICBjb25zdCB1cmwgPSB0aGlzLmJ1aWxkVXJsKGAvY2FyZHMvJHtjYXJkSWR9L2NvbW1pdHNgKTtcbiAgICByZXR1cm4gdGhpcy5yZXF1ZXN0KCgpID0+IHRoaXMuZ2V0SHR0cENsaWVudCgpLnBvc3Q8Q29tbWl0SW5mbz4odXJsLCB7IHNoYSB9KSk7XG4gIH1cblxuICAvKipcbiAgICogUmVtb3ZlcyBhIGNvbW1pdCBmcm9tIGEgY2FyZC5cbiAgICpcbiAgICogQHBhcmFtIGNhcmRJZCAtIElkZW50aWZpZXIgb2YgdGhlIGNhcmQgdG8gZGV0YWNoIGZyb20gdGhlIGNvbW1pdCBTSEEuXG4gICAqIEBwYXJhbSBzaGEgLSBHaXQgY29tbWl0IHNoYS5cbiAgICogQHBhcmFtIG9wdGlvbnMgLSBPcHRpb25hbCBwYXJhbWV0ZXJzLlxuICAgKiBAcGFyYW0gb3B0aW9ucy5zZXNzaW9uSWQgLSBDbGF1ZGUgQ29kZSBzZXNzaW9uIElEIGZvcndhcmRlZCBhcyBgWC1DYXJkcy1TZXNzaW9uLUlkYCBoZWFkZXIgc28gdGhlIGNhcmQgcmVwbyBwb3N0LWNvbW1pdCBob29rIGNhbiBhdHRyaWJ1dGUgdGhlIGNvbW1pdC5cbiAgICogQHJldHVybnMgUHJvbWlzZSByZXNvbHZpbmcgd2hlbiByZW1vdmFsIGlzIGNvbXBsZXRlLlxuICAgKiBAdGhyb3dzIEFwaUVycm9yIHdoZW4gdGhlIHNlcnZlciByZWplY3RzIHRoZSB1cGRhdGUuXG4gICAqIEB0aHJvd3MgTmV0d29ya0Vycm9yIHdoZW4gdGhlIHJlcXVlc3QgZmFpbHMgdG8gcmVhY2ggdGhlIHNlcnZlci5cbiAgICovXG4gIGFzeW5jIHJlbW92ZUNvbW1pdChjYXJkSWQ6IHN0cmluZywgc2hhOiBzdHJpbmcsIG9wdGlvbnM/OiB7IHNlc3Npb25JZD86IHN0cmluZyB9KTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc3QgdXJsID0gdGhpcy5idWlsZFVybChgL2NhcmRzLyR7Y2FyZElkfS9jb21taXRzLyR7c2hhfWApO1xuICAgIGNvbnN0IGhlYWRlcnM6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4gPSB7fTtcbiAgICBpZiAob3B0aW9ucz8uc2Vzc2lvbklkKSB7XG4gICAgICBoZWFkZXJzWydYLUNhcmRzLVNlc3Npb24tSWQnXSA9IG9wdGlvbnMuc2Vzc2lvbklkO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5yZXF1ZXN0KCgpID0+IHRoaXMuZ2V0SHR0cENsaWVudCgpLmRlbGV0ZSh1cmwsIHsgaGVhZGVycyB9KSk7XG4gIH1cblxuICAvLyAtLS0gQnJhbmNoIE9wZXJhdGlvbnMgLS0tXG5cbiAgLyoqXG4gICAqIEdldHMgYWxsIGJyYW5jaGVzIHRyYWNrZWQgb24gYSBjYXJkLlxuICAgKlxuICAgKiBAcGFyYW0gY2FyZElkIC0gVW5pcXVlIGlkZW50aWZpZXIgb2YgdGhlIGNhcmQgd2hvc2UgYnJhbmNoZXMgdG8gcmV0cmlldmUuXG4gICAqIEBwYXJhbSBvcHRpb25zIC0gT3B0aW9uYWwgcXVlcnkgcGFyYW1ldGVycy5cbiAgICogQHBhcmFtIG9wdGlvbnMud29ya3NwYWNlUGF0aCAtIFdvcmtzcGFjZSBwYXRoIGZvciBjb21wdXRpbmcgaXNNZXJnZWQgYW5kIGNvbW1pdCBjb250YWlubWVudC5cbiAgICogQHJldHVybnMgUHJvbWlzZSByZXNvbHZpbmcgdG8gYnJhbmNoZXMgcmVzcG9uc2UuXG4gICAqL1xuICBhc3luYyBnZXRCcmFuY2hlcyhjYXJkSWQ6IHN0cmluZywgb3B0aW9ucz86IHsgd29ya3NwYWNlUGF0aD86IHN0cmluZyB9KTogUHJvbWlzZTxCcmFuY2hlc1Jlc3BvbnNlPiB7XG4gICAgY29uc3QgdXJsID0gdGhpcy5idWlsZFVybChgL2NhcmRzLyR7Y2FyZElkfS9icmFuY2hlc2AsIHtcbiAgICAgIHdvcmtzcGFjZVBhdGg6IG9wdGlvbnM/LndvcmtzcGFjZVBhdGhcbiAgICB9KTtcbiAgICByZXR1cm4gdGhpcy5yZXF1ZXN0KCgpID0+IHRoaXMuZ2V0SHR0cENsaWVudCgpLmdldDxCcmFuY2hlc1Jlc3BvbnNlPih1cmwpKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBZGRzIGEgYnJhbmNoIHRvIGEgY2FyZC5cbiAgICpcbiAgICogQHBhcmFtIGNhcmRJZCAtIFVuaXF1ZSBpZGVudGlmaWVyIG9mIHRoZSBjYXJkIHRvIGFkZCB0aGUgYnJhbmNoIHRvLlxuICAgKiBAcGFyYW0gZGF0YSAtIEJyYW5jaCBkYXRhIGluY2x1ZGluZyBuYW1lIGFuZCBvcHRpb25hbCB3b3JrdHJlZSBwYXRoLlxuICAgKiBAcGFyYW0gb3B0aW9ucyAtIE9wdGlvbmFsIHBhcmFtZXRlcnMuXG4gICAqIEBwYXJhbSBvcHRpb25zLnNlc3Npb25JZCAtIENsYXVkZSBDb2RlIHNlc3Npb24gSUQgZm9yd2FyZGVkIGFzIGBYLUNhcmRzLVNlc3Npb24tSWRgIGhlYWRlciBzbyB0aGUgY2FyZCByZXBvIHBvc3QtY29tbWl0IGhvb2sgY2FuIGF0dHJpYnV0ZSB0aGUgY29tbWl0LlxuICAgKiBAcmV0dXJucyBQcm9taXNlIHJlc29sdmluZyB3aGVuIHRoZSBicmFuY2ggaXMgYWRkZWQuXG4gICAqL1xuICBhc3luYyBhZGRCcmFuY2goY2FyZElkOiBzdHJpbmcsIGRhdGE6IEFkZEJyYW5jaFJlcXVlc3QsIG9wdGlvbnM/OiB7IHNlc3Npb25JZD86IHN0cmluZyB9KTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc3QgdXJsID0gdGhpcy5idWlsZFVybChgL2NhcmRzLyR7Y2FyZElkfS9icmFuY2hlc2ApO1xuICAgIGNvbnN0IGhlYWRlcnM6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4gPSB7fTtcbiAgICBpZiAob3B0aW9ucz8uc2Vzc2lvbklkKSB7XG4gICAgICBoZWFkZXJzWydYLUNhcmRzLVNlc3Npb24tSWQnXSA9IG9wdGlvbnMuc2Vzc2lvbklkO1xuICAgIH1cbiAgICBhd2FpdCB0aGlzLnJlcXVlc3QoKCkgPT4gdGhpcy5nZXRIdHRwQ2xpZW50KCkucG9zdDx1bmtub3duPih1cmwsIGRhdGEsIHsgaGVhZGVycyB9KSk7XG4gIH1cblxuICAvKipcbiAgICogUmVtb3ZlcyBhIGJyYW5jaCBmcm9tIGEgY2FyZC5cbiAgICpcbiAgICogQHBhcmFtIGNhcmRJZCAtIFVuaXF1ZSBpZGVudGlmaWVyIG9mIHRoZSBjYXJkIHRvIHJlbW92ZSB0aGUgYnJhbmNoIGZyb20uXG4gICAqIEBwYXJhbSBuYW1lIC0gQnJhbmNoIG5hbWUgdG8gcmVtb3ZlICh3aWxsIGJlIFVSTC1lbmNvZGVkKS5cbiAgICogQHBhcmFtIG9wdGlvbnMgLSBPcHRpb25hbCBwYXJhbWV0ZXJzLlxuICAgKiBAcGFyYW0gb3B0aW9ucy5zZXNzaW9uSWQgLSBDbGF1ZGUgQ29kZSBzZXNzaW9uIElEIGZvcndhcmRlZCBhcyBgWC1DYXJkcy1TZXNzaW9uLUlkYCBoZWFkZXIgc28gdGhlIGNhcmQgcmVwbyBwb3N0LWNvbW1pdCBob29rIGNhbiBhdHRyaWJ1dGUgdGhlIGNvbW1pdC5cbiAgICogQHJldHVybnMgUHJvbWlzZSByZXNvbHZpbmcgd2hlbiB0aGUgYnJhbmNoIGlzIHJlbW92ZWQuXG4gICAqL1xuICBhc3luYyByZW1vdmVCcmFuY2goY2FyZElkOiBzdHJpbmcsIG5hbWU6IHN0cmluZywgb3B0aW9ucz86IHsgc2Vzc2lvbklkPzogc3RyaW5nIH0pOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zdCB1cmwgPSB0aGlzLmJ1aWxkVXJsKGAvY2FyZHMvJHtjYXJkSWR9L2JyYW5jaGVzLyR7ZW5jb2RlVVJJQ29tcG9uZW50KG5hbWUpfWApO1xuICAgIGNvbnN0IGhlYWRlcnM6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4gPSB7fTtcbiAgICBpZiAob3B0aW9ucz8uc2Vzc2lvbklkKSB7XG4gICAgICBoZWFkZXJzWydYLUNhcmRzLVNlc3Npb24tSWQnXSA9IG9wdGlvbnMuc2Vzc2lvbklkO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5yZXF1ZXN0KCgpID0+IHRoaXMuZ2V0SHR0cENsaWVudCgpLmRlbGV0ZSh1cmwsIHsgaGVhZGVycyB9KSk7XG4gIH1cblxuICAvLyAtLS0gVGFnIE9wZXJhdGlvbnMgLS0tXG5cbiAgLyoqXG4gICAqIEdldHMgYWxsIGF2YWlsYWJsZSB0YWdzLlxuICAgKlxuICAgKiBAcmV0dXJucyBQcm9taXNlIHJlc29sdmluZyB0byB0YWcgc3RyaW5ncy5cbiAgICogQHRocm93cyBBcGlFcnJvciB3aGVuIHRoZSBzZXJ2ZXIgcmVzcG9uZHMgd2l0aCBhbiBlcnJvci5cbiAgICogQHRocm93cyBOZXR3b3JrRXJyb3Igd2hlbiB0aGUgcmVxdWVzdCBmYWlscyB0byByZWFjaCB0aGUgc2VydmVyLlxuICAgKi9cbiAgYXN5bmMgZ2V0VGFncygpOiBQcm9taXNlPHN0cmluZ1tdPiB7XG4gICAgY29uc3QgdXJsID0gdGhpcy5idWlsZFVybCgnL3RhZ3MnLCB7XG4gICAgICB3b3Jrc3BhY2VQYXRoOiB0aGlzLm9wdGlvbnMud29ya3NwYWNlUGF0aFxuICAgIH0pO1xuICAgIHJldHVybiB0aGlzLnJlcXVlc3QoKCkgPT4gdGhpcy5nZXRIdHRwQ2xpZW50KCkuZ2V0PHN0cmluZ1tdPih1cmwpKTtcbiAgfVxuXG4gIC8vIC0tLSBFbnZpcm9ubWVudCBPcGVyYXRpb25zIC0tLVxuXG4gIC8qKlxuICAgKiBGZXRjaGVzIGF2YWlsYWJsZSBhZ2VudCBlbnZpcm9ubWVudHMuXG4gICAqXG4gICAqIEByZXR1cm5zIFByb21pc2UgcmVzb2x2aW5nIHRvIGVudmlyb25tZW50IG1ldGFkYXRhLlxuICAgKiBAdGhyb3dzIEFwaUVycm9yIHdoZW4gdGhlIHNlcnZlciByZXNwb25kcyB3aXRoIGFuIGVycm9yLlxuICAgKiBAdGhyb3dzIE5ldHdvcmtFcnJvciB3aGVuIHRoZSByZXF1ZXN0IGZhaWxzIHRvIHJlYWNoIHRoZSBzZXJ2ZXIuXG4gICAqL1xuICBhc3luYyBnZXRFbnZpcm9ubWVudHMoKTogUHJvbWlzZTxBcnJheTx7IG5hbWU6IHN0cmluZzsgZGVzY3JpcHRpb24/OiBzdHJpbmcgfT4+IHtcbiAgICBjb25zdCB1cmwgPSB0aGlzLmJ1aWxkVXJsKCcvZW52aXJvbm1lbnRzJyk7XG4gICAgcmV0dXJuIHRoaXMucmVxdWVzdCgoKSA9PiB0aGlzLmdldEh0dHBDbGllbnQoKS5nZXQ8QXJyYXk8eyBuYW1lOiBzdHJpbmc7IGRlc2NyaXB0aW9uPzogc3RyaW5nIH0+Pih1cmwpKTtcbiAgfVxuXG4gIC8vIC0tLSBUeXBlZCBGaWxlIE9wZXJhdGlvbnMgLS0tXG5cbiAgLyoqXG4gICAqIFN1Ym1pdHMgYW4gYWRhcHRpdmUgY2FyZCBhY3Rpb24gYnkgd3JpdGluZyBhbiBgYWRhcHRpdmUtY2FyZC1zdWJtaXNzaW9uYCB0eXBlZCBmaWxlLlxuICAgKlxuICAgKiBAcGFyYW0gY2FyZElkIC0gVGhlIGNhcmQgY29udGFpbmluZyB0aGUgYWRhcHRpdmUgY2FyZC5cbiAgICogQHBhcmFtIGFjdGlvbklkIC0gVGhlIGFjdGlvbiBJRCBmcm9tIHRoZSBhZGFwdGl2ZSBjYXJkIHN1Ym1pdCBhY3Rpb24uXG4gICAqIEBwYXJhbSBkYXRhIC0gVGhlIGZvcm0gZGF0YSBjb2xsZWN0ZWQgYnkgdGhlIGFkYXB0aXZlIGNhcmQuXG4gICAqIEByZXR1cm5zIFByb21pc2UgcmVzb2x2aW5nIHdoZW4gdGhlIHN1Ym1pc3Npb24gaXMgcGVyc2lzdGVkLlxuICAgKiBAdGhyb3dzIEFwaUVycm9yIHdoZW4gdGhlIHNlcnZlciByZWplY3RzIHRoZSBzdWJtaXNzaW9uIChlLmcuIHZhbGlkYXRpb24gZmFpbHVyZSkuXG4gICAqIEB0aHJvd3MgTmV0d29ya0Vycm9yIHdoZW4gdGhlIHJlcXVlc3QgZmFpbHMgdG8gcmVhY2ggdGhlIHNlcnZlci5cbiAgICovXG4gIGFzeW5jIHN1Ym1pdENhcmRBY3Rpb24oY2FyZElkOiBzdHJpbmcsIGFjdGlvbklkOiBzdHJpbmcsIGRhdGE6IFJlY29yZDxzdHJpbmcsIHVua25vd24+KTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc3QgZmlsZU5hbWUgPSBgJHthY3Rpb25JZH0tJHtEYXRlLm5vdygpfS5qc29uYDtcbiAgICBjb25zdCB1cmwgPSB0aGlzLmJ1aWxkVXJsKGAvY2FyZHMvJHtjYXJkSWR9L2FkYXB0aXZlLWNhcmQtc3VibWlzc2lvbi8ke2VuY29kZVVSSUNvbXBvbmVudChmaWxlTmFtZSl9YCk7XG4gICAgY29uc3QgYm9keSA9IHsgY2FyZElkLCBhY3Rpb25JZCwgZGF0YSB9O1xuICAgIGF3YWl0IHRoaXMucmVxdWVzdCgoKSA9PiB0aGlzLmdldEh0dHBDbGllbnQoKS5wdXQ8dW5rbm93bj4odXJsLCBib2R5KSk7XG4gIH1cblxuICAvLyAtLS0gVHlwZSBTY2hlbWEgT3BlcmF0aW9ucyAtLS1cblxuICAvKipcbiAgICogR2V0cyB0eXBlIHNjaGVtYXMgYW5kIGRlc2NyaXB0aW9ucyBmb3IgYSBjYXJkJ3MgZW52aXJvbm1lbnQuXG4gICAqXG4gICAqIFJldHVybnMgbWV0YWRhdGEgYWJvdXQgZWFjaCByZWdpc3RlcmVkIHR5cGUgaW4gdGhlIGNhcmQncyBlbnZpcm9ubWVudCxcbiAgICogaW5jbHVkaW5nIHZlcnNpb24sIHNjaGVtYSwgYW5kIGRlc2NyaXB0aW9uLiBDb21tYW5kIGRldGFpbHMgYXJlIGV4Y2x1ZGVkLlxuICAgKlxuICAgKiBAcGFyYW0gY2FyZElkIC0gSWRlbnRpZmllciBvZiB0aGUgY2FyZCB3aG9zZSB0eXBlIHNjaGVtYSBtZXRhZGF0YSBzaG91bGQgYmUgZmV0Y2hlZC5cbiAgICogQHJldHVybnMgUHJvbWlzZSByZXNvbHZpbmcgdG8gdHlwZSBzY2hlbWEgaW5mb3JtYXRpb24uXG4gICAqIEB0aHJvd3MgQXBpRXJyb3Igd2hlbiB0aGUgc2VydmVyIHJlc3BvbmRzIHdpdGggYW4gZXJyb3IuXG4gICAqIEB0aHJvd3MgTmV0d29ya0Vycm9yIHdoZW4gdGhlIHJlcXVlc3QgZmFpbHMgdG8gcmVhY2ggdGhlIHNlcnZlci5cbiAgICovXG4gIGFzeW5jIGdldFR5cGVTY2hlbWFzKGNhcmRJZDogc3RyaW5nKTogUHJvbWlzZTxUeXBlU2NoZW1hc1Jlc3BvbnNlPiB7XG4gICAgY29uc3QgdXJsID0gdGhpcy5idWlsZFVybChgL2NhcmRzLyR7Y2FyZElkfS9zY2hlbWFgKTtcbiAgICByZXR1cm4gdGhpcy5yZXF1ZXN0KCgpID0+IHRoaXMuZ2V0SHR0cENsaWVudCgpLmdldDxUeXBlU2NoZW1hc1Jlc3BvbnNlPih1cmwpKTtcbiAgfVxuXG4gIC8vIC0tLSBTdHJlYW0gT3BlcmF0aW9ucyAtLS1cblxuICAvKipcbiAgICogTGlzdHMgYWxsIHN0cmVhbXMgYXR0YWNoZWQgdG8gYSBjYXJkLCBzb3J0ZWQgYnkgY3JlYXRpb24gdGltZS5cbiAgICpcbiAgICogQHBhcmFtIGNhcmRJZCAtIENhcmQgSUQgdG8gcXVlcnkuXG4gICAqIEByZXR1cm5zIFN0cmVhbSBtZXRhZGF0YSBhcnJheSAobWF5IGJlIGVtcHR5KS5cbiAgICogQHRocm93cyBBcGlFcnJvciB3aGVuIHRoZSBzZXJ2ZXIgcmVzcG9uZHMgd2l0aCBhbiBlcnJvciAoZS5nLiwgNDA0IGZvciB1bmtub3duIGNhcmQpLlxuICAgKiBAdGhyb3dzIE5ldHdvcmtFcnJvciB3aGVuIHRoZSByZXF1ZXN0IGZhaWxzIHRvIHJlYWNoIHRoZSBzZXJ2ZXIuXG4gICAqL1xuICBhc3luYyBsaXN0U3RyZWFtcyhjYXJkSWQ6IHN0cmluZyk6IFByb21pc2U8U3RyZWFtTWV0YVtdPiB7XG4gICAgY29uc3QgdXJsID0gdGhpcy5idWlsZFVybChgL2NhcmRzLyR7Y2FyZElkfS9zdHJlYW1zYCk7XG4gICAgcmV0dXJuIHRoaXMucmVxdWVzdCgoKSA9PiB0aGlzLmdldEh0dHBDbGllbnQoKS5nZXQ8U3RyZWFtTWV0YVtdPih1cmwpKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXRyaWV2ZXMgYSBzdHJlYW0ncyBtZXRhZGF0YSBhbmQgYWxsIHJhdyBsaW5lcy5cbiAgICpcbiAgICogVGhlIGBzdHJlYW1UeXBlYCBhbmQgYGZpbGVuYW1lYCBhcmUgVVJJLWVuY29kZWQgYXV0b21hdGljYWxseS4gRm9yIGNvbXBsZXRlZFxuICAgKiBzdHJlYW1zIHRoZSByZXR1cm5lZCBgbGluZXNgIGFycmF5IGlzIHRoZSBmdWxsIGNvbnRlbnQ7IGZvciBhY3RpdmUgc3RyZWFtcyBpdFxuICAgKiBpcyBhIHNuYXBzaG90IHRoYXQgbWF5IGdyb3cgd2hpbGUgdGhlIGNhbGxlciBwcm9jZXNzZXMgaXQuXG4gICAqXG4gICAqIEBwYXJhbSBjYXJkSWQgLSBJZGVudGlmaWVyIG9mIHRoZSBjYXJkIHRoYXQgb3ducyB0aGUgcmVxdWVzdGVkIHN0cmVhbS5cbiAgICogQHBhcmFtIHN0cmVhbVR5cGUgLSBTdHJlYW0gdHlwZSBrZXkgKGUuZy4sIGBcImNsYXVkZS1jb2RlLXNlc3Npb25cImApLlxuICAgKiBAcGFyYW0gZmlsZW5hbWUgLSBTdHJlYW0gZmlsZW5hbWUgKGUuZy4sIGBcInNlc3Npb24ubG9nXCJgKS5cbiAgICogQHJldHVybnMgTWV0YWRhdGEgYW5kIGNvbnRlbnQgbGluZXMuXG4gICAqIEB0aHJvd3MgQXBpRXJyb3Igb24gNDA0ICh1bmtub3duIGNhcmQgb3Igc3RyZWFtKSBvciBvdGhlciBzZXJ2ZXIgZXJyb3JzLlxuICAgKiBAdGhyb3dzIE5ldHdvcmtFcnJvciB3aGVuIHRoZSByZXF1ZXN0IGZhaWxzIHRvIHJlYWNoIHRoZSBzZXJ2ZXIuXG4gICAqL1xuICBhc3luYyBnZXRTdHJlYW0oXG4gICAgY2FyZElkOiBzdHJpbmcsXG4gICAgc3RyZWFtVHlwZTogc3RyaW5nLFxuICAgIGZpbGVuYW1lOiBzdHJpbmdcbiAgKTogUHJvbWlzZTx7IG1ldGE6IFN0cmVhbU1ldGE7IGxpbmVzOiBzdHJpbmdbXSB9PiB7XG4gICAgY29uc3QgdXJsID0gdGhpcy5idWlsZFVybChcbiAgICAgIGAvY2FyZHMvJHtjYXJkSWR9L3N0cmVhbXMvJHtlbmNvZGVVUklDb21wb25lbnQoc3RyZWFtVHlwZSl9LyR7ZW5jb2RlVVJJQ29tcG9uZW50KGZpbGVuYW1lKX1gXG4gICAgKTtcbiAgICByZXR1cm4gdGhpcy5yZXF1ZXN0KCgpID0+IHRoaXMuZ2V0SHR0cENsaWVudCgpLmdldDx7IG1ldGE6IFN0cmVhbU1ldGE7IGxpbmVzOiBzdHJpbmdbXSB9Pih1cmwpKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBPcGVucyBhIGNodW5rZWQgSlNPTkwgc3RyZWFtIHRvIHRoZSBzZXJ2ZXIgYW5kIHJldHVybnMgYSB3cml0ZXIuXG4gICAqXG4gICAqIFRoZSB3cml0ZXIgc2VuZHMgZWFjaCBsaW5lIGluIHJlYWwtdGltZSBvdmVyIGEgc2luZ2xlIEhUVFAgUE9TVCB1c2luZyBhXG4gICAqIGBSZWFkYWJsZVN0cmVhbWAgYm9keS4gQ2FsbCB7QGxpbmsgU3RyZWFtV3JpdGVyLmNsb3NlfSB3aGVuIHRoZSBwcm9kdWNlclxuICAgKiBpcyBmaW5pc2hlZCB0byBlbmQgdGhlIHJlcXVlc3QgYW5kIHJldHJpZXZlIHRoZSBzZXJ2ZXIncyBzdW1tYXJ5LlxuICAgKlxuICAgKiBAcGFyYW0gY2FyZElkIC0gQ2FyZCBJRCB0byBhdHRhY2ggdGhlIHN0cmVhbSB0by5cbiAgICogQHBhcmFtIHN0cmVhbVR5cGUgLSBTdHJlYW0gdHlwZSBrZXkgZnJvbSBzZXR0aW5ncy5qc29uIChlLmcuLCBgXCJjbGF1ZGUtY29kZS1zZXNzaW9uXCJgKS5cbiAgICogQHBhcmFtIGZpbGVuYW1lIC0gU3RyZWFtIGZpbGVuYW1lIChlLmcuLCBgXCJzZXNzaW9uLWFiYy5qc29ubFwiYCkuXG4gICAqIEBwYXJhbSBvcHRpb25zIC0gT3B0aW9uYWwgdGl0bGUgYW5kIHNlc3Npb24gSUQgbWV0YWRhdGEuXG4gICAqIEByZXR1cm5zIEEge0BsaW5rIFN0cmVhbVdyaXRlcn0gZm9yIHB1c2hpbmcgbGluZXMgYW5kIGNsb3NpbmcgdGhlIHN0cmVhbS5cbiAgICpcbiAgICogQGV4YW1wbGVcbiAgICogYGBgdHlwZXNjcmlwdFxuICAgKiBjb25zdCBzdHJlYW0gPSBjbGllbnQub3BlblN0cmVhbShjYXJkSWQsICdjbGF1ZGUtY29kZS1zZXNzaW9uJywgJ3J1bi5qc29ubCcpO1xuICAgKiBzdHJlYW0ud3JpdGUoSlNPTi5zdHJpbmdpZnkoeyB0eXBlOiAnaW5pdCcgfSkpO1xuICAgKiBzdHJlYW0ud3JpdGUoSlNPTi5zdHJpbmdpZnkoeyB0eXBlOiAncmVzdWx0JyB9KSk7XG4gICAqIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHN0cmVhbS5jbG9zZSgpO1xuICAgKiBgYGBcbiAgICovXG4gIG9wZW5TdHJlYW0oY2FyZElkOiBzdHJpbmcsIHN0cmVhbVR5cGU6IHN0cmluZywgZmlsZW5hbWU6IHN0cmluZywgb3B0aW9ucz86IFN0cmVhbVdyaXRlck9wdGlvbnMpOiBTdHJlYW1Xcml0ZXIge1xuICAgIGNvbnN0IGVuY29kZXIgPSBuZXcgVGV4dEVuY29kZXIoKTtcbiAgICBsZXQgY29udHJvbGxlciE6IFJlYWRhYmxlU3RyZWFtRGVmYXVsdENvbnRyb2xsZXI8VWludDhBcnJheT47XG5cbiAgICBjb25zdCBib2R5ID0gbmV3IFJlYWRhYmxlU3RyZWFtPFVpbnQ4QXJyYXk+KHtcbiAgICAgIHN0YXJ0KGMpIHtcbiAgICAgICAgY29udHJvbGxlciA9IGM7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICBjb25zdCB1cmwgPSB0aGlzLmJ1aWxkVXJsKFxuICAgICAgYC9jYXJkcy8ke2NhcmRJZH0vc3RyZWFtcy8ke2VuY29kZVVSSUNvbXBvbmVudChzdHJlYW1UeXBlKX0vJHtlbmNvZGVVUklDb21wb25lbnQoZmlsZW5hbWUpfWBcbiAgICApO1xuXG4gICAgY29uc3QgaGVhZGVyczogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHtcbiAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24veC1uZGpzb24nXG4gICAgfTtcbiAgICBpZiAodGhpcy5vcHRpb25zLmFjY2Vzc1Rva2VuKSB7XG4gICAgICBoZWFkZXJzWydBdXRob3JpemF0aW9uJ10gPSBgQmVhcmVyICR7dGhpcy5vcHRpb25zLmFjY2Vzc1Rva2VufWA7XG4gICAgfVxuICAgIGlmIChvcHRpb25zPy50aXRsZSkge1xuICAgICAgaGVhZGVyc1snWC1TdHJlYW0tVGl0bGUnXSA9IG9wdGlvbnMudGl0bGU7XG4gICAgfVxuICAgIGlmIChvcHRpb25zPy5zZXNzaW9uSWQpIHtcbiAgICAgIGhlYWRlcnNbJ1gtU3RyZWFtLVNlc3Npb24tSWQnXSA9IG9wdGlvbnMuc2Vzc2lvbklkO1xuICAgIH1cblxuICAgIC8vIGBkdXBsZXg6ICdoYWxmJ2AgaXMgcmVxdWlyZWQgYnkgdW5kaWNpIGZvciBzdHJlYW1pbmcgcmVxdWVzdCBib2RpZXNcbiAgICAvLyBidXQgaXMgbm90IHlldCBpbiB0aGUgc3RhbmRhcmQgbGliLmRvbSBSZXF1ZXN0SW5pdCB0eXBlLlxuICAgIGNvbnN0IGZldGNoT3B0aW9uczogUmVxdWVzdEluaXQgJiB7IGR1cGxleDogc3RyaW5nIH0gPSB7XG4gICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgIGhlYWRlcnMsXG4gICAgICBib2R5LFxuICAgICAgZHVwbGV4OiAnaGFsZidcbiAgICB9O1xuXG4gICAgY29uc3QgcmVzcG9uc2VQcm9taXNlID0gZmV0Y2godXJsLCBmZXRjaE9wdGlvbnMpO1xuXG4gICAgLy8gVHJhY2sgZWFybHkgcmVqZWN0aW9uIGZyb20gdGhlIHNlcnZlciAoZS5nLiA0MDkgXCJTdHJlYW0gYWxyZWFkeVxuICAgIC8vIGV4aXN0cyBhbmQgaXMgYWN0aXZlXCIpLiAgRm9yIGEgc3VjY2Vzc2Z1bCBzdHJlYW0gdGhlIHJlc3BvbnNlIHN0YXlzXG4gICAgLy8gcGVuZGluZyB1bnRpbCBjbG9zZSgpIGVuZHMgdGhlIGJvZHkgXHUyMDE0IGJ1dCBlcnJvciByZXNwb25zZXMgYXJyaXZlXG4gICAgLy8gaW1tZWRpYXRlbHkgYW5kIG11c3QgYmUgc3VyZmFjZWQgd2l0aG91dCB3YWl0aW5nIGZvciBjbG9zZSgpLlxuICAgIC8vIE5vdGU6IG9ubHkgcmVhZHMgcmVzcG9uc2Uub2svc3RhdHVzVGV4dCAobm90IHRoZSBib2R5KSBzbyBjbG9zZSgpXG4gICAgLy8gY2FuIHN0aWxsIHBhcnNlIHRoZSBmdWxsIGVycm9yIHJlc3BvbnNlLlxuICAgIGxldCBlYXJseUVycm9yOiBFcnJvciB8IG51bGwgPSBudWxsO1xuICAgIHJlc3BvbnNlUHJvbWlzZVxuICAgICAgLnRoZW4oKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgIGlmICghcmVzcG9uc2Uub2spIHtcbiAgICAgICAgICBlYXJseUVycm9yID0gbmV3IEFwaUVycm9yKHJlc3BvbnNlLnN0YXR1c1RleHQsIFN0cmluZyhyZXNwb25zZS5zdGF0dXMpKTtcbiAgICAgICAgfVxuICAgICAgfSlcbiAgICAgIC5jYXRjaCgoZXJyOiB1bmtub3duKSA9PiB7XG4gICAgICAgIGVhcmx5RXJyb3IgPSBlcnIgaW5zdGFuY2VvZiBFcnJvciA/IGVyciA6IG5ldyBFcnJvcihTdHJpbmcoZXJyKSk7XG4gICAgICB9KTtcblxuICAgIHJldHVybiB7XG4gICAgICB3cml0ZShsaW5lOiBzdHJpbmcpOiB2b2lkIHtcbiAgICAgICAgaWYgKGVhcmx5RXJyb3IpIHRocm93IGVhcmx5RXJyb3I7XG4gICAgICAgIGNvbnRyb2xsZXIuZW5xdWV1ZShlbmNvZGVyLmVuY29kZShgJHtsaW5lfVxcbmApKTtcbiAgICAgIH0sXG4gICAgICBjbG9zZTogYXN5bmMgKCk6IFByb21pc2U8U3RyZWFtUmVzdWx0PiA9PiB7XG4gICAgICAgIGNvbnRyb2xsZXIuY2xvc2UoKTtcbiAgICAgICAgcmV0dXJuIHRoaXMucmVxdWVzdChhc3luYyAoKSA9PiB7XG4gICAgICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCByZXNwb25zZVByb21pc2U7XG4gICAgICAgICAgaWYgKCFyZXNwb25zZS5vaykgdGhyb3cgcmVzcG9uc2U7XG4gICAgICAgICAgcmV0dXJuIHJlc3BvbnNlLmpzb24oKSBhcyBQcm9taXNlPFN0cmVhbVJlc3VsdD47XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH07XG4gIH1cblxuICAvKipcbiAgICogT3BlbnMgYSBXZWJTb2NrZXQtYmFja2VkIEpTT05MIHN0cmVhbSB0byB0aGUgc2VydmVyIGFuZCByZXR1cm5zIGEgc2Vzc2lvbi5cbiAgICpcbiAgICogVGhlIHNlc3Npb24ga2VlcHMgYSBwZXJzaXN0ZW50IFdlYlNvY2tldCBjb25uZWN0aW9uIGZvciB0aGUgZW50aXJlIHNlc3Npb25cbiAgICogbGlmZXRpbWUuIFRoZSBzZXJ2ZXIgc2VuZHMgYSBgcmVhZHlgIG1lc3NhZ2Ugd2l0aCBgcmVzdW1lRnJvbWAgYmVmb3JlIHRoZVxuICAgKiBjYWxsZXIgd3JpdGVzIGFueSBsaW5lcywgc28gdGhlIHdhdGNoZXIgY2FuIHNraXAgbGluZXMgdGhlIHNlcnZlciBhbHJlYWR5IGhhcy5cbiAgICpcbiAgICogQ2FsbCB7QGxpbmsgV3NTdHJlYW1TZXNzaW9uLmNsb3NlfSB3aGVuIHRoZSBwcm9kdWNlciBpcyBmaW5pc2hlZCB0byBzZW5kIGFcbiAgICogZ3JhY2VmdWwgY2xvc2UgbWVzc2FnZSBhbmQgYXdhaXQgdGhlIHNlcnZlcidzIGFja25vd2xlZGdlbWVudC5cbiAgICpcbiAgICogQHBhcmFtIGNhcmRJZCAtIENhcmQgSUQgdG8gYXR0YWNoIHRoZSBzdHJlYW0gdG8uXG4gICAqIEBwYXJhbSBzdHJlYW1UeXBlIC0gU3RyZWFtIHR5cGUga2V5IGZyb20gc2V0dGluZ3MuanNvbiAoZS5nLiwgYFwiY2xhdWRlLWNvZGUtc2Vzc2lvblwiYCkuXG4gICAqIEBwYXJhbSBmaWxlbmFtZSAtIFN0cmVhbSBmaWxlbmFtZSAoZS5nLiwgYFwic2Vzc2lvbi1hYmMuanNvbmxcImApLlxuICAgKiBAcGFyYW0gb3B0aW9ucyAtIFRpdGxlIGFuZCBzZXNzaW9uIElEIG1ldGFkYXRhIGZvcndhcmRlZCB0byB0aGUgc2VydmVyIGFzIFVSTCBxdWVyeSBwYXJhbWV0ZXJzLlxuICAgKiBAcGFyYW0gd3NGYWN0b3J5IC0gV2ViU29ja2V0IGZhY3RvcnkgZm9yIGNyZWF0aW5nIHRoZSBjb25uZWN0aW9uLiBVc2UgdGhlIGB3c2AgcGFja2FnZSBpbiBOb2RlLmpzIGVudmlyb25tZW50cy5cbiAgICogQHJldHVybnMgQSB7QGxpbmsgV3NTdHJlYW1TZXNzaW9ufSB3aXRoIGByZXN1bWVGcm9tYCBzZXQgdG8gdGhlIHNlcnZlcidzIGN1cnJlbnQgbGluZSBjb3VudC5cbiAgICogQHRocm93cyBFcnJvciB3aGVuIHRoZSBXZWJTb2NrZXQgZmFpbHMgdG8gY29ubmVjdCBvciB0aGUgc2VydmVyIHNlbmRzIGFuIGVycm9yIGJlZm9yZSBgcmVhZHlgLlxuICAgKi9cbiAgYXN5bmMgb3BlblN0cmVhbVdlYlNvY2tldChcbiAgICBjYXJkSWQ6IHN0cmluZyxcbiAgICBzdHJlYW1UeXBlOiBzdHJpbmcsXG4gICAgZmlsZW5hbWU6IHN0cmluZyxcbiAgICBvcHRpb25zOiBTdHJlYW1Xcml0ZXJPcHRpb25zLFxuICAgIHdzRmFjdG9yeTogSW5nZXN0V3NGYWN0b3J5XG4gICk6IFByb21pc2U8V3NTdHJlYW1TZXNzaW9uPiB7XG4gICAgY29uc3QgZmFjdG9yeSA9IHdzRmFjdG9yeTtcblxuICAgIC8vIENvbnZlcnQgaHR0cC9odHRwcyB0byB3cy93c3NcbiAgICBjb25zdCBiYXNlVXJsID0gdGhpcy5vcHRpb25zLmJhc2VVcmwucmVwbGFjZSgvXmh0dHAvLCAnd3MnKTtcbiAgICBjb25zdCBiYXNlUGF0aCA9IGAke2Jhc2VVcmx9L2NhcmRzLyR7ZW5jb2RlVVJJQ29tcG9uZW50KGNhcmRJZCl9L3N0cmVhbXMvJHtlbmNvZGVVUklDb21wb25lbnQoc3RyZWFtVHlwZSl9LyR7ZW5jb2RlVVJJQ29tcG9uZW50KGZpbGVuYW1lKX1gO1xuICAgIGNvbnN0IHF1ZXJ5UGFyYW1zID0gbmV3IFVSTFNlYXJjaFBhcmFtcygpO1xuICAgIGlmIChvcHRpb25zPy50aXRsZSkgcXVlcnlQYXJhbXMuc2V0KCd0aXRsZScsIG9wdGlvbnMudGl0bGUpO1xuICAgIGlmIChvcHRpb25zPy5zZXNzaW9uSWQpIHF1ZXJ5UGFyYW1zLnNldCgnc2Vzc2lvbklkJywgb3B0aW9ucy5zZXNzaW9uSWQpO1xuICAgIGNvbnN0IHF1ZXJ5U3RyaW5nID0gcXVlcnlQYXJhbXMudG9TdHJpbmcoKTtcbiAgICBjb25zdCB1cmwgPSBxdWVyeVN0cmluZyA/IGAke2Jhc2VQYXRofT8ke3F1ZXJ5U3RyaW5nfWAgOiBiYXNlUGF0aDtcblxuICAgIGNvbnN0IGhlYWRlcnM6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4gPSB7fTtcbiAgICBpZiAodGhpcy5vcHRpb25zLmFjY2Vzc1Rva2VuKSB7XG4gICAgICBoZWFkZXJzWydBdXRob3JpemF0aW9uJ10gPSBgQmVhcmVyICR7dGhpcy5vcHRpb25zLmFjY2Vzc1Rva2VufWA7XG4gICAgfVxuXG4gICAgY29uc3Qgd3MgPSBmYWN0b3J5KHVybCwgeyBoZWFkZXJzIH0pO1xuXG4gICAgLy8gQXdhaXQgdGhlICdyZWFkeScgbWVzc2FnZSBmcm9tIHRoZSBzZXJ2ZXIgYmVmb3JlIHJldHVybmluZyB0byB0aGUgY2FsbGVyLlxuICAgIC8vIEFueSBlcnJvciBvciBwcmVtYXR1cmUgY2xvc2UgYmVmb3JlICdyZWFkeScgcmVqZWN0cyB0aGUgcHJvbWlzZS5cbiAgICBjb25zdCByZXN1bWVGcm9tID0gYXdhaXQgbmV3IFByb21pc2U8bnVtYmVyPigocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICBjb25zdCBvblJlYWR5ID0gKGV2ZW50OiBNZXNzYWdlRXZlbnQ8dW5rbm93bj4pID0+IHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBjb25zdCBtc2cgPSBKU09OLnBhcnNlKFN0cmluZyhldmVudC5kYXRhKSkgYXMgeyB0eXBlOiBzdHJpbmc7IHJlc3VtZUZyb20/OiBudW1iZXI7IG1lc3NhZ2U/OiBzdHJpbmcgfTtcbiAgICAgICAgICBpZiAobXNnLnR5cGUgPT09ICdyZWFkeScpIHtcbiAgICAgICAgICAgIHdzLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ21lc3NhZ2UnLCBvblJlYWR5KTtcbiAgICAgICAgICAgIHdzLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2Vycm9yJywgb25FcnJvcik7XG4gICAgICAgICAgICB3cy5yZW1vdmVFdmVudExpc3RlbmVyKCdjbG9zZScsIG9uQ2xvc2UpO1xuICAgICAgICAgICAgcmVzb2x2ZShtc2cucmVzdW1lRnJvbSA/PyAwKTtcbiAgICAgICAgICB9IGVsc2UgaWYgKG1zZy50eXBlID09PSAnZXJyb3InKSB7XG4gICAgICAgICAgICB3cy5yZW1vdmVFdmVudExpc3RlbmVyKCdtZXNzYWdlJywgb25SZWFkeSk7XG4gICAgICAgICAgICB3cy5yZW1vdmVFdmVudExpc3RlbmVyKCdlcnJvcicsIG9uRXJyb3IpO1xuICAgICAgICAgICAgd3MucmVtb3ZlRXZlbnRMaXN0ZW5lcignY2xvc2UnLCBvbkNsb3NlKTtcbiAgICAgICAgICAgIHJlamVjdChuZXcgRXJyb3IobXNnLm1lc3NhZ2UgPz8gJ1NlcnZlciBlcnJvcicpKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgLy8gT3RoZXIgbWVzc2FnZSB0eXBlcyBiZWZvcmUgJ3JlYWR5JyBhcmUgc2lsZW50bHkgaWdub3JlZFxuICAgICAgICB9IGNhdGNoIHtcbiAgICAgICAgICByZWplY3QobmV3IEVycm9yKCdGYWlsZWQgdG8gcGFyc2Ugc2VydmVyIHJlYWR5IG1lc3NhZ2UnKSk7XG4gICAgICAgIH1cbiAgICAgIH07XG4gICAgICBjb25zdCBvbkVycm9yID0gKGV2ZW50OiBFdmVudCkgPT4ge1xuICAgICAgICB3cy5yZW1vdmVFdmVudExpc3RlbmVyKCdtZXNzYWdlJywgb25SZWFkeSk7XG4gICAgICAgIHdzLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2Vycm9yJywgb25FcnJvcik7XG4gICAgICAgIHdzLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2Nsb3NlJywgb25DbG9zZSk7XG4gICAgICAgIHJlamVjdChuZXcgRXJyb3IoYFdlYlNvY2tldCBlcnJvcjogJHtTdHJpbmcoZXZlbnQpfWApKTtcbiAgICAgIH07XG4gICAgICBjb25zdCBvbkNsb3NlID0gKGV2ZW50OiBDbG9zZUV2ZW50KSA9PiB7XG4gICAgICAgIHdzLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ21lc3NhZ2UnLCBvblJlYWR5KTtcbiAgICAgICAgd3MucmVtb3ZlRXZlbnRMaXN0ZW5lcignZXJyb3InLCBvbkVycm9yKTtcbiAgICAgICAgd3MucmVtb3ZlRXZlbnRMaXN0ZW5lcignY2xvc2UnLCBvbkNsb3NlKTtcbiAgICAgICAgcmVqZWN0KG5ldyBFcnJvcihgV2ViU29ja2V0IGNsb3NlZCBiZWZvcmUgcmVhZHk6IGNvZGU9JHtTdHJpbmcoZXZlbnQuY29kZSl9YCkpO1xuICAgICAgfTtcbiAgICAgIHdzLmFkZEV2ZW50TGlzdGVuZXIoJ21lc3NhZ2UnLCBvblJlYWR5KTtcbiAgICAgIHdzLmFkZEV2ZW50TGlzdGVuZXIoJ2Vycm9yJywgb25FcnJvcik7XG4gICAgICB3cy5hZGRFdmVudExpc3RlbmVyKCdjbG9zZScsIG9uQ2xvc2UpO1xuICAgIH0pO1xuXG4gICAgbGV0IGxpbmVzU2VudCA9IHJlc3VtZUZyb207XG5cbiAgICByZXR1cm4ge1xuICAgICAgZ2V0IHJlc3VtZUZyb20oKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIHJlc3VtZUZyb207XG4gICAgICB9LFxuICAgICAgZ2V0IGxpbmVzU2VudCgpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gbGluZXNTZW50O1xuICAgICAgfSxcbiAgICAgIHdyaXRlKGxpbmU6IHN0cmluZyk6IHZvaWQge1xuICAgICAgICBsaW5lc1NlbnQrKztcbiAgICAgICAgd3Muc2VuZChKU09OLnN0cmluZ2lmeSh7IHR5cGU6ICdsaW5lJywgbGluZU51bWJlcjogbGluZXNTZW50LCBjb250ZW50OiBsaW5lIH0pKTtcbiAgICAgIH0sXG4gICAgICBhc3luYyBjbG9zZSgpOiBQcm9taXNlPFN0cmVhbVJlc3VsdD4ge1xuICAgICAgICB3cy5zZW5kKEpTT04uc3RyaW5naWZ5KHsgdHlwZTogJ2Nsb3NlJyB9KSk7XG4gICAgICAgIGF3YWl0IG5ldyBQcm9taXNlPHZvaWQ+KChyZXNvbHZlKSA9PiB7XG4gICAgICAgICAgY29uc3Qgb25DbG9zZSA9ICgpID0+IHtcbiAgICAgICAgICAgIHdzLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2Nsb3NlJywgb25DbG9zZSk7XG4gICAgICAgICAgICByZXNvbHZlKCk7XG4gICAgICAgICAgfTtcbiAgICAgICAgICB3cy5hZGRFdmVudExpc3RlbmVyKCdjbG9zZScsIG9uQ2xvc2UpO1xuICAgICAgICAgIC8vIElmIGFscmVhZHkgY2xvc2VkLCByZXNvbHZlIGltbWVkaWF0ZWx5XG4gICAgICAgICAgaWYgKHdzLnJlYWR5U3RhdGUgPT09IHdzLkNMT1NFRCkge1xuICAgICAgICAgICAgd3MucmVtb3ZlRXZlbnRMaXN0ZW5lcignY2xvc2UnLCBvbkNsb3NlKTtcbiAgICAgICAgICAgIHJlc29sdmUoKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgIGZpbGVuYW1lLFxuICAgICAgICAgIHN0cmVhbVR5cGUsXG4gICAgICAgICAgbGluZUNvdW50OiBsaW5lc1NlbnQsXG4gICAgICAgICAgc3RhdHVzOiAnY29tcGxldGVkJ1xuICAgICAgICB9O1xuICAgICAgfVxuICAgIH07XG4gIH1cblxuICAvLyAtLS0gQWN0aW9uIE9wZXJhdGlvbnMgLS0tXG5cbiAgLyoqXG4gICAqIEV4ZWN1dGVzIGFuIGFjdGlvbiBvbiBhIGNhcmQgdmlhIHRoZSBzZXJ2ZXIgcmVsYXkuXG4gICAqXG4gICAqIEBwYXJhbSBjYXJkSWQgLSBJZGVudGlmaWVyIG9mIHRoZSBjYXJkIHRvIGV4ZWN1dGUgdGhlIGFjdGlvbiBvbi5cbiAgICogQHBhcmFtIGFjdGlvbk5hbWUgLSBBY3Rpb24gaWRlbnRpZmllciAoZS5nLiwgJ2xhdW5jaCcpLlxuICAgKiBAcmV0dXJucyBQcm9taXNlIHJlc29sdmluZyB0byB0aGUgYWN0aW9uIGV4ZWN1dGlvbiByZXN1bHQuXG4gICAqIEB0aHJvd3MgQXBpRXJyb3Igd2hlbiB0aGUgc2VydmVyIHJlamVjdHMgdGhlIHJlcXVlc3QuXG4gICAqIEB0aHJvd3MgTmV0d29ya0Vycm9yIHdoZW4gdGhlIHJlcXVlc3QgZmFpbHMgdG8gcmVhY2ggdGhlIHNlcnZlci5cbiAgICovXG4gIGFzeW5jIGV4ZWN1dGVBY3Rpb24oY2FyZElkOiBzdHJpbmcsIGFjdGlvbk5hbWU6IHN0cmluZyk6IFByb21pc2U8QWN0aW9uUmVzdWx0PiB7XG4gICAgY29uc3QgdXJsID0gdGhpcy5idWlsZFVybChgL2NhcmRzLyR7Y2FyZElkfS9hY3Rpb25zLyR7ZW5jb2RlVVJJQ29tcG9uZW50KGFjdGlvbk5hbWUpfWApO1xuICAgIHJldHVybiB0aGlzLnJlcXVlc3QoKCkgPT4gdGhpcy5nZXRIdHRwQ2xpZW50KCkucG9zdDxBY3Rpb25SZXN1bHQ+KHVybCwgdW5kZWZpbmVkKSk7XG4gIH1cblxuICAvLyAtLS0gQ29tcGFyZSBPcGVyYXRpb25zIC0tLVxuXG4gIC8qKlxuICAgKiBTZXRzIG9yIHJlcGxhY2VzIHRoZSBhY3RpdmUgY29tcGFyaXNvbiBvbiB0aGUgc2VydmVyLlxuICAgKlxuICAgKiBAcGFyYW0gcmVxdWVzdCAtIENvbXBhcmUgcmVxdWVzdCBzcGVjaWZ5aW5nIHRoZSBjb21wYXJpc29uIG1vZGUuXG4gICAqIEByZXR1cm5zIFByb21pc2UgcmVzb2x2aW5nIHRvIHRoZSByZXN1bHRpbmcgY29tcGFyZSBzdGF0ZS5cbiAgICovXG4gIGFzeW5jIHNldENvbXBhcmUocmVxdWVzdDogQ29tcGFyZVJlcXVlc3QpOiBQcm9taXNlPENvbXBhcmVTdGF0ZT4ge1xuICAgIGNvbnN0IHVybCA9IHRoaXMuYnVpbGRVcmwoJy9jb21wYXJlJyk7XG4gICAgcmV0dXJuIHRoaXMucmVxdWVzdCgoKSA9PiB0aGlzLmdldEh0dHBDbGllbnQoKS5wb3N0PENvbXBhcmVTdGF0ZT4odXJsLCByZXF1ZXN0KSk7XG4gIH1cblxuICAvKipcbiAgICogUmV0dXJucyB0aGUgY3VycmVudCBjb21wYXJlIHN0YXRlLCBvciBudWxsIGlmIG5vIGNvbXBhcmlzb24gaXMgYWN0aXZlLlxuICAgKlxuICAgKiBUaGUgc2VydmVyIHJldHVybnMgMjA0IHdoZW4gbm8gY29tcGFyaXNvbiBpcyBhY3RpdmUsIHdoaWNoIHRoaXMgbWV0aG9kXG4gICAqIG1hcHMgdG8gbnVsbCByYXRoZXIgdGhhbiB0aHJvd2luZy5cbiAgICpcbiAgICogQHJldHVybnMgUHJvbWlzZSByZXNvbHZpbmcgdG8gdGhlIGN1cnJlbnQgY29tcGFyZSBzdGF0ZSwgb3IgbnVsbCBpZiBub25lIGFjdGl2ZS5cbiAgICovXG4gIGFzeW5jIGdldENvbXBhcmUoKTogUHJvbWlzZTxDb21wYXJlU3RhdGUgfCBudWxsPiB7XG4gICAgY29uc3QgdXJsID0gdGhpcy5idWlsZFVybCgnL2NvbXBhcmUnKTtcbiAgICByZXR1cm4gdGhpcy5yZXF1ZXN0KGFzeW5jICgpID0+IHtcbiAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZmV0Y2godXJsLCB7XG4gICAgICAgIGhlYWRlcnM6IHRoaXMuZ2V0SGVhZGVycygpIGFzIFJlY29yZDxzdHJpbmcsIHN0cmluZz4sXG4gICAgICAgIHNpZ25hbDogdGhpcy5nZXRUaW1lb3V0U2lnbmFsKClcbiAgICAgIH0pO1xuICAgICAgaWYgKHJlc3BvbnNlLnN0YXR1cyA9PT0gMjA0KSB7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfVxuICAgICAgaWYgKCFyZXNwb25zZS5vaykgdGhyb3cgcmVzcG9uc2U7XG4gICAgICByZXR1cm4gcmVzcG9uc2UuanNvbigpIGFzIFByb21pc2U8Q29tcGFyZVN0YXRlPjtcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDbGVhcnMgdGhlIGFjdGl2ZSBjb21wYXJpc29uIG9uIHRoZSBzZXJ2ZXIuXG4gICAqXG4gICAqIEByZXR1cm5zIFByb21pc2UgcmVzb2x2aW5nIHdoZW4gdGhlIGNvbXBhcmlzb24gaXMgY2xlYXJlZC5cbiAgICovXG4gIGFzeW5jIGNsZWFyQ29tcGFyZSgpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zdCB1cmwgPSB0aGlzLmJ1aWxkVXJsKCcvY29tcGFyZScpO1xuICAgIHJldHVybiB0aGlzLnJlcXVlc3QoKCkgPT4gdGhpcy5nZXRIdHRwQ2xpZW50KCkuZGVsZXRlKHVybCkpO1xuICB9XG59XG4iLCAiLyoqXG4gKiBTaGFyZWQgc2Vzc2lvbiB1dGlsaXRpZXMgZm9yIENsYXVkZSBDb2RlIGFjdGlvbiB3b3JrZmxvd3MuXG4gKlxuICogUHJvdmlkZXMgcmV1c2FibGUgYnVpbGRpbmcgYmxvY2tzIGZvciBhY3Rpb25zIHRoYXQgc3Bhd24gdGhlIGBjbGF1ZGVgIENMSTpcbiAqIHBsdWdpbiBzZXR0aW5ncyBjb25zdHJ1Y3Rpb24sIENMSSBhcmcgYnVpbGRpbmcsIHdvcmt0cmVlIGxpZmVjeWNsZSBtYW5hZ2VtZW50LFxuICogYW5kIGJyYW5jaCBjbGVhbnVwLiBCb3RoIHRoZSBgbGF1bmNoYCBhbmQgYGludGVydmlld2AgYWN0aW9ucyBjb25zdW1lIHRoZXNlXG4gKiB1dGlsaXRpZXMuXG4gKlxuICogQHN1bW1hcnkgU2hhcmVkIHNlc3Npb24gdXRpbGl0aWVzIGZvciBDbGF1ZGUgQ29kZSBhY3Rpb24gd29ya2Zsb3dzXG4gKiBAbW9kdWxlXG4gKi9cblxuaW1wb3J0IHsgdHlwZSBDaGlsZFByb2Nlc3MsIGV4ZWNGaWxlLCBzcGF3biB9IGZyb20gJ25vZGU6Y2hpbGRfcHJvY2Vzcyc7XG5pbXBvcnQgKiBhcyBmcyBmcm9tICdub2RlOmZzL3Byb21pc2VzJztcbmltcG9ydCAqIGFzIHBhdGggZnJvbSAnbm9kZTpwYXRoJztcbmltcG9ydCB7IHByb21pc2lmeSB9IGZyb20gJ25vZGU6dXRpbCc7XG5pbXBvcnQgeyBDYXJkc0NsaWVudCB9IGZyb20gJ0BjYXJkcy9zZGsvY2xpZW50JztcbmltcG9ydCB7IHR5cGUgQWN0aW9uQ29udGV4dCwgdHlwZSBBY3Rpb25JbnB1dCwgQ0FSRFNfRU5WX1ZBUlMgfSBmcm9tICdAY2FyZHMvc2RrL2NvbmZpZyc7XG5pbXBvcnQgeyByZXNvbHZlQ2xhdWRlQ29uZmlnRGlyLCB1cGRhdGVNYXJrZXRwbGFjZVJlZ2lzdHJhdGlvbiB9IGZyb20gJ0BjYXJkcy9zZGsvbWFya2V0cGxhY2UnO1xuZXhwb3J0IHsgcmVzb2x2ZUNsYXVkZUNvbmZpZ0RpciwgdXBkYXRlTWFya2V0cGxhY2VSZWdpc3RyYXRpb24gfTtcblxuaW1wb3J0IHsgY2hlY2tXb3JrdHJlZUV4aXN0cywgY3JlYXRlV29ya3RyZWUsIGZpbmRHaXRSb290cyB9IGZyb20gJ0BjYXJkcy9zZGsvd29ya3RyZWUnO1xuXG5jb25zdCBleGVjRmlsZUFzeW5jID0gcHJvbWlzaWZ5KGV4ZWNGaWxlKTtcblxuLyoqXG4gKiBFeHRyYWN0cyBhIGh1bWFuLXJlYWRhYmxlIG1lc3NhZ2UgZnJvbSBhbiB1bmtub3duIGNhdGNoIHZhbHVlLlxuICogQHBhcmFtIGVycm9yIC0gVGhlIGNhdWdodCB2YWx1ZSB0byBleHRyYWN0IGEgbWVzc2FnZSBmcm9tLlxuICogQHJldHVybnMgVGhlIGVycm9yIG1lc3NhZ2Ugc3RyaW5nLlxuICovXG5leHBvcnQgZnVuY3Rpb24gZXJyb3JNZXNzYWdlKGVycm9yOiB1bmtub3duKTogc3RyaW5nIHtcbiAgcmV0dXJuIGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogU3RyaW5nKGVycm9yKTtcbn1cblxuLyoqXG4gKiBSZXNvbHZlcyB0aGUgbWFya2V0cGxhY2UgZGlyZWN0b3J5IGJ1bmRsZWQgd2l0aCB0aGUgaW5zdGFsbGVkIGV4dGVuc2lvbi5cbiAqIFVzZXMgdGhlIEVYVEVOU0lPTl9QQVRIIGVudmlyb25tZW50IHZhcmlhYmxlIGluamVjdGVkIGJ5IEFjdGlvbkRpc3BhdGNoZXIuXG4gKlxuICogQHJldHVybnMgQWJzb2x1dGUgcGF0aCB0byB0aGUgYnVuZGxlZCBtYXJrZXRwbGFjZSBkaXJlY3RvcnkuXG4gKiBAdGhyb3dzIEVycm9yIGlmIEVYVEVOU0lPTl9QQVRIIGlzIG5vdCBzZXQuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiByZXNvbHZlTWFya2V0cGxhY2VQYXRoKCk6IHN0cmluZyB7XG4gIGNvbnN0IGV4dGVuc2lvblBhdGggPSBwcm9jZXNzLmVudltDQVJEU19FTlZfVkFSUy5FWFRFTlNJT05fUEFUSF07XG4gIGlmICghZXh0ZW5zaW9uUGF0aCkge1xuICAgIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyByZXF1aXJlZCBlbnZpcm9ubWVudCB2YXJpYWJsZTogJHtDQVJEU19FTlZfVkFSUy5FWFRFTlNJT05fUEFUSH1gKTtcbiAgfVxuICByZXR1cm4gcGF0aC5qb2luKGV4dGVuc2lvblBhdGgsICdkaXN0JywgJ21hcmtldHBsYWNlJyk7XG59XG5cbi8qKlxuICogQnVpbGRzIHRoZSBgLS1zZXR0aW5nc2AgSlNPTiB0aGF0IGVuYWJsZXMgdGhlIGBydW50aW1lYCBwbHVnaW4gYW5kIHJlZ2lzdGVyc1xuICogdGhlIGBjYXJkcy5tYW5hZ2VtZW50YCBtYXJrZXRwbGFjZSBzb3VyY2Ugc28gdGhlIHNwYXduZWQgYGNsYXVkZWAgcHJvY2Vzc1xuICogY2FuIHJlc29sdmUgdGhlIHBsdWdpbiBmcm9tIHRoZSBleHRlbnNpb24ncyBidW5kbGVkIG1hcmtldHBsYWNlLlxuICpcbiAqIFVzZXMgdGhlIG1hcmtldHBsYWNlIGJ1bmRsZWQgaW5zaWRlIHRoZSBleHRlbnNpb24gaW5zdGFsbCBkaXJlY3RvcnlcbiAqIChgPEVYVEVOU0lPTl9QQVRIPi9kaXN0L21hcmtldHBsYWNlYCkgc28gdGhlIHNwYXduZWQgc2Vzc2lvbiBhbHdheXMgbG9hZHMgdGhlXG4gKiBwbHVnaW4gdmVyc2lvbiB0aGF0IHNoaXBwZWQgd2l0aCB0aGUgZXh0ZW5zaW9uLCByZWdhcmRsZXNzIG9mIHdvcmt0cmVlIHN0YXRlLlxuICpcbiAqIEBwYXJhbSBtYXJrZXRwbGFjZVBhdGggLSBBYnNvbHV0ZSBwYXRoIHRvIHRoZSBidW5kbGVkIG1hcmtldHBsYWNlIGRpcmVjdG9yeS5cbiAqIEByZXR1cm5zIFNlcmlhbGlzZWQgc2V0dGluZ3MgSlNPTiBzdHJpbmcuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBidWlsZFBsdWdpblNldHRpbmdzKG1hcmtldHBsYWNlUGF0aDogc3RyaW5nKTogc3RyaW5nIHtcbiAgcmV0dXJuIEpTT04uc3RyaW5naWZ5KHtcbiAgICBlbmFibGVkUGx1Z2luczogeyAncnVudGltZUBjYXJkcy5tYW5hZ2VtZW50JzogdHJ1ZSB9LFxuICAgIGV4dHJhS25vd25NYXJrZXRwbGFjZXM6IHtcbiAgICAgICdjYXJkcy5tYW5hZ2VtZW50Jzoge1xuICAgICAgICBzb3VyY2U6IHsgc291cmNlOiAnZGlyZWN0b3J5JywgcGF0aDogbWFya2V0cGxhY2VQYXRoIH1cbiAgICAgIH1cbiAgICB9XG4gIH0pO1xufVxuXG4vKipcbiAqIEJ1aWxkcyB0aGUgQ0xJIGFyZ3VtZW50IGxpc3QgZm9yIHRoZSBgY2xhdWRlYCBwcm9jZXNzLlxuICpcbiAqIEBwYXJhbSBwcm9tcHQgLSBUaGUgcHJvbXB0IHN0cmluZyBmb3IgbmV3IHNlc3Npb25zLlxuICogQHBhcmFtIHNlc3Npb25JZCAtIFNlc3Npb24gaWRlbnRpZmllciAodXNlZCBmb3IgYC0tc2Vzc2lvbi1pZGAgb3IgYC0tcmVzdW1lYCkuXG4gKiBAcGFyYW0gcmVzdW1lIC0gV2hlbiB0cnVlLCBwYXNzZXMgYC0tcmVzdW1lYCBpbnN0ZWFkIG9mIHN0YXJ0aW5nIGEgbmV3IHNlc3Npb24uXG4gKiBAcGFyYW0gbW9kZSAtIEV4ZWN1dGlvbiBtb2RlOyBgJ2JhY2tncm91bmQnYCBhcHBlbmRzIGAtLXByaW50YC5cbiAqIEBwYXJhbSBjYXJkUmVwb1BhdGggLSBBYnNvbHV0ZSBwYXRoIHBhc3NlZCB2aWEgYC0tYWRkLWRpcmAuXG4gKiBAcGFyYW0gbWFya2V0cGxhY2VQYXRoIC0gQWJzb2x1dGUgcGF0aCB0byB0aGUgYnVuZGxlZCBtYXJrZXRwbGFjZSBkaXJlY3RvcnkuXG4gKiBAcmV0dXJucyBBcnJheSBvZiBDTEkgYXJndW1lbnRzLlxuICovXG5leHBvcnQgZnVuY3Rpb24gYnVpbGRBcmdzKFxuICBwcm9tcHQ6IHN0cmluZyxcbiAgc2Vzc2lvbklkOiBzdHJpbmcsXG4gIHJlc3VtZTogYm9vbGVhbixcbiAgbW9kZTogQWN0aW9uSW5wdXRbJ2V4ZWN1dGlvbk1vZGUnXSxcbiAgY2FyZFJlcG9QYXRoOiBzdHJpbmcsXG4gIG1hcmtldHBsYWNlUGF0aDogc3RyaW5nXG4pOiBzdHJpbmdbXSB7XG4gIGNvbnN0IGFyZ3M6IHN0cmluZ1tdID0gW107XG5cbiAgaWYgKHJlc3VtZSkge1xuICAgIGFyZ3MucHVzaCgnLS1yZXN1bWUnLCBzZXNzaW9uSWQpO1xuICB9IGVsc2Uge1xuICAgIGFyZ3MucHVzaChwcm9tcHQpO1xuICAgIGFyZ3MucHVzaCgnLS1zZXNzaW9uLWlkJywgc2Vzc2lvbklkKTtcbiAgfVxuICBhcmdzLnB1c2goJy0tc2V0dGluZ3MnLCBidWlsZFBsdWdpblNldHRpbmdzKG1hcmtldHBsYWNlUGF0aCkpO1xuICBhcmdzLnB1c2goJy0tYWRkLWRpcicsIGNhcmRSZXBvUGF0aCk7XG4gIGlmIChtb2RlID09PSAnYmFja2dyb3VuZCcpIHtcbiAgICBhcmdzLnB1c2goJy0tcHJpbnQnKTtcbiAgfVxuXG4gIHJldHVybiBhcmdzO1xufVxuXG4vKipcbiAqIEV4dHJhY3RzIHRoZSBjYXJkIElEIGZyb20gYSBgY2FyZHMvPGNhcmRJZD4vPG4+YCBicmFuY2ggbmFtZS5cbiAqXG4gKiBAcGFyYW0gYnJhbmNoTmFtZSAtIEJyYW5jaCBuYW1lIHRvIHBhcnNlLlxuICogQHJldHVybnMgVGhlIGNhcmQgSUQsIG9yIGBudWxsYCBpZiB0aGUgYnJhbmNoIGRvZXNuJ3QgbWF0Y2ggdGhlIHBhdHRlcm4uXG4gKi9cbmZ1bmN0aW9uIGNhcmRJZEZyb21CcmFuY2goYnJhbmNoTmFtZTogc3RyaW5nKTogc3RyaW5nIHwgbnVsbCB7XG4gIGNvbnN0IG1hdGNoID0gYnJhbmNoTmFtZS5tYXRjaCgvXmNhcmRzXFwvKC4rKVxcL1xcZCskLyk7XG4gIHJldHVybiBtYXRjaD8uWzFdID8/IG51bGw7XG59XG5cbi8qKlxuICogUmVzb2x2ZXMgdGhlIGJhc2UgYnJhbmNoIGZvciB0aGUgd29ya3NwYWNlLCBmb2xsb3dpbmcgdGhlIGBwYXJlbnRCcmFuY2hgXG4gKiBjaGFpbiB3aGVuIEhFQUQgaXMgYSBgY2FyZHMvKmAgd29ya3RyZWUgYnJhbmNoLlxuICpcbiAqIENhcmQgYnJhbmNoZXMgYXJlIGVwaGVtZXJhbCBhbmQgbm90IHZhbGlkIG1lcmdlIHRhcmdldHMuIFdoZW4gdGhlIHdvcmtzcGFjZVxuICogSEVBRCBoYXBwZW5zIHRvIGJlIG9uIG9uZSAoZS5nLiwgdGhlIG1haW4gY2hlY2tvdXQgd2FzIGxlZnQgb24gYSBjYXJkXG4gKiBicmFuY2gpLCB0aGlzIGZ1bmN0aW9uIHF1ZXJpZXMgdGhlIEFQSSBmb3IgdGhhdCBicmFuY2gncyBgcGFyZW50QnJhbmNoYFxuICogYW5kIHJlY3Vyc2VzIHVudGlsIGl0IGZpbmRzIGEgbm9uLWBjYXJkcy8qYCBicmFuY2guXG4gKlxuICogQHBhcmFtIHdvcmtzcGFjZVBhdGggLSBEaXJlY3Rvcnkgd2hlcmUgYGdpdCByZXYtcGFyc2VgIHJ1bnMuXG4gKiBAcGFyYW0gY2xpZW50IC0gQ2FyZHMgQVBJIGNsaWVudCBmb3IgcmVzb2x2aW5nIHBhcmVudEJyYW5jaCBvZiBjYXJkIGJyYW5jaGVzLlxuICogQHJldHVybnMgVGhlIGZpcnN0IG5vbi1gY2FyZHMvKmAgYnJhbmNoIGluIHRoZSBwYXJlbnQgY2hhaW4uXG4gKiBAdGhyb3dzIEVycm9yIGlmIHRoZSBwYXJlbnQgY2hhaW4gY2Fubm90IGJlIHJlc29sdmVkIChtaXNzaW5nIEFQSSByZWNvcmRzLCBjeWNsZXMpLlxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcmVzb2x2ZUJhc2VCcmFuY2god29ya3NwYWNlUGF0aDogc3RyaW5nLCBjbGllbnQ/OiBDYXJkc0NsaWVudCk6IFByb21pc2U8c3RyaW5nPiB7XG4gIGNvbnN0IHsgc3Rkb3V0IH0gPSBhd2FpdCBleGVjRmlsZUFzeW5jKCdnaXQnLCBbJ3Jldi1wYXJzZScsICctLWFiYnJldi1yZWYnLCAnSEVBRCddLCB7XG4gICAgY3dkOiB3b3Jrc3BhY2VQYXRoXG4gIH0pO1xuICBsZXQgYnJhbmNoID0gc3Rkb3V0LnRyaW0oKTtcblxuICBjb25zdCB2aXNpdGVkID0gbmV3IFNldDxzdHJpbmc+KCk7XG4gIHdoaWxlIChicmFuY2guc3RhcnRzV2l0aCgnY2FyZHMvJykpIHtcbiAgICBpZiAodmlzaXRlZC5oYXMoYnJhbmNoKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBDaXJjdWxhciBwYXJlbnRCcmFuY2ggY2hhaW4gZGV0ZWN0ZWQ6ICR7Wy4uLnZpc2l0ZWQsIGJyYW5jaF0uam9pbignIFx1MjE5MiAnKX1gKTtcbiAgICB9XG4gICAgdmlzaXRlZC5hZGQoYnJhbmNoKTtcblxuICAgIGNvbnN0IGNhcmRJZCA9IGNhcmRJZEZyb21CcmFuY2goYnJhbmNoKTtcbiAgICBpZiAoIWNhcmRJZCB8fCAhY2xpZW50KSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgIGBXb3Jrc3BhY2UgSEVBRCBpcyBvbiBjYXJkIGJyYW5jaCBcIiR7YnJhbmNofVwiIGJ1dCBjYW5ub3QgcmVzb2x2ZSBpdHMgcGFyZW50LiBgICtcbiAgICAgICAgICAnU3dpdGNoIHRoZSBtYWluIGNoZWNrb3V0IHRvIGEgbm9uLWNhcmQgYnJhbmNoIChlLmcuLCBtYWluKS4nXG4gICAgICApO1xuICAgIH1cblxuICAgIGNvbnN0IHsgYnJhbmNoZXMgfSA9IGF3YWl0IGNsaWVudC5nZXRCcmFuY2hlcyhjYXJkSWQsIHsgd29ya3NwYWNlUGF0aCB9KTtcbiAgICBjb25zdCByZWNvcmQgPSBicmFuY2hlcy5maW5kKChiKSA9PiBiLm5hbWUgPT09IGJyYW5jaCk7XG4gICAgaWYgKCFyZWNvcmQ/LnBhcmVudEJyYW5jaCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICBgQ2FyZCBicmFuY2ggXCIke2JyYW5jaH1cIiBoYXMgbm8gcGFyZW50QnJhbmNoIHJlY29yZC4gYCArXG4gICAgICAgICAgJ1N3aXRjaCB0aGUgbWFpbiBjaGVja291dCB0byBhIG5vbi1jYXJkIGJyYW5jaCAoZS5nLiwgbWFpbikuJ1xuICAgICAgKTtcbiAgICB9XG5cbiAgICBicmFuY2ggPSByZWNvcmQucGFyZW50QnJhbmNoO1xuICB9XG5cbiAgcmV0dXJuIGJyYW5jaDtcbn1cblxuLyoqXG4gKiBDaGVja3Mgd2hldGhlciBhIHdvcmt0cmVlIHBhdGggZXhpc3RzIG9uIGRpc2suXG4gKlxuICogQHBhcmFtIHdvcmt0cmVlUGF0aCAtIEFic29sdXRlIHBhdGggdG8gdGVzdC5cbiAqIEByZXR1cm5zIFRydWUgd2hlbiB0aGUgcGF0aCBpcyBhY2Nlc3NpYmxlLlxuICovXG5hc3luYyBmdW5jdGlvbiB3b3JrdHJlZUV4aXN0c09uRGlzayh3b3JrdHJlZVBhdGg6IHN0cmluZyk6IFByb21pc2U8Ym9vbGVhbj4ge1xuICB0cnkge1xuICAgIGF3YWl0IGZzLmFjY2Vzcyh3b3JrdHJlZVBhdGgpO1xuICAgIHJldHVybiB0cnVlO1xuICB9IGNhdGNoIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbn1cblxuLyoqXG4gKiBGaW5kcyBvciBjcmVhdGVzIGEgd29ya3RyZWUgZm9yIHRoZSBjYXJkLlxuICpcbiAqIFRyaWVzIHRvIHJldXNlIGFuIGV4aXN0aW5nIGJyYW5jaCB3aG9zZSB3b3JrdHJlZSBpcyBzdGlsbCBvbiBkaXNrLiBXaGVuIG5vXG4gKiB2YWxpZCBicmFuY2ggZXhpc3RzLCBjcmVhdGVzIGEgbmV3IG9uZSBhbmQgcmVnaXN0ZXJzIGl0IHdpdGggdGhlIEFQSS5cbiAqXG4gKiBAcGFyYW0gaW5wdXQgLSBBY3Rpb24gaW5wdXQgY29udGFpbmluZyBjYXJkSWQgYW5kIHdvcmtzcGFjZSBwYXRocy5cbiAqIEBwYXJhbSBjbGllbnQgLSBDYXJkcyBBUEkgY2xpZW50IGZvciBicmFuY2ggQ1JVRC5cbiAqIEBwYXJhbSBiYXNlQnJhbmNoIC0gQ3VycmVudCBicmFuY2ggaW4gdGhlIHdvcmtzcGFjZSAodXNlZCBhcyBwYXJlbnQpLlxuICogQHBhcmFtIGxvZ2dlciAtIExvZ2dlciBmb3IgZGlhZ25vc3RpYyBvdXRwdXQuXG4gKiBAcGFyYW0gc2Vzc2lvbklkIC0gQ2xhdWRlIENvZGUgc2Vzc2lvbiBJRCBmb3J3YXJkZWQgdG8gdGhlIEFQSSBzbyB0aGUgY2FyZCByZXBvIHBvc3QtY29tbWl0IGhvb2sgY2FuIGF0dHJpYnV0ZSB0aGUgY29tbWl0LlxuICogQHJldHVybnMgV29ya3RyZWUgcGF0aCwgYnJhbmNoIG5hbWUsIGFuZCBwYXJlbnQgYnJhbmNoIG5hbWUuXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiByZXNvbHZlT3JDcmVhdGVXb3JrdHJlZShcbiAgaW5wdXQ6IEFjdGlvbklucHV0LFxuICBjbGllbnQ6IENhcmRzQ2xpZW50LFxuICBiYXNlQnJhbmNoOiBzdHJpbmcsXG4gIGxvZ2dlcjogQWN0aW9uQ29udGV4dFsnbG9nZ2VyJ10sXG4gIHNlc3Npb25JZD86IHN0cmluZ1xuKTogUHJvbWlzZTx7IHdvcmt0cmVlUGF0aDogc3RyaW5nOyBicmFuY2hOYW1lOiBzdHJpbmc7IHBhcmVudEJyYW5jaDogc3RyaW5nIH0+IHtcbiAgY29uc3QgeyBicmFuY2hlcyB9ID0gYXdhaXQgY2xpZW50LmdldEJyYW5jaGVzKGlucHV0LmNhcmRJZCwgeyB3b3Jrc3BhY2VQYXRoOiBpbnB1dC5yZXBvUm9vdCB9KTtcblxuICAvLyBTdGVwIDE6IFRyeSB0byByZXVzZSBhbiBleGlzdGluZyBicmFuY2ggd2l0aCBhIHZhbGlkIHdvcmt0cmVlIG9uIGRpc2tcbiAgZm9yIChjb25zdCBicmFuY2ggb2YgYnJhbmNoZXMpIHtcbiAgICBpZiAoIWJyYW5jaC5leGlzdHMgfHwgIWJyYW5jaC53b3JrdHJlZSkgY29udGludWU7XG4gICAgaWYgKCEoYXdhaXQgd29ya3RyZWVFeGlzdHNPbkRpc2soYnJhbmNoLndvcmt0cmVlKSkpIGNvbnRpbnVlO1xuXG4gICAgbG9nZ2VyLmluZm8oJ1JldXNpbmcgZXhpc3Rpbmcgd29ya3RyZWUnLCB7IGJyYW5jaDogYnJhbmNoLm5hbWUsIHdvcmt0cmVlOiBicmFuY2gud29ya3RyZWUgfSk7XG4gICAgcmV0dXJuIHsgd29ya3RyZWVQYXRoOiBicmFuY2gud29ya3RyZWUsIGJyYW5jaE5hbWU6IGJyYW5jaC5uYW1lLCBwYXJlbnRCcmFuY2g6IGJyYW5jaC5wYXJlbnRCcmFuY2ggfTtcbiAgfVxuXG4gIC8vIFN0ZXAgMjogVHJ5IHRvIGNyZWF0ZSBhIHdvcmt0cmVlIGZvciBhbiBleGlzdGluZyBicmFuY2ggd2hvc2Ugd29ya3RyZWVcbiAgLy8gaXMgbWlzc2luZyBmcm9tIGRpc2sgKGUuZy4gY2xlYW5lZCB1cCBieSBhIHByZXZpb3VzIHNlc3Npb24gY3Jhc2gpLlxuICBmb3IgKGNvbnN0IGJyYW5jaCBvZiBicmFuY2hlcykge1xuICAgIGlmICghYnJhbmNoLmV4aXN0cykgY29udGludWU7XG4gICAgaWYgKCFicmFuY2gubmFtZS5zdGFydHNXaXRoKGBjYXJkcy8ke2lucHV0LmNhcmRJZH0vYCkpIGNvbnRpbnVlO1xuXG4gICAgbG9nZ2VyLmluZm8oJ1JlYXR0YWNoaW5nIHdvcmt0cmVlIGZvciBleGlzdGluZyBicmFuY2gnLCB7IGJyYW5jaDogYnJhbmNoLm5hbWUgfSk7XG4gICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgY3JlYXRlV29ya3RyZWUoYnJhbmNoLm5hbWUsIHsgY3dkOiBpbnB1dC5yZXBvUm9vdCB9KTtcblxuICAgIC8vIFVwZGF0ZSB0aGUgQVBJIHJlY29yZCB3aXRoIHRoZSBuZXcgd29ya3RyZWUgcGF0aFxuICAgIGF3YWl0IGNsaWVudC5hZGRCcmFuY2goXG4gICAgICBpbnB1dC5jYXJkSWQsXG4gICAgICB7IG5hbWU6IGJyYW5jaC5uYW1lLCB3b3JrdHJlZTogcmVzdWx0Lndvcmt0cmVlLCBwYXJlbnRCcmFuY2g6IGJyYW5jaC5wYXJlbnRCcmFuY2ggfSxcbiAgICAgIHsgc2Vzc2lvbklkIH1cbiAgICApO1xuXG4gICAgcmV0dXJuIHsgd29ya3RyZWVQYXRoOiByZXN1bHQud29ya3RyZWUsIGJyYW5jaE5hbWU6IGJyYW5jaC5uYW1lLCBwYXJlbnRCcmFuY2g6IGJyYW5jaC5wYXJlbnRCcmFuY2ggfTtcbiAgfVxuXG4gIC8vIFN0ZXAgMzogTm8gdmFsaWQgZXhpc3RpbmcgYnJhbmNoIFx1MjAxNCBjcmVhdGUgbmV3IG9uZS5cbiAgLy8gVGhlIEFQSSBtYXkgYmUgb3V0IG9mIHN5bmMgd2l0aCBnaXQgKGUuZy4gYSBwcmV2aW91cyB3b3JrdHJlZSB3YXMgY3JlYXRlZFxuICAvLyBidXQgbmV2ZXIgcmVnaXN0ZXJlZCwgb3IgaXRzIEFQSSByZWNvcmQgd2FzIGRlbGV0ZWQpLiBUbyBhdm9pZCBjb2xsaWRpbmdcbiAgLy8gd2l0aCB3b3JrdHJlZXMgZ2l0IGFscmVhZHkga25vd3MgYWJvdXQsIHByb2JlIGdpdCdzIGFjdHVhbCBzdGF0ZSBhbmRcbiAgLy8gaW5jcmVtZW50IHBhc3QgYW55IG9jY3VwaWVkIHNsb3RzLlxuICBjb25zdCBwcmVmaXggPSBgY2FyZHMvJHtpbnB1dC5jYXJkSWR9L2A7XG4gIGNvbnN0IGV4aXN0aW5nTnVtYmVycyA9IGJyYW5jaGVzXG4gICAgLmZpbHRlcigoYikgPT4gYi5uYW1lLnN0YXJ0c1dpdGgocHJlZml4KSlcbiAgICAubWFwKChiKSA9PiBwYXJzZUludChiLm5hbWUuc2xpY2UocHJlZml4Lmxlbmd0aCksIDEwKSlcbiAgICAuZmlsdGVyKChuKSA9PiAhTnVtYmVyLmlzTmFOKG4pKTtcbiAgbGV0IG5leHROdW1iZXIgPSBleGlzdGluZ051bWJlcnMubGVuZ3RoID4gMCA/IE1hdGgubWF4KC4uLmV4aXN0aW5nTnVtYmVycykgKyAxIDogMTtcblxuICBjb25zdCB7IHJlcG9Sb290IH0gPSBhd2FpdCBmaW5kR2l0Um9vdHMoaW5wdXQucmVwb1Jvb3QpO1xuICB3aGlsZSAoYXdhaXQgY2hlY2tXb3JrdHJlZUV4aXN0cyhyZXBvUm9vdCwgcGF0aC5qb2luKHJlcG9Sb290LCAnLndvcmt0cmVlcycsIGAke3ByZWZpeH0ke25leHROdW1iZXJ9YCkpKSB7XG4gICAgbG9nZ2VyLndhcm4oJ1dvcmt0cmVlIGFscmVhZHkgZXhpc3RzIGluIGdpdCBidXQgbm90IGluIEFQSSwgc2tpcHBpbmcnLCB7XG4gICAgICBicmFuY2g6IGAke3ByZWZpeH0ke25leHROdW1iZXJ9YFxuICAgIH0pO1xuICAgIG5leHROdW1iZXIrKztcbiAgfVxuXG4gIGNvbnN0IGJyYW5jaE5hbWUgPSBgJHtwcmVmaXh9JHtuZXh0TnVtYmVyfWA7XG4gIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGNyZWF0ZVdvcmt0cmVlKGJyYW5jaE5hbWUsIHsgY3dkOiBpbnB1dC5yZXBvUm9vdCB9KTtcbiAgYXdhaXQgY2xpZW50LmFkZEJyYW5jaChcbiAgICBpbnB1dC5jYXJkSWQsXG4gICAgeyBuYW1lOiBicmFuY2hOYW1lLCB3b3JrdHJlZTogcmVzdWx0Lndvcmt0cmVlLCBwYXJlbnRCcmFuY2g6IGJhc2VCcmFuY2ggfSxcbiAgICB7IHNlc3Npb25JZCB9XG4gICk7XG5cbiAgbG9nZ2VyLmluZm8oJ0NyZWF0ZWQgbmV3IHdvcmt0cmVlJywgeyBicmFuY2g6IGJyYW5jaE5hbWUsIHdvcmt0cmVlOiByZXN1bHQud29ya3RyZWUgfSk7XG4gIHJldHVybiB7IHdvcmt0cmVlUGF0aDogcmVzdWx0Lndvcmt0cmVlLCBicmFuY2hOYW1lLCBwYXJlbnRCcmFuY2g6IGJhc2VCcmFuY2ggfTtcbn1cblxuLyoqXG4gKiBSdW5zIGEgc2luZ2xlIGNsZWFudXAgc3RlcCwgbG9nZ2luZyBhIHdhcm5pbmcgb24gZmFpbHVyZSByYXRoZXIgdGhhblxuICogYWJvcnRpbmcgdGhlIHN3ZWVwLiBFYWNoIHN0ZXAgKHdvcmt0cmVlIHJlbW92YWwsIGJyYW5jaCBkZWxldGlvbiwgQVBJXG4gKiByZWNvcmQgcmVtb3ZhbCkgaXMgaW5kZXBlbmRlbnQgXHUyMDE0IGEgZmFpbHVyZSBpbiBvbmUgbXVzdCBub3QgcHJldmVudCB0aGVcbiAqIG90aGVycyBmcm9tIHJ1bm5pbmcuXG4gKlxuICogQHBhcmFtIHN0ZXAgLSBBc3luYyBvcGVyYXRpb24gdG8gYXR0ZW1wdC5cbiAqIEBwYXJhbSBsYWJlbCAtIEh1bWFuLXJlYWRhYmxlIGxhYmVsIGxvZ2dlZCBvbiBmYWlsdXJlLlxuICogQHBhcmFtIGJyYW5jaE5hbWUgLSBCcmFuY2ggbmFtZSBpbmNsdWRlZCBpbiBkaWFnbm9zdGljIG91dHB1dC5cbiAqIEBwYXJhbSBsb2dnZXIgLSBMb2dnZXIgZm9yIGRpYWdub3N0aWMgb3V0cHV0LlxuICovXG5hc3luYyBmdW5jdGlvbiB0cnlDbGVhbnVwU3RlcChcbiAgc3RlcDogKCkgPT4gUHJvbWlzZTx1bmtub3duPixcbiAgbGFiZWw6IHN0cmluZyxcbiAgYnJhbmNoTmFtZTogc3RyaW5nLFxuICBsb2dnZXI6IEFjdGlvbkNvbnRleHRbJ2xvZ2dlciddXG4pOiBQcm9taXNlPHZvaWQ+IHtcbiAgdHJ5IHtcbiAgICBhd2FpdCBzdGVwKCk7XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgbG9nZ2VyLndhcm4obGFiZWwsIHsgYnJhbmNoOiBicmFuY2hOYW1lLCBlcnJvcjogZXJyb3JNZXNzYWdlKGVycm9yKSB9KTtcbiAgfVxufVxuXG4vKipcbiAqIFJlbW92ZXMgYnJhbmNoZXMgdGhhdCBhcmUgZnVsbHkgbWVyZ2VkIGludG8gdGhlaXIgcGFyZW50IGJyYW5jaC5cbiAqXG4gKiBGb3IgZWFjaCBtZXJnZWQgYnJhbmNoIHRoZSB3b3JrdHJlZSBkaXJlY3RvcnkgaXMgcmVtb3ZlZCwgdGhlIGxvY2FsIGJyYW5jaFxuICogcmVmIGlzIGRlbGV0ZWQsIGFuZCB0aGUgYnJhbmNoIHJlY29yZCBpcyByZW1vdmVkIGZyb20gdGhlIEFQSS4gV29ya3RyZWVcbiAqIHJlbW92YWwgZmFpbHVyZXMgYXJlIGxvZ2dlZCBhbmQgZG8gbm90IGJsb2NrIGJyYW5jaCBkZWxldGlvbi4gSG93ZXZlciwgdGhlXG4gKiBBUEkgcmVjb3JkIGlzIG9ubHkgcmVtb3ZlZCBhZnRlciBjb25maXJtaW5nIHRoZSBnaXQgYnJhbmNoIHdhcyBkZWxldGVkIFx1MjAxNFxuICogcmVtb3ZpbmcgdGhlIHJlY29yZCB3aGlsZSB0aGUgYnJhbmNoIHN0aWxsIGV4aXN0cyB3b3VsZCBjYXVzZSBzdWJzZXF1ZW50XG4gKiBzZXNzaW9ucyB0byBsb3NlIHRyYWNrIG9mIGl0IGFuZCBjcmVhdGUgZHVwbGljYXRlcy5cbiAqXG4gKiBFYWNoIGJyYW5jaCBpcyBjaGVja2VkIGFnYWluc3QgaXRzIG93biBgcGFyZW50QnJhbmNoYCAodGhlIGJyYW5jaCBpdCB3YXNcbiAqIGNyZWF0ZWQgZnJvbSksIG5vdCB0aGUgd29ya3NwYWNlJ3MgY3VycmVudCBIRUFELiBUaGlzIGVuc3VyZXMgYnJhbmNoZXMgYXJlXG4gKiBvbmx5IGNsZWFuZWQgdXAgd2hlbiB0cnVseSBtZXJnZWQgaW50byB0aGVpciBpbnRlbmRlZCB0YXJnZXQuXG4gKlxuICogQHBhcmFtIGlucHV0IC0gQWN0aW9uIGlucHV0IGNvbnRhaW5pbmcgY2FyZElkIGFuZCB3b3Jrc3BhY2UgcGF0aHMuXG4gKiBAcGFyYW0gY2xpZW50IC0gQ2FyZHMgQVBJIGNsaWVudCBmb3IgYnJhbmNoIHJlbW92YWwuXG4gKiBAcGFyYW0gbG9nZ2VyIC0gTG9nZ2VyIGZvciBkaWFnbm9zdGljIG91dHB1dC5cbiAqIEBwYXJhbSBzZXNzaW9uSWQgLSBDbGF1ZGUgQ29kZSBzZXNzaW9uIElEIGZvcndhcmRlZCB0byB0aGUgQVBJIHNvIHRoZSBjYXJkIHJlcG8gcG9zdC1jb21taXQgaG9vayBjYW4gYXR0cmlidXRlIHRoZSBjb21taXQuXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBjbGVhbnVwTWVyZ2VkQnJhbmNoZXMoXG4gIGlucHV0OiBBY3Rpb25JbnB1dCxcbiAgY2xpZW50OiBDYXJkc0NsaWVudCxcbiAgbG9nZ2VyOiBBY3Rpb25Db250ZXh0Wydsb2dnZXInXSxcbiAgc2Vzc2lvbklkPzogc3RyaW5nXG4pOiBQcm9taXNlPHZvaWQ+IHtcbiAgbGV0IHQwID0gcGVyZm9ybWFuY2Uubm93KCk7XG4gIGNvbnN0IHsgYnJhbmNoZXMgfSA9IGF3YWl0IGNsaWVudC5nZXRCcmFuY2hlcyhpbnB1dC5jYXJkSWQsIHsgd29ya3NwYWNlUGF0aDogaW5wdXQucmVwb1Jvb3QgfSk7XG4gIGxvZ2dlci5kZWJ1ZygnZ2V0QnJhbmNoZXMgY29tcGxldGVkJywge1xuICAgIGNhcmRJZDogaW5wdXQuY2FyZElkLFxuICAgIGJyYW5jaENvdW50OiBicmFuY2hlcy5sZW5ndGgsXG4gICAgZWxhcHNlZE1zOiBNYXRoLnJvdW5kKHBlcmZvcm1hbmNlLm5vdygpIC0gdDApXG4gIH0pO1xuXG4gIGZvciAoY29uc3QgYnJhbmNoIG9mIGJyYW5jaGVzKSB7XG4gICAgaWYgKCFicmFuY2guZXhpc3RzKSBjb250aW51ZTtcblxuICAgIC8vIFNlbGYtcmVmZXJlbnRpYWwgcGFyZW50QnJhbmNoOiBgbWVyZ2UtYmFzZSAtLWlzLWFuY2VzdG9yIFggWGAgdHJpdmlhbGx5XG4gICAgLy8gc3VjY2VlZHMsIHNvIGNsZWFudXAgd291bGQgaW5jb3JyZWN0bHkgcmVtb3ZlIHVubWVyZ2VkIHdvcmsuIFRoaXMgb2NjdXJzXG4gICAgLy8gbGVnaXRpbWF0ZWx5IGZvciBiYXNlIGJyYW5jaGVzIHJlZ2lzdGVyZWQgYnkgY2FyZCBhdHRhY2ggKGUuZy4gXCJtYWluXCJcbiAgICAvLyB3aXRoIHBhcmVudEJyYW5jaCBcIm1haW5cIikuIFNraXAgcmF0aGVyIHRoYW4gdGhyb3cgXHUyMDE0IGl0J3Mgbm90IGFjdGlvbmFibGUuXG4gICAgaWYgKGJyYW5jaC5wYXJlbnRCcmFuY2ggPT09IGJyYW5jaC5uYW1lKSB7XG4gICAgICBsb2dnZXIuZGVidWcoJ1NraXBwaW5nIGJyYW5jaCB3aXRoIHNlbGYtcmVmZXJlbnRpYWwgcGFyZW50QnJhbmNoJywgeyBicmFuY2g6IGJyYW5jaC5uYW1lIH0pO1xuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgdDAgPSBwZXJmb3JtYW5jZS5ub3coKTtcbiAgICB0cnkge1xuICAgICAgLy8gbWVyZ2UtYmFzZSAtLWlzLWFuY2VzdG9yIGV4aXRzIG5vbi16ZXJvIHdoZW4gTk9UIGFuIGFuY2VzdG9yIChub3QgbWVyZ2VkKS5cbiAgICAgIC8vIENoZWNrIGFnYWluc3QgdGhlIGJyYW5jaCdzIG93biBwYXJlbnRCcmFuY2gsIG5vdCB0aGUgd29ya3NwYWNlIEhFQUQuXG4gICAgICBhd2FpdCBleGVjRmlsZUFzeW5jKCdnaXQnLCBbJ21lcmdlLWJhc2UnLCAnLS1pcy1hbmNlc3RvcicsIGJyYW5jaC5uYW1lLCBicmFuY2gucGFyZW50QnJhbmNoXSwge1xuICAgICAgICBjd2Q6IGlucHV0LnJlcG9Sb290XG4gICAgICB9KTtcbiAgICB9IGNhdGNoIHtcbiAgICAgIC8vIEV4cGVjdGVkIGZvciB1bm1lcmdlZCBicmFuY2hlcyBcdTIwMTQgc2tpcCBjbGVhbnVwXG4gICAgICBsb2dnZXIuZGVidWcoJ0JyYW5jaCBub3QgbWVyZ2VkLCBza2lwcGluZyBjbGVhbnVwJywge1xuICAgICAgICBicmFuY2g6IGJyYW5jaC5uYW1lLFxuICAgICAgICBlbGFwc2VkTXM6IE1hdGgucm91bmQocGVyZm9ybWFuY2Uubm93KCkgLSB0MClcbiAgICAgIH0pO1xuICAgICAgY29udGludWU7XG4gICAgfVxuICAgIGxvZ2dlci5kZWJ1ZygnbWVyZ2UtYmFzZSBjaGVjayBjb21wbGV0ZWQgKG1lcmdlZCknLCB7XG4gICAgICBicmFuY2g6IGJyYW5jaC5uYW1lLFxuICAgICAgZWxhcHNlZE1zOiBNYXRoLnJvdW5kKHBlcmZvcm1hbmNlLm5vdygpIC0gdDApXG4gICAgfSk7XG5cbiAgICAvLyBCcmFuY2ggaXMgbWVyZ2VkIFx1MjAxNCBjbGVhbiB1cCB3b3JrdHJlZSwgYnJhbmNoIHJlZiwgYW5kIEFQSSByZWNvcmRcbiAgICBpZiAoYnJhbmNoLndvcmt0cmVlKSB7XG4gICAgICB0MCA9IHBlcmZvcm1hbmNlLm5vdygpO1xuICAgICAgYXdhaXQgdHJ5Q2xlYW51cFN0ZXAoXG4gICAgICAgICgpID0+IGV4ZWNGaWxlQXN5bmMoJ2dpdCcsIFsnd29ya3RyZWUnLCAncmVtb3ZlJywgJy0tZm9yY2UnLCBicmFuY2gud29ya3RyZWUhXSwgeyBjd2Q6IGlucHV0LnJlcG9Sb290IH0pLFxuICAgICAgICAnRmFpbGVkIHRvIHJlbW92ZSB3b3JrdHJlZScsXG4gICAgICAgIGJyYW5jaC5uYW1lLFxuICAgICAgICBsb2dnZXJcbiAgICAgICk7XG4gICAgICBsb2dnZXIuZGVidWcoJ1dvcmt0cmVlIHJlbW92YWwgY29tcGxldGVkJywge1xuICAgICAgICBicmFuY2g6IGJyYW5jaC5uYW1lLFxuICAgICAgICBlbGFwc2VkTXM6IE1hdGgucm91bmQocGVyZm9ybWFuY2Uubm93KCkgLSB0MClcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIHQwID0gcGVyZm9ybWFuY2Uubm93KCk7XG4gICAgbGV0IGJyYW5jaERlbGV0ZWQgPSBmYWxzZTtcbiAgICB0cnkge1xuICAgICAgYXdhaXQgZXhlY0ZpbGVBc3luYygnZ2l0JywgWydicmFuY2gnLCAnLWQnLCBicmFuY2gubmFtZV0sIHsgY3dkOiBpbnB1dC5yZXBvUm9vdCB9KTtcbiAgICAgIGJyYW5jaERlbGV0ZWQgPSB0cnVlO1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICBsb2dnZXIud2FybignRmFpbGVkIHRvIGRlbGV0ZSBicmFuY2gnLCB7IGJyYW5jaDogYnJhbmNoLm5hbWUsIGVycm9yOiBlcnJvck1lc3NhZ2UoZXJyb3IpIH0pO1xuICAgIH1cbiAgICBsb2dnZXIuZGVidWcoJ0JyYW5jaCBkZWxldGlvbiBjb21wbGV0ZWQnLCB7XG4gICAgICBicmFuY2g6IGJyYW5jaC5uYW1lLFxuICAgICAgYnJhbmNoRGVsZXRlZCxcbiAgICAgIGVsYXBzZWRNczogTWF0aC5yb3VuZChwZXJmb3JtYW5jZS5ub3coKSAtIHQwKVxuICAgIH0pO1xuXG4gICAgaWYgKGJyYW5jaERlbGV0ZWQpIHtcbiAgICAgIHQwID0gcGVyZm9ybWFuY2Uubm93KCk7XG4gICAgICBhd2FpdCB0cnlDbGVhbnVwU3RlcChcbiAgICAgICAgKCkgPT4gY2xpZW50LnJlbW92ZUJyYW5jaChpbnB1dC5jYXJkSWQsIGJyYW5jaC5uYW1lLCB7IHNlc3Npb25JZCB9KSxcbiAgICAgICAgJ0ZhaWxlZCB0byByZW1vdmUgYnJhbmNoIGZyb20gQVBJJyxcbiAgICAgICAgYnJhbmNoLm5hbWUsXG4gICAgICAgIGxvZ2dlclxuICAgICAgKTtcbiAgICAgIGxvZ2dlci5kZWJ1ZygnQVBJIGJyYW5jaCByZW1vdmFsIGNvbXBsZXRlZCcsIHtcbiAgICAgICAgYnJhbmNoOiBicmFuY2gubmFtZSxcbiAgICAgICAgZWxhcHNlZE1zOiBNYXRoLnJvdW5kKHBlcmZvcm1hbmNlLm5vdygpIC0gdDApXG4gICAgICB9KTtcblxuICAgICAgbG9nZ2VyLmluZm8oJ0NsZWFuZWQgdXAgbWVyZ2VkIGJyYW5jaCcsIHsgYnJhbmNoOiBicmFuY2gubmFtZSB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgbG9nZ2VyLmluZm8oJ1NraXBwZWQgQVBJIHJlY29yZCByZW1vdmFsIFx1MjAxNCBnaXQgYnJhbmNoIHN0aWxsIGV4aXN0cycsIHsgYnJhbmNoOiBicmFuY2gubmFtZSB9KTtcbiAgICB9XG4gIH1cbn1cblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gVW5pZmllZCBzZXNzaW9uIHNwYXduZXJcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuLyoqXG4gKiBPcHRpb25zIGZvciB7QGxpbmsgc3Bhd25DbGF1ZGVTZXNzaW9ufS5cbiAqXG4gKiBBY3Rpb25zIHByb3ZpZGUgdGhlIHZhcmlhYmxlIHBhcnRzIChwcm9tcHQsIHNlc3Npb24gaWRlbnRpdHksIHN3aXRjaC10by1cbiAqIGludGVyYWN0aXZlIHN1cHBvcnQpOyB0aGUgaGVscGVyIGhhbmRsZXMgZXZlcnl0aGluZyBlbHNlOiB3b3JrdHJlZVxuICogcmVzb2x1dGlvbiwgbWFya2V0cGxhY2UgcmVnaXN0cmF0aW9uLCBlbnYgY29uc3RydWN0aW9uLCBzcGF3biwgbGlmZWN5Y2xlXG4gKiBjYWxsYmFja3MsIGFuZCBwb3N0LWV4aXQgYnJhbmNoIGNsZWFudXAuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgQ2xhdWRlU2Vzc2lvbk9wdGlvbnMge1xuICAvKiogUHJvbXB0IHN0cmluZyBwYXNzZWQgdG8gdGhlIENsYXVkZSBDTEkuICovXG4gIHByb21wdDogc3RyaW5nO1xuICAvKiogU2Vzc2lvbiBpZGVudGlmaWVyICh1c2VkIGZvciBgLS1zZXNzaW9uLWlkYCBvciBgLS1yZXN1bWVgKS4gKi9cbiAgc2Vzc2lvbklkOiBzdHJpbmc7XG4gIC8qKiBXaGVuIHRydWUsIHBhc3NlcyBgLS1yZXN1bWVgIGluc3RlYWQgb2Ygc3RhcnRpbmcgYSBuZXcgc2Vzc2lvbi4gKi9cbiAgcmVzdW1lOiBib29sZWFuO1xuICAvKipcbiAgICogV2hlbiB0cnVlLCByZWdpc3RlcnMge0BsaW5rIEFjdGlvbkNvbnRleHQub25Td2l0Y2hUb0ludGVyYWN0aXZlfSBzb1xuICAgKiBiYWNrZ3JvdW5kLW1vZGUgc2Vzc2lvbnMgY2FuIGJlIHByb21vdGVkIHRvIGludGVyYWN0aXZlLlxuICAgKi9cbiAgc3VwcG9ydHNTd2l0Y2hUb0ludGVyYWN0aXZlOiBib29sZWFuO1xufVxuXG4vKipcbiAqIFNwYXducyBhIGBjbGF1ZGVgIENMSSBzZXNzaW9uIHdpdGggZnVsbCB3b3JrdHJlZSwgbWFya2V0cGxhY2UsIGFuZFxuICogbGlmZWN5Y2xlIG1hbmFnZW1lbnQuXG4gKlxuICogQ2VudHJhbGlzZXMgdGhlIHNwYXduIGxvZ2ljIHNoYXJlZCBieSB0aGUgYGxhdW5jaGAgYW5kIGBpbnRlcnZpZXdgXG4gKiBhY3Rpb25zIHNvIGVudmlyb25tZW50IHZhcmlhYmxlIGNvbnN0cnVjdGlvbiwgd29ya3RyZWUgcmVzb2x1dGlvbixcbiAqIG1hcmtldHBsYWNlIHJlZ2lzdHJhdGlvbiwgYW5kIHBvc3QtZXhpdCBjbGVhbnVwIGNhbm5vdCBkcmlmdCBiZXR3ZWVuXG4gKiBjYWxsZXJzLlxuICpcbiAqIFN0ZXBzOlxuICogMS4gQ3JlYXRlIHtAbGluayBDYXJkc0NsaWVudH1cbiAqIDIuIFJlc29sdmUgYmFzZSBicmFuY2ggYW5kIHdvcmt0cmVlXG4gKiAzLiBSZWdpc3RlciBtYXJrZXRwbGFjZVxuICogNC4gQnVpbGQgQ0xJIGFyZ3MgYW5kIHNwYXduIGBjbGF1ZGVgXG4gKiA1LiBXaXJlIG9uQ2FuY2VsIChhbmQgb3B0aW9uYWxseSBvblN3aXRjaFRvSW50ZXJhY3RpdmUpXG4gKiA2LiBDYXB0dXJlIHN0ZGVyciBpbiBiYWNrZ3JvdW5kIG1vZGVcbiAqIDcuIEF3YWl0IHByb2Nlc3MgZXhpdFxuICogOC4gQ2xlYW4gdXAgZnVsbHktbWVyZ2VkIGJyYW5jaGVzIChiYWNrZ3JvdW5kIG1vZGUgb25seTsgaW4gaW50ZXJhY3RpdmVcbiAqICAgIG1vZGUgdGhlIHdhdGNoZXIgYW5kIGV4dGVuc2lvbiBoYW5kbGUgY2xlYW51cCBhZnRlciB0aGUgYWN0aW9uIGV4aXRzKVxuICpcbiAqIEBwYXJhbSBpbnB1dCAtIFBhcnNlZCBhY3Rpb24gaW5wdXQgZnJvbSB0aGUgZW52aXJvbm1lbnQuXG4gKiBAcGFyYW0gY29udGV4dCAtIEFjdGlvbiBjb250ZXh0IHByb3ZpZGluZyBsb2dnZXIgYW5kIGxpZmVjeWNsZSBob29rcy5cbiAqIEBwYXJhbSBvcHRpb25zIC0gU2Vzc2lvbi1zcGVjaWZpYyBwYXJhbWV0ZXJzIChwcm9tcHQsIHNlc3Npb24gSUQsIGV0Yy4pLlxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gc3Bhd25DbGF1ZGVTZXNzaW9uKFxuICBpbnB1dDogQWN0aW9uSW5wdXQsXG4gIGNvbnRleHQ6IEFjdGlvbkNvbnRleHQsXG4gIG9wdGlvbnM6IENsYXVkZVNlc3Npb25PcHRpb25zXG4pOiBQcm9taXNlPHZvaWQ+IHtcbiAgY29uc3QgeyBwcm9tcHQsIHNlc3Npb25JZCwgcmVzdW1lLCBzdXBwb3J0c1N3aXRjaFRvSW50ZXJhY3RpdmUgfSA9IG9wdGlvbnM7XG5cbiAgY29udGV4dC5sb2dnZXIuaW5mbyhgJHtpbnB1dC5hY3Rpb25OYW1lfSBhY3Rpb24gc3RhcnRlZGAsIHtcbiAgICBjYXJkSWQ6IGlucHV0LmNhcmRJZCxcbiAgICBlbnZpcm9ubWVudDogaW5wdXQuZW52aXJvbm1lbnQsXG4gICAgZXhlY3V0aW9uTW9kZTogaW5wdXQuZXhlY3V0aW9uTW9kZSxcbiAgICBzZXNzaW9uSWRcbiAgfSk7XG5cbiAgY29uc3QgY2xpZW50ID0gbmV3IENhcmRzQ2xpZW50KHtcbiAgICBiYXNlVXJsOiBpbnB1dC5hcGlCYXNlVXJsLFxuICAgIGFjY2Vzc1Rva2VuOiBpbnB1dC5hcGlBY2Nlc3NUb2tlblxuICB9KTtcblxuICBjb25zdCBiYXNlQnJhbmNoID0gYXdhaXQgcmVzb2x2ZUJhc2VCcmFuY2goaW5wdXQucmVwb1Jvb3QsIGNsaWVudCk7XG5cbiAgY29uc3Qgd29ya3RyZWVSZXN1bHQgPSBhd2FpdCByZXNvbHZlT3JDcmVhdGVXb3JrdHJlZShpbnB1dCwgY2xpZW50LCBiYXNlQnJhbmNoLCBjb250ZXh0LmxvZ2dlciwgc2Vzc2lvbklkKTtcblxuICBjb25zdCB7IHdvcmt0cmVlUGF0aDogY3dkLCBicmFuY2hOYW1lLCBwYXJlbnRCcmFuY2ggfSA9IHdvcmt0cmVlUmVzdWx0O1xuICBjb250ZXh0LmxvZ2dlci5pbmZvKCdVc2luZyB3b3JrdHJlZScsIHsgY3dkLCBicmFuY2g6IGJyYW5jaE5hbWUsIGJhc2VCcmFuY2gsIHBhcmVudEJyYW5jaCB9KTtcblxuICBjb25zdCBtYXJrZXRwbGFjZVBhdGggPSByZXNvbHZlTWFya2V0cGxhY2VQYXRoKCk7XG4gIGF3YWl0IHVwZGF0ZU1hcmtldHBsYWNlUmVnaXN0cmF0aW9uKG1hcmtldHBsYWNlUGF0aCwgY29udGV4dC5sb2dnZXIpO1xuXG4gIGNvbnN0IGFyZ3MgPSBidWlsZEFyZ3MocHJvbXB0LCBzZXNzaW9uSWQsIHJlc3VtZSwgaW5wdXQuZXhlY3V0aW9uTW9kZSwgaW5wdXQuY2FyZFJlcG9QYXRoLCBtYXJrZXRwbGFjZVBhdGgpO1xuICBjb25zdCBpc0ludGVyYWN0aXZlID0gaW5wdXQuZXhlY3V0aW9uTW9kZSA9PT0gJ2ludGVyYWN0aXZlJztcblxuICBjb25zdCBjaGlsZDogQ2hpbGRQcm9jZXNzID0gc3Bhd24oJ2NsYXVkZScsIGFyZ3MsIHtcbiAgICBjd2QsXG4gICAgc3RkaW86IGlzSW50ZXJhY3RpdmUgPyAnaW5oZXJpdCcgOiBbJ2lnbm9yZScsICdpZ25vcmUnLCAncGlwZSddLFxuICAgIGVudjoge1xuICAgICAgLi4ucHJvY2Vzcy5lbnYsXG4gICAgICBXT1JLU1BBQ0VfUEFUSDogY3dkLFxuICAgICAgQ0xBVURFX0NPREVfVEFTS19MSVNUX0lEOiBgY2FyZHMtZXh0ZW5zaW9uLSR7aW5wdXQuY2FyZElkfWAsXG4gICAgICBDTEFVREVfQ09ERV9FWFBFUklNRU5UQUxfQUdFTlRfVEVBTVM6ICcxJyxcbiAgICAgIEJBU0VfQlJBTkNIOiBiYXNlQnJhbmNoLFxuICAgICAgUEFSRU5UX0JSQU5DSDogcGFyZW50QnJhbmNoLFxuICAgICAgV09SS1NQQUNFX0JSQU5DSDogYnJhbmNoTmFtZVxuICAgIH1cbiAgfSk7XG5cbiAgY29udGV4dC5vbkNhbmNlbCgoKSA9PiB7XG4gICAgY29udGV4dC5sb2dnZXIuaW5mbyhgJHtpbnB1dC5hY3Rpb25OYW1lfSBhY3Rpb24gY2FuY2VsbGVkLCB0ZXJtaW5hdGluZyBjbGF1ZGVgLCB7IHNlc3Npb25JZCB9KTtcbiAgICBjaGlsZC5raWxsKCdTSUdURVJNJyk7XG4gIH0pO1xuXG4gIGlmIChzdXBwb3J0c1N3aXRjaFRvSW50ZXJhY3RpdmUpIHtcbiAgICBjb250ZXh0Lm9uU3dpdGNoVG9JbnRlcmFjdGl2ZSgoKSA9PiB7XG4gICAgICBjb250ZXh0LmxvZ2dlci5pbmZvKCdTd2l0Y2hpbmcgdG8gaW50ZXJhY3RpdmUgbW9kZScsIHsgc2Vzc2lvbklkIH0pO1xuICAgICAgY2hpbGQua2lsbCgnU0lHVEVSTScpO1xuICAgICAgcmV0dXJuIHsgc2Vzc2lvbklkIH07XG4gICAgfSk7XG4gIH1cblxuICAvLyBCYWNrZ3JvdW5kIG1vZGU6IGNhcHR1cmUgc3RkZXJyIGZvciBkaWFnbm9zdGljIGxvZ2dpbmdcbiAgaWYgKCFpc0ludGVyYWN0aXZlKSB7XG4gICAgY2hpbGQuc3RkZXJyPy5vbignZGF0YScsIChjaHVuazogQnVmZmVyKSA9PiB7XG4gICAgICBjb25zdCB0ZXh0ID0gY2h1bmsudG9TdHJpbmcoKS50cmltKCk7XG4gICAgICBpZiAodGV4dCkge1xuICAgICAgICBjb250ZXh0LmxvZ2dlci53YXJuKHRleHQpO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgY29uc3QgZXhpdENvZGUgPSBhd2FpdCBuZXcgUHJvbWlzZTxudW1iZXIgfCBudWxsPigocmVzb2x2ZSkgPT4ge1xuICAgIGNoaWxkLm9uKCdjbG9zZScsIHJlc29sdmUpO1xuICB9KTtcblxuICBjb250ZXh0LmxvZ2dlci5pbmZvKGAke2lucHV0LmFjdGlvbk5hbWV9IGFjdGlvbiBjb21wbGV0ZWRgLCB7IHNlc3Npb25JZCwgZXhpdENvZGUgfSk7XG5cbiAgLy8gUG9zdC1leGl0IGNsZWFudXA6IHJlbW92ZSBmdWxseS1tZXJnZWQgYnJhbmNoZXMuXG4gIC8vIFJ1bnMgaW5saW5lIGluIGFsbCBtb2RlcyBcdTIwMTQgdGhlIHdyYXBwZXIncyBTSUdIVVAvU0lHVEVSTSBoYW5kbGVyIGVuc3VyZXNcbiAgLy8gY2xlYW51cCBjb21wbGV0ZXMgZXZlbiB3aGVuIHRoZSB0ZXJtaW5hbCBjbG9zZXMuXG4gIGNvbnN0IGNsZWFudXBTdGFydCA9IHBlcmZvcm1hbmNlLm5vdygpO1xuICB0cnkge1xuICAgIGF3YWl0IGNsZWFudXBNZXJnZWRCcmFuY2hlcyhpbnB1dCwgY2xpZW50LCBjb250ZXh0LmxvZ2dlciwgc2Vzc2lvbklkKTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBjb25zdCBtZXNzYWdlID0gZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiBTdHJpbmcoZXJyb3IpO1xuICAgIGNvbnRleHQubG9nZ2VyLndhcm4oJ1Bvc3QtZXhpdCBjbGVhbnVwIGZhaWxlZCAobm9uLWZhdGFsKScsIHsgZXJyb3I6IG1lc3NhZ2UsIHNlc3Npb25JZCB9KTtcbiAgfVxuICBjb250ZXh0LmxvZ2dlci5kZWJ1ZygnUG9zdC1leGl0IGNsZWFudXAgZmluaXNoZWQnLCB7XG4gICAgc2Vzc2lvbklkLFxuICAgIGVsYXBzZWRNczogTWF0aC5yb3VuZChwZXJmb3JtYW5jZS5ub3coKSAtIGNsZWFudXBTdGFydClcbiAgfSk7XG59XG4iLCAiLyoqXG4gKiBHaXQgd29ya3RyZWUgbGlmZWN5Y2xlIG1hbmFnZW1lbnQgZm9yIG1vbm9yZXBvIHdvcmtzcGFjZXMuXG4gKlxuICogQ3JlYXRlcyB3b3JrdHJlZXMgd2l0aCBzeW1saW5rZWQgbm9kZV9tb2R1bGVzLCBpZ25vcmVkIHBhdGhzLCBhbmRcbiAqIHBlci13b3JrdHJlZSBnaXQgZXhjbHVkZXMgc28gdGhlIHdvcmt0cmVlIGlzIGltbWVkaWF0ZWx5IHVzYWJsZSBmb3JcbiAqIGJ1aWxkcyBhbmQgdGVzdHMgd2l0aG91dCBhIHNlcGFyYXRlIGB5YXJuIGluc3RhbGxgLlxuICpcbiAqIFN1cHBvcnRzIGJvdGggYnJhbmNoLWJhc2VkIHdvcmt0cmVlcyAoZm9yIGltcGxlbWVudGF0aW9uIHdvcmspIGFuZFxuICogZGV0YWNoZWQgd29ya3RyZWVzIChmb3IgdmVyaWZ5aW5nIHN0YXRlIGF0IGEgdGFnIG9yIGNvbW1pdCkuXG4gKlxuICogQHN1bW1hcnkgR2l0IHdvcmt0cmVlIGNyZWF0aW9uIHdpdGggbW9ub3JlcG8gc3ltbGluayB3aXJpbmdcbiAqIEBtb2R1bGUgd29ya3RyZWVcbiAqL1xuXG5pbXBvcnQgeyBleGVjRmlsZSB9IGZyb20gJ25vZGU6Y2hpbGRfcHJvY2Vzcyc7XG5pbXBvcnQgKiBhcyBmcyBmcm9tICdub2RlOmZzL3Byb21pc2VzJztcbmltcG9ydCAqIGFzIHBhdGggZnJvbSAnbm9kZTpwYXRoJztcbmltcG9ydCB7IHByb21pc2lmeSB9IGZyb20gJ25vZGU6dXRpbCc7XG5cbmNvbnN0IGV4ZWNGaWxlQXN5bmMgPSBwcm9taXNpZnkoZXhlY0ZpbGUpO1xuXG4vKipcbiAqIFZhbGlkYXRlcyBhIGJyYW5jaCBuYW1lIGFnYWluc3QgdGhlIENMSSdzIHNhZmUgc3Vic2V0LlxuICpcbiAqIFRoZSBuYW1lIG11c3Qgc3RhcnQgd2l0aCBhbiBhbHBoYW51bWVyaWMgY2hhcmFjdGVyIGFuZCBtYXkgdGhlbiBpbmNsdWRlXG4gKiBhbHBoYW51bWVyaWNzLCBzbGFzaGVzLCB1bmRlcnNjb3Jlcywgb3IgZGFzaGVzLlxuICpcbiAqIEBwYXJhbSBuYW1lIC0gQ2FuZGlkYXRlIGJyYW5jaCBuYW1lIHN1cHBsaWVkIGJ5IHRoZSBjYWxsZXIuXG4gKiBAdGhyb3dzIHtFcnJvcn0gV2hlbiB0aGUgYnJhbmNoIG5hbWUgZG9lcyBub3QgbWF0Y2ggdGhlIHN1cHBvcnRlZCBmb3JtYXQuXG4gKiBAcmV0dXJucyBObyB2YWx1ZS4gVGhyb3dzIG9uIGludmFsaWQgaW5wdXQuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB2YWxpZGF0ZUJyYW5jaE5hbWUobmFtZTogc3RyaW5nKTogdm9pZCB7XG4gIGNvbnN0IGJyYW5jaE5hbWVSZWdleCA9IC9eW2EtekEtWjAtOV1bYS16QS1aMC05L18tXSokLztcbiAgaWYgKCFicmFuY2hOYW1lUmVnZXgudGVzdChuYW1lKSkge1xuICAgIHRocm93IG5ldyBFcnJvcignRXJyb3I6IEludmFsaWQgYnJhbmNoIG5hbWUgZm9ybWF0LicpO1xuICB9XG59XG5cbi8qKlxuICogRGV0ZXJtaW5lcyB3aGV0aGVyIGEgcmVsYXRpdmUgcGF0aCBpcyBuZXN0ZWQgdW5kZXIgYW55IGtub3duIHBhcmVudCBwYXRoLlxuICpcbiAqIFRoZSBjaGVjayB3YWxrcyBhbmNlc3RvciBzZWdtZW50cyBvZiBgZGlyYCBhbmQgcmV0dXJucyB0cnVlIG9uIHRoZSBmaXJzdFxuICogbWF0Y2ggaW4gYHBhcmVudFNldGAuXG4gKlxuICogQHBhcmFtIGRpciAtIFJlbGF0aXZlIHBhdGggdG8gdGVzdC5cbiAqIEBwYXJhbSBwYXJlbnRTZXQgLSBDYW5kaWRhdGUgcGFyZW50IGRpcmVjdG9yaWVzIHJlcHJlc2VudGVkIGFzIHJlbGF0aXZlIHBhdGhzLlxuICogQHJldHVybnMgVHJ1ZSB3aGVuIGBkaXJgIGlzIG5lc3RlZCB1bmRlciBhIHBhdGggaW4gYHBhcmVudFNldGAuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc05lc3RlZFVuZGVyKGRpcjogc3RyaW5nLCBwYXJlbnRTZXQ6IFNldDxzdHJpbmc+KTogYm9vbGVhbiB7XG4gIGxldCBjdXJyZW50ID0gZGlyO1xuICB3aGlsZSAoY3VycmVudC5pbmNsdWRlcygnLycpKSB7XG4gICAgY3VycmVudCA9IGN1cnJlbnQuc3Vic3RyaW5nKDAsIGN1cnJlbnQubGFzdEluZGV4T2YoJy8nKSk7XG4gICAgaWYgKHBhcmVudFNldC5oYXMoY3VycmVudCkpIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgfVxuICByZXR1cm4gZmFsc2U7XG59XG5cbi8qKlxuICogQ2hlY2tzIHdoZXRoZXIgYSBzeW1saW5rIHRhcmdldCBwb2ludHMgdG8ga25vd24gbW9ub3JlcG8taW50ZXJuYWwgbG9jYXRpb25zLlxuICpcbiAqIEludGVybmFsIHRhcmdldHMgYXJlIHByZXNlcnZlZCBhcyByZWxhdGl2ZSBsaW5rcyBkdXJpbmcgbm9kZV9tb2R1bGVzIHJlcm91dGVcbiAqIHNvIHdvcmtzcGFjZSBsaW5rcyBrZWVwIHdvcmtpbmcgaW5zaWRlIGEgd29ya3RyZWUuXG4gKlxuICogQHBhcmFtIHRhcmdldCAtIFN5bWxpbmsgdGFyZ2V0IHJlYWQgZnJvbSB0aGUgc291cmNlIG5vZGVfbW9kdWxlcyBlbnRyeS5cbiAqIEByZXR1cm5zIFRydWUgd2hlbiB0aGUgdGFyZ2V0IHN0YXJ0cyB3aXRoIGFuIGludGVybmFsIHByZWZpeC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzSW50ZXJuYWxTeW1saW5rKHRhcmdldDogc3RyaW5nKTogYm9vbGVhbiB7XG4gIHJldHVybiB0YXJnZXQuc3RhcnRzV2l0aCgnLi4vJyk7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgQ3JlYXRlV29ya3RyZWVSZXN1bHQge1xuICBicmFuY2g6IHN0cmluZztcbiAgd29ya3RyZWU6IHN0cmluZztcbiAgYmFzZVNoYTogc3RyaW5nO1xuICByZXJvdXRlZFN5bWxpbmtzPzogbnVtYmVyO1xufVxuXG4vKipcbiAqIENyZWF0ZXMgYW5kIGNvbmZpZ3VyZXMgYSBuZXcgZ2l0IHdvcmt0cmVlLlxuICpcbiAqIFRoZSB3b3JrZmxvdyB2YWxpZGF0ZXMgdGhlIHJlZiwgY3JlYXRlcyB0aGUgd29ya3RyZWUsIG1pcnJvcnMgZXhpc3Rpbmcgcm9vdFxuICogc3ltbGlua3MsIHN5bWxpbmtzIGlnbm9yZWQgcGF0aHMsIHJlcm91dGVzIG5vZGVfbW9kdWxlcyBsaW5rcywgYW5kIHVwZGF0ZXNcbiAqIHBlci13b3JrdHJlZSBnaXQgZXhjbHVkZXMuXG4gKlxuICogV2hlbiBgcmVmYCBpcyBhIGJyYW5jaCBuYW1lLCB0aGUgd29ya3RyZWUgY2hlY2tzIG91dCB0aGF0IGJyYW5jaCAoY3JlYXRpbmdcbiAqIGl0IGlmIG5lZWRlZCkuIFdoZW4gYHJlZmAgaXMgYSB0YWcgb3IgY29tbWl0IFNIQSwgdGhlIHdvcmt0cmVlIGlzIGNyZWF0ZWRcbiAqIGluIGRldGFjaGVkIEhFQUQgbW9kZS5cbiAqXG4gKiBAcGFyYW0gcmVmIC0gQnJhbmNoIG5hbWUsIHRhZyBuYW1lLCBvciBjb21taXQgU0hBLlxuICogQHBhcmFtIG9wdGlvbnMgLSBPcHRpb25hbCBjb25maWd1cmF0aW9uLlxuICogQHBhcmFtIG9wdGlvbnMuY3dkIC0gV29ya2luZyBkaXJlY3RvcnkgdG8gdXNlIHdoZW4gbG9jYXRpbmcgZ2l0IHJvb3RzLiBEZWZhdWx0cyB0byBgcHJvY2Vzcy5jd2QoKWAuXG4gKiBAcmV0dXJucyBNZXRhZGF0YSBkZXNjcmliaW5nIHRoZSBjcmVhdGVkIHdvcmt0cmVlIGFuZCBiYXNlIGNvbW1pdC5cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGNyZWF0ZVdvcmt0cmVlKHJlZjogc3RyaW5nLCBvcHRpb25zPzogeyBjd2Q/OiBzdHJpbmcgfSk6IFByb21pc2U8Q3JlYXRlV29ya3RyZWVSZXN1bHQ+IHtcbiAgY29uc3QgeyBzb3VyY2VSb290LCByZXBvUm9vdCB9ID0gYXdhaXQgZmluZEdpdFJvb3RzKG9wdGlvbnM/LmN3ZCA/PyBwcm9jZXNzLmN3ZCgpKTtcblxuICAvLyBEZXRlcm1pbmUgd2hldGhlciB0aGlzIGlzIGFuIGV4aXN0aW5nIHJlZiBvciBhIG5ldyBicmFuY2ggbmFtZS5cbiAgLy8gcmVzb2x2ZVJlZlR5cGUgdGhyb3dzIGZvciB1bmtub3duIHJlZnM7IGEgdmFsaWQgYnJhbmNoIG5hbWUgdGhhdFxuICAvLyBkb2Vzbid0IGV4aXN0IHlldCBpcyB0cmVhdGVkIGFzIGEgbmV3IGJyYW5jaCB0byBjcmVhdGUuXG4gIGxldCByZWZUeXBlOiAnYnJhbmNoJyB8ICd0YWcnIHwgJ2NvbW1pdCc7XG4gIHRyeSB7XG4gICAgcmVmVHlwZSA9IGF3YWl0IHJlc29sdmVSZWZUeXBlKHJlcG9Sb290LCByZWYpO1xuICB9IGNhdGNoIHtcbiAgICB2YWxpZGF0ZUJyYW5jaE5hbWUocmVmKTtcbiAgICByZWZUeXBlID0gJ2JyYW5jaCc7XG4gIH1cblxuICBpZiAocmVmVHlwZSA9PT0gJ2JyYW5jaCcpIHtcbiAgICB2YWxpZGF0ZUJyYW5jaE5hbWUocmVmKTtcbiAgfVxuXG4gIGNvbnN0IHdvcmt0cmVlRGlyID0gcGF0aC5qb2luKHJlcG9Sb290LCAnLndvcmt0cmVlcycsIHJlZik7XG5cbiAgY29uc3Qgd29ya3RyZWVFeGlzdHMgPSBhd2FpdCBjaGVja1dvcmt0cmVlRXhpc3RzKHJlcG9Sb290LCB3b3JrdHJlZURpcik7XG4gIGlmICh3b3JrdHJlZUV4aXN0cykge1xuICAgIHRocm93IG5ldyBFcnJvcihgRXJyb3I6IFdvcmt0cmVlIGFscmVhZHkgZXhpc3RzIGF0ICR7d29ya3RyZWVEaXJ9YCk7XG4gIH1cblxuICBhd2FpdCBjbGVhblN0YWxlV29ya3RyZWVEaXIocmVwb1Jvb3QsIHdvcmt0cmVlRGlyKTtcblxuICBpZiAocmVmVHlwZSA9PT0gJ2JyYW5jaCcpIHtcbiAgICBjb25zdCBzdGFydFBvaW50ID0gYXdhaXQgcmVzb2x2ZUhlYWQoc291cmNlUm9vdCk7XG4gICAgY29uc3QgYnJhbmNoRXhpc3RzID0gYXdhaXQgY2hlY2tCcmFuY2hFeGlzdHMocmVwb1Jvb3QsIHJlZik7XG4gICAgYXdhaXQgYWRkV29ya3RyZWUoeyByZXBvUm9vdCwgd29ya3RyZWVEaXIsIGJyYW5jaE5hbWU6IHJlZiwgYnJhbmNoRXhpc3RzLCBzdGFydFBvaW50IH0pO1xuICB9IGVsc2Uge1xuICAgIGF3YWl0IGFkZERldGFjaGVkV29ya3RyZWUocmVwb1Jvb3QsIHdvcmt0cmVlRGlyLCByZWYpO1xuICB9XG5cbiAgY29uc3QgaWdub3JlZCA9IGF3YWl0IGRpc2NvdmVySWdub3JlZFBhdGhzKHNvdXJjZVJvb3QpO1xuICBhd2FpdCBjb3B5RXhpc3RpbmdTeW1saW5rcyhzb3VyY2VSb290LCB3b3JrdHJlZURpcik7XG4gIGF3YWl0IHN5bWxpbmtJZ25vcmVkUGF0aHMoeyBzb3VyY2VSb290LCB3b3JrdHJlZURpciwgaWdub3JlZCB9KTtcblxuICBjb25zdCByZXJvdXRlZENvdW50ID0gYXdhaXQgcmVyb3V0ZUFsbE5vZGVNb2R1bGVzKHsgc291cmNlUm9vdCwgd29ya3RyZWVEaXIsIHJlcG9Sb290IH0pO1xuXG4gIGNvbnN0IFssIGJhc2VTaGFdID0gYXdhaXQgUHJvbWlzZS5hbGwoW1xuICAgIHVwZGF0ZUdpdEV4Y2x1ZGUoeyB3b3JrdHJlZURpciwgcmVwb1Jvb3QsIGRpcmVjdG9yaWVzOiBpZ25vcmVkLmRpcmVjdG9yaWVzLCBmaWxlczogaWdub3JlZC5maWxlcyB9KSxcbiAgICByZXNvbHZlSGVhZCh3b3JrdHJlZURpcilcbiAgXSk7XG5cbiAgY29uc3QgcmVzdWx0OiBDcmVhdGVXb3JrdHJlZVJlc3VsdCA9IHtcbiAgICBicmFuY2g6IHJlZixcbiAgICB3b3JrdHJlZTogd29ya3RyZWVEaXIsXG4gICAgYmFzZVNoYVxuICB9O1xuXG4gIGlmIChyZXJvdXRlZENvdW50ID4gMCkge1xuICAgIHJlc3VsdC5yZXJvdXRlZFN5bWxpbmtzID0gcmVyb3V0ZWRDb3VudDtcbiAgfVxuXG4gIHJldHVybiByZXN1bHQ7XG59XG5cbi8qKlxuICogUmVtb3ZlcyBzdGFsZSBkaXJlY3RvcnkgcmVtbmFudHMgbGVmdCBieSBhIGNyYXNoZWQgcHJldmlvdXMgc2Vzc2lvbi5cbiAqXG4gKiBHaXQgZG9lc24ndCB0cmFjayB0aGUgd29ya3RyZWUsIGJ1dCB0aGUgZGlyZWN0b3J5IG1heSBzdGlsbCBleGlzdCBvbiBkaXNrLFxuICogd2hpY2ggY2F1c2VzIGBnaXQgd29ya3RyZWUgYWRkYCB0byBmYWlsIHdpdGggXCJhbHJlYWR5IGV4aXN0c1wiLlxuICpcbiAqIEBwYXJhbSByZXBvUm9vdCAtIFByaW1hcnkgcmVwb3NpdG9yeSByb290IHdoZXJlIGdpdCBjb21tYW5kcyBydW4uXG4gKiBAcGFyYW0gd29ya3RyZWVEaXIgLSBBYnNvbHV0ZSB3b3JrdHJlZSBwYXRoIGJlaW5nIGNyZWF0ZWQuXG4gKi9cbmFzeW5jIGZ1bmN0aW9uIGNsZWFuU3RhbGVXb3JrdHJlZURpcihyZXBvUm9vdDogc3RyaW5nLCB3b3JrdHJlZURpcjogc3RyaW5nKTogUHJvbWlzZTx2b2lkPiB7XG4gIHRyeSB7XG4gICAgYXdhaXQgZnMuYWNjZXNzKHdvcmt0cmVlRGlyKTtcbiAgICBhd2FpdCBmcy5ybSh3b3JrdHJlZURpciwgeyByZWN1cnNpdmU6IHRydWUgfSk7XG4gICAgYXdhaXQgZXhlY0ZpbGVBc3luYygnZ2l0JywgWyd3b3JrdHJlZScsICdwcnVuZSddLCB7IGN3ZDogcmVwb1Jvb3QsIHRpbWVvdXQ6IDMwXzAwMCB9KTtcbiAgfSBjYXRjaCAoZXJyb3I6IHVua25vd24pIHtcbiAgICBpZiAoKGVycm9yIGFzIE5vZGVKUy5FcnJub0V4Y2VwdGlvbikuY29kZSAhPT0gJ0VOT0VOVCcpIHtcbiAgICAgIHRocm93IGVycm9yO1xuICAgIH1cbiAgfVxufVxuXG5pbnRlcmZhY2UgR2l0Um9vdHMge1xuICBzb3VyY2VSb290OiBzdHJpbmc7XG4gIHJlcG9Sb290OiBzdHJpbmc7XG59XG5cbi8qKlxuICogTG9jYXRlcyB0aGUgY3VycmVudCBnaXQgc291cmNlIHJvb3QgYW5kIHByaW1hcnkgcmVwb3NpdG9yeSByb290LlxuICpcbiAqIFN1cHBvcnRzIGJvdGggc3RhbmRhcmQgY2hlY2tvdXRzIChgLmdpdGAgZGlyZWN0b3J5KSBhbmQgd29ya3RyZWUgY2hlY2tvdXRzXG4gKiAoYC5naXRgIGZpbGUgcG9pbnRpbmcgaW50byBgLmdpdC93b3JrdHJlZXMvLi4uYCkuXG4gKlxuICogQHBhcmFtIHN0YXJ0RGlyIC0gRGlyZWN0b3J5IHdoZXJlIHVwd2FyZCBzZWFyY2ggYmVnaW5zLlxuICogQHRocm93cyB7RXJyb3J9IFdoZW4gbm8gZ2l0IHJlcG9zaXRvcnkgbWFya2VyIGlzIGZvdW5kLlxuICogQHJldHVybnMgUGF0aHMgZm9yIHRoZSBjdXJyZW50IGNoZWNrb3V0IHJvb3QgYW5kIHRoZSBwcmltYXJ5IHJlcG8gcm9vdC5cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGZpbmRHaXRSb290cyhzdGFydERpcjogc3RyaW5nKTogUHJvbWlzZTxHaXRSb290cz4ge1xuICBsZXQgY3VycmVudERpciA9IHBhdGgucmVzb2x2ZShzdGFydERpcik7XG4gIHdoaWxlIChjdXJyZW50RGlyICE9PSAnLycpIHtcbiAgICBjb25zdCBnaXRQYXRoID0gcGF0aC5qb2luKGN1cnJlbnREaXIsICcuZ2l0Jyk7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHN0YXRzID0gYXdhaXQgZnMubHN0YXQoZ2l0UGF0aCk7XG4gICAgICBpZiAoc3RhdHMuaXNEaXJlY3RvcnkoKSkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgIHNvdXJjZVJvb3Q6IGN1cnJlbnREaXIsXG4gICAgICAgICAgcmVwb1Jvb3Q6IGN1cnJlbnREaXJcbiAgICAgICAgfTtcbiAgICAgIH1cbiAgICAgIGlmIChzdGF0cy5pc0ZpbGUoKSkge1xuICAgICAgICBjb25zdCBnaXRGaWxlQ29udGVudCA9IGF3YWl0IGZzLnJlYWRGaWxlKGdpdFBhdGgsICd1dGYtOCcpO1xuICAgICAgICBjb25zdCBnaXRkaXJMaW5lID0gZ2l0RmlsZUNvbnRlbnQudHJpbSgpO1xuICAgICAgICBjb25zdCBnaXRkaXJQYXRoID0gZ2l0ZGlyTGluZS5yZXBsYWNlKC9eZ2l0ZGlyOlxccyovLCAnJyk7XG4gICAgICAgIGNvbnN0IG1haW5HaXREaXIgPSBnaXRkaXJQYXRoLnJlcGxhY2UoL1xcL3dvcmt0cmVlc1xcL1teL10rJC8sICcnKTtcbiAgICAgICAgY29uc3QgcmVwb1Jvb3QgPSBtYWluR2l0RGlyLnJlcGxhY2UoL1xcL1xcLmdpdCQvLCAnJyk7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgc291cmNlUm9vdDogY3VycmVudERpcixcbiAgICAgICAgICByZXBvUm9vdFxuICAgICAgICB9O1xuICAgICAgfVxuICAgIH0gY2F0Y2ggKGVycm9yOiB1bmtub3duKSB7XG4gICAgICBpZiAoKGVycm9yIGFzIE5vZGVKUy5FcnJub0V4Y2VwdGlvbikuY29kZSAhPT0gJ0VOT0VOVCcpIHtcbiAgICAgICAgdGhyb3cgZXJyb3I7XG4gICAgICB9XG4gICAgfVxuICAgIGN1cnJlbnREaXIgPSBwYXRoLmRpcm5hbWUoY3VycmVudERpcik7XG4gIH1cbiAgdGhyb3cgbmV3IEVycm9yKCdOb3QgaW4gYSBnaXQgcmVwb3NpdG9yeScpO1xufVxuXG4vKipcbiAqIFJlc29sdmVzIHRoZSBIRUFEIGNvbW1pdCBTSEEgZm9yIGEgcmVwb3NpdG9yeSBkaXJlY3RvcnkuXG4gKlxuICogQHBhcmFtIGN3ZCAtIFJlcG9zaXRvcnkgZGlyZWN0b3J5IHBhc3NlZCB0byBgZ2l0IHJldi1wYXJzZSBIRUFEYC5cbiAqIEByZXR1cm5zIFRyaW1tZWQgY29tbWl0IFNIQSBzdHJpbmcuXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiByZXNvbHZlSGVhZChjd2Q6IHN0cmluZyk6IFByb21pc2U8c3RyaW5nPiB7XG4gIGNvbnN0IHsgc3Rkb3V0IH0gPSBhd2FpdCBleGVjRmlsZUFzeW5jKCdnaXQnLCBbJ3Jldi1wYXJzZScsICdIRUFEJ10sIHsgY3dkLCB0aW1lb3V0OiA1XzAwMCB9KTtcbiAgcmV0dXJuIHN0ZG91dC50cmltKCk7XG59XG5cbi8qKlxuICogQ2hlY2tzIHdoZXRoZXIgYSB3b3JrdHJlZSBwYXRoIGlzIGFscmVhZHkgcmVnaXN0ZXJlZCB3aXRoIGdpdC5cbiAqXG4gKiBAcGFyYW0gcmVwb1Jvb3QgLSBQcmltYXJ5IHJlcG9zaXRvcnkgcm9vdCB3aGVyZSBnaXQgY29tbWFuZHMgcnVuLlxuICogQHBhcmFtIHdvcmt0cmVlRGlyIC0gQWJzb2x1dGUgd29ya3RyZWUgcGF0aCBiZWluZyBjcmVhdGVkLlxuICogQHJldHVybnMgVHJ1ZSB3aGVuIGBnaXQgd29ya3RyZWUgbGlzdGAgYWxyZWFkeSBjb250YWlucyBgd29ya3RyZWVEaXJgLlxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gY2hlY2tXb3JrdHJlZUV4aXN0cyhyZXBvUm9vdDogc3RyaW5nLCB3b3JrdHJlZURpcjogc3RyaW5nKTogUHJvbWlzZTxib29sZWFuPiB7XG4gIGNvbnN0IHsgc3Rkb3V0IH0gPSBhd2FpdCBleGVjRmlsZUFzeW5jKCdnaXQnLCBbJ3dvcmt0cmVlJywgJ2xpc3QnXSwgeyBjd2Q6IHJlcG9Sb290LCB0aW1lb3V0OiAzMF8wMDAgfSk7XG4gIHJldHVybiBzdGRvdXQuaW5jbHVkZXMod29ya3RyZWVEaXIpO1xufVxuXG4vKipcbiAqIENoZWNrcyB3aGV0aGVyIGEgYnJhbmNoIGFscmVhZHkgZXhpc3RzIGluIHRoZSByZXBvc2l0b3J5LlxuICpcbiAqIEBwYXJhbSByZXBvUm9vdCAtIFByaW1hcnkgcmVwb3NpdG9yeSByb290IHdoZXJlIGdpdCBjb21tYW5kcyBydW4uXG4gKiBAcGFyYW0gYnJhbmNoTmFtZSAtIEJyYW5jaCBuYW1lIHRvIHF1ZXJ5LlxuICogQHJldHVybnMgVHJ1ZSB3aGVuIGF0IGxlYXN0IG9uZSBtYXRjaGluZyBsb2NhbCBicmFuY2ggaXMgbGlzdGVkLlxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gY2hlY2tCcmFuY2hFeGlzdHMocmVwb1Jvb3Q6IHN0cmluZywgYnJhbmNoTmFtZTogc3RyaW5nKTogUHJvbWlzZTxib29sZWFuPiB7XG4gIGNvbnN0IHsgc3Rkb3V0IH0gPSBhd2FpdCBleGVjRmlsZUFzeW5jKCdnaXQnLCBbJ2JyYW5jaCcsICctLWxpc3QnLCBicmFuY2hOYW1lXSwge1xuICAgIGN3ZDogcmVwb1Jvb3QsXG4gICAgdGltZW91dDogMzBfMDAwXG4gIH0pO1xuICByZXR1cm4gc3Rkb3V0LnRyaW0oKS5sZW5ndGggPiAwO1xufVxuXG4vKipcbiAqIERldGVybWluZXMgd2hldGhlciBhIGdpdCByZWYgaXMgYSBicmFuY2gsIHRhZywgb3IgY29tbWl0IFNIQS5cbiAqXG4gKiBDaGVja3MgbG9jYWwgYnJhbmNoZXMgZmlyc3QsIHRoZW4gdGFncywgdGhlbiBmYWxscyBiYWNrIHRvIHZlcmlmeWluZ1xuICogdGhlIHJlZiByZXNvbHZlcyBhcyBhIGNvbW1pdC5cbiAqXG4gKiBAcGFyYW0gcmVwb1Jvb3QgLSBQcmltYXJ5IHJlcG9zaXRvcnkgcm9vdCB3aGVyZSBnaXQgY29tbWFuZHMgcnVuLlxuICogQHBhcmFtIHJlZiAtIFRoZSByZWYgdG8gY2xhc3NpZnkuXG4gKiBAdGhyb3dzIHtFcnJvcn0gV2hlbiB0aGUgcmVmIGRvZXMgbm90IHJlc29sdmUgdG8gYW55IGtub3duIGdpdCBvYmplY3QuXG4gKiBAcmV0dXJucyBUaGUgcmVmIHR5cGU6IGAnYnJhbmNoJ2AsIGAndGFnJ2AsIG9yIGAnY29tbWl0J2AuXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiByZXNvbHZlUmVmVHlwZShyZXBvUm9vdDogc3RyaW5nLCByZWY6IHN0cmluZyk6IFByb21pc2U8J2JyYW5jaCcgfCAndGFnJyB8ICdjb21taXQnPiB7XG4gIGNvbnN0IGJyYW5jaEV4aXN0cyA9IGF3YWl0IGNoZWNrQnJhbmNoRXhpc3RzKHJlcG9Sb290LCByZWYpO1xuICBpZiAoYnJhbmNoRXhpc3RzKSByZXR1cm4gJ2JyYW5jaCc7XG5cbiAgY29uc3QgeyBzdGRvdXQ6IHRhZ091dHB1dCB9ID0gYXdhaXQgZXhlY0ZpbGVBc3luYygnZ2l0JywgWyd0YWcnLCAnLS1saXN0JywgcmVmXSwge1xuICAgIGN3ZDogcmVwb1Jvb3QsXG4gICAgdGltZW91dDogMzBfMDAwXG4gIH0pO1xuICBpZiAodGFnT3V0cHV0LnRyaW0oKS5sZW5ndGggPiAwKSByZXR1cm4gJ3RhZyc7XG5cbiAgdHJ5IHtcbiAgICBhd2FpdCBleGVjRmlsZUFzeW5jKCdnaXQnLCBbJ3Jldi1wYXJzZScsICctLXZlcmlmeScsIGAke3JlZn1ee2NvbW1pdH1gXSwge1xuICAgICAgY3dkOiByZXBvUm9vdCxcbiAgICAgIHRpbWVvdXQ6IDVfMDAwXG4gICAgfSk7XG4gICAgcmV0dXJuICdjb21taXQnO1xuICB9IGNhdGNoIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYEVycm9yOiAnJHtyZWZ9JyBkb2VzIG5vdCByZXNvbHZlIHRvIGEgYnJhbmNoLCB0YWcsIG9yIGNvbW1pdC5gKTtcbiAgfVxufVxuXG5pbnRlcmZhY2UgQWRkV29ya3RyZWVPcHRpb25zIHtcbiAgcmVwb1Jvb3Q6IHN0cmluZztcbiAgd29ya3RyZWVEaXI6IHN0cmluZztcbiAgYnJhbmNoTmFtZTogc3RyaW5nO1xuICBicmFuY2hFeGlzdHM6IGJvb2xlYW47XG4gIHN0YXJ0UG9pbnQ6IHN0cmluZztcbn1cblxuLyoqXG4gKiBBZGRzIGEgZ2l0IHdvcmt0cmVlLCBjcmVhdGluZyB0aGUgYnJhbmNoIHdoZW4gbmVlZGVkLlxuICpcbiAqIFVzZXMgYGdpdCB3b3JrdHJlZSBhZGQgLWJgIGZvciBuZXcgYnJhbmNoZXMgYW5kIHBsYWluIGBnaXQgd29ya3RyZWUgYWRkYFxuICogd2hlbiBhdHRhY2hpbmcgdG8gYW4gZXhpc3RpbmcgYnJhbmNoLlxuICpcbiAqIEBwYXJhbSBvcHRzIC0gV29ya3RyZWUgY3JlYXRpb24gb3B0aW9ucyBhbmQgYnJhbmNoIGV4aXN0ZW5jZSBzdGF0ZS5cbiAqIEByZXR1cm5zIE5vIHZhbHVlLlxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gYWRkV29ya3RyZWUob3B0czogQWRkV29ya3RyZWVPcHRpb25zKTogUHJvbWlzZTx2b2lkPiB7XG4gIGNvbnN0IGFyZ3MgPSBvcHRzLmJyYW5jaEV4aXN0c1xuICAgID8gWyd3b3JrdHJlZScsICdhZGQnLCBvcHRzLndvcmt0cmVlRGlyLCBvcHRzLmJyYW5jaE5hbWVdXG4gICAgOiBbJ3dvcmt0cmVlJywgJ2FkZCcsICctYicsIG9wdHMuYnJhbmNoTmFtZSwgb3B0cy53b3JrdHJlZURpciwgb3B0cy5zdGFydFBvaW50XTtcbiAgYXdhaXQgZXhlY0ZpbGVBc3luYygnZ2l0JywgYXJncywgeyBjd2Q6IG9wdHMucmVwb1Jvb3QsIHRpbWVvdXQ6IDMwXzAwMCB9KTtcbn1cblxuLyoqXG4gKiBBZGRzIGEgZ2l0IHdvcmt0cmVlIGluIGRldGFjaGVkIEhFQUQgbW9kZSBhdCB0aGUgZ2l2ZW4gcmVmLlxuICpcbiAqIFVzZWQgZm9yIHRhZ3MgYW5kIGNvbW1pdCBTSEFzIHdoZXJlIG5vIGJyYW5jaCBhc3NvY2lhdGlvbiBpcyBuZWVkZWQuXG4gKlxuICogQHBhcmFtIHJlcG9Sb290IC0gUHJpbWFyeSByZXBvc2l0b3J5IHJvb3Qgd2hlcmUgZ2l0IGNvbW1hbmRzIHJ1bi5cbiAqIEBwYXJhbSB3b3JrdHJlZURpciAtIEFic29sdXRlIHBhdGggZm9yIHRoZSBuZXcgd29ya3RyZWUuXG4gKiBAcGFyYW0gcmVmIC0gVGFnIG5hbWUgb3IgY29tbWl0IFNIQSB0byBjaGVjayBvdXQuXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBhZGREZXRhY2hlZFdvcmt0cmVlKHJlcG9Sb290OiBzdHJpbmcsIHdvcmt0cmVlRGlyOiBzdHJpbmcsIHJlZjogc3RyaW5nKTogUHJvbWlzZTx2b2lkPiB7XG4gIGF3YWl0IGV4ZWNGaWxlQXN5bmMoJ2dpdCcsIFsnd29ya3RyZWUnLCAnYWRkJywgJy0tZGV0YWNoJywgd29ya3RyZWVEaXIsIHJlZl0sIHtcbiAgICBjd2Q6IHJlcG9Sb290LFxuICAgIHRpbWVvdXQ6IDMwXzAwMFxuICB9KTtcbn1cblxuaW50ZXJmYWNlIElnbm9yZWRQYXRocyB7XG4gIGRpcmVjdG9yaWVzOiBzdHJpbmdbXTtcbiAgZmlsZXM6IHN0cmluZ1tdO1xufVxuXG4vKipcbiAqIERpc2NvdmVycyBpZ25vcmVkIGZpbGVzIGFuZCBkaXJlY3RvcmllcyB1bmRlciBhIHNvdXJjZSByb290LlxuICpcbiAqIFBhdGhzIGFyZSByZXR1cm5lZCByZWxhdGl2ZSB0byBgc291cmNlUm9vdGAgYW5kIGAud29ya3RyZWVzYCBjb250ZW50IGlzXG4gKiBmaWx0ZXJlZCBvdXQgdG8gYXZvaWQgc2VsZi1yZWZlcmVudGlhbCBzeW1saW5raW5nLlxuICpcbiAqIEBwYXJhbSBzb3VyY2VSb290IC0gU291cmNlIGNoZWNrb3V0IHJvb3QgdXNlZCBmb3IgZ2l0IGRpc2NvdmVyeS5cbiAqIEByZXR1cm5zIFNlcGFyYXRlIGxpc3RzIG9mIGlnbm9yZWQgZGlyZWN0b3JpZXMgYW5kIGlnbm9yZWQgZmlsZXMuXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBkaXNjb3Zlcklnbm9yZWRQYXRocyhzb3VyY2VSb290OiBzdHJpbmcpOiBQcm9taXNlPElnbm9yZWRQYXRocz4ge1xuICBjb25zdCB7IHN0ZG91dCB9ID0gYXdhaXQgZXhlY0ZpbGVBc3luYyhcbiAgICAnZ2l0JyxcbiAgICBbJy1DJywgc291cmNlUm9vdCwgJ2xzLWZpbGVzJywgJy0taWdub3JlZCcsICctLWV4Y2x1ZGUtc3RhbmRhcmQnLCAnLS1kaXJlY3RvcnknLCAnLS1vdGhlcnMnXSxcbiAgICB7IGN3ZDogc291cmNlUm9vdCwgdGltZW91dDogMzBfMDAwIH1cbiAgKTtcblxuICBjb25zdCBsaW5lcyA9IHN0ZG91dC5zcGxpdCgnXFxuJykuZmlsdGVyKChsaW5lKSA9PiBsaW5lLmxlbmd0aCA+IDAgJiYgIWxpbmUuc3RhcnRzV2l0aCgnLndvcmt0cmVlcycpKTtcbiAgY29uc3QgZGlyZWN0b3JpZXMgPSBsaW5lcy5maWx0ZXIoKGwpID0+IGwuZW5kc1dpdGgoJy8nKSkubWFwKChsKSA9PiBsLnNsaWNlKDAsIC0xKSk7XG4gIGNvbnN0IGZpbGVzID0gbGluZXMuZmlsdGVyKChsKSA9PiAhbC5lbmRzV2l0aCgnLycpKTtcblxuICByZXR1cm4geyBkaXJlY3RvcmllcywgZmlsZXMgfTtcbn1cblxuaW50ZXJmYWNlIFN5bWxpbmtJZ25vcmVkUGF0aHNPcHRpb25zIHtcbiAgc291cmNlUm9vdDogc3RyaW5nO1xuICB3b3JrdHJlZURpcjogc3RyaW5nO1xuICBpZ25vcmVkOiBJZ25vcmVkUGF0aHM7XG59XG5cbmludGVyZmFjZSBTeW1saW5rSWdub3JlZFBhdGhzUmVzdWx0IHtcbiAgZGlyQ291bnQ6IG51bWJlcjtcbiAgZmlsZUNvdW50OiBudW1iZXI7XG59XG5cbi8qKlxuICogU3ltbGlua3MgaWdub3JlZCBkaXJlY3RvcmllcyBhbmQgZmlsZXMgZnJvbSBzb3VyY2UgY2hlY2tvdXQgaW50byBhIHdvcmt0cmVlLlxuICpcbiAqIE5lc3RlZCBpZ25vcmVkIGRpcmVjdG9yaWVzIGFyZSBjb2xsYXBzZWQgc28gb25seSB0b3AtbGV2ZWwgaWdub3JlZCBkaXJlY3RvcnlcbiAqIGxpbmtzIGFyZSBjcmVhdGVkLlxuICpcbiAqIEBwYXJhbSBvcHRzIC0gU291cmNlIHJvb3QsIGRlc3RpbmF0aW9uIHdvcmt0cmVlLCBhbmQgaWdub3JlZCBwYXRoIGxpc3RzLlxuICogQHJldHVybnMgQ291bnRzIG9mIHN1Y2Nlc3NmdWxseSBjcmVhdGVkIGRpcmVjdG9yeSBhbmQgZmlsZSBzeW1saW5rcy5cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHN5bWxpbmtJZ25vcmVkUGF0aHMob3B0czogU3ltbGlua0lnbm9yZWRQYXRoc09wdGlvbnMpOiBQcm9taXNlPFN5bWxpbmtJZ25vcmVkUGF0aHNSZXN1bHQ+IHtcbiAgY29uc3QgeyBzb3VyY2VSb290LCB3b3JrdHJlZURpciwgaWdub3JlZCB9ID0gb3B0cztcbiAgY29uc3QgZGlyU2V0ID0gbmV3IFNldChpZ25vcmVkLmRpcmVjdG9yaWVzKTtcbiAgY29uc3Qgbm9uTmVzdGVkRGlycyA9IGlnbm9yZWQuZGlyZWN0b3JpZXMuZmlsdGVyKChkaXIpID0+ICFpc05lc3RlZFVuZGVyKGRpciwgZGlyU2V0KSk7XG5cbiAgY29uc3QgY3JlYXRlRGlyU3ltbGluayA9IGFzeW5jIChkaXI6IHN0cmluZyk6IFByb21pc2U8Ym9vbGVhbj4gPT4ge1xuICAgIHRyeSB7XG4gICAgICBjb25zdCBzb3VyY2VQYXRoID0gcGF0aC5qb2luKHNvdXJjZVJvb3QsIGRpcik7XG4gICAgICB0cnkge1xuICAgICAgICBhd2FpdCBmcy5sc3RhdChzb3VyY2VQYXRoKTtcbiAgICAgIH0gY2F0Y2ggKGVycm9yOiB1bmtub3duKSB7XG4gICAgICAgIGlmICgoZXJyb3IgYXMgTm9kZUpTLkVycm5vRXhjZXB0aW9uKS5jb2RlID09PSAnRU5PRU5UJykge1xuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBwcm9jZXNzLnN0ZGVyci53cml0ZShcbiAgICAgICAgICBgY3JlYXRlLXdvcmt0cmVlOiB1bmV4cGVjdGVkIGVycm9yIGluIGxzdGF0OiAke2Vycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogU3RyaW5nKGVycm9yKX1cXG5gXG4gICAgICAgICk7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IGRlc3RQYXRoID0gcGF0aC5qb2luKHdvcmt0cmVlRGlyLCBkaXIpO1xuICAgICAgY29uc3QgcGFyZW50RGlyID0gcGF0aC5kaXJuYW1lKGRpcik7XG4gICAgICBpZiAocGFyZW50RGlyICE9PSAnLicpIHtcbiAgICAgICAgYXdhaXQgZnMubWtkaXIocGF0aC5qb2luKHdvcmt0cmVlRGlyLCBwYXJlbnREaXIpLCB7IHJlY3Vyc2l2ZTogdHJ1ZSB9KTtcbiAgICAgIH1cbiAgICAgIGF3YWl0IGZzLnN5bWxpbmsoc291cmNlUGF0aCwgZGVzdFBhdGgpO1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSBjYXRjaCAoZXJyb3I6IHVua25vd24pIHtcbiAgICAgIGNvbnN0IGNvZGUgPSAoZXJyb3IgYXMgTm9kZUpTLkVycm5vRXhjZXB0aW9uKS5jb2RlO1xuICAgICAgaWYgKGNvZGUgPT09ICdFRVhJU1QnIHx8IGNvZGUgPT09ICdFTk9FTlQnKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICAgIHByb2Nlc3Muc3RkZXJyLndyaXRlKFxuICAgICAgICBgY3JlYXRlLXdvcmt0cmVlOiB1bmV4cGVjdGVkIGVycm9yIGluIHN5bWxpbms6ICR7ZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiBTdHJpbmcoZXJyb3IpfVxcbmBcbiAgICAgICk7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICB9O1xuXG4gIGNvbnN0IGNyZWF0ZUZpbGVTeW1saW5rID0gYXN5bmMgKGZpbGU6IHN0cmluZyk6IFByb21pc2U8Ym9vbGVhbj4gPT4ge1xuICAgIHRyeSB7XG4gICAgICBjb25zdCBzb3VyY2VQYXRoID0gcGF0aC5qb2luKHNvdXJjZVJvb3QsIGZpbGUpO1xuICAgICAgdHJ5IHtcbiAgICAgICAgYXdhaXQgZnMubHN0YXQoc291cmNlUGF0aCk7XG4gICAgICB9IGNhdGNoIChlcnJvcjogdW5rbm93bikge1xuICAgICAgICBpZiAoKGVycm9yIGFzIE5vZGVKUy5FcnJub0V4Y2VwdGlvbikuY29kZSA9PT0gJ0VOT0VOVCcpIHtcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgcHJvY2Vzcy5zdGRlcnIud3JpdGUoXG4gICAgICAgICAgYGNyZWF0ZS13b3JrdHJlZTogdW5leHBlY3RlZCBlcnJvciBpbiBsc3RhdDogJHtlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6IFN0cmluZyhlcnJvcil9XFxuYFxuICAgICAgICApO1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgICBjb25zdCBkZXN0UGF0aCA9IHBhdGguam9pbih3b3JrdHJlZURpciwgZmlsZSk7XG4gICAgICBjb25zdCBwYXJlbnREaXIgPSBwYXRoLmRpcm5hbWUoZmlsZSk7XG4gICAgICBpZiAocGFyZW50RGlyICE9PSAnLicpIHtcbiAgICAgICAgYXdhaXQgZnMubWtkaXIocGF0aC5qb2luKHdvcmt0cmVlRGlyLCBwYXJlbnREaXIpLCB7IHJlY3Vyc2l2ZTogdHJ1ZSB9KTtcbiAgICAgIH1cbiAgICAgIGF3YWl0IGZzLnN5bWxpbmsoc291cmNlUGF0aCwgZGVzdFBhdGgpO1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSBjYXRjaCAoZXJyb3I6IHVua25vd24pIHtcbiAgICAgIGNvbnN0IGNvZGUgPSAoZXJyb3IgYXMgTm9kZUpTLkVycm5vRXhjZXB0aW9uKS5jb2RlO1xuICAgICAgaWYgKGNvZGUgPT09ICdFRVhJU1QnIHx8IGNvZGUgPT09ICdFTk9FTlQnKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICAgIHByb2Nlc3Muc3RkZXJyLndyaXRlKFxuICAgICAgICBgY3JlYXRlLXdvcmt0cmVlOiB1bmV4cGVjdGVkIGVycm9yIGluIHN5bWxpbms6ICR7ZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiBTdHJpbmcoZXJyb3IpfVxcbmBcbiAgICAgICk7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICB9O1xuXG4gIGNvbnN0IGRpclJlc3VsdHMgPSBhd2FpdCBQcm9taXNlLmFsbChub25OZXN0ZWREaXJzLm1hcChjcmVhdGVEaXJTeW1saW5rKSk7XG4gIGNvbnN0IG5vbk5lc3RlZEZpbGVzID0gaWdub3JlZC5maWxlcy5maWx0ZXIoKGZpbGUpID0+ICFpc05lc3RlZFVuZGVyKGZpbGUsIGRpclNldCkpO1xuICBjb25zdCBmaWxlUmVzdWx0cyA9IGF3YWl0IFByb21pc2UuYWxsKG5vbk5lc3RlZEZpbGVzLm1hcChjcmVhdGVGaWxlU3ltbGluaykpO1xuXG4gIGNvbnN0IGRpckNvdW50ID0gZGlyUmVzdWx0cy5maWx0ZXIoKHIpID0+IHIpLmxlbmd0aDtcbiAgY29uc3QgZmlsZUNvdW50ID0gZmlsZVJlc3VsdHMuZmlsdGVyKChyKSA9PiByKS5sZW5ndGg7XG5cbiAgcmV0dXJuIHsgZGlyQ291bnQsIGZpbGVDb3VudCB9O1xufVxuXG4vKipcbiAqIFJlcGxpY2F0ZXMgcm9vdC1sZXZlbCBzeW1saW5rcyBmcm9tIHRoZSBzb3VyY2UgY2hlY2tvdXQgaW50byB0aGUgd29ya3RyZWUuXG4gKlxuICogRXhpc3RpbmcgZGVzdGluYXRpb24gZW50cmllcyBhcmUgbGVmdCB1bnRvdWNoZWQuXG4gKlxuICogQHBhcmFtIHNvdXJjZVJvb3QgLSBTb3VyY2UgY2hlY2tvdXQgcm9vdC5cbiAqIEBwYXJhbSB3b3JrdHJlZURpciAtIERlc3RpbmF0aW9uIHdvcmt0cmVlIHJvb3QuXG4gKiBAcmV0dXJucyBOdW1iZXIgb2Ygc3ltbGlua3MgY3JlYXRlZCBpbiB0aGUgZGVzdGluYXRpb24gcm9vdC5cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGNvcHlFeGlzdGluZ1N5bWxpbmtzKHNvdXJjZVJvb3Q6IHN0cmluZywgd29ya3RyZWVEaXI6IHN0cmluZyk6IFByb21pc2U8bnVtYmVyPiB7XG4gIGNvbnN0IGVudHJpZXMgPSBhd2FpdCBmcy5yZWFkZGlyKHNvdXJjZVJvb3QsIHsgd2l0aEZpbGVUeXBlczogdHJ1ZSB9KTtcbiAgY29uc3Qgc3ltbGlua3MgPSBlbnRyaWVzLmZpbHRlcigoZSkgPT4gZS5pc1N5bWJvbGljTGluaygpICYmIGUubmFtZSAhPT0gJy5naXQnICYmIGUubmFtZSAhPT0gJy53b3JrdHJlZXMnKTtcblxuICBjb25zdCBjb3B5U3ltbGluayA9IGFzeW5jIChuYW1lOiBzdHJpbmcpOiBQcm9taXNlPGJvb2xlYW4+ID0+IHtcbiAgICBjb25zdCBkZXN0UGF0aCA9IHBhdGguam9pbih3b3JrdHJlZURpciwgbmFtZSk7XG4gICAgdHJ5IHtcbiAgICAgIGF3YWl0IGZzLmxzdGF0KGRlc3RQYXRoKTtcbiAgICAgIHJldHVybiBmYWxzZTsgLy8gRGVzdGluYXRpb24gYWxyZWFkeSBleGlzdHNcbiAgICB9IGNhdGNoIChlcnJvcjogdW5rbm93bikge1xuICAgICAgaWYgKChlcnJvciBhcyBOb2RlSlMuRXJybm9FeGNlcHRpb24pLmNvZGUgIT09ICdFTk9FTlQnKSB7XG4gICAgICAgIHRocm93IGVycm9yO1xuICAgICAgfVxuICAgIH1cbiAgICBjb25zdCBzb3VyY2VMaW5rUGF0aCA9IHBhdGguam9pbihzb3VyY2VSb290LCBuYW1lKTtcblxuICAgIC8vIFNraXAgc2VsZi1yZWZlcmVuY2luZyBzeW1saW5rcyAodGFyZ2V0IHJlc29sdmVzIGJhY2sgdG8gdGhlIHN5bWxpbmsgaXRzZWxmKVxuICAgIGNvbnN0IHRhcmdldCA9IGF3YWl0IGZzLnJlYWRsaW5rKHNvdXJjZUxpbmtQYXRoKTtcbiAgICBjb25zdCByZXNvbHZlZFRhcmdldCA9IHBhdGgucmVzb2x2ZShzb3VyY2VSb290LCB0YXJnZXQpO1xuICAgIGlmIChyZXNvbHZlZFRhcmdldCA9PT0gc291cmNlTGlua1BhdGgpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICBhd2FpdCBmcy5zeW1saW5rKHNvdXJjZUxpbmtQYXRoLCBkZXN0UGF0aCk7XG4gICAgcmV0dXJuIHRydWU7XG4gIH07XG5cbiAgY29uc3QgcmVzdWx0cyA9IGF3YWl0IFByb21pc2UuYWxsKHN5bWxpbmtzLm1hcCgoZSkgPT4gY29weVN5bWxpbmsoZS5uYW1lKSkpO1xuICByZXR1cm4gcmVzdWx0cy5maWx0ZXIoKHIpID0+IHIpLmxlbmd0aDtcbn1cblxuaW50ZXJmYWNlIFJlcm91dGVOb2RlTW9kdWxlc09wdGlvbnMge1xuICBzb3VyY2VOb2RlTW9kdWxlczogc3RyaW5nO1xuICBkZXN0Tm9kZU1vZHVsZXM6IHN0cmluZztcbn1cblxuLyoqXG4gKiBNaXJyb3JzIGEgbm9kZV9tb2R1bGVzIHRyZWUgaW50byB0aGUgd29ya3RyZWUgdXNpbmcgc3ltbGlua3MuXG4gKlxuICogSW50ZXJuYWwgd29ya3NwYWNlIGxpbmtzIGtlZXAgdGhlaXIgb3JpZ2luYWwgcmVsYXRpdmUgdGFyZ2V0cyB3aGlsZSBleHRlcm5hbFxuICogbGlua3MgYW5kIG5vbi1saW5rIGVudHJpZXMgYXJlIHJlcHJlc2VudGVkIGFzIHN5bWxpbmtzIHRvIHNvdXJjZSBwYXRocy5cbiAqXG4gKiBAcGFyYW0gb3B0cyAtIFNvdXJjZSBhbmQgZGVzdGluYXRpb24gbm9kZV9tb2R1bGVzIGRpcmVjdG9yaWVzLlxuICogQHJldHVybnMgQ291bnQgb2YgaW50ZXJuYWwgd29ya3NwYWNlIHN5bWxpbmtzIHJlY3JlYXRlZCBieSB0YXJnZXQgcGF0aC5cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHJlcm91dGVOb2RlTW9kdWxlcyhvcHRzOiBSZXJvdXRlTm9kZU1vZHVsZXNPcHRpb25zKTogUHJvbWlzZTxudW1iZXI+IHtcbiAgY29uc3QgeyBzb3VyY2VOb2RlTW9kdWxlcywgZGVzdE5vZGVNb2R1bGVzIH0gPSBvcHRzO1xuXG4gIHRyeSB7XG4gICAgYXdhaXQgZnMubHN0YXQoc291cmNlTm9kZU1vZHVsZXMpO1xuICB9IGNhdGNoIChlcnJvcjogdW5rbm93bikge1xuICAgIGlmICgoZXJyb3IgYXMgTm9kZUpTLkVycm5vRXhjZXB0aW9uKS5jb2RlID09PSAnRU5PRU5UJykge1xuICAgICAgcmV0dXJuIDA7XG4gICAgfVxuICAgIHRocm93IGVycm9yO1xuICB9XG5cbiAgdHJ5IHtcbiAgICBjb25zdCBkZXN0U3RhdHMgPSBhd2FpdCBmcy5sc3RhdChkZXN0Tm9kZU1vZHVsZXMpO1xuICAgIGlmIChkZXN0U3RhdHMuaXNTeW1ib2xpY0xpbmsoKSkge1xuICAgICAgYXdhaXQgZnMudW5saW5rKGRlc3ROb2RlTW9kdWxlcyk7XG4gICAgfVxuICB9IGNhdGNoIChlcnJvcjogdW5rbm93bikge1xuICAgIGlmICgoZXJyb3IgYXMgTm9kZUpTLkVycm5vRXhjZXB0aW9uKS5jb2RlICE9PSAnRU5PRU5UJykge1xuICAgICAgdGhyb3cgZXJyb3I7XG4gICAgfVxuICB9XG5cbiAgYXdhaXQgZnMubWtkaXIoZGVzdE5vZGVNb2R1bGVzLCB7IHJlY3Vyc2l2ZTogdHJ1ZSB9KTtcblxuICBjb25zdCBlbnRyaWVzID0gYXdhaXQgZnMucmVhZGRpcihzb3VyY2VOb2RlTW9kdWxlcywgeyB3aXRoRmlsZVR5cGVzOiB0cnVlIH0pO1xuICBjb25zdCBjb3VudHMgPSBhd2FpdCBQcm9taXNlLmFsbChcbiAgICBlbnRyaWVzLm1hcChhc3luYyAoZW50cnkpOiBQcm9taXNlPG51bWJlcj4gPT4ge1xuICAgICAgY29uc3Qgc291cmNlUGF0aCA9IHBhdGguam9pbihzb3VyY2VOb2RlTW9kdWxlcywgZW50cnkubmFtZSk7XG4gICAgICBjb25zdCBkZXN0UGF0aCA9IHBhdGguam9pbihkZXN0Tm9kZU1vZHVsZXMsIGVudHJ5Lm5hbWUpO1xuXG4gICAgICBpZiAoZW50cnkuaXNTeW1ib2xpY0xpbmsoKSkge1xuICAgICAgICBjb25zdCB0YXJnZXQgPSBhd2FpdCBmcy5yZWFkbGluayhzb3VyY2VQYXRoKTtcbiAgICAgICAgaWYgKGlzSW50ZXJuYWxTeW1saW5rKHRhcmdldCkpIHtcbiAgICAgICAgICBhd2FpdCBmcy5zeW1saW5rKHRhcmdldCwgZGVzdFBhdGgpO1xuICAgICAgICAgIHJldHVybiAxO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGF3YWl0IGZzLnN5bWxpbmsoc291cmNlUGF0aCwgZGVzdFBhdGgpO1xuICAgICAgICAgIHJldHVybiAwO1xuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYgKGVudHJ5LmlzRGlyZWN0b3J5KCkgJiYgZW50cnkubmFtZS5zdGFydHNXaXRoKCdAJykpIHtcbiAgICAgICAgYXdhaXQgZnMubWtkaXIoZGVzdFBhdGgsIHsgcmVjdXJzaXZlOiB0cnVlIH0pO1xuICAgICAgICBjb25zdCBzY29wZUVudHJpZXMgPSBhd2FpdCBmcy5yZWFkZGlyKHNvdXJjZVBhdGgsIHsgd2l0aEZpbGVUeXBlczogdHJ1ZSB9KTtcbiAgICAgICAgY29uc3Qgc2NvcGVDb3VudHMgPSBhd2FpdCBQcm9taXNlLmFsbChcbiAgICAgICAgICBzY29wZUVudHJpZXMubWFwKGFzeW5jIChzY29wZUVudHJ5KTogUHJvbWlzZTxudW1iZXI+ID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHNjb3BlU291cmNlUGF0aCA9IHBhdGguam9pbihzb3VyY2VQYXRoLCBzY29wZUVudHJ5Lm5hbWUpO1xuICAgICAgICAgICAgY29uc3Qgc2NvcGVEZXN0UGF0aCA9IHBhdGguam9pbihkZXN0UGF0aCwgc2NvcGVFbnRyeS5uYW1lKTtcblxuICAgICAgICAgICAgaWYgKHNjb3BlRW50cnkuaXNTeW1ib2xpY0xpbmsoKSkge1xuICAgICAgICAgICAgICBjb25zdCB0YXJnZXQgPSBhd2FpdCBmcy5yZWFkbGluayhzY29wZVNvdXJjZVBhdGgpO1xuICAgICAgICAgICAgICBpZiAoaXNJbnRlcm5hbFN5bWxpbmsodGFyZ2V0KSkge1xuICAgICAgICAgICAgICAgIGF3YWl0IGZzLnN5bWxpbmsodGFyZ2V0LCBzY29wZURlc3RQYXRoKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gMTtcbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBhd2FpdCBmcy5zeW1saW5rKHNjb3BlU291cmNlUGF0aCwgc2NvcGVEZXN0UGF0aCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIDA7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIGF3YWl0IGZzLnN5bWxpbmsoc2NvcGVTb3VyY2VQYXRoLCBzY29wZURlc3RQYXRoKTtcbiAgICAgICAgICAgICAgcmV0dXJuIDA7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSlcbiAgICAgICAgKTtcbiAgICAgICAgcmV0dXJuIHNjb3BlQ291bnRzLnJlZHVjZSgoc3VtLCBjKSA9PiBzdW0gKyBjLCAwKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGF3YWl0IGZzLnN5bWxpbmsoc291cmNlUGF0aCwgZGVzdFBhdGgpO1xuICAgICAgICByZXR1cm4gMDtcbiAgICAgIH1cbiAgICB9KVxuICApO1xuXG4gIHJldHVybiBjb3VudHMucmVkdWNlKChzdW0sIGMpID0+IHN1bSArIGMsIDApO1xufVxuXG5pbnRlcmZhY2UgUmVyb3V0ZUFsbE5vZGVNb2R1bGVzT3B0aW9ucyB7XG4gIHNvdXJjZVJvb3Q6IHN0cmluZztcbiAgd29ya3RyZWVEaXI6IHN0cmluZztcbiAgcmVwb1Jvb3Q6IHN0cmluZztcbn1cblxuLyoqXG4gKiBSZXJvdXRlcyByb290IGFuZCBwZXItcGFja2FnZSBub2RlX21vZHVsZXMgZGlyZWN0b3JpZXMgaW50byB0aGUgd29ya3RyZWUuXG4gKlxuICogVGhlIG9wZXJhdGlvbiBpcyBza2lwcGVkIHdoZW4gdGhlIHJlcG9zaXRvcnkgaGFzIG5vIHdvcmtzcGFjZSBjb25maWd1cmF0aW9uLlxuICpcbiAqIEBwYXJhbSBvcHRzIC0gU291cmNlIHJvb3QsIGRlc3RpbmF0aW9uIHdvcmt0cmVlIHJvb3QsIGFuZCByZXBvIHJvb3QuXG4gKiBAcmV0dXJucyBUb3RhbCBudW1iZXIgb2YgcmVjcmVhdGVkIGludGVybmFsIHdvcmtzcGFjZSBzeW1saW5rcy5cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHJlcm91dGVBbGxOb2RlTW9kdWxlcyhvcHRzOiBSZXJvdXRlQWxsTm9kZU1vZHVsZXNPcHRpb25zKTogUHJvbWlzZTxudW1iZXI+IHtcbiAgY29uc3QgeyBzb3VyY2VSb290LCB3b3JrdHJlZURpciwgcmVwb1Jvb3QgfSA9IG9wdHM7XG5cbiAgbGV0IHBhY2thZ2VKc29uOiB7IHdvcmtzcGFjZXM/OiBzdHJpbmdbXSB9O1xuICB0cnkge1xuICAgIGNvbnN0IHBhY2thZ2VKc29uQ29udGVudCA9IGF3YWl0IGZzLnJlYWRGaWxlKHBhdGguam9pbihyZXBvUm9vdCwgJ3BhY2thZ2UuanNvbicpLCAndXRmLTgnKTtcbiAgICBwYWNrYWdlSnNvbiA9IEpTT04ucGFyc2UocGFja2FnZUpzb25Db250ZW50KTtcbiAgfSBjYXRjaCAoZXJyb3I6IHVua25vd24pIHtcbiAgICBpZiAoKGVycm9yIGFzIE5vZGVKUy5FcnJub0V4Y2VwdGlvbikuY29kZSA9PT0gJ0VOT0VOVCcpIHtcbiAgICAgIHJldHVybiAwO1xuICAgIH1cbiAgICB0aHJvdyBlcnJvcjtcbiAgfVxuXG4gIGlmICghcGFja2FnZUpzb24ud29ya3NwYWNlcykge1xuICAgIHJldHVybiAwO1xuICB9XG5cbiAgbGV0IHRvdGFsQ291bnQgPSAwO1xuXG4gIHRvdGFsQ291bnQgKz0gYXdhaXQgcmVyb3V0ZU5vZGVNb2R1bGVzKHtcbiAgICBzb3VyY2VOb2RlTW9kdWxlczogcGF0aC5qb2luKHNvdXJjZVJvb3QsICdub2RlX21vZHVsZXMnKSxcbiAgICBkZXN0Tm9kZU1vZHVsZXM6IHBhdGguam9pbih3b3JrdHJlZURpciwgJ25vZGVfbW9kdWxlcycpXG4gIH0pO1xuXG4gIGNvbnN0IHBhY2thZ2VzRGlyID0gcGF0aC5qb2luKHNvdXJjZVJvb3QsICdwYWNrYWdlcycpO1xuICB0cnkge1xuICAgIGNvbnN0IHBhY2thZ2VFbnRyaWVzID0gYXdhaXQgZnMucmVhZGRpcihwYWNrYWdlc0RpciwgeyB3aXRoRmlsZVR5cGVzOiB0cnVlIH0pO1xuICAgIGZvciAoY29uc3QgZW50cnkgb2YgcGFja2FnZUVudHJpZXMpIHtcbiAgICAgIGlmIChlbnRyeS5pc0RpcmVjdG9yeSgpKSB7XG4gICAgICAgIGNvbnN0IHBrZ05vZGVNb2R1bGVzID0gcGF0aC5qb2luKHBhY2thZ2VzRGlyLCBlbnRyeS5uYW1lLCAnbm9kZV9tb2R1bGVzJyk7XG4gICAgICAgIGxldCBub2RlTW9kdWxlc0V4aXN0cyA9IGZhbHNlO1xuICAgICAgICB0cnkge1xuICAgICAgICAgIGF3YWl0IGZzLmxzdGF0KHBrZ05vZGVNb2R1bGVzKTtcbiAgICAgICAgICBub2RlTW9kdWxlc0V4aXN0cyA9IHRydWU7XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yOiB1bmtub3duKSB7XG4gICAgICAgICAgaWYgKChlcnJvciBhcyBOb2RlSlMuRXJybm9FeGNlcHRpb24pLmNvZGUgIT09ICdFTk9FTlQnKSB7XG4gICAgICAgICAgICB0aHJvdyBlcnJvcjtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKG5vZGVNb2R1bGVzRXhpc3RzKSB7XG4gICAgICAgICAgY29uc3QgZGVzdFBhY2thZ2VEaXIgPSBwYXRoLmpvaW4od29ya3RyZWVEaXIsICdwYWNrYWdlcycsIGVudHJ5Lm5hbWUpO1xuICAgICAgICAgIGF3YWl0IGZzLm1rZGlyKGRlc3RQYWNrYWdlRGlyLCB7IHJlY3Vyc2l2ZTogdHJ1ZSB9KTtcbiAgICAgICAgICB0b3RhbENvdW50ICs9IGF3YWl0IHJlcm91dGVOb2RlTW9kdWxlcyh7XG4gICAgICAgICAgICBzb3VyY2VOb2RlTW9kdWxlczogcGtnTm9kZU1vZHVsZXMsXG4gICAgICAgICAgICBkZXN0Tm9kZU1vZHVsZXM6IHBhdGguam9pbihkZXN0UGFja2FnZURpciwgJ25vZGVfbW9kdWxlcycpXG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH0gY2F0Y2ggKGVycm9yOiB1bmtub3duKSB7XG4gICAgaWYgKChlcnJvciBhcyBOb2RlSlMuRXJybm9FeGNlcHRpb24pLmNvZGUgIT09ICdFTk9FTlQnKSB7XG4gICAgICB0aHJvdyBlcnJvcjtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gdG90YWxDb3VudDtcbn1cblxuaW50ZXJmYWNlIFVwZGF0ZUdpdEV4Y2x1ZGVPcHRpb25zIHtcbiAgd29ya3RyZWVEaXI6IHN0cmluZztcbiAgcmVwb1Jvb3Q6IHN0cmluZztcbiAgZGlyZWN0b3JpZXM6IHN0cmluZ1tdO1xuICBmaWxlczogc3RyaW5nW107XG59XG5cbi8qKlxuICogQXBwZW5kcyBzeW1saW5rZWQgaWdub3JlZCBwYXRocyB0byB0aGUgd29ya3RyZWUtc3BlY2lmaWMgZ2l0IGV4Y2x1ZGUgZmlsZS5cbiAqXG4gKiBBbHNvIGVuYWJsZXMgYGV4dGVuc2lvbnMud29ya3RyZWVDb25maWdgIGFuZCBzZXRzIHdvcmt0cmVlLWxvY2FsXG4gKiBgY29yZS5leGNsdWRlc0ZpbGVgIHNvIGdpdCBzdGF0dXMgaW4gdGhlIHdvcmt0cmVlIGlnbm9yZXMgaW5qZWN0ZWQgbGlua3MuXG4gKlxuICogQHBhcmFtIG9wdHMgLSBXb3JrdHJlZSBwYXRoLCByZXBvIHJvb3QsIGFuZCBpZ25vcmVkIHBhdGggY2FuZGlkYXRlcy5cbiAqIEByZXR1cm5zIE5vIHZhbHVlLlxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gdXBkYXRlR2l0RXhjbHVkZShvcHRzOiBVcGRhdGVHaXRFeGNsdWRlT3B0aW9ucyk6IFByb21pc2U8dm9pZD4ge1xuICBjb25zdCB7IHdvcmt0cmVlRGlyLCByZXBvUm9vdCwgZGlyZWN0b3JpZXMsIGZpbGVzIH0gPSBvcHRzO1xuXG4gIGNvbnN0IHsgc3Rkb3V0OiBnaXREaXIgfSA9IGF3YWl0IGV4ZWNGaWxlQXN5bmMoJ2dpdCcsIFsnLUMnLCB3b3JrdHJlZURpciwgJ3Jldi1wYXJzZScsICctLWdpdC1kaXInXSwge1xuICAgIHRpbWVvdXQ6IDVfMDAwXG4gIH0pO1xuICBjb25zdCBleGNsdWRlUGF0aCA9IHBhdGguam9pbihnaXREaXIudHJpbSgpLCAnaW5mbycsICdleGNsdWRlJyk7XG4gIGF3YWl0IGZzLm1rZGlyKHBhdGguZGlybmFtZShleGNsdWRlUGF0aCksIHsgcmVjdXJzaXZlOiB0cnVlIH0pO1xuXG4gIGNvbnN0IGxpbmVzID0gWycjIFN5bWxpbmtzIGNyZWF0ZWQgYnkgaW5zdGFudC13b3JrdHJlZSddO1xuXG4gIGZvciAoY29uc3QgZGlyIG9mIGRpcmVjdG9yaWVzKSB7XG4gICAgaWYgKCFkaXIpIGNvbnRpbnVlO1xuICAgIHRyeSB7XG4gICAgICBjb25zdCBzdGF0cyA9IGF3YWl0IGZzLmxzdGF0KHBhdGguam9pbih3b3JrdHJlZURpciwgZGlyKSk7XG4gICAgICBpZiAoc3RhdHMuaXNTeW1ib2xpY0xpbmsoKSkgbGluZXMucHVzaChkaXIpO1xuICAgIH0gY2F0Y2ggKGVycm9yOiB1bmtub3duKSB7XG4gICAgICBpZiAoKGVycm9yIGFzIE5vZGVKUy5FcnJub0V4Y2VwdGlvbikuY29kZSAhPT0gJ0VOT0VOVCcpIHtcbiAgICAgICAgdGhyb3cgZXJyb3I7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgZm9yIChjb25zdCBmaWxlIG9mIGZpbGVzKSB7XG4gICAgaWYgKCFmaWxlKSBjb250aW51ZTtcbiAgICB0cnkge1xuICAgICAgY29uc3Qgc3RhdHMgPSBhd2FpdCBmcy5sc3RhdChwYXRoLmpvaW4od29ya3RyZWVEaXIsIGZpbGUpKTtcbiAgICAgIGlmIChzdGF0cy5pc1N5bWJvbGljTGluaygpKSBsaW5lcy5wdXNoKGZpbGUpO1xuICAgIH0gY2F0Y2ggKGVycm9yOiB1bmtub3duKSB7XG4gICAgICBpZiAoKGVycm9yIGFzIE5vZGVKUy5FcnJub0V4Y2VwdGlvbikuY29kZSAhPT0gJ0VOT0VOVCcpIHtcbiAgICAgICAgdGhyb3cgZXJyb3I7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgYXdhaXQgZnMuYXBwZW5kRmlsZShleGNsdWRlUGF0aCwgYCR7bGluZXMuam9pbignXFxuJyl9XFxuYCk7XG5cbiAgdHJ5IHtcbiAgICBhd2FpdCBleGVjRmlsZUFzeW5jKCdnaXQnLCBbJy1DJywgcmVwb1Jvb3QsICdjb25maWcnLCAnZXh0ZW5zaW9ucy53b3JrdHJlZUNvbmZpZycsICd0cnVlJ10sIHsgdGltZW91dDogNV8wMDAgfSk7XG4gIH0gY2F0Y2ggKGVycm9yOiB1bmtub3duKSB7XG4gICAgcHJvY2Vzcy5zdGRlcnIud3JpdGUoXG4gICAgICBgY3JlYXRlLXdvcmt0cmVlOiBmYWlsZWQgdG8gc2V0IHdvcmt0cmVlQ29uZmlnIGV4dGVuc2lvbjogJHtlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6IFN0cmluZyhlcnJvcil9XFxuYFxuICAgICk7XG4gIH1cblxuICB0cnkge1xuICAgIGF3YWl0IGV4ZWNGaWxlQXN5bmMoJ2dpdCcsIFsnLUMnLCB3b3JrdHJlZURpciwgJ2NvbmZpZycsICctLXdvcmt0cmVlJywgJ2NvcmUuZXhjbHVkZXNGaWxlJywgZXhjbHVkZVBhdGhdLCB7XG4gICAgICB0aW1lb3V0OiA1XzAwMFxuICAgIH0pO1xuICB9IGNhdGNoIChlcnJvcjogdW5rbm93bikge1xuICAgIHByb2Nlc3Muc3RkZXJyLndyaXRlKFxuICAgICAgYGNyZWF0ZS13b3JrdHJlZTogZmFpbGVkIHRvIHNldCBjb3JlLmV4Y2x1ZGVzRmlsZTogJHtlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6IFN0cmluZyhlcnJvcil9XFxuYFxuICAgICk7XG4gIH1cbn1cbiIsICIvKipcbiAqIENvZGV4IGFjdGlvbiBmb3IgQ2FyZHMgd29ya2Zsb3dzLlxuICpcbiAqIFNwYXducyB0aGUgYGNvZGV4YCBDTEkgZm9yIHRoZSBjdXJyZW50IGNhcmQuIFRoZSBzZXNzaW9uIGFsd2F5cyBydW5zXG4gKiBpbnRlcmFjdGl2ZWx5IHNvIENvZGV4IGNhbiBjb250aW51ZSB3b3JrIGRpcmVjdGx5IGluIHRoZSB0ZXJtaW5hbCB3aGlsZVxuICogcmVjZWl2aW5nIGV4cGxpY2l0IGluc3RydWN0aW9ucyBmb3IgbG9hZGluZyB0aGUgcGFja2FnZWQgcnVudGltZSBza2lsbC5cbiAqXG4gKiBAc3VtbWFyeSBDb2RleCBhY3Rpb24gZm9yIENhcmRzIHdvcmtmbG93c1xuICogQG1vZHVsZVxuICovXG5cbmltcG9ydCB7IHR5cGUgQWN0aW9uQ29udGV4dCwgdHlwZSBBY3Rpb25JbnB1dCwgZGVmaW5lQWN0aW9uIH0gZnJvbSAnQGNhcmRzL3Nkay9jb25maWcnO1xuaW1wb3J0IHsgc3Bhd25Db2RleFNlc3Npb24gfSBmcm9tICcuLi9saWIvY29kZXgtc2Vzc2lvbi5qcyc7XG5cbi8qKlxuICogQ29kZXggYWN0aW9uIGhhbmRsZXIuXG4gKlxuICogU3RhcnRzIGFuIGludGVyYWN0aXZlIENvZGV4IHNlc3Npb24gcm9vdGVkIGF0IHRoZSBjYXJkIHdvcmt0cmVlIHdpdGggdGhlXG4gKiBwYWNrYWdlZCBgY29kZXgtcnVudGltZWAgcGx1Z2luIGVuYWJsZWQgZm9yIGBjYXJkcy1ydW50aW1lYCBza2lsbCBkaXNjb3ZlcnkuXG4gKi9cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUFjdGlvbihcbiAge1xuICAgIGFjdGlvbk5hbWU6ICdDb2RleCcsXG4gICAgZGVzY3JpcHRpb246ICdTdGFydCBhIENvZGV4IHNlc3Npb24gZm9yIHRoZSBjYXJkJyxcbiAgICBzdXBwb3J0c0JhY2tncm91bmRNb2RlOiBmYWxzZSxcbiAgICB0aW1lb3V0OiAzNjAwMDAwXG4gIH0sXG4gIGFzeW5jIChpbnB1dDogQWN0aW9uSW5wdXQsIGNvbnRleHQ6IEFjdGlvbkNvbnRleHQpID0+IHtcbiAgICBhd2FpdCBzcGF3bkNvZGV4U2Vzc2lvbihpbnB1dCwgY29udGV4dCwge1xuICAgICAgcHJvbXB0OiAnVXNlIHRoZSBgY2FyZHMtcnVudGltZWAgc2tpbGwgZm9yIGNhcmQgcmVwb3NpdG9yeSBjb252ZW50aW9ucywgdGhlbiBjb250aW51ZSB3b3JrIG9uIHRoZSBjYXJkLidcbiAgICB9KTtcbiAgfVxuKTtcbiIsICJcbmltcG9ydCBoYW5kbGVyIGZyb20gJy4vY29kZXgudHMnO1xuaW1wb3J0IHsgZXhlY3V0ZUNvbW1hbmQgfSBmcm9tICcuLi8uLi8uLi9zZGsvc3JjL2NvbmZpZy9ydW50aW1lLnRzJztcblxuaWYgKCFwcm9jZXNzLmFyZ3YuaW5jbHVkZXMoJy0tYnJhbmNoLWNsZWFudXAnKSkge1xuICBleGVjdXRlQ29tbWFuZChoYW5kbGVyKTtcbn1cbiJdLAogICJtYXBwaW5ncyI6ICI7Ozs7QUF5TE8sU0FBUyxhQUNkLFFBQ0EsU0FDZ0M7QUFDaEMsUUFBTSxLQUFLLE9BQU8sT0FBb0IsWUFBMEM7QUFDOUUsVUFBTSxRQUFRLE9BQU8sT0FBTztBQUFBLEVBQzlCO0FBRUEsS0FBRyxjQUFjO0FBQ2pCLEtBQUcsS0FBSyxPQUFPO0FBQ2YsS0FBRyxhQUFhLE9BQU87QUFDdkIsS0FBRyxjQUFjLE9BQU87QUFDeEIsS0FBRyxPQUFPLE9BQU87QUFDakIsS0FBRyx5QkFBeUIsT0FBTztBQUNuQyxLQUFHLGtCQUFrQixPQUFPO0FBQzVCLEtBQUcsVUFBVSxPQUFPO0FBQ3BCLEtBQUcsYUFBYSxPQUFPO0FBRXZCLFNBQU87QUFDVDs7O0FDNUxBLFNBQVMsb0JBQW9CO0FBY3RCLElBQU0saUJBQWlCO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQUs1QixTQUFTO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQU1ULGFBQWE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBTWIsYUFBYTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQU9iLGdCQUFnQjtB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QUM7QUFFRCxRQUFNLFdBQVcsTUFBTSxJQUFJLFFBQXVCLENBQUNDLGFBQVk7QUFDN0QsVUFBTSxHQUFHLFNBQVNBLFFBQU87QUFBQSxFQUMzQixDQUFDO0FBRUQsVUFBUSxPQUFPLEtBQUssR0FBRyxNQUFNLFVBQVUscUJBQXFCLEVBQUUsU0FBUyxDQUFDO0FBS3hFLE1BQUk7QUFDRixVQUFNLHNCQUFzQixPQUFPLFFBQVEsUUFBUSxNQUFNO0FBQUEsRUFDM0QsU0FBUyxPQUFPO0FBQ2QsWUFBUSxPQUFPLEtBQUssd0NBQXdDLEVBQUUsT0FBTyxhQUFhLEtBQUssRUFBRSxDQUFDO0FBQUEsRUFDNUY7QUFDRjs7O0FLN01BLElBQU8sZ0JBQVE7QUFBQSxFQUNiO0FBQUEsSUFDRSxZQUFZO0FBQUEsSUFDWixhQUFhO0FBQUEsSUFDYix3QkFBd0I7QUFBQSxJQUN4QixTQUFTO0FBQUEsRUFDWDtBQUFBLEVBQ0EsT0FBTyxPQUFvQixZQUEyQjtBQUNwRCxVQUFNLGtCQUFrQixPQUFPLFNBQVM7QUFBQSxNQUN0QyxRQUFRO0FBQUEsSUFDVixDQUFDO0FBQUEsRUFDSDtBQUNGOzs7QUM1QkEsSUFBSSxDQUFDLFFBQVEsS0FBSyxTQUFTLGtCQUFrQixHQUFHO0FBQzlDLGlCQUFlLGFBQU87QUFDeEI7IiwKICAibmFtZXMiOiBbInJlc29sdmUiLCAic3Bhd24iLCAiZnMiLCAicGF0aCIsICJwYXRoIiwgInJlc29sdmUiLCAiZXhlY0ZpbGUiLCAiZnMiLCAicGF0aCIsICJwcm9taXNpZnkiLCAiZXhlY0ZpbGVBc3luYyIsICJwcm9taXNpZnkiLCAiZXhlY0ZpbGUiLCAiZXhlY0ZpbGVBc3luYyIsICJsb2dnZXIiLCAicmVzdWx0IiwgInNwYXduIiwgInJlc29sdmUiXQp9Cg==
