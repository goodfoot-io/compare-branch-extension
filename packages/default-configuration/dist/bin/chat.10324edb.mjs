import { createRequire as __createRequire } from 'node:module';
const require = __createRequire(import.meta.url);

import { resolve as __resolve } from 'node:path';
const __DEFAULT_LOG_DEST = ".cards/logs/cards-default-configuration-hooks.log";
const __workspace = process.env['WORKSPACE_PATH'];
if (__workspace && !process.env['CARDS_HOOKS_LOG_FILE']) {
  process.env['CARDS_HOOKS_LOG_FILE'] = __resolve(__workspace, __DEFAULT_LOG_DEST);
}

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
import { execFile as execFile2, spawn } from "node:child_process";
import * as fs2 from "node:fs/promises";
import { homedir } from "node:os";
import * as path2 from "node:path";
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
  buildUrl(path3, params) {
    const url = new URL(path3, this.options.baseUrl);
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
   * @returns Promise resolving when removal is complete.
   * @throws ApiError when the server rejects the update.
   * @throws NetworkError when the request fails to reach the server.
   */
  async removeCommit(cardId, sha) {
    const url = this.buildUrl(`/cards/${cardId}/commits/${sha}`);
    return this.request(() => this.getHttpClient().delete(url));
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
   * @returns Promise resolving when the branch is added.
   */
  async addBranch(cardId, data) {
    const url = this.buildUrl(`/cards/${cardId}/branches`);
    await this.request(() => this.getHttpClient().post(url, data));
  }
  /**
   * Removes a branch from a card.
   *
   * @param cardId - Unique identifier of the card to remove the branch from.
   * @param name - Branch name to remove (will be URL-encoded).
   * @returns Promise resolving when the branch is removed.
   */
  async removeBranch(cardId, name) {
    const url = this.buildUrl(`/cards/${cardId}/branches/${encodeURIComponent(name)}`);
    return this.request(() => this.getHttpClient().delete(url));
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

// src/lib/create-worktree.ts
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
async function createWorktree(branchName, options) {
  validateBranchName(branchName);
  const { sourceRoot, repoRoot } = await findGitRoots(options?.cwd ?? process.cwd());
  const startPoint = await resolveHead(sourceRoot);
  const worktreeDir = path.join(repoRoot, ".worktrees", branchName);
  const [worktreeExists, branchExists] = await Promise.all([
    checkWorktreeExists(repoRoot, worktreeDir),
    checkBranchExists(repoRoot, branchName)
  ]);
  if (worktreeExists) {
    throw new Error(`Error: Worktree already exists at ${worktreeDir}`);
  }
  try {
    await fs.access(worktreeDir);
    await fs.rm(worktreeDir, { recursive: true });
    await execFileAsync("git", ["worktree", "prune"], { cwd: repoRoot, timeout: 3e4 });
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
  }
  await addWorktree({ repoRoot, worktreeDir, branchName, branchExists, startPoint });
  const ignored = await discoverIgnoredPaths(sourceRoot);
  await copyExistingSymlinks(sourceRoot, worktreeDir);
  await symlinkIgnoredPaths({ sourceRoot, worktreeDir, ignored });
  const reroutedCount = await rerouteAllNodeModules({ sourceRoot, worktreeDir, repoRoot });
  const [, baseSha] = await Promise.all([
    updateGitExclude({ worktreeDir, repoRoot, directories: ignored.directories, files: ignored.files }),
    resolveHead(worktreeDir)
  ]);
  const result = {
    branch: branchName,
    worktree: worktreeDir,
    baseSha
  };
  if (reroutedCount > 0) {
    result.reroutedSymlinks = reroutedCount;
  }
  return result;
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
async function addWorktree(opts) {
  const args = opts.branchExists ? ["worktree", "add", opts.worktreeDir, opts.branchName] : ["worktree", "add", "-b", opts.branchName, opts.worktreeDir, opts.startPoint];
  await execFileAsync("git", args, { cwd: opts.repoRoot, timeout: 3e4 });
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
async function resolveClaudeConfigDir() {
  const home = homedir();
  const candidates = [];
  const claudeConfigDir = process.env["CLAUDE_CONFIG_DIR"];
  if (claudeConfigDir) candidates.push(claudeConfigDir);
  const xdgDataHome = process.env["XDG_DATA_HOME"];
  if (xdgDataHome) candidates.push(path2.join(xdgDataHome, "claude"));
  const xdgConfigHome = process.env["XDG_CONFIG_HOME"];
  if (xdgConfigHome) candidates.push(path2.join(xdgConfigHome, "claude"));
  candidates.push(path2.join(home, ".config", "claude"));
  candidates.push(path2.join(home, ".claude"));
  for (const candidate of candidates) {
    try {
      await fs2.access(path2.join(candidate, "plugins"));
      return candidate;
    } catch {
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
  const knownPath = path2.join(configDir, "plugins", "known_marketplaces.json");
  let raw;
  try {
    raw = await fs2.readFile(knownPath, "utf-8");
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
  await fs2.writeFile(knownPath, `${JSON.stringify(data, null, 4)}
`);
  logger2.info("Updated marketplace registration to extension bundle", { marketplacePath });
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
async function resolveBaseBranch(workspacePath) {
  const { stdout } = await execFileAsync2("git", ["rev-parse", "--abbrev-ref", "HEAD"], {
    cwd: workspacePath
  });
  return stdout.trim();
}
async function worktreeExistsOnDisk(worktreePath) {
  try {
    await fs2.access(worktreePath);
    return true;
  } catch {
    return false;
  }
}
async function resolveOrCreateWorktree(input, client, baseBranch, logger2) {
  const { branches } = await client.getBranches(input.cardId, { workspacePath: input.repoRoot });
  for (const branch of branches) {
    if (!branch.exists || !branch.worktree) continue;
    if (!await worktreeExistsOnDisk(branch.worktree)) continue;
    logger2.info("Reusing existing worktree", { branch: branch.name, worktree: branch.worktree });
    return { worktreePath: branch.worktree, branchName: branch.name, parentBranch: branch.parentBranch };
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
  await client.addBranch(input.cardId, { name: branchName, worktree: result.worktree, parentBranch: baseBranch });
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
async function cleanupMergedBranches(input, client, baseBranch, logger2) {
  const { branches } = await client.getBranches(input.cardId, { workspacePath: input.repoRoot });
  for (const branch of branches) {
    if (!branch.exists) continue;
    try {
      await execFileAsync2("git", ["merge-base", "--is-ancestor", branch.name, baseBranch], {
        cwd: input.repoRoot
      });
    } catch {
      logger2.debug("Branch not merged, skipping cleanup", { branch: branch.name });
      continue;
    }
    if (branch.worktree) {
      await tryCleanupStep(
        () => execFileAsync2("git", ["worktree", "remove", branch.worktree], { cwd: input.repoRoot }),
        "Failed to remove worktree",
        branch.name,
        logger2
      );
    }
    await tryCleanupStep(
      () => execFileAsync2("git", ["branch", "-d", branch.name], { cwd: input.repoRoot }),
      "Failed to delete branch",
      branch.name,
      logger2
    );
    await tryCleanupStep(
      () => client.removeBranch(input.cardId, branch.name),
      "Failed to remove branch from API",
      branch.name,
      logger2
    );
    logger2.info("Cleaned up merged branch", { branch: branch.name });
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
  const baseBranch = await resolveBaseBranch(input.repoRoot);
  const worktreeResult = await resolveOrCreateWorktree(input, client, baseBranch, context.logger);
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
  try {
    await cleanupMergedBranches(input, client, baseBranch, context.logger);
  } catch (error) {
    context.logger.warn("Branch cleanup failed", {
      error: errorMessage(error)
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
executeCommand(chat_default);
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vLi4vc3JjL2FjdGlvbnMvY2hhdC50cyIsICIuLi8uLi8uLi9zZGsvc3JjL2NvbmZpZy9mYWN0b3JpZXMvYWN0aW9uLnRzIiwgIi4uLy4uLy4uL3Nkay9zcmMvY29uZmlnL2Vudi50cyIsICIuLi8uLi8uLi9zZGsvc3JjL2NvbmZpZy9leGl0LWNvZGVzLnRzIiwgIi4uLy4uLy4uL3Nkay9zcmMvY29uZmlnL2xvZ2dlci50cyIsICIuLi8uLi8uLi9zZGsvc3JjL2NvbmZpZy9zb2NrZXQtY2xpZW50LnRzIiwgIi4uLy4uLy4uL3Nkay9zcmMvY29uZmlnL3J1bnRpbWUudHMiLCAiLi4vLi4vc3JjL2xpYi9jbGF1ZGUtc2Vzc2lvbi50cyIsICIuLi8uLi8uLi9zZGsvc3JjL2NsaWVudC90eXBlcy9lcnJvcnMudHMiLCAiLi4vLi4vLi4vc2RrL3NyYy9jbGllbnQvY2FyZHNDbGllbnQudHMiLCAiLi4vLi4vc3JjL2xpYi9jcmVhdGUtd29ya3RyZWUudHMiLCAiLi4vLi4vc3JjL2FjdGlvbnMvaG9vay13cmFwcGVyLnRzIl0sCiAgInNvdXJjZXNDb250ZW50IjogWyIvKipcbiAqIENoYXQgYWN0aW9uIGZvciBDbGF1ZGUgQ29kZSB3b3JrZmxvd3MuXG4gKlxuICogU3Bhd25zIHRoZSBgY2xhdWRlYCBDTEkgd2l0aCB0aGUgYHJ1bnRpbWU6Y2hhdGAgc2tpbGwgZm9yIHRoZSBjdXJyZW50IGNhcmQuXG4gKiBUaGUgcHJvY2VzcyBhbHdheXMgcnVucyBpbnRlcmFjdGl2ZWx5IFx1MjAxNCBzdGRpbyBpcyBpbmhlcml0ZWQgc28gdGhlIHVzZXIgZ2V0c1xuICogZGlyZWN0IHRlcm1pbmFsIGNvbnRyb2wuIEJhY2tncm91bmQgbW9kZSBpcyBub3Qgc3VwcG9ydGVkIGJlY2F1c2UgY2hhdFxuICogcmVxdWlyZXMgYWN0aXZlIHVzZXIgcGFydGljaXBhdGlvbi5cbiAqXG4gKiBUaGUgYWN0aW9uIGF3YWl0cyBwcm9jZXNzIGV4aXQgYmVmb3JlIHJlc29sdmluZywgc28gdGhlIHRlcm1pbmFsIGNsb3Nlc1xuICogb25seSBhZnRlciBDbGF1ZGUgZmluaXNoZXMgYW5kIGNsZWFudXAgaXMgY29tcGxldGUuXG4gKlxuICogQHN1bW1hcnkgQ2hhdCBhY3Rpb24gZm9yIENsYXVkZSBDb2RlIHdvcmtmbG93c1xuICogQG1vZHVsZVxuICogQHNlZSB7QGxpbmsgZGVmaW5lQWN0aW9ufSBmb3IgZmFjdG9yeSBiZWhhdmlvciBhbmQgbWV0YWRhdGEgYXR0YWNobWVudFxuICovXG5cbmltcG9ydCB7IHJhbmRvbVVVSUQgfSBmcm9tICdub2RlOmNyeXB0byc7XG5pbXBvcnQgeyB0eXBlIEFjdGlvbkNvbnRleHQsIHR5cGUgQWN0aW9uSW5wdXQsIGRlZmluZUFjdGlvbiB9IGZyb20gJ0BjYXJkcy9zZGsvY29uZmlnJztcbmltcG9ydCB7IHNwYXduQ2xhdWRlU2Vzc2lvbiB9IGZyb20gJy4uL2xpYi9jbGF1ZGUtc2Vzc2lvbi5qcyc7XG5cbi8qKlxuICogQ2hhdCBhY3Rpb24gaGFuZGxlci5cbiAqXG4gKiBTcGF3bnMgdGhlIGBjbGF1ZGVgIENMSSBhcyBhIGNoaWxkIHByb2Nlc3MgdXNpbmcgdGhlIGNoYXQgc2tpbGwuXG4gKiBUaGUgcHJvY2VzcyBsaWZlY3ljbGUgaXMgdGllZCB0byB0aGUgYWN0aW9uOiBjYW5jZWxsYXRpb24gc2VuZHMgU0lHVEVSTS5cbiAqIFNlc3Npb24gcmVzdW1lIGlzIG5vdCBzdXBwb3J0ZWQgXHUyMDE0IGVhY2ggY2hhdCBhbHdheXMgc3RhcnRzIGZyZXNoLlxuICovXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVBY3Rpb24oXG4gIHtcbiAgICBhY3Rpb25OYW1lOiAnQ2hhdCcsXG4gICAgZGVzY3JpcHRpb246ICdTdGFydCBhIGNoYXQgc2Vzc2lvbiBmb3IgdGhlIGNhcmQnLFxuICAgIHN1cHBvcnRzQmFja2dyb3VuZE1vZGU6IGZhbHNlLFxuICAgIHRpbWVvdXQ6IDM2MDAwMDBcbiAgfSxcbiAgYXN5bmMgKGlucHV0OiBBY3Rpb25JbnB1dCwgY29udGV4dDogQWN0aW9uQ29udGV4dCkgPT4ge1xuICAgIGF3YWl0IHNwYXduQ2xhdWRlU2Vzc2lvbihpbnB1dCwgY29udGV4dCwge1xuICAgICAgcHJvbXB0OiAnTG9hZCB0aGUgYHJ1bnRpbWU6Y2FyZC1yZXBvYCBhbmQgYHJ1bnRpbWU6Y2hhdGAgc2tpbGxzIHRoZW4gZm9sbG93IHRoZSBgPGluc3RydWN0aW9ucz5gLicsXG4gICAgICBzZXNzaW9uSWQ6IHJhbmRvbVVVSUQoKSxcbiAgICAgIHJlc3VtZTogZmFsc2UsXG4gICAgICBzdXBwb3J0c1N3aXRjaFRvSW50ZXJhY3RpdmU6IGZhbHNlXG4gICAgfSk7XG4gIH1cbik7XG4iLCAiLyoqXG4gKiBGYWN0b3J5IGZ1bmN0aW9uIGZvciBjcmVhdGluZyBhY3Rpb24gaGFuZGxlcnMuXG4gKlxuICogVGhpcyBpcyB0aGUgcHJpbWFyeSBhdXRob3JpbmcgQVBJIGZvciBhY3Rpb24gZGV2ZWxvcGVycy4gSXQgd3JhcHMgYSBoYW5kbGVyXG4gKiBmdW5jdGlvbiBhbmQgYXR0YWNoZXMgbWV0YWRhdGEgZm9yIHNldHRpbmdzLmpzb24gZ2VuZXJhdGlvbi4gVGhlIFNhbWVTaGFwZVxuICogdXRpbGl0eSBwcm92aWRlcyBjb21waWxlLXRpbWUgdHlwbyBkZXRlY3Rpb24uXG4gKlxuICpcbiAqIEBzdW1tYXJ5IEZhY3RvcnkgZnVuY3Rpb24gZm9yIGNyZWF0aW5nIGFjdGlvbiBoYW5kbGVyc1xuICogQG1vZHVsZVxuICovXG5cbmltcG9ydCB0eXBlIHsgQWN0aW9uQ29tbWFuZCB9IGZyb20gJy4uL2NvbW1hbmQtdHlwZXMuanMnO1xuaW1wb3J0IHR5cGUgeyBBY3Rpb25Db250ZXh0LCBBY3Rpb25JbnB1dCB9IGZyb20gJy4uL2lucHV0cy5qcyc7XG5pbXBvcnQgdHlwZSB7IFNhbWVTaGFwZSB9IGZyb20gJy4uL3R5cGUtdXRpbHMuanMnO1xuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBDb25maWd1cmF0aW9uIFR5cGVzXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbi8qKlxuICogQ29uZmlndXJhdGlvbiBmb3Ige0BsaW5rIGRlZmluZUFjdGlvbn0gZmFjdG9yeS5cbiAqXG4gKiBBbGwgZmllbGRzIGV4Y2VwdCBgYWN0aW9uTmFtZWAgYXJlIG9wdGlvbmFsIGFuZCBmb3J3YXJkZWQgdG8gc2V0dGluZ3MuanNvbi5cbiAqIFRoZSBDTEkgZXh0cmFjdHMgdGhpcyBtZXRhZGF0YSB2aWEgQVNUIGFuYWx5c2lzLCBzbyB2YWx1ZXMgbXVzdCBiZSBzdHJpbmdcbiAqIGxpdGVyYWxzIG9yIGJvb2xlYW4vbnVtYmVyIGxpdGVyYWxzIGluIHRoZSBzb3VyY2UgY29kZS5cbiAqXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogY29uc3QgY29uZmlnOiBBY3Rpb25Db25maWcgPSB7XG4gKiAgIGFjdGlvbk5hbWU6ICdMYXVuY2ggQ2xhdWRlJyxcbiAqICAgZGVzY3JpcHRpb246ICdTdGFydCBhIENsYXVkZSBjb2Rpbmcgc2Vzc2lvbicsXG4gKiAgIGljb246ICcuL2ljb25zL2NsYXVkZS5zdmcnLFxuICogICBzdXBwb3J0c0JhY2tncm91bmRNb2RlOiB0cnVlLFxuICogICB0aW1lb3V0OiAzMDAwMFxuICogfTtcbiAqIGBgYFxuICovXG5leHBvcnQgaW50ZXJmYWNlIEFjdGlvbkNvbmZpZyB7XG4gIC8qKlxuICAgKiBTdGFibGUgaWRlbnRpZmllciBmb3IgdGhlIGFjdGlvbiB1c2VkIGluIHRlbGVtZXRyeSwgbG9jYWxpemF0aW9uLCBhbmQgQVBJIGxvb2t1cHMuXG4gICAqXG4gICAqIFNob3VsZCBiZSBsb3dlcmNhc2Ugd2l0aCBoeXBoZW5zIChlLmcuLCAnbGF1bmNoLWNsYXVkZScsICdydW4tdGVzdHMnKS5cbiAgICogSWYgb21pdHRlZCwgdGhlIENMSSBnZW5lcmF0ZXMgYW4gSUQgYnkgc2x1Z2lmeWluZyBgYWN0aW9uTmFtZWAuXG4gICAqL1xuICBpZD86IHN0cmluZztcblxuICAvKipcbiAgICogVGhlIGFjdGlvbiBuYW1lIHVzZWQgdG8gaWRlbnRpZnkgdGhlIGFjdGlvbiBpbiBzZXR0aW5ncy5qc29uLlxuICAgKlxuICAgKiBUaGlzIG5hbWUgYXBwZWFycyBpbiB0aGUgVUkuIEtlZXAgaXQgY29uY2lzZSBidXQgZGVzY3JpcHRpdmUuXG4gICAqL1xuICBhY3Rpb25OYW1lOiBzdHJpbmc7XG5cbiAgLyoqXG4gICAqIEh1bWFuLXJlYWRhYmxlIGRlc2NyaXB0aW9uIHNob3duIGluIGJ1dHRvbiB0b29sdGlwLlxuICAgKlxuICAgKiBFeHBsYWluIHdoYXQgdGhlIGFjdGlvbiBkb2VzIGluIGEgZmV3IHdvcmRzLiBTaG93biBvbiBob3ZlciBpbiB0aGUgVUkuXG4gICAqL1xuICBkZXNjcmlwdGlvbj86IHN0cmluZztcblxuICAvKipcbiAgICogUGF0aCB0byBpY29uIGZpbGUgZm9yIHRoZSBhY3Rpb24gYnV0dG9uLlxuICAgKlxuICAgKiBQYXRocyBhcmUgcmVsYXRpdmUgdG8gdGhlIHNldHRpbmdzLmpzb24gZmlsZSBsb2NhdGlvbi5cbiAgICogU1ZHIGZvcm1hdCByZWNvbW1lbmRlZCBmb3IgY3Jpc3AgcmVuZGVyaW5nIGF0IGFueSBzaXplLlxuICAgKi9cbiAgaWNvbj86IHN0cmluZztcblxuICAvKipcbiAgICogV2hldGhlciB0byBzaG93IHRoZSBleGVjdXRpb24gbW9kZSB0b2dnbGUgaW4gdGhlIFVJLlxuICAgKlxuICAgKiBXaGVuIHRydWUsIHVzZXJzIGNhbiBjaG9vc2UgYmV0d2VlbiBpbnRlcmFjdGl2ZSBhbmQgYmFja2dyb3VuZCBtb2Rlcy5cbiAgICogV2hlbiBmYWxzZSAoZGVmYXVsdCksIHRoZSBhY3Rpb24gYWx3YXlzIHJ1bnMgaW4gaW50ZXJhY3RpdmUgbW9kZS5cbiAgICovXG4gIHN1cHBvcnRzQmFja2dyb3VuZE1vZGU/OiBib29sZWFuO1xuXG4gIC8qKlxuICAgKiBXaGV0aGVyIG11bHRpcGxlIGluc3RhbmNlcyBjYW4gcnVuIHNpbXVsdGFuZW91c2x5IG9uIHRoZSBzYW1lIGNhcmQuXG4gICAqXG4gICAqIFdoZW4gZmFsc2UgKGRlZmF1bHQpLCBzdGFydGluZyB0aGUgYWN0aW9uIHdoaWxlIGl0J3MgcnVubmluZyB3aWxsIGJlXG4gICAqIGJsb2NrZWQuIFNldCB0byB0cnVlIGZvciBpZGVtcG90ZW50IGFjdGlvbnMgdGhhdCBjYW4gc2FmZWx5IG92ZXJsYXAuXG4gICAqL1xuICBhbGxvd0NvbmN1cnJlbnQ/OiBib29sZWFuO1xuXG4gIC8qKlxuICAgKiBNYXhpbXVtIGV4ZWN1dGlvbiB0aW1lIGluIG1pbGxpc2Vjb25kcy5cbiAgICpcbiAgICogSWYgdGhlIGFjdGlvbiBleGNlZWRzIHRoaXMgdGltZW91dCwgdGhlIHJ1bnRpbWUgd2lsbCB0ZXJtaW5hdGUgaXQuXG4gICAqIE9taXQgdG8gdXNlIHRoZSBwbGF0Zm9ybSdzIGRlZmF1bHQgdGltZW91dCBwb2xpY3kuXG4gICAqL1xuICB0aW1lb3V0PzogbnVtYmVyO1xuXG4gIC8qKlxuICAgKiBIYW5kbGVyIHNvdXJjZSBmaWxlIHBhdGgsIGluamVjdGVkIGJ5IHRoZSBgaW5qZWN0U291cmNlUGF0aGAgZXNidWlsZFxuICAgKiBwbHVnaW4gZHVyaW5nIGNvbmZpZyBsb2FkaW5nLiBEbyBub3Qgc2V0IG1hbnVhbGx5LlxuICAgKlxuICAgKiBAaW50ZXJuYWxcbiAgICovXG4gIHNvdXJjZVBhdGg/OiBzdHJpbmc7XG59XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIEhhbmRsZXIgVHlwZXNcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuLyoqXG4gKiBIYW5kbGVyIGZ1bmN0aW9uIHNpZ25hdHVyZSBmb3IgYWN0aW9uIGV2ZW50cy5cbiAqXG4gKiBUaHJvd2luZyBhbiBlcnJvciBzaWduYWxzIGFjdGlvbiBmYWlsdXJlLiBUaGUgZXJyb3IgbWVzc2FnZSBpcyBsb2dnZWQgYW5kXG4gKiBzdXJmYWNlZCB0byB0aGUgdXNlci4gRm9yIGV4cGVjdGVkIGVycm9ycywgdGhyb3cgd2l0aCBhIGRlc2NyaXB0aXZlIG1lc3NhZ2UuXG4gKlxuICogQHBhcmFtIGlucHV0IC0gQWN0aW9uIGlucHV0IHBheWxvYWQgZnJvbSBlbnZpcm9ubWVudCB2YXJpYWJsZXNcbiAqIEBwYXJhbSBjb250ZXh0IC0gUnVudGltZSBjb250ZXh0IHdpdGggbG9nZ2VyLCBjd2QsIGFuZCBjYWxsYmFjayBtZXRob2RzXG4gKiBAcmV0dXJucyBQcm9taXNlIHRoYXQgcmVzb2x2ZXMgd2hlbiB0aGUgYWN0aW9uIGNvbXBsZXRlc1xuICpcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBjb25zdCBoYW5kbGVyOiBBY3Rpb25IYW5kbGVyID0gYXN5bmMgKGlucHV0LCB7IGxvZ2dlciwgb25DYW5jZWwgfSkgPT4ge1xuICogICBvbkNhbmNlbCgoKSA9PiB7XG4gKiAgICAgbG9nZ2VyLmluZm8oJ0NhbmNlbGxpbmcgYWN0aW9uJyk7XG4gKiAgIH0pO1xuICpcbiAqICAgdHJ5IHtcbiAqICAgICBsb2dnZXIuaW5mbygnU3RhcnRpbmcgYWN0aW9uJywgeyBjYXJkSWQ6IGlucHV0LmNhcmRJZCB9KTtcbiAqICAgICBhd2FpdCBwZXJmb3JtQWN0aW9uKGlucHV0KTtcbiAqICAgICBsb2dnZXIuaW5mbygnQWN0aW9uIGNvbXBsZXRlZCBzdWNjZXNzZnVsbHknKTtcbiAqICAgfSBjYXRjaCAoZXJyKSB7XG4gKiAgICAgbG9nZ2VyLmxvZ0Vycm9yKGVyciwgJ0FjdGlvbiBmYWlsZWQnKTtcbiAqICAgICB0aHJvdyBlcnI7IC8vIFJlLXRocm93IHRvIHNpZ25hbCBmYWlsdXJlXG4gKiAgIH1cbiAqIH07XG4gKiBgYGBcbiAqL1xuZXhwb3J0IHR5cGUgQWN0aW9uSGFuZGxlciA9IChpbnB1dDogQWN0aW9uSW5wdXQsIGNvbnRleHQ6IEFjdGlvbkNvbnRleHQpID0+IHZvaWQgfCBQcm9taXNlPHZvaWQ+O1xuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBGYWN0b3J5IEZ1bmN0aW9uXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbi8qKlxuICogQ3JlYXRlcyBhbiBhY3Rpb24gaGFuZGxlciB3aXRoIG1ldGFkYXRhIGZvciBzZXR0aW5ncy5qc29uIGdlbmVyYXRpb24uXG4gKlxuICogVGhpcyBmYWN0b3J5IHdyYXBzIHlvdXIgaGFuZGxlciBmdW5jdGlvbiBhbmQgYXR0YWNoZXMgbWV0YWRhdGEgdGhhdCB0aGUgQ0xJXG4gKiBleHRyYWN0cyB3aGVuIGJ1aWxkaW5nIHNldHRpbmdzLmpzb24uIFRoZSByZXR1cm5lZCBjb21tYW5kIGlzIGJvdGggY2FsbGFibGVcbiAqIChmb3IgdGhlIHJ1bnRpbWUpIGFuZCBpbnNwZWN0YWJsZSAoZm9yIHRoZSBDTEkpLlxuICpcbiAqIFRoZSBnZW5lcmljIHBhcmFtZXRlciBwcmVzZXJ2ZXMgdGhlIGFjdGlvbiBuYW1lIGFzIGEgbGl0ZXJhbCB0eXBlLlxuICpcbiAqIEB0ZW1wbGF0ZSBUIC0gVGhlIGNvbmZpZyB0eXBlIGV4dGVuZGluZyBBY3Rpb25Db25maWdcbiAqIEBwYXJhbSBjb25maWcgLSBBY3Rpb24gbWV0YWRhdGEgKHVzZXMgU2FtZVNoYXBlIHRvIGNhdGNoIHR5cG9zKVxuICogQHBhcmFtIGhhbmRsZXIgLSBBc3luYyBmdW5jdGlvbiB0aGF0IGltcGxlbWVudHMgdGhlIGFjdGlvbiBsb2dpY1xuICogQHJldHVybnMgQSBjYWxsYWJsZSBjb21tYW5kIHdpdGggYXR0YWNoZWQgbWV0YWRhdGFcbiAqXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogLy8gQmFzaWMgdXNhZ2VcbiAqIGV4cG9ydCBkZWZhdWx0IGRlZmluZUFjdGlvbihcbiAqICAgeyBhY3Rpb25OYW1lOiAnTGF1bmNoIENsYXVkZScgfSxcbiAqICAgYXN5bmMgKGlucHV0LCB7IGxvZ2dlciB9KSA9PiB7XG4gKiAgICAgbG9nZ2VyLmluZm8oJ0xhdW5jaGluZyBDbGF1ZGUnLCB7IGNhcmRJZDogaW5wdXQuY2FyZElkIH0pO1xuICogICAgIGF3YWl0IHNwYXduQ2xhdWRlKGlucHV0KTtcbiAqICAgfVxuICogKTtcbiAqIGBgYFxuICpcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiAvLyBXaXRoIGZ1bGwgY29uZmlndXJhdGlvblxuICogZXhwb3J0IGRlZmF1bHQgZGVmaW5lQWN0aW9uKFxuICogICB7XG4gKiAgICAgYWN0aW9uTmFtZTogJ0RlcGxveSBBcHBsaWNhdGlvbicsXG4gKiAgICAgZGVzY3JpcHRpb246ICdEZXBsb3kgdG8gcHJvZHVjdGlvbicsXG4gKiAgICAgaWNvbjogJy4vaWNvbnMvZGVwbG95LnN2ZycsXG4gKiAgICAgc3VwcG9ydHNCYWNrZ3JvdW5kTW9kZTogdHJ1ZSxcbiAqICAgICBhbGxvd0NvbmN1cnJlbnQ6IGZhbHNlLFxuICogICAgIHRpbWVvdXQ6IDYwMDAwXG4gKiAgIH0sXG4gKiAgIGFzeW5jIChpbnB1dCwgY29udGV4dCkgPT4ge1xuICogICAgIGNvbnRleHQub25DYW5jZWwoKCkgPT4gY2xlYW51cCgpKTtcbiAqICAgICBhd2FpdCBkZXBsb3koaW5wdXQsIGNvbnRleHQpO1xuICogICB9XG4gKiApO1xuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBkZWZpbmVBY3Rpb248VCBleHRlbmRzIEFjdGlvbkNvbmZpZz4oXG4gIGNvbmZpZzogU2FtZVNoYXBlPEFjdGlvbkNvbmZpZywgVD4sXG4gIGhhbmRsZXI6IEFjdGlvbkhhbmRsZXJcbik6IEFjdGlvbkNvbW1hbmQ8VFsnYWN0aW9uTmFtZSddPiB7XG4gIGNvbnN0IGZuID0gYXN5bmMgKGlucHV0OiBBY3Rpb25JbnB1dCwgY29udGV4dDogQWN0aW9uQ29udGV4dCk6IFByb21pc2U8dm9pZD4gPT4ge1xuICAgIGF3YWl0IGhhbmRsZXIoaW5wdXQsIGNvbnRleHQpO1xuICB9O1xuXG4gIGZuLmZhY3RvcnlUeXBlID0gJ2FjdGlvbicgYXMgY29uc3Q7XG4gIGZuLmlkID0gY29uZmlnLmlkO1xuICBmbi5hY3Rpb25OYW1lID0gY29uZmlnLmFjdGlvbk5hbWU7XG4gIGZuLmRlc2NyaXB0aW9uID0gY29uZmlnLmRlc2NyaXB0aW9uO1xuICBmbi5pY29uID0gY29uZmlnLmljb247XG4gIGZuLnN1cHBvcnRzQmFja2dyb3VuZE1vZGUgPSBjb25maWcuc3VwcG9ydHNCYWNrZ3JvdW5kTW9kZTtcbiAgZm4uYWxsb3dDb25jdXJyZW50ID0gY29uZmlnLmFsbG93Q29uY3VycmVudDtcbiAgZm4udGltZW91dCA9IGNvbmZpZy50aW1lb3V0O1xuICBmbi5zb3VyY2VQYXRoID0gY29uZmlnLnNvdXJjZVBhdGg7XG5cbiAgcmV0dXJuIGZuIGFzIEFjdGlvbkNvbW1hbmQ8VFsnYWN0aW9uTmFtZSddPjtcbn1cbiIsICIvKipcbiAqIEVudmlyb25tZW50IHZhcmlhYmxlIHV0aWxpdGllcyBmb3IgQ2FyZHMgRXh0ZW5zaW9uIGFjdGlvbnMgYW5kIHR5cGUgaG9va3MuXG4gKlxuICogVGhlIGV4ZWN1dGlvbiB3cmFwcGVyIGluamVjdHMgYWN0aW9uIGFuZCB0eXBlIGhvb2sgaW5wdXRzIHZpYSBwcm9jZXNzLmVudi5cbiAqIFRoaXMgbW9kdWxlIHByb3ZpZGVzIHN0cmljdCBnZXR0ZXJzIGFuZCB0eXBlZCBleHRyYWN0b3JzIHNvIGhhbmRsZXJzIGRvIG5vdFxuICogbmVlZCB0byBwYXJzZSBlbnZpcm9ubWVudCB2YXJpYWJsZXMgbWFudWFsbHkuXG4gKlxuICogVXNlIHRoZSBpbmRpdmlkdWFsIGdldHRlcnMgd2hlbiB5b3Ugb25seSBuZWVkIG9uZSB2YWx1ZTsgdXNlXG4gKiB7QGxpbmsgZXh0cmFjdEFjdGlvbklucHV0fSBvciB7QGxpbmsgZXh0cmFjdFR5cGVJbnB1dH0gd2hlbiB5b3UgbmVlZCBhIGZ1bGxcbiAqIHR5cGVkIHBheWxvYWQgZm9yIGFuIGFjdGlvbiBvciB0eXBlIGhvb2suXG4gKlxuICpcbiAqIEBzdW1tYXJ5IEVudmlyb25tZW50IHZhcmlhYmxlIHV0aWxpdGllcyBmb3IgQ2FyZHMgRXh0ZW5zaW9uIGFjdGlvbnMgYW5kIHR5cGUgaG9va3NcbiAqIEBtb2R1bGVcbiAqL1xuXG5pbXBvcnQgeyByZWFkRmlsZVN5bmMgfSBmcm9tICdub2RlOmZzJztcbmltcG9ydCB0eXBlIHsgQWN0aW9uSW5wdXQsIFR5cGVIb29rSW5wdXQgfSBmcm9tICcuL2lucHV0cy5qcyc7XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIENvbnN0YW50c1xuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4vKipcbiAqIEVudmlyb25tZW50IHZhcmlhYmxlIG5hbWVzIHNldCBieSB0aGUgQ2FyZHMgZXhlY3V0aW9uIHdyYXBwZXIuXG4gKlxuICogVGhpcyBpcyB0aGUgc2luZ2xlIHNvdXJjZSBvZiB0cnV0aCBmb3IgZW52IHZhciBrZXlzIHVzZWQgYnkgYWN0aW9uIGFuZCB0eXBlXG4gKiBob29rIHByb2Nlc3Nlcy4gS2VlcCBpdCBpbiBzeW5jIHdpdGggdGhlIHdyYXBwZXIgdG8gYXZvaWQgc3VidGxlIFwidW5kZWZpbmVkXG4gKiBpbnB1dFwiIGJ1Z3MuXG4gKi9cbmV4cG9ydCBjb25zdCBDQVJEU19FTlZfVkFSUyA9IHtcbiAgLyoqXG4gICAqIFVuaXF1ZSBpZGVudGlmaWVyIGZvciB0aGUgY3VycmVudCBjYXJkLlxuICAgKiBBdmFpbGFibGUgaW4gYWxsIGFjdGlvbnMgYW5kIHR5cGUgaG9va3MuXG4gICAqL1xuICBDQVJEX0lEOiAnQ0FSRF9JRCcsXG5cbiAgLyoqXG4gICAqIFRoZSBlbnZpcm9ubWVudCBuYW1lIGZyb20gc2V0dGluZ3MuanNvbi5cbiAgICogQXZhaWxhYmxlIGluIGFsbCBhY3Rpb25zIGFuZCB0eXBlIGhvb2tzLlxuICAgKi9cbiAgRU5WSVJPTk1FTlQ6ICdFTlZJUk9OTUVOVCcsXG5cbiAgLyoqXG4gICAqIERpc3BsYXkgbmFtZSBvZiB0aGUgYWN0aW9uIGJ1dHRvbiB0aGF0IHRyaWdnZXJlZCB0aGlzIGhhbmRsZXIuXG4gICAqIEF2YWlsYWJsZSBpbiBhY3Rpb25zIG9ubHkgKG5vdCB0eXBlIGhvb2tzKS5cbiAgICovXG4gIEFDVElPTl9OQU1FOiAnQUNUSU9OX05BTUUnLFxuXG4gIC8qKlxuICAgKiBDYXJkJ3MgZXhlY3V0aW9uIG1vZGUsIGRldGVybWluaW5nIFVJIGludGVyYWN0aW9uIG1vZGVsLlxuICAgKiBBdmFpbGFibGUgaW4gYWN0aW9ucyBvbmx5IChub3QgdHlwZSBob29rcykuXG4gICAqIFZhbGlkIHZhbHVlczogJ2ludGVyYWN0aXZlJyB8ICdiYWNrZ3JvdW5kJ1xuICAgKi9cbiAgRVhFQ1VUSU9OX01PREU6ICdFWEVDVVRJT05fTU9ERScsXG5cbiAgLyoqXG4gICAqIENhcmRzIHNlcnZlciBiYXNlIFVSTCBmb3IgQVBJIGNhbGxzLlxuICAgKiBBdmFpbGFibGUgaW4gYWxsIGFjdGlvbnMgYW5kIHR5cGUgaG9va3MuXG4gICAqL1xuICBBUElfQkFTRV9VUkw6ICdBUElfQkFTRV9VUkwnLFxuXG4gIC8qKlxuICAgKiBBdXRoZW50aWNhdGlvbiB0b2tlbiBmb3IgQVBJIGNhbGxzLlxuICAgKiBBdmFpbGFibGUgaW4gYWxsIGFjdGlvbnMgYW5kIHR5cGUgaG9va3MuXG4gICAqL1xuICBBUElfQUNDRVNTX1RPS0VOOiAnQVBJX0FDQ0VTU19UT0tFTicsXG5cbiAgLyoqXG4gICAqIENvbmZpZ3VyZWQgY29kaW5nIGFnZW50IGlkZW50aWZpZXIgZnJvbSBjYXJkcy5jb2RpbmdBZ2VudCBzZXR0aW5nLlxuICAgKiBBdmFpbGFibGUgaW4gYWN0aW9ucyBvbmx5IChub3QgdHlwZSBob29rcykuXG4gICAqIE9wdGlvbmFsLlxuICAgKi9cbiAgQ09ESU5HX0FHRU5UOiAnQ09ESU5HX0FHRU5UJyxcblxuICAvKipcbiAgICogVGhlIHJlZ2lzdGVyZWQgdHlwZSBuYW1lLlxuICAgKiBBdmFpbGFibGUgaW4gdHlwZSBob29rcyBvbmx5LlxuICAgKi9cbiAgVFlQRV9OQU1FOiAnVFlQRV9OQU1FJyxcblxuICAvKipcbiAgICogVGhlIHR5cGUncyB2ZXJzaW9uIHN0cmluZyBmcm9tIHNldHRpbmdzLmpzb24gY29uZmlndXJhdGlvbi5cbiAgICogQXZhaWxhYmxlIGluIHR5cGUgaG9va3Mgb25seS5cbiAgICovXG4gIFRZUEVfVkVSU0lPTjogJ1RZUEVfVkVSU0lPTicsXG5cbiAgLyoqXG4gICAqIFRoZSBmaWxlIG5hbWUgd2l0aGluIHRoZSB0eXBlIGRpcmVjdG9yeS5cbiAgICogQXZhaWxhYmxlIGluIHR5cGUgaG9va3Mgb25seS5cbiAgICovXG4gIEZJTEVfTkFNRTogJ0ZJTEVfTkFNRScsXG5cbiAgLyoqXG4gICAqIEZ1bGwgcGF0aCB0byB0aGUgZmlsZS5cbiAgICogQXZhaWxhYmxlIGluIHR5cGUgaG9va3Mgb25seS5cbiAgICovXG4gIEZJTEVfUEFUSDogJ0ZJTEVfUEFUSCcsXG5cbiAgLyoqXG4gICAqIEZpbGUgc2l6ZSBpbiBieXRlcy5cbiAgICogQXZhaWxhYmxlIGluIHR5cGUgaG9va3Mgb25seS5cbiAgICovXG4gIEZJTEVfU0laRTogJ0ZJTEVfU0laRScsXG5cbiAgLyoqXG4gICAqIFNIQTI1NiBoYXNoIG9mIGNvbnRlbnQuXG4gICAqIEF2YWlsYWJsZSBpbiB0eXBlIGhvb2tzIG9ubHkuXG4gICAqL1xuICBTSEEyNTY6ICdTSEEyNTYnLFxuXG4gIC8qKlxuICAgKiBNSU1FIHR5cGUgb2YgdGhlIGNvbnRlbnQuXG4gICAqIEF2YWlsYWJsZSBpbiB0eXBlIGhvb2tzIG9ubHkuXG4gICAqL1xuICBDT05URU5UX1RZUEU6ICdDT05URU5UX1RZUEUnLFxuXG4gIC8qKlxuICAgKiBQYXRoIHRvIHRoZSBWUyBDb2RlIGJ1bmRsZWQgTm9kZS5qcyBpbnRlcnByZXRlci5cbiAgICpcbiAgICogU2V0IGJ5IHRoZSBleHRlbnNpb24gaG9zdCBmcm9tIGBwcm9jZXNzLmV4ZWNQYXRoYCAod2l0aFxuICAgKiBgRUxFQ1RST05fUlVOX0FTX05PREU9MWApLiBDb21tYW5kcyBpbiBzZXR0aW5ncy5qc29uIHVzZVxuICAgKiBgJFZTQ09ERV9OT0RFIC4vYmluLy4uLmAgc28gdGhleSB3b3JrIHJlZ2FyZGxlc3Mgb2ZcbiAgICogd2hldGhlciBgbm9kZWAgaXMgb24gdGhlIHN5c3RlbSBQQVRILlxuICAgKlxuICAgKiBBdmFpbGFibGUgaW4gYWxsIGFjdGlvbnMgYW5kIHR5cGUgaG9va3MuXG4gICAqL1xuICBWU0NPREVfTk9ERTogJ1ZTQ09ERV9OT0RFJyxcblxuICAvKipcbiAgICogUGF0aCB0byB0aGUgTm9kZS5qcyBpbnRlcnByZXRlciBydW5uaW5nIHRoZSB3cmFwcGVyIHByb2Nlc3MuXG4gICAqXG4gICAqIFNldCBieSB0aGUgd3JhcHBlciBmcm9tIGBwcm9jZXNzLmV4ZWNQYXRoYC4gVXNlIGAkTk9ERWAgaW4gZW1iZWRkZWRcbiAgICogYmFzaCBzdGF0ZW1lbnRzIHRvIGludm9rZSBOb2RlIHNjcmlwdHMgcG9ydGFibHkuXG4gICAqXG4gICAqIEF2YWlsYWJsZSBpbiBhbGwgYWN0aW9ucy5cbiAgICovXG4gIE5PREU6ICdOT0RFJyxcblxuICAvKipcbiAgICogUGF0aCB0byB0aGUgVW5peCBkb21haW4gc29ja2V0IGZvciBydW50aW1lLXRvLWRpc3BhdGNoZXIgY29tbXVuaWNhdGlvbi5cbiAgICogQXZhaWxhYmxlIGluIGFjdGlvbnMgb25seS5cbiAgICovXG4gIFNPQ0tFVF9QQVRIOiAnU09DS0VUX1BBVEgnLFxuXG4gIC8qKlxuICAgKiBQYXRoIHRvIGEgSlNPTiBmaWxlIGNvbnRhaW5pbmcgc3dpdGNoVG9JbnRlcmFjdGl2ZSBkYXRhIGZyb20gYSBwcmV2aW91cyBoYW5kbGVyLlxuICAgKiBBdmFpbGFibGUgaW4gYWN0aW9ucyBvbmx5LiBPcHRpb25hbC5cbiAgICovXG4gIFNXSVRDSF9UT19JTlRFUkFDVElWRV9EQVRBX1BBVEg6ICdTV0lUQ0hfVE9fSU5URVJBQ1RJVkVfREFUQV9QQVRIJyxcblxuICAvKipcbiAgICogUGF0aCB0byB0aGUgc2V0dGluZ3MgY29uZmlndXJhdGlvbiBkaXJlY3RvcnkuXG4gICAqIEF2YWlsYWJsZSBpbiBhY3Rpb25zIG9ubHkuXG4gICAqL1xuICBDT05GSUdfUEFUSDogJ0NPTkZJR19QQVRIJyxcblxuICAvKipcbiAgICogUGF0aCB0byB0aGUgVlMgQ29kZSB3b3Jrc3BhY2Ugcm9vdCBkaXJlY3RvcnkuXG4gICAqIFNldCBieSB0aGUgYWN0aW9uIGhhbmRsZXIgKGUuZy4sIGxhdW5jaC50cykgdG8gdGhlIHdvcmt0cmVlIHBhdGguXG4gICAqIEF2YWlsYWJsZSBpbiBob29rcyBydW5uaW5nIGluc2lkZSB0aGUgY2xhdWRlIENMSS5cbiAgICovXG4gIFdPUktTUEFDRV9QQVRIOiAnV09SS1NQQUNFX1BBVEgnLFxuXG4gIC8qKlxuICAgKiBBYnNvbHV0ZSBwYXRoIHRvIHRoZSBtYWluIGdpdCByZXBvc2l0b3J5IHJvb3QgKE5PVCBhIHdvcmt0cmVlKS5cbiAgICogU2V0IGJ5IEFjdGlvbkRpc3BhdGNoZXI7IGNvbnN1bWVkIGJ5IHRoZSB3cmFwcGVyIGFuZCB3YXRjaGVyIGZvclxuICAgKiBnaXQgb3BlcmF0aW9ucyAod29ya3RyZWUgcmVtb3ZhbCwgYnJhbmNoIGRlbGV0aW9uKSB0aGF0IG11c3QgcnVuXG4gICAqIGFnYWluc3QgdGhlIG1haW4gcmVwb3NpdG9yeS5cbiAgICovXG4gIFJFUE9fUk9PVDogJ1JFUE9fUk9PVCcsXG5cbiAgLyoqXG4gICAqIFBhdGggdG8gdGhlIGNhcmQncyByZXBvc2l0b3J5IGRpcmVjdG9yeS5cbiAgICogQXZhaWxhYmxlIGluIGFjdGlvbnMgb25seS5cbiAgICovXG4gIENBUkRfUkVQT19QQVRIOiAnQ0FSRF9SRVBPX1BBVEgnLFxuXG4gIC8qKlxuICAgKiBSZXNvbHZlZCBzaGVsbCBjb21tYW5kIGZvciB0aGUgd3JhcHBlciB0byBzcGF3biBhcyB0aGUgYWN0aW9uIGhhbmRsZXIuXG4gICAqIFNldCBieSBBY3Rpb25EaXNwYXRjaGVyOyBjb25zdW1lZCBieSB0aGUgd3JhcHBlciAobm90IGJ5IGFjdGlvbiBoYW5kbGVycykuXG4gICAqL1xuICBBQ1RJT05fQ09NTUFORDogJ0FDVElPTl9DT01NQU5EJyxcblxuICAvKipcbiAgICogR2l0IGJyYW5jaCB0aGF0IHRoZSBjYXJkJ3Mgd29ya3NwYWNlIGJyYW5jaCB3aWxsIG1lcmdlIGludG8uXG4gICAqIFJlc29sdmVkIGZyb20gdGhlIHdvcmtzcGFjZSBIRUFEIGF0IGxhdW5jaCB0aW1lLlxuICAgKiBTZXQgYnkgdGhlIGxhdW5jaCBhY3Rpb24uXG4gICAqIEF2YWlsYWJsZSBpbiBhY3Rpb25zIG9ubHkuXG4gICAqL1xuICBCQVNFX0JSQU5DSDogJ0JBU0VfQlJBTkNIJyxcblxuICAvKipcbiAgICogR2l0IGJyYW5jaCBmcm9tIHdoaWNoIHRoZSBjYXJkJ3Mgd29ya3NwYWNlIGJyYW5jaCB3YXMgY3JlYXRlZC5cbiAgICogTWF5IGRpZmZlciBmcm9tIEJBU0VfQlJBTkNIIHdoZW4gdGhlIHdvcmt0cmVlIHdhcyBjcmVhdGVkIGFnYWluc3RcbiAgICogYSBkaWZmZXJlbnQgcmVmIHRoYW4gdGhlIGN1cnJlbnQgd29ya3NwYWNlIEhFQUQuXG4gICAqIFNldCBieSB0aGUgbGF1bmNoIGFjdGlvbi5cbiAgICogQXZhaWxhYmxlIGluIGFjdGlvbnMgb25seS5cbiAgICovXG4gIFBBUkVOVF9CUkFOQ0g6ICdQQVJFTlRfQlJBTkNIJyxcblxuICAvKipcbiAgICogR2l0IGJyYW5jaCBuYW1lIGZvciB0aGUgY2FyZCdzIHdvcmtzcGFjZSBpbXBsZW1lbnRhdGlvbi5cbiAgICogU2V0IGJ5IHRoZSBsYXVuY2ggYWN0aW9uIGFmdGVyIHJlc29sdmluZyBvciBjcmVhdGluZyB0aGUgd29ya3RyZWUuXG4gICAqIEF2YWlsYWJsZSBpbiBhY3Rpb25zIG9ubHkuXG4gICAqL1xuICBXT1JLU1BBQ0VfQlJBTkNIOiAnV09SS1NQQUNFX0JSQU5DSCcsXG5cbiAgLyoqXG4gICAqIFNlc3Npb24gSUQgcGVyc2lzdGVkIGJ5IHRoZSBzZXNzaW9uLXN0YXJ0IGhvb2sgdmlhIGBwZXJzaXN0RW52VmFyYC5cbiAgICpcbiAgICogQXZhaWxhYmxlIGluIEJhc2ggdG9vbCBzaGVsbCBkZXNjZW5kYW50cyAoY29tbWFuZHMsIGdpdCBob29rcykgYWZ0ZXJcbiAgICogc2Vzc2lvbiBzdGFydC4gTk9UIGF2YWlsYWJsZSBpbiBob29rcyBzcGF3bmVkIGRpcmVjdGx5IGJ5IENsYXVkZSBDb2RlXG4gICAqIChzdG9wLCBzZXNzaW9uLWVuZCwgZXRjLikgXHUyMDE0IHRob3NlIHJlY2VpdmUgdGhlIHNlc3Npb24gSUQgdmlhIGhvb2sgaW5wdXQuXG4gICAqXG4gICAqIFRoZSBjYXJkLXJlcG8gcG9zdC1jb21taXQgaG9vayByZWFkcyB0aGlzIHRvIHJlY29yZCBjb21taXRzIGRpcmVjdGx5XG4gICAqIHdpdGhvdXQgbmVlZGluZyBhIHByb2Nlc3MtdHJlZSB3YWxrIG9yIFBJRCByZWdpc3RyeSBsb29rdXAuXG4gICAqL1xuICBDQVJEU19TRVNTSU9OX0lEOiAnQ0FSRFNfU0VTU0lPTl9JRCcsXG5cbiAgLyoqXG4gICAqIEFic29sdXRlIHBhdGggdG8gdGhlIFZTIENvZGUgZXh0ZW5zaW9uIGluc3RhbGxhdGlvbiBkaXJlY3RvcnkuXG4gICAqXG4gICAqIFNldCBieSB0aGUgZXh0ZW5zaW9uIGhvc3QgZnJvbSBgY29udGV4dC5leHRlbnNpb25VcmkuZnNQYXRoYCBhbmQgaW5qZWN0ZWRcbiAgICogaW50byBhbGwgc3Bhd25lZCBhY3Rpb24gcHJvY2Vzc2VzLiBVc2UgdGhpcyB0byBsb2NhdGUgYnVuZGxlZCBhc3NldHMgc3VjaFxuICAgKiBhcyB0aGUgcnVudGltZSBwbHVnaW4gZGlyZWN0b3J5IChgPGV4dGVuc2lvblBhdGg+L2Rpc3QvcGx1Z2lucy9ydW50aW1lYCkuXG4gICAqXG4gICAqIEF2YWlsYWJsZSBpbiBhY3Rpb25zIG9ubHkgKG5vdCB0eXBlIGhvb2tzKS5cbiAgICovXG4gIEVYVEVOU0lPTl9QQVRIOiAnRVhURU5TSU9OX1BBVEgnXG59IGFzIGNvbnN0O1xuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBJbmRpdmlkdWFsIEdldHRlcnNcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuLyoqXG4gKiBSZWFkcyB0aGUgY2FyZCBpZGVudGlmaWVyIGZyb20gdGhlIGVudmlyb25tZW50LlxuICpcbiAqIFRoZSBleGVjdXRpb24gd3JhcHBlciBhbHdheXMgc2V0cyB0aGlzIGZvciBldmVyeSBhY3Rpb24gYW5kIHR5cGUgaG9vay5cbiAqIEByZXR1cm5zIFRoZSBjdXJyZW50IGNhcmQgSURcbiAqIEB0aHJvd3MgRXJyb3IgaWYgQ0FSRF9JRCBpcyBtaXNzaW5nIG9yIGVtcHR5XG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogY29uc3QgY2FyZElkID0gZ2V0Q2FyZElkKCk7XG4gKiBjb25zb2xlLmxvZyhgUHJvY2Vzc2luZyBjYXJkOiAke2NhcmRJZH1gKTtcbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0Q2FyZElkKCk6IHN0cmluZyB7XG4gIGNvbnN0IHZhbHVlID0gcHJvY2Vzcy5lbnZbQ0FSRFNfRU5WX1ZBUlMuQ0FSRF9JRF07XG4gIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IHZhbHVlID09PSAnJykge1xuICAgIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyByZXF1aXJlZCBlbnZpcm9ubWVudCB2YXJpYWJsZTogJHtDQVJEU19FTlZfVkFSUy5DQVJEX0lEfWApO1xuICB9XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuLyoqXG4gKiBSZWFkcyB0aGUgZW52aXJvbm1lbnQgbmFtZSBmcm9tIHRoZSBlbnZpcm9ubWVudC5cbiAqXG4gKiBUaGlzIHZhbHVlIG1hdGNoZXMgdGhlIGVudmlyb25tZW50IGtleSBpbiBzZXR0aW5ncy5qc29uIChlLmcuLCBcImRlZmF1bHRcIiwgXCJzdGFnaW5nXCIpLlxuICogQHJldHVybnMgVGhlIGVudmlyb25tZW50IG5hbWVcbiAqIEB0aHJvd3MgRXJyb3IgaWYgRU5WSVJPTk1FTlQgaXMgbWlzc2luZyBvciBlbXB0eVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGNvbnN0IGVudmlyb25tZW50ID0gZ2V0RW52aXJvbm1lbnQoKTtcbiAqIGNvbnNvbGUubG9nKGBFbnZpcm9ubWVudDogJHtlbnZpcm9ubWVudH1gKTtcbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0RW52aXJvbm1lbnQoKTogc3RyaW5nIHtcbiAgY29uc3QgdmFsdWUgPSBwcm9jZXNzLmVudltDQVJEU19FTlZfVkFSUy5FTlZJUk9OTUVOVF07XG4gIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IHZhbHVlID09PSAnJykge1xuICAgIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyByZXF1aXJlZCBlbnZpcm9ubWVudCB2YXJpYWJsZTogJHtDQVJEU19FTlZfVkFSUy5FTlZJUk9OTUVOVH1gKTtcbiAgfVxuICByZXR1cm4gdmFsdWU7XG59XG5cbi8qKlxuICogUmVhZHMgdGhlIGFjdGlvbiBidXR0b24gbmFtZSBmcm9tIHRoZSBlbnZpcm9ubWVudC5cbiAqXG4gKiBUaGlzIGlzIHRoZSBkaXNwbGF5IG5hbWUgb2YgdGhlIGFjdGlvbiB0aGF0IHRyaWdnZXJlZCB0aGUgaGFuZGxlciwgbWF0Y2hpbmdcbiAqIHRoZSBgYWN0aW9uTmFtZWAgZmllbGQgZnJvbSBgZGVmaW5lQWN0aW9uYC5cbiAqIEByZXR1cm5zIERpc3BsYXkgbmFtZSBvZiB0aGUgYWN0aW9uIHRoYXQgdHJpZ2dlcmVkIHRoZSBjdXJyZW50IGhhbmRsZXIgcnVuLlxuICogQHRocm93cyBFcnJvciBpZiBBQ1RJT05fTkFNRSBpcyBtaXNzaW5nIG9yIGVtcHR5XG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogY29uc3QgYWN0aW9uTmFtZSA9IGdldEFjdGlvbk5hbWUoKTtcbiAqIGNvbnNvbGUubG9nKGBSdW5uaW5nIGFjdGlvbjogJHthY3Rpb25OYW1lfWApO1xuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRBY3Rpb25OYW1lKCk6IHN0cmluZyB7XG4gIGNvbnN0IHZhbHVlID0gcHJvY2Vzcy5lbnZbQ0FSRFNfRU5WX1ZBUlMuQUNUSU9OX05BTUVdO1xuICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gJycpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYE1pc3NpbmcgcmVxdWlyZWQgZW52aXJvbm1lbnQgdmFyaWFibGU6ICR7Q0FSRFNfRU5WX1ZBUlMuQUNUSU9OX05BTUV9YCk7XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG4vKipcbiAqIFJlYWRzIHRoZSBleGVjdXRpb24gbW9kZSBmcm9tIHRoZSBlbnZpcm9ubWVudC5cbiAqXG4gKiBEZXRlcm1pbmVzIHRoZSBVSSBpbnRlcmFjdGlvbiBtb2RlbCBmb3IgYWN0aW9ucy5cbiAqIEByZXR1cm5zIFRoZSBleGVjdXRpb24gbW9kZSAoJ2ludGVyYWN0aXZlJyBvciAnYmFja2dyb3VuZCcpXG4gKiBAdGhyb3dzIEVycm9yIGlmIEVYRUNVVElPTl9NT0RFIGlzIG1pc3NpbmcsIGVtcHR5LCBvciBpbnZhbGlkXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogY29uc3QgbW9kZSA9IGdldEV4ZWN1dGlvbk1vZGUoKTtcbiAqIGlmIChtb2RlID09PSAnaW50ZXJhY3RpdmUnKSB7XG4gKiAgIC8vIFNob3cgdXNlciBwcm9tcHRzXG4gKiB9XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldEV4ZWN1dGlvbk1vZGUoKTogJ2ludGVyYWN0aXZlJyB8ICdiYWNrZ3JvdW5kJyB7XG4gIGNvbnN0IHZhbHVlID0gcHJvY2Vzcy5lbnZbQ0FSRFNfRU5WX1ZBUlMuRVhFQ1VUSU9OX01PREVdO1xuICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gJycpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYE1pc3NpbmcgcmVxdWlyZWQgZW52aXJvbm1lbnQgdmFyaWFibGU6ICR7Q0FSRFNfRU5WX1ZBUlMuRVhFQ1VUSU9OX01PREV9YCk7XG4gIH1cbiAgaWYgKHZhbHVlICE9PSAnaW50ZXJhY3RpdmUnICYmIHZhbHVlICE9PSAnYmFja2dyb3VuZCcpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYEludmFsaWQgJHtDQVJEU19FTlZfVkFSUy5FWEVDVVRJT05fTU9ERX06IGV4cGVjdGVkICdpbnRlcmFjdGl2ZScgb3IgJ2JhY2tncm91bmQnLCBnb3QgXCIke3ZhbHVlfVwiYCk7XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG4vKipcbiAqIFJlYWRzIHRoZSBBUEkgYmFzZSBVUkwgZnJvbSB0aGUgZW52aXJvbm1lbnQuXG4gKlxuICogVXNlIHRoaXMgYXMgdGhlIGJhc2UgZm9yIGNvbnN0cnVjdGluZyBBUEkgZW5kcG9pbnRzLiBUaGUgVVJMIGRvZXMgbm90IGluY2x1ZGVcbiAqIGEgdHJhaWxpbmcgc2xhc2guXG4gKiBAcmV0dXJucyBCYXNlIFVSTCB1c2VkIHRvIGNvbnN0cnVjdCBDYXJkcyBBUEkgZW5kcG9pbnRzIGZvciB0aGlzIGV4ZWN1dGlvbi5cbiAqIEB0aHJvd3MgRXJyb3IgaWYgQVBJX0JBU0VfVVJMIGlzIG1pc3Npbmcgb3IgZW1wdHlcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBjb25zdCBhcGlVcmwgPSBnZXRBcGlCYXNlVXJsKCk7XG4gKiBjb25zdCBlbmRwb2ludCA9IGAke2FwaVVybH0vY2FyZHMvJHtjYXJkSWR9YDtcbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0QXBpQmFzZVVybCgpOiBzdHJpbmcge1xuICBjb25zdCB2YWx1ZSA9IHByb2Nlc3MuZW52W0NBUkRTX0VOVl9WQVJTLkFQSV9CQVNFX1VSTF07XG4gIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IHZhbHVlID09PSAnJykge1xuICAgIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyByZXF1aXJlZCBlbnZpcm9ubWVudCB2YXJpYWJsZTogJHtDQVJEU19FTlZfVkFSUy5BUElfQkFTRV9VUkx9YCk7XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG4vKipcbiAqIFJlYWRzIHRoZSBBUEkgYWNjZXNzIHRva2VuIGZyb20gdGhlIGVudmlyb25tZW50LlxuICpcbiAqIEJlYXJlciB0b2tlbiB2YWxpZCBmb3IgdGhlIGR1cmF0aW9uIG9mIHRoaXMgYWN0aW9uIG9yIHR5cGUgaG9vayBleGVjdXRpb24uXG4gKiBJbmNsdWRlIGluIEF1dGhvcml6YXRpb24gaGVhZGVycyB3aGVuIGNhbGxpbmcgdGhlIENhcmRzIEFQSS5cbiAqIEByZXR1cm5zIEJlYXJlciB0b2tlbiB0aGF0IGF1dGhvcml6ZXMgQVBJIHJlcXVlc3RzIGZvciB0aGlzIGV4ZWN1dGlvbiBjb250ZXh0LlxuICogQHRocm93cyBFcnJvciBpZiBBUElfQUNDRVNTX1RPS0VOIGlzIG1pc3Npbmcgb3IgZW1wdHlcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBjb25zdCB0b2tlbiA9IGdldEFwaUFjY2Vzc1Rva2VuKCk7XG4gKiBjb25zdCByZXNwb25zZSA9IGF3YWl0IGZldGNoKGFwaVVybCwge1xuICogICBoZWFkZXJzOiB7IEF1dGhvcml6YXRpb246IGBCZWFyZXIgJHt0b2tlbn1gIH1cbiAqIH0pO1xuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRBcGlBY2Nlc3NUb2tlbigpOiBzdHJpbmcge1xuICBjb25zdCB2YWx1ZSA9IHByb2Nlc3MuZW52W0NBUkRTX0VOVl9WQVJTLkFQSV9BQ0NFU1NfVE9LRU5dO1xuICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gJycpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYE1pc3NpbmcgcmVxdWlyZWQgZW52aXJvbm1lbnQgdmFyaWFibGU6ICR7Q0FSRFNfRU5WX1ZBUlMuQVBJX0FDQ0VTU19UT0tFTn1gKTtcbiAgfVxuICByZXR1cm4gdmFsdWU7XG59XG5cbi8qKlxuICogUmVhZHMgdGhlIGNvbmZpZ3VyZWQgY29kaW5nIGFnZW50IGlkZW50aWZpZXIgZnJvbSB0aGUgZW52aXJvbm1lbnQuXG4gKlxuICogT3B0aW9uYWwgdmFsdWUgZnJvbSBjYXJkcy5jb2RpbmdBZ2VudCBzZXR0aW5nLiBXaGVuIHNldCwgaW5kaWNhdGVzIHdoaWNoIEFJXG4gKiBjb2RpbmcgYXNzaXN0YW50IHRoZSB1c2VyIHByZWZlcnMuIEFjdGlvbnMgY2FuIHVzZSB0aGlzIHRvIGN1c3RvbWl6ZSBiZWhhdmlvclxuICogb3IgcHJvbXB0cyBmb3IgZGlmZmVyZW50IGFnZW50cy5cbiAqIEByZXR1cm5zIFRoZSBjb2RpbmcgYWdlbnQgaWRlbnRpZmllciwgb3IgdW5kZWZpbmVkIGlmIG5vdCBzZXRcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBjb25zdCBjb2RpbmdBZ2VudCA9IGdldENvZGluZ0FnZW50KCk7XG4gKiBpZiAoY29kaW5nQWdlbnQgPT09ICdjbGF1ZGUnKSB7XG4gKiAgIC8vIEN1c3RvbWl6ZSBmb3IgQ2xhdWRlXG4gKiB9XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldENvZGluZ0FnZW50KCk6IHN0cmluZyB8IHVuZGVmaW5lZCB7XG4gIGNvbnN0IHZhbHVlID0gcHJvY2Vzcy5lbnZbQ0FSRFNfRU5WX1ZBUlMuQ09ESU5HX0FHRU5UXTtcbiAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQgfHwgdmFsdWUgPT09ICcnKSB7XG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfVxuICByZXR1cm4gdmFsdWU7XG59XG5cbi8qKlxuICogUmVhZHMgdGhlIHJlZ2lzdGVyZWQgdHlwZSBuYW1lIGZvciB0eXBlIGhvb2tzLlxuICpcbiAqIFRoaXMgdmFsdWUgaXMgb25seSBwcmVzZW50IGZvciB0eXBlIGhvb2sgZXZlbnRzLlxuICogQHJldHVybnMgVGhlIHJlZ2lzdGVyZWQgdHlwZSBuYW1lXG4gKiBAdGhyb3dzIEVycm9yIGlmIFRZUEVfTkFNRSBpcyBtaXNzaW5nIG9yIGVtcHR5XG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogY29uc3QgdHlwZU5hbWUgPSBnZXRUeXBlTmFtZSgpO1xuICogY29uc29sZS5sb2coYFR5cGU6ICR7dHlwZU5hbWV9YCk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldFR5cGVOYW1lKCk6IHN0cmluZyB7XG4gIGNvbnN0IHZhbHVlID0gcHJvY2Vzcy5lbnZbQ0FSRFNfRU5WX1ZBUlMuVFlQRV9OQU1FXTtcbiAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQgfHwgdmFsdWUgPT09ICcnKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIHJlcXVpcmVkIGVudmlyb25tZW50IHZhcmlhYmxlOiAke0NBUkRTX0VOVl9WQVJTLlRZUEVfTkFNRX1gKTtcbiAgfVxuICByZXR1cm4gdmFsdWU7XG59XG5cbi8qKlxuICogUmVhZHMgdGhlIHR5cGUgdmVyc2lvbiBmcm9tIHRoZSBlbnZpcm9ubWVudC5cbiAqXG4gKiBUaGlzIHZlcnNpb24gY29tZXMgZnJvbSB0aGUgdHlwZSBjb25maWd1cmF0aW9uIGluIHNldHRpbmdzLmpzb24uXG4gKiBAcmV0dXJucyBUaGUgdmVyc2lvbiBzdHJpbmcgZnJvbSB0eXBlIGNvbmZpZ1xuICogQHRocm93cyBFcnJvciBpZiBUWVBFX1ZFUlNJT04gaXMgbWlzc2luZyBvciBlbXB0eVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGNvbnN0IHZlcnNpb24gPSBnZXRUeXBlVmVyc2lvbigpO1xuICogY29uc29sZS5sb2coYFZlcnNpb246ICR7dmVyc2lvbn1gKTtcbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0VHlwZVZlcnNpb24oKTogc3RyaW5nIHtcbiAgY29uc3QgdmFsdWUgPSBwcm9jZXNzLmVudltDQVJEU19FTlZfVkFSUy5UWVBFX1ZFUlNJT05dO1xuICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gJycpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYE1pc3NpbmcgcmVxdWlyZWQgZW52aXJvbm1lbnQgdmFyaWFibGU6ICR7Q0FSRFNfRU5WX1ZBUlMuVFlQRV9WRVJTSU9OfWApO1xuICB9XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuLyoqXG4gKiBSZWFkcyB0aGUgdHlwZWQgZmlsZSBuYW1lIGZvciB0eXBlIGhvb2sgZXZlbnRzLlxuICpcbiAqIFRoaXMgaXMgdGhlIGZpbGUgbmFtZSByZWxhdGl2ZSB0byB0aGUgdHlwZSBkaXJlY3RvcnksIG5vdCBhIGZ1bGwgcGF0aC5cbiAqIEByZXR1cm5zIFRoZSBmaWxlIG5hbWUgd2l0aGluIHRoZSB0eXBlIGRpcmVjdG9yeVxuICogQHRocm93cyBFcnJvciBpZiBGSUxFX05BTUUgaXMgbWlzc2luZyBvciBlbXB0eVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGNvbnN0IGZpbGVOYW1lID0gZ2V0RmlsZU5hbWUoKTtcbiAqIGNvbnNvbGUubG9nKGBGaWxlOiAke2ZpbGVOYW1lfWApO1xuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRGaWxlTmFtZSgpOiBzdHJpbmcge1xuICBjb25zdCB2YWx1ZSA9IHByb2Nlc3MuZW52W0NBUkRTX0VOVl9WQVJTLkZJTEVfTkFNRV07XG4gIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IHZhbHVlID09PSAnJykge1xuICAgIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyByZXF1aXJlZCBlbnZpcm9ubWVudCB2YXJpYWJsZTogJHtDQVJEU19FTlZfVkFSUy5GSUxFX05BTUV9YCk7XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG4vKipcbiAqIFJlYWRzIHRoZSBhYnNvbHV0ZSBwYXRoIHRvIHRoZSB0eXBlZCBmaWxlLlxuICpcbiAqIFRoaXMgaXMgdGhlIGZ1bGx5IHJlc29sdmVkIHBhdGggb24gZGlzayBwcm92aWRlZCBieSB0aGUgZXhlY3V0aW9uIHdyYXBwZXIuXG4gKiBAcmV0dXJucyBUaGUgZnVsbCBwYXRoIHRvIHRoZSBmaWxlXG4gKiBAdGhyb3dzIEVycm9yIGlmIEZJTEVfUEFUSCBpcyBtaXNzaW5nIG9yIGVtcHR5XG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogY29uc3QgZmlsZVBhdGggPSBnZXRGaWxlUGF0aCgpO1xuICogY29uc29sZS5sb2coYFBhdGg6ICR7ZmlsZVBhdGh9YCk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldEZpbGVQYXRoKCk6IHN0cmluZyB7XG4gIGNvbnN0IHZhbHVlID0gcHJvY2Vzcy5lbnZbQ0FSRFNfRU5WX1ZBUlMuRklMRV9QQVRIXTtcbiAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQgfHwgdmFsdWUgPT09ICcnKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIHJlcXVpcmVkIGVudmlyb25tZW50IHZhcmlhYmxlOiAke0NBUkRTX0VOVl9WQVJTLkZJTEVfUEFUSH1gKTtcbiAgfVxuICByZXR1cm4gdmFsdWU7XG59XG5cbi8qKlxuICogUmVhZHMgdGhlIHR5cGVkIGZpbGUgc2l6ZSBmcm9tIHRoZSBlbnZpcm9ubWVudC5cbiAqXG4gKiBUaGUgdmFsdWUgaXMgcGFyc2VkIGFzIGEgYmFzZS0xMCBpbnRlZ2VyLlxuICogQHJldHVybnMgVGhlIGZpbGUgc2l6ZSBpbiBieXRlc1xuICogQHRocm93cyBFcnJvciBpZiBGSUxFX1NJWkUgaXMgbWlzc2luZyBvciBub3QgYSBudW1iZXJcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBjb25zdCBzaXplID0gZ2V0RmlsZVNpemUoKTtcbiAqIGNvbnNvbGUubG9nKGBTaXplOiAke3NpemV9IGJ5dGVzYCk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldEZpbGVTaXplKCk6IG51bWJlciB7XG4gIGNvbnN0IHZhbHVlID0gcHJvY2Vzcy5lbnZbQ0FSRFNfRU5WX1ZBUlMuRklMRV9TSVpFXTtcbiAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQgfHwgdmFsdWUgPT09ICcnKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIHJlcXVpcmVkIGVudmlyb25tZW50IHZhcmlhYmxlOiAke0NBUkRTX0VOVl9WQVJTLkZJTEVfU0laRX1gKTtcbiAgfVxuICBjb25zdCBzaXplID0gTnVtYmVyLnBhcnNlSW50KHZhbHVlLCAxMCk7XG4gIGlmIChOdW1iZXIuaXNOYU4oc2l6ZSkpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYEludmFsaWQgJHtDQVJEU19FTlZfVkFSUy5GSUxFX1NJWkV9OiBleHBlY3RlZCBudW1iZXIsIGdvdCBcIiR7dmFsdWV9XCJgKTtcbiAgfVxuICByZXR1cm4gc2l6ZTtcbn1cblxuLyoqXG4gKiBSZWFkcyB0aGUgU0hBMjU2IGhhc2ggZm9yIHRoZSB0eXBlZCBmaWxlIGNvbnRlbnQuXG4gKlxuICogVXNlZnVsIGZvciBkZXRlY3RpbmcgY29udGVudCBjaGFuZ2VzIHdpdGhvdXQgcmVhZGluZyB0aGUgZmlsZSBhZ2Fpbi5cbiAqIEByZXR1cm5zIFRoZSBTSEEyNTYgaGFzaCBvZiB0aGUgY29udGVudFxuICogQHRocm93cyBFcnJvciBpZiBTSEEyNTYgaXMgbWlzc2luZyBvciBlbXB0eVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGNvbnN0IGhhc2ggPSBnZXRTaGEyNTYoKTtcbiAqIGNvbnNvbGUubG9nKGBIYXNoOiAke2hhc2h9YCk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldFNoYTI1NigpOiBzdHJpbmcge1xuICBjb25zdCB2YWx1ZSA9IHByb2Nlc3MuZW52W0NBUkRTX0VOVl9WQVJTLlNIQTI1Nl07XG4gIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IHZhbHVlID09PSAnJykge1xuICAgIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyByZXF1aXJlZCBlbnZpcm9ubWVudCB2YXJpYWJsZTogJHtDQVJEU19FTlZfVkFSUy5TSEEyNTZ9YCk7XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG4vKipcbiAqIFJlYWRzIHRoZSBNSU1FIHR5cGUgZm9yIHRoZSB0eXBlZCBmaWxlIGNvbnRlbnQuXG4gKlxuICogUHJvdmlkZWQgZm9yIHR5cGUgaG9vayBldmVudHMgc28gdmFsaWRhdG9ycyBjYW4gYnJhbmNoIG9uIGNvbnRlbnQgdHlwZS5cbiAqIEByZXR1cm5zIFRoZSBNSU1FIHR5cGUgb2YgdGhlIGNvbnRlbnRcbiAqIEB0aHJvd3MgRXJyb3IgaWYgQ09OVEVOVF9UWVBFIGlzIG1pc3Npbmcgb3IgZW1wdHlcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBjb25zdCBjb250ZW50VHlwZSA9IGdldENvbnRlbnRUeXBlKCk7XG4gKiBjb25zb2xlLmxvZyhgQ29udGVudCB0eXBlOiAke2NvbnRlbnRUeXBlfWApO1xuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRDb250ZW50VHlwZSgpOiBzdHJpbmcge1xuICBjb25zdCB2YWx1ZSA9IHByb2Nlc3MuZW52W0NBUkRTX0VOVl9WQVJTLkNPTlRFTlRfVFlQRV07XG4gIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IHZhbHVlID09PSAnJykge1xuICAgIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyByZXF1aXJlZCBlbnZpcm9ubWVudCB2YXJpYWJsZTogJHtDQVJEU19FTlZfVkFSUy5DT05URU5UX1RZUEV9YCk7XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG4vKipcbiAqIFJlYWRzIHRoZSBWUyBDb2RlIGJ1bmRsZWQgTm9kZS5qcyBpbnRlcnByZXRlciBwYXRoIGZyb20gdGhlIGVudmlyb25tZW50LlxuICpcbiAqIFRoaXMgaXMgc2V0IGJ5IHRoZSBleHRlbnNpb24gZHVyaW5nIGFjdGl2YXRpb24gYW5kIGluamVjdGVkIGludG8gYWxsXG4gKiBzcGF3bmVkIGFjdGlvbi9ob29rIHByb2Nlc3Nlcy4gQ29uZmlndXJhdGlvbiBhdXRob3JzIGNhbiB1c2UgaXQgdG8gaW52b2tlXG4gKiBOb2RlLmpzIHdpdGhvdXQgcmVseWluZyBvbiB0aGUgc3lzdGVtIFBBVEguXG4gKlxuICogQHJldHVybnMgVGhlIHBhdGggdG8gdGhlIE5vZGUuanMgaW50ZXJwcmV0ZXJcbiAqIEB0aHJvd3MgRXJyb3IgaWYgVlNDT0RFX05PREUgaXMgbWlzc2luZyBvciBlbXB0eVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGNvbnN0IG5vZGVQYXRoID0gZ2V0VnNjb2RlTm9kZVBhdGgoKTtcbiAqIGV4ZWNGaWxlU3luYyhub2RlUGF0aCwgWydzY3JpcHQuanMnXSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldFZzY29kZU5vZGVQYXRoKCk6IHN0cmluZyB7XG4gIGNvbnN0IHZhbHVlID0gcHJvY2Vzcy5lbnZbQ0FSRFNfRU5WX1ZBUlMuVlNDT0RFX05PREVdO1xuICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gJycpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYE1pc3NpbmcgcmVxdWlyZWQgZW52aXJvbm1lbnQgdmFyaWFibGU6ICR7Q0FSRFNfRU5WX1ZBUlMuVlNDT0RFX05PREV9YCk7XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG4vKipcbiAqIFJlYWRzIHRoZSBVbml4IGRvbWFpbiBzb2NrZXQgcGF0aCBmb3IgcnVudGltZS10by1kaXNwYXRjaGVyIGNvbW11bmljYXRpb24uXG4gKlxuICogQHJldHVybnMgVW5peCBzb2NrZXQgcGF0aCB1c2VkIHRvIHNlbmQgcnVudGltZSBjb250cm9sIG1lc3NhZ2VzLlxuICogQHRocm93cyBFcnJvciBpZiBTT0NLRVRfUEFUSCBpcyBtaXNzaW5nIG9yIGVtcHR5XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRTb2NrZXRQYXRoKCk6IHN0cmluZyB7XG4gIGNvbnN0IHZhbHVlID0gcHJvY2Vzcy5lbnZbQ0FSRFNfRU5WX1ZBUlMuU09DS0VUX1BBVEhdO1xuICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gJycpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYE1pc3NpbmcgcmVxdWlyZWQgZW52aXJvbm1lbnQgdmFyaWFibGU6ICR7Q0FSRFNfRU5WX1ZBUlMuU09DS0VUX1BBVEh9YCk7XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG4vKipcbiAqIFJlYWRzIHRoZSBwYXRoIHRvIHRoZSBzd2l0Y2hUb0ludGVyYWN0aXZlIGRhdGEgZmlsZS5cbiAqXG4gKiBUaGlzIGlzIG9wdGlvbmFsIFx1MjAxNCByZXR1cm5zIHVuZGVmaW5lZCB3aGVuIG5vdCBzZXQgKGkuZS4sIHRoZSBhY3Rpb25cbiAqIHdhcyBub3QgcmVsYXVuY2hlZCB2aWEgc3dpdGNoVG9JbnRlcmFjdGl2ZSkuXG4gKlxuICogQHJldHVybnMgVGhlIGZpbGUgcGF0aCwgb3IgdW5kZWZpbmVkIGlmIG5vdCBzZXRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldFN3aXRjaFRvSW50ZXJhY3RpdmVEYXRhUGF0aCgpOiBzdHJpbmcgfCB1bmRlZmluZWQge1xuICBjb25zdCB2YWx1ZSA9IHByb2Nlc3MuZW52W0NBUkRTX0VOVl9WQVJTLlNXSVRDSF9UT19JTlRFUkFDVElWRV9EQVRBX1BBVEhdO1xuICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gJycpIHtcbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuLyoqXG4gKiBSZWFkcyB0aGUgc2V0dGluZ3MgY29uZmlndXJhdGlvbiBkaXJlY3RvcnkgcGF0aC5cbiAqXG4gKiBAcmV0dXJucyBBYnNvbHV0ZSBwYXRoIHRvIHRoZSBkaXJlY3RvcnkgY29udGFpbmluZyBnZW5lcmF0ZWQgc2V0dGluZ3MgYXJ0aWZhY3RzLlxuICogQHRocm93cyBFcnJvciBpZiBDT05GSUdfUEFUSCBpcyBtaXNzaW5nIG9yIGVtcHR5XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRDb25maWdQYXRoKCk6IHN0cmluZyB7XG4gIGNvbnN0IHZhbHVlID0gcHJvY2Vzcy5lbnZbQ0FSRFNfRU5WX1ZBUlMuQ09ORklHX1BBVEhdO1xuICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gJycpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYE1pc3NpbmcgcmVxdWlyZWQgZW52aXJvbm1lbnQgdmFyaWFibGU6ICR7Q0FSRFNfRU5WX1ZBUlMuQ09ORklHX1BBVEh9YCk7XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG4vKipcbiAqIFJlYWRzIHRoZSB3b3Jrc3BhY2UgcGF0aCBzZXQgYnkgdGhlIGFjdGlvbiBoYW5kbGVyIChlLmcuLCB0aGUgd29ya3RyZWUgcGF0aCkuXG4gKlxuICogVGhpcyBpcyBmb3IgaG9va3MgcnVubmluZyBpbnNpZGUgdGhlIENsYXVkZSBDTEksICoqbm90KiogZm9yIGFjdGlvbiBoYW5kbGVycy5cbiAqIEFjdGlvbiBoYW5kbGVycyBzaG91bGQgdXNlIHtAbGluayBnZXRSZXBvUm9vdH0gaW5zdGVhZC5cbiAqXG4gKiBAcmV0dXJucyBBYnNvbHV0ZSBwYXRoIHRvIHRoZSBhY3RpdmUgd29ya3NwYWNlIC8gd29ya3RyZWUuXG4gKiBAdGhyb3dzIEVycm9yIGlmIFdPUktTUEFDRV9QQVRIIGlzIG1pc3Npbmcgb3IgZW1wdHlcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldFdvcmtzcGFjZVBhdGgoKTogc3RyaW5nIHtcbiAgY29uc3QgdmFsdWUgPSBwcm9jZXNzLmVudltDQVJEU19FTlZfVkFSUy5XT1JLU1BBQ0VfUEFUSF07XG4gIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IHZhbHVlID09PSAnJykge1xuICAgIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyByZXF1aXJlZCBlbnZpcm9ubWVudCB2YXJpYWJsZTogJHtDQVJEU19FTlZfVkFSUy5XT1JLU1BBQ0VfUEFUSH1gKTtcbiAgfVxuICByZXR1cm4gdmFsdWU7XG59XG5cbi8qKlxuICogUmVhZHMgdGhlIG1haW4gZ2l0IHJlcG9zaXRvcnkgcm9vdCBwYXRoLlxuICpcbiAqIFNldCBieSBBY3Rpb25EaXNwYXRjaGVyOyB1c2VkIGJ5IGFjdGlvbiBoYW5kbGVycyB0byByZXNvbHZlIHdvcmt0cmVlc1xuICogYW5kIHBlcmZvcm0gZ2l0IG9wZXJhdGlvbnMgYWdhaW5zdCB0aGUgbWFpbiByZXBvc2l0b3J5LlxuICpcbiAqIEByZXR1cm5zIEFic29sdXRlIHBhdGggdG8gdGhlIG1haW4gZ2l0IHJlcG9zaXRvcnkgcm9vdCAoTk9UIGEgd29ya3RyZWUpLlxuICogQHRocm93cyBFcnJvciBpZiBSRVBPX1JPT1QgaXMgbWlzc2luZyBvciBlbXB0eVxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0UmVwb1Jvb3QoKTogc3RyaW5nIHtcbiAgY29uc3QgdmFsdWUgPSBwcm9jZXNzLmVudltDQVJEU19FTlZfVkFSUy5SRVBPX1JPT1RdO1xuICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gJycpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYE1pc3NpbmcgcmVxdWlyZWQgZW52aXJvbm1lbnQgdmFyaWFibGU6ICR7Q0FSRFNfRU5WX1ZBUlMuUkVQT19ST09UfWApO1xuICB9XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuLyoqXG4gKiBSZWFkcyB0aGUgY2FyZCdzIHJlcG9zaXRvcnkgZGlyZWN0b3J5IHBhdGguXG4gKlxuICogQHJldHVybnMgQWJzb2x1dGUgcGF0aCB0byB0aGUgcmVwb3NpdG9yeSBhc3NvY2lhdGVkIHdpdGggdGhlIGFjdGl2ZSBjYXJkLlxuICogQHRocm93cyBFcnJvciBpZiBDQVJEX1JFUE9fUEFUSCBpcyBtaXNzaW5nIG9yIGVtcHR5XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRDYXJkUmVwb1BhdGgoKTogc3RyaW5nIHtcbiAgY29uc3QgdmFsdWUgPSBwcm9jZXNzLmVudltDQVJEU19FTlZfVkFSUy5DQVJEX1JFUE9fUEFUSF07XG4gIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IHZhbHVlID09PSAnJykge1xuICAgIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyByZXF1aXJlZCBlbnZpcm9ubWVudCB2YXJpYWJsZTogJHtDQVJEU19FTlZfVkFSUy5DQVJEX1JFUE9fUEFUSH1gKTtcbiAgfVxuICByZXR1cm4gdmFsdWU7XG59XG5cbi8qKlxuICogUmVhZHMgdGhlIFZTIENvZGUgZXh0ZW5zaW9uIGluc3RhbGxhdGlvbiBkaXJlY3RvcnkgcGF0aC5cbiAqXG4gKiBTZXQgYnkgdGhlIGV4dGVuc2lvbiBob3N0IGZyb20gYGNvbnRleHQuZXh0ZW5zaW9uVXJpLmZzUGF0aGAgYW5kIGluamVjdGVkXG4gKiBpbnRvIGFsbCBzcGF3bmVkIGFjdGlvbiBwcm9jZXNzZXMuIFVzZSB0aGlzIHRvIGxvY2F0ZSBidW5kbGVkIGFzc2V0cyBzdWNoXG4gKiBhcyB0aGUgcnVudGltZSBwbHVnaW4gZGlyZWN0b3J5IChgPGV4dGVuc2lvblBhdGg+L2Rpc3QvcGx1Z2lucy9ydW50aW1lYCkuXG4gKlxuICogQHJldHVybnMgQWJzb2x1dGUgcGF0aCB0byB0aGUgZXh0ZW5zaW9uIGluc3RhbGxhdGlvbiBkaXJlY3RvcnkuXG4gKiBAdGhyb3dzIEVycm9yIGlmIEVYVEVOU0lPTl9QQVRIIGlzIG1pc3Npbmcgb3IgZW1wdHlcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldEV4dGVuc2lvblBhdGgoKTogc3RyaW5nIHtcbiAgY29uc3QgdmFsdWUgPSBwcm9jZXNzLmVudltDQVJEU19FTlZfVkFSUy5FWFRFTlNJT05fUEFUSF07XG4gIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IHZhbHVlID09PSAnJykge1xuICAgIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyByZXF1aXJlZCBlbnZpcm9ubWVudCB2YXJpYWJsZTogJHtDQVJEU19FTlZfVkFSUy5FWFRFTlNJT05fUEFUSH1gKTtcbiAgfVxuICByZXR1cm4gdmFsdWU7XG59XG5cbi8qKlxuICogUmVhZHMgYW5kIHBhcnNlcyB0aGUgc3dpdGNoVG9JbnRlcmFjdGl2ZSBkYXRhIGZpbGUuXG4gKlxuICogV2hlbiBgU1dJVENIX1RPX0lOVEVSQUNUSVZFX0RBVEFfUEFUSGAgaXMgc2V0LCByZWFkcyB0aGUgZmlsZSBhdCB0aGF0IHBhdGhcbiAqIGFuZCBwYXJzZXMgaXQgYXMgSlNPTi4gUmV0dXJucyB1bmRlZmluZWQgaWYgdGhlIGVudiB2YXIgaXMgbm90IHNldC5cbiAqXG4gKiBAcmV0dXJucyBUaGUgcGFyc2VkIGRhdGEsIG9yIHVuZGVmaW5lZCBpZiB0aGUgcGF0aCBpcyBub3Qgc2V0XG4gKiBAdGhyb3dzIEVycm9yIGlmIHRoZSBmaWxlIGNhbm5vdCBiZSByZWFkIG9yIGNvbnRhaW5zIGludmFsaWQgSlNPTlxuICovXG5leHBvcnQgZnVuY3Rpb24gcmVhZFN3aXRjaFRvSW50ZXJhY3RpdmVEYXRhKCk6IHVua25vd24gfCB1bmRlZmluZWQge1xuICBjb25zdCBkYXRhUGF0aCA9IGdldFN3aXRjaFRvSW50ZXJhY3RpdmVEYXRhUGF0aCgpO1xuICBpZiAoZGF0YVBhdGggPT09IHVuZGVmaW5lZCkge1xuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cbiAgY29uc3QgY29udGVudCA9IHJlYWRGaWxlU3luYyhkYXRhUGF0aCwgJ3V0Zi04Jyk7XG4gIHJldHVybiBKU09OLnBhcnNlKGNvbnRlbnQpO1xufVxuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBUeXBlZCBJbnB1dCBFeHRyYWN0aW9uXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbi8qKlxuICogQnVpbGRzIGEgdHlwZWQgYWN0aW9uIGlucHV0IG9iamVjdCBmcm9tIGVudmlyb25tZW50IHZhcmlhYmxlcy5cbiAqXG4gKiBFeHRyYWN0cyBhbGwgZmllbGRzIHJlcXVpcmVkIGZvciBhY3Rpb24gaGFuZGxlcnMuXG4gKlxuICogQHJldHVybnMgVHlwZWQgQWN0aW9uSW5wdXQgb2JqZWN0XG4gKiBAdGhyb3dzIEVycm9yIGlmIHJlcXVpcmVkIGVudiB2YXJzIGFyZSBtaXNzaW5nIG9yIGludmFsaWRcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiAvLyBGb3IgYW4gYWN0aW9uIGhhbmRsZXJcbiAqIGNvbnN0IGlucHV0ID0gZXh0cmFjdEFjdGlvbklucHV0KCk7XG4gKiBjb25zb2xlLmxvZyhpbnB1dC5jYXJkSWQpO1xuICogY29uc29sZS5sb2coaW5wdXQuZXhlY3V0aW9uTW9kZSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGV4dHJhY3RBY3Rpb25JbnB1dCgpOiBBY3Rpb25JbnB1dCB7XG4gIHJldHVybiB7XG4gICAgY2FyZElkOiBnZXRDYXJkSWQoKSxcbiAgICBhY3Rpb25OYW1lOiBnZXRBY3Rpb25OYW1lKCksXG4gICAgZW52aXJvbm1lbnQ6IGdldEVudmlyb25tZW50KCksXG4gICAgZXhlY3V0aW9uTW9kZTogZ2V0RXhlY3V0aW9uTW9kZSgpLFxuICAgIGFwaUJhc2VVcmw6IGdldEFwaUJhc2VVcmwoKSxcbiAgICBhcGlBY2Nlc3NUb2tlbjogZ2V0QXBpQWNjZXNzVG9rZW4oKSxcbiAgICBjb2RpbmdBZ2VudDogZ2V0Q29kaW5nQWdlbnQoKSxcbiAgICBzd2l0Y2hUb0ludGVyYWN0aXZlRGF0YTogcmVhZFN3aXRjaFRvSW50ZXJhY3RpdmVEYXRhKCksXG4gICAgcmVwb1Jvb3Q6IGdldFJlcG9Sb290KCksXG4gICAgY2FyZFJlcG9QYXRoOiBnZXRDYXJkUmVwb1BhdGgoKSxcbiAgICBjb25maWdQYXRoOiBnZXRDb25maWdQYXRoKCksXG4gICAgZXh0ZW5zaW9uUGF0aDogZ2V0RXh0ZW5zaW9uUGF0aCgpXG4gIH07XG59XG5cbi8qKlxuICogQnVpbGRzIGEgdHlwZWQgdHlwZSBob29rIGlucHV0IG9iamVjdCBmcm9tIGVudmlyb25tZW50IHZhcmlhYmxlcy5cbiAqXG4gKiBFeHRyYWN0cyBhbGwgZmllbGRzIHJlcXVpcmVkIGZvciB0eXBlIGxpZmVjeWNsZSBob29rcyAodmFsaWRhdG9yLCBjcmVhdGUsXG4gKiB1cGRhdGUsIGRlbGV0ZSkuXG4gKlxuICogQHJldHVybnMgVHlwZWQgVHlwZUhvb2tJbnB1dCBvYmplY3RcbiAqIEB0aHJvd3MgRXJyb3IgaWYgcmVxdWlyZWQgZW52IHZhcnMgYXJlIG1pc3Npbmcgb3IgaW52YWxpZFxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIC8vIEZvciBhIHR5cGUgaG9vayBoYW5kbGVyXG4gKiBjb25zdCBpbnB1dCA9IGV4dHJhY3RUeXBlSW5wdXQoKTtcbiAqIGNvbnNvbGUubG9nKGlucHV0LnR5cGVOYW1lKTtcbiAqIGNvbnNvbGUubG9nKGlucHV0LmZpbGVOYW1lKTtcbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gZXh0cmFjdFR5cGVJbnB1dCgpOiBUeXBlSG9va0lucHV0IHtcbiAgcmV0dXJuIHtcbiAgICBjYXJkSWQ6IGdldENhcmRJZCgpLFxuICAgIGVudmlyb25tZW50OiBnZXRFbnZpcm9ubWVudCgpLFxuICAgIHR5cGVOYW1lOiBnZXRUeXBlTmFtZSgpLFxuICAgIHR5cGVWZXJzaW9uOiBnZXRUeXBlVmVyc2lvbigpLFxuICAgIGZpbGVOYW1lOiBnZXRGaWxlTmFtZSgpLFxuICAgIGZpbGVQYXRoOiBnZXRGaWxlUGF0aCgpLFxuICAgIGZpbGVTaXplOiBnZXRGaWxlU2l6ZSgpLFxuICAgIGZpbGVTaGEyNTY6IGdldFNoYTI1NigpLFxuICAgIGNvbnRlbnRUeXBlOiBnZXRDb250ZW50VHlwZSgpLFxuICAgIGFwaUJhc2VVcmw6IGdldEFwaUJhc2VVcmwoKSxcbiAgICBhcGlBY2Nlc3NUb2tlbjogZ2V0QXBpQWNjZXNzVG9rZW4oKVxuICB9O1xufVxuIiwgIi8qKlxuICogRXhpdCBjb2RlIGNvbnN0YW50cyBhbmQgaGVscGVycyBmb3IgQ2FyZHMgRXh0ZW5zaW9uIGhvb2tzLlxuICpcbiAqIENhcmRzIGhvb2tzIGNvbW11bmljYXRlIHN1Y2Nlc3MgYW5kIGZhaWx1cmUgdmlhIHByb2Nlc3MgZXhpdCBjb2RlcyBhbmRcbiAqIHN0ZGVyciBvdXRwdXQuIFRoaXMgbW9kdWxlIGNlbnRyYWxpemVzIHRob3NlIGNvbnZlbnRpb25zIHNvIHRoZSBydW50aW1lXG4gKiBhbmQgaG9va3Mgc3BlYWsgdGhlIHNhbWUgcHJvdG9jb2wuXG4gKlxuICogQHN1bW1hcnkgRXhpdCBjb2RlIGNvbnN0YW50cyBhbmQgaGVscGVycyBmb3IgQ2FyZHMgRXh0ZW5zaW9uIGhvb2tzXG4gKiBAbW9kdWxlXG4gKi9cblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gRXhpdCBDb2RlIENvbnN0YW50c1xuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4vKipcbiAqIEV4aXQgY29kZXMgdXNlZCBieSBDYXJkcyBob29rcy5cbiAqXG4gKiBUaGUgQ2FyZHMgcnVudGltZSBpbnRlcnByZXRzIGFueSBub24temVybyBleGl0IGNvZGUgYXMgZmFpbHVyZS5cbiAqL1xuZXhwb3J0IGNvbnN0IEVYSVRfQ09ERVMgPSB7XG4gIC8qKiBIYW5kbGVyIGNvbXBsZXRlZCBzdWNjZXNzZnVsbHkuICovXG4gIFNVQ0NFU1M6IDAsXG4gIC8qKiBIYW5kbGVyIHRocmV3IGFuIGVycm9yLiAqL1xuICBFUlJPUjogMSxcbiAgLyoqIEhhbmRsZXIgcHJvY2Vzc2VkIHN3aXRjaFRvSW50ZXJhY3RpdmUgYW5kIGlzIGV4aXRpbmcgZm9yIHJlbGF1bmNoLiAqL1xuICBTV0lUQ0hfVE9fSU5URVJBQ1RJVkU6IDQyXG59IGFzIGNvbnN0O1xuXG4vKipcbiAqIFVuaW9uIG9mIHZhbGlkIENhcmRzIGhvb2sgZXhpdCBjb2Rlcy5cbiAqL1xuZXhwb3J0IHR5cGUgRXhpdENvZGUgPSAodHlwZW9mIEVYSVRfQ09ERVMpW2tleW9mIHR5cGVvZiBFWElUX0NPREVTXTtcblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gRXJyb3IgT3V0cHV0IEhlbHBlcnNcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuLyoqXG4gKiBXcml0ZXMgYW4gZXJyb3IgbWVzc2FnZSB0byBzdGRlcnIgd2l0aCBhIHRyYWlsaW5nIG5ld2xpbmUuXG4gKlxuICogVXNlIHRoaXMgd2hlbiBhIGhvb2sgbmVlZHMgdG8gcmVwb3J0IGEgZmFpbHVyZSB3aXRob3V0IHBvbGx1dGluZyBzdGRvdXQuXG4gKiBAcGFyYW0gbWVzc2FnZSAtIEVycm9yIG1lc3NhZ2UgdG8gd3JpdGVcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiB3cml0ZUVycm9yKCdGYWlsZWQgdG8gY29ubmVjdCB0byBkYXRhYmFzZScpO1xuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB3cml0ZUVycm9yKG1lc3NhZ2U6IHN0cmluZyk6IHZvaWQge1xuICBwcm9jZXNzLnN0ZGVyci53cml0ZShgJHttZXNzYWdlfVxcbmApO1xufVxuXG4vKipcbiAqIFdyaXRlcyBhbiBlcnJvciBtZXNzYWdlIHRvIHN0ZGVyciBhbmQgZXhpdHMgd2l0aCBFUlJPUiBjb2RlLlxuICpcbiAqIFRoaXMgdGVybWluYXRlcyB0aGUgcHJvY2VzcyBpbW1lZGlhdGVseSwgc28gYW55IHBlbmRpbmcgYXN5bmMgd29yayB3aWxsXG4gKiBub3QgZmluaXNoIHVubGVzcyBpdCB3YXMgYWxyZWFkeSBhd2FpdGVkLlxuICogQHBhcmFtIG1lc3NhZ2UgLSBFcnJvciBtZXNzYWdlIHRvIHdyaXRlIGJlZm9yZSBleGl0aW5nXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogaWYgKCFpc1ZhbGlkKSB7XG4gKiAgIGV4aXRXaXRoRXJyb3IoJ0ludmFsaWQgY29uZmlndXJhdGlvbicpO1xuICogfVxuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBleGl0V2l0aEVycm9yKG1lc3NhZ2U6IHN0cmluZyk6IG5ldmVyIHtcbiAgd3JpdGVFcnJvcihtZXNzYWdlKTtcbiAgcHJvY2Vzcy5leGl0KEVYSVRfQ09ERVMuRVJST1IpO1xufVxuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBJbnRlcm5hbCBSZXN1bHQgVHJhY2tpbmdcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuLyoqXG4gKiBJbnRlcm5hbCBydW50aW1lIGJvb2trZWVwaW5nIGZvciBob29rIGV4ZWN1dGlvbiByZXN1bHRzLlxuICpcbiAqIFRoaXMgc3RydWN0dXJlIGFsbG93cyB0aGUgcnVudGltZSB0byBjYXJyeSBlcnJvciBkZXRhaWxzIHdpdGhvdXQgY2hhbmdpbmdcbiAqIHRoZSBleGl0LWNvZGUgcHJvdG9jb2wuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgSG9va0V4ZWN1dGlvblJlc3VsdCB7XG4gIC8qKiBXaGV0aGVyIHRoZSBob29rIGV4ZWN1dGVkIHN1Y2Nlc3NmdWxseS4gKi9cbiAgc3VjY2VzczogYm9vbGVhbjtcbiAgLyoqIFRoZSBleGl0IGNvZGUgdG8gdXNlIHdoZW4gZXhpdGluZy4gKi9cbiAgZXhpdENvZGU6IEV4aXRDb2RlO1xuICAvKiogVGhlIGVycm9yIHRoYXQgb2NjdXJyZWQsIGlmIGFueS4gKi9cbiAgZXJyb3I/OiBFcnJvcjtcbn1cbiIsICIvKipcbiAqIFN0cnVjdHVyZWQgbG9nZ2luZyBmb3IgQ2FyZHMgRXh0ZW5zaW9uIGhvb2tzLlxuICpcbiAqIE91dHB1dCBpcyBvcHQtaW46IHRoZSBsb2dnZXIgb25seSBlbWl0cyB0byByZWdpc3RlcmVkIGhhbmRsZXJzIG9yIGFcbiAqIGNvbmZpZ3VyZWQgbG9nIGZpbGUuIElmIHlvdSBjb25maWd1cmUgbm90aGluZywgdGhlIGxvZ2dlciBwb2xpdGVseSBzYXlzXG4gKiBub3RoaW5nIGF0IGFsbC4gSXQgbmV2ZXIgd3JpdGVzIHRvIHN0ZG91dCBhbmQgYXZvaWRzIHN0ZGVyciB0byBrZWVwIGhvb2tcbiAqIHByb3RvY29scyBjbGVhbi5cbiAqXG4gKiBAc3VtbWFyeSBTdHJ1Y3R1cmVkIGxvZ2dpbmcgZm9yIENhcmRzIEV4dGVuc2lvbiBob29rc1xuICogQG1vZHVsZVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGltcG9ydCB7IGxvZ2dlciB9IGZyb20gJ0BjYXJkcy9zZGsvY29uZmlnJztcbiAqXG4gKiAvLyBTdWJzY3JpYmUgdG8gbG9nIGV2ZW50c1xuICogY29uc3QgdW5zdWJzY3JpYmUgPSBsb2dnZXIub24oJ2Vycm9yJywgKGV2ZW50KSA9PiB7XG4gKiAgIGNvbnNvbGUuZXJyb3IoYEVycm9yIGluICR7ZXZlbnQuaG9va1R5cGV9OiAke2V2ZW50Lm1lc3NhZ2V9YCk7XG4gKiB9KTtcbiAqXG4gKiAvLyBMYXRlciwgY2xlYW4gdXBcbiAqIHVuc3Vic2NyaWJlKCk7XG4gKiBgYGBcbiAqL1xuXG5pbXBvcnQgeyBjbG9zZVN5bmMsIGV4aXN0c1N5bmMsIG1rZGlyU3luYywgb3BlblN5bmMsIHdyaXRlU3luYyB9IGZyb20gJ25vZGU6ZnMnO1xuaW1wb3J0IHsgZGlybmFtZSB9IGZyb20gJ25vZGU6cGF0aCc7XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIExvZyBMZXZlbCBUeXBlc1xuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4vKipcbiAqIEF2YWlsYWJsZSBsb2cgbGV2ZWxzLlxuICpcbiAqIHwgTGV2ZWwgfCBTZXZlcml0eSB8IFVzZSBDYXNlIHxcbiAqIHwtLS0tLS0tfC0tLS0tLS0tLS18LS0tLS0tLS0tLXxcbiAqIHwgYGRlYnVnYCB8IExvd2VzdCB8IERldGFpbGVkIGRlYnVnZ2luZyBpbmZvcm1hdGlvbiB8XG4gKiB8IGBpbmZvYCB8IExvdyB8IEdlbmVyYWwgb3BlcmF0aW9uYWwgZXZlbnRzIHxcbiAqIHwgYHdhcm5gIHwgTWVkaXVtIHwgV2FybmluZyBjb25kaXRpb25zIHRoYXQgbWF5IGluZGljYXRlIGlzc3VlcyB8XG4gKiB8IGBlcnJvcmAgfCBIaWdoIHwgRXJyb3IgY29uZGl0aW9ucyByZXF1aXJpbmcgYXR0ZW50aW9uIHxcbiAqL1xuZXhwb3J0IHR5cGUgTG9nTGV2ZWwgPSAnZGVidWcnIHwgJ2luZm8nIHwgJ3dhcm4nIHwgJ2Vycm9yJztcblxuLyoqXG4gKiBBbGwgbG9nIGxldmVscyBpbiBvcmRlciBvZiBzZXZlcml0eSAobG93ZXN0IHRvIGhpZ2hlc3QpLlxuICovXG5leHBvcnQgY29uc3QgTE9HX0xFVkVMUyA9IFsnZGVidWcnLCAnaW5mbycsICd3YXJuJywgJ2Vycm9yJ10gYXMgY29uc3Qgc2F0aXNmaWVzIHJlYWRvbmx5IExvZ0xldmVsW107XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIExvZyBFdmVudCBUeXBlXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbi8qKlxuICogU3RydWN0dXJlZCBsb2cgZXZlbnQgZW1pdHRlZCBieSB0aGUgbG9nZ2VyLlxuICpcbiAqIEV2ZW50cyBpbmNsdWRlIGNvbnRleHR1YWwgZGV0YWlscyBhYm91dCBob29rIGV4ZWN1dGlvbiBhbmQgYXJlIHN1aXRhYmxlIGZvclxuICogZGVidWdnaW5nLCBtb25pdG9yaW5nLCBhbmQgYW5hbHl0aWNzIHBpcGVsaW5lcy5cbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiAvLyBFeGFtcGxlIGxvZyBldmVudFxuICogY29uc3QgZXZlbnQ6IExvZ0V2ZW50ID0ge1xuICogICB0aW1lc3RhbXA6ICcyMDI0LTAxLTE1VDEwOjMwOjAwLjAwMFonLFxuICogICBsZXZlbDogJ3dhcm4nLFxuICogICBob29rVHlwZTogJ2FjdGlvbi1zdGFydCcsXG4gKiAgIG1lc3NhZ2U6ICdDYXJkIHN0YXJ0ZWQnLFxuICogICBpbnB1dDogeyBjYXJkSWQ6ICdjYXJkLTEyMycgfVxuICogfTtcbiAqIGBgYFxuICovXG5leHBvcnQgaW50ZXJmYWNlIExvZ0V2ZW50IHtcbiAgLyoqXG4gICAqIElTTyA4NjAxIHRpbWVzdGFtcCBvZiB3aGVuIHRoZSBldmVudCBvY2N1cnJlZC5cbiAgICogQGV4YW1wbGUgJzIwMjQtMDEtMTVUMTA6MzA6MDAuMDAwWidcbiAgICovXG4gIHRpbWVzdGFtcDogc3RyaW5nO1xuXG4gIC8qKlxuICAgKiBTZXZlcml0eSBsZXZlbCBvZiB0aGUgbG9nIGV2ZW50LlxuICAgKi9cbiAgbGV2ZWw6IExvZ0xldmVsO1xuXG4gIC8qKlxuICAgKiBUeXBlIG9mIGhvb2sgdGhhdCBnZW5lcmF0ZWQgdGhpcyBldmVudC5cbiAgICogTWF5IGJlIHVuZGVmaW5lZCBmb3IgZXZlbnRzIG91dHNpZGUgaG9vayBjb250ZXh0LlxuICAgKi9cbiAgaG9va1R5cGU/OiBzdHJpbmc7XG5cbiAgLyoqXG4gICAqIEh1bWFuLXJlYWRhYmxlIGRlc2NyaXB0aW9uIG9mIHdoYXQgaGFwcGVuZWQuXG4gICAqL1xuICBtZXNzYWdlOiBzdHJpbmc7XG5cbiAgLyoqXG4gICAqIEhvb2sgaW5wdXQgZGF0YSBhdCB0aGUgdGltZSBvZiBsb2dnaW5nLlxuICAgKlxuICAgKiBUaGlzIGlzIHBhcnRpYWwgYnkgZGVzaWduLCBzbyB5b3UgY2FuIGF2b2lkIGxvZ2dpbmcgbGFyZ2Ugb3Igc2Vuc2l0aXZlXG4gICAqIHBheWxvYWRzIHdoaWxlIHN0aWxsIGNhcHR1cmluZyBrZXkgaWRlbnRpZmllcnMuXG4gICAqL1xuICBpbnB1dD86IFJlY29yZDxzdHJpbmcsIHVua25vd24+O1xuXG4gIC8qKlxuICAgKiBFcnJvciBpbmZvcm1hdGlvbiBpZiB0aGlzIGV2ZW50IHJlcHJlc2VudHMgYW4gZXJyb3IuXG4gICAqIENvbnRhaW5zIHN0cnVjdHVyZWQgZXJyb3IgZGV0YWlscyBmb3IgYW5hbHlzaXMuXG4gICAqL1xuICBlcnJvcj86IExvZ0V2ZW50RXJyb3I7XG5cbiAgLyoqXG4gICAqIEFkZGl0aW9uYWwgY29udGV4dCBkYXRhIHByb3ZpZGVkIGJ5IHRoZSBjYWxsZXIuXG4gICAqXG4gICAqIFVzZSB0aGlzIGZvciBzdHJ1Y3R1cmVkIG1ldGFkYXRhIHRoYXQgeW91IHdhbnQgZG93bnN0cmVhbSBoYW5kbGVyc1xuICAgKiB0byByZWNlaXZlIChlLmcuLCByZXF1ZXN0IElEcywgdGltaW5nIGRhdGEpLlxuICAgKi9cbiAgY29udGV4dD86IFJlY29yZDxzdHJpbmcsIHVua25vd24+O1xufVxuXG4vKipcbiAqIFN0cnVjdHVyZWQgZXJyb3IgaW5mb3JtYXRpb24gd2l0aGluIGEgbG9nIGV2ZW50LlxuICpcbiAqIEVycm9ycyBhcmUgbm9ybWFsaXplZCBzbyBoYW5kbGVycyBjYW4gZGVwZW5kIG9uIGNvbnNpc3RlbnQgc2hhcGUsIGV2ZW4gd2hlblxuICogY2FsbGVycyB0aHJvdyBub24tRXJyb3IgdmFsdWVzLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIExvZ0V2ZW50RXJyb3Ige1xuICAvKipcbiAgICogRXJyb3IgbmFtZSAoZS5nLiwgJ1R5cGVFcnJvcicsICdWYWxpZGF0aW9uRXJyb3InKS5cbiAgICovXG4gIG5hbWU6IHN0cmluZztcblxuICAvKipcbiAgICogRXJyb3IgbWVzc2FnZSBkZXNjcmliaW5nIHdoYXQgd2VudCB3cm9uZy5cbiAgICovXG4gIG1lc3NhZ2U6IHN0cmluZztcblxuICAvKipcbiAgICogU3RhY2sgdHJhY2UgaWYgYXZhaWxhYmxlLlxuICAgKi9cbiAgc3RhY2s/OiBzdHJpbmc7XG5cbiAgLyoqXG4gICAqIEVycm9yIGNhdXNlIGNoYWluIGlmIHRoZSBlcnJvciB3YXMgd3JhcHBlZC5cbiAgICovXG4gIGNhdXNlPzogTG9nRXZlbnRFcnJvcjtcbn1cblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gRXZlbnQgSGFuZGxlciBUeXBlXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbi8qKlxuICogSGFuZGxlciBpbnZva2VkIHdoZW4gYSBsb2cgZXZlbnQgaXMgZW1pdHRlZC5cbiAqXG4gKiBIYW5kbGVycyBydW4gc3luY2hyb25vdXNseS4gRXJyb3JzIHRocm93biBieSBhIGhhbmRsZXIgYXJlIHN3YWxsb3dlZCBzb1xuICogbG9nZ2luZyBjYW5ub3QgYnJlYWsgaG9vayBleGVjdXRpb24uXG4gKiBAcGFyYW0gZXZlbnQgLSBUaGUgbG9nIGV2ZW50IHRvIGhhbmRsZVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIC8vIEZvcndhcmQgdG8gZXh0ZXJuYWwgbG9nZ2luZyBzZXJ2aWNlXG4gKiBjb25zdCBoYW5kbGVyOiBMb2dFdmVudEhhbmRsZXIgPSAoZXZlbnQpID0+IHtcbiAqICAgZXh0ZXJuYWxMb2dnZXIubG9nKHtcbiAqICAgICBsZXZlbDogZXZlbnQubGV2ZWwsXG4gKiAgICAgbWVzc2FnZTogZXZlbnQubWVzc2FnZSxcbiAqICAgICBtZXRhZGF0YTogeyBob29rVHlwZTogZXZlbnQuaG9va1R5cGUgfVxuICogICB9KTtcbiAqIH07XG4gKiBgYGBcbiAqL1xuZXhwb3J0IHR5cGUgTG9nRXZlbnRIYW5kbGVyID0gKGV2ZW50OiBMb2dFdmVudCkgPT4gdm9pZDtcblxuLyoqXG4gKiBGdW5jdGlvbiB0byB1bnN1YnNjcmliZSBhIGxvZyBldmVudCBoYW5kbGVyLlxuICpcbiAqIENhbGwgdGhpcyBmdW5jdGlvbiB0byBzdG9wIHJlY2VpdmluZyBsb2cgZXZlbnRzLiBBbHdheXMgY2FsbCB1bnN1YnNjcmliZVxuICogd2hlbiB0aGUgaGFuZGxlciBpcyBubyBsb25nZXIgbmVlZGVkIHRvIHByZXZlbnQgbWVtb3J5IGxlYWtzLlxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGNvbnN0IHVuc3Vic2NyaWJlID0gbG9nZ2VyLm9uKCdlcnJvcicsIGhhbmRsZUVycm9yKTtcbiAqIC8vIC4uLiBsYXRlclxuICogdW5zdWJzY3JpYmUoKTsgLy8gU3RvcCByZWNlaXZpbmcgZXZlbnRzXG4gKiBgYGBcbiAqL1xuZXhwb3J0IHR5cGUgVW5zdWJzY3JpYmUgPSAoKSA9PiB2b2lkO1xuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBMb2dnZXIgQ29uZmlndXJhdGlvblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4vKipcbiAqIENvbmZpZ3VyYXRpb24gb3B0aW9ucyBmb3IgdGhlIExvZ2dlci5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBMb2dnZXJDb25maWcge1xuICAvKipcbiAgICogUGF0aCB0byB0aGUgbG9nIGZpbGUgZm9yIEpTT04gTGluZXMgb3V0cHV0LlxuICAgKlxuICAgKiBJZiBub3Qgc2V0LCBmaWxlIGxvZ2dpbmcgaXMgZGlzYWJsZWQuIENhbiBhbHNvIGJlIHNldCB2aWEgdGhlXG4gICAqIGBDQVJEU19IT09LU19MT0dfRklMRWAgZW52aXJvbm1lbnQgdmFyaWFibGUuXG4gICAqL1xuICBsb2dGaWxlUGF0aD86IHN0cmluZztcbn1cblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gTG9nZ2VyIEludGVyZmFjZSAoZm9yIHRlc3RpbmcgYW5kIHR5cGUgY29tcGF0aWJpbGl0eSlcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuLyoqXG4gKiBMb2dnZXIgaW50ZXJmYWNlIGZvciBzdHJ1Y3R1cmVkLCBjb250ZXh0LWF3YXJlIGxvZ2dpbmcuXG4gKlxuICogVGhpcyBpbnRlcmZhY2UgZGVmaW5lcyB0aGUgcHVibGljIEFQSSBvZiB0aGUgTG9nZ2VyIGNsYXNzLiBJdCBleGlzdHNcbiAqIHByaW1hcmlseSBmb3IgdHlwZSBjb21wYXRpYmlsaXR5IGFuZCB0ZXN0aW5nIHB1cnBvc2VzLCBhbGxvd2luZyB0ZXN0c1xuICogdG8gbW9jayB0aGUgbG9nZ2VyIHdpdGhvdXQgbmVlZGluZyB0byBpbXBsZW1lbnQgYWxsIGludGVybmFsIG1ldGhvZHMuXG4gKlxuICogRm9yIHByb2R1Y3Rpb24gdXNlLCB1c2UgdGhlIHtAbGluayBMb2dnZXJ9IGNsYXNzIG9yIHRoZSB7QGxpbmsgbG9nZ2VyfVxuICogc2luZ2xldG9uIGV4cG9ydC5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBJTG9nZ2VyIHtcbiAgLyoqXG4gICAqIExvZ3MgYSBkZWJ1ZyBtZXNzYWdlLlxuICAgKiBAcGFyYW0gbWVzc2FnZSAtIERpYWdub3N0aWMgdGV4dCBkZXNjcmliaW5nIGxvdy1sZXZlbCBleGVjdXRpb24gZGV0YWlscy5cbiAgICogQHBhcmFtIGNvbnRleHQgLSBPcHRpb25hbCBzdHJ1Y3R1cmVkIG1ldGFkYXRhIG1lcmdlZCBpbnRvIHRoZSBlbWl0dGVkIGV2ZW50LlxuICAgKi9cbiAgZGVidWcobWVzc2FnZTogc3RyaW5nLCBjb250ZXh0PzogUmVjb3JkPHN0cmluZywgdW5rbm93bj4pOiB2b2lkO1xuXG4gIC8qKlxuICAgKiBMb2dzIGFuIGluZm8gbWVzc2FnZS5cbiAgICogQHBhcmFtIG1lc3NhZ2UgLSBPcGVyYXRpb25hbCBtZXNzYWdlIGRlc2NyaWJpbmcgbm9ybWFsIGhvb2sgcHJvZ3Jlc3MuXG4gICAqIEBwYXJhbSBjb250ZXh0IC0gT3B0aW9uYWwgc3RydWN0dXJlZCBtZXRhZGF0YSBtZXJnZWQgaW50byB0aGUgZW1pdHRlZCBldmVudC5cbiAgICovXG4gIGluZm8obWVzc2FnZTogc3RyaW5nLCBjb250ZXh0PzogUmVjb3JkPHN0cmluZywgdW5rbm93bj4pOiB2b2lkO1xuXG4gIC8qKlxuICAgKiBMb2dzIGEgd2FybmluZyBtZXNzYWdlLlxuICAgKiBAcGFyYW0gbWVzc2FnZSAtIFdhcm5pbmcgdGV4dCBmb3IgcmVjb3ZlcmFibGUgb3Igc3VzcGljaW91cyBjb25kaXRpb25zLlxuICAgKiBAcGFyYW0gY29udGV4dCAtIE9wdGlvbmFsIHN0cnVjdHVyZWQgbWV0YWRhdGEgbWVyZ2VkIGludG8gdGhlIGVtaXR0ZWQgZXZlbnQuXG4gICAqL1xuICB3YXJuKG1lc3NhZ2U6IHN0cmluZywgY29udGV4dD86IFJlY29yZDxzdHJpbmcsIHVua25vd24+KTogdm9pZDtcblxuICAvKipcbiAgICogTG9ncyBhbiBlcnJvciBtZXNzYWdlLlxuICAgKiBAcGFyYW0gbWVzc2FnZSAtIEVycm9yIHRleHQgZGVzY3JpYmluZyBhIGhhbmRsZWQgZmFpbHVyZSBjb25kaXRpb24uXG4gICAqIEBwYXJhbSBjb250ZXh0IC0gT3B0aW9uYWwgc3RydWN0dXJlZCBtZXRhZGF0YSBtZXJnZWQgaW50byB0aGUgZW1pdHRlZCBldmVudC5cbiAgICovXG4gIGVycm9yKG1lc3NhZ2U6IHN0cmluZywgY29udGV4dD86IFJlY29yZDxzdHJpbmcsIHVua25vd24+KTogdm9pZDtcblxuICAvKipcbiAgICogTG9ncyBhIHN0cnVjdHVyZWQgZXJyb3Igd2l0aCBmdWxsIGVycm9yIGRldGFpbHMuXG4gICAqIEBwYXJhbSBlcnJvciAtIFRoZSBlcnJvciB0byBsb2dcbiAgICogQHBhcmFtIG1lc3NhZ2UgLSBIdW1hbi1yZWFkYWJsZSBkZXNjcmlwdGlvbiBvZiB3aGF0IGZhaWxlZFxuICAgKiBAcGFyYW0gY29udGV4dCAtIE9wdGlvbmFsIHN0cnVjdHVyZWQgbWV0YWRhdGEgbWVyZ2VkIGludG8gdGhlIGVtaXR0ZWQgZXZlbnQuXG4gICAqL1xuICBsb2dFcnJvcihlcnJvcjogdW5rbm93biwgbWVzc2FnZTogc3RyaW5nLCBjb250ZXh0PzogUmVjb3JkPHN0cmluZywgdW5rbm93bj4pOiB2b2lkO1xufVxuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBMb2dnZXIgQ2xhc3Ncbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuLyoqXG4gKiBMb2dnZXIgZm9yIENhcmRzIEV4dGVuc2lvbiBob29rcyB3aXRoIGV2ZW50IHN1YnNjcmlwdGlvbiBhbmQgZmlsZSBvdXRwdXQuXG4gKlxuICogT3V0cHV0IGlzIG9wdC1pbiBhbmQgYmVzdC1lZmZvcnQ6XG4gKiAtIFdpdGggbm8gaGFuZGxlcnMgYW5kIG5vIGxvZyBmaWxlLCBldmVudHMgYXJlIGRyb3BwZWQuXG4gKiAtIEhhbmRsZXIgZXJyb3JzIGFyZSBzd2FsbG93ZWQgc28gbG9nZ2luZyBjYW5ub3QgYnJlYWsgaG9va3MuXG4gKiAtIEZpbGUgb3V0cHV0IHVzZXMgSlNPTiBMaW5lcyBhbmQgaWdub3JlcyB3cml0ZSBmYWlsdXJlcy5cbiAqXG4gKiBUaGUgbG9nZ2VyIG5ldmVyIHdyaXRlcyB0byBzdGRvdXQgb3Igc3RkZXJyLlxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGltcG9ydCB7IGxvZ2dlciB9IGZyb20gJ0BjYXJkcy9zZGsvY29uZmlnJztcbiAqXG4gKiAvLyBTdWJzY3JpYmUgdG8gZXZlbnRzIGF0IHNwZWNpZmljIGxldmVsXG4gKiBsb2dnZXIub24oJ3dhcm4nLCAoZXZlbnQpID0+IHtcbiAqICAgc2VuZEFsZXJ0KGV2ZW50Lm1lc3NhZ2UpO1xuICogfSk7XG4gKlxuICogLy8gTG9nIHdpdGhpbiBhIGhvb2sgaGFuZGxlclxuICogbG9nZ2VyLndhcm4oJ0Fib3V0IHRvIGV4ZWN1dGUgdGFzaycpO1xuICogYGBgXG4gKi9cbmV4cG9ydCBjbGFzcyBMb2dnZXIge1xuICAvKipcbiAgICogUmVnaXN0ZXJlZCBldmVudCBoYW5kbGVycyBieSBsb2cgbGV2ZWwuXG4gICAqL1xuICBwcml2YXRlIGhhbmRsZXJzOiBNYXA8TG9nTGV2ZWwsIFNldDxMb2dFdmVudEhhbmRsZXI+PiA9IG5ldyBNYXAoKTtcblxuICAvKipcbiAgICogRmlsZSBkZXNjcmlwdG9yIGZvciBsb2cgZmlsZSBvdXRwdXQuXG4gICAqIExhemlseSBpbml0aWFsaXplZCBvbiBmaXJzdCB3cml0ZS5cbiAgICovXG4gIHByaXZhdGUgbG9nRmlsZUZkOiBudW1iZXIgfCBudWxsID0gbnVsbDtcblxuICAvKipcbiAgICogUGF0aCB0byB0aGUgbG9nIGZpbGUsIGlmIGNvbmZpZ3VyZWQuXG4gICAqL1xuICBwcml2YXRlIGxvZ0ZpbGVQYXRoOiBzdHJpbmcgfCBudWxsID0gbnVsbDtcblxuICAvKipcbiAgICogV2hldGhlciBmaWxlIGluaXRpYWxpemF0aW9uIGhhcyBiZWVuIGF0dGVtcHRlZC5cbiAgICovXG4gIHByaXZhdGUgZmlsZUluaXRpYWxpemVkID0gZmFsc2U7XG5cbiAgLyoqXG4gICAqIEN1cnJlbnQgaG9vayBjb250ZXh0IGZvciBlbnJpY2hpbmcgbG9nIGV2ZW50cy5cbiAgICovXG4gIHByaXZhdGUgY3VycmVudEhvb2tUeXBlOiBzdHJpbmcgfCB1bmRlZmluZWQ7XG5cbiAgLyoqXG4gICAqIEN1cnJlbnQgaG9vayBpbnB1dCBmb3IgZW5yaWNoaW5nIGxvZyBldmVudHMuXG4gICAqL1xuICBwcml2YXRlIGN1cnJlbnRJbnB1dDogUmVjb3JkPHN0cmluZywgdW5rbm93bj4gfCB1bmRlZmluZWQ7XG5cbiAgLyoqXG4gICAqIENyZWF0ZXMgYSBuZXcgTG9nZ2VyIGluc3RhbmNlLlxuICAgKlxuICAgKiBUeXBpY2FsbHkgeW91IHNob3VsZCB1c2UgdGhlIGV4cG9ydGVkIGBsb2dnZXJgIHNpbmdsZXRvbiByYXRoZXIgdGhhblxuICAgKiBjcmVhdGluZyBuZXcgaW5zdGFuY2VzLlxuICAgKiBAcGFyYW0gY29uZmlnIC0gT3B0aW9uYWwgY29uZmlndXJhdGlvblxuICAgKiBAZXhhbXBsZVxuICAgKiBgYGB0eXBlc2NyaXB0XG4gICAqIC8vIFVzZSBzaW5nbGV0b24gKHJlY29tbWVuZGVkKVxuICAgKiBpbXBvcnQgeyBsb2dnZXIgfSBmcm9tICdAY2FyZHMvc2RrL2NvbmZpZyc7XG4gICAqXG4gICAqIC8vIE9yIGNyZWF0ZSBjdXN0b20gaW5zdGFuY2VcbiAgICogY29uc3QgY3VzdG9tTG9nZ2VyID0gbmV3IExvZ2dlcih7IGxvZ0ZpbGVQYXRoOiAnL3Zhci9sb2cvaG9va3MubG9nJyB9KTtcbiAgICogYGBgXG4gICAqL1xuICBjb25zdHJ1Y3Rvcihjb25maWc6IExvZ2dlckNvbmZpZyA9IHt9KSB7XG4gICAgLy8gSW5pdGlhbGl6ZSBoYW5kbGVycyBtYXAgZm9yIGVhY2ggbGV2ZWxcbiAgICBmb3IgKGNvbnN0IGxldmVsIG9mIExPR19MRVZFTFMpIHtcbiAgICAgIHRoaXMuaGFuZGxlcnMuc2V0KGxldmVsLCBuZXcgU2V0KCkpO1xuICAgIH1cblxuICAgIC8vIFNldCBsb2cgZmlsZSBwYXRoIGZyb20gY29uZmlnIG9yIGVudmlyb25tZW50XG4gICAgdGhpcy5sb2dGaWxlUGF0aCA9IGNvbmZpZy5sb2dGaWxlUGF0aCA/PyBwcm9jZXNzLmVudlsnQ0FSRFNfSE9PS1NfTE9HX0ZJTEUnXSA/PyBudWxsO1xuICB9XG5cbiAgLyoqXG4gICAqIExvZ3MgYSBkZWJ1ZyBtZXNzYWdlLlxuICAgKlxuICAgKiBVc2UgZm9yIGRldGFpbGVkIGRlYnVnZ2luZyBpbmZvcm1hdGlvbiB0aGF0IGlzIHR5cGljYWxseSBvbmx5IHVzZWZ1bFxuICAgKiBkdXJpbmcgZGV2ZWxvcG1lbnQgb3IgdHJvdWJsZXNob290aW5nLlxuICAgKiBAcGFyYW0gbWVzc2FnZSAtIERpYWdub3N0aWMgdGV4dCBkZXNjcmliaW5nIGxvdy1sZXZlbCBleGVjdXRpb24gZGV0YWlscy5cbiAgICogQHBhcmFtIGNvbnRleHQgLSBPcHRpb25hbCBzdHJ1Y3R1cmVkIG1ldGFkYXRhIG1lcmdlZCBpbnRvIHRoZSBlbWl0dGVkIGV2ZW50LlxuICAgKiBAZXhhbXBsZVxuICAgKiBgYGB0eXBlc2NyaXB0XG4gICAqIGxvZ2dlci5kZWJ1ZygnUHJvY2Vzc2luZyBob29rIGlucHV0JywgeyB0YXNrSWQ6ICd0YXNrLTEyMycsIGlucHV0U2l6ZTogMjU2IH0pO1xuICAgKiBgYGBcbiAgICovXG4gIGRlYnVnKG1lc3NhZ2U6IHN0cmluZywgY29udGV4dD86IFJlY29yZDxzdHJpbmcsIHVua25vd24+KTogdm9pZCB7XG4gICAgdGhpcy5lbWl0KCdkZWJ1ZycsIG1lc3NhZ2UsIGNvbnRleHQpO1xuICB9XG5cbiAgLyoqXG4gICAqIExvZ3MgYW4gaW5mbyBtZXNzYWdlLlxuICAgKlxuICAgKiBVc2UgZm9yIGdlbmVyYWwgb3BlcmF0aW9uYWwgZXZlbnRzIGxpa2UgaG9vayBpbnZvY2F0aW9ucywgc3VjY2Vzc2Z1bFxuICAgKiBjb21wbGV0aW9ucywgb3Igc3RhdGUgY2hhbmdlcy5cbiAgICogQHBhcmFtIG1lc3NhZ2UgLSBPcGVyYXRpb25hbCBtZXNzYWdlIGRlc2NyaWJpbmcgbm9ybWFsIGhvb2sgcHJvZ3Jlc3MuXG4gICAqIEBwYXJhbSBjb250ZXh0IC0gT3B0aW9uYWwgc3RydWN0dXJlZCBtZXRhZGF0YSBtZXJnZWQgaW50byB0aGUgZW1pdHRlZCBldmVudC5cbiAgICogQGV4YW1wbGVcbiAgICogYGBgdHlwZXNjcmlwdFxuICAgKiBsb2dnZXIuaW5mbygnVGFzayBzdGFydGVkJywgeyB0YXNrSWQ6ICd0YXNrLTEyMycsIGNhcmRJZDogJ2NhcmQtNDU2JyB9KTtcbiAgICogYGBgXG4gICAqL1xuICBpbmZvKG1lc3NhZ2U6IHN0cmluZywgY29udGV4dD86IFJlY29yZDxzdHJpbmcsIHVua25vd24+KTogdm9pZCB7XG4gICAgdGhpcy5lbWl0KCdpbmZvJywgbWVzc2FnZSwgY29udGV4dCk7XG4gIH1cblxuICAvKipcbiAgICogTG9ncyBhIHdhcm5pbmcgbWVzc2FnZS5cbiAgICpcbiAgICogVXNlIGZvciBjb25kaXRpb25zIHRoYXQgbWF5IGluZGljYXRlIGNhcmRzIGJ1dCBkb24ndCBwcmV2ZW50XG4gICAqIG9wZXJhdGlvbiwgc3VjaCBhcyBkZXByZWNhdGVkIHBhdHRlcm5zIG9yIHBlcmZvcm1hbmNlIGNvbmNlcm5zLlxuICAgKiBAcGFyYW0gbWVzc2FnZSAtIFdhcm5pbmcgdGV4dCBmb3IgcmVjb3ZlcmFibGUgb3Igc3VzcGljaW91cyBjb25kaXRpb25zLlxuICAgKiBAcGFyYW0gY29udGV4dCAtIE9wdGlvbmFsIHN0cnVjdHVyZWQgbWV0YWRhdGEgbWVyZ2VkIGludG8gdGhlIGVtaXR0ZWQgZXZlbnQuXG4gICAqIEBleGFtcGxlXG4gICAqIGBgYHR5cGVzY3JpcHRcbiAgICogbG9nZ2VyLndhcm4oJ0RlcHJlY2F0ZWQgaG9vayBwYXR0ZXJuIGRldGVjdGVkJywgeyBwYXR0ZXJuOiAnbGVnYWN5TWF0Y2hlcicgfSk7XG4gICAqIGBgYFxuICAgKi9cbiAgd2FybihtZXNzYWdlOiBzdHJpbmcsIGNvbnRleHQ/OiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPik6IHZvaWQge1xuICAgIHRoaXMuZW1pdCgnd2FybicsIG1lc3NhZ2UsIGNvbnRleHQpO1xuICB9XG5cbiAgLyoqXG4gICAqIExvZ3MgYW4gZXJyb3IgbWVzc2FnZS5cbiAgICpcbiAgICogVXNlIGZvciBlcnJvciBjb25kaXRpb25zIHRoYXQgcmVxdWlyZSBhdHRlbnRpb24gYnV0IHdlcmUgaGFuZGxlZFxuICAgKiBncmFjZWZ1bGx5LiBGb3IgZXhjZXB0aW9ucywgcHJlZmVyIHtAbGluayBsb2dFcnJvcn0uXG4gICAqIEBwYXJhbSBtZXNzYWdlIC0gRXJyb3IgdGV4dCBkZXNjcmliaW5nIGEgaGFuZGxlZCBmYWlsdXJlIGNvbmRpdGlvbi5cbiAgICogQHBhcmFtIGNvbnRleHQgLSBPcHRpb25hbCBzdHJ1Y3R1cmVkIG1ldGFkYXRhIG1lcmdlZCBpbnRvIHRoZSBlbWl0dGVkIGV2ZW50LlxuICAgKiBAZXhhbXBsZVxuICAgKiBgYGB0eXBlc2NyaXB0XG4gICAqIGxvZ2dlci5lcnJvcignRmFpbGVkIHRvIHZhbGlkYXRlIGhvb2sgaW5wdXQnLCB7IHJlYXNvbjogJ2VtcHR5IHRhc2tJZCcgfSk7XG4gICAqIGBgYFxuICAgKi9cbiAgZXJyb3IobWVzc2FnZTogc3RyaW5nLCBjb250ZXh0PzogUmVjb3JkPHN0cmluZywgdW5rbm93bj4pOiB2b2lkIHtcbiAgICB0aGlzLmVtaXQoJ2Vycm9yJywgbWVzc2FnZSwgY29udGV4dCk7XG4gIH1cblxuICAvKipcbiAgICogTG9ncyBhIHN0cnVjdHVyZWQgZXJyb3Igd2l0aCBmdWxsIGVycm9yIGRldGFpbHMuXG4gICAqXG4gICAqIFVzZSB0aGlzIGZvciBjYXVnaHQgZXhjZXB0aW9ucy4gTm9uLUVycm9yIHZhbHVlcyBhcmUgbm9ybWFsaXplZCBzbyBoYW5kbGVyc1xuICAgKiBhbHdheXMgcmVjZWl2ZSBhIGNvbnNpc3RlbnQgZXJyb3Igc2hhcGUuXG4gICAqIEBwYXJhbSBlcnJvciAtIFRoZSBlcnJvciB0byBsb2dcbiAgICogQHBhcmFtIG1lc3NhZ2UgLSBIdW1hbi1yZWFkYWJsZSBkZXNjcmlwdGlvbiBvZiB3aGF0IGZhaWxlZFxuICAgKiBAcGFyYW0gY29udGV4dCAtIE9wdGlvbmFsIHN0cnVjdHVyZWQgbWV0YWRhdGEgbWVyZ2VkIGludG8gdGhlIGVtaXR0ZWQgZXZlbnQuXG4gICAqIEBleGFtcGxlXG4gICAqIGBgYHR5cGVzY3JpcHRcbiAgICogdHJ5IHtcbiAgICogICBhd2FpdCBkYW5nZXJvdXNPcGVyYXRpb24oKTtcbiAgICogfSBjYXRjaCAoZXJyKSB7XG4gICAqICAgbG9nZ2VyLmxvZ0Vycm9yKGVyciwgJ0ZhaWxlZCB0byBleGVjdXRlIGRhbmdlcm91cyBvcGVyYXRpb24nLCB7XG4gICAqICAgICBvcGVyYXRpb246ICdkZWxldGUnLFxuICAgKiAgICAgdGFyZ2V0OiAnL2ltcG9ydGFudC9maWxlLnR4dCdcbiAgICogICB9KTtcbiAgICogfVxuICAgKiBgYGBcbiAgICovXG4gIGxvZ0Vycm9yKGVycm9yOiB1bmtub3duLCBtZXNzYWdlOiBzdHJpbmcsIGNvbnRleHQ/OiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPik6IHZvaWQge1xuICAgIGNvbnN0IGVycm9ySW5mbyA9IHRoaXMuZXh0cmFjdEVycm9ySW5mbyhlcnJvcik7XG5cbiAgICBjb25zdCBldmVudDogTG9nRXZlbnQgPSB7XG4gICAgICB0aW1lc3RhbXA6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcbiAgICAgIGxldmVsOiAnZXJyb3InLFxuICAgICAgaG9va1R5cGU6IHRoaXMuY3VycmVudEhvb2tUeXBlLFxuICAgICAgbWVzc2FnZSxcbiAgICAgIGlucHV0OiB0aGlzLmN1cnJlbnRJbnB1dCxcbiAgICAgIGVycm9yOiBlcnJvckluZm8sXG4gICAgICBjb250ZXh0XG4gICAgfTtcblxuICAgIHRoaXMuZGVsaXZlckV2ZW50KGV2ZW50KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBTdWJzY3JpYmVzIGEgaGFuZGxlciB0byBsb2cgZXZlbnRzIGF0IHRoZSBzcGVjaWZpZWQgbGV2ZWwuXG4gICAqXG4gICAqIFRoZSBoYW5kbGVyIHdpbGwgYmUgY2FsbGVkIGZvciBldmVyeSBsb2cgZXZlbnQgYXQgdGhlIHNwZWNpZmllZCBsZXZlbC5cbiAgICogUmV0dXJucyBhbiB1bnN1YnNjcmliZSBmdW5jdGlvbiB0aGF0IHNob3VsZCBiZSBjYWxsZWQgd2hlbiB0aGUgaGFuZGxlclxuICAgKiBpcyBubyBsb25nZXIgbmVlZGVkLiBIYW5kbGVyIGVycm9ycyBhcmUgaWdub3JlZCB0byBhdm9pZCBkaXNydXB0aW5nIGhvb2tzLlxuICAgKiBAcGFyYW0gbGV2ZWwgLSBUaGUgbG9nIGxldmVsIHRvIHN1YnNjcmliZSB0b1xuICAgKiBAcGFyYW0gaGFuZGxlciAtIFRoZSBoYW5kbGVyIGZ1bmN0aW9uIHRvIGNhbGwgZm9yIGVhY2ggZXZlbnRcbiAgICogQHJldHVybnMgQSBmdW5jdGlvbiB0byB1bnN1YnNjcmliZSB0aGUgaGFuZGxlclxuICAgKiBAZXhhbXBsZVxuICAgKiBgYGB0eXBlc2NyaXB0XG4gICAqIC8vIFN1YnNjcmliZSB0byBlcnJvciBldmVudHNcbiAgICogY29uc3QgdW5zdWJzY3JpYmUgPSBsb2dnZXIub24oJ2Vycm9yJywgKGV2ZW50KSA9PiB7XG4gICAqICAgY29uc29sZS5lcnJvcihgWyR7ZXZlbnQuaG9va1R5cGV9XSAke2V2ZW50Lm1lc3NhZ2V9YCk7XG4gICAqICAgaWYgKGV2ZW50LmVycm9yKSB7XG4gICAqICAgICBjb25zb2xlLmVycm9yKGV2ZW50LmVycm9yLnN0YWNrKTtcbiAgICogICB9XG4gICAqIH0pO1xuICAgKlxuICAgKiAvLyBMYXRlciwgY2xlYW4gdXBcbiAgICogdW5zdWJzY3JpYmUoKTtcbiAgICogYGBgXG4gICAqIEBleGFtcGxlXG4gICAqIGBgYHR5cGVzY3JpcHRcbiAgICogLy8gRm9yd2FyZCB0byBleHRlcm5hbCBsb2dnaW5nIGxpYnJhcnlcbiAgICogaW1wb3J0IHBpbm8gZnJvbSAncGlubyc7XG4gICAqIGNvbnN0IHBpbm9Mb2dnZXIgPSBwaW5vKCk7XG4gICAqXG4gICAqIGxvZ2dlci5vbignaW5mbycsIChldmVudCkgPT4gcGlub0xvZ2dlci5pbmZvKGV2ZW50LCBldmVudC5tZXNzYWdlKSk7XG4gICAqIGxvZ2dlci5vbignd2FybicsIChldmVudCkgPT4gcGlub0xvZ2dlci53YXJuKGV2ZW50LCBldmVudC5tZXNzYWdlKSk7XG4gICAqIGxvZ2dlci5vbignZXJyb3InLCAoZXZlbnQpID0+IHBpbm9Mb2dnZXIuZXJyb3IoZXZlbnQsIGV2ZW50Lm1lc3NhZ2UpKTtcbiAgICogYGBgXG4gICAqL1xuICBvbihsZXZlbDogTG9nTGV2ZWwsIGhhbmRsZXI6IExvZ0V2ZW50SGFuZGxlcik6IFVuc3Vic2NyaWJlIHtcbiAgICBjb25zdCBsZXZlbEhhbmRsZXJzID0gdGhpcy5oYW5kbGVycy5nZXQobGV2ZWwpO1xuICAgIGlmIChsZXZlbEhhbmRsZXJzKSB7XG4gICAgICBsZXZlbEhhbmRsZXJzLmFkZChoYW5kbGVyKTtcbiAgICB9XG5cbiAgICByZXR1cm4gKCkgPT4ge1xuICAgICAgbGV2ZWxIYW5kbGVycz8uZGVsZXRlKGhhbmRsZXIpO1xuICAgIH07XG4gIH1cblxuICAvKipcbiAgICogU2V0cyB0aGUgY3VycmVudCBob29rIGNvbnRleHQgZm9yIGVucmljaGluZyBsb2cgZXZlbnRzLlxuICAgKlxuICAgKiBUaGlzIGlzIGNhbGxlZCBpbnRlcm5hbGx5IGJ5IHRoZSBydW50aW1lIGJlZm9yZSBpbnZva2luZyBob29rIGhhbmRsZXJzLlxuICAgKiBZb3UgdHlwaWNhbGx5IGRvbid0IG5lZWQgdG8gY2FsbCB0aGlzIGRpcmVjdGx5LlxuICAgKiBAcGFyYW0gaG9va1R5cGUgLSBUaGUgdHlwZSBvZiBob29rIGJlaW5nIGV4ZWN1dGVkXG4gICAqIEBwYXJhbSBpbnB1dCAtIFRoZSBob29rIGlucHV0IGRhdGFcbiAgICogQGludGVybmFsXG4gICAqL1xuICBzZXRDb250ZXh0KGhvb2tUeXBlOiBzdHJpbmcgfCB1bmRlZmluZWQsIGlucHV0OiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPiB8IHVuZGVmaW5lZCk6IHZvaWQge1xuICAgIHRoaXMuY3VycmVudEhvb2tUeXBlID0gaG9va1R5cGU7XG4gICAgdGhpcy5jdXJyZW50SW5wdXQgPSBpbnB1dDtcbiAgfVxuXG4gIC8qKlxuICAgKiBDbGVhcnMgdGhlIGN1cnJlbnQgaG9vayBjb250ZXh0LlxuICAgKlxuICAgKiBDYWxsZWQgaW50ZXJuYWxseSBieSB0aGUgcnVudGltZSBhZnRlciBob29rIGV4ZWN1dGlvbiBjb21wbGV0ZXMuXG4gICAqIEBpbnRlcm5hbFxuICAgKi9cbiAgY2xlYXJDb250ZXh0KCk6IHZvaWQge1xuICAgIHRoaXMuY3VycmVudEhvb2tUeXBlID0gdW5kZWZpbmVkO1xuICAgIHRoaXMuY3VycmVudElucHV0ID0gdW5kZWZpbmVkO1xuICB9XG5cbiAgLyoqXG4gICAqIFNldHMgYSBkZWZhdWx0IGxvZyBmaWxlIHBhdGggdGhhdCBvbmx5IHRha2VzIGVmZmVjdCBpZiBubyBvdGhlciBzb3VyY2VcbiAgICogaGFzIGNvbmZpZ3VyZWQgZmlsZSBsb2dnaW5nLlxuICAgKlxuICAgKiBUaGlzIGlzIHRoZSBsb3dlc3QtcHJpb3JpdHkgZmlsZSBwYXRoIHNvdXJjZS4gSXQgd2lsbCBiZSBpZ25vcmVkIGlmXG4gICAqIGFueSBvZiB0aGVzZSBoYXZlIGFscmVhZHkgc2V0IGEgcGF0aDpcbiAgICogLSBgbG9nRmlsZVBhdGhgIGluIHRoZSBjb25zdHJ1Y3RvciBjb25maWdcbiAgICogLSBgQ0FSRFNfSE9PS1NfTE9HX0ZJTEVgIGVudmlyb25tZW50IHZhcmlhYmxlXG4gICAqIC0ge0BsaW5rIHNldExvZ0ZpbGV9IGNhbGxlZCBhdCBydW50aW1lXG4gICAqXG4gICAqIEludGVuZGVkIGZvciB1c2UgYnkgQ0xJIGVudHJ5IHBvaW50cyAoZS5nLiwgdGhlIGAtLWxvZ2AgZmxhZykuXG4gICAqIEBwYXJhbSBmaWxlUGF0aCAtIERlZmF1bHQgcGF0aCB0byB0aGUgbG9nIGZpbGVcbiAgICogQGV4YW1wbGVcbiAgICogYGBgdHlwZXNjcmlwdFxuICAgKiAvLyBXaXJlIC0tbG9nIENMSSBhcmd1bWVudCBhcyBhIGZhbGxiYWNrXG4gICAqIGlmIChhcmdzLmxvZykge1xuICAgKiAgIGxvZ2dlci5zZXREZWZhdWx0TG9nRmlsZShhcmdzLmxvZyk7XG4gICAqIH1cbiAgICogYGBgXG4gICAqL1xuICBzZXREZWZhdWx0TG9nRmlsZShmaWxlUGF0aDogc3RyaW5nKTogdm9pZCB7XG4gICAgaWYgKHRoaXMubG9nRmlsZVBhdGggPT09IG51bGwpIHtcbiAgICAgIHRoaXMubG9nRmlsZVBhdGggPSBmaWxlUGF0aDtcbiAgICAgIHRoaXMuZmlsZUluaXRpYWxpemVkID0gZmFsc2U7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIENvbmZpZ3VyZXMgdGhlIGxvZyBmaWxlIHBhdGggYXQgcnVudGltZS5cbiAgICpcbiAgICogQ2FsbCB0aGlzIHRvIGVuYWJsZSBvciBjaGFuZ2UgZmlsZSBsb2dnaW5nLiBTZXR0aW5nIHRvIGBudWxsYCBkaXNhYmxlc1xuICAgKiBmaWxlIGxvZ2dpbmcgYW5kIGNsb3NlcyBhbnkgb3BlbiBmaWxlIGhhbmRsZS4gRGlyZWN0b3JpZXMgYXJlIGNyZWF0ZWRcbiAgICogb24gZGVtYW5kIHdoZW4gdGhlIGZpcnN0IHdyaXRlIG9jY3Vycy5cbiAgICogQHBhcmFtIGZpbGVQYXRoIC0gUGF0aCB0byB0aGUgbG9nIGZpbGUsIG9yIG51bGwgdG8gZGlzYWJsZVxuICAgKiBAZXhhbXBsZVxuICAgKiBgYGB0eXBlc2NyaXB0XG4gICAqIC8vIEVuYWJsZSBmaWxlIGxvZ2dpbmcgYXQgcnVudGltZVxuICAgKiBsb2dnZXIuc2V0TG9nRmlsZSgnL3Zhci9sb2cvY2FyZHMtc2RrLmxvZycpO1xuICAgKlxuICAgKiAvLyBEaXNhYmxlIGZpbGUgbG9nZ2luZ1xuICAgKiBsb2dnZXIuc2V0TG9nRmlsZShudWxsKTtcbiAgICogYGBgXG4gICAqL1xuICBzZXRMb2dGaWxlKGZpbGVQYXRoOiBzdHJpbmcgfCBudWxsKTogdm9pZCB7XG4gICAgLy8gQ2xvc2UgZXhpc3RpbmcgZmlsZSBpZiBvcGVuXG4gICAgaWYgKHRoaXMubG9nRmlsZUZkICE9PSBudWxsKSB7XG4gICAgICB0cnkge1xuICAgICAgICBjbG9zZVN5bmModGhpcy5sb2dGaWxlRmQpO1xuICAgICAgfSBjYXRjaCB7XG4gICAgICAgIC8vIElnbm9yZSBlcnJvcnMgb24gY2xvc2VcbiAgICAgIH1cbiAgICAgIHRoaXMubG9nRmlsZUZkID0gbnVsbDtcbiAgICB9XG5cbiAgICB0aGlzLmxvZ0ZpbGVQYXRoID0gZmlsZVBhdGg7XG4gICAgdGhpcy5maWxlSW5pdGlhbGl6ZWQgPSBmYWxzZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDbG9zZXMgYWxsIHJlc291cmNlcyBoZWxkIGJ5IHRoZSBsb2dnZXIuXG4gICAqXG4gICAqIENhbGwgdGhpcyBkdXJpbmcgZ3JhY2VmdWwgc2h1dGRvd24gdG8gZW5zdXJlIGFsbCBsb2cgZGF0YSBpcyBmbHVzaGVkLlxuICAgKiBTYWZlIHRvIGNhbGwgbXVsdGlwbGUgdGltZXMuXG4gICAqIEBleGFtcGxlXG4gICAqIGBgYHR5cGVzY3JpcHRcbiAgICogcHJvY2Vzcy5vbignZXhpdCcsICgpID0+IHtcbiAgICogICBsb2dnZXIuY2xvc2UoKTtcbiAgICogfSk7XG4gICAqIGBgYFxuICAgKi9cbiAgY2xvc2UoKTogdm9pZCB7XG4gICAgaWYgKHRoaXMubG9nRmlsZUZkICE9PSBudWxsKSB7XG4gICAgICB0cnkge1xuICAgICAgICBjbG9zZVN5bmModGhpcy5sb2dGaWxlRmQpO1xuICAgICAgfSBjYXRjaCB7XG4gICAgICAgIC8vIElnbm9yZSBlcnJvcnMgb24gY2xvc2VcbiAgICAgIH1cbiAgICAgIHRoaXMubG9nRmlsZUZkID0gbnVsbDtcbiAgICB9XG4gICAgdGhpcy5maWxlSW5pdGlhbGl6ZWQgPSBmYWxzZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDaGVja3MgaWYgdGhlcmUgYXJlIGFueSBhY3RpdmUgaGFuZGxlcnMgb3IgZGVzdGluYXRpb25zLlxuICAgKlxuICAgKiBSZXR1cm5zIHRydWUgaWYgYW55IGhhbmRsZXJzIGFyZSByZWdpc3RlcmVkIG9yIGZpbGUgbG9nZ2luZyBpcyBlbmFibGVkLlxuICAgKiBVc2VmdWwgZm9yIGRlY2lkaW5nIHdoZXRoZXIgdG8gY29tcHV0ZSBleHBlbnNpdmUgbG9nIGNvbnRleHQuXG4gICAqIEByZXR1cm5zIFdoZXRoZXIgdGhlIGxvZ2dlciBoYXMgYW55IGFjdGl2ZSBvdXRwdXQgZGVzdGluYXRpb25zXG4gICAqL1xuICBoYXNEZXN0aW5hdGlvbnMoKTogYm9vbGVhbiB7XG4gICAgY29uc3QgaGFzSGFuZGxlcnMgPSBBcnJheS5mcm9tKHRoaXMuaGFuZGxlcnMudmFsdWVzKCkpLnNvbWUoKGhhbmRsZXJzKSA9PiBoYW5kbGVycy5zaXplID4gMCk7XG4gICAgcmV0dXJuIGhhc0hhbmRsZXJzIHx8IHRoaXMubG9nRmlsZVBhdGggIT09IG51bGw7XG4gIH1cblxuICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gIC8vIFByaXZhdGUgTWV0aG9kc1xuICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbiAgLyoqXG4gICAqIEVtaXRzIGEgbG9nIGV2ZW50LlxuICAgKiBAcGFyYW0gbGV2ZWwgLSBUaGUgc2V2ZXJpdHkgbGV2ZWwgb2YgdGhlIGV2ZW50XG4gICAqIEBwYXJhbSBtZXNzYWdlIC0gVGhlIGxvZyBtZXNzYWdlXG4gICAqIEBwYXJhbSBjb250ZXh0IC0gT3B0aW9uYWwgYWRkaXRpb25hbCBjb250ZXh0IGRhdGFcbiAgICovXG4gIHByaXZhdGUgZW1pdChsZXZlbDogTG9nTGV2ZWwsIG1lc3NhZ2U6IHN0cmluZywgY29udGV4dD86IFJlY29yZDxzdHJpbmcsIHVua25vd24+KTogdm9pZCB7XG4gICAgY29uc3QgZXZlbnQ6IExvZ0V2ZW50ID0ge1xuICAgICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXG4gICAgICBsZXZlbCxcbiAgICAgIGhvb2tUeXBlOiB0aGlzLmN1cnJlbnRIb29rVHlwZSxcbiAgICAgIG1lc3NhZ2UsXG4gICAgICBpbnB1dDogdGhpcy5jdXJyZW50SW5wdXQsXG4gICAgICBjb250ZXh0XG4gICAgfTtcblxuICAgIHRoaXMuZGVsaXZlckV2ZW50KGV2ZW50KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBEZWxpdmVycyBhbiBldmVudCB0byBhbGwgcmVnaXN0ZXJlZCBkZXN0aW5hdGlvbnMuXG4gICAqIEBwYXJhbSBldmVudCAtIFRoZSBsb2cgZXZlbnQgdG8gZGVsaXZlclxuICAgKi9cbiAgcHJpdmF0ZSBkZWxpdmVyRXZlbnQoZXZlbnQ6IExvZ0V2ZW50KTogdm9pZCB7XG4gICAgLy8gRGVsaXZlciB0byBldmVudCBoYW5kbGVyc1xuICAgIGNvbnN0IGxldmVsSGFuZGxlcnMgPSB0aGlzLmhhbmRsZXJzLmdldChldmVudC5sZXZlbCk7XG4gICAgaWYgKGxldmVsSGFuZGxlcnMpIHtcbiAgICAgIGZvciAoY29uc3QgaGFuZGxlciBvZiBsZXZlbEhhbmRsZXJzKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgaGFuZGxlcihldmVudCk7XG4gICAgICAgIH0gY2F0Y2gge1xuICAgICAgICAgIC8vIFNpbGVudGx5IGlnbm9yZSBoYW5kbGVyIGVycm9ycyB0byBub3QgZGlzcnVwdCBob29rIGV4ZWN1dGlvblxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gV3JpdGUgdG8gZmlsZSBpZiBjb25maWd1cmVkXG4gICAgdGhpcy53cml0ZVRvRmlsZShldmVudCk7XG4gIH1cblxuICAvKipcbiAgICogV3JpdGVzIGFuIGV2ZW50IHRvIHRoZSBsb2cgZmlsZS5cbiAgICogQHBhcmFtIGV2ZW50IC0gVGhlIGxvZyBldmVudCB0byB3cml0ZVxuICAgKi9cbiAgcHJpdmF0ZSB3cml0ZVRvRmlsZShldmVudDogTG9nRXZlbnQpOiB2b2lkIHtcbiAgICBpZiAoIXRoaXMubG9nRmlsZVBhdGgpIHJldHVybjtcblxuICAgIC8vIExhenkgaW5pdGlhbGl6YXRpb24gb2YgZmlsZSBoYW5kbGVcbiAgICBpZiAoIXRoaXMuZmlsZUluaXRpYWxpemVkKSB7XG4gICAgICB0aGlzLmluaXRpYWxpemVGaWxlKCk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMubG9nRmlsZUZkID09PSBudWxsKSByZXR1cm47XG5cbiAgICB0cnkge1xuICAgICAgY29uc3QgbGluZSA9IGAke0pTT04uc3RyaW5naWZ5KGV2ZW50KX1cXG5gO1xuICAgICAgd3JpdGVTeW5jKHRoaXMubG9nRmlsZUZkLCBsaW5lKTtcbiAgICB9IGNhdGNoIHtcbiAgICAgIC8vIFNpbGVudGx5IGlnbm9yZSBmaWxlIHdyaXRlIGVycm9ycyB0byBub3QgZGlzcnVwdCBob29rIGV4ZWN1dGlvblxuICAgICAgLy8gVGhpcyBmb2xsb3dzIHRoZSByaXNrIG1pdGlnYXRpb246IFwiR3JhY2VmdWwgZGVncmFkYXRpb24gLSBsb2cgd3JpdGVcbiAgICAgIC8vIGZhaWx1cmVzIGFyZSBzaWxlbnRseSBpZ25vcmVkIHRvIG5vdCBkaXNydXB0IGhvb2sgZXhlY3V0aW9uXCJcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogSW5pdGlhbGl6ZXMgdGhlIGxvZyBmaWxlIGZvciB3cml0aW5nLlxuICAgKi9cbiAgcHJpdmF0ZSBpbml0aWFsaXplRmlsZSgpOiB2b2lkIHtcbiAgICB0aGlzLmZpbGVJbml0aWFsaXplZCA9IHRydWU7XG5cbiAgICBpZiAoIXRoaXMubG9nRmlsZVBhdGgpIHJldHVybjtcblxuICAgIHRyeSB7XG4gICAgICAvLyBFbnN1cmUgZGlyZWN0b3J5IGV4aXN0c1xuICAgICAgY29uc3QgZGlyID0gZGlybmFtZSh0aGlzLmxvZ0ZpbGVQYXRoKTtcbiAgICAgIGlmICghZXhpc3RzU3luYyhkaXIpKSB7XG4gICAgICAgIG1rZGlyU3luYyhkaXIsIHsgcmVjdXJzaXZlOiB0cnVlIH0pO1xuICAgICAgfVxuXG4gICAgICAvLyBPcGVuIGZpbGUgZm9yIGFwcGVuZGluZ1xuICAgICAgdGhpcy5sb2dGaWxlRmQgPSBvcGVuU3luYyh0aGlzLmxvZ0ZpbGVQYXRoLCAnYScpO1xuICAgIH0gY2F0Y2gge1xuICAgICAgLy8gU2lsZW50bHkgaWdub3JlIGZpbGUgaW5pdGlhbGl6YXRpb24gZXJyb3JzXG4gICAgICB0aGlzLmxvZ0ZpbGVGZCA9IG51bGw7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEV4dHJhY3RzIHN0cnVjdHVyZWQgZXJyb3IgaW5mb3JtYXRpb24gZnJvbSBhbiB1bmtub3duIGVycm9yLlxuICAgKiBAcGFyYW0gZXJyb3IgLSBUaGUgZXJyb3IgdG8gZXh0cmFjdCBpbmZvcm1hdGlvbiBmcm9tXG4gICAqIEByZXR1cm5zIFN0cnVjdHVyZWQgZXJyb3IgaW5mb3JtYXRpb25cbiAgICovXG4gIHByaXZhdGUgZXh0cmFjdEVycm9ySW5mbyhlcnJvcjogdW5rbm93bik6IExvZ0V2ZW50RXJyb3Ige1xuICAgIGlmIChlcnJvciBpbnN0YW5jZW9mIEVycm9yKSB7XG4gICAgICBjb25zdCBpbmZvOiBMb2dFdmVudEVycm9yID0ge1xuICAgICAgICBuYW1lOiBlcnJvci5uYW1lLFxuICAgICAgICBtZXNzYWdlOiBlcnJvci5tZXNzYWdlLFxuICAgICAgICBzdGFjazogZXJyb3Iuc3RhY2tcbiAgICAgIH07XG5cbiAgICAgIC8vIEV4dHJhY3QgY2F1c2UgY2hhaW4gaWYgcHJlc2VudFxuICAgICAgaWYgKGVycm9yLmNhdXNlICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgaW5mby5jYXVzZSA9IHRoaXMuZXh0cmFjdEVycm9ySW5mbyhlcnJvci5jYXVzZSk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBpbmZvO1xuICAgIH1cblxuICAgIC8vIEhhbmRsZSBub24tRXJyb3IgdmFsdWVzXG4gICAgcmV0dXJuIHtcbiAgICAgIG5hbWU6ICdVbmtub3duRXJyb3InLFxuICAgICAgbWVzc2FnZTogU3RyaW5nKGVycm9yKVxuICAgIH07XG4gIH1cbn1cblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gU2luZ2xldG9uIEV4cG9ydFxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4vKipcbiAqIEdsb2JhbCBsb2dnZXIgaW5zdGFuY2UgZm9yIENhcmRzIEV4dGVuc2lvbiBob29rcy5cbiAqXG4gKiBVc2UgdGhpcyBzaW5nbGV0b24gZm9yIGFsbCBsb2dnaW5nIHdpdGhpbiBob29rcy4gVGhlIGxvZ2dlciBpcyBjb25maWd1cmVkXG4gKiB2aWEgZW52aXJvbm1lbnQgdmFyaWFibGVzIGFuZCBzdXBwb3J0cyBldmVudCBzdWJzY3JpcHRpb24gZm9yIGN1c3RvbVxuICogZGVzdGluYXRpb25zLlxuICpcbiAqICMjIENvbmZpZ3VyYXRpb25cbiAqXG4gKiB8IEVudmlyb25tZW50IFZhcmlhYmxlIHwgRGVzY3JpcHRpb24gfFxuICogfC0tLS0tLS0tLS0tLS0tLS0tLS0tLXwtLS0tLS0tLS0tLS0tfFxuICogfCBgQ0FSRFNfSE9PS1NfTE9HX0ZJTEVgIHwgUGF0aCB0byBsb2cgZmlsZSAoSlNPTiBMaW5lcyBmb3JtYXQpIHxcbiAqXG4gKiAjIyBVc2FnZSBpbiBIb29rc1xuICpcbiAqIFRoZSBsb2dnZXIgY2FuIGJlIHVzZWQgZGlyZWN0bHkgd2l0aGluIGhvb2sgaGFuZGxlcnM6XG4gKlxuICogYGBgdHlwZXNjcmlwdFxuICogaW1wb3J0IHsgbG9nZ2VyIH0gZnJvbSAnQGNhcmRzL3Nkay9jb25maWcnO1xuICpcbiAqIC8vIEluIGEgaG9vayBoYW5kbGVyXG4gKiBsb2dnZXIud2FybignVGFzayBzdGFydGluZyBpbiBpbnRlcmFjdGl2ZSBtb2RlJyk7XG4gKiBgYGBcbiAqXG4gKiAjIyBFeHRlcm5hbCBJbnRlZ3JhdGlvblxuICpcbiAqIFN1YnNjcmliZSB0byBldmVudHMgdG8gZm9yd2FyZCBsb2dzIHRvIGV4dGVybmFsIHN5c3RlbXM6XG4gKlxuICogYGBgdHlwZXNjcmlwdFxuICogaW1wb3J0IHsgbG9nZ2VyIH0gZnJvbSAnQGNhcmRzL3Nkay9jb25maWcnO1xuICogaW1wb3J0IHBpbm8gZnJvbSAncGlubyc7XG4gKlxuICogY29uc3QgcGlub0xvZ2dlciA9IHBpbm8oeyBsZXZlbDogJ2RlYnVnJyB9KTtcbiAqXG4gKiBsb2dnZXIub24oJ2RlYnVnJywgKGV2ZW50KSA9PiBwaW5vTG9nZ2VyLmRlYnVnKGV2ZW50LCBldmVudC5tZXNzYWdlKSk7XG4gKiBsb2dnZXIub24oJ2luZm8nLCAoZXZlbnQpID0+IHBpbm9Mb2dnZXIuaW5mbyhldmVudCwgZXZlbnQubWVzc2FnZSkpO1xuICogbG9nZ2VyLm9uKCd3YXJuJywgKGV2ZW50KSA9PiBwaW5vTG9nZ2VyLndhcm4oZXZlbnQsIGV2ZW50Lm1lc3NhZ2UpKTtcbiAqIGxvZ2dlci5vbignZXJyb3InLCAoZXZlbnQpID0+IHBpbm9Mb2dnZXIuZXJyb3IoZXZlbnQsIGV2ZW50Lm1lc3NhZ2UpKTtcbiAqIGBgYFxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIC8vIERpcmVjdCB1c2FnZVxuICogaW1wb3J0IHsgbG9nZ2VyIH0gZnJvbSAnQGNhcmRzL3Nkay9jb25maWcnO1xuICpcbiAqIGxvZ2dlci5pbmZvKCdTdGFydGluZyBvcGVyYXRpb24nKTtcbiAqIGxvZ2dlci53YXJuKCdSZXNvdXJjZSBsaW1pdCBhcHByb2FjaGluZycsIHsgdXNhZ2U6IDAuOSB9KTtcbiAqXG4gKiB0cnkge1xuICogICBhd2FpdCByaXNreU9wZXJhdGlvbigpO1xuICogfSBjYXRjaCAoZXJyKSB7XG4gKiAgIGxvZ2dlci5sb2dFcnJvcihlcnIsICdSaXNreSBvcGVyYXRpb24gZmFpbGVkJyk7XG4gKiB9XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNvbnN0IGxvZ2dlciA9IG5ldyBMb2dnZXIoKTtcbiIsICIvKipcbiAqIFNvY2tldCBjbGllbnQgZm9yIHJ1bnRpbWUtdG8tZGlzcGF0Y2hlciBjb21tdW5pY2F0aW9uLlxuICpcbiAqIENvbm5lY3RzIHRvIGEgVW5peCBkb21haW4gc29ja2V0IGNyZWF0ZWQgYnkgQWN0aW9uRGlzcGF0Y2hlciBhbmQgaGFuZGxlc1xuICogTkRKU09OIChuZXdsaW5lLWRlbGltaXRlZCBKU09OKSBwcm90b2NvbCBmb3IgcmVjZWl2aW5nIGNvbW1hbmRzIGFuZCBzZW5kaW5nXG4gKiByZXNwb25zZXMuXG4gKlxuICpcbiAqIEBzdW1tYXJ5IFNvY2tldCBjbGllbnQgZm9yIHJ1bnRpbWUtdG8tZGlzcGF0Y2hlciBjb21tdW5pY2F0aW9uXG4gKiBAbW9kdWxlXG4gKi9cblxuaW1wb3J0ICogYXMgbmV0IGZyb20gJ25vZGU6bmV0JztcblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gVHlwZXNcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuLyoqXG4gKiBDb21tYW5kcyB0aGF0IGNhbiBiZSByZWNlaXZlZCBmcm9tIHRoZSBBY3Rpb25EaXNwYXRjaGVyIHZpYSBzb2NrZXQuXG4gKlxuICogVXNlcyBOREpTT04gKG5ld2xpbmUtZGVsaW1pdGVkIEpTT04pIHByb3RvY29sLlxuICovXG5leHBvcnQgdHlwZSBTb2NrZXRDb21tYW5kID0geyB0eXBlOiAnY2FuY2VsJyB9IHwgeyB0eXBlOiAnc3dpdGNoVG9JbnRlcmFjdGl2ZScgfTtcblxuLyoqXG4gKiBSZXNwb25zZSBzZW50IGJhY2sgdG8gdGhlIEFjdGlvbkRpc3BhdGNoZXIgd2hlbiBzd2l0Y2hUb0ludGVyYWN0aXZlIGlzIGhhbmRsZWQuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgU3dpdGNoVG9JbnRlcmFjdGl2ZVJlc3BvbnNlIHtcbiAgdHlwZTogJ3N3aXRjaFRvSW50ZXJhY3RpdmVSZXNwb25zZSc7XG4gIGRhdGE6IHVua25vd247XG59XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIFNvY2tldENsaWVudFxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4vKipcbiAqIENsaWVudCBmb3IgdGhlIE5ESlNPTiBzb2NrZXQgcHJvdG9jb2wgYmV0d2VlbiB0aGUgYWN0aW9uIHJ1bnRpbWUgYW5kXG4gKiBBY3Rpb25EaXNwYXRjaGVyLlxuICpcbiAqIFJlY2VpdmVzIGNvbW1hbmRzIChjYW5jZWwsIHN3aXRjaFRvSW50ZXJhY3RpdmUpIGFuZCBzZW5kcyByZXNwb25zZXNcbiAqIChzd2l0Y2hUb0ludGVyYWN0aXZlUmVzcG9uc2UpIG92ZXIgYSBVbml4IGRvbWFpbiBzb2NrZXQuXG4gKlxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGNvbnN0IGNsaWVudCA9IGF3YWl0IFNvY2tldENsaWVudC5jb25uZWN0KCcvcGF0aC90by9zb2NrZXQnKTtcbiAqIGNsaWVudC5vbkNvbW1hbmQoKGNvbW1hbmQpID0+IHtcbiAqICAgaWYgKGNvbW1hbmQudHlwZSA9PT0gJ2NhbmNlbCcpIHsgLi4uIH1cbiAqIH0pO1xuICogYGBgXG4gKi9cbmV4cG9ydCBjbGFzcyBTb2NrZXRDbGllbnQge1xuICBwcml2YXRlIHNvY2tldDogbmV0LlNvY2tldDtcbiAgcHJpdmF0ZSBidWZmZXIgPSAnJztcbiAgcHJpdmF0ZSBjb21tYW5kSGFuZGxlcj86IChjb21tYW5kOiBTb2NrZXRDb21tYW5kKSA9PiB2b2lkO1xuXG4gIHByaXZhdGUgY29uc3RydWN0b3Ioc29ja2V0OiBuZXQuU29ja2V0KSB7XG4gICAgdGhpcy5zb2NrZXQgPSBzb2NrZXQ7XG5cbiAgICBzb2NrZXQub24oJ2RhdGEnLCAoY2h1bmspID0+IHtcbiAgICAgIHRoaXMuYnVmZmVyICs9IGNodW5rLnRvU3RyaW5nKCk7XG4gICAgICAvLyBQYXJzZSBOREpTT04gLSBzcGxpdCBieSBuZXdsaW5lc1xuICAgICAgY29uc3QgbGluZXMgPSB0aGlzLmJ1ZmZlci5zcGxpdCgnXFxuJyk7XG4gICAgICB0aGlzLmJ1ZmZlciA9IGxpbmVzLnBvcCgpID8/ICcnOyAvLyBLZWVwIGluY29tcGxldGUgbGluZSBpbiBidWZmZXJcblxuICAgICAgZm9yIChjb25zdCBsaW5lIG9mIGxpbmVzKSB7XG4gICAgICAgIGlmIChsaW5lLnRyaW0oKSA9PT0gJycpIGNvbnRpbnVlO1xuICAgICAgICB0cnkge1xuICAgICAgICAgIGNvbnN0IHBhcnNlZCA9IEpTT04ucGFyc2UobGluZSkgYXMgU29ja2V0Q29tbWFuZDtcbiAgICAgICAgICB0aGlzLmNvbW1hbmRIYW5kbGVyPy4ocGFyc2VkKTtcbiAgICAgICAgfSBjYXRjaCB7XG4gICAgICAgICAgLy8gTWFsZm9ybWVkIEpTT04gb24gc29ja2V0IGlzIGlnbm9yZWQgKHBlciBwbGFuKVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogQ29ubmVjdCB0byBhIFVuaXggZG9tYWluIHNvY2tldCBhdCB0aGUgZ2l2ZW4gcGF0aC5cbiAgICpcbiAgICogQHBhcmFtIHNvY2tldFBhdGggLSBQYXRoIHRvIHRoZSBVbml4IGRvbWFpbiBzb2NrZXRcbiAgICogQHJldHVybnMgQSBjb25uZWN0ZWQgU29ja2V0Q2xpZW50IGluc3RhbmNlXG4gICAqIEB0aHJvd3MgRXJyb3IgaWYgdGhlIGNvbm5lY3Rpb24gZmFpbHNcbiAgICovXG4gIHN0YXRpYyBjb25uZWN0KHNvY2tldFBhdGg6IHN0cmluZyk6IFByb21pc2U8U29ja2V0Q2xpZW50PiB7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgIGNvbnN0IHNvY2tldCA9IG5ldC5jcmVhdGVDb25uZWN0aW9uKHNvY2tldFBhdGgsICgpID0+IHtcbiAgICAgICAgcmVzb2x2ZShuZXcgU29ja2V0Q2xpZW50KHNvY2tldCkpO1xuICAgICAgfSk7XG4gICAgICBzb2NrZXQub24oJ2Vycm9yJywgcmVqZWN0KTtcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZWdpc3RlciBhIGhhbmRsZXIgZm9yIGluY29taW5nIHNvY2tldCBjb21tYW5kcy5cbiAgICpcbiAgICogT25seSBvbmUgaGFuZGxlciBjYW4gYmUgcmVnaXN0ZXJlZCBhdCBhIHRpbWUuIFN1YnNlcXVlbnQgY2FsbHMgcmVwbGFjZVxuICAgKiB0aGUgcHJldmlvdXMgaGFuZGxlci5cbiAgICpcbiAgICogQHBhcmFtIGhhbmRsZXIgLSBGdW5jdGlvbiB0byBjYWxsIHdoZW4gYSBjb21tYW5kIGlzIHJlY2VpdmVkXG4gICAqL1xuICBvbkNvbW1hbmQoaGFuZGxlcjogKGNvbW1hbmQ6IFNvY2tldENvbW1hbmQpID0+IHZvaWQpOiB2b2lkIHtcbiAgICB0aGlzLmNvbW1hbmRIYW5kbGVyID0gaGFuZGxlcjtcbiAgfVxuXG4gIC8qKlxuICAgKiBTZW5kIGEgcmVzcG9uc2UgYmFjayB0byB0aGUgQWN0aW9uRGlzcGF0Y2hlci5cbiAgICpcbiAgICogQHBhcmFtIHJlc3BvbnNlIC0gVGhlIHJlc3BvbnNlIHRvIHNlbmQgYXMgTkRKU09OXG4gICAqL1xuICBzZW5kUmVzcG9uc2UocmVzcG9uc2U6IFN3aXRjaFRvSW50ZXJhY3RpdmVSZXNwb25zZSk6IHZvaWQge1xuICAgIHRoaXMuc29ja2V0LndyaXRlKGAke0pTT04uc3RyaW5naWZ5KHJlc3BvbnNlKX1cXG5gKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBTZW5kIGEgcmVzcG9uc2UgYW5kIGNhbGwgY2FsbGJhY2sgd2hlbiBmbHVzaGVkLlxuICAgKlxuICAgKiBVc2VkIHRvIGd1YXJhbnRlZSBmbHVzaCBiZWZvcmUgcHJvY2Vzcy5leGl0LlxuICAgKlxuICAgKiBAcGFyYW0gcmVzcG9uc2UgLSBUaGUgcmVzcG9uc2UgdG8gc2VuZCBhcyBOREpTT05cbiAgICogQHBhcmFtIGNhbGxiYWNrIC0gQ2FsbGVkIGFmdGVyIHRoZSBkYXRhIGlzIGZsdXNoZWQgdG8gdGhlIHNvY2tldFxuICAgKi9cbiAgc2VuZFJlc3BvbnNlVGhlbihyZXNwb25zZTogU3dpdGNoVG9JbnRlcmFjdGl2ZVJlc3BvbnNlLCBjYWxsYmFjazogKCkgPT4gdm9pZCk6IHZvaWQge1xuICAgIHRoaXMuc29ja2V0LndyaXRlKGAke0pTT04uc3RyaW5naWZ5KHJlc3BvbnNlKX1cXG5gLCBjYWxsYmFjayk7XG4gIH1cblxuICAvKipcbiAgICogQ2xvc2UgdGhlIHNvY2tldCBjb25uZWN0aW9uLlxuICAgKi9cbiAgY2xvc2UoKTogdm9pZCB7XG4gICAgdGhpcy5zb2NrZXQuZGVzdHJveSgpO1xuICB9XG59XG4iLCAiLyoqXG4gKiBSdW50aW1lIG9yY2hlc3RyYXRpb24gZm9yIGNvbXBpbGVkIENhcmRzIGFjdGlvbiBhbmQgdHlwZSBoYW5kbGVycy5cbiAqXG4gKiBUaGlzIG1vZHVsZSBpcyBidW5kbGVkIGludG8gY29tcGlsZWQgaGFuZGxlcnMgYnkgdGhlIENMSS4gSXQgcHJvdmlkZXMgdGhlXG4gKiBleGVjdXRpb24gaGFybmVzcyB0aGF0IHJlYWRzIGhhbmRsZXIgaW5wdXQgZnJvbSBlbnZpcm9ubWVudCB2YXJpYWJsZXMsIHNldHNcbiAqIHVwIHRoZSBsb2dnZXIgY29udGV4dCwgaW52b2tlcyB0aGUgdXNlcidzIGhhbmRsZXIsIGFuZCBleGl0cyB0aGUgcHJvY2Vzc1xuICogd2l0aCB0aGUgYXBwcm9wcmlhdGUgY29kZS5cbiAqXG4gKiBUaGUgcnVudGltZSBpcyBkZXNpZ25lZCB0byBuZXZlciByZXR1cm4gaW4gbm9ybWFsIHVzZS4gQWxsIGNvZGUgcGF0aHNcbiAqIHRlcm1pbmF0ZSB3aXRoIGBwcm9jZXNzLmV4aXQoKWAuIFRoZSBvbmx5IGV4Y2VwdGlvbiBpcyB0ZXN0IHNjZW5hcmlvc1xuICogd2hlcmUgYHByb2Nlc3MuZXhpdGAgaXMgbW9ja2VkLlxuICpcbiAqICMjIEV4ZWN1dGlvbiBGbG93XG4gKlxuICogMS4gRXh0cmFjdCBpbnB1dCBwYXlsb2FkIGZyb20gZW52aXJvbm1lbnQgdmFyaWFibGVzIGJhc2VkIG9uIGNvbW1hbmQgdHlwZVxuICogMi4gU2V0IGxvZ2dlciBjb250ZXh0IHdpdGggY29tbWFuZCB0eXBlIGFuZCBpbnB1dFxuICogMy4gT3B0aW9uYWxseSBjb25uZWN0IHRvIFNPQ0tFVF9QQVRIIGZvciBjb21tYW5kIGRpc3BhdGNoIChmYWlsLW9wZW4pXG4gKiA0LiBCdWlsZCBBY3Rpb25Db250ZXh0IHdpdGggbG9nZ2VyLCBjd2QsIGFuZCBzb2NrZXQtYmFja2VkIGNhbGxiYWNrc1xuICogNS4gSW52b2tlIHRoZSBjb21tYW5kIHdpdGggaW5wdXQgYW5kIGNvbnRleHRcbiAqIDYuIE9uIHN1Y2Nlc3M6IGNsZWFuIHVwIHNvY2tldCBhbmQgZXhpdCB3aXRoIGNvZGUgMFxuICogNy4gT24gZXJyb3I6IGxvZyBlcnJvciwgd3JpdGUgdG8gc3RkZXJyLCBjbGVhbiB1cCBhbmQgZXhpdCB3aXRoIGNvZGUgMVxuICpcbiAqXG4gKiBAc3VtbWFyeSBSdW50aW1lIG9yY2hlc3RyYXRpb24gZm9yIGNvbXBpbGVkIENhcmRzIGFjdGlvbiBhbmQgdHlwZSBoYW5kbGVyc1xuICogQG1vZHVsZVxuICogQHNlZSB7QGxpbmsgZXhlY3V0ZUNvbW1hbmR9IGZvciB0aGUgbWFpbiBlbnRyeSBwb2ludFxuICpcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiAvLyBUaGlzIGlzIHdoYXQgY29tcGlsZWQgaGFuZGxlcnMgbG9vayBsaWtlIGludGVybmFsbHlcbiAqIGltcG9ydCB7IGV4ZWN1dGVDb21tYW5kIH0gZnJvbSAnQGNhcmRzL3Nkay9jb25maWcvcnVudGltZSc7XG4gKiBpbXBvcnQgbXlDb21tYW5kIGZyb20gJy4vbXktY29tbWFuZC5qcyc7XG4gKlxuICogZXhlY3V0ZUNvbW1hbmQobXlDb21tYW5kKTtcbiAqIGBgYFxuICovXG5cbmltcG9ydCB0eXBlIHsgQWN0aW9uQ29tbWFuZCwgVHlwZUNyZWF0ZUNvbW1hbmQsIFR5cGVEZWxldGVDb21tYW5kLCBUeXBlVXBkYXRlQ29tbWFuZCB9IGZyb20gJy4vY29tbWFuZC10eXBlcy5qcyc7XG5pbXBvcnQgeyBDQVJEU19FTlZfVkFSUywgZXh0cmFjdEFjdGlvbklucHV0LCBleHRyYWN0VHlwZUlucHV0IH0gZnJvbSAnLi9lbnYuanMnO1xuaW1wb3J0IHsgRVhJVF9DT0RFUywgd3JpdGVFcnJvciB9IGZyb20gJy4vZXhpdC1jb2Rlcy5qcyc7XG5pbXBvcnQgdHlwZSB7IEFjdGlvbkNvbnRleHQsIEFjdGlvbklucHV0LCBUeXBlSG9va0NvbnRleHQsIFR5cGVIb29rSW5wdXQgfSBmcm9tICcuL2lucHV0cy5qcyc7XG5pbXBvcnQgeyBsb2dnZXIgfSBmcm9tICcuL2xvZ2dlci5qcyc7XG5pbXBvcnQgdHlwZSB7IFNvY2tldENvbW1hbmQgfSBmcm9tICcuL3NvY2tldC1jbGllbnQuanMnO1xuaW1wb3J0IHsgU29ja2V0Q2xpZW50IH0gZnJvbSAnLi9zb2NrZXQtY2xpZW50LmpzJztcblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gQ29tbWFuZCBUeXBlIFVuaW9uXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbi8qKlxuICogVW5pb24gb2YgYWxsIGNvbW1hbmQgdHlwZXMgc3VwcG9ydGVkIGJ5IHRoZSBydW50aW1lLlxuICpcbiAqIFRoaXMgdHlwZSB1bmlvbiBhbGxvd3Mge0BsaW5rIGV4ZWN1dGVDb21tYW5kfSB0byBhY2NlcHQgYW55IGNvbW1hbmQgcmV0dXJuZWQgYnlcbiAqIHRoZSBmYWN0b3J5IGZ1bmN0aW9ucy4gVGhlIHJ1bnRpbWUgZGlzcGF0Y2hlcyBiYXNlZCBvbiB0aGUgYGZhY3RvcnlUeXBlYFxuICogZGlzY3JpbWluYW50LlxuICpcbiAqIE5vdGU6IFR5cGVWYWxpZGF0b3JDb21tYW5kIGlzIGV4Y2x1ZGVkIGJlY2F1c2UgdmFsaWRhdG9ycyB1c2UgYSBkaWZmZXJlbnRcbiAqIGV4ZWN1dGlvbiBtb2RlbCAoZmlsZS1wYXRoIHByb3RvY29sIHZpYSB7QGxpbmsgZXhlY3V0ZVZhbGlkYXRpb259KS5cbiAqXG4gKiBAaW50ZXJuYWxcbiAqL1xudHlwZSBBbnlDb21tYW5kID0gQWN0aW9uQ29tbWFuZCB8IFR5cGVDcmVhdGVDb21tYW5kIHwgVHlwZVVwZGF0ZUNvbW1hbmQgfCBUeXBlRGVsZXRlQ29tbWFuZDtcblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gSGVscGVyIEZ1bmN0aW9uc1xuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4vKipcbiAqIE5vcm1hbGl6ZXMgYW4gdW5rbm93biBlcnJvciB2YWx1ZSBpbnRvIGEgaHVtYW4tcmVhZGFibGUgbWVzc2FnZS5cbiAqXG4gKiBFcnJvcnMgaW4gSmF2YVNjcmlwdCBjYW4gYmUgdGhyb3duIHdpdGggYW55IHZhbHVlLiBUaGlzIGZ1bmN0aW9uIGVuc3VyZXNcbiAqIHdlIGFsd2F5cyBnZXQgYSBzdHJpbmcgbWVzc2FnZSByZWdhcmRsZXNzIG9mIHdoYXQgd2FzIHRocm93bi5cbiAqXG4gKiBAcGFyYW0gZXJyb3IgLSBUaGUgY2F1Z2h0IGVycm9yIHZhbHVlLCB3aGljaCBtYXkgb3IgbWF5IG5vdCBiZSBhbiBFcnJvciBpbnN0YW5jZVxuICogQHJldHVybnMgQSBzdHJpbmcgbWVzc2FnZSBzdWl0YWJsZSBmb3IgbG9nZ2luZyBvciBkaXNwbGF5XG4gKlxuICogQGludGVybmFsXG4gKi9cbmZ1bmN0aW9uIGdldEVycm9yTWVzc2FnZShlcnJvcjogdW5rbm93bik6IHN0cmluZyB7XG4gIHJldHVybiBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6IFN0cmluZyhlcnJvcik7XG59XG5cbi8qKlxuICogQ2xlYW5zIHVwIGxvZ2dlciBzdGF0ZSBhbmQgdGVybWluYXRlcyB0aGUgcHJvY2Vzcy5cbiAqXG4gKiBUaGlzIGZ1bmN0aW9uIG5ldmVyIHJldHVybnMuIEl0IGNsZWFycyB0aGUgbG9nZ2VyJ3MgY29udGV4dCwgY2xvc2VzXG4gKiBvcGVuIGZpbGUgaGFuZGxlcyB0byBmbHVzaCBwZW5kaW5nIHdyaXRlcywgYW5kIGV4aXRzIHdpdGggdGhlIHNwZWNpZmllZFxuICogY29kZS5cbiAqXG4gKiBAcGFyYW0gZXhpdENvZGUgLSBUaGUgZXhpdCBjb2RlIHRvIHBhc3MgdG8gYHByb2Nlc3MuZXhpdCgpYFxuICogQHJldHVybnMgTmV2ZXIgcmV0dXJuczsgcHJvY2VzcyB0ZXJtaW5hdGVzXG4gKlxuICogQGludGVybmFsXG4gKi9cbmZ1bmN0aW9uIGNsZWFudXBBbmRFeGl0KGV4aXRDb2RlOiBudW1iZXIpOiBuZXZlciB7XG4gIGxvZ2dlci5jbGVhckNvbnRleHQoKTtcbiAgbG9nZ2VyLmNsb3NlKCk7XG4gIHByb2Nlc3MuZXhpdChleGl0Q29kZSk7XG59XG5cbi8qKlxuICogSGFuZGxlcyBlcnJvcnMgZHVyaW5nIGVudmlyb25tZW50IHZhcmlhYmxlIGV4dHJhY3Rpb24uXG4gKlxuICogRW52aXJvbm1lbnQgZXh0cmFjdGlvbiBjYW4gZmFpbCBpZiByZXF1aXJlZCB2YXJpYWJsZXMgYXJlIG1pc3Npbmcgb3JcbiAqIG1hbGZvcm1lZC4gVGhpcyBwcm92aWRlcyB1c2VyLWZyaWVuZGx5IGVycm9yIG91dHB1dCBhbmQgZW5zdXJlcyBwcm9wZXJcbiAqIGNsZWFudXAgYmVmb3JlIGV4aXQuXG4gKlxuICogQHBhcmFtIGVycm9yIC0gVGhlIGVycm9yIHRocm93biBkdXJpbmcgZXh0cmFjdGlvblxuICogQHJldHVybnMgTmV2ZXIgcmV0dXJuczsgcHJvY2VzcyB0ZXJtaW5hdGVzIHdpdGggZXJyb3IgY29kZVxuICpcbiAqIEBpbnRlcm5hbFxuICovXG5mdW5jdGlvbiBoYW5kbGVFbnZFeHRyYWN0aW9uRXJyb3IoZXJyb3I6IHVua25vd24pOiBuZXZlciB7XG4gIGNvbnN0IG1lc3NhZ2UgPSBnZXRFcnJvck1lc3NhZ2UoZXJyb3IpO1xuICBsb2dnZXIuZXJyb3IoYEZhaWxlZCB0byBleHRyYWN0IGlucHV0IGZyb20gZW52aXJvbm1lbnQ6ICR7bWVzc2FnZX1gKTtcbiAgd3JpdGVFcnJvcihgSGFuZGxlciBmYWlsZWQ6ICR7bWVzc2FnZX1gKTtcbiAgY2xlYW51cEFuZEV4aXQoRVhJVF9DT0RFUy5FUlJPUik7XG59XG5cbi8qKlxuICogSGFuZGxlcyBlcnJvcnMgdGhyb3duIGJ5IHRoZSB1c2VyJ3MgY29tbWFuZCBoYW5kbGVyLlxuICpcbiAqIFdoZW4gYSBoYW5kbGVyIHRocm93cyBvciByZWplY3RzLCB3ZSB3YW50IHRvIHByb3ZpZGUgdXNlZnVsIGRlYnVnZ2luZ1xuICogaW5mb3JtYXRpb24uIFRoaXMgd3JpdGVzIHRoZSBmdWxsIHN0YWNrIHRyYWNlIHRvIHN0ZGVyciAod2hpY2ggdGhlXG4gKiBleGVjdXRpb24gd3JhcHBlciBjYXB0dXJlcykgYW5kIGxvZ3MgYSBzdHJ1Y3R1cmVkIGVycm9yIGV2ZW50LlxuICpcbiAqIEBwYXJhbSBlcnJvciAtIFRoZSBlcnJvciB0aHJvd24gb3IgcmVqZWN0aW9uIHJlYXNvbiBmcm9tIHRoZSBoYW5kbGVyXG4gKiBAcmV0dXJucyBOZXZlciByZXR1cm5zOyBwcm9jZXNzIHRlcm1pbmF0ZXMgd2l0aCBlcnJvciBjb2RlXG4gKlxuICogQGludGVybmFsXG4gKi9cbmZ1bmN0aW9uIGhhbmRsZUhhbmRsZXJFcnJvcihlcnJvcjogdW5rbm93bik6IG5ldmVyIHtcbiAgY29uc3QgZXJyb3JPdXRwdXQgPSBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gKGVycm9yLnN0YWNrID8/IGVycm9yLm1lc3NhZ2UpIDogU3RyaW5nKGVycm9yKTtcbiAgcHJvY2Vzcy5zdGRlcnIud3JpdGUoYCR7ZXJyb3JPdXRwdXR9XFxuYCk7XG4gIGxvZ2dlci5lcnJvcihgSGFuZGxlciBlcnJvcjogJHtnZXRFcnJvck1lc3NhZ2UoZXJyb3IpfWApO1xuICBjbGVhbnVwQW5kRXhpdChFWElUX0NPREVTLkVSUk9SKTtcbn1cblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gRXhlY3V0ZSBGdW5jdGlvblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4vKipcbiAqIEV4ZWN1dGVzIGEgY29tbWFuZCBoYW5kbGVyIHdpdGggZnVsbCBydW50aW1lIG9yY2hlc3RyYXRpb24uXG4gKlxuICogVGhpcyBpcyB0aGUgbWFpbiBlbnRyeSBwb2ludCB0aGF0IGNvbXBpbGVkIGhhbmRsZXJzIHVzZS4gVGhlIENMSSBnZW5lcmF0ZXNcbiAqIHdyYXBwZXIgY29kZSB0aGF0IGltcG9ydHMgdGhlIHVzZXIncyBjb21tYW5kIGFuZCBwYXNzZXMgaXQgdG8gdGhpcyBmdW5jdGlvbi5cbiAqIEZyb20gdGhlcmUsIGV4ZWN1dGVDb21tYW5kIGhhbmRsZXMgYWxsIHRoZSBjZXJlbW9ueTogZW52aXJvbm1lbnQgcGFyc2luZywgbG9nZ2luZ1xuICogc2V0dXAsIGhhbmRsZXIgaW52b2NhdGlvbiwgZXJyb3IgaGFuZGxpbmcsIGFuZCBwcm9jZXNzIHRlcm1pbmF0aW9uLlxuICpcbiAqIFRoZSBmdW5jdGlvbiBleGl0cyB0aGUgcHJvY2VzcyBpbiBhbGwgbm9ybWFsIGNvZGUgcGF0aHMuIFRoZSByZXR1cm5lZFxuICogcHJvbWlzZSBvbmx5IHJlc29sdmVzIGlmIGBwcm9jZXNzLmV4aXRgIGlzIG1vY2tlZCwgd2hpY2ggaGFwcGVucyBpbiB0ZXN0XG4gKiBzY2VuYXJpb3MuIFByb2R1Y3Rpb24gY29kZSBzaG91bGQgbm90IGF3YWl0IHRoaXMgZnVuY3Rpb24gb3IgZXhwZWN0IGl0XG4gKiB0byByZXR1cm4uXG4gKlxuICogIyMgU3VwcG9ydGVkIENvbW1hbmQgVHlwZXNcbiAqXG4gKiAtICoqQWN0aW9uKiogKGBhY3Rpb25gKTogSW52b2tlZCB3aGVuIGFuIGFjdGlvbiBpcyB0cmlnZ2VyZWRcbiAqIC0gKipUeXBlIENyZWF0ZSoqIChgdHlwZUNyZWF0ZWApOiBSdW5zIGFmdGVyIG5ldyB0eXBlZCBmaWxlIGNyZWF0aW9uXG4gKiAtICoqVHlwZSBVcGRhdGUqKiAoYHR5cGVVcGRhdGVgKTogUnVucyBhZnRlciB0eXBlZCBmaWxlIG1vZGlmaWNhdGlvblxuICogLSAqKlR5cGUgRGVsZXRlKiogKGB0eXBlRGVsZXRlYCk6IFJ1bnMgd2hlbiB0eXBlZCBmaWxlIGlzIGRlbGV0ZWRcbiAqXG4gKiBOb3RlOiBUeXBlIHZhbGlkYXRvcnMgdXNlIGEgZGlmZmVyZW50IGV4ZWN1dGlvbiBtb2RlbCAoZmlsZS1wYXRoIHByb3RvY29sKVxuICogYW5kIHNob3VsZCBiZSBleGVjdXRlZCB2aWEge0BsaW5rIGV4ZWN1dGVWYWxpZGF0aW9ufSBpbnN0ZWFkLlxuICpcbiAqICMjIEVycm9yIEhhbmRsaW5nXG4gKlxuICogRXJyb3JzIGFyZSBoYW5kbGVkIGF0IHRocmVlIGxldmVsczpcbiAqXG4gKiAxLiAqKkVudmlyb25tZW50IGV4dHJhY3Rpb24gZXJyb3JzKiogKG1pc3NpbmcvaW52YWxpZCB2YXJpYWJsZXMpOiBMb2cgdGhlXG4gKiAgICBlcnJvciBhbmQgZXhpdC4gVGhlc2UgaW5kaWNhdGUgYSBwcm9ibGVtIHdpdGggaG93IHRoZSBoYW5kbGVyIHdhcyBpbnZva2VkLlxuICpcbiAqIDIuICoqSGFuZGxlciBlcnJvcnMqKiAodXNlciBjb2RlIHRocm93cyk6IFdyaXRlIHRoZSBzdGFjayB0cmFjZSB0byBzdGRlcnIsXG4gKiAgICBsb2cgYSBzdHJ1Y3R1cmVkIGVycm9yLCBhbmQgZXhpdC4gVGhlIGV4ZWN1dGlvbiB3cmFwcGVyIGNhcHR1cmVzIHN0ZGVyclxuICogICAgZm9yIGRlYnVnZ2luZy5cbiAqXG4gKiAzLiAqKlVuZXhwZWN0ZWQgZXJyb3JzKio6IENhdGNoLWFsbCBmb3IgYW55IG90aGVyIGZhaWx1cmVzIGR1cmluZyBydW50aW1lXG4gKiAgICBvcmNoZXN0cmF0aW9uLlxuICpcbiAqIEBwYXJhbSBjb21tYW5kIC0gVGhlIGNvbW1hbmQgdG8gZXhlY3V0ZSwgcmV0dXJuZWQgZnJvbSBhIGZhY3RvcnkgZnVuY3Rpb25cbiAqIEByZXR1cm5zIEEgcHJvbWlzZSB0aGF0IHJlc29sdmVzIG9ubHkgd2hlbiBgcHJvY2Vzcy5leGl0YCBpcyBtb2NrZWQgKHRlc3RzKVxuICpcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiAvLyBHZW5lcmF0ZWQgd3JhcHBlciBjb2RlIChwcm9kdWNlZCBieSBDTEkpXG4gKiBpbXBvcnQgeyBleGVjdXRlQ29tbWFuZCB9IGZyb20gJ0BjYXJkcy9zZGsvY29uZmlnL3J1bnRpbWUnO1xuICogaW1wb3J0IGNvbW1hbmQgZnJvbSAnLi91c2VyLWNvbW1hbmQuanMnO1xuICpcbiAqIC8vIFRoaXMgY2FsbCBuZXZlciByZXR1cm5zIGluIHByb2R1Y3Rpb25cbiAqIGV4ZWN1dGVDb21tYW5kKGNvbW1hbmQpO1xuICogYGBgXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBleGVjdXRlQ29tbWFuZChjb21tYW5kOiBBbnlDb21tYW5kKTogUHJvbWlzZTx2b2lkPiB7XG4gIHRyeSB7XG4gICAgbGV0IGlucHV0OiBBY3Rpb25JbnB1dCB8IFR5cGVIb29rSW5wdXQ7XG5cbiAgICB0cnkge1xuICAgICAgaWYgKGNvbW1hbmQuZmFjdG9yeVR5cGUgPT09ICdhY3Rpb24nKSB7XG4gICAgICAgIGlucHV0ID0gZXh0cmFjdEFjdGlvbklucHV0KCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpbnB1dCA9IGV4dHJhY3RUeXBlSW5wdXQoKTtcbiAgICAgIH1cbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgcmV0dXJuIGhhbmRsZUVudkV4dHJhY3Rpb25FcnJvcihlcnJvcik7XG4gICAgfVxuXG4gICAgLy8gU2V0IGxvZ2dlciBjb250ZXh0IHdpdGggY29tbWFuZCB0eXBlXG4gICAgbG9nZ2VyLnNldENvbnRleHQoY29tbWFuZC5mYWN0b3J5VHlwZSwgeyAuLi5pbnB1dCB9KTtcblxuICAgIGlmIChjb21tYW5kLmZhY3RvcnlUeXBlID09PSAnYWN0aW9uJykge1xuICAgICAgLy8gU29ja2V0IGNvbm5lY3Rpb24gYW5kIEFjdGlvbkNvbnRleHQgZm9yIGFjdGlvbiBjb21tYW5kc1xuICAgICAgbGV0IHNvY2tldENsaWVudDogU29ja2V0Q2xpZW50IHwgdW5kZWZpbmVkO1xuICAgICAgY29uc3Qgc29ja2V0UGF0aCA9IHByb2Nlc3MuZW52W0NBUkRTX0VOVl9WQVJTLlNPQ0tFVF9QQVRIXTtcbiAgICAgIGlmIChzb2NrZXRQYXRoKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgc29ja2V0Q2xpZW50ID0gYXdhaXQgU29ja2V0Q2xpZW50LmNvbm5lY3Qoc29ja2V0UGF0aCk7XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgbG9nZ2VyLndhcm4oYEZhaWxlZCB0byBjb25uZWN0IHRvIHNvY2tldCBhdCAke3NvY2tldFBhdGh9OiAke2dldEVycm9yTWVzc2FnZShlcnJvcil9YCk7XG4gICAgICAgICAgLy8gRmFpbC1vcGVuOiBjb250aW51ZSB3aXRob3V0IHNvY2tldFxuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIC8vIENhbGxiYWNrIHJlZ2lzdHJhdGlvbiBzdGF0ZVxuICAgICAgbGV0IGNhbmNlbENhbGxiYWNrOiAoKCkgPT4gdm9pZCB8IFByb21pc2U8dm9pZD4pIHwgdW5kZWZpbmVkO1xuICAgICAgbGV0IHN3aXRjaFRvSW50ZXJhY3RpdmVDYWxsYmFjazogKCgpID0+IHVua25vd24gfCBQcm9taXNlPHVua25vd24+KSB8IHVuZGVmaW5lZDtcbiAgICAgIGxldCBjb21tYW5kUHJvY2Vzc2VkID0gZmFsc2U7XG5cbiAgICAgIC8vIEJ1aWxkIEFjdGlvbkNvbnRleHQgd2l0aCBsb2dnZXIsIGN3ZCwgYW5kIHNvY2tldC1iYWNrZWQgY2FsbGJhY2tzXG4gICAgICBjb25zdCBjb250ZXh0OiBBY3Rpb25Db250ZXh0ID0ge1xuICAgICAgICBsb2dnZXIsXG4gICAgICAgIGN3ZDogcHJvY2Vzcy5jd2QoKSxcbiAgICAgICAgb25DYW5jZWw6IChjYWxsYmFjaykgPT4ge1xuICAgICAgICAgIGNhbmNlbENhbGxiYWNrID0gY2FsbGJhY2s7XG4gICAgICAgIH0sXG4gICAgICAgIG9uU3dpdGNoVG9JbnRlcmFjdGl2ZTogKGNhbGxiYWNrKSA9PiB7XG4gICAgICAgICAgc3dpdGNoVG9JbnRlcmFjdGl2ZUNhbGxiYWNrID0gY2FsbGJhY2s7XG4gICAgICAgIH1cbiAgICAgIH07XG5cbiAgICAgIC8vIFdpcmUgc29ja2V0IGNvbW1hbmQgZGlzcGF0Y2hcbiAgICAgIGlmIChzb2NrZXRDbGllbnQpIHtcbiAgICAgICAgc29ja2V0Q2xpZW50Lm9uQ29tbWFuZCgoY21kOiBTb2NrZXRDb21tYW5kKSA9PiB7XG4gICAgICAgICAgLy8gRmlyc3Qtd2lucyBzZW1hbnRpY3M6IGlnbm9yZSBzdWJzZXF1ZW50IGNvbW1hbmRzXG4gICAgICAgICAgaWYgKGNvbW1hbmRQcm9jZXNzZWQpIHJldHVybjtcbiAgICAgICAgICBjb21tYW5kUHJvY2Vzc2VkID0gdHJ1ZTtcblxuICAgICAgICAgIGlmIChjbWQudHlwZSA9PT0gJ2NhbmNlbCcpIHtcbiAgICAgICAgICAgIGhhbmRsZUNhbmNlbENvbW1hbmQoY2FuY2VsQ2FsbGJhY2ssIHNvY2tldENsaWVudCk7XG4gICAgICAgICAgfSBlbHNlIGlmIChjbWQudHlwZSA9PT0gJ3N3aXRjaFRvSW50ZXJhY3RpdmUnKSB7XG4gICAgICAgICAgICBoYW5kbGVTd2l0Y2hUb0ludGVyYWN0aXZlQ29tbWFuZChzd2l0Y2hUb0ludGVyYWN0aXZlQ2FsbGJhY2ssIHNvY2tldENsaWVudCEpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIC8vIEV4ZWN1dGUgdGhlIGFjdGlvbiBjb21tYW5kIGhhbmRsZXJcbiAgICAgIHRyeSB7XG4gICAgICAgIGF3YWl0IGNvbW1hbmQoaW5wdXQgYXMgQWN0aW9uSW5wdXQsIGNvbnRleHQpO1xuICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgc29ja2V0Q2xpZW50Py5jbG9zZSgpO1xuICAgICAgICByZXR1cm4gaGFuZGxlSGFuZGxlckVycm9yKGVycm9yKTtcbiAgICAgIH1cblxuICAgICAgLy8gQ2xlYW4gdXAgc29ja2V0IGFuZCBleGl0IHN1Y2Nlc3NmdWxseVxuICAgICAgc29ja2V0Q2xpZW50Py5jbG9zZSgpO1xuICAgICAgY2xlYW51cEFuZEV4aXQoRVhJVF9DT0RFUy5TVUNDRVNTKTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gVHlwZUhvb2tDb250ZXh0IGZvciB0eXBlIGxpZmVjeWNsZSBob29rc1xuICAgICAgY29uc3QgY29udGV4dDogVHlwZUhvb2tDb250ZXh0ID0ge1xuICAgICAgICBsb2dnZXIsXG4gICAgICAgIGN3ZDogcHJvY2Vzcy5jd2QoKVxuICAgICAgfTtcblxuICAgICAgLy8gRXhlY3V0ZSB0aGUgdHlwZSBob29rIGNvbW1hbmQgaGFuZGxlclxuICAgICAgdHJ5IHtcbiAgICAgICAgYXdhaXQgY29tbWFuZChpbnB1dCBhcyBUeXBlSG9va0lucHV0LCBjb250ZXh0KTtcbiAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgIHJldHVybiBoYW5kbGVIYW5kbGVyRXJyb3IoZXJyb3IpO1xuICAgICAgfVxuXG4gICAgICBjbGVhbnVwQW5kRXhpdChFWElUX0NPREVTLlNVQ0NFU1MpO1xuICAgIH1cbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAvLyBVbmV4cGVjdGVkIGVycm9yIC0gdHJ5IHRvIGNsZWFuIHVwIGFuZCBleGl0XG4gICAgbG9nZ2VyLmVycm9yKGBVbmV4cGVjdGVkIHJ1bnRpbWUgZXJyb3I6ICR7Z2V0RXJyb3JNZXNzYWdlKGVycm9yKX1gKTtcbiAgICBjbGVhbnVwQW5kRXhpdChFWElUX0NPREVTLkVSUk9SKTtcbiAgfVxufVxuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBTb2NrZXQgQ29tbWFuZCBIYW5kbGVyc1xuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4vKipcbiAqIFJlc29sdmVzIGEgY2FsbGJhY2sgcmVzdWx0IHRoYXQgbWF5IGJlIHN5bmMgb3IgYXN5bmMgaW50byBhIFByb21pc2UuXG4gKlxuICogVXNlci1yZWdpc3RlcmVkIGNhbGxiYWNrcyBtYXkgcmV0dXJuIHZvaWQsIGEgdmFsdWUsIG9yIGEgUHJvbWlzZS5cbiAqIFRoaXMgbm9ybWFsaXplcyBhbGwgY2FzZXMgaW50byBhIHNpbmdsZSBQcm9taXNlIGZvciBjb25zaXN0ZW50IGhhbmRsaW5nLlxuICpcbiAqIEBwYXJhbSByZXN1bHQgLSBDYWxsYmFjayByZXR1cm4gdmFsdWUgdGhhdCBtYXkgYWxyZWFkeSBiZSBhIHByb21pc2UuXG4gKiBAcmV0dXJucyBQcm9taXNlIHJlc29sdmluZyB0byB0aGUgY2FsbGJhY2sgcmVzdWx0LlxuICogQGludGVybmFsXG4gKi9cbmZ1bmN0aW9uIHRvUHJvbWlzZTxUPihyZXN1bHQ6IFQgfCBQcm9taXNlPFQ+KTogUHJvbWlzZTxUPiB7XG4gIGlmIChyZXN1bHQgJiYgdHlwZW9mIChyZXN1bHQgYXMgUHJvbWlzZTxUPikudGhlbiA9PT0gJ2Z1bmN0aW9uJykge1xuICAgIHJldHVybiByZXN1bHQgYXMgUHJvbWlzZTxUPjtcbiAgfVxuICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKHJlc3VsdCk7XG59XG5cbi8qKlxuICogSGFuZGxlcyBhIGBjYW5jZWxgIGNvbW1hbmQgZnJvbSB0aGUgc29ja2V0LlxuICpcbiAqIElmIGEgY2FuY2VsIGNhbGxiYWNrIHdhcyByZWdpc3RlcmVkLCBpdCBpcyBpbnZva2VkLiBPdGhlcndpc2UsIFNJR1RFUk1cbiAqIGlzIHNlbnQgdG8gdGhlIGN1cnJlbnQgcHJvY2VzcyBhcyBhIGZhbGxiYWNrLiBBZnRlciB0aGUgY2FsbGJhY2sgY29tcGxldGVzXG4gKiAob3IgaW1tZWRpYXRlbHkgaWYgbm8gY2FsbGJhY2spLCB0aGUgcHJvY2VzcyBleGl0cyB3aXRoIGVycm9yIGNvZGUuXG4gKlxuICogQHBhcmFtIGNhbGxiYWNrIC0gVGhlIHJlZ2lzdGVyZWQgY2FuY2VsIGNhbGxiYWNrLCBpZiBhbnlcbiAqIEBwYXJhbSBzb2NrZXRDbGllbnQgLSBUaGUgc29ja2V0IGNsaWVudCB0byBjbG9zZSBiZWZvcmUgZXhpdGluZ1xuICpcbiAqIEBpbnRlcm5hbFxuICovXG5mdW5jdGlvbiBoYW5kbGVDYW5jZWxDb21tYW5kKFxuICBjYWxsYmFjazogKCgpID0+IHZvaWQgfCBQcm9taXNlPHZvaWQ+KSB8IHVuZGVmaW5lZCxcbiAgc29ja2V0Q2xpZW50OiBTb2NrZXRDbGllbnQgfCB1bmRlZmluZWRcbik6IHZvaWQge1xuICBpZiAoIWNhbGxiYWNrKSB7XG4gICAgcHJvY2Vzcy5raWxsKHByb2Nlc3MucGlkLCAnU0lHVEVSTScpO1xuICAgIHJldHVybjtcbiAgfVxuXG4gIHRvUHJvbWlzZShjYWxsYmFjaygpKS50aGVuKFxuICAgICgpID0+IHtcbiAgICAgIHNvY2tldENsaWVudD8uY2xvc2UoKTtcbiAgICAgIGNsZWFudXBBbmRFeGl0KEVYSVRfQ09ERVMuRVJST1IpO1xuICAgIH0sXG4gICAgKCkgPT4ge1xuICAgICAgc29ja2V0Q2xpZW50Py5jbG9zZSgpO1xuICAgICAgY2xlYW51cEFuZEV4aXQoRVhJVF9DT0RFUy5FUlJPUik7XG4gICAgfVxuICApO1xufVxuXG4vKipcbiAqIEhhbmRsZXMgYSBgc3dpdGNoVG9JbnRlcmFjdGl2ZWAgY29tbWFuZCBmcm9tIHRoZSBzb2NrZXQuXG4gKlxuICogSWYgbm8gY2FsbGJhY2sgd2FzIHJlZ2lzdGVyZWQsIHRoZSBjb21tYW5kIGlzIGlnbm9yZWQgKG5vLW9wKS4gT3RoZXJ3aXNlLFxuICogdGhlIGNhbGxiYWNrIGlzIGludm9rZWQgYW5kIGl0cyByZXR1cm4gdmFsdWUgaXMgc2VudCBhc1xuICogYHN3aXRjaFRvSW50ZXJhY3RpdmVSZXNwb25zZWAgb24gdGhlIHNvY2tldC4gYHByb2Nlc3MuZXhpdCg0MilgIGlzIGNhbGxlZFxuICogaW5zaWRlIHRoZSBgd3JpdGUoKWAgY2FsbGJhY2sgdG8gZ3VhcmFudGVlIHRoZSByZXNwb25zZSBpcyBmbHVzaGVkIGJlZm9yZVxuICogdGhlIGV2ZW50IGxvb3AgdGVhcnMgZG93bi5cbiAqXG4gKiBAcGFyYW0gY2FsbGJhY2sgLSBUaGUgcmVnaXN0ZXJlZCBzd2l0Y2hUb0ludGVyYWN0aXZlIGNhbGxiYWNrLCBpZiBhbnlcbiAqIEBwYXJhbSBzb2NrZXRDbGllbnQgLSBUaGUgc29ja2V0IGNsaWVudCB1c2VkIHRvIHNlbmQgdGhlIHJlc3BvbnNlXG4gKlxuICogQGludGVybmFsXG4gKi9cbmZ1bmN0aW9uIGhhbmRsZVN3aXRjaFRvSW50ZXJhY3RpdmVDb21tYW5kKFxuICBjYWxsYmFjazogKCgpID0+IHVua25vd24gfCBQcm9taXNlPHVua25vd24+KSB8IHVuZGVmaW5lZCxcbiAgc29ja2V0Q2xpZW50OiBTb2NrZXRDbGllbnRcbik6IHZvaWQge1xuICBpZiAoIWNhbGxiYWNrKSB7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgdG9Qcm9taXNlKGNhbGxiYWNrKCkpLnRoZW4oXG4gICAgKGRhdGEpID0+IHtcbiAgICAgIHNvY2tldENsaWVudC5zZW5kUmVzcG9uc2VUaGVuKHsgdHlwZTogJ3N3aXRjaFRvSW50ZXJhY3RpdmVSZXNwb25zZScsIGRhdGEgfSwgKCkgPT4ge1xuICAgICAgICBjbGVhbnVwQW5kRXhpdChFWElUX0NPREVTLlNXSVRDSF9UT19JTlRFUkFDVElWRSk7XG4gICAgICB9KTtcbiAgICB9LFxuICAgIChlcnJvcikgPT4ge1xuICAgICAgbG9nZ2VyLmVycm9yKGBzd2l0Y2hUb0ludGVyYWN0aXZlIGNhbGxiYWNrIGVycm9yOiAke2dldEVycm9yTWVzc2FnZShlcnJvcil9YCk7XG4gICAgICBzb2NrZXRDbGllbnQuY2xvc2UoKTtcbiAgICAgIGNsZWFudXBBbmRFeGl0KEVYSVRfQ09ERVMuRVJST1IpO1xuICAgIH1cbiAgKTtcbn1cbiIsICIvKipcbiAqIFNoYXJlZCBzZXNzaW9uIHV0aWxpdGllcyBmb3IgQ2xhdWRlIENvZGUgYWN0aW9uIHdvcmtmbG93cy5cbiAqXG4gKiBQcm92aWRlcyByZXVzYWJsZSBidWlsZGluZyBibG9ja3MgZm9yIGFjdGlvbnMgdGhhdCBzcGF3biB0aGUgYGNsYXVkZWAgQ0xJOlxuICogcGx1Z2luIHNldHRpbmdzIGNvbnN0cnVjdGlvbiwgQ0xJIGFyZyBidWlsZGluZywgd29ya3RyZWUgbGlmZWN5Y2xlIG1hbmFnZW1lbnQsXG4gKiBhbmQgYnJhbmNoIGNsZWFudXAuIEJvdGggdGhlIGBsYXVuY2hgIGFuZCBgaW50ZXJ2aWV3YCBhY3Rpb25zIGNvbnN1bWUgdGhlc2VcbiAqIHV0aWxpdGllcy5cbiAqXG4gKiBAc3VtbWFyeSBTaGFyZWQgc2Vzc2lvbiB1dGlsaXRpZXMgZm9yIENsYXVkZSBDb2RlIGFjdGlvbiB3b3JrZmxvd3NcbiAqIEBtb2R1bGVcbiAqL1xuXG5pbXBvcnQgeyB0eXBlIENoaWxkUHJvY2VzcywgZXhlY0ZpbGUsIHNwYXduIH0gZnJvbSAnbm9kZTpjaGlsZF9wcm9jZXNzJztcbmltcG9ydCAqIGFzIGZzIGZyb20gJ25vZGU6ZnMvcHJvbWlzZXMnO1xuaW1wb3J0IHsgaG9tZWRpciB9IGZyb20gJ25vZGU6b3MnO1xuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdub2RlOnBhdGgnO1xuaW1wb3J0IHsgcHJvbWlzaWZ5IH0gZnJvbSAnbm9kZTp1dGlsJztcbmltcG9ydCB7IENhcmRzQ2xpZW50IH0gZnJvbSAnQGNhcmRzL3Nkay9jbGllbnQnO1xuaW1wb3J0IHsgdHlwZSBBY3Rpb25Db250ZXh0LCB0eXBlIEFjdGlvbklucHV0LCBDQVJEU19FTlZfVkFSUyB9IGZyb20gJ0BjYXJkcy9zZGsvY29uZmlnJztcbmltcG9ydCB7IGNoZWNrV29ya3RyZWVFeGlzdHMsIGNyZWF0ZVdvcmt0cmVlLCBmaW5kR2l0Um9vdHMgfSBmcm9tICcuL2NyZWF0ZS13b3JrdHJlZS5qcyc7XG5cbmNvbnN0IGV4ZWNGaWxlQXN5bmMgPSBwcm9taXNpZnkoZXhlY0ZpbGUpO1xuXG4vKipcbiAqIEV4dHJhY3RzIGEgaHVtYW4tcmVhZGFibGUgbWVzc2FnZSBmcm9tIGFuIHVua25vd24gY2F0Y2ggdmFsdWUuXG4gKiBAcGFyYW0gZXJyb3IgLSBUaGUgY2F1Z2h0IHZhbHVlIHRvIGV4dHJhY3QgYSBtZXNzYWdlIGZyb20uXG4gKiBAcmV0dXJucyBUaGUgZXJyb3IgbWVzc2FnZSBzdHJpbmcuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBlcnJvck1lc3NhZ2UoZXJyb3I6IHVua25vd24pOiBzdHJpbmcge1xuICByZXR1cm4gZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiBTdHJpbmcoZXJyb3IpO1xufVxuXG4vKipcbiAqIFJlc29sdmVzIHRoZSBtYXJrZXRwbGFjZSBkaXJlY3RvcnkgYnVuZGxlZCB3aXRoIHRoZSBpbnN0YWxsZWQgZXh0ZW5zaW9uLlxuICogVXNlcyB0aGUgRVhURU5TSU9OX1BBVEggZW52aXJvbm1lbnQgdmFyaWFibGUgaW5qZWN0ZWQgYnkgQWN0aW9uRGlzcGF0Y2hlci5cbiAqXG4gKiBAcmV0dXJucyBBYnNvbHV0ZSBwYXRoIHRvIHRoZSBidW5kbGVkIG1hcmtldHBsYWNlIGRpcmVjdG9yeS5cbiAqIEB0aHJvd3MgRXJyb3IgaWYgRVhURU5TSU9OX1BBVEggaXMgbm90IHNldC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJlc29sdmVNYXJrZXRwbGFjZVBhdGgoKTogc3RyaW5nIHtcbiAgY29uc3QgZXh0ZW5zaW9uUGF0aCA9IHByb2Nlc3MuZW52W0NBUkRTX0VOVl9WQVJTLkVYVEVOU0lPTl9QQVRIXTtcbiAgaWYgKCFleHRlbnNpb25QYXRoKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIHJlcXVpcmVkIGVudmlyb25tZW50IHZhcmlhYmxlOiAke0NBUkRTX0VOVl9WQVJTLkVYVEVOU0lPTl9QQVRIfWApO1xuICB9XG4gIHJldHVybiBwYXRoLmpvaW4oZXh0ZW5zaW9uUGF0aCwgJ2Rpc3QnLCAnbWFya2V0cGxhY2UnKTtcbn1cblxuLyoqXG4gKiBCdWlsZHMgdGhlIGAtLXNldHRpbmdzYCBKU09OIHRoYXQgZW5hYmxlcyB0aGUgYHJ1bnRpbWVgIHBsdWdpbiBhbmQgcmVnaXN0ZXJzXG4gKiB0aGUgYGNhcmRzLm1hbmFnZW1lbnRgIG1hcmtldHBsYWNlIHNvdXJjZSBzbyB0aGUgc3Bhd25lZCBgY2xhdWRlYCBwcm9jZXNzXG4gKiBjYW4gcmVzb2x2ZSB0aGUgcGx1Z2luIGZyb20gdGhlIGV4dGVuc2lvbidzIGJ1bmRsZWQgbWFya2V0cGxhY2UuXG4gKlxuICogVXNlcyB0aGUgbWFya2V0cGxhY2UgYnVuZGxlZCBpbnNpZGUgdGhlIGV4dGVuc2lvbiBpbnN0YWxsIGRpcmVjdG9yeVxuICogKGA8RVhURU5TSU9OX1BBVEg+L2Rpc3QvbWFya2V0cGxhY2VgKSBzbyB0aGUgc3Bhd25lZCBzZXNzaW9uIGFsd2F5cyBsb2FkcyB0aGVcbiAqIHBsdWdpbiB2ZXJzaW9uIHRoYXQgc2hpcHBlZCB3aXRoIHRoZSBleHRlbnNpb24sIHJlZ2FyZGxlc3Mgb2Ygd29ya3RyZWUgc3RhdGUuXG4gKlxuICogQHBhcmFtIG1hcmtldHBsYWNlUGF0aCAtIEFic29sdXRlIHBhdGggdG8gdGhlIGJ1bmRsZWQgbWFya2V0cGxhY2UgZGlyZWN0b3J5LlxuICogQHJldHVybnMgU2VyaWFsaXNlZCBzZXR0aW5ncyBKU09OIHN0cmluZy5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGJ1aWxkUGx1Z2luU2V0dGluZ3MobWFya2V0cGxhY2VQYXRoOiBzdHJpbmcpOiBzdHJpbmcge1xuICByZXR1cm4gSlNPTi5zdHJpbmdpZnkoe1xuICAgIGVuYWJsZWRQbHVnaW5zOiB7ICdydW50aW1lQGNhcmRzLm1hbmFnZW1lbnQnOiB0cnVlIH0sXG4gICAgZXh0cmFLbm93bk1hcmtldHBsYWNlczoge1xuICAgICAgJ2NhcmRzLm1hbmFnZW1lbnQnOiB7XG4gICAgICAgIHNvdXJjZTogeyBzb3VyY2U6ICdkaXJlY3RvcnknLCBwYXRoOiBtYXJrZXRwbGFjZVBhdGggfVxuICAgICAgfVxuICAgIH1cbiAgfSk7XG59XG5cbi8qKlxuICogUmVzb2x2ZXMgdGhlIENsYXVkZSBDb2RlIGNvbmZpZ3VyYXRpb24gZGlyZWN0b3J5IHVzaW5nIHRoZSBzdGFuZGFyZFxuICogZmFsbGJhY2sgY2hhaW46ICRDTEFVREVfQ09ORklHX0RJUiBcdTIxOTIgJFhER19EQVRBX0hPTUUvY2xhdWRlIFx1MjE5MlxuICogJFhER19DT05GSUdfSE9NRS9jbGF1ZGUgXHUyMTkyIH4vLmNvbmZpZy9jbGF1ZGUgXHUyMTkyIH4vLmNsYXVkZS5cbiAqXG4gKiBSZXR1cm5zIHRoZSBmaXJzdCBjYW5kaWRhdGUgdGhhdCBleGlzdHMgb24gZGlzaywgb3IgbnVsbCBpZiBub25lIGlzIGZvdW5kLlxuICpcbiAqIEByZXR1cm5zIFRoZSBmaXJzdCBleGlzdGluZyBDbGF1ZGUgY29uZmlnIGRpcmVjdG9yeSBwYXRoLCBvciBudWxsIGlmIG5vbmUgZm91bmQuXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiByZXNvbHZlQ2xhdWRlQ29uZmlnRGlyKCk6IFByb21pc2U8c3RyaW5nIHwgbnVsbD4ge1xuICBjb25zdCBob21lID0gaG9tZWRpcigpO1xuICBjb25zdCBjYW5kaWRhdGVzOiBzdHJpbmdbXSA9IFtdO1xuXG4gIGNvbnN0IGNsYXVkZUNvbmZpZ0RpciA9IHByb2Nlc3MuZW52WydDTEFVREVfQ09ORklHX0RJUiddO1xuICBpZiAoY2xhdWRlQ29uZmlnRGlyKSBjYW5kaWRhdGVzLnB1c2goY2xhdWRlQ29uZmlnRGlyKTtcblxuICBjb25zdCB4ZGdEYXRhSG9tZSA9IHByb2Nlc3MuZW52WydYREdfREFUQV9IT01FJ107XG4gIGlmICh4ZGdEYXRhSG9tZSkgY2FuZGlkYXRlcy5wdXNoKHBhdGguam9pbih4ZGdEYXRhSG9tZSwgJ2NsYXVkZScpKTtcblxuICBjb25zdCB4ZGdDb25maWdIb21lID0gcHJvY2Vzcy5lbnZbJ1hER19DT05GSUdfSE9NRSddO1xuICBpZiAoeGRnQ29uZmlnSG9tZSkgY2FuZGlkYXRlcy5wdXNoKHBhdGguam9pbih4ZGdDb25maWdIb21lLCAnY2xhdWRlJykpO1xuXG4gIGNhbmRpZGF0ZXMucHVzaChwYXRoLmpvaW4oaG9tZSwgJy5jb25maWcnLCAnY2xhdWRlJykpO1xuICBjYW5kaWRhdGVzLnB1c2gocGF0aC5qb2luKGhvbWUsICcuY2xhdWRlJykpO1xuXG4gIGZvciAoY29uc3QgY2FuZGlkYXRlIG9mIGNhbmRpZGF0ZXMpIHtcbiAgICB0cnkge1xuICAgICAgYXdhaXQgZnMuYWNjZXNzKHBhdGguam9pbihjYW5kaWRhdGUsICdwbHVnaW5zJykpO1xuICAgICAgcmV0dXJuIGNhbmRpZGF0ZTtcbiAgICB9IGNhdGNoIHtcbiAgICAgIC8vIE5vdCBmb3VuZCwgdHJ5IG5leHRcbiAgICB9XG4gIH1cbiAgcmV0dXJuIG51bGw7XG59XG5cbi8qKlxuICogVXBkYXRlcyB0aGUgYGNhcmRzLm1hbmFnZW1lbnRgIGVudHJ5IGluIENsYXVkZSBDb2RlJ3MgYGtub3duX21hcmtldHBsYWNlcy5qc29uYFxuICogdG8gcG9pbnQgdG8gdGhlIGV4dGVuc2lvbi1idW5kbGVkIG1hcmtldHBsYWNlIHVzaW5nIGFuIGFic29sdXRlIHBhdGguXG4gKlxuICogQ2xhdWRlIENvZGUgcmVzb2x2ZXMgZGlyZWN0b3J5IG1hcmtldHBsYWNlIHNvdXJjZXMgcmVsYXRpdmUgdG8gdGhlIHNwYXduZWRcbiAqIHNlc3Npb24ncyBDV0QuIFdoZW4gc2Vzc2lvbnMgcnVuIGluIGEgd29ya3RyZWUsIGEgcmVsYXRpdmUgcGF0aCBsaWtlIGBcInB1YmxpY1wiYFxuICogcmVzb2x2ZXMgdG8gdGhlIHdvcmt0cmVlJ3MgY29weSBcdTIwMTQgd2hpY2ggbWF5IGNvbnRhaW4gYSBzdGFsZSBwbHVnaW4gdmVyc2lvbi5cbiAqIFdyaXRpbmcgYW4gYWJzb2x1dGUgcGF0aCBlbnN1cmVzIENsYXVkZSBDb2RlIGFsd2F5cyByZWFkcyBmcm9tIHRoZSBleHRlbnNpb24nc1xuICogYnVuZGxlZCBtYXJrZXRwbGFjZSwgcmVnYXJkbGVzcyBvZiBDV0QuXG4gKlxuICogIyMgSG93IENsYXVkZSBDb2RlJ3MgcGx1Z2luIHZlcnNpb24gc3luY2luZyB3b3Jrc1xuICpcbiAqIFRoaXMgcmVnaXN0cmF0aW9uIHVwZGF0ZSBpcyB0aGUgKipvbmx5KiogaW50ZXJ2ZW50aW9uIHdlIG5lZWQuIENsYXVkZSBDb2RlJ3NcbiAqIGJ1aWx0LWluIGF1dG8tdXBkYXRlIHN5c3RlbSBoYW5kbGVzIHRoZSByZXN0OlxuICpcbiAqIDEuICoqVmVyc2lvbiBkZXRlY3Rpb24qKiBcdTIwMTQgT24gc2Vzc2lvbiBzdGFydCwgQ2xhdWRlIENvZGUgcmVhZHMgdGhlIG1hcmtldHBsYWNlXG4gKiAgICBzb3VyY2UgZGlyZWN0b3J5ICh0aGUgYHNvdXJjZS5wYXRoYCB3cml0dGVuIGhlcmUpIGFuZCBleHRyYWN0cyB0aGUgdmVyc2lvblxuICogICAgZnJvbSBlYWNoIHBsdWdpbidzIGAuY2xhdWRlLXBsdWdpbi9wbHVnaW4uanNvbmAuXG4gKlxuICogMi4gKipDYWNoZS1wZXItdmVyc2lvbioqIFx1MjAxNCBFYWNoIHBsdWdpbiB2ZXJzaW9uIGlzIGNhY2hlZCBpbmRlcGVuZGVudGx5IHVuZGVyXG4gKiAgICBgPGNvbmZpZ0Rpcj4vcGx1Z2lucy9jYWNoZS88bWFya2V0cGxhY2U+LzxwbHVnaW4+Lzx2ZXJzaW9uPi9gLiBUaGUgYWN0aXZlXG4gKiAgICB2ZXJzaW9uJ3MgcGF0aCBpcyByZWNvcmRlZCBhcyBgaW5zdGFsbFBhdGhgIGluIGBpbnN0YWxsZWRfcGx1Z2lucy5qc29uYC5cbiAqXG4gKiAzLiAqKkF1dG8tdXBkYXRlKiogXHUyMDE0IFdoZW4gdGhlIHNvdXJjZSBkaXJlY3RvcnkgY29udGFpbnMgYSBuZXdlciB2ZXJzaW9uIHRoYW5cbiAqICAgIHdoYXQncyBjYWNoZWQsIENsYXVkZSBDb2RlIGNvcGllcyB0aGUgc291cmNlIGludG8gYSBuZXcgdmVyc2lvbmVkIGNhY2hlXG4gKiAgICBkaXJlY3RvcnksIHVwZGF0ZXMgYGluc3RhbGxlZF9wbHVnaW5zLmpzb25gIHRvIHBvaW50IHRvIGl0LCBhbmQgd3JpdGVzIGFcbiAqICAgIGAub3JwaGFuZWRfYXRgIHRpbWVzdGFtcCBpbnRvIHRoZSBvbGQgdmVyc2lvbidzIGNhY2hlIGRpcmVjdG9yeS5cbiAqXG4gKiA0LiAqKk9ycGhhbiBHQyoqIFx1MjAxNCBBIGJhY2tncm91bmQgaG91c2VrZWVwaW5nIHRhc2sgcnVucyBldmVyeSAxMCBtaW51dGVzLiBJdFxuICogICAgd2Fsa3MgdGhlIGNhY2hlLCBtYXJrcyBhbnkgdmVyc2lvbiBkaXJlY3Rvcnkgbm90IHJlZmVyZW5jZWQgYnlcbiAqICAgIGBpbnN0YWxsZWRfcGx1Z2lucy5qc29uYCB3aXRoIGAub3JwaGFuZWRfYXRgLCBhbmQgZGVsZXRlcyBvcnBoYW5lZFxuICogICAgZGlyZWN0b3JpZXMgb25seSBhZnRlciBhICoqNy1kYXkqKiBncmFjZSBwZXJpb2QuIFRoaXMgZW5zdXJlcyB0aGF0XG4gKiAgICBjb25jdXJyZW50bHkgcnVubmluZyBzZXNzaW9ucyBhcmUgbmV2ZXIgZGlzcnVwdGVkIGJ5IGNhY2hlIGRlbGV0aW9uLlxuICpcbiAqIFdlIHByZXZpb3VzbHkgZm9yY2UtZGVsZXRlZCBzdGFsZSBjYWNoZSBlbnRyaWVzIChgZXZpY3RTdGFsZVJ1bnRpbWVDYWNoZWApLFxuICogd2hpY2ggYnlwYXNzZWQgdGhlIDctZGF5IGdyYWNlIHBlcmlvZCBhbmQgY2F1c2VkIEVOT0VOVCBlcnJvcnMgaW4gc2Vzc2lvbnNcbiAqIHN0aWxsIHJlZmVyZW5jaW5nIHRoZSBkZWxldGVkIHBhdGhzLlxuICpcbiAqIEBwYXJhbSBtYXJrZXRwbGFjZVBhdGggLSBBYnNvbHV0ZSBwYXRoIHRvIHRoZSBidW5kbGVkIG1hcmtldHBsYWNlIGRpcmVjdG9yeS5cbiAqIEBwYXJhbSBsb2dnZXIgLSBMb2dnZXIgZm9yIGRpYWdub3N0aWMgb3V0cHV0LlxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gdXBkYXRlTWFya2V0cGxhY2VSZWdpc3RyYXRpb24oXG4gIG1hcmtldHBsYWNlUGF0aDogc3RyaW5nLFxuICBsb2dnZXI6IEFjdGlvbkNvbnRleHRbJ2xvZ2dlciddXG4pOiBQcm9taXNlPHZvaWQ+IHtcbiAgY29uc3QgY29uZmlnRGlyID0gYXdhaXQgcmVzb2x2ZUNsYXVkZUNvbmZpZ0RpcigpO1xuICBpZiAoIWNvbmZpZ0Rpcikge1xuICAgIGxvZ2dlci5kZWJ1ZygnQ2xhdWRlIGNvbmZpZyBkaXJlY3Rvcnkgbm90IGZvdW5kLCBza2lwcGluZyBtYXJrZXRwbGFjZSByZWdpc3RyYXRpb24gdXBkYXRlJyk7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgY29uc3Qga25vd25QYXRoID0gcGF0aC5qb2luKGNvbmZpZ0RpciwgJ3BsdWdpbnMnLCAna25vd25fbWFya2V0cGxhY2VzLmpzb24nKTtcbiAgbGV0IHJhdzogc3RyaW5nO1xuICB0cnkge1xuICAgIHJhdyA9IGF3YWl0IGZzLnJlYWRGaWxlKGtub3duUGF0aCwgJ3V0Zi04Jyk7XG4gIH0gY2F0Y2ggKGVycm9yOiB1bmtub3duKSB7XG4gICAgaWYgKGVycm9yIGluc3RhbmNlb2YgRXJyb3IgJiYgJ2NvZGUnIGluIGVycm9yICYmIGVycm9yLmNvZGUgPT09ICdFTk9FTlQnKSB7XG4gICAgICBsb2dnZXIuZGVidWcoJ2tub3duX21hcmtldHBsYWNlcy5qc29uIG5vdCBmb3VuZCwgc2tpcHBpbmcnKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdGhyb3cgZXJyb3I7XG4gIH1cblxuICBjb25zdCBkYXRhID0gSlNPTi5wYXJzZShyYXcpIGFzIFJlY29yZDxcbiAgICBzdHJpbmcsXG4gICAgeyBzb3VyY2U/OiB7IHNvdXJjZT86IHN0cmluZzsgcGF0aD86IHN0cmluZyB9OyBpbnN0YWxsTG9jYXRpb24/OiBzdHJpbmc7IGxhc3RVcGRhdGVkPzogc3RyaW5nIH1cbiAgPjtcbiAgY29uc3QgZW50cnkgPSBkYXRhWydjYXJkcy5tYW5hZ2VtZW50J107XG4gIGlmICghZW50cnk/LnNvdXJjZSB8fCBlbnRyeS5zb3VyY2Uuc291cmNlICE9PSAnZGlyZWN0b3J5JykgcmV0dXJuO1xuXG4gIGlmIChlbnRyeS5zb3VyY2UucGF0aCA9PT0gbWFya2V0cGxhY2VQYXRoICYmIGVudHJ5Lmluc3RhbGxMb2NhdGlvbiA9PT0gbWFya2V0cGxhY2VQYXRoKSB7XG4gICAgbG9nZ2VyLmRlYnVnKCdNYXJrZXRwbGFjZSByZWdpc3RyYXRpb24gYWxyZWFkeSBwb2ludHMgdG8gZXh0ZW5zaW9uIGJ1bmRsZScpO1xuICAgIHJldHVybjtcbiAgfVxuXG4gIGVudHJ5LnNvdXJjZS5wYXRoID0gbWFya2V0cGxhY2VQYXRoO1xuICBlbnRyeS5pbnN0YWxsTG9jYXRpb24gPSBtYXJrZXRwbGFjZVBhdGg7XG4gIGVudHJ5Lmxhc3RVcGRhdGVkID0gbmV3IERhdGUoKS50b0lTT1N0cmluZygpO1xuICBhd2FpdCBmcy53cml0ZUZpbGUoa25vd25QYXRoLCBgJHtKU09OLnN0cmluZ2lmeShkYXRhLCBudWxsLCA0KX1cXG5gKTtcbiAgbG9nZ2VyLmluZm8oJ1VwZGF0ZWQgbWFya2V0cGxhY2UgcmVnaXN0cmF0aW9uIHRvIGV4dGVuc2lvbiBidW5kbGUnLCB7IG1hcmtldHBsYWNlUGF0aCB9KTtcbn1cblxuLyoqXG4gKiBCdWlsZHMgdGhlIENMSSBhcmd1bWVudCBsaXN0IGZvciB0aGUgYGNsYXVkZWAgcHJvY2Vzcy5cbiAqXG4gKiBAcGFyYW0gcHJvbXB0IC0gVGhlIHByb21wdCBzdHJpbmcgZm9yIG5ldyBzZXNzaW9ucy5cbiAqIEBwYXJhbSBzZXNzaW9uSWQgLSBTZXNzaW9uIGlkZW50aWZpZXIgKHVzZWQgZm9yIGAtLXNlc3Npb24taWRgIG9yIGAtLXJlc3VtZWApLlxuICogQHBhcmFtIHJlc3VtZSAtIFdoZW4gdHJ1ZSwgcGFzc2VzIGAtLXJlc3VtZWAgaW5zdGVhZCBvZiBzdGFydGluZyBhIG5ldyBzZXNzaW9uLlxuICogQHBhcmFtIG1vZGUgLSBFeGVjdXRpb24gbW9kZTsgYCdiYWNrZ3JvdW5kJ2AgYXBwZW5kcyBgLS1wcmludGAuXG4gKiBAcGFyYW0gY2FyZFJlcG9QYXRoIC0gQWJzb2x1dGUgcGF0aCBwYXNzZWQgdmlhIGAtLWFkZC1kaXJgLlxuICogQHBhcmFtIG1hcmtldHBsYWNlUGF0aCAtIEFic29sdXRlIHBhdGggdG8gdGhlIGJ1bmRsZWQgbWFya2V0cGxhY2UgZGlyZWN0b3J5LlxuICogQHJldHVybnMgQXJyYXkgb2YgQ0xJIGFyZ3VtZW50cy5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGJ1aWxkQXJncyhcbiAgcHJvbXB0OiBzdHJpbmcsXG4gIHNlc3Npb25JZDogc3RyaW5nLFxuICByZXN1bWU6IGJvb2xlYW4sXG4gIG1vZGU6IEFjdGlvbklucHV0WydleGVjdXRpb25Nb2RlJ10sXG4gIGNhcmRSZXBvUGF0aDogc3RyaW5nLFxuICBtYXJrZXRwbGFjZVBhdGg6IHN0cmluZ1xuKTogc3RyaW5nW10ge1xuICBjb25zdCBhcmdzOiBzdHJpbmdbXSA9IFtdO1xuXG4gIGlmIChyZXN1bWUpIHtcbiAgICBhcmdzLnB1c2goJy0tcmVzdW1lJywgc2Vzc2lvbklkKTtcbiAgfSBlbHNlIHtcbiAgICBhcmdzLnB1c2gocHJvbXB0KTtcbiAgICBhcmdzLnB1c2goJy0tc2Vzc2lvbi1pZCcsIHNlc3Npb25JZCk7XG4gIH1cbiAgYXJncy5wdXNoKCctLXNldHRpbmdzJywgYnVpbGRQbHVnaW5TZXR0aW5ncyhtYXJrZXRwbGFjZVBhdGgpKTtcbiAgYXJncy5wdXNoKCctLWFkZC1kaXInLCBjYXJkUmVwb1BhdGgpO1xuICBpZiAobW9kZSA9PT0gJ2JhY2tncm91bmQnKSB7XG4gICAgYXJncy5wdXNoKCctLXByaW50Jyk7XG4gIH1cblxuICByZXR1cm4gYXJncztcbn1cblxuLyoqXG4gKiBSZXNvbHZlcyB0aGUgY3VycmVudCBicmFuY2ggbmFtZSBpbiB0aGUgZ2l2ZW4gd29ya3NwYWNlLlxuICpcbiAqIEBwYXJhbSB3b3Jrc3BhY2VQYXRoIC0gRGlyZWN0b3J5IHdoZXJlIGBnaXQgcmV2LXBhcnNlYCBydW5zLlxuICogQHJldHVybnMgVGhlIGFiYnJldmlhdGVkIGJyYW5jaCBuYW1lIGF0IEhFQUQuXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiByZXNvbHZlQmFzZUJyYW5jaCh3b3Jrc3BhY2VQYXRoOiBzdHJpbmcpOiBQcm9taXNlPHN0cmluZz4ge1xuICBjb25zdCB7IHN0ZG91dCB9ID0gYXdhaXQgZXhlY0ZpbGVBc3luYygnZ2l0JywgWydyZXYtcGFyc2UnLCAnLS1hYmJyZXYtcmVmJywgJ0hFQUQnXSwge1xuICAgIGN3ZDogd29ya3NwYWNlUGF0aFxuICB9KTtcbiAgcmV0dXJuIHN0ZG91dC50cmltKCk7XG59XG5cbi8qKlxuICogQ2hlY2tzIHdoZXRoZXIgYSB3b3JrdHJlZSBwYXRoIGV4aXN0cyBvbiBkaXNrLlxuICpcbiAqIEBwYXJhbSB3b3JrdHJlZVBhdGggLSBBYnNvbHV0ZSBwYXRoIHRvIHRlc3QuXG4gKiBAcmV0dXJucyBUcnVlIHdoZW4gdGhlIHBhdGggaXMgYWNjZXNzaWJsZS5cbiAqL1xuYXN5bmMgZnVuY3Rpb24gd29ya3RyZWVFeGlzdHNPbkRpc2sod29ya3RyZWVQYXRoOiBzdHJpbmcpOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgdHJ5IHtcbiAgICBhd2FpdCBmcy5hY2Nlc3Mod29ya3RyZWVQYXRoKTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSBjYXRjaCB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG59XG5cbi8qKlxuICogRmluZHMgb3IgY3JlYXRlcyBhIHdvcmt0cmVlIGZvciB0aGUgY2FyZC5cbiAqXG4gKiBUcmllcyB0byByZXVzZSBhbiBleGlzdGluZyBicmFuY2ggd2hvc2Ugd29ya3RyZWUgaXMgc3RpbGwgb24gZGlzay4gV2hlbiBub1xuICogdmFsaWQgYnJhbmNoIGV4aXN0cywgY3JlYXRlcyBhIG5ldyBvbmUgYW5kIHJlZ2lzdGVycyBpdCB3aXRoIHRoZSBBUEkuXG4gKlxuICogQHBhcmFtIGlucHV0IC0gQWN0aW9uIGlucHV0IGNvbnRhaW5pbmcgY2FyZElkIGFuZCB3b3Jrc3BhY2UgcGF0aHMuXG4gKiBAcGFyYW0gY2xpZW50IC0gQ2FyZHMgQVBJIGNsaWVudCBmb3IgYnJhbmNoIENSVUQuXG4gKiBAcGFyYW0gYmFzZUJyYW5jaCAtIEN1cnJlbnQgYnJhbmNoIGluIHRoZSB3b3Jrc3BhY2UgKHVzZWQgYXMgcGFyZW50KS5cbiAqIEBwYXJhbSBsb2dnZXIgLSBMb2dnZXIgZm9yIGRpYWdub3N0aWMgb3V0cHV0LlxuICogQHJldHVybnMgV29ya3RyZWUgcGF0aCwgYnJhbmNoIG5hbWUsIGFuZCBwYXJlbnQgYnJhbmNoIG5hbWUuXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiByZXNvbHZlT3JDcmVhdGVXb3JrdHJlZShcbiAgaW5wdXQ6IEFjdGlvbklucHV0LFxuICBjbGllbnQ6IENhcmRzQ2xpZW50LFxuICBiYXNlQnJhbmNoOiBzdHJpbmcsXG4gIGxvZ2dlcjogQWN0aW9uQ29udGV4dFsnbG9nZ2VyJ11cbik6IFByb21pc2U8eyB3b3JrdHJlZVBhdGg6IHN0cmluZzsgYnJhbmNoTmFtZTogc3RyaW5nOyBwYXJlbnRCcmFuY2g6IHN0cmluZyB9PiB7XG4gIGNvbnN0IHsgYnJhbmNoZXMgfSA9IGF3YWl0IGNsaWVudC5nZXRCcmFuY2hlcyhpbnB1dC5jYXJkSWQsIHsgd29ya3NwYWNlUGF0aDogaW5wdXQucmVwb1Jvb3QgfSk7XG5cbiAgLy8gVHJ5IHRvIHJldXNlIGFuIGV4aXN0aW5nIGJyYW5jaCB3aXRoIGEgdmFsaWQgd29ya3RyZWUgb24gZGlza1xuICBmb3IgKGNvbnN0IGJyYW5jaCBvZiBicmFuY2hlcykge1xuICAgIGlmICghYnJhbmNoLmV4aXN0cyB8fCAhYnJhbmNoLndvcmt0cmVlKSBjb250aW51ZTtcbiAgICBpZiAoIShhd2FpdCB3b3JrdHJlZUV4aXN0c09uRGlzayhicmFuY2gud29ya3RyZWUpKSkgY29udGludWU7XG5cbiAgICBsb2dnZXIuaW5mbygnUmV1c2luZyBleGlzdGluZyB3b3JrdHJlZScsIHsgYnJhbmNoOiBicmFuY2gubmFtZSwgd29ya3RyZWU6IGJyYW5jaC53b3JrdHJlZSB9KTtcbiAgICByZXR1cm4geyB3b3JrdHJlZVBhdGg6IGJyYW5jaC53b3JrdHJlZSwgYnJhbmNoTmFtZTogYnJhbmNoLm5hbWUsIHBhcmVudEJyYW5jaDogYnJhbmNoLnBhcmVudEJyYW5jaCB9O1xuICB9XG5cbiAgLy8gTm8gdmFsaWQgZXhpc3RpbmcgYnJhbmNoIFx1MjAxNCBjcmVhdGUgbmV3IG9uZS5cbiAgLy8gVGhlIEFQSSBtYXkgYmUgb3V0IG9mIHN5bmMgd2l0aCBnaXQgKGUuZy4gYSBwcmV2aW91cyB3b3JrdHJlZSB3YXMgY3JlYXRlZFxuICAvLyBidXQgbmV2ZXIgcmVnaXN0ZXJlZCwgb3IgaXRzIEFQSSByZWNvcmQgd2FzIGRlbGV0ZWQpLiBUbyBhdm9pZCBjb2xsaWRpbmdcbiAgLy8gd2l0aCB3b3JrdHJlZXMgZ2l0IGFscmVhZHkga25vd3MgYWJvdXQsIHByb2JlIGdpdCdzIGFjdHVhbCBzdGF0ZSBhbmRcbiAgLy8gaW5jcmVtZW50IHBhc3QgYW55IG9jY3VwaWVkIHNsb3RzLlxuICBjb25zdCBwcmVmaXggPSBgY2FyZHMvJHtpbnB1dC5jYXJkSWR9L2A7XG4gIGNvbnN0IGV4aXN0aW5nTnVtYmVycyA9IGJyYW5jaGVzXG4gICAgLmZpbHRlcigoYikgPT4gYi5uYW1lLnN0YXJ0c1dpdGgocHJlZml4KSlcbiAgICAubWFwKChiKSA9PiBwYXJzZUludChiLm5hbWUuc2xpY2UocHJlZml4Lmxlbmd0aCksIDEwKSlcbiAgICAuZmlsdGVyKChuKSA9PiAhTnVtYmVyLmlzTmFOKG4pKTtcbiAgbGV0IG5leHROdW1iZXIgPSBleGlzdGluZ051bWJlcnMubGVuZ3RoID4gMCA/IE1hdGgubWF4KC4uLmV4aXN0aW5nTnVtYmVycykgKyAxIDogMTtcblxuICBjb25zdCB7IHJlcG9Sb290IH0gPSBhd2FpdCBmaW5kR2l0Um9vdHMoaW5wdXQucmVwb1Jvb3QpO1xuICB3aGlsZSAoYXdhaXQgY2hlY2tXb3JrdHJlZUV4aXN0cyhyZXBvUm9vdCwgcGF0aC5qb2luKHJlcG9Sb290LCAnLndvcmt0cmVlcycsIGAke3ByZWZpeH0ke25leHROdW1iZXJ9YCkpKSB7XG4gICAgbG9nZ2VyLndhcm4oJ1dvcmt0cmVlIGFscmVhZHkgZXhpc3RzIGluIGdpdCBidXQgbm90IGluIEFQSSwgc2tpcHBpbmcnLCB7XG4gICAgICBicmFuY2g6IGAke3ByZWZpeH0ke25leHROdW1iZXJ9YFxuICAgIH0pO1xuICAgIG5leHROdW1iZXIrKztcbiAgfVxuXG4gIGNvbnN0IGJyYW5jaE5hbWUgPSBgJHtwcmVmaXh9JHtuZXh0TnVtYmVyfWA7XG4gIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGNyZWF0ZVdvcmt0cmVlKGJyYW5jaE5hbWUsIHsgY3dkOiBpbnB1dC5yZXBvUm9vdCB9KTtcbiAgYXdhaXQgY2xpZW50LmFkZEJyYW5jaChpbnB1dC5jYXJkSWQsIHsgbmFtZTogYnJhbmNoTmFtZSwgd29ya3RyZWU6IHJlc3VsdC53b3JrdHJlZSwgcGFyZW50QnJhbmNoOiBiYXNlQnJhbmNoIH0pO1xuXG4gIGxvZ2dlci5pbmZvKCdDcmVhdGVkIG5ldyB3b3JrdHJlZScsIHsgYnJhbmNoOiBicmFuY2hOYW1lLCB3b3JrdHJlZTogcmVzdWx0Lndvcmt0cmVlIH0pO1xuICByZXR1cm4geyB3b3JrdHJlZVBhdGg6IHJlc3VsdC53b3JrdHJlZSwgYnJhbmNoTmFtZSwgcGFyZW50QnJhbmNoOiBiYXNlQnJhbmNoIH07XG59XG5cbi8qKlxuICogUnVucyBhIHNpbmdsZSBjbGVhbnVwIHN0ZXAsIGxvZ2dpbmcgYSB3YXJuaW5nIG9uIGZhaWx1cmUgcmF0aGVyIHRoYW5cbiAqIGFib3J0aW5nIHRoZSBzd2VlcC4gRWFjaCBzdGVwICh3b3JrdHJlZSByZW1vdmFsLCBicmFuY2ggZGVsZXRpb24sIEFQSVxuICogcmVjb3JkIHJlbW92YWwpIGlzIGluZGVwZW5kZW50IFx1MjAxNCBhIGZhaWx1cmUgaW4gb25lIG11c3Qgbm90IHByZXZlbnQgdGhlXG4gKiBvdGhlcnMgZnJvbSBydW5uaW5nLlxuICpcbiAqIEBwYXJhbSBzdGVwIC0gQXN5bmMgb3BlcmF0aW9uIHRvIGF0dGVtcHQuXG4gKiBAcGFyYW0gbGFiZWwgLSBIdW1hbi1yZWFkYWJsZSBsYWJlbCBsb2dnZWQgb24gZmFpbHVyZS5cbiAqIEBwYXJhbSBicmFuY2hOYW1lIC0gQnJhbmNoIG5hbWUgaW5jbHVkZWQgaW4gZGlhZ25vc3RpYyBvdXRwdXQuXG4gKiBAcGFyYW0gbG9nZ2VyIC0gTG9nZ2VyIGZvciBkaWFnbm9zdGljIG91dHB1dC5cbiAqL1xuYXN5bmMgZnVuY3Rpb24gdHJ5Q2xlYW51cFN0ZXAoXG4gIHN0ZXA6ICgpID0+IFByb21pc2U8dW5rbm93bj4sXG4gIGxhYmVsOiBzdHJpbmcsXG4gIGJyYW5jaE5hbWU6IHN0cmluZyxcbiAgbG9nZ2VyOiBBY3Rpb25Db250ZXh0Wydsb2dnZXInXVxuKTogUHJvbWlzZTx2b2lkPiB7XG4gIHRyeSB7XG4gICAgYXdhaXQgc3RlcCgpO1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGxvZ2dlci53YXJuKGxhYmVsLCB7IGJyYW5jaDogYnJhbmNoTmFtZSwgZXJyb3I6IGVycm9yTWVzc2FnZShlcnJvcikgfSk7XG4gIH1cbn1cblxuLyoqXG4gKiBSZW1vdmVzIGJyYW5jaGVzIHRoYXQgYXJlIGZ1bGx5IG1lcmdlZCBpbnRvIHRoZSBiYXNlIGJyYW5jaC5cbiAqXG4gKiBGb3IgZWFjaCBtZXJnZWQgYnJhbmNoIHRoZSB3b3JrdHJlZSBkaXJlY3RvcnkgaXMgcmVtb3ZlZCwgdGhlIGxvY2FsIGJyYW5jaFxuICogcmVmIGlzIGRlbGV0ZWQsIGFuZCB0aGUgYnJhbmNoIHJlY29yZCBpcyByZW1vdmVkIGZyb20gdGhlIEFQSS4gSW5kaXZpZHVhbFxuICogZmFpbHVyZXMgYXJlIGxvZ2dlZCBhbmQgZG8gbm90IGFib3J0IHRoZSBzd2VlcC5cbiAqXG4gKiBAcGFyYW0gaW5wdXQgLSBBY3Rpb24gaW5wdXQgY29udGFpbmluZyBjYXJkSWQgYW5kIHdvcmtzcGFjZSBwYXRocy5cbiAqIEBwYXJhbSBjbGllbnQgLSBDYXJkcyBBUEkgY2xpZW50IGZvciBicmFuY2ggcmVtb3ZhbC5cbiAqIEBwYXJhbSBiYXNlQnJhbmNoIC0gQnJhbmNoIHRvIGNoZWNrIG1lcmdlIHN0YXR1cyBhZ2FpbnN0LlxuICogQHBhcmFtIGxvZ2dlciAtIExvZ2dlciBmb3IgZGlhZ25vc3RpYyBvdXRwdXQuXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBjbGVhbnVwTWVyZ2VkQnJhbmNoZXMoXG4gIGlucHV0OiBBY3Rpb25JbnB1dCxcbiAgY2xpZW50OiBDYXJkc0NsaWVudCxcbiAgYmFzZUJyYW5jaDogc3RyaW5nLFxuICBsb2dnZXI6IEFjdGlvbkNvbnRleHRbJ2xvZ2dlciddXG4pOiBQcm9taXNlPHZvaWQ+IHtcbiAgY29uc3QgeyBicmFuY2hlcyB9ID0gYXdhaXQgY2xpZW50LmdldEJyYW5jaGVzKGlucHV0LmNhcmRJZCwgeyB3b3Jrc3BhY2VQYXRoOiBpbnB1dC5yZXBvUm9vdCB9KTtcblxuICBmb3IgKGNvbnN0IGJyYW5jaCBvZiBicmFuY2hlcykge1xuICAgIGlmICghYnJhbmNoLmV4aXN0cykgY29udGludWU7XG5cbiAgICB0cnkge1xuICAgICAgLy8gbWVyZ2UtYmFzZSAtLWlzLWFuY2VzdG9yIGV4aXRzIG5vbi16ZXJvIHdoZW4gTk9UIGFuIGFuY2VzdG9yIChub3QgbWVyZ2VkKVxuICAgICAgYXdhaXQgZXhlY0ZpbGVBc3luYygnZ2l0JywgWydtZXJnZS1iYXNlJywgJy0taXMtYW5jZXN0b3InLCBicmFuY2gubmFtZSwgYmFzZUJyYW5jaF0sIHtcbiAgICAgICAgY3dkOiBpbnB1dC5yZXBvUm9vdFxuICAgICAgfSk7XG4gICAgfSBjYXRjaCB7XG4gICAgICAvLyBFeHBlY3RlZCBmb3IgdW5tZXJnZWQgYnJhbmNoZXMgXHUyMDE0IHNraXAgY2xlYW51cFxuICAgICAgbG9nZ2VyLmRlYnVnKCdCcmFuY2ggbm90IG1lcmdlZCwgc2tpcHBpbmcgY2xlYW51cCcsIHsgYnJhbmNoOiBicmFuY2gubmFtZSB9KTtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIC8vIEJyYW5jaCBpcyBtZXJnZWQgXHUyMDE0IGNsZWFuIHVwIHdvcmt0cmVlLCBicmFuY2ggcmVmLCBhbmQgQVBJIHJlY29yZFxuICAgIGlmIChicmFuY2gud29ya3RyZWUpIHtcbiAgICAgIGF3YWl0IHRyeUNsZWFudXBTdGVwKFxuICAgICAgICAoKSA9PiBleGVjRmlsZUFzeW5jKCdnaXQnLCBbJ3dvcmt0cmVlJywgJ3JlbW92ZScsIGJyYW5jaC53b3JrdHJlZSFdLCB7IGN3ZDogaW5wdXQucmVwb1Jvb3QgfSksXG4gICAgICAgICdGYWlsZWQgdG8gcmVtb3ZlIHdvcmt0cmVlJyxcbiAgICAgICAgYnJhbmNoLm5hbWUsXG4gICAgICAgIGxvZ2dlclxuICAgICAgKTtcbiAgICB9XG5cbiAgICBhd2FpdCB0cnlDbGVhbnVwU3RlcChcbiAgICAgICgpID0+IGV4ZWNGaWxlQXN5bmMoJ2dpdCcsIFsnYnJhbmNoJywgJy1kJywgYnJhbmNoLm5hbWVdLCB7IGN3ZDogaW5wdXQucmVwb1Jvb3QgfSksXG4gICAgICAnRmFpbGVkIHRvIGRlbGV0ZSBicmFuY2gnLFxuICAgICAgYnJhbmNoLm5hbWUsXG4gICAgICBsb2dnZXJcbiAgICApO1xuXG4gICAgYXdhaXQgdHJ5Q2xlYW51cFN0ZXAoXG4gICAgICAoKSA9PiBjbGllbnQucmVtb3ZlQnJhbmNoKGlucHV0LmNhcmRJZCwgYnJhbmNoLm5hbWUpLFxuICAgICAgJ0ZhaWxlZCB0byByZW1vdmUgYnJhbmNoIGZyb20gQVBJJyxcbiAgICAgIGJyYW5jaC5uYW1lLFxuICAgICAgbG9nZ2VyXG4gICAgKTtcblxuICAgIGxvZ2dlci5pbmZvKCdDbGVhbmVkIHVwIG1lcmdlZCBicmFuY2gnLCB7IGJyYW5jaDogYnJhbmNoLm5hbWUgfSk7XG4gIH1cbn1cblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gVW5pZmllZCBzZXNzaW9uIHNwYXduZXJcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuLyoqXG4gKiBPcHRpb25zIGZvciB7QGxpbmsgc3Bhd25DbGF1ZGVTZXNzaW9ufS5cbiAqXG4gKiBBY3Rpb25zIHByb3ZpZGUgdGhlIHZhcmlhYmxlIHBhcnRzIChwcm9tcHQsIHNlc3Npb24gaWRlbnRpdHksIHN3aXRjaC10by1cbiAqIGludGVyYWN0aXZlIHN1cHBvcnQpOyB0aGUgaGVscGVyIGhhbmRsZXMgZXZlcnl0aGluZyBlbHNlOiB3b3JrdHJlZVxuICogcmVzb2x1dGlvbiwgbWFya2V0cGxhY2UgcmVnaXN0cmF0aW9uLCBlbnYgY29uc3RydWN0aW9uLCBzcGF3biwgbGlmZWN5Y2xlXG4gKiBjYWxsYmFja3MsIGFuZCBwb3N0LWV4aXQgYnJhbmNoIGNsZWFudXAuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgQ2xhdWRlU2Vzc2lvbk9wdGlvbnMge1xuICAvKiogUHJvbXB0IHN0cmluZyBwYXNzZWQgdG8gdGhlIENsYXVkZSBDTEkuICovXG4gIHByb21wdDogc3RyaW5nO1xuICAvKiogU2Vzc2lvbiBpZGVudGlmaWVyICh1c2VkIGZvciBgLS1zZXNzaW9uLWlkYCBvciBgLS1yZXN1bWVgKS4gKi9cbiAgc2Vzc2lvbklkOiBzdHJpbmc7XG4gIC8qKiBXaGVuIHRydWUsIHBhc3NlcyBgLS1yZXN1bWVgIGluc3RlYWQgb2Ygc3RhcnRpbmcgYSBuZXcgc2Vzc2lvbi4gKi9cbiAgcmVzdW1lOiBib29sZWFuO1xuICAvKipcbiAgICogV2hlbiB0cnVlLCByZWdpc3RlcnMge0BsaW5rIEFjdGlvbkNvbnRleHQub25Td2l0Y2hUb0ludGVyYWN0aXZlfSBzb1xuICAgKiBiYWNrZ3JvdW5kLW1vZGUgc2Vzc2lvbnMgY2FuIGJlIHByb21vdGVkIHRvIGludGVyYWN0aXZlLlxuICAgKi9cbiAgc3VwcG9ydHNTd2l0Y2hUb0ludGVyYWN0aXZlOiBib29sZWFuO1xufVxuXG4vKipcbiAqIFNwYXducyBhIGBjbGF1ZGVgIENMSSBzZXNzaW9uIHdpdGggZnVsbCB3b3JrdHJlZSwgbWFya2V0cGxhY2UsIGFuZFxuICogbGlmZWN5Y2xlIG1hbmFnZW1lbnQuXG4gKlxuICogQ2VudHJhbGlzZXMgdGhlIHNwYXduIGxvZ2ljIHNoYXJlZCBieSB0aGUgYGxhdW5jaGAgYW5kIGBpbnRlcnZpZXdgXG4gKiBhY3Rpb25zIHNvIGVudmlyb25tZW50IHZhcmlhYmxlIGNvbnN0cnVjdGlvbiwgd29ya3RyZWUgcmVzb2x1dGlvbixcbiAqIG1hcmtldHBsYWNlIHJlZ2lzdHJhdGlvbiwgYW5kIHBvc3QtZXhpdCBjbGVhbnVwIGNhbm5vdCBkcmlmdCBiZXR3ZWVuXG4gKiBjYWxsZXJzLlxuICpcbiAqIFN0ZXBzOlxuICogMS4gQ3JlYXRlIHtAbGluayBDYXJkc0NsaWVudH1cbiAqIDIuIFJlc29sdmUgYmFzZSBicmFuY2ggYW5kIHdvcmt0cmVlXG4gKiAzLiBSZWdpc3RlciBtYXJrZXRwbGFjZVxuICogNC4gQnVpbGQgQ0xJIGFyZ3MgYW5kIHNwYXduIGBjbGF1ZGVgXG4gKiA1LiBXaXJlIG9uQ2FuY2VsIChhbmQgb3B0aW9uYWxseSBvblN3aXRjaFRvSW50ZXJhY3RpdmUpXG4gKiA2LiBDYXB0dXJlIHN0ZGVyciBpbiBiYWNrZ3JvdW5kIG1vZGVcbiAqIDcuIEF3YWl0IHByb2Nlc3MgZXhpdFxuICogOC4gQ2xlYW4gdXAgZnVsbHktbWVyZ2VkIGJyYW5jaGVzXG4gKlxuICogQHBhcmFtIGlucHV0IC0gUGFyc2VkIGFjdGlvbiBpbnB1dCBmcm9tIHRoZSBlbnZpcm9ubWVudC5cbiAqIEBwYXJhbSBjb250ZXh0IC0gQWN0aW9uIGNvbnRleHQgcHJvdmlkaW5nIGxvZ2dlciBhbmQgbGlmZWN5Y2xlIGhvb2tzLlxuICogQHBhcmFtIG9wdGlvbnMgLSBTZXNzaW9uLXNwZWNpZmljIHBhcmFtZXRlcnMgKHByb21wdCwgc2Vzc2lvbiBJRCwgZXRjLikuXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBzcGF3bkNsYXVkZVNlc3Npb24oXG4gIGlucHV0OiBBY3Rpb25JbnB1dCxcbiAgY29udGV4dDogQWN0aW9uQ29udGV4dCxcbiAgb3B0aW9uczogQ2xhdWRlU2Vzc2lvbk9wdGlvbnNcbik6IFByb21pc2U8dm9pZD4ge1xuICBjb25zdCB7IHByb21wdCwgc2Vzc2lvbklkLCByZXN1bWUsIHN1cHBvcnRzU3dpdGNoVG9JbnRlcmFjdGl2ZSB9ID0gb3B0aW9ucztcblxuICBjb250ZXh0LmxvZ2dlci5pbmZvKGAke2lucHV0LmFjdGlvbk5hbWV9IGFjdGlvbiBzdGFydGVkYCwge1xuICAgIGNhcmRJZDogaW5wdXQuY2FyZElkLFxuICAgIGVudmlyb25tZW50OiBpbnB1dC5lbnZpcm9ubWVudCxcbiAgICBleGVjdXRpb25Nb2RlOiBpbnB1dC5leGVjdXRpb25Nb2RlLFxuICAgIHNlc3Npb25JZFxuICB9KTtcblxuICBjb25zdCBjbGllbnQgPSBuZXcgQ2FyZHNDbGllbnQoe1xuICAgIGJhc2VVcmw6IGlucHV0LmFwaUJhc2VVcmwsXG4gICAgYWNjZXNzVG9rZW46IGlucHV0LmFwaUFjY2Vzc1Rva2VuXG4gIH0pO1xuXG4gIGNvbnN0IGJhc2VCcmFuY2ggPSBhd2FpdCByZXNvbHZlQmFzZUJyYW5jaChpbnB1dC5yZXBvUm9vdCk7XG5cbiAgY29uc3Qgd29ya3RyZWVSZXN1bHQgPSBhd2FpdCByZXNvbHZlT3JDcmVhdGVXb3JrdHJlZShpbnB1dCwgY2xpZW50LCBiYXNlQnJhbmNoLCBjb250ZXh0LmxvZ2dlcik7XG5cbiAgY29uc3QgeyB3b3JrdHJlZVBhdGg6IGN3ZCwgYnJhbmNoTmFtZSwgcGFyZW50QnJhbmNoIH0gPSB3b3JrdHJlZVJlc3VsdDtcbiAgY29udGV4dC5sb2dnZXIuaW5mbygnVXNpbmcgd29ya3RyZWUnLCB7IGN3ZCwgYnJhbmNoOiBicmFuY2hOYW1lLCBiYXNlQnJhbmNoLCBwYXJlbnRCcmFuY2ggfSk7XG5cbiAgY29uc3QgbWFya2V0cGxhY2VQYXRoID0gcmVzb2x2ZU1hcmtldHBsYWNlUGF0aCgpO1xuICBhd2FpdCB1cGRhdGVNYXJrZXRwbGFjZVJlZ2lzdHJhdGlvbihtYXJrZXRwbGFjZVBhdGgsIGNvbnRleHQubG9nZ2VyKTtcblxuICBjb25zdCBhcmdzID0gYnVpbGRBcmdzKHByb21wdCwgc2Vzc2lvbklkLCByZXN1bWUsIGlucHV0LmV4ZWN1dGlvbk1vZGUsIGlucHV0LmNhcmRSZXBvUGF0aCwgbWFya2V0cGxhY2VQYXRoKTtcbiAgY29uc3QgaXNJbnRlcmFjdGl2ZSA9IGlucHV0LmV4ZWN1dGlvbk1vZGUgPT09ICdpbnRlcmFjdGl2ZSc7XG5cbiAgY29uc3QgY2hpbGQ6IENoaWxkUHJvY2VzcyA9IHNwYXduKCdjbGF1ZGUnLCBhcmdzLCB7XG4gICAgY3dkLFxuICAgIHN0ZGlvOiBpc0ludGVyYWN0aXZlID8gJ2luaGVyaXQnIDogWydpZ25vcmUnLCAnaWdub3JlJywgJ3BpcGUnXSxcbiAgICBlbnY6IHtcbiAgICAgIC4uLnByb2Nlc3MuZW52LFxuICAgICAgV09SS1NQQUNFX1BBVEg6IGN3ZCxcbiAgICAgIENMQVVERV9DT0RFX1RBU0tfTElTVF9JRDogYGNhcmRzLWV4dGVuc2lvbi0ke2lucHV0LmNhcmRJZH1gLFxuICAgICAgQ0xBVURFX0NPREVfRVhQRVJJTUVOVEFMX0FHRU5UX1RFQU1TOiAnMScsXG4gICAgICBCQVNFX0JSQU5DSDogYmFzZUJyYW5jaCxcbiAgICAgIFBBUkVOVF9CUkFOQ0g6IHBhcmVudEJyYW5jaCxcbiAgICAgIFdPUktTUEFDRV9CUkFOQ0g6IGJyYW5jaE5hbWVcbiAgICB9XG4gIH0pO1xuXG4gIGNvbnRleHQub25DYW5jZWwoKCkgPT4ge1xuICAgIGNvbnRleHQubG9nZ2VyLmluZm8oYCR7aW5wdXQuYWN0aW9uTmFtZX0gYWN0aW9uIGNhbmNlbGxlZCwgdGVybWluYXRpbmcgY2xhdWRlYCwgeyBzZXNzaW9uSWQgfSk7XG4gICAgY2hpbGQua2lsbCgnU0lHVEVSTScpO1xuICB9KTtcblxuICBpZiAoc3VwcG9ydHNTd2l0Y2hUb0ludGVyYWN0aXZlKSB7XG4gICAgY29udGV4dC5vblN3aXRjaFRvSW50ZXJhY3RpdmUoKCkgPT4ge1xuICAgICAgY29udGV4dC5sb2dnZXIuaW5mbygnU3dpdGNoaW5nIHRvIGludGVyYWN0aXZlIG1vZGUnLCB7IHNlc3Npb25JZCB9KTtcbiAgICAgIGNoaWxkLmtpbGwoJ1NJR1RFUk0nKTtcbiAgICAgIHJldHVybiB7IHNlc3Npb25JZCB9O1xuICAgIH0pO1xuICB9XG5cbiAgLy8gQmFja2dyb3VuZCBtb2RlOiBjYXB0dXJlIHN0ZGVyciBmb3IgZGlhZ25vc3RpYyBsb2dnaW5nXG4gIGlmICghaXNJbnRlcmFjdGl2ZSkge1xuICAgIGNoaWxkLnN0ZGVycj8ub24oJ2RhdGEnLCAoY2h1bms6IEJ1ZmZlcikgPT4ge1xuICAgICAgY29uc3QgdGV4dCA9IGNodW5rLnRvU3RyaW5nKCkudHJpbSgpO1xuICAgICAgaWYgKHRleHQpIHtcbiAgICAgICAgY29udGV4dC5sb2dnZXIud2Fybih0ZXh0KTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gIGNvbnN0IGV4aXRDb2RlID0gYXdhaXQgbmV3IFByb21pc2U8bnVtYmVyIHwgbnVsbD4oKHJlc29sdmUpID0+IHtcbiAgICBjaGlsZC5vbignY2xvc2UnLCByZXNvbHZlKTtcbiAgfSk7XG5cbiAgY29udGV4dC5sb2dnZXIuaW5mbyhgJHtpbnB1dC5hY3Rpb25OYW1lfSBhY3Rpb24gY29tcGxldGVkYCwgeyBzZXNzaW9uSWQsIGV4aXRDb2RlIH0pO1xuXG4gIC8vIFBvc3QtZXhpdCBjbGVhbnVwOiByZW1vdmUgZnVsbHktbWVyZ2VkIGJyYW5jaGVzXG4gIHRyeSB7XG4gICAgYXdhaXQgY2xlYW51cE1lcmdlZEJyYW5jaGVzKGlucHV0LCBjbGllbnQsIGJhc2VCcmFuY2gsIGNvbnRleHQubG9nZ2VyKTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBjb250ZXh0LmxvZ2dlci53YXJuKCdCcmFuY2ggY2xlYW51cCBmYWlsZWQnLCB7XG4gICAgICBlcnJvcjogZXJyb3JNZXNzYWdlKGVycm9yKVxuICAgIH0pO1xuICB9XG59XG4iLCAiLyoqXG4gKiBFcnJvciBjbGFzc2VzIGZvciB0aGUgQ2FyZHMgVjIgU0RLLlxuICpcbiAqIFRoZXNlIGVycm9ycyBub3JtYWxpemUgc2VydmVyIHJlc3BvbnNlcyBhbmQgbmV0d29yayBmYWlsdXJlcyBzbyBjYWxsZXJzIGNhblxuICogZGlzdGluZ3Vpc2ggQVBJIHZhbGlkYXRpb24gcHJvYmxlbXMgZnJvbSB0cmFuc3BvcnQgaXNzdWVzLlxuICpcbiAqXG4gKiBAc3VtbWFyeSBFcnJvciBjbGFzc2VzIGZvciB0aGUgQ2FyZHMgVjIgU0RLXG4gKiBAbW9kdWxlIHR5cGVzL2Vycm9yc1xuICovXG5cbmltcG9ydCB0eXBlIHsgRmllbGRFcnJvciB9IGZyb20gJy4uLy4uL3Byb3RvY29sL2luZGV4LmpzJztcblxuLyoqXG4gKiBFcnJvciB0aHJvd24gd2hlbiBhbiBBUEkgcmVxdWVzdCBmYWlscyB3aXRoIGFuIGVycm9yIHJlc3BvbnNlLlxuICpcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiB0cnkge1xuICogICBhd2FpdCBjbGllbnQuY3JlYXRlQ2FyZChkYXRhKTtcbiAqIH0gY2F0Y2ggKGVycm9yKSB7XG4gKiAgIGlmIChlcnJvciBpbnN0YW5jZW9mIEFwaUVycm9yKSB7XG4gKiAgICAgY29uc29sZS5lcnJvcihgQVBJIGVycm9yIFske2Vycm9yLmNvZGV9XTogJHtlcnJvci5tZXNzYWdlfWApO1xuICogICAgIGlmIChlcnJvci5maWVsZHMpIHtcbiAqICAgICAgIGVycm9yLmZpZWxkcy5mb3JFYWNoKGYgPT4gY29uc29sZS5lcnJvcihgICAke2YuZmllbGR9OiAke2YubWVzc2FnZX1gKSk7XG4gKiAgICAgfVxuICogICB9XG4gKiB9XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNsYXNzIEFwaUVycm9yIGV4dGVuZHMgRXJyb3Ige1xuICAvKipcbiAgICogQ3JlYXRlcyBhIG5ldyBBcGlFcnJvciBpbnN0YW5jZS5cbiAgICpcbiAgICogQHBhcmFtIG1lc3NhZ2UgLSBIdW1hbi1yZWFkYWJsZSBlcnJvciBtZXNzYWdlXG4gICAqIEBwYXJhbSBjb2RlIC0gTWFjaGluZS1yZWFkYWJsZSBlcnJvciBjb2RlXG4gICAqIEBwYXJhbSBmaWVsZHMgLSBPcHRpb25hbCBhcnJheSBvZiBmaWVsZC1zcGVjaWZpYyB2YWxpZGF0aW9uIGVycm9yc1xuICAgKi9cbiAgY29uc3RydWN0b3IoXG4gICAgbWVzc2FnZTogc3RyaW5nLFxuICAgIHB1YmxpYyByZWFkb25seSBjb2RlOiBzdHJpbmcsXG4gICAgcHVibGljIHJlYWRvbmx5IGZpZWxkcz86IEZpZWxkRXJyb3JbXVxuICApIHtcbiAgICBzdXBlcihtZXNzYWdlKTtcbiAgICB0aGlzLm5hbWUgPSAnQXBpRXJyb3InO1xuICB9XG59XG5cbi8qKlxuICogRXJyb3IgdGhyb3duIHdoZW4gYSBuZXR3b3JrIHJlcXVlc3QgZmFpbHMgZHVlIHRvIGNvbm5lY3Rpdml0eSBpc3N1ZXMuXG4gKlxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIHRyeSB7XG4gKiAgIGF3YWl0IGNsaWVudC5saXN0Q2FyZHMoKTtcbiAqIH0gY2F0Y2ggKGVycm9yKSB7XG4gKiAgIGlmIChlcnJvciBpbnN0YW5jZW9mIE5ldHdvcmtFcnJvcikge1xuICogICAgIGNvbnNvbGUuZXJyb3IoYE5ldHdvcmsgZXJyb3I6ICR7ZXJyb3IubWVzc2FnZX1gKTtcbiAqICAgICBpZiAoZXJyb3IuY2F1c2UpIHtcbiAqICAgICAgIGNvbnNvbGUuZXJyb3IoYENhdXNlZCBieTogJHtlcnJvci5jYXVzZS5tZXNzYWdlfWApO1xuICogICAgIH1cbiAqICAgfVxuICogfVxuICogYGBgXG4gKi9cbmV4cG9ydCBjbGFzcyBOZXR3b3JrRXJyb3IgZXh0ZW5kcyBFcnJvciB7XG4gIC8qKlxuICAgKiBDcmVhdGVzIGEgbmV3IE5ldHdvcmtFcnJvciBpbnN0YW5jZS5cbiAgICpcbiAgICogQHBhcmFtIG1lc3NhZ2UgLSBIdW1hbi1yZWFkYWJsZSBlcnJvciBtZXNzYWdlXG4gICAqIEBwYXJhbSBjYXVzZSAtIE9wdGlvbmFsIHVuZGVybHlpbmcgZXJyb3IgdGhhdCBjYXVzZWQgdGhpcyBuZXR3b3JrIGZhaWx1cmVcbiAgICovXG4gIGNvbnN0cnVjdG9yKFxuICAgIG1lc3NhZ2U6IHN0cmluZyxcbiAgICBwdWJsaWMgcmVhZG9ubHkgY2F1c2U/OiBFcnJvclxuICApIHtcbiAgICBzdXBlcihtZXNzYWdlKTtcbiAgICB0aGlzLm5hbWUgPSAnTmV0d29ya0Vycm9yJztcbiAgfVxufVxuIiwgIi8qKlxuICogSFRUUCBjbGllbnQgZm9yIHRoZSBDYXJkcyBWMiBSRVNUIEFQSS5cbiAqXG4gKlxuICogQHN1bW1hcnkgSFRUUCBjbGllbnQgZm9yIHRoZSBDYXJkcyBWMiBSRVNUIEFQSVxuICogQG1vZHVsZSBzZGsvQ2FyZHNDbGllbnRcbiAqL1xuXG5pbXBvcnQgdHlwZSB7XG4gIEFjdGlvblJlc3VsdCxcbiAgQ2FyZCxcbiAgQ29tcGFyZVJlcXVlc3QsXG4gIENvbXBhcmVTdGF0ZSxcbiAgSHR0cENsaWVudCxcbiAgU3RyZWFtTWV0YSxcbiAgVGltZWxpbmVJdGVtXG59IGZyb20gJy4uL3Byb3RvY29sL2luZGV4LmpzJztcbmltcG9ydCB0eXBlIHtcbiAgQWRkQnJhbmNoUmVxdWVzdCxcbiAgQXR0YWNobWVudFJlc3BvbnNlLFxuICBCcmFuY2hlc1Jlc3BvbnNlLFxuICBDYXJkQ3JlYXRlRGF0YSxcbiAgQ2FyZHNDbGllbnRPcHRpb25zLFxuICBDYXJkVXBkYXRlRGF0YSxcbiAgQ29tbWVudCxcbiAgQ29tbWVudENyZWF0ZURhdGEsXG4gIENvbW1lbnRVcGRhdGVEYXRhLFxuICBDb21taXRJbmZvLFxuICBHYXRlQXBwcm92YWxSZXNwb25zZSxcbiAgSW5nZXN0V3NGYWN0b3J5LFxuICBMaXN0Q2FyZHNPcHRpb25zLFxuICBTdHJlYW1SZXN1bHQsXG4gIFN0cmVhbVdyaXRlcixcbiAgU3RyZWFtV3JpdGVyT3B0aW9ucyxcbiAgVGltZWxpbmVPcHRpb25zLFxuICBUeXBlU2NoZW1hc1Jlc3BvbnNlLFxuICBXc1N0cmVhbVNlc3Npb25cbn0gZnJvbSAnLi90eXBlcy9jbGllbnQuanMnO1xuaW1wb3J0IHsgQXBpRXJyb3IsIE5ldHdvcmtFcnJvciB9IGZyb20gJy4vdHlwZXMvZXJyb3JzLmpzJztcblxuLyoqIEluaXRpYWwgcmVxdWVzdCB0aW1lb3V0IGluIG1pbGxpc2Vjb25kcyAoMyBzZWNvbmRzIHRvIGFjY29tbW9kYXRlIGdpdC1iYWNrZWQgZW5kcG9pbnRzKS4gKi9cbmNvbnN0IElOSVRJQUxfVElNRU9VVF9NUyA9IDNfMDAwO1xuXG4vKiogTWF4aW11bSByZXF1ZXN0IHRpbWVvdXQgaW4gbWlsbGlzZWNvbmRzIGFmdGVyIGV4cG9uZW50aWFsIGJhY2tvZmYuICovXG5jb25zdCBNQVhfVElNRU9VVF9NUyA9IDEwXzAwMDtcblxuLyoqIE1heGltdW0gbnVtYmVyIG9mIGF1dG9tYXRpYyByZXRyaWVzIGZvciB0aW1lb3V0IGVycm9ycyBiZWZvcmUgZ2l2aW5nIHVwLiAqL1xuY29uc3QgTUFYX1RJTUVPVVRfUkVUUklFUyA9IDI7XG5cbi8qKlxuICogVHlwZS1zYWZlIEhUVFAgY2xpZW50IGZvciB0aGUgQ2FyZHMgVjIgUkVTVCBBUEkuXG4gKlxuICogVXNlcyB0aGUgRmV0Y2ggQVBJIGJ5IGRlZmF1bHQgYW5kIHN1cHBvcnRzIGRlcGVuZGVuY3kgaW5qZWN0aW9uIG9mIGFuXG4gKiBhbHRlcm5hdGUge0BsaW5rIEh0dHBDbGllbnR9IGZvciB0ZXN0cyBvciBjdXN0b20gdHJhbnNwb3J0cy4gQWxsIHB1YmxpY1xuICogbWV0aG9kcyBzdXJmYWNlIHNlcnZlciBmYWlsdXJlcyBhcyB7QGxpbmsgQXBpRXJyb3J9IGFuZCB0cmFuc3BvcnQgZmFpbHVyZXNcbiAqIGFzIHtAbGluayBOZXR3b3JrRXJyb3J9LlxuICpcbiAqIFRoZSBkZWZhdWx0IEhUVFAgY2xpZW50IGFwcGxpZXMgYW4gZXhwb25lbnRpYWwgYmFja29mZiB0aW1lb3V0IHRvIGZldGNoXG4gKiByZXF1ZXN0czogc3RhcnRpbmcgYXQgMyBzZWNvbmRzLCBkb3VibGluZyBvbiBlYWNoIGNvbnNlY3V0aXZlIGZhaWx1cmUgdXBcbiAqIHRvIGEgMTAtc2Vjb25kIGNhcCwgYW5kIHJlc2V0dGluZyBvbiBhbnkgc3VjY2Vzc2Z1bCByZXNwb25zZS4gVGhpcyBlbnN1cmVzXG4gKiBmYXN0IGZhaWx1cmUgZGV0ZWN0aW9uIHdoZW4gdGhlIHNlcnZlciBpcyBkb3duIHdoaWxlIGFsbG93aW5nIHNsb3dlclxuICogcmVzcG9uc2VzIGR1cmluZyByZWNvdmVyeS5cbiAqXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogY29uc3QgY2xpZW50ID0gbmV3IENhcmRzQ2xpZW50KHsgYmFzZVVybDogJ2h0dHA6Ly9sb2NhbGhvc3Q6MzAwMCcsIGFjY2Vzc1Rva2VuOiAndG9rZW4nIH0pO1xuICpcbiAqIGNvbnN0IGNhcmRzID0gYXdhaXQgY2xpZW50Lmxpc3RDYXJkcyh7IHN0YXR1czogJ2luX3Byb2dyZXNzJyB9KTtcbiAqIGF3YWl0IGNsaWVudC51cGRhdGVDYXJkKGNhcmRJZCwgeyBzdGF0dXM6ICdkb25lJyB9KTtcbiAqIGBgYFxuICovXG5leHBvcnQgY2xhc3MgQ2FyZHNDbGllbnQge1xuICBwcml2YXRlIHJlYWRvbmx5IF9odHRwQ2xpZW50PzogSHR0cENsaWVudDtcblxuICAvKiogQ3VycmVudCB0aW1lb3V0IGluIG1pbGxpc2Vjb25kcywgaW5jcmVhc2VzIHdpdGggY29uc2VjdXRpdmUgZmFpbHVyZXMuICovXG4gIHByaXZhdGUgX2N1cnJlbnRUaW1lb3V0TXMgPSBJTklUSUFMX1RJTUVPVVRfTVM7XG5cbiAgLyoqXG4gICAqIENyZWF0ZXMgYSBuZXcgQ2FyZHNDbGllbnQgaW5zdGFuY2UuXG4gICAqXG4gICAqIEBwYXJhbSBvcHRpb25zIC0gQ29uZmlndXJhdGlvbiBvcHRpb25zIGluY2x1ZGluZyBiYXNlIFVSTCBhbmQgYXV0aCB0b2tlbi5cbiAgICogQHBhcmFtIGh0dHBDbGllbnQgLSBPcHRpb25hbCBIVFRQIGNsaWVudCBmb3IgZGVwZW5kZW5jeSBpbmplY3Rpb24uXG4gICAqL1xuICBjb25zdHJ1Y3RvcihcbiAgICBwcml2YXRlIHJlYWRvbmx5IG9wdGlvbnM6IENhcmRzQ2xpZW50T3B0aW9ucyxcbiAgICBodHRwQ2xpZW50PzogSHR0cENsaWVudFxuICApIHtcbiAgICB0aGlzLl9odHRwQ2xpZW50ID0gaHR0cENsaWVudDtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXR1cm5zIHRoZSBiYXNlIFVSTCB1c2VkIHRvIGJ1aWxkIEFQSSByZXF1ZXN0cy5cbiAgICpcbiAgICogQHJldHVybnMgVGhlIGJhc2UgVVJMIHN0cmluZyBhcyBwcm92aWRlZCBpbiB7QGxpbmsgQ2FyZHNDbGllbnRPcHRpb25zfS5cbiAgICovXG4gIGdldEJhc2VVcmwoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gdGhpcy5vcHRpb25zLmJhc2VVcmw7XG4gIH1cblxuICAvKipcbiAgICogUmV0dXJucyB3aGV0aGVyIGFuIEhUVFAgY2xpZW50IHdhcyBpbmplY3RlZC5cbiAgICpcbiAgICogQHJldHVybnMgVHJ1ZSBpZiBhbiBIVFRQIGNsaWVudCB3YXMgcHJvdmlkZWQgZHVyaW5nIGNvbnN0cnVjdGlvbi5cbiAgICogQGludGVybmFsIFVzZWQgZm9yIHRlc3RpbmcgZGVwZW5kZW5jeSBpbmplY3Rpb24uXG4gICAqL1xuICBoYXNIdHRwQ2xpZW50KCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLl9odHRwQ2xpZW50ICE9PSB1bmRlZmluZWQ7XG4gIH1cbiAgLyoqXG4gICAqIFJldHVybnMgYW4gQWJvcnRTaWduYWwgdGhhdCBmaXJlcyBhZnRlciB0aGUgY3VycmVudCBiYWNrb2ZmIHRpbWVvdXQuXG4gICAqIFVzZXMgY2FsbGVyJ3Mgc2lnbmFsIGlmIHByb3ZpZGVkIChmb3IgREkvdGVzdGluZyksIG90aGVyd2lzZSBhcHBsaWVzIHRoZSBiYWNrb2ZmIHRpbWVvdXQuXG4gICAqXG4gICAqIEBwYXJhbSBleGlzdGluZ1NpZ25hbCAtIE9wdGlvbmFsIGNhbGxlci1wcm92aWRlZCBzaWduYWwgdG8gcmV1c2UgaW5zdGVhZCBvZiBjcmVhdGluZyBhIHRpbWVvdXQgc2lnbmFsLlxuICAgKiBAcmV0dXJucyBBYm9ydFNpZ25hbCB0aGF0IGNvbnRyb2xzIHJlcXVlc3QgY2FuY2VsbGF0aW9uIGZvciB0aGUgY3VycmVudCBvcGVyYXRpb24uXG4gICAqL1xuICBwcml2YXRlIGdldFRpbWVvdXRTaWduYWwoZXhpc3RpbmdTaWduYWw/OiBBYm9ydFNpZ25hbCB8IG51bGwpOiBBYm9ydFNpZ25hbCB7XG4gICAgaWYgKGV4aXN0aW5nU2lnbmFsKSByZXR1cm4gZXhpc3RpbmdTaWduYWw7XG4gICAgcmV0dXJuIEFib3J0U2lnbmFsLnRpbWVvdXQodGhpcy5fY3VycmVudFRpbWVvdXRNcyk7XG4gIH1cblxuICAvKipcbiAgICogUmVjb3JkcyBhIHN1Y2Nlc3NmdWwgcmVxdWVzdCBhbmQgcmVzZXRzIHRoZSB0aW1lb3V0IGJhY2tvZmYuXG4gICAqL1xuICBwcml2YXRlIG9uUmVxdWVzdFN1Y2Nlc3MoKTogdm9pZCB7XG4gICAgdGhpcy5fY3VycmVudFRpbWVvdXRNcyA9IElOSVRJQUxfVElNRU9VVF9NUztcbiAgfVxuXG4gIC8qKlxuICAgKiBSZWNvcmRzIGEgZmFpbGVkIHJlcXVlc3QgYW5kIGluY3JlYXNlcyB0aGUgdGltZW91dCB2aWEgZXhwb25lbnRpYWwgYmFja29mZi5cbiAgICovXG4gIHByaXZhdGUgb25SZXF1ZXN0RmFpbHVyZSgpOiB2b2lkIHtcbiAgICB0aGlzLl9jdXJyZW50VGltZW91dE1zID0gTWF0aC5taW4odGhpcy5fY3VycmVudFRpbWVvdXRNcyAqIDIsIE1BWF9USU1FT1VUX01TKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBEZWZhdWx0IEhUVFAgY2xpZW50IGltcGxlbWVudGF0aW9uIHVzaW5nIGZldGNoICsgSlNPTiBwYXlsb2Fkcy5cbiAgICpcbiAgICogRWFjaCBmZXRjaCBjYWxsIGluY2x1ZGVzIGFuIEFib3J0U2lnbmFsLnRpbWVvdXQgdGhhdCBzdGFydHMgYXQgMyBzZWNvbmRzXG4gICAqIGFuZCBkb3VibGVzIG9uIGNvbnNlY3V0aXZlIGZhaWx1cmVzIHVwIHRvIDEwIHNlY29uZHMuXG4gICAqL1xuICBwcml2YXRlIGRlZmF1bHRIdHRwQ2xpZW50OiBIdHRwQ2xpZW50ID0ge1xuICAgIGdldDogYXN5bmMgPFQ+KHVybDogc3RyaW5nLCBvcHRpb25zPzogUmVxdWVzdEluaXQpOiBQcm9taXNlPFQ+ID0+IHtcbiAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZmV0Y2godXJsLCB7XG4gICAgICAgIC4uLm9wdGlvbnMsXG4gICAgICAgIGhlYWRlcnM6IHsgLi4udGhpcy5nZXRIZWFkZXJzKCksIC4uLm9wdGlvbnM/LmhlYWRlcnMgfSxcbiAgICAgICAgc2lnbmFsOiB0aGlzLmdldFRpbWVvdXRTaWduYWwob3B0aW9ucz8uc2lnbmFsKVxuICAgICAgfSk7XG4gICAgICBpZiAoIXJlc3BvbnNlLm9rKSB0aHJvdyByZXNwb25zZTtcbiAgICAgIHJldHVybiByZXNwb25zZS5qc29uKCkgYXMgUHJvbWlzZTxUPjtcbiAgICB9LFxuICAgIHBvc3Q6IGFzeW5jIDxUPih1cmw6IHN0cmluZywgYm9keTogdW5rbm93biwgb3B0aW9ucz86IFJlcXVlc3RJbml0KTogUHJvbWlzZTxUPiA9PiB7XG4gICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGZldGNoKHVybCwge1xuICAgICAgICAuLi5vcHRpb25zLFxuICAgICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgICAgaGVhZGVyczogeyAuLi50aGlzLmdldEhlYWRlcnMoKSwgLi4ub3B0aW9ucz8uaGVhZGVycyB9LFxuICAgICAgICBib2R5OiBib2R5ID8gSlNPTi5zdHJpbmdpZnkoYm9keSkgOiB1bmRlZmluZWQsXG4gICAgICAgIHNpZ25hbDogdGhpcy5nZXRUaW1lb3V0U2lnbmFsKG9wdGlvbnM/LnNpZ25hbClcbiAgICAgIH0pO1xuICAgICAgaWYgKCFyZXNwb25zZS5vaykgdGhyb3cgcmVzcG9uc2U7XG4gICAgICByZXR1cm4gcmVzcG9uc2UuanNvbigpIGFzIFByb21pc2U8VD47XG4gICAgfSxcbiAgICBwdXQ6IGFzeW5jIDxUPih1cmw6IHN0cmluZywgYm9keTogdW5rbm93biwgb3B0aW9ucz86IFJlcXVlc3RJbml0KTogUHJvbWlzZTxUPiA9PiB7XG4gICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGZldGNoKHVybCwge1xuICAgICAgICAuLi5vcHRpb25zLFxuICAgICAgICBtZXRob2Q6ICdQVVQnLFxuICAgICAgICBoZWFkZXJzOiB7IC4uLnRoaXMuZ2V0SGVhZGVycygpLCAuLi5vcHRpb25zPy5oZWFkZXJzIH0sXG4gICAgICAgIGJvZHk6IGJvZHkgPyBKU09OLnN0cmluZ2lmeShib2R5KSA6IHVuZGVmaW5lZCxcbiAgICAgICAgc2lnbmFsOiB0aGlzLmdldFRpbWVvdXRTaWduYWwob3B0aW9ucz8uc2lnbmFsKVxuICAgICAgfSk7XG4gICAgICBpZiAoIXJlc3BvbnNlLm9rKSB0aHJvdyByZXNwb25zZTtcbiAgICAgIHJldHVybiByZXNwb25zZS5qc29uKCkgYXMgUHJvbWlzZTxUPjtcbiAgICB9LFxuICAgIHBhdGNoOiBhc3luYyA8VD4odXJsOiBzdHJpbmcsIGJvZHk6IHVua25vd24sIG9wdGlvbnM/OiBSZXF1ZXN0SW5pdCk6IFByb21pc2U8VD4gPT4ge1xuICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBmZXRjaCh1cmwsIHtcbiAgICAgICAgLi4ub3B0aW9ucyxcbiAgICAgICAgbWV0aG9kOiAnUEFUQ0gnLFxuICAgICAgICBoZWFkZXJzOiB7IC4uLnRoaXMuZ2V0SGVhZGVycygpLCAuLi5vcHRpb25zPy5oZWFkZXJzIH0sXG4gICAgICAgIGJvZHk6IGJvZHkgPyBKU09OLnN0cmluZ2lmeShib2R5KSA6IHVuZGVmaW5lZCxcbiAgICAgICAgc2lnbmFsOiB0aGlzLmdldFRpbWVvdXRTaWduYWwob3B0aW9ucz8uc2lnbmFsKVxuICAgICAgfSk7XG4gICAgICBpZiAoIXJlc3BvbnNlLm9rKSB0aHJvdyByZXNwb25zZTtcbiAgICAgIHJldHVybiByZXNwb25zZS5qc29uKCkgYXMgUHJvbWlzZTxUPjtcbiAgICB9LFxuICAgIGRlbGV0ZTogYXN5bmMgKHVybDogc3RyaW5nLCBvcHRpb25zPzogUmVxdWVzdEluaXQpOiBQcm9taXNlPHZvaWQ+ID0+IHtcbiAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZmV0Y2godXJsLCB7XG4gICAgICAgIC4uLm9wdGlvbnMsXG4gICAgICAgIG1ldGhvZDogJ0RFTEVURScsXG4gICAgICAgIGhlYWRlcnM6IHsgLi4udGhpcy5nZXRIZWFkZXJzKCksIC4uLm9wdGlvbnM/LmhlYWRlcnMgfSxcbiAgICAgICAgc2lnbmFsOiB0aGlzLmdldFRpbWVvdXRTaWduYWwob3B0aW9ucz8uc2lnbmFsKVxuICAgICAgfSk7XG4gICAgICBpZiAoIXJlc3BvbnNlLm9rKSB0aHJvdyByZXNwb25zZTtcbiAgICB9XG4gIH07XG5cbiAgLyoqXG4gICAqIEdldHMgSFRUUCBoZWFkZXJzIGZvciBKU09OIEFQSSByZXF1ZXN0cy5cbiAgICpcbiAgICogQHJldHVybnMgSGVhZGVycyB3aXRoIEpTT04gY29udGVudCB0eXBlIGFuZCBvcHRpb25hbCBiZWFyZXIgdG9rZW4uXG4gICAqL1xuICBwcml2YXRlIGdldEhlYWRlcnMoKTogSGVhZGVyc0luaXQge1xuICAgIGNvbnN0IGhlYWRlcnM6IEhlYWRlcnNJbml0ID0geyAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nIH07XG4gICAgaWYgKHRoaXMub3B0aW9ucy5hY2Nlc3NUb2tlbikge1xuICAgICAgaGVhZGVyc1snQXV0aG9yaXphdGlvbiddID0gYEJlYXJlciAke3RoaXMub3B0aW9ucy5hY2Nlc3NUb2tlbn1gO1xuICAgIH1cbiAgICByZXR1cm4gaGVhZGVycztcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXRzIHRoZSBIVFRQIGNsaWVudCB0byB1c2UgZm9yIHJlcXVlc3RzLlxuICAgKlxuICAgKiBAcmV0dXJucyBJbmplY3RlZCBIVFRQIGNsaWVudCB3aGVuIHByb3ZpZGVkLCBvdGhlcndpc2UgdGhlIGRlZmF1bHQgZmV0Y2gtYmFzZWQgY2xpZW50LlxuICAgKi9cbiAgcHJpdmF0ZSBnZXRIdHRwQ2xpZW50KCk6IEh0dHBDbGllbnQge1xuICAgIHJldHVybiB0aGlzLl9odHRwQ2xpZW50ID8/IHRoaXMuZGVmYXVsdEh0dHBDbGllbnQ7XG4gIH1cblxuICAvKipcbiAgICogQnVpbGRzIGEgVVJMIHJlbGF0aXZlIHRvIHRoZSBjb25maWd1cmVkIGJhc2UgVVJMLlxuICAgKlxuICAgKiBVbmRlZmluZWQgYW5kIG51bGwgcXVlcnkgcGFyYW1zIGFyZSBvbWl0dGVkLiBWYWx1ZXMgYXJlIHN0cmluZ2lmaWVkLlxuICAgKlxuICAgKiBAcGFyYW0gcGF0aCAtIFJlbGF0aXZlIEFQSSBwYXRoIHRvIGFwcGVuZCB0byB0aGUgY29uZmlndXJlZCBiYXNlIFVSTC5cbiAgICogQHBhcmFtIHBhcmFtcyAtIE9wdGlvbmFsIHF1ZXJ5IHBhcmFtZXRlcnMgdG8gZW5jb2RlIG9udG8gdGhlIFVSTC5cbiAgICogQHJldHVybnMgRnVsbHktcXVhbGlmaWVkIHJlcXVlc3QgVVJMIHN0cmluZy5cbiAgICovXG4gIHByaXZhdGUgYnVpbGRVcmwocGF0aDogc3RyaW5nLCBwYXJhbXM/OiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPik6IHN0cmluZyB7XG4gICAgY29uc3QgdXJsID0gbmV3IFVSTChwYXRoLCB0aGlzLm9wdGlvbnMuYmFzZVVybCk7XG4gICAgaWYgKHBhcmFtcykge1xuICAgICAgZm9yIChjb25zdCBba2V5LCB2YWx1ZV0gb2YgT2JqZWN0LmVudHJpZXMocGFyYW1zKSkge1xuICAgICAgICBpZiAodmFsdWUgIT09IHVuZGVmaW5lZCAmJiB2YWx1ZSAhPT0gbnVsbCkge1xuICAgICAgICAgIHVybC5zZWFyY2hQYXJhbXMuc2V0KGtleSwgU3RyaW5nKHZhbHVlKSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHVybC50b1N0cmluZygpO1xuICB9XG5cbiAgLyoqXG4gICAqIFdyYXBzIGEgcmVxdWVzdCB3aXRoIGNvbnNpc3RlbnQgZXJyb3IgaGFuZGxpbmcuXG4gICAqXG4gICAqIEBwYXJhbSBmbiAtIEFzeW5jIHJlcXVlc3QgZnVuY3Rpb24gdG8gZXhlY3V0ZS5cbiAgICogQHJldHVybnMgVGhlIHJlc29sdmVkIHZhbHVlIGZyb20gdGhlIHJlcXVlc3QgZnVuY3Rpb24uXG4gICAqIEB0aHJvd3MgQXBpRXJyb3Igd2hlbiB0aGUgc2VydmVyIHJlc3BvbmRzIHdpdGggYSBub24tMnh4IHN0YXR1cy5cbiAgICogQHRocm93cyBOZXR3b3JrRXJyb3IgZm9yIG5ldHdvcmsgZmFpbHVyZXMgb3IgdW5leHBlY3RlZCBleGNlcHRpb25zLlxuICAgKi9cbiAgcHJpdmF0ZSBhc3luYyByZXF1ZXN0PFQ+KGZuOiAoKSA9PiBQcm9taXNlPFQ+KTogUHJvbWlzZTxUPiB7XG4gICAgbGV0IGxhc3RUaW1lb3V0RXJyb3I6IE5ldHdvcmtFcnJvciB8IHVuZGVmaW5lZDtcblxuICAgIGZvciAobGV0IGF0dGVtcHQgPSAwOyBhdHRlbXB0IDw9IE1BWF9USU1FT1VUX1JFVFJJRVM7IGF0dGVtcHQrKykge1xuICAgICAgdHJ5IHtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgZm4oKTtcbiAgICAgICAgdGhpcy5vblJlcXVlc3RTdWNjZXNzKCk7XG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICBpZiAoZXJyb3IgaW5zdGFuY2VvZiBSZXNwb25zZSkge1xuICAgICAgICAgIC8vIFNlcnZlciByZXNwb25kZWQgKGV2ZW4gd2l0aCBhbiBlcnJvciBzdGF0dXMpIC0gY29ubmVjdGlvbiBpcyBhbGl2ZSwgcmVzZXQgYmFja29mZlxuICAgICAgICAgIHRoaXMub25SZXF1ZXN0U3VjY2VzcygpO1xuICAgICAgICAgIGxldCBib2R5OiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPiA9IHt9O1xuICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICBib2R5ID0gYXdhaXQgZXJyb3IuanNvbigpO1xuICAgICAgICAgIH0gY2F0Y2ggKHBhcnNlRXJyb3IpIHtcbiAgICAgICAgICAgIC8vIFN5bnRheEVycm9yIGlzIGV4cGVjdGVkIHdoZW4gc2VydmVyIHJldHVybnMgbm9uLUpTT04gZXJyb3IgcmVzcG9uc2UgKGUuZy4sIEhUTUwgZXJyb3IgcGFnZSlcbiAgICAgICAgICAgIGlmICghKHBhcnNlRXJyb3IgaW5zdGFuY2VvZiBTeW50YXhFcnJvcikpIHtcbiAgICAgICAgICAgICAgY29uc29sZS53YXJuKCdbQ2FyZHNDbGllbnRdIFVuZXhwZWN0ZWQgZXJyb3IgcGFyc2luZyBlcnJvciByZXNwb25zZTonLCBwYXJzZUVycm9yKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgY29uc3QgbWVzc2FnZSA9XG4gICAgICAgICAgICAoYm9keVsnZXJyb3InXSBhcyBzdHJpbmcgfCB1bmRlZmluZWQpIHx8IChib2R5WydtZXNzYWdlJ10gYXMgc3RyaW5nIHwgdW5kZWZpbmVkKSB8fCBlcnJvci5zdGF0dXNUZXh0O1xuICAgICAgICAgIGNvbnN0IGNvZGUgPSAoYm9keVsnY29kZSddIGFzIHN0cmluZyB8IHVuZGVmaW5lZCkgfHwgU3RyaW5nKGVycm9yLnN0YXR1cyk7XG4gICAgICAgICAgY29uc3QgZmllbGRzID0gYm9keVsnZmllbGRzJ10gYXMgQXJyYXk8eyBmaWVsZDogc3RyaW5nOyBtZXNzYWdlOiBzdHJpbmcgfT4gfCB1bmRlZmluZWQ7XG4gICAgICAgICAgdGhyb3cgbmV3IEFwaUVycm9yKG1lc3NhZ2UsIGNvZGUsIGZpZWxkcyk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBOZXR3b3JrIG9yIHRpbWVvdXQgZmFpbHVyZSAtIGluY3JlYXNlIGJhY2tvZmYgZm9yIG5leHQgYXR0ZW1wdFxuICAgICAgICB0aGlzLm9uUmVxdWVzdEZhaWx1cmUoKTtcblxuICAgICAgICBpZiAoZXJyb3IgaW5zdGFuY2VvZiBET01FeGNlcHRpb24gJiYgZXJyb3IubmFtZSA9PT0gJ1RpbWVvdXRFcnJvcicpIHtcbiAgICAgICAgICBsYXN0VGltZW91dEVycm9yID0gbmV3IE5ldHdvcmtFcnJvcignUmVxdWVzdCB0aW1lZCBvdXQnLCBlcnJvcik7XG4gICAgICAgICAgLy8gUmV0cnkgb24gdGltZW91dCAtIG9uUmVxdWVzdEZhaWx1cmUoKSBhbHJlYWR5IGluY3JlYXNlZCBfY3VycmVudFRpbWVvdXRNc1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gTm9uLXRpbWVvdXQgbmV0d29yayBlcnJvcnMgKEROUyBmYWlsdXJlLCBjb25uZWN0aW9uIHJlZnVzZWQpIGFyZSBub3QgcmV0cmllZFxuICAgICAgICB0aHJvdyBuZXcgTmV0d29ya0Vycm9yKCdSZXF1ZXN0IGZhaWxlZCcsIGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvciA6IHVuZGVmaW5lZCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gQWxsIHJldHJ5IGF0dGVtcHRzIGV4aGF1c3RlZFxuICAgIHRocm93IGxhc3RUaW1lb3V0RXJyb3IhO1xuICB9XG5cbiAgLy8gLS0tIENhcmQgT3BlcmF0aW9ucyAtLS1cblxuICAvKipcbiAgICogTGlzdHMgY2FyZHMgd2l0aCBvcHRpb25hbCBmaWx0ZXJpbmcuXG4gICAqXG4gICAqIEBwYXJhbSBvcHRpb25zIC0gT3B0aW9uYWwgZmlsdGVyIGFuZCBwYWdpbmF0aW9uIG9wdGlvbnMuXG4gICAqIEByZXR1cm5zIFByb21pc2UgcmVzb2x2aW5nIHRvIG1hdGNoaW5nIGNhcmRzLlxuICAgKiBAdGhyb3dzIEFwaUVycm9yIHdoZW4gdGhlIHNlcnZlciByZXNwb25kcyB3aXRoIGFuIGVycm9yLlxuICAgKiBAdGhyb3dzIE5ldHdvcmtFcnJvciB3aGVuIHRoZSByZXF1ZXN0IGZhaWxzIHRvIHJlYWNoIHRoZSBzZXJ2ZXIuXG4gICAqL1xuICBhc3luYyBsaXN0Q2FyZHMob3B0aW9ucz86IExpc3RDYXJkc09wdGlvbnMpOiBQcm9taXNlPENhcmRbXT4ge1xuICAgIGNvbnN0IHVybFN0ciA9IHRoaXMuYnVpbGRVcmwoJy9jYXJkcycsIHtcbiAgICAgIHdvcmtzcGFjZVBhdGg6IHRoaXMub3B0aW9ucy53b3Jrc3BhY2VQYXRoLFxuICAgICAgc3RhdHVzOiBvcHRpb25zPy5zdGF0dXMsXG4gICAgICBzZWFyY2g6IG9wdGlvbnM/LnNlYXJjaCxcbiAgICAgIGxpbWl0OiBvcHRpb25zPy5saW1pdCxcbiAgICAgIG9mZnNldDogb3B0aW9ucz8ub2Zmc2V0XG4gICAgfSk7XG4gICAgY29uc3QgdXJsID0gbmV3IFVSTCh1cmxTdHIpO1xuICAgIGZvciAoY29uc3QgdCBvZiBvcHRpb25zPy50YWdzID8/IFtdKSB7XG4gICAgICB1cmwuc2VhcmNoUGFyYW1zLmFwcGVuZCgndGFnJywgdCk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLnJlcXVlc3QoKCkgPT4gdGhpcy5nZXRIdHRwQ2xpZW50KCkuZ2V0PENhcmRbXT4odXJsLnRvU3RyaW5nKCkpKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBMaXN0cyBjYXJkcyBhcyBsaWdodHdlaWdodCBzdW1tYXJpZXMgZm9yIGxpc3Qgdmlld3MuXG4gICAqXG4gICAqIFJldHVybnMgcHJlLWZsYXR0ZW5lZCBmaWVsZHMgc3VpdGFibGUgZm9yIGRpcmVjdCB1c2UgaW4gbGlzdCByZW5kZXJpbmcsXG4gICAqIG9taXR0aW5nIGhlYXZ5d2VpZ2h0IGZpZWxkcyBsaWtlIGBwbGFuQ29udGVudGAgYW5kIGByZXBvc2l0b3J5UGF0aGAuXG4gICAqXG4gICAqIEB0ZW1wbGF0ZSBUIC0gVGhlIGV4cGVjdGVkIHN1bW1hcnkgc2hhcGUgKGRlZmF1bHQgYFJlY29yZDxzdHJpbmcsIHVua25vd24+YCkuXG4gICAqIEByZXR1cm5zIFByb21pc2UgcmVzb2x2aW5nIHRvIGNhcmQgc3VtbWFyaWVzLlxuICAgKiBAdGhyb3dzIEFwaUVycm9yIHdoZW4gdGhlIHNlcnZlciByZXNwb25kcyB3aXRoIGFuIGVycm9yLlxuICAgKiBAdGhyb3dzIE5ldHdvcmtFcnJvciB3aGVuIHRoZSByZXF1ZXN0IGZhaWxzIHRvIHJlYWNoIHRoZSBzZXJ2ZXIuXG4gICAqL1xuICBhc3luYyBsaXN0Q2FyZFN1bW1hcmllczxUID0gUmVjb3JkPHN0cmluZywgdW5rbm93bj4+KCk6IFByb21pc2U8VFtdPiB7XG4gICAgY29uc3QgdXJsID0gdGhpcy5idWlsZFVybCgnL2NhcmRzL2xpc3QnLCB7XG4gICAgICB3b3Jrc3BhY2VQYXRoOiB0aGlzLm9wdGlvbnMud29ya3NwYWNlUGF0aFxuICAgIH0pO1xuICAgIHJldHVybiB0aGlzLnJlcXVlc3QoKCkgPT4gdGhpcy5nZXRIdHRwQ2xpZW50KCkuZ2V0PFRbXT4odXJsKSk7XG4gIH1cblxuICAvKipcbiAgICogR2V0cyBhIHNpbmdsZSBjYXJkIGJ5IGlkLlxuICAgKlxuICAgKiBAcGFyYW0gY2FyZElkIC0gVGhlIGlkIG9mIHRoZSBjYXJkIHRvIHJldHJpZXZlLlxuICAgKiBAcmV0dXJucyBQcm9taXNlIHJlc29sdmluZyB0byB0aGUgY2FyZC5cbiAgICogQHRocm93cyBBcGlFcnJvciB3aGVuIHRoZSBzZXJ2ZXIgcmVzcG9uZHMgd2l0aCBhbiBlcnJvci5cbiAgICogQHRocm93cyBOZXR3b3JrRXJyb3Igd2hlbiB0aGUgcmVxdWVzdCBmYWlscyB0byByZWFjaCB0aGUgc2VydmVyLlxuICAgKi9cbiAgYXN5bmMgZ2V0Q2FyZChjYXJkSWQ6IHN0cmluZyk6IFByb21pc2U8Q2FyZD4ge1xuICAgIGNvbnN0IHVybCA9IHRoaXMuYnVpbGRVcmwoYC9jYXJkcy8ke2NhcmRJZH1gLCB7XG4gICAgICB3b3Jrc3BhY2VQYXRoOiB0aGlzLm9wdGlvbnMud29ya3NwYWNlUGF0aFxuICAgIH0pO1xuICAgIHJldHVybiB0aGlzLnJlcXVlc3QoKCkgPT4gdGhpcy5nZXRIdHRwQ2xpZW50KCkuZ2V0PENhcmQ+KHVybCkpO1xuICB9XG5cbiAgLyoqXG4gICAqIENyZWF0ZXMgYSBuZXcgY2FyZC5cbiAgICpcbiAgICogQHBhcmFtIGRhdGEgLSBDYXJkIGNyZWF0aW9uIHBheWxvYWQuXG4gICAqIEByZXR1cm5zIFByb21pc2UgcmVzb2x2aW5nIHRvIHRoZSBjcmVhdGVkIGNhcmQuXG4gICAqIEB0aHJvd3MgQXBpRXJyb3Igd2hlbiB0aGUgc2VydmVyIHJlamVjdHMgdGhlIHBheWxvYWQuXG4gICAqIEB0aHJvd3MgTmV0d29ya0Vycm9yIHdoZW4gdGhlIHJlcXVlc3QgZmFpbHMgdG8gcmVhY2ggdGhlIHNlcnZlci5cbiAgICovXG4gIGFzeW5jIGNyZWF0ZUNhcmQoZGF0YTogQ2FyZENyZWF0ZURhdGEpOiBQcm9taXNlPENhcmQ+IHtcbiAgICBjb25zdCB1cmwgPSB0aGlzLmJ1aWxkVXJsKCcvY2FyZHMnKTtcbiAgICBjb25zdCBib2R5ID0ge1xuICAgICAgLi4uZGF0YSxcbiAgICAgIHdvcmtzcGFjZVBhdGg6IHRoaXMub3B0aW9ucy53b3Jrc3BhY2VQYXRoXG4gICAgfTtcbiAgICByZXR1cm4gdGhpcy5yZXF1ZXN0KCgpID0+IHRoaXMuZ2V0SHR0cENsaWVudCgpLnBvc3Q8Q2FyZD4odXJsLCBib2R5KSk7XG4gIH1cblxuICAvKipcbiAgICogVXBkYXRlcyBhbiBleGlzdGluZyBjYXJkLlxuICAgKlxuICAgKiBAcGFyYW0gY2FyZElkIC0gVGhlIGlkIG9mIHRoZSBjYXJkIHRvIHVwZGF0ZS5cbiAgICogQHBhcmFtIGRhdGEgLSBUaGUgZmllbGRzIHRvIHVwZGF0ZS5cbiAgICogQHJldHVybnMgUHJvbWlzZSByZXNvbHZpbmcgdG8gdGhlIHVwZGF0ZWQgY2FyZC5cbiAgICogQHRocm93cyBBcGlFcnJvciB3aGVuIHRoZSBzZXJ2ZXIgcmVqZWN0cyB0aGUgdXBkYXRlLlxuICAgKiBAdGhyb3dzIE5ldHdvcmtFcnJvciB3aGVuIHRoZSByZXF1ZXN0IGZhaWxzIHRvIHJlYWNoIHRoZSBzZXJ2ZXIuXG4gICAqIEBkZXByZWNhdGVkIFVzZSBkaXJlY3QgZ2l0IG9wZXJhdGlvbnMgaW5zdGVhZC4gVGhpcyBlbmRwb2ludCB3aWxsIGJlIHJlbW92ZWQuXG4gICAqL1xuICBhc3luYyB1cGRhdGVDYXJkKGNhcmRJZDogc3RyaW5nLCBkYXRhOiBDYXJkVXBkYXRlRGF0YSk6IFByb21pc2U8Q2FyZD4ge1xuICAgIGNvbnN0IHVybCA9IHRoaXMuYnVpbGRVcmwoYC9jYXJkcy8ke2NhcmRJZH1gKTtcbiAgICByZXR1cm4gdGhpcy5yZXF1ZXN0KCgpID0+IHRoaXMuZ2V0SHR0cENsaWVudCgpLnBhdGNoPENhcmQ+KHVybCwgZGF0YSkpO1xuICB9XG5cbiAgLyoqXG4gICAqIERlbGV0ZXMgYSBjYXJkLlxuICAgKlxuICAgKiBAcGFyYW0gY2FyZElkIC0gVGhlIGlkIG9mIHRoZSBjYXJkIHRvIGRlbGV0ZS5cbiAgICogQHJldHVybnMgUHJvbWlzZSByZXNvbHZpbmcgd2hlbiBkZWxldGlvbiBpcyBjb21wbGV0ZS5cbiAgICogQHRocm93cyBBcGlFcnJvciB3aGVuIHRoZSBzZXJ2ZXIgcmVqZWN0cyB0aGUgZGVsZXRlLlxuICAgKiBAdGhyb3dzIE5ldHdvcmtFcnJvciB3aGVuIHRoZSByZXF1ZXN0IGZhaWxzIHRvIHJlYWNoIHRoZSBzZXJ2ZXIuXG4gICAqIEBkZXByZWNhdGVkIFVzZSBkaXJlY3QgZ2l0IG9wZXJhdGlvbnMgaW5zdGVhZC4gVGhpcyBlbmRwb2ludCB3aWxsIGJlIHJlbW92ZWQuXG4gICAqL1xuICBhc3luYyBkZWxldGVDYXJkKGNhcmRJZDogc3RyaW5nKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc3QgdXJsID0gdGhpcy5idWlsZFVybChgL2NhcmRzLyR7Y2FyZElkfWApO1xuICAgIHJldHVybiB0aGlzLnJlcXVlc3QoKCkgPT4gdGhpcy5nZXRIdHRwQ2xpZW50KCkuZGVsZXRlKHVybCkpO1xuICB9XG5cbiAgLy8gLS0tIENvbW1lbnQgT3BlcmF0aW9ucyAtLS1cblxuICAvKipcbiAgICogR2V0cyBhbGwgY29tbWVudHMgZm9yIGEgY2FyZC5cbiAgICpcbiAgICogQHBhcmFtIGNhcmRJZCAtIElkZW50aWZpZXIgb2YgdGhlIHRhcmdldCBjYXJkIGZvciB0aGlzIHJlcXVlc3QuXG4gICAqIEByZXR1cm5zIFByb21pc2UgcmVzb2x2aW5nIHRvIHRoZSBjb21tZW50IGxpc3QuXG4gICAqIEB0aHJvd3MgQXBpRXJyb3Igd2hlbiB0aGUgc2VydmVyIHJlc3BvbmRzIHdpdGggYW4gZXJyb3IuXG4gICAqIEB0aHJvd3MgTmV0d29ya0Vycm9yIHdoZW4gdGhlIHJlcXVlc3QgZmFpbHMgdG8gcmVhY2ggdGhlIHNlcnZlci5cbiAgICovXG4gIGFzeW5jIGdldENvbW1lbnRzKGNhcmRJZDogc3RyaW5nKTogUHJvbWlzZTxDb21tZW50W10+IHtcbiAgICBjb25zdCB1cmwgPSB0aGlzLmJ1aWxkVXJsKGAvY2FyZHMvJHtjYXJkSWR9L2NvbW1lbnRzYCk7XG4gICAgcmV0dXJuIHRoaXMucmVxdWVzdCgoKSA9PiB0aGlzLmdldEh0dHBDbGllbnQoKS5nZXQ8Q29tbWVudFtdPih1cmwpKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXRzIGEgc2luZ2xlIGNvbW1lbnQgYnkgaWQuXG4gICAqXG4gICAqIEBwYXJhbSBjYXJkSWQgLSBJZGVudGlmaWVyIG9mIHRoZSBjYXJkIHRoYXQgb3ducyB0aGUgcmVxdWVzdGVkIGNvbW1lbnQuXG4gICAqIEBwYXJhbSBjb21tZW50SWQgLSBJZGVudGlmaWVyIG9mIHRoZSBjb21tZW50IHRvIHJldHJpZXZlLlxuICAgKiBAcmV0dXJucyBQcm9taXNlIHJlc29sdmluZyB0byB0aGUgY29tbWVudC5cbiAgICogQHRocm93cyBBcGlFcnJvciB3aGVuIHRoZSBzZXJ2ZXIgcmVzcG9uZHMgd2l0aCBhbiBlcnJvci5cbiAgICogQHRocm93cyBOZXR3b3JrRXJyb3Igd2hlbiB0aGUgcmVxdWVzdCBmYWlscyB0byByZWFjaCB0aGUgc2VydmVyLlxuICAgKi9cbiAgYXN5bmMgZ2V0Q29tbWVudChjYXJkSWQ6IHN0cmluZywgY29tbWVudElkOiBzdHJpbmcpOiBQcm9taXNlPENvbW1lbnQ+IHtcbiAgICBjb25zdCB1cmwgPSB0aGlzLmJ1aWxkVXJsKGAvY2FyZHMvJHtjYXJkSWR9L2NvbW1lbnRzLyR7Y29tbWVudElkfWApO1xuICAgIHJldHVybiB0aGlzLnJlcXVlc3QoKCkgPT4gdGhpcy5nZXRIdHRwQ2xpZW50KCkuZ2V0PENvbW1lbnQ+KHVybCkpO1xuICB9XG5cbiAgLyoqXG4gICAqIENyZWF0ZXMgYSBuZXcgY29tbWVudCBvbiBhIGNhcmQuXG4gICAqXG4gICAqIEBwYXJhbSBjYXJkSWQgLSBJZGVudGlmaWVyIG9mIHRoZSBjYXJkIHRoYXQgd2lsbCByZWNlaXZlIHRoZSBuZXcgY29tbWVudC5cbiAgICogQHBhcmFtIGRhdGEgLSBDb21tZW50IGNyZWF0aW9uIHBheWxvYWQuXG4gICAqIEByZXR1cm5zIFByb21pc2UgcmVzb2x2aW5nIHRvIHRoZSBjcmVhdGVkIGNvbW1lbnQuXG4gICAqIEB0aHJvd3MgQXBpRXJyb3Igd2hlbiB0aGUgc2VydmVyIHJlamVjdHMgdGhlIHBheWxvYWQuXG4gICAqIEB0aHJvd3MgTmV0d29ya0Vycm9yIHdoZW4gdGhlIHJlcXVlc3QgZmFpbHMgdG8gcmVhY2ggdGhlIHNlcnZlci5cbiAgICogQGRlcHJlY2F0ZWQgVXNlIGRpcmVjdCBnaXQgb3BlcmF0aW9ucyBpbnN0ZWFkLiBUaGlzIGVuZHBvaW50IHdpbGwgYmUgcmVtb3ZlZC5cbiAgICovXG4gIGFzeW5jIGNyZWF0ZUNvbW1lbnQoY2FyZElkOiBzdHJpbmcsIGRhdGE6IENvbW1lbnRDcmVhdGVEYXRhKTogUHJvbWlzZTxDb21tZW50PiB7XG4gICAgY29uc3QgdXJsID0gdGhpcy5idWlsZFVybChgL2NhcmRzLyR7Y2FyZElkfS9jb21tZW50c2ApO1xuICAgIHJldHVybiB0aGlzLnJlcXVlc3QoKCkgPT4gdGhpcy5nZXRIdHRwQ2xpZW50KCkucG9zdDxDb21tZW50Pih1cmwsIGRhdGEpKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBVcGRhdGVzIGFuIGV4aXN0aW5nIGNvbW1lbnQuXG4gICAqXG4gICAqIEBwYXJhbSBjYXJkSWQgLSBJZGVudGlmaWVyIG9mIHRoZSBjYXJkIHRoYXQgb3ducyB0aGUgY29tbWVudC5cbiAgICogQHBhcmFtIGNvbW1lbnRJZCAtIElkZW50aWZpZXIgb2YgdGhlIGNvbW1lbnQgdG8gdXBkYXRlLlxuICAgKiBAcGFyYW0gZGF0YSAtIENvbW1lbnQgdXBkYXRlIHBheWxvYWQuXG4gICAqIEByZXR1cm5zIFByb21pc2UgcmVzb2x2aW5nIHRvIHRoZSB1cGRhdGVkIGNvbW1lbnQuXG4gICAqIEB0aHJvd3MgQXBpRXJyb3Igd2hlbiB0aGUgc2VydmVyIHJlamVjdHMgdGhlIHVwZGF0ZS5cbiAgICogQHRocm93cyBOZXR3b3JrRXJyb3Igd2hlbiB0aGUgcmVxdWVzdCBmYWlscyB0byByZWFjaCB0aGUgc2VydmVyLlxuICAgKiBAZGVwcmVjYXRlZCBVc2UgZGlyZWN0IGdpdCBvcGVyYXRpb25zIGluc3RlYWQuIFRoaXMgZW5kcG9pbnQgd2lsbCBiZSByZW1vdmVkLlxuICAgKi9cbiAgYXN5bmMgdXBkYXRlQ29tbWVudChjYXJkSWQ6IHN0cmluZywgY29tbWVudElkOiBzdHJpbmcsIGRhdGE6IENvbW1lbnRVcGRhdGVEYXRhKTogUHJvbWlzZTxDb21tZW50PiB7XG4gICAgY29uc3QgdXJsID0gdGhpcy5idWlsZFVybChgL2NhcmRzLyR7Y2FyZElkfS9jb21tZW50cy8ke2NvbW1lbnRJZH1gKTtcbiAgICByZXR1cm4gdGhpcy5yZXF1ZXN0KCgpID0+IHRoaXMuZ2V0SHR0cENsaWVudCgpLnBhdGNoPENvbW1lbnQ+KHVybCwgZGF0YSkpO1xuICB9XG5cbiAgLyoqXG4gICAqIERlbGV0ZXMgYSBjb21tZW50LlxuICAgKlxuICAgKiBAcGFyYW0gY2FyZElkIC0gSWRlbnRpZmllciBvZiB0aGUgY2FyZCB0aGF0IG93bnMgdGhlIGNvbW1lbnQuXG4gICAqIEBwYXJhbSBjb21tZW50SWQgLSBJZGVudGlmaWVyIG9mIHRoZSBjb21tZW50IHRvIHJlbW92ZS5cbiAgICogQHJldHVybnMgUHJvbWlzZSByZXNvbHZpbmcgd2hlbiBkZWxldGlvbiBpcyBjb21wbGV0ZS5cbiAgICogQHRocm93cyBBcGlFcnJvciB3aGVuIHRoZSBzZXJ2ZXIgcmVqZWN0cyB0aGUgZGVsZXRlLlxuICAgKiBAdGhyb3dzIE5ldHdvcmtFcnJvciB3aGVuIHRoZSByZXF1ZXN0IGZhaWxzIHRvIHJlYWNoIHRoZSBzZXJ2ZXIuXG4gICAqIEBkZXByZWNhdGVkIFVzZSBkaXJlY3QgZ2l0IG9wZXJhdGlvbnMgaW5zdGVhZC4gVGhpcyBlbmRwb2ludCB3aWxsIGJlIHJlbW92ZWQuXG4gICAqL1xuICBhc3luYyBkZWxldGVDb21tZW50KGNhcmRJZDogc3RyaW5nLCBjb21tZW50SWQ6IHN0cmluZyk6IFByb21pc2U8dm9pZD4ge1xuICAgIGNvbnN0IHVybCA9IHRoaXMuYnVpbGRVcmwoYC9jYXJkcy8ke2NhcmRJZH0vY29tbWVudHMvJHtjb21tZW50SWR9YCk7XG4gICAgcmV0dXJuIHRoaXMucmVxdWVzdCgoKSA9PiB0aGlzLmdldEh0dHBDbGllbnQoKS5kZWxldGUodXJsKSk7XG4gIH1cblxuICAvLyAtLS0gQXR0YWNobWVudCBPcGVyYXRpb25zIC0tLVxuXG4gIC8qKlxuICAgKiBVcGxvYWRzIGFuIGF0dGFjaG1lbnQgdG8gYSBjYXJkIHVzaW5nIGJpbmFyeSBQVVQuXG4gICAqXG4gICAqIFRoaXMgaXMgdGhlIHByZWZlcnJlZCBtZXRob2QgLSBzZW5kcyByYXcgYmluYXJ5IGRhdGEgZGlyZWN0bHkgd2l0aG91dFxuICAgKiBiYXNlNjQgZW5jb2RpbmcsIHJlc3VsdGluZyBpbiAzMyUgc21hbGxlciBwYXlsb2Fkcy5cbiAgICpcbiAgICogQHBhcmFtIGNhcmRJZCAtIElkZW50aWZpZXIgb2YgdGhlIGNhcmQgdGhhdCB3aWxsIHJlY2VpdmUgdGhlIGF0dGFjaG1lbnQuXG4gICAqIEBwYXJhbSBuYW1lIC0gRmlsZSBuYW1lIGluY2x1ZGluZyBleHRlbnNpb24uXG4gICAqIEBwYXJhbSBkYXRhIC0gQmluYXJ5IGRhdGEgYXMgQmxvYiwgQXJyYXlCdWZmZXIsIG9yIGJhc2U2NCBzdHJpbmcuXG4gICAqIEByZXR1cm5zIFByb21pc2UgcmVzb2x2aW5nIHRvIGF0dGFjaG1lbnQgbWV0YWRhdGEuXG4gICAqIEB0aHJvd3MgQXBpRXJyb3Igd2hlbiB0aGUgc2VydmVyIHJlamVjdHMgdGhlIHVwbG9hZC5cbiAgICogQHRocm93cyBOZXR3b3JrRXJyb3Igd2hlbiB0aGUgcmVxdWVzdCBmYWlscyB0byByZWFjaCB0aGUgc2VydmVyLlxuICAgKi9cbiAgYXN5bmMgdXBsb2FkQXR0YWNobWVudChjYXJkSWQ6IHN0cmluZywgbmFtZTogc3RyaW5nLCBkYXRhOiBCbG9iIHwgQXJyYXlCdWZmZXIgfCBzdHJpbmcpOiBQcm9taXNlPEF0dGFjaG1lbnRSZXNwb25zZT4ge1xuICAgIGNvbnN0IHVybCA9IHRoaXMuYnVpbGRVcmwoYC9jYXJkcy8ke2NhcmRJZH0vYXR0YWNobWVudHMvJHtlbmNvZGVVUklDb21wb25lbnQobmFtZSl9YCk7XG5cbiAgICAvLyBDb252ZXJ0IGRhdGEgdG8gQmxvYiBmb3IgZmV0Y2ggYm9keVxuICAgIGxldCBib2R5OiBCbG9iO1xuICAgIGlmIChkYXRhIGluc3RhbmNlb2YgQmxvYikge1xuICAgICAgYm9keSA9IGRhdGE7XG4gICAgfSBlbHNlIGlmIChkYXRhIGluc3RhbmNlb2YgQXJyYXlCdWZmZXIpIHtcbiAgICAgIGJvZHkgPSBuZXcgQmxvYihbZGF0YV0pO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBiYXNlNjQgc3RyaW5nIC0gZGVjb2RlIHRvIGJpbmFyeVxuICAgICAgY29uc3QgYmluYXJ5U3RyaW5nID0gYXRvYihkYXRhKTtcbiAgICAgIGNvbnN0IGJ5dGVzID0gbmV3IFVpbnQ4QXJyYXkoYmluYXJ5U3RyaW5nLmxlbmd0aCk7XG4gICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGJpbmFyeVN0cmluZy5sZW5ndGg7IGkrKykge1xuICAgICAgICBieXRlc1tpXSA9IGJpbmFyeVN0cmluZy5jaGFyQ29kZUF0KGkpO1xuICAgICAgfVxuICAgICAgYm9keSA9IG5ldyBCbG9iKFtieXRlc10pO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzLnJlcXVlc3QoYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBmZXRjaCh1cmwsIHtcbiAgICAgICAgbWV0aG9kOiAnUFVUJyxcbiAgICAgICAgaGVhZGVyczoge1xuICAgICAgICAgIC4uLnRoaXMuZ2V0SGVhZGVycygpLFxuICAgICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vb2N0ZXQtc3RyZWFtJ1xuICAgICAgICB9LFxuICAgICAgICBib2R5LFxuICAgICAgICBzaWduYWw6IHRoaXMuZ2V0VGltZW91dFNpZ25hbCgpXG4gICAgICB9KTtcbiAgICAgIGlmICghcmVzcG9uc2Uub2spIHRocm93IHJlc3BvbnNlO1xuICAgICAgcmV0dXJuIHJlc3BvbnNlLmpzb24oKSBhcyBQcm9taXNlPEF0dGFjaG1lbnRSZXNwb25zZT47XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogRG93bmxvYWRzIGFuIGF0dGFjaG1lbnQgYXMgYSBCbG9iLlxuICAgKlxuICAgKiBUaGlzIG1ldGhvZCB1c2VzIGBmZXRjaGAgZGlyZWN0bHkgc28gYmluYXJ5IGRhdGEgaXMgcHJlc2VydmVkLlxuICAgKlxuICAgKiBAcGFyYW0gY2FyZElkIC0gSWRlbnRpZmllciBvZiB0aGUgY2FyZCB0aGF0IG93bnMgdGhlIGF0dGFjaG1lbnQuXG4gICAqIEBwYXJhbSBhdHRhY2htZW50SWQgLSBJZGVudGlmaWVyIG9mIHRoZSBhdHRhY2htZW50IGJsb2IgdG8gZG93bmxvYWQuXG4gICAqIEByZXR1cm5zIFByb21pc2UgcmVzb2x2aW5nIHRvIGFuIGF0dGFjaG1lbnQgQmxvYi5cbiAgICogQHRocm93cyBBcGlFcnJvciB3aGVuIHRoZSBzZXJ2ZXIgcmVzcG9uZHMgd2l0aCBhbiBlcnJvci5cbiAgICogQHRocm93cyBOZXR3b3JrRXJyb3Igd2hlbiB0aGUgcmVxdWVzdCBmYWlscyB0byByZWFjaCB0aGUgc2VydmVyLlxuICAgKi9cbiAgYXN5bmMgZ2V0QXR0YWNobWVudChjYXJkSWQ6IHN0cmluZywgYXR0YWNobWVudElkOiBzdHJpbmcpOiBQcm9taXNlPEJsb2I+IHtcbiAgICBjb25zdCB1cmwgPSB0aGlzLmJ1aWxkVXJsKGAvY2FyZHMvJHtjYXJkSWR9L2F0dGFjaG1lbnRzLyR7YXR0YWNobWVudElkfWApO1xuICAgIHJldHVybiB0aGlzLnJlcXVlc3QoYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBmZXRjaCh1cmwsIHtcbiAgICAgICAgaGVhZGVyczogdGhpcy5nZXRIZWFkZXJzKCksXG4gICAgICAgIHNpZ25hbDogdGhpcy5nZXRUaW1lb3V0U2lnbmFsKClcbiAgICAgIH0pO1xuICAgICAgaWYgKCFyZXNwb25zZS5vaykgdGhyb3cgcmVzcG9uc2U7XG4gICAgICByZXR1cm4gcmVzcG9uc2UuYmxvYigpO1xuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIExpc3RzIGF0dGFjaG1lbnRzIGZvciBhIGNhcmQuXG4gICAqXG4gICAqIEBwYXJhbSBjYXJkSWQgLSBJZGVudGlmaWVyIG9mIHRoZSBjYXJkIHdob3NlIGF0dGFjaG1lbnRzIHNob3VsZCBiZSBsaXN0ZWQuXG4gICAqIEByZXR1cm5zIFByb21pc2UgcmVzb2x2aW5nIHRvIGF0dGFjaG1lbnQgbWV0YWRhdGEuXG4gICAqIEB0aHJvd3MgQXBpRXJyb3Igd2hlbiB0aGUgc2VydmVyIHJlc3BvbmRzIHdpdGggYW4gZXJyb3IuXG4gICAqIEB0aHJvd3MgTmV0d29ya0Vycm9yIHdoZW4gdGhlIHJlcXVlc3QgZmFpbHMgdG8gcmVhY2ggdGhlIHNlcnZlci5cbiAgICovXG4gIGFzeW5jIGxpc3RBdHRhY2htZW50cyhjYXJkSWQ6IHN0cmluZyk6IFByb21pc2U8QXR0YWNobWVudFJlc3BvbnNlW10+IHtcbiAgICBjb25zdCB1cmwgPSB0aGlzLmJ1aWxkVXJsKGAvY2FyZHMvJHtjYXJkSWR9L2F0dGFjaG1lbnRzYCk7XG4gICAgcmV0dXJuIHRoaXMucmVxdWVzdCgoKSA9PiB0aGlzLmdldEh0dHBDbGllbnQoKS5nZXQ8QXR0YWNobWVudFJlc3BvbnNlW10+KHVybCkpO1xuICB9XG5cbiAgLy8gLS0tIFRpbWVsaW5lIE9wZXJhdGlvbnMgLS0tXG5cbiAgLyoqXG4gICAqIEdldHMgdGltZWxpbmUgZW50cmllcyBmb3IgYSBjYXJkIHdpdGggb3B0aW9uYWwgcGFnaW5hdGlvbi5cbiAgICpcbiAgICogQHBhcmFtIGNhcmRJZCAtIElkZW50aWZpZXIgb2YgdGhlIGNhcmQgd2hvc2UgdGltZWxpbmUgZW50cmllcyBzaG91bGQgYmUgcmV0dXJuZWQuXG4gICAqIEBwYXJhbSBvcHRpb25zIC0gT3B0aW9uYWwgcGFnaW5hdGlvbiBjb250cm9scy5cbiAgICogQHJldHVybnMgUHJvbWlzZSByZXNvbHZpbmcgdG8gdGltZWxpbmUgZW50cmllcy5cbiAgICogQHRocm93cyBBcGlFcnJvciB3aGVuIHRoZSBzZXJ2ZXIgcmVzcG9uZHMgd2l0aCBhbiBlcnJvci5cbiAgICogQHRocm93cyBOZXR3b3JrRXJyb3Igd2hlbiB0aGUgcmVxdWVzdCBmYWlscyB0byByZWFjaCB0aGUgc2VydmVyLlxuICAgKi9cbiAgYXN5bmMgZ2V0VGltZWxpbmUoY2FyZElkOiBzdHJpbmcsIG9wdGlvbnM/OiBUaW1lbGluZU9wdGlvbnMpOiBQcm9taXNlPFRpbWVsaW5lSXRlbVtdPiB7XG4gICAgY29uc3QgdXJsID0gdGhpcy5idWlsZFVybChgL2NhcmRzLyR7Y2FyZElkfS90aW1lbGluZWAsIHtcbiAgICAgIGJlZm9yZTogb3B0aW9ucz8uYmVmb3JlLFxuICAgICAgbGltaXQ6IG9wdGlvbnM/LmxpbWl0XG4gICAgfSk7XG4gICAgcmV0dXJuIHRoaXMucmVxdWVzdCgoKSA9PiB0aGlzLmdldEh0dHBDbGllbnQoKS5nZXQ8VGltZWxpbmVJdGVtW10+KHVybCkpO1xuICB9XG5cbiAgLy8gLS0tIFBsYW4gT3BlcmF0aW9ucyAtLS1cblxuICAvKipcbiAgICogR2V0cyB0aGUgcGxhbiBkb2N1bWVudCBmb3IgYSBjYXJkIGFzIG1hcmtkb3duLlxuICAgKlxuICAgKiBAcGFyYW0gY2FyZElkIC0gSWRlbnRpZmllciBvZiB0aGUgY2FyZCB3aG9zZSBwbGFuIG1hcmtkb3duIHNob3VsZCBiZSByZXR1cm5lZC5cbiAgICogQHJldHVybnMgUHJvbWlzZSByZXNvbHZpbmcgdG8gcGxhbiBtYXJrZG93bi5cbiAgICogQHRocm93cyBBcGlFcnJvciB3aGVuIHRoZSBzZXJ2ZXIgcmVzcG9uZHMgd2l0aCBhbiBlcnJvci5cbiAgICogQHRocm93cyBOZXR3b3JrRXJyb3Igd2hlbiB0aGUgcmVxdWVzdCBmYWlscyB0byByZWFjaCB0aGUgc2VydmVyLlxuICAgKi9cbiAgYXN5bmMgZ2V0UGxhbihjYXJkSWQ6IHN0cmluZyk6IFByb21pc2U8c3RyaW5nPiB7XG4gICAgY29uc3QgdXJsID0gdGhpcy5idWlsZFVybChgL2NhcmRzLyR7Y2FyZElkfS9wbGFuYCk7XG4gICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCB0aGlzLnJlcXVlc3QoKCkgPT4gdGhpcy5nZXRIdHRwQ2xpZW50KCkuZ2V0PHsgY29udGVudDogc3RyaW5nIH0+KHVybCkpO1xuICAgIHJldHVybiByZXNwb25zZS5jb250ZW50O1xuICB9XG5cbiAgLyoqXG4gICAqIFVwZGF0ZXMgdGhlIHBsYW4gZG9jdW1lbnQgZm9yIGEgY2FyZC5cbiAgICpcbiAgICogQHBhcmFtIGNhcmRJZCAtIElkZW50aWZpZXIgb2YgdGhlIGNhcmQgd2hvc2UgcGxhbiBtYXJrZG93biBzaG91bGQgYmUgdXBkYXRlZC5cbiAgICogQHBhcmFtIGNvbnRlbnQgLSBQbGFuIG1hcmtkb3duIGNvbnRlbnQuXG4gICAqIEByZXR1cm5zIFByb21pc2UgcmVzb2x2aW5nIHdoZW4gdGhlIHBsYW4gaXMgc2F2ZWQuXG4gICAqIEB0aHJvd3MgQXBpRXJyb3Igd2hlbiB0aGUgc2VydmVyIHJlamVjdHMgdGhlIHVwZGF0ZS5cbiAgICogQHRocm93cyBOZXR3b3JrRXJyb3Igd2hlbiB0aGUgcmVxdWVzdCBmYWlscyB0byByZWFjaCB0aGUgc2VydmVyLlxuICAgKiBAZGVwcmVjYXRlZCBVc2UgZGlyZWN0IGdpdCBvcGVyYXRpb25zIGluc3RlYWQuIFRoaXMgZW5kcG9pbnQgd2lsbCBiZSByZW1vdmVkLlxuICAgKi9cbiAgYXN5bmMgdXBkYXRlUGxhbihjYXJkSWQ6IHN0cmluZywgY29udGVudDogc3RyaW5nKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc3QgdXJsID0gdGhpcy5idWlsZFVybChgL2NhcmRzLyR7Y2FyZElkfS9wbGFuYCk7XG4gICAgcmV0dXJuIHRoaXMucmVxdWVzdCgoKSA9PiB0aGlzLmdldEh0dHBDbGllbnQoKS5wdXQ8dm9pZD4odXJsLCBjb250ZW50KSk7XG4gIH1cblxuICAvLyAtLS0gR2F0ZSBPcGVyYXRpb25zIC0tLVxuXG4gIC8qKlxuICAgKiBBcHByb3ZlcyBhIGdhdGUgZm9yIGEgY2FyZC5cbiAgICpcbiAgICogQHBhcmFtIGNhcmRJZCAtIElkZW50aWZpZXIgb2YgdGhlIGNhcmQgd2hvc2UgZ2F0ZSBzdGF0ZSBzaG91bGQgYmUgdXBkYXRlZC5cbiAgICogQHBhcmFtIGdhdGVOYW1lIC0gR2F0ZSBuYW1lIHRvIGFwcHJvdmUuXG4gICAqIEByZXR1cm5zIFByb21pc2UgcmVzb2x2aW5nIHRvIGdhdGUgYXBwcm92YWwgbWV0YWRhdGEuXG4gICAqIEB0aHJvd3MgQXBpRXJyb3Igd2hlbiB0aGUgc2VydmVyIHJlamVjdHMgdGhlIGFwcHJvdmFsLlxuICAgKiBAdGhyb3dzIE5ldHdvcmtFcnJvciB3aGVuIHRoZSByZXF1ZXN0IGZhaWxzIHRvIHJlYWNoIHRoZSBzZXJ2ZXIuXG4gICAqIEBkZXByZWNhdGVkIFVzZSBkaXJlY3QgZ2l0IG9wZXJhdGlvbnMgaW5zdGVhZC4gVGhpcyBlbmRwb2ludCB3aWxsIGJlIHJlbW92ZWQuXG4gICAqL1xuICBhc3luYyBhcHByb3ZlR2F0ZShjYXJkSWQ6IHN0cmluZywgZ2F0ZU5hbWU6ICdwbGFuJyB8ICdyZXZpZXcnKTogUHJvbWlzZTxHYXRlQXBwcm92YWxSZXNwb25zZT4ge1xuICAgIGNvbnN0IHVybCA9IHRoaXMuYnVpbGRVcmwoYC9jYXJkcy8ke2NhcmRJZH0vZ2F0ZXMvJHtnYXRlTmFtZX0vYXBwcm92ZWApO1xuICAgIHJldHVybiB0aGlzLnJlcXVlc3QoKCkgPT4gdGhpcy5nZXRIdHRwQ2xpZW50KCkucG9zdDxHYXRlQXBwcm92YWxSZXNwb25zZT4odXJsLCB1bmRlZmluZWQpKTtcbiAgfVxuXG4gIC8vIC0tLSBDb21taXQgT3BlcmF0aW9ucyAtLS1cblxuICAvKipcbiAgICogR2V0cyBhbGwgY29tbWl0cyBhc3NvY2lhdGVkIHdpdGggYSBjYXJkLlxuICAgKlxuICAgKiBAcGFyYW0gY2FyZElkIC0gSWRlbnRpZmllciBvZiB0aGUgY2FyZCB3aG9zZSBjb21taXRzIHNob3VsZCBiZSByZXR1cm5lZC5cbiAgICogQHJldHVybnMgUHJvbWlzZSByZXNvbHZpbmcgdG8gY29tbWl0IG1ldGFkYXRhLlxuICAgKiBAdGhyb3dzIEFwaUVycm9yIHdoZW4gdGhlIHNlcnZlciByZXNwb25kcyB3aXRoIGFuIGVycm9yLlxuICAgKiBAdGhyb3dzIE5ldHdvcmtFcnJvciB3aGVuIHRoZSByZXF1ZXN0IGZhaWxzIHRvIHJlYWNoIHRoZSBzZXJ2ZXIuXG4gICAqL1xuICBhc3luYyBnZXRDb21taXRzKGNhcmRJZDogc3RyaW5nKTogUHJvbWlzZTxDb21taXRJbmZvW10+IHtcbiAgICBjb25zdCB1cmwgPSB0aGlzLmJ1aWxkVXJsKGAvY2FyZHMvJHtjYXJkSWR9L2NvbW1pdHNgKTtcbiAgICByZXR1cm4gdGhpcy5yZXF1ZXN0KCgpID0+IHRoaXMuZ2V0SHR0cENsaWVudCgpLmdldDxDb21taXRJbmZvW10+KHVybCkpO1xuICB9XG5cbiAgLyoqXG4gICAqIEFkZHMgYSBjb21taXQgdG8gYSBjYXJkLlxuICAgKlxuICAgKiBAcGFyYW0gY2FyZElkIC0gSWRlbnRpZmllciBvZiB0aGUgY2FyZCB0byBhc3NvY2lhdGUgd2l0aCB0aGUgY29tbWl0IFNIQS5cbiAgICogQHBhcmFtIHNoYSAtIEdpdCBjb21taXQgc2hhLlxuICAgKiBAcmV0dXJucyBQcm9taXNlIHJlc29sdmluZyB0byBjb21taXQgbWV0YWRhdGEuXG4gICAqIEB0aHJvd3MgQXBpRXJyb3Igd2hlbiB0aGUgc2VydmVyIHJlamVjdHMgdGhlIHVwZGF0ZS5cbiAgICogQHRocm93cyBOZXR3b3JrRXJyb3Igd2hlbiB0aGUgcmVxdWVzdCBmYWlscyB0byByZWFjaCB0aGUgc2VydmVyLlxuICAgKi9cbiAgYXN5bmMgYWRkQ29tbWl0KGNhcmRJZDogc3RyaW5nLCBzaGE6IHN0cmluZyk6IFByb21pc2U8Q29tbWl0SW5mbz4ge1xuICAgIGNvbnN0IHVybCA9IHRoaXMuYnVpbGRVcmwoYC9jYXJkcy8ke2NhcmRJZH0vY29tbWl0c2ApO1xuICAgIHJldHVybiB0aGlzLnJlcXVlc3QoKCkgPT4gdGhpcy5nZXRIdHRwQ2xpZW50KCkucG9zdDxDb21taXRJbmZvPih1cmwsIHsgc2hhIH0pKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZW1vdmVzIGEgY29tbWl0IGZyb20gYSBjYXJkLlxuICAgKlxuICAgKiBAcGFyYW0gY2FyZElkIC0gSWRlbnRpZmllciBvZiB0aGUgY2FyZCB0byBkZXRhY2ggZnJvbSB0aGUgY29tbWl0IFNIQS5cbiAgICogQHBhcmFtIHNoYSAtIEdpdCBjb21taXQgc2hhLlxuICAgKiBAcmV0dXJucyBQcm9taXNlIHJlc29sdmluZyB3aGVuIHJlbW92YWwgaXMgY29tcGxldGUuXG4gICAqIEB0aHJvd3MgQXBpRXJyb3Igd2hlbiB0aGUgc2VydmVyIHJlamVjdHMgdGhlIHVwZGF0ZS5cbiAgICogQHRocm93cyBOZXR3b3JrRXJyb3Igd2hlbiB0aGUgcmVxdWVzdCBmYWlscyB0byByZWFjaCB0aGUgc2VydmVyLlxuICAgKi9cbiAgYXN5bmMgcmVtb3ZlQ29tbWl0KGNhcmRJZDogc3RyaW5nLCBzaGE6IHN0cmluZyk6IFByb21pc2U8dm9pZD4ge1xuICAgIGNvbnN0IHVybCA9IHRoaXMuYnVpbGRVcmwoYC9jYXJkcy8ke2NhcmRJZH0vY29tbWl0cy8ke3NoYX1gKTtcbiAgICByZXR1cm4gdGhpcy5yZXF1ZXN0KCgpID0+IHRoaXMuZ2V0SHR0cENsaWVudCgpLmRlbGV0ZSh1cmwpKTtcbiAgfVxuXG4gIC8vIC0tLSBCcmFuY2ggT3BlcmF0aW9ucyAtLS1cblxuICAvKipcbiAgICogR2V0cyBhbGwgYnJhbmNoZXMgdHJhY2tlZCBvbiBhIGNhcmQuXG4gICAqXG4gICAqIEBwYXJhbSBjYXJkSWQgLSBVbmlxdWUgaWRlbnRpZmllciBvZiB0aGUgY2FyZCB3aG9zZSBicmFuY2hlcyB0byByZXRyaWV2ZS5cbiAgICogQHBhcmFtIG9wdGlvbnMgLSBPcHRpb25hbCBxdWVyeSBwYXJhbWV0ZXJzLlxuICAgKiBAcGFyYW0gb3B0aW9ucy53b3Jrc3BhY2VQYXRoIC0gV29ya3NwYWNlIHBhdGggZm9yIGNvbXB1dGluZyBpc01lcmdlZCBhbmQgY29tbWl0IGNvbnRhaW5tZW50LlxuICAgKiBAcmV0dXJucyBQcm9taXNlIHJlc29sdmluZyB0byBicmFuY2hlcyByZXNwb25zZS5cbiAgICovXG4gIGFzeW5jIGdldEJyYW5jaGVzKGNhcmRJZDogc3RyaW5nLCBvcHRpb25zPzogeyB3b3Jrc3BhY2VQYXRoPzogc3RyaW5nIH0pOiBQcm9taXNlPEJyYW5jaGVzUmVzcG9uc2U+IHtcbiAgICBjb25zdCB1cmwgPSB0aGlzLmJ1aWxkVXJsKGAvY2FyZHMvJHtjYXJkSWR9L2JyYW5jaGVzYCwge1xuICAgICAgd29ya3NwYWNlUGF0aDogb3B0aW9ucz8ud29ya3NwYWNlUGF0aFxuICAgIH0pO1xuICAgIHJldHVybiB0aGlzLnJlcXVlc3QoKCkgPT4gdGhpcy5nZXRIdHRwQ2xpZW50KCkuZ2V0PEJyYW5jaGVzUmVzcG9uc2U+KHVybCkpO1xuICB9XG5cbiAgLyoqXG4gICAqIEFkZHMgYSBicmFuY2ggdG8gYSBjYXJkLlxuICAgKlxuICAgKiBAcGFyYW0gY2FyZElkIC0gVW5pcXVlIGlkZW50aWZpZXIgb2YgdGhlIGNhcmQgdG8gYWRkIHRoZSBicmFuY2ggdG8uXG4gICAqIEBwYXJhbSBkYXRhIC0gQnJhbmNoIGRhdGEgaW5jbHVkaW5nIG5hbWUgYW5kIG9wdGlvbmFsIHdvcmt0cmVlIHBhdGguXG4gICAqIEByZXR1cm5zIFByb21pc2UgcmVzb2x2aW5nIHdoZW4gdGhlIGJyYW5jaCBpcyBhZGRlZC5cbiAgICovXG4gIGFzeW5jIGFkZEJyYW5jaChjYXJkSWQ6IHN0cmluZywgZGF0YTogQWRkQnJhbmNoUmVxdWVzdCk6IFByb21pc2U8dm9pZD4ge1xuICAgIGNvbnN0IHVybCA9IHRoaXMuYnVpbGRVcmwoYC9jYXJkcy8ke2NhcmRJZH0vYnJhbmNoZXNgKTtcbiAgICBhd2FpdCB0aGlzLnJlcXVlc3QoKCkgPT4gdGhpcy5nZXRIdHRwQ2xpZW50KCkucG9zdDx1bmtub3duPih1cmwsIGRhdGEpKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZW1vdmVzIGEgYnJhbmNoIGZyb20gYSBjYXJkLlxuICAgKlxuICAgKiBAcGFyYW0gY2FyZElkIC0gVW5pcXVlIGlkZW50aWZpZXIgb2YgdGhlIGNhcmQgdG8gcmVtb3ZlIHRoZSBicmFuY2ggZnJvbS5cbiAgICogQHBhcmFtIG5hbWUgLSBCcmFuY2ggbmFtZSB0byByZW1vdmUgKHdpbGwgYmUgVVJMLWVuY29kZWQpLlxuICAgKiBAcmV0dXJucyBQcm9taXNlIHJlc29sdmluZyB3aGVuIHRoZSBicmFuY2ggaXMgcmVtb3ZlZC5cbiAgICovXG4gIGFzeW5jIHJlbW92ZUJyYW5jaChjYXJkSWQ6IHN0cmluZywgbmFtZTogc3RyaW5nKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc3QgdXJsID0gdGhpcy5idWlsZFVybChgL2NhcmRzLyR7Y2FyZElkfS9icmFuY2hlcy8ke2VuY29kZVVSSUNvbXBvbmVudChuYW1lKX1gKTtcbiAgICByZXR1cm4gdGhpcy5yZXF1ZXN0KCgpID0+IHRoaXMuZ2V0SHR0cENsaWVudCgpLmRlbGV0ZSh1cmwpKTtcbiAgfVxuXG4gIC8vIC0tLSBUYWcgT3BlcmF0aW9ucyAtLS1cblxuICAvKipcbiAgICogR2V0cyBhbGwgYXZhaWxhYmxlIHRhZ3MuXG4gICAqXG4gICAqIEByZXR1cm5zIFByb21pc2UgcmVzb2x2aW5nIHRvIHRhZyBzdHJpbmdzLlxuICAgKiBAdGhyb3dzIEFwaUVycm9yIHdoZW4gdGhlIHNlcnZlciByZXNwb25kcyB3aXRoIGFuIGVycm9yLlxuICAgKiBAdGhyb3dzIE5ldHdvcmtFcnJvciB3aGVuIHRoZSByZXF1ZXN0IGZhaWxzIHRvIHJlYWNoIHRoZSBzZXJ2ZXIuXG4gICAqL1xuICBhc3luYyBnZXRUYWdzKCk6IFByb21pc2U8c3RyaW5nW10+IHtcbiAgICBjb25zdCB1cmwgPSB0aGlzLmJ1aWxkVXJsKCcvdGFncycsIHtcbiAgICAgIHdvcmtzcGFjZVBhdGg6IHRoaXMub3B0aW9ucy53b3Jrc3BhY2VQYXRoXG4gICAgfSk7XG4gICAgcmV0dXJuIHRoaXMucmVxdWVzdCgoKSA9PiB0aGlzLmdldEh0dHBDbGllbnQoKS5nZXQ8c3RyaW5nW10+KHVybCkpO1xuICB9XG5cbiAgLy8gLS0tIEVudmlyb25tZW50IE9wZXJhdGlvbnMgLS0tXG5cbiAgLyoqXG4gICAqIEZldGNoZXMgYXZhaWxhYmxlIGFnZW50IGVudmlyb25tZW50cy5cbiAgICpcbiAgICogQHJldHVybnMgUHJvbWlzZSByZXNvbHZpbmcgdG8gZW52aXJvbm1lbnQgbWV0YWRhdGEuXG4gICAqIEB0aHJvd3MgQXBpRXJyb3Igd2hlbiB0aGUgc2VydmVyIHJlc3BvbmRzIHdpdGggYW4gZXJyb3IuXG4gICAqIEB0aHJvd3MgTmV0d29ya0Vycm9yIHdoZW4gdGhlIHJlcXVlc3QgZmFpbHMgdG8gcmVhY2ggdGhlIHNlcnZlci5cbiAgICovXG4gIGFzeW5jIGdldEVudmlyb25tZW50cygpOiBQcm9taXNlPEFycmF5PHsgbmFtZTogc3RyaW5nOyBkZXNjcmlwdGlvbj86IHN0cmluZyB9Pj4ge1xuICAgIGNvbnN0IHVybCA9IHRoaXMuYnVpbGRVcmwoJy9lbnZpcm9ubWVudHMnKTtcbiAgICByZXR1cm4gdGhpcy5yZXF1ZXN0KCgpID0+IHRoaXMuZ2V0SHR0cENsaWVudCgpLmdldDxBcnJheTx7IG5hbWU6IHN0cmluZzsgZGVzY3JpcHRpb24/OiBzdHJpbmcgfT4+KHVybCkpO1xuICB9XG5cbiAgLy8gLS0tIFR5cGVkIEZpbGUgT3BlcmF0aW9ucyAtLS1cblxuICAvKipcbiAgICogU3VibWl0cyBhbiBhZGFwdGl2ZSBjYXJkIGFjdGlvbiBieSB3cml0aW5nIGFuIGBhZGFwdGl2ZS1jYXJkLXN1Ym1pc3Npb25gIHR5cGVkIGZpbGUuXG4gICAqXG4gICAqIEBwYXJhbSBjYXJkSWQgLSBUaGUgY2FyZCBjb250YWluaW5nIHRoZSBhZGFwdGl2ZSBjYXJkLlxuICAgKiBAcGFyYW0gYWN0aW9uSWQgLSBUaGUgYWN0aW9uIElEIGZyb20gdGhlIGFkYXB0aXZlIGNhcmQgc3VibWl0IGFjdGlvbi5cbiAgICogQHBhcmFtIGRhdGEgLSBUaGUgZm9ybSBkYXRhIGNvbGxlY3RlZCBieSB0aGUgYWRhcHRpdmUgY2FyZC5cbiAgICogQHJldHVybnMgUHJvbWlzZSByZXNvbHZpbmcgd2hlbiB0aGUgc3VibWlzc2lvbiBpcyBwZXJzaXN0ZWQuXG4gICAqIEB0aHJvd3MgQXBpRXJyb3Igd2hlbiB0aGUgc2VydmVyIHJlamVjdHMgdGhlIHN1Ym1pc3Npb24gKGUuZy4gdmFsaWRhdGlvbiBmYWlsdXJlKS5cbiAgICogQHRocm93cyBOZXR3b3JrRXJyb3Igd2hlbiB0aGUgcmVxdWVzdCBmYWlscyB0byByZWFjaCB0aGUgc2VydmVyLlxuICAgKi9cbiAgYXN5bmMgc3VibWl0Q2FyZEFjdGlvbihjYXJkSWQ6IHN0cmluZywgYWN0aW9uSWQ6IHN0cmluZywgZGF0YTogUmVjb3JkPHN0cmluZywgdW5rbm93bj4pOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zdCBmaWxlTmFtZSA9IGAke2FjdGlvbklkfS0ke0RhdGUubm93KCl9Lmpzb25gO1xuICAgIGNvbnN0IHVybCA9IHRoaXMuYnVpbGRVcmwoYC9jYXJkcy8ke2NhcmRJZH0vYWRhcHRpdmUtY2FyZC1zdWJtaXNzaW9uLyR7ZW5jb2RlVVJJQ29tcG9uZW50KGZpbGVOYW1lKX1gKTtcbiAgICBjb25zdCBib2R5ID0geyBjYXJkSWQsIGFjdGlvbklkLCBkYXRhIH07XG4gICAgYXdhaXQgdGhpcy5yZXF1ZXN0KCgpID0+IHRoaXMuZ2V0SHR0cENsaWVudCgpLnB1dDx1bmtub3duPih1cmwsIGJvZHkpKTtcbiAgfVxuXG4gIC8vIC0tLSBUeXBlIFNjaGVtYSBPcGVyYXRpb25zIC0tLVxuXG4gIC8qKlxuICAgKiBHZXRzIHR5cGUgc2NoZW1hcyBhbmQgZGVzY3JpcHRpb25zIGZvciBhIGNhcmQncyBlbnZpcm9ubWVudC5cbiAgICpcbiAgICogUmV0dXJucyBtZXRhZGF0YSBhYm91dCBlYWNoIHJlZ2lzdGVyZWQgdHlwZSBpbiB0aGUgY2FyZCdzIGVudmlyb25tZW50LFxuICAgKiBpbmNsdWRpbmcgdmVyc2lvbiwgc2NoZW1hLCBhbmQgZGVzY3JpcHRpb24uIENvbW1hbmQgZGV0YWlscyBhcmUgZXhjbHVkZWQuXG4gICAqXG4gICAqIEBwYXJhbSBjYXJkSWQgLSBJZGVudGlmaWVyIG9mIHRoZSBjYXJkIHdob3NlIHR5cGUgc2NoZW1hIG1ldGFkYXRhIHNob3VsZCBiZSBmZXRjaGVkLlxuICAgKiBAcmV0dXJucyBQcm9taXNlIHJlc29sdmluZyB0byB0eXBlIHNjaGVtYSBpbmZvcm1hdGlvbi5cbiAgICogQHRocm93cyBBcGlFcnJvciB3aGVuIHRoZSBzZXJ2ZXIgcmVzcG9uZHMgd2l0aCBhbiBlcnJvci5cbiAgICogQHRocm93cyBOZXR3b3JrRXJyb3Igd2hlbiB0aGUgcmVxdWVzdCBmYWlscyB0byByZWFjaCB0aGUgc2VydmVyLlxuICAgKi9cbiAgYXN5bmMgZ2V0VHlwZVNjaGVtYXMoY2FyZElkOiBzdHJpbmcpOiBQcm9taXNlPFR5cGVTY2hlbWFzUmVzcG9uc2U+IHtcbiAgICBjb25zdCB1cmwgPSB0aGlzLmJ1aWxkVXJsKGAvY2FyZHMvJHtjYXJkSWR9L3NjaGVtYWApO1xuICAgIHJldHVybiB0aGlzLnJlcXVlc3QoKCkgPT4gdGhpcy5nZXRIdHRwQ2xpZW50KCkuZ2V0PFR5cGVTY2hlbWFzUmVzcG9uc2U+KHVybCkpO1xuICB9XG5cbiAgLy8gLS0tIFN0cmVhbSBPcGVyYXRpb25zIC0tLVxuXG4gIC8qKlxuICAgKiBMaXN0cyBhbGwgc3RyZWFtcyBhdHRhY2hlZCB0byBhIGNhcmQsIHNvcnRlZCBieSBjcmVhdGlvbiB0aW1lLlxuICAgKlxuICAgKiBAcGFyYW0gY2FyZElkIC0gQ2FyZCBJRCB0byBxdWVyeS5cbiAgICogQHJldHVybnMgU3RyZWFtIG1ldGFkYXRhIGFycmF5IChtYXkgYmUgZW1wdHkpLlxuICAgKiBAdGhyb3dzIEFwaUVycm9yIHdoZW4gdGhlIHNlcnZlciByZXNwb25kcyB3aXRoIGFuIGVycm9yIChlLmcuLCA0MDQgZm9yIHVua25vd24gY2FyZCkuXG4gICAqIEB0aHJvd3MgTmV0d29ya0Vycm9yIHdoZW4gdGhlIHJlcXVlc3QgZmFpbHMgdG8gcmVhY2ggdGhlIHNlcnZlci5cbiAgICovXG4gIGFzeW5jIGxpc3RTdHJlYW1zKGNhcmRJZDogc3RyaW5nKTogUHJvbWlzZTxTdHJlYW1NZXRhW10+IHtcbiAgICBjb25zdCB1cmwgPSB0aGlzLmJ1aWxkVXJsKGAvY2FyZHMvJHtjYXJkSWR9L3N0cmVhbXNgKTtcbiAgICByZXR1cm4gdGhpcy5yZXF1ZXN0KCgpID0+IHRoaXMuZ2V0SHR0cENsaWVudCgpLmdldDxTdHJlYW1NZXRhW10+KHVybCkpO1xuICB9XG5cbiAgLyoqXG4gICAqIFJldHJpZXZlcyBhIHN0cmVhbSdzIG1ldGFkYXRhIGFuZCBhbGwgcmF3IGxpbmVzLlxuICAgKlxuICAgKiBUaGUgYHN0cmVhbVR5cGVgIGFuZCBgZmlsZW5hbWVgIGFyZSBVUkktZW5jb2RlZCBhdXRvbWF0aWNhbGx5LiBGb3IgY29tcGxldGVkXG4gICAqIHN0cmVhbXMgdGhlIHJldHVybmVkIGBsaW5lc2AgYXJyYXkgaXMgdGhlIGZ1bGwgY29udGVudDsgZm9yIGFjdGl2ZSBzdHJlYW1zIGl0XG4gICAqIGlzIGEgc25hcHNob3QgdGhhdCBtYXkgZ3JvdyB3aGlsZSB0aGUgY2FsbGVyIHByb2Nlc3NlcyBpdC5cbiAgICpcbiAgICogQHBhcmFtIGNhcmRJZCAtIElkZW50aWZpZXIgb2YgdGhlIGNhcmQgdGhhdCBvd25zIHRoZSByZXF1ZXN0ZWQgc3RyZWFtLlxuICAgKiBAcGFyYW0gc3RyZWFtVHlwZSAtIFN0cmVhbSB0eXBlIGtleSAoZS5nLiwgYFwiY2xhdWRlLWNvZGUtc2Vzc2lvblwiYCkuXG4gICAqIEBwYXJhbSBmaWxlbmFtZSAtIFN0cmVhbSBmaWxlbmFtZSAoZS5nLiwgYFwic2Vzc2lvbi5sb2dcImApLlxuICAgKiBAcmV0dXJucyBNZXRhZGF0YSBhbmQgY29udGVudCBsaW5lcy5cbiAgICogQHRocm93cyBBcGlFcnJvciBvbiA0MDQgKHVua25vd24gY2FyZCBvciBzdHJlYW0pIG9yIG90aGVyIHNlcnZlciBlcnJvcnMuXG4gICAqIEB0aHJvd3MgTmV0d29ya0Vycm9yIHdoZW4gdGhlIHJlcXVlc3QgZmFpbHMgdG8gcmVhY2ggdGhlIHNlcnZlci5cbiAgICovXG4gIGFzeW5jIGdldFN0cmVhbShcbiAgICBjYXJkSWQ6IHN0cmluZyxcbiAgICBzdHJlYW1UeXBlOiBzdHJpbmcsXG4gICAgZmlsZW5hbWU6IHN0cmluZ1xuICApOiBQcm9taXNlPHsgbWV0YTogU3RyZWFtTWV0YTsgbGluZXM6IHN0cmluZ1tdIH0+IHtcbiAgICBjb25zdCB1cmwgPSB0aGlzLmJ1aWxkVXJsKFxuICAgICAgYC9jYXJkcy8ke2NhcmRJZH0vc3RyZWFtcy8ke2VuY29kZVVSSUNvbXBvbmVudChzdHJlYW1UeXBlKX0vJHtlbmNvZGVVUklDb21wb25lbnQoZmlsZW5hbWUpfWBcbiAgICApO1xuICAgIHJldHVybiB0aGlzLnJlcXVlc3QoKCkgPT4gdGhpcy5nZXRIdHRwQ2xpZW50KCkuZ2V0PHsgbWV0YTogU3RyZWFtTWV0YTsgbGluZXM6IHN0cmluZ1tdIH0+KHVybCkpO1xuICB9XG5cbiAgLyoqXG4gICAqIE9wZW5zIGEgY2h1bmtlZCBKU09OTCBzdHJlYW0gdG8gdGhlIHNlcnZlciBhbmQgcmV0dXJucyBhIHdyaXRlci5cbiAgICpcbiAgICogVGhlIHdyaXRlciBzZW5kcyBlYWNoIGxpbmUgaW4gcmVhbC10aW1lIG92ZXIgYSBzaW5nbGUgSFRUUCBQT1NUIHVzaW5nIGFcbiAgICogYFJlYWRhYmxlU3RyZWFtYCBib2R5LiBDYWxsIHtAbGluayBTdHJlYW1Xcml0ZXIuY2xvc2V9IHdoZW4gdGhlIHByb2R1Y2VyXG4gICAqIGlzIGZpbmlzaGVkIHRvIGVuZCB0aGUgcmVxdWVzdCBhbmQgcmV0cmlldmUgdGhlIHNlcnZlcidzIHN1bW1hcnkuXG4gICAqXG4gICAqIEBwYXJhbSBjYXJkSWQgLSBDYXJkIElEIHRvIGF0dGFjaCB0aGUgc3RyZWFtIHRvLlxuICAgKiBAcGFyYW0gc3RyZWFtVHlwZSAtIFN0cmVhbSB0eXBlIGtleSBmcm9tIHNldHRpbmdzLmpzb24gKGUuZy4sIGBcImNsYXVkZS1jb2RlLXNlc3Npb25cImApLlxuICAgKiBAcGFyYW0gZmlsZW5hbWUgLSBTdHJlYW0gZmlsZW5hbWUgKGUuZy4sIGBcInNlc3Npb24tYWJjLmpzb25sXCJgKS5cbiAgICogQHBhcmFtIG9wdGlvbnMgLSBPcHRpb25hbCB0aXRsZSBhbmQgc2Vzc2lvbiBJRCBtZXRhZGF0YS5cbiAgICogQHJldHVybnMgQSB7QGxpbmsgU3RyZWFtV3JpdGVyfSBmb3IgcHVzaGluZyBsaW5lcyBhbmQgY2xvc2luZyB0aGUgc3RyZWFtLlxuICAgKlxuICAgKiBAZXhhbXBsZVxuICAgKiBgYGB0eXBlc2NyaXB0XG4gICAqIGNvbnN0IHN0cmVhbSA9IGNsaWVudC5vcGVuU3RyZWFtKGNhcmRJZCwgJ2NsYXVkZS1jb2RlLXNlc3Npb24nLCAncnVuLmpzb25sJyk7XG4gICAqIHN0cmVhbS53cml0ZShKU09OLnN0cmluZ2lmeSh7IHR5cGU6ICdpbml0JyB9KSk7XG4gICAqIHN0cmVhbS53cml0ZShKU09OLnN0cmluZ2lmeSh7IHR5cGU6ICdyZXN1bHQnIH0pKTtcbiAgICogY29uc3QgcmVzdWx0ID0gYXdhaXQgc3RyZWFtLmNsb3NlKCk7XG4gICAqIGBgYFxuICAgKi9cbiAgb3BlblN0cmVhbShjYXJkSWQ6IHN0cmluZywgc3RyZWFtVHlwZTogc3RyaW5nLCBmaWxlbmFtZTogc3RyaW5nLCBvcHRpb25zPzogU3RyZWFtV3JpdGVyT3B0aW9ucyk6IFN0cmVhbVdyaXRlciB7XG4gICAgY29uc3QgZW5jb2RlciA9IG5ldyBUZXh0RW5jb2RlcigpO1xuICAgIGxldCBjb250cm9sbGVyITogUmVhZGFibGVTdHJlYW1EZWZhdWx0Q29udHJvbGxlcjxVaW50OEFycmF5PjtcblxuICAgIGNvbnN0IGJvZHkgPSBuZXcgUmVhZGFibGVTdHJlYW08VWludDhBcnJheT4oe1xuICAgICAgc3RhcnQoYykge1xuICAgICAgICBjb250cm9sbGVyID0gYztcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIGNvbnN0IHVybCA9IHRoaXMuYnVpbGRVcmwoXG4gICAgICBgL2NhcmRzLyR7Y2FyZElkfS9zdHJlYW1zLyR7ZW5jb2RlVVJJQ29tcG9uZW50KHN0cmVhbVR5cGUpfS8ke2VuY29kZVVSSUNvbXBvbmVudChmaWxlbmFtZSl9YFxuICAgICk7XG5cbiAgICBjb25zdCBoZWFkZXJzOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ID0ge1xuICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi94LW5kanNvbidcbiAgICB9O1xuICAgIGlmICh0aGlzLm9wdGlvbnMuYWNjZXNzVG9rZW4pIHtcbiAgICAgIGhlYWRlcnNbJ0F1dGhvcml6YXRpb24nXSA9IGBCZWFyZXIgJHt0aGlzLm9wdGlvbnMuYWNjZXNzVG9rZW59YDtcbiAgICB9XG4gICAgaWYgKG9wdGlvbnM/LnRpdGxlKSB7XG4gICAgICBoZWFkZXJzWydYLVN0cmVhbS1UaXRsZSddID0gb3B0aW9ucy50aXRsZTtcbiAgICB9XG4gICAgaWYgKG9wdGlvbnM/LnNlc3Npb25JZCkge1xuICAgICAgaGVhZGVyc1snWC1TdHJlYW0tU2Vzc2lvbi1JZCddID0gb3B0aW9ucy5zZXNzaW9uSWQ7XG4gICAgfVxuXG4gICAgLy8gYGR1cGxleDogJ2hhbGYnYCBpcyByZXF1aXJlZCBieSB1bmRpY2kgZm9yIHN0cmVhbWluZyByZXF1ZXN0IGJvZGllc1xuICAgIC8vIGJ1dCBpcyBub3QgeWV0IGluIHRoZSBzdGFuZGFyZCBsaWIuZG9tIFJlcXVlc3RJbml0IHR5cGUuXG4gICAgY29uc3QgZmV0Y2hPcHRpb25zOiBSZXF1ZXN0SW5pdCAmIHsgZHVwbGV4OiBzdHJpbmcgfSA9IHtcbiAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgaGVhZGVycyxcbiAgICAgIGJvZHksXG4gICAgICBkdXBsZXg6ICdoYWxmJ1xuICAgIH07XG5cbiAgICBjb25zdCByZXNwb25zZVByb21pc2UgPSBmZXRjaCh1cmwsIGZldGNoT3B0aW9ucyk7XG5cbiAgICAvLyBUcmFjayBlYXJseSByZWplY3Rpb24gZnJvbSB0aGUgc2VydmVyIChlLmcuIDQwOSBcIlN0cmVhbSBhbHJlYWR5XG4gICAgLy8gZXhpc3RzIGFuZCBpcyBhY3RpdmVcIikuICBGb3IgYSBzdWNjZXNzZnVsIHN0cmVhbSB0aGUgcmVzcG9uc2Ugc3RheXNcbiAgICAvLyBwZW5kaW5nIHVudGlsIGNsb3NlKCkgZW5kcyB0aGUgYm9keSBcdTIwMTQgYnV0IGVycm9yIHJlc3BvbnNlcyBhcnJpdmVcbiAgICAvLyBpbW1lZGlhdGVseSBhbmQgbXVzdCBiZSBzdXJmYWNlZCB3aXRob3V0IHdhaXRpbmcgZm9yIGNsb3NlKCkuXG4gICAgLy8gTm90ZTogb25seSByZWFkcyByZXNwb25zZS5vay9zdGF0dXNUZXh0IChub3QgdGhlIGJvZHkpIHNvIGNsb3NlKClcbiAgICAvLyBjYW4gc3RpbGwgcGFyc2UgdGhlIGZ1bGwgZXJyb3IgcmVzcG9uc2UuXG4gICAgbGV0IGVhcmx5RXJyb3I6IEVycm9yIHwgbnVsbCA9IG51bGw7XG4gICAgcmVzcG9uc2VQcm9taXNlXG4gICAgICAudGhlbigocmVzcG9uc2UpID0+IHtcbiAgICAgICAgaWYgKCFyZXNwb25zZS5vaykge1xuICAgICAgICAgIGVhcmx5RXJyb3IgPSBuZXcgQXBpRXJyb3IocmVzcG9uc2Uuc3RhdHVzVGV4dCwgU3RyaW5nKHJlc3BvbnNlLnN0YXR1cykpO1xuICAgICAgICB9XG4gICAgICB9KVxuICAgICAgLmNhdGNoKChlcnI6IHVua25vd24pID0+IHtcbiAgICAgICAgZWFybHlFcnJvciA9IGVyciBpbnN0YW5jZW9mIEVycm9yID8gZXJyIDogbmV3IEVycm9yKFN0cmluZyhlcnIpKTtcbiAgICAgIH0pO1xuXG4gICAgcmV0dXJuIHtcbiAgICAgIHdyaXRlKGxpbmU6IHN0cmluZyk6IHZvaWQge1xuICAgICAgICBpZiAoZWFybHlFcnJvcikgdGhyb3cgZWFybHlFcnJvcjtcbiAgICAgICAgY29udHJvbGxlci5lbnF1ZXVlKGVuY29kZXIuZW5jb2RlKGAke2xpbmV9XFxuYCkpO1xuICAgICAgfSxcbiAgICAgIGNsb3NlOiBhc3luYyAoKTogUHJvbWlzZTxTdHJlYW1SZXN1bHQ+ID0+IHtcbiAgICAgICAgY29udHJvbGxlci5jbG9zZSgpO1xuICAgICAgICByZXR1cm4gdGhpcy5yZXF1ZXN0KGFzeW5jICgpID0+IHtcbiAgICAgICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IHJlc3BvbnNlUHJvbWlzZTtcbiAgICAgICAgICBpZiAoIXJlc3BvbnNlLm9rKSB0aHJvdyByZXNwb25zZTtcbiAgICAgICAgICByZXR1cm4gcmVzcG9uc2UuanNvbigpIGFzIFByb21pc2U8U3RyZWFtUmVzdWx0PjtcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfTtcbiAgfVxuXG4gIC8qKlxuICAgKiBPcGVucyBhIFdlYlNvY2tldC1iYWNrZWQgSlNPTkwgc3RyZWFtIHRvIHRoZSBzZXJ2ZXIgYW5kIHJldHVybnMgYSBzZXNzaW9uLlxuICAgKlxuICAgKiBUaGUgc2Vzc2lvbiBrZWVwcyBhIHBlcnNpc3RlbnQgV2ViU29ja2V0IGNvbm5lY3Rpb24gZm9yIHRoZSBlbnRpcmUgc2Vzc2lvblxuICAgKiBsaWZldGltZS4gVGhlIHNlcnZlciBzZW5kcyBhIGByZWFkeWAgbWVzc2FnZSB3aXRoIGByZXN1bWVGcm9tYCBiZWZvcmUgdGhlXG4gICAqIGNhbGxlciB3cml0ZXMgYW55IGxpbmVzLCBzbyB0aGUgd2F0Y2hlciBjYW4gc2tpcCBsaW5lcyB0aGUgc2VydmVyIGFscmVhZHkgaGFzLlxuICAgKlxuICAgKiBDYWxsIHtAbGluayBXc1N0cmVhbVNlc3Npb24uY2xvc2V9IHdoZW4gdGhlIHByb2R1Y2VyIGlzIGZpbmlzaGVkIHRvIHNlbmQgYVxuICAgKiBncmFjZWZ1bCBjbG9zZSBtZXNzYWdlIGFuZCBhd2FpdCB0aGUgc2VydmVyJ3MgYWNrbm93bGVkZ2VtZW50LlxuICAgKlxuICAgKiBAcGFyYW0gY2FyZElkIC0gQ2FyZCBJRCB0byBhdHRhY2ggdGhlIHN0cmVhbSB0by5cbiAgICogQHBhcmFtIHN0cmVhbVR5cGUgLSBTdHJlYW0gdHlwZSBrZXkgZnJvbSBzZXR0aW5ncy5qc29uIChlLmcuLCBgXCJjbGF1ZGUtY29kZS1zZXNzaW9uXCJgKS5cbiAgICogQHBhcmFtIGZpbGVuYW1lIC0gU3RyZWFtIGZpbGVuYW1lIChlLmcuLCBgXCJzZXNzaW9uLWFiYy5qc29ubFwiYCkuXG4gICAqIEBwYXJhbSBvcHRpb25zIC0gVGl0bGUgYW5kIHNlc3Npb24gSUQgbWV0YWRhdGEgZm9yd2FyZGVkIHRvIHRoZSBzZXJ2ZXIgYXMgVVJMIHF1ZXJ5IHBhcmFtZXRlcnMuXG4gICAqIEBwYXJhbSB3c0ZhY3RvcnkgLSBXZWJTb2NrZXQgZmFjdG9yeSBmb3IgY3JlYXRpbmcgdGhlIGNvbm5lY3Rpb24uIFVzZSB0aGUgYHdzYCBwYWNrYWdlIGluIE5vZGUuanMgZW52aXJvbm1lbnRzLlxuICAgKiBAcmV0dXJucyBBIHtAbGluayBXc1N0cmVhbVNlc3Npb259IHdpdGggYHJlc3VtZUZyb21gIHNldCB0byB0aGUgc2VydmVyJ3MgY3VycmVudCBsaW5lIGNvdW50LlxuICAgKiBAdGhyb3dzIEVycm9yIHdoZW4gdGhlIFdlYlNvY2tldCBmYWlscyB0byBjb25uZWN0IG9yIHRoZSBzZXJ2ZXIgc2VuZHMgYW4gZXJyb3IgYmVmb3JlIGByZWFkeWAuXG4gICAqL1xuICBhc3luYyBvcGVuU3RyZWFtV2ViU29ja2V0KFxuICAgIGNhcmRJZDogc3RyaW5nLFxuICAgIHN0cmVhbVR5cGU6IHN0cmluZyxcbiAgICBmaWxlbmFtZTogc3RyaW5nLFxuICAgIG9wdGlvbnM6IFN0cmVhbVdyaXRlck9wdGlvbnMsXG4gICAgd3NGYWN0b3J5OiBJbmdlc3RXc0ZhY3RvcnlcbiAgKTogUHJvbWlzZTxXc1N0cmVhbVNlc3Npb24+IHtcbiAgICBjb25zdCBmYWN0b3J5ID0gd3NGYWN0b3J5O1xuXG4gICAgLy8gQ29udmVydCBodHRwL2h0dHBzIHRvIHdzL3dzc1xuICAgIGNvbnN0IGJhc2VVcmwgPSB0aGlzLm9wdGlvbnMuYmFzZVVybC5yZXBsYWNlKC9eaHR0cC8sICd3cycpO1xuICAgIGNvbnN0IGJhc2VQYXRoID0gYCR7YmFzZVVybH0vY2FyZHMvJHtlbmNvZGVVUklDb21wb25lbnQoY2FyZElkKX0vc3RyZWFtcy8ke2VuY29kZVVSSUNvbXBvbmVudChzdHJlYW1UeXBlKX0vJHtlbmNvZGVVUklDb21wb25lbnQoZmlsZW5hbWUpfWA7XG4gICAgY29uc3QgcXVlcnlQYXJhbXMgPSBuZXcgVVJMU2VhcmNoUGFyYW1zKCk7XG4gICAgaWYgKG9wdGlvbnM/LnRpdGxlKSBxdWVyeVBhcmFtcy5zZXQoJ3RpdGxlJywgb3B0aW9ucy50aXRsZSk7XG4gICAgaWYgKG9wdGlvbnM/LnNlc3Npb25JZCkgcXVlcnlQYXJhbXMuc2V0KCdzZXNzaW9uSWQnLCBvcHRpb25zLnNlc3Npb25JZCk7XG4gICAgY29uc3QgcXVlcnlTdHJpbmcgPSBxdWVyeVBhcmFtcy50b1N0cmluZygpO1xuICAgIGNvbnN0IHVybCA9IHF1ZXJ5U3RyaW5nID8gYCR7YmFzZVBhdGh9PyR7cXVlcnlTdHJpbmd9YCA6IGJhc2VQYXRoO1xuXG4gICAgY29uc3QgaGVhZGVyczogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHt9O1xuICAgIGlmICh0aGlzLm9wdGlvbnMuYWNjZXNzVG9rZW4pIHtcbiAgICAgIGhlYWRlcnNbJ0F1dGhvcml6YXRpb24nXSA9IGBCZWFyZXIgJHt0aGlzLm9wdGlvbnMuYWNjZXNzVG9rZW59YDtcbiAgICB9XG5cbiAgICBjb25zdCB3cyA9IGZhY3RvcnkodXJsLCB7IGhlYWRlcnMgfSk7XG5cbiAgICAvLyBBd2FpdCB0aGUgJ3JlYWR5JyBtZXNzYWdlIGZyb20gdGhlIHNlcnZlciBiZWZvcmUgcmV0dXJuaW5nIHRvIHRoZSBjYWxsZXIuXG4gICAgLy8gQW55IGVycm9yIG9yIHByZW1hdHVyZSBjbG9zZSBiZWZvcmUgJ3JlYWR5JyByZWplY3RzIHRoZSBwcm9taXNlLlxuICAgIGNvbnN0IHJlc3VtZUZyb20gPSBhd2FpdCBuZXcgUHJvbWlzZTxudW1iZXI+KChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgIGNvbnN0IG9uUmVhZHkgPSAoZXZlbnQ6IE1lc3NhZ2VFdmVudDx1bmtub3duPikgPT4ge1xuICAgICAgICB0cnkge1xuICAgICAgICAgIGNvbnN0IG1zZyA9IEpTT04ucGFyc2UoU3RyaW5nKGV2ZW50LmRhdGEpKSBhcyB7IHR5cGU6IHN0cmluZzsgcmVzdW1lRnJvbT86IG51bWJlcjsgbWVzc2FnZT86IHN0cmluZyB9O1xuICAgICAgICAgIGlmIChtc2cudHlwZSA9PT0gJ3JlYWR5Jykge1xuICAgICAgICAgICAgd3MucmVtb3ZlRXZlbnRMaXN0ZW5lcignbWVzc2FnZScsIG9uUmVhZHkpO1xuICAgICAgICAgICAgd3MucmVtb3ZlRXZlbnRMaXN0ZW5lcignZXJyb3InLCBvbkVycm9yKTtcbiAgICAgICAgICAgIHdzLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2Nsb3NlJywgb25DbG9zZSk7XG4gICAgICAgICAgICByZXNvbHZlKG1zZy5yZXN1bWVGcm9tID8/IDApO1xuICAgICAgICAgIH0gZWxzZSBpZiAobXNnLnR5cGUgPT09ICdlcnJvcicpIHtcbiAgICAgICAgICAgIHdzLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ21lc3NhZ2UnLCBvblJlYWR5KTtcbiAgICAgICAgICAgIHdzLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2Vycm9yJywgb25FcnJvcik7XG4gICAgICAgICAgICB3cy5yZW1vdmVFdmVudExpc3RlbmVyKCdjbG9zZScsIG9uQ2xvc2UpO1xuICAgICAgICAgICAgcmVqZWN0KG5ldyBFcnJvcihtc2cubWVzc2FnZSA/PyAnU2VydmVyIGVycm9yJykpO1xuICAgICAgICAgIH1cbiAgICAgICAgICAvLyBPdGhlciBtZXNzYWdlIHR5cGVzIGJlZm9yZSAncmVhZHknIGFyZSBzaWxlbnRseSBpZ25vcmVkXG4gICAgICAgIH0gY2F0Y2gge1xuICAgICAgICAgIHJlamVjdChuZXcgRXJyb3IoJ0ZhaWxlZCB0byBwYXJzZSBzZXJ2ZXIgcmVhZHkgbWVzc2FnZScpKTtcbiAgICAgICAgfVxuICAgICAgfTtcbiAgICAgIGNvbnN0IG9uRXJyb3IgPSAoZXZlbnQ6IEV2ZW50KSA9PiB7XG4gICAgICAgIHdzLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ21lc3NhZ2UnLCBvblJlYWR5KTtcbiAgICAgICAgd3MucmVtb3ZlRXZlbnRMaXN0ZW5lcignZXJyb3InLCBvbkVycm9yKTtcbiAgICAgICAgd3MucmVtb3ZlRXZlbnRMaXN0ZW5lcignY2xvc2UnLCBvbkNsb3NlKTtcbiAgICAgICAgcmVqZWN0KG5ldyBFcnJvcihgV2ViU29ja2V0IGVycm9yOiAke1N0cmluZyhldmVudCl9YCkpO1xuICAgICAgfTtcbiAgICAgIGNvbnN0IG9uQ2xvc2UgPSAoZXZlbnQ6IENsb3NlRXZlbnQpID0+IHtcbiAgICAgICAgd3MucmVtb3ZlRXZlbnRMaXN0ZW5lcignbWVzc2FnZScsIG9uUmVhZHkpO1xuICAgICAgICB3cy5yZW1vdmVFdmVudExpc3RlbmVyKCdlcnJvcicsIG9uRXJyb3IpO1xuICAgICAgICB3cy5yZW1vdmVFdmVudExpc3RlbmVyKCdjbG9zZScsIG9uQ2xvc2UpO1xuICAgICAgICByZWplY3QobmV3IEVycm9yKGBXZWJTb2NrZXQgY2xvc2VkIGJlZm9yZSByZWFkeTogY29kZT0ke1N0cmluZyhldmVudC5jb2RlKX1gKSk7XG4gICAgICB9O1xuICAgICAgd3MuYWRkRXZlbnRMaXN0ZW5lcignbWVzc2FnZScsIG9uUmVhZHkpO1xuICAgICAgd3MuYWRkRXZlbnRMaXN0ZW5lcignZXJyb3InLCBvbkVycm9yKTtcbiAgICAgIHdzLmFkZEV2ZW50TGlzdGVuZXIoJ2Nsb3NlJywgb25DbG9zZSk7XG4gICAgfSk7XG5cbiAgICBsZXQgbGluZXNTZW50ID0gcmVzdW1lRnJvbTtcblxuICAgIHJldHVybiB7XG4gICAgICBnZXQgcmVzdW1lRnJvbSgpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gcmVzdW1lRnJvbTtcbiAgICAgIH0sXG4gICAgICBnZXQgbGluZXNTZW50KCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiBsaW5lc1NlbnQ7XG4gICAgICB9LFxuICAgICAgd3JpdGUobGluZTogc3RyaW5nKTogdm9pZCB7XG4gICAgICAgIGxpbmVzU2VudCsrO1xuICAgICAgICB3cy5zZW5kKEpTT04uc3RyaW5naWZ5KHsgdHlwZTogJ2xpbmUnLCBsaW5lTnVtYmVyOiBsaW5lc1NlbnQsIGNvbnRlbnQ6IGxpbmUgfSkpO1xuICAgICAgfSxcbiAgICAgIGFzeW5jIGNsb3NlKCk6IFByb21pc2U8U3RyZWFtUmVzdWx0PiB7XG4gICAgICAgIHdzLnNlbmQoSlNPTi5zdHJpbmdpZnkoeyB0eXBlOiAnY2xvc2UnIH0pKTtcbiAgICAgICAgYXdhaXQgbmV3IFByb21pc2U8dm9pZD4oKHJlc29sdmUpID0+IHtcbiAgICAgICAgICBjb25zdCBvbkNsb3NlID0gKCkgPT4ge1xuICAgICAgICAgICAgd3MucmVtb3ZlRXZlbnRMaXN0ZW5lcignY2xvc2UnLCBvbkNsb3NlKTtcbiAgICAgICAgICAgIHJlc29sdmUoKTtcbiAgICAgICAgICB9O1xuICAgICAgICAgIHdzLmFkZEV2ZW50TGlzdGVuZXIoJ2Nsb3NlJywgb25DbG9zZSk7XG4gICAgICAgICAgLy8gSWYgYWxyZWFkeSBjbG9zZWQsIHJlc29sdmUgaW1tZWRpYXRlbHlcbiAgICAgICAgICBpZiAod3MucmVhZHlTdGF0ZSA9PT0gd3MuQ0xPU0VEKSB7XG4gICAgICAgICAgICB3cy5yZW1vdmVFdmVudExpc3RlbmVyKCdjbG9zZScsIG9uQ2xvc2UpO1xuICAgICAgICAgICAgcmVzb2x2ZSgpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgZmlsZW5hbWUsXG4gICAgICAgICAgc3RyZWFtVHlwZSxcbiAgICAgICAgICBsaW5lQ291bnQ6IGxpbmVzU2VudCxcbiAgICAgICAgICBzdGF0dXM6ICdjb21wbGV0ZWQnXG4gICAgICAgIH07XG4gICAgICB9XG4gICAgfTtcbiAgfVxuXG4gIC8vIC0tLSBBY3Rpb24gT3BlcmF0aW9ucyAtLS1cblxuICAvKipcbiAgICogRXhlY3V0ZXMgYW4gYWN0aW9uIG9uIGEgY2FyZCB2aWEgdGhlIHNlcnZlciByZWxheS5cbiAgICpcbiAgICogQHBhcmFtIGNhcmRJZCAtIElkZW50aWZpZXIgb2YgdGhlIGNhcmQgdG8gZXhlY3V0ZSB0aGUgYWN0aW9uIG9uLlxuICAgKiBAcGFyYW0gYWN0aW9uTmFtZSAtIEFjdGlvbiBpZGVudGlmaWVyIChlLmcuLCAnbGF1bmNoJykuXG4gICAqIEByZXR1cm5zIFByb21pc2UgcmVzb2x2aW5nIHRvIHRoZSBhY3Rpb24gZXhlY3V0aW9uIHJlc3VsdC5cbiAgICogQHRocm93cyBBcGlFcnJvciB3aGVuIHRoZSBzZXJ2ZXIgcmVqZWN0cyB0aGUgcmVxdWVzdC5cbiAgICogQHRocm93cyBOZXR3b3JrRXJyb3Igd2hlbiB0aGUgcmVxdWVzdCBmYWlscyB0byByZWFjaCB0aGUgc2VydmVyLlxuICAgKi9cbiAgYXN5bmMgZXhlY3V0ZUFjdGlvbihjYXJkSWQ6IHN0cmluZywgYWN0aW9uTmFtZTogc3RyaW5nKTogUHJvbWlzZTxBY3Rpb25SZXN1bHQ+IHtcbiAgICBjb25zdCB1cmwgPSB0aGlzLmJ1aWxkVXJsKGAvY2FyZHMvJHtjYXJkSWR9L2FjdGlvbnMvJHtlbmNvZGVVUklDb21wb25lbnQoYWN0aW9uTmFtZSl9YCk7XG4gICAgcmV0dXJuIHRoaXMucmVxdWVzdCgoKSA9PiB0aGlzLmdldEh0dHBDbGllbnQoKS5wb3N0PEFjdGlvblJlc3VsdD4odXJsLCB1bmRlZmluZWQpKTtcbiAgfVxuXG4gIC8vIC0tLSBDb21wYXJlIE9wZXJhdGlvbnMgLS0tXG5cbiAgLyoqXG4gICAqIFNldHMgb3IgcmVwbGFjZXMgdGhlIGFjdGl2ZSBjb21wYXJpc29uIG9uIHRoZSBzZXJ2ZXIuXG4gICAqXG4gICAqIEBwYXJhbSByZXF1ZXN0IC0gQ29tcGFyZSByZXF1ZXN0IHNwZWNpZnlpbmcgdGhlIGNvbXBhcmlzb24gbW9kZS5cbiAgICogQHJldHVybnMgUHJvbWlzZSByZXNvbHZpbmcgdG8gdGhlIHJlc3VsdGluZyBjb21wYXJlIHN0YXRlLlxuICAgKi9cbiAgYXN5bmMgc2V0Q29tcGFyZShyZXF1ZXN0OiBDb21wYXJlUmVxdWVzdCk6IFByb21pc2U8Q29tcGFyZVN0YXRlPiB7XG4gICAgY29uc3QgdXJsID0gdGhpcy5idWlsZFVybCgnL2NvbXBhcmUnKTtcbiAgICByZXR1cm4gdGhpcy5yZXF1ZXN0KCgpID0+IHRoaXMuZ2V0SHR0cENsaWVudCgpLnBvc3Q8Q29tcGFyZVN0YXRlPih1cmwsIHJlcXVlc3QpKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXR1cm5zIHRoZSBjdXJyZW50IGNvbXBhcmUgc3RhdGUsIG9yIG51bGwgaWYgbm8gY29tcGFyaXNvbiBpcyBhY3RpdmUuXG4gICAqXG4gICAqIFRoZSBzZXJ2ZXIgcmV0dXJucyAyMDQgd2hlbiBubyBjb21wYXJpc29uIGlzIGFjdGl2ZSwgd2hpY2ggdGhpcyBtZXRob2RcbiAgICogbWFwcyB0byBudWxsIHJhdGhlciB0aGFuIHRocm93aW5nLlxuICAgKlxuICAgKiBAcmV0dXJucyBQcm9taXNlIHJlc29sdmluZyB0byB0aGUgY3VycmVudCBjb21wYXJlIHN0YXRlLCBvciBudWxsIGlmIG5vbmUgYWN0aXZlLlxuICAgKi9cbiAgYXN5bmMgZ2V0Q29tcGFyZSgpOiBQcm9taXNlPENvbXBhcmVTdGF0ZSB8IG51bGw+IHtcbiAgICBjb25zdCB1cmwgPSB0aGlzLmJ1aWxkVXJsKCcvY29tcGFyZScpO1xuICAgIHJldHVybiB0aGlzLnJlcXVlc3QoYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBmZXRjaCh1cmwsIHtcbiAgICAgICAgaGVhZGVyczogdGhpcy5nZXRIZWFkZXJzKCkgYXMgUmVjb3JkPHN0cmluZywgc3RyaW5nPixcbiAgICAgICAgc2lnbmFsOiB0aGlzLmdldFRpbWVvdXRTaWduYWwoKVxuICAgICAgfSk7XG4gICAgICBpZiAocmVzcG9uc2Uuc3RhdHVzID09PSAyMDQpIHtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9XG4gICAgICBpZiAoIXJlc3BvbnNlLm9rKSB0aHJvdyByZXNwb25zZTtcbiAgICAgIHJldHVybiByZXNwb25zZS5qc29uKCkgYXMgUHJvbWlzZTxDb21wYXJlU3RhdGU+O1xuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIENsZWFycyB0aGUgYWN0aXZlIGNvbXBhcmlzb24gb24gdGhlIHNlcnZlci5cbiAgICpcbiAgICogQHJldHVybnMgUHJvbWlzZSByZXNvbHZpbmcgd2hlbiB0aGUgY29tcGFyaXNvbiBpcyBjbGVhcmVkLlxuICAgKi9cbiAgYXN5bmMgY2xlYXJDb21wYXJlKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIGNvbnN0IHVybCA9IHRoaXMuYnVpbGRVcmwoJy9jb21wYXJlJyk7XG4gICAgcmV0dXJuIHRoaXMucmVxdWVzdCgoKSA9PiB0aGlzLmdldEh0dHBDbGllbnQoKS5kZWxldGUodXJsKSk7XG4gIH1cbn1cbiIsICJpbXBvcnQgeyBleGVjRmlsZSB9IGZyb20gJ25vZGU6Y2hpbGRfcHJvY2Vzcyc7XG5pbXBvcnQgKiBhcyBmcyBmcm9tICdub2RlOmZzL3Byb21pc2VzJztcbmltcG9ydCAqIGFzIHBhdGggZnJvbSAnbm9kZTpwYXRoJztcbmltcG9ydCB7IHByb21pc2lmeSB9IGZyb20gJ25vZGU6dXRpbCc7XG5cbi8qKlxuICogSW1wbGVtZW50cyBjcmVhdGUgd29ya3RyZWUgYmVoYXZpb3IgZm9yIHRoZSBkZWZhdWx0LWNvbmZpZ3VyYXRpb24gcGFja2FnZS5cbiAqIFRoZSBtb2R1bGUgY2FwdHVyZXMgZG9tYWluIHJ1bGVzIGluIG9uZSBwbGFjZSBzbyBjYWxsZXJzIGNhbiBjb21wb3NlIHdvcmtmbG93cyB3aXRob3V0XG4gKiBkdXBsaWNhdGluZyBlZGdlLWNhc2UgaGFuZGxpbmcuXG4gKlxuICogQHN1bW1hcnkgQ3JlYXRlIFdvcmt0cmVlIGxvZ2ljIGZvciBsaWJcbiAqL1xuXG5jb25zdCBleGVjRmlsZUFzeW5jID0gcHJvbWlzaWZ5KGV4ZWNGaWxlKTtcblxuLyoqXG4gKiBWYWxpZGF0ZXMgYSBicmFuY2ggbmFtZSBhZ2FpbnN0IHRoZSBDTEkncyBzYWZlIHN1YnNldC5cbiAqXG4gKiBUaGUgbmFtZSBtdXN0IHN0YXJ0IHdpdGggYW4gYWxwaGFudW1lcmljIGNoYXJhY3RlciBhbmQgbWF5IHRoZW4gaW5jbHVkZVxuICogYWxwaGFudW1lcmljcywgc2xhc2hlcywgdW5kZXJzY29yZXMsIG9yIGRhc2hlcy5cbiAqXG4gKiBAcGFyYW0gbmFtZSAtIENhbmRpZGF0ZSBicmFuY2ggbmFtZSBzdXBwbGllZCBieSB0aGUgY2FsbGVyLlxuICogQHRocm93cyB7RXJyb3J9IFdoZW4gdGhlIGJyYW5jaCBuYW1lIGRvZXMgbm90IG1hdGNoIHRoZSBzdXBwb3J0ZWQgZm9ybWF0LlxuICogQHJldHVybnMgTm8gdmFsdWUuIFRocm93cyBvbiBpbnZhbGlkIGlucHV0LlxuICovXG5leHBvcnQgZnVuY3Rpb24gdmFsaWRhdGVCcmFuY2hOYW1lKG5hbWU6IHN0cmluZyk6IHZvaWQge1xuICBjb25zdCBicmFuY2hOYW1lUmVnZXggPSAvXlthLXpBLVowLTldW2EtekEtWjAtOS9fLV0qJC87XG4gIGlmICghYnJhbmNoTmFtZVJlZ2V4LnRlc3QobmFtZSkpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0Vycm9yOiBJbnZhbGlkIGJyYW5jaCBuYW1lIGZvcm1hdC4nKTtcbiAgfVxufVxuXG4vKipcbiAqIERldGVybWluZXMgd2hldGhlciBhIHJlbGF0aXZlIHBhdGggaXMgbmVzdGVkIHVuZGVyIGFueSBrbm93biBwYXJlbnQgcGF0aC5cbiAqXG4gKiBUaGUgY2hlY2sgd2Fsa3MgYW5jZXN0b3Igc2VnbWVudHMgb2YgYGRpcmAgYW5kIHJldHVybnMgdHJ1ZSBvbiB0aGUgZmlyc3RcbiAqIG1hdGNoIGluIGBwYXJlbnRTZXRgLlxuICpcbiAqIEBwYXJhbSBkaXIgLSBSZWxhdGl2ZSBwYXRoIHRvIHRlc3QuXG4gKiBAcGFyYW0gcGFyZW50U2V0IC0gQ2FuZGlkYXRlIHBhcmVudCBkaXJlY3RvcmllcyByZXByZXNlbnRlZCBhcyByZWxhdGl2ZSBwYXRocy5cbiAqIEByZXR1cm5zIFRydWUgd2hlbiBgZGlyYCBpcyBuZXN0ZWQgdW5kZXIgYSBwYXRoIGluIGBwYXJlbnRTZXRgLlxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNOZXN0ZWRVbmRlcihkaXI6IHN0cmluZywgcGFyZW50U2V0OiBTZXQ8c3RyaW5nPik6IGJvb2xlYW4ge1xuICBsZXQgY3VycmVudCA9IGRpcjtcbiAgd2hpbGUgKGN1cnJlbnQuaW5jbHVkZXMoJy8nKSkge1xuICAgIGN1cnJlbnQgPSBjdXJyZW50LnN1YnN0cmluZygwLCBjdXJyZW50Lmxhc3RJbmRleE9mKCcvJykpO1xuICAgIGlmIChwYXJlbnRTZXQuaGFzKGN1cnJlbnQpKSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIGZhbHNlO1xufVxuXG4vKipcbiAqIENoZWNrcyB3aGV0aGVyIGEgc3ltbGluayB0YXJnZXQgcG9pbnRzIHRvIGtub3duIG1vbm9yZXBvLWludGVybmFsIGxvY2F0aW9ucy5cbiAqXG4gKiBJbnRlcm5hbCB0YXJnZXRzIGFyZSBwcmVzZXJ2ZWQgYXMgcmVsYXRpdmUgbGlua3MgZHVyaW5nIG5vZGVfbW9kdWxlcyByZXJvdXRlXG4gKiBzbyB3b3Jrc3BhY2UgbGlua3Mga2VlcCB3b3JraW5nIGluc2lkZSBhIHdvcmt0cmVlLlxuICpcbiAqIEBwYXJhbSB0YXJnZXQgLSBTeW1saW5rIHRhcmdldCByZWFkIGZyb20gdGhlIHNvdXJjZSBub2RlX21vZHVsZXMgZW50cnkuXG4gKiBAcmV0dXJucyBUcnVlIHdoZW4gdGhlIHRhcmdldCBzdGFydHMgd2l0aCBhbiBpbnRlcm5hbCBwcmVmaXguXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc0ludGVybmFsU3ltbGluayh0YXJnZXQ6IHN0cmluZyk6IGJvb2xlYW4ge1xuICByZXR1cm4gdGFyZ2V0LnN0YXJ0c1dpdGgoJy4uLycpO1xufVxuXG5pbnRlcmZhY2UgQ3JlYXRlV29ya3RyZWVSZXN1bHQge1xuICBicmFuY2g6IHN0cmluZztcbiAgd29ya3RyZWU6IHN0cmluZztcbiAgYmFzZVNoYTogc3RyaW5nO1xuICByZXJvdXRlZFN5bWxpbmtzPzogbnVtYmVyO1xufVxuXG4vKipcbiAqIENyZWF0ZXMgYW5kIGNvbmZpZ3VyZXMgYSBuZXcgZ2l0IHdvcmt0cmVlIGZvciBhIGJyYW5jaC5cbiAqXG4gKiBUaGUgd29ya2Zsb3cgdmFsaWRhdGVzIHRoZSBicmFuY2ggbmFtZSwgY3JlYXRlcyB0aGUgd29ya3RyZWUsIG1pcnJvcnNcbiAqIGV4aXN0aW5nIHJvb3Qgc3ltbGlua3MsIHN5bWxpbmtzIGlnbm9yZWQgcGF0aHMsIHJlcm91dGVzIG5vZGVfbW9kdWxlcyBsaW5rcyxcbiAqIGFuZCB1cGRhdGVzIHBlci13b3JrdHJlZSBnaXQgZXhjbHVkZXMuXG4gKlxuICogQHBhcmFtIGJyYW5jaE5hbWUgLSBOYW1lIG9mIHRoZSBicmFuY2ggdG8gY3JlYXRlIG9yIGF0dGFjaC5cbiAqIEBwYXJhbSBvcHRpb25zIC0gT3B0aW9uYWwgY29uZmlndXJhdGlvbi5cbiAqIEBwYXJhbSBvcHRpb25zLmN3ZCAtIFdvcmtpbmcgZGlyZWN0b3J5IHRvIHVzZSB3aGVuIGxvY2F0aW5nIGdpdCByb290cy4gRGVmYXVsdHMgdG8gYHByb2Nlc3MuY3dkKClgLlxuICogQHJldHVybnMgTWV0YWRhdGEgZGVzY3JpYmluZyB0aGUgY3JlYXRlZCB3b3JrdHJlZSBhbmQgYmFzZSBjb21taXQuXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBjcmVhdGVXb3JrdHJlZShicmFuY2hOYW1lOiBzdHJpbmcsIG9wdGlvbnM/OiB7IGN3ZD86IHN0cmluZyB9KTogUHJvbWlzZTxDcmVhdGVXb3JrdHJlZVJlc3VsdD4ge1xuICB2YWxpZGF0ZUJyYW5jaE5hbWUoYnJhbmNoTmFtZSk7XG5cbiAgY29uc3QgeyBzb3VyY2VSb290LCByZXBvUm9vdCB9ID0gYXdhaXQgZmluZEdpdFJvb3RzKG9wdGlvbnM/LmN3ZCA/PyBwcm9jZXNzLmN3ZCgpKTtcbiAgY29uc3Qgc3RhcnRQb2ludCA9IGF3YWl0IHJlc29sdmVIZWFkKHNvdXJjZVJvb3QpO1xuICBjb25zdCB3b3JrdHJlZURpciA9IHBhdGguam9pbihyZXBvUm9vdCwgJy53b3JrdHJlZXMnLCBicmFuY2hOYW1lKTtcblxuICBjb25zdCBbd29ya3RyZWVFeGlzdHMsIGJyYW5jaEV4aXN0c10gPSBhd2FpdCBQcm9taXNlLmFsbChbXG4gICAgY2hlY2tXb3JrdHJlZUV4aXN0cyhyZXBvUm9vdCwgd29ya3RyZWVEaXIpLFxuICAgIGNoZWNrQnJhbmNoRXhpc3RzKHJlcG9Sb290LCBicmFuY2hOYW1lKVxuICBdKTtcblxuICBpZiAod29ya3RyZWVFeGlzdHMpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYEVycm9yOiBXb3JrdHJlZSBhbHJlYWR5IGV4aXN0cyBhdCAke3dvcmt0cmVlRGlyfWApO1xuICB9XG5cbiAgLy8gUmVtb3ZlIHN0YWxlIGRpcmVjdG9yeSByZW1uYW50cyBsZWZ0IGJ5IGEgY3Jhc2hlZCBwcmV2aW91cyBzZXNzaW9uLlxuICAvLyBHaXQgZG9lc24ndCB0cmFjayB0aGUgd29ya3RyZWUsIGJ1dCB0aGUgZGlyZWN0b3J5IG1heSBzdGlsbCBleGlzdCBvbiBkaXNrLFxuICAvLyB3aGljaCBjYXVzZXMgYGdpdCB3b3JrdHJlZSBhZGRgIHRvIGZhaWwgd2l0aCBcImFscmVhZHkgZXhpc3RzXCIuXG4gIHRyeSB7XG4gICAgYXdhaXQgZnMuYWNjZXNzKHdvcmt0cmVlRGlyKTtcbiAgICAvLyBEaXJlY3RvcnkgZXhpc3RzIG9uIGRpc2sgYnV0IGdpdCBkb2Vzbid0IHRyYWNrIGl0IFx1MjAxNCBpdCdzIHN0YWxlLlxuICAgIGF3YWl0IGZzLnJtKHdvcmt0cmVlRGlyLCB7IHJlY3Vyc2l2ZTogdHJ1ZSB9KTtcbiAgICBhd2FpdCBleGVjRmlsZUFzeW5jKCdnaXQnLCBbJ3dvcmt0cmVlJywgJ3BydW5lJ10sIHsgY3dkOiByZXBvUm9vdCwgdGltZW91dDogMzBfMDAwIH0pO1xuICB9IGNhdGNoIChlcnJvcjogdW5rbm93bikge1xuICAgIGlmICgoZXJyb3IgYXMgTm9kZUpTLkVycm5vRXhjZXB0aW9uKS5jb2RlICE9PSAnRU5PRU5UJykge1xuICAgICAgdGhyb3cgZXJyb3I7XG4gICAgfVxuICAgIC8vIEVOT0VOVDogZGlyZWN0b3J5IGRvZXNuJ3QgZXhpc3Qgb24gZGlzayBcdTIwMTQgbm90aGluZyB0byBjbGVhbiB1cC5cbiAgfVxuXG4gIGF3YWl0IGFkZFdvcmt0cmVlKHsgcmVwb1Jvb3QsIHdvcmt0cmVlRGlyLCBicmFuY2hOYW1lLCBicmFuY2hFeGlzdHMsIHN0YXJ0UG9pbnQgfSk7XG5cbiAgY29uc3QgaWdub3JlZCA9IGF3YWl0IGRpc2NvdmVySWdub3JlZFBhdGhzKHNvdXJjZVJvb3QpO1xuICBhd2FpdCBjb3B5RXhpc3RpbmdTeW1saW5rcyhzb3VyY2VSb290LCB3b3JrdHJlZURpcik7XG4gIGF3YWl0IHN5bWxpbmtJZ25vcmVkUGF0aHMoeyBzb3VyY2VSb290LCB3b3JrdHJlZURpciwgaWdub3JlZCB9KTtcblxuICBjb25zdCByZXJvdXRlZENvdW50ID0gYXdhaXQgcmVyb3V0ZUFsbE5vZGVNb2R1bGVzKHsgc291cmNlUm9vdCwgd29ya3RyZWVEaXIsIHJlcG9Sb290IH0pO1xuXG4gIGNvbnN0IFssIGJhc2VTaGFdID0gYXdhaXQgUHJvbWlzZS5hbGwoW1xuICAgIHVwZGF0ZUdpdEV4Y2x1ZGUoeyB3b3JrdHJlZURpciwgcmVwb1Jvb3QsIGRpcmVjdG9yaWVzOiBpZ25vcmVkLmRpcmVjdG9yaWVzLCBmaWxlczogaWdub3JlZC5maWxlcyB9KSxcbiAgICByZXNvbHZlSGVhZCh3b3JrdHJlZURpcilcbiAgXSk7XG5cbiAgY29uc3QgcmVzdWx0OiBDcmVhdGVXb3JrdHJlZVJlc3VsdCA9IHtcbiAgICBicmFuY2g6IGJyYW5jaE5hbWUsXG4gICAgd29ya3RyZWU6IHdvcmt0cmVlRGlyLFxuICAgIGJhc2VTaGFcbiAgfTtcblxuICBpZiAocmVyb3V0ZWRDb3VudCA+IDApIHtcbiAgICByZXN1bHQucmVyb3V0ZWRTeW1saW5rcyA9IHJlcm91dGVkQ291bnQ7XG4gIH1cblxuICByZXR1cm4gcmVzdWx0O1xufVxuXG5pbnRlcmZhY2UgR2l0Um9vdHMge1xuICBzb3VyY2VSb290OiBzdHJpbmc7XG4gIHJlcG9Sb290OiBzdHJpbmc7XG59XG5cbi8qKlxuICogTG9jYXRlcyB0aGUgY3VycmVudCBnaXQgc291cmNlIHJvb3QgYW5kIHByaW1hcnkgcmVwb3NpdG9yeSByb290LlxuICpcbiAqIFN1cHBvcnRzIGJvdGggc3RhbmRhcmQgY2hlY2tvdXRzIChgLmdpdGAgZGlyZWN0b3J5KSBhbmQgd29ya3RyZWUgY2hlY2tvdXRzXG4gKiAoYC5naXRgIGZpbGUgcG9pbnRpbmcgaW50byBgLmdpdC93b3JrdHJlZXMvLi4uYCkuXG4gKlxuICogQHBhcmFtIHN0YXJ0RGlyIC0gRGlyZWN0b3J5IHdoZXJlIHVwd2FyZCBzZWFyY2ggYmVnaW5zLlxuICogQHRocm93cyB7RXJyb3J9IFdoZW4gbm8gZ2l0IHJlcG9zaXRvcnkgbWFya2VyIGlzIGZvdW5kLlxuICogQHJldHVybnMgUGF0aHMgZm9yIHRoZSBjdXJyZW50IGNoZWNrb3V0IHJvb3QgYW5kIHRoZSBwcmltYXJ5IHJlcG8gcm9vdC5cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGZpbmRHaXRSb290cyhzdGFydERpcjogc3RyaW5nKTogUHJvbWlzZTxHaXRSb290cz4ge1xuICBsZXQgY3VycmVudERpciA9IHBhdGgucmVzb2x2ZShzdGFydERpcik7XG4gIHdoaWxlIChjdXJyZW50RGlyICE9PSAnLycpIHtcbiAgICBjb25zdCBnaXRQYXRoID0gcGF0aC5qb2luKGN1cnJlbnREaXIsICcuZ2l0Jyk7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHN0YXRzID0gYXdhaXQgZnMubHN0YXQoZ2l0UGF0aCk7XG4gICAgICBpZiAoc3RhdHMuaXNEaXJlY3RvcnkoKSkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgIHNvdXJjZVJvb3Q6IGN1cnJlbnREaXIsXG4gICAgICAgICAgcmVwb1Jvb3Q6IGN1cnJlbnREaXJcbiAgICAgICAgfTtcbiAgICAgIH1cbiAgICAgIGlmIChzdGF0cy5pc0ZpbGUoKSkge1xuICAgICAgICBjb25zdCBnaXRGaWxlQ29udGVudCA9IGF3YWl0IGZzLnJlYWRGaWxlKGdpdFBhdGgsICd1dGYtOCcpO1xuICAgICAgICBjb25zdCBnaXRkaXJMaW5lID0gZ2l0RmlsZUNvbnRlbnQudHJpbSgpO1xuICAgICAgICBjb25zdCBnaXRkaXJQYXRoID0gZ2l0ZGlyTGluZS5yZXBsYWNlKC9eZ2l0ZGlyOlxccyovLCAnJyk7XG4gICAgICAgIGNvbnN0IG1haW5HaXREaXIgPSBnaXRkaXJQYXRoLnJlcGxhY2UoL1xcL3dvcmt0cmVlc1xcL1teL10rJC8sICcnKTtcbiAgICAgICAgY29uc3QgcmVwb1Jvb3QgPSBtYWluR2l0RGlyLnJlcGxhY2UoL1xcL1xcLmdpdCQvLCAnJyk7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgc291cmNlUm9vdDogY3VycmVudERpcixcbiAgICAgICAgICByZXBvUm9vdFxuICAgICAgICB9O1xuICAgICAgfVxuICAgIH0gY2F0Y2ggKGVycm9yOiB1bmtub3duKSB7XG4gICAgICBpZiAoKGVycm9yIGFzIE5vZGVKUy5FcnJub0V4Y2VwdGlvbikuY29kZSAhPT0gJ0VOT0VOVCcpIHtcbiAgICAgICAgdGhyb3cgZXJyb3I7XG4gICAgICB9XG4gICAgfVxuICAgIGN1cnJlbnREaXIgPSBwYXRoLmRpcm5hbWUoY3VycmVudERpcik7XG4gIH1cbiAgdGhyb3cgbmV3IEVycm9yKCdOb3QgaW4gYSBnaXQgcmVwb3NpdG9yeScpO1xufVxuXG4vKipcbiAqIFJlc29sdmVzIHRoZSBIRUFEIGNvbW1pdCBTSEEgZm9yIGEgcmVwb3NpdG9yeSBkaXJlY3RvcnkuXG4gKlxuICogQHBhcmFtIGN3ZCAtIFJlcG9zaXRvcnkgZGlyZWN0b3J5IHBhc3NlZCB0byBgZ2l0IHJldi1wYXJzZSBIRUFEYC5cbiAqIEByZXR1cm5zIFRyaW1tZWQgY29tbWl0IFNIQSBzdHJpbmcuXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiByZXNvbHZlSGVhZChjd2Q6IHN0cmluZyk6IFByb21pc2U8c3RyaW5nPiB7XG4gIGNvbnN0IHsgc3Rkb3V0IH0gPSBhd2FpdCBleGVjRmlsZUFzeW5jKCdnaXQnLCBbJ3Jldi1wYXJzZScsICdIRUFEJ10sIHsgY3dkLCB0aW1lb3V0OiA1XzAwMCB9KTtcbiAgcmV0dXJuIHN0ZG91dC50cmltKCk7XG59XG5cbi8qKlxuICogQ2hlY2tzIHdoZXRoZXIgYSB3b3JrdHJlZSBwYXRoIGlzIGFscmVhZHkgcmVnaXN0ZXJlZCB3aXRoIGdpdC5cbiAqXG4gKiBAcGFyYW0gcmVwb1Jvb3QgLSBQcmltYXJ5IHJlcG9zaXRvcnkgcm9vdCB3aGVyZSBnaXQgY29tbWFuZHMgcnVuLlxuICogQHBhcmFtIHdvcmt0cmVlRGlyIC0gQWJzb2x1dGUgd29ya3RyZWUgcGF0aCBiZWluZyBjcmVhdGVkLlxuICogQHJldHVybnMgVHJ1ZSB3aGVuIGBnaXQgd29ya3RyZWUgbGlzdGAgYWxyZWFkeSBjb250YWlucyBgd29ya3RyZWVEaXJgLlxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gY2hlY2tXb3JrdHJlZUV4aXN0cyhyZXBvUm9vdDogc3RyaW5nLCB3b3JrdHJlZURpcjogc3RyaW5nKTogUHJvbWlzZTxib29sZWFuPiB7XG4gIGNvbnN0IHsgc3Rkb3V0IH0gPSBhd2FpdCBleGVjRmlsZUFzeW5jKCdnaXQnLCBbJ3dvcmt0cmVlJywgJ2xpc3QnXSwgeyBjd2Q6IHJlcG9Sb290LCB0aW1lb3V0OiAzMF8wMDAgfSk7XG4gIHJldHVybiBzdGRvdXQuaW5jbHVkZXMod29ya3RyZWVEaXIpO1xufVxuXG4vKipcbiAqIENoZWNrcyB3aGV0aGVyIGEgYnJhbmNoIGFscmVhZHkgZXhpc3RzIGluIHRoZSByZXBvc2l0b3J5LlxuICpcbiAqIEBwYXJhbSByZXBvUm9vdCAtIFByaW1hcnkgcmVwb3NpdG9yeSByb290IHdoZXJlIGdpdCBjb21tYW5kcyBydW4uXG4gKiBAcGFyYW0gYnJhbmNoTmFtZSAtIEJyYW5jaCBuYW1lIHRvIHF1ZXJ5LlxuICogQHJldHVybnMgVHJ1ZSB3aGVuIGF0IGxlYXN0IG9uZSBtYXRjaGluZyBsb2NhbCBicmFuY2ggaXMgbGlzdGVkLlxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gY2hlY2tCcmFuY2hFeGlzdHMocmVwb1Jvb3Q6IHN0cmluZywgYnJhbmNoTmFtZTogc3RyaW5nKTogUHJvbWlzZTxib29sZWFuPiB7XG4gIGNvbnN0IHsgc3Rkb3V0IH0gPSBhd2FpdCBleGVjRmlsZUFzeW5jKCdnaXQnLCBbJ2JyYW5jaCcsICctLWxpc3QnLCBicmFuY2hOYW1lXSwge1xuICAgIGN3ZDogcmVwb1Jvb3QsXG4gICAgdGltZW91dDogMzBfMDAwXG4gIH0pO1xuICByZXR1cm4gc3Rkb3V0LnRyaW0oKS5sZW5ndGggPiAwO1xufVxuXG5pbnRlcmZhY2UgQWRkV29ya3RyZWVPcHRpb25zIHtcbiAgcmVwb1Jvb3Q6IHN0cmluZztcbiAgd29ya3RyZWVEaXI6IHN0cmluZztcbiAgYnJhbmNoTmFtZTogc3RyaW5nO1xuICBicmFuY2hFeGlzdHM6IGJvb2xlYW47XG4gIHN0YXJ0UG9pbnQ6IHN0cmluZztcbn1cblxuLyoqXG4gKiBBZGRzIGEgZ2l0IHdvcmt0cmVlLCBjcmVhdGluZyB0aGUgYnJhbmNoIHdoZW4gbmVlZGVkLlxuICpcbiAqIFVzZXMgYGdpdCB3b3JrdHJlZSBhZGQgLWJgIGZvciBuZXcgYnJhbmNoZXMgYW5kIHBsYWluIGBnaXQgd29ya3RyZWUgYWRkYFxuICogd2hlbiBhdHRhY2hpbmcgdG8gYW4gZXhpc3RpbmcgYnJhbmNoLlxuICpcbiAqIEBwYXJhbSBvcHRzIC0gV29ya3RyZWUgY3JlYXRpb24gb3B0aW9ucyBhbmQgYnJhbmNoIGV4aXN0ZW5jZSBzdGF0ZS5cbiAqIEByZXR1cm5zIE5vIHZhbHVlLlxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gYWRkV29ya3RyZWUob3B0czogQWRkV29ya3RyZWVPcHRpb25zKTogUHJvbWlzZTx2b2lkPiB7XG4gIGNvbnN0IGFyZ3MgPSBvcHRzLmJyYW5jaEV4aXN0c1xuICAgID8gWyd3b3JrdHJlZScsICdhZGQnLCBvcHRzLndvcmt0cmVlRGlyLCBvcHRzLmJyYW5jaE5hbWVdXG4gICAgOiBbJ3dvcmt0cmVlJywgJ2FkZCcsICctYicsIG9wdHMuYnJhbmNoTmFtZSwgb3B0cy53b3JrdHJlZURpciwgb3B0cy5zdGFydFBvaW50XTtcbiAgYXdhaXQgZXhlY0ZpbGVBc3luYygnZ2l0JywgYXJncywgeyBjd2Q6IG9wdHMucmVwb1Jvb3QsIHRpbWVvdXQ6IDMwXzAwMCB9KTtcbn1cblxuaW50ZXJmYWNlIElnbm9yZWRQYXRocyB7XG4gIGRpcmVjdG9yaWVzOiBzdHJpbmdbXTtcbiAgZmlsZXM6IHN0cmluZ1tdO1xufVxuXG4vKipcbiAqIERpc2NvdmVycyBpZ25vcmVkIGZpbGVzIGFuZCBkaXJlY3RvcmllcyB1bmRlciBhIHNvdXJjZSByb290LlxuICpcbiAqIFBhdGhzIGFyZSByZXR1cm5lZCByZWxhdGl2ZSB0byBgc291cmNlUm9vdGAgYW5kIGAud29ya3RyZWVzYCBjb250ZW50IGlzXG4gKiBmaWx0ZXJlZCBvdXQgdG8gYXZvaWQgc2VsZi1yZWZlcmVudGlhbCBzeW1saW5raW5nLlxuICpcbiAqIEBwYXJhbSBzb3VyY2VSb290IC0gU291cmNlIGNoZWNrb3V0IHJvb3QgdXNlZCBmb3IgZ2l0IGRpc2NvdmVyeS5cbiAqIEByZXR1cm5zIFNlcGFyYXRlIGxpc3RzIG9mIGlnbm9yZWQgZGlyZWN0b3JpZXMgYW5kIGlnbm9yZWQgZmlsZXMuXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBkaXNjb3Zlcklnbm9yZWRQYXRocyhzb3VyY2VSb290OiBzdHJpbmcpOiBQcm9taXNlPElnbm9yZWRQYXRocz4ge1xuICBjb25zdCB7IHN0ZG91dCB9ID0gYXdhaXQgZXhlY0ZpbGVBc3luYyhcbiAgICAnZ2l0JyxcbiAgICBbJy1DJywgc291cmNlUm9vdCwgJ2xzLWZpbGVzJywgJy0taWdub3JlZCcsICctLWV4Y2x1ZGUtc3RhbmRhcmQnLCAnLS1kaXJlY3RvcnknLCAnLS1vdGhlcnMnXSxcbiAgICB7IGN3ZDogc291cmNlUm9vdCwgdGltZW91dDogMzBfMDAwIH1cbiAgKTtcblxuICBjb25zdCBsaW5lcyA9IHN0ZG91dC5zcGxpdCgnXFxuJykuZmlsdGVyKChsaW5lKSA9PiBsaW5lLmxlbmd0aCA+IDAgJiYgIWxpbmUuc3RhcnRzV2l0aCgnLndvcmt0cmVlcycpKTtcbiAgY29uc3QgZGlyZWN0b3JpZXMgPSBsaW5lcy5maWx0ZXIoKGwpID0+IGwuZW5kc1dpdGgoJy8nKSkubWFwKChsKSA9PiBsLnNsaWNlKDAsIC0xKSk7XG4gIGNvbnN0IGZpbGVzID0gbGluZXMuZmlsdGVyKChsKSA9PiAhbC5lbmRzV2l0aCgnLycpKTtcblxuICByZXR1cm4geyBkaXJlY3RvcmllcywgZmlsZXMgfTtcbn1cblxuaW50ZXJmYWNlIFN5bWxpbmtJZ25vcmVkUGF0aHNPcHRpb25zIHtcbiAgc291cmNlUm9vdDogc3RyaW5nO1xuICB3b3JrdHJlZURpcjogc3RyaW5nO1xuICBpZ25vcmVkOiBJZ25vcmVkUGF0aHM7XG59XG5cbmludGVyZmFjZSBTeW1saW5rSWdub3JlZFBhdGhzUmVzdWx0IHtcbiAgZGlyQ291bnQ6IG51bWJlcjtcbiAgZmlsZUNvdW50OiBudW1iZXI7XG59XG5cbi8qKlxuICogU3ltbGlua3MgaWdub3JlZCBkaXJlY3RvcmllcyBhbmQgZmlsZXMgZnJvbSBzb3VyY2UgY2hlY2tvdXQgaW50byBhIHdvcmt0cmVlLlxuICpcbiAqIE5lc3RlZCBpZ25vcmVkIGRpcmVjdG9yaWVzIGFyZSBjb2xsYXBzZWQgc28gb25seSB0b3AtbGV2ZWwgaWdub3JlZCBkaXJlY3RvcnlcbiAqIGxpbmtzIGFyZSBjcmVhdGVkLlxuICpcbiAqIEBwYXJhbSBvcHRzIC0gU291cmNlIHJvb3QsIGRlc3RpbmF0aW9uIHdvcmt0cmVlLCBhbmQgaWdub3JlZCBwYXRoIGxpc3RzLlxuICogQHJldHVybnMgQ291bnRzIG9mIHN1Y2Nlc3NmdWxseSBjcmVhdGVkIGRpcmVjdG9yeSBhbmQgZmlsZSBzeW1saW5rcy5cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHN5bWxpbmtJZ25vcmVkUGF0aHMob3B0czogU3ltbGlua0lnbm9yZWRQYXRoc09wdGlvbnMpOiBQcm9taXNlPFN5bWxpbmtJZ25vcmVkUGF0aHNSZXN1bHQ+IHtcbiAgY29uc3QgeyBzb3VyY2VSb290LCB3b3JrdHJlZURpciwgaWdub3JlZCB9ID0gb3B0cztcbiAgY29uc3QgZGlyU2V0ID0gbmV3IFNldChpZ25vcmVkLmRpcmVjdG9yaWVzKTtcbiAgY29uc3Qgbm9uTmVzdGVkRGlycyA9IGlnbm9yZWQuZGlyZWN0b3JpZXMuZmlsdGVyKChkaXIpID0+ICFpc05lc3RlZFVuZGVyKGRpciwgZGlyU2V0KSk7XG5cbiAgY29uc3QgY3JlYXRlRGlyU3ltbGluayA9IGFzeW5jIChkaXI6IHN0cmluZyk6IFByb21pc2U8Ym9vbGVhbj4gPT4ge1xuICAgIHRyeSB7XG4gICAgICBjb25zdCBzb3VyY2VQYXRoID0gcGF0aC5qb2luKHNvdXJjZVJvb3QsIGRpcik7XG4gICAgICB0cnkge1xuICAgICAgICBhd2FpdCBmcy5sc3RhdChzb3VyY2VQYXRoKTtcbiAgICAgIH0gY2F0Y2ggKGVycm9yOiB1bmtub3duKSB7XG4gICAgICAgIGlmICgoZXJyb3IgYXMgTm9kZUpTLkVycm5vRXhjZXB0aW9uKS5jb2RlID09PSAnRU5PRU5UJykge1xuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBwcm9jZXNzLnN0ZGVyci53cml0ZShcbiAgICAgICAgICBgY3JlYXRlLXdvcmt0cmVlOiB1bmV4cGVjdGVkIGVycm9yIGluIGxzdGF0OiAke2Vycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogU3RyaW5nKGVycm9yKX1cXG5gXG4gICAgICAgICk7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IGRlc3RQYXRoID0gcGF0aC5qb2luKHdvcmt0cmVlRGlyLCBkaXIpO1xuICAgICAgY29uc3QgcGFyZW50RGlyID0gcGF0aC5kaXJuYW1lKGRpcik7XG4gICAgICBpZiAocGFyZW50RGlyICE9PSAnLicpIHtcbiAgICAgICAgYXdhaXQgZnMubWtkaXIocGF0aC5qb2luKHdvcmt0cmVlRGlyLCBwYXJlbnREaXIpLCB7IHJlY3Vyc2l2ZTogdHJ1ZSB9KTtcbiAgICAgIH1cbiAgICAgIGF3YWl0IGZzLnN5bWxpbmsoc291cmNlUGF0aCwgZGVzdFBhdGgpO1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSBjYXRjaCAoZXJyb3I6IHVua25vd24pIHtcbiAgICAgIGNvbnN0IGNvZGUgPSAoZXJyb3IgYXMgTm9kZUpTLkVycm5vRXhjZXB0aW9uKS5jb2RlO1xuICAgICAgaWYgKGNvZGUgPT09ICdFRVhJU1QnIHx8IGNvZGUgPT09ICdFTk9FTlQnKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICAgIHByb2Nlc3Muc3RkZXJyLndyaXRlKFxuICAgICAgICBgY3JlYXRlLXdvcmt0cmVlOiB1bmV4cGVjdGVkIGVycm9yIGluIHN5bWxpbms6ICR7ZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiBTdHJpbmcoZXJyb3IpfVxcbmBcbiAgICAgICk7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICB9O1xuXG4gIGNvbnN0IGNyZWF0ZUZpbGVTeW1saW5rID0gYXN5bmMgKGZpbGU6IHN0cmluZyk6IFByb21pc2U8Ym9vbGVhbj4gPT4ge1xuICAgIHRyeSB7XG4gICAgICBjb25zdCBzb3VyY2VQYXRoID0gcGF0aC5qb2luKHNvdXJjZVJvb3QsIGZpbGUpO1xuICAgICAgdHJ5IHtcbiAgICAgICAgYXdhaXQgZnMubHN0YXQoc291cmNlUGF0aCk7XG4gICAgICB9IGNhdGNoIChlcnJvcjogdW5rbm93bikge1xuICAgICAgICBpZiAoKGVycm9yIGFzIE5vZGVKUy5FcnJub0V4Y2VwdGlvbikuY29kZSA9PT0gJ0VOT0VOVCcpIHtcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgcHJvY2Vzcy5zdGRlcnIud3JpdGUoXG4gICAgICAgICAgYGNyZWF0ZS13b3JrdHJlZTogdW5leHBlY3RlZCBlcnJvciBpbiBsc3RhdDogJHtlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6IFN0cmluZyhlcnJvcil9XFxuYFxuICAgICAgICApO1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgICBjb25zdCBkZXN0UGF0aCA9IHBhdGguam9pbih3b3JrdHJlZURpciwgZmlsZSk7XG4gICAgICBjb25zdCBwYXJlbnREaXIgPSBwYXRoLmRpcm5hbWUoZmlsZSk7XG4gICAgICBpZiAocGFyZW50RGlyICE9PSAnLicpIHtcbiAgICAgICAgYXdhaXQgZnMubWtkaXIocGF0aC5qb2luKHdvcmt0cmVlRGlyLCBwYXJlbnREaXIpLCB7IHJlY3Vyc2l2ZTogdHJ1ZSB9KTtcbiAgICAgIH1cbiAgICAgIGF3YWl0IGZzLnN5bWxpbmsoc291cmNlUGF0aCwgZGVzdFBhdGgpO1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSBjYXRjaCAoZXJyb3I6IHVua25vd24pIHtcbiAgICAgIGNvbnN0IGNvZGUgPSAoZXJyb3IgYXMgTm9kZUpTLkVycm5vRXhjZXB0aW9uKS5jb2RlO1xuICAgICAgaWYgKGNvZGUgPT09ICdFRVhJU1QnIHx8IGNvZGUgPT09ICdFTk9FTlQnKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICAgIHByb2Nlc3Muc3RkZXJyLndyaXRlKFxuICAgICAgICBgY3JlYXRlLXdvcmt0cmVlOiB1bmV4cGVjdGVkIGVycm9yIGluIHN5bWxpbms6ICR7ZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiBTdHJpbmcoZXJyb3IpfVxcbmBcbiAgICAgICk7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICB9O1xuXG4gIGNvbnN0IGRpclJlc3VsdHMgPSBhd2FpdCBQcm9taXNlLmFsbChub25OZXN0ZWREaXJzLm1hcChjcmVhdGVEaXJTeW1saW5rKSk7XG4gIGNvbnN0IG5vbk5lc3RlZEZpbGVzID0gaWdub3JlZC5maWxlcy5maWx0ZXIoKGZpbGUpID0+ICFpc05lc3RlZFVuZGVyKGZpbGUsIGRpclNldCkpO1xuICBjb25zdCBmaWxlUmVzdWx0cyA9IGF3YWl0IFByb21pc2UuYWxsKG5vbk5lc3RlZEZpbGVzLm1hcChjcmVhdGVGaWxlU3ltbGluaykpO1xuXG4gIGNvbnN0IGRpckNvdW50ID0gZGlyUmVzdWx0cy5maWx0ZXIoKHIpID0+IHIpLmxlbmd0aDtcbiAgY29uc3QgZmlsZUNvdW50ID0gZmlsZVJlc3VsdHMuZmlsdGVyKChyKSA9PiByKS5sZW5ndGg7XG5cbiAgcmV0dXJuIHsgZGlyQ291bnQsIGZpbGVDb3VudCB9O1xufVxuXG4vKipcbiAqIFJlcGxpY2F0ZXMgcm9vdC1sZXZlbCBzeW1saW5rcyBmcm9tIHRoZSBzb3VyY2UgY2hlY2tvdXQgaW50byB0aGUgd29ya3RyZWUuXG4gKlxuICogRXhpc3RpbmcgZGVzdGluYXRpb24gZW50cmllcyBhcmUgbGVmdCB1bnRvdWNoZWQuXG4gKlxuICogQHBhcmFtIHNvdXJjZVJvb3QgLSBTb3VyY2UgY2hlY2tvdXQgcm9vdC5cbiAqIEBwYXJhbSB3b3JrdHJlZURpciAtIERlc3RpbmF0aW9uIHdvcmt0cmVlIHJvb3QuXG4gKiBAcmV0dXJucyBOdW1iZXIgb2Ygc3ltbGlua3MgY3JlYXRlZCBpbiB0aGUgZGVzdGluYXRpb24gcm9vdC5cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGNvcHlFeGlzdGluZ1N5bWxpbmtzKHNvdXJjZVJvb3Q6IHN0cmluZywgd29ya3RyZWVEaXI6IHN0cmluZyk6IFByb21pc2U8bnVtYmVyPiB7XG4gIGNvbnN0IGVudHJpZXMgPSBhd2FpdCBmcy5yZWFkZGlyKHNvdXJjZVJvb3QsIHsgd2l0aEZpbGVUeXBlczogdHJ1ZSB9KTtcbiAgY29uc3Qgc3ltbGlua3MgPSBlbnRyaWVzLmZpbHRlcigoZSkgPT4gZS5pc1N5bWJvbGljTGluaygpICYmIGUubmFtZSAhPT0gJy5naXQnICYmIGUubmFtZSAhPT0gJy53b3JrdHJlZXMnKTtcblxuICBjb25zdCBjb3B5U3ltbGluayA9IGFzeW5jIChuYW1lOiBzdHJpbmcpOiBQcm9taXNlPGJvb2xlYW4+ID0+IHtcbiAgICBjb25zdCBkZXN0UGF0aCA9IHBhdGguam9pbih3b3JrdHJlZURpciwgbmFtZSk7XG4gICAgdHJ5IHtcbiAgICAgIGF3YWl0IGZzLmxzdGF0KGRlc3RQYXRoKTtcbiAgICAgIHJldHVybiBmYWxzZTsgLy8gRGVzdGluYXRpb24gYWxyZWFkeSBleGlzdHNcbiAgICB9IGNhdGNoIChlcnJvcjogdW5rbm93bikge1xuICAgICAgaWYgKChlcnJvciBhcyBOb2RlSlMuRXJybm9FeGNlcHRpb24pLmNvZGUgIT09ICdFTk9FTlQnKSB7XG4gICAgICAgIHRocm93IGVycm9yO1xuICAgICAgfVxuICAgIH1cbiAgICBjb25zdCBzb3VyY2VMaW5rUGF0aCA9IHBhdGguam9pbihzb3VyY2VSb290LCBuYW1lKTtcblxuICAgIC8vIFNraXAgc2VsZi1yZWZlcmVuY2luZyBzeW1saW5rcyAodGFyZ2V0IHJlc29sdmVzIGJhY2sgdG8gdGhlIHN5bWxpbmsgaXRzZWxmKVxuICAgIGNvbnN0IHRhcmdldCA9IGF3YWl0IGZzLnJlYWRsaW5rKHNvdXJjZUxpbmtQYXRoKTtcbiAgICBjb25zdCByZXNvbHZlZFRhcmdldCA9IHBhdGgucmVzb2x2ZShzb3VyY2VSb290LCB0YXJnZXQpO1xuICAgIGlmIChyZXNvbHZlZFRhcmdldCA9PT0gc291cmNlTGlua1BhdGgpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICBhd2FpdCBmcy5zeW1saW5rKHNvdXJjZUxpbmtQYXRoLCBkZXN0UGF0aCk7XG4gICAgcmV0dXJuIHRydWU7XG4gIH07XG5cbiAgY29uc3QgcmVzdWx0cyA9IGF3YWl0IFByb21pc2UuYWxsKHN5bWxpbmtzLm1hcCgoZSkgPT4gY29weVN5bWxpbmsoZS5uYW1lKSkpO1xuICByZXR1cm4gcmVzdWx0cy5maWx0ZXIoKHIpID0+IHIpLmxlbmd0aDtcbn1cblxuaW50ZXJmYWNlIFJlcm91dGVOb2RlTW9kdWxlc09wdGlvbnMge1xuICBzb3VyY2VOb2RlTW9kdWxlczogc3RyaW5nO1xuICBkZXN0Tm9kZU1vZHVsZXM6IHN0cmluZztcbn1cblxuLyoqXG4gKiBNaXJyb3JzIGEgbm9kZV9tb2R1bGVzIHRyZWUgaW50byB0aGUgd29ya3RyZWUgdXNpbmcgc3ltbGlua3MuXG4gKlxuICogSW50ZXJuYWwgd29ya3NwYWNlIGxpbmtzIGtlZXAgdGhlaXIgb3JpZ2luYWwgcmVsYXRpdmUgdGFyZ2V0cyB3aGlsZSBleHRlcm5hbFxuICogbGlua3MgYW5kIG5vbi1saW5rIGVudHJpZXMgYXJlIHJlcHJlc2VudGVkIGFzIHN5bWxpbmtzIHRvIHNvdXJjZSBwYXRocy5cbiAqXG4gKiBAcGFyYW0gb3B0cyAtIFNvdXJjZSBhbmQgZGVzdGluYXRpb24gbm9kZV9tb2R1bGVzIGRpcmVjdG9yaWVzLlxuICogQHJldHVybnMgQ291bnQgb2YgaW50ZXJuYWwgd29ya3NwYWNlIHN5bWxpbmtzIHJlY3JlYXRlZCBieSB0YXJnZXQgcGF0aC5cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHJlcm91dGVOb2RlTW9kdWxlcyhvcHRzOiBSZXJvdXRlTm9kZU1vZHVsZXNPcHRpb25zKTogUHJvbWlzZTxudW1iZXI+IHtcbiAgY29uc3QgeyBzb3VyY2VOb2RlTW9kdWxlcywgZGVzdE5vZGVNb2R1bGVzIH0gPSBvcHRzO1xuXG4gIHRyeSB7XG4gICAgYXdhaXQgZnMubHN0YXQoc291cmNlTm9kZU1vZHVsZXMpO1xuICB9IGNhdGNoIChlcnJvcjogdW5rbm93bikge1xuICAgIGlmICgoZXJyb3IgYXMgTm9kZUpTLkVycm5vRXhjZXB0aW9uKS5jb2RlID09PSAnRU5PRU5UJykge1xuICAgICAgcmV0dXJuIDA7XG4gICAgfVxuICAgIHRocm93IGVycm9yO1xuICB9XG5cbiAgdHJ5IHtcbiAgICBjb25zdCBkZXN0U3RhdHMgPSBhd2FpdCBmcy5sc3RhdChkZXN0Tm9kZU1vZHVsZXMpO1xuICAgIGlmIChkZXN0U3RhdHMuaXNTeW1ib2xpY0xpbmsoKSkge1xuICAgICAgYXdhaXQgZnMudW5saW5rKGRlc3ROb2RlTW9kdWxlcyk7XG4gICAgfVxuICB9IGNhdGNoIChlcnJvcjogdW5rbm93bikge1xuICAgIGlmICgoZXJyb3IgYXMgTm9kZUpTLkVycm5vRXhjZXB0aW9uKS5jb2RlICE9PSAnRU5PRU5UJykge1xuICAgICAgdGhyb3cgZXJyb3I7XG4gICAgfVxuICB9XG5cbiAgYXdhaXQgZnMubWtkaXIoZGVzdE5vZGVNb2R1bGVzLCB7IHJlY3Vyc2l2ZTogdHJ1ZSB9KTtcblxuICBjb25zdCBlbnRyaWVzID0gYXdhaXQgZnMucmVhZGRpcihzb3VyY2VOb2RlTW9kdWxlcywgeyB3aXRoRmlsZVR5cGVzOiB0cnVlIH0pO1xuICBjb25zdCBjb3VudHMgPSBhd2FpdCBQcm9taXNlLmFsbChcbiAgICBlbnRyaWVzLm1hcChhc3luYyAoZW50cnkpOiBQcm9taXNlPG51bWJlcj4gPT4ge1xuICAgICAgY29uc3Qgc291cmNlUGF0aCA9IHBhdGguam9pbihzb3VyY2VOb2RlTW9kdWxlcywgZW50cnkubmFtZSk7XG4gICAgICBjb25zdCBkZXN0UGF0aCA9IHBhdGguam9pbihkZXN0Tm9kZU1vZHVsZXMsIGVudHJ5Lm5hbWUpO1xuXG4gICAgICBpZiAoZW50cnkuaXNTeW1ib2xpY0xpbmsoKSkge1xuICAgICAgICBjb25zdCB0YXJnZXQgPSBhd2FpdCBmcy5yZWFkbGluayhzb3VyY2VQYXRoKTtcbiAgICAgICAgaWYgKGlzSW50ZXJuYWxTeW1saW5rKHRhcmdldCkpIHtcbiAgICAgICAgICBhd2FpdCBmcy5zeW1saW5rKHRhcmdldCwgZGVzdFBhdGgpO1xuICAgICAgICAgIHJldHVybiAxO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGF3YWl0IGZzLnN5bWxpbmsoc291cmNlUGF0aCwgZGVzdFBhdGgpO1xuICAgICAgICAgIHJldHVybiAwO1xuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYgKGVudHJ5LmlzRGlyZWN0b3J5KCkgJiYgZW50cnkubmFtZS5zdGFydHNXaXRoKCdAJykpIHtcbiAgICAgICAgYXdhaXQgZnMubWtkaXIoZGVzdFBhdGgsIHsgcmVjdXJzaXZlOiB0cnVlIH0pO1xuICAgICAgICBjb25zdCBzY29wZUVudHJpZXMgPSBhd2FpdCBmcy5yZWFkZGlyKHNvdXJjZVBhdGgsIHsgd2l0aEZpbGVUeXBlczogdHJ1ZSB9KTtcbiAgICAgICAgY29uc3Qgc2NvcGVDb3VudHMgPSBhd2FpdCBQcm9taXNlLmFsbChcbiAgICAgICAgICBzY29wZUVudHJpZXMubWFwKGFzeW5jIChzY29wZUVudHJ5KTogUHJvbWlzZTxudW1iZXI+ID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHNjb3BlU291cmNlUGF0aCA9IHBhdGguam9pbihzb3VyY2VQYXRoLCBzY29wZUVudHJ5Lm5hbWUpO1xuICAgICAgICAgICAgY29uc3Qgc2NvcGVEZXN0UGF0aCA9IHBhdGguam9pbihkZXN0UGF0aCwgc2NvcGVFbnRyeS5uYW1lKTtcblxuICAgICAgICAgICAgaWYgKHNjb3BlRW50cnkuaXNTeW1ib2xpY0xpbmsoKSkge1xuICAgICAgICAgICAgICBjb25zdCB0YXJnZXQgPSBhd2FpdCBmcy5yZWFkbGluayhzY29wZVNvdXJjZVBhdGgpO1xuICAgICAgICAgICAgICBpZiAoaXNJbnRlcm5hbFN5bWxpbmsodGFyZ2V0KSkge1xuICAgICAgICAgICAgICAgIGF3YWl0IGZzLnN5bWxpbmsodGFyZ2V0LCBzY29wZURlc3RQYXRoKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gMTtcbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBhd2FpdCBmcy5zeW1saW5rKHNjb3BlU291cmNlUGF0aCwgc2NvcGVEZXN0UGF0aCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIDA7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIGF3YWl0IGZzLnN5bWxpbmsoc2NvcGVTb3VyY2VQYXRoLCBzY29wZURlc3RQYXRoKTtcbiAgICAgICAgICAgICAgcmV0dXJuIDA7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSlcbiAgICAgICAgKTtcbiAgICAgICAgcmV0dXJuIHNjb3BlQ291bnRzLnJlZHVjZSgoc3VtLCBjKSA9PiBzdW0gKyBjLCAwKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGF3YWl0IGZzLnN5bWxpbmsoc291cmNlUGF0aCwgZGVzdFBhdGgpO1xuICAgICAgICByZXR1cm4gMDtcbiAgICAgIH1cbiAgICB9KVxuICApO1xuXG4gIHJldHVybiBjb3VudHMucmVkdWNlKChzdW0sIGMpID0+IHN1bSArIGMsIDApO1xufVxuXG5pbnRlcmZhY2UgUmVyb3V0ZUFsbE5vZGVNb2R1bGVzT3B0aW9ucyB7XG4gIHNvdXJjZVJvb3Q6IHN0cmluZztcbiAgd29ya3RyZWVEaXI6IHN0cmluZztcbiAgcmVwb1Jvb3Q6IHN0cmluZztcbn1cblxuLyoqXG4gKiBSZXJvdXRlcyByb290IGFuZCBwZXItcGFja2FnZSBub2RlX21vZHVsZXMgZGlyZWN0b3JpZXMgaW50byB0aGUgd29ya3RyZWUuXG4gKlxuICogVGhlIG9wZXJhdGlvbiBpcyBza2lwcGVkIHdoZW4gdGhlIHJlcG9zaXRvcnkgaGFzIG5vIHdvcmtzcGFjZSBjb25maWd1cmF0aW9uLlxuICpcbiAqIEBwYXJhbSBvcHRzIC0gU291cmNlIHJvb3QsIGRlc3RpbmF0aW9uIHdvcmt0cmVlIHJvb3QsIGFuZCByZXBvIHJvb3QuXG4gKiBAcmV0dXJucyBUb3RhbCBudW1iZXIgb2YgcmVjcmVhdGVkIGludGVybmFsIHdvcmtzcGFjZSBzeW1saW5rcy5cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHJlcm91dGVBbGxOb2RlTW9kdWxlcyhvcHRzOiBSZXJvdXRlQWxsTm9kZU1vZHVsZXNPcHRpb25zKTogUHJvbWlzZTxudW1iZXI+IHtcbiAgY29uc3QgeyBzb3VyY2VSb290LCB3b3JrdHJlZURpciwgcmVwb1Jvb3QgfSA9IG9wdHM7XG5cbiAgbGV0IHBhY2thZ2VKc29uOiB7IHdvcmtzcGFjZXM/OiBzdHJpbmdbXSB9O1xuICB0cnkge1xuICAgIGNvbnN0IHBhY2thZ2VKc29uQ29udGVudCA9IGF3YWl0IGZzLnJlYWRGaWxlKHBhdGguam9pbihyZXBvUm9vdCwgJ3BhY2thZ2UuanNvbicpLCAndXRmLTgnKTtcbiAgICBwYWNrYWdlSnNvbiA9IEpTT04ucGFyc2UocGFja2FnZUpzb25Db250ZW50KTtcbiAgfSBjYXRjaCAoZXJyb3I6IHVua25vd24pIHtcbiAgICBpZiAoKGVycm9yIGFzIE5vZGVKUy5FcnJub0V4Y2VwdGlvbikuY29kZSA9PT0gJ0VOT0VOVCcpIHtcbiAgICAgIHJldHVybiAwO1xuICAgIH1cbiAgICB0aHJvdyBlcnJvcjtcbiAgfVxuXG4gIGlmICghcGFja2FnZUpzb24ud29ya3NwYWNlcykge1xuICAgIHJldHVybiAwO1xuICB9XG5cbiAgbGV0IHRvdGFsQ291bnQgPSAwO1xuXG4gIHRvdGFsQ291bnQgKz0gYXdhaXQgcmVyb3V0ZU5vZGVNb2R1bGVzKHtcbiAgICBzb3VyY2VOb2RlTW9kdWxlczogcGF0aC5qb2luKHNvdXJjZVJvb3QsICdub2RlX21vZHVsZXMnKSxcbiAgICBkZXN0Tm9kZU1vZHVsZXM6IHBhdGguam9pbih3b3JrdHJlZURpciwgJ25vZGVfbW9kdWxlcycpXG4gIH0pO1xuXG4gIGNvbnN0IHBhY2thZ2VzRGlyID0gcGF0aC5qb2luKHNvdXJjZVJvb3QsICdwYWNrYWdlcycpO1xuICB0cnkge1xuICAgIGNvbnN0IHBhY2thZ2VFbnRyaWVzID0gYXdhaXQgZnMucmVhZGRpcihwYWNrYWdlc0RpciwgeyB3aXRoRmlsZVR5cGVzOiB0cnVlIH0pO1xuICAgIGZvciAoY29uc3QgZW50cnkgb2YgcGFja2FnZUVudHJpZXMpIHtcbiAgICAgIGlmIChlbnRyeS5pc0RpcmVjdG9yeSgpKSB7XG4gICAgICAgIGNvbnN0IHBrZ05vZGVNb2R1bGVzID0gcGF0aC5qb2luKHBhY2thZ2VzRGlyLCBlbnRyeS5uYW1lLCAnbm9kZV9tb2R1bGVzJyk7XG4gICAgICAgIGxldCBub2RlTW9kdWxlc0V4aXN0cyA9IGZhbHNlO1xuICAgICAgICB0cnkge1xuICAgICAgICAgIGF3YWl0IGZzLmxzdGF0KHBrZ05vZGVNb2R1bGVzKTtcbiAgICAgICAgICBub2RlTW9kdWxlc0V4aXN0cyA9IHRydWU7XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yOiB1bmtub3duKSB7XG4gICAgICAgICAgaWYgKChlcnJvciBhcyBOb2RlSlMuRXJybm9FeGNlcHRpb24pLmNvZGUgIT09ICdFTk9FTlQnKSB7XG4gICAgICAgICAgICB0aHJvdyBlcnJvcjtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKG5vZGVNb2R1bGVzRXhpc3RzKSB7XG4gICAgICAgICAgY29uc3QgZGVzdFBhY2thZ2VEaXIgPSBwYXRoLmpvaW4od29ya3RyZWVEaXIsICdwYWNrYWdlcycsIGVudHJ5Lm5hbWUpO1xuICAgICAgICAgIGF3YWl0IGZzLm1rZGlyKGRlc3RQYWNrYWdlRGlyLCB7IHJlY3Vyc2l2ZTogdHJ1ZSB9KTtcbiAgICAgICAgICB0b3RhbENvdW50ICs9IGF3YWl0IHJlcm91dGVOb2RlTW9kdWxlcyh7XG4gICAgICAgICAgICBzb3VyY2VOb2RlTW9kdWxlczogcGtnTm9kZU1vZHVsZXMsXG4gICAgICAgICAgICBkZXN0Tm9kZU1vZHVsZXM6IHBhdGguam9pbihkZXN0UGFja2FnZURpciwgJ25vZGVfbW9kdWxlcycpXG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH0gY2F0Y2ggKGVycm9yOiB1bmtub3duKSB7XG4gICAgaWYgKChlcnJvciBhcyBOb2RlSlMuRXJybm9FeGNlcHRpb24pLmNvZGUgIT09ICdFTk9FTlQnKSB7XG4gICAgICB0aHJvdyBlcnJvcjtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gdG90YWxDb3VudDtcbn1cblxuaW50ZXJmYWNlIFVwZGF0ZUdpdEV4Y2x1ZGVPcHRpb25zIHtcbiAgd29ya3RyZWVEaXI6IHN0cmluZztcbiAgcmVwb1Jvb3Q6IHN0cmluZztcbiAgZGlyZWN0b3JpZXM6IHN0cmluZ1tdO1xuICBmaWxlczogc3RyaW5nW107XG59XG5cbi8qKlxuICogQXBwZW5kcyBzeW1saW5rZWQgaWdub3JlZCBwYXRocyB0byB0aGUgd29ya3RyZWUtc3BlY2lmaWMgZ2l0IGV4Y2x1ZGUgZmlsZS5cbiAqXG4gKiBBbHNvIGVuYWJsZXMgYGV4dGVuc2lvbnMud29ya3RyZWVDb25maWdgIGFuZCBzZXRzIHdvcmt0cmVlLWxvY2FsXG4gKiBgY29yZS5leGNsdWRlc0ZpbGVgIHNvIGdpdCBzdGF0dXMgaW4gdGhlIHdvcmt0cmVlIGlnbm9yZXMgaW5qZWN0ZWQgbGlua3MuXG4gKlxuICogQHBhcmFtIG9wdHMgLSBXb3JrdHJlZSBwYXRoLCByZXBvIHJvb3QsIGFuZCBpZ25vcmVkIHBhdGggY2FuZGlkYXRlcy5cbiAqIEByZXR1cm5zIE5vIHZhbHVlLlxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gdXBkYXRlR2l0RXhjbHVkZShvcHRzOiBVcGRhdGVHaXRFeGNsdWRlT3B0aW9ucyk6IFByb21pc2U8dm9pZD4ge1xuICBjb25zdCB7IHdvcmt0cmVlRGlyLCByZXBvUm9vdCwgZGlyZWN0b3JpZXMsIGZpbGVzIH0gPSBvcHRzO1xuXG4gIGNvbnN0IHsgc3Rkb3V0OiBnaXREaXIgfSA9IGF3YWl0IGV4ZWNGaWxlQXN5bmMoJ2dpdCcsIFsnLUMnLCB3b3JrdHJlZURpciwgJ3Jldi1wYXJzZScsICctLWdpdC1kaXInXSwge1xuICAgIHRpbWVvdXQ6IDVfMDAwXG4gIH0pO1xuICBjb25zdCBleGNsdWRlUGF0aCA9IHBhdGguam9pbihnaXREaXIudHJpbSgpLCAnaW5mbycsICdleGNsdWRlJyk7XG4gIGF3YWl0IGZzLm1rZGlyKHBhdGguZGlybmFtZShleGNsdWRlUGF0aCksIHsgcmVjdXJzaXZlOiB0cnVlIH0pO1xuXG4gIGNvbnN0IGxpbmVzID0gWycjIFN5bWxpbmtzIGNyZWF0ZWQgYnkgaW5zdGFudC13b3JrdHJlZSddO1xuXG4gIGZvciAoY29uc3QgZGlyIG9mIGRpcmVjdG9yaWVzKSB7XG4gICAgaWYgKCFkaXIpIGNvbnRpbnVlO1xuICAgIHRyeSB7XG4gICAgICBjb25zdCBzdGF0cyA9IGF3YWl0IGZzLmxzdGF0KHBhdGguam9pbih3b3JrdHJlZURpciwgZGlyKSk7XG4gICAgICBpZiAoc3RhdHMuaXNTeW1ib2xpY0xpbmsoKSkgbGluZXMucHVzaChkaXIpO1xuICAgIH0gY2F0Y2ggKGVycm9yOiB1bmtub3duKSB7XG4gICAgICBpZiAoKGVycm9yIGFzIE5vZGVKUy5FcnJub0V4Y2VwdGlvbikuY29kZSAhPT0gJ0VOT0VOVCcpIHtcbiAgICAgICAgdGhyb3cgZXJyb3I7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgZm9yIChjb25zdCBmaWxlIG9mIGZpbGVzKSB7XG4gICAgaWYgKCFmaWxlKSBjb250aW51ZTtcbiAgICB0cnkge1xuICAgICAgY29uc3Qgc3RhdHMgPSBhd2FpdCBmcy5sc3RhdChwYXRoLmpvaW4od29ya3RyZWVEaXIsIGZpbGUpKTtcbiAgICAgIGlmIChzdGF0cy5pc1N5bWJvbGljTGluaygpKSBsaW5lcy5wdXNoKGZpbGUpO1xuICAgIH0gY2F0Y2ggKGVycm9yOiB1bmtub3duKSB7XG4gICAgICBpZiAoKGVycm9yIGFzIE5vZGVKUy5FcnJub0V4Y2VwdGlvbikuY29kZSAhPT0gJ0VOT0VOVCcpIHtcbiAgICAgICAgdGhyb3cgZXJyb3I7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgYXdhaXQgZnMuYXBwZW5kRmlsZShleGNsdWRlUGF0aCwgYCR7bGluZXMuam9pbignXFxuJyl9XFxuYCk7XG5cbiAgdHJ5IHtcbiAgICBhd2FpdCBleGVjRmlsZUFzeW5jKCdnaXQnLCBbJy1DJywgcmVwb1Jvb3QsICdjb25maWcnLCAnZXh0ZW5zaW9ucy53b3JrdHJlZUNvbmZpZycsICd0cnVlJ10sIHsgdGltZW91dDogNV8wMDAgfSk7XG4gIH0gY2F0Y2ggKGVycm9yOiB1bmtub3duKSB7XG4gICAgcHJvY2Vzcy5zdGRlcnIud3JpdGUoXG4gICAgICBgY3JlYXRlLXdvcmt0cmVlOiBmYWlsZWQgdG8gc2V0IHdvcmt0cmVlQ29uZmlnIGV4dGVuc2lvbjogJHtlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6IFN0cmluZyhlcnJvcil9XFxuYFxuICAgICk7XG4gIH1cblxuICB0cnkge1xuICAgIGF3YWl0IGV4ZWNGaWxlQXN5bmMoJ2dpdCcsIFsnLUMnLCB3b3JrdHJlZURpciwgJ2NvbmZpZycsICctLXdvcmt0cmVlJywgJ2NvcmUuZXhjbHVkZXNGaWxlJywgZXhjbHVkZVBhdGhdLCB7XG4gICAgICB0aW1lb3V0OiA1XzAwMFxuICAgIH0pO1xuICB9IGNhdGNoIChlcnJvcjogdW5rbm93bikge1xuICAgIHByb2Nlc3Muc3RkZXJyLndyaXRlKFxuICAgICAgYGNyZWF0ZS13b3JrdHJlZTogZmFpbGVkIHRvIHNldCBjb3JlLmV4Y2x1ZGVzRmlsZTogJHtlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6IFN0cmluZyhlcnJvcil9XFxuYFxuICAgICk7XG4gIH1cbn1cbiIsICJcbmltcG9ydCBoYW5kbGVyIGZyb20gJy4vY2hhdC50cyc7XG5pbXBvcnQgeyBleGVjdXRlQ29tbWFuZCB9IGZyb20gJy4uLy4uLy4uL3Nkay9zcmMvY29uZmlnL3J1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QUFxQixFQUFFLFdBQVcsU0FBUyxDQUFDO0FBR25GLE1BQUk7QUFDRixVQUFNLHNCQUFzQixPQUFPLFFBQVEsWUFBWSxRQUFRLE1BQU07QUFBQSxFQUN2RSxTQUFTLE9BQU87QUFDZCxZQUFRLE9BQU8sS0FBSyx5QkFBeUI7QUFBQSxNQUMzQyxPQUFPLGFBQWEsS0FBSztBQUFBLElBQzNCLENBQUM7QUFBQSxFQUNIO0FBQ0Y7OztBUHBmQSxJQUFPLGVBQVE7QUFBQSxFQUNiO0FBQUEsSUFDRSxZQUFZO0FBQUEsSUFDWixhQUFhO0FBQUEsSUFDYix3QkFBd0I7QUFBQSxJQUN4QixTQUFTO0FBQUEsRUFDWDtBQUFBLEVBQ0EsT0FBTyxPQUFvQixZQUEyQjtBQUNwRCxVQUFNLG1CQUFtQixPQUFPLFNBQVM7QUFBQSxNQUN2QyxRQUFRO0FBQUEsTUFDUixXQUFXLFdBQVc7QUFBQSxNQUN0QixRQUFRO0FBQUEsTUFDUiw2QkFBNkI7QUFBQSxJQUMvQixDQUFDO0FBQUEsRUFDSDtBQUNGOzs7QVd0Q0EsZUFBZSxZQUFPOyIsCiAgIm5hbWVzIjogWyJyZXNvbHZlIiwgImV4ZWNGaWxlIiwgImZzIiwgInBhdGgiLCAicHJvbWlzaWZ5IiwgInBhdGgiLCAicmVzb2x2ZSIsICJleGVjRmlsZUFzeW5jIiwgInByb21pc2lmeSIsICJleGVjRmlsZSIsICJsb2dnZXIiLCAicmVzb2x2ZSJdCn0K
