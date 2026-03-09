import { createRequire as __createRequire } from 'node:module';
const require = __createRequire(import.meta.url);

import { resolve as __resolve } from 'node:path';
const __DEFAULT_LOG_DEST = ".cards/logs/cards-default-configuration-hooks.log";
const __workspace = process.env['WORKSPACE_PATH'];
if (__workspace && !process.env['CARDS_HOOKS_LOG_FILE']) {
  process.env['CARDS_HOOKS_LOG_FILE'] = __resolve(__workspace, __DEFAULT_LOG_DEST);
}

// src/actions/interview.ts
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

// src/actions/interview.ts
var interview_default = defineAction(
  {
    actionName: "Interview",
    description: "Start an interview session for the card",
    supportsBackgroundMode: false,
    timeout: 36e5
  },
  async (input, context) => {
    await spawnClaudeSession(input, context, {
      prompt: "Load the `runtime:card-repo` and `runtime:interview-routing` skills then follow the `<instructions>`.",
      sessionId: randomUUID(),
      resume: false,
      supportsSwitchToInteractive: false
    });
  }
);

// src/actions/hook-wrapper.ts
executeCommand(interview_default);
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vLi4vc3JjL2FjdGlvbnMvaW50ZXJ2aWV3LnRzIiwgIi4uLy4uLy4uL3Nkay9zcmMvY29uZmlnL2ZhY3Rvcmllcy9hY3Rpb24udHMiLCAiLi4vLi4vLi4vc2RrL3NyYy9jb25maWcvZW52LnRzIiwgIi4uLy4uLy4uL3Nkay9zcmMvY29uZmlnL2V4aXQtY29kZXMudHMiLCAiLi4vLi4vLi4vc2RrL3NyYy9jb25maWcvbG9nZ2VyLnRzIiwgIi4uLy4uLy4uL3Nkay9zcmMvY29uZmlnL3NvY2tldC1jbGllbnQudHMiLCAiLi4vLi4vLi4vc2RrL3NyYy9jb25maWcvcnVudGltZS50cyIsICIuLi8uLi9zcmMvbGliL2NsYXVkZS1zZXNzaW9uLnRzIiwgIi4uLy4uLy4uL3Nkay9zcmMvY2xpZW50L3R5cGVzL2Vycm9ycy50cyIsICIuLi8uLi8uLi9zZGsvc3JjL2NsaWVudC9jYXJkc0NsaWVudC50cyIsICIuLi8uLi9zcmMvbGliL2NyZWF0ZS13b3JrdHJlZS50cyIsICIuLi8uLi9zcmMvYWN0aW9ucy9ob29rLXdyYXBwZXIudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbIi8qKlxuICogSW50ZXJ2aWV3IGFjdGlvbiBmb3IgQ2xhdWRlIENvZGUgd29ya2Zsb3dzLlxuICpcbiAqIFNwYXducyB0aGUgYGNsYXVkZWAgQ0xJIHdpdGggdGhlIGBydW50aW1lOmludGVydmlldy1yb3V0aW5nYCBza2lsbCBmb3IgdGhlXG4gKiBjdXJyZW50IGNhcmQuIFRoZSBwcm9jZXNzIGFsd2F5cyBydW5zIGludGVyYWN0aXZlbHkgXHUyMDE0IHN0ZGlvIGlzIGluaGVyaXRlZCBzb1xuICogdGhlIHVzZXIgZ2V0cyBkaXJlY3QgdGVybWluYWwgY29udHJvbC4gQmFja2dyb3VuZCBtb2RlIGlzIG5vdCBzdXBwb3J0ZWRcbiAqIGJlY2F1c2UgaW50ZXJ2aWV3cyByZXF1aXJlIGFjdGl2ZSB1c2VyIHBhcnRpY2lwYXRpb24uXG4gKlxuICogVGhlIGFjdGlvbiBhd2FpdHMgcHJvY2VzcyBleGl0IGJlZm9yZSByZXNvbHZpbmcsIHNvIHRoZSB0ZXJtaW5hbCBjbG9zZXNcbiAqIG9ubHkgYWZ0ZXIgQ2xhdWRlIGZpbmlzaGVzIGFuZCBjbGVhbnVwIGlzIGNvbXBsZXRlLlxuICpcbiAqIEBzdW1tYXJ5IEludGVydmlldyBhY3Rpb24gZm9yIENsYXVkZSBDb2RlIHdvcmtmbG93c1xuICogQG1vZHVsZVxuICogQHNlZSB7QGxpbmsgZGVmaW5lQWN0aW9ufSBmb3IgZmFjdG9yeSBiZWhhdmlvciBhbmQgbWV0YWRhdGEgYXR0YWNobWVudFxuICovXG5cbmltcG9ydCB7IHJhbmRvbVVVSUQgfSBmcm9tICdub2RlOmNyeXB0byc7XG5pbXBvcnQgeyB0eXBlIEFjdGlvbkNvbnRleHQsIHR5cGUgQWN0aW9uSW5wdXQsIGRlZmluZUFjdGlvbiB9IGZyb20gJ0BjYXJkcy9zZGsvY29uZmlnJztcbmltcG9ydCB7IHNwYXduQ2xhdWRlU2Vzc2lvbiB9IGZyb20gJy4uL2xpYi9jbGF1ZGUtc2Vzc2lvbi5qcyc7XG5cbi8qKlxuICogSW50ZXJ2aWV3IGFjdGlvbiBoYW5kbGVyLlxuICpcbiAqIFNwYXducyB0aGUgYGNsYXVkZWAgQ0xJIGFzIGEgY2hpbGQgcHJvY2VzcyB1c2luZyB0aGUgaW50ZXJ2aWV3LXJvdXRpbmcgc2tpbGwuXG4gKiBUaGUgcHJvY2VzcyBsaWZlY3ljbGUgaXMgdGllZCB0byB0aGUgYWN0aW9uOiBjYW5jZWxsYXRpb24gc2VuZHMgU0lHVEVSTS5cbiAqIFNlc3Npb24gcmVzdW1lIGlzIG5vdCBzdXBwb3J0ZWQgXHUyMDE0IGVhY2ggaW50ZXJ2aWV3IGFsd2F5cyBzdGFydHMgZnJlc2guXG4gKi9cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUFjdGlvbihcbiAge1xuICAgIGFjdGlvbk5hbWU6ICdJbnRlcnZpZXcnLFxuICAgIGRlc2NyaXB0aW9uOiAnU3RhcnQgYW4gaW50ZXJ2aWV3IHNlc3Npb24gZm9yIHRoZSBjYXJkJyxcbiAgICBzdXBwb3J0c0JhY2tncm91bmRNb2RlOiBmYWxzZSxcbiAgICB0aW1lb3V0OiAzNjAwMDAwXG4gIH0sXG4gIGFzeW5jIChpbnB1dDogQWN0aW9uSW5wdXQsIGNvbnRleHQ6IEFjdGlvbkNvbnRleHQpID0+IHtcbiAgICBhd2FpdCBzcGF3bkNsYXVkZVNlc3Npb24oaW5wdXQsIGNvbnRleHQsIHtcbiAgICAgIHByb21wdDogJ0xvYWQgdGhlIGBydW50aW1lOmNhcmQtcmVwb2AgYW5kIGBydW50aW1lOmludGVydmlldy1yb3V0aW5nYCBza2lsbHMgdGhlbiBmb2xsb3cgdGhlIGA8aW5zdHJ1Y3Rpb25zPmAuJyxcbiAgICAgIHNlc3Npb25JZDogcmFuZG9tVVVJRCgpLFxuICAgICAgcmVzdW1lOiBmYWxzZSxcbiAgICAgIHN1cHBvcnRzU3dpdGNoVG9JbnRlcmFjdGl2ZTogZmFsc2VcbiAgICB9KTtcbiAgfVxuKTtcbiIsICIvKipcbiAqIEZhY3RvcnkgZnVuY3Rpb24gZm9yIGNyZWF0aW5nIGFjdGlvbiBoYW5kbGVycy5cbiAqXG4gKiBUaGlzIGlzIHRoZSBwcmltYXJ5IGF1dGhvcmluZyBBUEkgZm9yIGFjdGlvbiBkZXZlbG9wZXJzLiBJdCB3cmFwcyBhIGhhbmRsZXJcbiAqIGZ1bmN0aW9uIGFuZCBhdHRhY2hlcyBtZXRhZGF0YSBmb3Igc2V0dGluZ3MuanNvbiBnZW5lcmF0aW9uLiBUaGUgU2FtZVNoYXBlXG4gKiB1dGlsaXR5IHByb3ZpZGVzIGNvbXBpbGUtdGltZSB0eXBvIGRldGVjdGlvbi5cbiAqXG4gKlxuICogQHN1bW1hcnkgRmFjdG9yeSBmdW5jdGlvbiBmb3IgY3JlYXRpbmcgYWN0aW9uIGhhbmRsZXJzXG4gKiBAbW9kdWxlXG4gKi9cblxuaW1wb3J0IHR5cGUgeyBBY3Rpb25Db21tYW5kIH0gZnJvbSAnLi4vY29tbWFuZC10eXBlcy5qcyc7XG5pbXBvcnQgdHlwZSB7IEFjdGlvbkNvbnRleHQsIEFjdGlvbklucHV0IH0gZnJvbSAnLi4vaW5wdXRzLmpzJztcbmltcG9ydCB0eXBlIHsgU2FtZVNoYXBlIH0gZnJvbSAnLi4vdHlwZS11dGlscy5qcyc7XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIENvbmZpZ3VyYXRpb24gVHlwZXNcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuLyoqXG4gKiBDb25maWd1cmF0aW9uIGZvciB7QGxpbmsgZGVmaW5lQWN0aW9ufSBmYWN0b3J5LlxuICpcbiAqIEFsbCBmaWVsZHMgZXhjZXB0IGBhY3Rpb25OYW1lYCBhcmUgb3B0aW9uYWwgYW5kIGZvcndhcmRlZCB0byBzZXR0aW5ncy5qc29uLlxuICogVGhlIENMSSBleHRyYWN0cyB0aGlzIG1ldGFkYXRhIHZpYSBBU1QgYW5hbHlzaXMsIHNvIHZhbHVlcyBtdXN0IGJlIHN0cmluZ1xuICogbGl0ZXJhbHMgb3IgYm9vbGVhbi9udW1iZXIgbGl0ZXJhbHMgaW4gdGhlIHNvdXJjZSBjb2RlLlxuICpcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBjb25zdCBjb25maWc6IEFjdGlvbkNvbmZpZyA9IHtcbiAqICAgYWN0aW9uTmFtZTogJ0xhdW5jaCBDbGF1ZGUnLFxuICogICBkZXNjcmlwdGlvbjogJ1N0YXJ0IGEgQ2xhdWRlIGNvZGluZyBzZXNzaW9uJyxcbiAqICAgaWNvbjogJy4vaWNvbnMvY2xhdWRlLnN2ZycsXG4gKiAgIHN1cHBvcnRzQmFja2dyb3VuZE1vZGU6IHRydWUsXG4gKiAgIHRpbWVvdXQ6IDMwMDAwXG4gKiB9O1xuICogYGBgXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgQWN0aW9uQ29uZmlnIHtcbiAgLyoqXG4gICAqIFN0YWJsZSBpZGVudGlmaWVyIGZvciB0aGUgYWN0aW9uIHVzZWQgaW4gdGVsZW1ldHJ5LCBsb2NhbGl6YXRpb24sIGFuZCBBUEkgbG9va3Vwcy5cbiAgICpcbiAgICogU2hvdWxkIGJlIGxvd2VyY2FzZSB3aXRoIGh5cGhlbnMgKGUuZy4sICdsYXVuY2gtY2xhdWRlJywgJ3J1bi10ZXN0cycpLlxuICAgKiBJZiBvbWl0dGVkLCB0aGUgQ0xJIGdlbmVyYXRlcyBhbiBJRCBieSBzbHVnaWZ5aW5nIGBhY3Rpb25OYW1lYC5cbiAgICovXG4gIGlkPzogc3RyaW5nO1xuXG4gIC8qKlxuICAgKiBUaGUgYWN0aW9uIG5hbWUgdXNlZCB0byBpZGVudGlmeSB0aGUgYWN0aW9uIGluIHNldHRpbmdzLmpzb24uXG4gICAqXG4gICAqIFRoaXMgbmFtZSBhcHBlYXJzIGluIHRoZSBVSS4gS2VlcCBpdCBjb25jaXNlIGJ1dCBkZXNjcmlwdGl2ZS5cbiAgICovXG4gIGFjdGlvbk5hbWU6IHN0cmluZztcblxuICAvKipcbiAgICogSHVtYW4tcmVhZGFibGUgZGVzY3JpcHRpb24gc2hvd24gaW4gYnV0dG9uIHRvb2x0aXAuXG4gICAqXG4gICAqIEV4cGxhaW4gd2hhdCB0aGUgYWN0aW9uIGRvZXMgaW4gYSBmZXcgd29yZHMuIFNob3duIG9uIGhvdmVyIGluIHRoZSBVSS5cbiAgICovXG4gIGRlc2NyaXB0aW9uPzogc3RyaW5nO1xuXG4gIC8qKlxuICAgKiBQYXRoIHRvIGljb24gZmlsZSBmb3IgdGhlIGFjdGlvbiBidXR0b24uXG4gICAqXG4gICAqIFBhdGhzIGFyZSByZWxhdGl2ZSB0byB0aGUgc2V0dGluZ3MuanNvbiBmaWxlIGxvY2F0aW9uLlxuICAgKiBTVkcgZm9ybWF0IHJlY29tbWVuZGVkIGZvciBjcmlzcCByZW5kZXJpbmcgYXQgYW55IHNpemUuXG4gICAqL1xuICBpY29uPzogc3RyaW5nO1xuXG4gIC8qKlxuICAgKiBXaGV0aGVyIHRvIHNob3cgdGhlIGV4ZWN1dGlvbiBtb2RlIHRvZ2dsZSBpbiB0aGUgVUkuXG4gICAqXG4gICAqIFdoZW4gdHJ1ZSwgdXNlcnMgY2FuIGNob29zZSBiZXR3ZWVuIGludGVyYWN0aXZlIGFuZCBiYWNrZ3JvdW5kIG1vZGVzLlxuICAgKiBXaGVuIGZhbHNlIChkZWZhdWx0KSwgdGhlIGFjdGlvbiBhbHdheXMgcnVucyBpbiBpbnRlcmFjdGl2ZSBtb2RlLlxuICAgKi9cbiAgc3VwcG9ydHNCYWNrZ3JvdW5kTW9kZT86IGJvb2xlYW47XG5cbiAgLyoqXG4gICAqIFdoZXRoZXIgbXVsdGlwbGUgaW5zdGFuY2VzIGNhbiBydW4gc2ltdWx0YW5lb3VzbHkgb24gdGhlIHNhbWUgY2FyZC5cbiAgICpcbiAgICogV2hlbiBmYWxzZSAoZGVmYXVsdCksIHN0YXJ0aW5nIHRoZSBhY3Rpb24gd2hpbGUgaXQncyBydW5uaW5nIHdpbGwgYmVcbiAgICogYmxvY2tlZC4gU2V0IHRvIHRydWUgZm9yIGlkZW1wb3RlbnQgYWN0aW9ucyB0aGF0IGNhbiBzYWZlbHkgb3ZlcmxhcC5cbiAgICovXG4gIGFsbG93Q29uY3VycmVudD86IGJvb2xlYW47XG5cbiAgLyoqXG4gICAqIE1heGltdW0gZXhlY3V0aW9uIHRpbWUgaW4gbWlsbGlzZWNvbmRzLlxuICAgKlxuICAgKiBJZiB0aGUgYWN0aW9uIGV4Y2VlZHMgdGhpcyB0aW1lb3V0LCB0aGUgcnVudGltZSB3aWxsIHRlcm1pbmF0ZSBpdC5cbiAgICogT21pdCB0byB1c2UgdGhlIHBsYXRmb3JtJ3MgZGVmYXVsdCB0aW1lb3V0IHBvbGljeS5cbiAgICovXG4gIHRpbWVvdXQ/OiBudW1iZXI7XG5cbiAgLyoqXG4gICAqIEhhbmRsZXIgc291cmNlIGZpbGUgcGF0aCwgaW5qZWN0ZWQgYnkgdGhlIGBpbmplY3RTb3VyY2VQYXRoYCBlc2J1aWxkXG4gICAqIHBsdWdpbiBkdXJpbmcgY29uZmlnIGxvYWRpbmcuIERvIG5vdCBzZXQgbWFudWFsbHkuXG4gICAqXG4gICAqIEBpbnRlcm5hbFxuICAgKi9cbiAgc291cmNlUGF0aD86IHN0cmluZztcbn1cblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gSGFuZGxlciBUeXBlc1xuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4vKipcbiAqIEhhbmRsZXIgZnVuY3Rpb24gc2lnbmF0dXJlIGZvciBhY3Rpb24gZXZlbnRzLlxuICpcbiAqIFRocm93aW5nIGFuIGVycm9yIHNpZ25hbHMgYWN0aW9uIGZhaWx1cmUuIFRoZSBlcnJvciBtZXNzYWdlIGlzIGxvZ2dlZCBhbmRcbiAqIHN1cmZhY2VkIHRvIHRoZSB1c2VyLiBGb3IgZXhwZWN0ZWQgZXJyb3JzLCB0aHJvdyB3aXRoIGEgZGVzY3JpcHRpdmUgbWVzc2FnZS5cbiAqXG4gKiBAcGFyYW0gaW5wdXQgLSBBY3Rpb24gaW5wdXQgcGF5bG9hZCBmcm9tIGVudmlyb25tZW50IHZhcmlhYmxlc1xuICogQHBhcmFtIGNvbnRleHQgLSBSdW50aW1lIGNvbnRleHQgd2l0aCBsb2dnZXIsIGN3ZCwgYW5kIGNhbGxiYWNrIG1ldGhvZHNcbiAqIEByZXR1cm5zIFByb21pc2UgdGhhdCByZXNvbHZlcyB3aGVuIHRoZSBhY3Rpb24gY29tcGxldGVzXG4gKlxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGNvbnN0IGhhbmRsZXI6IEFjdGlvbkhhbmRsZXIgPSBhc3luYyAoaW5wdXQsIHsgbG9nZ2VyLCBvbkNhbmNlbCB9KSA9PiB7XG4gKiAgIG9uQ2FuY2VsKCgpID0+IHtcbiAqICAgICBsb2dnZXIuaW5mbygnQ2FuY2VsbGluZyBhY3Rpb24nKTtcbiAqICAgfSk7XG4gKlxuICogICB0cnkge1xuICogICAgIGxvZ2dlci5pbmZvKCdTdGFydGluZyBhY3Rpb24nLCB7IGNhcmRJZDogaW5wdXQuY2FyZElkIH0pO1xuICogICAgIGF3YWl0IHBlcmZvcm1BY3Rpb24oaW5wdXQpO1xuICogICAgIGxvZ2dlci5pbmZvKCdBY3Rpb24gY29tcGxldGVkIHN1Y2Nlc3NmdWxseScpO1xuICogICB9IGNhdGNoIChlcnIpIHtcbiAqICAgICBsb2dnZXIubG9nRXJyb3IoZXJyLCAnQWN0aW9uIGZhaWxlZCcpO1xuICogICAgIHRocm93IGVycjsgLy8gUmUtdGhyb3cgdG8gc2lnbmFsIGZhaWx1cmVcbiAqICAgfVxuICogfTtcbiAqIGBgYFxuICovXG5leHBvcnQgdHlwZSBBY3Rpb25IYW5kbGVyID0gKGlucHV0OiBBY3Rpb25JbnB1dCwgY29udGV4dDogQWN0aW9uQ29udGV4dCkgPT4gdm9pZCB8IFByb21pc2U8dm9pZD47XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIEZhY3RvcnkgRnVuY3Rpb25cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuLyoqXG4gKiBDcmVhdGVzIGFuIGFjdGlvbiBoYW5kbGVyIHdpdGggbWV0YWRhdGEgZm9yIHNldHRpbmdzLmpzb24gZ2VuZXJhdGlvbi5cbiAqXG4gKiBUaGlzIGZhY3Rvcnkgd3JhcHMgeW91ciBoYW5kbGVyIGZ1bmN0aW9uIGFuZCBhdHRhY2hlcyBtZXRhZGF0YSB0aGF0IHRoZSBDTElcbiAqIGV4dHJhY3RzIHdoZW4gYnVpbGRpbmcgc2V0dGluZ3MuanNvbi4gVGhlIHJldHVybmVkIGNvbW1hbmQgaXMgYm90aCBjYWxsYWJsZVxuICogKGZvciB0aGUgcnVudGltZSkgYW5kIGluc3BlY3RhYmxlIChmb3IgdGhlIENMSSkuXG4gKlxuICogVGhlIGdlbmVyaWMgcGFyYW1ldGVyIHByZXNlcnZlcyB0aGUgYWN0aW9uIG5hbWUgYXMgYSBsaXRlcmFsIHR5cGUuXG4gKlxuICogQHRlbXBsYXRlIFQgLSBUaGUgY29uZmlnIHR5cGUgZXh0ZW5kaW5nIEFjdGlvbkNvbmZpZ1xuICogQHBhcmFtIGNvbmZpZyAtIEFjdGlvbiBtZXRhZGF0YSAodXNlcyBTYW1lU2hhcGUgdG8gY2F0Y2ggdHlwb3MpXG4gKiBAcGFyYW0gaGFuZGxlciAtIEFzeW5jIGZ1bmN0aW9uIHRoYXQgaW1wbGVtZW50cyB0aGUgYWN0aW9uIGxvZ2ljXG4gKiBAcmV0dXJucyBBIGNhbGxhYmxlIGNvbW1hbmQgd2l0aCBhdHRhY2hlZCBtZXRhZGF0YVxuICpcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiAvLyBCYXNpYyB1c2FnZVxuICogZXhwb3J0IGRlZmF1bHQgZGVmaW5lQWN0aW9uKFxuICogICB7IGFjdGlvbk5hbWU6ICdMYXVuY2ggQ2xhdWRlJyB9LFxuICogICBhc3luYyAoaW5wdXQsIHsgbG9nZ2VyIH0pID0+IHtcbiAqICAgICBsb2dnZXIuaW5mbygnTGF1bmNoaW5nIENsYXVkZScsIHsgY2FyZElkOiBpbnB1dC5jYXJkSWQgfSk7XG4gKiAgICAgYXdhaXQgc3Bhd25DbGF1ZGUoaW5wdXQpO1xuICogICB9XG4gKiApO1xuICogYGBgXG4gKlxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIC8vIFdpdGggZnVsbCBjb25maWd1cmF0aW9uXG4gKiBleHBvcnQgZGVmYXVsdCBkZWZpbmVBY3Rpb24oXG4gKiAgIHtcbiAqICAgICBhY3Rpb25OYW1lOiAnRGVwbG95IEFwcGxpY2F0aW9uJyxcbiAqICAgICBkZXNjcmlwdGlvbjogJ0RlcGxveSB0byBwcm9kdWN0aW9uJyxcbiAqICAgICBpY29uOiAnLi9pY29ucy9kZXBsb3kuc3ZnJyxcbiAqICAgICBzdXBwb3J0c0JhY2tncm91bmRNb2RlOiB0cnVlLFxuICogICAgIGFsbG93Q29uY3VycmVudDogZmFsc2UsXG4gKiAgICAgdGltZW91dDogNjAwMDBcbiAqICAgfSxcbiAqICAgYXN5bmMgKGlucHV0LCBjb250ZXh0KSA9PiB7XG4gKiAgICAgY29udGV4dC5vbkNhbmNlbCgoKSA9PiBjbGVhbnVwKCkpO1xuICogICAgIGF3YWl0IGRlcGxveShpbnB1dCwgY29udGV4dCk7XG4gKiAgIH1cbiAqICk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGRlZmluZUFjdGlvbjxUIGV4dGVuZHMgQWN0aW9uQ29uZmlnPihcbiAgY29uZmlnOiBTYW1lU2hhcGU8QWN0aW9uQ29uZmlnLCBUPixcbiAgaGFuZGxlcjogQWN0aW9uSGFuZGxlclxuKTogQWN0aW9uQ29tbWFuZDxUWydhY3Rpb25OYW1lJ10+IHtcbiAgY29uc3QgZm4gPSBhc3luYyAoaW5wdXQ6IEFjdGlvbklucHV0LCBjb250ZXh0OiBBY3Rpb25Db250ZXh0KTogUHJvbWlzZTx2b2lkPiA9PiB7XG4gICAgYXdhaXQgaGFuZGxlcihpbnB1dCwgY29udGV4dCk7XG4gIH07XG5cbiAgZm4uZmFjdG9yeVR5cGUgPSAnYWN0aW9uJyBhcyBjb25zdDtcbiAgZm4uaWQgPSBjb25maWcuaWQ7XG4gIGZuLmFjdGlvbk5hbWUgPSBjb25maWcuYWN0aW9uTmFtZTtcbiAgZm4uZGVzY3JpcHRpb24gPSBjb25maWcuZGVzY3JpcHRpb247XG4gIGZuLmljb24gPSBjb25maWcuaWNvbjtcbiAgZm4uc3VwcG9ydHNCYWNrZ3JvdW5kTW9kZSA9IGNvbmZpZy5zdXBwb3J0c0JhY2tncm91bmRNb2RlO1xuICBmbi5hbGxvd0NvbmN1cnJlbnQgPSBjb25maWcuYWxsb3dDb25jdXJyZW50O1xuICBmbi50aW1lb3V0ID0gY29uZmlnLnRpbWVvdXQ7XG4gIGZuLnNvdXJjZVBhdGggPSBjb25maWcuc291cmNlUGF0aDtcblxuICByZXR1cm4gZm4gYXMgQWN0aW9uQ29tbWFuZDxUWydhY3Rpb25OYW1lJ10+O1xufVxuIiwgIi8qKlxuICogRW52aXJvbm1lbnQgdmFyaWFibGUgdXRpbGl0aWVzIGZvciBDYXJkcyBFeHRlbnNpb24gYWN0aW9ucyBhbmQgdHlwZSBob29rcy5cbiAqXG4gKiBUaGUgZXhlY3V0aW9uIHdyYXBwZXIgaW5qZWN0cyBhY3Rpb24gYW5kIHR5cGUgaG9vayBpbnB1dHMgdmlhIHByb2Nlc3MuZW52LlxuICogVGhpcyBtb2R1bGUgcHJvdmlkZXMgc3RyaWN0IGdldHRlcnMgYW5kIHR5cGVkIGV4dHJhY3RvcnMgc28gaGFuZGxlcnMgZG8gbm90XG4gKiBuZWVkIHRvIHBhcnNlIGVudmlyb25tZW50IHZhcmlhYmxlcyBtYW51YWxseS5cbiAqXG4gKiBVc2UgdGhlIGluZGl2aWR1YWwgZ2V0dGVycyB3aGVuIHlvdSBvbmx5IG5lZWQgb25lIHZhbHVlOyB1c2VcbiAqIHtAbGluayBleHRyYWN0QWN0aW9uSW5wdXR9IG9yIHtAbGluayBleHRyYWN0VHlwZUlucHV0fSB3aGVuIHlvdSBuZWVkIGEgZnVsbFxuICogdHlwZWQgcGF5bG9hZCBmb3IgYW4gYWN0aW9uIG9yIHR5cGUgaG9vay5cbiAqXG4gKlxuICogQHN1bW1hcnkgRW52aXJvbm1lbnQgdmFyaWFibGUgdXRpbGl0aWVzIGZvciBDYXJkcyBFeHRlbnNpb24gYWN0aW9ucyBhbmQgdHlwZSBob29rc1xuICogQG1vZHVsZVxuICovXG5cbmltcG9ydCB7IHJlYWRGaWxlU3luYyB9IGZyb20gJ25vZGU6ZnMnO1xuaW1wb3J0IHR5cGUgeyBBY3Rpb25JbnB1dCwgVHlwZUhvb2tJbnB1dCB9IGZyb20gJy4vaW5wdXRzLmpzJztcblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gQ29uc3RhbnRzXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbi8qKlxuICogRW52aXJvbm1lbnQgdmFyaWFibGUgbmFtZXMgc2V0IGJ5IHRoZSBDYXJkcyBleGVjdXRpb24gd3JhcHBlci5cbiAqXG4gKiBUaGlzIGlzIHRoZSBzaW5nbGUgc291cmNlIG9mIHRydXRoIGZvciBlbnYgdmFyIGtleXMgdXNlZCBieSBhY3Rpb24gYW5kIHR5cGVcbiAqIGhvb2sgcHJvY2Vzc2VzLiBLZWVwIGl0IGluIHN5bmMgd2l0aCB0aGUgd3JhcHBlciB0byBhdm9pZCBzdWJ0bGUgXCJ1bmRlZmluZWRcbiAqIGlucHV0XCIgYnVncy5cbiAqL1xuZXhwb3J0IGNvbnN0IENBUkRTX0VOVl9WQVJTID0ge1xuICAvKipcbiAgICogVW5pcXVlIGlkZW50aWZpZXIgZm9yIHRoZSBjdXJyZW50IGNhcmQuXG4gICAqIEF2YWlsYWJsZSBpbiBhbGwgYWN0aW9ucyBhbmQgdHlwZSBob29rcy5cbiAgICovXG4gIENBUkRfSUQ6ICdDQVJEX0lEJyxcblxuICAvKipcbiAgICogVGhlIGVudmlyb25tZW50IG5hbWUgZnJvbSBzZXR0aW5ncy5qc29uLlxuICAgKiBBdmFpbGFibGUgaW4gYWxsIGFjdGlvbnMgYW5kIHR5cGUgaG9va3MuXG4gICAqL1xuICBFTlZJUk9OTUVOVDogJ0VOVklST05NRU5UJyxcblxuICAvKipcbiAgICogRGlzcGxheSBuYW1lIG9mIHRoZSBhY3Rpb24gYnV0dG9uIHRoYXQgdHJpZ2dlcmVkIHRoaXMgaGFuZGxlci5cbiAgICogQXZhaWxhYmxlIGluIGFjdGlvbnMgb25seSAobm90IHR5cGUgaG9va3MpLlxuICAgKi9cbiAgQUNUSU9OX05BTUU6ICdBQ1RJT05fTkFNRScsXG5cbiAgLyoqXG4gICAqIENhcmQncyBleGVjdXRpb24gbW9kZSwgZGV0ZXJtaW5pbmcgVUkgaW50ZXJhY3Rpb24gbW9kZWwuXG4gICAqIEF2YWlsYWJsZSBpbiBhY3Rpb25zIG9ubHkgKG5vdCB0eXBlIGhvb2tzKS5cbiAgICogVmFsaWQgdmFsdWVzOiAnaW50ZXJhY3RpdmUnIHwgJ2JhY2tncm91bmQnXG4gICAqL1xuICBFWEVDVVRJT05fTU9ERTogJ0VYRUNVVElPTl9NT0RFJyxcblxuICAvKipcbiAgICogQ2FyZHMgc2VydmVyIGJhc2UgVVJMIGZvciBBUEkgY2FsbHMuXG4gICAqIEF2YWlsYWJsZSBpbiBhbGwgYWN0aW9ucyBhbmQgdHlwZSBob29rcy5cbiAgICovXG4gIEFQSV9CQVNFX1VSTDogJ0FQSV9CQVNFX1VSTCcsXG5cbiAgLyoqXG4gICAqIEF1dGhlbnRpY2F0aW9uIHRva2VuIGZvciBBUEkgY2FsbHMuXG4gICAqIEF2YWlsYWJsZSBpbiBhbGwgYWN0aW9ucyBhbmQgdHlwZSBob29rcy5cbiAgICovXG4gIEFQSV9BQ0NFU1NfVE9LRU46ICdBUElfQUNDRVNTX1RPS0VOJyxcblxuICAvKipcbiAgICogQ29uZmlndXJlZCBjb2RpbmcgYWdlbnQgaWRlbnRpZmllciBmcm9tIGNhcmRzLmNvZGluZ0FnZW50IHNldHRpbmcuXG4gICAqIEF2YWlsYWJsZSBpbiBhY3Rpb25zIG9ubHkgKG5vdCB0eXBlIGhvb2tzKS5cbiAgICogT3B0aW9uYWwuXG4gICAqL1xuICBDT0RJTkdfQUdFTlQ6ICdDT0RJTkdfQUdFTlQnLFxuXG4gIC8qKlxuICAgKiBUaGUgcmVnaXN0ZXJlZCB0eXBlIG5hbWUuXG4gICAqIEF2YWlsYWJsZSBpbiB0eXBlIGhvb2tzIG9ubHkuXG4gICAqL1xuICBUWVBFX05BTUU6ICdUWVBFX05BTUUnLFxuXG4gIC8qKlxuICAgKiBUaGUgdHlwZSdzIHZlcnNpb24gc3RyaW5nIGZyb20gc2V0dGluZ3MuanNvbiBjb25maWd1cmF0aW9uLlxuICAgKiBBdmFpbGFibGUgaW4gdHlwZSBob29rcyBvbmx5LlxuICAgKi9cbiAgVFlQRV9WRVJTSU9OOiAnVFlQRV9WRVJTSU9OJyxcblxuICAvKipcbiAgICogVGhlIGZpbGUgbmFtZSB3aXRoaW4gdGhlIHR5cGUgZGlyZWN0b3J5LlxuICAgKiBBdmFpbGFibGUgaW4gdHlwZSBob29rcyBvbmx5LlxuICAgKi9cbiAgRklMRV9OQU1FOiAnRklMRV9OQU1FJyxcblxuICAvKipcbiAgICogRnVsbCBwYXRoIHRvIHRoZSBmaWxlLlxuICAgKiBBdmFpbGFibGUgaW4gdHlwZSBob29rcyBvbmx5LlxuICAgKi9cbiAgRklMRV9QQVRIOiAnRklMRV9QQVRIJyxcblxuICAvKipcbiAgICogRmlsZSBzaXplIGluIGJ5dGVzLlxuICAgKiBBdmFpbGFibGUgaW4gdHlwZSBob29rcyBvbmx5LlxuICAgKi9cbiAgRklMRV9TSVpFOiAnRklMRV9TSVpFJyxcblxuICAvKipcbiAgICogU0hBMjU2IGhhc2ggb2YgY29udGVudC5cbiAgICogQXZhaWxhYmxlIGluIHR5cGUgaG9va3Mgb25seS5cbiAgICovXG4gIFNIQTI1NjogJ1NIQTI1NicsXG5cbiAgLyoqXG4gICAqIE1JTUUgdHlwZSBvZiB0aGUgY29udGVudC5cbiAgICogQXZhaWxhYmxlIGluIHR5cGUgaG9va3Mgb25seS5cbiAgICovXG4gIENPTlRFTlRfVFlQRTogJ0NPTlRFTlRfVFlQRScsXG5cbiAgLyoqXG4gICAqIFBhdGggdG8gdGhlIFZTIENvZGUgYnVuZGxlZCBOb2RlLmpzIGludGVycHJldGVyLlxuICAgKlxuICAgKiBTZXQgYnkgdGhlIGV4dGVuc2lvbiBob3N0IGZyb20gYHByb2Nlc3MuZXhlY1BhdGhgICh3aXRoXG4gICAqIGBFTEVDVFJPTl9SVU5fQVNfTk9ERT0xYCkuIENvbW1hbmRzIGluIHNldHRpbmdzLmpzb24gdXNlXG4gICAqIGAkVlNDT0RFX05PREUgLi9iaW4vLi4uYCBzbyB0aGV5IHdvcmsgcmVnYXJkbGVzcyBvZlxuICAgKiB3aGV0aGVyIGBub2RlYCBpcyBvbiB0aGUgc3lzdGVtIFBBVEguXG4gICAqXG4gICAqIEF2YWlsYWJsZSBpbiBhbGwgYWN0aW9ucyBhbmQgdHlwZSBob29rcy5cbiAgICovXG4gIFZTQ09ERV9OT0RFOiAnVlNDT0RFX05PREUnLFxuXG4gIC8qKlxuICAgKiBQYXRoIHRvIHRoZSBOb2RlLmpzIGludGVycHJldGVyIHJ1bm5pbmcgdGhlIHdyYXBwZXIgcHJvY2Vzcy5cbiAgICpcbiAgICogU2V0IGJ5IHRoZSB3cmFwcGVyIGZyb20gYHByb2Nlc3MuZXhlY1BhdGhgLiBVc2UgYCROT0RFYCBpbiBlbWJlZGRlZFxuICAgKiBiYXNoIHN0YXRlbWVudHMgdG8gaW52b2tlIE5vZGUgc2NyaXB0cyBwb3J0YWJseS5cbiAgICpcbiAgICogQXZhaWxhYmxlIGluIGFsbCBhY3Rpb25zLlxuICAgKi9cbiAgTk9ERTogJ05PREUnLFxuXG4gIC8qKlxuICAgKiBQYXRoIHRvIHRoZSBVbml4IGRvbWFpbiBzb2NrZXQgZm9yIHJ1bnRpbWUtdG8tZGlzcGF0Y2hlciBjb21tdW5pY2F0aW9uLlxuICAgKiBBdmFpbGFibGUgaW4gYWN0aW9ucyBvbmx5LlxuICAgKi9cbiAgU09DS0VUX1BBVEg6ICdTT0NLRVRfUEFUSCcsXG5cbiAgLyoqXG4gICAqIFBhdGggdG8gYSBKU09OIGZpbGUgY29udGFpbmluZyBzd2l0Y2hUb0ludGVyYWN0aXZlIGRhdGEgZnJvbSBhIHByZXZpb3VzIGhhbmRsZXIuXG4gICAqIEF2YWlsYWJsZSBpbiBhY3Rpb25zIG9ubHkuIE9wdGlvbmFsLlxuICAgKi9cbiAgU1dJVENIX1RPX0lOVEVSQUNUSVZFX0RBVEFfUEFUSDogJ1NXSVRDSF9UT19JTlRFUkFDVElWRV9EQVRBX1BBVEgnLFxuXG4gIC8qKlxuICAgKiBQYXRoIHRvIHRoZSBzZXR0aW5ncyBjb25maWd1cmF0aW9uIGRpcmVjdG9yeS5cbiAgICogQXZhaWxhYmxlIGluIGFjdGlvbnMgb25seS5cbiAgICovXG4gIENPTkZJR19QQVRIOiAnQ09ORklHX1BBVEgnLFxuXG4gIC8qKlxuICAgKiBQYXRoIHRvIHRoZSBWUyBDb2RlIHdvcmtzcGFjZSByb290IGRpcmVjdG9yeS5cbiAgICogU2V0IGJ5IHRoZSBhY3Rpb24gaGFuZGxlciAoZS5nLiwgbGF1bmNoLnRzKSB0byB0aGUgd29ya3RyZWUgcGF0aC5cbiAgICogQXZhaWxhYmxlIGluIGhvb2tzIHJ1bm5pbmcgaW5zaWRlIHRoZSBjbGF1ZGUgQ0xJLlxuICAgKi9cbiAgV09SS1NQQUNFX1BBVEg6ICdXT1JLU1BBQ0VfUEFUSCcsXG5cbiAgLyoqXG4gICAqIEFic29sdXRlIHBhdGggdG8gdGhlIG1haW4gZ2l0IHJlcG9zaXRvcnkgcm9vdCAoTk9UIGEgd29ya3RyZWUpLlxuICAgKiBTZXQgYnkgQWN0aW9uRGlzcGF0Y2hlcjsgY29uc3VtZWQgYnkgdGhlIHdyYXBwZXIgYW5kIHdhdGNoZXIgZm9yXG4gICAqIGdpdCBvcGVyYXRpb25zICh3b3JrdHJlZSByZW1vdmFsLCBicmFuY2ggZGVsZXRpb24pIHRoYXQgbXVzdCBydW5cbiAgICogYWdhaW5zdCB0aGUgbWFpbiByZXBvc2l0b3J5LlxuICAgKi9cbiAgUkVQT19ST09UOiAnUkVQT19ST09UJyxcblxuICAvKipcbiAgICogUGF0aCB0byB0aGUgY2FyZCdzIHJlcG9zaXRvcnkgZGlyZWN0b3J5LlxuICAgKiBBdmFpbGFibGUgaW4gYWN0aW9ucyBvbmx5LlxuICAgKi9cbiAgQ0FSRF9SRVBPX1BBVEg6ICdDQVJEX1JFUE9fUEFUSCcsXG5cbiAgLyoqXG4gICAqIFJlc29sdmVkIHNoZWxsIGNvbW1hbmQgZm9yIHRoZSB3cmFwcGVyIHRvIHNwYXduIGFzIHRoZSBhY3Rpb24gaGFuZGxlci5cbiAgICogU2V0IGJ5IEFjdGlvbkRpc3BhdGNoZXI7IGNvbnN1bWVkIGJ5IHRoZSB3cmFwcGVyIChub3QgYnkgYWN0aW9uIGhhbmRsZXJzKS5cbiAgICovXG4gIEFDVElPTl9DT01NQU5EOiAnQUNUSU9OX0NPTU1BTkQnLFxuXG4gIC8qKlxuICAgKiBHaXQgYnJhbmNoIHRoYXQgdGhlIGNhcmQncyB3b3Jrc3BhY2UgYnJhbmNoIHdpbGwgbWVyZ2UgaW50by5cbiAgICogUmVzb2x2ZWQgZnJvbSB0aGUgd29ya3NwYWNlIEhFQUQgYXQgbGF1bmNoIHRpbWUuXG4gICAqIFNldCBieSB0aGUgbGF1bmNoIGFjdGlvbi5cbiAgICogQXZhaWxhYmxlIGluIGFjdGlvbnMgb25seS5cbiAgICovXG4gIEJBU0VfQlJBTkNIOiAnQkFTRV9CUkFOQ0gnLFxuXG4gIC8qKlxuICAgKiBHaXQgYnJhbmNoIGZyb20gd2hpY2ggdGhlIGNhcmQncyB3b3Jrc3BhY2UgYnJhbmNoIHdhcyBjcmVhdGVkLlxuICAgKiBNYXkgZGlmZmVyIGZyb20gQkFTRV9CUkFOQ0ggd2hlbiB0aGUgd29ya3RyZWUgd2FzIGNyZWF0ZWQgYWdhaW5zdFxuICAgKiBhIGRpZmZlcmVudCByZWYgdGhhbiB0aGUgY3VycmVudCB3b3Jrc3BhY2UgSEVBRC5cbiAgICogU2V0IGJ5IHRoZSBsYXVuY2ggYWN0aW9uLlxuICAgKiBBdmFpbGFibGUgaW4gYWN0aW9ucyBvbmx5LlxuICAgKi9cbiAgUEFSRU5UX0JSQU5DSDogJ1BBUkVOVF9CUkFOQ0gnLFxuXG4gIC8qKlxuICAgKiBHaXQgYnJhbmNoIG5hbWUgZm9yIHRoZSBjYXJkJ3Mgd29ya3NwYWNlIGltcGxlbWVudGF0aW9uLlxuICAgKiBTZXQgYnkgdGhlIGxhdW5jaCBhY3Rpb24gYWZ0ZXIgcmVzb2x2aW5nIG9yIGNyZWF0aW5nIHRoZSB3b3JrdHJlZS5cbiAgICogQXZhaWxhYmxlIGluIGFjdGlvbnMgb25seS5cbiAgICovXG4gIFdPUktTUEFDRV9CUkFOQ0g6ICdXT1JLU1BBQ0VfQlJBTkNIJyxcblxuICAvKipcbiAgICogU2Vzc2lvbiBJRCBwZXJzaXN0ZWQgYnkgdGhlIHNlc3Npb24tc3RhcnQgaG9vayB2aWEgYHBlcnNpc3RFbnZWYXJgLlxuICAgKlxuICAgKiBBdmFpbGFibGUgaW4gQmFzaCB0b29sIHNoZWxsIGRlc2NlbmRhbnRzIChjb21tYW5kcywgZ2l0IGhvb2tzKSBhZnRlclxuICAgKiBzZXNzaW9uIHN0YXJ0LiBOT1QgYXZhaWxhYmxlIGluIGhvb2tzIHNwYXduZWQgZGlyZWN0bHkgYnkgQ2xhdWRlIENvZGVcbiAgICogKHN0b3AsIHNlc3Npb24tZW5kLCBldGMuKSBcdTIwMTQgdGhvc2UgcmVjZWl2ZSB0aGUgc2Vzc2lvbiBJRCB2aWEgaG9vayBpbnB1dC5cbiAgICpcbiAgICogVGhlIGNhcmQtcmVwbyBwb3N0LWNvbW1pdCBob29rIHJlYWRzIHRoaXMgdG8gcmVjb3JkIGNvbW1pdHMgZGlyZWN0bHlcbiAgICogd2l0aG91dCBuZWVkaW5nIGEgcHJvY2Vzcy10cmVlIHdhbGsgb3IgUElEIHJlZ2lzdHJ5IGxvb2t1cC5cbiAgICovXG4gIENBUkRTX1NFU1NJT05fSUQ6ICdDQVJEU19TRVNTSU9OX0lEJyxcblxuICAvKipcbiAgICogQWJzb2x1dGUgcGF0aCB0byB0aGUgVlMgQ29kZSBleHRlbnNpb24gaW5zdGFsbGF0aW9uIGRpcmVjdG9yeS5cbiAgICpcbiAgICogU2V0IGJ5IHRoZSBleHRlbnNpb24gaG9zdCBmcm9tIGBjb250ZXh0LmV4dGVuc2lvblVyaS5mc1BhdGhgIGFuZCBpbmplY3RlZFxuICAgKiBpbnRvIGFsbCBzcGF3bmVkIGFjdGlvbiBwcm9jZXNzZXMuIFVzZSB0aGlzIHRvIGxvY2F0ZSBidW5kbGVkIGFzc2V0cyBzdWNoXG4gICAqIGFzIHRoZSBydW50aW1lIHBsdWdpbiBkaXJlY3RvcnkgKGA8ZXh0ZW5zaW9uUGF0aD4vZGlzdC9wbHVnaW5zL3J1bnRpbWVgKS5cbiAgICpcbiAgICogQXZhaWxhYmxlIGluIGFjdGlvbnMgb25seSAobm90IHR5cGUgaG9va3MpLlxuICAgKi9cbiAgRVhURU5TSU9OX1BBVEg6ICdFWFRFTlNJT05fUEFUSCdcbn0gYXMgY29uc3Q7XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIEluZGl2aWR1YWwgR2V0dGVyc1xuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4vKipcbiAqIFJlYWRzIHRoZSBjYXJkIGlkZW50aWZpZXIgZnJvbSB0aGUgZW52aXJvbm1lbnQuXG4gKlxuICogVGhlIGV4ZWN1dGlvbiB3cmFwcGVyIGFsd2F5cyBzZXRzIHRoaXMgZm9yIGV2ZXJ5IGFjdGlvbiBhbmQgdHlwZSBob29rLlxuICogQHJldHVybnMgVGhlIGN1cnJlbnQgY2FyZCBJRFxuICogQHRocm93cyBFcnJvciBpZiBDQVJEX0lEIGlzIG1pc3Npbmcgb3IgZW1wdHlcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBjb25zdCBjYXJkSWQgPSBnZXRDYXJkSWQoKTtcbiAqIGNvbnNvbGUubG9nKGBQcm9jZXNzaW5nIGNhcmQ6ICR7Y2FyZElkfWApO1xuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRDYXJkSWQoKTogc3RyaW5nIHtcbiAgY29uc3QgdmFsdWUgPSBwcm9jZXNzLmVudltDQVJEU19FTlZfVkFSUy5DQVJEX0lEXTtcbiAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQgfHwgdmFsdWUgPT09ICcnKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIHJlcXVpcmVkIGVudmlyb25tZW50IHZhcmlhYmxlOiAke0NBUkRTX0VOVl9WQVJTLkNBUkRfSUR9YCk7XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG4vKipcbiAqIFJlYWRzIHRoZSBlbnZpcm9ubWVudCBuYW1lIGZyb20gdGhlIGVudmlyb25tZW50LlxuICpcbiAqIFRoaXMgdmFsdWUgbWF0Y2hlcyB0aGUgZW52aXJvbm1lbnQga2V5IGluIHNldHRpbmdzLmpzb24gKGUuZy4sIFwiZGVmYXVsdFwiLCBcInN0YWdpbmdcIikuXG4gKiBAcmV0dXJucyBUaGUgZW52aXJvbm1lbnQgbmFtZVxuICogQHRocm93cyBFcnJvciBpZiBFTlZJUk9OTUVOVCBpcyBtaXNzaW5nIG9yIGVtcHR5XG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogY29uc3QgZW52aXJvbm1lbnQgPSBnZXRFbnZpcm9ubWVudCgpO1xuICogY29uc29sZS5sb2coYEVudmlyb25tZW50OiAke2Vudmlyb25tZW50fWApO1xuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRFbnZpcm9ubWVudCgpOiBzdHJpbmcge1xuICBjb25zdCB2YWx1ZSA9IHByb2Nlc3MuZW52W0NBUkRTX0VOVl9WQVJTLkVOVklST05NRU5UXTtcbiAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQgfHwgdmFsdWUgPT09ICcnKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIHJlcXVpcmVkIGVudmlyb25tZW50IHZhcmlhYmxlOiAke0NBUkRTX0VOVl9WQVJTLkVOVklST05NRU5UfWApO1xuICB9XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuLyoqXG4gKiBSZWFkcyB0aGUgYWN0aW9uIGJ1dHRvbiBuYW1lIGZyb20gdGhlIGVudmlyb25tZW50LlxuICpcbiAqIFRoaXMgaXMgdGhlIGRpc3BsYXkgbmFtZSBvZiB0aGUgYWN0aW9uIHRoYXQgdHJpZ2dlcmVkIHRoZSBoYW5kbGVyLCBtYXRjaGluZ1xuICogdGhlIGBhY3Rpb25OYW1lYCBmaWVsZCBmcm9tIGBkZWZpbmVBY3Rpb25gLlxuICogQHJldHVybnMgRGlzcGxheSBuYW1lIG9mIHRoZSBhY3Rpb24gdGhhdCB0cmlnZ2VyZWQgdGhlIGN1cnJlbnQgaGFuZGxlciBydW4uXG4gKiBAdGhyb3dzIEVycm9yIGlmIEFDVElPTl9OQU1FIGlzIG1pc3Npbmcgb3IgZW1wdHlcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBjb25zdCBhY3Rpb25OYW1lID0gZ2V0QWN0aW9uTmFtZSgpO1xuICogY29uc29sZS5sb2coYFJ1bm5pbmcgYWN0aW9uOiAke2FjdGlvbk5hbWV9YCk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldEFjdGlvbk5hbWUoKTogc3RyaW5nIHtcbiAgY29uc3QgdmFsdWUgPSBwcm9jZXNzLmVudltDQVJEU19FTlZfVkFSUy5BQ1RJT05fTkFNRV07XG4gIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IHZhbHVlID09PSAnJykge1xuICAgIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyByZXF1aXJlZCBlbnZpcm9ubWVudCB2YXJpYWJsZTogJHtDQVJEU19FTlZfVkFSUy5BQ1RJT05fTkFNRX1gKTtcbiAgfVxuICByZXR1cm4gdmFsdWU7XG59XG5cbi8qKlxuICogUmVhZHMgdGhlIGV4ZWN1dGlvbiBtb2RlIGZyb20gdGhlIGVudmlyb25tZW50LlxuICpcbiAqIERldGVybWluZXMgdGhlIFVJIGludGVyYWN0aW9uIG1vZGVsIGZvciBhY3Rpb25zLlxuICogQHJldHVybnMgVGhlIGV4ZWN1dGlvbiBtb2RlICgnaW50ZXJhY3RpdmUnIG9yICdiYWNrZ3JvdW5kJylcbiAqIEB0aHJvd3MgRXJyb3IgaWYgRVhFQ1VUSU9OX01PREUgaXMgbWlzc2luZywgZW1wdHksIG9yIGludmFsaWRcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBjb25zdCBtb2RlID0gZ2V0RXhlY3V0aW9uTW9kZSgpO1xuICogaWYgKG1vZGUgPT09ICdpbnRlcmFjdGl2ZScpIHtcbiAqICAgLy8gU2hvdyB1c2VyIHByb21wdHNcbiAqIH1cbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0RXhlY3V0aW9uTW9kZSgpOiAnaW50ZXJhY3RpdmUnIHwgJ2JhY2tncm91bmQnIHtcbiAgY29uc3QgdmFsdWUgPSBwcm9jZXNzLmVudltDQVJEU19FTlZfVkFSUy5FWEVDVVRJT05fTU9ERV07XG4gIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IHZhbHVlID09PSAnJykge1xuICAgIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyByZXF1aXJlZCBlbnZpcm9ubWVudCB2YXJpYWJsZTogJHtDQVJEU19FTlZfVkFSUy5FWEVDVVRJT05fTU9ERX1gKTtcbiAgfVxuICBpZiAodmFsdWUgIT09ICdpbnRlcmFjdGl2ZScgJiYgdmFsdWUgIT09ICdiYWNrZ3JvdW5kJykge1xuICAgIHRocm93IG5ldyBFcnJvcihgSW52YWxpZCAke0NBUkRTX0VOVl9WQVJTLkVYRUNVVElPTl9NT0RFfTogZXhwZWN0ZWQgJ2ludGVyYWN0aXZlJyBvciAnYmFja2dyb3VuZCcsIGdvdCBcIiR7dmFsdWV9XCJgKTtcbiAgfVxuICByZXR1cm4gdmFsdWU7XG59XG5cbi8qKlxuICogUmVhZHMgdGhlIEFQSSBiYXNlIFVSTCBmcm9tIHRoZSBlbnZpcm9ubWVudC5cbiAqXG4gKiBVc2UgdGhpcyBhcyB0aGUgYmFzZSBmb3IgY29uc3RydWN0aW5nIEFQSSBlbmRwb2ludHMuIFRoZSBVUkwgZG9lcyBub3QgaW5jbHVkZVxuICogYSB0cmFpbGluZyBzbGFzaC5cbiAqIEByZXR1cm5zIEJhc2UgVVJMIHVzZWQgdG8gY29uc3RydWN0IENhcmRzIEFQSSBlbmRwb2ludHMgZm9yIHRoaXMgZXhlY3V0aW9uLlxuICogQHRocm93cyBFcnJvciBpZiBBUElfQkFTRV9VUkwgaXMgbWlzc2luZyBvciBlbXB0eVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGNvbnN0IGFwaVVybCA9IGdldEFwaUJhc2VVcmwoKTtcbiAqIGNvbnN0IGVuZHBvaW50ID0gYCR7YXBpVXJsfS9jYXJkcy8ke2NhcmRJZH1gO1xuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRBcGlCYXNlVXJsKCk6IHN0cmluZyB7XG4gIGNvbnN0IHZhbHVlID0gcHJvY2Vzcy5lbnZbQ0FSRFNfRU5WX1ZBUlMuQVBJX0JBU0VfVVJMXTtcbiAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQgfHwgdmFsdWUgPT09ICcnKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIHJlcXVpcmVkIGVudmlyb25tZW50IHZhcmlhYmxlOiAke0NBUkRTX0VOVl9WQVJTLkFQSV9CQVNFX1VSTH1gKTtcbiAgfVxuICByZXR1cm4gdmFsdWU7XG59XG5cbi8qKlxuICogUmVhZHMgdGhlIEFQSSBhY2Nlc3MgdG9rZW4gZnJvbSB0aGUgZW52aXJvbm1lbnQuXG4gKlxuICogQmVhcmVyIHRva2VuIHZhbGlkIGZvciB0aGUgZHVyYXRpb24gb2YgdGhpcyBhY3Rpb24gb3IgdHlwZSBob29rIGV4ZWN1dGlvbi5cbiAqIEluY2x1ZGUgaW4gQXV0aG9yaXphdGlvbiBoZWFkZXJzIHdoZW4gY2FsbGluZyB0aGUgQ2FyZHMgQVBJLlxuICogQHJldHVybnMgQmVhcmVyIHRva2VuIHRoYXQgYXV0aG9yaXplcyBBUEkgcmVxdWVzdHMgZm9yIHRoaXMgZXhlY3V0aW9uIGNvbnRleHQuXG4gKiBAdGhyb3dzIEVycm9yIGlmIEFQSV9BQ0NFU1NfVE9LRU4gaXMgbWlzc2luZyBvciBlbXB0eVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGNvbnN0IHRva2VuID0gZ2V0QXBpQWNjZXNzVG9rZW4oKTtcbiAqIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZmV0Y2goYXBpVXJsLCB7XG4gKiAgIGhlYWRlcnM6IHsgQXV0aG9yaXphdGlvbjogYEJlYXJlciAke3Rva2VufWAgfVxuICogfSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldEFwaUFjY2Vzc1Rva2VuKCk6IHN0cmluZyB7XG4gIGNvbnN0IHZhbHVlID0gcHJvY2Vzcy5lbnZbQ0FSRFNfRU5WX1ZBUlMuQVBJX0FDQ0VTU19UT0tFTl07XG4gIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IHZhbHVlID09PSAnJykge1xuICAgIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyByZXF1aXJlZCBlbnZpcm9ubWVudCB2YXJpYWJsZTogJHtDQVJEU19FTlZfVkFSUy5BUElfQUNDRVNTX1RPS0VOfWApO1xuICB9XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuLyoqXG4gKiBSZWFkcyB0aGUgY29uZmlndXJlZCBjb2RpbmcgYWdlbnQgaWRlbnRpZmllciBmcm9tIHRoZSBlbnZpcm9ubWVudC5cbiAqXG4gKiBPcHRpb25hbCB2YWx1ZSBmcm9tIGNhcmRzLmNvZGluZ0FnZW50IHNldHRpbmcuIFdoZW4gc2V0LCBpbmRpY2F0ZXMgd2hpY2ggQUlcbiAqIGNvZGluZyBhc3Npc3RhbnQgdGhlIHVzZXIgcHJlZmVycy4gQWN0aW9ucyBjYW4gdXNlIHRoaXMgdG8gY3VzdG9taXplIGJlaGF2aW9yXG4gKiBvciBwcm9tcHRzIGZvciBkaWZmZXJlbnQgYWdlbnRzLlxuICogQHJldHVybnMgVGhlIGNvZGluZyBhZ2VudCBpZGVudGlmaWVyLCBvciB1bmRlZmluZWQgaWYgbm90IHNldFxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGNvbnN0IGNvZGluZ0FnZW50ID0gZ2V0Q29kaW5nQWdlbnQoKTtcbiAqIGlmIChjb2RpbmdBZ2VudCA9PT0gJ2NsYXVkZScpIHtcbiAqICAgLy8gQ3VzdG9taXplIGZvciBDbGF1ZGVcbiAqIH1cbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0Q29kaW5nQWdlbnQoKTogc3RyaW5nIHwgdW5kZWZpbmVkIHtcbiAgY29uc3QgdmFsdWUgPSBwcm9jZXNzLmVudltDQVJEU19FTlZfVkFSUy5DT0RJTkdfQUdFTlRdO1xuICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gJycpIHtcbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuLyoqXG4gKiBSZWFkcyB0aGUgcmVnaXN0ZXJlZCB0eXBlIG5hbWUgZm9yIHR5cGUgaG9va3MuXG4gKlxuICogVGhpcyB2YWx1ZSBpcyBvbmx5IHByZXNlbnQgZm9yIHR5cGUgaG9vayBldmVudHMuXG4gKiBAcmV0dXJucyBUaGUgcmVnaXN0ZXJlZCB0eXBlIG5hbWVcbiAqIEB0aHJvd3MgRXJyb3IgaWYgVFlQRV9OQU1FIGlzIG1pc3Npbmcgb3IgZW1wdHlcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBjb25zdCB0eXBlTmFtZSA9IGdldFR5cGVOYW1lKCk7XG4gKiBjb25zb2xlLmxvZyhgVHlwZTogJHt0eXBlTmFtZX1gKTtcbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0VHlwZU5hbWUoKTogc3RyaW5nIHtcbiAgY29uc3QgdmFsdWUgPSBwcm9jZXNzLmVudltDQVJEU19FTlZfVkFSUy5UWVBFX05BTUVdO1xuICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gJycpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYE1pc3NpbmcgcmVxdWlyZWQgZW52aXJvbm1lbnQgdmFyaWFibGU6ICR7Q0FSRFNfRU5WX1ZBUlMuVFlQRV9OQU1FfWApO1xuICB9XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuLyoqXG4gKiBSZWFkcyB0aGUgdHlwZSB2ZXJzaW9uIGZyb20gdGhlIGVudmlyb25tZW50LlxuICpcbiAqIFRoaXMgdmVyc2lvbiBjb21lcyBmcm9tIHRoZSB0eXBlIGNvbmZpZ3VyYXRpb24gaW4gc2V0dGluZ3MuanNvbi5cbiAqIEByZXR1cm5zIFRoZSB2ZXJzaW9uIHN0cmluZyBmcm9tIHR5cGUgY29uZmlnXG4gKiBAdGhyb3dzIEVycm9yIGlmIFRZUEVfVkVSU0lPTiBpcyBtaXNzaW5nIG9yIGVtcHR5XG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogY29uc3QgdmVyc2lvbiA9IGdldFR5cGVWZXJzaW9uKCk7XG4gKiBjb25zb2xlLmxvZyhgVmVyc2lvbjogJHt2ZXJzaW9ufWApO1xuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRUeXBlVmVyc2lvbigpOiBzdHJpbmcge1xuICBjb25zdCB2YWx1ZSA9IHByb2Nlc3MuZW52W0NBUkRTX0VOVl9WQVJTLlRZUEVfVkVSU0lPTl07XG4gIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IHZhbHVlID09PSAnJykge1xuICAgIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyByZXF1aXJlZCBlbnZpcm9ubWVudCB2YXJpYWJsZTogJHtDQVJEU19FTlZfVkFSUy5UWVBFX1ZFUlNJT059YCk7XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG4vKipcbiAqIFJlYWRzIHRoZSB0eXBlZCBmaWxlIG5hbWUgZm9yIHR5cGUgaG9vayBldmVudHMuXG4gKlxuICogVGhpcyBpcyB0aGUgZmlsZSBuYW1lIHJlbGF0aXZlIHRvIHRoZSB0eXBlIGRpcmVjdG9yeSwgbm90IGEgZnVsbCBwYXRoLlxuICogQHJldHVybnMgVGhlIGZpbGUgbmFtZSB3aXRoaW4gdGhlIHR5cGUgZGlyZWN0b3J5XG4gKiBAdGhyb3dzIEVycm9yIGlmIEZJTEVfTkFNRSBpcyBtaXNzaW5nIG9yIGVtcHR5XG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogY29uc3QgZmlsZU5hbWUgPSBnZXRGaWxlTmFtZSgpO1xuICogY29uc29sZS5sb2coYEZpbGU6ICR7ZmlsZU5hbWV9YCk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldEZpbGVOYW1lKCk6IHN0cmluZyB7XG4gIGNvbnN0IHZhbHVlID0gcHJvY2Vzcy5lbnZbQ0FSRFNfRU5WX1ZBUlMuRklMRV9OQU1FXTtcbiAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQgfHwgdmFsdWUgPT09ICcnKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIHJlcXVpcmVkIGVudmlyb25tZW50IHZhcmlhYmxlOiAke0NBUkRTX0VOVl9WQVJTLkZJTEVfTkFNRX1gKTtcbiAgfVxuICByZXR1cm4gdmFsdWU7XG59XG5cbi8qKlxuICogUmVhZHMgdGhlIGFic29sdXRlIHBhdGggdG8gdGhlIHR5cGVkIGZpbGUuXG4gKlxuICogVGhpcyBpcyB0aGUgZnVsbHkgcmVzb2x2ZWQgcGF0aCBvbiBkaXNrIHByb3ZpZGVkIGJ5IHRoZSBleGVjdXRpb24gd3JhcHBlci5cbiAqIEByZXR1cm5zIFRoZSBmdWxsIHBhdGggdG8gdGhlIGZpbGVcbiAqIEB0aHJvd3MgRXJyb3IgaWYgRklMRV9QQVRIIGlzIG1pc3Npbmcgb3IgZW1wdHlcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBjb25zdCBmaWxlUGF0aCA9IGdldEZpbGVQYXRoKCk7XG4gKiBjb25zb2xlLmxvZyhgUGF0aDogJHtmaWxlUGF0aH1gKTtcbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0RmlsZVBhdGgoKTogc3RyaW5nIHtcbiAgY29uc3QgdmFsdWUgPSBwcm9jZXNzLmVudltDQVJEU19FTlZfVkFSUy5GSUxFX1BBVEhdO1xuICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gJycpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYE1pc3NpbmcgcmVxdWlyZWQgZW52aXJvbm1lbnQgdmFyaWFibGU6ICR7Q0FSRFNfRU5WX1ZBUlMuRklMRV9QQVRIfWApO1xuICB9XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuLyoqXG4gKiBSZWFkcyB0aGUgdHlwZWQgZmlsZSBzaXplIGZyb20gdGhlIGVudmlyb25tZW50LlxuICpcbiAqIFRoZSB2YWx1ZSBpcyBwYXJzZWQgYXMgYSBiYXNlLTEwIGludGVnZXIuXG4gKiBAcmV0dXJucyBUaGUgZmlsZSBzaXplIGluIGJ5dGVzXG4gKiBAdGhyb3dzIEVycm9yIGlmIEZJTEVfU0laRSBpcyBtaXNzaW5nIG9yIG5vdCBhIG51bWJlclxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGNvbnN0IHNpemUgPSBnZXRGaWxlU2l6ZSgpO1xuICogY29uc29sZS5sb2coYFNpemU6ICR7c2l6ZX0gYnl0ZXNgKTtcbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0RmlsZVNpemUoKTogbnVtYmVyIHtcbiAgY29uc3QgdmFsdWUgPSBwcm9jZXNzLmVudltDQVJEU19FTlZfVkFSUy5GSUxFX1NJWkVdO1xuICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gJycpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYE1pc3NpbmcgcmVxdWlyZWQgZW52aXJvbm1lbnQgdmFyaWFibGU6ICR7Q0FSRFNfRU5WX1ZBUlMuRklMRV9TSVpFfWApO1xuICB9XG4gIGNvbnN0IHNpemUgPSBOdW1iZXIucGFyc2VJbnQodmFsdWUsIDEwKTtcbiAgaWYgKE51bWJlci5pc05hTihzaXplKSkge1xuICAgIHRocm93IG5ldyBFcnJvcihgSW52YWxpZCAke0NBUkRTX0VOVl9WQVJTLkZJTEVfU0laRX06IGV4cGVjdGVkIG51bWJlciwgZ290IFwiJHt2YWx1ZX1cImApO1xuICB9XG4gIHJldHVybiBzaXplO1xufVxuXG4vKipcbiAqIFJlYWRzIHRoZSBTSEEyNTYgaGFzaCBmb3IgdGhlIHR5cGVkIGZpbGUgY29udGVudC5cbiAqXG4gKiBVc2VmdWwgZm9yIGRldGVjdGluZyBjb250ZW50IGNoYW5nZXMgd2l0aG91dCByZWFkaW5nIHRoZSBmaWxlIGFnYWluLlxuICogQHJldHVybnMgVGhlIFNIQTI1NiBoYXNoIG9mIHRoZSBjb250ZW50XG4gKiBAdGhyb3dzIEVycm9yIGlmIFNIQTI1NiBpcyBtaXNzaW5nIG9yIGVtcHR5XG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogY29uc3QgaGFzaCA9IGdldFNoYTI1NigpO1xuICogY29uc29sZS5sb2coYEhhc2g6ICR7aGFzaH1gKTtcbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0U2hhMjU2KCk6IHN0cmluZyB7XG4gIGNvbnN0IHZhbHVlID0gcHJvY2Vzcy5lbnZbQ0FSRFNfRU5WX1ZBUlMuU0hBMjU2XTtcbiAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQgfHwgdmFsdWUgPT09ICcnKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIHJlcXVpcmVkIGVudmlyb25tZW50IHZhcmlhYmxlOiAke0NBUkRTX0VOVl9WQVJTLlNIQTI1Nn1gKTtcbiAgfVxuICByZXR1cm4gdmFsdWU7XG59XG5cbi8qKlxuICogUmVhZHMgdGhlIE1JTUUgdHlwZSBmb3IgdGhlIHR5cGVkIGZpbGUgY29udGVudC5cbiAqXG4gKiBQcm92aWRlZCBmb3IgdHlwZSBob29rIGV2ZW50cyBzbyB2YWxpZGF0b3JzIGNhbiBicmFuY2ggb24gY29udGVudCB0eXBlLlxuICogQHJldHVybnMgVGhlIE1JTUUgdHlwZSBvZiB0aGUgY29udGVudFxuICogQHRocm93cyBFcnJvciBpZiBDT05URU5UX1RZUEUgaXMgbWlzc2luZyBvciBlbXB0eVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGNvbnN0IGNvbnRlbnRUeXBlID0gZ2V0Q29udGVudFR5cGUoKTtcbiAqIGNvbnNvbGUubG9nKGBDb250ZW50IHR5cGU6ICR7Y29udGVudFR5cGV9YCk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldENvbnRlbnRUeXBlKCk6IHN0cmluZyB7XG4gIGNvbnN0IHZhbHVlID0gcHJvY2Vzcy5lbnZbQ0FSRFNfRU5WX1ZBUlMuQ09OVEVOVF9UWVBFXTtcbiAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQgfHwgdmFsdWUgPT09ICcnKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIHJlcXVpcmVkIGVudmlyb25tZW50IHZhcmlhYmxlOiAke0NBUkRTX0VOVl9WQVJTLkNPTlRFTlRfVFlQRX1gKTtcbiAgfVxuICByZXR1cm4gdmFsdWU7XG59XG5cbi8qKlxuICogUmVhZHMgdGhlIFZTIENvZGUgYnVuZGxlZCBOb2RlLmpzIGludGVycHJldGVyIHBhdGggZnJvbSB0aGUgZW52aXJvbm1lbnQuXG4gKlxuICogVGhpcyBpcyBzZXQgYnkgdGhlIGV4dGVuc2lvbiBkdXJpbmcgYWN0aXZhdGlvbiBhbmQgaW5qZWN0ZWQgaW50byBhbGxcbiAqIHNwYXduZWQgYWN0aW9uL2hvb2sgcHJvY2Vzc2VzLiBDb25maWd1cmF0aW9uIGF1dGhvcnMgY2FuIHVzZSBpdCB0byBpbnZva2VcbiAqIE5vZGUuanMgd2l0aG91dCByZWx5aW5nIG9uIHRoZSBzeXN0ZW0gUEFUSC5cbiAqXG4gKiBAcmV0dXJucyBUaGUgcGF0aCB0byB0aGUgTm9kZS5qcyBpbnRlcnByZXRlclxuICogQHRocm93cyBFcnJvciBpZiBWU0NPREVfTk9ERSBpcyBtaXNzaW5nIG9yIGVtcHR5XG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogY29uc3Qgbm9kZVBhdGggPSBnZXRWc2NvZGVOb2RlUGF0aCgpO1xuICogZXhlY0ZpbGVTeW5jKG5vZGVQYXRoLCBbJ3NjcmlwdC5qcyddKTtcbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0VnNjb2RlTm9kZVBhdGgoKTogc3RyaW5nIHtcbiAgY29uc3QgdmFsdWUgPSBwcm9jZXNzLmVudltDQVJEU19FTlZfVkFSUy5WU0NPREVfTk9ERV07XG4gIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IHZhbHVlID09PSAnJykge1xuICAgIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyByZXF1aXJlZCBlbnZpcm9ubWVudCB2YXJpYWJsZTogJHtDQVJEU19FTlZfVkFSUy5WU0NPREVfTk9ERX1gKTtcbiAgfVxuICByZXR1cm4gdmFsdWU7XG59XG5cbi8qKlxuICogUmVhZHMgdGhlIFVuaXggZG9tYWluIHNvY2tldCBwYXRoIGZvciBydW50aW1lLXRvLWRpc3BhdGNoZXIgY29tbXVuaWNhdGlvbi5cbiAqXG4gKiBAcmV0dXJucyBVbml4IHNvY2tldCBwYXRoIHVzZWQgdG8gc2VuZCBydW50aW1lIGNvbnRyb2wgbWVzc2FnZXMuXG4gKiBAdGhyb3dzIEVycm9yIGlmIFNPQ0tFVF9QQVRIIGlzIG1pc3Npbmcgb3IgZW1wdHlcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldFNvY2tldFBhdGgoKTogc3RyaW5nIHtcbiAgY29uc3QgdmFsdWUgPSBwcm9jZXNzLmVudltDQVJEU19FTlZfVkFSUy5TT0NLRVRfUEFUSF07XG4gIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IHZhbHVlID09PSAnJykge1xuICAgIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyByZXF1aXJlZCBlbnZpcm9ubWVudCB2YXJpYWJsZTogJHtDQVJEU19FTlZfVkFSUy5TT0NLRVRfUEFUSH1gKTtcbiAgfVxuICByZXR1cm4gdmFsdWU7XG59XG5cbi8qKlxuICogUmVhZHMgdGhlIHBhdGggdG8gdGhlIHN3aXRjaFRvSW50ZXJhY3RpdmUgZGF0YSBmaWxlLlxuICpcbiAqIFRoaXMgaXMgb3B0aW9uYWwgXHUyMDE0IHJldHVybnMgdW5kZWZpbmVkIHdoZW4gbm90IHNldCAoaS5lLiwgdGhlIGFjdGlvblxuICogd2FzIG5vdCByZWxhdW5jaGVkIHZpYSBzd2l0Y2hUb0ludGVyYWN0aXZlKS5cbiAqXG4gKiBAcmV0dXJucyBUaGUgZmlsZSBwYXRoLCBvciB1bmRlZmluZWQgaWYgbm90IHNldFxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0U3dpdGNoVG9JbnRlcmFjdGl2ZURhdGFQYXRoKCk6IHN0cmluZyB8IHVuZGVmaW5lZCB7XG4gIGNvbnN0IHZhbHVlID0gcHJvY2Vzcy5lbnZbQ0FSRFNfRU5WX1ZBUlMuU1dJVENIX1RPX0lOVEVSQUNUSVZFX0RBVEFfUEFUSF07XG4gIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IHZhbHVlID09PSAnJykge1xuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG4vKipcbiAqIFJlYWRzIHRoZSBzZXR0aW5ncyBjb25maWd1cmF0aW9uIGRpcmVjdG9yeSBwYXRoLlxuICpcbiAqIEByZXR1cm5zIEFic29sdXRlIHBhdGggdG8gdGhlIGRpcmVjdG9yeSBjb250YWluaW5nIGdlbmVyYXRlZCBzZXR0aW5ncyBhcnRpZmFjdHMuXG4gKiBAdGhyb3dzIEVycm9yIGlmIENPTkZJR19QQVRIIGlzIG1pc3Npbmcgb3IgZW1wdHlcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldENvbmZpZ1BhdGgoKTogc3RyaW5nIHtcbiAgY29uc3QgdmFsdWUgPSBwcm9jZXNzLmVudltDQVJEU19FTlZfVkFSUy5DT05GSUdfUEFUSF07XG4gIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IHZhbHVlID09PSAnJykge1xuICAgIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyByZXF1aXJlZCBlbnZpcm9ubWVudCB2YXJpYWJsZTogJHtDQVJEU19FTlZfVkFSUy5DT05GSUdfUEFUSH1gKTtcbiAgfVxuICByZXR1cm4gdmFsdWU7XG59XG5cbi8qKlxuICogUmVhZHMgdGhlIHdvcmtzcGFjZSBwYXRoIHNldCBieSB0aGUgYWN0aW9uIGhhbmRsZXIgKGUuZy4sIHRoZSB3b3JrdHJlZSBwYXRoKS5cbiAqXG4gKiBUaGlzIGlzIGZvciBob29rcyBydW5uaW5nIGluc2lkZSB0aGUgQ2xhdWRlIENMSSwgKipub3QqKiBmb3IgYWN0aW9uIGhhbmRsZXJzLlxuICogQWN0aW9uIGhhbmRsZXJzIHNob3VsZCB1c2Uge0BsaW5rIGdldFJlcG9Sb290fSBpbnN0ZWFkLlxuICpcbiAqIEByZXR1cm5zIEFic29sdXRlIHBhdGggdG8gdGhlIGFjdGl2ZSB3b3Jrc3BhY2UgLyB3b3JrdHJlZS5cbiAqIEB0aHJvd3MgRXJyb3IgaWYgV09SS1NQQUNFX1BBVEggaXMgbWlzc2luZyBvciBlbXB0eVxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0V29ya3NwYWNlUGF0aCgpOiBzdHJpbmcge1xuICBjb25zdCB2YWx1ZSA9IHByb2Nlc3MuZW52W0NBUkRTX0VOVl9WQVJTLldPUktTUEFDRV9QQVRIXTtcbiAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQgfHwgdmFsdWUgPT09ICcnKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIHJlcXVpcmVkIGVudmlyb25tZW50IHZhcmlhYmxlOiAke0NBUkRTX0VOVl9WQVJTLldPUktTUEFDRV9QQVRIfWApO1xuICB9XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuLyoqXG4gKiBSZWFkcyB0aGUgbWFpbiBnaXQgcmVwb3NpdG9yeSByb290IHBhdGguXG4gKlxuICogU2V0IGJ5IEFjdGlvbkRpc3BhdGNoZXI7IHVzZWQgYnkgYWN0aW9uIGhhbmRsZXJzIHRvIHJlc29sdmUgd29ya3RyZWVzXG4gKiBhbmQgcGVyZm9ybSBnaXQgb3BlcmF0aW9ucyBhZ2FpbnN0IHRoZSBtYWluIHJlcG9zaXRvcnkuXG4gKlxuICogQHJldHVybnMgQWJzb2x1dGUgcGF0aCB0byB0aGUgbWFpbiBnaXQgcmVwb3NpdG9yeSByb290IChOT1QgYSB3b3JrdHJlZSkuXG4gKiBAdGhyb3dzIEVycm9yIGlmIFJFUE9fUk9PVCBpcyBtaXNzaW5nIG9yIGVtcHR5XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRSZXBvUm9vdCgpOiBzdHJpbmcge1xuICBjb25zdCB2YWx1ZSA9IHByb2Nlc3MuZW52W0NBUkRTX0VOVl9WQVJTLlJFUE9fUk9PVF07XG4gIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IHZhbHVlID09PSAnJykge1xuICAgIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyByZXF1aXJlZCBlbnZpcm9ubWVudCB2YXJpYWJsZTogJHtDQVJEU19FTlZfVkFSUy5SRVBPX1JPT1R9YCk7XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG4vKipcbiAqIFJlYWRzIHRoZSBjYXJkJ3MgcmVwb3NpdG9yeSBkaXJlY3RvcnkgcGF0aC5cbiAqXG4gKiBAcmV0dXJucyBBYnNvbHV0ZSBwYXRoIHRvIHRoZSByZXBvc2l0b3J5IGFzc29jaWF0ZWQgd2l0aCB0aGUgYWN0aXZlIGNhcmQuXG4gKiBAdGhyb3dzIEVycm9yIGlmIENBUkRfUkVQT19QQVRIIGlzIG1pc3Npbmcgb3IgZW1wdHlcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldENhcmRSZXBvUGF0aCgpOiBzdHJpbmcge1xuICBjb25zdCB2YWx1ZSA9IHByb2Nlc3MuZW52W0NBUkRTX0VOVl9WQVJTLkNBUkRfUkVQT19QQVRIXTtcbiAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQgfHwgdmFsdWUgPT09ICcnKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIHJlcXVpcmVkIGVudmlyb25tZW50IHZhcmlhYmxlOiAke0NBUkRTX0VOVl9WQVJTLkNBUkRfUkVQT19QQVRIfWApO1xuICB9XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuLyoqXG4gKiBSZWFkcyB0aGUgVlMgQ29kZSBleHRlbnNpb24gaW5zdGFsbGF0aW9uIGRpcmVjdG9yeSBwYXRoLlxuICpcbiAqIFNldCBieSB0aGUgZXh0ZW5zaW9uIGhvc3QgZnJvbSBgY29udGV4dC5leHRlbnNpb25VcmkuZnNQYXRoYCBhbmQgaW5qZWN0ZWRcbiAqIGludG8gYWxsIHNwYXduZWQgYWN0aW9uIHByb2Nlc3Nlcy4gVXNlIHRoaXMgdG8gbG9jYXRlIGJ1bmRsZWQgYXNzZXRzIHN1Y2hcbiAqIGFzIHRoZSBydW50aW1lIHBsdWdpbiBkaXJlY3RvcnkgKGA8ZXh0ZW5zaW9uUGF0aD4vZGlzdC9wbHVnaW5zL3J1bnRpbWVgKS5cbiAqXG4gKiBAcmV0dXJucyBBYnNvbHV0ZSBwYXRoIHRvIHRoZSBleHRlbnNpb24gaW5zdGFsbGF0aW9uIGRpcmVjdG9yeS5cbiAqIEB0aHJvd3MgRXJyb3IgaWYgRVhURU5TSU9OX1BBVEggaXMgbWlzc2luZyBvciBlbXB0eVxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0RXh0ZW5zaW9uUGF0aCgpOiBzdHJpbmcge1xuICBjb25zdCB2YWx1ZSA9IHByb2Nlc3MuZW52W0NBUkRTX0VOVl9WQVJTLkVYVEVOU0lPTl9QQVRIXTtcbiAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQgfHwgdmFsdWUgPT09ICcnKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIHJlcXVpcmVkIGVudmlyb25tZW50IHZhcmlhYmxlOiAke0NBUkRTX0VOVl9WQVJTLkVYVEVOU0lPTl9QQVRIfWApO1xuICB9XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuLyoqXG4gKiBSZWFkcyBhbmQgcGFyc2VzIHRoZSBzd2l0Y2hUb0ludGVyYWN0aXZlIGRhdGEgZmlsZS5cbiAqXG4gKiBXaGVuIGBTV0lUQ0hfVE9fSU5URVJBQ1RJVkVfREFUQV9QQVRIYCBpcyBzZXQsIHJlYWRzIHRoZSBmaWxlIGF0IHRoYXQgcGF0aFxuICogYW5kIHBhcnNlcyBpdCBhcyBKU09OLiBSZXR1cm5zIHVuZGVmaW5lZCBpZiB0aGUgZW52IHZhciBpcyBub3Qgc2V0LlxuICpcbiAqIEByZXR1cm5zIFRoZSBwYXJzZWQgZGF0YSwgb3IgdW5kZWZpbmVkIGlmIHRoZSBwYXRoIGlzIG5vdCBzZXRcbiAqIEB0aHJvd3MgRXJyb3IgaWYgdGhlIGZpbGUgY2Fubm90IGJlIHJlYWQgb3IgY29udGFpbnMgaW52YWxpZCBKU09OXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiByZWFkU3dpdGNoVG9JbnRlcmFjdGl2ZURhdGEoKTogdW5rbm93biB8IHVuZGVmaW5lZCB7XG4gIGNvbnN0IGRhdGFQYXRoID0gZ2V0U3dpdGNoVG9JbnRlcmFjdGl2ZURhdGFQYXRoKCk7XG4gIGlmIChkYXRhUGF0aCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfVxuICBjb25zdCBjb250ZW50ID0gcmVhZEZpbGVTeW5jKGRhdGFQYXRoLCAndXRmLTgnKTtcbiAgcmV0dXJuIEpTT04ucGFyc2UoY29udGVudCk7XG59XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIFR5cGVkIElucHV0IEV4dHJhY3Rpb25cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuLyoqXG4gKiBCdWlsZHMgYSB0eXBlZCBhY3Rpb24gaW5wdXQgb2JqZWN0IGZyb20gZW52aXJvbm1lbnQgdmFyaWFibGVzLlxuICpcbiAqIEV4dHJhY3RzIGFsbCBmaWVsZHMgcmVxdWlyZWQgZm9yIGFjdGlvbiBoYW5kbGVycy5cbiAqXG4gKiBAcmV0dXJucyBUeXBlZCBBY3Rpb25JbnB1dCBvYmplY3RcbiAqIEB0aHJvd3MgRXJyb3IgaWYgcmVxdWlyZWQgZW52IHZhcnMgYXJlIG1pc3Npbmcgb3IgaW52YWxpZFxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIC8vIEZvciBhbiBhY3Rpb24gaGFuZGxlclxuICogY29uc3QgaW5wdXQgPSBleHRyYWN0QWN0aW9uSW5wdXQoKTtcbiAqIGNvbnNvbGUubG9nKGlucHV0LmNhcmRJZCk7XG4gKiBjb25zb2xlLmxvZyhpbnB1dC5leGVjdXRpb25Nb2RlKTtcbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gZXh0cmFjdEFjdGlvbklucHV0KCk6IEFjdGlvbklucHV0IHtcbiAgcmV0dXJuIHtcbiAgICBjYXJkSWQ6IGdldENhcmRJZCgpLFxuICAgIGFjdGlvbk5hbWU6IGdldEFjdGlvbk5hbWUoKSxcbiAgICBlbnZpcm9ubWVudDogZ2V0RW52aXJvbm1lbnQoKSxcbiAgICBleGVjdXRpb25Nb2RlOiBnZXRFeGVjdXRpb25Nb2RlKCksXG4gICAgYXBpQmFzZVVybDogZ2V0QXBpQmFzZVVybCgpLFxuICAgIGFwaUFjY2Vzc1Rva2VuOiBnZXRBcGlBY2Nlc3NUb2tlbigpLFxuICAgIGNvZGluZ0FnZW50OiBnZXRDb2RpbmdBZ2VudCgpLFxuICAgIHN3aXRjaFRvSW50ZXJhY3RpdmVEYXRhOiByZWFkU3dpdGNoVG9JbnRlcmFjdGl2ZURhdGEoKSxcbiAgICByZXBvUm9vdDogZ2V0UmVwb1Jvb3QoKSxcbiAgICBjYXJkUmVwb1BhdGg6IGdldENhcmRSZXBvUGF0aCgpLFxuICAgIGNvbmZpZ1BhdGg6IGdldENvbmZpZ1BhdGgoKSxcbiAgICBleHRlbnNpb25QYXRoOiBnZXRFeHRlbnNpb25QYXRoKClcbiAgfTtcbn1cblxuLyoqXG4gKiBCdWlsZHMgYSB0eXBlZCB0eXBlIGhvb2sgaW5wdXQgb2JqZWN0IGZyb20gZW52aXJvbm1lbnQgdmFyaWFibGVzLlxuICpcbiAqIEV4dHJhY3RzIGFsbCBmaWVsZHMgcmVxdWlyZWQgZm9yIHR5cGUgbGlmZWN5Y2xlIGhvb2tzICh2YWxpZGF0b3IsIGNyZWF0ZSxcbiAqIHVwZGF0ZSwgZGVsZXRlKS5cbiAqXG4gKiBAcmV0dXJucyBUeXBlZCBUeXBlSG9va0lucHV0IG9iamVjdFxuICogQHRocm93cyBFcnJvciBpZiByZXF1aXJlZCBlbnYgdmFycyBhcmUgbWlzc2luZyBvciBpbnZhbGlkXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogLy8gRm9yIGEgdHlwZSBob29rIGhhbmRsZXJcbiAqIGNvbnN0IGlucHV0ID0gZXh0cmFjdFR5cGVJbnB1dCgpO1xuICogY29uc29sZS5sb2coaW5wdXQudHlwZU5hbWUpO1xuICogY29uc29sZS5sb2coaW5wdXQuZmlsZU5hbWUpO1xuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBleHRyYWN0VHlwZUlucHV0KCk6IFR5cGVIb29rSW5wdXQge1xuICByZXR1cm4ge1xuICAgIGNhcmRJZDogZ2V0Q2FyZElkKCksXG4gICAgZW52aXJvbm1lbnQ6IGdldEVudmlyb25tZW50KCksXG4gICAgdHlwZU5hbWU6IGdldFR5cGVOYW1lKCksXG4gICAgdHlwZVZlcnNpb246IGdldFR5cGVWZXJzaW9uKCksXG4gICAgZmlsZU5hbWU6IGdldEZpbGVOYW1lKCksXG4gICAgZmlsZVBhdGg6IGdldEZpbGVQYXRoKCksXG4gICAgZmlsZVNpemU6IGdldEZpbGVTaXplKCksXG4gICAgZmlsZVNoYTI1NjogZ2V0U2hhMjU2KCksXG4gICAgY29udGVudFR5cGU6IGdldENvbnRlbnRUeXBlKCksXG4gICAgYXBpQmFzZVVybDogZ2V0QXBpQmFzZVVybCgpLFxuICAgIGFwaUFjY2Vzc1Rva2VuOiBnZXRBcGlBY2Nlc3NUb2tlbigpXG4gIH07XG59XG4iLCAiLyoqXG4gKiBFeGl0IGNvZGUgY29uc3RhbnRzIGFuZCBoZWxwZXJzIGZvciBDYXJkcyBFeHRlbnNpb24gaG9va3MuXG4gKlxuICogQ2FyZHMgaG9va3MgY29tbXVuaWNhdGUgc3VjY2VzcyBhbmQgZmFpbHVyZSB2aWEgcHJvY2VzcyBleGl0IGNvZGVzIGFuZFxuICogc3RkZXJyIG91dHB1dC4gVGhpcyBtb2R1bGUgY2VudHJhbGl6ZXMgdGhvc2UgY29udmVudGlvbnMgc28gdGhlIHJ1bnRpbWVcbiAqIGFuZCBob29rcyBzcGVhayB0aGUgc2FtZSBwcm90b2NvbC5cbiAqXG4gKiBAc3VtbWFyeSBFeGl0IGNvZGUgY29uc3RhbnRzIGFuZCBoZWxwZXJzIGZvciBDYXJkcyBFeHRlbnNpb24gaG9va3NcbiAqIEBtb2R1bGVcbiAqL1xuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBFeGl0IENvZGUgQ29uc3RhbnRzXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbi8qKlxuICogRXhpdCBjb2RlcyB1c2VkIGJ5IENhcmRzIGhvb2tzLlxuICpcbiAqIFRoZSBDYXJkcyBydW50aW1lIGludGVycHJldHMgYW55IG5vbi16ZXJvIGV4aXQgY29kZSBhcyBmYWlsdXJlLlxuICovXG5leHBvcnQgY29uc3QgRVhJVF9DT0RFUyA9IHtcbiAgLyoqIEhhbmRsZXIgY29tcGxldGVkIHN1Y2Nlc3NmdWxseS4gKi9cbiAgU1VDQ0VTUzogMCxcbiAgLyoqIEhhbmRsZXIgdGhyZXcgYW4gZXJyb3IuICovXG4gIEVSUk9SOiAxLFxuICAvKiogSGFuZGxlciBwcm9jZXNzZWQgc3dpdGNoVG9JbnRlcmFjdGl2ZSBhbmQgaXMgZXhpdGluZyBmb3IgcmVsYXVuY2guICovXG4gIFNXSVRDSF9UT19JTlRFUkFDVElWRTogNDJcbn0gYXMgY29uc3Q7XG5cbi8qKlxuICogVW5pb24gb2YgdmFsaWQgQ2FyZHMgaG9vayBleGl0IGNvZGVzLlxuICovXG5leHBvcnQgdHlwZSBFeGl0Q29kZSA9ICh0eXBlb2YgRVhJVF9DT0RFUylba2V5b2YgdHlwZW9mIEVYSVRfQ09ERVNdO1xuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBFcnJvciBPdXRwdXQgSGVscGVyc1xuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4vKipcbiAqIFdyaXRlcyBhbiBlcnJvciBtZXNzYWdlIHRvIHN0ZGVyciB3aXRoIGEgdHJhaWxpbmcgbmV3bGluZS5cbiAqXG4gKiBVc2UgdGhpcyB3aGVuIGEgaG9vayBuZWVkcyB0byByZXBvcnQgYSBmYWlsdXJlIHdpdGhvdXQgcG9sbHV0aW5nIHN0ZG91dC5cbiAqIEBwYXJhbSBtZXNzYWdlIC0gRXJyb3IgbWVzc2FnZSB0byB3cml0ZVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIHdyaXRlRXJyb3IoJ0ZhaWxlZCB0byBjb25uZWN0IHRvIGRhdGFiYXNlJyk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHdyaXRlRXJyb3IobWVzc2FnZTogc3RyaW5nKTogdm9pZCB7XG4gIHByb2Nlc3Muc3RkZXJyLndyaXRlKGAke21lc3NhZ2V9XFxuYCk7XG59XG5cbi8qKlxuICogV3JpdGVzIGFuIGVycm9yIG1lc3NhZ2UgdG8gc3RkZXJyIGFuZCBleGl0cyB3aXRoIEVSUk9SIGNvZGUuXG4gKlxuICogVGhpcyB0ZXJtaW5hdGVzIHRoZSBwcm9jZXNzIGltbWVkaWF0ZWx5LCBzbyBhbnkgcGVuZGluZyBhc3luYyB3b3JrIHdpbGxcbiAqIG5vdCBmaW5pc2ggdW5sZXNzIGl0IHdhcyBhbHJlYWR5IGF3YWl0ZWQuXG4gKiBAcGFyYW0gbWVzc2FnZSAtIEVycm9yIG1lc3NhZ2UgdG8gd3JpdGUgYmVmb3JlIGV4aXRpbmdcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBpZiAoIWlzVmFsaWQpIHtcbiAqICAgZXhpdFdpdGhFcnJvcignSW52YWxpZCBjb25maWd1cmF0aW9uJyk7XG4gKiB9XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGV4aXRXaXRoRXJyb3IobWVzc2FnZTogc3RyaW5nKTogbmV2ZXIge1xuICB3cml0ZUVycm9yKG1lc3NhZ2UpO1xuICBwcm9jZXNzLmV4aXQoRVhJVF9DT0RFUy5FUlJPUik7XG59XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIEludGVybmFsIFJlc3VsdCBUcmFja2luZ1xuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4vKipcbiAqIEludGVybmFsIHJ1bnRpbWUgYm9va2tlZXBpbmcgZm9yIGhvb2sgZXhlY3V0aW9uIHJlc3VsdHMuXG4gKlxuICogVGhpcyBzdHJ1Y3R1cmUgYWxsb3dzIHRoZSBydW50aW1lIHRvIGNhcnJ5IGVycm9yIGRldGFpbHMgd2l0aG91dCBjaGFuZ2luZ1xuICogdGhlIGV4aXQtY29kZSBwcm90b2NvbC5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBIb29rRXhlY3V0aW9uUmVzdWx0IHtcbiAgLyoqIFdoZXRoZXIgdGhlIGhvb2sgZXhlY3V0ZWQgc3VjY2Vzc2Z1bGx5LiAqL1xuICBzdWNjZXNzOiBib29sZWFuO1xuICAvKiogVGhlIGV4aXQgY29kZSB0byB1c2Ugd2hlbiBleGl0aW5nLiAqL1xuICBleGl0Q29kZTogRXhpdENvZGU7XG4gIC8qKiBUaGUgZXJyb3IgdGhhdCBvY2N1cnJlZCwgaWYgYW55LiAqL1xuICBlcnJvcj86IEVycm9yO1xufVxuIiwgIi8qKlxuICogU3RydWN0dXJlZCBsb2dnaW5nIGZvciBDYXJkcyBFeHRlbnNpb24gaG9va3MuXG4gKlxuICogT3V0cHV0IGlzIG9wdC1pbjogdGhlIGxvZ2dlciBvbmx5IGVtaXRzIHRvIHJlZ2lzdGVyZWQgaGFuZGxlcnMgb3IgYVxuICogY29uZmlndXJlZCBsb2cgZmlsZS4gSWYgeW91IGNvbmZpZ3VyZSBub3RoaW5nLCB0aGUgbG9nZ2VyIHBvbGl0ZWx5IHNheXNcbiAqIG5vdGhpbmcgYXQgYWxsLiBJdCBuZXZlciB3cml0ZXMgdG8gc3Rkb3V0IGFuZCBhdm9pZHMgc3RkZXJyIHRvIGtlZXAgaG9va1xuICogcHJvdG9jb2xzIGNsZWFuLlxuICpcbiAqIEBzdW1tYXJ5IFN0cnVjdHVyZWQgbG9nZ2luZyBmb3IgQ2FyZHMgRXh0ZW5zaW9uIGhvb2tzXG4gKiBAbW9kdWxlXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogaW1wb3J0IHsgbG9nZ2VyIH0gZnJvbSAnQGNhcmRzL3Nkay9jb25maWcnO1xuICpcbiAqIC8vIFN1YnNjcmliZSB0byBsb2cgZXZlbnRzXG4gKiBjb25zdCB1bnN1YnNjcmliZSA9IGxvZ2dlci5vbignZXJyb3InLCAoZXZlbnQpID0+IHtcbiAqICAgY29uc29sZS5lcnJvcihgRXJyb3IgaW4gJHtldmVudC5ob29rVHlwZX06ICR7ZXZlbnQubWVzc2FnZX1gKTtcbiAqIH0pO1xuICpcbiAqIC8vIExhdGVyLCBjbGVhbiB1cFxuICogdW5zdWJzY3JpYmUoKTtcbiAqIGBgYFxuICovXG5cbmltcG9ydCB7IGNsb3NlU3luYywgZXhpc3RzU3luYywgbWtkaXJTeW5jLCBvcGVuU3luYywgd3JpdGVTeW5jIH0gZnJvbSAnbm9kZTpmcyc7XG5pbXBvcnQgeyBkaXJuYW1lIH0gZnJvbSAnbm9kZTpwYXRoJztcblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gTG9nIExldmVsIFR5cGVzXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbi8qKlxuICogQXZhaWxhYmxlIGxvZyBsZXZlbHMuXG4gKlxuICogfCBMZXZlbCB8IFNldmVyaXR5IHwgVXNlIENhc2UgfFxuICogfC0tLS0tLS18LS0tLS0tLS0tLXwtLS0tLS0tLS0tfFxuICogfCBgZGVidWdgIHwgTG93ZXN0IHwgRGV0YWlsZWQgZGVidWdnaW5nIGluZm9ybWF0aW9uIHxcbiAqIHwgYGluZm9gIHwgTG93IHwgR2VuZXJhbCBvcGVyYXRpb25hbCBldmVudHMgfFxuICogfCBgd2FybmAgfCBNZWRpdW0gfCBXYXJuaW5nIGNvbmRpdGlvbnMgdGhhdCBtYXkgaW5kaWNhdGUgaXNzdWVzIHxcbiAqIHwgYGVycm9yYCB8IEhpZ2ggfCBFcnJvciBjb25kaXRpb25zIHJlcXVpcmluZyBhdHRlbnRpb24gfFxuICovXG5leHBvcnQgdHlwZSBMb2dMZXZlbCA9ICdkZWJ1ZycgfCAnaW5mbycgfCAnd2FybicgfCAnZXJyb3InO1xuXG4vKipcbiAqIEFsbCBsb2cgbGV2ZWxzIGluIG9yZGVyIG9mIHNldmVyaXR5IChsb3dlc3QgdG8gaGlnaGVzdCkuXG4gKi9cbmV4cG9ydCBjb25zdCBMT0dfTEVWRUxTID0gWydkZWJ1ZycsICdpbmZvJywgJ3dhcm4nLCAnZXJyb3InXSBhcyBjb25zdCBzYXRpc2ZpZXMgcmVhZG9ubHkgTG9nTGV2ZWxbXTtcblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gTG9nIEV2ZW50IFR5cGVcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuLyoqXG4gKiBTdHJ1Y3R1cmVkIGxvZyBldmVudCBlbWl0dGVkIGJ5IHRoZSBsb2dnZXIuXG4gKlxuICogRXZlbnRzIGluY2x1ZGUgY29udGV4dHVhbCBkZXRhaWxzIGFib3V0IGhvb2sgZXhlY3V0aW9uIGFuZCBhcmUgc3VpdGFibGUgZm9yXG4gKiBkZWJ1Z2dpbmcsIG1vbml0b3JpbmcsIGFuZCBhbmFseXRpY3MgcGlwZWxpbmVzLlxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIC8vIEV4YW1wbGUgbG9nIGV2ZW50XG4gKiBjb25zdCBldmVudDogTG9nRXZlbnQgPSB7XG4gKiAgIHRpbWVzdGFtcDogJzIwMjQtMDEtMTVUMTA6MzA6MDAuMDAwWicsXG4gKiAgIGxldmVsOiAnd2FybicsXG4gKiAgIGhvb2tUeXBlOiAnYWN0aW9uLXN0YXJ0JyxcbiAqICAgbWVzc2FnZTogJ0NhcmQgc3RhcnRlZCcsXG4gKiAgIGlucHV0OiB7IGNhcmRJZDogJ2NhcmQtMTIzJyB9XG4gKiB9O1xuICogYGBgXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgTG9nRXZlbnQge1xuICAvKipcbiAgICogSVNPIDg2MDEgdGltZXN0YW1wIG9mIHdoZW4gdGhlIGV2ZW50IG9jY3VycmVkLlxuICAgKiBAZXhhbXBsZSAnMjAyNC0wMS0xNVQxMDozMDowMC4wMDBaJ1xuICAgKi9cbiAgdGltZXN0YW1wOiBzdHJpbmc7XG5cbiAgLyoqXG4gICAqIFNldmVyaXR5IGxldmVsIG9mIHRoZSBsb2cgZXZlbnQuXG4gICAqL1xuICBsZXZlbDogTG9nTGV2ZWw7XG5cbiAgLyoqXG4gICAqIFR5cGUgb2YgaG9vayB0aGF0IGdlbmVyYXRlZCB0aGlzIGV2ZW50LlxuICAgKiBNYXkgYmUgdW5kZWZpbmVkIGZvciBldmVudHMgb3V0c2lkZSBob29rIGNvbnRleHQuXG4gICAqL1xuICBob29rVHlwZT86IHN0cmluZztcblxuICAvKipcbiAgICogSHVtYW4tcmVhZGFibGUgZGVzY3JpcHRpb24gb2Ygd2hhdCBoYXBwZW5lZC5cbiAgICovXG4gIG1lc3NhZ2U6IHN0cmluZztcblxuICAvKipcbiAgICogSG9vayBpbnB1dCBkYXRhIGF0IHRoZSB0aW1lIG9mIGxvZ2dpbmcuXG4gICAqXG4gICAqIFRoaXMgaXMgcGFydGlhbCBieSBkZXNpZ24sIHNvIHlvdSBjYW4gYXZvaWQgbG9nZ2luZyBsYXJnZSBvciBzZW5zaXRpdmVcbiAgICogcGF5bG9hZHMgd2hpbGUgc3RpbGwgY2FwdHVyaW5nIGtleSBpZGVudGlmaWVycy5cbiAgICovXG4gIGlucHV0PzogUmVjb3JkPHN0cmluZywgdW5rbm93bj47XG5cbiAgLyoqXG4gICAqIEVycm9yIGluZm9ybWF0aW9uIGlmIHRoaXMgZXZlbnQgcmVwcmVzZW50cyBhbiBlcnJvci5cbiAgICogQ29udGFpbnMgc3RydWN0dXJlZCBlcnJvciBkZXRhaWxzIGZvciBhbmFseXNpcy5cbiAgICovXG4gIGVycm9yPzogTG9nRXZlbnRFcnJvcjtcblxuICAvKipcbiAgICogQWRkaXRpb25hbCBjb250ZXh0IGRhdGEgcHJvdmlkZWQgYnkgdGhlIGNhbGxlci5cbiAgICpcbiAgICogVXNlIHRoaXMgZm9yIHN0cnVjdHVyZWQgbWV0YWRhdGEgdGhhdCB5b3Ugd2FudCBkb3duc3RyZWFtIGhhbmRsZXJzXG4gICAqIHRvIHJlY2VpdmUgKGUuZy4sIHJlcXVlc3QgSURzLCB0aW1pbmcgZGF0YSkuXG4gICAqL1xuICBjb250ZXh0PzogUmVjb3JkPHN0cmluZywgdW5rbm93bj47XG59XG5cbi8qKlxuICogU3RydWN0dXJlZCBlcnJvciBpbmZvcm1hdGlvbiB3aXRoaW4gYSBsb2cgZXZlbnQuXG4gKlxuICogRXJyb3JzIGFyZSBub3JtYWxpemVkIHNvIGhhbmRsZXJzIGNhbiBkZXBlbmQgb24gY29uc2lzdGVudCBzaGFwZSwgZXZlbiB3aGVuXG4gKiBjYWxsZXJzIHRocm93IG5vbi1FcnJvciB2YWx1ZXMuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgTG9nRXZlbnRFcnJvciB7XG4gIC8qKlxuICAgKiBFcnJvciBuYW1lIChlLmcuLCAnVHlwZUVycm9yJywgJ1ZhbGlkYXRpb25FcnJvcicpLlxuICAgKi9cbiAgbmFtZTogc3RyaW5nO1xuXG4gIC8qKlxuICAgKiBFcnJvciBtZXNzYWdlIGRlc2NyaWJpbmcgd2hhdCB3ZW50IHdyb25nLlxuICAgKi9cbiAgbWVzc2FnZTogc3RyaW5nO1xuXG4gIC8qKlxuICAgKiBTdGFjayB0cmFjZSBpZiBhdmFpbGFibGUuXG4gICAqL1xuICBzdGFjaz86IHN0cmluZztcblxuICAvKipcbiAgICogRXJyb3IgY2F1c2UgY2hhaW4gaWYgdGhlIGVycm9yIHdhcyB3cmFwcGVkLlxuICAgKi9cbiAgY2F1c2U/OiBMb2dFdmVudEVycm9yO1xufVxuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBFdmVudCBIYW5kbGVyIFR5cGVcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuLyoqXG4gKiBIYW5kbGVyIGludm9rZWQgd2hlbiBhIGxvZyBldmVudCBpcyBlbWl0dGVkLlxuICpcbiAqIEhhbmRsZXJzIHJ1biBzeW5jaHJvbm91c2x5LiBFcnJvcnMgdGhyb3duIGJ5IGEgaGFuZGxlciBhcmUgc3dhbGxvd2VkIHNvXG4gKiBsb2dnaW5nIGNhbm5vdCBicmVhayBob29rIGV4ZWN1dGlvbi5cbiAqIEBwYXJhbSBldmVudCAtIFRoZSBsb2cgZXZlbnQgdG8gaGFuZGxlXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogLy8gRm9yd2FyZCB0byBleHRlcm5hbCBsb2dnaW5nIHNlcnZpY2VcbiAqIGNvbnN0IGhhbmRsZXI6IExvZ0V2ZW50SGFuZGxlciA9IChldmVudCkgPT4ge1xuICogICBleHRlcm5hbExvZ2dlci5sb2coe1xuICogICAgIGxldmVsOiBldmVudC5sZXZlbCxcbiAqICAgICBtZXNzYWdlOiBldmVudC5tZXNzYWdlLFxuICogICAgIG1ldGFkYXRhOiB7IGhvb2tUeXBlOiBldmVudC5ob29rVHlwZSB9XG4gKiAgIH0pO1xuICogfTtcbiAqIGBgYFxuICovXG5leHBvcnQgdHlwZSBMb2dFdmVudEhhbmRsZXIgPSAoZXZlbnQ6IExvZ0V2ZW50KSA9PiB2b2lkO1xuXG4vKipcbiAqIEZ1bmN0aW9uIHRvIHVuc3Vic2NyaWJlIGEgbG9nIGV2ZW50IGhhbmRsZXIuXG4gKlxuICogQ2FsbCB0aGlzIGZ1bmN0aW9uIHRvIHN0b3AgcmVjZWl2aW5nIGxvZyBldmVudHMuIEFsd2F5cyBjYWxsIHVuc3Vic2NyaWJlXG4gKiB3aGVuIHRoZSBoYW5kbGVyIGlzIG5vIGxvbmdlciBuZWVkZWQgdG8gcHJldmVudCBtZW1vcnkgbGVha3MuXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogY29uc3QgdW5zdWJzY3JpYmUgPSBsb2dnZXIub24oJ2Vycm9yJywgaGFuZGxlRXJyb3IpO1xuICogLy8gLi4uIGxhdGVyXG4gKiB1bnN1YnNjcmliZSgpOyAvLyBTdG9wIHJlY2VpdmluZyBldmVudHNcbiAqIGBgYFxuICovXG5leHBvcnQgdHlwZSBVbnN1YnNjcmliZSA9ICgpID0+IHZvaWQ7XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIExvZ2dlciBDb25maWd1cmF0aW9uXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbi8qKlxuICogQ29uZmlndXJhdGlvbiBvcHRpb25zIGZvciB0aGUgTG9nZ2VyLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIExvZ2dlckNvbmZpZyB7XG4gIC8qKlxuICAgKiBQYXRoIHRvIHRoZSBsb2cgZmlsZSBmb3IgSlNPTiBMaW5lcyBvdXRwdXQuXG4gICAqXG4gICAqIElmIG5vdCBzZXQsIGZpbGUgbG9nZ2luZyBpcyBkaXNhYmxlZC4gQ2FuIGFsc28gYmUgc2V0IHZpYSB0aGVcbiAgICogYENBUkRTX0hPT0tTX0xPR19GSUxFYCBlbnZpcm9ubWVudCB2YXJpYWJsZS5cbiAgICovXG4gIGxvZ0ZpbGVQYXRoPzogc3RyaW5nO1xufVxuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBMb2dnZXIgSW50ZXJmYWNlIChmb3IgdGVzdGluZyBhbmQgdHlwZSBjb21wYXRpYmlsaXR5KVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4vKipcbiAqIExvZ2dlciBpbnRlcmZhY2UgZm9yIHN0cnVjdHVyZWQsIGNvbnRleHQtYXdhcmUgbG9nZ2luZy5cbiAqXG4gKiBUaGlzIGludGVyZmFjZSBkZWZpbmVzIHRoZSBwdWJsaWMgQVBJIG9mIHRoZSBMb2dnZXIgY2xhc3MuIEl0IGV4aXN0c1xuICogcHJpbWFyaWx5IGZvciB0eXBlIGNvbXBhdGliaWxpdHkgYW5kIHRlc3RpbmcgcHVycG9zZXMsIGFsbG93aW5nIHRlc3RzXG4gKiB0byBtb2NrIHRoZSBsb2dnZXIgd2l0aG91dCBuZWVkaW5nIHRvIGltcGxlbWVudCBhbGwgaW50ZXJuYWwgbWV0aG9kcy5cbiAqXG4gKiBGb3IgcHJvZHVjdGlvbiB1c2UsIHVzZSB0aGUge0BsaW5rIExvZ2dlcn0gY2xhc3Mgb3IgdGhlIHtAbGluayBsb2dnZXJ9XG4gKiBzaW5nbGV0b24gZXhwb3J0LlxuICovXG5leHBvcnQgaW50ZXJmYWNlIElMb2dnZXIge1xuICAvKipcbiAgICogTG9ncyBhIGRlYnVnIG1lc3NhZ2UuXG4gICAqIEBwYXJhbSBtZXNzYWdlIC0gRGlhZ25vc3RpYyB0ZXh0IGRlc2NyaWJpbmcgbG93LWxldmVsIGV4ZWN1dGlvbiBkZXRhaWxzLlxuICAgKiBAcGFyYW0gY29udGV4dCAtIE9wdGlvbmFsIHN0cnVjdHVyZWQgbWV0YWRhdGEgbWVyZ2VkIGludG8gdGhlIGVtaXR0ZWQgZXZlbnQuXG4gICAqL1xuICBkZWJ1ZyhtZXNzYWdlOiBzdHJpbmcsIGNvbnRleHQ/OiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPik6IHZvaWQ7XG5cbiAgLyoqXG4gICAqIExvZ3MgYW4gaW5mbyBtZXNzYWdlLlxuICAgKiBAcGFyYW0gbWVzc2FnZSAtIE9wZXJhdGlvbmFsIG1lc3NhZ2UgZGVzY3JpYmluZyBub3JtYWwgaG9vayBwcm9ncmVzcy5cbiAgICogQHBhcmFtIGNvbnRleHQgLSBPcHRpb25hbCBzdHJ1Y3R1cmVkIG1ldGFkYXRhIG1lcmdlZCBpbnRvIHRoZSBlbWl0dGVkIGV2ZW50LlxuICAgKi9cbiAgaW5mbyhtZXNzYWdlOiBzdHJpbmcsIGNvbnRleHQ/OiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPik6IHZvaWQ7XG5cbiAgLyoqXG4gICAqIExvZ3MgYSB3YXJuaW5nIG1lc3NhZ2UuXG4gICAqIEBwYXJhbSBtZXNzYWdlIC0gV2FybmluZyB0ZXh0IGZvciByZWNvdmVyYWJsZSBvciBzdXNwaWNpb3VzIGNvbmRpdGlvbnMuXG4gICAqIEBwYXJhbSBjb250ZXh0IC0gT3B0aW9uYWwgc3RydWN0dXJlZCBtZXRhZGF0YSBtZXJnZWQgaW50byB0aGUgZW1pdHRlZCBldmVudC5cbiAgICovXG4gIHdhcm4obWVzc2FnZTogc3RyaW5nLCBjb250ZXh0PzogUmVjb3JkPHN0cmluZywgdW5rbm93bj4pOiB2b2lkO1xuXG4gIC8qKlxuICAgKiBMb2dzIGFuIGVycm9yIG1lc3NhZ2UuXG4gICAqIEBwYXJhbSBtZXNzYWdlIC0gRXJyb3IgdGV4dCBkZXNjcmliaW5nIGEgaGFuZGxlZCBmYWlsdXJlIGNvbmRpdGlvbi5cbiAgICogQHBhcmFtIGNvbnRleHQgLSBPcHRpb25hbCBzdHJ1Y3R1cmVkIG1ldGFkYXRhIG1lcmdlZCBpbnRvIHRoZSBlbWl0dGVkIGV2ZW50LlxuICAgKi9cbiAgZXJyb3IobWVzc2FnZTogc3RyaW5nLCBjb250ZXh0PzogUmVjb3JkPHN0cmluZywgdW5rbm93bj4pOiB2b2lkO1xuXG4gIC8qKlxuICAgKiBMb2dzIGEgc3RydWN0dXJlZCBlcnJvciB3aXRoIGZ1bGwgZXJyb3IgZGV0YWlscy5cbiAgICogQHBhcmFtIGVycm9yIC0gVGhlIGVycm9yIHRvIGxvZ1xuICAgKiBAcGFyYW0gbWVzc2FnZSAtIEh1bWFuLXJlYWRhYmxlIGRlc2NyaXB0aW9uIG9mIHdoYXQgZmFpbGVkXG4gICAqIEBwYXJhbSBjb250ZXh0IC0gT3B0aW9uYWwgc3RydWN0dXJlZCBtZXRhZGF0YSBtZXJnZWQgaW50byB0aGUgZW1pdHRlZCBldmVudC5cbiAgICovXG4gIGxvZ0Vycm9yKGVycm9yOiB1bmtub3duLCBtZXNzYWdlOiBzdHJpbmcsIGNvbnRleHQ/OiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPik6IHZvaWQ7XG59XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIExvZ2dlciBDbGFzc1xuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4vKipcbiAqIExvZ2dlciBmb3IgQ2FyZHMgRXh0ZW5zaW9uIGhvb2tzIHdpdGggZXZlbnQgc3Vic2NyaXB0aW9uIGFuZCBmaWxlIG91dHB1dC5cbiAqXG4gKiBPdXRwdXQgaXMgb3B0LWluIGFuZCBiZXN0LWVmZm9ydDpcbiAqIC0gV2l0aCBubyBoYW5kbGVycyBhbmQgbm8gbG9nIGZpbGUsIGV2ZW50cyBhcmUgZHJvcHBlZC5cbiAqIC0gSGFuZGxlciBlcnJvcnMgYXJlIHN3YWxsb3dlZCBzbyBsb2dnaW5nIGNhbm5vdCBicmVhayBob29rcy5cbiAqIC0gRmlsZSBvdXRwdXQgdXNlcyBKU09OIExpbmVzIGFuZCBpZ25vcmVzIHdyaXRlIGZhaWx1cmVzLlxuICpcbiAqIFRoZSBsb2dnZXIgbmV2ZXIgd3JpdGVzIHRvIHN0ZG91dCBvciBzdGRlcnIuXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogaW1wb3J0IHsgbG9nZ2VyIH0gZnJvbSAnQGNhcmRzL3Nkay9jb25maWcnO1xuICpcbiAqIC8vIFN1YnNjcmliZSB0byBldmVudHMgYXQgc3BlY2lmaWMgbGV2ZWxcbiAqIGxvZ2dlci5vbignd2FybicsIChldmVudCkgPT4ge1xuICogICBzZW5kQWxlcnQoZXZlbnQubWVzc2FnZSk7XG4gKiB9KTtcbiAqXG4gKiAvLyBMb2cgd2l0aGluIGEgaG9vayBoYW5kbGVyXG4gKiBsb2dnZXIud2FybignQWJvdXQgdG8gZXhlY3V0ZSB0YXNrJyk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNsYXNzIExvZ2dlciB7XG4gIC8qKlxuICAgKiBSZWdpc3RlcmVkIGV2ZW50IGhhbmRsZXJzIGJ5IGxvZyBsZXZlbC5cbiAgICovXG4gIHByaXZhdGUgaGFuZGxlcnM6IE1hcDxMb2dMZXZlbCwgU2V0PExvZ0V2ZW50SGFuZGxlcj4+ID0gbmV3IE1hcCgpO1xuXG4gIC8qKlxuICAgKiBGaWxlIGRlc2NyaXB0b3IgZm9yIGxvZyBmaWxlIG91dHB1dC5cbiAgICogTGF6aWx5IGluaXRpYWxpemVkIG9uIGZpcnN0IHdyaXRlLlxuICAgKi9cbiAgcHJpdmF0ZSBsb2dGaWxlRmQ6IG51bWJlciB8IG51bGwgPSBudWxsO1xuXG4gIC8qKlxuICAgKiBQYXRoIHRvIHRoZSBsb2cgZmlsZSwgaWYgY29uZmlndXJlZC5cbiAgICovXG4gIHByaXZhdGUgbG9nRmlsZVBhdGg6IHN0cmluZyB8IG51bGwgPSBudWxsO1xuXG4gIC8qKlxuICAgKiBXaGV0aGVyIGZpbGUgaW5pdGlhbGl6YXRpb24gaGFzIGJlZW4gYXR0ZW1wdGVkLlxuICAgKi9cbiAgcHJpdmF0ZSBmaWxlSW5pdGlhbGl6ZWQgPSBmYWxzZTtcblxuICAvKipcbiAgICogQ3VycmVudCBob29rIGNvbnRleHQgZm9yIGVucmljaGluZyBsb2cgZXZlbnRzLlxuICAgKi9cbiAgcHJpdmF0ZSBjdXJyZW50SG9va1R5cGU6IHN0cmluZyB8IHVuZGVmaW5lZDtcblxuICAvKipcbiAgICogQ3VycmVudCBob29rIGlucHV0IGZvciBlbnJpY2hpbmcgbG9nIGV2ZW50cy5cbiAgICovXG4gIHByaXZhdGUgY3VycmVudElucHV0OiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPiB8IHVuZGVmaW5lZDtcblxuICAvKipcbiAgICogQ3JlYXRlcyBhIG5ldyBMb2dnZXIgaW5zdGFuY2UuXG4gICAqXG4gICAqIFR5cGljYWxseSB5b3Ugc2hvdWxkIHVzZSB0aGUgZXhwb3J0ZWQgYGxvZ2dlcmAgc2luZ2xldG9uIHJhdGhlciB0aGFuXG4gICAqIGNyZWF0aW5nIG5ldyBpbnN0YW5jZXMuXG4gICAqIEBwYXJhbSBjb25maWcgLSBPcHRpb25hbCBjb25maWd1cmF0aW9uXG4gICAqIEBleGFtcGxlXG4gICAqIGBgYHR5cGVzY3JpcHRcbiAgICogLy8gVXNlIHNpbmdsZXRvbiAocmVjb21tZW5kZWQpXG4gICAqIGltcG9ydCB7IGxvZ2dlciB9IGZyb20gJ0BjYXJkcy9zZGsvY29uZmlnJztcbiAgICpcbiAgICogLy8gT3IgY3JlYXRlIGN1c3RvbSBpbnN0YW5jZVxuICAgKiBjb25zdCBjdXN0b21Mb2dnZXIgPSBuZXcgTG9nZ2VyKHsgbG9nRmlsZVBhdGg6ICcvdmFyL2xvZy9ob29rcy5sb2cnIH0pO1xuICAgKiBgYGBcbiAgICovXG4gIGNvbnN0cnVjdG9yKGNvbmZpZzogTG9nZ2VyQ29uZmlnID0ge30pIHtcbiAgICAvLyBJbml0aWFsaXplIGhhbmRsZXJzIG1hcCBmb3IgZWFjaCBsZXZlbFxuICAgIGZvciAoY29uc3QgbGV2ZWwgb2YgTE9HX0xFVkVMUykge1xuICAgICAgdGhpcy5oYW5kbGVycy5zZXQobGV2ZWwsIG5ldyBTZXQoKSk7XG4gICAgfVxuXG4gICAgLy8gU2V0IGxvZyBmaWxlIHBhdGggZnJvbSBjb25maWcgb3IgZW52aXJvbm1lbnRcbiAgICB0aGlzLmxvZ0ZpbGVQYXRoID0gY29uZmlnLmxvZ0ZpbGVQYXRoID8/IHByb2Nlc3MuZW52WydDQVJEU19IT09LU19MT0dfRklMRSddID8/IG51bGw7XG4gIH1cblxuICAvKipcbiAgICogTG9ncyBhIGRlYnVnIG1lc3NhZ2UuXG4gICAqXG4gICAqIFVzZSBmb3IgZGV0YWlsZWQgZGVidWdnaW5nIGluZm9ybWF0aW9uIHRoYXQgaXMgdHlwaWNhbGx5IG9ubHkgdXNlZnVsXG4gICAqIGR1cmluZyBkZXZlbG9wbWVudCBvciB0cm91Ymxlc2hvb3RpbmcuXG4gICAqIEBwYXJhbSBtZXNzYWdlIC0gRGlhZ25vc3RpYyB0ZXh0IGRlc2NyaWJpbmcgbG93LWxldmVsIGV4ZWN1dGlvbiBkZXRhaWxzLlxuICAgKiBAcGFyYW0gY29udGV4dCAtIE9wdGlvbmFsIHN0cnVjdHVyZWQgbWV0YWRhdGEgbWVyZ2VkIGludG8gdGhlIGVtaXR0ZWQgZXZlbnQuXG4gICAqIEBleGFtcGxlXG4gICAqIGBgYHR5cGVzY3JpcHRcbiAgICogbG9nZ2VyLmRlYnVnKCdQcm9jZXNzaW5nIGhvb2sgaW5wdXQnLCB7IHRhc2tJZDogJ3Rhc2stMTIzJywgaW5wdXRTaXplOiAyNTYgfSk7XG4gICAqIGBgYFxuICAgKi9cbiAgZGVidWcobWVzc2FnZTogc3RyaW5nLCBjb250ZXh0PzogUmVjb3JkPHN0cmluZywgdW5rbm93bj4pOiB2b2lkIHtcbiAgICB0aGlzLmVtaXQoJ2RlYnVnJywgbWVzc2FnZSwgY29udGV4dCk7XG4gIH1cblxuICAvKipcbiAgICogTG9ncyBhbiBpbmZvIG1lc3NhZ2UuXG4gICAqXG4gICAqIFVzZSBmb3IgZ2VuZXJhbCBvcGVyYXRpb25hbCBldmVudHMgbGlrZSBob29rIGludm9jYXRpb25zLCBzdWNjZXNzZnVsXG4gICAqIGNvbXBsZXRpb25zLCBvciBzdGF0ZSBjaGFuZ2VzLlxuICAgKiBAcGFyYW0gbWVzc2FnZSAtIE9wZXJhdGlvbmFsIG1lc3NhZ2UgZGVzY3JpYmluZyBub3JtYWwgaG9vayBwcm9ncmVzcy5cbiAgICogQHBhcmFtIGNvbnRleHQgLSBPcHRpb25hbCBzdHJ1Y3R1cmVkIG1ldGFkYXRhIG1lcmdlZCBpbnRvIHRoZSBlbWl0dGVkIGV2ZW50LlxuICAgKiBAZXhhbXBsZVxuICAgKiBgYGB0eXBlc2NyaXB0XG4gICAqIGxvZ2dlci5pbmZvKCdUYXNrIHN0YXJ0ZWQnLCB7IHRhc2tJZDogJ3Rhc2stMTIzJywgY2FyZElkOiAnY2FyZC00NTYnIH0pO1xuICAgKiBgYGBcbiAgICovXG4gIGluZm8obWVzc2FnZTogc3RyaW5nLCBjb250ZXh0PzogUmVjb3JkPHN0cmluZywgdW5rbm93bj4pOiB2b2lkIHtcbiAgICB0aGlzLmVtaXQoJ2luZm8nLCBtZXNzYWdlLCBjb250ZXh0KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBMb2dzIGEgd2FybmluZyBtZXNzYWdlLlxuICAgKlxuICAgKiBVc2UgZm9yIGNvbmRpdGlvbnMgdGhhdCBtYXkgaW5kaWNhdGUgY2FyZHMgYnV0IGRvbid0IHByZXZlbnRcbiAgICogb3BlcmF0aW9uLCBzdWNoIGFzIGRlcHJlY2F0ZWQgcGF0dGVybnMgb3IgcGVyZm9ybWFuY2UgY29uY2VybnMuXG4gICAqIEBwYXJhbSBtZXNzYWdlIC0gV2FybmluZyB0ZXh0IGZvciByZWNvdmVyYWJsZSBvciBzdXNwaWNpb3VzIGNvbmRpdGlvbnMuXG4gICAqIEBwYXJhbSBjb250ZXh0IC0gT3B0aW9uYWwgc3RydWN0dXJlZCBtZXRhZGF0YSBtZXJnZWQgaW50byB0aGUgZW1pdHRlZCBldmVudC5cbiAgICogQGV4YW1wbGVcbiAgICogYGBgdHlwZXNjcmlwdFxuICAgKiBsb2dnZXIud2FybignRGVwcmVjYXRlZCBob29rIHBhdHRlcm4gZGV0ZWN0ZWQnLCB7IHBhdHRlcm46ICdsZWdhY3lNYXRjaGVyJyB9KTtcbiAgICogYGBgXG4gICAqL1xuICB3YXJuKG1lc3NhZ2U6IHN0cmluZywgY29udGV4dD86IFJlY29yZDxzdHJpbmcsIHVua25vd24+KTogdm9pZCB7XG4gICAgdGhpcy5lbWl0KCd3YXJuJywgbWVzc2FnZSwgY29udGV4dCk7XG4gIH1cblxuICAvKipcbiAgICogTG9ncyBhbiBlcnJvciBtZXNzYWdlLlxuICAgKlxuICAgKiBVc2UgZm9yIGVycm9yIGNvbmRpdGlvbnMgdGhhdCByZXF1aXJlIGF0dGVudGlvbiBidXQgd2VyZSBoYW5kbGVkXG4gICAqIGdyYWNlZnVsbHkuIEZvciBleGNlcHRpb25zLCBwcmVmZXIge0BsaW5rIGxvZ0Vycm9yfS5cbiAgICogQHBhcmFtIG1lc3NhZ2UgLSBFcnJvciB0ZXh0IGRlc2NyaWJpbmcgYSBoYW5kbGVkIGZhaWx1cmUgY29uZGl0aW9uLlxuICAgKiBAcGFyYW0gY29udGV4dCAtIE9wdGlvbmFsIHN0cnVjdHVyZWQgbWV0YWRhdGEgbWVyZ2VkIGludG8gdGhlIGVtaXR0ZWQgZXZlbnQuXG4gICAqIEBleGFtcGxlXG4gICAqIGBgYHR5cGVzY3JpcHRcbiAgICogbG9nZ2VyLmVycm9yKCdGYWlsZWQgdG8gdmFsaWRhdGUgaG9vayBpbnB1dCcsIHsgcmVhc29uOiAnZW1wdHkgdGFza0lkJyB9KTtcbiAgICogYGBgXG4gICAqL1xuICBlcnJvcihtZXNzYWdlOiBzdHJpbmcsIGNvbnRleHQ/OiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPik6IHZvaWQge1xuICAgIHRoaXMuZW1pdCgnZXJyb3InLCBtZXNzYWdlLCBjb250ZXh0KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBMb2dzIGEgc3RydWN0dXJlZCBlcnJvciB3aXRoIGZ1bGwgZXJyb3IgZGV0YWlscy5cbiAgICpcbiAgICogVXNlIHRoaXMgZm9yIGNhdWdodCBleGNlcHRpb25zLiBOb24tRXJyb3IgdmFsdWVzIGFyZSBub3JtYWxpemVkIHNvIGhhbmRsZXJzXG4gICAqIGFsd2F5cyByZWNlaXZlIGEgY29uc2lzdGVudCBlcnJvciBzaGFwZS5cbiAgICogQHBhcmFtIGVycm9yIC0gVGhlIGVycm9yIHRvIGxvZ1xuICAgKiBAcGFyYW0gbWVzc2FnZSAtIEh1bWFuLXJlYWRhYmxlIGRlc2NyaXB0aW9uIG9mIHdoYXQgZmFpbGVkXG4gICAqIEBwYXJhbSBjb250ZXh0IC0gT3B0aW9uYWwgc3RydWN0dXJlZCBtZXRhZGF0YSBtZXJnZWQgaW50byB0aGUgZW1pdHRlZCBldmVudC5cbiAgICogQGV4YW1wbGVcbiAgICogYGBgdHlwZXNjcmlwdFxuICAgKiB0cnkge1xuICAgKiAgIGF3YWl0IGRhbmdlcm91c09wZXJhdGlvbigpO1xuICAgKiB9IGNhdGNoIChlcnIpIHtcbiAgICogICBsb2dnZXIubG9nRXJyb3IoZXJyLCAnRmFpbGVkIHRvIGV4ZWN1dGUgZGFuZ2Vyb3VzIG9wZXJhdGlvbicsIHtcbiAgICogICAgIG9wZXJhdGlvbjogJ2RlbGV0ZScsXG4gICAqICAgICB0YXJnZXQ6ICcvaW1wb3J0YW50L2ZpbGUudHh0J1xuICAgKiAgIH0pO1xuICAgKiB9XG4gICAqIGBgYFxuICAgKi9cbiAgbG9nRXJyb3IoZXJyb3I6IHVua25vd24sIG1lc3NhZ2U6IHN0cmluZywgY29udGV4dD86IFJlY29yZDxzdHJpbmcsIHVua25vd24+KTogdm9pZCB7XG4gICAgY29uc3QgZXJyb3JJbmZvID0gdGhpcy5leHRyYWN0RXJyb3JJbmZvKGVycm9yKTtcblxuICAgIGNvbnN0IGV2ZW50OiBMb2dFdmVudCA9IHtcbiAgICAgIHRpbWVzdGFtcDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxuICAgICAgbGV2ZWw6ICdlcnJvcicsXG4gICAgICBob29rVHlwZTogdGhpcy5jdXJyZW50SG9va1R5cGUsXG4gICAgICBtZXNzYWdlLFxuICAgICAgaW5wdXQ6IHRoaXMuY3VycmVudElucHV0LFxuICAgICAgZXJyb3I6IGVycm9ySW5mbyxcbiAgICAgIGNvbnRleHRcbiAgICB9O1xuXG4gICAgdGhpcy5kZWxpdmVyRXZlbnQoZXZlbnQpO1xuICB9XG5cbiAgLyoqXG4gICAqIFN1YnNjcmliZXMgYSBoYW5kbGVyIHRvIGxvZyBldmVudHMgYXQgdGhlIHNwZWNpZmllZCBsZXZlbC5cbiAgICpcbiAgICogVGhlIGhhbmRsZXIgd2lsbCBiZSBjYWxsZWQgZm9yIGV2ZXJ5IGxvZyBldmVudCBhdCB0aGUgc3BlY2lmaWVkIGxldmVsLlxuICAgKiBSZXR1cm5zIGFuIHVuc3Vic2NyaWJlIGZ1bmN0aW9uIHRoYXQgc2hvdWxkIGJlIGNhbGxlZCB3aGVuIHRoZSBoYW5kbGVyXG4gICAqIGlzIG5vIGxvbmdlciBuZWVkZWQuIEhhbmRsZXIgZXJyb3JzIGFyZSBpZ25vcmVkIHRvIGF2b2lkIGRpc3J1cHRpbmcgaG9va3MuXG4gICAqIEBwYXJhbSBsZXZlbCAtIFRoZSBsb2cgbGV2ZWwgdG8gc3Vic2NyaWJlIHRvXG4gICAqIEBwYXJhbSBoYW5kbGVyIC0gVGhlIGhhbmRsZXIgZnVuY3Rpb24gdG8gY2FsbCBmb3IgZWFjaCBldmVudFxuICAgKiBAcmV0dXJucyBBIGZ1bmN0aW9uIHRvIHVuc3Vic2NyaWJlIHRoZSBoYW5kbGVyXG4gICAqIEBleGFtcGxlXG4gICAqIGBgYHR5cGVzY3JpcHRcbiAgICogLy8gU3Vic2NyaWJlIHRvIGVycm9yIGV2ZW50c1xuICAgKiBjb25zdCB1bnN1YnNjcmliZSA9IGxvZ2dlci5vbignZXJyb3InLCAoZXZlbnQpID0+IHtcbiAgICogICBjb25zb2xlLmVycm9yKGBbJHtldmVudC5ob29rVHlwZX1dICR7ZXZlbnQubWVzc2FnZX1gKTtcbiAgICogICBpZiAoZXZlbnQuZXJyb3IpIHtcbiAgICogICAgIGNvbnNvbGUuZXJyb3IoZXZlbnQuZXJyb3Iuc3RhY2spO1xuICAgKiAgIH1cbiAgICogfSk7XG4gICAqXG4gICAqIC8vIExhdGVyLCBjbGVhbiB1cFxuICAgKiB1bnN1YnNjcmliZSgpO1xuICAgKiBgYGBcbiAgICogQGV4YW1wbGVcbiAgICogYGBgdHlwZXNjcmlwdFxuICAgKiAvLyBGb3J3YXJkIHRvIGV4dGVybmFsIGxvZ2dpbmcgbGlicmFyeVxuICAgKiBpbXBvcnQgcGlubyBmcm9tICdwaW5vJztcbiAgICogY29uc3QgcGlub0xvZ2dlciA9IHBpbm8oKTtcbiAgICpcbiAgICogbG9nZ2VyLm9uKCdpbmZvJywgKGV2ZW50KSA9PiBwaW5vTG9nZ2VyLmluZm8oZXZlbnQsIGV2ZW50Lm1lc3NhZ2UpKTtcbiAgICogbG9nZ2VyLm9uKCd3YXJuJywgKGV2ZW50KSA9PiBwaW5vTG9nZ2VyLndhcm4oZXZlbnQsIGV2ZW50Lm1lc3NhZ2UpKTtcbiAgICogbG9nZ2VyLm9uKCdlcnJvcicsIChldmVudCkgPT4gcGlub0xvZ2dlci5lcnJvcihldmVudCwgZXZlbnQubWVzc2FnZSkpO1xuICAgKiBgYGBcbiAgICovXG4gIG9uKGxldmVsOiBMb2dMZXZlbCwgaGFuZGxlcjogTG9nRXZlbnRIYW5kbGVyKTogVW5zdWJzY3JpYmUge1xuICAgIGNvbnN0IGxldmVsSGFuZGxlcnMgPSB0aGlzLmhhbmRsZXJzLmdldChsZXZlbCk7XG4gICAgaWYgKGxldmVsSGFuZGxlcnMpIHtcbiAgICAgIGxldmVsSGFuZGxlcnMuYWRkKGhhbmRsZXIpO1xuICAgIH1cblxuICAgIHJldHVybiAoKSA9PiB7XG4gICAgICBsZXZlbEhhbmRsZXJzPy5kZWxldGUoaGFuZGxlcik7XG4gICAgfTtcbiAgfVxuXG4gIC8qKlxuICAgKiBTZXRzIHRoZSBjdXJyZW50IGhvb2sgY29udGV4dCBmb3IgZW5yaWNoaW5nIGxvZyBldmVudHMuXG4gICAqXG4gICAqIFRoaXMgaXMgY2FsbGVkIGludGVybmFsbHkgYnkgdGhlIHJ1bnRpbWUgYmVmb3JlIGludm9raW5nIGhvb2sgaGFuZGxlcnMuXG4gICAqIFlvdSB0eXBpY2FsbHkgZG9uJ3QgbmVlZCB0byBjYWxsIHRoaXMgZGlyZWN0bHkuXG4gICAqIEBwYXJhbSBob29rVHlwZSAtIFRoZSB0eXBlIG9mIGhvb2sgYmVpbmcgZXhlY3V0ZWRcbiAgICogQHBhcmFtIGlucHV0IC0gVGhlIGhvb2sgaW5wdXQgZGF0YVxuICAgKiBAaW50ZXJuYWxcbiAgICovXG4gIHNldENvbnRleHQoaG9va1R5cGU6IHN0cmluZyB8IHVuZGVmaW5lZCwgaW5wdXQ6IFJlY29yZDxzdHJpbmcsIHVua25vd24+IHwgdW5kZWZpbmVkKTogdm9pZCB7XG4gICAgdGhpcy5jdXJyZW50SG9va1R5cGUgPSBob29rVHlwZTtcbiAgICB0aGlzLmN1cnJlbnRJbnB1dCA9IGlucHV0O1xuICB9XG5cbiAgLyoqXG4gICAqIENsZWFycyB0aGUgY3VycmVudCBob29rIGNvbnRleHQuXG4gICAqXG4gICAqIENhbGxlZCBpbnRlcm5hbGx5IGJ5IHRoZSBydW50aW1lIGFmdGVyIGhvb2sgZXhlY3V0aW9uIGNvbXBsZXRlcy5cbiAgICogQGludGVybmFsXG4gICAqL1xuICBjbGVhckNvbnRleHQoKTogdm9pZCB7XG4gICAgdGhpcy5jdXJyZW50SG9va1R5cGUgPSB1bmRlZmluZWQ7XG4gICAgdGhpcy5jdXJyZW50SW5wdXQgPSB1bmRlZmluZWQ7XG4gIH1cblxuICAvKipcbiAgICogU2V0cyBhIGRlZmF1bHQgbG9nIGZpbGUgcGF0aCB0aGF0IG9ubHkgdGFrZXMgZWZmZWN0IGlmIG5vIG90aGVyIHNvdXJjZVxuICAgKiBoYXMgY29uZmlndXJlZCBmaWxlIGxvZ2dpbmcuXG4gICAqXG4gICAqIFRoaXMgaXMgdGhlIGxvd2VzdC1wcmlvcml0eSBmaWxlIHBhdGggc291cmNlLiBJdCB3aWxsIGJlIGlnbm9yZWQgaWZcbiAgICogYW55IG9mIHRoZXNlIGhhdmUgYWxyZWFkeSBzZXQgYSBwYXRoOlxuICAgKiAtIGBsb2dGaWxlUGF0aGAgaW4gdGhlIGNvbnN0cnVjdG9yIGNvbmZpZ1xuICAgKiAtIGBDQVJEU19IT09LU19MT0dfRklMRWAgZW52aXJvbm1lbnQgdmFyaWFibGVcbiAgICogLSB7QGxpbmsgc2V0TG9nRmlsZX0gY2FsbGVkIGF0IHJ1bnRpbWVcbiAgICpcbiAgICogSW50ZW5kZWQgZm9yIHVzZSBieSBDTEkgZW50cnkgcG9pbnRzIChlLmcuLCB0aGUgYC0tbG9nYCBmbGFnKS5cbiAgICogQHBhcmFtIGZpbGVQYXRoIC0gRGVmYXVsdCBwYXRoIHRvIHRoZSBsb2cgZmlsZVxuICAgKiBAZXhhbXBsZVxuICAgKiBgYGB0eXBlc2NyaXB0XG4gICAqIC8vIFdpcmUgLS1sb2cgQ0xJIGFyZ3VtZW50IGFzIGEgZmFsbGJhY2tcbiAgICogaWYgKGFyZ3MubG9nKSB7XG4gICAqICAgbG9nZ2VyLnNldERlZmF1bHRMb2dGaWxlKGFyZ3MubG9nKTtcbiAgICogfVxuICAgKiBgYGBcbiAgICovXG4gIHNldERlZmF1bHRMb2dGaWxlKGZpbGVQYXRoOiBzdHJpbmcpOiB2b2lkIHtcbiAgICBpZiAodGhpcy5sb2dGaWxlUGF0aCA9PT0gbnVsbCkge1xuICAgICAgdGhpcy5sb2dGaWxlUGF0aCA9IGZpbGVQYXRoO1xuICAgICAgdGhpcy5maWxlSW5pdGlhbGl6ZWQgPSBmYWxzZTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogQ29uZmlndXJlcyB0aGUgbG9nIGZpbGUgcGF0aCBhdCBydW50aW1lLlxuICAgKlxuICAgKiBDYWxsIHRoaXMgdG8gZW5hYmxlIG9yIGNoYW5nZSBmaWxlIGxvZ2dpbmcuIFNldHRpbmcgdG8gYG51bGxgIGRpc2FibGVzXG4gICAqIGZpbGUgbG9nZ2luZyBhbmQgY2xvc2VzIGFueSBvcGVuIGZpbGUgaGFuZGxlLiBEaXJlY3RvcmllcyBhcmUgY3JlYXRlZFxuICAgKiBvbiBkZW1hbmQgd2hlbiB0aGUgZmlyc3Qgd3JpdGUgb2NjdXJzLlxuICAgKiBAcGFyYW0gZmlsZVBhdGggLSBQYXRoIHRvIHRoZSBsb2cgZmlsZSwgb3IgbnVsbCB0byBkaXNhYmxlXG4gICAqIEBleGFtcGxlXG4gICAqIGBgYHR5cGVzY3JpcHRcbiAgICogLy8gRW5hYmxlIGZpbGUgbG9nZ2luZyBhdCBydW50aW1lXG4gICAqIGxvZ2dlci5zZXRMb2dGaWxlKCcvdmFyL2xvZy9jYXJkcy1zZGsubG9nJyk7XG4gICAqXG4gICAqIC8vIERpc2FibGUgZmlsZSBsb2dnaW5nXG4gICAqIGxvZ2dlci5zZXRMb2dGaWxlKG51bGwpO1xuICAgKiBgYGBcbiAgICovXG4gIHNldExvZ0ZpbGUoZmlsZVBhdGg6IHN0cmluZyB8IG51bGwpOiB2b2lkIHtcbiAgICAvLyBDbG9zZSBleGlzdGluZyBmaWxlIGlmIG9wZW5cbiAgICBpZiAodGhpcy5sb2dGaWxlRmQgIT09IG51bGwpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGNsb3NlU3luYyh0aGlzLmxvZ0ZpbGVGZCk7XG4gICAgICB9IGNhdGNoIHtcbiAgICAgICAgLy8gSWdub3JlIGVycm9ycyBvbiBjbG9zZVxuICAgICAgfVxuICAgICAgdGhpcy5sb2dGaWxlRmQgPSBudWxsO1xuICAgIH1cblxuICAgIHRoaXMubG9nRmlsZVBhdGggPSBmaWxlUGF0aDtcbiAgICB0aGlzLmZpbGVJbml0aWFsaXplZCA9IGZhbHNlO1xuICB9XG5cbiAgLyoqXG4gICAqIENsb3NlcyBhbGwgcmVzb3VyY2VzIGhlbGQgYnkgdGhlIGxvZ2dlci5cbiAgICpcbiAgICogQ2FsbCB0aGlzIGR1cmluZyBncmFjZWZ1bCBzaHV0ZG93biB0byBlbnN1cmUgYWxsIGxvZyBkYXRhIGlzIGZsdXNoZWQuXG4gICAqIFNhZmUgdG8gY2FsbCBtdWx0aXBsZSB0aW1lcy5cbiAgICogQGV4YW1wbGVcbiAgICogYGBgdHlwZXNjcmlwdFxuICAgKiBwcm9jZXNzLm9uKCdleGl0JywgKCkgPT4ge1xuICAgKiAgIGxvZ2dlci5jbG9zZSgpO1xuICAgKiB9KTtcbiAgICogYGBgXG4gICAqL1xuICBjbG9zZSgpOiB2b2lkIHtcbiAgICBpZiAodGhpcy5sb2dGaWxlRmQgIT09IG51bGwpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGNsb3NlU3luYyh0aGlzLmxvZ0ZpbGVGZCk7XG4gICAgICB9IGNhdGNoIHtcbiAgICAgICAgLy8gSWdub3JlIGVycm9ycyBvbiBjbG9zZVxuICAgICAgfVxuICAgICAgdGhpcy5sb2dGaWxlRmQgPSBudWxsO1xuICAgIH1cbiAgICB0aGlzLmZpbGVJbml0aWFsaXplZCA9IGZhbHNlO1xuICB9XG5cbiAgLyoqXG4gICAqIENoZWNrcyBpZiB0aGVyZSBhcmUgYW55IGFjdGl2ZSBoYW5kbGVycyBvciBkZXN0aW5hdGlvbnMuXG4gICAqXG4gICAqIFJldHVybnMgdHJ1ZSBpZiBhbnkgaGFuZGxlcnMgYXJlIHJlZ2lzdGVyZWQgb3IgZmlsZSBsb2dnaW5nIGlzIGVuYWJsZWQuXG4gICAqIFVzZWZ1bCBmb3IgZGVjaWRpbmcgd2hldGhlciB0byBjb21wdXRlIGV4cGVuc2l2ZSBsb2cgY29udGV4dC5cbiAgICogQHJldHVybnMgV2hldGhlciB0aGUgbG9nZ2VyIGhhcyBhbnkgYWN0aXZlIG91dHB1dCBkZXN0aW5hdGlvbnNcbiAgICovXG4gIGhhc0Rlc3RpbmF0aW9ucygpOiBib29sZWFuIHtcbiAgICBjb25zdCBoYXNIYW5kbGVycyA9IEFycmF5LmZyb20odGhpcy5oYW5kbGVycy52YWx1ZXMoKSkuc29tZSgoaGFuZGxlcnMpID0+IGhhbmRsZXJzLnNpemUgPiAwKTtcbiAgICByZXR1cm4gaGFzSGFuZGxlcnMgfHwgdGhpcy5sb2dGaWxlUGF0aCAhPT0gbnVsbDtcbiAgfVxuXG4gIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgLy8gUHJpdmF0ZSBNZXRob2RzXG4gIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuICAvKipcbiAgICogRW1pdHMgYSBsb2cgZXZlbnQuXG4gICAqIEBwYXJhbSBsZXZlbCAtIFRoZSBzZXZlcml0eSBsZXZlbCBvZiB0aGUgZXZlbnRcbiAgICogQHBhcmFtIG1lc3NhZ2UgLSBUaGUgbG9nIG1lc3NhZ2VcbiAgICogQHBhcmFtIGNvbnRleHQgLSBPcHRpb25hbCBhZGRpdGlvbmFsIGNvbnRleHQgZGF0YVxuICAgKi9cbiAgcHJpdmF0ZSBlbWl0KGxldmVsOiBMb2dMZXZlbCwgbWVzc2FnZTogc3RyaW5nLCBjb250ZXh0PzogUmVjb3JkPHN0cmluZywgdW5rbm93bj4pOiB2b2lkIHtcbiAgICBjb25zdCBldmVudDogTG9nRXZlbnQgPSB7XG4gICAgICB0aW1lc3RhbXA6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcbiAgICAgIGxldmVsLFxuICAgICAgaG9va1R5cGU6IHRoaXMuY3VycmVudEhvb2tUeXBlLFxuICAgICAgbWVzc2FnZSxcbiAgICAgIGlucHV0OiB0aGlzLmN1cnJlbnRJbnB1dCxcbiAgICAgIGNvbnRleHRcbiAgICB9O1xuXG4gICAgdGhpcy5kZWxpdmVyRXZlbnQoZXZlbnQpO1xuICB9XG5cbiAgLyoqXG4gICAqIERlbGl2ZXJzIGFuIGV2ZW50IHRvIGFsbCByZWdpc3RlcmVkIGRlc3RpbmF0aW9ucy5cbiAgICogQHBhcmFtIGV2ZW50IC0gVGhlIGxvZyBldmVudCB0byBkZWxpdmVyXG4gICAqL1xuICBwcml2YXRlIGRlbGl2ZXJFdmVudChldmVudDogTG9nRXZlbnQpOiB2b2lkIHtcbiAgICAvLyBEZWxpdmVyIHRvIGV2ZW50IGhhbmRsZXJzXG4gICAgY29uc3QgbGV2ZWxIYW5kbGVycyA9IHRoaXMuaGFuZGxlcnMuZ2V0KGV2ZW50LmxldmVsKTtcbiAgICBpZiAobGV2ZWxIYW5kbGVycykge1xuICAgICAgZm9yIChjb25zdCBoYW5kbGVyIG9mIGxldmVsSGFuZGxlcnMpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBoYW5kbGVyKGV2ZW50KTtcbiAgICAgICAgfSBjYXRjaCB7XG4gICAgICAgICAgLy8gU2lsZW50bHkgaWdub3JlIGhhbmRsZXIgZXJyb3JzIHRvIG5vdCBkaXNydXB0IGhvb2sgZXhlY3V0aW9uXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBXcml0ZSB0byBmaWxlIGlmIGNvbmZpZ3VyZWRcbiAgICB0aGlzLndyaXRlVG9GaWxlKGV2ZW50KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBXcml0ZXMgYW4gZXZlbnQgdG8gdGhlIGxvZyBmaWxlLlxuICAgKiBAcGFyYW0gZXZlbnQgLSBUaGUgbG9nIGV2ZW50IHRvIHdyaXRlXG4gICAqL1xuICBwcml2YXRlIHdyaXRlVG9GaWxlKGV2ZW50OiBMb2dFdmVudCk6IHZvaWQge1xuICAgIGlmICghdGhpcy5sb2dGaWxlUGF0aCkgcmV0dXJuO1xuXG4gICAgLy8gTGF6eSBpbml0aWFsaXphdGlvbiBvZiBmaWxlIGhhbmRsZVxuICAgIGlmICghdGhpcy5maWxlSW5pdGlhbGl6ZWQpIHtcbiAgICAgIHRoaXMuaW5pdGlhbGl6ZUZpbGUoKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5sb2dGaWxlRmQgPT09IG51bGwpIHJldHVybjtcblxuICAgIHRyeSB7XG4gICAgICBjb25zdCBsaW5lID0gYCR7SlNPTi5zdHJpbmdpZnkoZXZlbnQpfVxcbmA7XG4gICAgICB3cml0ZVN5bmModGhpcy5sb2dGaWxlRmQsIGxpbmUpO1xuICAgIH0gY2F0Y2gge1xuICAgICAgLy8gU2lsZW50bHkgaWdub3JlIGZpbGUgd3JpdGUgZXJyb3JzIHRvIG5vdCBkaXNydXB0IGhvb2sgZXhlY3V0aW9uXG4gICAgICAvLyBUaGlzIGZvbGxvd3MgdGhlIHJpc2sgbWl0aWdhdGlvbjogXCJHcmFjZWZ1bCBkZWdyYWRhdGlvbiAtIGxvZyB3cml0ZVxuICAgICAgLy8gZmFpbHVyZXMgYXJlIHNpbGVudGx5IGlnbm9yZWQgdG8gbm90IGRpc3J1cHQgaG9vayBleGVjdXRpb25cIlxuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBJbml0aWFsaXplcyB0aGUgbG9nIGZpbGUgZm9yIHdyaXRpbmcuXG4gICAqL1xuICBwcml2YXRlIGluaXRpYWxpemVGaWxlKCk6IHZvaWQge1xuICAgIHRoaXMuZmlsZUluaXRpYWxpemVkID0gdHJ1ZTtcblxuICAgIGlmICghdGhpcy5sb2dGaWxlUGF0aCkgcmV0dXJuO1xuXG4gICAgdHJ5IHtcbiAgICAgIC8vIEVuc3VyZSBkaXJlY3RvcnkgZXhpc3RzXG4gICAgICBjb25zdCBkaXIgPSBkaXJuYW1lKHRoaXMubG9nRmlsZVBhdGgpO1xuICAgICAgaWYgKCFleGlzdHNTeW5jKGRpcikpIHtcbiAgICAgICAgbWtkaXJTeW5jKGRpciwgeyByZWN1cnNpdmU6IHRydWUgfSk7XG4gICAgICB9XG5cbiAgICAgIC8vIE9wZW4gZmlsZSBmb3IgYXBwZW5kaW5nXG4gICAgICB0aGlzLmxvZ0ZpbGVGZCA9IG9wZW5TeW5jKHRoaXMubG9nRmlsZVBhdGgsICdhJyk7XG4gICAgfSBjYXRjaCB7XG4gICAgICAvLyBTaWxlbnRseSBpZ25vcmUgZmlsZSBpbml0aWFsaXphdGlvbiBlcnJvcnNcbiAgICAgIHRoaXMubG9nRmlsZUZkID0gbnVsbDtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogRXh0cmFjdHMgc3RydWN0dXJlZCBlcnJvciBpbmZvcm1hdGlvbiBmcm9tIGFuIHVua25vd24gZXJyb3IuXG4gICAqIEBwYXJhbSBlcnJvciAtIFRoZSBlcnJvciB0byBleHRyYWN0IGluZm9ybWF0aW9uIGZyb21cbiAgICogQHJldHVybnMgU3RydWN0dXJlZCBlcnJvciBpbmZvcm1hdGlvblxuICAgKi9cbiAgcHJpdmF0ZSBleHRyYWN0RXJyb3JJbmZvKGVycm9yOiB1bmtub3duKTogTG9nRXZlbnRFcnJvciB7XG4gICAgaWYgKGVycm9yIGluc3RhbmNlb2YgRXJyb3IpIHtcbiAgICAgIGNvbnN0IGluZm86IExvZ0V2ZW50RXJyb3IgPSB7XG4gICAgICAgIG5hbWU6IGVycm9yLm5hbWUsXG4gICAgICAgIG1lc3NhZ2U6IGVycm9yLm1lc3NhZ2UsXG4gICAgICAgIHN0YWNrOiBlcnJvci5zdGFja1xuICAgICAgfTtcblxuICAgICAgLy8gRXh0cmFjdCBjYXVzZSBjaGFpbiBpZiBwcmVzZW50XG4gICAgICBpZiAoZXJyb3IuY2F1c2UgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBpbmZvLmNhdXNlID0gdGhpcy5leHRyYWN0RXJyb3JJbmZvKGVycm9yLmNhdXNlKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIGluZm87XG4gICAgfVxuXG4gICAgLy8gSGFuZGxlIG5vbi1FcnJvciB2YWx1ZXNcbiAgICByZXR1cm4ge1xuICAgICAgbmFtZTogJ1Vua25vd25FcnJvcicsXG4gICAgICBtZXNzYWdlOiBTdHJpbmcoZXJyb3IpXG4gICAgfTtcbiAgfVxufVxuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBTaW5nbGV0b24gRXhwb3J0XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbi8qKlxuICogR2xvYmFsIGxvZ2dlciBpbnN0YW5jZSBmb3IgQ2FyZHMgRXh0ZW5zaW9uIGhvb2tzLlxuICpcbiAqIFVzZSB0aGlzIHNpbmdsZXRvbiBmb3IgYWxsIGxvZ2dpbmcgd2l0aGluIGhvb2tzLiBUaGUgbG9nZ2VyIGlzIGNvbmZpZ3VyZWRcbiAqIHZpYSBlbnZpcm9ubWVudCB2YXJpYWJsZXMgYW5kIHN1cHBvcnRzIGV2ZW50IHN1YnNjcmlwdGlvbiBmb3IgY3VzdG9tXG4gKiBkZXN0aW5hdGlvbnMuXG4gKlxuICogIyMgQ29uZmlndXJhdGlvblxuICpcbiAqIHwgRW52aXJvbm1lbnQgVmFyaWFibGUgfCBEZXNjcmlwdGlvbiB8XG4gKiB8LS0tLS0tLS0tLS0tLS0tLS0tLS0tfC0tLS0tLS0tLS0tLS18XG4gKiB8IGBDQVJEU19IT09LU19MT0dfRklMRWAgfCBQYXRoIHRvIGxvZyBmaWxlIChKU09OIExpbmVzIGZvcm1hdCkgfFxuICpcbiAqICMjIFVzYWdlIGluIEhvb2tzXG4gKlxuICogVGhlIGxvZ2dlciBjYW4gYmUgdXNlZCBkaXJlY3RseSB3aXRoaW4gaG9vayBoYW5kbGVyczpcbiAqXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBpbXBvcnQgeyBsb2dnZXIgfSBmcm9tICdAY2FyZHMvc2RrL2NvbmZpZyc7XG4gKlxuICogLy8gSW4gYSBob29rIGhhbmRsZXJcbiAqIGxvZ2dlci53YXJuKCdUYXNrIHN0YXJ0aW5nIGluIGludGVyYWN0aXZlIG1vZGUnKTtcbiAqIGBgYFxuICpcbiAqICMjIEV4dGVybmFsIEludGVncmF0aW9uXG4gKlxuICogU3Vic2NyaWJlIHRvIGV2ZW50cyB0byBmb3J3YXJkIGxvZ3MgdG8gZXh0ZXJuYWwgc3lzdGVtczpcbiAqXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBpbXBvcnQgeyBsb2dnZXIgfSBmcm9tICdAY2FyZHMvc2RrL2NvbmZpZyc7XG4gKiBpbXBvcnQgcGlubyBmcm9tICdwaW5vJztcbiAqXG4gKiBjb25zdCBwaW5vTG9nZ2VyID0gcGlubyh7IGxldmVsOiAnZGVidWcnIH0pO1xuICpcbiAqIGxvZ2dlci5vbignZGVidWcnLCAoZXZlbnQpID0+IHBpbm9Mb2dnZXIuZGVidWcoZXZlbnQsIGV2ZW50Lm1lc3NhZ2UpKTtcbiAqIGxvZ2dlci5vbignaW5mbycsIChldmVudCkgPT4gcGlub0xvZ2dlci5pbmZvKGV2ZW50LCBldmVudC5tZXNzYWdlKSk7XG4gKiBsb2dnZXIub24oJ3dhcm4nLCAoZXZlbnQpID0+IHBpbm9Mb2dnZXIud2FybihldmVudCwgZXZlbnQubWVzc2FnZSkpO1xuICogbG9nZ2VyLm9uKCdlcnJvcicsIChldmVudCkgPT4gcGlub0xvZ2dlci5lcnJvcihldmVudCwgZXZlbnQubWVzc2FnZSkpO1xuICogYGBgXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogLy8gRGlyZWN0IHVzYWdlXG4gKiBpbXBvcnQgeyBsb2dnZXIgfSBmcm9tICdAY2FyZHMvc2RrL2NvbmZpZyc7XG4gKlxuICogbG9nZ2VyLmluZm8oJ1N0YXJ0aW5nIG9wZXJhdGlvbicpO1xuICogbG9nZ2VyLndhcm4oJ1Jlc291cmNlIGxpbWl0IGFwcHJvYWNoaW5nJywgeyB1c2FnZTogMC45IH0pO1xuICpcbiAqIHRyeSB7XG4gKiAgIGF3YWl0IHJpc2t5T3BlcmF0aW9uKCk7XG4gKiB9IGNhdGNoIChlcnIpIHtcbiAqICAgbG9nZ2VyLmxvZ0Vycm9yKGVyciwgJ1Jpc2t5IG9wZXJhdGlvbiBmYWlsZWQnKTtcbiAqIH1cbiAqIGBgYFxuICovXG5leHBvcnQgY29uc3QgbG9nZ2VyID0gbmV3IExvZ2dlcigpO1xuIiwgIi8qKlxuICogU29ja2V0IGNsaWVudCBmb3IgcnVudGltZS10by1kaXNwYXRjaGVyIGNvbW11bmljYXRpb24uXG4gKlxuICogQ29ubmVjdHMgdG8gYSBVbml4IGRvbWFpbiBzb2NrZXQgY3JlYXRlZCBieSBBY3Rpb25EaXNwYXRjaGVyIGFuZCBoYW5kbGVzXG4gKiBOREpTT04gKG5ld2xpbmUtZGVsaW1pdGVkIEpTT04pIHByb3RvY29sIGZvciByZWNlaXZpbmcgY29tbWFuZHMgYW5kIHNlbmRpbmdcbiAqIHJlc3BvbnNlcy5cbiAqXG4gKlxuICogQHN1bW1hcnkgU29ja2V0IGNsaWVudCBmb3IgcnVudGltZS10by1kaXNwYXRjaGVyIGNvbW11bmljYXRpb25cbiAqIEBtb2R1bGVcbiAqL1xuXG5pbXBvcnQgKiBhcyBuZXQgZnJvbSAnbm9kZTpuZXQnO1xuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBUeXBlc1xuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4vKipcbiAqIENvbW1hbmRzIHRoYXQgY2FuIGJlIHJlY2VpdmVkIGZyb20gdGhlIEFjdGlvbkRpc3BhdGNoZXIgdmlhIHNvY2tldC5cbiAqXG4gKiBVc2VzIE5ESlNPTiAobmV3bGluZS1kZWxpbWl0ZWQgSlNPTikgcHJvdG9jb2wuXG4gKi9cbmV4cG9ydCB0eXBlIFNvY2tldENvbW1hbmQgPSB7IHR5cGU6ICdjYW5jZWwnIH0gfCB7IHR5cGU6ICdzd2l0Y2hUb0ludGVyYWN0aXZlJyB9O1xuXG4vKipcbiAqIFJlc3BvbnNlIHNlbnQgYmFjayB0byB0aGUgQWN0aW9uRGlzcGF0Y2hlciB3aGVuIHN3aXRjaFRvSW50ZXJhY3RpdmUgaXMgaGFuZGxlZC5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBTd2l0Y2hUb0ludGVyYWN0aXZlUmVzcG9uc2Uge1xuICB0eXBlOiAnc3dpdGNoVG9JbnRlcmFjdGl2ZVJlc3BvbnNlJztcbiAgZGF0YTogdW5rbm93bjtcbn1cblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gU29ja2V0Q2xpZW50XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbi8qKlxuICogQ2xpZW50IGZvciB0aGUgTkRKU09OIHNvY2tldCBwcm90b2NvbCBiZXR3ZWVuIHRoZSBhY3Rpb24gcnVudGltZSBhbmRcbiAqIEFjdGlvbkRpc3BhdGNoZXIuXG4gKlxuICogUmVjZWl2ZXMgY29tbWFuZHMgKGNhbmNlbCwgc3dpdGNoVG9JbnRlcmFjdGl2ZSkgYW5kIHNlbmRzIHJlc3BvbnNlc1xuICogKHN3aXRjaFRvSW50ZXJhY3RpdmVSZXNwb25zZSkgb3ZlciBhIFVuaXggZG9tYWluIHNvY2tldC5cbiAqXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogY29uc3QgY2xpZW50ID0gYXdhaXQgU29ja2V0Q2xpZW50LmNvbm5lY3QoJy9wYXRoL3RvL3NvY2tldCcpO1xuICogY2xpZW50Lm9uQ29tbWFuZCgoY29tbWFuZCkgPT4ge1xuICogICBpZiAoY29tbWFuZC50eXBlID09PSAnY2FuY2VsJykgeyAuLi4gfVxuICogfSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNsYXNzIFNvY2tldENsaWVudCB7XG4gIHByaXZhdGUgc29ja2V0OiBuZXQuU29ja2V0O1xuICBwcml2YXRlIGJ1ZmZlciA9ICcnO1xuICBwcml2YXRlIGNvbW1hbmRIYW5kbGVyPzogKGNvbW1hbmQ6IFNvY2tldENvbW1hbmQpID0+IHZvaWQ7XG5cbiAgcHJpdmF0ZSBjb25zdHJ1Y3Rvcihzb2NrZXQ6IG5ldC5Tb2NrZXQpIHtcbiAgICB0aGlzLnNvY2tldCA9IHNvY2tldDtcblxuICAgIHNvY2tldC5vbignZGF0YScsIChjaHVuaykgPT4ge1xuICAgICAgdGhpcy5idWZmZXIgKz0gY2h1bmsudG9TdHJpbmcoKTtcbiAgICAgIC8vIFBhcnNlIE5ESlNPTiAtIHNwbGl0IGJ5IG5ld2xpbmVzXG4gICAgICBjb25zdCBsaW5lcyA9IHRoaXMuYnVmZmVyLnNwbGl0KCdcXG4nKTtcbiAgICAgIHRoaXMuYnVmZmVyID0gbGluZXMucG9wKCkgPz8gJyc7IC8vIEtlZXAgaW5jb21wbGV0ZSBsaW5lIGluIGJ1ZmZlclxuXG4gICAgICBmb3IgKGNvbnN0IGxpbmUgb2YgbGluZXMpIHtcbiAgICAgICAgaWYgKGxpbmUudHJpbSgpID09PSAnJykgY29udGludWU7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgY29uc3QgcGFyc2VkID0gSlNPTi5wYXJzZShsaW5lKSBhcyBTb2NrZXRDb21tYW5kO1xuICAgICAgICAgIHRoaXMuY29tbWFuZEhhbmRsZXI/LihwYXJzZWQpO1xuICAgICAgICB9IGNhdGNoIHtcbiAgICAgICAgICAvLyBNYWxmb3JtZWQgSlNPTiBvbiBzb2NrZXQgaXMgaWdub3JlZCAocGVyIHBsYW4pXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDb25uZWN0IHRvIGEgVW5peCBkb21haW4gc29ja2V0IGF0IHRoZSBnaXZlbiBwYXRoLlxuICAgKlxuICAgKiBAcGFyYW0gc29ja2V0UGF0aCAtIFBhdGggdG8gdGhlIFVuaXggZG9tYWluIHNvY2tldFxuICAgKiBAcmV0dXJucyBBIGNvbm5lY3RlZCBTb2NrZXRDbGllbnQgaW5zdGFuY2VcbiAgICogQHRocm93cyBFcnJvciBpZiB0aGUgY29ubmVjdGlvbiBmYWlsc1xuICAgKi9cbiAgc3RhdGljIGNvbm5lY3Qoc29ja2V0UGF0aDogc3RyaW5nKTogUHJvbWlzZTxTb2NrZXRDbGllbnQ+IHtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgY29uc3Qgc29ja2V0ID0gbmV0LmNyZWF0ZUNvbm5lY3Rpb24oc29ja2V0UGF0aCwgKCkgPT4ge1xuICAgICAgICByZXNvbHZlKG5ldyBTb2NrZXRDbGllbnQoc29ja2V0KSk7XG4gICAgICB9KTtcbiAgICAgIHNvY2tldC5vbignZXJyb3InLCByZWplY3QpO1xuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIFJlZ2lzdGVyIGEgaGFuZGxlciBmb3IgaW5jb21pbmcgc29ja2V0IGNvbW1hbmRzLlxuICAgKlxuICAgKiBPbmx5IG9uZSBoYW5kbGVyIGNhbiBiZSByZWdpc3RlcmVkIGF0IGEgdGltZS4gU3Vic2VxdWVudCBjYWxscyByZXBsYWNlXG4gICAqIHRoZSBwcmV2aW91cyBoYW5kbGVyLlxuICAgKlxuICAgKiBAcGFyYW0gaGFuZGxlciAtIEZ1bmN0aW9uIHRvIGNhbGwgd2hlbiBhIGNvbW1hbmQgaXMgcmVjZWl2ZWRcbiAgICovXG4gIG9uQ29tbWFuZChoYW5kbGVyOiAoY29tbWFuZDogU29ja2V0Q29tbWFuZCkgPT4gdm9pZCk6IHZvaWQge1xuICAgIHRoaXMuY29tbWFuZEhhbmRsZXIgPSBoYW5kbGVyO1xuICB9XG5cbiAgLyoqXG4gICAqIFNlbmQgYSByZXNwb25zZSBiYWNrIHRvIHRoZSBBY3Rpb25EaXNwYXRjaGVyLlxuICAgKlxuICAgKiBAcGFyYW0gcmVzcG9uc2UgLSBUaGUgcmVzcG9uc2UgdG8gc2VuZCBhcyBOREpTT05cbiAgICovXG4gIHNlbmRSZXNwb25zZShyZXNwb25zZTogU3dpdGNoVG9JbnRlcmFjdGl2ZVJlc3BvbnNlKTogdm9pZCB7XG4gICAgdGhpcy5zb2NrZXQud3JpdGUoYCR7SlNPTi5zdHJpbmdpZnkocmVzcG9uc2UpfVxcbmApO1xuICB9XG5cbiAgLyoqXG4gICAqIFNlbmQgYSByZXNwb25zZSBhbmQgY2FsbCBjYWxsYmFjayB3aGVuIGZsdXNoZWQuXG4gICAqXG4gICAqIFVzZWQgdG8gZ3VhcmFudGVlIGZsdXNoIGJlZm9yZSBwcm9jZXNzLmV4aXQuXG4gICAqXG4gICAqIEBwYXJhbSByZXNwb25zZSAtIFRoZSByZXNwb25zZSB0byBzZW5kIGFzIE5ESlNPTlxuICAgKiBAcGFyYW0gY2FsbGJhY2sgLSBDYWxsZWQgYWZ0ZXIgdGhlIGRhdGEgaXMgZmx1c2hlZCB0byB0aGUgc29ja2V0XG4gICAqL1xuICBzZW5kUmVzcG9uc2VUaGVuKHJlc3BvbnNlOiBTd2l0Y2hUb0ludGVyYWN0aXZlUmVzcG9uc2UsIGNhbGxiYWNrOiAoKSA9PiB2b2lkKTogdm9pZCB7XG4gICAgdGhpcy5zb2NrZXQud3JpdGUoYCR7SlNPTi5zdHJpbmdpZnkocmVzcG9uc2UpfVxcbmAsIGNhbGxiYWNrKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDbG9zZSB0aGUgc29ja2V0IGNvbm5lY3Rpb24uXG4gICAqL1xuICBjbG9zZSgpOiB2b2lkIHtcbiAgICB0aGlzLnNvY2tldC5kZXN0cm95KCk7XG4gIH1cbn1cbiIsICIvKipcbiAqIFJ1bnRpbWUgb3JjaGVzdHJhdGlvbiBmb3IgY29tcGlsZWQgQ2FyZHMgYWN0aW9uIGFuZCB0eXBlIGhhbmRsZXJzLlxuICpcbiAqIFRoaXMgbW9kdWxlIGlzIGJ1bmRsZWQgaW50byBjb21waWxlZCBoYW5kbGVycyBieSB0aGUgQ0xJLiBJdCBwcm92aWRlcyB0aGVcbiAqIGV4ZWN1dGlvbiBoYXJuZXNzIHRoYXQgcmVhZHMgaGFuZGxlciBpbnB1dCBmcm9tIGVudmlyb25tZW50IHZhcmlhYmxlcywgc2V0c1xuICogdXAgdGhlIGxvZ2dlciBjb250ZXh0LCBpbnZva2VzIHRoZSB1c2VyJ3MgaGFuZGxlciwgYW5kIGV4aXRzIHRoZSBwcm9jZXNzXG4gKiB3aXRoIHRoZSBhcHByb3ByaWF0ZSBjb2RlLlxuICpcbiAqIFRoZSBydW50aW1lIGlzIGRlc2lnbmVkIHRvIG5ldmVyIHJldHVybiBpbiBub3JtYWwgdXNlLiBBbGwgY29kZSBwYXRoc1xuICogdGVybWluYXRlIHdpdGggYHByb2Nlc3MuZXhpdCgpYC4gVGhlIG9ubHkgZXhjZXB0aW9uIGlzIHRlc3Qgc2NlbmFyaW9zXG4gKiB3aGVyZSBgcHJvY2Vzcy5leGl0YCBpcyBtb2NrZWQuXG4gKlxuICogIyMgRXhlY3V0aW9uIEZsb3dcbiAqXG4gKiAxLiBFeHRyYWN0IGlucHV0IHBheWxvYWQgZnJvbSBlbnZpcm9ubWVudCB2YXJpYWJsZXMgYmFzZWQgb24gY29tbWFuZCB0eXBlXG4gKiAyLiBTZXQgbG9nZ2VyIGNvbnRleHQgd2l0aCBjb21tYW5kIHR5cGUgYW5kIGlucHV0XG4gKiAzLiBPcHRpb25hbGx5IGNvbm5lY3QgdG8gU09DS0VUX1BBVEggZm9yIGNvbW1hbmQgZGlzcGF0Y2ggKGZhaWwtb3BlbilcbiAqIDQuIEJ1aWxkIEFjdGlvbkNvbnRleHQgd2l0aCBsb2dnZXIsIGN3ZCwgYW5kIHNvY2tldC1iYWNrZWQgY2FsbGJhY2tzXG4gKiA1LiBJbnZva2UgdGhlIGNvbW1hbmQgd2l0aCBpbnB1dCBhbmQgY29udGV4dFxuICogNi4gT24gc3VjY2VzczogY2xlYW4gdXAgc29ja2V0IGFuZCBleGl0IHdpdGggY29kZSAwXG4gKiA3LiBPbiBlcnJvcjogbG9nIGVycm9yLCB3cml0ZSB0byBzdGRlcnIsIGNsZWFuIHVwIGFuZCBleGl0IHdpdGggY29kZSAxXG4gKlxuICpcbiAqIEBzdW1tYXJ5IFJ1bnRpbWUgb3JjaGVzdHJhdGlvbiBmb3IgY29tcGlsZWQgQ2FyZHMgYWN0aW9uIGFuZCB0eXBlIGhhbmRsZXJzXG4gKiBAbW9kdWxlXG4gKiBAc2VlIHtAbGluayBleGVjdXRlQ29tbWFuZH0gZm9yIHRoZSBtYWluIGVudHJ5IHBvaW50XG4gKlxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIC8vIFRoaXMgaXMgd2hhdCBjb21waWxlZCBoYW5kbGVycyBsb29rIGxpa2UgaW50ZXJuYWxseVxuICogaW1wb3J0IHsgZXhlY3V0ZUNvbW1hbmQgfSBmcm9tICdAY2FyZHMvc2RrL2NvbmZpZy9ydW50aW1lJztcbiAqIGltcG9ydCBteUNvbW1hbmQgZnJvbSAnLi9teS1jb21tYW5kLmpzJztcbiAqXG4gKiBleGVjdXRlQ29tbWFuZChteUNvbW1hbmQpO1xuICogYGBgXG4gKi9cblxuaW1wb3J0IHR5cGUgeyBBY3Rpb25Db21tYW5kLCBUeXBlQ3JlYXRlQ29tbWFuZCwgVHlwZURlbGV0ZUNvbW1hbmQsIFR5cGVVcGRhdGVDb21tYW5kIH0gZnJvbSAnLi9jb21tYW5kLXR5cGVzLmpzJztcbmltcG9ydCB7IENBUkRTX0VOVl9WQVJTLCBleHRyYWN0QWN0aW9uSW5wdXQsIGV4dHJhY3RUeXBlSW5wdXQgfSBmcm9tICcuL2Vudi5qcyc7XG5pbXBvcnQgeyBFWElUX0NPREVTLCB3cml0ZUVycm9yIH0gZnJvbSAnLi9leGl0LWNvZGVzLmpzJztcbmltcG9ydCB0eXBlIHsgQWN0aW9uQ29udGV4dCwgQWN0aW9uSW5wdXQsIFR5cGVIb29rQ29udGV4dCwgVHlwZUhvb2tJbnB1dCB9IGZyb20gJy4vaW5wdXRzLmpzJztcbmltcG9ydCB7IGxvZ2dlciB9IGZyb20gJy4vbG9nZ2VyLmpzJztcbmltcG9ydCB0eXBlIHsgU29ja2V0Q29tbWFuZCB9IGZyb20gJy4vc29ja2V0LWNsaWVudC5qcyc7XG5pbXBvcnQgeyBTb2NrZXRDbGllbnQgfSBmcm9tICcuL3NvY2tldC1jbGllbnQuanMnO1xuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBDb21tYW5kIFR5cGUgVW5pb25cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuLyoqXG4gKiBVbmlvbiBvZiBhbGwgY29tbWFuZCB0eXBlcyBzdXBwb3J0ZWQgYnkgdGhlIHJ1bnRpbWUuXG4gKlxuICogVGhpcyB0eXBlIHVuaW9uIGFsbG93cyB7QGxpbmsgZXhlY3V0ZUNvbW1hbmR9IHRvIGFjY2VwdCBhbnkgY29tbWFuZCByZXR1cm5lZCBieVxuICogdGhlIGZhY3RvcnkgZnVuY3Rpb25zLiBUaGUgcnVudGltZSBkaXNwYXRjaGVzIGJhc2VkIG9uIHRoZSBgZmFjdG9yeVR5cGVgXG4gKiBkaXNjcmltaW5hbnQuXG4gKlxuICogTm90ZTogVHlwZVZhbGlkYXRvckNvbW1hbmQgaXMgZXhjbHVkZWQgYmVjYXVzZSB2YWxpZGF0b3JzIHVzZSBhIGRpZmZlcmVudFxuICogZXhlY3V0aW9uIG1vZGVsIChmaWxlLXBhdGggcHJvdG9jb2wgdmlhIHtAbGluayBleGVjdXRlVmFsaWRhdGlvbn0pLlxuICpcbiAqIEBpbnRlcm5hbFxuICovXG50eXBlIEFueUNvbW1hbmQgPSBBY3Rpb25Db21tYW5kIHwgVHlwZUNyZWF0ZUNvbW1hbmQgfCBUeXBlVXBkYXRlQ29tbWFuZCB8IFR5cGVEZWxldGVDb21tYW5kO1xuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBIZWxwZXIgRnVuY3Rpb25zXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbi8qKlxuICogTm9ybWFsaXplcyBhbiB1bmtub3duIGVycm9yIHZhbHVlIGludG8gYSBodW1hbi1yZWFkYWJsZSBtZXNzYWdlLlxuICpcbiAqIEVycm9ycyBpbiBKYXZhU2NyaXB0IGNhbiBiZSB0aHJvd24gd2l0aCBhbnkgdmFsdWUuIFRoaXMgZnVuY3Rpb24gZW5zdXJlc1xuICogd2UgYWx3YXlzIGdldCBhIHN0cmluZyBtZXNzYWdlIHJlZ2FyZGxlc3Mgb2Ygd2hhdCB3YXMgdGhyb3duLlxuICpcbiAqIEBwYXJhbSBlcnJvciAtIFRoZSBjYXVnaHQgZXJyb3IgdmFsdWUsIHdoaWNoIG1heSBvciBtYXkgbm90IGJlIGFuIEVycm9yIGluc3RhbmNlXG4gKiBAcmV0dXJucyBBIHN0cmluZyBtZXNzYWdlIHN1aXRhYmxlIGZvciBsb2dnaW5nIG9yIGRpc3BsYXlcbiAqXG4gKiBAaW50ZXJuYWxcbiAqL1xuZnVuY3Rpb24gZ2V0RXJyb3JNZXNzYWdlKGVycm9yOiB1bmtub3duKTogc3RyaW5nIHtcbiAgcmV0dXJuIGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogU3RyaW5nKGVycm9yKTtcbn1cblxuLyoqXG4gKiBDbGVhbnMgdXAgbG9nZ2VyIHN0YXRlIGFuZCB0ZXJtaW5hdGVzIHRoZSBwcm9jZXNzLlxuICpcbiAqIFRoaXMgZnVuY3Rpb24gbmV2ZXIgcmV0dXJucy4gSXQgY2xlYXJzIHRoZSBsb2dnZXIncyBjb250ZXh0LCBjbG9zZXNcbiAqIG9wZW4gZmlsZSBoYW5kbGVzIHRvIGZsdXNoIHBlbmRpbmcgd3JpdGVzLCBhbmQgZXhpdHMgd2l0aCB0aGUgc3BlY2lmaWVkXG4gKiBjb2RlLlxuICpcbiAqIEBwYXJhbSBleGl0Q29kZSAtIFRoZSBleGl0IGNvZGUgdG8gcGFzcyB0byBgcHJvY2Vzcy5leGl0KClgXG4gKiBAcmV0dXJucyBOZXZlciByZXR1cm5zOyBwcm9jZXNzIHRlcm1pbmF0ZXNcbiAqXG4gKiBAaW50ZXJuYWxcbiAqL1xuZnVuY3Rpb24gY2xlYW51cEFuZEV4aXQoZXhpdENvZGU6IG51bWJlcik6IG5ldmVyIHtcbiAgbG9nZ2VyLmNsZWFyQ29udGV4dCgpO1xuICBsb2dnZXIuY2xvc2UoKTtcbiAgcHJvY2Vzcy5leGl0KGV4aXRDb2RlKTtcbn1cblxuLyoqXG4gKiBIYW5kbGVzIGVycm9ycyBkdXJpbmcgZW52aXJvbm1lbnQgdmFyaWFibGUgZXh0cmFjdGlvbi5cbiAqXG4gKiBFbnZpcm9ubWVudCBleHRyYWN0aW9uIGNhbiBmYWlsIGlmIHJlcXVpcmVkIHZhcmlhYmxlcyBhcmUgbWlzc2luZyBvclxuICogbWFsZm9ybWVkLiBUaGlzIHByb3ZpZGVzIHVzZXItZnJpZW5kbHkgZXJyb3Igb3V0cHV0IGFuZCBlbnN1cmVzIHByb3BlclxuICogY2xlYW51cCBiZWZvcmUgZXhpdC5cbiAqXG4gKiBAcGFyYW0gZXJyb3IgLSBUaGUgZXJyb3IgdGhyb3duIGR1cmluZyBleHRyYWN0aW9uXG4gKiBAcmV0dXJucyBOZXZlciByZXR1cm5zOyBwcm9jZXNzIHRlcm1pbmF0ZXMgd2l0aCBlcnJvciBjb2RlXG4gKlxuICogQGludGVybmFsXG4gKi9cbmZ1bmN0aW9uIGhhbmRsZUVudkV4dHJhY3Rpb25FcnJvcihlcnJvcjogdW5rbm93bik6IG5ldmVyIHtcbiAgY29uc3QgbWVzc2FnZSA9IGdldEVycm9yTWVzc2FnZShlcnJvcik7XG4gIGxvZ2dlci5lcnJvcihgRmFpbGVkIHRvIGV4dHJhY3QgaW5wdXQgZnJvbSBlbnZpcm9ubWVudDogJHttZXNzYWdlfWApO1xuICB3cml0ZUVycm9yKGBIYW5kbGVyIGZhaWxlZDogJHttZXNzYWdlfWApO1xuICBjbGVhbnVwQW5kRXhpdChFWElUX0NPREVTLkVSUk9SKTtcbn1cblxuLyoqXG4gKiBIYW5kbGVzIGVycm9ycyB0aHJvd24gYnkgdGhlIHVzZXIncyBjb21tYW5kIGhhbmRsZXIuXG4gKlxuICogV2hlbiBhIGhhbmRsZXIgdGhyb3dzIG9yIHJlamVjdHMsIHdlIHdhbnQgdG8gcHJvdmlkZSB1c2VmdWwgZGVidWdnaW5nXG4gKiBpbmZvcm1hdGlvbi4gVGhpcyB3cml0ZXMgdGhlIGZ1bGwgc3RhY2sgdHJhY2UgdG8gc3RkZXJyICh3aGljaCB0aGVcbiAqIGV4ZWN1dGlvbiB3cmFwcGVyIGNhcHR1cmVzKSBhbmQgbG9ncyBhIHN0cnVjdHVyZWQgZXJyb3IgZXZlbnQuXG4gKlxuICogQHBhcmFtIGVycm9yIC0gVGhlIGVycm9yIHRocm93biBvciByZWplY3Rpb24gcmVhc29uIGZyb20gdGhlIGhhbmRsZXJcbiAqIEByZXR1cm5zIE5ldmVyIHJldHVybnM7IHByb2Nlc3MgdGVybWluYXRlcyB3aXRoIGVycm9yIGNvZGVcbiAqXG4gKiBAaW50ZXJuYWxcbiAqL1xuZnVuY3Rpb24gaGFuZGxlSGFuZGxlckVycm9yKGVycm9yOiB1bmtub3duKTogbmV2ZXIge1xuICBjb25zdCBlcnJvck91dHB1dCA9IGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyAoZXJyb3Iuc3RhY2sgPz8gZXJyb3IubWVzc2FnZSkgOiBTdHJpbmcoZXJyb3IpO1xuICBwcm9jZXNzLnN0ZGVyci53cml0ZShgJHtlcnJvck91dHB1dH1cXG5gKTtcbiAgbG9nZ2VyLmVycm9yKGBIYW5kbGVyIGVycm9yOiAke2dldEVycm9yTWVzc2FnZShlcnJvcil9YCk7XG4gIGNsZWFudXBBbmRFeGl0KEVYSVRfQ09ERVMuRVJST1IpO1xufVxuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBFeGVjdXRlIEZ1bmN0aW9uXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbi8qKlxuICogRXhlY3V0ZXMgYSBjb21tYW5kIGhhbmRsZXIgd2l0aCBmdWxsIHJ1bnRpbWUgb3JjaGVzdHJhdGlvbi5cbiAqXG4gKiBUaGlzIGlzIHRoZSBtYWluIGVudHJ5IHBvaW50IHRoYXQgY29tcGlsZWQgaGFuZGxlcnMgdXNlLiBUaGUgQ0xJIGdlbmVyYXRlc1xuICogd3JhcHBlciBjb2RlIHRoYXQgaW1wb3J0cyB0aGUgdXNlcidzIGNvbW1hbmQgYW5kIHBhc3NlcyBpdCB0byB0aGlzIGZ1bmN0aW9uLlxuICogRnJvbSB0aGVyZSwgZXhlY3V0ZUNvbW1hbmQgaGFuZGxlcyBhbGwgdGhlIGNlcmVtb255OiBlbnZpcm9ubWVudCBwYXJzaW5nLCBsb2dnaW5nXG4gKiBzZXR1cCwgaGFuZGxlciBpbnZvY2F0aW9uLCBlcnJvciBoYW5kbGluZywgYW5kIHByb2Nlc3MgdGVybWluYXRpb24uXG4gKlxuICogVGhlIGZ1bmN0aW9uIGV4aXRzIHRoZSBwcm9jZXNzIGluIGFsbCBub3JtYWwgY29kZSBwYXRocy4gVGhlIHJldHVybmVkXG4gKiBwcm9taXNlIG9ubHkgcmVzb2x2ZXMgaWYgYHByb2Nlc3MuZXhpdGAgaXMgbW9ja2VkLCB3aGljaCBoYXBwZW5zIGluIHRlc3RcbiAqIHNjZW5hcmlvcy4gUHJvZHVjdGlvbiBjb2RlIHNob3VsZCBub3QgYXdhaXQgdGhpcyBmdW5jdGlvbiBvciBleHBlY3QgaXRcbiAqIHRvIHJldHVybi5cbiAqXG4gKiAjIyBTdXBwb3J0ZWQgQ29tbWFuZCBUeXBlc1xuICpcbiAqIC0gKipBY3Rpb24qKiAoYGFjdGlvbmApOiBJbnZva2VkIHdoZW4gYW4gYWN0aW9uIGlzIHRyaWdnZXJlZFxuICogLSAqKlR5cGUgQ3JlYXRlKiogKGB0eXBlQ3JlYXRlYCk6IFJ1bnMgYWZ0ZXIgbmV3IHR5cGVkIGZpbGUgY3JlYXRpb25cbiAqIC0gKipUeXBlIFVwZGF0ZSoqIChgdHlwZVVwZGF0ZWApOiBSdW5zIGFmdGVyIHR5cGVkIGZpbGUgbW9kaWZpY2F0aW9uXG4gKiAtICoqVHlwZSBEZWxldGUqKiAoYHR5cGVEZWxldGVgKTogUnVucyB3aGVuIHR5cGVkIGZpbGUgaXMgZGVsZXRlZFxuICpcbiAqIE5vdGU6IFR5cGUgdmFsaWRhdG9ycyB1c2UgYSBkaWZmZXJlbnQgZXhlY3V0aW9uIG1vZGVsIChmaWxlLXBhdGggcHJvdG9jb2wpXG4gKiBhbmQgc2hvdWxkIGJlIGV4ZWN1dGVkIHZpYSB7QGxpbmsgZXhlY3V0ZVZhbGlkYXRpb259IGluc3RlYWQuXG4gKlxuICogIyMgRXJyb3IgSGFuZGxpbmdcbiAqXG4gKiBFcnJvcnMgYXJlIGhhbmRsZWQgYXQgdGhyZWUgbGV2ZWxzOlxuICpcbiAqIDEuICoqRW52aXJvbm1lbnQgZXh0cmFjdGlvbiBlcnJvcnMqKiAobWlzc2luZy9pbnZhbGlkIHZhcmlhYmxlcyk6IExvZyB0aGVcbiAqICAgIGVycm9yIGFuZCBleGl0LiBUaGVzZSBpbmRpY2F0ZSBhIHByb2JsZW0gd2l0aCBob3cgdGhlIGhhbmRsZXIgd2FzIGludm9rZWQuXG4gKlxuICogMi4gKipIYW5kbGVyIGVycm9ycyoqICh1c2VyIGNvZGUgdGhyb3dzKTogV3JpdGUgdGhlIHN0YWNrIHRyYWNlIHRvIHN0ZGVycixcbiAqICAgIGxvZyBhIHN0cnVjdHVyZWQgZXJyb3IsIGFuZCBleGl0LiBUaGUgZXhlY3V0aW9uIHdyYXBwZXIgY2FwdHVyZXMgc3RkZXJyXG4gKiAgICBmb3IgZGVidWdnaW5nLlxuICpcbiAqIDMuICoqVW5leHBlY3RlZCBlcnJvcnMqKjogQ2F0Y2gtYWxsIGZvciBhbnkgb3RoZXIgZmFpbHVyZXMgZHVyaW5nIHJ1bnRpbWVcbiAqICAgIG9yY2hlc3RyYXRpb24uXG4gKlxuICogQHBhcmFtIGNvbW1hbmQgLSBUaGUgY29tbWFuZCB0byBleGVjdXRlLCByZXR1cm5lZCBmcm9tIGEgZmFjdG9yeSBmdW5jdGlvblxuICogQHJldHVybnMgQSBwcm9taXNlIHRoYXQgcmVzb2x2ZXMgb25seSB3aGVuIGBwcm9jZXNzLmV4aXRgIGlzIG1vY2tlZCAodGVzdHMpXG4gKlxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIC8vIEdlbmVyYXRlZCB3cmFwcGVyIGNvZGUgKHByb2R1Y2VkIGJ5IENMSSlcbiAqIGltcG9ydCB7IGV4ZWN1dGVDb21tYW5kIH0gZnJvbSAnQGNhcmRzL3Nkay9jb25maWcvcnVudGltZSc7XG4gKiBpbXBvcnQgY29tbWFuZCBmcm9tICcuL3VzZXItY29tbWFuZC5qcyc7XG4gKlxuICogLy8gVGhpcyBjYWxsIG5ldmVyIHJldHVybnMgaW4gcHJvZHVjdGlvblxuICogZXhlY3V0ZUNvbW1hbmQoY29tbWFuZCk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGV4ZWN1dGVDb21tYW5kKGNvbW1hbmQ6IEFueUNvbW1hbmQpOiBQcm9taXNlPHZvaWQ+IHtcbiAgdHJ5IHtcbiAgICBsZXQgaW5wdXQ6IEFjdGlvbklucHV0IHwgVHlwZUhvb2tJbnB1dDtcblxuICAgIHRyeSB7XG4gICAgICBpZiAoY29tbWFuZC5mYWN0b3J5VHlwZSA9PT0gJ2FjdGlvbicpIHtcbiAgICAgICAgaW5wdXQgPSBleHRyYWN0QWN0aW9uSW5wdXQoKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGlucHV0ID0gZXh0cmFjdFR5cGVJbnB1dCgpO1xuICAgICAgfVxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICByZXR1cm4gaGFuZGxlRW52RXh0cmFjdGlvbkVycm9yKGVycm9yKTtcbiAgICB9XG5cbiAgICAvLyBTZXQgbG9nZ2VyIGNvbnRleHQgd2l0aCBjb21tYW5kIHR5cGVcbiAgICBsb2dnZXIuc2V0Q29udGV4dChjb21tYW5kLmZhY3RvcnlUeXBlLCB7IC4uLmlucHV0IH0pO1xuXG4gICAgaWYgKGNvbW1hbmQuZmFjdG9yeVR5cGUgPT09ICdhY3Rpb24nKSB7XG4gICAgICAvLyBTb2NrZXQgY29ubmVjdGlvbiBhbmQgQWN0aW9uQ29udGV4dCBmb3IgYWN0aW9uIGNvbW1hbmRzXG4gICAgICBsZXQgc29ja2V0Q2xpZW50OiBTb2NrZXRDbGllbnQgfCB1bmRlZmluZWQ7XG4gICAgICBjb25zdCBzb2NrZXRQYXRoID0gcHJvY2Vzcy5lbnZbQ0FSRFNfRU5WX1ZBUlMuU09DS0VUX1BBVEhdO1xuICAgICAgaWYgKHNvY2tldFBhdGgpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBzb2NrZXRDbGllbnQgPSBhd2FpdCBTb2NrZXRDbGllbnQuY29ubmVjdChzb2NrZXRQYXRoKTtcbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICBsb2dnZXIud2FybihgRmFpbGVkIHRvIGNvbm5lY3QgdG8gc29ja2V0IGF0ICR7c29ja2V0UGF0aH06ICR7Z2V0RXJyb3JNZXNzYWdlKGVycm9yKX1gKTtcbiAgICAgICAgICAvLyBGYWlsLW9wZW46IGNvbnRpbnVlIHdpdGhvdXQgc29ja2V0XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgLy8gQ2FsbGJhY2sgcmVnaXN0cmF0aW9uIHN0YXRlXG4gICAgICBsZXQgY2FuY2VsQ2FsbGJhY2s6ICgoKSA9PiB2b2lkIHwgUHJvbWlzZTx2b2lkPikgfCB1bmRlZmluZWQ7XG4gICAgICBsZXQgc3dpdGNoVG9JbnRlcmFjdGl2ZUNhbGxiYWNrOiAoKCkgPT4gdW5rbm93biB8IFByb21pc2U8dW5rbm93bj4pIHwgdW5kZWZpbmVkO1xuICAgICAgbGV0IGNvbW1hbmRQcm9jZXNzZWQgPSBmYWxzZTtcblxuICAgICAgLy8gQnVpbGQgQWN0aW9uQ29udGV4dCB3aXRoIGxvZ2dlciwgY3dkLCBhbmQgc29ja2V0LWJhY2tlZCBjYWxsYmFja3NcbiAgICAgIGNvbnN0IGNvbnRleHQ6IEFjdGlvbkNvbnRleHQgPSB7XG4gICAgICAgIGxvZ2dlcixcbiAgICAgICAgY3dkOiBwcm9jZXNzLmN3ZCgpLFxuICAgICAgICBvbkNhbmNlbDogKGNhbGxiYWNrKSA9PiB7XG4gICAgICAgICAgY2FuY2VsQ2FsbGJhY2sgPSBjYWxsYmFjaztcbiAgICAgICAgfSxcbiAgICAgICAgb25Td2l0Y2hUb0ludGVyYWN0aXZlOiAoY2FsbGJhY2spID0+IHtcbiAgICAgICAgICBzd2l0Y2hUb0ludGVyYWN0aXZlQ2FsbGJhY2sgPSBjYWxsYmFjaztcbiAgICAgICAgfVxuICAgICAgfTtcblxuICAgICAgLy8gV2lyZSBzb2NrZXQgY29tbWFuZCBkaXNwYXRjaFxuICAgICAgaWYgKHNvY2tldENsaWVudCkge1xuICAgICAgICBzb2NrZXRDbGllbnQub25Db21tYW5kKChjbWQ6IFNvY2tldENvbW1hbmQpID0+IHtcbiAgICAgICAgICAvLyBGaXJzdC13aW5zIHNlbWFudGljczogaWdub3JlIHN1YnNlcXVlbnQgY29tbWFuZHNcbiAgICAgICAgICBpZiAoY29tbWFuZFByb2Nlc3NlZCkgcmV0dXJuO1xuICAgICAgICAgIGNvbW1hbmRQcm9jZXNzZWQgPSB0cnVlO1xuXG4gICAgICAgICAgaWYgKGNtZC50eXBlID09PSAnY2FuY2VsJykge1xuICAgICAgICAgICAgaGFuZGxlQ2FuY2VsQ29tbWFuZChjYW5jZWxDYWxsYmFjaywgc29ja2V0Q2xpZW50KTtcbiAgICAgICAgICB9IGVsc2UgaWYgKGNtZC50eXBlID09PSAnc3dpdGNoVG9JbnRlcmFjdGl2ZScpIHtcbiAgICAgICAgICAgIGhhbmRsZVN3aXRjaFRvSW50ZXJhY3RpdmVDb21tYW5kKHN3aXRjaFRvSW50ZXJhY3RpdmVDYWxsYmFjaywgc29ja2V0Q2xpZW50ISk7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgICAgLy8gRXhlY3V0ZSB0aGUgYWN0aW9uIGNvbW1hbmQgaGFuZGxlclxuICAgICAgdHJ5IHtcbiAgICAgICAgYXdhaXQgY29tbWFuZChpbnB1dCBhcyBBY3Rpb25JbnB1dCwgY29udGV4dCk7XG4gICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICBzb2NrZXRDbGllbnQ/LmNsb3NlKCk7XG4gICAgICAgIHJldHVybiBoYW5kbGVIYW5kbGVyRXJyb3IoZXJyb3IpO1xuICAgICAgfVxuXG4gICAgICAvLyBDbGVhbiB1cCBzb2NrZXQgYW5kIGV4aXQgc3VjY2Vzc2Z1bGx5XG4gICAgICBzb2NrZXRDbGllbnQ/LmNsb3NlKCk7XG4gICAgICBjbGVhbnVwQW5kRXhpdChFWElUX0NPREVTLlNVQ0NFU1MpO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBUeXBlSG9va0NvbnRleHQgZm9yIHR5cGUgbGlmZWN5Y2xlIGhvb2tzXG4gICAgICBjb25zdCBjb250ZXh0OiBUeXBlSG9va0NvbnRleHQgPSB7XG4gICAgICAgIGxvZ2dlcixcbiAgICAgICAgY3dkOiBwcm9jZXNzLmN3ZCgpXG4gICAgICB9O1xuXG4gICAgICAvLyBFeGVjdXRlIHRoZSB0eXBlIGhvb2sgY29tbWFuZCBoYW5kbGVyXG4gICAgICB0cnkge1xuICAgICAgICBhd2FpdCBjb21tYW5kKGlucHV0IGFzIFR5cGVIb29rSW5wdXQsIGNvbnRleHQpO1xuICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgcmV0dXJuIGhhbmRsZUhhbmRsZXJFcnJvcihlcnJvcik7XG4gICAgICB9XG5cbiAgICAgIGNsZWFudXBBbmRFeGl0KEVYSVRfQ09ERVMuU1VDQ0VTUyk7XG4gICAgfVxuICB9IGNhdGNoIChlcnJvcikge1xuICAgIC8vIFVuZXhwZWN0ZWQgZXJyb3IgLSB0cnkgdG8gY2xlYW4gdXAgYW5kIGV4aXRcbiAgICBsb2dnZXIuZXJyb3IoYFVuZXhwZWN0ZWQgcnVudGltZSBlcnJvcjogJHtnZXRFcnJvck1lc3NhZ2UoZXJyb3IpfWApO1xuICAgIGNsZWFudXBBbmRFeGl0KEVYSVRfQ09ERVMuRVJST1IpO1xuICB9XG59XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIFNvY2tldCBDb21tYW5kIEhhbmRsZXJzXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbi8qKlxuICogUmVzb2x2ZXMgYSBjYWxsYmFjayByZXN1bHQgdGhhdCBtYXkgYmUgc3luYyBvciBhc3luYyBpbnRvIGEgUHJvbWlzZS5cbiAqXG4gKiBVc2VyLXJlZ2lzdGVyZWQgY2FsbGJhY2tzIG1heSByZXR1cm4gdm9pZCwgYSB2YWx1ZSwgb3IgYSBQcm9taXNlLlxuICogVGhpcyBub3JtYWxpemVzIGFsbCBjYXNlcyBpbnRvIGEgc2luZ2xlIFByb21pc2UgZm9yIGNvbnNpc3RlbnQgaGFuZGxpbmcuXG4gKlxuICogQHBhcmFtIHJlc3VsdCAtIENhbGxiYWNrIHJldHVybiB2YWx1ZSB0aGF0IG1heSBhbHJlYWR5IGJlIGEgcHJvbWlzZS5cbiAqIEByZXR1cm5zIFByb21pc2UgcmVzb2x2aW5nIHRvIHRoZSBjYWxsYmFjayByZXN1bHQuXG4gKiBAaW50ZXJuYWxcbiAqL1xuZnVuY3Rpb24gdG9Qcm9taXNlPFQ+KHJlc3VsdDogVCB8IFByb21pc2U8VD4pOiBQcm9taXNlPFQ+IHtcbiAgaWYgKHJlc3VsdCAmJiB0eXBlb2YgKHJlc3VsdCBhcyBQcm9taXNlPFQ+KS50aGVuID09PSAnZnVuY3Rpb24nKSB7XG4gICAgcmV0dXJuIHJlc3VsdCBhcyBQcm9taXNlPFQ+O1xuICB9XG4gIHJldHVybiBQcm9taXNlLnJlc29sdmUocmVzdWx0KTtcbn1cblxuLyoqXG4gKiBIYW5kbGVzIGEgYGNhbmNlbGAgY29tbWFuZCBmcm9tIHRoZSBzb2NrZXQuXG4gKlxuICogSWYgYSBjYW5jZWwgY2FsbGJhY2sgd2FzIHJlZ2lzdGVyZWQsIGl0IGlzIGludm9rZWQuIE90aGVyd2lzZSwgU0lHVEVSTVxuICogaXMgc2VudCB0byB0aGUgY3VycmVudCBwcm9jZXNzIGFzIGEgZmFsbGJhY2suIEFmdGVyIHRoZSBjYWxsYmFjayBjb21wbGV0ZXNcbiAqIChvciBpbW1lZGlhdGVseSBpZiBubyBjYWxsYmFjayksIHRoZSBwcm9jZXNzIGV4aXRzIHdpdGggZXJyb3IgY29kZS5cbiAqXG4gKiBAcGFyYW0gY2FsbGJhY2sgLSBUaGUgcmVnaXN0ZXJlZCBjYW5jZWwgY2FsbGJhY2ssIGlmIGFueVxuICogQHBhcmFtIHNvY2tldENsaWVudCAtIFRoZSBzb2NrZXQgY2xpZW50IHRvIGNsb3NlIGJlZm9yZSBleGl0aW5nXG4gKlxuICogQGludGVybmFsXG4gKi9cbmZ1bmN0aW9uIGhhbmRsZUNhbmNlbENvbW1hbmQoXG4gIGNhbGxiYWNrOiAoKCkgPT4gdm9pZCB8IFByb21pc2U8dm9pZD4pIHwgdW5kZWZpbmVkLFxuICBzb2NrZXRDbGllbnQ6IFNvY2tldENsaWVudCB8IHVuZGVmaW5lZFxuKTogdm9pZCB7XG4gIGlmICghY2FsbGJhY2spIHtcbiAgICBwcm9jZXNzLmtpbGwocHJvY2Vzcy5waWQsICdTSUdURVJNJyk7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgdG9Qcm9taXNlKGNhbGxiYWNrKCkpLnRoZW4oXG4gICAgKCkgPT4ge1xuICAgICAgc29ja2V0Q2xpZW50Py5jbG9zZSgpO1xuICAgICAgY2xlYW51cEFuZEV4aXQoRVhJVF9DT0RFUy5FUlJPUik7XG4gICAgfSxcbiAgICAoKSA9PiB7XG4gICAgICBzb2NrZXRDbGllbnQ/LmNsb3NlKCk7XG4gICAgICBjbGVhbnVwQW5kRXhpdChFWElUX0NPREVTLkVSUk9SKTtcbiAgICB9XG4gICk7XG59XG5cbi8qKlxuICogSGFuZGxlcyBhIGBzd2l0Y2hUb0ludGVyYWN0aXZlYCBjb21tYW5kIGZyb20gdGhlIHNvY2tldC5cbiAqXG4gKiBJZiBubyBjYWxsYmFjayB3YXMgcmVnaXN0ZXJlZCwgdGhlIGNvbW1hbmQgaXMgaWdub3JlZCAobm8tb3ApLiBPdGhlcndpc2UsXG4gKiB0aGUgY2FsbGJhY2sgaXMgaW52b2tlZCBhbmQgaXRzIHJldHVybiB2YWx1ZSBpcyBzZW50IGFzXG4gKiBgc3dpdGNoVG9JbnRlcmFjdGl2ZVJlc3BvbnNlYCBvbiB0aGUgc29ja2V0LiBgcHJvY2Vzcy5leGl0KDQyKWAgaXMgY2FsbGVkXG4gKiBpbnNpZGUgdGhlIGB3cml0ZSgpYCBjYWxsYmFjayB0byBndWFyYW50ZWUgdGhlIHJlc3BvbnNlIGlzIGZsdXNoZWQgYmVmb3JlXG4gKiB0aGUgZXZlbnQgbG9vcCB0ZWFycyBkb3duLlxuICpcbiAqIEBwYXJhbSBjYWxsYmFjayAtIFRoZSByZWdpc3RlcmVkIHN3aXRjaFRvSW50ZXJhY3RpdmUgY2FsbGJhY2ssIGlmIGFueVxuICogQHBhcmFtIHNvY2tldENsaWVudCAtIFRoZSBzb2NrZXQgY2xpZW50IHVzZWQgdG8gc2VuZCB0aGUgcmVzcG9uc2VcbiAqXG4gKiBAaW50ZXJuYWxcbiAqL1xuZnVuY3Rpb24gaGFuZGxlU3dpdGNoVG9JbnRlcmFjdGl2ZUNvbW1hbmQoXG4gIGNhbGxiYWNrOiAoKCkgPT4gdW5rbm93biB8IFByb21pc2U8dW5rbm93bj4pIHwgdW5kZWZpbmVkLFxuICBzb2NrZXRDbGllbnQ6IFNvY2tldENsaWVudFxuKTogdm9pZCB7XG4gIGlmICghY2FsbGJhY2spIHtcbiAgICByZXR1cm47XG4gIH1cblxuICB0b1Byb21pc2UoY2FsbGJhY2soKSkudGhlbihcbiAgICAoZGF0YSkgPT4ge1xuICAgICAgc29ja2V0Q2xpZW50LnNlbmRSZXNwb25zZVRoZW4oeyB0eXBlOiAnc3dpdGNoVG9JbnRlcmFjdGl2ZVJlc3BvbnNlJywgZGF0YSB9LCAoKSA9PiB7XG4gICAgICAgIGNsZWFudXBBbmRFeGl0KEVYSVRfQ09ERVMuU1dJVENIX1RPX0lOVEVSQUNUSVZFKTtcbiAgICAgIH0pO1xuICAgIH0sXG4gICAgKGVycm9yKSA9PiB7XG4gICAgICBsb2dnZXIuZXJyb3IoYHN3aXRjaFRvSW50ZXJhY3RpdmUgY2FsbGJhY2sgZXJyb3I6ICR7Z2V0RXJyb3JNZXNzYWdlKGVycm9yKX1gKTtcbiAgICAgIHNvY2tldENsaWVudC5jbG9zZSgpO1xuICAgICAgY2xlYW51cEFuZEV4aXQoRVhJVF9DT0RFUy5FUlJPUik7XG4gICAgfVxuICApO1xufVxuIiwgIi8qKlxuICogU2hhcmVkIHNlc3Npb24gdXRpbGl0aWVzIGZvciBDbGF1ZGUgQ29kZSBhY3Rpb24gd29ya2Zsb3dzLlxuICpcbiAqIFByb3ZpZGVzIHJldXNhYmxlIGJ1aWxkaW5nIGJsb2NrcyBmb3IgYWN0aW9ucyB0aGF0IHNwYXduIHRoZSBgY2xhdWRlYCBDTEk6XG4gKiBwbHVnaW4gc2V0dGluZ3MgY29uc3RydWN0aW9uLCBDTEkgYXJnIGJ1aWxkaW5nLCB3b3JrdHJlZSBsaWZlY3ljbGUgbWFuYWdlbWVudCxcbiAqIGFuZCBicmFuY2ggY2xlYW51cC4gQm90aCB0aGUgYGxhdW5jaGAgYW5kIGBpbnRlcnZpZXdgIGFjdGlvbnMgY29uc3VtZSB0aGVzZVxuICogdXRpbGl0aWVzLlxuICpcbiAqIEBzdW1tYXJ5IFNoYXJlZCBzZXNzaW9uIHV0aWxpdGllcyBmb3IgQ2xhdWRlIENvZGUgYWN0aW9uIHdvcmtmbG93c1xuICogQG1vZHVsZVxuICovXG5cbmltcG9ydCB7IHR5cGUgQ2hpbGRQcm9jZXNzLCBleGVjRmlsZSwgc3Bhd24gfSBmcm9tICdub2RlOmNoaWxkX3Byb2Nlc3MnO1xuaW1wb3J0ICogYXMgZnMgZnJvbSAnbm9kZTpmcy9wcm9taXNlcyc7XG5pbXBvcnQgeyBob21lZGlyIH0gZnJvbSAnbm9kZTpvcyc7XG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ25vZGU6cGF0aCc7XG5pbXBvcnQgeyBwcm9taXNpZnkgfSBmcm9tICdub2RlOnV0aWwnO1xuaW1wb3J0IHsgQ2FyZHNDbGllbnQgfSBmcm9tICdAY2FyZHMvc2RrL2NsaWVudCc7XG5pbXBvcnQgeyB0eXBlIEFjdGlvbkNvbnRleHQsIHR5cGUgQWN0aW9uSW5wdXQsIENBUkRTX0VOVl9WQVJTIH0gZnJvbSAnQGNhcmRzL3Nkay9jb25maWcnO1xuaW1wb3J0IHsgY2hlY2tXb3JrdHJlZUV4aXN0cywgY3JlYXRlV29ya3RyZWUsIGZpbmRHaXRSb290cyB9IGZyb20gJy4vY3JlYXRlLXdvcmt0cmVlLmpzJztcblxuY29uc3QgZXhlY0ZpbGVBc3luYyA9IHByb21pc2lmeShleGVjRmlsZSk7XG5cbi8qKlxuICogRXh0cmFjdHMgYSBodW1hbi1yZWFkYWJsZSBtZXNzYWdlIGZyb20gYW4gdW5rbm93biBjYXRjaCB2YWx1ZS5cbiAqIEBwYXJhbSBlcnJvciAtIFRoZSBjYXVnaHQgdmFsdWUgdG8gZXh0cmFjdCBhIG1lc3NhZ2UgZnJvbS5cbiAqIEByZXR1cm5zIFRoZSBlcnJvciBtZXNzYWdlIHN0cmluZy5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGVycm9yTWVzc2FnZShlcnJvcjogdW5rbm93bik6IHN0cmluZyB7XG4gIHJldHVybiBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6IFN0cmluZyhlcnJvcik7XG59XG5cbi8qKlxuICogUmVzb2x2ZXMgdGhlIG1hcmtldHBsYWNlIGRpcmVjdG9yeSBidW5kbGVkIHdpdGggdGhlIGluc3RhbGxlZCBleHRlbnNpb24uXG4gKiBVc2VzIHRoZSBFWFRFTlNJT05fUEFUSCBlbnZpcm9ubWVudCB2YXJpYWJsZSBpbmplY3RlZCBieSBBY3Rpb25EaXNwYXRjaGVyLlxuICpcbiAqIEByZXR1cm5zIEFic29sdXRlIHBhdGggdG8gdGhlIGJ1bmRsZWQgbWFya2V0cGxhY2UgZGlyZWN0b3J5LlxuICogQHRocm93cyBFcnJvciBpZiBFWFRFTlNJT05fUEFUSCBpcyBub3Qgc2V0LlxuICovXG5leHBvcnQgZnVuY3Rpb24gcmVzb2x2ZU1hcmtldHBsYWNlUGF0aCgpOiBzdHJpbmcge1xuICBjb25zdCBleHRlbnNpb25QYXRoID0gcHJvY2Vzcy5lbnZbQ0FSRFNfRU5WX1ZBUlMuRVhURU5TSU9OX1BBVEhdO1xuICBpZiAoIWV4dGVuc2lvblBhdGgpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYE1pc3NpbmcgcmVxdWlyZWQgZW52aXJvbm1lbnQgdmFyaWFibGU6ICR7Q0FSRFNfRU5WX1ZBUlMuRVhURU5TSU9OX1BBVEh9YCk7XG4gIH1cbiAgcmV0dXJuIHBhdGguam9pbihleHRlbnNpb25QYXRoLCAnZGlzdCcsICdtYXJrZXRwbGFjZScpO1xufVxuXG4vKipcbiAqIEJ1aWxkcyB0aGUgYC0tc2V0dGluZ3NgIEpTT04gdGhhdCBlbmFibGVzIHRoZSBgcnVudGltZWAgcGx1Z2luIGFuZCByZWdpc3RlcnNcbiAqIHRoZSBgY2FyZHMubWFuYWdlbWVudGAgbWFya2V0cGxhY2Ugc291cmNlIHNvIHRoZSBzcGF3bmVkIGBjbGF1ZGVgIHByb2Nlc3NcbiAqIGNhbiByZXNvbHZlIHRoZSBwbHVnaW4gZnJvbSB0aGUgZXh0ZW5zaW9uJ3MgYnVuZGxlZCBtYXJrZXRwbGFjZS5cbiAqXG4gKiBVc2VzIHRoZSBtYXJrZXRwbGFjZSBidW5kbGVkIGluc2lkZSB0aGUgZXh0ZW5zaW9uIGluc3RhbGwgZGlyZWN0b3J5XG4gKiAoYDxFWFRFTlNJT05fUEFUSD4vZGlzdC9tYXJrZXRwbGFjZWApIHNvIHRoZSBzcGF3bmVkIHNlc3Npb24gYWx3YXlzIGxvYWRzIHRoZVxuICogcGx1Z2luIHZlcnNpb24gdGhhdCBzaGlwcGVkIHdpdGggdGhlIGV4dGVuc2lvbiwgcmVnYXJkbGVzcyBvZiB3b3JrdHJlZSBzdGF0ZS5cbiAqXG4gKiBAcGFyYW0gbWFya2V0cGxhY2VQYXRoIC0gQWJzb2x1dGUgcGF0aCB0byB0aGUgYnVuZGxlZCBtYXJrZXRwbGFjZSBkaXJlY3RvcnkuXG4gKiBAcmV0dXJucyBTZXJpYWxpc2VkIHNldHRpbmdzIEpTT04gc3RyaW5nLlxuICovXG5leHBvcnQgZnVuY3Rpb24gYnVpbGRQbHVnaW5TZXR0aW5ncyhtYXJrZXRwbGFjZVBhdGg6IHN0cmluZyk6IHN0cmluZyB7XG4gIHJldHVybiBKU09OLnN0cmluZ2lmeSh7XG4gICAgZW5hYmxlZFBsdWdpbnM6IHsgJ3J1bnRpbWVAY2FyZHMubWFuYWdlbWVudCc6IHRydWUgfSxcbiAgICBleHRyYUtub3duTWFya2V0cGxhY2VzOiB7XG4gICAgICAnY2FyZHMubWFuYWdlbWVudCc6IHtcbiAgICAgICAgc291cmNlOiB7IHNvdXJjZTogJ2RpcmVjdG9yeScsIHBhdGg6IG1hcmtldHBsYWNlUGF0aCB9XG4gICAgICB9XG4gICAgfVxuICB9KTtcbn1cblxuLyoqXG4gKiBSZXNvbHZlcyB0aGUgQ2xhdWRlIENvZGUgY29uZmlndXJhdGlvbiBkaXJlY3RvcnkgdXNpbmcgdGhlIHN0YW5kYXJkXG4gKiBmYWxsYmFjayBjaGFpbjogJENMQVVERV9DT05GSUdfRElSIFx1MjE5MiAkWERHX0RBVEFfSE9NRS9jbGF1ZGUgXHUyMTkyXG4gKiAkWERHX0NPTkZJR19IT01FL2NsYXVkZSBcdTIxOTIgfi8uY29uZmlnL2NsYXVkZSBcdTIxOTIgfi8uY2xhdWRlLlxuICpcbiAqIFJldHVybnMgdGhlIGZpcnN0IGNhbmRpZGF0ZSB0aGF0IGV4aXN0cyBvbiBkaXNrLCBvciBudWxsIGlmIG5vbmUgaXMgZm91bmQuXG4gKlxuICogQHJldHVybnMgVGhlIGZpcnN0IGV4aXN0aW5nIENsYXVkZSBjb25maWcgZGlyZWN0b3J5IHBhdGgsIG9yIG51bGwgaWYgbm9uZSBmb3VuZC5cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHJlc29sdmVDbGF1ZGVDb25maWdEaXIoKTogUHJvbWlzZTxzdHJpbmcgfCBudWxsPiB7XG4gIGNvbnN0IGhvbWUgPSBob21lZGlyKCk7XG4gIGNvbnN0IGNhbmRpZGF0ZXM6IHN0cmluZ1tdID0gW107XG5cbiAgY29uc3QgY2xhdWRlQ29uZmlnRGlyID0gcHJvY2Vzcy5lbnZbJ0NMQVVERV9DT05GSUdfRElSJ107XG4gIGlmIChjbGF1ZGVDb25maWdEaXIpIGNhbmRpZGF0ZXMucHVzaChjbGF1ZGVDb25maWdEaXIpO1xuXG4gIGNvbnN0IHhkZ0RhdGFIb21lID0gcHJvY2Vzcy5lbnZbJ1hER19EQVRBX0hPTUUnXTtcbiAgaWYgKHhkZ0RhdGFIb21lKSBjYW5kaWRhdGVzLnB1c2gocGF0aC5qb2luKHhkZ0RhdGFIb21lLCAnY2xhdWRlJykpO1xuXG4gIGNvbnN0IHhkZ0NvbmZpZ0hvbWUgPSBwcm9jZXNzLmVudlsnWERHX0NPTkZJR19IT01FJ107XG4gIGlmICh4ZGdDb25maWdIb21lKSBjYW5kaWRhdGVzLnB1c2gocGF0aC5qb2luKHhkZ0NvbmZpZ0hvbWUsICdjbGF1ZGUnKSk7XG5cbiAgY2FuZGlkYXRlcy5wdXNoKHBhdGguam9pbihob21lLCAnLmNvbmZpZycsICdjbGF1ZGUnKSk7XG4gIGNhbmRpZGF0ZXMucHVzaChwYXRoLmpvaW4oaG9tZSwgJy5jbGF1ZGUnKSk7XG5cbiAgZm9yIChjb25zdCBjYW5kaWRhdGUgb2YgY2FuZGlkYXRlcykge1xuICAgIHRyeSB7XG4gICAgICBhd2FpdCBmcy5hY2Nlc3MocGF0aC5qb2luKGNhbmRpZGF0ZSwgJ3BsdWdpbnMnKSk7XG4gICAgICByZXR1cm4gY2FuZGlkYXRlO1xuICAgIH0gY2F0Y2gge1xuICAgICAgLy8gTm90IGZvdW5kLCB0cnkgbmV4dFxuICAgIH1cbiAgfVxuICByZXR1cm4gbnVsbDtcbn1cblxuLyoqXG4gKiBVcGRhdGVzIHRoZSBgY2FyZHMubWFuYWdlbWVudGAgZW50cnkgaW4gQ2xhdWRlIENvZGUncyBga25vd25fbWFya2V0cGxhY2VzLmpzb25gXG4gKiB0byBwb2ludCB0byB0aGUgZXh0ZW5zaW9uLWJ1bmRsZWQgbWFya2V0cGxhY2UgdXNpbmcgYW4gYWJzb2x1dGUgcGF0aC5cbiAqXG4gKiBDbGF1ZGUgQ29kZSByZXNvbHZlcyBkaXJlY3RvcnkgbWFya2V0cGxhY2Ugc291cmNlcyByZWxhdGl2ZSB0byB0aGUgc3Bhd25lZFxuICogc2Vzc2lvbidzIENXRC4gV2hlbiBzZXNzaW9ucyBydW4gaW4gYSB3b3JrdHJlZSwgYSByZWxhdGl2ZSBwYXRoIGxpa2UgYFwicHVibGljXCJgXG4gKiByZXNvbHZlcyB0byB0aGUgd29ya3RyZWUncyBjb3B5IFx1MjAxNCB3aGljaCBtYXkgY29udGFpbiBhIHN0YWxlIHBsdWdpbiB2ZXJzaW9uLlxuICogV3JpdGluZyBhbiBhYnNvbHV0ZSBwYXRoIGVuc3VyZXMgQ2xhdWRlIENvZGUgYWx3YXlzIHJlYWRzIGZyb20gdGhlIGV4dGVuc2lvbidzXG4gKiBidW5kbGVkIG1hcmtldHBsYWNlLCByZWdhcmRsZXNzIG9mIENXRC5cbiAqXG4gKiAjIyBIb3cgQ2xhdWRlIENvZGUncyBwbHVnaW4gdmVyc2lvbiBzeW5jaW5nIHdvcmtzXG4gKlxuICogVGhpcyByZWdpc3RyYXRpb24gdXBkYXRlIGlzIHRoZSAqKm9ubHkqKiBpbnRlcnZlbnRpb24gd2UgbmVlZC4gQ2xhdWRlIENvZGUnc1xuICogYnVpbHQtaW4gYXV0by11cGRhdGUgc3lzdGVtIGhhbmRsZXMgdGhlIHJlc3Q6XG4gKlxuICogMS4gKipWZXJzaW9uIGRldGVjdGlvbioqIFx1MjAxNCBPbiBzZXNzaW9uIHN0YXJ0LCBDbGF1ZGUgQ29kZSByZWFkcyB0aGUgbWFya2V0cGxhY2VcbiAqICAgIHNvdXJjZSBkaXJlY3RvcnkgKHRoZSBgc291cmNlLnBhdGhgIHdyaXR0ZW4gaGVyZSkgYW5kIGV4dHJhY3RzIHRoZSB2ZXJzaW9uXG4gKiAgICBmcm9tIGVhY2ggcGx1Z2luJ3MgYC5jbGF1ZGUtcGx1Z2luL3BsdWdpbi5qc29uYC5cbiAqXG4gKiAyLiAqKkNhY2hlLXBlci12ZXJzaW9uKiogXHUyMDE0IEVhY2ggcGx1Z2luIHZlcnNpb24gaXMgY2FjaGVkIGluZGVwZW5kZW50bHkgdW5kZXJcbiAqICAgIGA8Y29uZmlnRGlyPi9wbHVnaW5zL2NhY2hlLzxtYXJrZXRwbGFjZT4vPHBsdWdpbj4vPHZlcnNpb24+L2AuIFRoZSBhY3RpdmVcbiAqICAgIHZlcnNpb24ncyBwYXRoIGlzIHJlY29yZGVkIGFzIGBpbnN0YWxsUGF0aGAgaW4gYGluc3RhbGxlZF9wbHVnaW5zLmpzb25gLlxuICpcbiAqIDMuICoqQXV0by11cGRhdGUqKiBcdTIwMTQgV2hlbiB0aGUgc291cmNlIGRpcmVjdG9yeSBjb250YWlucyBhIG5ld2VyIHZlcnNpb24gdGhhblxuICogICAgd2hhdCdzIGNhY2hlZCwgQ2xhdWRlIENvZGUgY29waWVzIHRoZSBzb3VyY2UgaW50byBhIG5ldyB2ZXJzaW9uZWQgY2FjaGVcbiAqICAgIGRpcmVjdG9yeSwgdXBkYXRlcyBgaW5zdGFsbGVkX3BsdWdpbnMuanNvbmAgdG8gcG9pbnQgdG8gaXQsIGFuZCB3cml0ZXMgYVxuICogICAgYC5vcnBoYW5lZF9hdGAgdGltZXN0YW1wIGludG8gdGhlIG9sZCB2ZXJzaW9uJ3MgY2FjaGUgZGlyZWN0b3J5LlxuICpcbiAqIDQuICoqT3JwaGFuIEdDKiogXHUyMDE0IEEgYmFja2dyb3VuZCBob3VzZWtlZXBpbmcgdGFzayBydW5zIGV2ZXJ5IDEwIG1pbnV0ZXMuIEl0XG4gKiAgICB3YWxrcyB0aGUgY2FjaGUsIG1hcmtzIGFueSB2ZXJzaW9uIGRpcmVjdG9yeSBub3QgcmVmZXJlbmNlZCBieVxuICogICAgYGluc3RhbGxlZF9wbHVnaW5zLmpzb25gIHdpdGggYC5vcnBoYW5lZF9hdGAsIGFuZCBkZWxldGVzIG9ycGhhbmVkXG4gKiAgICBkaXJlY3RvcmllcyBvbmx5IGFmdGVyIGEgKio3LWRheSoqIGdyYWNlIHBlcmlvZC4gVGhpcyBlbnN1cmVzIHRoYXRcbiAqICAgIGNvbmN1cnJlbnRseSBydW5uaW5nIHNlc3Npb25zIGFyZSBuZXZlciBkaXNydXB0ZWQgYnkgY2FjaGUgZGVsZXRpb24uXG4gKlxuICogV2UgcHJldmlvdXNseSBmb3JjZS1kZWxldGVkIHN0YWxlIGNhY2hlIGVudHJpZXMgKGBldmljdFN0YWxlUnVudGltZUNhY2hlYCksXG4gKiB3aGljaCBieXBhc3NlZCB0aGUgNy1kYXkgZ3JhY2UgcGVyaW9kIGFuZCBjYXVzZWQgRU5PRU5UIGVycm9ycyBpbiBzZXNzaW9uc1xuICogc3RpbGwgcmVmZXJlbmNpbmcgdGhlIGRlbGV0ZWQgcGF0aHMuXG4gKlxuICogQHBhcmFtIG1hcmtldHBsYWNlUGF0aCAtIEFic29sdXRlIHBhdGggdG8gdGhlIGJ1bmRsZWQgbWFya2V0cGxhY2UgZGlyZWN0b3J5LlxuICogQHBhcmFtIGxvZ2dlciAtIExvZ2dlciBmb3IgZGlhZ25vc3RpYyBvdXRwdXQuXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiB1cGRhdGVNYXJrZXRwbGFjZVJlZ2lzdHJhdGlvbihcbiAgbWFya2V0cGxhY2VQYXRoOiBzdHJpbmcsXG4gIGxvZ2dlcjogQWN0aW9uQ29udGV4dFsnbG9nZ2VyJ11cbik6IFByb21pc2U8dm9pZD4ge1xuICBjb25zdCBjb25maWdEaXIgPSBhd2FpdCByZXNvbHZlQ2xhdWRlQ29uZmlnRGlyKCk7XG4gIGlmICghY29uZmlnRGlyKSB7XG4gICAgbG9nZ2VyLmRlYnVnKCdDbGF1ZGUgY29uZmlnIGRpcmVjdG9yeSBub3QgZm91bmQsIHNraXBwaW5nIG1hcmtldHBsYWNlIHJlZ2lzdHJhdGlvbiB1cGRhdGUnKTtcbiAgICByZXR1cm47XG4gIH1cblxuICBjb25zdCBrbm93blBhdGggPSBwYXRoLmpvaW4oY29uZmlnRGlyLCAncGx1Z2lucycsICdrbm93bl9tYXJrZXRwbGFjZXMuanNvbicpO1xuICBsZXQgcmF3OiBzdHJpbmc7XG4gIHRyeSB7XG4gICAgcmF3ID0gYXdhaXQgZnMucmVhZEZpbGUoa25vd25QYXRoLCAndXRmLTgnKTtcbiAgfSBjYXRjaCAoZXJyb3I6IHVua25vd24pIHtcbiAgICBpZiAoZXJyb3IgaW5zdGFuY2VvZiBFcnJvciAmJiAnY29kZScgaW4gZXJyb3IgJiYgZXJyb3IuY29kZSA9PT0gJ0VOT0VOVCcpIHtcbiAgICAgIGxvZ2dlci5kZWJ1Zygna25vd25fbWFya2V0cGxhY2VzLmpzb24gbm90IGZvdW5kLCBza2lwcGluZycpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB0aHJvdyBlcnJvcjtcbiAgfVxuXG4gIGNvbnN0IGRhdGEgPSBKU09OLnBhcnNlKHJhdykgYXMgUmVjb3JkPFxuICAgIHN0cmluZyxcbiAgICB7IHNvdXJjZT86IHsgc291cmNlPzogc3RyaW5nOyBwYXRoPzogc3RyaW5nIH07IGluc3RhbGxMb2NhdGlvbj86IHN0cmluZzsgbGFzdFVwZGF0ZWQ/OiBzdHJpbmcgfVxuICA+O1xuICBjb25zdCBlbnRyeSA9IGRhdGFbJ2NhcmRzLm1hbmFnZW1lbnQnXTtcbiAgaWYgKCFlbnRyeT8uc291cmNlIHx8IGVudHJ5LnNvdXJjZS5zb3VyY2UgIT09ICdkaXJlY3RvcnknKSByZXR1cm47XG5cbiAgaWYgKGVudHJ5LnNvdXJjZS5wYXRoID09PSBtYXJrZXRwbGFjZVBhdGggJiYgZW50cnkuaW5zdGFsbExvY2F0aW9uID09PSBtYXJrZXRwbGFjZVBhdGgpIHtcbiAgICBsb2dnZXIuZGVidWcoJ01hcmtldHBsYWNlIHJlZ2lzdHJhdGlvbiBhbHJlYWR5IHBvaW50cyB0byBleHRlbnNpb24gYnVuZGxlJyk7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgZW50cnkuc291cmNlLnBhdGggPSBtYXJrZXRwbGFjZVBhdGg7XG4gIGVudHJ5Lmluc3RhbGxMb2NhdGlvbiA9IG1hcmtldHBsYWNlUGF0aDtcbiAgZW50cnkubGFzdFVwZGF0ZWQgPSBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCk7XG4gIGF3YWl0IGZzLndyaXRlRmlsZShrbm93blBhdGgsIGAke0pTT04uc3RyaW5naWZ5KGRhdGEsIG51bGwsIDQpfVxcbmApO1xuICBsb2dnZXIuaW5mbygnVXBkYXRlZCBtYXJrZXRwbGFjZSByZWdpc3RyYXRpb24gdG8gZXh0ZW5zaW9uIGJ1bmRsZScsIHsgbWFya2V0cGxhY2VQYXRoIH0pO1xufVxuXG4vKipcbiAqIEJ1aWxkcyB0aGUgQ0xJIGFyZ3VtZW50IGxpc3QgZm9yIHRoZSBgY2xhdWRlYCBwcm9jZXNzLlxuICpcbiAqIEBwYXJhbSBwcm9tcHQgLSBUaGUgcHJvbXB0IHN0cmluZyBmb3IgbmV3IHNlc3Npb25zLlxuICogQHBhcmFtIHNlc3Npb25JZCAtIFNlc3Npb24gaWRlbnRpZmllciAodXNlZCBmb3IgYC0tc2Vzc2lvbi1pZGAgb3IgYC0tcmVzdW1lYCkuXG4gKiBAcGFyYW0gcmVzdW1lIC0gV2hlbiB0cnVlLCBwYXNzZXMgYC0tcmVzdW1lYCBpbnN0ZWFkIG9mIHN0YXJ0aW5nIGEgbmV3IHNlc3Npb24uXG4gKiBAcGFyYW0gbW9kZSAtIEV4ZWN1dGlvbiBtb2RlOyBgJ2JhY2tncm91bmQnYCBhcHBlbmRzIGAtLXByaW50YC5cbiAqIEBwYXJhbSBjYXJkUmVwb1BhdGggLSBBYnNvbHV0ZSBwYXRoIHBhc3NlZCB2aWEgYC0tYWRkLWRpcmAuXG4gKiBAcGFyYW0gbWFya2V0cGxhY2VQYXRoIC0gQWJzb2x1dGUgcGF0aCB0byB0aGUgYnVuZGxlZCBtYXJrZXRwbGFjZSBkaXJlY3RvcnkuXG4gKiBAcmV0dXJucyBBcnJheSBvZiBDTEkgYXJndW1lbnRzLlxuICovXG5leHBvcnQgZnVuY3Rpb24gYnVpbGRBcmdzKFxuICBwcm9tcHQ6IHN0cmluZyxcbiAgc2Vzc2lvbklkOiBzdHJpbmcsXG4gIHJlc3VtZTogYm9vbGVhbixcbiAgbW9kZTogQWN0aW9uSW5wdXRbJ2V4ZWN1dGlvbk1vZGUnXSxcbiAgY2FyZFJlcG9QYXRoOiBzdHJpbmcsXG4gIG1hcmtldHBsYWNlUGF0aDogc3RyaW5nXG4pOiBzdHJpbmdbXSB7XG4gIGNvbnN0IGFyZ3M6IHN0cmluZ1tdID0gW107XG5cbiAgaWYgKHJlc3VtZSkge1xuICAgIGFyZ3MucHVzaCgnLS1yZXN1bWUnLCBzZXNzaW9uSWQpO1xuICB9IGVsc2Uge1xuICAgIGFyZ3MucHVzaChwcm9tcHQpO1xuICAgIGFyZ3MucHVzaCgnLS1zZXNzaW9uLWlkJywgc2Vzc2lvbklkKTtcbiAgfVxuICBhcmdzLnB1c2goJy0tc2V0dGluZ3MnLCBidWlsZFBsdWdpblNldHRpbmdzKG1hcmtldHBsYWNlUGF0aCkpO1xuICBhcmdzLnB1c2goJy0tYWRkLWRpcicsIGNhcmRSZXBvUGF0aCk7XG4gIGlmIChtb2RlID09PSAnYmFja2dyb3VuZCcpIHtcbiAgICBhcmdzLnB1c2goJy0tcHJpbnQnKTtcbiAgfVxuXG4gIHJldHVybiBhcmdzO1xufVxuXG4vKipcbiAqIFJlc29sdmVzIHRoZSBjdXJyZW50IGJyYW5jaCBuYW1lIGluIHRoZSBnaXZlbiB3b3Jrc3BhY2UuXG4gKlxuICogQHBhcmFtIHdvcmtzcGFjZVBhdGggLSBEaXJlY3Rvcnkgd2hlcmUgYGdpdCByZXYtcGFyc2VgIHJ1bnMuXG4gKiBAcmV0dXJucyBUaGUgYWJicmV2aWF0ZWQgYnJhbmNoIG5hbWUgYXQgSEVBRC5cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHJlc29sdmVCYXNlQnJhbmNoKHdvcmtzcGFjZVBhdGg6IHN0cmluZyk6IFByb21pc2U8c3RyaW5nPiB7XG4gIGNvbnN0IHsgc3Rkb3V0IH0gPSBhd2FpdCBleGVjRmlsZUFzeW5jKCdnaXQnLCBbJ3Jldi1wYXJzZScsICctLWFiYnJldi1yZWYnLCAnSEVBRCddLCB7XG4gICAgY3dkOiB3b3Jrc3BhY2VQYXRoXG4gIH0pO1xuICByZXR1cm4gc3Rkb3V0LnRyaW0oKTtcbn1cblxuLyoqXG4gKiBDaGVja3Mgd2hldGhlciBhIHdvcmt0cmVlIHBhdGggZXhpc3RzIG9uIGRpc2suXG4gKlxuICogQHBhcmFtIHdvcmt0cmVlUGF0aCAtIEFic29sdXRlIHBhdGggdG8gdGVzdC5cbiAqIEByZXR1cm5zIFRydWUgd2hlbiB0aGUgcGF0aCBpcyBhY2Nlc3NpYmxlLlxuICovXG5hc3luYyBmdW5jdGlvbiB3b3JrdHJlZUV4aXN0c09uRGlzayh3b3JrdHJlZVBhdGg6IHN0cmluZyk6IFByb21pc2U8Ym9vbGVhbj4ge1xuICB0cnkge1xuICAgIGF3YWl0IGZzLmFjY2Vzcyh3b3JrdHJlZVBhdGgpO1xuICAgIHJldHVybiB0cnVlO1xuICB9IGNhdGNoIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbn1cblxuLyoqXG4gKiBGaW5kcyBvciBjcmVhdGVzIGEgd29ya3RyZWUgZm9yIHRoZSBjYXJkLlxuICpcbiAqIFRyaWVzIHRvIHJldXNlIGFuIGV4aXN0aW5nIGJyYW5jaCB3aG9zZSB3b3JrdHJlZSBpcyBzdGlsbCBvbiBkaXNrLiBXaGVuIG5vXG4gKiB2YWxpZCBicmFuY2ggZXhpc3RzLCBjcmVhdGVzIGEgbmV3IG9uZSBhbmQgcmVnaXN0ZXJzIGl0IHdpdGggdGhlIEFQSS5cbiAqXG4gKiBAcGFyYW0gaW5wdXQgLSBBY3Rpb24gaW5wdXQgY29udGFpbmluZyBjYXJkSWQgYW5kIHdvcmtzcGFjZSBwYXRocy5cbiAqIEBwYXJhbSBjbGllbnQgLSBDYXJkcyBBUEkgY2xpZW50IGZvciBicmFuY2ggQ1JVRC5cbiAqIEBwYXJhbSBiYXNlQnJhbmNoIC0gQ3VycmVudCBicmFuY2ggaW4gdGhlIHdvcmtzcGFjZSAodXNlZCBhcyBwYXJlbnQpLlxuICogQHBhcmFtIGxvZ2dlciAtIExvZ2dlciBmb3IgZGlhZ25vc3RpYyBvdXRwdXQuXG4gKiBAcmV0dXJucyBXb3JrdHJlZSBwYXRoLCBicmFuY2ggbmFtZSwgYW5kIHBhcmVudCBicmFuY2ggbmFtZS5cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHJlc29sdmVPckNyZWF0ZVdvcmt0cmVlKFxuICBpbnB1dDogQWN0aW9uSW5wdXQsXG4gIGNsaWVudDogQ2FyZHNDbGllbnQsXG4gIGJhc2VCcmFuY2g6IHN0cmluZyxcbiAgbG9nZ2VyOiBBY3Rpb25Db250ZXh0Wydsb2dnZXInXVxuKTogUHJvbWlzZTx7IHdvcmt0cmVlUGF0aDogc3RyaW5nOyBicmFuY2hOYW1lOiBzdHJpbmc7IHBhcmVudEJyYW5jaDogc3RyaW5nIH0+IHtcbiAgY29uc3QgeyBicmFuY2hlcyB9ID0gYXdhaXQgY2xpZW50LmdldEJyYW5jaGVzKGlucHV0LmNhcmRJZCwgeyB3b3Jrc3BhY2VQYXRoOiBpbnB1dC5yZXBvUm9vdCB9KTtcblxuICAvLyBUcnkgdG8gcmV1c2UgYW4gZXhpc3RpbmcgYnJhbmNoIHdpdGggYSB2YWxpZCB3b3JrdHJlZSBvbiBkaXNrXG4gIGZvciAoY29uc3QgYnJhbmNoIG9mIGJyYW5jaGVzKSB7XG4gICAgaWYgKCFicmFuY2guZXhpc3RzIHx8ICFicmFuY2gud29ya3RyZWUpIGNvbnRpbnVlO1xuICAgIGlmICghKGF3YWl0IHdvcmt0cmVlRXhpc3RzT25EaXNrKGJyYW5jaC53b3JrdHJlZSkpKSBjb250aW51ZTtcblxuICAgIGxvZ2dlci5pbmZvKCdSZXVzaW5nIGV4aXN0aW5nIHdvcmt0cmVlJywgeyBicmFuY2g6IGJyYW5jaC5uYW1lLCB3b3JrdHJlZTogYnJhbmNoLndvcmt0cmVlIH0pO1xuICAgIHJldHVybiB7IHdvcmt0cmVlUGF0aDogYnJhbmNoLndvcmt0cmVlLCBicmFuY2hOYW1lOiBicmFuY2gubmFtZSwgcGFyZW50QnJhbmNoOiBicmFuY2gucGFyZW50QnJhbmNoIH07XG4gIH1cblxuICAvLyBObyB2YWxpZCBleGlzdGluZyBicmFuY2ggXHUyMDE0IGNyZWF0ZSBuZXcgb25lLlxuICAvLyBUaGUgQVBJIG1heSBiZSBvdXQgb2Ygc3luYyB3aXRoIGdpdCAoZS5nLiBhIHByZXZpb3VzIHdvcmt0cmVlIHdhcyBjcmVhdGVkXG4gIC8vIGJ1dCBuZXZlciByZWdpc3RlcmVkLCBvciBpdHMgQVBJIHJlY29yZCB3YXMgZGVsZXRlZCkuIFRvIGF2b2lkIGNvbGxpZGluZ1xuICAvLyB3aXRoIHdvcmt0cmVlcyBnaXQgYWxyZWFkeSBrbm93cyBhYm91dCwgcHJvYmUgZ2l0J3MgYWN0dWFsIHN0YXRlIGFuZFxuICAvLyBpbmNyZW1lbnQgcGFzdCBhbnkgb2NjdXBpZWQgc2xvdHMuXG4gIGNvbnN0IHByZWZpeCA9IGBjYXJkcy8ke2lucHV0LmNhcmRJZH0vYDtcbiAgY29uc3QgZXhpc3RpbmdOdW1iZXJzID0gYnJhbmNoZXNcbiAgICAuZmlsdGVyKChiKSA9PiBiLm5hbWUuc3RhcnRzV2l0aChwcmVmaXgpKVxuICAgIC5tYXAoKGIpID0+IHBhcnNlSW50KGIubmFtZS5zbGljZShwcmVmaXgubGVuZ3RoKSwgMTApKVxuICAgIC5maWx0ZXIoKG4pID0+ICFOdW1iZXIuaXNOYU4obikpO1xuICBsZXQgbmV4dE51bWJlciA9IGV4aXN0aW5nTnVtYmVycy5sZW5ndGggPiAwID8gTWF0aC5tYXgoLi4uZXhpc3RpbmdOdW1iZXJzKSArIDEgOiAxO1xuXG4gIGNvbnN0IHsgcmVwb1Jvb3QgfSA9IGF3YWl0IGZpbmRHaXRSb290cyhpbnB1dC5yZXBvUm9vdCk7XG4gIHdoaWxlIChhd2FpdCBjaGVja1dvcmt0cmVlRXhpc3RzKHJlcG9Sb290LCBwYXRoLmpvaW4ocmVwb1Jvb3QsICcud29ya3RyZWVzJywgYCR7cHJlZml4fSR7bmV4dE51bWJlcn1gKSkpIHtcbiAgICBsb2dnZXIud2FybignV29ya3RyZWUgYWxyZWFkeSBleGlzdHMgaW4gZ2l0IGJ1dCBub3QgaW4gQVBJLCBza2lwcGluZycsIHtcbiAgICAgIGJyYW5jaDogYCR7cHJlZml4fSR7bmV4dE51bWJlcn1gXG4gICAgfSk7XG4gICAgbmV4dE51bWJlcisrO1xuICB9XG5cbiAgY29uc3QgYnJhbmNoTmFtZSA9IGAke3ByZWZpeH0ke25leHROdW1iZXJ9YDtcbiAgY29uc3QgcmVzdWx0ID0gYXdhaXQgY3JlYXRlV29ya3RyZWUoYnJhbmNoTmFtZSwgeyBjd2Q6IGlucHV0LnJlcG9Sb290IH0pO1xuICBhd2FpdCBjbGllbnQuYWRkQnJhbmNoKGlucHV0LmNhcmRJZCwgeyBuYW1lOiBicmFuY2hOYW1lLCB3b3JrdHJlZTogcmVzdWx0Lndvcmt0cmVlLCBwYXJlbnRCcmFuY2g6IGJhc2VCcmFuY2ggfSk7XG5cbiAgbG9nZ2VyLmluZm8oJ0NyZWF0ZWQgbmV3IHdvcmt0cmVlJywgeyBicmFuY2g6IGJyYW5jaE5hbWUsIHdvcmt0cmVlOiByZXN1bHQud29ya3RyZWUgfSk7XG4gIHJldHVybiB7IHdvcmt0cmVlUGF0aDogcmVzdWx0Lndvcmt0cmVlLCBicmFuY2hOYW1lLCBwYXJlbnRCcmFuY2g6IGJhc2VCcmFuY2ggfTtcbn1cblxuLyoqXG4gKiBSdW5zIGEgc2luZ2xlIGNsZWFudXAgc3RlcCwgbG9nZ2luZyBhIHdhcm5pbmcgb24gZmFpbHVyZSByYXRoZXIgdGhhblxuICogYWJvcnRpbmcgdGhlIHN3ZWVwLiBFYWNoIHN0ZXAgKHdvcmt0cmVlIHJlbW92YWwsIGJyYW5jaCBkZWxldGlvbiwgQVBJXG4gKiByZWNvcmQgcmVtb3ZhbCkgaXMgaW5kZXBlbmRlbnQgXHUyMDE0IGEgZmFpbHVyZSBpbiBvbmUgbXVzdCBub3QgcHJldmVudCB0aGVcbiAqIG90aGVycyBmcm9tIHJ1bm5pbmcuXG4gKlxuICogQHBhcmFtIHN0ZXAgLSBBc3luYyBvcGVyYXRpb24gdG8gYXR0ZW1wdC5cbiAqIEBwYXJhbSBsYWJlbCAtIEh1bWFuLXJlYWRhYmxlIGxhYmVsIGxvZ2dlZCBvbiBmYWlsdXJlLlxuICogQHBhcmFtIGJyYW5jaE5hbWUgLSBCcmFuY2ggbmFtZSBpbmNsdWRlZCBpbiBkaWFnbm9zdGljIG91dHB1dC5cbiAqIEBwYXJhbSBsb2dnZXIgLSBMb2dnZXIgZm9yIGRpYWdub3N0aWMgb3V0cHV0LlxuICovXG5hc3luYyBmdW5jdGlvbiB0cnlDbGVhbnVwU3RlcChcbiAgc3RlcDogKCkgPT4gUHJvbWlzZTx1bmtub3duPixcbiAgbGFiZWw6IHN0cmluZyxcbiAgYnJhbmNoTmFtZTogc3RyaW5nLFxuICBsb2dnZXI6IEFjdGlvbkNvbnRleHRbJ2xvZ2dlciddXG4pOiBQcm9taXNlPHZvaWQ+IHtcbiAgdHJ5IHtcbiAgICBhd2FpdCBzdGVwKCk7XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgbG9nZ2VyLndhcm4obGFiZWwsIHsgYnJhbmNoOiBicmFuY2hOYW1lLCBlcnJvcjogZXJyb3JNZXNzYWdlKGVycm9yKSB9KTtcbiAgfVxufVxuXG4vKipcbiAqIFJlbW92ZXMgYnJhbmNoZXMgdGhhdCBhcmUgZnVsbHkgbWVyZ2VkIGludG8gdGhlIGJhc2UgYnJhbmNoLlxuICpcbiAqIEZvciBlYWNoIG1lcmdlZCBicmFuY2ggdGhlIHdvcmt0cmVlIGRpcmVjdG9yeSBpcyByZW1vdmVkLCB0aGUgbG9jYWwgYnJhbmNoXG4gKiByZWYgaXMgZGVsZXRlZCwgYW5kIHRoZSBicmFuY2ggcmVjb3JkIGlzIHJlbW92ZWQgZnJvbSB0aGUgQVBJLiBJbmRpdmlkdWFsXG4gKiBmYWlsdXJlcyBhcmUgbG9nZ2VkIGFuZCBkbyBub3QgYWJvcnQgdGhlIHN3ZWVwLlxuICpcbiAqIEBwYXJhbSBpbnB1dCAtIEFjdGlvbiBpbnB1dCBjb250YWluaW5nIGNhcmRJZCBhbmQgd29ya3NwYWNlIHBhdGhzLlxuICogQHBhcmFtIGNsaWVudCAtIENhcmRzIEFQSSBjbGllbnQgZm9yIGJyYW5jaCByZW1vdmFsLlxuICogQHBhcmFtIGJhc2VCcmFuY2ggLSBCcmFuY2ggdG8gY2hlY2sgbWVyZ2Ugc3RhdHVzIGFnYWluc3QuXG4gKiBAcGFyYW0gbG9nZ2VyIC0gTG9nZ2VyIGZvciBkaWFnbm9zdGljIG91dHB1dC5cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGNsZWFudXBNZXJnZWRCcmFuY2hlcyhcbiAgaW5wdXQ6IEFjdGlvbklucHV0LFxuICBjbGllbnQ6IENhcmRzQ2xpZW50LFxuICBiYXNlQnJhbmNoOiBzdHJpbmcsXG4gIGxvZ2dlcjogQWN0aW9uQ29udGV4dFsnbG9nZ2VyJ11cbik6IFByb21pc2U8dm9pZD4ge1xuICBjb25zdCB7IGJyYW5jaGVzIH0gPSBhd2FpdCBjbGllbnQuZ2V0QnJhbmNoZXMoaW5wdXQuY2FyZElkLCB7IHdvcmtzcGFjZVBhdGg6IGlucHV0LnJlcG9Sb290IH0pO1xuXG4gIGZvciAoY29uc3QgYnJhbmNoIG9mIGJyYW5jaGVzKSB7XG4gICAgaWYgKCFicmFuY2guZXhpc3RzKSBjb250aW51ZTtcblxuICAgIHRyeSB7XG4gICAgICAvLyBtZXJnZS1iYXNlIC0taXMtYW5jZXN0b3IgZXhpdHMgbm9uLXplcm8gd2hlbiBOT1QgYW4gYW5jZXN0b3IgKG5vdCBtZXJnZWQpXG4gICAgICBhd2FpdCBleGVjRmlsZUFzeW5jKCdnaXQnLCBbJ21lcmdlLWJhc2UnLCAnLS1pcy1hbmNlc3RvcicsIGJyYW5jaC5uYW1lLCBiYXNlQnJhbmNoXSwge1xuICAgICAgICBjd2Q6IGlucHV0LnJlcG9Sb290XG4gICAgICB9KTtcbiAgICB9IGNhdGNoIHtcbiAgICAgIC8vIEV4cGVjdGVkIGZvciB1bm1lcmdlZCBicmFuY2hlcyBcdTIwMTQgc2tpcCBjbGVhbnVwXG4gICAgICBsb2dnZXIuZGVidWcoJ0JyYW5jaCBub3QgbWVyZ2VkLCBza2lwcGluZyBjbGVhbnVwJywgeyBicmFuY2g6IGJyYW5jaC5uYW1lIH0pO1xuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgLy8gQnJhbmNoIGlzIG1lcmdlZCBcdTIwMTQgY2xlYW4gdXAgd29ya3RyZWUsIGJyYW5jaCByZWYsIGFuZCBBUEkgcmVjb3JkXG4gICAgaWYgKGJyYW5jaC53b3JrdHJlZSkge1xuICAgICAgYXdhaXQgdHJ5Q2xlYW51cFN0ZXAoXG4gICAgICAgICgpID0+IGV4ZWNGaWxlQXN5bmMoJ2dpdCcsIFsnd29ya3RyZWUnLCAncmVtb3ZlJywgYnJhbmNoLndvcmt0cmVlIV0sIHsgY3dkOiBpbnB1dC5yZXBvUm9vdCB9KSxcbiAgICAgICAgJ0ZhaWxlZCB0byByZW1vdmUgd29ya3RyZWUnLFxuICAgICAgICBicmFuY2gubmFtZSxcbiAgICAgICAgbG9nZ2VyXG4gICAgICApO1xuICAgIH1cblxuICAgIGF3YWl0IHRyeUNsZWFudXBTdGVwKFxuICAgICAgKCkgPT4gZXhlY0ZpbGVBc3luYygnZ2l0JywgWydicmFuY2gnLCAnLWQnLCBicmFuY2gubmFtZV0sIHsgY3dkOiBpbnB1dC5yZXBvUm9vdCB9KSxcbiAgICAgICdGYWlsZWQgdG8gZGVsZXRlIGJyYW5jaCcsXG4gICAgICBicmFuY2gubmFtZSxcbiAgICAgIGxvZ2dlclxuICAgICk7XG5cbiAgICBhd2FpdCB0cnlDbGVhbnVwU3RlcChcbiAgICAgICgpID0+IGNsaWVudC5yZW1vdmVCcmFuY2goaW5wdXQuY2FyZElkLCBicmFuY2gubmFtZSksXG4gICAgICAnRmFpbGVkIHRvIHJlbW92ZSBicmFuY2ggZnJvbSBBUEknLFxuICAgICAgYnJhbmNoLm5hbWUsXG4gICAgICBsb2dnZXJcbiAgICApO1xuXG4gICAgbG9nZ2VyLmluZm8oJ0NsZWFuZWQgdXAgbWVyZ2VkIGJyYW5jaCcsIHsgYnJhbmNoOiBicmFuY2gubmFtZSB9KTtcbiAgfVxufVxuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBVbmlmaWVkIHNlc3Npb24gc3Bhd25lclxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4vKipcbiAqIE9wdGlvbnMgZm9yIHtAbGluayBzcGF3bkNsYXVkZVNlc3Npb259LlxuICpcbiAqIEFjdGlvbnMgcHJvdmlkZSB0aGUgdmFyaWFibGUgcGFydHMgKHByb21wdCwgc2Vzc2lvbiBpZGVudGl0eSwgc3dpdGNoLXRvLVxuICogaW50ZXJhY3RpdmUgc3VwcG9ydCk7IHRoZSBoZWxwZXIgaGFuZGxlcyBldmVyeXRoaW5nIGVsc2U6IHdvcmt0cmVlXG4gKiByZXNvbHV0aW9uLCBtYXJrZXRwbGFjZSByZWdpc3RyYXRpb24sIGVudiBjb25zdHJ1Y3Rpb24sIHNwYXduLCBsaWZlY3ljbGVcbiAqIGNhbGxiYWNrcywgYW5kIHBvc3QtZXhpdCBicmFuY2ggY2xlYW51cC5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBDbGF1ZGVTZXNzaW9uT3B0aW9ucyB7XG4gIC8qKiBQcm9tcHQgc3RyaW5nIHBhc3NlZCB0byB0aGUgQ2xhdWRlIENMSS4gKi9cbiAgcHJvbXB0OiBzdHJpbmc7XG4gIC8qKiBTZXNzaW9uIGlkZW50aWZpZXIgKHVzZWQgZm9yIGAtLXNlc3Npb24taWRgIG9yIGAtLXJlc3VtZWApLiAqL1xuICBzZXNzaW9uSWQ6IHN0cmluZztcbiAgLyoqIFdoZW4gdHJ1ZSwgcGFzc2VzIGAtLXJlc3VtZWAgaW5zdGVhZCBvZiBzdGFydGluZyBhIG5ldyBzZXNzaW9uLiAqL1xuICByZXN1bWU6IGJvb2xlYW47XG4gIC8qKlxuICAgKiBXaGVuIHRydWUsIHJlZ2lzdGVycyB7QGxpbmsgQWN0aW9uQ29udGV4dC5vblN3aXRjaFRvSW50ZXJhY3RpdmV9IHNvXG4gICAqIGJhY2tncm91bmQtbW9kZSBzZXNzaW9ucyBjYW4gYmUgcHJvbW90ZWQgdG8gaW50ZXJhY3RpdmUuXG4gICAqL1xuICBzdXBwb3J0c1N3aXRjaFRvSW50ZXJhY3RpdmU6IGJvb2xlYW47XG59XG5cbi8qKlxuICogU3Bhd25zIGEgYGNsYXVkZWAgQ0xJIHNlc3Npb24gd2l0aCBmdWxsIHdvcmt0cmVlLCBtYXJrZXRwbGFjZSwgYW5kXG4gKiBsaWZlY3ljbGUgbWFuYWdlbWVudC5cbiAqXG4gKiBDZW50cmFsaXNlcyB0aGUgc3Bhd24gbG9naWMgc2hhcmVkIGJ5IHRoZSBgbGF1bmNoYCBhbmQgYGludGVydmlld2BcbiAqIGFjdGlvbnMgc28gZW52aXJvbm1lbnQgdmFyaWFibGUgY29uc3RydWN0aW9uLCB3b3JrdHJlZSByZXNvbHV0aW9uLFxuICogbWFya2V0cGxhY2UgcmVnaXN0cmF0aW9uLCBhbmQgcG9zdC1leGl0IGNsZWFudXAgY2Fubm90IGRyaWZ0IGJldHdlZW5cbiAqIGNhbGxlcnMuXG4gKlxuICogU3RlcHM6XG4gKiAxLiBDcmVhdGUge0BsaW5rIENhcmRzQ2xpZW50fVxuICogMi4gUmVzb2x2ZSBiYXNlIGJyYW5jaCBhbmQgd29ya3RyZWVcbiAqIDMuIFJlZ2lzdGVyIG1hcmtldHBsYWNlXG4gKiA0LiBCdWlsZCBDTEkgYXJncyBhbmQgc3Bhd24gYGNsYXVkZWBcbiAqIDUuIFdpcmUgb25DYW5jZWwgKGFuZCBvcHRpb25hbGx5IG9uU3dpdGNoVG9JbnRlcmFjdGl2ZSlcbiAqIDYuIENhcHR1cmUgc3RkZXJyIGluIGJhY2tncm91bmQgbW9kZVxuICogNy4gQXdhaXQgcHJvY2VzcyBleGl0XG4gKiA4LiBDbGVhbiB1cCBmdWxseS1tZXJnZWQgYnJhbmNoZXNcbiAqXG4gKiBAcGFyYW0gaW5wdXQgLSBQYXJzZWQgYWN0aW9uIGlucHV0IGZyb20gdGhlIGVudmlyb25tZW50LlxuICogQHBhcmFtIGNvbnRleHQgLSBBY3Rpb24gY29udGV4dCBwcm92aWRpbmcgbG9nZ2VyIGFuZCBsaWZlY3ljbGUgaG9va3MuXG4gKiBAcGFyYW0gb3B0aW9ucyAtIFNlc3Npb24tc3BlY2lmaWMgcGFyYW1ldGVycyAocHJvbXB0LCBzZXNzaW9uIElELCBldGMuKS5cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHNwYXduQ2xhdWRlU2Vzc2lvbihcbiAgaW5wdXQ6IEFjdGlvbklucHV0LFxuICBjb250ZXh0OiBBY3Rpb25Db250ZXh0LFxuICBvcHRpb25zOiBDbGF1ZGVTZXNzaW9uT3B0aW9uc1xuKTogUHJvbWlzZTx2b2lkPiB7XG4gIGNvbnN0IHsgcHJvbXB0LCBzZXNzaW9uSWQsIHJlc3VtZSwgc3VwcG9ydHNTd2l0Y2hUb0ludGVyYWN0aXZlIH0gPSBvcHRpb25zO1xuXG4gIGNvbnRleHQubG9nZ2VyLmluZm8oYCR7aW5wdXQuYWN0aW9uTmFtZX0gYWN0aW9uIHN0YXJ0ZWRgLCB7XG4gICAgY2FyZElkOiBpbnB1dC5jYXJkSWQsXG4gICAgZW52aXJvbm1lbnQ6IGlucHV0LmVudmlyb25tZW50LFxuICAgIGV4ZWN1dGlvbk1vZGU6IGlucHV0LmV4ZWN1dGlvbk1vZGUsXG4gICAgc2Vzc2lvbklkXG4gIH0pO1xuXG4gIGNvbnN0IGNsaWVudCA9IG5ldyBDYXJkc0NsaWVudCh7XG4gICAgYmFzZVVybDogaW5wdXQuYXBpQmFzZVVybCxcbiAgICBhY2Nlc3NUb2tlbjogaW5wdXQuYXBpQWNjZXNzVG9rZW5cbiAgfSk7XG5cbiAgY29uc3QgYmFzZUJyYW5jaCA9IGF3YWl0IHJlc29sdmVCYXNlQnJhbmNoKGlucHV0LnJlcG9Sb290KTtcblxuICBjb25zdCB3b3JrdHJlZVJlc3VsdCA9IGF3YWl0IHJlc29sdmVPckNyZWF0ZVdvcmt0cmVlKGlucHV0LCBjbGllbnQsIGJhc2VCcmFuY2gsIGNvbnRleHQubG9nZ2VyKTtcblxuICBjb25zdCB7IHdvcmt0cmVlUGF0aDogY3dkLCBicmFuY2hOYW1lLCBwYXJlbnRCcmFuY2ggfSA9IHdvcmt0cmVlUmVzdWx0O1xuICBjb250ZXh0LmxvZ2dlci5pbmZvKCdVc2luZyB3b3JrdHJlZScsIHsgY3dkLCBicmFuY2g6IGJyYW5jaE5hbWUsIGJhc2VCcmFuY2gsIHBhcmVudEJyYW5jaCB9KTtcblxuICBjb25zdCBtYXJrZXRwbGFjZVBhdGggPSByZXNvbHZlTWFya2V0cGxhY2VQYXRoKCk7XG4gIGF3YWl0IHVwZGF0ZU1hcmtldHBsYWNlUmVnaXN0cmF0aW9uKG1hcmtldHBsYWNlUGF0aCwgY29udGV4dC5sb2dnZXIpO1xuXG4gIGNvbnN0IGFyZ3MgPSBidWlsZEFyZ3MocHJvbXB0LCBzZXNzaW9uSWQsIHJlc3VtZSwgaW5wdXQuZXhlY3V0aW9uTW9kZSwgaW5wdXQuY2FyZFJlcG9QYXRoLCBtYXJrZXRwbGFjZVBhdGgpO1xuICBjb25zdCBpc0ludGVyYWN0aXZlID0gaW5wdXQuZXhlY3V0aW9uTW9kZSA9PT0gJ2ludGVyYWN0aXZlJztcblxuICBjb25zdCBjaGlsZDogQ2hpbGRQcm9jZXNzID0gc3Bhd24oJ2NsYXVkZScsIGFyZ3MsIHtcbiAgICBjd2QsXG4gICAgc3RkaW86IGlzSW50ZXJhY3RpdmUgPyAnaW5oZXJpdCcgOiBbJ2lnbm9yZScsICdpZ25vcmUnLCAncGlwZSddLFxuICAgIGVudjoge1xuICAgICAgLi4ucHJvY2Vzcy5lbnYsXG4gICAgICBXT1JLU1BBQ0VfUEFUSDogY3dkLFxuICAgICAgQ0xBVURFX0NPREVfVEFTS19MSVNUX0lEOiBgY2FyZHMtZXh0ZW5zaW9uLSR7aW5wdXQuY2FyZElkfWAsXG4gICAgICBDTEFVREVfQ09ERV9FWFBFUklNRU5UQUxfQUdFTlRfVEVBTVM6ICcxJyxcbiAgICAgIEJBU0VfQlJBTkNIOiBiYXNlQnJhbmNoLFxuICAgICAgUEFSRU5UX0JSQU5DSDogcGFyZW50QnJhbmNoLFxuICAgICAgV09SS1NQQUNFX0JSQU5DSDogYnJhbmNoTmFtZVxuICAgIH1cbiAgfSk7XG5cbiAgY29udGV4dC5vbkNhbmNlbCgoKSA9PiB7XG4gICAgY29udGV4dC5sb2dnZXIuaW5mbyhgJHtpbnB1dC5hY3Rpb25OYW1lfSBhY3Rpb24gY2FuY2VsbGVkLCB0ZXJtaW5hdGluZyBjbGF1ZGVgLCB7IHNlc3Npb25JZCB9KTtcbiAgICBjaGlsZC5raWxsKCdTSUdURVJNJyk7XG4gIH0pO1xuXG4gIGlmIChzdXBwb3J0c1N3aXRjaFRvSW50ZXJhY3RpdmUpIHtcbiAgICBjb250ZXh0Lm9uU3dpdGNoVG9JbnRlcmFjdGl2ZSgoKSA9PiB7XG4gICAgICBjb250ZXh0LmxvZ2dlci5pbmZvKCdTd2l0Y2hpbmcgdG8gaW50ZXJhY3RpdmUgbW9kZScsIHsgc2Vzc2lvbklkIH0pO1xuICAgICAgY2hpbGQua2lsbCgnU0lHVEVSTScpO1xuICAgICAgcmV0dXJuIHsgc2Vzc2lvbklkIH07XG4gICAgfSk7XG4gIH1cblxuICAvLyBCYWNrZ3JvdW5kIG1vZGU6IGNhcHR1cmUgc3RkZXJyIGZvciBkaWFnbm9zdGljIGxvZ2dpbmdcbiAgaWYgKCFpc0ludGVyYWN0aXZlKSB7XG4gICAgY2hpbGQuc3RkZXJyPy5vbignZGF0YScsIChjaHVuazogQnVmZmVyKSA9PiB7XG4gICAgICBjb25zdCB0ZXh0ID0gY2h1bmsudG9TdHJpbmcoKS50cmltKCk7XG4gICAgICBpZiAodGV4dCkge1xuICAgICAgICBjb250ZXh0LmxvZ2dlci53YXJuKHRleHQpO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgY29uc3QgZXhpdENvZGUgPSBhd2FpdCBuZXcgUHJvbWlzZTxudW1iZXIgfCBudWxsPigocmVzb2x2ZSkgPT4ge1xuICAgIGNoaWxkLm9uKCdjbG9zZScsIHJlc29sdmUpO1xuICB9KTtcblxuICBjb250ZXh0LmxvZ2dlci5pbmZvKGAke2lucHV0LmFjdGlvbk5hbWV9IGFjdGlvbiBjb21wbGV0ZWRgLCB7IHNlc3Npb25JZCwgZXhpdENvZGUgfSk7XG5cbiAgLy8gUG9zdC1leGl0IGNsZWFudXA6IHJlbW92ZSBmdWxseS1tZXJnZWQgYnJhbmNoZXNcbiAgdHJ5IHtcbiAgICBhd2FpdCBjbGVhbnVwTWVyZ2VkQnJhbmNoZXMoaW5wdXQsIGNsaWVudCwgYmFzZUJyYW5jaCwgY29udGV4dC5sb2dnZXIpO1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGNvbnRleHQubG9nZ2VyLndhcm4oJ0JyYW5jaCBjbGVhbnVwIGZhaWxlZCcsIHtcbiAgICAgIGVycm9yOiBlcnJvck1lc3NhZ2UoZXJyb3IpXG4gICAgfSk7XG4gIH1cbn1cbiIsICIvKipcbiAqIEVycm9yIGNsYXNzZXMgZm9yIHRoZSBDYXJkcyBWMiBTREsuXG4gKlxuICogVGhlc2UgZXJyb3JzIG5vcm1hbGl6ZSBzZXJ2ZXIgcmVzcG9uc2VzIGFuZCBuZXR3b3JrIGZhaWx1cmVzIHNvIGNhbGxlcnMgY2FuXG4gKiBkaXN0aW5ndWlzaCBBUEkgdmFsaWRhdGlvbiBwcm9ibGVtcyBmcm9tIHRyYW5zcG9ydCBpc3N1ZXMuXG4gKlxuICpcbiAqIEBzdW1tYXJ5IEVycm9yIGNsYXNzZXMgZm9yIHRoZSBDYXJkcyBWMiBTREtcbiAqIEBtb2R1bGUgdHlwZXMvZXJyb3JzXG4gKi9cblxuaW1wb3J0IHR5cGUgeyBGaWVsZEVycm9yIH0gZnJvbSAnLi4vLi4vcHJvdG9jb2wvaW5kZXguanMnO1xuXG4vKipcbiAqIEVycm9yIHRocm93biB3aGVuIGFuIEFQSSByZXF1ZXN0IGZhaWxzIHdpdGggYW4gZXJyb3IgcmVzcG9uc2UuXG4gKlxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIHRyeSB7XG4gKiAgIGF3YWl0IGNsaWVudC5jcmVhdGVDYXJkKGRhdGEpO1xuICogfSBjYXRjaCAoZXJyb3IpIHtcbiAqICAgaWYgKGVycm9yIGluc3RhbmNlb2YgQXBpRXJyb3IpIHtcbiAqICAgICBjb25zb2xlLmVycm9yKGBBUEkgZXJyb3IgWyR7ZXJyb3IuY29kZX1dOiAke2Vycm9yLm1lc3NhZ2V9YCk7XG4gKiAgICAgaWYgKGVycm9yLmZpZWxkcykge1xuICogICAgICAgZXJyb3IuZmllbGRzLmZvckVhY2goZiA9PiBjb25zb2xlLmVycm9yKGAgICR7Zi5maWVsZH06ICR7Zi5tZXNzYWdlfWApKTtcbiAqICAgICB9XG4gKiAgIH1cbiAqIH1cbiAqIGBgYFxuICovXG5leHBvcnQgY2xhc3MgQXBpRXJyb3IgZXh0ZW5kcyBFcnJvciB7XG4gIC8qKlxuICAgKiBDcmVhdGVzIGEgbmV3IEFwaUVycm9yIGluc3RhbmNlLlxuICAgKlxuICAgKiBAcGFyYW0gbWVzc2FnZSAtIEh1bWFuLXJlYWRhYmxlIGVycm9yIG1lc3NhZ2VcbiAgICogQHBhcmFtIGNvZGUgLSBNYWNoaW5lLXJlYWRhYmxlIGVycm9yIGNvZGVcbiAgICogQHBhcmFtIGZpZWxkcyAtIE9wdGlvbmFsIGFycmF5IG9mIGZpZWxkLXNwZWNpZmljIHZhbGlkYXRpb24gZXJyb3JzXG4gICAqL1xuICBjb25zdHJ1Y3RvcihcbiAgICBtZXNzYWdlOiBzdHJpbmcsXG4gICAgcHVibGljIHJlYWRvbmx5IGNvZGU6IHN0cmluZyxcbiAgICBwdWJsaWMgcmVhZG9ubHkgZmllbGRzPzogRmllbGRFcnJvcltdXG4gICkge1xuICAgIHN1cGVyKG1lc3NhZ2UpO1xuICAgIHRoaXMubmFtZSA9ICdBcGlFcnJvcic7XG4gIH1cbn1cblxuLyoqXG4gKiBFcnJvciB0aHJvd24gd2hlbiBhIG5ldHdvcmsgcmVxdWVzdCBmYWlscyBkdWUgdG8gY29ubmVjdGl2aXR5IGlzc3Vlcy5cbiAqXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogdHJ5IHtcbiAqICAgYXdhaXQgY2xpZW50Lmxpc3RDYXJkcygpO1xuICogfSBjYXRjaCAoZXJyb3IpIHtcbiAqICAgaWYgKGVycm9yIGluc3RhbmNlb2YgTmV0d29ya0Vycm9yKSB7XG4gKiAgICAgY29uc29sZS5lcnJvcihgTmV0d29yayBlcnJvcjogJHtlcnJvci5tZXNzYWdlfWApO1xuICogICAgIGlmIChlcnJvci5jYXVzZSkge1xuICogICAgICAgY29uc29sZS5lcnJvcihgQ2F1c2VkIGJ5OiAke2Vycm9yLmNhdXNlLm1lc3NhZ2V9YCk7XG4gKiAgICAgfVxuICogICB9XG4gKiB9XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNsYXNzIE5ldHdvcmtFcnJvciBleHRlbmRzIEVycm9yIHtcbiAgLyoqXG4gICAqIENyZWF0ZXMgYSBuZXcgTmV0d29ya0Vycm9yIGluc3RhbmNlLlxuICAgKlxuICAgKiBAcGFyYW0gbWVzc2FnZSAtIEh1bWFuLXJlYWRhYmxlIGVycm9yIG1lc3NhZ2VcbiAgICogQHBhcmFtIGNhdXNlIC0gT3B0aW9uYWwgdW5kZXJseWluZyBlcnJvciB0aGF0IGNhdXNlZCB0aGlzIG5ldHdvcmsgZmFpbHVyZVxuICAgKi9cbiAgY29uc3RydWN0b3IoXG4gICAgbWVzc2FnZTogc3RyaW5nLFxuICAgIHB1YmxpYyByZWFkb25seSBjYXVzZT86IEVycm9yXG4gICkge1xuICAgIHN1cGVyKG1lc3NhZ2UpO1xuICAgIHRoaXMubmFtZSA9ICdOZXR3b3JrRXJyb3InO1xuICB9XG59XG4iLCAiLyoqXG4gKiBIVFRQIGNsaWVudCBmb3IgdGhlIENhcmRzIFYyIFJFU1QgQVBJLlxuICpcbiAqXG4gKiBAc3VtbWFyeSBIVFRQIGNsaWVudCBmb3IgdGhlIENhcmRzIFYyIFJFU1QgQVBJXG4gKiBAbW9kdWxlIHNkay9DYXJkc0NsaWVudFxuICovXG5cbmltcG9ydCB0eXBlIHsgQ2FyZCwgQ29tcGFyZVJlcXVlc3QsIENvbXBhcmVTdGF0ZSwgSHR0cENsaWVudCwgU3RyZWFtTWV0YSwgVGltZWxpbmVJdGVtIH0gZnJvbSAnLi4vcHJvdG9jb2wvaW5kZXguanMnO1xuaW1wb3J0IHR5cGUge1xuICBBZGRCcmFuY2hSZXF1ZXN0LFxuICBBdHRhY2htZW50UmVzcG9uc2UsXG4gIEJyYW5jaGVzUmVzcG9uc2UsXG4gIENhcmRDcmVhdGVEYXRhLFxuICBDYXJkc0NsaWVudE9wdGlvbnMsXG4gIENhcmRVcGRhdGVEYXRhLFxuICBDb21tZW50LFxuICBDb21tZW50Q3JlYXRlRGF0YSxcbiAgQ29tbWVudFVwZGF0ZURhdGEsXG4gIENvbW1pdEluZm8sXG4gIEdhdGVBcHByb3ZhbFJlc3BvbnNlLFxuICBJbmdlc3RXc0ZhY3RvcnksXG4gIExpc3RDYXJkc09wdGlvbnMsXG4gIFN0cmVhbVJlc3VsdCxcbiAgU3RyZWFtV3JpdGVyLFxuICBTdHJlYW1Xcml0ZXJPcHRpb25zLFxuICBUaW1lbGluZU9wdGlvbnMsXG4gIFR5cGVTY2hlbWFzUmVzcG9uc2UsXG4gIFdzU3RyZWFtU2Vzc2lvblxufSBmcm9tICcuL3R5cGVzL2NsaWVudC5qcyc7XG5pbXBvcnQgeyBBcGlFcnJvciwgTmV0d29ya0Vycm9yIH0gZnJvbSAnLi90eXBlcy9lcnJvcnMuanMnO1xuXG4vKiogSW5pdGlhbCByZXF1ZXN0IHRpbWVvdXQgaW4gbWlsbGlzZWNvbmRzICgzIHNlY29uZHMgdG8gYWNjb21tb2RhdGUgZ2l0LWJhY2tlZCBlbmRwb2ludHMpLiAqL1xuY29uc3QgSU5JVElBTF9USU1FT1VUX01TID0gM18wMDA7XG5cbi8qKiBNYXhpbXVtIHJlcXVlc3QgdGltZW91dCBpbiBtaWxsaXNlY29uZHMgYWZ0ZXIgZXhwb25lbnRpYWwgYmFja29mZi4gKi9cbmNvbnN0IE1BWF9USU1FT1VUX01TID0gMTBfMDAwO1xuXG4vKiogTWF4aW11bSBudW1iZXIgb2YgYXV0b21hdGljIHJldHJpZXMgZm9yIHRpbWVvdXQgZXJyb3JzIGJlZm9yZSBnaXZpbmcgdXAuICovXG5jb25zdCBNQVhfVElNRU9VVF9SRVRSSUVTID0gMjtcblxuLyoqXG4gKiBUeXBlLXNhZmUgSFRUUCBjbGllbnQgZm9yIHRoZSBDYXJkcyBWMiBSRVNUIEFQSS5cbiAqXG4gKiBVc2VzIHRoZSBGZXRjaCBBUEkgYnkgZGVmYXVsdCBhbmQgc3VwcG9ydHMgZGVwZW5kZW5jeSBpbmplY3Rpb24gb2YgYW5cbiAqIGFsdGVybmF0ZSB7QGxpbmsgSHR0cENsaWVudH0gZm9yIHRlc3RzIG9yIGN1c3RvbSB0cmFuc3BvcnRzLiBBbGwgcHVibGljXG4gKiBtZXRob2RzIHN1cmZhY2Ugc2VydmVyIGZhaWx1cmVzIGFzIHtAbGluayBBcGlFcnJvcn0gYW5kIHRyYW5zcG9ydCBmYWlsdXJlc1xuICogYXMge0BsaW5rIE5ldHdvcmtFcnJvcn0uXG4gKlxuICogVGhlIGRlZmF1bHQgSFRUUCBjbGllbnQgYXBwbGllcyBhbiBleHBvbmVudGlhbCBiYWNrb2ZmIHRpbWVvdXQgdG8gZmV0Y2hcbiAqIHJlcXVlc3RzOiBzdGFydGluZyBhdCAzIHNlY29uZHMsIGRvdWJsaW5nIG9uIGVhY2ggY29uc2VjdXRpdmUgZmFpbHVyZSB1cFxuICogdG8gYSAxMC1zZWNvbmQgY2FwLCBhbmQgcmVzZXR0aW5nIG9uIGFueSBzdWNjZXNzZnVsIHJlc3BvbnNlLiBUaGlzIGVuc3VyZXNcbiAqIGZhc3QgZmFpbHVyZSBkZXRlY3Rpb24gd2hlbiB0aGUgc2VydmVyIGlzIGRvd24gd2hpbGUgYWxsb3dpbmcgc2xvd2VyXG4gKiByZXNwb25zZXMgZHVyaW5nIHJlY292ZXJ5LlxuICpcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBjb25zdCBjbGllbnQgPSBuZXcgQ2FyZHNDbGllbnQoeyBiYXNlVXJsOiAnaHR0cDovL2xvY2FsaG9zdDozMDAwJywgYWNjZXNzVG9rZW46ICd0b2tlbicgfSk7XG4gKlxuICogY29uc3QgY2FyZHMgPSBhd2FpdCBjbGllbnQubGlzdENhcmRzKHsgc3RhdHVzOiAnaW5fcHJvZ3Jlc3MnIH0pO1xuICogYXdhaXQgY2xpZW50LnVwZGF0ZUNhcmQoY2FyZElkLCB7IHN0YXR1czogJ2RvbmUnIH0pO1xuICogYGBgXG4gKi9cbmV4cG9ydCBjbGFzcyBDYXJkc0NsaWVudCB7XG4gIHByaXZhdGUgcmVhZG9ubHkgX2h0dHBDbGllbnQ/OiBIdHRwQ2xpZW50O1xuXG4gIC8qKiBDdXJyZW50IHRpbWVvdXQgaW4gbWlsbGlzZWNvbmRzLCBpbmNyZWFzZXMgd2l0aCBjb25zZWN1dGl2ZSBmYWlsdXJlcy4gKi9cbiAgcHJpdmF0ZSBfY3VycmVudFRpbWVvdXRNcyA9IElOSVRJQUxfVElNRU9VVF9NUztcblxuICAvKipcbiAgICogQ3JlYXRlcyBhIG5ldyBDYXJkc0NsaWVudCBpbnN0YW5jZS5cbiAgICpcbiAgICogQHBhcmFtIG9wdGlvbnMgLSBDb25maWd1cmF0aW9uIG9wdGlvbnMgaW5jbHVkaW5nIGJhc2UgVVJMIGFuZCBhdXRoIHRva2VuLlxuICAgKiBAcGFyYW0gaHR0cENsaWVudCAtIE9wdGlvbmFsIEhUVFAgY2xpZW50IGZvciBkZXBlbmRlbmN5IGluamVjdGlvbi5cbiAgICovXG4gIGNvbnN0cnVjdG9yKFxuICAgIHByaXZhdGUgcmVhZG9ubHkgb3B0aW9uczogQ2FyZHNDbGllbnRPcHRpb25zLFxuICAgIGh0dHBDbGllbnQ/OiBIdHRwQ2xpZW50XG4gICkge1xuICAgIHRoaXMuX2h0dHBDbGllbnQgPSBodHRwQ2xpZW50O1xuICB9XG5cbiAgLyoqXG4gICAqIFJldHVybnMgdGhlIGJhc2UgVVJMIHVzZWQgdG8gYnVpbGQgQVBJIHJlcXVlc3RzLlxuICAgKlxuICAgKiBAcmV0dXJucyBUaGUgYmFzZSBVUkwgc3RyaW5nIGFzIHByb3ZpZGVkIGluIHtAbGluayBDYXJkc0NsaWVudE9wdGlvbnN9LlxuICAgKi9cbiAgZ2V0QmFzZVVybCgpOiBzdHJpbmcge1xuICAgIHJldHVybiB0aGlzLm9wdGlvbnMuYmFzZVVybDtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXR1cm5zIHdoZXRoZXIgYW4gSFRUUCBjbGllbnQgd2FzIGluamVjdGVkLlxuICAgKlxuICAgKiBAcmV0dXJucyBUcnVlIGlmIGFuIEhUVFAgY2xpZW50IHdhcyBwcm92aWRlZCBkdXJpbmcgY29uc3RydWN0aW9uLlxuICAgKiBAaW50ZXJuYWwgVXNlZCBmb3IgdGVzdGluZyBkZXBlbmRlbmN5IGluamVjdGlvbi5cbiAgICovXG4gIGhhc0h0dHBDbGllbnQoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuX2h0dHBDbGllbnQgIT09IHVuZGVmaW5lZDtcbiAgfVxuICAvKipcbiAgICogUmV0dXJucyBhbiBBYm9ydFNpZ25hbCB0aGF0IGZpcmVzIGFmdGVyIHRoZSBjdXJyZW50IGJhY2tvZmYgdGltZW91dC5cbiAgICogVXNlcyBjYWxsZXIncyBzaWduYWwgaWYgcHJvdmlkZWQgKGZvciBESS90ZXN0aW5nKSwgb3RoZXJ3aXNlIGFwcGxpZXMgdGhlIGJhY2tvZmYgdGltZW91dC5cbiAgICpcbiAgICogQHBhcmFtIGV4aXN0aW5nU2lnbmFsIC0gT3B0aW9uYWwgY2FsbGVyLXByb3ZpZGVkIHNpZ25hbCB0byByZXVzZSBpbnN0ZWFkIG9mIGNyZWF0aW5nIGEgdGltZW91dCBzaWduYWwuXG4gICAqIEByZXR1cm5zIEFib3J0U2lnbmFsIHRoYXQgY29udHJvbHMgcmVxdWVzdCBjYW5jZWxsYXRpb24gZm9yIHRoZSBjdXJyZW50IG9wZXJhdGlvbi5cbiAgICovXG4gIHByaXZhdGUgZ2V0VGltZW91dFNpZ25hbChleGlzdGluZ1NpZ25hbD86IEFib3J0U2lnbmFsIHwgbnVsbCk6IEFib3J0U2lnbmFsIHtcbiAgICBpZiAoZXhpc3RpbmdTaWduYWwpIHJldHVybiBleGlzdGluZ1NpZ25hbDtcbiAgICByZXR1cm4gQWJvcnRTaWduYWwudGltZW91dCh0aGlzLl9jdXJyZW50VGltZW91dE1zKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZWNvcmRzIGEgc3VjY2Vzc2Z1bCByZXF1ZXN0IGFuZCByZXNldHMgdGhlIHRpbWVvdXQgYmFja29mZi5cbiAgICovXG4gIHByaXZhdGUgb25SZXF1ZXN0U3VjY2VzcygpOiB2b2lkIHtcbiAgICB0aGlzLl9jdXJyZW50VGltZW91dE1zID0gSU5JVElBTF9USU1FT1VUX01TO1xuICB9XG5cbiAgLyoqXG4gICAqIFJlY29yZHMgYSBmYWlsZWQgcmVxdWVzdCBhbmQgaW5jcmVhc2VzIHRoZSB0aW1lb3V0IHZpYSBleHBvbmVudGlhbCBiYWNrb2ZmLlxuICAgKi9cbiAgcHJpdmF0ZSBvblJlcXVlc3RGYWlsdXJlKCk6IHZvaWQge1xuICAgIHRoaXMuX2N1cnJlbnRUaW1lb3V0TXMgPSBNYXRoLm1pbih0aGlzLl9jdXJyZW50VGltZW91dE1zICogMiwgTUFYX1RJTUVPVVRfTVMpO1xuICB9XG5cbiAgLyoqXG4gICAqIERlZmF1bHQgSFRUUCBjbGllbnQgaW1wbGVtZW50YXRpb24gdXNpbmcgZmV0Y2ggKyBKU09OIHBheWxvYWRzLlxuICAgKlxuICAgKiBFYWNoIGZldGNoIGNhbGwgaW5jbHVkZXMgYW4gQWJvcnRTaWduYWwudGltZW91dCB0aGF0IHN0YXJ0cyBhdCAzIHNlY29uZHNcbiAgICogYW5kIGRvdWJsZXMgb24gY29uc2VjdXRpdmUgZmFpbHVyZXMgdXAgdG8gMTAgc2Vjb25kcy5cbiAgICovXG4gIHByaXZhdGUgZGVmYXVsdEh0dHBDbGllbnQ6IEh0dHBDbGllbnQgPSB7XG4gICAgZ2V0OiBhc3luYyA8VD4odXJsOiBzdHJpbmcsIG9wdGlvbnM/OiBSZXF1ZXN0SW5pdCk6IFByb21pc2U8VD4gPT4ge1xuICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBmZXRjaCh1cmwsIHtcbiAgICAgICAgLi4ub3B0aW9ucyxcbiAgICAgICAgaGVhZGVyczogeyAuLi50aGlzLmdldEhlYWRlcnMoKSwgLi4ub3B0aW9ucz8uaGVhZGVycyB9LFxuICAgICAgICBzaWduYWw6IHRoaXMuZ2V0VGltZW91dFNpZ25hbChvcHRpb25zPy5zaWduYWwpXG4gICAgICB9KTtcbiAgICAgIGlmICghcmVzcG9uc2Uub2spIHRocm93IHJlc3BvbnNlO1xuICAgICAgcmV0dXJuIHJlc3BvbnNlLmpzb24oKSBhcyBQcm9taXNlPFQ+O1xuICAgIH0sXG4gICAgcG9zdDogYXN5bmMgPFQ+KHVybDogc3RyaW5nLCBib2R5OiB1bmtub3duLCBvcHRpb25zPzogUmVxdWVzdEluaXQpOiBQcm9taXNlPFQ+ID0+IHtcbiAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZmV0Y2godXJsLCB7XG4gICAgICAgIC4uLm9wdGlvbnMsXG4gICAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgICBoZWFkZXJzOiB7IC4uLnRoaXMuZ2V0SGVhZGVycygpLCAuLi5vcHRpb25zPy5oZWFkZXJzIH0sXG4gICAgICAgIGJvZHk6IGJvZHkgPyBKU09OLnN0cmluZ2lmeShib2R5KSA6IHVuZGVmaW5lZCxcbiAgICAgICAgc2lnbmFsOiB0aGlzLmdldFRpbWVvdXRTaWduYWwob3B0aW9ucz8uc2lnbmFsKVxuICAgICAgfSk7XG4gICAgICBpZiAoIXJlc3BvbnNlLm9rKSB0aHJvdyByZXNwb25zZTtcbiAgICAgIHJldHVybiByZXNwb25zZS5qc29uKCkgYXMgUHJvbWlzZTxUPjtcbiAgICB9LFxuICAgIHB1dDogYXN5bmMgPFQ+KHVybDogc3RyaW5nLCBib2R5OiB1bmtub3duLCBvcHRpb25zPzogUmVxdWVzdEluaXQpOiBQcm9taXNlPFQ+ID0+IHtcbiAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZmV0Y2godXJsLCB7XG4gICAgICAgIC4uLm9wdGlvbnMsXG4gICAgICAgIG1ldGhvZDogJ1BVVCcsXG4gICAgICAgIGhlYWRlcnM6IHsgLi4udGhpcy5nZXRIZWFkZXJzKCksIC4uLm9wdGlvbnM/LmhlYWRlcnMgfSxcbiAgICAgICAgYm9keTogYm9keSA/IEpTT04uc3RyaW5naWZ5KGJvZHkpIDogdW5kZWZpbmVkLFxuICAgICAgICBzaWduYWw6IHRoaXMuZ2V0VGltZW91dFNpZ25hbChvcHRpb25zPy5zaWduYWwpXG4gICAgICB9KTtcbiAgICAgIGlmICghcmVzcG9uc2Uub2spIHRocm93IHJlc3BvbnNlO1xuICAgICAgcmV0dXJuIHJlc3BvbnNlLmpzb24oKSBhcyBQcm9taXNlPFQ+O1xuICAgIH0sXG4gICAgcGF0Y2g6IGFzeW5jIDxUPih1cmw6IHN0cmluZywgYm9keTogdW5rbm93biwgb3B0aW9ucz86IFJlcXVlc3RJbml0KTogUHJvbWlzZTxUPiA9PiB7XG4gICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGZldGNoKHVybCwge1xuICAgICAgICAuLi5vcHRpb25zLFxuICAgICAgICBtZXRob2Q6ICdQQVRDSCcsXG4gICAgICAgIGhlYWRlcnM6IHsgLi4udGhpcy5nZXRIZWFkZXJzKCksIC4uLm9wdGlvbnM/LmhlYWRlcnMgfSxcbiAgICAgICAgYm9keTogYm9keSA/IEpTT04uc3RyaW5naWZ5KGJvZHkpIDogdW5kZWZpbmVkLFxuICAgICAgICBzaWduYWw6IHRoaXMuZ2V0VGltZW91dFNpZ25hbChvcHRpb25zPy5zaWduYWwpXG4gICAgICB9KTtcbiAgICAgIGlmICghcmVzcG9uc2Uub2spIHRocm93IHJlc3BvbnNlO1xuICAgICAgcmV0dXJuIHJlc3BvbnNlLmpzb24oKSBhcyBQcm9taXNlPFQ+O1xuICAgIH0sXG4gICAgZGVsZXRlOiBhc3luYyAodXJsOiBzdHJpbmcsIG9wdGlvbnM/OiBSZXF1ZXN0SW5pdCk6IFByb21pc2U8dm9pZD4gPT4ge1xuICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBmZXRjaCh1cmwsIHtcbiAgICAgICAgLi4ub3B0aW9ucyxcbiAgICAgICAgbWV0aG9kOiAnREVMRVRFJyxcbiAgICAgICAgaGVhZGVyczogeyAuLi50aGlzLmdldEhlYWRlcnMoKSwgLi4ub3B0aW9ucz8uaGVhZGVycyB9LFxuICAgICAgICBzaWduYWw6IHRoaXMuZ2V0VGltZW91dFNpZ25hbChvcHRpb25zPy5zaWduYWwpXG4gICAgICB9KTtcbiAgICAgIGlmICghcmVzcG9uc2Uub2spIHRocm93IHJlc3BvbnNlO1xuICAgIH1cbiAgfTtcblxuICAvKipcbiAgICogR2V0cyBIVFRQIGhlYWRlcnMgZm9yIEpTT04gQVBJIHJlcXVlc3RzLlxuICAgKlxuICAgKiBAcmV0dXJucyBIZWFkZXJzIHdpdGggSlNPTiBjb250ZW50IHR5cGUgYW5kIG9wdGlvbmFsIGJlYXJlciB0b2tlbi5cbiAgICovXG4gIHByaXZhdGUgZ2V0SGVhZGVycygpOiBIZWFkZXJzSW5pdCB7XG4gICAgY29uc3QgaGVhZGVyczogSGVhZGVyc0luaXQgPSB7ICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicgfTtcbiAgICBpZiAodGhpcy5vcHRpb25zLmFjY2Vzc1Rva2VuKSB7XG4gICAgICBoZWFkZXJzWydBdXRob3JpemF0aW9uJ10gPSBgQmVhcmVyICR7dGhpcy5vcHRpb25zLmFjY2Vzc1Rva2VufWA7XG4gICAgfVxuICAgIHJldHVybiBoZWFkZXJzO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldHMgdGhlIEhUVFAgY2xpZW50IHRvIHVzZSBmb3IgcmVxdWVzdHMuXG4gICAqXG4gICAqIEByZXR1cm5zIEluamVjdGVkIEhUVFAgY2xpZW50IHdoZW4gcHJvdmlkZWQsIG90aGVyd2lzZSB0aGUgZGVmYXVsdCBmZXRjaC1iYXNlZCBjbGllbnQuXG4gICAqL1xuICBwcml2YXRlIGdldEh0dHBDbGllbnQoKTogSHR0cENsaWVudCB7XG4gICAgcmV0dXJuIHRoaXMuX2h0dHBDbGllbnQgPz8gdGhpcy5kZWZhdWx0SHR0cENsaWVudDtcbiAgfVxuXG4gIC8qKlxuICAgKiBCdWlsZHMgYSBVUkwgcmVsYXRpdmUgdG8gdGhlIGNvbmZpZ3VyZWQgYmFzZSBVUkwuXG4gICAqXG4gICAqIFVuZGVmaW5lZCBhbmQgbnVsbCBxdWVyeSBwYXJhbXMgYXJlIG9taXR0ZWQuIFZhbHVlcyBhcmUgc3RyaW5naWZpZWQuXG4gICAqXG4gICAqIEBwYXJhbSBwYXRoIC0gUmVsYXRpdmUgQVBJIHBhdGggdG8gYXBwZW5kIHRvIHRoZSBjb25maWd1cmVkIGJhc2UgVVJMLlxuICAgKiBAcGFyYW0gcGFyYW1zIC0gT3B0aW9uYWwgcXVlcnkgcGFyYW1ldGVycyB0byBlbmNvZGUgb250byB0aGUgVVJMLlxuICAgKiBAcmV0dXJucyBGdWxseS1xdWFsaWZpZWQgcmVxdWVzdCBVUkwgc3RyaW5nLlxuICAgKi9cbiAgcHJpdmF0ZSBidWlsZFVybChwYXRoOiBzdHJpbmcsIHBhcmFtcz86IFJlY29yZDxzdHJpbmcsIHVua25vd24+KTogc3RyaW5nIHtcbiAgICBjb25zdCB1cmwgPSBuZXcgVVJMKHBhdGgsIHRoaXMub3B0aW9ucy5iYXNlVXJsKTtcbiAgICBpZiAocGFyYW1zKSB7XG4gICAgICBmb3IgKGNvbnN0IFtrZXksIHZhbHVlXSBvZiBPYmplY3QuZW50cmllcyhwYXJhbXMpKSB7XG4gICAgICAgIGlmICh2YWx1ZSAhPT0gdW5kZWZpbmVkICYmIHZhbHVlICE9PSBudWxsKSB7XG4gICAgICAgICAgdXJsLnNlYXJjaFBhcmFtcy5zZXQoa2V5LCBTdHJpbmcodmFsdWUpKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdXJsLnRvU3RyaW5nKCk7XG4gIH1cblxuICAvKipcbiAgICogV3JhcHMgYSByZXF1ZXN0IHdpdGggY29uc2lzdGVudCBlcnJvciBoYW5kbGluZy5cbiAgICpcbiAgICogQHBhcmFtIGZuIC0gQXN5bmMgcmVxdWVzdCBmdW5jdGlvbiB0byBleGVjdXRlLlxuICAgKiBAcmV0dXJucyBUaGUgcmVzb2x2ZWQgdmFsdWUgZnJvbSB0aGUgcmVxdWVzdCBmdW5jdGlvbi5cbiAgICogQHRocm93cyBBcGlFcnJvciB3aGVuIHRoZSBzZXJ2ZXIgcmVzcG9uZHMgd2l0aCBhIG5vbi0yeHggc3RhdHVzLlxuICAgKiBAdGhyb3dzIE5ldHdvcmtFcnJvciBmb3IgbmV0d29yayBmYWlsdXJlcyBvciB1bmV4cGVjdGVkIGV4Y2VwdGlvbnMuXG4gICAqL1xuICBwcml2YXRlIGFzeW5jIHJlcXVlc3Q8VD4oZm46ICgpID0+IFByb21pc2U8VD4pOiBQcm9taXNlPFQ+IHtcbiAgICBsZXQgbGFzdFRpbWVvdXRFcnJvcjogTmV0d29ya0Vycm9yIHwgdW5kZWZpbmVkO1xuXG4gICAgZm9yIChsZXQgYXR0ZW1wdCA9IDA7IGF0dGVtcHQgPD0gTUFYX1RJTUVPVVRfUkVUUklFUzsgYXR0ZW1wdCsrKSB7XG4gICAgICB0cnkge1xuICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBmbigpO1xuICAgICAgICB0aGlzLm9uUmVxdWVzdFN1Y2Nlc3MoKTtcbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgIGlmIChlcnJvciBpbnN0YW5jZW9mIFJlc3BvbnNlKSB7XG4gICAgICAgICAgLy8gU2VydmVyIHJlc3BvbmRlZCAoZXZlbiB3aXRoIGFuIGVycm9yIHN0YXR1cykgLSBjb25uZWN0aW9uIGlzIGFsaXZlLCByZXNldCBiYWNrb2ZmXG4gICAgICAgICAgdGhpcy5vblJlcXVlc3RTdWNjZXNzKCk7XG4gICAgICAgICAgbGV0IGJvZHk6IFJlY29yZDxzdHJpbmcsIHVua25vd24+ID0ge307XG4gICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGJvZHkgPSBhd2FpdCBlcnJvci5qc29uKCk7XG4gICAgICAgICAgfSBjYXRjaCAocGFyc2VFcnJvcikge1xuICAgICAgICAgICAgLy8gU3ludGF4RXJyb3IgaXMgZXhwZWN0ZWQgd2hlbiBzZXJ2ZXIgcmV0dXJucyBub24tSlNPTiBlcnJvciByZXNwb25zZSAoZS5nLiwgSFRNTCBlcnJvciBwYWdlKVxuICAgICAgICAgICAgaWYgKCEocGFyc2VFcnJvciBpbnN0YW5jZW9mIFN5bnRheEVycm9yKSkge1xuICAgICAgICAgICAgICBjb25zb2xlLndhcm4oJ1tDYXJkc0NsaWVudF0gVW5leHBlY3RlZCBlcnJvciBwYXJzaW5nIGVycm9yIHJlc3BvbnNlOicsIHBhcnNlRXJyb3IpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBjb25zdCBtZXNzYWdlID1cbiAgICAgICAgICAgIChib2R5WydlcnJvciddIGFzIHN0cmluZyB8IHVuZGVmaW5lZCkgfHwgKGJvZHlbJ21lc3NhZ2UnXSBhcyBzdHJpbmcgfCB1bmRlZmluZWQpIHx8IGVycm9yLnN0YXR1c1RleHQ7XG4gICAgICAgICAgY29uc3QgY29kZSA9IChib2R5Wydjb2RlJ10gYXMgc3RyaW5nIHwgdW5kZWZpbmVkKSB8fCBTdHJpbmcoZXJyb3Iuc3RhdHVzKTtcbiAgICAgICAgICBjb25zdCBmaWVsZHMgPSBib2R5WydmaWVsZHMnXSBhcyBBcnJheTx7IGZpZWxkOiBzdHJpbmc7IG1lc3NhZ2U6IHN0cmluZyB9PiB8IHVuZGVmaW5lZDtcbiAgICAgICAgICB0aHJvdyBuZXcgQXBpRXJyb3IobWVzc2FnZSwgY29kZSwgZmllbGRzKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIE5ldHdvcmsgb3IgdGltZW91dCBmYWlsdXJlIC0gaW5jcmVhc2UgYmFja29mZiBmb3IgbmV4dCBhdHRlbXB0XG4gICAgICAgIHRoaXMub25SZXF1ZXN0RmFpbHVyZSgpO1xuXG4gICAgICAgIGlmIChlcnJvciBpbnN0YW5jZW9mIERPTUV4Y2VwdGlvbiAmJiBlcnJvci5uYW1lID09PSAnVGltZW91dEVycm9yJykge1xuICAgICAgICAgIGxhc3RUaW1lb3V0RXJyb3IgPSBuZXcgTmV0d29ya0Vycm9yKCdSZXF1ZXN0IHRpbWVkIG91dCcsIGVycm9yKTtcbiAgICAgICAgICAvLyBSZXRyeSBvbiB0aW1lb3V0IC0gb25SZXF1ZXN0RmFpbHVyZSgpIGFscmVhZHkgaW5jcmVhc2VkIF9jdXJyZW50VGltZW91dE1zXG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBOb24tdGltZW91dCBuZXR3b3JrIGVycm9ycyAoRE5TIGZhaWx1cmUsIGNvbm5lY3Rpb24gcmVmdXNlZCkgYXJlIG5vdCByZXRyaWVkXG4gICAgICAgIHRocm93IG5ldyBOZXR3b3JrRXJyb3IoJ1JlcXVlc3QgZmFpbGVkJywgZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yIDogdW5kZWZpbmVkKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBBbGwgcmV0cnkgYXR0ZW1wdHMgZXhoYXVzdGVkXG4gICAgdGhyb3cgbGFzdFRpbWVvdXRFcnJvciE7XG4gIH1cblxuICAvLyAtLS0gQ2FyZCBPcGVyYXRpb25zIC0tLVxuXG4gIC8qKlxuICAgKiBMaXN0cyBjYXJkcyB3aXRoIG9wdGlvbmFsIGZpbHRlcmluZy5cbiAgICpcbiAgICogQHBhcmFtIG9wdGlvbnMgLSBPcHRpb25hbCBmaWx0ZXIgYW5kIHBhZ2luYXRpb24gb3B0aW9ucy5cbiAgICogQHJldHVybnMgUHJvbWlzZSByZXNvbHZpbmcgdG8gbWF0Y2hpbmcgY2FyZHMuXG4gICAqIEB0aHJvd3MgQXBpRXJyb3Igd2hlbiB0aGUgc2VydmVyIHJlc3BvbmRzIHdpdGggYW4gZXJyb3IuXG4gICAqIEB0aHJvd3MgTmV0d29ya0Vycm9yIHdoZW4gdGhlIHJlcXVlc3QgZmFpbHMgdG8gcmVhY2ggdGhlIHNlcnZlci5cbiAgICovXG4gIGFzeW5jIGxpc3RDYXJkcyhvcHRpb25zPzogTGlzdENhcmRzT3B0aW9ucyk6IFByb21pc2U8Q2FyZFtdPiB7XG4gICAgY29uc3QgdXJsU3RyID0gdGhpcy5idWlsZFVybCgnL2NhcmRzJywge1xuICAgICAgd29ya3NwYWNlUGF0aDogdGhpcy5vcHRpb25zLndvcmtzcGFjZVBhdGgsXG4gICAgICBzdGF0dXM6IG9wdGlvbnM/LnN0YXR1cyxcbiAgICAgIHNlYXJjaDogb3B0aW9ucz8uc2VhcmNoLFxuICAgICAgbGltaXQ6IG9wdGlvbnM/LmxpbWl0LFxuICAgICAgb2Zmc2V0OiBvcHRpb25zPy5vZmZzZXRcbiAgICB9KTtcbiAgICBjb25zdCB1cmwgPSBuZXcgVVJMKHVybFN0cik7XG4gICAgZm9yIChjb25zdCB0IG9mIG9wdGlvbnM/LnRhZ3MgPz8gW10pIHtcbiAgICAgIHVybC5zZWFyY2hQYXJhbXMuYXBwZW5kKCd0YWcnLCB0KTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMucmVxdWVzdCgoKSA9PiB0aGlzLmdldEh0dHBDbGllbnQoKS5nZXQ8Q2FyZFtdPih1cmwudG9TdHJpbmcoKSkpO1xuICB9XG5cbiAgLyoqXG4gICAqIExpc3RzIGNhcmRzIGFzIGxpZ2h0d2VpZ2h0IHN1bW1hcmllcyBmb3IgbGlzdCB2aWV3cy5cbiAgICpcbiAgICogUmV0dXJucyBwcmUtZmxhdHRlbmVkIGZpZWxkcyBzdWl0YWJsZSBmb3IgZGlyZWN0IHVzZSBpbiBsaXN0IHJlbmRlcmluZyxcbiAgICogb21pdHRpbmcgaGVhdnl3ZWlnaHQgZmllbGRzIGxpa2UgYHBsYW5Db250ZW50YCBhbmQgYHJlcG9zaXRvcnlQYXRoYC5cbiAgICpcbiAgICogQHRlbXBsYXRlIFQgLSBUaGUgZXhwZWN0ZWQgc3VtbWFyeSBzaGFwZSAoZGVmYXVsdCBgUmVjb3JkPHN0cmluZywgdW5rbm93bj5gKS5cbiAgICogQHJldHVybnMgUHJvbWlzZSByZXNvbHZpbmcgdG8gY2FyZCBzdW1tYXJpZXMuXG4gICAqIEB0aHJvd3MgQXBpRXJyb3Igd2hlbiB0aGUgc2VydmVyIHJlc3BvbmRzIHdpdGggYW4gZXJyb3IuXG4gICAqIEB0aHJvd3MgTmV0d29ya0Vycm9yIHdoZW4gdGhlIHJlcXVlc3QgZmFpbHMgdG8gcmVhY2ggdGhlIHNlcnZlci5cbiAgICovXG4gIGFzeW5jIGxpc3RDYXJkU3VtbWFyaWVzPFQgPSBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPj4oKTogUHJvbWlzZTxUW10+IHtcbiAgICBjb25zdCB1cmwgPSB0aGlzLmJ1aWxkVXJsKCcvY2FyZHMvbGlzdCcsIHtcbiAgICAgIHdvcmtzcGFjZVBhdGg6IHRoaXMub3B0aW9ucy53b3Jrc3BhY2VQYXRoXG4gICAgfSk7XG4gICAgcmV0dXJuIHRoaXMucmVxdWVzdCgoKSA9PiB0aGlzLmdldEh0dHBDbGllbnQoKS5nZXQ8VFtdPih1cmwpKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXRzIGEgc2luZ2xlIGNhcmQgYnkgaWQuXG4gICAqXG4gICAqIEBwYXJhbSBjYXJkSWQgLSBUaGUgaWQgb2YgdGhlIGNhcmQgdG8gcmV0cmlldmUuXG4gICAqIEByZXR1cm5zIFByb21pc2UgcmVzb2x2aW5nIHRvIHRoZSBjYXJkLlxuICAgKiBAdGhyb3dzIEFwaUVycm9yIHdoZW4gdGhlIHNlcnZlciByZXNwb25kcyB3aXRoIGFuIGVycm9yLlxuICAgKiBAdGhyb3dzIE5ldHdvcmtFcnJvciB3aGVuIHRoZSByZXF1ZXN0IGZhaWxzIHRvIHJlYWNoIHRoZSBzZXJ2ZXIuXG4gICAqL1xuICBhc3luYyBnZXRDYXJkKGNhcmRJZDogc3RyaW5nKTogUHJvbWlzZTxDYXJkPiB7XG4gICAgY29uc3QgdXJsID0gdGhpcy5idWlsZFVybChgL2NhcmRzLyR7Y2FyZElkfWAsIHtcbiAgICAgIHdvcmtzcGFjZVBhdGg6IHRoaXMub3B0aW9ucy53b3Jrc3BhY2VQYXRoXG4gICAgfSk7XG4gICAgcmV0dXJuIHRoaXMucmVxdWVzdCgoKSA9PiB0aGlzLmdldEh0dHBDbGllbnQoKS5nZXQ8Q2FyZD4odXJsKSk7XG4gIH1cblxuICAvKipcbiAgICogQ3JlYXRlcyBhIG5ldyBjYXJkLlxuICAgKlxuICAgKiBAcGFyYW0gZGF0YSAtIENhcmQgY3JlYXRpb24gcGF5bG9hZC5cbiAgICogQHJldHVybnMgUHJvbWlzZSByZXNvbHZpbmcgdG8gdGhlIGNyZWF0ZWQgY2FyZC5cbiAgICogQHRocm93cyBBcGlFcnJvciB3aGVuIHRoZSBzZXJ2ZXIgcmVqZWN0cyB0aGUgcGF5bG9hZC5cbiAgICogQHRocm93cyBOZXR3b3JrRXJyb3Igd2hlbiB0aGUgcmVxdWVzdCBmYWlscyB0byByZWFjaCB0aGUgc2VydmVyLlxuICAgKi9cbiAgYXN5bmMgY3JlYXRlQ2FyZChkYXRhOiBDYXJkQ3JlYXRlRGF0YSk6IFByb21pc2U8Q2FyZD4ge1xuICAgIGNvbnN0IHVybCA9IHRoaXMuYnVpbGRVcmwoJy9jYXJkcycpO1xuICAgIGNvbnN0IGJvZHkgPSB7XG4gICAgICAuLi5kYXRhLFxuICAgICAgd29ya3NwYWNlUGF0aDogdGhpcy5vcHRpb25zLndvcmtzcGFjZVBhdGhcbiAgICB9O1xuICAgIHJldHVybiB0aGlzLnJlcXVlc3QoKCkgPT4gdGhpcy5nZXRIdHRwQ2xpZW50KCkucG9zdDxDYXJkPih1cmwsIGJvZHkpKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBVcGRhdGVzIGFuIGV4aXN0aW5nIGNhcmQuXG4gICAqXG4gICAqIEBwYXJhbSBjYXJkSWQgLSBUaGUgaWQgb2YgdGhlIGNhcmQgdG8gdXBkYXRlLlxuICAgKiBAcGFyYW0gZGF0YSAtIFRoZSBmaWVsZHMgdG8gdXBkYXRlLlxuICAgKiBAcmV0dXJucyBQcm9taXNlIHJlc29sdmluZyB0byB0aGUgdXBkYXRlZCBjYXJkLlxuICAgKiBAdGhyb3dzIEFwaUVycm9yIHdoZW4gdGhlIHNlcnZlciByZWplY3RzIHRoZSB1cGRhdGUuXG4gICAqIEB0aHJvd3MgTmV0d29ya0Vycm9yIHdoZW4gdGhlIHJlcXVlc3QgZmFpbHMgdG8gcmVhY2ggdGhlIHNlcnZlci5cbiAgICogQGRlcHJlY2F0ZWQgVXNlIGRpcmVjdCBnaXQgb3BlcmF0aW9ucyBpbnN0ZWFkLiBUaGlzIGVuZHBvaW50IHdpbGwgYmUgcmVtb3ZlZC5cbiAgICovXG4gIGFzeW5jIHVwZGF0ZUNhcmQoY2FyZElkOiBzdHJpbmcsIGRhdGE6IENhcmRVcGRhdGVEYXRhKTogUHJvbWlzZTxDYXJkPiB7XG4gICAgY29uc3QgdXJsID0gdGhpcy5idWlsZFVybChgL2NhcmRzLyR7Y2FyZElkfWApO1xuICAgIHJldHVybiB0aGlzLnJlcXVlc3QoKCkgPT4gdGhpcy5nZXRIdHRwQ2xpZW50KCkucGF0Y2g8Q2FyZD4odXJsLCBkYXRhKSk7XG4gIH1cblxuICAvKipcbiAgICogRGVsZXRlcyBhIGNhcmQuXG4gICAqXG4gICAqIEBwYXJhbSBjYXJkSWQgLSBUaGUgaWQgb2YgdGhlIGNhcmQgdG8gZGVsZXRlLlxuICAgKiBAcmV0dXJucyBQcm9taXNlIHJlc29sdmluZyB3aGVuIGRlbGV0aW9uIGlzIGNvbXBsZXRlLlxuICAgKiBAdGhyb3dzIEFwaUVycm9yIHdoZW4gdGhlIHNlcnZlciByZWplY3RzIHRoZSBkZWxldGUuXG4gICAqIEB0aHJvd3MgTmV0d29ya0Vycm9yIHdoZW4gdGhlIHJlcXVlc3QgZmFpbHMgdG8gcmVhY2ggdGhlIHNlcnZlci5cbiAgICogQGRlcHJlY2F0ZWQgVXNlIGRpcmVjdCBnaXQgb3BlcmF0aW9ucyBpbnN0ZWFkLiBUaGlzIGVuZHBvaW50IHdpbGwgYmUgcmVtb3ZlZC5cbiAgICovXG4gIGFzeW5jIGRlbGV0ZUNhcmQoY2FyZElkOiBzdHJpbmcpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zdCB1cmwgPSB0aGlzLmJ1aWxkVXJsKGAvY2FyZHMvJHtjYXJkSWR9YCk7XG4gICAgcmV0dXJuIHRoaXMucmVxdWVzdCgoKSA9PiB0aGlzLmdldEh0dHBDbGllbnQoKS5kZWxldGUodXJsKSk7XG4gIH1cblxuICAvLyAtLS0gQ29tbWVudCBPcGVyYXRpb25zIC0tLVxuXG4gIC8qKlxuICAgKiBHZXRzIGFsbCBjb21tZW50cyBmb3IgYSBjYXJkLlxuICAgKlxuICAgKiBAcGFyYW0gY2FyZElkIC0gSWRlbnRpZmllciBvZiB0aGUgdGFyZ2V0IGNhcmQgZm9yIHRoaXMgcmVxdWVzdC5cbiAgICogQHJldHVybnMgUHJvbWlzZSByZXNvbHZpbmcgdG8gdGhlIGNvbW1lbnQgbGlzdC5cbiAgICogQHRocm93cyBBcGlFcnJvciB3aGVuIHRoZSBzZXJ2ZXIgcmVzcG9uZHMgd2l0aCBhbiBlcnJvci5cbiAgICogQHRocm93cyBOZXR3b3JrRXJyb3Igd2hlbiB0aGUgcmVxdWVzdCBmYWlscyB0byByZWFjaCB0aGUgc2VydmVyLlxuICAgKi9cbiAgYXN5bmMgZ2V0Q29tbWVudHMoY2FyZElkOiBzdHJpbmcpOiBQcm9taXNlPENvbW1lbnRbXT4ge1xuICAgIGNvbnN0IHVybCA9IHRoaXMuYnVpbGRVcmwoYC9jYXJkcy8ke2NhcmRJZH0vY29tbWVudHNgKTtcbiAgICByZXR1cm4gdGhpcy5yZXF1ZXN0KCgpID0+IHRoaXMuZ2V0SHR0cENsaWVudCgpLmdldDxDb21tZW50W10+KHVybCkpO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldHMgYSBzaW5nbGUgY29tbWVudCBieSBpZC5cbiAgICpcbiAgICogQHBhcmFtIGNhcmRJZCAtIElkZW50aWZpZXIgb2YgdGhlIGNhcmQgdGhhdCBvd25zIHRoZSByZXF1ZXN0ZWQgY29tbWVudC5cbiAgICogQHBhcmFtIGNvbW1lbnRJZCAtIElkZW50aWZpZXIgb2YgdGhlIGNvbW1lbnQgdG8gcmV0cmlldmUuXG4gICAqIEByZXR1cm5zIFByb21pc2UgcmVzb2x2aW5nIHRvIHRoZSBjb21tZW50LlxuICAgKiBAdGhyb3dzIEFwaUVycm9yIHdoZW4gdGhlIHNlcnZlciByZXNwb25kcyB3aXRoIGFuIGVycm9yLlxuICAgKiBAdGhyb3dzIE5ldHdvcmtFcnJvciB3aGVuIHRoZSByZXF1ZXN0IGZhaWxzIHRvIHJlYWNoIHRoZSBzZXJ2ZXIuXG4gICAqL1xuICBhc3luYyBnZXRDb21tZW50KGNhcmRJZDogc3RyaW5nLCBjb21tZW50SWQ6IHN0cmluZyk6IFByb21pc2U8Q29tbWVudD4ge1xuICAgIGNvbnN0IHVybCA9IHRoaXMuYnVpbGRVcmwoYC9jYXJkcy8ke2NhcmRJZH0vY29tbWVudHMvJHtjb21tZW50SWR9YCk7XG4gICAgcmV0dXJuIHRoaXMucmVxdWVzdCgoKSA9PiB0aGlzLmdldEh0dHBDbGllbnQoKS5nZXQ8Q29tbWVudD4odXJsKSk7XG4gIH1cblxuICAvKipcbiAgICogQ3JlYXRlcyBhIG5ldyBjb21tZW50IG9uIGEgY2FyZC5cbiAgICpcbiAgICogQHBhcmFtIGNhcmRJZCAtIElkZW50aWZpZXIgb2YgdGhlIGNhcmQgdGhhdCB3aWxsIHJlY2VpdmUgdGhlIG5ldyBjb21tZW50LlxuICAgKiBAcGFyYW0gZGF0YSAtIENvbW1lbnQgY3JlYXRpb24gcGF5bG9hZC5cbiAgICogQHJldHVybnMgUHJvbWlzZSByZXNvbHZpbmcgdG8gdGhlIGNyZWF0ZWQgY29tbWVudC5cbiAgICogQHRocm93cyBBcGlFcnJvciB3aGVuIHRoZSBzZXJ2ZXIgcmVqZWN0cyB0aGUgcGF5bG9hZC5cbiAgICogQHRocm93cyBOZXR3b3JrRXJyb3Igd2hlbiB0aGUgcmVxdWVzdCBmYWlscyB0byByZWFjaCB0aGUgc2VydmVyLlxuICAgKiBAZGVwcmVjYXRlZCBVc2UgZGlyZWN0IGdpdCBvcGVyYXRpb25zIGluc3RlYWQuIFRoaXMgZW5kcG9pbnQgd2lsbCBiZSByZW1vdmVkLlxuICAgKi9cbiAgYXN5bmMgY3JlYXRlQ29tbWVudChjYXJkSWQ6IHN0cmluZywgZGF0YTogQ29tbWVudENyZWF0ZURhdGEpOiBQcm9taXNlPENvbW1lbnQ+IHtcbiAgICBjb25zdCB1cmwgPSB0aGlzLmJ1aWxkVXJsKGAvY2FyZHMvJHtjYXJkSWR9L2NvbW1lbnRzYCk7XG4gICAgcmV0dXJuIHRoaXMucmVxdWVzdCgoKSA9PiB0aGlzLmdldEh0dHBDbGllbnQoKS5wb3N0PENvbW1lbnQ+KHVybCwgZGF0YSkpO1xuICB9XG5cbiAgLyoqXG4gICAqIFVwZGF0ZXMgYW4gZXhpc3RpbmcgY29tbWVudC5cbiAgICpcbiAgICogQHBhcmFtIGNhcmRJZCAtIElkZW50aWZpZXIgb2YgdGhlIGNhcmQgdGhhdCBvd25zIHRoZSBjb21tZW50LlxuICAgKiBAcGFyYW0gY29tbWVudElkIC0gSWRlbnRpZmllciBvZiB0aGUgY29tbWVudCB0byB1cGRhdGUuXG4gICAqIEBwYXJhbSBkYXRhIC0gQ29tbWVudCB1cGRhdGUgcGF5bG9hZC5cbiAgICogQHJldHVybnMgUHJvbWlzZSByZXNvbHZpbmcgdG8gdGhlIHVwZGF0ZWQgY29tbWVudC5cbiAgICogQHRocm93cyBBcGlFcnJvciB3aGVuIHRoZSBzZXJ2ZXIgcmVqZWN0cyB0aGUgdXBkYXRlLlxuICAgKiBAdGhyb3dzIE5ldHdvcmtFcnJvciB3aGVuIHRoZSByZXF1ZXN0IGZhaWxzIHRvIHJlYWNoIHRoZSBzZXJ2ZXIuXG4gICAqIEBkZXByZWNhdGVkIFVzZSBkaXJlY3QgZ2l0IG9wZXJhdGlvbnMgaW5zdGVhZC4gVGhpcyBlbmRwb2ludCB3aWxsIGJlIHJlbW92ZWQuXG4gICAqL1xuICBhc3luYyB1cGRhdGVDb21tZW50KGNhcmRJZDogc3RyaW5nLCBjb21tZW50SWQ6IHN0cmluZywgZGF0YTogQ29tbWVudFVwZGF0ZURhdGEpOiBQcm9taXNlPENvbW1lbnQ+IHtcbiAgICBjb25zdCB1cmwgPSB0aGlzLmJ1aWxkVXJsKGAvY2FyZHMvJHtjYXJkSWR9L2NvbW1lbnRzLyR7Y29tbWVudElkfWApO1xuICAgIHJldHVybiB0aGlzLnJlcXVlc3QoKCkgPT4gdGhpcy5nZXRIdHRwQ2xpZW50KCkucGF0Y2g8Q29tbWVudD4odXJsLCBkYXRhKSk7XG4gIH1cblxuICAvKipcbiAgICogRGVsZXRlcyBhIGNvbW1lbnQuXG4gICAqXG4gICAqIEBwYXJhbSBjYXJkSWQgLSBJZGVudGlmaWVyIG9mIHRoZSBjYXJkIHRoYXQgb3ducyB0aGUgY29tbWVudC5cbiAgICogQHBhcmFtIGNvbW1lbnRJZCAtIElkZW50aWZpZXIgb2YgdGhlIGNvbW1lbnQgdG8gcmVtb3ZlLlxuICAgKiBAcmV0dXJucyBQcm9taXNlIHJlc29sdmluZyB3aGVuIGRlbGV0aW9uIGlzIGNvbXBsZXRlLlxuICAgKiBAdGhyb3dzIEFwaUVycm9yIHdoZW4gdGhlIHNlcnZlciByZWplY3RzIHRoZSBkZWxldGUuXG4gICAqIEB0aHJvd3MgTmV0d29ya0Vycm9yIHdoZW4gdGhlIHJlcXVlc3QgZmFpbHMgdG8gcmVhY2ggdGhlIHNlcnZlci5cbiAgICogQGRlcHJlY2F0ZWQgVXNlIGRpcmVjdCBnaXQgb3BlcmF0aW9ucyBpbnN0ZWFkLiBUaGlzIGVuZHBvaW50IHdpbGwgYmUgcmVtb3ZlZC5cbiAgICovXG4gIGFzeW5jIGRlbGV0ZUNvbW1lbnQoY2FyZElkOiBzdHJpbmcsIGNvbW1lbnRJZDogc3RyaW5nKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc3QgdXJsID0gdGhpcy5idWlsZFVybChgL2NhcmRzLyR7Y2FyZElkfS9jb21tZW50cy8ke2NvbW1lbnRJZH1gKTtcbiAgICByZXR1cm4gdGhpcy5yZXF1ZXN0KCgpID0+IHRoaXMuZ2V0SHR0cENsaWVudCgpLmRlbGV0ZSh1cmwpKTtcbiAgfVxuXG4gIC8vIC0tLSBBdHRhY2htZW50IE9wZXJhdGlvbnMgLS0tXG5cbiAgLyoqXG4gICAqIFVwbG9hZHMgYW4gYXR0YWNobWVudCB0byBhIGNhcmQgdXNpbmcgYmluYXJ5IFBVVC5cbiAgICpcbiAgICogVGhpcyBpcyB0aGUgcHJlZmVycmVkIG1ldGhvZCAtIHNlbmRzIHJhdyBiaW5hcnkgZGF0YSBkaXJlY3RseSB3aXRob3V0XG4gICAqIGJhc2U2NCBlbmNvZGluZywgcmVzdWx0aW5nIGluIDMzJSBzbWFsbGVyIHBheWxvYWRzLlxuICAgKlxuICAgKiBAcGFyYW0gY2FyZElkIC0gSWRlbnRpZmllciBvZiB0aGUgY2FyZCB0aGF0IHdpbGwgcmVjZWl2ZSB0aGUgYXR0YWNobWVudC5cbiAgICogQHBhcmFtIG5hbWUgLSBGaWxlIG5hbWUgaW5jbHVkaW5nIGV4dGVuc2lvbi5cbiAgICogQHBhcmFtIGRhdGEgLSBCaW5hcnkgZGF0YSBhcyBCbG9iLCBBcnJheUJ1ZmZlciwgb3IgYmFzZTY0IHN0cmluZy5cbiAgICogQHJldHVybnMgUHJvbWlzZSByZXNvbHZpbmcgdG8gYXR0YWNobWVudCBtZXRhZGF0YS5cbiAgICogQHRocm93cyBBcGlFcnJvciB3aGVuIHRoZSBzZXJ2ZXIgcmVqZWN0cyB0aGUgdXBsb2FkLlxuICAgKiBAdGhyb3dzIE5ldHdvcmtFcnJvciB3aGVuIHRoZSByZXF1ZXN0IGZhaWxzIHRvIHJlYWNoIHRoZSBzZXJ2ZXIuXG4gICAqL1xuICBhc3luYyB1cGxvYWRBdHRhY2htZW50KGNhcmRJZDogc3RyaW5nLCBuYW1lOiBzdHJpbmcsIGRhdGE6IEJsb2IgfCBBcnJheUJ1ZmZlciB8IHN0cmluZyk6IFByb21pc2U8QXR0YWNobWVudFJlc3BvbnNlPiB7XG4gICAgY29uc3QgdXJsID0gdGhpcy5idWlsZFVybChgL2NhcmRzLyR7Y2FyZElkfS9hdHRhY2htZW50cy8ke2VuY29kZVVSSUNvbXBvbmVudChuYW1lKX1gKTtcblxuICAgIC8vIENvbnZlcnQgZGF0YSB0byBCbG9iIGZvciBmZXRjaCBib2R5XG4gICAgbGV0IGJvZHk6IEJsb2I7XG4gICAgaWYgKGRhdGEgaW5zdGFuY2VvZiBCbG9iKSB7XG4gICAgICBib2R5ID0gZGF0YTtcbiAgICB9IGVsc2UgaWYgKGRhdGEgaW5zdGFuY2VvZiBBcnJheUJ1ZmZlcikge1xuICAgICAgYm9keSA9IG5ldyBCbG9iKFtkYXRhXSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIGJhc2U2NCBzdHJpbmcgLSBkZWNvZGUgdG8gYmluYXJ5XG4gICAgICBjb25zdCBiaW5hcnlTdHJpbmcgPSBhdG9iKGRhdGEpO1xuICAgICAgY29uc3QgYnl0ZXMgPSBuZXcgVWludDhBcnJheShiaW5hcnlTdHJpbmcubGVuZ3RoKTtcbiAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgYmluYXJ5U3RyaW5nLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGJ5dGVzW2ldID0gYmluYXJ5U3RyaW5nLmNoYXJDb2RlQXQoaSk7XG4gICAgICB9XG4gICAgICBib2R5ID0gbmV3IEJsb2IoW2J5dGVzXSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMucmVxdWVzdChhc3luYyAoKSA9PiB7XG4gICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGZldGNoKHVybCwge1xuICAgICAgICBtZXRob2Q6ICdQVVQnLFxuICAgICAgICBoZWFkZXJzOiB7XG4gICAgICAgICAgLi4udGhpcy5nZXRIZWFkZXJzKCksXG4gICAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9vY3RldC1zdHJlYW0nXG4gICAgICAgIH0sXG4gICAgICAgIGJvZHksXG4gICAgICAgIHNpZ25hbDogdGhpcy5nZXRUaW1lb3V0U2lnbmFsKClcbiAgICAgIH0pO1xuICAgICAgaWYgKCFyZXNwb25zZS5vaykgdGhyb3cgcmVzcG9uc2U7XG4gICAgICByZXR1cm4gcmVzcG9uc2UuanNvbigpIGFzIFByb21pc2U8QXR0YWNobWVudFJlc3BvbnNlPjtcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBEb3dubG9hZHMgYW4gYXR0YWNobWVudCBhcyBhIEJsb2IuXG4gICAqXG4gICAqIFRoaXMgbWV0aG9kIHVzZXMgYGZldGNoYCBkaXJlY3RseSBzbyBiaW5hcnkgZGF0YSBpcyBwcmVzZXJ2ZWQuXG4gICAqXG4gICAqIEBwYXJhbSBjYXJkSWQgLSBJZGVudGlmaWVyIG9mIHRoZSBjYXJkIHRoYXQgb3ducyB0aGUgYXR0YWNobWVudC5cbiAgICogQHBhcmFtIGF0dGFjaG1lbnRJZCAtIElkZW50aWZpZXIgb2YgdGhlIGF0dGFjaG1lbnQgYmxvYiB0byBkb3dubG9hZC5cbiAgICogQHJldHVybnMgUHJvbWlzZSByZXNvbHZpbmcgdG8gYW4gYXR0YWNobWVudCBCbG9iLlxuICAgKiBAdGhyb3dzIEFwaUVycm9yIHdoZW4gdGhlIHNlcnZlciByZXNwb25kcyB3aXRoIGFuIGVycm9yLlxuICAgKiBAdGhyb3dzIE5ldHdvcmtFcnJvciB3aGVuIHRoZSByZXF1ZXN0IGZhaWxzIHRvIHJlYWNoIHRoZSBzZXJ2ZXIuXG4gICAqL1xuICBhc3luYyBnZXRBdHRhY2htZW50KGNhcmRJZDogc3RyaW5nLCBhdHRhY2htZW50SWQ6IHN0cmluZyk6IFByb21pc2U8QmxvYj4ge1xuICAgIGNvbnN0IHVybCA9IHRoaXMuYnVpbGRVcmwoYC9jYXJkcy8ke2NhcmRJZH0vYXR0YWNobWVudHMvJHthdHRhY2htZW50SWR9YCk7XG4gICAgcmV0dXJuIHRoaXMucmVxdWVzdChhc3luYyAoKSA9PiB7XG4gICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGZldGNoKHVybCwge1xuICAgICAgICBoZWFkZXJzOiB0aGlzLmdldEhlYWRlcnMoKSxcbiAgICAgICAgc2lnbmFsOiB0aGlzLmdldFRpbWVvdXRTaWduYWwoKVxuICAgICAgfSk7XG4gICAgICBpZiAoIXJlc3BvbnNlLm9rKSB0aHJvdyByZXNwb25zZTtcbiAgICAgIHJldHVybiByZXNwb25zZS5ibG9iKCk7XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogTGlzdHMgYXR0YWNobWVudHMgZm9yIGEgY2FyZC5cbiAgICpcbiAgICogQHBhcmFtIGNhcmRJZCAtIElkZW50aWZpZXIgb2YgdGhlIGNhcmQgd2hvc2UgYXR0YWNobWVudHMgc2hvdWxkIGJlIGxpc3RlZC5cbiAgICogQHJldHVybnMgUHJvbWlzZSByZXNvbHZpbmcgdG8gYXR0YWNobWVudCBtZXRhZGF0YS5cbiAgICogQHRocm93cyBBcGlFcnJvciB3aGVuIHRoZSBzZXJ2ZXIgcmVzcG9uZHMgd2l0aCBhbiBlcnJvci5cbiAgICogQHRocm93cyBOZXR3b3JrRXJyb3Igd2hlbiB0aGUgcmVxdWVzdCBmYWlscyB0byByZWFjaCB0aGUgc2VydmVyLlxuICAgKi9cbiAgYXN5bmMgbGlzdEF0dGFjaG1lbnRzKGNhcmRJZDogc3RyaW5nKTogUHJvbWlzZTxBdHRhY2htZW50UmVzcG9uc2VbXT4ge1xuICAgIGNvbnN0IHVybCA9IHRoaXMuYnVpbGRVcmwoYC9jYXJkcy8ke2NhcmRJZH0vYXR0YWNobWVudHNgKTtcbiAgICByZXR1cm4gdGhpcy5yZXF1ZXN0KCgpID0+IHRoaXMuZ2V0SHR0cENsaWVudCgpLmdldDxBdHRhY2htZW50UmVzcG9uc2VbXT4odXJsKSk7XG4gIH1cblxuICAvLyAtLS0gVGltZWxpbmUgT3BlcmF0aW9ucyAtLS1cblxuICAvKipcbiAgICogR2V0cyB0aW1lbGluZSBlbnRyaWVzIGZvciBhIGNhcmQgd2l0aCBvcHRpb25hbCBwYWdpbmF0aW9uLlxuICAgKlxuICAgKiBAcGFyYW0gY2FyZElkIC0gSWRlbnRpZmllciBvZiB0aGUgY2FyZCB3aG9zZSB0aW1lbGluZSBlbnRyaWVzIHNob3VsZCBiZSByZXR1cm5lZC5cbiAgICogQHBhcmFtIG9wdGlvbnMgLSBPcHRpb25hbCBwYWdpbmF0aW9uIGNvbnRyb2xzLlxuICAgKiBAcmV0dXJucyBQcm9taXNlIHJlc29sdmluZyB0byB0aW1lbGluZSBlbnRyaWVzLlxuICAgKiBAdGhyb3dzIEFwaUVycm9yIHdoZW4gdGhlIHNlcnZlciByZXNwb25kcyB3aXRoIGFuIGVycm9yLlxuICAgKiBAdGhyb3dzIE5ldHdvcmtFcnJvciB3aGVuIHRoZSByZXF1ZXN0IGZhaWxzIHRvIHJlYWNoIHRoZSBzZXJ2ZXIuXG4gICAqL1xuICBhc3luYyBnZXRUaW1lbGluZShjYXJkSWQ6IHN0cmluZywgb3B0aW9ucz86IFRpbWVsaW5lT3B0aW9ucyk6IFByb21pc2U8VGltZWxpbmVJdGVtW10+IHtcbiAgICBjb25zdCB1cmwgPSB0aGlzLmJ1aWxkVXJsKGAvY2FyZHMvJHtjYXJkSWR9L3RpbWVsaW5lYCwge1xuICAgICAgYmVmb3JlOiBvcHRpb25zPy5iZWZvcmUsXG4gICAgICBsaW1pdDogb3B0aW9ucz8ubGltaXRcbiAgICB9KTtcbiAgICByZXR1cm4gdGhpcy5yZXF1ZXN0KCgpID0+IHRoaXMuZ2V0SHR0cENsaWVudCgpLmdldDxUaW1lbGluZUl0ZW1bXT4odXJsKSk7XG4gIH1cblxuICAvLyAtLS0gUGxhbiBPcGVyYXRpb25zIC0tLVxuXG4gIC8qKlxuICAgKiBHZXRzIHRoZSBwbGFuIGRvY3VtZW50IGZvciBhIGNhcmQgYXMgbWFya2Rvd24uXG4gICAqXG4gICAqIEBwYXJhbSBjYXJkSWQgLSBJZGVudGlmaWVyIG9mIHRoZSBjYXJkIHdob3NlIHBsYW4gbWFya2Rvd24gc2hvdWxkIGJlIHJldHVybmVkLlxuICAgKiBAcmV0dXJucyBQcm9taXNlIHJlc29sdmluZyB0byBwbGFuIG1hcmtkb3duLlxuICAgKiBAdGhyb3dzIEFwaUVycm9yIHdoZW4gdGhlIHNlcnZlciByZXNwb25kcyB3aXRoIGFuIGVycm9yLlxuICAgKiBAdGhyb3dzIE5ldHdvcmtFcnJvciB3aGVuIHRoZSByZXF1ZXN0IGZhaWxzIHRvIHJlYWNoIHRoZSBzZXJ2ZXIuXG4gICAqL1xuICBhc3luYyBnZXRQbGFuKGNhcmRJZDogc3RyaW5nKTogUHJvbWlzZTxzdHJpbmc+IHtcbiAgICBjb25zdCB1cmwgPSB0aGlzLmJ1aWxkVXJsKGAvY2FyZHMvJHtjYXJkSWR9L3BsYW5gKTtcbiAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IHRoaXMucmVxdWVzdCgoKSA9PiB0aGlzLmdldEh0dHBDbGllbnQoKS5nZXQ8eyBjb250ZW50OiBzdHJpbmcgfT4odXJsKSk7XG4gICAgcmV0dXJuIHJlc3BvbnNlLmNvbnRlbnQ7XG4gIH1cblxuICAvKipcbiAgICogVXBkYXRlcyB0aGUgcGxhbiBkb2N1bWVudCBmb3IgYSBjYXJkLlxuICAgKlxuICAgKiBAcGFyYW0gY2FyZElkIC0gSWRlbnRpZmllciBvZiB0aGUgY2FyZCB3aG9zZSBwbGFuIG1hcmtkb3duIHNob3VsZCBiZSB1cGRhdGVkLlxuICAgKiBAcGFyYW0gY29udGVudCAtIFBsYW4gbWFya2Rvd24gY29udGVudC5cbiAgICogQHJldHVybnMgUHJvbWlzZSByZXNvbHZpbmcgd2hlbiB0aGUgcGxhbiBpcyBzYXZlZC5cbiAgICogQHRocm93cyBBcGlFcnJvciB3aGVuIHRoZSBzZXJ2ZXIgcmVqZWN0cyB0aGUgdXBkYXRlLlxuICAgKiBAdGhyb3dzIE5ldHdvcmtFcnJvciB3aGVuIHRoZSByZXF1ZXN0IGZhaWxzIHRvIHJlYWNoIHRoZSBzZXJ2ZXIuXG4gICAqIEBkZXByZWNhdGVkIFVzZSBkaXJlY3QgZ2l0IG9wZXJhdGlvbnMgaW5zdGVhZC4gVGhpcyBlbmRwb2ludCB3aWxsIGJlIHJlbW92ZWQuXG4gICAqL1xuICBhc3luYyB1cGRhdGVQbGFuKGNhcmRJZDogc3RyaW5nLCBjb250ZW50OiBzdHJpbmcpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zdCB1cmwgPSB0aGlzLmJ1aWxkVXJsKGAvY2FyZHMvJHtjYXJkSWR9L3BsYW5gKTtcbiAgICByZXR1cm4gdGhpcy5yZXF1ZXN0KCgpID0+IHRoaXMuZ2V0SHR0cENsaWVudCgpLnB1dDx2b2lkPih1cmwsIGNvbnRlbnQpKTtcbiAgfVxuXG4gIC8vIC0tLSBHYXRlIE9wZXJhdGlvbnMgLS0tXG5cbiAgLyoqXG4gICAqIEFwcHJvdmVzIGEgZ2F0ZSBmb3IgYSBjYXJkLlxuICAgKlxuICAgKiBAcGFyYW0gY2FyZElkIC0gSWRlbnRpZmllciBvZiB0aGUgY2FyZCB3aG9zZSBnYXRlIHN0YXRlIHNob3VsZCBiZSB1cGRhdGVkLlxuICAgKiBAcGFyYW0gZ2F0ZU5hbWUgLSBHYXRlIG5hbWUgdG8gYXBwcm92ZS5cbiAgICogQHJldHVybnMgUHJvbWlzZSByZXNvbHZpbmcgdG8gZ2F0ZSBhcHByb3ZhbCBtZXRhZGF0YS5cbiAgICogQHRocm93cyBBcGlFcnJvciB3aGVuIHRoZSBzZXJ2ZXIgcmVqZWN0cyB0aGUgYXBwcm92YWwuXG4gICAqIEB0aHJvd3MgTmV0d29ya0Vycm9yIHdoZW4gdGhlIHJlcXVlc3QgZmFpbHMgdG8gcmVhY2ggdGhlIHNlcnZlci5cbiAgICogQGRlcHJlY2F0ZWQgVXNlIGRpcmVjdCBnaXQgb3BlcmF0aW9ucyBpbnN0ZWFkLiBUaGlzIGVuZHBvaW50IHdpbGwgYmUgcmVtb3ZlZC5cbiAgICovXG4gIGFzeW5jIGFwcHJvdmVHYXRlKGNhcmRJZDogc3RyaW5nLCBnYXRlTmFtZTogJ3BsYW4nIHwgJ3JldmlldycpOiBQcm9taXNlPEdhdGVBcHByb3ZhbFJlc3BvbnNlPiB7XG4gICAgY29uc3QgdXJsID0gdGhpcy5idWlsZFVybChgL2NhcmRzLyR7Y2FyZElkfS9nYXRlcy8ke2dhdGVOYW1lfS9hcHByb3ZlYCk7XG4gICAgcmV0dXJuIHRoaXMucmVxdWVzdCgoKSA9PiB0aGlzLmdldEh0dHBDbGllbnQoKS5wb3N0PEdhdGVBcHByb3ZhbFJlc3BvbnNlPih1cmwsIHVuZGVmaW5lZCkpO1xuICB9XG5cbiAgLy8gLS0tIENvbW1pdCBPcGVyYXRpb25zIC0tLVxuXG4gIC8qKlxuICAgKiBHZXRzIGFsbCBjb21taXRzIGFzc29jaWF0ZWQgd2l0aCBhIGNhcmQuXG4gICAqXG4gICAqIEBwYXJhbSBjYXJkSWQgLSBJZGVudGlmaWVyIG9mIHRoZSBjYXJkIHdob3NlIGNvbW1pdHMgc2hvdWxkIGJlIHJldHVybmVkLlxuICAgKiBAcmV0dXJucyBQcm9taXNlIHJlc29sdmluZyB0byBjb21taXQgbWV0YWRhdGEuXG4gICAqIEB0aHJvd3MgQXBpRXJyb3Igd2hlbiB0aGUgc2VydmVyIHJlc3BvbmRzIHdpdGggYW4gZXJyb3IuXG4gICAqIEB0aHJvd3MgTmV0d29ya0Vycm9yIHdoZW4gdGhlIHJlcXVlc3QgZmFpbHMgdG8gcmVhY2ggdGhlIHNlcnZlci5cbiAgICovXG4gIGFzeW5jIGdldENvbW1pdHMoY2FyZElkOiBzdHJpbmcpOiBQcm9taXNlPENvbW1pdEluZm9bXT4ge1xuICAgIGNvbnN0IHVybCA9IHRoaXMuYnVpbGRVcmwoYC9jYXJkcy8ke2NhcmRJZH0vY29tbWl0c2ApO1xuICAgIHJldHVybiB0aGlzLnJlcXVlc3QoKCkgPT4gdGhpcy5nZXRIdHRwQ2xpZW50KCkuZ2V0PENvbW1pdEluZm9bXT4odXJsKSk7XG4gIH1cblxuICAvKipcbiAgICogQWRkcyBhIGNvbW1pdCB0byBhIGNhcmQuXG4gICAqXG4gICAqIEBwYXJhbSBjYXJkSWQgLSBJZGVudGlmaWVyIG9mIHRoZSBjYXJkIHRvIGFzc29jaWF0ZSB3aXRoIHRoZSBjb21taXQgU0hBLlxuICAgKiBAcGFyYW0gc2hhIC0gR2l0IGNvbW1pdCBzaGEuXG4gICAqIEByZXR1cm5zIFByb21pc2UgcmVzb2x2aW5nIHRvIGNvbW1pdCBtZXRhZGF0YS5cbiAgICogQHRocm93cyBBcGlFcnJvciB3aGVuIHRoZSBzZXJ2ZXIgcmVqZWN0cyB0aGUgdXBkYXRlLlxuICAgKiBAdGhyb3dzIE5ldHdvcmtFcnJvciB3aGVuIHRoZSByZXF1ZXN0IGZhaWxzIHRvIHJlYWNoIHRoZSBzZXJ2ZXIuXG4gICAqL1xuICBhc3luYyBhZGRDb21taXQoY2FyZElkOiBzdHJpbmcsIHNoYTogc3RyaW5nKTogUHJvbWlzZTxDb21taXRJbmZvPiB7XG4gICAgY29uc3QgdXJsID0gdGhpcy5idWlsZFVybChgL2NhcmRzLyR7Y2FyZElkfS9jb21taXRzYCk7XG4gICAgcmV0dXJuIHRoaXMucmVxdWVzdCgoKSA9PiB0aGlzLmdldEh0dHBDbGllbnQoKS5wb3N0PENvbW1pdEluZm8+KHVybCwgeyBzaGEgfSkpO1xuICB9XG5cbiAgLyoqXG4gICAqIFJlbW92ZXMgYSBjb21taXQgZnJvbSBhIGNhcmQuXG4gICAqXG4gICAqIEBwYXJhbSBjYXJkSWQgLSBJZGVudGlmaWVyIG9mIHRoZSBjYXJkIHRvIGRldGFjaCBmcm9tIHRoZSBjb21taXQgU0hBLlxuICAgKiBAcGFyYW0gc2hhIC0gR2l0IGNvbW1pdCBzaGEuXG4gICAqIEByZXR1cm5zIFByb21pc2UgcmVzb2x2aW5nIHdoZW4gcmVtb3ZhbCBpcyBjb21wbGV0ZS5cbiAgICogQHRocm93cyBBcGlFcnJvciB3aGVuIHRoZSBzZXJ2ZXIgcmVqZWN0cyB0aGUgdXBkYXRlLlxuICAgKiBAdGhyb3dzIE5ldHdvcmtFcnJvciB3aGVuIHRoZSByZXF1ZXN0IGZhaWxzIHRvIHJlYWNoIHRoZSBzZXJ2ZXIuXG4gICAqL1xuICBhc3luYyByZW1vdmVDb21taXQoY2FyZElkOiBzdHJpbmcsIHNoYTogc3RyaW5nKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc3QgdXJsID0gdGhpcy5idWlsZFVybChgL2NhcmRzLyR7Y2FyZElkfS9jb21taXRzLyR7c2hhfWApO1xuICAgIHJldHVybiB0aGlzLnJlcXVlc3QoKCkgPT4gdGhpcy5nZXRIdHRwQ2xpZW50KCkuZGVsZXRlKHVybCkpO1xuICB9XG5cbiAgLy8gLS0tIEJyYW5jaCBPcGVyYXRpb25zIC0tLVxuXG4gIC8qKlxuICAgKiBHZXRzIGFsbCBicmFuY2hlcyB0cmFja2VkIG9uIGEgY2FyZC5cbiAgICpcbiAgICogQHBhcmFtIGNhcmRJZCAtIFVuaXF1ZSBpZGVudGlmaWVyIG9mIHRoZSBjYXJkIHdob3NlIGJyYW5jaGVzIHRvIHJldHJpZXZlLlxuICAgKiBAcGFyYW0gb3B0aW9ucyAtIE9wdGlvbmFsIHF1ZXJ5IHBhcmFtZXRlcnMuXG4gICAqIEBwYXJhbSBvcHRpb25zLndvcmtzcGFjZVBhdGggLSBXb3Jrc3BhY2UgcGF0aCBmb3IgY29tcHV0aW5nIGlzTWVyZ2VkIGFuZCBjb21taXQgY29udGFpbm1lbnQuXG4gICAqIEByZXR1cm5zIFByb21pc2UgcmVzb2x2aW5nIHRvIGJyYW5jaGVzIHJlc3BvbnNlLlxuICAgKi9cbiAgYXN5bmMgZ2V0QnJhbmNoZXMoY2FyZElkOiBzdHJpbmcsIG9wdGlvbnM/OiB7IHdvcmtzcGFjZVBhdGg/OiBzdHJpbmcgfSk6IFByb21pc2U8QnJhbmNoZXNSZXNwb25zZT4ge1xuICAgIGNvbnN0IHVybCA9IHRoaXMuYnVpbGRVcmwoYC9jYXJkcy8ke2NhcmRJZH0vYnJhbmNoZXNgLCB7XG4gICAgICB3b3Jrc3BhY2VQYXRoOiBvcHRpb25zPy53b3Jrc3BhY2VQYXRoXG4gICAgfSk7XG4gICAgcmV0dXJuIHRoaXMucmVxdWVzdCgoKSA9PiB0aGlzLmdldEh0dHBDbGllbnQoKS5nZXQ8QnJhbmNoZXNSZXNwb25zZT4odXJsKSk7XG4gIH1cblxuICAvKipcbiAgICogQWRkcyBhIGJyYW5jaCB0byBhIGNhcmQuXG4gICAqXG4gICAqIEBwYXJhbSBjYXJkSWQgLSBVbmlxdWUgaWRlbnRpZmllciBvZiB0aGUgY2FyZCB0byBhZGQgdGhlIGJyYW5jaCB0by5cbiAgICogQHBhcmFtIGRhdGEgLSBCcmFuY2ggZGF0YSBpbmNsdWRpbmcgbmFtZSBhbmQgb3B0aW9uYWwgd29ya3RyZWUgcGF0aC5cbiAgICogQHJldHVybnMgUHJvbWlzZSByZXNvbHZpbmcgd2hlbiB0aGUgYnJhbmNoIGlzIGFkZGVkLlxuICAgKi9cbiAgYXN5bmMgYWRkQnJhbmNoKGNhcmRJZDogc3RyaW5nLCBkYXRhOiBBZGRCcmFuY2hSZXF1ZXN0KTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc3QgdXJsID0gdGhpcy5idWlsZFVybChgL2NhcmRzLyR7Y2FyZElkfS9icmFuY2hlc2ApO1xuICAgIGF3YWl0IHRoaXMucmVxdWVzdCgoKSA9PiB0aGlzLmdldEh0dHBDbGllbnQoKS5wb3N0PHVua25vd24+KHVybCwgZGF0YSkpO1xuICB9XG5cbiAgLyoqXG4gICAqIFJlbW92ZXMgYSBicmFuY2ggZnJvbSBhIGNhcmQuXG4gICAqXG4gICAqIEBwYXJhbSBjYXJkSWQgLSBVbmlxdWUgaWRlbnRpZmllciBvZiB0aGUgY2FyZCB0byByZW1vdmUgdGhlIGJyYW5jaCBmcm9tLlxuICAgKiBAcGFyYW0gbmFtZSAtIEJyYW5jaCBuYW1lIHRvIHJlbW92ZSAod2lsbCBiZSBVUkwtZW5jb2RlZCkuXG4gICAqIEByZXR1cm5zIFByb21pc2UgcmVzb2x2aW5nIHdoZW4gdGhlIGJyYW5jaCBpcyByZW1vdmVkLlxuICAgKi9cbiAgYXN5bmMgcmVtb3ZlQnJhbmNoKGNhcmRJZDogc3RyaW5nLCBuYW1lOiBzdHJpbmcpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zdCB1cmwgPSB0aGlzLmJ1aWxkVXJsKGAvY2FyZHMvJHtjYXJkSWR9L2JyYW5jaGVzLyR7ZW5jb2RlVVJJQ29tcG9uZW50KG5hbWUpfWApO1xuICAgIHJldHVybiB0aGlzLnJlcXVlc3QoKCkgPT4gdGhpcy5nZXRIdHRwQ2xpZW50KCkuZGVsZXRlKHVybCkpO1xuICB9XG5cbiAgLy8gLS0tIFRhZyBPcGVyYXRpb25zIC0tLVxuXG4gIC8qKlxuICAgKiBHZXRzIGFsbCBhdmFpbGFibGUgdGFncy5cbiAgICpcbiAgICogQHJldHVybnMgUHJvbWlzZSByZXNvbHZpbmcgdG8gdGFnIHN0cmluZ3MuXG4gICAqIEB0aHJvd3MgQXBpRXJyb3Igd2hlbiB0aGUgc2VydmVyIHJlc3BvbmRzIHdpdGggYW4gZXJyb3IuXG4gICAqIEB0aHJvd3MgTmV0d29ya0Vycm9yIHdoZW4gdGhlIHJlcXVlc3QgZmFpbHMgdG8gcmVhY2ggdGhlIHNlcnZlci5cbiAgICovXG4gIGFzeW5jIGdldFRhZ3MoKTogUHJvbWlzZTxzdHJpbmdbXT4ge1xuICAgIGNvbnN0IHVybCA9IHRoaXMuYnVpbGRVcmwoJy90YWdzJywge1xuICAgICAgd29ya3NwYWNlUGF0aDogdGhpcy5vcHRpb25zLndvcmtzcGFjZVBhdGhcbiAgICB9KTtcbiAgICByZXR1cm4gdGhpcy5yZXF1ZXN0KCgpID0+IHRoaXMuZ2V0SHR0cENsaWVudCgpLmdldDxzdHJpbmdbXT4odXJsKSk7XG4gIH1cblxuICAvLyAtLS0gRW52aXJvbm1lbnQgT3BlcmF0aW9ucyAtLS1cblxuICAvKipcbiAgICogRmV0Y2hlcyBhdmFpbGFibGUgYWdlbnQgZW52aXJvbm1lbnRzLlxuICAgKlxuICAgKiBAcmV0dXJucyBQcm9taXNlIHJlc29sdmluZyB0byBlbnZpcm9ubWVudCBtZXRhZGF0YS5cbiAgICogQHRocm93cyBBcGlFcnJvciB3aGVuIHRoZSBzZXJ2ZXIgcmVzcG9uZHMgd2l0aCBhbiBlcnJvci5cbiAgICogQHRocm93cyBOZXR3b3JrRXJyb3Igd2hlbiB0aGUgcmVxdWVzdCBmYWlscyB0byByZWFjaCB0aGUgc2VydmVyLlxuICAgKi9cbiAgYXN5bmMgZ2V0RW52aXJvbm1lbnRzKCk6IFByb21pc2U8QXJyYXk8eyBuYW1lOiBzdHJpbmc7IGRlc2NyaXB0aW9uPzogc3RyaW5nIH0+PiB7XG4gICAgY29uc3QgdXJsID0gdGhpcy5idWlsZFVybCgnL2Vudmlyb25tZW50cycpO1xuICAgIHJldHVybiB0aGlzLnJlcXVlc3QoKCkgPT4gdGhpcy5nZXRIdHRwQ2xpZW50KCkuZ2V0PEFycmF5PHsgbmFtZTogc3RyaW5nOyBkZXNjcmlwdGlvbj86IHN0cmluZyB9Pj4odXJsKSk7XG4gIH1cblxuICAvLyAtLS0gVHlwZWQgRmlsZSBPcGVyYXRpb25zIC0tLVxuXG4gIC8qKlxuICAgKiBTdWJtaXRzIGFuIGFkYXB0aXZlIGNhcmQgYWN0aW9uIGJ5IHdyaXRpbmcgYW4gYGFkYXB0aXZlLWNhcmQtc3VibWlzc2lvbmAgdHlwZWQgZmlsZS5cbiAgICpcbiAgICogQHBhcmFtIGNhcmRJZCAtIFRoZSBjYXJkIGNvbnRhaW5pbmcgdGhlIGFkYXB0aXZlIGNhcmQuXG4gICAqIEBwYXJhbSBhY3Rpb25JZCAtIFRoZSBhY3Rpb24gSUQgZnJvbSB0aGUgYWRhcHRpdmUgY2FyZCBzdWJtaXQgYWN0aW9uLlxuICAgKiBAcGFyYW0gZGF0YSAtIFRoZSBmb3JtIGRhdGEgY29sbGVjdGVkIGJ5IHRoZSBhZGFwdGl2ZSBjYXJkLlxuICAgKiBAcmV0dXJucyBQcm9taXNlIHJlc29sdmluZyB3aGVuIHRoZSBzdWJtaXNzaW9uIGlzIHBlcnNpc3RlZC5cbiAgICogQHRocm93cyBBcGlFcnJvciB3aGVuIHRoZSBzZXJ2ZXIgcmVqZWN0cyB0aGUgc3VibWlzc2lvbiAoZS5nLiB2YWxpZGF0aW9uIGZhaWx1cmUpLlxuICAgKiBAdGhyb3dzIE5ldHdvcmtFcnJvciB3aGVuIHRoZSByZXF1ZXN0IGZhaWxzIHRvIHJlYWNoIHRoZSBzZXJ2ZXIuXG4gICAqL1xuICBhc3luYyBzdWJtaXRDYXJkQWN0aW9uKGNhcmRJZDogc3RyaW5nLCBhY3Rpb25JZDogc3RyaW5nLCBkYXRhOiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPik6IFByb21pc2U8dm9pZD4ge1xuICAgIGNvbnN0IGZpbGVOYW1lID0gYCR7YWN0aW9uSWR9LSR7RGF0ZS5ub3coKX0uanNvbmA7XG4gICAgY29uc3QgdXJsID0gdGhpcy5idWlsZFVybChgL2NhcmRzLyR7Y2FyZElkfS9hZGFwdGl2ZS1jYXJkLXN1Ym1pc3Npb24vJHtlbmNvZGVVUklDb21wb25lbnQoZmlsZU5hbWUpfWApO1xuICAgIGNvbnN0IGJvZHkgPSB7IGNhcmRJZCwgYWN0aW9uSWQsIGRhdGEgfTtcbiAgICBhd2FpdCB0aGlzLnJlcXVlc3QoKCkgPT4gdGhpcy5nZXRIdHRwQ2xpZW50KCkucHV0PHVua25vd24+KHVybCwgYm9keSkpO1xuICB9XG5cbiAgLy8gLS0tIFR5cGUgU2NoZW1hIE9wZXJhdGlvbnMgLS0tXG5cbiAgLyoqXG4gICAqIEdldHMgdHlwZSBzY2hlbWFzIGFuZCBkZXNjcmlwdGlvbnMgZm9yIGEgY2FyZCdzIGVudmlyb25tZW50LlxuICAgKlxuICAgKiBSZXR1cm5zIG1ldGFkYXRhIGFib3V0IGVhY2ggcmVnaXN0ZXJlZCB0eXBlIGluIHRoZSBjYXJkJ3MgZW52aXJvbm1lbnQsXG4gICAqIGluY2x1ZGluZyB2ZXJzaW9uLCBzY2hlbWEsIGFuZCBkZXNjcmlwdGlvbi4gQ29tbWFuZCBkZXRhaWxzIGFyZSBleGNsdWRlZC5cbiAgICpcbiAgICogQHBhcmFtIGNhcmRJZCAtIElkZW50aWZpZXIgb2YgdGhlIGNhcmQgd2hvc2UgdHlwZSBzY2hlbWEgbWV0YWRhdGEgc2hvdWxkIGJlIGZldGNoZWQuXG4gICAqIEByZXR1cm5zIFByb21pc2UgcmVzb2x2aW5nIHRvIHR5cGUgc2NoZW1hIGluZm9ybWF0aW9uLlxuICAgKiBAdGhyb3dzIEFwaUVycm9yIHdoZW4gdGhlIHNlcnZlciByZXNwb25kcyB3aXRoIGFuIGVycm9yLlxuICAgKiBAdGhyb3dzIE5ldHdvcmtFcnJvciB3aGVuIHRoZSByZXF1ZXN0IGZhaWxzIHRvIHJlYWNoIHRoZSBzZXJ2ZXIuXG4gICAqL1xuICBhc3luYyBnZXRUeXBlU2NoZW1hcyhjYXJkSWQ6IHN0cmluZyk6IFByb21pc2U8VHlwZVNjaGVtYXNSZXNwb25zZT4ge1xuICAgIGNvbnN0IHVybCA9IHRoaXMuYnVpbGRVcmwoYC9jYXJkcy8ke2NhcmRJZH0vc2NoZW1hYCk7XG4gICAgcmV0dXJuIHRoaXMucmVxdWVzdCgoKSA9PiB0aGlzLmdldEh0dHBDbGllbnQoKS5nZXQ8VHlwZVNjaGVtYXNSZXNwb25zZT4odXJsKSk7XG4gIH1cblxuICAvLyAtLS0gU3RyZWFtIE9wZXJhdGlvbnMgLS0tXG5cbiAgLyoqXG4gICAqIExpc3RzIGFsbCBzdHJlYW1zIGF0dGFjaGVkIHRvIGEgY2FyZCwgc29ydGVkIGJ5IGNyZWF0aW9uIHRpbWUuXG4gICAqXG4gICAqIEBwYXJhbSBjYXJkSWQgLSBDYXJkIElEIHRvIHF1ZXJ5LlxuICAgKiBAcmV0dXJucyBTdHJlYW0gbWV0YWRhdGEgYXJyYXkgKG1heSBiZSBlbXB0eSkuXG4gICAqIEB0aHJvd3MgQXBpRXJyb3Igd2hlbiB0aGUgc2VydmVyIHJlc3BvbmRzIHdpdGggYW4gZXJyb3IgKGUuZy4sIDQwNCBmb3IgdW5rbm93biBjYXJkKS5cbiAgICogQHRocm93cyBOZXR3b3JrRXJyb3Igd2hlbiB0aGUgcmVxdWVzdCBmYWlscyB0byByZWFjaCB0aGUgc2VydmVyLlxuICAgKi9cbiAgYXN5bmMgbGlzdFN0cmVhbXMoY2FyZElkOiBzdHJpbmcpOiBQcm9taXNlPFN0cmVhbU1ldGFbXT4ge1xuICAgIGNvbnN0IHVybCA9IHRoaXMuYnVpbGRVcmwoYC9jYXJkcy8ke2NhcmRJZH0vc3RyZWFtc2ApO1xuICAgIHJldHVybiB0aGlzLnJlcXVlc3QoKCkgPT4gdGhpcy5nZXRIdHRwQ2xpZW50KCkuZ2V0PFN0cmVhbU1ldGFbXT4odXJsKSk7XG4gIH1cblxuICAvKipcbiAgICogUmV0cmlldmVzIGEgc3RyZWFtJ3MgbWV0YWRhdGEgYW5kIGFsbCByYXcgbGluZXMuXG4gICAqXG4gICAqIFRoZSBgc3RyZWFtVHlwZWAgYW5kIGBmaWxlbmFtZWAgYXJlIFVSSS1lbmNvZGVkIGF1dG9tYXRpY2FsbHkuIEZvciBjb21wbGV0ZWRcbiAgICogc3RyZWFtcyB0aGUgcmV0dXJuZWQgYGxpbmVzYCBhcnJheSBpcyB0aGUgZnVsbCBjb250ZW50OyBmb3IgYWN0aXZlIHN0cmVhbXMgaXRcbiAgICogaXMgYSBzbmFwc2hvdCB0aGF0IG1heSBncm93IHdoaWxlIHRoZSBjYWxsZXIgcHJvY2Vzc2VzIGl0LlxuICAgKlxuICAgKiBAcGFyYW0gY2FyZElkIC0gSWRlbnRpZmllciBvZiB0aGUgY2FyZCB0aGF0IG93bnMgdGhlIHJlcXVlc3RlZCBzdHJlYW0uXG4gICAqIEBwYXJhbSBzdHJlYW1UeXBlIC0gU3RyZWFtIHR5cGUga2V5IChlLmcuLCBgXCJjbGF1ZGUtY29kZS1zZXNzaW9uXCJgKS5cbiAgICogQHBhcmFtIGZpbGVuYW1lIC0gU3RyZWFtIGZpbGVuYW1lIChlLmcuLCBgXCJzZXNzaW9uLmxvZ1wiYCkuXG4gICAqIEByZXR1cm5zIE1ldGFkYXRhIGFuZCBjb250ZW50IGxpbmVzLlxuICAgKiBAdGhyb3dzIEFwaUVycm9yIG9uIDQwNCAodW5rbm93biBjYXJkIG9yIHN0cmVhbSkgb3Igb3RoZXIgc2VydmVyIGVycm9ycy5cbiAgICogQHRocm93cyBOZXR3b3JrRXJyb3Igd2hlbiB0aGUgcmVxdWVzdCBmYWlscyB0byByZWFjaCB0aGUgc2VydmVyLlxuICAgKi9cbiAgYXN5bmMgZ2V0U3RyZWFtKFxuICAgIGNhcmRJZDogc3RyaW5nLFxuICAgIHN0cmVhbVR5cGU6IHN0cmluZyxcbiAgICBmaWxlbmFtZTogc3RyaW5nXG4gICk6IFByb21pc2U8eyBtZXRhOiBTdHJlYW1NZXRhOyBsaW5lczogc3RyaW5nW10gfT4ge1xuICAgIGNvbnN0IHVybCA9IHRoaXMuYnVpbGRVcmwoXG4gICAgICBgL2NhcmRzLyR7Y2FyZElkfS9zdHJlYW1zLyR7ZW5jb2RlVVJJQ29tcG9uZW50KHN0cmVhbVR5cGUpfS8ke2VuY29kZVVSSUNvbXBvbmVudChmaWxlbmFtZSl9YFxuICAgICk7XG4gICAgcmV0dXJuIHRoaXMucmVxdWVzdCgoKSA9PiB0aGlzLmdldEh0dHBDbGllbnQoKS5nZXQ8eyBtZXRhOiBTdHJlYW1NZXRhOyBsaW5lczogc3RyaW5nW10gfT4odXJsKSk7XG4gIH1cblxuICAvKipcbiAgICogT3BlbnMgYSBjaHVua2VkIEpTT05MIHN0cmVhbSB0byB0aGUgc2VydmVyIGFuZCByZXR1cm5zIGEgd3JpdGVyLlxuICAgKlxuICAgKiBUaGUgd3JpdGVyIHNlbmRzIGVhY2ggbGluZSBpbiByZWFsLXRpbWUgb3ZlciBhIHNpbmdsZSBIVFRQIFBPU1QgdXNpbmcgYVxuICAgKiBgUmVhZGFibGVTdHJlYW1gIGJvZHkuIENhbGwge0BsaW5rIFN0cmVhbVdyaXRlci5jbG9zZX0gd2hlbiB0aGUgcHJvZHVjZXJcbiAgICogaXMgZmluaXNoZWQgdG8gZW5kIHRoZSByZXF1ZXN0IGFuZCByZXRyaWV2ZSB0aGUgc2VydmVyJ3Mgc3VtbWFyeS5cbiAgICpcbiAgICogQHBhcmFtIGNhcmRJZCAtIENhcmQgSUQgdG8gYXR0YWNoIHRoZSBzdHJlYW0gdG8uXG4gICAqIEBwYXJhbSBzdHJlYW1UeXBlIC0gU3RyZWFtIHR5cGUga2V5IGZyb20gc2V0dGluZ3MuanNvbiAoZS5nLiwgYFwiY2xhdWRlLWNvZGUtc2Vzc2lvblwiYCkuXG4gICAqIEBwYXJhbSBmaWxlbmFtZSAtIFN0cmVhbSBmaWxlbmFtZSAoZS5nLiwgYFwic2Vzc2lvbi1hYmMuanNvbmxcImApLlxuICAgKiBAcGFyYW0gb3B0aW9ucyAtIE9wdGlvbmFsIHRpdGxlIGFuZCBzZXNzaW9uIElEIG1ldGFkYXRhLlxuICAgKiBAcmV0dXJucyBBIHtAbGluayBTdHJlYW1Xcml0ZXJ9IGZvciBwdXNoaW5nIGxpbmVzIGFuZCBjbG9zaW5nIHRoZSBzdHJlYW0uXG4gICAqXG4gICAqIEBleGFtcGxlXG4gICAqIGBgYHR5cGVzY3JpcHRcbiAgICogY29uc3Qgc3RyZWFtID0gY2xpZW50Lm9wZW5TdHJlYW0oY2FyZElkLCAnY2xhdWRlLWNvZGUtc2Vzc2lvbicsICdydW4uanNvbmwnKTtcbiAgICogc3RyZWFtLndyaXRlKEpTT04uc3RyaW5naWZ5KHsgdHlwZTogJ2luaXQnIH0pKTtcbiAgICogc3RyZWFtLndyaXRlKEpTT04uc3RyaW5naWZ5KHsgdHlwZTogJ3Jlc3VsdCcgfSkpO1xuICAgKiBjb25zdCByZXN1bHQgPSBhd2FpdCBzdHJlYW0uY2xvc2UoKTtcbiAgICogYGBgXG4gICAqL1xuICBvcGVuU3RyZWFtKGNhcmRJZDogc3RyaW5nLCBzdHJlYW1UeXBlOiBzdHJpbmcsIGZpbGVuYW1lOiBzdHJpbmcsIG9wdGlvbnM/OiBTdHJlYW1Xcml0ZXJPcHRpb25zKTogU3RyZWFtV3JpdGVyIHtcbiAgICBjb25zdCBlbmNvZGVyID0gbmV3IFRleHRFbmNvZGVyKCk7XG4gICAgbGV0IGNvbnRyb2xsZXIhOiBSZWFkYWJsZVN0cmVhbURlZmF1bHRDb250cm9sbGVyPFVpbnQ4QXJyYXk+O1xuXG4gICAgY29uc3QgYm9keSA9IG5ldyBSZWFkYWJsZVN0cmVhbTxVaW50OEFycmF5Pih7XG4gICAgICBzdGFydChjKSB7XG4gICAgICAgIGNvbnRyb2xsZXIgPSBjO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgY29uc3QgdXJsID0gdGhpcy5idWlsZFVybChcbiAgICAgIGAvY2FyZHMvJHtjYXJkSWR9L3N0cmVhbXMvJHtlbmNvZGVVUklDb21wb25lbnQoc3RyZWFtVHlwZSl9LyR7ZW5jb2RlVVJJQ29tcG9uZW50KGZpbGVuYW1lKX1gXG4gICAgKTtcblxuICAgIGNvbnN0IGhlYWRlcnM6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4gPSB7XG4gICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL3gtbmRqc29uJ1xuICAgIH07XG4gICAgaWYgKHRoaXMub3B0aW9ucy5hY2Nlc3NUb2tlbikge1xuICAgICAgaGVhZGVyc1snQXV0aG9yaXphdGlvbiddID0gYEJlYXJlciAke3RoaXMub3B0aW9ucy5hY2Nlc3NUb2tlbn1gO1xuICAgIH1cbiAgICBpZiAob3B0aW9ucz8udGl0bGUpIHtcbiAgICAgIGhlYWRlcnNbJ1gtU3RyZWFtLVRpdGxlJ10gPSBvcHRpb25zLnRpdGxlO1xuICAgIH1cbiAgICBpZiAob3B0aW9ucz8uc2Vzc2lvbklkKSB7XG4gICAgICBoZWFkZXJzWydYLVN0cmVhbS1TZXNzaW9uLUlkJ10gPSBvcHRpb25zLnNlc3Npb25JZDtcbiAgICB9XG5cbiAgICAvLyBgZHVwbGV4OiAnaGFsZidgIGlzIHJlcXVpcmVkIGJ5IHVuZGljaSBmb3Igc3RyZWFtaW5nIHJlcXVlc3QgYm9kaWVzXG4gICAgLy8gYnV0IGlzIG5vdCB5ZXQgaW4gdGhlIHN0YW5kYXJkIGxpYi5kb20gUmVxdWVzdEluaXQgdHlwZS5cbiAgICBjb25zdCBmZXRjaE9wdGlvbnM6IFJlcXVlc3RJbml0ICYgeyBkdXBsZXg6IHN0cmluZyB9ID0ge1xuICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICBoZWFkZXJzLFxuICAgICAgYm9keSxcbiAgICAgIGR1cGxleDogJ2hhbGYnXG4gICAgfTtcblxuICAgIGNvbnN0IHJlc3BvbnNlUHJvbWlzZSA9IGZldGNoKHVybCwgZmV0Y2hPcHRpb25zKTtcblxuICAgIC8vIFRyYWNrIGVhcmx5IHJlamVjdGlvbiBmcm9tIHRoZSBzZXJ2ZXIgKGUuZy4gNDA5IFwiU3RyZWFtIGFscmVhZHlcbiAgICAvLyBleGlzdHMgYW5kIGlzIGFjdGl2ZVwiKS4gIEZvciBhIHN1Y2Nlc3NmdWwgc3RyZWFtIHRoZSByZXNwb25zZSBzdGF5c1xuICAgIC8vIHBlbmRpbmcgdW50aWwgY2xvc2UoKSBlbmRzIHRoZSBib2R5IFx1MjAxNCBidXQgZXJyb3IgcmVzcG9uc2VzIGFycml2ZVxuICAgIC8vIGltbWVkaWF0ZWx5IGFuZCBtdXN0IGJlIHN1cmZhY2VkIHdpdGhvdXQgd2FpdGluZyBmb3IgY2xvc2UoKS5cbiAgICAvLyBOb3RlOiBvbmx5IHJlYWRzIHJlc3BvbnNlLm9rL3N0YXR1c1RleHQgKG5vdCB0aGUgYm9keSkgc28gY2xvc2UoKVxuICAgIC8vIGNhbiBzdGlsbCBwYXJzZSB0aGUgZnVsbCBlcnJvciByZXNwb25zZS5cbiAgICBsZXQgZWFybHlFcnJvcjogRXJyb3IgfCBudWxsID0gbnVsbDtcbiAgICByZXNwb25zZVByb21pc2VcbiAgICAgIC50aGVuKChyZXNwb25zZSkgPT4ge1xuICAgICAgICBpZiAoIXJlc3BvbnNlLm9rKSB7XG4gICAgICAgICAgZWFybHlFcnJvciA9IG5ldyBBcGlFcnJvcihyZXNwb25zZS5zdGF0dXNUZXh0LCBTdHJpbmcocmVzcG9uc2Uuc3RhdHVzKSk7XG4gICAgICAgIH1cbiAgICAgIH0pXG4gICAgICAuY2F0Y2goKGVycjogdW5rbm93bikgPT4ge1xuICAgICAgICBlYXJseUVycm9yID0gZXJyIGluc3RhbmNlb2YgRXJyb3IgPyBlcnIgOiBuZXcgRXJyb3IoU3RyaW5nKGVycikpO1xuICAgICAgfSk7XG5cbiAgICByZXR1cm4ge1xuICAgICAgd3JpdGUobGluZTogc3RyaW5nKTogdm9pZCB7XG4gICAgICAgIGlmIChlYXJseUVycm9yKSB0aHJvdyBlYXJseUVycm9yO1xuICAgICAgICBjb250cm9sbGVyLmVucXVldWUoZW5jb2Rlci5lbmNvZGUoYCR7bGluZX1cXG5gKSk7XG4gICAgICB9LFxuICAgICAgY2xvc2U6IGFzeW5jICgpOiBQcm9taXNlPFN0cmVhbVJlc3VsdD4gPT4ge1xuICAgICAgICBjb250cm9sbGVyLmNsb3NlKCk7XG4gICAgICAgIHJldHVybiB0aGlzLnJlcXVlc3QoYXN5bmMgKCkgPT4ge1xuICAgICAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgcmVzcG9uc2VQcm9taXNlO1xuICAgICAgICAgIGlmICghcmVzcG9uc2Uub2spIHRocm93IHJlc3BvbnNlO1xuICAgICAgICAgIHJldHVybiByZXNwb25zZS5qc29uKCkgYXMgUHJvbWlzZTxTdHJlYW1SZXN1bHQ+O1xuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9O1xuICB9XG5cbiAgLyoqXG4gICAqIE9wZW5zIGEgV2ViU29ja2V0LWJhY2tlZCBKU09OTCBzdHJlYW0gdG8gdGhlIHNlcnZlciBhbmQgcmV0dXJucyBhIHNlc3Npb24uXG4gICAqXG4gICAqIFRoZSBzZXNzaW9uIGtlZXBzIGEgcGVyc2lzdGVudCBXZWJTb2NrZXQgY29ubmVjdGlvbiBmb3IgdGhlIGVudGlyZSBzZXNzaW9uXG4gICAqIGxpZmV0aW1lLiBUaGUgc2VydmVyIHNlbmRzIGEgYHJlYWR5YCBtZXNzYWdlIHdpdGggYHJlc3VtZUZyb21gIGJlZm9yZSB0aGVcbiAgICogY2FsbGVyIHdyaXRlcyBhbnkgbGluZXMsIHNvIHRoZSB3YXRjaGVyIGNhbiBza2lwIGxpbmVzIHRoZSBzZXJ2ZXIgYWxyZWFkeSBoYXMuXG4gICAqXG4gICAqIENhbGwge0BsaW5rIFdzU3RyZWFtU2Vzc2lvbi5jbG9zZX0gd2hlbiB0aGUgcHJvZHVjZXIgaXMgZmluaXNoZWQgdG8gc2VuZCBhXG4gICAqIGdyYWNlZnVsIGNsb3NlIG1lc3NhZ2UgYW5kIGF3YWl0IHRoZSBzZXJ2ZXIncyBhY2tub3dsZWRnZW1lbnQuXG4gICAqXG4gICAqIEBwYXJhbSBjYXJkSWQgLSBDYXJkIElEIHRvIGF0dGFjaCB0aGUgc3RyZWFtIHRvLlxuICAgKiBAcGFyYW0gc3RyZWFtVHlwZSAtIFN0cmVhbSB0eXBlIGtleSBmcm9tIHNldHRpbmdzLmpzb24gKGUuZy4sIGBcImNsYXVkZS1jb2RlLXNlc3Npb25cImApLlxuICAgKiBAcGFyYW0gZmlsZW5hbWUgLSBTdHJlYW0gZmlsZW5hbWUgKGUuZy4sIGBcInNlc3Npb24tYWJjLmpzb25sXCJgKS5cbiAgICogQHBhcmFtIG9wdGlvbnMgLSBUaXRsZSBhbmQgc2Vzc2lvbiBJRCBtZXRhZGF0YSBmb3J3YXJkZWQgdG8gdGhlIHNlcnZlciBhcyBVUkwgcXVlcnkgcGFyYW1ldGVycy5cbiAgICogQHBhcmFtIHdzRmFjdG9yeSAtIFdlYlNvY2tldCBmYWN0b3J5IGZvciBjcmVhdGluZyB0aGUgY29ubmVjdGlvbi4gVXNlIHRoZSBgd3NgIHBhY2thZ2UgaW4gTm9kZS5qcyBlbnZpcm9ubWVudHMuXG4gICAqIEByZXR1cm5zIEEge0BsaW5rIFdzU3RyZWFtU2Vzc2lvbn0gd2l0aCBgcmVzdW1lRnJvbWAgc2V0IHRvIHRoZSBzZXJ2ZXIncyBjdXJyZW50IGxpbmUgY291bnQuXG4gICAqIEB0aHJvd3MgRXJyb3Igd2hlbiB0aGUgV2ViU29ja2V0IGZhaWxzIHRvIGNvbm5lY3Qgb3IgdGhlIHNlcnZlciBzZW5kcyBhbiBlcnJvciBiZWZvcmUgYHJlYWR5YC5cbiAgICovXG4gIGFzeW5jIG9wZW5TdHJlYW1XZWJTb2NrZXQoXG4gICAgY2FyZElkOiBzdHJpbmcsXG4gICAgc3RyZWFtVHlwZTogc3RyaW5nLFxuICAgIGZpbGVuYW1lOiBzdHJpbmcsXG4gICAgb3B0aW9uczogU3RyZWFtV3JpdGVyT3B0aW9ucyxcbiAgICB3c0ZhY3Rvcnk6IEluZ2VzdFdzRmFjdG9yeVxuICApOiBQcm9taXNlPFdzU3RyZWFtU2Vzc2lvbj4ge1xuICAgIGNvbnN0IGZhY3RvcnkgPSB3c0ZhY3Rvcnk7XG5cbiAgICAvLyBDb252ZXJ0IGh0dHAvaHR0cHMgdG8gd3Mvd3NzXG4gICAgY29uc3QgYmFzZVVybCA9IHRoaXMub3B0aW9ucy5iYXNlVXJsLnJlcGxhY2UoL15odHRwLywgJ3dzJyk7XG4gICAgY29uc3QgYmFzZVBhdGggPSBgJHtiYXNlVXJsfS9jYXJkcy8ke2VuY29kZVVSSUNvbXBvbmVudChjYXJkSWQpfS9zdHJlYW1zLyR7ZW5jb2RlVVJJQ29tcG9uZW50KHN0cmVhbVR5cGUpfS8ke2VuY29kZVVSSUNvbXBvbmVudChmaWxlbmFtZSl9YDtcbiAgICBjb25zdCBxdWVyeVBhcmFtcyA9IG5ldyBVUkxTZWFyY2hQYXJhbXMoKTtcbiAgICBpZiAob3B0aW9ucz8udGl0bGUpIHF1ZXJ5UGFyYW1zLnNldCgndGl0bGUnLCBvcHRpb25zLnRpdGxlKTtcbiAgICBpZiAob3B0aW9ucz8uc2Vzc2lvbklkKSBxdWVyeVBhcmFtcy5zZXQoJ3Nlc3Npb25JZCcsIG9wdGlvbnMuc2Vzc2lvbklkKTtcbiAgICBjb25zdCBxdWVyeVN0cmluZyA9IHF1ZXJ5UGFyYW1zLnRvU3RyaW5nKCk7XG4gICAgY29uc3QgdXJsID0gcXVlcnlTdHJpbmcgPyBgJHtiYXNlUGF0aH0/JHtxdWVyeVN0cmluZ31gIDogYmFzZVBhdGg7XG5cbiAgICBjb25zdCBoZWFkZXJzOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ID0ge307XG4gICAgaWYgKHRoaXMub3B0aW9ucy5hY2Nlc3NUb2tlbikge1xuICAgICAgaGVhZGVyc1snQXV0aG9yaXphdGlvbiddID0gYEJlYXJlciAke3RoaXMub3B0aW9ucy5hY2Nlc3NUb2tlbn1gO1xuICAgIH1cblxuICAgIGNvbnN0IHdzID0gZmFjdG9yeSh1cmwsIHsgaGVhZGVycyB9KTtcblxuICAgIC8vIEF3YWl0IHRoZSAncmVhZHknIG1lc3NhZ2UgZnJvbSB0aGUgc2VydmVyIGJlZm9yZSByZXR1cm5pbmcgdG8gdGhlIGNhbGxlci5cbiAgICAvLyBBbnkgZXJyb3Igb3IgcHJlbWF0dXJlIGNsb3NlIGJlZm9yZSAncmVhZHknIHJlamVjdHMgdGhlIHByb21pc2UuXG4gICAgY29uc3QgcmVzdW1lRnJvbSA9IGF3YWl0IG5ldyBQcm9taXNlPG51bWJlcj4oKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgY29uc3Qgb25SZWFkeSA9IChldmVudDogTWVzc2FnZUV2ZW50PHVua25vd24+KSA9PiB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgY29uc3QgbXNnID0gSlNPTi5wYXJzZShTdHJpbmcoZXZlbnQuZGF0YSkpIGFzIHsgdHlwZTogc3RyaW5nOyByZXN1bWVGcm9tPzogbnVtYmVyOyBtZXNzYWdlPzogc3RyaW5nIH07XG4gICAgICAgICAgaWYgKG1zZy50eXBlID09PSAncmVhZHknKSB7XG4gICAgICAgICAgICB3cy5yZW1vdmVFdmVudExpc3RlbmVyKCdtZXNzYWdlJywgb25SZWFkeSk7XG4gICAgICAgICAgICB3cy5yZW1vdmVFdmVudExpc3RlbmVyKCdlcnJvcicsIG9uRXJyb3IpO1xuICAgICAgICAgICAgd3MucmVtb3ZlRXZlbnRMaXN0ZW5lcignY2xvc2UnLCBvbkNsb3NlKTtcbiAgICAgICAgICAgIHJlc29sdmUobXNnLnJlc3VtZUZyb20gPz8gMCk7XG4gICAgICAgICAgfSBlbHNlIGlmIChtc2cudHlwZSA9PT0gJ2Vycm9yJykge1xuICAgICAgICAgICAgd3MucmVtb3ZlRXZlbnRMaXN0ZW5lcignbWVzc2FnZScsIG9uUmVhZHkpO1xuICAgICAgICAgICAgd3MucmVtb3ZlRXZlbnRMaXN0ZW5lcignZXJyb3InLCBvbkVycm9yKTtcbiAgICAgICAgICAgIHdzLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2Nsb3NlJywgb25DbG9zZSk7XG4gICAgICAgICAgICByZWplY3QobmV3IEVycm9yKG1zZy5tZXNzYWdlID8/ICdTZXJ2ZXIgZXJyb3InKSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIC8vIE90aGVyIG1lc3NhZ2UgdHlwZXMgYmVmb3JlICdyZWFkeScgYXJlIHNpbGVudGx5IGlnbm9yZWRcbiAgICAgICAgfSBjYXRjaCB7XG4gICAgICAgICAgcmVqZWN0KG5ldyBFcnJvcignRmFpbGVkIHRvIHBhcnNlIHNlcnZlciByZWFkeSBtZXNzYWdlJykpO1xuICAgICAgICB9XG4gICAgICB9O1xuICAgICAgY29uc3Qgb25FcnJvciA9IChldmVudDogRXZlbnQpID0+IHtcbiAgICAgICAgd3MucmVtb3ZlRXZlbnRMaXN0ZW5lcignbWVzc2FnZScsIG9uUmVhZHkpO1xuICAgICAgICB3cy5yZW1vdmVFdmVudExpc3RlbmVyKCdlcnJvcicsIG9uRXJyb3IpO1xuICAgICAgICB3cy5yZW1vdmVFdmVudExpc3RlbmVyKCdjbG9zZScsIG9uQ2xvc2UpO1xuICAgICAgICByZWplY3QobmV3IEVycm9yKGBXZWJTb2NrZXQgZXJyb3I6ICR7U3RyaW5nKGV2ZW50KX1gKSk7XG4gICAgICB9O1xuICAgICAgY29uc3Qgb25DbG9zZSA9IChldmVudDogQ2xvc2VFdmVudCkgPT4ge1xuICAgICAgICB3cy5yZW1vdmVFdmVudExpc3RlbmVyKCdtZXNzYWdlJywgb25SZWFkeSk7XG4gICAgICAgIHdzLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2Vycm9yJywgb25FcnJvcik7XG4gICAgICAgIHdzLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2Nsb3NlJywgb25DbG9zZSk7XG4gICAgICAgIHJlamVjdChuZXcgRXJyb3IoYFdlYlNvY2tldCBjbG9zZWQgYmVmb3JlIHJlYWR5OiBjb2RlPSR7U3RyaW5nKGV2ZW50LmNvZGUpfWApKTtcbiAgICAgIH07XG4gICAgICB3cy5hZGRFdmVudExpc3RlbmVyKCdtZXNzYWdlJywgb25SZWFkeSk7XG4gICAgICB3cy5hZGRFdmVudExpc3RlbmVyKCdlcnJvcicsIG9uRXJyb3IpO1xuICAgICAgd3MuYWRkRXZlbnRMaXN0ZW5lcignY2xvc2UnLCBvbkNsb3NlKTtcbiAgICB9KTtcblxuICAgIGxldCBsaW5lc1NlbnQgPSByZXN1bWVGcm9tO1xuXG4gICAgcmV0dXJuIHtcbiAgICAgIGdldCByZXN1bWVGcm9tKCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiByZXN1bWVGcm9tO1xuICAgICAgfSxcbiAgICAgIGdldCBsaW5lc1NlbnQoKTogbnVtYmVyIHtcbiAgICAgICAgcmV0dXJuIGxpbmVzU2VudDtcbiAgICAgIH0sXG4gICAgICB3cml0ZShsaW5lOiBzdHJpbmcpOiB2b2lkIHtcbiAgICAgICAgbGluZXNTZW50Kys7XG4gICAgICAgIHdzLnNlbmQoSlNPTi5zdHJpbmdpZnkoeyB0eXBlOiAnbGluZScsIGxpbmVOdW1iZXI6IGxpbmVzU2VudCwgY29udGVudDogbGluZSB9KSk7XG4gICAgICB9LFxuICAgICAgYXN5bmMgY2xvc2UoKTogUHJvbWlzZTxTdHJlYW1SZXN1bHQ+IHtcbiAgICAgICAgd3Muc2VuZChKU09OLnN0cmluZ2lmeSh7IHR5cGU6ICdjbG9zZScgfSkpO1xuICAgICAgICBhd2FpdCBuZXcgUHJvbWlzZTx2b2lkPigocmVzb2x2ZSkgPT4ge1xuICAgICAgICAgIGNvbnN0IG9uQ2xvc2UgPSAoKSA9PiB7XG4gICAgICAgICAgICB3cy5yZW1vdmVFdmVudExpc3RlbmVyKCdjbG9zZScsIG9uQ2xvc2UpO1xuICAgICAgICAgICAgcmVzb2x2ZSgpO1xuICAgICAgICAgIH07XG4gICAgICAgICAgd3MuYWRkRXZlbnRMaXN0ZW5lcignY2xvc2UnLCBvbkNsb3NlKTtcbiAgICAgICAgICAvLyBJZiBhbHJlYWR5IGNsb3NlZCwgcmVzb2x2ZSBpbW1lZGlhdGVseVxuICAgICAgICAgIGlmICh3cy5yZWFkeVN0YXRlID09PSB3cy5DTE9TRUQpIHtcbiAgICAgICAgICAgIHdzLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2Nsb3NlJywgb25DbG9zZSk7XG4gICAgICAgICAgICByZXNvbHZlKCk7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICBmaWxlbmFtZSxcbiAgICAgICAgICBzdHJlYW1UeXBlLFxuICAgICAgICAgIGxpbmVDb3VudDogbGluZXNTZW50LFxuICAgICAgICAgIHN0YXR1czogJ2NvbXBsZXRlZCdcbiAgICAgICAgfTtcbiAgICAgIH1cbiAgICB9O1xuICB9XG5cbiAgLy8gLS0tIENvbXBhcmUgT3BlcmF0aW9ucyAtLS1cblxuICAvKipcbiAgICogU2V0cyBvciByZXBsYWNlcyB0aGUgYWN0aXZlIGNvbXBhcmlzb24gb24gdGhlIHNlcnZlci5cbiAgICpcbiAgICogQHBhcmFtIHJlcXVlc3QgLSBDb21wYXJlIHJlcXVlc3Qgc3BlY2lmeWluZyB0aGUgY29tcGFyaXNvbiBtb2RlLlxuICAgKiBAcmV0dXJucyBQcm9taXNlIHJlc29sdmluZyB0byB0aGUgcmVzdWx0aW5nIGNvbXBhcmUgc3RhdGUuXG4gICAqL1xuICBhc3luYyBzZXRDb21wYXJlKHJlcXVlc3Q6IENvbXBhcmVSZXF1ZXN0KTogUHJvbWlzZTxDb21wYXJlU3RhdGU+IHtcbiAgICBjb25zdCB1cmwgPSB0aGlzLmJ1aWxkVXJsKCcvY29tcGFyZScpO1xuICAgIHJldHVybiB0aGlzLnJlcXVlc3QoKCkgPT4gdGhpcy5nZXRIdHRwQ2xpZW50KCkucG9zdDxDb21wYXJlU3RhdGU+KHVybCwgcmVxdWVzdCkpO1xuICB9XG5cbiAgLyoqXG4gICAqIFJldHVybnMgdGhlIGN1cnJlbnQgY29tcGFyZSBzdGF0ZSwgb3IgbnVsbCBpZiBubyBjb21wYXJpc29uIGlzIGFjdGl2ZS5cbiAgICpcbiAgICogVGhlIHNlcnZlciByZXR1cm5zIDIwNCB3aGVuIG5vIGNvbXBhcmlzb24gaXMgYWN0aXZlLCB3aGljaCB0aGlzIG1ldGhvZFxuICAgKiBtYXBzIHRvIG51bGwgcmF0aGVyIHRoYW4gdGhyb3dpbmcuXG4gICAqXG4gICAqIEByZXR1cm5zIFByb21pc2UgcmVzb2x2aW5nIHRvIHRoZSBjdXJyZW50IGNvbXBhcmUgc3RhdGUsIG9yIG51bGwgaWYgbm9uZSBhY3RpdmUuXG4gICAqL1xuICBhc3luYyBnZXRDb21wYXJlKCk6IFByb21pc2U8Q29tcGFyZVN0YXRlIHwgbnVsbD4ge1xuICAgIGNvbnN0IHVybCA9IHRoaXMuYnVpbGRVcmwoJy9jb21wYXJlJyk7XG4gICAgcmV0dXJuIHRoaXMucmVxdWVzdChhc3luYyAoKSA9PiB7XG4gICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGZldGNoKHVybCwge1xuICAgICAgICBoZWFkZXJzOiB0aGlzLmdldEhlYWRlcnMoKSBhcyBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+LFxuICAgICAgICBzaWduYWw6IHRoaXMuZ2V0VGltZW91dFNpZ25hbCgpXG4gICAgICB9KTtcbiAgICAgIGlmIChyZXNwb25zZS5zdGF0dXMgPT09IDIwNCkge1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH1cbiAgICAgIGlmICghcmVzcG9uc2Uub2spIHRocm93IHJlc3BvbnNlO1xuICAgICAgcmV0dXJuIHJlc3BvbnNlLmpzb24oKSBhcyBQcm9taXNlPENvbXBhcmVTdGF0ZT47XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogQ2xlYXJzIHRoZSBhY3RpdmUgY29tcGFyaXNvbiBvbiB0aGUgc2VydmVyLlxuICAgKlxuICAgKiBAcmV0dXJucyBQcm9taXNlIHJlc29sdmluZyB3aGVuIHRoZSBjb21wYXJpc29uIGlzIGNsZWFyZWQuXG4gICAqL1xuICBhc3luYyBjbGVhckNvbXBhcmUoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc3QgdXJsID0gdGhpcy5idWlsZFVybCgnL2NvbXBhcmUnKTtcbiAgICByZXR1cm4gdGhpcy5yZXF1ZXN0KCgpID0+IHRoaXMuZ2V0SHR0cENsaWVudCgpLmRlbGV0ZSh1cmwpKTtcbiAgfVxufVxuIiwgImltcG9ydCB7IGV4ZWNGaWxlIH0gZnJvbSAnbm9kZTpjaGlsZF9wcm9jZXNzJztcbmltcG9ydCAqIGFzIGZzIGZyb20gJ25vZGU6ZnMvcHJvbWlzZXMnO1xuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdub2RlOnBhdGgnO1xuaW1wb3J0IHsgcHJvbWlzaWZ5IH0gZnJvbSAnbm9kZTp1dGlsJztcblxuLyoqXG4gKiBJbXBsZW1lbnRzIGNyZWF0ZSB3b3JrdHJlZSBiZWhhdmlvciBmb3IgdGhlIGRlZmF1bHQtY29uZmlndXJhdGlvbiBwYWNrYWdlLlxuICogVGhlIG1vZHVsZSBjYXB0dXJlcyBkb21haW4gcnVsZXMgaW4gb25lIHBsYWNlIHNvIGNhbGxlcnMgY2FuIGNvbXBvc2Ugd29ya2Zsb3dzIHdpdGhvdXRcbiAqIGR1cGxpY2F0aW5nIGVkZ2UtY2FzZSBoYW5kbGluZy5cbiAqXG4gKiBAc3VtbWFyeSBDcmVhdGUgV29ya3RyZWUgbG9naWMgZm9yIGxpYlxuICovXG5cbmNvbnN0IGV4ZWNGaWxlQXN5bmMgPSBwcm9taXNpZnkoZXhlY0ZpbGUpO1xuXG4vKipcbiAqIFZhbGlkYXRlcyBhIGJyYW5jaCBuYW1lIGFnYWluc3QgdGhlIENMSSdzIHNhZmUgc3Vic2V0LlxuICpcbiAqIFRoZSBuYW1lIG11c3Qgc3RhcnQgd2l0aCBhbiBhbHBoYW51bWVyaWMgY2hhcmFjdGVyIGFuZCBtYXkgdGhlbiBpbmNsdWRlXG4gKiBhbHBoYW51bWVyaWNzLCBzbGFzaGVzLCB1bmRlcnNjb3Jlcywgb3IgZGFzaGVzLlxuICpcbiAqIEBwYXJhbSBuYW1lIC0gQ2FuZGlkYXRlIGJyYW5jaCBuYW1lIHN1cHBsaWVkIGJ5IHRoZSBjYWxsZXIuXG4gKiBAdGhyb3dzIHtFcnJvcn0gV2hlbiB0aGUgYnJhbmNoIG5hbWUgZG9lcyBub3QgbWF0Y2ggdGhlIHN1cHBvcnRlZCBmb3JtYXQuXG4gKiBAcmV0dXJucyBObyB2YWx1ZS4gVGhyb3dzIG9uIGludmFsaWQgaW5wdXQuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB2YWxpZGF0ZUJyYW5jaE5hbWUobmFtZTogc3RyaW5nKTogdm9pZCB7XG4gIGNvbnN0IGJyYW5jaE5hbWVSZWdleCA9IC9eW2EtekEtWjAtOV1bYS16QS1aMC05L18tXSokLztcbiAgaWYgKCFicmFuY2hOYW1lUmVnZXgudGVzdChuYW1lKSkge1xuICAgIHRocm93IG5ldyBFcnJvcignRXJyb3I6IEludmFsaWQgYnJhbmNoIG5hbWUgZm9ybWF0LicpO1xuICB9XG59XG5cbi8qKlxuICogRGV0ZXJtaW5lcyB3aGV0aGVyIGEgcmVsYXRpdmUgcGF0aCBpcyBuZXN0ZWQgdW5kZXIgYW55IGtub3duIHBhcmVudCBwYXRoLlxuICpcbiAqIFRoZSBjaGVjayB3YWxrcyBhbmNlc3RvciBzZWdtZW50cyBvZiBgZGlyYCBhbmQgcmV0dXJucyB0cnVlIG9uIHRoZSBmaXJzdFxuICogbWF0Y2ggaW4gYHBhcmVudFNldGAuXG4gKlxuICogQHBhcmFtIGRpciAtIFJlbGF0aXZlIHBhdGggdG8gdGVzdC5cbiAqIEBwYXJhbSBwYXJlbnRTZXQgLSBDYW5kaWRhdGUgcGFyZW50IGRpcmVjdG9yaWVzIHJlcHJlc2VudGVkIGFzIHJlbGF0aXZlIHBhdGhzLlxuICogQHJldHVybnMgVHJ1ZSB3aGVuIGBkaXJgIGlzIG5lc3RlZCB1bmRlciBhIHBhdGggaW4gYHBhcmVudFNldGAuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc05lc3RlZFVuZGVyKGRpcjogc3RyaW5nLCBwYXJlbnRTZXQ6IFNldDxzdHJpbmc+KTogYm9vbGVhbiB7XG4gIGxldCBjdXJyZW50ID0gZGlyO1xuICB3aGlsZSAoY3VycmVudC5pbmNsdWRlcygnLycpKSB7XG4gICAgY3VycmVudCA9IGN1cnJlbnQuc3Vic3RyaW5nKDAsIGN1cnJlbnQubGFzdEluZGV4T2YoJy8nKSk7XG4gICAgaWYgKHBhcmVudFNldC5oYXMoY3VycmVudCkpIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgfVxuICByZXR1cm4gZmFsc2U7XG59XG5cbi8qKlxuICogQ2hlY2tzIHdoZXRoZXIgYSBzeW1saW5rIHRhcmdldCBwb2ludHMgdG8ga25vd24gbW9ub3JlcG8taW50ZXJuYWwgbG9jYXRpb25zLlxuICpcbiAqIEludGVybmFsIHRhcmdldHMgYXJlIHByZXNlcnZlZCBhcyByZWxhdGl2ZSBsaW5rcyBkdXJpbmcgbm9kZV9tb2R1bGVzIHJlcm91dGVcbiAqIHNvIHdvcmtzcGFjZSBsaW5rcyBrZWVwIHdvcmtpbmcgaW5zaWRlIGEgd29ya3RyZWUuXG4gKlxuICogQHBhcmFtIHRhcmdldCAtIFN5bWxpbmsgdGFyZ2V0IHJlYWQgZnJvbSB0aGUgc291cmNlIG5vZGVfbW9kdWxlcyBlbnRyeS5cbiAqIEByZXR1cm5zIFRydWUgd2hlbiB0aGUgdGFyZ2V0IHN0YXJ0cyB3aXRoIGFuIGludGVybmFsIHByZWZpeC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzSW50ZXJuYWxTeW1saW5rKHRhcmdldDogc3RyaW5nKTogYm9vbGVhbiB7XG4gIHJldHVybiB0YXJnZXQuc3RhcnRzV2l0aCgnLi4vJyk7XG59XG5cbmludGVyZmFjZSBDcmVhdGVXb3JrdHJlZVJlc3VsdCB7XG4gIGJyYW5jaDogc3RyaW5nO1xuICB3b3JrdHJlZTogc3RyaW5nO1xuICBiYXNlU2hhOiBzdHJpbmc7XG4gIHJlcm91dGVkU3ltbGlua3M/OiBudW1iZXI7XG59XG5cbi8qKlxuICogQ3JlYXRlcyBhbmQgY29uZmlndXJlcyBhIG5ldyBnaXQgd29ya3RyZWUgZm9yIGEgYnJhbmNoLlxuICpcbiAqIFRoZSB3b3JrZmxvdyB2YWxpZGF0ZXMgdGhlIGJyYW5jaCBuYW1lLCBjcmVhdGVzIHRoZSB3b3JrdHJlZSwgbWlycm9yc1xuICogZXhpc3Rpbmcgcm9vdCBzeW1saW5rcywgc3ltbGlua3MgaWdub3JlZCBwYXRocywgcmVyb3V0ZXMgbm9kZV9tb2R1bGVzIGxpbmtzLFxuICogYW5kIHVwZGF0ZXMgcGVyLXdvcmt0cmVlIGdpdCBleGNsdWRlcy5cbiAqXG4gKiBAcGFyYW0gYnJhbmNoTmFtZSAtIE5hbWUgb2YgdGhlIGJyYW5jaCB0byBjcmVhdGUgb3IgYXR0YWNoLlxuICogQHBhcmFtIG9wdGlvbnMgLSBPcHRpb25hbCBjb25maWd1cmF0aW9uLlxuICogQHBhcmFtIG9wdGlvbnMuY3dkIC0gV29ya2luZyBkaXJlY3RvcnkgdG8gdXNlIHdoZW4gbG9jYXRpbmcgZ2l0IHJvb3RzLiBEZWZhdWx0cyB0byBgcHJvY2Vzcy5jd2QoKWAuXG4gKiBAcmV0dXJucyBNZXRhZGF0YSBkZXNjcmliaW5nIHRoZSBjcmVhdGVkIHdvcmt0cmVlIGFuZCBiYXNlIGNvbW1pdC5cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGNyZWF0ZVdvcmt0cmVlKGJyYW5jaE5hbWU6IHN0cmluZywgb3B0aW9ucz86IHsgY3dkPzogc3RyaW5nIH0pOiBQcm9taXNlPENyZWF0ZVdvcmt0cmVlUmVzdWx0PiB7XG4gIHZhbGlkYXRlQnJhbmNoTmFtZShicmFuY2hOYW1lKTtcblxuICBjb25zdCB7IHNvdXJjZVJvb3QsIHJlcG9Sb290IH0gPSBhd2FpdCBmaW5kR2l0Um9vdHMob3B0aW9ucz8uY3dkID8/IHByb2Nlc3MuY3dkKCkpO1xuICBjb25zdCBzdGFydFBvaW50ID0gYXdhaXQgcmVzb2x2ZUhlYWQoc291cmNlUm9vdCk7XG4gIGNvbnN0IHdvcmt0cmVlRGlyID0gcGF0aC5qb2luKHJlcG9Sb290LCAnLndvcmt0cmVlcycsIGJyYW5jaE5hbWUpO1xuXG4gIGNvbnN0IFt3b3JrdHJlZUV4aXN0cywgYnJhbmNoRXhpc3RzXSA9IGF3YWl0IFByb21pc2UuYWxsKFtcbiAgICBjaGVja1dvcmt0cmVlRXhpc3RzKHJlcG9Sb290LCB3b3JrdHJlZURpciksXG4gICAgY2hlY2tCcmFuY2hFeGlzdHMocmVwb1Jvb3QsIGJyYW5jaE5hbWUpXG4gIF0pO1xuXG4gIGlmICh3b3JrdHJlZUV4aXN0cykge1xuICAgIHRocm93IG5ldyBFcnJvcihgRXJyb3I6IFdvcmt0cmVlIGFscmVhZHkgZXhpc3RzIGF0ICR7d29ya3RyZWVEaXJ9YCk7XG4gIH1cblxuICAvLyBSZW1vdmUgc3RhbGUgZGlyZWN0b3J5IHJlbW5hbnRzIGxlZnQgYnkgYSBjcmFzaGVkIHByZXZpb3VzIHNlc3Npb24uXG4gIC8vIEdpdCBkb2Vzbid0IHRyYWNrIHRoZSB3b3JrdHJlZSwgYnV0IHRoZSBkaXJlY3RvcnkgbWF5IHN0aWxsIGV4aXN0IG9uIGRpc2ssXG4gIC8vIHdoaWNoIGNhdXNlcyBgZ2l0IHdvcmt0cmVlIGFkZGAgdG8gZmFpbCB3aXRoIFwiYWxyZWFkeSBleGlzdHNcIi5cbiAgdHJ5IHtcbiAgICBhd2FpdCBmcy5hY2Nlc3Mod29ya3RyZWVEaXIpO1xuICAgIC8vIERpcmVjdG9yeSBleGlzdHMgb24gZGlzayBidXQgZ2l0IGRvZXNuJ3QgdHJhY2sgaXQgXHUyMDE0IGl0J3Mgc3RhbGUuXG4gICAgYXdhaXQgZnMucm0od29ya3RyZWVEaXIsIHsgcmVjdXJzaXZlOiB0cnVlIH0pO1xuICAgIGF3YWl0IGV4ZWNGaWxlQXN5bmMoJ2dpdCcsIFsnd29ya3RyZWUnLCAncHJ1bmUnXSwgeyBjd2Q6IHJlcG9Sb290LCB0aW1lb3V0OiAzMF8wMDAgfSk7XG4gIH0gY2F0Y2ggKGVycm9yOiB1bmtub3duKSB7XG4gICAgaWYgKChlcnJvciBhcyBOb2RlSlMuRXJybm9FeGNlcHRpb24pLmNvZGUgIT09ICdFTk9FTlQnKSB7XG4gICAgICB0aHJvdyBlcnJvcjtcbiAgICB9XG4gICAgLy8gRU5PRU5UOiBkaXJlY3RvcnkgZG9lc24ndCBleGlzdCBvbiBkaXNrIFx1MjAxNCBub3RoaW5nIHRvIGNsZWFuIHVwLlxuICB9XG5cbiAgYXdhaXQgYWRkV29ya3RyZWUoeyByZXBvUm9vdCwgd29ya3RyZWVEaXIsIGJyYW5jaE5hbWUsIGJyYW5jaEV4aXN0cywgc3RhcnRQb2ludCB9KTtcblxuICBjb25zdCBpZ25vcmVkID0gYXdhaXQgZGlzY292ZXJJZ25vcmVkUGF0aHMoc291cmNlUm9vdCk7XG4gIGF3YWl0IGNvcHlFeGlzdGluZ1N5bWxpbmtzKHNvdXJjZVJvb3QsIHdvcmt0cmVlRGlyKTtcbiAgYXdhaXQgc3ltbGlua0lnbm9yZWRQYXRocyh7IHNvdXJjZVJvb3QsIHdvcmt0cmVlRGlyLCBpZ25vcmVkIH0pO1xuXG4gIGNvbnN0IHJlcm91dGVkQ291bnQgPSBhd2FpdCByZXJvdXRlQWxsTm9kZU1vZHVsZXMoeyBzb3VyY2VSb290LCB3b3JrdHJlZURpciwgcmVwb1Jvb3QgfSk7XG5cbiAgY29uc3QgWywgYmFzZVNoYV0gPSBhd2FpdCBQcm9taXNlLmFsbChbXG4gICAgdXBkYXRlR2l0RXhjbHVkZSh7IHdvcmt0cmVlRGlyLCByZXBvUm9vdCwgZGlyZWN0b3JpZXM6IGlnbm9yZWQuZGlyZWN0b3JpZXMsIGZpbGVzOiBpZ25vcmVkLmZpbGVzIH0pLFxuICAgIHJlc29sdmVIZWFkKHdvcmt0cmVlRGlyKVxuICBdKTtcblxuICBjb25zdCByZXN1bHQ6IENyZWF0ZVdvcmt0cmVlUmVzdWx0ID0ge1xuICAgIGJyYW5jaDogYnJhbmNoTmFtZSxcbiAgICB3b3JrdHJlZTogd29ya3RyZWVEaXIsXG4gICAgYmFzZVNoYVxuICB9O1xuXG4gIGlmIChyZXJvdXRlZENvdW50ID4gMCkge1xuICAgIHJlc3VsdC5yZXJvdXRlZFN5bWxpbmtzID0gcmVyb3V0ZWRDb3VudDtcbiAgfVxuXG4gIHJldHVybiByZXN1bHQ7XG59XG5cbmludGVyZmFjZSBHaXRSb290cyB7XG4gIHNvdXJjZVJvb3Q6IHN0cmluZztcbiAgcmVwb1Jvb3Q6IHN0cmluZztcbn1cblxuLyoqXG4gKiBMb2NhdGVzIHRoZSBjdXJyZW50IGdpdCBzb3VyY2Ugcm9vdCBhbmQgcHJpbWFyeSByZXBvc2l0b3J5IHJvb3QuXG4gKlxuICogU3VwcG9ydHMgYm90aCBzdGFuZGFyZCBjaGVja291dHMgKGAuZ2l0YCBkaXJlY3RvcnkpIGFuZCB3b3JrdHJlZSBjaGVja291dHNcbiAqIChgLmdpdGAgZmlsZSBwb2ludGluZyBpbnRvIGAuZ2l0L3dvcmt0cmVlcy8uLi5gKS5cbiAqXG4gKiBAcGFyYW0gc3RhcnREaXIgLSBEaXJlY3Rvcnkgd2hlcmUgdXB3YXJkIHNlYXJjaCBiZWdpbnMuXG4gKiBAdGhyb3dzIHtFcnJvcn0gV2hlbiBubyBnaXQgcmVwb3NpdG9yeSBtYXJrZXIgaXMgZm91bmQuXG4gKiBAcmV0dXJucyBQYXRocyBmb3IgdGhlIGN1cnJlbnQgY2hlY2tvdXQgcm9vdCBhbmQgdGhlIHByaW1hcnkgcmVwbyByb290LlxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZmluZEdpdFJvb3RzKHN0YXJ0RGlyOiBzdHJpbmcpOiBQcm9taXNlPEdpdFJvb3RzPiB7XG4gIGxldCBjdXJyZW50RGlyID0gcGF0aC5yZXNvbHZlKHN0YXJ0RGlyKTtcbiAgd2hpbGUgKGN1cnJlbnREaXIgIT09ICcvJykge1xuICAgIGNvbnN0IGdpdFBhdGggPSBwYXRoLmpvaW4oY3VycmVudERpciwgJy5naXQnKTtcbiAgICB0cnkge1xuICAgICAgY29uc3Qgc3RhdHMgPSBhd2FpdCBmcy5sc3RhdChnaXRQYXRoKTtcbiAgICAgIGlmIChzdGF0cy5pc0RpcmVjdG9yeSgpKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgc291cmNlUm9vdDogY3VycmVudERpcixcbiAgICAgICAgICByZXBvUm9vdDogY3VycmVudERpclxuICAgICAgICB9O1xuICAgICAgfVxuICAgICAgaWYgKHN0YXRzLmlzRmlsZSgpKSB7XG4gICAgICAgIGNvbnN0IGdpdEZpbGVDb250ZW50ID0gYXdhaXQgZnMucmVhZEZpbGUoZ2l0UGF0aCwgJ3V0Zi04Jyk7XG4gICAgICAgIGNvbnN0IGdpdGRpckxpbmUgPSBnaXRGaWxlQ29udGVudC50cmltKCk7XG4gICAgICAgIGNvbnN0IGdpdGRpclBhdGggPSBnaXRkaXJMaW5lLnJlcGxhY2UoL15naXRkaXI6XFxzKi8sICcnKTtcbiAgICAgICAgY29uc3QgbWFpbkdpdERpciA9IGdpdGRpclBhdGgucmVwbGFjZSgvXFwvd29ya3RyZWVzXFwvW14vXSskLywgJycpO1xuICAgICAgICBjb25zdCByZXBvUm9vdCA9IG1haW5HaXREaXIucmVwbGFjZSgvXFwvXFwuZ2l0JC8sICcnKTtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICBzb3VyY2VSb290OiBjdXJyZW50RGlyLFxuICAgICAgICAgIHJlcG9Sb290XG4gICAgICAgIH07XG4gICAgICB9XG4gICAgfSBjYXRjaCAoZXJyb3I6IHVua25vd24pIHtcbiAgICAgIGlmICgoZXJyb3IgYXMgTm9kZUpTLkVycm5vRXhjZXB0aW9uKS5jb2RlICE9PSAnRU5PRU5UJykge1xuICAgICAgICB0aHJvdyBlcnJvcjtcbiAgICAgIH1cbiAgICB9XG4gICAgY3VycmVudERpciA9IHBhdGguZGlybmFtZShjdXJyZW50RGlyKTtcbiAgfVxuICB0aHJvdyBuZXcgRXJyb3IoJ05vdCBpbiBhIGdpdCByZXBvc2l0b3J5Jyk7XG59XG5cbi8qKlxuICogUmVzb2x2ZXMgdGhlIEhFQUQgY29tbWl0IFNIQSBmb3IgYSByZXBvc2l0b3J5IGRpcmVjdG9yeS5cbiAqXG4gKiBAcGFyYW0gY3dkIC0gUmVwb3NpdG9yeSBkaXJlY3RvcnkgcGFzc2VkIHRvIGBnaXQgcmV2LXBhcnNlIEhFQURgLlxuICogQHJldHVybnMgVHJpbW1lZCBjb21taXQgU0hBIHN0cmluZy5cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHJlc29sdmVIZWFkKGN3ZDogc3RyaW5nKTogUHJvbWlzZTxzdHJpbmc+IHtcbiAgY29uc3QgeyBzdGRvdXQgfSA9IGF3YWl0IGV4ZWNGaWxlQXN5bmMoJ2dpdCcsIFsncmV2LXBhcnNlJywgJ0hFQUQnXSwgeyBjd2QsIHRpbWVvdXQ6IDVfMDAwIH0pO1xuICByZXR1cm4gc3Rkb3V0LnRyaW0oKTtcbn1cblxuLyoqXG4gKiBDaGVja3Mgd2hldGhlciBhIHdvcmt0cmVlIHBhdGggaXMgYWxyZWFkeSByZWdpc3RlcmVkIHdpdGggZ2l0LlxuICpcbiAqIEBwYXJhbSByZXBvUm9vdCAtIFByaW1hcnkgcmVwb3NpdG9yeSByb290IHdoZXJlIGdpdCBjb21tYW5kcyBydW4uXG4gKiBAcGFyYW0gd29ya3RyZWVEaXIgLSBBYnNvbHV0ZSB3b3JrdHJlZSBwYXRoIGJlaW5nIGNyZWF0ZWQuXG4gKiBAcmV0dXJucyBUcnVlIHdoZW4gYGdpdCB3b3JrdHJlZSBsaXN0YCBhbHJlYWR5IGNvbnRhaW5zIGB3b3JrdHJlZURpcmAuXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBjaGVja1dvcmt0cmVlRXhpc3RzKHJlcG9Sb290OiBzdHJpbmcsIHdvcmt0cmVlRGlyOiBzdHJpbmcpOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgY29uc3QgeyBzdGRvdXQgfSA9IGF3YWl0IGV4ZWNGaWxlQXN5bmMoJ2dpdCcsIFsnd29ya3RyZWUnLCAnbGlzdCddLCB7IGN3ZDogcmVwb1Jvb3QsIHRpbWVvdXQ6IDMwXzAwMCB9KTtcbiAgcmV0dXJuIHN0ZG91dC5pbmNsdWRlcyh3b3JrdHJlZURpcik7XG59XG5cbi8qKlxuICogQ2hlY2tzIHdoZXRoZXIgYSBicmFuY2ggYWxyZWFkeSBleGlzdHMgaW4gdGhlIHJlcG9zaXRvcnkuXG4gKlxuICogQHBhcmFtIHJlcG9Sb290IC0gUHJpbWFyeSByZXBvc2l0b3J5IHJvb3Qgd2hlcmUgZ2l0IGNvbW1hbmRzIHJ1bi5cbiAqIEBwYXJhbSBicmFuY2hOYW1lIC0gQnJhbmNoIG5hbWUgdG8gcXVlcnkuXG4gKiBAcmV0dXJucyBUcnVlIHdoZW4gYXQgbGVhc3Qgb25lIG1hdGNoaW5nIGxvY2FsIGJyYW5jaCBpcyBsaXN0ZWQuXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBjaGVja0JyYW5jaEV4aXN0cyhyZXBvUm9vdDogc3RyaW5nLCBicmFuY2hOYW1lOiBzdHJpbmcpOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgY29uc3QgeyBzdGRvdXQgfSA9IGF3YWl0IGV4ZWNGaWxlQXN5bmMoJ2dpdCcsIFsnYnJhbmNoJywgJy0tbGlzdCcsIGJyYW5jaE5hbWVdLCB7XG4gICAgY3dkOiByZXBvUm9vdCxcbiAgICB0aW1lb3V0OiAzMF8wMDBcbiAgfSk7XG4gIHJldHVybiBzdGRvdXQudHJpbSgpLmxlbmd0aCA+IDA7XG59XG5cbmludGVyZmFjZSBBZGRXb3JrdHJlZU9wdGlvbnMge1xuICByZXBvUm9vdDogc3RyaW5nO1xuICB3b3JrdHJlZURpcjogc3RyaW5nO1xuICBicmFuY2hOYW1lOiBzdHJpbmc7XG4gIGJyYW5jaEV4aXN0czogYm9vbGVhbjtcbiAgc3RhcnRQb2ludDogc3RyaW5nO1xufVxuXG4vKipcbiAqIEFkZHMgYSBnaXQgd29ya3RyZWUsIGNyZWF0aW5nIHRoZSBicmFuY2ggd2hlbiBuZWVkZWQuXG4gKlxuICogVXNlcyBgZ2l0IHdvcmt0cmVlIGFkZCAtYmAgZm9yIG5ldyBicmFuY2hlcyBhbmQgcGxhaW4gYGdpdCB3b3JrdHJlZSBhZGRgXG4gKiB3aGVuIGF0dGFjaGluZyB0byBhbiBleGlzdGluZyBicmFuY2guXG4gKlxuICogQHBhcmFtIG9wdHMgLSBXb3JrdHJlZSBjcmVhdGlvbiBvcHRpb25zIGFuZCBicmFuY2ggZXhpc3RlbmNlIHN0YXRlLlxuICogQHJldHVybnMgTm8gdmFsdWUuXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBhZGRXb3JrdHJlZShvcHRzOiBBZGRXb3JrdHJlZU9wdGlvbnMpOiBQcm9taXNlPHZvaWQ+IHtcbiAgY29uc3QgYXJncyA9IG9wdHMuYnJhbmNoRXhpc3RzXG4gICAgPyBbJ3dvcmt0cmVlJywgJ2FkZCcsIG9wdHMud29ya3RyZWVEaXIsIG9wdHMuYnJhbmNoTmFtZV1cbiAgICA6IFsnd29ya3RyZWUnLCAnYWRkJywgJy1iJywgb3B0cy5icmFuY2hOYW1lLCBvcHRzLndvcmt0cmVlRGlyLCBvcHRzLnN0YXJ0UG9pbnRdO1xuICBhd2FpdCBleGVjRmlsZUFzeW5jKCdnaXQnLCBhcmdzLCB7IGN3ZDogb3B0cy5yZXBvUm9vdCwgdGltZW91dDogMzBfMDAwIH0pO1xufVxuXG5pbnRlcmZhY2UgSWdub3JlZFBhdGhzIHtcbiAgZGlyZWN0b3JpZXM6IHN0cmluZ1tdO1xuICBmaWxlczogc3RyaW5nW107XG59XG5cbi8qKlxuICogRGlzY292ZXJzIGlnbm9yZWQgZmlsZXMgYW5kIGRpcmVjdG9yaWVzIHVuZGVyIGEgc291cmNlIHJvb3QuXG4gKlxuICogUGF0aHMgYXJlIHJldHVybmVkIHJlbGF0aXZlIHRvIGBzb3VyY2VSb290YCBhbmQgYC53b3JrdHJlZXNgIGNvbnRlbnQgaXNcbiAqIGZpbHRlcmVkIG91dCB0byBhdm9pZCBzZWxmLXJlZmVyZW50aWFsIHN5bWxpbmtpbmcuXG4gKlxuICogQHBhcmFtIHNvdXJjZVJvb3QgLSBTb3VyY2UgY2hlY2tvdXQgcm9vdCB1c2VkIGZvciBnaXQgZGlzY292ZXJ5LlxuICogQHJldHVybnMgU2VwYXJhdGUgbGlzdHMgb2YgaWdub3JlZCBkaXJlY3RvcmllcyBhbmQgaWdub3JlZCBmaWxlcy5cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGRpc2NvdmVySWdub3JlZFBhdGhzKHNvdXJjZVJvb3Q6IHN0cmluZyk6IFByb21pc2U8SWdub3JlZFBhdGhzPiB7XG4gIGNvbnN0IHsgc3Rkb3V0IH0gPSBhd2FpdCBleGVjRmlsZUFzeW5jKFxuICAgICdnaXQnLFxuICAgIFsnLUMnLCBzb3VyY2VSb290LCAnbHMtZmlsZXMnLCAnLS1pZ25vcmVkJywgJy0tZXhjbHVkZS1zdGFuZGFyZCcsICctLWRpcmVjdG9yeScsICctLW90aGVycyddLFxuICAgIHsgY3dkOiBzb3VyY2VSb290LCB0aW1lb3V0OiAzMF8wMDAgfVxuICApO1xuXG4gIGNvbnN0IGxpbmVzID0gc3Rkb3V0LnNwbGl0KCdcXG4nKS5maWx0ZXIoKGxpbmUpID0+IGxpbmUubGVuZ3RoID4gMCAmJiAhbGluZS5zdGFydHNXaXRoKCcud29ya3RyZWVzJykpO1xuICBjb25zdCBkaXJlY3RvcmllcyA9IGxpbmVzLmZpbHRlcigobCkgPT4gbC5lbmRzV2l0aCgnLycpKS5tYXAoKGwpID0+IGwuc2xpY2UoMCwgLTEpKTtcbiAgY29uc3QgZmlsZXMgPSBsaW5lcy5maWx0ZXIoKGwpID0+ICFsLmVuZHNXaXRoKCcvJykpO1xuXG4gIHJldHVybiB7IGRpcmVjdG9yaWVzLCBmaWxlcyB9O1xufVxuXG5pbnRlcmZhY2UgU3ltbGlua0lnbm9yZWRQYXRoc09wdGlvbnMge1xuICBzb3VyY2VSb290OiBzdHJpbmc7XG4gIHdvcmt0cmVlRGlyOiBzdHJpbmc7XG4gIGlnbm9yZWQ6IElnbm9yZWRQYXRocztcbn1cblxuaW50ZXJmYWNlIFN5bWxpbmtJZ25vcmVkUGF0aHNSZXN1bHQge1xuICBkaXJDb3VudDogbnVtYmVyO1xuICBmaWxlQ291bnQ6IG51bWJlcjtcbn1cblxuLyoqXG4gKiBTeW1saW5rcyBpZ25vcmVkIGRpcmVjdG9yaWVzIGFuZCBmaWxlcyBmcm9tIHNvdXJjZSBjaGVja291dCBpbnRvIGEgd29ya3RyZWUuXG4gKlxuICogTmVzdGVkIGlnbm9yZWQgZGlyZWN0b3JpZXMgYXJlIGNvbGxhcHNlZCBzbyBvbmx5IHRvcC1sZXZlbCBpZ25vcmVkIGRpcmVjdG9yeVxuICogbGlua3MgYXJlIGNyZWF0ZWQuXG4gKlxuICogQHBhcmFtIG9wdHMgLSBTb3VyY2Ugcm9vdCwgZGVzdGluYXRpb24gd29ya3RyZWUsIGFuZCBpZ25vcmVkIHBhdGggbGlzdHMuXG4gKiBAcmV0dXJucyBDb3VudHMgb2Ygc3VjY2Vzc2Z1bGx5IGNyZWF0ZWQgZGlyZWN0b3J5IGFuZCBmaWxlIHN5bWxpbmtzLlxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gc3ltbGlua0lnbm9yZWRQYXRocyhvcHRzOiBTeW1saW5rSWdub3JlZFBhdGhzT3B0aW9ucyk6IFByb21pc2U8U3ltbGlua0lnbm9yZWRQYXRoc1Jlc3VsdD4ge1xuICBjb25zdCB7IHNvdXJjZVJvb3QsIHdvcmt0cmVlRGlyLCBpZ25vcmVkIH0gPSBvcHRzO1xuICBjb25zdCBkaXJTZXQgPSBuZXcgU2V0KGlnbm9yZWQuZGlyZWN0b3JpZXMpO1xuICBjb25zdCBub25OZXN0ZWREaXJzID0gaWdub3JlZC5kaXJlY3Rvcmllcy5maWx0ZXIoKGRpcikgPT4gIWlzTmVzdGVkVW5kZXIoZGlyLCBkaXJTZXQpKTtcblxuICBjb25zdCBjcmVhdGVEaXJTeW1saW5rID0gYXN5bmMgKGRpcjogc3RyaW5nKTogUHJvbWlzZTxib29sZWFuPiA9PiB7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHNvdXJjZVBhdGggPSBwYXRoLmpvaW4oc291cmNlUm9vdCwgZGlyKTtcbiAgICAgIHRyeSB7XG4gICAgICAgIGF3YWl0IGZzLmxzdGF0KHNvdXJjZVBhdGgpO1xuICAgICAgfSBjYXRjaCAoZXJyb3I6IHVua25vd24pIHtcbiAgICAgICAgaWYgKChlcnJvciBhcyBOb2RlSlMuRXJybm9FeGNlcHRpb24pLmNvZGUgPT09ICdFTk9FTlQnKSB7XG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIHByb2Nlc3Muc3RkZXJyLndyaXRlKFxuICAgICAgICAgIGBjcmVhdGUtd29ya3RyZWU6IHVuZXhwZWN0ZWQgZXJyb3IgaW4gbHN0YXQ6ICR7ZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiBTdHJpbmcoZXJyb3IpfVxcbmBcbiAgICAgICAgKTtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgICAgY29uc3QgZGVzdFBhdGggPSBwYXRoLmpvaW4od29ya3RyZWVEaXIsIGRpcik7XG4gICAgICBjb25zdCBwYXJlbnREaXIgPSBwYXRoLmRpcm5hbWUoZGlyKTtcbiAgICAgIGlmIChwYXJlbnREaXIgIT09ICcuJykge1xuICAgICAgICBhd2FpdCBmcy5ta2RpcihwYXRoLmpvaW4od29ya3RyZWVEaXIsIHBhcmVudERpciksIHsgcmVjdXJzaXZlOiB0cnVlIH0pO1xuICAgICAgfVxuICAgICAgYXdhaXQgZnMuc3ltbGluayhzb3VyY2VQYXRoLCBkZXN0UGF0aCk7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9IGNhdGNoIChlcnJvcjogdW5rbm93bikge1xuICAgICAgY29uc3QgY29kZSA9IChlcnJvciBhcyBOb2RlSlMuRXJybm9FeGNlcHRpb24pLmNvZGU7XG4gICAgICBpZiAoY29kZSA9PT0gJ0VFWElTVCcgfHwgY29kZSA9PT0gJ0VOT0VOVCcpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgICAgcHJvY2Vzcy5zdGRlcnIud3JpdGUoXG4gICAgICAgIGBjcmVhdGUtd29ya3RyZWU6IHVuZXhwZWN0ZWQgZXJyb3IgaW4gc3ltbGluazogJHtlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6IFN0cmluZyhlcnJvcil9XFxuYFxuICAgICAgKTtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gIH07XG5cbiAgY29uc3QgY3JlYXRlRmlsZVN5bWxpbmsgPSBhc3luYyAoZmlsZTogc3RyaW5nKTogUHJvbWlzZTxib29sZWFuPiA9PiB7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHNvdXJjZVBhdGggPSBwYXRoLmpvaW4oc291cmNlUm9vdCwgZmlsZSk7XG4gICAgICB0cnkge1xuICAgICAgICBhd2FpdCBmcy5sc3RhdChzb3VyY2VQYXRoKTtcbiAgICAgIH0gY2F0Y2ggKGVycm9yOiB1bmtub3duKSB7XG4gICAgICAgIGlmICgoZXJyb3IgYXMgTm9kZUpTLkVycm5vRXhjZXB0aW9uKS5jb2RlID09PSAnRU5PRU5UJykge1xuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBwcm9jZXNzLnN0ZGVyci53cml0ZShcbiAgICAgICAgICBgY3JlYXRlLXdvcmt0cmVlOiB1bmV4cGVjdGVkIGVycm9yIGluIGxzdGF0OiAke2Vycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogU3RyaW5nKGVycm9yKX1cXG5gXG4gICAgICAgICk7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IGRlc3RQYXRoID0gcGF0aC5qb2luKHdvcmt0cmVlRGlyLCBmaWxlKTtcbiAgICAgIGNvbnN0IHBhcmVudERpciA9IHBhdGguZGlybmFtZShmaWxlKTtcbiAgICAgIGlmIChwYXJlbnREaXIgIT09ICcuJykge1xuICAgICAgICBhd2FpdCBmcy5ta2RpcihwYXRoLmpvaW4od29ya3RyZWVEaXIsIHBhcmVudERpciksIHsgcmVjdXJzaXZlOiB0cnVlIH0pO1xuICAgICAgfVxuICAgICAgYXdhaXQgZnMuc3ltbGluayhzb3VyY2VQYXRoLCBkZXN0UGF0aCk7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9IGNhdGNoIChlcnJvcjogdW5rbm93bikge1xuICAgICAgY29uc3QgY29kZSA9IChlcnJvciBhcyBOb2RlSlMuRXJybm9FeGNlcHRpb24pLmNvZGU7XG4gICAgICBpZiAoY29kZSA9PT0gJ0VFWElTVCcgfHwgY29kZSA9PT0gJ0VOT0VOVCcpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgICAgcHJvY2Vzcy5zdGRlcnIud3JpdGUoXG4gICAgICAgIGBjcmVhdGUtd29ya3RyZWU6IHVuZXhwZWN0ZWQgZXJyb3IgaW4gc3ltbGluazogJHtlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6IFN0cmluZyhlcnJvcil9XFxuYFxuICAgICAgKTtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gIH07XG5cbiAgY29uc3QgZGlyUmVzdWx0cyA9IGF3YWl0IFByb21pc2UuYWxsKG5vbk5lc3RlZERpcnMubWFwKGNyZWF0ZURpclN5bWxpbmspKTtcbiAgY29uc3Qgbm9uTmVzdGVkRmlsZXMgPSBpZ25vcmVkLmZpbGVzLmZpbHRlcigoZmlsZSkgPT4gIWlzTmVzdGVkVW5kZXIoZmlsZSwgZGlyU2V0KSk7XG4gIGNvbnN0IGZpbGVSZXN1bHRzID0gYXdhaXQgUHJvbWlzZS5hbGwobm9uTmVzdGVkRmlsZXMubWFwKGNyZWF0ZUZpbGVTeW1saW5rKSk7XG5cbiAgY29uc3QgZGlyQ291bnQgPSBkaXJSZXN1bHRzLmZpbHRlcigocikgPT4gcikubGVuZ3RoO1xuICBjb25zdCBmaWxlQ291bnQgPSBmaWxlUmVzdWx0cy5maWx0ZXIoKHIpID0+IHIpLmxlbmd0aDtcblxuICByZXR1cm4geyBkaXJDb3VudCwgZmlsZUNvdW50IH07XG59XG5cbi8qKlxuICogUmVwbGljYXRlcyByb290LWxldmVsIHN5bWxpbmtzIGZyb20gdGhlIHNvdXJjZSBjaGVja291dCBpbnRvIHRoZSB3b3JrdHJlZS5cbiAqXG4gKiBFeGlzdGluZyBkZXN0aW5hdGlvbiBlbnRyaWVzIGFyZSBsZWZ0IHVudG91Y2hlZC5cbiAqXG4gKiBAcGFyYW0gc291cmNlUm9vdCAtIFNvdXJjZSBjaGVja291dCByb290LlxuICogQHBhcmFtIHdvcmt0cmVlRGlyIC0gRGVzdGluYXRpb24gd29ya3RyZWUgcm9vdC5cbiAqIEByZXR1cm5zIE51bWJlciBvZiBzeW1saW5rcyBjcmVhdGVkIGluIHRoZSBkZXN0aW5hdGlvbiByb290LlxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gY29weUV4aXN0aW5nU3ltbGlua3Moc291cmNlUm9vdDogc3RyaW5nLCB3b3JrdHJlZURpcjogc3RyaW5nKTogUHJvbWlzZTxudW1iZXI+IHtcbiAgY29uc3QgZW50cmllcyA9IGF3YWl0IGZzLnJlYWRkaXIoc291cmNlUm9vdCwgeyB3aXRoRmlsZVR5cGVzOiB0cnVlIH0pO1xuICBjb25zdCBzeW1saW5rcyA9IGVudHJpZXMuZmlsdGVyKChlKSA9PiBlLmlzU3ltYm9saWNMaW5rKCkgJiYgZS5uYW1lICE9PSAnLmdpdCcgJiYgZS5uYW1lICE9PSAnLndvcmt0cmVlcycpO1xuXG4gIGNvbnN0IGNvcHlTeW1saW5rID0gYXN5bmMgKG5hbWU6IHN0cmluZyk6IFByb21pc2U8Ym9vbGVhbj4gPT4ge1xuICAgIGNvbnN0IGRlc3RQYXRoID0gcGF0aC5qb2luKHdvcmt0cmVlRGlyLCBuYW1lKTtcbiAgICB0cnkge1xuICAgICAgYXdhaXQgZnMubHN0YXQoZGVzdFBhdGgpO1xuICAgICAgcmV0dXJuIGZhbHNlOyAvLyBEZXN0aW5hdGlvbiBhbHJlYWR5IGV4aXN0c1xuICAgIH0gY2F0Y2ggKGVycm9yOiB1bmtub3duKSB7XG4gICAgICBpZiAoKGVycm9yIGFzIE5vZGVKUy5FcnJub0V4Y2VwdGlvbikuY29kZSAhPT0gJ0VOT0VOVCcpIHtcbiAgICAgICAgdGhyb3cgZXJyb3I7XG4gICAgICB9XG4gICAgfVxuICAgIGNvbnN0IHNvdXJjZUxpbmtQYXRoID0gcGF0aC5qb2luKHNvdXJjZVJvb3QsIG5hbWUpO1xuXG4gICAgLy8gU2tpcCBzZWxmLXJlZmVyZW5jaW5nIHN5bWxpbmtzICh0YXJnZXQgcmVzb2x2ZXMgYmFjayB0byB0aGUgc3ltbGluayBpdHNlbGYpXG4gICAgY29uc3QgdGFyZ2V0ID0gYXdhaXQgZnMucmVhZGxpbmsoc291cmNlTGlua1BhdGgpO1xuICAgIGNvbnN0IHJlc29sdmVkVGFyZ2V0ID0gcGF0aC5yZXNvbHZlKHNvdXJjZVJvb3QsIHRhcmdldCk7XG4gICAgaWYgKHJlc29sdmVkVGFyZ2V0ID09PSBzb3VyY2VMaW5rUGF0aCkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIGF3YWl0IGZzLnN5bWxpbmsoc291cmNlTGlua1BhdGgsIGRlc3RQYXRoKTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfTtcblxuICBjb25zdCByZXN1bHRzID0gYXdhaXQgUHJvbWlzZS5hbGwoc3ltbGlua3MubWFwKChlKSA9PiBjb3B5U3ltbGluayhlLm5hbWUpKSk7XG4gIHJldHVybiByZXN1bHRzLmZpbHRlcigocikgPT4gcikubGVuZ3RoO1xufVxuXG5pbnRlcmZhY2UgUmVyb3V0ZU5vZGVNb2R1bGVzT3B0aW9ucyB7XG4gIHNvdXJjZU5vZGVNb2R1bGVzOiBzdHJpbmc7XG4gIGRlc3ROb2RlTW9kdWxlczogc3RyaW5nO1xufVxuXG4vKipcbiAqIE1pcnJvcnMgYSBub2RlX21vZHVsZXMgdHJlZSBpbnRvIHRoZSB3b3JrdHJlZSB1c2luZyBzeW1saW5rcy5cbiAqXG4gKiBJbnRlcm5hbCB3b3Jrc3BhY2UgbGlua3Mga2VlcCB0aGVpciBvcmlnaW5hbCByZWxhdGl2ZSB0YXJnZXRzIHdoaWxlIGV4dGVybmFsXG4gKiBsaW5rcyBhbmQgbm9uLWxpbmsgZW50cmllcyBhcmUgcmVwcmVzZW50ZWQgYXMgc3ltbGlua3MgdG8gc291cmNlIHBhdGhzLlxuICpcbiAqIEBwYXJhbSBvcHRzIC0gU291cmNlIGFuZCBkZXN0aW5hdGlvbiBub2RlX21vZHVsZXMgZGlyZWN0b3JpZXMuXG4gKiBAcmV0dXJucyBDb3VudCBvZiBpbnRlcm5hbCB3b3Jrc3BhY2Ugc3ltbGlua3MgcmVjcmVhdGVkIGJ5IHRhcmdldCBwYXRoLlxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcmVyb3V0ZU5vZGVNb2R1bGVzKG9wdHM6IFJlcm91dGVOb2RlTW9kdWxlc09wdGlvbnMpOiBQcm9taXNlPG51bWJlcj4ge1xuICBjb25zdCB7IHNvdXJjZU5vZGVNb2R1bGVzLCBkZXN0Tm9kZU1vZHVsZXMgfSA9IG9wdHM7XG5cbiAgdHJ5IHtcbiAgICBhd2FpdCBmcy5sc3RhdChzb3VyY2VOb2RlTW9kdWxlcyk7XG4gIH0gY2F0Y2ggKGVycm9yOiB1bmtub3duKSB7XG4gICAgaWYgKChlcnJvciBhcyBOb2RlSlMuRXJybm9FeGNlcHRpb24pLmNvZGUgPT09ICdFTk9FTlQnKSB7XG4gICAgICByZXR1cm4gMDtcbiAgICB9XG4gICAgdGhyb3cgZXJyb3I7XG4gIH1cblxuICB0cnkge1xuICAgIGNvbnN0IGRlc3RTdGF0cyA9IGF3YWl0IGZzLmxzdGF0KGRlc3ROb2RlTW9kdWxlcyk7XG4gICAgaWYgKGRlc3RTdGF0cy5pc1N5bWJvbGljTGluaygpKSB7XG4gICAgICBhd2FpdCBmcy51bmxpbmsoZGVzdE5vZGVNb2R1bGVzKTtcbiAgICB9XG4gIH0gY2F0Y2ggKGVycm9yOiB1bmtub3duKSB7XG4gICAgaWYgKChlcnJvciBhcyBOb2RlSlMuRXJybm9FeGNlcHRpb24pLmNvZGUgIT09ICdFTk9FTlQnKSB7XG4gICAgICB0aHJvdyBlcnJvcjtcbiAgICB9XG4gIH1cblxuICBhd2FpdCBmcy5ta2RpcihkZXN0Tm9kZU1vZHVsZXMsIHsgcmVjdXJzaXZlOiB0cnVlIH0pO1xuXG4gIGNvbnN0IGVudHJpZXMgPSBhd2FpdCBmcy5yZWFkZGlyKHNvdXJjZU5vZGVNb2R1bGVzLCB7IHdpdGhGaWxlVHlwZXM6IHRydWUgfSk7XG4gIGNvbnN0IGNvdW50cyA9IGF3YWl0IFByb21pc2UuYWxsKFxuICAgIGVudHJpZXMubWFwKGFzeW5jIChlbnRyeSk6IFByb21pc2U8bnVtYmVyPiA9PiB7XG4gICAgICBjb25zdCBzb3VyY2VQYXRoID0gcGF0aC5qb2luKHNvdXJjZU5vZGVNb2R1bGVzLCBlbnRyeS5uYW1lKTtcbiAgICAgIGNvbnN0IGRlc3RQYXRoID0gcGF0aC5qb2luKGRlc3ROb2RlTW9kdWxlcywgZW50cnkubmFtZSk7XG5cbiAgICAgIGlmIChlbnRyeS5pc1N5bWJvbGljTGluaygpKSB7XG4gICAgICAgIGNvbnN0IHRhcmdldCA9IGF3YWl0IGZzLnJlYWRsaW5rKHNvdXJjZVBhdGgpO1xuICAgICAgICBpZiAoaXNJbnRlcm5hbFN5bWxpbmsodGFyZ2V0KSkge1xuICAgICAgICAgIGF3YWl0IGZzLnN5bWxpbmsodGFyZ2V0LCBkZXN0UGF0aCk7XG4gICAgICAgICAgcmV0dXJuIDE7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgYXdhaXQgZnMuc3ltbGluayhzb3VyY2VQYXRoLCBkZXN0UGF0aCk7XG4gICAgICAgICAgcmV0dXJuIDA7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAoZW50cnkuaXNEaXJlY3RvcnkoKSAmJiBlbnRyeS5uYW1lLnN0YXJ0c1dpdGgoJ0AnKSkge1xuICAgICAgICBhd2FpdCBmcy5ta2RpcihkZXN0UGF0aCwgeyByZWN1cnNpdmU6IHRydWUgfSk7XG4gICAgICAgIGNvbnN0IHNjb3BlRW50cmllcyA9IGF3YWl0IGZzLnJlYWRkaXIoc291cmNlUGF0aCwgeyB3aXRoRmlsZVR5cGVzOiB0cnVlIH0pO1xuICAgICAgICBjb25zdCBzY29wZUNvdW50cyA9IGF3YWl0IFByb21pc2UuYWxsKFxuICAgICAgICAgIHNjb3BlRW50cmllcy5tYXAoYXN5bmMgKHNjb3BlRW50cnkpOiBQcm9taXNlPG51bWJlcj4gPT4ge1xuICAgICAgICAgICAgY29uc3Qgc2NvcGVTb3VyY2VQYXRoID0gcGF0aC5qb2luKHNvdXJjZVBhdGgsIHNjb3BlRW50cnkubmFtZSk7XG4gICAgICAgICAgICBjb25zdCBzY29wZURlc3RQYXRoID0gcGF0aC5qb2luKGRlc3RQYXRoLCBzY29wZUVudHJ5Lm5hbWUpO1xuXG4gICAgICAgICAgICBpZiAoc2NvcGVFbnRyeS5pc1N5bWJvbGljTGluaygpKSB7XG4gICAgICAgICAgICAgIGNvbnN0IHRhcmdldCA9IGF3YWl0IGZzLnJlYWRsaW5rKHNjb3BlU291cmNlUGF0aCk7XG4gICAgICAgICAgICAgIGlmIChpc0ludGVybmFsU3ltbGluayh0YXJnZXQpKSB7XG4gICAgICAgICAgICAgICAgYXdhaXQgZnMuc3ltbGluayh0YXJnZXQsIHNjb3BlRGVzdFBhdGgpO1xuICAgICAgICAgICAgICAgIHJldHVybiAxO1xuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGF3YWl0IGZzLnN5bWxpbmsoc2NvcGVTb3VyY2VQYXRoLCBzY29wZURlc3RQYXRoKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gMDtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgYXdhaXQgZnMuc3ltbGluayhzY29wZVNvdXJjZVBhdGgsIHNjb3BlRGVzdFBhdGgpO1xuICAgICAgICAgICAgICByZXR1cm4gMDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KVxuICAgICAgICApO1xuICAgICAgICByZXR1cm4gc2NvcGVDb3VudHMucmVkdWNlKChzdW0sIGMpID0+IHN1bSArIGMsIDApO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgYXdhaXQgZnMuc3ltbGluayhzb3VyY2VQYXRoLCBkZXN0UGF0aCk7XG4gICAgICAgIHJldHVybiAwO1xuICAgICAgfVxuICAgIH0pXG4gICk7XG5cbiAgcmV0dXJuIGNvdW50cy5yZWR1Y2UoKHN1bSwgYykgPT4gc3VtICsgYywgMCk7XG59XG5cbmludGVyZmFjZSBSZXJvdXRlQWxsTm9kZU1vZHVsZXNPcHRpb25zIHtcbiAgc291cmNlUm9vdDogc3RyaW5nO1xuICB3b3JrdHJlZURpcjogc3RyaW5nO1xuICByZXBvUm9vdDogc3RyaW5nO1xufVxuXG4vKipcbiAqIFJlcm91dGVzIHJvb3QgYW5kIHBlci1wYWNrYWdlIG5vZGVfbW9kdWxlcyBkaXJlY3RvcmllcyBpbnRvIHRoZSB3b3JrdHJlZS5cbiAqXG4gKiBUaGUgb3BlcmF0aW9uIGlzIHNraXBwZWQgd2hlbiB0aGUgcmVwb3NpdG9yeSBoYXMgbm8gd29ya3NwYWNlIGNvbmZpZ3VyYXRpb24uXG4gKlxuICogQHBhcmFtIG9wdHMgLSBTb3VyY2Ugcm9vdCwgZGVzdGluYXRpb24gd29ya3RyZWUgcm9vdCwgYW5kIHJlcG8gcm9vdC5cbiAqIEByZXR1cm5zIFRvdGFsIG51bWJlciBvZiByZWNyZWF0ZWQgaW50ZXJuYWwgd29ya3NwYWNlIHN5bWxpbmtzLlxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcmVyb3V0ZUFsbE5vZGVNb2R1bGVzKG9wdHM6IFJlcm91dGVBbGxOb2RlTW9kdWxlc09wdGlvbnMpOiBQcm9taXNlPG51bWJlcj4ge1xuICBjb25zdCB7IHNvdXJjZVJvb3QsIHdvcmt0cmVlRGlyLCByZXBvUm9vdCB9ID0gb3B0cztcblxuICBsZXQgcGFja2FnZUpzb246IHsgd29ya3NwYWNlcz86IHN0cmluZ1tdIH07XG4gIHRyeSB7XG4gICAgY29uc3QgcGFja2FnZUpzb25Db250ZW50ID0gYXdhaXQgZnMucmVhZEZpbGUocGF0aC5qb2luKHJlcG9Sb290LCAncGFja2FnZS5qc29uJyksICd1dGYtOCcpO1xuICAgIHBhY2thZ2VKc29uID0gSlNPTi5wYXJzZShwYWNrYWdlSnNvbkNvbnRlbnQpO1xuICB9IGNhdGNoIChlcnJvcjogdW5rbm93bikge1xuICAgIGlmICgoZXJyb3IgYXMgTm9kZUpTLkVycm5vRXhjZXB0aW9uKS5jb2RlID09PSAnRU5PRU5UJykge1xuICAgICAgcmV0dXJuIDA7XG4gICAgfVxuICAgIHRocm93IGVycm9yO1xuICB9XG5cbiAgaWYgKCFwYWNrYWdlSnNvbi53b3Jrc3BhY2VzKSB7XG4gICAgcmV0dXJuIDA7XG4gIH1cblxuICBsZXQgdG90YWxDb3VudCA9IDA7XG5cbiAgdG90YWxDb3VudCArPSBhd2FpdCByZXJvdXRlTm9kZU1vZHVsZXMoe1xuICAgIHNvdXJjZU5vZGVNb2R1bGVzOiBwYXRoLmpvaW4oc291cmNlUm9vdCwgJ25vZGVfbW9kdWxlcycpLFxuICAgIGRlc3ROb2RlTW9kdWxlczogcGF0aC5qb2luKHdvcmt0cmVlRGlyLCAnbm9kZV9tb2R1bGVzJylcbiAgfSk7XG5cbiAgY29uc3QgcGFja2FnZXNEaXIgPSBwYXRoLmpvaW4oc291cmNlUm9vdCwgJ3BhY2thZ2VzJyk7XG4gIHRyeSB7XG4gICAgY29uc3QgcGFja2FnZUVudHJpZXMgPSBhd2FpdCBmcy5yZWFkZGlyKHBhY2thZ2VzRGlyLCB7IHdpdGhGaWxlVHlwZXM6IHRydWUgfSk7XG4gICAgZm9yIChjb25zdCBlbnRyeSBvZiBwYWNrYWdlRW50cmllcykge1xuICAgICAgaWYgKGVudHJ5LmlzRGlyZWN0b3J5KCkpIHtcbiAgICAgICAgY29uc3QgcGtnTm9kZU1vZHVsZXMgPSBwYXRoLmpvaW4ocGFja2FnZXNEaXIsIGVudHJ5Lm5hbWUsICdub2RlX21vZHVsZXMnKTtcbiAgICAgICAgbGV0IG5vZGVNb2R1bGVzRXhpc3RzID0gZmFsc2U7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgYXdhaXQgZnMubHN0YXQocGtnTm9kZU1vZHVsZXMpO1xuICAgICAgICAgIG5vZGVNb2R1bGVzRXhpc3RzID0gdHJ1ZTtcbiAgICAgICAgfSBjYXRjaCAoZXJyb3I6IHVua25vd24pIHtcbiAgICAgICAgICBpZiAoKGVycm9yIGFzIE5vZGVKUy5FcnJub0V4Y2VwdGlvbikuY29kZSAhPT0gJ0VOT0VOVCcpIHtcbiAgICAgICAgICAgIHRocm93IGVycm9yO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAobm9kZU1vZHVsZXNFeGlzdHMpIHtcbiAgICAgICAgICBjb25zdCBkZXN0UGFja2FnZURpciA9IHBhdGguam9pbih3b3JrdHJlZURpciwgJ3BhY2thZ2VzJywgZW50cnkubmFtZSk7XG4gICAgICAgICAgYXdhaXQgZnMubWtkaXIoZGVzdFBhY2thZ2VEaXIsIHsgcmVjdXJzaXZlOiB0cnVlIH0pO1xuICAgICAgICAgIHRvdGFsQ291bnQgKz0gYXdhaXQgcmVyb3V0ZU5vZGVNb2R1bGVzKHtcbiAgICAgICAgICAgIHNvdXJjZU5vZGVNb2R1bGVzOiBwa2dOb2RlTW9kdWxlcyxcbiAgICAgICAgICAgIGRlc3ROb2RlTW9kdWxlczogcGF0aC5qb2luKGRlc3RQYWNrYWdlRGlyLCAnbm9kZV9tb2R1bGVzJylcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfSBjYXRjaCAoZXJyb3I6IHVua25vd24pIHtcbiAgICBpZiAoKGVycm9yIGFzIE5vZGVKUy5FcnJub0V4Y2VwdGlvbikuY29kZSAhPT0gJ0VOT0VOVCcpIHtcbiAgICAgIHRocm93IGVycm9yO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiB0b3RhbENvdW50O1xufVxuXG5pbnRlcmZhY2UgVXBkYXRlR2l0RXhjbHVkZU9wdGlvbnMge1xuICB3b3JrdHJlZURpcjogc3RyaW5nO1xuICByZXBvUm9vdDogc3RyaW5nO1xuICBkaXJlY3Rvcmllczogc3RyaW5nW107XG4gIGZpbGVzOiBzdHJpbmdbXTtcbn1cblxuLyoqXG4gKiBBcHBlbmRzIHN5bWxpbmtlZCBpZ25vcmVkIHBhdGhzIHRvIHRoZSB3b3JrdHJlZS1zcGVjaWZpYyBnaXQgZXhjbHVkZSBmaWxlLlxuICpcbiAqIEFsc28gZW5hYmxlcyBgZXh0ZW5zaW9ucy53b3JrdHJlZUNvbmZpZ2AgYW5kIHNldHMgd29ya3RyZWUtbG9jYWxcbiAqIGBjb3JlLmV4Y2x1ZGVzRmlsZWAgc28gZ2l0IHN0YXR1cyBpbiB0aGUgd29ya3RyZWUgaWdub3JlcyBpbmplY3RlZCBsaW5rcy5cbiAqXG4gKiBAcGFyYW0gb3B0cyAtIFdvcmt0cmVlIHBhdGgsIHJlcG8gcm9vdCwgYW5kIGlnbm9yZWQgcGF0aCBjYW5kaWRhdGVzLlxuICogQHJldHVybnMgTm8gdmFsdWUuXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiB1cGRhdGVHaXRFeGNsdWRlKG9wdHM6IFVwZGF0ZUdpdEV4Y2x1ZGVPcHRpb25zKTogUHJvbWlzZTx2b2lkPiB7XG4gIGNvbnN0IHsgd29ya3RyZWVEaXIsIHJlcG9Sb290LCBkaXJlY3RvcmllcywgZmlsZXMgfSA9IG9wdHM7XG5cbiAgY29uc3QgeyBzdGRvdXQ6IGdpdERpciB9ID0gYXdhaXQgZXhlY0ZpbGVBc3luYygnZ2l0JywgWyctQycsIHdvcmt0cmVlRGlyLCAncmV2LXBhcnNlJywgJy0tZ2l0LWRpciddLCB7XG4gICAgdGltZW91dDogNV8wMDBcbiAgfSk7XG4gIGNvbnN0IGV4Y2x1ZGVQYXRoID0gcGF0aC5qb2luKGdpdERpci50cmltKCksICdpbmZvJywgJ2V4Y2x1ZGUnKTtcbiAgYXdhaXQgZnMubWtkaXIocGF0aC5kaXJuYW1lKGV4Y2x1ZGVQYXRoKSwgeyByZWN1cnNpdmU6IHRydWUgfSk7XG5cbiAgY29uc3QgbGluZXMgPSBbJyMgU3ltbGlua3MgY3JlYXRlZCBieSBpbnN0YW50LXdvcmt0cmVlJ107XG5cbiAgZm9yIChjb25zdCBkaXIgb2YgZGlyZWN0b3JpZXMpIHtcbiAgICBpZiAoIWRpcikgY29udGludWU7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHN0YXRzID0gYXdhaXQgZnMubHN0YXQocGF0aC5qb2luKHdvcmt0cmVlRGlyLCBkaXIpKTtcbiAgICAgIGlmIChzdGF0cy5pc1N5bWJvbGljTGluaygpKSBsaW5lcy5wdXNoKGRpcik7XG4gICAgfSBjYXRjaCAoZXJyb3I6IHVua25vd24pIHtcbiAgICAgIGlmICgoZXJyb3IgYXMgTm9kZUpTLkVycm5vRXhjZXB0aW9uKS5jb2RlICE9PSAnRU5PRU5UJykge1xuICAgICAgICB0aHJvdyBlcnJvcjtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBmb3IgKGNvbnN0IGZpbGUgb2YgZmlsZXMpIHtcbiAgICBpZiAoIWZpbGUpIGNvbnRpbnVlO1xuICAgIHRyeSB7XG4gICAgICBjb25zdCBzdGF0cyA9IGF3YWl0IGZzLmxzdGF0KHBhdGguam9pbih3b3JrdHJlZURpciwgZmlsZSkpO1xuICAgICAgaWYgKHN0YXRzLmlzU3ltYm9saWNMaW5rKCkpIGxpbmVzLnB1c2goZmlsZSk7XG4gICAgfSBjYXRjaCAoZXJyb3I6IHVua25vd24pIHtcbiAgICAgIGlmICgoZXJyb3IgYXMgTm9kZUpTLkVycm5vRXhjZXB0aW9uKS5jb2RlICE9PSAnRU5PRU5UJykge1xuICAgICAgICB0aHJvdyBlcnJvcjtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBhd2FpdCBmcy5hcHBlbmRGaWxlKGV4Y2x1ZGVQYXRoLCBgJHtsaW5lcy5qb2luKCdcXG4nKX1cXG5gKTtcblxuICB0cnkge1xuICAgIGF3YWl0IGV4ZWNGaWxlQXN5bmMoJ2dpdCcsIFsnLUMnLCByZXBvUm9vdCwgJ2NvbmZpZycsICdleHRlbnNpb25zLndvcmt0cmVlQ29uZmlnJywgJ3RydWUnXSwgeyB0aW1lb3V0OiA1XzAwMCB9KTtcbiAgfSBjYXRjaCAoZXJyb3I6IHVua25vd24pIHtcbiAgICBwcm9jZXNzLnN0ZGVyci53cml0ZShcbiAgICAgIGBjcmVhdGUtd29ya3RyZWU6IGZhaWxlZCB0byBzZXQgd29ya3RyZWVDb25maWcgZXh0ZW5zaW9uOiAke2Vycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogU3RyaW5nKGVycm9yKX1cXG5gXG4gICAgKTtcbiAgfVxuXG4gIHRyeSB7XG4gICAgYXdhaXQgZXhlY0ZpbGVBc3luYygnZ2l0JywgWyctQycsIHdvcmt0cmVlRGlyLCAnY29uZmlnJywgJy0td29ya3RyZWUnLCAnY29yZS5leGNsdWRlc0ZpbGUnLCBleGNsdWRlUGF0aF0sIHtcbiAgICAgIHRpbWVvdXQ6IDVfMDAwXG4gICAgfSk7XG4gIH0gY2F0Y2ggKGVycm9yOiB1bmtub3duKSB7XG4gICAgcHJvY2Vzcy5zdGRlcnIud3JpdGUoXG4gICAgICBgY3JlYXRlLXdvcmt0cmVlOiBmYWlsZWQgdG8gc2V0IGNvcmUuZXhjbHVkZXNGaWxlOiAke2Vycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogU3RyaW5nKGVycm9yKX1cXG5gXG4gICAgKTtcbiAgfVxufVxuIiwgIlxuaW1wb3J0IGhhbmRsZXIgZnJvbSAnLi9pbnRlcnZpZXcudHMnO1xuaW1wb3J0IHsgZXhlY3V0ZUNvbW1hbmQgfSBmcm9tICcuLi8uLi8uLi9zZGsvc3JjL2NvbmZpZy9ydW50aW1lLnRzJztcblxuZXhlY3V0ZUNvbW1hbmQoaGFuZGxlcik7XG4iXSwKICAibWFwcGluZ3MiOiAiOzs7Ozs7Ozs7OztBQWdCQSxTQUFTLGtCQUFrQjs7O0FDeUtwQixTQUFTLGFBQ2QsUUFDQSxTQUNnQztBQUNoQyxRQUFNLEtBQUssT0FBTyxPQUFvQixZQUEwQztBQUM5RSxVQUFNLFFBQVEsT0FBTyxPQUFPO0FBQUEsRUFDOUI7QUFFQSxLQUFHLGNBQWM7QUFDakIsS0FBRyxLQUFLLE9BQU87QUFDZixLQUFHLGFBQWEsT0FBTztBQUN2QixLQUFHLGNBQWMsT0FBTztBQUN4QixLQUFHLE9BQU8sT0FBTztBQUNqQixLQUFHLHlCQUF5QixPQUFPO0FBQ25DLEtBQUcsa0JBQWtCLE9BQU87QUFDNUIsS0FBRyxVQUFVLE9BQU87QUFDcEIsS0FBRyxhQUFhLE9BQU87QUFFdkIsU0FBTztBQUNUOzs7QUM1TEEsU0FBUyxvQkFBb0I7QUFjdEIsSUFBTSxpQkFBaUI7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBSzVCLFNBQVM7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBTVQsYUFBYTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFNYixhQUFhO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBT2IsZ0JBQWdCO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQU1oQixjQUFjO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQU1kLGtCQUFrQjtBQUFBO0FBQUE7QUFBQTtB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R0FBRyxNQUFNLFVBQVUscUJBQXFCLEVBQUUsV0FBVyxTQUFTLENBQUM7QUFHbkYsTUFBSTtBQUNGLFVBQU0sc0JBQXNCLE9BQU8sUUFBUSxZQUFZLFFBQVEsTUFBTTtBQUFBLEVBQ3ZFLFNBQVMsT0FBTztBQUNkLFlBQVEsT0FBTyxLQUFLLHlCQUF5QjtBQUFBLE1BQzNDLE9BQU8sYUFBYSxLQUFLO0FBQUEsSUFDM0IsQ0FBQztBQUFBLEVBQ0g7QUFDRjs7O0FQcGZBLElBQU8sb0JBQVE7QUFBQSxFQUNiO0FBQUEsSUFDRSxZQUFZO0FBQUEsSUFDWixhQUFhO0FBQUEsSUFDYix3QkFBd0I7QUFBQSxJQUN4QixTQUFTO0FBQUEsRUFDWDtBQUFBLEVBQ0EsT0FBTyxPQUFvQixZQUEyQjtBQUNwRCxVQUFNLG1CQUFtQixPQUFPLFNBQVM7QUFBQSxNQUN2QyxRQUFRO0FBQUEsTUFDUixXQUFXLFdBQVc7QUFBQSxNQUN0QixRQUFRO0FBQUEsTUFDUiw2QkFBNkI7QUFBQSxJQUMvQixDQUFDO0FBQUEsRUFDSDtBQUNGOzs7QVd0Q0EsZUFBZSxpQkFBTzsiLAogICJuYW1lcyI6IFsicmVzb2x2ZSIsICJleGVjRmlsZSIsICJmcyIsICJwYXRoIiwgInByb21pc2lmeSIsICJwYXRoIiwgInJlc29sdmUiLCAiZXhlY0ZpbGVBc3luYyIsICJwcm9taXNpZnkiLCAiZXhlY0ZpbGUiLCAibG9nZ2VyIiwgInJlc29sdmUiXQp9Cg==
