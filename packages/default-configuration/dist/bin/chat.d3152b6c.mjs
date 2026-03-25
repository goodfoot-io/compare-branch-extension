import { createRequire as __createRequire } from 'node:module';
const require = __createRequire(import.meta.url);

// src/actions/chat.ts
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

// src/actions/chat.ts
var chat_default = defineAction(
  {
    actionName: "Chat",
    description: "Start a chat session for the card",
    supportsBackgroundMode: false,
    timeout: 36e5
  },
  async (input, context) => {
    await spawnClaudeSession(input, context, {
      prompt: "Load the `runtime:card-repo` and `runtime:chat` skills then follow the `<instructions>`.",
      sessionId: randomUUID(),
      resume: false,
      supportsSwitchToInteractive: false
    });
  }
);

// src/actions/hook-wrapper.ts
if (!process.argv.includes("--branch-cleanup")) {
  executeCommand(chat_default);
}
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vLi4vc3JjL2FjdGlvbnMvY2hhdC50cyIsICIuLi8uLi8uLi9zZGsvc3JjL2NvbmZpZy9mYWN0b3JpZXMvYWN0aW9uLnRzIiwgIi4uLy4uLy4uL3Nkay9zcmMvY29uZmlnL2Vudi50cyIsICIuLi8uLi8uLi9zZGsvc3JjL2NvbmZpZy9leGl0LWNvZGVzLnRzIiwgIi4uLy4uLy4uL3Nkay9zcmMvY29uZmlnL2xvZ2dlci50cyIsICIuLi8uLi8uLi9zZGsvc3JjL2NvbmZpZy9zb2NrZXQtY2xpZW50LnRzIiwgIi4uLy4uLy4uL3Nkay9zcmMvY29uZmlnL3J1bnRpbWUudHMiLCAiLi4vLi4vc3JjL2xpYi9jbGF1ZGUtc2Vzc2lvbi50cyIsICIuLi8uLi8uLi9zZGsvc3JjL2NsaWVudC90eXBlcy9lcnJvcnMudHMiLCAiLi4vLi4vLi4vc2RrL3NyYy9jbGllbnQvY2FyZHNDbGllbnQudHMiLCAiLi4vLi4vLi4vc2RrL3NyYy9tYXJrZXRwbGFjZS50cyIsICIuLi8uLi8uLi9zZGsvc3JjL3dvcmt0cmVlLnRzIiwgIi4uLy4uL3NyYy9saWIvYnJhbmNoLWNsZWFudXAtd2F0Y2hlci50cyIsICIuLi8uLi9zcmMvYWN0aW9ucy9ob29rLXdyYXBwZXIudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbIi8qKlxuICogQ2hhdCBhY3Rpb24gZm9yIENsYXVkZSBDb2RlIHdvcmtmbG93cy5cbiAqXG4gKiBTcGF3bnMgdGhlIGBjbGF1ZGVgIENMSSB3aXRoIHRoZSBgcnVudGltZTpjaGF0YCBza2lsbCBmb3IgdGhlIGN1cnJlbnQgY2FyZC5cbiAqIFRoZSBwcm9jZXNzIGFsd2F5cyBydW5zIGludGVyYWN0aXZlbHkgXHUyMDE0IHN0ZGlvIGlzIGluaGVyaXRlZCBzbyB0aGUgdXNlciBnZXRzXG4gKiBkaXJlY3QgdGVybWluYWwgY29udHJvbC4gQmFja2dyb3VuZCBtb2RlIGlzIG5vdCBzdXBwb3J0ZWQgYmVjYXVzZSBjaGF0XG4gKiByZXF1aXJlcyBhY3RpdmUgdXNlciBwYXJ0aWNpcGF0aW9uLlxuICpcbiAqIFRoZSBhY3Rpb24gYXdhaXRzIHByb2Nlc3MgZXhpdCBiZWZvcmUgcmVzb2x2aW5nLCBzbyB0aGUgdGVybWluYWwgY2xvc2VzXG4gKiBvbmx5IGFmdGVyIENsYXVkZSBmaW5pc2hlcyBhbmQgY2xlYW51cCBpcyBjb21wbGV0ZS5cbiAqXG4gKiBAc3VtbWFyeSBDaGF0IGFjdGlvbiBmb3IgQ2xhdWRlIENvZGUgd29ya2Zsb3dzXG4gKiBAbW9kdWxlXG4gKiBAc2VlIHtAbGluayBkZWZpbmVBY3Rpb259IGZvciBmYWN0b3J5IGJlaGF2aW9yIGFuZCBtZXRhZGF0YSBhdHRhY2htZW50XG4gKi9cblxuaW1wb3J0IHsgcmFuZG9tVVVJRCB9IGZyb20gJ25vZGU6Y3J5cHRvJztcbmltcG9ydCB7IHR5cGUgQWN0aW9uQ29udGV4dCwgdHlwZSBBY3Rpb25JbnB1dCwgZGVmaW5lQWN0aW9uIH0gZnJvbSAnQGNhcmRzL3Nkay9jb25maWcnO1xuaW1wb3J0IHsgc3Bhd25DbGF1ZGVTZXNzaW9uIH0gZnJvbSAnLi4vbGliL2NsYXVkZS1zZXNzaW9uLmpzJztcblxuLyoqXG4gKiBDaGF0IGFjdGlvbiBoYW5kbGVyLlxuICpcbiAqIFNwYXducyB0aGUgYGNsYXVkZWAgQ0xJIGFzIGEgY2hpbGQgcHJvY2VzcyB1c2luZyB0aGUgY2hhdCBza2lsbC5cbiAqIFRoZSBwcm9jZXNzIGxpZmVjeWNsZSBpcyB0aWVkIHRvIHRoZSBhY3Rpb246IGNhbmNlbGxhdGlvbiBzZW5kcyBTSUdURVJNLlxuICogU2Vzc2lvbiByZXN1bWUgaXMgbm90IHN1cHBvcnRlZCBcdTIwMTQgZWFjaCBjaGF0IGFsd2F5cyBzdGFydHMgZnJlc2guXG4gKi9cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUFjdGlvbihcbiAge1xuICAgIGFjdGlvbk5hbWU6ICdDaGF0JyxcbiAgICBkZXNjcmlwdGlvbjogJ1N0YXJ0IGEgY2hhdCBzZXNzaW9uIGZvciB0aGUgY2FyZCcsXG4gICAgc3VwcG9ydHNCYWNrZ3JvdW5kTW9kZTogZmFsc2UsXG4gICAgdGltZW91dDogMzYwMDAwMFxuICB9LFxuICBhc3luYyAoaW5wdXQ6IEFjdGlvbklucHV0LCBjb250ZXh0OiBBY3Rpb25Db250ZXh0KSA9PiB7XG4gICAgYXdhaXQgc3Bhd25DbGF1ZGVTZXNzaW9uKGlucHV0LCBjb250ZXh0LCB7XG4gICAgICBwcm9tcHQ6ICdMb2FkIHRoZSBgcnVudGltZTpjYXJkLXJlcG9gIGFuZCBgcnVudGltZTpjaGF0YCBza2lsbHMgdGhlbiBmb2xsb3cgdGhlIGA8aW5zdHJ1Y3Rpb25zPmAuJyxcbiAgICAgIHNlc3Npb25JZDogcmFuZG9tVVVJRCgpLFxuICAgICAgcmVzdW1lOiBmYWxzZSxcbiAgICAgIHN1cHBvcnRzU3dpdGNoVG9JbnRlcmFjdGl2ZTogZmFsc2VcbiAgICB9KTtcbiAgfVxuKTtcbiIsICIvKipcbiAqIEZhY3RvcnkgZnVuY3Rpb24gZm9yIGNyZWF0aW5nIGFjdGlvbiBoYW5kbGVycy5cbiAqXG4gKiBUaGlzIGlzIHRoZSBwcmltYXJ5IGF1dGhvcmluZyBBUEkgZm9yIGFjdGlvbiBkZXZlbG9wZXJzLiBJdCB3cmFwcyBhIGhhbmRsZXJcbiAqIGZ1bmN0aW9uIGFuZCBhdHRhY2hlcyBtZXRhZGF0YSBmb3Igc2V0dGluZ3MuanNvbiBnZW5lcmF0aW9uLiBUaGUgU2FtZVNoYXBlXG4gKiB1dGlsaXR5IHByb3ZpZGVzIGNvbXBpbGUtdGltZSB0eXBvIGRldGVjdGlvbi5cbiAqXG4gKlxuICogQHN1bW1hcnkgRmFjdG9yeSBmdW5jdGlvbiBmb3IgY3JlYXRpbmcgYWN0aW9uIGhhbmRsZXJzXG4gKiBAbW9kdWxlXG4gKi9cblxuaW1wb3J0IHR5cGUgeyBBY3Rpb25Db21tYW5kIH0gZnJvbSAnLi4vY29tbWFuZC10eXBlcy5qcyc7XG5pbXBvcnQgdHlwZSB7IEFjdGlvbkNvbnRleHQsIEFjdGlvbklucHV0IH0gZnJvbSAnLi4vaW5wdXRzLmpzJztcbmltcG9ydCB0eXBlIHsgU2FtZVNoYXBlIH0gZnJvbSAnLi4vdHlwZS11dGlscy5qcyc7XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIENvbmZpZ3VyYXRpb24gVHlwZXNcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuLyoqXG4gKiBDb25maWd1cmF0aW9uIGZvciB7QGxpbmsgZGVmaW5lQWN0aW9ufSBmYWN0b3J5LlxuICpcbiAqIEFsbCBmaWVsZHMgZXhjZXB0IGBhY3Rpb25OYW1lYCBhcmUgb3B0aW9uYWwgYW5kIGZvcndhcmRlZCB0byBzZXR0aW5ncy5qc29uLlxuICogVGhlIENMSSBleHRyYWN0cyB0aGlzIG1ldGFkYXRhIHZpYSBBU1QgYW5hbHlzaXMsIHNvIHZhbHVlcyBtdXN0IGJlIHN0cmluZ1xuICogbGl0ZXJhbHMgb3IgYm9vbGVhbi9udW1iZXIgbGl0ZXJhbHMgaW4gdGhlIHNvdXJjZSBjb2RlLlxuICpcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBjb25zdCBjb25maWc6IEFjdGlvbkNvbmZpZyA9IHtcbiAqICAgYWN0aW9uTmFtZTogJ0xhdW5jaCBDbGF1ZGUnLFxuICogICBkZXNjcmlwdGlvbjogJ1N0YXJ0IGEgQ2xhdWRlIGNvZGluZyBzZXNzaW9uJyxcbiAqICAgaWNvbjogJy4vaWNvbnMvY2xhdWRlLnN2ZycsXG4gKiAgIHN1cHBvcnRzQmFja2dyb3VuZE1vZGU6IHRydWUsXG4gKiAgIHRpbWVvdXQ6IDMwMDAwXG4gKiB9O1xuICogYGBgXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgQWN0aW9uQ29uZmlnIHtcbiAgLyoqXG4gICAqIFN0YWJsZSBpZGVudGlmaWVyIGZvciB0aGUgYWN0aW9uIHVzZWQgaW4gdGVsZW1ldHJ5LCBsb2NhbGl6YXRpb24sIGFuZCBBUEkgbG9va3Vwcy5cbiAgICpcbiAgICogU2hvdWxkIGJlIGxvd2VyY2FzZSB3aXRoIGh5cGhlbnMgKGUuZy4sICdsYXVuY2gtY2xhdWRlJywgJ3J1bi10ZXN0cycpLlxuICAgKiBJZiBvbWl0dGVkLCB0aGUgQ0xJIGdlbmVyYXRlcyBhbiBJRCBieSBzbHVnaWZ5aW5nIGBhY3Rpb25OYW1lYC5cbiAgICovXG4gIGlkPzogc3RyaW5nO1xuXG4gIC8qKlxuICAgKiBUaGUgYWN0aW9uIG5hbWUgdXNlZCB0byBpZGVudGlmeSB0aGUgYWN0aW9uIGluIHNldHRpbmdzLmpzb24uXG4gICAqXG4gICAqIFRoaXMgbmFtZSBhcHBlYXJzIGluIHRoZSBVSS4gS2VlcCBpdCBjb25jaXNlIGJ1dCBkZXNjcmlwdGl2ZS5cbiAgICovXG4gIGFjdGlvbk5hbWU6IHN0cmluZztcblxuICAvKipcbiAgICogSHVtYW4tcmVhZGFibGUgZGVzY3JpcHRpb24gc2hvd24gaW4gYnV0dG9uIHRvb2x0aXAuXG4gICAqXG4gICAqIEV4cGxhaW4gd2hhdCB0aGUgYWN0aW9uIGRvZXMgaW4gYSBmZXcgd29yZHMuIFNob3duIG9uIGhvdmVyIGluIHRoZSBVSS5cbiAgICovXG4gIGRlc2NyaXB0aW9uPzogc3RyaW5nO1xuXG4gIC8qKlxuICAgKiBQYXRoIHRvIGljb24gZmlsZSBmb3IgdGhlIGFjdGlvbiBidXR0b24uXG4gICAqXG4gICAqIFBhdGhzIGFyZSByZWxhdGl2ZSB0byB0aGUgc2V0dGluZ3MuanNvbiBmaWxlIGxvY2F0aW9uLlxuICAgKiBTVkcgZm9ybWF0IHJlY29tbWVuZGVkIGZvciBjcmlzcCByZW5kZXJpbmcgYXQgYW55IHNpemUuXG4gICAqL1xuICBpY29uPzogc3RyaW5nO1xuXG4gIC8qKlxuICAgKiBXaGV0aGVyIHRvIHNob3cgdGhlIGV4ZWN1dGlvbiBtb2RlIHRvZ2dsZSBpbiB0aGUgVUkuXG4gICAqXG4gICAqIFdoZW4gdHJ1ZSwgdXNlcnMgY2FuIGNob29zZSBiZXR3ZWVuIGludGVyYWN0aXZlIGFuZCBiYWNrZ3JvdW5kIG1vZGVzLlxuICAgKiBXaGVuIGZhbHNlIChkZWZhdWx0KSwgdGhlIGFjdGlvbiBhbHdheXMgcnVucyBpbiBpbnRlcmFjdGl2ZSBtb2RlLlxuICAgKi9cbiAgc3VwcG9ydHNCYWNrZ3JvdW5kTW9kZT86IGJvb2xlYW47XG5cbiAgLyoqXG4gICAqIFdoZXRoZXIgbXVsdGlwbGUgaW5zdGFuY2VzIGNhbiBydW4gc2ltdWx0YW5lb3VzbHkgb24gdGhlIHNhbWUgY2FyZC5cbiAgICpcbiAgICogV2hlbiBmYWxzZSAoZGVmYXVsdCksIHN0YXJ0aW5nIHRoZSBhY3Rpb24gd2hpbGUgaXQncyBydW5uaW5nIHdpbGwgYmVcbiAgICogYmxvY2tlZC4gU2V0IHRvIHRydWUgZm9yIGlkZW1wb3RlbnQgYWN0aW9ucyB0aGF0IGNhbiBzYWZlbHkgb3ZlcmxhcC5cbiAgICovXG4gIGFsbG93Q29uY3VycmVudD86IGJvb2xlYW47XG5cbiAgLyoqXG4gICAqIE1heGltdW0gZXhlY3V0aW9uIHRpbWUgaW4gbWlsbGlzZWNvbmRzLlxuICAgKlxuICAgKiBJZiB0aGUgYWN0aW9uIGV4Y2VlZHMgdGhpcyB0aW1lb3V0LCB0aGUgcnVudGltZSB3aWxsIHRlcm1pbmF0ZSBpdC5cbiAgICogT21pdCB0byB1c2UgdGhlIHBsYXRmb3JtJ3MgZGVmYXVsdCB0aW1lb3V0IHBvbGljeS5cbiAgICovXG4gIHRpbWVvdXQ/OiBudW1iZXI7XG5cbiAgLyoqXG4gICAqIEhhbmRsZXIgc291cmNlIGZpbGUgcGF0aCwgaW5qZWN0ZWQgYnkgdGhlIGBpbmplY3RTb3VyY2VQYXRoYCBlc2J1aWxkXG4gICAqIHBsdWdpbiBkdXJpbmcgY29uZmlnIGxvYWRpbmcuIERvIG5vdCBzZXQgbWFudWFsbHkuXG4gICAqXG4gICAqIEBpbnRlcm5hbFxuICAgKi9cbiAgc291cmNlUGF0aD86IHN0cmluZztcbn1cblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gSGFuZGxlciBUeXBlc1xuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4vKipcbiAqIEhhbmRsZXIgZnVuY3Rpb24gc2lnbmF0dXJlIGZvciBhY3Rpb24gZXZlbnRzLlxuICpcbiAqIFRocm93aW5nIGFuIGVycm9yIHNpZ25hbHMgYWN0aW9uIGZhaWx1cmUuIFRoZSBlcnJvciBtZXNzYWdlIGlzIGxvZ2dlZCBhbmRcbiAqIHN1cmZhY2VkIHRvIHRoZSB1c2VyLiBGb3IgZXhwZWN0ZWQgZXJyb3JzLCB0aHJvdyB3aXRoIGEgZGVzY3JpcHRpdmUgbWVzc2FnZS5cbiAqXG4gKiBAcGFyYW0gaW5wdXQgLSBBY3Rpb24gaW5wdXQgcGF5bG9hZCBmcm9tIGVudmlyb25tZW50IHZhcmlhYmxlc1xuICogQHBhcmFtIGNvbnRleHQgLSBSdW50aW1lIGNvbnRleHQgd2l0aCBsb2dnZXIsIGN3ZCwgYW5kIGNhbGxiYWNrIG1ldGhvZHNcbiAqIEByZXR1cm5zIFByb21pc2UgdGhhdCByZXNvbHZlcyB3aGVuIHRoZSBhY3Rpb24gY29tcGxldGVzXG4gKlxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGNvbnN0IGhhbmRsZXI6IEFjdGlvbkhhbmRsZXIgPSBhc3luYyAoaW5wdXQsIHsgbG9nZ2VyLCBvbkNhbmNlbCB9KSA9PiB7XG4gKiAgIG9uQ2FuY2VsKCgpID0+IHtcbiAqICAgICBsb2dnZXIuaW5mbygnQ2FuY2VsbGluZyBhY3Rpb24nKTtcbiAqICAgfSk7XG4gKlxuICogICB0cnkge1xuICogICAgIGxvZ2dlci5pbmZvKCdTdGFydGluZyBhY3Rpb24nLCB7IGNhcmRJZDogaW5wdXQuY2FyZElkIH0pO1xuICogICAgIGF3YWl0IHBlcmZvcm1BY3Rpb24oaW5wdXQpO1xuICogICAgIGxvZ2dlci5pbmZvKCdBY3Rpb24gY29tcGxldGVkIHN1Y2Nlc3NmdWxseScpO1xuICogICB9IGNhdGNoIChlcnIpIHtcbiAqICAgICBsb2dnZXIubG9nRXJyb3IoZXJyLCAnQWN0aW9uIGZhaWxlZCcpO1xuICogICAgIHRocm93IGVycjsgLy8gUmUtdGhyb3cgdG8gc2lnbmFsIGZhaWx1cmVcbiAqICAgfVxuICogfTtcbiAqIGBgYFxuICovXG5leHBvcnQgdHlwZSBBY3Rpb25IYW5kbGVyID0gKGlucHV0OiBBY3Rpb25JbnB1dCwgY29udGV4dDogQWN0aW9uQ29udGV4dCkgPT4gdm9pZCB8IFByb21pc2U8dm9pZD47XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIEZhY3RvcnkgRnVuY3Rpb25cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuLyoqXG4gKiBDcmVhdGVzIGFuIGFjdGlvbiBoYW5kbGVyIHdpdGggbWV0YWRhdGEgZm9yIHNldHRpbmdzLmpzb24gZ2VuZXJhdGlvbi5cbiAqXG4gKiBUaGlzIGZhY3Rvcnkgd3JhcHMgeW91ciBoYW5kbGVyIGZ1bmN0aW9uIGFuZCBhdHRhY2hlcyBtZXRhZGF0YSB0aGF0IHRoZSBDTElcbiAqIGV4dHJhY3RzIHdoZW4gYnVpbGRpbmcgc2V0dGluZ3MuanNvbi4gVGhlIHJldHVybmVkIGNvbW1hbmQgaXMgYm90aCBjYWxsYWJsZVxuICogKGZvciB0aGUgcnVudGltZSkgYW5kIGluc3BlY3RhYmxlIChmb3IgdGhlIENMSSkuXG4gKlxuICogVGhlIGdlbmVyaWMgcGFyYW1ldGVyIHByZXNlcnZlcyB0aGUgYWN0aW9uIG5hbWUgYXMgYSBsaXRlcmFsIHR5cGUuXG4gKlxuICogQHRlbXBsYXRlIFQgLSBUaGUgY29uZmlnIHR5cGUgZXh0ZW5kaW5nIEFjdGlvbkNvbmZpZ1xuICogQHBhcmFtIGNvbmZpZyAtIEFjdGlvbiBtZXRhZGF0YSAodXNlcyBTYW1lU2hhcGUgdG8gY2F0Y2ggdHlwb3MpXG4gKiBAcGFyYW0gaGFuZGxlciAtIEFzeW5jIGZ1bmN0aW9uIHRoYXQgaW1wbGVtZW50cyB0aGUgYWN0aW9uIGxvZ2ljXG4gKiBAcmV0dXJucyBBIGNhbGxhYmxlIGNvbW1hbmQgd2l0aCBhdHRhY2hlZCBtZXRhZGF0YVxuICpcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiAvLyBCYXNpYyB1c2FnZVxuICogZXhwb3J0IGRlZmF1bHQgZGVmaW5lQWN0aW9uKFxuICogICB7IGFjdGlvbk5hbWU6ICdMYXVuY2ggQ2xhdWRlJyB9LFxuICogICBhc3luYyAoaW5wdXQsIHsgbG9nZ2VyIH0pID0+IHtcbiAqICAgICBsb2dnZXIuaW5mbygnTGF1bmNoaW5nIENsYXVkZScsIHsgY2FyZElkOiBpbnB1dC5jYXJkSWQgfSk7XG4gKiAgICAgYXdhaXQgc3Bhd25DbGF1ZGUoaW5wdXQpO1xuICogICB9XG4gKiApO1xuICogYGBgXG4gKlxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIC8vIFdpdGggZnVsbCBjb25maWd1cmF0aW9uXG4gKiBleHBvcnQgZGVmYXVsdCBkZWZpbmVBY3Rpb24oXG4gKiAgIHtcbiAqICAgICBhY3Rpb25OYW1lOiAnRGVwbG95IEFwcGxpY2F0aW9uJyxcbiAqICAgICBkZXNjcmlwdGlvbjogJ0RlcGxveSB0byBwcm9kdWN0aW9uJyxcbiAqICAgICBpY29uOiAnLi9pY29ucy9kZXBsb3kuc3ZnJyxcbiAqICAgICBzdXBwb3J0c0JhY2tncm91bmRNb2RlOiB0cnVlLFxuICogICAgIGFsbG93Q29uY3VycmVudDogZmFsc2UsXG4gKiAgICAgdGltZW91dDogNjAwMDBcbiAqICAgfSxcbiAqICAgYXN5bmMgKGlucHV0LCBjb250ZXh0KSA9PiB7XG4gKiAgICAgY29udGV4dC5vbkNhbmNlbCgoKSA9PiBjbGVhbnVwKCkpO1xuICogICAgIGF3YWl0IGRlcGxveShpbnB1dCwgY29udGV4dCk7XG4gKiAgIH1cbiAqICk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGRlZmluZUFjdGlvbjxUIGV4dGVuZHMgQWN0aW9uQ29uZmlnPihcbiAgY29uZmlnOiBTYW1lU2hhcGU8QWN0aW9uQ29uZmlnLCBUPixcbiAgaGFuZGxlcjogQWN0aW9uSGFuZGxlclxuKTogQWN0aW9uQ29tbWFuZDxUWydhY3Rpb25OYW1lJ10+IHtcbiAgY29uc3QgZm4gPSBhc3luYyAoaW5wdXQ6IEFjdGlvbklucHV0LCBjb250ZXh0OiBBY3Rpb25Db250ZXh0KTogUHJvbWlzZTx2b2lkPiA9PiB7XG4gICAgYXdhaXQgaGFuZGxlcihpbnB1dCwgY29udGV4dCk7XG4gIH07XG5cbiAgZm4uZmFjdG9yeVR5cGUgPSAnYWN0aW9uJyBhcyBjb25zdDtcbiAgZm4uaWQgPSBjb25maWcuaWQ7XG4gIGZuLmFjdGlvbk5hbWUgPSBjb25maWcuYWN0aW9uTmFtZTtcbiAgZm4uZGVzY3JpcHRpb24gPSBjb25maWcuZGVzY3JpcHRpb247XG4gIGZuLmljb24gPSBjb25maWcuaWNvbjtcbiAgZm4uc3VwcG9ydHNCYWNrZ3JvdW5kTW9kZSA9IGNvbmZpZy5zdXBwb3J0c0JhY2tncm91bmRNb2RlO1xuICBmbi5hbGxvd0NvbmN1cnJlbnQgPSBjb25maWcuYWxsb3dDb25jdXJyZW50O1xuICBmbi50aW1lb3V0ID0gY29uZmlnLnRpbWVvdXQ7XG4gIGZuLnNvdXJjZVBhdGggPSBjb25maWcuc291cmNlUGF0aDtcblxuICByZXR1cm4gZm4gYXMgQWN0aW9uQ29tbWFuZDxUWydhY3Rpb25OYW1lJ10+O1xufVxuIiwgIi8qKlxuICogRW52aXJvbm1lbnQgdmFyaWFibGUgdXRpbGl0aWVzIGZvciBDYXJkcyBFeHRlbnNpb24gYWN0aW9ucyBhbmQgdHlwZSBob29rcy5cbiAqXG4gKiBUaGUgZXhlY3V0aW9uIHdyYXBwZXIgaW5qZWN0cyBhY3Rpb24gYW5kIHR5cGUgaG9vayBpbnB1dHMgdmlhIHByb2Nlc3MuZW52LlxuICogVGhpcyBtb2R1bGUgcHJvdmlkZXMgc3RyaWN0IGdldHRlcnMgYW5kIHR5cGVkIGV4dHJhY3RvcnMgc28gaGFuZGxlcnMgZG8gbm90XG4gKiBuZWVkIHRvIHBhcnNlIGVudmlyb25tZW50IHZhcmlhYmxlcyBtYW51YWxseS5cbiAqXG4gKiBVc2UgdGhlIGluZGl2aWR1YWwgZ2V0dGVycyB3aGVuIHlvdSBvbmx5IG5lZWQgb25lIHZhbHVlOyB1c2VcbiAqIHtAbGluayBleHRyYWN0QWN0aW9uSW5wdXR9IG9yIHtAbGluayBleHRyYWN0VHlwZUlucHV0fSB3aGVuIHlvdSBuZWVkIGEgZnVsbFxuICogdHlwZWQgcGF5bG9hZCBmb3IgYW4gYWN0aW9uIG9yIHR5cGUgaG9vay5cbiAqXG4gKlxuICogQHN1bW1hcnkgRW52aXJvbm1lbnQgdmFyaWFibGUgdXRpbGl0aWVzIGZvciBDYXJkcyBFeHRlbnNpb24gYWN0aW9ucyBhbmQgdHlwZSBob29rc1xuICogQG1vZHVsZVxuICovXG5cbmltcG9ydCB7IHJlYWRGaWxlU3luYyB9IGZyb20gJ25vZGU6ZnMnO1xuaW1wb3J0IHR5cGUgeyBBY3Rpb25JbnB1dCwgVHlwZUhvb2tJbnB1dCB9IGZyb20gJy4vaW5wdXRzLmpzJztcblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gQ29uc3RhbnRzXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbi8qKlxuICogRW52aXJvbm1lbnQgdmFyaWFibGUgbmFtZXMgc2V0IGJ5IHRoZSBDYXJkcyBleGVjdXRpb24gd3JhcHBlci5cbiAqXG4gKiBUaGlzIGlzIHRoZSBzaW5nbGUgc291cmNlIG9mIHRydXRoIGZvciBlbnYgdmFyIGtleXMgdXNlZCBieSBhY3Rpb24gYW5kIHR5cGVcbiAqIGhvb2sgcHJvY2Vzc2VzLiBLZWVwIGl0IGluIHN5bmMgd2l0aCB0aGUgd3JhcHBlciB0byBhdm9pZCBzdWJ0bGUgXCJ1bmRlZmluZWRcbiAqIGlucHV0XCIgYnVncy5cbiAqL1xuZXhwb3J0IGNvbnN0IENBUkRTX0VOVl9WQVJTID0ge1xuICAvKipcbiAgICogVW5pcXVlIGlkZW50aWZpZXIgZm9yIHRoZSBjdXJyZW50IGNhcmQuXG4gICAqIEF2YWlsYWJsZSBpbiBhbGwgYWN0aW9ucyBhbmQgdHlwZSBob29rcy5cbiAgICovXG4gIENBUkRfSUQ6ICdDQVJEX0lEJyxcblxuICAvKipcbiAgICogVGhlIGVudmlyb25tZW50IG5hbWUgZnJvbSBzZXR0aW5ncy5qc29uLlxuICAgKiBBdmFpbGFibGUgaW4gYWxsIGFjdGlvbnMgYW5kIHR5cGUgaG9va3MuXG4gICAqL1xuICBFTlZJUk9OTUVOVDogJ0VOVklST05NRU5UJyxcblxuICAvKipcbiAgICogRGlzcGxheSBuYW1lIG9mIHRoZSBhY3Rpb24gYnV0dG9uIHRoYXQgdHJpZ2dlcmVkIHRoaXMgaGFuZGxlci5cbiAgICogQXZhaWxhYmxlIGluIGFjdGlvbnMgb25seSAobm90IHR5cGUgaG9va3MpLlxuICAgKi9cbiAgQUNUSU9OX05BTUU6ICdBQ1RJT05fTkFNRScsXG5cbiAgLyoqXG4gICAqIENhcmQncyBleGVjdXRpb24gbW9kZSwgZGV0ZXJtaW5pbmcgVUkgaW50ZXJhY3Rpb24gbW9kZWwuXG4gICAqIEF2YWlsYWJsZSBpbiBhY3Rpb25zIG9ubHkgKG5vdCB0eXBlIGhvb2tzKS5cbiAgICogVmFsaWQgdmFsdWVzOiAnaW50ZXJhY3RpdmUnIHwgJ2JhY2tncm91bmQnXG4gICAqL1xuICBFWEVDVVRJT05fTU9ERTogJ0VYRUNVVElPTl9NT0RFJyxcblxuICAvKipcbiAgICogQ2FyZHMgc2VydmVyIGJhc2UgVVJMIGZvciBBUEkgY2FsbHMuXG4gICAqIEF2YWlsYWJsZSBpbiBhbGwgYWN0aW9ucyBhbmQgdHlwZSBob29rcy5cbiAgICovXG4gIEFQSV9CQVNFX1VSTDogJ0FQSV9CQVNFX1VSTCcsXG5cbiAgLyoqXG4gICAqIEF1dGhlbnRpY2F0aW9uIHRva2VuIGZvciBBUEkgY2FsbHMuXG4gICAqIEF2YWlsYWJsZSBpbiBhbGwgYWN0aW9ucyBhbmQgdHlwZSBob29rcy5cbiAgICovXG4gIEFQSV9BQ0NFU1NfVE9LRU46ICdBUElfQUNDRVNTX1RPS0VOJyxcblxuICAvKipcbiAgICogQ29uZmlndXJlZCBjb2RpbmcgYWdlbnQgaWRlbnRpZmllciBmcm9tIGNhcmRzLmNvZGluZ0FnZW50IHNldHRpbmcuXG4gICAqIEF2YWlsYWJsZSBpbiBhY3Rpb25zIG9ubHkgKG5vdCB0eXBlIGhvb2tzKS5cbiAgICogT3B0aW9uYWwuXG4gICAqL1xuICBDT0RJTkdfQUdFTlQ6ICdDT0RJTkdfQUdFTlQnLFxuXG4gIC8qKlxuICAgKiBUaGUgcmVnaXN0ZXJlZCB0eXBlIG5hbWUuXG4gICAqIEF2YWlsYWJsZSBpbiB0eXBlIGhvb2tzIG9ubHkuXG4gICAqL1xuICBUWVBFX05BTUU6ICdUWVBFX05BTUUnLFxuXG4gIC8qKlxuICAgKiBUaGUgdHlwZSdzIHZlcnNpb24gc3RyaW5nIGZyb20gc2V0dGluZ3MuanNvbiBjb25maWd1cmF0aW9uLlxuICAgKiBBdmFpbGFibGUgaW4gdHlwZSBob29rcyBvbmx5LlxuICAgKi9cbiAgVFlQRV9WRVJTSU9OOiAnVFlQRV9WRVJTSU9OJyxcblxuICAvKipcbiAgICogVGhlIGZpbGUgbmFtZSB3aXRoaW4gdGhlIHR5cGUgZGlyZWN0b3J5LlxuICAgKiBBdmFpbGFibGUgaW4gdHlwZSBob29rcyBvbmx5LlxuICAgKi9cbiAgRklMRV9OQU1FOiAnRklMRV9OQU1FJyxcblxuICAvKipcbiAgICogRnVsbCBwYXRoIHRvIHRoZSBmaWxlLlxuICAgKiBBdmFpbGFibGUgaW4gdHlwZSBob29rcyBvbmx5LlxuICAgKi9cbiAgRklMRV9QQVRIOiAnRklMRV9QQVRIJyxcblxuICAvKipcbiAgICogRmlsZSBzaXplIGluIGJ5dGVzLlxuICAgKiBBdmFpbGFibGUgaW4gdHlwZSBob29rcyBvbmx5LlxuICAgKi9cbiAgRklMRV9TSVpFOiAnRklMRV9TSVpFJyxcblxuICAvKipcbiAgICogU0hBMjU2IGhhc2ggb2YgY29udGVudC5cbiAgICogQXZhaWxhYmxlIGluIHR5cGUgaG9va3Mgb25seS5cbiAgICovXG4gIFNIQTI1NjogJ1NIQTI1NicsXG5cbiAgLyoqXG4gICAqIE1JTUUgdHlwZSBvZiB0aGUgY29udGVudC5cbiAgICogQXZhaWxhYmxlIGluIHR5cGUgaG9va3Mgb25seS5cbiAgICovXG4gIENPTlRFTlRfVFlQRTogJ0NPTlRFTlRfVFlQRScsXG5cbiAgLyoqXG4gICAqIFBhdGggdG8gdGhlIFZTIENvZGUgYnVuZGxlZCBOb2RlLmpzIGludGVycHJldGVyLlxuICAgKlxuICAgKiBTZXQgYnkgdGhlIGV4dGVuc2lvbiBob3N0IGZyb20gYHByb2Nlc3MuZXhlY1BhdGhgICh3aXRoXG4gICAqIGBFTEVDVFJPTl9SVU5fQVNfTk9ERT0xYCkuIENvbW1hbmRzIGluIHNldHRpbmdzLmpzb24gdXNlXG4gICAqIGAkVlNDT0RFX05PREUgLi9iaW4vLi4uYCBzbyB0aGV5IHdvcmsgcmVnYXJkbGVzcyBvZlxuICAgKiB3aGV0aGVyIGBub2RlYCBpcyBvbiB0aGUgc3lzdGVtIFBBVEguXG4gICAqXG4gICAqIEF2YWlsYWJsZSBpbiBhbGwgYWN0aW9ucyBhbmQgdHlwZSBob29rcy5cbiAgICovXG4gIFZTQ09ERV9OT0RFOiAnVlNDT0RFX05PREUnLFxuXG4gIC8qKlxuICAgKiBQYXRoIHRvIHRoZSBOb2RlLmpzIGludGVycHJldGVyIHJ1bm5pbmcgdGhlIHdyYXBwZXIgcHJvY2Vzcy5cbiAgICpcbiAgICogU2V0IGJ5IHRoZSB3cmFwcGVyIGZyb20gYHByb2Nlc3MuZXhlY1BhdGhgLiBVc2UgYCROT0RFYCBpbiBlbWJlZGRlZFxuICAgKiBiYXNoIHN0YXRlbWVudHMgdG8gaW52b2tlIE5vZGUgc2NyaXB0cyBwb3J0YWJseS5cbiAgICpcbiAgICogQXZhaWxhYmxlIGluIGFsbCBhY3Rpb25zLlxuICAgKi9cbiAgTk9ERTogJ05PREUnLFxuXG4gIC8qKlxuICAgKiBQYXRoIHRvIHRoZSBVbml4IGRvbWFpbiBzb2NrZXQgZm9yIHJ1bnRpbWUtdG8tZGlzcGF0Y2hlciBjb21tdW5pY2F0aW9uLlxuICAgKiBBdmFpbGFibGUgaW4gYWN0aW9ucyBvbmx5LlxuICAgKi9cbiAgU09DS0VUX1BBVEg6ICdTT0NLRVRfUEFUSCcsXG5cbiAgLyoqXG4gICAqIFBhdGggdG8gYSBKU09OIGZpbGUgY29udGFpbmluZyBzd2l0Y2hUb0ludGVyYWN0aXZlIGRhdGEgZnJvbSBhIHByZXZpb3VzIGhhbmRsZXIuXG4gICAqIEF2YWlsYWJsZSBpbiBhY3Rpb25zIG9ubHkuIE9wdGlvbmFsLlxuICAgKi9cbiAgU1dJVENIX1RPX0lOVEVSQUNUSVZFX0RBVEFfUEFUSDogJ1NXSVRDSF9UT19JTlRFUkFDVElWRV9EQVRBX1BBVEgnLFxuXG4gIC8qKlxuICAgKiBQYXRoIHRvIHRoZSBzZXR0aW5ncyBjb25maWd1cmF0aW9uIGRpcmVjdG9yeS5cbiAgICogQXZhaWxhYmxlIGluIGFjdGlvbnMgb25seS5cbiAgICovXG4gIENPTkZJR19QQVRIOiAnQ09ORklHX1BBVEgnLFxuXG4gIC8qKlxuICAgKiBQYXRoIHRvIHRoZSBWUyBDb2RlIHdvcmtzcGFjZSByb290IGRpcmVjdG9yeS5cbiAgICogU2V0IGJ5IHRoZSBhY3Rpb24gaGFuZGxlciAoZS5nLiwgbGF1bmNoLnRzKSB0byB0aGUgd29ya3RyZWUgcGF0aC5cbiAgICogQXZhaWxhYmxlIGluIGhvb2tzIHJ1bm5pbmcgaW5zaWRlIHRoZSBjbGF1ZGUgQ0xJLlxuICAgKi9cbiAgV09SS1NQQUNFX1BBVEg6ICdXT1JLU1BBQ0VfUEFUSCcsXG5cbiAgLyoqXG4gICAqIEFic29sdXRlIHBhdGggdG8gdGhlIG1haW4gZ2l0IHJlcG9zaXRvcnkgcm9vdCAoTk9UIGEgd29ya3RyZWUpLlxuICAgKiBTZXQgYnkgQWN0aW9uRGlzcGF0Y2hlcjsgY29uc3VtZWQgYnkgdGhlIHdyYXBwZXIgYW5kIHdhdGNoZXIgZm9yXG4gICAqIGdpdCBvcGVyYXRpb25zICh3b3JrdHJlZSByZW1vdmFsLCBicmFuY2ggZGVsZXRpb24pIHRoYXQgbXVzdCBydW5cbiAgICogYWdhaW5zdCB0aGUgbWFpbiByZXBvc2l0b3J5LlxuICAgKi9cbiAgUkVQT19ST09UOiAnUkVQT19ST09UJyxcblxuICAvKipcbiAgICogUGF0aCB0byB0aGUgY2FyZCdzIHJlcG9zaXRvcnkgZGlyZWN0b3J5LlxuICAgKiBBdmFpbGFibGUgaW4gYWN0aW9ucyBvbmx5LlxuICAgKi9cbiAgQ0FSRF9SRVBPX1BBVEg6ICdDQVJEX1JFUE9fUEFUSCcsXG5cbiAgLyoqXG4gICAqIFJlc29sdmVkIHNoZWxsIGNvbW1hbmQgZm9yIHRoZSB3cmFwcGVyIHRvIHNwYXduIGFzIHRoZSBhY3Rpb24gaGFuZGxlci5cbiAgICogU2V0IGJ5IEFjdGlvbkRpc3BhdGNoZXI7IGNvbnN1bWVkIGJ5IHRoZSB3cmFwcGVyIChub3QgYnkgYWN0aW9uIGhhbmRsZXJzKS5cbiAgICovXG4gIEFDVElPTl9DT01NQU5EOiAnQUNUSU9OX0NPTU1BTkQnLFxuXG4gIC8qKlxuICAgKiBHaXQgYnJhbmNoIHRoYXQgdGhlIGNhcmQncyB3b3Jrc3BhY2UgYnJhbmNoIHdpbGwgbWVyZ2UgaW50by5cbiAgICogUmVzb2x2ZWQgZnJvbSB0aGUgd29ya3NwYWNlIEhFQUQgYXQgbGF1bmNoIHRpbWUuXG4gICAqIFNldCBieSB0aGUgbGF1bmNoIGFjdGlvbi5cbiAgICogQXZhaWxhYmxlIGluIGFjdGlvbnMgb25seS5cbiAgICovXG4gIEJBU0VfQlJBTkNIOiAnQkFTRV9CUkFOQ0gnLFxuXG4gIC8qKlxuICAgKiBHaXQgYnJhbmNoIGZyb20gd2hpY2ggdGhlIGNhcmQncyB3b3Jrc3BhY2UgYnJhbmNoIHdhcyBjcmVhdGVkLlxuICAgKiBNYXkgZGlmZmVyIGZyb20gQkFTRV9CUkFOQ0ggd2hlbiB0aGUgd29ya3RyZWUgd2FzIGNyZWF0ZWQgYWdhaW5zdFxuICAgKiBhIGRpZmZlcmVudCByZWYgdGhhbiB0aGUgY3VycmVudCB3b3Jrc3BhY2UgSEVBRC5cbiAgICogU2V0IGJ5IHRoZSBsYXVuY2ggYWN0aW9uLlxuICAgKiBBdmFpbGFibGUgaW4gYWN0aW9ucyBvbmx5LlxuICAgKi9cbiAgUEFSRU5UX0JSQU5DSDogJ1BBUkVOVF9CUkFOQ0gnLFxuXG4gIC8qKlxuICAgKiBHaXQgYnJhbmNoIG5hbWUgZm9yIHRoZSBjYXJkJ3Mgd29ya3NwYWNlIGltcGxlbWVudGF0aW9uLlxuICAgKiBTZXQgYnkgdGhlIGxhdW5jaCBhY3Rpb24gYWZ0ZXIgcmVzb2x2aW5nIG9yIGNyZWF0aW5nIHRoZSB3b3JrdHJlZS5cbiAgICogQXZhaWxhYmxlIGluIGFjdGlvbnMgb25seS5cbiAgICovXG4gIFdPUktTUEFDRV9CUkFOQ0g6ICdXT1JLU1BBQ0VfQlJBTkNIJyxcblxuICAvKipcbiAgICogU2Vzc2lvbiBJRCBwZXJzaXN0ZWQgYnkgdGhlIHNlc3Npb24tc3RhcnQgaG9vayB2aWEgYHBlcnNpc3RFbnZWYXJgLlxuICAgKlxuICAgKiBBdmFpbGFibGUgaW4gQmFzaCB0b29sIHNoZWxsIGRlc2NlbmRhbnRzIChjb21tYW5kcywgZ2l0IGhvb2tzKSBhZnRlclxuICAgKiBzZXNzaW9uIHN0YXJ0LiBOT1QgYXZhaWxhYmxlIGluIGhvb2tzIHNwYXduZWQgZGlyZWN0bHkgYnkgQ2xhdWRlIENvZGVcbiAgICogKHN0b3AsIHNlc3Npb24tZW5kLCBldGMuKSBcdTIwMTQgdGhvc2UgcmVjZWl2ZSB0aGUgc2Vzc2lvbiBJRCB2aWEgaG9vayBpbnB1dC5cbiAgICpcbiAgICogVGhlIGNhcmQtcmVwbyBwb3N0LWNvbW1pdCBob29rIHJlYWRzIHRoaXMgdG8gcmVjb3JkIGNvbW1pdHMgZGlyZWN0bHlcbiAgICogd2l0aG91dCBuZWVkaW5nIGEgcHJvY2Vzcy10cmVlIHdhbGsgb3IgUElEIHJlZ2lzdHJ5IGxvb2t1cC5cbiAgICovXG4gIENBUkRTX1NFU1NJT05fSUQ6ICdDQVJEU19TRVNTSU9OX0lEJyxcblxuICAvKipcbiAgICogQWJzb2x1dGUgcGF0aCB0byB0aGUgVlMgQ29kZSBleHRlbnNpb24gaW5zdGFsbGF0aW9uIGRpcmVjdG9yeS5cbiAgICpcbiAgICogU2V0IGJ5IHRoZSBleHRlbnNpb24gaG9zdCBmcm9tIGBjb250ZXh0LmV4dGVuc2lvblVyaS5mc1BhdGhgIGFuZCBpbmplY3RlZFxuICAgKiBpbnRvIGFsbCBzcGF3bmVkIGFjdGlvbiBwcm9jZXNzZXMuIFVzZSB0aGlzIHRvIGxvY2F0ZSBidW5kbGVkIGFzc2V0cyBzdWNoXG4gICAqIGFzIHRoZSBydW50aW1lIHBsdWdpbiBkaXJlY3RvcnkgKGA8ZXh0ZW5zaW9uUGF0aD4vZGlzdC9wbHVnaW5zL3J1bnRpbWVgKS5cbiAgICpcbiAgICogQXZhaWxhYmxlIGluIGFjdGlvbnMgb25seSAobm90IHR5cGUgaG9va3MpLlxuICAgKi9cbiAgRVhURU5TSU9OX1BBVEg6ICdFWFRFTlNJT05fUEFUSCcsXG5cbiAgLyoqXG4gICAqIEFic29sdXRlIHBhdGggdG8gdGhlIENhcmRzIGhvb2tzIGxvZyBmaWxlLlxuICAgKlxuICAgKiBTZXQgYnkgQWN0aW9uRGlzcGF0Y2hlciBhdCBydW50aW1lLiBSZWFkIGJ5IHRoZSBMb2dnZXIgc2luZ2xldG9uXG4gICAqIGF0IGNvbnN0cnVjdGlvbiB0aW1lIHRvIGRldGVybWluZSB3aGVyZSBob29rIGV4ZWN1dGlvbiBsb2dzIGFyZSB3cml0dGVuLlxuICAgKlxuICAgKiBBdmFpbGFibGUgaW4gYWxsIGFjdGlvbnMgYW5kIHR5cGUgaG9va3MuXG4gICAqL1xuICBIT09LU19MT0dfRklMRTogJ0NBUkRTX0hPT0tTX0xPR19GSUxFJ1xufSBhcyBjb25zdDtcblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gSW5kaXZpZHVhbCBHZXR0ZXJzXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbi8qKlxuICogUmVhZHMgdGhlIGNhcmQgaWRlbnRpZmllciBmcm9tIHRoZSBlbnZpcm9ubWVudC5cbiAqXG4gKiBUaGUgZXhlY3V0aW9uIHdyYXBwZXIgYWx3YXlzIHNldHMgdGhpcyBmb3IgZXZlcnkgYWN0aW9uIGFuZCB0eXBlIGhvb2suXG4gKiBAcmV0dXJucyBUaGUgY3VycmVudCBjYXJkIElEXG4gKiBAdGhyb3dzIEVycm9yIGlmIENBUkRfSUQgaXMgbWlzc2luZyBvciBlbXB0eVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGNvbnN0IGNhcmRJZCA9IGdldENhcmRJZCgpO1xuICogY29uc29sZS5sb2coYFByb2Nlc3NpbmcgY2FyZDogJHtjYXJkSWR9YCk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldENhcmRJZCgpOiBzdHJpbmcge1xuICBjb25zdCB2YWx1ZSA9IHByb2Nlc3MuZW52W0NBUkRTX0VOVl9WQVJTLkNBUkRfSURdO1xuICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gJycpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYE1pc3NpbmcgcmVxdWlyZWQgZW52aXJvbm1lbnQgdmFyaWFibGU6ICR7Q0FSRFNfRU5WX1ZBUlMuQ0FSRF9JRH1gKTtcbiAgfVxuICByZXR1cm4gdmFsdWU7XG59XG5cbi8qKlxuICogUmVhZHMgdGhlIGVudmlyb25tZW50IG5hbWUgZnJvbSB0aGUgZW52aXJvbm1lbnQuXG4gKlxuICogVGhpcyB2YWx1ZSBtYXRjaGVzIHRoZSBlbnZpcm9ubWVudCBrZXkgaW4gc2V0dGluZ3MuanNvbiAoZS5nLiwgXCJkZWZhdWx0XCIsIFwic3RhZ2luZ1wiKS5cbiAqIEByZXR1cm5zIFRoZSBlbnZpcm9ubWVudCBuYW1lXG4gKiBAdGhyb3dzIEVycm9yIGlmIEVOVklST05NRU5UIGlzIG1pc3Npbmcgb3IgZW1wdHlcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBjb25zdCBlbnZpcm9ubWVudCA9IGdldEVudmlyb25tZW50KCk7XG4gKiBjb25zb2xlLmxvZyhgRW52aXJvbm1lbnQ6ICR7ZW52aXJvbm1lbnR9YCk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldEVudmlyb25tZW50KCk6IHN0cmluZyB7XG4gIGNvbnN0IHZhbHVlID0gcHJvY2Vzcy5lbnZbQ0FSRFNfRU5WX1ZBUlMuRU5WSVJPTk1FTlRdO1xuICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gJycpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYE1pc3NpbmcgcmVxdWlyZWQgZW52aXJvbm1lbnQgdmFyaWFibGU6ICR7Q0FSRFNfRU5WX1ZBUlMuRU5WSVJPTk1FTlR9YCk7XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG4vKipcbiAqIFJlYWRzIHRoZSBhY3Rpb24gYnV0dG9uIG5hbWUgZnJvbSB0aGUgZW52aXJvbm1lbnQuXG4gKlxuICogVGhpcyBpcyB0aGUgZGlzcGxheSBuYW1lIG9mIHRoZSBhY3Rpb24gdGhhdCB0cmlnZ2VyZWQgdGhlIGhhbmRsZXIsIG1hdGNoaW5nXG4gKiB0aGUgYGFjdGlvbk5hbWVgIGZpZWxkIGZyb20gYGRlZmluZUFjdGlvbmAuXG4gKiBAcmV0dXJucyBEaXNwbGF5IG5hbWUgb2YgdGhlIGFjdGlvbiB0aGF0IHRyaWdnZXJlZCB0aGUgY3VycmVudCBoYW5kbGVyIHJ1bi5cbiAqIEB0aHJvd3MgRXJyb3IgaWYgQUNUSU9OX05BTUUgaXMgbWlzc2luZyBvciBlbXB0eVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGNvbnN0IGFjdGlvbk5hbWUgPSBnZXRBY3Rpb25OYW1lKCk7XG4gKiBjb25zb2xlLmxvZyhgUnVubmluZyBhY3Rpb246ICR7YWN0aW9uTmFtZX1gKTtcbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0QWN0aW9uTmFtZSgpOiBzdHJpbmcge1xuICBjb25zdCB2YWx1ZSA9IHByb2Nlc3MuZW52W0NBUkRTX0VOVl9WQVJTLkFDVElPTl9OQU1FXTtcbiAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQgfHwgdmFsdWUgPT09ICcnKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIHJlcXVpcmVkIGVudmlyb25tZW50IHZhcmlhYmxlOiAke0NBUkRTX0VOVl9WQVJTLkFDVElPTl9OQU1FfWApO1xuICB9XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuLyoqXG4gKiBSZWFkcyB0aGUgZXhlY3V0aW9uIG1vZGUgZnJvbSB0aGUgZW52aXJvbm1lbnQuXG4gKlxuICogRGV0ZXJtaW5lcyB0aGUgVUkgaW50ZXJhY3Rpb24gbW9kZWwgZm9yIGFjdGlvbnMuXG4gKiBAcmV0dXJucyBUaGUgZXhlY3V0aW9uIG1vZGUgKCdpbnRlcmFjdGl2ZScgb3IgJ2JhY2tncm91bmQnKVxuICogQHRocm93cyBFcnJvciBpZiBFWEVDVVRJT05fTU9ERSBpcyBtaXNzaW5nLCBlbXB0eSwgb3IgaW52YWxpZFxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGNvbnN0IG1vZGUgPSBnZXRFeGVjdXRpb25Nb2RlKCk7XG4gKiBpZiAobW9kZSA9PT0gJ2ludGVyYWN0aXZlJykge1xuICogICAvLyBTaG93IHVzZXIgcHJvbXB0c1xuICogfVxuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRFeGVjdXRpb25Nb2RlKCk6ICdpbnRlcmFjdGl2ZScgfCAnYmFja2dyb3VuZCcge1xuICBjb25zdCB2YWx1ZSA9IHByb2Nlc3MuZW52W0NBUkRTX0VOVl9WQVJTLkVYRUNVVElPTl9NT0RFXTtcbiAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQgfHwgdmFsdWUgPT09ICcnKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIHJlcXVpcmVkIGVudmlyb25tZW50IHZhcmlhYmxlOiAke0NBUkRTX0VOVl9WQVJTLkVYRUNVVElPTl9NT0RFfWApO1xuICB9XG4gIGlmICh2YWx1ZSAhPT0gJ2ludGVyYWN0aXZlJyAmJiB2YWx1ZSAhPT0gJ2JhY2tncm91bmQnKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBJbnZhbGlkICR7Q0FSRFNfRU5WX1ZBUlMuRVhFQ1VUSU9OX01PREV9OiBleHBlY3RlZCAnaW50ZXJhY3RpdmUnIG9yICdiYWNrZ3JvdW5kJywgZ290IFwiJHt2YWx1ZX1cImApO1xuICB9XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuLyoqXG4gKiBSZWFkcyB0aGUgQVBJIGJhc2UgVVJMIGZyb20gdGhlIGVudmlyb25tZW50LlxuICpcbiAqIFVzZSB0aGlzIGFzIHRoZSBiYXNlIGZvciBjb25zdHJ1Y3RpbmcgQVBJIGVuZHBvaW50cy4gVGhlIFVSTCBkb2VzIG5vdCBpbmNsdWRlXG4gKiBhIHRyYWlsaW5nIHNsYXNoLlxuICogQHJldHVybnMgQmFzZSBVUkwgdXNlZCB0byBjb25zdHJ1Y3QgQ2FyZHMgQVBJIGVuZHBvaW50cyBmb3IgdGhpcyBleGVjdXRpb24uXG4gKiBAdGhyb3dzIEVycm9yIGlmIEFQSV9CQVNFX1VSTCBpcyBtaXNzaW5nIG9yIGVtcHR5XG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogY29uc3QgYXBpVXJsID0gZ2V0QXBpQmFzZVVybCgpO1xuICogY29uc3QgZW5kcG9pbnQgPSBgJHthcGlVcmx9L2NhcmRzLyR7Y2FyZElkfWA7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldEFwaUJhc2VVcmwoKTogc3RyaW5nIHtcbiAgY29uc3QgdmFsdWUgPSBwcm9jZXNzLmVudltDQVJEU19FTlZfVkFSUy5BUElfQkFTRV9VUkxdO1xuICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gJycpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYE1pc3NpbmcgcmVxdWlyZWQgZW52aXJvbm1lbnQgdmFyaWFibGU6ICR7Q0FSRFNfRU5WX1ZBUlMuQVBJX0JBU0VfVVJMfWApO1xuICB9XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuLyoqXG4gKiBSZWFkcyB0aGUgQVBJIGFjY2VzcyB0b2tlbiBmcm9tIHRoZSBlbnZpcm9ubWVudC5cbiAqXG4gKiBCZWFyZXIgdG9rZW4gdmFsaWQgZm9yIHRoZSBkdXJhdGlvbiBvZiB0aGlzIGFjdGlvbiBvciB0eXBlIGhvb2sgZXhlY3V0aW9uLlxuICogSW5jbHVkZSBpbiBBdXRob3JpemF0aW9uIGhlYWRlcnMgd2hlbiBjYWxsaW5nIHRoZSBDYXJkcyBBUEkuXG4gKiBAcmV0dXJucyBCZWFyZXIgdG9rZW4gdGhhdCBhdXRob3JpemVzIEFQSSByZXF1ZXN0cyBmb3IgdGhpcyBleGVjdXRpb24gY29udGV4dC5cbiAqIEB0aHJvd3MgRXJyb3IgaWYgQVBJX0FDQ0VTU19UT0tFTiBpcyBtaXNzaW5nIG9yIGVtcHR5XG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogY29uc3QgdG9rZW4gPSBnZXRBcGlBY2Nlc3NUb2tlbigpO1xuICogY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBmZXRjaChhcGlVcmwsIHtcbiAqICAgaGVhZGVyczogeyBBdXRob3JpemF0aW9uOiBgQmVhcmVyICR7dG9rZW59YCB9XG4gKiB9KTtcbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0QXBpQWNjZXNzVG9rZW4oKTogc3RyaW5nIHtcbiAgY29uc3QgdmFsdWUgPSBwcm9jZXNzLmVudltDQVJEU19FTlZfVkFSUy5BUElfQUNDRVNTX1RPS0VOXTtcbiAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQgfHwgdmFsdWUgPT09ICcnKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIHJlcXVpcmVkIGVudmlyb25tZW50IHZhcmlhYmxlOiAke0NBUkRTX0VOVl9WQVJTLkFQSV9BQ0NFU1NfVE9LRU59YCk7XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG4vKipcbiAqIFJlYWRzIHRoZSBjb25maWd1cmVkIGNvZGluZyBhZ2VudCBpZGVudGlmaWVyIGZyb20gdGhlIGVudmlyb25tZW50LlxuICpcbiAqIE9wdGlvbmFsIHZhbHVlIGZyb20gY2FyZHMuY29kaW5nQWdlbnQgc2V0dGluZy4gV2hlbiBzZXQsIGluZGljYXRlcyB3aGljaCBBSVxuICogY29kaW5nIGFzc2lzdGFudCB0aGUgdXNlciBwcmVmZXJzLiBBY3Rpb25zIGNhbiB1c2UgdGhpcyB0byBjdXN0b21pemUgYmVoYXZpb3JcbiAqIG9yIHByb21wdHMgZm9yIGRpZmZlcmVudCBhZ2VudHMuXG4gKiBAcmV0dXJucyBUaGUgY29kaW5nIGFnZW50IGlkZW50aWZpZXIsIG9yIHVuZGVmaW5lZCBpZiBub3Qgc2V0XG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogY29uc3QgY29kaW5nQWdlbnQgPSBnZXRDb2RpbmdBZ2VudCgpO1xuICogaWYgKGNvZGluZ0FnZW50ID09PSAnY2xhdWRlJykge1xuICogICAvLyBDdXN0b21pemUgZm9yIENsYXVkZVxuICogfVxuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRDb2RpbmdBZ2VudCgpOiBzdHJpbmcgfCB1bmRlZmluZWQge1xuICBjb25zdCB2YWx1ZSA9IHByb2Nlc3MuZW52W0NBUkRTX0VOVl9WQVJTLkNPRElOR19BR0VOVF07XG4gIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IHZhbHVlID09PSAnJykge1xuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG4vKipcbiAqIFJlYWRzIHRoZSByZWdpc3RlcmVkIHR5cGUgbmFtZSBmb3IgdHlwZSBob29rcy5cbiAqXG4gKiBUaGlzIHZhbHVlIGlzIG9ubHkgcHJlc2VudCBmb3IgdHlwZSBob29rIGV2ZW50cy5cbiAqIEByZXR1cm5zIFRoZSByZWdpc3RlcmVkIHR5cGUgbmFtZVxuICogQHRocm93cyBFcnJvciBpZiBUWVBFX05BTUUgaXMgbWlzc2luZyBvciBlbXB0eVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGNvbnN0IHR5cGVOYW1lID0gZ2V0VHlwZU5hbWUoKTtcbiAqIGNvbnNvbGUubG9nKGBUeXBlOiAke3R5cGVOYW1lfWApO1xuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRUeXBlTmFtZSgpOiBzdHJpbmcge1xuICBjb25zdCB2YWx1ZSA9IHByb2Nlc3MuZW52W0NBUkRTX0VOVl9WQVJTLlRZUEVfTkFNRV07XG4gIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IHZhbHVlID09PSAnJykge1xuICAgIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyByZXF1aXJlZCBlbnZpcm9ubWVudCB2YXJpYWJsZTogJHtDQVJEU19FTlZfVkFSUy5UWVBFX05BTUV9YCk7XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG4vKipcbiAqIFJlYWRzIHRoZSB0eXBlIHZlcnNpb24gZnJvbSB0aGUgZW52aXJvbm1lbnQuXG4gKlxuICogVGhpcyB2ZXJzaW9uIGNvbWVzIGZyb20gdGhlIHR5cGUgY29uZmlndXJhdGlvbiBpbiBzZXR0aW5ncy5qc29uLlxuICogQHJldHVybnMgVGhlIHZlcnNpb24gc3RyaW5nIGZyb20gdHlwZSBjb25maWdcbiAqIEB0aHJvd3MgRXJyb3IgaWYgVFlQRV9WRVJTSU9OIGlzIG1pc3Npbmcgb3IgZW1wdHlcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBjb25zdCB2ZXJzaW9uID0gZ2V0VHlwZVZlcnNpb24oKTtcbiAqIGNvbnNvbGUubG9nKGBWZXJzaW9uOiAke3ZlcnNpb259YCk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldFR5cGVWZXJzaW9uKCk6IHN0cmluZyB7XG4gIGNvbnN0IHZhbHVlID0gcHJvY2Vzcy5lbnZbQ0FSRFNfRU5WX1ZBUlMuVFlQRV9WRVJTSU9OXTtcbiAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQgfHwgdmFsdWUgPT09ICcnKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIHJlcXVpcmVkIGVudmlyb25tZW50IHZhcmlhYmxlOiAke0NBUkRTX0VOVl9WQVJTLlRZUEVfVkVSU0lPTn1gKTtcbiAgfVxuICByZXR1cm4gdmFsdWU7XG59XG5cbi8qKlxuICogUmVhZHMgdGhlIHR5cGVkIGZpbGUgbmFtZSBmb3IgdHlwZSBob29rIGV2ZW50cy5cbiAqXG4gKiBUaGlzIGlzIHRoZSBmaWxlIG5hbWUgcmVsYXRpdmUgdG8gdGhlIHR5cGUgZGlyZWN0b3J5LCBub3QgYSBmdWxsIHBhdGguXG4gKiBAcmV0dXJucyBUaGUgZmlsZSBuYW1lIHdpdGhpbiB0aGUgdHlwZSBkaXJlY3RvcnlcbiAqIEB0aHJvd3MgRXJyb3IgaWYgRklMRV9OQU1FIGlzIG1pc3Npbmcgb3IgZW1wdHlcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBjb25zdCBmaWxlTmFtZSA9IGdldEZpbGVOYW1lKCk7XG4gKiBjb25zb2xlLmxvZyhgRmlsZTogJHtmaWxlTmFtZX1gKTtcbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0RmlsZU5hbWUoKTogc3RyaW5nIHtcbiAgY29uc3QgdmFsdWUgPSBwcm9jZXNzLmVudltDQVJEU19FTlZfVkFSUy5GSUxFX05BTUVdO1xuICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gJycpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYE1pc3NpbmcgcmVxdWlyZWQgZW52aXJvbm1lbnQgdmFyaWFibGU6ICR7Q0FSRFNfRU5WX1ZBUlMuRklMRV9OQU1FfWApO1xuICB9XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuLyoqXG4gKiBSZWFkcyB0aGUgYWJzb2x1dGUgcGF0aCB0byB0aGUgdHlwZWQgZmlsZS5cbiAqXG4gKiBUaGlzIGlzIHRoZSBmdWxseSByZXNvbHZlZCBwYXRoIG9uIGRpc2sgcHJvdmlkZWQgYnkgdGhlIGV4ZWN1dGlvbiB3cmFwcGVyLlxuICogQHJldHVybnMgVGhlIGZ1bGwgcGF0aCB0byB0aGUgZmlsZVxuICogQHRocm93cyBFcnJvciBpZiBGSUxFX1BBVEggaXMgbWlzc2luZyBvciBlbXB0eVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGNvbnN0IGZpbGVQYXRoID0gZ2V0RmlsZVBhdGgoKTtcbiAqIGNvbnNvbGUubG9nKGBQYXRoOiAke2ZpbGVQYXRofWApO1xuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRGaWxlUGF0aCgpOiBzdHJpbmcge1xuICBjb25zdCB2YWx1ZSA9IHByb2Nlc3MuZW52W0NBUkRTX0VOVl9WQVJTLkZJTEVfUEFUSF07XG4gIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IHZhbHVlID09PSAnJykge1xuICAgIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyByZXF1aXJlZCBlbnZpcm9ubWVudCB2YXJpYWJsZTogJHtDQVJEU19FTlZfVkFSUy5GSUxFX1BBVEh9YCk7XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG4vKipcbiAqIFJlYWRzIHRoZSB0eXBlZCBmaWxlIHNpemUgZnJvbSB0aGUgZW52aXJvbm1lbnQuXG4gKlxuICogVGhlIHZhbHVlIGlzIHBhcnNlZCBhcyBhIGJhc2UtMTAgaW50ZWdlci5cbiAqIEByZXR1cm5zIFRoZSBmaWxlIHNpemUgaW4gYnl0ZXNcbiAqIEB0aHJvd3MgRXJyb3IgaWYgRklMRV9TSVpFIGlzIG1pc3Npbmcgb3Igbm90IGEgbnVtYmVyXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogY29uc3Qgc2l6ZSA9IGdldEZpbGVTaXplKCk7XG4gKiBjb25zb2xlLmxvZyhgU2l6ZTogJHtzaXplfSBieXRlc2ApO1xuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRGaWxlU2l6ZSgpOiBudW1iZXIge1xuICBjb25zdCB2YWx1ZSA9IHByb2Nlc3MuZW52W0NBUkRTX0VOVl9WQVJTLkZJTEVfU0laRV07XG4gIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IHZhbHVlID09PSAnJykge1xuICAgIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyByZXF1aXJlZCBlbnZpcm9ubWVudCB2YXJpYWJsZTogJHtDQVJEU19FTlZfVkFSUy5GSUxFX1NJWkV9YCk7XG4gIH1cbiAgY29uc3Qgc2l6ZSA9IE51bWJlci5wYXJzZUludCh2YWx1ZSwgMTApO1xuICBpZiAoTnVtYmVyLmlzTmFOKHNpemUpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBJbnZhbGlkICR7Q0FSRFNfRU5WX1ZBUlMuRklMRV9TSVpFfTogZXhwZWN0ZWQgbnVtYmVyLCBnb3QgXCIke3ZhbHVlfVwiYCk7XG4gIH1cbiAgcmV0dXJuIHNpemU7XG59XG5cbi8qKlxuICogUmVhZHMgdGhlIFNIQTI1NiBoYXNoIGZvciB0aGUgdHlwZWQgZmlsZSBjb250ZW50LlxuICpcbiAqIFVzZWZ1bCBmb3IgZGV0ZWN0aW5nIGNvbnRlbnQgY2hhbmdlcyB3aXRob3V0IHJlYWRpbmcgdGhlIGZpbGUgYWdhaW4uXG4gKiBAcmV0dXJucyBUaGUgU0hBMjU2IGhhc2ggb2YgdGhlIGNvbnRlbnRcbiAqIEB0aHJvd3MgRXJyb3IgaWYgU0hBMjU2IGlzIG1pc3Npbmcgb3IgZW1wdHlcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBjb25zdCBoYXNoID0gZ2V0U2hhMjU2KCk7XG4gKiBjb25zb2xlLmxvZyhgSGFzaDogJHtoYXNofWApO1xuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRTaGEyNTYoKTogc3RyaW5nIHtcbiAgY29uc3QgdmFsdWUgPSBwcm9jZXNzLmVudltDQVJEU19FTlZfVkFSUy5TSEEyNTZdO1xuICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gJycpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYE1pc3NpbmcgcmVxdWlyZWQgZW52aXJvbm1lbnQgdmFyaWFibGU6ICR7Q0FSRFNfRU5WX1ZBUlMuU0hBMjU2fWApO1xuICB9XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuLyoqXG4gKiBSZWFkcyB0aGUgTUlNRSB0eXBlIGZvciB0aGUgdHlwZWQgZmlsZSBjb250ZW50LlxuICpcbiAqIFByb3ZpZGVkIGZvciB0eXBlIGhvb2sgZXZlbnRzIHNvIHZhbGlkYXRvcnMgY2FuIGJyYW5jaCBvbiBjb250ZW50IHR5cGUuXG4gKiBAcmV0dXJucyBUaGUgTUlNRSB0eXBlIG9mIHRoZSBjb250ZW50XG4gKiBAdGhyb3dzIEVycm9yIGlmIENPTlRFTlRfVFlQRSBpcyBtaXNzaW5nIG9yIGVtcHR5XG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogY29uc3QgY29udGVudFR5cGUgPSBnZXRDb250ZW50VHlwZSgpO1xuICogY29uc29sZS5sb2coYENvbnRlbnQgdHlwZTogJHtjb250ZW50VHlwZX1gKTtcbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0Q29udGVudFR5cGUoKTogc3RyaW5nIHtcbiAgY29uc3QgdmFsdWUgPSBwcm9jZXNzLmVudltDQVJEU19FTlZfVkFSUy5DT05URU5UX1RZUEVdO1xuICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gJycpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYE1pc3NpbmcgcmVxdWlyZWQgZW52aXJvbm1lbnQgdmFyaWFibGU6ICR7Q0FSRFNfRU5WX1ZBUlMuQ09OVEVOVF9UWVBFfWApO1xuICB9XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuLyoqXG4gKiBSZWFkcyB0aGUgVlMgQ29kZSBidW5kbGVkIE5vZGUuanMgaW50ZXJwcmV0ZXIgcGF0aCBmcm9tIHRoZSBlbnZpcm9ubWVudC5cbiAqXG4gKiBUaGlzIGlzIHNldCBieSB0aGUgZXh0ZW5zaW9uIGR1cmluZyBhY3RpdmF0aW9uIGFuZCBpbmplY3RlZCBpbnRvIGFsbFxuICogc3Bhd25lZCBhY3Rpb24vaG9vayBwcm9jZXNzZXMuIENvbmZpZ3VyYXRpb24gYXV0aG9ycyBjYW4gdXNlIGl0IHRvIGludm9rZVxuICogTm9kZS5qcyB3aXRob3V0IHJlbHlpbmcgb24gdGhlIHN5c3RlbSBQQVRILlxuICpcbiAqIEByZXR1cm5zIFRoZSBwYXRoIHRvIHRoZSBOb2RlLmpzIGludGVycHJldGVyXG4gKiBAdGhyb3dzIEVycm9yIGlmIFZTQ09ERV9OT0RFIGlzIG1pc3Npbmcgb3IgZW1wdHlcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBjb25zdCBub2RlUGF0aCA9IGdldFZzY29kZU5vZGVQYXRoKCk7XG4gKiBleGVjRmlsZVN5bmMobm9kZVBhdGgsIFsnc2NyaXB0LmpzJ10pO1xuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRWc2NvZGVOb2RlUGF0aCgpOiBzdHJpbmcge1xuICBjb25zdCB2YWx1ZSA9IHByb2Nlc3MuZW52W0NBUkRTX0VOVl9WQVJTLlZTQ09ERV9OT0RFXTtcbiAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQgfHwgdmFsdWUgPT09ICcnKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIHJlcXVpcmVkIGVudmlyb25tZW50IHZhcmlhYmxlOiAke0NBUkRTX0VOVl9WQVJTLlZTQ09ERV9OT0RFfWApO1xuICB9XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuLyoqXG4gKiBSZWFkcyB0aGUgVW5peCBkb21haW4gc29ja2V0IHBhdGggZm9yIHJ1bnRpbWUtdG8tZGlzcGF0Y2hlciBjb21tdW5pY2F0aW9uLlxuICpcbiAqIEByZXR1cm5zIFVuaXggc29ja2V0IHBhdGggdXNlZCB0byBzZW5kIHJ1bnRpbWUgY29udHJvbCBtZXNzYWdlcy5cbiAqIEB0aHJvd3MgRXJyb3IgaWYgU09DS0VUX1BBVEggaXMgbWlzc2luZyBvciBlbXB0eVxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0U29ja2V0UGF0aCgpOiBzdHJpbmcge1xuICBjb25zdCB2YWx1ZSA9IHByb2Nlc3MuZW52W0NBUkRTX0VOVl9WQVJTLlNPQ0tFVF9QQVRIXTtcbiAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQgfHwgdmFsdWUgPT09ICcnKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIHJlcXVpcmVkIGVudmlyb25tZW50IHZhcmlhYmxlOiAke0NBUkRTX0VOVl9WQVJTLlNPQ0tFVF9QQVRIfWApO1xuICB9XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuLyoqXG4gKiBSZWFkcyB0aGUgcGF0aCB0byB0aGUgc3dpdGNoVG9JbnRlcmFjdGl2ZSBkYXRhIGZpbGUuXG4gKlxuICogVGhpcyBpcyBvcHRpb25hbCBcdTIwMTQgcmV0dXJucyB1bmRlZmluZWQgd2hlbiBub3Qgc2V0IChpLmUuLCB0aGUgYWN0aW9uXG4gKiB3YXMgbm90IHJlbGF1bmNoZWQgdmlhIHN3aXRjaFRvSW50ZXJhY3RpdmUpLlxuICpcbiAqIEByZXR1cm5zIFRoZSBmaWxlIHBhdGgsIG9yIHVuZGVmaW5lZCBpZiBub3Qgc2V0XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRTd2l0Y2hUb0ludGVyYWN0aXZlRGF0YVBhdGgoKTogc3RyaW5nIHwgdW5kZWZpbmVkIHtcbiAgY29uc3QgdmFsdWUgPSBwcm9jZXNzLmVudltDQVJEU19FTlZfVkFSUy5TV0lUQ0hfVE9fSU5URVJBQ1RJVkVfREFUQV9QQVRIXTtcbiAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQgfHwgdmFsdWUgPT09ICcnKSB7XG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfVxuICByZXR1cm4gdmFsdWU7XG59XG5cbi8qKlxuICogUmVhZHMgdGhlIHNldHRpbmdzIGNvbmZpZ3VyYXRpb24gZGlyZWN0b3J5IHBhdGguXG4gKlxuICogQHJldHVybnMgQWJzb2x1dGUgcGF0aCB0byB0aGUgZGlyZWN0b3J5IGNvbnRhaW5pbmcgZ2VuZXJhdGVkIHNldHRpbmdzIGFydGlmYWN0cy5cbiAqIEB0aHJvd3MgRXJyb3IgaWYgQ09ORklHX1BBVEggaXMgbWlzc2luZyBvciBlbXB0eVxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0Q29uZmlnUGF0aCgpOiBzdHJpbmcge1xuICBjb25zdCB2YWx1ZSA9IHByb2Nlc3MuZW52W0NBUkRTX0VOVl9WQVJTLkNPTkZJR19QQVRIXTtcbiAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQgfHwgdmFsdWUgPT09ICcnKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIHJlcXVpcmVkIGVudmlyb25tZW50IHZhcmlhYmxlOiAke0NBUkRTX0VOVl9WQVJTLkNPTkZJR19QQVRIfWApO1xuICB9XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuLyoqXG4gKiBSZWFkcyB0aGUgd29ya3NwYWNlIHBhdGggc2V0IGJ5IHRoZSBhY3Rpb24gaGFuZGxlciAoZS5nLiwgdGhlIHdvcmt0cmVlIHBhdGgpLlxuICpcbiAqIFRoaXMgaXMgZm9yIGhvb2tzIHJ1bm5pbmcgaW5zaWRlIHRoZSBDbGF1ZGUgQ0xJLCAqKm5vdCoqIGZvciBhY3Rpb24gaGFuZGxlcnMuXG4gKiBBY3Rpb24gaGFuZGxlcnMgc2hvdWxkIHVzZSB7QGxpbmsgZ2V0UmVwb1Jvb3R9IGluc3RlYWQuXG4gKlxuICogQHJldHVybnMgQWJzb2x1dGUgcGF0aCB0byB0aGUgYWN0aXZlIHdvcmtzcGFjZSAvIHdvcmt0cmVlLlxuICogQHRocm93cyBFcnJvciBpZiBXT1JLU1BBQ0VfUEFUSCBpcyBtaXNzaW5nIG9yIGVtcHR5XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRXb3Jrc3BhY2VQYXRoKCk6IHN0cmluZyB7XG4gIGNvbnN0IHZhbHVlID0gcHJvY2Vzcy5lbnZbQ0FSRFNfRU5WX1ZBUlMuV09SS1NQQUNFX1BBVEhdO1xuICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gJycpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYE1pc3NpbmcgcmVxdWlyZWQgZW52aXJvbm1lbnQgdmFyaWFibGU6ICR7Q0FSRFNfRU5WX1ZBUlMuV09SS1NQQUNFX1BBVEh9YCk7XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG4vKipcbiAqIFJlYWRzIHRoZSBtYWluIGdpdCByZXBvc2l0b3J5IHJvb3QgcGF0aC5cbiAqXG4gKiBTZXQgYnkgQWN0aW9uRGlzcGF0Y2hlcjsgdXNlZCBieSBhY3Rpb24gaGFuZGxlcnMgdG8gcmVzb2x2ZSB3b3JrdHJlZXNcbiAqIGFuZCBwZXJmb3JtIGdpdCBvcGVyYXRpb25zIGFnYWluc3QgdGhlIG1haW4gcmVwb3NpdG9yeS5cbiAqXG4gKiBAcmV0dXJucyBBYnNvbHV0ZSBwYXRoIHRvIHRoZSBtYWluIGdpdCByZXBvc2l0b3J5IHJvb3QgKE5PVCBhIHdvcmt0cmVlKS5cbiAqIEB0aHJvd3MgRXJyb3IgaWYgUkVQT19ST09UIGlzIG1pc3Npbmcgb3IgZW1wdHlcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldFJlcG9Sb290KCk6IHN0cmluZyB7XG4gIGNvbnN0IHZhbHVlID0gcHJvY2Vzcy5lbnZbQ0FSRFNfRU5WX1ZBUlMuUkVQT19ST09UXTtcbiAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQgfHwgdmFsdWUgPT09ICcnKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIHJlcXVpcmVkIGVudmlyb25tZW50IHZhcmlhYmxlOiAke0NBUkRTX0VOVl9WQVJTLlJFUE9fUk9PVH1gKTtcbiAgfVxuICByZXR1cm4gdmFsdWU7XG59XG5cbi8qKlxuICogUmVhZHMgdGhlIGNhcmQncyByZXBvc2l0b3J5IGRpcmVjdG9yeSBwYXRoLlxuICpcbiAqIEByZXR1cm5zIEFic29sdXRlIHBhdGggdG8gdGhlIHJlcG9zaXRvcnkgYXNzb2NpYXRlZCB3aXRoIHRoZSBhY3RpdmUgY2FyZC5cbiAqIEB0aHJvd3MgRXJyb3IgaWYgQ0FSRF9SRVBPX1BBVEggaXMgbWlzc2luZyBvciBlbXB0eVxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0Q2FyZFJlcG9QYXRoKCk6IHN0cmluZyB7XG4gIGNvbnN0IHZhbHVlID0gcHJvY2Vzcy5lbnZbQ0FSRFNfRU5WX1ZBUlMuQ0FSRF9SRVBPX1BBVEhdO1xuICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gJycpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYE1pc3NpbmcgcmVxdWlyZWQgZW52aXJvbm1lbnQgdmFyaWFibGU6ICR7Q0FSRFNfRU5WX1ZBUlMuQ0FSRF9SRVBPX1BBVEh9YCk7XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG4vKipcbiAqIFJlYWRzIHRoZSBWUyBDb2RlIGV4dGVuc2lvbiBpbnN0YWxsYXRpb24gZGlyZWN0b3J5IHBhdGguXG4gKlxuICogU2V0IGJ5IHRoZSBleHRlbnNpb24gaG9zdCBmcm9tIGBjb250ZXh0LmV4dGVuc2lvblVyaS5mc1BhdGhgIGFuZCBpbmplY3RlZFxuICogaW50byBhbGwgc3Bhd25lZCBhY3Rpb24gcHJvY2Vzc2VzLiBVc2UgdGhpcyB0byBsb2NhdGUgYnVuZGxlZCBhc3NldHMgc3VjaFxuICogYXMgdGhlIHJ1bnRpbWUgcGx1Z2luIGRpcmVjdG9yeSAoYDxleHRlbnNpb25QYXRoPi9kaXN0L3BsdWdpbnMvcnVudGltZWApLlxuICpcbiAqIEByZXR1cm5zIEFic29sdXRlIHBhdGggdG8gdGhlIGV4dGVuc2lvbiBpbnN0YWxsYXRpb24gZGlyZWN0b3J5LlxuICogQHRocm93cyBFcnJvciBpZiBFWFRFTlNJT05fUEFUSCBpcyBtaXNzaW5nIG9yIGVtcHR5XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRFeHRlbnNpb25QYXRoKCk6IHN0cmluZyB7XG4gIGNvbnN0IHZhbHVlID0gcHJvY2Vzcy5lbnZbQ0FSRFNfRU5WX1ZBUlMuRVhURU5TSU9OX1BBVEhdO1xuICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gJycpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYE1pc3NpbmcgcmVxdWlyZWQgZW52aXJvbm1lbnQgdmFyaWFibGU6ICR7Q0FSRFNfRU5WX1ZBUlMuRVhURU5TSU9OX1BBVEh9YCk7XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG4vKipcbiAqIFJlYWRzIGFuZCBwYXJzZXMgdGhlIHN3aXRjaFRvSW50ZXJhY3RpdmUgZGF0YSBmaWxlLlxuICpcbiAqIFdoZW4gYFNXSVRDSF9UT19JTlRFUkFDVElWRV9EQVRBX1BBVEhgIGlzIHNldCwgcmVhZHMgdGhlIGZpbGUgYXQgdGhhdCBwYXRoXG4gKiBhbmQgcGFyc2VzIGl0IGFzIEpTT04uIFJldHVybnMgdW5kZWZpbmVkIGlmIHRoZSBlbnYgdmFyIGlzIG5vdCBzZXQuXG4gKlxuICogQHJldHVybnMgVGhlIHBhcnNlZCBkYXRhLCBvciB1bmRlZmluZWQgaWYgdGhlIHBhdGggaXMgbm90IHNldFxuICogQHRocm93cyBFcnJvciBpZiB0aGUgZmlsZSBjYW5ub3QgYmUgcmVhZCBvciBjb250YWlucyBpbnZhbGlkIEpTT05cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJlYWRTd2l0Y2hUb0ludGVyYWN0aXZlRGF0YSgpOiB1bmtub3duIHwgdW5kZWZpbmVkIHtcbiAgY29uc3QgZGF0YVBhdGggPSBnZXRTd2l0Y2hUb0ludGVyYWN0aXZlRGF0YVBhdGgoKTtcbiAgaWYgKGRhdGFQYXRoID09PSB1bmRlZmluZWQpIHtcbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9XG4gIGNvbnN0IGNvbnRlbnQgPSByZWFkRmlsZVN5bmMoZGF0YVBhdGgsICd1dGYtOCcpO1xuICByZXR1cm4gSlNPTi5wYXJzZShjb250ZW50KTtcbn1cblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gVHlwZWQgSW5wdXQgRXh0cmFjdGlvblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4vKipcbiAqIEJ1aWxkcyBhIHR5cGVkIGFjdGlvbiBpbnB1dCBvYmplY3QgZnJvbSBlbnZpcm9ubWVudCB2YXJpYWJsZXMuXG4gKlxuICogRXh0cmFjdHMgYWxsIGZpZWxkcyByZXF1aXJlZCBmb3IgYWN0aW9uIGhhbmRsZXJzLlxuICpcbiAqIEByZXR1cm5zIFR5cGVkIEFjdGlvbklucHV0IG9iamVjdFxuICogQHRocm93cyBFcnJvciBpZiByZXF1aXJlZCBlbnYgdmFycyBhcmUgbWlzc2luZyBvciBpbnZhbGlkXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogLy8gRm9yIGFuIGFjdGlvbiBoYW5kbGVyXG4gKiBjb25zdCBpbnB1dCA9IGV4dHJhY3RBY3Rpb25JbnB1dCgpO1xuICogY29uc29sZS5sb2coaW5wdXQuY2FyZElkKTtcbiAqIGNvbnNvbGUubG9nKGlucHV0LmV4ZWN1dGlvbk1vZGUpO1xuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBleHRyYWN0QWN0aW9uSW5wdXQoKTogQWN0aW9uSW5wdXQge1xuICByZXR1cm4ge1xuICAgIGNhcmRJZDogZ2V0Q2FyZElkKCksXG4gICAgYWN0aW9uTmFtZTogZ2V0QWN0aW9uTmFtZSgpLFxuICAgIGVudmlyb25tZW50OiBnZXRFbnZpcm9ubWVudCgpLFxuICAgIGV4ZWN1dGlvbk1vZGU6IGdldEV4ZWN1dGlvbk1vZGUoKSxcbiAgICBhcGlCYXNlVXJsOiBnZXRBcGlCYXNlVXJsKCksXG4gICAgYXBpQWNjZXNzVG9rZW46IGdldEFwaUFjY2Vzc1Rva2VuKCksXG4gICAgY29kaW5nQWdlbnQ6IGdldENvZGluZ0FnZW50KCksXG4gICAgc3dpdGNoVG9JbnRlcmFjdGl2ZURhdGE6IHJlYWRTd2l0Y2hUb0ludGVyYWN0aXZlRGF0YSgpLFxuICAgIHJlcG9Sb290OiBnZXRSZXBvUm9vdCgpLFxuICAgIGNhcmRSZXBvUGF0aDogZ2V0Q2FyZFJlcG9QYXRoKCksXG4gICAgY29uZmlnUGF0aDogZ2V0Q29uZmlnUGF0aCgpLFxuICAgIGV4dGVuc2lvblBhdGg6IGdldEV4dGVuc2lvblBhdGgoKVxuICB9O1xufVxuXG4vKipcbiAqIEJ1aWxkcyBhIHR5cGVkIHR5cGUgaG9vayBpbnB1dCBvYmplY3QgZnJvbSBlbnZpcm9ubWVudCB2YXJpYWJsZXMuXG4gKlxuICogRXh0cmFjdHMgYWxsIGZpZWxkcyByZXF1aXJlZCBmb3IgdHlwZSBsaWZlY3ljbGUgaG9va3MgKHZhbGlkYXRvciwgY3JlYXRlLFxuICogdXBkYXRlLCBkZWxldGUpLlxuICpcbiAqIEByZXR1cm5zIFR5cGVkIFR5cGVIb29rSW5wdXQgb2JqZWN0XG4gKiBAdGhyb3dzIEVycm9yIGlmIHJlcXVpcmVkIGVudiB2YXJzIGFyZSBtaXNzaW5nIG9yIGludmFsaWRcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiAvLyBGb3IgYSB0eXBlIGhvb2sgaGFuZGxlclxuICogY29uc3QgaW5wdXQgPSBleHRyYWN0VHlwZUlucHV0KCk7XG4gKiBjb25zb2xlLmxvZyhpbnB1dC50eXBlTmFtZSk7XG4gKiBjb25zb2xlLmxvZyhpbnB1dC5maWxlTmFtZSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGV4dHJhY3RUeXBlSW5wdXQoKTogVHlwZUhvb2tJbnB1dCB7XG4gIHJldHVybiB7XG4gICAgY2FyZElkOiBnZXRDYXJkSWQoKSxcbiAgICBlbnZpcm9ubWVudDogZ2V0RW52aXJvbm1lbnQoKSxcbiAgICB0eXBlTmFtZTogZ2V0VHlwZU5hbWUoKSxcbiAgICB0eXBlVmVyc2lvbjogZ2V0VHlwZVZlcnNpb24oKSxcbiAgICBmaWxlTmFtZTogZ2V0RmlsZU5hbWUoKSxcbiAgICBmaWxlUGF0aDogZ2V0RmlsZVBhdGgoKSxcbiAgICBmaWxlU2l6ZTogZ2V0RmlsZVNpemUoKSxcbiAgICBmaWxlU2hhMjU2OiBnZXRTaGEyNTYoKSxcbiAgICBjb250ZW50VHlwZTogZ2V0Q29udGVudFR5cGUoKSxcbiAgICBhcGlCYXNlVXJsOiBnZXRBcGlCYXNlVXJsKCksXG4gICAgYXBpQWNjZXNzVG9rZW46IGdldEFwaUFjY2Vzc1Rva2VuKClcbiAgfTtcbn1cbiIsICIvKipcbiAqIEV4aXQgY29kZSBjb25zdGFudHMgYW5kIGhlbHBlcnMgZm9yIENhcmRzIEV4dGVuc2lvbiBob29rcy5cbiAqXG4gKiBDYXJkcyBob29rcyBjb21tdW5pY2F0ZSBzdWNjZXNzIGFuZCBmYWlsdXJlIHZpYSBwcm9jZXNzIGV4aXQgY29kZXMgYW5kXG4gKiBzdGRlcnIgb3V0cHV0LiBUaGlzIG1vZHVsZSBjZW50cmFsaXplcyB0aG9zZSBjb252ZW50aW9ucyBzbyB0aGUgcnVudGltZVxuICogYW5kIGhvb2tzIHNwZWFrIHRoZSBzYW1lIHByb3RvY29sLlxuICpcbiAqIEBzdW1tYXJ5IEV4aXQgY29kZSBjb25zdGFudHMgYW5kIGhlbHBlcnMgZm9yIENhcmRzIEV4dGVuc2lvbiBob29rc1xuICogQG1vZHVsZVxuICovXG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIEV4aXQgQ29kZSBDb25zdGFudHNcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuLyoqXG4gKiBFeGl0IGNvZGVzIHVzZWQgYnkgQ2FyZHMgaG9va3MuXG4gKlxuICogVGhlIENhcmRzIHJ1bnRpbWUgaW50ZXJwcmV0cyBhbnkgbm9uLXplcm8gZXhpdCBjb2RlIGFzIGZhaWx1cmUuXG4gKi9cbmV4cG9ydCBjb25zdCBFWElUX0NPREVTID0ge1xuICAvKiogSGFuZGxlciBjb21wbGV0ZWQgc3VjY2Vzc2Z1bGx5LiAqL1xuICBTVUNDRVNTOiAwLFxuICAvKiogSGFuZGxlciB0aHJldyBhbiBlcnJvci4gKi9cbiAgRVJST1I6IDEsXG4gIC8qKiBIYW5kbGVyIHByb2Nlc3NlZCBzd2l0Y2hUb0ludGVyYWN0aXZlIGFuZCBpcyBleGl0aW5nIGZvciByZWxhdW5jaC4gKi9cbiAgU1dJVENIX1RPX0lOVEVSQUNUSVZFOiA0MlxufSBhcyBjb25zdDtcblxuLyoqXG4gKiBVbmlvbiBvZiB2YWxpZCBDYXJkcyBob29rIGV4aXQgY29kZXMuXG4gKi9cbmV4cG9ydCB0eXBlIEV4aXRDb2RlID0gKHR5cGVvZiBFWElUX0NPREVTKVtrZXlvZiB0eXBlb2YgRVhJVF9DT0RFU107XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIEVycm9yIE91dHB1dCBIZWxwZXJzXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbi8qKlxuICogV3JpdGVzIGFuIGVycm9yIG1lc3NhZ2UgdG8gc3RkZXJyIHdpdGggYSB0cmFpbGluZyBuZXdsaW5lLlxuICpcbiAqIFVzZSB0aGlzIHdoZW4gYSBob29rIG5lZWRzIHRvIHJlcG9ydCBhIGZhaWx1cmUgd2l0aG91dCBwb2xsdXRpbmcgc3Rkb3V0LlxuICogQHBhcmFtIG1lc3NhZ2UgLSBFcnJvciBtZXNzYWdlIHRvIHdyaXRlXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogd3JpdGVFcnJvcignRmFpbGVkIHRvIGNvbm5lY3QgdG8gZGF0YWJhc2UnKTtcbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gd3JpdGVFcnJvcihtZXNzYWdlOiBzdHJpbmcpOiB2b2lkIHtcbiAgcHJvY2Vzcy5zdGRlcnIud3JpdGUoYCR7bWVzc2FnZX1cXG5gKTtcbn1cblxuLyoqXG4gKiBXcml0ZXMgYW4gZXJyb3IgbWVzc2FnZSB0byBzdGRlcnIgYW5kIGV4aXRzIHdpdGggRVJST1IgY29kZS5cbiAqXG4gKiBUaGlzIHRlcm1pbmF0ZXMgdGhlIHByb2Nlc3MgaW1tZWRpYXRlbHksIHNvIGFueSBwZW5kaW5nIGFzeW5jIHdvcmsgd2lsbFxuICogbm90IGZpbmlzaCB1bmxlc3MgaXQgd2FzIGFscmVhZHkgYXdhaXRlZC5cbiAqIEBwYXJhbSBtZXNzYWdlIC0gRXJyb3IgbWVzc2FnZSB0byB3cml0ZSBiZWZvcmUgZXhpdGluZ1xuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGlmICghaXNWYWxpZCkge1xuICogICBleGl0V2l0aEVycm9yKCdJbnZhbGlkIGNvbmZpZ3VyYXRpb24nKTtcbiAqIH1cbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gZXhpdFdpdGhFcnJvcihtZXNzYWdlOiBzdHJpbmcpOiBuZXZlciB7XG4gIHdyaXRlRXJyb3IobWVzc2FnZSk7XG4gIHByb2Nlc3MuZXhpdChFWElUX0NPREVTLkVSUk9SKTtcbn1cblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gSW50ZXJuYWwgUmVzdWx0IFRyYWNraW5nXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbi8qKlxuICogSW50ZXJuYWwgcnVudGltZSBib29ra2VlcGluZyBmb3IgaG9vayBleGVjdXRpb24gcmVzdWx0cy5cbiAqXG4gKiBUaGlzIHN0cnVjdHVyZSBhbGxvd3MgdGhlIHJ1bnRpbWUgdG8gY2FycnkgZXJyb3IgZGV0YWlscyB3aXRob3V0IGNoYW5naW5nXG4gKiB0aGUgZXhpdC1jb2RlIHByb3RvY29sLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIEhvb2tFeGVjdXRpb25SZXN1bHQge1xuICAvKiogV2hldGhlciB0aGUgaG9vayBleGVjdXRlZCBzdWNjZXNzZnVsbHkuICovXG4gIHN1Y2Nlc3M6IGJvb2xlYW47XG4gIC8qKiBUaGUgZXhpdCBjb2RlIHRvIHVzZSB3aGVuIGV4aXRpbmcuICovXG4gIGV4aXRDb2RlOiBFeGl0Q29kZTtcbiAgLyoqIFRoZSBlcnJvciB0aGF0IG9jY3VycmVkLCBpZiBhbnkuICovXG4gIGVycm9yPzogRXJyb3I7XG59XG4iLCAiLyoqXG4gKiBTdHJ1Y3R1cmVkIGxvZ2dpbmcgZm9yIENhcmRzIEV4dGVuc2lvbiBob29rcy5cbiAqXG4gKiBPdXRwdXQgaXMgb3B0LWluOiB0aGUgbG9nZ2VyIG9ubHkgZW1pdHMgdG8gcmVnaXN0ZXJlZCBoYW5kbGVycyBvciBhXG4gKiBjb25maWd1cmVkIGxvZyBmaWxlLiBJZiB5b3UgY29uZmlndXJlIG5vdGhpbmcsIHRoZSBsb2dnZXIgcG9saXRlbHkgc2F5c1xuICogbm90aGluZyBhdCBhbGwuIEl0IG5ldmVyIHdyaXRlcyB0byBzdGRvdXQgYW5kIGF2b2lkcyBzdGRlcnIgdG8ga2VlcCBob29rXG4gKiBwcm90b2NvbHMgY2xlYW4uXG4gKlxuICogQHN1bW1hcnkgU3RydWN0dXJlZCBsb2dnaW5nIGZvciBDYXJkcyBFeHRlbnNpb24gaG9va3NcbiAqIEBtb2R1bGVcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBpbXBvcnQgeyBsb2dnZXIgfSBmcm9tICdAY2FyZHMvc2RrL2NvbmZpZyc7XG4gKlxuICogLy8gU3Vic2NyaWJlIHRvIGxvZyBldmVudHNcbiAqIGNvbnN0IHVuc3Vic2NyaWJlID0gbG9nZ2VyLm9uKCdlcnJvcicsIChldmVudCkgPT4ge1xuICogICBjb25zb2xlLmVycm9yKGBFcnJvciBpbiAke2V2ZW50Lmhvb2tUeXBlfTogJHtldmVudC5tZXNzYWdlfWApO1xuICogfSk7XG4gKlxuICogLy8gTGF0ZXIsIGNsZWFuIHVwXG4gKiB1bnN1YnNjcmliZSgpO1xuICogYGBgXG4gKi9cblxuaW1wb3J0IHsgY2xvc2VTeW5jLCBleGlzdHNTeW5jLCBta2RpclN5bmMsIG9wZW5TeW5jLCB3cml0ZVN5bmMgfSBmcm9tICdub2RlOmZzJztcbmltcG9ydCB7IGRpcm5hbWUgfSBmcm9tICdub2RlOnBhdGgnO1xuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBMb2cgTGV2ZWwgVHlwZXNcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuLyoqXG4gKiBBdmFpbGFibGUgbG9nIGxldmVscy5cbiAqXG4gKiB8IExldmVsIHwgU2V2ZXJpdHkgfCBVc2UgQ2FzZSB8XG4gKiB8LS0tLS0tLXwtLS0tLS0tLS0tfC0tLS0tLS0tLS18XG4gKiB8IGBkZWJ1Z2AgfCBMb3dlc3QgfCBEZXRhaWxlZCBkZWJ1Z2dpbmcgaW5mb3JtYXRpb24gfFxuICogfCBgaW5mb2AgfCBMb3cgfCBHZW5lcmFsIG9wZXJhdGlvbmFsIGV2ZW50cyB8XG4gKiB8IGB3YXJuYCB8IE1lZGl1bSB8IFdhcm5pbmcgY29uZGl0aW9ucyB0aGF0IG1heSBpbmRpY2F0ZSBpc3N1ZXMgfFxuICogfCBgZXJyb3JgIHwgSGlnaCB8IEVycm9yIGNvbmRpdGlvbnMgcmVxdWlyaW5nIGF0dGVudGlvbiB8XG4gKi9cbmV4cG9ydCB0eXBlIExvZ0xldmVsID0gJ2RlYnVnJyB8ICdpbmZvJyB8ICd3YXJuJyB8ICdlcnJvcic7XG5cbi8qKlxuICogQWxsIGxvZyBsZXZlbHMgaW4gb3JkZXIgb2Ygc2V2ZXJpdHkgKGxvd2VzdCB0byBoaWdoZXN0KS5cbiAqL1xuZXhwb3J0IGNvbnN0IExPR19MRVZFTFMgPSBbJ2RlYnVnJywgJ2luZm8nLCAnd2FybicsICdlcnJvciddIGFzIGNvbnN0IHNhdGlzZmllcyByZWFkb25seSBMb2dMZXZlbFtdO1xuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBMb2cgRXZlbnQgVHlwZVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4vKipcbiAqIFN0cnVjdHVyZWQgbG9nIGV2ZW50IGVtaXR0ZWQgYnkgdGhlIGxvZ2dlci5cbiAqXG4gKiBFdmVudHMgaW5jbHVkZSBjb250ZXh0dWFsIGRldGFpbHMgYWJvdXQgaG9vayBleGVjdXRpb24gYW5kIGFyZSBzdWl0YWJsZSBmb3JcbiAqIGRlYnVnZ2luZywgbW9uaXRvcmluZywgYW5kIGFuYWx5dGljcyBwaXBlbGluZXMuXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogLy8gRXhhbXBsZSBsb2cgZXZlbnRcbiAqIGNvbnN0IGV2ZW50OiBMb2dFdmVudCA9IHtcbiAqICAgdGltZXN0YW1wOiAnMjAyNC0wMS0xNVQxMDozMDowMC4wMDBaJyxcbiAqICAgbGV2ZWw6ICd3YXJuJyxcbiAqICAgaG9va1R5cGU6ICdhY3Rpb24tc3RhcnQnLFxuICogICBtZXNzYWdlOiAnQ2FyZCBzdGFydGVkJyxcbiAqICAgaW5wdXQ6IHsgY2FyZElkOiAnY2FyZC0xMjMnIH1cbiAqIH07XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBMb2dFdmVudCB7XG4gIC8qKlxuICAgKiBJU08gODYwMSB0aW1lc3RhbXAgb2Ygd2hlbiB0aGUgZXZlbnQgb2NjdXJyZWQuXG4gICAqIEBleGFtcGxlICcyMDI0LTAxLTE1VDEwOjMwOjAwLjAwMFonXG4gICAqL1xuICB0aW1lc3RhbXA6IHN0cmluZztcblxuICAvKipcbiAgICogU2V2ZXJpdHkgbGV2ZWwgb2YgdGhlIGxvZyBldmVudC5cbiAgICovXG4gIGxldmVsOiBMb2dMZXZlbDtcblxuICAvKipcbiAgICogVHlwZSBvZiBob29rIHRoYXQgZ2VuZXJhdGVkIHRoaXMgZXZlbnQuXG4gICAqIE1heSBiZSB1bmRlZmluZWQgZm9yIGV2ZW50cyBvdXRzaWRlIGhvb2sgY29udGV4dC5cbiAgICovXG4gIGhvb2tUeXBlPzogc3RyaW5nO1xuXG4gIC8qKlxuICAgKiBIdW1hbi1yZWFkYWJsZSBkZXNjcmlwdGlvbiBvZiB3aGF0IGhhcHBlbmVkLlxuICAgKi9cbiAgbWVzc2FnZTogc3RyaW5nO1xuXG4gIC8qKlxuICAgKiBIb29rIGlucHV0IGRhdGEgYXQgdGhlIHRpbWUgb2YgbG9nZ2luZy5cbiAgICpcbiAgICogVGhpcyBpcyBwYXJ0aWFsIGJ5IGRlc2lnbiwgc28geW91IGNhbiBhdm9pZCBsb2dnaW5nIGxhcmdlIG9yIHNlbnNpdGl2ZVxuICAgKiBwYXlsb2FkcyB3aGlsZSBzdGlsbCBjYXB0dXJpbmcga2V5IGlkZW50aWZpZXJzLlxuICAgKi9cbiAgaW5wdXQ/OiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPjtcblxuICAvKipcbiAgICogRXJyb3IgaW5mb3JtYXRpb24gaWYgdGhpcyBldmVudCByZXByZXNlbnRzIGFuIGVycm9yLlxuICAgKiBDb250YWlucyBzdHJ1Y3R1cmVkIGVycm9yIGRldGFpbHMgZm9yIGFuYWx5c2lzLlxuICAgKi9cbiAgZXJyb3I/OiBMb2dFdmVudEVycm9yO1xuXG4gIC8qKlxuICAgKiBBZGRpdGlvbmFsIGNvbnRleHQgZGF0YSBwcm92aWRlZCBieSB0aGUgY2FsbGVyLlxuICAgKlxuICAgKiBVc2UgdGhpcyBmb3Igc3RydWN0dXJlZCBtZXRhZGF0YSB0aGF0IHlvdSB3YW50IGRvd25zdHJlYW0gaGFuZGxlcnNcbiAgICogdG8gcmVjZWl2ZSAoZS5nLiwgcmVxdWVzdCBJRHMsIHRpbWluZyBkYXRhKS5cbiAgICovXG4gIGNvbnRleHQ/OiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPjtcbn1cblxuLyoqXG4gKiBTdHJ1Y3R1cmVkIGVycm9yIGluZm9ybWF0aW9uIHdpdGhpbiBhIGxvZyBldmVudC5cbiAqXG4gKiBFcnJvcnMgYXJlIG5vcm1hbGl6ZWQgc28gaGFuZGxlcnMgY2FuIGRlcGVuZCBvbiBjb25zaXN0ZW50IHNoYXBlLCBldmVuIHdoZW5cbiAqIGNhbGxlcnMgdGhyb3cgbm9uLUVycm9yIHZhbHVlcy5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBMb2dFdmVudEVycm9yIHtcbiAgLyoqXG4gICAqIEVycm9yIG5hbWUgKGUuZy4sICdUeXBlRXJyb3InLCAnVmFsaWRhdGlvbkVycm9yJykuXG4gICAqL1xuICBuYW1lOiBzdHJpbmc7XG5cbiAgLyoqXG4gICAqIEVycm9yIG1lc3NhZ2UgZGVzY3JpYmluZyB3aGF0IHdlbnQgd3JvbmcuXG4gICAqL1xuICBtZXNzYWdlOiBzdHJpbmc7XG5cbiAgLyoqXG4gICAqIFN0YWNrIHRyYWNlIGlmIGF2YWlsYWJsZS5cbiAgICovXG4gIHN0YWNrPzogc3RyaW5nO1xuXG4gIC8qKlxuICAgKiBFcnJvciBjYXVzZSBjaGFpbiBpZiB0aGUgZXJyb3Igd2FzIHdyYXBwZWQuXG4gICAqL1xuICBjYXVzZT86IExvZ0V2ZW50RXJyb3I7XG59XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIEV2ZW50IEhhbmRsZXIgVHlwZVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4vKipcbiAqIEhhbmRsZXIgaW52b2tlZCB3aGVuIGEgbG9nIGV2ZW50IGlzIGVtaXR0ZWQuXG4gKlxuICogSGFuZGxlcnMgcnVuIHN5bmNocm9ub3VzbHkuIEVycm9ycyB0aHJvd24gYnkgYSBoYW5kbGVyIGFyZSBzd2FsbG93ZWQgc29cbiAqIGxvZ2dpbmcgY2Fubm90IGJyZWFrIGhvb2sgZXhlY3V0aW9uLlxuICogQHBhcmFtIGV2ZW50IC0gVGhlIGxvZyBldmVudCB0byBoYW5kbGVcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiAvLyBGb3J3YXJkIHRvIGV4dGVybmFsIGxvZ2dpbmcgc2VydmljZVxuICogY29uc3QgaGFuZGxlcjogTG9nRXZlbnRIYW5kbGVyID0gKGV2ZW50KSA9PiB7XG4gKiAgIGV4dGVybmFsTG9nZ2VyLmxvZyh7XG4gKiAgICAgbGV2ZWw6IGV2ZW50LmxldmVsLFxuICogICAgIG1lc3NhZ2U6IGV2ZW50Lm1lc3NhZ2UsXG4gKiAgICAgbWV0YWRhdGE6IHsgaG9va1R5cGU6IGV2ZW50Lmhvb2tUeXBlIH1cbiAqICAgfSk7XG4gKiB9O1xuICogYGBgXG4gKi9cbmV4cG9ydCB0eXBlIExvZ0V2ZW50SGFuZGxlciA9IChldmVudDogTG9nRXZlbnQpID0+IHZvaWQ7XG5cbi8qKlxuICogRnVuY3Rpb24gdG8gdW5zdWJzY3JpYmUgYSBsb2cgZXZlbnQgaGFuZGxlci5cbiAqXG4gKiBDYWxsIHRoaXMgZnVuY3Rpb24gdG8gc3RvcCByZWNlaXZpbmcgbG9nIGV2ZW50cy4gQWx3YXlzIGNhbGwgdW5zdWJzY3JpYmVcbiAqIHdoZW4gdGhlIGhhbmRsZXIgaXMgbm8gbG9uZ2VyIG5lZWRlZCB0byBwcmV2ZW50IG1lbW9yeSBsZWFrcy5cbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBjb25zdCB1bnN1YnNjcmliZSA9IGxvZ2dlci5vbignZXJyb3InLCBoYW5kbGVFcnJvcik7XG4gKiAvLyAuLi4gbGF0ZXJcbiAqIHVuc3Vic2NyaWJlKCk7IC8vIFN0b3AgcmVjZWl2aW5nIGV2ZW50c1xuICogYGBgXG4gKi9cbmV4cG9ydCB0eXBlIFVuc3Vic2NyaWJlID0gKCkgPT4gdm9pZDtcblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gTG9nZ2VyIENvbmZpZ3VyYXRpb25cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuLyoqXG4gKiBDb25maWd1cmF0aW9uIG9wdGlvbnMgZm9yIHRoZSBMb2dnZXIuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgTG9nZ2VyQ29uZmlnIHtcbiAgLyoqXG4gICAqIFBhdGggdG8gdGhlIGxvZyBmaWxlIGZvciBKU09OIExpbmVzIG91dHB1dC5cbiAgICpcbiAgICogSWYgbm90IHNldCwgZmlsZSBsb2dnaW5nIGlzIGRpc2FibGVkLiBDYW4gYWxzbyBiZSBzZXQgdmlhIHRoZVxuICAgKiBgQ0FSRFNfSE9PS1NfTE9HX0ZJTEVgIGVudmlyb25tZW50IHZhcmlhYmxlLlxuICAgKi9cbiAgbG9nRmlsZVBhdGg/OiBzdHJpbmc7XG59XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIExvZ2dlciBJbnRlcmZhY2UgKGZvciB0ZXN0aW5nIGFuZCB0eXBlIGNvbXBhdGliaWxpdHkpXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbi8qKlxuICogTG9nZ2VyIGludGVyZmFjZSBmb3Igc3RydWN0dXJlZCwgY29udGV4dC1hd2FyZSBsb2dnaW5nLlxuICpcbiAqIFRoaXMgaW50ZXJmYWNlIGRlZmluZXMgdGhlIHB1YmxpYyBBUEkgb2YgdGhlIExvZ2dlciBjbGFzcy4gSXQgZXhpc3RzXG4gKiBwcmltYXJpbHkgZm9yIHR5cGUgY29tcGF0aWJpbGl0eSBhbmQgdGVzdGluZyBwdXJwb3NlcywgYWxsb3dpbmcgdGVzdHNcbiAqIHRvIG1vY2sgdGhlIGxvZ2dlciB3aXRob3V0IG5lZWRpbmcgdG8gaW1wbGVtZW50IGFsbCBpbnRlcm5hbCBtZXRob2RzLlxuICpcbiAqIEZvciBwcm9kdWN0aW9uIHVzZSwgdXNlIHRoZSB7QGxpbmsgTG9nZ2VyfSBjbGFzcyBvciB0aGUge0BsaW5rIGxvZ2dlcn1cbiAqIHNpbmdsZXRvbiBleHBvcnQuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgSUxvZ2dlciB7XG4gIC8qKlxuICAgKiBMb2dzIGEgZGVidWcgbWVzc2FnZS5cbiAgICogQHBhcmFtIG1lc3NhZ2UgLSBEaWFnbm9zdGljIHRleHQgZGVzY3JpYmluZyBsb3ctbGV2ZWwgZXhlY3V0aW9uIGRldGFpbHMuXG4gICAqIEBwYXJhbSBjb250ZXh0IC0gT3B0aW9uYWwgc3RydWN0dXJlZCBtZXRhZGF0YSBtZXJnZWQgaW50byB0aGUgZW1pdHRlZCBldmVudC5cbiAgICovXG4gIGRlYnVnKG1lc3NhZ2U6IHN0cmluZywgY29udGV4dD86IFJlY29yZDxzdHJpbmcsIHVua25vd24+KTogdm9pZDtcblxuICAvKipcbiAgICogTG9ncyBhbiBpbmZvIG1lc3NhZ2UuXG4gICAqIEBwYXJhbSBtZXNzYWdlIC0gT3BlcmF0aW9uYWwgbWVzc2FnZSBkZXNjcmliaW5nIG5vcm1hbCBob29rIHByb2dyZXNzLlxuICAgKiBAcGFyYW0gY29udGV4dCAtIE9wdGlvbmFsIHN0cnVjdHVyZWQgbWV0YWRhdGEgbWVyZ2VkIGludG8gdGhlIGVtaXR0ZWQgZXZlbnQuXG4gICAqL1xuICBpbmZvKG1lc3NhZ2U6IHN0cmluZywgY29udGV4dD86IFJlY29yZDxzdHJpbmcsIHVua25vd24+KTogdm9pZDtcblxuICAvKipcbiAgICogTG9ncyBhIHdhcm5pbmcgbWVzc2FnZS5cbiAgICogQHBhcmFtIG1lc3NhZ2UgLSBXYXJuaW5nIHRleHQgZm9yIHJlY292ZXJhYmxlIG9yIHN1c3BpY2lvdXMgY29uZGl0aW9ucy5cbiAgICogQHBhcmFtIGNvbnRleHQgLSBPcHRpb25hbCBzdHJ1Y3R1cmVkIG1ldGFkYXRhIG1lcmdlZCBpbnRvIHRoZSBlbWl0dGVkIGV2ZW50LlxuICAgKi9cbiAgd2FybihtZXNzYWdlOiBzdHJpbmcsIGNvbnRleHQ/OiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPik6IHZvaWQ7XG5cbiAgLyoqXG4gICAqIExvZ3MgYW4gZXJyb3IgbWVzc2FnZS5cbiAgICogQHBhcmFtIG1lc3NhZ2UgLSBFcnJvciB0ZXh0IGRlc2NyaWJpbmcgYSBoYW5kbGVkIGZhaWx1cmUgY29uZGl0aW9uLlxuICAgKiBAcGFyYW0gY29udGV4dCAtIE9wdGlvbmFsIHN0cnVjdHVyZWQgbWV0YWRhdGEgbWVyZ2VkIGludG8gdGhlIGVtaXR0ZWQgZXZlbnQuXG4gICAqL1xuICBlcnJvcihtZXNzYWdlOiBzdHJpbmcsIGNvbnRleHQ/OiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPik6IHZvaWQ7XG5cbiAgLyoqXG4gICAqIExvZ3MgYSBzdHJ1Y3R1cmVkIGVycm9yIHdpdGggZnVsbCBlcnJvciBkZXRhaWxzLlxuICAgKiBAcGFyYW0gZXJyb3IgLSBUaGUgZXJyb3IgdG8gbG9nXG4gICAqIEBwYXJhbSBtZXNzYWdlIC0gSHVtYW4tcmVhZGFibGUgZGVzY3JpcHRpb24gb2Ygd2hhdCBmYWlsZWRcbiAgICogQHBhcmFtIGNvbnRleHQgLSBPcHRpb25hbCBzdHJ1Y3R1cmVkIG1ldGFkYXRhIG1lcmdlZCBpbnRvIHRoZSBlbWl0dGVkIGV2ZW50LlxuICAgKi9cbiAgbG9nRXJyb3IoZXJyb3I6IHVua25vd24sIG1lc3NhZ2U6IHN0cmluZywgY29udGV4dD86IFJlY29yZDxzdHJpbmcsIHVua25vd24+KTogdm9pZDtcbn1cblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gTG9nZ2VyIENsYXNzXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbi8qKlxuICogTG9nZ2VyIGZvciBDYXJkcyBFeHRlbnNpb24gaG9va3Mgd2l0aCBldmVudCBzdWJzY3JpcHRpb24gYW5kIGZpbGUgb3V0cHV0LlxuICpcbiAqIE91dHB1dCBpcyBvcHQtaW4gYW5kIGJlc3QtZWZmb3J0OlxuICogLSBXaXRoIG5vIGhhbmRsZXJzIGFuZCBubyBsb2cgZmlsZSwgZXZlbnRzIGFyZSBkcm9wcGVkLlxuICogLSBIYW5kbGVyIGVycm9ycyBhcmUgc3dhbGxvd2VkIHNvIGxvZ2dpbmcgY2Fubm90IGJyZWFrIGhvb2tzLlxuICogLSBGaWxlIG91dHB1dCB1c2VzIEpTT04gTGluZXMgYW5kIGlnbm9yZXMgd3JpdGUgZmFpbHVyZXMuXG4gKlxuICogVGhlIGxvZ2dlciBuZXZlciB3cml0ZXMgdG8gc3Rkb3V0IG9yIHN0ZGVyci5cbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBpbXBvcnQgeyBsb2dnZXIgfSBmcm9tICdAY2FyZHMvc2RrL2NvbmZpZyc7XG4gKlxuICogLy8gU3Vic2NyaWJlIHRvIGV2ZW50cyBhdCBzcGVjaWZpYyBsZXZlbFxuICogbG9nZ2VyLm9uKCd3YXJuJywgKGV2ZW50KSA9PiB7XG4gKiAgIHNlbmRBbGVydChldmVudC5tZXNzYWdlKTtcbiAqIH0pO1xuICpcbiAqIC8vIExvZyB3aXRoaW4gYSBob29rIGhhbmRsZXJcbiAqIGxvZ2dlci53YXJuKCdBYm91dCB0byBleGVjdXRlIHRhc2snKTtcbiAqIGBgYFxuICovXG5leHBvcnQgY2xhc3MgTG9nZ2VyIHtcbiAgLyoqXG4gICAqIFJlZ2lzdGVyZWQgZXZlbnQgaGFuZGxlcnMgYnkgbG9nIGxldmVsLlxuICAgKi9cbiAgcHJpdmF0ZSBoYW5kbGVyczogTWFwPExvZ0xldmVsLCBTZXQ8TG9nRXZlbnRIYW5kbGVyPj4gPSBuZXcgTWFwKCk7XG5cbiAgLyoqXG4gICAqIEZpbGUgZGVzY3JpcHRvciBmb3IgbG9nIGZpbGUgb3V0cHV0LlxuICAgKiBMYXppbHkgaW5pdGlhbGl6ZWQgb24gZmlyc3Qgd3JpdGUuXG4gICAqL1xuICBwcml2YXRlIGxvZ0ZpbGVGZDogbnVtYmVyIHwgbnVsbCA9IG51bGw7XG5cbiAgLyoqXG4gICAqIFBhdGggdG8gdGhlIGxvZyBmaWxlLCBpZiBjb25maWd1cmVkLlxuICAgKi9cbiAgcHJpdmF0ZSBsb2dGaWxlUGF0aDogc3RyaW5nIHwgbnVsbCA9IG51bGw7XG5cbiAgLyoqXG4gICAqIFdoZXRoZXIgZmlsZSBpbml0aWFsaXphdGlvbiBoYXMgYmVlbiBhdHRlbXB0ZWQuXG4gICAqL1xuICBwcml2YXRlIGZpbGVJbml0aWFsaXplZCA9IGZhbHNlO1xuXG4gIC8qKlxuICAgKiBDdXJyZW50IGhvb2sgY29udGV4dCBmb3IgZW5yaWNoaW5nIGxvZyBldmVudHMuXG4gICAqL1xuICBwcml2YXRlIGN1cnJlbnRIb29rVHlwZTogc3RyaW5nIHwgdW5kZWZpbmVkO1xuXG4gIC8qKlxuICAgKiBDdXJyZW50IGhvb2sgaW5wdXQgZm9yIGVucmljaGluZyBsb2cgZXZlbnRzLlxuICAgKi9cbiAgcHJpdmF0ZSBjdXJyZW50SW5wdXQ6IFJlY29yZDxzdHJpbmcsIHVua25vd24+IHwgdW5kZWZpbmVkO1xuXG4gIC8qKlxuICAgKiBDcmVhdGVzIGEgbmV3IExvZ2dlciBpbnN0YW5jZS5cbiAgICpcbiAgICogVHlwaWNhbGx5IHlvdSBzaG91bGQgdXNlIHRoZSBleHBvcnRlZCBgbG9nZ2VyYCBzaW5nbGV0b24gcmF0aGVyIHRoYW5cbiAgICogY3JlYXRpbmcgbmV3IGluc3RhbmNlcy5cbiAgICogQHBhcmFtIGNvbmZpZyAtIE9wdGlvbmFsIGNvbmZpZ3VyYXRpb25cbiAgICogQGV4YW1wbGVcbiAgICogYGBgdHlwZXNjcmlwdFxuICAgKiAvLyBVc2Ugc2luZ2xldG9uIChyZWNvbW1lbmRlZClcbiAgICogaW1wb3J0IHsgbG9nZ2VyIH0gZnJvbSAnQGNhcmRzL3Nkay9jb25maWcnO1xuICAgKlxuICAgKiAvLyBPciBjcmVhdGUgY3VzdG9tIGluc3RhbmNlXG4gICAqIGNvbnN0IGN1c3RvbUxvZ2dlciA9IG5ldyBMb2dnZXIoeyBsb2dGaWxlUGF0aDogJy92YXIvbG9nL2hvb2tzLmxvZycgfSk7XG4gICAqIGBgYFxuICAgKi9cbiAgY29uc3RydWN0b3IoY29uZmlnOiBMb2dnZXJDb25maWcgPSB7fSkge1xuICAgIC8vIEluaXRpYWxpemUgaGFuZGxlcnMgbWFwIGZvciBlYWNoIGxldmVsXG4gICAgZm9yIChjb25zdCBsZXZlbCBvZiBMT0dfTEVWRUxTKSB7XG4gICAgICB0aGlzLmhhbmRsZXJzLnNldChsZXZlbCwgbmV3IFNldCgpKTtcbiAgICB9XG5cbiAgICAvLyBTZXQgbG9nIGZpbGUgcGF0aCBmcm9tIGNvbmZpZyBvciBlbnZpcm9ubWVudFxuICAgIHRoaXMubG9nRmlsZVBhdGggPSBjb25maWcubG9nRmlsZVBhdGggPz8gcHJvY2Vzcy5lbnZbJ0NBUkRTX0hPT0tTX0xPR19GSUxFJ10gPz8gbnVsbDtcbiAgfVxuXG4gIC8qKlxuICAgKiBMb2dzIGEgZGVidWcgbWVzc2FnZS5cbiAgICpcbiAgICogVXNlIGZvciBkZXRhaWxlZCBkZWJ1Z2dpbmcgaW5mb3JtYXRpb24gdGhhdCBpcyB0eXBpY2FsbHkgb25seSB1c2VmdWxcbiAgICogZHVyaW5nIGRldmVsb3BtZW50IG9yIHRyb3VibGVzaG9vdGluZy5cbiAgICogQHBhcmFtIG1lc3NhZ2UgLSBEaWFnbm9zdGljIHRleHQgZGVzY3JpYmluZyBsb3ctbGV2ZWwgZXhlY3V0aW9uIGRldGFpbHMuXG4gICAqIEBwYXJhbSBjb250ZXh0IC0gT3B0aW9uYWwgc3RydWN0dXJlZCBtZXRhZGF0YSBtZXJnZWQgaW50byB0aGUgZW1pdHRlZCBldmVudC5cbiAgICogQGV4YW1wbGVcbiAgICogYGBgdHlwZXNjcmlwdFxuICAgKiBsb2dnZXIuZGVidWcoJ1Byb2Nlc3NpbmcgaG9vayBpbnB1dCcsIHsgdGFza0lkOiAndGFzay0xMjMnLCBpbnB1dFNpemU6IDI1NiB9KTtcbiAgICogYGBgXG4gICAqL1xuICBkZWJ1ZyhtZXNzYWdlOiBzdHJpbmcsIGNvbnRleHQ/OiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPik6IHZvaWQge1xuICAgIHRoaXMuZW1pdCgnZGVidWcnLCBtZXNzYWdlLCBjb250ZXh0KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBMb2dzIGFuIGluZm8gbWVzc2FnZS5cbiAgICpcbiAgICogVXNlIGZvciBnZW5lcmFsIG9wZXJhdGlvbmFsIGV2ZW50cyBsaWtlIGhvb2sgaW52b2NhdGlvbnMsIHN1Y2Nlc3NmdWxcbiAgICogY29tcGxldGlvbnMsIG9yIHN0YXRlIGNoYW5nZXMuXG4gICAqIEBwYXJhbSBtZXNzYWdlIC0gT3BlcmF0aW9uYWwgbWVzc2FnZSBkZXNjcmliaW5nIG5vcm1hbCBob29rIHByb2dyZXNzLlxuICAgKiBAcGFyYW0gY29udGV4dCAtIE9wdGlvbmFsIHN0cnVjdHVyZWQgbWV0YWRhdGEgbWVyZ2VkIGludG8gdGhlIGVtaXR0ZWQgZXZlbnQuXG4gICAqIEBleGFtcGxlXG4gICAqIGBgYHR5cGVzY3JpcHRcbiAgICogbG9nZ2VyLmluZm8oJ1Rhc2sgc3RhcnRlZCcsIHsgdGFza0lkOiAndGFzay0xMjMnLCBjYXJkSWQ6ICdjYXJkLTQ1NicgfSk7XG4gICAqIGBgYFxuICAgKi9cbiAgaW5mbyhtZXNzYWdlOiBzdHJpbmcsIGNvbnRleHQ/OiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPik6IHZvaWQge1xuICAgIHRoaXMuZW1pdCgnaW5mbycsIG1lc3NhZ2UsIGNvbnRleHQpO1xuICB9XG5cbiAgLyoqXG4gICAqIExvZ3MgYSB3YXJuaW5nIG1lc3NhZ2UuXG4gICAqXG4gICAqIFVzZSBmb3IgY29uZGl0aW9ucyB0aGF0IG1heSBpbmRpY2F0ZSBjYXJkcyBidXQgZG9uJ3QgcHJldmVudFxuICAgKiBvcGVyYXRpb24sIHN1Y2ggYXMgZGVwcmVjYXRlZCBwYXR0ZXJucyBvciBwZXJmb3JtYW5jZSBjb25jZXJucy5cbiAgICogQHBhcmFtIG1lc3NhZ2UgLSBXYXJuaW5nIHRleHQgZm9yIHJlY292ZXJhYmxlIG9yIHN1c3BpY2lvdXMgY29uZGl0aW9ucy5cbiAgICogQHBhcmFtIGNvbnRleHQgLSBPcHRpb25hbCBzdHJ1Y3R1cmVkIG1ldGFkYXRhIG1lcmdlZCBpbnRvIHRoZSBlbWl0dGVkIGV2ZW50LlxuICAgKiBAZXhhbXBsZVxuICAgKiBgYGB0eXBlc2NyaXB0XG4gICAqIGxvZ2dlci53YXJuKCdEZXByZWNhdGVkIGhvb2sgcGF0dGVybiBkZXRlY3RlZCcsIHsgcGF0dGVybjogJ2xlZ2FjeU1hdGNoZXInIH0pO1xuICAgKiBgYGBcbiAgICovXG4gIHdhcm4obWVzc2FnZTogc3RyaW5nLCBjb250ZXh0PzogUmVjb3JkPHN0cmluZywgdW5rbm93bj4pOiB2b2lkIHtcbiAgICB0aGlzLmVtaXQoJ3dhcm4nLCBtZXNzYWdlLCBjb250ZXh0KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBMb2dzIGFuIGVycm9yIG1lc3NhZ2UuXG4gICAqXG4gICAqIFVzZSBmb3IgZXJyb3IgY29uZGl0aW9ucyB0aGF0IHJlcXVpcmUgYXR0ZW50aW9uIGJ1dCB3ZXJlIGhhbmRsZWRcbiAgICogZ3JhY2VmdWxseS4gRm9yIGV4Y2VwdGlvbnMsIHByZWZlciB7QGxpbmsgbG9nRXJyb3J9LlxuICAgKiBAcGFyYW0gbWVzc2FnZSAtIEVycm9yIHRleHQgZGVzY3JpYmluZyBhIGhhbmRsZWQgZmFpbHVyZSBjb25kaXRpb24uXG4gICAqIEBwYXJhbSBjb250ZXh0IC0gT3B0aW9uYWwgc3RydWN0dXJlZCBtZXRhZGF0YSBtZXJnZWQgaW50byB0aGUgZW1pdHRlZCBldmVudC5cbiAgICogQGV4YW1wbGVcbiAgICogYGBgdHlwZXNjcmlwdFxuICAgKiBsb2dnZXIuZXJyb3IoJ0ZhaWxlZCB0byB2YWxpZGF0ZSBob29rIGlucHV0JywgeyByZWFzb246ICdlbXB0eSB0YXNrSWQnIH0pO1xuICAgKiBgYGBcbiAgICovXG4gIGVycm9yKG1lc3NhZ2U6IHN0cmluZywgY29udGV4dD86IFJlY29yZDxzdHJpbmcsIHVua25vd24+KTogdm9pZCB7XG4gICAgdGhpcy5lbWl0KCdlcnJvcicsIG1lc3NhZ2UsIGNvbnRleHQpO1xuICB9XG5cbiAgLyoqXG4gICAqIExvZ3MgYSBzdHJ1Y3R1cmVkIGVycm9yIHdpdGggZnVsbCBlcnJvciBkZXRhaWxzLlxuICAgKlxuICAgKiBVc2UgdGhpcyBmb3IgY2F1Z2h0IGV4Y2VwdGlvbnMuIE5vbi1FcnJvciB2YWx1ZXMgYXJlIG5vcm1hbGl6ZWQgc28gaGFuZGxlcnNcbiAgICogYWx3YXlzIHJlY2VpdmUgYSBjb25zaXN0ZW50IGVycm9yIHNoYXBlLlxuICAgKiBAcGFyYW0gZXJyb3IgLSBUaGUgZXJyb3IgdG8gbG9nXG4gICAqIEBwYXJhbSBtZXNzYWdlIC0gSHVtYW4tcmVhZGFibGUgZGVzY3JpcHRpb24gb2Ygd2hhdCBmYWlsZWRcbiAgICogQHBhcmFtIGNvbnRleHQgLSBPcHRpb25hbCBzdHJ1Y3R1cmVkIG1ldGFkYXRhIG1lcmdlZCBpbnRvIHRoZSBlbWl0dGVkIGV2ZW50LlxuICAgKiBAZXhhbXBsZVxuICAgKiBgYGB0eXBlc2NyaXB0XG4gICAqIHRyeSB7XG4gICAqICAgYXdhaXQgZGFuZ2Vyb3VzT3BlcmF0aW9uKCk7XG4gICAqIH0gY2F0Y2ggKGVycikge1xuICAgKiAgIGxvZ2dlci5sb2dFcnJvcihlcnIsICdGYWlsZWQgdG8gZXhlY3V0ZSBkYW5nZXJvdXMgb3BlcmF0aW9uJywge1xuICAgKiAgICAgb3BlcmF0aW9uOiAnZGVsZXRlJyxcbiAgICogICAgIHRhcmdldDogJy9pbXBvcnRhbnQvZmlsZS50eHQnXG4gICAqICAgfSk7XG4gICAqIH1cbiAgICogYGBgXG4gICAqL1xuICBsb2dFcnJvcihlcnJvcjogdW5rbm93biwgbWVzc2FnZTogc3RyaW5nLCBjb250ZXh0PzogUmVjb3JkPHN0cmluZywgdW5rbm93bj4pOiB2b2lkIHtcbiAgICBjb25zdCBlcnJvckluZm8gPSB0aGlzLmV4dHJhY3RFcnJvckluZm8oZXJyb3IpO1xuXG4gICAgY29uc3QgZXZlbnQ6IExvZ0V2ZW50ID0ge1xuICAgICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXG4gICAgICBsZXZlbDogJ2Vycm9yJyxcbiAgICAgIGhvb2tUeXBlOiB0aGlzLmN1cnJlbnRIb29rVHlwZSxcbiAgICAgIG1lc3NhZ2UsXG4gICAgICBpbnB1dDogdGhpcy5jdXJyZW50SW5wdXQsXG4gICAgICBlcnJvcjogZXJyb3JJbmZvLFxuICAgICAgY29udGV4dFxuICAgIH07XG5cbiAgICB0aGlzLmRlbGl2ZXJFdmVudChldmVudCk7XG4gIH1cblxuICAvKipcbiAgICogU3Vic2NyaWJlcyBhIGhhbmRsZXIgdG8gbG9nIGV2ZW50cyBhdCB0aGUgc3BlY2lmaWVkIGxldmVsLlxuICAgKlxuICAgKiBUaGUgaGFuZGxlciB3aWxsIGJlIGNhbGxlZCBmb3IgZXZlcnkgbG9nIGV2ZW50IGF0IHRoZSBzcGVjaWZpZWQgbGV2ZWwuXG4gICAqIFJldHVybnMgYW4gdW5zdWJzY3JpYmUgZnVuY3Rpb24gdGhhdCBzaG91bGQgYmUgY2FsbGVkIHdoZW4gdGhlIGhhbmRsZXJcbiAgICogaXMgbm8gbG9uZ2VyIG5lZWRlZC4gSGFuZGxlciBlcnJvcnMgYXJlIGlnbm9yZWQgdG8gYXZvaWQgZGlzcnVwdGluZyBob29rcy5cbiAgICogQHBhcmFtIGxldmVsIC0gVGhlIGxvZyBsZXZlbCB0byBzdWJzY3JpYmUgdG9cbiAgICogQHBhcmFtIGhhbmRsZXIgLSBUaGUgaGFuZGxlciBmdW5jdGlvbiB0byBjYWxsIGZvciBlYWNoIGV2ZW50XG4gICAqIEByZXR1cm5zIEEgZnVuY3Rpb24gdG8gdW5zdWJzY3JpYmUgdGhlIGhhbmRsZXJcbiAgICogQGV4YW1wbGVcbiAgICogYGBgdHlwZXNjcmlwdFxuICAgKiAvLyBTdWJzY3JpYmUgdG8gZXJyb3IgZXZlbnRzXG4gICAqIGNvbnN0IHVuc3Vic2NyaWJlID0gbG9nZ2VyLm9uKCdlcnJvcicsIChldmVudCkgPT4ge1xuICAgKiAgIGNvbnNvbGUuZXJyb3IoYFske2V2ZW50Lmhvb2tUeXBlfV0gJHtldmVudC5tZXNzYWdlfWApO1xuICAgKiAgIGlmIChldmVudC5lcnJvcikge1xuICAgKiAgICAgY29uc29sZS5lcnJvcihldmVudC5lcnJvci5zdGFjayk7XG4gICAqICAgfVxuICAgKiB9KTtcbiAgICpcbiAgICogLy8gTGF0ZXIsIGNsZWFuIHVwXG4gICAqIHVuc3Vic2NyaWJlKCk7XG4gICAqIGBgYFxuICAgKiBAZXhhbXBsZVxuICAgKiBgYGB0eXBlc2NyaXB0XG4gICAqIC8vIEZvcndhcmQgdG8gZXh0ZXJuYWwgbG9nZ2luZyBsaWJyYXJ5XG4gICAqIGltcG9ydCBwaW5vIGZyb20gJ3Bpbm8nO1xuICAgKiBjb25zdCBwaW5vTG9nZ2VyID0gcGlubygpO1xuICAgKlxuICAgKiBsb2dnZXIub24oJ2luZm8nLCAoZXZlbnQpID0+IHBpbm9Mb2dnZXIuaW5mbyhldmVudCwgZXZlbnQubWVzc2FnZSkpO1xuICAgKiBsb2dnZXIub24oJ3dhcm4nLCAoZXZlbnQpID0+IHBpbm9Mb2dnZXIud2FybihldmVudCwgZXZlbnQubWVzc2FnZSkpO1xuICAgKiBsb2dnZXIub24oJ2Vycm9yJywgKGV2ZW50KSA9PiBwaW5vTG9nZ2VyLmVycm9yKGV2ZW50LCBldmVudC5tZXNzYWdlKSk7XG4gICAqIGBgYFxuICAgKi9cbiAgb24obGV2ZWw6IExvZ0xldmVsLCBoYW5kbGVyOiBMb2dFdmVudEhhbmRsZXIpOiBVbnN1YnNjcmliZSB7XG4gICAgY29uc3QgbGV2ZWxIYW5kbGVycyA9IHRoaXMuaGFuZGxlcnMuZ2V0KGxldmVsKTtcbiAgICBpZiAobGV2ZWxIYW5kbGVycykge1xuICAgICAgbGV2ZWxIYW5kbGVycy5hZGQoaGFuZGxlcik7XG4gICAgfVxuXG4gICAgcmV0dXJuICgpID0+IHtcbiAgICAgIGxldmVsSGFuZGxlcnM/LmRlbGV0ZShoYW5kbGVyKTtcbiAgICB9O1xuICB9XG5cbiAgLyoqXG4gICAqIFNldHMgdGhlIGN1cnJlbnQgaG9vayBjb250ZXh0IGZvciBlbnJpY2hpbmcgbG9nIGV2ZW50cy5cbiAgICpcbiAgICogVGhpcyBpcyBjYWxsZWQgaW50ZXJuYWxseSBieSB0aGUgcnVudGltZSBiZWZvcmUgaW52b2tpbmcgaG9vayBoYW5kbGVycy5cbiAgICogWW91IHR5cGljYWxseSBkb24ndCBuZWVkIHRvIGNhbGwgdGhpcyBkaXJlY3RseS5cbiAgICogQHBhcmFtIGhvb2tUeXBlIC0gVGhlIHR5cGUgb2YgaG9vayBiZWluZyBleGVjdXRlZFxuICAgKiBAcGFyYW0gaW5wdXQgLSBUaGUgaG9vayBpbnB1dCBkYXRhXG4gICAqIEBpbnRlcm5hbFxuICAgKi9cbiAgc2V0Q29udGV4dChob29rVHlwZTogc3RyaW5nIHwgdW5kZWZpbmVkLCBpbnB1dDogUmVjb3JkPHN0cmluZywgdW5rbm93bj4gfCB1bmRlZmluZWQpOiB2b2lkIHtcbiAgICB0aGlzLmN1cnJlbnRIb29rVHlwZSA9IGhvb2tUeXBlO1xuICAgIHRoaXMuY3VycmVudElucHV0ID0gaW5wdXQ7XG4gIH1cblxuICAvKipcbiAgICogQ2xlYXJzIHRoZSBjdXJyZW50IGhvb2sgY29udGV4dC5cbiAgICpcbiAgICogQ2FsbGVkIGludGVybmFsbHkgYnkgdGhlIHJ1bnRpbWUgYWZ0ZXIgaG9vayBleGVjdXRpb24gY29tcGxldGVzLlxuICAgKiBAaW50ZXJuYWxcbiAgICovXG4gIGNsZWFyQ29udGV4dCgpOiB2b2lkIHtcbiAgICB0aGlzLmN1cnJlbnRIb29rVHlwZSA9IHVuZGVmaW5lZDtcbiAgICB0aGlzLmN1cnJlbnRJbnB1dCA9IHVuZGVmaW5lZDtcbiAgfVxuXG4gIC8qKlxuICAgKiBTZXRzIGEgZGVmYXVsdCBsb2cgZmlsZSBwYXRoIHRoYXQgb25seSB0YWtlcyBlZmZlY3QgaWYgbm8gb3RoZXIgc291cmNlXG4gICAqIGhhcyBjb25maWd1cmVkIGZpbGUgbG9nZ2luZy5cbiAgICpcbiAgICogVGhpcyBpcyB0aGUgbG93ZXN0LXByaW9yaXR5IGZpbGUgcGF0aCBzb3VyY2UuIEl0IHdpbGwgYmUgaWdub3JlZCBpZlxuICAgKiBhbnkgb2YgdGhlc2UgaGF2ZSBhbHJlYWR5IHNldCBhIHBhdGg6XG4gICAqIC0gYGxvZ0ZpbGVQYXRoYCBpbiB0aGUgY29uc3RydWN0b3IgY29uZmlnXG4gICAqIC0gYENBUkRTX0hPT0tTX0xPR19GSUxFYCBlbnZpcm9ubWVudCB2YXJpYWJsZVxuICAgKiAtIHtAbGluayBzZXRMb2dGaWxlfSBjYWxsZWQgYXQgcnVudGltZVxuICAgKlxuICAgKiBJbnRlbmRlZCBmb3IgdXNlIGJ5IENMSSBlbnRyeSBwb2ludHMgKGUuZy4sIHRoZSBgLS1sb2dgIGZsYWcpLlxuICAgKiBAcGFyYW0gZmlsZVBhdGggLSBEZWZhdWx0IHBhdGggdG8gdGhlIGxvZyBmaWxlXG4gICAqIEBleGFtcGxlXG4gICAqIGBgYHR5cGVzY3JpcHRcbiAgICogLy8gV2lyZSAtLWxvZyBDTEkgYXJndW1lbnQgYXMgYSBmYWxsYmFja1xuICAgKiBpZiAoYXJncy5sb2cpIHtcbiAgICogICBsb2dnZXIuc2V0RGVmYXVsdExvZ0ZpbGUoYXJncy5sb2cpO1xuICAgKiB9XG4gICAqIGBgYFxuICAgKi9cbiAgc2V0RGVmYXVsdExvZ0ZpbGUoZmlsZVBhdGg6IHN0cmluZyk6IHZvaWQge1xuICAgIGlmICh0aGlzLmxvZ0ZpbGVQYXRoID09PSBudWxsKSB7XG4gICAgICB0aGlzLmxvZ0ZpbGVQYXRoID0gZmlsZVBhdGg7XG4gICAgICB0aGlzLmZpbGVJbml0aWFsaXplZCA9IGZhbHNlO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBDb25maWd1cmVzIHRoZSBsb2cgZmlsZSBwYXRoIGF0IHJ1bnRpbWUuXG4gICAqXG4gICAqIENhbGwgdGhpcyB0byBlbmFibGUgb3IgY2hhbmdlIGZpbGUgbG9nZ2luZy4gU2V0dGluZyB0byBgbnVsbGAgZGlzYWJsZXNcbiAgICogZmlsZSBsb2dnaW5nIGFuZCBjbG9zZXMgYW55IG9wZW4gZmlsZSBoYW5kbGUuIERpcmVjdG9yaWVzIGFyZSBjcmVhdGVkXG4gICAqIG9uIGRlbWFuZCB3aGVuIHRoZSBmaXJzdCB3cml0ZSBvY2N1cnMuXG4gICAqIEBwYXJhbSBmaWxlUGF0aCAtIFBhdGggdG8gdGhlIGxvZyBmaWxlLCBvciBudWxsIHRvIGRpc2FibGVcbiAgICogQGV4YW1wbGVcbiAgICogYGBgdHlwZXNjcmlwdFxuICAgKiAvLyBFbmFibGUgZmlsZSBsb2dnaW5nIGF0IHJ1bnRpbWVcbiAgICogbG9nZ2VyLnNldExvZ0ZpbGUoJy92YXIvbG9nL2NhcmRzLXNkay5sb2cnKTtcbiAgICpcbiAgICogLy8gRGlzYWJsZSBmaWxlIGxvZ2dpbmdcbiAgICogbG9nZ2VyLnNldExvZ0ZpbGUobnVsbCk7XG4gICAqIGBgYFxuICAgKi9cbiAgc2V0TG9nRmlsZShmaWxlUGF0aDogc3RyaW5nIHwgbnVsbCk6IHZvaWQge1xuICAgIC8vIENsb3NlIGV4aXN0aW5nIGZpbGUgaWYgb3BlblxuICAgIGlmICh0aGlzLmxvZ0ZpbGVGZCAhPT0gbnVsbCkge1xuICAgICAgdHJ5IHtcbiAgICAgICAgY2xvc2VTeW5jKHRoaXMubG9nRmlsZUZkKTtcbiAgICAgIH0gY2F0Y2gge1xuICAgICAgICAvLyBJZ25vcmUgZXJyb3JzIG9uIGNsb3NlXG4gICAgICB9XG4gICAgICB0aGlzLmxvZ0ZpbGVGZCA9IG51bGw7XG4gICAgfVxuXG4gICAgdGhpcy5sb2dGaWxlUGF0aCA9IGZpbGVQYXRoO1xuICAgIHRoaXMuZmlsZUluaXRpYWxpemVkID0gZmFsc2U7XG4gIH1cblxuICAvKipcbiAgICogQ2xvc2VzIGFsbCByZXNvdXJjZXMgaGVsZCBieSB0aGUgbG9nZ2VyLlxuICAgKlxuICAgKiBDYWxsIHRoaXMgZHVyaW5nIGdyYWNlZnVsIHNodXRkb3duIHRvIGVuc3VyZSBhbGwgbG9nIGRhdGEgaXMgZmx1c2hlZC5cbiAgICogU2FmZSB0byBjYWxsIG11bHRpcGxlIHRpbWVzLlxuICAgKiBAZXhhbXBsZVxuICAgKiBgYGB0eXBlc2NyaXB0XG4gICAqIHByb2Nlc3Mub24oJ2V4aXQnLCAoKSA9PiB7XG4gICAqICAgbG9nZ2VyLmNsb3NlKCk7XG4gICAqIH0pO1xuICAgKiBgYGBcbiAgICovXG4gIGNsb3NlKCk6IHZvaWQge1xuICAgIGlmICh0aGlzLmxvZ0ZpbGVGZCAhPT0gbnVsbCkge1xuICAgICAgdHJ5IHtcbiAgICAgICAgY2xvc2VTeW5jKHRoaXMubG9nRmlsZUZkKTtcbiAgICAgIH0gY2F0Y2gge1xuICAgICAgICAvLyBJZ25vcmUgZXJyb3JzIG9uIGNsb3NlXG4gICAgICB9XG4gICAgICB0aGlzLmxvZ0ZpbGVGZCA9IG51bGw7XG4gICAgfVxuICAgIHRoaXMuZmlsZUluaXRpYWxpemVkID0gZmFsc2U7XG4gIH1cblxuICAvKipcbiAgICogQ2hlY2tzIGlmIHRoZXJlIGFyZSBhbnkgYWN0aXZlIGhhbmRsZXJzIG9yIGRlc3RpbmF0aW9ucy5cbiAgICpcbiAgICogUmV0dXJucyB0cnVlIGlmIGFueSBoYW5kbGVycyBhcmUgcmVnaXN0ZXJlZCBvciBmaWxlIGxvZ2dpbmcgaXMgZW5hYmxlZC5cbiAgICogVXNlZnVsIGZvciBkZWNpZGluZyB3aGV0aGVyIHRvIGNvbXB1dGUgZXhwZW5zaXZlIGxvZyBjb250ZXh0LlxuICAgKiBAcmV0dXJucyBXaGV0aGVyIHRoZSBsb2dnZXIgaGFzIGFueSBhY3RpdmUgb3V0cHV0IGRlc3RpbmF0aW9uc1xuICAgKi9cbiAgaGFzRGVzdGluYXRpb25zKCk6IGJvb2xlYW4ge1xuICAgIGNvbnN0IGhhc0hhbmRsZXJzID0gQXJyYXkuZnJvbSh0aGlzLmhhbmRsZXJzLnZhbHVlcygpKS5zb21lKChoYW5kbGVycykgPT4gaGFuZGxlcnMuc2l6ZSA+IDApO1xuICAgIHJldHVybiBoYXNIYW5kbGVycyB8fCB0aGlzLmxvZ0ZpbGVQYXRoICE9PSBudWxsO1xuICB9XG5cbiAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAvLyBQcml2YXRlIE1ldGhvZHNcbiAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4gIC8qKlxuICAgKiBFbWl0cyBhIGxvZyBldmVudC5cbiAgICogQHBhcmFtIGxldmVsIC0gVGhlIHNldmVyaXR5IGxldmVsIG9mIHRoZSBldmVudFxuICAgKiBAcGFyYW0gbWVzc2FnZSAtIFRoZSBsb2cgbWVzc2FnZVxuICAgKiBAcGFyYW0gY29udGV4dCAtIE9wdGlvbmFsIGFkZGl0aW9uYWwgY29udGV4dCBkYXRhXG4gICAqL1xuICBwcml2YXRlIGVtaXQobGV2ZWw6IExvZ0xldmVsLCBtZXNzYWdlOiBzdHJpbmcsIGNvbnRleHQ/OiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPik6IHZvaWQge1xuICAgIGNvbnN0IGV2ZW50OiBMb2dFdmVudCA9IHtcbiAgICAgIHRpbWVzdGFtcDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxuICAgICAgbGV2ZWwsXG4gICAgICBob29rVHlwZTogdGhpcy5jdXJyZW50SG9va1R5cGUsXG4gICAgICBtZXNzYWdlLFxuICAgICAgaW5wdXQ6IHRoaXMuY3VycmVudElucHV0LFxuICAgICAgY29udGV4dFxuICAgIH07XG5cbiAgICB0aGlzLmRlbGl2ZXJFdmVudChldmVudCk7XG4gIH1cblxuICAvKipcbiAgICogRGVsaXZlcnMgYW4gZXZlbnQgdG8gYWxsIHJlZ2lzdGVyZWQgZGVzdGluYXRpb25zLlxuICAgKiBAcGFyYW0gZXZlbnQgLSBUaGUgbG9nIGV2ZW50IHRvIGRlbGl2ZXJcbiAgICovXG4gIHByaXZhdGUgZGVsaXZlckV2ZW50KGV2ZW50OiBMb2dFdmVudCk6IHZvaWQge1xuICAgIC8vIERlbGl2ZXIgdG8gZXZlbnQgaGFuZGxlcnNcbiAgICBjb25zdCBsZXZlbEhhbmRsZXJzID0gdGhpcy5oYW5kbGVycy5nZXQoZXZlbnQubGV2ZWwpO1xuICAgIGlmIChsZXZlbEhhbmRsZXJzKSB7XG4gICAgICBmb3IgKGNvbnN0IGhhbmRsZXIgb2YgbGV2ZWxIYW5kbGVycykge1xuICAgICAgICB0cnkge1xuICAgICAgICAgIGhhbmRsZXIoZXZlbnQpO1xuICAgICAgICB9IGNhdGNoIHtcbiAgICAgICAgICAvLyBTaWxlbnRseSBpZ25vcmUgaGFuZGxlciBlcnJvcnMgdG8gbm90IGRpc3J1cHQgaG9vayBleGVjdXRpb25cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIC8vIFdyaXRlIHRvIGZpbGUgaWYgY29uZmlndXJlZFxuICAgIHRoaXMud3JpdGVUb0ZpbGUoZXZlbnQpO1xuICB9XG5cbiAgLyoqXG4gICAqIFdyaXRlcyBhbiBldmVudCB0byB0aGUgbG9nIGZpbGUuXG4gICAqIEBwYXJhbSBldmVudCAtIFRoZSBsb2cgZXZlbnQgdG8gd3JpdGVcbiAgICovXG4gIHByaXZhdGUgd3JpdGVUb0ZpbGUoZXZlbnQ6IExvZ0V2ZW50KTogdm9pZCB7XG4gICAgaWYgKCF0aGlzLmxvZ0ZpbGVQYXRoKSByZXR1cm47XG5cbiAgICAvLyBMYXp5IGluaXRpYWxpemF0aW9uIG9mIGZpbGUgaGFuZGxlXG4gICAgaWYgKCF0aGlzLmZpbGVJbml0aWFsaXplZCkge1xuICAgICAgdGhpcy5pbml0aWFsaXplRmlsZSgpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLmxvZ0ZpbGVGZCA9PT0gbnVsbCkgcmV0dXJuO1xuXG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IGxpbmUgPSBgJHtKU09OLnN0cmluZ2lmeShldmVudCl9XFxuYDtcbiAgICAgIHdyaXRlU3luYyh0aGlzLmxvZ0ZpbGVGZCwgbGluZSk7XG4gICAgfSBjYXRjaCB7XG4gICAgICAvLyBTaWxlbnRseSBpZ25vcmUgZmlsZSB3cml0ZSBlcnJvcnMgdG8gbm90IGRpc3J1cHQgaG9vayBleGVjdXRpb25cbiAgICAgIC8vIFRoaXMgZm9sbG93cyB0aGUgcmlzayBtaXRpZ2F0aW9uOiBcIkdyYWNlZnVsIGRlZ3JhZGF0aW9uIC0gbG9nIHdyaXRlXG4gICAgICAvLyBmYWlsdXJlcyBhcmUgc2lsZW50bHkgaWdub3JlZCB0byBub3QgZGlzcnVwdCBob29rIGV4ZWN1dGlvblwiXG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEluaXRpYWxpemVzIHRoZSBsb2cgZmlsZSBmb3Igd3JpdGluZy5cbiAgICovXG4gIHByaXZhdGUgaW5pdGlhbGl6ZUZpbGUoKTogdm9pZCB7XG4gICAgdGhpcy5maWxlSW5pdGlhbGl6ZWQgPSB0cnVlO1xuXG4gICAgaWYgKCF0aGlzLmxvZ0ZpbGVQYXRoKSByZXR1cm47XG5cbiAgICB0cnkge1xuICAgICAgLy8gRW5zdXJlIGRpcmVjdG9yeSBleGlzdHNcbiAgICAgIGNvbnN0IGRpciA9IGRpcm5hbWUodGhpcy5sb2dGaWxlUGF0aCk7XG4gICAgICBpZiAoIWV4aXN0c1N5bmMoZGlyKSkge1xuICAgICAgICBta2RpclN5bmMoZGlyLCB7IHJlY3Vyc2l2ZTogdHJ1ZSB9KTtcbiAgICAgIH1cblxuICAgICAgLy8gT3BlbiBmaWxlIGZvciBhcHBlbmRpbmdcbiAgICAgIHRoaXMubG9nRmlsZUZkID0gb3BlblN5bmModGhpcy5sb2dGaWxlUGF0aCwgJ2EnKTtcbiAgICB9IGNhdGNoIHtcbiAgICAgIC8vIFNpbGVudGx5IGlnbm9yZSBmaWxlIGluaXRpYWxpemF0aW9uIGVycm9yc1xuICAgICAgdGhpcy5sb2dGaWxlRmQgPSBudWxsO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBFeHRyYWN0cyBzdHJ1Y3R1cmVkIGVycm9yIGluZm9ybWF0aW9uIGZyb20gYW4gdW5rbm93biBlcnJvci5cbiAgICogQHBhcmFtIGVycm9yIC0gVGhlIGVycm9yIHRvIGV4dHJhY3QgaW5mb3JtYXRpb24gZnJvbVxuICAgKiBAcmV0dXJucyBTdHJ1Y3R1cmVkIGVycm9yIGluZm9ybWF0aW9uXG4gICAqL1xuICBwcml2YXRlIGV4dHJhY3RFcnJvckluZm8oZXJyb3I6IHVua25vd24pOiBMb2dFdmVudEVycm9yIHtcbiAgICBpZiAoZXJyb3IgaW5zdGFuY2VvZiBFcnJvcikge1xuICAgICAgY29uc3QgaW5mbzogTG9nRXZlbnRFcnJvciA9IHtcbiAgICAgICAgbmFtZTogZXJyb3IubmFtZSxcbiAgICAgICAgbWVzc2FnZTogZXJyb3IubWVzc2FnZSxcbiAgICAgICAgc3RhY2s6IGVycm9yLnN0YWNrXG4gICAgICB9O1xuXG4gICAgICAvLyBFeHRyYWN0IGNhdXNlIGNoYWluIGlmIHByZXNlbnRcbiAgICAgIGlmIChlcnJvci5jYXVzZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGluZm8uY2F1c2UgPSB0aGlzLmV4dHJhY3RFcnJvckluZm8oZXJyb3IuY2F1c2UpO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gaW5mbztcbiAgICB9XG5cbiAgICAvLyBIYW5kbGUgbm9uLUVycm9yIHZhbHVlc1xuICAgIHJldHVybiB7XG4gICAgICBuYW1lOiAnVW5rbm93bkVycm9yJyxcbiAgICAgIG1lc3NhZ2U6IFN0cmluZyhlcnJvcilcbiAgICB9O1xuICB9XG59XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIFNpbmdsZXRvbiBFeHBvcnRcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuLyoqXG4gKiBHbG9iYWwgbG9nZ2VyIGluc3RhbmNlIGZvciBDYXJkcyBFeHRlbnNpb24gaG9va3MuXG4gKlxuICogVXNlIHRoaXMgc2luZ2xldG9uIGZvciBhbGwgbG9nZ2luZyB3aXRoaW4gaG9va3MuIFRoZSBsb2dnZXIgaXMgY29uZmlndXJlZFxuICogdmlhIGVudmlyb25tZW50IHZhcmlhYmxlcyBhbmQgc3VwcG9ydHMgZXZlbnQgc3Vic2NyaXB0aW9uIGZvciBjdXN0b21cbiAqIGRlc3RpbmF0aW9ucy5cbiAqXG4gKiAjIyBDb25maWd1cmF0aW9uXG4gKlxuICogfCBFbnZpcm9ubWVudCBWYXJpYWJsZSB8IERlc2NyaXB0aW9uIHxcbiAqIHwtLS0tLS0tLS0tLS0tLS0tLS0tLS18LS0tLS0tLS0tLS0tLXxcbiAqIHwgYENBUkRTX0hPT0tTX0xPR19GSUxFYCB8IFBhdGggdG8gbG9nIGZpbGUgKEpTT04gTGluZXMgZm9ybWF0KSB8XG4gKlxuICogIyMgVXNhZ2UgaW4gSG9va3NcbiAqXG4gKiBUaGUgbG9nZ2VyIGNhbiBiZSB1c2VkIGRpcmVjdGx5IHdpdGhpbiBob29rIGhhbmRsZXJzOlxuICpcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGltcG9ydCB7IGxvZ2dlciB9IGZyb20gJ0BjYXJkcy9zZGsvY29uZmlnJztcbiAqXG4gKiAvLyBJbiBhIGhvb2sgaGFuZGxlclxuICogbG9nZ2VyLndhcm4oJ1Rhc2sgc3RhcnRpbmcgaW4gaW50ZXJhY3RpdmUgbW9kZScpO1xuICogYGBgXG4gKlxuICogIyMgRXh0ZXJuYWwgSW50ZWdyYXRpb25cbiAqXG4gKiBTdWJzY3JpYmUgdG8gZXZlbnRzIHRvIGZvcndhcmQgbG9ncyB0byBleHRlcm5hbCBzeXN0ZW1zOlxuICpcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGltcG9ydCB7IGxvZ2dlciB9IGZyb20gJ0BjYXJkcy9zZGsvY29uZmlnJztcbiAqIGltcG9ydCBwaW5vIGZyb20gJ3Bpbm8nO1xuICpcbiAqIGNvbnN0IHBpbm9Mb2dnZXIgPSBwaW5vKHsgbGV2ZWw6ICdkZWJ1ZycgfSk7XG4gKlxuICogbG9nZ2VyLm9uKCdkZWJ1ZycsIChldmVudCkgPT4gcGlub0xvZ2dlci5kZWJ1ZyhldmVudCwgZXZlbnQubWVzc2FnZSkpO1xuICogbG9nZ2VyLm9uKCdpbmZvJywgKGV2ZW50KSA9PiBwaW5vTG9nZ2VyLmluZm8oZXZlbnQsIGV2ZW50Lm1lc3NhZ2UpKTtcbiAqIGxvZ2dlci5vbignd2FybicsIChldmVudCkgPT4gcGlub0xvZ2dlci53YXJuKGV2ZW50LCBldmVudC5tZXNzYWdlKSk7XG4gKiBsb2dnZXIub24oJ2Vycm9yJywgKGV2ZW50KSA9PiBwaW5vTG9nZ2VyLmVycm9yKGV2ZW50LCBldmVudC5tZXNzYWdlKSk7XG4gKiBgYGBcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiAvLyBEaXJlY3QgdXNhZ2VcbiAqIGltcG9ydCB7IGxvZ2dlciB9IGZyb20gJ0BjYXJkcy9zZGsvY29uZmlnJztcbiAqXG4gKiBsb2dnZXIuaW5mbygnU3RhcnRpbmcgb3BlcmF0aW9uJyk7XG4gKiBsb2dnZXIud2FybignUmVzb3VyY2UgbGltaXQgYXBwcm9hY2hpbmcnLCB7IHVzYWdlOiAwLjkgfSk7XG4gKlxuICogdHJ5IHtcbiAqICAgYXdhaXQgcmlza3lPcGVyYXRpb24oKTtcbiAqIH0gY2F0Y2ggKGVycikge1xuICogICBsb2dnZXIubG9nRXJyb3IoZXJyLCAnUmlza3kgb3BlcmF0aW9uIGZhaWxlZCcpO1xuICogfVxuICogYGBgXG4gKi9cbmV4cG9ydCBjb25zdCBsb2dnZXIgPSBuZXcgTG9nZ2VyKCk7XG4iLCAiLyoqXG4gKiBTb2NrZXQgY2xpZW50IGZvciBydW50aW1lLXRvLWRpc3BhdGNoZXIgY29tbXVuaWNhdGlvbi5cbiAqXG4gKiBDb25uZWN0cyB0byBhIFVuaXggZG9tYWluIHNvY2tldCBjcmVhdGVkIGJ5IEFjdGlvbkRpc3BhdGNoZXIgYW5kIGhhbmRsZXNcbiAqIE5ESlNPTiAobmV3bGluZS1kZWxpbWl0ZWQgSlNPTikgcHJvdG9jb2wgZm9yIHJlY2VpdmluZyBjb21tYW5kcyBhbmQgc2VuZGluZ1xuICogcmVzcG9uc2VzLlxuICpcbiAqXG4gKiBAc3VtbWFyeSBTb2NrZXQgY2xpZW50IGZvciBydW50aW1lLXRvLWRpc3BhdGNoZXIgY29tbXVuaWNhdGlvblxuICogQG1vZHVsZVxuICovXG5cbmltcG9ydCAqIGFzIG5ldCBmcm9tICdub2RlOm5ldCc7XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIFR5cGVzXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbi8qKlxuICogQ29tbWFuZHMgdGhhdCBjYW4gYmUgcmVjZWl2ZWQgZnJvbSB0aGUgQWN0aW9uRGlzcGF0Y2hlciB2aWEgc29ja2V0LlxuICpcbiAqIFVzZXMgTkRKU09OIChuZXdsaW5lLWRlbGltaXRlZCBKU09OKSBwcm90b2NvbC5cbiAqL1xuZXhwb3J0IHR5cGUgU29ja2V0Q29tbWFuZCA9IHsgdHlwZTogJ2NhbmNlbCcgfSB8IHsgdHlwZTogJ3N3aXRjaFRvSW50ZXJhY3RpdmUnIH07XG5cbi8qKlxuICogUmVzcG9uc2Ugc2VudCBiYWNrIHRvIHRoZSBBY3Rpb25EaXNwYXRjaGVyIHdoZW4gc3dpdGNoVG9JbnRlcmFjdGl2ZSBpcyBoYW5kbGVkLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIFN3aXRjaFRvSW50ZXJhY3RpdmVSZXNwb25zZSB7XG4gIHR5cGU6ICdzd2l0Y2hUb0ludGVyYWN0aXZlUmVzcG9uc2UnO1xuICBkYXRhOiB1bmtub3duO1xufVxuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBTb2NrZXRDbGllbnRcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuLyoqXG4gKiBDbGllbnQgZm9yIHRoZSBOREpTT04gc29ja2V0IHByb3RvY29sIGJldHdlZW4gdGhlIGFjdGlvbiBydW50aW1lIGFuZFxuICogQWN0aW9uRGlzcGF0Y2hlci5cbiAqXG4gKiBSZWNlaXZlcyBjb21tYW5kcyAoY2FuY2VsLCBzd2l0Y2hUb0ludGVyYWN0aXZlKSBhbmQgc2VuZHMgcmVzcG9uc2VzXG4gKiAoc3dpdGNoVG9JbnRlcmFjdGl2ZVJlc3BvbnNlKSBvdmVyIGEgVW5peCBkb21haW4gc29ja2V0LlxuICpcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBjb25zdCBjbGllbnQgPSBhd2FpdCBTb2NrZXRDbGllbnQuY29ubmVjdCgnL3BhdGgvdG8vc29ja2V0Jyk7XG4gKiBjbGllbnQub25Db21tYW5kKChjb21tYW5kKSA9PiB7XG4gKiAgIGlmIChjb21tYW5kLnR5cGUgPT09ICdjYW5jZWwnKSB7IC4uLiB9XG4gKiB9KTtcbiAqIGBgYFxuICovXG5leHBvcnQgY2xhc3MgU29ja2V0Q2xpZW50IHtcbiAgcHJpdmF0ZSBzb2NrZXQ6IG5ldC5Tb2NrZXQ7XG4gIHByaXZhdGUgYnVmZmVyID0gJyc7XG4gIHByaXZhdGUgY29tbWFuZEhhbmRsZXI/OiAoY29tbWFuZDogU29ja2V0Q29tbWFuZCkgPT4gdm9pZDtcblxuICBwcml2YXRlIGNvbnN0cnVjdG9yKHNvY2tldDogbmV0LlNvY2tldCkge1xuICAgIHRoaXMuc29ja2V0ID0gc29ja2V0O1xuXG4gICAgc29ja2V0Lm9uKCdkYXRhJywgKGNodW5rKSA9PiB7XG4gICAgICB0aGlzLmJ1ZmZlciArPSBjaHVuay50b1N0cmluZygpO1xuICAgICAgLy8gUGFyc2UgTkRKU09OIC0gc3BsaXQgYnkgbmV3bGluZXNcbiAgICAgIGNvbnN0IGxpbmVzID0gdGhpcy5idWZmZXIuc3BsaXQoJ1xcbicpO1xuICAgICAgdGhpcy5idWZmZXIgPSBsaW5lcy5wb3AoKSA/PyAnJzsgLy8gS2VlcCBpbmNvbXBsZXRlIGxpbmUgaW4gYnVmZmVyXG5cbiAgICAgIGZvciAoY29uc3QgbGluZSBvZiBsaW5lcykge1xuICAgICAgICBpZiAobGluZS50cmltKCkgPT09ICcnKSBjb250aW51ZTtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBjb25zdCBwYXJzZWQgPSBKU09OLnBhcnNlKGxpbmUpIGFzIFNvY2tldENvbW1hbmQ7XG4gICAgICAgICAgdGhpcy5jb21tYW5kSGFuZGxlcj8uKHBhcnNlZCk7XG4gICAgICAgIH0gY2F0Y2gge1xuICAgICAgICAgIC8vIE1hbGZvcm1lZCBKU09OIG9uIHNvY2tldCBpcyBpZ25vcmVkIChwZXIgcGxhbilcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIENvbm5lY3QgdG8gYSBVbml4IGRvbWFpbiBzb2NrZXQgYXQgdGhlIGdpdmVuIHBhdGguXG4gICAqXG4gICAqIEBwYXJhbSBzb2NrZXRQYXRoIC0gUGF0aCB0byB0aGUgVW5peCBkb21haW4gc29ja2V0XG4gICAqIEByZXR1cm5zIEEgY29ubmVjdGVkIFNvY2tldENsaWVudCBpbnN0YW5jZVxuICAgKiBAdGhyb3dzIEVycm9yIGlmIHRoZSBjb25uZWN0aW9uIGZhaWxzXG4gICAqL1xuICBzdGF0aWMgY29ubmVjdChzb2NrZXRQYXRoOiBzdHJpbmcpOiBQcm9taXNlPFNvY2tldENsaWVudD4ge1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICBjb25zdCBzb2NrZXQgPSBuZXQuY3JlYXRlQ29ubmVjdGlvbihzb2NrZXRQYXRoLCAoKSA9PiB7XG4gICAgICAgIHJlc29sdmUobmV3IFNvY2tldENsaWVudChzb2NrZXQpKTtcbiAgICAgIH0pO1xuICAgICAgc29ja2V0Lm9uKCdlcnJvcicsIHJlamVjdCk7XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogUmVnaXN0ZXIgYSBoYW5kbGVyIGZvciBpbmNvbWluZyBzb2NrZXQgY29tbWFuZHMuXG4gICAqXG4gICAqIE9ubHkgb25lIGhhbmRsZXIgY2FuIGJlIHJlZ2lzdGVyZWQgYXQgYSB0aW1lLiBTdWJzZXF1ZW50IGNhbGxzIHJlcGxhY2VcbiAgICogdGhlIHByZXZpb3VzIGhhbmRsZXIuXG4gICAqXG4gICAqIEBwYXJhbSBoYW5kbGVyIC0gRnVuY3Rpb24gdG8gY2FsbCB3aGVuIGEgY29tbWFuZCBpcyByZWNlaXZlZFxuICAgKi9cbiAgb25Db21tYW5kKGhhbmRsZXI6IChjb21tYW5kOiBTb2NrZXRDb21tYW5kKSA9PiB2b2lkKTogdm9pZCB7XG4gICAgdGhpcy5jb21tYW5kSGFuZGxlciA9IGhhbmRsZXI7XG4gIH1cblxuICAvKipcbiAgICogU2VuZCBhIHJlc3BvbnNlIGJhY2sgdG8gdGhlIEFjdGlvbkRpc3BhdGNoZXIuXG4gICAqXG4gICAqIEBwYXJhbSByZXNwb25zZSAtIFRoZSByZXNwb25zZSB0byBzZW5kIGFzIE5ESlNPTlxuICAgKi9cbiAgc2VuZFJlc3BvbnNlKHJlc3BvbnNlOiBTd2l0Y2hUb0ludGVyYWN0aXZlUmVzcG9uc2UpOiB2b2lkIHtcbiAgICB0aGlzLnNvY2tldC53cml0ZShgJHtKU09OLnN0cmluZ2lmeShyZXNwb25zZSl9XFxuYCk7XG4gIH1cblxuICAvKipcbiAgICogU2VuZCBhIHJlc3BvbnNlIGFuZCBjYWxsIGNhbGxiYWNrIHdoZW4gZmx1c2hlZC5cbiAgICpcbiAgICogVXNlZCB0byBndWFyYW50ZWUgZmx1c2ggYmVmb3JlIHByb2Nlc3MuZXhpdC5cbiAgICpcbiAgICogQHBhcmFtIHJlc3BvbnNlIC0gVGhlIHJlc3BvbnNlIHRvIHNlbmQgYXMgTkRKU09OXG4gICAqIEBwYXJhbSBjYWxsYmFjayAtIENhbGxlZCBhZnRlciB0aGUgZGF0YSBpcyBmbHVzaGVkIHRvIHRoZSBzb2NrZXRcbiAgICovXG4gIHNlbmRSZXNwb25zZVRoZW4ocmVzcG9uc2U6IFN3aXRjaFRvSW50ZXJhY3RpdmVSZXNwb25zZSwgY2FsbGJhY2s6ICgpID0+IHZvaWQpOiB2b2lkIHtcbiAgICB0aGlzLnNvY2tldC53cml0ZShgJHtKU09OLnN0cmluZ2lmeShyZXNwb25zZSl9XFxuYCwgY2FsbGJhY2spO1xuICB9XG5cbiAgLyoqXG4gICAqIENsb3NlIHRoZSBzb2NrZXQgY29ubmVjdGlvbi5cbiAgICovXG4gIGNsb3NlKCk6IHZvaWQge1xuICAgIHRoaXMuc29ja2V0LmRlc3Ryb3koKTtcbiAgfVxufVxuIiwgIi8qKlxuICogUnVudGltZSBvcmNoZXN0cmF0aW9uIGZvciBjb21waWxlZCBDYXJkcyBhY3Rpb24gYW5kIHR5cGUgaGFuZGxlcnMuXG4gKlxuICogVGhpcyBtb2R1bGUgaXMgYnVuZGxlZCBpbnRvIGNvbXBpbGVkIGhhbmRsZXJzIGJ5IHRoZSBDTEkuIEl0IHByb3ZpZGVzIHRoZVxuICogZXhlY3V0aW9uIGhhcm5lc3MgdGhhdCByZWFkcyBoYW5kbGVyIGlucHV0IGZyb20gZW52aXJvbm1lbnQgdmFyaWFibGVzLCBzZXRzXG4gKiB1cCB0aGUgbG9nZ2VyIGNvbnRleHQsIGludm9rZXMgdGhlIHVzZXIncyBoYW5kbGVyLCBhbmQgZXhpdHMgdGhlIHByb2Nlc3NcbiAqIHdpdGggdGhlIGFwcHJvcHJpYXRlIGNvZGUuXG4gKlxuICogVGhlIHJ1bnRpbWUgaXMgZGVzaWduZWQgdG8gbmV2ZXIgcmV0dXJuIGluIG5vcm1hbCB1c2UuIEFsbCBjb2RlIHBhdGhzXG4gKiB0ZXJtaW5hdGUgd2l0aCBgcHJvY2Vzcy5leGl0KClgLiBUaGUgb25seSBleGNlcHRpb24gaXMgdGVzdCBzY2VuYXJpb3NcbiAqIHdoZXJlIGBwcm9jZXNzLmV4aXRgIGlzIG1vY2tlZC5cbiAqXG4gKiAjIyBFeGVjdXRpb24gRmxvd1xuICpcbiAqIDEuIEV4dHJhY3QgaW5wdXQgcGF5bG9hZCBmcm9tIGVudmlyb25tZW50IHZhcmlhYmxlcyBiYXNlZCBvbiBjb21tYW5kIHR5cGVcbiAqIDIuIFNldCBsb2dnZXIgY29udGV4dCB3aXRoIGNvbW1hbmQgdHlwZSBhbmQgaW5wdXRcbiAqIDMuIE9wdGlvbmFsbHkgY29ubmVjdCB0byBTT0NLRVRfUEFUSCBmb3IgY29tbWFuZCBkaXNwYXRjaCAoZmFpbC1vcGVuKVxuICogNC4gQnVpbGQgQWN0aW9uQ29udGV4dCB3aXRoIGxvZ2dlciwgY3dkLCBhbmQgc29ja2V0LWJhY2tlZCBjYWxsYmFja3NcbiAqIDUuIEludm9rZSB0aGUgY29tbWFuZCB3aXRoIGlucHV0IGFuZCBjb250ZXh0XG4gKiA2LiBPbiBzdWNjZXNzOiBjbGVhbiB1cCBzb2NrZXQgYW5kIGV4aXQgd2l0aCBjb2RlIDBcbiAqIDcuIE9uIGVycm9yOiBsb2cgZXJyb3IsIHdyaXRlIHRvIHN0ZGVyciwgY2xlYW4gdXAgYW5kIGV4aXQgd2l0aCBjb2RlIDFcbiAqXG4gKlxuICogQHN1bW1hcnkgUnVudGltZSBvcmNoZXN0cmF0aW9uIGZvciBjb21waWxlZCBDYXJkcyBhY3Rpb24gYW5kIHR5cGUgaGFuZGxlcnNcbiAqIEBtb2R1bGVcbiAqIEBzZWUge0BsaW5rIGV4ZWN1dGVDb21tYW5kfSBmb3IgdGhlIG1haW4gZW50cnkgcG9pbnRcbiAqXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogLy8gVGhpcyBpcyB3aGF0IGNvbXBpbGVkIGhhbmRsZXJzIGxvb2sgbGlrZSBpbnRlcm5hbGx5XG4gKiBpbXBvcnQgeyBleGVjdXRlQ29tbWFuZCB9IGZyb20gJ0BjYXJkcy9zZGsvY29uZmlnL3J1bnRpbWUnO1xuICogaW1wb3J0IG15Q29tbWFuZCBmcm9tICcuL215LWNvbW1hbmQuanMnO1xuICpcbiAqIGV4ZWN1dGVDb21tYW5kKG15Q29tbWFuZCk7XG4gKiBgYGBcbiAqL1xuXG5pbXBvcnQgdHlwZSB7IEFjdGlvbkNvbW1hbmQsIFR5cGVDcmVhdGVDb21tYW5kLCBUeXBlRGVsZXRlQ29tbWFuZCwgVHlwZVVwZGF0ZUNvbW1hbmQgfSBmcm9tICcuL2NvbW1hbmQtdHlwZXMuanMnO1xuaW1wb3J0IHsgQ0FSRFNfRU5WX1ZBUlMsIGV4dHJhY3RBY3Rpb25JbnB1dCwgZXh0cmFjdFR5cGVJbnB1dCB9IGZyb20gJy4vZW52LmpzJztcbmltcG9ydCB7IEVYSVRfQ09ERVMsIHdyaXRlRXJyb3IgfSBmcm9tICcuL2V4aXQtY29kZXMuanMnO1xuaW1wb3J0IHR5cGUgeyBBY3Rpb25Db250ZXh0LCBBY3Rpb25JbnB1dCwgVHlwZUhvb2tDb250ZXh0LCBUeXBlSG9va0lucHV0IH0gZnJvbSAnLi9pbnB1dHMuanMnO1xuaW1wb3J0IHsgbG9nZ2VyIH0gZnJvbSAnLi9sb2dnZXIuanMnO1xuaW1wb3J0IHR5cGUgeyBTb2NrZXRDb21tYW5kIH0gZnJvbSAnLi9zb2NrZXQtY2xpZW50LmpzJztcbmltcG9ydCB7IFNvY2tldENsaWVudCB9IGZyb20gJy4vc29ja2V0LWNsaWVudC5qcyc7XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIENvbW1hbmQgVHlwZSBVbmlvblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4vKipcbiAqIFVuaW9uIG9mIGFsbCBjb21tYW5kIHR5cGVzIHN1cHBvcnRlZCBieSB0aGUgcnVudGltZS5cbiAqXG4gKiBUaGlzIHR5cGUgdW5pb24gYWxsb3dzIHtAbGluayBleGVjdXRlQ29tbWFuZH0gdG8gYWNjZXB0IGFueSBjb21tYW5kIHJldHVybmVkIGJ5XG4gKiB0aGUgZmFjdG9yeSBmdW5jdGlvbnMuIFRoZSBydW50aW1lIGRpc3BhdGNoZXMgYmFzZWQgb24gdGhlIGBmYWN0b3J5VHlwZWBcbiAqIGRpc2NyaW1pbmFudC5cbiAqXG4gKiBOb3RlOiBUeXBlVmFsaWRhdG9yQ29tbWFuZCBpcyBleGNsdWRlZCBiZWNhdXNlIHZhbGlkYXRvcnMgdXNlIGEgZGlmZmVyZW50XG4gKiBleGVjdXRpb24gbW9kZWwgKGZpbGUtcGF0aCBwcm90b2NvbCB2aWEge0BsaW5rIGV4ZWN1dGVWYWxpZGF0aW9ufSkuXG4gKlxuICogQGludGVybmFsXG4gKi9cbnR5cGUgQW55Q29tbWFuZCA9IEFjdGlvbkNvbW1hbmQgfCBUeXBlQ3JlYXRlQ29tbWFuZCB8IFR5cGVVcGRhdGVDb21tYW5kIHwgVHlwZURlbGV0ZUNvbW1hbmQ7XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIEhlbHBlciBGdW5jdGlvbnNcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuLyoqXG4gKiBOb3JtYWxpemVzIGFuIHVua25vd24gZXJyb3IgdmFsdWUgaW50byBhIGh1bWFuLXJlYWRhYmxlIG1lc3NhZ2UuXG4gKlxuICogRXJyb3JzIGluIEphdmFTY3JpcHQgY2FuIGJlIHRocm93biB3aXRoIGFueSB2YWx1ZS4gVGhpcyBmdW5jdGlvbiBlbnN1cmVzXG4gKiB3ZSBhbHdheXMgZ2V0IGEgc3RyaW5nIG1lc3NhZ2UgcmVnYXJkbGVzcyBvZiB3aGF0IHdhcyB0aHJvd24uXG4gKlxuICogQHBhcmFtIGVycm9yIC0gVGhlIGNhdWdodCBlcnJvciB2YWx1ZSwgd2hpY2ggbWF5IG9yIG1heSBub3QgYmUgYW4gRXJyb3IgaW5zdGFuY2VcbiAqIEByZXR1cm5zIEEgc3RyaW5nIG1lc3NhZ2Ugc3VpdGFibGUgZm9yIGxvZ2dpbmcgb3IgZGlzcGxheVxuICpcbiAqIEBpbnRlcm5hbFxuICovXG5mdW5jdGlvbiBnZXRFcnJvck1lc3NhZ2UoZXJyb3I6IHVua25vd24pOiBzdHJpbmcge1xuICByZXR1cm4gZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiBTdHJpbmcoZXJyb3IpO1xufVxuXG4vKipcbiAqIENsZWFucyB1cCBsb2dnZXIgc3RhdGUgYW5kIHRlcm1pbmF0ZXMgdGhlIHByb2Nlc3MuXG4gKlxuICogVGhpcyBmdW5jdGlvbiBuZXZlciByZXR1cm5zLiBJdCBjbGVhcnMgdGhlIGxvZ2dlcidzIGNvbnRleHQsIGNsb3Nlc1xuICogb3BlbiBmaWxlIGhhbmRsZXMgdG8gZmx1c2ggcGVuZGluZyB3cml0ZXMsIGFuZCBleGl0cyB3aXRoIHRoZSBzcGVjaWZpZWRcbiAqIGNvZGUuXG4gKlxuICogQHBhcmFtIGV4aXRDb2RlIC0gVGhlIGV4aXQgY29kZSB0byBwYXNzIHRvIGBwcm9jZXNzLmV4aXQoKWBcbiAqIEByZXR1cm5zIE5ldmVyIHJldHVybnM7IHByb2Nlc3MgdGVybWluYXRlc1xuICpcbiAqIEBpbnRlcm5hbFxuICovXG5mdW5jdGlvbiBjbGVhbnVwQW5kRXhpdChleGl0Q29kZTogbnVtYmVyKTogbmV2ZXIge1xuICBsb2dnZXIuY2xlYXJDb250ZXh0KCk7XG4gIGxvZ2dlci5jbG9zZSgpO1xuICBwcm9jZXNzLmV4aXQoZXhpdENvZGUpO1xufVxuXG4vKipcbiAqIEhhbmRsZXMgZXJyb3JzIGR1cmluZyBlbnZpcm9ubWVudCB2YXJpYWJsZSBleHRyYWN0aW9uLlxuICpcbiAqIEVudmlyb25tZW50IGV4dHJhY3Rpb24gY2FuIGZhaWwgaWYgcmVxdWlyZWQgdmFyaWFibGVzIGFyZSBtaXNzaW5nIG9yXG4gKiBtYWxmb3JtZWQuIFRoaXMgcHJvdmlkZXMgdXNlci1mcmllbmRseSBlcnJvciBvdXRwdXQgYW5kIGVuc3VyZXMgcHJvcGVyXG4gKiBjbGVhbnVwIGJlZm9yZSBleGl0LlxuICpcbiAqIEBwYXJhbSBlcnJvciAtIFRoZSBlcnJvciB0aHJvd24gZHVyaW5nIGV4dHJhY3Rpb25cbiAqIEByZXR1cm5zIE5ldmVyIHJldHVybnM7IHByb2Nlc3MgdGVybWluYXRlcyB3aXRoIGVycm9yIGNvZGVcbiAqXG4gKiBAaW50ZXJuYWxcbiAqL1xuZnVuY3Rpb24gaGFuZGxlRW52RXh0cmFjdGlvbkVycm9yKGVycm9yOiB1bmtub3duKTogbmV2ZXIge1xuICBjb25zdCBtZXNzYWdlID0gZ2V0RXJyb3JNZXNzYWdlKGVycm9yKTtcbiAgbG9nZ2VyLmVycm9yKGBGYWlsZWQgdG8gZXh0cmFjdCBpbnB1dCBmcm9tIGVudmlyb25tZW50OiAke21lc3NhZ2V9YCk7XG4gIHdyaXRlRXJyb3IoYEhhbmRsZXIgZmFpbGVkOiAke21lc3NhZ2V9YCk7XG4gIGNsZWFudXBBbmRFeGl0KEVYSVRfQ09ERVMuRVJST1IpO1xufVxuXG4vKipcbiAqIEhhbmRsZXMgZXJyb3JzIHRocm93biBieSB0aGUgdXNlcidzIGNvbW1hbmQgaGFuZGxlci5cbiAqXG4gKiBXaGVuIGEgaGFuZGxlciB0aHJvd3Mgb3IgcmVqZWN0cywgd2Ugd2FudCB0byBwcm92aWRlIHVzZWZ1bCBkZWJ1Z2dpbmdcbiAqIGluZm9ybWF0aW9uLiBUaGlzIHdyaXRlcyB0aGUgZnVsbCBzdGFjayB0cmFjZSB0byBzdGRlcnIgKHdoaWNoIHRoZVxuICogZXhlY3V0aW9uIHdyYXBwZXIgY2FwdHVyZXMpIGFuZCBsb2dzIGEgc3RydWN0dXJlZCBlcnJvciBldmVudC5cbiAqXG4gKiBAcGFyYW0gZXJyb3IgLSBUaGUgZXJyb3IgdGhyb3duIG9yIHJlamVjdGlvbiByZWFzb24gZnJvbSB0aGUgaGFuZGxlclxuICogQHJldHVybnMgTmV2ZXIgcmV0dXJuczsgcHJvY2VzcyB0ZXJtaW5hdGVzIHdpdGggZXJyb3IgY29kZVxuICpcbiAqIEBpbnRlcm5hbFxuICovXG5mdW5jdGlvbiBoYW5kbGVIYW5kbGVyRXJyb3IoZXJyb3I6IHVua25vd24pOiBuZXZlciB7XG4gIGNvbnN0IGVycm9yT3V0cHV0ID0gZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IChlcnJvci5zdGFjayA/PyBlcnJvci5tZXNzYWdlKSA6IFN0cmluZyhlcnJvcik7XG4gIHByb2Nlc3Muc3RkZXJyLndyaXRlKGAke2Vycm9yT3V0cHV0fVxcbmApO1xuICBsb2dnZXIuZXJyb3IoYEhhbmRsZXIgZXJyb3I6ICR7Z2V0RXJyb3JNZXNzYWdlKGVycm9yKX1gKTtcbiAgY2xlYW51cEFuZEV4aXQoRVhJVF9DT0RFUy5FUlJPUik7XG59XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIEV4ZWN1dGUgRnVuY3Rpb25cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuLyoqXG4gKiBFeGVjdXRlcyBhIGNvbW1hbmQgaGFuZGxlciB3aXRoIGZ1bGwgcnVudGltZSBvcmNoZXN0cmF0aW9uLlxuICpcbiAqIFRoaXMgaXMgdGhlIG1haW4gZW50cnkgcG9pbnQgdGhhdCBjb21waWxlZCBoYW5kbGVycyB1c2UuIFRoZSBDTEkgZ2VuZXJhdGVzXG4gKiB3cmFwcGVyIGNvZGUgdGhhdCBpbXBvcnRzIHRoZSB1c2VyJ3MgY29tbWFuZCBhbmQgcGFzc2VzIGl0IHRvIHRoaXMgZnVuY3Rpb24uXG4gKiBGcm9tIHRoZXJlLCBleGVjdXRlQ29tbWFuZCBoYW5kbGVzIGFsbCB0aGUgY2VyZW1vbnk6IGVudmlyb25tZW50IHBhcnNpbmcsIGxvZ2dpbmdcbiAqIHNldHVwLCBoYW5kbGVyIGludm9jYXRpb24sIGVycm9yIGhhbmRsaW5nLCBhbmQgcHJvY2VzcyB0ZXJtaW5hdGlvbi5cbiAqXG4gKiBUaGUgZnVuY3Rpb24gZXhpdHMgdGhlIHByb2Nlc3MgaW4gYWxsIG5vcm1hbCBjb2RlIHBhdGhzLiBUaGUgcmV0dXJuZWRcbiAqIHByb21pc2Ugb25seSByZXNvbHZlcyBpZiBgcHJvY2Vzcy5leGl0YCBpcyBtb2NrZWQsIHdoaWNoIGhhcHBlbnMgaW4gdGVzdFxuICogc2NlbmFyaW9zLiBQcm9kdWN0aW9uIGNvZGUgc2hvdWxkIG5vdCBhd2FpdCB0aGlzIGZ1bmN0aW9uIG9yIGV4cGVjdCBpdFxuICogdG8gcmV0dXJuLlxuICpcbiAqICMjIFN1cHBvcnRlZCBDb21tYW5kIFR5cGVzXG4gKlxuICogLSAqKkFjdGlvbioqIChgYWN0aW9uYCk6IEludm9rZWQgd2hlbiBhbiBhY3Rpb24gaXMgdHJpZ2dlcmVkXG4gKiAtICoqVHlwZSBDcmVhdGUqKiAoYHR5cGVDcmVhdGVgKTogUnVucyBhZnRlciBuZXcgdHlwZWQgZmlsZSBjcmVhdGlvblxuICogLSAqKlR5cGUgVXBkYXRlKiogKGB0eXBlVXBkYXRlYCk6IFJ1bnMgYWZ0ZXIgdHlwZWQgZmlsZSBtb2RpZmljYXRpb25cbiAqIC0gKipUeXBlIERlbGV0ZSoqIChgdHlwZURlbGV0ZWApOiBSdW5zIHdoZW4gdHlwZWQgZmlsZSBpcyBkZWxldGVkXG4gKlxuICogTm90ZTogVHlwZSB2YWxpZGF0b3JzIHVzZSBhIGRpZmZlcmVudCBleGVjdXRpb24gbW9kZWwgKGZpbGUtcGF0aCBwcm90b2NvbClcbiAqIGFuZCBzaG91bGQgYmUgZXhlY3V0ZWQgdmlhIHtAbGluayBleGVjdXRlVmFsaWRhdGlvbn0gaW5zdGVhZC5cbiAqXG4gKiAjIyBFcnJvciBIYW5kbGluZ1xuICpcbiAqIEVycm9ycyBhcmUgaGFuZGxlZCBhdCB0aHJlZSBsZXZlbHM6XG4gKlxuICogMS4gKipFbnZpcm9ubWVudCBleHRyYWN0aW9uIGVycm9ycyoqIChtaXNzaW5nL2ludmFsaWQgdmFyaWFibGVzKTogTG9nIHRoZVxuICogICAgZXJyb3IgYW5kIGV4aXQuIFRoZXNlIGluZGljYXRlIGEgcHJvYmxlbSB3aXRoIGhvdyB0aGUgaGFuZGxlciB3YXMgaW52b2tlZC5cbiAqXG4gKiAyLiAqKkhhbmRsZXIgZXJyb3JzKiogKHVzZXIgY29kZSB0aHJvd3MpOiBXcml0ZSB0aGUgc3RhY2sgdHJhY2UgdG8gc3RkZXJyLFxuICogICAgbG9nIGEgc3RydWN0dXJlZCBlcnJvciwgYW5kIGV4aXQuIFRoZSBleGVjdXRpb24gd3JhcHBlciBjYXB0dXJlcyBzdGRlcnJcbiAqICAgIGZvciBkZWJ1Z2dpbmcuXG4gKlxuICogMy4gKipVbmV4cGVjdGVkIGVycm9ycyoqOiBDYXRjaC1hbGwgZm9yIGFueSBvdGhlciBmYWlsdXJlcyBkdXJpbmcgcnVudGltZVxuICogICAgb3JjaGVzdHJhdGlvbi5cbiAqXG4gKiBAcGFyYW0gY29tbWFuZCAtIFRoZSBjb21tYW5kIHRvIGV4ZWN1dGUsIHJldHVybmVkIGZyb20gYSBmYWN0b3J5IGZ1bmN0aW9uXG4gKiBAcmV0dXJucyBBIHByb21pc2UgdGhhdCByZXNvbHZlcyBvbmx5IHdoZW4gYHByb2Nlc3MuZXhpdGAgaXMgbW9ja2VkICh0ZXN0cylcbiAqXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogLy8gR2VuZXJhdGVkIHdyYXBwZXIgY29kZSAocHJvZHVjZWQgYnkgQ0xJKVxuICogaW1wb3J0IHsgZXhlY3V0ZUNvbW1hbmQgfSBmcm9tICdAY2FyZHMvc2RrL2NvbmZpZy9ydW50aW1lJztcbiAqIGltcG9ydCBjb21tYW5kIGZyb20gJy4vdXNlci1jb21tYW5kLmpzJztcbiAqXG4gKiAvLyBUaGlzIGNhbGwgbmV2ZXIgcmV0dXJucyBpbiBwcm9kdWN0aW9uXG4gKiBleGVjdXRlQ29tbWFuZChjb21tYW5kKTtcbiAqIGBgYFxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZXhlY3V0ZUNvbW1hbmQoY29tbWFuZDogQW55Q29tbWFuZCk6IFByb21pc2U8dm9pZD4ge1xuICB0cnkge1xuICAgIGxldCBpbnB1dDogQWN0aW9uSW5wdXQgfCBUeXBlSG9va0lucHV0O1xuXG4gICAgdHJ5IHtcbiAgICAgIGlmIChjb21tYW5kLmZhY3RvcnlUeXBlID09PSAnYWN0aW9uJykge1xuICAgICAgICBpbnB1dCA9IGV4dHJhY3RBY3Rpb25JbnB1dCgpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaW5wdXQgPSBleHRyYWN0VHlwZUlucHV0KCk7XG4gICAgICB9XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIHJldHVybiBoYW5kbGVFbnZFeHRyYWN0aW9uRXJyb3IoZXJyb3IpO1xuICAgIH1cblxuICAgIC8vIFNldCBsb2dnZXIgY29udGV4dCB3aXRoIGNvbW1hbmQgdHlwZVxuICAgIGxvZ2dlci5zZXRDb250ZXh0KGNvbW1hbmQuZmFjdG9yeVR5cGUsIHsgLi4uaW5wdXQgfSk7XG5cbiAgICBpZiAoY29tbWFuZC5mYWN0b3J5VHlwZSA9PT0gJ2FjdGlvbicpIHtcbiAgICAgIC8vIFNvY2tldCBjb25uZWN0aW9uIGFuZCBBY3Rpb25Db250ZXh0IGZvciBhY3Rpb24gY29tbWFuZHNcbiAgICAgIGxldCBzb2NrZXRDbGllbnQ6IFNvY2tldENsaWVudCB8IHVuZGVmaW5lZDtcbiAgICAgIGNvbnN0IHNvY2tldFBhdGggPSBwcm9jZXNzLmVudltDQVJEU19FTlZfVkFSUy5TT0NLRVRfUEFUSF07XG4gICAgICBpZiAoc29ja2V0UGF0aCkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgIHNvY2tldENsaWVudCA9IGF3YWl0IFNvY2tldENsaWVudC5jb25uZWN0KHNvY2tldFBhdGgpO1xuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgIGxvZ2dlci53YXJuKGBGYWlsZWQgdG8gY29ubmVjdCB0byBzb2NrZXQgYXQgJHtzb2NrZXRQYXRofTogJHtnZXRFcnJvck1lc3NhZ2UoZXJyb3IpfWApO1xuICAgICAgICAgIC8vIEZhaWwtb3BlbjogY29udGludWUgd2l0aG91dCBzb2NrZXRcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICAvLyBDYWxsYmFjayByZWdpc3RyYXRpb24gc3RhdGVcbiAgICAgIGxldCBjYW5jZWxDYWxsYmFjazogKCgpID0+IHZvaWQgfCBQcm9taXNlPHZvaWQ+KSB8IHVuZGVmaW5lZDtcbiAgICAgIGxldCBzd2l0Y2hUb0ludGVyYWN0aXZlQ2FsbGJhY2s6ICgoKSA9PiB1bmtub3duIHwgUHJvbWlzZTx1bmtub3duPikgfCB1bmRlZmluZWQ7XG4gICAgICBsZXQgY29tbWFuZFByb2Nlc3NlZCA9IGZhbHNlO1xuXG4gICAgICAvLyBCdWlsZCBBY3Rpb25Db250ZXh0IHdpdGggbG9nZ2VyLCBjd2QsIGFuZCBzb2NrZXQtYmFja2VkIGNhbGxiYWNrc1xuICAgICAgY29uc3QgY29udGV4dDogQWN0aW9uQ29udGV4dCA9IHtcbiAgICAgICAgbG9nZ2VyLFxuICAgICAgICBjd2Q6IHByb2Nlc3MuY3dkKCksXG4gICAgICAgIG9uQ2FuY2VsOiAoY2FsbGJhY2spID0+IHtcbiAgICAgICAgICBjYW5jZWxDYWxsYmFjayA9IGNhbGxiYWNrO1xuICAgICAgICB9LFxuICAgICAgICBvblN3aXRjaFRvSW50ZXJhY3RpdmU6IChjYWxsYmFjaykgPT4ge1xuICAgICAgICAgIHN3aXRjaFRvSW50ZXJhY3RpdmVDYWxsYmFjayA9IGNhbGxiYWNrO1xuICAgICAgICB9XG4gICAgICB9O1xuXG4gICAgICAvLyBXaXJlIHNvY2tldCBjb21tYW5kIGRpc3BhdGNoXG4gICAgICBpZiAoc29ja2V0Q2xpZW50KSB7XG4gICAgICAgIHNvY2tldENsaWVudC5vbkNvbW1hbmQoKGNtZDogU29ja2V0Q29tbWFuZCkgPT4ge1xuICAgICAgICAgIC8vIEZpcnN0LXdpbnMgc2VtYW50aWNzOiBpZ25vcmUgc3Vic2VxdWVudCBjb21tYW5kc1xuICAgICAgICAgIGlmIChjb21tYW5kUHJvY2Vzc2VkKSByZXR1cm47XG4gICAgICAgICAgY29tbWFuZFByb2Nlc3NlZCA9IHRydWU7XG5cbiAgICAgICAgICBpZiAoY21kLnR5cGUgPT09ICdjYW5jZWwnKSB7XG4gICAgICAgICAgICBoYW5kbGVDYW5jZWxDb21tYW5kKGNhbmNlbENhbGxiYWNrLCBzb2NrZXRDbGllbnQpO1xuICAgICAgICAgIH0gZWxzZSBpZiAoY21kLnR5cGUgPT09ICdzd2l0Y2hUb0ludGVyYWN0aXZlJykge1xuICAgICAgICAgICAgaGFuZGxlU3dpdGNoVG9JbnRlcmFjdGl2ZUNvbW1hbmQoc3dpdGNoVG9JbnRlcmFjdGl2ZUNhbGxiYWNrLCBzb2NrZXRDbGllbnQhKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgICAvLyBFeGVjdXRlIHRoZSBhY3Rpb24gY29tbWFuZCBoYW5kbGVyXG4gICAgICB0cnkge1xuICAgICAgICBhd2FpdCBjb21tYW5kKGlucHV0IGFzIEFjdGlvbklucHV0LCBjb250ZXh0KTtcbiAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgIHNvY2tldENsaWVudD8uY2xvc2UoKTtcbiAgICAgICAgcmV0dXJuIGhhbmRsZUhhbmRsZXJFcnJvcihlcnJvcik7XG4gICAgICB9XG5cbiAgICAgIC8vIENsZWFuIHVwIHNvY2tldCBhbmQgZXhpdCBzdWNjZXNzZnVsbHlcbiAgICAgIHNvY2tldENsaWVudD8uY2xvc2UoKTtcbiAgICAgIGNsZWFudXBBbmRFeGl0KEVYSVRfQ09ERVMuU1VDQ0VTUyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIFR5cGVIb29rQ29udGV4dCBmb3IgdHlwZSBsaWZlY3ljbGUgaG9va3NcbiAgICAgIGNvbnN0IGNvbnRleHQ6IFR5cGVIb29rQ29udGV4dCA9IHtcbiAgICAgICAgbG9nZ2VyLFxuICAgICAgICBjd2Q6IHByb2Nlc3MuY3dkKClcbiAgICAgIH07XG5cbiAgICAgIC8vIEV4ZWN1dGUgdGhlIHR5cGUgaG9vayBjb21tYW5kIGhhbmRsZXJcbiAgICAgIHRyeSB7XG4gICAgICAgIGF3YWl0IGNvbW1hbmQoaW5wdXQgYXMgVHlwZUhvb2tJbnB1dCwgY29udGV4dCk7XG4gICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICByZXR1cm4gaGFuZGxlSGFuZGxlckVycm9yKGVycm9yKTtcbiAgICAgIH1cblxuICAgICAgY2xlYW51cEFuZEV4aXQoRVhJVF9DT0RFUy5TVUNDRVNTKTtcbiAgICB9XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgLy8gVW5leHBlY3RlZCBlcnJvciAtIHRyeSB0byBjbGVhbiB1cCBhbmQgZXhpdFxuICAgIGxvZ2dlci5lcnJvcihgVW5leHBlY3RlZCBydW50aW1lIGVycm9yOiAke2dldEVycm9yTWVzc2FnZShlcnJvcil9YCk7XG4gICAgY2xlYW51cEFuZEV4aXQoRVhJVF9DT0RFUy5FUlJPUik7XG4gIH1cbn1cblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gU29ja2V0IENvbW1hbmQgSGFuZGxlcnNcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuLyoqXG4gKiBSZXNvbHZlcyBhIGNhbGxiYWNrIHJlc3VsdCB0aGF0IG1heSBiZSBzeW5jIG9yIGFzeW5jIGludG8gYSBQcm9taXNlLlxuICpcbiAqIFVzZXItcmVnaXN0ZXJlZCBjYWxsYmFja3MgbWF5IHJldHVybiB2b2lkLCBhIHZhbHVlLCBvciBhIFByb21pc2UuXG4gKiBUaGlzIG5vcm1hbGl6ZXMgYWxsIGNhc2VzIGludG8gYSBzaW5nbGUgUHJvbWlzZSBmb3IgY29uc2lzdGVudCBoYW5kbGluZy5cbiAqXG4gKiBAcGFyYW0gcmVzdWx0IC0gQ2FsbGJhY2sgcmV0dXJuIHZhbHVlIHRoYXQgbWF5IGFscmVhZHkgYmUgYSBwcm9taXNlLlxuICogQHJldHVybnMgUHJvbWlzZSByZXNvbHZpbmcgdG8gdGhlIGNhbGxiYWNrIHJlc3VsdC5cbiAqIEBpbnRlcm5hbFxuICovXG5mdW5jdGlvbiB0b1Byb21pc2U8VD4ocmVzdWx0OiBUIHwgUHJvbWlzZTxUPik6IFByb21pc2U8VD4ge1xuICBpZiAocmVzdWx0ICYmIHR5cGVvZiAocmVzdWx0IGFzIFByb21pc2U8VD4pLnRoZW4gPT09ICdmdW5jdGlvbicpIHtcbiAgICByZXR1cm4gcmVzdWx0IGFzIFByb21pc2U8VD47XG4gIH1cbiAgcmV0dXJuIFByb21pc2UucmVzb2x2ZShyZXN1bHQpO1xufVxuXG4vKipcbiAqIEhhbmRsZXMgYSBgY2FuY2VsYCBjb21tYW5kIGZyb20gdGhlIHNvY2tldC5cbiAqXG4gKiBJZiBhIGNhbmNlbCBjYWxsYmFjayB3YXMgcmVnaXN0ZXJlZCwgaXQgaXMgaW52b2tlZC4gT3RoZXJ3aXNlLCBTSUdURVJNXG4gKiBpcyBzZW50IHRvIHRoZSBjdXJyZW50IHByb2Nlc3MgYXMgYSBmYWxsYmFjay4gQWZ0ZXIgdGhlIGNhbGxiYWNrIGNvbXBsZXRlc1xuICogKG9yIGltbWVkaWF0ZWx5IGlmIG5vIGNhbGxiYWNrKSwgdGhlIHByb2Nlc3MgZXhpdHMgd2l0aCBlcnJvciBjb2RlLlxuICpcbiAqIEBwYXJhbSBjYWxsYmFjayAtIFRoZSByZWdpc3RlcmVkIGNhbmNlbCBjYWxsYmFjaywgaWYgYW55XG4gKiBAcGFyYW0gc29ja2V0Q2xpZW50IC0gVGhlIHNvY2tldCBjbGllbnQgdG8gY2xvc2UgYmVmb3JlIGV4aXRpbmdcbiAqXG4gKiBAaW50ZXJuYWxcbiAqL1xuZnVuY3Rpb24gaGFuZGxlQ2FuY2VsQ29tbWFuZChcbiAgY2FsbGJhY2s6ICgoKSA9PiB2b2lkIHwgUHJvbWlzZTx2b2lkPikgfCB1bmRlZmluZWQsXG4gIHNvY2tldENsaWVudDogU29ja2V0Q2xpZW50IHwgdW5kZWZpbmVkXG4pOiB2b2lkIHtcbiAgaWYgKCFjYWxsYmFjaykge1xuICAgIHByb2Nlc3Mua2lsbChwcm9jZXNzLnBpZCwgJ1NJR1RFUk0nKTtcbiAgICByZXR1cm47XG4gIH1cblxuICB0b1Byb21pc2UoY2FsbGJhY2soKSkudGhlbihcbiAgICAoKSA9PiB7XG4gICAgICBzb2NrZXRDbGllbnQ/LmNsb3NlKCk7XG4gICAgICBjbGVhbnVwQW5kRXhpdChFWElUX0NPREVTLkVSUk9SKTtcbiAgICB9LFxuICAgICgpID0+IHtcbiAgICAgIHNvY2tldENsaWVudD8uY2xvc2UoKTtcbiAgICAgIGNsZWFudXBBbmRFeGl0KEVYSVRfQ09ERVMuRVJST1IpO1xuICAgIH1cbiAgKTtcbn1cblxuLyoqXG4gKiBIYW5kbGVzIGEgYHN3aXRjaFRvSW50ZXJhY3RpdmVgIGNvbW1hbmQgZnJvbSB0aGUgc29ja2V0LlxuICpcbiAqIElmIG5vIGNhbGxiYWNrIHdhcyByZWdpc3RlcmVkLCB0aGUgY29tbWFuZCBpcyBpZ25vcmVkIChuby1vcCkuIE90aGVyd2lzZSxcbiAqIHRoZSBjYWxsYmFjayBpcyBpbnZva2VkIGFuZCBpdHMgcmV0dXJuIHZhbHVlIGlzIHNlbnQgYXNcbiAqIGBzd2l0Y2hUb0ludGVyYWN0aXZlUmVzcG9uc2VgIG9uIHRoZSBzb2NrZXQuIGBwcm9jZXNzLmV4aXQoNDIpYCBpcyBjYWxsZWRcbiAqIGluc2lkZSB0aGUgYHdyaXRlKClgIGNhbGxiYWNrIHRvIGd1YXJhbnRlZSB0aGUgcmVzcG9uc2UgaXMgZmx1c2hlZCBiZWZvcmVcbiAqIHRoZSBldmVudCBsb29wIHRlYXJzIGRvd24uXG4gKlxuICogQHBhcmFtIGNhbGxiYWNrIC0gVGhlIHJlZ2lzdGVyZWQgc3dpdGNoVG9JbnRlcmFjdGl2ZSBjYWxsYmFjaywgaWYgYW55XG4gKiBAcGFyYW0gc29ja2V0Q2xpZW50IC0gVGhlIHNvY2tldCBjbGllbnQgdXNlZCB0byBzZW5kIHRoZSByZXNwb25zZVxuICpcbiAqIEBpbnRlcm5hbFxuICovXG5mdW5jdGlvbiBoYW5kbGVTd2l0Y2hUb0ludGVyYWN0aXZlQ29tbWFuZChcbiAgY2FsbGJhY2s6ICgoKSA9PiB1bmtub3duIHwgUHJvbWlzZTx1bmtub3duPikgfCB1bmRlZmluZWQsXG4gIHNvY2tldENsaWVudDogU29ja2V0Q2xpZW50XG4pOiB2b2lkIHtcbiAgaWYgKCFjYWxsYmFjaykge1xuICAgIHJldHVybjtcbiAgfVxuXG4gIHRvUHJvbWlzZShjYWxsYmFjaygpKS50aGVuKFxuICAgIChkYXRhKSA9PiB7XG4gICAgICBzb2NrZXRDbGllbnQuc2VuZFJlc3BvbnNlVGhlbih7IHR5cGU6ICdzd2l0Y2hUb0ludGVyYWN0aXZlUmVzcG9uc2UnLCBkYXRhIH0sICgpID0+IHtcbiAgICAgICAgY2xlYW51cEFuZEV4aXQoRVhJVF9DT0RFUy5TV0lUQ0hfVE9fSU5URVJBQ1RJVkUpO1xuICAgICAgfSk7XG4gICAgfSxcbiAgICAoZXJyb3IpID0+IHtcbiAgICAgIGxvZ2dlci5lcnJvcihgc3dpdGNoVG9JbnRlcmFjdGl2ZSBjYWxsYmFjayBlcnJvcjogJHtnZXRFcnJvck1lc3NhZ2UoZXJyb3IpfWApO1xuICAgICAgc29ja2V0Q2xpZW50LmNsb3NlKCk7XG4gICAgICBjbGVhbnVwQW5kRXhpdChFWElUX0NPREVTLkVSUk9SKTtcbiAgICB9XG4gICk7XG59XG4iLCAiLyoqXG4gKiBTaGFyZWQgc2Vzc2lvbiB1dGlsaXRpZXMgZm9yIENsYXVkZSBDb2RlIGFjdGlvbiB3b3JrZmxvd3MuXG4gKlxuICogUHJvdmlkZXMgcmV1c2FibGUgYnVpbGRpbmcgYmxvY2tzIGZvciBhY3Rpb25zIHRoYXQgc3Bhd24gdGhlIGBjbGF1ZGVgIENMSTpcbiAqIHBsdWdpbiBzZXR0aW5ncyBjb25zdHJ1Y3Rpb24sIENMSSBhcmcgYnVpbGRpbmcsIHdvcmt0cmVlIGxpZmVjeWNsZSBtYW5hZ2VtZW50LFxuICogYW5kIGJyYW5jaCBjbGVhbnVwLiBCb3RoIHRoZSBgbGF1bmNoYCBhbmQgYGludGVydmlld2AgYWN0aW9ucyBjb25zdW1lIHRoZXNlXG4gKiB1dGlsaXRpZXMuXG4gKlxuICogQHN1bW1hcnkgU2hhcmVkIHNlc3Npb24gdXRpbGl0aWVzIGZvciBDbGF1ZGUgQ29kZSBhY3Rpb24gd29ya2Zsb3dzXG4gKiBAbW9kdWxlXG4gKi9cblxuaW1wb3J0IHsgdHlwZSBDaGlsZFByb2Nlc3MsIGV4ZWNGaWxlLCBzcGF3biB9IGZyb20gJ25vZGU6Y2hpbGRfcHJvY2Vzcyc7XG5pbXBvcnQgKiBhcyBmcyBmcm9tICdub2RlOmZzL3Byb21pc2VzJztcbmltcG9ydCAqIGFzIHBhdGggZnJvbSAnbm9kZTpwYXRoJztcbmltcG9ydCB7IHByb21pc2lmeSB9IGZyb20gJ25vZGU6dXRpbCc7XG5pbXBvcnQgeyBDYXJkc0NsaWVudCB9IGZyb20gJ0BjYXJkcy9zZGsvY2xpZW50JztcbmltcG9ydCB7IHR5cGUgQWN0aW9uQ29udGV4dCwgdHlwZSBBY3Rpb25JbnB1dCwgQ0FSRFNfRU5WX1ZBUlMgfSBmcm9tICdAY2FyZHMvc2RrL2NvbmZpZyc7XG5pbXBvcnQgeyByZXNvbHZlQ2xhdWRlQ29uZmlnRGlyLCB1cGRhdGVNYXJrZXRwbGFjZVJlZ2lzdHJhdGlvbiB9IGZyb20gJ0BjYXJkcy9zZGsvbWFya2V0cGxhY2UnO1xuZXhwb3J0IHsgcmVzb2x2ZUNsYXVkZUNvbmZpZ0RpciwgdXBkYXRlTWFya2V0cGxhY2VSZWdpc3RyYXRpb24gfTtcblxuaW1wb3J0IHsgY2hlY2tXb3JrdHJlZUV4aXN0cywgY3JlYXRlV29ya3RyZWUsIGZpbmRHaXRSb290cyB9IGZyb20gJ0BjYXJkcy9zZGsvd29ya3RyZWUnO1xuaW1wb3J0IHsgc3Bhd25CcmFuY2hDbGVhbnVwV2F0Y2hlciB9IGZyb20gJy4vYnJhbmNoLWNsZWFudXAtd2F0Y2hlci5qcyc7XG5cbmNvbnN0IGV4ZWNGaWxlQXN5bmMgPSBwcm9taXNpZnkoZXhlY0ZpbGUpO1xuXG4vKipcbiAqIEV4dHJhY3RzIGEgaHVtYW4tcmVhZGFibGUgbWVzc2FnZSBmcm9tIGFuIHVua25vd24gY2F0Y2ggdmFsdWUuXG4gKiBAcGFyYW0gZXJyb3IgLSBUaGUgY2F1Z2h0IHZhbHVlIHRvIGV4dHJhY3QgYSBtZXNzYWdlIGZyb20uXG4gKiBAcmV0dXJucyBUaGUgZXJyb3IgbWVzc2FnZSBzdHJpbmcuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBlcnJvck1lc3NhZ2UoZXJyb3I6IHVua25vd24pOiBzdHJpbmcge1xuICByZXR1cm4gZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiBTdHJpbmcoZXJyb3IpO1xufVxuXG4vKipcbiAqIFJlc29sdmVzIHRoZSBtYXJrZXRwbGFjZSBkaXJlY3RvcnkgYnVuZGxlZCB3aXRoIHRoZSBpbnN0YWxsZWQgZXh0ZW5zaW9uLlxuICogVXNlcyB0aGUgRVhURU5TSU9OX1BBVEggZW52aXJvbm1lbnQgdmFyaWFibGUgaW5qZWN0ZWQgYnkgQWN0aW9uRGlzcGF0Y2hlci5cbiAqXG4gKiBAcmV0dXJucyBBYnNvbHV0ZSBwYXRoIHRvIHRoZSBidW5kbGVkIG1hcmtldHBsYWNlIGRpcmVjdG9yeS5cbiAqIEB0aHJvd3MgRXJyb3IgaWYgRVhURU5TSU9OX1BBVEggaXMgbm90IHNldC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJlc29sdmVNYXJrZXRwbGFjZVBhdGgoKTogc3RyaW5nIHtcbiAgY29uc3QgZXh0ZW5zaW9uUGF0aCA9IHByb2Nlc3MuZW52W0NBUkRTX0VOVl9WQVJTLkVYVEVOU0lPTl9QQVRIXTtcbiAgaWYgKCFleHRlbnNpb25QYXRoKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIHJlcXVpcmVkIGVudmlyb25tZW50IHZhcmlhYmxlOiAke0NBUkRTX0VOVl9WQVJTLkVYVEVOU0lPTl9QQVRIfWApO1xuICB9XG4gIHJldHVybiBwYXRoLmpvaW4oZXh0ZW5zaW9uUGF0aCwgJ2Rpc3QnLCAnbWFya2V0cGxhY2UnKTtcbn1cblxuLyoqXG4gKiBCdWlsZHMgdGhlIGAtLXNldHRpbmdzYCBKU09OIHRoYXQgZW5hYmxlcyB0aGUgYHJ1bnRpbWVgIHBsdWdpbiBhbmQgcmVnaXN0ZXJzXG4gKiB0aGUgYGNhcmRzLm1hbmFnZW1lbnRgIG1hcmtldHBsYWNlIHNvdXJjZSBzbyB0aGUgc3Bhd25lZCBgY2xhdWRlYCBwcm9jZXNzXG4gKiBjYW4gcmVzb2x2ZSB0aGUgcGx1Z2luIGZyb20gdGhlIGV4dGVuc2lvbidzIGJ1bmRsZWQgbWFya2V0cGxhY2UuXG4gKlxuICogVXNlcyB0aGUgbWFya2V0cGxhY2UgYnVuZGxlZCBpbnNpZGUgdGhlIGV4dGVuc2lvbiBpbnN0YWxsIGRpcmVjdG9yeVxuICogKGA8RVhURU5TSU9OX1BBVEg+L2Rpc3QvbWFya2V0cGxhY2VgKSBzbyB0aGUgc3Bhd25lZCBzZXNzaW9uIGFsd2F5cyBsb2FkcyB0aGVcbiAqIHBsdWdpbiB2ZXJzaW9uIHRoYXQgc2hpcHBlZCB3aXRoIHRoZSBleHRlbnNpb24sIHJlZ2FyZGxlc3Mgb2Ygd29ya3RyZWUgc3RhdGUuXG4gKlxuICogQHBhcmFtIG1hcmtldHBsYWNlUGF0aCAtIEFic29sdXRlIHBhdGggdG8gdGhlIGJ1bmRsZWQgbWFya2V0cGxhY2UgZGlyZWN0b3J5LlxuICogQHJldHVybnMgU2VyaWFsaXNlZCBzZXR0aW5ncyBKU09OIHN0cmluZy5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGJ1aWxkUGx1Z2luU2V0dGluZ3MobWFya2V0cGxhY2VQYXRoOiBzdHJpbmcpOiBzdHJpbmcge1xuICByZXR1cm4gSlNPTi5zdHJpbmdpZnkoe1xuICAgIGVuYWJsZWRQbHVnaW5zOiB7ICdydW50aW1lQGNhcmRzLm1hbmFnZW1lbnQnOiB0cnVlIH0sXG4gICAgZXh0cmFLbm93bk1hcmtldHBsYWNlczoge1xuICAgICAgJ2NhcmRzLm1hbmFnZW1lbnQnOiB7XG4gICAgICAgIHNvdXJjZTogeyBzb3VyY2U6ICdkaXJlY3RvcnknLCBwYXRoOiBtYXJrZXRwbGFjZVBhdGggfVxuICAgICAgfVxuICAgIH1cbiAgfSk7XG59XG5cbi8qKlxuICogQnVpbGRzIHRoZSBDTEkgYXJndW1lbnQgbGlzdCBmb3IgdGhlIGBjbGF1ZGVgIHByb2Nlc3MuXG4gKlxuICogQHBhcmFtIHByb21wdCAtIFRoZSBwcm9tcHQgc3RyaW5nIGZvciBuZXcgc2Vzc2lvbnMuXG4gKiBAcGFyYW0gc2Vzc2lvbklkIC0gU2Vzc2lvbiBpZGVudGlmaWVyICh1c2VkIGZvciBgLS1zZXNzaW9uLWlkYCBvciBgLS1yZXN1bWVgKS5cbiAqIEBwYXJhbSByZXN1bWUgLSBXaGVuIHRydWUsIHBhc3NlcyBgLS1yZXN1bWVgIGluc3RlYWQgb2Ygc3RhcnRpbmcgYSBuZXcgc2Vzc2lvbi5cbiAqIEBwYXJhbSBtb2RlIC0gRXhlY3V0aW9uIG1vZGU7IGAnYmFja2dyb3VuZCdgIGFwcGVuZHMgYC0tcHJpbnRgLlxuICogQHBhcmFtIGNhcmRSZXBvUGF0aCAtIEFic29sdXRlIHBhdGggcGFzc2VkIHZpYSBgLS1hZGQtZGlyYC5cbiAqIEBwYXJhbSBtYXJrZXRwbGFjZVBhdGggLSBBYnNvbHV0ZSBwYXRoIHRvIHRoZSBidW5kbGVkIG1hcmtldHBsYWNlIGRpcmVjdG9yeS5cbiAqIEByZXR1cm5zIEFycmF5IG9mIENMSSBhcmd1bWVudHMuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBidWlsZEFyZ3MoXG4gIHByb21wdDogc3RyaW5nLFxuICBzZXNzaW9uSWQ6IHN0cmluZyxcbiAgcmVzdW1lOiBib29sZWFuLFxuICBtb2RlOiBBY3Rpb25JbnB1dFsnZXhlY3V0aW9uTW9kZSddLFxuICBjYXJkUmVwb1BhdGg6IHN0cmluZyxcbiAgbWFya2V0cGxhY2VQYXRoOiBzdHJpbmdcbik6IHN0cmluZ1tdIHtcbiAgY29uc3QgYXJnczogc3RyaW5nW10gPSBbXTtcblxuICBpZiAocmVzdW1lKSB7XG4gICAgYXJncy5wdXNoKCctLXJlc3VtZScsIHNlc3Npb25JZCk7XG4gIH0gZWxzZSB7XG4gICAgYXJncy5wdXNoKHByb21wdCk7XG4gICAgYXJncy5wdXNoKCctLXNlc3Npb24taWQnLCBzZXNzaW9uSWQpO1xuICB9XG4gIGFyZ3MucHVzaCgnLS1zZXR0aW5ncycsIGJ1aWxkUGx1Z2luU2V0dGluZ3MobWFya2V0cGxhY2VQYXRoKSk7XG4gIGFyZ3MucHVzaCgnLS1hZGQtZGlyJywgY2FyZFJlcG9QYXRoKTtcbiAgaWYgKG1vZGUgPT09ICdiYWNrZ3JvdW5kJykge1xuICAgIGFyZ3MucHVzaCgnLS1wcmludCcpO1xuICB9XG5cbiAgcmV0dXJuIGFyZ3M7XG59XG5cbi8qKlxuICogRXh0cmFjdHMgdGhlIGNhcmQgSUQgZnJvbSBhIGBjYXJkcy88Y2FyZElkPi88bj5gIGJyYW5jaCBuYW1lLlxuICpcbiAqIEBwYXJhbSBicmFuY2hOYW1lIC0gQnJhbmNoIG5hbWUgdG8gcGFyc2UuXG4gKiBAcmV0dXJucyBUaGUgY2FyZCBJRCwgb3IgYG51bGxgIGlmIHRoZSBicmFuY2ggZG9lc24ndCBtYXRjaCB0aGUgcGF0dGVybi5cbiAqL1xuZnVuY3Rpb24gY2FyZElkRnJvbUJyYW5jaChicmFuY2hOYW1lOiBzdHJpbmcpOiBzdHJpbmcgfCBudWxsIHtcbiAgY29uc3QgbWF0Y2ggPSBicmFuY2hOYW1lLm1hdGNoKC9eY2FyZHNcXC8oLispXFwvXFxkKyQvKTtcbiAgcmV0dXJuIG1hdGNoPy5bMV0gPz8gbnVsbDtcbn1cblxuLyoqXG4gKiBSZXNvbHZlcyB0aGUgYmFzZSBicmFuY2ggZm9yIHRoZSB3b3Jrc3BhY2UsIGZvbGxvd2luZyB0aGUgYHBhcmVudEJyYW5jaGBcbiAqIGNoYWluIHdoZW4gSEVBRCBpcyBhIGBjYXJkcy8qYCB3b3JrdHJlZSBicmFuY2guXG4gKlxuICogQ2FyZCBicmFuY2hlcyBhcmUgZXBoZW1lcmFsIGFuZCBub3QgdmFsaWQgbWVyZ2UgdGFyZ2V0cy4gV2hlbiB0aGUgd29ya3NwYWNlXG4gKiBIRUFEIGhhcHBlbnMgdG8gYmUgb24gb25lIChlLmcuLCB0aGUgbWFpbiBjaGVja291dCB3YXMgbGVmdCBvbiBhIGNhcmRcbiAqIGJyYW5jaCksIHRoaXMgZnVuY3Rpb24gcXVlcmllcyB0aGUgQVBJIGZvciB0aGF0IGJyYW5jaCdzIGBwYXJlbnRCcmFuY2hgXG4gKiBhbmQgcmVjdXJzZXMgdW50aWwgaXQgZmluZHMgYSBub24tYGNhcmRzLypgIGJyYW5jaC5cbiAqXG4gKiBAcGFyYW0gd29ya3NwYWNlUGF0aCAtIERpcmVjdG9yeSB3aGVyZSBgZ2l0IHJldi1wYXJzZWAgcnVucy5cbiAqIEBwYXJhbSBjbGllbnQgLSBDYXJkcyBBUEkgY2xpZW50IGZvciByZXNvbHZpbmcgcGFyZW50QnJhbmNoIG9mIGNhcmQgYnJhbmNoZXMuXG4gKiBAcmV0dXJucyBUaGUgZmlyc3Qgbm9uLWBjYXJkcy8qYCBicmFuY2ggaW4gdGhlIHBhcmVudCBjaGFpbi5cbiAqIEB0aHJvd3MgRXJyb3IgaWYgdGhlIHBhcmVudCBjaGFpbiBjYW5ub3QgYmUgcmVzb2x2ZWQgKG1pc3NpbmcgQVBJIHJlY29yZHMsIGN5Y2xlcykuXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiByZXNvbHZlQmFzZUJyYW5jaCh3b3Jrc3BhY2VQYXRoOiBzdHJpbmcsIGNsaWVudD86IENhcmRzQ2xpZW50KTogUHJvbWlzZTxzdHJpbmc+IHtcbiAgY29uc3QgeyBzdGRvdXQgfSA9IGF3YWl0IGV4ZWNGaWxlQXN5bmMoJ2dpdCcsIFsncmV2LXBhcnNlJywgJy0tYWJicmV2LXJlZicsICdIRUFEJ10sIHtcbiAgICBjd2Q6IHdvcmtzcGFjZVBhdGhcbiAgfSk7XG4gIGxldCBicmFuY2ggPSBzdGRvdXQudHJpbSgpO1xuXG4gIGNvbnN0IHZpc2l0ZWQgPSBuZXcgU2V0PHN0cmluZz4oKTtcbiAgd2hpbGUgKGJyYW5jaC5zdGFydHNXaXRoKCdjYXJkcy8nKSkge1xuICAgIGlmICh2aXNpdGVkLmhhcyhicmFuY2gpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYENpcmN1bGFyIHBhcmVudEJyYW5jaCBjaGFpbiBkZXRlY3RlZDogJHtbLi4udmlzaXRlZCwgYnJhbmNoXS5qb2luKCcgXHUyMTkyICcpfWApO1xuICAgIH1cbiAgICB2aXNpdGVkLmFkZChicmFuY2gpO1xuXG4gICAgY29uc3QgY2FyZElkID0gY2FyZElkRnJvbUJyYW5jaChicmFuY2gpO1xuICAgIGlmICghY2FyZElkIHx8ICFjbGllbnQpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgYFdvcmtzcGFjZSBIRUFEIGlzIG9uIGNhcmQgYnJhbmNoIFwiJHticmFuY2h9XCIgYnV0IGNhbm5vdCByZXNvbHZlIGl0cyBwYXJlbnQuIGAgK1xuICAgICAgICAgICdTd2l0Y2ggdGhlIG1haW4gY2hlY2tvdXQgdG8gYSBub24tY2FyZCBicmFuY2ggKGUuZy4sIG1haW4pLidcbiAgICAgICk7XG4gICAgfVxuXG4gICAgY29uc3QgeyBicmFuY2hlcyB9ID0gYXdhaXQgY2xpZW50LmdldEJyYW5jaGVzKGNhcmRJZCwgeyB3b3Jrc3BhY2VQYXRoIH0pO1xuICAgIGNvbnN0IHJlY29yZCA9IGJyYW5jaGVzLmZpbmQoKGIpID0+IGIubmFtZSA9PT0gYnJhbmNoKTtcbiAgICBpZiAoIXJlY29yZD8ucGFyZW50QnJhbmNoKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgIGBDYXJkIGJyYW5jaCBcIiR7YnJhbmNofVwiIGhhcyBubyBwYXJlbnRCcmFuY2ggcmVjb3JkLiBgICtcbiAgICAgICAgICAnU3dpdGNoIHRoZSBtYWluIGNoZWNrb3V0IHRvIGEgbm9uLWNhcmQgYnJhbmNoIChlLmcuLCBtYWluKS4nXG4gICAgICApO1xuICAgIH1cblxuICAgIGJyYW5jaCA9IHJlY29yZC5wYXJlbnRCcmFuY2g7XG4gIH1cblxuICByZXR1cm4gYnJhbmNoO1xufVxuXG4vKipcbiAqIENoZWNrcyB3aGV0aGVyIGEgd29ya3RyZWUgcGF0aCBleGlzdHMgb24gZGlzay5cbiAqXG4gKiBAcGFyYW0gd29ya3RyZWVQYXRoIC0gQWJzb2x1dGUgcGF0aCB0byB0ZXN0LlxuICogQHJldHVybnMgVHJ1ZSB3aGVuIHRoZSBwYXRoIGlzIGFjY2Vzc2libGUuXG4gKi9cbmFzeW5jIGZ1bmN0aW9uIHdvcmt0cmVlRXhpc3RzT25EaXNrKHdvcmt0cmVlUGF0aDogc3RyaW5nKTogUHJvbWlzZTxib29sZWFuPiB7XG4gIHRyeSB7XG4gICAgYXdhaXQgZnMuYWNjZXNzKHdvcmt0cmVlUGF0aCk7XG4gICAgcmV0dXJuIHRydWU7XG4gIH0gY2F0Y2gge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxufVxuXG4vKipcbiAqIEZpbmRzIG9yIGNyZWF0ZXMgYSB3b3JrdHJlZSBmb3IgdGhlIGNhcmQuXG4gKlxuICogVHJpZXMgdG8gcmV1c2UgYW4gZXhpc3RpbmcgYnJhbmNoIHdob3NlIHdvcmt0cmVlIGlzIHN0aWxsIG9uIGRpc2suIFdoZW4gbm9cbiAqIHZhbGlkIGJyYW5jaCBleGlzdHMsIGNyZWF0ZXMgYSBuZXcgb25lIGFuZCByZWdpc3RlcnMgaXQgd2l0aCB0aGUgQVBJLlxuICpcbiAqIEBwYXJhbSBpbnB1dCAtIEFjdGlvbiBpbnB1dCBjb250YWluaW5nIGNhcmRJZCBhbmQgd29ya3NwYWNlIHBhdGhzLlxuICogQHBhcmFtIGNsaWVudCAtIENhcmRzIEFQSSBjbGllbnQgZm9yIGJyYW5jaCBDUlVELlxuICogQHBhcmFtIGJhc2VCcmFuY2ggLSBDdXJyZW50IGJyYW5jaCBpbiB0aGUgd29ya3NwYWNlICh1c2VkIGFzIHBhcmVudCkuXG4gKiBAcGFyYW0gbG9nZ2VyIC0gTG9nZ2VyIGZvciBkaWFnbm9zdGljIG91dHB1dC5cbiAqIEBwYXJhbSBzZXNzaW9uSWQgLSBDbGF1ZGUgQ29kZSBzZXNzaW9uIElEIGZvcndhcmRlZCB0byB0aGUgQVBJIHNvIHRoZSBjYXJkIHJlcG8gcG9zdC1jb21taXQgaG9vayBjYW4gYXR0cmlidXRlIHRoZSBjb21taXQuXG4gKiBAcmV0dXJucyBXb3JrdHJlZSBwYXRoLCBicmFuY2ggbmFtZSwgYW5kIHBhcmVudCBicmFuY2ggbmFtZS5cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHJlc29sdmVPckNyZWF0ZVdvcmt0cmVlKFxuICBpbnB1dDogQWN0aW9uSW5wdXQsXG4gIGNsaWVudDogQ2FyZHNDbGllbnQsXG4gIGJhc2VCcmFuY2g6IHN0cmluZyxcbiAgbG9nZ2VyOiBBY3Rpb25Db250ZXh0Wydsb2dnZXInXSxcbiAgc2Vzc2lvbklkPzogc3RyaW5nXG4pOiBQcm9taXNlPHsgd29ya3RyZWVQYXRoOiBzdHJpbmc7IGJyYW5jaE5hbWU6IHN0cmluZzsgcGFyZW50QnJhbmNoOiBzdHJpbmcgfT4ge1xuICBjb25zdCB7IGJyYW5jaGVzIH0gPSBhd2FpdCBjbGllbnQuZ2V0QnJhbmNoZXMoaW5wdXQuY2FyZElkLCB7IHdvcmtzcGFjZVBhdGg6IGlucHV0LnJlcG9Sb290IH0pO1xuXG4gIC8vIFN0ZXAgMTogVHJ5IHRvIHJldXNlIGFuIGV4aXN0aW5nIGJyYW5jaCB3aXRoIGEgdmFsaWQgd29ya3RyZWUgb24gZGlza1xuICBmb3IgKGNvbnN0IGJyYW5jaCBvZiBicmFuY2hlcykge1xuICAgIGlmICghYnJhbmNoLmV4aXN0cyB8fCAhYnJhbmNoLndvcmt0cmVlKSBjb250aW51ZTtcbiAgICBpZiAoIShhd2FpdCB3b3JrdHJlZUV4aXN0c09uRGlzayhicmFuY2gud29ya3RyZWUpKSkgY29udGludWU7XG5cbiAgICBsb2dnZXIuaW5mbygnUmV1c2luZyBleGlzdGluZyB3b3JrdHJlZScsIHsgYnJhbmNoOiBicmFuY2gubmFtZSwgd29ya3RyZWU6IGJyYW5jaC53b3JrdHJlZSB9KTtcbiAgICByZXR1cm4geyB3b3JrdHJlZVBhdGg6IGJyYW5jaC53b3JrdHJlZSwgYnJhbmNoTmFtZTogYnJhbmNoLm5hbWUsIHBhcmVudEJyYW5jaDogYnJhbmNoLnBhcmVudEJyYW5jaCB9O1xuICB9XG5cbiAgLy8gU3RlcCAyOiBUcnkgdG8gY3JlYXRlIGEgd29ya3RyZWUgZm9yIGFuIGV4aXN0aW5nIGJyYW5jaCB3aG9zZSB3b3JrdHJlZVxuICAvLyBpcyBtaXNzaW5nIGZyb20gZGlzayAoZS5nLiBjbGVhbmVkIHVwIGJ5IGEgcHJldmlvdXMgc2Vzc2lvbiBjcmFzaCkuXG4gIGZvciAoY29uc3QgYnJhbmNoIG9mIGJyYW5jaGVzKSB7XG4gICAgaWYgKCFicmFuY2guZXhpc3RzKSBjb250aW51ZTtcbiAgICBpZiAoIWJyYW5jaC5uYW1lLnN0YXJ0c1dpdGgoYGNhcmRzLyR7aW5wdXQuY2FyZElkfS9gKSkgY29udGludWU7XG5cbiAgICBsb2dnZXIuaW5mbygnUmVhdHRhY2hpbmcgd29ya3RyZWUgZm9yIGV4aXN0aW5nIGJyYW5jaCcsIHsgYnJhbmNoOiBicmFuY2gubmFtZSB9KTtcbiAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBjcmVhdGVXb3JrdHJlZShicmFuY2gubmFtZSwgeyBjd2Q6IGlucHV0LnJlcG9Sb290IH0pO1xuXG4gICAgLy8gVXBkYXRlIHRoZSBBUEkgcmVjb3JkIHdpdGggdGhlIG5ldyB3b3JrdHJlZSBwYXRoXG4gICAgYXdhaXQgY2xpZW50LmFkZEJyYW5jaChcbiAgICAgIGlucHV0LmNhcmRJZCxcbiAgICAgIHsgbmFtZTogYnJhbmNoLm5hbWUsIHdvcmt0cmVlOiByZXN1bHQud29ya3RyZWUsIHBhcmVudEJyYW5jaDogYnJhbmNoLnBhcmVudEJyYW5jaCB9LFxuICAgICAgeyBzZXNzaW9uSWQgfVxuICAgICk7XG5cbiAgICByZXR1cm4geyB3b3JrdHJlZVBhdGg6IHJlc3VsdC53b3JrdHJlZSwgYnJhbmNoTmFtZTogYnJhbmNoLm5hbWUsIHBhcmVudEJyYW5jaDogYnJhbmNoLnBhcmVudEJyYW5jaCB9O1xuICB9XG5cbiAgLy8gU3RlcCAzOiBObyB2YWxpZCBleGlzdGluZyBicmFuY2ggXHUyMDE0IGNyZWF0ZSBuZXcgb25lLlxuICAvLyBUaGUgQVBJIG1heSBiZSBvdXQgb2Ygc3luYyB3aXRoIGdpdCAoZS5nLiBhIHByZXZpb3VzIHdvcmt0cmVlIHdhcyBjcmVhdGVkXG4gIC8vIGJ1dCBuZXZlciByZWdpc3RlcmVkLCBvciBpdHMgQVBJIHJlY29yZCB3YXMgZGVsZXRlZCkuIFRvIGF2b2lkIGNvbGxpZGluZ1xuICAvLyB3aXRoIHdvcmt0cmVlcyBnaXQgYWxyZWFkeSBrbm93cyBhYm91dCwgcHJvYmUgZ2l0J3MgYWN0dWFsIHN0YXRlIGFuZFxuICAvLyBpbmNyZW1lbnQgcGFzdCBhbnkgb2NjdXBpZWQgc2xvdHMuXG4gIGNvbnN0IHByZWZpeCA9IGBjYXJkcy8ke2lucHV0LmNhcmRJZH0vYDtcbiAgY29uc3QgZXhpc3RpbmdOdW1iZXJzID0gYnJhbmNoZXNcbiAgICAuZmlsdGVyKChiKSA9PiBiLm5hbWUuc3RhcnRzV2l0aChwcmVmaXgpKVxuICAgIC5tYXAoKGIpID0+IHBhcnNlSW50KGIubmFtZS5zbGljZShwcmVmaXgubGVuZ3RoKSwgMTApKVxuICAgIC5maWx0ZXIoKG4pID0+ICFOdW1iZXIuaXNOYU4obikpO1xuICBsZXQgbmV4dE51bWJlciA9IGV4aXN0aW5nTnVtYmVycy5sZW5ndGggPiAwID8gTWF0aC5tYXgoLi4uZXhpc3RpbmdOdW1iZXJzKSArIDEgOiAxO1xuXG4gIGNvbnN0IHsgcmVwb1Jvb3QgfSA9IGF3YWl0IGZpbmRHaXRSb290cyhpbnB1dC5yZXBvUm9vdCk7XG4gIHdoaWxlIChhd2FpdCBjaGVja1dvcmt0cmVlRXhpc3RzKHJlcG9Sb290LCBwYXRoLmpvaW4ocmVwb1Jvb3QsICcud29ya3RyZWVzJywgYCR7cHJlZml4fSR7bmV4dE51bWJlcn1gKSkpIHtcbiAgICBsb2dnZXIud2FybignV29ya3RyZWUgYWxyZWFkeSBleGlzdHMgaW4gZ2l0IGJ1dCBub3QgaW4gQVBJLCBza2lwcGluZycsIHtcbiAgICAgIGJyYW5jaDogYCR7cHJlZml4fSR7bmV4dE51bWJlcn1gXG4gICAgfSk7XG4gICAgbmV4dE51bWJlcisrO1xuICB9XG5cbiAgY29uc3QgYnJhbmNoTmFtZSA9IGAke3ByZWZpeH0ke25leHROdW1iZXJ9YDtcbiAgY29uc3QgcmVzdWx0ID0gYXdhaXQgY3JlYXRlV29ya3RyZWUoYnJhbmNoTmFtZSwgeyBjd2Q6IGlucHV0LnJlcG9Sb290IH0pO1xuICBhd2FpdCBjbGllbnQuYWRkQnJhbmNoKFxuICAgIGlucHV0LmNhcmRJZCxcbiAgICB7IG5hbWU6IGJyYW5jaE5hbWUsIHdvcmt0cmVlOiByZXN1bHQud29ya3RyZWUsIHBhcmVudEJyYW5jaDogYmFzZUJyYW5jaCB9LFxuICAgIHsgc2Vzc2lvbklkIH1cbiAgKTtcblxuICBsb2dnZXIuaW5mbygnQ3JlYXRlZCBuZXcgd29ya3RyZWUnLCB7IGJyYW5jaDogYnJhbmNoTmFtZSwgd29ya3RyZWU6IHJlc3VsdC53b3JrdHJlZSB9KTtcbiAgcmV0dXJuIHsgd29ya3RyZWVQYXRoOiByZXN1bHQud29ya3RyZWUsIGJyYW5jaE5hbWUsIHBhcmVudEJyYW5jaDogYmFzZUJyYW5jaCB9O1xufVxuXG4vKipcbiAqIFJ1bnMgYSBzaW5nbGUgY2xlYW51cCBzdGVwLCBsb2dnaW5nIGEgd2FybmluZyBvbiBmYWlsdXJlIHJhdGhlciB0aGFuXG4gKiBhYm9ydGluZyB0aGUgc3dlZXAuIEVhY2ggc3RlcCAod29ya3RyZWUgcmVtb3ZhbCwgYnJhbmNoIGRlbGV0aW9uLCBBUElcbiAqIHJlY29yZCByZW1vdmFsKSBpcyBpbmRlcGVuZGVudCBcdTIwMTQgYSBmYWlsdXJlIGluIG9uZSBtdXN0IG5vdCBwcmV2ZW50IHRoZVxuICogb3RoZXJzIGZyb20gcnVubmluZy5cbiAqXG4gKiBAcGFyYW0gc3RlcCAtIEFzeW5jIG9wZXJhdGlvbiB0byBhdHRlbXB0LlxuICogQHBhcmFtIGxhYmVsIC0gSHVtYW4tcmVhZGFibGUgbGFiZWwgbG9nZ2VkIG9uIGZhaWx1cmUuXG4gKiBAcGFyYW0gYnJhbmNoTmFtZSAtIEJyYW5jaCBuYW1lIGluY2x1ZGVkIGluIGRpYWdub3N0aWMgb3V0cHV0LlxuICogQHBhcmFtIGxvZ2dlciAtIExvZ2dlciBmb3IgZGlhZ25vc3RpYyBvdXRwdXQuXG4gKi9cbmFzeW5jIGZ1bmN0aW9uIHRyeUNsZWFudXBTdGVwKFxuICBzdGVwOiAoKSA9PiBQcm9taXNlPHVua25vd24+LFxuICBsYWJlbDogc3RyaW5nLFxuICBicmFuY2hOYW1lOiBzdHJpbmcsXG4gIGxvZ2dlcjogQWN0aW9uQ29udGV4dFsnbG9nZ2VyJ11cbik6IFByb21pc2U8dm9pZD4ge1xuICB0cnkge1xuICAgIGF3YWl0IHN0ZXAoKTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBsb2dnZXIud2FybihsYWJlbCwgeyBicmFuY2g6IGJyYW5jaE5hbWUsIGVycm9yOiBlcnJvck1lc3NhZ2UoZXJyb3IpIH0pO1xuICB9XG59XG5cbi8qKlxuICogUmVtb3ZlcyBicmFuY2hlcyB0aGF0IGFyZSBmdWxseSBtZXJnZWQgaW50byB0aGVpciBwYXJlbnQgYnJhbmNoLlxuICpcbiAqIEZvciBlYWNoIG1lcmdlZCBicmFuY2ggdGhlIHdvcmt0cmVlIGRpcmVjdG9yeSBpcyByZW1vdmVkLCB0aGUgbG9jYWwgYnJhbmNoXG4gKiByZWYgaXMgZGVsZXRlZCwgYW5kIHRoZSBicmFuY2ggcmVjb3JkIGlzIHJlbW92ZWQgZnJvbSB0aGUgQVBJLiBXb3JrdHJlZVxuICogcmVtb3ZhbCBmYWlsdXJlcyBhcmUgbG9nZ2VkIGFuZCBkbyBub3QgYmxvY2sgYnJhbmNoIGRlbGV0aW9uLiBIb3dldmVyLCB0aGVcbiAqIEFQSSByZWNvcmQgaXMgb25seSByZW1vdmVkIGFmdGVyIGNvbmZpcm1pbmcgdGhlIGdpdCBicmFuY2ggd2FzIGRlbGV0ZWQgXHUyMDE0XG4gKiByZW1vdmluZyB0aGUgcmVjb3JkIHdoaWxlIHRoZSBicmFuY2ggc3RpbGwgZXhpc3RzIHdvdWxkIGNhdXNlIHN1YnNlcXVlbnRcbiAqIHNlc3Npb25zIHRvIGxvc2UgdHJhY2sgb2YgaXQgYW5kIGNyZWF0ZSBkdXBsaWNhdGVzLlxuICpcbiAqIEVhY2ggYnJhbmNoIGlzIGNoZWNrZWQgYWdhaW5zdCBpdHMgb3duIGBwYXJlbnRCcmFuY2hgICh0aGUgYnJhbmNoIGl0IHdhc1xuICogY3JlYXRlZCBmcm9tKSwgbm90IHRoZSB3b3Jrc3BhY2UncyBjdXJyZW50IEhFQUQuIFRoaXMgZW5zdXJlcyBicmFuY2hlcyBhcmVcbiAqIG9ubHkgY2xlYW5lZCB1cCB3aGVuIHRydWx5IG1lcmdlZCBpbnRvIHRoZWlyIGludGVuZGVkIHRhcmdldC5cbiAqXG4gKiBAcGFyYW0gaW5wdXQgLSBBY3Rpb24gaW5wdXQgY29udGFpbmluZyBjYXJkSWQgYW5kIHdvcmtzcGFjZSBwYXRocy5cbiAqIEBwYXJhbSBjbGllbnQgLSBDYXJkcyBBUEkgY2xpZW50IGZvciBicmFuY2ggcmVtb3ZhbC5cbiAqIEBwYXJhbSBsb2dnZXIgLSBMb2dnZXIgZm9yIGRpYWdub3N0aWMgb3V0cHV0LlxuICogQHBhcmFtIHNlc3Npb25JZCAtIENsYXVkZSBDb2RlIHNlc3Npb24gSUQgZm9yd2FyZGVkIHRvIHRoZSBBUEkgc28gdGhlIGNhcmQgcmVwbyBwb3N0LWNvbW1pdCBob29rIGNhbiBhdHRyaWJ1dGUgdGhlIGNvbW1pdC5cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGNsZWFudXBNZXJnZWRCcmFuY2hlcyhcbiAgaW5wdXQ6IEFjdGlvbklucHV0LFxuICBjbGllbnQ6IENhcmRzQ2xpZW50LFxuICBsb2dnZXI6IEFjdGlvbkNvbnRleHRbJ2xvZ2dlciddLFxuICBzZXNzaW9uSWQ/OiBzdHJpbmdcbik6IFByb21pc2U8dm9pZD4ge1xuICBsZXQgdDAgPSBwZXJmb3JtYW5jZS5ub3coKTtcbiAgY29uc3QgeyBicmFuY2hlcyB9ID0gYXdhaXQgY2xpZW50LmdldEJyYW5jaGVzKGlucHV0LmNhcmRJZCwgeyB3b3Jrc3BhY2VQYXRoOiBpbnB1dC5yZXBvUm9vdCB9KTtcbiAgbG9nZ2VyLmRlYnVnKCdnZXRCcmFuY2hlcyBjb21wbGV0ZWQnLCB7XG4gICAgY2FyZElkOiBpbnB1dC5jYXJkSWQsXG4gICAgYnJhbmNoQ291bnQ6IGJyYW5jaGVzLmxlbmd0aCxcbiAgICBlbGFwc2VkTXM6IE1hdGgucm91bmQocGVyZm9ybWFuY2Uubm93KCkgLSB0MClcbiAgfSk7XG5cbiAgZm9yIChjb25zdCBicmFuY2ggb2YgYnJhbmNoZXMpIHtcbiAgICBpZiAoIWJyYW5jaC5leGlzdHMpIGNvbnRpbnVlO1xuXG4gICAgLy8gU2VsZi1yZWZlcmVudGlhbCBwYXJlbnRCcmFuY2ggaXMgYSBjb3JydXB0IHN0YXRlIFx1MjAxNCBgbWVyZ2UtYmFzZSAtLWlzLWFuY2VzdG9yIFggWGBcbiAgICAvLyB0cml2aWFsbHkgc3VjY2VlZHMsIHNvIGNsZWFudXAgd291bGQgaW5jb3JyZWN0bHkgcmVtb3ZlIHVubWVyZ2VkIHdvcmsuXG4gICAgaWYgKGJyYW5jaC5wYXJlbnRCcmFuY2ggPT09IGJyYW5jaC5uYW1lKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgIGBCcmFuY2ggXCIke2JyYW5jaC5uYW1lfVwiIGhhcyBzZWxmLXJlZmVyZW50aWFsIHBhcmVudEJyYW5jaCBcdTIwMTQgcmVmdXNpbmcgdG8gcnVuIGNsZWFudXAuIGAgK1xuICAgICAgICAgICdUaGlzIGlzIGEgZGF0YSBjb3JydXB0aW9uIGJ1ZzogYSBicmFuY2ggY2Fubm90IGJlIGl0cyBvd24gcGFyZW50LidcbiAgICAgICk7XG4gICAgfVxuXG4gICAgdDAgPSBwZXJmb3JtYW5jZS5ub3coKTtcbiAgICB0cnkge1xuICAgICAgLy8gbWVyZ2UtYmFzZSAtLWlzLWFuY2VzdG9yIGV4aXRzIG5vbi16ZXJvIHdoZW4gTk9UIGFuIGFuY2VzdG9yIChub3QgbWVyZ2VkKS5cbiAgICAgIC8vIENoZWNrIGFnYWluc3QgdGhlIGJyYW5jaCdzIG93biBwYXJlbnRCcmFuY2gsIG5vdCB0aGUgd29ya3NwYWNlIEhFQUQuXG4gICAgICBhd2FpdCBleGVjRmlsZUFzeW5jKCdnaXQnLCBbJ21lcmdlLWJhc2UnLCAnLS1pcy1hbmNlc3RvcicsIGJyYW5jaC5uYW1lLCBicmFuY2gucGFyZW50QnJhbmNoXSwge1xuICAgICAgICBjd2Q6IGlucHV0LnJlcG9Sb290XG4gICAgICB9KTtcbiAgICB9IGNhdGNoIHtcbiAgICAgIC8vIEV4cGVjdGVkIGZvciB1bm1lcmdlZCBicmFuY2hlcyBcdTIwMTQgc2tpcCBjbGVhbnVwXG4gICAgICBsb2dnZXIuZGVidWcoJ0JyYW5jaCBub3QgbWVyZ2VkLCBza2lwcGluZyBjbGVhbnVwJywge1xuICAgICAgICBicmFuY2g6IGJyYW5jaC5uYW1lLFxuICAgICAgICBlbGFwc2VkTXM6IE1hdGgucm91bmQocGVyZm9ybWFuY2Uubm93KCkgLSB0MClcbiAgICAgIH0pO1xuICAgICAgY29udGludWU7XG4gICAgfVxuICAgIGxvZ2dlci5kZWJ1ZygnbWVyZ2UtYmFzZSBjaGVjayBjb21wbGV0ZWQgKG1lcmdlZCknLCB7XG4gICAgICBicmFuY2g6IGJyYW5jaC5uYW1lLFxuICAgICAgZWxhcHNlZE1zOiBNYXRoLnJvdW5kKHBlcmZvcm1hbmNlLm5vdygpIC0gdDApXG4gICAgfSk7XG5cbiAgICAvLyBCcmFuY2ggaXMgbWVyZ2VkIFx1MjAxNCBjbGVhbiB1cCB3b3JrdHJlZSwgYnJhbmNoIHJlZiwgYW5kIEFQSSByZWNvcmRcbiAgICBpZiAoYnJhbmNoLndvcmt0cmVlKSB7XG4gICAgICB0MCA9IHBlcmZvcm1hbmNlLm5vdygpO1xuICAgICAgYXdhaXQgdHJ5Q2xlYW51cFN0ZXAoXG4gICAgICAgICgpID0+IGV4ZWNGaWxlQXN5bmMoJ2dpdCcsIFsnd29ya3RyZWUnLCAncmVtb3ZlJywgYnJhbmNoLndvcmt0cmVlIV0sIHsgY3dkOiBpbnB1dC5yZXBvUm9vdCB9KSxcbiAgICAgICAgJ0ZhaWxlZCB0byByZW1vdmUgd29ya3RyZWUnLFxuICAgICAgICBicmFuY2gubmFtZSxcbiAgICAgICAgbG9nZ2VyXG4gICAgICApO1xuICAgICAgbG9nZ2VyLmRlYnVnKCdXb3JrdHJlZSByZW1vdmFsIGNvbXBsZXRlZCcsIHtcbiAgICAgICAgYnJhbmNoOiBicmFuY2gubmFtZSxcbiAgICAgICAgZWxhcHNlZE1zOiBNYXRoLnJvdW5kKHBlcmZvcm1hbmNlLm5vdygpIC0gdDApXG4gICAgICB9KTtcbiAgICB9XG5cbiAgICB0MCA9IHBlcmZvcm1hbmNlLm5vdygpO1xuICAgIGxldCBicmFuY2hEZWxldGVkID0gZmFsc2U7XG4gICAgdHJ5IHtcbiAgICAgIGF3YWl0IGV4ZWNGaWxlQXN5bmMoJ2dpdCcsIFsnYnJhbmNoJywgJy1kJywgYnJhbmNoLm5hbWVdLCB7IGN3ZDogaW5wdXQucmVwb1Jvb3QgfSk7XG4gICAgICBicmFuY2hEZWxldGVkID0gdHJ1ZTtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgbG9nZ2VyLndhcm4oJ0ZhaWxlZCB0byBkZWxldGUgYnJhbmNoJywgeyBicmFuY2g6IGJyYW5jaC5uYW1lLCBlcnJvcjogZXJyb3JNZXNzYWdlKGVycm9yKSB9KTtcbiAgICB9XG4gICAgbG9nZ2VyLmRlYnVnKCdCcmFuY2ggZGVsZXRpb24gY29tcGxldGVkJywge1xuICAgICAgYnJhbmNoOiBicmFuY2gubmFtZSxcbiAgICAgIGJyYW5jaERlbGV0ZWQsXG4gICAgICBlbGFwc2VkTXM6IE1hdGgucm91bmQocGVyZm9ybWFuY2Uubm93KCkgLSB0MClcbiAgICB9KTtcblxuICAgIGlmIChicmFuY2hEZWxldGVkKSB7XG4gICAgICB0MCA9IHBlcmZvcm1hbmNlLm5vdygpO1xuICAgICAgYXdhaXQgdHJ5Q2xlYW51cFN0ZXAoXG4gICAgICAgICgpID0+IGNsaWVudC5yZW1vdmVCcmFuY2goaW5wdXQuY2FyZElkLCBicmFuY2gubmFtZSwgeyBzZXNzaW9uSWQgfSksXG4gICAgICAgICdGYWlsZWQgdG8gcmVtb3ZlIGJyYW5jaCBmcm9tIEFQSScsXG4gICAgICAgIGJyYW5jaC5uYW1lLFxuICAgICAgICBsb2dnZXJcbiAgICAgICk7XG4gICAgICBsb2dnZXIuZGVidWcoJ0FQSSBicmFuY2ggcmVtb3ZhbCBjb21wbGV0ZWQnLCB7XG4gICAgICAgIGJyYW5jaDogYnJhbmNoLm5hbWUsXG4gICAgICAgIGVsYXBzZWRNczogTWF0aC5yb3VuZChwZXJmb3JtYW5jZS5ub3coKSAtIHQwKVxuICAgICAgfSk7XG5cbiAgICAgIGxvZ2dlci5pbmZvKCdDbGVhbmVkIHVwIG1lcmdlZCBicmFuY2gnLCB7IGJyYW5jaDogYnJhbmNoLm5hbWUgfSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGxvZ2dlci5pbmZvKCdTa2lwcGVkIEFQSSByZWNvcmQgcmVtb3ZhbCBcdTIwMTQgZ2l0IGJyYW5jaCBzdGlsbCBleGlzdHMnLCB7IGJyYW5jaDogYnJhbmNoLm5hbWUgfSk7XG4gICAgfVxuICB9XG59XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIFVuaWZpZWQgc2Vzc2lvbiBzcGF3bmVyXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbi8qKlxuICogT3B0aW9ucyBmb3Ige0BsaW5rIHNwYXduQ2xhdWRlU2Vzc2lvbn0uXG4gKlxuICogQWN0aW9ucyBwcm92aWRlIHRoZSB2YXJpYWJsZSBwYXJ0cyAocHJvbXB0LCBzZXNzaW9uIGlkZW50aXR5LCBzd2l0Y2gtdG8tXG4gKiBpbnRlcmFjdGl2ZSBzdXBwb3J0KTsgdGhlIGhlbHBlciBoYW5kbGVzIGV2ZXJ5dGhpbmcgZWxzZTogd29ya3RyZWVcbiAqIHJlc29sdXRpb24sIG1hcmtldHBsYWNlIHJlZ2lzdHJhdGlvbiwgZW52IGNvbnN0cnVjdGlvbiwgc3Bhd24sIGxpZmVjeWNsZVxuICogY2FsbGJhY2tzLCBhbmQgcG9zdC1leGl0IGJyYW5jaCBjbGVhbnVwLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIENsYXVkZVNlc3Npb25PcHRpb25zIHtcbiAgLyoqIFByb21wdCBzdHJpbmcgcGFzc2VkIHRvIHRoZSBDbGF1ZGUgQ0xJLiAqL1xuICBwcm9tcHQ6IHN0cmluZztcbiAgLyoqIFNlc3Npb24gaWRlbnRpZmllciAodXNlZCBmb3IgYC0tc2Vzc2lvbi1pZGAgb3IgYC0tcmVzdW1lYCkuICovXG4gIHNlc3Npb25JZDogc3RyaW5nO1xuICAvKiogV2hlbiB0cnVlLCBwYXNzZXMgYC0tcmVzdW1lYCBpbnN0ZWFkIG9mIHN0YXJ0aW5nIGEgbmV3IHNlc3Npb24uICovXG4gIHJlc3VtZTogYm9vbGVhbjtcbiAgLyoqXG4gICAqIFdoZW4gdHJ1ZSwgcmVnaXN0ZXJzIHtAbGluayBBY3Rpb25Db250ZXh0Lm9uU3dpdGNoVG9JbnRlcmFjdGl2ZX0gc29cbiAgICogYmFja2dyb3VuZC1tb2RlIHNlc3Npb25zIGNhbiBiZSBwcm9tb3RlZCB0byBpbnRlcmFjdGl2ZS5cbiAgICovXG4gIHN1cHBvcnRzU3dpdGNoVG9JbnRlcmFjdGl2ZTogYm9vbGVhbjtcbn1cblxuLyoqXG4gKiBTcGF3bnMgYSBgY2xhdWRlYCBDTEkgc2Vzc2lvbiB3aXRoIGZ1bGwgd29ya3RyZWUsIG1hcmtldHBsYWNlLCBhbmRcbiAqIGxpZmVjeWNsZSBtYW5hZ2VtZW50LlxuICpcbiAqIENlbnRyYWxpc2VzIHRoZSBzcGF3biBsb2dpYyBzaGFyZWQgYnkgdGhlIGBsYXVuY2hgIGFuZCBgaW50ZXJ2aWV3YFxuICogYWN0aW9ucyBzbyBlbnZpcm9ubWVudCB2YXJpYWJsZSBjb25zdHJ1Y3Rpb24sIHdvcmt0cmVlIHJlc29sdXRpb24sXG4gKiBtYXJrZXRwbGFjZSByZWdpc3RyYXRpb24sIGFuZCBwb3N0LWV4aXQgY2xlYW51cCBjYW5ub3QgZHJpZnQgYmV0d2VlblxuICogY2FsbGVycy5cbiAqXG4gKiBTdGVwczpcbiAqIDEuIENyZWF0ZSB7QGxpbmsgQ2FyZHNDbGllbnR9XG4gKiAyLiBSZXNvbHZlIGJhc2UgYnJhbmNoIGFuZCB3b3JrdHJlZVxuICogMy4gUmVnaXN0ZXIgbWFya2V0cGxhY2VcbiAqIDQuIEJ1aWxkIENMSSBhcmdzIGFuZCBzcGF3biBgY2xhdWRlYFxuICogNS4gV2lyZSBvbkNhbmNlbCAoYW5kIG9wdGlvbmFsbHkgb25Td2l0Y2hUb0ludGVyYWN0aXZlKVxuICogNi4gQ2FwdHVyZSBzdGRlcnIgaW4gYmFja2dyb3VuZCBtb2RlXG4gKiA3LiBBd2FpdCBwcm9jZXNzIGV4aXRcbiAqIDguIENsZWFuIHVwIGZ1bGx5LW1lcmdlZCBicmFuY2hlcyAoYmFja2dyb3VuZCBtb2RlIG9ubHk7IGluIGludGVyYWN0aXZlXG4gKiAgICBtb2RlIHRoZSB3YXRjaGVyIGFuZCBleHRlbnNpb24gaGFuZGxlIGNsZWFudXAgYWZ0ZXIgdGhlIGFjdGlvbiBleGl0cylcbiAqXG4gKiBAcGFyYW0gaW5wdXQgLSBQYXJzZWQgYWN0aW9uIGlucHV0IGZyb20gdGhlIGVudmlyb25tZW50LlxuICogQHBhcmFtIGNvbnRleHQgLSBBY3Rpb24gY29udGV4dCBwcm92aWRpbmcgbG9nZ2VyIGFuZCBsaWZlY3ljbGUgaG9va3MuXG4gKiBAcGFyYW0gb3B0aW9ucyAtIFNlc3Npb24tc3BlY2lmaWMgcGFyYW1ldGVycyAocHJvbXB0LCBzZXNzaW9uIElELCBldGMuKS5cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHNwYXduQ2xhdWRlU2Vzc2lvbihcbiAgaW5wdXQ6IEFjdGlvbklucHV0LFxuICBjb250ZXh0OiBBY3Rpb25Db250ZXh0LFxuICBvcHRpb25zOiBDbGF1ZGVTZXNzaW9uT3B0aW9uc1xuKTogUHJvbWlzZTx2b2lkPiB7XG4gIGNvbnN0IHsgcHJvbXB0LCBzZXNzaW9uSWQsIHJlc3VtZSwgc3VwcG9ydHNTd2l0Y2hUb0ludGVyYWN0aXZlIH0gPSBvcHRpb25zO1xuXG4gIGNvbnRleHQubG9nZ2VyLmluZm8oYCR7aW5wdXQuYWN0aW9uTmFtZX0gYWN0aW9uIHN0YXJ0ZWRgLCB7XG4gICAgY2FyZElkOiBpbnB1dC5jYXJkSWQsXG4gICAgZW52aXJvbm1lbnQ6IGlucHV0LmVudmlyb25tZW50LFxuICAgIGV4ZWN1dGlvbk1vZGU6IGlucHV0LmV4ZWN1dGlvbk1vZGUsXG4gICAgc2Vzc2lvbklkXG4gIH0pO1xuXG4gIGNvbnN0IGNsaWVudCA9IG5ldyBDYXJkc0NsaWVudCh7XG4gICAgYmFzZVVybDogaW5wdXQuYXBpQmFzZVVybCxcbiAgICBhY2Nlc3NUb2tlbjogaW5wdXQuYXBpQWNjZXNzVG9rZW5cbiAgfSk7XG5cbiAgY29uc3QgYmFzZUJyYW5jaCA9IGF3YWl0IHJlc29sdmVCYXNlQnJhbmNoKGlucHV0LnJlcG9Sb290LCBjbGllbnQpO1xuXG4gIGNvbnN0IHdvcmt0cmVlUmVzdWx0ID0gYXdhaXQgcmVzb2x2ZU9yQ3JlYXRlV29ya3RyZWUoaW5wdXQsIGNsaWVudCwgYmFzZUJyYW5jaCwgY29udGV4dC5sb2dnZXIsIHNlc3Npb25JZCk7XG5cbiAgY29uc3QgeyB3b3JrdHJlZVBhdGg6IGN3ZCwgYnJhbmNoTmFtZSwgcGFyZW50QnJhbmNoIH0gPSB3b3JrdHJlZVJlc3VsdDtcbiAgY29udGV4dC5sb2dnZXIuaW5mbygnVXNpbmcgd29ya3RyZWUnLCB7IGN3ZCwgYnJhbmNoOiBicmFuY2hOYW1lLCBiYXNlQnJhbmNoLCBwYXJlbnRCcmFuY2ggfSk7XG5cbiAgY29uc3QgbWFya2V0cGxhY2VQYXRoID0gcmVzb2x2ZU1hcmtldHBsYWNlUGF0aCgpO1xuICBhd2FpdCB1cGRhdGVNYXJrZXRwbGFjZVJlZ2lzdHJhdGlvbihtYXJrZXRwbGFjZVBhdGgsIGNvbnRleHQubG9nZ2VyKTtcblxuICBjb25zdCBhcmdzID0gYnVpbGRBcmdzKHByb21wdCwgc2Vzc2lvbklkLCByZXN1bWUsIGlucHV0LmV4ZWN1dGlvbk1vZGUsIGlucHV0LmNhcmRSZXBvUGF0aCwgbWFya2V0cGxhY2VQYXRoKTtcbiAgY29uc3QgaXNJbnRlcmFjdGl2ZSA9IGlucHV0LmV4ZWN1dGlvbk1vZGUgPT09ICdpbnRlcmFjdGl2ZSc7XG5cbiAgY29uc3QgY2hpbGQ6IENoaWxkUHJvY2VzcyA9IHNwYXduKCdjbGF1ZGUnLCBhcmdzLCB7XG4gICAgY3dkLFxuICAgIHN0ZGlvOiBpc0ludGVyYWN0aXZlID8gJ2luaGVyaXQnIDogWydpZ25vcmUnLCAnaWdub3JlJywgJ3BpcGUnXSxcbiAgICBlbnY6IHtcbiAgICAgIC4uLnByb2Nlc3MuZW52LFxuICAgICAgV09SS1NQQUNFX1BBVEg6IGN3ZCxcbiAgICAgIENMQVVERV9DT0RFX1RBU0tfTElTVF9JRDogYGNhcmRzLWV4dGVuc2lvbi0ke2lucHV0LmNhcmRJZH1gLFxuICAgICAgQ0xBVURFX0NPREVfRVhQRVJJTUVOVEFMX0FHRU5UX1RFQU1TOiAnMScsXG4gICAgICBCQVNFX0JSQU5DSDogYmFzZUJyYW5jaCxcbiAgICAgIFBBUkVOVF9CUkFOQ0g6IHBhcmVudEJyYW5jaCxcbiAgICAgIFdPUktTUEFDRV9CUkFOQ0g6IGJyYW5jaE5hbWVcbiAgICB9XG4gIH0pO1xuXG4gIGNvbnRleHQub25DYW5jZWwoKCkgPT4ge1xuICAgIGNvbnRleHQubG9nZ2VyLmluZm8oYCR7aW5wdXQuYWN0aW9uTmFtZX0gYWN0aW9uIGNhbmNlbGxlZCwgdGVybWluYXRpbmcgY2xhdWRlYCwgeyBzZXNzaW9uSWQgfSk7XG4gICAgY2hpbGQua2lsbCgnU0lHVEVSTScpO1xuICB9KTtcblxuICBpZiAoc3VwcG9ydHNTd2l0Y2hUb0ludGVyYWN0aXZlKSB7XG4gICAgY29udGV4dC5vblN3aXRjaFRvSW50ZXJhY3RpdmUoKCkgPT4ge1xuICAgICAgY29udGV4dC5sb2dnZXIuaW5mbygnU3dpdGNoaW5nIHRvIGludGVyYWN0aXZlIG1vZGUnLCB7IHNlc3Npb25JZCB9KTtcbiAgICAgIGNoaWxkLmtpbGwoJ1NJR1RFUk0nKTtcbiAgICAgIHJldHVybiB7IHNlc3Npb25JZCB9O1xuICAgIH0pO1xuICB9XG5cbiAgLy8gQmFja2dyb3VuZCBtb2RlOiBjYXB0dXJlIHN0ZGVyciBmb3IgZGlhZ25vc3RpYyBsb2dnaW5nXG4gIGlmICghaXNJbnRlcmFjdGl2ZSkge1xuICAgIGNoaWxkLnN0ZGVycj8ub24oJ2RhdGEnLCAoY2h1bms6IEJ1ZmZlcikgPT4ge1xuICAgICAgY29uc3QgdGV4dCA9IGNodW5rLnRvU3RyaW5nKCkudHJpbSgpO1xuICAgICAgaWYgKHRleHQpIHtcbiAgICAgICAgY29udGV4dC5sb2dnZXIud2Fybih0ZXh0KTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gIGNvbnN0IGV4aXRDb2RlID0gYXdhaXQgbmV3IFByb21pc2U8bnVtYmVyIHwgbnVsbD4oKHJlc29sdmUpID0+IHtcbiAgICBjaGlsZC5vbignY2xvc2UnLCByZXNvbHZlKTtcbiAgfSk7XG5cbiAgY29udGV4dC5sb2dnZXIuaW5mbyhgJHtpbnB1dC5hY3Rpb25OYW1lfSBhY3Rpb24gY29tcGxldGVkYCwgeyBzZXNzaW9uSWQsIGV4aXRDb2RlIH0pO1xuXG4gIC8vIFBvc3QtZXhpdCBjbGVhbnVwOiByZW1vdmUgZnVsbHktbWVyZ2VkIGJyYW5jaGVzLlxuICAvLyBJbiBiYWNrZ3JvdW5kIG1vZGUgdGhlcmUgaXMgbm8gd2F0Y2hlciwgc28gd2UgcnVuIGNsZWFudXAgaW5saW5lLlxuICAvLyBJbiBpbnRlcmFjdGl2ZSBtb2RlIHdlIHNwYXduIGEgZGV0YWNoZWQgcHJvY2VzcyBzbyB0aGUgdGVybWluYWwgY2xvc2VzXG4gIC8vIGltbWVkaWF0ZWx5IFx1MjAxNCB0aGUgd2F0Y2hlciBjYWxscyB0aGUgc2FtZSBjbGVhbnVwTWVyZ2VkQnJhbmNoZXMgZnVuY3Rpb24uXG4gIGlmIChpc0ludGVyYWN0aXZlKSB7XG4gICAgdHJ5IHtcbiAgICAgIHNwYXduQnJhbmNoQ2xlYW51cFdhdGNoZXIoe1xuICAgICAgICBjYXJkSWQ6IGlucHV0LmNhcmRJZCxcbiAgICAgICAgcmVwb1Jvb3Q6IGlucHV0LnJlcG9Sb290LFxuICAgICAgICBhcGlCYXNlVXJsOiBpbnB1dC5hcGlCYXNlVXJsLFxuICAgICAgICBhcGlBY2Nlc3NUb2tlbjogaW5wdXQuYXBpQWNjZXNzVG9rZW4sXG4gICAgICAgIHNlc3Npb25JZFxuICAgICAgfSk7XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIGNvbnN0IG1lc3NhZ2UgPSBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6IFN0cmluZyhlcnJvcik7XG4gICAgICBjb250ZXh0LmxvZ2dlci53YXJuKCdGYWlsZWQgdG8gc3Bhd24gYnJhbmNoLWNsZWFudXAgd2F0Y2hlciAobm9uLWZhdGFsKScsIHsgZXJyb3I6IG1lc3NhZ2UsIHNlc3Npb25JZCB9KTtcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgY29uc3QgY2xlYW51cFN0YXJ0ID0gcGVyZm9ybWFuY2Uubm93KCk7XG4gICAgdHJ5IHtcbiAgICAgIGF3YWl0IGNsZWFudXBNZXJnZWRCcmFuY2hlcyhpbnB1dCwgY2xpZW50LCBjb250ZXh0LmxvZ2dlciwgc2Vzc2lvbklkKTtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgY29uc3QgbWVzc2FnZSA9IGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogU3RyaW5nKGVycm9yKTtcbiAgICAgIGlmIChtZXNzYWdlLmluY2x1ZGVzKCdzZWxmLXJlZmVyZW50aWFsIHBhcmVudEJyYW5jaCcpIHx8IG1lc3NhZ2UuaW5jbHVkZXMoJ2RhdGEgY29ycnVwdGlvbicpKSB7XG4gICAgICAgIHRocm93IGVycm9yO1xuICAgICAgfVxuICAgICAgY29udGV4dC5sb2dnZXIud2FybignUG9zdC1leGl0IGNsZWFudXAgZmFpbGVkIChub24tZmF0YWwpJywgeyBlcnJvcjogbWVzc2FnZSwgc2Vzc2lvbklkIH0pO1xuICAgIH1cbiAgICBjb250ZXh0LmxvZ2dlci5kZWJ1ZygnUG9zdC1leGl0IGNsZWFudXAgZmluaXNoZWQnLCB7XG4gICAgICBzZXNzaW9uSWQsXG4gICAgICBlbGFwc2VkTXM6IE1hdGgucm91bmQocGVyZm9ybWFuY2Uubm93KCkgLSBjbGVhbnVwU3RhcnQpXG4gICAgfSk7XG4gIH1cbn1cbiIsICIvKipcbiAqIEVycm9yIGNsYXNzZXMgZm9yIHRoZSBDYXJkcyBWMiBTREsuXG4gKlxuICogVGhlc2UgZXJyb3JzIG5vcm1hbGl6ZSBzZXJ2ZXIgcmVzcG9uc2VzIGFuZCBuZXR3b3JrIGZhaWx1cmVzIHNvIGNhbGxlcnMgY2FuXG4gKiBkaXN0aW5ndWlzaCBBUEkgdmFsaWRhdGlvbiBwcm9ibGVtcyBmcm9tIHRyYW5zcG9ydCBpc3N1ZXMuXG4gKlxuICpcbiAqIEBzdW1tYXJ5IEVycm9yIGNsYXNzZXMgZm9yIHRoZSBDYXJkcyBWMiBTREtcbiAqIEBtb2R1bGUgdHlwZXMvZXJyb3JzXG4gKi9cblxuaW1wb3J0IHR5cGUgeyBGaWVsZEVycm9yIH0gZnJvbSAnLi4vLi4vcHJvdG9jb2wvaW5kZXguanMnO1xuXG4vKipcbiAqIEVycm9yIHRocm93biB3aGVuIGFuIEFQSSByZXF1ZXN0IGZhaWxzIHdpdGggYW4gZXJyb3IgcmVzcG9uc2UuXG4gKlxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIHRyeSB7XG4gKiAgIGF3YWl0IGNsaWVudC5jcmVhdGVDYXJkKGRhdGEpO1xuICogfSBjYXRjaCAoZXJyb3IpIHtcbiAqICAgaWYgKGVycm9yIGluc3RhbmNlb2YgQXBpRXJyb3IpIHtcbiAqICAgICBjb25zb2xlLmVycm9yKGBBUEkgZXJyb3IgWyR7ZXJyb3IuY29kZX1dOiAke2Vycm9yLm1lc3NhZ2V9YCk7XG4gKiAgICAgaWYgKGVycm9yLmZpZWxkcykge1xuICogICAgICAgZXJyb3IuZmllbGRzLmZvckVhY2goZiA9PiBjb25zb2xlLmVycm9yKGAgICR7Zi5maWVsZH06ICR7Zi5tZXNzYWdlfWApKTtcbiAqICAgICB9XG4gKiAgIH1cbiAqIH1cbiAqIGBgYFxuICovXG5leHBvcnQgY2xhc3MgQXBpRXJyb3IgZXh0ZW5kcyBFcnJvciB7XG4gIC8qKlxuICAgKiBDcmVhdGVzIGEgbmV3IEFwaUVycm9yIGluc3RhbmNlLlxuICAgKlxuICAgKiBAcGFyYW0gbWVzc2FnZSAtIEh1bWFuLXJlYWRhYmxlIGVycm9yIG1lc3NhZ2VcbiAgICogQHBhcmFtIGNvZGUgLSBNYWNoaW5lLXJlYWRhYmxlIGVycm9yIGNvZGVcbiAgICogQHBhcmFtIGZpZWxkcyAtIE9wdGlvbmFsIGFycmF5IG9mIGZpZWxkLXNwZWNpZmljIHZhbGlkYXRpb24gZXJyb3JzXG4gICAqL1xuICBjb25zdHJ1Y3RvcihcbiAgICBtZXNzYWdlOiBzdHJpbmcsXG4gICAgcHVibGljIHJlYWRvbmx5IGNvZGU6IHN0cmluZyxcbiAgICBwdWJsaWMgcmVhZG9ubHkgZmllbGRzPzogRmllbGRFcnJvcltdXG4gICkge1xuICAgIHN1cGVyKG1lc3NhZ2UpO1xuICAgIHRoaXMubmFtZSA9ICdBcGlFcnJvcic7XG4gIH1cbn1cblxuLyoqXG4gKiBFcnJvciB0aHJvd24gd2hlbiBhIG5ldHdvcmsgcmVxdWVzdCBmYWlscyBkdWUgdG8gY29ubmVjdGl2aXR5IGlzc3Vlcy5cbiAqXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogdHJ5IHtcbiAqICAgYXdhaXQgY2xpZW50Lmxpc3RDYXJkcygpO1xuICogfSBjYXRjaCAoZXJyb3IpIHtcbiAqICAgaWYgKGVycm9yIGluc3RhbmNlb2YgTmV0d29ya0Vycm9yKSB7XG4gKiAgICAgY29uc29sZS5lcnJvcihgTmV0d29yayBlcnJvcjogJHtlcnJvci5tZXNzYWdlfWApO1xuICogICAgIGlmIChlcnJvci5jYXVzZSkge1xuICogICAgICAgY29uc29sZS5lcnJvcihgQ2F1c2VkIGJ5OiAke2Vycm9yLmNhdXNlLm1lc3NhZ2V9YCk7XG4gKiAgICAgfVxuICogICB9XG4gKiB9XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNsYXNzIE5ldHdvcmtFcnJvciBleHRlbmRzIEVycm9yIHtcbiAgLyoqXG4gICAqIENyZWF0ZXMgYSBuZXcgTmV0d29ya0Vycm9yIGluc3RhbmNlLlxuICAgKlxuICAgKiBAcGFyYW0gbWVzc2FnZSAtIEh1bWFuLXJlYWRhYmxlIGVycm9yIG1lc3NhZ2VcbiAgICogQHBhcmFtIGNhdXNlIC0gT3B0aW9uYWwgdW5kZXJseWluZyBlcnJvciB0aGF0IGNhdXNlZCB0aGlzIG5ldHdvcmsgZmFpbHVyZVxuICAgKi9cbiAgY29uc3RydWN0b3IoXG4gICAgbWVzc2FnZTogc3RyaW5nLFxuICAgIHB1YmxpYyByZWFkb25seSBjYXVzZT86IEVycm9yXG4gICkge1xuICAgIHN1cGVyKG1lc3NhZ2UpO1xuICAgIHRoaXMubmFtZSA9ICdOZXR3b3JrRXJyb3InO1xuICB9XG59XG4iLCAiLyoqXG4gKiBIVFRQIGNsaWVudCBmb3IgdGhlIENhcmRzIFYyIFJFU1QgQVBJLlxuICpcbiAqXG4gKiBAc3VtbWFyeSBIVFRQIGNsaWVudCBmb3IgdGhlIENhcmRzIFYyIFJFU1QgQVBJXG4gKiBAbW9kdWxlIHNkay9DYXJkc0NsaWVudFxuICovXG5cbmltcG9ydCB0eXBlIHtcbiAgQWN0aW9uUmVzdWx0LFxuICBDYXJkLFxuICBDb21wYXJlUmVxdWVzdCxcbiAgQ29tcGFyZVN0YXRlLFxuICBIdHRwQ2xpZW50LFxuICBTdHJlYW1NZXRhLFxuICBUaW1lbGluZUl0ZW1cbn0gZnJvbSAnLi4vcHJvdG9jb2wvaW5kZXguanMnO1xuaW1wb3J0IHR5cGUge1xuICBBZGRCcmFuY2hSZXF1ZXN0LFxuICBBdHRhY2htZW50UmVzcG9uc2UsXG4gIEJyYW5jaGVzUmVzcG9uc2UsXG4gIENhcmRDcmVhdGVEYXRhLFxuICBDYXJkc0NsaWVudE9wdGlvbnMsXG4gIENhcmRVcGRhdGVEYXRhLFxuICBDb21tZW50LFxuICBDb21tZW50Q3JlYXRlRGF0YSxcbiAgQ29tbWVudFVwZGF0ZURhdGEsXG4gIENvbW1pdEluZm8sXG4gIEdhdGVBcHByb3ZhbFJlc3BvbnNlLFxuICBJbmdlc3RXc0ZhY3RvcnksXG4gIExpc3RDYXJkc09wdGlvbnMsXG4gIFN0cmVhbVJlc3VsdCxcbiAgU3RyZWFtV3JpdGVyLFxuICBTdHJlYW1Xcml0ZXJPcHRpb25zLFxuICBUaW1lbGluZU9wdGlvbnMsXG4gIFR5cGVTY2hlbWFzUmVzcG9uc2UsXG4gIFdzU3RyZWFtU2Vzc2lvblxufSBmcm9tICcuL3R5cGVzL2NsaWVudC5qcyc7XG5pbXBvcnQgeyBBcGlFcnJvciwgTmV0d29ya0Vycm9yIH0gZnJvbSAnLi90eXBlcy9lcnJvcnMuanMnO1xuXG4vKiogSW5pdGlhbCByZXF1ZXN0IHRpbWVvdXQgaW4gbWlsbGlzZWNvbmRzICgzIHNlY29uZHMgdG8gYWNjb21tb2RhdGUgZ2l0LWJhY2tlZCBlbmRwb2ludHMpLiAqL1xuY29uc3QgSU5JVElBTF9USU1FT1VUX01TID0gM18wMDA7XG5cbi8qKiBNYXhpbXVtIHJlcXVlc3QgdGltZW91dCBpbiBtaWxsaXNlY29uZHMgYWZ0ZXIgZXhwb25lbnRpYWwgYmFja29mZi4gKi9cbmNvbnN0IE1BWF9USU1FT1VUX01TID0gMTBfMDAwO1xuXG4vKiogTWF4aW11bSBudW1iZXIgb2YgYXV0b21hdGljIHJldHJpZXMgZm9yIHRpbWVvdXQgZXJyb3JzIGJlZm9yZSBnaXZpbmcgdXAuICovXG5jb25zdCBNQVhfVElNRU9VVF9SRVRSSUVTID0gMjtcblxuLyoqXG4gKiBUeXBlLXNhZmUgSFRUUCBjbGllbnQgZm9yIHRoZSBDYXJkcyBWMiBSRVNUIEFQSS5cbiAqXG4gKiBVc2VzIHRoZSBGZXRjaCBBUEkgYnkgZGVmYXVsdCBhbmQgc3VwcG9ydHMgZGVwZW5kZW5jeSBpbmplY3Rpb24gb2YgYW5cbiAqIGFsdGVybmF0ZSB7QGxpbmsgSHR0cENsaWVudH0gZm9yIHRlc3RzIG9yIGN1c3RvbSB0cmFuc3BvcnRzLiBBbGwgcHVibGljXG4gKiBtZXRob2RzIHN1cmZhY2Ugc2VydmVyIGZhaWx1cmVzIGFzIHtAbGluayBBcGlFcnJvcn0gYW5kIHRyYW5zcG9ydCBmYWlsdXJlc1xuICogYXMge0BsaW5rIE5ldHdvcmtFcnJvcn0uXG4gKlxuICogVGhlIGRlZmF1bHQgSFRUUCBjbGllbnQgYXBwbGllcyBhbiBleHBvbmVudGlhbCBiYWNrb2ZmIHRpbWVvdXQgdG8gZmV0Y2hcbiAqIHJlcXVlc3RzOiBzdGFydGluZyBhdCAzIHNlY29uZHMsIGRvdWJsaW5nIG9uIGVhY2ggY29uc2VjdXRpdmUgZmFpbHVyZSB1cFxuICogdG8gYSAxMC1zZWNvbmQgY2FwLCBhbmQgcmVzZXR0aW5nIG9uIGFueSBzdWNjZXNzZnVsIHJlc3BvbnNlLiBUaGlzIGVuc3VyZXNcbiAqIGZhc3QgZmFpbHVyZSBkZXRlY3Rpb24gd2hlbiB0aGUgc2VydmVyIGlzIGRvd24gd2hpbGUgYWxsb3dpbmcgc2xvd2VyXG4gKiByZXNwb25zZXMgZHVyaW5nIHJlY292ZXJ5LlxuICpcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBjb25zdCBjbGllbnQgPSBuZXcgQ2FyZHNDbGllbnQoeyBiYXNlVXJsOiAnaHR0cDovL2xvY2FsaG9zdDozMDAwJywgYWNjZXNzVG9rZW46ICd0b2tlbicgfSk7XG4gKlxuICogY29uc3QgY2FyZHMgPSBhd2FpdCBjbGllbnQubGlzdENhcmRzKHsgc3RhdHVzOiAnYWN0aXZlJyB9KTtcbiAqIGF3YWl0IGNsaWVudC51cGRhdGVDYXJkKGNhcmRJZCwgeyBzdGF0dXM6ICdkb25lJyB9KTtcbiAqIGBgYFxuICovXG5leHBvcnQgY2xhc3MgQ2FyZHNDbGllbnQge1xuICBwcml2YXRlIHJlYWRvbmx5IF9odHRwQ2xpZW50PzogSHR0cENsaWVudDtcblxuICAvKiogQ3VycmVudCB0aW1lb3V0IGluIG1pbGxpc2Vjb25kcywgaW5jcmVhc2VzIHdpdGggY29uc2VjdXRpdmUgZmFpbHVyZXMuICovXG4gIHByaXZhdGUgX2N1cnJlbnRUaW1lb3V0TXMgPSBJTklUSUFMX1RJTUVPVVRfTVM7XG5cbiAgLyoqXG4gICAqIENyZWF0ZXMgYSBuZXcgQ2FyZHNDbGllbnQgaW5zdGFuY2UuXG4gICAqXG4gICAqIEBwYXJhbSBvcHRpb25zIC0gQ29uZmlndXJhdGlvbiBvcHRpb25zIGluY2x1ZGluZyBiYXNlIFVSTCBhbmQgYXV0aCB0b2tlbi5cbiAgICogQHBhcmFtIGh0dHBDbGllbnQgLSBPcHRpb25hbCBIVFRQIGNsaWVudCBmb3IgZGVwZW5kZW5jeSBpbmplY3Rpb24uXG4gICAqL1xuICBjb25zdHJ1Y3RvcihcbiAgICBwcml2YXRlIHJlYWRvbmx5IG9wdGlvbnM6IENhcmRzQ2xpZW50T3B0aW9ucyxcbiAgICBodHRwQ2xpZW50PzogSHR0cENsaWVudFxuICApIHtcbiAgICB0aGlzLl9odHRwQ2xpZW50ID0gaHR0cENsaWVudDtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXR1cm5zIHRoZSBiYXNlIFVSTCB1c2VkIHRvIGJ1aWxkIEFQSSByZXF1ZXN0cy5cbiAgICpcbiAgICogQHJldHVybnMgVGhlIGJhc2UgVVJMIHN0cmluZyBhcyBwcm92aWRlZCBpbiB7QGxpbmsgQ2FyZHNDbGllbnRPcHRpb25zfS5cbiAgICovXG4gIGdldEJhc2VVcmwoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gdGhpcy5vcHRpb25zLmJhc2VVcmw7XG4gIH1cblxuICAvKipcbiAgICogUmV0dXJucyB3aGV0aGVyIGFuIEhUVFAgY2xpZW50IHdhcyBpbmplY3RlZC5cbiAgICpcbiAgICogQHJldHVybnMgVHJ1ZSBpZiBhbiBIVFRQIGNsaWVudCB3YXMgcHJvdmlkZWQgZHVyaW5nIGNvbnN0cnVjdGlvbi5cbiAgICogQGludGVybmFsIFVzZWQgZm9yIHRlc3RpbmcgZGVwZW5kZW5jeSBpbmplY3Rpb24uXG4gICAqL1xuICBoYXNIdHRwQ2xpZW50KCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLl9odHRwQ2xpZW50ICE9PSB1bmRlZmluZWQ7XG4gIH1cbiAgLyoqXG4gICAqIFJldHVybnMgYW4gQWJvcnRTaWduYWwgdGhhdCBmaXJlcyBhZnRlciB0aGUgY3VycmVudCBiYWNrb2ZmIHRpbWVvdXQuXG4gICAqIFVzZXMgY2FsbGVyJ3Mgc2lnbmFsIGlmIHByb3ZpZGVkIChmb3IgREkvdGVzdGluZyksIG90aGVyd2lzZSBhcHBsaWVzIHRoZSBiYWNrb2ZmIHRpbWVvdXQuXG4gICAqXG4gICAqIEBwYXJhbSBleGlzdGluZ1NpZ25hbCAtIE9wdGlvbmFsIGNhbGxlci1wcm92aWRlZCBzaWduYWwgdG8gcmV1c2UgaW5zdGVhZCBvZiBjcmVhdGluZyBhIHRpbWVvdXQgc2lnbmFsLlxuICAgKiBAcmV0dXJucyBBYm9ydFNpZ25hbCB0aGF0IGNvbnRyb2xzIHJlcXVlc3QgY2FuY2VsbGF0aW9uIGZvciB0aGUgY3VycmVudCBvcGVyYXRpb24uXG4gICAqL1xuICBwcml2YXRlIGdldFRpbWVvdXRTaWduYWwoZXhpc3RpbmdTaWduYWw/OiBBYm9ydFNpZ25hbCB8IG51bGwpOiBBYm9ydFNpZ25hbCB7XG4gICAgaWYgKGV4aXN0aW5nU2lnbmFsKSByZXR1cm4gZXhpc3RpbmdTaWduYWw7XG4gICAgcmV0dXJuIEFib3J0U2lnbmFsLnRpbWVvdXQodGhpcy5fY3VycmVudFRpbWVvdXRNcyk7XG4gIH1cblxuICAvKipcbiAgICogUmVjb3JkcyBhIHN1Y2Nlc3NmdWwgcmVxdWVzdCBhbmQgcmVzZXRzIHRoZSB0aW1lb3V0IGJhY2tvZmYuXG4gICAqL1xuICBwcml2YXRlIG9uUmVxdWVzdFN1Y2Nlc3MoKTogdm9pZCB7XG4gICAgdGhpcy5fY3VycmVudFRpbWVvdXRNcyA9IElOSVRJQUxfVElNRU9VVF9NUztcbiAgfVxuXG4gIC8qKlxuICAgKiBSZWNvcmRzIGEgZmFpbGVkIHJlcXVlc3QgYW5kIGluY3JlYXNlcyB0aGUgdGltZW91dCB2aWEgZXhwb25lbnRpYWwgYmFja29mZi5cbiAgICovXG4gIHByaXZhdGUgb25SZXF1ZXN0RmFpbHVyZSgpOiB2b2lkIHtcbiAgICB0aGlzLl9jdXJyZW50VGltZW91dE1zID0gTWF0aC5taW4odGhpcy5fY3VycmVudFRpbWVvdXRNcyAqIDIsIE1BWF9USU1FT1VUX01TKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBEZWZhdWx0IEhUVFAgY2xpZW50IGltcGxlbWVudGF0aW9uIHVzaW5nIGZldGNoICsgSlNPTiBwYXlsb2Fkcy5cbiAgICpcbiAgICogRWFjaCBmZXRjaCBjYWxsIGluY2x1ZGVzIGFuIEFib3J0U2lnbmFsLnRpbWVvdXQgdGhhdCBzdGFydHMgYXQgMyBzZWNvbmRzXG4gICAqIGFuZCBkb3VibGVzIG9uIGNvbnNlY3V0aXZlIGZhaWx1cmVzIHVwIHRvIDEwIHNlY29uZHMuXG4gICAqL1xuICBwcml2YXRlIGRlZmF1bHRIdHRwQ2xpZW50OiBIdHRwQ2xpZW50ID0ge1xuICAgIGdldDogYXN5bmMgPFQ+KHVybDogc3RyaW5nLCBvcHRpb25zPzogUmVxdWVzdEluaXQpOiBQcm9taXNlPFQ+ID0+IHtcbiAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZmV0Y2godXJsLCB7XG4gICAgICAgIC4uLm9wdGlvbnMsXG4gICAgICAgIGhlYWRlcnM6IHsgLi4udGhpcy5nZXRIZWFkZXJzKCksIC4uLm9wdGlvbnM/LmhlYWRlcnMgfSxcbiAgICAgICAgc2lnbmFsOiB0aGlzLmdldFRpbWVvdXRTaWduYWwob3B0aW9ucz8uc2lnbmFsKVxuICAgICAgfSk7XG4gICAgICBpZiAoIXJlc3BvbnNlLm9rKSB0aHJvdyByZXNwb25zZTtcbiAgICAgIHJldHVybiByZXNwb25zZS5qc29uKCkgYXMgUHJvbWlzZTxUPjtcbiAgICB9LFxuICAgIHBvc3Q6IGFzeW5jIDxUPih1cmw6IHN0cmluZywgYm9keTogdW5rbm93biwgb3B0aW9ucz86IFJlcXVlc3RJbml0KTogUHJvbWlzZTxUPiA9PiB7XG4gICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGZldGNoKHVybCwge1xuICAgICAgICAuLi5vcHRpb25zLFxuICAgICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgICAgaGVhZGVyczogeyAuLi50aGlzLmdldEhlYWRlcnMoKSwgLi4ub3B0aW9ucz8uaGVhZGVycyB9LFxuICAgICAgICBib2R5OiBib2R5ID8gSlNPTi5zdHJpbmdpZnkoYm9keSkgOiB1bmRlZmluZWQsXG4gICAgICAgIHNpZ25hbDogdGhpcy5nZXRUaW1lb3V0U2lnbmFsKG9wdGlvbnM/LnNpZ25hbClcbiAgICAgIH0pO1xuICAgICAgaWYgKCFyZXNwb25zZS5vaykgdGhyb3cgcmVzcG9uc2U7XG4gICAgICByZXR1cm4gcmVzcG9uc2UuanNvbigpIGFzIFByb21pc2U8VD47XG4gICAgfSxcbiAgICBwdXQ6IGFzeW5jIDxUPih1cmw6IHN0cmluZywgYm9keTogdW5rbm93biwgb3B0aW9ucz86IFJlcXVlc3RJbml0KTogUHJvbWlzZTxUPiA9PiB7XG4gICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGZldGNoKHVybCwge1xuICAgICAgICAuLi5vcHRpb25zLFxuICAgICAgICBtZXRob2Q6ICdQVVQnLFxuICAgICAgICBoZWFkZXJzOiB7IC4uLnRoaXMuZ2V0SGVhZGVycygpLCAuLi5vcHRpb25zPy5oZWFkZXJzIH0sXG4gICAgICAgIGJvZHk6IGJvZHkgPyBKU09OLnN0cmluZ2lmeShib2R5KSA6IHVuZGVmaW5lZCxcbiAgICAgICAgc2lnbmFsOiB0aGlzLmdldFRpbWVvdXRTaWduYWwob3B0aW9ucz8uc2lnbmFsKVxuICAgICAgfSk7XG4gICAgICBpZiAoIXJlc3BvbnNlLm9rKSB0aHJvdyByZXNwb25zZTtcbiAgICAgIHJldHVybiByZXNwb25zZS5qc29uKCkgYXMgUHJvbWlzZTxUPjtcbiAgICB9LFxuICAgIHBhdGNoOiBhc3luYyA8VD4odXJsOiBzdHJpbmcsIGJvZHk6IHVua25vd24sIG9wdGlvbnM/OiBSZXF1ZXN0SW5pdCk6IFByb21pc2U8VD4gPT4ge1xuICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBmZXRjaCh1cmwsIHtcbiAgICAgICAgLi4ub3B0aW9ucyxcbiAgICAgICAgbWV0aG9kOiAnUEFUQ0gnLFxuICAgICAgICBoZWFkZXJzOiB7IC4uLnRoaXMuZ2V0SGVhZGVycygpLCAuLi5vcHRpb25zPy5oZWFkZXJzIH0sXG4gICAgICAgIGJvZHk6IGJvZHkgPyBKU09OLnN0cmluZ2lmeShib2R5KSA6IHVuZGVmaW5lZCxcbiAgICAgICAgc2lnbmFsOiB0aGlzLmdldFRpbWVvdXRTaWduYWwob3B0aW9ucz8uc2lnbmFsKVxuICAgICAgfSk7XG4gICAgICBpZiAoIXJlc3BvbnNlLm9rKSB0aHJvdyByZXNwb25zZTtcbiAgICAgIHJldHVybiByZXNwb25zZS5qc29uKCkgYXMgUHJvbWlzZTxUPjtcbiAgICB9LFxuICAgIGRlbGV0ZTogYXN5bmMgKHVybDogc3RyaW5nLCBvcHRpb25zPzogUmVxdWVzdEluaXQpOiBQcm9taXNlPHZvaWQ+ID0+IHtcbiAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZmV0Y2godXJsLCB7XG4gICAgICAgIC4uLm9wdGlvbnMsXG4gICAgICAgIG1ldGhvZDogJ0RFTEVURScsXG4gICAgICAgIGhlYWRlcnM6IHsgLi4udGhpcy5nZXRIZWFkZXJzKCksIC4uLm9wdGlvbnM/LmhlYWRlcnMgfSxcbiAgICAgICAgc2lnbmFsOiB0aGlzLmdldFRpbWVvdXRTaWduYWwob3B0aW9ucz8uc2lnbmFsKVxuICAgICAgfSk7XG4gICAgICBpZiAoIXJlc3BvbnNlLm9rKSB0aHJvdyByZXNwb25zZTtcbiAgICB9XG4gIH07XG5cbiAgLyoqXG4gICAqIEdldHMgSFRUUCBoZWFkZXJzIGZvciBKU09OIEFQSSByZXF1ZXN0cy5cbiAgICpcbiAgICogQHJldHVybnMgSGVhZGVycyB3aXRoIEpTT04gY29udGVudCB0eXBlIGFuZCBvcHRpb25hbCBiZWFyZXIgdG9rZW4uXG4gICAqL1xuICBwcml2YXRlIGdldEhlYWRlcnMoKTogSGVhZGVyc0luaXQge1xuICAgIGNvbnN0IGhlYWRlcnM6IEhlYWRlcnNJbml0ID0geyAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nIH07XG4gICAgaWYgKHRoaXMub3B0aW9ucy5hY2Nlc3NUb2tlbikge1xuICAgICAgaGVhZGVyc1snQXV0aG9yaXphdGlvbiddID0gYEJlYXJlciAke3RoaXMub3B0aW9ucy5hY2Nlc3NUb2tlbn1gO1xuICAgIH1cbiAgICByZXR1cm4gaGVhZGVycztcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXRzIHRoZSBIVFRQIGNsaWVudCB0byB1c2UgZm9yIHJlcXVlc3RzLlxuICAgKlxuICAgKiBAcmV0dXJucyBJbmplY3RlZCBIVFRQIGNsaWVudCB3aGVuIHByb3ZpZGVkLCBvdGhlcndpc2UgdGhlIGRlZmF1bHQgZmV0Y2gtYmFzZWQgY2xpZW50LlxuICAgKi9cbiAgcHJpdmF0ZSBnZXRIdHRwQ2xpZW50KCk6IEh0dHBDbGllbnQge1xuICAgIHJldHVybiB0aGlzLl9odHRwQ2xpZW50ID8/IHRoaXMuZGVmYXVsdEh0dHBDbGllbnQ7XG4gIH1cblxuICAvKipcbiAgICogQnVpbGRzIGEgVVJMIHJlbGF0aXZlIHRvIHRoZSBjb25maWd1cmVkIGJhc2UgVVJMLlxuICAgKlxuICAgKiBVbmRlZmluZWQgYW5kIG51bGwgcXVlcnkgcGFyYW1zIGFyZSBvbWl0dGVkLiBWYWx1ZXMgYXJlIHN0cmluZ2lmaWVkLlxuICAgKlxuICAgKiBAcGFyYW0gcGF0aCAtIFJlbGF0aXZlIEFQSSBwYXRoIHRvIGFwcGVuZCB0byB0aGUgY29uZmlndXJlZCBiYXNlIFVSTC5cbiAgICogQHBhcmFtIHBhcmFtcyAtIE9wdGlvbmFsIHF1ZXJ5IHBhcmFtZXRlcnMgdG8gZW5jb2RlIG9udG8gdGhlIFVSTC5cbiAgICogQHJldHVybnMgRnVsbHktcXVhbGlmaWVkIHJlcXVlc3QgVVJMIHN0cmluZy5cbiAgICovXG4gIHByaXZhdGUgYnVpbGRVcmwocGF0aDogc3RyaW5nLCBwYXJhbXM/OiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPik6IHN0cmluZyB7XG4gICAgY29uc3QgdXJsID0gbmV3IFVSTChwYXRoLCB0aGlzLm9wdGlvbnMuYmFzZVVybCk7XG4gICAgaWYgKHBhcmFtcykge1xuICAgICAgZm9yIChjb25zdCBba2V5LCB2YWx1ZV0gb2YgT2JqZWN0LmVudHJpZXMocGFyYW1zKSkge1xuICAgICAgICBpZiAodmFsdWUgIT09IHVuZGVmaW5lZCAmJiB2YWx1ZSAhPT0gbnVsbCkge1xuICAgICAgICAgIHVybC5zZWFyY2hQYXJhbXMuc2V0KGtleSwgU3RyaW5nKHZhbHVlKSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHVybC50b1N0cmluZygpO1xuICB9XG5cbiAgLyoqXG4gICAqIFdyYXBzIGEgcmVxdWVzdCB3aXRoIGNvbnNpc3RlbnQgZXJyb3IgaGFuZGxpbmcuXG4gICAqXG4gICAqIEBwYXJhbSBmbiAtIEFzeW5jIHJlcXVlc3QgZnVuY3Rpb24gdG8gZXhlY3V0ZS5cbiAgICogQHJldHVybnMgVGhlIHJlc29sdmVkIHZhbHVlIGZyb20gdGhlIHJlcXVlc3QgZnVuY3Rpb24uXG4gICAqIEB0aHJvd3MgQXBpRXJyb3Igd2hlbiB0aGUgc2VydmVyIHJlc3BvbmRzIHdpdGggYSBub24tMnh4IHN0YXR1cy5cbiAgICogQHRocm93cyBOZXR3b3JrRXJyb3IgZm9yIG5ldHdvcmsgZmFpbHVyZXMgb3IgdW5leHBlY3RlZCBleGNlcHRpb25zLlxuICAgKi9cbiAgcHJpdmF0ZSBhc3luYyByZXF1ZXN0PFQ+KGZuOiAoKSA9PiBQcm9taXNlPFQ+KTogUHJvbWlzZTxUPiB7XG4gICAgbGV0IGxhc3RUaW1lb3V0RXJyb3I6IE5ldHdvcmtFcnJvciB8IHVuZGVmaW5lZDtcblxuICAgIGZvciAobGV0IGF0dGVtcHQgPSAwOyBhdHRlbXB0IDw9IE1BWF9USU1FT1VUX1JFVFJJRVM7IGF0dGVtcHQrKykge1xuICAgICAgdHJ5IHtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgZm4oKTtcbiAgICAgICAgdGhpcy5vblJlcXVlc3RTdWNjZXNzKCk7XG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICBpZiAoZXJyb3IgaW5zdGFuY2VvZiBSZXNwb25zZSkge1xuICAgICAgICAgIC8vIFNlcnZlciByZXNwb25kZWQgKGV2ZW4gd2l0aCBhbiBlcnJvciBzdGF0dXMpIC0gY29ubmVjdGlvbiBpcyBhbGl2ZSwgcmVzZXQgYmFja29mZlxuICAgICAgICAgIHRoaXMub25SZXF1ZXN0U3VjY2VzcygpO1xuICAgICAgICAgIGxldCBib2R5OiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPiA9IHt9O1xuICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICBib2R5ID0gYXdhaXQgZXJyb3IuanNvbigpO1xuICAgICAgICAgIH0gY2F0Y2ggKHBhcnNlRXJyb3IpIHtcbiAgICAgICAgICAgIC8vIFN5bnRheEVycm9yIGlzIGV4cGVjdGVkIHdoZW4gc2VydmVyIHJldHVybnMgbm9uLUpTT04gZXJyb3IgcmVzcG9uc2UgKGUuZy4sIEhUTUwgZXJyb3IgcGFnZSlcbiAgICAgICAgICAgIGlmICghKHBhcnNlRXJyb3IgaW5zdGFuY2VvZiBTeW50YXhFcnJvcikpIHtcbiAgICAgICAgICAgICAgY29uc29sZS53YXJuKCdbQ2FyZHNDbGllbnRdIFVuZXhwZWN0ZWQgZXJyb3IgcGFyc2luZyBlcnJvciByZXNwb25zZTonLCBwYXJzZUVycm9yKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgY29uc3QgbWVzc2FnZSA9XG4gICAgICAgICAgICAoYm9keVsnZXJyb3InXSBhcyBzdHJpbmcgfCB1bmRlZmluZWQpIHx8IChib2R5WydtZXNzYWdlJ10gYXMgc3RyaW5nIHwgdW5kZWZpbmVkKSB8fCBlcnJvci5zdGF0dXNUZXh0O1xuICAgICAgICAgIGNvbnN0IGNvZGUgPSAoYm9keVsnY29kZSddIGFzIHN0cmluZyB8IHVuZGVmaW5lZCkgfHwgU3RyaW5nKGVycm9yLnN0YXR1cyk7XG4gICAgICAgICAgY29uc3QgZmllbGRzID0gYm9keVsnZmllbGRzJ10gYXMgQXJyYXk8eyBmaWVsZDogc3RyaW5nOyBtZXNzYWdlOiBzdHJpbmcgfT4gfCB1bmRlZmluZWQ7XG4gICAgICAgICAgdGhyb3cgbmV3IEFwaUVycm9yKG1lc3NhZ2UsIGNvZGUsIGZpZWxkcyk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBOZXR3b3JrIG9yIHRpbWVvdXQgZmFpbHVyZSAtIGluY3JlYXNlIGJhY2tvZmYgZm9yIG5leHQgYXR0ZW1wdFxuICAgICAgICB0aGlzLm9uUmVxdWVzdEZhaWx1cmUoKTtcblxuICAgICAgICBpZiAoZXJyb3IgaW5zdGFuY2VvZiBET01FeGNlcHRpb24gJiYgZXJyb3IubmFtZSA9PT0gJ1RpbWVvdXRFcnJvcicpIHtcbiAgICAgICAgICBsYXN0VGltZW91dEVycm9yID0gbmV3IE5ldHdvcmtFcnJvcignUmVxdWVzdCB0aW1lZCBvdXQnLCBlcnJvcik7XG4gICAgICAgICAgLy8gUmV0cnkgb24gdGltZW91dCAtIG9uUmVxdWVzdEZhaWx1cmUoKSBhbHJlYWR5IGluY3JlYXNlZCBfY3VycmVudFRpbWVvdXRNc1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gTm9uLXRpbWVvdXQgbmV0d29yayBlcnJvcnMgKEROUyBmYWlsdXJlLCBjb25uZWN0aW9uIHJlZnVzZWQpIGFyZSBub3QgcmV0cmllZFxuICAgICAgICB0aHJvdyBuZXcgTmV0d29ya0Vycm9yKCdSZXF1ZXN0IGZhaWxlZCcsIGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvciA6IHVuZGVmaW5lZCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gQWxsIHJldHJ5IGF0dGVtcHRzIGV4aGF1c3RlZFxuICAgIHRocm93IGxhc3RUaW1lb3V0RXJyb3IhO1xuICB9XG5cbiAgLy8gLS0tIENhcmQgT3BlcmF0aW9ucyAtLS1cblxuICAvKipcbiAgICogTGlzdHMgY2FyZHMgd2l0aCBvcHRpb25hbCBmaWx0ZXJpbmcuXG4gICAqXG4gICAqIEBwYXJhbSBvcHRpb25zIC0gT3B0aW9uYWwgZmlsdGVyIGFuZCBwYWdpbmF0aW9uIG9wdGlvbnMuXG4gICAqIEByZXR1cm5zIFByb21pc2UgcmVzb2x2aW5nIHRvIG1hdGNoaW5nIGNhcmRzLlxuICAgKiBAdGhyb3dzIEFwaUVycm9yIHdoZW4gdGhlIHNlcnZlciByZXNwb25kcyB3aXRoIGFuIGVycm9yLlxuICAgKiBAdGhyb3dzIE5ldHdvcmtFcnJvciB3aGVuIHRoZSByZXF1ZXN0IGZhaWxzIHRvIHJlYWNoIHRoZSBzZXJ2ZXIuXG4gICAqL1xuICBhc3luYyBsaXN0Q2FyZHMob3B0aW9ucz86IExpc3RDYXJkc09wdGlvbnMpOiBQcm9taXNlPENhcmRbXT4ge1xuICAgIGNvbnN0IHVybFN0ciA9IHRoaXMuYnVpbGRVcmwoJy9jYXJkcycsIHtcbiAgICAgIHdvcmtzcGFjZVBhdGg6IHRoaXMub3B0aW9ucy53b3Jrc3BhY2VQYXRoLFxuICAgICAgc3RhdHVzOiBvcHRpb25zPy5zdGF0dXMsXG4gICAgICBzZWFyY2g6IG9wdGlvbnM/LnNlYXJjaCxcbiAgICAgIGxpbWl0OiBvcHRpb25zPy5saW1pdCxcbiAgICAgIG9mZnNldDogb3B0aW9ucz8ub2Zmc2V0XG4gICAgfSk7XG4gICAgY29uc3QgdXJsID0gbmV3IFVSTCh1cmxTdHIpO1xuICAgIGZvciAoY29uc3QgdCBvZiBvcHRpb25zPy50YWdzID8/IFtdKSB7XG4gICAgICB1cmwuc2VhcmNoUGFyYW1zLmFwcGVuZCgndGFnJywgdCk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLnJlcXVlc3QoKCkgPT4gdGhpcy5nZXRIdHRwQ2xpZW50KCkuZ2V0PENhcmRbXT4odXJsLnRvU3RyaW5nKCkpKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBMaXN0cyBjYXJkcyBhcyBsaWdodHdlaWdodCBzdW1tYXJpZXMgZm9yIGxpc3Qgdmlld3MuXG4gICAqXG4gICAqIFJldHVybnMgcHJlLWZsYXR0ZW5lZCBmaWVsZHMgc3VpdGFibGUgZm9yIGRpcmVjdCB1c2UgaW4gbGlzdCByZW5kZXJpbmcsXG4gICAqIG9taXR0aW5nIGhlYXZ5d2VpZ2h0IGZpZWxkcyBsaWtlIGBwbGFuQ29udGVudGAgYW5kIGByZXBvc2l0b3J5UGF0aGAuXG4gICAqXG4gICAqIEB0ZW1wbGF0ZSBUIC0gVGhlIGV4cGVjdGVkIHN1bW1hcnkgc2hhcGUgKGRlZmF1bHQgYFJlY29yZDxzdHJpbmcsIHVua25vd24+YCkuXG4gICAqIEByZXR1cm5zIFByb21pc2UgcmVzb2x2aW5nIHRvIGNhcmQgc3VtbWFyaWVzLlxuICAgKiBAdGhyb3dzIEFwaUVycm9yIHdoZW4gdGhlIHNlcnZlciByZXNwb25kcyB3aXRoIGFuIGVycm9yLlxuICAgKiBAdGhyb3dzIE5ldHdvcmtFcnJvciB3aGVuIHRoZSByZXF1ZXN0IGZhaWxzIHRvIHJlYWNoIHRoZSBzZXJ2ZXIuXG4gICAqL1xuICBhc3luYyBsaXN0Q2FyZFN1bW1hcmllczxUID0gUmVjb3JkPHN0cmluZywgdW5rbm93bj4+KCk6IFByb21pc2U8VFtdPiB7XG4gICAgY29uc3QgdXJsID0gdGhpcy5idWlsZFVybCgnL2NhcmRzL2xpc3QnLCB7XG4gICAgICB3b3Jrc3BhY2VQYXRoOiB0aGlzLm9wdGlvbnMud29ya3NwYWNlUGF0aFxuICAgIH0pO1xuICAgIHJldHVybiB0aGlzLnJlcXVlc3QoKCkgPT4gdGhpcy5nZXRIdHRwQ2xpZW50KCkuZ2V0PFRbXT4odXJsKSk7XG4gIH1cblxuICAvKipcbiAgICogR2V0cyBhIHNpbmdsZSBjYXJkIGJ5IGlkLlxuICAgKlxuICAgKiBAcGFyYW0gY2FyZElkIC0gVGhlIGlkIG9mIHRoZSBjYXJkIHRvIHJldHJpZXZlLlxuICAgKiBAcmV0dXJucyBQcm9taXNlIHJlc29sdmluZyB0byB0aGUgY2FyZC5cbiAgICogQHRocm93cyBBcGlFcnJvciB3aGVuIHRoZSBzZXJ2ZXIgcmVzcG9uZHMgd2l0aCBhbiBlcnJvci5cbiAgICogQHRocm93cyBOZXR3b3JrRXJyb3Igd2hlbiB0aGUgcmVxdWVzdCBmYWlscyB0byByZWFjaCB0aGUgc2VydmVyLlxuICAgKi9cbiAgYXN5bmMgZ2V0Q2FyZChjYXJkSWQ6IHN0cmluZyk6IFByb21pc2U8Q2FyZD4ge1xuICAgIGNvbnN0IHVybCA9IHRoaXMuYnVpbGRVcmwoYC9jYXJkcy8ke2NhcmRJZH1gLCB7XG4gICAgICB3b3Jrc3BhY2VQYXRoOiB0aGlzLm9wdGlvbnMud29ya3NwYWNlUGF0aFxuICAgIH0pO1xuICAgIHJldHVybiB0aGlzLnJlcXVlc3QoKCkgPT4gdGhpcy5nZXRIdHRwQ2xpZW50KCkuZ2V0PENhcmQ+KHVybCkpO1xuICB9XG5cbiAgLyoqXG4gICAqIENyZWF0ZXMgYSBuZXcgY2FyZC5cbiAgICpcbiAgICogQHBhcmFtIGRhdGEgLSBDYXJkIGNyZWF0aW9uIHBheWxvYWQuXG4gICAqIEByZXR1cm5zIFByb21pc2UgcmVzb2x2aW5nIHRvIHRoZSBjcmVhdGVkIGNhcmQuXG4gICAqIEB0aHJvd3MgQXBpRXJyb3Igd2hlbiB0aGUgc2VydmVyIHJlamVjdHMgdGhlIHBheWxvYWQuXG4gICAqIEB0aHJvd3MgTmV0d29ya0Vycm9yIHdoZW4gdGhlIHJlcXVlc3QgZmFpbHMgdG8gcmVhY2ggdGhlIHNlcnZlci5cbiAgICovXG4gIGFzeW5jIGNyZWF0ZUNhcmQoZGF0YTogQ2FyZENyZWF0ZURhdGEpOiBQcm9taXNlPENhcmQ+IHtcbiAgICBjb25zdCB1cmwgPSB0aGlzLmJ1aWxkVXJsKCcvY2FyZHMnKTtcbiAgICBjb25zdCBib2R5ID0ge1xuICAgICAgLi4uZGF0YSxcbiAgICAgIHdvcmtzcGFjZVBhdGg6IHRoaXMub3B0aW9ucy53b3Jrc3BhY2VQYXRoXG4gICAgfTtcbiAgICByZXR1cm4gdGhpcy5yZXF1ZXN0KCgpID0+IHRoaXMuZ2V0SHR0cENsaWVudCgpLnBvc3Q8Q2FyZD4odXJsLCBib2R5KSk7XG4gIH1cblxuICAvKipcbiAgICogVXBkYXRlcyBhbiBleGlzdGluZyBjYXJkLlxuICAgKlxuICAgKiBAcGFyYW0gY2FyZElkIC0gVGhlIGlkIG9mIHRoZSBjYXJkIHRvIHVwZGF0ZS5cbiAgICogQHBhcmFtIGRhdGEgLSBUaGUgZmllbGRzIHRvIHVwZGF0ZS5cbiAgICogQHJldHVybnMgUHJvbWlzZSByZXNvbHZpbmcgdG8gdGhlIHVwZGF0ZWQgY2FyZC5cbiAgICogQHRocm93cyBBcGlFcnJvciB3aGVuIHRoZSBzZXJ2ZXIgcmVqZWN0cyB0aGUgdXBkYXRlLlxuICAgKiBAdGhyb3dzIE5ldHdvcmtFcnJvciB3aGVuIHRoZSByZXF1ZXN0IGZhaWxzIHRvIHJlYWNoIHRoZSBzZXJ2ZXIuXG4gICAqIEBkZXByZWNhdGVkIFVzZSBkaXJlY3QgZ2l0IG9wZXJhdGlvbnMgaW5zdGVhZC4gVGhpcyBlbmRwb2ludCB3aWxsIGJlIHJlbW92ZWQuXG4gICAqL1xuICBhc3luYyB1cGRhdGVDYXJkKGNhcmRJZDogc3RyaW5nLCBkYXRhOiBDYXJkVXBkYXRlRGF0YSk6IFByb21pc2U8Q2FyZD4ge1xuICAgIGNvbnN0IHVybCA9IHRoaXMuYnVpbGRVcmwoYC9jYXJkcy8ke2NhcmRJZH1gKTtcbiAgICByZXR1cm4gdGhpcy5yZXF1ZXN0KCgpID0+IHRoaXMuZ2V0SHR0cENsaWVudCgpLnBhdGNoPENhcmQ+KHVybCwgZGF0YSkpO1xuICB9XG5cbiAgLyoqXG4gICAqIERlbGV0ZXMgYSBjYXJkLlxuICAgKlxuICAgKiBAcGFyYW0gY2FyZElkIC0gVGhlIGlkIG9mIHRoZSBjYXJkIHRvIGRlbGV0ZS5cbiAgICogQHJldHVybnMgUHJvbWlzZSByZXNvbHZpbmcgd2hlbiBkZWxldGlvbiBpcyBjb21wbGV0ZS5cbiAgICogQHRocm93cyBBcGlFcnJvciB3aGVuIHRoZSBzZXJ2ZXIgcmVqZWN0cyB0aGUgZGVsZXRlLlxuICAgKiBAdGhyb3dzIE5ldHdvcmtFcnJvciB3aGVuIHRoZSByZXF1ZXN0IGZhaWxzIHRvIHJlYWNoIHRoZSBzZXJ2ZXIuXG4gICAqIEBkZXByZWNhdGVkIFVzZSBkaXJlY3QgZ2l0IG9wZXJhdGlvbnMgaW5zdGVhZC4gVGhpcyBlbmRwb2ludCB3aWxsIGJlIHJlbW92ZWQuXG4gICAqL1xuICBhc3luYyBkZWxldGVDYXJkKGNhcmRJZDogc3RyaW5nKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc3QgdXJsID0gdGhpcy5idWlsZFVybChgL2NhcmRzLyR7Y2FyZElkfWApO1xuICAgIHJldHVybiB0aGlzLnJlcXVlc3QoKCkgPT4gdGhpcy5nZXRIdHRwQ2xpZW50KCkuZGVsZXRlKHVybCkpO1xuICB9XG5cbiAgLy8gLS0tIENvbW1lbnQgT3BlcmF0aW9ucyAtLS1cblxuICAvKipcbiAgICogR2V0cyBhbGwgY29tbWVudHMgZm9yIGEgY2FyZC5cbiAgICpcbiAgICogQHBhcmFtIGNhcmRJZCAtIElkZW50aWZpZXIgb2YgdGhlIHRhcmdldCBjYXJkIGZvciB0aGlzIHJlcXVlc3QuXG4gICAqIEByZXR1cm5zIFByb21pc2UgcmVzb2x2aW5nIHRvIHRoZSBjb21tZW50IGxpc3QuXG4gICAqIEB0aHJvd3MgQXBpRXJyb3Igd2hlbiB0aGUgc2VydmVyIHJlc3BvbmRzIHdpdGggYW4gZXJyb3IuXG4gICAqIEB0aHJvd3MgTmV0d29ya0Vycm9yIHdoZW4gdGhlIHJlcXVlc3QgZmFpbHMgdG8gcmVhY2ggdGhlIHNlcnZlci5cbiAgICovXG4gIGFzeW5jIGdldENvbW1lbnRzKGNhcmRJZDogc3RyaW5nKTogUHJvbWlzZTxDb21tZW50W10+IHtcbiAgICBjb25zdCB1cmwgPSB0aGlzLmJ1aWxkVXJsKGAvY2FyZHMvJHtjYXJkSWR9L2NvbW1lbnRzYCk7XG4gICAgcmV0dXJuIHRoaXMucmVxdWVzdCgoKSA9PiB0aGlzLmdldEh0dHBDbGllbnQoKS5nZXQ8Q29tbWVudFtdPih1cmwpKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXRzIGEgc2luZ2xlIGNvbW1lbnQgYnkgaWQuXG4gICAqXG4gICAqIEBwYXJhbSBjYXJkSWQgLSBJZGVudGlmaWVyIG9mIHRoZSBjYXJkIHRoYXQgb3ducyB0aGUgcmVxdWVzdGVkIGNvbW1lbnQuXG4gICAqIEBwYXJhbSBjb21tZW50SWQgLSBJZGVudGlmaWVyIG9mIHRoZSBjb21tZW50IHRvIHJldHJpZXZlLlxuICAgKiBAcmV0dXJucyBQcm9taXNlIHJlc29sdmluZyB0byB0aGUgY29tbWVudC5cbiAgICogQHRocm93cyBBcGlFcnJvciB3aGVuIHRoZSBzZXJ2ZXIgcmVzcG9uZHMgd2l0aCBhbiBlcnJvci5cbiAgICogQHRocm93cyBOZXR3b3JrRXJyb3Igd2hlbiB0aGUgcmVxdWVzdCBmYWlscyB0byByZWFjaCB0aGUgc2VydmVyLlxuICAgKi9cbiAgYXN5bmMgZ2V0Q29tbWVudChjYXJkSWQ6IHN0cmluZywgY29tbWVudElkOiBzdHJpbmcpOiBQcm9taXNlPENvbW1lbnQ+IHtcbiAgICBjb25zdCB1cmwgPSB0aGlzLmJ1aWxkVXJsKGAvY2FyZHMvJHtjYXJkSWR9L2NvbW1lbnRzLyR7Y29tbWVudElkfWApO1xuICAgIHJldHVybiB0aGlzLnJlcXVlc3QoKCkgPT4gdGhpcy5nZXRIdHRwQ2xpZW50KCkuZ2V0PENvbW1lbnQ+KHVybCkpO1xuICB9XG5cbiAgLyoqXG4gICAqIENyZWF0ZXMgYSBuZXcgY29tbWVudCBvbiBhIGNhcmQuXG4gICAqXG4gICAqIEBwYXJhbSBjYXJkSWQgLSBJZGVudGlmaWVyIG9mIHRoZSBjYXJkIHRoYXQgd2lsbCByZWNlaXZlIHRoZSBuZXcgY29tbWVudC5cbiAgICogQHBhcmFtIGRhdGEgLSBDb21tZW50IGNyZWF0aW9uIHBheWxvYWQuXG4gICAqIEByZXR1cm5zIFByb21pc2UgcmVzb2x2aW5nIHRvIHRoZSBjcmVhdGVkIGNvbW1lbnQuXG4gICAqIEB0aHJvd3MgQXBpRXJyb3Igd2hlbiB0aGUgc2VydmVyIHJlamVjdHMgdGhlIHBheWxvYWQuXG4gICAqIEB0aHJvd3MgTmV0d29ya0Vycm9yIHdoZW4gdGhlIHJlcXVlc3QgZmFpbHMgdG8gcmVhY2ggdGhlIHNlcnZlci5cbiAgICogQGRlcHJlY2F0ZWQgVXNlIGRpcmVjdCBnaXQgb3BlcmF0aW9ucyBpbnN0ZWFkLiBUaGlzIGVuZHBvaW50IHdpbGwgYmUgcmVtb3ZlZC5cbiAgICovXG4gIGFzeW5jIGNyZWF0ZUNvbW1lbnQoY2FyZElkOiBzdHJpbmcsIGRhdGE6IENvbW1lbnRDcmVhdGVEYXRhKTogUHJvbWlzZTxDb21tZW50PiB7XG4gICAgY29uc3QgdXJsID0gdGhpcy5idWlsZFVybChgL2NhcmRzLyR7Y2FyZElkfS9jb21tZW50c2ApO1xuICAgIHJldHVybiB0aGlzLnJlcXVlc3QoKCkgPT4gdGhpcy5nZXRIdHRwQ2xpZW50KCkucG9zdDxDb21tZW50Pih1cmwsIGRhdGEpKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBVcGRhdGVzIGFuIGV4aXN0aW5nIGNvbW1lbnQuXG4gICAqXG4gICAqIEBwYXJhbSBjYXJkSWQgLSBJZGVudGlmaWVyIG9mIHRoZSBjYXJkIHRoYXQgb3ducyB0aGUgY29tbWVudC5cbiAgICogQHBhcmFtIGNvbW1lbnRJZCAtIElkZW50aWZpZXIgb2YgdGhlIGNvbW1lbnQgdG8gdXBkYXRlLlxuICAgKiBAcGFyYW0gZGF0YSAtIENvbW1lbnQgdXBkYXRlIHBheWxvYWQuXG4gICAqIEByZXR1cm5zIFByb21pc2UgcmVzb2x2aW5nIHRvIHRoZSB1cGRhdGVkIGNvbW1lbnQuXG4gICAqIEB0aHJvd3MgQXBpRXJyb3Igd2hlbiB0aGUgc2VydmVyIHJlamVjdHMgdGhlIHVwZGF0ZS5cbiAgICogQHRocm93cyBOZXR3b3JrRXJyb3Igd2hlbiB0aGUgcmVxdWVzdCBmYWlscyB0byByZWFjaCB0aGUgc2VydmVyLlxuICAgKiBAZGVwcmVjYXRlZCBVc2UgZGlyZWN0IGdpdCBvcGVyYXRpb25zIGluc3RlYWQuIFRoaXMgZW5kcG9pbnQgd2lsbCBiZSByZW1vdmVkLlxuICAgKi9cbiAgYXN5bmMgdXBkYXRlQ29tbWVudChjYXJkSWQ6IHN0cmluZywgY29tbWVudElkOiBzdHJpbmcsIGRhdGE6IENvbW1lbnRVcGRhdGVEYXRhKTogUHJvbWlzZTxDb21tZW50PiB7XG4gICAgY29uc3QgdXJsID0gdGhpcy5idWlsZFVybChgL2NhcmRzLyR7Y2FyZElkfS9jb21tZW50cy8ke2NvbW1lbnRJZH1gKTtcbiAgICByZXR1cm4gdGhpcy5yZXF1ZXN0KCgpID0+IHRoaXMuZ2V0SHR0cENsaWVudCgpLnBhdGNoPENvbW1lbnQ+KHVybCwgZGF0YSkpO1xuICB9XG5cbiAgLyoqXG4gICAqIERlbGV0ZXMgYSBjb21tZW50LlxuICAgKlxuICAgKiBAcGFyYW0gY2FyZElkIC0gSWRlbnRpZmllciBvZiB0aGUgY2FyZCB0aGF0IG93bnMgdGhlIGNvbW1lbnQuXG4gICAqIEBwYXJhbSBjb21tZW50SWQgLSBJZGVudGlmaWVyIG9mIHRoZSBjb21tZW50IHRvIHJlbW92ZS5cbiAgICogQHJldHVybnMgUHJvbWlzZSByZXNvbHZpbmcgd2hlbiBkZWxldGlvbiBpcyBjb21wbGV0ZS5cbiAgICogQHRocm93cyBBcGlFcnJvciB3aGVuIHRoZSBzZXJ2ZXIgcmVqZWN0cyB0aGUgZGVsZXRlLlxuICAgKiBAdGhyb3dzIE5ldHdvcmtFcnJvciB3aGVuIHRoZSByZXF1ZXN0IGZhaWxzIHRvIHJlYWNoIHRoZSBzZXJ2ZXIuXG4gICAqIEBkZXByZWNhdGVkIFVzZSBkaXJlY3QgZ2l0IG9wZXJhdGlvbnMgaW5zdGVhZC4gVGhpcyBlbmRwb2ludCB3aWxsIGJlIHJlbW92ZWQuXG4gICAqL1xuICBhc3luYyBkZWxldGVDb21tZW50KGNhcmRJZDogc3RyaW5nLCBjb21tZW50SWQ6IHN0cmluZyk6IFByb21pc2U8dm9pZD4ge1xuICAgIGNvbnN0IHVybCA9IHRoaXMuYnVpbGRVcmwoYC9jYXJkcy8ke2NhcmRJZH0vY29tbWVudHMvJHtjb21tZW50SWR9YCk7XG4gICAgcmV0dXJuIHRoaXMucmVxdWVzdCgoKSA9PiB0aGlzLmdldEh0dHBDbGllbnQoKS5kZWxldGUodXJsKSk7XG4gIH1cblxuICAvLyAtLS0gQXR0YWNobWVudCBPcGVyYXRpb25zIC0tLVxuXG4gIC8qKlxuICAgKiBVcGxvYWRzIGFuIGF0dGFjaG1lbnQgdG8gYSBjYXJkIHVzaW5nIGJpbmFyeSBQVVQuXG4gICAqXG4gICAqIFRoaXMgaXMgdGhlIHByZWZlcnJlZCBtZXRob2QgLSBzZW5kcyByYXcgYmluYXJ5IGRhdGEgZGlyZWN0bHkgd2l0aG91dFxuICAgKiBiYXNlNjQgZW5jb2RpbmcsIHJlc3VsdGluZyBpbiAzMyUgc21hbGxlciBwYXlsb2Fkcy5cbiAgICpcbiAgICogQHBhcmFtIGNhcmRJZCAtIElkZW50aWZpZXIgb2YgdGhlIGNhcmQgdGhhdCB3aWxsIHJlY2VpdmUgdGhlIGF0dGFjaG1lbnQuXG4gICAqIEBwYXJhbSBuYW1lIC0gRmlsZSBuYW1lIGluY2x1ZGluZyBleHRlbnNpb24uXG4gICAqIEBwYXJhbSBkYXRhIC0gQmluYXJ5IGRhdGEgYXMgQmxvYiwgQXJyYXlCdWZmZXIsIG9yIGJhc2U2NCBzdHJpbmcuXG4gICAqIEByZXR1cm5zIFByb21pc2UgcmVzb2x2aW5nIHRvIGF0dGFjaG1lbnQgbWV0YWRhdGEuXG4gICAqIEB0aHJvd3MgQXBpRXJyb3Igd2hlbiB0aGUgc2VydmVyIHJlamVjdHMgdGhlIHVwbG9hZC5cbiAgICogQHRocm93cyBOZXR3b3JrRXJyb3Igd2hlbiB0aGUgcmVxdWVzdCBmYWlscyB0byByZWFjaCB0aGUgc2VydmVyLlxuICAgKi9cbiAgYXN5bmMgdXBsb2FkQXR0YWNobWVudChjYXJkSWQ6IHN0cmluZywgbmFtZTogc3RyaW5nLCBkYXRhOiBCbG9iIHwgQXJyYXlCdWZmZXIgfCBzdHJpbmcpOiBQcm9taXNlPEF0dGFjaG1lbnRSZXNwb25zZT4ge1xuICAgIGNvbnN0IHVybCA9IHRoaXMuYnVpbGRVcmwoYC9jYXJkcy8ke2NhcmRJZH0vYXR0YWNobWVudHMvJHtlbmNvZGVVUklDb21wb25lbnQobmFtZSl9YCk7XG5cbiAgICAvLyBDb252ZXJ0IGRhdGEgdG8gQmxvYiBmb3IgZmV0Y2ggYm9keVxuICAgIGxldCBib2R5OiBCbG9iO1xuICAgIGlmIChkYXRhIGluc3RhbmNlb2YgQmxvYikge1xuICAgICAgYm9keSA9IGRhdGE7XG4gICAgfSBlbHNlIGlmIChkYXRhIGluc3RhbmNlb2YgQXJyYXlCdWZmZXIpIHtcbiAgICAgIGJvZHkgPSBuZXcgQmxvYihbZGF0YV0pO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBiYXNlNjQgc3RyaW5nIC0gZGVjb2RlIHRvIGJpbmFyeVxuICAgICAgY29uc3QgYmluYXJ5U3RyaW5nID0gYXRvYihkYXRhKTtcbiAgICAgIGNvbnN0IGJ5dGVzID0gbmV3IFVpbnQ4QXJyYXkoYmluYXJ5U3RyaW5nLmxlbmd0aCk7XG4gICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGJpbmFyeVN0cmluZy5sZW5ndGg7IGkrKykge1xuICAgICAgICBieXRlc1tpXSA9IGJpbmFyeVN0cmluZy5jaGFyQ29kZUF0KGkpO1xuICAgICAgfVxuICAgICAgYm9keSA9IG5ldyBCbG9iKFtieXRlc10pO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzLnJlcXVlc3QoYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBmZXRjaCh1cmwsIHtcbiAgICAgICAgbWV0aG9kOiAnUFVUJyxcbiAgICAgICAgaGVhZGVyczoge1xuICAgICAgICAgIC4uLnRoaXMuZ2V0SGVhZGVycygpLFxuICAgICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vb2N0ZXQtc3RyZWFtJ1xuICAgICAgICB9LFxuICAgICAgICBib2R5LFxuICAgICAgICBzaWduYWw6IHRoaXMuZ2V0VGltZW91dFNpZ25hbCgpXG4gICAgICB9KTtcbiAgICAgIGlmICghcmVzcG9uc2Uub2spIHRocm93IHJlc3BvbnNlO1xuICAgICAgcmV0dXJuIHJlc3BvbnNlLmpzb24oKSBhcyBQcm9taXNlPEF0dGFjaG1lbnRSZXNwb25zZT47XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogRG93bmxvYWRzIGFuIGF0dGFjaG1lbnQgYXMgYSBCbG9iLlxuICAgKlxuICAgKiBUaGlzIG1ldGhvZCB1c2VzIGBmZXRjaGAgZGlyZWN0bHkgc28gYmluYXJ5IGRhdGEgaXMgcHJlc2VydmVkLlxuICAgKlxuICAgKiBAcGFyYW0gY2FyZElkIC0gSWRlbnRpZmllciBvZiB0aGUgY2FyZCB0aGF0IG93bnMgdGhlIGF0dGFjaG1lbnQuXG4gICAqIEBwYXJhbSBhdHRhY2htZW50SWQgLSBJZGVudGlmaWVyIG9mIHRoZSBhdHRhY2htZW50IGJsb2IgdG8gZG93bmxvYWQuXG4gICAqIEByZXR1cm5zIFByb21pc2UgcmVzb2x2aW5nIHRvIGFuIGF0dGFjaG1lbnQgQmxvYi5cbiAgICogQHRocm93cyBBcGlFcnJvciB3aGVuIHRoZSBzZXJ2ZXIgcmVzcG9uZHMgd2l0aCBhbiBlcnJvci5cbiAgICogQHRocm93cyBOZXR3b3JrRXJyb3Igd2hlbiB0aGUgcmVxdWVzdCBmYWlscyB0byByZWFjaCB0aGUgc2VydmVyLlxuICAgKi9cbiAgYXN5bmMgZ2V0QXR0YWNobWVudChjYXJkSWQ6IHN0cmluZywgYXR0YWNobWVudElkOiBzdHJpbmcpOiBQcm9taXNlPEJsb2I+IHtcbiAgICBjb25zdCB1cmwgPSB0aGlzLmJ1aWxkVXJsKGAvY2FyZHMvJHtjYXJkSWR9L2F0dGFjaG1lbnRzLyR7YXR0YWNobWVudElkfWApO1xuICAgIHJldHVybiB0aGlzLnJlcXVlc3QoYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBmZXRjaCh1cmwsIHtcbiAgICAgICAgaGVhZGVyczogdGhpcy5nZXRIZWFkZXJzKCksXG4gICAgICAgIHNpZ25hbDogdGhpcy5nZXRUaW1lb3V0U2lnbmFsKClcbiAgICAgIH0pO1xuICAgICAgaWYgKCFyZXNwb25zZS5vaykgdGhyb3cgcmVzcG9uc2U7XG4gICAgICByZXR1cm4gcmVzcG9uc2UuYmxvYigpO1xuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIExpc3RzIGF0dGFjaG1lbnRzIGZvciBhIGNhcmQuXG4gICAqXG4gICAqIEBwYXJhbSBjYXJkSWQgLSBJZGVudGlmaWVyIG9mIHRoZSBjYXJkIHdob3NlIGF0dGFjaG1lbnRzIHNob3VsZCBiZSBsaXN0ZWQuXG4gICAqIEByZXR1cm5zIFByb21pc2UgcmVzb2x2aW5nIHRvIGF0dGFjaG1lbnQgbWV0YWRhdGEuXG4gICAqIEB0aHJvd3MgQXBpRXJyb3Igd2hlbiB0aGUgc2VydmVyIHJlc3BvbmRzIHdpdGggYW4gZXJyb3IuXG4gICAqIEB0aHJvd3MgTmV0d29ya0Vycm9yIHdoZW4gdGhlIHJlcXVlc3QgZmFpbHMgdG8gcmVhY2ggdGhlIHNlcnZlci5cbiAgICovXG4gIGFzeW5jIGxpc3RBdHRhY2htZW50cyhjYXJkSWQ6IHN0cmluZyk6IFByb21pc2U8QXR0YWNobWVudFJlc3BvbnNlW10+IHtcbiAgICBjb25zdCB1cmwgPSB0aGlzLmJ1aWxkVXJsKGAvY2FyZHMvJHtjYXJkSWR9L2F0dGFjaG1lbnRzYCk7XG4gICAgcmV0dXJuIHRoaXMucmVxdWVzdCgoKSA9PiB0aGlzLmdldEh0dHBDbGllbnQoKS5nZXQ8QXR0YWNobWVudFJlc3BvbnNlW10+KHVybCkpO1xuICB9XG5cbiAgLy8gLS0tIFRpbWVsaW5lIE9wZXJhdGlvbnMgLS0tXG5cbiAgLyoqXG4gICAqIEdldHMgdGltZWxpbmUgZW50cmllcyBmb3IgYSBjYXJkIHdpdGggb3B0aW9uYWwgcGFnaW5hdGlvbi5cbiAgICpcbiAgICogQHBhcmFtIGNhcmRJZCAtIElkZW50aWZpZXIgb2YgdGhlIGNhcmQgd2hvc2UgdGltZWxpbmUgZW50cmllcyBzaG91bGQgYmUgcmV0dXJuZWQuXG4gICAqIEBwYXJhbSBvcHRpb25zIC0gT3B0aW9uYWwgcGFnaW5hdGlvbiBjb250cm9scy5cbiAgICogQHJldHVybnMgUHJvbWlzZSByZXNvbHZpbmcgdG8gdGltZWxpbmUgZW50cmllcy5cbiAgICogQHRocm93cyBBcGlFcnJvciB3aGVuIHRoZSBzZXJ2ZXIgcmVzcG9uZHMgd2l0aCBhbiBlcnJvci5cbiAgICogQHRocm93cyBOZXR3b3JrRXJyb3Igd2hlbiB0aGUgcmVxdWVzdCBmYWlscyB0byByZWFjaCB0aGUgc2VydmVyLlxuICAgKi9cbiAgYXN5bmMgZ2V0VGltZWxpbmUoY2FyZElkOiBzdHJpbmcsIG9wdGlvbnM/OiBUaW1lbGluZU9wdGlvbnMpOiBQcm9taXNlPFRpbWVsaW5lSXRlbVtdPiB7XG4gICAgY29uc3QgdXJsID0gdGhpcy5idWlsZFVybChgL2NhcmRzLyR7Y2FyZElkfS90aW1lbGluZWAsIHtcbiAgICAgIGJlZm9yZTogb3B0aW9ucz8uYmVmb3JlLFxuICAgICAgbGltaXQ6IG9wdGlvbnM/LmxpbWl0XG4gICAgfSk7XG4gICAgcmV0dXJuIHRoaXMucmVxdWVzdCgoKSA9PiB0aGlzLmdldEh0dHBDbGllbnQoKS5nZXQ8VGltZWxpbmVJdGVtW10+KHVybCkpO1xuICB9XG5cbiAgLy8gLS0tIFBsYW4gT3BlcmF0aW9ucyAtLS1cblxuICAvKipcbiAgICogR2V0cyB0aGUgcGxhbiBkb2N1bWVudCBmb3IgYSBjYXJkIGFzIG1hcmtkb3duLlxuICAgKlxuICAgKiBAcGFyYW0gY2FyZElkIC0gSWRlbnRpZmllciBvZiB0aGUgY2FyZCB3aG9zZSBwbGFuIG1hcmtkb3duIHNob3VsZCBiZSByZXR1cm5lZC5cbiAgICogQHJldHVybnMgUHJvbWlzZSByZXNvbHZpbmcgdG8gcGxhbiBtYXJrZG93bi5cbiAgICogQHRocm93cyBBcGlFcnJvciB3aGVuIHRoZSBzZXJ2ZXIgcmVzcG9uZHMgd2l0aCBhbiBlcnJvci5cbiAgICogQHRocm93cyBOZXR3b3JrRXJyb3Igd2hlbiB0aGUgcmVxdWVzdCBmYWlscyB0byByZWFjaCB0aGUgc2VydmVyLlxuICAgKi9cbiAgYXN5bmMgZ2V0UGxhbihjYXJkSWQ6IHN0cmluZyk6IFByb21pc2U8c3RyaW5nPiB7XG4gICAgY29uc3QgdXJsID0gdGhpcy5idWlsZFVybChgL2NhcmRzLyR7Y2FyZElkfS9wbGFuYCk7XG4gICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCB0aGlzLnJlcXVlc3QoKCkgPT4gdGhpcy5nZXRIdHRwQ2xpZW50KCkuZ2V0PHsgY29udGVudDogc3RyaW5nIH0+KHVybCkpO1xuICAgIHJldHVybiByZXNwb25zZS5jb250ZW50O1xuICB9XG5cbiAgLyoqXG4gICAqIFVwZGF0ZXMgdGhlIHBsYW4gZG9jdW1lbnQgZm9yIGEgY2FyZC5cbiAgICpcbiAgICogQHBhcmFtIGNhcmRJZCAtIElkZW50aWZpZXIgb2YgdGhlIGNhcmQgd2hvc2UgcGxhbiBtYXJrZG93biBzaG91bGQgYmUgdXBkYXRlZC5cbiAgICogQHBhcmFtIGNvbnRlbnQgLSBQbGFuIG1hcmtkb3duIGNvbnRlbnQuXG4gICAqIEByZXR1cm5zIFByb21pc2UgcmVzb2x2aW5nIHdoZW4gdGhlIHBsYW4gaXMgc2F2ZWQuXG4gICAqIEB0aHJvd3MgQXBpRXJyb3Igd2hlbiB0aGUgc2VydmVyIHJlamVjdHMgdGhlIHVwZGF0ZS5cbiAgICogQHRocm93cyBOZXR3b3JrRXJyb3Igd2hlbiB0aGUgcmVxdWVzdCBmYWlscyB0byByZWFjaCB0aGUgc2VydmVyLlxuICAgKiBAZGVwcmVjYXRlZCBVc2UgZGlyZWN0IGdpdCBvcGVyYXRpb25zIGluc3RlYWQuIFRoaXMgZW5kcG9pbnQgd2lsbCBiZSByZW1vdmVkLlxuICAgKi9cbiAgYXN5bmMgdXBkYXRlUGxhbihjYXJkSWQ6IHN0cmluZywgY29udGVudDogc3RyaW5nKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc3QgdXJsID0gdGhpcy5idWlsZFVybChgL2NhcmRzLyR7Y2FyZElkfS9wbGFuYCk7XG4gICAgcmV0dXJuIHRoaXMucmVxdWVzdCgoKSA9PiB0aGlzLmdldEh0dHBDbGllbnQoKS5wdXQ8dm9pZD4odXJsLCBjb250ZW50KSk7XG4gIH1cblxuICAvLyAtLS0gR2F0ZSBPcGVyYXRpb25zIC0tLVxuXG4gIC8qKlxuICAgKiBBcHByb3ZlcyBhIGdhdGUgZm9yIGEgY2FyZC5cbiAgICpcbiAgICogQHBhcmFtIGNhcmRJZCAtIElkZW50aWZpZXIgb2YgdGhlIGNhcmQgd2hvc2UgZ2F0ZSBzdGF0ZSBzaG91bGQgYmUgdXBkYXRlZC5cbiAgICogQHBhcmFtIGdhdGVOYW1lIC0gR2F0ZSBuYW1lIHRvIGFwcHJvdmUuXG4gICAqIEByZXR1cm5zIFByb21pc2UgcmVzb2x2aW5nIHRvIGdhdGUgYXBwcm92YWwgbWV0YWRhdGEuXG4gICAqIEB0aHJvd3MgQXBpRXJyb3Igd2hlbiB0aGUgc2VydmVyIHJlamVjdHMgdGhlIGFwcHJvdmFsLlxuICAgKiBAdGhyb3dzIE5ldHdvcmtFcnJvciB3aGVuIHRoZSByZXF1ZXN0IGZhaWxzIHRvIHJlYWNoIHRoZSBzZXJ2ZXIuXG4gICAqIEBkZXByZWNhdGVkIFVzZSBkaXJlY3QgZ2l0IG9wZXJhdGlvbnMgaW5zdGVhZC4gVGhpcyBlbmRwb2ludCB3aWxsIGJlIHJlbW92ZWQuXG4gICAqL1xuICBhc3luYyBhcHByb3ZlR2F0ZShjYXJkSWQ6IHN0cmluZywgZ2F0ZU5hbWU6ICdwbGFuJyB8ICdtZXJnZVJlcXVlc3QnKTogUHJvbWlzZTxHYXRlQXBwcm92YWxSZXNwb25zZT4ge1xuICAgIGNvbnN0IHVybCA9IHRoaXMuYnVpbGRVcmwoYC9jYXJkcy8ke2NhcmRJZH0vZ2F0ZXMvJHtnYXRlTmFtZX0vYXBwcm92ZWApO1xuICAgIHJldHVybiB0aGlzLnJlcXVlc3QoKCkgPT4gdGhpcy5nZXRIdHRwQ2xpZW50KCkucG9zdDxHYXRlQXBwcm92YWxSZXNwb25zZT4odXJsLCB1bmRlZmluZWQpKTtcbiAgfVxuXG4gIC8vIC0tLSBDb21taXQgT3BlcmF0aW9ucyAtLS1cblxuICAvKipcbiAgICogR2V0cyBhbGwgY29tbWl0cyBhc3NvY2lhdGVkIHdpdGggYSBjYXJkLlxuICAgKlxuICAgKiBAcGFyYW0gY2FyZElkIC0gSWRlbnRpZmllciBvZiB0aGUgY2FyZCB3aG9zZSBjb21taXRzIHNob3VsZCBiZSByZXR1cm5lZC5cbiAgICogQHJldHVybnMgUHJvbWlzZSByZXNvbHZpbmcgdG8gY29tbWl0IG1ldGFkYXRhLlxuICAgKiBAdGhyb3dzIEFwaUVycm9yIHdoZW4gdGhlIHNlcnZlciByZXNwb25kcyB3aXRoIGFuIGVycm9yLlxuICAgKiBAdGhyb3dzIE5ldHdvcmtFcnJvciB3aGVuIHRoZSByZXF1ZXN0IGZhaWxzIHRvIHJlYWNoIHRoZSBzZXJ2ZXIuXG4gICAqL1xuICBhc3luYyBnZXRDb21taXRzKGNhcmRJZDogc3RyaW5nKTogUHJvbWlzZTxDb21taXRJbmZvW10+IHtcbiAgICBjb25zdCB1cmwgPSB0aGlzLmJ1aWxkVXJsKGAvY2FyZHMvJHtjYXJkSWR9L2NvbW1pdHNgKTtcbiAgICByZXR1cm4gdGhpcy5yZXF1ZXN0KCgpID0+IHRoaXMuZ2V0SHR0cENsaWVudCgpLmdldDxDb21taXRJbmZvW10+KHVybCkpO1xuICB9XG5cbiAgLyoqXG4gICAqIEFkZHMgYSBjb21taXQgdG8gYSBjYXJkLlxuICAgKlxuICAgKiBAcGFyYW0gY2FyZElkIC0gSWRlbnRpZmllciBvZiB0aGUgY2FyZCB0byBhc3NvY2lhdGUgd2l0aCB0aGUgY29tbWl0IFNIQS5cbiAgICogQHBhcmFtIHNoYSAtIEdpdCBjb21taXQgc2hhLlxuICAgKiBAcmV0dXJucyBQcm9taXNlIHJlc29sdmluZyB0byBjb21taXQgbWV0YWRhdGEuXG4gICAqIEB0aHJvd3MgQXBpRXJyb3Igd2hlbiB0aGUgc2VydmVyIHJlamVjdHMgdGhlIHVwZGF0ZS5cbiAgICogQHRocm93cyBOZXR3b3JrRXJyb3Igd2hlbiB0aGUgcmVxdWVzdCBmYWlscyB0byByZWFjaCB0aGUgc2VydmVyLlxuICAgKi9cbiAgYXN5bmMgYWRkQ29tbWl0KGNhcmRJZDogc3RyaW5nLCBzaGE6IHN0cmluZyk6IFByb21pc2U8Q29tbWl0SW5mbz4ge1xuICAgIGNvbnN0IHVybCA9IHRoaXMuYnVpbGRVcmwoYC9jYXJkcy8ke2NhcmRJZH0vY29tbWl0c2ApO1xuICAgIHJldHVybiB0aGlzLnJlcXVlc3QoKCkgPT4gdGhpcy5nZXRIdHRwQ2xpZW50KCkucG9zdDxDb21taXRJbmZvPih1cmwsIHsgc2hhIH0pKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZW1vdmVzIGEgY29tbWl0IGZyb20gYSBjYXJkLlxuICAgKlxuICAgKiBAcGFyYW0gY2FyZElkIC0gSWRlbnRpZmllciBvZiB0aGUgY2FyZCB0byBkZXRhY2ggZnJvbSB0aGUgY29tbWl0IFNIQS5cbiAgICogQHBhcmFtIHNoYSAtIEdpdCBjb21taXQgc2hhLlxuICAgKiBAcGFyYW0gb3B0aW9ucyAtIE9wdGlvbmFsIHBhcmFtZXRlcnMuXG4gICAqIEBwYXJhbSBvcHRpb25zLnNlc3Npb25JZCAtIENsYXVkZSBDb2RlIHNlc3Npb24gSUQgZm9yd2FyZGVkIGFzIGBYLUNhcmRzLVNlc3Npb24tSWRgIGhlYWRlciBzbyB0aGUgY2FyZCByZXBvIHBvc3QtY29tbWl0IGhvb2sgY2FuIGF0dHJpYnV0ZSB0aGUgY29tbWl0LlxuICAgKiBAcmV0dXJucyBQcm9taXNlIHJlc29sdmluZyB3aGVuIHJlbW92YWwgaXMgY29tcGxldGUuXG4gICAqIEB0aHJvd3MgQXBpRXJyb3Igd2hlbiB0aGUgc2VydmVyIHJlamVjdHMgdGhlIHVwZGF0ZS5cbiAgICogQHRocm93cyBOZXR3b3JrRXJyb3Igd2hlbiB0aGUgcmVxdWVzdCBmYWlscyB0byByZWFjaCB0aGUgc2VydmVyLlxuICAgKi9cbiAgYXN5bmMgcmVtb3ZlQ29tbWl0KGNhcmRJZDogc3RyaW5nLCBzaGE6IHN0cmluZywgb3B0aW9ucz86IHsgc2Vzc2lvbklkPzogc3RyaW5nIH0pOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zdCB1cmwgPSB0aGlzLmJ1aWxkVXJsKGAvY2FyZHMvJHtjYXJkSWR9L2NvbW1pdHMvJHtzaGF9YCk7XG4gICAgY29uc3QgaGVhZGVyczogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHt9O1xuICAgIGlmIChvcHRpb25zPy5zZXNzaW9uSWQpIHtcbiAgICAgIGhlYWRlcnNbJ1gtQ2FyZHMtU2Vzc2lvbi1JZCddID0gb3B0aW9ucy5zZXNzaW9uSWQ7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLnJlcXVlc3QoKCkgPT4gdGhpcy5nZXRIdHRwQ2xpZW50KCkuZGVsZXRlKHVybCwgeyBoZWFkZXJzIH0pKTtcbiAgfVxuXG4gIC8vIC0tLSBCcmFuY2ggT3BlcmF0aW9ucyAtLS1cblxuICAvKipcbiAgICogR2V0cyBhbGwgYnJhbmNoZXMgdHJhY2tlZCBvbiBhIGNhcmQuXG4gICAqXG4gICAqIEBwYXJhbSBjYXJkSWQgLSBVbmlxdWUgaWRlbnRpZmllciBvZiB0aGUgY2FyZCB3aG9zZSBicmFuY2hlcyB0byByZXRyaWV2ZS5cbiAgICogQHBhcmFtIG9wdGlvbnMgLSBPcHRpb25hbCBxdWVyeSBwYXJhbWV0ZXJzLlxuICAgKiBAcGFyYW0gb3B0aW9ucy53b3Jrc3BhY2VQYXRoIC0gV29ya3NwYWNlIHBhdGggZm9yIGNvbXB1dGluZyBpc01lcmdlZCBhbmQgY29tbWl0IGNvbnRhaW5tZW50LlxuICAgKiBAcmV0dXJucyBQcm9taXNlIHJlc29sdmluZyB0byBicmFuY2hlcyByZXNwb25zZS5cbiAgICovXG4gIGFzeW5jIGdldEJyYW5jaGVzKGNhcmRJZDogc3RyaW5nLCBvcHRpb25zPzogeyB3b3Jrc3BhY2VQYXRoPzogc3RyaW5nIH0pOiBQcm9taXNlPEJyYW5jaGVzUmVzcG9uc2U+IHtcbiAgICBjb25zdCB1cmwgPSB0aGlzLmJ1aWxkVXJsKGAvY2FyZHMvJHtjYXJkSWR9L2JyYW5jaGVzYCwge1xuICAgICAgd29ya3NwYWNlUGF0aDogb3B0aW9ucz8ud29ya3NwYWNlUGF0aFxuICAgIH0pO1xuICAgIHJldHVybiB0aGlzLnJlcXVlc3QoKCkgPT4gdGhpcy5nZXRIdHRwQ2xpZW50KCkuZ2V0PEJyYW5jaGVzUmVzcG9uc2U+KHVybCkpO1xuICB9XG5cbiAgLyoqXG4gICAqIEFkZHMgYSBicmFuY2ggdG8gYSBjYXJkLlxuICAgKlxuICAgKiBAcGFyYW0gY2FyZElkIC0gVW5pcXVlIGlkZW50aWZpZXIgb2YgdGhlIGNhcmQgdG8gYWRkIHRoZSBicmFuY2ggdG8uXG4gICAqIEBwYXJhbSBkYXRhIC0gQnJhbmNoIGRhdGEgaW5jbHVkaW5nIG5hbWUgYW5kIG9wdGlvbmFsIHdvcmt0cmVlIHBhdGguXG4gICAqIEBwYXJhbSBvcHRpb25zIC0gT3B0aW9uYWwgcGFyYW1ldGVycy5cbiAgICogQHBhcmFtIG9wdGlvbnMuc2Vzc2lvbklkIC0gQ2xhdWRlIENvZGUgc2Vzc2lvbiBJRCBmb3J3YXJkZWQgYXMgYFgtQ2FyZHMtU2Vzc2lvbi1JZGAgaGVhZGVyIHNvIHRoZSBjYXJkIHJlcG8gcG9zdC1jb21taXQgaG9vayBjYW4gYXR0cmlidXRlIHRoZSBjb21taXQuXG4gICAqIEByZXR1cm5zIFByb21pc2UgcmVzb2x2aW5nIHdoZW4gdGhlIGJyYW5jaCBpcyBhZGRlZC5cbiAgICovXG4gIGFzeW5jIGFkZEJyYW5jaChjYXJkSWQ6IHN0cmluZywgZGF0YTogQWRkQnJhbmNoUmVxdWVzdCwgb3B0aW9ucz86IHsgc2Vzc2lvbklkPzogc3RyaW5nIH0pOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zdCB1cmwgPSB0aGlzLmJ1aWxkVXJsKGAvY2FyZHMvJHtjYXJkSWR9L2JyYW5jaGVzYCk7XG4gICAgY29uc3QgaGVhZGVyczogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHt9O1xuICAgIGlmIChvcHRpb25zPy5zZXNzaW9uSWQpIHtcbiAgICAgIGhlYWRlcnNbJ1gtQ2FyZHMtU2Vzc2lvbi1JZCddID0gb3B0aW9ucy5zZXNzaW9uSWQ7XG4gICAgfVxuICAgIGF3YWl0IHRoaXMucmVxdWVzdCgoKSA9PiB0aGlzLmdldEh0dHBDbGllbnQoKS5wb3N0PHVua25vd24+KHVybCwgZGF0YSwgeyBoZWFkZXJzIH0pKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZW1vdmVzIGEgYnJhbmNoIGZyb20gYSBjYXJkLlxuICAgKlxuICAgKiBAcGFyYW0gY2FyZElkIC0gVW5pcXVlIGlkZW50aWZpZXIgb2YgdGhlIGNhcmQgdG8gcmVtb3ZlIHRoZSBicmFuY2ggZnJvbS5cbiAgICogQHBhcmFtIG5hbWUgLSBCcmFuY2ggbmFtZSB0byByZW1vdmUgKHdpbGwgYmUgVVJMLWVuY29kZWQpLlxuICAgKiBAcGFyYW0gb3B0aW9ucyAtIE9wdGlvbmFsIHBhcmFtZXRlcnMuXG4gICAqIEBwYXJhbSBvcHRpb25zLnNlc3Npb25JZCAtIENsYXVkZSBDb2RlIHNlc3Npb24gSUQgZm9yd2FyZGVkIGFzIGBYLUNhcmRzLVNlc3Npb24tSWRgIGhlYWRlciBzbyB0aGUgY2FyZCByZXBvIHBvc3QtY29tbWl0IGhvb2sgY2FuIGF0dHJpYnV0ZSB0aGUgY29tbWl0LlxuICAgKiBAcmV0dXJucyBQcm9taXNlIHJlc29sdmluZyB3aGVuIHRoZSBicmFuY2ggaXMgcmVtb3ZlZC5cbiAgICovXG4gIGFzeW5jIHJlbW92ZUJyYW5jaChjYXJkSWQ6IHN0cmluZywgbmFtZTogc3RyaW5nLCBvcHRpb25zPzogeyBzZXNzaW9uSWQ/OiBzdHJpbmcgfSk6IFByb21pc2U8dm9pZD4ge1xuICAgIGNvbnN0IHVybCA9IHRoaXMuYnVpbGRVcmwoYC9jYXJkcy8ke2NhcmRJZH0vYnJhbmNoZXMvJHtlbmNvZGVVUklDb21wb25lbnQobmFtZSl9YCk7XG4gICAgY29uc3QgaGVhZGVyczogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHt9O1xuICAgIGlmIChvcHRpb25zPy5zZXNzaW9uSWQpIHtcbiAgICAgIGhlYWRlcnNbJ1gtQ2FyZHMtU2Vzc2lvbi1JZCddID0gb3B0aW9ucy5zZXNzaW9uSWQ7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLnJlcXVlc3QoKCkgPT4gdGhpcy5nZXRIdHRwQ2xpZW50KCkuZGVsZXRlKHVybCwgeyBoZWFkZXJzIH0pKTtcbiAgfVxuXG4gIC8vIC0tLSBUYWcgT3BlcmF0aW9ucyAtLS1cblxuICAvKipcbiAgICogR2V0cyBhbGwgYXZhaWxhYmxlIHRhZ3MuXG4gICAqXG4gICAqIEByZXR1cm5zIFByb21pc2UgcmVzb2x2aW5nIHRvIHRhZyBzdHJpbmdzLlxuICAgKiBAdGhyb3dzIEFwaUVycm9yIHdoZW4gdGhlIHNlcnZlciByZXNwb25kcyB3aXRoIGFuIGVycm9yLlxuICAgKiBAdGhyb3dzIE5ldHdvcmtFcnJvciB3aGVuIHRoZSByZXF1ZXN0IGZhaWxzIHRvIHJlYWNoIHRoZSBzZXJ2ZXIuXG4gICAqL1xuICBhc3luYyBnZXRUYWdzKCk6IFByb21pc2U8c3RyaW5nW10+IHtcbiAgICBjb25zdCB1cmwgPSB0aGlzLmJ1aWxkVXJsKCcvdGFncycsIHtcbiAgICAgIHdvcmtzcGFjZVBhdGg6IHRoaXMub3B0aW9ucy53b3Jrc3BhY2VQYXRoXG4gICAgfSk7XG4gICAgcmV0dXJuIHRoaXMucmVxdWVzdCgoKSA9PiB0aGlzLmdldEh0dHBDbGllbnQoKS5nZXQ8c3RyaW5nW10+KHVybCkpO1xuICB9XG5cbiAgLy8gLS0tIEVudmlyb25tZW50IE9wZXJhdGlvbnMgLS0tXG5cbiAgLyoqXG4gICAqIEZldGNoZXMgYXZhaWxhYmxlIGFnZW50IGVudmlyb25tZW50cy5cbiAgICpcbiAgICogQHJldHVybnMgUHJvbWlzZSByZXNvbHZpbmcgdG8gZW52aXJvbm1lbnQgbWV0YWRhdGEuXG4gICAqIEB0aHJvd3MgQXBpRXJyb3Igd2hlbiB0aGUgc2VydmVyIHJlc3BvbmRzIHdpdGggYW4gZXJyb3IuXG4gICAqIEB0aHJvd3MgTmV0d29ya0Vycm9yIHdoZW4gdGhlIHJlcXVlc3QgZmFpbHMgdG8gcmVhY2ggdGhlIHNlcnZlci5cbiAgICovXG4gIGFzeW5jIGdldEVudmlyb25tZW50cygpOiBQcm9taXNlPEFycmF5PHsgbmFtZTogc3RyaW5nOyBkZXNjcmlwdGlvbj86IHN0cmluZyB9Pj4ge1xuICAgIGNvbnN0IHVybCA9IHRoaXMuYnVpbGRVcmwoJy9lbnZpcm9ubWVudHMnKTtcbiAgICByZXR1cm4gdGhpcy5yZXF1ZXN0KCgpID0+IHRoaXMuZ2V0SHR0cENsaWVudCgpLmdldDxBcnJheTx7IG5hbWU6IHN0cmluZzsgZGVzY3JpcHRpb24/OiBzdHJpbmcgfT4+KHVybCkpO1xuICB9XG5cbiAgLy8gLS0tIFR5cGVkIEZpbGUgT3BlcmF0aW9ucyAtLS1cblxuICAvKipcbiAgICogU3VibWl0cyBhbiBhZGFwdGl2ZSBjYXJkIGFjdGlvbiBieSB3cml0aW5nIGFuIGBhZGFwdGl2ZS1jYXJkLXN1Ym1pc3Npb25gIHR5cGVkIGZpbGUuXG4gICAqXG4gICAqIEBwYXJhbSBjYXJkSWQgLSBUaGUgY2FyZCBjb250YWluaW5nIHRoZSBhZGFwdGl2ZSBjYXJkLlxuICAgKiBAcGFyYW0gYWN0aW9uSWQgLSBUaGUgYWN0aW9uIElEIGZyb20gdGhlIGFkYXB0aXZlIGNhcmQgc3VibWl0IGFjdGlvbi5cbiAgICogQHBhcmFtIGRhdGEgLSBUaGUgZm9ybSBkYXRhIGNvbGxlY3RlZCBieSB0aGUgYWRhcHRpdmUgY2FyZC5cbiAgICogQHJldHVybnMgUHJvbWlzZSByZXNvbHZpbmcgd2hlbiB0aGUgc3VibWlzc2lvbiBpcyBwZXJzaXN0ZWQuXG4gICAqIEB0aHJvd3MgQXBpRXJyb3Igd2hlbiB0aGUgc2VydmVyIHJlamVjdHMgdGhlIHN1Ym1pc3Npb24gKGUuZy4gdmFsaWRhdGlvbiBmYWlsdXJlKS5cbiAgICogQHRocm93cyBOZXR3b3JrRXJyb3Igd2hlbiB0aGUgcmVxdWVzdCBmYWlscyB0byByZWFjaCB0aGUgc2VydmVyLlxuICAgKi9cbiAgYXN5bmMgc3VibWl0Q2FyZEFjdGlvbihjYXJkSWQ6IHN0cmluZywgYWN0aW9uSWQ6IHN0cmluZywgZGF0YTogUmVjb3JkPHN0cmluZywgdW5rbm93bj4pOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zdCBmaWxlTmFtZSA9IGAke2FjdGlvbklkfS0ke0RhdGUubm93KCl9Lmpzb25gO1xuICAgIGNvbnN0IHVybCA9IHRoaXMuYnVpbGRVcmwoYC9jYXJkcy8ke2NhcmRJZH0vYWRhcHRpdmUtY2FyZC1zdWJtaXNzaW9uLyR7ZW5jb2RlVVJJQ29tcG9uZW50KGZpbGVOYW1lKX1gKTtcbiAgICBjb25zdCBib2R5ID0geyBjYXJkSWQsIGFjdGlvbklkLCBkYXRhIH07XG4gICAgYXdhaXQgdGhpcy5yZXF1ZXN0KCgpID0+IHRoaXMuZ2V0SHR0cENsaWVudCgpLnB1dDx1bmtub3duPih1cmwsIGJvZHkpKTtcbiAgfVxuXG4gIC8vIC0tLSBUeXBlIFNjaGVtYSBPcGVyYXRpb25zIC0tLVxuXG4gIC8qKlxuICAgKiBHZXRzIHR5cGUgc2NoZW1hcyBhbmQgZGVzY3JpcHRpb25zIGZvciBhIGNhcmQncyBlbnZpcm9ubWVudC5cbiAgICpcbiAgICogUmV0dXJucyBtZXRhZGF0YSBhYm91dCBlYWNoIHJlZ2lzdGVyZWQgdHlwZSBpbiB0aGUgY2FyZCdzIGVudmlyb25tZW50LFxuICAgKiBpbmNsdWRpbmcgdmVyc2lvbiwgc2NoZW1hLCBhbmQgZGVzY3JpcHRpb24uIENvbW1hbmQgZGV0YWlscyBhcmUgZXhjbHVkZWQuXG4gICAqXG4gICAqIEBwYXJhbSBjYXJkSWQgLSBJZGVudGlmaWVyIG9mIHRoZSBjYXJkIHdob3NlIHR5cGUgc2NoZW1hIG1ldGFkYXRhIHNob3VsZCBiZSBmZXRjaGVkLlxuICAgKiBAcmV0dXJucyBQcm9taXNlIHJlc29sdmluZyB0byB0eXBlIHNjaGVtYSBpbmZvcm1hdGlvbi5cbiAgICogQHRocm93cyBBcGlFcnJvciB3aGVuIHRoZSBzZXJ2ZXIgcmVzcG9uZHMgd2l0aCBhbiBlcnJvci5cbiAgICogQHRocm93cyBOZXR3b3JrRXJyb3Igd2hlbiB0aGUgcmVxdWVzdCBmYWlscyB0byByZWFjaCB0aGUgc2VydmVyLlxuICAgKi9cbiAgYXN5bmMgZ2V0VHlwZVNjaGVtYXMoY2FyZElkOiBzdHJpbmcpOiBQcm9taXNlPFR5cGVTY2hlbWFzUmVzcG9uc2U+IHtcbiAgICBjb25zdCB1cmwgPSB0aGlzLmJ1aWxkVXJsKGAvY2FyZHMvJHtjYXJkSWR9L3NjaGVtYWApO1xuICAgIHJldHVybiB0aGlzLnJlcXVlc3QoKCkgPT4gdGhpcy5nZXRIdHRwQ2xpZW50KCkuZ2V0PFR5cGVTY2hlbWFzUmVzcG9uc2U+KHVybCkpO1xuICB9XG5cbiAgLy8gLS0tIFN0cmVhbSBPcGVyYXRpb25zIC0tLVxuXG4gIC8qKlxuICAgKiBMaXN0cyBhbGwgc3RyZWFtcyBhdHRhY2hlZCB0byBhIGNhcmQsIHNvcnRlZCBieSBjcmVhdGlvbiB0aW1lLlxuICAgKlxuICAgKiBAcGFyYW0gY2FyZElkIC0gQ2FyZCBJRCB0byBxdWVyeS5cbiAgICogQHJldHVybnMgU3RyZWFtIG1ldGFkYXRhIGFycmF5IChtYXkgYmUgZW1wdHkpLlxuICAgKiBAdGhyb3dzIEFwaUVycm9yIHdoZW4gdGhlIHNlcnZlciByZXNwb25kcyB3aXRoIGFuIGVycm9yIChlLmcuLCA0MDQgZm9yIHVua25vd24gY2FyZCkuXG4gICAqIEB0aHJvd3MgTmV0d29ya0Vycm9yIHdoZW4gdGhlIHJlcXVlc3QgZmFpbHMgdG8gcmVhY2ggdGhlIHNlcnZlci5cbiAgICovXG4gIGFzeW5jIGxpc3RTdHJlYW1zKGNhcmRJZDogc3RyaW5nKTogUHJvbWlzZTxTdHJlYW1NZXRhW10+IHtcbiAgICBjb25zdCB1cmwgPSB0aGlzLmJ1aWxkVXJsKGAvY2FyZHMvJHtjYXJkSWR9L3N0cmVhbXNgKTtcbiAgICByZXR1cm4gdGhpcy5yZXF1ZXN0KCgpID0+IHRoaXMuZ2V0SHR0cENsaWVudCgpLmdldDxTdHJlYW1NZXRhW10+KHVybCkpO1xuICB9XG5cbiAgLyoqXG4gICAqIFJldHJpZXZlcyBhIHN0cmVhbSdzIG1ldGFkYXRhIGFuZCBhbGwgcmF3IGxpbmVzLlxuICAgKlxuICAgKiBUaGUgYHN0cmVhbVR5cGVgIGFuZCBgZmlsZW5hbWVgIGFyZSBVUkktZW5jb2RlZCBhdXRvbWF0aWNhbGx5LiBGb3IgY29tcGxldGVkXG4gICAqIHN0cmVhbXMgdGhlIHJldHVybmVkIGBsaW5lc2AgYXJyYXkgaXMgdGhlIGZ1bGwgY29udGVudDsgZm9yIGFjdGl2ZSBzdHJlYW1zIGl0XG4gICAqIGlzIGEgc25hcHNob3QgdGhhdCBtYXkgZ3JvdyB3aGlsZSB0aGUgY2FsbGVyIHByb2Nlc3NlcyBpdC5cbiAgICpcbiAgICogQHBhcmFtIGNhcmRJZCAtIElkZW50aWZpZXIgb2YgdGhlIGNhcmQgdGhhdCBvd25zIHRoZSByZXF1ZXN0ZWQgc3RyZWFtLlxuICAgKiBAcGFyYW0gc3RyZWFtVHlwZSAtIFN0cmVhbSB0eXBlIGtleSAoZS5nLiwgYFwiY2xhdWRlLWNvZGUtc2Vzc2lvblwiYCkuXG4gICAqIEBwYXJhbSBmaWxlbmFtZSAtIFN0cmVhbSBmaWxlbmFtZSAoZS5nLiwgYFwic2Vzc2lvbi5sb2dcImApLlxuICAgKiBAcmV0dXJucyBNZXRhZGF0YSBhbmQgY29udGVudCBsaW5lcy5cbiAgICogQHRocm93cyBBcGlFcnJvciBvbiA0MDQgKHVua25vd24gY2FyZCBvciBzdHJlYW0pIG9yIG90aGVyIHNlcnZlciBlcnJvcnMuXG4gICAqIEB0aHJvd3MgTmV0d29ya0Vycm9yIHdoZW4gdGhlIHJlcXVlc3QgZmFpbHMgdG8gcmVhY2ggdGhlIHNlcnZlci5cbiAgICovXG4gIGFzeW5jIGdldFN0cmVhbShcbiAgICBjYXJkSWQ6IHN0cmluZyxcbiAgICBzdHJlYW1UeXBlOiBzdHJpbmcsXG4gICAgZmlsZW5hbWU6IHN0cmluZ1xuICApOiBQcm9taXNlPHsgbWV0YTogU3RyZWFtTWV0YTsgbGluZXM6IHN0cmluZ1tdIH0+IHtcbiAgICBjb25zdCB1cmwgPSB0aGlzLmJ1aWxkVXJsKFxuICAgICAgYC9jYXJkcy8ke2NhcmRJZH0vc3RyZWFtcy8ke2VuY29kZVVSSUNvbXBvbmVudChzdHJlYW1UeXBlKX0vJHtlbmNvZGVVUklDb21wb25lbnQoZmlsZW5hbWUpfWBcbiAgICApO1xuICAgIHJldHVybiB0aGlzLnJlcXVlc3QoKCkgPT4gdGhpcy5nZXRIdHRwQ2xpZW50KCkuZ2V0PHsgbWV0YTogU3RyZWFtTWV0YTsgbGluZXM6IHN0cmluZ1tdIH0+KHVybCkpO1xuICB9XG5cbiAgLyoqXG4gICAqIE9wZW5zIGEgY2h1bmtlZCBKU09OTCBzdHJlYW0gdG8gdGhlIHNlcnZlciBhbmQgcmV0dXJucyBhIHdyaXRlci5cbiAgICpcbiAgICogVGhlIHdyaXRlciBzZW5kcyBlYWNoIGxpbmUgaW4gcmVhbC10aW1lIG92ZXIgYSBzaW5nbGUgSFRUUCBQT1NUIHVzaW5nIGFcbiAgICogYFJlYWRhYmxlU3RyZWFtYCBib2R5LiBDYWxsIHtAbGluayBTdHJlYW1Xcml0ZXIuY2xvc2V9IHdoZW4gdGhlIHByb2R1Y2VyXG4gICAqIGlzIGZpbmlzaGVkIHRvIGVuZCB0aGUgcmVxdWVzdCBhbmQgcmV0cmlldmUgdGhlIHNlcnZlcidzIHN1bW1hcnkuXG4gICAqXG4gICAqIEBwYXJhbSBjYXJkSWQgLSBDYXJkIElEIHRvIGF0dGFjaCB0aGUgc3RyZWFtIHRvLlxuICAgKiBAcGFyYW0gc3RyZWFtVHlwZSAtIFN0cmVhbSB0eXBlIGtleSBmcm9tIHNldHRpbmdzLmpzb24gKGUuZy4sIGBcImNsYXVkZS1jb2RlLXNlc3Npb25cImApLlxuICAgKiBAcGFyYW0gZmlsZW5hbWUgLSBTdHJlYW0gZmlsZW5hbWUgKGUuZy4sIGBcInNlc3Npb24tYWJjLmpzb25sXCJgKS5cbiAgICogQHBhcmFtIG9wdGlvbnMgLSBPcHRpb25hbCB0aXRsZSBhbmQgc2Vzc2lvbiBJRCBtZXRhZGF0YS5cbiAgICogQHJldHVybnMgQSB7QGxpbmsgU3RyZWFtV3JpdGVyfSBmb3IgcHVzaGluZyBsaW5lcyBhbmQgY2xvc2luZyB0aGUgc3RyZWFtLlxuICAgKlxuICAgKiBAZXhhbXBsZVxuICAgKiBgYGB0eXBlc2NyaXB0XG4gICAqIGNvbnN0IHN0cmVhbSA9IGNsaWVudC5vcGVuU3RyZWFtKGNhcmRJZCwgJ2NsYXVkZS1jb2RlLXNlc3Npb24nLCAncnVuLmpzb25sJyk7XG4gICAqIHN0cmVhbS53cml0ZShKU09OLnN0cmluZ2lmeSh7IHR5cGU6ICdpbml0JyB9KSk7XG4gICAqIHN0cmVhbS53cml0ZShKU09OLnN0cmluZ2lmeSh7IHR5cGU6ICdyZXN1bHQnIH0pKTtcbiAgICogY29uc3QgcmVzdWx0ID0gYXdhaXQgc3RyZWFtLmNsb3NlKCk7XG4gICAqIGBgYFxuICAgKi9cbiAgb3BlblN0cmVhbShjYXJkSWQ6IHN0cmluZywgc3RyZWFtVHlwZTogc3RyaW5nLCBmaWxlbmFtZTogc3RyaW5nLCBvcHRpb25zPzogU3RyZWFtV3JpdGVyT3B0aW9ucyk6IFN0cmVhbVdyaXRlciB7XG4gICAgY29uc3QgZW5jb2RlciA9IG5ldyBUZXh0RW5jb2RlcigpO1xuICAgIGxldCBjb250cm9sbGVyITogUmVhZGFibGVTdHJlYW1EZWZhdWx0Q29udHJvbGxlcjxVaW50OEFycmF5PjtcblxuICAgIGNvbnN0IGJvZHkgPSBuZXcgUmVhZGFibGVTdHJlYW08VWludDhBcnJheT4oe1xuICAgICAgc3RhcnQoYykge1xuICAgICAgICBjb250cm9sbGVyID0gYztcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIGNvbnN0IHVybCA9IHRoaXMuYnVpbGRVcmwoXG4gICAgICBgL2NhcmRzLyR7Y2FyZElkfS9zdHJlYW1zLyR7ZW5jb2RlVVJJQ29tcG9uZW50KHN0cmVhbVR5cGUpfS8ke2VuY29kZVVSSUNvbXBvbmVudChmaWxlbmFtZSl9YFxuICAgICk7XG5cbiAgICBjb25zdCBoZWFkZXJzOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ID0ge1xuICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi94LW5kanNvbidcbiAgICB9O1xuICAgIGlmICh0aGlzLm9wdGlvbnMuYWNjZXNzVG9rZW4pIHtcbiAgICAgIGhlYWRlcnNbJ0F1dGhvcml6YXRpb24nXSA9IGBCZWFyZXIgJHt0aGlzLm9wdGlvbnMuYWNjZXNzVG9rZW59YDtcbiAgICB9XG4gICAgaWYgKG9wdGlvbnM/LnRpdGxlKSB7XG4gICAgICBoZWFkZXJzWydYLVN0cmVhbS1UaXRsZSddID0gb3B0aW9ucy50aXRsZTtcbiAgICB9XG4gICAgaWYgKG9wdGlvbnM/LnNlc3Npb25JZCkge1xuICAgICAgaGVhZGVyc1snWC1TdHJlYW0tU2Vzc2lvbi1JZCddID0gb3B0aW9ucy5zZXNzaW9uSWQ7XG4gICAgfVxuXG4gICAgLy8gYGR1cGxleDogJ2hhbGYnYCBpcyByZXF1aXJlZCBieSB1bmRpY2kgZm9yIHN0cmVhbWluZyByZXF1ZXN0IGJvZGllc1xuICAgIC8vIGJ1dCBpcyBub3QgeWV0IGluIHRoZSBzdGFuZGFyZCBsaWIuZG9tIFJlcXVlc3RJbml0IHR5cGUuXG4gICAgY29uc3QgZmV0Y2hPcHRpb25zOiBSZXF1ZXN0SW5pdCAmIHsgZHVwbGV4OiBzdHJpbmcgfSA9IHtcbiAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgaGVhZGVycyxcbiAgICAgIGJvZHksXG4gICAgICBkdXBsZXg6ICdoYWxmJ1xuICAgIH07XG5cbiAgICBjb25zdCByZXNwb25zZVByb21pc2UgPSBmZXRjaCh1cmwsIGZldGNoT3B0aW9ucyk7XG5cbiAgICAvLyBUcmFjayBlYXJseSByZWplY3Rpb24gZnJvbSB0aGUgc2VydmVyIChlLmcuIDQwOSBcIlN0cmVhbSBhbHJlYWR5XG4gICAgLy8gZXhpc3RzIGFuZCBpcyBhY3RpdmVcIikuICBGb3IgYSBzdWNjZXNzZnVsIHN0cmVhbSB0aGUgcmVzcG9uc2Ugc3RheXNcbiAgICAvLyBwZW5kaW5nIHVudGlsIGNsb3NlKCkgZW5kcyB0aGUgYm9keSBcdTIwMTQgYnV0IGVycm9yIHJlc3BvbnNlcyBhcnJpdmVcbiAgICAvLyBpbW1lZGlhdGVseSBhbmQgbXVzdCBiZSBzdXJmYWNlZCB3aXRob3V0IHdhaXRpbmcgZm9yIGNsb3NlKCkuXG4gICAgLy8gTm90ZTogb25seSByZWFkcyByZXNwb25zZS5vay9zdGF0dXNUZXh0IChub3QgdGhlIGJvZHkpIHNvIGNsb3NlKClcbiAgICAvLyBjYW4gc3RpbGwgcGFyc2UgdGhlIGZ1bGwgZXJyb3IgcmVzcG9uc2UuXG4gICAgbGV0IGVhcmx5RXJyb3I6IEVycm9yIHwgbnVsbCA9IG51bGw7XG4gICAgcmVzcG9uc2VQcm9taXNlXG4gICAgICAudGhlbigocmVzcG9uc2UpID0+IHtcbiAgICAgICAgaWYgKCFyZXNwb25zZS5vaykge1xuICAgICAgICAgIGVhcmx5RXJyb3IgPSBuZXcgQXBpRXJyb3IocmVzcG9uc2Uuc3RhdHVzVGV4dCwgU3RyaW5nKHJlc3BvbnNlLnN0YXR1cykpO1xuICAgICAgICB9XG4gICAgICB9KVxuICAgICAgLmNhdGNoKChlcnI6IHVua25vd24pID0+IHtcbiAgICAgICAgZWFybHlFcnJvciA9IGVyciBpbnN0YW5jZW9mIEVycm9yID8gZXJyIDogbmV3IEVycm9yKFN0cmluZyhlcnIpKTtcbiAgICAgIH0pO1xuXG4gICAgcmV0dXJuIHtcbiAgICAgIHdyaXRlKGxpbmU6IHN0cmluZyk6IHZvaWQge1xuICAgICAgICBpZiAoZWFybHlFcnJvcikgdGhyb3cgZWFybHlFcnJvcjtcbiAgICAgICAgY29udHJvbGxlci5lbnF1ZXVlKGVuY29kZXIuZW5jb2RlKGAke2xpbmV9XFxuYCkpO1xuICAgICAgfSxcbiAgICAgIGNsb3NlOiBhc3luYyAoKTogUHJvbWlzZTxTdHJlYW1SZXN1bHQ+ID0+IHtcbiAgICAgICAgY29udHJvbGxlci5jbG9zZSgpO1xuICAgICAgICByZXR1cm4gdGhpcy5yZXF1ZXN0KGFzeW5jICgpID0+IHtcbiAgICAgICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IHJlc3BvbnNlUHJvbWlzZTtcbiAgICAgICAgICBpZiAoIXJlc3BvbnNlLm9rKSB0aHJvdyByZXNwb25zZTtcbiAgICAgICAgICByZXR1cm4gcmVzcG9uc2UuanNvbigpIGFzIFByb21pc2U8U3RyZWFtUmVzdWx0PjtcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfTtcbiAgfVxuXG4gIC8qKlxuICAgKiBPcGVucyBhIFdlYlNvY2tldC1iYWNrZWQgSlNPTkwgc3RyZWFtIHRvIHRoZSBzZXJ2ZXIgYW5kIHJldHVybnMgYSBzZXNzaW9uLlxuICAgKlxuICAgKiBUaGUgc2Vzc2lvbiBrZWVwcyBhIHBlcnNpc3RlbnQgV2ViU29ja2V0IGNvbm5lY3Rpb24gZm9yIHRoZSBlbnRpcmUgc2Vzc2lvblxuICAgKiBsaWZldGltZS4gVGhlIHNlcnZlciBzZW5kcyBhIGByZWFkeWAgbWVzc2FnZSB3aXRoIGByZXN1bWVGcm9tYCBiZWZvcmUgdGhlXG4gICAqIGNhbGxlciB3cml0ZXMgYW55IGxpbmVzLCBzbyB0aGUgd2F0Y2hlciBjYW4gc2tpcCBsaW5lcyB0aGUgc2VydmVyIGFscmVhZHkgaGFzLlxuICAgKlxuICAgKiBDYWxsIHtAbGluayBXc1N0cmVhbVNlc3Npb24uY2xvc2V9IHdoZW4gdGhlIHByb2R1Y2VyIGlzIGZpbmlzaGVkIHRvIHNlbmQgYVxuICAgKiBncmFjZWZ1bCBjbG9zZSBtZXNzYWdlIGFuZCBhd2FpdCB0aGUgc2VydmVyJ3MgYWNrbm93bGVkZ2VtZW50LlxuICAgKlxuICAgKiBAcGFyYW0gY2FyZElkIC0gQ2FyZCBJRCB0byBhdHRhY2ggdGhlIHN0cmVhbSB0by5cbiAgICogQHBhcmFtIHN0cmVhbVR5cGUgLSBTdHJlYW0gdHlwZSBrZXkgZnJvbSBzZXR0aW5ncy5qc29uIChlLmcuLCBgXCJjbGF1ZGUtY29kZS1zZXNzaW9uXCJgKS5cbiAgICogQHBhcmFtIGZpbGVuYW1lIC0gU3RyZWFtIGZpbGVuYW1lIChlLmcuLCBgXCJzZXNzaW9uLWFiYy5qc29ubFwiYCkuXG4gICAqIEBwYXJhbSBvcHRpb25zIC0gVGl0bGUgYW5kIHNlc3Npb24gSUQgbWV0YWRhdGEgZm9yd2FyZGVkIHRvIHRoZSBzZXJ2ZXIgYXMgVVJMIHF1ZXJ5IHBhcmFtZXRlcnMuXG4gICAqIEBwYXJhbSB3c0ZhY3RvcnkgLSBXZWJTb2NrZXQgZmFjdG9yeSBmb3IgY3JlYXRpbmcgdGhlIGNvbm5lY3Rpb24uIFVzZSB0aGUgYHdzYCBwYWNrYWdlIGluIE5vZGUuanMgZW52aXJvbm1lbnRzLlxuICAgKiBAcmV0dXJucyBBIHtAbGluayBXc1N0cmVhbVNlc3Npb259IHdpdGggYHJlc3VtZUZyb21gIHNldCB0byB0aGUgc2VydmVyJ3MgY3VycmVudCBsaW5lIGNvdW50LlxuICAgKiBAdGhyb3dzIEVycm9yIHdoZW4gdGhlIFdlYlNvY2tldCBmYWlscyB0byBjb25uZWN0IG9yIHRoZSBzZXJ2ZXIgc2VuZHMgYW4gZXJyb3IgYmVmb3JlIGByZWFkeWAuXG4gICAqL1xuICBhc3luYyBvcGVuU3RyZWFtV2ViU29ja2V0KFxuICAgIGNhcmRJZDogc3RyaW5nLFxuICAgIHN0cmVhbVR5cGU6IHN0cmluZyxcbiAgICBmaWxlbmFtZTogc3RyaW5nLFxuICAgIG9wdGlvbnM6IFN0cmVhbVdyaXRlck9wdGlvbnMsXG4gICAgd3NGYWN0b3J5OiBJbmdlc3RXc0ZhY3RvcnlcbiAgKTogUHJvbWlzZTxXc1N0cmVhbVNlc3Npb24+IHtcbiAgICBjb25zdCBmYWN0b3J5ID0gd3NGYWN0b3J5O1xuXG4gICAgLy8gQ29udmVydCBodHRwL2h0dHBzIHRvIHdzL3dzc1xuICAgIGNvbnN0IGJhc2VVcmwgPSB0aGlzLm9wdGlvbnMuYmFzZVVybC5yZXBsYWNlKC9eaHR0cC8sICd3cycpO1xuICAgIGNvbnN0IGJhc2VQYXRoID0gYCR7YmFzZVVybH0vY2FyZHMvJHtlbmNvZGVVUklDb21wb25lbnQoY2FyZElkKX0vc3RyZWFtcy8ke2VuY29kZVVSSUNvbXBvbmVudChzdHJlYW1UeXBlKX0vJHtlbmNvZGVVUklDb21wb25lbnQoZmlsZW5hbWUpfWA7XG4gICAgY29uc3QgcXVlcnlQYXJhbXMgPSBuZXcgVVJMU2VhcmNoUGFyYW1zKCk7XG4gICAgaWYgKG9wdGlvbnM/LnRpdGxlKSBxdWVyeVBhcmFtcy5zZXQoJ3RpdGxlJywgb3B0aW9ucy50aXRsZSk7XG4gICAgaWYgKG9wdGlvbnM/LnNlc3Npb25JZCkgcXVlcnlQYXJhbXMuc2V0KCdzZXNzaW9uSWQnLCBvcHRpb25zLnNlc3Npb25JZCk7XG4gICAgY29uc3QgcXVlcnlTdHJpbmcgPSBxdWVyeVBhcmFtcy50b1N0cmluZygpO1xuICAgIGNvbnN0IHVybCA9IHF1ZXJ5U3RyaW5nID8gYCR7YmFzZVBhdGh9PyR7cXVlcnlTdHJpbmd9YCA6IGJhc2VQYXRoO1xuXG4gICAgY29uc3QgaGVhZGVyczogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHt9O1xuICAgIGlmICh0aGlzLm9wdGlvbnMuYWNjZXNzVG9rZW4pIHtcbiAgICAgIGhlYWRlcnNbJ0F1dGhvcml6YXRpb24nXSA9IGBCZWFyZXIgJHt0aGlzLm9wdGlvbnMuYWNjZXNzVG9rZW59YDtcbiAgICB9XG5cbiAgICBjb25zdCB3cyA9IGZhY3RvcnkodXJsLCB7IGhlYWRlcnMgfSk7XG5cbiAgICAvLyBBd2FpdCB0aGUgJ3JlYWR5JyBtZXNzYWdlIGZyb20gdGhlIHNlcnZlciBiZWZvcmUgcmV0dXJuaW5nIHRvIHRoZSBjYWxsZXIuXG4gICAgLy8gQW55IGVycm9yIG9yIHByZW1hdHVyZSBjbG9zZSBiZWZvcmUgJ3JlYWR5JyByZWplY3RzIHRoZSBwcm9taXNlLlxuICAgIGNvbnN0IHJlc3VtZUZyb20gPSBhd2FpdCBuZXcgUHJvbWlzZTxudW1iZXI+KChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgIGNvbnN0IG9uUmVhZHkgPSAoZXZlbnQ6IE1lc3NhZ2VFdmVudDx1bmtub3duPikgPT4ge1xuICAgICAgICB0cnkge1xuICAgICAgICAgIGNvbnN0IG1zZyA9IEpTT04ucGFyc2UoU3RyaW5nKGV2ZW50LmRhdGEpKSBhcyB7IHR5cGU6IHN0cmluZzsgcmVzdW1lRnJvbT86IG51bWJlcjsgbWVzc2FnZT86IHN0cmluZyB9O1xuICAgICAgICAgIGlmIChtc2cudHlwZSA9PT0gJ3JlYWR5Jykge1xuICAgICAgICAgICAgd3MucmVtb3ZlRXZlbnRMaXN0ZW5lcignbWVzc2FnZScsIG9uUmVhZHkpO1xuICAgICAgICAgICAgd3MucmVtb3ZlRXZlbnRMaXN0ZW5lcignZXJyb3InLCBvbkVycm9yKTtcbiAgICAgICAgICAgIHdzLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2Nsb3NlJywgb25DbG9zZSk7XG4gICAgICAgICAgICByZXNvbHZlKG1zZy5yZXN1bWVGcm9tID8/IDApO1xuICAgICAgICAgIH0gZWxzZSBpZiAobXNnLnR5cGUgPT09ICdlcnJvcicpIHtcbiAgICAgICAgICAgIHdzLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ21lc3NhZ2UnLCBvblJlYWR5KTtcbiAgICAgICAgICAgIHdzLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2Vycm9yJywgb25FcnJvcik7XG4gICAgICAgICAgICB3cy5yZW1vdmVFdmVudExpc3RlbmVyKCdjbG9zZScsIG9uQ2xvc2UpO1xuICAgICAgICAgICAgcmVqZWN0KG5ldyBFcnJvcihtc2cubWVzc2FnZSA/PyAnU2VydmVyIGVycm9yJykpO1xuICAgICAgICAgIH1cbiAgICAgICAgICAvLyBPdGhlciBtZXNzYWdlIHR5cGVzIGJlZm9yZSAncmVhZHknIGFyZSBzaWxlbnRseSBpZ25vcmVkXG4gICAgICAgIH0gY2F0Y2gge1xuICAgICAgICAgIHJlamVjdChuZXcgRXJyb3IoJ0ZhaWxlZCB0byBwYXJzZSBzZXJ2ZXIgcmVhZHkgbWVzc2FnZScpKTtcbiAgICAgICAgfVxuICAgICAgfTtcbiAgICAgIGNvbnN0IG9uRXJyb3IgPSAoZXZlbnQ6IEV2ZW50KSA9PiB7XG4gICAgICAgIHdzLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ21lc3NhZ2UnLCBvblJlYWR5KTtcbiAgICAgICAgd3MucmVtb3ZlRXZlbnRMaXN0ZW5lcignZXJyb3InLCBvbkVycm9yKTtcbiAgICAgICAgd3MucmVtb3ZlRXZlbnRMaXN0ZW5lcignY2xvc2UnLCBvbkNsb3NlKTtcbiAgICAgICAgcmVqZWN0KG5ldyBFcnJvcihgV2ViU29ja2V0IGVycm9yOiAke1N0cmluZyhldmVudCl9YCkpO1xuICAgICAgfTtcbiAgICAgIGNvbnN0IG9uQ2xvc2UgPSAoZXZlbnQ6IENsb3NlRXZlbnQpID0+IHtcbiAgICAgICAgd3MucmVtb3ZlRXZlbnRMaXN0ZW5lcignbWVzc2FnZScsIG9uUmVhZHkpO1xuICAgICAgICB3cy5yZW1vdmVFdmVudExpc3RlbmVyKCdlcnJvcicsIG9uRXJyb3IpO1xuICAgICAgICB3cy5yZW1vdmVFdmVudExpc3RlbmVyKCdjbG9zZScsIG9uQ2xvc2UpO1xuICAgICAgICByZWplY3QobmV3IEVycm9yKGBXZWJTb2NrZXQgY2xvc2VkIGJlZm9yZSByZWFkeTogY29kZT0ke1N0cmluZyhldmVudC5jb2RlKX1gKSk7XG4gICAgICB9O1xuICAgICAgd3MuYWRkRXZlbnRMaXN0ZW5lcignbWVzc2FnZScsIG9uUmVhZHkpO1xuICAgICAgd3MuYWRkRXZlbnRMaXN0ZW5lcignZXJyb3InLCBvbkVycm9yKTtcbiAgICAgIHdzLmFkZEV2ZW50TGlzdGVuZXIoJ2Nsb3NlJywgb25DbG9zZSk7XG4gICAgfSk7XG5cbiAgICBsZXQgbGluZXNTZW50ID0gcmVzdW1lRnJvbTtcblxuICAgIHJldHVybiB7XG4gICAgICBnZXQgcmVzdW1lRnJvbSgpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gcmVzdW1lRnJvbTtcbiAgICAgIH0sXG4gICAgICBnZXQgbGluZXNTZW50KCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiBsaW5lc1NlbnQ7XG4gICAgICB9LFxuICAgICAgd3JpdGUobGluZTogc3RyaW5nKTogdm9pZCB7XG4gICAgICAgIGxpbmVzU2VudCsrO1xuICAgICAgICB3cy5zZW5kKEpTT04uc3RyaW5naWZ5KHsgdHlwZTogJ2xpbmUnLCBsaW5lTnVtYmVyOiBsaW5lc1NlbnQsIGNvbnRlbnQ6IGxpbmUgfSkpO1xuICAgICAgfSxcbiAgICAgIGFzeW5jIGNsb3NlKCk6IFByb21pc2U8U3RyZWFtUmVzdWx0PiB7XG4gICAgICAgIHdzLnNlbmQoSlNPTi5zdHJpbmdpZnkoeyB0eXBlOiAnY2xvc2UnIH0pKTtcbiAgICAgICAgYXdhaXQgbmV3IFByb21pc2U8dm9pZD4oKHJlc29sdmUpID0+IHtcbiAgICAgICAgICBjb25zdCBvbkNsb3NlID0gKCkgPT4ge1xuICAgICAgICAgICAgd3MucmVtb3ZlRXZlbnRMaXN0ZW5lcignY2xvc2UnLCBvbkNsb3NlKTtcbiAgICAgICAgICAgIHJlc29sdmUoKTtcbiAgICAgICAgICB9O1xuICAgICAgICAgIHdzLmFkZEV2ZW50TGlzdGVuZXIoJ2Nsb3NlJywgb25DbG9zZSk7XG4gICAgICAgICAgLy8gSWYgYWxyZWFkeSBjbG9zZWQsIHJlc29sdmUgaW1tZWRpYXRlbHlcbiAgICAgICAgICBpZiAod3MucmVhZHlTdGF0ZSA9PT0gd3MuQ0xPU0VEKSB7XG4gICAgICAgICAgICB3cy5yZW1vdmVFdmVudExpc3RlbmVyKCdjbG9zZScsIG9uQ2xvc2UpO1xuICAgICAgICAgICAgcmVzb2x2ZSgpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgZmlsZW5hbWUsXG4gICAgICAgICAgc3RyZWFtVHlwZSxcbiAgICAgICAgICBsaW5lQ291bnQ6IGxpbmVzU2VudCxcbiAgICAgICAgICBzdGF0dXM6ICdjb21wbGV0ZWQnXG4gICAgICAgIH07XG4gICAgICB9XG4gICAgfTtcbiAgfVxuXG4gIC8vIC0tLSBBY3Rpb24gT3BlcmF0aW9ucyAtLS1cblxuICAvKipcbiAgICogRXhlY3V0ZXMgYW4gYWN0aW9uIG9uIGEgY2FyZCB2aWEgdGhlIHNlcnZlciByZWxheS5cbiAgICpcbiAgICogQHBhcmFtIGNhcmRJZCAtIElkZW50aWZpZXIgb2YgdGhlIGNhcmQgdG8gZXhlY3V0ZSB0aGUgYWN0aW9uIG9uLlxuICAgKiBAcGFyYW0gYWN0aW9uTmFtZSAtIEFjdGlvbiBpZGVudGlmaWVyIChlLmcuLCAnbGF1bmNoJykuXG4gICAqIEByZXR1cm5zIFByb21pc2UgcmVzb2x2aW5nIHRvIHRoZSBhY3Rpb24gZXhlY3V0aW9uIHJlc3VsdC5cbiAgICogQHRocm93cyBBcGlFcnJvciB3aGVuIHRoZSBzZXJ2ZXIgcmVqZWN0cyB0aGUgcmVxdWVzdC5cbiAgICogQHRocm93cyBOZXR3b3JrRXJyb3Igd2hlbiB0aGUgcmVxdWVzdCBmYWlscyB0byByZWFjaCB0aGUgc2VydmVyLlxuICAgKi9cbiAgYXN5bmMgZXhlY3V0ZUFjdGlvbihjYXJkSWQ6IHN0cmluZywgYWN0aW9uTmFtZTogc3RyaW5nKTogUHJvbWlzZTxBY3Rpb25SZXN1bHQ+IHtcbiAgICBjb25zdCB1cmwgPSB0aGlzLmJ1aWxkVXJsKGAvY2FyZHMvJHtjYXJkSWR9L2FjdGlvbnMvJHtlbmNvZGVVUklDb21wb25lbnQoYWN0aW9uTmFtZSl9YCk7XG4gICAgcmV0dXJuIHRoaXMucmVxdWVzdCgoKSA9PiB0aGlzLmdldEh0dHBDbGllbnQoKS5wb3N0PEFjdGlvblJlc3VsdD4odXJsLCB1bmRlZmluZWQpKTtcbiAgfVxuXG4gIC8vIC0tLSBDb21wYXJlIE9wZXJhdGlvbnMgLS0tXG5cbiAgLyoqXG4gICAqIFNldHMgb3IgcmVwbGFjZXMgdGhlIGFjdGl2ZSBjb21wYXJpc29uIG9uIHRoZSBzZXJ2ZXIuXG4gICAqXG4gICAqIEBwYXJhbSByZXF1ZXN0IC0gQ29tcGFyZSByZXF1ZXN0IHNwZWNpZnlpbmcgdGhlIGNvbXBhcmlzb24gbW9kZS5cbiAgICogQHJldHVybnMgUHJvbWlzZSByZXNvbHZpbmcgdG8gdGhlIHJlc3VsdGluZyBjb21wYXJlIHN0YXRlLlxuICAgKi9cbiAgYXN5bmMgc2V0Q29tcGFyZShyZXF1ZXN0OiBDb21wYXJlUmVxdWVzdCk6IFByb21pc2U8Q29tcGFyZVN0YXRlPiB7XG4gICAgY29uc3QgdXJsID0gdGhpcy5idWlsZFVybCgnL2NvbXBhcmUnKTtcbiAgICByZXR1cm4gdGhpcy5yZXF1ZXN0KCgpID0+IHRoaXMuZ2V0SHR0cENsaWVudCgpLnBvc3Q8Q29tcGFyZVN0YXRlPih1cmwsIHJlcXVlc3QpKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXR1cm5zIHRoZSBjdXJyZW50IGNvbXBhcmUgc3RhdGUsIG9yIG51bGwgaWYgbm8gY29tcGFyaXNvbiBpcyBhY3RpdmUuXG4gICAqXG4gICAqIFRoZSBzZXJ2ZXIgcmV0dXJucyAyMDQgd2hlbiBubyBjb21wYXJpc29uIGlzIGFjdGl2ZSwgd2hpY2ggdGhpcyBtZXRob2RcbiAgICogbWFwcyB0byBudWxsIHJhdGhlciB0aGFuIHRocm93aW5nLlxuICAgKlxuICAgKiBAcmV0dXJucyBQcm9taXNlIHJlc29sdmluZyB0byB0aGUgY3VycmVudCBjb21wYXJlIHN0YXRlLCBvciBudWxsIGlmIG5vbmUgYWN0aXZlLlxuICAgKi9cbiAgYXN5bmMgZ2V0Q29tcGFyZSgpOiBQcm9taXNlPENvbXBhcmVTdGF0ZSB8IG51bGw+IHtcbiAgICBjb25zdCB1cmwgPSB0aGlzLmJ1aWxkVXJsKCcvY29tcGFyZScpO1xuICAgIHJldHVybiB0aGlzLnJlcXVlc3QoYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBmZXRjaCh1cmwsIHtcbiAgICAgICAgaGVhZGVyczogdGhpcy5nZXRIZWFkZXJzKCkgYXMgUmVjb3JkPHN0cmluZywgc3RyaW5nPixcbiAgICAgICAgc2lnbmFsOiB0aGlzLmdldFRpbWVvdXRTaWduYWwoKVxuICAgICAgfSk7XG4gICAgICBpZiAocmVzcG9uc2Uuc3RhdHVzID09PSAyMDQpIHtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9XG4gICAgICBpZiAoIXJlc3BvbnNlLm9rKSB0aHJvdyByZXNwb25zZTtcbiAgICAgIHJldHVybiByZXNwb25zZS5qc29uKCkgYXMgUHJvbWlzZTxDb21wYXJlU3RhdGU+O1xuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIENsZWFycyB0aGUgYWN0aXZlIGNvbXBhcmlzb24gb24gdGhlIHNlcnZlci5cbiAgICpcbiAgICogQHJldHVybnMgUHJvbWlzZSByZXNvbHZpbmcgd2hlbiB0aGUgY29tcGFyaXNvbiBpcyBjbGVhcmVkLlxuICAgKi9cbiAgYXN5bmMgY2xlYXJDb21wYXJlKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIGNvbnN0IHVybCA9IHRoaXMuYnVpbGRVcmwoJy9jb21wYXJlJyk7XG4gICAgcmV0dXJuIHRoaXMucmVxdWVzdCgoKSA9PiB0aGlzLmdldEh0dHBDbGllbnQoKS5kZWxldGUodXJsKSk7XG4gIH1cbn1cbiIsICIvKipcbiAqIENsYXVkZSBDb2RlIG1hcmtldHBsYWNlIHJlZ2lzdHJhdGlvbiB1dGlsaXRpZXMuXG4gKlxuICogUHJvdmlkZXMgZnVuY3Rpb25zIGZvciByZXNvbHZpbmcgdGhlIENsYXVkZSBDb2RlIGNvbmZpZ3VyYXRpb24gZGlyZWN0b3J5XG4gKiBhbmQgdXBkYXRpbmcgdGhlIGBrbm93bl9tYXJrZXRwbGFjZXMuanNvbmAgZmlsZSBzbyB0aGF0IHBsdWdpbiB2ZXJzaW9uXG4gKiBjaGVja3MgaGl0IHRoZSBjYWNoZSBpbnN0ZWFkIG9mIHJlLXNjYW5uaW5nIHRoZSBzb3VyY2UgZGlyZWN0b3J5LlxuICpcbiAqIEBzdW1tYXJ5IENsYXVkZSBDb2RlIG1hcmtldHBsYWNlIHJlZ2lzdHJhdGlvbiB1dGlsaXRpZXNcbiAqIEBtb2R1bGVcbiAqL1xuXG5pbXBvcnQgKiBhcyBmcyBmcm9tICdub2RlOmZzL3Byb21pc2VzJztcbmltcG9ydCB7IGhvbWVkaXIgfSBmcm9tICdub2RlOm9zJztcbmltcG9ydCAqIGFzIHBhdGggZnJvbSAnbm9kZTpwYXRoJztcbmltcG9ydCB0eXBlIHsgSUxvZ2dlciB9IGZyb20gJy4vY29uZmlnL2xvZ2dlci5qcyc7XG5cbi8qKlxuICogUmVzb2x2ZXMgdGhlIENsYXVkZSBDb2RlIGNvbmZpZ3VyYXRpb24gZGlyZWN0b3J5IHVzaW5nIHRoZSBzdGFuZGFyZFxuICogZmFsbGJhY2sgY2hhaW46ICRDTEFVREVfQ09ORklHX0RJUiBcdTIxOTIgJFhER19EQVRBX0hPTUUvY2xhdWRlIFx1MjE5MlxuICogJFhER19DT05GSUdfSE9NRS9jbGF1ZGUgXHUyMTkyIH4vLmNvbmZpZy9jbGF1ZGUgXHUyMTkyIH4vLmNsYXVkZS5cbiAqXG4gKiBSZXR1cm5zIHRoZSBmaXJzdCBjYW5kaWRhdGUgdGhhdCBleGlzdHMgb24gZGlzaywgb3IgbnVsbCBpZiBub25lIGlzIGZvdW5kLlxuICpcbiAqIEByZXR1cm5zIFRoZSBmaXJzdCBleGlzdGluZyBDbGF1ZGUgY29uZmlnIGRpcmVjdG9yeSBwYXRoLCBvciBudWxsIGlmIG5vbmUgZm91bmQuXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiByZXNvbHZlQ2xhdWRlQ29uZmlnRGlyKCk6IFByb21pc2U8c3RyaW5nIHwgbnVsbD4ge1xuICBjb25zdCBob21lID0gaG9tZWRpcigpO1xuICBjb25zdCBjYW5kaWRhdGVzOiBzdHJpbmdbXSA9IFtdO1xuXG4gIGNvbnN0IGNsYXVkZUNvbmZpZ0RpciA9IHByb2Nlc3MuZW52WydDTEFVREVfQ09ORklHX0RJUiddO1xuICBpZiAoY2xhdWRlQ29uZmlnRGlyKSBjYW5kaWRhdGVzLnB1c2goY2xhdWRlQ29uZmlnRGlyKTtcblxuICBjb25zdCB4ZGdEYXRhSG9tZSA9IHByb2Nlc3MuZW52WydYREdfREFUQV9IT01FJ107XG4gIGlmICh4ZGdEYXRhSG9tZSkgY2FuZGlkYXRlcy5wdXNoKHBhdGguam9pbih4ZGdEYXRhSG9tZSwgJ2NsYXVkZScpKTtcblxuICBjb25zdCB4ZGdDb25maWdIb21lID0gcHJvY2Vzcy5lbnZbJ1hER19DT05GSUdfSE9NRSddO1xuICBpZiAoeGRnQ29uZmlnSG9tZSkgY2FuZGlkYXRlcy5wdXNoKHBhdGguam9pbih4ZGdDb25maWdIb21lLCAnY2xhdWRlJykpO1xuXG4gIGNhbmRpZGF0ZXMucHVzaChwYXRoLmpvaW4oaG9tZSwgJy5jb25maWcnLCAnY2xhdWRlJykpO1xuICBjYW5kaWRhdGVzLnB1c2gocGF0aC5qb2luKGhvbWUsICcuY2xhdWRlJykpO1xuXG4gIGZvciAoY29uc3QgY2FuZGlkYXRlIG9mIGNhbmRpZGF0ZXMpIHtcbiAgICB0cnkge1xuICAgICAgYXdhaXQgZnMuYWNjZXNzKHBhdGguam9pbihjYW5kaWRhdGUsICdwbHVnaW5zJykpO1xuICAgICAgcmV0dXJuIGNhbmRpZGF0ZTtcbiAgICB9IGNhdGNoIChlcnJvcjogdW5rbm93bikge1xuICAgICAgaWYgKGVycm9yIGluc3RhbmNlb2YgRXJyb3IgJiYgJ2NvZGUnIGluIGVycm9yICYmIGVycm9yLmNvZGUgPT09ICdFTk9FTlQnKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgdGhyb3cgZXJyb3I7XG4gICAgfVxuICB9XG4gIHJldHVybiBudWxsO1xufVxuXG4vKipcbiAqIFVwZGF0ZXMgdGhlIGBjYXJkcy5tYW5hZ2VtZW50YCBlbnRyeSBpbiBDbGF1ZGUgQ29kZSdzIGBrbm93bl9tYXJrZXRwbGFjZXMuanNvbmBcbiAqIHRvIHBvaW50IHRvIHRoZSBleHRlbnNpb24tYnVuZGxlZCBtYXJrZXRwbGFjZSB1c2luZyBhbiBhYnNvbHV0ZSBwYXRoLlxuICpcbiAqIENsYXVkZSBDb2RlIHJlc29sdmVzIGRpcmVjdG9yeSBtYXJrZXRwbGFjZSBzb3VyY2VzIHJlbGF0aXZlIHRvIHRoZSBzcGF3bmVkXG4gKiBzZXNzaW9uJ3MgQ1dELiBXaGVuIHNlc3Npb25zIHJ1biBpbiBhIHdvcmt0cmVlLCBhIHJlbGF0aXZlIHBhdGggbGlrZSBgXCJwdWJsaWNcImBcbiAqIHJlc29sdmVzIHRvIHRoZSB3b3JrdHJlZSdzIGNvcHkgXHUyMDE0IHdoaWNoIG1heSBjb250YWluIGEgc3RhbGUgcGx1Z2luIHZlcnNpb24uXG4gKiBXcml0aW5nIGFuIGFic29sdXRlIHBhdGggZW5zdXJlcyBDbGF1ZGUgQ29kZSBhbHdheXMgcmVhZHMgZnJvbSB0aGUgZXh0ZW5zaW9uJ3NcbiAqIGJ1bmRsZWQgbWFya2V0cGxhY2UsIHJlZ2FyZGxlc3Mgb2YgQ1dELlxuICpcbiAqICMjIEhvdyBDbGF1ZGUgQ29kZSdzIHBsdWdpbiB2ZXJzaW9uIHN5bmNpbmcgd29ya3NcbiAqXG4gKiBUaGlzIHJlZ2lzdHJhdGlvbiB1cGRhdGUgaXMgdGhlICoqb25seSoqIGludGVydmVudGlvbiB3ZSBuZWVkLiBDbGF1ZGUgQ29kZSdzXG4gKiBidWlsdC1pbiBhdXRvLXVwZGF0ZSBzeXN0ZW0gaGFuZGxlcyB0aGUgcmVzdDpcbiAqXG4gKiAxLiAqKlZlcnNpb24gZGV0ZWN0aW9uKiogXHUyMDE0IE9uIHNlc3Npb24gc3RhcnQsIENsYXVkZSBDb2RlIHJlYWRzIHRoZSBtYXJrZXRwbGFjZVxuICogICAgc291cmNlIGRpcmVjdG9yeSAodGhlIGBzb3VyY2UucGF0aGAgd3JpdHRlbiBoZXJlKSBhbmQgZXh0cmFjdHMgdGhlIHZlcnNpb25cbiAqICAgIGZyb20gZWFjaCBwbHVnaW4ncyBgLmNsYXVkZS1wbHVnaW4vcGx1Z2luLmpzb25gLlxuICpcbiAqIDIuICoqQ2FjaGUtcGVyLXZlcnNpb24qKiBcdTIwMTQgRWFjaCBwbHVnaW4gdmVyc2lvbiBpcyBjYWNoZWQgaW5kZXBlbmRlbnRseSB1bmRlclxuICogICAgYDxjb25maWdEaXI+L3BsdWdpbnMvY2FjaGUvPG1hcmtldHBsYWNlPi88cGx1Z2luPi88dmVyc2lvbj4vYC4gVGhlIGFjdGl2ZVxuICogICAgdmVyc2lvbidzIHBhdGggaXMgcmVjb3JkZWQgYXMgYGluc3RhbGxQYXRoYCBpbiBgaW5zdGFsbGVkX3BsdWdpbnMuanNvbmAuXG4gKlxuICogMy4gKipBdXRvLXVwZGF0ZSoqIFx1MjAxNCBXaGVuIHRoZSBzb3VyY2UgZGlyZWN0b3J5IGNvbnRhaW5zIGEgbmV3ZXIgdmVyc2lvbiB0aGFuXG4gKiAgICB3aGF0J3MgY2FjaGVkLCBDbGF1ZGUgQ29kZSBjb3BpZXMgdGhlIHNvdXJjZSBpbnRvIGEgbmV3IHZlcnNpb25lZCBjYWNoZVxuICogICAgZGlyZWN0b3J5LCB1cGRhdGVzIGBpbnN0YWxsZWRfcGx1Z2lucy5qc29uYCB0byBwb2ludCB0byBpdCwgYW5kIHdyaXRlcyBhXG4gKiAgICBgLm9ycGhhbmVkX2F0YCB0aW1lc3RhbXAgaW50byB0aGUgb2xkIHZlcnNpb24ncyBjYWNoZSBkaXJlY3RvcnkuXG4gKlxuICogNC4gKipPcnBoYW4gR0MqKiBcdTIwMTQgQSBiYWNrZ3JvdW5kIGhvdXNla2VlcGluZyB0YXNrIHJ1bnMgZXZlcnkgMTAgbWludXRlcy4gSXRcbiAqICAgIHdhbGtzIHRoZSBjYWNoZSwgbWFya3MgYW55IHZlcnNpb24gZGlyZWN0b3J5IG5vdCByZWZlcmVuY2VkIGJ5XG4gKiAgICBgaW5zdGFsbGVkX3BsdWdpbnMuanNvbmAgd2l0aCBgLm9ycGhhbmVkX2F0YCwgYW5kIGRlbGV0ZXMgb3JwaGFuZWRcbiAqICAgIGRpcmVjdG9yaWVzIG9ubHkgYWZ0ZXIgYSAqKjctZGF5KiogZ3JhY2UgcGVyaW9kLiBUaGlzIGVuc3VyZXMgdGhhdFxuICogICAgY29uY3VycmVudGx5IHJ1bm5pbmcgc2Vzc2lvbnMgYXJlIG5ldmVyIGRpc3J1cHRlZCBieSBjYWNoZSBkZWxldGlvbi5cbiAqXG4gKiBXZSBwcmV2aW91c2x5IGZvcmNlLWRlbGV0ZWQgc3RhbGUgY2FjaGUgZW50cmllcyAoYGV2aWN0U3RhbGVSdW50aW1lQ2FjaGVgKSxcbiAqIHdoaWNoIGJ5cGFzc2VkIHRoZSA3LWRheSBncmFjZSBwZXJpb2QgYW5kIGNhdXNlZCBFTk9FTlQgZXJyb3JzIGluIHNlc3Npb25zXG4gKiBzdGlsbCByZWZlcmVuY2luZyB0aGUgZGVsZXRlZCBwYXRocy5cbiAqXG4gKiBAcGFyYW0gbWFya2V0cGxhY2VQYXRoIC0gQWJzb2x1dGUgcGF0aCB0byB0aGUgYnVuZGxlZCBtYXJrZXRwbGFjZSBkaXJlY3RvcnkuXG4gKiBAcGFyYW0gbG9nZ2VyIC0gTG9nZ2VyIGZvciBkaWFnbm9zdGljIG91dHB1dC5cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHVwZGF0ZU1hcmtldHBsYWNlUmVnaXN0cmF0aW9uKG1hcmtldHBsYWNlUGF0aDogc3RyaW5nLCBsb2dnZXI6IElMb2dnZXIpOiBQcm9taXNlPHZvaWQ+IHtcbiAgY29uc3QgY29uZmlnRGlyID0gYXdhaXQgcmVzb2x2ZUNsYXVkZUNvbmZpZ0RpcigpO1xuICBpZiAoIWNvbmZpZ0Rpcikge1xuICAgIGxvZ2dlci5kZWJ1ZygnQ2xhdWRlIGNvbmZpZyBkaXJlY3Rvcnkgbm90IGZvdW5kLCBza2lwcGluZyBtYXJrZXRwbGFjZSByZWdpc3RyYXRpb24gdXBkYXRlJyk7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgY29uc3Qga25vd25QYXRoID0gcGF0aC5qb2luKGNvbmZpZ0RpciwgJ3BsdWdpbnMnLCAna25vd25fbWFya2V0cGxhY2VzLmpzb24nKTtcbiAgbGV0IHJhdzogc3RyaW5nO1xuICB0cnkge1xuICAgIHJhdyA9IGF3YWl0IGZzLnJlYWRGaWxlKGtub3duUGF0aCwgJ3V0Zi04Jyk7XG4gIH0gY2F0Y2ggKGVycm9yOiB1bmtub3duKSB7XG4gICAgaWYgKGVycm9yIGluc3RhbmNlb2YgRXJyb3IgJiYgJ2NvZGUnIGluIGVycm9yICYmIGVycm9yLmNvZGUgPT09ICdFTk9FTlQnKSB7XG4gICAgICBsb2dnZXIuZGVidWcoJ2tub3duX21hcmtldHBsYWNlcy5qc29uIG5vdCBmb3VuZCwgc2tpcHBpbmcnKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdGhyb3cgZXJyb3I7XG4gIH1cblxuICBjb25zdCBkYXRhID0gSlNPTi5wYXJzZShyYXcpIGFzIFJlY29yZDxcbiAgICBzdHJpbmcsXG4gICAgeyBzb3VyY2U/OiB7IHNvdXJjZT86IHN0cmluZzsgcGF0aD86IHN0cmluZyB9OyBpbnN0YWxsTG9jYXRpb24/OiBzdHJpbmc7IGxhc3RVcGRhdGVkPzogc3RyaW5nIH1cbiAgPjtcbiAgY29uc3QgZW50cnkgPSBkYXRhWydjYXJkcy5tYW5hZ2VtZW50J107XG4gIGlmICghZW50cnk/LnNvdXJjZSB8fCBlbnRyeS5zb3VyY2Uuc291cmNlICE9PSAnZGlyZWN0b3J5JykgcmV0dXJuO1xuXG4gIGlmIChlbnRyeS5zb3VyY2UucGF0aCA9PT0gbWFya2V0cGxhY2VQYXRoICYmIGVudHJ5Lmluc3RhbGxMb2NhdGlvbiA9PT0gbWFya2V0cGxhY2VQYXRoKSB7XG4gICAgbG9nZ2VyLmRlYnVnKCdNYXJrZXRwbGFjZSByZWdpc3RyYXRpb24gYWxyZWFkeSBwb2ludHMgdG8gZXh0ZW5zaW9uIGJ1bmRsZScpO1xuICAgIHJldHVybjtcbiAgfVxuXG4gIGVudHJ5LnNvdXJjZS5wYXRoID0gbWFya2V0cGxhY2VQYXRoO1xuICBlbnRyeS5pbnN0YWxsTG9jYXRpb24gPSBtYXJrZXRwbGFjZVBhdGg7XG4gIGVudHJ5Lmxhc3RVcGRhdGVkID0gbmV3IERhdGUoKS50b0lTT1N0cmluZygpO1xuICBhd2FpdCBmcy53cml0ZUZpbGUoa25vd25QYXRoLCBgJHtKU09OLnN0cmluZ2lmeShkYXRhLCBudWxsLCA0KX1cXG5gKTtcbiAgbG9nZ2VyLmluZm8oJ1VwZGF0ZWQgbWFya2V0cGxhY2UgcmVnaXN0cmF0aW9uIHRvIGV4dGVuc2lvbiBidW5kbGUnLCB7IG1hcmtldHBsYWNlUGF0aCB9KTtcbn1cbiIsICIvKipcbiAqIEdpdCB3b3JrdHJlZSBsaWZlY3ljbGUgbWFuYWdlbWVudCBmb3IgbW9ub3JlcG8gd29ya3NwYWNlcy5cbiAqXG4gKiBDcmVhdGVzIHdvcmt0cmVlcyB3aXRoIHN5bWxpbmtlZCBub2RlX21vZHVsZXMsIGlnbm9yZWQgcGF0aHMsIGFuZFxuICogcGVyLXdvcmt0cmVlIGdpdCBleGNsdWRlcyBzbyB0aGUgd29ya3RyZWUgaXMgaW1tZWRpYXRlbHkgdXNhYmxlIGZvclxuICogYnVpbGRzIGFuZCB0ZXN0cyB3aXRob3V0IGEgc2VwYXJhdGUgYHlhcm4gaW5zdGFsbGAuXG4gKlxuICogU3VwcG9ydHMgYm90aCBicmFuY2gtYmFzZWQgd29ya3RyZWVzIChmb3IgaW1wbGVtZW50YXRpb24gd29yaykgYW5kXG4gKiBkZXRhY2hlZCB3b3JrdHJlZXMgKGZvciB2ZXJpZnlpbmcgc3RhdGUgYXQgYSB0YWcgb3IgY29tbWl0KS5cbiAqXG4gKiBAc3VtbWFyeSBHaXQgd29ya3RyZWUgY3JlYXRpb24gd2l0aCBtb25vcmVwbyBzeW1saW5rIHdpcmluZ1xuICogQG1vZHVsZSB3b3JrdHJlZVxuICovXG5cbmltcG9ydCB7IGV4ZWNGaWxlIH0gZnJvbSAnbm9kZTpjaGlsZF9wcm9jZXNzJztcbmltcG9ydCAqIGFzIGZzIGZyb20gJ25vZGU6ZnMvcHJvbWlzZXMnO1xuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdub2RlOnBhdGgnO1xuaW1wb3J0IHsgcHJvbWlzaWZ5IH0gZnJvbSAnbm9kZTp1dGlsJztcblxuY29uc3QgZXhlY0ZpbGVBc3luYyA9IHByb21pc2lmeShleGVjRmlsZSk7XG5cbi8qKlxuICogVmFsaWRhdGVzIGEgYnJhbmNoIG5hbWUgYWdhaW5zdCB0aGUgQ0xJJ3Mgc2FmZSBzdWJzZXQuXG4gKlxuICogVGhlIG5hbWUgbXVzdCBzdGFydCB3aXRoIGFuIGFscGhhbnVtZXJpYyBjaGFyYWN0ZXIgYW5kIG1heSB0aGVuIGluY2x1ZGVcbiAqIGFscGhhbnVtZXJpY3MsIHNsYXNoZXMsIHVuZGVyc2NvcmVzLCBvciBkYXNoZXMuXG4gKlxuICogQHBhcmFtIG5hbWUgLSBDYW5kaWRhdGUgYnJhbmNoIG5hbWUgc3VwcGxpZWQgYnkgdGhlIGNhbGxlci5cbiAqIEB0aHJvd3Mge0Vycm9yfSBXaGVuIHRoZSBicmFuY2ggbmFtZSBkb2VzIG5vdCBtYXRjaCB0aGUgc3VwcG9ydGVkIGZvcm1hdC5cbiAqIEByZXR1cm5zIE5vIHZhbHVlLiBUaHJvd3Mgb24gaW52YWxpZCBpbnB1dC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHZhbGlkYXRlQnJhbmNoTmFtZShuYW1lOiBzdHJpbmcpOiB2b2lkIHtcbiAgY29uc3QgYnJhbmNoTmFtZVJlZ2V4ID0gL15bYS16QS1aMC05XVthLXpBLVowLTkvXy1dKiQvO1xuICBpZiAoIWJyYW5jaE5hbWVSZWdleC50ZXN0KG5hbWUpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdFcnJvcjogSW52YWxpZCBicmFuY2ggbmFtZSBmb3JtYXQuJyk7XG4gIH1cbn1cblxuLyoqXG4gKiBEZXRlcm1pbmVzIHdoZXRoZXIgYSByZWxhdGl2ZSBwYXRoIGlzIG5lc3RlZCB1bmRlciBhbnkga25vd24gcGFyZW50IHBhdGguXG4gKlxuICogVGhlIGNoZWNrIHdhbGtzIGFuY2VzdG9yIHNlZ21lbnRzIG9mIGBkaXJgIGFuZCByZXR1cm5zIHRydWUgb24gdGhlIGZpcnN0XG4gKiBtYXRjaCBpbiBgcGFyZW50U2V0YC5cbiAqXG4gKiBAcGFyYW0gZGlyIC0gUmVsYXRpdmUgcGF0aCB0byB0ZXN0LlxuICogQHBhcmFtIHBhcmVudFNldCAtIENhbmRpZGF0ZSBwYXJlbnQgZGlyZWN0b3JpZXMgcmVwcmVzZW50ZWQgYXMgcmVsYXRpdmUgcGF0aHMuXG4gKiBAcmV0dXJucyBUcnVlIHdoZW4gYGRpcmAgaXMgbmVzdGVkIHVuZGVyIGEgcGF0aCBpbiBgcGFyZW50U2V0YC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzTmVzdGVkVW5kZXIoZGlyOiBzdHJpbmcsIHBhcmVudFNldDogU2V0PHN0cmluZz4pOiBib29sZWFuIHtcbiAgbGV0IGN1cnJlbnQgPSBkaXI7XG4gIHdoaWxlIChjdXJyZW50LmluY2x1ZGVzKCcvJykpIHtcbiAgICBjdXJyZW50ID0gY3VycmVudC5zdWJzdHJpbmcoMCwgY3VycmVudC5sYXN0SW5kZXhPZignLycpKTtcbiAgICBpZiAocGFyZW50U2V0LmhhcyhjdXJyZW50KSkge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICB9XG4gIHJldHVybiBmYWxzZTtcbn1cblxuLyoqXG4gKiBDaGVja3Mgd2hldGhlciBhIHN5bWxpbmsgdGFyZ2V0IHBvaW50cyB0byBrbm93biBtb25vcmVwby1pbnRlcm5hbCBsb2NhdGlvbnMuXG4gKlxuICogSW50ZXJuYWwgdGFyZ2V0cyBhcmUgcHJlc2VydmVkIGFzIHJlbGF0aXZlIGxpbmtzIGR1cmluZyBub2RlX21vZHVsZXMgcmVyb3V0ZVxuICogc28gd29ya3NwYWNlIGxpbmtzIGtlZXAgd29ya2luZyBpbnNpZGUgYSB3b3JrdHJlZS5cbiAqXG4gKiBAcGFyYW0gdGFyZ2V0IC0gU3ltbGluayB0YXJnZXQgcmVhZCBmcm9tIHRoZSBzb3VyY2Ugbm9kZV9tb2R1bGVzIGVudHJ5LlxuICogQHJldHVybnMgVHJ1ZSB3aGVuIHRoZSB0YXJnZXQgc3RhcnRzIHdpdGggYW4gaW50ZXJuYWwgcHJlZml4LlxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNJbnRlcm5hbFN5bWxpbmsodGFyZ2V0OiBzdHJpbmcpOiBib29sZWFuIHtcbiAgcmV0dXJuIHRhcmdldC5zdGFydHNXaXRoKCcuLi8nKTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBDcmVhdGVXb3JrdHJlZVJlc3VsdCB7XG4gIGJyYW5jaDogc3RyaW5nO1xuICB3b3JrdHJlZTogc3RyaW5nO1xuICBiYXNlU2hhOiBzdHJpbmc7XG4gIHJlcm91dGVkU3ltbGlua3M/OiBudW1iZXI7XG59XG5cbi8qKlxuICogQ3JlYXRlcyBhbmQgY29uZmlndXJlcyBhIG5ldyBnaXQgd29ya3RyZWUuXG4gKlxuICogVGhlIHdvcmtmbG93IHZhbGlkYXRlcyB0aGUgcmVmLCBjcmVhdGVzIHRoZSB3b3JrdHJlZSwgbWlycm9ycyBleGlzdGluZyByb290XG4gKiBzeW1saW5rcywgc3ltbGlua3MgaWdub3JlZCBwYXRocywgcmVyb3V0ZXMgbm9kZV9tb2R1bGVzIGxpbmtzLCBhbmQgdXBkYXRlc1xuICogcGVyLXdvcmt0cmVlIGdpdCBleGNsdWRlcy5cbiAqXG4gKiBXaGVuIGByZWZgIGlzIGEgYnJhbmNoIG5hbWUsIHRoZSB3b3JrdHJlZSBjaGVja3Mgb3V0IHRoYXQgYnJhbmNoIChjcmVhdGluZ1xuICogaXQgaWYgbmVlZGVkKS4gV2hlbiBgcmVmYCBpcyBhIHRhZyBvciBjb21taXQgU0hBLCB0aGUgd29ya3RyZWUgaXMgY3JlYXRlZFxuICogaW4gZGV0YWNoZWQgSEVBRCBtb2RlLlxuICpcbiAqIEBwYXJhbSByZWYgLSBCcmFuY2ggbmFtZSwgdGFnIG5hbWUsIG9yIGNvbW1pdCBTSEEuXG4gKiBAcGFyYW0gb3B0aW9ucyAtIE9wdGlvbmFsIGNvbmZpZ3VyYXRpb24uXG4gKiBAcGFyYW0gb3B0aW9ucy5jd2QgLSBXb3JraW5nIGRpcmVjdG9yeSB0byB1c2Ugd2hlbiBsb2NhdGluZyBnaXQgcm9vdHMuIERlZmF1bHRzIHRvIGBwcm9jZXNzLmN3ZCgpYC5cbiAqIEByZXR1cm5zIE1ldGFkYXRhIGRlc2NyaWJpbmcgdGhlIGNyZWF0ZWQgd29ya3RyZWUgYW5kIGJhc2UgY29tbWl0LlxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gY3JlYXRlV29ya3RyZWUocmVmOiBzdHJpbmcsIG9wdGlvbnM/OiB7IGN3ZD86IHN0cmluZyB9KTogUHJvbWlzZTxDcmVhdGVXb3JrdHJlZVJlc3VsdD4ge1xuICBjb25zdCB7IHNvdXJjZVJvb3QsIHJlcG9Sb290IH0gPSBhd2FpdCBmaW5kR2l0Um9vdHMob3B0aW9ucz8uY3dkID8/IHByb2Nlc3MuY3dkKCkpO1xuXG4gIC8vIERldGVybWluZSB3aGV0aGVyIHRoaXMgaXMgYW4gZXhpc3RpbmcgcmVmIG9yIGEgbmV3IGJyYW5jaCBuYW1lLlxuICAvLyByZXNvbHZlUmVmVHlwZSB0aHJvd3MgZm9yIHVua25vd24gcmVmczsgYSB2YWxpZCBicmFuY2ggbmFtZSB0aGF0XG4gIC8vIGRvZXNuJ3QgZXhpc3QgeWV0IGlzIHRyZWF0ZWQgYXMgYSBuZXcgYnJhbmNoIHRvIGNyZWF0ZS5cbiAgbGV0IHJlZlR5cGU6ICdicmFuY2gnIHwgJ3RhZycgfCAnY29tbWl0JztcbiAgdHJ5IHtcbiAgICByZWZUeXBlID0gYXdhaXQgcmVzb2x2ZVJlZlR5cGUocmVwb1Jvb3QsIHJlZik7XG4gIH0gY2F0Y2gge1xuICAgIHZhbGlkYXRlQnJhbmNoTmFtZShyZWYpO1xuICAgIHJlZlR5cGUgPSAnYnJhbmNoJztcbiAgfVxuXG4gIGlmIChyZWZUeXBlID09PSAnYnJhbmNoJykge1xuICAgIHZhbGlkYXRlQnJhbmNoTmFtZShyZWYpO1xuICB9XG5cbiAgY29uc3Qgd29ya3RyZWVEaXIgPSBwYXRoLmpvaW4ocmVwb1Jvb3QsICcud29ya3RyZWVzJywgcmVmKTtcblxuICBjb25zdCB3b3JrdHJlZUV4aXN0cyA9IGF3YWl0IGNoZWNrV29ya3RyZWVFeGlzdHMocmVwb1Jvb3QsIHdvcmt0cmVlRGlyKTtcbiAgaWYgKHdvcmt0cmVlRXhpc3RzKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBFcnJvcjogV29ya3RyZWUgYWxyZWFkeSBleGlzdHMgYXQgJHt3b3JrdHJlZURpcn1gKTtcbiAgfVxuXG4gIGF3YWl0IGNsZWFuU3RhbGVXb3JrdHJlZURpcihyZXBvUm9vdCwgd29ya3RyZWVEaXIpO1xuXG4gIGlmIChyZWZUeXBlID09PSAnYnJhbmNoJykge1xuICAgIGNvbnN0IHN0YXJ0UG9pbnQgPSBhd2FpdCByZXNvbHZlSGVhZChzb3VyY2VSb290KTtcbiAgICBjb25zdCBicmFuY2hFeGlzdHMgPSBhd2FpdCBjaGVja0JyYW5jaEV4aXN0cyhyZXBvUm9vdCwgcmVmKTtcbiAgICBhd2FpdCBhZGRXb3JrdHJlZSh7IHJlcG9Sb290LCB3b3JrdHJlZURpciwgYnJhbmNoTmFtZTogcmVmLCBicmFuY2hFeGlzdHMsIHN0YXJ0UG9pbnQgfSk7XG4gIH0gZWxzZSB7XG4gICAgYXdhaXQgYWRkRGV0YWNoZWRXb3JrdHJlZShyZXBvUm9vdCwgd29ya3RyZWVEaXIsIHJlZik7XG4gIH1cblxuICBjb25zdCBpZ25vcmVkID0gYXdhaXQgZGlzY292ZXJJZ25vcmVkUGF0aHMoc291cmNlUm9vdCk7XG4gIGF3YWl0IGNvcHlFeGlzdGluZ1N5bWxpbmtzKHNvdXJjZVJvb3QsIHdvcmt0cmVlRGlyKTtcbiAgYXdhaXQgc3ltbGlua0lnbm9yZWRQYXRocyh7IHNvdXJjZVJvb3QsIHdvcmt0cmVlRGlyLCBpZ25vcmVkIH0pO1xuXG4gIGNvbnN0IHJlcm91dGVkQ291bnQgPSBhd2FpdCByZXJvdXRlQWxsTm9kZU1vZHVsZXMoeyBzb3VyY2VSb290LCB3b3JrdHJlZURpciwgcmVwb1Jvb3QgfSk7XG5cbiAgY29uc3QgWywgYmFzZVNoYV0gPSBhd2FpdCBQcm9taXNlLmFsbChbXG4gICAgdXBkYXRlR2l0RXhjbHVkZSh7IHdvcmt0cmVlRGlyLCByZXBvUm9vdCwgZGlyZWN0b3JpZXM6IGlnbm9yZWQuZGlyZWN0b3JpZXMsIGZpbGVzOiBpZ25vcmVkLmZpbGVzIH0pLFxuICAgIHJlc29sdmVIZWFkKHdvcmt0cmVlRGlyKVxuICBdKTtcblxuICBjb25zdCByZXN1bHQ6IENyZWF0ZVdvcmt0cmVlUmVzdWx0ID0ge1xuICAgIGJyYW5jaDogcmVmLFxuICAgIHdvcmt0cmVlOiB3b3JrdHJlZURpcixcbiAgICBiYXNlU2hhXG4gIH07XG5cbiAgaWYgKHJlcm91dGVkQ291bnQgPiAwKSB7XG4gICAgcmVzdWx0LnJlcm91dGVkU3ltbGlua3MgPSByZXJvdXRlZENvdW50O1xuICB9XG5cbiAgcmV0dXJuIHJlc3VsdDtcbn1cblxuLyoqXG4gKiBSZW1vdmVzIHN0YWxlIGRpcmVjdG9yeSByZW1uYW50cyBsZWZ0IGJ5IGEgY3Jhc2hlZCBwcmV2aW91cyBzZXNzaW9uLlxuICpcbiAqIEdpdCBkb2Vzbid0IHRyYWNrIHRoZSB3b3JrdHJlZSwgYnV0IHRoZSBkaXJlY3RvcnkgbWF5IHN0aWxsIGV4aXN0IG9uIGRpc2ssXG4gKiB3aGljaCBjYXVzZXMgYGdpdCB3b3JrdHJlZSBhZGRgIHRvIGZhaWwgd2l0aCBcImFscmVhZHkgZXhpc3RzXCIuXG4gKlxuICogQHBhcmFtIHJlcG9Sb290IC0gUHJpbWFyeSByZXBvc2l0b3J5IHJvb3Qgd2hlcmUgZ2l0IGNvbW1hbmRzIHJ1bi5cbiAqIEBwYXJhbSB3b3JrdHJlZURpciAtIEFic29sdXRlIHdvcmt0cmVlIHBhdGggYmVpbmcgY3JlYXRlZC5cbiAqL1xuYXN5bmMgZnVuY3Rpb24gY2xlYW5TdGFsZVdvcmt0cmVlRGlyKHJlcG9Sb290OiBzdHJpbmcsIHdvcmt0cmVlRGlyOiBzdHJpbmcpOiBQcm9taXNlPHZvaWQ+IHtcbiAgdHJ5IHtcbiAgICBhd2FpdCBmcy5hY2Nlc3Mod29ya3RyZWVEaXIpO1xuICAgIGF3YWl0IGZzLnJtKHdvcmt0cmVlRGlyLCB7IHJlY3Vyc2l2ZTogdHJ1ZSB9KTtcbiAgICBhd2FpdCBleGVjRmlsZUFzeW5jKCdnaXQnLCBbJ3dvcmt0cmVlJywgJ3BydW5lJ10sIHsgY3dkOiByZXBvUm9vdCwgdGltZW91dDogMzBfMDAwIH0pO1xuICB9IGNhdGNoIChlcnJvcjogdW5rbm93bikge1xuICAgIGlmICgoZXJyb3IgYXMgTm9kZUpTLkVycm5vRXhjZXB0aW9uKS5jb2RlICE9PSAnRU5PRU5UJykge1xuICAgICAgdGhyb3cgZXJyb3I7XG4gICAgfVxuICB9XG59XG5cbmludGVyZmFjZSBHaXRSb290cyB7XG4gIHNvdXJjZVJvb3Q6IHN0cmluZztcbiAgcmVwb1Jvb3Q6IHN0cmluZztcbn1cblxuLyoqXG4gKiBMb2NhdGVzIHRoZSBjdXJyZW50IGdpdCBzb3VyY2Ugcm9vdCBhbmQgcHJpbWFyeSByZXBvc2l0b3J5IHJvb3QuXG4gKlxuICogU3VwcG9ydHMgYm90aCBzdGFuZGFyZCBjaGVja291dHMgKGAuZ2l0YCBkaXJlY3RvcnkpIGFuZCB3b3JrdHJlZSBjaGVja291dHNcbiAqIChgLmdpdGAgZmlsZSBwb2ludGluZyBpbnRvIGAuZ2l0L3dvcmt0cmVlcy8uLi5gKS5cbiAqXG4gKiBAcGFyYW0gc3RhcnREaXIgLSBEaXJlY3Rvcnkgd2hlcmUgdXB3YXJkIHNlYXJjaCBiZWdpbnMuXG4gKiBAdGhyb3dzIHtFcnJvcn0gV2hlbiBubyBnaXQgcmVwb3NpdG9yeSBtYXJrZXIgaXMgZm91bmQuXG4gKiBAcmV0dXJucyBQYXRocyBmb3IgdGhlIGN1cnJlbnQgY2hlY2tvdXQgcm9vdCBhbmQgdGhlIHByaW1hcnkgcmVwbyByb290LlxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZmluZEdpdFJvb3RzKHN0YXJ0RGlyOiBzdHJpbmcpOiBQcm9taXNlPEdpdFJvb3RzPiB7XG4gIGxldCBjdXJyZW50RGlyID0gcGF0aC5yZXNvbHZlKHN0YXJ0RGlyKTtcbiAgd2hpbGUgKGN1cnJlbnREaXIgIT09ICcvJykge1xuICAgIGNvbnN0IGdpdFBhdGggPSBwYXRoLmpvaW4oY3VycmVudERpciwgJy5naXQnKTtcbiAgICB0cnkge1xuICAgICAgY29uc3Qgc3RhdHMgPSBhd2FpdCBmcy5sc3RhdChnaXRQYXRoKTtcbiAgICAgIGlmIChzdGF0cy5pc0RpcmVjdG9yeSgpKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgc291cmNlUm9vdDogY3VycmVudERpcixcbiAgICAgICAgICByZXBvUm9vdDogY3VycmVudERpclxuICAgICAgICB9O1xuICAgICAgfVxuICAgICAgaWYgKHN0YXRzLmlzRmlsZSgpKSB7XG4gICAgICAgIGNvbnN0IGdpdEZpbGVDb250ZW50ID0gYXdhaXQgZnMucmVhZEZpbGUoZ2l0UGF0aCwgJ3V0Zi04Jyk7XG4gICAgICAgIGNvbnN0IGdpdGRpckxpbmUgPSBnaXRGaWxlQ29udGVudC50cmltKCk7XG4gICAgICAgIGNvbnN0IGdpdGRpclBhdGggPSBnaXRkaXJMaW5lLnJlcGxhY2UoL15naXRkaXI6XFxzKi8sICcnKTtcbiAgICAgICAgY29uc3QgbWFpbkdpdERpciA9IGdpdGRpclBhdGgucmVwbGFjZSgvXFwvd29ya3RyZWVzXFwvW14vXSskLywgJycpO1xuICAgICAgICBjb25zdCByZXBvUm9vdCA9IG1haW5HaXREaXIucmVwbGFjZSgvXFwvXFwuZ2l0JC8sICcnKTtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICBzb3VyY2VSb290OiBjdXJyZW50RGlyLFxuICAgICAgICAgIHJlcG9Sb290XG4gICAgICAgIH07XG4gICAgICB9XG4gICAgfSBjYXRjaCAoZXJyb3I6IHVua25vd24pIHtcbiAgICAgIGlmICgoZXJyb3IgYXMgTm9kZUpTLkVycm5vRXhjZXB0aW9uKS5jb2RlICE9PSAnRU5PRU5UJykge1xuICAgICAgICB0aHJvdyBlcnJvcjtcbiAgICAgIH1cbiAgICB9XG4gICAgY3VycmVudERpciA9IHBhdGguZGlybmFtZShjdXJyZW50RGlyKTtcbiAgfVxuICB0aHJvdyBuZXcgRXJyb3IoJ05vdCBpbiBhIGdpdCByZXBvc2l0b3J5Jyk7XG59XG5cbi8qKlxuICogUmVzb2x2ZXMgdGhlIEhFQUQgY29tbWl0IFNIQSBmb3IgYSByZXBvc2l0b3J5IGRpcmVjdG9yeS5cbiAqXG4gKiBAcGFyYW0gY3dkIC0gUmVwb3NpdG9yeSBkaXJlY3RvcnkgcGFzc2VkIHRvIGBnaXQgcmV2LXBhcnNlIEhFQURgLlxuICogQHJldHVybnMgVHJpbW1lZCBjb21taXQgU0hBIHN0cmluZy5cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHJlc29sdmVIZWFkKGN3ZDogc3RyaW5nKTogUHJvbWlzZTxzdHJpbmc+IHtcbiAgY29uc3QgeyBzdGRvdXQgfSA9IGF3YWl0IGV4ZWNGaWxlQXN5bmMoJ2dpdCcsIFsncmV2LXBhcnNlJywgJ0hFQUQnXSwgeyBjd2QsIHRpbWVvdXQ6IDVfMDAwIH0pO1xuICByZXR1cm4gc3Rkb3V0LnRyaW0oKTtcbn1cblxuLyoqXG4gKiBDaGVja3Mgd2hldGhlciBhIHdvcmt0cmVlIHBhdGggaXMgYWxyZWFkeSByZWdpc3RlcmVkIHdpdGggZ2l0LlxuICpcbiAqIEBwYXJhbSByZXBvUm9vdCAtIFByaW1hcnkgcmVwb3NpdG9yeSByb290IHdoZXJlIGdpdCBjb21tYW5kcyBydW4uXG4gKiBAcGFyYW0gd29ya3RyZWVEaXIgLSBBYnNvbHV0ZSB3b3JrdHJlZSBwYXRoIGJlaW5nIGNyZWF0ZWQuXG4gKiBAcmV0dXJucyBUcnVlIHdoZW4gYGdpdCB3b3JrdHJlZSBsaXN0YCBhbHJlYWR5IGNvbnRhaW5zIGB3b3JrdHJlZURpcmAuXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBjaGVja1dvcmt0cmVlRXhpc3RzKHJlcG9Sb290OiBzdHJpbmcsIHdvcmt0cmVlRGlyOiBzdHJpbmcpOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgY29uc3QgeyBzdGRvdXQgfSA9IGF3YWl0IGV4ZWNGaWxlQXN5bmMoJ2dpdCcsIFsnd29ya3RyZWUnLCAnbGlzdCddLCB7IGN3ZDogcmVwb1Jvb3QsIHRpbWVvdXQ6IDMwXzAwMCB9KTtcbiAgcmV0dXJuIHN0ZG91dC5pbmNsdWRlcyh3b3JrdHJlZURpcik7XG59XG5cbi8qKlxuICogQ2hlY2tzIHdoZXRoZXIgYSBicmFuY2ggYWxyZWFkeSBleGlzdHMgaW4gdGhlIHJlcG9zaXRvcnkuXG4gKlxuICogQHBhcmFtIHJlcG9Sb290IC0gUHJpbWFyeSByZXBvc2l0b3J5IHJvb3Qgd2hlcmUgZ2l0IGNvbW1hbmRzIHJ1bi5cbiAqIEBwYXJhbSBicmFuY2hOYW1lIC0gQnJhbmNoIG5hbWUgdG8gcXVlcnkuXG4gKiBAcmV0dXJucyBUcnVlIHdoZW4gYXQgbGVhc3Qgb25lIG1hdGNoaW5nIGxvY2FsIGJyYW5jaCBpcyBsaXN0ZWQuXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBjaGVja0JyYW5jaEV4aXN0cyhyZXBvUm9vdDogc3RyaW5nLCBicmFuY2hOYW1lOiBzdHJpbmcpOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgY29uc3QgeyBzdGRvdXQgfSA9IGF3YWl0IGV4ZWNGaWxlQXN5bmMoJ2dpdCcsIFsnYnJhbmNoJywgJy0tbGlzdCcsIGJyYW5jaE5hbWVdLCB7XG4gICAgY3dkOiByZXBvUm9vdCxcbiAgICB0aW1lb3V0OiAzMF8wMDBcbiAgfSk7XG4gIHJldHVybiBzdGRvdXQudHJpbSgpLmxlbmd0aCA+IDA7XG59XG5cbi8qKlxuICogRGV0ZXJtaW5lcyB3aGV0aGVyIGEgZ2l0IHJlZiBpcyBhIGJyYW5jaCwgdGFnLCBvciBjb21taXQgU0hBLlxuICpcbiAqIENoZWNrcyBsb2NhbCBicmFuY2hlcyBmaXJzdCwgdGhlbiB0YWdzLCB0aGVuIGZhbGxzIGJhY2sgdG8gdmVyaWZ5aW5nXG4gKiB0aGUgcmVmIHJlc29sdmVzIGFzIGEgY29tbWl0LlxuICpcbiAqIEBwYXJhbSByZXBvUm9vdCAtIFByaW1hcnkgcmVwb3NpdG9yeSByb290IHdoZXJlIGdpdCBjb21tYW5kcyBydW4uXG4gKiBAcGFyYW0gcmVmIC0gVGhlIHJlZiB0byBjbGFzc2lmeS5cbiAqIEB0aHJvd3Mge0Vycm9yfSBXaGVuIHRoZSByZWYgZG9lcyBub3QgcmVzb2x2ZSB0byBhbnkga25vd24gZ2l0IG9iamVjdC5cbiAqIEByZXR1cm5zIFRoZSByZWYgdHlwZTogYCdicmFuY2gnYCwgYCd0YWcnYCwgb3IgYCdjb21taXQnYC5cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHJlc29sdmVSZWZUeXBlKHJlcG9Sb290OiBzdHJpbmcsIHJlZjogc3RyaW5nKTogUHJvbWlzZTwnYnJhbmNoJyB8ICd0YWcnIHwgJ2NvbW1pdCc+IHtcbiAgY29uc3QgYnJhbmNoRXhpc3RzID0gYXdhaXQgY2hlY2tCcmFuY2hFeGlzdHMocmVwb1Jvb3QsIHJlZik7XG4gIGlmIChicmFuY2hFeGlzdHMpIHJldHVybiAnYnJhbmNoJztcblxuICBjb25zdCB7IHN0ZG91dDogdGFnT3V0cHV0IH0gPSBhd2FpdCBleGVjRmlsZUFzeW5jKCdnaXQnLCBbJ3RhZycsICctLWxpc3QnLCByZWZdLCB7XG4gICAgY3dkOiByZXBvUm9vdCxcbiAgICB0aW1lb3V0OiAzMF8wMDBcbiAgfSk7XG4gIGlmICh0YWdPdXRwdXQudHJpbSgpLmxlbmd0aCA+IDApIHJldHVybiAndGFnJztcblxuICB0cnkge1xuICAgIGF3YWl0IGV4ZWNGaWxlQXN5bmMoJ2dpdCcsIFsncmV2LXBhcnNlJywgJy0tdmVyaWZ5JywgYCR7cmVmfV57Y29tbWl0fWBdLCB7XG4gICAgICBjd2Q6IHJlcG9Sb290LFxuICAgICAgdGltZW91dDogNV8wMDBcbiAgICB9KTtcbiAgICByZXR1cm4gJ2NvbW1pdCc7XG4gIH0gY2F0Y2gge1xuICAgIHRocm93IG5ldyBFcnJvcihgRXJyb3I6ICcke3JlZn0nIGRvZXMgbm90IHJlc29sdmUgdG8gYSBicmFuY2gsIHRhZywgb3IgY29tbWl0LmApO1xuICB9XG59XG5cbmludGVyZmFjZSBBZGRXb3JrdHJlZU9wdGlvbnMge1xuICByZXBvUm9vdDogc3RyaW5nO1xuICB3b3JrdHJlZURpcjogc3RyaW5nO1xuICBicmFuY2hOYW1lOiBzdHJpbmc7XG4gIGJyYW5jaEV4aXN0czogYm9vbGVhbjtcbiAgc3RhcnRQb2ludDogc3RyaW5nO1xufVxuXG4vKipcbiAqIEFkZHMgYSBnaXQgd29ya3RyZWUsIGNyZWF0aW5nIHRoZSBicmFuY2ggd2hlbiBuZWVkZWQuXG4gKlxuICogVXNlcyBgZ2l0IHdvcmt0cmVlIGFkZCAtYmAgZm9yIG5ldyBicmFuY2hlcyBhbmQgcGxhaW4gYGdpdCB3b3JrdHJlZSBhZGRgXG4gKiB3aGVuIGF0dGFjaGluZyB0byBhbiBleGlzdGluZyBicmFuY2guXG4gKlxuICogQHBhcmFtIG9wdHMgLSBXb3JrdHJlZSBjcmVhdGlvbiBvcHRpb25zIGFuZCBicmFuY2ggZXhpc3RlbmNlIHN0YXRlLlxuICogQHJldHVybnMgTm8gdmFsdWUuXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBhZGRXb3JrdHJlZShvcHRzOiBBZGRXb3JrdHJlZU9wdGlvbnMpOiBQcm9taXNlPHZvaWQ+IHtcbiAgY29uc3QgYXJncyA9IG9wdHMuYnJhbmNoRXhpc3RzXG4gICAgPyBbJ3dvcmt0cmVlJywgJ2FkZCcsIG9wdHMud29ya3RyZWVEaXIsIG9wdHMuYnJhbmNoTmFtZV1cbiAgICA6IFsnd29ya3RyZWUnLCAnYWRkJywgJy1iJywgb3B0cy5icmFuY2hOYW1lLCBvcHRzLndvcmt0cmVlRGlyLCBvcHRzLnN0YXJ0UG9pbnRdO1xuICBhd2FpdCBleGVjRmlsZUFzeW5jKCdnaXQnLCBhcmdzLCB7IGN3ZDogb3B0cy5yZXBvUm9vdCwgdGltZW91dDogMzBfMDAwIH0pO1xufVxuXG4vKipcbiAqIEFkZHMgYSBnaXQgd29ya3RyZWUgaW4gZGV0YWNoZWQgSEVBRCBtb2RlIGF0IHRoZSBnaXZlbiByZWYuXG4gKlxuICogVXNlZCBmb3IgdGFncyBhbmQgY29tbWl0IFNIQXMgd2hlcmUgbm8gYnJhbmNoIGFzc29jaWF0aW9uIGlzIG5lZWRlZC5cbiAqXG4gKiBAcGFyYW0gcmVwb1Jvb3QgLSBQcmltYXJ5IHJlcG9zaXRvcnkgcm9vdCB3aGVyZSBnaXQgY29tbWFuZHMgcnVuLlxuICogQHBhcmFtIHdvcmt0cmVlRGlyIC0gQWJzb2x1dGUgcGF0aCBmb3IgdGhlIG5ldyB3b3JrdHJlZS5cbiAqIEBwYXJhbSByZWYgLSBUYWcgbmFtZSBvciBjb21taXQgU0hBIHRvIGNoZWNrIG91dC5cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGFkZERldGFjaGVkV29ya3RyZWUocmVwb1Jvb3Q6IHN0cmluZywgd29ya3RyZWVEaXI6IHN0cmluZywgcmVmOiBzdHJpbmcpOiBQcm9taXNlPHZvaWQ+IHtcbiAgYXdhaXQgZXhlY0ZpbGVBc3luYygnZ2l0JywgWyd3b3JrdHJlZScsICdhZGQnLCAnLS1kZXRhY2gnLCB3b3JrdHJlZURpciwgcmVmXSwge1xuICAgIGN3ZDogcmVwb1Jvb3QsXG4gICAgdGltZW91dDogMzBfMDAwXG4gIH0pO1xufVxuXG5pbnRlcmZhY2UgSWdub3JlZFBhdGhzIHtcbiAgZGlyZWN0b3JpZXM6IHN0cmluZ1tdO1xuICBmaWxlczogc3RyaW5nW107XG59XG5cbi8qKlxuICogRGlzY292ZXJzIGlnbm9yZWQgZmlsZXMgYW5kIGRpcmVjdG9yaWVzIHVuZGVyIGEgc291cmNlIHJvb3QuXG4gKlxuICogUGF0aHMgYXJlIHJldHVybmVkIHJlbGF0aXZlIHRvIGBzb3VyY2VSb290YCBhbmQgYC53b3JrdHJlZXNgIGNvbnRlbnQgaXNcbiAqIGZpbHRlcmVkIG91dCB0byBhdm9pZCBzZWxmLXJlZmVyZW50aWFsIHN5bWxpbmtpbmcuXG4gKlxuICogQHBhcmFtIHNvdXJjZVJvb3QgLSBTb3VyY2UgY2hlY2tvdXQgcm9vdCB1c2VkIGZvciBnaXQgZGlzY292ZXJ5LlxuICogQHJldHVybnMgU2VwYXJhdGUgbGlzdHMgb2YgaWdub3JlZCBkaXJlY3RvcmllcyBhbmQgaWdub3JlZCBmaWxlcy5cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGRpc2NvdmVySWdub3JlZFBhdGhzKHNvdXJjZVJvb3Q6IHN0cmluZyk6IFByb21pc2U8SWdub3JlZFBhdGhzPiB7XG4gIGNvbnN0IHsgc3Rkb3V0IH0gPSBhd2FpdCBleGVjRmlsZUFzeW5jKFxuICAgICdnaXQnLFxuICAgIFsnLUMnLCBzb3VyY2VSb290LCAnbHMtZmlsZXMnLCAnLS1pZ25vcmVkJywgJy0tZXhjbHVkZS1zdGFuZGFyZCcsICctLWRpcmVjdG9yeScsICctLW90aGVycyddLFxuICAgIHsgY3dkOiBzb3VyY2VSb290LCB0aW1lb3V0OiAzMF8wMDAgfVxuICApO1xuXG4gIGNvbnN0IGxpbmVzID0gc3Rkb3V0LnNwbGl0KCdcXG4nKS5maWx0ZXIoKGxpbmUpID0+IGxpbmUubGVuZ3RoID4gMCAmJiAhbGluZS5zdGFydHNXaXRoKCcud29ya3RyZWVzJykpO1xuICBjb25zdCBkaXJlY3RvcmllcyA9IGxpbmVzLmZpbHRlcigobCkgPT4gbC5lbmRzV2l0aCgnLycpKS5tYXAoKGwpID0+IGwuc2xpY2UoMCwgLTEpKTtcbiAgY29uc3QgZmlsZXMgPSBsaW5lcy5maWx0ZXIoKGwpID0+ICFsLmVuZHNXaXRoKCcvJykpO1xuXG4gIHJldHVybiB7IGRpcmVjdG9yaWVzLCBmaWxlcyB9O1xufVxuXG5pbnRlcmZhY2UgU3ltbGlua0lnbm9yZWRQYXRoc09wdGlvbnMge1xuICBzb3VyY2VSb290OiBzdHJpbmc7XG4gIHdvcmt0cmVlRGlyOiBzdHJpbmc7XG4gIGlnbm9yZWQ6IElnbm9yZWRQYXRocztcbn1cblxuaW50ZXJmYWNlIFN5bWxpbmtJZ25vcmVkUGF0aHNSZXN1bHQge1xuICBkaXJDb3VudDogbnVtYmVyO1xuICBmaWxlQ291bnQ6IG51bWJlcjtcbn1cblxuLyoqXG4gKiBTeW1saW5rcyBpZ25vcmVkIGRpcmVjdG9yaWVzIGFuZCBmaWxlcyBmcm9tIHNvdXJjZSBjaGVja291dCBpbnRvIGEgd29ya3RyZWUuXG4gKlxuICogTmVzdGVkIGlnbm9yZWQgZGlyZWN0b3JpZXMgYXJlIGNvbGxhcHNlZCBzbyBvbmx5IHRvcC1sZXZlbCBpZ25vcmVkIGRpcmVjdG9yeVxuICogbGlua3MgYXJlIGNyZWF0ZWQuXG4gKlxuICogQHBhcmFtIG9wdHMgLSBTb3VyY2Ugcm9vdCwgZGVzdGluYXRpb24gd29ya3RyZWUsIGFuZCBpZ25vcmVkIHBhdGggbGlzdHMuXG4gKiBAcmV0dXJucyBDb3VudHMgb2Ygc3VjY2Vzc2Z1bGx5IGNyZWF0ZWQgZGlyZWN0b3J5IGFuZCBmaWxlIHN5bWxpbmtzLlxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gc3ltbGlua0lnbm9yZWRQYXRocyhvcHRzOiBTeW1saW5rSWdub3JlZFBhdGhzT3B0aW9ucyk6IFByb21pc2U8U3ltbGlua0lnbm9yZWRQYXRoc1Jlc3VsdD4ge1xuICBjb25zdCB7IHNvdXJjZVJvb3QsIHdvcmt0cmVlRGlyLCBpZ25vcmVkIH0gPSBvcHRzO1xuICBjb25zdCBkaXJTZXQgPSBuZXcgU2V0KGlnbm9yZWQuZGlyZWN0b3JpZXMpO1xuICBjb25zdCBub25OZXN0ZWREaXJzID0gaWdub3JlZC5kaXJlY3Rvcmllcy5maWx0ZXIoKGRpcikgPT4gIWlzTmVzdGVkVW5kZXIoZGlyLCBkaXJTZXQpKTtcblxuICBjb25zdCBjcmVhdGVEaXJTeW1saW5rID0gYXN5bmMgKGRpcjogc3RyaW5nKTogUHJvbWlzZTxib29sZWFuPiA9PiB7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHNvdXJjZVBhdGggPSBwYXRoLmpvaW4oc291cmNlUm9vdCwgZGlyKTtcbiAgICAgIHRyeSB7XG4gICAgICAgIGF3YWl0IGZzLmxzdGF0KHNvdXJjZVBhdGgpO1xuICAgICAgfSBjYXRjaCAoZXJyb3I6IHVua25vd24pIHtcbiAgICAgICAgaWYgKChlcnJvciBhcyBOb2RlSlMuRXJybm9FeGNlcHRpb24pLmNvZGUgPT09ICdFTk9FTlQnKSB7XG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIHByb2Nlc3Muc3RkZXJyLndyaXRlKFxuICAgICAgICAgIGBjcmVhdGUtd29ya3RyZWU6IHVuZXhwZWN0ZWQgZXJyb3IgaW4gbHN0YXQ6ICR7ZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiBTdHJpbmcoZXJyb3IpfVxcbmBcbiAgICAgICAgKTtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgICAgY29uc3QgZGVzdFBhdGggPSBwYXRoLmpvaW4od29ya3RyZWVEaXIsIGRpcik7XG4gICAgICBjb25zdCBwYXJlbnREaXIgPSBwYXRoLmRpcm5hbWUoZGlyKTtcbiAgICAgIGlmIChwYXJlbnREaXIgIT09ICcuJykge1xuICAgICAgICBhd2FpdCBmcy5ta2RpcihwYXRoLmpvaW4od29ya3RyZWVEaXIsIHBhcmVudERpciksIHsgcmVjdXJzaXZlOiB0cnVlIH0pO1xuICAgICAgfVxuICAgICAgYXdhaXQgZnMuc3ltbGluayhzb3VyY2VQYXRoLCBkZXN0UGF0aCk7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9IGNhdGNoIChlcnJvcjogdW5rbm93bikge1xuICAgICAgY29uc3QgY29kZSA9IChlcnJvciBhcyBOb2RlSlMuRXJybm9FeGNlcHRpb24pLmNvZGU7XG4gICAgICBpZiAoY29kZSA9PT0gJ0VFWElTVCcgfHwgY29kZSA9PT0gJ0VOT0VOVCcpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgICAgcHJvY2Vzcy5zdGRlcnIud3JpdGUoXG4gICAgICAgIGBjcmVhdGUtd29ya3RyZWU6IHVuZXhwZWN0ZWQgZXJyb3IgaW4gc3ltbGluazogJHtlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6IFN0cmluZyhlcnJvcil9XFxuYFxuICAgICAgKTtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gIH07XG5cbiAgY29uc3QgY3JlYXRlRmlsZVN5bWxpbmsgPSBhc3luYyAoZmlsZTogc3RyaW5nKTogUHJvbWlzZTxib29sZWFuPiA9PiB7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHNvdXJjZVBhdGggPSBwYXRoLmpvaW4oc291cmNlUm9vdCwgZmlsZSk7XG4gICAgICB0cnkge1xuICAgICAgICBhd2FpdCBmcy5sc3RhdChzb3VyY2VQYXRoKTtcbiAgICAgIH0gY2F0Y2ggKGVycm9yOiB1bmtub3duKSB7XG4gICAgICAgIGlmICgoZXJyb3IgYXMgTm9kZUpTLkVycm5vRXhjZXB0aW9uKS5jb2RlID09PSAnRU5PRU5UJykge1xuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBwcm9jZXNzLnN0ZGVyci53cml0ZShcbiAgICAgICAgICBgY3JlYXRlLXdvcmt0cmVlOiB1bmV4cGVjdGVkIGVycm9yIGluIGxzdGF0OiAke2Vycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogU3RyaW5nKGVycm9yKX1cXG5gXG4gICAgICAgICk7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IGRlc3RQYXRoID0gcGF0aC5qb2luKHdvcmt0cmVlRGlyLCBmaWxlKTtcbiAgICAgIGNvbnN0IHBhcmVudERpciA9IHBhdGguZGlybmFtZShmaWxlKTtcbiAgICAgIGlmIChwYXJlbnREaXIgIT09ICcuJykge1xuICAgICAgICBhd2FpdCBmcy5ta2RpcihwYXRoLmpvaW4od29ya3RyZWVEaXIsIHBhcmVudERpciksIHsgcmVjdXJzaXZlOiB0cnVlIH0pO1xuICAgICAgfVxuICAgICAgYXdhaXQgZnMuc3ltbGluayhzb3VyY2VQYXRoLCBkZXN0UGF0aCk7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9IGNhdGNoIChlcnJvcjogdW5rbm93bikge1xuICAgICAgY29uc3QgY29kZSA9IChlcnJvciBhcyBOb2RlSlMuRXJybm9FeGNlcHRpb24pLmNvZGU7XG4gICAgICBpZiAoY29kZSA9PT0gJ0VFWElTVCcgfHwgY29kZSA9PT0gJ0VOT0VOVCcpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgICAgcHJvY2Vzcy5zdGRlcnIud3JpdGUoXG4gICAgICAgIGBjcmVhdGUtd29ya3RyZWU6IHVuZXhwZWN0ZWQgZXJyb3IgaW4gc3ltbGluazogJHtlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6IFN0cmluZyhlcnJvcil9XFxuYFxuICAgICAgKTtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gIH07XG5cbiAgY29uc3QgZGlyUmVzdWx0cyA9IGF3YWl0IFByb21pc2UuYWxsKG5vbk5lc3RlZERpcnMubWFwKGNyZWF0ZURpclN5bWxpbmspKTtcbiAgY29uc3Qgbm9uTmVzdGVkRmlsZXMgPSBpZ25vcmVkLmZpbGVzLmZpbHRlcigoZmlsZSkgPT4gIWlzTmVzdGVkVW5kZXIoZmlsZSwgZGlyU2V0KSk7XG4gIGNvbnN0IGZpbGVSZXN1bHRzID0gYXdhaXQgUHJvbWlzZS5hbGwobm9uTmVzdGVkRmlsZXMubWFwKGNyZWF0ZUZpbGVTeW1saW5rKSk7XG5cbiAgY29uc3QgZGlyQ291bnQgPSBkaXJSZXN1bHRzLmZpbHRlcigocikgPT4gcikubGVuZ3RoO1xuICBjb25zdCBmaWxlQ291bnQgPSBmaWxlUmVzdWx0cy5maWx0ZXIoKHIpID0+IHIpLmxlbmd0aDtcblxuICByZXR1cm4geyBkaXJDb3VudCwgZmlsZUNvdW50IH07XG59XG5cbi8qKlxuICogUmVwbGljYXRlcyByb290LWxldmVsIHN5bWxpbmtzIGZyb20gdGhlIHNvdXJjZSBjaGVja291dCBpbnRvIHRoZSB3b3JrdHJlZS5cbiAqXG4gKiBFeGlzdGluZyBkZXN0aW5hdGlvbiBlbnRyaWVzIGFyZSBsZWZ0IHVudG91Y2hlZC5cbiAqXG4gKiBAcGFyYW0gc291cmNlUm9vdCAtIFNvdXJjZSBjaGVja291dCByb290LlxuICogQHBhcmFtIHdvcmt0cmVlRGlyIC0gRGVzdGluYXRpb24gd29ya3RyZWUgcm9vdC5cbiAqIEByZXR1cm5zIE51bWJlciBvZiBzeW1saW5rcyBjcmVhdGVkIGluIHRoZSBkZXN0aW5hdGlvbiByb290LlxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gY29weUV4aXN0aW5nU3ltbGlua3Moc291cmNlUm9vdDogc3RyaW5nLCB3b3JrdHJlZURpcjogc3RyaW5nKTogUHJvbWlzZTxudW1iZXI+IHtcbiAgY29uc3QgZW50cmllcyA9IGF3YWl0IGZzLnJlYWRkaXIoc291cmNlUm9vdCwgeyB3aXRoRmlsZVR5cGVzOiB0cnVlIH0pO1xuICBjb25zdCBzeW1saW5rcyA9IGVudHJpZXMuZmlsdGVyKChlKSA9PiBlLmlzU3ltYm9saWNMaW5rKCkgJiYgZS5uYW1lICE9PSAnLmdpdCcgJiYgZS5uYW1lICE9PSAnLndvcmt0cmVlcycpO1xuXG4gIGNvbnN0IGNvcHlTeW1saW5rID0gYXN5bmMgKG5hbWU6IHN0cmluZyk6IFByb21pc2U8Ym9vbGVhbj4gPT4ge1xuICAgIGNvbnN0IGRlc3RQYXRoID0gcGF0aC5qb2luKHdvcmt0cmVlRGlyLCBuYW1lKTtcbiAgICB0cnkge1xuICAgICAgYXdhaXQgZnMubHN0YXQoZGVzdFBhdGgpO1xuICAgICAgcmV0dXJuIGZhbHNlOyAvLyBEZXN0aW5hdGlvbiBhbHJlYWR5IGV4aXN0c1xuICAgIH0gY2F0Y2ggKGVycm9yOiB1bmtub3duKSB7XG4gICAgICBpZiAoKGVycm9yIGFzIE5vZGVKUy5FcnJub0V4Y2VwdGlvbikuY29kZSAhPT0gJ0VOT0VOVCcpIHtcbiAgICAgICAgdGhyb3cgZXJyb3I7XG4gICAgICB9XG4gICAgfVxuICAgIGNvbnN0IHNvdXJjZUxpbmtQYXRoID0gcGF0aC5qb2luKHNvdXJjZVJvb3QsIG5hbWUpO1xuXG4gICAgLy8gU2tpcCBzZWxmLXJlZmVyZW5jaW5nIHN5bWxpbmtzICh0YXJnZXQgcmVzb2x2ZXMgYmFjayB0byB0aGUgc3ltbGluayBpdHNlbGYpXG4gICAgY29uc3QgdGFyZ2V0ID0gYXdhaXQgZnMucmVhZGxpbmsoc291cmNlTGlua1BhdGgpO1xuICAgIGNvbnN0IHJlc29sdmVkVGFyZ2V0ID0gcGF0aC5yZXNvbHZlKHNvdXJjZVJvb3QsIHRhcmdldCk7XG4gICAgaWYgKHJlc29sdmVkVGFyZ2V0ID09PSBzb3VyY2VMaW5rUGF0aCkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIGF3YWl0IGZzLnN5bWxpbmsoc291cmNlTGlua1BhdGgsIGRlc3RQYXRoKTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfTtcblxuICBjb25zdCByZXN1bHRzID0gYXdhaXQgUHJvbWlzZS5hbGwoc3ltbGlua3MubWFwKChlKSA9PiBjb3B5U3ltbGluayhlLm5hbWUpKSk7XG4gIHJldHVybiByZXN1bHRzLmZpbHRlcigocikgPT4gcikubGVuZ3RoO1xufVxuXG5pbnRlcmZhY2UgUmVyb3V0ZU5vZGVNb2R1bGVzT3B0aW9ucyB7XG4gIHNvdXJjZU5vZGVNb2R1bGVzOiBzdHJpbmc7XG4gIGRlc3ROb2RlTW9kdWxlczogc3RyaW5nO1xufVxuXG4vKipcbiAqIE1pcnJvcnMgYSBub2RlX21vZHVsZXMgdHJlZSBpbnRvIHRoZSB3b3JrdHJlZSB1c2luZyBzeW1saW5rcy5cbiAqXG4gKiBJbnRlcm5hbCB3b3Jrc3BhY2UgbGlua3Mga2VlcCB0aGVpciBvcmlnaW5hbCByZWxhdGl2ZSB0YXJnZXRzIHdoaWxlIGV4dGVybmFsXG4gKiBsaW5rcyBhbmQgbm9uLWxpbmsgZW50cmllcyBhcmUgcmVwcmVzZW50ZWQgYXMgc3ltbGlua3MgdG8gc291cmNlIHBhdGhzLlxuICpcbiAqIEBwYXJhbSBvcHRzIC0gU291cmNlIGFuZCBkZXN0aW5hdGlvbiBub2RlX21vZHVsZXMgZGlyZWN0b3JpZXMuXG4gKiBAcmV0dXJucyBDb3VudCBvZiBpbnRlcm5hbCB3b3Jrc3BhY2Ugc3ltbGlua3MgcmVjcmVhdGVkIGJ5IHRhcmdldCBwYXRoLlxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcmVyb3V0ZU5vZGVNb2R1bGVzKG9wdHM6IFJlcm91dGVOb2RlTW9kdWxlc09wdGlvbnMpOiBQcm9taXNlPG51bWJlcj4ge1xuICBjb25zdCB7IHNvdXJjZU5vZGVNb2R1bGVzLCBkZXN0Tm9kZU1vZHVsZXMgfSA9IG9wdHM7XG5cbiAgdHJ5IHtcbiAgICBhd2FpdCBmcy5sc3RhdChzb3VyY2VOb2RlTW9kdWxlcyk7XG4gIH0gY2F0Y2ggKGVycm9yOiB1bmtub3duKSB7XG4gICAgaWYgKChlcnJvciBhcyBOb2RlSlMuRXJybm9FeGNlcHRpb24pLmNvZGUgPT09ICdFTk9FTlQnKSB7XG4gICAgICByZXR1cm4gMDtcbiAgICB9XG4gICAgdGhyb3cgZXJyb3I7XG4gIH1cblxuICB0cnkge1xuICAgIGNvbnN0IGRlc3RTdGF0cyA9IGF3YWl0IGZzLmxzdGF0KGRlc3ROb2RlTW9kdWxlcyk7XG4gICAgaWYgKGRlc3RTdGF0cy5pc1N5bWJvbGljTGluaygpKSB7XG4gICAgICBhd2FpdCBmcy51bmxpbmsoZGVzdE5vZGVNb2R1bGVzKTtcbiAgICB9XG4gIH0gY2F0Y2ggKGVycm9yOiB1bmtub3duKSB7XG4gICAgaWYgKChlcnJvciBhcyBOb2RlSlMuRXJybm9FeGNlcHRpb24pLmNvZGUgIT09ICdFTk9FTlQnKSB7XG4gICAgICB0aHJvdyBlcnJvcjtcbiAgICB9XG4gIH1cblxuICBhd2FpdCBmcy5ta2RpcihkZXN0Tm9kZU1vZHVsZXMsIHsgcmVjdXJzaXZlOiB0cnVlIH0pO1xuXG4gIGNvbnN0IGVudHJpZXMgPSBhd2FpdCBmcy5yZWFkZGlyKHNvdXJjZU5vZGVNb2R1bGVzLCB7IHdpdGhGaWxlVHlwZXM6IHRydWUgfSk7XG4gIGNvbnN0IGNvdW50cyA9IGF3YWl0IFByb21pc2UuYWxsKFxuICAgIGVudHJpZXMubWFwKGFzeW5jIChlbnRyeSk6IFByb21pc2U8bnVtYmVyPiA9PiB7XG4gICAgICBjb25zdCBzb3VyY2VQYXRoID0gcGF0aC5qb2luKHNvdXJjZU5vZGVNb2R1bGVzLCBlbnRyeS5uYW1lKTtcbiAgICAgIGNvbnN0IGRlc3RQYXRoID0gcGF0aC5qb2luKGRlc3ROb2RlTW9kdWxlcywgZW50cnkubmFtZSk7XG5cbiAgICAgIGlmIChlbnRyeS5pc1N5bWJvbGljTGluaygpKSB7XG4gICAgICAgIGNvbnN0IHRhcmdldCA9IGF3YWl0IGZzLnJlYWRsaW5rKHNvdXJjZVBhdGgpO1xuICAgICAgICBpZiAoaXNJbnRlcm5hbFN5bWxpbmsodGFyZ2V0KSkge1xuICAgICAgICAgIGF3YWl0IGZzLnN5bWxpbmsodGFyZ2V0LCBkZXN0UGF0aCk7XG4gICAgICAgICAgcmV0dXJuIDE7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgYXdhaXQgZnMuc3ltbGluayhzb3VyY2VQYXRoLCBkZXN0UGF0aCk7XG4gICAgICAgICAgcmV0dXJuIDA7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAoZW50cnkuaXNEaXJlY3RvcnkoKSAmJiBlbnRyeS5uYW1lLnN0YXJ0c1dpdGgoJ0AnKSkge1xuICAgICAgICBhd2FpdCBmcy5ta2RpcihkZXN0UGF0aCwgeyByZWN1cnNpdmU6IHRydWUgfSk7XG4gICAgICAgIGNvbnN0IHNjb3BlRW50cmllcyA9IGF3YWl0IGZzLnJlYWRkaXIoc291cmNlUGF0aCwgeyB3aXRoRmlsZVR5cGVzOiB0cnVlIH0pO1xuICAgICAgICBjb25zdCBzY29wZUNvdW50cyA9IGF3YWl0IFByb21pc2UuYWxsKFxuICAgICAgICAgIHNjb3BlRW50cmllcy5tYXAoYXN5bmMgKHNjb3BlRW50cnkpOiBQcm9taXNlPG51bWJlcj4gPT4ge1xuICAgICAgICAgICAgY29uc3Qgc2NvcGVTb3VyY2VQYXRoID0gcGF0aC5qb2luKHNvdXJjZVBhdGgsIHNjb3BlRW50cnkubmFtZSk7XG4gICAgICAgICAgICBjb25zdCBzY29wZURlc3RQYXRoID0gcGF0aC5qb2luKGRlc3RQYXRoLCBzY29wZUVudHJ5Lm5hbWUpO1xuXG4gICAgICAgICAgICBpZiAoc2NvcGVFbnRyeS5pc1N5bWJvbGljTGluaygpKSB7XG4gICAgICAgICAgICAgIGNvbnN0IHRhcmdldCA9IGF3YWl0IGZzLnJlYWRsaW5rKHNjb3BlU291cmNlUGF0aCk7XG4gICAgICAgICAgICAgIGlmIChpc0ludGVybmFsU3ltbGluayh0YXJnZXQpKSB7XG4gICAgICAgICAgICAgICAgYXdhaXQgZnMuc3ltbGluayh0YXJnZXQsIHNjb3BlRGVzdFBhdGgpO1xuICAgICAgICAgICAgICAgIHJldHVybiAxO1xuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGF3YWl0IGZzLnN5bWxpbmsoc2NvcGVTb3VyY2VQYXRoLCBzY29wZURlc3RQYXRoKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gMDtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgYXdhaXQgZnMuc3ltbGluayhzY29wZVNvdXJjZVBhdGgsIHNjb3BlRGVzdFBhdGgpO1xuICAgICAgICAgICAgICByZXR1cm4gMDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KVxuICAgICAgICApO1xuICAgICAgICByZXR1cm4gc2NvcGVDb3VudHMucmVkdWNlKChzdW0sIGMpID0+IHN1bSArIGMsIDApO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgYXdhaXQgZnMuc3ltbGluayhzb3VyY2VQYXRoLCBkZXN0UGF0aCk7XG4gICAgICAgIHJldHVybiAwO1xuICAgICAgfVxuICAgIH0pXG4gICk7XG5cbiAgcmV0dXJuIGNvdW50cy5yZWR1Y2UoKHN1bSwgYykgPT4gc3VtICsgYywgMCk7XG59XG5cbmludGVyZmFjZSBSZXJvdXRlQWxsTm9kZU1vZHVsZXNPcHRpb25zIHtcbiAgc291cmNlUm9vdDogc3RyaW5nO1xuICB3b3JrdHJlZURpcjogc3RyaW5nO1xuICByZXBvUm9vdDogc3RyaW5nO1xufVxuXG4vKipcbiAqIFJlcm91dGVzIHJvb3QgYW5kIHBlci1wYWNrYWdlIG5vZGVfbW9kdWxlcyBkaXJlY3RvcmllcyBpbnRvIHRoZSB3b3JrdHJlZS5cbiAqXG4gKiBUaGUgb3BlcmF0aW9uIGlzIHNraXBwZWQgd2hlbiB0aGUgcmVwb3NpdG9yeSBoYXMgbm8gd29ya3NwYWNlIGNvbmZpZ3VyYXRpb24uXG4gKlxuICogQHBhcmFtIG9wdHMgLSBTb3VyY2Ugcm9vdCwgZGVzdGluYXRpb24gd29ya3RyZWUgcm9vdCwgYW5kIHJlcG8gcm9vdC5cbiAqIEByZXR1cm5zIFRvdGFsIG51bWJlciBvZiByZWNyZWF0ZWQgaW50ZXJuYWwgd29ya3NwYWNlIHN5bWxpbmtzLlxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcmVyb3V0ZUFsbE5vZGVNb2R1bGVzKG9wdHM6IFJlcm91dGVBbGxOb2RlTW9kdWxlc09wdGlvbnMpOiBQcm9taXNlPG51bWJlcj4ge1xuICBjb25zdCB7IHNvdXJjZVJvb3QsIHdvcmt0cmVlRGlyLCByZXBvUm9vdCB9ID0gb3B0cztcblxuICBsZXQgcGFja2FnZUpzb246IHsgd29ya3NwYWNlcz86IHN0cmluZ1tdIH07XG4gIHRyeSB7XG4gICAgY29uc3QgcGFja2FnZUpzb25Db250ZW50ID0gYXdhaXQgZnMucmVhZEZpbGUocGF0aC5qb2luKHJlcG9Sb290LCAncGFja2FnZS5qc29uJyksICd1dGYtOCcpO1xuICAgIHBhY2thZ2VKc29uID0gSlNPTi5wYXJzZShwYWNrYWdlSnNvbkNvbnRlbnQpO1xuICB9IGNhdGNoIChlcnJvcjogdW5rbm93bikge1xuICAgIGlmICgoZXJyb3IgYXMgTm9kZUpTLkVycm5vRXhjZXB0aW9uKS5jb2RlID09PSAnRU5PRU5UJykge1xuICAgICAgcmV0dXJuIDA7XG4gICAgfVxuICAgIHRocm93IGVycm9yO1xuICB9XG5cbiAgaWYgKCFwYWNrYWdlSnNvbi53b3Jrc3BhY2VzKSB7XG4gICAgcmV0dXJuIDA7XG4gIH1cblxuICBsZXQgdG90YWxDb3VudCA9IDA7XG5cbiAgdG90YWxDb3VudCArPSBhd2FpdCByZXJvdXRlTm9kZU1vZHVsZXMoe1xuICAgIHNvdXJjZU5vZGVNb2R1bGVzOiBwYXRoLmpvaW4oc291cmNlUm9vdCwgJ25vZGVfbW9kdWxlcycpLFxuICAgIGRlc3ROb2RlTW9kdWxlczogcGF0aC5qb2luKHdvcmt0cmVlRGlyLCAnbm9kZV9tb2R1bGVzJylcbiAgfSk7XG5cbiAgY29uc3QgcGFja2FnZXNEaXIgPSBwYXRoLmpvaW4oc291cmNlUm9vdCwgJ3BhY2thZ2VzJyk7XG4gIHRyeSB7XG4gICAgY29uc3QgcGFja2FnZUVudHJpZXMgPSBhd2FpdCBmcy5yZWFkZGlyKHBhY2thZ2VzRGlyLCB7IHdpdGhGaWxlVHlwZXM6IHRydWUgfSk7XG4gICAgZm9yIChjb25zdCBlbnRyeSBvZiBwYWNrYWdlRW50cmllcykge1xuICAgICAgaWYgKGVudHJ5LmlzRGlyZWN0b3J5KCkpIHtcbiAgICAgICAgY29uc3QgcGtnTm9kZU1vZHVsZXMgPSBwYXRoLmpvaW4ocGFja2FnZXNEaXIsIGVudHJ5Lm5hbWUsICdub2RlX21vZHVsZXMnKTtcbiAgICAgICAgbGV0IG5vZGVNb2R1bGVzRXhpc3RzID0gZmFsc2U7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgYXdhaXQgZnMubHN0YXQocGtnTm9kZU1vZHVsZXMpO1xuICAgICAgICAgIG5vZGVNb2R1bGVzRXhpc3RzID0gdHJ1ZTtcbiAgICAgICAgfSBjYXRjaCAoZXJyb3I6IHVua25vd24pIHtcbiAgICAgICAgICBpZiAoKGVycm9yIGFzIE5vZGVKUy5FcnJub0V4Y2VwdGlvbikuY29kZSAhPT0gJ0VOT0VOVCcpIHtcbiAgICAgICAgICAgIHRocm93IGVycm9yO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAobm9kZU1vZHVsZXNFeGlzdHMpIHtcbiAgICAgICAgICBjb25zdCBkZXN0UGFja2FnZURpciA9IHBhdGguam9pbih3b3JrdHJlZURpciwgJ3BhY2thZ2VzJywgZW50cnkubmFtZSk7XG4gICAgICAgICAgYXdhaXQgZnMubWtkaXIoZGVzdFBhY2thZ2VEaXIsIHsgcmVjdXJzaXZlOiB0cnVlIH0pO1xuICAgICAgICAgIHRvdGFsQ291bnQgKz0gYXdhaXQgcmVyb3V0ZU5vZGVNb2R1bGVzKHtcbiAgICAgICAgICAgIHNvdXJjZU5vZGVNb2R1bGVzOiBwa2dOb2RlTW9kdWxlcyxcbiAgICAgICAgICAgIGRlc3ROb2RlTW9kdWxlczogcGF0aC5qb2luKGRlc3RQYWNrYWdlRGlyLCAnbm9kZV9tb2R1bGVzJylcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfSBjYXRjaCAoZXJyb3I6IHVua25vd24pIHtcbiAgICBpZiAoKGVycm9yIGFzIE5vZGVKUy5FcnJub0V4Y2VwdGlvbikuY29kZSAhPT0gJ0VOT0VOVCcpIHtcbiAgICAgIHRocm93IGVycm9yO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiB0b3RhbENvdW50O1xufVxuXG5pbnRlcmZhY2UgVXBkYXRlR2l0RXhjbHVkZU9wdGlvbnMge1xuICB3b3JrdHJlZURpcjogc3RyaW5nO1xuICByZXBvUm9vdDogc3RyaW5nO1xuICBkaXJlY3Rvcmllczogc3RyaW5nW107XG4gIGZpbGVzOiBzdHJpbmdbXTtcbn1cblxuLyoqXG4gKiBBcHBlbmRzIHN5bWxpbmtlZCBpZ25vcmVkIHBhdGhzIHRvIHRoZSB3b3JrdHJlZS1zcGVjaWZpYyBnaXQgZXhjbHVkZSBmaWxlLlxuICpcbiAqIEFsc28gZW5hYmxlcyBgZXh0ZW5zaW9ucy53b3JrdHJlZUNvbmZpZ2AgYW5kIHNldHMgd29ya3RyZWUtbG9jYWxcbiAqIGBjb3JlLmV4Y2x1ZGVzRmlsZWAgc28gZ2l0IHN0YXR1cyBpbiB0aGUgd29ya3RyZWUgaWdub3JlcyBpbmplY3RlZCBsaW5rcy5cbiAqXG4gKiBAcGFyYW0gb3B0cyAtIFdvcmt0cmVlIHBhdGgsIHJlcG8gcm9vdCwgYW5kIGlnbm9yZWQgcGF0aCBjYW5kaWRhdGVzLlxuICogQHJldHVybnMgTm8gdmFsdWUuXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiB1cGRhdGVHaXRFeGNsdWRlKG9wdHM6IFVwZGF0ZUdpdEV4Y2x1ZGVPcHRpb25zKTogUHJvbWlzZTx2b2lkPiB7XG4gIGNvbnN0IHsgd29ya3RyZWVEaXIsIHJlcG9Sb290LCBkaXJlY3RvcmllcywgZmlsZXMgfSA9IG9wdHM7XG5cbiAgY29uc3QgeyBzdGRvdXQ6IGdpdERpciB9ID0gYXdhaXQgZXhlY0ZpbGVBc3luYygnZ2l0JywgWyctQycsIHdvcmt0cmVlRGlyLCAncmV2LXBhcnNlJywgJy0tZ2l0LWRpciddLCB7XG4gICAgdGltZW91dDogNV8wMDBcbiAgfSk7XG4gIGNvbnN0IGV4Y2x1ZGVQYXRoID0gcGF0aC5qb2luKGdpdERpci50cmltKCksICdpbmZvJywgJ2V4Y2x1ZGUnKTtcbiAgYXdhaXQgZnMubWtkaXIocGF0aC5kaXJuYW1lKGV4Y2x1ZGVQYXRoKSwgeyByZWN1cnNpdmU6IHRydWUgfSk7XG5cbiAgY29uc3QgbGluZXMgPSBbJyMgU3ltbGlua3MgY3JlYXRlZCBieSBpbnN0YW50LXdvcmt0cmVlJ107XG5cbiAgZm9yIChjb25zdCBkaXIgb2YgZGlyZWN0b3JpZXMpIHtcbiAgICBpZiAoIWRpcikgY29udGludWU7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHN0YXRzID0gYXdhaXQgZnMubHN0YXQocGF0aC5qb2luKHdvcmt0cmVlRGlyLCBkaXIpKTtcbiAgICAgIGlmIChzdGF0cy5pc1N5bWJvbGljTGluaygpKSBsaW5lcy5wdXNoKGRpcik7XG4gICAgfSBjYXRjaCAoZXJyb3I6IHVua25vd24pIHtcbiAgICAgIGlmICgoZXJyb3IgYXMgTm9kZUpTLkVycm5vRXhjZXB0aW9uKS5jb2RlICE9PSAnRU5PRU5UJykge1xuICAgICAgICB0aHJvdyBlcnJvcjtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBmb3IgKGNvbnN0IGZpbGUgb2YgZmlsZXMpIHtcbiAgICBpZiAoIWZpbGUpIGNvbnRpbnVlO1xuICAgIHRyeSB7XG4gICAgICBjb25zdCBzdGF0cyA9IGF3YWl0IGZzLmxzdGF0KHBhdGguam9pbih3b3JrdHJlZURpciwgZmlsZSkpO1xuICAgICAgaWYgKHN0YXRzLmlzU3ltYm9saWNMaW5rKCkpIGxpbmVzLnB1c2goZmlsZSk7XG4gICAgfSBjYXRjaCAoZXJyb3I6IHVua25vd24pIHtcbiAgICAgIGlmICgoZXJyb3IgYXMgTm9kZUpTLkVycm5vRXhjZXB0aW9uKS5jb2RlICE9PSAnRU5PRU5UJykge1xuICAgICAgICB0aHJvdyBlcnJvcjtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBhd2FpdCBmcy5hcHBlbmRGaWxlKGV4Y2x1ZGVQYXRoLCBgJHtsaW5lcy5qb2luKCdcXG4nKX1cXG5gKTtcblxuICB0cnkge1xuICAgIGF3YWl0IGV4ZWNGaWxlQXN5bmMoJ2dpdCcsIFsnLUMnLCByZXBvUm9vdCwgJ2NvbmZpZycsICdleHRlbnNpb25zLndvcmt0cmVlQ29uZmlnJywgJ3RydWUnXSwgeyB0aW1lb3V0OiA1XzAwMCB9KTtcbiAgfSBjYXRjaCAoZXJyb3I6IHVua25vd24pIHtcbiAgICBwcm9jZXNzLnN0ZGVyci53cml0ZShcbiAgICAgIGBjcmVhdGUtd29ya3RyZWU6IGZhaWxlZCB0byBzZXQgd29ya3RyZWVDb25maWcgZXh0ZW5zaW9uOiAke2Vycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogU3RyaW5nKGVycm9yKX1cXG5gXG4gICAgKTtcbiAgfVxuXG4gIHRyeSB7XG4gICAgYXdhaXQgZXhlY0ZpbGVBc3luYygnZ2l0JywgWyctQycsIHdvcmt0cmVlRGlyLCAnY29uZmlnJywgJy0td29ya3RyZWUnLCAnY29yZS5leGNsdWRlc0ZpbGUnLCBleGNsdWRlUGF0aF0sIHtcbiAgICAgIHRpbWVvdXQ6IDVfMDAwXG4gICAgfSk7XG4gIH0gY2F0Y2ggKGVycm9yOiB1bmtub3duKSB7XG4gICAgcHJvY2Vzcy5zdGRlcnIud3JpdGUoXG4gICAgICBgY3JlYXRlLXdvcmt0cmVlOiBmYWlsZWQgdG8gc2V0IGNvcmUuZXhjbHVkZXNGaWxlOiAke2Vycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogU3RyaW5nKGVycm9yKX1cXG5gXG4gICAgKTtcbiAgfVxufVxuIiwgIi8qKlxuICogRGV0YWNoZWQgYnJhbmNoLWNsZWFudXAgd2F0Y2hlciBmb3IgaW50ZXJhY3RpdmUgc2Vzc2lvbnMuXG4gKlxuICogUHJvdmlkZXMgYSBmaXJlLWFuZC1mb3JnZXQgbWVjaGFuaXNtIGZvciBydW5uaW5nIGJyYW5jaCBjbGVhbnVwIGFmdGVyIHRoZVxuICogaW50ZXJhY3RpdmUgQ0xJIGV4aXRzLiBUaGUgd2F0Y2hlciBzcGF3bnMgaXRzZWxmIGFzIGEgZGV0YWNoZWQgTm9kZS5qc1xuICogcHJvY2VzcywgcmVjZWl2ZXMgY2xlYW51cCBwYXJhbWV0ZXJzIHZpYSBzdGRpbiwgY2FsbHNcbiAqIHtAbGluayBjbGVhbnVwTWVyZ2VkQnJhbmNoZXN9LCB0aGVuIGV4aXRzLlxuICpcbiAqIEBzdW1tYXJ5IERldGFjaGVkIGJyYW5jaC1jbGVhbnVwIHdhdGNoZXIgZm9yIGludGVyYWN0aXZlIHNlc3Npb25zXG4gKiBAbW9kdWxlXG4gKi9cblxuaW1wb3J0IHsgdHlwZSBDaGlsZFByb2Nlc3MsIHNwYXduIH0gZnJvbSAnbm9kZTpjaGlsZF9wcm9jZXNzJztcbmltcG9ydCAqIGFzIHBhdGggZnJvbSAnbm9kZTpwYXRoJztcbmltcG9ydCB7IENhcmRzQ2xpZW50IH0gZnJvbSAnQGNhcmRzL3Nkay9jbGllbnQnO1xuaW1wb3J0IHsgdHlwZSBBY3Rpb25JbnB1dCwgTG9nZ2VyIH0gZnJvbSAnQGNhcmRzL3Nkay9jb25maWcnO1xuaW1wb3J0IHsgY2xlYW51cE1lcmdlZEJyYW5jaGVzLCBlcnJvck1lc3NhZ2UgfSBmcm9tICcuL2NsYXVkZS1zZXNzaW9uLmpzJztcblxuLyoqXG4gKiBQYXJhbWV0ZXJzIHJlcXVpcmVkIHRvIHJ1biBicmFuY2ggY2xlYW51cCBpbiBhIGRldGFjaGVkIHByb2Nlc3MuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgQnJhbmNoQ2xlYW51cFBhcmFtcyB7XG4gIC8qKiBUaGUgY2FyZCBJRCBmb3IgdGhlIHNlc3Npb24gYmVpbmcgY2xlYW5lZCB1cC4gKi9cbiAgY2FyZElkOiBzdHJpbmc7XG4gIC8qKiBBYnNvbHV0ZSBwYXRoIHRvIHRoZSByZXBvc2l0b3J5IHJvb3QuICovXG4gIHJlcG9Sb290OiBzdHJpbmc7XG4gIC8qKiBCYXNlIFVSTCBmb3IgdGhlIENhcmRzIEFQSS4gKi9cbiAgYXBpQmFzZVVybDogc3RyaW5nO1xuICAvKiogQWNjZXNzIHRva2VuIGZvciB0aGUgQ2FyZHMgQVBJLiAqL1xuICBhcGlBY2Nlc3NUb2tlbjogc3RyaW5nO1xuICAvKiogT3B0aW9uYWwgc2Vzc2lvbiBJRCBmb3IgbG9nIGNvcnJlbGF0aW9uLiAqL1xuICBzZXNzaW9uSWQ/OiBzdHJpbmc7XG59XG5cbi8qKlxuICogU3Bhd25zIGEgZGV0YWNoZWQgTm9kZS5qcyBwcm9jZXNzIHRoYXQgY2FsbHMge0BsaW5rIGNsZWFudXBNZXJnZWRCcmFuY2hlc31cbiAqIGFmdGVyIHJlY2VpdmluZyBzZXJpYWxpemVkIHBhcmFtZXRlcnMgdmlhIHN0ZGluLlxuICpcbiAqIFRoZSBzcGF3bmVkIHByb2Nlc3MgaXMgZnVsbHkgZGV0YWNoZWQgKGBkZXRhY2hlZDogdHJ1ZWAsIGBjaGlsZC51bnJlZigpYClcbiAqIGFuZCBzdXJ2aXZlcyBwYXJlbnQgZXhpdC4gU3Rkb3V0IGFuZCBzdGRlcnIgYXJlIGRpc2NhcmRlZDsgZXJyb3JzIGFyZVxuICogd3JpdHRlbiB0byB0aGUgc2hhcmVkIGFjdGlvbi1oYW5kbGVyIGxvZyBmaWxlIGluIHRoZSByZXBvIHJvb3QuXG4gKlxuICogQHBhcmFtIHBhcmFtcyAtIFBhcmFtZXRlcnMgZm9yIHRoZSBjbGVhbnVwIHJ1bi5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHNwYXduQnJhbmNoQ2xlYW51cFdhdGNoZXIocGFyYW1zOiBCcmFuY2hDbGVhbnVwUGFyYW1zKTogdm9pZCB7XG4gIGNvbnN0IHNlbGZQYXRoID0gbmV3IFVSTChpbXBvcnQubWV0YS51cmwpLnBhdGhuYW1lO1xuICBjb25zdCBub2RlQmluID0gcHJvY2Vzcy5leGVjUGF0aDtcblxuICBsZXQgY2hpbGQ6IENoaWxkUHJvY2VzcztcbiAgdHJ5IHtcbiAgICBjaGlsZCA9IHNwYXduKG5vZGVCaW4sIFtzZWxmUGF0aCwgJy0tYnJhbmNoLWNsZWFudXAnXSwge1xuICAgICAgZGV0YWNoZWQ6IHRydWUsXG4gICAgICBzdGRpbzogWydwaXBlJywgJ2lnbm9yZScsICdpZ25vcmUnXVxuICAgIH0pO1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIC8vIEZhaWwtb3BlbjogbG9nIGFuZCByZXR1cm47IGNsZWFudXAgd2lsbCBub3QgcnVuIHRoaXMgc2Vzc2lvblxuICAgIGNvbnNvbGUuZXJyb3IoYFticmFuY2gtY2xlYW51cC13YXRjaGVyXSBGYWlsZWQgdG8gc3Bhd24gd2F0Y2hlcjogJHtlcnJvck1lc3NhZ2UoZXJyb3IpfWApO1xuICAgIHJldHVybjtcbiAgfVxuXG4gIGNoaWxkLnN0ZGluIS5vbignZXJyb3InLCAoZXJyKSA9PiB7XG4gICAgLy8gVGhlIHBhcmVudCBtYXkgZXhpdCBiZWZvcmUgc3RkaW4gaXMgZnVsbHkgZHJhaW5lZDsgdGhpcyBpcyBleHBlY3RlZFxuICAgIGNvbnNvbGUuZXJyb3IoYFticmFuY2gtY2xlYW51cC13YXRjaGVyXSBTdGRpbiBwaXBlIGVycm9yOiAke2Vycm9yTWVzc2FnZShlcnIpfWApO1xuICB9KTtcblxuICBjaGlsZC5zdGRpbiEud3JpdGUoYCR7SlNPTi5zdHJpbmdpZnkocGFyYW1zKX1cXG5gKTtcbiAgY2hpbGQuc3RkaW4hLmVuZCgpO1xuXG4gIGNoaWxkLnVucmVmKCk7XG59XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIERldGFjaGVkIGVudHJ5IHBvaW50XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbmlmIChwcm9jZXNzLmFyZ3YuaW5jbHVkZXMoJy0tYnJhbmNoLWNsZWFudXAnKSkge1xuICBjb25zdCBjaHVua3M6IEJ1ZmZlcltdID0gW107XG5cbiAgcHJvY2Vzcy5zdGRpbi5vbignZGF0YScsIChjaHVuazogQnVmZmVyKSA9PiB7XG4gICAgY2h1bmtzLnB1c2goY2h1bmspO1xuICB9KTtcblxuICBwcm9jZXNzLnN0ZGluLm9uKCdlbmQnLCAoKSA9PiB7XG4gICAgdm9pZCAoYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3QgcmF3ID0gQnVmZmVyLmNvbmNhdChjaHVua3MpLnRvU3RyaW5nKCd1dGY4Jyk7XG4gICAgICBsZXQgcGFyYW1zOiBCcmFuY2hDbGVhbnVwUGFyYW1zO1xuICAgICAgdHJ5IHtcbiAgICAgICAgcGFyYW1zID0gSlNPTi5wYXJzZShyYXcpIGFzIEJyYW5jaENsZWFudXBQYXJhbXM7XG4gICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICBjb25zb2xlLmVycm9yKGBbYnJhbmNoLWNsZWFudXAtd2F0Y2hlcl0gRmFpbGVkIHRvIHBhcnNlIHBhcmFtczogJHtlcnJvck1lc3NhZ2UoZXJyb3IpfWApO1xuICAgICAgICBwcm9jZXNzLmV4aXQoMSk7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IHsgY2FyZElkLCByZXBvUm9vdCwgYXBpQmFzZVVybCwgYXBpQWNjZXNzVG9rZW4sIHNlc3Npb25JZCB9ID0gcGFyYW1zO1xuXG4gICAgICBjb25zdCBpbnB1dDogQWN0aW9uSW5wdXQgPSB7XG4gICAgICAgIGNhcmRJZCxcbiAgICAgICAgcmVwb1Jvb3QsXG4gICAgICAgIGFwaUJhc2VVcmwsXG4gICAgICAgIGFwaUFjY2Vzc1Rva2VuLFxuICAgICAgICBhY3Rpb25OYW1lOiAnYnJhbmNoLWNsZWFudXAtd2F0Y2hlcicsXG4gICAgICAgIGVudmlyb25tZW50OiAnJyxcbiAgICAgICAgZXhlY3V0aW9uTW9kZTogJ2JhY2tncm91bmQnLFxuICAgICAgICBjb2RpbmdBZ2VudDogdW5kZWZpbmVkLFxuICAgICAgICBzd2l0Y2hUb0ludGVyYWN0aXZlRGF0YTogdW5kZWZpbmVkLFxuICAgICAgICBjYXJkUmVwb1BhdGg6ICcnLFxuICAgICAgICBjb25maWdQYXRoOiAnJyxcbiAgICAgICAgZXh0ZW5zaW9uUGF0aDogJydcbiAgICAgIH07XG5cbiAgICAgIGNvbnN0IGNsaWVudCA9IG5ldyBDYXJkc0NsaWVudCh7XG4gICAgICAgIGJhc2VVcmw6IGFwaUJhc2VVcmwsXG4gICAgICAgIGFjY2Vzc1Rva2VuOiBhcGlBY2Nlc3NUb2tlblxuICAgICAgfSk7XG5cbiAgICAgIGNvbnN0IGxvZ2dlciA9IG5ldyBMb2dnZXIoe1xuICAgICAgICBsb2dGaWxlUGF0aDogcGF0aC5qb2luKHJlcG9Sb290LCAnLmNhcmRzJywgJ2xvZ3MnLCAnY2FyZHMtZGVmYXVsdC1jb25maWd1cmF0aW9uLWhvb2tzLmxvZycpXG4gICAgICB9KTtcblxuICAgICAgdHJ5IHtcbiAgICAgICAgYXdhaXQgY2xlYW51cE1lcmdlZEJyYW5jaGVzKGlucHV0LCBjbGllbnQsIGxvZ2dlciwgc2Vzc2lvbklkKTtcbiAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgIGNvbnN0IG1lc3NhZ2UgPSBlcnJvck1lc3NhZ2UoZXJyb3IpO1xuICAgICAgICBsb2dnZXIuZXJyb3IoJ0JyYW5jaCBjbGVhbnVwIHdhdGNoZXIgZmFpbGVkJywgeyBlcnJvcjogbWVzc2FnZSwgc2Vzc2lvbklkIH0pO1xuICAgICAgfSBmaW5hbGx5IHtcbiAgICAgICAgbG9nZ2VyLmNsb3NlKCk7XG4gICAgICB9XG4gICAgfSkoKTtcbiAgfSk7XG59XG4iLCAiXG5pbXBvcnQgaGFuZGxlciBmcm9tICcuL2NoYXQudHMnO1xuaW1wb3J0IHsgZXhlY3V0ZUNvbW1hbmQgfSBmcm9tICcuLi8uLi8uLi9zZGsvc3JjL2NvbmZpZy9ydW50aW1lLnRzJztcblxuaWYgKCFwcm9jZXNzLmFyZ3YuaW5jbHVkZXMoJy0tYnJhbmNoLWNsZWFudXAnKSkge1xuICBleGVjdXRlQ29tbWFuZChoYW5kbGVyKTtcbn1cbiJdLAogICJtYXBwaW5ncyI6ICI7Ozs7QUFnQkEsU0FBUyxrQkFBa0I7OztBQ3lLcEIsU0FBUyxhQUNkLFFBQ0EsU0FDZ0M7QUFDaEMsUUFBTSxLQUFLLE9BQU8sT0FBb0IsWUFBMEM7QUFDOUUsVUFBTSxRQUFRLE9BQU8sT0FBTztBQUFBLEVBQzlCO0FBRUEsS0FBRyxjQUFjO0FBQ2pCLEtBQUcsS0FBSyxPQUFPO0FBQ2YsS0FBRyxhQUFhLE9BQU87QUFDdkIsS0FBRyxjQUFjLE9BQU87QUFDeEIsS0FBRyxPQUFPLE9BQU87QUFDakIsS0FBRyx5QkFBeUIsT0FBTztBQUNuQyxLQUFHLGtCQUFrQixPQUFPO0FBQzVCLEtBQUcsVUFBVSxPQUFPO0FBQ3BCLEtBQUcsYUFBYSxPQUFPO0FBRXZCLFNBQU87QUFDVDs7O0FDNUxBLFNBQVMsb0JBQW9CO0FBY3RCLElBQU0saUJBQWlCO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQUs1QixTQUFTO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQU1ULGFBQWE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBTWIsYUFBYTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQU9iLGdCQUFnQjtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFNaEIsY0FBYztBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFNZCxrQkFBa0I7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFPbEIsY0FBYztBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFNZCxXQUFXO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQU1YLGNBQWM7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBTWQsV0FBVztBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFNWCxXQUFXO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQU1YLFdBQVc7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBTVgsUUFBUTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFNUixjQUFjO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQVlkLGFBQWE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFVYixNQUFNO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQU1OLGFBQWE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBTWIsaUNBQWlDO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQU1qQyxhQUFhO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBT2IsZ0JBQWdCO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFRaEIsV0FBVztBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFNWCxnQkFBZ0I7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBTWhCLGdCQUFnQjtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBUWhCLGFBQWE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBU2IsZUFBZTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQU9mLGtCQUFrQjtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFZbEIsa0JBQWtCO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFXbEIsZ0JBQWdCO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBVWhCLGdCQUFnQjtBQUNsQjtBQWtCTyxTQUFTLFlBQW9CO0FBQ2xDLFFBQU0sUUFBUSxRQUFRLElBQUksZUFBZSxPQUFPO0FBQ2hELE1BQUksVUFBVSxVQUFhLFVBQVUsSUFBSTtBQUN2QyxVQUFNLElBQUksTUFBTSwwQ0FBMEMsZUFBZSxPQUFPLEVBQUU7QUFBQSxFQUNwRjtBQUNBLFNBQU87QUFDVDtBQWNPLFNBQVMsaUJBQXlCO0FBQ3ZDLFFBQU0sUUFBUSxRQUFRLElBQUksZUFBZSxXQUFXO0FBQ3BELE1BQUksVUFBVSxVQUFhLFVBQVUsSUFBSTtBQUN2QyxVQUFNLElBQUksTUFBTSwwQ0FBMEMsZUFBZSxXQUFXLEVBQUU7QUFBQSxFQUN4RjtBQUNBLFNBQU87QUFDVDtBQWVPLFNBQVMsZ0JBQXdCO0FBQ3RDLFFBQU0sUUFBUSxRQUFRLElBQUksZUFBZSxXQUFXO0FBQ3BELE1BQUksVUFBVSxVQUFhLFVBQVUsSUFBSTtBQUN2QyxVQUFNLElBQUksTUFBTSwwQ0FBMEMsZUFBZSxXQUFXLEVBQUU7QUFBQSxFQUN4RjtBQUNBLFNBQU87QUFDVDtBQWdCTyxTQUFTLG1CQUFpRDtBQUMvRCxRQUFNLFFBQVEsUUFBUSxJQUFJLGVBQWUsY0FBYztBQUN2RCxNQUFJLFVBQVUsVUFBYSxVQUFVLElBQUk7QUFDdkMsVUFBTSxJQUFJLE1BQU0sMENBQTBDLGVBQWUsY0FBYyxFQUFFO0FBQUEsRUFDM0Y7QUFDQSxNQUFJLFVBQVUsaUJBQWlCLFVBQVUsY0FBYztBQUNyRCxVQUFNLElBQUksTUFBTSxXQUFXLGVBQWUsY0FBYyxrREFBa0QsS0FBSyxHQUFHO0FBQUEsRUFDcEg7QUFDQSxTQUFPO0FBQ1Q7QUFlTyxTQUFTLGdCQUF3QjtBQUN0QyxRQUFNLFFBQVEsUUFBUSxJQUFJLGVBQWUsWUFBWTtBQUNyRCxNQUFJLFVBQVUsVUFBYSxVQUFVLElBQUk7QUFDdkMsVUFBTSxJQUFJLE1BQU0sMENBQTBDLGVBQWUsWUFBWSxFQUFFO0FBQUEsRUFDekY7QUFDQSxTQUFPO0FBQ1Q7QUFpQk8sU0FBUyxvQkFBNEI7QUFDMUMsUUFBTSxRQUFRLFFBQVEsSUFBSSxlQUFlLGdCQUFnQjtBQUN6RCxNQUFJLFVBQVUsVUFBYSxVQUFVLElBQUk7QUFDdkMsVUFBTSxJQUFJLE1BQU0sMENBQTBDLGVBQWUsZ0JBQWdCLEVBQUU7QUFBQSxFQUM3RjtBQUNBLFNBQU87QUFDVDtBQWlCTyxTQUFTLGlCQUFxQztBQUNuRCxRQUFNLFFBQVEsUUFBUSxJQUFJLGVBQWUsWUFBWTtBQUNyRCxNQUFJLFVBQVUsVUFBYSxVQUFVLElBQUk7QUFDdkMsV0FBTztBQUFBLEVBQ1Q7QUFDQSxTQUFPO0FBQ1Q7QUFjTyxTQUFTLGNBQXNCO0FBQ3BDLFFBQU0sUUFBUSxRQUFRLElBQUksZUFBZSxTQUFTO0FBQ2xELE1BQUksVUFBVSxVQUFhLFVBQVUsSUFBSTtBQUN2QyxVQUFNLElBQUksTUFBTSwwQ0FBMEMsZUFBZSxTQUFTLEVBQUU7QUFBQSxFQUN0RjtBQUNBLFNBQU87QUFDVDtBQWNPLFNBQVMsaUJBQXlCO0FBQ3ZDLFFBQU0sUUFBUSxRQUFRLElBQUksZUFBZSxZQUFZO0FBQ3JELE1BQUksVUFBVSxVQUFhLFVBQVUsSUFBSTtBQUN2QyxVQUFNLElBQUksTUFBTSwwQ0FBMEMsZUFBZSxZQUFZLEVBQUU7QUFBQSxFQUN6RjtBQUNBLFNBQU87QUFDVDtBQWNPLFNBQVMsY0FBc0I7QUFDcEMsUUFBTSxRQUFRLFFBQVEsSUFBSSxlQUFlLFNBQVM7QUFDbEQsTUFBSSxVQUFVLFVBQWEsVUFBVSxJQUFJO0FBQ3ZDLFVBQU0sSUFBSSxNQUFNLDBDQUEwQyxlQUFlLFNBQVMsRUFBRTtBQUFBLEVBQ3RGO0FBQ0EsU0FBTztBQUNUO0FBY08sU0FBUyxjQUFzQjtBQUNwQyxRQUFNLFFBQVEsUUFBUSxJQUFJLGVBQWUsU0FBUztBQUNsRCxNQUFJLFVBQVUsVUFBYSxVQUFVLElBQUk7QUFDdkMsVUFBTSxJQUFJLE1BQU0sMENBQTBDLGVBQWUsU0FBUyxFQUFFO0FBQUEsRUFDdEY7QUFDQSxTQUFPO0FBQ1Q7QUFjTyxTQUFTLGNBQXNCO0FBQ3BDLFFBQU0sUUFBUSxRQUFRLElBQUksZUFBZSxTQUFTO0FBQ2xELE1BQUksVUFBVSxVQUFhLFVBQVUsSUFBSTtBQUN2QyxVQUFNLElBQUksTUFBTSwwQ0FBMEMsZUFBZSxTQUFTLEVBQUU7QUFBQSxFQUN0RjtBQUNBLFFBQU0sT0FBTyxPQUFPLFNBQVMsT0FBTyxFQUFFO0FBQ3RDLE1BQUksT0FBTyxNQUFNLElBQUksR0FBRztBQUN0QixVQUFNLElBQUksTUFBTSxXQUFXLGVBQWUsU0FBUywyQkFBMkIsS0FBSyxHQUFHO0FBQUEsRUFDeEY7QUFDQSxTQUFPO0FBQ1Q7QUFjTyxTQUFTLFlBQW9CO0FBQ2xDLFFBQU0sUUFBUSxRQUFRLElBQUksZUFBZSxNQUFNO0FBQy9DLE1BQUksVUFBVSxVQUFhLFVBQVUsSUFBSTtBQUN2QyxVQUFNLElBQUksTUFBTSwwQ0FBMEMsZUFBZSxNQUFNLEVBQUU7QUFBQSxFQUNuRjtBQUNBLFNBQU87QUFDVDtBQWNPLFNBQVMsaUJBQXlCO0FBQ3ZDLFFBQU0sUUFBUSxRQUFRLElBQUksZUFBZSxZQUFZO0FBQ3JELE1BQUksVUFBVSxVQUFhLFVBQVUsSUFBSTtBQUN2QyxVQUFNLElBQUksTUFBTSwwQ0FBMEMsZUFBZSxZQUFZLEVBQUU7QUFBQSxFQUN6RjtBQUNBLFNBQU87QUFDVDtBQStDTyxTQUFTLGlDQUFxRDtBQUNuRSxRQUFNLFFBQVEsUUFBUSxJQUFJLGVBQWUsK0JBQStCO0FBQ3hFLE1BQUksVUFBVSxVQUFhLFVBQVUsSUFBSTtBQUN2QyxXQUFPO0FBQUEsRUFDVDtBQUNBLFNBQU87QUFDVDtBQVFPLFNBQVMsZ0JBQXdCO0FBQ3RDLFFBQU0sUUFBUSxRQUFRLElBQUksZUFBZSxXQUFXO0FBQ3BELE1BQUksVUFBVSxVQUFhLFVBQVUsSUFBSTtBQUN2QyxVQUFNLElBQUksTUFBTSwwQ0FBMEMsZUFBZSxXQUFXLEVBQUU7QUFBQSxFQUN4RjtBQUNBLFNBQU87QUFDVDtBQTRCTyxTQUFTLGNBQXNCO0FBQ3BDLFFBQU0sUUFBUSxRQUFRLElBQUksZUFBZSxTQUFTO0FBQ2xELE1BQUksVUFBVSxVQUFhLFVBQVUsSUFBSTtBQUN2QyxVQUFNLElBQUksTUFBTSwwQ0FBMEMsZUFBZSxTQUFTLEVBQUU7QUFBQSxFQUN0RjtBQUNBLFNBQU87QUFDVDtBQVFPLFNBQVMsa0JBQTBCO0FBQ3hDLFFBQU0sUUFBUSxRQUFRLElBQUksZUFBZSxjQUFjO0FBQ3ZELE1BQUksVUFBVSxVQUFhLFVBQVUsSUFBSTtBQUN2QyxVQUFNLElBQUksTUFBTSwwQ0FBMEMsZUFBZSxjQUFjLEVBQUU7QUFBQSxFQUMzRjtBQUNBLFNBQU87QUFDVDtBQVlPLFNBQVMsbUJBQTJCO0FBQ3pDLFFBQU0sUUFBUSxRQUFRLElBQUksZUFBZSxjQUFjO0FBQ3ZELE1BQUksVUFBVSxVQUFhLFVBQVUsSUFBSTtBQUN2QyxVQUFNLElBQUksTUFBTSwwQ0FBMEMsZUFBZSxjQUFjLEVBQUU7QUFBQSxFQUMzRjtBQUNBLFNBQU87QUFDVDtBQVdPLFNBQVMsOEJBQW1EO0FBQ2pFLFFBQU0sV0FBVywrQkFBK0I7QUFDaEQsTUFBSSxhQUFhLFFBQVc7QUFDMUIsV0FBTztBQUFBLEVBQ1Q7QUFDQSxRQUFNLFVBQVUsYUFBYSxVQUFVLE9BQU87QUFDOUMsU0FBTyxLQUFLLE1BQU0sT0FBTztBQUMzQjtBQXFCTyxTQUFTLHFCQUFrQztBQUNoRCxTQUFPO0FBQUEsSUFDTCxRQUFRLFVBQVU7QUFBQSxJQUNsQixZQUFZLGNBQWM7QUFBQSxJQUMxQixhQUFhLGVBQWU7QUFBQSxJQUM1QixlQUFlLGlCQUFpQjtBQUFBLElBQ2hDLFlBQVksY0FBYztBQUFBLElBQzFCLGdCQUFnQixrQkFBa0I7QUFBQSxJQUNsQyxhQUFhLGVBQWU7QUFBQSxJQUM1Qix5QkFBeUIsNEJBQTRCO0FBQUEsSUFDckQsVUFBVSxZQUFZO0FBQUEsSUFDdEIsY0FBYyxnQkFBZ0I7QUFBQSxJQUM5QixZQUFZLGNBQWM7QUFBQSxJQUMxQixlQUFlLGlCQUFpQjtBQUFBLEVBQ2xDO0FBQ0Y7QUFrQk8sU0FBUyxtQkFBa0M7QUFDaEQsU0FBTztBQUFBLElBQ0wsUUFBUSxVQUFVO0FBQUEsSUFDbEIsYUFBYSxlQUFlO0FBQUEsSUFDNUIsVUFBVSxZQUFZO0FBQUEsSUFDdEIsYUFBYSxlQUFlO0FBQUEsSUFDNUIsVUFBVSxZQUFZO0FBQUEsSUFDdEIsVUFBVSxZQUFZO0FBQUEsSUFDdEIsVUFBVSxZQUFZO0FBQUEsSUFDdEIsWUFBWSxVQUFVO0FBQUEsSUFDdEIsYUFBYSxlQUFlO0FBQUEsSUFDNUIsWUFBWSxjQUFjO0FBQUEsSUFDMUIsZ0JBQWdCLGtCQUFrQjtBQUFBLEVBQ3BDO0FBQ0Y7OztBQ3B1Qk8sSUFBTSxhQUFhO0FBQUE7QUFBQSxFQUV4QixTQUFTO0FBQUE7QUFBQSxFQUVULE9BQU87QUFBQTtBQUFBLEVBRVAsdUJBQXVCO0FBQ3pCO0FBcUJPLFNBQVMsV0FBVyxTQUF1QjtBQUNoRCxVQUFRLE9BQU8sTUFBTSxHQUFHLE9BQU87QUFBQSxDQUFJO0FBQ3JDOzs7QUMxQkEsU0FBUyxXQUFXLFlBQVksV0FBVyxVQUFVLGlCQUFpQjtBQUN0RSxTQUFTLGVBQWU7QUFxQmpCLElBQU0sYUFBYSxDQUFDLFNBQVMsUUFBUSxRQUFRLE9BQU87QUFzT3BELElBQU0sU0FBTixNQUFhO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFJVixXQUFnRCxvQkFBSSxJQUFJO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQU14RCxZQUEyQjtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBSzNCLGNBQTZCO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFLN0Isa0JBQWtCO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFLbEI7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQUtBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFpQlIsWUFBWSxTQUF1QixDQUFDLEdBQUc7QUFFckMsZUFBVyxTQUFTLFlBQVk7QUFDOUIsV0FBSyxTQUFTLElBQUksT0FBTyxvQkFBSSxJQUFJLENBQUM7QUFBQSxJQUNwQztBQUdBLFNBQUssY0FBYyxPQUFPLGVBQWUsUUFBUSxJQUFJLHNCQUFzQixLQUFLO0FBQUEsRUFDbEY7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQWNBLE1BQU0sU0FBaUIsU0FBeUM7QUFDOUQsU0FBSyxLQUFLLFNBQVMsU0FBUyxPQUFPO0FBQUEsRUFDckM7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQWNBLEtBQUssU0FBaUIsU0FBeUM7QUFDN0QsU0FBSyxLQUFLLFFBQVEsU0FBUyxPQUFPO0FBQUEsRUFDcEM7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQWNBLEtBQUssU0FBaUIsU0FBeUM7QUFDN0QsU0FBSyxLQUFLLFFBQVEsU0FBUyxPQUFPO0FBQUEsRUFDcEM7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQWNBLE1BQU0sU0FBaUIsU0FBeUM7QUFDOUQsU0FBSyxLQUFLLFNBQVMsU0FBUyxPQUFPO0FBQUEsRUFDckM7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFzQkEsU0FBUyxPQUFnQixTQUFpQixTQUF5QztBQUNqRixVQUFNLFlBQVksS0FBSyxpQkFBaUIsS0FBSztBQUU3QyxVQUFNLFFBQWtCO0FBQUEsTUFDdEIsWUFBVyxvQkFBSSxLQUFLLEdBQUUsWUFBWTtBQUFBLE1BQ2xDLE9BQU87QUFBQSxNQUNQLFVBQVUsS0FBSztBQUFBLE1BQ2Y7QUFBQSxNQUNBLE9BQU8sS0FBSztBQUFBLE1BQ1osT0FBTztBQUFBLE1BQ1A7QUFBQSxJQUNGO0FBRUEsU0FBSyxhQUFhLEtBQUs7QUFBQSxFQUN6QjtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBbUNBLEdBQUcsT0FBaUIsU0FBdUM7QUFDekQsVUFBTSxnQkFBZ0IsS0FBSyxTQUFTLElBQUksS0FBSztBQUM3QyxRQUFJLGVBQWU7QUFDakIsb0JBQWMsSUFBSSxPQUFPO0FBQUEsSUFDM0I7QUFFQSxXQUFPLE1BQU07QUFDWCxxQkFBZSxPQUFPLE9BQU87QUFBQSxJQUMvQjtBQUFBLEVBQ0Y7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQVdBLFdBQVcsVUFBOEIsT0FBa0Q7QUFDekYsU0FBSyxrQkFBa0I7QUFDdkIsU0FBSyxlQUFlO0FBQUEsRUFDdEI7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQVFBLGVBQXFCO0FBQ25CLFNBQUssa0JBQWtCO0FBQ3ZCLFNBQUssZUFBZTtBQUFBLEVBQ3RCO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBc0JBLGtCQUFrQixVQUF3QjtBQUN4QyxRQUFJLEtBQUssZ0JBQWdCLE1BQU07QUFDN0IsV0FBSyxjQUFjO0FBQ25CLFdBQUssa0JBQWtCO0FBQUEsSUFDekI7QUFBQSxFQUNGO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQWtCQSxXQUFXLFVBQStCO0FBRXhDLFFBQUksS0FBSyxjQUFjLE1BQU07QUFDM0IsVUFBSTtBQUNGLGtCQUFVLEtBQUssU0FBUztBQUFBLE1BQzFCLFFBQVE7QUFBQSxNQUVSO0FBQ0EsV0FBSyxZQUFZO0FBQUEsSUFDbkI7QUFFQSxTQUFLLGNBQWM7QUFDbkIsU0FBSyxrQkFBa0I7QUFBQSxFQUN6QjtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBY0EsUUFBYztBQUNaLFFBQUksS0FBSyxjQUFjLE1BQU07QUFDM0IsVUFBSTtBQUNGLGtCQUFVLEtBQUssU0FBUztBQUFBLE1BQzFCLFFBQVE7QUFBQSxNQUVSO0FBQ0EsV0FBSyxZQUFZO0FBQUEsSUFDbkI7QUFDQSxTQUFLLGtCQUFrQjtBQUFBLEVBQ3pCO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQVNBLGtCQUEyQjtBQUN6QixVQUFNLGNBQWMsTUFBTSxLQUFLLEtBQUssU0FBUyxPQUFPLENBQUMsRUFBRSxLQUFLLENBQUMsYUFBYSxTQUFTLE9BQU8sQ0FBQztBQUMzRixXQUFPLGVBQWUsS0FBSyxnQkFBZ0I7QUFBQSxFQUM3QztBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBWVEsS0FBSyxPQUFpQixTQUFpQixTQUF5QztBQUN0RixVQUFNLFFBQWtCO0FBQUEsTUFDdEIsWUFBVyxvQkFBSSxLQUFLLEdBQUUsWUFBWTtBQUFBLE1BQ2xDO0FBQUEsTUFDQSxVQUFVLEtBQUs7QUFBQSxNQUNmO0FBQUEsTUFDQSxPQUFPLEtBQUs7QUFBQSxNQUNaO0FBQUEsSUFDRjtBQUVBLFNBQUssYUFBYSxLQUFLO0FBQUEsRUFDekI7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBTVEsYUFBYSxPQUF1QjtBQUUxQyxVQUFNLGdCQUFnQixLQUFLLFNBQVMsSUFBSSxNQUFNLEtBQUs7QUFDbkQsUUFBSSxlQUFlO0FBQ2pCLGlCQUFXLFdBQVcsZUFBZTtBQUNuQyxZQUFJO0FBQ0Ysa0JBQVEsS0FBSztBQUFBLFFBQ2YsUUFBUTtBQUFBLFFBRVI7QUFBQSxNQUNGO0FBQUEsSUFDRjtBQUdBLFNBQUssWUFBWSxLQUFLO0FBQUEsRUFDeEI7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBTVEsWUFBWSxPQUF1QjtBQUN6QyxRQUFJLENBQUMsS0FBSyxZQUFhO0FBR3ZCLFFBQUksQ0FBQyxLQUFLLGlCQUFpQjtBQUN6QixXQUFLLGVBQWU7QUFBQSxJQUN0QjtBQUVBLFFBQUksS0FBSyxjQUFjLEtBQU07QUFFN0IsUUFBSTtBQUNGLFlBQU0sT0FBTyxHQUFHLEtBQUssVUFBVSxLQUFLLENBQUM7QUFBQTtBQUNyQyxnQkFBVSxLQUFLLFdBQVcsSUFBSTtBQUFBLElBQ2hDLFFBQVE7QUFBQSxJQUlSO0FBQUEsRUFDRjtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBS1EsaUJBQXVCO0FBQzdCLFNBQUssa0JBQWtCO0FBRXZCLFFBQUksQ0FBQyxLQUFLLFlBQWE7QUFFdkIsUUFBSTtBQUVGLFlBQU0sTUFBTSxRQUFRLEtBQUssV0FBVztBQUNwQyxVQUFJLENBQUMsV0FBVyxHQUFHLEdBQUc7QUFDcEIsa0JBQVUsS0FBSyxFQUFFLFdBQVcsS0FBSyxDQUFDO0FBQUEsTUFDcEM7QUFHQSxXQUFLLFlBQVksU0FBUyxLQUFLLGFBQWEsR0FBRztBQUFBLElBQ2pELFFBQVE7QUFFTixXQUFLLFlBQVk7QUFBQSxJQUNuQjtBQUFBLEVBQ0Y7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFPUSxpQkFBaUIsT0FBK0I7QUFDdEQsUUFBSSxpQkFBaUIsT0FBTztBQUMxQixZQUFNLE9BQXNCO0FBQUEsUUFDMUIsTUFBTSxNQUFNO0FBQUEsUUFDWixTQUFTLE1BQU07QUFBQSxRQUNmLE9BQU8sTUFBTTtBQUFBLE1BQ2Y7QUFHQSxVQUFJLE1BQU0sVUFBVSxRQUFXO0FBQzdCLGFBQUssUUFBUSxLQUFLLGlCQUFpQixNQUFNLEtBQUs7QUFBQSxNQUNoRDtBQUVBLGFBQU87QUFBQSxJQUNUO0FBR0EsV0FBTztBQUFBLE1BQ0wsTUFBTTtBQUFBLE1BQ04sU0FBUyxPQUFPLEtBQUs7QUFBQSxJQUN2QjtBQUFBLEVBQ0Y7QUFDRjtBQTRETyxJQUFNLFNBQVMsSUFBSSxPQUFPOzs7QUMxdkJqQyxZQUFZLFNBQVM7QUF3Q2QsSUFBTSxlQUFOLE1BQU0sY0FBYTtBQUFBLEVBQ2hCO0FBQUEsRUFDQSxTQUFTO0FBQUEsRUFDVDtBQUFBLEVBRUEsWUFBWSxRQUFvQjtBQUN0QyxTQUFLLFNBQVM7QUFFZCxXQUFPLEdBQUcsUUFBUSxDQUFDLFVBQVU7QUFDM0IsV0FBSyxVQUFVLE1BQU0sU0FBUztBQUU5QixZQUFNLFFBQVEsS0FBSyxPQUFPLE1BQU0sSUFBSTtBQUNwQyxXQUFLLFNBQVMsTUFBTSxJQUFJLEtBQUs7QUFFN0IsaUJBQVcsUUFBUSxPQUFPO0FBQ3hCLFlBQUksS0FBSyxLQUFLLE1BQU0sR0FBSTtBQUN4QixZQUFJO0FBQ0YsZ0JBQU0sU0FBUyxLQUFLLE1BQU0sSUFBSTtBQUM5QixlQUFLLGlCQUFpQixNQUFNO0FBQUEsUUFDOUIsUUFBUTtBQUFBLFFBRVI7QUFBQSxNQUNGO0FBQUEsSUFDRixDQUFDO0FBQUEsRUFDSDtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFTQSxPQUFPLFFBQVEsWUFBMkM7QUFDeEQsV0FBTyxJQUFJLFFBQVEsQ0FBQ0EsVUFBUyxXQUFXO0FBQ3RDLFlBQU0sU0FBYSxxQkFBaUIsWUFBWSxNQUFNO0FBQ3BELFFBQUFBLFNBQVEsSUFBSSxjQUFhLE1BQU0sQ0FBQztBQUFBLE1BQ2xDLENBQUM7QUFDRCxhQUFPLEdBQUcsU0FBUyxNQUFNO0FBQUEsSUFDM0IsQ0FBQztBQUFBLEVBQ0g7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFVQSxVQUFVLFNBQWlEO0FBQ3pELFNBQUssaUJBQWlCO0FBQUEsRUFDeEI7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFPQSxhQUFhLFVBQTZDO0FBQ3hELFNBQUssT0FBTyxNQUFNLEdBQUcsS0FBSyxVQUFVLFFBQVEsQ0FBQztBQUFBLENBQUk7QUFBQSxFQUNuRDtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQVVBLGlCQUFpQixVQUF1QyxVQUE0QjtBQUNsRixTQUFLLE9BQU8sTUFBTSxHQUFHLEtBQUssVUFBVSxRQUFRLENBQUM7QUFBQSxHQUFNLFFBQVE7QUFBQSxFQUM3RDtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBS0EsUUFBYztBQUNaLFNBQUssT0FBTyxRQUFRO0FBQUEsRUFDdEI7QUFDRjs7O0FDdkRBLFNBQVMsZ0JBQWdCLE9BQXdCO0FBQy9DLFNBQU8saUJBQWlCLFFBQVEsTUFBTSxVQUFVLE9BQU8sS0FBSztBQUM5RDtBQWNBLFNBQVMsZUFBZSxVQUF5QjtBQUMvQyxTQUFPLGFBQWE7QUFDcEIsU0FBTyxNQUFNO0FBQ2IsVUFBUSxLQUFLLFFBQVE7QUFDdkI7QUFjQSxTQUFTLHlCQUF5QixPQUF1QjtBQUN2RCxRQUFNLFVBQVUsZ0JBQWdCLEtBQUs7QUFDckMsU0FBTyxNQUFNLDZDQUE2QyxPQUFPLEVBQUU7QUFDbkUsYUFBVyxtQkFBbUIsT0FBTyxFQUFFO0FBQ3ZDLGlCQUFlLFdBQVcsS0FBSztBQUNqQztBQWNBLFNBQVMsbUJBQW1CLE9BQXVCO0FBQ2pELFFBQU0sY0FBYyxpQkFBaUIsUUFBUyxNQUFNLFNBQVMsTUFBTSxVQUFXLE9BQU8sS0FBSztBQUMxRixVQUFRLE9BQU8sTUFBTSxHQUFHLFdBQVc7QUFBQSxDQUFJO0FBQ3ZDLFNBQU8sTUFBTSxrQkFBa0IsZ0JBQWdCLEtBQUssQ0FBQyxFQUFFO0FBQ3ZELGlCQUFlLFdBQVcsS0FBSztBQUNqQztBQXdEQSxlQUFzQixlQUFlLFNBQW9DO0FBQ3ZFLE1BQUk7QUFDRixRQUFJO0FBRUosUUFBSTtBQUNGLFVBQUksUUFBUSxnQkFBZ0IsVUFBVTtBQUNwQyxnQkFBUSxtQkFBbUI7QUFBQSxNQUM3QixPQUFPO0FBQ0wsZ0JBQVEsaUJBQWlCO0FBQUEsTUFDM0I7QUFBQSxJQUNGLFNBQVMsT0FBTztBQUNkLGFBQU8seUJBQXlCLEtBQUs7QUFBQSxJQUN2QztBQUdBLFdBQU8sV0FBVyxRQUFRLGFBQWEsRUFBRSxHQUFHLE1BQU0sQ0FBQztBQUVuRCxRQUFJLFFBQVEsZ0JBQWdCLFVBQVU7QUFFcEMsVUFBSTtBQUNKLFlBQU0sYUFBYSxRQUFRLElBQUksZUFBZSxXQUFXO0FBQ3pELFVBQUksWUFBWTtBQUNkLFlBQUk7QUFDRix5QkFBZSxNQUFNLGFBQWEsUUFBUSxVQUFVO0FBQUEsUUFDdEQsU0FBUyxPQUFPO0FBQ2QsaUJBQU8sS0FBSyxrQ0FBa0MsVUFBVSxLQUFLLGdCQUFnQixLQUFLLENBQUMsRUFBRTtBQUFBLFFBRXZGO0FBQUEsTUFDRjtBQUdBLFVBQUk7QUFDSixVQUFJO0FBQ0osVUFBSSxtQkFBbUI7QUFHdkIsWUFBTSxVQUF5QjtBQUFBLFFBQzdCO0FBQUEsUUFDQSxLQUFLLFFBQVEsSUFBSTtBQUFBLFFBQ2pCLFVBQVUsQ0FBQyxhQUFhO0FBQ3RCLDJCQUFpQjtBQUFBLFFBQ25CO0FBQUEsUUFDQSx1QkFBdUIsQ0FBQyxhQUFhO0FBQ25DLHdDQUE4QjtBQUFBLFFBQ2hDO0FBQUEsTUFDRjtBQUdBLFVBQUksY0FBYztBQUNoQixxQkFBYSxVQUFVLENBQUMsUUFBdUI7QUFFN0MsY0FBSSxpQkFBa0I7QUFDdEIsNkJBQW1CO0FBRW5CLGNBQUksSUFBSSxTQUFTLFVBQVU7QUFDekIsZ0NBQW9CLGdCQUFnQixZQUFZO0FBQUEsVUFDbEQsV0FBVyxJQUFJLFNBQVMsdUJBQXVCO0FBQzdDLDZDQUFpQyw2QkFBNkIsWUFBYTtBQUFBLFVBQzdFO0FBQUEsUUFDRixDQUFDO0FBQUEsTUFDSDtBQUdBLFVBQUk7QUFDRixjQUFNLFFBQVEsT0FBc0IsT0FBTztBQUFBLE1BQzdDLFNBQVMsT0FBTztBQUNkLHNCQUFjLE1BQU07QUFDcEIsZUFBTyxtQkFBbUIsS0FBSztBQUFBLE1BQ2pDO0FBR0Esb0JBQWMsTUFBTTtBQUNwQixxQkFBZSxXQUFXLE9BQU87QUFBQSxJQUNuQyxPQUFPO0FBRUwsWUFBTSxVQUEyQjtBQUFBLFFBQy9CO0FBQUEsUUFDQSxLQUFLLFFBQVEsSUFBSTtBQUFBLE1BQ25CO0FBR0EsVUFBSTtBQUNGLGNBQU0sUUFBUSxPQUF3QixPQUFPO0FBQUEsTUFDL0MsU0FBUyxPQUFPO0FBQ2QsZUFBTyxtQkFBbUIsS0FBSztBQUFBLE1BQ2pDO0FBRUEscUJBQWUsV0FBVyxPQUFPO0FBQUEsSUFDbkM7QUFBQSxFQUNGLFNBQVMsT0FBTztBQUVkLFdBQU8sTUFBTSw2QkFBNkIsZ0JBQWdCLEtBQUssQ0FBQyxFQUFFO0FBQ2xFLG1CQUFlLFdBQVcsS0FBSztBQUFBLEVBQ2pDO0FBQ0Y7QUFnQkEsU0FBUyxVQUFhLFFBQW9DO0FBQ3hELE1BQUksVUFBVSxPQUFRLE9BQXNCLFNBQVMsWUFBWTtBQUMvRCxXQUFPO0FBQUEsRUFDVDtBQUNBLFNBQU8sUUFBUSxRQUFRLE1BQU07QUFDL0I7QUFjQSxTQUFTLG9CQUNQLFVBQ0EsY0FDTTtBQUNOLE1BQUksQ0FBQyxVQUFVO0FBQ2IsWUFBUSxLQUFLLFFBQVEsS0FBSyxTQUFTO0FBQ25DO0FBQUEsRUFDRjtBQUVBLFlBQVUsU0FBUyxDQUFDLEVBQUU7QUFBQSxJQUNwQixNQUFNO0FBQ0osb0JBQWMsTUFBTTtBQUNwQixxQkFBZSxXQUFXLEtBQUs7QUFBQSxJQUNqQztBQUFBLElBQ0EsTUFBTTtBQUNKLG9CQUFjLE1BQU07QUFDcEIscUJBQWUsV0FBVyxLQUFLO0FBQUEsSUFDakM7QUFBQSxFQUNGO0FBQ0Y7QUFnQkEsU0FBUyxpQ0FDUCxVQUNBLGNBQ007QUFDTixNQUFJLENBQUMsVUFBVTtBQUNiO0FBQUEsRUFDRjtBQUVBLFlBQVUsU0FBUyxDQUFDLEVBQUU7QUFBQSxJQUNwQixDQUFDLFNBQVM7QUFDUixtQkFBYSxpQkFBaUIsRUFBRSxNQUFNLCtCQUErQixLQUFLLEdBQUcsTUFBTTtBQUNqRix1QkFBZSxXQUFXLHFCQUFxQjtBQUFBLE1BQ2pELENBQUM7QUFBQSxJQUNIO0FBQUEsSUFDQSxDQUFDLFVBQVU7QUFDVCxhQUFPLE1BQU0sdUNBQXVDLGdCQUFnQixLQUFLLENBQUMsRUFBRTtBQUM1RSxtQkFBYSxNQUFNO0FBQ25CLHFCQUFlLFdBQVcsS0FBSztBQUFBLElBQ2pDO0FBQUEsRUFDRjtBQUNGOzs7QUM1V0EsU0FBNEIsWUFBQUMsV0FBVSxTQUFBQyxjQUFhO0FBQ25ELFlBQVlDLFNBQVE7QUFDcEIsWUFBWUMsV0FBVTtBQUN0QixTQUFTLGFBQUFDLGtCQUFpQjs7O0FDZW5CLElBQU0sV0FBTixjQUF1QixNQUFNO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQVFsQyxZQUNFLFNBQ2dCLE1BQ0EsUUFDaEI7QUFDQSxVQUFNLE9BQU87QUFIRztBQUNBO0FBR2hCLFNBQUssT0FBTztBQUFBLEVBQ2Q7QUFDRjtBQW1CTyxJQUFNLGVBQU4sY0FBMkIsTUFBTTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBT3RDLFlBQ0UsU0FDZ0IsT0FDaEI7QUFDQSxVQUFNLE9BQU87QUFGRztBQUdoQixTQUFLLE9BQU87QUFBQSxFQUNkO0FBQ0Y7OztBQ3RDQSxJQUFNLHFCQUFxQjtBQUczQixJQUFNLGlCQUFpQjtBQUd2QixJQUFNLHNCQUFzQjtBQXdCckIsSUFBTSxjQUFOLE1BQWtCO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFZdkIsWUFDbUIsU0FDakIsWUFDQTtBQUZpQjtBQUdqQixTQUFLLGNBQWM7QUFBQSxFQUNyQjtBQUFBLEVBaEJpQjtBQUFBO0FBQUEsRUFHVCxvQkFBb0I7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFvQjVCLGFBQXFCO0FBQ25CLFdBQU8sS0FBSyxRQUFRO0FBQUEsRUFDdEI7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQVFBLGdCQUF5QjtBQUN2QixXQUFPLEtBQUssZ0JBQWdCO0FBQUEsRUFDOUI7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBUVEsaUJBQWlCLGdCQUFrRDtBQUN6RSxRQUFJLGVBQWdCLFFBQU87QUFDM0IsV0FBTyxZQUFZLFFBQVEsS0FBSyxpQkFBaUI7QUFBQSxFQUNuRDtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBS1EsbUJBQXlCO0FBQy9CLFNBQUssb0JBQW9CO0FBQUEsRUFDM0I7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQUtRLG1CQUF5QjtBQUMvQixTQUFLLG9CQUFvQixLQUFLLElBQUksS0FBSyxvQkFBb0IsR0FBRyxjQUFjO0FBQUEsRUFDOUU7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQVFRLG9CQUFnQztBQUFBLElBQ3RDLEtBQUssT0FBVSxLQUFhLFlBQXNDO0FBQ2hFLFlBQU0sV0FBVyxNQUFNLE1BQU0sS0FBSztBQUFBLFFBQ2hDLEdBQUc7QUFBQSxRQUNILFNBQVMsRUFBRSxHQUFHLEtBQUssV0FBVyxHQUFHLEdBQUcsU0FBUyxRQUFRO0FBQUEsUUFDckQsUUFBUSxLQUFLLGlCQUFpQixTQUFTLE1BQU07QUFBQSxNQUMvQyxDQUFDO0FBQ0QsVUFBSSxDQUFDLFNBQVMsR0FBSSxPQUFNO0FBQ3hCLGFBQU8sU0FBUyxLQUFLO0FBQUEsSUFDdkI7QUFBQSxJQUNBLE1BQU0sT0FBVSxLQUFhLE1BQWUsWUFBc0M7QUFDaEYsWUFBTSxXQUFXLE1BQU0sTUFBTSxLQUFLO0FBQUEsUUFDaEMsR0FBRztBQUFBLFFBQ0gsUUFBUTtBQUFBLFFBQ1IsU0FBUyxFQUFFLEdBQUcsS0FBSyxXQUFXLEdBQUcsR0FBRyxTQUFTLFFBQVE7QUFBQSxRQUNyRCxNQUFNLE9BQU8sS0FBSyxVQUFVLElBQUksSUFBSTtBQUFBLFFBQ3BDLFFBQVEsS0FBSyxpQkFBaUIsU0FBUyxNQUFNO0FBQUEsTUFDL0MsQ0FBQztBQUNELFVBQUksQ0FBQyxTQUFTLEdBQUksT0FBTTtBQUN4QixhQUFPLFNBQVMsS0FBSztBQUFBLElBQ3ZCO0FBQUEsSUFDQSxLQUFLLE9BQVUsS0FBYSxNQUFlLFlBQXNDO0FBQy9FLFlBQU0sV0FBVyxNQUFNLE1BQU0sS0FBSztBQUFBLFFBQ2hDLEdBQUc7QUFBQSxRQUNILFFBQVE7QUFBQSxRQUNSLFNBQVMsRUFBRSxHQUFHLEtBQUssV0FBVyxHQUFHLEdBQUcsU0FBUyxRQUFRO0FBQUEsUUFDckQsTUFBTSxPQUFPLEtBQUssVUFBVSxJQUFJLElBQUk7QUFBQSxRQUNwQyxRQUFRLEtBQUssaUJBQWlCLFNBQVMsTUFBTTtBQUFBLE1BQy9DLENBQUM7QUFDRCxVQUFJLENBQUMsU0FBUyxHQUFJLE9BQU07QUFDeEIsYUFBTyxTQUFTLEtBQUs7QUFBQSxJQUN2QjtBQUFBLElBQ0EsT0FBTyxPQUFVLEtBQWEsTUFBZSxZQUFzQztBQUNqRixZQUFNLFdBQVcsTUFBTSxNQUFNLEtBQUs7QUFBQSxRQUNoQyxHQUFHO0FBQUEsUUFDSCxRQUFRO0FBQUEsUUFDUixTQUFTLEVBQUUsR0FBRyxLQUFLLFdBQVcsR0FBRyxHQUFHLFNBQVMsUUFBUTtBQUFBLFFBQ3JELE1BQU0sT0FBTyxLQUFLLFVBQVUsSUFBSSxJQUFJO0FBQUEsUUFDcEMsUUFBUSxLQUFLLGlCQUFpQixTQUFTLE1BQU07QUFBQSxNQUMvQyxDQUFDO0FBQ0QsVUFBSSxDQUFDLFNBQVMsR0FBSSxPQUFNO0FBQ3hCLGFBQU8sU0FBUyxLQUFLO0FBQUEsSUFDdkI7QUFBQSxJQUNBLFFBQVEsT0FBTyxLQUFhLFlBQXlDO0FBQ25FLFlBQU0sV0FBVyxNQUFNLE1BQU0sS0FBSztBQUFBLFFBQ2hDLEdBQUc7QUFBQSxRQUNILFFBQVE7QUFBQSxRQUNSLFNBQVMsRUFBRSxHQUFHLEtBQUssV0FBVyxHQUFHLEdBQUcsU0FBUyxRQUFRO0FBQUEsUUFDckQsUUFBUSxLQUFLLGlCQUFpQixTQUFTLE1BQU07QUFBQSxNQUMvQyxDQUFDO0FBQ0QsVUFBSSxDQUFDLFNBQVMsR0FBSSxPQUFNO0FBQUEsSUFDMUI7QUFBQSxFQUNGO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBT1EsYUFBMEI7QUFDaEMsVUFBTSxVQUF1QixFQUFFLGdCQUFnQixtQkFBbUI7QUFDbEUsUUFBSSxLQUFLLFFBQVEsYUFBYTtBQUM1QixjQUFRLGVBQWUsSUFBSSxVQUFVLEtBQUssUUFBUSxXQUFXO0FBQUEsSUFDL0Q7QUFDQSxXQUFPO0FBQUEsRUFDVDtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQU9RLGdCQUE0QjtBQUNsQyxXQUFPLEtBQUssZUFBZSxLQUFLO0FBQUEsRUFDbEM7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQVdRLFNBQVNDLE9BQWMsUUFBMEM7QUFDdkUsVUFBTSxNQUFNLElBQUksSUFBSUEsT0FBTSxLQUFLLFFBQVEsT0FBTztBQUM5QyxRQUFJLFFBQVE7QUFDVixpQkFBVyxDQUFDLEtBQUssS0FBSyxLQUFLLE9BQU8sUUFBUSxNQUFNLEdBQUc7QUFDakQsWUFBSSxVQUFVLFVBQWEsVUFBVSxNQUFNO0FBQ3pDLGNBQUksYUFBYSxJQUFJLEtBQUssT0FBTyxLQUFLLENBQUM7QUFBQSxRQUN6QztBQUFBLE1BQ0Y7QUFBQSxJQUNGO0FBQ0EsV0FBTyxJQUFJLFNBQVM7QUFBQSxFQUN0QjtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQVVBLE1BQWMsUUFBVyxJQUFrQztBQUN6RCxRQUFJO0FBRUosYUFBUyxVQUFVLEdBQUcsV0FBVyxxQkFBcUIsV0FBVztBQUMvRCxVQUFJO0FBQ0YsY0FBTSxTQUFTLE1BQU0sR0FBRztBQUN4QixhQUFLLGlCQUFpQjtBQUN0QixlQUFPO0FBQUEsTUFDVCxTQUFTLE9BQU87QUFDZCxZQUFJLGlCQUFpQixVQUFVO0FBRTdCLGVBQUssaUJBQWlCO0FBQ3RCLGNBQUksT0FBZ0MsQ0FBQztBQUNyQyxjQUFJO0FBQ0YsbUJBQU8sTUFBTSxNQUFNLEtBQUs7QUFBQSxVQUMxQixTQUFTLFlBQVk7QUFFbkIsZ0JBQUksRUFBRSxzQkFBc0IsY0FBYztBQUN4QyxzQkFBUSxLQUFLLDBEQUEwRCxVQUFVO0FBQUEsWUFDbkY7QUFBQSxVQUNGO0FBQ0EsZ0JBQU0sVUFDSCxLQUFLLE9BQU8sS0FBNkIsS0FBSyxTQUFTLEtBQTRCLE1BQU07QUFDNUYsZ0JBQU0sT0FBUSxLQUFLLE1BQU0sS0FBNEIsT0FBTyxNQUFNLE1BQU07QUFDeEUsZ0JBQU0sU0FBUyxLQUFLLFFBQVE7QUFDNUIsZ0JBQU0sSUFBSSxTQUFTLFNBQVMsTUFBTSxNQUFNO0FBQUEsUUFDMUM7QUFHQSxhQUFLLGlCQUFpQjtBQUV0QixZQUFJLGlCQUFpQixnQkFBZ0IsTUFBTSxTQUFTLGdCQUFnQjtBQUNsRSw2QkFBbUIsSUFBSSxhQUFhLHFCQUFxQixLQUFLO0FBRTlEO0FBQUEsUUFDRjtBQUdBLGNBQU0sSUFBSSxhQUFhLGtCQUFrQixpQkFBaUIsUUFBUSxRQUFRLE1BQVM7QUFBQSxNQUNyRjtBQUFBLElBQ0Y7QUFHQSxVQUFNO0FBQUEsRUFDUjtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBWUEsTUFBTSxVQUFVLFNBQTZDO0FBQzNELFVBQU0sU0FBUyxLQUFLLFNBQVMsVUFBVTtBQUFBLE1BQ3JDLGVBQWUsS0FBSyxRQUFRO0FBQUEsTUFDNUIsUUFBUSxTQUFTO0FBQUEsTUFDakIsUUFBUSxTQUFTO0FBQUEsTUFDakIsT0FBTyxTQUFTO0FBQUEsTUFDaEIsUUFBUSxTQUFTO0FBQUEsSUFDbkIsQ0FBQztBQUNELFVBQU0sTUFBTSxJQUFJLElBQUksTUFBTTtBQUMxQixlQUFXLEtBQUssU0FBUyxRQUFRLENBQUMsR0FBRztBQUNuQyxVQUFJLGFBQWEsT0FBTyxPQUFPLENBQUM7QUFBQSxJQUNsQztBQUNBLFdBQU8sS0FBSyxRQUFRLE1BQU0sS0FBSyxjQUFjLEVBQUUsSUFBWSxJQUFJLFNBQVMsQ0FBQyxDQUFDO0FBQUEsRUFDNUU7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFhQSxNQUFNLG9CQUErRDtBQUNuRSxVQUFNLE1BQU0sS0FBSyxTQUFTLGVBQWU7QUFBQSxNQUN2QyxlQUFlLEtBQUssUUFBUTtBQUFBLElBQzlCLENBQUM7QUFDRCxXQUFPLEtBQUssUUFBUSxNQUFNLEtBQUssY0FBYyxFQUFFLElBQVMsR0FBRyxDQUFDO0FBQUEsRUFDOUQ7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFVQSxNQUFNLFFBQVEsUUFBK0I7QUFDM0MsVUFBTSxNQUFNLEtBQUssU0FBUyxVQUFVLE1BQU0sSUFBSTtBQUFBLE1BQzVDLGVBQWUsS0FBSyxRQUFRO0FBQUEsSUFDOUIsQ0FBQztBQUNELFdBQU8sS0FBSyxRQUFRLE1BQU0sS0FBSyxjQUFjLEVBQUUsSUFBVSxHQUFHLENBQUM7QUFBQSxFQUMvRDtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQVVBLE1BQU0sV0FBVyxNQUFxQztBQUNwRCxVQUFNLE1BQU0sS0FBSyxTQUFTLFFBQVE7QUFDbEMsVUFBTSxPQUFPO0FBQUEsTUFDWCxHQUFHO0FBQUEsTUFDSCxlQUFlLEtBQUssUUFBUTtBQUFBLElBQzlCO0FBQ0EsV0FBTyxLQUFLLFFBQVEsTUFBTSxLQUFLLGNBQWMsRUFBRSxLQUFXLEtBQUssSUFBSSxDQUFDO0FBQUEsRUFDdEU7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBWUEsTUFBTSxXQUFXLFFBQWdCLE1BQXFDO0FBQ3BFLFVBQU0sTUFBTSxLQUFLLFNBQVMsVUFBVSxNQUFNLEVBQUU7QUFDNUMsV0FBTyxLQUFLLFFBQVEsTUFBTSxLQUFLLGNBQWMsRUFBRSxNQUFZLEtBQUssSUFBSSxDQUFDO0FBQUEsRUFDdkU7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQVdBLE1BQU0sV0FBVyxRQUErQjtBQUM5QyxVQUFNLE1BQU0sS0FBSyxTQUFTLFVBQVUsTUFBTSxFQUFFO0FBQzVDLFdBQU8sS0FBSyxRQUFRLE1BQU0sS0FBSyxjQUFjLEVBQUUsT0FBTyxHQUFHLENBQUM7QUFBQSxFQUM1RDtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBWUEsTUFBTSxZQUFZLFFBQW9DO0FBQ3BELFVBQU0sTUFBTSxLQUFLLFNBQVMsVUFBVSxNQUFNLFdBQVc7QUFDckQsV0FBTyxLQUFLLFFBQVEsTUFBTSxLQUFLLGNBQWMsRUFBRSxJQUFlLEdBQUcsQ0FBQztBQUFBLEVBQ3BFO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFXQSxNQUFNLFdBQVcsUUFBZ0IsV0FBcUM7QUFDcEUsVUFBTSxNQUFNLEtBQUssU0FBUyxVQUFVLE1BQU0sYUFBYSxTQUFTLEVBQUU7QUFDbEUsV0FBTyxLQUFLLFFBQVEsTUFBTSxLQUFLLGNBQWMsRUFBRSxJQUFhLEdBQUcsQ0FBQztBQUFBLEVBQ2xFO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQVlBLE1BQU0sY0FBYyxRQUFnQixNQUEyQztBQUM3RSxVQUFNLE1BQU0sS0FBSyxTQUFTLFVBQVUsTUFBTSxXQUFXO0FBQ3JELFdBQU8sS0FBSyxRQUFRLE1BQU0sS0FBSyxjQUFjLEVBQUUsS0FBYyxLQUFLLElBQUksQ0FBQztBQUFBLEVBQ3pFO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBYUEsTUFBTSxjQUFjLFFBQWdCLFdBQW1CLE1BQTJDO0FBQ2hHLFVBQU0sTUFBTSxLQUFLLFNBQVMsVUFBVSxNQUFNLGFBQWEsU0FBUyxFQUFFO0FBQ2xFLFdBQU8sS0FBSyxRQUFRLE1BQU0sS0FBSyxjQUFjLEVBQUUsTUFBZSxLQUFLLElBQUksQ0FBQztBQUFBLEVBQzFFO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQVlBLE1BQU0sY0FBYyxRQUFnQixXQUFrQztBQUNwRSxVQUFNLE1BQU0sS0FBSyxTQUFTLFVBQVUsTUFBTSxhQUFhLFNBQVMsRUFBRTtBQUNsRSxXQUFPLEtBQUssUUFBUSxNQUFNLEtBQUssY0FBYyxFQUFFLE9BQU8sR0FBRyxDQUFDO0FBQUEsRUFDNUQ7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFpQkEsTUFBTSxpQkFBaUIsUUFBZ0IsTUFBYyxNQUFnRTtBQUNuSCxVQUFNLE1BQU0sS0FBSyxTQUFTLFVBQVUsTUFBTSxnQkFBZ0IsbUJBQW1CLElBQUksQ0FBQyxFQUFFO0FBR3BGLFFBQUk7QUFDSixRQUFJLGdCQUFnQixNQUFNO0FBQ3hCLGFBQU87QUFBQSxJQUNULFdBQVcsZ0JBQWdCLGFBQWE7QUFDdEMsYUFBTyxJQUFJLEtBQUssQ0FBQyxJQUFJLENBQUM7QUFBQSxJQUN4QixPQUFPO0FBRUwsWUFBTSxlQUFlLEtBQUssSUFBSTtBQUM5QixZQUFNLFFBQVEsSUFBSSxXQUFXLGFBQWEsTUFBTTtBQUNoRCxlQUFTLElBQUksR0FBRyxJQUFJLGFBQWEsUUFBUSxLQUFLO0FBQzVDLGNBQU0sQ0FBQyxJQUFJLGFBQWEsV0FBVyxDQUFDO0FBQUEsTUFDdEM7QUFDQSxhQUFPLElBQUksS0FBSyxDQUFDLEtBQUssQ0FBQztBQUFBLElBQ3pCO0FBRUEsV0FBTyxLQUFLLFFBQVEsWUFBWTtBQUM5QixZQUFNLFdBQVcsTUFBTSxNQUFNLEtBQUs7QUFBQSxRQUNoQyxRQUFRO0FBQUEsUUFDUixTQUFTO0FBQUEsVUFDUCxHQUFHLEtBQUssV0FBVztBQUFBLFVBQ25CLGdCQUFnQjtBQUFBLFFBQ2xCO0FBQUEsUUFDQTtBQUFBLFFBQ0EsUUFBUSxLQUFLLGlCQUFpQjtBQUFBLE1BQ2hDLENBQUM7QUFDRCxVQUFJLENBQUMsU0FBUyxHQUFJLE9BQU07QUFDeEIsYUFBTyxTQUFTLEtBQUs7QUFBQSxJQUN2QixDQUFDO0FBQUEsRUFDSDtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQWFBLE1BQU0sY0FBYyxRQUFnQixjQUFxQztBQUN2RSxVQUFNLE1BQU0sS0FBSyxTQUFTLFVBQVUsTUFBTSxnQkFBZ0IsWUFBWSxFQUFFO0FBQ3hFLFdBQU8sS0FBSyxRQUFRLFlBQVk7QUFDOUIsWUFBTSxXQUFXLE1BQU0sTUFBTSxLQUFLO0FBQUEsUUFDaEMsU0FBUyxLQUFLLFdBQVc7QUFBQSxRQUN6QixRQUFRLEtBQUssaUJBQWlCO0FBQUEsTUFDaEMsQ0FBQztBQUNELFVBQUksQ0FBQyxTQUFTLEdBQUksT0FBTTtBQUN4QixhQUFPLFNBQVMsS0FBSztBQUFBLElBQ3ZCLENBQUM7QUFBQSxFQUNIO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBVUEsTUFBTSxnQkFBZ0IsUUFBK0M7QUFDbkUsVUFBTSxNQUFNLEtBQUssU0FBUyxVQUFVLE1BQU0sY0FBYztBQUN4RCxXQUFPLEtBQUssUUFBUSxNQUFNLEtBQUssY0FBYyxFQUFFLElBQTBCLEdBQUcsQ0FBQztBQUFBLEVBQy9FO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQWFBLE1BQU0sWUFBWSxRQUFnQixTQUFvRDtBQUNwRixVQUFNLE1BQU0sS0FBSyxTQUFTLFVBQVUsTUFBTSxhQUFhO0FBQUEsTUFDckQsUUFBUSxTQUFTO0FBQUEsTUFDakIsT0FBTyxTQUFTO0FBQUEsSUFDbEIsQ0FBQztBQUNELFdBQU8sS0FBSyxRQUFRLE1BQU0sS0FBSyxjQUFjLEVBQUUsSUFBb0IsR0FBRyxDQUFDO0FBQUEsRUFDekU7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQVlBLE1BQU0sUUFBUSxRQUFpQztBQUM3QyxVQUFNLE1BQU0sS0FBSyxTQUFTLFVBQVUsTUFBTSxPQUFPO0FBQ2pELFVBQU0sV0FBVyxNQUFNLEtBQUssUUFBUSxNQUFNLEtBQUssY0FBYyxFQUFFLElBQXlCLEdBQUcsQ0FBQztBQUM1RixXQUFPLFNBQVM7QUFBQSxFQUNsQjtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFZQSxNQUFNLFdBQVcsUUFBZ0IsU0FBZ0M7QUFDL0QsVUFBTSxNQUFNLEtBQUssU0FBUyxVQUFVLE1BQU0sT0FBTztBQUNqRCxXQUFPLEtBQUssUUFBUSxNQUFNLEtBQUssY0FBYyxFQUFFLElBQVUsS0FBSyxPQUFPLENBQUM7QUFBQSxFQUN4RTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQWNBLE1BQU0sWUFBWSxRQUFnQixVQUFrRTtBQUNsRyxVQUFNLE1BQU0sS0FBSyxTQUFTLFVBQVUsTUFBTSxVQUFVLFFBQVEsVUFBVTtBQUN0RSxXQUFPLEtBQUssUUFBUSxNQUFNLEtBQUssY0FBYyxFQUFFLEtBQTJCLEtBQUssTUFBUyxDQUFDO0FBQUEsRUFDM0Y7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQVlBLE1BQU0sV0FBVyxRQUF1QztBQUN0RCxVQUFNLE1BQU0sS0FBSyxTQUFTLFVBQVUsTUFBTSxVQUFVO0FBQ3BELFdBQU8sS0FBSyxRQUFRLE1BQU0sS0FBSyxjQUFjLEVBQUUsSUFBa0IsR0FBRyxDQUFDO0FBQUEsRUFDdkU7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQVdBLE1BQU0sVUFBVSxRQUFnQixLQUFrQztBQUNoRSxVQUFNLE1BQU0sS0FBSyxTQUFTLFVBQVUsTUFBTSxVQUFVO0FBQ3BELFdBQU8sS0FBSyxRQUFRLE1BQU0sS0FBSyxjQUFjLEVBQUUsS0FBaUIsS0FBSyxFQUFFLElBQUksQ0FBQyxDQUFDO0FBQUEsRUFDL0U7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFhQSxNQUFNLGFBQWEsUUFBZ0IsS0FBYSxTQUFpRDtBQUMvRixVQUFNLE1BQU0sS0FBSyxTQUFTLFVBQVUsTUFBTSxZQUFZLEdBQUcsRUFBRTtBQUMzRCxVQUFNLFVBQWtDLENBQUM7QUFDekMsUUFBSSxTQUFTLFdBQVc7QUFDdEIsY0FBUSxvQkFBb0IsSUFBSSxRQUFRO0FBQUEsSUFDMUM7QUFDQSxXQUFPLEtBQUssUUFBUSxNQUFNLEtBQUssY0FBYyxFQUFFLE9BQU8sS0FBSyxFQUFFLFFBQVEsQ0FBQyxDQUFDO0FBQUEsRUFDekU7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQVlBLE1BQU0sWUFBWSxRQUFnQixTQUFpRTtBQUNqRyxVQUFNLE1BQU0sS0FBSyxTQUFTLFVBQVUsTUFBTSxhQUFhO0FBQUEsTUFDckQsZUFBZSxTQUFTO0FBQUEsSUFDMUIsQ0FBQztBQUNELFdBQU8sS0FBSyxRQUFRLE1BQU0sS0FBSyxjQUFjLEVBQUUsSUFBc0IsR0FBRyxDQUFDO0FBQUEsRUFDM0U7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQVdBLE1BQU0sVUFBVSxRQUFnQixNQUF3QixTQUFpRDtBQUN2RyxVQUFNLE1BQU0sS0FBSyxTQUFTLFVBQVUsTUFBTSxXQUFXO0FBQ3JELFVBQU0sVUFBa0MsQ0FBQztBQUN6QyxRQUFJLFNBQVMsV0FBVztBQUN0QixjQUFRLG9CQUFvQixJQUFJLFFBQVE7QUFBQSxJQUMxQztBQUNBLFVBQU0sS0FBSyxRQUFRLE1BQU0sS0FBSyxjQUFjLEVBQUUsS0FBYyxLQUFLLE1BQU0sRUFBRSxRQUFRLENBQUMsQ0FBQztBQUFBLEVBQ3JGO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFXQSxNQUFNLGFBQWEsUUFBZ0IsTUFBYyxTQUFpRDtBQUNoRyxVQUFNLE1BQU0sS0FBSyxTQUFTLFVBQVUsTUFBTSxhQUFhLG1CQUFtQixJQUFJLENBQUMsRUFBRTtBQUNqRixVQUFNLFVBQWtDLENBQUM7QUFDekMsUUFBSSxTQUFTLFdBQVc7QUFDdEIsY0FBUSxvQkFBb0IsSUFBSSxRQUFRO0FBQUEsSUFDMUM7QUFDQSxXQUFPLEtBQUssUUFBUSxNQUFNLEtBQUssY0FBYyxFQUFFLE9BQU8sS0FBSyxFQUFFLFFBQVEsQ0FBQyxDQUFDO0FBQUEsRUFDekU7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFXQSxNQUFNLFVBQTZCO0FBQ2pDLFVBQU0sTUFBTSxLQUFLLFNBQVMsU0FBUztBQUFBLE1BQ2pDLGVBQWUsS0FBSyxRQUFRO0FBQUEsSUFDOUIsQ0FBQztBQUNELFdBQU8sS0FBSyxRQUFRLE1BQU0sS0FBSyxjQUFjLEVBQUUsSUFBYyxHQUFHLENBQUM7QUFBQSxFQUNuRTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQVdBLE1BQU0sa0JBQTBFO0FBQzlFLFVBQU0sTUFBTSxLQUFLLFNBQVMsZUFBZTtBQUN6QyxXQUFPLEtBQUssUUFBUSxNQUFNLEtBQUssY0FBYyxFQUFFLElBQW1ELEdBQUcsQ0FBQztBQUFBLEVBQ3hHO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBY0EsTUFBTSxpQkFBaUIsUUFBZ0IsVUFBa0IsTUFBOEM7QUFDckcsVUFBTSxXQUFXLEdBQUcsUUFBUSxJQUFJLEtBQUssSUFBSSxDQUFDO0FBQzFDLFVBQU0sTUFBTSxLQUFLLFNBQVMsVUFBVSxNQUFNLDZCQUE2QixtQkFBbUIsUUFBUSxDQUFDLEVBQUU7QUFDckcsVUFBTSxPQUFPLEVBQUUsUUFBUSxVQUFVLEtBQUs7QUFDdEMsVUFBTSxLQUFLLFFBQVEsTUFBTSxLQUFLLGNBQWMsRUFBRSxJQUFhLEtBQUssSUFBSSxDQUFDO0FBQUEsRUFDdkU7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQWVBLE1BQU0sZUFBZSxRQUE4QztBQUNqRSxVQUFNLE1BQU0sS0FBSyxTQUFTLFVBQVUsTUFBTSxTQUFTO0FBQ25ELFdBQU8sS0FBSyxRQUFRLE1BQU0sS0FBSyxjQUFjLEVBQUUsSUFBeUIsR0FBRyxDQUFDO0FBQUEsRUFDOUU7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQVlBLE1BQU0sWUFBWSxRQUF1QztBQUN2RCxVQUFNLE1BQU0sS0FBSyxTQUFTLFVBQVUsTUFBTSxVQUFVO0FBQ3BELFdBQU8sS0FBSyxRQUFRLE1BQU0sS0FBSyxjQUFjLEVBQUUsSUFBa0IsR0FBRyxDQUFDO0FBQUEsRUFDdkU7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFnQkEsTUFBTSxVQUNKLFFBQ0EsWUFDQSxVQUNnRDtBQUNoRCxVQUFNLE1BQU0sS0FBSztBQUFBLE1BQ2YsVUFBVSxNQUFNLFlBQVksbUJBQW1CLFVBQVUsQ0FBQyxJQUFJLG1CQUFtQixRQUFRLENBQUM7QUFBQSxJQUM1RjtBQUNBLFdBQU8sS0FBSyxRQUFRLE1BQU0sS0FBSyxjQUFjLEVBQUUsSUFBMkMsR0FBRyxDQUFDO0FBQUEsRUFDaEc7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQXVCQSxXQUFXLFFBQWdCLFlBQW9CLFVBQWtCLFNBQTZDO0FBQzVHLFVBQU0sVUFBVSxJQUFJLFlBQVk7QUFDaEMsUUFBSTtBQUVKLFVBQU0sT0FBTyxJQUFJLGVBQTJCO0FBQUEsTUFDMUMsTUFBTSxHQUFHO0FBQ1AscUJBQWE7QUFBQSxNQUNmO0FBQUEsSUFDRixDQUFDO0FBRUQsVUFBTSxNQUFNLEtBQUs7QUFBQSxNQUNmLFVBQVUsTUFBTSxZQUFZLG1CQUFtQixVQUFVLENBQUMsSUFBSSxtQkFBbUIsUUFBUSxDQUFDO0FBQUEsSUFDNUY7QUFFQSxVQUFNLFVBQWtDO0FBQUEsTUFDdEMsZ0JBQWdCO0FBQUEsSUFDbEI7QUFDQSxRQUFJLEtBQUssUUFBUSxhQUFhO0FBQzVCLGNBQVEsZUFBZSxJQUFJLFVBQVUsS0FBSyxRQUFRLFdBQVc7QUFBQSxJQUMvRDtBQUNBLFFBQUksU0FBUyxPQUFPO0FBQ2xCLGNBQVEsZ0JBQWdCLElBQUksUUFBUTtBQUFBLElBQ3RDO0FBQ0EsUUFBSSxTQUFTLFdBQVc7QUFDdEIsY0FBUSxxQkFBcUIsSUFBSSxRQUFRO0FBQUEsSUFDM0M7QUFJQSxVQUFNLGVBQWlEO0FBQUEsTUFDckQsUUFBUTtBQUFBLE1BQ1I7QUFBQSxNQUNBO0FBQUEsTUFDQSxRQUFRO0FBQUEsSUFDVjtBQUVBLFVBQU0sa0JBQWtCLE1BQU0sS0FBSyxZQUFZO0FBUS9DLFFBQUksYUFBMkI7QUFDL0Isb0JBQ0csS0FBSyxDQUFDLGFBQWE7QUFDbEIsVUFBSSxDQUFDLFNBQVMsSUFBSTtBQUNoQixxQkFBYSxJQUFJLFNBQVMsU0FBUyxZQUFZLE9BQU8sU0FBUyxNQUFNLENBQUM7QUFBQSxNQUN4RTtBQUFBLElBQ0YsQ0FBQyxFQUNBLE1BQU0sQ0FBQyxRQUFpQjtBQUN2QixtQkFBYSxlQUFlLFFBQVEsTUFBTSxJQUFJLE1BQU0sT0FBTyxHQUFHLENBQUM7QUFBQSxJQUNqRSxDQUFDO0FBRUgsV0FBTztBQUFBLE1BQ0wsTUFBTSxNQUFvQjtBQUN4QixZQUFJLFdBQVksT0FBTTtBQUN0QixtQkFBVyxRQUFRLFFBQVEsT0FBTyxHQUFHLElBQUk7QUFBQSxDQUFJLENBQUM7QUFBQSxNQUNoRDtBQUFBLE1BQ0EsT0FBTyxZQUFtQztBQUN4QyxtQkFBVyxNQUFNO0FBQ2pCLGVBQU8sS0FBSyxRQUFRLFlBQVk7QUFDOUIsZ0JBQU0sV0FBVyxNQUFNO0FBQ3ZCLGNBQUksQ0FBQyxTQUFTLEdBQUksT0FBTTtBQUN4QixpQkFBTyxTQUFTLEtBQUs7QUFBQSxRQUN2QixDQUFDO0FBQUEsTUFDSDtBQUFBLElBQ0Y7QUFBQSxFQUNGO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFvQkEsTUFBTSxvQkFDSixRQUNBLFlBQ0EsVUFDQSxTQUNBLFdBQzBCO0FBQzFCLFVBQU0sVUFBVTtBQUdoQixVQUFNLFVBQVUsS0FBSyxRQUFRLFFBQVEsUUFBUSxTQUFTLElBQUk7QUFDMUQsVUFBTSxXQUFXLEdBQUcsT0FBTyxVQUFVLG1CQUFtQixNQUFNLENBQUMsWUFBWSxtQkFBbUIsVUFBVSxDQUFDLElBQUksbUJBQW1CLFFBQVEsQ0FBQztBQUN6SSxVQUFNLGNBQWMsSUFBSSxnQkFBZ0I7QUFDeEMsUUFBSSxTQUFTLE1BQU8sYUFBWSxJQUFJLFNBQVMsUUFBUSxLQUFLO0FBQzFELFFBQUksU0FBUyxVQUFXLGFBQVksSUFBSSxhQUFhLFFBQVEsU0FBUztBQUN0RSxVQUFNLGNBQWMsWUFBWSxTQUFTO0FBQ3pDLFVBQU0sTUFBTSxjQUFjLEdBQUcsUUFBUSxJQUFJLFdBQVcsS0FBSztBQUV6RCxVQUFNLFVBQWtDLENBQUM7QUFDekMsUUFBSSxLQUFLLFFBQVEsYUFBYTtBQUM1QixjQUFRLGVBQWUsSUFBSSxVQUFVLEtBQUssUUFBUSxXQUFXO0FBQUEsSUFDL0Q7QUFFQSxVQUFNLEtBQUssUUFBUSxLQUFLLEVBQUUsUUFBUSxDQUFDO0FBSW5DLFVBQU0sYUFBYSxNQUFNLElBQUksUUFBZ0IsQ0FBQ0MsVUFBUyxXQUFXO0FBQ2hFLFlBQU0sVUFBVSxDQUFDLFVBQWlDO0FBQ2hELFlBQUk7QUFDRixnQkFBTSxNQUFNLEtBQUssTUFBTSxPQUFPLE1BQU0sSUFBSSxDQUFDO0FBQ3pDLGNBQUksSUFBSSxTQUFTLFNBQVM7QUFDeEIsZUFBRyxvQkFBb0IsV0FBVyxPQUFPO0FBQ3pDLGVBQUcsb0JBQW9CLFNBQVMsT0FBTztBQUN2QyxlQUFHLG9CQUFvQixTQUFTLE9BQU87QUFDdkMsWUFBQUEsU0FBUSxJQUFJLGNBQWMsQ0FBQztBQUFBLFVBQzdCLFdBQVcsSUFBSSxTQUFTLFNBQVM7QUFDL0IsZUFBRyxvQkFBb0IsV0FBVyxPQUFPO0FBQ3pDLGVBQUcsb0JBQW9CLFNBQVMsT0FBTztBQUN2QyxlQUFHLG9CQUFvQixTQUFTLE9BQU87QUFDdkMsbUJBQU8sSUFBSSxNQUFNLElBQUksV0FBVyxjQUFjLENBQUM7QUFBQSxVQUNqRDtBQUFBLFFBRUYsUUFBUTtBQUNOLGlCQUFPLElBQUksTUFBTSxzQ0FBc0MsQ0FBQztBQUFBLFFBQzFEO0FBQUEsTUFDRjtBQUNBLFlBQU0sVUFBVSxDQUFDLFVBQWlCO0FBQ2hDLFdBQUcsb0JBQW9CLFdBQVcsT0FBTztBQUN6QyxXQUFHLG9CQUFvQixTQUFTLE9BQU87QUFDdkMsV0FBRyxvQkFBb0IsU0FBUyxPQUFPO0FBQ3ZDLGVBQU8sSUFBSSxNQUFNLG9CQUFvQixPQUFPLEtBQUssQ0FBQyxFQUFFLENBQUM7QUFBQSxNQUN2RDtBQUNBLFlBQU0sVUFBVSxDQUFDLFVBQXNCO0FBQ3JDLFdBQUcsb0JBQW9CLFdBQVcsT0FBTztBQUN6QyxXQUFHLG9CQUFvQixTQUFTLE9BQU87QUFDdkMsV0FBRyxvQkFBb0IsU0FBUyxPQUFPO0FBQ3ZDLGVBQU8sSUFBSSxNQUFNLHVDQUF1QyxPQUFPLE1BQU0sSUFBSSxDQUFDLEVBQUUsQ0FBQztBQUFBLE1BQy9FO0FBQ0EsU0FBRyxpQkFBaUIsV0FBVyxPQUFPO0FBQ3RDLFNBQUcsaUJBQWlCLFNBQVMsT0FBTztBQUNwQyxTQUFHLGlCQUFpQixTQUFTLE9BQU87QUFBQSxJQUN0QyxDQUFDO0FBRUQsUUFBSSxZQUFZO0FBRWhCLFdBQU87QUFBQSxNQUNMLElBQUksYUFBcUI7QUFDdkIsZUFBTztBQUFBLE1BQ1Q7QUFBQSxNQUNBLElBQUksWUFBb0I7QUFDdEIsZUFBTztBQUFBLE1BQ1Q7QUFBQSxNQUNBLE1BQU0sTUFBb0I7QUFDeEI7QUFDQSxXQUFHLEtBQUssS0FBSyxVQUFVLEVBQUUsTUFBTSxRQUFRLFlBQVksV0FBVyxTQUFTLEtBQUssQ0FBQyxDQUFDO0FBQUEsTUFDaEY7QUFBQSxNQUNBLE1BQU0sUUFBK0I7QUFDbkMsV0FBRyxLQUFLLEtBQUssVUFBVSxFQUFFLE1BQU0sUUFBUSxDQUFDLENBQUM7QUFDekMsY0FBTSxJQUFJLFFBQWMsQ0FBQ0EsYUFBWTtBQUNuQyxnQkFBTSxVQUFVLE1BQU07QUFDcEIsZUFBRyxvQkFBb0IsU0FBUyxPQUFPO0FBQ3ZDLFlBQUFBLFNBQVE7QUFBQSxVQUNWO0FBQ0EsYUFBRyxpQkFBaUIsU0FBUyxPQUFPO0FBRXBDLGNBQUksR0FBRyxlQUFlLEdBQUcsUUFBUTtBQUMvQixlQUFHLG9CQUFvQixTQUFTLE9BQU87QUFDdkMsWUFBQUEsU0FBUTtBQUFBLFVBQ1Y7QUFBQSxRQUNGLENBQUM7QUFDRCxlQUFPO0FBQUEsVUFDTDtBQUFBLFVBQ0E7QUFBQSxVQUNBLFdBQVc7QUFBQSxVQUNYLFFBQVE7QUFBQSxRQUNWO0FBQUEsTUFDRjtBQUFBLElBQ0Y7QUFBQSxFQUNGO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQWFBLE1BQU0sY0FBYyxRQUFnQixZQUEyQztBQUM3RSxVQUFNLE1BQU0sS0FBSyxTQUFTLFVBQVUsTUFBTSxZQUFZLG1CQUFtQixVQUFVLENBQUMsRUFBRTtBQUN0RixXQUFPLEtBQUssUUFBUSxNQUFNLEtBQUssY0FBYyxFQUFFLEtBQW1CLEtBQUssTUFBUyxDQUFDO0FBQUEsRUFDbkY7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBVUEsTUFBTSxXQUFXLFNBQWdEO0FBQy9ELFVBQU0sTUFBTSxLQUFLLFNBQVMsVUFBVTtBQUNwQyxXQUFPLEtBQUssUUFBUSxNQUFNLEtBQUssY0FBYyxFQUFFLEtBQW1CLEtBQUssT0FBTyxDQUFDO0FBQUEsRUFDakY7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFVQSxNQUFNLGFBQTJDO0FBQy9DLFVBQU0sTUFBTSxLQUFLLFNBQVMsVUFBVTtBQUNwQyxXQUFPLEtBQUssUUFBUSxZQUFZO0FBQzlCLFlBQU0sV0FBVyxNQUFNLE1BQU0sS0FBSztBQUFBLFFBQ2hDLFNBQVMsS0FBSyxXQUFXO0FBQUEsUUFDekIsUUFBUSxLQUFLLGlCQUFpQjtBQUFBLE1BQ2hDLENBQUM7QUFDRCxVQUFJLFNBQVMsV0FBVyxLQUFLO0FBQzNCLGVBQU87QUFBQSxNQUNUO0FBQ0EsVUFBSSxDQUFDLFNBQVMsR0FBSSxPQUFNO0FBQ3hCLGFBQU8sU0FBUyxLQUFLO0FBQUEsSUFDdkIsQ0FBQztBQUFBLEVBQ0g7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFPQSxNQUFNLGVBQThCO0FBQ2xDLFVBQU0sTUFBTSxLQUFLLFNBQVMsVUFBVTtBQUNwQyxXQUFPLEtBQUssUUFBUSxNQUFNLEtBQUssY0FBYyxFQUFFLE9BQU8sR0FBRyxDQUFDO0FBQUEsRUFDNUQ7QUFDRjs7O0FDcGtDQSxZQUFZLFFBQVE7QUFDcEIsU0FBUyxlQUFlO0FBQ3hCLFlBQVksVUFBVTtBQVl0QixlQUFzQix5QkFBaUQ7QUFDckUsUUFBTSxPQUFPLFFBQVE7QUFDckIsUUFBTSxhQUF1QixDQUFDO0FBRTlCLFFBQU0sa0JBQWtCLFFBQVEsSUFBSSxtQkFBbUI7QUFDdkQsTUFBSSxnQkFBaUIsWUFBVyxLQUFLLGVBQWU7QUFFcEQsUUFBTSxjQUFjLFFBQVEsSUFBSSxlQUFlO0FBQy9DLE1BQUksWUFBYSxZQUFXLEtBQVUsVUFBSyxhQUFhLFFBQVEsQ0FBQztBQUVqRSxRQUFNLGdCQUFnQixRQUFRLElBQUksaUJBQWlCO0FBQ25ELE1BQUksY0FBZSxZQUFXLEtBQVUsVUFBSyxlQUFlLFFBQVEsQ0FBQztBQUVyRSxhQUFXLEtBQVUsVUFBSyxNQUFNLFdBQVcsUUFBUSxDQUFDO0FBQ3BELGFBQVcsS0FBVSxVQUFLLE1BQU0sU0FBUyxDQUFDO0FBRTFDLGFBQVcsYUFBYSxZQUFZO0FBQ2xDLFFBQUk7QUFDRixZQUFTLFVBQVksVUFBSyxXQUFXLFNBQVMsQ0FBQztBQUMvQyxhQUFPO0FBQUEsSUFDVCxTQUFTLE9BQWdCO0FBQ3ZCLFVBQUksaUJBQWlCLFNBQVMsVUFBVSxTQUFTLE1BQU0sU0FBUyxVQUFVO0FBQ3hFO0FBQUEsTUFDRjtBQUNBLFlBQU07QUFBQSxJQUNSO0FBQUEsRUFDRjtBQUNBLFNBQU87QUFDVDtBQTJDQSxlQUFzQiw4QkFBOEIsaUJBQXlCQyxTQUFnQztBQUMzRyxRQUFNLFlBQVksTUFBTSx1QkFBdUI7QUFDL0MsTUFBSSxDQUFDLFdBQVc7QUFDZCxJQUFBQSxRQUFPLE1BQU0sNkVBQTZFO0FBQzFGO0FBQUEsRUFDRjtBQUVBLFFBQU0sWUFBaUIsVUFBSyxXQUFXLFdBQVcseUJBQXlCO0FBQzNFLE1BQUk7QUFDSixNQUFJO0FBQ0YsVUFBTSxNQUFTLFlBQVMsV0FBVyxPQUFPO0FBQUEsRUFDNUMsU0FBUyxPQUFnQjtBQUN2QixRQUFJLGlCQUFpQixTQUFTLFVBQVUsU0FBUyxNQUFNLFNBQVMsVUFBVTtBQUN4RSxNQUFBQSxRQUFPLE1BQU0sNkNBQTZDO0FBQzFEO0FBQUEsSUFDRjtBQUNBLFVBQU07QUFBQSxFQUNSO0FBRUEsUUFBTSxPQUFPLEtBQUssTUFBTSxHQUFHO0FBSTNCLFFBQU0sUUFBUSxLQUFLLGtCQUFrQjtBQUNyQyxNQUFJLENBQUMsT0FBTyxVQUFVLE1BQU0sT0FBTyxXQUFXLFlBQWE7QUFFM0QsTUFBSSxNQUFNLE9BQU8sU0FBUyxtQkFBbUIsTUFBTSxvQkFBb0IsaUJBQWlCO0FBQ3RGLElBQUFBLFFBQU8sTUFBTSw2REFBNkQ7QUFDMUU7QUFBQSxFQUNGO0FBRUEsUUFBTSxPQUFPLE9BQU87QUFDcEIsUUFBTSxrQkFBa0I7QUFDeEIsUUFBTSxlQUFjLG9CQUFJLEtBQUssR0FBRSxZQUFZO0FBQzNDLFFBQVMsYUFBVSxXQUFXLEdBQUcsS0FBSyxVQUFVLE1BQU0sTUFBTSxDQUFDLENBQUM7QUFBQSxDQUFJO0FBQ2xFLEVBQUFBLFFBQU8sS0FBSyx3REFBd0QsRUFBRSxnQkFBZ0IsQ0FBQztBQUN6Rjs7O0FDdEhBLFNBQVMsZ0JBQWdCO0FBQ3pCLFlBQVlDLFNBQVE7QUFDcEIsWUFBWUMsV0FBVTtBQUN0QixTQUFTLGlCQUFpQjtBQUUxQixJQUFNLGdCQUFnQixVQUFVLFFBQVE7QUFZakMsU0FBUyxtQkFBbUIsTUFBb0I7QUFDckQsUUFBTSxrQkFBa0I7QUFDeEIsTUFBSSxDQUFDLGdCQUFnQixLQUFLLElBQUksR0FBRztBQUMvQixVQUFNLElBQUksTUFBTSxvQ0FBb0M7QUFBQSxFQUN0RDtBQUNGO0FBWU8sU0FBUyxjQUFjLEtBQWEsV0FBaUM7QUFDMUUsTUFBSSxVQUFVO0FBQ2QsU0FBTyxRQUFRLFNBQVMsR0FBRyxHQUFHO0FBQzVCLGNBQVUsUUFBUSxVQUFVLEdBQUcsUUFBUSxZQUFZLEdBQUcsQ0FBQztBQUN2RCxRQUFJLFVBQVUsSUFBSSxPQUFPLEdBQUc7QUFDMUIsYUFBTztBQUFBLElBQ1Q7QUFBQSxFQUNGO0FBQ0EsU0FBTztBQUNUO0FBV08sU0FBUyxrQkFBa0IsUUFBeUI7QUFDekQsU0FBTyxPQUFPLFdBQVcsS0FBSztBQUNoQztBQXlCQSxlQUFzQixlQUFlLEtBQWEsU0FBMkQ7QUFDM0csUUFBTSxFQUFFLFlBQVksU0FBUyxJQUFJLE1BQU0sYUFBYSxTQUFTLE9BQU8sUUFBUSxJQUFJLENBQUM7QUFLakYsTUFBSTtBQUNKLE1BQUk7QUFDRixjQUFVLE1BQU0sZUFBZSxVQUFVLEdBQUc7QUFBQSxFQUM5QyxRQUFRO0FBQ04sdUJBQW1CLEdBQUc7QUFDdEIsY0FBVTtBQUFBLEVBQ1o7QUFFQSxNQUFJLFlBQVksVUFBVTtBQUN4Qix1QkFBbUIsR0FBRztBQUFBLEVBQ3hCO0FBRUEsUUFBTSxjQUFtQixXQUFLLFVBQVUsY0FBYyxHQUFHO0FBRXpELFFBQU0saUJBQWlCLE1BQU0sb0JBQW9CLFVBQVUsV0FBVztBQUN0RSxNQUFJLGdCQUFnQjtBQUNsQixVQUFNLElBQUksTUFBTSxxQ0FBcUMsV0FBVyxFQUFFO0FBQUEsRUFDcEU7QUFFQSxRQUFNLHNCQUFzQixVQUFVLFdBQVc7QUFFakQsTUFBSSxZQUFZLFVBQVU7QUFDeEIsVUFBTSxhQUFhLE1BQU0sWUFBWSxVQUFVO0FBQy9DLFVBQU0sZUFBZSxNQUFNLGtCQUFrQixVQUFVLEdBQUc7QUFDMUQsVUFBTSxZQUFZLEVBQUUsVUFBVSxhQUFhLFlBQVksS0FBSyxjQUFjLFdBQVcsQ0FBQztBQUFBLEVBQ3hGLE9BQU87QUFDTCxVQUFNLG9CQUFvQixVQUFVLGFBQWEsR0FBRztBQUFBLEVBQ3REO0FBRUEsUUFBTSxVQUFVLE1BQU0scUJBQXFCLFVBQVU7QUFDckQsUUFBTSxxQkFBcUIsWUFBWSxXQUFXO0FBQ2xELFFBQU0sb0JBQW9CLEVBQUUsWUFBWSxhQUFhLFFBQVEsQ0FBQztBQUU5RCxRQUFNLGdCQUFnQixNQUFNLHNCQUFzQixFQUFFLFlBQVksYUFBYSxTQUFTLENBQUM7QUFFdkYsUUFBTSxDQUFDLEVBQUUsT0FBTyxJQUFJLE1BQU0sUUFBUSxJQUFJO0FBQUEsSUFDcEMsaUJBQWlCLEVBQUUsYUFBYSxVQUFVLGFBQWEsUUFBUSxhQUFhLE9BQU8sUUFBUSxNQUFNLENBQUM7QUFBQSxJQUNsRyxZQUFZLFdBQVc7QUFBQSxFQUN6QixDQUFDO0FBRUQsUUFBTSxTQUErQjtBQUFBLElBQ25DLFFBQVE7QUFBQSxJQUNSLFVBQVU7QUFBQSxJQUNWO0FBQUEsRUFDRjtBQUVBLE1BQUksZ0JBQWdCLEdBQUc7QUFDckIsV0FBTyxtQkFBbUI7QUFBQSxFQUM1QjtBQUVBLFNBQU87QUFDVDtBQVdBLGVBQWUsc0JBQXNCLFVBQWtCLGFBQW9DO0FBQ3pGLE1BQUk7QUFDRixVQUFTLFdBQU8sV0FBVztBQUMzQixVQUFTLE9BQUcsYUFBYSxFQUFFLFdBQVcsS0FBSyxDQUFDO0FBQzVDLFVBQU0sY0FBYyxPQUFPLENBQUMsWUFBWSxPQUFPLEdBQUcsRUFBRSxLQUFLLFVBQVUsU0FBUyxJQUFPLENBQUM7QUFBQSxFQUN0RixTQUFTLE9BQWdCO0FBQ3ZCLFFBQUssTUFBZ0MsU0FBUyxVQUFVO0FBQ3RELFlBQU07QUFBQSxJQUNSO0FBQUEsRUFDRjtBQUNGO0FBaUJBLGVBQXNCLGFBQWEsVUFBcUM7QUFDdEUsTUFBSSxhQUFrQixjQUFRLFFBQVE7QUFDdEMsU0FBTyxlQUFlLEtBQUs7QUFDekIsVUFBTSxVQUFlLFdBQUssWUFBWSxNQUFNO0FBQzVDLFFBQUk7QUFDRixZQUFNLFFBQVEsTUFBUyxVQUFNLE9BQU87QUFDcEMsVUFBSSxNQUFNLFlBQVksR0FBRztBQUN2QixlQUFPO0FBQUEsVUFDTCxZQUFZO0FBQUEsVUFDWixVQUFVO0FBQUEsUUFDWjtBQUFBLE1BQ0Y7QUFDQSxVQUFJLE1BQU0sT0FBTyxHQUFHO0FBQ2xCLGNBQU0saUJBQWlCLE1BQVMsYUFBUyxTQUFTLE9BQU87QUFDekQsY0FBTSxhQUFhLGVBQWUsS0FBSztBQUN2QyxjQUFNLGFBQWEsV0FBVyxRQUFRLGVBQWUsRUFBRTtBQUN2RCxjQUFNLGFBQWEsV0FBVyxRQUFRLHVCQUF1QixFQUFFO0FBQy9ELGNBQU0sV0FBVyxXQUFXLFFBQVEsWUFBWSxFQUFFO0FBQ2xELGVBQU87QUFBQSxVQUNMLFlBQVk7QUFBQSxVQUNaO0FBQUEsUUFDRjtBQUFBLE1BQ0Y7QUFBQSxJQUNGLFNBQVMsT0FBZ0I7QUFDdkIsVUFBSyxNQUFnQyxTQUFTLFVBQVU7QUFDdEQsY0FBTTtBQUFBLE1BQ1I7QUFBQSxJQUNGO0FBQ0EsaUJBQWtCLGNBQVEsVUFBVTtBQUFBLEVBQ3RDO0FBQ0EsUUFBTSxJQUFJLE1BQU0seUJBQXlCO0FBQzNDO0FBUUEsZUFBc0IsWUFBWSxLQUE4QjtBQUM5RCxRQUFNLEVBQUUsT0FBTyxJQUFJLE1BQU0sY0FBYyxPQUFPLENBQUMsYUFBYSxNQUFNLEdBQUcsRUFBRSxLQUFLLFNBQVMsSUFBTSxDQUFDO0FBQzVGLFNBQU8sT0FBTyxLQUFLO0FBQ3JCO0FBU0EsZUFBc0Isb0JBQW9CLFVBQWtCLGFBQXVDO0FBQ2pHLFFBQU0sRUFBRSxPQUFPLElBQUksTUFBTSxjQUFjLE9BQU8sQ0FBQyxZQUFZLE1BQU0sR0FBRyxFQUFFLEtBQUssVUFBVSxTQUFTLElBQU8sQ0FBQztBQUN0RyxTQUFPLE9BQU8sU0FBUyxXQUFXO0FBQ3BDO0FBU0EsZUFBc0Isa0JBQWtCLFVBQWtCLFlBQXNDO0FBQzlGLFFBQU0sRUFBRSxPQUFPLElBQUksTUFBTSxjQUFjLE9BQU8sQ0FBQyxVQUFVLFVBQVUsVUFBVSxHQUFHO0FBQUEsSUFDOUUsS0FBSztBQUFBLElBQ0wsU0FBUztBQUFBLEVBQ1gsQ0FBQztBQUNELFNBQU8sT0FBTyxLQUFLLEVBQUUsU0FBUztBQUNoQztBQWFBLGVBQXNCLGVBQWUsVUFBa0IsS0FBbUQ7QUFDeEcsUUFBTSxlQUFlLE1BQU0sa0JBQWtCLFVBQVUsR0FBRztBQUMxRCxNQUFJLGFBQWMsUUFBTztBQUV6QixRQUFNLEVBQUUsUUFBUSxVQUFVLElBQUksTUFBTSxjQUFjLE9BQU8sQ0FBQyxPQUFPLFVBQVUsR0FBRyxHQUFHO0FBQUEsSUFDL0UsS0FBSztBQUFBLElBQ0wsU0FBUztBQUFBLEVBQ1gsQ0FBQztBQUNELE1BQUksVUFBVSxLQUFLLEVBQUUsU0FBUyxFQUFHLFFBQU87QUFFeEMsTUFBSTtBQUNGLFVBQU0sY0FBYyxPQUFPLENBQUMsYUFBYSxZQUFZLEdBQUcsR0FBRyxXQUFXLEdBQUc7QUFBQSxNQUN2RSxLQUFLO0FBQUEsTUFDTCxTQUFTO0FBQUEsSUFDWCxDQUFDO0FBQ0QsV0FBTztBQUFBLEVBQ1QsUUFBUTtBQUNOLFVBQU0sSUFBSSxNQUFNLFdBQVcsR0FBRyxpREFBaUQ7QUFBQSxFQUNqRjtBQUNGO0FBbUJBLGVBQXNCLFlBQVksTUFBeUM7QUFDekUsUUFBTSxPQUFPLEtBQUssZUFDZCxDQUFDLFlBQVksT0FBTyxLQUFLLGFBQWEsS0FBSyxVQUFVLElBQ3JELENBQUMsWUFBWSxPQUFPLE1BQU0sS0FBSyxZQUFZLEtBQUssYUFBYSxLQUFLLFVBQVU7QUFDaEYsUUFBTSxjQUFjLE9BQU8sTUFBTSxFQUFFLEtBQUssS0FBSyxVQUFVLFNBQVMsSUFBTyxDQUFDO0FBQzFFO0FBV0EsZUFBc0Isb0JBQW9CLFVBQWtCLGFBQXFCLEtBQTRCO0FBQzNHLFFBQU0sY0FBYyxPQUFPLENBQUMsWUFBWSxPQUFPLFlBQVksYUFBYSxHQUFHLEdBQUc7QUFBQSxJQUM1RSxLQUFLO0FBQUEsSUFDTCxTQUFTO0FBQUEsRUFDWCxDQUFDO0FBQ0g7QUFnQkEsZUFBc0IscUJBQXFCLFlBQTJDO0FBQ3BGLFFBQU0sRUFBRSxPQUFPLElBQUksTUFBTTtBQUFBLElBQ3ZCO0FBQUEsSUFDQSxDQUFDLE1BQU0sWUFBWSxZQUFZLGFBQWEsc0JBQXNCLGVBQWUsVUFBVTtBQUFBLElBQzNGLEVBQUUsS0FBSyxZQUFZLFNBQVMsSUFBTztBQUFBLEVBQ3JDO0FBRUEsUUFBTSxRQUFRLE9BQU8sTUFBTSxJQUFJLEVBQUUsT0FBTyxDQUFDLFNBQVMsS0FBSyxTQUFTLEtBQUssQ0FBQyxLQUFLLFdBQVcsWUFBWSxDQUFDO0FBQ25HLFFBQU0sY0FBYyxNQUFNLE9BQU8sQ0FBQyxNQUFNLEVBQUUsU0FBUyxHQUFHLENBQUMsRUFBRSxJQUFJLENBQUMsTUFBTSxFQUFFLE1BQU0sR0FBRyxFQUFFLENBQUM7QUFDbEYsUUFBTSxRQUFRLE1BQU0sT0FBTyxDQUFDLE1BQU0sQ0FBQyxFQUFFLFNBQVMsR0FBRyxDQUFDO0FBRWxELFNBQU8sRUFBRSxhQUFhLE1BQU07QUFDOUI7QUFzQkEsZUFBc0Isb0JBQW9CLE1BQXNFO0FBQzlHLFFBQU0sRUFBRSxZQUFZLGFBQWEsUUFBUSxJQUFJO0FBQzdDLFFBQU0sU0FBUyxJQUFJLElBQUksUUFBUSxXQUFXO0FBQzFDLFFBQU0sZ0JBQWdCLFFBQVEsWUFBWSxPQUFPLENBQUMsUUFBUSxDQUFDLGNBQWMsS0FBSyxNQUFNLENBQUM7QUFFckYsUUFBTSxtQkFBbUIsT0FBTyxRQUFrQztBQUNoRSxRQUFJO0FBQ0YsWUFBTSxhQUFrQixXQUFLLFlBQVksR0FBRztBQUM1QyxVQUFJO0FBQ0YsY0FBUyxVQUFNLFVBQVU7QUFBQSxNQUMzQixTQUFTLE9BQWdCO0FBQ3ZCLFlBQUssTUFBZ0MsU0FBUyxVQUFVO0FBQ3RELGlCQUFPO0FBQUEsUUFDVDtBQUNBLGdCQUFRLE9BQU87QUFBQSxVQUNiLCtDQUErQyxpQkFBaUIsUUFBUSxNQUFNLFVBQVUsT0FBTyxLQUFLLENBQUM7QUFBQTtBQUFBLFFBQ3ZHO0FBQ0EsZUFBTztBQUFBLE1BQ1Q7QUFDQSxZQUFNLFdBQWdCLFdBQUssYUFBYSxHQUFHO0FBQzNDLFlBQU0sWUFBaUIsY0FBUSxHQUFHO0FBQ2xDLFVBQUksY0FBYyxLQUFLO0FBQ3JCLGNBQVMsVUFBVyxXQUFLLGFBQWEsU0FBUyxHQUFHLEVBQUUsV0FBVyxLQUFLLENBQUM7QUFBQSxNQUN2RTtBQUNBLFlBQVMsWUFBUSxZQUFZLFFBQVE7QUFDckMsYUFBTztBQUFBLElBQ1QsU0FBUyxPQUFnQjtBQUN2QixZQUFNLE9BQVEsTUFBZ0M7QUFDOUMsVUFBSSxTQUFTLFlBQVksU0FBUyxVQUFVO0FBQzFDLGVBQU87QUFBQSxNQUNUO0FBQ0EsY0FBUSxPQUFPO0FBQUEsUUFDYixpREFBaUQsaUJBQWlCLFFBQVEsTUFBTSxVQUFVLE9BQU8sS0FBSyxDQUFDO0FBQUE7QUFBQSxNQUN6RztBQUNBLGFBQU87QUFBQSxJQUNUO0FBQUEsRUFDRjtBQUVBLFFBQU0sb0JBQW9CLE9BQU8sU0FBbUM7QUFDbEUsUUFBSTtBQUNGLFlBQU0sYUFBa0IsV0FBSyxZQUFZLElBQUk7QUFDN0MsVUFBSTtBQUNGLGNBQVMsVUFBTSxVQUFVO0FBQUEsTUFDM0IsU0FBUyxPQUFnQjtBQUN2QixZQUFLLE1BQWdDLFNBQVMsVUFBVTtBQUN0RCxpQkFBTztBQUFBLFFBQ1Q7QUFDQSxnQkFBUSxPQUFPO0FBQUEsVUFDYiwrQ0FBK0MsaUJBQWlCLFFBQVEsTUFBTSxVQUFVLE9BQU8sS0FBSyxDQUFDO0FBQUE7QUFBQSxRQUN2RztBQUNBLGVBQU87QUFBQSxNQUNUO0FBQ0EsWUFBTSxXQUFnQixXQUFLLGFBQWEsSUFBSTtBQUM1QyxZQUFNLFlBQWlCLGNBQVEsSUFBSTtBQUNuQyxVQUFJLGNBQWMsS0FBSztBQUNyQixjQUFTLFVBQVcsV0FBSyxhQUFhLFNBQVMsR0FBRyxFQUFFLFdBQVcsS0FBSyxDQUFDO0FBQUEsTUFDdkU7QUFDQSxZQUFTLFlBQVEsWUFBWSxRQUFRO0FBQ3JDLGFBQU87QUFBQSxJQUNULFNBQVMsT0FBZ0I7QUFDdkIsWUFBTSxPQUFRLE1BQWdDO0FBQzlDLFVBQUksU0FBUyxZQUFZLFNBQVMsVUFBVTtBQUMxQyxlQUFPO0FBQUEsTUFDVDtBQUNBLGNBQVEsT0FBTztBQUFBLFFBQ2IsaURBQWlELGlCQUFpQixRQUFRLE1BQU0sVUFBVSxPQUFPLEtBQUssQ0FBQztBQUFBO0FBQUEsTUFDekc7QUFDQSxhQUFPO0FBQUEsSUFDVDtBQUFBLEVBQ0Y7QUFFQSxRQUFNLGFBQWEsTUFBTSxRQUFRLElBQUksY0FBYyxJQUFJLGdCQUFnQixDQUFDO0FBQ3hFLFFBQU0saUJBQWlCLFFBQVEsTUFBTSxPQUFPLENBQUMsU0FBUyxDQUFDLGNBQWMsTUFBTSxNQUFNLENBQUM7QUFDbEYsUUFBTSxjQUFjLE1BQU0sUUFBUSxJQUFJLGVBQWUsSUFBSSxpQkFBaUIsQ0FBQztBQUUzRSxRQUFNLFdBQVcsV0FBVyxPQUFPLENBQUMsTUFBTSxDQUFDLEVBQUU7QUFDN0MsUUFBTSxZQUFZLFlBQVksT0FBTyxDQUFDLE1BQU0sQ0FBQyxFQUFFO0FBRS9DLFNBQU8sRUFBRSxVQUFVLFVBQVU7QUFDL0I7QUFXQSxlQUFzQixxQkFBcUIsWUFBb0IsYUFBc0M7QUFDbkcsUUFBTSxVQUFVLE1BQVMsWUFBUSxZQUFZLEVBQUUsZUFBZSxLQUFLLENBQUM7QUFDcEUsUUFBTSxXQUFXLFFBQVEsT0FBTyxDQUFDLE1BQU0sRUFBRSxlQUFlLEtBQUssRUFBRSxTQUFTLFVBQVUsRUFBRSxTQUFTLFlBQVk7QUFFekcsUUFBTSxjQUFjLE9BQU8sU0FBbUM7QUFDNUQsVUFBTSxXQUFnQixXQUFLLGFBQWEsSUFBSTtBQUM1QyxRQUFJO0FBQ0YsWUFBUyxVQUFNLFFBQVE7QUFDdkIsYUFBTztBQUFBLElBQ1QsU0FBUyxPQUFnQjtBQUN2QixVQUFLLE1BQWdDLFNBQVMsVUFBVTtBQUN0RCxjQUFNO0FBQUEsTUFDUjtBQUFBLElBQ0Y7QUFDQSxVQUFNLGlCQUFzQixXQUFLLFlBQVksSUFBSTtBQUdqRCxVQUFNLFNBQVMsTUFBUyxhQUFTLGNBQWM7QUFDL0MsVUFBTSxpQkFBc0IsY0FBUSxZQUFZLE1BQU07QUFDdEQsUUFBSSxtQkFBbUIsZ0JBQWdCO0FBQ3JDLGFBQU87QUFBQSxJQUNUO0FBRUEsVUFBUyxZQUFRLGdCQUFnQixRQUFRO0FBQ3pDLFdBQU87QUFBQSxFQUNUO0FBRUEsUUFBTSxVQUFVLE1BQU0sUUFBUSxJQUFJLFNBQVMsSUFBSSxDQUFDLE1BQU0sWUFBWSxFQUFFLElBQUksQ0FBQyxDQUFDO0FBQzFFLFNBQU8sUUFBUSxPQUFPLENBQUMsTUFBTSxDQUFDLEVBQUU7QUFDbEM7QUFnQkEsZUFBc0IsbUJBQW1CLE1BQWtEO0FBQ3pGLFFBQU0sRUFBRSxtQkFBbUIsZ0JBQWdCLElBQUk7QUFFL0MsTUFBSTtBQUNGLFVBQVMsVUFBTSxpQkFBaUI7QUFBQSxFQUNsQyxTQUFTLE9BQWdCO0FBQ3ZCLFFBQUssTUFBZ0MsU0FBUyxVQUFVO0FBQ3RELGFBQU87QUFBQSxJQUNUO0FBQ0EsVUFBTTtBQUFBLEVBQ1I7QUFFQSxNQUFJO0FBQ0YsVUFBTSxZQUFZLE1BQVMsVUFBTSxlQUFlO0FBQ2hELFFBQUksVUFBVSxlQUFlLEdBQUc7QUFDOUIsWUFBUyxXQUFPLGVBQWU7QUFBQSxJQUNqQztBQUFBLEVBQ0YsU0FBUyxPQUFnQjtBQUN2QixRQUFLLE1BQWdDLFNBQVMsVUFBVTtBQUN0RCxZQUFNO0FBQUEsSUFDUjtBQUFBLEVBQ0Y7QUFFQSxRQUFTLFVBQU0saUJBQWlCLEVBQUUsV0FBVyxLQUFLLENBQUM7QUFFbkQsUUFBTSxVQUFVLE1BQVMsWUFBUSxtQkFBbUIsRUFBRSxlQUFlLEtBQUssQ0FBQztBQUMzRSxRQUFNLFNBQVMsTUFBTSxRQUFRO0FBQUEsSUFDM0IsUUFBUSxJQUFJLE9BQU8sVUFBMkI7QUFDNUMsWUFBTSxhQUFrQixXQUFLLG1CQUFtQixNQUFNLElBQUk7QUFDMUQsWUFBTSxXQUFnQixXQUFLLGlCQUFpQixNQUFNLElBQUk7QUFFdEQsVUFBSSxNQUFNLGVBQWUsR0FBRztBQUMxQixjQUFNLFNBQVMsTUFBUyxhQUFTLFVBQVU7QUFDM0MsWUFBSSxrQkFBa0IsTUFBTSxHQUFHO0FBQzdCLGdCQUFTLFlBQVEsUUFBUSxRQUFRO0FBQ2pDLGlCQUFPO0FBQUEsUUFDVCxPQUFPO0FBQ0wsZ0JBQVMsWUFBUSxZQUFZLFFBQVE7QUFDckMsaUJBQU87QUFBQSxRQUNUO0FBQUEsTUFDRixXQUFXLE1BQU0sWUFBWSxLQUFLLE1BQU0sS0FBSyxXQUFXLEdBQUcsR0FBRztBQUM1RCxjQUFTLFVBQU0sVUFBVSxFQUFFLFdBQVcsS0FBSyxDQUFDO0FBQzVDLGNBQU0sZUFBZSxNQUFTLFlBQVEsWUFBWSxFQUFFLGVBQWUsS0FBSyxDQUFDO0FBQ3pFLGNBQU0sY0FBYyxNQUFNLFFBQVE7QUFBQSxVQUNoQyxhQUFhLElBQUksT0FBTyxlQUFnQztBQUN0RCxrQkFBTSxrQkFBdUIsV0FBSyxZQUFZLFdBQVcsSUFBSTtBQUM3RCxrQkFBTSxnQkFBcUIsV0FBSyxVQUFVLFdBQVcsSUFBSTtBQUV6RCxnQkFBSSxXQUFXLGVBQWUsR0FBRztBQUMvQixvQkFBTSxTQUFTLE1BQVMsYUFBUyxlQUFlO0FBQ2hELGtCQUFJLGtCQUFrQixNQUFNLEdBQUc7QUFDN0Isc0JBQVMsWUFBUSxRQUFRLGFBQWE7QUFDdEMsdUJBQU87QUFBQSxjQUNULE9BQU87QUFDTCxzQkFBUyxZQUFRLGlCQUFpQixhQUFhO0FBQy9DLHVCQUFPO0FBQUEsY0FDVDtBQUFBLFlBQ0YsT0FBTztBQUNMLG9CQUFTLFlBQVEsaUJBQWlCLGFBQWE7QUFDL0MscUJBQU87QUFBQSxZQUNUO0FBQUEsVUFDRixDQUFDO0FBQUEsUUFDSDtBQUNBLGVBQU8sWUFBWSxPQUFPLENBQUMsS0FBSyxNQUFNLE1BQU0sR0FBRyxDQUFDO0FBQUEsTUFDbEQsT0FBTztBQUNMLGNBQVMsWUFBUSxZQUFZLFFBQVE7QUFDckMsZUFBTztBQUFBLE1BQ1Q7QUFBQSxJQUNGLENBQUM7QUFBQSxFQUNIO0FBRUEsU0FBTyxPQUFPLE9BQU8sQ0FBQyxLQUFLLE1BQU0sTUFBTSxHQUFHLENBQUM7QUFDN0M7QUFnQkEsZUFBc0Isc0JBQXNCLE1BQXFEO0FBQy9GLFFBQU0sRUFBRSxZQUFZLGFBQWEsU0FBUyxJQUFJO0FBRTlDLE1BQUk7QUFDSixNQUFJO0FBQ0YsVUFBTSxxQkFBcUIsTUFBUyxhQUFjLFdBQUssVUFBVSxjQUFjLEdBQUcsT0FBTztBQUN6RixrQkFBYyxLQUFLLE1BQU0sa0JBQWtCO0FBQUEsRUFDN0MsU0FBUyxPQUFnQjtBQUN2QixRQUFLLE1BQWdDLFNBQVMsVUFBVTtBQUN0RCxhQUFPO0FBQUEsSUFDVDtBQUNBLFVBQU07QUFBQSxFQUNSO0FBRUEsTUFBSSxDQUFDLFlBQVksWUFBWTtBQUMzQixXQUFPO0FBQUEsRUFDVDtBQUVBLE1BQUksYUFBYTtBQUVqQixnQkFBYyxNQUFNLG1CQUFtQjtBQUFBLElBQ3JDLG1CQUF3QixXQUFLLFlBQVksY0FBYztBQUFBLElBQ3ZELGlCQUFzQixXQUFLLGFBQWEsY0FBYztBQUFBLEVBQ3hELENBQUM7QUFFRCxRQUFNLGNBQW1CLFdBQUssWUFBWSxVQUFVO0FBQ3BELE1BQUk7QUFDRixVQUFNLGlCQUFpQixNQUFTLFlBQVEsYUFBYSxFQUFFLGVBQWUsS0FBSyxDQUFDO0FBQzVFLGVBQVcsU0FBUyxnQkFBZ0I7QUFDbEMsVUFBSSxNQUFNLFlBQVksR0FBRztBQUN2QixjQUFNLGlCQUFzQixXQUFLLGFBQWEsTUFBTSxNQUFNLGNBQWM7QUFDeEUsWUFBSSxvQkFBb0I7QUFDeEIsWUFBSTtBQUNGLGdCQUFTLFVBQU0sY0FBYztBQUM3Qiw4QkFBb0I7QUFBQSxRQUN0QixTQUFTLE9BQWdCO0FBQ3ZCLGNBQUssTUFBZ0MsU0FBUyxVQUFVO0FBQ3RELGtCQUFNO0FBQUEsVUFDUjtBQUFBLFFBQ0Y7QUFDQSxZQUFJLG1CQUFtQjtBQUNyQixnQkFBTSxpQkFBc0IsV0FBSyxhQUFhLFlBQVksTUFBTSxJQUFJO0FBQ3BFLGdCQUFTLFVBQU0sZ0JBQWdCLEVBQUUsV0FBVyxLQUFLLENBQUM7QUFDbEQsd0JBQWMsTUFBTSxtQkFBbUI7QUFBQSxZQUNyQyxtQkFBbUI7QUFBQSxZQUNuQixpQkFBc0IsV0FBSyxnQkFBZ0IsY0FBYztBQUFBLFVBQzNELENBQUM7QUFBQSxRQUNIO0FBQUEsTUFDRjtBQUFBLElBQ0Y7QUFBQSxFQUNGLFNBQVMsT0FBZ0I7QUFDdkIsUUFBSyxNQUFnQyxTQUFTLFVBQVU7QUFDdEQsWUFBTTtBQUFBLElBQ1I7QUFBQSxFQUNGO0FBRUEsU0FBTztBQUNUO0FBa0JBLGVBQXNCLGlCQUFpQixNQUE4QztBQUNuRixRQUFNLEVBQUUsYUFBYSxVQUFVLGFBQWEsTUFBTSxJQUFJO0FBRXRELFFBQU0sRUFBRSxRQUFRLE9BQU8sSUFBSSxNQUFNLGNBQWMsT0FBTyxDQUFDLE1BQU0sYUFBYSxhQUFhLFdBQVcsR0FBRztBQUFBLElBQ25HLFNBQVM7QUFBQSxFQUNYLENBQUM7QUFDRCxRQUFNLGNBQW1CLFdBQUssT0FBTyxLQUFLLEdBQUcsUUFBUSxTQUFTO0FBQzlELFFBQVMsVUFBVyxjQUFRLFdBQVcsR0FBRyxFQUFFLFdBQVcsS0FBSyxDQUFDO0FBRTdELFFBQU0sUUFBUSxDQUFDLHdDQUF3QztBQUV2RCxhQUFXLE9BQU8sYUFBYTtBQUM3QixRQUFJLENBQUMsSUFBSztBQUNWLFFBQUk7QUFDRixZQUFNLFFBQVEsTUFBUyxVQUFXLFdBQUssYUFBYSxHQUFHLENBQUM7QUFDeEQsVUFBSSxNQUFNLGVBQWUsRUFBRyxPQUFNLEtBQUssR0FBRztBQUFBLElBQzVDLFNBQVMsT0FBZ0I7QUFDdkIsVUFBSyxNQUFnQyxTQUFTLFVBQVU7QUFDdEQsY0FBTTtBQUFBLE1BQ1I7QUFBQSxJQUNGO0FBQUEsRUFDRjtBQUVBLGFBQVcsUUFBUSxPQUFPO0FBQ3hCLFFBQUksQ0FBQyxLQUFNO0FBQ1gsUUFBSTtBQUNGLFlBQU0sUUFBUSxNQUFTLFVBQVcsV0FBSyxhQUFhLElBQUksQ0FBQztBQUN6RCxVQUFJLE1BQU0sZUFBZSxFQUFHLE9BQU0sS0FBSyxJQUFJO0FBQUEsSUFDN0MsU0FBUyxPQUFnQjtBQUN2QixVQUFLLE1BQWdDLFNBQVMsVUFBVTtBQUN0RCxjQUFNO0FBQUEsTUFDUjtBQUFBLElBQ0Y7QUFBQSxFQUNGO0FBRUEsUUFBUyxlQUFXLGFBQWEsR0FBRyxNQUFNLEtBQUssSUFBSSxDQUFDO0FBQUEsQ0FBSTtBQUV4RCxNQUFJO0FBQ0YsVUFBTSxjQUFjLE9BQU8sQ0FBQyxNQUFNLFVBQVUsVUFBVSw2QkFBNkIsTUFBTSxHQUFHLEVBQUUsU0FBUyxJQUFNLENBQUM7QUFBQSxFQUNoSCxTQUFTLE9BQWdCO0FBQ3ZCLFlBQVEsT0FBTztBQUFBLE1BQ2IsNERBQTRELGlCQUFpQixRQUFRLE1BQU0sVUFBVSxPQUFPLEtBQUssQ0FBQztBQUFBO0FBQUEsSUFDcEg7QUFBQSxFQUNGO0FBRUEsTUFBSTtBQUNGLFVBQU0sY0FBYyxPQUFPLENBQUMsTUFBTSxhQUFhLFVBQVUsY0FBYyxxQkFBcUIsV0FBVyxHQUFHO0FBQUEsTUFDeEcsU0FBUztBQUFBLElBQ1gsQ0FBQztBQUFBLEVBQ0gsU0FBUyxPQUFnQjtBQUN2QixZQUFRLE9BQU87QUFBQSxNQUNiLHFEQUFxRCxpQkFBaUIsUUFBUSxNQUFNLFVBQVUsT0FBTyxLQUFLLENBQUM7QUFBQTtBQUFBLElBQzdHO0FBQUEsRUFDRjtBQUNGOzs7QUNqdEJBLFNBQTRCLGFBQWE7QUFDekMsWUFBWUMsV0FBVTtBQStCZixTQUFTLDBCQUEwQixRQUFtQztBQUMzRSxRQUFNLFdBQVcsSUFBSSxJQUFJLFlBQVksR0FBRyxFQUFFO0FBQzFDLFFBQU0sVUFBVSxRQUFRO0FBRXhCLE1BQUk7QUFDSixNQUFJO0FBQ0YsWUFBUSxNQUFNLFNBQVMsQ0FBQyxVQUFVLGtCQUFrQixHQUFHO0FBQUEsTUFDckQsVUFBVTtBQUFBLE1BQ1YsT0FBTyxDQUFDLFFBQVEsVUFBVSxRQUFRO0FBQUEsSUFDcEMsQ0FBQztBQUFBLEVBQ0gsU0FBUyxPQUFPO0FBRWQsWUFBUSxNQUFNLHFEQUFxRCxhQUFhLEtBQUssQ0FBQyxFQUFFO0FBQ3hGO0FBQUEsRUFDRjtBQUVBLFFBQU0sTUFBTyxHQUFHLFNBQVMsQ0FBQyxRQUFRO0FBRWhDLFlBQVEsTUFBTSw4Q0FBOEMsYUFBYSxHQUFHLENBQUMsRUFBRTtBQUFBLEVBQ2pGLENBQUM7QUFFRCxRQUFNLE1BQU8sTUFBTSxHQUFHLEtBQUssVUFBVSxNQUFNLENBQUM7QUFBQSxDQUFJO0FBQ2hELFFBQU0sTUFBTyxJQUFJO0FBRWpCLFFBQU0sTUFBTTtBQUNkO0FBTUEsSUFBSSxRQUFRLEtBQUssU0FBUyxrQkFBa0IsR0FBRztBQUM3QyxRQUFNLFNBQW1CLENBQUM7QUFFMUIsVUFBUSxNQUFNLEdBQUcsUUFBUSxDQUFDLFVBQWtCO0FBQzFDLFdBQU8sS0FBSyxLQUFLO0FBQUEsRUFDbkIsQ0FBQztBQUVELFVBQVEsTUFBTSxHQUFHLE9BQU8sTUFBTTtBQUM1QixVQUFNLFlBQVk7QUFDaEIsWUFBTSxNQUFNLE9BQU8sT0FBTyxNQUFNLEVBQUUsU0FBUyxNQUFNO0FBQ2pELFVBQUk7QUFDSixVQUFJO0FBQ0YsaUJBQVMsS0FBSyxNQUFNLEdBQUc7QUFBQSxNQUN6QixTQUFTLE9BQU87QUFDZCxnQkFBUSxNQUFNLG9EQUFvRCxhQUFhLEtBQUssQ0FBQyxFQUFFO0FBQ3ZGLGdCQUFRLEtBQUssQ0FBQztBQUFBLE1BQ2hCO0FBRUEsWUFBTSxFQUFFLFFBQVEsVUFBVSxZQUFZLGdCQUFnQixVQUFVLElBQUk7QUFFcEUsWUFBTSxRQUFxQjtBQUFBLFFBQ3pCO0FBQUEsUUFDQTtBQUFBLFFBQ0E7QUFBQSxRQUNBO0FBQUEsUUFDQSxZQUFZO0FBQUEsUUFDWixhQUFhO0FBQUEsUUFDYixlQUFlO0FBQUEsUUFDZixhQUFhO0FBQUEsUUFDYix5QkFBeUI7QUFBQSxRQUN6QixjQUFjO0FBQUEsUUFDZCxZQUFZO0FBQUEsUUFDWixlQUFlO0FBQUEsTUFDakI7QUFFQSxZQUFNLFNBQVMsSUFBSSxZQUFZO0FBQUEsUUFDN0IsU0FBUztBQUFBLFFBQ1QsYUFBYTtBQUFBLE1BQ2YsQ0FBQztBQUVELFlBQU1DLFVBQVMsSUFBSSxPQUFPO0FBQUEsUUFDeEIsYUFBa0IsV0FBSyxVQUFVLFVBQVUsUUFBUSx1Q0FBdUM7QUFBQSxNQUM1RixDQUFDO0FBRUQsVUFBSTtBQUNGLGNBQU0sc0JBQXNCLE9BQU8sUUFBUUEsU0FBUSxTQUFTO0FBQUEsTUFDOUQsU0FBUyxPQUFPO0FBQ2QsY0FBTSxVQUFVLGFBQWEsS0FBSztBQUNsQyxRQUFBQSxRQUFPLE1BQU0saUNBQWlDLEVBQUUsT0FBTyxTQUFTLFVBQVUsQ0FBQztBQUFBLE1BQzdFLFVBQUU7QUFDQSxRQUFBQSxRQUFPLE1BQU07QUFBQSxNQUNmO0FBQUEsSUFDRixHQUFHO0FBQUEsRUFDTCxDQUFDO0FBQ0g7OztBTHpHQSxJQUFNQyxpQkFBZ0JDLFdBQVVDLFNBQVE7QUFPakMsU0FBUyxhQUFhLE9BQXdCO0FBQ25ELFNBQU8saUJBQWlCLFFBQVEsTUFBTSxVQUFVLE9BQU8sS0FBSztBQUM5RDtBQVNPLFNBQVMseUJBQWlDO0FBQy9DLFFBQU0sZ0JBQWdCLFFBQVEsSUFBSSxlQUFlLGNBQWM7QUFDL0QsTUFBSSxDQUFDLGVBQWU7QUFDbEIsVUFBTSxJQUFJLE1BQU0sMENBQTBDLGVBQWUsY0FBYyxFQUFFO0FBQUEsRUFDM0Y7QUFDQSxTQUFZLFdBQUssZUFBZSxRQUFRLGFBQWE7QUFDdkQ7QUFjTyxTQUFTLG9CQUFvQixpQkFBaUM7QUFDbkUsU0FBTyxLQUFLLFVBQVU7QUFBQSxJQUNwQixnQkFBZ0IsRUFBRSw0QkFBNEIsS0FBSztBQUFBLElBQ25ELHdCQUF3QjtBQUFBLE1BQ3RCLG9CQUFvQjtBQUFBLFFBQ2xCLFFBQVEsRUFBRSxRQUFRLGFBQWEsTUFBTSxnQkFBZ0I7QUFBQSxNQUN2RDtBQUFBLElBQ0Y7QUFBQSxFQUNGLENBQUM7QUFDSDtBQWFPLFNBQVMsVUFDZCxRQUNBLFdBQ0EsUUFDQSxNQUNBLGNBQ0EsaUJBQ1U7QUFDVixRQUFNLE9BQWlCLENBQUM7QUFFeEIsTUFBSSxRQUFRO0FBQ1YsU0FBSyxLQUFLLFlBQVksU0FBUztBQUFBLEVBQ2pDLE9BQU87QUFDTCxTQUFLLEtBQUssTUFBTTtBQUNoQixTQUFLLEtBQUssZ0JBQWdCLFNBQVM7QUFBQSxFQUNyQztBQUNBLE9BQUssS0FBSyxjQUFjLG9CQUFvQixlQUFlLENBQUM7QUFDNUQsT0FBSyxLQUFLLGFBQWEsWUFBWTtBQUNuQyxNQUFJLFNBQVMsY0FBYztBQUN6QixTQUFLLEtBQUssU0FBUztBQUFBLEVBQ3JCO0FBRUEsU0FBTztBQUNUO0FBUUEsU0FBUyxpQkFBaUIsWUFBbUM7QUFDM0QsUUFBTSxRQUFRLFdBQVcsTUFBTSxvQkFBb0I7QUFDbkQsU0FBTyxRQUFRLENBQUMsS0FBSztBQUN2QjtBQWdCQSxlQUFzQixrQkFBa0IsZUFBdUIsUUFBdUM7QUFDcEcsUUFBTSxFQUFFLE9BQU8sSUFBSSxNQUFNRixlQUFjLE9BQU8sQ0FBQyxhQUFhLGdCQUFnQixNQUFNLEdBQUc7QUFBQSxJQUNuRixLQUFLO0FBQUEsRUFDUCxDQUFDO0FBQ0QsTUFBSSxTQUFTLE9BQU8sS0FBSztBQUV6QixRQUFNLFVBQVUsb0JBQUksSUFBWTtBQUNoQyxTQUFPLE9BQU8sV0FBVyxRQUFRLEdBQUc7QUFDbEMsUUFBSSxRQUFRLElBQUksTUFBTSxHQUFHO0FBQ3ZCLFlBQU0sSUFBSSxNQUFNLHlDQUF5QyxDQUFDLEdBQUcsU0FBUyxNQUFNLEVBQUUsS0FBSyxVQUFLLENBQUMsRUFBRTtBQUFBLElBQzdGO0FBQ0EsWUFBUSxJQUFJLE1BQU07QUFFbEIsVUFBTSxTQUFTLGlCQUFpQixNQUFNO0FBQ3RDLFFBQUksQ0FBQyxVQUFVLENBQUMsUUFBUTtBQUN0QixZQUFNLElBQUk7QUFBQSxRQUNSLHFDQUFxQyxNQUFNO0FBQUEsTUFFN0M7QUFBQSxJQUNGO0FBRUEsVUFBTSxFQUFFLFNBQVMsSUFBSSxNQUFNLE9BQU8sWUFBWSxRQUFRLEVBQUUsY0FBYyxDQUFDO0FBQ3ZFLFVBQU0sU0FBUyxTQUFTLEtBQUssQ0FBQyxNQUFNLEVBQUUsU0FBUyxNQUFNO0FBQ3JELFFBQUksQ0FBQyxRQUFRLGNBQWM7QUFDekIsWUFBTSxJQUFJO0FBQUEsUUFDUixnQkFBZ0IsTUFBTTtBQUFBLE1BRXhCO0FBQUEsSUFDRjtBQUVBLGFBQVMsT0FBTztBQUFBLEVBQ2xCO0FBRUEsU0FBTztBQUNUO0FBUUEsZUFBZSxxQkFBcUIsY0FBd0M7QUFDMUUsTUFBSTtBQUNGLFVBQVMsV0FBTyxZQUFZO0FBQzVCLFdBQU87QUFBQSxFQUNULFFBQVE7QUFDTixXQUFPO0FBQUEsRUFDVDtBQUNGO0FBZUEsZUFBc0Isd0JBQ3BCLE9BQ0EsUUFDQSxZQUNBRyxTQUNBLFdBQzZFO0FBQzdFLFFBQU0sRUFBRSxTQUFTLElBQUksTUFBTSxPQUFPLFlBQVksTUFBTSxRQUFRLEVBQUUsZUFBZSxNQUFNLFNBQVMsQ0FBQztBQUc3RixhQUFXLFVBQVUsVUFBVTtBQUM3QixRQUFJLENBQUMsT0FBTyxVQUFVLENBQUMsT0FBTyxTQUFVO0FBQ3hDLFFBQUksQ0FBRSxNQUFNLHFCQUFxQixPQUFPLFFBQVEsRUFBSTtBQUVwRCxJQUFBQSxRQUFPLEtBQUssNkJBQTZCLEVBQUUsUUFBUSxPQUFPLE1BQU0sVUFBVSxPQUFPLFNBQVMsQ0FBQztBQUMzRixXQUFPLEVBQUUsY0FBYyxPQUFPLFVBQVUsWUFBWSxPQUFPLE1BQU0sY0FBYyxPQUFPLGFBQWE7QUFBQSxFQUNyRztBQUlBLGFBQVcsVUFBVSxVQUFVO0FBQzdCLFFBQUksQ0FBQyxPQUFPLE9BQVE7QUFDcEIsUUFBSSxDQUFDLE9BQU8sS0FBSyxXQUFXLFNBQVMsTUFBTSxNQUFNLEdBQUcsRUFBRztBQUV2RCxJQUFBQSxRQUFPLEtBQUssNENBQTRDLEVBQUUsUUFBUSxPQUFPLEtBQUssQ0FBQztBQUMvRSxVQUFNQyxVQUFTLE1BQU0sZUFBZSxPQUFPLE1BQU0sRUFBRSxLQUFLLE1BQU0sU0FBUyxDQUFDO0FBR3hFLFVBQU0sT0FBTztBQUFBLE1BQ1gsTUFBTTtBQUFBLE1BQ04sRUFBRSxNQUFNLE9BQU8sTUFBTSxVQUFVQSxRQUFPLFVBQVUsY0FBYyxPQUFPLGFBQWE7QUFBQSxNQUNsRixFQUFFLFVBQVU7QUFBQSxJQUNkO0FBRUEsV0FBTyxFQUFFLGNBQWNBLFFBQU8sVUFBVSxZQUFZLE9BQU8sTUFBTSxjQUFjLE9BQU8sYUFBYTtBQUFBLEVBQ3JHO0FBT0EsUUFBTSxTQUFTLFNBQVMsTUFBTSxNQUFNO0FBQ3BDLFFBQU0sa0JBQWtCLFNBQ3JCLE9BQU8sQ0FBQyxNQUFNLEVBQUUsS0FBSyxXQUFXLE1BQU0sQ0FBQyxFQUN2QyxJQUFJLENBQUMsTUFBTSxTQUFTLEVBQUUsS0FBSyxNQUFNLE9BQU8sTUFBTSxHQUFHLEVBQUUsQ0FBQyxFQUNwRCxPQUFPLENBQUMsTUFBTSxDQUFDLE9BQU8sTUFBTSxDQUFDLENBQUM7QUFDakMsTUFBSSxhQUFhLGdCQUFnQixTQUFTLElBQUksS0FBSyxJQUFJLEdBQUcsZUFBZSxJQUFJLElBQUk7QUFFakYsUUFBTSxFQUFFLFNBQVMsSUFBSSxNQUFNLGFBQWEsTUFBTSxRQUFRO0FBQ3RELFNBQU8sTUFBTSxvQkFBb0IsVUFBZSxXQUFLLFVBQVUsY0FBYyxHQUFHLE1BQU0sR0FBRyxVQUFVLEVBQUUsQ0FBQyxHQUFHO0FBQ3ZHLElBQUFELFFBQU8sS0FBSywyREFBMkQ7QUFBQSxNQUNyRSxRQUFRLEdBQUcsTUFBTSxHQUFHLFVBQVU7QUFBQSxJQUNoQyxDQUFDO0FBQ0Q7QUFBQSxFQUNGO0FBRUEsUUFBTSxhQUFhLEdBQUcsTUFBTSxHQUFHLFVBQVU7QUFDekMsUUFBTSxTQUFTLE1BQU0sZUFBZSxZQUFZLEVBQUUsS0FBSyxNQUFNLFNBQVMsQ0FBQztBQUN2RSxRQUFNLE9BQU87QUFBQSxJQUNYLE1BQU07QUFBQSxJQUNOLEVBQUUsTUFBTSxZQUFZLFVBQVUsT0FBTyxVQUFVLGNBQWMsV0FBVztBQUFBLElBQ3hFLEVBQUUsVUFBVTtBQUFBLEVBQ2Q7QUFFQSxFQUFBQSxRQUFPLEtBQUssd0JBQXdCLEVBQUUsUUFBUSxZQUFZLFVBQVUsT0FBTyxTQUFTLENBQUM7QUFDckYsU0FBTyxFQUFFLGNBQWMsT0FBTyxVQUFVLFlBQVksY0FBYyxXQUFXO0FBQy9FO0FBYUEsZUFBZSxlQUNiLE1BQ0EsT0FDQSxZQUNBQSxTQUNlO0FBQ2YsTUFBSTtBQUNGLFVBQU0sS0FBSztBQUFBLEVBQ2IsU0FBUyxPQUFPO0FBQ2QsSUFBQUEsUUFBTyxLQUFLLE9BQU8sRUFBRSxRQUFRLFlBQVksT0FBTyxhQUFhLEtBQUssRUFBRSxDQUFDO0FBQUEsRUFDdkU7QUFDRjtBQXFCQSxlQUFzQixzQkFDcEIsT0FDQSxRQUNBQSxTQUNBLFdBQ2U7QUFDZixNQUFJLEtBQUssWUFBWSxJQUFJO0FBQ3pCLFFBQU0sRUFBRSxTQUFTLElBQUksTUFBTSxPQUFPLFlBQVksTUFBTSxRQUFRLEVBQUUsZUFBZSxNQUFNLFNBQVMsQ0FBQztBQUM3RixFQUFBQSxRQUFPLE1BQU0seUJBQXlCO0FBQUEsSUFDcEMsUUFBUSxNQUFNO0FBQUEsSUFDZCxhQUFhLFNBQVM7QUFBQSxJQUN0QixXQUFXLEtBQUssTUFBTSxZQUFZLElBQUksSUFBSSxFQUFFO0FBQUEsRUFDOUMsQ0FBQztBQUVELGFBQVcsVUFBVSxVQUFVO0FBQzdCLFFBQUksQ0FBQyxPQUFPLE9BQVE7QUFJcEIsUUFBSSxPQUFPLGlCQUFpQixPQUFPLE1BQU07QUFDdkMsWUFBTSxJQUFJO0FBQUEsUUFDUixXQUFXLE9BQU8sSUFBSTtBQUFBLE1BRXhCO0FBQUEsSUFDRjtBQUVBLFNBQUssWUFBWSxJQUFJO0FBQ3JCLFFBQUk7QUFHRixZQUFNSCxlQUFjLE9BQU8sQ0FBQyxjQUFjLGlCQUFpQixPQUFPLE1BQU0sT0FBTyxZQUFZLEdBQUc7QUFBQSxRQUM1RixLQUFLLE1BQU07QUFBQSxNQUNiLENBQUM7QUFBQSxJQUNILFFBQVE7QUFFTixNQUFBRyxRQUFPLE1BQU0sdUNBQXVDO0FBQUEsUUFDbEQsUUFBUSxPQUFPO0FBQUEsUUFDZixXQUFXLEtBQUssTUFBTSxZQUFZLElBQUksSUFBSSxFQUFFO0FBQUEsTUFDOUMsQ0FBQztBQUNEO0FBQUEsSUFDRjtBQUNBLElBQUFBLFFBQU8sTUFBTSx1Q0FBdUM7QUFBQSxNQUNsRCxRQUFRLE9BQU87QUFBQSxNQUNmLFdBQVcsS0FBSyxNQUFNLFlBQVksSUFBSSxJQUFJLEVBQUU7QUFBQSxJQUM5QyxDQUFDO0FBR0QsUUFBSSxPQUFPLFVBQVU7QUFDbkIsV0FBSyxZQUFZLElBQUk7QUFDckIsWUFBTTtBQUFBLFFBQ0osTUFBTUgsZUFBYyxPQUFPLENBQUMsWUFBWSxVQUFVLE9BQU8sUUFBUyxHQUFHLEVBQUUsS0FBSyxNQUFNLFNBQVMsQ0FBQztBQUFBLFFBQzVGO0FBQUEsUUFDQSxPQUFPO0FBQUEsUUFDUEc7QUFBQSxNQUNGO0FBQ0EsTUFBQUEsUUFBTyxNQUFNLDhCQUE4QjtBQUFBLFFBQ3pDLFFBQVEsT0FBTztBQUFBLFFBQ2YsV0FBVyxLQUFLLE1BQU0sWUFBWSxJQUFJLElBQUksRUFBRTtBQUFBLE1BQzlDLENBQUM7QUFBQSxJQUNIO0FBRUEsU0FBSyxZQUFZLElBQUk7QUFDckIsUUFBSSxnQkFBZ0I7QUFDcEIsUUFBSTtBQUNGLFlBQU1ILGVBQWMsT0FBTyxDQUFDLFVBQVUsTUFBTSxPQUFPLElBQUksR0FBRyxFQUFFLEtBQUssTUFBTSxTQUFTLENBQUM7QUFDakYsc0JBQWdCO0FBQUEsSUFDbEIsU0FBUyxPQUFPO0FBQ2QsTUFBQUcsUUFBTyxLQUFLLDJCQUEyQixFQUFFLFFBQVEsT0FBTyxNQUFNLE9BQU8sYUFBYSxLQUFLLEVBQUUsQ0FBQztBQUFBLElBQzVGO0FBQ0EsSUFBQUEsUUFBTyxNQUFNLDZCQUE2QjtBQUFBLE1BQ3hDLFFBQVEsT0FBTztBQUFBLE1BQ2Y7QUFBQSxNQUNBLFdBQVcsS0FBSyxNQUFNLFlBQVksSUFBSSxJQUFJLEVBQUU7QUFBQSxJQUM5QyxDQUFDO0FBRUQsUUFBSSxlQUFlO0FBQ2pCLFdBQUssWUFBWSxJQUFJO0FBQ3JCLFlBQU07QUFBQSxRQUNKLE1BQU0sT0FBTyxhQUFhLE1BQU0sUUFBUSxPQUFPLE1BQU0sRUFBRSxVQUFVLENBQUM7QUFBQSxRQUNsRTtBQUFBLFFBQ0EsT0FBTztBQUFBLFFBQ1BBO0FBQUEsTUFDRjtBQUNBLE1BQUFBLFFBQU8sTUFBTSxnQ0FBZ0M7QUFBQSxRQUMzQyxRQUFRLE9BQU87QUFBQSxRQUNmLFdBQVcsS0FBSyxNQUFNLFlBQVksSUFBSSxJQUFJLEVBQUU7QUFBQSxNQUM5QyxDQUFDO0FBRUQsTUFBQUEsUUFBTyxLQUFLLDRCQUE0QixFQUFFLFFBQVEsT0FBTyxLQUFLLENBQUM7QUFBQSxJQUNqRSxPQUFPO0FBQ0wsTUFBQUEsUUFBTyxLQUFLLDZEQUF3RCxFQUFFLFFBQVEsT0FBTyxLQUFLLENBQUM7QUFBQSxJQUM3RjtBQUFBLEVBQ0Y7QUFDRjtBQW9EQSxlQUFzQixtQkFDcEIsT0FDQSxTQUNBLFNBQ2U7QUFDZixRQUFNLEVBQUUsUUFBUSxXQUFXLFFBQVEsNEJBQTRCLElBQUk7QUFFbkUsVUFBUSxPQUFPLEtBQUssR0FBRyxNQUFNLFVBQVUsbUJBQW1CO0FBQUEsSUFDeEQsUUFBUSxNQUFNO0FBQUEsSUFDZCxhQUFhLE1BQU07QUFBQSxJQUNuQixlQUFlLE1BQU07QUFBQSxJQUNyQjtBQUFBLEVBQ0YsQ0FBQztBQUVELFFBQU0sU0FBUyxJQUFJLFlBQVk7QUFBQSxJQUM3QixTQUFTLE1BQU07QUFBQSxJQUNmLGFBQWEsTUFBTTtBQUFBLEVBQ3JCLENBQUM7QUFFRCxRQUFNLGFBQWEsTUFBTSxrQkFBa0IsTUFBTSxVQUFVLE1BQU07QUFFakUsUUFBTSxpQkFBaUIsTUFBTSx3QkFBd0IsT0FBTyxRQUFRLFlBQVksUUFBUSxRQUFRLFNBQVM7QUFFekcsUUFBTSxFQUFFLGNBQWMsS0FBSyxZQUFZLGFBQWEsSUFBSTtBQUN4RCxVQUFRLE9BQU8sS0FBSyxrQkFBa0IsRUFBRSxLQUFLLFFBQVEsWUFBWSxZQUFZLGFBQWEsQ0FBQztBQUUzRixRQUFNLGtCQUFrQix1QkFBdUI7QUFDL0MsUUFBTSw4QkFBOEIsaUJBQWlCLFFBQVEsTUFBTTtBQUVuRSxRQUFNLE9BQU8sVUFBVSxRQUFRLFdBQVcsUUFBUSxNQUFNLGVBQWUsTUFBTSxjQUFjLGVBQWU7QUFDMUcsUUFBTSxnQkFBZ0IsTUFBTSxrQkFBa0I7QUFFOUMsUUFBTSxRQUFzQkUsT0FBTSxVQUFVLE1BQU07QUFBQSxJQUNoRDtBQUFBLElBQ0EsT0FBTyxnQkFBZ0IsWUFBWSxDQUFDLFVBQVUsVUFBVSxNQUFNO0FBQUEsSUFDOUQsS0FBSztBQUFBLE1BQ0gsR0FBRyxRQUFRO0FBQUEsTUFDWCxnQkFBZ0I7QUFBQSxNQUNoQiwwQkFBMEIsbUJBQW1CLE1BQU0sTUFBTTtBQUFBLE1BQ3pELHNDQUFzQztBQUFBLE1BQ3RDLGFBQWE7QUFBQSxNQUNiLGVBQWU7QUFBQSxNQUNmLGtCQUFrQjtBQUFBLElBQ3BCO0FBQUEsRUFDRixDQUFDO0FBRUQsVUFBUSxTQUFTLE1BQU07QUFDckIsWUFBUSxPQUFPLEtBQUssR0FBRyxNQUFNLFVBQVUseUNBQXlDLEVBQUUsVUFBVSxDQUFDO0FBQzdGLFVBQU0sS0FBSyxTQUFTO0FBQUEsRUFDdEIsQ0FBQztBQUVELE1BQUksNkJBQTZCO0FBQy9CLFlBQVEsc0JBQXNCLE1BQU07QUFDbEMsY0FBUSxPQUFPLEtBQUssaUNBQWlDLEVBQUUsVUFBVSxDQUFDO0FBQ2xFLFlBQU0sS0FBSyxTQUFTO0FBQ3BCLGFBQU8sRUFBRSxVQUFVO0FBQUEsSUFDckIsQ0FBQztBQUFBLEVBQ0g7QUFHQSxNQUFJLENBQUMsZUFBZTtBQUNsQixVQUFNLFFBQVEsR0FBRyxRQUFRLENBQUMsVUFBa0I7QUFDMUMsWUFBTSxPQUFPLE1BQU0sU0FBUyxFQUFFLEtBQUs7QUFDbkMsVUFBSSxNQUFNO0FBQ1IsZ0JBQVEsT0FBTyxLQUFLLElBQUk7QUFBQSxNQUMxQjtBQUFBLElBQ0YsQ0FBQztBQUFBLEVBQ0g7QUFFQSxRQUFNLFdBQVcsTUFBTSxJQUFJLFFBQXVCLENBQUNDLGFBQVk7QUFDN0QsVUFBTSxHQUFHLFNBQVNBLFFBQU87QUFBQSxFQUMzQixDQUFDO0FBRUQsVUFBUSxPQUFPLEtBQUssR0FBRyxNQUFNLFVBQVUscUJBQXFCLEVBQUUsV0FBVyxTQUFTLENBQUM7QUFNbkYsTUFBSSxlQUFlO0FBQ2pCLFFBQUk7QUFDRixnQ0FBMEI7QUFBQSxRQUN4QixRQUFRLE1BQU07QUFBQSxRQUNkLFVBQVUsTUFBTTtBQUFBLFFBQ2hCLFlBQVksTUFBTTtBQUFBLFFBQ2xCLGdCQUFnQixNQUFNO0FBQUEsUUFDdEI7QUFBQSxNQUNGLENBQUM7QUFBQSxJQUNILFNBQVMsT0FBTztBQUNkLFlBQU0sVUFBVSxpQkFBaUIsUUFBUSxNQUFNLFVBQVUsT0FBTyxLQUFLO0FBQ3JFLGNBQVEsT0FBTyxLQUFLLHNEQUFzRCxFQUFFLE9BQU8sU0FBUyxVQUFVLENBQUM7QUFBQSxJQUN6RztBQUFBLEVBQ0YsT0FBTztBQUNMLFVBQU0sZUFBZSxZQUFZLElBQUk7QUFDckMsUUFBSTtBQUNGLFlBQU0sc0JBQXNCLE9BQU8sUUFBUSxRQUFRLFFBQVEsU0FBUztBQUFBLElBQ3RFLFNBQVMsT0FBTztBQUNkLFlBQU0sVUFBVSxpQkFBaUIsUUFBUSxNQUFNLFVBQVUsT0FBTyxLQUFLO0FBQ3JFLFVBQUksUUFBUSxTQUFTLCtCQUErQixLQUFLLFFBQVEsU0FBUyxpQkFBaUIsR0FBRztBQUM1RixjQUFNO0FBQUEsTUFDUjtBQUNBLGNBQVEsT0FBTyxLQUFLLHdDQUF3QyxFQUFFLE9BQU8sU0FBUyxVQUFVLENBQUM7QUFBQSxJQUMzRjtBQUNBLFlBQVEsT0FBTyxNQUFNLDhCQUE4QjtBQUFBLE1BQ2pEO0FBQUEsTUFDQSxXQUFXLEtBQUssTUFBTSxZQUFZLElBQUksSUFBSSxZQUFZO0FBQUEsSUFDeEQsQ0FBQztBQUFBLEVBQ0g7QUFDRjs7O0FQeGhCQSxJQUFPLGVBQVE7QUFBQSxFQUNiO0FBQUEsSUFDRSxZQUFZO0FBQUEsSUFDWixhQUFhO0FBQUEsSUFDYix3QkFBd0I7QUFBQSxJQUN4QixTQUFTO0FBQUEsRUFDWDtBQUFBLEVBQ0EsT0FBTyxPQUFvQixZQUEyQjtBQUNwRCxVQUFNLG1CQUFtQixPQUFPLFNBQVM7QUFBQSxNQUN2QyxRQUFRO0FBQUEsTUFDUixXQUFXLFdBQVc7QUFBQSxNQUN0QixRQUFRO0FBQUEsTUFDUiw2QkFBNkI7QUFBQSxJQUMvQixDQUFDO0FBQUEsRUFDSDtBQUNGOzs7QWF0Q0EsSUFBSSxDQUFDLFFBQVEsS0FBSyxTQUFTLGtCQUFrQixHQUFHO0FBQzlDLGlCQUFlLFlBQU87QUFDeEI7IiwKICAibmFtZXMiOiBbInJlc29sdmUiLCAiZXhlY0ZpbGUiLCAic3Bhd24iLCAiZnMiLCAicGF0aCIsICJwcm9taXNpZnkiLCAicGF0aCIsICJyZXNvbHZlIiwgImxvZ2dlciIsICJmcyIsICJwYXRoIiwgInBhdGgiLCAibG9nZ2VyIiwgImV4ZWNGaWxlQXN5bmMiLCAicHJvbWlzaWZ5IiwgImV4ZWNGaWxlIiwgImxvZ2dlciIsICJyZXN1bHQiLCAic3Bhd24iLCAicmVzb2x2ZSJdCn0K
