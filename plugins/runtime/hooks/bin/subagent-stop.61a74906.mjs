#!/usr/bin/env -S node --enable-source-maps
import { createRequire as __createRequire } from "node:module";
import { fileURLToPath as __fileURLToPath } from "node:url";
import { dirname as __pathDirname } from "node:path";
const require = __createRequire(import.meta.url);
const __filename = __fileURLToPath(import.meta.url);
const __dirname = __pathDirname(__filename);

// src/subagent-stop.ts
import { readFile as readFile2 } from "node:fs/promises";

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

// ../../../../../../../node_modules/@goodfoot/claude-code-hooks/dist/env.js
import * as fs from "node:fs";
var CLAUDE_ENV_VARS = {
  /**
   * Absolute path to the project root directory where Claude Code was started.
   * Available in all hooks.
   */
  PROJECT_DIR: "CLAUDE_PROJECT_DIR",
  /**
   * Path to a file where SessionStart hooks can persist environment variables.
   * Variables written to this file will be available in all subsequent bash commands.
   * Only available in SessionStart hooks.
   */
  ENV_FILE: "CLAUDE_ENV_FILE",
  /**
   * Set to "true" when running in a remote (web) environment.
   * Not set or empty when running in local CLI environment.
   */
  REMOTE: "CLAUDE_CODE_REMOTE"
};
function getEnvFilePath() {
  return process.env[CLAUDE_ENV_VARS.ENV_FILE];
}
function persistEnvVar(name, value) {
  const envFile = getEnvFilePath();
  if (envFile === void 0) {
    throw new Error("persistEnvVar can only be used in SessionStart hooks. CLAUDE_ENV_FILE environment variable is not set.");
  }
  const escapedValue = escapeShellValue(value);
  const exportStatement = `export ${name}=${escapedValue}
`;
  fs.appendFileSync(envFile, exportStatement, "utf-8");
}
function persistEnvVars(vars) {
  for (const [name, value] of Object.entries(vars)) {
    persistEnvVar(name, value);
  }
}
function escapeShellValue(value) {
  const escaped = value.replace(/'/g, "'\\''");
  return `'${escaped}'`;
}

// ../../../../../../../node_modules/@goodfoot/claude-code-hooks/dist/hooks.js
function createHookFunction(hookEventName, config, handler) {
  const hookFn = async (input, context) => {
    return await handler(input, context);
  };
  hookFn.hookEventName = hookEventName;
  hookFn.matcher = config.matcher;
  hookFn.timeout = config.timeout;
  return hookFn;
}
function subagentStopHook(config, handler) {
  return createHookFunction("SubagentStop", config, handler);
}

// ../../../../../../../node_modules/@goodfoot/claude-code-hooks/dist/logger.js
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
   * import { logger } from '@goodfoot/claude-code-hooks';
   *
   * // Or create custom instance
   * const customLogger = new Logger({ logFilePath: '/var/log/hooks.log' });
   * ```
   */
  constructor(config = {}) {
    for (const level of LOG_LEVELS) {
      this.handlers.set(level, /* @__PURE__ */ new Set());
    }
    this.logFilePath = config.logFilePath ?? process.env.CLAUDE_CODE_HOOKS_LOG_FILE ?? null;
  }
  /**
   * Logs a debug message.
   *
   * Use for detailed debugging information that is typically only useful
   * during development or troubleshooting.
   * @param message - The debug message
   * @param context - Optional additional context
   * @example
   * ```typescript
   * logger.debug('Processing tool input', { toolName: 'Bash', inputSize: 256 });
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
   * @param message - The info message
   * @param context - Optional additional context
   * @example
   * ```typescript
   * logger.info('Session started', { source: 'startup', sessionId: 'abc123' });
   * ```
   */
  info(message, context) {
    this.emit("info", message, context);
  }
  /**
   * Logs a warning message.
   *
   * Use for conditions that may indicate issues but don't prevent
   * operation, such as deprecated patterns or performance concerns.
   * @param message - The warning message
   * @param context - Optional additional context
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
   * @param message - The error message
   * @param context - Optional additional context
   * @example
   * ```typescript
   * logger.error('Failed to validate tool input', { toolName: 'Bash', reason: 'empty command' });
   * ```
   */
  error(message, context) {
    this.emit("error", message, context);
  }
  /**
   * Logs a structured error with full error details.
   *
   * Use this method when logging caught exceptions to capture the full
   * error context including name, message, stack trace, and cause chain.
   * @param error - The error to log
   * @param message - Human-readable description of what failed
   * @param context - Optional additional context
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
   * is no longer needed.
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
   * Configures the log file path at runtime.
   *
   * Call this to enable or change file logging. Setting to `null` disables
   * file logging (but doesn't close existing file handle immediately).
   * @param filePath - Path to the log file, or null to disable
   * @example
   * ```typescript
   * // Enable file logging at runtime
   * logger.setLogFile('/var/log/claude-hooks.log');
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
   * @returns Whether the logger has any active output destinations
   */
  hasDestinations() {
    for (const handlers of this.handlers.values()) {
      if (handlers.size > 0)
        return true;
    }
    return this.logFilePath !== null;
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
    if (!this.logFilePath)
      return;
    if (!this.fileInitialized) {
      this.initializeFile();
    }
    if (this.logFileFd === null)
      return;
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
    if (!this.logFilePath)
      return;
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

// ../../../../../../../node_modules/@goodfoot/claude-code-hooks/dist/outputs.js
var EXIT_CODES = {
  /** Handler completed successfully. Claude Code parses stdout as JSON. */
  SUCCESS: 0,
  /** Non-blocking error occurred (e.g., invalid input). stderr shown to user only. */
  ERROR: 1,
  /** Handler threw exception OR blocking action requested. stderr shown to Claude. */
  BLOCK: 2
};
function createDecisionOutputBuilder(hookType) {
  return (options = {}) => ({
    _type: hookType,
    stdout: options
  });
}
var subagentStopOutput = /* @__PURE__ */ createDecisionOutputBuilder("SubagentStop");

// ../../../../../../../node_modules/@goodfoot/claude-code-hooks/dist/runtime.js
async function readStdin() {
  return new Promise((resolve, reject) => {
    const chunks = [];
    process.stdin.setEncoding("utf-8");
    process.stdin.on("data", (chunk) => {
      chunks.push(chunk);
    });
    process.stdin.on("end", () => {
      resolve(chunks.join(""));
    });
    process.stdin.on("error", (error) => {
      reject(error);
    });
  });
}
function parseStdinInput(stdinContent) {
  const rawInput = JSON.parse(stdinContent);
  return rawInput;
}
function writeStdout(output) {
  process.stdout.write(JSON.stringify(output));
}
function createMalformedInputOutput(error) {
  logger.error(`Invalid JSON input: ${error instanceof Error ? error.message : String(error)}`);
  return { stdout: {} };
}
function handleHandlerError(error) {
  if (error instanceof Error) {
    process.stderr.write(`${error.stack ?? error.message}
`);
  } else {
    process.stderr.write(`${String(error)}
`);
  }
  logger.error(`Hook handler error: ${error instanceof Error ? error.message : String(error)}`);
  logger.clearContext();
  logger.close();
  process.exit(EXIT_CODES.BLOCK);
}
function convertToHookOutput(specificOutput) {
  const { stdout, stderr } = specificOutput;
  return stderr !== void 0 ? { stdout, stderr } : { stdout };
}
async function execute(hookFn) {
  let output;
  try {
    const cliLogFile = process.env.CLAUDE_CODE_HOOKS_CLI_LOG_FILE;
    const envLogFile = process.env.CLAUDE_CODE_HOOKS_LOG_FILE;
    if (cliLogFile !== void 0 && envLogFile !== void 0 && cliLogFile !== envLogFile) {
      process.stderr.write(`Log file configuration conflict: CLI --log="${cliLogFile}" vs CLAUDE_CODE_HOOKS_LOG_FILE="${envLogFile}". Use only one method to configure hook logging.
`);
      process.exit(EXIT_CODES.ERROR);
    }
    if (cliLogFile !== void 0) {
      logger.setLogFile(cliLogFile);
    }
    let stdinContent;
    try {
      stdinContent = await readStdin();
    } catch (error) {
      logger.logError(error, "Failed to read stdin");
      output = createMalformedInputOutput(error);
      return;
    }
    let input;
    try {
      input = parseStdinInput(stdinContent);
    } catch (error) {
      logger.logError(error, "Failed to parse stdin JSON");
      output = createMalformedInputOutput(error);
      return;
    }
    const hookEventName = hookFn.hookEventName;
    logger.setContext(hookEventName, input);
    const context = hookEventName === "SessionStart" ? { logger, persistEnvVar, persistEnvVars } : { logger };
    try {
      const specificOutput = await hookFn(input, context);
      output = convertToHookOutput(specificOutput);
    } catch (error) {
      handleHandlerError(error);
    }
  } finally {
    if (output !== void 0) {
      writeStdout(output.stdout);
    }
    logger.clearContext();
    logger.close();
    if (output?.stderr !== void 0) {
      process.stderr.write(output.stderr);
      process.exit(EXIT_CODES.BLOCK);
    }
    process.exit(EXIT_CODES.SUCCESS);
  }
}

// src/lib/api-discovery.ts
import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

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
  buildUrl(path, params) {
    const url = new URL(path, this.options.baseUrl);
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
    const resumeFrom = await new Promise((resolve, reject) => {
      const onReady = (event) => {
        try {
          const msg = JSON.parse(String(event.data));
          if (msg.type === "ready") {
            ws.removeEventListener("message", onReady);
            ws.removeEventListener("error", onError);
            ws.removeEventListener("close", onClose);
            resolve(msg.resumeFrom ?? 0);
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
        await new Promise((resolve) => {
          const onClose = () => {
            ws.removeEventListener("close", onClose);
            resolve();
          };
          ws.addEventListener("close", onClose);
          if (ws.readyState === ws.CLOSED) {
            ws.removeEventListener("close", onClose);
            resolve();
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

// src/lib/api-discovery.ts
async function discoverApiInfo(logger2) {
  if (process.env["API_TEST_MODE"] === "1") {
    logger2?.debug("API_TEST_MODE: Using mock API info");
    return {
      host: "localhost",
      port: 9999,
      pid: 99999,
      accessToken: "test-token",
      startedAt: "2024-01-01T00:00:00Z"
    };
  }
  const configPath = process.env["CARDS_DISCOVERY_PATH"] ?? join(homedir(), ".cards", "cards-api.json");
  try {
    const content = await readFile(configPath, "utf-8");
    const config = JSON.parse(content);
    if (typeof config["host"] !== "string" || typeof config["port"] !== "number" || typeof config["accessToken"] !== "string" || typeof config["pid"] !== "number" || typeof config["startedAt"] !== "string") {
      logger2?.debug("API info discovery failed", { error: "Config missing required fields" });
      return null;
    }
    return {
      host: config["host"],
      port: config["port"],
      accessToken: config["accessToken"],
      pid: config["pid"],
      startedAt: config["startedAt"],
      sessionBaseline: config["sessionBaseline"]
    };
  } catch (error) {
    logger2?.debug("API info discovery failed", { error: String(error) });
    return null;
  }
}
async function createCardsClient(logger2) {
  const info = await discoverApiInfo(logger2);
  if (!info) return null;
  return new CardsClient({
    baseUrl: `http://${info.host}:${info.port}`,
    accessToken: info.accessToken
  });
}

// src/subagent-stop.ts
async function uploadSubagentTranscript(cardId, sessionId, agentId, transcriptPath) {
  const client = await createCardsClient();
  if (!client) return;
  const content = await readFile2(transcriptPath, "utf-8");
  const stream = client.openStream(cardId, "claude-code-session", `${sessionId}-${agentId}.jsonl`, {
    title: `Subagent transcript for ${cardId}`,
    sessionId
  });
  const lines = content.split("\n");
  for (const line of lines) {
    if (line.trim() !== "") {
      stream.write(line);
    }
  }
  await stream.close();
}
var subagent_stop_default = subagentStopHook({}, async (input, { logger: logger2 }) => {
  let actionInput;
  try {
    actionInput = extractActionInput();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger2.error("Not running inside an action subprocess", { error: message });
    return subagentStopOutput({ decision: "approve" });
  }
  try {
    await uploadSubagentTranscript(actionInput.cardId, input.session_id, input.agent_id, input.agent_transcript_path);
    logger2.info("Transcript upload complete", {
      sessionId: input.session_id,
      agentId: input.agent_id,
      cardId: actionInput.cardId
    });
  } catch (error) {
    logger2.warn("Failed to upload transcript", {
      sessionId: input.session_id,
      agentId: input.agent_id,
      error: error instanceof Error ? error.message : String(error)
    });
  }
  return subagentStopOutput({ decision: "approve" });
});

// src/subagent-stop-entry.ts
process.env["CLAUDE_CODE_HOOKS_CLI_LOG_FILE"] = "/workspace/.worktrees/cards/main-2/1/.cards/logs/claude-code-cards-runtime-hooks.log";
execute(subagent_stop_default);
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsic3JjL3N1YmFnZW50LXN0b3AudHMiLCAiLi4vc2RrL3NyYy9jb25maWcvZW52LnRzIiwgIi4uLy4uLy4uLy4uLy4uLy4uLy4uL25vZGVfbW9kdWxlcy9AZ29vZGZvb3QvY2xhdWRlLWNvZGUtaG9va3MvZGlzdC9lbnYuanMiLCAiLi4vLi4vLi4vLi4vLi4vLi4vLi4vbm9kZV9tb2R1bGVzL0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcy9kaXN0L2hvb2tzLmpzIiwgIi4uLy4uLy4uLy4uLy4uLy4uLy4uL25vZGVfbW9kdWxlcy9AZ29vZGZvb3QvY2xhdWRlLWNvZGUtaG9va3MvZGlzdC9sb2dnZXIuanMiLCAiLi4vLi4vLi4vLi4vLi4vLi4vLi4vbm9kZV9tb2R1bGVzL0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcy9kaXN0L291dHB1dHMuanMiLCAiLi4vLi4vLi4vLi4vLi4vLi4vLi4vbm9kZV9tb2R1bGVzL0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcy9kaXN0L3J1bnRpbWUuanMiLCAic3JjL2xpYi9hcGktZGlzY292ZXJ5LnRzIiwgIi4uL3Nkay9zcmMvY2xpZW50L3R5cGVzL2Vycm9ycy50cyIsICIuLi9zZGsvc3JjL2NsaWVudC9jYXJkc0NsaWVudC50cyIsICJzcmMvc3ViYWdlbnQtc3RvcC1lbnRyeS50cyJdLAogICJzb3VyY2VzQ29udGVudCI6IFsiLyoqXG4gKiBTdWJhZ2VudFN0b3AgaG9vayBpbXBsZW1lbnRhdGlvbi5cbiAqXG4gKiBVcGxvYWRzIHRoZSBjb21wbGV0ZWQgc3ViYWdlbnQgdHJhbnNjcmlwdCB0byB0aGUgQ2FyZHMgQVBJIHZpYSBzdHJlYW1pbmcuXG4gKiBVc2VzIGBvcGVuU3RyZWFtYCB3aXRoIHN0cmVhbSB0eXBlIGBjbGF1ZGUtY29kZS1zZXNzaW9uYCBhbmQgZmlsZW5hbWVcbiAqIGB7c2Vzc2lvbklkfS17YWdlbnRJZH0uanNvbmxgLlxuICpcbiAqIEFwcHJvdmVzIHVuY29uZGl0aW9uYWxseSBcdTIwMTQgdXBsb2FkIGZhaWx1cmUgaXMgbm9uLWZhdGFsIHNpbmNlIHRyYW5zY3JpcHRcbiAqIGRhdGEgbWF5IGJlIHBhcnRpYWxseSBhdmFpbGFibGUgdmlhIG90aGVyIG1lYW5zLlxuICpcbiAqIEBzdW1tYXJ5IFN1YmFnZW50U3RvcCBob29rIFx1MjAxNCB1cGxvYWRzIHN1YmFnZW50IHRyYW5zY3JpcHQgdG8gQ2FyZHMgQVBJXG4gKi9cblxuaW1wb3J0IHsgcmVhZEZpbGUgfSBmcm9tICdub2RlOmZzL3Byb21pc2VzJztcbmltcG9ydCB7IGV4dHJhY3RBY3Rpb25JbnB1dCB9IGZyb20gJ0BjYXJkcy9zZGsvY29uZmlnJztcbmltcG9ydCB7IHN1YmFnZW50U3RvcEhvb2ssIHN1YmFnZW50U3RvcE91dHB1dCB9IGZyb20gJ0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcyc7XG5pbXBvcnQgeyBjcmVhdGVDYXJkc0NsaWVudCB9IGZyb20gJy4vbGliL2FwaS1kaXNjb3ZlcnkuanMnO1xuXG4vKipcbiAqIFVwbG9hZHMgdGhlIGNvbXBsZXRlZCBzdWJhZ2VudCB0cmFuc2NyaXB0IHRvIHRoZSBDYXJkcyBBUEkgdmlhIHN0cmVhbWluZy5cbiAqXG4gKiBSZWFkcyB0aGUgdHJhbnNjcmlwdCBmaWxlIGFuZCBzdHJlYW1zIGVhY2ggbm9uLWVtcHR5IGxpbmUgdXNpbmcgYG9wZW5TdHJlYW1gLlxuICogRmFpbHMgb3BlbiBcdTIwMTQgY2FsbGVyIGxvZ3Mgd2FybmluZyBvbiBmYWlsdXJlLlxuICpcbiAqIEBwYXJhbSBjYXJkSWQgLSBDYXJkIGlkZW50aWZpZXIgZm9yIHRoZSB1cGxvYWQgdGFyZ2V0XG4gKiBAcGFyYW0gc2Vzc2lvbklkIC0gQ2xhdWRlIHNlc3Npb24gaWRlbnRpZmllclxuICogQHBhcmFtIGFnZW50SWQgLSBTdWJhZ2VudCBpZGVudGlmaWVyXG4gKiBAcGFyYW0gdHJhbnNjcmlwdFBhdGggLSBBYnNvbHV0ZSBwYXRoIHRvIHRoZSBjb21wbGV0ZWQgdHJhbnNjcmlwdCBmaWxlXG4gKi9cbmFzeW5jIGZ1bmN0aW9uIHVwbG9hZFN1YmFnZW50VHJhbnNjcmlwdChcbiAgY2FyZElkOiBzdHJpbmcsXG4gIHNlc3Npb25JZDogc3RyaW5nLFxuICBhZ2VudElkOiBzdHJpbmcsXG4gIHRyYW5zY3JpcHRQYXRoOiBzdHJpbmdcbik6IFByb21pc2U8dm9pZD4ge1xuICBjb25zdCBjbGllbnQgPSBhd2FpdCBjcmVhdGVDYXJkc0NsaWVudCgpO1xuICBpZiAoIWNsaWVudCkgcmV0dXJuO1xuXG4gIGNvbnN0IGNvbnRlbnQgPSBhd2FpdCByZWFkRmlsZSh0cmFuc2NyaXB0UGF0aCwgJ3V0Zi04Jyk7XG4gIGNvbnN0IHN0cmVhbSA9IGNsaWVudC5vcGVuU3RyZWFtKGNhcmRJZCwgJ2NsYXVkZS1jb2RlLXNlc3Npb24nLCBgJHtzZXNzaW9uSWR9LSR7YWdlbnRJZH0uanNvbmxgLCB7XG4gICAgdGl0bGU6IGBTdWJhZ2VudCB0cmFuc2NyaXB0IGZvciAke2NhcmRJZH1gLFxuICAgIHNlc3Npb25JZFxuICB9KTtcblxuICBjb25zdCBsaW5lcyA9IGNvbnRlbnQuc3BsaXQoJ1xcbicpO1xuICBmb3IgKGNvbnN0IGxpbmUgb2YgbGluZXMpIHtcbiAgICBpZiAobGluZS50cmltKCkgIT09ICcnKSB7XG4gICAgICBzdHJlYW0ud3JpdGUobGluZSk7XG4gICAgfVxuICB9XG5cbiAgYXdhaXQgc3RyZWFtLmNsb3NlKCk7XG59XG5cbmV4cG9ydCBkZWZhdWx0IHN1YmFnZW50U3RvcEhvb2soe30sIGFzeW5jIChpbnB1dCwgeyBsb2dnZXIgfSkgPT4ge1xuICBsZXQgYWN0aW9uSW5wdXQ6IFJldHVyblR5cGU8dHlwZW9mIGV4dHJhY3RBY3Rpb25JbnB1dD47XG4gIHRyeSB7XG4gICAgYWN0aW9uSW5wdXQgPSBleHRyYWN0QWN0aW9uSW5wdXQoKTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBjb25zdCBtZXNzYWdlID0gZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiBTdHJpbmcoZXJyb3IpO1xuICAgIGxvZ2dlci5lcnJvcignTm90IHJ1bm5pbmcgaW5zaWRlIGFuIGFjdGlvbiBzdWJwcm9jZXNzJywgeyBlcnJvcjogbWVzc2FnZSB9KTtcbiAgICByZXR1cm4gc3ViYWdlbnRTdG9wT3V0cHV0KHsgZGVjaXNpb246ICdhcHByb3ZlJyB9KTtcbiAgfVxuXG4gIHRyeSB7XG4gICAgYXdhaXQgdXBsb2FkU3ViYWdlbnRUcmFuc2NyaXB0KGFjdGlvbklucHV0LmNhcmRJZCwgaW5wdXQuc2Vzc2lvbl9pZCwgaW5wdXQuYWdlbnRfaWQsIGlucHV0LmFnZW50X3RyYW5zY3JpcHRfcGF0aCk7XG4gICAgbG9nZ2VyLmluZm8oJ1RyYW5zY3JpcHQgdXBsb2FkIGNvbXBsZXRlJywge1xuICAgICAgc2Vzc2lvbklkOiBpbnB1dC5zZXNzaW9uX2lkLFxuICAgICAgYWdlbnRJZDogaW5wdXQuYWdlbnRfaWQsXG4gICAgICBjYXJkSWQ6IGFjdGlvbklucHV0LmNhcmRJZFxuICAgIH0pO1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGxvZ2dlci53YXJuKCdGYWlsZWQgdG8gdXBsb2FkIHRyYW5zY3JpcHQnLCB7XG4gICAgICBzZXNzaW9uSWQ6IGlucHV0LnNlc3Npb25faWQsXG4gICAgICBhZ2VudElkOiBpbnB1dC5hZ2VudF9pZCxcbiAgICAgIGVycm9yOiBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6IFN0cmluZyhlcnJvcilcbiAgICB9KTtcbiAgfVxuXG4gIHJldHVybiBzdWJhZ2VudFN0b3BPdXRwdXQoeyBkZWNpc2lvbjogJ2FwcHJvdmUnIH0pO1xufSk7XG4iLCAiLyoqXG4gKiBFbnZpcm9ubWVudCB2YXJpYWJsZSB1dGlsaXRpZXMgZm9yIENhcmRzIEV4dGVuc2lvbiBhY3Rpb25zIGFuZCB0eXBlIGhvb2tzLlxuICpcbiAqIFRoZSBleGVjdXRpb24gd3JhcHBlciBpbmplY3RzIGFjdGlvbiBhbmQgdHlwZSBob29rIGlucHV0cyB2aWEgcHJvY2Vzcy5lbnYuXG4gKiBUaGlzIG1vZHVsZSBwcm92aWRlcyBzdHJpY3QgZ2V0dGVycyBhbmQgdHlwZWQgZXh0cmFjdG9ycyBzbyBoYW5kbGVycyBkbyBub3RcbiAqIG5lZWQgdG8gcGFyc2UgZW52aXJvbm1lbnQgdmFyaWFibGVzIG1hbnVhbGx5LlxuICpcbiAqIFVzZSB0aGUgaW5kaXZpZHVhbCBnZXR0ZXJzIHdoZW4geW91IG9ubHkgbmVlZCBvbmUgdmFsdWU7IHVzZVxuICoge0BsaW5rIGV4dHJhY3RBY3Rpb25JbnB1dH0gb3Ige0BsaW5rIGV4dHJhY3RUeXBlSW5wdXR9IHdoZW4geW91IG5lZWQgYSBmdWxsXG4gKiB0eXBlZCBwYXlsb2FkIGZvciBhbiBhY3Rpb24gb3IgdHlwZSBob29rLlxuICpcbiAqXG4gKiBAc3VtbWFyeSBFbnZpcm9ubWVudCB2YXJpYWJsZSB1dGlsaXRpZXMgZm9yIENhcmRzIEV4dGVuc2lvbiBhY3Rpb25zIGFuZCB0eXBlIGhvb2tzXG4gKiBAbW9kdWxlXG4gKi9cblxuaW1wb3J0IHsgcmVhZEZpbGVTeW5jIH0gZnJvbSAnbm9kZTpmcyc7XG5pbXBvcnQgdHlwZSB7IEFjdGlvbklucHV0LCBUeXBlSG9va0lucHV0IH0gZnJvbSAnLi9pbnB1dHMuanMnO1xuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBDb25zdGFudHNcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuLyoqXG4gKiBFbnZpcm9ubWVudCB2YXJpYWJsZSBuYW1lcyBzZXQgYnkgdGhlIENhcmRzIGV4ZWN1dGlvbiB3cmFwcGVyLlxuICpcbiAqIFRoaXMgaXMgdGhlIHNpbmdsZSBzb3VyY2Ugb2YgdHJ1dGggZm9yIGVudiB2YXIga2V5cyB1c2VkIGJ5IGFjdGlvbiBhbmQgdHlwZVxuICogaG9vayBwcm9jZXNzZXMuIEtlZXAgaXQgaW4gc3luYyB3aXRoIHRoZSB3cmFwcGVyIHRvIGF2b2lkIHN1YnRsZSBcInVuZGVmaW5lZFxuICogaW5wdXRcIiBidWdzLlxuICovXG5leHBvcnQgY29uc3QgQ0FSRFNfRU5WX1ZBUlMgPSB7XG4gIC8qKlxuICAgKiBVbmlxdWUgaWRlbnRpZmllciBmb3IgdGhlIGN1cnJlbnQgY2FyZC5cbiAgICogQXZhaWxhYmxlIGluIGFsbCBhY3Rpb25zIGFuZCB0eXBlIGhvb2tzLlxuICAgKi9cbiAgQ0FSRF9JRDogJ0NBUkRfSUQnLFxuXG4gIC8qKlxuICAgKiBUaGUgZW52aXJvbm1lbnQgbmFtZSBmcm9tIHNldHRpbmdzLmpzb24uXG4gICAqIEF2YWlsYWJsZSBpbiBhbGwgYWN0aW9ucyBhbmQgdHlwZSBob29rcy5cbiAgICovXG4gIEVOVklST05NRU5UOiAnRU5WSVJPTk1FTlQnLFxuXG4gIC8qKlxuICAgKiBEaXNwbGF5IG5hbWUgb2YgdGhlIGFjdGlvbiBidXR0b24gdGhhdCB0cmlnZ2VyZWQgdGhpcyBoYW5kbGVyLlxuICAgKiBBdmFpbGFibGUgaW4gYWN0aW9ucyBvbmx5IChub3QgdHlwZSBob29rcykuXG4gICAqL1xuICBBQ1RJT05fTkFNRTogJ0FDVElPTl9OQU1FJyxcblxuICAvKipcbiAgICogQ2FyZCdzIGV4ZWN1dGlvbiBtb2RlLCBkZXRlcm1pbmluZyBVSSBpbnRlcmFjdGlvbiBtb2RlbC5cbiAgICogQXZhaWxhYmxlIGluIGFjdGlvbnMgb25seSAobm90IHR5cGUgaG9va3MpLlxuICAgKiBWYWxpZCB2YWx1ZXM6ICdpbnRlcmFjdGl2ZScgfCAnYmFja2dyb3VuZCdcbiAgICovXG4gIEVYRUNVVElPTl9NT0RFOiAnRVhFQ1VUSU9OX01PREUnLFxuXG4gIC8qKlxuICAgKiBDYXJkcyBzZXJ2ZXIgYmFzZSBVUkwgZm9yIEFQSSBjYWxscy5cbiAgICogQXZhaWxhYmxlIGluIGFsbCBhY3Rpb25zIGFuZCB0eXBlIGhvb2tzLlxuICAgKi9cbiAgQVBJX0JBU0VfVVJMOiAnQVBJX0JBU0VfVVJMJyxcblxuICAvKipcbiAgICogQXV0aGVudGljYXRpb24gdG9rZW4gZm9yIEFQSSBjYWxscy5cbiAgICogQXZhaWxhYmxlIGluIGFsbCBhY3Rpb25zIGFuZCB0eXBlIGhvb2tzLlxuICAgKi9cbiAgQVBJX0FDQ0VTU19UT0tFTjogJ0FQSV9BQ0NFU1NfVE9LRU4nLFxuXG4gIC8qKlxuICAgKiBDb25maWd1cmVkIGNvZGluZyBhZ2VudCBpZGVudGlmaWVyIGZyb20gY2FyZHMuY29kaW5nQWdlbnQgc2V0dGluZy5cbiAgICogQXZhaWxhYmxlIGluIGFjdGlvbnMgb25seSAobm90IHR5cGUgaG9va3MpLlxuICAgKiBPcHRpb25hbC5cbiAgICovXG4gIENPRElOR19BR0VOVDogJ0NPRElOR19BR0VOVCcsXG5cbiAgLyoqXG4gICAqIFRoZSByZWdpc3RlcmVkIHR5cGUgbmFtZS5cbiAgICogQXZhaWxhYmxlIGluIHR5cGUgaG9va3Mgb25seS5cbiAgICovXG4gIFRZUEVfTkFNRTogJ1RZUEVfTkFNRScsXG5cbiAgLyoqXG4gICAqIFRoZSB0eXBlJ3MgdmVyc2lvbiBzdHJpbmcgZnJvbSBzZXR0aW5ncy5qc29uIGNvbmZpZ3VyYXRpb24uXG4gICAqIEF2YWlsYWJsZSBpbiB0eXBlIGhvb2tzIG9ubHkuXG4gICAqL1xuICBUWVBFX1ZFUlNJT046ICdUWVBFX1ZFUlNJT04nLFxuXG4gIC8qKlxuICAgKiBUaGUgZmlsZSBuYW1lIHdpdGhpbiB0aGUgdHlwZSBkaXJlY3RvcnkuXG4gICAqIEF2YWlsYWJsZSBpbiB0eXBlIGhvb2tzIG9ubHkuXG4gICAqL1xuICBGSUxFX05BTUU6ICdGSUxFX05BTUUnLFxuXG4gIC8qKlxuICAgKiBGdWxsIHBhdGggdG8gdGhlIGZpbGUuXG4gICAqIEF2YWlsYWJsZSBpbiB0eXBlIGhvb2tzIG9ubHkuXG4gICAqL1xuICBGSUxFX1BBVEg6ICdGSUxFX1BBVEgnLFxuXG4gIC8qKlxuICAgKiBGaWxlIHNpemUgaW4gYnl0ZXMuXG4gICAqIEF2YWlsYWJsZSBpbiB0eXBlIGhvb2tzIG9ubHkuXG4gICAqL1xuICBGSUxFX1NJWkU6ICdGSUxFX1NJWkUnLFxuXG4gIC8qKlxuICAgKiBTSEEyNTYgaGFzaCBvZiBjb250ZW50LlxuICAgKiBBdmFpbGFibGUgaW4gdHlwZSBob29rcyBvbmx5LlxuICAgKi9cbiAgU0hBMjU2OiAnU0hBMjU2JyxcblxuICAvKipcbiAgICogTUlNRSB0eXBlIG9mIHRoZSBjb250ZW50LlxuICAgKiBBdmFpbGFibGUgaW4gdHlwZSBob29rcyBvbmx5LlxuICAgKi9cbiAgQ09OVEVOVF9UWVBFOiAnQ09OVEVOVF9UWVBFJyxcblxuICAvKipcbiAgICogUGF0aCB0byB0aGUgVlMgQ29kZSBidW5kbGVkIE5vZGUuanMgaW50ZXJwcmV0ZXIuXG4gICAqXG4gICAqIFNldCBieSB0aGUgZXh0ZW5zaW9uIGhvc3QgZnJvbSBgcHJvY2Vzcy5leGVjUGF0aGAgKHdpdGhcbiAgICogYEVMRUNUUk9OX1JVTl9BU19OT0RFPTFgKS4gQ29tbWFuZHMgaW4gc2V0dGluZ3MuanNvbiB1c2VcbiAgICogYCRWU0NPREVfTk9ERSAuL2Jpbi8uLi5gIHNvIHRoZXkgd29yayByZWdhcmRsZXNzIG9mXG4gICAqIHdoZXRoZXIgYG5vZGVgIGlzIG9uIHRoZSBzeXN0ZW0gUEFUSC5cbiAgICpcbiAgICogQXZhaWxhYmxlIGluIGFsbCBhY3Rpb25zIGFuZCB0eXBlIGhvb2tzLlxuICAgKi9cbiAgVlNDT0RFX05PREU6ICdWU0NPREVfTk9ERScsXG5cbiAgLyoqXG4gICAqIFBhdGggdG8gdGhlIE5vZGUuanMgaW50ZXJwcmV0ZXIgcnVubmluZyB0aGUgd3JhcHBlciBwcm9jZXNzLlxuICAgKlxuICAgKiBTZXQgYnkgdGhlIHdyYXBwZXIgZnJvbSBgcHJvY2Vzcy5leGVjUGF0aGAuIFVzZSBgJE5PREVgIGluIGVtYmVkZGVkXG4gICAqIGJhc2ggc3RhdGVtZW50cyB0byBpbnZva2UgTm9kZSBzY3JpcHRzIHBvcnRhYmx5LlxuICAgKlxuICAgKiBBdmFpbGFibGUgaW4gYWxsIGFjdGlvbnMuXG4gICAqL1xuICBOT0RFOiAnTk9ERScsXG5cbiAgLyoqXG4gICAqIFBhdGggdG8gdGhlIFVuaXggZG9tYWluIHNvY2tldCBmb3IgcnVudGltZS10by1kaXNwYXRjaGVyIGNvbW11bmljYXRpb24uXG4gICAqIEF2YWlsYWJsZSBpbiBhY3Rpb25zIG9ubHkuXG4gICAqL1xuICBTT0NLRVRfUEFUSDogJ1NPQ0tFVF9QQVRIJyxcblxuICAvKipcbiAgICogUGF0aCB0byBhIEpTT04gZmlsZSBjb250YWluaW5nIHN3aXRjaFRvSW50ZXJhY3RpdmUgZGF0YSBmcm9tIGEgcHJldmlvdXMgaGFuZGxlci5cbiAgICogQXZhaWxhYmxlIGluIGFjdGlvbnMgb25seS4gT3B0aW9uYWwuXG4gICAqL1xuICBTV0lUQ0hfVE9fSU5URVJBQ1RJVkVfREFUQV9QQVRIOiAnU1dJVENIX1RPX0lOVEVSQUNUSVZFX0RBVEFfUEFUSCcsXG5cbiAgLyoqXG4gICAqIFBhdGggdG8gdGhlIHNldHRpbmdzIGNvbmZpZ3VyYXRpb24gZGlyZWN0b3J5LlxuICAgKiBBdmFpbGFibGUgaW4gYWN0aW9ucyBvbmx5LlxuICAgKi9cbiAgQ09ORklHX1BBVEg6ICdDT05GSUdfUEFUSCcsXG5cbiAgLyoqXG4gICAqIFBhdGggdG8gdGhlIFZTIENvZGUgd29ya3NwYWNlIHJvb3QgZGlyZWN0b3J5LlxuICAgKiBTZXQgYnkgdGhlIGFjdGlvbiBoYW5kbGVyIChlLmcuLCBsYXVuY2gudHMpIHRvIHRoZSB3b3JrdHJlZSBwYXRoLlxuICAgKiBBdmFpbGFibGUgaW4gaG9va3MgcnVubmluZyBpbnNpZGUgdGhlIGNsYXVkZSBDTEkuXG4gICAqL1xuICBXT1JLU1BBQ0VfUEFUSDogJ1dPUktTUEFDRV9QQVRIJyxcblxuICAvKipcbiAgICogQWJzb2x1dGUgcGF0aCB0byB0aGUgbWFpbiBnaXQgcmVwb3NpdG9yeSByb290IChOT1QgYSB3b3JrdHJlZSkuXG4gICAqIFNldCBieSBBY3Rpb25EaXNwYXRjaGVyOyBjb25zdW1lZCBieSB0aGUgd3JhcHBlciBhbmQgd2F0Y2hlciBmb3JcbiAgICogZ2l0IG9wZXJhdGlvbnMgKHdvcmt0cmVlIHJlbW92YWwsIGJyYW5jaCBkZWxldGlvbikgdGhhdCBtdXN0IHJ1blxuICAgKiBhZ2FpbnN0IHRoZSBtYWluIHJlcG9zaXRvcnkuXG4gICAqL1xuICBSRVBPX1JPT1Q6ICdSRVBPX1JPT1QnLFxuXG4gIC8qKlxuICAgKiBQYXRoIHRvIHRoZSBjYXJkJ3MgcmVwb3NpdG9yeSBkaXJlY3RvcnkuXG4gICAqIEF2YWlsYWJsZSBpbiBhY3Rpb25zIG9ubHkuXG4gICAqL1xuICBDQVJEX1JFUE9fUEFUSDogJ0NBUkRfUkVQT19QQVRIJyxcblxuICAvKipcbiAgICogUmVzb2x2ZWQgc2hlbGwgY29tbWFuZCBmb3IgdGhlIHdyYXBwZXIgdG8gc3Bhd24gYXMgdGhlIGFjdGlvbiBoYW5kbGVyLlxuICAgKiBTZXQgYnkgQWN0aW9uRGlzcGF0Y2hlcjsgY29uc3VtZWQgYnkgdGhlIHdyYXBwZXIgKG5vdCBieSBhY3Rpb24gaGFuZGxlcnMpLlxuICAgKi9cbiAgQUNUSU9OX0NPTU1BTkQ6ICdBQ1RJT05fQ09NTUFORCcsXG5cbiAgLyoqXG4gICAqIEdpdCBicmFuY2ggdGhhdCB0aGUgY2FyZCdzIHdvcmtzcGFjZSBicmFuY2ggd2lsbCBtZXJnZSBpbnRvLlxuICAgKiBSZXNvbHZlZCBmcm9tIHRoZSB3b3Jrc3BhY2UgSEVBRCBhdCBsYXVuY2ggdGltZS5cbiAgICogU2V0IGJ5IHRoZSBsYXVuY2ggYWN0aW9uLlxuICAgKiBBdmFpbGFibGUgaW4gYWN0aW9ucyBvbmx5LlxuICAgKi9cbiAgQkFTRV9CUkFOQ0g6ICdCQVNFX0JSQU5DSCcsXG5cbiAgLyoqXG4gICAqIEdpdCBicmFuY2ggZnJvbSB3aGljaCB0aGUgY2FyZCdzIHdvcmtzcGFjZSBicmFuY2ggd2FzIGNyZWF0ZWQuXG4gICAqIE1heSBkaWZmZXIgZnJvbSBCQVNFX0JSQU5DSCB3aGVuIHRoZSB3b3JrdHJlZSB3YXMgY3JlYXRlZCBhZ2FpbnN0XG4gICAqIGEgZGlmZmVyZW50IHJlZiB0aGFuIHRoZSBjdXJyZW50IHdvcmtzcGFjZSBIRUFELlxuICAgKiBTZXQgYnkgdGhlIGxhdW5jaCBhY3Rpb24uXG4gICAqIEF2YWlsYWJsZSBpbiBhY3Rpb25zIG9ubHkuXG4gICAqL1xuICBQQVJFTlRfQlJBTkNIOiAnUEFSRU5UX0JSQU5DSCcsXG5cbiAgLyoqXG4gICAqIEdpdCBicmFuY2ggbmFtZSBmb3IgdGhlIGNhcmQncyB3b3Jrc3BhY2UgaW1wbGVtZW50YXRpb24uXG4gICAqIFNldCBieSB0aGUgbGF1bmNoIGFjdGlvbiBhZnRlciByZXNvbHZpbmcgb3IgY3JlYXRpbmcgdGhlIHdvcmt0cmVlLlxuICAgKiBBdmFpbGFibGUgaW4gYWN0aW9ucyBvbmx5LlxuICAgKi9cbiAgV09SS1NQQUNFX0JSQU5DSDogJ1dPUktTUEFDRV9CUkFOQ0gnLFxuXG4gIC8qKlxuICAgKiBTZXNzaW9uIElEIHBlcnNpc3RlZCBieSB0aGUgc2Vzc2lvbi1zdGFydCBob29rIHZpYSBgcGVyc2lzdEVudlZhcmAuXG4gICAqXG4gICAqIEF2YWlsYWJsZSBpbiBCYXNoIHRvb2wgc2hlbGwgZGVzY2VuZGFudHMgKGNvbW1hbmRzLCBnaXQgaG9va3MpIGFmdGVyXG4gICAqIHNlc3Npb24gc3RhcnQuIE5PVCBhdmFpbGFibGUgaW4gaG9va3Mgc3Bhd25lZCBkaXJlY3RseSBieSBDbGF1ZGUgQ29kZVxuICAgKiAoc3RvcCwgc2Vzc2lvbi1lbmQsIGV0Yy4pIFx1MjAxNCB0aG9zZSByZWNlaXZlIHRoZSBzZXNzaW9uIElEIHZpYSBob29rIGlucHV0LlxuICAgKlxuICAgKiBUaGUgY2FyZC1yZXBvIHBvc3QtY29tbWl0IGhvb2sgcmVhZHMgdGhpcyB0byByZWNvcmQgY29tbWl0cyBkaXJlY3RseVxuICAgKiB3aXRob3V0IG5lZWRpbmcgYSBwcm9jZXNzLXRyZWUgd2FsayBvciBQSUQgcmVnaXN0cnkgbG9va3VwLlxuICAgKi9cbiAgQ0FSRFNfU0VTU0lPTl9JRDogJ0NBUkRTX1NFU1NJT05fSUQnLFxuXG4gIC8qKlxuICAgKiBBYnNvbHV0ZSBwYXRoIHRvIHRoZSBWUyBDb2RlIGV4dGVuc2lvbiBpbnN0YWxsYXRpb24gZGlyZWN0b3J5LlxuICAgKlxuICAgKiBTZXQgYnkgdGhlIGV4dGVuc2lvbiBob3N0IGZyb20gYGNvbnRleHQuZXh0ZW5zaW9uVXJpLmZzUGF0aGAgYW5kIGluamVjdGVkXG4gICAqIGludG8gYWxsIHNwYXduZWQgYWN0aW9uIHByb2Nlc3Nlcy4gVXNlIHRoaXMgdG8gbG9jYXRlIGJ1bmRsZWQgYXNzZXRzIHN1Y2hcbiAgICogYXMgdGhlIHJ1bnRpbWUgcGx1Z2luIGRpcmVjdG9yeSAoYDxleHRlbnNpb25QYXRoPi9kaXN0L3BsdWdpbnMvcnVudGltZWApLlxuICAgKlxuICAgKiBBdmFpbGFibGUgaW4gYWN0aW9ucyBvbmx5IChub3QgdHlwZSBob29rcykuXG4gICAqL1xuICBFWFRFTlNJT05fUEFUSDogJ0VYVEVOU0lPTl9QQVRIJ1xufSBhcyBjb25zdDtcblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gSW5kaXZpZHVhbCBHZXR0ZXJzXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbi8qKlxuICogUmVhZHMgdGhlIGNhcmQgaWRlbnRpZmllciBmcm9tIHRoZSBlbnZpcm9ubWVudC5cbiAqXG4gKiBUaGUgZXhlY3V0aW9uIHdyYXBwZXIgYWx3YXlzIHNldHMgdGhpcyBmb3IgZXZlcnkgYWN0aW9uIGFuZCB0eXBlIGhvb2suXG4gKiBAcmV0dXJucyBUaGUgY3VycmVudCBjYXJkIElEXG4gKiBAdGhyb3dzIEVycm9yIGlmIENBUkRfSUQgaXMgbWlzc2luZyBvciBlbXB0eVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGNvbnN0IGNhcmRJZCA9IGdldENhcmRJZCgpO1xuICogY29uc29sZS5sb2coYFByb2Nlc3NpbmcgY2FyZDogJHtjYXJkSWR9YCk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldENhcmRJZCgpOiBzdHJpbmcge1xuICBjb25zdCB2YWx1ZSA9IHByb2Nlc3MuZW52W0NBUkRTX0VOVl9WQVJTLkNBUkRfSURdO1xuICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gJycpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYE1pc3NpbmcgcmVxdWlyZWQgZW52aXJvbm1lbnQgdmFyaWFibGU6ICR7Q0FSRFNfRU5WX1ZBUlMuQ0FSRF9JRH1gKTtcbiAgfVxuICByZXR1cm4gdmFsdWU7XG59XG5cbi8qKlxuICogUmVhZHMgdGhlIGVudmlyb25tZW50IG5hbWUgZnJvbSB0aGUgZW52aXJvbm1lbnQuXG4gKlxuICogVGhpcyB2YWx1ZSBtYXRjaGVzIHRoZSBlbnZpcm9ubWVudCBrZXkgaW4gc2V0dGluZ3MuanNvbiAoZS5nLiwgXCJkZWZhdWx0XCIsIFwic3RhZ2luZ1wiKS5cbiAqIEByZXR1cm5zIFRoZSBlbnZpcm9ubWVudCBuYW1lXG4gKiBAdGhyb3dzIEVycm9yIGlmIEVOVklST05NRU5UIGlzIG1pc3Npbmcgb3IgZW1wdHlcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBjb25zdCBlbnZpcm9ubWVudCA9IGdldEVudmlyb25tZW50KCk7XG4gKiBjb25zb2xlLmxvZyhgRW52aXJvbm1lbnQ6ICR7ZW52aXJvbm1lbnR9YCk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldEVudmlyb25tZW50KCk6IHN0cmluZyB7XG4gIGNvbnN0IHZhbHVlID0gcHJvY2Vzcy5lbnZbQ0FSRFNfRU5WX1ZBUlMuRU5WSVJPTk1FTlRdO1xuICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gJycpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYE1pc3NpbmcgcmVxdWlyZWQgZW52aXJvbm1lbnQgdmFyaWFibGU6ICR7Q0FSRFNfRU5WX1ZBUlMuRU5WSVJPTk1FTlR9YCk7XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG4vKipcbiAqIFJlYWRzIHRoZSBhY3Rpb24gYnV0dG9uIG5hbWUgZnJvbSB0aGUgZW52aXJvbm1lbnQuXG4gKlxuICogVGhpcyBpcyB0aGUgZGlzcGxheSBuYW1lIG9mIHRoZSBhY3Rpb24gdGhhdCB0cmlnZ2VyZWQgdGhlIGhhbmRsZXIsIG1hdGNoaW5nXG4gKiB0aGUgYGFjdGlvbk5hbWVgIGZpZWxkIGZyb20gYGRlZmluZUFjdGlvbmAuXG4gKiBAcmV0dXJucyBEaXNwbGF5IG5hbWUgb2YgdGhlIGFjdGlvbiB0aGF0IHRyaWdnZXJlZCB0aGUgY3VycmVudCBoYW5kbGVyIHJ1bi5cbiAqIEB0aHJvd3MgRXJyb3IgaWYgQUNUSU9OX05BTUUgaXMgbWlzc2luZyBvciBlbXB0eVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGNvbnN0IGFjdGlvbk5hbWUgPSBnZXRBY3Rpb25OYW1lKCk7XG4gKiBjb25zb2xlLmxvZyhgUnVubmluZyBhY3Rpb246ICR7YWN0aW9uTmFtZX1gKTtcbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0QWN0aW9uTmFtZSgpOiBzdHJpbmcge1xuICBjb25zdCB2YWx1ZSA9IHByb2Nlc3MuZW52W0NBUkRTX0VOVl9WQVJTLkFDVElPTl9OQU1FXTtcbiAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQgfHwgdmFsdWUgPT09ICcnKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIHJlcXVpcmVkIGVudmlyb25tZW50IHZhcmlhYmxlOiAke0NBUkRTX0VOVl9WQVJTLkFDVElPTl9OQU1FfWApO1xuICB9XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuLyoqXG4gKiBSZWFkcyB0aGUgZXhlY3V0aW9uIG1vZGUgZnJvbSB0aGUgZW52aXJvbm1lbnQuXG4gKlxuICogRGV0ZXJtaW5lcyB0aGUgVUkgaW50ZXJhY3Rpb24gbW9kZWwgZm9yIGFjdGlvbnMuXG4gKiBAcmV0dXJucyBUaGUgZXhlY3V0aW9uIG1vZGUgKCdpbnRlcmFjdGl2ZScgb3IgJ2JhY2tncm91bmQnKVxuICogQHRocm93cyBFcnJvciBpZiBFWEVDVVRJT05fTU9ERSBpcyBtaXNzaW5nLCBlbXB0eSwgb3IgaW52YWxpZFxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGNvbnN0IG1vZGUgPSBnZXRFeGVjdXRpb25Nb2RlKCk7XG4gKiBpZiAobW9kZSA9PT0gJ2ludGVyYWN0aXZlJykge1xuICogICAvLyBTaG93IHVzZXIgcHJvbXB0c1xuICogfVxuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRFeGVjdXRpb25Nb2RlKCk6ICdpbnRlcmFjdGl2ZScgfCAnYmFja2dyb3VuZCcge1xuICBjb25zdCB2YWx1ZSA9IHByb2Nlc3MuZW52W0NBUkRTX0VOVl9WQVJTLkVYRUNVVElPTl9NT0RFXTtcbiAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQgfHwgdmFsdWUgPT09ICcnKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIHJlcXVpcmVkIGVudmlyb25tZW50IHZhcmlhYmxlOiAke0NBUkRTX0VOVl9WQVJTLkVYRUNVVElPTl9NT0RFfWApO1xuICB9XG4gIGlmICh2YWx1ZSAhPT0gJ2ludGVyYWN0aXZlJyAmJiB2YWx1ZSAhPT0gJ2JhY2tncm91bmQnKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBJbnZhbGlkICR7Q0FSRFNfRU5WX1ZBUlMuRVhFQ1VUSU9OX01PREV9OiBleHBlY3RlZCAnaW50ZXJhY3RpdmUnIG9yICdiYWNrZ3JvdW5kJywgZ290IFwiJHt2YWx1ZX1cImApO1xuICB9XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuLyoqXG4gKiBSZWFkcyB0aGUgQVBJIGJhc2UgVVJMIGZyb20gdGhlIGVudmlyb25tZW50LlxuICpcbiAqIFVzZSB0aGlzIGFzIHRoZSBiYXNlIGZvciBjb25zdHJ1Y3RpbmcgQVBJIGVuZHBvaW50cy4gVGhlIFVSTCBkb2VzIG5vdCBpbmNsdWRlXG4gKiBhIHRyYWlsaW5nIHNsYXNoLlxuICogQHJldHVybnMgQmFzZSBVUkwgdXNlZCB0byBjb25zdHJ1Y3QgQ2FyZHMgQVBJIGVuZHBvaW50cyBmb3IgdGhpcyBleGVjdXRpb24uXG4gKiBAdGhyb3dzIEVycm9yIGlmIEFQSV9CQVNFX1VSTCBpcyBtaXNzaW5nIG9yIGVtcHR5XG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogY29uc3QgYXBpVXJsID0gZ2V0QXBpQmFzZVVybCgpO1xuICogY29uc3QgZW5kcG9pbnQgPSBgJHthcGlVcmx9L2NhcmRzLyR7Y2FyZElkfWA7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldEFwaUJhc2VVcmwoKTogc3RyaW5nIHtcbiAgY29uc3QgdmFsdWUgPSBwcm9jZXNzLmVudltDQVJEU19FTlZfVkFSUy5BUElfQkFTRV9VUkxdO1xuICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gJycpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYE1pc3NpbmcgcmVxdWlyZWQgZW52aXJvbm1lbnQgdmFyaWFibGU6ICR7Q0FSRFNfRU5WX1ZBUlMuQVBJX0JBU0VfVVJMfWApO1xuICB9XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuLyoqXG4gKiBSZWFkcyB0aGUgQVBJIGFjY2VzcyB0b2tlbiBmcm9tIHRoZSBlbnZpcm9ubWVudC5cbiAqXG4gKiBCZWFyZXIgdG9rZW4gdmFsaWQgZm9yIHRoZSBkdXJhdGlvbiBvZiB0aGlzIGFjdGlvbiBvciB0eXBlIGhvb2sgZXhlY3V0aW9uLlxuICogSW5jbHVkZSBpbiBBdXRob3JpemF0aW9uIGhlYWRlcnMgd2hlbiBjYWxsaW5nIHRoZSBDYXJkcyBBUEkuXG4gKiBAcmV0dXJucyBCZWFyZXIgdG9rZW4gdGhhdCBhdXRob3JpemVzIEFQSSByZXF1ZXN0cyBmb3IgdGhpcyBleGVjdXRpb24gY29udGV4dC5cbiAqIEB0aHJvd3MgRXJyb3IgaWYgQVBJX0FDQ0VTU19UT0tFTiBpcyBtaXNzaW5nIG9yIGVtcHR5XG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogY29uc3QgdG9rZW4gPSBnZXRBcGlBY2Nlc3NUb2tlbigpO1xuICogY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBmZXRjaChhcGlVcmwsIHtcbiAqICAgaGVhZGVyczogeyBBdXRob3JpemF0aW9uOiBgQmVhcmVyICR7dG9rZW59YCB9XG4gKiB9KTtcbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0QXBpQWNjZXNzVG9rZW4oKTogc3RyaW5nIHtcbiAgY29uc3QgdmFsdWUgPSBwcm9jZXNzLmVudltDQVJEU19FTlZfVkFSUy5BUElfQUNDRVNTX1RPS0VOXTtcbiAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQgfHwgdmFsdWUgPT09ICcnKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIHJlcXVpcmVkIGVudmlyb25tZW50IHZhcmlhYmxlOiAke0NBUkRTX0VOVl9WQVJTLkFQSV9BQ0NFU1NfVE9LRU59YCk7XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG4vKipcbiAqIFJlYWRzIHRoZSBjb25maWd1cmVkIGNvZGluZyBhZ2VudCBpZGVudGlmaWVyIGZyb20gdGhlIGVudmlyb25tZW50LlxuICpcbiAqIE9wdGlvbmFsIHZhbHVlIGZyb20gY2FyZHMuY29kaW5nQWdlbnQgc2V0dGluZy4gV2hlbiBzZXQsIGluZGljYXRlcyB3aGljaCBBSVxuICogY29kaW5nIGFzc2lzdGFudCB0aGUgdXNlciBwcmVmZXJzLiBBY3Rpb25zIGNhbiB1c2UgdGhpcyB0byBjdXN0b21pemUgYmVoYXZpb3JcbiAqIG9yIHByb21wdHMgZm9yIGRpZmZlcmVudCBhZ2VudHMuXG4gKiBAcmV0dXJucyBUaGUgY29kaW5nIGFnZW50IGlkZW50aWZpZXIsIG9yIHVuZGVmaW5lZCBpZiBub3Qgc2V0XG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogY29uc3QgY29kaW5nQWdlbnQgPSBnZXRDb2RpbmdBZ2VudCgpO1xuICogaWYgKGNvZGluZ0FnZW50ID09PSAnY2xhdWRlJykge1xuICogICAvLyBDdXN0b21pemUgZm9yIENsYXVkZVxuICogfVxuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRDb2RpbmdBZ2VudCgpOiBzdHJpbmcgfCB1bmRlZmluZWQge1xuICBjb25zdCB2YWx1ZSA9IHByb2Nlc3MuZW52W0NBUkRTX0VOVl9WQVJTLkNPRElOR19BR0VOVF07XG4gIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IHZhbHVlID09PSAnJykge1xuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG4vKipcbiAqIFJlYWRzIHRoZSByZWdpc3RlcmVkIHR5cGUgbmFtZSBmb3IgdHlwZSBob29rcy5cbiAqXG4gKiBUaGlzIHZhbHVlIGlzIG9ubHkgcHJlc2VudCBmb3IgdHlwZSBob29rIGV2ZW50cy5cbiAqIEByZXR1cm5zIFRoZSByZWdpc3RlcmVkIHR5cGUgbmFtZVxuICogQHRocm93cyBFcnJvciBpZiBUWVBFX05BTUUgaXMgbWlzc2luZyBvciBlbXB0eVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGNvbnN0IHR5cGVOYW1lID0gZ2V0VHlwZU5hbWUoKTtcbiAqIGNvbnNvbGUubG9nKGBUeXBlOiAke3R5cGVOYW1lfWApO1xuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRUeXBlTmFtZSgpOiBzdHJpbmcge1xuICBjb25zdCB2YWx1ZSA9IHByb2Nlc3MuZW52W0NBUkRTX0VOVl9WQVJTLlRZUEVfTkFNRV07XG4gIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IHZhbHVlID09PSAnJykge1xuICAgIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyByZXF1aXJlZCBlbnZpcm9ubWVudCB2YXJpYWJsZTogJHtDQVJEU19FTlZfVkFSUy5UWVBFX05BTUV9YCk7XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG4vKipcbiAqIFJlYWRzIHRoZSB0eXBlIHZlcnNpb24gZnJvbSB0aGUgZW52aXJvbm1lbnQuXG4gKlxuICogVGhpcyB2ZXJzaW9uIGNvbWVzIGZyb20gdGhlIHR5cGUgY29uZmlndXJhdGlvbiBpbiBzZXR0aW5ncy5qc29uLlxuICogQHJldHVybnMgVGhlIHZlcnNpb24gc3RyaW5nIGZyb20gdHlwZSBjb25maWdcbiAqIEB0aHJvd3MgRXJyb3IgaWYgVFlQRV9WRVJTSU9OIGlzIG1pc3Npbmcgb3IgZW1wdHlcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBjb25zdCB2ZXJzaW9uID0gZ2V0VHlwZVZlcnNpb24oKTtcbiAqIGNvbnNvbGUubG9nKGBWZXJzaW9uOiAke3ZlcnNpb259YCk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldFR5cGVWZXJzaW9uKCk6IHN0cmluZyB7XG4gIGNvbnN0IHZhbHVlID0gcHJvY2Vzcy5lbnZbQ0FSRFNfRU5WX1ZBUlMuVFlQRV9WRVJTSU9OXTtcbiAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQgfHwgdmFsdWUgPT09ICcnKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIHJlcXVpcmVkIGVudmlyb25tZW50IHZhcmlhYmxlOiAke0NBUkRTX0VOVl9WQVJTLlRZUEVfVkVSU0lPTn1gKTtcbiAgfVxuICByZXR1cm4gdmFsdWU7XG59XG5cbi8qKlxuICogUmVhZHMgdGhlIHR5cGVkIGZpbGUgbmFtZSBmb3IgdHlwZSBob29rIGV2ZW50cy5cbiAqXG4gKiBUaGlzIGlzIHRoZSBmaWxlIG5hbWUgcmVsYXRpdmUgdG8gdGhlIHR5cGUgZGlyZWN0b3J5LCBub3QgYSBmdWxsIHBhdGguXG4gKiBAcmV0dXJucyBUaGUgZmlsZSBuYW1lIHdpdGhpbiB0aGUgdHlwZSBkaXJlY3RvcnlcbiAqIEB0aHJvd3MgRXJyb3IgaWYgRklMRV9OQU1FIGlzIG1pc3Npbmcgb3IgZW1wdHlcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBjb25zdCBmaWxlTmFtZSA9IGdldEZpbGVOYW1lKCk7XG4gKiBjb25zb2xlLmxvZyhgRmlsZTogJHtmaWxlTmFtZX1gKTtcbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0RmlsZU5hbWUoKTogc3RyaW5nIHtcbiAgY29uc3QgdmFsdWUgPSBwcm9jZXNzLmVudltDQVJEU19FTlZfVkFSUy5GSUxFX05BTUVdO1xuICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gJycpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYE1pc3NpbmcgcmVxdWlyZWQgZW52aXJvbm1lbnQgdmFyaWFibGU6ICR7Q0FSRFNfRU5WX1ZBUlMuRklMRV9OQU1FfWApO1xuICB9XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuLyoqXG4gKiBSZWFkcyB0aGUgYWJzb2x1dGUgcGF0aCB0byB0aGUgdHlwZWQgZmlsZS5cbiAqXG4gKiBUaGlzIGlzIHRoZSBmdWxseSByZXNvbHZlZCBwYXRoIG9uIGRpc2sgcHJvdmlkZWQgYnkgdGhlIGV4ZWN1dGlvbiB3cmFwcGVyLlxuICogQHJldHVybnMgVGhlIGZ1bGwgcGF0aCB0byB0aGUgZmlsZVxuICogQHRocm93cyBFcnJvciBpZiBGSUxFX1BBVEggaXMgbWlzc2luZyBvciBlbXB0eVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGNvbnN0IGZpbGVQYXRoID0gZ2V0RmlsZVBhdGgoKTtcbiAqIGNvbnNvbGUubG9nKGBQYXRoOiAke2ZpbGVQYXRofWApO1xuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRGaWxlUGF0aCgpOiBzdHJpbmcge1xuICBjb25zdCB2YWx1ZSA9IHByb2Nlc3MuZW52W0NBUkRTX0VOVl9WQVJTLkZJTEVfUEFUSF07XG4gIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IHZhbHVlID09PSAnJykge1xuICAgIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyByZXF1aXJlZCBlbnZpcm9ubWVudCB2YXJpYWJsZTogJHtDQVJEU19FTlZfVkFSUy5GSUxFX1BBVEh9YCk7XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG4vKipcbiAqIFJlYWRzIHRoZSB0eXBlZCBmaWxlIHNpemUgZnJvbSB0aGUgZW52aXJvbm1lbnQuXG4gKlxuICogVGhlIHZhbHVlIGlzIHBhcnNlZCBhcyBhIGJhc2UtMTAgaW50ZWdlci5cbiAqIEByZXR1cm5zIFRoZSBmaWxlIHNpemUgaW4gYnl0ZXNcbiAqIEB0aHJvd3MgRXJyb3IgaWYgRklMRV9TSVpFIGlzIG1pc3Npbmcgb3Igbm90IGEgbnVtYmVyXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogY29uc3Qgc2l6ZSA9IGdldEZpbGVTaXplKCk7XG4gKiBjb25zb2xlLmxvZyhgU2l6ZTogJHtzaXplfSBieXRlc2ApO1xuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRGaWxlU2l6ZSgpOiBudW1iZXIge1xuICBjb25zdCB2YWx1ZSA9IHByb2Nlc3MuZW52W0NBUkRTX0VOVl9WQVJTLkZJTEVfU0laRV07XG4gIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IHZhbHVlID09PSAnJykge1xuICAgIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyByZXF1aXJlZCBlbnZpcm9ubWVudCB2YXJpYWJsZTogJHtDQVJEU19FTlZfVkFSUy5GSUxFX1NJWkV9YCk7XG4gIH1cbiAgY29uc3Qgc2l6ZSA9IE51bWJlci5wYXJzZUludCh2YWx1ZSwgMTApO1xuICBpZiAoTnVtYmVyLmlzTmFOKHNpemUpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBJbnZhbGlkICR7Q0FSRFNfRU5WX1ZBUlMuRklMRV9TSVpFfTogZXhwZWN0ZWQgbnVtYmVyLCBnb3QgXCIke3ZhbHVlfVwiYCk7XG4gIH1cbiAgcmV0dXJuIHNpemU7XG59XG5cbi8qKlxuICogUmVhZHMgdGhlIFNIQTI1NiBoYXNoIGZvciB0aGUgdHlwZWQgZmlsZSBjb250ZW50LlxuICpcbiAqIFVzZWZ1bCBmb3IgZGV0ZWN0aW5nIGNvbnRlbnQgY2hhbmdlcyB3aXRob3V0IHJlYWRpbmcgdGhlIGZpbGUgYWdhaW4uXG4gKiBAcmV0dXJucyBUaGUgU0hBMjU2IGhhc2ggb2YgdGhlIGNvbnRlbnRcbiAqIEB0aHJvd3MgRXJyb3IgaWYgU0hBMjU2IGlzIG1pc3Npbmcgb3IgZW1wdHlcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBjb25zdCBoYXNoID0gZ2V0U2hhMjU2KCk7XG4gKiBjb25zb2xlLmxvZyhgSGFzaDogJHtoYXNofWApO1xuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRTaGEyNTYoKTogc3RyaW5nIHtcbiAgY29uc3QgdmFsdWUgPSBwcm9jZXNzLmVudltDQVJEU19FTlZfVkFSUy5TSEEyNTZdO1xuICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gJycpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYE1pc3NpbmcgcmVxdWlyZWQgZW52aXJvbm1lbnQgdmFyaWFibGU6ICR7Q0FSRFNfRU5WX1ZBUlMuU0hBMjU2fWApO1xuICB9XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuLyoqXG4gKiBSZWFkcyB0aGUgTUlNRSB0eXBlIGZvciB0aGUgdHlwZWQgZmlsZSBjb250ZW50LlxuICpcbiAqIFByb3ZpZGVkIGZvciB0eXBlIGhvb2sgZXZlbnRzIHNvIHZhbGlkYXRvcnMgY2FuIGJyYW5jaCBvbiBjb250ZW50IHR5cGUuXG4gKiBAcmV0dXJucyBUaGUgTUlNRSB0eXBlIG9mIHRoZSBjb250ZW50XG4gKiBAdGhyb3dzIEVycm9yIGlmIENPTlRFTlRfVFlQRSBpcyBtaXNzaW5nIG9yIGVtcHR5XG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogY29uc3QgY29udGVudFR5cGUgPSBnZXRDb250ZW50VHlwZSgpO1xuICogY29uc29sZS5sb2coYENvbnRlbnQgdHlwZTogJHtjb250ZW50VHlwZX1gKTtcbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0Q29udGVudFR5cGUoKTogc3RyaW5nIHtcbiAgY29uc3QgdmFsdWUgPSBwcm9jZXNzLmVudltDQVJEU19FTlZfVkFSUy5DT05URU5UX1RZUEVdO1xuICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gJycpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYE1pc3NpbmcgcmVxdWlyZWQgZW52aXJvbm1lbnQgdmFyaWFibGU6ICR7Q0FSRFNfRU5WX1ZBUlMuQ09OVEVOVF9UWVBFfWApO1xuICB9XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuLyoqXG4gKiBSZWFkcyB0aGUgVlMgQ29kZSBidW5kbGVkIE5vZGUuanMgaW50ZXJwcmV0ZXIgcGF0aCBmcm9tIHRoZSBlbnZpcm9ubWVudC5cbiAqXG4gKiBUaGlzIGlzIHNldCBieSB0aGUgZXh0ZW5zaW9uIGR1cmluZyBhY3RpdmF0aW9uIGFuZCBpbmplY3RlZCBpbnRvIGFsbFxuICogc3Bhd25lZCBhY3Rpb24vaG9vayBwcm9jZXNzZXMuIENvbmZpZ3VyYXRpb24gYXV0aG9ycyBjYW4gdXNlIGl0IHRvIGludm9rZVxuICogTm9kZS5qcyB3aXRob3V0IHJlbHlpbmcgb24gdGhlIHN5c3RlbSBQQVRILlxuICpcbiAqIEByZXR1cm5zIFRoZSBwYXRoIHRvIHRoZSBOb2RlLmpzIGludGVycHJldGVyXG4gKiBAdGhyb3dzIEVycm9yIGlmIFZTQ09ERV9OT0RFIGlzIG1pc3Npbmcgb3IgZW1wdHlcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBjb25zdCBub2RlUGF0aCA9IGdldFZzY29kZU5vZGVQYXRoKCk7XG4gKiBleGVjRmlsZVN5bmMobm9kZVBhdGgsIFsnc2NyaXB0LmpzJ10pO1xuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRWc2NvZGVOb2RlUGF0aCgpOiBzdHJpbmcge1xuICBjb25zdCB2YWx1ZSA9IHByb2Nlc3MuZW52W0NBUkRTX0VOVl9WQVJTLlZTQ09ERV9OT0RFXTtcbiAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQgfHwgdmFsdWUgPT09ICcnKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIHJlcXVpcmVkIGVudmlyb25tZW50IHZhcmlhYmxlOiAke0NBUkRTX0VOVl9WQVJTLlZTQ09ERV9OT0RFfWApO1xuICB9XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuLyoqXG4gKiBSZWFkcyB0aGUgVW5peCBkb21haW4gc29ja2V0IHBhdGggZm9yIHJ1bnRpbWUtdG8tZGlzcGF0Y2hlciBjb21tdW5pY2F0aW9uLlxuICpcbiAqIEByZXR1cm5zIFVuaXggc29ja2V0IHBhdGggdXNlZCB0byBzZW5kIHJ1bnRpbWUgY29udHJvbCBtZXNzYWdlcy5cbiAqIEB0aHJvd3MgRXJyb3IgaWYgU09DS0VUX1BBVEggaXMgbWlzc2luZyBvciBlbXB0eVxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0U29ja2V0UGF0aCgpOiBzdHJpbmcge1xuICBjb25zdCB2YWx1ZSA9IHByb2Nlc3MuZW52W0NBUkRTX0VOVl9WQVJTLlNPQ0tFVF9QQVRIXTtcbiAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQgfHwgdmFsdWUgPT09ICcnKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIHJlcXVpcmVkIGVudmlyb25tZW50IHZhcmlhYmxlOiAke0NBUkRTX0VOVl9WQVJTLlNPQ0tFVF9QQVRIfWApO1xuICB9XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuLyoqXG4gKiBSZWFkcyB0aGUgcGF0aCB0byB0aGUgc3dpdGNoVG9JbnRlcmFjdGl2ZSBkYXRhIGZpbGUuXG4gKlxuICogVGhpcyBpcyBvcHRpb25hbCBcdTIwMTQgcmV0dXJucyB1bmRlZmluZWQgd2hlbiBub3Qgc2V0IChpLmUuLCB0aGUgYWN0aW9uXG4gKiB3YXMgbm90IHJlbGF1bmNoZWQgdmlhIHN3aXRjaFRvSW50ZXJhY3RpdmUpLlxuICpcbiAqIEByZXR1cm5zIFRoZSBmaWxlIHBhdGgsIG9yIHVuZGVmaW5lZCBpZiBub3Qgc2V0XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRTd2l0Y2hUb0ludGVyYWN0aXZlRGF0YVBhdGgoKTogc3RyaW5nIHwgdW5kZWZpbmVkIHtcbiAgY29uc3QgdmFsdWUgPSBwcm9jZXNzLmVudltDQVJEU19FTlZfVkFSUy5TV0lUQ0hfVE9fSU5URVJBQ1RJVkVfREFUQV9QQVRIXTtcbiAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQgfHwgdmFsdWUgPT09ICcnKSB7XG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfVxuICByZXR1cm4gdmFsdWU7XG59XG5cbi8qKlxuICogUmVhZHMgdGhlIHNldHRpbmdzIGNvbmZpZ3VyYXRpb24gZGlyZWN0b3J5IHBhdGguXG4gKlxuICogQHJldHVybnMgQWJzb2x1dGUgcGF0aCB0byB0aGUgZGlyZWN0b3J5IGNvbnRhaW5pbmcgZ2VuZXJhdGVkIHNldHRpbmdzIGFydGlmYWN0cy5cbiAqIEB0aHJvd3MgRXJyb3IgaWYgQ09ORklHX1BBVEggaXMgbWlzc2luZyBvciBlbXB0eVxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0Q29uZmlnUGF0aCgpOiBzdHJpbmcge1xuICBjb25zdCB2YWx1ZSA9IHByb2Nlc3MuZW52W0NBUkRTX0VOVl9WQVJTLkNPTkZJR19QQVRIXTtcbiAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQgfHwgdmFsdWUgPT09ICcnKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIHJlcXVpcmVkIGVudmlyb25tZW50IHZhcmlhYmxlOiAke0NBUkRTX0VOVl9WQVJTLkNPTkZJR19QQVRIfWApO1xuICB9XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuLyoqXG4gKiBSZWFkcyB0aGUgd29ya3NwYWNlIHBhdGggc2V0IGJ5IHRoZSBhY3Rpb24gaGFuZGxlciAoZS5nLiwgdGhlIHdvcmt0cmVlIHBhdGgpLlxuICpcbiAqIFRoaXMgaXMgZm9yIGhvb2tzIHJ1bm5pbmcgaW5zaWRlIHRoZSBDbGF1ZGUgQ0xJLCAqKm5vdCoqIGZvciBhY3Rpb24gaGFuZGxlcnMuXG4gKiBBY3Rpb24gaGFuZGxlcnMgc2hvdWxkIHVzZSB7QGxpbmsgZ2V0UmVwb1Jvb3R9IGluc3RlYWQuXG4gKlxuICogQHJldHVybnMgQWJzb2x1dGUgcGF0aCB0byB0aGUgYWN0aXZlIHdvcmtzcGFjZSAvIHdvcmt0cmVlLlxuICogQHRocm93cyBFcnJvciBpZiBXT1JLU1BBQ0VfUEFUSCBpcyBtaXNzaW5nIG9yIGVtcHR5XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRXb3Jrc3BhY2VQYXRoKCk6IHN0cmluZyB7XG4gIGNvbnN0IHZhbHVlID0gcHJvY2Vzcy5lbnZbQ0FSRFNfRU5WX1ZBUlMuV09SS1NQQUNFX1BBVEhdO1xuICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gJycpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYE1pc3NpbmcgcmVxdWlyZWQgZW52aXJvbm1lbnQgdmFyaWFibGU6ICR7Q0FSRFNfRU5WX1ZBUlMuV09SS1NQQUNFX1BBVEh9YCk7XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG4vKipcbiAqIFJlYWRzIHRoZSBtYWluIGdpdCByZXBvc2l0b3J5IHJvb3QgcGF0aC5cbiAqXG4gKiBTZXQgYnkgQWN0aW9uRGlzcGF0Y2hlcjsgdXNlZCBieSBhY3Rpb24gaGFuZGxlcnMgdG8gcmVzb2x2ZSB3b3JrdHJlZXNcbiAqIGFuZCBwZXJmb3JtIGdpdCBvcGVyYXRpb25zIGFnYWluc3QgdGhlIG1haW4gcmVwb3NpdG9yeS5cbiAqXG4gKiBAcmV0dXJucyBBYnNvbHV0ZSBwYXRoIHRvIHRoZSBtYWluIGdpdCByZXBvc2l0b3J5IHJvb3QgKE5PVCBhIHdvcmt0cmVlKS5cbiAqIEB0aHJvd3MgRXJyb3IgaWYgUkVQT19ST09UIGlzIG1pc3Npbmcgb3IgZW1wdHlcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldFJlcG9Sb290KCk6IHN0cmluZyB7XG4gIGNvbnN0IHZhbHVlID0gcHJvY2Vzcy5lbnZbQ0FSRFNfRU5WX1ZBUlMuUkVQT19ST09UXTtcbiAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQgfHwgdmFsdWUgPT09ICcnKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIHJlcXVpcmVkIGVudmlyb25tZW50IHZhcmlhYmxlOiAke0NBUkRTX0VOVl9WQVJTLlJFUE9fUk9PVH1gKTtcbiAgfVxuICByZXR1cm4gdmFsdWU7XG59XG5cbi8qKlxuICogUmVhZHMgdGhlIGNhcmQncyByZXBvc2l0b3J5IGRpcmVjdG9yeSBwYXRoLlxuICpcbiAqIEByZXR1cm5zIEFic29sdXRlIHBhdGggdG8gdGhlIHJlcG9zaXRvcnkgYXNzb2NpYXRlZCB3aXRoIHRoZSBhY3RpdmUgY2FyZC5cbiAqIEB0aHJvd3MgRXJyb3IgaWYgQ0FSRF9SRVBPX1BBVEggaXMgbWlzc2luZyBvciBlbXB0eVxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0Q2FyZFJlcG9QYXRoKCk6IHN0cmluZyB7XG4gIGNvbnN0IHZhbHVlID0gcHJvY2Vzcy5lbnZbQ0FSRFNfRU5WX1ZBUlMuQ0FSRF9SRVBPX1BBVEhdO1xuICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gJycpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYE1pc3NpbmcgcmVxdWlyZWQgZW52aXJvbm1lbnQgdmFyaWFibGU6ICR7Q0FSRFNfRU5WX1ZBUlMuQ0FSRF9SRVBPX1BBVEh9YCk7XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG4vKipcbiAqIFJlYWRzIHRoZSBWUyBDb2RlIGV4dGVuc2lvbiBpbnN0YWxsYXRpb24gZGlyZWN0b3J5IHBhdGguXG4gKlxuICogU2V0IGJ5IHRoZSBleHRlbnNpb24gaG9zdCBmcm9tIGBjb250ZXh0LmV4dGVuc2lvblVyaS5mc1BhdGhgIGFuZCBpbmplY3RlZFxuICogaW50byBhbGwgc3Bhd25lZCBhY3Rpb24gcHJvY2Vzc2VzLiBVc2UgdGhpcyB0byBsb2NhdGUgYnVuZGxlZCBhc3NldHMgc3VjaFxuICogYXMgdGhlIHJ1bnRpbWUgcGx1Z2luIGRpcmVjdG9yeSAoYDxleHRlbnNpb25QYXRoPi9kaXN0L3BsdWdpbnMvcnVudGltZWApLlxuICpcbiAqIEByZXR1cm5zIEFic29sdXRlIHBhdGggdG8gdGhlIGV4dGVuc2lvbiBpbnN0YWxsYXRpb24gZGlyZWN0b3J5LlxuICogQHRocm93cyBFcnJvciBpZiBFWFRFTlNJT05fUEFUSCBpcyBtaXNzaW5nIG9yIGVtcHR5XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRFeHRlbnNpb25QYXRoKCk6IHN0cmluZyB7XG4gIGNvbnN0IHZhbHVlID0gcHJvY2Vzcy5lbnZbQ0FSRFNfRU5WX1ZBUlMuRVhURU5TSU9OX1BBVEhdO1xuICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gJycpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYE1pc3NpbmcgcmVxdWlyZWQgZW52aXJvbm1lbnQgdmFyaWFibGU6ICR7Q0FSRFNfRU5WX1ZBUlMuRVhURU5TSU9OX1BBVEh9YCk7XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG4vKipcbiAqIFJlYWRzIGFuZCBwYXJzZXMgdGhlIHN3aXRjaFRvSW50ZXJhY3RpdmUgZGF0YSBmaWxlLlxuICpcbiAqIFdoZW4gYFNXSVRDSF9UT19JTlRFUkFDVElWRV9EQVRBX1BBVEhgIGlzIHNldCwgcmVhZHMgdGhlIGZpbGUgYXQgdGhhdCBwYXRoXG4gKiBhbmQgcGFyc2VzIGl0IGFzIEpTT04uIFJldHVybnMgdW5kZWZpbmVkIGlmIHRoZSBlbnYgdmFyIGlzIG5vdCBzZXQuXG4gKlxuICogQHJldHVybnMgVGhlIHBhcnNlZCBkYXRhLCBvciB1bmRlZmluZWQgaWYgdGhlIHBhdGggaXMgbm90IHNldFxuICogQHRocm93cyBFcnJvciBpZiB0aGUgZmlsZSBjYW5ub3QgYmUgcmVhZCBvciBjb250YWlucyBpbnZhbGlkIEpTT05cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJlYWRTd2l0Y2hUb0ludGVyYWN0aXZlRGF0YSgpOiB1bmtub3duIHwgdW5kZWZpbmVkIHtcbiAgY29uc3QgZGF0YVBhdGggPSBnZXRTd2l0Y2hUb0ludGVyYWN0aXZlRGF0YVBhdGgoKTtcbiAgaWYgKGRhdGFQYXRoID09PSB1bmRlZmluZWQpIHtcbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9XG4gIGNvbnN0IGNvbnRlbnQgPSByZWFkRmlsZVN5bmMoZGF0YVBhdGgsICd1dGYtOCcpO1xuICByZXR1cm4gSlNPTi5wYXJzZShjb250ZW50KTtcbn1cblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gVHlwZWQgSW5wdXQgRXh0cmFjdGlvblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4vKipcbiAqIEJ1aWxkcyBhIHR5cGVkIGFjdGlvbiBpbnB1dCBvYmplY3QgZnJvbSBlbnZpcm9ubWVudCB2YXJpYWJsZXMuXG4gKlxuICogRXh0cmFjdHMgYWxsIGZpZWxkcyByZXF1aXJlZCBmb3IgYWN0aW9uIGhhbmRsZXJzLlxuICpcbiAqIEByZXR1cm5zIFR5cGVkIEFjdGlvbklucHV0IG9iamVjdFxuICogQHRocm93cyBFcnJvciBpZiByZXF1aXJlZCBlbnYgdmFycyBhcmUgbWlzc2luZyBvciBpbnZhbGlkXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogLy8gRm9yIGFuIGFjdGlvbiBoYW5kbGVyXG4gKiBjb25zdCBpbnB1dCA9IGV4dHJhY3RBY3Rpb25JbnB1dCgpO1xuICogY29uc29sZS5sb2coaW5wdXQuY2FyZElkKTtcbiAqIGNvbnNvbGUubG9nKGlucHV0LmV4ZWN1dGlvbk1vZGUpO1xuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBleHRyYWN0QWN0aW9uSW5wdXQoKTogQWN0aW9uSW5wdXQge1xuICByZXR1cm4ge1xuICAgIGNhcmRJZDogZ2V0Q2FyZElkKCksXG4gICAgYWN0aW9uTmFtZTogZ2V0QWN0aW9uTmFtZSgpLFxuICAgIGVudmlyb25tZW50OiBnZXRFbnZpcm9ubWVudCgpLFxuICAgIGV4ZWN1dGlvbk1vZGU6IGdldEV4ZWN1dGlvbk1vZGUoKSxcbiAgICBhcGlCYXNlVXJsOiBnZXRBcGlCYXNlVXJsKCksXG4gICAgYXBpQWNjZXNzVG9rZW46IGdldEFwaUFjY2Vzc1Rva2VuKCksXG4gICAgY29kaW5nQWdlbnQ6IGdldENvZGluZ0FnZW50KCksXG4gICAgc3dpdGNoVG9JbnRlcmFjdGl2ZURhdGE6IHJlYWRTd2l0Y2hUb0ludGVyYWN0aXZlRGF0YSgpLFxuICAgIHJlcG9Sb290OiBnZXRSZXBvUm9vdCgpLFxuICAgIGNhcmRSZXBvUGF0aDogZ2V0Q2FyZFJlcG9QYXRoKCksXG4gICAgY29uZmlnUGF0aDogZ2V0Q29uZmlnUGF0aCgpLFxuICAgIGV4dGVuc2lvblBhdGg6IGdldEV4dGVuc2lvblBhdGgoKVxuICB9O1xufVxuXG4vKipcbiAqIEJ1aWxkcyBhIHR5cGVkIHR5cGUgaG9vayBpbnB1dCBvYmplY3QgZnJvbSBlbnZpcm9ubWVudCB2YXJpYWJsZXMuXG4gKlxuICogRXh0cmFjdHMgYWxsIGZpZWxkcyByZXF1aXJlZCBmb3IgdHlwZSBsaWZlY3ljbGUgaG9va3MgKHZhbGlkYXRvciwgY3JlYXRlLFxuICogdXBkYXRlLCBkZWxldGUpLlxuICpcbiAqIEByZXR1cm5zIFR5cGVkIFR5cGVIb29rSW5wdXQgb2JqZWN0XG4gKiBAdGhyb3dzIEVycm9yIGlmIHJlcXVpcmVkIGVudiB2YXJzIGFyZSBtaXNzaW5nIG9yIGludmFsaWRcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiAvLyBGb3IgYSB0eXBlIGhvb2sgaGFuZGxlclxuICogY29uc3QgaW5wdXQgPSBleHRyYWN0VHlwZUlucHV0KCk7XG4gKiBjb25zb2xlLmxvZyhpbnB1dC50eXBlTmFtZSk7XG4gKiBjb25zb2xlLmxvZyhpbnB1dC5maWxlTmFtZSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGV4dHJhY3RUeXBlSW5wdXQoKTogVHlwZUhvb2tJbnB1dCB7XG4gIHJldHVybiB7XG4gICAgY2FyZElkOiBnZXRDYXJkSWQoKSxcbiAgICBlbnZpcm9ubWVudDogZ2V0RW52aXJvbm1lbnQoKSxcbiAgICB0eXBlTmFtZTogZ2V0VHlwZU5hbWUoKSxcbiAgICB0eXBlVmVyc2lvbjogZ2V0VHlwZVZlcnNpb24oKSxcbiAgICBmaWxlTmFtZTogZ2V0RmlsZU5hbWUoKSxcbiAgICBmaWxlUGF0aDogZ2V0RmlsZVBhdGgoKSxcbiAgICBmaWxlU2l6ZTogZ2V0RmlsZVNpemUoKSxcbiAgICBmaWxlU2hhMjU2OiBnZXRTaGEyNTYoKSxcbiAgICBjb250ZW50VHlwZTogZ2V0Q29udGVudFR5cGUoKSxcbiAgICBhcGlCYXNlVXJsOiBnZXRBcGlCYXNlVXJsKCksXG4gICAgYXBpQWNjZXNzVG9rZW46IGdldEFwaUFjY2Vzc1Rva2VuKClcbiAgfTtcbn1cbiIsICIvKipcbiAqIEVudmlyb25tZW50IHZhcmlhYmxlIHV0aWxpdGllcyBmb3IgQ2xhdWRlIENvZGUgaG9va3MuXG4gKlxuICogUHJvdmlkZXMgdHlwZWQgYWNjZXNzIHRvIENsYXVkZSBDb2RlJ3MgZW52aXJvbm1lbnQgdmFyaWFibGVzIGFuZCB1dGlsaXRpZXNcbiAqIGZvciBwZXJzaXN0aW5nIGVudmlyb25tZW50IHZhcmlhYmxlcyBpbiBTZXNzaW9uU3RhcnQgaG9va3MuXG4gKlxuICogIyMgRW52aXJvbm1lbnQgVmFyaWFibGVzXG4gKlxuICogQ2xhdWRlIENvZGUgc2V0cyB0aGVzZSBlbnZpcm9ubWVudCB2YXJpYWJsZXMgd2hlbiBydW5uaW5nIGhvb2tzOlxuICpcbiAqIHwgVmFyaWFibGUgfCBEZXNjcmlwdGlvbiB8IEF2YWlsYWJsZSBJbiB8XG4gKiB8LS0tLS0tLS0tLXwtLS0tLS0tLS0tLS0tfC0tLS0tLS0tLS0tLS0tfFxuICogfCBgQ0xBVURFX1BST0pFQ1RfRElSYCB8IEFic29sdXRlIHBhdGggdG8gcHJvamVjdCByb290IHwgQWxsIGhvb2tzIHxcbiAqIHwgYENMQVVERV9FTlZfRklMRWAgfCBQYXRoIHRvIGZpbGUgZm9yIHBlcnNpc3RpbmcgZW52IHZhcnMgfCBTZXNzaW9uU3RhcnQgb25seSB8XG4gKiB8IGBDTEFVREVfQ09ERV9SRU1PVEVgIHwgYFwidHJ1ZVwiYCBpZiBydW5uaW5nIHJlbW90ZWx5IHwgQWxsIGhvb2tzIHxcbiAqIEBtb2R1bGVcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBpbXBvcnQgeyBnZXRQcm9qZWN0RGlyLCBwZXJzaXN0RW52VmFyLCBpc1JlbW90ZUVudmlyb25tZW50IH0gZnJvbSAnQGdvb2Rmb290L2NsYXVkZS1jb2RlLWhvb2tzJztcbiAqXG4gKiAvLyBHZXQgcHJvamVjdCBkaXJlY3RvcnlcbiAqIGNvbnN0IHByb2plY3REaXIgPSBnZXRQcm9qZWN0RGlyKCk7XG4gKlxuICogLy8gQ2hlY2sgaWYgcnVubmluZyByZW1vdGVseVxuICogaWYgKGlzUmVtb3RlRW52aXJvbm1lbnQoKSkge1xuICogICAvLyBIYW5kbGUgcmVtb3RlLXNwZWNpZmljIGxvZ2ljXG4gKiB9XG4gKlxuICogLy8gSW4gU2Vzc2lvblN0YXJ0IGhvb2s6IHBlcnNpc3QgZW52aXJvbm1lbnQgdmFyaWFibGVzXG4gKiBwZXJzaXN0RW52VmFyKCdOT0RFX0VOVicsICdwcm9kdWN0aW9uJyk7XG4gKiBwZXJzaXN0RW52VmFyKCdBUElfS0VZJywgJ3NlY3JldC1rZXknKTtcbiAqIGBgYFxuICogQHNlZSBodHRwczovL2NvZGUuY2xhdWRlLmNvbS9kb2NzL2VuL2hvb2tzI2hvb2stZXhlY3V0aW9uLWRldGFpbHNcbiAqL1xuaW1wb3J0ICogYXMgZnMgZnJvbSBcIm5vZGU6ZnNcIjtcbi8qKlxuICogQ2xhdWRlIENvZGUgZW52aXJvbm1lbnQgdmFyaWFibGUgbmFtZXMuXG4gKlxuICogVGhlc2UgYXJlIHRoZSBlbnZpcm9ubWVudCB2YXJpYWJsZXMgdGhhdCBDbGF1ZGUgQ29kZSBzZXRzIHdoZW4gcnVubmluZyBob29rcy5cbiAqL1xuZXhwb3J0IGNvbnN0IENMQVVERV9FTlZfVkFSUyA9IHtcbiAgICAvKipcbiAgICAgKiBBYnNvbHV0ZSBwYXRoIHRvIHRoZSBwcm9qZWN0IHJvb3QgZGlyZWN0b3J5IHdoZXJlIENsYXVkZSBDb2RlIHdhcyBzdGFydGVkLlxuICAgICAqIEF2YWlsYWJsZSBpbiBhbGwgaG9va3MuXG4gICAgICovXG4gICAgUFJPSkVDVF9ESVI6IFwiQ0xBVURFX1BST0pFQ1RfRElSXCIsXG4gICAgLyoqXG4gICAgICogUGF0aCB0byBhIGZpbGUgd2hlcmUgU2Vzc2lvblN0YXJ0IGhvb2tzIGNhbiBwZXJzaXN0IGVudmlyb25tZW50IHZhcmlhYmxlcy5cbiAgICAgKiBWYXJpYWJsZXMgd3JpdHRlbiB0byB0aGlzIGZpbGUgd2lsbCBiZSBhdmFpbGFibGUgaW4gYWxsIHN1YnNlcXVlbnQgYmFzaCBjb21tYW5kcy5cbiAgICAgKiBPbmx5IGF2YWlsYWJsZSBpbiBTZXNzaW9uU3RhcnQgaG9va3MuXG4gICAgICovXG4gICAgRU5WX0ZJTEU6IFwiQ0xBVURFX0VOVl9GSUxFXCIsXG4gICAgLyoqXG4gICAgICogU2V0IHRvIFwidHJ1ZVwiIHdoZW4gcnVubmluZyBpbiBhIHJlbW90ZSAod2ViKSBlbnZpcm9ubWVudC5cbiAgICAgKiBOb3Qgc2V0IG9yIGVtcHR5IHdoZW4gcnVubmluZyBpbiBsb2NhbCBDTEkgZW52aXJvbm1lbnQuXG4gICAgICovXG4gICAgUkVNT1RFOiBcIkNMQVVERV9DT0RFX1JFTU9URVwiLFxufTtcbi8qKlxuICogR2V0cyB0aGUgQ2xhdWRlIENvZGUgcHJvamVjdCBkaXJlY3RvcnkuXG4gKlxuICogVGhpcyBpcyB0aGUgYWJzb2x1dGUgcGF0aCB0byB0aGUgcHJvamVjdCByb290IHdoZXJlIENsYXVkZSBDb2RlIHdhcyBzdGFydGVkLlxuICogVGhlIHZhbHVlIGNvbWVzIGZyb20gdGhlIGBDTEFVREVfUFJPSkVDVF9ESVJgIGVudmlyb25tZW50IHZhcmlhYmxlLlxuICogQHJldHVybnMgVGhlIHByb2plY3QgZGlyZWN0b3J5IHBhdGgsIG9yIHVuZGVmaW5lZCBpZiBub3Qgc2V0XG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogY29uc3QgcHJvamVjdERpciA9IGdldFByb2plY3REaXIoKTtcbiAqIGlmIChwcm9qZWN0RGlyKSB7XG4gKiAgIGNvbnN0IGNvbmZpZ1BhdGggPSBgJHtwcm9qZWN0RGlyfS8uY2xhdWRlL2NvbmZpZy5qc29uYDtcbiAqIH1cbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0UHJvamVjdERpcigpIHtcbiAgICByZXR1cm4gcHJvY2Vzcy5lbnZbQ0xBVURFX0VOVl9WQVJTLlBST0pFQ1RfRElSXTtcbn1cbi8qKlxuICogR2V0cyB0aGUgQ2xhdWRlIENvZGUgZW52IGZpbGUgcGF0aCBmb3IgcGVyc2lzdGluZyBlbnZpcm9ubWVudCB2YXJpYWJsZXMuXG4gKlxuICogVGhpcyBpcyBvbmx5IGF2YWlsYWJsZSBpbiBTZXNzaW9uU3RhcnQgaG9va3MuIFRoZSBwYXRoIHBvaW50cyB0byBhIGZpbGVcbiAqIHdoZXJlIHlvdSBjYW4gd3JpdGUgc2hlbGwgZXhwb3J0IHN0YXRlbWVudHMgdG8gcGVyc2lzdCBlbnZpcm9ubWVudCB2YXJpYWJsZXNcbiAqIGZvciBhbGwgc3Vic2VxdWVudCBiYXNoIGNvbW1hbmRzIGluIHRoZSBzZXNzaW9uLlxuICogQHJldHVybnMgVGhlIGVudiBmaWxlIHBhdGgsIG9yIHVuZGVmaW5lZCBpZiBub3Qgc2V0IChub3QgYSBTZXNzaW9uU3RhcnQgaG9vaylcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBjb25zdCBlbnZGaWxlID0gZ2V0RW52RmlsZVBhdGgoKTtcbiAqIGlmIChlbnZGaWxlKSB7XG4gKiAgIC8vIFdlJ3JlIGluIGEgU2Vzc2lvblN0YXJ0IGhvb2sgYW5kIGNhbiBwZXJzaXN0IGVudiB2YXJzXG4gKiAgIHBlcnNpc3RFbnZWYXIoJ01ZX1ZBUicsICdteS12YWx1ZScpO1xuICogfVxuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRFbnZGaWxlUGF0aCgpIHtcbiAgICByZXR1cm4gcHJvY2Vzcy5lbnZbQ0xBVURFX0VOVl9WQVJTLkVOVl9GSUxFXTtcbn1cbi8qKlxuICogQ2hlY2tzIGlmIHRoZSBob29rIGlzIHJ1bm5pbmcgaW4gYSByZW1vdGUgKHdlYikgZW52aXJvbm1lbnQuXG4gKlxuICogUmVtb3RlIGVudmlyb25tZW50cyBtYXkgaGF2ZSBkaWZmZXJlbnQgY2FwYWJpbGl0aWVzIG9yIHJlc3RyaWN0aW9uc1xuICogY29tcGFyZWQgdG8gbG9jYWwgQ0xJIGVudmlyb25tZW50cy5cbiAqIEByZXR1cm5zIHRydWUgaWYgcnVubmluZyByZW1vdGVseSwgZmFsc2UgaWYgcnVubmluZyBsb2NhbGx5XG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogaWYgKGlzUmVtb3RlRW52aXJvbm1lbnQoKSkge1xuICogICAvLyBVc2Ugd2ViLWNvbXBhdGlibGUgYXBwcm9hY2hlc1xuICogfSBlbHNlIHtcbiAqICAgLy8gQ2FuIHVzZSBsb2NhbCBDTEkgZmVhdHVyZXNcbiAqIH1cbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNSZW1vdGVFbnZpcm9ubWVudCgpIHtcbiAgICByZXR1cm4gcHJvY2Vzcy5lbnZbQ0xBVURFX0VOVl9WQVJTLlJFTU9URV0gPT09IFwidHJ1ZVwiO1xufVxuLyoqXG4gKiBQZXJzaXN0cyBhbiBlbnZpcm9ubWVudCB2YXJpYWJsZSBmb3IgdXNlIGluIHN1YnNlcXVlbnQgYmFzaCBjb21tYW5kcy5cbiAqXG4gKiBUaGlzIGZ1bmN0aW9uIHdyaXRlcyBhIHNoZWxsIGV4cG9ydCBzdGF0ZW1lbnQgdG8gdGhlIGBDTEFVREVfRU5WX0ZJTEVgLFxuICogd2hpY2ggQ2xhdWRlIENvZGUgc291cmNlcyBiZWZvcmUgcnVubmluZyBiYXNoIGNvbW1hbmRzLiBUaGlzIGFsbG93c1xuICogU2Vzc2lvblN0YXJ0IGhvb2tzIHRvIGNvbmZpZ3VyZSB0aGUgZW52aXJvbm1lbnQgZm9yIHRoZSBlbnRpcmUgc2Vzc2lvbi5cbiAqXG4gKiAqKkltcG9ydGFudCoqOiBUaGlzIGZ1bmN0aW9uIG9ubHkgd29ya3MgaW4gU2Vzc2lvblN0YXJ0IGhvb2tzIHdoZXJlXG4gKiBgQ0xBVURFX0VOVl9GSUxFYCBpcyBzZXQuIEluIG90aGVyIGhvb2tzLCBpdCB3aWxsIHRocm93IGFuIGVycm9yLlxuICogQHBhcmFtIG5hbWUgLSBUaGUgZW52aXJvbm1lbnQgdmFyaWFibGUgbmFtZVxuICogQHBhcmFtIHZhbHVlIC0gVGhlIGVudmlyb25tZW50IHZhcmlhYmxlIHZhbHVlICh3aWxsIGJlIHNoZWxsLWVzY2FwZWQpXG4gKiBAdGhyb3dzIEVycm9yIGlmIENMQVVERV9FTlZfRklMRSBpcyBub3Qgc2V0IChub3QgaW4gYSBTZXNzaW9uU3RhcnQgaG9vaylcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBpbXBvcnQgeyBzZXNzaW9uU3RhcnRIb29rLCBzZXNzaW9uU3RhcnRPdXRwdXQsIHBlcnNpc3RFbnZWYXIgfSBmcm9tICdAZ29vZGZvb3QvY2xhdWRlLWNvZGUtaG9va3MnO1xuICpcbiAqIGV4cG9ydCBkZWZhdWx0IHNlc3Npb25TdGFydEhvb2soe30sIGFzeW5jIChpbnB1dCkgPT4ge1xuICogICAvLyBQZXJzaXN0IGVudmlyb25tZW50IHZhcmlhYmxlcyBmb3IgdGhlIHNlc3Npb25cbiAqICAgcGVyc2lzdEVudlZhcignTk9ERV9FTlYnLCAncHJvZHVjdGlvbicpO1xuICogICBwZXJzaXN0RW52VmFyKCdBUElfS0VZJywgcHJvY2Vzcy5lbnYuTVlfQVBJX0tFWSA/PyAnZGVmYXVsdCcpO1xuICogICBwZXJzaXN0RW52VmFyKCdQQVRIJywgYCR7cHJvY2Vzcy5lbnYuUEFUSH06Li9ub2RlX21vZHVsZXMvLmJpbmApO1xuICpcbiAqICAgcmV0dXJuIHNlc3Npb25TdGFydE91dHB1dCh7fSk7XG4gKiB9KTtcbiAqIGBgYFxuICogQHNlZSBodHRwczovL2NvZGUuY2xhdWRlLmNvbS9kb2NzL2VuL2hvb2tzI3BlcnNpc3RpbmctZW52aXJvbm1lbnQtdmFyaWFibGVzXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBwZXJzaXN0RW52VmFyKG5hbWUsIHZhbHVlKSB7XG4gICAgY29uc3QgZW52RmlsZSA9IGdldEVudkZpbGVQYXRoKCk7XG4gICAgaWYgKGVudkZpbGUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJwZXJzaXN0RW52VmFyIGNhbiBvbmx5IGJlIHVzZWQgaW4gU2Vzc2lvblN0YXJ0IGhvb2tzLiBcIiArIFwiQ0xBVURFX0VOVl9GSUxFIGVudmlyb25tZW50IHZhcmlhYmxlIGlzIG5vdCBzZXQuXCIpO1xuICAgIH1cbiAgICAvLyBTaGVsbC1lc2NhcGUgdGhlIHZhbHVlIHRvIGhhbmRsZSBzcGVjaWFsIGNoYXJhY3RlcnNcbiAgICBjb25zdCBlc2NhcGVkVmFsdWUgPSBlc2NhcGVTaGVsbFZhbHVlKHZhbHVlKTtcbiAgICAvLyBXcml0ZSB0aGUgZXhwb3J0IHN0YXRlbWVudFxuICAgIGNvbnN0IGV4cG9ydFN0YXRlbWVudCA9IGBleHBvcnQgJHtuYW1lfT0ke2VzY2FwZWRWYWx1ZX1cXG5gO1xuICAgIGZzLmFwcGVuZEZpbGVTeW5jKGVudkZpbGUsIGV4cG9ydFN0YXRlbWVudCwgXCJ1dGYtOFwiKTtcbn1cbi8qKlxuICogUGVyc2lzdHMgbXVsdGlwbGUgZW52aXJvbm1lbnQgdmFyaWFibGVzIGF0IG9uY2UuXG4gKlxuICogVGhpcyBpcyBhIGNvbnZlbmllbmNlIHdyYXBwZXIgYXJvdW5kIGBwZXJzaXN0RW52VmFyYCBmb3Igc2V0dGluZ1xuICogbXVsdGlwbGUgdmFyaWFibGVzIGluIGEgc2luZ2xlIGNhbGwuXG4gKiBAcGFyYW0gdmFycyAtIE9iamVjdCBtYXBwaW5nIHZhcmlhYmxlIG5hbWVzIHRvIHZhbHVlc1xuICogQHRocm93cyBFcnJvciBpZiBDTEFVREVfRU5WX0ZJTEUgaXMgbm90IHNldCAobm90IGluIGEgU2Vzc2lvblN0YXJ0IGhvb2spXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogcGVyc2lzdEVudlZhcnMoe1xuICogICBOT0RFX0VOVjogJ3Byb2R1Y3Rpb24nLFxuICogICBBUElfS0VZOiAnc2VjcmV0JyxcbiAqICAgREVCVUc6ICdmYWxzZSdcbiAqIH0pO1xuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBwZXJzaXN0RW52VmFycyh2YXJzKSB7XG4gICAgZm9yIChjb25zdCBbbmFtZSwgdmFsdWVdIG9mIE9iamVjdC5lbnRyaWVzKHZhcnMpKSB7XG4gICAgICAgIHBlcnNpc3RFbnZWYXIobmFtZSwgdmFsdWUpO1xuICAgIH1cbn1cbi8qKlxuICogRXNjYXBlcyBhIHZhbHVlIGZvciBzYWZlIHVzZSBpbiBhIHNoZWxsIGV4cG9ydCBzdGF0ZW1lbnQuXG4gKlxuICogVXNlcyBzaW5nbGUgcXVvdGVzIGFuZCBlc2NhcGVzIGFueSBlbWJlZGRlZCBzaW5nbGUgcXVvdGVzLlxuICogVGhpcyBwcmV2ZW50cyBzaGVsbCBpbmplY3Rpb24gYW5kIGhhbmRsZXMgc3BlY2lhbCBjaGFyYWN0ZXJzLlxuICogQHBhcmFtIHZhbHVlIC0gVGhlIHZhbHVlIHRvIGVzY2FwZVxuICogQHJldHVybnMgVGhlIHNoZWxsLWVzY2FwZWQgdmFsdWUgKHdpdGggcXVvdGVzKVxuICogQGludGVybmFsXG4gKi9cbmZ1bmN0aW9uIGVzY2FwZVNoZWxsVmFsdWUodmFsdWUpIHtcbiAgICAvLyBVc2Ugc2luZ2xlIHF1b3RlcyBhbmQgZXNjYXBlIGFueSBlbWJlZGRlZCBzaW5nbGUgcXVvdGVzXG4gICAgLy8gJ3ZhbHVlJyAtPiAndmFsJ1xcJyd1ZScgZm9yIHZhbHVlcyBjb250YWluaW5nIHNpbmdsZSBxdW90ZXNcbiAgICBjb25zdCBlc2NhcGVkID0gdmFsdWUucmVwbGFjZSgvJy9nLCBcIidcXFxcJydcIik7XG4gICAgcmV0dXJuIGAnJHtlc2NhcGVkfSdgO1xufVxuIiwgIi8qKlxuICogSG9vayBmYWN0b3J5IGZ1bmN0aW9ucyBmb3IgQ2xhdWRlIENvZGUgaG9va3MuXG4gKlxuICogUHJvdmlkZXMgdHlwZWQgZmFjdG9yeSBmdW5jdGlvbnMgZm9yIGFsbCAxMiBob29rIHR5cGVzIHRoYXQgaGFuZGxlOlxuICogLSBJbnB1dCB0eXBlIG5hcnJvd2luZyBiYXNlZCBvbiBob29rIGV2ZW50IHR5cGVcbiAqIC0gT3V0cHV0IHR5cGUgZW5mb3JjZW1lbnQgdmlhIHJldHVybiB0eXBlc1xuICogLSBFcnJvciB3cmFwcGluZyB3aXRoIGF1dG9tYXRpYyBsb2dnaW5nXG4gKiAtIExvZ2dlciBjb250ZXh0IGluamVjdGlvblxuICpcbiAqIEVhY2ggZmFjdG9yeSBhY2NlcHRzIGEgSG9va0NvbmZpZyB3aXRoIG9wdGlvbmFsIG1hdGNoZXIgYW5kIHRpbWVvdXQgc2V0dGluZ3MsXG4gKiBhbmQgcmV0dXJucyBhIGZ1bmN0aW9uIHRoYXQgdGhlIHJ1bnRpbWUgaW52b2tlcyB3aGVuIHRoZSBob29rIGZpbGUgZXhlY3V0ZXMuXG4gKiBAbW9kdWxlXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogaW1wb3J0IHsgcHJlVG9vbFVzZUhvb2ssIHByZVRvb2xVc2VPdXRwdXQgfSBmcm9tICdAZ29vZGZvb3QvY2xhdWRlLWNvZGUtaG9va3MnO1xuICpcbiAqIGV4cG9ydCBkZWZhdWx0IHByZVRvb2xVc2VIb29rKHsgbWF0Y2hlcjogJ0Jhc2gnIH0sIGFzeW5jIChpbnB1dCwgeyBsb2dnZXIgfSkgPT4ge1xuICogICBsb2dnZXIuaW5mbygnUHJvY2Vzc2luZyBCYXNoIGNvbW1hbmQnKTtcbiAqICAgcmV0dXJuIHByZVRvb2xVc2VPdXRwdXQoeyBhbGxvdzogdHJ1ZSB9KTtcbiAqIH0pO1xuICogYGBgXG4gKiBAc2VlIGh0dHBzOi8vY29kZS5jbGF1ZGUuY29tL2RvY3MvZW4vaG9va3NcbiAqL1xuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gR2VuZXJpYyBGYWN0b3J5XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vKipcbiAqIENyZWF0ZXMgYSBob29rIGZhY3RvcnkgZnVuY3Rpb24gZm9yIGEgc3BlY2lmaWMgaG9vayB0eXBlLlxuICpcbiAqIFRoaXMgaXMgdGhlIGludGVybmFsIGltcGxlbWVudGF0aW9uIHVzZWQgYnkgYWxsIHR5cGVkIGZhY3Rvcmllcy5cbiAqIEl0IHdyYXBzIHRoZSBoYW5kbGVyIHdpdGggZXJyb3IgY2F0Y2hpbmcgYW5kIGxvZ2dpbmcuXG4gKiBAcGFyYW0gaG9va0V2ZW50TmFtZSAtIFRoZSBob29rIGV2ZW50IG5hbWVcbiAqIEBwYXJhbSBjb25maWcgLSBIb29rIGNvbmZpZ3VyYXRpb25cbiAqIEBwYXJhbSBoYW5kbGVyIC0gVGhlIGhhbmRsZXIgZnVuY3Rpb24gdG8gd3JhcFxuICogQHJldHVybnMgQSB3cmFwcGVkIGhvb2sgZnVuY3Rpb25cbiAqIEBpbnRlcm5hbFxuICovXG5mdW5jdGlvbiBjcmVhdGVIb29rRnVuY3Rpb24oaG9va0V2ZW50TmFtZSwgY29uZmlnLCBoYW5kbGVyKSB7XG4gICAgY29uc3QgaG9va0ZuID0gYXN5bmMgKGlucHV0LCBjb250ZXh0KSA9PiB7XG4gICAgICAgIC8vIERlbGVnYXRlIGVycm9yIGhhbmRsaW5nIHRvIHRoZSBydW50aW1lIC0ganVzdCBleGVjdXRlIHRoZSBoYW5kbGVyXG4gICAgICAgIC8vIFRoZSBydW50aW1lIHdpbGwgY2F0Y2ggZXJyb3JzLCBsb2cgdGhlbSwgYW5kIHJldHVybiBhcHByb3ByaWF0ZSBvdXRwdXRcbiAgICAgICAgcmV0dXJuIGF3YWl0IGhhbmRsZXIoaW5wdXQsIGNvbnRleHQpO1xuICAgIH07XG4gICAgLy8gQXR0YWNoIG1ldGFkYXRhIGZvciBydW50aW1lIGluc3BlY3Rpb25cbiAgICBob29rRm4uaG9va0V2ZW50TmFtZSA9IGhvb2tFdmVudE5hbWU7XG4gICAgaG9va0ZuLm1hdGNoZXIgPSBjb25maWcubWF0Y2hlcjtcbiAgICBob29rRm4udGltZW91dCA9IGNvbmZpZy50aW1lb3V0O1xuICAgIHJldHVybiBob29rRm47XG59XG4vKiogQGluaGVyaXRkb2MgKi9cbmV4cG9ydCBmdW5jdGlvbiBwcmVUb29sVXNlSG9vayhjb25maWcsIGhhbmRsZXIpIHtcbiAgICByZXR1cm4gY3JlYXRlSG9va0Z1bmN0aW9uKFwiUHJlVG9vbFVzZVwiLCBjb25maWcsIGhhbmRsZXIpO1xufVxuLyoqIEBpbmhlcml0ZG9jICovXG5leHBvcnQgZnVuY3Rpb24gcG9zdFRvb2xVc2VIb29rKGNvbmZpZywgaGFuZGxlcikge1xuICAgIHJldHVybiBjcmVhdGVIb29rRnVuY3Rpb24oXCJQb3N0VG9vbFVzZVwiLCBjb25maWcsIGhhbmRsZXIpO1xufVxuLyoqIEBpbmhlcml0ZG9jICovXG5leHBvcnQgZnVuY3Rpb24gcG9zdFRvb2xVc2VGYWlsdXJlSG9vayhjb25maWcsIGhhbmRsZXIpIHtcbiAgICByZXR1cm4gY3JlYXRlSG9va0Z1bmN0aW9uKFwiUG9zdFRvb2xVc2VGYWlsdXJlXCIsIGNvbmZpZywgaGFuZGxlcik7XG59XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBOb3RpZmljYXRpb24gSG9vayBGYWN0b3J5XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vKipcbiAqIENyZWF0ZXMgYSBOb3RpZmljYXRpb24gaG9vayBoYW5kbGVyLlxuICpcbiAqIE5vdGlmaWNhdGlvbiBob29rcyBmaXJlIHdoZW4gQ2xhdWRlIENvZGUgc2VuZHMgYSBub3RpZmljYXRpb24sIGFsbG93aW5nIHlvdSB0bzpcbiAqIC0gRm9yd2FyZCBub3RpZmljYXRpb25zIHRvIGV4dGVybmFsIHN5c3RlbXNcbiAqIC0gTG9nIGltcG9ydGFudCBldmVudHNcbiAqIC0gVHJpZ2dlciBjdXN0b20gYWxlcnRpbmdcbiAqXG4gKiAqKk1hdGNoZXIqKjogTWF0Y2hlcyBhZ2FpbnN0IGBub3RpZmljYXRpb25fdHlwZWBcbiAqIEBwYXJhbSBjb25maWcgLSBIb29rIGNvbmZpZ3VyYXRpb24gd2l0aCBvcHRpb25hbCBtYXRjaGVyIGFuZCB0aW1lb3V0XG4gKiBAcGFyYW0gaGFuZGxlciAtIFRoZSBoYW5kbGVyIGZ1bmN0aW9uIHRvIGV4ZWN1dGVcbiAqIEByZXR1cm5zIEEgaG9vayBmdW5jdGlvbiB0aGF0IGNhbiBiZSBleHBvcnRlZCBhcyB0aGUgZGVmYXVsdCBleHBvcnRcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBpbXBvcnQgeyBub3RpZmljYXRpb25Ib29rLCBub3RpZmljYXRpb25PdXRwdXQgfSBmcm9tICdAZ29vZGZvb3QvY2xhdWRlLWNvZGUtaG9va3MnO1xuICpcbiAqIC8vIEZvcndhcmQgbm90aWZpY2F0aW9ucyB0byBTbGFja1xuICogZXhwb3J0IGRlZmF1bHQgbm90aWZpY2F0aW9uSG9vayh7fSwgYXN5bmMgKGlucHV0LCB7IGxvZ2dlciB9KSA9PiB7XG4gKiAgIGxvZ2dlci5pbmZvKCdOb3RpZmljYXRpb24gcmVjZWl2ZWQnLCB7XG4gKiAgICAgdHlwZTogaW5wdXQubm90aWZpY2F0aW9uX3R5cGUsXG4gKiAgICAgdGl0bGU6IGlucHV0LnRpdGxlXG4gKiAgIH0pO1xuICpcbiAqICAgYXdhaXQgc2VuZFNsYWNrTWVzc2FnZShpbnB1dC50aXRsZSA/PyAnTm90aWZpY2F0aW9uJywgaW5wdXQubWVzc2FnZSk7XG4gKlxuICogICByZXR1cm4gbm90aWZpY2F0aW9uT3V0cHV0KHt9KTtcbiAqIH0pO1xuICogYGBgXG4gKiBAc2VlIGh0dHBzOi8vY29kZS5jbGF1ZGUuY29tL2RvY3MvZW4vaG9va3Mjbm90aWZpY2F0aW9uXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBub3RpZmljYXRpb25Ib29rKGNvbmZpZywgaGFuZGxlcikge1xuICAgIHJldHVybiBjcmVhdGVIb29rRnVuY3Rpb24oXCJOb3RpZmljYXRpb25cIiwgY29uZmlnLCBoYW5kbGVyKTtcbn1cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIFVzZXJQcm9tcHRTdWJtaXQgSG9vayBGYWN0b3J5XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vKipcbiAqIENyZWF0ZXMgYSBVc2VyUHJvbXB0U3VibWl0IGhvb2sgaGFuZGxlci5cbiAqXG4gKiBVc2VyUHJvbXB0U3VibWl0IGhvb2tzIGZpcmUgd2hlbiBhIHVzZXIgc3VibWl0cyBhIHByb21wdCwgYWxsb3dpbmcgeW91IHRvOlxuICogLSBBZGQgYWRkaXRpb25hbCBjb250ZXh0IG9yIGluc3RydWN0aW9uc1xuICogLSBMb2cgdXNlciBpbnRlcmFjdGlvbnNcbiAqIC0gVmFsaWRhdGUgb3IgdHJhbnNmb3JtIHByb21wdHNcbiAqXG4gKiAqKk1hdGNoZXIqKjogTm8gbWF0Y2hlciBzdXBwb3J0IC0gZmlyZXMgb24gYWxsIHByb21wdCBzdWJtaXNzaW9uc1xuICogQHBhcmFtIGNvbmZpZyAtIEhvb2sgY29uZmlndXJhdGlvbiB3aXRoIG9wdGlvbmFsIHRpbWVvdXQgKG1hdGNoZXIgaXMgaWdub3JlZClcbiAqIEBwYXJhbSBoYW5kbGVyIC0gVGhlIGhhbmRsZXIgZnVuY3Rpb24gdG8gZXhlY3V0ZVxuICogQHJldHVybnMgQSBob29rIGZ1bmN0aW9uIHRoYXQgY2FuIGJlIGV4cG9ydGVkIGFzIHRoZSBkZWZhdWx0IGV4cG9ydFxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGltcG9ydCB7IHVzZXJQcm9tcHRTdWJtaXRIb29rLCB1c2VyUHJvbXB0U3VibWl0T3V0cHV0IH0gZnJvbSAnQGdvb2Rmb290L2NsYXVkZS1jb2RlLWhvb2tzJztcbiAqXG4gKiAvLyBBZGQgcHJvamVjdCBjb250ZXh0IHRvIGV2ZXJ5IHByb21wdFxuICogZXhwb3J0IGRlZmF1bHQgdXNlclByb21wdFN1Ym1pdEhvb2soe30sIGFzeW5jIChpbnB1dCwgeyBsb2dnZXIgfSkgPT4ge1xuICogICBsb2dnZXIuZGVidWcoJ1VzZXIgcHJvbXB0IHN1Ym1pdHRlZCcsIHsgcHJvbXB0TGVuZ3RoOiBpbnB1dC5wcm9tcHQubGVuZ3RoIH0pO1xuICpcbiAqICAgY29uc3QgcHJvamVjdENvbnRleHQgPSBhd2FpdCBnZXRQcm9qZWN0Q29udGV4dCgpO1xuICpcbiAqICAgcmV0dXJuIHVzZXJQcm9tcHRTdWJtaXRPdXRwdXQoe1xuICogICAgIGFkZGl0aW9uYWxDb250ZXh0OiBwcm9qZWN0Q29udGV4dFxuICogICB9KTtcbiAqIH0pO1xuICogYGBgXG4gKiBAc2VlIGh0dHBzOi8vY29kZS5jbGF1ZGUuY29tL2RvY3MvZW4vaG9va3MjdXNlcnByb21wdHN1Ym1pdFxuICovXG5leHBvcnQgZnVuY3Rpb24gdXNlclByb21wdFN1Ym1pdEhvb2soY29uZmlnLCBoYW5kbGVyKSB7XG4gICAgcmV0dXJuIGNyZWF0ZUhvb2tGdW5jdGlvbihcIlVzZXJQcm9tcHRTdWJtaXRcIiwgY29uZmlnLCBoYW5kbGVyKTtcbn1cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIFNlc3Npb25TdGFydCBIb29rIEZhY3Rvcnlcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8qKlxuICogQ3JlYXRlcyBhIFNlc3Npb25TdGFydCBob29rIGhhbmRsZXIuXG4gKlxuICogU2Vzc2lvblN0YXJ0IGhvb2tzIGZpcmUgd2hlbiBhIENsYXVkZSBDb2RlIHNlc3Npb24gc3RhcnRzIG9yIHJlc3RhcnRzLFxuICogYWxsb3dpbmcgeW91IHRvOlxuICogLSBJbml0aWFsaXplIHNlc3Npb24gc3RhdGVcbiAqIC0gSW5qZWN0IGNvbnRleHQgb3IgaW5zdHJ1Y3Rpb25zXG4gKiAtIFBlcnNpc3QgZW52aXJvbm1lbnQgdmFyaWFibGVzIGZvciBzdWJzZXF1ZW50IGJhc2ggY29tbWFuZHNcbiAqIC0gU2V0IHVwIGxvZ2dpbmcgb3IgbW9uaXRvcmluZ1xuICpcbiAqICoqTWF0Y2hlcioqOiBNYXRjaGVzIGFnYWluc3QgYHNvdXJjZWAgKCdzdGFydHVwJywgJ3Jlc3VtZScsICdjbGVhcicsICdjb21wYWN0JylcbiAqXG4gKiAqKkNvbnRleHQqKjogU2Vzc2lvblN0YXJ0IGhvb2tzIHJlY2VpdmUgYW4gZXh0ZW5kZWQgY29udGV4dCB3aXRoIGBwZXJzaXN0RW52VmFyYFxuICogYW5kIGBwZXJzaXN0RW52VmFyc2AgZnVuY3Rpb25zIGZvciBzZXR0aW5nIGVudmlyb25tZW50IHZhcmlhYmxlcy5cbiAqIEBwYXJhbSBjb25maWcgLSBIb29rIGNvbmZpZ3VyYXRpb24gd2l0aCBvcHRpb25hbCBtYXRjaGVyIGFuZCB0aW1lb3V0XG4gKiBAcGFyYW0gaGFuZGxlciAtIFRoZSBoYW5kbGVyIGZ1bmN0aW9uIHRvIGV4ZWN1dGVcbiAqIEByZXR1cm5zIEEgaG9vayBmdW5jdGlvbiB0aGF0IGNhbiBiZSBleHBvcnRlZCBhcyB0aGUgZGVmYXVsdCBleHBvcnRcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBpbXBvcnQgeyBzZXNzaW9uU3RhcnRIb29rLCBzZXNzaW9uU3RhcnRPdXRwdXQgfSBmcm9tICdAZ29vZGZvb3QvY2xhdWRlLWNvZGUtaG9va3MnO1xuICpcbiAqIC8vIFBlcnNpc3QgZW52aXJvbm1lbnQgdmFyaWFibGVzIGZvciB0aGUgc2Vzc2lvblxuICogZXhwb3J0IGRlZmF1bHQgc2Vzc2lvblN0YXJ0SG9vayh7IG1hdGNoZXI6ICdzdGFydHVwJyB9LCBhc3luYyAoaW5wdXQsIHsgbG9nZ2VyLCBwZXJzaXN0RW52VmFyIH0pID0+IHtcbiAqICAgbG9nZ2VyLmluZm8oJ05ldyBzZXNzaW9uIHN0YXJ0ZWQnLCB7XG4gKiAgICAgc2Vzc2lvbklkOiBpbnB1dC5zZXNzaW9uX2lkLFxuICogICAgIGN3ZDogaW5wdXQuY3dkXG4gKiAgIH0pO1xuICpcbiAqICAgLy8gU2V0IGVudmlyb25tZW50IHZhcmlhYmxlcyBmb3IgYWxsIHN1YnNlcXVlbnQgYmFzaCBjb21tYW5kc1xuICogICBwZXJzaXN0RW52VmFyKCdOT0RFX0VOVicsICdkZXZlbG9wbWVudCcpO1xuICogICBwZXJzaXN0RW52VmFyKCdERUJVRycsICd0cnVlJyk7XG4gKlxuICogICByZXR1cm4gc2Vzc2lvblN0YXJ0T3V0cHV0KHt9KTtcbiAqIH0pO1xuICogYGBgXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogLy8gU2V0IG11bHRpcGxlIGVudmlyb25tZW50IHZhcmlhYmxlcyBhdCBvbmNlXG4gKiBleHBvcnQgZGVmYXVsdCBzZXNzaW9uU3RhcnRIb29rKHt9LCBhc3luYyAoaW5wdXQsIHsgcGVyc2lzdEVudlZhcnMgfSkgPT4ge1xuICogICBwZXJzaXN0RW52VmFycyh7XG4gKiAgICAgTk9ERV9FTlY6ICdwcm9kdWN0aW9uJyxcbiAqICAgICBBUElfS0VZOiAnc2VjcmV0JyxcbiAqICAgICBERUJVRzogJ2ZhbHNlJ1xuICogICB9KTtcbiAqXG4gKiAgIHJldHVybiBzZXNzaW9uU3RhcnRPdXRwdXQoe30pO1xuICogfSk7XG4gKiBgYGBcbiAqIEBzZWUgaHR0cHM6Ly9jb2RlLmNsYXVkZS5jb20vZG9jcy9lbi9ob29rcyNzZXNzaW9uc3RhcnRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHNlc3Npb25TdGFydEhvb2soY29uZmlnLCBoYW5kbGVyKSB7XG4gICAgcmV0dXJuIGNyZWF0ZUhvb2tGdW5jdGlvbihcIlNlc3Npb25TdGFydFwiLCBjb25maWcsIGhhbmRsZXIpO1xufVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gU2Vzc2lvbkVuZCBIb29rIEZhY3Rvcnlcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8qKlxuICogQ3JlYXRlcyBhIFNlc3Npb25FbmQgaG9vayBoYW5kbGVyLlxuICpcbiAqIFNlc3Npb25FbmQgaG9va3MgZmlyZSB3aGVuIGEgQ2xhdWRlIENvZGUgc2Vzc2lvbiBlbmRzLCBhbGxvd2luZyB5b3UgdG86XG4gKiAtIENsZWFuIHVwIHNlc3Npb24gcmVzb3VyY2VzXG4gKiAtIExvZyBzZXNzaW9uIG1ldHJpY3NcbiAqIC0gUGVyc2lzdCBzZXNzaW9uIHN0YXRlXG4gKlxuICogKipNYXRjaGVyKio6IE1hdGNoZXMgYWdhaW5zdCBgcmVhc29uYCAodGhlIGV4aXQgcmVhc29uIHN0cmluZylcbiAqIEBwYXJhbSBjb25maWcgLSBIb29rIGNvbmZpZ3VyYXRpb24gd2l0aCBvcHRpb25hbCBtYXRjaGVyIGFuZCB0aW1lb3V0XG4gKiBAcGFyYW0gaGFuZGxlciAtIFRoZSBoYW5kbGVyIGZ1bmN0aW9uIHRvIGV4ZWN1dGVcbiAqIEByZXR1cm5zIEEgaG9vayBmdW5jdGlvbiB0aGF0IGNhbiBiZSBleHBvcnRlZCBhcyB0aGUgZGVmYXVsdCBleHBvcnRcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBpbXBvcnQgeyBzZXNzaW9uRW5kSG9vaywgc2Vzc2lvbkVuZE91dHB1dCB9IGZyb20gJ0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcyc7XG4gKlxuICogLy8gTG9nIHNlc3Npb24gZW5kIGFuZCBjbGVhbiB1cFxuICogZXhwb3J0IGRlZmF1bHQgc2Vzc2lvbkVuZEhvb2soe30sIGFzeW5jIChpbnB1dCwgeyBsb2dnZXIgfSkgPT4ge1xuICogICBsb2dnZXIuaW5mbygnU2Vzc2lvbiBlbmRlZCcsIHtcbiAqICAgICBzZXNzaW9uSWQ6IGlucHV0LnNlc3Npb25faWQsXG4gKiAgICAgcmVhc29uOiBpbnB1dC5yZWFzb25cbiAqICAgfSk7XG4gKlxuICogICBhd2FpdCBjbGVhbnVwU2Vzc2lvblJlc291cmNlcyhpbnB1dC5zZXNzaW9uX2lkKTtcbiAqXG4gKiAgIHJldHVybiBzZXNzaW9uRW5kT3V0cHV0KHt9KTtcbiAqIH0pO1xuICogYGBgXG4gKiBAc2VlIGh0dHBzOi8vY29kZS5jbGF1ZGUuY29tL2RvY3MvZW4vaG9va3Mjc2Vzc2lvbmVuZFxuICovXG5leHBvcnQgZnVuY3Rpb24gc2Vzc2lvbkVuZEhvb2soY29uZmlnLCBoYW5kbGVyKSB7XG4gICAgcmV0dXJuIGNyZWF0ZUhvb2tGdW5jdGlvbihcIlNlc3Npb25FbmRcIiwgY29uZmlnLCBoYW5kbGVyKTtcbn1cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIFN0b3AgSG9vayBGYWN0b3J5XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vKipcbiAqIENyZWF0ZXMgYSBTdG9wIGhvb2sgaGFuZGxlci5cbiAqXG4gKiBTdG9wIGhvb2tzIGZpcmUgd2hlbiBDbGF1ZGUgQ29kZSBpcyBhYm91dCB0byBzdG9wLCBhbGxvd2luZyB5b3UgdG86XG4gKiAtIEJsb2NrIHRoZSBzdG9wIGFuZCByZXF1aXJlIGFkZGl0aW9uYWwgYWN0aW9uXG4gKiAtIENvbmZpcm0gdGhlIHVzZXIgd2FudHMgdG8gc3RvcFxuICogLSBDbGVhbiB1cCByZXNvdXJjZXMgYmVmb3JlIHN0b3BwaW5nXG4gKlxuICogKipNYXRjaGVyKio6IE5vIG1hdGNoZXIgc3VwcG9ydCAtIGZpcmVzIG9uIGFsbCBzdG9wIGV2ZW50c1xuICogQHBhcmFtIGNvbmZpZyAtIEhvb2sgY29uZmlndXJhdGlvbiB3aXRoIG9wdGlvbmFsIHRpbWVvdXQgKG1hdGNoZXIgaXMgaWdub3JlZClcbiAqIEBwYXJhbSBoYW5kbGVyIC0gVGhlIGhhbmRsZXIgZnVuY3Rpb24gdG8gZXhlY3V0ZVxuICogQHJldHVybnMgQSBob29rIGZ1bmN0aW9uIHRoYXQgY2FuIGJlIGV4cG9ydGVkIGFzIHRoZSBkZWZhdWx0IGV4cG9ydFxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGltcG9ydCB7IHN0b3BIb29rLCBzdG9wT3V0cHV0IH0gZnJvbSAnQGdvb2Rmb290L2NsYXVkZS1jb2RlLWhvb2tzJztcbiAqXG4gKiAvLyBCbG9jayBzdG9wIGlmIHRoZXJlIGFyZSBwZW5kaW5nIGNoYW5nZXNcbiAqIGV4cG9ydCBkZWZhdWx0IHN0b3BIb29rKHt9LCBhc3luYyAoaW5wdXQsIHsgbG9nZ2VyIH0pID0+IHtcbiAqICAgY29uc3QgcGVuZGluZ0NoYW5nZXMgPSBhd2FpdCBjaGVja1BlbmRpbmdDaGFuZ2VzKCk7XG4gKlxuICogICBpZiAocGVuZGluZ0NoYW5nZXMubGVuZ3RoID4gMCkge1xuICogICAgIGxvZ2dlci53YXJuKCdCbG9ja2luZyBzdG9wIGR1ZSB0byBwZW5kaW5nIGNoYW5nZXMnLCB7XG4gKiAgICAgICBjb3VudDogcGVuZGluZ0NoYW5nZXMubGVuZ3RoXG4gKiAgICAgfSk7XG4gKlxuICogICAgIHJldHVybiBzdG9wT3V0cHV0KHtcbiAqICAgICAgIGRlY2lzaW9uOiAnYmxvY2snLFxuICogICAgICAgcmVhc29uOiBgVGhlcmUgYXJlICR7cGVuZGluZ0NoYW5nZXMubGVuZ3RofSB1bmNvbW1pdHRlZCBjaGFuZ2VzYCxcbiAqICAgICAgIHN5c3RlbU1lc3NhZ2U6ICdQbGVhc2UgY29tbWl0IG9yIGRpc2NhcmQgY2hhbmdlcyBiZWZvcmUgc3RvcHBpbmcnXG4gKiAgICAgfSk7XG4gKiAgIH1cbiAqXG4gKiAgIGxvZ2dlci5pbmZvKCdBcHByb3Zpbmcgc3RvcCcpO1xuICogICByZXR1cm4gc3RvcE91dHB1dCh7IGRlY2lzaW9uOiAnYXBwcm92ZScgfSk7XG4gKiB9KTtcbiAqIGBgYFxuICogQHNlZSBodHRwczovL2NvZGUuY2xhdWRlLmNvbS9kb2NzL2VuL2hvb2tzI3N0b3BcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHN0b3BIb29rKGNvbmZpZywgaGFuZGxlcikge1xuICAgIHJldHVybiBjcmVhdGVIb29rRnVuY3Rpb24oXCJTdG9wXCIsIGNvbmZpZywgaGFuZGxlcik7XG59XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBTdWJhZ2VudFN0YXJ0IEhvb2sgRmFjdG9yeVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLyoqXG4gKiBDcmVhdGVzIGEgU3ViYWdlbnRTdGFydCBob29rIGhhbmRsZXIuXG4gKlxuICogU3ViYWdlbnRTdGFydCBob29rcyBmaXJlIHdoZW4gYSBzdWJhZ2VudCAoVGFzayB0b29sKSBzdGFydHMsIGFsbG93aW5nIHlvdSB0bzpcbiAqIC0gSW5qZWN0IGNvbnRleHQgZm9yIHRoZSBzdWJhZ2VudFxuICogLSBMb2cgc3ViYWdlbnQgaW52b2NhdGlvbnNcbiAqIC0gQ29uZmlndXJlIHN1YmFnZW50IGJlaGF2aW9yXG4gKlxuICogKipNYXRjaGVyKio6IE1hdGNoZXMgYWdhaW5zdCBgYWdlbnRfdHlwZWAgKGUuZy4sICdleHBsb3JlJywgJ2NvZGViYXNlLWFuYWx5c2lzJylcbiAqIEBwYXJhbSBjb25maWcgLSBIb29rIGNvbmZpZ3VyYXRpb24gd2l0aCBvcHRpb25hbCBtYXRjaGVyIGFuZCB0aW1lb3V0XG4gKiBAcGFyYW0gaGFuZGxlciAtIFRoZSBoYW5kbGVyIGZ1bmN0aW9uIHRvIGV4ZWN1dGVcbiAqIEByZXR1cm5zIEEgaG9vayBmdW5jdGlvbiB0aGF0IGNhbiBiZSBleHBvcnRlZCBhcyB0aGUgZGVmYXVsdCBleHBvcnRcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBpbXBvcnQgeyBzdWJhZ2VudFN0YXJ0SG9vaywgc3ViYWdlbnRTdGFydE91dHB1dCB9IGZyb20gJ0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcyc7XG4gKlxuICogLy8gQWRkIGNvbnRleHQgZm9yIGV4cGxvcmUgc3ViYWdlbnRzXG4gKiBleHBvcnQgZGVmYXVsdCBzdWJhZ2VudFN0YXJ0SG9vayh7IG1hdGNoZXI6ICdleHBsb3JlJyB9LCBhc3luYyAoaW5wdXQsIHsgbG9nZ2VyIH0pID0+IHtcbiAqICAgbG9nZ2VyLmluZm8oJ0V4cGxvcmUgc3ViYWdlbnQgc3RhcnRpbmcnLCB7XG4gKiAgICAgYWdlbnRJZDogaW5wdXQuYWdlbnRfaWQsXG4gKiAgICAgYWdlbnRUeXBlOiBpbnB1dC5hZ2VudF90eXBlXG4gKiAgIH0pO1xuICpcbiAqICAgcmV0dXJuIHN1YmFnZW50U3RhcnRPdXRwdXQoe1xuICogICAgIGFkZGl0aW9uYWxDb250ZXh0OiAnRm9jdXMgb24gZmluZGluZyBwYXR0ZXJucyBhbmQgY29udmVudGlvbnMnXG4gKiAgIH0pO1xuICogfSk7XG4gKiBgYGBcbiAqIEBzZWUgaHR0cHM6Ly9jb2RlLmNsYXVkZS5jb20vZG9jcy9lbi9ob29rcyNzdWJhZ2VudHN0YXJ0XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzdWJhZ2VudFN0YXJ0SG9vayhjb25maWcsIGhhbmRsZXIpIHtcbiAgICByZXR1cm4gY3JlYXRlSG9va0Z1bmN0aW9uKFwiU3ViYWdlbnRTdGFydFwiLCBjb25maWcsIGhhbmRsZXIpO1xufVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gU3ViYWdlbnRTdG9wIEhvb2sgRmFjdG9yeVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLyoqXG4gKiBDcmVhdGVzIGEgU3ViYWdlbnRTdG9wIGhvb2sgaGFuZGxlci5cbiAqXG4gKiBTdWJhZ2VudFN0b3AgaG9va3MgZmlyZSB3aGVuIGEgc3ViYWdlbnQgY29tcGxldGVzIG9yIHN0b3BzLCBhbGxvd2luZyB5b3UgdG86XG4gKiAtIEJsb2NrIHRoZSBzdWJhZ2VudCBmcm9tIHN0b3BwaW5nXG4gKiAtIFByb2Nlc3Mgc3ViYWdlbnQgcmVzdWx0c1xuICogLSBDbGVhbiB1cCBzdWJhZ2VudCByZXNvdXJjZXNcbiAqIC0gTG9nIHN1YmFnZW50IGNvbXBsZXRpb25cbiAqXG4gKiAqKk1hdGNoZXIqKjogTWF0Y2hlcyBhZ2FpbnN0IGBhZ2VudF90eXBlYCAoZS5nLiwgJ2V4cGxvcmUnLCAnY29kZWJhc2UtYW5hbHlzaXMnKVxuICogQHBhcmFtIGNvbmZpZyAtIEhvb2sgY29uZmlndXJhdGlvbiB3aXRoIG9wdGlvbmFsIG1hdGNoZXIgYW5kIHRpbWVvdXRcbiAqIEBwYXJhbSBoYW5kbGVyIC0gVGhlIGhhbmRsZXIgZnVuY3Rpb24gdG8gZXhlY3V0ZVxuICogQHJldHVybnMgQSBob29rIGZ1bmN0aW9uIHRoYXQgY2FuIGJlIGV4cG9ydGVkIGFzIHRoZSBkZWZhdWx0IGV4cG9ydFxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGltcG9ydCB7IHN1YmFnZW50U3RvcEhvb2ssIHN1YmFnZW50U3RvcE91dHB1dCB9IGZyb20gJ0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcyc7XG4gKlxuICogLy8gQmxvY2sgZXhwbG9yZSBzdWJhZ2VudHMgaWYgdGFzayBpbmNvbXBsZXRlXG4gKiBleHBvcnQgZGVmYXVsdCBzdWJhZ2VudFN0b3BIb29rKHsgbWF0Y2hlcjogJ2V4cGxvcmUnIH0sIGFzeW5jIChpbnB1dCwgeyBsb2dnZXIgfSkgPT4ge1xuICogICBsb2dnZXIuaW5mbygnU3ViYWdlbnQgc3RvcHBpbmcnLCB7XG4gKiAgICAgYWdlbnRJZDogaW5wdXQuYWdlbnRfaWQsXG4gKiAgICAgYWdlbnRUeXBlOiBpbnB1dC5hZ2VudF90eXBlXG4gKiAgIH0pO1xuICpcbiAqICAgLy8gQmxvY2sgaWYgdHJhbnNjcmlwdCBzaG93cyBpbmNvbXBsZXRlIHdvcmtcbiAqICAgcmV0dXJuIHN1YmFnZW50U3RvcE91dHB1dCh7XG4gKiAgICAgZGVjaXNpb246ICdibG9jaycsXG4gKiAgICAgcmVhc29uOiAnUGxlYXNlIHZlcmlmeSBleHBsb3JhdGlvbiBpcyBjb21wbGV0ZSdcbiAqICAgfSk7XG4gKiB9KTtcbiAqIGBgYFxuICogQHNlZSBodHRwczovL2NvZGUuY2xhdWRlLmNvbS9kb2NzL2VuL2hvb2tzI3N1YmFnZW50c3RvcFxuICovXG5leHBvcnQgZnVuY3Rpb24gc3ViYWdlbnRTdG9wSG9vayhjb25maWcsIGhhbmRsZXIpIHtcbiAgICByZXR1cm4gY3JlYXRlSG9va0Z1bmN0aW9uKFwiU3ViYWdlbnRTdG9wXCIsIGNvbmZpZywgaGFuZGxlcik7XG59XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBQcmVDb21wYWN0IEhvb2sgRmFjdG9yeVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLyoqXG4gKiBDcmVhdGVzIGEgUHJlQ29tcGFjdCBob29rIGhhbmRsZXIuXG4gKlxuICogUHJlQ29tcGFjdCBob29rcyBmaXJlIGJlZm9yZSBjb250ZXh0IGNvbXBhY3Rpb24gb2NjdXJzLCBhbGxvd2luZyB5b3UgdG86XG4gKiAtIFByZXNlcnZlIGltcG9ydGFudCBpbmZvcm1hdGlvbiBiZWZvcmUgY29tcGFjdGlvblxuICogLSBMb2cgY29tcGFjdGlvbiBldmVudHNcbiAqIC0gTW9kaWZ5IGN1c3RvbSBpbnN0cnVjdGlvbnMgZm9yIHRoZSBjb21wYWN0ZWQgY29udGV4dFxuICpcbiAqICoqTWF0Y2hlcioqOiBNYXRjaGVzIGFnYWluc3QgYHRyaWdnZXJgICgnbWFudWFsJywgJ2F1dG8nKVxuICogQHBhcmFtIGNvbmZpZyAtIEhvb2sgY29uZmlndXJhdGlvbiB3aXRoIG9wdGlvbmFsIG1hdGNoZXIgYW5kIHRpbWVvdXRcbiAqIEBwYXJhbSBoYW5kbGVyIC0gVGhlIGhhbmRsZXIgZnVuY3Rpb24gdG8gZXhlY3V0ZVxuICogQHJldHVybnMgQSBob29rIGZ1bmN0aW9uIHRoYXQgY2FuIGJlIGV4cG9ydGVkIGFzIHRoZSBkZWZhdWx0IGV4cG9ydFxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGltcG9ydCB7IHByZUNvbXBhY3RIb29rLCBwcmVDb21wYWN0T3V0cHV0IH0gZnJvbSAnQGdvb2Rmb290L2NsYXVkZS1jb2RlLWhvb2tzJztcbiAqXG4gKiAvLyBMb2cgY29tcGFjdGlvbiBldmVudHMgYW5kIHByZXNlcnZlIGNvbnRleHRcbiAqIGV4cG9ydCBkZWZhdWx0IHByZUNvbXBhY3RIb29rKHt9LCBhc3luYyAoaW5wdXQsIHsgbG9nZ2VyIH0pID0+IHtcbiAqICAgbG9nZ2VyLmluZm8oJ0NvbnRleHQgY29tcGFjdGlvbiB0cmlnZ2VyZWQnLCB7XG4gKiAgICAgdHJpZ2dlcjogaW5wdXQudHJpZ2dlcixcbiAqICAgICBoYXNDdXN0b21JbnN0cnVjdGlvbnM6IGlucHV0LmN1c3RvbV9pbnN0cnVjdGlvbnMgIT09IG51bGxcbiAqICAgfSk7XG4gKlxuICogICByZXR1cm4gcHJlQ29tcGFjdE91dHB1dCh7XG4gKiAgICAgc3lzdGVtTWVzc2FnZTogJ1JlbWVtYmVyOiBzdHJpY3QgbW9kZSBpcyBlbmFibGVkJ1xuICogICB9KTtcbiAqIH0pO1xuICogYGBgXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogLy8gT25seSBoYW5kbGUgbWFudWFsIGNvbXBhY3Rpb25cbiAqIGV4cG9ydCBkZWZhdWx0IHByZUNvbXBhY3RIb29rKHsgbWF0Y2hlcjogJ21hbnVhbCcgfSwgYXN5bmMgKGlucHV0LCB7IGxvZ2dlciB9KSA9PiB7XG4gKiAgIGxvZ2dlci5pbmZvKCdNYW51YWwgY29tcGFjdGlvbiByZXF1ZXN0ZWQnKTtcbiAqICAgcmV0dXJuIHByZUNvbXBhY3RPdXRwdXQoe30pO1xuICogfSk7XG4gKiBgYGBcbiAqIEBzZWUgaHR0cHM6Ly9jb2RlLmNsYXVkZS5jb20vZG9jcy9lbi9ob29rcyNwcmVjb21wYWN0XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBwcmVDb21wYWN0SG9vayhjb25maWcsIGhhbmRsZXIpIHtcbiAgICByZXR1cm4gY3JlYXRlSG9va0Z1bmN0aW9uKFwiUHJlQ29tcGFjdFwiLCBjb25maWcsIGhhbmRsZXIpO1xufVxuLyoqIEBpbmhlcml0ZG9jICovXG5leHBvcnQgZnVuY3Rpb24gcGVybWlzc2lvblJlcXVlc3RIb29rKGNvbmZpZywgaGFuZGxlcikge1xuICAgIHJldHVybiBjcmVhdGVIb29rRnVuY3Rpb24oXCJQZXJtaXNzaW9uUmVxdWVzdFwiLCBjb25maWcsIGhhbmRsZXIpO1xufVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gU2V0dXAgSG9vayBGYWN0b3J5XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vKipcbiAqIENyZWF0ZXMgYSBTZXR1cCBob29rIGhhbmRsZXIuXG4gKlxuICogU2V0dXAgaG9va3MgZmlyZSBkdXJpbmcgaW5pdGlhbGl6YXRpb24gb3IgbWFpbnRlbmFuY2UsIGFsbG93aW5nIHlvdSB0bzpcbiAqIC0gQ29uZmlndXJlIGluaXRpYWwgc2Vzc2lvbiBzdGF0ZVxuICogLSBQZXJmb3JtIHNldHVwIHRhc2tzIGJlZm9yZSB0aGUgc2Vzc2lvbiBzdGFydHNcbiAqIC0gQWRkIGNvbnRleHQgZm9yIG1haW50ZW5hbmNlIG9wZXJhdGlvbnNcbiAqXG4gKiAqKk1hdGNoZXIqKjogTWF0Y2hlcyBhZ2FpbnN0IGB0cmlnZ2VyYCAoJ2luaXQnIG9yICdtYWludGVuYW5jZScpXG4gKiBAcGFyYW0gY29uZmlnIC0gSG9vayBjb25maWd1cmF0aW9uIHdpdGggb3B0aW9uYWwgbWF0Y2hlciBhbmQgdGltZW91dFxuICogQHBhcmFtIGhhbmRsZXIgLSBUaGUgaGFuZGxlciBmdW5jdGlvbiB0byBleGVjdXRlXG4gKiBAcmV0dXJucyBBIGhvb2sgZnVuY3Rpb24gdGhhdCBjYW4gYmUgZXhwb3J0ZWQgYXMgdGhlIGRlZmF1bHQgZXhwb3J0XG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogaW1wb3J0IHsgc2V0dXBIb29rLCBzZXR1cE91dHB1dCB9IGZyb20gJ0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcyc7XG4gKlxuICogLy8gSGFuZGxlIGFsbCBzZXR1cCBldmVudHNcbiAqIGV4cG9ydCBkZWZhdWx0IHNldHVwSG9vayh7fSwgYXN5bmMgKGlucHV0LCB7IGxvZ2dlciB9KSA9PiB7XG4gKiAgIGxvZ2dlci5pbmZvKCdTZXR1cCB0cmlnZ2VyZWQnLCB7IHRyaWdnZXI6IGlucHV0LnRyaWdnZXIgfSk7XG4gKiAgIHJldHVybiBzZXR1cE91dHB1dCh7fSk7XG4gKiB9KTtcbiAqXG4gKiAvLyBPbmx5IGhhbmRsZSBpbml0aWFsaXphdGlvblxuICogZXhwb3J0IGRlZmF1bHQgc2V0dXBIb29rKHsgbWF0Y2hlcjogJ2luaXQnIH0sIGFzeW5jIChpbnB1dCwgeyBsb2dnZXIgfSkgPT4ge1xuICogICBsb2dnZXIuaW5mbygnSW5pdGlhbGl6aW5nIHNlc3Npb24nKTtcbiAqICAgcmV0dXJuIHNldHVwT3V0cHV0KHtcbiAqICAgICBob29rU3BlY2lmaWNPdXRwdXQ6IHtcbiAqICAgICAgIGFkZGl0aW9uYWxDb250ZXh0OiAnU2Vzc2lvbiBpbml0aWFsaXplZCB3aXRoIGN1c3RvbSBjb25maWd1cmF0aW9uJ1xuICogICAgIH1cbiAqICAgfSk7XG4gKiB9KTtcbiAqIGBgYFxuICogQHNlZSBodHRwczovL2NvZGUuY2xhdWRlLmNvbS9kb2NzL2VuL2hvb2tzI3NldHVwXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzZXR1cEhvb2soY29uZmlnLCBoYW5kbGVyKSB7XG4gICAgcmV0dXJuIGNyZWF0ZUhvb2tGdW5jdGlvbihcIlNldHVwXCIsIGNvbmZpZywgaGFuZGxlcik7XG59XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBUZWFtbWF0ZUlkbGUgSG9vayBGYWN0b3J5XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vKipcbiAqIENyZWF0ZXMgYSBUZWFtbWF0ZUlkbGUgaG9vayBoYW5kbGVyLlxuICpcbiAqIFRlYW1tYXRlSWRsZSBob29rcyBmaXJlIHdoZW4gYSB0ZWFtbWF0ZSBpbiBhIHRlYW0gaXMgYWJvdXQgdG8gZ28gaWRsZSxcbiAqIGFsbG93aW5nIHlvdSB0bzpcbiAqIC0gQXNzaWduIHdvcmsgdG8gaWRsZSB0ZWFtbWF0ZXNcbiAqIC0gTG9nIHRlYW0gYWN0aXZpdHlcbiAqIC0gQ29vcmRpbmF0ZSBtdWx0aS1hZ2VudCB3b3JrZmxvd3NcbiAqXG4gKiAqKk1hdGNoZXIqKjogTm8gbWF0Y2hlciBzdXBwb3J0IC0gZmlyZXMgb24gYWxsIHRlYW1tYXRlIGlkbGUgZXZlbnRzXG4gKiBAcGFyYW0gY29uZmlnIC0gSG9vayBjb25maWd1cmF0aW9uIHdpdGggb3B0aW9uYWwgdGltZW91dCAobWF0Y2hlciBpcyBpZ25vcmVkKVxuICogQHBhcmFtIGhhbmRsZXIgLSBUaGUgaGFuZGxlciBmdW5jdGlvbiB0byBleGVjdXRlXG4gKiBAcmV0dXJucyBBIGhvb2sgZnVuY3Rpb24gdGhhdCBjYW4gYmUgZXhwb3J0ZWQgYXMgdGhlIGRlZmF1bHQgZXhwb3J0XG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogaW1wb3J0IHsgdGVhbW1hdGVJZGxlSG9vaywgdGVhbW1hdGVJZGxlT3V0cHV0IH0gZnJvbSAnQGdvb2Rmb290L2NsYXVkZS1jb2RlLWhvb2tzJztcbiAqXG4gKiAvLyBMb2cgd2hlbiB0ZWFtbWF0ZXMgZ28gaWRsZVxuICogZXhwb3J0IGRlZmF1bHQgdGVhbW1hdGVJZGxlSG9vayh7fSwgYXN5bmMgKGlucHV0LCB7IGxvZ2dlciB9KSA9PiB7XG4gKiAgIGxvZ2dlci5pbmZvKCdUZWFtbWF0ZSBnb2luZyBpZGxlJywge1xuICogICAgIHRlYW1tYXRlTmFtZTogaW5wdXQudGVhbW1hdGVfbmFtZSxcbiAqICAgICB0ZWFtTmFtZTogaW5wdXQudGVhbV9uYW1lXG4gKiAgIH0pO1xuICpcbiAqICAgcmV0dXJuIHRlYW1tYXRlSWRsZU91dHB1dCh7fSk7XG4gKiB9KTtcbiAqIGBgYFxuICogQHNlZSBodHRwczovL2NvZGUuY2xhdWRlLmNvbS9kb2NzL2VuL2hvb2tzI3RlYW1tYXRlaWRsZVxuICovXG5leHBvcnQgZnVuY3Rpb24gdGVhbW1hdGVJZGxlSG9vayhjb25maWcsIGhhbmRsZXIpIHtcbiAgICByZXR1cm4gY3JlYXRlSG9va0Z1bmN0aW9uKFwiVGVhbW1hdGVJZGxlXCIsIGNvbmZpZywgaGFuZGxlcik7XG59XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBUYXNrQ29tcGxldGVkIEhvb2sgRmFjdG9yeVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLyoqXG4gKiBDcmVhdGVzIGEgVGFza0NvbXBsZXRlZCBob29rIGhhbmRsZXIuXG4gKlxuICogVGFza0NvbXBsZXRlZCBob29rcyBmaXJlIHdoZW4gYSB0YXNrIGlzIGJlaW5nIG1hcmtlZCBhcyBjb21wbGV0ZWQsXG4gKiBhbGxvd2luZyB5b3UgdG86XG4gKiAtIFZlcmlmeSB0YXNrIGNvbXBsZXRpb25cbiAqIC0gTG9nIHRhc2sgbWV0cmljc1xuICogLSBUcmlnZ2VyIGZvbGxvdy11cCBhY3Rpb25zXG4gKlxuICogKipNYXRjaGVyKio6IE5vIG1hdGNoZXIgc3VwcG9ydCAtIGZpcmVzIG9uIGFsbCB0YXNrIGNvbXBsZXRpb24gZXZlbnRzXG4gKiBAcGFyYW0gY29uZmlnIC0gSG9vayBjb25maWd1cmF0aW9uIHdpdGggb3B0aW9uYWwgdGltZW91dCAobWF0Y2hlciBpcyBpZ25vcmVkKVxuICogQHBhcmFtIGhhbmRsZXIgLSBUaGUgaGFuZGxlciBmdW5jdGlvbiB0byBleGVjdXRlXG4gKiBAcmV0dXJucyBBIGhvb2sgZnVuY3Rpb24gdGhhdCBjYW4gYmUgZXhwb3J0ZWQgYXMgdGhlIGRlZmF1bHQgZXhwb3J0XG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogaW1wb3J0IHsgdGFza0NvbXBsZXRlZEhvb2ssIHRhc2tDb21wbGV0ZWRPdXRwdXQgfSBmcm9tICdAZ29vZGZvb3QvY2xhdWRlLWNvZGUtaG9va3MnO1xuICpcbiAqIC8vIExvZyB0YXNrIGNvbXBsZXRpb25cbiAqIGV4cG9ydCBkZWZhdWx0IHRhc2tDb21wbGV0ZWRIb29rKHt9LCBhc3luYyAoaW5wdXQsIHsgbG9nZ2VyIH0pID0+IHtcbiAqICAgbG9nZ2VyLmluZm8oJ1Rhc2sgY29tcGxldGVkJywge1xuICogICAgIHRhc2tJZDogaW5wdXQudGFza19pZCxcbiAqICAgICB0YXNrU3ViamVjdDogaW5wdXQudGFza19zdWJqZWN0XG4gKiAgIH0pO1xuICpcbiAqICAgcmV0dXJuIHRhc2tDb21wbGV0ZWRPdXRwdXQoe30pO1xuICogfSk7XG4gKiBgYGBcbiAqIEBzZWUgaHR0cHM6Ly9jb2RlLmNsYXVkZS5jb20vZG9jcy9lbi9ob29rcyN0YXNrY29tcGxldGVkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB0YXNrQ29tcGxldGVkSG9vayhjb25maWcsIGhhbmRsZXIpIHtcbiAgICByZXR1cm4gY3JlYXRlSG9va0Z1bmN0aW9uKFwiVGFza0NvbXBsZXRlZFwiLCBjb25maWcsIGhhbmRsZXIpO1xufVxuIiwgIi8qKlxuICogTG9nZ2VyIHN5c3RlbSBmb3IgQ2xhdWRlIENvZGUgaG9va3MuXG4gKlxuICogUHJvdmlkZXMgc3RydWN0dXJlZCBsb2dnaW5nIHdpdGggZXZlbnQgc3Vic2NyaXB0aW9uIGFuZCBvcHRpb25hbCBmaWxlIG91dHB1dC5cbiAqIFRoZSBsb2dnZXIgaXMgKipzaWxlbnQgYnkgZGVmYXVsdCoqIHRvIGF2b2lkIGludGVyZmVyaW5nIHdpdGggaG9vayBwcm90b2NvbFxuICogKHN0ZG91dCBpcyByZXNlcnZlZCBmb3IgSlNPTiByZXNwb25zZXMsIHN0ZGVyciBtYXkgY29uZmxpY3Qgd2l0aCBDbGF1ZGUgQ29kZSkuXG4gKiBAbW9kdWxlXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogaW1wb3J0IHsgbG9nZ2VyIH0gZnJvbSAnQGdvb2Rmb290L2NsYXVkZS1jb2RlLWhvb2tzJztcbiAqXG4gKiAvLyBTdWJzY3JpYmUgdG8gbG9nIGV2ZW50c1xuICogY29uc3QgdW5zdWJzY3JpYmUgPSBsb2dnZXIub24oJ2Vycm9yJywgKGV2ZW50KSA9PiB7XG4gKiAgIGNvbnNvbGUuZXJyb3IoYEVycm9yIGluICR7ZXZlbnQuaG9va1R5cGV9OiAke2V2ZW50Lm1lc3NhZ2V9YCk7XG4gKiB9KTtcbiAqXG4gKiAvLyBMYXRlciwgY2xlYW4gdXBcbiAqIHVuc3Vic2NyaWJlKCk7XG4gKiBgYGBcbiAqIEBzZWUgaHR0cHM6Ly9jb2RlLmNsYXVkZS5jb20vZG9jcy9lbi9ob29rc1xuICovXG5pbXBvcnQgeyBjbG9zZVN5bmMsIGV4aXN0c1N5bmMsIG1rZGlyU3luYywgb3BlblN5bmMsIHdyaXRlU3luYyB9IGZyb20gXCJub2RlOmZzXCI7XG5pbXBvcnQgeyBkaXJuYW1lIH0gZnJvbSBcIm5vZGU6cGF0aFwiO1xuLyoqXG4gKiBBbGwgbG9nIGxldmVscyBpbiBvcmRlciBvZiBzZXZlcml0eSAobG93ZXN0IHRvIGhpZ2hlc3QpLlxuICovXG5leHBvcnQgY29uc3QgTE9HX0xFVkVMUyA9IFtcImRlYnVnXCIsIFwiaW5mb1wiLCBcIndhcm5cIiwgXCJlcnJvclwiXTtcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIExvZ2dlciBDbGFzc1xuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLyoqXG4gKiBMb2dnZXIgZm9yIENsYXVkZSBDb2RlIGhvb2tzIHdpdGggZXZlbnQgc3Vic2NyaXB0aW9uIGFuZCBmaWxlIG91dHB1dC5cbiAqXG4gKiAjIyBLZXkgQmVoYXZpb3JzXG4gKlxuICogfCBDb25maWd1cmF0aW9uIHwgQmVoYXZpb3IgfFxuICogfC0tLS0tLS0tLS0tLS0tfC0tLS0tLS0tLS18XG4gKiB8IE5vIGNvbmZpZyAoZGVmYXVsdCkgfCAqKlNpbGVudCoqIC0gbm8gb3V0cHV0IGFueXdoZXJlIHxcbiAqIHwgYENMQVVERV9DT0RFX0hPT0tTX0xPR19GSUxFYCBlbnYgdmFyIHwgQXBwZW5kIEpTT04gbGluZXMgdG8gZmlsZSB8XG4gKiB8IGAub24obGV2ZWwsIGhhbmRsZXIpYCByZWdpc3RlcmVkIHwgRXZlbnRzIGRlbGl2ZXJlZCB0byBoYW5kbGVycyBvbmx5IHxcbiAqIHwgTXVsdGlwbGUgZGVzdGluYXRpb25zIHwgQWxsIGRlc3RpbmF0aW9ucyByZWNlaXZlIGV2ZW50cyB8XG4gKlxuICogIyMgSW1wb3J0YW50IE5vdGVzXG4gKlxuICogLSAqKk5ldmVyIG91dHB1dHMgdG8gc3Rkb3V0KiogKHJlc2VydmVkIGZvciBKU09OIGhvb2sgcmVzcG9uc2UpXG4gKiAtICoqTmV2ZXIgb3V0cHV0cyB0byBzdGRlcnIqKiAobWF5IGludGVyZmVyZSB3aXRoIENsYXVkZSBDb2RlIGVycm9yIGhhbmRsaW5nKVxuICogLSBGaWxlIG91dHB1dCB1c2VzIEpTT04gTGluZXMgZm9ybWF0IGZvciBlYXN5IHBhcnNpbmdcbiAqIC0gYC5vbihsZXZlbCwgaGFuZGxlcilgIHJldHVybnMgYW4gdW5zdWJzY3JpYmUgZnVuY3Rpb25cbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBpbXBvcnQgeyBsb2dnZXIgfSBmcm9tICdAZ29vZGZvb3QvY2xhdWRlLWNvZGUtaG9va3MnO1xuICpcbiAqIC8vIFN1YnNjcmliZSB0byBldmVudHMgYXQgc3BlY2lmaWMgbGV2ZWxcbiAqIGxvZ2dlci5vbignd2FybicsIChldmVudCkgPT4ge1xuICogICBzZW5kQWxlcnQoZXZlbnQubWVzc2FnZSk7XG4gKiB9KTtcbiAqXG4gKiAvLyBMb2cgd2l0aGluIGEgaG9vayBoYW5kbGVyXG4gKiBleHBvcnQgZGVmYXVsdCBwcmVUb29sVXNlSG9vayh7IG1hdGNoZXI6ICdCYXNoJyB9LCBhc3luYyAoaW5wdXQsIHsgbG9nZ2VyIH0pID0+IHtcbiAqICAgbG9nZ2VyLndhcm4oJ0Fib3V0IHRvIHZhbGlkYXRlIEJhc2ggY29tbWFuZCcpO1xuICogICByZXR1cm4gcHJlVG9vbFVzZU91dHB1dCh7IGFsbG93OiB0cnVlIH0pO1xuICogfSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNsYXNzIExvZ2dlciB7XG4gICAgLyoqXG4gICAgICogUmVnaXN0ZXJlZCBldmVudCBoYW5kbGVycyBieSBsb2cgbGV2ZWwuXG4gICAgICovXG4gICAgaGFuZGxlcnMgPSBuZXcgTWFwKCk7XG4gICAgLyoqXG4gICAgICogRmlsZSBkZXNjcmlwdG9yIGZvciBsb2cgZmlsZSBvdXRwdXQuXG4gICAgICogTGF6aWx5IGluaXRpYWxpemVkIG9uIGZpcnN0IHdyaXRlLlxuICAgICAqL1xuICAgIGxvZ0ZpbGVGZCA9IG51bGw7XG4gICAgLyoqXG4gICAgICogUGF0aCB0byB0aGUgbG9nIGZpbGUsIGlmIGNvbmZpZ3VyZWQuXG4gICAgICovXG4gICAgbG9nRmlsZVBhdGggPSBudWxsO1xuICAgIC8qKlxuICAgICAqIFdoZXRoZXIgZmlsZSBpbml0aWFsaXphdGlvbiBoYXMgYmVlbiBhdHRlbXB0ZWQuXG4gICAgICovXG4gICAgZmlsZUluaXRpYWxpemVkID0gZmFsc2U7XG4gICAgLyoqXG4gICAgICogQ3VycmVudCBob29rIGNvbnRleHQgZm9yIGVucmljaGluZyBsb2cgZXZlbnRzLlxuICAgICAqL1xuICAgIGN1cnJlbnRIb29rVHlwZTtcbiAgICAvKipcbiAgICAgKiBDdXJyZW50IGhvb2sgaW5wdXQgZm9yIGVucmljaGluZyBsb2cgZXZlbnRzLlxuICAgICAqL1xuICAgIGN1cnJlbnRJbnB1dDtcbiAgICAvKipcbiAgICAgKiBDcmVhdGVzIGEgbmV3IExvZ2dlciBpbnN0YW5jZS5cbiAgICAgKlxuICAgICAqIFR5cGljYWxseSB5b3Ugc2hvdWxkIHVzZSB0aGUgZXhwb3J0ZWQgYGxvZ2dlcmAgc2luZ2xldG9uIHJhdGhlciB0aGFuXG4gICAgICogY3JlYXRpbmcgbmV3IGluc3RhbmNlcy5cbiAgICAgKiBAcGFyYW0gY29uZmlnIC0gT3B0aW9uYWwgY29uZmlndXJhdGlvblxuICAgICAqIEBleGFtcGxlXG4gICAgICogYGBgdHlwZXNjcmlwdFxuICAgICAqIC8vIFVzZSBzaW5nbGV0b24gKHJlY29tbWVuZGVkKVxuICAgICAqIGltcG9ydCB7IGxvZ2dlciB9IGZyb20gJ0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcyc7XG4gICAgICpcbiAgICAgKiAvLyBPciBjcmVhdGUgY3VzdG9tIGluc3RhbmNlXG4gICAgICogY29uc3QgY3VzdG9tTG9nZ2VyID0gbmV3IExvZ2dlcih7IGxvZ0ZpbGVQYXRoOiAnL3Zhci9sb2cvaG9va3MubG9nJyB9KTtcbiAgICAgKiBgYGBcbiAgICAgKi9cbiAgICBjb25zdHJ1Y3Rvcihjb25maWcgPSB7fSkge1xuICAgICAgICAvLyBJbml0aWFsaXplIGhhbmRsZXJzIG1hcCBmb3IgZWFjaCBsZXZlbFxuICAgICAgICBmb3IgKGNvbnN0IGxldmVsIG9mIExPR19MRVZFTFMpIHtcbiAgICAgICAgICAgIHRoaXMuaGFuZGxlcnMuc2V0KGxldmVsLCBuZXcgU2V0KCkpO1xuICAgICAgICB9XG4gICAgICAgIC8vIFNldCBsb2cgZmlsZSBwYXRoIGZyb20gY29uZmlnIG9yIGVudmlyb25tZW50XG4gICAgICAgIHRoaXMubG9nRmlsZVBhdGggPSBjb25maWcubG9nRmlsZVBhdGggPz8gcHJvY2Vzcy5lbnYuQ0xBVURFX0NPREVfSE9PS1NfTE9HX0ZJTEUgPz8gbnVsbDtcbiAgICB9XG4gICAgLyoqXG4gICAgICogTG9ncyBhIGRlYnVnIG1lc3NhZ2UuXG4gICAgICpcbiAgICAgKiBVc2UgZm9yIGRldGFpbGVkIGRlYnVnZ2luZyBpbmZvcm1hdGlvbiB0aGF0IGlzIHR5cGljYWxseSBvbmx5IHVzZWZ1bFxuICAgICAqIGR1cmluZyBkZXZlbG9wbWVudCBvciB0cm91Ymxlc2hvb3RpbmcuXG4gICAgICogQHBhcmFtIG1lc3NhZ2UgLSBUaGUgZGVidWcgbWVzc2FnZVxuICAgICAqIEBwYXJhbSBjb250ZXh0IC0gT3B0aW9uYWwgYWRkaXRpb25hbCBjb250ZXh0XG4gICAgICogQGV4YW1wbGVcbiAgICAgKiBgYGB0eXBlc2NyaXB0XG4gICAgICogbG9nZ2VyLmRlYnVnKCdQcm9jZXNzaW5nIHRvb2wgaW5wdXQnLCB7IHRvb2xOYW1lOiAnQmFzaCcsIGlucHV0U2l6ZTogMjU2IH0pO1xuICAgICAqIGBgYFxuICAgICAqL1xuICAgIGRlYnVnKG1lc3NhZ2UsIGNvbnRleHQpIHtcbiAgICAgICAgdGhpcy5lbWl0KFwiZGVidWdcIiwgbWVzc2FnZSwgY29udGV4dCk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIExvZ3MgYW4gaW5mbyBtZXNzYWdlLlxuICAgICAqXG4gICAgICogVXNlIGZvciBnZW5lcmFsIG9wZXJhdGlvbmFsIGV2ZW50cyBsaWtlIGhvb2sgaW52b2NhdGlvbnMsIHN1Y2Nlc3NmdWxcbiAgICAgKiBjb21wbGV0aW9ucywgb3Igc3RhdGUgY2hhbmdlcy5cbiAgICAgKiBAcGFyYW0gbWVzc2FnZSAtIFRoZSBpbmZvIG1lc3NhZ2VcbiAgICAgKiBAcGFyYW0gY29udGV4dCAtIE9wdGlvbmFsIGFkZGl0aW9uYWwgY29udGV4dFxuICAgICAqIEBleGFtcGxlXG4gICAgICogYGBgdHlwZXNjcmlwdFxuICAgICAqIGxvZ2dlci5pbmZvKCdTZXNzaW9uIHN0YXJ0ZWQnLCB7IHNvdXJjZTogJ3N0YXJ0dXAnLCBzZXNzaW9uSWQ6ICdhYmMxMjMnIH0pO1xuICAgICAqIGBgYFxuICAgICAqL1xuICAgIGluZm8obWVzc2FnZSwgY29udGV4dCkge1xuICAgICAgICB0aGlzLmVtaXQoXCJpbmZvXCIsIG1lc3NhZ2UsIGNvbnRleHQpO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBMb2dzIGEgd2FybmluZyBtZXNzYWdlLlxuICAgICAqXG4gICAgICogVXNlIGZvciBjb25kaXRpb25zIHRoYXQgbWF5IGluZGljYXRlIGlzc3VlcyBidXQgZG9uJ3QgcHJldmVudFxuICAgICAqIG9wZXJhdGlvbiwgc3VjaCBhcyBkZXByZWNhdGVkIHBhdHRlcm5zIG9yIHBlcmZvcm1hbmNlIGNvbmNlcm5zLlxuICAgICAqIEBwYXJhbSBtZXNzYWdlIC0gVGhlIHdhcm5pbmcgbWVzc2FnZVxuICAgICAqIEBwYXJhbSBjb250ZXh0IC0gT3B0aW9uYWwgYWRkaXRpb25hbCBjb250ZXh0XG4gICAgICogQGV4YW1wbGVcbiAgICAgKiBgYGB0eXBlc2NyaXB0XG4gICAgICogbG9nZ2VyLndhcm4oJ0RlcHJlY2F0ZWQgaG9vayBwYXR0ZXJuIGRldGVjdGVkJywgeyBwYXR0ZXJuOiAnbGVnYWN5TWF0Y2hlcicgfSk7XG4gICAgICogYGBgXG4gICAgICovXG4gICAgd2FybihtZXNzYWdlLCBjb250ZXh0KSB7XG4gICAgICAgIHRoaXMuZW1pdChcIndhcm5cIiwgbWVzc2FnZSwgY29udGV4dCk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIExvZ3MgYW4gZXJyb3IgbWVzc2FnZS5cbiAgICAgKlxuICAgICAqIFVzZSBmb3IgZXJyb3IgY29uZGl0aW9ucyB0aGF0IHJlcXVpcmUgYXR0ZW50aW9uIGJ1dCB3ZXJlIGhhbmRsZWRcbiAgICAgKiBncmFjZWZ1bGx5LiBGb3IgZXhjZXB0aW9ucywgcHJlZmVyIHtAbGluayBsb2dFcnJvcn0uXG4gICAgICogQHBhcmFtIG1lc3NhZ2UgLSBUaGUgZXJyb3IgbWVzc2FnZVxuICAgICAqIEBwYXJhbSBjb250ZXh0IC0gT3B0aW9uYWwgYWRkaXRpb25hbCBjb250ZXh0XG4gICAgICogQGV4YW1wbGVcbiAgICAgKiBgYGB0eXBlc2NyaXB0XG4gICAgICogbG9nZ2VyLmVycm9yKCdGYWlsZWQgdG8gdmFsaWRhdGUgdG9vbCBpbnB1dCcsIHsgdG9vbE5hbWU6ICdCYXNoJywgcmVhc29uOiAnZW1wdHkgY29tbWFuZCcgfSk7XG4gICAgICogYGBgXG4gICAgICovXG4gICAgZXJyb3IobWVzc2FnZSwgY29udGV4dCkge1xuICAgICAgICB0aGlzLmVtaXQoXCJlcnJvclwiLCBtZXNzYWdlLCBjb250ZXh0KTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogTG9ncyBhIHN0cnVjdHVyZWQgZXJyb3Igd2l0aCBmdWxsIGVycm9yIGRldGFpbHMuXG4gICAgICpcbiAgICAgKiBVc2UgdGhpcyBtZXRob2Qgd2hlbiBsb2dnaW5nIGNhdWdodCBleGNlcHRpb25zIHRvIGNhcHR1cmUgdGhlIGZ1bGxcbiAgICAgKiBlcnJvciBjb250ZXh0IGluY2x1ZGluZyBuYW1lLCBtZXNzYWdlLCBzdGFjayB0cmFjZSwgYW5kIGNhdXNlIGNoYWluLlxuICAgICAqIEBwYXJhbSBlcnJvciAtIFRoZSBlcnJvciB0byBsb2dcbiAgICAgKiBAcGFyYW0gbWVzc2FnZSAtIEh1bWFuLXJlYWRhYmxlIGRlc2NyaXB0aW9uIG9mIHdoYXQgZmFpbGVkXG4gICAgICogQHBhcmFtIGNvbnRleHQgLSBPcHRpb25hbCBhZGRpdGlvbmFsIGNvbnRleHRcbiAgICAgKiBAZXhhbXBsZVxuICAgICAqIGBgYHR5cGVzY3JpcHRcbiAgICAgKiB0cnkge1xuICAgICAqICAgYXdhaXQgZGFuZ2Vyb3VzT3BlcmF0aW9uKCk7XG4gICAgICogfSBjYXRjaCAoZXJyKSB7XG4gICAgICogICBsb2dnZXIubG9nRXJyb3IoZXJyLCAnRmFpbGVkIHRvIGV4ZWN1dGUgZGFuZ2Vyb3VzIG9wZXJhdGlvbicsIHtcbiAgICAgKiAgICAgb3BlcmF0aW9uOiAnZGVsZXRlJyxcbiAgICAgKiAgICAgdGFyZ2V0OiAnL2ltcG9ydGFudC9maWxlLnR4dCdcbiAgICAgKiAgIH0pO1xuICAgICAqIH1cbiAgICAgKiBgYGBcbiAgICAgKi9cbiAgICBsb2dFcnJvcihlcnJvciwgbWVzc2FnZSwgY29udGV4dCkge1xuICAgICAgICBjb25zdCBlcnJvckluZm8gPSB0aGlzLmV4dHJhY3RFcnJvckluZm8oZXJyb3IpO1xuICAgICAgICBjb25zdCBldmVudCA9IHtcbiAgICAgICAgICAgIHRpbWVzdGFtcDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxuICAgICAgICAgICAgbGV2ZWw6IFwiZXJyb3JcIixcbiAgICAgICAgICAgIGhvb2tUeXBlOiB0aGlzLmN1cnJlbnRIb29rVHlwZSxcbiAgICAgICAgICAgIG1lc3NhZ2UsXG4gICAgICAgICAgICBpbnB1dDogdGhpcy5jdXJyZW50SW5wdXQsXG4gICAgICAgICAgICBlcnJvcjogZXJyb3JJbmZvLFxuICAgICAgICAgICAgY29udGV4dCxcbiAgICAgICAgfTtcbiAgICAgICAgdGhpcy5kZWxpdmVyRXZlbnQoZXZlbnQpO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBTdWJzY3JpYmVzIGEgaGFuZGxlciB0byBsb2cgZXZlbnRzIGF0IHRoZSBzcGVjaWZpZWQgbGV2ZWwuXG4gICAgICpcbiAgICAgKiBUaGUgaGFuZGxlciB3aWxsIGJlIGNhbGxlZCBmb3IgZXZlcnkgbG9nIGV2ZW50IGF0IHRoZSBzcGVjaWZpZWQgbGV2ZWwuXG4gICAgICogUmV0dXJucyBhbiB1bnN1YnNjcmliZSBmdW5jdGlvbiB0aGF0IHNob3VsZCBiZSBjYWxsZWQgd2hlbiB0aGUgaGFuZGxlclxuICAgICAqIGlzIG5vIGxvbmdlciBuZWVkZWQuXG4gICAgICogQHBhcmFtIGxldmVsIC0gVGhlIGxvZyBsZXZlbCB0byBzdWJzY3JpYmUgdG9cbiAgICAgKiBAcGFyYW0gaGFuZGxlciAtIFRoZSBoYW5kbGVyIGZ1bmN0aW9uIHRvIGNhbGwgZm9yIGVhY2ggZXZlbnRcbiAgICAgKiBAcmV0dXJucyBBIGZ1bmN0aW9uIHRvIHVuc3Vic2NyaWJlIHRoZSBoYW5kbGVyXG4gICAgICogQGV4YW1wbGVcbiAgICAgKiBgYGB0eXBlc2NyaXB0XG4gICAgICogLy8gU3Vic2NyaWJlIHRvIGVycm9yIGV2ZW50c1xuICAgICAqIGNvbnN0IHVuc3Vic2NyaWJlID0gbG9nZ2VyLm9uKCdlcnJvcicsIChldmVudCkgPT4ge1xuICAgICAqICAgY29uc29sZS5lcnJvcihgWyR7ZXZlbnQuaG9va1R5cGV9XSAke2V2ZW50Lm1lc3NhZ2V9YCk7XG4gICAgICogICBpZiAoZXZlbnQuZXJyb3IpIHtcbiAgICAgKiAgICAgY29uc29sZS5lcnJvcihldmVudC5lcnJvci5zdGFjayk7XG4gICAgICogICB9XG4gICAgICogfSk7XG4gICAgICpcbiAgICAgKiAvLyBMYXRlciwgY2xlYW4gdXBcbiAgICAgKiB1bnN1YnNjcmliZSgpO1xuICAgICAqIGBgYFxuICAgICAqIEBleGFtcGxlXG4gICAgICogYGBgdHlwZXNjcmlwdFxuICAgICAqIC8vIEZvcndhcmQgdG8gZXh0ZXJuYWwgbG9nZ2luZyBsaWJyYXJ5XG4gICAgICogaW1wb3J0IHBpbm8gZnJvbSAncGlubyc7XG4gICAgICogY29uc3QgcGlub0xvZ2dlciA9IHBpbm8oKTtcbiAgICAgKlxuICAgICAqIGxvZ2dlci5vbignaW5mbycsIChldmVudCkgPT4gcGlub0xvZ2dlci5pbmZvKGV2ZW50LCBldmVudC5tZXNzYWdlKSk7XG4gICAgICogbG9nZ2VyLm9uKCd3YXJuJywgKGV2ZW50KSA9PiBwaW5vTG9nZ2VyLndhcm4oZXZlbnQsIGV2ZW50Lm1lc3NhZ2UpKTtcbiAgICAgKiBsb2dnZXIub24oJ2Vycm9yJywgKGV2ZW50KSA9PiBwaW5vTG9nZ2VyLmVycm9yKGV2ZW50LCBldmVudC5tZXNzYWdlKSk7XG4gICAgICogYGBgXG4gICAgICovXG4gICAgb24obGV2ZWwsIGhhbmRsZXIpIHtcbiAgICAgICAgY29uc3QgbGV2ZWxIYW5kbGVycyA9IHRoaXMuaGFuZGxlcnMuZ2V0KGxldmVsKTtcbiAgICAgICAgaWYgKGxldmVsSGFuZGxlcnMpIHtcbiAgICAgICAgICAgIGxldmVsSGFuZGxlcnMuYWRkKGhhbmRsZXIpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiAoKSA9PiB7XG4gICAgICAgICAgICBsZXZlbEhhbmRsZXJzPy5kZWxldGUoaGFuZGxlcik7XG4gICAgICAgIH07XG4gICAgfVxuICAgIC8qKlxuICAgICAqIFNldHMgdGhlIGN1cnJlbnQgaG9vayBjb250ZXh0IGZvciBlbnJpY2hpbmcgbG9nIGV2ZW50cy5cbiAgICAgKlxuICAgICAqIFRoaXMgaXMgY2FsbGVkIGludGVybmFsbHkgYnkgdGhlIHJ1bnRpbWUgYmVmb3JlIGludm9raW5nIGhvb2sgaGFuZGxlcnMuXG4gICAgICogWW91IHR5cGljYWxseSBkb24ndCBuZWVkIHRvIGNhbGwgdGhpcyBkaXJlY3RseS5cbiAgICAgKiBAcGFyYW0gaG9va1R5cGUgLSBUaGUgdHlwZSBvZiBob29rIGJlaW5nIGV4ZWN1dGVkXG4gICAgICogQHBhcmFtIGlucHV0IC0gVGhlIGhvb2sgaW5wdXQgZGF0YVxuICAgICAqIEBpbnRlcm5hbFxuICAgICAqL1xuICAgIHNldENvbnRleHQoaG9va1R5cGUsIGlucHV0KSB7XG4gICAgICAgIHRoaXMuY3VycmVudEhvb2tUeXBlID0gaG9va1R5cGU7XG4gICAgICAgIHRoaXMuY3VycmVudElucHV0ID0gaW5wdXQ7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIENsZWFycyB0aGUgY3VycmVudCBob29rIGNvbnRleHQuXG4gICAgICpcbiAgICAgKiBDYWxsZWQgaW50ZXJuYWxseSBieSB0aGUgcnVudGltZSBhZnRlciBob29rIGV4ZWN1dGlvbiBjb21wbGV0ZXMuXG4gICAgICogQGludGVybmFsXG4gICAgICovXG4gICAgY2xlYXJDb250ZXh0KCkge1xuICAgICAgICB0aGlzLmN1cnJlbnRIb29rVHlwZSA9IHVuZGVmaW5lZDtcbiAgICAgICAgdGhpcy5jdXJyZW50SW5wdXQgPSB1bmRlZmluZWQ7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIENvbmZpZ3VyZXMgdGhlIGxvZyBmaWxlIHBhdGggYXQgcnVudGltZS5cbiAgICAgKlxuICAgICAqIENhbGwgdGhpcyB0byBlbmFibGUgb3IgY2hhbmdlIGZpbGUgbG9nZ2luZy4gU2V0dGluZyB0byBgbnVsbGAgZGlzYWJsZXNcbiAgICAgKiBmaWxlIGxvZ2dpbmcgKGJ1dCBkb2Vzbid0IGNsb3NlIGV4aXN0aW5nIGZpbGUgaGFuZGxlIGltbWVkaWF0ZWx5KS5cbiAgICAgKiBAcGFyYW0gZmlsZVBhdGggLSBQYXRoIHRvIHRoZSBsb2cgZmlsZSwgb3IgbnVsbCB0byBkaXNhYmxlXG4gICAgICogQGV4YW1wbGVcbiAgICAgKiBgYGB0eXBlc2NyaXB0XG4gICAgICogLy8gRW5hYmxlIGZpbGUgbG9nZ2luZyBhdCBydW50aW1lXG4gICAgICogbG9nZ2VyLnNldExvZ0ZpbGUoJy92YXIvbG9nL2NsYXVkZS1ob29rcy5sb2cnKTtcbiAgICAgKlxuICAgICAqIC8vIERpc2FibGUgZmlsZSBsb2dnaW5nXG4gICAgICogbG9nZ2VyLnNldExvZ0ZpbGUobnVsbCk7XG4gICAgICogYGBgXG4gICAgICovXG4gICAgc2V0TG9nRmlsZShmaWxlUGF0aCkge1xuICAgICAgICAvLyBDbG9zZSBleGlzdGluZyBmaWxlIGlmIG9wZW5cbiAgICAgICAgaWYgKHRoaXMubG9nRmlsZUZkICE9PSBudWxsKSB7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIGNsb3NlU3luYyh0aGlzLmxvZ0ZpbGVGZCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXRjaCB7XG4gICAgICAgICAgICAgICAgLy8gSWdub3JlIGVycm9ycyBvbiBjbG9zZVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5sb2dGaWxlRmQgPSBudWxsO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMubG9nRmlsZVBhdGggPSBmaWxlUGF0aDtcbiAgICAgICAgdGhpcy5maWxlSW5pdGlhbGl6ZWQgPSBmYWxzZTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogQ2xvc2VzIGFsbCByZXNvdXJjZXMgaGVsZCBieSB0aGUgbG9nZ2VyLlxuICAgICAqXG4gICAgICogQ2FsbCB0aGlzIGR1cmluZyBncmFjZWZ1bCBzaHV0ZG93biB0byBlbnN1cmUgYWxsIGxvZyBkYXRhIGlzIGZsdXNoZWQuXG4gICAgICogQGV4YW1wbGVcbiAgICAgKiBgYGB0eXBlc2NyaXB0XG4gICAgICogcHJvY2Vzcy5vbignZXhpdCcsICgpID0+IHtcbiAgICAgKiAgIGxvZ2dlci5jbG9zZSgpO1xuICAgICAqIH0pO1xuICAgICAqIGBgYFxuICAgICAqL1xuICAgIGNsb3NlKCkge1xuICAgICAgICBpZiAodGhpcy5sb2dGaWxlRmQgIT09IG51bGwpIHtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgY2xvc2VTeW5jKHRoaXMubG9nRmlsZUZkKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhdGNoIHtcbiAgICAgICAgICAgICAgICAvLyBJZ25vcmUgZXJyb3JzIG9uIGNsb3NlXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLmxvZ0ZpbGVGZCA9IG51bGw7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5maWxlSW5pdGlhbGl6ZWQgPSBmYWxzZTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogQ2hlY2tzIGlmIHRoZXJlIGFyZSBhbnkgYWN0aXZlIGhhbmRsZXJzIG9yIGRlc3RpbmF0aW9ucy5cbiAgICAgKlxuICAgICAqIFJldHVybnMgdHJ1ZSBpZiBhbnkgaGFuZGxlcnMgYXJlIHJlZ2lzdGVyZWQgb3IgZmlsZSBsb2dnaW5nIGlzIGVuYWJsZWQuXG4gICAgICogQHJldHVybnMgV2hldGhlciB0aGUgbG9nZ2VyIGhhcyBhbnkgYWN0aXZlIG91dHB1dCBkZXN0aW5hdGlvbnNcbiAgICAgKi9cbiAgICBoYXNEZXN0aW5hdGlvbnMoKSB7XG4gICAgICAgIGZvciAoY29uc3QgaGFuZGxlcnMgb2YgdGhpcy5oYW5kbGVycy52YWx1ZXMoKSkge1xuICAgICAgICAgICAgaWYgKGhhbmRsZXJzLnNpemUgPiAwKVxuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzLmxvZ0ZpbGVQYXRoICE9PSBudWxsO1xuICAgIH1cbiAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICAgLy8gUHJpdmF0ZSBNZXRob2RzXG4gICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgIC8qKlxuICAgICAqIEVtaXRzIGEgbG9nIGV2ZW50LlxuICAgICAqIEBwYXJhbSBsZXZlbCAtIFRoZSBzZXZlcml0eSBsZXZlbCBvZiB0aGUgZXZlbnRcbiAgICAgKiBAcGFyYW0gbWVzc2FnZSAtIFRoZSBsb2cgbWVzc2FnZVxuICAgICAqIEBwYXJhbSBjb250ZXh0IC0gT3B0aW9uYWwgYWRkaXRpb25hbCBjb250ZXh0IGRhdGFcbiAgICAgKi9cbiAgICBlbWl0KGxldmVsLCBtZXNzYWdlLCBjb250ZXh0KSB7XG4gICAgICAgIGNvbnN0IGV2ZW50ID0ge1xuICAgICAgICAgICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXG4gICAgICAgICAgICBsZXZlbCxcbiAgICAgICAgICAgIGhvb2tUeXBlOiB0aGlzLmN1cnJlbnRIb29rVHlwZSxcbiAgICAgICAgICAgIG1lc3NhZ2UsXG4gICAgICAgICAgICBpbnB1dDogdGhpcy5jdXJyZW50SW5wdXQsXG4gICAgICAgICAgICBjb250ZXh0LFxuICAgICAgICB9O1xuICAgICAgICB0aGlzLmRlbGl2ZXJFdmVudChldmVudCk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIERlbGl2ZXJzIGFuIGV2ZW50IHRvIGFsbCByZWdpc3RlcmVkIGRlc3RpbmF0aW9ucy5cbiAgICAgKiBAcGFyYW0gZXZlbnQgLSBUaGUgbG9nIGV2ZW50IHRvIGRlbGl2ZXJcbiAgICAgKi9cbiAgICBkZWxpdmVyRXZlbnQoZXZlbnQpIHtcbiAgICAgICAgLy8gRGVsaXZlciB0byBldmVudCBoYW5kbGVyc1xuICAgICAgICBjb25zdCBsZXZlbEhhbmRsZXJzID0gdGhpcy5oYW5kbGVycy5nZXQoZXZlbnQubGV2ZWwpO1xuICAgICAgICBpZiAobGV2ZWxIYW5kbGVycykge1xuICAgICAgICAgICAgZm9yIChjb25zdCBoYW5kbGVyIG9mIGxldmVsSGFuZGxlcnMpIHtcbiAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICBoYW5kbGVyKGV2ZW50KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY2F0Y2gge1xuICAgICAgICAgICAgICAgICAgICAvLyBTaWxlbnRseSBpZ25vcmUgaGFuZGxlciBlcnJvcnMgdG8gbm90IGRpc3J1cHQgaG9vayBleGVjdXRpb25cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgLy8gV3JpdGUgdG8gZmlsZSBpZiBjb25maWd1cmVkXG4gICAgICAgIHRoaXMud3JpdGVUb0ZpbGUoZXZlbnQpO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBXcml0ZXMgYW4gZXZlbnQgdG8gdGhlIGxvZyBmaWxlLlxuICAgICAqIEBwYXJhbSBldmVudCAtIFRoZSBsb2cgZXZlbnQgdG8gd3JpdGVcbiAgICAgKi9cbiAgICB3cml0ZVRvRmlsZShldmVudCkge1xuICAgICAgICBpZiAoIXRoaXMubG9nRmlsZVBhdGgpXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIC8vIExhenkgaW5pdGlhbGl6YXRpb24gb2YgZmlsZSBoYW5kbGVcbiAgICAgICAgaWYgKCF0aGlzLmZpbGVJbml0aWFsaXplZCkge1xuICAgICAgICAgICAgdGhpcy5pbml0aWFsaXplRmlsZSgpO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0aGlzLmxvZ0ZpbGVGZCA9PT0gbnVsbClcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IGxpbmUgPSBgJHtKU09OLnN0cmluZ2lmeShldmVudCl9XFxuYDtcbiAgICAgICAgICAgIHdyaXRlU3luYyh0aGlzLmxvZ0ZpbGVGZCwgbGluZSk7XG4gICAgICAgIH1cbiAgICAgICAgY2F0Y2gge1xuICAgICAgICAgICAgLy8gU2lsZW50bHkgaWdub3JlIGZpbGUgd3JpdGUgZXJyb3JzIHRvIG5vdCBkaXNydXB0IGhvb2sgZXhlY3V0aW9uXG4gICAgICAgICAgICAvLyBUaGlzIGZvbGxvd3MgdGhlIHJpc2sgbWl0aWdhdGlvbjogXCJHcmFjZWZ1bCBkZWdyYWRhdGlvbiAtIGxvZyB3cml0ZVxuICAgICAgICAgICAgLy8gZmFpbHVyZXMgYXJlIHNpbGVudGx5IGlnbm9yZWQgdG8gbm90IGRpc3J1cHQgaG9vayBleGVjdXRpb25cIlxuICAgICAgICB9XG4gICAgfVxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemVzIHRoZSBsb2cgZmlsZSBmb3Igd3JpdGluZy5cbiAgICAgKi9cbiAgICBpbml0aWFsaXplRmlsZSgpIHtcbiAgICAgICAgdGhpcy5maWxlSW5pdGlhbGl6ZWQgPSB0cnVlO1xuICAgICAgICBpZiAoIXRoaXMubG9nRmlsZVBhdGgpXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICAvLyBFbnN1cmUgZGlyZWN0b3J5IGV4aXN0c1xuICAgICAgICAgICAgY29uc3QgZGlyID0gZGlybmFtZSh0aGlzLmxvZ0ZpbGVQYXRoKTtcbiAgICAgICAgICAgIGlmICghZXhpc3RzU3luYyhkaXIpKSB7XG4gICAgICAgICAgICAgICAgbWtkaXJTeW5jKGRpciwgeyByZWN1cnNpdmU6IHRydWUgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBPcGVuIGZpbGUgZm9yIGFwcGVuZGluZ1xuICAgICAgICAgICAgdGhpcy5sb2dGaWxlRmQgPSBvcGVuU3luYyh0aGlzLmxvZ0ZpbGVQYXRoLCBcImFcIik7XG4gICAgICAgIH1cbiAgICAgICAgY2F0Y2gge1xuICAgICAgICAgICAgLy8gU2lsZW50bHkgaWdub3JlIGZpbGUgaW5pdGlhbGl6YXRpb24gZXJyb3JzXG4gICAgICAgICAgICB0aGlzLmxvZ0ZpbGVGZCA9IG51bGw7XG4gICAgICAgIH1cbiAgICB9XG4gICAgLyoqXG4gICAgICogRXh0cmFjdHMgc3RydWN0dXJlZCBlcnJvciBpbmZvcm1hdGlvbiBmcm9tIGFuIHVua25vd24gZXJyb3IuXG4gICAgICogQHBhcmFtIGVycm9yIC0gVGhlIGVycm9yIHRvIGV4dHJhY3QgaW5mb3JtYXRpb24gZnJvbVxuICAgICAqIEByZXR1cm5zIFN0cnVjdHVyZWQgZXJyb3IgaW5mb3JtYXRpb25cbiAgICAgKi9cbiAgICBleHRyYWN0RXJyb3JJbmZvKGVycm9yKSB7XG4gICAgICAgIGlmIChlcnJvciBpbnN0YW5jZW9mIEVycm9yKSB7XG4gICAgICAgICAgICBjb25zdCBpbmZvID0ge1xuICAgICAgICAgICAgICAgIG5hbWU6IGVycm9yLm5hbWUsXG4gICAgICAgICAgICAgICAgbWVzc2FnZTogZXJyb3IubWVzc2FnZSxcbiAgICAgICAgICAgICAgICBzdGFjazogZXJyb3Iuc3RhY2ssXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgLy8gRXh0cmFjdCBjYXVzZSBjaGFpbiBpZiBwcmVzZW50XG4gICAgICAgICAgICBpZiAoZXJyb3IuY2F1c2UgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgIGluZm8uY2F1c2UgPSB0aGlzLmV4dHJhY3RFcnJvckluZm8oZXJyb3IuY2F1c2UpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIGluZm87XG4gICAgICAgIH1cbiAgICAgICAgLy8gSGFuZGxlIG5vbi1FcnJvciB2YWx1ZXNcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIG5hbWU6IFwiVW5rbm93bkVycm9yXCIsXG4gICAgICAgICAgICBtZXNzYWdlOiBTdHJpbmcoZXJyb3IpLFxuICAgICAgICB9O1xuICAgIH1cbn1cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIFNpbmdsZXRvbiBFeHBvcnRcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8qKlxuICogR2xvYmFsIGxvZ2dlciBpbnN0YW5jZSBmb3IgQ2xhdWRlIENvZGUgaG9va3MuXG4gKlxuICogVXNlIHRoaXMgc2luZ2xldG9uIGZvciBhbGwgbG9nZ2luZyB3aXRoaW4gaG9va3MuIFRoZSBsb2dnZXIgaXMgY29uZmlndXJlZFxuICogdmlhIGVudmlyb25tZW50IHZhcmlhYmxlcyBhbmQgc3VwcG9ydHMgZXZlbnQgc3Vic2NyaXB0aW9uIGZvciBjdXN0b21cbiAqIGRlc3RpbmF0aW9ucy5cbiAqXG4gKiAjIyBDb25maWd1cmF0aW9uXG4gKlxuICogfCBFbnZpcm9ubWVudCBWYXJpYWJsZSB8IERlc2NyaXB0aW9uIHxcbiAqIHwtLS0tLS0tLS0tLS0tLS0tLS0tLS18LS0tLS0tLS0tLS0tLXxcbiAqIHwgYENMQVVERV9DT0RFX0hPT0tTX0xPR19GSUxFYCB8IFBhdGggdG8gbG9nIGZpbGUgKEpTT04gTGluZXMgZm9ybWF0KSB8XG4gKlxuICogIyMgVXNhZ2UgaW4gSG9va3NcbiAqXG4gKiBUaGUgbG9nZ2VyIGlzIHBhc3NlZCB0byBob29rIGhhbmRsZXJzIHZpYSBjb250ZXh0IGZvciBjb252ZW5pZW5jZTpcbiAqXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBleHBvcnQgZGVmYXVsdCBwcmVUb29sVXNlSG9vayh7IG1hdGNoZXI6ICdCYXNoJyB9LCBhc3luYyAoaW5wdXQsIHsgbG9nZ2VyIH0pID0+IHtcbiAqICAgbG9nZ2VyLndhcm4oJ1ZhbGlkYXRpbmcgQmFzaCBjb21tYW5kJyk7XG4gKiAgIHJldHVybiBwcmVUb29sVXNlT3V0cHV0KHsgYWxsb3c6IHRydWUgfSk7XG4gKiB9KTtcbiAqIGBgYFxuICpcbiAqICMjIEV4dGVybmFsIEludGVncmF0aW9uXG4gKlxuICogU3Vic2NyaWJlIHRvIGV2ZW50cyB0byBmb3J3YXJkIGxvZ3MgdG8gZXh0ZXJuYWwgc3lzdGVtczpcbiAqXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBpbXBvcnQgeyBsb2dnZXIgfSBmcm9tICdAZ29vZGZvb3QvY2xhdWRlLWNvZGUtaG9va3MnO1xuICogaW1wb3J0IHBpbm8gZnJvbSAncGlubyc7XG4gKlxuICogY29uc3QgcGlub0xvZ2dlciA9IHBpbm8oeyBsZXZlbDogJ2RlYnVnJyB9KTtcbiAqXG4gKiBsb2dnZXIub24oJ2RlYnVnJywgKGV2ZW50KSA9PiBwaW5vTG9nZ2VyLmRlYnVnKGV2ZW50LCBldmVudC5tZXNzYWdlKSk7XG4gKiBsb2dnZXIub24oJ2luZm8nLCAoZXZlbnQpID0+IHBpbm9Mb2dnZXIuaW5mbyhldmVudCwgZXZlbnQubWVzc2FnZSkpO1xuICogbG9nZ2VyLm9uKCd3YXJuJywgKGV2ZW50KSA9PiBwaW5vTG9nZ2VyLndhcm4oZXZlbnQsIGV2ZW50Lm1lc3NhZ2UpKTtcbiAqIGxvZ2dlci5vbignZXJyb3InLCAoZXZlbnQpID0+IHBpbm9Mb2dnZXIuZXJyb3IoZXZlbnQsIGV2ZW50Lm1lc3NhZ2UpKTtcbiAqIGBgYFxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIC8vIERpcmVjdCB1c2FnZVxuICogaW1wb3J0IHsgbG9nZ2VyIH0gZnJvbSAnQGdvb2Rmb290L2NsYXVkZS1jb2RlLWhvb2tzJztcbiAqXG4gKiBsb2dnZXIuaW5mbygnU3RhcnRpbmcgb3BlcmF0aW9uJyk7XG4gKiBsb2dnZXIud2FybignUmVzb3VyY2UgbGltaXQgYXBwcm9hY2hpbmcnLCB7IHVzYWdlOiAwLjkgfSk7XG4gKlxuICogdHJ5IHtcbiAqICAgYXdhaXQgcmlza3lPcGVyYXRpb24oKTtcbiAqIH0gY2F0Y2ggKGVycikge1xuICogICBsb2dnZXIubG9nRXJyb3IoZXJyLCAnUmlza3kgb3BlcmF0aW9uIGZhaWxlZCcpO1xuICogfVxuICogYGBgXG4gKi9cbmV4cG9ydCBjb25zdCBsb2dnZXIgPSBuZXcgTG9nZ2VyKCk7XG4iLCAiLyoqXG4gKiBPdXRwdXQgdHlwZXMgYW5kIGJ1aWxkZXJzIGZvciBDbGF1ZGUgQ29kZSBob29rcy5cbiAqXG4gKiBQcm92aWRlcyB0eXBlLXNhZmUgb3V0cHV0IGJ1aWxkZXIgZnVuY3Rpb25zIGZvciBhbGwgMTIgaG9vayB0eXBlcy4gRWFjaCBidWlsZGVyXG4gKiBhY2NlcHRzIG9wdGlvbnMgdGhhdCBtYXRjaCB0aGUgd2lyZSBmb3JtYXQgZXhwZWN0ZWQgYnkgQ2xhdWRlIENvZGUsIHdpdGggdHlwZXNcbiAqIGRlcml2ZWQgZnJvbSB0aGUgQ2xhdWRlIEFnZW50IFNESydzIGBTeW5jSG9va0pTT05PdXRwdXRgIHR5cGUuXG4gKiBAc2VlIGh0dHBzOi8vY29kZS5jbGF1ZGUuY29tL2RvY3MvZW4vaG9va3NcbiAqIEBtb2R1bGVcbiAqL1xuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gRXhpdCBDb2RlIENvbnN0YW50c1xuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLyoqXG4gKiBFeGl0IGNvZGVzIHVzZWQgYnkgQ2xhdWRlIENvZGUgaG9va3MuXG4gKlxuICogfCBFeGl0IENvZGUgfCBOYW1lIHwgV2hlbiBVc2VkIHwgQ2xhdWRlIENvZGUgQmVoYXZpb3IgfFxuICogfC0tLS0tLS0tLS0tfC0tLS0tLXwtLS0tLS0tLS0tLXwtLS0tLS0tLS0tLS0tLS0tLS0tLS18XG4gKiB8IDAgfCBTdWNjZXNzIHwgSGFuZGxlciByZXR1cm5zIG5vcm1hbGx5IHwgQ29udGludWUsIHBhcnNlIHN0ZG91dCBhcyBKU09OIHxcbiAqIHwgMSB8IEVycm9yIHwgSW52YWxpZCBpbnB1dCwgbm9uLWJsb2NraW5nIGVycm9yIHwgTm9uLWJsb2NraW5nLCBzdGRlcnIgdG8gdXNlciBvbmx5IHxcbiAqIHwgMiB8IEJsb2NrIHwgSGFuZGxlciB0aHJvd3MgT1IgYHN0b3BSZWFzb25gIHNldCB8IEJsb2NraW5nLCBzdGRlcnIgc2hvd24gdG8gQ2xhdWRlIHxcbiAqL1xuZXhwb3J0IGNvbnN0IEVYSVRfQ09ERVMgPSB7XG4gICAgLyoqIEhhbmRsZXIgY29tcGxldGVkIHN1Y2Nlc3NmdWxseS4gQ2xhdWRlIENvZGUgcGFyc2VzIHN0ZG91dCBhcyBKU09OLiAqL1xuICAgIFNVQ0NFU1M6IDAsXG4gICAgLyoqIE5vbi1ibG9ja2luZyBlcnJvciBvY2N1cnJlZCAoZS5nLiwgaW52YWxpZCBpbnB1dCkuIHN0ZGVyciBzaG93biB0byB1c2VyIG9ubHkuICovXG4gICAgRVJST1I6IDEsXG4gICAgLyoqIEhhbmRsZXIgdGhyZXcgZXhjZXB0aW9uIE9SIGJsb2NraW5nIGFjdGlvbiByZXF1ZXN0ZWQuIHN0ZGVyciBzaG93biB0byBDbGF1ZGUuICovXG4gICAgQkxPQ0s6IDIsXG59O1xuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gT3V0cHV0IEJ1aWxkZXIgRmFjdG9yaWVzXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vKipcbiAqIEZhY3RvcnkgZm9yIGhvb2tzIHRoYXQgaGF2ZSBob29rU3BlY2lmaWNPdXRwdXQgd2l0aCBhIGhvb2tFdmVudE5hbWUgZGlzY3JpbWluYXRvci5cbiAqIEBwYXJhbSBob29rVHlwZSAtIFRoZSBob29rIHR5cGUgbmFtZSB1c2VkIGFzIHRoZSBfdHlwZSBkaXNjcmltaW5hdG9yXG4gKiBAcmV0dXJucyBBIGJ1aWxkZXIgZnVuY3Rpb24gdGhhdCBjcmVhdGVzIHRoZSBvdXRwdXQgb2JqZWN0XG4gKiBAaW50ZXJuYWxcbiAqL1xuZnVuY3Rpb24gY3JlYXRlSG9va1NwZWNpZmljT3V0cHV0QnVpbGRlcihob29rVHlwZSkge1xuICAgIHJldHVybiAob3B0aW9ucyA9IHt9KSA9PiB7XG4gICAgICAgIGNvbnN0IHsgaG9va1NwZWNpZmljT3V0cHV0LCAuLi5yZXN0IH0gPSBvcHRpb25zO1xuICAgICAgICBjb25zdCBzdGRvdXQgPSBob29rU3BlY2lmaWNPdXRwdXQgIT09IHVuZGVmaW5lZFxuICAgICAgICAgICAgPyB7IC4uLnJlc3QsIGhvb2tTcGVjaWZpY091dHB1dDogeyBob29rRXZlbnROYW1lOiBob29rVHlwZSwgLi4uaG9va1NwZWNpZmljT3V0cHV0IH0gfVxuICAgICAgICAgICAgOiByZXN0O1xuICAgICAgICByZXR1cm4geyBfdHlwZTogaG9va1R5cGUsIHN0ZG91dCB9O1xuICAgIH07XG59XG4vKipcbiAqIEZhY3RvcnkgZm9yIGhvb2tzIHRoYXQgb25seSB1c2UgQ29tbW9uT3B0aW9ucyAoc2ltcGxlIHBhc3N0aHJvdWdoKS5cbiAqIEBwYXJhbSBob29rVHlwZSAtIFRoZSBob29rIHR5cGUgbmFtZSB1c2VkIGFzIHRoZSBfdHlwZSBkaXNjcmltaW5hdG9yXG4gKiBAcmV0dXJucyBBIGJ1aWxkZXIgZnVuY3Rpb24gdGhhdCBjcmVhdGVzIHRoZSBvdXRwdXQgb2JqZWN0XG4gKiBAaW50ZXJuYWxcbiAqL1xuZnVuY3Rpb24gY3JlYXRlU2ltcGxlT3V0cHV0QnVpbGRlcihob29rVHlwZSkge1xuICAgIHJldHVybiAob3B0aW9ucyA9IHt9KSA9PiAoe1xuICAgICAgICBfdHlwZTogaG9va1R5cGUsXG4gICAgICAgIHN0ZG91dDogb3B0aW9ucyxcbiAgICB9KTtcbn1cbi8qKlxuICogRmFjdG9yeSBmb3IgaG9va3MgdGhhdCB1c2UgZGVjaXNpb24tYmFzZWQgb3B0aW9ucyAoU3RvcCwgU3ViYWdlbnRTdG9wKS5cbiAqIEBwYXJhbSBob29rVHlwZSAtIFRoZSBob29rIHR5cGUgbmFtZSB1c2VkIGFzIHRoZSBfdHlwZSBkaXNjcmltaW5hdG9yXG4gKiBAcmV0dXJucyBBIGJ1aWxkZXIgZnVuY3Rpb24gdGhhdCBjcmVhdGVzIHRoZSBvdXRwdXQgb2JqZWN0XG4gKiBAaW50ZXJuYWxcbiAqL1xuZnVuY3Rpb24gY3JlYXRlRGVjaXNpb25PdXRwdXRCdWlsZGVyKGhvb2tUeXBlKSB7XG4gICAgcmV0dXJuIChvcHRpb25zID0ge30pID0+ICh7XG4gICAgICAgIF90eXBlOiBob29rVHlwZSxcbiAgICAgICAgc3Rkb3V0OiBvcHRpb25zLFxuICAgIH0pO1xufVxuLyoqXG4gKiBGYWN0b3J5IGZvciBleGl0LWNvZGUtYmFzZWQgaG9va3MgKFRlYW1tYXRlSWRsZSwgVGFza0NvbXBsZXRlZCkuXG4gKlxuICogVGhlc2UgaG9va3MgZG9uJ3QgdXNlIEpTT04gZGVjaXNpb24gY29udHJvbCAobm8gQ29tbW9uT3B0aW9ucykuXG4gKiBUaGUgb25seSBvcHRpb24gaXMgYHN0ZGVycmAgXHUyMDE0IHdoZW4gcHJlc2VudCwgaXQgdHJpZ2dlcnMgZXhpdCBjb2RlIDIgKEJMT0NLKS5cbiAqIFN0ZG91dCBhbHdheXMgcmVjZWl2ZXMgYHt9YCAoZW1wdHkgSlNPTiBvYmplY3QpLlxuICogQHBhcmFtIGhvb2tUeXBlIC0gVGhlIGhvb2sgdHlwZSBuYW1lIHVzZWQgYXMgdGhlIF90eXBlIGRpc2NyaW1pbmF0b3JcbiAqIEByZXR1cm5zIEEgYnVpbGRlciBmdW5jdGlvbiB0aGF0IGNyZWF0ZXMgdGhlIG91dHB1dCBvYmplY3RcbiAqIEBpbnRlcm5hbFxuICovXG5mdW5jdGlvbiBjcmVhdGVFeGl0Q29kZU91dHB1dEJ1aWxkZXIoaG9va1R5cGUpIHtcbiAgICByZXR1cm4gKHsgc3RkZXJyIH0gPSB7fSkgPT4gKHtcbiAgICAgICAgX3R5cGU6IGhvb2tUeXBlLFxuICAgICAgICBzdGRvdXQ6IHt9LFxuICAgICAgICAuLi4oc3RkZXJyICE9PSB1bmRlZmluZWQgPyB7IHN0ZGVyciB9IDoge30pLFxuICAgIH0pO1xufVxuLyoqXG4gKiBDcmVhdGVzIGFuIG91dHB1dCBmb3IgUHJlVG9vbFVzZSBob29rcy5cbiAqIEBwYXJhbSBvcHRpb25zIC0gQ29uZmlndXJhdGlvbiBvcHRpb25zIGZvciB0aGUgaG9vayBvdXRwdXRcbiAqIEByZXR1cm5zIEEgUHJlVG9vbFVzZU91dHB1dCBvYmplY3QgcmVhZHkgZm9yIHRoZSBydW50aW1lXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogLy8gQWxsb3cgdG9vbCBleGVjdXRpb25cbiAqIHByZVRvb2xVc2VPdXRwdXQoe1xuICogICBob29rU3BlY2lmaWNPdXRwdXQ6IHsgcGVybWlzc2lvbkRlY2lzaW9uOiAnYWxsb3cnIH1cbiAqIH0pO1xuICpcbiAqIC8vIERlbnkgd2l0aCByZWFzb25cbiAqIHByZVRvb2xVc2VPdXRwdXQoe1xuICogICBob29rU3BlY2lmaWNPdXRwdXQ6IHtcbiAqICAgICBwZXJtaXNzaW9uRGVjaXNpb246ICdkZW55JyxcbiAqICAgICBwZXJtaXNzaW9uRGVjaXNpb25SZWFzb246ICdEYW5nZXJvdXMgY29tbWFuZCBkZXRlY3RlZCdcbiAqICAgfVxuICogfSk7XG4gKlxuICogLy8gQWxsb3cgd2l0aCBtb2RpZmllZCBpbnB1dFxuICogcHJlVG9vbFVzZU91dHB1dCh7XG4gKiAgIGhvb2tTcGVjaWZpY091dHB1dDoge1xuICogICAgIHBlcm1pc3Npb25EZWNpc2lvbjogJ2FsbG93JyxcbiAqICAgICB1cGRhdGVkSW5wdXQ6IHsgY29tbWFuZDogJ2xzIC1sYScgfVxuICogICB9XG4gKiB9KTtcbiAqIGBgYFxuICovXG5leHBvcnQgY29uc3QgcHJlVG9vbFVzZU91dHB1dCA9IC8qIEBfX1BVUkVfXyAqLyBjcmVhdGVIb29rU3BlY2lmaWNPdXRwdXRCdWlsZGVyKFwiUHJlVG9vbFVzZVwiKTtcbi8qKlxuICogQ3JlYXRlcyBhbiBvdXRwdXQgZm9yIFBvc3RUb29sVXNlIGhvb2tzLlxuICogQHBhcmFtIG9wdGlvbnMgLSBDb25maWd1cmF0aW9uIG9wdGlvbnMgZm9yIHRoZSBob29rIG91dHB1dFxuICogQHJldHVybnMgQSBQb3N0VG9vbFVzZU91dHB1dCBvYmplY3QgcmVhZHkgZm9yIHRoZSBydW50aW1lXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogLy8gQWRkIGNvbnRleHQgYWZ0ZXIgYSBmaWxlIHJlYWRcbiAqIHBvc3RUb29sVXNlT3V0cHV0KHtcbiAqICAgaG9va1NwZWNpZmljT3V0cHV0OiB7XG4gKiAgICAgYWRkaXRpb25hbENvbnRleHQ6ICdGaWxlIGNvbnRhaW5zIHNlbnNpdGl2ZSBkYXRhJ1xuICogICB9XG4gKiB9KTtcbiAqIGBgYFxuICovXG5leHBvcnQgY29uc3QgcG9zdFRvb2xVc2VPdXRwdXQgPSAvKiBAX19QVVJFX18gKi8gY3JlYXRlSG9va1NwZWNpZmljT3V0cHV0QnVpbGRlcihcIlBvc3RUb29sVXNlXCIpO1xuLyoqXG4gKiBDcmVhdGVzIGFuIG91dHB1dCBmb3IgUG9zdFRvb2xVc2VGYWlsdXJlIGhvb2tzLlxuICogQHBhcmFtIG9wdGlvbnMgLSBDb25maWd1cmF0aW9uIG9wdGlvbnMgZm9yIHRoZSBob29rIG91dHB1dFxuICogQHJldHVybnMgQSBQb3N0VG9vbFVzZUZhaWx1cmVPdXRwdXQgb2JqZWN0IHJlYWR5IGZvciB0aGUgcnVudGltZVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIHBvc3RUb29sVXNlRmFpbHVyZU91dHB1dCh7XG4gKiAgIGhvb2tTcGVjaWZpY091dHB1dDoge1xuICogICAgIGFkZGl0aW9uYWxDb250ZXh0OiAnVHJ5IHVzaW5nIGEgZGlmZmVyZW50IGFwcHJvYWNoJ1xuICogICB9XG4gKiB9KTtcbiAqIGBgYFxuICovXG5leHBvcnQgY29uc3QgcG9zdFRvb2xVc2VGYWlsdXJlT3V0cHV0ID0gLyogQF9fUFVSRV9fICovIGNyZWF0ZUhvb2tTcGVjaWZpY091dHB1dEJ1aWxkZXIoXCJQb3N0VG9vbFVzZUZhaWx1cmVcIik7XG4vKipcbiAqIENyZWF0ZXMgYW4gb3V0cHV0IGZvciBVc2VyUHJvbXB0U3VibWl0IGhvb2tzLlxuICogQHBhcmFtIG9wdGlvbnMgLSBDb25maWd1cmF0aW9uIG9wdGlvbnMgZm9yIHRoZSBob29rIG91dHB1dFxuICogQHJldHVybnMgQSBVc2VyUHJvbXB0U3VibWl0T3V0cHV0IG9iamVjdCByZWFkeSBmb3IgdGhlIHJ1bnRpbWVcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiB1c2VyUHJvbXB0U3VibWl0T3V0cHV0KHtcbiAqICAgaG9va1NwZWNpZmljT3V0cHV0OiB7XG4gKiAgICAgYWRkaXRpb25hbENvbnRleHQ6ICdUaGlzIHByb2plY3QgdXNlcyBUeXBlU2NyaXB0IHN0cmljdCBtb2RlJ1xuICogICB9XG4gKiB9KTtcbiAqIGBgYFxuICovXG5leHBvcnQgY29uc3QgdXNlclByb21wdFN1Ym1pdE91dHB1dCA9IC8qIEBfX1BVUkVfXyAqLyBjcmVhdGVIb29rU3BlY2lmaWNPdXRwdXRCdWlsZGVyKFwiVXNlclByb21wdFN1Ym1pdFwiKTtcbi8qKlxuICogQ3JlYXRlcyBhbiBvdXRwdXQgZm9yIFNlc3Npb25TdGFydCBob29rcy5cbiAqIEBwYXJhbSBvcHRpb25zIC0gQ29uZmlndXJhdGlvbiBvcHRpb25zIGZvciB0aGUgaG9vayBvdXRwdXRcbiAqIEByZXR1cm5zIEEgU2Vzc2lvblN0YXJ0T3V0cHV0IG9iamVjdCByZWFkeSBmb3IgdGhlIHJ1bnRpbWVcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBzZXNzaW9uU3RhcnRPdXRwdXQoe1xuICogICBob29rU3BlY2lmaWNPdXRwdXQ6IHtcbiAqICAgICBhZGRpdGlvbmFsQ29udGV4dDogSlNPTi5zdHJpbmdpZnkoeyBwcm9qZWN0OiAnbXktcHJvamVjdCcgfSlcbiAqICAgfVxuICogfSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNvbnN0IHNlc3Npb25TdGFydE91dHB1dCA9IC8qIEBfX1BVUkVfXyAqLyBjcmVhdGVIb29rU3BlY2lmaWNPdXRwdXRCdWlsZGVyKFwiU2Vzc2lvblN0YXJ0XCIpO1xuLyoqXG4gKiBDcmVhdGVzIGFuIG91dHB1dCBmb3IgU2Vzc2lvbkVuZCBob29rcy5cbiAqIEBwYXJhbSBvcHRpb25zIC0gQ29uZmlndXJhdGlvbiBvcHRpb25zIGZvciB0aGUgaG9vayBvdXRwdXRcbiAqIEByZXR1cm5zIEEgU2Vzc2lvbkVuZE91dHB1dCBvYmplY3QgcmVhZHkgZm9yIHRoZSBydW50aW1lXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogc2Vzc2lvbkVuZE91dHB1dCh7fSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNvbnN0IHNlc3Npb25FbmRPdXRwdXQgPSAvKiBAX19QVVJFX18gKi8gY3JlYXRlU2ltcGxlT3V0cHV0QnVpbGRlcihcIlNlc3Npb25FbmRcIik7XG4vKipcbiAqIENyZWF0ZXMgYW4gb3V0cHV0IGZvciBTdG9wIGhvb2tzLlxuICogQHBhcmFtIG9wdGlvbnMgLSBDb25maWd1cmF0aW9uIG9wdGlvbnMgZm9yIHRoZSBob29rIG91dHB1dFxuICogQHJldHVybnMgQSBTdG9wT3V0cHV0IG9iamVjdCByZWFkeSBmb3IgdGhlIHJ1bnRpbWVcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiAvLyBBbGxvdyB0aGUgc3RvcFxuICogc3RvcE91dHB1dCh7IGRlY2lzaW9uOiAnYXBwcm92ZScgfSk7XG4gKlxuICogLy8gQmxvY2sgd2l0aCByZWFzb25cbiAqIHN0b3BPdXRwdXQoe1xuICogICBkZWNpc2lvbjogJ2Jsb2NrJyxcbiAqICAgcmVhc29uOiAnVGhlcmUgYXJlIHVuY29tbWl0dGVkIGNoYW5nZXMnXG4gKiB9KTtcbiAqIGBgYFxuICovXG5leHBvcnQgY29uc3Qgc3RvcE91dHB1dCA9IC8qIEBfX1BVUkVfXyAqLyBjcmVhdGVEZWNpc2lvbk91dHB1dEJ1aWxkZXIoXCJTdG9wXCIpO1xuLyoqXG4gKiBDcmVhdGVzIGFuIG91dHB1dCBmb3IgU3ViYWdlbnRTdGFydCBob29rcy5cbiAqIEBwYXJhbSBvcHRpb25zIC0gQ29uZmlndXJhdGlvbiBvcHRpb25zIGZvciB0aGUgaG9vayBvdXRwdXRcbiAqIEByZXR1cm5zIEEgU3ViYWdlbnRTdGFydE91dHB1dCBvYmplY3QgcmVhZHkgZm9yIHRoZSBydW50aW1lXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogc3ViYWdlbnRTdGFydE91dHB1dCh7XG4gKiAgIGhvb2tTcGVjaWZpY091dHB1dDoge1xuICogICAgIGFkZGl0aW9uYWxDb250ZXh0OiAnRm9jdXMgb24gZmluZGluZyBwYXR0ZXJucydcbiAqICAgfVxuICogfSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNvbnN0IHN1YmFnZW50U3RhcnRPdXRwdXQgPSAvKiBAX19QVVJFX18gKi8gY3JlYXRlSG9va1NwZWNpZmljT3V0cHV0QnVpbGRlcihcIlN1YmFnZW50U3RhcnRcIik7XG4vKipcbiAqIENyZWF0ZXMgYW4gb3V0cHV0IGZvciBTdWJhZ2VudFN0b3AgaG9va3MuXG4gKiBAcGFyYW0gb3B0aW9ucyAtIENvbmZpZ3VyYXRpb24gb3B0aW9ucyBmb3IgdGhlIGhvb2sgb3V0cHV0XG4gKiBAcmV0dXJucyBBIFN1YmFnZW50U3RvcE91dHB1dCBvYmplY3QgcmVhZHkgZm9yIHRoZSBydW50aW1lXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogLy8gQmxvY2sgd2l0aCByZWFzb25cbiAqIHN1YmFnZW50U3RvcE91dHB1dCh7XG4gKiAgIGRlY2lzaW9uOiAnYmxvY2snLFxuICogICByZWFzb246ICdUYXNrIG5vdCBjb21wbGV0ZSdcbiAqIH0pO1xuICogYGBgXG4gKi9cbmV4cG9ydCBjb25zdCBzdWJhZ2VudFN0b3BPdXRwdXQgPSAvKiBAX19QVVJFX18gKi8gY3JlYXRlRGVjaXNpb25PdXRwdXRCdWlsZGVyKFwiU3ViYWdlbnRTdG9wXCIpO1xuLyoqXG4gKiBDcmVhdGVzIGFuIG91dHB1dCBmb3IgTm90aWZpY2F0aW9uIGhvb2tzLlxuICogQHBhcmFtIG9wdGlvbnMgLSBDb25maWd1cmF0aW9uIG9wdGlvbnMgZm9yIHRoZSBob29rIG91dHB1dFxuICogQHJldHVybnMgQSBOb3RpZmljYXRpb25PdXRwdXQgb2JqZWN0IHJlYWR5IGZvciB0aGUgcnVudGltZVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIC8vIEFkZCBjb250ZXh0IGFib3V0IHRoZSBub3RpZmljYXRpb25cbiAqIG5vdGlmaWNhdGlvbk91dHB1dCh7XG4gKiAgIGhvb2tTcGVjaWZpY091dHB1dDoge1xuICogICAgIGFkZGl0aW9uYWxDb250ZXh0OiAnTm90aWZpY2F0aW9uIGZvcndhcmRlZCB0byBTbGFjayAjYWxlcnRzIGNoYW5uZWwnXG4gKiAgIH1cbiAqIH0pO1xuICpcbiAqIC8vIFN1cHByZXNzIHRoZSBub3RpZmljYXRpb25cbiAqIG5vdGlmaWNhdGlvbk91dHB1dCh7IHN1cHByZXNzT3V0cHV0OiB0cnVlIH0pO1xuICogYGBgXG4gKi9cbmV4cG9ydCBjb25zdCBub3RpZmljYXRpb25PdXRwdXQgPSAvKiBAX19QVVJFX18gKi8gY3JlYXRlSG9va1NwZWNpZmljT3V0cHV0QnVpbGRlcihcIk5vdGlmaWNhdGlvblwiKTtcbi8qKlxuICogQ3JlYXRlcyBhbiBvdXRwdXQgZm9yIFByZUNvbXBhY3QgaG9va3MuXG4gKiBAcGFyYW0gb3B0aW9ucyAtIENvbmZpZ3VyYXRpb24gb3B0aW9ucyBmb3IgdGhlIGhvb2sgb3V0cHV0XG4gKiBAcmV0dXJucyBBIFByZUNvbXBhY3RPdXRwdXQgb2JqZWN0IHJlYWR5IGZvciB0aGUgcnVudGltZVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIHByZUNvbXBhY3RPdXRwdXQoe1xuICogICBzeXN0ZW1NZXNzYWdlOiAnUmVtZW1iZXI6IHN0cmljdCBtb2RlIGlzIGVuYWJsZWQnXG4gKiB9KTtcbiAqIGBgYFxuICovXG5leHBvcnQgY29uc3QgcHJlQ29tcGFjdE91dHB1dCA9IC8qIEBfX1BVUkVfXyAqLyBjcmVhdGVTaW1wbGVPdXRwdXRCdWlsZGVyKFwiUHJlQ29tcGFjdFwiKTtcbi8qKlxuICogQ3JlYXRlcyBhbiBvdXRwdXQgZm9yIFBlcm1pc3Npb25SZXF1ZXN0IGhvb2tzLlxuICogQHBhcmFtIG9wdGlvbnMgLSBDb25maWd1cmF0aW9uIG9wdGlvbnMgZm9yIHRoZSBob29rIG91dHB1dFxuICogQHJldHVybnMgQSBQZXJtaXNzaW9uUmVxdWVzdE91dHB1dCBvYmplY3QgcmVhZHkgZm9yIHRoZSBydW50aW1lXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogLy8gQXV0by1hcHByb3ZlXG4gKiBwZXJtaXNzaW9uUmVxdWVzdE91dHB1dCh7XG4gKiAgIGhvb2tTcGVjaWZpY091dHB1dDoge1xuICogICAgIGRlY2lzaW9uOiB7IGJlaGF2aW9yOiAnYWxsb3cnIH1cbiAqICAgfVxuICogfSk7XG4gKlxuICogLy8gQXV0by1hcHByb3ZlIHdpdGggbW9kaWZpZWQgaW5wdXRcbiAqIHBlcm1pc3Npb25SZXF1ZXN0T3V0cHV0KHtcbiAqICAgaG9va1NwZWNpZmljT3V0cHV0OiB7XG4gKiAgICAgZGVjaXNpb246IHtcbiAqICAgICAgIGJlaGF2aW9yOiAnYWxsb3cnLFxuICogICAgICAgdXBkYXRlZElucHV0OiB7IGZpbGVfcGF0aDogJy9zYWZlL3BhdGgnIH1cbiAqICAgICB9XG4gKiAgIH1cbiAqIH0pO1xuICpcbiAqIC8vIEF1dG8tZGVueVxuICogcGVybWlzc2lvblJlcXVlc3RPdXRwdXQoe1xuICogICBob29rU3BlY2lmaWNPdXRwdXQ6IHtcbiAqICAgICBkZWNpc2lvbjoge1xuICogICAgICAgYmVoYXZpb3I6ICdkZW55JyxcbiAqICAgICAgIG1lc3NhZ2U6ICdOb3QgYWxsb3dlZCcsXG4gKiAgICAgICBpbnRlcnJ1cHQ6IHRydWVcbiAqICAgICB9XG4gKiAgIH1cbiAqIH0pO1xuICpcbiAqIC8vIEZhbGwgdGhyb3VnaCB0byBub3JtYWwgcHJvbXB0XG4gKiBwZXJtaXNzaW9uUmVxdWVzdE91dHB1dCh7fSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNvbnN0IHBlcm1pc3Npb25SZXF1ZXN0T3V0cHV0ID0gLyogQF9fUFVSRV9fICovIGNyZWF0ZUhvb2tTcGVjaWZpY091dHB1dEJ1aWxkZXIoXCJQZXJtaXNzaW9uUmVxdWVzdFwiKTtcbi8qKlxuICogQ3JlYXRlcyBhbiBvdXRwdXQgZm9yIFNldHVwIGhvb2tzLlxuICogQHBhcmFtIG9wdGlvbnMgLSBDb25maWd1cmF0aW9uIG9wdGlvbnMgZm9yIHRoZSBob29rIG91dHB1dFxuICogQHJldHVybnMgQSBTZXR1cE91dHB1dCBvYmplY3QgcmVhZHkgZm9yIHRoZSBydW50aW1lXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogLy8gQWRkIGNvbnRleHQgZHVyaW5nIHNldHVwXG4gKiBzZXR1cE91dHB1dCh7XG4gKiAgIGhvb2tTcGVjaWZpY091dHB1dDoge1xuICogICAgIGFkZGl0aW9uYWxDb250ZXh0OiAnUHJvamVjdCBpbml0aWFsaXplZCB3aXRoIGN1c3RvbSBzZXR0aW5ncydcbiAqICAgfVxuICogfSk7XG4gKlxuICogLy8gU2ltcGxlIHBhc3N0aHJvdWdoXG4gKiBzZXR1cE91dHB1dCh7fSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNvbnN0IHNldHVwT3V0cHV0ID0gLyogQF9fUFVSRV9fICovIGNyZWF0ZUhvb2tTcGVjaWZpY091dHB1dEJ1aWxkZXIoXCJTZXR1cFwiKTtcbi8qKlxuICogQ3JlYXRlcyBhbiBvdXRwdXQgZm9yIFRlYW1tYXRlSWRsZSBob29rcy5cbiAqIEBwYXJhbSBvcHRpb25zIC0gQ29uZmlndXJhdGlvbiBvcHRpb25zIGZvciB0aGUgaG9vayBvdXRwdXRcbiAqIEByZXR1cm5zIEEgVGVhbW1hdGVJZGxlT3V0cHV0IG9iamVjdCByZWFkeSBmb3IgdGhlIHJ1bnRpbWVcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiAvLyBBbGxvdyB0ZWFtbWF0ZSB0byBnbyBpZGxlXG4gKiB0ZWFtbWF0ZUlkbGVPdXRwdXQoe30pO1xuICpcbiAqIC8vIEJsb2NrIHdpdGggZmVlZGJhY2tcbiAqIHRlYW1tYXRlSWRsZU91dHB1dCh7IHN0ZGVycjogJ0NvbnRpbnVlIHdvcmtpbmc6IHVuZmluaXNoZWQgdGFza3MgcmVtYWluLicgfSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNvbnN0IHRlYW1tYXRlSWRsZU91dHB1dCA9IC8qIEBfX1BVUkVfXyAqLyBjcmVhdGVFeGl0Q29kZU91dHB1dEJ1aWxkZXIoXCJUZWFtbWF0ZUlkbGVcIik7XG4vKipcbiAqIENyZWF0ZXMgYW4gb3V0cHV0IGZvciBUYXNrQ29tcGxldGVkIGhvb2tzLlxuICogQHBhcmFtIG9wdGlvbnMgLSBDb25maWd1cmF0aW9uIG9wdGlvbnMgZm9yIHRoZSBob29rIG91dHB1dFxuICogQHJldHVybnMgQSBUYXNrQ29tcGxldGVkT3V0cHV0IG9iamVjdCByZWFkeSBmb3IgdGhlIHJ1bnRpbWVcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiAvLyBBbGxvdyB0YXNrIGNvbXBsZXRpb25cbiAqIHRhc2tDb21wbGV0ZWRPdXRwdXQoe30pO1xuICpcbiAqIC8vIEJsb2NrIHdpdGggZmVlZGJhY2tcbiAqIHRhc2tDb21wbGV0ZWRPdXRwdXQoeyBzdGRlcnI6ICdDYW5ub3QgY29tcGxldGU6IHRlc3RzIGFyZSBmYWlsaW5nLicgfSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNvbnN0IHRhc2tDb21wbGV0ZWRPdXRwdXQgPSAvKiBAX19QVVJFX18gKi8gY3JlYXRlRXhpdENvZGVPdXRwdXRCdWlsZGVyKFwiVGFza0NvbXBsZXRlZFwiKTtcbiIsICIvKipcbiAqIFJ1bnRpbWUgbW9kdWxlIGZvciBDbGF1ZGUgQ29kZSBob29rcy5cbiAqXG4gKiBIYW5kbGVzIHN0ZGluL3N0ZG91dC9leGl0IGNvZGUgc2VtYW50aWNzIGZvciBjb21waWxlZCBob29rIGV4ZWN1dGlvbi5cbiAqIFRoaXMgbW9kdWxlIGlzIHRoZSBjb3JlIG9yY2hlc3RyYXRvciB0aGF0OlxuICogLSBSZWFkcyBKU09OIGZyb20gc3RkaW4gKHdpcmUgZm9ybWF0IHdpdGggc25ha2VfY2FzZSBwcm9wZXJ0aWVzKVxuICogLSBJbnZva2VzIHRoZSBob29rIGhhbmRsZXJcbiAqIC0gV3JpdGVzIG91dHB1dCB0byBzdGRvdXRcbiAqIC0gTWFuYWdlcyBleGl0IGNvZGVzXG4gKiBAbW9kdWxlXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogLy8gSW4gYSBjb21waWxlZCBob29rIGZpbGVcbiAqIGltcG9ydCB7IGV4ZWN1dGUgfSBmcm9tICdAZ29vZGZvb3QvY2xhdWRlLWNvZGUtaG9va3MvcnVudGltZSc7XG4gKiBpbXBvcnQgbXlIb29rIGZyb20gJy4vbXktaG9vay5qcyc7XG4gKlxuICogZXhlY3V0ZShteUhvb2spO1xuICogYGBgXG4gKiBAc2VlIGh0dHBzOi8vY29kZS5jbGF1ZGUuY29tL2RvY3MvZW4vaG9va3NcbiAqL1xuaW1wb3J0IHsgcGVyc2lzdEVudlZhciwgcGVyc2lzdEVudlZhcnMgfSBmcm9tIFwiLi9lbnYuanNcIjtcbmltcG9ydCB7IGxvZ2dlciB9IGZyb20gXCIuL2xvZ2dlci5qc1wiO1xuaW1wb3J0IHsgRVhJVF9DT0RFUyB9IGZyb20gXCIuL291dHB1dHMuanNcIjtcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIFN0ZGluL1N0ZG91dCBIYW5kbGluZ1xuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLyoqXG4gKiBSZWFkcyBhbGwgZGF0YSBmcm9tIHN0ZGluLlxuICogQHJldHVybnMgUHJvbWlzZSByZXNvbHZpbmcgdG8gdGhlIGNvbXBsZXRlIHN0ZGluIGNvbnRlbnRcbiAqL1xuYXN5bmMgZnVuY3Rpb24gcmVhZFN0ZGluKCkge1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgIGNvbnN0IGNodW5rcyA9IFtdO1xuICAgICAgICAvLyBTZXQgZW5jb2RpbmcgZmlyc3QgdG8gZW5zdXJlIGRhdGEgZXZlbnRzIHJlY2VpdmUgc3RyaW5nc1xuICAgICAgICBwcm9jZXNzLnN0ZGluLnNldEVuY29kaW5nKFwidXRmLThcIik7XG4gICAgICAgIHByb2Nlc3Muc3RkaW4ub24oXCJkYXRhXCIsIChjaHVuaykgPT4ge1xuICAgICAgICAgICAgY2h1bmtzLnB1c2goY2h1bmspO1xuICAgICAgICB9KTtcbiAgICAgICAgcHJvY2Vzcy5zdGRpbi5vbihcImVuZFwiLCAoKSA9PiB7XG4gICAgICAgICAgICByZXNvbHZlKGNodW5rcy5qb2luKFwiXCIpKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHByb2Nlc3Muc3RkaW4ub24oXCJlcnJvclwiLCAoZXJyb3IpID0+IHtcbiAgICAgICAgICAgIHJlamVjdChlcnJvcik7XG4gICAgICAgIH0pO1xuICAgIH0pO1xufVxuLyoqXG4gKiBQYXJzZXMgc3RkaW4gSlNPTiBpbnB1dC5cbiAqIEBwYXJhbSBzdGRpbkNvbnRlbnQgLSBSYXcgc3RkaW4gY29udGVudFxuICogQHJldHVybnMgUGFyc2VkIGlucHV0ICh3aXJlIGZvcm1hdCB3aXRoIHNuYWtlX2Nhc2UgcHJvcGVydGllcylcbiAqIEB0aHJvd3MgRXJyb3IgaWYgSlNPTiBpcyBtYWxmb3JtZWRcbiAqL1xuZnVuY3Rpb24gcGFyc2VTdGRpbklucHV0KHN0ZGluQ29udGVudCkge1xuICAgIC8vIFBhcnNlIEpTT04gLSBpbnB1dCB1c2VzIHdpcmUgZm9ybWF0IChzbmFrZV9jYXNlKSBkaXJlY3RseVxuICAgIGNvbnN0IHJhd0lucHV0ID0gSlNPTi5wYXJzZShzdGRpbkNvbnRlbnQpO1xuICAgIHJldHVybiByYXdJbnB1dDtcbn1cbi8qKlxuICogV3JpdGVzIGhvb2sgb3V0cHV0IHRvIHN0ZG91dC5cbiAqXG4gKiBPdXRwdXQgdXNlcyBjYW1lbENhc2Uga2V5cyBwZXIgQ2xhdWRlIENvZGUgaG9vayBzcGVjaWZpY2F0aW9uLlxuICogQHBhcmFtIG91dHB1dCAtIFRoZSBob29rIG91dHB1dCB0byB3cml0ZVxuICogQHNlZSBodHRwczovL2NvZGUuY2xhdWRlLmNvbS9kb2NzL2VuL2hvb2tzI2hvb2stb3V0cHV0LXN0cnVjdHVyZVxuICovXG5mdW5jdGlvbiB3cml0ZVN0ZG91dChvdXRwdXQpIHtcbiAgICAvLyBPdXRwdXQgdXNlcyBjYW1lbENhc2UgLSBubyB0cmFuc2Zvcm1hdGlvbiBuZWVkZWRcbiAgICBwcm9jZXNzLnN0ZG91dC53cml0ZShKU09OLnN0cmluZ2lmeShvdXRwdXQpKTtcbn1cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIEVycm9yIEhhbmRsaW5nXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vKipcbiAqIENyZWF0ZXMgYW4gZXJyb3Igb3V0cHV0IGZvciBtYWxmb3JtZWQgc3RkaW4gSlNPTi5cbiAqIEBwYXJhbSBlcnJvciAtIFRoZSBwYXJzZSBlcnJvclxuICogQHJldHVybnMgSG9va091dHB1dCB3aXRoIGVtcHR5IHN0ZG91dFxuICovXG5mdW5jdGlvbiBjcmVhdGVNYWxmb3JtZWRJbnB1dE91dHB1dChlcnJvcikge1xuICAgIGxvZ2dlci5lcnJvcihgSW52YWxpZCBKU09OIGlucHV0OiAke2Vycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogU3RyaW5nKGVycm9yKX1gKTtcbiAgICByZXR1cm4geyBzdGRvdXQ6IHt9IH07XG59XG4vKipcbiAqIFdyaXRlcyBoYW5kbGVyIGVycm9yIHN0YWNrdHJhY2UgdG8gc3RkZXJyIGFuZCBleGl0cyB3aXRoIGNvZGUgMi5cbiAqXG4gKiBXaGVuIGEgaG9vayBoYW5kbGVyIHRocm93cyBhbiBleGNlcHRpb246XG4gKiAtIFN0YWNrdHJhY2UgKHdpdGggc291cmNlbWFwcyBpZiBhdmFpbGFibGUpIGlzIG91dHB1dCB0byBzdGRlcnJcbiAqIC0gUHJvY2VzcyBleGl0cyB3aXRoIGNvZGUgMiAoQkxPQ0spXG4gKiAtIE5vIEpTT04gaXMgb3V0cHV0IHRvIHN0ZG91dFxuICogQHBhcmFtIGVycm9yIC0gVGhlIGVycm9yIHRocm93biBieSB0aGUgaGFuZGxlclxuICovXG5mdW5jdGlvbiBoYW5kbGVIYW5kbGVyRXJyb3IoZXJyb3IpIHtcbiAgICAvLyBXcml0ZSBzdGFjayB0cmFjZSB0byBzdGRlcnIgKHNvdXJjZW1hcHMgYXJlIGFwcGxpZWQgYXV0b21hdGljYWxseSBieSBOb2RlLmpzKVxuICAgIGlmIChlcnJvciBpbnN0YW5jZW9mIEVycm9yKSB7XG4gICAgICAgIHByb2Nlc3Muc3RkZXJyLndyaXRlKGAke2Vycm9yLnN0YWNrID8/IGVycm9yLm1lc3NhZ2V9XFxuYCk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICBwcm9jZXNzLnN0ZGVyci53cml0ZShgJHtTdHJpbmcoZXJyb3IpfVxcbmApO1xuICAgIH1cbiAgICAvLyBMb2cgdG8gZmlsZSBpZiBjb25maWd1cmVkXG4gICAgbG9nZ2VyLmVycm9yKGBIb29rIGhhbmRsZXIgZXJyb3I6ICR7ZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiBTdHJpbmcoZXJyb3IpfWApO1xuICAgIC8vIENsZWFyIGxvZ2dlciBjb250ZXh0IGFuZCBjbG9zZVxuICAgIGxvZ2dlci5jbGVhckNvbnRleHQoKTtcbiAgICBsb2dnZXIuY2xvc2UoKTtcbiAgICAvLyBFeGl0IHdpdGggY29kZSAyIChCTE9DSykgLSBubyBKU09OIG91dHB1dFxuICAgIHByb2Nlc3MuZXhpdChFWElUX0NPREVTLkJMT0NLKTtcbn1cbi8qKlxuICogQ29udmVydHMgYSBTcGVjaWZpY0hvb2tPdXRwdXQgdG8gSG9va091dHB1dCBmb3Igd2lyZSBmb3JtYXQuXG4gKlxuICogU3BlY2lmaWNIb29rT3V0cHV0IHR5cGVzIGhhdmU6IHsgX3R5cGUsIHN0ZG91dCwgc3RkZXJyPyB9XG4gKiBIb29rT3V0cHV0IGhhczogeyBzdGRvdXQsIHN0ZGVycj8gfVxuICpcbiAqIFNpbmNlIG91dHB1dCBidWlsZGVycyBub3cgcHJvZHVjZSB3aXJlLWZvcm1hdCBkaXJlY3RseSwgdGhpcyBmdW5jdGlvblxuICogc2ltcGx5IHN0cmlwcyB0aGUgYF90eXBlYCBkaXNjcmltaW5hdG9yIGZpZWxkLlxuICogQHBhcmFtIHNwZWNpZmljT3V0cHV0IC0gVGhlIHNwZWNpZmljIG91dHB1dCBmcm9tIGEgaG9vayBoYW5kbGVyXG4gKiBAcmV0dXJucyBIb29rT3V0cHV0IHJlYWR5IGZvciBzZXJpYWxpemF0aW9uXG4gKiBAc2VlIGh0dHBzOi8vY29kZS5jbGF1ZGUuY29tL2RvY3MvZW4vaG9va3MjaG9vay1vdXRwdXQtc3RydWN0dXJlXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogY29uc3Qgc3BlY2lmaWNPdXRwdXQgPSBwcmVUb29sVXNlT3V0cHV0KHsgaG9va1NwZWNpZmljT3V0cHV0OiB7IHBlcm1pc3Npb25EZWNpc2lvbjogJ2FsbG93JyB9IH0pO1xuICogY29uc3QgaG9va091dHB1dCA9IGNvbnZlcnRUb0hvb2tPdXRwdXQoc3BlY2lmaWNPdXRwdXQpO1xuICogLy8gaG9va091dHB1dDogeyBzdGRvdXQ6IHsgaG9va1NwZWNpZmljT3V0cHV0OiB7IC4uLiB9IH0gfVxuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjb252ZXJ0VG9Ib29rT3V0cHV0KHNwZWNpZmljT3V0cHV0KSB7XG4gICAgY29uc3QgeyBzdGRvdXQsIHN0ZGVyciB9ID0gc3BlY2lmaWNPdXRwdXQ7XG4gICAgcmV0dXJuIHN0ZGVyciAhPT0gdW5kZWZpbmVkID8geyBzdGRvdXQsIHN0ZGVyciB9IDogeyBzdGRvdXQgfTtcbn1cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIEV4ZWN1dGUgRnVuY3Rpb25cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8qKlxuICogRXhlY3V0ZXMgYSBob29rIGhhbmRsZXIgd2l0aCBmdWxsIHJ1bnRpbWUgb3JjaGVzdHJhdGlvbi5cbiAqXG4gKiBUaGlzIGlzIHRoZSBtYWluIGVudHJ5IHBvaW50IHRoYXQgY29tcGlsZWQgaG9va3MgdXNlLiBXaGVuIGEgY29tcGlsZWQgaG9va1xuICogcnVucyBhcyBhIENMSTpcbiAqXG4gKiAxLiBSZWFkcyBhbGwgc3RkaW5cbiAqIDIuIFBhcnNlcyBKU09OICh3aXJlIGZvcm1hdCB3aXRoIHNuYWtlX2Nhc2UgcHJvcGVydGllcylcbiAqIDMuIFNldHMgdXAgbG9nZ2VyIGNvbnRleHQgKGhvb2tUeXBlLCBpbnB1dClcbiAqIDQuIENhbGxzIGhhbmRsZXIgd2l0aCBpbnB1dCBhbmQgY29udGV4dCAobG9nZ2VyKVxuICogNS4gSGFuZGxlcyBhbnkgZXJyb3JzLCBsb2dzIHRoZW1cbiAqIDYuIFdyaXRlcyBKU09OIHRvIHN0ZG91dFxuICogNy4gQ2xvc2VzIGxvZ2dlclxuICogOC4gRXhpdHMgd2l0aCBhcHByb3ByaWF0ZSBjb2RlXG4gKiBAcGFyYW0gaG9va0ZuIC0gVGhlIGhvb2sgZnVuY3Rpb24gdG8gZXhlY3V0ZSAoZnJvbSBob29rIGZhY3RvcnkpXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogLy8gSW4gY29tcGlsZWQgaG9vayBmaWxlXG4gKiBpbXBvcnQgeyBleGVjdXRlIH0gZnJvbSAnQGdvb2Rmb290L2NsYXVkZS1jb2RlLWhvb2tzL3J1bnRpbWUnO1xuICogaW1wb3J0IHsgcHJlVG9vbFVzZUhvb2ssIHByZVRvb2xVc2VPdXRwdXQgfSBmcm9tICdAZ29vZGZvb3QvY2xhdWRlLWNvZGUtaG9va3MnO1xuICpcbiAqIGNvbnN0IG15SG9vayA9IHByZVRvb2xVc2VIb29rKHsgbWF0Y2hlcjogJ0Jhc2gnIH0sIGFzeW5jIChpbnB1dCwgeyBsb2dnZXIgfSkgPT4ge1xuICogICBsb2dnZXIuaW5mbygnUHJvY2Vzc2luZyBCYXNoIGNvbW1hbmQnKTtcbiAqICAgcmV0dXJuIHByZVRvb2xVc2VPdXRwdXQoeyBhbGxvdzogdHJ1ZSB9KTtcbiAqIH0pO1xuICpcbiAqIGV4ZWN1dGUobXlIb29rKTtcbiAqIGBgYFxuICogQHNlZSBodHRwczovL2NvZGUuY2xhdWRlLmNvbS9kb2NzL2VuL2hvb2tzXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBleGVjdXRlKGhvb2tGbikge1xuICAgIGxldCBvdXRwdXQ7XG4gICAgdHJ5IHtcbiAgICAgICAgLy8gQ2hlY2sgZm9yIGxvZyBmaWxlIGNvbmZpZ3VyYXRpb24gY29uZmxpY3RzXG4gICAgICAgIC8vIENMQVVERV9DT0RFX0hPT0tTX0NMSV9MT0dfRklMRSBpcyBpbmplY3RlZCBieSB0aGUgQ0xJIC0tbG9nIHBhcmFtZXRlclxuICAgICAgICAvLyBDTEFVREVfQ09ERV9IT09LU19MT0dfRklMRSBpcyB0aGUgdXNlcidzIGVudmlyb25tZW50IHZhcmlhYmxlXG4gICAgICAgIGNvbnN0IGNsaUxvZ0ZpbGUgPSBwcm9jZXNzLmVudi5DTEFVREVfQ09ERV9IT09LU19DTElfTE9HX0ZJTEU7XG4gICAgICAgIGNvbnN0IGVudkxvZ0ZpbGUgPSBwcm9jZXNzLmVudi5DTEFVREVfQ09ERV9IT09LU19MT0dfRklMRTtcbiAgICAgICAgaWYgKGNsaUxvZ0ZpbGUgIT09IHVuZGVmaW5lZCAmJiBlbnZMb2dGaWxlICE9PSB1bmRlZmluZWQgJiYgY2xpTG9nRmlsZSAhPT0gZW52TG9nRmlsZSkge1xuICAgICAgICAgICAgLy8gV3JpdGUgZXJyb3IgdG8gc3RkZXJyIGFuZCBleGl0IHdpdGggZXJyb3IgY29kZVxuICAgICAgICAgICAgcHJvY2Vzcy5zdGRlcnIud3JpdGUoYExvZyBmaWxlIGNvbmZpZ3VyYXRpb24gY29uZmxpY3Q6IENMSSAtLWxvZz1cIiR7Y2xpTG9nRmlsZX1cIiB2cyBDTEFVREVfQ09ERV9IT09LU19MT0dfRklMRT1cIiR7ZW52TG9nRmlsZX1cIi4gYCArXG4gICAgICAgICAgICAgICAgXCJVc2Ugb25seSBvbmUgbWV0aG9kIHRvIGNvbmZpZ3VyZSBob29rIGxvZ2dpbmcuXFxuXCIpO1xuICAgICAgICAgICAgcHJvY2Vzcy5leGl0KEVYSVRfQ09ERVMuRVJST1IpO1xuICAgICAgICB9XG4gICAgICAgIC8vIElmIENMSSBsb2cgZmlsZSBpcyBzZXQsIGNvbmZpZ3VyZSB0aGUgbG9nZ2VyXG4gICAgICAgIGlmIChjbGlMb2dGaWxlICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGxvZ2dlci5zZXRMb2dGaWxlKGNsaUxvZ0ZpbGUpO1xuICAgICAgICB9XG4gICAgICAgIC8vIFJlYWQgYW5kIHBhcnNlIHN0ZGluXG4gICAgICAgIGxldCBzdGRpbkNvbnRlbnQ7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBzdGRpbkNvbnRlbnQgPSBhd2FpdCByZWFkU3RkaW4oKTtcbiAgICAgICAgfVxuICAgICAgICBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIGxvZ2dlci5sb2dFcnJvcihlcnJvciwgXCJGYWlsZWQgdG8gcmVhZCBzdGRpblwiKTtcbiAgICAgICAgICAgIG91dHB1dCA9IGNyZWF0ZU1hbGZvcm1lZElucHV0T3V0cHV0KGVycm9yKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICAvLyBQYXJzZSBhbmQgdHJhbnNmb3JtIGlucHV0XG4gICAgICAgIGxldCBpbnB1dDtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGlucHV0ID0gcGFyc2VTdGRpbklucHV0KHN0ZGluQ29udGVudCk7XG4gICAgICAgIH1cbiAgICAgICAgY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICBsb2dnZXIubG9nRXJyb3IoZXJyb3IsIFwiRmFpbGVkIHRvIHBhcnNlIHN0ZGluIEpTT05cIik7XG4gICAgICAgICAgICBvdXRwdXQgPSBjcmVhdGVNYWxmb3JtZWRJbnB1dE91dHB1dChlcnJvcik7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgLy8gU2V0IGxvZ2dlciBjb250ZXh0XG4gICAgICAgIGNvbnN0IGhvb2tFdmVudE5hbWUgPSBob29rRm4uaG9va0V2ZW50TmFtZTtcbiAgICAgICAgbG9nZ2VyLnNldENvbnRleHQoaG9va0V2ZW50TmFtZSwgaW5wdXQpO1xuICAgICAgICAvLyBCdWlsZCBjb250ZXh0IC0gU2Vzc2lvblN0YXJ0IGhvb2tzIGdldCBleHRlbmRlZCBjb250ZXh0IHdpdGggcGVyc2lzdEVudlZhclxuICAgICAgICBjb25zdCBjb250ZXh0ID0gaG9va0V2ZW50TmFtZSA9PT0gXCJTZXNzaW9uU3RhcnRcIiA/IHsgbG9nZ2VyLCBwZXJzaXN0RW52VmFyLCBwZXJzaXN0RW52VmFycyB9IDogeyBsb2dnZXIgfTtcbiAgICAgICAgLy8gRXhlY3V0ZSBoYW5kbGVyXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCBzcGVjaWZpY091dHB1dCA9IGF3YWl0IGhvb2tGbihpbnB1dCwgY29udGV4dCk7XG4gICAgICAgICAgICBvdXRwdXQgPSBjb252ZXJ0VG9Ib29rT3V0cHV0KHNwZWNpZmljT3V0cHV0KTtcbiAgICAgICAgfVxuICAgICAgICBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIC8vIEhhbmRsZXIgdGhyZXcgLSBvdXRwdXQgc3RhY2t0cmFjZSB0byBzdGRlcnIgYW5kIGV4aXQgd2l0aCBjb2RlIDJcbiAgICAgICAgICAgIC8vIFRoaXMgY2FsbCBuZXZlciByZXR1cm5zIChwcm9jZXNzLmV4aXQpXG4gICAgICAgICAgICBoYW5kbGVIYW5kbGVyRXJyb3IoZXJyb3IpO1xuICAgICAgICB9XG4gICAgfVxuICAgIGZpbmFsbHkge1xuICAgICAgICAvLyBXcml0ZSBvdXRwdXQgaWYgd2UgaGF2ZSBpdFxuICAgICAgICBpZiAob3V0cHV0ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHdyaXRlU3Rkb3V0KG91dHB1dC5zdGRvdXQpO1xuICAgICAgICB9XG4gICAgICAgIC8vIENsZWFuIHVwIGxvZ2dlciAoc2luZ2xlIGNsZWFudXAgcGF0aClcbiAgICAgICAgbG9nZ2VyLmNsZWFyQ29udGV4dCgpO1xuICAgICAgICBsb2dnZXIuY2xvc2UoKTtcbiAgICAgICAgLy8gRXhpdC1jb2RlIEJMT0NLOiB1bmxpa2UgaGFuZGxlciB0aHJvdyAobm8gc3Rkb3V0KSwgdGhpcyBwYXRoIHN0aWxsIHdyaXRlc1xuICAgICAgICAvLyBzdHJ1Y3R1cmVkIEpTT04gdG8gc3Rkb3V0IChhcyBlbXB0eSB7fSkgYWxvbmdzaWRlIHRoZSBzdGRlcnIgbWVzc2FnZS5cbiAgICAgICAgLy8gVGhlIGNhbGxlciBjb250cm9scyBzdGRlcnIgZm9ybWF0dGluZyAobm8gYXBwZW5kZWQgbmV3bGluZSkuXG4gICAgICAgIGlmIChvdXRwdXQ/LnN0ZGVyciAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBwcm9jZXNzLnN0ZGVyci53cml0ZShvdXRwdXQuc3RkZXJyKTtcbiAgICAgICAgICAgIHByb2Nlc3MuZXhpdChFWElUX0NPREVTLkJMT0NLKTtcbiAgICAgICAgfVxuICAgICAgICAvLyBFeGl0IHdpdGggc3VjY2VzcyAoaGFuZGxlciBlcnJvcnMgZXhpdCB2aWEgaGFuZGxlSGFuZGxlckVycm9yIHdpdGggY29kZSAyKVxuICAgICAgICBwcm9jZXNzLmV4aXQoRVhJVF9DT0RFUy5TVUNDRVNTKTtcbiAgICB9XG59XG4iLCAiLyoqXG4gKiBDYXJkcyBBUEkgZGlzY292ZXJ5IHV0aWxpdGllcy5cbiAqXG4gKiBSZWFkcyBgfi8uY2FyZHMvY2FyZHMtYXBpLmpzb25gIHRvIGxvY2F0ZSB0aGUgQ2FyZHMgQVBJIHNlcnZlciBhbmRcbiAqIGNvbnN0cnVjdHMgYSB7QGxpbmsgQ2FyZHNDbGllbnR9IGZvciB1c2UgYnkgaG9vayBlbnRyeXBvaW50cy5cbiAqXG4gKiBBbGwgZnVuY3Rpb25zIGludGVudGlvbmFsbHkgZmFpbCBvcGVuIHNvIGhvb2sgZmFpbHVyZXMgZG8gbm90IGJsb2NrIENsYXVkZS5cbiAqIFNldCBgQVBJX1RFU1RfTU9ERT0xYCB0byBmb3JjZSBkZXRlcm1pbmlzdGljLCBsb2NhbCB2YWx1ZXMgaW4gdGVzdHMuXG4gKlxuICpcbiAqIEBzdW1tYXJ5IENhcmRzIEFQSSBkaXNjb3ZlcnkgdXRpbGl0aWVzXG4gKiBAbW9kdWxlIGxpYi9hcGktZGlzY292ZXJ5XG4gKi9cblxuaW1wb3J0IHsgcmVhZEZpbGUgfSBmcm9tICdub2RlOmZzL3Byb21pc2VzJztcbmltcG9ydCB7IGhvbWVkaXIgfSBmcm9tICdub2RlOm9zJztcbmltcG9ydCB7IGpvaW4gfSBmcm9tICdub2RlOnBhdGgnO1xuaW1wb3J0IHsgQ2FyZHNDbGllbnQgfSBmcm9tICdAY2FyZHMvc2RrL2NsaWVudCc7XG5pbXBvcnQgdHlwZSB7IENhcmRzQXBpSW5mbywgU2Vzc2lvbkJhc2VsaW5lIH0gZnJvbSAnQGNhcmRzL3Nkay9wcm90b2NvbCc7XG5pbXBvcnQgdHlwZSB7IExvZ2dlciB9IGZyb20gJ0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcyc7XG5cbi8qKlxuICogUmVhZHMgdGhlIENhcmRzIEFQSSBkaXNjb3ZlcnkgZmlsZSBhbmQgcmV0dXJucyB0aGUgZnVsbCB0eXBlZCBwYXlsb2FkLlxuICpcbiAqIFJldHVybnMgYG51bGxgIHdoZW4gZGlzY292ZXJ5IGZhaWxzIChtaXNzaW5nIGZpbGUsIGludmFsaWQgSlNPTiwgb3JcbiAqIHJlcXVpcmVkIGZpZWxkcyBhYnNlbnQpLiBUaGUgaG9vayBsYXllciB1c2VzIHRoaXMgdG8gZGVncmFkZSBncmFjZWZ1bGx5LlxuICpcbiAqIEBwYXJhbSBsb2dnZXIgLSBPcHRpb25hbCBsb2dnZXIgZm9yIGRlYnVnIG91dHB1dC5cbiAqIEByZXR1cm5zIFRoZSBDYXJkc0FwaUluZm8gcGF5bG9hZCwgb3IgbnVsbCBpZiBkaXNjb3ZlcnkgZmFpbHMuXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBkaXNjb3ZlckFwaUluZm8obG9nZ2VyPzogTG9nZ2VyKTogUHJvbWlzZTxDYXJkc0FwaUluZm8gfCBudWxsPiB7XG4gIGlmIChwcm9jZXNzLmVudlsnQVBJX1RFU1RfTU9ERSddID09PSAnMScpIHtcbiAgICBsb2dnZXI/LmRlYnVnKCdBUElfVEVTVF9NT0RFOiBVc2luZyBtb2NrIEFQSSBpbmZvJyk7XG4gICAgcmV0dXJuIHtcbiAgICAgIGhvc3Q6ICdsb2NhbGhvc3QnLFxuICAgICAgcG9ydDogOTk5OSxcbiAgICAgIHBpZDogOTk5OTksXG4gICAgICBhY2Nlc3NUb2tlbjogJ3Rlc3QtdG9rZW4nLFxuICAgICAgc3RhcnRlZEF0OiAnMjAyNC0wMS0wMVQwMDowMDowMFonXG4gICAgfTtcbiAgfVxuXG4gIGNvbnN0IGNvbmZpZ1BhdGggPSBwcm9jZXNzLmVudlsnQ0FSRFNfRElTQ09WRVJZX1BBVEgnXSA/PyBqb2luKGhvbWVkaXIoKSwgJy5jYXJkcycsICdjYXJkcy1hcGkuanNvbicpO1xuICB0cnkge1xuICAgIGNvbnN0IGNvbnRlbnQgPSBhd2FpdCByZWFkRmlsZShjb25maWdQYXRoLCAndXRmLTgnKTtcbiAgICBjb25zdCBjb25maWcgPSBKU09OLnBhcnNlKGNvbnRlbnQpIGFzIFJlY29yZDxzdHJpbmcsIHVua25vd24+O1xuXG4gICAgaWYgKFxuICAgICAgdHlwZW9mIGNvbmZpZ1snaG9zdCddICE9PSAnc3RyaW5nJyB8fFxuICAgICAgdHlwZW9mIGNvbmZpZ1sncG9ydCddICE9PSAnbnVtYmVyJyB8fFxuICAgICAgdHlwZW9mIGNvbmZpZ1snYWNjZXNzVG9rZW4nXSAhPT0gJ3N0cmluZycgfHxcbiAgICAgIHR5cGVvZiBjb25maWdbJ3BpZCddICE9PSAnbnVtYmVyJyB8fFxuICAgICAgdHlwZW9mIGNvbmZpZ1snc3RhcnRlZEF0J10gIT09ICdzdHJpbmcnXG4gICAgKSB7XG4gICAgICBsb2dnZXI/LmRlYnVnKCdBUEkgaW5mbyBkaXNjb3ZlcnkgZmFpbGVkJywgeyBlcnJvcjogJ0NvbmZpZyBtaXNzaW5nIHJlcXVpcmVkIGZpZWxkcycgfSk7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICByZXR1cm4ge1xuICAgICAgaG9zdDogY29uZmlnWydob3N0J10sXG4gICAgICBwb3J0OiBjb25maWdbJ3BvcnQnXSxcbiAgICAgIGFjY2Vzc1Rva2VuOiBjb25maWdbJ2FjY2Vzc1Rva2VuJ10sXG4gICAgICBwaWQ6IGNvbmZpZ1sncGlkJ10sXG4gICAgICBzdGFydGVkQXQ6IGNvbmZpZ1snc3RhcnRlZEF0J10sXG4gICAgICBzZXNzaW9uQmFzZWxpbmU6IGNvbmZpZ1snc2Vzc2lvbkJhc2VsaW5lJ10gYXMgU2Vzc2lvbkJhc2VsaW5lIHwgdW5kZWZpbmVkXG4gICAgfTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBsb2dnZXI/LmRlYnVnKCdBUEkgaW5mbyBkaXNjb3ZlcnkgZmFpbGVkJywgeyBlcnJvcjogU3RyaW5nKGVycm9yKSB9KTtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxufVxuXG4vKipcbiAqIENyZWF0ZXMgYSB7QGxpbmsgQ2FyZHNDbGllbnR9IGZyb20gdGhlIEFQSSBkaXNjb3ZlcnkgZmlsZS5cbiAqXG4gKiBSZWFkcyBgfi8uY2FyZHMvY2FyZHMtYXBpLmpzb25gLCBleHRyYWN0cyBob3N0L3BvcnQvYWNjZXNzVG9rZW4sIGFuZFxuICogcmV0dXJucyBhIGNvbmZpZ3VyZWQgY2xpZW50IGluc3RhbmNlLiBSZXR1cm5zIGBudWxsYCB3aGVuIGRpc2NvdmVyeSBmYWlscy5cbiAqXG4gKiBAcGFyYW0gbG9nZ2VyIC0gT3B0aW9uYWwgbG9nZ2VyIGZvciBkZWJ1ZyBvdXRwdXQuXG4gKiBAcmV0dXJucyBBIGNvbmZpZ3VyZWQgQ2FyZHNDbGllbnQsIG9yIG51bGwgaWYgZGlzY292ZXJ5IGZhaWxzLlxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gY3JlYXRlQ2FyZHNDbGllbnQobG9nZ2VyPzogTG9nZ2VyKTogUHJvbWlzZTxDYXJkc0NsaWVudCB8IG51bGw+IHtcbiAgY29uc3QgaW5mbyA9IGF3YWl0IGRpc2NvdmVyQXBpSW5mbyhsb2dnZXIpO1xuICBpZiAoIWluZm8pIHJldHVybiBudWxsO1xuXG4gIHJldHVybiBuZXcgQ2FyZHNDbGllbnQoe1xuICAgIGJhc2VVcmw6IGBodHRwOi8vJHtpbmZvLmhvc3R9OiR7aW5mby5wb3J0fWAsXG4gICAgYWNjZXNzVG9rZW46IGluZm8uYWNjZXNzVG9rZW5cbiAgfSk7XG59XG4iLCAiLyoqXG4gKiBFcnJvciBjbGFzc2VzIGZvciB0aGUgQ2FyZHMgVjIgU0RLLlxuICpcbiAqIFRoZXNlIGVycm9ycyBub3JtYWxpemUgc2VydmVyIHJlc3BvbnNlcyBhbmQgbmV0d29yayBmYWlsdXJlcyBzbyBjYWxsZXJzIGNhblxuICogZGlzdGluZ3Vpc2ggQVBJIHZhbGlkYXRpb24gcHJvYmxlbXMgZnJvbSB0cmFuc3BvcnQgaXNzdWVzLlxuICpcbiAqXG4gKiBAc3VtbWFyeSBFcnJvciBjbGFzc2VzIGZvciB0aGUgQ2FyZHMgVjIgU0RLXG4gKiBAbW9kdWxlIHR5cGVzL2Vycm9yc1xuICovXG5cbmltcG9ydCB0eXBlIHsgRmllbGRFcnJvciB9IGZyb20gJy4uLy4uL3Byb3RvY29sL2luZGV4LmpzJztcblxuLyoqXG4gKiBFcnJvciB0aHJvd24gd2hlbiBhbiBBUEkgcmVxdWVzdCBmYWlscyB3aXRoIGFuIGVycm9yIHJlc3BvbnNlLlxuICpcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiB0cnkge1xuICogICBhd2FpdCBjbGllbnQuY3JlYXRlQ2FyZChkYXRhKTtcbiAqIH0gY2F0Y2ggKGVycm9yKSB7XG4gKiAgIGlmIChlcnJvciBpbnN0YW5jZW9mIEFwaUVycm9yKSB7XG4gKiAgICAgY29uc29sZS5lcnJvcihgQVBJIGVycm9yIFske2Vycm9yLmNvZGV9XTogJHtlcnJvci5tZXNzYWdlfWApO1xuICogICAgIGlmIChlcnJvci5maWVsZHMpIHtcbiAqICAgICAgIGVycm9yLmZpZWxkcy5mb3JFYWNoKGYgPT4gY29uc29sZS5lcnJvcihgICAke2YuZmllbGR9OiAke2YubWVzc2FnZX1gKSk7XG4gKiAgICAgfVxuICogICB9XG4gKiB9XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNsYXNzIEFwaUVycm9yIGV4dGVuZHMgRXJyb3Ige1xuICAvKipcbiAgICogQ3JlYXRlcyBhIG5ldyBBcGlFcnJvciBpbnN0YW5jZS5cbiAgICpcbiAgICogQHBhcmFtIG1lc3NhZ2UgLSBIdW1hbi1yZWFkYWJsZSBlcnJvciBtZXNzYWdlXG4gICAqIEBwYXJhbSBjb2RlIC0gTWFjaGluZS1yZWFkYWJsZSBlcnJvciBjb2RlXG4gICAqIEBwYXJhbSBmaWVsZHMgLSBPcHRpb25hbCBhcnJheSBvZiBmaWVsZC1zcGVjaWZpYyB2YWxpZGF0aW9uIGVycm9yc1xuICAgKi9cbiAgY29uc3RydWN0b3IoXG4gICAgbWVzc2FnZTogc3RyaW5nLFxuICAgIHB1YmxpYyByZWFkb25seSBjb2RlOiBzdHJpbmcsXG4gICAgcHVibGljIHJlYWRvbmx5IGZpZWxkcz86IEZpZWxkRXJyb3JbXVxuICApIHtcbiAgICBzdXBlcihtZXNzYWdlKTtcbiAgICB0aGlzLm5hbWUgPSAnQXBpRXJyb3InO1xuICB9XG59XG5cbi8qKlxuICogRXJyb3IgdGhyb3duIHdoZW4gYSBuZXR3b3JrIHJlcXVlc3QgZmFpbHMgZHVlIHRvIGNvbm5lY3Rpdml0eSBpc3N1ZXMuXG4gKlxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIHRyeSB7XG4gKiAgIGF3YWl0IGNsaWVudC5saXN0Q2FyZHMoKTtcbiAqIH0gY2F0Y2ggKGVycm9yKSB7XG4gKiAgIGlmIChlcnJvciBpbnN0YW5jZW9mIE5ldHdvcmtFcnJvcikge1xuICogICAgIGNvbnNvbGUuZXJyb3IoYE5ldHdvcmsgZXJyb3I6ICR7ZXJyb3IubWVzc2FnZX1gKTtcbiAqICAgICBpZiAoZXJyb3IuY2F1c2UpIHtcbiAqICAgICAgIGNvbnNvbGUuZXJyb3IoYENhdXNlZCBieTogJHtlcnJvci5jYXVzZS5tZXNzYWdlfWApO1xuICogICAgIH1cbiAqICAgfVxuICogfVxuICogYGBgXG4gKi9cbmV4cG9ydCBjbGFzcyBOZXR3b3JrRXJyb3IgZXh0ZW5kcyBFcnJvciB7XG4gIC8qKlxuICAgKiBDcmVhdGVzIGEgbmV3IE5ldHdvcmtFcnJvciBpbnN0YW5jZS5cbiAgICpcbiAgICogQHBhcmFtIG1lc3NhZ2UgLSBIdW1hbi1yZWFkYWJsZSBlcnJvciBtZXNzYWdlXG4gICAqIEBwYXJhbSBjYXVzZSAtIE9wdGlvbmFsIHVuZGVybHlpbmcgZXJyb3IgdGhhdCBjYXVzZWQgdGhpcyBuZXR3b3JrIGZhaWx1cmVcbiAgICovXG4gIGNvbnN0cnVjdG9yKFxuICAgIG1lc3NhZ2U6IHN0cmluZyxcbiAgICBwdWJsaWMgcmVhZG9ubHkgY2F1c2U/OiBFcnJvclxuICApIHtcbiAgICBzdXBlcihtZXNzYWdlKTtcbiAgICB0aGlzLm5hbWUgPSAnTmV0d29ya0Vycm9yJztcbiAgfVxufVxuIiwgIi8qKlxuICogSFRUUCBjbGllbnQgZm9yIHRoZSBDYXJkcyBWMiBSRVNUIEFQSS5cbiAqXG4gKlxuICogQHN1bW1hcnkgSFRUUCBjbGllbnQgZm9yIHRoZSBDYXJkcyBWMiBSRVNUIEFQSVxuICogQG1vZHVsZSBzZGsvQ2FyZHNDbGllbnRcbiAqL1xuXG5pbXBvcnQgdHlwZSB7IENhcmQsIENvbXBhcmVSZXF1ZXN0LCBDb21wYXJlU3RhdGUsIEh0dHBDbGllbnQsIFN0cmVhbU1ldGEsIFRpbWVsaW5lSXRlbSB9IGZyb20gJy4uL3Byb3RvY29sL2luZGV4LmpzJztcbmltcG9ydCB0eXBlIHtcbiAgQWRkQnJhbmNoUmVxdWVzdCxcbiAgQXR0YWNobWVudFJlc3BvbnNlLFxuICBCcmFuY2hlc1Jlc3BvbnNlLFxuICBDYXJkQ3JlYXRlRGF0YSxcbiAgQ2FyZHNDbGllbnRPcHRpb25zLFxuICBDYXJkVXBkYXRlRGF0YSxcbiAgQ29tbWVudCxcbiAgQ29tbWVudENyZWF0ZURhdGEsXG4gIENvbW1lbnRVcGRhdGVEYXRhLFxuICBDb21taXRJbmZvLFxuICBHYXRlQXBwcm92YWxSZXNwb25zZSxcbiAgSW5nZXN0V3NGYWN0b3J5LFxuICBMaXN0Q2FyZHNPcHRpb25zLFxuICBTdHJlYW1SZXN1bHQsXG4gIFN0cmVhbVdyaXRlcixcbiAgU3RyZWFtV3JpdGVyT3B0aW9ucyxcbiAgVGltZWxpbmVPcHRpb25zLFxuICBUeXBlU2NoZW1hc1Jlc3BvbnNlLFxuICBXc1N0cmVhbVNlc3Npb25cbn0gZnJvbSAnLi90eXBlcy9jbGllbnQuanMnO1xuaW1wb3J0IHsgQXBpRXJyb3IsIE5ldHdvcmtFcnJvciB9IGZyb20gJy4vdHlwZXMvZXJyb3JzLmpzJztcblxuLyoqIEluaXRpYWwgcmVxdWVzdCB0aW1lb3V0IGluIG1pbGxpc2Vjb25kcyAoMyBzZWNvbmRzIHRvIGFjY29tbW9kYXRlIGdpdC1iYWNrZWQgZW5kcG9pbnRzKS4gKi9cbmNvbnN0IElOSVRJQUxfVElNRU9VVF9NUyA9IDNfMDAwO1xuXG4vKiogTWF4aW11bSByZXF1ZXN0IHRpbWVvdXQgaW4gbWlsbGlzZWNvbmRzIGFmdGVyIGV4cG9uZW50aWFsIGJhY2tvZmYuICovXG5jb25zdCBNQVhfVElNRU9VVF9NUyA9IDEwXzAwMDtcblxuLyoqIE1heGltdW0gbnVtYmVyIG9mIGF1dG9tYXRpYyByZXRyaWVzIGZvciB0aW1lb3V0IGVycm9ycyBiZWZvcmUgZ2l2aW5nIHVwLiAqL1xuY29uc3QgTUFYX1RJTUVPVVRfUkVUUklFUyA9IDI7XG5cbi8qKlxuICogVHlwZS1zYWZlIEhUVFAgY2xpZW50IGZvciB0aGUgQ2FyZHMgVjIgUkVTVCBBUEkuXG4gKlxuICogVXNlcyB0aGUgRmV0Y2ggQVBJIGJ5IGRlZmF1bHQgYW5kIHN1cHBvcnRzIGRlcGVuZGVuY3kgaW5qZWN0aW9uIG9mIGFuXG4gKiBhbHRlcm5hdGUge0BsaW5rIEh0dHBDbGllbnR9IGZvciB0ZXN0cyBvciBjdXN0b20gdHJhbnNwb3J0cy4gQWxsIHB1YmxpY1xuICogbWV0aG9kcyBzdXJmYWNlIHNlcnZlciBmYWlsdXJlcyBhcyB7QGxpbmsgQXBpRXJyb3J9IGFuZCB0cmFuc3BvcnQgZmFpbHVyZXNcbiAqIGFzIHtAbGluayBOZXR3b3JrRXJyb3J9LlxuICpcbiAqIFRoZSBkZWZhdWx0IEhUVFAgY2xpZW50IGFwcGxpZXMgYW4gZXhwb25lbnRpYWwgYmFja29mZiB0aW1lb3V0IHRvIGZldGNoXG4gKiByZXF1ZXN0czogc3RhcnRpbmcgYXQgMyBzZWNvbmRzLCBkb3VibGluZyBvbiBlYWNoIGNvbnNlY3V0aXZlIGZhaWx1cmUgdXBcbiAqIHRvIGEgMTAtc2Vjb25kIGNhcCwgYW5kIHJlc2V0dGluZyBvbiBhbnkgc3VjY2Vzc2Z1bCByZXNwb25zZS4gVGhpcyBlbnN1cmVzXG4gKiBmYXN0IGZhaWx1cmUgZGV0ZWN0aW9uIHdoZW4gdGhlIHNlcnZlciBpcyBkb3duIHdoaWxlIGFsbG93aW5nIHNsb3dlclxuICogcmVzcG9uc2VzIGR1cmluZyByZWNvdmVyeS5cbiAqXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogY29uc3QgY2xpZW50ID0gbmV3IENhcmRzQ2xpZW50KHsgYmFzZVVybDogJ2h0dHA6Ly9sb2NhbGhvc3Q6MzAwMCcsIGFjY2Vzc1Rva2VuOiAndG9rZW4nIH0pO1xuICpcbiAqIGNvbnN0IGNhcmRzID0gYXdhaXQgY2xpZW50Lmxpc3RDYXJkcyh7IHN0YXR1czogJ2luX3Byb2dyZXNzJyB9KTtcbiAqIGF3YWl0IGNsaWVudC51cGRhdGVDYXJkKGNhcmRJZCwgeyBzdGF0dXM6ICdkb25lJyB9KTtcbiAqIGBgYFxuICovXG5leHBvcnQgY2xhc3MgQ2FyZHNDbGllbnQge1xuICBwcml2YXRlIHJlYWRvbmx5IF9odHRwQ2xpZW50PzogSHR0cENsaWVudDtcblxuICAvKiogQ3VycmVudCB0aW1lb3V0IGluIG1pbGxpc2Vjb25kcywgaW5jcmVhc2VzIHdpdGggY29uc2VjdXRpdmUgZmFpbHVyZXMuICovXG4gIHByaXZhdGUgX2N1cnJlbnRUaW1lb3V0TXMgPSBJTklUSUFMX1RJTUVPVVRfTVM7XG5cbiAgLyoqXG4gICAqIENyZWF0ZXMgYSBuZXcgQ2FyZHNDbGllbnQgaW5zdGFuY2UuXG4gICAqXG4gICAqIEBwYXJhbSBvcHRpb25zIC0gQ29uZmlndXJhdGlvbiBvcHRpb25zIGluY2x1ZGluZyBiYXNlIFVSTCBhbmQgYXV0aCB0b2tlbi5cbiAgICogQHBhcmFtIGh0dHBDbGllbnQgLSBPcHRpb25hbCBIVFRQIGNsaWVudCBmb3IgZGVwZW5kZW5jeSBpbmplY3Rpb24uXG4gICAqL1xuICBjb25zdHJ1Y3RvcihcbiAgICBwcml2YXRlIHJlYWRvbmx5IG9wdGlvbnM6IENhcmRzQ2xpZW50T3B0aW9ucyxcbiAgICBodHRwQ2xpZW50PzogSHR0cENsaWVudFxuICApIHtcbiAgICB0aGlzLl9odHRwQ2xpZW50ID0gaHR0cENsaWVudDtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXR1cm5zIHRoZSBiYXNlIFVSTCB1c2VkIHRvIGJ1aWxkIEFQSSByZXF1ZXN0cy5cbiAgICpcbiAgICogQHJldHVybnMgVGhlIGJhc2UgVVJMIHN0cmluZyBhcyBwcm92aWRlZCBpbiB7QGxpbmsgQ2FyZHNDbGllbnRPcHRpb25zfS5cbiAgICovXG4gIGdldEJhc2VVcmwoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gdGhpcy5vcHRpb25zLmJhc2VVcmw7XG4gIH1cblxuICAvKipcbiAgICogUmV0dXJucyB3aGV0aGVyIGFuIEhUVFAgY2xpZW50IHdhcyBpbmplY3RlZC5cbiAgICpcbiAgICogQHJldHVybnMgVHJ1ZSBpZiBhbiBIVFRQIGNsaWVudCB3YXMgcHJvdmlkZWQgZHVyaW5nIGNvbnN0cnVjdGlvbi5cbiAgICogQGludGVybmFsIFVzZWQgZm9yIHRlc3RpbmcgZGVwZW5kZW5jeSBpbmplY3Rpb24uXG4gICAqL1xuICBoYXNIdHRwQ2xpZW50KCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLl9odHRwQ2xpZW50ICE9PSB1bmRlZmluZWQ7XG4gIH1cbiAgLyoqXG4gICAqIFJldHVybnMgYW4gQWJvcnRTaWduYWwgdGhhdCBmaXJlcyBhZnRlciB0aGUgY3VycmVudCBiYWNrb2ZmIHRpbWVvdXQuXG4gICAqIFVzZXMgY2FsbGVyJ3Mgc2lnbmFsIGlmIHByb3ZpZGVkIChmb3IgREkvdGVzdGluZyksIG90aGVyd2lzZSBhcHBsaWVzIHRoZSBiYWNrb2ZmIHRpbWVvdXQuXG4gICAqXG4gICAqIEBwYXJhbSBleGlzdGluZ1NpZ25hbCAtIE9wdGlvbmFsIGNhbGxlci1wcm92aWRlZCBzaWduYWwgdG8gcmV1c2UgaW5zdGVhZCBvZiBjcmVhdGluZyBhIHRpbWVvdXQgc2lnbmFsLlxuICAgKiBAcmV0dXJucyBBYm9ydFNpZ25hbCB0aGF0IGNvbnRyb2xzIHJlcXVlc3QgY2FuY2VsbGF0aW9uIGZvciB0aGUgY3VycmVudCBvcGVyYXRpb24uXG4gICAqL1xuICBwcml2YXRlIGdldFRpbWVvdXRTaWduYWwoZXhpc3RpbmdTaWduYWw/OiBBYm9ydFNpZ25hbCB8IG51bGwpOiBBYm9ydFNpZ25hbCB7XG4gICAgaWYgKGV4aXN0aW5nU2lnbmFsKSByZXR1cm4gZXhpc3RpbmdTaWduYWw7XG4gICAgcmV0dXJuIEFib3J0U2lnbmFsLnRpbWVvdXQodGhpcy5fY3VycmVudFRpbWVvdXRNcyk7XG4gIH1cblxuICAvKipcbiAgICogUmVjb3JkcyBhIHN1Y2Nlc3NmdWwgcmVxdWVzdCBhbmQgcmVzZXRzIHRoZSB0aW1lb3V0IGJhY2tvZmYuXG4gICAqL1xuICBwcml2YXRlIG9uUmVxdWVzdFN1Y2Nlc3MoKTogdm9pZCB7XG4gICAgdGhpcy5fY3VycmVudFRpbWVvdXRNcyA9IElOSVRJQUxfVElNRU9VVF9NUztcbiAgfVxuXG4gIC8qKlxuICAgKiBSZWNvcmRzIGEgZmFpbGVkIHJlcXVlc3QgYW5kIGluY3JlYXNlcyB0aGUgdGltZW91dCB2aWEgZXhwb25lbnRpYWwgYmFja29mZi5cbiAgICovXG4gIHByaXZhdGUgb25SZXF1ZXN0RmFpbHVyZSgpOiB2b2lkIHtcbiAgICB0aGlzLl9jdXJyZW50VGltZW91dE1zID0gTWF0aC5taW4odGhpcy5fY3VycmVudFRpbWVvdXRNcyAqIDIsIE1BWF9USU1FT1VUX01TKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBEZWZhdWx0IEhUVFAgY2xpZW50IGltcGxlbWVudGF0aW9uIHVzaW5nIGZldGNoICsgSlNPTiBwYXlsb2Fkcy5cbiAgICpcbiAgICogRWFjaCBmZXRjaCBjYWxsIGluY2x1ZGVzIGFuIEFib3J0U2lnbmFsLnRpbWVvdXQgdGhhdCBzdGFydHMgYXQgMyBzZWNvbmRzXG4gICAqIGFuZCBkb3VibGVzIG9uIGNvbnNlY3V0aXZlIGZhaWx1cmVzIHVwIHRvIDEwIHNlY29uZHMuXG4gICAqL1xuICBwcml2YXRlIGRlZmF1bHRIdHRwQ2xpZW50OiBIdHRwQ2xpZW50ID0ge1xuICAgIGdldDogYXN5bmMgPFQ+KHVybDogc3RyaW5nLCBvcHRpb25zPzogUmVxdWVzdEluaXQpOiBQcm9taXNlPFQ+ID0+IHtcbiAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZmV0Y2godXJsLCB7XG4gICAgICAgIC4uLm9wdGlvbnMsXG4gICAgICAgIGhlYWRlcnM6IHsgLi4udGhpcy5nZXRIZWFkZXJzKCksIC4uLm9wdGlvbnM/LmhlYWRlcnMgfSxcbiAgICAgICAgc2lnbmFsOiB0aGlzLmdldFRpbWVvdXRTaWduYWwob3B0aW9ucz8uc2lnbmFsKVxuICAgICAgfSk7XG4gICAgICBpZiAoIXJlc3BvbnNlLm9rKSB0aHJvdyByZXNwb25zZTtcbiAgICAgIHJldHVybiByZXNwb25zZS5qc29uKCkgYXMgUHJvbWlzZTxUPjtcbiAgICB9LFxuICAgIHBvc3Q6IGFzeW5jIDxUPih1cmw6IHN0cmluZywgYm9keTogdW5rbm93biwgb3B0aW9ucz86IFJlcXVlc3RJbml0KTogUHJvbWlzZTxUPiA9PiB7XG4gICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGZldGNoKHVybCwge1xuICAgICAgICAuLi5vcHRpb25zLFxuICAgICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgICAgaGVhZGVyczogeyAuLi50aGlzLmdldEhlYWRlcnMoKSwgLi4ub3B0aW9ucz8uaGVhZGVycyB9LFxuICAgICAgICBib2R5OiBib2R5ID8gSlNPTi5zdHJpbmdpZnkoYm9keSkgOiB1bmRlZmluZWQsXG4gICAgICAgIHNpZ25hbDogdGhpcy5nZXRUaW1lb3V0U2lnbmFsKG9wdGlvbnM/LnNpZ25hbClcbiAgICAgIH0pO1xuICAgICAgaWYgKCFyZXNwb25zZS5vaykgdGhyb3cgcmVzcG9uc2U7XG4gICAgICByZXR1cm4gcmVzcG9uc2UuanNvbigpIGFzIFByb21pc2U8VD47XG4gICAgfSxcbiAgICBwdXQ6IGFzeW5jIDxUPih1cmw6IHN0cmluZywgYm9keTogdW5rbm93biwgb3B0aW9ucz86IFJlcXVlc3RJbml0KTogUHJvbWlzZTxUPiA9PiB7XG4gICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGZldGNoKHVybCwge1xuICAgICAgICAuLi5vcHRpb25zLFxuICAgICAgICBtZXRob2Q6ICdQVVQnLFxuICAgICAgICBoZWFkZXJzOiB7IC4uLnRoaXMuZ2V0SGVhZGVycygpLCAuLi5vcHRpb25zPy5oZWFkZXJzIH0sXG4gICAgICAgIGJvZHk6IGJvZHkgPyBKU09OLnN0cmluZ2lmeShib2R5KSA6IHVuZGVmaW5lZCxcbiAgICAgICAgc2lnbmFsOiB0aGlzLmdldFRpbWVvdXRTaWduYWwob3B0aW9ucz8uc2lnbmFsKVxuICAgICAgfSk7XG4gICAgICBpZiAoIXJlc3BvbnNlLm9rKSB0aHJvdyByZXNwb25zZTtcbiAgICAgIHJldHVybiByZXNwb25zZS5qc29uKCkgYXMgUHJvbWlzZTxUPjtcbiAgICB9LFxuICAgIHBhdGNoOiBhc3luYyA8VD4odXJsOiBzdHJpbmcsIGJvZHk6IHVua25vd24sIG9wdGlvbnM/OiBSZXF1ZXN0SW5pdCk6IFByb21pc2U8VD4gPT4ge1xuICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBmZXRjaCh1cmwsIHtcbiAgICAgICAgLi4ub3B0aW9ucyxcbiAgICAgICAgbWV0aG9kOiAnUEFUQ0gnLFxuICAgICAgICBoZWFkZXJzOiB7IC4uLnRoaXMuZ2V0SGVhZGVycygpLCAuLi5vcHRpb25zPy5oZWFkZXJzIH0sXG4gICAgICAgIGJvZHk6IGJvZHkgPyBKU09OLnN0cmluZ2lmeShib2R5KSA6IHVuZGVmaW5lZCxcbiAgICAgICAgc2lnbmFsOiB0aGlzLmdldFRpbWVvdXRTaWduYWwob3B0aW9ucz8uc2lnbmFsKVxuICAgICAgfSk7XG4gICAgICBpZiAoIXJlc3BvbnNlLm9rKSB0aHJvdyByZXNwb25zZTtcbiAgICAgIHJldHVybiByZXNwb25zZS5qc29uKCkgYXMgUHJvbWlzZTxUPjtcbiAgICB9LFxuICAgIGRlbGV0ZTogYXN5bmMgKHVybDogc3RyaW5nLCBvcHRpb25zPzogUmVxdWVzdEluaXQpOiBQcm9taXNlPHZvaWQ+ID0+IHtcbiAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZmV0Y2godXJsLCB7XG4gICAgICAgIC4uLm9wdGlvbnMsXG4gICAgICAgIG1ldGhvZDogJ0RFTEVURScsXG4gICAgICAgIGhlYWRlcnM6IHsgLi4udGhpcy5nZXRIZWFkZXJzKCksIC4uLm9wdGlvbnM/LmhlYWRlcnMgfSxcbiAgICAgICAgc2lnbmFsOiB0aGlzLmdldFRpbWVvdXRTaWduYWwob3B0aW9ucz8uc2lnbmFsKVxuICAgICAgfSk7XG4gICAgICBpZiAoIXJlc3BvbnNlLm9rKSB0aHJvdyByZXNwb25zZTtcbiAgICB9XG4gIH07XG5cbiAgLyoqXG4gICAqIEdldHMgSFRUUCBoZWFkZXJzIGZvciBKU09OIEFQSSByZXF1ZXN0cy5cbiAgICpcbiAgICogQHJldHVybnMgSGVhZGVycyB3aXRoIEpTT04gY29udGVudCB0eXBlIGFuZCBvcHRpb25hbCBiZWFyZXIgdG9rZW4uXG4gICAqL1xuICBwcml2YXRlIGdldEhlYWRlcnMoKTogSGVhZGVyc0luaXQge1xuICAgIGNvbnN0IGhlYWRlcnM6IEhlYWRlcnNJbml0ID0geyAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nIH07XG4gICAgaWYgKHRoaXMub3B0aW9ucy5hY2Nlc3NUb2tlbikge1xuICAgICAgaGVhZGVyc1snQXV0aG9yaXphdGlvbiddID0gYEJlYXJlciAke3RoaXMub3B0aW9ucy5hY2Nlc3NUb2tlbn1gO1xuICAgIH1cbiAgICByZXR1cm4gaGVhZGVycztcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXRzIHRoZSBIVFRQIGNsaWVudCB0byB1c2UgZm9yIHJlcXVlc3RzLlxuICAgKlxuICAgKiBAcmV0dXJucyBJbmplY3RlZCBIVFRQIGNsaWVudCB3aGVuIHByb3ZpZGVkLCBvdGhlcndpc2UgdGhlIGRlZmF1bHQgZmV0Y2gtYmFzZWQgY2xpZW50LlxuICAgKi9cbiAgcHJpdmF0ZSBnZXRIdHRwQ2xpZW50KCk6IEh0dHBDbGllbnQge1xuICAgIHJldHVybiB0aGlzLl9odHRwQ2xpZW50ID8/IHRoaXMuZGVmYXVsdEh0dHBDbGllbnQ7XG4gIH1cblxuICAvKipcbiAgICogQnVpbGRzIGEgVVJMIHJlbGF0aXZlIHRvIHRoZSBjb25maWd1cmVkIGJhc2UgVVJMLlxuICAgKlxuICAgKiBVbmRlZmluZWQgYW5kIG51bGwgcXVlcnkgcGFyYW1zIGFyZSBvbWl0dGVkLiBWYWx1ZXMgYXJlIHN0cmluZ2lmaWVkLlxuICAgKlxuICAgKiBAcGFyYW0gcGF0aCAtIFJlbGF0aXZlIEFQSSBwYXRoIHRvIGFwcGVuZCB0byB0aGUgY29uZmlndXJlZCBiYXNlIFVSTC5cbiAgICogQHBhcmFtIHBhcmFtcyAtIE9wdGlvbmFsIHF1ZXJ5IHBhcmFtZXRlcnMgdG8gZW5jb2RlIG9udG8gdGhlIFVSTC5cbiAgICogQHJldHVybnMgRnVsbHktcXVhbGlmaWVkIHJlcXVlc3QgVVJMIHN0cmluZy5cbiAgICovXG4gIHByaXZhdGUgYnVpbGRVcmwocGF0aDogc3RyaW5nLCBwYXJhbXM/OiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPik6IHN0cmluZyB7XG4gICAgY29uc3QgdXJsID0gbmV3IFVSTChwYXRoLCB0aGlzLm9wdGlvbnMuYmFzZVVybCk7XG4gICAgaWYgKHBhcmFtcykge1xuICAgICAgZm9yIChjb25zdCBba2V5LCB2YWx1ZV0gb2YgT2JqZWN0LmVudHJpZXMocGFyYW1zKSkge1xuICAgICAgICBpZiAodmFsdWUgIT09IHVuZGVmaW5lZCAmJiB2YWx1ZSAhPT0gbnVsbCkge1xuICAgICAgICAgIHVybC5zZWFyY2hQYXJhbXMuc2V0KGtleSwgU3RyaW5nKHZhbHVlKSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHVybC50b1N0cmluZygpO1xuICB9XG5cbiAgLyoqXG4gICAqIFdyYXBzIGEgcmVxdWVzdCB3aXRoIGNvbnNpc3RlbnQgZXJyb3IgaGFuZGxpbmcuXG4gICAqXG4gICAqIEBwYXJhbSBmbiAtIEFzeW5jIHJlcXVlc3QgZnVuY3Rpb24gdG8gZXhlY3V0ZS5cbiAgICogQHJldHVybnMgVGhlIHJlc29sdmVkIHZhbHVlIGZyb20gdGhlIHJlcXVlc3QgZnVuY3Rpb24uXG4gICAqIEB0aHJvd3MgQXBpRXJyb3Igd2hlbiB0aGUgc2VydmVyIHJlc3BvbmRzIHdpdGggYSBub24tMnh4IHN0YXR1cy5cbiAgICogQHRocm93cyBOZXR3b3JrRXJyb3IgZm9yIG5ldHdvcmsgZmFpbHVyZXMgb3IgdW5leHBlY3RlZCBleGNlcHRpb25zLlxuICAgKi9cbiAgcHJpdmF0ZSBhc3luYyByZXF1ZXN0PFQ+KGZuOiAoKSA9PiBQcm9taXNlPFQ+KTogUHJvbWlzZTxUPiB7XG4gICAgbGV0IGxhc3RUaW1lb3V0RXJyb3I6IE5ldHdvcmtFcnJvciB8IHVuZGVmaW5lZDtcblxuICAgIGZvciAobGV0IGF0dGVtcHQgPSAwOyBhdHRlbXB0IDw9IE1BWF9USU1FT1VUX1JFVFJJRVM7IGF0dGVtcHQrKykge1xuICAgICAgdHJ5IHtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgZm4oKTtcbiAgICAgICAgdGhpcy5vblJlcXVlc3RTdWNjZXNzKCk7XG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICBpZiAoZXJyb3IgaW5zdGFuY2VvZiBSZXNwb25zZSkge1xuICAgICAgICAgIC8vIFNlcnZlciByZXNwb25kZWQgKGV2ZW4gd2l0aCBhbiBlcnJvciBzdGF0dXMpIC0gY29ubmVjdGlvbiBpcyBhbGl2ZSwgcmVzZXQgYmFja29mZlxuICAgICAgICAgIHRoaXMub25SZXF1ZXN0U3VjY2VzcygpO1xuICAgICAgICAgIGxldCBib2R5OiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPiA9IHt9O1xuICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICBib2R5ID0gYXdhaXQgZXJyb3IuanNvbigpO1xuICAgICAgICAgIH0gY2F0Y2ggKHBhcnNlRXJyb3IpIHtcbiAgICAgICAgICAgIC8vIFN5bnRheEVycm9yIGlzIGV4cGVjdGVkIHdoZW4gc2VydmVyIHJldHVybnMgbm9uLUpTT04gZXJyb3IgcmVzcG9uc2UgKGUuZy4sIEhUTUwgZXJyb3IgcGFnZSlcbiAgICAgICAgICAgIGlmICghKHBhcnNlRXJyb3IgaW5zdGFuY2VvZiBTeW50YXhFcnJvcikpIHtcbiAgICAgICAgICAgICAgY29uc29sZS53YXJuKCdbQ2FyZHNDbGllbnRdIFVuZXhwZWN0ZWQgZXJyb3IgcGFyc2luZyBlcnJvciByZXNwb25zZTonLCBwYXJzZUVycm9yKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgY29uc3QgbWVzc2FnZSA9XG4gICAgICAgICAgICAoYm9keVsnZXJyb3InXSBhcyBzdHJpbmcgfCB1bmRlZmluZWQpIHx8IChib2R5WydtZXNzYWdlJ10gYXMgc3RyaW5nIHwgdW5kZWZpbmVkKSB8fCBlcnJvci5zdGF0dXNUZXh0O1xuICAgICAgICAgIGNvbnN0IGNvZGUgPSAoYm9keVsnY29kZSddIGFzIHN0cmluZyB8IHVuZGVmaW5lZCkgfHwgU3RyaW5nKGVycm9yLnN0YXR1cyk7XG4gICAgICAgICAgY29uc3QgZmllbGRzID0gYm9keVsnZmllbGRzJ10gYXMgQXJyYXk8eyBmaWVsZDogc3RyaW5nOyBtZXNzYWdlOiBzdHJpbmcgfT4gfCB1bmRlZmluZWQ7XG4gICAgICAgICAgdGhyb3cgbmV3IEFwaUVycm9yKG1lc3NhZ2UsIGNvZGUsIGZpZWxkcyk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBOZXR3b3JrIG9yIHRpbWVvdXQgZmFpbHVyZSAtIGluY3JlYXNlIGJhY2tvZmYgZm9yIG5leHQgYXR0ZW1wdFxuICAgICAgICB0aGlzLm9uUmVxdWVzdEZhaWx1cmUoKTtcblxuICAgICAgICBpZiAoZXJyb3IgaW5zdGFuY2VvZiBET01FeGNlcHRpb24gJiYgZXJyb3IubmFtZSA9PT0gJ1RpbWVvdXRFcnJvcicpIHtcbiAgICAgICAgICBsYXN0VGltZW91dEVycm9yID0gbmV3IE5ldHdvcmtFcnJvcignUmVxdWVzdCB0aW1lZCBvdXQnLCBlcnJvcik7XG4gICAgICAgICAgLy8gUmV0cnkgb24gdGltZW91dCAtIG9uUmVxdWVzdEZhaWx1cmUoKSBhbHJlYWR5IGluY3JlYXNlZCBfY3VycmVudFRpbWVvdXRNc1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gTm9uLXRpbWVvdXQgbmV0d29yayBlcnJvcnMgKEROUyBmYWlsdXJlLCBjb25uZWN0aW9uIHJlZnVzZWQpIGFyZSBub3QgcmV0cmllZFxuICAgICAgICB0aHJvdyBuZXcgTmV0d29ya0Vycm9yKCdSZXF1ZXN0IGZhaWxlZCcsIGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvciA6IHVuZGVmaW5lZCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gQWxsIHJldHJ5IGF0dGVtcHRzIGV4aGF1c3RlZFxuICAgIHRocm93IGxhc3RUaW1lb3V0RXJyb3IhO1xuICB9XG5cbiAgLy8gLS0tIENhcmQgT3BlcmF0aW9ucyAtLS1cblxuICAvKipcbiAgICogTGlzdHMgY2FyZHMgd2l0aCBvcHRpb25hbCBmaWx0ZXJpbmcuXG4gICAqXG4gICAqIEBwYXJhbSBvcHRpb25zIC0gT3B0aW9uYWwgZmlsdGVyIGFuZCBwYWdpbmF0aW9uIG9wdGlvbnMuXG4gICAqIEByZXR1cm5zIFByb21pc2UgcmVzb2x2aW5nIHRvIG1hdGNoaW5nIGNhcmRzLlxuICAgKiBAdGhyb3dzIEFwaUVycm9yIHdoZW4gdGhlIHNlcnZlciByZXNwb25kcyB3aXRoIGFuIGVycm9yLlxuICAgKiBAdGhyb3dzIE5ldHdvcmtFcnJvciB3aGVuIHRoZSByZXF1ZXN0IGZhaWxzIHRvIHJlYWNoIHRoZSBzZXJ2ZXIuXG4gICAqL1xuICBhc3luYyBsaXN0Q2FyZHMob3B0aW9ucz86IExpc3RDYXJkc09wdGlvbnMpOiBQcm9taXNlPENhcmRbXT4ge1xuICAgIGNvbnN0IHVybFN0ciA9IHRoaXMuYnVpbGRVcmwoJy9jYXJkcycsIHtcbiAgICAgIHdvcmtzcGFjZVBhdGg6IHRoaXMub3B0aW9ucy53b3Jrc3BhY2VQYXRoLFxuICAgICAgc3RhdHVzOiBvcHRpb25zPy5zdGF0dXMsXG4gICAgICBzZWFyY2g6IG9wdGlvbnM/LnNlYXJjaCxcbiAgICAgIGxpbWl0OiBvcHRpb25zPy5saW1pdCxcbiAgICAgIG9mZnNldDogb3B0aW9ucz8ub2Zmc2V0XG4gICAgfSk7XG4gICAgY29uc3QgdXJsID0gbmV3IFVSTCh1cmxTdHIpO1xuICAgIGZvciAoY29uc3QgdCBvZiBvcHRpb25zPy50YWdzID8/IFtdKSB7XG4gICAgICB1cmwuc2VhcmNoUGFyYW1zLmFwcGVuZCgndGFnJywgdCk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLnJlcXVlc3QoKCkgPT4gdGhpcy5nZXRIdHRwQ2xpZW50KCkuZ2V0PENhcmRbXT4odXJsLnRvU3RyaW5nKCkpKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBMaXN0cyBjYXJkcyBhcyBsaWdodHdlaWdodCBzdW1tYXJpZXMgZm9yIGxpc3Qgdmlld3MuXG4gICAqXG4gICAqIFJldHVybnMgcHJlLWZsYXR0ZW5lZCBmaWVsZHMgc3VpdGFibGUgZm9yIGRpcmVjdCB1c2UgaW4gbGlzdCByZW5kZXJpbmcsXG4gICAqIG9taXR0aW5nIGhlYXZ5d2VpZ2h0IGZpZWxkcyBsaWtlIGBwbGFuQ29udGVudGAgYW5kIGByZXBvc2l0b3J5UGF0aGAuXG4gICAqXG4gICAqIEB0ZW1wbGF0ZSBUIC0gVGhlIGV4cGVjdGVkIHN1bW1hcnkgc2hhcGUgKGRlZmF1bHQgYFJlY29yZDxzdHJpbmcsIHVua25vd24+YCkuXG4gICAqIEByZXR1cm5zIFByb21pc2UgcmVzb2x2aW5nIHRvIGNhcmQgc3VtbWFyaWVzLlxuICAgKiBAdGhyb3dzIEFwaUVycm9yIHdoZW4gdGhlIHNlcnZlciByZXNwb25kcyB3aXRoIGFuIGVycm9yLlxuICAgKiBAdGhyb3dzIE5ldHdvcmtFcnJvciB3aGVuIHRoZSByZXF1ZXN0IGZhaWxzIHRvIHJlYWNoIHRoZSBzZXJ2ZXIuXG4gICAqL1xuICBhc3luYyBsaXN0Q2FyZFN1bW1hcmllczxUID0gUmVjb3JkPHN0cmluZywgdW5rbm93bj4+KCk6IFByb21pc2U8VFtdPiB7XG4gICAgY29uc3QgdXJsID0gdGhpcy5idWlsZFVybCgnL2NhcmRzL2xpc3QnLCB7XG4gICAgICB3b3Jrc3BhY2VQYXRoOiB0aGlzLm9wdGlvbnMud29ya3NwYWNlUGF0aFxuICAgIH0pO1xuICAgIHJldHVybiB0aGlzLnJlcXVlc3QoKCkgPT4gdGhpcy5nZXRIdHRwQ2xpZW50KCkuZ2V0PFRbXT4odXJsKSk7XG4gIH1cblxuICAvKipcbiAgICogR2V0cyBhIHNpbmdsZSBjYXJkIGJ5IGlkLlxuICAgKlxuICAgKiBAcGFyYW0gY2FyZElkIC0gVGhlIGlkIG9mIHRoZSBjYXJkIHRvIHJldHJpZXZlLlxuICAgKiBAcmV0dXJucyBQcm9taXNlIHJlc29sdmluZyB0byB0aGUgY2FyZC5cbiAgICogQHRocm93cyBBcGlFcnJvciB3aGVuIHRoZSBzZXJ2ZXIgcmVzcG9uZHMgd2l0aCBhbiBlcnJvci5cbiAgICogQHRocm93cyBOZXR3b3JrRXJyb3Igd2hlbiB0aGUgcmVxdWVzdCBmYWlscyB0byByZWFjaCB0aGUgc2VydmVyLlxuICAgKi9cbiAgYXN5bmMgZ2V0Q2FyZChjYXJkSWQ6IHN0cmluZyk6IFByb21pc2U8Q2FyZD4ge1xuICAgIGNvbnN0IHVybCA9IHRoaXMuYnVpbGRVcmwoYC9jYXJkcy8ke2NhcmRJZH1gLCB7XG4gICAgICB3b3Jrc3BhY2VQYXRoOiB0aGlzLm9wdGlvbnMud29ya3NwYWNlUGF0aFxuICAgIH0pO1xuICAgIHJldHVybiB0aGlzLnJlcXVlc3QoKCkgPT4gdGhpcy5nZXRIdHRwQ2xpZW50KCkuZ2V0PENhcmQ+KHVybCkpO1xuICB9XG5cbiAgLyoqXG4gICAqIENyZWF0ZXMgYSBuZXcgY2FyZC5cbiAgICpcbiAgICogQHBhcmFtIGRhdGEgLSBDYXJkIGNyZWF0aW9uIHBheWxvYWQuXG4gICAqIEByZXR1cm5zIFByb21pc2UgcmVzb2x2aW5nIHRvIHRoZSBjcmVhdGVkIGNhcmQuXG4gICAqIEB0aHJvd3MgQXBpRXJyb3Igd2hlbiB0aGUgc2VydmVyIHJlamVjdHMgdGhlIHBheWxvYWQuXG4gICAqIEB0aHJvd3MgTmV0d29ya0Vycm9yIHdoZW4gdGhlIHJlcXVlc3QgZmFpbHMgdG8gcmVhY2ggdGhlIHNlcnZlci5cbiAgICovXG4gIGFzeW5jIGNyZWF0ZUNhcmQoZGF0YTogQ2FyZENyZWF0ZURhdGEpOiBQcm9taXNlPENhcmQ+IHtcbiAgICBjb25zdCB1cmwgPSB0aGlzLmJ1aWxkVXJsKCcvY2FyZHMnKTtcbiAgICBjb25zdCBib2R5ID0ge1xuICAgICAgLi4uZGF0YSxcbiAgICAgIHdvcmtzcGFjZVBhdGg6IHRoaXMub3B0aW9ucy53b3Jrc3BhY2VQYXRoXG4gICAgfTtcbiAgICByZXR1cm4gdGhpcy5yZXF1ZXN0KCgpID0+IHRoaXMuZ2V0SHR0cENsaWVudCgpLnBvc3Q8Q2FyZD4odXJsLCBib2R5KSk7XG4gIH1cblxuICAvKipcbiAgICogVXBkYXRlcyBhbiBleGlzdGluZyBjYXJkLlxuICAgKlxuICAgKiBAcGFyYW0gY2FyZElkIC0gVGhlIGlkIG9mIHRoZSBjYXJkIHRvIHVwZGF0ZS5cbiAgICogQHBhcmFtIGRhdGEgLSBUaGUgZmllbGRzIHRvIHVwZGF0ZS5cbiAgICogQHJldHVybnMgUHJvbWlzZSByZXNvbHZpbmcgdG8gdGhlIHVwZGF0ZWQgY2FyZC5cbiAgICogQHRocm93cyBBcGlFcnJvciB3aGVuIHRoZSBzZXJ2ZXIgcmVqZWN0cyB0aGUgdXBkYXRlLlxuICAgKiBAdGhyb3dzIE5ldHdvcmtFcnJvciB3aGVuIHRoZSByZXF1ZXN0IGZhaWxzIHRvIHJlYWNoIHRoZSBzZXJ2ZXIuXG4gICAqIEBkZXByZWNhdGVkIFVzZSBkaXJlY3QgZ2l0IG9wZXJhdGlvbnMgaW5zdGVhZC4gVGhpcyBlbmRwb2ludCB3aWxsIGJlIHJlbW92ZWQuXG4gICAqL1xuICBhc3luYyB1cGRhdGVDYXJkKGNhcmRJZDogc3RyaW5nLCBkYXRhOiBDYXJkVXBkYXRlRGF0YSk6IFByb21pc2U8Q2FyZD4ge1xuICAgIGNvbnN0IHVybCA9IHRoaXMuYnVpbGRVcmwoYC9jYXJkcy8ke2NhcmRJZH1gKTtcbiAgICByZXR1cm4gdGhpcy5yZXF1ZXN0KCgpID0+IHRoaXMuZ2V0SHR0cENsaWVudCgpLnBhdGNoPENhcmQ+KHVybCwgZGF0YSkpO1xuICB9XG5cbiAgLyoqXG4gICAqIERlbGV0ZXMgYSBjYXJkLlxuICAgKlxuICAgKiBAcGFyYW0gY2FyZElkIC0gVGhlIGlkIG9mIHRoZSBjYXJkIHRvIGRlbGV0ZS5cbiAgICogQHJldHVybnMgUHJvbWlzZSByZXNvbHZpbmcgd2hlbiBkZWxldGlvbiBpcyBjb21wbGV0ZS5cbiAgICogQHRocm93cyBBcGlFcnJvciB3aGVuIHRoZSBzZXJ2ZXIgcmVqZWN0cyB0aGUgZGVsZXRlLlxuICAgKiBAdGhyb3dzIE5ldHdvcmtFcnJvciB3aGVuIHRoZSByZXF1ZXN0IGZhaWxzIHRvIHJlYWNoIHRoZSBzZXJ2ZXIuXG4gICAqIEBkZXByZWNhdGVkIFVzZSBkaXJlY3QgZ2l0IG9wZXJhdGlvbnMgaW5zdGVhZC4gVGhpcyBlbmRwb2ludCB3aWxsIGJlIHJlbW92ZWQuXG4gICAqL1xuICBhc3luYyBkZWxldGVDYXJkKGNhcmRJZDogc3RyaW5nKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc3QgdXJsID0gdGhpcy5idWlsZFVybChgL2NhcmRzLyR7Y2FyZElkfWApO1xuICAgIHJldHVybiB0aGlzLnJlcXVlc3QoKCkgPT4gdGhpcy5nZXRIdHRwQ2xpZW50KCkuZGVsZXRlKHVybCkpO1xuICB9XG5cbiAgLy8gLS0tIENvbW1lbnQgT3BlcmF0aW9ucyAtLS1cblxuICAvKipcbiAgICogR2V0cyBhbGwgY29tbWVudHMgZm9yIGEgY2FyZC5cbiAgICpcbiAgICogQHBhcmFtIGNhcmRJZCAtIElkZW50aWZpZXIgb2YgdGhlIHRhcmdldCBjYXJkIGZvciB0aGlzIHJlcXVlc3QuXG4gICAqIEByZXR1cm5zIFByb21pc2UgcmVzb2x2aW5nIHRvIHRoZSBjb21tZW50IGxpc3QuXG4gICAqIEB0aHJvd3MgQXBpRXJyb3Igd2hlbiB0aGUgc2VydmVyIHJlc3BvbmRzIHdpdGggYW4gZXJyb3IuXG4gICAqIEB0aHJvd3MgTmV0d29ya0Vycm9yIHdoZW4gdGhlIHJlcXVlc3QgZmFpbHMgdG8gcmVhY2ggdGhlIHNlcnZlci5cbiAgICovXG4gIGFzeW5jIGdldENvbW1lbnRzKGNhcmRJZDogc3RyaW5nKTogUHJvbWlzZTxDb21tZW50W10+IHtcbiAgICBjb25zdCB1cmwgPSB0aGlzLmJ1aWxkVXJsKGAvY2FyZHMvJHtjYXJkSWR9L2NvbW1lbnRzYCk7XG4gICAgcmV0dXJuIHRoaXMucmVxdWVzdCgoKSA9PiB0aGlzLmdldEh0dHBDbGllbnQoKS5nZXQ8Q29tbWVudFtdPih1cmwpKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXRzIGEgc2luZ2xlIGNvbW1lbnQgYnkgaWQuXG4gICAqXG4gICAqIEBwYXJhbSBjYXJkSWQgLSBJZGVudGlmaWVyIG9mIHRoZSBjYXJkIHRoYXQgb3ducyB0aGUgcmVxdWVzdGVkIGNvbW1lbnQuXG4gICAqIEBwYXJhbSBjb21tZW50SWQgLSBJZGVudGlmaWVyIG9mIHRoZSBjb21tZW50IHRvIHJldHJpZXZlLlxuICAgKiBAcmV0dXJucyBQcm9taXNlIHJlc29sdmluZyB0byB0aGUgY29tbWVudC5cbiAgICogQHRocm93cyBBcGlFcnJvciB3aGVuIHRoZSBzZXJ2ZXIgcmVzcG9uZHMgd2l0aCBhbiBlcnJvci5cbiAgICogQHRocm93cyBOZXR3b3JrRXJyb3Igd2hlbiB0aGUgcmVxdWVzdCBmYWlscyB0byByZWFjaCB0aGUgc2VydmVyLlxuICAgKi9cbiAgYXN5bmMgZ2V0Q29tbWVudChjYXJkSWQ6IHN0cmluZywgY29tbWVudElkOiBzdHJpbmcpOiBQcm9taXNlPENvbW1lbnQ+IHtcbiAgICBjb25zdCB1cmwgPSB0aGlzLmJ1aWxkVXJsKGAvY2FyZHMvJHtjYXJkSWR9L2NvbW1lbnRzLyR7Y29tbWVudElkfWApO1xuICAgIHJldHVybiB0aGlzLnJlcXVlc3QoKCkgPT4gdGhpcy5nZXRIdHRwQ2xpZW50KCkuZ2V0PENvbW1lbnQ+KHVybCkpO1xuICB9XG5cbiAgLyoqXG4gICAqIENyZWF0ZXMgYSBuZXcgY29tbWVudCBvbiBhIGNhcmQuXG4gICAqXG4gICAqIEBwYXJhbSBjYXJkSWQgLSBJZGVudGlmaWVyIG9mIHRoZSBjYXJkIHRoYXQgd2lsbCByZWNlaXZlIHRoZSBuZXcgY29tbWVudC5cbiAgICogQHBhcmFtIGRhdGEgLSBDb21tZW50IGNyZWF0aW9uIHBheWxvYWQuXG4gICAqIEByZXR1cm5zIFByb21pc2UgcmVzb2x2aW5nIHRvIHRoZSBjcmVhdGVkIGNvbW1lbnQuXG4gICAqIEB0aHJvd3MgQXBpRXJyb3Igd2hlbiB0aGUgc2VydmVyIHJlamVjdHMgdGhlIHBheWxvYWQuXG4gICAqIEB0aHJvd3MgTmV0d29ya0Vycm9yIHdoZW4gdGhlIHJlcXVlc3QgZmFpbHMgdG8gcmVhY2ggdGhlIHNlcnZlci5cbiAgICogQGRlcHJlY2F0ZWQgVXNlIGRpcmVjdCBnaXQgb3BlcmF0aW9ucyBpbnN0ZWFkLiBUaGlzIGVuZHBvaW50IHdpbGwgYmUgcmVtb3ZlZC5cbiAgICovXG4gIGFzeW5jIGNyZWF0ZUNvbW1lbnQoY2FyZElkOiBzdHJpbmcsIGRhdGE6IENvbW1lbnRDcmVhdGVEYXRhKTogUHJvbWlzZTxDb21tZW50PiB7XG4gICAgY29uc3QgdXJsID0gdGhpcy5idWlsZFVybChgL2NhcmRzLyR7Y2FyZElkfS9jb21tZW50c2ApO1xuICAgIHJldHVybiB0aGlzLnJlcXVlc3QoKCkgPT4gdGhpcy5nZXRIdHRwQ2xpZW50KCkucG9zdDxDb21tZW50Pih1cmwsIGRhdGEpKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBVcGRhdGVzIGFuIGV4aXN0aW5nIGNvbW1lbnQuXG4gICAqXG4gICAqIEBwYXJhbSBjYXJkSWQgLSBJZGVudGlmaWVyIG9mIHRoZSBjYXJkIHRoYXQgb3ducyB0aGUgY29tbWVudC5cbiAgICogQHBhcmFtIGNvbW1lbnRJZCAtIElkZW50aWZpZXIgb2YgdGhlIGNvbW1lbnQgdG8gdXBkYXRlLlxuICAgKiBAcGFyYW0gZGF0YSAtIENvbW1lbnQgdXBkYXRlIHBheWxvYWQuXG4gICAqIEByZXR1cm5zIFByb21pc2UgcmVzb2x2aW5nIHRvIHRoZSB1cGRhdGVkIGNvbW1lbnQuXG4gICAqIEB0aHJvd3MgQXBpRXJyb3Igd2hlbiB0aGUgc2VydmVyIHJlamVjdHMgdGhlIHVwZGF0ZS5cbiAgICogQHRocm93cyBOZXR3b3JrRXJyb3Igd2hlbiB0aGUgcmVxdWVzdCBmYWlscyB0byByZWFjaCB0aGUgc2VydmVyLlxuICAgKiBAZGVwcmVjYXRlZCBVc2UgZGlyZWN0IGdpdCBvcGVyYXRpb25zIGluc3RlYWQuIFRoaXMgZW5kcG9pbnQgd2lsbCBiZSByZW1vdmVkLlxuICAgKi9cbiAgYXN5bmMgdXBkYXRlQ29tbWVudChjYXJkSWQ6IHN0cmluZywgY29tbWVudElkOiBzdHJpbmcsIGRhdGE6IENvbW1lbnRVcGRhdGVEYXRhKTogUHJvbWlzZTxDb21tZW50PiB7XG4gICAgY29uc3QgdXJsID0gdGhpcy5idWlsZFVybChgL2NhcmRzLyR7Y2FyZElkfS9jb21tZW50cy8ke2NvbW1lbnRJZH1gKTtcbiAgICByZXR1cm4gdGhpcy5yZXF1ZXN0KCgpID0+IHRoaXMuZ2V0SHR0cENsaWVudCgpLnBhdGNoPENvbW1lbnQ+KHVybCwgZGF0YSkpO1xuICB9XG5cbiAgLyoqXG4gICAqIERlbGV0ZXMgYSBjb21tZW50LlxuICAgKlxuICAgKiBAcGFyYW0gY2FyZElkIC0gSWRlbnRpZmllciBvZiB0aGUgY2FyZCB0aGF0IG93bnMgdGhlIGNvbW1lbnQuXG4gICAqIEBwYXJhbSBjb21tZW50SWQgLSBJZGVudGlmaWVyIG9mIHRoZSBjb21tZW50IHRvIHJlbW92ZS5cbiAgICogQHJldHVybnMgUHJvbWlzZSByZXNvbHZpbmcgd2hlbiBkZWxldGlvbiBpcyBjb21wbGV0ZS5cbiAgICogQHRocm93cyBBcGlFcnJvciB3aGVuIHRoZSBzZXJ2ZXIgcmVqZWN0cyB0aGUgZGVsZXRlLlxuICAgKiBAdGhyb3dzIE5ldHdvcmtFcnJvciB3aGVuIHRoZSByZXF1ZXN0IGZhaWxzIHRvIHJlYWNoIHRoZSBzZXJ2ZXIuXG4gICAqIEBkZXByZWNhdGVkIFVzZSBkaXJlY3QgZ2l0IG9wZXJhdGlvbnMgaW5zdGVhZC4gVGhpcyBlbmRwb2ludCB3aWxsIGJlIHJlbW92ZWQuXG4gICAqL1xuICBhc3luYyBkZWxldGVDb21tZW50KGNhcmRJZDogc3RyaW5nLCBjb21tZW50SWQ6IHN0cmluZyk6IFByb21pc2U8dm9pZD4ge1xuICAgIGNvbnN0IHVybCA9IHRoaXMuYnVpbGRVcmwoYC9jYXJkcy8ke2NhcmRJZH0vY29tbWVudHMvJHtjb21tZW50SWR9YCk7XG4gICAgcmV0dXJuIHRoaXMucmVxdWVzdCgoKSA9PiB0aGlzLmdldEh0dHBDbGllbnQoKS5kZWxldGUodXJsKSk7XG4gIH1cblxuICAvLyAtLS0gQXR0YWNobWVudCBPcGVyYXRpb25zIC0tLVxuXG4gIC8qKlxuICAgKiBVcGxvYWRzIGFuIGF0dGFjaG1lbnQgdG8gYSBjYXJkIHVzaW5nIGJpbmFyeSBQVVQuXG4gICAqXG4gICAqIFRoaXMgaXMgdGhlIHByZWZlcnJlZCBtZXRob2QgLSBzZW5kcyByYXcgYmluYXJ5IGRhdGEgZGlyZWN0bHkgd2l0aG91dFxuICAgKiBiYXNlNjQgZW5jb2RpbmcsIHJlc3VsdGluZyBpbiAzMyUgc21hbGxlciBwYXlsb2Fkcy5cbiAgICpcbiAgICogQHBhcmFtIGNhcmRJZCAtIElkZW50aWZpZXIgb2YgdGhlIGNhcmQgdGhhdCB3aWxsIHJlY2VpdmUgdGhlIGF0dGFjaG1lbnQuXG4gICAqIEBwYXJhbSBuYW1lIC0gRmlsZSBuYW1lIGluY2x1ZGluZyBleHRlbnNpb24uXG4gICAqIEBwYXJhbSBkYXRhIC0gQmluYXJ5IGRhdGEgYXMgQmxvYiwgQXJyYXlCdWZmZXIsIG9yIGJhc2U2NCBzdHJpbmcuXG4gICAqIEByZXR1cm5zIFByb21pc2UgcmVzb2x2aW5nIHRvIGF0dGFjaG1lbnQgbWV0YWRhdGEuXG4gICAqIEB0aHJvd3MgQXBpRXJyb3Igd2hlbiB0aGUgc2VydmVyIHJlamVjdHMgdGhlIHVwbG9hZC5cbiAgICogQHRocm93cyBOZXR3b3JrRXJyb3Igd2hlbiB0aGUgcmVxdWVzdCBmYWlscyB0byByZWFjaCB0aGUgc2VydmVyLlxuICAgKi9cbiAgYXN5bmMgdXBsb2FkQXR0YWNobWVudChjYXJkSWQ6IHN0cmluZywgbmFtZTogc3RyaW5nLCBkYXRhOiBCbG9iIHwgQXJyYXlCdWZmZXIgfCBzdHJpbmcpOiBQcm9taXNlPEF0dGFjaG1lbnRSZXNwb25zZT4ge1xuICAgIGNvbnN0IHVybCA9IHRoaXMuYnVpbGRVcmwoYC9jYXJkcy8ke2NhcmRJZH0vYXR0YWNobWVudHMvJHtlbmNvZGVVUklDb21wb25lbnQobmFtZSl9YCk7XG5cbiAgICAvLyBDb252ZXJ0IGRhdGEgdG8gQmxvYiBmb3IgZmV0Y2ggYm9keVxuICAgIGxldCBib2R5OiBCbG9iO1xuICAgIGlmIChkYXRhIGluc3RhbmNlb2YgQmxvYikge1xuICAgICAgYm9keSA9IGRhdGE7XG4gICAgfSBlbHNlIGlmIChkYXRhIGluc3RhbmNlb2YgQXJyYXlCdWZmZXIpIHtcbiAgICAgIGJvZHkgPSBuZXcgQmxvYihbZGF0YV0pO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBiYXNlNjQgc3RyaW5nIC0gZGVjb2RlIHRvIGJpbmFyeVxuICAgICAgY29uc3QgYmluYXJ5U3RyaW5nID0gYXRvYihkYXRhKTtcbiAgICAgIGNvbnN0IGJ5dGVzID0gbmV3IFVpbnQ4QXJyYXkoYmluYXJ5U3RyaW5nLmxlbmd0aCk7XG4gICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGJpbmFyeVN0cmluZy5sZW5ndGg7IGkrKykge1xuICAgICAgICBieXRlc1tpXSA9IGJpbmFyeVN0cmluZy5jaGFyQ29kZUF0KGkpO1xuICAgICAgfVxuICAgICAgYm9keSA9IG5ldyBCbG9iKFtieXRlc10pO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzLnJlcXVlc3QoYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBmZXRjaCh1cmwsIHtcbiAgICAgICAgbWV0aG9kOiAnUFVUJyxcbiAgICAgICAgaGVhZGVyczoge1xuICAgICAgICAgIC4uLnRoaXMuZ2V0SGVhZGVycygpLFxuICAgICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vb2N0ZXQtc3RyZWFtJ1xuICAgICAgICB9LFxuICAgICAgICBib2R5LFxuICAgICAgICBzaWduYWw6IHRoaXMuZ2V0VGltZW91dFNpZ25hbCgpXG4gICAgICB9KTtcbiAgICAgIGlmICghcmVzcG9uc2Uub2spIHRocm93IHJlc3BvbnNlO1xuICAgICAgcmV0dXJuIHJlc3BvbnNlLmpzb24oKSBhcyBQcm9taXNlPEF0dGFjaG1lbnRSZXNwb25zZT47XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogRG93bmxvYWRzIGFuIGF0dGFjaG1lbnQgYXMgYSBCbG9iLlxuICAgKlxuICAgKiBUaGlzIG1ldGhvZCB1c2VzIGBmZXRjaGAgZGlyZWN0bHkgc28gYmluYXJ5IGRhdGEgaXMgcHJlc2VydmVkLlxuICAgKlxuICAgKiBAcGFyYW0gY2FyZElkIC0gSWRlbnRpZmllciBvZiB0aGUgY2FyZCB0aGF0IG93bnMgdGhlIGF0dGFjaG1lbnQuXG4gICAqIEBwYXJhbSBhdHRhY2htZW50SWQgLSBJZGVudGlmaWVyIG9mIHRoZSBhdHRhY2htZW50IGJsb2IgdG8gZG93bmxvYWQuXG4gICAqIEByZXR1cm5zIFByb21pc2UgcmVzb2x2aW5nIHRvIGFuIGF0dGFjaG1lbnQgQmxvYi5cbiAgICogQHRocm93cyBBcGlFcnJvciB3aGVuIHRoZSBzZXJ2ZXIgcmVzcG9uZHMgd2l0aCBhbiBlcnJvci5cbiAgICogQHRocm93cyBOZXR3b3JrRXJyb3Igd2hlbiB0aGUgcmVxdWVzdCBmYWlscyB0byByZWFjaCB0aGUgc2VydmVyLlxuICAgKi9cbiAgYXN5bmMgZ2V0QXR0YWNobWVudChjYXJkSWQ6IHN0cmluZywgYXR0YWNobWVudElkOiBzdHJpbmcpOiBQcm9taXNlPEJsb2I+IHtcbiAgICBjb25zdCB1cmwgPSB0aGlzLmJ1aWxkVXJsKGAvY2FyZHMvJHtjYXJkSWR9L2F0dGFjaG1lbnRzLyR7YXR0YWNobWVudElkfWApO1xuICAgIHJldHVybiB0aGlzLnJlcXVlc3QoYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBmZXRjaCh1cmwsIHtcbiAgICAgICAgaGVhZGVyczogdGhpcy5nZXRIZWFkZXJzKCksXG4gICAgICAgIHNpZ25hbDogdGhpcy5nZXRUaW1lb3V0U2lnbmFsKClcbiAgICAgIH0pO1xuICAgICAgaWYgKCFyZXNwb25zZS5vaykgdGhyb3cgcmVzcG9uc2U7XG4gICAgICByZXR1cm4gcmVzcG9uc2UuYmxvYigpO1xuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIExpc3RzIGF0dGFjaG1lbnRzIGZvciBhIGNhcmQuXG4gICAqXG4gICAqIEBwYXJhbSBjYXJkSWQgLSBJZGVudGlmaWVyIG9mIHRoZSBjYXJkIHdob3NlIGF0dGFjaG1lbnRzIHNob3VsZCBiZSBsaXN0ZWQuXG4gICAqIEByZXR1cm5zIFByb21pc2UgcmVzb2x2aW5nIHRvIGF0dGFjaG1lbnQgbWV0YWRhdGEuXG4gICAqIEB0aHJvd3MgQXBpRXJyb3Igd2hlbiB0aGUgc2VydmVyIHJlc3BvbmRzIHdpdGggYW4gZXJyb3IuXG4gICAqIEB0aHJvd3MgTmV0d29ya0Vycm9yIHdoZW4gdGhlIHJlcXVlc3QgZmFpbHMgdG8gcmVhY2ggdGhlIHNlcnZlci5cbiAgICovXG4gIGFzeW5jIGxpc3RBdHRhY2htZW50cyhjYXJkSWQ6IHN0cmluZyk6IFByb21pc2U8QXR0YWNobWVudFJlc3BvbnNlW10+IHtcbiAgICBjb25zdCB1cmwgPSB0aGlzLmJ1aWxkVXJsKGAvY2FyZHMvJHtjYXJkSWR9L2F0dGFjaG1lbnRzYCk7XG4gICAgcmV0dXJuIHRoaXMucmVxdWVzdCgoKSA9PiB0aGlzLmdldEh0dHBDbGllbnQoKS5nZXQ8QXR0YWNobWVudFJlc3BvbnNlW10+KHVybCkpO1xuICB9XG5cbiAgLy8gLS0tIFRpbWVsaW5lIE9wZXJhdGlvbnMgLS0tXG5cbiAgLyoqXG4gICAqIEdldHMgdGltZWxpbmUgZW50cmllcyBmb3IgYSBjYXJkIHdpdGggb3B0aW9uYWwgcGFnaW5hdGlvbi5cbiAgICpcbiAgICogQHBhcmFtIGNhcmRJZCAtIElkZW50aWZpZXIgb2YgdGhlIGNhcmQgd2hvc2UgdGltZWxpbmUgZW50cmllcyBzaG91bGQgYmUgcmV0dXJuZWQuXG4gICAqIEBwYXJhbSBvcHRpb25zIC0gT3B0aW9uYWwgcGFnaW5hdGlvbiBjb250cm9scy5cbiAgICogQHJldHVybnMgUHJvbWlzZSByZXNvbHZpbmcgdG8gdGltZWxpbmUgZW50cmllcy5cbiAgICogQHRocm93cyBBcGlFcnJvciB3aGVuIHRoZSBzZXJ2ZXIgcmVzcG9uZHMgd2l0aCBhbiBlcnJvci5cbiAgICogQHRocm93cyBOZXR3b3JrRXJyb3Igd2hlbiB0aGUgcmVxdWVzdCBmYWlscyB0byByZWFjaCB0aGUgc2VydmVyLlxuICAgKi9cbiAgYXN5bmMgZ2V0VGltZWxpbmUoY2FyZElkOiBzdHJpbmcsIG9wdGlvbnM/OiBUaW1lbGluZU9wdGlvbnMpOiBQcm9taXNlPFRpbWVsaW5lSXRlbVtdPiB7XG4gICAgY29uc3QgdXJsID0gdGhpcy5idWlsZFVybChgL2NhcmRzLyR7Y2FyZElkfS90aW1lbGluZWAsIHtcbiAgICAgIGJlZm9yZTogb3B0aW9ucz8uYmVmb3JlLFxuICAgICAgbGltaXQ6IG9wdGlvbnM/LmxpbWl0XG4gICAgfSk7XG4gICAgcmV0dXJuIHRoaXMucmVxdWVzdCgoKSA9PiB0aGlzLmdldEh0dHBDbGllbnQoKS5nZXQ8VGltZWxpbmVJdGVtW10+KHVybCkpO1xuICB9XG5cbiAgLy8gLS0tIFBsYW4gT3BlcmF0aW9ucyAtLS1cblxuICAvKipcbiAgICogR2V0cyB0aGUgcGxhbiBkb2N1bWVudCBmb3IgYSBjYXJkIGFzIG1hcmtkb3duLlxuICAgKlxuICAgKiBAcGFyYW0gY2FyZElkIC0gSWRlbnRpZmllciBvZiB0aGUgY2FyZCB3aG9zZSBwbGFuIG1hcmtkb3duIHNob3VsZCBiZSByZXR1cm5lZC5cbiAgICogQHJldHVybnMgUHJvbWlzZSByZXNvbHZpbmcgdG8gcGxhbiBtYXJrZG93bi5cbiAgICogQHRocm93cyBBcGlFcnJvciB3aGVuIHRoZSBzZXJ2ZXIgcmVzcG9uZHMgd2l0aCBhbiBlcnJvci5cbiAgICogQHRocm93cyBOZXR3b3JrRXJyb3Igd2hlbiB0aGUgcmVxdWVzdCBmYWlscyB0byByZWFjaCB0aGUgc2VydmVyLlxuICAgKi9cbiAgYXN5bmMgZ2V0UGxhbihjYXJkSWQ6IHN0cmluZyk6IFByb21pc2U8c3RyaW5nPiB7XG4gICAgY29uc3QgdXJsID0gdGhpcy5idWlsZFVybChgL2NhcmRzLyR7Y2FyZElkfS9wbGFuYCk7XG4gICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCB0aGlzLnJlcXVlc3QoKCkgPT4gdGhpcy5nZXRIdHRwQ2xpZW50KCkuZ2V0PHsgY29udGVudDogc3RyaW5nIH0+KHVybCkpO1xuICAgIHJldHVybiByZXNwb25zZS5jb250ZW50O1xuICB9XG5cbiAgLyoqXG4gICAqIFVwZGF0ZXMgdGhlIHBsYW4gZG9jdW1lbnQgZm9yIGEgY2FyZC5cbiAgICpcbiAgICogQHBhcmFtIGNhcmRJZCAtIElkZW50aWZpZXIgb2YgdGhlIGNhcmQgd2hvc2UgcGxhbiBtYXJrZG93biBzaG91bGQgYmUgdXBkYXRlZC5cbiAgICogQHBhcmFtIGNvbnRlbnQgLSBQbGFuIG1hcmtkb3duIGNvbnRlbnQuXG4gICAqIEByZXR1cm5zIFByb21pc2UgcmVzb2x2aW5nIHdoZW4gdGhlIHBsYW4gaXMgc2F2ZWQuXG4gICAqIEB0aHJvd3MgQXBpRXJyb3Igd2hlbiB0aGUgc2VydmVyIHJlamVjdHMgdGhlIHVwZGF0ZS5cbiAgICogQHRocm93cyBOZXR3b3JrRXJyb3Igd2hlbiB0aGUgcmVxdWVzdCBmYWlscyB0byByZWFjaCB0aGUgc2VydmVyLlxuICAgKiBAZGVwcmVjYXRlZCBVc2UgZGlyZWN0IGdpdCBvcGVyYXRpb25zIGluc3RlYWQuIFRoaXMgZW5kcG9pbnQgd2lsbCBiZSByZW1vdmVkLlxuICAgKi9cbiAgYXN5bmMgdXBkYXRlUGxhbihjYXJkSWQ6IHN0cmluZywgY29udGVudDogc3RyaW5nKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc3QgdXJsID0gdGhpcy5idWlsZFVybChgL2NhcmRzLyR7Y2FyZElkfS9wbGFuYCk7XG4gICAgcmV0dXJuIHRoaXMucmVxdWVzdCgoKSA9PiB0aGlzLmdldEh0dHBDbGllbnQoKS5wdXQ8dm9pZD4odXJsLCBjb250ZW50KSk7XG4gIH1cblxuICAvLyAtLS0gR2F0ZSBPcGVyYXRpb25zIC0tLVxuXG4gIC8qKlxuICAgKiBBcHByb3ZlcyBhIGdhdGUgZm9yIGEgY2FyZC5cbiAgICpcbiAgICogQHBhcmFtIGNhcmRJZCAtIElkZW50aWZpZXIgb2YgdGhlIGNhcmQgd2hvc2UgZ2F0ZSBzdGF0ZSBzaG91bGQgYmUgdXBkYXRlZC5cbiAgICogQHBhcmFtIGdhdGVOYW1lIC0gR2F0ZSBuYW1lIHRvIGFwcHJvdmUuXG4gICAqIEByZXR1cm5zIFByb21pc2UgcmVzb2x2aW5nIHRvIGdhdGUgYXBwcm92YWwgbWV0YWRhdGEuXG4gICAqIEB0aHJvd3MgQXBpRXJyb3Igd2hlbiB0aGUgc2VydmVyIHJlamVjdHMgdGhlIGFwcHJvdmFsLlxuICAgKiBAdGhyb3dzIE5ldHdvcmtFcnJvciB3aGVuIHRoZSByZXF1ZXN0IGZhaWxzIHRvIHJlYWNoIHRoZSBzZXJ2ZXIuXG4gICAqIEBkZXByZWNhdGVkIFVzZSBkaXJlY3QgZ2l0IG9wZXJhdGlvbnMgaW5zdGVhZC4gVGhpcyBlbmRwb2ludCB3aWxsIGJlIHJlbW92ZWQuXG4gICAqL1xuICBhc3luYyBhcHByb3ZlR2F0ZShjYXJkSWQ6IHN0cmluZywgZ2F0ZU5hbWU6ICdwbGFuJyB8ICdyZXZpZXcnKTogUHJvbWlzZTxHYXRlQXBwcm92YWxSZXNwb25zZT4ge1xuICAgIGNvbnN0IHVybCA9IHRoaXMuYnVpbGRVcmwoYC9jYXJkcy8ke2NhcmRJZH0vZ2F0ZXMvJHtnYXRlTmFtZX0vYXBwcm92ZWApO1xuICAgIHJldHVybiB0aGlzLnJlcXVlc3QoKCkgPT4gdGhpcy5nZXRIdHRwQ2xpZW50KCkucG9zdDxHYXRlQXBwcm92YWxSZXNwb25zZT4odXJsLCB1bmRlZmluZWQpKTtcbiAgfVxuXG4gIC8vIC0tLSBDb21taXQgT3BlcmF0aW9ucyAtLS1cblxuICAvKipcbiAgICogR2V0cyBhbGwgY29tbWl0cyBhc3NvY2lhdGVkIHdpdGggYSBjYXJkLlxuICAgKlxuICAgKiBAcGFyYW0gY2FyZElkIC0gSWRlbnRpZmllciBvZiB0aGUgY2FyZCB3aG9zZSBjb21taXRzIHNob3VsZCBiZSByZXR1cm5lZC5cbiAgICogQHJldHVybnMgUHJvbWlzZSByZXNvbHZpbmcgdG8gY29tbWl0IG1ldGFkYXRhLlxuICAgKiBAdGhyb3dzIEFwaUVycm9yIHdoZW4gdGhlIHNlcnZlciByZXNwb25kcyB3aXRoIGFuIGVycm9yLlxuICAgKiBAdGhyb3dzIE5ldHdvcmtFcnJvciB3aGVuIHRoZSByZXF1ZXN0IGZhaWxzIHRvIHJlYWNoIHRoZSBzZXJ2ZXIuXG4gICAqL1xuICBhc3luYyBnZXRDb21taXRzKGNhcmRJZDogc3RyaW5nKTogUHJvbWlzZTxDb21taXRJbmZvW10+IHtcbiAgICBjb25zdCB1cmwgPSB0aGlzLmJ1aWxkVXJsKGAvY2FyZHMvJHtjYXJkSWR9L2NvbW1pdHNgKTtcbiAgICByZXR1cm4gdGhpcy5yZXF1ZXN0KCgpID0+IHRoaXMuZ2V0SHR0cENsaWVudCgpLmdldDxDb21taXRJbmZvW10+KHVybCkpO1xuICB9XG5cbiAgLyoqXG4gICAqIEFkZHMgYSBjb21taXQgdG8gYSBjYXJkLlxuICAgKlxuICAgKiBAcGFyYW0gY2FyZElkIC0gSWRlbnRpZmllciBvZiB0aGUgY2FyZCB0byBhc3NvY2lhdGUgd2l0aCB0aGUgY29tbWl0IFNIQS5cbiAgICogQHBhcmFtIHNoYSAtIEdpdCBjb21taXQgc2hhLlxuICAgKiBAcmV0dXJucyBQcm9taXNlIHJlc29sdmluZyB0byBjb21taXQgbWV0YWRhdGEuXG4gICAqIEB0aHJvd3MgQXBpRXJyb3Igd2hlbiB0aGUgc2VydmVyIHJlamVjdHMgdGhlIHVwZGF0ZS5cbiAgICogQHRocm93cyBOZXR3b3JrRXJyb3Igd2hlbiB0aGUgcmVxdWVzdCBmYWlscyB0byByZWFjaCB0aGUgc2VydmVyLlxuICAgKi9cbiAgYXN5bmMgYWRkQ29tbWl0KGNhcmRJZDogc3RyaW5nLCBzaGE6IHN0cmluZyk6IFByb21pc2U8Q29tbWl0SW5mbz4ge1xuICAgIGNvbnN0IHVybCA9IHRoaXMuYnVpbGRVcmwoYC9jYXJkcy8ke2NhcmRJZH0vY29tbWl0c2ApO1xuICAgIHJldHVybiB0aGlzLnJlcXVlc3QoKCkgPT4gdGhpcy5nZXRIdHRwQ2xpZW50KCkucG9zdDxDb21taXRJbmZvPih1cmwsIHsgc2hhIH0pKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZW1vdmVzIGEgY29tbWl0IGZyb20gYSBjYXJkLlxuICAgKlxuICAgKiBAcGFyYW0gY2FyZElkIC0gSWRlbnRpZmllciBvZiB0aGUgY2FyZCB0byBkZXRhY2ggZnJvbSB0aGUgY29tbWl0IFNIQS5cbiAgICogQHBhcmFtIHNoYSAtIEdpdCBjb21taXQgc2hhLlxuICAgKiBAcmV0dXJucyBQcm9taXNlIHJlc29sdmluZyB3aGVuIHJlbW92YWwgaXMgY29tcGxldGUuXG4gICAqIEB0aHJvd3MgQXBpRXJyb3Igd2hlbiB0aGUgc2VydmVyIHJlamVjdHMgdGhlIHVwZGF0ZS5cbiAgICogQHRocm93cyBOZXR3b3JrRXJyb3Igd2hlbiB0aGUgcmVxdWVzdCBmYWlscyB0byByZWFjaCB0aGUgc2VydmVyLlxuICAgKi9cbiAgYXN5bmMgcmVtb3ZlQ29tbWl0KGNhcmRJZDogc3RyaW5nLCBzaGE6IHN0cmluZyk6IFByb21pc2U8dm9pZD4ge1xuICAgIGNvbnN0IHVybCA9IHRoaXMuYnVpbGRVcmwoYC9jYXJkcy8ke2NhcmRJZH0vY29tbWl0cy8ke3NoYX1gKTtcbiAgICByZXR1cm4gdGhpcy5yZXF1ZXN0KCgpID0+IHRoaXMuZ2V0SHR0cENsaWVudCgpLmRlbGV0ZSh1cmwpKTtcbiAgfVxuXG4gIC8vIC0tLSBCcmFuY2ggT3BlcmF0aW9ucyAtLS1cblxuICAvKipcbiAgICogR2V0cyBhbGwgYnJhbmNoZXMgdHJhY2tlZCBvbiBhIGNhcmQuXG4gICAqXG4gICAqIEBwYXJhbSBjYXJkSWQgLSBVbmlxdWUgaWRlbnRpZmllciBvZiB0aGUgY2FyZCB3aG9zZSBicmFuY2hlcyB0byByZXRyaWV2ZS5cbiAgICogQHBhcmFtIG9wdGlvbnMgLSBPcHRpb25hbCBxdWVyeSBwYXJhbWV0ZXJzLlxuICAgKiBAcGFyYW0gb3B0aW9ucy53b3Jrc3BhY2VQYXRoIC0gV29ya3NwYWNlIHBhdGggZm9yIGNvbXB1dGluZyBpc01lcmdlZCBhbmQgY29tbWl0IGNvbnRhaW5tZW50LlxuICAgKiBAcmV0dXJucyBQcm9taXNlIHJlc29sdmluZyB0byBicmFuY2hlcyByZXNwb25zZS5cbiAgICovXG4gIGFzeW5jIGdldEJyYW5jaGVzKGNhcmRJZDogc3RyaW5nLCBvcHRpb25zPzogeyB3b3Jrc3BhY2VQYXRoPzogc3RyaW5nIH0pOiBQcm9taXNlPEJyYW5jaGVzUmVzcG9uc2U+IHtcbiAgICBjb25zdCB1cmwgPSB0aGlzLmJ1aWxkVXJsKGAvY2FyZHMvJHtjYXJkSWR9L2JyYW5jaGVzYCwge1xuICAgICAgd29ya3NwYWNlUGF0aDogb3B0aW9ucz8ud29ya3NwYWNlUGF0aFxuICAgIH0pO1xuICAgIHJldHVybiB0aGlzLnJlcXVlc3QoKCkgPT4gdGhpcy5nZXRIdHRwQ2xpZW50KCkuZ2V0PEJyYW5jaGVzUmVzcG9uc2U+KHVybCkpO1xuICB9XG5cbiAgLyoqXG4gICAqIEFkZHMgYSBicmFuY2ggdG8gYSBjYXJkLlxuICAgKlxuICAgKiBAcGFyYW0gY2FyZElkIC0gVW5pcXVlIGlkZW50aWZpZXIgb2YgdGhlIGNhcmQgdG8gYWRkIHRoZSBicmFuY2ggdG8uXG4gICAqIEBwYXJhbSBkYXRhIC0gQnJhbmNoIGRhdGEgaW5jbHVkaW5nIG5hbWUgYW5kIG9wdGlvbmFsIHdvcmt0cmVlIHBhdGguXG4gICAqIEByZXR1cm5zIFByb21pc2UgcmVzb2x2aW5nIHdoZW4gdGhlIGJyYW5jaCBpcyBhZGRlZC5cbiAgICovXG4gIGFzeW5jIGFkZEJyYW5jaChjYXJkSWQ6IHN0cmluZywgZGF0YTogQWRkQnJhbmNoUmVxdWVzdCk6IFByb21pc2U8dm9pZD4ge1xuICAgIGNvbnN0IHVybCA9IHRoaXMuYnVpbGRVcmwoYC9jYXJkcy8ke2NhcmRJZH0vYnJhbmNoZXNgKTtcbiAgICBhd2FpdCB0aGlzLnJlcXVlc3QoKCkgPT4gdGhpcy5nZXRIdHRwQ2xpZW50KCkucG9zdDx1bmtub3duPih1cmwsIGRhdGEpKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZW1vdmVzIGEgYnJhbmNoIGZyb20gYSBjYXJkLlxuICAgKlxuICAgKiBAcGFyYW0gY2FyZElkIC0gVW5pcXVlIGlkZW50aWZpZXIgb2YgdGhlIGNhcmQgdG8gcmVtb3ZlIHRoZSBicmFuY2ggZnJvbS5cbiAgICogQHBhcmFtIG5hbWUgLSBCcmFuY2ggbmFtZSB0byByZW1vdmUgKHdpbGwgYmUgVVJMLWVuY29kZWQpLlxuICAgKiBAcmV0dXJucyBQcm9taXNlIHJlc29sdmluZyB3aGVuIHRoZSBicmFuY2ggaXMgcmVtb3ZlZC5cbiAgICovXG4gIGFzeW5jIHJlbW92ZUJyYW5jaChjYXJkSWQ6IHN0cmluZywgbmFtZTogc3RyaW5nKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc3QgdXJsID0gdGhpcy5idWlsZFVybChgL2NhcmRzLyR7Y2FyZElkfS9icmFuY2hlcy8ke2VuY29kZVVSSUNvbXBvbmVudChuYW1lKX1gKTtcbiAgICByZXR1cm4gdGhpcy5yZXF1ZXN0KCgpID0+IHRoaXMuZ2V0SHR0cENsaWVudCgpLmRlbGV0ZSh1cmwpKTtcbiAgfVxuXG4gIC8vIC0tLSBUYWcgT3BlcmF0aW9ucyAtLS1cblxuICAvKipcbiAgICogR2V0cyBhbGwgYXZhaWxhYmxlIHRhZ3MuXG4gICAqXG4gICAqIEByZXR1cm5zIFByb21pc2UgcmVzb2x2aW5nIHRvIHRhZyBzdHJpbmdzLlxuICAgKiBAdGhyb3dzIEFwaUVycm9yIHdoZW4gdGhlIHNlcnZlciByZXNwb25kcyB3aXRoIGFuIGVycm9yLlxuICAgKiBAdGhyb3dzIE5ldHdvcmtFcnJvciB3aGVuIHRoZSByZXF1ZXN0IGZhaWxzIHRvIHJlYWNoIHRoZSBzZXJ2ZXIuXG4gICAqL1xuICBhc3luYyBnZXRUYWdzKCk6IFByb21pc2U8c3RyaW5nW10+IHtcbiAgICBjb25zdCB1cmwgPSB0aGlzLmJ1aWxkVXJsKCcvdGFncycsIHtcbiAgICAgIHdvcmtzcGFjZVBhdGg6IHRoaXMub3B0aW9ucy53b3Jrc3BhY2VQYXRoXG4gICAgfSk7XG4gICAgcmV0dXJuIHRoaXMucmVxdWVzdCgoKSA9PiB0aGlzLmdldEh0dHBDbGllbnQoKS5nZXQ8c3RyaW5nW10+KHVybCkpO1xuICB9XG5cbiAgLy8gLS0tIEVudmlyb25tZW50IE9wZXJhdGlvbnMgLS0tXG5cbiAgLyoqXG4gICAqIEZldGNoZXMgYXZhaWxhYmxlIGFnZW50IGVudmlyb25tZW50cy5cbiAgICpcbiAgICogQHJldHVybnMgUHJvbWlzZSByZXNvbHZpbmcgdG8gZW52aXJvbm1lbnQgbWV0YWRhdGEuXG4gICAqIEB0aHJvd3MgQXBpRXJyb3Igd2hlbiB0aGUgc2VydmVyIHJlc3BvbmRzIHdpdGggYW4gZXJyb3IuXG4gICAqIEB0aHJvd3MgTmV0d29ya0Vycm9yIHdoZW4gdGhlIHJlcXVlc3QgZmFpbHMgdG8gcmVhY2ggdGhlIHNlcnZlci5cbiAgICovXG4gIGFzeW5jIGdldEVudmlyb25tZW50cygpOiBQcm9taXNlPEFycmF5PHsgbmFtZTogc3RyaW5nOyBkZXNjcmlwdGlvbj86IHN0cmluZyB9Pj4ge1xuICAgIGNvbnN0IHVybCA9IHRoaXMuYnVpbGRVcmwoJy9lbnZpcm9ubWVudHMnKTtcbiAgICByZXR1cm4gdGhpcy5yZXF1ZXN0KCgpID0+IHRoaXMuZ2V0SHR0cENsaWVudCgpLmdldDxBcnJheTx7IG5hbWU6IHN0cmluZzsgZGVzY3JpcHRpb24/OiBzdHJpbmcgfT4+KHVybCkpO1xuICB9XG5cbiAgLy8gLS0tIFR5cGVkIEZpbGUgT3BlcmF0aW9ucyAtLS1cblxuICAvKipcbiAgICogU3VibWl0cyBhbiBhZGFwdGl2ZSBjYXJkIGFjdGlvbiBieSB3cml0aW5nIGFuIGBhZGFwdGl2ZS1jYXJkLXN1Ym1pc3Npb25gIHR5cGVkIGZpbGUuXG4gICAqXG4gICAqIEBwYXJhbSBjYXJkSWQgLSBUaGUgY2FyZCBjb250YWluaW5nIHRoZSBhZGFwdGl2ZSBjYXJkLlxuICAgKiBAcGFyYW0gYWN0aW9uSWQgLSBUaGUgYWN0aW9uIElEIGZyb20gdGhlIGFkYXB0aXZlIGNhcmQgc3VibWl0IGFjdGlvbi5cbiAgICogQHBhcmFtIGRhdGEgLSBUaGUgZm9ybSBkYXRhIGNvbGxlY3RlZCBieSB0aGUgYWRhcHRpdmUgY2FyZC5cbiAgICogQHJldHVybnMgUHJvbWlzZSByZXNvbHZpbmcgd2hlbiB0aGUgc3VibWlzc2lvbiBpcyBwZXJzaXN0ZWQuXG4gICAqIEB0aHJvd3MgQXBpRXJyb3Igd2hlbiB0aGUgc2VydmVyIHJlamVjdHMgdGhlIHN1Ym1pc3Npb24gKGUuZy4gdmFsaWRhdGlvbiBmYWlsdXJlKS5cbiAgICogQHRocm93cyBOZXR3b3JrRXJyb3Igd2hlbiB0aGUgcmVxdWVzdCBmYWlscyB0byByZWFjaCB0aGUgc2VydmVyLlxuICAgKi9cbiAgYXN5bmMgc3VibWl0Q2FyZEFjdGlvbihjYXJkSWQ6IHN0cmluZywgYWN0aW9uSWQ6IHN0cmluZywgZGF0YTogUmVjb3JkPHN0cmluZywgdW5rbm93bj4pOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zdCBmaWxlTmFtZSA9IGAke2FjdGlvbklkfS0ke0RhdGUubm93KCl9Lmpzb25gO1xuICAgIGNvbnN0IHVybCA9IHRoaXMuYnVpbGRVcmwoYC9jYXJkcy8ke2NhcmRJZH0vYWRhcHRpdmUtY2FyZC1zdWJtaXNzaW9uLyR7ZW5jb2RlVVJJQ29tcG9uZW50KGZpbGVOYW1lKX1gKTtcbiAgICBjb25zdCBib2R5ID0geyBjYXJkSWQsIGFjdGlvbklkLCBkYXRhIH07XG4gICAgYXdhaXQgdGhpcy5yZXF1ZXN0KCgpID0+IHRoaXMuZ2V0SHR0cENsaWVudCgpLnB1dDx1bmtub3duPih1cmwsIGJvZHkpKTtcbiAgfVxuXG4gIC8vIC0tLSBUeXBlIFNjaGVtYSBPcGVyYXRpb25zIC0tLVxuXG4gIC8qKlxuICAgKiBHZXRzIHR5cGUgc2NoZW1hcyBhbmQgZGVzY3JpcHRpb25zIGZvciBhIGNhcmQncyBlbnZpcm9ubWVudC5cbiAgICpcbiAgICogUmV0dXJucyBtZXRhZGF0YSBhYm91dCBlYWNoIHJlZ2lzdGVyZWQgdHlwZSBpbiB0aGUgY2FyZCdzIGVudmlyb25tZW50LFxuICAgKiBpbmNsdWRpbmcgdmVyc2lvbiwgc2NoZW1hLCBhbmQgZGVzY3JpcHRpb24uIENvbW1hbmQgZGV0YWlscyBhcmUgZXhjbHVkZWQuXG4gICAqXG4gICAqIEBwYXJhbSBjYXJkSWQgLSBJZGVudGlmaWVyIG9mIHRoZSBjYXJkIHdob3NlIHR5cGUgc2NoZW1hIG1ldGFkYXRhIHNob3VsZCBiZSBmZXRjaGVkLlxuICAgKiBAcmV0dXJucyBQcm9taXNlIHJlc29sdmluZyB0byB0eXBlIHNjaGVtYSBpbmZvcm1hdGlvbi5cbiAgICogQHRocm93cyBBcGlFcnJvciB3aGVuIHRoZSBzZXJ2ZXIgcmVzcG9uZHMgd2l0aCBhbiBlcnJvci5cbiAgICogQHRocm93cyBOZXR3b3JrRXJyb3Igd2hlbiB0aGUgcmVxdWVzdCBmYWlscyB0byByZWFjaCB0aGUgc2VydmVyLlxuICAgKi9cbiAgYXN5bmMgZ2V0VHlwZVNjaGVtYXMoY2FyZElkOiBzdHJpbmcpOiBQcm9taXNlPFR5cGVTY2hlbWFzUmVzcG9uc2U+IHtcbiAgICBjb25zdCB1cmwgPSB0aGlzLmJ1aWxkVXJsKGAvY2FyZHMvJHtjYXJkSWR9L3NjaGVtYWApO1xuICAgIHJldHVybiB0aGlzLnJlcXVlc3QoKCkgPT4gdGhpcy5nZXRIdHRwQ2xpZW50KCkuZ2V0PFR5cGVTY2hlbWFzUmVzcG9uc2U+KHVybCkpO1xuICB9XG5cbiAgLy8gLS0tIFN0cmVhbSBPcGVyYXRpb25zIC0tLVxuXG4gIC8qKlxuICAgKiBMaXN0cyBhbGwgc3RyZWFtcyBhdHRhY2hlZCB0byBhIGNhcmQsIHNvcnRlZCBieSBjcmVhdGlvbiB0aW1lLlxuICAgKlxuICAgKiBAcGFyYW0gY2FyZElkIC0gQ2FyZCBJRCB0byBxdWVyeS5cbiAgICogQHJldHVybnMgU3RyZWFtIG1ldGFkYXRhIGFycmF5IChtYXkgYmUgZW1wdHkpLlxuICAgKiBAdGhyb3dzIEFwaUVycm9yIHdoZW4gdGhlIHNlcnZlciByZXNwb25kcyB3aXRoIGFuIGVycm9yIChlLmcuLCA0MDQgZm9yIHVua25vd24gY2FyZCkuXG4gICAqIEB0aHJvd3MgTmV0d29ya0Vycm9yIHdoZW4gdGhlIHJlcXVlc3QgZmFpbHMgdG8gcmVhY2ggdGhlIHNlcnZlci5cbiAgICovXG4gIGFzeW5jIGxpc3RTdHJlYW1zKGNhcmRJZDogc3RyaW5nKTogUHJvbWlzZTxTdHJlYW1NZXRhW10+IHtcbiAgICBjb25zdCB1cmwgPSB0aGlzLmJ1aWxkVXJsKGAvY2FyZHMvJHtjYXJkSWR9L3N0cmVhbXNgKTtcbiAgICByZXR1cm4gdGhpcy5yZXF1ZXN0KCgpID0+IHRoaXMuZ2V0SHR0cENsaWVudCgpLmdldDxTdHJlYW1NZXRhW10+KHVybCkpO1xuICB9XG5cbiAgLyoqXG4gICAqIFJldHJpZXZlcyBhIHN0cmVhbSdzIG1ldGFkYXRhIGFuZCBhbGwgcmF3IGxpbmVzLlxuICAgKlxuICAgKiBUaGUgYHN0cmVhbVR5cGVgIGFuZCBgZmlsZW5hbWVgIGFyZSBVUkktZW5jb2RlZCBhdXRvbWF0aWNhbGx5LiBGb3IgY29tcGxldGVkXG4gICAqIHN0cmVhbXMgdGhlIHJldHVybmVkIGBsaW5lc2AgYXJyYXkgaXMgdGhlIGZ1bGwgY29udGVudDsgZm9yIGFjdGl2ZSBzdHJlYW1zIGl0XG4gICAqIGlzIGEgc25hcHNob3QgdGhhdCBtYXkgZ3JvdyB3aGlsZSB0aGUgY2FsbGVyIHByb2Nlc3NlcyBpdC5cbiAgICpcbiAgICogQHBhcmFtIGNhcmRJZCAtIElkZW50aWZpZXIgb2YgdGhlIGNhcmQgdGhhdCBvd25zIHRoZSByZXF1ZXN0ZWQgc3RyZWFtLlxuICAgKiBAcGFyYW0gc3RyZWFtVHlwZSAtIFN0cmVhbSB0eXBlIGtleSAoZS5nLiwgYFwiY2xhdWRlLWNvZGUtc2Vzc2lvblwiYCkuXG4gICAqIEBwYXJhbSBmaWxlbmFtZSAtIFN0cmVhbSBmaWxlbmFtZSAoZS5nLiwgYFwic2Vzc2lvbi5sb2dcImApLlxuICAgKiBAcmV0dXJucyBNZXRhZGF0YSBhbmQgY29udGVudCBsaW5lcy5cbiAgICogQHRocm93cyBBcGlFcnJvciBvbiA0MDQgKHVua25vd24gY2FyZCBvciBzdHJlYW0pIG9yIG90aGVyIHNlcnZlciBlcnJvcnMuXG4gICAqIEB0aHJvd3MgTmV0d29ya0Vycm9yIHdoZW4gdGhlIHJlcXVlc3QgZmFpbHMgdG8gcmVhY2ggdGhlIHNlcnZlci5cbiAgICovXG4gIGFzeW5jIGdldFN0cmVhbShcbiAgICBjYXJkSWQ6IHN0cmluZyxcbiAgICBzdHJlYW1UeXBlOiBzdHJpbmcsXG4gICAgZmlsZW5hbWU6IHN0cmluZ1xuICApOiBQcm9taXNlPHsgbWV0YTogU3RyZWFtTWV0YTsgbGluZXM6IHN0cmluZ1tdIH0+IHtcbiAgICBjb25zdCB1cmwgPSB0aGlzLmJ1aWxkVXJsKFxuICAgICAgYC9jYXJkcy8ke2NhcmRJZH0vc3RyZWFtcy8ke2VuY29kZVVSSUNvbXBvbmVudChzdHJlYW1UeXBlKX0vJHtlbmNvZGVVUklDb21wb25lbnQoZmlsZW5hbWUpfWBcbiAgICApO1xuICAgIHJldHVybiB0aGlzLnJlcXVlc3QoKCkgPT4gdGhpcy5nZXRIdHRwQ2xpZW50KCkuZ2V0PHsgbWV0YTogU3RyZWFtTWV0YTsgbGluZXM6IHN0cmluZ1tdIH0+KHVybCkpO1xuICB9XG5cbiAgLyoqXG4gICAqIE9wZW5zIGEgY2h1bmtlZCBKU09OTCBzdHJlYW0gdG8gdGhlIHNlcnZlciBhbmQgcmV0dXJucyBhIHdyaXRlci5cbiAgICpcbiAgICogVGhlIHdyaXRlciBzZW5kcyBlYWNoIGxpbmUgaW4gcmVhbC10aW1lIG92ZXIgYSBzaW5nbGUgSFRUUCBQT1NUIHVzaW5nIGFcbiAgICogYFJlYWRhYmxlU3RyZWFtYCBib2R5LiBDYWxsIHtAbGluayBTdHJlYW1Xcml0ZXIuY2xvc2V9IHdoZW4gdGhlIHByb2R1Y2VyXG4gICAqIGlzIGZpbmlzaGVkIHRvIGVuZCB0aGUgcmVxdWVzdCBhbmQgcmV0cmlldmUgdGhlIHNlcnZlcidzIHN1bW1hcnkuXG4gICAqXG4gICAqIEBwYXJhbSBjYXJkSWQgLSBDYXJkIElEIHRvIGF0dGFjaCB0aGUgc3RyZWFtIHRvLlxuICAgKiBAcGFyYW0gc3RyZWFtVHlwZSAtIFN0cmVhbSB0eXBlIGtleSBmcm9tIHNldHRpbmdzLmpzb24gKGUuZy4sIGBcImNsYXVkZS1jb2RlLXNlc3Npb25cImApLlxuICAgKiBAcGFyYW0gZmlsZW5hbWUgLSBTdHJlYW0gZmlsZW5hbWUgKGUuZy4sIGBcInNlc3Npb24tYWJjLmpzb25sXCJgKS5cbiAgICogQHBhcmFtIG9wdGlvbnMgLSBPcHRpb25hbCB0aXRsZSBhbmQgc2Vzc2lvbiBJRCBtZXRhZGF0YS5cbiAgICogQHJldHVybnMgQSB7QGxpbmsgU3RyZWFtV3JpdGVyfSBmb3IgcHVzaGluZyBsaW5lcyBhbmQgY2xvc2luZyB0aGUgc3RyZWFtLlxuICAgKlxuICAgKiBAZXhhbXBsZVxuICAgKiBgYGB0eXBlc2NyaXB0XG4gICAqIGNvbnN0IHN0cmVhbSA9IGNsaWVudC5vcGVuU3RyZWFtKGNhcmRJZCwgJ2NsYXVkZS1jb2RlLXNlc3Npb24nLCAncnVuLmpzb25sJyk7XG4gICAqIHN0cmVhbS53cml0ZShKU09OLnN0cmluZ2lmeSh7IHR5cGU6ICdpbml0JyB9KSk7XG4gICAqIHN0cmVhbS53cml0ZShKU09OLnN0cmluZ2lmeSh7IHR5cGU6ICdyZXN1bHQnIH0pKTtcbiAgICogY29uc3QgcmVzdWx0ID0gYXdhaXQgc3RyZWFtLmNsb3NlKCk7XG4gICAqIGBgYFxuICAgKi9cbiAgb3BlblN0cmVhbShjYXJkSWQ6IHN0cmluZywgc3RyZWFtVHlwZTogc3RyaW5nLCBmaWxlbmFtZTogc3RyaW5nLCBvcHRpb25zPzogU3RyZWFtV3JpdGVyT3B0aW9ucyk6IFN0cmVhbVdyaXRlciB7XG4gICAgY29uc3QgZW5jb2RlciA9IG5ldyBUZXh0RW5jb2RlcigpO1xuICAgIGxldCBjb250cm9sbGVyITogUmVhZGFibGVTdHJlYW1EZWZhdWx0Q29udHJvbGxlcjxVaW50OEFycmF5PjtcblxuICAgIGNvbnN0IGJvZHkgPSBuZXcgUmVhZGFibGVTdHJlYW08VWludDhBcnJheT4oe1xuICAgICAgc3RhcnQoYykge1xuICAgICAgICBjb250cm9sbGVyID0gYztcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIGNvbnN0IHVybCA9IHRoaXMuYnVpbGRVcmwoXG4gICAgICBgL2NhcmRzLyR7Y2FyZElkfS9zdHJlYW1zLyR7ZW5jb2RlVVJJQ29tcG9uZW50KHN0cmVhbVR5cGUpfS8ke2VuY29kZVVSSUNvbXBvbmVudChmaWxlbmFtZSl9YFxuICAgICk7XG5cbiAgICBjb25zdCBoZWFkZXJzOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ID0ge1xuICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi94LW5kanNvbidcbiAgICB9O1xuICAgIGlmICh0aGlzLm9wdGlvbnMuYWNjZXNzVG9rZW4pIHtcbiAgICAgIGhlYWRlcnNbJ0F1dGhvcml6YXRpb24nXSA9IGBCZWFyZXIgJHt0aGlzLm9wdGlvbnMuYWNjZXNzVG9rZW59YDtcbiAgICB9XG4gICAgaWYgKG9wdGlvbnM/LnRpdGxlKSB7XG4gICAgICBoZWFkZXJzWydYLVN0cmVhbS1UaXRsZSddID0gb3B0aW9ucy50aXRsZTtcbiAgICB9XG4gICAgaWYgKG9wdGlvbnM/LnNlc3Npb25JZCkge1xuICAgICAgaGVhZGVyc1snWC1TdHJlYW0tU2Vzc2lvbi1JZCddID0gb3B0aW9ucy5zZXNzaW9uSWQ7XG4gICAgfVxuXG4gICAgLy8gYGR1cGxleDogJ2hhbGYnYCBpcyByZXF1aXJlZCBieSB1bmRpY2kgZm9yIHN0cmVhbWluZyByZXF1ZXN0IGJvZGllc1xuICAgIC8vIGJ1dCBpcyBub3QgeWV0IGluIHRoZSBzdGFuZGFyZCBsaWIuZG9tIFJlcXVlc3RJbml0IHR5cGUuXG4gICAgY29uc3QgZmV0Y2hPcHRpb25zOiBSZXF1ZXN0SW5pdCAmIHsgZHVwbGV4OiBzdHJpbmcgfSA9IHtcbiAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgaGVhZGVycyxcbiAgICAgIGJvZHksXG4gICAgICBkdXBsZXg6ICdoYWxmJ1xuICAgIH07XG5cbiAgICBjb25zdCByZXNwb25zZVByb21pc2UgPSBmZXRjaCh1cmwsIGZldGNoT3B0aW9ucyk7XG5cbiAgICAvLyBUcmFjayBlYXJseSByZWplY3Rpb24gZnJvbSB0aGUgc2VydmVyIChlLmcuIDQwOSBcIlN0cmVhbSBhbHJlYWR5XG4gICAgLy8gZXhpc3RzIGFuZCBpcyBhY3RpdmVcIikuICBGb3IgYSBzdWNjZXNzZnVsIHN0cmVhbSB0aGUgcmVzcG9uc2Ugc3RheXNcbiAgICAvLyBwZW5kaW5nIHVudGlsIGNsb3NlKCkgZW5kcyB0aGUgYm9keSBcdTIwMTQgYnV0IGVycm9yIHJlc3BvbnNlcyBhcnJpdmVcbiAgICAvLyBpbW1lZGlhdGVseSBhbmQgbXVzdCBiZSBzdXJmYWNlZCB3aXRob3V0IHdhaXRpbmcgZm9yIGNsb3NlKCkuXG4gICAgLy8gTm90ZTogb25seSByZWFkcyByZXNwb25zZS5vay9zdGF0dXNUZXh0IChub3QgdGhlIGJvZHkpIHNvIGNsb3NlKClcbiAgICAvLyBjYW4gc3RpbGwgcGFyc2UgdGhlIGZ1bGwgZXJyb3IgcmVzcG9uc2UuXG4gICAgbGV0IGVhcmx5RXJyb3I6IEVycm9yIHwgbnVsbCA9IG51bGw7XG4gICAgcmVzcG9uc2VQcm9taXNlXG4gICAgICAudGhlbigocmVzcG9uc2UpID0+IHtcbiAgICAgICAgaWYgKCFyZXNwb25zZS5vaykge1xuICAgICAgICAgIGVhcmx5RXJyb3IgPSBuZXcgQXBpRXJyb3IocmVzcG9uc2Uuc3RhdHVzVGV4dCwgU3RyaW5nKHJlc3BvbnNlLnN0YXR1cykpO1xuICAgICAgICB9XG4gICAgICB9KVxuICAgICAgLmNhdGNoKChlcnI6IHVua25vd24pID0+IHtcbiAgICAgICAgZWFybHlFcnJvciA9IGVyciBpbnN0YW5jZW9mIEVycm9yID8gZXJyIDogbmV3IEVycm9yKFN0cmluZyhlcnIpKTtcbiAgICAgIH0pO1xuXG4gICAgcmV0dXJuIHtcbiAgICAgIHdyaXRlKGxpbmU6IHN0cmluZyk6IHZvaWQge1xuICAgICAgICBpZiAoZWFybHlFcnJvcikgdGhyb3cgZWFybHlFcnJvcjtcbiAgICAgICAgY29udHJvbGxlci5lbnF1ZXVlKGVuY29kZXIuZW5jb2RlKGAke2xpbmV9XFxuYCkpO1xuICAgICAgfSxcbiAgICAgIGNsb3NlOiBhc3luYyAoKTogUHJvbWlzZTxTdHJlYW1SZXN1bHQ+ID0+IHtcbiAgICAgICAgY29udHJvbGxlci5jbG9zZSgpO1xuICAgICAgICByZXR1cm4gdGhpcy5yZXF1ZXN0KGFzeW5jICgpID0+IHtcbiAgICAgICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IHJlc3BvbnNlUHJvbWlzZTtcbiAgICAgICAgICBpZiAoIXJlc3BvbnNlLm9rKSB0aHJvdyByZXNwb25zZTtcbiAgICAgICAgICByZXR1cm4gcmVzcG9uc2UuanNvbigpIGFzIFByb21pc2U8U3RyZWFtUmVzdWx0PjtcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfTtcbiAgfVxuXG4gIC8qKlxuICAgKiBPcGVucyBhIFdlYlNvY2tldC1iYWNrZWQgSlNPTkwgc3RyZWFtIHRvIHRoZSBzZXJ2ZXIgYW5kIHJldHVybnMgYSBzZXNzaW9uLlxuICAgKlxuICAgKiBUaGUgc2Vzc2lvbiBrZWVwcyBhIHBlcnNpc3RlbnQgV2ViU29ja2V0IGNvbm5lY3Rpb24gZm9yIHRoZSBlbnRpcmUgc2Vzc2lvblxuICAgKiBsaWZldGltZS4gVGhlIHNlcnZlciBzZW5kcyBhIGByZWFkeWAgbWVzc2FnZSB3aXRoIGByZXN1bWVGcm9tYCBiZWZvcmUgdGhlXG4gICAqIGNhbGxlciB3cml0ZXMgYW55IGxpbmVzLCBzbyB0aGUgd2F0Y2hlciBjYW4gc2tpcCBsaW5lcyB0aGUgc2VydmVyIGFscmVhZHkgaGFzLlxuICAgKlxuICAgKiBDYWxsIHtAbGluayBXc1N0cmVhbVNlc3Npb24uY2xvc2V9IHdoZW4gdGhlIHByb2R1Y2VyIGlzIGZpbmlzaGVkIHRvIHNlbmQgYVxuICAgKiBncmFjZWZ1bCBjbG9zZSBtZXNzYWdlIGFuZCBhd2FpdCB0aGUgc2VydmVyJ3MgYWNrbm93bGVkZ2VtZW50LlxuICAgKlxuICAgKiBAcGFyYW0gY2FyZElkIC0gQ2FyZCBJRCB0byBhdHRhY2ggdGhlIHN0cmVhbSB0by5cbiAgICogQHBhcmFtIHN0cmVhbVR5cGUgLSBTdHJlYW0gdHlwZSBrZXkgZnJvbSBzZXR0aW5ncy5qc29uIChlLmcuLCBgXCJjbGF1ZGUtY29kZS1zZXNzaW9uXCJgKS5cbiAgICogQHBhcmFtIGZpbGVuYW1lIC0gU3RyZWFtIGZpbGVuYW1lIChlLmcuLCBgXCJzZXNzaW9uLWFiYy5qc29ubFwiYCkuXG4gICAqIEBwYXJhbSBvcHRpb25zIC0gVGl0bGUgYW5kIHNlc3Npb24gSUQgbWV0YWRhdGEgZm9yd2FyZGVkIHRvIHRoZSBzZXJ2ZXIgYXMgVVJMIHF1ZXJ5IHBhcmFtZXRlcnMuXG4gICAqIEBwYXJhbSB3c0ZhY3RvcnkgLSBXZWJTb2NrZXQgZmFjdG9yeSBmb3IgY3JlYXRpbmcgdGhlIGNvbm5lY3Rpb24uIFVzZSB0aGUgYHdzYCBwYWNrYWdlIGluIE5vZGUuanMgZW52aXJvbm1lbnRzLlxuICAgKiBAcmV0dXJucyBBIHtAbGluayBXc1N0cmVhbVNlc3Npb259IHdpdGggYHJlc3VtZUZyb21gIHNldCB0byB0aGUgc2VydmVyJ3MgY3VycmVudCBsaW5lIGNvdW50LlxuICAgKiBAdGhyb3dzIEVycm9yIHdoZW4gdGhlIFdlYlNvY2tldCBmYWlscyB0byBjb25uZWN0IG9yIHRoZSBzZXJ2ZXIgc2VuZHMgYW4gZXJyb3IgYmVmb3JlIGByZWFkeWAuXG4gICAqL1xuICBhc3luYyBvcGVuU3RyZWFtV2ViU29ja2V0KFxuICAgIGNhcmRJZDogc3RyaW5nLFxuICAgIHN0cmVhbVR5cGU6IHN0cmluZyxcbiAgICBmaWxlbmFtZTogc3RyaW5nLFxuICAgIG9wdGlvbnM6IFN0cmVhbVdyaXRlck9wdGlvbnMsXG4gICAgd3NGYWN0b3J5OiBJbmdlc3RXc0ZhY3RvcnlcbiAgKTogUHJvbWlzZTxXc1N0cmVhbVNlc3Npb24+IHtcbiAgICBjb25zdCBmYWN0b3J5ID0gd3NGYWN0b3J5O1xuXG4gICAgLy8gQ29udmVydCBodHRwL2h0dHBzIHRvIHdzL3dzc1xuICAgIGNvbnN0IGJhc2VVcmwgPSB0aGlzLm9wdGlvbnMuYmFzZVVybC5yZXBsYWNlKC9eaHR0cC8sICd3cycpO1xuICAgIGNvbnN0IGJhc2VQYXRoID0gYCR7YmFzZVVybH0vY2FyZHMvJHtlbmNvZGVVUklDb21wb25lbnQoY2FyZElkKX0vc3RyZWFtcy8ke2VuY29kZVVSSUNvbXBvbmVudChzdHJlYW1UeXBlKX0vJHtlbmNvZGVVUklDb21wb25lbnQoZmlsZW5hbWUpfWA7XG4gICAgY29uc3QgcXVlcnlQYXJhbXMgPSBuZXcgVVJMU2VhcmNoUGFyYW1zKCk7XG4gICAgaWYgKG9wdGlvbnM/LnRpdGxlKSBxdWVyeVBhcmFtcy5zZXQoJ3RpdGxlJywgb3B0aW9ucy50aXRsZSk7XG4gICAgaWYgKG9wdGlvbnM/LnNlc3Npb25JZCkgcXVlcnlQYXJhbXMuc2V0KCdzZXNzaW9uSWQnLCBvcHRpb25zLnNlc3Npb25JZCk7XG4gICAgY29uc3QgcXVlcnlTdHJpbmcgPSBxdWVyeVBhcmFtcy50b1N0cmluZygpO1xuICAgIGNvbnN0IHVybCA9IHF1ZXJ5U3RyaW5nID8gYCR7YmFzZVBhdGh9PyR7cXVlcnlTdHJpbmd9YCA6IGJhc2VQYXRoO1xuXG4gICAgY29uc3QgaGVhZGVyczogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHt9O1xuICAgIGlmICh0aGlzLm9wdGlvbnMuYWNjZXNzVG9rZW4pIHtcbiAgICAgIGhlYWRlcnNbJ0F1dGhvcml6YXRpb24nXSA9IGBCZWFyZXIgJHt0aGlzLm9wdGlvbnMuYWNjZXNzVG9rZW59YDtcbiAgICB9XG5cbiAgICBjb25zdCB3cyA9IGZhY3RvcnkodXJsLCB7IGhlYWRlcnMgfSk7XG5cbiAgICAvLyBBd2FpdCB0aGUgJ3JlYWR5JyBtZXNzYWdlIGZyb20gdGhlIHNlcnZlciBiZWZvcmUgcmV0dXJuaW5nIHRvIHRoZSBjYWxsZXIuXG4gICAgLy8gQW55IGVycm9yIG9yIHByZW1hdHVyZSBjbG9zZSBiZWZvcmUgJ3JlYWR5JyByZWplY3RzIHRoZSBwcm9taXNlLlxuICAgIGNvbnN0IHJlc3VtZUZyb20gPSBhd2FpdCBuZXcgUHJvbWlzZTxudW1iZXI+KChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgIGNvbnN0IG9uUmVhZHkgPSAoZXZlbnQ6IE1lc3NhZ2VFdmVudDx1bmtub3duPikgPT4ge1xuICAgICAgICB0cnkge1xuICAgICAgICAgIGNvbnN0IG1zZyA9IEpTT04ucGFyc2UoU3RyaW5nKGV2ZW50LmRhdGEpKSBhcyB7IHR5cGU6IHN0cmluZzsgcmVzdW1lRnJvbT86IG51bWJlcjsgbWVzc2FnZT86IHN0cmluZyB9O1xuICAgICAgICAgIGlmIChtc2cudHlwZSA9PT0gJ3JlYWR5Jykge1xuICAgICAgICAgICAgd3MucmVtb3ZlRXZlbnRMaXN0ZW5lcignbWVzc2FnZScsIG9uUmVhZHkpO1xuICAgICAgICAgICAgd3MucmVtb3ZlRXZlbnRMaXN0ZW5lcignZXJyb3InLCBvbkVycm9yKTtcbiAgICAgICAgICAgIHdzLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2Nsb3NlJywgb25DbG9zZSk7XG4gICAgICAgICAgICByZXNvbHZlKG1zZy5yZXN1bWVGcm9tID8/IDApO1xuICAgICAgICAgIH0gZWxzZSBpZiAobXNnLnR5cGUgPT09ICdlcnJvcicpIHtcbiAgICAgICAgICAgIHdzLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ21lc3NhZ2UnLCBvblJlYWR5KTtcbiAgICAgICAgICAgIHdzLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2Vycm9yJywgb25FcnJvcik7XG4gICAgICAgICAgICB3cy5yZW1vdmVFdmVudExpc3RlbmVyKCdjbG9zZScsIG9uQ2xvc2UpO1xuICAgICAgICAgICAgcmVqZWN0KG5ldyBFcnJvcihtc2cubWVzc2FnZSA/PyAnU2VydmVyIGVycm9yJykpO1xuICAgICAgICAgIH1cbiAgICAgICAgICAvLyBPdGhlciBtZXNzYWdlIHR5cGVzIGJlZm9yZSAncmVhZHknIGFyZSBzaWxlbnRseSBpZ25vcmVkXG4gICAgICAgIH0gY2F0Y2gge1xuICAgICAgICAgIHJlamVjdChuZXcgRXJyb3IoJ0ZhaWxlZCB0byBwYXJzZSBzZXJ2ZXIgcmVhZHkgbWVzc2FnZScpKTtcbiAgICAgICAgfVxuICAgICAgfTtcbiAgICAgIGNvbnN0IG9uRXJyb3IgPSAoZXZlbnQ6IEV2ZW50KSA9PiB7XG4gICAgICAgIHdzLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ21lc3NhZ2UnLCBvblJlYWR5KTtcbiAgICAgICAgd3MucmVtb3ZlRXZlbnRMaXN0ZW5lcignZXJyb3InLCBvbkVycm9yKTtcbiAgICAgICAgd3MucmVtb3ZlRXZlbnRMaXN0ZW5lcignY2xvc2UnLCBvbkNsb3NlKTtcbiAgICAgICAgcmVqZWN0KG5ldyBFcnJvcihgV2ViU29ja2V0IGVycm9yOiAke1N0cmluZyhldmVudCl9YCkpO1xuICAgICAgfTtcbiAgICAgIGNvbnN0IG9uQ2xvc2UgPSAoZXZlbnQ6IENsb3NlRXZlbnQpID0+IHtcbiAgICAgICAgd3MucmVtb3ZlRXZlbnRMaXN0ZW5lcignbWVzc2FnZScsIG9uUmVhZHkpO1xuICAgICAgICB3cy5yZW1vdmVFdmVudExpc3RlbmVyKCdlcnJvcicsIG9uRXJyb3IpO1xuICAgICAgICB3cy5yZW1vdmVFdmVudExpc3RlbmVyKCdjbG9zZScsIG9uQ2xvc2UpO1xuICAgICAgICByZWplY3QobmV3IEVycm9yKGBXZWJTb2NrZXQgY2xvc2VkIGJlZm9yZSByZWFkeTogY29kZT0ke1N0cmluZyhldmVudC5jb2RlKX1gKSk7XG4gICAgICB9O1xuICAgICAgd3MuYWRkRXZlbnRMaXN0ZW5lcignbWVzc2FnZScsIG9uUmVhZHkpO1xuICAgICAgd3MuYWRkRXZlbnRMaXN0ZW5lcignZXJyb3InLCBvbkVycm9yKTtcbiAgICAgIHdzLmFkZEV2ZW50TGlzdGVuZXIoJ2Nsb3NlJywgb25DbG9zZSk7XG4gICAgfSk7XG5cbiAgICBsZXQgbGluZXNTZW50ID0gcmVzdW1lRnJvbTtcblxuICAgIHJldHVybiB7XG4gICAgICBnZXQgcmVzdW1lRnJvbSgpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gcmVzdW1lRnJvbTtcbiAgICAgIH0sXG4gICAgICBnZXQgbGluZXNTZW50KCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiBsaW5lc1NlbnQ7XG4gICAgICB9LFxuICAgICAgd3JpdGUobGluZTogc3RyaW5nKTogdm9pZCB7XG4gICAgICAgIGxpbmVzU2VudCsrO1xuICAgICAgICB3cy5zZW5kKEpTT04uc3RyaW5naWZ5KHsgdHlwZTogJ2xpbmUnLCBsaW5lTnVtYmVyOiBsaW5lc1NlbnQsIGNvbnRlbnQ6IGxpbmUgfSkpO1xuICAgICAgfSxcbiAgICAgIGFzeW5jIGNsb3NlKCk6IFByb21pc2U8U3RyZWFtUmVzdWx0PiB7XG4gICAgICAgIHdzLnNlbmQoSlNPTi5zdHJpbmdpZnkoeyB0eXBlOiAnY2xvc2UnIH0pKTtcbiAgICAgICAgYXdhaXQgbmV3IFByb21pc2U8dm9pZD4oKHJlc29sdmUpID0+IHtcbiAgICAgICAgICBjb25zdCBvbkNsb3NlID0gKCkgPT4ge1xuICAgICAgICAgICAgd3MucmVtb3ZlRXZlbnRMaXN0ZW5lcignY2xvc2UnLCBvbkNsb3NlKTtcbiAgICAgICAgICAgIHJlc29sdmUoKTtcbiAgICAgICAgICB9O1xuICAgICAgICAgIHdzLmFkZEV2ZW50TGlzdGVuZXIoJ2Nsb3NlJywgb25DbG9zZSk7XG4gICAgICAgICAgLy8gSWYgYWxyZWFkeSBjbG9zZWQsIHJlc29sdmUgaW1tZWRpYXRlbHlcbiAgICAgICAgICBpZiAod3MucmVhZHlTdGF0ZSA9PT0gd3MuQ0xPU0VEKSB7XG4gICAgICAgICAgICB3cy5yZW1vdmVFdmVudExpc3RlbmVyKCdjbG9zZScsIG9uQ2xvc2UpO1xuICAgICAgICAgICAgcmVzb2x2ZSgpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgZmlsZW5hbWUsXG4gICAgICAgICAgc3RyZWFtVHlwZSxcbiAgICAgICAgICBsaW5lQ291bnQ6IGxpbmVzU2VudCxcbiAgICAgICAgICBzdGF0dXM6ICdjb21wbGV0ZWQnXG4gICAgICAgIH07XG4gICAgICB9XG4gICAgfTtcbiAgfVxuXG4gIC8vIC0tLSBDb21wYXJlIE9wZXJhdGlvbnMgLS0tXG5cbiAgLyoqXG4gICAqIFNldHMgb3IgcmVwbGFjZXMgdGhlIGFjdGl2ZSBjb21wYXJpc29uIG9uIHRoZSBzZXJ2ZXIuXG4gICAqXG4gICAqIEBwYXJhbSByZXF1ZXN0IC0gQ29tcGFyZSByZXF1ZXN0IHNwZWNpZnlpbmcgdGhlIGNvbXBhcmlzb24gbW9kZS5cbiAgICogQHJldHVybnMgUHJvbWlzZSByZXNvbHZpbmcgdG8gdGhlIHJlc3VsdGluZyBjb21wYXJlIHN0YXRlLlxuICAgKi9cbiAgYXN5bmMgc2V0Q29tcGFyZShyZXF1ZXN0OiBDb21wYXJlUmVxdWVzdCk6IFByb21pc2U8Q29tcGFyZVN0YXRlPiB7XG4gICAgY29uc3QgdXJsID0gdGhpcy5idWlsZFVybCgnL2NvbXBhcmUnKTtcbiAgICByZXR1cm4gdGhpcy5yZXF1ZXN0KCgpID0+IHRoaXMuZ2V0SHR0cENsaWVudCgpLnBvc3Q8Q29tcGFyZVN0YXRlPih1cmwsIHJlcXVlc3QpKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXR1cm5zIHRoZSBjdXJyZW50IGNvbXBhcmUgc3RhdGUsIG9yIG51bGwgaWYgbm8gY29tcGFyaXNvbiBpcyBhY3RpdmUuXG4gICAqXG4gICAqIFRoZSBzZXJ2ZXIgcmV0dXJucyAyMDQgd2hlbiBubyBjb21wYXJpc29uIGlzIGFjdGl2ZSwgd2hpY2ggdGhpcyBtZXRob2RcbiAgICogbWFwcyB0byBudWxsIHJhdGhlciB0aGFuIHRocm93aW5nLlxuICAgKlxuICAgKiBAcmV0dXJucyBQcm9taXNlIHJlc29sdmluZyB0byB0aGUgY3VycmVudCBjb21wYXJlIHN0YXRlLCBvciBudWxsIGlmIG5vbmUgYWN0aXZlLlxuICAgKi9cbiAgYXN5bmMgZ2V0Q29tcGFyZSgpOiBQcm9taXNlPENvbXBhcmVTdGF0ZSB8IG51bGw+IHtcbiAgICBjb25zdCB1cmwgPSB0aGlzLmJ1aWxkVXJsKCcvY29tcGFyZScpO1xuICAgIHJldHVybiB0aGlzLnJlcXVlc3QoYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBmZXRjaCh1cmwsIHtcbiAgICAgICAgaGVhZGVyczogdGhpcy5nZXRIZWFkZXJzKCkgYXMgUmVjb3JkPHN0cmluZywgc3RyaW5nPixcbiAgICAgICAgc2lnbmFsOiB0aGlzLmdldFRpbWVvdXRTaWduYWwoKVxuICAgICAgfSk7XG4gICAgICBpZiAocmVzcG9uc2Uuc3RhdHVzID09PSAyMDQpIHtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9XG4gICAgICBpZiAoIXJlc3BvbnNlLm9rKSB0aHJvdyByZXNwb25zZTtcbiAgICAgIHJldHVybiByZXNwb25zZS5qc29uKCkgYXMgUHJvbWlzZTxDb21wYXJlU3RhdGU+O1xuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIENsZWFycyB0aGUgYWN0aXZlIGNvbXBhcmlzb24gb24gdGhlIHNlcnZlci5cbiAgICpcbiAgICogQHJldHVybnMgUHJvbWlzZSByZXNvbHZpbmcgd2hlbiB0aGUgY29tcGFyaXNvbiBpcyBjbGVhcmVkLlxuICAgKi9cbiAgYXN5bmMgY2xlYXJDb21wYXJlKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIGNvbnN0IHVybCA9IHRoaXMuYnVpbGRVcmwoJy9jb21wYXJlJyk7XG4gICAgcmV0dXJuIHRoaXMucmVxdWVzdCgoKSA9PiB0aGlzLmdldEh0dHBDbGllbnQoKS5kZWxldGUodXJsKSk7XG4gIH1cbn1cbiIsICJwcm9jZXNzLmVudlsnQ0xBVURFX0NPREVfSE9PS1NfQ0xJX0xPR19GSUxFJ10gPSBcIi93b3Jrc3BhY2UvLndvcmt0cmVlcy9jYXJkcy9tYWluLTIvMS8uY2FyZHMvbG9ncy9jbGF1ZGUtY29kZS1jYXJkcy1ydW50aW1lLWhvb2tzLmxvZ1wiO1xuXG5pbXBvcnQgaG9vayBmcm9tICcuL3N1YmFnZW50LXN0b3AudHMnO1xuaW1wb3J0IHsgZXhlY3V0ZSB9IGZyb20gJy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL25vZGVfbW9kdWxlcy9AZ29vZGZvb3QvY2xhdWRlLWNvZGUtaG9va3MvZGlzdC9ydW50aW1lLmpzJztcblxuZXhlY3V0ZShob29rKTtcbiJdLAogICJtYXBwaW5ncyI6ICI7Ozs7Ozs7O0FBYUEsU0FBUyxZQUFBQSxpQkFBZ0I7OztBQ0d6QixTQUFTLG9CQUFvQjtBQWN0QixJQUFNLGlCQUFpQjtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFLNUIsU0FBUztBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFNVCxhQUFhO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQU1iLGFBQWE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFPYixnQkFBZ0I7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBTWhCLGNBQWM7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBTWQsa0JBQWtCO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBT2xCLGNBQWM7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBTWQsV0FBVztBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFNWCxjQUFjO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQU1kLFdBQVc7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBTVgsV0FBVztBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFNWCxXQUFXO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQU1YLFFBQVE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBTVIsY0FBYztBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFZZCxhQUFhO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBVWIsTUFBTTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFNTixhQUFhO0FBQUE7QUFBQTtBQUFB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
