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
import { spawn as spawn3 } from "node:child_process";
import * as fs3 from "node:fs/promises";
import { homedir } from "node:os";
import * as path4 from "node:path";

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

// src/lib/branch-cleanup-watcher.ts
import { spawn as spawn2 } from "node:child_process";
import * as path3 from "node:path";

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

// src/lib/branch-cleanup-watcher.ts
function spawnBranchCleanupWatcher(params) {
  const selfPath = new URL(import.meta.url).pathname;
  const nodeBin = process.execPath;
  let child;
  try {
    child = spawn2(nodeBin, [selfPath, "--branch-cleanup"], {
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

// src/lib/codex-session.ts
var CODEX_PLUGIN_NAME = "codex-runtime";
var CODEX_PLUGIN_MARKETPLACE = "local";
var CODEX_RUNTIME_SKILL_NAME = "cards-runtime";
function resolveCodexPluginPath(marketplacePath) {
  return path4.join(marketplacePath, "plugins", CODEX_PLUGIN_NAME);
}
function resolveCodexHome() {
  return process.env["CODEX_HOME"] ?? path4.join(homedir(), ".codex");
}
async function readCodexPluginManifest(pluginPath) {
  const manifestPath = path4.join(pluginPath, ".codex-plugin", "plugin.json");
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
  const skillPath = path4.join(pluginPath, "skills", CODEX_RUNTIME_SKILL_NAME);
  await fs3.access(pluginPath);
  await fs3.access(skillPath);
  const manifest = await readCodexPluginManifest(pluginPath);
  const pluginVersionsPath = path4.join(
    resolveCodexHome(),
    "plugins",
    "cache",
    CODEX_PLUGIN_MARKETPLACE,
    CODEX_PLUGIN_NAME
  );
  const cachePath = path4.join(pluginVersionsPath, manifest.version);
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
  const child = spawn3("codex", args, {
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
    spawnBranchCleanupWatcher({
      cardId: input.cardId,
      repoRoot: input.repoRoot,
      apiBaseUrl: input.apiBaseUrl,
      apiAccessToken: input.apiAccessToken
    });
  } catch (error) {
    context.logger.warn("Failed to spawn branch-cleanup watcher (non-fatal)", {
      error: errorMessage(error)
    });
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vLi4vLi4vc2RrL3NyYy9jb25maWcvZmFjdG9yaWVzL2FjdGlvbi50cyIsICIuLi8uLi8uLi9zZGsvc3JjL2NvbmZpZy9lbnYudHMiLCAiLi4vLi4vLi4vc2RrL3NyYy9jb25maWcvZXhpdC1jb2Rlcy50cyIsICIuLi8uLi8uLi9zZGsvc3JjL2NvbmZpZy9sb2dnZXIudHMiLCAiLi4vLi4vLi4vc2RrL3NyYy9jb25maWcvc29ja2V0LWNsaWVudC50cyIsICIuLi8uLi8uLi9zZGsvc3JjL2NvbmZpZy9ydW50aW1lLnRzIiwgIi4uLy4uL3NyYy9saWIvY29kZXgtc2Vzc2lvbi50cyIsICIuLi8uLi8uLi9zZGsvc3JjL2NsaWVudC90eXBlcy9lcnJvcnMudHMiLCAiLi4vLi4vLi4vc2RrL3NyYy9jbGllbnQvY2FyZHNDbGllbnQudHMiLCAiLi4vLi4vc3JjL2xpYi9icmFuY2gtY2xlYW51cC13YXRjaGVyLnRzIiwgIi4uLy4uL3NyYy9saWIvY2xhdWRlLXNlc3Npb24udHMiLCAiLi4vLi4vLi4vc2RrL3NyYy93b3JrdHJlZS50cyIsICIuLi8uLi9zcmMvYWN0aW9ucy9jb2RleC50cyIsICIuLi8uLi9zcmMvYWN0aW9ucy9ob29rLXdyYXBwZXIudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbIi8qKlxuICogRmFjdG9yeSBmdW5jdGlvbiBmb3IgY3JlYXRpbmcgYWN0aW9uIGhhbmRsZXJzLlxuICpcbiAqIFRoaXMgaXMgdGhlIHByaW1hcnkgYXV0aG9yaW5nIEFQSSBmb3IgYWN0aW9uIGRldmVsb3BlcnMuIEl0IHdyYXBzIGEgaGFuZGxlclxuICogZnVuY3Rpb24gYW5kIGF0dGFjaGVzIG1ldGFkYXRhIGZvciBzZXR0aW5ncy5qc29uIGdlbmVyYXRpb24uIFRoZSBTYW1lU2hhcGVcbiAqIHV0aWxpdHkgcHJvdmlkZXMgY29tcGlsZS10aW1lIHR5cG8gZGV0ZWN0aW9uLlxuICpcbiAqXG4gKiBAc3VtbWFyeSBGYWN0b3J5IGZ1bmN0aW9uIGZvciBjcmVhdGluZyBhY3Rpb24gaGFuZGxlcnNcbiAqIEBtb2R1bGVcbiAqL1xuXG5pbXBvcnQgdHlwZSB7IEFjdGlvbkNvbW1hbmQgfSBmcm9tICcuLi9jb21tYW5kLXR5cGVzLmpzJztcbmltcG9ydCB0eXBlIHsgQWN0aW9uQ29udGV4dCwgQWN0aW9uSW5wdXQgfSBmcm9tICcuLi9pbnB1dHMuanMnO1xuaW1wb3J0IHR5cGUgeyBTYW1lU2hhcGUgfSBmcm9tICcuLi90eXBlLXV0aWxzLmpzJztcblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gQ29uZmlndXJhdGlvbiBUeXBlc1xuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4vKipcbiAqIENvbmZpZ3VyYXRpb24gZm9yIHtAbGluayBkZWZpbmVBY3Rpb259IGZhY3RvcnkuXG4gKlxuICogQWxsIGZpZWxkcyBleGNlcHQgYGFjdGlvbk5hbWVgIGFyZSBvcHRpb25hbCBhbmQgZm9yd2FyZGVkIHRvIHNldHRpbmdzLmpzb24uXG4gKiBUaGUgQ0xJIGV4dHJhY3RzIHRoaXMgbWV0YWRhdGEgdmlhIEFTVCBhbmFseXNpcywgc28gdmFsdWVzIG11c3QgYmUgc3RyaW5nXG4gKiBsaXRlcmFscyBvciBib29sZWFuL251bWJlciBsaXRlcmFscyBpbiB0aGUgc291cmNlIGNvZGUuXG4gKlxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGNvbnN0IGNvbmZpZzogQWN0aW9uQ29uZmlnID0ge1xuICogICBhY3Rpb25OYW1lOiAnTGF1bmNoIENsYXVkZScsXG4gKiAgIGRlc2NyaXB0aW9uOiAnU3RhcnQgYSBDbGF1ZGUgY29kaW5nIHNlc3Npb24nLFxuICogICBpY29uOiAnLi9pY29ucy9jbGF1ZGUuc3ZnJyxcbiAqICAgc3VwcG9ydHNCYWNrZ3JvdW5kTW9kZTogdHJ1ZSxcbiAqICAgdGltZW91dDogMzAwMDBcbiAqIH07XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBBY3Rpb25Db25maWcge1xuICAvKipcbiAgICogU3RhYmxlIGlkZW50aWZpZXIgZm9yIHRoZSBhY3Rpb24gdXNlZCBpbiB0ZWxlbWV0cnksIGxvY2FsaXphdGlvbiwgYW5kIEFQSSBsb29rdXBzLlxuICAgKlxuICAgKiBTaG91bGQgYmUgbG93ZXJjYXNlIHdpdGggaHlwaGVucyAoZS5nLiwgJ2xhdW5jaC1jbGF1ZGUnLCAncnVuLXRlc3RzJykuXG4gICAqIElmIG9taXR0ZWQsIHRoZSBDTEkgZ2VuZXJhdGVzIGFuIElEIGJ5IHNsdWdpZnlpbmcgYGFjdGlvbk5hbWVgLlxuICAgKi9cbiAgaWQ/OiBzdHJpbmc7XG5cbiAgLyoqXG4gICAqIFRoZSBhY3Rpb24gbmFtZSB1c2VkIHRvIGlkZW50aWZ5IHRoZSBhY3Rpb24gaW4gc2V0dGluZ3MuanNvbi5cbiAgICpcbiAgICogVGhpcyBuYW1lIGFwcGVhcnMgaW4gdGhlIFVJLiBLZWVwIGl0IGNvbmNpc2UgYnV0IGRlc2NyaXB0aXZlLlxuICAgKi9cbiAgYWN0aW9uTmFtZTogc3RyaW5nO1xuXG4gIC8qKlxuICAgKiBIdW1hbi1yZWFkYWJsZSBkZXNjcmlwdGlvbiBzaG93biBpbiBidXR0b24gdG9vbHRpcC5cbiAgICpcbiAgICogRXhwbGFpbiB3aGF0IHRoZSBhY3Rpb24gZG9lcyBpbiBhIGZldyB3b3Jkcy4gU2hvd24gb24gaG92ZXIgaW4gdGhlIFVJLlxuICAgKi9cbiAgZGVzY3JpcHRpb24/OiBzdHJpbmc7XG5cbiAgLyoqXG4gICAqIFBhdGggdG8gaWNvbiBmaWxlIGZvciB0aGUgYWN0aW9uIGJ1dHRvbi5cbiAgICpcbiAgICogUGF0aHMgYXJlIHJlbGF0aXZlIHRvIHRoZSBzZXR0aW5ncy5qc29uIGZpbGUgbG9jYXRpb24uXG4gICAqIFNWRyBmb3JtYXQgcmVjb21tZW5kZWQgZm9yIGNyaXNwIHJlbmRlcmluZyBhdCBhbnkgc2l6ZS5cbiAgICovXG4gIGljb24/OiBzdHJpbmc7XG5cbiAgLyoqXG4gICAqIFdoZXRoZXIgdG8gc2hvdyB0aGUgZXhlY3V0aW9uIG1vZGUgdG9nZ2xlIGluIHRoZSBVSS5cbiAgICpcbiAgICogV2hlbiB0cnVlLCB1c2VycyBjYW4gY2hvb3NlIGJldHdlZW4gaW50ZXJhY3RpdmUgYW5kIGJhY2tncm91bmQgbW9kZXMuXG4gICAqIFdoZW4gZmFsc2UgKGRlZmF1bHQpLCB0aGUgYWN0aW9uIGFsd2F5cyBydW5zIGluIGludGVyYWN0aXZlIG1vZGUuXG4gICAqL1xuICBzdXBwb3J0c0JhY2tncm91bmRNb2RlPzogYm9vbGVhbjtcblxuICAvKipcbiAgICogV2hldGhlciBtdWx0aXBsZSBpbnN0YW5jZXMgY2FuIHJ1biBzaW11bHRhbmVvdXNseSBvbiB0aGUgc2FtZSBjYXJkLlxuICAgKlxuICAgKiBXaGVuIGZhbHNlIChkZWZhdWx0KSwgc3RhcnRpbmcgdGhlIGFjdGlvbiB3aGlsZSBpdCdzIHJ1bm5pbmcgd2lsbCBiZVxuICAgKiBibG9ja2VkLiBTZXQgdG8gdHJ1ZSBmb3IgaWRlbXBvdGVudCBhY3Rpb25zIHRoYXQgY2FuIHNhZmVseSBvdmVybGFwLlxuICAgKi9cbiAgYWxsb3dDb25jdXJyZW50PzogYm9vbGVhbjtcblxuICAvKipcbiAgICogTWF4aW11bSBleGVjdXRpb24gdGltZSBpbiBtaWxsaXNlY29uZHMuXG4gICAqXG4gICAqIElmIHRoZSBhY3Rpb24gZXhjZWVkcyB0aGlzIHRpbWVvdXQsIHRoZSBydW50aW1lIHdpbGwgdGVybWluYXRlIGl0LlxuICAgKiBPbWl0IHRvIHVzZSB0aGUgcGxhdGZvcm0ncyBkZWZhdWx0IHRpbWVvdXQgcG9saWN5LlxuICAgKi9cbiAgdGltZW91dD86IG51bWJlcjtcblxuICAvKipcbiAgICogSGFuZGxlciBzb3VyY2UgZmlsZSBwYXRoLCBpbmplY3RlZCBieSB0aGUgYGluamVjdFNvdXJjZVBhdGhgIGVzYnVpbGRcbiAgICogcGx1Z2luIGR1cmluZyBjb25maWcgbG9hZGluZy4gRG8gbm90IHNldCBtYW51YWxseS5cbiAgICpcbiAgICogQGludGVybmFsXG4gICAqL1xuICBzb3VyY2VQYXRoPzogc3RyaW5nO1xufVxuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBIYW5kbGVyIFR5cGVzXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbi8qKlxuICogSGFuZGxlciBmdW5jdGlvbiBzaWduYXR1cmUgZm9yIGFjdGlvbiBldmVudHMuXG4gKlxuICogVGhyb3dpbmcgYW4gZXJyb3Igc2lnbmFscyBhY3Rpb24gZmFpbHVyZS4gVGhlIGVycm9yIG1lc3NhZ2UgaXMgbG9nZ2VkIGFuZFxuICogc3VyZmFjZWQgdG8gdGhlIHVzZXIuIEZvciBleHBlY3RlZCBlcnJvcnMsIHRocm93IHdpdGggYSBkZXNjcmlwdGl2ZSBtZXNzYWdlLlxuICpcbiAqIEBwYXJhbSBpbnB1dCAtIEFjdGlvbiBpbnB1dCBwYXlsb2FkIGZyb20gZW52aXJvbm1lbnQgdmFyaWFibGVzXG4gKiBAcGFyYW0gY29udGV4dCAtIFJ1bnRpbWUgY29udGV4dCB3aXRoIGxvZ2dlciwgY3dkLCBhbmQgY2FsbGJhY2sgbWV0aG9kc1xuICogQHJldHVybnMgUHJvbWlzZSB0aGF0IHJlc29sdmVzIHdoZW4gdGhlIGFjdGlvbiBjb21wbGV0ZXNcbiAqXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogY29uc3QgaGFuZGxlcjogQWN0aW9uSGFuZGxlciA9IGFzeW5jIChpbnB1dCwgeyBsb2dnZXIsIG9uQ2FuY2VsIH0pID0+IHtcbiAqICAgb25DYW5jZWwoKCkgPT4ge1xuICogICAgIGxvZ2dlci5pbmZvKCdDYW5jZWxsaW5nIGFjdGlvbicpO1xuICogICB9KTtcbiAqXG4gKiAgIHRyeSB7XG4gKiAgICAgbG9nZ2VyLmluZm8oJ1N0YXJ0aW5nIGFjdGlvbicsIHsgY2FyZElkOiBpbnB1dC5jYXJkSWQgfSk7XG4gKiAgICAgYXdhaXQgcGVyZm9ybUFjdGlvbihpbnB1dCk7XG4gKiAgICAgbG9nZ2VyLmluZm8oJ0FjdGlvbiBjb21wbGV0ZWQgc3VjY2Vzc2Z1bGx5Jyk7XG4gKiAgIH0gY2F0Y2ggKGVycikge1xuICogICAgIGxvZ2dlci5sb2dFcnJvcihlcnIsICdBY3Rpb24gZmFpbGVkJyk7XG4gKiAgICAgdGhyb3cgZXJyOyAvLyBSZS10aHJvdyB0byBzaWduYWwgZmFpbHVyZVxuICogICB9XG4gKiB9O1xuICogYGBgXG4gKi9cbmV4cG9ydCB0eXBlIEFjdGlvbkhhbmRsZXIgPSAoaW5wdXQ6IEFjdGlvbklucHV0LCBjb250ZXh0OiBBY3Rpb25Db250ZXh0KSA9PiB2b2lkIHwgUHJvbWlzZTx2b2lkPjtcblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gRmFjdG9yeSBGdW5jdGlvblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4vKipcbiAqIENyZWF0ZXMgYW4gYWN0aW9uIGhhbmRsZXIgd2l0aCBtZXRhZGF0YSBmb3Igc2V0dGluZ3MuanNvbiBnZW5lcmF0aW9uLlxuICpcbiAqIFRoaXMgZmFjdG9yeSB3cmFwcyB5b3VyIGhhbmRsZXIgZnVuY3Rpb24gYW5kIGF0dGFjaGVzIG1ldGFkYXRhIHRoYXQgdGhlIENMSVxuICogZXh0cmFjdHMgd2hlbiBidWlsZGluZyBzZXR0aW5ncy5qc29uLiBUaGUgcmV0dXJuZWQgY29tbWFuZCBpcyBib3RoIGNhbGxhYmxlXG4gKiAoZm9yIHRoZSBydW50aW1lKSBhbmQgaW5zcGVjdGFibGUgKGZvciB0aGUgQ0xJKS5cbiAqXG4gKiBUaGUgZ2VuZXJpYyBwYXJhbWV0ZXIgcHJlc2VydmVzIHRoZSBhY3Rpb24gbmFtZSBhcyBhIGxpdGVyYWwgdHlwZS5cbiAqXG4gKiBAdGVtcGxhdGUgVCAtIFRoZSBjb25maWcgdHlwZSBleHRlbmRpbmcgQWN0aW9uQ29uZmlnXG4gKiBAcGFyYW0gY29uZmlnIC0gQWN0aW9uIG1ldGFkYXRhICh1c2VzIFNhbWVTaGFwZSB0byBjYXRjaCB0eXBvcylcbiAqIEBwYXJhbSBoYW5kbGVyIC0gQXN5bmMgZnVuY3Rpb24gdGhhdCBpbXBsZW1lbnRzIHRoZSBhY3Rpb24gbG9naWNcbiAqIEByZXR1cm5zIEEgY2FsbGFibGUgY29tbWFuZCB3aXRoIGF0dGFjaGVkIG1ldGFkYXRhXG4gKlxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIC8vIEJhc2ljIHVzYWdlXG4gKiBleHBvcnQgZGVmYXVsdCBkZWZpbmVBY3Rpb24oXG4gKiAgIHsgYWN0aW9uTmFtZTogJ0xhdW5jaCBDbGF1ZGUnIH0sXG4gKiAgIGFzeW5jIChpbnB1dCwgeyBsb2dnZXIgfSkgPT4ge1xuICogICAgIGxvZ2dlci5pbmZvKCdMYXVuY2hpbmcgQ2xhdWRlJywgeyBjYXJkSWQ6IGlucHV0LmNhcmRJZCB9KTtcbiAqICAgICBhd2FpdCBzcGF3bkNsYXVkZShpbnB1dCk7XG4gKiAgIH1cbiAqICk7XG4gKiBgYGBcbiAqXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogLy8gV2l0aCBmdWxsIGNvbmZpZ3VyYXRpb25cbiAqIGV4cG9ydCBkZWZhdWx0IGRlZmluZUFjdGlvbihcbiAqICAge1xuICogICAgIGFjdGlvbk5hbWU6ICdEZXBsb3kgQXBwbGljYXRpb24nLFxuICogICAgIGRlc2NyaXB0aW9uOiAnRGVwbG95IHRvIHByb2R1Y3Rpb24nLFxuICogICAgIGljb246ICcuL2ljb25zL2RlcGxveS5zdmcnLFxuICogICAgIHN1cHBvcnRzQmFja2dyb3VuZE1vZGU6IHRydWUsXG4gKiAgICAgYWxsb3dDb25jdXJyZW50OiBmYWxzZSxcbiAqICAgICB0aW1lb3V0OiA2MDAwMFxuICogICB9LFxuICogICBhc3luYyAoaW5wdXQsIGNvbnRleHQpID0+IHtcbiAqICAgICBjb250ZXh0Lm9uQ2FuY2VsKCgpID0+IGNsZWFudXAoKSk7XG4gKiAgICAgYXdhaXQgZGVwbG95KGlucHV0LCBjb250ZXh0KTtcbiAqICAgfVxuICogKTtcbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gZGVmaW5lQWN0aW9uPFQgZXh0ZW5kcyBBY3Rpb25Db25maWc+KFxuICBjb25maWc6IFNhbWVTaGFwZTxBY3Rpb25Db25maWcsIFQ+LFxuICBoYW5kbGVyOiBBY3Rpb25IYW5kbGVyXG4pOiBBY3Rpb25Db21tYW5kPFRbJ2FjdGlvbk5hbWUnXT4ge1xuICBjb25zdCBmbiA9IGFzeW5jIChpbnB1dDogQWN0aW9uSW5wdXQsIGNvbnRleHQ6IEFjdGlvbkNvbnRleHQpOiBQcm9taXNlPHZvaWQ+ID0+IHtcbiAgICBhd2FpdCBoYW5kbGVyKGlucHV0LCBjb250ZXh0KTtcbiAgfTtcblxuICBmbi5mYWN0b3J5VHlwZSA9ICdhY3Rpb24nIGFzIGNvbnN0O1xuICBmbi5pZCA9IGNvbmZpZy5pZDtcbiAgZm4uYWN0aW9uTmFtZSA9IGNvbmZpZy5hY3Rpb25OYW1lO1xuICBmbi5kZXNjcmlwdGlvbiA9IGNvbmZpZy5kZXNjcmlwdGlvbjtcbiAgZm4uaWNvbiA9IGNvbmZpZy5pY29uO1xuICBmbi5zdXBwb3J0c0JhY2tncm91bmRNb2RlID0gY29uZmlnLnN1cHBvcnRzQmFja2dyb3VuZE1vZGU7XG4gIGZuLmFsbG93Q29uY3VycmVudCA9IGNvbmZpZy5hbGxvd0NvbmN1cnJlbnQ7XG4gIGZuLnRpbWVvdXQgPSBjb25maWcudGltZW91dDtcbiAgZm4uc291cmNlUGF0aCA9IGNvbmZpZy5zb3VyY2VQYXRoO1xuXG4gIHJldHVybiBmbiBhcyBBY3Rpb25Db21tYW5kPFRbJ2FjdGlvbk5hbWUnXT47XG59XG4iLCAiLyoqXG4gKiBFbnZpcm9ubWVudCB2YXJpYWJsZSB1dGlsaXRpZXMgZm9yIENhcmRzIEV4dGVuc2lvbiBhY3Rpb25zIGFuZCB0eXBlIGhvb2tzLlxuICpcbiAqIFRoZSBleGVjdXRpb24gd3JhcHBlciBpbmplY3RzIGFjdGlvbiBhbmQgdHlwZSBob29rIGlucHV0cyB2aWEgcHJvY2Vzcy5lbnYuXG4gKiBUaGlzIG1vZHVsZSBwcm92aWRlcyBzdHJpY3QgZ2V0dGVycyBhbmQgdHlwZWQgZXh0cmFjdG9ycyBzbyBoYW5kbGVycyBkbyBub3RcbiAqIG5lZWQgdG8gcGFyc2UgZW52aXJvbm1lbnQgdmFyaWFibGVzIG1hbnVhbGx5LlxuICpcbiAqIFVzZSB0aGUgaW5kaXZpZHVhbCBnZXR0ZXJzIHdoZW4geW91IG9ubHkgbmVlZCBvbmUgdmFsdWU7IHVzZVxuICoge0BsaW5rIGV4dHJhY3RBY3Rpb25JbnB1dH0gb3Ige0BsaW5rIGV4dHJhY3RUeXBlSW5wdXR9IHdoZW4geW91IG5lZWQgYSBmdWxsXG4gKiB0eXBlZCBwYXlsb2FkIGZvciBhbiBhY3Rpb24gb3IgdHlwZSBob29rLlxuICpcbiAqXG4gKiBAc3VtbWFyeSBFbnZpcm9ubWVudCB2YXJpYWJsZSB1dGlsaXRpZXMgZm9yIENhcmRzIEV4dGVuc2lvbiBhY3Rpb25zIGFuZCB0eXBlIGhvb2tzXG4gKiBAbW9kdWxlXG4gKi9cblxuaW1wb3J0IHsgcmVhZEZpbGVTeW5jIH0gZnJvbSAnbm9kZTpmcyc7XG5pbXBvcnQgdHlwZSB7IEFjdGlvbklucHV0LCBUeXBlSG9va0lucHV0IH0gZnJvbSAnLi9pbnB1dHMuanMnO1xuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBDb25zdGFudHNcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuLyoqXG4gKiBFbnZpcm9ubWVudCB2YXJpYWJsZSBuYW1lcyBzZXQgYnkgdGhlIENhcmRzIGV4ZWN1dGlvbiB3cmFwcGVyLlxuICpcbiAqIFRoaXMgaXMgdGhlIHNpbmdsZSBzb3VyY2Ugb2YgdHJ1dGggZm9yIGVudiB2YXIga2V5cyB1c2VkIGJ5IGFjdGlvbiBhbmQgdHlwZVxuICogaG9vayBwcm9jZXNzZXMuIEtlZXAgaXQgaW4gc3luYyB3aXRoIHRoZSB3cmFwcGVyIHRvIGF2b2lkIHN1YnRsZSBcInVuZGVmaW5lZFxuICogaW5wdXRcIiBidWdzLlxuICovXG5leHBvcnQgY29uc3QgQ0FSRFNfRU5WX1ZBUlMgPSB7XG4gIC8qKlxuICAgKiBVbmlxdWUgaWRlbnRpZmllciBmb3IgdGhlIGN1cnJlbnQgY2FyZC5cbiAgICogQXZhaWxhYmxlIGluIGFsbCBhY3Rpb25zIGFuZCB0eXBlIGhvb2tzLlxuICAgKi9cbiAgQ0FSRF9JRDogJ0NBUkRfSUQnLFxuXG4gIC8qKlxuICAgKiBUaGUgZW52aXJvbm1lbnQgbmFtZSBmcm9tIHNldHRpbmdzLmpzb24uXG4gICAqIEF2YWlsYWJsZSBpbiBhbGwgYWN0aW9ucyBhbmQgdHlwZSBob29rcy5cbiAgICovXG4gIEVOVklST05NRU5UOiAnRU5WSVJPTk1FTlQnLFxuXG4gIC8qKlxuICAgKiBEaXNwbGF5IG5hbWUgb2YgdGhlIGFjdGlvbiBidXR0b24gdGhhdCB0cmlnZ2VyZWQgdGhpcyBoYW5kbGVyLlxuICAgKiBBdmFpbGFibGUgaW4gYWN0aW9ucyBvbmx5IChub3QgdHlwZSBob29rcykuXG4gICAqL1xuICBBQ1RJT05fTkFNRTogJ0FDVElPTl9OQU1FJyxcblxuICAvKipcbiAgICogQ2FyZCdzIGV4ZWN1dGlvbiBtb2RlLCBkZXRlcm1pbmluZyBVSSBpbnRlcmFjdGlvbiBtb2RlbC5cbiAgICogQXZhaWxhYmxlIGluIGFjdGlvbnMgb25seSAobm90IHR5cGUgaG9va3MpLlxuICAgKiBWYWxpZCB2YWx1ZXM6ICdpbnRlcmFjdGl2ZScgfCAnYmFja2dyb3VuZCdcbiAgICovXG4gIEVYRUNVVElPTl9NT0RFOiAnRVhFQ1VUSU9OX01PREUnLFxuXG4gIC8qKlxuICAgKiBDYXJkcyBzZXJ2ZXIgYmFzZSBVUkwgZm9yIEFQSSBjYWxscy5cbiAgICogQXZhaWxhYmxlIGluIGFsbCBhY3Rpb25zIGFuZCB0eXBlIGhvb2tzLlxuICAgKi9cbiAgQVBJX0JBU0VfVVJMOiAnQVBJX0JBU0VfVVJMJyxcblxuICAvKipcbiAgICogQXV0aGVudGljYXRpb24gdG9rZW4gZm9yIEFQSSBjYWxscy5cbiAgICogQXZhaWxhYmxlIGluIGFsbCBhY3Rpb25zIGFuZCB0eXBlIGhvb2tzLlxuICAgKi9cbiAgQVBJX0FDQ0VTU19UT0tFTjogJ0FQSV9BQ0NFU1NfVE9LRU4nLFxuXG4gIC8qKlxuICAgKiBDb25maWd1cmVkIGNvZGluZyBhZ2VudCBpZGVudGlmaWVyIGZyb20gY2FyZHMuY29kaW5nQWdlbnQgc2V0dGluZy5cbiAgICogQXZhaWxhYmxlIGluIGFjdGlvbnMgb25seSAobm90IHR5cGUgaG9va3MpLlxuICAgKiBPcHRpb25hbC5cbiAgICovXG4gIENPRElOR19BR0VOVDogJ0NPRElOR19BR0VOVCcsXG5cbiAgLyoqXG4gICAqIFRoZSByZWdpc3RlcmVkIHR5cGUgbmFtZS5cbiAgICogQXZhaWxhYmxlIGluIHR5cGUgaG9va3Mgb25seS5cbiAgICovXG4gIFRZUEVfTkFNRTogJ1RZUEVfTkFNRScsXG5cbiAgLyoqXG4gICAqIFRoZSB0eXBlJ3MgdmVyc2lvbiBzdHJpbmcgZnJvbSBzZXR0aW5ncy5qc29uIGNvbmZpZ3VyYXRpb24uXG4gICAqIEF2YWlsYWJsZSBpbiB0eXBlIGhvb2tzIG9ubHkuXG4gICAqL1xuICBUWVBFX1ZFUlNJT046ICdUWVBFX1ZFUlNJT04nLFxuXG4gIC8qKlxuICAgKiBUaGUgZmlsZSBuYW1lIHdpdGhpbiB0aGUgdHlwZSBkaXJlY3RvcnkuXG4gICAqIEF2YWlsYWJsZSBpbiB0eXBlIGhvb2tzIG9ubHkuXG4gICAqL1xuICBGSUxFX05BTUU6ICdGSUxFX05BTUUnLFxuXG4gIC8qKlxuICAgKiBGdWxsIHBhdGggdG8gdGhlIGZpbGUuXG4gICAqIEF2YWlsYWJsZSBpbiB0eXBlIGhvb2tzIG9ubHkuXG4gICAqL1xuICBGSUxFX1BBVEg6ICdGSUxFX1BBVEgnLFxuXG4gIC8qKlxuICAgKiBGaWxlIHNpemUgaW4gYnl0ZXMuXG4gICAqIEF2YWlsYWJsZSBpbiB0eXBlIGhvb2tzIG9ubHkuXG4gICAqL1xuICBGSUxFX1NJWkU6ICdGSUxFX1NJWkUnLFxuXG4gIC8qKlxuICAgKiBTSEEyNTYgaGFzaCBvZiBjb250ZW50LlxuICAgKiBBdmFpbGFibGUgaW4gdHlwZSBob29rcyBvbmx5LlxuICAgKi9cbiAgU0hBMjU2OiAnU0hBMjU2JyxcblxuICAvKipcbiAgICogTUlNRSB0eXBlIG9mIHRoZSBjb250ZW50LlxuICAgKiBBdmFpbGFibGUgaW4gdHlwZSBob29rcyBvbmx5LlxuICAgKi9cbiAgQ09OVEVOVF9UWVBFOiAnQ09OVEVOVF9UWVBFJyxcblxuICAvKipcbiAgICogUGF0aCB0byB0aGUgVlMgQ29kZSBidW5kbGVkIE5vZGUuanMgaW50ZXJwcmV0ZXIuXG4gICAqXG4gICAqIFNldCBieSB0aGUgZXh0ZW5zaW9uIGhvc3QgZnJvbSBgcHJvY2Vzcy5leGVjUGF0aGAgKHdpdGhcbiAgICogYEVMRUNUUk9OX1JVTl9BU19OT0RFPTFgKS4gQ29tbWFuZHMgaW4gc2V0dGluZ3MuanNvbiB1c2VcbiAgICogYCRWU0NPREVfTk9ERSAuL2Jpbi8uLi5gIHNvIHRoZXkgd29yayByZWdhcmRsZXNzIG9mXG4gICAqIHdoZXRoZXIgYG5vZGVgIGlzIG9uIHRoZSBzeXN0ZW0gUEFUSC5cbiAgICpcbiAgICogQXZhaWxhYmxlIGluIGFsbCBhY3Rpb25zIGFuZCB0eXBlIGhvb2tzLlxuICAgKi9cbiAgVlNDT0RFX05PREU6ICdWU0NPREVfTk9ERScsXG5cbiAgLyoqXG4gICAqIFBhdGggdG8gdGhlIE5vZGUuanMgaW50ZXJwcmV0ZXIgcnVubmluZyB0aGUgd3JhcHBlciBwcm9jZXNzLlxuICAgKlxuICAgKiBTZXQgYnkgdGhlIHdyYXBwZXIgZnJvbSBgcHJvY2Vzcy5leGVjUGF0aGAuIFVzZSBgJE5PREVgIGluIGVtYmVkZGVkXG4gICAqIGJhc2ggc3RhdGVtZW50cyB0byBpbnZva2UgTm9kZSBzY3JpcHRzIHBvcnRhYmx5LlxuICAgKlxuICAgKiBBdmFpbGFibGUgaW4gYWxsIGFjdGlvbnMuXG4gICAqL1xuICBOT0RFOiAnTk9ERScsXG5cbiAgLyoqXG4gICAqIFBhdGggdG8gdGhlIFVuaXggZG9tYWluIHNvY2tldCBmb3IgcnVudGltZS10by1kaXNwYXRjaGVyIGNvbW11bmljYXRpb24uXG4gICAqIEF2YWlsYWJsZSBpbiBhY3Rpb25zIG9ubHkuXG4gICAqL1xuICBTT0NLRVRfUEFUSDogJ1NPQ0tFVF9QQVRIJyxcblxuICAvKipcbiAgICogUGF0aCB0byBhIEpTT04gZmlsZSBjb250YWluaW5nIHN3aXRjaFRvSW50ZXJhY3RpdmUgZGF0YSBmcm9tIGEgcHJldmlvdXMgaGFuZGxlci5cbiAgICogQXZhaWxhYmxlIGluIGFjdGlvbnMgb25seS4gT3B0aW9uYWwuXG4gICAqL1xuICBTV0lUQ0hfVE9fSU5URVJBQ1RJVkVfREFUQV9QQVRIOiAnU1dJVENIX1RPX0lOVEVSQUNUSVZFX0RBVEFfUEFUSCcsXG5cbiAgLyoqXG4gICAqIFBhdGggdG8gdGhlIHNldHRpbmdzIGNvbmZpZ3VyYXRpb24gZGlyZWN0b3J5LlxuICAgKiBBdmFpbGFibGUgaW4gYWN0aW9ucyBvbmx5LlxuICAgKi9cbiAgQ09ORklHX1BBVEg6ICdDT05GSUdfUEFUSCcsXG5cbiAgLyoqXG4gICAqIFBhdGggdG8gdGhlIFZTIENvZGUgd29ya3NwYWNlIHJvb3QgZGlyZWN0b3J5LlxuICAgKiBTZXQgYnkgdGhlIGFjdGlvbiBoYW5kbGVyIChlLmcuLCBsYXVuY2gudHMpIHRvIHRoZSB3b3JrdHJlZSBwYXRoLlxuICAgKiBBdmFpbGFibGUgaW4gaG9va3MgcnVubmluZyBpbnNpZGUgdGhlIGNsYXVkZSBDTEkuXG4gICAqL1xuICBXT1JLU1BBQ0VfUEFUSDogJ1dPUktTUEFDRV9QQVRIJyxcblxuICAvKipcbiAgICogQWJzb2x1dGUgcGF0aCB0byB0aGUgbWFpbiBnaXQgcmVwb3NpdG9yeSByb290IChOT1QgYSB3b3JrdHJlZSkuXG4gICAqIFNldCBieSBBY3Rpb25EaXNwYXRjaGVyOyBjb25zdW1lZCBieSB0aGUgd3JhcHBlciBhbmQgd2F0Y2hlciBmb3JcbiAgICogZ2l0IG9wZXJhdGlvbnMgKHdvcmt0cmVlIHJlbW92YWwsIGJyYW5jaCBkZWxldGlvbikgdGhhdCBtdXN0IHJ1blxuICAgKiBhZ2FpbnN0IHRoZSBtYWluIHJlcG9zaXRvcnkuXG4gICAqL1xuICBSRVBPX1JPT1Q6ICdSRVBPX1JPT1QnLFxuXG4gIC8qKlxuICAgKiBQYXRoIHRvIHRoZSBjYXJkJ3MgcmVwb3NpdG9yeSBkaXJlY3RvcnkuXG4gICAqIEF2YWlsYWJsZSBpbiBhY3Rpb25zIG9ubHkuXG4gICAqL1xuICBDQVJEX1JFUE9fUEFUSDogJ0NBUkRfUkVQT19QQVRIJyxcblxuICAvKipcbiAgICogUmVzb2x2ZWQgc2hlbGwgY29tbWFuZCBmb3IgdGhlIHdyYXBwZXIgdG8gc3Bhd24gYXMgdGhlIGFjdGlvbiBoYW5kbGVyLlxuICAgKiBTZXQgYnkgQWN0aW9uRGlzcGF0Y2hlcjsgY29uc3VtZWQgYnkgdGhlIHdyYXBwZXIgKG5vdCBieSBhY3Rpb24gaGFuZGxlcnMpLlxuICAgKi9cbiAgQUNUSU9OX0NPTU1BTkQ6ICdBQ1RJT05fQ09NTUFORCcsXG5cbiAgLyoqXG4gICAqIEdpdCBicmFuY2ggdGhhdCB0aGUgY2FyZCdzIHdvcmtzcGFjZSBicmFuY2ggd2lsbCBtZXJnZSBpbnRvLlxuICAgKiBSZXNvbHZlZCBmcm9tIHRoZSB3b3Jrc3BhY2UgSEVBRCBhdCBsYXVuY2ggdGltZS5cbiAgICogU2V0IGJ5IHRoZSBsYXVuY2ggYWN0aW9uLlxuICAgKiBBdmFpbGFibGUgaW4gYWN0aW9ucyBvbmx5LlxuICAgKi9cbiAgQkFTRV9CUkFOQ0g6ICdCQVNFX0JSQU5DSCcsXG5cbiAgLyoqXG4gICAqIEdpdCBicmFuY2ggZnJvbSB3aGljaCB0aGUgY2FyZCdzIHdvcmtzcGFjZSBicmFuY2ggd2FzIGNyZWF0ZWQuXG4gICAqIE1heSBkaWZmZXIgZnJvbSBCQVNFX0JSQU5DSCB3aGVuIHRoZSB3b3JrdHJlZSB3YXMgY3JlYXRlZCBhZ2FpbnN0XG4gICAqIGEgZGlmZmVyZW50IHJlZiB0aGFuIHRoZSBjdXJyZW50IHdvcmtzcGFjZSBIRUFELlxuICAgKiBTZXQgYnkgdGhlIGxhdW5jaCBhY3Rpb24uXG4gICAqIEF2YWlsYWJsZSBpbiBhY3Rpb25zIG9ubHkuXG4gICAqL1xuICBQQVJFTlRfQlJBTkNIOiAnUEFSRU5UX0JSQU5DSCcsXG5cbiAgLyoqXG4gICAqIEdpdCBicmFuY2ggbmFtZSBmb3IgdGhlIGNhcmQncyB3b3Jrc3BhY2UgaW1wbGVtZW50YXRpb24uXG4gICAqIFNldCBieSB0aGUgbGF1bmNoIGFjdGlvbiBhZnRlciByZXNvbHZpbmcgb3IgY3JlYXRpbmcgdGhlIHdvcmt0cmVlLlxuICAgKiBBdmFpbGFibGUgaW4gYWN0aW9ucyBvbmx5LlxuICAgKi9cbiAgV09SS1NQQUNFX0JSQU5DSDogJ1dPUktTUEFDRV9CUkFOQ0gnLFxuXG4gIC8qKlxuICAgKiBTZXNzaW9uIElEIHBlcnNpc3RlZCBieSB0aGUgc2Vzc2lvbi1zdGFydCBob29rIHZpYSBgcGVyc2lzdEVudlZhcmAuXG4gICAqXG4gICAqIEF2YWlsYWJsZSBpbiBCYXNoIHRvb2wgc2hlbGwgZGVzY2VuZGFudHMgKGNvbW1hbmRzLCBnaXQgaG9va3MpIGFmdGVyXG4gICAqIHNlc3Npb24gc3RhcnQuIE5PVCBhdmFpbGFibGUgaW4gaG9va3Mgc3Bhd25lZCBkaXJlY3RseSBieSBDbGF1ZGUgQ29kZVxuICAgKiAoc3RvcCwgc2Vzc2lvbi1lbmQsIGV0Yy4pIFx1MjAxNCB0aG9zZSByZWNlaXZlIHRoZSBzZXNzaW9uIElEIHZpYSBob29rIGlucHV0LlxuICAgKlxuICAgKiBUaGUgY2FyZC1yZXBvIHBvc3QtY29tbWl0IGhvb2sgcmVhZHMgdGhpcyB0byByZWNvcmQgY29tbWl0cyBkaXJlY3RseVxuICAgKiB3aXRob3V0IG5lZWRpbmcgYSBwcm9jZXNzLXRyZWUgd2FsayBvciBQSUQgcmVnaXN0cnkgbG9va3VwLlxuICAgKi9cbiAgQ0FSRFNfU0VTU0lPTl9JRDogJ0NBUkRTX1NFU1NJT05fSUQnLFxuXG4gIC8qKlxuICAgKiBBYnNvbHV0ZSBwYXRoIHRvIHRoZSBWUyBDb2RlIGV4dGVuc2lvbiBpbnN0YWxsYXRpb24gZGlyZWN0b3J5LlxuICAgKlxuICAgKiBTZXQgYnkgdGhlIGV4dGVuc2lvbiBob3N0IGZyb20gYGNvbnRleHQuZXh0ZW5zaW9uVXJpLmZzUGF0aGAgYW5kIGluamVjdGVkXG4gICAqIGludG8gYWxsIHNwYXduZWQgYWN0aW9uIHByb2Nlc3Nlcy4gVXNlIHRoaXMgdG8gbG9jYXRlIGJ1bmRsZWQgYXNzZXRzIHN1Y2hcbiAgICogYXMgdGhlIHJ1bnRpbWUgcGx1Z2luIGRpcmVjdG9yeSAoYDxleHRlbnNpb25QYXRoPi9kaXN0L3BsdWdpbnMvcnVudGltZWApLlxuICAgKlxuICAgKiBBdmFpbGFibGUgaW4gYWN0aW9ucyBvbmx5IChub3QgdHlwZSBob29rcykuXG4gICAqL1xuICBFWFRFTlNJT05fUEFUSDogJ0VYVEVOU0lPTl9QQVRIJyxcblxuICAvKipcbiAgICogQWJzb2x1dGUgcGF0aCB0byB0aGUgQ2FyZHMgaG9va3MgbG9nIGZpbGUuXG4gICAqXG4gICAqIFNldCBieSBBY3Rpb25EaXNwYXRjaGVyIGF0IHJ1bnRpbWUuIFJlYWQgYnkgdGhlIExvZ2dlciBzaW5nbGV0b25cbiAgICogYXQgY29uc3RydWN0aW9uIHRpbWUgdG8gZGV0ZXJtaW5lIHdoZXJlIGhvb2sgZXhlY3V0aW9uIGxvZ3MgYXJlIHdyaXR0ZW4uXG4gICAqXG4gICAqIEF2YWlsYWJsZSBpbiBhbGwgYWN0aW9ucyBhbmQgdHlwZSBob29rcy5cbiAgICovXG4gIEhPT0tTX0xPR19GSUxFOiAnQ0FSRFNfSE9PS1NfTE9HX0ZJTEUnXG59IGFzIGNvbnN0O1xuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBJbmRpdmlkdWFsIEdldHRlcnNcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuLyoqXG4gKiBSZWFkcyB0aGUgY2FyZCBpZGVudGlmaWVyIGZyb20gdGhlIGVudmlyb25tZW50LlxuICpcbiAqIFRoZSBleGVjdXRpb24gd3JhcHBlciBhbHdheXMgc2V0cyB0aGlzIGZvciBldmVyeSBhY3Rpb24gYW5kIHR5cGUgaG9vay5cbiAqIEByZXR1cm5zIFRoZSBjdXJyZW50IGNhcmQgSURcbiAqIEB0aHJvd3MgRXJyb3IgaWYgQ0FSRF9JRCBpcyBtaXNzaW5nIG9yIGVtcHR5XG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogY29uc3QgY2FyZElkID0gZ2V0Q2FyZElkKCk7XG4gKiBjb25zb2xlLmxvZyhgUHJvY2Vzc2luZyBjYXJkOiAke2NhcmRJZH1gKTtcbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0Q2FyZElkKCk6IHN0cmluZyB7XG4gIGNvbnN0IHZhbHVlID0gcHJvY2Vzcy5lbnZbQ0FSRFNfRU5WX1ZBUlMuQ0FSRF9JRF07XG4gIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IHZhbHVlID09PSAnJykge1xuICAgIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyByZXF1aXJlZCBlbnZpcm9ubWVudCB2YXJpYWJsZTogJHtDQVJEU19FTlZfVkFSUy5DQVJEX0lEfWApO1xuICB9XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuLyoqXG4gKiBSZWFkcyB0aGUgZW52aXJvbm1lbnQgbmFtZSBmcm9tIHRoZSBlbnZpcm9ubWVudC5cbiAqXG4gKiBUaGlzIHZhbHVlIG1hdGNoZXMgdGhlIGVudmlyb25tZW50IGtleSBpbiBzZXR0aW5ncy5qc29uIChlLmcuLCBcImRlZmF1bHRcIiwgXCJzdGFnaW5nXCIpLlxuICogQHJldHVybnMgVGhlIGVudmlyb25tZW50IG5hbWVcbiAqIEB0aHJvd3MgRXJyb3IgaWYgRU5WSVJPTk1FTlQgaXMgbWlzc2luZyBvciBlbXB0eVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGNvbnN0IGVudmlyb25tZW50ID0gZ2V0RW52aXJvbm1lbnQoKTtcbiAqIGNvbnNvbGUubG9nKGBFbnZpcm9ubWVudDogJHtlbnZpcm9ubWVudH1gKTtcbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0RW52aXJvbm1lbnQoKTogc3RyaW5nIHtcbiAgY29uc3QgdmFsdWUgPSBwcm9jZXNzLmVudltDQVJEU19FTlZfVkFSUy5FTlZJUk9OTUVOVF07XG4gIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IHZhbHVlID09PSAnJykge1xuICAgIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyByZXF1aXJlZCBlbnZpcm9ubWVudCB2YXJpYWJsZTogJHtDQVJEU19FTlZfVkFSUy5FTlZJUk9OTUVOVH1gKTtcbiAgfVxuICByZXR1cm4gdmFsdWU7XG59XG5cbi8qKlxuICogUmVhZHMgdGhlIGFjdGlvbiBidXR0b24gbmFtZSBmcm9tIHRoZSBlbnZpcm9ubWVudC5cbiAqXG4gKiBUaGlzIGlzIHRoZSBkaXNwbGF5IG5hbWUgb2YgdGhlIGFjdGlvbiB0aGF0IHRyaWdnZXJlZCB0aGUgaGFuZGxlciwgbWF0Y2hpbmdcbiAqIHRoZSBgYWN0aW9uTmFtZWAgZmllbGQgZnJvbSBgZGVmaW5lQWN0aW9uYC5cbiAqIEByZXR1cm5zIERpc3BsYXkgbmFtZSBvZiB0aGUgYWN0aW9uIHRoYXQgdHJpZ2dlcmVkIHRoZSBjdXJyZW50IGhhbmRsZXIgcnVuLlxuICogQHRocm93cyBFcnJvciBpZiBBQ1RJT05fTkFNRSBpcyBtaXNzaW5nIG9yIGVtcHR5XG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogY29uc3QgYWN0aW9uTmFtZSA9IGdldEFjdGlvbk5hbWUoKTtcbiAqIGNvbnNvbGUubG9nKGBSdW5uaW5nIGFjdGlvbjogJHthY3Rpb25OYW1lfWApO1xuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRBY3Rpb25OYW1lKCk6IHN0cmluZyB7XG4gIGNvbnN0IHZhbHVlID0gcHJvY2Vzcy5lbnZbQ0FSRFNfRU5WX1ZBUlMuQUNUSU9OX05BTUVdO1xuICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gJycpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYE1pc3NpbmcgcmVxdWlyZWQgZW52aXJvbm1lbnQgdmFyaWFibGU6ICR7Q0FSRFNfRU5WX1ZBUlMuQUNUSU9OX05BTUV9YCk7XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG4vKipcbiAqIFJlYWRzIHRoZSBleGVjdXRpb24gbW9kZSBmcm9tIHRoZSBlbnZpcm9ubWVudC5cbiAqXG4gKiBEZXRlcm1pbmVzIHRoZSBVSSBpbnRlcmFjdGlvbiBtb2RlbCBmb3IgYWN0aW9ucy5cbiAqIEByZXR1cm5zIFRoZSBleGVjdXRpb24gbW9kZSAoJ2ludGVyYWN0aXZlJyBvciAnYmFja2dyb3VuZCcpXG4gKiBAdGhyb3dzIEVycm9yIGlmIEVYRUNVVElPTl9NT0RFIGlzIG1pc3NpbmcsIGVtcHR5LCBvciBpbnZhbGlkXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogY29uc3QgbW9kZSA9IGdldEV4ZWN1dGlvbk1vZGUoKTtcbiAqIGlmIChtb2RlID09PSAnaW50ZXJhY3RpdmUnKSB7XG4gKiAgIC8vIFNob3cgdXNlciBwcm9tcHRzXG4gKiB9XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldEV4ZWN1dGlvbk1vZGUoKTogJ2ludGVyYWN0aXZlJyB8ICdiYWNrZ3JvdW5kJyB7XG4gIGNvbnN0IHZhbHVlID0gcHJvY2Vzcy5lbnZbQ0FSRFNfRU5WX1ZBUlMuRVhFQ1VUSU9OX01PREVdO1xuICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gJycpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYE1pc3NpbmcgcmVxdWlyZWQgZW52aXJvbm1lbnQgdmFyaWFibGU6ICR7Q0FSRFNfRU5WX1ZBUlMuRVhFQ1VUSU9OX01PREV9YCk7XG4gIH1cbiAgaWYgKHZhbHVlICE9PSAnaW50ZXJhY3RpdmUnICYmIHZhbHVlICE9PSAnYmFja2dyb3VuZCcpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYEludmFsaWQgJHtDQVJEU19FTlZfVkFSUy5FWEVDVVRJT05fTU9ERX06IGV4cGVjdGVkICdpbnRlcmFjdGl2ZScgb3IgJ2JhY2tncm91bmQnLCBnb3QgXCIke3ZhbHVlfVwiYCk7XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG4vKipcbiAqIFJlYWRzIHRoZSBBUEkgYmFzZSBVUkwgZnJvbSB0aGUgZW52aXJvbm1lbnQuXG4gKlxuICogVXNlIHRoaXMgYXMgdGhlIGJhc2UgZm9yIGNvbnN0cnVjdGluZyBBUEkgZW5kcG9pbnRzLiBUaGUgVVJMIGRvZXMgbm90IGluY2x1ZGVcbiAqIGEgdHJhaWxpbmcgc2xhc2guXG4gKiBAcmV0dXJucyBCYXNlIFVSTCB1c2VkIHRvIGNvbnN0cnVjdCBDYXJkcyBBUEkgZW5kcG9pbnRzIGZvciB0aGlzIGV4ZWN1dGlvbi5cbiAqIEB0aHJvd3MgRXJyb3IgaWYgQVBJX0JBU0VfVVJMIGlzIG1pc3Npbmcgb3IgZW1wdHlcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBjb25zdCBhcGlVcmwgPSBnZXRBcGlCYXNlVXJsKCk7XG4gKiBjb25zdCBlbmRwb2ludCA9IGAke2FwaVVybH0vY2FyZHMvJHtjYXJkSWR9YDtcbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0QXBpQmFzZVVybCgpOiBzdHJpbmcge1xuICBjb25zdCB2YWx1ZSA9IHByb2Nlc3MuZW52W0NBUkRTX0VOVl9WQVJTLkFQSV9CQVNFX1VSTF07XG4gIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IHZhbHVlID09PSAnJykge1xuICAgIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyByZXF1aXJlZCBlbnZpcm9ubWVudCB2YXJpYWJsZTogJHtDQVJEU19FTlZfVkFSUy5BUElfQkFTRV9VUkx9YCk7XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG4vKipcbiAqIFJlYWRzIHRoZSBBUEkgYWNjZXNzIHRva2VuIGZyb20gdGhlIGVudmlyb25tZW50LlxuICpcbiAqIEJlYXJlciB0b2tlbiB2YWxpZCBmb3IgdGhlIGR1cmF0aW9uIG9mIHRoaXMgYWN0aW9uIG9yIHR5cGUgaG9vayBleGVjdXRpb24uXG4gKiBJbmNsdWRlIGluIEF1dGhvcml6YXRpb24gaGVhZGVycyB3aGVuIGNhbGxpbmcgdGhlIENhcmRzIEFQSS5cbiAqIEByZXR1cm5zIEJlYXJlciB0b2tlbiB0aGF0IGF1dGhvcml6ZXMgQVBJIHJlcXVlc3RzIGZvciB0aGlzIGV4ZWN1dGlvbiBjb250ZXh0LlxuICogQHRocm93cyBFcnJvciBpZiBBUElfQUNDRVNTX1RPS0VOIGlzIG1pc3Npbmcgb3IgZW1wdHlcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBjb25zdCB0b2tlbiA9IGdldEFwaUFjY2Vzc1Rva2VuKCk7XG4gKiBjb25zdCByZXNwb25zZSA9IGF3YWl0IGZldGNoKGFwaVVybCwge1xuICogICBoZWFkZXJzOiB7IEF1dGhvcml6YXRpb246IGBCZWFyZXIgJHt0b2tlbn1gIH1cbiAqIH0pO1xuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRBcGlBY2Nlc3NUb2tlbigpOiBzdHJpbmcge1xuICBjb25zdCB2YWx1ZSA9IHByb2Nlc3MuZW52W0NBUkRTX0VOVl9WQVJTLkFQSV9BQ0NFU1NfVE9LRU5dO1xuICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gJycpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYE1pc3NpbmcgcmVxdWlyZWQgZW52aXJvbm1lbnQgdmFyaWFibGU6ICR7Q0FSRFNfRU5WX1ZBUlMuQVBJX0FDQ0VTU19UT0tFTn1gKTtcbiAgfVxuICByZXR1cm4gdmFsdWU7XG59XG5cbi8qKlxuICogUmVhZHMgdGhlIGNvbmZpZ3VyZWQgY29kaW5nIGFnZW50IGlkZW50aWZpZXIgZnJvbSB0aGUgZW52aXJvbm1lbnQuXG4gKlxuICogT3B0aW9uYWwgdmFsdWUgZnJvbSBjYXJkcy5jb2RpbmdBZ2VudCBzZXR0aW5nLiBXaGVuIHNldCwgaW5kaWNhdGVzIHdoaWNoIEFJXG4gKiBjb2RpbmcgYXNzaXN0YW50IHRoZSB1c2VyIHByZWZlcnMuIEFjdGlvbnMgY2FuIHVzZSB0aGlzIHRvIGN1c3RvbWl6ZSBiZWhhdmlvclxuICogb3IgcHJvbXB0cyBmb3IgZGlmZmVyZW50IGFnZW50cy5cbiAqIEByZXR1cm5zIFRoZSBjb2RpbmcgYWdlbnQgaWRlbnRpZmllciwgb3IgdW5kZWZpbmVkIGlmIG5vdCBzZXRcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBjb25zdCBjb2RpbmdBZ2VudCA9IGdldENvZGluZ0FnZW50KCk7XG4gKiBpZiAoY29kaW5nQWdlbnQgPT09ICdjbGF1ZGUnKSB7XG4gKiAgIC8vIEN1c3RvbWl6ZSBmb3IgQ2xhdWRlXG4gKiB9XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldENvZGluZ0FnZW50KCk6IHN0cmluZyB8IHVuZGVmaW5lZCB7XG4gIGNvbnN0IHZhbHVlID0gcHJvY2Vzcy5lbnZbQ0FSRFNfRU5WX1ZBUlMuQ09ESU5HX0FHRU5UXTtcbiAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQgfHwgdmFsdWUgPT09ICcnKSB7XG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfVxuICByZXR1cm4gdmFsdWU7XG59XG5cbi8qKlxuICogUmVhZHMgdGhlIHJlZ2lzdGVyZWQgdHlwZSBuYW1lIGZvciB0eXBlIGhvb2tzLlxuICpcbiAqIFRoaXMgdmFsdWUgaXMgb25seSBwcmVzZW50IGZvciB0eXBlIGhvb2sgZXZlbnRzLlxuICogQHJldHVybnMgVGhlIHJlZ2lzdGVyZWQgdHlwZSBuYW1lXG4gKiBAdGhyb3dzIEVycm9yIGlmIFRZUEVfTkFNRSBpcyBtaXNzaW5nIG9yIGVtcHR5XG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogY29uc3QgdHlwZU5hbWUgPSBnZXRUeXBlTmFtZSgpO1xuICogY29uc29sZS5sb2coYFR5cGU6ICR7dHlwZU5hbWV9YCk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldFR5cGVOYW1lKCk6IHN0cmluZyB7XG4gIGNvbnN0IHZhbHVlID0gcHJvY2Vzcy5lbnZbQ0FSRFNfRU5WX1ZBUlMuVFlQRV9OQU1FXTtcbiAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQgfHwgdmFsdWUgPT09ICcnKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIHJlcXVpcmVkIGVudmlyb25tZW50IHZhcmlhYmxlOiAke0NBUkRTX0VOVl9WQVJTLlRZUEVfTkFNRX1gKTtcbiAgfVxuICByZXR1cm4gdmFsdWU7XG59XG5cbi8qKlxuICogUmVhZHMgdGhlIHR5cGUgdmVyc2lvbiBmcm9tIHRoZSBlbnZpcm9ubWVudC5cbiAqXG4gKiBUaGlzIHZlcnNpb24gY29tZXMgZnJvbSB0aGUgdHlwZSBjb25maWd1cmF0aW9uIGluIHNldHRpbmdzLmpzb24uXG4gKiBAcmV0dXJucyBUaGUgdmVyc2lvbiBzdHJpbmcgZnJvbSB0eXBlIGNvbmZpZ1xuICogQHRocm93cyBFcnJvciBpZiBUWVBFX1ZFUlNJT04gaXMgbWlzc2luZyBvciBlbXB0eVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGNvbnN0IHZlcnNpb24gPSBnZXRUeXBlVmVyc2lvbigpO1xuICogY29uc29sZS5sb2coYFZlcnNpb246ICR7dmVyc2lvbn1gKTtcbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0VHlwZVZlcnNpb24oKTogc3RyaW5nIHtcbiAgY29uc3QgdmFsdWUgPSBwcm9jZXNzLmVudltDQVJEU19FTlZfVkFSUy5UWVBFX1ZFUlNJT05dO1xuICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gJycpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYE1pc3NpbmcgcmVxdWlyZWQgZW52aXJvbm1lbnQgdmFyaWFibGU6ICR7Q0FSRFNfRU5WX1ZBUlMuVFlQRV9WRVJTSU9OfWApO1xuICB9XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuLyoqXG4gKiBSZWFkcyB0aGUgdHlwZWQgZmlsZSBuYW1lIGZvciB0eXBlIGhvb2sgZXZlbnRzLlxuICpcbiAqIFRoaXMgaXMgdGhlIGZpbGUgbmFtZSByZWxhdGl2ZSB0byB0aGUgdHlwZSBkaXJlY3RvcnksIG5vdCBhIGZ1bGwgcGF0aC5cbiAqIEByZXR1cm5zIFRoZSBmaWxlIG5hbWUgd2l0aGluIHRoZSB0eXBlIGRpcmVjdG9yeVxuICogQHRocm93cyBFcnJvciBpZiBGSUxFX05BTUUgaXMgbWlzc2luZyBvciBlbXB0eVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGNvbnN0IGZpbGVOYW1lID0gZ2V0RmlsZU5hbWUoKTtcbiAqIGNvbnNvbGUubG9nKGBGaWxlOiAke2ZpbGVOYW1lfWApO1xuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRGaWxlTmFtZSgpOiBzdHJpbmcge1xuICBjb25zdCB2YWx1ZSA9IHByb2Nlc3MuZW52W0NBUkRTX0VOVl9WQVJTLkZJTEVfTkFNRV07XG4gIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IHZhbHVlID09PSAnJykge1xuICAgIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyByZXF1aXJlZCBlbnZpcm9ubWVudCB2YXJpYWJsZTogJHtDQVJEU19FTlZfVkFSUy5GSUxFX05BTUV9YCk7XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG4vKipcbiAqIFJlYWRzIHRoZSBhYnNvbHV0ZSBwYXRoIHRvIHRoZSB0eXBlZCBmaWxlLlxuICpcbiAqIFRoaXMgaXMgdGhlIGZ1bGx5IHJlc29sdmVkIHBhdGggb24gZGlzayBwcm92aWRlZCBieSB0aGUgZXhlY3V0aW9uIHdyYXBwZXIuXG4gKiBAcmV0dXJucyBUaGUgZnVsbCBwYXRoIHRvIHRoZSBmaWxlXG4gKiBAdGhyb3dzIEVycm9yIGlmIEZJTEVfUEFUSCBpcyBtaXNzaW5nIG9yIGVtcHR5XG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogY29uc3QgZmlsZVBhdGggPSBnZXRGaWxlUGF0aCgpO1xuICogY29uc29sZS5sb2coYFBhdGg6ICR7ZmlsZVBhdGh9YCk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldEZpbGVQYXRoKCk6IHN0cmluZyB7XG4gIGNvbnN0IHZhbHVlID0gcHJvY2Vzcy5lbnZbQ0FSRFNfRU5WX1ZBUlMuRklMRV9QQVRIXTtcbiAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQgfHwgdmFsdWUgPT09ICcnKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIHJlcXVpcmVkIGVudmlyb25tZW50IHZhcmlhYmxlOiAke0NBUkRTX0VOVl9WQVJTLkZJTEVfUEFUSH1gKTtcbiAgfVxuICByZXR1cm4gdmFsdWU7XG59XG5cbi8qKlxuICogUmVhZHMgdGhlIHR5cGVkIGZpbGUgc2l6ZSBmcm9tIHRoZSBlbnZpcm9ubWVudC5cbiAqXG4gKiBUaGUgdmFsdWUgaXMgcGFyc2VkIGFzIGEgYmFzZS0xMCBpbnRlZ2VyLlxuICogQHJldHVybnMgVGhlIGZpbGUgc2l6ZSBpbiBieXRlc1xuICogQHRocm93cyBFcnJvciBpZiBGSUxFX1NJWkUgaXMgbWlzc2luZyBvciBub3QgYSBudW1iZXJcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBjb25zdCBzaXplID0gZ2V0RmlsZVNpemUoKTtcbiAqIGNvbnNvbGUubG9nKGBTaXplOiAke3NpemV9IGJ5dGVzYCk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldEZpbGVTaXplKCk6IG51bWJlciB7XG4gIGNvbnN0IHZhbHVlID0gcHJvY2Vzcy5lbnZbQ0FSRFNfRU5WX1ZBUlMuRklMRV9TSVpFXTtcbiAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQgfHwgdmFsdWUgPT09ICcnKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIHJlcXVpcmVkIGVudmlyb25tZW50IHZhcmlhYmxlOiAke0NBUkRTX0VOVl9WQVJTLkZJTEVfU0laRX1gKTtcbiAgfVxuICBjb25zdCBzaXplID0gTnVtYmVyLnBhcnNlSW50KHZhbHVlLCAxMCk7XG4gIGlmIChOdW1iZXIuaXNOYU4oc2l6ZSkpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYEludmFsaWQgJHtDQVJEU19FTlZfVkFSUy5GSUxFX1NJWkV9OiBleHBlY3RlZCBudW1iZXIsIGdvdCBcIiR7dmFsdWV9XCJgKTtcbiAgfVxuICByZXR1cm4gc2l6ZTtcbn1cblxuLyoqXG4gKiBSZWFkcyB0aGUgU0hBMjU2IGhhc2ggZm9yIHRoZSB0eXBlZCBmaWxlIGNvbnRlbnQuXG4gKlxuICogVXNlZnVsIGZvciBkZXRlY3RpbmcgY29udGVudCBjaGFuZ2VzIHdpdGhvdXQgcmVhZGluZyB0aGUgZmlsZSBhZ2Fpbi5cbiAqIEByZXR1cm5zIFRoZSBTSEEyNTYgaGFzaCBvZiB0aGUgY29udGVudFxuICogQHRocm93cyBFcnJvciBpZiBTSEEyNTYgaXMgbWlzc2luZyBvciBlbXB0eVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGNvbnN0IGhhc2ggPSBnZXRTaGEyNTYoKTtcbiAqIGNvbnNvbGUubG9nKGBIYXNoOiAke2hhc2h9YCk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldFNoYTI1NigpOiBzdHJpbmcge1xuICBjb25zdCB2YWx1ZSA9IHByb2Nlc3MuZW52W0NBUkRTX0VOVl9WQVJTLlNIQTI1Nl07XG4gIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IHZhbHVlID09PSAnJykge1xuICAgIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyByZXF1aXJlZCBlbnZpcm9ubWVudCB2YXJpYWJsZTogJHtDQVJEU19FTlZfVkFSUy5TSEEyNTZ9YCk7XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG4vKipcbiAqIFJlYWRzIHRoZSBNSU1FIHR5cGUgZm9yIHRoZSB0eXBlZCBmaWxlIGNvbnRlbnQuXG4gKlxuICogUHJvdmlkZWQgZm9yIHR5cGUgaG9vayBldmVudHMgc28gdmFsaWRhdG9ycyBjYW4gYnJhbmNoIG9uIGNvbnRlbnQgdHlwZS5cbiAqIEByZXR1cm5zIFRoZSBNSU1FIHR5cGUgb2YgdGhlIGNvbnRlbnRcbiAqIEB0aHJvd3MgRXJyb3IgaWYgQ09OVEVOVF9UWVBFIGlzIG1pc3Npbmcgb3IgZW1wdHlcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBjb25zdCBjb250ZW50VHlwZSA9IGdldENvbnRlbnRUeXBlKCk7XG4gKiBjb25zb2xlLmxvZyhgQ29udGVudCB0eXBlOiAke2NvbnRlbnRUeXBlfWApO1xuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRDb250ZW50VHlwZSgpOiBzdHJpbmcge1xuICBjb25zdCB2YWx1ZSA9IHByb2Nlc3MuZW52W0NBUkRTX0VOVl9WQVJTLkNPTlRFTlRfVFlQRV07XG4gIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IHZhbHVlID09PSAnJykge1xuICAgIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyByZXF1aXJlZCBlbnZpcm9ubWVudCB2YXJpYWJsZTogJHtDQVJEU19FTlZfVkFSUy5DT05URU5UX1RZUEV9YCk7XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG4vKipcbiAqIFJlYWRzIHRoZSBWUyBDb2RlIGJ1bmRsZWQgTm9kZS5qcyBpbnRlcnByZXRlciBwYXRoIGZyb20gdGhlIGVudmlyb25tZW50LlxuICpcbiAqIFRoaXMgaXMgc2V0IGJ5IHRoZSBleHRlbnNpb24gZHVyaW5nIGFjdGl2YXRpb24gYW5kIGluamVjdGVkIGludG8gYWxsXG4gKiBzcGF3bmVkIGFjdGlvbi9ob29rIHByb2Nlc3Nlcy4gQ29uZmlndXJhdGlvbiBhdXRob3JzIGNhbiB1c2UgaXQgdG8gaW52b2tlXG4gKiBOb2RlLmpzIHdpdGhvdXQgcmVseWluZyBvbiB0aGUgc3lzdGVtIFBBVEguXG4gKlxuICogQHJldHVybnMgVGhlIHBhdGggdG8gdGhlIE5vZGUuanMgaW50ZXJwcmV0ZXJcbiAqIEB0aHJvd3MgRXJyb3IgaWYgVlNDT0RFX05PREUgaXMgbWlzc2luZyBvciBlbXB0eVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGNvbnN0IG5vZGVQYXRoID0gZ2V0VnNjb2RlTm9kZVBhdGgoKTtcbiAqIGV4ZWNGaWxlU3luYyhub2RlUGF0aCwgWydzY3JpcHQuanMnXSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldFZzY29kZU5vZGVQYXRoKCk6IHN0cmluZyB7XG4gIGNvbnN0IHZhbHVlID0gcHJvY2Vzcy5lbnZbQ0FSRFNfRU5WX1ZBUlMuVlNDT0RFX05PREVdO1xuICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gJycpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYE1pc3NpbmcgcmVxdWlyZWQgZW52aXJvbm1lbnQgdmFyaWFibGU6ICR7Q0FSRFNfRU5WX1ZBUlMuVlNDT0RFX05PREV9YCk7XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG4vKipcbiAqIFJlYWRzIHRoZSBVbml4IGRvbWFpbiBzb2NrZXQgcGF0aCBmb3IgcnVudGltZS10by1kaXNwYXRjaGVyIGNvbW11bmljYXRpb24uXG4gKlxuICogQHJldHVybnMgVW5peCBzb2NrZXQgcGF0aCB1c2VkIHRvIHNlbmQgcnVudGltZSBjb250cm9sIG1lc3NhZ2VzLlxuICogQHRocm93cyBFcnJvciBpZiBTT0NLRVRfUEFUSCBpcyBtaXNzaW5nIG9yIGVtcHR5XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRTb2NrZXRQYXRoKCk6IHN0cmluZyB7XG4gIGNvbnN0IHZhbHVlID0gcHJvY2Vzcy5lbnZbQ0FSRFNfRU5WX1ZBUlMuU09DS0VUX1BBVEhdO1xuICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gJycpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYE1pc3NpbmcgcmVxdWlyZWQgZW52aXJvbm1lbnQgdmFyaWFibGU6ICR7Q0FSRFNfRU5WX1ZBUlMuU09DS0VUX1BBVEh9YCk7XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG4vKipcbiAqIFJlYWRzIHRoZSBwYXRoIHRvIHRoZSBzd2l0Y2hUb0ludGVyYWN0aXZlIGRhdGEgZmlsZS5cbiAqXG4gKiBUaGlzIGlzIG9wdGlvbmFsIFx1MjAxNCByZXR1cm5zIHVuZGVmaW5lZCB3aGVuIG5vdCBzZXQgKGkuZS4sIHRoZSBhY3Rpb25cbiAqIHdhcyBub3QgcmVsYXVuY2hlZCB2aWEgc3dpdGNoVG9JbnRlcmFjdGl2ZSkuXG4gKlxuICogQHJldHVybnMgVGhlIGZpbGUgcGF0aCwgb3IgdW5kZWZpbmVkIGlmIG5vdCBzZXRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldFN3aXRjaFRvSW50ZXJhY3RpdmVEYXRhUGF0aCgpOiBzdHJpbmcgfCB1bmRlZmluZWQge1xuICBjb25zdCB2YWx1ZSA9IHByb2Nlc3MuZW52W0NBUkRTX0VOVl9WQVJTLlNXSVRDSF9UT19JTlRFUkFDVElWRV9EQVRBX1BBVEhdO1xuICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gJycpIHtcbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuLyoqXG4gKiBSZWFkcyB0aGUgc2V0dGluZ3MgY29uZmlndXJhdGlvbiBkaXJlY3RvcnkgcGF0aC5cbiAqXG4gKiBAcmV0dXJucyBBYnNvbHV0ZSBwYXRoIHRvIHRoZSBkaXJlY3RvcnkgY29udGFpbmluZyBnZW5lcmF0ZWQgc2V0dGluZ3MgYXJ0aWZhY3RzLlxuICogQHRocm93cyBFcnJvciBpZiBDT05GSUdfUEFUSCBpcyBtaXNzaW5nIG9yIGVtcHR5XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRDb25maWdQYXRoKCk6IHN0cmluZyB7XG4gIGNvbnN0IHZhbHVlID0gcHJvY2Vzcy5lbnZbQ0FSRFNfRU5WX1ZBUlMuQ09ORklHX1BBVEhdO1xuICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gJycpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYE1pc3NpbmcgcmVxdWlyZWQgZW52aXJvbm1lbnQgdmFyaWFibGU6ICR7Q0FSRFNfRU5WX1ZBUlMuQ09ORklHX1BBVEh9YCk7XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG4vKipcbiAqIFJlYWRzIHRoZSB3b3Jrc3BhY2UgcGF0aCBzZXQgYnkgdGhlIGFjdGlvbiBoYW5kbGVyIChlLmcuLCB0aGUgd29ya3RyZWUgcGF0aCkuXG4gKlxuICogVGhpcyBpcyBmb3IgaG9va3MgcnVubmluZyBpbnNpZGUgdGhlIENsYXVkZSBDTEksICoqbm90KiogZm9yIGFjdGlvbiBoYW5kbGVycy5cbiAqIEFjdGlvbiBoYW5kbGVycyBzaG91bGQgdXNlIHtAbGluayBnZXRSZXBvUm9vdH0gaW5zdGVhZC5cbiAqXG4gKiBAcmV0dXJucyBBYnNvbHV0ZSBwYXRoIHRvIHRoZSBhY3RpdmUgd29ya3NwYWNlIC8gd29ya3RyZWUuXG4gKiBAdGhyb3dzIEVycm9yIGlmIFdPUktTUEFDRV9QQVRIIGlzIG1pc3Npbmcgb3IgZW1wdHlcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldFdvcmtzcGFjZVBhdGgoKTogc3RyaW5nIHtcbiAgY29uc3QgdmFsdWUgPSBwcm9jZXNzLmVudltDQVJEU19FTlZfVkFSUy5XT1JLU1BBQ0VfUEFUSF07XG4gIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IHZhbHVlID09PSAnJykge1xuICAgIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyByZXF1aXJlZCBlbnZpcm9ubWVudCB2YXJpYWJsZTogJHtDQVJEU19FTlZfVkFSUy5XT1JLU1BBQ0VfUEFUSH1gKTtcbiAgfVxuICByZXR1cm4gdmFsdWU7XG59XG5cbi8qKlxuICogUmVhZHMgdGhlIG1haW4gZ2l0IHJlcG9zaXRvcnkgcm9vdCBwYXRoLlxuICpcbiAqIFNldCBieSBBY3Rpb25EaXNwYXRjaGVyOyB1c2VkIGJ5IGFjdGlvbiBoYW5kbGVycyB0byByZXNvbHZlIHdvcmt0cmVlc1xuICogYW5kIHBlcmZvcm0gZ2l0IG9wZXJhdGlvbnMgYWdhaW5zdCB0aGUgbWFpbiByZXBvc2l0b3J5LlxuICpcbiAqIEByZXR1cm5zIEFic29sdXRlIHBhdGggdG8gdGhlIG1haW4gZ2l0IHJlcG9zaXRvcnkgcm9vdCAoTk9UIGEgd29ya3RyZWUpLlxuICogQHRocm93cyBFcnJvciBpZiBSRVBPX1JPT1QgaXMgbWlzc2luZyBvciBlbXB0eVxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0UmVwb1Jvb3QoKTogc3RyaW5nIHtcbiAgY29uc3QgdmFsdWUgPSBwcm9jZXNzLmVudltDQVJEU19FTlZfVkFSUy5SRVBPX1JPT1RdO1xuICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gJycpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYE1pc3NpbmcgcmVxdWlyZWQgZW52aXJvbm1lbnQgdmFyaWFibGU6ICR7Q0FSRFNfRU5WX1ZBUlMuUkVQT19ST09UfWApO1xuICB9XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuLyoqXG4gKiBSZWFkcyB0aGUgY2FyZCdzIHJlcG9zaXRvcnkgZGlyZWN0b3J5IHBhdGguXG4gKlxuICogQHJldHVybnMgQWJzb2x1dGUgcGF0aCB0byB0aGUgcmVwb3NpdG9yeSBhc3NvY2lhdGVkIHdpdGggdGhlIGFjdGl2ZSBjYXJkLlxuICogQHRocm93cyBFcnJvciBpZiBDQVJEX1JFUE9fUEFUSCBpcyBtaXNzaW5nIG9yIGVtcHR5XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRDYXJkUmVwb1BhdGgoKTogc3RyaW5nIHtcbiAgY29uc3QgdmFsdWUgPSBwcm9jZXNzLmVudltDQVJEU19FTlZfVkFSUy5DQVJEX1JFUE9fUEFUSF07XG4gIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IHZhbHVlID09PSAnJykge1xuICAgIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyByZXF1aXJlZCBlbnZpcm9ubWVudCB2YXJpYWJsZTogJHtDQVJEU19FTlZfVkFSUy5DQVJEX1JFUE9fUEFUSH1gKTtcbiAgfVxuICByZXR1cm4gdmFsdWU7XG59XG5cbi8qKlxuICogUmVhZHMgdGhlIFZTIENvZGUgZXh0ZW5zaW9uIGluc3RhbGxhdGlvbiBkaXJlY3RvcnkgcGF0aC5cbiAqXG4gKiBTZXQgYnkgdGhlIGV4dGVuc2lvbiBob3N0IGZyb20gYGNvbnRleHQuZXh0ZW5zaW9uVXJpLmZzUGF0aGAgYW5kIGluamVjdGVkXG4gKiBpbnRvIGFsbCBzcGF3bmVkIGFjdGlvbiBwcm9jZXNzZXMuIFVzZSB0aGlzIHRvIGxvY2F0ZSBidW5kbGVkIGFzc2V0cyBzdWNoXG4gKiBhcyB0aGUgcnVudGltZSBwbHVnaW4gZGlyZWN0b3J5IChgPGV4dGVuc2lvblBhdGg+L2Rpc3QvcGx1Z2lucy9ydW50aW1lYCkuXG4gKlxuICogQHJldHVybnMgQWJzb2x1dGUgcGF0aCB0byB0aGUgZXh0ZW5zaW9uIGluc3RhbGxhdGlvbiBkaXJlY3RvcnkuXG4gKiBAdGhyb3dzIEVycm9yIGlmIEVYVEVOU0lPTl9QQVRIIGlzIG1pc3Npbmcgb3IgZW1wdHlcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldEV4dGVuc2lvblBhdGgoKTogc3RyaW5nIHtcbiAgY29uc3QgdmFsdWUgPSBwcm9jZXNzLmVudltDQVJEU19FTlZfVkFSUy5FWFRFTlNJT05fUEFUSF07XG4gIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IHZhbHVlID09PSAnJykge1xuICAgIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyByZXF1aXJlZCBlbnZpcm9ubWVudCB2YXJpYWJsZTogJHtDQVJEU19FTlZfVkFSUy5FWFRFTlNJT05fUEFUSH1gKTtcbiAgfVxuICByZXR1cm4gdmFsdWU7XG59XG5cbi8qKlxuICogUmVhZHMgYW5kIHBhcnNlcyB0aGUgc3dpdGNoVG9JbnRlcmFjdGl2ZSBkYXRhIGZpbGUuXG4gKlxuICogV2hlbiBgU1dJVENIX1RPX0lOVEVSQUNUSVZFX0RBVEFfUEFUSGAgaXMgc2V0LCByZWFkcyB0aGUgZmlsZSBhdCB0aGF0IHBhdGhcbiAqIGFuZCBwYXJzZXMgaXQgYXMgSlNPTi4gUmV0dXJucyB1bmRlZmluZWQgaWYgdGhlIGVudiB2YXIgaXMgbm90IHNldC5cbiAqXG4gKiBAcmV0dXJucyBUaGUgcGFyc2VkIGRhdGEsIG9yIHVuZGVmaW5lZCBpZiB0aGUgcGF0aCBpcyBub3Qgc2V0XG4gKiBAdGhyb3dzIEVycm9yIGlmIHRoZSBmaWxlIGNhbm5vdCBiZSByZWFkIG9yIGNvbnRhaW5zIGludmFsaWQgSlNPTlxuICovXG5leHBvcnQgZnVuY3Rpb24gcmVhZFN3aXRjaFRvSW50ZXJhY3RpdmVEYXRhKCk6IHVua25vd24gfCB1bmRlZmluZWQge1xuICBjb25zdCBkYXRhUGF0aCA9IGdldFN3aXRjaFRvSW50ZXJhY3RpdmVEYXRhUGF0aCgpO1xuICBpZiAoZGF0YVBhdGggPT09IHVuZGVmaW5lZCkge1xuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cbiAgY29uc3QgY29udGVudCA9IHJlYWRGaWxlU3luYyhkYXRhUGF0aCwgJ3V0Zi04Jyk7XG4gIHJldHVybiBKU09OLnBhcnNlKGNvbnRlbnQpO1xufVxuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBUeXBlZCBJbnB1dCBFeHRyYWN0aW9uXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbi8qKlxuICogQnVpbGRzIGEgdHlwZWQgYWN0aW9uIGlucHV0IG9iamVjdCBmcm9tIGVudmlyb25tZW50IHZhcmlhYmxlcy5cbiAqXG4gKiBFeHRyYWN0cyBhbGwgZmllbGRzIHJlcXVpcmVkIGZvciBhY3Rpb24gaGFuZGxlcnMuXG4gKlxuICogQHJldHVybnMgVHlwZWQgQWN0aW9uSW5wdXQgb2JqZWN0XG4gKiBAdGhyb3dzIEVycm9yIGlmIHJlcXVpcmVkIGVudiB2YXJzIGFyZSBtaXNzaW5nIG9yIGludmFsaWRcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiAvLyBGb3IgYW4gYWN0aW9uIGhhbmRsZXJcbiAqIGNvbnN0IGlucHV0ID0gZXh0cmFjdEFjdGlvbklucHV0KCk7XG4gKiBjb25zb2xlLmxvZyhpbnB1dC5jYXJkSWQpO1xuICogY29uc29sZS5sb2coaW5wdXQuZXhlY3V0aW9uTW9kZSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGV4dHJhY3RBY3Rpb25JbnB1dCgpOiBBY3Rpb25JbnB1dCB7XG4gIHJldHVybiB7XG4gICAgY2FyZElkOiBnZXRDYXJkSWQoKSxcbiAgICBhY3Rpb25OYW1lOiBnZXRBY3Rpb25OYW1lKCksXG4gICAgZW52aXJvbm1lbnQ6IGdldEVudmlyb25tZW50KCksXG4gICAgZXhlY3V0aW9uTW9kZTogZ2V0RXhlY3V0aW9uTW9kZSgpLFxuICAgIGFwaUJhc2VVcmw6IGdldEFwaUJhc2VVcmwoKSxcbiAgICBhcGlBY2Nlc3NUb2tlbjogZ2V0QXBpQWNjZXNzVG9rZW4oKSxcbiAgICBjb2RpbmdBZ2VudDogZ2V0Q29kaW5nQWdlbnQoKSxcbiAgICBzd2l0Y2hUb0ludGVyYWN0aXZlRGF0YTogcmVhZFN3aXRjaFRvSW50ZXJhY3RpdmVEYXRhKCksXG4gICAgcmVwb1Jvb3Q6IGdldFJlcG9Sb290KCksXG4gICAgY2FyZFJlcG9QYXRoOiBnZXRDYXJkUmVwb1BhdGgoKSxcbiAgICBjb25maWdQYXRoOiBnZXRDb25maWdQYXRoKCksXG4gICAgZXh0ZW5zaW9uUGF0aDogZ2V0RXh0ZW5zaW9uUGF0aCgpXG4gIH07XG59XG5cbi8qKlxuICogQnVpbGRzIGEgdHlwZWQgdHlwZSBob29rIGlucHV0IG9iamVjdCBmcm9tIGVudmlyb25tZW50IHZhcmlhYmxlcy5cbiAqXG4gKiBFeHRyYWN0cyBhbGwgZmllbGRzIHJlcXVpcmVkIGZvciB0eXBlIGxpZmVjeWNsZSBob29rcyAodmFsaWRhdG9yLCBjcmVhdGUsXG4gKiB1cGRhdGUsIGRlbGV0ZSkuXG4gKlxuICogQHJldHVybnMgVHlwZWQgVHlwZUhvb2tJbnB1dCBvYmplY3RcbiAqIEB0aHJvd3MgRXJyb3IgaWYgcmVxdWlyZWQgZW52IHZhcnMgYXJlIG1pc3Npbmcgb3IgaW52YWxpZFxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIC8vIEZvciBhIHR5cGUgaG9vayBoYW5kbGVyXG4gKiBjb25zdCBpbnB1dCA9IGV4dHJhY3RUeXBlSW5wdXQoKTtcbiAqIGNvbnNvbGUubG9nKGlucHV0LnR5cGVOYW1lKTtcbiAqIGNvbnNvbGUubG9nKGlucHV0LmZpbGVOYW1lKTtcbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gZXh0cmFjdFR5cGVJbnB1dCgpOiBUeXBlSG9va0lucHV0IHtcbiAgcmV0dXJuIHtcbiAgICBjYXJkSWQ6IGdldENhcmRJZCgpLFxuICAgIGVudmlyb25tZW50OiBnZXRFbnZpcm9ubWVudCgpLFxuICAgIHR5cGVOYW1lOiBnZXRUeXBlTmFtZSgpLFxuICAgIHR5cGVWZXJzaW9uOiBnZXRUeXBlVmVyc2lvbigpLFxuICAgIGZpbGVOYW1lOiBnZXRGaWxlTmFtZSgpLFxuICAgIGZpbGVQYXRoOiBnZXRGaWxlUGF0aCgpLFxuICAgIGZpbGVTaXplOiBnZXRGaWxlU2l6ZSgpLFxuICAgIGZpbGVTaGEyNTY6IGdldFNoYTI1NigpLFxuICAgIGNvbnRlbnRUeXBlOiBnZXRDb250ZW50VHlwZSgpLFxuICAgIGFwaUJhc2VVcmw6IGdldEFwaUJhc2VVcmwoKSxcbiAgICBhcGlBY2Nlc3NUb2tlbjogZ2V0QXBpQWNjZXNzVG9rZW4oKVxuICB9O1xufVxuIiwgIi8qKlxuICogRXhpdCBjb2RlIGNvbnN0YW50cyBhbmQgaGVscGVycyBmb3IgQ2FyZHMgRXh0ZW5zaW9uIGhvb2tzLlxuICpcbiAqIENhcmRzIGhvb2tzIGNvbW11bmljYXRlIHN1Y2Nlc3MgYW5kIGZhaWx1cmUgdmlhIHByb2Nlc3MgZXhpdCBjb2RlcyBhbmRcbiAqIHN0ZGVyciBvdXRwdXQuIFRoaXMgbW9kdWxlIGNlbnRyYWxpemVzIHRob3NlIGNvbnZlbnRpb25zIHNvIHRoZSBydW50aW1lXG4gKiBhbmQgaG9va3Mgc3BlYWsgdGhlIHNhbWUgcHJvdG9jb2wuXG4gKlxuICogQHN1bW1hcnkgRXhpdCBjb2RlIGNvbnN0YW50cyBhbmQgaGVscGVycyBmb3IgQ2FyZHMgRXh0ZW5zaW9uIGhvb2tzXG4gKiBAbW9kdWxlXG4gKi9cblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gRXhpdCBDb2RlIENvbnN0YW50c1xuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4vKipcbiAqIEV4aXQgY29kZXMgdXNlZCBieSBDYXJkcyBob29rcy5cbiAqXG4gKiBUaGUgQ2FyZHMgcnVudGltZSBpbnRlcnByZXRzIGFueSBub24temVybyBleGl0IGNvZGUgYXMgZmFpbHVyZS5cbiAqL1xuZXhwb3J0IGNvbnN0IEVYSVRfQ09ERVMgPSB7XG4gIC8qKiBIYW5kbGVyIGNvbXBsZXRlZCBzdWNjZXNzZnVsbHkuICovXG4gIFNVQ0NFU1M6IDAsXG4gIC8qKiBIYW5kbGVyIHRocmV3IGFuIGVycm9yLiAqL1xuICBFUlJPUjogMSxcbiAgLyoqIEhhbmRsZXIgcHJvY2Vzc2VkIHN3aXRjaFRvSW50ZXJhY3RpdmUgYW5kIGlzIGV4aXRpbmcgZm9yIHJlbGF1bmNoLiAqL1xuICBTV0lUQ0hfVE9fSU5URVJBQ1RJVkU6IDQyXG59IGFzIGNvbnN0O1xuXG4vKipcbiAqIFVuaW9uIG9mIHZhbGlkIENhcmRzIGhvb2sgZXhpdCBjb2Rlcy5cbiAqL1xuZXhwb3J0IHR5cGUgRXhpdENvZGUgPSAodHlwZW9mIEVYSVRfQ09ERVMpW2tleW9mIHR5cGVvZiBFWElUX0NPREVTXTtcblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gRXJyb3IgT3V0cHV0IEhlbHBlcnNcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuLyoqXG4gKiBXcml0ZXMgYW4gZXJyb3IgbWVzc2FnZSB0byBzdGRlcnIgd2l0aCBhIHRyYWlsaW5nIG5ld2xpbmUuXG4gKlxuICogVXNlIHRoaXMgd2hlbiBhIGhvb2sgbmVlZHMgdG8gcmVwb3J0IGEgZmFpbHVyZSB3aXRob3V0IHBvbGx1dGluZyBzdGRvdXQuXG4gKiBAcGFyYW0gbWVzc2FnZSAtIEVycm9yIG1lc3NhZ2UgdG8gd3JpdGVcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiB3cml0ZUVycm9yKCdGYWlsZWQgdG8gY29ubmVjdCB0byBkYXRhYmFzZScpO1xuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB3cml0ZUVycm9yKG1lc3NhZ2U6IHN0cmluZyk6IHZvaWQge1xuICBwcm9jZXNzLnN0ZGVyci53cml0ZShgJHttZXNzYWdlfVxcbmApO1xufVxuXG4vKipcbiAqIFdyaXRlcyBhbiBlcnJvciBtZXNzYWdlIHRvIHN0ZGVyciBhbmQgZXhpdHMgd2l0aCBFUlJPUiBjb2RlLlxuICpcbiAqIFRoaXMgdGVybWluYXRlcyB0aGUgcHJvY2VzcyBpbW1lZGlhdGVseSwgc28gYW55IHBlbmRpbmcgYXN5bmMgd29yayB3aWxsXG4gKiBub3QgZmluaXNoIHVubGVzcyBpdCB3YXMgYWxyZWFkeSBhd2FpdGVkLlxuICogQHBhcmFtIG1lc3NhZ2UgLSBFcnJvciBtZXNzYWdlIHRvIHdyaXRlIGJlZm9yZSBleGl0aW5nXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogaWYgKCFpc1ZhbGlkKSB7XG4gKiAgIGV4aXRXaXRoRXJyb3IoJ0ludmFsaWQgY29uZmlndXJhdGlvbicpO1xuICogfVxuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBleGl0V2l0aEVycm9yKG1lc3NhZ2U6IHN0cmluZyk6IG5ldmVyIHtcbiAgd3JpdGVFcnJvcihtZXNzYWdlKTtcbiAgcHJvY2Vzcy5leGl0KEVYSVRfQ09ERVMuRVJST1IpO1xufVxuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBJbnRlcm5hbCBSZXN1bHQgVHJhY2tpbmdcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuLyoqXG4gKiBJbnRlcm5hbCBydW50aW1lIGJvb2trZWVwaW5nIGZvciBob29rIGV4ZWN1dGlvbiByZXN1bHRzLlxuICpcbiAqIFRoaXMgc3RydWN0dXJlIGFsbG93cyB0aGUgcnVudGltZSB0byBjYXJyeSBlcnJvciBkZXRhaWxzIHdpdGhvdXQgY2hhbmdpbmdcbiAqIHRoZSBleGl0LWNvZGUgcHJvdG9jb2wuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgSG9va0V4ZWN1dGlvblJlc3VsdCB7XG4gIC8qKiBXaGV0aGVyIHRoZSBob29rIGV4ZWN1dGVkIHN1Y2Nlc3NmdWxseS4gKi9cbiAgc3VjY2VzczogYm9vbGVhbjtcbiAgLyoqIFRoZSBleGl0IGNvZGUgdG8gdXNlIHdoZW4gZXhpdGluZy4gKi9cbiAgZXhpdENvZGU6IEV4aXRDb2RlO1xuICAvKiogVGhlIGVycm9yIHRoYXQgb2NjdXJyZWQsIGlmIGFueS4gKi9cbiAgZXJyb3I/OiBFcnJvcjtcbn1cbiIsICIvKipcbiAqIFN0cnVjdHVyZWQgbG9nZ2luZyBmb3IgQ2FyZHMgRXh0ZW5zaW9uIGhvb2tzLlxuICpcbiAqIE91dHB1dCBpcyBvcHQtaW46IHRoZSBsb2dnZXIgb25seSBlbWl0cyB0byByZWdpc3RlcmVkIGhhbmRsZXJzIG9yIGFcbiAqIGNvbmZpZ3VyZWQgbG9nIGZpbGUuIElmIHlvdSBjb25maWd1cmUgbm90aGluZywgdGhlIGxvZ2dlciBwb2xpdGVseSBzYXlzXG4gKiBub3RoaW5nIGF0IGFsbC4gSXQgbmV2ZXIgd3JpdGVzIHRvIHN0ZG91dCBhbmQgYXZvaWRzIHN0ZGVyciB0byBrZWVwIGhvb2tcbiAqIHByb3RvY29scyBjbGVhbi5cbiAqXG4gKiBAc3VtbWFyeSBTdHJ1Y3R1cmVkIGxvZ2dpbmcgZm9yIENhcmRzIEV4dGVuc2lvbiBob29rc1xuICogQG1vZHVsZVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGltcG9ydCB7IGxvZ2dlciB9IGZyb20gJ0BjYXJkcy9zZGsvY29uZmlnJztcbiAqXG4gKiAvLyBTdWJzY3JpYmUgdG8gbG9nIGV2ZW50c1xuICogY29uc3QgdW5zdWJzY3JpYmUgPSBsb2dnZXIub24oJ2Vycm9yJywgKGV2ZW50KSA9PiB7XG4gKiAgIGNvbnNvbGUuZXJyb3IoYEVycm9yIGluICR7ZXZlbnQuaG9va1R5cGV9OiAke2V2ZW50Lm1lc3NhZ2V9YCk7XG4gKiB9KTtcbiAqXG4gKiAvLyBMYXRlciwgY2xlYW4gdXBcbiAqIHVuc3Vic2NyaWJlKCk7XG4gKiBgYGBcbiAqL1xuXG5pbXBvcnQgeyBjbG9zZVN5bmMsIGV4aXN0c1N5bmMsIG1rZGlyU3luYywgb3BlblN5bmMsIHdyaXRlU3luYyB9IGZyb20gJ25vZGU6ZnMnO1xuaW1wb3J0IHsgZGlybmFtZSB9IGZyb20gJ25vZGU6cGF0aCc7XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIExvZyBMZXZlbCBUeXBlc1xuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4vKipcbiAqIEF2YWlsYWJsZSBsb2cgbGV2ZWxzLlxuICpcbiAqIHwgTGV2ZWwgfCBTZXZlcml0eSB8IFVzZSBDYXNlIHxcbiAqIHwtLS0tLS0tfC0tLS0tLS0tLS18LS0tLS0tLS0tLXxcbiAqIHwgYGRlYnVnYCB8IExvd2VzdCB8IERldGFpbGVkIGRlYnVnZ2luZyBpbmZvcm1hdGlvbiB8XG4gKiB8IGBpbmZvYCB8IExvdyB8IEdlbmVyYWwgb3BlcmF0aW9uYWwgZXZlbnRzIHxcbiAqIHwgYHdhcm5gIHwgTWVkaXVtIHwgV2FybmluZyBjb25kaXRpb25zIHRoYXQgbWF5IGluZGljYXRlIGlzc3VlcyB8XG4gKiB8IGBlcnJvcmAgfCBIaWdoIHwgRXJyb3IgY29uZGl0aW9ucyByZXF1aXJpbmcgYXR0ZW50aW9uIHxcbiAqL1xuZXhwb3J0IHR5cGUgTG9nTGV2ZWwgPSAnZGVidWcnIHwgJ2luZm8nIHwgJ3dhcm4nIHwgJ2Vycm9yJztcblxuLyoqXG4gKiBBbGwgbG9nIGxldmVscyBpbiBvcmRlciBvZiBzZXZlcml0eSAobG93ZXN0IHRvIGhpZ2hlc3QpLlxuICovXG5leHBvcnQgY29uc3QgTE9HX0xFVkVMUyA9IFsnZGVidWcnLCAnaW5mbycsICd3YXJuJywgJ2Vycm9yJ10gYXMgY29uc3Qgc2F0aXNmaWVzIHJlYWRvbmx5IExvZ0xldmVsW107XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIExvZyBFdmVudCBUeXBlXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbi8qKlxuICogU3RydWN0dXJlZCBsb2cgZXZlbnQgZW1pdHRlZCBieSB0aGUgbG9nZ2VyLlxuICpcbiAqIEV2ZW50cyBpbmNsdWRlIGNvbnRleHR1YWwgZGV0YWlscyBhYm91dCBob29rIGV4ZWN1dGlvbiBhbmQgYXJlIHN1aXRhYmxlIGZvclxuICogZGVidWdnaW5nLCBtb25pdG9yaW5nLCBhbmQgYW5hbHl0aWNzIHBpcGVsaW5lcy5cbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiAvLyBFeGFtcGxlIGxvZyBldmVudFxuICogY29uc3QgZXZlbnQ6IExvZ0V2ZW50ID0ge1xuICogICB0aW1lc3RhbXA6ICcyMDI0LTAxLTE1VDEwOjMwOjAwLjAwMFonLFxuICogICBsZXZlbDogJ3dhcm4nLFxuICogICBob29rVHlwZTogJ2FjdGlvbi1zdGFydCcsXG4gKiAgIG1lc3NhZ2U6ICdDYXJkIHN0YXJ0ZWQnLFxuICogICBpbnB1dDogeyBjYXJkSWQ6ICdjYXJkLTEyMycgfVxuICogfTtcbiAqIGBgYFxuICovXG5leHBvcnQgaW50ZXJmYWNlIExvZ0V2ZW50IHtcbiAgLyoqXG4gICAqIElTTyA4NjAxIHRpbWVzdGFtcCBvZiB3aGVuIHRoZSBldmVudCBvY2N1cnJlZC5cbiAgICogQGV4YW1wbGUgJzIwMjQtMDEtMTVUMTA6MzA6MDAuMDAwWidcbiAgICovXG4gIHRpbWVzdGFtcDogc3RyaW5nO1xuXG4gIC8qKlxuICAgKiBTZXZlcml0eSBsZXZlbCBvZiB0aGUgbG9nIGV2ZW50LlxuICAgKi9cbiAgbGV2ZWw6IExvZ0xldmVsO1xuXG4gIC8qKlxuICAgKiBUeXBlIG9mIGhvb2sgdGhhdCBnZW5lcmF0ZWQgdGhpcyBldmVudC5cbiAgICogTWF5IGJlIHVuZGVmaW5lZCBmb3IgZXZlbnRzIG91dHNpZGUgaG9vayBjb250ZXh0LlxuICAgKi9cbiAgaG9va1R5cGU/OiBzdHJpbmc7XG5cbiAgLyoqXG4gICAqIEh1bWFuLXJlYWRhYmxlIGRlc2NyaXB0aW9uIG9mIHdoYXQgaGFwcGVuZWQuXG4gICAqL1xuICBtZXNzYWdlOiBzdHJpbmc7XG5cbiAgLyoqXG4gICAqIEhvb2sgaW5wdXQgZGF0YSBhdCB0aGUgdGltZSBvZiBsb2dnaW5nLlxuICAgKlxuICAgKiBUaGlzIGlzIHBhcnRpYWwgYnkgZGVzaWduLCBzbyB5b3UgY2FuIGF2b2lkIGxvZ2dpbmcgbGFyZ2Ugb3Igc2Vuc2l0aXZlXG4gICAqIHBheWxvYWRzIHdoaWxlIHN0aWxsIGNhcHR1cmluZyBrZXkgaWRlbnRpZmllcnMuXG4gICAqL1xuICBpbnB1dD86IFJlY29yZDxzdHJpbmcsIHVua25vd24+O1xuXG4gIC8qKlxuICAgKiBFcnJvciBpbmZvcm1hdGlvbiBpZiB0aGlzIGV2ZW50IHJlcHJlc2VudHMgYW4gZXJyb3IuXG4gICAqIENvbnRhaW5zIHN0cnVjdHVyZWQgZXJyb3IgZGV0YWlscyBmb3IgYW5hbHlzaXMuXG4gICAqL1xuICBlcnJvcj86IExvZ0V2ZW50RXJyb3I7XG5cbiAgLyoqXG4gICAqIEFkZGl0aW9uYWwgY29udGV4dCBkYXRhIHByb3ZpZGVkIGJ5IHRoZSBjYWxsZXIuXG4gICAqXG4gICAqIFVzZSB0aGlzIGZvciBzdHJ1Y3R1cmVkIG1ldGFkYXRhIHRoYXQgeW91IHdhbnQgZG93bnN0cmVhbSBoYW5kbGVyc1xuICAgKiB0byByZWNlaXZlIChlLmcuLCByZXF1ZXN0IElEcywgdGltaW5nIGRhdGEpLlxuICAgKi9cbiAgY29udGV4dD86IFJlY29yZDxzdHJpbmcsIHVua25vd24+O1xufVxuXG4vKipcbiAqIFN0cnVjdHVyZWQgZXJyb3IgaW5mb3JtYXRpb24gd2l0aGluIGEgbG9nIGV2ZW50LlxuICpcbiAqIEVycm9ycyBhcmUgbm9ybWFsaXplZCBzbyBoYW5kbGVycyBjYW4gZGVwZW5kIG9uIGNvbnNpc3RlbnQgc2hhcGUsIGV2ZW4gd2hlblxuICogY2FsbGVycyB0aHJvdyBub24tRXJyb3IgdmFsdWVzLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIExvZ0V2ZW50RXJyb3Ige1xuICAvKipcbiAgICogRXJyb3IgbmFtZSAoZS5nLiwgJ1R5cGVFcnJvcicsICdWYWxpZGF0aW9uRXJyb3InKS5cbiAgICovXG4gIG5hbWU6IHN0cmluZztcblxuICAvKipcbiAgICogRXJyb3IgbWVzc2FnZSBkZXNjcmliaW5nIHdoYXQgd2VudCB3cm9uZy5cbiAgICovXG4gIG1lc3NhZ2U6IHN0cmluZztcblxuICAvKipcbiAgICogU3RhY2sgdHJhY2UgaWYgYXZhaWxhYmxlLlxuICAgKi9cbiAgc3RhY2s/OiBzdHJpbmc7XG5cbiAgLyoqXG4gICAqIEVycm9yIGNhdXNlIGNoYWluIGlmIHRoZSBlcnJvciB3YXMgd3JhcHBlZC5cbiAgICovXG4gIGNhdXNlPzogTG9nRXZlbnRFcnJvcjtcbn1cblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gRXZlbnQgSGFuZGxlciBUeXBlXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbi8qKlxuICogSGFuZGxlciBpbnZva2VkIHdoZW4gYSBsb2cgZXZlbnQgaXMgZW1pdHRlZC5cbiAqXG4gKiBIYW5kbGVycyBydW4gc3luY2hyb25vdXNseS4gRXJyb3JzIHRocm93biBieSBhIGhhbmRsZXIgYXJlIHN3YWxsb3dlZCBzb1xuICogbG9nZ2luZyBjYW5ub3QgYnJlYWsgaG9vayBleGVjdXRpb24uXG4gKiBAcGFyYW0gZXZlbnQgLSBUaGUgbG9nIGV2ZW50IHRvIGhhbmRsZVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIC8vIEZvcndhcmQgdG8gZXh0ZXJuYWwgbG9nZ2luZyBzZXJ2aWNlXG4gKiBjb25zdCBoYW5kbGVyOiBMb2dFdmVudEhhbmRsZXIgPSAoZXZlbnQpID0+IHtcbiAqICAgZXh0ZXJuYWxMb2dnZXIubG9nKHtcbiAqICAgICBsZXZlbDogZXZlbnQubGV2ZWwsXG4gKiAgICAgbWVzc2FnZTogZXZlbnQubWVzc2FnZSxcbiAqICAgICBtZXRhZGF0YTogeyBob29rVHlwZTogZXZlbnQuaG9va1R5cGUgfVxuICogICB9KTtcbiAqIH07XG4gKiBgYGBcbiAqL1xuZXhwb3J0IHR5cGUgTG9nRXZlbnRIYW5kbGVyID0gKGV2ZW50OiBMb2dFdmVudCkgPT4gdm9pZDtcblxuLyoqXG4gKiBGdW5jdGlvbiB0byB1bnN1YnNjcmliZSBhIGxvZyBldmVudCBoYW5kbGVyLlxuICpcbiAqIENhbGwgdGhpcyBmdW5jdGlvbiB0byBzdG9wIHJlY2VpdmluZyBsb2cgZXZlbnRzLiBBbHdheXMgY2FsbCB1bnN1YnNjcmliZVxuICogd2hlbiB0aGUgaGFuZGxlciBpcyBubyBsb25nZXIgbmVlZGVkIHRvIHByZXZlbnQgbWVtb3J5IGxlYWtzLlxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGNvbnN0IHVuc3Vic2NyaWJlID0gbG9nZ2VyLm9uKCdlcnJvcicsIGhhbmRsZUVycm9yKTtcbiAqIC8vIC4uLiBsYXRlclxuICogdW5zdWJzY3JpYmUoKTsgLy8gU3RvcCByZWNlaXZpbmcgZXZlbnRzXG4gKiBgYGBcbiAqL1xuZXhwb3J0IHR5cGUgVW5zdWJzY3JpYmUgPSAoKSA9PiB2b2lkO1xuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBMb2dnZXIgQ29uZmlndXJhdGlvblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4vKipcbiAqIENvbmZpZ3VyYXRpb24gb3B0aW9ucyBmb3IgdGhlIExvZ2dlci5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBMb2dnZXJDb25maWcge1xuICAvKipcbiAgICogUGF0aCB0byB0aGUgbG9nIGZpbGUgZm9yIEpTT04gTGluZXMgb3V0cHV0LlxuICAgKlxuICAgKiBJZiBub3Qgc2V0LCBmaWxlIGxvZ2dpbmcgaXMgZGlzYWJsZWQuIENhbiBhbHNvIGJlIHNldCB2aWEgdGhlXG4gICAqIGBDQVJEU19IT09LU19MT0dfRklMRWAgZW52aXJvbm1lbnQgdmFyaWFibGUuXG4gICAqL1xuICBsb2dGaWxlUGF0aD86IHN0cmluZztcbn1cblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gTG9nZ2VyIEludGVyZmFjZSAoZm9yIHRlc3RpbmcgYW5kIHR5cGUgY29tcGF0aWJpbGl0eSlcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuLyoqXG4gKiBMb2dnZXIgaW50ZXJmYWNlIGZvciBzdHJ1Y3R1cmVkLCBjb250ZXh0LWF3YXJlIGxvZ2dpbmcuXG4gKlxuICogVGhpcyBpbnRlcmZhY2UgZGVmaW5lcyB0aGUgcHVibGljIEFQSSBvZiB0aGUgTG9nZ2VyIGNsYXNzLiBJdCBleGlzdHNcbiAqIHByaW1hcmlseSBmb3IgdHlwZSBjb21wYXRpYmlsaXR5IGFuZCB0ZXN0aW5nIHB1cnBvc2VzLCBhbGxvd2luZyB0ZXN0c1xuICogdG8gbW9jayB0aGUgbG9nZ2VyIHdpdGhvdXQgbmVlZGluZyB0byBpbXBsZW1lbnQgYWxsIGludGVybmFsIG1ldGhvZHMuXG4gKlxuICogRm9yIHByb2R1Y3Rpb24gdXNlLCB1c2UgdGhlIHtAbGluayBMb2dnZXJ9IGNsYXNzIG9yIHRoZSB7QGxpbmsgbG9nZ2VyfVxuICogc2luZ2xldG9uIGV4cG9ydC5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBJTG9nZ2VyIHtcbiAgLyoqXG4gICAqIExvZ3MgYSBkZWJ1ZyBtZXNzYWdlLlxuICAgKiBAcGFyYW0gbWVzc2FnZSAtIERpYWdub3N0aWMgdGV4dCBkZXNjcmliaW5nIGxvdy1sZXZlbCBleGVjdXRpb24gZGV0YWlscy5cbiAgICogQHBhcmFtIGNvbnRleHQgLSBPcHRpb25hbCBzdHJ1Y3R1cmVkIG1ldGFkYXRhIG1lcmdlZCBpbnRvIHRoZSBlbWl0dGVkIGV2ZW50LlxuICAgKi9cbiAgZGVidWcobWVzc2FnZTogc3RyaW5nLCBjb250ZXh0PzogUmVjb3JkPHN0cmluZywgdW5rbm93bj4pOiB2b2lkO1xuXG4gIC8qKlxuICAgKiBMb2dzIGFuIGluZm8gbWVzc2FnZS5cbiAgICogQHBhcmFtIG1lc3NhZ2UgLSBPcGVyYXRpb25hbCBtZXNzYWdlIGRlc2NyaWJpbmcgbm9ybWFsIGhvb2sgcHJvZ3Jlc3MuXG4gICAqIEBwYXJhbSBjb250ZXh0IC0gT3B0aW9uYWwgc3RydWN0dXJlZCBtZXRhZGF0YSBtZXJnZWQgaW50byB0aGUgZW1pdHRlZCBldmVudC5cbiAgICovXG4gIGluZm8obWVzc2FnZTogc3RyaW5nLCBjb250ZXh0PzogUmVjb3JkPHN0cmluZywgdW5rbm93bj4pOiB2b2lkO1xuXG4gIC8qKlxuICAgKiBMb2dzIGEgd2FybmluZyBtZXNzYWdlLlxuICAgKiBAcGFyYW0gbWVzc2FnZSAtIFdhcm5pbmcgdGV4dCBmb3IgcmVjb3ZlcmFibGUgb3Igc3VzcGljaW91cyBjb25kaXRpb25zLlxuICAgKiBAcGFyYW0gY29udGV4dCAtIE9wdGlvbmFsIHN0cnVjdHVyZWQgbWV0YWRhdGEgbWVyZ2VkIGludG8gdGhlIGVtaXR0ZWQgZXZlbnQuXG4gICAqL1xuICB3YXJuKG1lc3NhZ2U6IHN0cmluZywgY29udGV4dD86IFJlY29yZDxzdHJpbmcsIHVua25vd24+KTogdm9pZDtcblxuICAvKipcbiAgICogTG9ncyBhbiBlcnJvciBtZXNzYWdlLlxuICAgKiBAcGFyYW0gbWVzc2FnZSAtIEVycm9yIHRleHQgZGVzY3JpYmluZyBhIGhhbmRsZWQgZmFpbHVyZSBjb25kaXRpb24uXG4gICAqIEBwYXJhbSBjb250ZXh0IC0gT3B0aW9uYWwgc3RydWN0dXJlZCBtZXRhZGF0YSBtZXJnZWQgaW50byB0aGUgZW1pdHRlZCBldmVudC5cbiAgICovXG4gIGVycm9yKG1lc3NhZ2U6IHN0cmluZywgY29udGV4dD86IFJlY29yZDxzdHJpbmcsIHVua25vd24+KTogdm9pZDtcblxuICAvKipcbiAgICogTG9ncyBhIHN0cnVjdHVyZWQgZXJyb3Igd2l0aCBmdWxsIGVycm9yIGRldGFpbHMuXG4gICAqIEBwYXJhbSBlcnJvciAtIFRoZSBlcnJvciB0byBsb2dcbiAgICogQHBhcmFtIG1lc3NhZ2UgLSBIdW1hbi1yZWFkYWJsZSBkZXNjcmlwdGlvbiBvZiB3aGF0IGZhaWxlZFxuICAgKiBAcGFyYW0gY29udGV4dCAtIE9wdGlvbmFsIHN0cnVjdHVyZWQgbWV0YWRhdGEgbWVyZ2VkIGludG8gdGhlIGVtaXR0ZWQgZXZlbnQuXG4gICAqL1xuICBsb2dFcnJvcihlcnJvcjogdW5rbm93biwgbWVzc2FnZTogc3RyaW5nLCBjb250ZXh0PzogUmVjb3JkPHN0cmluZywgdW5rbm93bj4pOiB2b2lkO1xufVxuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBMb2dnZXIgQ2xhc3Ncbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuLyoqXG4gKiBMb2dnZXIgZm9yIENhcmRzIEV4dGVuc2lvbiBob29rcyB3aXRoIGV2ZW50IHN1YnNjcmlwdGlvbiBhbmQgZmlsZSBvdXRwdXQuXG4gKlxuICogT3V0cHV0IGlzIG9wdC1pbiBhbmQgYmVzdC1lZmZvcnQ6XG4gKiAtIFdpdGggbm8gaGFuZGxlcnMgYW5kIG5vIGxvZyBmaWxlLCBldmVudHMgYXJlIGRyb3BwZWQuXG4gKiAtIEhhbmRsZXIgZXJyb3JzIGFyZSBzd2FsbG93ZWQgc28gbG9nZ2luZyBjYW5ub3QgYnJlYWsgaG9va3MuXG4gKiAtIEZpbGUgb3V0cHV0IHVzZXMgSlNPTiBMaW5lcyBhbmQgaWdub3JlcyB3cml0ZSBmYWlsdXJlcy5cbiAqXG4gKiBUaGUgbG9nZ2VyIG5ldmVyIHdyaXRlcyB0byBzdGRvdXQgb3Igc3RkZXJyLlxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGltcG9ydCB7IGxvZ2dlciB9IGZyb20gJ0BjYXJkcy9zZGsvY29uZmlnJztcbiAqXG4gKiAvLyBTdWJzY3JpYmUgdG8gZXZlbnRzIGF0IHNwZWNpZmljIGxldmVsXG4gKiBsb2dnZXIub24oJ3dhcm4nLCAoZXZlbnQpID0+IHtcbiAqICAgc2VuZEFsZXJ0KGV2ZW50Lm1lc3NhZ2UpO1xuICogfSk7XG4gKlxuICogLy8gTG9nIHdpdGhpbiBhIGhvb2sgaGFuZGxlclxuICogbG9nZ2VyLndhcm4oJ0Fib3V0IHRvIGV4ZWN1dGUgdGFzaycpO1xuICogYGBgXG4gKi9cbmV4cG9ydCBjbGFzcyBMb2dnZXIge1xuICAvKipcbiAgICogUmVnaXN0ZXJlZCBldmVudCBoYW5kbGVycyBieSBsb2cgbGV2ZWwuXG4gICAqL1xuICBwcml2YXRlIGhhbmRsZXJzOiBNYXA8TG9nTGV2ZWwsIFNldDxMb2dFdmVudEhhbmRsZXI+PiA9IG5ldyBNYXAoKTtcblxuICAvKipcbiAgICogRmlsZSBkZXNjcmlwdG9yIGZvciBsb2cgZmlsZSBvdXRwdXQuXG4gICAqIExhemlseSBpbml0aWFsaXplZCBvbiBmaXJzdCB3cml0ZS5cbiAgICovXG4gIHByaXZhdGUgbG9nRmlsZUZkOiBudW1iZXIgfCBudWxsID0gbnVsbDtcblxuICAvKipcbiAgICogUGF0aCB0byB0aGUgbG9nIGZpbGUsIGlmIGNvbmZpZ3VyZWQuXG4gICAqL1xuICBwcml2YXRlIGxvZ0ZpbGVQYXRoOiBzdHJpbmcgfCBudWxsID0gbnVsbDtcblxuICAvKipcbiAgICogV2hldGhlciBmaWxlIGluaXRpYWxpemF0aW9uIGhhcyBiZWVuIGF0dGVtcHRlZC5cbiAgICovXG4gIHByaXZhdGUgZmlsZUluaXRpYWxpemVkID0gZmFsc2U7XG5cbiAgLyoqXG4gICAqIEN1cnJlbnQgaG9vayBjb250ZXh0IGZvciBlbnJpY2hpbmcgbG9nIGV2ZW50cy5cbiAgICovXG4gIHByaXZhdGUgY3VycmVudEhvb2tUeXBlOiBzdHJpbmcgfCB1bmRlZmluZWQ7XG5cbiAgLyoqXG4gICAqIEN1cnJlbnQgaG9vayBpbnB1dCBmb3IgZW5yaWNoaW5nIGxvZyBldmVudHMuXG4gICAqL1xuICBwcml2YXRlIGN1cnJlbnRJbnB1dDogUmVjb3JkPHN0cmluZywgdW5rbm93bj4gfCB1bmRlZmluZWQ7XG5cbiAgLyoqXG4gICAqIENyZWF0ZXMgYSBuZXcgTG9nZ2VyIGluc3RhbmNlLlxuICAgKlxuICAgKiBUeXBpY2FsbHkgeW91IHNob3VsZCB1c2UgdGhlIGV4cG9ydGVkIGBsb2dnZXJgIHNpbmdsZXRvbiByYXRoZXIgdGhhblxuICAgKiBjcmVhdGluZyBuZXcgaW5zdGFuY2VzLlxuICAgKiBAcGFyYW0gY29uZmlnIC0gT3B0aW9uYWwgY29uZmlndXJhdGlvblxuICAgKiBAZXhhbXBsZVxuICAgKiBgYGB0eXBlc2NyaXB0XG4gICAqIC8vIFVzZSBzaW5nbGV0b24gKHJlY29tbWVuZGVkKVxuICAgKiBpbXBvcnQgeyBsb2dnZXIgfSBmcm9tICdAY2FyZHMvc2RrL2NvbmZpZyc7XG4gICAqXG4gICAqIC8vIE9yIGNyZWF0ZSBjdXN0b20gaW5zdGFuY2VcbiAgICogY29uc3QgY3VzdG9tTG9nZ2VyID0gbmV3IExvZ2dlcih7IGxvZ0ZpbGVQYXRoOiAnL3Zhci9sb2cvaG9va3MubG9nJyB9KTtcbiAgICogYGBgXG4gICAqL1xuICBjb25zdHJ1Y3Rvcihjb25maWc6IExvZ2dlckNvbmZpZyA9IHt9KSB7XG4gICAgLy8gSW5pdGlhbGl6ZSBoYW5kbGVycyBtYXAgZm9yIGVhY2ggbGV2ZWxcbiAgICBmb3IgKGNvbnN0IGxldmVsIG9mIExPR19MRVZFTFMpIHtcbiAgICAgIHRoaXMuaGFuZGxlcnMuc2V0KGxldmVsLCBuZXcgU2V0KCkpO1xuICAgIH1cblxuICAgIC8vIFNldCBsb2cgZmlsZSBwYXRoIGZyb20gY29uZmlnIG9yIGVudmlyb25tZW50XG4gICAgdGhpcy5sb2dGaWxlUGF0aCA9IGNvbmZpZy5sb2dGaWxlUGF0aCA/PyBwcm9jZXNzLmVudlsnQ0FSRFNfSE9PS1NfTE9HX0ZJTEUnXSA/PyBudWxsO1xuICB9XG5cbiAgLyoqXG4gICAqIExvZ3MgYSBkZWJ1ZyBtZXNzYWdlLlxuICAgKlxuICAgKiBVc2UgZm9yIGRldGFpbGVkIGRlYnVnZ2luZyBpbmZvcm1hdGlvbiB0aGF0IGlzIHR5cGljYWxseSBvbmx5IHVzZWZ1bFxuICAgKiBkdXJpbmcgZGV2ZWxvcG1lbnQgb3IgdHJvdWJsZXNob290aW5nLlxuICAgKiBAcGFyYW0gbWVzc2FnZSAtIERpYWdub3N0aWMgdGV4dCBkZXNjcmliaW5nIGxvdy1sZXZlbCBleGVjdXRpb24gZGV0YWlscy5cbiAgICogQHBhcmFtIGNvbnRleHQgLSBPcHRpb25hbCBzdHJ1Y3R1cmVkIG1ldGFkYXRhIG1lcmdlZCBpbnRvIHRoZSBlbWl0dGVkIGV2ZW50LlxuICAgKiBAZXhhbXBsZVxuICAgKiBgYGB0eXBlc2NyaXB0XG4gICAqIGxvZ2dlci5kZWJ1ZygnUHJvY2Vzc2luZyBob29rIGlucHV0JywgeyB0YXNrSWQ6ICd0YXNrLTEyMycsIGlucHV0U2l6ZTogMjU2IH0pO1xuICAgKiBgYGBcbiAgICovXG4gIGRlYnVnKG1lc3NhZ2U6IHN0cmluZywgY29udGV4dD86IFJlY29yZDxzdHJpbmcsIHVua25vd24+KTogdm9pZCB7XG4gICAgdGhpcy5lbWl0KCdkZWJ1ZycsIG1lc3NhZ2UsIGNvbnRleHQpO1xuICB9XG5cbiAgLyoqXG4gICAqIExvZ3MgYW4gaW5mbyBtZXNzYWdlLlxuICAgKlxuICAgKiBVc2UgZm9yIGdlbmVyYWwgb3BlcmF0aW9uYWwgZXZlbnRzIGxpa2UgaG9vayBpbnZvY2F0aW9ucywgc3VjY2Vzc2Z1bFxuICAgKiBjb21wbGV0aW9ucywgb3Igc3RhdGUgY2hhbmdlcy5cbiAgICogQHBhcmFtIG1lc3NhZ2UgLSBPcGVyYXRpb25hbCBtZXNzYWdlIGRlc2NyaWJpbmcgbm9ybWFsIGhvb2sgcHJvZ3Jlc3MuXG4gICAqIEBwYXJhbSBjb250ZXh0IC0gT3B0aW9uYWwgc3RydWN0dXJlZCBtZXRhZGF0YSBtZXJnZWQgaW50byB0aGUgZW1pdHRlZCBldmVudC5cbiAgICogQGV4YW1wbGVcbiAgICogYGBgdHlwZXNjcmlwdFxuICAgKiBsb2dnZXIuaW5mbygnVGFzayBzdGFydGVkJywgeyB0YXNrSWQ6ICd0YXNrLTEyMycsIGNhcmRJZDogJ2NhcmQtNDU2JyB9KTtcbiAgICogYGBgXG4gICAqL1xuICBpbmZvKG1lc3NhZ2U6IHN0cmluZywgY29udGV4dD86IFJlY29yZDxzdHJpbmcsIHVua25vd24+KTogdm9pZCB7XG4gICAgdGhpcy5lbWl0KCdpbmZvJywgbWVzc2FnZSwgY29udGV4dCk7XG4gIH1cblxuICAvKipcbiAgICogTG9ncyBhIHdhcm5pbmcgbWVzc2FnZS5cbiAgICpcbiAgICogVXNlIGZvciBjb25kaXRpb25zIHRoYXQgbWF5IGluZGljYXRlIGNhcmRzIGJ1dCBkb24ndCBwcmV2ZW50XG4gICAqIG9wZXJhdGlvbiwgc3VjaCBhcyBkZXByZWNhdGVkIHBhdHRlcm5zIG9yIHBlcmZvcm1hbmNlIGNvbmNlcm5zLlxuICAgKiBAcGFyYW0gbWVzc2FnZSAtIFdhcm5pbmcgdGV4dCBmb3IgcmVjb3ZlcmFibGUgb3Igc3VzcGljaW91cyBjb25kaXRpb25zLlxuICAgKiBAcGFyYW0gY29udGV4dCAtIE9wdGlvbmFsIHN0cnVjdHVyZWQgbWV0YWRhdGEgbWVyZ2VkIGludG8gdGhlIGVtaXR0ZWQgZXZlbnQuXG4gICAqIEBleGFtcGxlXG4gICAqIGBgYHR5cGVzY3JpcHRcbiAgICogbG9nZ2VyLndhcm4oJ0RlcHJlY2F0ZWQgaG9vayBwYXR0ZXJuIGRldGVjdGVkJywgeyBwYXR0ZXJuOiAnbGVnYWN5TWF0Y2hlcicgfSk7XG4gICAqIGBgYFxuICAgKi9cbiAgd2FybihtZXNzYWdlOiBzdHJpbmcsIGNvbnRleHQ/OiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPik6IHZvaWQge1xuICAgIHRoaXMuZW1pdCgnd2FybicsIG1lc3NhZ2UsIGNvbnRleHQpO1xuICB9XG5cbiAgLyoqXG4gICAqIExvZ3MgYW4gZXJyb3IgbWVzc2FnZS5cbiAgICpcbiAgICogVXNlIGZvciBlcnJvciBjb25kaXRpb25zIHRoYXQgcmVxdWlyZSBhdHRlbnRpb24gYnV0IHdlcmUgaGFuZGxlZFxuICAgKiBncmFjZWZ1bGx5LiBGb3IgZXhjZXB0aW9ucywgcHJlZmVyIHtAbGluayBsb2dFcnJvcn0uXG4gICAqIEBwYXJhbSBtZXNzYWdlIC0gRXJyb3IgdGV4dCBkZXNjcmliaW5nIGEgaGFuZGxlZCBmYWlsdXJlIGNvbmRpdGlvbi5cbiAgICogQHBhcmFtIGNvbnRleHQgLSBPcHRpb25hbCBzdHJ1Y3R1cmVkIG1ldGFkYXRhIG1lcmdlZCBpbnRvIHRoZSBlbWl0dGVkIGV2ZW50LlxuICAgKiBAZXhhbXBsZVxuICAgKiBgYGB0eXBlc2NyaXB0XG4gICAqIGxvZ2dlci5lcnJvcignRmFpbGVkIHRvIHZhbGlkYXRlIGhvb2sgaW5wdXQnLCB7IHJlYXNvbjogJ2VtcHR5IHRhc2tJZCcgfSk7XG4gICAqIGBgYFxuICAgKi9cbiAgZXJyb3IobWVzc2FnZTogc3RyaW5nLCBjb250ZXh0PzogUmVjb3JkPHN0cmluZywgdW5rbm93bj4pOiB2b2lkIHtcbiAgICB0aGlzLmVtaXQoJ2Vycm9yJywgbWVzc2FnZSwgY29udGV4dCk7XG4gIH1cblxuICAvKipcbiAgICogTG9ncyBhIHN0cnVjdHVyZWQgZXJyb3Igd2l0aCBmdWxsIGVycm9yIGRldGFpbHMuXG4gICAqXG4gICAqIFVzZSB0aGlzIGZvciBjYXVnaHQgZXhjZXB0aW9ucy4gTm9uLUVycm9yIHZhbHVlcyBhcmUgbm9ybWFsaXplZCBzbyBoYW5kbGVyc1xuICAgKiBhbHdheXMgcmVjZWl2ZSBhIGNvbnNpc3RlbnQgZXJyb3Igc2hhcGUuXG4gICAqIEBwYXJhbSBlcnJvciAtIFRoZSBlcnJvciB0byBsb2dcbiAgICogQHBhcmFtIG1lc3NhZ2UgLSBIdW1hbi1yZWFkYWJsZSBkZXNjcmlwdGlvbiBvZiB3aGF0IGZhaWxlZFxuICAgKiBAcGFyYW0gY29udGV4dCAtIE9wdGlvbmFsIHN0cnVjdHVyZWQgbWV0YWRhdGEgbWVyZ2VkIGludG8gdGhlIGVtaXR0ZWQgZXZlbnQuXG4gICAqIEBleGFtcGxlXG4gICAqIGBgYHR5cGVzY3JpcHRcbiAgICogdHJ5IHtcbiAgICogICBhd2FpdCBkYW5nZXJvdXNPcGVyYXRpb24oKTtcbiAgICogfSBjYXRjaCAoZXJyKSB7XG4gICAqICAgbG9nZ2VyLmxvZ0Vycm9yKGVyciwgJ0ZhaWxlZCB0byBleGVjdXRlIGRhbmdlcm91cyBvcGVyYXRpb24nLCB7XG4gICAqICAgICBvcGVyYXRpb246ICdkZWxldGUnLFxuICAgKiAgICAgdGFyZ2V0OiAnL2ltcG9ydGFudC9maWxlLnR4dCdcbiAgICogICB9KTtcbiAgICogfVxuICAgKiBgYGBcbiAgICovXG4gIGxvZ0Vycm9yKGVycm9yOiB1bmtub3duLCBtZXNzYWdlOiBzdHJpbmcsIGNvbnRleHQ/OiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPik6IHZvaWQge1xuICAgIGNvbnN0IGVycm9ySW5mbyA9IHRoaXMuZXh0cmFjdEVycm9ySW5mbyhlcnJvcik7XG5cbiAgICBjb25zdCBldmVudDogTG9nRXZlbnQgPSB7XG4gICAgICB0aW1lc3RhbXA6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcbiAgICAgIGxldmVsOiAnZXJyb3InLFxuICAgICAgaG9va1R5cGU6IHRoaXMuY3VycmVudEhvb2tUeXBlLFxuICAgICAgbWVzc2FnZSxcbiAgICAgIGlucHV0OiB0aGlzLmN1cnJlbnRJbnB1dCxcbiAgICAgIGVycm9yOiBlcnJvckluZm8sXG4gICAgICBjb250ZXh0XG4gICAgfTtcblxuICAgIHRoaXMuZGVsaXZlckV2ZW50KGV2ZW50KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBTdWJzY3JpYmVzIGEgaGFuZGxlciB0byBsb2cgZXZlbnRzIGF0IHRoZSBzcGVjaWZpZWQgbGV2ZWwuXG4gICAqXG4gICAqIFRoZSBoYW5kbGVyIHdpbGwgYmUgY2FsbGVkIGZvciBldmVyeSBsb2cgZXZlbnQgYXQgdGhlIHNwZWNpZmllZCBsZXZlbC5cbiAgICogUmV0dXJucyBhbiB1bnN1YnNjcmliZSBmdW5jdGlvbiB0aGF0IHNob3VsZCBiZSBjYWxsZWQgd2hlbiB0aGUgaGFuZGxlclxuICAgKiBpcyBubyBsb25nZXIgbmVlZGVkLiBIYW5kbGVyIGVycm9ycyBhcmUgaWdub3JlZCB0byBhdm9pZCBkaXNydXB0aW5nIGhvb2tzLlxuICAgKiBAcGFyYW0gbGV2ZWwgLSBUaGUgbG9nIGxldmVsIHRvIHN1YnNjcmliZSB0b1xuICAgKiBAcGFyYW0gaGFuZGxlciAtIFRoZSBoYW5kbGVyIGZ1bmN0aW9uIHRvIGNhbGwgZm9yIGVhY2ggZXZlbnRcbiAgICogQHJldHVybnMgQSBmdW5jdGlvbiB0byB1bnN1YnNjcmliZSB0aGUgaGFuZGxlclxuICAgKiBAZXhhbXBsZVxuICAgKiBgYGB0eXBlc2NyaXB0XG4gICAqIC8vIFN1YnNjcmliZSB0byBlcnJvciBldmVudHNcbiAgICogY29uc3QgdW5zdWJzY3JpYmUgPSBsb2dnZXIub24oJ2Vycm9yJywgKGV2ZW50KSA9PiB7XG4gICAqICAgY29uc29sZS5lcnJvcihgWyR7ZXZlbnQuaG9va1R5cGV9XSAke2V2ZW50Lm1lc3NhZ2V9YCk7XG4gICAqICAgaWYgKGV2ZW50LmVycm9yKSB7XG4gICAqICAgICBjb25zb2xlLmVycm9yKGV2ZW50LmVycm9yLnN0YWNrKTtcbiAgICogICB9XG4gICAqIH0pO1xuICAgKlxuICAgKiAvLyBMYXRlciwgY2xlYW4gdXBcbiAgICogdW5zdWJzY3JpYmUoKTtcbiAgICogYGBgXG4gICAqIEBleGFtcGxlXG4gICAqIGBgYHR5cGVzY3JpcHRcbiAgICogLy8gRm9yd2FyZCB0byBleHRlcm5hbCBsb2dnaW5nIGxpYnJhcnlcbiAgICogaW1wb3J0IHBpbm8gZnJvbSAncGlubyc7XG4gICAqIGNvbnN0IHBpbm9Mb2dnZXIgPSBwaW5vKCk7XG4gICAqXG4gICAqIGxvZ2dlci5vbignaW5mbycsIChldmVudCkgPT4gcGlub0xvZ2dlci5pbmZvKGV2ZW50LCBldmVudC5tZXNzYWdlKSk7XG4gICAqIGxvZ2dlci5vbignd2FybicsIChldmVudCkgPT4gcGlub0xvZ2dlci53YXJuKGV2ZW50LCBldmVudC5tZXNzYWdlKSk7XG4gICAqIGxvZ2dlci5vbignZXJyb3InLCAoZXZlbnQpID0+IHBpbm9Mb2dnZXIuZXJyb3IoZXZlbnQsIGV2ZW50Lm1lc3NhZ2UpKTtcbiAgICogYGBgXG4gICAqL1xuICBvbihsZXZlbDogTG9nTGV2ZWwsIGhhbmRsZXI6IExvZ0V2ZW50SGFuZGxlcik6IFVuc3Vic2NyaWJlIHtcbiAgICBjb25zdCBsZXZlbEhhbmRsZXJzID0gdGhpcy5oYW5kbGVycy5nZXQobGV2ZWwpO1xuICAgIGlmIChsZXZlbEhhbmRsZXJzKSB7XG4gICAgICBsZXZlbEhhbmRsZXJzLmFkZChoYW5kbGVyKTtcbiAgICB9XG5cbiAgICByZXR1cm4gKCkgPT4ge1xuICAgICAgbGV2ZWxIYW5kbGVycz8uZGVsZXRlKGhhbmRsZXIpO1xuICAgIH07XG4gIH1cblxuICAvKipcbiAgICogU2V0cyB0aGUgY3VycmVudCBob29rIGNvbnRleHQgZm9yIGVucmljaGluZyBsb2cgZXZlbnRzLlxuICAgKlxuICAgKiBUaGlzIGlzIGNhbGxlZCBpbnRlcm5hbGx5IGJ5IHRoZSBydW50aW1lIGJlZm9yZSBpbnZva2luZyBob29rIGhhbmRsZXJzLlxuICAgKiBZb3UgdHlwaWNhbGx5IGRvbid0IG5lZWQgdG8gY2FsbCB0aGlzIGRpcmVjdGx5LlxuICAgKiBAcGFyYW0gaG9va1R5cGUgLSBUaGUgdHlwZSBvZiBob29rIGJlaW5nIGV4ZWN1dGVkXG4gICAqIEBwYXJhbSBpbnB1dCAtIFRoZSBob29rIGlucHV0IGRhdGFcbiAgICogQGludGVybmFsXG4gICAqL1xuICBzZXRDb250ZXh0KGhvb2tUeXBlOiBzdHJpbmcgfCB1bmRlZmluZWQsIGlucHV0OiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPiB8IHVuZGVmaW5lZCk6IHZvaWQge1xuICAgIHRoaXMuY3VycmVudEhvb2tUeXBlID0gaG9va1R5cGU7XG4gICAgdGhpcy5jdXJyZW50SW5wdXQgPSBpbnB1dDtcbiAgfVxuXG4gIC8qKlxuICAgKiBDbGVhcnMgdGhlIGN1cnJlbnQgaG9vayBjb250ZXh0LlxuICAgKlxuICAgKiBDYWxsZWQgaW50ZXJuYWxseSBieSB0aGUgcnVudGltZSBhZnRlciBob29rIGV4ZWN1dGlvbiBjb21wbGV0ZXMuXG4gICAqIEBpbnRlcm5hbFxuICAgKi9cbiAgY2xlYXJDb250ZXh0KCk6IHZvaWQge1xuICAgIHRoaXMuY3VycmVudEhvb2tUeXBlID0gdW5kZWZpbmVkO1xuICAgIHRoaXMuY3VycmVudElucHV0ID0gdW5kZWZpbmVkO1xuICB9XG5cbiAgLyoqXG4gICAqIFNldHMgYSBkZWZhdWx0IGxvZyBmaWxlIHBhdGggdGhhdCBvbmx5IHRha2VzIGVmZmVjdCBpZiBubyBvdGhlciBzb3VyY2VcbiAgICogaGFzIGNvbmZpZ3VyZWQgZmlsZSBsb2dnaW5nLlxuICAgKlxuICAgKiBUaGlzIGlzIHRoZSBsb3dlc3QtcHJpb3JpdHkgZmlsZSBwYXRoIHNvdXJjZS4gSXQgd2lsbCBiZSBpZ25vcmVkIGlmXG4gICAqIGFueSBvZiB0aGVzZSBoYXZlIGFscmVhZHkgc2V0IGEgcGF0aDpcbiAgICogLSBgbG9nRmlsZVBhdGhgIGluIHRoZSBjb25zdHJ1Y3RvciBjb25maWdcbiAgICogLSBgQ0FSRFNfSE9PS1NfTE9HX0ZJTEVgIGVudmlyb25tZW50IHZhcmlhYmxlXG4gICAqIC0ge0BsaW5rIHNldExvZ0ZpbGV9IGNhbGxlZCBhdCBydW50aW1lXG4gICAqXG4gICAqIEludGVuZGVkIGZvciB1c2UgYnkgQ0xJIGVudHJ5IHBvaW50cyAoZS5nLiwgdGhlIGAtLWxvZ2AgZmxhZykuXG4gICAqIEBwYXJhbSBmaWxlUGF0aCAtIERlZmF1bHQgcGF0aCB0byB0aGUgbG9nIGZpbGVcbiAgICogQGV4YW1wbGVcbiAgICogYGBgdHlwZXNjcmlwdFxuICAgKiAvLyBXaXJlIC0tbG9nIENMSSBhcmd1bWVudCBhcyBhIGZhbGxiYWNrXG4gICAqIGlmIChhcmdzLmxvZykge1xuICAgKiAgIGxvZ2dlci5zZXREZWZhdWx0TG9nRmlsZShhcmdzLmxvZyk7XG4gICAqIH1cbiAgICogYGBgXG4gICAqL1xuICBzZXREZWZhdWx0TG9nRmlsZShmaWxlUGF0aDogc3RyaW5nKTogdm9pZCB7XG4gICAgaWYgKHRoaXMubG9nRmlsZVBhdGggPT09IG51bGwpIHtcbiAgICAgIHRoaXMubG9nRmlsZVBhdGggPSBmaWxlUGF0aDtcbiAgICAgIHRoaXMuZmlsZUluaXRpYWxpemVkID0gZmFsc2U7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIENvbmZpZ3VyZXMgdGhlIGxvZyBmaWxlIHBhdGggYXQgcnVudGltZS5cbiAgICpcbiAgICogQ2FsbCB0aGlzIHRvIGVuYWJsZSBvciBjaGFuZ2UgZmlsZSBsb2dnaW5nLiBTZXR0aW5nIHRvIGBudWxsYCBkaXNhYmxlc1xuICAgKiBmaWxlIGxvZ2dpbmcgYW5kIGNsb3NlcyBhbnkgb3BlbiBmaWxlIGhhbmRsZS4gRGlyZWN0b3JpZXMgYXJlIGNyZWF0ZWRcbiAgICogb24gZGVtYW5kIHdoZW4gdGhlIGZpcnN0IHdyaXRlIG9jY3Vycy5cbiAgICogQHBhcmFtIGZpbGVQYXRoIC0gUGF0aCB0byB0aGUgbG9nIGZpbGUsIG9yIG51bGwgdG8gZGlzYWJsZVxuICAgKiBAZXhhbXBsZVxuICAgKiBgYGB0eXBlc2NyaXB0XG4gICAqIC8vIEVuYWJsZSBmaWxlIGxvZ2dpbmcgYXQgcnVudGltZVxuICAgKiBsb2dnZXIuc2V0TG9nRmlsZSgnL3Zhci9sb2cvY2FyZHMtc2RrLmxvZycpO1xuICAgKlxuICAgKiAvLyBEaXNhYmxlIGZpbGUgbG9nZ2luZ1xuICAgKiBsb2dnZXIuc2V0TG9nRmlsZShudWxsKTtcbiAgICogYGBgXG4gICAqL1xuICBzZXRMb2dGaWxlKGZpbGVQYXRoOiBzdHJpbmcgfCBudWxsKTogdm9pZCB7XG4gICAgLy8gQ2xvc2UgZXhpc3RpbmcgZmlsZSBpZiBvcGVuXG4gICAgaWYgKHRoaXMubG9nRmlsZUZkICE9PSBudWxsKSB7XG4gICAgICB0cnkge1xuICAgICAgICBjbG9zZVN5bmModGhpcy5sb2dGaWxlRmQpO1xuICAgICAgfSBjYXRjaCB7XG4gICAgICAgIC8vIElnbm9yZSBlcnJvcnMgb24gY2xvc2VcbiAgICAgIH1cbiAgICAgIHRoaXMubG9nRmlsZUZkID0gbnVsbDtcbiAgICB9XG5cbiAgICB0aGlzLmxvZ0ZpbGVQYXRoID0gZmlsZVBhdGg7XG4gICAgdGhpcy5maWxlSW5pdGlhbGl6ZWQgPSBmYWxzZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDbG9zZXMgYWxsIHJlc291cmNlcyBoZWxkIGJ5IHRoZSBsb2dnZXIuXG4gICAqXG4gICAqIENhbGwgdGhpcyBkdXJpbmcgZ3JhY2VmdWwgc2h1dGRvd24gdG8gZW5zdXJlIGFsbCBsb2cgZGF0YSBpcyBmbHVzaGVkLlxuICAgKiBTYWZlIHRvIGNhbGwgbXVsdGlwbGUgdGltZXMuXG4gICAqIEBleGFtcGxlXG4gICAqIGBgYHR5cGVzY3JpcHRcbiAgICogcHJvY2Vzcy5vbignZXhpdCcsICgpID0+IHtcbiAgICogICBsb2dnZXIuY2xvc2UoKTtcbiAgICogfSk7XG4gICAqIGBgYFxuICAgKi9cbiAgY2xvc2UoKTogdm9pZCB7XG4gICAgaWYgKHRoaXMubG9nRmlsZUZkICE9PSBudWxsKSB7XG4gICAgICB0cnkge1xuICAgICAgICBjbG9zZVN5bmModGhpcy5sb2dGaWxlRmQpO1xuICAgICAgfSBjYXRjaCB7XG4gICAgICAgIC8vIElnbm9yZSBlcnJvcnMgb24gY2xvc2VcbiAgICAgIH1cbiAgICAgIHRoaXMubG9nRmlsZUZkID0gbnVsbDtcbiAgICB9XG4gICAgdGhpcy5maWxlSW5pdGlhbGl6ZWQgPSBmYWxzZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDaGVja3MgaWYgdGhlcmUgYXJlIGFueSBhY3RpdmUgaGFuZGxlcnMgb3IgZGVzdGluYXRpb25zLlxuICAgKlxuICAgKiBSZXR1cm5zIHRydWUgaWYgYW55IGhhbmRsZXJzIGFyZSByZWdpc3RlcmVkIG9yIGZpbGUgbG9nZ2luZyBpcyBlbmFibGVkLlxuICAgKiBVc2VmdWwgZm9yIGRlY2lkaW5nIHdoZXRoZXIgdG8gY29tcHV0ZSBleHBlbnNpdmUgbG9nIGNvbnRleHQuXG4gICAqIEByZXR1cm5zIFdoZXRoZXIgdGhlIGxvZ2dlciBoYXMgYW55IGFjdGl2ZSBvdXRwdXQgZGVzdGluYXRpb25zXG4gICAqL1xuICBoYXNEZXN0aW5hdGlvbnMoKTogYm9vbGVhbiB7XG4gICAgY29uc3QgaGFzSGFuZGxlcnMgPSBBcnJheS5mcm9tKHRoaXMuaGFuZGxlcnMudmFsdWVzKCkpLnNvbWUoKGhhbmRsZXJzKSA9PiBoYW5kbGVycy5zaXplID4gMCk7XG4gICAgcmV0dXJuIGhhc0hhbmRsZXJzIHx8IHRoaXMubG9nRmlsZVBhdGggIT09IG51bGw7XG4gIH1cblxuICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gIC8vIFByaXZhdGUgTWV0aG9kc1xuICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbiAgLyoqXG4gICAqIEVtaXRzIGEgbG9nIGV2ZW50LlxuICAgKiBAcGFyYW0gbGV2ZWwgLSBUaGUgc2V2ZXJpdHkgbGV2ZWwgb2YgdGhlIGV2ZW50XG4gICAqIEBwYXJhbSBtZXNzYWdlIC0gVGhlIGxvZyBtZXNzYWdlXG4gICAqIEBwYXJhbSBjb250ZXh0IC0gT3B0aW9uYWwgYWRkaXRpb25hbCBjb250ZXh0IGRhdGFcbiAgICovXG4gIHByaXZhdGUgZW1pdChsZXZlbDogTG9nTGV2ZWwsIG1lc3NhZ2U6IHN0cmluZywgY29udGV4dD86IFJlY29yZDxzdHJpbmcsIHVua25vd24+KTogdm9pZCB7XG4gICAgY29uc3QgZXZlbnQ6IExvZ0V2ZW50ID0ge1xuICAgICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXG4gICAgICBsZXZlbCxcbiAgICAgIGhvb2tUeXBlOiB0aGlzLmN1cnJlbnRIb29rVHlwZSxcbiAgICAgIG1lc3NhZ2UsXG4gICAgICBpbnB1dDogdGhpcy5jdXJyZW50SW5wdXQsXG4gICAgICBjb250ZXh0XG4gICAgfTtcblxuICAgIHRoaXMuZGVsaXZlckV2ZW50KGV2ZW50KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBEZWxpdmVycyBhbiBldmVudCB0byBhbGwgcmVnaXN0ZXJlZCBkZXN0aW5hdGlvbnMuXG4gICAqIEBwYXJhbSBldmVudCAtIFRoZSBsb2cgZXZlbnQgdG8gZGVsaXZlclxuICAgKi9cbiAgcHJpdmF0ZSBkZWxpdmVyRXZlbnQoZXZlbnQ6IExvZ0V2ZW50KTogdm9pZCB7XG4gICAgLy8gRGVsaXZlciB0byBldmVudCBoYW5kbGVyc1xuICAgIGNvbnN0IGxldmVsSGFuZGxlcnMgPSB0aGlzLmhhbmRsZXJzLmdldChldmVudC5sZXZlbCk7XG4gICAgaWYgKGxldmVsSGFuZGxlcnMpIHtcbiAgICAgIGZvciAoY29uc3QgaGFuZGxlciBvZiBsZXZlbEhhbmRsZXJzKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgaGFuZGxlcihldmVudCk7XG4gICAgICAgIH0gY2F0Y2gge1xuICAgICAgICAgIC8vIFNpbGVudGx5IGlnbm9yZSBoYW5kbGVyIGVycm9ycyB0byBub3QgZGlzcnVwdCBob29rIGV4ZWN1dGlvblxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gV3JpdGUgdG8gZmlsZSBpZiBjb25maWd1cmVkXG4gICAgdGhpcy53cml0ZVRvRmlsZShldmVudCk7XG4gIH1cblxuICAvKipcbiAgICogV3JpdGVzIGFuIGV2ZW50IHRvIHRoZSBsb2cgZmlsZS5cbiAgICogQHBhcmFtIGV2ZW50IC0gVGhlIGxvZyBldmVudCB0byB3cml0ZVxuICAgKi9cbiAgcHJpdmF0ZSB3cml0ZVRvRmlsZShldmVudDogTG9nRXZlbnQpOiB2b2lkIHtcbiAgICBpZiAoIXRoaXMubG9nRmlsZVBhdGgpIHJldHVybjtcblxuICAgIC8vIExhenkgaW5pdGlhbGl6YXRpb24gb2YgZmlsZSBoYW5kbGVcbiAgICBpZiAoIXRoaXMuZmlsZUluaXRpYWxpemVkKSB7XG4gICAgICB0aGlzLmluaXRpYWxpemVGaWxlKCk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMubG9nRmlsZUZkID09PSBudWxsKSByZXR1cm47XG5cbiAgICB0cnkge1xuICAgICAgY29uc3QgbGluZSA9IGAke0pTT04uc3RyaW5naWZ5KGV2ZW50KX1cXG5gO1xuICAgICAgd3JpdGVTeW5jKHRoaXMubG9nRmlsZUZkLCBsaW5lKTtcbiAgICB9IGNhdGNoIHtcbiAgICAgIC8vIFNpbGVudGx5IGlnbm9yZSBmaWxlIHdyaXRlIGVycm9ycyB0byBub3QgZGlzcnVwdCBob29rIGV4ZWN1dGlvblxuICAgICAgLy8gVGhpcyBmb2xsb3dzIHRoZSByaXNrIG1pdGlnYXRpb246IFwiR3JhY2VmdWwgZGVncmFkYXRpb24gLSBsb2cgd3JpdGVcbiAgICAgIC8vIGZhaWx1cmVzIGFyZSBzaWxlbnRseSBpZ25vcmVkIHRvIG5vdCBkaXNydXB0IGhvb2sgZXhlY3V0aW9uXCJcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogSW5pdGlhbGl6ZXMgdGhlIGxvZyBmaWxlIGZvciB3cml0aW5nLlxuICAgKi9cbiAgcHJpdmF0ZSBpbml0aWFsaXplRmlsZSgpOiB2b2lkIHtcbiAgICB0aGlzLmZpbGVJbml0aWFsaXplZCA9IHRydWU7XG5cbiAgICBpZiAoIXRoaXMubG9nRmlsZVBhdGgpIHJldHVybjtcblxuICAgIHRyeSB7XG4gICAgICAvLyBFbnN1cmUgZGlyZWN0b3J5IGV4aXN0c1xuICAgICAgY29uc3QgZGlyID0gZGlybmFtZSh0aGlzLmxvZ0ZpbGVQYXRoKTtcbiAgICAgIGlmICghZXhpc3RzU3luYyhkaXIpKSB7XG4gICAgICAgIG1rZGlyU3luYyhkaXIsIHsgcmVjdXJzaXZlOiB0cnVlIH0pO1xuICAgICAgfVxuXG4gICAgICAvLyBPcGVuIGZpbGUgZm9yIGFwcGVuZGluZ1xuICAgICAgdGhpcy5sb2dGaWxlRmQgPSBvcGVuU3luYyh0aGlzLmxvZ0ZpbGVQYXRoLCAnYScpO1xuICAgIH0gY2F0Y2gge1xuICAgICAgLy8gU2lsZW50bHkgaWdub3JlIGZpbGUgaW5pdGlhbGl6YXRpb24gZXJyb3JzXG4gICAgICB0aGlzLmxvZ0ZpbGVGZCA9IG51bGw7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEV4dHJhY3RzIHN0cnVjdHVyZWQgZXJyb3IgaW5mb3JtYXRpb24gZnJvbSBhbiB1bmtub3duIGVycm9yLlxuICAgKiBAcGFyYW0gZXJyb3IgLSBUaGUgZXJyb3IgdG8gZXh0cmFjdCBpbmZvcm1hdGlvbiBmcm9tXG4gICAqIEByZXR1cm5zIFN0cnVjdHVyZWQgZXJyb3IgaW5mb3JtYXRpb25cbiAgICovXG4gIHByaXZhdGUgZXh0cmFjdEVycm9ySW5mbyhlcnJvcjogdW5rbm93bik6IExvZ0V2ZW50RXJyb3Ige1xuICAgIGlmIChlcnJvciBpbnN0YW5jZW9mIEVycm9yKSB7XG4gICAgICBjb25zdCBpbmZvOiBMb2dFdmVudEVycm9yID0ge1xuICAgICAgICBuYW1lOiBlcnJvci5uYW1lLFxuICAgICAgICBtZXNzYWdlOiBlcnJvci5tZXNzYWdlLFxuICAgICAgICBzdGFjazogZXJyb3Iuc3RhY2tcbiAgICAgIH07XG5cbiAgICAgIC8vIEV4dHJhY3QgY2F1c2UgY2hhaW4gaWYgcHJlc2VudFxuICAgICAgaWYgKGVycm9yLmNhdXNlICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgaW5mby5jYXVzZSA9IHRoaXMuZXh0cmFjdEVycm9ySW5mbyhlcnJvci5jYXVzZSk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBpbmZvO1xuICAgIH1cblxuICAgIC8vIEhhbmRsZSBub24tRXJyb3IgdmFsdWVzXG4gICAgcmV0dXJuIHtcbiAgICAgIG5hbWU6ICdVbmtub3duRXJyb3InLFxuICAgICAgbWVzc2FnZTogU3RyaW5nKGVycm9yKVxuICAgIH07XG4gIH1cbn1cblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gU2luZ2xldG9uIEV4cG9ydFxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4vKipcbiAqIEdsb2JhbCBsb2dnZXIgaW5zdGFuY2UgZm9yIENhcmRzIEV4dGVuc2lvbiBob29rcy5cbiAqXG4gKiBVc2UgdGhpcyBzaW5nbGV0b24gZm9yIGFsbCBsb2dnaW5nIHdpdGhpbiBob29rcy4gVGhlIGxvZ2dlciBpcyBjb25maWd1cmVkXG4gKiB2aWEgZW52aXJvbm1lbnQgdmFyaWFibGVzIGFuZCBzdXBwb3J0cyBldmVudCBzdWJzY3JpcHRpb24gZm9yIGN1c3RvbVxuICogZGVzdGluYXRpb25zLlxuICpcbiAqICMjIENvbmZpZ3VyYXRpb25cbiAqXG4gKiB8IEVudmlyb25tZW50IFZhcmlhYmxlIHwgRGVzY3JpcHRpb24gfFxuICogfC0tLS0tLS0tLS0tLS0tLS0tLS0tLXwtLS0tLS0tLS0tLS0tfFxuICogfCBgQ0FSRFNfSE9PS1NfTE9HX0ZJTEVgIHwgUGF0aCB0byBsb2cgZmlsZSAoSlNPTiBMaW5lcyBmb3JtYXQpIHxcbiAqXG4gKiAjIyBVc2FnZSBpbiBIb29rc1xuICpcbiAqIFRoZSBsb2dnZXIgY2FuIGJlIHVzZWQgZGlyZWN0bHkgd2l0aGluIGhvb2sgaGFuZGxlcnM6XG4gKlxuICogYGBgdHlwZXNjcmlwdFxuICogaW1wb3J0IHsgbG9nZ2VyIH0gZnJvbSAnQGNhcmRzL3Nkay9jb25maWcnO1xuICpcbiAqIC8vIEluIGEgaG9vayBoYW5kbGVyXG4gKiBsb2dnZXIud2FybignVGFzayBzdGFydGluZyBpbiBpbnRlcmFjdGl2ZSBtb2RlJyk7XG4gKiBgYGBcbiAqXG4gKiAjIyBFeHRlcm5hbCBJbnRlZ3JhdGlvblxuICpcbiAqIFN1YnNjcmliZSB0byBldmVudHMgdG8gZm9yd2FyZCBsb2dzIHRvIGV4dGVybmFsIHN5c3RlbXM6XG4gKlxuICogYGBgdHlwZXNjcmlwdFxuICogaW1wb3J0IHsgbG9nZ2VyIH0gZnJvbSAnQGNhcmRzL3Nkay9jb25maWcnO1xuICogaW1wb3J0IHBpbm8gZnJvbSAncGlubyc7XG4gKlxuICogY29uc3QgcGlub0xvZ2dlciA9IHBpbm8oeyBsZXZlbDogJ2RlYnVnJyB9KTtcbiAqXG4gKiBsb2dnZXIub24oJ2RlYnVnJywgKGV2ZW50KSA9PiBwaW5vTG9nZ2VyLmRlYnVnKGV2ZW50LCBldmVudC5tZXNzYWdlKSk7XG4gKiBsb2dnZXIub24oJ2luZm8nLCAoZXZlbnQpID0+IHBpbm9Mb2dnZXIuaW5mbyhldmVudCwgZXZlbnQubWVzc2FnZSkpO1xuICogbG9nZ2VyLm9uKCd3YXJuJywgKGV2ZW50KSA9PiBwaW5vTG9nZ2VyLndhcm4oZXZlbnQsIGV2ZW50Lm1lc3NhZ2UpKTtcbiAqIGxvZ2dlci5vbignZXJyb3InLCAoZXZlbnQpID0+IHBpbm9Mb2dnZXIuZXJyb3IoZXZlbnQsIGV2ZW50Lm1lc3NhZ2UpKTtcbiAqIGBgYFxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIC8vIERpcmVjdCB1c2FnZVxuICogaW1wb3J0IHsgbG9nZ2VyIH0gZnJvbSAnQGNhcmRzL3Nkay9jb25maWcnO1xuICpcbiAqIGxvZ2dlci5pbmZvKCdTdGFydGluZyBvcGVyYXRpb24nKTtcbiAqIGxvZ2dlci53YXJuKCdSZXNvdXJjZSBsaW1pdCBhcHByb2FjaGluZycsIHsgdXNhZ2U6IDAuOSB9KTtcbiAqXG4gKiB0cnkge1xuICogICBhd2FpdCByaXNreU9wZXJhdGlvbigpO1xuICogfSBjYXRjaCAoZXJyKSB7XG4gKiAgIGxvZ2dlci5sb2dFcnJvcihlcnIsICdSaXNreSBvcGVyYXRpb24gZmFpbGVkJyk7XG4gKiB9XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNvbnN0IGxvZ2dlciA9IG5ldyBMb2dnZXIoKTtcbiIsICIvKipcbiAqIFNvY2tldCBjbGllbnQgZm9yIHJ1bnRpbWUtdG8tZGlzcGF0Y2hlciBjb21tdW5pY2F0aW9uLlxuICpcbiAqIENvbm5lY3RzIHRvIGEgVW5peCBkb21haW4gc29ja2V0IGNyZWF0ZWQgYnkgQWN0aW9uRGlzcGF0Y2hlciBhbmQgaGFuZGxlc1xuICogTkRKU09OIChuZXdsaW5lLWRlbGltaXRlZCBKU09OKSBwcm90b2NvbCBmb3IgcmVjZWl2aW5nIGNvbW1hbmRzIGFuZCBzZW5kaW5nXG4gKiByZXNwb25zZXMuXG4gKlxuICpcbiAqIEBzdW1tYXJ5IFNvY2tldCBjbGllbnQgZm9yIHJ1bnRpbWUtdG8tZGlzcGF0Y2hlciBjb21tdW5pY2F0aW9uXG4gKiBAbW9kdWxlXG4gKi9cblxuaW1wb3J0ICogYXMgbmV0IGZyb20gJ25vZGU6bmV0JztcblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gVHlwZXNcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuLyoqXG4gKiBDb21tYW5kcyB0aGF0IGNhbiBiZSByZWNlaXZlZCBmcm9tIHRoZSBBY3Rpb25EaXNwYXRjaGVyIHZpYSBzb2NrZXQuXG4gKlxuICogVXNlcyBOREpTT04gKG5ld2xpbmUtZGVsaW1pdGVkIEpTT04pIHByb3RvY29sLlxuICovXG5leHBvcnQgdHlwZSBTb2NrZXRDb21tYW5kID0geyB0eXBlOiAnY2FuY2VsJyB9IHwgeyB0eXBlOiAnc3dpdGNoVG9JbnRlcmFjdGl2ZScgfTtcblxuLyoqXG4gKiBSZXNwb25zZSBzZW50IGJhY2sgdG8gdGhlIEFjdGlvbkRpc3BhdGNoZXIgd2hlbiBzd2l0Y2hUb0ludGVyYWN0aXZlIGlzIGhhbmRsZWQuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgU3dpdGNoVG9JbnRlcmFjdGl2ZVJlc3BvbnNlIHtcbiAgdHlwZTogJ3N3aXRjaFRvSW50ZXJhY3RpdmVSZXNwb25zZSc7XG4gIGRhdGE6IHVua25vd247XG59XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIFNvY2tldENsaWVudFxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4vKipcbiAqIENsaWVudCBmb3IgdGhlIE5ESlNPTiBzb2NrZXQgcHJvdG9jb2wgYmV0d2VlbiB0aGUgYWN0aW9uIHJ1bnRpbWUgYW5kXG4gKiBBY3Rpb25EaXNwYXRjaGVyLlxuICpcbiAqIFJlY2VpdmVzIGNvbW1hbmRzIChjYW5jZWwsIHN3aXRjaFRvSW50ZXJhY3RpdmUpIGFuZCBzZW5kcyByZXNwb25zZXNcbiAqIChzd2l0Y2hUb0ludGVyYWN0aXZlUmVzcG9uc2UpIG92ZXIgYSBVbml4IGRvbWFpbiBzb2NrZXQuXG4gKlxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGNvbnN0IGNsaWVudCA9IGF3YWl0IFNvY2tldENsaWVudC5jb25uZWN0KCcvcGF0aC90by9zb2NrZXQnKTtcbiAqIGNsaWVudC5vbkNvbW1hbmQoKGNvbW1hbmQpID0+IHtcbiAqICAgaWYgKGNvbW1hbmQudHlwZSA9PT0gJ2NhbmNlbCcpIHsgLi4uIH1cbiAqIH0pO1xuICogYGBgXG4gKi9cbmV4cG9ydCBjbGFzcyBTb2NrZXRDbGllbnQge1xuICBwcml2YXRlIHNvY2tldDogbmV0LlNvY2tldDtcbiAgcHJpdmF0ZSBidWZmZXIgPSAnJztcbiAgcHJpdmF0ZSBjb21tYW5kSGFuZGxlcj86IChjb21tYW5kOiBTb2NrZXRDb21tYW5kKSA9PiB2b2lkO1xuXG4gIHByaXZhdGUgY29uc3RydWN0b3Ioc29ja2V0OiBuZXQuU29ja2V0KSB7XG4gICAgdGhpcy5zb2NrZXQgPSBzb2NrZXQ7XG5cbiAgICBzb2NrZXQub24oJ2RhdGEnLCAoY2h1bmspID0+IHtcbiAgICAgIHRoaXMuYnVmZmVyICs9IGNodW5rLnRvU3RyaW5nKCk7XG4gICAgICAvLyBQYXJzZSBOREpTT04gLSBzcGxpdCBieSBuZXdsaW5lc1xuICAgICAgY29uc3QgbGluZXMgPSB0aGlzLmJ1ZmZlci5zcGxpdCgnXFxuJyk7XG4gICAgICB0aGlzLmJ1ZmZlciA9IGxpbmVzLnBvcCgpID8/ICcnOyAvLyBLZWVwIGluY29tcGxldGUgbGluZSBpbiBidWZmZXJcblxuICAgICAgZm9yIChjb25zdCBsaW5lIG9mIGxpbmVzKSB7XG4gICAgICAgIGlmIChsaW5lLnRyaW0oKSA9PT0gJycpIGNvbnRpbnVlO1xuICAgICAgICB0cnkge1xuICAgICAgICAgIGNvbnN0IHBhcnNlZCA9IEpTT04ucGFyc2UobGluZSkgYXMgU29ja2V0Q29tbWFuZDtcbiAgICAgICAgICB0aGlzLmNvbW1hbmRIYW5kbGVyPy4ocGFyc2VkKTtcbiAgICAgICAgfSBjYXRjaCB7XG4gICAgICAgICAgLy8gTWFsZm9ybWVkIEpTT04gb24gc29ja2V0IGlzIGlnbm9yZWQgKHBlciBwbGFuKVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogQ29ubmVjdCB0byBhIFVuaXggZG9tYWluIHNvY2tldCBhdCB0aGUgZ2l2ZW4gcGF0aC5cbiAgICpcbiAgICogQHBhcmFtIHNvY2tldFBhdGggLSBQYXRoIHRvIHRoZSBVbml4IGRvbWFpbiBzb2NrZXRcbiAgICogQHJldHVybnMgQSBjb25uZWN0ZWQgU29ja2V0Q2xpZW50IGluc3RhbmNlXG4gICAqIEB0aHJvd3MgRXJyb3IgaWYgdGhlIGNvbm5lY3Rpb24gZmFpbHNcbiAgICovXG4gIHN0YXRpYyBjb25uZWN0KHNvY2tldFBhdGg6IHN0cmluZyk6IFByb21pc2U8U29ja2V0Q2xpZW50PiB7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgIGNvbnN0IHNvY2tldCA9IG5ldC5jcmVhdGVDb25uZWN0aW9uKHNvY2tldFBhdGgsICgpID0+IHtcbiAgICAgICAgcmVzb2x2ZShuZXcgU29ja2V0Q2xpZW50KHNvY2tldCkpO1xuICAgICAgfSk7XG4gICAgICBzb2NrZXQub24oJ2Vycm9yJywgcmVqZWN0KTtcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZWdpc3RlciBhIGhhbmRsZXIgZm9yIGluY29taW5nIHNvY2tldCBjb21tYW5kcy5cbiAgICpcbiAgICogT25seSBvbmUgaGFuZGxlciBjYW4gYmUgcmVnaXN0ZXJlZCBhdCBhIHRpbWUuIFN1YnNlcXVlbnQgY2FsbHMgcmVwbGFjZVxuICAgKiB0aGUgcHJldmlvdXMgaGFuZGxlci5cbiAgICpcbiAgICogQHBhcmFtIGhhbmRsZXIgLSBGdW5jdGlvbiB0byBjYWxsIHdoZW4gYSBjb21tYW5kIGlzIHJlY2VpdmVkXG4gICAqL1xuICBvbkNvbW1hbmQoaGFuZGxlcjogKGNvbW1hbmQ6IFNvY2tldENvbW1hbmQpID0+IHZvaWQpOiB2b2lkIHtcbiAgICB0aGlzLmNvbW1hbmRIYW5kbGVyID0gaGFuZGxlcjtcbiAgfVxuXG4gIC8qKlxuICAgKiBTZW5kIGEgcmVzcG9uc2UgYmFjayB0byB0aGUgQWN0aW9uRGlzcGF0Y2hlci5cbiAgICpcbiAgICogQHBhcmFtIHJlc3BvbnNlIC0gVGhlIHJlc3BvbnNlIHRvIHNlbmQgYXMgTkRKU09OXG4gICAqL1xuICBzZW5kUmVzcG9uc2UocmVzcG9uc2U6IFN3aXRjaFRvSW50ZXJhY3RpdmVSZXNwb25zZSk6IHZvaWQge1xuICAgIHRoaXMuc29ja2V0LndyaXRlKGAke0pTT04uc3RyaW5naWZ5KHJlc3BvbnNlKX1cXG5gKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBTZW5kIGEgcmVzcG9uc2UgYW5kIGNhbGwgY2FsbGJhY2sgd2hlbiBmbHVzaGVkLlxuICAgKlxuICAgKiBVc2VkIHRvIGd1YXJhbnRlZSBmbHVzaCBiZWZvcmUgcHJvY2Vzcy5leGl0LlxuICAgKlxuICAgKiBAcGFyYW0gcmVzcG9uc2UgLSBUaGUgcmVzcG9uc2UgdG8gc2VuZCBhcyBOREpTT05cbiAgICogQHBhcmFtIGNhbGxiYWNrIC0gQ2FsbGVkIGFmdGVyIHRoZSBkYXRhIGlzIGZsdXNoZWQgdG8gdGhlIHNvY2tldFxuICAgKi9cbiAgc2VuZFJlc3BvbnNlVGhlbihyZXNwb25zZTogU3dpdGNoVG9JbnRlcmFjdGl2ZVJlc3BvbnNlLCBjYWxsYmFjazogKCkgPT4gdm9pZCk6IHZvaWQge1xuICAgIHRoaXMuc29ja2V0LndyaXRlKGAke0pTT04uc3RyaW5naWZ5KHJlc3BvbnNlKX1cXG5gLCBjYWxsYmFjayk7XG4gIH1cblxuICAvKipcbiAgICogQ2xvc2UgdGhlIHNvY2tldCBjb25uZWN0aW9uLlxuICAgKi9cbiAgY2xvc2UoKTogdm9pZCB7XG4gICAgdGhpcy5zb2NrZXQuZGVzdHJveSgpO1xuICB9XG59XG4iLCAiLyoqXG4gKiBSdW50aW1lIG9yY2hlc3RyYXRpb24gZm9yIGNvbXBpbGVkIENhcmRzIGFjdGlvbiBhbmQgdHlwZSBoYW5kbGVycy5cbiAqXG4gKiBUaGlzIG1vZHVsZSBpcyBidW5kbGVkIGludG8gY29tcGlsZWQgaGFuZGxlcnMgYnkgdGhlIENMSS4gSXQgcHJvdmlkZXMgdGhlXG4gKiBleGVjdXRpb24gaGFybmVzcyB0aGF0IHJlYWRzIGhhbmRsZXIgaW5wdXQgZnJvbSBlbnZpcm9ubWVudCB2YXJpYWJsZXMsIHNldHNcbiAqIHVwIHRoZSBsb2dnZXIgY29udGV4dCwgaW52b2tlcyB0aGUgdXNlcidzIGhhbmRsZXIsIGFuZCBleGl0cyB0aGUgcHJvY2Vzc1xuICogd2l0aCB0aGUgYXBwcm9wcmlhdGUgY29kZS5cbiAqXG4gKiBUaGUgcnVudGltZSBpcyBkZXNpZ25lZCB0byBuZXZlciByZXR1cm4gaW4gbm9ybWFsIHVzZS4gQWxsIGNvZGUgcGF0aHNcbiAqIHRlcm1pbmF0ZSB3aXRoIGBwcm9jZXNzLmV4aXQoKWAuIFRoZSBvbmx5IGV4Y2VwdGlvbiBpcyB0ZXN0IHNjZW5hcmlvc1xuICogd2hlcmUgYHByb2Nlc3MuZXhpdGAgaXMgbW9ja2VkLlxuICpcbiAqICMjIEV4ZWN1dGlvbiBGbG93XG4gKlxuICogMS4gRXh0cmFjdCBpbnB1dCBwYXlsb2FkIGZyb20gZW52aXJvbm1lbnQgdmFyaWFibGVzIGJhc2VkIG9uIGNvbW1hbmQgdHlwZVxuICogMi4gU2V0IGxvZ2dlciBjb250ZXh0IHdpdGggY29tbWFuZCB0eXBlIGFuZCBpbnB1dFxuICogMy4gT3B0aW9uYWxseSBjb25uZWN0IHRvIFNPQ0tFVF9QQVRIIGZvciBjb21tYW5kIGRpc3BhdGNoIChmYWlsLW9wZW4pXG4gKiA0LiBCdWlsZCBBY3Rpb25Db250ZXh0IHdpdGggbG9nZ2VyLCBjd2QsIGFuZCBzb2NrZXQtYmFja2VkIGNhbGxiYWNrc1xuICogNS4gSW52b2tlIHRoZSBjb21tYW5kIHdpdGggaW5wdXQgYW5kIGNvbnRleHRcbiAqIDYuIE9uIHN1Y2Nlc3M6IGNsZWFuIHVwIHNvY2tldCBhbmQgZXhpdCB3aXRoIGNvZGUgMFxuICogNy4gT24gZXJyb3I6IGxvZyBlcnJvciwgd3JpdGUgdG8gc3RkZXJyLCBjbGVhbiB1cCBhbmQgZXhpdCB3aXRoIGNvZGUgMVxuICpcbiAqXG4gKiBAc3VtbWFyeSBSdW50aW1lIG9yY2hlc3RyYXRpb24gZm9yIGNvbXBpbGVkIENhcmRzIGFjdGlvbiBhbmQgdHlwZSBoYW5kbGVyc1xuICogQG1vZHVsZVxuICogQHNlZSB7QGxpbmsgZXhlY3V0ZUNvbW1hbmR9IGZvciB0aGUgbWFpbiBlbnRyeSBwb2ludFxuICpcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiAvLyBUaGlzIGlzIHdoYXQgY29tcGlsZWQgaGFuZGxlcnMgbG9vayBsaWtlIGludGVybmFsbHlcbiAqIGltcG9ydCB7IGV4ZWN1dGVDb21tYW5kIH0gZnJvbSAnQGNhcmRzL3Nkay9jb25maWcvcnVudGltZSc7XG4gKiBpbXBvcnQgbXlDb21tYW5kIGZyb20gJy4vbXktY29tbWFuZC5qcyc7XG4gKlxuICogZXhlY3V0ZUNvbW1hbmQobXlDb21tYW5kKTtcbiAqIGBgYFxuICovXG5cbmltcG9ydCB0eXBlIHsgQWN0aW9uQ29tbWFuZCwgVHlwZUNyZWF0ZUNvbW1hbmQsIFR5cGVEZWxldGVDb21tYW5kLCBUeXBlVXBkYXRlQ29tbWFuZCB9IGZyb20gJy4vY29tbWFuZC10eXBlcy5qcyc7XG5pbXBvcnQgeyBDQVJEU19FTlZfVkFSUywgZXh0cmFjdEFjdGlvbklucHV0LCBleHRyYWN0VHlwZUlucHV0IH0gZnJvbSAnLi9lbnYuanMnO1xuaW1wb3J0IHsgRVhJVF9DT0RFUywgd3JpdGVFcnJvciB9IGZyb20gJy4vZXhpdC1jb2Rlcy5qcyc7XG5pbXBvcnQgdHlwZSB7IEFjdGlvbkNvbnRleHQsIEFjdGlvbklucHV0LCBUeXBlSG9va0NvbnRleHQsIFR5cGVIb29rSW5wdXQgfSBmcm9tICcuL2lucHV0cy5qcyc7XG5pbXBvcnQgeyBsb2dnZXIgfSBmcm9tICcuL2xvZ2dlci5qcyc7XG5pbXBvcnQgdHlwZSB7IFNvY2tldENvbW1hbmQgfSBmcm9tICcuL3NvY2tldC1jbGllbnQuanMnO1xuaW1wb3J0IHsgU29ja2V0Q2xpZW50IH0gZnJvbSAnLi9zb2NrZXQtY2xpZW50LmpzJztcblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gQ29tbWFuZCBUeXBlIFVuaW9uXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbi8qKlxuICogVW5pb24gb2YgYWxsIGNvbW1hbmQgdHlwZXMgc3VwcG9ydGVkIGJ5IHRoZSBydW50aW1lLlxuICpcbiAqIFRoaXMgdHlwZSB1bmlvbiBhbGxvd3Mge0BsaW5rIGV4ZWN1dGVDb21tYW5kfSB0byBhY2NlcHQgYW55IGNvbW1hbmQgcmV0dXJuZWQgYnlcbiAqIHRoZSBmYWN0b3J5IGZ1bmN0aW9ucy4gVGhlIHJ1bnRpbWUgZGlzcGF0Y2hlcyBiYXNlZCBvbiB0aGUgYGZhY3RvcnlUeXBlYFxuICogZGlzY3JpbWluYW50LlxuICpcbiAqIE5vdGU6IFR5cGVWYWxpZGF0b3JDb21tYW5kIGlzIGV4Y2x1ZGVkIGJlY2F1c2UgdmFsaWRhdG9ycyB1c2UgYSBkaWZmZXJlbnRcbiAqIGV4ZWN1dGlvbiBtb2RlbCAoZmlsZS1wYXRoIHByb3RvY29sIHZpYSB7QGxpbmsgZXhlY3V0ZVZhbGlkYXRpb259KS5cbiAqXG4gKiBAaW50ZXJuYWxcbiAqL1xudHlwZSBBbnlDb21tYW5kID0gQWN0aW9uQ29tbWFuZCB8IFR5cGVDcmVhdGVDb21tYW5kIHwgVHlwZVVwZGF0ZUNvbW1hbmQgfCBUeXBlRGVsZXRlQ29tbWFuZDtcblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gSGVscGVyIEZ1bmN0aW9uc1xuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4vKipcbiAqIE5vcm1hbGl6ZXMgYW4gdW5rbm93biBlcnJvciB2YWx1ZSBpbnRvIGEgaHVtYW4tcmVhZGFibGUgbWVzc2FnZS5cbiAqXG4gKiBFcnJvcnMgaW4gSmF2YVNjcmlwdCBjYW4gYmUgdGhyb3duIHdpdGggYW55IHZhbHVlLiBUaGlzIGZ1bmN0aW9uIGVuc3VyZXNcbiAqIHdlIGFsd2F5cyBnZXQgYSBzdHJpbmcgbWVzc2FnZSByZWdhcmRsZXNzIG9mIHdoYXQgd2FzIHRocm93bi5cbiAqXG4gKiBAcGFyYW0gZXJyb3IgLSBUaGUgY2F1Z2h0IGVycm9yIHZhbHVlLCB3aGljaCBtYXkgb3IgbWF5IG5vdCBiZSBhbiBFcnJvciBpbnN0YW5jZVxuICogQHJldHVybnMgQSBzdHJpbmcgbWVzc2FnZSBzdWl0YWJsZSBmb3IgbG9nZ2luZyBvciBkaXNwbGF5XG4gKlxuICogQGludGVybmFsXG4gKi9cbmZ1bmN0aW9uIGdldEVycm9yTWVzc2FnZShlcnJvcjogdW5rbm93bik6IHN0cmluZyB7XG4gIHJldHVybiBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6IFN0cmluZyhlcnJvcik7XG59XG5cbi8qKlxuICogQ2xlYW5zIHVwIGxvZ2dlciBzdGF0ZSBhbmQgdGVybWluYXRlcyB0aGUgcHJvY2Vzcy5cbiAqXG4gKiBUaGlzIGZ1bmN0aW9uIG5ldmVyIHJldHVybnMuIEl0IGNsZWFycyB0aGUgbG9nZ2VyJ3MgY29udGV4dCwgY2xvc2VzXG4gKiBvcGVuIGZpbGUgaGFuZGxlcyB0byBmbHVzaCBwZW5kaW5nIHdyaXRlcywgYW5kIGV4aXRzIHdpdGggdGhlIHNwZWNpZmllZFxuICogY29kZS5cbiAqXG4gKiBAcGFyYW0gZXhpdENvZGUgLSBUaGUgZXhpdCBjb2RlIHRvIHBhc3MgdG8gYHByb2Nlc3MuZXhpdCgpYFxuICogQHJldHVybnMgTmV2ZXIgcmV0dXJuczsgcHJvY2VzcyB0ZXJtaW5hdGVzXG4gKlxuICogQGludGVybmFsXG4gKi9cbmZ1bmN0aW9uIGNsZWFudXBBbmRFeGl0KGV4aXRDb2RlOiBudW1iZXIpOiBuZXZlciB7XG4gIGxvZ2dlci5jbGVhckNvbnRleHQoKTtcbiAgbG9nZ2VyLmNsb3NlKCk7XG4gIHByb2Nlc3MuZXhpdChleGl0Q29kZSk7XG59XG5cbi8qKlxuICogSGFuZGxlcyBlcnJvcnMgZHVyaW5nIGVudmlyb25tZW50IHZhcmlhYmxlIGV4dHJhY3Rpb24uXG4gKlxuICogRW52aXJvbm1lbnQgZXh0cmFjdGlvbiBjYW4gZmFpbCBpZiByZXF1aXJlZCB2YXJpYWJsZXMgYXJlIG1pc3Npbmcgb3JcbiAqIG1hbGZvcm1lZC4gVGhpcyBwcm92aWRlcyB1c2VyLWZyaWVuZGx5IGVycm9yIG91dHB1dCBhbmQgZW5zdXJlcyBwcm9wZXJcbiAqIGNsZWFudXAgYmVmb3JlIGV4aXQuXG4gKlxuICogQHBhcmFtIGVycm9yIC0gVGhlIGVycm9yIHRocm93biBkdXJpbmcgZXh0cmFjdGlvblxuICogQHJldHVybnMgTmV2ZXIgcmV0dXJuczsgcHJvY2VzcyB0ZXJtaW5hdGVzIHdpdGggZXJyb3IgY29kZVxuICpcbiAqIEBpbnRlcm5hbFxuICovXG5mdW5jdGlvbiBoYW5kbGVFbnZFeHRyYWN0aW9uRXJyb3IoZXJyb3I6IHVua25vd24pOiBuZXZlciB7XG4gIGNvbnN0IG1lc3NhZ2UgPSBnZXRFcnJvck1lc3NhZ2UoZXJyb3IpO1xuICBsb2dnZXIuZXJyb3IoYEZhaWxlZCB0byBleHRyYWN0IGlucHV0IGZyb20gZW52aXJvbm1lbnQ6ICR7bWVzc2FnZX1gKTtcbiAgd3JpdGVFcnJvcihgSGFuZGxlciBmYWlsZWQ6ICR7bWVzc2FnZX1gKTtcbiAgY2xlYW51cEFuZEV4aXQoRVhJVF9DT0RFUy5FUlJPUik7XG59XG5cbi8qKlxuICogSGFuZGxlcyBlcnJvcnMgdGhyb3duIGJ5IHRoZSB1c2VyJ3MgY29tbWFuZCBoYW5kbGVyLlxuICpcbiAqIFdoZW4gYSBoYW5kbGVyIHRocm93cyBvciByZWplY3RzLCB3ZSB3YW50IHRvIHByb3ZpZGUgdXNlZnVsIGRlYnVnZ2luZ1xuICogaW5mb3JtYXRpb24uIFRoaXMgd3JpdGVzIHRoZSBmdWxsIHN0YWNrIHRyYWNlIHRvIHN0ZGVyciAod2hpY2ggdGhlXG4gKiBleGVjdXRpb24gd3JhcHBlciBjYXB0dXJlcykgYW5kIGxvZ3MgYSBzdHJ1Y3R1cmVkIGVycm9yIGV2ZW50LlxuICpcbiAqIEBwYXJhbSBlcnJvciAtIFRoZSBlcnJvciB0aHJvd24gb3IgcmVqZWN0aW9uIHJlYXNvbiBmcm9tIHRoZSBoYW5kbGVyXG4gKiBAcmV0dXJucyBOZXZlciByZXR1cm5zOyBwcm9jZXNzIHRlcm1pbmF0ZXMgd2l0aCBlcnJvciBjb2RlXG4gKlxuICogQGludGVybmFsXG4gKi9cbmZ1bmN0aW9uIGhhbmRsZUhhbmRsZXJFcnJvcihlcnJvcjogdW5rbm93bik6IG5ldmVyIHtcbiAgY29uc3QgZXJyb3JPdXRwdXQgPSBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gKGVycm9yLnN0YWNrID8/IGVycm9yLm1lc3NhZ2UpIDogU3RyaW5nKGVycm9yKTtcbiAgcHJvY2Vzcy5zdGRlcnIud3JpdGUoYCR7ZXJyb3JPdXRwdXR9XFxuYCk7XG4gIGxvZ2dlci5lcnJvcihgSGFuZGxlciBlcnJvcjogJHtnZXRFcnJvck1lc3NhZ2UoZXJyb3IpfWApO1xuICBjbGVhbnVwQW5kRXhpdChFWElUX0NPREVTLkVSUk9SKTtcbn1cblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gRXhlY3V0ZSBGdW5jdGlvblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4vKipcbiAqIEV4ZWN1dGVzIGEgY29tbWFuZCBoYW5kbGVyIHdpdGggZnVsbCBydW50aW1lIG9yY2hlc3RyYXRpb24uXG4gKlxuICogVGhpcyBpcyB0aGUgbWFpbiBlbnRyeSBwb2ludCB0aGF0IGNvbXBpbGVkIGhhbmRsZXJzIHVzZS4gVGhlIENMSSBnZW5lcmF0ZXNcbiAqIHdyYXBwZXIgY29kZSB0aGF0IGltcG9ydHMgdGhlIHVzZXIncyBjb21tYW5kIGFuZCBwYXNzZXMgaXQgdG8gdGhpcyBmdW5jdGlvbi5cbiAqIEZyb20gdGhlcmUsIGV4ZWN1dGVDb21tYW5kIGhhbmRsZXMgYWxsIHRoZSBjZXJlbW9ueTogZW52aXJvbm1lbnQgcGFyc2luZywgbG9nZ2luZ1xuICogc2V0dXAsIGhhbmRsZXIgaW52b2NhdGlvbiwgZXJyb3IgaGFuZGxpbmcsIGFuZCBwcm9jZXNzIHRlcm1pbmF0aW9uLlxuICpcbiAqIFRoZSBmdW5jdGlvbiBleGl0cyB0aGUgcHJvY2VzcyBpbiBhbGwgbm9ybWFsIGNvZGUgcGF0aHMuIFRoZSByZXR1cm5lZFxuICogcHJvbWlzZSBvbmx5IHJlc29sdmVzIGlmIGBwcm9jZXNzLmV4aXRgIGlzIG1vY2tlZCwgd2hpY2ggaGFwcGVucyBpbiB0ZXN0XG4gKiBzY2VuYXJpb3MuIFByb2R1Y3Rpb24gY29kZSBzaG91bGQgbm90IGF3YWl0IHRoaXMgZnVuY3Rpb24gb3IgZXhwZWN0IGl0XG4gKiB0byByZXR1cm4uXG4gKlxuICogIyMgU3VwcG9ydGVkIENvbW1hbmQgVHlwZXNcbiAqXG4gKiAtICoqQWN0aW9uKiogKGBhY3Rpb25gKTogSW52b2tlZCB3aGVuIGFuIGFjdGlvbiBpcyB0cmlnZ2VyZWRcbiAqIC0gKipUeXBlIENyZWF0ZSoqIChgdHlwZUNyZWF0ZWApOiBSdW5zIGFmdGVyIG5ldyB0eXBlZCBmaWxlIGNyZWF0aW9uXG4gKiAtICoqVHlwZSBVcGRhdGUqKiAoYHR5cGVVcGRhdGVgKTogUnVucyBhZnRlciB0eXBlZCBmaWxlIG1vZGlmaWNhdGlvblxuICogLSAqKlR5cGUgRGVsZXRlKiogKGB0eXBlRGVsZXRlYCk6IFJ1bnMgd2hlbiB0eXBlZCBmaWxlIGlzIGRlbGV0ZWRcbiAqXG4gKiBOb3RlOiBUeXBlIHZhbGlkYXRvcnMgdXNlIGEgZGlmZmVyZW50IGV4ZWN1dGlvbiBtb2RlbCAoZmlsZS1wYXRoIHByb3RvY29sKVxuICogYW5kIHNob3VsZCBiZSBleGVjdXRlZCB2aWEge0BsaW5rIGV4ZWN1dGVWYWxpZGF0aW9ufSBpbnN0ZWFkLlxuICpcbiAqICMjIEVycm9yIEhhbmRsaW5nXG4gKlxuICogRXJyb3JzIGFyZSBoYW5kbGVkIGF0IHRocmVlIGxldmVsczpcbiAqXG4gKiAxLiAqKkVudmlyb25tZW50IGV4dHJhY3Rpb24gZXJyb3JzKiogKG1pc3NpbmcvaW52YWxpZCB2YXJpYWJsZXMpOiBMb2cgdGhlXG4gKiAgICBlcnJvciBhbmQgZXhpdC4gVGhlc2UgaW5kaWNhdGUgYSBwcm9ibGVtIHdpdGggaG93IHRoZSBoYW5kbGVyIHdhcyBpbnZva2VkLlxuICpcbiAqIDIuICoqSGFuZGxlciBlcnJvcnMqKiAodXNlciBjb2RlIHRocm93cyk6IFdyaXRlIHRoZSBzdGFjayB0cmFjZSB0byBzdGRlcnIsXG4gKiAgICBsb2cgYSBzdHJ1Y3R1cmVkIGVycm9yLCBhbmQgZXhpdC4gVGhlIGV4ZWN1dGlvbiB3cmFwcGVyIGNhcHR1cmVzIHN0ZGVyclxuICogICAgZm9yIGRlYnVnZ2luZy5cbiAqXG4gKiAzLiAqKlVuZXhwZWN0ZWQgZXJyb3JzKio6IENhdGNoLWFsbCBmb3IgYW55IG90aGVyIGZhaWx1cmVzIGR1cmluZyBydW50aW1lXG4gKiAgICBvcmNoZXN0cmF0aW9uLlxuICpcbiAqIEBwYXJhbSBjb21tYW5kIC0gVGhlIGNvbW1hbmQgdG8gZXhlY3V0ZSwgcmV0dXJuZWQgZnJvbSBhIGZhY3RvcnkgZnVuY3Rpb25cbiAqIEByZXR1cm5zIEEgcHJvbWlzZSB0aGF0IHJlc29sdmVzIG9ubHkgd2hlbiBgcHJvY2Vzcy5leGl0YCBpcyBtb2NrZWQgKHRlc3RzKVxuICpcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiAvLyBHZW5lcmF0ZWQgd3JhcHBlciBjb2RlIChwcm9kdWNlZCBieSBDTEkpXG4gKiBpbXBvcnQgeyBleGVjdXRlQ29tbWFuZCB9IGZyb20gJ0BjYXJkcy9zZGsvY29uZmlnL3J1bnRpbWUnO1xuICogaW1wb3J0IGNvbW1hbmQgZnJvbSAnLi91c2VyLWNvbW1hbmQuanMnO1xuICpcbiAqIC8vIFRoaXMgY2FsbCBuZXZlciByZXR1cm5zIGluIHByb2R1Y3Rpb25cbiAqIGV4ZWN1dGVDb21tYW5kKGNvbW1hbmQpO1xuICogYGBgXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBleGVjdXRlQ29tbWFuZChjb21tYW5kOiBBbnlDb21tYW5kKTogUHJvbWlzZTx2b2lkPiB7XG4gIHRyeSB7XG4gICAgbGV0IGlucHV0OiBBY3Rpb25JbnB1dCB8IFR5cGVIb29rSW5wdXQ7XG5cbiAgICB0cnkge1xuICAgICAgaWYgKGNvbW1hbmQuZmFjdG9yeVR5cGUgPT09ICdhY3Rpb24nKSB7XG4gICAgICAgIGlucHV0ID0gZXh0cmFjdEFjdGlvbklucHV0KCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpbnB1dCA9IGV4dHJhY3RUeXBlSW5wdXQoKTtcbiAgICAgIH1cbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgcmV0dXJuIGhhbmRsZUVudkV4dHJhY3Rpb25FcnJvcihlcnJvcik7XG4gICAgfVxuXG4gICAgLy8gU2V0IGxvZ2dlciBjb250ZXh0IHdpdGggY29tbWFuZCB0eXBlXG4gICAgbG9nZ2VyLnNldENvbnRleHQoY29tbWFuZC5mYWN0b3J5VHlwZSwgeyAuLi5pbnB1dCB9KTtcblxuICAgIGlmIChjb21tYW5kLmZhY3RvcnlUeXBlID09PSAnYWN0aW9uJykge1xuICAgICAgLy8gU29ja2V0IGNvbm5lY3Rpb24gYW5kIEFjdGlvbkNvbnRleHQgZm9yIGFjdGlvbiBjb21tYW5kc1xuICAgICAgbGV0IHNvY2tldENsaWVudDogU29ja2V0Q2xpZW50IHwgdW5kZWZpbmVkO1xuICAgICAgY29uc3Qgc29ja2V0UGF0aCA9IHByb2Nlc3MuZW52W0NBUkRTX0VOVl9WQVJTLlNPQ0tFVF9QQVRIXTtcbiAgICAgIGlmIChzb2NrZXRQYXRoKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgc29ja2V0Q2xpZW50ID0gYXdhaXQgU29ja2V0Q2xpZW50LmNvbm5lY3Qoc29ja2V0UGF0aCk7XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgbG9nZ2VyLndhcm4oYEZhaWxlZCB0byBjb25uZWN0IHRvIHNvY2tldCBhdCAke3NvY2tldFBhdGh9OiAke2dldEVycm9yTWVzc2FnZShlcnJvcil9YCk7XG4gICAgICAgICAgLy8gRmFpbC1vcGVuOiBjb250aW51ZSB3aXRob3V0IHNvY2tldFxuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIC8vIENhbGxiYWNrIHJlZ2lzdHJhdGlvbiBzdGF0ZVxuICAgICAgbGV0IGNhbmNlbENhbGxiYWNrOiAoKCkgPT4gdm9pZCB8IFByb21pc2U8dm9pZD4pIHwgdW5kZWZpbmVkO1xuICAgICAgbGV0IHN3aXRjaFRvSW50ZXJhY3RpdmVDYWxsYmFjazogKCgpID0+IHVua25vd24gfCBQcm9taXNlPHVua25vd24+KSB8IHVuZGVmaW5lZDtcbiAgICAgIGxldCBjb21tYW5kUHJvY2Vzc2VkID0gZmFsc2U7XG5cbiAgICAgIC8vIEJ1aWxkIEFjdGlvbkNvbnRleHQgd2l0aCBsb2dnZXIsIGN3ZCwgYW5kIHNvY2tldC1iYWNrZWQgY2FsbGJhY2tzXG4gICAgICBjb25zdCBjb250ZXh0OiBBY3Rpb25Db250ZXh0ID0ge1xuICAgICAgICBsb2dnZXIsXG4gICAgICAgIGN3ZDogcHJvY2Vzcy5jd2QoKSxcbiAgICAgICAgb25DYW5jZWw6IChjYWxsYmFjaykgPT4ge1xuICAgICAgICAgIGNhbmNlbENhbGxiYWNrID0gY2FsbGJhY2s7XG4gICAgICAgIH0sXG4gICAgICAgIG9uU3dpdGNoVG9JbnRlcmFjdGl2ZTogKGNhbGxiYWNrKSA9PiB7XG4gICAgICAgICAgc3dpdGNoVG9JbnRlcmFjdGl2ZUNhbGxiYWNrID0gY2FsbGJhY2s7XG4gICAgICAgIH1cbiAgICAgIH07XG5cbiAgICAgIC8vIFdpcmUgc29ja2V0IGNvbW1hbmQgZGlzcGF0Y2hcbiAgICAgIGlmIChzb2NrZXRDbGllbnQpIHtcbiAgICAgICAgc29ja2V0Q2xpZW50Lm9uQ29tbWFuZCgoY21kOiBTb2NrZXRDb21tYW5kKSA9PiB7XG4gICAgICAgICAgLy8gRmlyc3Qtd2lucyBzZW1hbnRpY3M6IGlnbm9yZSBzdWJzZXF1ZW50IGNvbW1hbmRzXG4gICAgICAgICAgaWYgKGNvbW1hbmRQcm9jZXNzZWQpIHJldHVybjtcbiAgICAgICAgICBjb21tYW5kUHJvY2Vzc2VkID0gdHJ1ZTtcblxuICAgICAgICAgIGlmIChjbWQudHlwZSA9PT0gJ2NhbmNlbCcpIHtcbiAgICAgICAgICAgIGhhbmRsZUNhbmNlbENvbW1hbmQoY2FuY2VsQ2FsbGJhY2ssIHNvY2tldENsaWVudCk7XG4gICAgICAgICAgfSBlbHNlIGlmIChjbWQudHlwZSA9PT0gJ3N3aXRjaFRvSW50ZXJhY3RpdmUnKSB7XG4gICAgICAgICAgICBoYW5kbGVTd2l0Y2hUb0ludGVyYWN0aXZlQ29tbWFuZChzd2l0Y2hUb0ludGVyYWN0aXZlQ2FsbGJhY2ssIHNvY2tldENsaWVudCEpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIC8vIEV4ZWN1dGUgdGhlIGFjdGlvbiBjb21tYW5kIGhhbmRsZXJcbiAgICAgIHRyeSB7XG4gICAgICAgIGF3YWl0IGNvbW1hbmQoaW5wdXQgYXMgQWN0aW9uSW5wdXQsIGNvbnRleHQpO1xuICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgc29ja2V0Q2xpZW50Py5jbG9zZSgpO1xuICAgICAgICByZXR1cm4gaGFuZGxlSGFuZGxlckVycm9yKGVycm9yKTtcbiAgICAgIH1cblxuICAgICAgLy8gQ2xlYW4gdXAgc29ja2V0IGFuZCBleGl0IHN1Y2Nlc3NmdWxseVxuICAgICAgc29ja2V0Q2xpZW50Py5jbG9zZSgpO1xuICAgICAgY2xlYW51cEFuZEV4aXQoRVhJVF9DT0RFUy5TVUNDRVNTKTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gVHlwZUhvb2tDb250ZXh0IGZvciB0eXBlIGxpZmVjeWNsZSBob29rc1xuICAgICAgY29uc3QgY29udGV4dDogVHlwZUhvb2tDb250ZXh0ID0ge1xuICAgICAgICBsb2dnZXIsXG4gICAgICAgIGN3ZDogcHJvY2Vzcy5jd2QoKVxuICAgICAgfTtcblxuICAgICAgLy8gRXhlY3V0ZSB0aGUgdHlwZSBob29rIGNvbW1hbmQgaGFuZGxlclxuICAgICAgdHJ5IHtcbiAgICAgICAgYXdhaXQgY29tbWFuZChpbnB1dCBhcyBUeXBlSG9va0lucHV0LCBjb250ZXh0KTtcbiAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgIHJldHVybiBoYW5kbGVIYW5kbGVyRXJyb3IoZXJyb3IpO1xuICAgICAgfVxuXG4gICAgICBjbGVhbnVwQW5kRXhpdChFWElUX0NPREVTLlNVQ0NFU1MpO1xuICAgIH1cbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAvLyBVbmV4cGVjdGVkIGVycm9yIC0gdHJ5IHRvIGNsZWFuIHVwIGFuZCBleGl0XG4gICAgbG9nZ2VyLmVycm9yKGBVbmV4cGVjdGVkIHJ1bnRpbWUgZXJyb3I6ICR7Z2V0RXJyb3JNZXNzYWdlKGVycm9yKX1gKTtcbiAgICBjbGVhbnVwQW5kRXhpdChFWElUX0NPREVTLkVSUk9SKTtcbiAgfVxufVxuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBTb2NrZXQgQ29tbWFuZCBIYW5kbGVyc1xuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4vKipcbiAqIFJlc29sdmVzIGEgY2FsbGJhY2sgcmVzdWx0IHRoYXQgbWF5IGJlIHN5bmMgb3IgYXN5bmMgaW50byBhIFByb21pc2UuXG4gKlxuICogVXNlci1yZWdpc3RlcmVkIGNhbGxiYWNrcyBtYXkgcmV0dXJuIHZvaWQsIGEgdmFsdWUsIG9yIGEgUHJvbWlzZS5cbiAqIFRoaXMgbm9ybWFsaXplcyBhbGwgY2FzZXMgaW50byBhIHNpbmdsZSBQcm9taXNlIGZvciBjb25zaXN0ZW50IGhhbmRsaW5nLlxuICpcbiAqIEBwYXJhbSByZXN1bHQgLSBDYWxsYmFjayByZXR1cm4gdmFsdWUgdGhhdCBtYXkgYWxyZWFkeSBiZSBhIHByb21pc2UuXG4gKiBAcmV0dXJucyBQcm9taXNlIHJlc29sdmluZyB0byB0aGUgY2FsbGJhY2sgcmVzdWx0LlxuICogQGludGVybmFsXG4gKi9cbmZ1bmN0aW9uIHRvUHJvbWlzZTxUPihyZXN1bHQ6IFQgfCBQcm9taXNlPFQ+KTogUHJvbWlzZTxUPiB7XG4gIGlmIChyZXN1bHQgJiYgdHlwZW9mIChyZXN1bHQgYXMgUHJvbWlzZTxUPikudGhlbiA9PT0gJ2Z1bmN0aW9uJykge1xuICAgIHJldHVybiByZXN1bHQgYXMgUHJvbWlzZTxUPjtcbiAgfVxuICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKHJlc3VsdCk7XG59XG5cbi8qKlxuICogSGFuZGxlcyBhIGBjYW5jZWxgIGNvbW1hbmQgZnJvbSB0aGUgc29ja2V0LlxuICpcbiAqIElmIGEgY2FuY2VsIGNhbGxiYWNrIHdhcyByZWdpc3RlcmVkLCBpdCBpcyBpbnZva2VkLiBPdGhlcndpc2UsIFNJR1RFUk1cbiAqIGlzIHNlbnQgdG8gdGhlIGN1cnJlbnQgcHJvY2VzcyBhcyBhIGZhbGxiYWNrLiBBZnRlciB0aGUgY2FsbGJhY2sgY29tcGxldGVzXG4gKiAob3IgaW1tZWRpYXRlbHkgaWYgbm8gY2FsbGJhY2spLCB0aGUgcHJvY2VzcyBleGl0cyB3aXRoIGVycm9yIGNvZGUuXG4gKlxuICogQHBhcmFtIGNhbGxiYWNrIC0gVGhlIHJlZ2lzdGVyZWQgY2FuY2VsIGNhbGxiYWNrLCBpZiBhbnlcbiAqIEBwYXJhbSBzb2NrZXRDbGllbnQgLSBUaGUgc29ja2V0IGNsaWVudCB0byBjbG9zZSBiZWZvcmUgZXhpdGluZ1xuICpcbiAqIEBpbnRlcm5hbFxuICovXG5mdW5jdGlvbiBoYW5kbGVDYW5jZWxDb21tYW5kKFxuICBjYWxsYmFjazogKCgpID0+IHZvaWQgfCBQcm9taXNlPHZvaWQ+KSB8IHVuZGVmaW5lZCxcbiAgc29ja2V0Q2xpZW50OiBTb2NrZXRDbGllbnQgfCB1bmRlZmluZWRcbik6IHZvaWQge1xuICBpZiAoIWNhbGxiYWNrKSB7XG4gICAgcHJvY2Vzcy5raWxsKHByb2Nlc3MucGlkLCAnU0lHVEVSTScpO1xuICAgIHJldHVybjtcbiAgfVxuXG4gIHRvUHJvbWlzZShjYWxsYmFjaygpKS50aGVuKFxuICAgICgpID0+IHtcbiAgICAgIHNvY2tldENsaWVudD8uY2xvc2UoKTtcbiAgICAgIGNsZWFudXBBbmRFeGl0KEVYSVRfQ09ERVMuRVJST1IpO1xuICAgIH0sXG4gICAgKCkgPT4ge1xuICAgICAgc29ja2V0Q2xpZW50Py5jbG9zZSgpO1xuICAgICAgY2xlYW51cEFuZEV4aXQoRVhJVF9DT0RFUy5FUlJPUik7XG4gICAgfVxuICApO1xufVxuXG4vKipcbiAqIEhhbmRsZXMgYSBgc3dpdGNoVG9JbnRlcmFjdGl2ZWAgY29tbWFuZCBmcm9tIHRoZSBzb2NrZXQuXG4gKlxuICogSWYgbm8gY2FsbGJhY2sgd2FzIHJlZ2lzdGVyZWQsIHRoZSBjb21tYW5kIGlzIGlnbm9yZWQgKG5vLW9wKS4gT3RoZXJ3aXNlLFxuICogdGhlIGNhbGxiYWNrIGlzIGludm9rZWQgYW5kIGl0cyByZXR1cm4gdmFsdWUgaXMgc2VudCBhc1xuICogYHN3aXRjaFRvSW50ZXJhY3RpdmVSZXNwb25zZWAgb24gdGhlIHNvY2tldC4gYHByb2Nlc3MuZXhpdCg0MilgIGlzIGNhbGxlZFxuICogaW5zaWRlIHRoZSBgd3JpdGUoKWAgY2FsbGJhY2sgdG8gZ3VhcmFudGVlIHRoZSByZXNwb25zZSBpcyBmbHVzaGVkIGJlZm9yZVxuICogdGhlIGV2ZW50IGxvb3AgdGVhcnMgZG93bi5cbiAqXG4gKiBAcGFyYW0gY2FsbGJhY2sgLSBUaGUgcmVnaXN0ZXJlZCBzd2l0Y2hUb0ludGVyYWN0aXZlIGNhbGxiYWNrLCBpZiBhbnlcbiAqIEBwYXJhbSBzb2NrZXRDbGllbnQgLSBUaGUgc29ja2V0IGNsaWVudCB1c2VkIHRvIHNlbmQgdGhlIHJlc3BvbnNlXG4gKlxuICogQGludGVybmFsXG4gKi9cbmZ1bmN0aW9uIGhhbmRsZVN3aXRjaFRvSW50ZXJhY3RpdmVDb21tYW5kKFxuICBjYWxsYmFjazogKCgpID0+IHVua25vd24gfCBQcm9taXNlPHVua25vd24+KSB8IHVuZGVmaW5lZCxcbiAgc29ja2V0Q2xpZW50OiBTb2NrZXRDbGllbnRcbik6IHZvaWQge1xuICBpZiAoIWNhbGxiYWNrKSB7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgdG9Qcm9taXNlKGNhbGxiYWNrKCkpLnRoZW4oXG4gICAgKGRhdGEpID0+IHtcbiAgICAgIHNvY2tldENsaWVudC5zZW5kUmVzcG9uc2VUaGVuKHsgdHlwZTogJ3N3aXRjaFRvSW50ZXJhY3RpdmVSZXNwb25zZScsIGRhdGEgfSwgKCkgPT4ge1xuICAgICAgICBjbGVhbnVwQW5kRXhpdChFWElUX0NPREVTLlNXSVRDSF9UT19JTlRFUkFDVElWRSk7XG4gICAgICB9KTtcbiAgICB9LFxuICAgIChlcnJvcikgPT4ge1xuICAgICAgbG9nZ2VyLmVycm9yKGBzd2l0Y2hUb0ludGVyYWN0aXZlIGNhbGxiYWNrIGVycm9yOiAke2dldEVycm9yTWVzc2FnZShlcnJvcil9YCk7XG4gICAgICBzb2NrZXRDbGllbnQuY2xvc2UoKTtcbiAgICAgIGNsZWFudXBBbmRFeGl0KEVYSVRfQ09ERVMuRVJST1IpO1xuICAgIH1cbiAgKTtcbn1cbiIsICIvKipcbiAqIFNoYXJlZCBzZXNzaW9uIHV0aWxpdGllcyBmb3IgQ29kZXggYWN0aW9uIHdvcmtmbG93cy5cbiAqXG4gKiBSZXVzZXMgdGhlIGV4aXN0aW5nIHdvcmt0cmVlIGxpZmVjeWNsZSB1c2VkIGJ5IENsYXVkZS1iYXNlZCBhY3Rpb25zLCB3aGlsZVxuICogdGFpbG9yaW5nIHByb2Nlc3Mgc3Bhd24gYXJndW1lbnRzIGFuZCBlbnZpcm9ubWVudCBmb3IgdGhlIGBjb2RleGAgQ0xJLlxuICpcbiAqIEBzdW1tYXJ5IFNoYXJlZCBzZXNzaW9uIHV0aWxpdGllcyBmb3IgQ29kZXggYWN0aW9uIHdvcmtmbG93c1xuICogQG1vZHVsZVxuICovXG5cbmltcG9ydCB7IHR5cGUgQ2hpbGRQcm9jZXNzLCBzcGF3biB9IGZyb20gJ25vZGU6Y2hpbGRfcHJvY2Vzcyc7XG5pbXBvcnQgKiBhcyBmcyBmcm9tICdub2RlOmZzL3Byb21pc2VzJztcbmltcG9ydCB7IGhvbWVkaXIgfSBmcm9tICdub2RlOm9zJztcbmltcG9ydCAqIGFzIHBhdGggZnJvbSAnbm9kZTpwYXRoJztcbmltcG9ydCB7IENhcmRzQ2xpZW50IH0gZnJvbSAnQGNhcmRzL3Nkay9jbGllbnQnO1xuaW1wb3J0IHR5cGUgeyBBY3Rpb25Db250ZXh0LCBBY3Rpb25JbnB1dCB9IGZyb20gJ0BjYXJkcy9zZGsvY29uZmlnJztcbmltcG9ydCB7IHNwYXduQnJhbmNoQ2xlYW51cFdhdGNoZXIgfSBmcm9tICcuL2JyYW5jaC1jbGVhbnVwLXdhdGNoZXIuanMnO1xuaW1wb3J0IHsgZXJyb3JNZXNzYWdlLCByZXNvbHZlQmFzZUJyYW5jaCwgcmVzb2x2ZU1hcmtldHBsYWNlUGF0aCwgcmVzb2x2ZU9yQ3JlYXRlV29ya3RyZWUgfSBmcm9tICcuL2NsYXVkZS1zZXNzaW9uLmpzJztcblxuLyoqXG4gKiBPcHRpb25zIGZvciB7QGxpbmsgc3Bhd25Db2RleFNlc3Npb259LlxuICovXG5leHBvcnQgaW50ZXJmYWNlIENvZGV4U2Vzc2lvbk9wdGlvbnMge1xuICAvKiogUHJvbXB0IHN0cmluZyBwYXNzZWQgdG8gdGhlIENvZGV4IENMSS4gKi9cbiAgcHJvbXB0OiBzdHJpbmc7XG59XG5cbi8qKlxuICogTWluaW1hbCBtYW5pZmVzdCBzaGFwZSByZXF1aXJlZCBieSB0aGUgQ29kZXggcGx1Z2luIGxvYWRlci5cbiAqL1xuaW50ZXJmYWNlIENvZGV4UGx1Z2luTWFuaWZlc3Qge1xuICBuYW1lOiBzdHJpbmc7XG4gIHZlcnNpb246IHN0cmluZztcbn1cblxuY29uc3QgQ09ERVhfUExVR0lOX05BTUUgPSAnY29kZXgtcnVudGltZSc7XG5jb25zdCBDT0RFWF9QTFVHSU5fTUFSS0VUUExBQ0UgPSAnbG9jYWwnO1xuY29uc3QgQ09ERVhfUlVOVElNRV9TS0lMTF9OQU1FID0gJ2NhcmRzLXJ1bnRpbWUnO1xuXG4vKipcbiAqIFJlc29sdmVzIHRoZSBwYWNrYWdlZCBDb2RleCBwbHVnaW4gYnVuZGxlZCBpbiB0aGUgZXh0ZW5zaW9uIG1hcmtldHBsYWNlLlxuICpcbiAqIEBwYXJhbSBtYXJrZXRwbGFjZVBhdGggLSBBYnNvbHV0ZSBwYXRoIHRvIHRoZSBwYWNrYWdlZCBtYXJrZXRwbGFjZSBkaXJlY3RvcnkuXG4gKiBAcmV0dXJucyBBYnNvbHV0ZSBwYXRoIHRvIHRoZSBwYWNrYWdlZCBDb2RleCBwbHVnaW4gZGlyZWN0b3J5LlxuICovXG5leHBvcnQgZnVuY3Rpb24gcmVzb2x2ZUNvZGV4UGx1Z2luUGF0aChtYXJrZXRwbGFjZVBhdGg6IHN0cmluZyk6IHN0cmluZyB7XG4gIHJldHVybiBwYXRoLmpvaW4obWFya2V0cGxhY2VQYXRoLCAncGx1Z2lucycsIENPREVYX1BMVUdJTl9OQU1FKTtcbn1cblxuLyoqXG4gKiBSZXNvbHZlcyB0aGUgQ29kZXggaG9tZSBkaXJlY3RvcnkgdXNlZCBmb3IgcGx1Z2luIGNhY2hlIGluc3RhbGxhdGlvbi5cbiAqXG4gKiBAcmV0dXJucyBBYnNvbHV0ZSBwYXRoIHRvIHRoZSBDb2RleCBob21lIGRpcmVjdG9yeS5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJlc29sdmVDb2RleEhvbWUoKTogc3RyaW5nIHtcbiAgcmV0dXJuIHByb2Nlc3MuZW52WydDT0RFWF9IT01FJ10gPz8gcGF0aC5qb2luKGhvbWVkaXIoKSwgJy5jb2RleCcpO1xufVxuXG4vKipcbiAqIFJlYWRzIGFuZCB2YWxpZGF0ZXMgdGhlIHBhY2thZ2VkIENvZGV4IHBsdWdpbiBtYW5pZmVzdC5cbiAqXG4gKiBAcGFyYW0gcGx1Z2luUGF0aCAtIEFic29sdXRlIHBhdGggdG8gdGhlIHBhY2thZ2VkIENvZGV4IHBsdWdpbiBkaXJlY3RvcnkuXG4gKiBAcmV0dXJucyBQYXJzZWQgcGx1Z2luIG1hbmlmZXN0LlxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcmVhZENvZGV4UGx1Z2luTWFuaWZlc3QocGx1Z2luUGF0aDogc3RyaW5nKTogUHJvbWlzZTxDb2RleFBsdWdpbk1hbmlmZXN0PiB7XG4gIGNvbnN0IG1hbmlmZXN0UGF0aCA9IHBhdGguam9pbihwbHVnaW5QYXRoLCAnLmNvZGV4LXBsdWdpbicsICdwbHVnaW4uanNvbicpO1xuICBjb25zdCBtYW5pZmVzdCA9IEpTT04ucGFyc2UoYXdhaXQgZnMucmVhZEZpbGUobWFuaWZlc3RQYXRoLCAndXRmLTgnKSkgYXMgUGFydGlhbDxDb2RleFBsdWdpbk1hbmlmZXN0PjtcblxuICBpZiAobWFuaWZlc3QubmFtZSAhPT0gQ09ERVhfUExVR0lOX05BTUUpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYEludmFsaWQgQ29kZXggcGx1Z2luIG1hbmlmZXN0IG5hbWUgYXQgJHttYW5pZmVzdFBhdGh9OiBleHBlY3RlZCBcIiR7Q09ERVhfUExVR0lOX05BTUV9XCJgKTtcbiAgfVxuICBpZiAodHlwZW9mIG1hbmlmZXN0LnZlcnNpb24gIT09ICdzdHJpbmcnIHx8IG1hbmlmZXN0LnZlcnNpb24ubGVuZ3RoID09PSAwKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBJbnZhbGlkIENvZGV4IHBsdWdpbiBtYW5pZmVzdCB2ZXJzaW9uIGF0ICR7bWFuaWZlc3RQYXRofWApO1xuICB9XG5cbiAgcmV0dXJuIHtcbiAgICBuYW1lOiBtYW5pZmVzdC5uYW1lLFxuICAgIHZlcnNpb246IG1hbmlmZXN0LnZlcnNpb25cbiAgfTtcbn1cblxuLyoqXG4gKiBJbnN0YWxscyB0aGUgcGFja2FnZWQgQ29kZXggcGx1Z2luIGludG8gdGhlIGxvY2FsIENvZGV4IHBsdWdpbiBjYWNoZS5cbiAqXG4gKiBUaGUgcGFja2FnZWQgZXh0ZW5zaW9uIGJ1bmRsZSByZW1haW5zIHRoZSBzb3VyY2Ugb2YgdHJ1dGguIFRoZSBjYWNoZSBlbnRyeSBpc1xuICogcmVwbGFjZWQgYXRvbWljYWxseSBhdCB0aGUgcGx1Z2luIHN1YnRyZWUgYm91bmRhcnkgc28gb25seSBgY29kZXgtcnVudGltZWBcbiAqIGVudHJpZXMgYXJlIHRvdWNoZWQuXG4gKlxuICogQHBhcmFtIG1hcmtldHBsYWNlUGF0aCAtIEFic29sdXRlIHBhdGggdG8gdGhlIHBhY2thZ2VkIG1hcmtldHBsYWNlIGRpcmVjdG9yeS5cbiAqIEByZXR1cm5zIEluc3RhbGxlZCBwbHVnaW4gY2FjaGUgbWV0YWRhdGEuXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBlbnN1cmVDb2RleFBsdWdpbkluc3RhbGxlZChtYXJrZXRwbGFjZVBhdGg6IHN0cmluZyk6IFByb21pc2U8e1xuICBwbHVnaW5QYXRoOiBzdHJpbmc7XG4gIHZlcnNpb246IHN0cmluZztcbiAgY2FjaGVQYXRoOiBzdHJpbmc7XG59PiB7XG4gIGNvbnN0IHBsdWdpblBhdGggPSByZXNvbHZlQ29kZXhQbHVnaW5QYXRoKG1hcmtldHBsYWNlUGF0aCk7XG4gIGNvbnN0IHNraWxsUGF0aCA9IHBhdGguam9pbihwbHVnaW5QYXRoLCAnc2tpbGxzJywgQ09ERVhfUlVOVElNRV9TS0lMTF9OQU1FKTtcblxuICBhd2FpdCBmcy5hY2Nlc3MocGx1Z2luUGF0aCk7XG4gIGF3YWl0IGZzLmFjY2Vzcyhza2lsbFBhdGgpO1xuXG4gIGNvbnN0IG1hbmlmZXN0ID0gYXdhaXQgcmVhZENvZGV4UGx1Z2luTWFuaWZlc3QocGx1Z2luUGF0aCk7XG4gIGNvbnN0IHBsdWdpblZlcnNpb25zUGF0aCA9IHBhdGguam9pbihcbiAgICByZXNvbHZlQ29kZXhIb21lKCksXG4gICAgJ3BsdWdpbnMnLFxuICAgICdjYWNoZScsXG4gICAgQ09ERVhfUExVR0lOX01BUktFVFBMQUNFLFxuICAgIENPREVYX1BMVUdJTl9OQU1FXG4gICk7XG4gIGNvbnN0IGNhY2hlUGF0aCA9IHBhdGguam9pbihwbHVnaW5WZXJzaW9uc1BhdGgsIG1hbmlmZXN0LnZlcnNpb24pO1xuXG4gIGF3YWl0IGZzLnJtKHBsdWdpblZlcnNpb25zUGF0aCwgeyByZWN1cnNpdmU6IHRydWUsIGZvcmNlOiB0cnVlIH0pO1xuICBhd2FpdCBmcy5ta2RpcihwbHVnaW5WZXJzaW9uc1BhdGgsIHsgcmVjdXJzaXZlOiB0cnVlIH0pO1xuICBhd2FpdCBmcy5zeW1saW5rKHBsdWdpblBhdGgsIGNhY2hlUGF0aCwgJ2p1bmN0aW9uJyk7XG5cbiAgcmV0dXJuIHtcbiAgICBwbHVnaW5QYXRoLFxuICAgIHZlcnNpb246IG1hbmlmZXN0LnZlcnNpb24sXG4gICAgY2FjaGVQYXRoXG4gIH07XG59XG5cbi8qKlxuICogQnVpbGRzIHRoZSBDTEkgYXJndW1lbnQgbGlzdCBmb3IgdGhlIGBjb2RleGAgcHJvY2Vzcy5cbiAqXG4gKiBAcGFyYW0gcHJvbXB0IC0gUHJvbXB0IHBhc3NlZCB0byBDb2RleC5cbiAqIEBwYXJhbSB3b3Jrc3BhY2VQYXRoIC0gQ2FyZCB3b3JrdHJlZSBwYXRoIHVzZWQgYXMgdGhlIENvZGV4IHdvcmtzcGFjZSByb290LlxuICogQHBhcmFtIGNhcmRSZXBvUGF0aCAtIEFkZGl0aW9uYWwgd3JpdGFibGUgZGlyZWN0b3J5IGZvciB0aGUgY2FyZCByZXBvLlxuICogQHJldHVybnMgQXJyYXkgb2YgQ0xJIGFyZ3VtZW50cy5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGJ1aWxkQ29kZXhBcmdzKHByb21wdDogc3RyaW5nLCB3b3Jrc3BhY2VQYXRoOiBzdHJpbmcsIGNhcmRSZXBvUGF0aDogc3RyaW5nKTogc3RyaW5nW10ge1xuICByZXR1cm4gW1xuICAgICctLWRhbmdlcm91c2x5LWJ5cGFzcy1hcHByb3ZhbHMtYW5kLXNhbmRib3gnLFxuICAgICctLWNkJyxcbiAgICB3b3Jrc3BhY2VQYXRoLFxuICAgICctLWFkZC1kaXInLFxuICAgIGNhcmRSZXBvUGF0aCxcbiAgICAnLS1jb25maWcnLFxuICAgICdmZWF0dXJlcy5wbHVnaW5zPXRydWUnLFxuICAgICctLWNvbmZpZycsXG4gICAgYHBsdWdpbnMuJHtDT0RFWF9QTFVHSU5fTkFNRX1AJHtDT0RFWF9QTFVHSU5fTUFSS0VUUExBQ0V9LmVuYWJsZWQ9dHJ1ZWAsXG4gICAgcHJvbXB0XG4gIF07XG59XG5cbi8qKlxuICogU3Bhd25zIGEgYGNvZGV4YCBDTEkgc2Vzc2lvbiB3aXRoIHdvcmt0cmVlIGxpZmVjeWNsZSBhbmQgcHJvbXB0LWJhc2VkIHNraWxsIGd1aWRhbmNlLlxuICpcbiAqIEBwYXJhbSBpbnB1dCAtIFBhcnNlZCBhY3Rpb24gaW5wdXQgZnJvbSB0aGUgZW52aXJvbm1lbnQuXG4gKiBAcGFyYW0gY29udGV4dCAtIEFjdGlvbiBjb250ZXh0IHByb3ZpZGluZyBsb2dnZXIgYW5kIGxpZmVjeWNsZSBob29rcy5cbiAqIEBwYXJhbSBvcHRpb25zIC0gU2Vzc2lvbi1zcGVjaWZpYyBwYXJhbWV0ZXJzLlxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gc3Bhd25Db2RleFNlc3Npb24oXG4gIGlucHV0OiBBY3Rpb25JbnB1dCxcbiAgY29udGV4dDogQWN0aW9uQ29udGV4dCxcbiAgb3B0aW9uczogQ29kZXhTZXNzaW9uT3B0aW9uc1xuKTogUHJvbWlzZTx2b2lkPiB7XG4gIGNvbnN0IHsgcHJvbXB0IH0gPSBvcHRpb25zO1xuICBjb25zdCBtYXJrZXRwbGFjZVBhdGggPSByZXNvbHZlTWFya2V0cGxhY2VQYXRoKCk7XG5cbiAgY29udGV4dC5sb2dnZXIuaW5mbyhgJHtpbnB1dC5hY3Rpb25OYW1lfSBhY3Rpb24gc3RhcnRlZGAsIHtcbiAgICBjYXJkSWQ6IGlucHV0LmNhcmRJZCxcbiAgICBlbnZpcm9ubWVudDogaW5wdXQuZW52aXJvbm1lbnQsXG4gICAgZXhlY3V0aW9uTW9kZTogaW5wdXQuZXhlY3V0aW9uTW9kZVxuICB9KTtcblxuICBjb25zdCBjbGllbnQgPSBuZXcgQ2FyZHNDbGllbnQoe1xuICAgIGJhc2VVcmw6IGlucHV0LmFwaUJhc2VVcmwsXG4gICAgYWNjZXNzVG9rZW46IGlucHV0LmFwaUFjY2Vzc1Rva2VuXG4gIH0pO1xuXG4gIGNvbnN0IGJhc2VCcmFuY2ggPSBhd2FpdCByZXNvbHZlQmFzZUJyYW5jaChpbnB1dC5yZXBvUm9vdCwgY2xpZW50KTtcbiAgY29uc3Qge1xuICAgIHdvcmt0cmVlUGF0aDogY3dkLFxuICAgIGJyYW5jaE5hbWUsXG4gICAgcGFyZW50QnJhbmNoXG4gIH0gPSBhd2FpdCByZXNvbHZlT3JDcmVhdGVXb3JrdHJlZShpbnB1dCwgY2xpZW50LCBiYXNlQnJhbmNoLCBjb250ZXh0LmxvZ2dlcik7XG5cbiAgY29udGV4dC5sb2dnZXIuaW5mbygnVXNpbmcgd29ya3RyZWUnLCB7IGN3ZCwgYnJhbmNoOiBicmFuY2hOYW1lLCBiYXNlQnJhbmNoLCBwYXJlbnRCcmFuY2ggfSk7XG4gIGNvbnN0IHsgcGx1Z2luUGF0aCwgdmVyc2lvbiwgY2FjaGVQYXRoIH0gPSBhd2FpdCBlbnN1cmVDb2RleFBsdWdpbkluc3RhbGxlZChtYXJrZXRwbGFjZVBhdGgpO1xuICBjb250ZXh0LmxvZ2dlci5pbmZvKCdJbnN0YWxsZWQgQ29kZXggcnVudGltZSBwbHVnaW4nLCB7XG4gICAgcGx1Z2luUGF0aCxcbiAgICB2ZXJzaW9uLFxuICAgIGNhY2hlUGF0aFxuICB9KTtcblxuICBjb25zdCBhcmdzID0gYnVpbGRDb2RleEFyZ3MocHJvbXB0LCBjd2QsIGlucHV0LmNhcmRSZXBvUGF0aCk7XG5cbiAgY29uc3QgY2hpbGQ6IENoaWxkUHJvY2VzcyA9IHNwYXduKCdjb2RleCcsIGFyZ3MsIHtcbiAgICBjd2QsXG4gICAgc3RkaW86ICdpbmhlcml0JyxcbiAgICBlbnY6IHtcbiAgICAgIC4uLnByb2Nlc3MuZW52LFxuICAgICAgV09SS1NQQUNFX1BBVEg6IGN3ZCxcbiAgICAgIEJBU0VfQlJBTkNIOiBiYXNlQnJhbmNoLFxuICAgICAgUEFSRU5UX0JSQU5DSDogcGFyZW50QnJhbmNoLFxuICAgICAgV09SS1NQQUNFX0JSQU5DSDogYnJhbmNoTmFtZVxuICAgIH1cbiAgfSk7XG5cbiAgY29udGV4dC5vbkNhbmNlbCgoKSA9PiB7XG4gICAgY29udGV4dC5sb2dnZXIuaW5mbyhgJHtpbnB1dC5hY3Rpb25OYW1lfSBhY3Rpb24gY2FuY2VsbGVkLCB0ZXJtaW5hdGluZyBjb2RleGApO1xuICAgIGNoaWxkLmtpbGwoJ1NJR1RFUk0nKTtcbiAgfSk7XG5cbiAgY29uc3QgZXhpdENvZGUgPSBhd2FpdCBuZXcgUHJvbWlzZTxudW1iZXIgfCBudWxsPigocmVzb2x2ZSkgPT4ge1xuICAgIGNoaWxkLm9uKCdjbG9zZScsIHJlc29sdmUpO1xuICB9KTtcblxuICBjb250ZXh0LmxvZ2dlci5pbmZvKGAke2lucHV0LmFjdGlvbk5hbWV9IGFjdGlvbiBjb21wbGV0ZWRgLCB7IGV4aXRDb2RlIH0pO1xuXG4gIHRyeSB7XG4gICAgc3Bhd25CcmFuY2hDbGVhbnVwV2F0Y2hlcih7XG4gICAgICBjYXJkSWQ6IGlucHV0LmNhcmRJZCxcbiAgICAgIHJlcG9Sb290OiBpbnB1dC5yZXBvUm9vdCxcbiAgICAgIGFwaUJhc2VVcmw6IGlucHV0LmFwaUJhc2VVcmwsXG4gICAgICBhcGlBY2Nlc3NUb2tlbjogaW5wdXQuYXBpQWNjZXNzVG9rZW5cbiAgICB9KTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBjb250ZXh0LmxvZ2dlci53YXJuKCdGYWlsZWQgdG8gc3Bhd24gYnJhbmNoLWNsZWFudXAgd2F0Y2hlciAobm9uLWZhdGFsKScsIHtcbiAgICAgIGVycm9yOiBlcnJvck1lc3NhZ2UoZXJyb3IpXG4gICAgfSk7XG4gIH1cbn1cbiIsICIvKipcbiAqIEVycm9yIGNsYXNzZXMgZm9yIHRoZSBDYXJkcyBWMiBTREsuXG4gKlxuICogVGhlc2UgZXJyb3JzIG5vcm1hbGl6ZSBzZXJ2ZXIgcmVzcG9uc2VzIGFuZCBuZXR3b3JrIGZhaWx1cmVzIHNvIGNhbGxlcnMgY2FuXG4gKiBkaXN0aW5ndWlzaCBBUEkgdmFsaWRhdGlvbiBwcm9ibGVtcyBmcm9tIHRyYW5zcG9ydCBpc3N1ZXMuXG4gKlxuICpcbiAqIEBzdW1tYXJ5IEVycm9yIGNsYXNzZXMgZm9yIHRoZSBDYXJkcyBWMiBTREtcbiAqIEBtb2R1bGUgdHlwZXMvZXJyb3JzXG4gKi9cblxuaW1wb3J0IHR5cGUgeyBGaWVsZEVycm9yIH0gZnJvbSAnLi4vLi4vcHJvdG9jb2wvaW5kZXguanMnO1xuXG4vKipcbiAqIEVycm9yIHRocm93biB3aGVuIGFuIEFQSSByZXF1ZXN0IGZhaWxzIHdpdGggYW4gZXJyb3IgcmVzcG9uc2UuXG4gKlxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIHRyeSB7XG4gKiAgIGF3YWl0IGNsaWVudC5jcmVhdGVDYXJkKGRhdGEpO1xuICogfSBjYXRjaCAoZXJyb3IpIHtcbiAqICAgaWYgKGVycm9yIGluc3RhbmNlb2YgQXBpRXJyb3IpIHtcbiAqICAgICBjb25zb2xlLmVycm9yKGBBUEkgZXJyb3IgWyR7ZXJyb3IuY29kZX1dOiAke2Vycm9yLm1lc3NhZ2V9YCk7XG4gKiAgICAgaWYgKGVycm9yLmZpZWxkcykge1xuICogICAgICAgZXJyb3IuZmllbGRzLmZvckVhY2goZiA9PiBjb25zb2xlLmVycm9yKGAgICR7Zi5maWVsZH06ICR7Zi5tZXNzYWdlfWApKTtcbiAqICAgICB9XG4gKiAgIH1cbiAqIH1cbiAqIGBgYFxuICovXG5leHBvcnQgY2xhc3MgQXBpRXJyb3IgZXh0ZW5kcyBFcnJvciB7XG4gIC8qKlxuICAgKiBDcmVhdGVzIGEgbmV3IEFwaUVycm9yIGluc3RhbmNlLlxuICAgKlxuICAgKiBAcGFyYW0gbWVzc2FnZSAtIEh1bWFuLXJlYWRhYmxlIGVycm9yIG1lc3NhZ2VcbiAgICogQHBhcmFtIGNvZGUgLSBNYWNoaW5lLXJlYWRhYmxlIGVycm9yIGNvZGVcbiAgICogQHBhcmFtIGZpZWxkcyAtIE9wdGlvbmFsIGFycmF5IG9mIGZpZWxkLXNwZWNpZmljIHZhbGlkYXRpb24gZXJyb3JzXG4gICAqL1xuICBjb25zdHJ1Y3RvcihcbiAgICBtZXNzYWdlOiBzdHJpbmcsXG4gICAgcHVibGljIHJlYWRvbmx5IGNvZGU6IHN0cmluZyxcbiAgICBwdWJsaWMgcmVhZG9ubHkgZmllbGRzPzogRmllbGRFcnJvcltdXG4gICkge1xuICAgIHN1cGVyKG1lc3NhZ2UpO1xuICAgIHRoaXMubmFtZSA9ICdBcGlFcnJvcic7XG4gIH1cbn1cblxuLyoqXG4gKiBFcnJvciB0aHJvd24gd2hlbiBhIG5ldHdvcmsgcmVxdWVzdCBmYWlscyBkdWUgdG8gY29ubmVjdGl2aXR5IGlzc3Vlcy5cbiAqXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogdHJ5IHtcbiAqICAgYXdhaXQgY2xpZW50Lmxpc3RDYXJkcygpO1xuICogfSBjYXRjaCAoZXJyb3IpIHtcbiAqICAgaWYgKGVycm9yIGluc3RhbmNlb2YgTmV0d29ya0Vycm9yKSB7XG4gKiAgICAgY29uc29sZS5lcnJvcihgTmV0d29yayBlcnJvcjogJHtlcnJvci5tZXNzYWdlfWApO1xuICogICAgIGlmIChlcnJvci5jYXVzZSkge1xuICogICAgICAgY29uc29sZS5lcnJvcihgQ2F1c2VkIGJ5OiAke2Vycm9yLmNhdXNlLm1lc3NhZ2V9YCk7XG4gKiAgICAgfVxuICogICB9XG4gKiB9XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNsYXNzIE5ldHdvcmtFcnJvciBleHRlbmRzIEVycm9yIHtcbiAgLyoqXG4gICAqIENyZWF0ZXMgYSBuZXcgTmV0d29ya0Vycm9yIGluc3RhbmNlLlxuICAgKlxuICAgKiBAcGFyYW0gbWVzc2FnZSAtIEh1bWFuLXJlYWRhYmxlIGVycm9yIG1lc3NhZ2VcbiAgICogQHBhcmFtIGNhdXNlIC0gT3B0aW9uYWwgdW5kZXJseWluZyBlcnJvciB0aGF0IGNhdXNlZCB0aGlzIG5ldHdvcmsgZmFpbHVyZVxuICAgKi9cbiAgY29uc3RydWN0b3IoXG4gICAgbWVzc2FnZTogc3RyaW5nLFxuICAgIHB1YmxpYyByZWFkb25seSBjYXVzZT86IEVycm9yXG4gICkge1xuICAgIHN1cGVyKG1lc3NhZ2UpO1xuICAgIHRoaXMubmFtZSA9ICdOZXR3b3JrRXJyb3InO1xuICB9XG59XG4iLCAiLyoqXG4gKiBIVFRQIGNsaWVudCBmb3IgdGhlIENhcmRzIFYyIFJFU1QgQVBJLlxuICpcbiAqXG4gKiBAc3VtbWFyeSBIVFRQIGNsaWVudCBmb3IgdGhlIENhcmRzIFYyIFJFU1QgQVBJXG4gKiBAbW9kdWxlIHNkay9DYXJkc0NsaWVudFxuICovXG5cbmltcG9ydCB0eXBlIHtcbiAgQWN0aW9uUmVzdWx0LFxuICBDYXJkLFxuICBDb21wYXJlUmVxdWVzdCxcbiAgQ29tcGFyZVN0YXRlLFxuICBIdHRwQ2xpZW50LFxuICBTdHJlYW1NZXRhLFxuICBUaW1lbGluZUl0ZW1cbn0gZnJvbSAnLi4vcHJvdG9jb2wvaW5kZXguanMnO1xuaW1wb3J0IHR5cGUge1xuICBBZGRCcmFuY2hSZXF1ZXN0LFxuICBBdHRhY2htZW50UmVzcG9uc2UsXG4gIEJyYW5jaGVzUmVzcG9uc2UsXG4gIENhcmRDcmVhdGVEYXRhLFxuICBDYXJkc0NsaWVudE9wdGlvbnMsXG4gIENhcmRVcGRhdGVEYXRhLFxuICBDb21tZW50LFxuICBDb21tZW50Q3JlYXRlRGF0YSxcbiAgQ29tbWVudFVwZGF0ZURhdGEsXG4gIENvbW1pdEluZm8sXG4gIEdhdGVBcHByb3ZhbFJlc3BvbnNlLFxuICBJbmdlc3RXc0ZhY3RvcnksXG4gIExpc3RDYXJkc09wdGlvbnMsXG4gIFN0cmVhbVJlc3VsdCxcbiAgU3RyZWFtV3JpdGVyLFxuICBTdHJlYW1Xcml0ZXJPcHRpb25zLFxuICBUaW1lbGluZU9wdGlvbnMsXG4gIFR5cGVTY2hlbWFzUmVzcG9uc2UsXG4gIFdzU3RyZWFtU2Vzc2lvblxufSBmcm9tICcuL3R5cGVzL2NsaWVudC5qcyc7XG5pbXBvcnQgeyBBcGlFcnJvciwgTmV0d29ya0Vycm9yIH0gZnJvbSAnLi90eXBlcy9lcnJvcnMuanMnO1xuXG4vKiogSW5pdGlhbCByZXF1ZXN0IHRpbWVvdXQgaW4gbWlsbGlzZWNvbmRzICgzIHNlY29uZHMgdG8gYWNjb21tb2RhdGUgZ2l0LWJhY2tlZCBlbmRwb2ludHMpLiAqL1xuY29uc3QgSU5JVElBTF9USU1FT1VUX01TID0gM18wMDA7XG5cbi8qKiBNYXhpbXVtIHJlcXVlc3QgdGltZW91dCBpbiBtaWxsaXNlY29uZHMgYWZ0ZXIgZXhwb25lbnRpYWwgYmFja29mZi4gKi9cbmNvbnN0IE1BWF9USU1FT1VUX01TID0gMTBfMDAwO1xuXG4vKiogTWF4aW11bSBudW1iZXIgb2YgYXV0b21hdGljIHJldHJpZXMgZm9yIHRpbWVvdXQgZXJyb3JzIGJlZm9yZSBnaXZpbmcgdXAuICovXG5jb25zdCBNQVhfVElNRU9VVF9SRVRSSUVTID0gMjtcblxuLyoqXG4gKiBUeXBlLXNhZmUgSFRUUCBjbGllbnQgZm9yIHRoZSBDYXJkcyBWMiBSRVNUIEFQSS5cbiAqXG4gKiBVc2VzIHRoZSBGZXRjaCBBUEkgYnkgZGVmYXVsdCBhbmQgc3VwcG9ydHMgZGVwZW5kZW5jeSBpbmplY3Rpb24gb2YgYW5cbiAqIGFsdGVybmF0ZSB7QGxpbmsgSHR0cENsaWVudH0gZm9yIHRlc3RzIG9yIGN1c3RvbSB0cmFuc3BvcnRzLiBBbGwgcHVibGljXG4gKiBtZXRob2RzIHN1cmZhY2Ugc2VydmVyIGZhaWx1cmVzIGFzIHtAbGluayBBcGlFcnJvcn0gYW5kIHRyYW5zcG9ydCBmYWlsdXJlc1xuICogYXMge0BsaW5rIE5ldHdvcmtFcnJvcn0uXG4gKlxuICogVGhlIGRlZmF1bHQgSFRUUCBjbGllbnQgYXBwbGllcyBhbiBleHBvbmVudGlhbCBiYWNrb2ZmIHRpbWVvdXQgdG8gZmV0Y2hcbiAqIHJlcXVlc3RzOiBzdGFydGluZyBhdCAzIHNlY29uZHMsIGRvdWJsaW5nIG9uIGVhY2ggY29uc2VjdXRpdmUgZmFpbHVyZSB1cFxuICogdG8gYSAxMC1zZWNvbmQgY2FwLCBhbmQgcmVzZXR0aW5nIG9uIGFueSBzdWNjZXNzZnVsIHJlc3BvbnNlLiBUaGlzIGVuc3VyZXNcbiAqIGZhc3QgZmFpbHVyZSBkZXRlY3Rpb24gd2hlbiB0aGUgc2VydmVyIGlzIGRvd24gd2hpbGUgYWxsb3dpbmcgc2xvd2VyXG4gKiByZXNwb25zZXMgZHVyaW5nIHJlY292ZXJ5LlxuICpcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBjb25zdCBjbGllbnQgPSBuZXcgQ2FyZHNDbGllbnQoeyBiYXNlVXJsOiAnaHR0cDovL2xvY2FsaG9zdDozMDAwJywgYWNjZXNzVG9rZW46ICd0b2tlbicgfSk7XG4gKlxuICogY29uc3QgY2FyZHMgPSBhd2FpdCBjbGllbnQubGlzdENhcmRzKHsgc3RhdHVzOiAnYWN0aXZlJyB9KTtcbiAqIGF3YWl0IGNsaWVudC51cGRhdGVDYXJkKGNhcmRJZCwgeyBzdGF0dXM6ICdkb25lJyB9KTtcbiAqIGBgYFxuICovXG5leHBvcnQgY2xhc3MgQ2FyZHNDbGllbnQge1xuICBwcml2YXRlIHJlYWRvbmx5IF9odHRwQ2xpZW50PzogSHR0cENsaWVudDtcblxuICAvKiogQ3VycmVudCB0aW1lb3V0IGluIG1pbGxpc2Vjb25kcywgaW5jcmVhc2VzIHdpdGggY29uc2VjdXRpdmUgZmFpbHVyZXMuICovXG4gIHByaXZhdGUgX2N1cnJlbnRUaW1lb3V0TXMgPSBJTklUSUFMX1RJTUVPVVRfTVM7XG5cbiAgLyoqXG4gICAqIENyZWF0ZXMgYSBuZXcgQ2FyZHNDbGllbnQgaW5zdGFuY2UuXG4gICAqXG4gICAqIEBwYXJhbSBvcHRpb25zIC0gQ29uZmlndXJhdGlvbiBvcHRpb25zIGluY2x1ZGluZyBiYXNlIFVSTCBhbmQgYXV0aCB0b2tlbi5cbiAgICogQHBhcmFtIGh0dHBDbGllbnQgLSBPcHRpb25hbCBIVFRQIGNsaWVudCBmb3IgZGVwZW5kZW5jeSBpbmplY3Rpb24uXG4gICAqL1xuICBjb25zdHJ1Y3RvcihcbiAgICBwcml2YXRlIHJlYWRvbmx5IG9wdGlvbnM6IENhcmRzQ2xpZW50T3B0aW9ucyxcbiAgICBodHRwQ2xpZW50PzogSHR0cENsaWVudFxuICApIHtcbiAgICB0aGlzLl9odHRwQ2xpZW50ID0gaHR0cENsaWVudDtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXR1cm5zIHRoZSBiYXNlIFVSTCB1c2VkIHRvIGJ1aWxkIEFQSSByZXF1ZXN0cy5cbiAgICpcbiAgICogQHJldHVybnMgVGhlIGJhc2UgVVJMIHN0cmluZyBhcyBwcm92aWRlZCBpbiB7QGxpbmsgQ2FyZHNDbGllbnRPcHRpb25zfS5cbiAgICovXG4gIGdldEJhc2VVcmwoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gdGhpcy5vcHRpb25zLmJhc2VVcmw7XG4gIH1cblxuICAvKipcbiAgICogUmV0dXJucyB3aGV0aGVyIGFuIEhUVFAgY2xpZW50IHdhcyBpbmplY3RlZC5cbiAgICpcbiAgICogQHJldHVybnMgVHJ1ZSBpZiBhbiBIVFRQIGNsaWVudCB3YXMgcHJvdmlkZWQgZHVyaW5nIGNvbnN0cnVjdGlvbi5cbiAgICogQGludGVybmFsIFVzZWQgZm9yIHRlc3RpbmcgZGVwZW5kZW5jeSBpbmplY3Rpb24uXG4gICAqL1xuICBoYXNIdHRwQ2xpZW50KCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLl9odHRwQ2xpZW50ICE9PSB1bmRlZmluZWQ7XG4gIH1cbiAgLyoqXG4gICAqIFJldHVybnMgYW4gQWJvcnRTaWduYWwgdGhhdCBmaXJlcyBhZnRlciB0aGUgY3VycmVudCBiYWNrb2ZmIHRpbWVvdXQuXG4gICAqIFVzZXMgY2FsbGVyJ3Mgc2lnbmFsIGlmIHByb3ZpZGVkIChmb3IgREkvdGVzdGluZyksIG90aGVyd2lzZSBhcHBsaWVzIHRoZSBiYWNrb2ZmIHRpbWVvdXQuXG4gICAqXG4gICAqIEBwYXJhbSBleGlzdGluZ1NpZ25hbCAtIE9wdGlvbmFsIGNhbGxlci1wcm92aWRlZCBzaWduYWwgdG8gcmV1c2UgaW5zdGVhZCBvZiBjcmVhdGluZyBhIHRpbWVvdXQgc2lnbmFsLlxuICAgKiBAcmV0dXJucyBBYm9ydFNpZ25hbCB0aGF0IGNvbnRyb2xzIHJlcXVlc3QgY2FuY2VsbGF0aW9uIGZvciB0aGUgY3VycmVudCBvcGVyYXRpb24uXG4gICAqL1xuICBwcml2YXRlIGdldFRpbWVvdXRTaWduYWwoZXhpc3RpbmdTaWduYWw/OiBBYm9ydFNpZ25hbCB8IG51bGwpOiBBYm9ydFNpZ25hbCB7XG4gICAgaWYgKGV4aXN0aW5nU2lnbmFsKSByZXR1cm4gZXhpc3RpbmdTaWduYWw7XG4gICAgcmV0dXJuIEFib3J0U2lnbmFsLnRpbWVvdXQodGhpcy5fY3VycmVudFRpbWVvdXRNcyk7XG4gIH1cblxuICAvKipcbiAgICogUmVjb3JkcyBhIHN1Y2Nlc3NmdWwgcmVxdWVzdCBhbmQgcmVzZXRzIHRoZSB0aW1lb3V0IGJhY2tvZmYuXG4gICAqL1xuICBwcml2YXRlIG9uUmVxdWVzdFN1Y2Nlc3MoKTogdm9pZCB7XG4gICAgdGhpcy5fY3VycmVudFRpbWVvdXRNcyA9IElOSVRJQUxfVElNRU9VVF9NUztcbiAgfVxuXG4gIC8qKlxuICAgKiBSZWNvcmRzIGEgZmFpbGVkIHJlcXVlc3QgYW5kIGluY3JlYXNlcyB0aGUgdGltZW91dCB2aWEgZXhwb25lbnRpYWwgYmFja29mZi5cbiAgICovXG4gIHByaXZhdGUgb25SZXF1ZXN0RmFpbHVyZSgpOiB2b2lkIHtcbiAgICB0aGlzLl9jdXJyZW50VGltZW91dE1zID0gTWF0aC5taW4odGhpcy5fY3VycmVudFRpbWVvdXRNcyAqIDIsIE1BWF9USU1FT1VUX01TKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBEZWZhdWx0IEhUVFAgY2xpZW50IGltcGxlbWVudGF0aW9uIHVzaW5nIGZldGNoICsgSlNPTiBwYXlsb2Fkcy5cbiAgICpcbiAgICogRWFjaCBmZXRjaCBjYWxsIGluY2x1ZGVzIGFuIEFib3J0U2lnbmFsLnRpbWVvdXQgdGhhdCBzdGFydHMgYXQgMyBzZWNvbmRzXG4gICAqIGFuZCBkb3VibGVzIG9uIGNvbnNlY3V0aXZlIGZhaWx1cmVzIHVwIHRvIDEwIHNlY29uZHMuXG4gICAqL1xuICBwcml2YXRlIGRlZmF1bHRIdHRwQ2xpZW50OiBIdHRwQ2xpZW50ID0ge1xuICAgIGdldDogYXN5bmMgPFQ+KHVybDogc3RyaW5nLCBvcHRpb25zPzogUmVxdWVzdEluaXQpOiBQcm9taXNlPFQ+ID0+IHtcbiAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZmV0Y2godXJsLCB7XG4gICAgICAgIC4uLm9wdGlvbnMsXG4gICAgICAgIGhlYWRlcnM6IHsgLi4udGhpcy5nZXRIZWFkZXJzKCksIC4uLm9wdGlvbnM/LmhlYWRlcnMgfSxcbiAgICAgICAgc2lnbmFsOiB0aGlzLmdldFRpbWVvdXRTaWduYWwob3B0aW9ucz8uc2lnbmFsKVxuICAgICAgfSk7XG4gICAgICBpZiAoIXJlc3BvbnNlLm9rKSB0aHJvdyByZXNwb25zZTtcbiAgICAgIHJldHVybiByZXNwb25zZS5qc29uKCkgYXMgUHJvbWlzZTxUPjtcbiAgICB9LFxuICAgIHBvc3Q6IGFzeW5jIDxUPih1cmw6IHN0cmluZywgYm9keTogdW5rbm93biwgb3B0aW9ucz86IFJlcXVlc3RJbml0KTogUHJvbWlzZTxUPiA9PiB7XG4gICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGZldGNoKHVybCwge1xuICAgICAgICAuLi5vcHRpb25zLFxuICAgICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgICAgaGVhZGVyczogeyAuLi50aGlzLmdldEhlYWRlcnMoKSwgLi4ub3B0aW9ucz8uaGVhZGVycyB9LFxuICAgICAgICBib2R5OiBib2R5ID8gSlNPTi5zdHJpbmdpZnkoYm9keSkgOiB1bmRlZmluZWQsXG4gICAgICAgIHNpZ25hbDogdGhpcy5nZXRUaW1lb3V0U2lnbmFsKG9wdGlvbnM/LnNpZ25hbClcbiAgICAgIH0pO1xuICAgICAgaWYgKCFyZXNwb25zZS5vaykgdGhyb3cgcmVzcG9uc2U7XG4gICAgICByZXR1cm4gcmVzcG9uc2UuanNvbigpIGFzIFByb21pc2U8VD47XG4gICAgfSxcbiAgICBwdXQ6IGFzeW5jIDxUPih1cmw6IHN0cmluZywgYm9keTogdW5rbm93biwgb3B0aW9ucz86IFJlcXVlc3RJbml0KTogUHJvbWlzZTxUPiA9PiB7XG4gICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGZldGNoKHVybCwge1xuICAgICAgICAuLi5vcHRpb25zLFxuICAgICAgICBtZXRob2Q6ICdQVVQnLFxuICAgICAgICBoZWFkZXJzOiB7IC4uLnRoaXMuZ2V0SGVhZGVycygpLCAuLi5vcHRpb25zPy5oZWFkZXJzIH0sXG4gICAgICAgIGJvZHk6IGJvZHkgPyBKU09OLnN0cmluZ2lmeShib2R5KSA6IHVuZGVmaW5lZCxcbiAgICAgICAgc2lnbmFsOiB0aGlzLmdldFRpbWVvdXRTaWduYWwob3B0aW9ucz8uc2lnbmFsKVxuICAgICAgfSk7XG4gICAgICBpZiAoIXJlc3BvbnNlLm9rKSB0aHJvdyByZXNwb25zZTtcbiAgICAgIHJldHVybiByZXNwb25zZS5qc29uKCkgYXMgUHJvbWlzZTxUPjtcbiAgICB9LFxuICAgIHBhdGNoOiBhc3luYyA8VD4odXJsOiBzdHJpbmcsIGJvZHk6IHVua25vd24sIG9wdGlvbnM/OiBSZXF1ZXN0SW5pdCk6IFByb21pc2U8VD4gPT4ge1xuICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBmZXRjaCh1cmwsIHtcbiAgICAgICAgLi4ub3B0aW9ucyxcbiAgICAgICAgbWV0aG9kOiAnUEFUQ0gnLFxuICAgICAgICBoZWFkZXJzOiB7IC4uLnRoaXMuZ2V0SGVhZGVycygpLCAuLi5vcHRpb25zPy5oZWFkZXJzIH0sXG4gICAgICAgIGJvZHk6IGJvZHkgPyBKU09OLnN0cmluZ2lmeShib2R5KSA6IHVuZGVmaW5lZCxcbiAgICAgICAgc2lnbmFsOiB0aGlzLmdldFRpbWVvdXRTaWduYWwob3B0aW9ucz8uc2lnbmFsKVxuICAgICAgfSk7XG4gICAgICBpZiAoIXJlc3BvbnNlLm9rKSB0aHJvdyByZXNwb25zZTtcbiAgICAgIHJldHVybiByZXNwb25zZS5qc29uKCkgYXMgUHJvbWlzZTxUPjtcbiAgICB9LFxuICAgIGRlbGV0ZTogYXN5bmMgKHVybDogc3RyaW5nLCBvcHRpb25zPzogUmVxdWVzdEluaXQpOiBQcm9taXNlPHZvaWQ+ID0+IHtcbiAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZmV0Y2godXJsLCB7XG4gICAgICAgIC4uLm9wdGlvbnMsXG4gICAgICAgIG1ldGhvZDogJ0RFTEVURScsXG4gICAgICAgIGhlYWRlcnM6IHsgLi4udGhpcy5nZXRIZWFkZXJzKCksIC4uLm9wdGlvbnM/LmhlYWRlcnMgfSxcbiAgICAgICAgc2lnbmFsOiB0aGlzLmdldFRpbWVvdXRTaWduYWwob3B0aW9ucz8uc2lnbmFsKVxuICAgICAgfSk7XG4gICAgICBpZiAoIXJlc3BvbnNlLm9rKSB0aHJvdyByZXNwb25zZTtcbiAgICB9XG4gIH07XG5cbiAgLyoqXG4gICAqIEdldHMgSFRUUCBoZWFkZXJzIGZvciBKU09OIEFQSSByZXF1ZXN0cy5cbiAgICpcbiAgICogQHJldHVybnMgSGVhZGVycyB3aXRoIEpTT04gY29udGVudCB0eXBlIGFuZCBvcHRpb25hbCBiZWFyZXIgdG9rZW4uXG4gICAqL1xuICBwcml2YXRlIGdldEhlYWRlcnMoKTogSGVhZGVyc0luaXQge1xuICAgIGNvbnN0IGhlYWRlcnM6IEhlYWRlcnNJbml0ID0geyAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nIH07XG4gICAgaWYgKHRoaXMub3B0aW9ucy5hY2Nlc3NUb2tlbikge1xuICAgICAgaGVhZGVyc1snQXV0aG9yaXphdGlvbiddID0gYEJlYXJlciAke3RoaXMub3B0aW9ucy5hY2Nlc3NUb2tlbn1gO1xuICAgIH1cbiAgICByZXR1cm4gaGVhZGVycztcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXRzIHRoZSBIVFRQIGNsaWVudCB0byB1c2UgZm9yIHJlcXVlc3RzLlxuICAgKlxuICAgKiBAcmV0dXJucyBJbmplY3RlZCBIVFRQIGNsaWVudCB3aGVuIHByb3ZpZGVkLCBvdGhlcndpc2UgdGhlIGRlZmF1bHQgZmV0Y2gtYmFzZWQgY2xpZW50LlxuICAgKi9cbiAgcHJpdmF0ZSBnZXRIdHRwQ2xpZW50KCk6IEh0dHBDbGllbnQge1xuICAgIHJldHVybiB0aGlzLl9odHRwQ2xpZW50ID8/IHRoaXMuZGVmYXVsdEh0dHBDbGllbnQ7XG4gIH1cblxuICAvKipcbiAgICogQnVpbGRzIGEgVVJMIHJlbGF0aXZlIHRvIHRoZSBjb25maWd1cmVkIGJhc2UgVVJMLlxuICAgKlxuICAgKiBVbmRlZmluZWQgYW5kIG51bGwgcXVlcnkgcGFyYW1zIGFyZSBvbWl0dGVkLiBWYWx1ZXMgYXJlIHN0cmluZ2lmaWVkLlxuICAgKlxuICAgKiBAcGFyYW0gcGF0aCAtIFJlbGF0aXZlIEFQSSBwYXRoIHRvIGFwcGVuZCB0byB0aGUgY29uZmlndXJlZCBiYXNlIFVSTC5cbiAgICogQHBhcmFtIHBhcmFtcyAtIE9wdGlvbmFsIHF1ZXJ5IHBhcmFtZXRlcnMgdG8gZW5jb2RlIG9udG8gdGhlIFVSTC5cbiAgICogQHJldHVybnMgRnVsbHktcXVhbGlmaWVkIHJlcXVlc3QgVVJMIHN0cmluZy5cbiAgICovXG4gIHByaXZhdGUgYnVpbGRVcmwocGF0aDogc3RyaW5nLCBwYXJhbXM/OiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPik6IHN0cmluZyB7XG4gICAgY29uc3QgdXJsID0gbmV3IFVSTChwYXRoLCB0aGlzLm9wdGlvbnMuYmFzZVVybCk7XG4gICAgaWYgKHBhcmFtcykge1xuICAgICAgZm9yIChjb25zdCBba2V5LCB2YWx1ZV0gb2YgT2JqZWN0LmVudHJpZXMocGFyYW1zKSkge1xuICAgICAgICBpZiAodmFsdWUgIT09IHVuZGVmaW5lZCAmJiB2YWx1ZSAhPT0gbnVsbCkge1xuICAgICAgICAgIHVybC5zZWFyY2hQYXJhbXMuc2V0KGtleSwgU3RyaW5nKHZhbHVlKSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHVybC50b1N0cmluZygpO1xuICB9XG5cbiAgLyoqXG4gICAqIFdyYXBzIGEgcmVxdWVzdCB3aXRoIGNvbnNpc3RlbnQgZXJyb3IgaGFuZGxpbmcuXG4gICAqXG4gICAqIEBwYXJhbSBmbiAtIEFzeW5jIHJlcXVlc3QgZnVuY3Rpb24gdG8gZXhlY3V0ZS5cbiAgICogQHJldHVybnMgVGhlIHJlc29sdmVkIHZhbHVlIGZyb20gdGhlIHJlcXVlc3QgZnVuY3Rpb24uXG4gICAqIEB0aHJvd3MgQXBpRXJyb3Igd2hlbiB0aGUgc2VydmVyIHJlc3BvbmRzIHdpdGggYSBub24tMnh4IHN0YXR1cy5cbiAgICogQHRocm93cyBOZXR3b3JrRXJyb3IgZm9yIG5ldHdvcmsgZmFpbHVyZXMgb3IgdW5leHBlY3RlZCBleGNlcHRpb25zLlxuICAgKi9cbiAgcHJpdmF0ZSBhc3luYyByZXF1ZXN0PFQ+KGZuOiAoKSA9PiBQcm9taXNlPFQ+KTogUHJvbWlzZTxUPiB7XG4gICAgbGV0IGxhc3RUaW1lb3V0RXJyb3I6IE5ldHdvcmtFcnJvciB8IHVuZGVmaW5lZDtcblxuICAgIGZvciAobGV0IGF0dGVtcHQgPSAwOyBhdHRlbXB0IDw9IE1BWF9USU1FT1VUX1JFVFJJRVM7IGF0dGVtcHQrKykge1xuICAgICAgdHJ5IHtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgZm4oKTtcbiAgICAgICAgdGhpcy5vblJlcXVlc3RTdWNjZXNzKCk7XG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICBpZiAoZXJyb3IgaW5zdGFuY2VvZiBSZXNwb25zZSkge1xuICAgICAgICAgIC8vIFNlcnZlciByZXNwb25kZWQgKGV2ZW4gd2l0aCBhbiBlcnJvciBzdGF0dXMpIC0gY29ubmVjdGlvbiBpcyBhbGl2ZSwgcmVzZXQgYmFja29mZlxuICAgICAgICAgIHRoaXMub25SZXF1ZXN0U3VjY2VzcygpO1xuICAgICAgICAgIGxldCBib2R5OiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPiA9IHt9O1xuICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICBib2R5ID0gYXdhaXQgZXJyb3IuanNvbigpO1xuICAgICAgICAgIH0gY2F0Y2ggKHBhcnNlRXJyb3IpIHtcbiAgICAgICAgICAgIC8vIFN5bnRheEVycm9yIGlzIGV4cGVjdGVkIHdoZW4gc2VydmVyIHJldHVybnMgbm9uLUpTT04gZXJyb3IgcmVzcG9uc2UgKGUuZy4sIEhUTUwgZXJyb3IgcGFnZSlcbiAgICAgICAgICAgIGlmICghKHBhcnNlRXJyb3IgaW5zdGFuY2VvZiBTeW50YXhFcnJvcikpIHtcbiAgICAgICAgICAgICAgY29uc29sZS53YXJuKCdbQ2FyZHNDbGllbnRdIFVuZXhwZWN0ZWQgZXJyb3IgcGFyc2luZyBlcnJvciByZXNwb25zZTonLCBwYXJzZUVycm9yKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgY29uc3QgbWVzc2FnZSA9XG4gICAgICAgICAgICAoYm9keVsnZXJyb3InXSBhcyBzdHJpbmcgfCB1bmRlZmluZWQpIHx8IChib2R5WydtZXNzYWdlJ10gYXMgc3RyaW5nIHwgdW5kZWZpbmVkKSB8fCBlcnJvci5zdGF0dXNUZXh0O1xuICAgICAgICAgIGNvbnN0IGNvZGUgPSAoYm9keVsnY29kZSddIGFzIHN0cmluZyB8IHVuZGVmaW5lZCkgfHwgU3RyaW5nKGVycm9yLnN0YXR1cyk7XG4gICAgICAgICAgY29uc3QgZmllbGRzID0gYm9keVsnZmllbGRzJ10gYXMgQXJyYXk8eyBmaWVsZDogc3RyaW5nOyBtZXNzYWdlOiBzdHJpbmcgfT4gfCB1bmRlZmluZWQ7XG4gICAgICAgICAgdGhyb3cgbmV3IEFwaUVycm9yKG1lc3NhZ2UsIGNvZGUsIGZpZWxkcyk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBOZXR3b3JrIG9yIHRpbWVvdXQgZmFpbHVyZSAtIGluY3JlYXNlIGJhY2tvZmYgZm9yIG5leHQgYXR0ZW1wdFxuICAgICAgICB0aGlzLm9uUmVxdWVzdEZhaWx1cmUoKTtcblxuICAgICAgICBpZiAoZXJyb3IgaW5zdGFuY2VvZiBET01FeGNlcHRpb24gJiYgZXJyb3IubmFtZSA9PT0gJ1RpbWVvdXRFcnJvcicpIHtcbiAgICAgICAgICBsYXN0VGltZW91dEVycm9yID0gbmV3IE5ldHdvcmtFcnJvcignUmVxdWVzdCB0aW1lZCBvdXQnLCBlcnJvcik7XG4gICAgICAgICAgLy8gUmV0cnkgb24gdGltZW91dCAtIG9uUmVxdWVzdEZhaWx1cmUoKSBhbHJlYWR5IGluY3JlYXNlZCBfY3VycmVudFRpbWVvdXRNc1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gTm9uLXRpbWVvdXQgbmV0d29yayBlcnJvcnMgKEROUyBmYWlsdXJlLCBjb25uZWN0aW9uIHJlZnVzZWQpIGFyZSBub3QgcmV0cmllZFxuICAgICAgICB0aHJvdyBuZXcgTmV0d29ya0Vycm9yKCdSZXF1ZXN0IGZhaWxlZCcsIGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvciA6IHVuZGVmaW5lZCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gQWxsIHJldHJ5IGF0dGVtcHRzIGV4aGF1c3RlZFxuICAgIHRocm93IGxhc3RUaW1lb3V0RXJyb3IhO1xuICB9XG5cbiAgLy8gLS0tIENhcmQgT3BlcmF0aW9ucyAtLS1cblxuICAvKipcbiAgICogTGlzdHMgY2FyZHMgd2l0aCBvcHRpb25hbCBmaWx0ZXJpbmcuXG4gICAqXG4gICAqIEBwYXJhbSBvcHRpb25zIC0gT3B0aW9uYWwgZmlsdGVyIGFuZCBwYWdpbmF0aW9uIG9wdGlvbnMuXG4gICAqIEByZXR1cm5zIFByb21pc2UgcmVzb2x2aW5nIHRvIG1hdGNoaW5nIGNhcmRzLlxuICAgKiBAdGhyb3dzIEFwaUVycm9yIHdoZW4gdGhlIHNlcnZlciByZXNwb25kcyB3aXRoIGFuIGVycm9yLlxuICAgKiBAdGhyb3dzIE5ldHdvcmtFcnJvciB3aGVuIHRoZSByZXF1ZXN0IGZhaWxzIHRvIHJlYWNoIHRoZSBzZXJ2ZXIuXG4gICAqL1xuICBhc3luYyBsaXN0Q2FyZHMob3B0aW9ucz86IExpc3RDYXJkc09wdGlvbnMpOiBQcm9taXNlPENhcmRbXT4ge1xuICAgIGNvbnN0IHVybFN0ciA9IHRoaXMuYnVpbGRVcmwoJy9jYXJkcycsIHtcbiAgICAgIHdvcmtzcGFjZVBhdGg6IHRoaXMub3B0aW9ucy53b3Jrc3BhY2VQYXRoLFxuICAgICAgc3RhdHVzOiBvcHRpb25zPy5zdGF0dXMsXG4gICAgICBzZWFyY2g6IG9wdGlvbnM/LnNlYXJjaCxcbiAgICAgIGxpbWl0OiBvcHRpb25zPy5saW1pdCxcbiAgICAgIG9mZnNldDogb3B0aW9ucz8ub2Zmc2V0XG4gICAgfSk7XG4gICAgY29uc3QgdXJsID0gbmV3IFVSTCh1cmxTdHIpO1xuICAgIGZvciAoY29uc3QgdCBvZiBvcHRpb25zPy50YWdzID8/IFtdKSB7XG4gICAgICB1cmwuc2VhcmNoUGFyYW1zLmFwcGVuZCgndGFnJywgdCk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLnJlcXVlc3QoKCkgPT4gdGhpcy5nZXRIdHRwQ2xpZW50KCkuZ2V0PENhcmRbXT4odXJsLnRvU3RyaW5nKCkpKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBMaXN0cyBjYXJkcyBhcyBsaWdodHdlaWdodCBzdW1tYXJpZXMgZm9yIGxpc3Qgdmlld3MuXG4gICAqXG4gICAqIFJldHVybnMgcHJlLWZsYXR0ZW5lZCBmaWVsZHMgc3VpdGFibGUgZm9yIGRpcmVjdCB1c2UgaW4gbGlzdCByZW5kZXJpbmcsXG4gICAqIG9taXR0aW5nIGhlYXZ5d2VpZ2h0IGZpZWxkcyBsaWtlIGBwbGFuQ29udGVudGAgYW5kIGByZXBvc2l0b3J5UGF0aGAuXG4gICAqXG4gICAqIEB0ZW1wbGF0ZSBUIC0gVGhlIGV4cGVjdGVkIHN1bW1hcnkgc2hhcGUgKGRlZmF1bHQgYFJlY29yZDxzdHJpbmcsIHVua25vd24+YCkuXG4gICAqIEByZXR1cm5zIFByb21pc2UgcmVzb2x2aW5nIHRvIGNhcmQgc3VtbWFyaWVzLlxuICAgKiBAdGhyb3dzIEFwaUVycm9yIHdoZW4gdGhlIHNlcnZlciByZXNwb25kcyB3aXRoIGFuIGVycm9yLlxuICAgKiBAdGhyb3dzIE5ldHdvcmtFcnJvciB3aGVuIHRoZSByZXF1ZXN0IGZhaWxzIHRvIHJlYWNoIHRoZSBzZXJ2ZXIuXG4gICAqL1xuICBhc3luYyBsaXN0Q2FyZFN1bW1hcmllczxUID0gUmVjb3JkPHN0cmluZywgdW5rbm93bj4+KCk6IFByb21pc2U8VFtdPiB7XG4gICAgY29uc3QgdXJsID0gdGhpcy5idWlsZFVybCgnL2NhcmRzL2xpc3QnLCB7XG4gICAgICB3b3Jrc3BhY2VQYXRoOiB0aGlzLm9wdGlvbnMud29ya3NwYWNlUGF0aFxuICAgIH0pO1xuICAgIHJldHVybiB0aGlzLnJlcXVlc3QoKCkgPT4gdGhpcy5nZXRIdHRwQ2xpZW50KCkuZ2V0PFRbXT4odXJsKSk7XG4gIH1cblxuICAvKipcbiAgICogR2V0cyBhIHNpbmdsZSBjYXJkIGJ5IGlkLlxuICAgKlxuICAgKiBAcGFyYW0gY2FyZElkIC0gVGhlIGlkIG9mIHRoZSBjYXJkIHRvIHJldHJpZXZlLlxuICAgKiBAcmV0dXJucyBQcm9taXNlIHJlc29sdmluZyB0byB0aGUgY2FyZC5cbiAgICogQHRocm93cyBBcGlFcnJvciB3aGVuIHRoZSBzZXJ2ZXIgcmVzcG9uZHMgd2l0aCBhbiBlcnJvci5cbiAgICogQHRocm93cyBOZXR3b3JrRXJyb3Igd2hlbiB0aGUgcmVxdWVzdCBmYWlscyB0byByZWFjaCB0aGUgc2VydmVyLlxuICAgKi9cbiAgYXN5bmMgZ2V0Q2FyZChjYXJkSWQ6IHN0cmluZyk6IFByb21pc2U8Q2FyZD4ge1xuICAgIGNvbnN0IHVybCA9IHRoaXMuYnVpbGRVcmwoYC9jYXJkcy8ke2NhcmRJZH1gLCB7XG4gICAgICB3b3Jrc3BhY2VQYXRoOiB0aGlzLm9wdGlvbnMud29ya3NwYWNlUGF0aFxuICAgIH0pO1xuICAgIHJldHVybiB0aGlzLnJlcXVlc3QoKCkgPT4gdGhpcy5nZXRIdHRwQ2xpZW50KCkuZ2V0PENhcmQ+KHVybCkpO1xuICB9XG5cbiAgLyoqXG4gICAqIENyZWF0ZXMgYSBuZXcgY2FyZC5cbiAgICpcbiAgICogQHBhcmFtIGRhdGEgLSBDYXJkIGNyZWF0aW9uIHBheWxvYWQuXG4gICAqIEByZXR1cm5zIFByb21pc2UgcmVzb2x2aW5nIHRvIHRoZSBjcmVhdGVkIGNhcmQuXG4gICAqIEB0aHJvd3MgQXBpRXJyb3Igd2hlbiB0aGUgc2VydmVyIHJlamVjdHMgdGhlIHBheWxvYWQuXG4gICAqIEB0aHJvd3MgTmV0d29ya0Vycm9yIHdoZW4gdGhlIHJlcXVlc3QgZmFpbHMgdG8gcmVhY2ggdGhlIHNlcnZlci5cbiAgICovXG4gIGFzeW5jIGNyZWF0ZUNhcmQoZGF0YTogQ2FyZENyZWF0ZURhdGEpOiBQcm9taXNlPENhcmQ+IHtcbiAgICBjb25zdCB1cmwgPSB0aGlzLmJ1aWxkVXJsKCcvY2FyZHMnKTtcbiAgICBjb25zdCBib2R5ID0ge1xuICAgICAgLi4uZGF0YSxcbiAgICAgIHdvcmtzcGFjZVBhdGg6IHRoaXMub3B0aW9ucy53b3Jrc3BhY2VQYXRoXG4gICAgfTtcbiAgICByZXR1cm4gdGhpcy5yZXF1ZXN0KCgpID0+IHRoaXMuZ2V0SHR0cENsaWVudCgpLnBvc3Q8Q2FyZD4odXJsLCBib2R5KSk7XG4gIH1cblxuICAvKipcbiAgICogVXBkYXRlcyBhbiBleGlzdGluZyBjYXJkLlxuICAgKlxuICAgKiBAcGFyYW0gY2FyZElkIC0gVGhlIGlkIG9mIHRoZSBjYXJkIHRvIHVwZGF0ZS5cbiAgICogQHBhcmFtIGRhdGEgLSBUaGUgZmllbGRzIHRvIHVwZGF0ZS5cbiAgICogQHJldHVybnMgUHJvbWlzZSByZXNvbHZpbmcgdG8gdGhlIHVwZGF0ZWQgY2FyZC5cbiAgICogQHRocm93cyBBcGlFcnJvciB3aGVuIHRoZSBzZXJ2ZXIgcmVqZWN0cyB0aGUgdXBkYXRlLlxuICAgKiBAdGhyb3dzIE5ldHdvcmtFcnJvciB3aGVuIHRoZSByZXF1ZXN0IGZhaWxzIHRvIHJlYWNoIHRoZSBzZXJ2ZXIuXG4gICAqIEBkZXByZWNhdGVkIFVzZSBkaXJlY3QgZ2l0IG9wZXJhdGlvbnMgaW5zdGVhZC4gVGhpcyBlbmRwb2ludCB3aWxsIGJlIHJlbW92ZWQuXG4gICAqL1xuICBhc3luYyB1cGRhdGVDYXJkKGNhcmRJZDogc3RyaW5nLCBkYXRhOiBDYXJkVXBkYXRlRGF0YSk6IFByb21pc2U8Q2FyZD4ge1xuICAgIGNvbnN0IHVybCA9IHRoaXMuYnVpbGRVcmwoYC9jYXJkcy8ke2NhcmRJZH1gKTtcbiAgICByZXR1cm4gdGhpcy5yZXF1ZXN0KCgpID0+IHRoaXMuZ2V0SHR0cENsaWVudCgpLnBhdGNoPENhcmQ+KHVybCwgZGF0YSkpO1xuICB9XG5cbiAgLyoqXG4gICAqIERlbGV0ZXMgYSBjYXJkLlxuICAgKlxuICAgKiBAcGFyYW0gY2FyZElkIC0gVGhlIGlkIG9mIHRoZSBjYXJkIHRvIGRlbGV0ZS5cbiAgICogQHJldHVybnMgUHJvbWlzZSByZXNvbHZpbmcgd2hlbiBkZWxldGlvbiBpcyBjb21wbGV0ZS5cbiAgICogQHRocm93cyBBcGlFcnJvciB3aGVuIHRoZSBzZXJ2ZXIgcmVqZWN0cyB0aGUgZGVsZXRlLlxuICAgKiBAdGhyb3dzIE5ldHdvcmtFcnJvciB3aGVuIHRoZSByZXF1ZXN0IGZhaWxzIHRvIHJlYWNoIHRoZSBzZXJ2ZXIuXG4gICAqIEBkZXByZWNhdGVkIFVzZSBkaXJlY3QgZ2l0IG9wZXJhdGlvbnMgaW5zdGVhZC4gVGhpcyBlbmRwb2ludCB3aWxsIGJlIHJlbW92ZWQuXG4gICAqL1xuICBhc3luYyBkZWxldGVDYXJkKGNhcmRJZDogc3RyaW5nKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc3QgdXJsID0gdGhpcy5idWlsZFVybChgL2NhcmRzLyR7Y2FyZElkfWApO1xuICAgIHJldHVybiB0aGlzLnJlcXVlc3QoKCkgPT4gdGhpcy5nZXRIdHRwQ2xpZW50KCkuZGVsZXRlKHVybCkpO1xuICB9XG5cbiAgLy8gLS0tIENvbW1lbnQgT3BlcmF0aW9ucyAtLS1cblxuICAvKipcbiAgICogR2V0cyBhbGwgY29tbWVudHMgZm9yIGEgY2FyZC5cbiAgICpcbiAgICogQHBhcmFtIGNhcmRJZCAtIElkZW50aWZpZXIgb2YgdGhlIHRhcmdldCBjYXJkIGZvciB0aGlzIHJlcXVlc3QuXG4gICAqIEByZXR1cm5zIFByb21pc2UgcmVzb2x2aW5nIHRvIHRoZSBjb21tZW50IGxpc3QuXG4gICAqIEB0aHJvd3MgQXBpRXJyb3Igd2hlbiB0aGUgc2VydmVyIHJlc3BvbmRzIHdpdGggYW4gZXJyb3IuXG4gICAqIEB0aHJvd3MgTmV0d29ya0Vycm9yIHdoZW4gdGhlIHJlcXVlc3QgZmFpbHMgdG8gcmVhY2ggdGhlIHNlcnZlci5cbiAgICovXG4gIGFzeW5jIGdldENvbW1lbnRzKGNhcmRJZDogc3RyaW5nKTogUHJvbWlzZTxDb21tZW50W10+IHtcbiAgICBjb25zdCB1cmwgPSB0aGlzLmJ1aWxkVXJsKGAvY2FyZHMvJHtjYXJkSWR9L2NvbW1lbnRzYCk7XG4gICAgcmV0dXJuIHRoaXMucmVxdWVzdCgoKSA9PiB0aGlzLmdldEh0dHBDbGllbnQoKS5nZXQ8Q29tbWVudFtdPih1cmwpKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXRzIGEgc2luZ2xlIGNvbW1lbnQgYnkgaWQuXG4gICAqXG4gICAqIEBwYXJhbSBjYXJkSWQgLSBJZGVudGlmaWVyIG9mIHRoZSBjYXJkIHRoYXQgb3ducyB0aGUgcmVxdWVzdGVkIGNvbW1lbnQuXG4gICAqIEBwYXJhbSBjb21tZW50SWQgLSBJZGVudGlmaWVyIG9mIHRoZSBjb21tZW50IHRvIHJldHJpZXZlLlxuICAgKiBAcmV0dXJucyBQcm9taXNlIHJlc29sdmluZyB0byB0aGUgY29tbWVudC5cbiAgICogQHRocm93cyBBcGlFcnJvciB3aGVuIHRoZSBzZXJ2ZXIgcmVzcG9uZHMgd2l0aCBhbiBlcnJvci5cbiAgICogQHRocm93cyBOZXR3b3JrRXJyb3Igd2hlbiB0aGUgcmVxdWVzdCBmYWlscyB0byByZWFjaCB0aGUgc2VydmVyLlxuICAgKi9cbiAgYXN5bmMgZ2V0Q29tbWVudChjYXJkSWQ6IHN0cmluZywgY29tbWVudElkOiBzdHJpbmcpOiBQcm9taXNlPENvbW1lbnQ+IHtcbiAgICBjb25zdCB1cmwgPSB0aGlzLmJ1aWxkVXJsKGAvY2FyZHMvJHtjYXJkSWR9L2NvbW1lbnRzLyR7Y29tbWVudElkfWApO1xuICAgIHJldHVybiB0aGlzLnJlcXVlc3QoKCkgPT4gdGhpcy5nZXRIdHRwQ2xpZW50KCkuZ2V0PENvbW1lbnQ+KHVybCkpO1xuICB9XG5cbiAgLyoqXG4gICAqIENyZWF0ZXMgYSBuZXcgY29tbWVudCBvbiBhIGNhcmQuXG4gICAqXG4gICAqIEBwYXJhbSBjYXJkSWQgLSBJZGVudGlmaWVyIG9mIHRoZSBjYXJkIHRoYXQgd2lsbCByZWNlaXZlIHRoZSBuZXcgY29tbWVudC5cbiAgICogQHBhcmFtIGRhdGEgLSBDb21tZW50IGNyZWF0aW9uIHBheWxvYWQuXG4gICAqIEByZXR1cm5zIFByb21pc2UgcmVzb2x2aW5nIHRvIHRoZSBjcmVhdGVkIGNvbW1lbnQuXG4gICAqIEB0aHJvd3MgQXBpRXJyb3Igd2hlbiB0aGUgc2VydmVyIHJlamVjdHMgdGhlIHBheWxvYWQuXG4gICAqIEB0aHJvd3MgTmV0d29ya0Vycm9yIHdoZW4gdGhlIHJlcXVlc3QgZmFpbHMgdG8gcmVhY2ggdGhlIHNlcnZlci5cbiAgICogQGRlcHJlY2F0ZWQgVXNlIGRpcmVjdCBnaXQgb3BlcmF0aW9ucyBpbnN0ZWFkLiBUaGlzIGVuZHBvaW50IHdpbGwgYmUgcmVtb3ZlZC5cbiAgICovXG4gIGFzeW5jIGNyZWF0ZUNvbW1lbnQoY2FyZElkOiBzdHJpbmcsIGRhdGE6IENvbW1lbnRDcmVhdGVEYXRhKTogUHJvbWlzZTxDb21tZW50PiB7XG4gICAgY29uc3QgdXJsID0gdGhpcy5idWlsZFVybChgL2NhcmRzLyR7Y2FyZElkfS9jb21tZW50c2ApO1xuICAgIHJldHVybiB0aGlzLnJlcXVlc3QoKCkgPT4gdGhpcy5nZXRIdHRwQ2xpZW50KCkucG9zdDxDb21tZW50Pih1cmwsIGRhdGEpKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBVcGRhdGVzIGFuIGV4aXN0aW5nIGNvbW1lbnQuXG4gICAqXG4gICAqIEBwYXJhbSBjYXJkSWQgLSBJZGVudGlmaWVyIG9mIHRoZSBjYXJkIHRoYXQgb3ducyB0aGUgY29tbWVudC5cbiAgICogQHBhcmFtIGNvbW1lbnRJZCAtIElkZW50aWZpZXIgb2YgdGhlIGNvbW1lbnQgdG8gdXBkYXRlLlxuICAgKiBAcGFyYW0gZGF0YSAtIENvbW1lbnQgdXBkYXRlIHBheWxvYWQuXG4gICAqIEByZXR1cm5zIFByb21pc2UgcmVzb2x2aW5nIHRvIHRoZSB1cGRhdGVkIGNvbW1lbnQuXG4gICAqIEB0aHJvd3MgQXBpRXJyb3Igd2hlbiB0aGUgc2VydmVyIHJlamVjdHMgdGhlIHVwZGF0ZS5cbiAgICogQHRocm93cyBOZXR3b3JrRXJyb3Igd2hlbiB0aGUgcmVxdWVzdCBmYWlscyB0byByZWFjaCB0aGUgc2VydmVyLlxuICAgKiBAZGVwcmVjYXRlZCBVc2UgZGlyZWN0IGdpdCBvcGVyYXRpb25zIGluc3RlYWQuIFRoaXMgZW5kcG9pbnQgd2lsbCBiZSByZW1vdmVkLlxuICAgKi9cbiAgYXN5bmMgdXBkYXRlQ29tbWVudChjYXJkSWQ6IHN0cmluZywgY29tbWVudElkOiBzdHJpbmcsIGRhdGE6IENvbW1lbnRVcGRhdGVEYXRhKTogUHJvbWlzZTxDb21tZW50PiB7XG4gICAgY29uc3QgdXJsID0gdGhpcy5idWlsZFVybChgL2NhcmRzLyR7Y2FyZElkfS9jb21tZW50cy8ke2NvbW1lbnRJZH1gKTtcbiAgICByZXR1cm4gdGhpcy5yZXF1ZXN0KCgpID0+IHRoaXMuZ2V0SHR0cENsaWVudCgpLnBhdGNoPENvbW1lbnQ+KHVybCwgZGF0YSkpO1xuICB9XG5cbiAgLyoqXG4gICAqIERlbGV0ZXMgYSBjb21tZW50LlxuICAgKlxuICAgKiBAcGFyYW0gY2FyZElkIC0gSWRlbnRpZmllciBvZiB0aGUgY2FyZCB0aGF0IG93bnMgdGhlIGNvbW1lbnQuXG4gICAqIEBwYXJhbSBjb21tZW50SWQgLSBJZGVudGlmaWVyIG9mIHRoZSBjb21tZW50IHRvIHJlbW92ZS5cbiAgICogQHJldHVybnMgUHJvbWlzZSByZXNvbHZpbmcgd2hlbiBkZWxldGlvbiBpcyBjb21wbGV0ZS5cbiAgICogQHRocm93cyBBcGlFcnJvciB3aGVuIHRoZSBzZXJ2ZXIgcmVqZWN0cyB0aGUgZGVsZXRlLlxuICAgKiBAdGhyb3dzIE5ldHdvcmtFcnJvciB3aGVuIHRoZSByZXF1ZXN0IGZhaWxzIHRvIHJlYWNoIHRoZSBzZXJ2ZXIuXG4gICAqIEBkZXByZWNhdGVkIFVzZSBkaXJlY3QgZ2l0IG9wZXJhdGlvbnMgaW5zdGVhZC4gVGhpcyBlbmRwb2ludCB3aWxsIGJlIHJlbW92ZWQuXG4gICAqL1xuICBhc3luYyBkZWxldGVDb21tZW50KGNhcmRJZDogc3RyaW5nLCBjb21tZW50SWQ6IHN0cmluZyk6IFByb21pc2U8dm9pZD4ge1xuICAgIGNvbnN0IHVybCA9IHRoaXMuYnVpbGRVcmwoYC9jYXJkcy8ke2NhcmRJZH0vY29tbWVudHMvJHtjb21tZW50SWR9YCk7XG4gICAgcmV0dXJuIHRoaXMucmVxdWVzdCgoKSA9PiB0aGlzLmdldEh0dHBDbGllbnQoKS5kZWxldGUodXJsKSk7XG4gIH1cblxuICAvLyAtLS0gQXR0YWNobWVudCBPcGVyYXRpb25zIC0tLVxuXG4gIC8qKlxuICAgKiBVcGxvYWRzIGFuIGF0dGFjaG1lbnQgdG8gYSBjYXJkIHVzaW5nIGJpbmFyeSBQVVQuXG4gICAqXG4gICAqIFRoaXMgaXMgdGhlIHByZWZlcnJlZCBtZXRob2QgLSBzZW5kcyByYXcgYmluYXJ5IGRhdGEgZGlyZWN0bHkgd2l0aG91dFxuICAgKiBiYXNlNjQgZW5jb2RpbmcsIHJlc3VsdGluZyBpbiAzMyUgc21hbGxlciBwYXlsb2Fkcy5cbiAgICpcbiAgICogQHBhcmFtIGNhcmRJZCAtIElkZW50aWZpZXIgb2YgdGhlIGNhcmQgdGhhdCB3aWxsIHJlY2VpdmUgdGhlIGF0dGFjaG1lbnQuXG4gICAqIEBwYXJhbSBuYW1lIC0gRmlsZSBuYW1lIGluY2x1ZGluZyBleHRlbnNpb24uXG4gICAqIEBwYXJhbSBkYXRhIC0gQmluYXJ5IGRhdGEgYXMgQmxvYiwgQXJyYXlCdWZmZXIsIG9yIGJhc2U2NCBzdHJpbmcuXG4gICAqIEByZXR1cm5zIFByb21pc2UgcmVzb2x2aW5nIHRvIGF0dGFjaG1lbnQgbWV0YWRhdGEuXG4gICAqIEB0aHJvd3MgQXBpRXJyb3Igd2hlbiB0aGUgc2VydmVyIHJlamVjdHMgdGhlIHVwbG9hZC5cbiAgICogQHRocm93cyBOZXR3b3JrRXJyb3Igd2hlbiB0aGUgcmVxdWVzdCBmYWlscyB0byByZWFjaCB0aGUgc2VydmVyLlxuICAgKi9cbiAgYXN5bmMgdXBsb2FkQXR0YWNobWVudChjYXJkSWQ6IHN0cmluZywgbmFtZTogc3RyaW5nLCBkYXRhOiBCbG9iIHwgQXJyYXlCdWZmZXIgfCBzdHJpbmcpOiBQcm9taXNlPEF0dGFjaG1lbnRSZXNwb25zZT4ge1xuICAgIGNvbnN0IHVybCA9IHRoaXMuYnVpbGRVcmwoYC9jYXJkcy8ke2NhcmRJZH0vYXR0YWNobWVudHMvJHtlbmNvZGVVUklDb21wb25lbnQobmFtZSl9YCk7XG5cbiAgICAvLyBDb252ZXJ0IGRhdGEgdG8gQmxvYiBmb3IgZmV0Y2ggYm9keVxuICAgIGxldCBib2R5OiBCbG9iO1xuICAgIGlmIChkYXRhIGluc3RhbmNlb2YgQmxvYikge1xuICAgICAgYm9keSA9IGRhdGE7XG4gICAgfSBlbHNlIGlmIChkYXRhIGluc3RhbmNlb2YgQXJyYXlCdWZmZXIpIHtcbiAgICAgIGJvZHkgPSBuZXcgQmxvYihbZGF0YV0pO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBiYXNlNjQgc3RyaW5nIC0gZGVjb2RlIHRvIGJpbmFyeVxuICAgICAgY29uc3QgYmluYXJ5U3RyaW5nID0gYXRvYihkYXRhKTtcbiAgICAgIGNvbnN0IGJ5dGVzID0gbmV3IFVpbnQ4QXJyYXkoYmluYXJ5U3RyaW5nLmxlbmd0aCk7XG4gICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGJpbmFyeVN0cmluZy5sZW5ndGg7IGkrKykge1xuICAgICAgICBieXRlc1tpXSA9IGJpbmFyeVN0cmluZy5jaGFyQ29kZUF0KGkpO1xuICAgICAgfVxuICAgICAgYm9keSA9IG5ldyBCbG9iKFtieXRlc10pO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzLnJlcXVlc3QoYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBmZXRjaCh1cmwsIHtcbiAgICAgICAgbWV0aG9kOiAnUFVUJyxcbiAgICAgICAgaGVhZGVyczoge1xuICAgICAgICAgIC4uLnRoaXMuZ2V0SGVhZGVycygpLFxuICAgICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vb2N0ZXQtc3RyZWFtJ1xuICAgICAgICB9LFxuICAgICAgICBib2R5LFxuICAgICAgICBzaWduYWw6IHRoaXMuZ2V0VGltZW91dFNpZ25hbCgpXG4gICAgICB9KTtcbiAgICAgIGlmICghcmVzcG9uc2Uub2spIHRocm93IHJlc3BvbnNlO1xuICAgICAgcmV0dXJuIHJlc3BvbnNlLmpzb24oKSBhcyBQcm9taXNlPEF0dGFjaG1lbnRSZXNwb25zZT47XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogRG93bmxvYWRzIGFuIGF0dGFjaG1lbnQgYXMgYSBCbG9iLlxuICAgKlxuICAgKiBUaGlzIG1ldGhvZCB1c2VzIGBmZXRjaGAgZGlyZWN0bHkgc28gYmluYXJ5IGRhdGEgaXMgcHJlc2VydmVkLlxuICAgKlxuICAgKiBAcGFyYW0gY2FyZElkIC0gSWRlbnRpZmllciBvZiB0aGUgY2FyZCB0aGF0IG93bnMgdGhlIGF0dGFjaG1lbnQuXG4gICAqIEBwYXJhbSBhdHRhY2htZW50SWQgLSBJZGVudGlmaWVyIG9mIHRoZSBhdHRhY2htZW50IGJsb2IgdG8gZG93bmxvYWQuXG4gICAqIEByZXR1cm5zIFByb21pc2UgcmVzb2x2aW5nIHRvIGFuIGF0dGFjaG1lbnQgQmxvYi5cbiAgICogQHRocm93cyBBcGlFcnJvciB3aGVuIHRoZSBzZXJ2ZXIgcmVzcG9uZHMgd2l0aCBhbiBlcnJvci5cbiAgICogQHRocm93cyBOZXR3b3JrRXJyb3Igd2hlbiB0aGUgcmVxdWVzdCBmYWlscyB0byByZWFjaCB0aGUgc2VydmVyLlxuICAgKi9cbiAgYXN5bmMgZ2V0QXR0YWNobWVudChjYXJkSWQ6IHN0cmluZywgYXR0YWNobWVudElkOiBzdHJpbmcpOiBQcm9taXNlPEJsb2I+IHtcbiAgICBjb25zdCB1cmwgPSB0aGlzLmJ1aWxkVXJsKGAvY2FyZHMvJHtjYXJkSWR9L2F0dGFjaG1lbnRzLyR7YXR0YWNobWVudElkfWApO1xuICAgIHJldHVybiB0aGlzLnJlcXVlc3QoYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBmZXRjaCh1cmwsIHtcbiAgICAgICAgaGVhZGVyczogdGhpcy5nZXRIZWFkZXJzKCksXG4gICAgICAgIHNpZ25hbDogdGhpcy5nZXRUaW1lb3V0U2lnbmFsKClcbiAgICAgIH0pO1xuICAgICAgaWYgKCFyZXNwb25zZS5vaykgdGhyb3cgcmVzcG9uc2U7XG4gICAgICByZXR1cm4gcmVzcG9uc2UuYmxvYigpO1xuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIExpc3RzIGF0dGFjaG1lbnRzIGZvciBhIGNhcmQuXG4gICAqXG4gICAqIEBwYXJhbSBjYXJkSWQgLSBJZGVudGlmaWVyIG9mIHRoZSBjYXJkIHdob3NlIGF0dGFjaG1lbnRzIHNob3VsZCBiZSBsaXN0ZWQuXG4gICAqIEByZXR1cm5zIFByb21pc2UgcmVzb2x2aW5nIHRvIGF0dGFjaG1lbnQgbWV0YWRhdGEuXG4gICAqIEB0aHJvd3MgQXBpRXJyb3Igd2hlbiB0aGUgc2VydmVyIHJlc3BvbmRzIHdpdGggYW4gZXJyb3IuXG4gICAqIEB0aHJvd3MgTmV0d29ya0Vycm9yIHdoZW4gdGhlIHJlcXVlc3QgZmFpbHMgdG8gcmVhY2ggdGhlIHNlcnZlci5cbiAgICovXG4gIGFzeW5jIGxpc3RBdHRhY2htZW50cyhjYXJkSWQ6IHN0cmluZyk6IFByb21pc2U8QXR0YWNobWVudFJlc3BvbnNlW10+IHtcbiAgICBjb25zdCB1cmwgPSB0aGlzLmJ1aWxkVXJsKGAvY2FyZHMvJHtjYXJkSWR9L2F0dGFjaG1lbnRzYCk7XG4gICAgcmV0dXJuIHRoaXMucmVxdWVzdCgoKSA9PiB0aGlzLmdldEh0dHBDbGllbnQoKS5nZXQ8QXR0YWNobWVudFJlc3BvbnNlW10+KHVybCkpO1xuICB9XG5cbiAgLy8gLS0tIFRpbWVsaW5lIE9wZXJhdGlvbnMgLS0tXG5cbiAgLyoqXG4gICAqIEdldHMgdGltZWxpbmUgZW50cmllcyBmb3IgYSBjYXJkIHdpdGggb3B0aW9uYWwgcGFnaW5hdGlvbi5cbiAgICpcbiAgICogQHBhcmFtIGNhcmRJZCAtIElkZW50aWZpZXIgb2YgdGhlIGNhcmQgd2hvc2UgdGltZWxpbmUgZW50cmllcyBzaG91bGQgYmUgcmV0dXJuZWQuXG4gICAqIEBwYXJhbSBvcHRpb25zIC0gT3B0aW9uYWwgcGFnaW5hdGlvbiBjb250cm9scy5cbiAgICogQHJldHVybnMgUHJvbWlzZSByZXNvbHZpbmcgdG8gdGltZWxpbmUgZW50cmllcy5cbiAgICogQHRocm93cyBBcGlFcnJvciB3aGVuIHRoZSBzZXJ2ZXIgcmVzcG9uZHMgd2l0aCBhbiBlcnJvci5cbiAgICogQHRocm93cyBOZXR3b3JrRXJyb3Igd2hlbiB0aGUgcmVxdWVzdCBmYWlscyB0byByZWFjaCB0aGUgc2VydmVyLlxuICAgKi9cbiAgYXN5bmMgZ2V0VGltZWxpbmUoY2FyZElkOiBzdHJpbmcsIG9wdGlvbnM/OiBUaW1lbGluZU9wdGlvbnMpOiBQcm9taXNlPFRpbWVsaW5lSXRlbVtdPiB7XG4gICAgY29uc3QgdXJsID0gdGhpcy5idWlsZFVybChgL2NhcmRzLyR7Y2FyZElkfS90aW1lbGluZWAsIHtcbiAgICAgIGJlZm9yZTogb3B0aW9ucz8uYmVmb3JlLFxuICAgICAgbGltaXQ6IG9wdGlvbnM/LmxpbWl0XG4gICAgfSk7XG4gICAgcmV0dXJuIHRoaXMucmVxdWVzdCgoKSA9PiB0aGlzLmdldEh0dHBDbGllbnQoKS5nZXQ8VGltZWxpbmVJdGVtW10+KHVybCkpO1xuICB9XG5cbiAgLy8gLS0tIFBsYW4gT3BlcmF0aW9ucyAtLS1cblxuICAvKipcbiAgICogR2V0cyB0aGUgcGxhbiBkb2N1bWVudCBmb3IgYSBjYXJkIGFzIG1hcmtkb3duLlxuICAgKlxuICAgKiBAcGFyYW0gY2FyZElkIC0gSWRlbnRpZmllciBvZiB0aGUgY2FyZCB3aG9zZSBwbGFuIG1hcmtkb3duIHNob3VsZCBiZSByZXR1cm5lZC5cbiAgICogQHJldHVybnMgUHJvbWlzZSByZXNvbHZpbmcgdG8gcGxhbiBtYXJrZG93bi5cbiAgICogQHRocm93cyBBcGlFcnJvciB3aGVuIHRoZSBzZXJ2ZXIgcmVzcG9uZHMgd2l0aCBhbiBlcnJvci5cbiAgICogQHRocm93cyBOZXR3b3JrRXJyb3Igd2hlbiB0aGUgcmVxdWVzdCBmYWlscyB0byByZWFjaCB0aGUgc2VydmVyLlxuICAgKi9cbiAgYXN5bmMgZ2V0UGxhbihjYXJkSWQ6IHN0cmluZyk6IFByb21pc2U8c3RyaW5nPiB7XG4gICAgY29uc3QgdXJsID0gdGhpcy5idWlsZFVybChgL2NhcmRzLyR7Y2FyZElkfS9wbGFuYCk7XG4gICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCB0aGlzLnJlcXVlc3QoKCkgPT4gdGhpcy5nZXRIdHRwQ2xpZW50KCkuZ2V0PHsgY29udGVudDogc3RyaW5nIH0+KHVybCkpO1xuICAgIHJldHVybiByZXNwb25zZS5jb250ZW50O1xuICB9XG5cbiAgLyoqXG4gICAqIFVwZGF0ZXMgdGhlIHBsYW4gZG9jdW1lbnQgZm9yIGEgY2FyZC5cbiAgICpcbiAgICogQHBhcmFtIGNhcmRJZCAtIElkZW50aWZpZXIgb2YgdGhlIGNhcmQgd2hvc2UgcGxhbiBtYXJrZG93biBzaG91bGQgYmUgdXBkYXRlZC5cbiAgICogQHBhcmFtIGNvbnRlbnQgLSBQbGFuIG1hcmtkb3duIGNvbnRlbnQuXG4gICAqIEByZXR1cm5zIFByb21pc2UgcmVzb2x2aW5nIHdoZW4gdGhlIHBsYW4gaXMgc2F2ZWQuXG4gICAqIEB0aHJvd3MgQXBpRXJyb3Igd2hlbiB0aGUgc2VydmVyIHJlamVjdHMgdGhlIHVwZGF0ZS5cbiAgICogQHRocm93cyBOZXR3b3JrRXJyb3Igd2hlbiB0aGUgcmVxdWVzdCBmYWlscyB0byByZWFjaCB0aGUgc2VydmVyLlxuICAgKiBAZGVwcmVjYXRlZCBVc2UgZGlyZWN0IGdpdCBvcGVyYXRpb25zIGluc3RlYWQuIFRoaXMgZW5kcG9pbnQgd2lsbCBiZSByZW1vdmVkLlxuICAgKi9cbiAgYXN5bmMgdXBkYXRlUGxhbihjYXJkSWQ6IHN0cmluZywgY29udGVudDogc3RyaW5nKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc3QgdXJsID0gdGhpcy5idWlsZFVybChgL2NhcmRzLyR7Y2FyZElkfS9wbGFuYCk7XG4gICAgcmV0dXJuIHRoaXMucmVxdWVzdCgoKSA9PiB0aGlzLmdldEh0dHBDbGllbnQoKS5wdXQ8dm9pZD4odXJsLCBjb250ZW50KSk7XG4gIH1cblxuICAvLyAtLS0gR2F0ZSBPcGVyYXRpb25zIC0tLVxuXG4gIC8qKlxuICAgKiBBcHByb3ZlcyBhIGdhdGUgZm9yIGEgY2FyZC5cbiAgICpcbiAgICogQHBhcmFtIGNhcmRJZCAtIElkZW50aWZpZXIgb2YgdGhlIGNhcmQgd2hvc2UgZ2F0ZSBzdGF0ZSBzaG91bGQgYmUgdXBkYXRlZC5cbiAgICogQHBhcmFtIGdhdGVOYW1lIC0gR2F0ZSBuYW1lIHRvIGFwcHJvdmUuXG4gICAqIEByZXR1cm5zIFByb21pc2UgcmVzb2x2aW5nIHRvIGdhdGUgYXBwcm92YWwgbWV0YWRhdGEuXG4gICAqIEB0aHJvd3MgQXBpRXJyb3Igd2hlbiB0aGUgc2VydmVyIHJlamVjdHMgdGhlIGFwcHJvdmFsLlxuICAgKiBAdGhyb3dzIE5ldHdvcmtFcnJvciB3aGVuIHRoZSByZXF1ZXN0IGZhaWxzIHRvIHJlYWNoIHRoZSBzZXJ2ZXIuXG4gICAqIEBkZXByZWNhdGVkIFVzZSBkaXJlY3QgZ2l0IG9wZXJhdGlvbnMgaW5zdGVhZC4gVGhpcyBlbmRwb2ludCB3aWxsIGJlIHJlbW92ZWQuXG4gICAqL1xuICBhc3luYyBhcHByb3ZlR2F0ZShjYXJkSWQ6IHN0cmluZywgZ2F0ZU5hbWU6ICdwbGFuJyB8ICdtZXJnZVJlcXVlc3QnKTogUHJvbWlzZTxHYXRlQXBwcm92YWxSZXNwb25zZT4ge1xuICAgIGNvbnN0IHVybCA9IHRoaXMuYnVpbGRVcmwoYC9jYXJkcy8ke2NhcmRJZH0vZ2F0ZXMvJHtnYXRlTmFtZX0vYXBwcm92ZWApO1xuICAgIHJldHVybiB0aGlzLnJlcXVlc3QoKCkgPT4gdGhpcy5nZXRIdHRwQ2xpZW50KCkucG9zdDxHYXRlQXBwcm92YWxSZXNwb25zZT4odXJsLCB1bmRlZmluZWQpKTtcbiAgfVxuXG4gIC8vIC0tLSBDb21taXQgT3BlcmF0aW9ucyAtLS1cblxuICAvKipcbiAgICogR2V0cyBhbGwgY29tbWl0cyBhc3NvY2lhdGVkIHdpdGggYSBjYXJkLlxuICAgKlxuICAgKiBAcGFyYW0gY2FyZElkIC0gSWRlbnRpZmllciBvZiB0aGUgY2FyZCB3aG9zZSBjb21taXRzIHNob3VsZCBiZSByZXR1cm5lZC5cbiAgICogQHJldHVybnMgUHJvbWlzZSByZXNvbHZpbmcgdG8gY29tbWl0IG1ldGFkYXRhLlxuICAgKiBAdGhyb3dzIEFwaUVycm9yIHdoZW4gdGhlIHNlcnZlciByZXNwb25kcyB3aXRoIGFuIGVycm9yLlxuICAgKiBAdGhyb3dzIE5ldHdvcmtFcnJvciB3aGVuIHRoZSByZXF1ZXN0IGZhaWxzIHRvIHJlYWNoIHRoZSBzZXJ2ZXIuXG4gICAqL1xuICBhc3luYyBnZXRDb21taXRzKGNhcmRJZDogc3RyaW5nKTogUHJvbWlzZTxDb21taXRJbmZvW10+IHtcbiAgICBjb25zdCB1cmwgPSB0aGlzLmJ1aWxkVXJsKGAvY2FyZHMvJHtjYXJkSWR9L2NvbW1pdHNgKTtcbiAgICByZXR1cm4gdGhpcy5yZXF1ZXN0KCgpID0+IHRoaXMuZ2V0SHR0cENsaWVudCgpLmdldDxDb21taXRJbmZvW10+KHVybCkpO1xuICB9XG5cbiAgLyoqXG4gICAqIEFkZHMgYSBjb21taXQgdG8gYSBjYXJkLlxuICAgKlxuICAgKiBAcGFyYW0gY2FyZElkIC0gSWRlbnRpZmllciBvZiB0aGUgY2FyZCB0byBhc3NvY2lhdGUgd2l0aCB0aGUgY29tbWl0IFNIQS5cbiAgICogQHBhcmFtIHNoYSAtIEdpdCBjb21taXQgc2hhLlxuICAgKiBAcmV0dXJucyBQcm9taXNlIHJlc29sdmluZyB0byBjb21taXQgbWV0YWRhdGEuXG4gICAqIEB0aHJvd3MgQXBpRXJyb3Igd2hlbiB0aGUgc2VydmVyIHJlamVjdHMgdGhlIHVwZGF0ZS5cbiAgICogQHRocm93cyBOZXR3b3JrRXJyb3Igd2hlbiB0aGUgcmVxdWVzdCBmYWlscyB0byByZWFjaCB0aGUgc2VydmVyLlxuICAgKi9cbiAgYXN5bmMgYWRkQ29tbWl0KGNhcmRJZDogc3RyaW5nLCBzaGE6IHN0cmluZyk6IFByb21pc2U8Q29tbWl0SW5mbz4ge1xuICAgIGNvbnN0IHVybCA9IHRoaXMuYnVpbGRVcmwoYC9jYXJkcy8ke2NhcmRJZH0vY29tbWl0c2ApO1xuICAgIHJldHVybiB0aGlzLnJlcXVlc3QoKCkgPT4gdGhpcy5nZXRIdHRwQ2xpZW50KCkucG9zdDxDb21taXRJbmZvPih1cmwsIHsgc2hhIH0pKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZW1vdmVzIGEgY29tbWl0IGZyb20gYSBjYXJkLlxuICAgKlxuICAgKiBAcGFyYW0gY2FyZElkIC0gSWRlbnRpZmllciBvZiB0aGUgY2FyZCB0byBkZXRhY2ggZnJvbSB0aGUgY29tbWl0IFNIQS5cbiAgICogQHBhcmFtIHNoYSAtIEdpdCBjb21taXQgc2hhLlxuICAgKiBAcGFyYW0gb3B0aW9ucyAtIE9wdGlvbmFsIHBhcmFtZXRlcnMuXG4gICAqIEBwYXJhbSBvcHRpb25zLnNlc3Npb25JZCAtIENsYXVkZSBDb2RlIHNlc3Npb24gSUQgZm9yd2FyZGVkIGFzIGBYLUNhcmRzLVNlc3Npb24tSWRgIGhlYWRlciBzbyB0aGUgY2FyZCByZXBvIHBvc3QtY29tbWl0IGhvb2sgY2FuIGF0dHJpYnV0ZSB0aGUgY29tbWl0LlxuICAgKiBAcmV0dXJucyBQcm9taXNlIHJlc29sdmluZyB3aGVuIHJlbW92YWwgaXMgY29tcGxldGUuXG4gICAqIEB0aHJvd3MgQXBpRXJyb3Igd2hlbiB0aGUgc2VydmVyIHJlamVjdHMgdGhlIHVwZGF0ZS5cbiAgICogQHRocm93cyBOZXR3b3JrRXJyb3Igd2hlbiB0aGUgcmVxdWVzdCBmYWlscyB0byByZWFjaCB0aGUgc2VydmVyLlxuICAgKi9cbiAgYXN5bmMgcmVtb3ZlQ29tbWl0KGNhcmRJZDogc3RyaW5nLCBzaGE6IHN0cmluZywgb3B0aW9ucz86IHsgc2Vzc2lvbklkPzogc3RyaW5nIH0pOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zdCB1cmwgPSB0aGlzLmJ1aWxkVXJsKGAvY2FyZHMvJHtjYXJkSWR9L2NvbW1pdHMvJHtzaGF9YCk7XG4gICAgY29uc3QgaGVhZGVyczogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHt9O1xuICAgIGlmIChvcHRpb25zPy5zZXNzaW9uSWQpIHtcbiAgICAgIGhlYWRlcnNbJ1gtQ2FyZHMtU2Vzc2lvbi1JZCddID0gb3B0aW9ucy5zZXNzaW9uSWQ7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLnJlcXVlc3QoKCkgPT4gdGhpcy5nZXRIdHRwQ2xpZW50KCkuZGVsZXRlKHVybCwgeyBoZWFkZXJzIH0pKTtcbiAgfVxuXG4gIC8vIC0tLSBCcmFuY2ggT3BlcmF0aW9ucyAtLS1cblxuICAvKipcbiAgICogR2V0cyBhbGwgYnJhbmNoZXMgdHJhY2tlZCBvbiBhIGNhcmQuXG4gICAqXG4gICAqIEBwYXJhbSBjYXJkSWQgLSBVbmlxdWUgaWRlbnRpZmllciBvZiB0aGUgY2FyZCB3aG9zZSBicmFuY2hlcyB0byByZXRyaWV2ZS5cbiAgICogQHBhcmFtIG9wdGlvbnMgLSBPcHRpb25hbCBxdWVyeSBwYXJhbWV0ZXJzLlxuICAgKiBAcGFyYW0gb3B0aW9ucy53b3Jrc3BhY2VQYXRoIC0gV29ya3NwYWNlIHBhdGggZm9yIGNvbXB1dGluZyBpc01lcmdlZCBhbmQgY29tbWl0IGNvbnRhaW5tZW50LlxuICAgKiBAcmV0dXJucyBQcm9taXNlIHJlc29sdmluZyB0byBicmFuY2hlcyByZXNwb25zZS5cbiAgICovXG4gIGFzeW5jIGdldEJyYW5jaGVzKGNhcmRJZDogc3RyaW5nLCBvcHRpb25zPzogeyB3b3Jrc3BhY2VQYXRoPzogc3RyaW5nIH0pOiBQcm9taXNlPEJyYW5jaGVzUmVzcG9uc2U+IHtcbiAgICBjb25zdCB1cmwgPSB0aGlzLmJ1aWxkVXJsKGAvY2FyZHMvJHtjYXJkSWR9L2JyYW5jaGVzYCwge1xuICAgICAgd29ya3NwYWNlUGF0aDogb3B0aW9ucz8ud29ya3NwYWNlUGF0aFxuICAgIH0pO1xuICAgIHJldHVybiB0aGlzLnJlcXVlc3QoKCkgPT4gdGhpcy5nZXRIdHRwQ2xpZW50KCkuZ2V0PEJyYW5jaGVzUmVzcG9uc2U+KHVybCkpO1xuICB9XG5cbiAgLyoqXG4gICAqIEFkZHMgYSBicmFuY2ggdG8gYSBjYXJkLlxuICAgKlxuICAgKiBAcGFyYW0gY2FyZElkIC0gVW5pcXVlIGlkZW50aWZpZXIgb2YgdGhlIGNhcmQgdG8gYWRkIHRoZSBicmFuY2ggdG8uXG4gICAqIEBwYXJhbSBkYXRhIC0gQnJhbmNoIGRhdGEgaW5jbHVkaW5nIG5hbWUgYW5kIG9wdGlvbmFsIHdvcmt0cmVlIHBhdGguXG4gICAqIEBwYXJhbSBvcHRpb25zIC0gT3B0aW9uYWwgcGFyYW1ldGVycy5cbiAgICogQHBhcmFtIG9wdGlvbnMuc2Vzc2lvbklkIC0gQ2xhdWRlIENvZGUgc2Vzc2lvbiBJRCBmb3J3YXJkZWQgYXMgYFgtQ2FyZHMtU2Vzc2lvbi1JZGAgaGVhZGVyIHNvIHRoZSBjYXJkIHJlcG8gcG9zdC1jb21taXQgaG9vayBjYW4gYXR0cmlidXRlIHRoZSBjb21taXQuXG4gICAqIEByZXR1cm5zIFByb21pc2UgcmVzb2x2aW5nIHdoZW4gdGhlIGJyYW5jaCBpcyBhZGRlZC5cbiAgICovXG4gIGFzeW5jIGFkZEJyYW5jaChjYXJkSWQ6IHN0cmluZywgZGF0YTogQWRkQnJhbmNoUmVxdWVzdCwgb3B0aW9ucz86IHsgc2Vzc2lvbklkPzogc3RyaW5nIH0pOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zdCB1cmwgPSB0aGlzLmJ1aWxkVXJsKGAvY2FyZHMvJHtjYXJkSWR9L2JyYW5jaGVzYCk7XG4gICAgY29uc3QgaGVhZGVyczogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHt9O1xuICAgIGlmIChvcHRpb25zPy5zZXNzaW9uSWQpIHtcbiAgICAgIGhlYWRlcnNbJ1gtQ2FyZHMtU2Vzc2lvbi1JZCddID0gb3B0aW9ucy5zZXNzaW9uSWQ7XG4gICAgfVxuICAgIGF3YWl0IHRoaXMucmVxdWVzdCgoKSA9PiB0aGlzLmdldEh0dHBDbGllbnQoKS5wb3N0PHVua25vd24+KHVybCwgZGF0YSwgeyBoZWFkZXJzIH0pKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZW1vdmVzIGEgYnJhbmNoIGZyb20gYSBjYXJkLlxuICAgKlxuICAgKiBAcGFyYW0gY2FyZElkIC0gVW5pcXVlIGlkZW50aWZpZXIgb2YgdGhlIGNhcmQgdG8gcmVtb3ZlIHRoZSBicmFuY2ggZnJvbS5cbiAgICogQHBhcmFtIG5hbWUgLSBCcmFuY2ggbmFtZSB0byByZW1vdmUgKHdpbGwgYmUgVVJMLWVuY29kZWQpLlxuICAgKiBAcGFyYW0gb3B0aW9ucyAtIE9wdGlvbmFsIHBhcmFtZXRlcnMuXG4gICAqIEBwYXJhbSBvcHRpb25zLnNlc3Npb25JZCAtIENsYXVkZSBDb2RlIHNlc3Npb24gSUQgZm9yd2FyZGVkIGFzIGBYLUNhcmRzLVNlc3Npb24tSWRgIGhlYWRlciBzbyB0aGUgY2FyZCByZXBvIHBvc3QtY29tbWl0IGhvb2sgY2FuIGF0dHJpYnV0ZSB0aGUgY29tbWl0LlxuICAgKiBAcmV0dXJucyBQcm9taXNlIHJlc29sdmluZyB3aGVuIHRoZSBicmFuY2ggaXMgcmVtb3ZlZC5cbiAgICovXG4gIGFzeW5jIHJlbW92ZUJyYW5jaChjYXJkSWQ6IHN0cmluZywgbmFtZTogc3RyaW5nLCBvcHRpb25zPzogeyBzZXNzaW9uSWQ/OiBzdHJpbmcgfSk6IFByb21pc2U8dm9pZD4ge1xuICAgIGNvbnN0IHVybCA9IHRoaXMuYnVpbGRVcmwoYC9jYXJkcy8ke2NhcmRJZH0vYnJhbmNoZXMvJHtlbmNvZGVVUklDb21wb25lbnQobmFtZSl9YCk7XG4gICAgY29uc3QgaGVhZGVyczogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHt9O1xuICAgIGlmIChvcHRpb25zPy5zZXNzaW9uSWQpIHtcbiAgICAgIGhlYWRlcnNbJ1gtQ2FyZHMtU2Vzc2lvbi1JZCddID0gb3B0aW9ucy5zZXNzaW9uSWQ7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLnJlcXVlc3QoKCkgPT4gdGhpcy5nZXRIdHRwQ2xpZW50KCkuZGVsZXRlKHVybCwgeyBoZWFkZXJzIH0pKTtcbiAgfVxuXG4gIC8vIC0tLSBUYWcgT3BlcmF0aW9ucyAtLS1cblxuICAvKipcbiAgICogR2V0cyBhbGwgYXZhaWxhYmxlIHRhZ3MuXG4gICAqXG4gICAqIEByZXR1cm5zIFByb21pc2UgcmVzb2x2aW5nIHRvIHRhZyBzdHJpbmdzLlxuICAgKiBAdGhyb3dzIEFwaUVycm9yIHdoZW4gdGhlIHNlcnZlciByZXNwb25kcyB3aXRoIGFuIGVycm9yLlxuICAgKiBAdGhyb3dzIE5ldHdvcmtFcnJvciB3aGVuIHRoZSByZXF1ZXN0IGZhaWxzIHRvIHJlYWNoIHRoZSBzZXJ2ZXIuXG4gICAqL1xuICBhc3luYyBnZXRUYWdzKCk6IFByb21pc2U8c3RyaW5nW10+IHtcbiAgICBjb25zdCB1cmwgPSB0aGlzLmJ1aWxkVXJsKCcvdGFncycsIHtcbiAgICAgIHdvcmtzcGFjZVBhdGg6IHRoaXMub3B0aW9ucy53b3Jrc3BhY2VQYXRoXG4gICAgfSk7XG4gICAgcmV0dXJuIHRoaXMucmVxdWVzdCgoKSA9PiB0aGlzLmdldEh0dHBDbGllbnQoKS5nZXQ8c3RyaW5nW10+KHVybCkpO1xuICB9XG5cbiAgLy8gLS0tIEVudmlyb25tZW50IE9wZXJhdGlvbnMgLS0tXG5cbiAgLyoqXG4gICAqIEZldGNoZXMgYXZhaWxhYmxlIGFnZW50IGVudmlyb25tZW50cy5cbiAgICpcbiAgICogQHJldHVybnMgUHJvbWlzZSByZXNvbHZpbmcgdG8gZW52aXJvbm1lbnQgbWV0YWRhdGEuXG4gICAqIEB0aHJvd3MgQXBpRXJyb3Igd2hlbiB0aGUgc2VydmVyIHJlc3BvbmRzIHdpdGggYW4gZXJyb3IuXG4gICAqIEB0aHJvd3MgTmV0d29ya0Vycm9yIHdoZW4gdGhlIHJlcXVlc3QgZmFpbHMgdG8gcmVhY2ggdGhlIHNlcnZlci5cbiAgICovXG4gIGFzeW5jIGdldEVudmlyb25tZW50cygpOiBQcm9taXNlPEFycmF5PHsgbmFtZTogc3RyaW5nOyBkZXNjcmlwdGlvbj86IHN0cmluZyB9Pj4ge1xuICAgIGNvbnN0IHVybCA9IHRoaXMuYnVpbGRVcmwoJy9lbnZpcm9ubWVudHMnKTtcbiAgICByZXR1cm4gdGhpcy5yZXF1ZXN0KCgpID0+IHRoaXMuZ2V0SHR0cENsaWVudCgpLmdldDxBcnJheTx7IG5hbWU6IHN0cmluZzsgZGVzY3JpcHRpb24/OiBzdHJpbmcgfT4+KHVybCkpO1xuICB9XG5cbiAgLy8gLS0tIFR5cGVkIEZpbGUgT3BlcmF0aW9ucyAtLS1cblxuICAvKipcbiAgICogU3VibWl0cyBhbiBhZGFwdGl2ZSBjYXJkIGFjdGlvbiBieSB3cml0aW5nIGFuIGBhZGFwdGl2ZS1jYXJkLXN1Ym1pc3Npb25gIHR5cGVkIGZpbGUuXG4gICAqXG4gICAqIEBwYXJhbSBjYXJkSWQgLSBUaGUgY2FyZCBjb250YWluaW5nIHRoZSBhZGFwdGl2ZSBjYXJkLlxuICAgKiBAcGFyYW0gYWN0aW9uSWQgLSBUaGUgYWN0aW9uIElEIGZyb20gdGhlIGFkYXB0aXZlIGNhcmQgc3VibWl0IGFjdGlvbi5cbiAgICogQHBhcmFtIGRhdGEgLSBUaGUgZm9ybSBkYXRhIGNvbGxlY3RlZCBieSB0aGUgYWRhcHRpdmUgY2FyZC5cbiAgICogQHJldHVybnMgUHJvbWlzZSByZXNvbHZpbmcgd2hlbiB0aGUgc3VibWlzc2lvbiBpcyBwZXJzaXN0ZWQuXG4gICAqIEB0aHJvd3MgQXBpRXJyb3Igd2hlbiB0aGUgc2VydmVyIHJlamVjdHMgdGhlIHN1Ym1pc3Npb24gKGUuZy4gdmFsaWRhdGlvbiBmYWlsdXJlKS5cbiAgICogQHRocm93cyBOZXR3b3JrRXJyb3Igd2hlbiB0aGUgcmVxdWVzdCBmYWlscyB0byByZWFjaCB0aGUgc2VydmVyLlxuICAgKi9cbiAgYXN5bmMgc3VibWl0Q2FyZEFjdGlvbihjYXJkSWQ6IHN0cmluZywgYWN0aW9uSWQ6IHN0cmluZywgZGF0YTogUmVjb3JkPHN0cmluZywgdW5rbm93bj4pOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zdCBmaWxlTmFtZSA9IGAke2FjdGlvbklkfS0ke0RhdGUubm93KCl9Lmpzb25gO1xuICAgIGNvbnN0IHVybCA9IHRoaXMuYnVpbGRVcmwoYC9jYXJkcy8ke2NhcmRJZH0vYWRhcHRpdmUtY2FyZC1zdWJtaXNzaW9uLyR7ZW5jb2RlVVJJQ29tcG9uZW50KGZpbGVOYW1lKX1gKTtcbiAgICBjb25zdCBib2R5ID0geyBjYXJkSWQsIGFjdGlvbklkLCBkYXRhIH07XG4gICAgYXdhaXQgdGhpcy5yZXF1ZXN0KCgpID0+IHRoaXMuZ2V0SHR0cENsaWVudCgpLnB1dDx1bmtub3duPih1cmwsIGJvZHkpKTtcbiAgfVxuXG4gIC8vIC0tLSBUeXBlIFNjaGVtYSBPcGVyYXRpb25zIC0tLVxuXG4gIC8qKlxuICAgKiBHZXRzIHR5cGUgc2NoZW1hcyBhbmQgZGVzY3JpcHRpb25zIGZvciBhIGNhcmQncyBlbnZpcm9ubWVudC5cbiAgICpcbiAgICogUmV0dXJucyBtZXRhZGF0YSBhYm91dCBlYWNoIHJlZ2lzdGVyZWQgdHlwZSBpbiB0aGUgY2FyZCdzIGVudmlyb25tZW50LFxuICAgKiBpbmNsdWRpbmcgdmVyc2lvbiwgc2NoZW1hLCBhbmQgZGVzY3JpcHRpb24uIENvbW1hbmQgZGV0YWlscyBhcmUgZXhjbHVkZWQuXG4gICAqXG4gICAqIEBwYXJhbSBjYXJkSWQgLSBJZGVudGlmaWVyIG9mIHRoZSBjYXJkIHdob3NlIHR5cGUgc2NoZW1hIG1ldGFkYXRhIHNob3VsZCBiZSBmZXRjaGVkLlxuICAgKiBAcmV0dXJucyBQcm9taXNlIHJlc29sdmluZyB0byB0eXBlIHNjaGVtYSBpbmZvcm1hdGlvbi5cbiAgICogQHRocm93cyBBcGlFcnJvciB3aGVuIHRoZSBzZXJ2ZXIgcmVzcG9uZHMgd2l0aCBhbiBlcnJvci5cbiAgICogQHRocm93cyBOZXR3b3JrRXJyb3Igd2hlbiB0aGUgcmVxdWVzdCBmYWlscyB0byByZWFjaCB0aGUgc2VydmVyLlxuICAgKi9cbiAgYXN5bmMgZ2V0VHlwZVNjaGVtYXMoY2FyZElkOiBzdHJpbmcpOiBQcm9taXNlPFR5cGVTY2hlbWFzUmVzcG9uc2U+IHtcbiAgICBjb25zdCB1cmwgPSB0aGlzLmJ1aWxkVXJsKGAvY2FyZHMvJHtjYXJkSWR9L3NjaGVtYWApO1xuICAgIHJldHVybiB0aGlzLnJlcXVlc3QoKCkgPT4gdGhpcy5nZXRIdHRwQ2xpZW50KCkuZ2V0PFR5cGVTY2hlbWFzUmVzcG9uc2U+KHVybCkpO1xuICB9XG5cbiAgLy8gLS0tIFN0cmVhbSBPcGVyYXRpb25zIC0tLVxuXG4gIC8qKlxuICAgKiBMaXN0cyBhbGwgc3RyZWFtcyBhdHRhY2hlZCB0byBhIGNhcmQsIHNvcnRlZCBieSBjcmVhdGlvbiB0aW1lLlxuICAgKlxuICAgKiBAcGFyYW0gY2FyZElkIC0gQ2FyZCBJRCB0byBxdWVyeS5cbiAgICogQHJldHVybnMgU3RyZWFtIG1ldGFkYXRhIGFycmF5IChtYXkgYmUgZW1wdHkpLlxuICAgKiBAdGhyb3dzIEFwaUVycm9yIHdoZW4gdGhlIHNlcnZlciByZXNwb25kcyB3aXRoIGFuIGVycm9yIChlLmcuLCA0MDQgZm9yIHVua25vd24gY2FyZCkuXG4gICAqIEB0aHJvd3MgTmV0d29ya0Vycm9yIHdoZW4gdGhlIHJlcXVlc3QgZmFpbHMgdG8gcmVhY2ggdGhlIHNlcnZlci5cbiAgICovXG4gIGFzeW5jIGxpc3RTdHJlYW1zKGNhcmRJZDogc3RyaW5nKTogUHJvbWlzZTxTdHJlYW1NZXRhW10+IHtcbiAgICBjb25zdCB1cmwgPSB0aGlzLmJ1aWxkVXJsKGAvY2FyZHMvJHtjYXJkSWR9L3N0cmVhbXNgKTtcbiAgICByZXR1cm4gdGhpcy5yZXF1ZXN0KCgpID0+IHRoaXMuZ2V0SHR0cENsaWVudCgpLmdldDxTdHJlYW1NZXRhW10+KHVybCkpO1xuICB9XG5cbiAgLyoqXG4gICAqIFJldHJpZXZlcyBhIHN0cmVhbSdzIG1ldGFkYXRhIGFuZCBhbGwgcmF3IGxpbmVzLlxuICAgKlxuICAgKiBUaGUgYHN0cmVhbVR5cGVgIGFuZCBgZmlsZW5hbWVgIGFyZSBVUkktZW5jb2RlZCBhdXRvbWF0aWNhbGx5LiBGb3IgY29tcGxldGVkXG4gICAqIHN0cmVhbXMgdGhlIHJldHVybmVkIGBsaW5lc2AgYXJyYXkgaXMgdGhlIGZ1bGwgY29udGVudDsgZm9yIGFjdGl2ZSBzdHJlYW1zIGl0XG4gICAqIGlzIGEgc25hcHNob3QgdGhhdCBtYXkgZ3JvdyB3aGlsZSB0aGUgY2FsbGVyIHByb2Nlc3NlcyBpdC5cbiAgICpcbiAgICogQHBhcmFtIGNhcmRJZCAtIElkZW50aWZpZXIgb2YgdGhlIGNhcmQgdGhhdCBvd25zIHRoZSByZXF1ZXN0ZWQgc3RyZWFtLlxuICAgKiBAcGFyYW0gc3RyZWFtVHlwZSAtIFN0cmVhbSB0eXBlIGtleSAoZS5nLiwgYFwiY2xhdWRlLWNvZGUtc2Vzc2lvblwiYCkuXG4gICAqIEBwYXJhbSBmaWxlbmFtZSAtIFN0cmVhbSBmaWxlbmFtZSAoZS5nLiwgYFwic2Vzc2lvbi5sb2dcImApLlxuICAgKiBAcmV0dXJucyBNZXRhZGF0YSBhbmQgY29udGVudCBsaW5lcy5cbiAgICogQHRocm93cyBBcGlFcnJvciBvbiA0MDQgKHVua25vd24gY2FyZCBvciBzdHJlYW0pIG9yIG90aGVyIHNlcnZlciBlcnJvcnMuXG4gICAqIEB0aHJvd3MgTmV0d29ya0Vycm9yIHdoZW4gdGhlIHJlcXVlc3QgZmFpbHMgdG8gcmVhY2ggdGhlIHNlcnZlci5cbiAgICovXG4gIGFzeW5jIGdldFN0cmVhbShcbiAgICBjYXJkSWQ6IHN0cmluZyxcbiAgICBzdHJlYW1UeXBlOiBzdHJpbmcsXG4gICAgZmlsZW5hbWU6IHN0cmluZ1xuICApOiBQcm9taXNlPHsgbWV0YTogU3RyZWFtTWV0YTsgbGluZXM6IHN0cmluZ1tdIH0+IHtcbiAgICBjb25zdCB1cmwgPSB0aGlzLmJ1aWxkVXJsKFxuICAgICAgYC9jYXJkcy8ke2NhcmRJZH0vc3RyZWFtcy8ke2VuY29kZVVSSUNvbXBvbmVudChzdHJlYW1UeXBlKX0vJHtlbmNvZGVVUklDb21wb25lbnQoZmlsZW5hbWUpfWBcbiAgICApO1xuICAgIHJldHVybiB0aGlzLnJlcXVlc3QoKCkgPT4gdGhpcy5nZXRIdHRwQ2xpZW50KCkuZ2V0PHsgbWV0YTogU3RyZWFtTWV0YTsgbGluZXM6IHN0cmluZ1tdIH0+KHVybCkpO1xuICB9XG5cbiAgLyoqXG4gICAqIE9wZW5zIGEgY2h1bmtlZCBKU09OTCBzdHJlYW0gdG8gdGhlIHNlcnZlciBhbmQgcmV0dXJucyBhIHdyaXRlci5cbiAgICpcbiAgICogVGhlIHdyaXRlciBzZW5kcyBlYWNoIGxpbmUgaW4gcmVhbC10aW1lIG92ZXIgYSBzaW5nbGUgSFRUUCBQT1NUIHVzaW5nIGFcbiAgICogYFJlYWRhYmxlU3RyZWFtYCBib2R5LiBDYWxsIHtAbGluayBTdHJlYW1Xcml0ZXIuY2xvc2V9IHdoZW4gdGhlIHByb2R1Y2VyXG4gICAqIGlzIGZpbmlzaGVkIHRvIGVuZCB0aGUgcmVxdWVzdCBhbmQgcmV0cmlldmUgdGhlIHNlcnZlcidzIHN1bW1hcnkuXG4gICAqXG4gICAqIEBwYXJhbSBjYXJkSWQgLSBDYXJkIElEIHRvIGF0dGFjaCB0aGUgc3RyZWFtIHRvLlxuICAgKiBAcGFyYW0gc3RyZWFtVHlwZSAtIFN0cmVhbSB0eXBlIGtleSBmcm9tIHNldHRpbmdzLmpzb24gKGUuZy4sIGBcImNsYXVkZS1jb2RlLXNlc3Npb25cImApLlxuICAgKiBAcGFyYW0gZmlsZW5hbWUgLSBTdHJlYW0gZmlsZW5hbWUgKGUuZy4sIGBcInNlc3Npb24tYWJjLmpzb25sXCJgKS5cbiAgICogQHBhcmFtIG9wdGlvbnMgLSBPcHRpb25hbCB0aXRsZSBhbmQgc2Vzc2lvbiBJRCBtZXRhZGF0YS5cbiAgICogQHJldHVybnMgQSB7QGxpbmsgU3RyZWFtV3JpdGVyfSBmb3IgcHVzaGluZyBsaW5lcyBhbmQgY2xvc2luZyB0aGUgc3RyZWFtLlxuICAgKlxuICAgKiBAZXhhbXBsZVxuICAgKiBgYGB0eXBlc2NyaXB0XG4gICAqIGNvbnN0IHN0cmVhbSA9IGNsaWVudC5vcGVuU3RyZWFtKGNhcmRJZCwgJ2NsYXVkZS1jb2RlLXNlc3Npb24nLCAncnVuLmpzb25sJyk7XG4gICAqIHN0cmVhbS53cml0ZShKU09OLnN0cmluZ2lmeSh7IHR5cGU6ICdpbml0JyB9KSk7XG4gICAqIHN0cmVhbS53cml0ZShKU09OLnN0cmluZ2lmeSh7IHR5cGU6ICdyZXN1bHQnIH0pKTtcbiAgICogY29uc3QgcmVzdWx0ID0gYXdhaXQgc3RyZWFtLmNsb3NlKCk7XG4gICAqIGBgYFxuICAgKi9cbiAgb3BlblN0cmVhbShjYXJkSWQ6IHN0cmluZywgc3RyZWFtVHlwZTogc3RyaW5nLCBmaWxlbmFtZTogc3RyaW5nLCBvcHRpb25zPzogU3RyZWFtV3JpdGVyT3B0aW9ucyk6IFN0cmVhbVdyaXRlciB7XG4gICAgY29uc3QgZW5jb2RlciA9IG5ldyBUZXh0RW5jb2RlcigpO1xuICAgIGxldCBjb250cm9sbGVyITogUmVhZGFibGVTdHJlYW1EZWZhdWx0Q29udHJvbGxlcjxVaW50OEFycmF5PjtcblxuICAgIGNvbnN0IGJvZHkgPSBuZXcgUmVhZGFibGVTdHJlYW08VWludDhBcnJheT4oe1xuICAgICAgc3RhcnQoYykge1xuICAgICAgICBjb250cm9sbGVyID0gYztcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIGNvbnN0IHVybCA9IHRoaXMuYnVpbGRVcmwoXG4gICAgICBgL2NhcmRzLyR7Y2FyZElkfS9zdHJlYW1zLyR7ZW5jb2RlVVJJQ29tcG9uZW50KHN0cmVhbVR5cGUpfS8ke2VuY29kZVVSSUNvbXBvbmVudChmaWxlbmFtZSl9YFxuICAgICk7XG5cbiAgICBjb25zdCBoZWFkZXJzOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ID0ge1xuICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi94LW5kanNvbidcbiAgICB9O1xuICAgIGlmICh0aGlzLm9wdGlvbnMuYWNjZXNzVG9rZW4pIHtcbiAgICAgIGhlYWRlcnNbJ0F1dGhvcml6YXRpb24nXSA9IGBCZWFyZXIgJHt0aGlzLm9wdGlvbnMuYWNjZXNzVG9rZW59YDtcbiAgICB9XG4gICAgaWYgKG9wdGlvbnM/LnRpdGxlKSB7XG4gICAgICBoZWFkZXJzWydYLVN0cmVhbS1UaXRsZSddID0gb3B0aW9ucy50aXRsZTtcbiAgICB9XG4gICAgaWYgKG9wdGlvbnM/LnNlc3Npb25JZCkge1xuICAgICAgaGVhZGVyc1snWC1TdHJlYW0tU2Vzc2lvbi1JZCddID0gb3B0aW9ucy5zZXNzaW9uSWQ7XG4gICAgfVxuXG4gICAgLy8gYGR1cGxleDogJ2hhbGYnYCBpcyByZXF1aXJlZCBieSB1bmRpY2kgZm9yIHN0cmVhbWluZyByZXF1ZXN0IGJvZGllc1xuICAgIC8vIGJ1dCBpcyBub3QgeWV0IGluIHRoZSBzdGFuZGFyZCBsaWIuZG9tIFJlcXVlc3RJbml0IHR5cGUuXG4gICAgY29uc3QgZmV0Y2hPcHRpb25zOiBSZXF1ZXN0SW5pdCAmIHsgZHVwbGV4OiBzdHJpbmcgfSA9IHtcbiAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgaGVhZGVycyxcbiAgICAgIGJvZHksXG4gICAgICBkdXBsZXg6ICdoYWxmJ1xuICAgIH07XG5cbiAgICBjb25zdCByZXNwb25zZVByb21pc2UgPSBmZXRjaCh1cmwsIGZldGNoT3B0aW9ucyk7XG5cbiAgICAvLyBUcmFjayBlYXJseSByZWplY3Rpb24gZnJvbSB0aGUgc2VydmVyIChlLmcuIDQwOSBcIlN0cmVhbSBhbHJlYWR5XG4gICAgLy8gZXhpc3RzIGFuZCBpcyBhY3RpdmVcIikuICBGb3IgYSBzdWNjZXNzZnVsIHN0cmVhbSB0aGUgcmVzcG9uc2Ugc3RheXNcbiAgICAvLyBwZW5kaW5nIHVudGlsIGNsb3NlKCkgZW5kcyB0aGUgYm9keSBcdTIwMTQgYnV0IGVycm9yIHJlc3BvbnNlcyBhcnJpdmVcbiAgICAvLyBpbW1lZGlhdGVseSBhbmQgbXVzdCBiZSBzdXJmYWNlZCB3aXRob3V0IHdhaXRpbmcgZm9yIGNsb3NlKCkuXG4gICAgLy8gTm90ZTogb25seSByZWFkcyByZXNwb25zZS5vay9zdGF0dXNUZXh0IChub3QgdGhlIGJvZHkpIHNvIGNsb3NlKClcbiAgICAvLyBjYW4gc3RpbGwgcGFyc2UgdGhlIGZ1bGwgZXJyb3IgcmVzcG9uc2UuXG4gICAgbGV0IGVhcmx5RXJyb3I6IEVycm9yIHwgbnVsbCA9IG51bGw7XG4gICAgcmVzcG9uc2VQcm9taXNlXG4gICAgICAudGhlbigocmVzcG9uc2UpID0+IHtcbiAgICAgICAgaWYgKCFyZXNwb25zZS5vaykge1xuICAgICAgICAgIGVhcmx5RXJyb3IgPSBuZXcgQXBpRXJyb3IocmVzcG9uc2Uuc3RhdHVzVGV4dCwgU3RyaW5nKHJlc3BvbnNlLnN0YXR1cykpO1xuICAgICAgICB9XG4gICAgICB9KVxuICAgICAgLmNhdGNoKChlcnI6IHVua25vd24pID0+IHtcbiAgICAgICAgZWFybHlFcnJvciA9IGVyciBpbnN0YW5jZW9mIEVycm9yID8gZXJyIDogbmV3IEVycm9yKFN0cmluZyhlcnIpKTtcbiAgICAgIH0pO1xuXG4gICAgcmV0dXJuIHtcbiAgICAgIHdyaXRlKGxpbmU6IHN0cmluZyk6IHZvaWQge1xuICAgICAgICBpZiAoZWFybHlFcnJvcikgdGhyb3cgZWFybHlFcnJvcjtcbiAgICAgICAgY29udHJvbGxlci5lbnF1ZXVlKGVuY29kZXIuZW5jb2RlKGAke2xpbmV9XFxuYCkpO1xuICAgICAgfSxcbiAgICAgIGNsb3NlOiBhc3luYyAoKTogUHJvbWlzZTxTdHJlYW1SZXN1bHQ+ID0+IHtcbiAgICAgICAgY29udHJvbGxlci5jbG9zZSgpO1xuICAgICAgICByZXR1cm4gdGhpcy5yZXF1ZXN0KGFzeW5jICgpID0+IHtcbiAgICAgICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IHJlc3BvbnNlUHJvbWlzZTtcbiAgICAgICAgICBpZiAoIXJlc3BvbnNlLm9rKSB0aHJvdyByZXNwb25zZTtcbiAgICAgICAgICByZXR1cm4gcmVzcG9uc2UuanNvbigpIGFzIFByb21pc2U8U3RyZWFtUmVzdWx0PjtcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfTtcbiAgfVxuXG4gIC8qKlxuICAgKiBPcGVucyBhIFdlYlNvY2tldC1iYWNrZWQgSlNPTkwgc3RyZWFtIHRvIHRoZSBzZXJ2ZXIgYW5kIHJldHVybnMgYSBzZXNzaW9uLlxuICAgKlxuICAgKiBUaGUgc2Vzc2lvbiBrZWVwcyBhIHBlcnNpc3RlbnQgV2ViU29ja2V0IGNvbm5lY3Rpb24gZm9yIHRoZSBlbnRpcmUgc2Vzc2lvblxuICAgKiBsaWZldGltZS4gVGhlIHNlcnZlciBzZW5kcyBhIGByZWFkeWAgbWVzc2FnZSB3aXRoIGByZXN1bWVGcm9tYCBiZWZvcmUgdGhlXG4gICAqIGNhbGxlciB3cml0ZXMgYW55IGxpbmVzLCBzbyB0aGUgd2F0Y2hlciBjYW4gc2tpcCBsaW5lcyB0aGUgc2VydmVyIGFscmVhZHkgaGFzLlxuICAgKlxuICAgKiBDYWxsIHtAbGluayBXc1N0cmVhbVNlc3Npb24uY2xvc2V9IHdoZW4gdGhlIHByb2R1Y2VyIGlzIGZpbmlzaGVkIHRvIHNlbmQgYVxuICAgKiBncmFjZWZ1bCBjbG9zZSBtZXNzYWdlIGFuZCBhd2FpdCB0aGUgc2VydmVyJ3MgYWNrbm93bGVkZ2VtZW50LlxuICAgKlxuICAgKiBAcGFyYW0gY2FyZElkIC0gQ2FyZCBJRCB0byBhdHRhY2ggdGhlIHN0cmVhbSB0by5cbiAgICogQHBhcmFtIHN0cmVhbVR5cGUgLSBTdHJlYW0gdHlwZSBrZXkgZnJvbSBzZXR0aW5ncy5qc29uIChlLmcuLCBgXCJjbGF1ZGUtY29kZS1zZXNzaW9uXCJgKS5cbiAgICogQHBhcmFtIGZpbGVuYW1lIC0gU3RyZWFtIGZpbGVuYW1lIChlLmcuLCBgXCJzZXNzaW9uLWFiYy5qc29ubFwiYCkuXG4gICAqIEBwYXJhbSBvcHRpb25zIC0gVGl0bGUgYW5kIHNlc3Npb24gSUQgbWV0YWRhdGEgZm9yd2FyZGVkIHRvIHRoZSBzZXJ2ZXIgYXMgVVJMIHF1ZXJ5IHBhcmFtZXRlcnMuXG4gICAqIEBwYXJhbSB3c0ZhY3RvcnkgLSBXZWJTb2NrZXQgZmFjdG9yeSBmb3IgY3JlYXRpbmcgdGhlIGNvbm5lY3Rpb24uIFVzZSB0aGUgYHdzYCBwYWNrYWdlIGluIE5vZGUuanMgZW52aXJvbm1lbnRzLlxuICAgKiBAcmV0dXJucyBBIHtAbGluayBXc1N0cmVhbVNlc3Npb259IHdpdGggYHJlc3VtZUZyb21gIHNldCB0byB0aGUgc2VydmVyJ3MgY3VycmVudCBsaW5lIGNvdW50LlxuICAgKiBAdGhyb3dzIEVycm9yIHdoZW4gdGhlIFdlYlNvY2tldCBmYWlscyB0byBjb25uZWN0IG9yIHRoZSBzZXJ2ZXIgc2VuZHMgYW4gZXJyb3IgYmVmb3JlIGByZWFkeWAuXG4gICAqL1xuICBhc3luYyBvcGVuU3RyZWFtV2ViU29ja2V0KFxuICAgIGNhcmRJZDogc3RyaW5nLFxuICAgIHN0cmVhbVR5cGU6IHN0cmluZyxcbiAgICBmaWxlbmFtZTogc3RyaW5nLFxuICAgIG9wdGlvbnM6IFN0cmVhbVdyaXRlck9wdGlvbnMsXG4gICAgd3NGYWN0b3J5OiBJbmdlc3RXc0ZhY3RvcnlcbiAgKTogUHJvbWlzZTxXc1N0cmVhbVNlc3Npb24+IHtcbiAgICBjb25zdCBmYWN0b3J5ID0gd3NGYWN0b3J5O1xuXG4gICAgLy8gQ29udmVydCBodHRwL2h0dHBzIHRvIHdzL3dzc1xuICAgIGNvbnN0IGJhc2VVcmwgPSB0aGlzLm9wdGlvbnMuYmFzZVVybC5yZXBsYWNlKC9eaHR0cC8sICd3cycpO1xuICAgIGNvbnN0IGJhc2VQYXRoID0gYCR7YmFzZVVybH0vY2FyZHMvJHtlbmNvZGVVUklDb21wb25lbnQoY2FyZElkKX0vc3RyZWFtcy8ke2VuY29kZVVSSUNvbXBvbmVudChzdHJlYW1UeXBlKX0vJHtlbmNvZGVVUklDb21wb25lbnQoZmlsZW5hbWUpfWA7XG4gICAgY29uc3QgcXVlcnlQYXJhbXMgPSBuZXcgVVJMU2VhcmNoUGFyYW1zKCk7XG4gICAgaWYgKG9wdGlvbnM/LnRpdGxlKSBxdWVyeVBhcmFtcy5zZXQoJ3RpdGxlJywgb3B0aW9ucy50aXRsZSk7XG4gICAgaWYgKG9wdGlvbnM/LnNlc3Npb25JZCkgcXVlcnlQYXJhbXMuc2V0KCdzZXNzaW9uSWQnLCBvcHRpb25zLnNlc3Npb25JZCk7XG4gICAgY29uc3QgcXVlcnlTdHJpbmcgPSBxdWVyeVBhcmFtcy50b1N0cmluZygpO1xuICAgIGNvbnN0IHVybCA9IHF1ZXJ5U3RyaW5nID8gYCR7YmFzZVBhdGh9PyR7cXVlcnlTdHJpbmd9YCA6IGJhc2VQYXRoO1xuXG4gICAgY29uc3QgaGVhZGVyczogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHt9O1xuICAgIGlmICh0aGlzLm9wdGlvbnMuYWNjZXNzVG9rZW4pIHtcbiAgICAgIGhlYWRlcnNbJ0F1dGhvcml6YXRpb24nXSA9IGBCZWFyZXIgJHt0aGlzLm9wdGlvbnMuYWNjZXNzVG9rZW59YDtcbiAgICB9XG5cbiAgICBjb25zdCB3cyA9IGZhY3RvcnkodXJsLCB7IGhlYWRlcnMgfSk7XG5cbiAgICAvLyBBd2FpdCB0aGUgJ3JlYWR5JyBtZXNzYWdlIGZyb20gdGhlIHNlcnZlciBiZWZvcmUgcmV0dXJuaW5nIHRvIHRoZSBjYWxsZXIuXG4gICAgLy8gQW55IGVycm9yIG9yIHByZW1hdHVyZSBjbG9zZSBiZWZvcmUgJ3JlYWR5JyByZWplY3RzIHRoZSBwcm9taXNlLlxuICAgIGNvbnN0IHJlc3VtZUZyb20gPSBhd2FpdCBuZXcgUHJvbWlzZTxudW1iZXI+KChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgIGNvbnN0IG9uUmVhZHkgPSAoZXZlbnQ6IE1lc3NhZ2VFdmVudDx1bmtub3duPikgPT4ge1xuICAgICAgICB0cnkge1xuICAgICAgICAgIGNvbnN0IG1zZyA9IEpTT04ucGFyc2UoU3RyaW5nKGV2ZW50LmRhdGEpKSBhcyB7IHR5cGU6IHN0cmluZzsgcmVzdW1lRnJvbT86IG51bWJlcjsgbWVzc2FnZT86IHN0cmluZyB9O1xuICAgICAgICAgIGlmIChtc2cudHlwZSA9PT0gJ3JlYWR5Jykge1xuICAgICAgICAgICAgd3MucmVtb3ZlRXZlbnRMaXN0ZW5lcignbWVzc2FnZScsIG9uUmVhZHkpO1xuICAgICAgICAgICAgd3MucmVtb3ZlRXZlbnRMaXN0ZW5lcignZXJyb3InLCBvbkVycm9yKTtcbiAgICAgICAgICAgIHdzLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2Nsb3NlJywgb25DbG9zZSk7XG4gICAgICAgICAgICByZXNvbHZlKG1zZy5yZXN1bWVGcm9tID8/IDApO1xuICAgICAgICAgIH0gZWxzZSBpZiAobXNnLnR5cGUgPT09ICdlcnJvcicpIHtcbiAgICAgICAgICAgIHdzLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ21lc3NhZ2UnLCBvblJlYWR5KTtcbiAgICAgICAgICAgIHdzLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2Vycm9yJywgb25FcnJvcik7XG4gICAgICAgICAgICB3cy5yZW1vdmVFdmVudExpc3RlbmVyKCdjbG9zZScsIG9uQ2xvc2UpO1xuICAgICAgICAgICAgcmVqZWN0KG5ldyBFcnJvcihtc2cubWVzc2FnZSA/PyAnU2VydmVyIGVycm9yJykpO1xuICAgICAgICAgIH1cbiAgICAgICAgICAvLyBPdGhlciBtZXNzYWdlIHR5cGVzIGJlZm9yZSAncmVhZHknIGFyZSBzaWxlbnRseSBpZ25vcmVkXG4gICAgICAgIH0gY2F0Y2gge1xuICAgICAgICAgIHJlamVjdChuZXcgRXJyb3IoJ0ZhaWxlZCB0byBwYXJzZSBzZXJ2ZXIgcmVhZHkgbWVzc2FnZScpKTtcbiAgICAgICAgfVxuICAgICAgfTtcbiAgICAgIGNvbnN0IG9uRXJyb3IgPSAoZXZlbnQ6IEV2ZW50KSA9PiB7XG4gICAgICAgIHdzLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ21lc3NhZ2UnLCBvblJlYWR5KTtcbiAgICAgICAgd3MucmVtb3ZlRXZlbnRMaXN0ZW5lcignZXJyb3InLCBvbkVycm9yKTtcbiAgICAgICAgd3MucmVtb3ZlRXZlbnRMaXN0ZW5lcignY2xvc2UnLCBvbkNsb3NlKTtcbiAgICAgICAgcmVqZWN0KG5ldyBFcnJvcihgV2ViU29ja2V0IGVycm9yOiAke1N0cmluZyhldmVudCl9YCkpO1xuICAgICAgfTtcbiAgICAgIGNvbnN0IG9uQ2xvc2UgPSAoZXZlbnQ6IENsb3NlRXZlbnQpID0+IHtcbiAgICAgICAgd3MucmVtb3ZlRXZlbnRMaXN0ZW5lcignbWVzc2FnZScsIG9uUmVhZHkpO1xuICAgICAgICB3cy5yZW1vdmVFdmVudExpc3RlbmVyKCdlcnJvcicsIG9uRXJyb3IpO1xuICAgICAgICB3cy5yZW1vdmVFdmVudExpc3RlbmVyKCdjbG9zZScsIG9uQ2xvc2UpO1xuICAgICAgICByZWplY3QobmV3IEVycm9yKGBXZWJTb2NrZXQgY2xvc2VkIGJlZm9yZSByZWFkeTogY29kZT0ke1N0cmluZyhldmVudC5jb2RlKX1gKSk7XG4gICAgICB9O1xuICAgICAgd3MuYWRkRXZlbnRMaXN0ZW5lcignbWVzc2FnZScsIG9uUmVhZHkpO1xuICAgICAgd3MuYWRkRXZlbnRMaXN0ZW5lcignZXJyb3InLCBvbkVycm9yKTtcbiAgICAgIHdzLmFkZEV2ZW50TGlzdGVuZXIoJ2Nsb3NlJywgb25DbG9zZSk7XG4gICAgfSk7XG5cbiAgICBsZXQgbGluZXNTZW50ID0gcmVzdW1lRnJvbTtcblxuICAgIHJldHVybiB7XG4gICAgICBnZXQgcmVzdW1lRnJvbSgpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gcmVzdW1lRnJvbTtcbiAgICAgIH0sXG4gICAgICBnZXQgbGluZXNTZW50KCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiBsaW5lc1NlbnQ7XG4gICAgICB9LFxuICAgICAgd3JpdGUobGluZTogc3RyaW5nKTogdm9pZCB7XG4gICAgICAgIGxpbmVzU2VudCsrO1xuICAgICAgICB3cy5zZW5kKEpTT04uc3RyaW5naWZ5KHsgdHlwZTogJ2xpbmUnLCBsaW5lTnVtYmVyOiBsaW5lc1NlbnQsIGNvbnRlbnQ6IGxpbmUgfSkpO1xuICAgICAgfSxcbiAgICAgIGFzeW5jIGNsb3NlKCk6IFByb21pc2U8U3RyZWFtUmVzdWx0PiB7XG4gICAgICAgIHdzLnNlbmQoSlNPTi5zdHJpbmdpZnkoeyB0eXBlOiAnY2xvc2UnIH0pKTtcbiAgICAgICAgYXdhaXQgbmV3IFByb21pc2U8dm9pZD4oKHJlc29sdmUpID0+IHtcbiAgICAgICAgICBjb25zdCBvbkNsb3NlID0gKCkgPT4ge1xuICAgICAgICAgICAgd3MucmVtb3ZlRXZlbnRMaXN0ZW5lcignY2xvc2UnLCBvbkNsb3NlKTtcbiAgICAgICAgICAgIHJlc29sdmUoKTtcbiAgICAgICAgICB9O1xuICAgICAgICAgIHdzLmFkZEV2ZW50TGlzdGVuZXIoJ2Nsb3NlJywgb25DbG9zZSk7XG4gICAgICAgICAgLy8gSWYgYWxyZWFkeSBjbG9zZWQsIHJlc29sdmUgaW1tZWRpYXRlbHlcbiAgICAgICAgICBpZiAod3MucmVhZHlTdGF0ZSA9PT0gd3MuQ0xPU0VEKSB7XG4gICAgICAgICAgICB3cy5yZW1vdmVFdmVudExpc3RlbmVyKCdjbG9zZScsIG9uQ2xvc2UpO1xuICAgICAgICAgICAgcmVzb2x2ZSgpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgZmlsZW5hbWUsXG4gICAgICAgICAgc3RyZWFtVHlwZSxcbiAgICAgICAgICBsaW5lQ291bnQ6IGxpbmVzU2VudCxcbiAgICAgICAgICBzdGF0dXM6ICdjb21wbGV0ZWQnXG4gICAgICAgIH07XG4gICAgICB9XG4gICAgfTtcbiAgfVxuXG4gIC8vIC0tLSBBY3Rpb24gT3BlcmF0aW9ucyAtLS1cblxuICAvKipcbiAgICogRXhlY3V0ZXMgYW4gYWN0aW9uIG9uIGEgY2FyZCB2aWEgdGhlIHNlcnZlciByZWxheS5cbiAgICpcbiAgICogQHBhcmFtIGNhcmRJZCAtIElkZW50aWZpZXIgb2YgdGhlIGNhcmQgdG8gZXhlY3V0ZSB0aGUgYWN0aW9uIG9uLlxuICAgKiBAcGFyYW0gYWN0aW9uTmFtZSAtIEFjdGlvbiBpZGVudGlmaWVyIChlLmcuLCAnbGF1bmNoJykuXG4gICAqIEByZXR1cm5zIFByb21pc2UgcmVzb2x2aW5nIHRvIHRoZSBhY3Rpb24gZXhlY3V0aW9uIHJlc3VsdC5cbiAgICogQHRocm93cyBBcGlFcnJvciB3aGVuIHRoZSBzZXJ2ZXIgcmVqZWN0cyB0aGUgcmVxdWVzdC5cbiAgICogQHRocm93cyBOZXR3b3JrRXJyb3Igd2hlbiB0aGUgcmVxdWVzdCBmYWlscyB0byByZWFjaCB0aGUgc2VydmVyLlxuICAgKi9cbiAgYXN5bmMgZXhlY3V0ZUFjdGlvbihjYXJkSWQ6IHN0cmluZywgYWN0aW9uTmFtZTogc3RyaW5nKTogUHJvbWlzZTxBY3Rpb25SZXN1bHQ+IHtcbiAgICBjb25zdCB1cmwgPSB0aGlzLmJ1aWxkVXJsKGAvY2FyZHMvJHtjYXJkSWR9L2FjdGlvbnMvJHtlbmNvZGVVUklDb21wb25lbnQoYWN0aW9uTmFtZSl9YCk7XG4gICAgcmV0dXJuIHRoaXMucmVxdWVzdCgoKSA9PiB0aGlzLmdldEh0dHBDbGllbnQoKS5wb3N0PEFjdGlvblJlc3VsdD4odXJsLCB1bmRlZmluZWQpKTtcbiAgfVxuXG4gIC8vIC0tLSBDb21wYXJlIE9wZXJhdGlvbnMgLS0tXG5cbiAgLyoqXG4gICAqIFNldHMgb3IgcmVwbGFjZXMgdGhlIGFjdGl2ZSBjb21wYXJpc29uIG9uIHRoZSBzZXJ2ZXIuXG4gICAqXG4gICAqIEBwYXJhbSByZXF1ZXN0IC0gQ29tcGFyZSByZXF1ZXN0IHNwZWNpZnlpbmcgdGhlIGNvbXBhcmlzb24gbW9kZS5cbiAgICogQHJldHVybnMgUHJvbWlzZSByZXNvbHZpbmcgdG8gdGhlIHJlc3VsdGluZyBjb21wYXJlIHN0YXRlLlxuICAgKi9cbiAgYXN5bmMgc2V0Q29tcGFyZShyZXF1ZXN0OiBDb21wYXJlUmVxdWVzdCk6IFByb21pc2U8Q29tcGFyZVN0YXRlPiB7XG4gICAgY29uc3QgdXJsID0gdGhpcy5idWlsZFVybCgnL2NvbXBhcmUnKTtcbiAgICByZXR1cm4gdGhpcy5yZXF1ZXN0KCgpID0+IHRoaXMuZ2V0SHR0cENsaWVudCgpLnBvc3Q8Q29tcGFyZVN0YXRlPih1cmwsIHJlcXVlc3QpKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXR1cm5zIHRoZSBjdXJyZW50IGNvbXBhcmUgc3RhdGUsIG9yIG51bGwgaWYgbm8gY29tcGFyaXNvbiBpcyBhY3RpdmUuXG4gICAqXG4gICAqIFRoZSBzZXJ2ZXIgcmV0dXJucyAyMDQgd2hlbiBubyBjb21wYXJpc29uIGlzIGFjdGl2ZSwgd2hpY2ggdGhpcyBtZXRob2RcbiAgICogbWFwcyB0byBudWxsIHJhdGhlciB0aGFuIHRocm93aW5nLlxuICAgKlxuICAgKiBAcmV0dXJucyBQcm9taXNlIHJlc29sdmluZyB0byB0aGUgY3VycmVudCBjb21wYXJlIHN0YXRlLCBvciBudWxsIGlmIG5vbmUgYWN0aXZlLlxuICAgKi9cbiAgYXN5bmMgZ2V0Q29tcGFyZSgpOiBQcm9taXNlPENvbXBhcmVTdGF0ZSB8IG51bGw+IHtcbiAgICBjb25zdCB1cmwgPSB0aGlzLmJ1aWxkVXJsKCcvY29tcGFyZScpO1xuICAgIHJldHVybiB0aGlzLnJlcXVlc3QoYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBmZXRjaCh1cmwsIHtcbiAgICAgICAgaGVhZGVyczogdGhpcy5nZXRIZWFkZXJzKCkgYXMgUmVjb3JkPHN0cmluZywgc3RyaW5nPixcbiAgICAgICAgc2lnbmFsOiB0aGlzLmdldFRpbWVvdXRTaWduYWwoKVxuICAgICAgfSk7XG4gICAgICBpZiAocmVzcG9uc2Uuc3RhdHVzID09PSAyMDQpIHtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9XG4gICAgICBpZiAoIXJlc3BvbnNlLm9rKSB0aHJvdyByZXNwb25zZTtcbiAgICAgIHJldHVybiByZXNwb25zZS5qc29uKCkgYXMgUHJvbWlzZTxDb21wYXJlU3RhdGU+O1xuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIENsZWFycyB0aGUgYWN0aXZlIGNvbXBhcmlzb24gb24gdGhlIHNlcnZlci5cbiAgICpcbiAgICogQHJldHVybnMgUHJvbWlzZSByZXNvbHZpbmcgd2hlbiB0aGUgY29tcGFyaXNvbiBpcyBjbGVhcmVkLlxuICAgKi9cbiAgYXN5bmMgY2xlYXJDb21wYXJlKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIGNvbnN0IHVybCA9IHRoaXMuYnVpbGRVcmwoJy9jb21wYXJlJyk7XG4gICAgcmV0dXJuIHRoaXMucmVxdWVzdCgoKSA9PiB0aGlzLmdldEh0dHBDbGllbnQoKS5kZWxldGUodXJsKSk7XG4gIH1cbn1cbiIsICIvKipcbiAqIERldGFjaGVkIGJyYW5jaC1jbGVhbnVwIHdhdGNoZXIgZm9yIGludGVyYWN0aXZlIHNlc3Npb25zLlxuICpcbiAqIFByb3ZpZGVzIGEgZmlyZS1hbmQtZm9yZ2V0IG1lY2hhbmlzbSBmb3IgcnVubmluZyBicmFuY2ggY2xlYW51cCBhZnRlciB0aGVcbiAqIGludGVyYWN0aXZlIENMSSBleGl0cy4gVGhlIHdhdGNoZXIgc3Bhd25zIGl0c2VsZiBhcyBhIGRldGFjaGVkIE5vZGUuanNcbiAqIHByb2Nlc3MsIHJlY2VpdmVzIGNsZWFudXAgcGFyYW1ldGVycyB2aWEgc3RkaW4sIGNhbGxzXG4gKiB7QGxpbmsgY2xlYW51cE1lcmdlZEJyYW5jaGVzfSwgdGhlbiBleGl0cy5cbiAqXG4gKiBAc3VtbWFyeSBEZXRhY2hlZCBicmFuY2gtY2xlYW51cCB3YXRjaGVyIGZvciBpbnRlcmFjdGl2ZSBzZXNzaW9uc1xuICogQG1vZHVsZVxuICovXG5cbmltcG9ydCB7IHR5cGUgQ2hpbGRQcm9jZXNzLCBzcGF3biB9IGZyb20gJ25vZGU6Y2hpbGRfcHJvY2Vzcyc7XG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ25vZGU6cGF0aCc7XG5pbXBvcnQgeyBDYXJkc0NsaWVudCB9IGZyb20gJ0BjYXJkcy9zZGsvY2xpZW50JztcbmltcG9ydCB7IHR5cGUgQWN0aW9uSW5wdXQsIExvZ2dlciB9IGZyb20gJ0BjYXJkcy9zZGsvY29uZmlnJztcbmltcG9ydCB7IGNsZWFudXBNZXJnZWRCcmFuY2hlcywgZXJyb3JNZXNzYWdlIH0gZnJvbSAnLi9jbGF1ZGUtc2Vzc2lvbi5qcyc7XG5cbi8qKlxuICogUGFyYW1ldGVycyByZXF1aXJlZCB0byBydW4gYnJhbmNoIGNsZWFudXAgaW4gYSBkZXRhY2hlZCBwcm9jZXNzLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIEJyYW5jaENsZWFudXBQYXJhbXMge1xuICAvKiogVGhlIGNhcmQgSUQgZm9yIHRoZSBzZXNzaW9uIGJlaW5nIGNsZWFuZWQgdXAuICovXG4gIGNhcmRJZDogc3RyaW5nO1xuICAvKiogQWJzb2x1dGUgcGF0aCB0byB0aGUgcmVwb3NpdG9yeSByb290LiAqL1xuICByZXBvUm9vdDogc3RyaW5nO1xuICAvKiogQmFzZSBVUkwgZm9yIHRoZSBDYXJkcyBBUEkuICovXG4gIGFwaUJhc2VVcmw6IHN0cmluZztcbiAgLyoqIEFjY2VzcyB0b2tlbiBmb3IgdGhlIENhcmRzIEFQSS4gKi9cbiAgYXBpQWNjZXNzVG9rZW46IHN0cmluZztcbiAgLyoqIE9wdGlvbmFsIHNlc3Npb24gSUQgZm9yIGxvZyBjb3JyZWxhdGlvbi4gKi9cbiAgc2Vzc2lvbklkPzogc3RyaW5nO1xufVxuXG4vKipcbiAqIFNwYXducyBhIGRldGFjaGVkIE5vZGUuanMgcHJvY2VzcyB0aGF0IGNhbGxzIHtAbGluayBjbGVhbnVwTWVyZ2VkQnJhbmNoZXN9XG4gKiBhZnRlciByZWNlaXZpbmcgc2VyaWFsaXplZCBwYXJhbWV0ZXJzIHZpYSBzdGRpbi5cbiAqXG4gKiBUaGUgc3Bhd25lZCBwcm9jZXNzIGlzIGZ1bGx5IGRldGFjaGVkIChgZGV0YWNoZWQ6IHRydWVgLCBgY2hpbGQudW5yZWYoKWApXG4gKiBhbmQgc3Vydml2ZXMgcGFyZW50IGV4aXQuIFN0ZG91dCBhbmQgc3RkZXJyIGFyZSBkaXNjYXJkZWQ7IGVycm9ycyBhcmVcbiAqIHdyaXR0ZW4gdG8gdGhlIHNoYXJlZCBhY3Rpb24taGFuZGxlciBsb2cgZmlsZSBpbiB0aGUgcmVwbyByb290LlxuICpcbiAqIEBwYXJhbSBwYXJhbXMgLSBQYXJhbWV0ZXJzIGZvciB0aGUgY2xlYW51cCBydW4uXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzcGF3bkJyYW5jaENsZWFudXBXYXRjaGVyKHBhcmFtczogQnJhbmNoQ2xlYW51cFBhcmFtcyk6IHZvaWQge1xuICBjb25zdCBzZWxmUGF0aCA9IG5ldyBVUkwoaW1wb3J0Lm1ldGEudXJsKS5wYXRobmFtZTtcbiAgY29uc3Qgbm9kZUJpbiA9IHByb2Nlc3MuZXhlY1BhdGg7XG5cbiAgbGV0IGNoaWxkOiBDaGlsZFByb2Nlc3M7XG4gIHRyeSB7XG4gICAgY2hpbGQgPSBzcGF3bihub2RlQmluLCBbc2VsZlBhdGgsICctLWJyYW5jaC1jbGVhbnVwJ10sIHtcbiAgICAgIGRldGFjaGVkOiB0cnVlLFxuICAgICAgc3RkaW86IFsncGlwZScsICdpZ25vcmUnLCAnaWdub3JlJ11cbiAgICB9KTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAvLyBGYWlsLW9wZW46IGxvZyBhbmQgcmV0dXJuOyBjbGVhbnVwIHdpbGwgbm90IHJ1biB0aGlzIHNlc3Npb25cbiAgICBjb25zb2xlLmVycm9yKGBbYnJhbmNoLWNsZWFudXAtd2F0Y2hlcl0gRmFpbGVkIHRvIHNwYXduIHdhdGNoZXI6ICR7ZXJyb3JNZXNzYWdlKGVycm9yKX1gKTtcbiAgICByZXR1cm47XG4gIH1cblxuICBjaGlsZC5zdGRpbiEub24oJ2Vycm9yJywgKGVycikgPT4ge1xuICAgIC8vIFRoZSBwYXJlbnQgbWF5IGV4aXQgYmVmb3JlIHN0ZGluIGlzIGZ1bGx5IGRyYWluZWQ7IHRoaXMgaXMgZXhwZWN0ZWRcbiAgICBjb25zb2xlLmVycm9yKGBbYnJhbmNoLWNsZWFudXAtd2F0Y2hlcl0gU3RkaW4gcGlwZSBlcnJvcjogJHtlcnJvck1lc3NhZ2UoZXJyKX1gKTtcbiAgfSk7XG5cbiAgY2hpbGQuc3RkaW4hLndyaXRlKGAke0pTT04uc3RyaW5naWZ5KHBhcmFtcyl9XFxuYCk7XG4gIGNoaWxkLnN0ZGluIS5lbmQoKTtcblxuICBjaGlsZC51bnJlZigpO1xufVxuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBEZXRhY2hlZCBlbnRyeSBwb2ludFxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG5pZiAocHJvY2Vzcy5hcmd2LmluY2x1ZGVzKCctLWJyYW5jaC1jbGVhbnVwJykpIHtcbiAgY29uc3QgY2h1bmtzOiBCdWZmZXJbXSA9IFtdO1xuXG4gIHByb2Nlc3Muc3RkaW4ub24oJ2RhdGEnLCAoY2h1bms6IEJ1ZmZlcikgPT4ge1xuICAgIGNodW5rcy5wdXNoKGNodW5rKTtcbiAgfSk7XG5cbiAgcHJvY2Vzcy5zdGRpbi5vbignZW5kJywgKCkgPT4ge1xuICAgIHZvaWQgKGFzeW5jICgpID0+IHtcbiAgICAgIGNvbnN0IHJhdyA9IEJ1ZmZlci5jb25jYXQoY2h1bmtzKS50b1N0cmluZygndXRmOCcpO1xuICAgICAgbGV0IHBhcmFtczogQnJhbmNoQ2xlYW51cFBhcmFtcztcbiAgICAgIHRyeSB7XG4gICAgICAgIHBhcmFtcyA9IEpTT04ucGFyc2UocmF3KSBhcyBCcmFuY2hDbGVhbnVwUGFyYW1zO1xuICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcihgW2JyYW5jaC1jbGVhbnVwLXdhdGNoZXJdIEZhaWxlZCB0byBwYXJzZSBwYXJhbXM6ICR7ZXJyb3JNZXNzYWdlKGVycm9yKX1gKTtcbiAgICAgICAgcHJvY2Vzcy5leGl0KDEpO1xuICAgICAgfVxuXG4gICAgICBjb25zdCB7IGNhcmRJZCwgcmVwb1Jvb3QsIGFwaUJhc2VVcmwsIGFwaUFjY2Vzc1Rva2VuLCBzZXNzaW9uSWQgfSA9IHBhcmFtcztcblxuICAgICAgY29uc3QgaW5wdXQ6IEFjdGlvbklucHV0ID0ge1xuICAgICAgICBjYXJkSWQsXG4gICAgICAgIHJlcG9Sb290LFxuICAgICAgICBhcGlCYXNlVXJsLFxuICAgICAgICBhcGlBY2Nlc3NUb2tlbixcbiAgICAgICAgYWN0aW9uTmFtZTogJ2JyYW5jaC1jbGVhbnVwLXdhdGNoZXInLFxuICAgICAgICBlbnZpcm9ubWVudDogJycsXG4gICAgICAgIGV4ZWN1dGlvbk1vZGU6ICdiYWNrZ3JvdW5kJyxcbiAgICAgICAgY29kaW5nQWdlbnQ6IHVuZGVmaW5lZCxcbiAgICAgICAgc3dpdGNoVG9JbnRlcmFjdGl2ZURhdGE6IHVuZGVmaW5lZCxcbiAgICAgICAgY2FyZFJlcG9QYXRoOiAnJyxcbiAgICAgICAgY29uZmlnUGF0aDogJycsXG4gICAgICAgIGV4dGVuc2lvblBhdGg6ICcnXG4gICAgICB9O1xuXG4gICAgICBjb25zdCBjbGllbnQgPSBuZXcgQ2FyZHNDbGllbnQoe1xuICAgICAgICBiYXNlVXJsOiBhcGlCYXNlVXJsLFxuICAgICAgICBhY2Nlc3NUb2tlbjogYXBpQWNjZXNzVG9rZW5cbiAgICAgIH0pO1xuXG4gICAgICBjb25zdCBsb2dnZXIgPSBuZXcgTG9nZ2VyKHtcbiAgICAgICAgbG9nRmlsZVBhdGg6IHBhdGguam9pbihyZXBvUm9vdCwgJy5jYXJkcycsICdsb2dzJywgJ2NhcmRzLWRlZmF1bHQtY29uZmlndXJhdGlvbi1ob29rcy5sb2cnKVxuICAgICAgfSk7XG5cbiAgICAgIHRyeSB7XG4gICAgICAgIGF3YWl0IGNsZWFudXBNZXJnZWRCcmFuY2hlcyhpbnB1dCwgY2xpZW50LCBsb2dnZXIsIHNlc3Npb25JZCk7XG4gICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICBjb25zdCBtZXNzYWdlID0gZXJyb3JNZXNzYWdlKGVycm9yKTtcbiAgICAgICAgbG9nZ2VyLmVycm9yKCdCcmFuY2ggY2xlYW51cCB3YXRjaGVyIGZhaWxlZCcsIHsgZXJyb3I6IG1lc3NhZ2UsIHNlc3Npb25JZCB9KTtcbiAgICAgIH0gZmluYWxseSB7XG4gICAgICAgIGxvZ2dlci5jbG9zZSgpO1xuICAgICAgfVxuICAgIH0pKCk7XG4gIH0pO1xufVxuIiwgIi8qKlxuICogU2hhcmVkIHNlc3Npb24gdXRpbGl0aWVzIGZvciBDbGF1ZGUgQ29kZSBhY3Rpb24gd29ya2Zsb3dzLlxuICpcbiAqIFByb3ZpZGVzIHJldXNhYmxlIGJ1aWxkaW5nIGJsb2NrcyBmb3IgYWN0aW9ucyB0aGF0IHNwYXduIHRoZSBgY2xhdWRlYCBDTEk6XG4gKiBwbHVnaW4gc2V0dGluZ3MgY29uc3RydWN0aW9uLCBDTEkgYXJnIGJ1aWxkaW5nLCB3b3JrdHJlZSBsaWZlY3ljbGUgbWFuYWdlbWVudCxcbiAqIGFuZCBicmFuY2ggY2xlYW51cC4gQm90aCB0aGUgYGxhdW5jaGAgYW5kIGBpbnRlcnZpZXdgIGFjdGlvbnMgY29uc3VtZSB0aGVzZVxuICogdXRpbGl0aWVzLlxuICpcbiAqIEBzdW1tYXJ5IFNoYXJlZCBzZXNzaW9uIHV0aWxpdGllcyBmb3IgQ2xhdWRlIENvZGUgYWN0aW9uIHdvcmtmbG93c1xuICogQG1vZHVsZVxuICovXG5cbmltcG9ydCB7IHR5cGUgQ2hpbGRQcm9jZXNzLCBleGVjRmlsZSwgc3Bhd24gfSBmcm9tICdub2RlOmNoaWxkX3Byb2Nlc3MnO1xuaW1wb3J0ICogYXMgZnMgZnJvbSAnbm9kZTpmcy9wcm9taXNlcyc7XG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ25vZGU6cGF0aCc7XG5pbXBvcnQgeyBwcm9taXNpZnkgfSBmcm9tICdub2RlOnV0aWwnO1xuaW1wb3J0IHsgQ2FyZHNDbGllbnQgfSBmcm9tICdAY2FyZHMvc2RrL2NsaWVudCc7XG5pbXBvcnQgeyB0eXBlIEFjdGlvbkNvbnRleHQsIHR5cGUgQWN0aW9uSW5wdXQsIENBUkRTX0VOVl9WQVJTIH0gZnJvbSAnQGNhcmRzL3Nkay9jb25maWcnO1xuaW1wb3J0IHsgcmVzb2x2ZUNsYXVkZUNvbmZpZ0RpciwgdXBkYXRlTWFya2V0cGxhY2VSZWdpc3RyYXRpb24gfSBmcm9tICdAY2FyZHMvc2RrL21hcmtldHBsYWNlJztcbmV4cG9ydCB7IHJlc29sdmVDbGF1ZGVDb25maWdEaXIsIHVwZGF0ZU1hcmtldHBsYWNlUmVnaXN0cmF0aW9uIH07XG5cbmltcG9ydCB7IGNoZWNrV29ya3RyZWVFeGlzdHMsIGNyZWF0ZVdvcmt0cmVlLCBmaW5kR2l0Um9vdHMgfSBmcm9tICdAY2FyZHMvc2RrL3dvcmt0cmVlJztcbmltcG9ydCB7IHNwYXduQnJhbmNoQ2xlYW51cFdhdGNoZXIgfSBmcm9tICcuL2JyYW5jaC1jbGVhbnVwLXdhdGNoZXIuanMnO1xuXG5jb25zdCBleGVjRmlsZUFzeW5jID0gcHJvbWlzaWZ5KGV4ZWNGaWxlKTtcblxuLyoqXG4gKiBFeHRyYWN0cyBhIGh1bWFuLXJlYWRhYmxlIG1lc3NhZ2UgZnJvbSBhbiB1bmtub3duIGNhdGNoIHZhbHVlLlxuICogQHBhcmFtIGVycm9yIC0gVGhlIGNhdWdodCB2YWx1ZSB0byBleHRyYWN0IGEgbWVzc2FnZSBmcm9tLlxuICogQHJldHVybnMgVGhlIGVycm9yIG1lc3NhZ2Ugc3RyaW5nLlxuICovXG5leHBvcnQgZnVuY3Rpb24gZXJyb3JNZXNzYWdlKGVycm9yOiB1bmtub3duKTogc3RyaW5nIHtcbiAgcmV0dXJuIGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogU3RyaW5nKGVycm9yKTtcbn1cblxuLyoqXG4gKiBSZXNvbHZlcyB0aGUgbWFya2V0cGxhY2UgZGlyZWN0b3J5IGJ1bmRsZWQgd2l0aCB0aGUgaW5zdGFsbGVkIGV4dGVuc2lvbi5cbiAqIFVzZXMgdGhlIEVYVEVOU0lPTl9QQVRIIGVudmlyb25tZW50IHZhcmlhYmxlIGluamVjdGVkIGJ5IEFjdGlvbkRpc3BhdGNoZXIuXG4gKlxuICogQHJldHVybnMgQWJzb2x1dGUgcGF0aCB0byB0aGUgYnVuZGxlZCBtYXJrZXRwbGFjZSBkaXJlY3RvcnkuXG4gKiBAdGhyb3dzIEVycm9yIGlmIEVYVEVOU0lPTl9QQVRIIGlzIG5vdCBzZXQuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiByZXNvbHZlTWFya2V0cGxhY2VQYXRoKCk6IHN0cmluZyB7XG4gIGNvbnN0IGV4dGVuc2lvblBhdGggPSBwcm9jZXNzLmVudltDQVJEU19FTlZfVkFSUy5FWFRFTlNJT05fUEFUSF07XG4gIGlmICghZXh0ZW5zaW9uUGF0aCkge1xuICAgIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyByZXF1aXJlZCBlbnZpcm9ubWVudCB2YXJpYWJsZTogJHtDQVJEU19FTlZfVkFSUy5FWFRFTlNJT05fUEFUSH1gKTtcbiAgfVxuICByZXR1cm4gcGF0aC5qb2luKGV4dGVuc2lvblBhdGgsICdkaXN0JywgJ21hcmtldHBsYWNlJyk7XG59XG5cbi8qKlxuICogQnVpbGRzIHRoZSBgLS1zZXR0aW5nc2AgSlNPTiB0aGF0IGVuYWJsZXMgdGhlIGBydW50aW1lYCBwbHVnaW4gYW5kIHJlZ2lzdGVyc1xuICogdGhlIGBjYXJkcy5tYW5hZ2VtZW50YCBtYXJrZXRwbGFjZSBzb3VyY2Ugc28gdGhlIHNwYXduZWQgYGNsYXVkZWAgcHJvY2Vzc1xuICogY2FuIHJlc29sdmUgdGhlIHBsdWdpbiBmcm9tIHRoZSBleHRlbnNpb24ncyBidW5kbGVkIG1hcmtldHBsYWNlLlxuICpcbiAqIFVzZXMgdGhlIG1hcmtldHBsYWNlIGJ1bmRsZWQgaW5zaWRlIHRoZSBleHRlbnNpb24gaW5zdGFsbCBkaXJlY3RvcnlcbiAqIChgPEVYVEVOU0lPTl9QQVRIPi9kaXN0L21hcmtldHBsYWNlYCkgc28gdGhlIHNwYXduZWQgc2Vzc2lvbiBhbHdheXMgbG9hZHMgdGhlXG4gKiBwbHVnaW4gdmVyc2lvbiB0aGF0IHNoaXBwZWQgd2l0aCB0aGUgZXh0ZW5zaW9uLCByZWdhcmRsZXNzIG9mIHdvcmt0cmVlIHN0YXRlLlxuICpcbiAqIEBwYXJhbSBtYXJrZXRwbGFjZVBhdGggLSBBYnNvbHV0ZSBwYXRoIHRvIHRoZSBidW5kbGVkIG1hcmtldHBsYWNlIGRpcmVjdG9yeS5cbiAqIEByZXR1cm5zIFNlcmlhbGlzZWQgc2V0dGluZ3MgSlNPTiBzdHJpbmcuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBidWlsZFBsdWdpblNldHRpbmdzKG1hcmtldHBsYWNlUGF0aDogc3RyaW5nKTogc3RyaW5nIHtcbiAgcmV0dXJuIEpTT04uc3RyaW5naWZ5KHtcbiAgICBlbmFibGVkUGx1Z2luczogeyAncnVudGltZUBjYXJkcy5tYW5hZ2VtZW50JzogdHJ1ZSB9LFxuICAgIGV4dHJhS25vd25NYXJrZXRwbGFjZXM6IHtcbiAgICAgICdjYXJkcy5tYW5hZ2VtZW50Jzoge1xuICAgICAgICBzb3VyY2U6IHsgc291cmNlOiAnZGlyZWN0b3J5JywgcGF0aDogbWFya2V0cGxhY2VQYXRoIH1cbiAgICAgIH1cbiAgICB9XG4gIH0pO1xufVxuXG4vKipcbiAqIEJ1aWxkcyB0aGUgQ0xJIGFyZ3VtZW50IGxpc3QgZm9yIHRoZSBgY2xhdWRlYCBwcm9jZXNzLlxuICpcbiAqIEBwYXJhbSBwcm9tcHQgLSBUaGUgcHJvbXB0IHN0cmluZyBmb3IgbmV3IHNlc3Npb25zLlxuICogQHBhcmFtIHNlc3Npb25JZCAtIFNlc3Npb24gaWRlbnRpZmllciAodXNlZCBmb3IgYC0tc2Vzc2lvbi1pZGAgb3IgYC0tcmVzdW1lYCkuXG4gKiBAcGFyYW0gcmVzdW1lIC0gV2hlbiB0cnVlLCBwYXNzZXMgYC0tcmVzdW1lYCBpbnN0ZWFkIG9mIHN0YXJ0aW5nIGEgbmV3IHNlc3Npb24uXG4gKiBAcGFyYW0gbW9kZSAtIEV4ZWN1dGlvbiBtb2RlOyBgJ2JhY2tncm91bmQnYCBhcHBlbmRzIGAtLXByaW50YC5cbiAqIEBwYXJhbSBjYXJkUmVwb1BhdGggLSBBYnNvbHV0ZSBwYXRoIHBhc3NlZCB2aWEgYC0tYWRkLWRpcmAuXG4gKiBAcGFyYW0gbWFya2V0cGxhY2VQYXRoIC0gQWJzb2x1dGUgcGF0aCB0byB0aGUgYnVuZGxlZCBtYXJrZXRwbGFjZSBkaXJlY3RvcnkuXG4gKiBAcmV0dXJucyBBcnJheSBvZiBDTEkgYXJndW1lbnRzLlxuICovXG5leHBvcnQgZnVuY3Rpb24gYnVpbGRBcmdzKFxuICBwcm9tcHQ6IHN0cmluZyxcbiAgc2Vzc2lvbklkOiBzdHJpbmcsXG4gIHJlc3VtZTogYm9vbGVhbixcbiAgbW9kZTogQWN0aW9uSW5wdXRbJ2V4ZWN1dGlvbk1vZGUnXSxcbiAgY2FyZFJlcG9QYXRoOiBzdHJpbmcsXG4gIG1hcmtldHBsYWNlUGF0aDogc3RyaW5nXG4pOiBzdHJpbmdbXSB7XG4gIGNvbnN0IGFyZ3M6IHN0cmluZ1tdID0gW107XG5cbiAgaWYgKHJlc3VtZSkge1xuICAgIGFyZ3MucHVzaCgnLS1yZXN1bWUnLCBzZXNzaW9uSWQpO1xuICB9IGVsc2Uge1xuICAgIGFyZ3MucHVzaChwcm9tcHQpO1xuICAgIGFyZ3MucHVzaCgnLS1zZXNzaW9uLWlkJywgc2Vzc2lvbklkKTtcbiAgfVxuICBhcmdzLnB1c2goJy0tc2V0dGluZ3MnLCBidWlsZFBsdWdpblNldHRpbmdzKG1hcmtldHBsYWNlUGF0aCkpO1xuICBhcmdzLnB1c2goJy0tYWRkLWRpcicsIGNhcmRSZXBvUGF0aCk7XG4gIGlmIChtb2RlID09PSAnYmFja2dyb3VuZCcpIHtcbiAgICBhcmdzLnB1c2goJy0tcHJpbnQnKTtcbiAgfVxuXG4gIHJldHVybiBhcmdzO1xufVxuXG4vKipcbiAqIEV4dHJhY3RzIHRoZSBjYXJkIElEIGZyb20gYSBgY2FyZHMvPGNhcmRJZD4vPG4+YCBicmFuY2ggbmFtZS5cbiAqXG4gKiBAcGFyYW0gYnJhbmNoTmFtZSAtIEJyYW5jaCBuYW1lIHRvIHBhcnNlLlxuICogQHJldHVybnMgVGhlIGNhcmQgSUQsIG9yIGBudWxsYCBpZiB0aGUgYnJhbmNoIGRvZXNuJ3QgbWF0Y2ggdGhlIHBhdHRlcm4uXG4gKi9cbmZ1bmN0aW9uIGNhcmRJZEZyb21CcmFuY2goYnJhbmNoTmFtZTogc3RyaW5nKTogc3RyaW5nIHwgbnVsbCB7XG4gIGNvbnN0IG1hdGNoID0gYnJhbmNoTmFtZS5tYXRjaCgvXmNhcmRzXFwvKC4rKVxcL1xcZCskLyk7XG4gIHJldHVybiBtYXRjaD8uWzFdID8/IG51bGw7XG59XG5cbi8qKlxuICogUmVzb2x2ZXMgdGhlIGJhc2UgYnJhbmNoIGZvciB0aGUgd29ya3NwYWNlLCBmb2xsb3dpbmcgdGhlIGBwYXJlbnRCcmFuY2hgXG4gKiBjaGFpbiB3aGVuIEhFQUQgaXMgYSBgY2FyZHMvKmAgd29ya3RyZWUgYnJhbmNoLlxuICpcbiAqIENhcmQgYnJhbmNoZXMgYXJlIGVwaGVtZXJhbCBhbmQgbm90IHZhbGlkIG1lcmdlIHRhcmdldHMuIFdoZW4gdGhlIHdvcmtzcGFjZVxuICogSEVBRCBoYXBwZW5zIHRvIGJlIG9uIG9uZSAoZS5nLiwgdGhlIG1haW4gY2hlY2tvdXQgd2FzIGxlZnQgb24gYSBjYXJkXG4gKiBicmFuY2gpLCB0aGlzIGZ1bmN0aW9uIHF1ZXJpZXMgdGhlIEFQSSBmb3IgdGhhdCBicmFuY2gncyBgcGFyZW50QnJhbmNoYFxuICogYW5kIHJlY3Vyc2VzIHVudGlsIGl0IGZpbmRzIGEgbm9uLWBjYXJkcy8qYCBicmFuY2guXG4gKlxuICogQHBhcmFtIHdvcmtzcGFjZVBhdGggLSBEaXJlY3Rvcnkgd2hlcmUgYGdpdCByZXYtcGFyc2VgIHJ1bnMuXG4gKiBAcGFyYW0gY2xpZW50IC0gQ2FyZHMgQVBJIGNsaWVudCBmb3IgcmVzb2x2aW5nIHBhcmVudEJyYW5jaCBvZiBjYXJkIGJyYW5jaGVzLlxuICogQHJldHVybnMgVGhlIGZpcnN0IG5vbi1gY2FyZHMvKmAgYnJhbmNoIGluIHRoZSBwYXJlbnQgY2hhaW4uXG4gKiBAdGhyb3dzIEVycm9yIGlmIHRoZSBwYXJlbnQgY2hhaW4gY2Fubm90IGJlIHJlc29sdmVkIChtaXNzaW5nIEFQSSByZWNvcmRzLCBjeWNsZXMpLlxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcmVzb2x2ZUJhc2VCcmFuY2god29ya3NwYWNlUGF0aDogc3RyaW5nLCBjbGllbnQ/OiBDYXJkc0NsaWVudCk6IFByb21pc2U8c3RyaW5nPiB7XG4gIGNvbnN0IHsgc3Rkb3V0IH0gPSBhd2FpdCBleGVjRmlsZUFzeW5jKCdnaXQnLCBbJ3Jldi1wYXJzZScsICctLWFiYnJldi1yZWYnLCAnSEVBRCddLCB7XG4gICAgY3dkOiB3b3Jrc3BhY2VQYXRoXG4gIH0pO1xuICBsZXQgYnJhbmNoID0gc3Rkb3V0LnRyaW0oKTtcblxuICBjb25zdCB2aXNpdGVkID0gbmV3IFNldDxzdHJpbmc+KCk7XG4gIHdoaWxlIChicmFuY2guc3RhcnRzV2l0aCgnY2FyZHMvJykpIHtcbiAgICBpZiAodmlzaXRlZC5oYXMoYnJhbmNoKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBDaXJjdWxhciBwYXJlbnRCcmFuY2ggY2hhaW4gZGV0ZWN0ZWQ6ICR7Wy4uLnZpc2l0ZWQsIGJyYW5jaF0uam9pbignIFx1MjE5MiAnKX1gKTtcbiAgICB9XG4gICAgdmlzaXRlZC5hZGQoYnJhbmNoKTtcblxuICAgIGNvbnN0IGNhcmRJZCA9IGNhcmRJZEZyb21CcmFuY2goYnJhbmNoKTtcbiAgICBpZiAoIWNhcmRJZCB8fCAhY2xpZW50KSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgIGBXb3Jrc3BhY2UgSEVBRCBpcyBvbiBjYXJkIGJyYW5jaCBcIiR7YnJhbmNofVwiIGJ1dCBjYW5ub3QgcmVzb2x2ZSBpdHMgcGFyZW50LiBgICtcbiAgICAgICAgICAnU3dpdGNoIHRoZSBtYWluIGNoZWNrb3V0IHRvIGEgbm9uLWNhcmQgYnJhbmNoIChlLmcuLCBtYWluKS4nXG4gICAgICApO1xuICAgIH1cblxuICAgIGNvbnN0IHsgYnJhbmNoZXMgfSA9IGF3YWl0IGNsaWVudC5nZXRCcmFuY2hlcyhjYXJkSWQsIHsgd29ya3NwYWNlUGF0aCB9KTtcbiAgICBjb25zdCByZWNvcmQgPSBicmFuY2hlcy5maW5kKChiKSA9PiBiLm5hbWUgPT09IGJyYW5jaCk7XG4gICAgaWYgKCFyZWNvcmQ/LnBhcmVudEJyYW5jaCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICBgQ2FyZCBicmFuY2ggXCIke2JyYW5jaH1cIiBoYXMgbm8gcGFyZW50QnJhbmNoIHJlY29yZC4gYCArXG4gICAgICAgICAgJ1N3aXRjaCB0aGUgbWFpbiBjaGVja291dCB0byBhIG5vbi1jYXJkIGJyYW5jaCAoZS5nLiwgbWFpbikuJ1xuICAgICAgKTtcbiAgICB9XG5cbiAgICBicmFuY2ggPSByZWNvcmQucGFyZW50QnJhbmNoO1xuICB9XG5cbiAgcmV0dXJuIGJyYW5jaDtcbn1cblxuLyoqXG4gKiBDaGVja3Mgd2hldGhlciBhIHdvcmt0cmVlIHBhdGggZXhpc3RzIG9uIGRpc2suXG4gKlxuICogQHBhcmFtIHdvcmt0cmVlUGF0aCAtIEFic29sdXRlIHBhdGggdG8gdGVzdC5cbiAqIEByZXR1cm5zIFRydWUgd2hlbiB0aGUgcGF0aCBpcyBhY2Nlc3NpYmxlLlxuICovXG5hc3luYyBmdW5jdGlvbiB3b3JrdHJlZUV4aXN0c09uRGlzayh3b3JrdHJlZVBhdGg6IHN0cmluZyk6IFByb21pc2U8Ym9vbGVhbj4ge1xuICB0cnkge1xuICAgIGF3YWl0IGZzLmFjY2Vzcyh3b3JrdHJlZVBhdGgpO1xuICAgIHJldHVybiB0cnVlO1xuICB9IGNhdGNoIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbn1cblxuLyoqXG4gKiBGaW5kcyBvciBjcmVhdGVzIGEgd29ya3RyZWUgZm9yIHRoZSBjYXJkLlxuICpcbiAqIFRyaWVzIHRvIHJldXNlIGFuIGV4aXN0aW5nIGJyYW5jaCB3aG9zZSB3b3JrdHJlZSBpcyBzdGlsbCBvbiBkaXNrLiBXaGVuIG5vXG4gKiB2YWxpZCBicmFuY2ggZXhpc3RzLCBjcmVhdGVzIGEgbmV3IG9uZSBhbmQgcmVnaXN0ZXJzIGl0IHdpdGggdGhlIEFQSS5cbiAqXG4gKiBAcGFyYW0gaW5wdXQgLSBBY3Rpb24gaW5wdXQgY29udGFpbmluZyBjYXJkSWQgYW5kIHdvcmtzcGFjZSBwYXRocy5cbiAqIEBwYXJhbSBjbGllbnQgLSBDYXJkcyBBUEkgY2xpZW50IGZvciBicmFuY2ggQ1JVRC5cbiAqIEBwYXJhbSBiYXNlQnJhbmNoIC0gQ3VycmVudCBicmFuY2ggaW4gdGhlIHdvcmtzcGFjZSAodXNlZCBhcyBwYXJlbnQpLlxuICogQHBhcmFtIGxvZ2dlciAtIExvZ2dlciBmb3IgZGlhZ25vc3RpYyBvdXRwdXQuXG4gKiBAcGFyYW0gc2Vzc2lvbklkIC0gQ2xhdWRlIENvZGUgc2Vzc2lvbiBJRCBmb3J3YXJkZWQgdG8gdGhlIEFQSSBzbyB0aGUgY2FyZCByZXBvIHBvc3QtY29tbWl0IGhvb2sgY2FuIGF0dHJpYnV0ZSB0aGUgY29tbWl0LlxuICogQHJldHVybnMgV29ya3RyZWUgcGF0aCwgYnJhbmNoIG5hbWUsIGFuZCBwYXJlbnQgYnJhbmNoIG5hbWUuXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiByZXNvbHZlT3JDcmVhdGVXb3JrdHJlZShcbiAgaW5wdXQ6IEFjdGlvbklucHV0LFxuICBjbGllbnQ6IENhcmRzQ2xpZW50LFxuICBiYXNlQnJhbmNoOiBzdHJpbmcsXG4gIGxvZ2dlcjogQWN0aW9uQ29udGV4dFsnbG9nZ2VyJ10sXG4gIHNlc3Npb25JZD86IHN0cmluZ1xuKTogUHJvbWlzZTx7IHdvcmt0cmVlUGF0aDogc3RyaW5nOyBicmFuY2hOYW1lOiBzdHJpbmc7IHBhcmVudEJyYW5jaDogc3RyaW5nIH0+IHtcbiAgY29uc3QgeyBicmFuY2hlcyB9ID0gYXdhaXQgY2xpZW50LmdldEJyYW5jaGVzKGlucHV0LmNhcmRJZCwgeyB3b3Jrc3BhY2VQYXRoOiBpbnB1dC5yZXBvUm9vdCB9KTtcblxuICAvLyBTdGVwIDE6IFRyeSB0byByZXVzZSBhbiBleGlzdGluZyBicmFuY2ggd2l0aCBhIHZhbGlkIHdvcmt0cmVlIG9uIGRpc2tcbiAgZm9yIChjb25zdCBicmFuY2ggb2YgYnJhbmNoZXMpIHtcbiAgICBpZiAoIWJyYW5jaC5leGlzdHMgfHwgIWJyYW5jaC53b3JrdHJlZSkgY29udGludWU7XG4gICAgaWYgKCEoYXdhaXQgd29ya3RyZWVFeGlzdHNPbkRpc2soYnJhbmNoLndvcmt0cmVlKSkpIGNvbnRpbnVlO1xuXG4gICAgbG9nZ2VyLmluZm8oJ1JldXNpbmcgZXhpc3Rpbmcgd29ya3RyZWUnLCB7IGJyYW5jaDogYnJhbmNoLm5hbWUsIHdvcmt0cmVlOiBicmFuY2gud29ya3RyZWUgfSk7XG4gICAgcmV0dXJuIHsgd29ya3RyZWVQYXRoOiBicmFuY2gud29ya3RyZWUsIGJyYW5jaE5hbWU6IGJyYW5jaC5uYW1lLCBwYXJlbnRCcmFuY2g6IGJyYW5jaC5wYXJlbnRCcmFuY2ggfTtcbiAgfVxuXG4gIC8vIFN0ZXAgMjogVHJ5IHRvIGNyZWF0ZSBhIHdvcmt0cmVlIGZvciBhbiBleGlzdGluZyBicmFuY2ggd2hvc2Ugd29ya3RyZWVcbiAgLy8gaXMgbWlzc2luZyBmcm9tIGRpc2sgKGUuZy4gY2xlYW5lZCB1cCBieSBhIHByZXZpb3VzIHNlc3Npb24gY3Jhc2gpLlxuICBmb3IgKGNvbnN0IGJyYW5jaCBvZiBicmFuY2hlcykge1xuICAgIGlmICghYnJhbmNoLmV4aXN0cykgY29udGludWU7XG4gICAgaWYgKCFicmFuY2gubmFtZS5zdGFydHNXaXRoKGBjYXJkcy8ke2lucHV0LmNhcmRJZH0vYCkpIGNvbnRpbnVlO1xuXG4gICAgbG9nZ2VyLmluZm8oJ1JlYXR0YWNoaW5nIHdvcmt0cmVlIGZvciBleGlzdGluZyBicmFuY2gnLCB7IGJyYW5jaDogYnJhbmNoLm5hbWUgfSk7XG4gICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgY3JlYXRlV29ya3RyZWUoYnJhbmNoLm5hbWUsIHsgY3dkOiBpbnB1dC5yZXBvUm9vdCB9KTtcblxuICAgIC8vIFVwZGF0ZSB0aGUgQVBJIHJlY29yZCB3aXRoIHRoZSBuZXcgd29ya3RyZWUgcGF0aFxuICAgIGF3YWl0IGNsaWVudC5hZGRCcmFuY2goXG4gICAgICBpbnB1dC5jYXJkSWQsXG4gICAgICB7IG5hbWU6IGJyYW5jaC5uYW1lLCB3b3JrdHJlZTogcmVzdWx0Lndvcmt0cmVlLCBwYXJlbnRCcmFuY2g6IGJyYW5jaC5wYXJlbnRCcmFuY2ggfSxcbiAgICAgIHsgc2Vzc2lvbklkIH1cbiAgICApO1xuXG4gICAgcmV0dXJuIHsgd29ya3RyZWVQYXRoOiByZXN1bHQud29ya3RyZWUsIGJyYW5jaE5hbWU6IGJyYW5jaC5uYW1lLCBwYXJlbnRCcmFuY2g6IGJyYW5jaC5wYXJlbnRCcmFuY2ggfTtcbiAgfVxuXG4gIC8vIFN0ZXAgMzogTm8gdmFsaWQgZXhpc3RpbmcgYnJhbmNoIFx1MjAxNCBjcmVhdGUgbmV3IG9uZS5cbiAgLy8gVGhlIEFQSSBtYXkgYmUgb3V0IG9mIHN5bmMgd2l0aCBnaXQgKGUuZy4gYSBwcmV2aW91cyB3b3JrdHJlZSB3YXMgY3JlYXRlZFxuICAvLyBidXQgbmV2ZXIgcmVnaXN0ZXJlZCwgb3IgaXRzIEFQSSByZWNvcmQgd2FzIGRlbGV0ZWQpLiBUbyBhdm9pZCBjb2xsaWRpbmdcbiAgLy8gd2l0aCB3b3JrdHJlZXMgZ2l0IGFscmVhZHkga25vd3MgYWJvdXQsIHByb2JlIGdpdCdzIGFjdHVhbCBzdGF0ZSBhbmRcbiAgLy8gaW5jcmVtZW50IHBhc3QgYW55IG9jY3VwaWVkIHNsb3RzLlxuICBjb25zdCBwcmVmaXggPSBgY2FyZHMvJHtpbnB1dC5jYXJkSWR9L2A7XG4gIGNvbnN0IGV4aXN0aW5nTnVtYmVycyA9IGJyYW5jaGVzXG4gICAgLmZpbHRlcigoYikgPT4gYi5uYW1lLnN0YXJ0c1dpdGgocHJlZml4KSlcbiAgICAubWFwKChiKSA9PiBwYXJzZUludChiLm5hbWUuc2xpY2UocHJlZml4Lmxlbmd0aCksIDEwKSlcbiAgICAuZmlsdGVyKChuKSA9PiAhTnVtYmVyLmlzTmFOKG4pKTtcbiAgbGV0IG5leHROdW1iZXIgPSBleGlzdGluZ051bWJlcnMubGVuZ3RoID4gMCA/IE1hdGgubWF4KC4uLmV4aXN0aW5nTnVtYmVycykgKyAxIDogMTtcblxuICBjb25zdCB7IHJlcG9Sb290IH0gPSBhd2FpdCBmaW5kR2l0Um9vdHMoaW5wdXQucmVwb1Jvb3QpO1xuICB3aGlsZSAoYXdhaXQgY2hlY2tXb3JrdHJlZUV4aXN0cyhyZXBvUm9vdCwgcGF0aC5qb2luKHJlcG9Sb290LCAnLndvcmt0cmVlcycsIGAke3ByZWZpeH0ke25leHROdW1iZXJ9YCkpKSB7XG4gICAgbG9nZ2VyLndhcm4oJ1dvcmt0cmVlIGFscmVhZHkgZXhpc3RzIGluIGdpdCBidXQgbm90IGluIEFQSSwgc2tpcHBpbmcnLCB7XG4gICAgICBicmFuY2g6IGAke3ByZWZpeH0ke25leHROdW1iZXJ9YFxuICAgIH0pO1xuICAgIG5leHROdW1iZXIrKztcbiAgfVxuXG4gIGNvbnN0IGJyYW5jaE5hbWUgPSBgJHtwcmVmaXh9JHtuZXh0TnVtYmVyfWA7XG4gIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGNyZWF0ZVdvcmt0cmVlKGJyYW5jaE5hbWUsIHsgY3dkOiBpbnB1dC5yZXBvUm9vdCB9KTtcbiAgYXdhaXQgY2xpZW50LmFkZEJyYW5jaChcbiAgICBpbnB1dC5jYXJkSWQsXG4gICAgeyBuYW1lOiBicmFuY2hOYW1lLCB3b3JrdHJlZTogcmVzdWx0Lndvcmt0cmVlLCBwYXJlbnRCcmFuY2g6IGJhc2VCcmFuY2ggfSxcbiAgICB7IHNlc3Npb25JZCB9XG4gICk7XG5cbiAgbG9nZ2VyLmluZm8oJ0NyZWF0ZWQgbmV3IHdvcmt0cmVlJywgeyBicmFuY2g6IGJyYW5jaE5hbWUsIHdvcmt0cmVlOiByZXN1bHQud29ya3RyZWUgfSk7XG4gIHJldHVybiB7IHdvcmt0cmVlUGF0aDogcmVzdWx0Lndvcmt0cmVlLCBicmFuY2hOYW1lLCBwYXJlbnRCcmFuY2g6IGJhc2VCcmFuY2ggfTtcbn1cblxuLyoqXG4gKiBSdW5zIGEgc2luZ2xlIGNsZWFudXAgc3RlcCwgbG9nZ2luZyBhIHdhcm5pbmcgb24gZmFpbHVyZSByYXRoZXIgdGhhblxuICogYWJvcnRpbmcgdGhlIHN3ZWVwLiBFYWNoIHN0ZXAgKHdvcmt0cmVlIHJlbW92YWwsIGJyYW5jaCBkZWxldGlvbiwgQVBJXG4gKiByZWNvcmQgcmVtb3ZhbCkgaXMgaW5kZXBlbmRlbnQgXHUyMDE0IGEgZmFpbHVyZSBpbiBvbmUgbXVzdCBub3QgcHJldmVudCB0aGVcbiAqIG90aGVycyBmcm9tIHJ1bm5pbmcuXG4gKlxuICogQHBhcmFtIHN0ZXAgLSBBc3luYyBvcGVyYXRpb24gdG8gYXR0ZW1wdC5cbiAqIEBwYXJhbSBsYWJlbCAtIEh1bWFuLXJlYWRhYmxlIGxhYmVsIGxvZ2dlZCBvbiBmYWlsdXJlLlxuICogQHBhcmFtIGJyYW5jaE5hbWUgLSBCcmFuY2ggbmFtZSBpbmNsdWRlZCBpbiBkaWFnbm9zdGljIG91dHB1dC5cbiAqIEBwYXJhbSBsb2dnZXIgLSBMb2dnZXIgZm9yIGRpYWdub3N0aWMgb3V0cHV0LlxuICovXG5hc3luYyBmdW5jdGlvbiB0cnlDbGVhbnVwU3RlcChcbiAgc3RlcDogKCkgPT4gUHJvbWlzZTx1bmtub3duPixcbiAgbGFiZWw6IHN0cmluZyxcbiAgYnJhbmNoTmFtZTogc3RyaW5nLFxuICBsb2dnZXI6IEFjdGlvbkNvbnRleHRbJ2xvZ2dlciddXG4pOiBQcm9taXNlPHZvaWQ+IHtcbiAgdHJ5IHtcbiAgICBhd2FpdCBzdGVwKCk7XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgbG9nZ2VyLndhcm4obGFiZWwsIHsgYnJhbmNoOiBicmFuY2hOYW1lLCBlcnJvcjogZXJyb3JNZXNzYWdlKGVycm9yKSB9KTtcbiAgfVxufVxuXG4vKipcbiAqIFJlbW92ZXMgYnJhbmNoZXMgdGhhdCBhcmUgZnVsbHkgbWVyZ2VkIGludG8gdGhlaXIgcGFyZW50IGJyYW5jaC5cbiAqXG4gKiBGb3IgZWFjaCBtZXJnZWQgYnJhbmNoIHRoZSB3b3JrdHJlZSBkaXJlY3RvcnkgaXMgcmVtb3ZlZCwgdGhlIGxvY2FsIGJyYW5jaFxuICogcmVmIGlzIGRlbGV0ZWQsIGFuZCB0aGUgYnJhbmNoIHJlY29yZCBpcyByZW1vdmVkIGZyb20gdGhlIEFQSS4gV29ya3RyZWVcbiAqIHJlbW92YWwgZmFpbHVyZXMgYXJlIGxvZ2dlZCBhbmQgZG8gbm90IGJsb2NrIGJyYW5jaCBkZWxldGlvbi4gSG93ZXZlciwgdGhlXG4gKiBBUEkgcmVjb3JkIGlzIG9ubHkgcmVtb3ZlZCBhZnRlciBjb25maXJtaW5nIHRoZSBnaXQgYnJhbmNoIHdhcyBkZWxldGVkIFx1MjAxNFxuICogcmVtb3ZpbmcgdGhlIHJlY29yZCB3aGlsZSB0aGUgYnJhbmNoIHN0aWxsIGV4aXN0cyB3b3VsZCBjYXVzZSBzdWJzZXF1ZW50XG4gKiBzZXNzaW9ucyB0byBsb3NlIHRyYWNrIG9mIGl0IGFuZCBjcmVhdGUgZHVwbGljYXRlcy5cbiAqXG4gKiBFYWNoIGJyYW5jaCBpcyBjaGVja2VkIGFnYWluc3QgaXRzIG93biBgcGFyZW50QnJhbmNoYCAodGhlIGJyYW5jaCBpdCB3YXNcbiAqIGNyZWF0ZWQgZnJvbSksIG5vdCB0aGUgd29ya3NwYWNlJ3MgY3VycmVudCBIRUFELiBUaGlzIGVuc3VyZXMgYnJhbmNoZXMgYXJlXG4gKiBvbmx5IGNsZWFuZWQgdXAgd2hlbiB0cnVseSBtZXJnZWQgaW50byB0aGVpciBpbnRlbmRlZCB0YXJnZXQuXG4gKlxuICogQHBhcmFtIGlucHV0IC0gQWN0aW9uIGlucHV0IGNvbnRhaW5pbmcgY2FyZElkIGFuZCB3b3Jrc3BhY2UgcGF0aHMuXG4gKiBAcGFyYW0gY2xpZW50IC0gQ2FyZHMgQVBJIGNsaWVudCBmb3IgYnJhbmNoIHJlbW92YWwuXG4gKiBAcGFyYW0gbG9nZ2VyIC0gTG9nZ2VyIGZvciBkaWFnbm9zdGljIG91dHB1dC5cbiAqIEBwYXJhbSBzZXNzaW9uSWQgLSBDbGF1ZGUgQ29kZSBzZXNzaW9uIElEIGZvcndhcmRlZCB0byB0aGUgQVBJIHNvIHRoZSBjYXJkIHJlcG8gcG9zdC1jb21taXQgaG9vayBjYW4gYXR0cmlidXRlIHRoZSBjb21taXQuXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBjbGVhbnVwTWVyZ2VkQnJhbmNoZXMoXG4gIGlucHV0OiBBY3Rpb25JbnB1dCxcbiAgY2xpZW50OiBDYXJkc0NsaWVudCxcbiAgbG9nZ2VyOiBBY3Rpb25Db250ZXh0Wydsb2dnZXInXSxcbiAgc2Vzc2lvbklkPzogc3RyaW5nXG4pOiBQcm9taXNlPHZvaWQ+IHtcbiAgbGV0IHQwID0gcGVyZm9ybWFuY2Uubm93KCk7XG4gIGNvbnN0IHsgYnJhbmNoZXMgfSA9IGF3YWl0IGNsaWVudC5nZXRCcmFuY2hlcyhpbnB1dC5jYXJkSWQsIHsgd29ya3NwYWNlUGF0aDogaW5wdXQucmVwb1Jvb3QgfSk7XG4gIGxvZ2dlci5kZWJ1ZygnZ2V0QnJhbmNoZXMgY29tcGxldGVkJywge1xuICAgIGNhcmRJZDogaW5wdXQuY2FyZElkLFxuICAgIGJyYW5jaENvdW50OiBicmFuY2hlcy5sZW5ndGgsXG4gICAgZWxhcHNlZE1zOiBNYXRoLnJvdW5kKHBlcmZvcm1hbmNlLm5vdygpIC0gdDApXG4gIH0pO1xuXG4gIGZvciAoY29uc3QgYnJhbmNoIG9mIGJyYW5jaGVzKSB7XG4gICAgaWYgKCFicmFuY2guZXhpc3RzKSBjb250aW51ZTtcblxuICAgIC8vIFNlbGYtcmVmZXJlbnRpYWwgcGFyZW50QnJhbmNoIGlzIGEgY29ycnVwdCBzdGF0ZSBcdTIwMTQgYG1lcmdlLWJhc2UgLS1pcy1hbmNlc3RvciBYIFhgXG4gICAgLy8gdHJpdmlhbGx5IHN1Y2NlZWRzLCBzbyBjbGVhbnVwIHdvdWxkIGluY29ycmVjdGx5IHJlbW92ZSB1bm1lcmdlZCB3b3JrLlxuICAgIGlmIChicmFuY2gucGFyZW50QnJhbmNoID09PSBicmFuY2gubmFtZSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICBgQnJhbmNoIFwiJHticmFuY2gubmFtZX1cIiBoYXMgc2VsZi1yZWZlcmVudGlhbCBwYXJlbnRCcmFuY2ggXHUyMDE0IHJlZnVzaW5nIHRvIHJ1biBjbGVhbnVwLiBgICtcbiAgICAgICAgICAnVGhpcyBpcyBhIGRhdGEgY29ycnVwdGlvbiBidWc6IGEgYnJhbmNoIGNhbm5vdCBiZSBpdHMgb3duIHBhcmVudC4nXG4gICAgICApO1xuICAgIH1cblxuICAgIHQwID0gcGVyZm9ybWFuY2Uubm93KCk7XG4gICAgdHJ5IHtcbiAgICAgIC8vIG1lcmdlLWJhc2UgLS1pcy1hbmNlc3RvciBleGl0cyBub24temVybyB3aGVuIE5PVCBhbiBhbmNlc3RvciAobm90IG1lcmdlZCkuXG4gICAgICAvLyBDaGVjayBhZ2FpbnN0IHRoZSBicmFuY2gncyBvd24gcGFyZW50QnJhbmNoLCBub3QgdGhlIHdvcmtzcGFjZSBIRUFELlxuICAgICAgYXdhaXQgZXhlY0ZpbGVBc3luYygnZ2l0JywgWydtZXJnZS1iYXNlJywgJy0taXMtYW5jZXN0b3InLCBicmFuY2gubmFtZSwgYnJhbmNoLnBhcmVudEJyYW5jaF0sIHtcbiAgICAgICAgY3dkOiBpbnB1dC5yZXBvUm9vdFxuICAgICAgfSk7XG4gICAgfSBjYXRjaCB7XG4gICAgICAvLyBFeHBlY3RlZCBmb3IgdW5tZXJnZWQgYnJhbmNoZXMgXHUyMDE0IHNraXAgY2xlYW51cFxuICAgICAgbG9nZ2VyLmRlYnVnKCdCcmFuY2ggbm90IG1lcmdlZCwgc2tpcHBpbmcgY2xlYW51cCcsIHtcbiAgICAgICAgYnJhbmNoOiBicmFuY2gubmFtZSxcbiAgICAgICAgZWxhcHNlZE1zOiBNYXRoLnJvdW5kKHBlcmZvcm1hbmNlLm5vdygpIC0gdDApXG4gICAgICB9KTtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cbiAgICBsb2dnZXIuZGVidWcoJ21lcmdlLWJhc2UgY2hlY2sgY29tcGxldGVkIChtZXJnZWQpJywge1xuICAgICAgYnJhbmNoOiBicmFuY2gubmFtZSxcbiAgICAgIGVsYXBzZWRNczogTWF0aC5yb3VuZChwZXJmb3JtYW5jZS5ub3coKSAtIHQwKVxuICAgIH0pO1xuXG4gICAgLy8gQnJhbmNoIGlzIG1lcmdlZCBcdTIwMTQgY2xlYW4gdXAgd29ya3RyZWUsIGJyYW5jaCByZWYsIGFuZCBBUEkgcmVjb3JkXG4gICAgaWYgKGJyYW5jaC53b3JrdHJlZSkge1xuICAgICAgdDAgPSBwZXJmb3JtYW5jZS5ub3coKTtcbiAgICAgIGF3YWl0IHRyeUNsZWFudXBTdGVwKFxuICAgICAgICAoKSA9PiBleGVjRmlsZUFzeW5jKCdnaXQnLCBbJ3dvcmt0cmVlJywgJ3JlbW92ZScsIGJyYW5jaC53b3JrdHJlZSFdLCB7IGN3ZDogaW5wdXQucmVwb1Jvb3QgfSksXG4gICAgICAgICdGYWlsZWQgdG8gcmVtb3ZlIHdvcmt0cmVlJyxcbiAgICAgICAgYnJhbmNoLm5hbWUsXG4gICAgICAgIGxvZ2dlclxuICAgICAgKTtcbiAgICAgIGxvZ2dlci5kZWJ1ZygnV29ya3RyZWUgcmVtb3ZhbCBjb21wbGV0ZWQnLCB7XG4gICAgICAgIGJyYW5jaDogYnJhbmNoLm5hbWUsXG4gICAgICAgIGVsYXBzZWRNczogTWF0aC5yb3VuZChwZXJmb3JtYW5jZS5ub3coKSAtIHQwKVxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgdDAgPSBwZXJmb3JtYW5jZS5ub3coKTtcbiAgICBsZXQgYnJhbmNoRGVsZXRlZCA9IGZhbHNlO1xuICAgIHRyeSB7XG4gICAgICBhd2FpdCBleGVjRmlsZUFzeW5jKCdnaXQnLCBbJ2JyYW5jaCcsICctZCcsIGJyYW5jaC5uYW1lXSwgeyBjd2Q6IGlucHV0LnJlcG9Sb290IH0pO1xuICAgICAgYnJhbmNoRGVsZXRlZCA9IHRydWU7XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIGxvZ2dlci53YXJuKCdGYWlsZWQgdG8gZGVsZXRlIGJyYW5jaCcsIHsgYnJhbmNoOiBicmFuY2gubmFtZSwgZXJyb3I6IGVycm9yTWVzc2FnZShlcnJvcikgfSk7XG4gICAgfVxuICAgIGxvZ2dlci5kZWJ1ZygnQnJhbmNoIGRlbGV0aW9uIGNvbXBsZXRlZCcsIHtcbiAgICAgIGJyYW5jaDogYnJhbmNoLm5hbWUsXG4gICAgICBicmFuY2hEZWxldGVkLFxuICAgICAgZWxhcHNlZE1zOiBNYXRoLnJvdW5kKHBlcmZvcm1hbmNlLm5vdygpIC0gdDApXG4gICAgfSk7XG5cbiAgICBpZiAoYnJhbmNoRGVsZXRlZCkge1xuICAgICAgdDAgPSBwZXJmb3JtYW5jZS5ub3coKTtcbiAgICAgIGF3YWl0IHRyeUNsZWFudXBTdGVwKFxuICAgICAgICAoKSA9PiBjbGllbnQucmVtb3ZlQnJhbmNoKGlucHV0LmNhcmRJZCwgYnJhbmNoLm5hbWUsIHsgc2Vzc2lvbklkIH0pLFxuICAgICAgICAnRmFpbGVkIHRvIHJlbW92ZSBicmFuY2ggZnJvbSBBUEknLFxuICAgICAgICBicmFuY2gubmFtZSxcbiAgICAgICAgbG9nZ2VyXG4gICAgICApO1xuICAgICAgbG9nZ2VyLmRlYnVnKCdBUEkgYnJhbmNoIHJlbW92YWwgY29tcGxldGVkJywge1xuICAgICAgICBicmFuY2g6IGJyYW5jaC5uYW1lLFxuICAgICAgICBlbGFwc2VkTXM6IE1hdGgucm91bmQocGVyZm9ybWFuY2Uubm93KCkgLSB0MClcbiAgICAgIH0pO1xuXG4gICAgICBsb2dnZXIuaW5mbygnQ2xlYW5lZCB1cCBtZXJnZWQgYnJhbmNoJywgeyBicmFuY2g6IGJyYW5jaC5uYW1lIH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICBsb2dnZXIuaW5mbygnU2tpcHBlZCBBUEkgcmVjb3JkIHJlbW92YWwgXHUyMDE0IGdpdCBicmFuY2ggc3RpbGwgZXhpc3RzJywgeyBicmFuY2g6IGJyYW5jaC5uYW1lIH0pO1xuICAgIH1cbiAgfVxufVxuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBVbmlmaWVkIHNlc3Npb24gc3Bhd25lclxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4vKipcbiAqIE9wdGlvbnMgZm9yIHtAbGluayBzcGF3bkNsYXVkZVNlc3Npb259LlxuICpcbiAqIEFjdGlvbnMgcHJvdmlkZSB0aGUgdmFyaWFibGUgcGFydHMgKHByb21wdCwgc2Vzc2lvbiBpZGVudGl0eSwgc3dpdGNoLXRvLVxuICogaW50ZXJhY3RpdmUgc3VwcG9ydCk7IHRoZSBoZWxwZXIgaGFuZGxlcyBldmVyeXRoaW5nIGVsc2U6IHdvcmt0cmVlXG4gKiByZXNvbHV0aW9uLCBtYXJrZXRwbGFjZSByZWdpc3RyYXRpb24sIGVudiBjb25zdHJ1Y3Rpb24sIHNwYXduLCBsaWZlY3ljbGVcbiAqIGNhbGxiYWNrcywgYW5kIHBvc3QtZXhpdCBicmFuY2ggY2xlYW51cC5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBDbGF1ZGVTZXNzaW9uT3B0aW9ucyB7XG4gIC8qKiBQcm9tcHQgc3RyaW5nIHBhc3NlZCB0byB0aGUgQ2xhdWRlIENMSS4gKi9cbiAgcHJvbXB0OiBzdHJpbmc7XG4gIC8qKiBTZXNzaW9uIGlkZW50aWZpZXIgKHVzZWQgZm9yIGAtLXNlc3Npb24taWRgIG9yIGAtLXJlc3VtZWApLiAqL1xuICBzZXNzaW9uSWQ6IHN0cmluZztcbiAgLyoqIFdoZW4gdHJ1ZSwgcGFzc2VzIGAtLXJlc3VtZWAgaW5zdGVhZCBvZiBzdGFydGluZyBhIG5ldyBzZXNzaW9uLiAqL1xuICByZXN1bWU6IGJvb2xlYW47XG4gIC8qKlxuICAgKiBXaGVuIHRydWUsIHJlZ2lzdGVycyB7QGxpbmsgQWN0aW9uQ29udGV4dC5vblN3aXRjaFRvSW50ZXJhY3RpdmV9IHNvXG4gICAqIGJhY2tncm91bmQtbW9kZSBzZXNzaW9ucyBjYW4gYmUgcHJvbW90ZWQgdG8gaW50ZXJhY3RpdmUuXG4gICAqL1xuICBzdXBwb3J0c1N3aXRjaFRvSW50ZXJhY3RpdmU6IGJvb2xlYW47XG59XG5cbi8qKlxuICogU3Bhd25zIGEgYGNsYXVkZWAgQ0xJIHNlc3Npb24gd2l0aCBmdWxsIHdvcmt0cmVlLCBtYXJrZXRwbGFjZSwgYW5kXG4gKiBsaWZlY3ljbGUgbWFuYWdlbWVudC5cbiAqXG4gKiBDZW50cmFsaXNlcyB0aGUgc3Bhd24gbG9naWMgc2hhcmVkIGJ5IHRoZSBgbGF1bmNoYCBhbmQgYGludGVydmlld2BcbiAqIGFjdGlvbnMgc28gZW52aXJvbm1lbnQgdmFyaWFibGUgY29uc3RydWN0aW9uLCB3b3JrdHJlZSByZXNvbHV0aW9uLFxuICogbWFya2V0cGxhY2UgcmVnaXN0cmF0aW9uLCBhbmQgcG9zdC1leGl0IGNsZWFudXAgY2Fubm90IGRyaWZ0IGJldHdlZW5cbiAqIGNhbGxlcnMuXG4gKlxuICogU3RlcHM6XG4gKiAxLiBDcmVhdGUge0BsaW5rIENhcmRzQ2xpZW50fVxuICogMi4gUmVzb2x2ZSBiYXNlIGJyYW5jaCBhbmQgd29ya3RyZWVcbiAqIDMuIFJlZ2lzdGVyIG1hcmtldHBsYWNlXG4gKiA0LiBCdWlsZCBDTEkgYXJncyBhbmQgc3Bhd24gYGNsYXVkZWBcbiAqIDUuIFdpcmUgb25DYW5jZWwgKGFuZCBvcHRpb25hbGx5IG9uU3dpdGNoVG9JbnRlcmFjdGl2ZSlcbiAqIDYuIENhcHR1cmUgc3RkZXJyIGluIGJhY2tncm91bmQgbW9kZVxuICogNy4gQXdhaXQgcHJvY2VzcyBleGl0XG4gKiA4LiBDbGVhbiB1cCBmdWxseS1tZXJnZWQgYnJhbmNoZXMgKGJhY2tncm91bmQgbW9kZSBvbmx5OyBpbiBpbnRlcmFjdGl2ZVxuICogICAgbW9kZSB0aGUgd2F0Y2hlciBhbmQgZXh0ZW5zaW9uIGhhbmRsZSBjbGVhbnVwIGFmdGVyIHRoZSBhY3Rpb24gZXhpdHMpXG4gKlxuICogQHBhcmFtIGlucHV0IC0gUGFyc2VkIGFjdGlvbiBpbnB1dCBmcm9tIHRoZSBlbnZpcm9ubWVudC5cbiAqIEBwYXJhbSBjb250ZXh0IC0gQWN0aW9uIGNvbnRleHQgcHJvdmlkaW5nIGxvZ2dlciBhbmQgbGlmZWN5Y2xlIGhvb2tzLlxuICogQHBhcmFtIG9wdGlvbnMgLSBTZXNzaW9uLXNwZWNpZmljIHBhcmFtZXRlcnMgKHByb21wdCwgc2Vzc2lvbiBJRCwgZXRjLikuXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBzcGF3bkNsYXVkZVNlc3Npb24oXG4gIGlucHV0OiBBY3Rpb25JbnB1dCxcbiAgY29udGV4dDogQWN0aW9uQ29udGV4dCxcbiAgb3B0aW9uczogQ2xhdWRlU2Vzc2lvbk9wdGlvbnNcbik6IFByb21pc2U8dm9pZD4ge1xuICBjb25zdCB7IHByb21wdCwgc2Vzc2lvbklkLCByZXN1bWUsIHN1cHBvcnRzU3dpdGNoVG9JbnRlcmFjdGl2ZSB9ID0gb3B0aW9ucztcblxuICBjb250ZXh0LmxvZ2dlci5pbmZvKGAke2lucHV0LmFjdGlvbk5hbWV9IGFjdGlvbiBzdGFydGVkYCwge1xuICAgIGNhcmRJZDogaW5wdXQuY2FyZElkLFxuICAgIGVudmlyb25tZW50OiBpbnB1dC5lbnZpcm9ubWVudCxcbiAgICBleGVjdXRpb25Nb2RlOiBpbnB1dC5leGVjdXRpb25Nb2RlLFxuICAgIHNlc3Npb25JZFxuICB9KTtcblxuICBjb25zdCBjbGllbnQgPSBuZXcgQ2FyZHNDbGllbnQoe1xuICAgIGJhc2VVcmw6IGlucHV0LmFwaUJhc2VVcmwsXG4gICAgYWNjZXNzVG9rZW46IGlucHV0LmFwaUFjY2Vzc1Rva2VuXG4gIH0pO1xuXG4gIGNvbnN0IGJhc2VCcmFuY2ggPSBhd2FpdCByZXNvbHZlQmFzZUJyYW5jaChpbnB1dC5yZXBvUm9vdCwgY2xpZW50KTtcblxuICBjb25zdCB3b3JrdHJlZVJlc3VsdCA9IGF3YWl0IHJlc29sdmVPckNyZWF0ZVdvcmt0cmVlKGlucHV0LCBjbGllbnQsIGJhc2VCcmFuY2gsIGNvbnRleHQubG9nZ2VyLCBzZXNzaW9uSWQpO1xuXG4gIGNvbnN0IHsgd29ya3RyZWVQYXRoOiBjd2QsIGJyYW5jaE5hbWUsIHBhcmVudEJyYW5jaCB9ID0gd29ya3RyZWVSZXN1bHQ7XG4gIGNvbnRleHQubG9nZ2VyLmluZm8oJ1VzaW5nIHdvcmt0cmVlJywgeyBjd2QsIGJyYW5jaDogYnJhbmNoTmFtZSwgYmFzZUJyYW5jaCwgcGFyZW50QnJhbmNoIH0pO1xuXG4gIGNvbnN0IG1hcmtldHBsYWNlUGF0aCA9IHJlc29sdmVNYXJrZXRwbGFjZVBhdGgoKTtcbiAgYXdhaXQgdXBkYXRlTWFya2V0cGxhY2VSZWdpc3RyYXRpb24obWFya2V0cGxhY2VQYXRoLCBjb250ZXh0LmxvZ2dlcik7XG5cbiAgY29uc3QgYXJncyA9IGJ1aWxkQXJncyhwcm9tcHQsIHNlc3Npb25JZCwgcmVzdW1lLCBpbnB1dC5leGVjdXRpb25Nb2RlLCBpbnB1dC5jYXJkUmVwb1BhdGgsIG1hcmtldHBsYWNlUGF0aCk7XG4gIGNvbnN0IGlzSW50ZXJhY3RpdmUgPSBpbnB1dC5leGVjdXRpb25Nb2RlID09PSAnaW50ZXJhY3RpdmUnO1xuXG4gIGNvbnN0IGNoaWxkOiBDaGlsZFByb2Nlc3MgPSBzcGF3bignY2xhdWRlJywgYXJncywge1xuICAgIGN3ZCxcbiAgICBzdGRpbzogaXNJbnRlcmFjdGl2ZSA/ICdpbmhlcml0JyA6IFsnaWdub3JlJywgJ2lnbm9yZScsICdwaXBlJ10sXG4gICAgZW52OiB7XG4gICAgICAuLi5wcm9jZXNzLmVudixcbiAgICAgIFdPUktTUEFDRV9QQVRIOiBjd2QsXG4gICAgICBDTEFVREVfQ09ERV9UQVNLX0xJU1RfSUQ6IGBjYXJkcy1leHRlbnNpb24tJHtpbnB1dC5jYXJkSWR9YCxcbiAgICAgIENMQVVERV9DT0RFX0VYUEVSSU1FTlRBTF9BR0VOVF9URUFNUzogJzEnLFxuICAgICAgQkFTRV9CUkFOQ0g6IGJhc2VCcmFuY2gsXG4gICAgICBQQVJFTlRfQlJBTkNIOiBwYXJlbnRCcmFuY2gsXG4gICAgICBXT1JLU1BBQ0VfQlJBTkNIOiBicmFuY2hOYW1lXG4gICAgfVxuICB9KTtcblxuICBjb250ZXh0Lm9uQ2FuY2VsKCgpID0+IHtcbiAgICBjb250ZXh0LmxvZ2dlci5pbmZvKGAke2lucHV0LmFjdGlvbk5hbWV9IGFjdGlvbiBjYW5jZWxsZWQsIHRlcm1pbmF0aW5nIGNsYXVkZWAsIHsgc2Vzc2lvbklkIH0pO1xuICAgIGNoaWxkLmtpbGwoJ1NJR1RFUk0nKTtcbiAgfSk7XG5cbiAgaWYgKHN1cHBvcnRzU3dpdGNoVG9JbnRlcmFjdGl2ZSkge1xuICAgIGNvbnRleHQub25Td2l0Y2hUb0ludGVyYWN0aXZlKCgpID0+IHtcbiAgICAgIGNvbnRleHQubG9nZ2VyLmluZm8oJ1N3aXRjaGluZyB0byBpbnRlcmFjdGl2ZSBtb2RlJywgeyBzZXNzaW9uSWQgfSk7XG4gICAgICBjaGlsZC5raWxsKCdTSUdURVJNJyk7XG4gICAgICByZXR1cm4geyBzZXNzaW9uSWQgfTtcbiAgICB9KTtcbiAgfVxuXG4gIC8vIEJhY2tncm91bmQgbW9kZTogY2FwdHVyZSBzdGRlcnIgZm9yIGRpYWdub3N0aWMgbG9nZ2luZ1xuICBpZiAoIWlzSW50ZXJhY3RpdmUpIHtcbiAgICBjaGlsZC5zdGRlcnI/Lm9uKCdkYXRhJywgKGNodW5rOiBCdWZmZXIpID0+IHtcbiAgICAgIGNvbnN0IHRleHQgPSBjaHVuay50b1N0cmluZygpLnRyaW0oKTtcbiAgICAgIGlmICh0ZXh0KSB7XG4gICAgICAgIGNvbnRleHQubG9nZ2VyLndhcm4odGV4dCk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICBjb25zdCBleGl0Q29kZSA9IGF3YWl0IG5ldyBQcm9taXNlPG51bWJlciB8IG51bGw+KChyZXNvbHZlKSA9PiB7XG4gICAgY2hpbGQub24oJ2Nsb3NlJywgcmVzb2x2ZSk7XG4gIH0pO1xuXG4gIGNvbnRleHQubG9nZ2VyLmluZm8oYCR7aW5wdXQuYWN0aW9uTmFtZX0gYWN0aW9uIGNvbXBsZXRlZGAsIHsgc2Vzc2lvbklkLCBleGl0Q29kZSB9KTtcblxuICAvLyBQb3N0LWV4aXQgY2xlYW51cDogcmVtb3ZlIGZ1bGx5LW1lcmdlZCBicmFuY2hlcy5cbiAgLy8gSW4gYmFja2dyb3VuZCBtb2RlIHRoZXJlIGlzIG5vIHdhdGNoZXIsIHNvIHdlIHJ1biBjbGVhbnVwIGlubGluZS5cbiAgLy8gSW4gaW50ZXJhY3RpdmUgbW9kZSB3ZSBzcGF3biBhIGRldGFjaGVkIHByb2Nlc3Mgc28gdGhlIHRlcm1pbmFsIGNsb3Nlc1xuICAvLyBpbW1lZGlhdGVseSBcdTIwMTQgdGhlIHdhdGNoZXIgY2FsbHMgdGhlIHNhbWUgY2xlYW51cE1lcmdlZEJyYW5jaGVzIGZ1bmN0aW9uLlxuICBpZiAoaXNJbnRlcmFjdGl2ZSkge1xuICAgIHRyeSB7XG4gICAgICBzcGF3bkJyYW5jaENsZWFudXBXYXRjaGVyKHtcbiAgICAgICAgY2FyZElkOiBpbnB1dC5jYXJkSWQsXG4gICAgICAgIHJlcG9Sb290OiBpbnB1dC5yZXBvUm9vdCxcbiAgICAgICAgYXBpQmFzZVVybDogaW5wdXQuYXBpQmFzZVVybCxcbiAgICAgICAgYXBpQWNjZXNzVG9rZW46IGlucHV0LmFwaUFjY2Vzc1Rva2VuLFxuICAgICAgICBzZXNzaW9uSWRcbiAgICAgIH0pO1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICBjb25zdCBtZXNzYWdlID0gZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiBTdHJpbmcoZXJyb3IpO1xuICAgICAgY29udGV4dC5sb2dnZXIud2FybignRmFpbGVkIHRvIHNwYXduIGJyYW5jaC1jbGVhbnVwIHdhdGNoZXIgKG5vbi1mYXRhbCknLCB7IGVycm9yOiBtZXNzYWdlLCBzZXNzaW9uSWQgfSk7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIGNvbnN0IGNsZWFudXBTdGFydCA9IHBlcmZvcm1hbmNlLm5vdygpO1xuICAgIHRyeSB7XG4gICAgICBhd2FpdCBjbGVhbnVwTWVyZ2VkQnJhbmNoZXMoaW5wdXQsIGNsaWVudCwgY29udGV4dC5sb2dnZXIsIHNlc3Npb25JZCk7XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIGNvbnN0IG1lc3NhZ2UgPSBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6IFN0cmluZyhlcnJvcik7XG4gICAgICBpZiAobWVzc2FnZS5pbmNsdWRlcygnc2VsZi1yZWZlcmVudGlhbCBwYXJlbnRCcmFuY2gnKSB8fCBtZXNzYWdlLmluY2x1ZGVzKCdkYXRhIGNvcnJ1cHRpb24nKSkge1xuICAgICAgICB0aHJvdyBlcnJvcjtcbiAgICAgIH1cbiAgICAgIGNvbnRleHQubG9nZ2VyLndhcm4oJ1Bvc3QtZXhpdCBjbGVhbnVwIGZhaWxlZCAobm9uLWZhdGFsKScsIHsgZXJyb3I6IG1lc3NhZ2UsIHNlc3Npb25JZCB9KTtcbiAgICB9XG4gICAgY29udGV4dC5sb2dnZXIuZGVidWcoJ1Bvc3QtZXhpdCBjbGVhbnVwIGZpbmlzaGVkJywge1xuICAgICAgc2Vzc2lvbklkLFxuICAgICAgZWxhcHNlZE1zOiBNYXRoLnJvdW5kKHBlcmZvcm1hbmNlLm5vdygpIC0gY2xlYW51cFN0YXJ0KVxuICAgIH0pO1xuICB9XG59XG4iLCAiLyoqXG4gKiBHaXQgd29ya3RyZWUgbGlmZWN5Y2xlIG1hbmFnZW1lbnQgZm9yIG1vbm9yZXBvIHdvcmtzcGFjZXMuXG4gKlxuICogQ3JlYXRlcyB3b3JrdHJlZXMgd2l0aCBzeW1saW5rZWQgbm9kZV9tb2R1bGVzLCBpZ25vcmVkIHBhdGhzLCBhbmRcbiAqIHBlci13b3JrdHJlZSBnaXQgZXhjbHVkZXMgc28gdGhlIHdvcmt0cmVlIGlzIGltbWVkaWF0ZWx5IHVzYWJsZSBmb3JcbiAqIGJ1aWxkcyBhbmQgdGVzdHMgd2l0aG91dCBhIHNlcGFyYXRlIGB5YXJuIGluc3RhbGxgLlxuICpcbiAqIFN1cHBvcnRzIGJvdGggYnJhbmNoLWJhc2VkIHdvcmt0cmVlcyAoZm9yIGltcGxlbWVudGF0aW9uIHdvcmspIGFuZFxuICogZGV0YWNoZWQgd29ya3RyZWVzIChmb3IgdmVyaWZ5aW5nIHN0YXRlIGF0IGEgdGFnIG9yIGNvbW1pdCkuXG4gKlxuICogQHN1bW1hcnkgR2l0IHdvcmt0cmVlIGNyZWF0aW9uIHdpdGggbW9ub3JlcG8gc3ltbGluayB3aXJpbmdcbiAqIEBtb2R1bGUgd29ya3RyZWVcbiAqL1xuXG5pbXBvcnQgeyBleGVjRmlsZSB9IGZyb20gJ25vZGU6Y2hpbGRfcHJvY2Vzcyc7XG5pbXBvcnQgKiBhcyBmcyBmcm9tICdub2RlOmZzL3Byb21pc2VzJztcbmltcG9ydCAqIGFzIHBhdGggZnJvbSAnbm9kZTpwYXRoJztcbmltcG9ydCB7IHByb21pc2lmeSB9IGZyb20gJ25vZGU6dXRpbCc7XG5cbmNvbnN0IGV4ZWNGaWxlQXN5bmMgPSBwcm9taXNpZnkoZXhlY0ZpbGUpO1xuXG4vKipcbiAqIFZhbGlkYXRlcyBhIGJyYW5jaCBuYW1lIGFnYWluc3QgdGhlIENMSSdzIHNhZmUgc3Vic2V0LlxuICpcbiAqIFRoZSBuYW1lIG11c3Qgc3RhcnQgd2l0aCBhbiBhbHBoYW51bWVyaWMgY2hhcmFjdGVyIGFuZCBtYXkgdGhlbiBpbmNsdWRlXG4gKiBhbHBoYW51bWVyaWNzLCBzbGFzaGVzLCB1bmRlcnNjb3Jlcywgb3IgZGFzaGVzLlxuICpcbiAqIEBwYXJhbSBuYW1lIC0gQ2FuZGlkYXRlIGJyYW5jaCBuYW1lIHN1cHBsaWVkIGJ5IHRoZSBjYWxsZXIuXG4gKiBAdGhyb3dzIHtFcnJvcn0gV2hlbiB0aGUgYnJhbmNoIG5hbWUgZG9lcyBub3QgbWF0Y2ggdGhlIHN1cHBvcnRlZCBmb3JtYXQuXG4gKiBAcmV0dXJucyBObyB2YWx1ZS4gVGhyb3dzIG9uIGludmFsaWQgaW5wdXQuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB2YWxpZGF0ZUJyYW5jaE5hbWUobmFtZTogc3RyaW5nKTogdm9pZCB7XG4gIGNvbnN0IGJyYW5jaE5hbWVSZWdleCA9IC9eW2EtekEtWjAtOV1bYS16QS1aMC05L18tXSokLztcbiAgaWYgKCFicmFuY2hOYW1lUmVnZXgudGVzdChuYW1lKSkge1xuICAgIHRocm93IG5ldyBFcnJvcignRXJyb3I6IEludmFsaWQgYnJhbmNoIG5hbWUgZm9ybWF0LicpO1xuICB9XG59XG5cbi8qKlxuICogRGV0ZXJtaW5lcyB3aGV0aGVyIGEgcmVsYXRpdmUgcGF0aCBpcyBuZXN0ZWQgdW5kZXIgYW55IGtub3duIHBhcmVudCBwYXRoLlxuICpcbiAqIFRoZSBjaGVjayB3YWxrcyBhbmNlc3RvciBzZWdtZW50cyBvZiBgZGlyYCBhbmQgcmV0dXJucyB0cnVlIG9uIHRoZSBmaXJzdFxuICogbWF0Y2ggaW4gYHBhcmVudFNldGAuXG4gKlxuICogQHBhcmFtIGRpciAtIFJlbGF0aXZlIHBhdGggdG8gdGVzdC5cbiAqIEBwYXJhbSBwYXJlbnRTZXQgLSBDYW5kaWRhdGUgcGFyZW50IGRpcmVjdG9yaWVzIHJlcHJlc2VudGVkIGFzIHJlbGF0aXZlIHBhdGhzLlxuICogQHJldHVybnMgVHJ1ZSB3aGVuIGBkaXJgIGlzIG5lc3RlZCB1bmRlciBhIHBhdGggaW4gYHBhcmVudFNldGAuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc05lc3RlZFVuZGVyKGRpcjogc3RyaW5nLCBwYXJlbnRTZXQ6IFNldDxzdHJpbmc+KTogYm9vbGVhbiB7XG4gIGxldCBjdXJyZW50ID0gZGlyO1xuICB3aGlsZSAoY3VycmVudC5pbmNsdWRlcygnLycpKSB7XG4gICAgY3VycmVudCA9IGN1cnJlbnQuc3Vic3RyaW5nKDAsIGN1cnJlbnQubGFzdEluZGV4T2YoJy8nKSk7XG4gICAgaWYgKHBhcmVudFNldC5oYXMoY3VycmVudCkpIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgfVxuICByZXR1cm4gZmFsc2U7XG59XG5cbi8qKlxuICogQ2hlY2tzIHdoZXRoZXIgYSBzeW1saW5rIHRhcmdldCBwb2ludHMgdG8ga25vd24gbW9ub3JlcG8taW50ZXJuYWwgbG9jYXRpb25zLlxuICpcbiAqIEludGVybmFsIHRhcmdldHMgYXJlIHByZXNlcnZlZCBhcyByZWxhdGl2ZSBsaW5rcyBkdXJpbmcgbm9kZV9tb2R1bGVzIHJlcm91dGVcbiAqIHNvIHdvcmtzcGFjZSBsaW5rcyBrZWVwIHdvcmtpbmcgaW5zaWRlIGEgd29ya3RyZWUuXG4gKlxuICogQHBhcmFtIHRhcmdldCAtIFN5bWxpbmsgdGFyZ2V0IHJlYWQgZnJvbSB0aGUgc291cmNlIG5vZGVfbW9kdWxlcyBlbnRyeS5cbiAqIEByZXR1cm5zIFRydWUgd2hlbiB0aGUgdGFyZ2V0IHN0YXJ0cyB3aXRoIGFuIGludGVybmFsIHByZWZpeC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzSW50ZXJuYWxTeW1saW5rKHRhcmdldDogc3RyaW5nKTogYm9vbGVhbiB7XG4gIHJldHVybiB0YXJnZXQuc3RhcnRzV2l0aCgnLi4vJyk7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgQ3JlYXRlV29ya3RyZWVSZXN1bHQge1xuICBicmFuY2g6IHN0cmluZztcbiAgd29ya3RyZWU6IHN0cmluZztcbiAgYmFzZVNoYTogc3RyaW5nO1xuICByZXJvdXRlZFN5bWxpbmtzPzogbnVtYmVyO1xufVxuXG4vKipcbiAqIENyZWF0ZXMgYW5kIGNvbmZpZ3VyZXMgYSBuZXcgZ2l0IHdvcmt0cmVlLlxuICpcbiAqIFRoZSB3b3JrZmxvdyB2YWxpZGF0ZXMgdGhlIHJlZiwgY3JlYXRlcyB0aGUgd29ya3RyZWUsIG1pcnJvcnMgZXhpc3Rpbmcgcm9vdFxuICogc3ltbGlua3MsIHN5bWxpbmtzIGlnbm9yZWQgcGF0aHMsIHJlcm91dGVzIG5vZGVfbW9kdWxlcyBsaW5rcywgYW5kIHVwZGF0ZXNcbiAqIHBlci13b3JrdHJlZSBnaXQgZXhjbHVkZXMuXG4gKlxuICogV2hlbiBgcmVmYCBpcyBhIGJyYW5jaCBuYW1lLCB0aGUgd29ya3RyZWUgY2hlY2tzIG91dCB0aGF0IGJyYW5jaCAoY3JlYXRpbmdcbiAqIGl0IGlmIG5lZWRlZCkuIFdoZW4gYHJlZmAgaXMgYSB0YWcgb3IgY29tbWl0IFNIQSwgdGhlIHdvcmt0cmVlIGlzIGNyZWF0ZWRcbiAqIGluIGRldGFjaGVkIEhFQUQgbW9kZS5cbiAqXG4gKiBAcGFyYW0gcmVmIC0gQnJhbmNoIG5hbWUsIHRhZyBuYW1lLCBvciBjb21taXQgU0hBLlxuICogQHBhcmFtIG9wdGlvbnMgLSBPcHRpb25hbCBjb25maWd1cmF0aW9uLlxuICogQHBhcmFtIG9wdGlvbnMuY3dkIC0gV29ya2luZyBkaXJlY3RvcnkgdG8gdXNlIHdoZW4gbG9jYXRpbmcgZ2l0IHJvb3RzLiBEZWZhdWx0cyB0byBgcHJvY2Vzcy5jd2QoKWAuXG4gKiBAcmV0dXJucyBNZXRhZGF0YSBkZXNjcmliaW5nIHRoZSBjcmVhdGVkIHdvcmt0cmVlIGFuZCBiYXNlIGNvbW1pdC5cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGNyZWF0ZVdvcmt0cmVlKHJlZjogc3RyaW5nLCBvcHRpb25zPzogeyBjd2Q/OiBzdHJpbmcgfSk6IFByb21pc2U8Q3JlYXRlV29ya3RyZWVSZXN1bHQ+IHtcbiAgY29uc3QgeyBzb3VyY2VSb290LCByZXBvUm9vdCB9ID0gYXdhaXQgZmluZEdpdFJvb3RzKG9wdGlvbnM/LmN3ZCA/PyBwcm9jZXNzLmN3ZCgpKTtcblxuICAvLyBEZXRlcm1pbmUgd2hldGhlciB0aGlzIGlzIGFuIGV4aXN0aW5nIHJlZiBvciBhIG5ldyBicmFuY2ggbmFtZS5cbiAgLy8gcmVzb2x2ZVJlZlR5cGUgdGhyb3dzIGZvciB1bmtub3duIHJlZnM7IGEgdmFsaWQgYnJhbmNoIG5hbWUgdGhhdFxuICAvLyBkb2Vzbid0IGV4aXN0IHlldCBpcyB0cmVhdGVkIGFzIGEgbmV3IGJyYW5jaCB0byBjcmVhdGUuXG4gIGxldCByZWZUeXBlOiAnYnJhbmNoJyB8ICd0YWcnIHwgJ2NvbW1pdCc7XG4gIHRyeSB7XG4gICAgcmVmVHlwZSA9IGF3YWl0IHJlc29sdmVSZWZUeXBlKHJlcG9Sb290LCByZWYpO1xuICB9IGNhdGNoIHtcbiAgICB2YWxpZGF0ZUJyYW5jaE5hbWUocmVmKTtcbiAgICByZWZUeXBlID0gJ2JyYW5jaCc7XG4gIH1cblxuICBpZiAocmVmVHlwZSA9PT0gJ2JyYW5jaCcpIHtcbiAgICB2YWxpZGF0ZUJyYW5jaE5hbWUocmVmKTtcbiAgfVxuXG4gIGNvbnN0IHdvcmt0cmVlRGlyID0gcGF0aC5qb2luKHJlcG9Sb290LCAnLndvcmt0cmVlcycsIHJlZik7XG5cbiAgY29uc3Qgd29ya3RyZWVFeGlzdHMgPSBhd2FpdCBjaGVja1dvcmt0cmVlRXhpc3RzKHJlcG9Sb290LCB3b3JrdHJlZURpcik7XG4gIGlmICh3b3JrdHJlZUV4aXN0cykge1xuICAgIHRocm93IG5ldyBFcnJvcihgRXJyb3I6IFdvcmt0cmVlIGFscmVhZHkgZXhpc3RzIGF0ICR7d29ya3RyZWVEaXJ9YCk7XG4gIH1cblxuICBhd2FpdCBjbGVhblN0YWxlV29ya3RyZWVEaXIocmVwb1Jvb3QsIHdvcmt0cmVlRGlyKTtcblxuICBpZiAocmVmVHlwZSA9PT0gJ2JyYW5jaCcpIHtcbiAgICBjb25zdCBzdGFydFBvaW50ID0gYXdhaXQgcmVzb2x2ZUhlYWQoc291cmNlUm9vdCk7XG4gICAgY29uc3QgYnJhbmNoRXhpc3RzID0gYXdhaXQgY2hlY2tCcmFuY2hFeGlzdHMocmVwb1Jvb3QsIHJlZik7XG4gICAgYXdhaXQgYWRkV29ya3RyZWUoeyByZXBvUm9vdCwgd29ya3RyZWVEaXIsIGJyYW5jaE5hbWU6IHJlZiwgYnJhbmNoRXhpc3RzLCBzdGFydFBvaW50IH0pO1xuICB9IGVsc2Uge1xuICAgIGF3YWl0IGFkZERldGFjaGVkV29ya3RyZWUocmVwb1Jvb3QsIHdvcmt0cmVlRGlyLCByZWYpO1xuICB9XG5cbiAgY29uc3QgaWdub3JlZCA9IGF3YWl0IGRpc2NvdmVySWdub3JlZFBhdGhzKHNvdXJjZVJvb3QpO1xuICBhd2FpdCBjb3B5RXhpc3RpbmdTeW1saW5rcyhzb3VyY2VSb290LCB3b3JrdHJlZURpcik7XG4gIGF3YWl0IHN5bWxpbmtJZ25vcmVkUGF0aHMoeyBzb3VyY2VSb290LCB3b3JrdHJlZURpciwgaWdub3JlZCB9KTtcblxuICBjb25zdCByZXJvdXRlZENvdW50ID0gYXdhaXQgcmVyb3V0ZUFsbE5vZGVNb2R1bGVzKHsgc291cmNlUm9vdCwgd29ya3RyZWVEaXIsIHJlcG9Sb290IH0pO1xuXG4gIGNvbnN0IFssIGJhc2VTaGFdID0gYXdhaXQgUHJvbWlzZS5hbGwoW1xuICAgIHVwZGF0ZUdpdEV4Y2x1ZGUoeyB3b3JrdHJlZURpciwgcmVwb1Jvb3QsIGRpcmVjdG9yaWVzOiBpZ25vcmVkLmRpcmVjdG9yaWVzLCBmaWxlczogaWdub3JlZC5maWxlcyB9KSxcbiAgICByZXNvbHZlSGVhZCh3b3JrdHJlZURpcilcbiAgXSk7XG5cbiAgY29uc3QgcmVzdWx0OiBDcmVhdGVXb3JrdHJlZVJlc3VsdCA9IHtcbiAgICBicmFuY2g6IHJlZixcbiAgICB3b3JrdHJlZTogd29ya3RyZWVEaXIsXG4gICAgYmFzZVNoYVxuICB9O1xuXG4gIGlmIChyZXJvdXRlZENvdW50ID4gMCkge1xuICAgIHJlc3VsdC5yZXJvdXRlZFN5bWxpbmtzID0gcmVyb3V0ZWRDb3VudDtcbiAgfVxuXG4gIHJldHVybiByZXN1bHQ7XG59XG5cbi8qKlxuICogUmVtb3ZlcyBzdGFsZSBkaXJlY3RvcnkgcmVtbmFudHMgbGVmdCBieSBhIGNyYXNoZWQgcHJldmlvdXMgc2Vzc2lvbi5cbiAqXG4gKiBHaXQgZG9lc24ndCB0cmFjayB0aGUgd29ya3RyZWUsIGJ1dCB0aGUgZGlyZWN0b3J5IG1heSBzdGlsbCBleGlzdCBvbiBkaXNrLFxuICogd2hpY2ggY2F1c2VzIGBnaXQgd29ya3RyZWUgYWRkYCB0byBmYWlsIHdpdGggXCJhbHJlYWR5IGV4aXN0c1wiLlxuICpcbiAqIEBwYXJhbSByZXBvUm9vdCAtIFByaW1hcnkgcmVwb3NpdG9yeSByb290IHdoZXJlIGdpdCBjb21tYW5kcyBydW4uXG4gKiBAcGFyYW0gd29ya3RyZWVEaXIgLSBBYnNvbHV0ZSB3b3JrdHJlZSBwYXRoIGJlaW5nIGNyZWF0ZWQuXG4gKi9cbmFzeW5jIGZ1bmN0aW9uIGNsZWFuU3RhbGVXb3JrdHJlZURpcihyZXBvUm9vdDogc3RyaW5nLCB3b3JrdHJlZURpcjogc3RyaW5nKTogUHJvbWlzZTx2b2lkPiB7XG4gIHRyeSB7XG4gICAgYXdhaXQgZnMuYWNjZXNzKHdvcmt0cmVlRGlyKTtcbiAgICBhd2FpdCBmcy5ybSh3b3JrdHJlZURpciwgeyByZWN1cnNpdmU6IHRydWUgfSk7XG4gICAgYXdhaXQgZXhlY0ZpbGVBc3luYygnZ2l0JywgWyd3b3JrdHJlZScsICdwcnVuZSddLCB7IGN3ZDogcmVwb1Jvb3QsIHRpbWVvdXQ6IDMwXzAwMCB9KTtcbiAgfSBjYXRjaCAoZXJyb3I6IHVua25vd24pIHtcbiAgICBpZiAoKGVycm9yIGFzIE5vZGVKUy5FcnJub0V4Y2VwdGlvbikuY29kZSAhPT0gJ0VOT0VOVCcpIHtcbiAgICAgIHRocm93IGVycm9yO1xuICAgIH1cbiAgfVxufVxuXG5pbnRlcmZhY2UgR2l0Um9vdHMge1xuICBzb3VyY2VSb290OiBzdHJpbmc7XG4gIHJlcG9Sb290OiBzdHJpbmc7XG59XG5cbi8qKlxuICogTG9jYXRlcyB0aGUgY3VycmVudCBnaXQgc291cmNlIHJvb3QgYW5kIHByaW1hcnkgcmVwb3NpdG9yeSByb290LlxuICpcbiAqIFN1cHBvcnRzIGJvdGggc3RhbmRhcmQgY2hlY2tvdXRzIChgLmdpdGAgZGlyZWN0b3J5KSBhbmQgd29ya3RyZWUgY2hlY2tvdXRzXG4gKiAoYC5naXRgIGZpbGUgcG9pbnRpbmcgaW50byBgLmdpdC93b3JrdHJlZXMvLi4uYCkuXG4gKlxuICogQHBhcmFtIHN0YXJ0RGlyIC0gRGlyZWN0b3J5IHdoZXJlIHVwd2FyZCBzZWFyY2ggYmVnaW5zLlxuICogQHRocm93cyB7RXJyb3J9IFdoZW4gbm8gZ2l0IHJlcG9zaXRvcnkgbWFya2VyIGlzIGZvdW5kLlxuICogQHJldHVybnMgUGF0aHMgZm9yIHRoZSBjdXJyZW50IGNoZWNrb3V0IHJvb3QgYW5kIHRoZSBwcmltYXJ5IHJlcG8gcm9vdC5cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGZpbmRHaXRSb290cyhzdGFydERpcjogc3RyaW5nKTogUHJvbWlzZTxHaXRSb290cz4ge1xuICBsZXQgY3VycmVudERpciA9IHBhdGgucmVzb2x2ZShzdGFydERpcik7XG4gIHdoaWxlIChjdXJyZW50RGlyICE9PSAnLycpIHtcbiAgICBjb25zdCBnaXRQYXRoID0gcGF0aC5qb2luKGN1cnJlbnREaXIsICcuZ2l0Jyk7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHN0YXRzID0gYXdhaXQgZnMubHN0YXQoZ2l0UGF0aCk7XG4gICAgICBpZiAoc3RhdHMuaXNEaXJlY3RvcnkoKSkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgIHNvdXJjZVJvb3Q6IGN1cnJlbnREaXIsXG4gICAgICAgICAgcmVwb1Jvb3Q6IGN1cnJlbnREaXJcbiAgICAgICAgfTtcbiAgICAgIH1cbiAgICAgIGlmIChzdGF0cy5pc0ZpbGUoKSkge1xuICAgICAgICBjb25zdCBnaXRGaWxlQ29udGVudCA9IGF3YWl0IGZzLnJlYWRGaWxlKGdpdFBhdGgsICd1dGYtOCcpO1xuICAgICAgICBjb25zdCBnaXRkaXJMaW5lID0gZ2l0RmlsZUNvbnRlbnQudHJpbSgpO1xuICAgICAgICBjb25zdCBnaXRkaXJQYXRoID0gZ2l0ZGlyTGluZS5yZXBsYWNlKC9eZ2l0ZGlyOlxccyovLCAnJyk7XG4gICAgICAgIGNvbnN0IG1haW5HaXREaXIgPSBnaXRkaXJQYXRoLnJlcGxhY2UoL1xcL3dvcmt0cmVlc1xcL1teL10rJC8sICcnKTtcbiAgICAgICAgY29uc3QgcmVwb1Jvb3QgPSBtYWluR2l0RGlyLnJlcGxhY2UoL1xcL1xcLmdpdCQvLCAnJyk7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgc291cmNlUm9vdDogY3VycmVudERpcixcbiAgICAgICAgICByZXBvUm9vdFxuICAgICAgICB9O1xuICAgICAgfVxuICAgIH0gY2F0Y2ggKGVycm9yOiB1bmtub3duKSB7XG4gICAgICBpZiAoKGVycm9yIGFzIE5vZGVKUy5FcnJub0V4Y2VwdGlvbikuY29kZSAhPT0gJ0VOT0VOVCcpIHtcbiAgICAgICAgdGhyb3cgZXJyb3I7XG4gICAgICB9XG4gICAgfVxuICAgIGN1cnJlbnREaXIgPSBwYXRoLmRpcm5hbWUoY3VycmVudERpcik7XG4gIH1cbiAgdGhyb3cgbmV3IEVycm9yKCdOb3QgaW4gYSBnaXQgcmVwb3NpdG9yeScpO1xufVxuXG4vKipcbiAqIFJlc29sdmVzIHRoZSBIRUFEIGNvbW1pdCBTSEEgZm9yIGEgcmVwb3NpdG9yeSBkaXJlY3RvcnkuXG4gKlxuICogQHBhcmFtIGN3ZCAtIFJlcG9zaXRvcnkgZGlyZWN0b3J5IHBhc3NlZCB0byBgZ2l0IHJldi1wYXJzZSBIRUFEYC5cbiAqIEByZXR1cm5zIFRyaW1tZWQgY29tbWl0IFNIQSBzdHJpbmcuXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiByZXNvbHZlSGVhZChjd2Q6IHN0cmluZyk6IFByb21pc2U8c3RyaW5nPiB7XG4gIGNvbnN0IHsgc3Rkb3V0IH0gPSBhd2FpdCBleGVjRmlsZUFzeW5jKCdnaXQnLCBbJ3Jldi1wYXJzZScsICdIRUFEJ10sIHsgY3dkLCB0aW1lb3V0OiA1XzAwMCB9KTtcbiAgcmV0dXJuIHN0ZG91dC50cmltKCk7XG59XG5cbi8qKlxuICogQ2hlY2tzIHdoZXRoZXIgYSB3b3JrdHJlZSBwYXRoIGlzIGFscmVhZHkgcmVnaXN0ZXJlZCB3aXRoIGdpdC5cbiAqXG4gKiBAcGFyYW0gcmVwb1Jvb3QgLSBQcmltYXJ5IHJlcG9zaXRvcnkgcm9vdCB3aGVyZSBnaXQgY29tbWFuZHMgcnVuLlxuICogQHBhcmFtIHdvcmt0cmVlRGlyIC0gQWJzb2x1dGUgd29ya3RyZWUgcGF0aCBiZWluZyBjcmVhdGVkLlxuICogQHJldHVybnMgVHJ1ZSB3aGVuIGBnaXQgd29ya3RyZWUgbGlzdGAgYWxyZWFkeSBjb250YWlucyBgd29ya3RyZWVEaXJgLlxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gY2hlY2tXb3JrdHJlZUV4aXN0cyhyZXBvUm9vdDogc3RyaW5nLCB3b3JrdHJlZURpcjogc3RyaW5nKTogUHJvbWlzZTxib29sZWFuPiB7XG4gIGNvbnN0IHsgc3Rkb3V0IH0gPSBhd2FpdCBleGVjRmlsZUFzeW5jKCdnaXQnLCBbJ3dvcmt0cmVlJywgJ2xpc3QnXSwgeyBjd2Q6IHJlcG9Sb290LCB0aW1lb3V0OiAzMF8wMDAgfSk7XG4gIHJldHVybiBzdGRvdXQuaW5jbHVkZXMod29ya3RyZWVEaXIpO1xufVxuXG4vKipcbiAqIENoZWNrcyB3aGV0aGVyIGEgYnJhbmNoIGFscmVhZHkgZXhpc3RzIGluIHRoZSByZXBvc2l0b3J5LlxuICpcbiAqIEBwYXJhbSByZXBvUm9vdCAtIFByaW1hcnkgcmVwb3NpdG9yeSByb290IHdoZXJlIGdpdCBjb21tYW5kcyBydW4uXG4gKiBAcGFyYW0gYnJhbmNoTmFtZSAtIEJyYW5jaCBuYW1lIHRvIHF1ZXJ5LlxuICogQHJldHVybnMgVHJ1ZSB3aGVuIGF0IGxlYXN0IG9uZSBtYXRjaGluZyBsb2NhbCBicmFuY2ggaXMgbGlzdGVkLlxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gY2hlY2tCcmFuY2hFeGlzdHMocmVwb1Jvb3Q6IHN0cmluZywgYnJhbmNoTmFtZTogc3RyaW5nKTogUHJvbWlzZTxib29sZWFuPiB7XG4gIGNvbnN0IHsgc3Rkb3V0IH0gPSBhd2FpdCBleGVjRmlsZUFzeW5jKCdnaXQnLCBbJ2JyYW5jaCcsICctLWxpc3QnLCBicmFuY2hOYW1lXSwge1xuICAgIGN3ZDogcmVwb1Jvb3QsXG4gICAgdGltZW91dDogMzBfMDAwXG4gIH0pO1xuICByZXR1cm4gc3Rkb3V0LnRyaW0oKS5sZW5ndGggPiAwO1xufVxuXG4vKipcbiAqIERldGVybWluZXMgd2hldGhlciBhIGdpdCByZWYgaXMgYSBicmFuY2gsIHRhZywgb3IgY29tbWl0IFNIQS5cbiAqXG4gKiBDaGVja3MgbG9jYWwgYnJhbmNoZXMgZmlyc3QsIHRoZW4gdGFncywgdGhlbiBmYWxscyBiYWNrIHRvIHZlcmlmeWluZ1xuICogdGhlIHJlZiByZXNvbHZlcyBhcyBhIGNvbW1pdC5cbiAqXG4gKiBAcGFyYW0gcmVwb1Jvb3QgLSBQcmltYXJ5IHJlcG9zaXRvcnkgcm9vdCB3aGVyZSBnaXQgY29tbWFuZHMgcnVuLlxuICogQHBhcmFtIHJlZiAtIFRoZSByZWYgdG8gY2xhc3NpZnkuXG4gKiBAdGhyb3dzIHtFcnJvcn0gV2hlbiB0aGUgcmVmIGRvZXMgbm90IHJlc29sdmUgdG8gYW55IGtub3duIGdpdCBvYmplY3QuXG4gKiBAcmV0dXJucyBUaGUgcmVmIHR5cGU6IGAnYnJhbmNoJ2AsIGAndGFnJ2AsIG9yIGAnY29tbWl0J2AuXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiByZXNvbHZlUmVmVHlwZShyZXBvUm9vdDogc3RyaW5nLCByZWY6IHN0cmluZyk6IFByb21pc2U8J2JyYW5jaCcgfCAndGFnJyB8ICdjb21taXQnPiB7XG4gIGNvbnN0IGJyYW5jaEV4aXN0cyA9IGF3YWl0IGNoZWNrQnJhbmNoRXhpc3RzKHJlcG9Sb290LCByZWYpO1xuICBpZiAoYnJhbmNoRXhpc3RzKSByZXR1cm4gJ2JyYW5jaCc7XG5cbiAgY29uc3QgeyBzdGRvdXQ6IHRhZ091dHB1dCB9ID0gYXdhaXQgZXhlY0ZpbGVBc3luYygnZ2l0JywgWyd0YWcnLCAnLS1saXN0JywgcmVmXSwge1xuICAgIGN3ZDogcmVwb1Jvb3QsXG4gICAgdGltZW91dDogMzBfMDAwXG4gIH0pO1xuICBpZiAodGFnT3V0cHV0LnRyaW0oKS5sZW5ndGggPiAwKSByZXR1cm4gJ3RhZyc7XG5cbiAgdHJ5IHtcbiAgICBhd2FpdCBleGVjRmlsZUFzeW5jKCdnaXQnLCBbJ3Jldi1wYXJzZScsICctLXZlcmlmeScsIGAke3JlZn1ee2NvbW1pdH1gXSwge1xuICAgICAgY3dkOiByZXBvUm9vdCxcbiAgICAgIHRpbWVvdXQ6IDVfMDAwXG4gICAgfSk7XG4gICAgcmV0dXJuICdjb21taXQnO1xuICB9IGNhdGNoIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYEVycm9yOiAnJHtyZWZ9JyBkb2VzIG5vdCByZXNvbHZlIHRvIGEgYnJhbmNoLCB0YWcsIG9yIGNvbW1pdC5gKTtcbiAgfVxufVxuXG5pbnRlcmZhY2UgQWRkV29ya3RyZWVPcHRpb25zIHtcbiAgcmVwb1Jvb3Q6IHN0cmluZztcbiAgd29ya3RyZWVEaXI6IHN0cmluZztcbiAgYnJhbmNoTmFtZTogc3RyaW5nO1xuICBicmFuY2hFeGlzdHM6IGJvb2xlYW47XG4gIHN0YXJ0UG9pbnQ6IHN0cmluZztcbn1cblxuLyoqXG4gKiBBZGRzIGEgZ2l0IHdvcmt0cmVlLCBjcmVhdGluZyB0aGUgYnJhbmNoIHdoZW4gbmVlZGVkLlxuICpcbiAqIFVzZXMgYGdpdCB3b3JrdHJlZSBhZGQgLWJgIGZvciBuZXcgYnJhbmNoZXMgYW5kIHBsYWluIGBnaXQgd29ya3RyZWUgYWRkYFxuICogd2hlbiBhdHRhY2hpbmcgdG8gYW4gZXhpc3RpbmcgYnJhbmNoLlxuICpcbiAqIEBwYXJhbSBvcHRzIC0gV29ya3RyZWUgY3JlYXRpb24gb3B0aW9ucyBhbmQgYnJhbmNoIGV4aXN0ZW5jZSBzdGF0ZS5cbiAqIEByZXR1cm5zIE5vIHZhbHVlLlxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gYWRkV29ya3RyZWUob3B0czogQWRkV29ya3RyZWVPcHRpb25zKTogUHJvbWlzZTx2b2lkPiB7XG4gIGNvbnN0IGFyZ3MgPSBvcHRzLmJyYW5jaEV4aXN0c1xuICAgID8gWyd3b3JrdHJlZScsICdhZGQnLCBvcHRzLndvcmt0cmVlRGlyLCBvcHRzLmJyYW5jaE5hbWVdXG4gICAgOiBbJ3dvcmt0cmVlJywgJ2FkZCcsICctYicsIG9wdHMuYnJhbmNoTmFtZSwgb3B0cy53b3JrdHJlZURpciwgb3B0cy5zdGFydFBvaW50XTtcbiAgYXdhaXQgZXhlY0ZpbGVBc3luYygnZ2l0JywgYXJncywgeyBjd2Q6IG9wdHMucmVwb1Jvb3QsIHRpbWVvdXQ6IDMwXzAwMCB9KTtcbn1cblxuLyoqXG4gKiBBZGRzIGEgZ2l0IHdvcmt0cmVlIGluIGRldGFjaGVkIEhFQUQgbW9kZSBhdCB0aGUgZ2l2ZW4gcmVmLlxuICpcbiAqIFVzZWQgZm9yIHRhZ3MgYW5kIGNvbW1pdCBTSEFzIHdoZXJlIG5vIGJyYW5jaCBhc3NvY2lhdGlvbiBpcyBuZWVkZWQuXG4gKlxuICogQHBhcmFtIHJlcG9Sb290IC0gUHJpbWFyeSByZXBvc2l0b3J5IHJvb3Qgd2hlcmUgZ2l0IGNvbW1hbmRzIHJ1bi5cbiAqIEBwYXJhbSB3b3JrdHJlZURpciAtIEFic29sdXRlIHBhdGggZm9yIHRoZSBuZXcgd29ya3RyZWUuXG4gKiBAcGFyYW0gcmVmIC0gVGFnIG5hbWUgb3IgY29tbWl0IFNIQSB0byBjaGVjayBvdXQuXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBhZGREZXRhY2hlZFdvcmt0cmVlKHJlcG9Sb290OiBzdHJpbmcsIHdvcmt0cmVlRGlyOiBzdHJpbmcsIHJlZjogc3RyaW5nKTogUHJvbWlzZTx2b2lkPiB7XG4gIGF3YWl0IGV4ZWNGaWxlQXN5bmMoJ2dpdCcsIFsnd29ya3RyZWUnLCAnYWRkJywgJy0tZGV0YWNoJywgd29ya3RyZWVEaXIsIHJlZl0sIHtcbiAgICBjd2Q6IHJlcG9Sb290LFxuICAgIHRpbWVvdXQ6IDMwXzAwMFxuICB9KTtcbn1cblxuaW50ZXJmYWNlIElnbm9yZWRQYXRocyB7XG4gIGRpcmVjdG9yaWVzOiBzdHJpbmdbXTtcbiAgZmlsZXM6IHN0cmluZ1tdO1xufVxuXG4vKipcbiAqIERpc2NvdmVycyBpZ25vcmVkIGZpbGVzIGFuZCBkaXJlY3RvcmllcyB1bmRlciBhIHNvdXJjZSByb290LlxuICpcbiAqIFBhdGhzIGFyZSByZXR1cm5lZCByZWxhdGl2ZSB0byBgc291cmNlUm9vdGAgYW5kIGAud29ya3RyZWVzYCBjb250ZW50IGlzXG4gKiBmaWx0ZXJlZCBvdXQgdG8gYXZvaWQgc2VsZi1yZWZlcmVudGlhbCBzeW1saW5raW5nLlxuICpcbiAqIEBwYXJhbSBzb3VyY2VSb290IC0gU291cmNlIGNoZWNrb3V0IHJvb3QgdXNlZCBmb3IgZ2l0IGRpc2NvdmVyeS5cbiAqIEByZXR1cm5zIFNlcGFyYXRlIGxpc3RzIG9mIGlnbm9yZWQgZGlyZWN0b3JpZXMgYW5kIGlnbm9yZWQgZmlsZXMuXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBkaXNjb3Zlcklnbm9yZWRQYXRocyhzb3VyY2VSb290OiBzdHJpbmcpOiBQcm9taXNlPElnbm9yZWRQYXRocz4ge1xuICBjb25zdCB7IHN0ZG91dCB9ID0gYXdhaXQgZXhlY0ZpbGVBc3luYyhcbiAgICAnZ2l0JyxcbiAgICBbJy1DJywgc291cmNlUm9vdCwgJ2xzLWZpbGVzJywgJy0taWdub3JlZCcsICctLWV4Y2x1ZGUtc3RhbmRhcmQnLCAnLS1kaXJlY3RvcnknLCAnLS1vdGhlcnMnXSxcbiAgICB7IGN3ZDogc291cmNlUm9vdCwgdGltZW91dDogMzBfMDAwIH1cbiAgKTtcblxuICBjb25zdCBsaW5lcyA9IHN0ZG91dC5zcGxpdCgnXFxuJykuZmlsdGVyKChsaW5lKSA9PiBsaW5lLmxlbmd0aCA+IDAgJiYgIWxpbmUuc3RhcnRzV2l0aCgnLndvcmt0cmVlcycpKTtcbiAgY29uc3QgZGlyZWN0b3JpZXMgPSBsaW5lcy5maWx0ZXIoKGwpID0+IGwuZW5kc1dpdGgoJy8nKSkubWFwKChsKSA9PiBsLnNsaWNlKDAsIC0xKSk7XG4gIGNvbnN0IGZpbGVzID0gbGluZXMuZmlsdGVyKChsKSA9PiAhbC5lbmRzV2l0aCgnLycpKTtcblxuICByZXR1cm4geyBkaXJlY3RvcmllcywgZmlsZXMgfTtcbn1cblxuaW50ZXJmYWNlIFN5bWxpbmtJZ25vcmVkUGF0aHNPcHRpb25zIHtcbiAgc291cmNlUm9vdDogc3RyaW5nO1xuICB3b3JrdHJlZURpcjogc3RyaW5nO1xuICBpZ25vcmVkOiBJZ25vcmVkUGF0aHM7XG59XG5cbmludGVyZmFjZSBTeW1saW5rSWdub3JlZFBhdGhzUmVzdWx0IHtcbiAgZGlyQ291bnQ6IG51bWJlcjtcbiAgZmlsZUNvdW50OiBudW1iZXI7XG59XG5cbi8qKlxuICogU3ltbGlua3MgaWdub3JlZCBkaXJlY3RvcmllcyBhbmQgZmlsZXMgZnJvbSBzb3VyY2UgY2hlY2tvdXQgaW50byBhIHdvcmt0cmVlLlxuICpcbiAqIE5lc3RlZCBpZ25vcmVkIGRpcmVjdG9yaWVzIGFyZSBjb2xsYXBzZWQgc28gb25seSB0b3AtbGV2ZWwgaWdub3JlZCBkaXJlY3RvcnlcbiAqIGxpbmtzIGFyZSBjcmVhdGVkLlxuICpcbiAqIEBwYXJhbSBvcHRzIC0gU291cmNlIHJvb3QsIGRlc3RpbmF0aW9uIHdvcmt0cmVlLCBhbmQgaWdub3JlZCBwYXRoIGxpc3RzLlxuICogQHJldHVybnMgQ291bnRzIG9mIHN1Y2Nlc3NmdWxseSBjcmVhdGVkIGRpcmVjdG9yeSBhbmQgZmlsZSBzeW1saW5rcy5cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHN5bWxpbmtJZ25vcmVkUGF0aHMob3B0czogU3ltbGlua0lnbm9yZWRQYXRoc09wdGlvbnMpOiBQcm9taXNlPFN5bWxpbmtJZ25vcmVkUGF0aHNSZXN1bHQ+IHtcbiAgY29uc3QgeyBzb3VyY2VSb290LCB3b3JrdHJlZURpciwgaWdub3JlZCB9ID0gb3B0cztcbiAgY29uc3QgZGlyU2V0ID0gbmV3IFNldChpZ25vcmVkLmRpcmVjdG9yaWVzKTtcbiAgY29uc3Qgbm9uTmVzdGVkRGlycyA9IGlnbm9yZWQuZGlyZWN0b3JpZXMuZmlsdGVyKChkaXIpID0+ICFpc05lc3RlZFVuZGVyKGRpciwgZGlyU2V0KSk7XG5cbiAgY29uc3QgY3JlYXRlRGlyU3ltbGluayA9IGFzeW5jIChkaXI6IHN0cmluZyk6IFByb21pc2U8Ym9vbGVhbj4gPT4ge1xuICAgIHRyeSB7XG4gICAgICBjb25zdCBzb3VyY2VQYXRoID0gcGF0aC5qb2luKHNvdXJjZVJvb3QsIGRpcik7XG4gICAgICB0cnkge1xuICAgICAgICBhd2FpdCBmcy5sc3RhdChzb3VyY2VQYXRoKTtcbiAgICAgIH0gY2F0Y2ggKGVycm9yOiB1bmtub3duKSB7XG4gICAgICAgIGlmICgoZXJyb3IgYXMgTm9kZUpTLkVycm5vRXhjZXB0aW9uKS5jb2RlID09PSAnRU5PRU5UJykge1xuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBwcm9jZXNzLnN0ZGVyci53cml0ZShcbiAgICAgICAgICBgY3JlYXRlLXdvcmt0cmVlOiB1bmV4cGVjdGVkIGVycm9yIGluIGxzdGF0OiAke2Vycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogU3RyaW5nKGVycm9yKX1cXG5gXG4gICAgICAgICk7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IGRlc3RQYXRoID0gcGF0aC5qb2luKHdvcmt0cmVlRGlyLCBkaXIpO1xuICAgICAgY29uc3QgcGFyZW50RGlyID0gcGF0aC5kaXJuYW1lKGRpcik7XG4gICAgICBpZiAocGFyZW50RGlyICE9PSAnLicpIHtcbiAgICAgICAgYXdhaXQgZnMubWtkaXIocGF0aC5qb2luKHdvcmt0cmVlRGlyLCBwYXJlbnREaXIpLCB7IHJlY3Vyc2l2ZTogdHJ1ZSB9KTtcbiAgICAgIH1cbiAgICAgIGF3YWl0IGZzLnN5bWxpbmsoc291cmNlUGF0aCwgZGVzdFBhdGgpO1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSBjYXRjaCAoZXJyb3I6IHVua25vd24pIHtcbiAgICAgIGNvbnN0IGNvZGUgPSAoZXJyb3IgYXMgTm9kZUpTLkVycm5vRXhjZXB0aW9uKS5jb2RlO1xuICAgICAgaWYgKGNvZGUgPT09ICdFRVhJU1QnIHx8IGNvZGUgPT09ICdFTk9FTlQnKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICAgIHByb2Nlc3Muc3RkZXJyLndyaXRlKFxuICAgICAgICBgY3JlYXRlLXdvcmt0cmVlOiB1bmV4cGVjdGVkIGVycm9yIGluIHN5bWxpbms6ICR7ZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiBTdHJpbmcoZXJyb3IpfVxcbmBcbiAgICAgICk7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICB9O1xuXG4gIGNvbnN0IGNyZWF0ZUZpbGVTeW1saW5rID0gYXN5bmMgKGZpbGU6IHN0cmluZyk6IFByb21pc2U8Ym9vbGVhbj4gPT4ge1xuICAgIHRyeSB7XG4gICAgICBjb25zdCBzb3VyY2VQYXRoID0gcGF0aC5qb2luKHNvdXJjZVJvb3QsIGZpbGUpO1xuICAgICAgdHJ5IHtcbiAgICAgICAgYXdhaXQgZnMubHN0YXQoc291cmNlUGF0aCk7XG4gICAgICB9IGNhdGNoIChlcnJvcjogdW5rbm93bikge1xuICAgICAgICBpZiAoKGVycm9yIGFzIE5vZGVKUy5FcnJub0V4Y2VwdGlvbikuY29kZSA9PT0gJ0VOT0VOVCcpIHtcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgcHJvY2Vzcy5zdGRlcnIud3JpdGUoXG4gICAgICAgICAgYGNyZWF0ZS13b3JrdHJlZTogdW5leHBlY3RlZCBlcnJvciBpbiBsc3RhdDogJHtlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6IFN0cmluZyhlcnJvcil9XFxuYFxuICAgICAgICApO1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgICBjb25zdCBkZXN0UGF0aCA9IHBhdGguam9pbih3b3JrdHJlZURpciwgZmlsZSk7XG4gICAgICBjb25zdCBwYXJlbnREaXIgPSBwYXRoLmRpcm5hbWUoZmlsZSk7XG4gICAgICBpZiAocGFyZW50RGlyICE9PSAnLicpIHtcbiAgICAgICAgYXdhaXQgZnMubWtkaXIocGF0aC5qb2luKHdvcmt0cmVlRGlyLCBwYXJlbnREaXIpLCB7IHJlY3Vyc2l2ZTogdHJ1ZSB9KTtcbiAgICAgIH1cbiAgICAgIGF3YWl0IGZzLnN5bWxpbmsoc291cmNlUGF0aCwgZGVzdFBhdGgpO1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSBjYXRjaCAoZXJyb3I6IHVua25vd24pIHtcbiAgICAgIGNvbnN0IGNvZGUgPSAoZXJyb3IgYXMgTm9kZUpTLkVycm5vRXhjZXB0aW9uKS5jb2RlO1xuICAgICAgaWYgKGNvZGUgPT09ICdFRVhJU1QnIHx8IGNvZGUgPT09ICdFTk9FTlQnKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICAgIHByb2Nlc3Muc3RkZXJyLndyaXRlKFxuICAgICAgICBgY3JlYXRlLXdvcmt0cmVlOiB1bmV4cGVjdGVkIGVycm9yIGluIHN5bWxpbms6ICR7ZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiBTdHJpbmcoZXJyb3IpfVxcbmBcbiAgICAgICk7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICB9O1xuXG4gIGNvbnN0IGRpclJlc3VsdHMgPSBhd2FpdCBQcm9taXNlLmFsbChub25OZXN0ZWREaXJzLm1hcChjcmVhdGVEaXJTeW1saW5rKSk7XG4gIGNvbnN0IG5vbk5lc3RlZEZpbGVzID0gaWdub3JlZC5maWxlcy5maWx0ZXIoKGZpbGUpID0+ICFpc05lc3RlZFVuZGVyKGZpbGUsIGRpclNldCkpO1xuICBjb25zdCBmaWxlUmVzdWx0cyA9IGF3YWl0IFByb21pc2UuYWxsKG5vbk5lc3RlZEZpbGVzLm1hcChjcmVhdGVGaWxlU3ltbGluaykpO1xuXG4gIGNvbnN0IGRpckNvdW50ID0gZGlyUmVzdWx0cy5maWx0ZXIoKHIpID0+IHIpLmxlbmd0aDtcbiAgY29uc3QgZmlsZUNvdW50ID0gZmlsZVJlc3VsdHMuZmlsdGVyKChyKSA9PiByKS5sZW5ndGg7XG5cbiAgcmV0dXJuIHsgZGlyQ291bnQsIGZpbGVDb3VudCB9O1xufVxuXG4vKipcbiAqIFJlcGxpY2F0ZXMgcm9vdC1sZXZlbCBzeW1saW5rcyBmcm9tIHRoZSBzb3VyY2UgY2hlY2tvdXQgaW50byB0aGUgd29ya3RyZWUuXG4gKlxuICogRXhpc3RpbmcgZGVzdGluYXRpb24gZW50cmllcyBhcmUgbGVmdCB1bnRvdWNoZWQuXG4gKlxuICogQHBhcmFtIHNvdXJjZVJvb3QgLSBTb3VyY2UgY2hlY2tvdXQgcm9vdC5cbiAqIEBwYXJhbSB3b3JrdHJlZURpciAtIERlc3RpbmF0aW9uIHdvcmt0cmVlIHJvb3QuXG4gKiBAcmV0dXJucyBOdW1iZXIgb2Ygc3ltbGlua3MgY3JlYXRlZCBpbiB0aGUgZGVzdGluYXRpb24gcm9vdC5cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGNvcHlFeGlzdGluZ1N5bWxpbmtzKHNvdXJjZVJvb3Q6IHN0cmluZywgd29ya3RyZWVEaXI6IHN0cmluZyk6IFByb21pc2U8bnVtYmVyPiB7XG4gIGNvbnN0IGVudHJpZXMgPSBhd2FpdCBmcy5yZWFkZGlyKHNvdXJjZVJvb3QsIHsgd2l0aEZpbGVUeXBlczogdHJ1ZSB9KTtcbiAgY29uc3Qgc3ltbGlua3MgPSBlbnRyaWVzLmZpbHRlcigoZSkgPT4gZS5pc1N5bWJvbGljTGluaygpICYmIGUubmFtZSAhPT0gJy5naXQnICYmIGUubmFtZSAhPT0gJy53b3JrdHJlZXMnKTtcblxuICBjb25zdCBjb3B5U3ltbGluayA9IGFzeW5jIChuYW1lOiBzdHJpbmcpOiBQcm9taXNlPGJvb2xlYW4+ID0+IHtcbiAgICBjb25zdCBkZXN0UGF0aCA9IHBhdGguam9pbih3b3JrdHJlZURpciwgbmFtZSk7XG4gICAgdHJ5IHtcbiAgICAgIGF3YWl0IGZzLmxzdGF0KGRlc3RQYXRoKTtcbiAgICAgIHJldHVybiBmYWxzZTsgLy8gRGVzdGluYXRpb24gYWxyZWFkeSBleGlzdHNcbiAgICB9IGNhdGNoIChlcnJvcjogdW5rbm93bikge1xuICAgICAgaWYgKChlcnJvciBhcyBOb2RlSlMuRXJybm9FeGNlcHRpb24pLmNvZGUgIT09ICdFTk9FTlQnKSB7XG4gICAgICAgIHRocm93IGVycm9yO1xuICAgICAgfVxuICAgIH1cbiAgICBjb25zdCBzb3VyY2VMaW5rUGF0aCA9IHBhdGguam9pbihzb3VyY2VSb290LCBuYW1lKTtcblxuICAgIC8vIFNraXAgc2VsZi1yZWZlcmVuY2luZyBzeW1saW5rcyAodGFyZ2V0IHJlc29sdmVzIGJhY2sgdG8gdGhlIHN5bWxpbmsgaXRzZWxmKVxuICAgIGNvbnN0IHRhcmdldCA9IGF3YWl0IGZzLnJlYWRsaW5rKHNvdXJjZUxpbmtQYXRoKTtcbiAgICBjb25zdCByZXNvbHZlZFRhcmdldCA9IHBhdGgucmVzb2x2ZShzb3VyY2VSb290LCB0YXJnZXQpO1xuICAgIGlmIChyZXNvbHZlZFRhcmdldCA9PT0gc291cmNlTGlua1BhdGgpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICBhd2FpdCBmcy5zeW1saW5rKHNvdXJjZUxpbmtQYXRoLCBkZXN0UGF0aCk7XG4gICAgcmV0dXJuIHRydWU7XG4gIH07XG5cbiAgY29uc3QgcmVzdWx0cyA9IGF3YWl0IFByb21pc2UuYWxsKHN5bWxpbmtzLm1hcCgoZSkgPT4gY29weVN5bWxpbmsoZS5uYW1lKSkpO1xuICByZXR1cm4gcmVzdWx0cy5maWx0ZXIoKHIpID0+IHIpLmxlbmd0aDtcbn1cblxuaW50ZXJmYWNlIFJlcm91dGVOb2RlTW9kdWxlc09wdGlvbnMge1xuICBzb3VyY2VOb2RlTW9kdWxlczogc3RyaW5nO1xuICBkZXN0Tm9kZU1vZHVsZXM6IHN0cmluZztcbn1cblxuLyoqXG4gKiBNaXJyb3JzIGEgbm9kZV9tb2R1bGVzIHRyZWUgaW50byB0aGUgd29ya3RyZWUgdXNpbmcgc3ltbGlua3MuXG4gKlxuICogSW50ZXJuYWwgd29ya3NwYWNlIGxpbmtzIGtlZXAgdGhlaXIgb3JpZ2luYWwgcmVsYXRpdmUgdGFyZ2V0cyB3aGlsZSBleHRlcm5hbFxuICogbGlua3MgYW5kIG5vbi1saW5rIGVudHJpZXMgYXJlIHJlcHJlc2VudGVkIGFzIHN5bWxpbmtzIHRvIHNvdXJjZSBwYXRocy5cbiAqXG4gKiBAcGFyYW0gb3B0cyAtIFNvdXJjZSBhbmQgZGVzdGluYXRpb24gbm9kZV9tb2R1bGVzIGRpcmVjdG9yaWVzLlxuICogQHJldHVybnMgQ291bnQgb2YgaW50ZXJuYWwgd29ya3NwYWNlIHN5bWxpbmtzIHJlY3JlYXRlZCBieSB0YXJnZXQgcGF0aC5cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHJlcm91dGVOb2RlTW9kdWxlcyhvcHRzOiBSZXJvdXRlTm9kZU1vZHVsZXNPcHRpb25zKTogUHJvbWlzZTxudW1iZXI+IHtcbiAgY29uc3QgeyBzb3VyY2VOb2RlTW9kdWxlcywgZGVzdE5vZGVNb2R1bGVzIH0gPSBvcHRzO1xuXG4gIHRyeSB7XG4gICAgYXdhaXQgZnMubHN0YXQoc291cmNlTm9kZU1vZHVsZXMpO1xuICB9IGNhdGNoIChlcnJvcjogdW5rbm93bikge1xuICAgIGlmICgoZXJyb3IgYXMgTm9kZUpTLkVycm5vRXhjZXB0aW9uKS5jb2RlID09PSAnRU5PRU5UJykge1xuICAgICAgcmV0dXJuIDA7XG4gICAgfVxuICAgIHRocm93IGVycm9yO1xuICB9XG5cbiAgdHJ5IHtcbiAgICBjb25zdCBkZXN0U3RhdHMgPSBhd2FpdCBmcy5sc3RhdChkZXN0Tm9kZU1vZHVsZXMpO1xuICAgIGlmIChkZXN0U3RhdHMuaXNTeW1ib2xpY0xpbmsoKSkge1xuICAgICAgYXdhaXQgZnMudW5saW5rKGRlc3ROb2RlTW9kdWxlcyk7XG4gICAgfVxuICB9IGNhdGNoIChlcnJvcjogdW5rbm93bikge1xuICAgIGlmICgoZXJyb3IgYXMgTm9kZUpTLkVycm5vRXhjZXB0aW9uKS5jb2RlICE9PSAnRU5PRU5UJykge1xuICAgICAgdGhyb3cgZXJyb3I7XG4gICAgfVxuICB9XG5cbiAgYXdhaXQgZnMubWtkaXIoZGVzdE5vZGVNb2R1bGVzLCB7IHJlY3Vyc2l2ZTogdHJ1ZSB9KTtcblxuICBjb25zdCBlbnRyaWVzID0gYXdhaXQgZnMucmVhZGRpcihzb3VyY2VOb2RlTW9kdWxlcywgeyB3aXRoRmlsZVR5cGVzOiB0cnVlIH0pO1xuICBjb25zdCBjb3VudHMgPSBhd2FpdCBQcm9taXNlLmFsbChcbiAgICBlbnRyaWVzLm1hcChhc3luYyAoZW50cnkpOiBQcm9taXNlPG51bWJlcj4gPT4ge1xuICAgICAgY29uc3Qgc291cmNlUGF0aCA9IHBhdGguam9pbihzb3VyY2VOb2RlTW9kdWxlcywgZW50cnkubmFtZSk7XG4gICAgICBjb25zdCBkZXN0UGF0aCA9IHBhdGguam9pbihkZXN0Tm9kZU1vZHVsZXMsIGVudHJ5Lm5hbWUpO1xuXG4gICAgICBpZiAoZW50cnkuaXNTeW1ib2xpY0xpbmsoKSkge1xuICAgICAgICBjb25zdCB0YXJnZXQgPSBhd2FpdCBmcy5yZWFkbGluayhzb3VyY2VQYXRoKTtcbiAgICAgICAgaWYgKGlzSW50ZXJuYWxTeW1saW5rKHRhcmdldCkpIHtcbiAgICAgICAgICBhd2FpdCBmcy5zeW1saW5rKHRhcmdldCwgZGVzdFBhdGgpO1xuICAgICAgICAgIHJldHVybiAxO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGF3YWl0IGZzLnN5bWxpbmsoc291cmNlUGF0aCwgZGVzdFBhdGgpO1xuICAgICAgICAgIHJldHVybiAwO1xuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYgKGVudHJ5LmlzRGlyZWN0b3J5KCkgJiYgZW50cnkubmFtZS5zdGFydHNXaXRoKCdAJykpIHtcbiAgICAgICAgYXdhaXQgZnMubWtkaXIoZGVzdFBhdGgsIHsgcmVjdXJzaXZlOiB0cnVlIH0pO1xuICAgICAgICBjb25zdCBzY29wZUVudHJpZXMgPSBhd2FpdCBmcy5yZWFkZGlyKHNvdXJjZVBhdGgsIHsgd2l0aEZpbGVUeXBlczogdHJ1ZSB9KTtcbiAgICAgICAgY29uc3Qgc2NvcGVDb3VudHMgPSBhd2FpdCBQcm9taXNlLmFsbChcbiAgICAgICAgICBzY29wZUVudHJpZXMubWFwKGFzeW5jIChzY29wZUVudHJ5KTogUHJvbWlzZTxudW1iZXI+ID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHNjb3BlU291cmNlUGF0aCA9IHBhdGguam9pbihzb3VyY2VQYXRoLCBzY29wZUVudHJ5Lm5hbWUpO1xuICAgICAgICAgICAgY29uc3Qgc2NvcGVEZXN0UGF0aCA9IHBhdGguam9pbihkZXN0UGF0aCwgc2NvcGVFbnRyeS5uYW1lKTtcblxuICAgICAgICAgICAgaWYgKHNjb3BlRW50cnkuaXNTeW1ib2xpY0xpbmsoKSkge1xuICAgICAgICAgICAgICBjb25zdCB0YXJnZXQgPSBhd2FpdCBmcy5yZWFkbGluayhzY29wZVNvdXJjZVBhdGgpO1xuICAgICAgICAgICAgICBpZiAoaXNJbnRlcm5hbFN5bWxpbmsodGFyZ2V0KSkge1xuICAgICAgICAgICAgICAgIGF3YWl0IGZzLnN5bWxpbmsodGFyZ2V0LCBzY29wZURlc3RQYXRoKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gMTtcbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBhd2FpdCBmcy5zeW1saW5rKHNjb3BlU291cmNlUGF0aCwgc2NvcGVEZXN0UGF0aCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIDA7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIGF3YWl0IGZzLnN5bWxpbmsoc2NvcGVTb3VyY2VQYXRoLCBzY29wZURlc3RQYXRoKTtcbiAgICAgICAgICAgICAgcmV0dXJuIDA7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSlcbiAgICAgICAgKTtcbiAgICAgICAgcmV0dXJuIHNjb3BlQ291bnRzLnJlZHVjZSgoc3VtLCBjKSA9PiBzdW0gKyBjLCAwKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGF3YWl0IGZzLnN5bWxpbmsoc291cmNlUGF0aCwgZGVzdFBhdGgpO1xuICAgICAgICByZXR1cm4gMDtcbiAgICAgIH1cbiAgICB9KVxuICApO1xuXG4gIHJldHVybiBjb3VudHMucmVkdWNlKChzdW0sIGMpID0+IHN1bSArIGMsIDApO1xufVxuXG5pbnRlcmZhY2UgUmVyb3V0ZUFsbE5vZGVNb2R1bGVzT3B0aW9ucyB7XG4gIHNvdXJjZVJvb3Q6IHN0cmluZztcbiAgd29ya3RyZWVEaXI6IHN0cmluZztcbiAgcmVwb1Jvb3Q6IHN0cmluZztcbn1cblxuLyoqXG4gKiBSZXJvdXRlcyByb290IGFuZCBwZXItcGFja2FnZSBub2RlX21vZHVsZXMgZGlyZWN0b3JpZXMgaW50byB0aGUgd29ya3RyZWUuXG4gKlxuICogVGhlIG9wZXJhdGlvbiBpcyBza2lwcGVkIHdoZW4gdGhlIHJlcG9zaXRvcnkgaGFzIG5vIHdvcmtzcGFjZSBjb25maWd1cmF0aW9uLlxuICpcbiAqIEBwYXJhbSBvcHRzIC0gU291cmNlIHJvb3QsIGRlc3RpbmF0aW9uIHdvcmt0cmVlIHJvb3QsIGFuZCByZXBvIHJvb3QuXG4gKiBAcmV0dXJucyBUb3RhbCBudW1iZXIgb2YgcmVjcmVhdGVkIGludGVybmFsIHdvcmtzcGFjZSBzeW1saW5rcy5cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHJlcm91dGVBbGxOb2RlTW9kdWxlcyhvcHRzOiBSZXJvdXRlQWxsTm9kZU1vZHVsZXNPcHRpb25zKTogUHJvbWlzZTxudW1iZXI+IHtcbiAgY29uc3QgeyBzb3VyY2VSb290LCB3b3JrdHJlZURpciwgcmVwb1Jvb3QgfSA9IG9wdHM7XG5cbiAgbGV0IHBhY2thZ2VKc29uOiB7IHdvcmtzcGFjZXM/OiBzdHJpbmdbXSB9O1xuICB0cnkge1xuICAgIGNvbnN0IHBhY2thZ2VKc29uQ29udGVudCA9IGF3YWl0IGZzLnJlYWRGaWxlKHBhdGguam9pbihyZXBvUm9vdCwgJ3BhY2thZ2UuanNvbicpLCAndXRmLTgnKTtcbiAgICBwYWNrYWdlSnNvbiA9IEpTT04ucGFyc2UocGFja2FnZUpzb25Db250ZW50KTtcbiAgfSBjYXRjaCAoZXJyb3I6IHVua25vd24pIHtcbiAgICBpZiAoKGVycm9yIGFzIE5vZGVKUy5FcnJub0V4Y2VwdGlvbikuY29kZSA9PT0gJ0VOT0VOVCcpIHtcbiAgICAgIHJldHVybiAwO1xuICAgIH1cbiAgICB0aHJvdyBlcnJvcjtcbiAgfVxuXG4gIGlmICghcGFja2FnZUpzb24ud29ya3NwYWNlcykge1xuICAgIHJldHVybiAwO1xuICB9XG5cbiAgbGV0IHRvdGFsQ291bnQgPSAwO1xuXG4gIHRvdGFsQ291bnQgKz0gYXdhaXQgcmVyb3V0ZU5vZGVNb2R1bGVzKHtcbiAgICBzb3VyY2VOb2RlTW9kdWxlczogcGF0aC5qb2luKHNvdXJjZVJvb3QsICdub2RlX21vZHVsZXMnKSxcbiAgICBkZXN0Tm9kZU1vZHVsZXM6IHBhdGguam9pbih3b3JrdHJlZURpciwgJ25vZGVfbW9kdWxlcycpXG4gIH0pO1xuXG4gIGNvbnN0IHBhY2thZ2VzRGlyID0gcGF0aC5qb2luKHNvdXJjZVJvb3QsICdwYWNrYWdlcycpO1xuICB0cnkge1xuICAgIGNvbnN0IHBhY2thZ2VFbnRyaWVzID0gYXdhaXQgZnMucmVhZGRpcihwYWNrYWdlc0RpciwgeyB3aXRoRmlsZVR5cGVzOiB0cnVlIH0pO1xuICAgIGZvciAoY29uc3QgZW50cnkgb2YgcGFja2FnZUVudHJpZXMpIHtcbiAgICAgIGlmIChlbnRyeS5pc0RpcmVjdG9yeSgpKSB7XG4gICAgICAgIGNvbnN0IHBrZ05vZGVNb2R1bGVzID0gcGF0aC5qb2luKHBhY2thZ2VzRGlyLCBlbnRyeS5uYW1lLCAnbm9kZV9tb2R1bGVzJyk7XG4gICAgICAgIGxldCBub2RlTW9kdWxlc0V4aXN0cyA9IGZhbHNlO1xuICAgICAgICB0cnkge1xuICAgICAgICAgIGF3YWl0IGZzLmxzdGF0KHBrZ05vZGVNb2R1bGVzKTtcbiAgICAgICAgICBub2RlTW9kdWxlc0V4aXN0cyA9IHRydWU7XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yOiB1bmtub3duKSB7XG4gICAgICAgICAgaWYgKChlcnJvciBhcyBOb2RlSlMuRXJybm9FeGNlcHRpb24pLmNvZGUgIT09ICdFTk9FTlQnKSB7XG4gICAgICAgICAgICB0aHJvdyBlcnJvcjtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKG5vZGVNb2R1bGVzRXhpc3RzKSB7XG4gICAgICAgICAgY29uc3QgZGVzdFBhY2thZ2VEaXIgPSBwYXRoLmpvaW4od29ya3RyZWVEaXIsICdwYWNrYWdlcycsIGVudHJ5Lm5hbWUpO1xuICAgICAgICAgIGF3YWl0IGZzLm1rZGlyKGRlc3RQYWNrYWdlRGlyLCB7IHJlY3Vyc2l2ZTogdHJ1ZSB9KTtcbiAgICAgICAgICB0b3RhbENvdW50ICs9IGF3YWl0IHJlcm91dGVOb2RlTW9kdWxlcyh7XG4gICAgICAgICAgICBzb3VyY2VOb2RlTW9kdWxlczogcGtnTm9kZU1vZHVsZXMsXG4gICAgICAgICAgICBkZXN0Tm9kZU1vZHVsZXM6IHBhdGguam9pbihkZXN0UGFja2FnZURpciwgJ25vZGVfbW9kdWxlcycpXG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH0gY2F0Y2ggKGVycm9yOiB1bmtub3duKSB7XG4gICAgaWYgKChlcnJvciBhcyBOb2RlSlMuRXJybm9FeGNlcHRpb24pLmNvZGUgIT09ICdFTk9FTlQnKSB7XG4gICAgICB0aHJvdyBlcnJvcjtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gdG90YWxDb3VudDtcbn1cblxuaW50ZXJmYWNlIFVwZGF0ZUdpdEV4Y2x1ZGVPcHRpb25zIHtcbiAgd29ya3RyZWVEaXI6IHN0cmluZztcbiAgcmVwb1Jvb3Q6IHN0cmluZztcbiAgZGlyZWN0b3JpZXM6IHN0cmluZ1tdO1xuICBmaWxlczogc3RyaW5nW107XG59XG5cbi8qKlxuICogQXBwZW5kcyBzeW1saW5rZWQgaWdub3JlZCBwYXRocyB0byB0aGUgd29ya3RyZWUtc3BlY2lmaWMgZ2l0IGV4Y2x1ZGUgZmlsZS5cbiAqXG4gKiBBbHNvIGVuYWJsZXMgYGV4dGVuc2lvbnMud29ya3RyZWVDb25maWdgIGFuZCBzZXRzIHdvcmt0cmVlLWxvY2FsXG4gKiBgY29yZS5leGNsdWRlc0ZpbGVgIHNvIGdpdCBzdGF0dXMgaW4gdGhlIHdvcmt0cmVlIGlnbm9yZXMgaW5qZWN0ZWQgbGlua3MuXG4gKlxuICogQHBhcmFtIG9wdHMgLSBXb3JrdHJlZSBwYXRoLCByZXBvIHJvb3QsIGFuZCBpZ25vcmVkIHBhdGggY2FuZGlkYXRlcy5cbiAqIEByZXR1cm5zIE5vIHZhbHVlLlxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gdXBkYXRlR2l0RXhjbHVkZShvcHRzOiBVcGRhdGVHaXRFeGNsdWRlT3B0aW9ucyk6IFByb21pc2U8dm9pZD4ge1xuICBjb25zdCB7IHdvcmt0cmVlRGlyLCByZXBvUm9vdCwgZGlyZWN0b3JpZXMsIGZpbGVzIH0gPSBvcHRzO1xuXG4gIGNvbnN0IHsgc3Rkb3V0OiBnaXREaXIgfSA9IGF3YWl0IGV4ZWNGaWxlQXN5bmMoJ2dpdCcsIFsnLUMnLCB3b3JrdHJlZURpciwgJ3Jldi1wYXJzZScsICctLWdpdC1kaXInXSwge1xuICAgIHRpbWVvdXQ6IDVfMDAwXG4gIH0pO1xuICBjb25zdCBleGNsdWRlUGF0aCA9IHBhdGguam9pbihnaXREaXIudHJpbSgpLCAnaW5mbycsICdleGNsdWRlJyk7XG4gIGF3YWl0IGZzLm1rZGlyKHBhdGguZGlybmFtZShleGNsdWRlUGF0aCksIHsgcmVjdXJzaXZlOiB0cnVlIH0pO1xuXG4gIGNvbnN0IGxpbmVzID0gWycjIFN5bWxpbmtzIGNyZWF0ZWQgYnkgaW5zdGFudC13b3JrdHJlZSddO1xuXG4gIGZvciAoY29uc3QgZGlyIG9mIGRpcmVjdG9yaWVzKSB7XG4gICAgaWYgKCFkaXIpIGNvbnRpbnVlO1xuICAgIHRyeSB7XG4gICAgICBjb25zdCBzdGF0cyA9IGF3YWl0IGZzLmxzdGF0KHBhdGguam9pbih3b3JrdHJlZURpciwgZGlyKSk7XG4gICAgICBpZiAoc3RhdHMuaXNTeW1ib2xpY0xpbmsoKSkgbGluZXMucHVzaChkaXIpO1xuICAgIH0gY2F0Y2ggKGVycm9yOiB1bmtub3duKSB7XG4gICAgICBpZiAoKGVycm9yIGFzIE5vZGVKUy5FcnJub0V4Y2VwdGlvbikuY29kZSAhPT0gJ0VOT0VOVCcpIHtcbiAgICAgICAgdGhyb3cgZXJyb3I7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgZm9yIChjb25zdCBmaWxlIG9mIGZpbGVzKSB7XG4gICAgaWYgKCFmaWxlKSBjb250aW51ZTtcbiAgICB0cnkge1xuICAgICAgY29uc3Qgc3RhdHMgPSBhd2FpdCBmcy5sc3RhdChwYXRoLmpvaW4od29ya3RyZWVEaXIsIGZpbGUpKTtcbiAgICAgIGlmIChzdGF0cy5pc1N5bWJvbGljTGluaygpKSBsaW5lcy5wdXNoKGZpbGUpO1xuICAgIH0gY2F0Y2ggKGVycm9yOiB1bmtub3duKSB7XG4gICAgICBpZiAoKGVycm9yIGFzIE5vZGVKUy5FcnJub0V4Y2VwdGlvbikuY29kZSAhPT0gJ0VOT0VOVCcpIHtcbiAgICAgICAgdGhyb3cgZXJyb3I7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgYXdhaXQgZnMuYXBwZW5kRmlsZShleGNsdWRlUGF0aCwgYCR7bGluZXMuam9pbignXFxuJyl9XFxuYCk7XG5cbiAgdHJ5IHtcbiAgICBhd2FpdCBleGVjRmlsZUFzeW5jKCdnaXQnLCBbJy1DJywgcmVwb1Jvb3QsICdjb25maWcnLCAnZXh0ZW5zaW9ucy53b3JrdHJlZUNvbmZpZycsICd0cnVlJ10sIHsgdGltZW91dDogNV8wMDAgfSk7XG4gIH0gY2F0Y2ggKGVycm9yOiB1bmtub3duKSB7XG4gICAgcHJvY2Vzcy5zdGRlcnIud3JpdGUoXG4gICAgICBgY3JlYXRlLXdvcmt0cmVlOiBmYWlsZWQgdG8gc2V0IHdvcmt0cmVlQ29uZmlnIGV4dGVuc2lvbjogJHtlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6IFN0cmluZyhlcnJvcil9XFxuYFxuICAgICk7XG4gIH1cblxuICB0cnkge1xuICAgIGF3YWl0IGV4ZWNGaWxlQXN5bmMoJ2dpdCcsIFsnLUMnLCB3b3JrdHJlZURpciwgJ2NvbmZpZycsICctLXdvcmt0cmVlJywgJ2NvcmUuZXhjbHVkZXNGaWxlJywgZXhjbHVkZVBhdGhdLCB7XG4gICAgICB0aW1lb3V0OiA1XzAwMFxuICAgIH0pO1xuICB9IGNhdGNoIChlcnJvcjogdW5rbm93bikge1xuICAgIHByb2Nlc3Muc3RkZXJyLndyaXRlKFxuICAgICAgYGNyZWF0ZS13b3JrdHJlZTogZmFpbGVkIHRvIHNldCBjb3JlLmV4Y2x1ZGVzRmlsZTogJHtlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6IFN0cmluZyhlcnJvcil9XFxuYFxuICAgICk7XG4gIH1cbn1cbiIsICIvKipcbiAqIENvZGV4IGFjdGlvbiBmb3IgQ2FyZHMgd29ya2Zsb3dzLlxuICpcbiAqIFNwYXducyB0aGUgYGNvZGV4YCBDTEkgZm9yIHRoZSBjdXJyZW50IGNhcmQuIFRoZSBzZXNzaW9uIGFsd2F5cyBydW5zXG4gKiBpbnRlcmFjdGl2ZWx5IHNvIENvZGV4IGNhbiBjb250aW51ZSB3b3JrIGRpcmVjdGx5IGluIHRoZSB0ZXJtaW5hbCB3aGlsZVxuICogcmVjZWl2aW5nIGV4cGxpY2l0IGluc3RydWN0aW9ucyBmb3IgbG9hZGluZyB0aGUgcGFja2FnZWQgcnVudGltZSBza2lsbC5cbiAqXG4gKiBAc3VtbWFyeSBDb2RleCBhY3Rpb24gZm9yIENhcmRzIHdvcmtmbG93c1xuICogQG1vZHVsZVxuICovXG5cbmltcG9ydCB7IHR5cGUgQWN0aW9uQ29udGV4dCwgdHlwZSBBY3Rpb25JbnB1dCwgZGVmaW5lQWN0aW9uIH0gZnJvbSAnQGNhcmRzL3Nkay9jb25maWcnO1xuaW1wb3J0IHsgc3Bhd25Db2RleFNlc3Npb24gfSBmcm9tICcuLi9saWIvY29kZXgtc2Vzc2lvbi5qcyc7XG5cbi8qKlxuICogQ29kZXggYWN0aW9uIGhhbmRsZXIuXG4gKlxuICogU3RhcnRzIGFuIGludGVyYWN0aXZlIENvZGV4IHNlc3Npb24gcm9vdGVkIGF0IHRoZSBjYXJkIHdvcmt0cmVlIHdpdGggdGhlXG4gKiBwYWNrYWdlZCBgY29kZXgtcnVudGltZWAgcGx1Z2luIGVuYWJsZWQgZm9yIGBjYXJkcy1ydW50aW1lYCBza2lsbCBkaXNjb3ZlcnkuXG4gKi9cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUFjdGlvbihcbiAge1xuICAgIGFjdGlvbk5hbWU6ICdDb2RleCcsXG4gICAgZGVzY3JpcHRpb246ICdTdGFydCBhIENvZGV4IHNlc3Npb24gZm9yIHRoZSBjYXJkJyxcbiAgICBzdXBwb3J0c0JhY2tncm91bmRNb2RlOiBmYWxzZSxcbiAgICB0aW1lb3V0OiAzNjAwMDAwXG4gIH0sXG4gIGFzeW5jIChpbnB1dDogQWN0aW9uSW5wdXQsIGNvbnRleHQ6IEFjdGlvbkNvbnRleHQpID0+IHtcbiAgICBhd2FpdCBzcGF3bkNvZGV4U2Vzc2lvbihpbnB1dCwgY29udGV4dCwge1xuICAgICAgcHJvbXB0OiAnVXNlIHRoZSBgY2FyZHMtcnVudGltZWAgc2tpbGwgZm9yIGNhcmQgcmVwb3NpdG9yeSBjb252ZW50aW9ucywgdGhlbiBjb250aW51ZSB3b3JrIG9uIHRoZSBjYXJkLidcbiAgICB9KTtcbiAgfVxuKTtcbiIsICJcbmltcG9ydCBoYW5kbGVyIGZyb20gJy4vY29kZXgudHMnO1xuaW1wb3J0IHsgZXhlY3V0ZUNvbW1hbmQgfSBmcm9tICcuLi8uLi8uLi9zZGsvc3JjL2NvbmZpZy9ydW50aW1lLnRzJztcblxuaWYgKCFwcm9jZXNzLmFyZ3YuaW5jbHVkZXMoJy0tYnJhbmNoLWNsZWFudXAnKSkge1xuICBleGVjdXRlQ29tbWFuZChoYW5kbGVyKTtcbn1cbiJdLAogICJtYXBwaW5ncyI6ICI7Ozs7QUF5TE8sU0FBUyxhQUNkLFFBQ0EsU0FDZ0M7QUFDaEMsUUFBTSxLQUFLLE9BQU8sT0FBb0IsWUFBMEM7QUFDOUUsVUFBTSxRQUFRLE9BQU8sT0FBTztBQUFBLEVBQzlCO0FBRUEsS0FBRyxjQUFjO0FBQ2pCLEtBQUcsS0FBSyxPQUFPO0FBQ2YsS0FBRyxhQUFhLE9BQU87QUFDdkIsS0FBRyxjQUFjLE9BQU87QUFDeEIsS0FBRyxPQUFPLE9BQU87QUFDakIsS0FBRyx5QkFBeUIsT0FBTztBQUNuQyxLQUFHLGtCQUFrQixPQUFPO0FBQzVCLEtBQUcsVUFBVSxPQUFPO0FBQ3BCLEtBQUcsYUFBYSxPQUFPO0FBRXZCLFNBQU87QUFDVDs7O0FDNUxBLFNBQVMsb0JBQW9CO0FBY3RCLElBQU0saUJBQWlCO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQUs1QixTQUFTO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQU1ULGFBQWE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBTWIsYUFBYTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQU9iLGdCQUFnQjtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFNaEIsY0FBYztBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFNZCxrQkFBa0I7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFPbEIsY0FBYztBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFNZCxXQUFXO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQU1YLGNBQWM7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBTWQsV0FBVztBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFNWCxXQUFXO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQU1YLFdBQVc7QUFBQTtBQUFBO0FBQUE7QUFBQTtB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LFFBQVEsS0FBSyxNQUFNLFlBQVk7QUFFM0QsUUFBTSxRQUFzQkMsT0FBTSxTQUFTLE1BQU07QUFBQSxJQUMvQztBQUFBLElBQ0EsT0FBTztBQUFBLElBQ1AsS0FBSztBQUFBLE1BQ0gsR0FBRyxRQUFRO0FBQUEsTUFDWCxnQkFBZ0I7QUFBQSxNQUNoQixhQUFhO0FBQUEsTUFDYixlQUFlO0FBQUEsTUFDZixrQkFBa0I7QUFBQSxJQUNwQjtBQUFBLEVBQ0YsQ0FBQztBQUVELFVBQVEsU0FBUyxNQUFNO0FBQ3JCLFlBQVEsT0FBTyxLQUFLLEdBQUcsTUFBTSxVQUFVLHNDQUFzQztBQUM3RSxVQUFNLEtBQUssU0FBUztBQUFBLEVBQ3RCLENBQUM7QUFFRCxRQUFNLFdBQVcsTUFBTSxJQUFJLFFBQXVCLENBQUNDLGFBQVk7QUFDN0QsVUFBTSxHQUFHLFNBQVNBLFFBQU87QUFBQSxFQUMzQixDQUFDO0FBRUQsVUFBUSxPQUFPLEtBQUssR0FBRyxNQUFNLFVBQVUscUJBQXFCLEVBQUUsU0FBUyxDQUFDO0FBRXhFLE1BQUk7QUFDRiw4QkFBMEI7QUFBQSxNQUN4QixRQUFRLE1BQU07QUFBQSxNQUNkLFVBQVUsTUFBTTtBQUFBLE1BQ2hCLFlBQVksTUFBTTtBQUFBLE1BQ2xCLGdCQUFnQixNQUFNO0FBQUEsSUFDeEIsQ0FBQztBQUFBLEVBQ0gsU0FBUyxPQUFPO0FBQ2QsWUFBUSxPQUFPLEtBQUssc0RBQXNEO0FBQUEsTUFDeEUsT0FBTyxhQUFhLEtBQUs7QUFBQSxJQUMzQixDQUFDO0FBQUEsRUFDSDtBQUNGOzs7QU01TUEsSUFBTyxnQkFBUTtBQUFBLEVBQ2I7QUFBQSxJQUNFLFlBQVk7QUFBQSxJQUNaLGFBQWE7QUFBQSxJQUNiLHdCQUF3QjtBQUFBLElBQ3hCLFNBQVM7QUFBQSxFQUNYO0FBQUEsRUFDQSxPQUFPLE9BQW9CLFlBQTJCO0FBQ3BELFVBQU0sa0JBQWtCLE9BQU8sU0FBUztBQUFBLE1BQ3RDLFFBQVE7QUFBQSxJQUNWLENBQUM7QUFBQSxFQUNIO0FBQ0Y7OztBQzVCQSxJQUFJLENBQUMsUUFBUSxLQUFLLFNBQVMsa0JBQWtCLEdBQUc7QUFDOUMsaUJBQWUsYUFBTztBQUN4QjsiLAogICJuYW1lcyI6IFsicmVzb2x2ZSIsICJzcGF3biIsICJmcyIsICJwYXRoIiwgInBhdGgiLCAicmVzb2x2ZSIsICJzcGF3biIsICJwYXRoIiwgImV4ZWNGaWxlIiwgImZzIiwgInBhdGgiLCAicHJvbWlzaWZ5IiwgImV4ZWNGaWxlQXN5bmMiLCAicHJvbWlzaWZ5IiwgImV4ZWNGaWxlIiwgImV4ZWNGaWxlQXN5bmMiLCAibG9nZ2VyIiwgInJlc3VsdCIsICJzcGF3biIsICJsb2dnZXIiLCAic3Bhd24iLCAicmVzb2x2ZSJdCn0K
