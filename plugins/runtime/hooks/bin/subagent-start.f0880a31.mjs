#!/usr/bin/env -S node --enable-source-maps
import { createRequire as __createRequire } from "node:module";
import { fileURLToPath as __fileURLToPath } from "node:url";
import { dirname as __pathDirname } from "node:path";
const require = __createRequire(import.meta.url);
const __filename = __fileURLToPath(import.meta.url);
const __dirname = __pathDirname(__filename);

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

// ../../../node_modules/@goodfoot/claude-code-hooks/dist/env.js
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

// ../../../node_modules/@goodfoot/claude-code-hooks/dist/hooks.js
function createHookFunction(hookEventName, config, handler) {
  const hookFn = async (input, context) => {
    return await handler(input, context);
  };
  hookFn.hookEventName = hookEventName;
  hookFn.matcher = config.matcher;
  hookFn.timeout = config.timeout;
  return hookFn;
}
function subagentStartHook(config, handler) {
  return createHookFunction("SubagentStart", config, handler);
}

// ../../../node_modules/@goodfoot/claude-code-hooks/dist/logger.js
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

// ../../../node_modules/@goodfoot/claude-code-hooks/dist/outputs.js
var EXIT_CODES = {
  /** Handler completed successfully. Claude Code parses stdout as JSON. */
  SUCCESS: 0,
  /** Non-blocking error occurred (e.g., invalid input). stderr shown to user only. */
  ERROR: 1,
  /** Handler threw exception OR blocking action requested. stderr shown to Claude. */
  BLOCK: 2
};
function createHookSpecificOutputBuilder(hookType) {
  return (options = {}) => {
    const { hookSpecificOutput, ...rest } = options;
    const stdout = hookSpecificOutput !== void 0 ? { ...rest, hookSpecificOutput: { hookEventName: hookType, ...hookSpecificOutput } } : rest;
    return { _type: hookType, stdout };
  };
}
var subagentStartOutput = /* @__PURE__ */ createHookSpecificOutputBuilder("SubagentStart");

// ../../../node_modules/@goodfoot/claude-code-hooks/dist/runtime.js
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

// src/lib/context.ts
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync as readFileSync2, statSync } from "node:fs";
import { join } from "node:path";

// ../sdk/src/protocol/types/branch.ts
var WORKSPACE_BRANCHES_FILE = "workspace-branches.json";
var WORKSPACE_COMMITS_FILE = "workspace-commits.csv";

// src/lib/context.ts
var CardRepoAccessError = class extends Error {
  constructor(repoPath, cause) {
    const reason = cause instanceof Error ? cause.message : String(cause);
    super(`Cannot read card repository at ${repoPath}: ${reason}`);
    this.repoPath = repoPath;
    this.cause = cause;
  }
  name = "CardRepoAccessError";
  /**
   * Builds a user-facing system message explaining the card repo access failure.
   *
   * @param actor - Human-readable noun for the failing entity (e.g. "session", "subagent").
   * @returns Object with `systemMessage` and `stopReason` strings.
   */
  toHookFailure(actor) {
    return {
      systemMessage: [
        `The card repository at '${this.repoPath}' is not accessible.`,
        "",
        `Error: ${this.message}`,
        "",
        `This ${actor} cannot proceed without a valid card repository. To resolve:`,
        `1. Verify the card repository directory exists at: ${this.repoPath}`,
        "2. Ensure the current process has read permissions for the directory and its contents",
        "3. Check that the CARD_REPO_PATH environment variable points to a valid card repository"
      ].join("\n"),
      stopReason: `Card repository inaccessible at ${this.repoPath}: ${this.message}`
    };
  }
};
function readCardMeta(rootPath) {
  try {
    const raw = readFileSync2(join(rootPath, "CARD.meta.json"), "utf-8");
    const parsed = JSON.parse(raw);
    const gates = parsed["gates"];
    return {
      id: String(parsed["id"] ?? ""),
      title: String(parsed["title"] ?? ""),
      status: String(parsed["status"] ?? ""),
      gates: {
        planRequired: gates?.["planRequired"] === true,
        planApproved: gates?.["planApproved"] === true,
        reviewRequired: gates?.["reviewRequired"] === true,
        reviewApproved: gates?.["reviewApproved"] === true
      }
    };
  } catch {
    return null;
  }
}
function buildCardBlock(actionInput) {
  const meta = readCardMeta(actionInput.cardRepoPath);
  const id = meta?.id || actionInput.cardId;
  const title = meta?.title || "";
  const status = meta?.status || "";
  const gatesLine = meta ? `gates: planRequired=${meta.gates.planRequired} planApproved=${meta.gates.planApproved} reviewRequired=${meta.gates.reviewRequired} reviewApproved=${meta.gates.reviewApproved}` : "";
  const workspaceBranch = process.env[CARDS_ENV_VARS.WORKSPACE_BRANCH];
  const baseBranch = process.env[CARDS_ENV_VARS.BASE_BRANCH];
  const workspacePath = process.env[CARDS_ENV_VARS.WORKSPACE_PATH];
  const envLines = [`  CARD_REPO_PATH=${actionInput.cardRepoPath}`];
  if (workspacePath) envLines.push(`  WORKSPACE_PATH=${workspacePath}`);
  if (baseBranch) envLines.push(`  BASE_BRANCH=${baseBranch}`);
  if (workspaceBranch) envLines.push(`  WORKSPACE_BRANCH=${workspaceBranch}`);
  const bodyLines = [];
  if (title) bodyLines.push(`title: ${title}`);
  bodyLines.push("");
  if (gatesLine) bodyLines.push(gatesLine);
  bodyLines.push("env:");
  bodyLines.push(...envLines);
  const attrs = [`id="${id}"`, `status="${status}"`, `mode="${actionInput.executionMode}"`];
  return `<card ${attrs.join(" ")}>
${bodyLines.join("\n")}
</card>`;
}
function formatTimestamp(mtimeMs) {
  const d = new Date(mtimeMs);
  const iso = d.toISOString();
  return `${iso.slice(0, 16)}Z`;
}
function dirStats(dirPath) {
  try {
    const entries = readdirSync(dirPath, { withFileTypes: true });
    let count = 0;
    let latest = 0;
    for (const entry of entries) {
      if (entry.isFile()) {
        count++;
        try {
          const mt = statSync(join(dirPath, entry.name)).mtimeMs;
          if (mt > latest) latest = mt;
        } catch {
        }
      }
    }
    return [count, latest];
  } catch {
    return [0, 0];
  }
}
function buildCardRepoBlock(rootPath) {
  let entries;
  try {
    entries = readdirSync(rootPath, { withFileTypes: true }).map((d) => ({
      name: d.name.toString(),
      isDir: d.isDirectory()
    }));
  } catch (error) {
    throw new CardRepoAccessError(rootPath, error);
  }
  const lines = [];
  for (const entry of entries) {
    if (entry.name === ".git") continue;
    const fullPath = join(rootPath, entry.name);
    if (entry.isDir) {
      if (entry.name === "streams") {
        lines.push("streams/");
        try {
          const streamEntries = readdirSync(fullPath, { withFileTypes: true });
          for (const sub of streamEntries) {
            if (sub.isDirectory()) {
              const subName = sub.name.toString();
              const [count, latest] = dirStats(join(fullPath, subName));
              const ts = latest > 0 ? `   latest ${formatTimestamp(latest)}` : "";
              lines.push(`${`  ${subName}/`.padEnd(24)}${count} files${ts}`);
            }
          }
        } catch {
        }
      } else {
        const [count, latest] = dirStats(fullPath);
        const ts = latest > 0 ? `   latest ${formatTimestamp(latest)}` : "";
        lines.push(`${`${entry.name}/`.padEnd(24)}${count} files${ts}`);
      }
    } else {
      try {
        const mt = statSync(fullPath).mtimeMs;
        lines.push(`${entry.name}`.padEnd(24) + formatTimestamp(mt));
      } catch {
        lines.push(entry.name);
      }
    }
  }
  return `<card-repo>
${lines.join("\n")}
</card-repo>`;
}
function stripDiffstatSummaries(text) {
  return text.split("\n").filter((line) => !/^\s*\d+ files? changed/.test(line)).map((line) => line.replace(/\s+\|\s+(\d+\s*[+-]*|Bin\s+.*)$/, "")).join("\n").replace(/\n{3,}/g, "\n\n").trim();
}
var MAX_CARD_REPO_LOG_COMMITS = 5;
function buildCardRepoLogBlock(rootPath) {
  try {
    const log = execFileSync(
      "git",
      [
        "log",
        `-${MAX_CARD_REPO_LOG_COMMITS}`,
        "--pretty=format:%x00%h - %an: %s",
        "--stat",
        "--",
        ".",
        ":!streams/",
        ":!.gitignore",
        `:!${WORKSPACE_BRANCHES_FILE}`,
        `:!${WORKSPACE_COMMITS_FILE}`
      ],
      {
        cwd: rootPath,
        encoding: "utf-8",
        timeout: 5e3,
        stdio: ["pipe", "pipe", "pipe"]
      }
    ).trim();
    if (!log) return null;
    const rawCommits = log.split("\0").filter(Boolean);
    if (rawCommits.length === 0) return null;
    const formattedCommits = [];
    for (const commit of rawCommits) {
      const trimmed = stripDiffstatSummaries(commit.trim());
      if (trimmed) formattedCommits.push(trimmed);
    }
    if (formattedCommits.length === 0) return null;
    let totalCount = null;
    try {
      const countStr = execFileSync("git", ["rev-list", "--count", "HEAD"], {
        cwd: rootPath,
        encoding: "utf-8",
        timeout: 5e3,
        stdio: ["pipe", "pipe", "pipe"]
      }).trim();
      totalCount = parseInt(countStr, 10);
      if (Number.isNaN(totalCount)) totalCount = null;
    } catch {
    }
    const countAttr = totalCount !== null ? ` count="${totalCount}"` : "";
    return `<card-repo-log${countAttr}>
${formattedCommits.join("\n\n")}
</card-repo-log>`;
  } catch {
    return null;
  }
}
var MAX_WORKSPACE_COMMITS_PER_BRANCH = 5;
function readWorkspaceData(cardRepoPath) {
  const branches = {};
  let commits = [];
  try {
    const raw = readFileSync2(join(cardRepoPath, WORKSPACE_BRANCHES_FILE), "utf-8");
    const parsed = JSON.parse(raw);
    for (const [name, meta] of Object.entries(parsed)) {
      if (meta && typeof meta === "object") {
        branches[name] = {
          parentBranch: typeof meta.parentBranch === "string" ? meta.parentBranch : void 0,
          addedAt: typeof meta.addedAt === "string" ? meta.addedAt : ""
        };
      }
    }
  } catch (error) {
    if (error.code !== "ENOENT") {
      return null;
    }
  }
  try {
    const raw = readFileSync2(join(cardRepoPath, WORKSPACE_COMMITS_FILE), "utf-8");
    commits = raw.split("\n").map((l) => l.trim()).filter((s) => s.length > 0);
  } catch (error) {
    if (error.code !== "ENOENT") {
      return null;
    }
  }
  if (Object.keys(branches).length === 0 && commits.length === 0) {
    return null;
  }
  return { branches, commits };
}
function getReachableShas(workspacePath, ref) {
  try {
    const output = execFileSync("git", ["log", "--format=%H", ref], {
      cwd: workspacePath,
      encoding: "utf-8",
      timeout: 1e4,
      stdio: ["pipe", "pipe", "pipe"]
    }).trim();
    return new Set(output ? output.split("\n") : []);
  } catch {
    return /* @__PURE__ */ new Set();
  }
}
function filterResolvableShas(workspacePath, shas) {
  if (shas.length === 0) return [];
  try {
    const output = execFileSync("git", ["cat-file", "--batch-check"], {
      input: `${shas.join("\n")}
`,
      cwd: workspacePath,
      encoding: "utf-8",
      timeout: 5e3,
      stdio: ["pipe", "pipe", "pipe"]
    }).trim();
    const lines = output.split("\n");
    const resolvable = [];
    for (let i = 0; i < lines.length && i < shas.length; i++) {
      if (!lines[i].includes("missing")) {
        resolvable.push(shas[i]);
      }
    }
    return resolvable;
  } catch {
    return [];
  }
}
function resolveWorkspaceCommitDetails(workspacePath, shas) {
  if (shas.length === 0) return null;
  try {
    const output = execFileSync("git", ["log", "--no-walk", "--pretty=format:%h - %s", "--stat", ...shas], {
      cwd: workspacePath,
      encoding: "utf-8",
      timeout: 5e3,
      stdio: ["pipe", "pipe", "pipe"]
    }).trim();
    if (!output) return null;
    return stripDiffstatSummaries(output) || null;
  } catch {
    return null;
  }
}
function buildWorkspaceRepoLogBlocks(workspacePath, cardRepoPath) {
  const workspace = readWorkspaceData(cardRepoPath);
  if (!workspace) return [];
  const baseBranch = process.env[CARDS_ENV_VARS.BASE_BRANCH] ?? "main";
  const sortedBranches = Object.entries(workspace.branches).sort(([, a], [, b]) => a.addedAt.localeCompare(b.addedAt));
  const reachableFromTracked = /* @__PURE__ */ new Set();
  const groups = [];
  for (const [name, meta] of sortedBranches) {
    const reachable = getReachableShas(workspacePath, name);
    const branchShas = workspace.commits.filter((sha) => reachable.has(sha));
    for (const sha of branchShas) reachableFromTracked.add(sha);
    if (branchShas.length > 0) {
      groups.push({ branchName: name, parentBranch: meta.parentBranch, shas: branchShas });
    }
  }
  const baseReachable = getReachableShas(workspacePath, baseBranch);
  const baseShas = workspace.commits.filter((sha) => baseReachable.has(sha) && !reachableFromTracked.has(sha));
  if (baseShas.length > 0) {
    groups.push({ branchName: baseBranch, shas: baseShas });
  }
  const orphanedShas = workspace.commits.filter((sha) => !reachableFromTracked.has(sha) && !baseReachable.has(sha));
  const resolvable = filterResolvableShas(workspacePath, orphanedShas);
  if (resolvable.length > 0) {
    groups.push({ branchName: "", shas: resolvable, orphaned: true });
  }
  const printedShas = /* @__PURE__ */ new Set();
  const blocks = [];
  for (const group of groups) {
    const newShas = group.shas.filter((sha) => !printedShas.has(sha));
    const dupShas = group.shas.filter((sha) => printedShas.has(sha));
    const displayShas = newShas.slice(-MAX_WORKSPACE_COMMITS_PER_BRANCH);
    const details = resolveWorkspaceCommitDetails(workspacePath, displayShas);
    if (details) {
      for (const sha of displayShas) printedShas.add(sha);
    }
    const bodyParts = [];
    if (details) bodyParts.push(details);
    if (dupShas.length > 0) {
      bodyParts.push(dupShas.map((sha) => sha.slice(0, 7)).join("\n"));
    }
    if (bodyParts.length === 0) continue;
    const attrs = [];
    if (group.orphaned) {
      attrs.push('orphaned="true"');
    } else {
      attrs.push(`branch="${group.branchName}"`);
      if (group.parentBranch) attrs.push(`parentBranch="${group.parentBranch}"`);
    }
    attrs.push(`count="${group.shas.length}"`);
    blocks.push(`<workspace-repo-log ${attrs.join(" ")}>
${bodyParts.join("\n")}
</workspace-repo-log>`);
  }
  return blocks;
}
function buildAdditionalContext(actionInput) {
  const cardBlock = buildCardBlock(actionInput);
  const repoBlock = buildCardRepoBlock(actionInput.cardRepoPath);
  const logBlock = buildCardRepoLogBlock(actionInput.cardRepoPath);
  const workspaceLogBlocks = buildWorkspaceRepoLogBlocks(actionInput.repoRoot, actionInput.cardRepoPath);
  const parts = [cardBlock, repoBlock];
  if (logBlock) parts.push(logBlock);
  parts.push(...workspaceLogBlocks);
  return parts.join("\n\n");
}

// src/subagent-start.ts
var subagent_start_default = subagentStartHook({}, async (_input, { logger: logger2 }) => {
  let actionInput;
  try {
    actionInput = extractActionInput();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger2.error("Not running inside an action subprocess", { error: message });
    return subagentStartOutput({
      systemMessage: "SubagentStart hook: not running inside an action subprocess."
    });
  }
  let systemMessage;
  try {
    systemMessage = buildAdditionalContext(actionInput);
  } catch (error) {
    if (error instanceof CardRepoAccessError) {
      logger2.error("Card repo inaccessible", { repoPath: error.repoPath, error: error.message });
      return subagentStartOutput({
        continue: false,
        ...error.toHookFailure("subagent")
      });
    }
    throw error;
  }
  return subagentStartOutput({
    systemMessage,
    hookSpecificOutput: {
      additionalContext: systemMessage
    }
  });
});

// src/subagent-start-entry.ts
process.env["CLAUDE_CODE_HOOKS_CLI_LOG_FILE"] = "/workspace/.worktrees/replace-node-sqlite3-wasm-with-node-sqlite/.cards/logs/claude-code-cards-runtime-hooks.log";
execute(subagent_start_default);
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vc2RrL3NyYy9jb25maWcvZW52LnRzIiwgIi4uLy4uLy4uL25vZGVfbW9kdWxlcy9AZ29vZGZvb3QvY2xhdWRlLWNvZGUtaG9va3MvZGlzdC9lbnYuanMiLCAiLi4vLi4vLi4vbm9kZV9tb2R1bGVzL0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcy9kaXN0L2hvb2tzLmpzIiwgIi4uLy4uLy4uL25vZGVfbW9kdWxlcy9AZ29vZGZvb3QvY2xhdWRlLWNvZGUtaG9va3MvZGlzdC9sb2dnZXIuanMiLCAiLi4vLi4vLi4vbm9kZV9tb2R1bGVzL0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcy9kaXN0L291dHB1dHMuanMiLCAiLi4vLi4vLi4vbm9kZV9tb2R1bGVzL0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcy9kaXN0L3J1bnRpbWUuanMiLCAic3JjL2xpYi9jb250ZXh0LnRzIiwgIi4uL3Nkay9zcmMvcHJvdG9jb2wvdHlwZXMvYnJhbmNoLnRzIiwgInNyYy9zdWJhZ2VudC1zdGFydC50cyIsICJzcmMvc3ViYWdlbnQtc3RhcnQtZW50cnkudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbIi8qKlxuICogRW52aXJvbm1lbnQgdmFyaWFibGUgdXRpbGl0aWVzIGZvciBDYXJkcyBFeHRlbnNpb24gYWN0aW9ucyBhbmQgdHlwZSBob29rcy5cbiAqXG4gKiBUaGUgZXhlY3V0aW9uIHdyYXBwZXIgaW5qZWN0cyBhY3Rpb24gYW5kIHR5cGUgaG9vayBpbnB1dHMgdmlhIHByb2Nlc3MuZW52LlxuICogVGhpcyBtb2R1bGUgcHJvdmlkZXMgc3RyaWN0IGdldHRlcnMgYW5kIHR5cGVkIGV4dHJhY3RvcnMgc28gaGFuZGxlcnMgZG8gbm90XG4gKiBuZWVkIHRvIHBhcnNlIGVudmlyb25tZW50IHZhcmlhYmxlcyBtYW51YWxseS5cbiAqXG4gKiBVc2UgdGhlIGluZGl2aWR1YWwgZ2V0dGVycyB3aGVuIHlvdSBvbmx5IG5lZWQgb25lIHZhbHVlOyB1c2VcbiAqIHtAbGluayBleHRyYWN0QWN0aW9uSW5wdXR9IG9yIHtAbGluayBleHRyYWN0VHlwZUlucHV0fSB3aGVuIHlvdSBuZWVkIGEgZnVsbFxuICogdHlwZWQgcGF5bG9hZCBmb3IgYW4gYWN0aW9uIG9yIHR5cGUgaG9vay5cbiAqXG4gKlxuICogQHN1bW1hcnkgRW52aXJvbm1lbnQgdmFyaWFibGUgdXRpbGl0aWVzIGZvciBDYXJkcyBFeHRlbnNpb24gYWN0aW9ucyBhbmQgdHlwZSBob29rc1xuICogQG1vZHVsZVxuICovXG5cbmltcG9ydCB7IHJlYWRGaWxlU3luYyB9IGZyb20gJ25vZGU6ZnMnO1xuaW1wb3J0IHR5cGUgeyBBY3Rpb25JbnB1dCwgVHlwZUhvb2tJbnB1dCB9IGZyb20gJy4vaW5wdXRzLmpzJztcblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gQ29uc3RhbnRzXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbi8qKlxuICogRW52aXJvbm1lbnQgdmFyaWFibGUgbmFtZXMgc2V0IGJ5IHRoZSBDYXJkcyBleGVjdXRpb24gd3JhcHBlci5cbiAqXG4gKiBUaGlzIGlzIHRoZSBzaW5nbGUgc291cmNlIG9mIHRydXRoIGZvciBlbnYgdmFyIGtleXMgdXNlZCBieSBhY3Rpb24gYW5kIHR5cGVcbiAqIGhvb2sgcHJvY2Vzc2VzLiBLZWVwIGl0IGluIHN5bmMgd2l0aCB0aGUgd3JhcHBlciB0byBhdm9pZCBzdWJ0bGUgXCJ1bmRlZmluZWRcbiAqIGlucHV0XCIgYnVncy5cbiAqL1xuZXhwb3J0IGNvbnN0IENBUkRTX0VOVl9WQVJTID0ge1xuICAvKipcbiAgICogVW5pcXVlIGlkZW50aWZpZXIgZm9yIHRoZSBjdXJyZW50IGNhcmQuXG4gICAqIEF2YWlsYWJsZSBpbiBhbGwgYWN0aW9ucyBhbmQgdHlwZSBob29rcy5cbiAgICovXG4gIENBUkRfSUQ6ICdDQVJEX0lEJyxcblxuICAvKipcbiAgICogVGhlIGVudmlyb25tZW50IG5hbWUgZnJvbSBzZXR0aW5ncy5qc29uLlxuICAgKiBBdmFpbGFibGUgaW4gYWxsIGFjdGlvbnMgYW5kIHR5cGUgaG9va3MuXG4gICAqL1xuICBFTlZJUk9OTUVOVDogJ0VOVklST05NRU5UJyxcblxuICAvKipcbiAgICogRGlzcGxheSBuYW1lIG9mIHRoZSBhY3Rpb24gYnV0dG9uIHRoYXQgdHJpZ2dlcmVkIHRoaXMgaGFuZGxlci5cbiAgICogQXZhaWxhYmxlIGluIGFjdGlvbnMgb25seSAobm90IHR5cGUgaG9va3MpLlxuICAgKi9cbiAgQUNUSU9OX05BTUU6ICdBQ1RJT05fTkFNRScsXG5cbiAgLyoqXG4gICAqIENhcmQncyBleGVjdXRpb24gbW9kZSwgZGV0ZXJtaW5pbmcgVUkgaW50ZXJhY3Rpb24gbW9kZWwuXG4gICAqIEF2YWlsYWJsZSBpbiBhY3Rpb25zIG9ubHkgKG5vdCB0eXBlIGhvb2tzKS5cbiAgICogVmFsaWQgdmFsdWVzOiAnaW50ZXJhY3RpdmUnIHwgJ2JhY2tncm91bmQnXG4gICAqL1xuICBFWEVDVVRJT05fTU9ERTogJ0VYRUNVVElPTl9NT0RFJyxcblxuICAvKipcbiAgICogQ2FyZHMgc2VydmVyIGJhc2UgVVJMIGZvciBBUEkgY2FsbHMuXG4gICAqIEF2YWlsYWJsZSBpbiBhbGwgYWN0aW9ucyBhbmQgdHlwZSBob29rcy5cbiAgICovXG4gIEFQSV9CQVNFX1VSTDogJ0FQSV9CQVNFX1VSTCcsXG5cbiAgLyoqXG4gICAqIEF1dGhlbnRpY2F0aW9uIHRva2VuIGZvciBBUEkgY2FsbHMuXG4gICAqIEF2YWlsYWJsZSBpbiBhbGwgYWN0aW9ucyBhbmQgdHlwZSBob29rcy5cbiAgICovXG4gIEFQSV9BQ0NFU1NfVE9LRU46ICdBUElfQUNDRVNTX1RPS0VOJyxcblxuICAvKipcbiAgICogQ29uZmlndXJlZCBjb2RpbmcgYWdlbnQgaWRlbnRpZmllciBmcm9tIGNhcmRzLmNvZGluZ0FnZW50IHNldHRpbmcuXG4gICAqIEF2YWlsYWJsZSBpbiBhY3Rpb25zIG9ubHkgKG5vdCB0eXBlIGhvb2tzKS5cbiAgICogT3B0aW9uYWwuXG4gICAqL1xuICBDT0RJTkdfQUdFTlQ6ICdDT0RJTkdfQUdFTlQnLFxuXG4gIC8qKlxuICAgKiBUaGUgcmVnaXN0ZXJlZCB0eXBlIG5hbWUuXG4gICAqIEF2YWlsYWJsZSBpbiB0eXBlIGhvb2tzIG9ubHkuXG4gICAqL1xuICBUWVBFX05BTUU6ICdUWVBFX05BTUUnLFxuXG4gIC8qKlxuICAgKiBUaGUgdHlwZSdzIHZlcnNpb24gc3RyaW5nIGZyb20gc2V0dGluZ3MuanNvbiBjb25maWd1cmF0aW9uLlxuICAgKiBBdmFpbGFibGUgaW4gdHlwZSBob29rcyBvbmx5LlxuICAgKi9cbiAgVFlQRV9WRVJTSU9OOiAnVFlQRV9WRVJTSU9OJyxcblxuICAvKipcbiAgICogVGhlIGZpbGUgbmFtZSB3aXRoaW4gdGhlIHR5cGUgZGlyZWN0b3J5LlxuICAgKiBBdmFpbGFibGUgaW4gdHlwZSBob29rcyBvbmx5LlxuICAgKi9cbiAgRklMRV9OQU1FOiAnRklMRV9OQU1FJyxcblxuICAvKipcbiAgICogRnVsbCBwYXRoIHRvIHRoZSBmaWxlLlxuICAgKiBBdmFpbGFibGUgaW4gdHlwZSBob29rcyBvbmx5LlxuICAgKi9cbiAgRklMRV9QQVRIOiAnRklMRV9QQVRIJyxcblxuICAvKipcbiAgICogRmlsZSBzaXplIGluIGJ5dGVzLlxuICAgKiBBdmFpbGFibGUgaW4gdHlwZSBob29rcyBvbmx5LlxuICAgKi9cbiAgRklMRV9TSVpFOiAnRklMRV9TSVpFJyxcblxuICAvKipcbiAgICogU0hBMjU2IGhhc2ggb2YgY29udGVudC5cbiAgICogQXZhaWxhYmxlIGluIHR5cGUgaG9va3Mgb25seS5cbiAgICovXG4gIFNIQTI1NjogJ1NIQTI1NicsXG5cbiAgLyoqXG4gICAqIE1JTUUgdHlwZSBvZiB0aGUgY29udGVudC5cbiAgICogQXZhaWxhYmxlIGluIHR5cGUgaG9va3Mgb25seS5cbiAgICovXG4gIENPTlRFTlRfVFlQRTogJ0NPTlRFTlRfVFlQRScsXG5cbiAgLyoqXG4gICAqIFBhdGggdG8gdGhlIFZTIENvZGUgYnVuZGxlZCBOb2RlLmpzIGludGVycHJldGVyLlxuICAgKlxuICAgKiBTZXQgYnkgdGhlIGV4dGVuc2lvbiBob3N0IGZyb20gYHByb2Nlc3MuZXhlY1BhdGhgICh3aXRoXG4gICAqIGBFTEVDVFJPTl9SVU5fQVNfTk9ERT0xYCkuIENvbW1hbmRzIGluIHNldHRpbmdzLmpzb24gdXNlXG4gICAqIGAkVlNDT0RFX05PREUgLi9iaW4vLi4uYCBzbyB0aGV5IHdvcmsgcmVnYXJkbGVzcyBvZlxuICAgKiB3aGV0aGVyIGBub2RlYCBpcyBvbiB0aGUgc3lzdGVtIFBBVEguXG4gICAqXG4gICAqIEF2YWlsYWJsZSBpbiBhbGwgYWN0aW9ucyBhbmQgdHlwZSBob29rcy5cbiAgICovXG4gIFZTQ09ERV9OT0RFOiAnVlNDT0RFX05PREUnLFxuXG4gIC8qKlxuICAgKiBQYXRoIHRvIHRoZSBOb2RlLmpzIGludGVycHJldGVyIHJ1bm5pbmcgdGhlIHdyYXBwZXIgcHJvY2Vzcy5cbiAgICpcbiAgICogU2V0IGJ5IHRoZSB3cmFwcGVyIGZyb20gYHByb2Nlc3MuZXhlY1BhdGhgLiBVc2UgYCROT0RFYCBpbiBlbWJlZGRlZFxuICAgKiBiYXNoIHN0YXRlbWVudHMgdG8gaW52b2tlIE5vZGUgc2NyaXB0cyBwb3J0YWJseS5cbiAgICpcbiAgICogQXZhaWxhYmxlIGluIGFsbCBhY3Rpb25zLlxuICAgKi9cbiAgTk9ERTogJ05PREUnLFxuXG4gIC8qKlxuICAgKiBQYXRoIHRvIHRoZSBVbml4IGRvbWFpbiBzb2NrZXQgZm9yIHJ1bnRpbWUtdG8tZGlzcGF0Y2hlciBjb21tdW5pY2F0aW9uLlxuICAgKiBBdmFpbGFibGUgaW4gYWN0aW9ucyBvbmx5LlxuICAgKi9cbiAgU09DS0VUX1BBVEg6ICdTT0NLRVRfUEFUSCcsXG5cbiAgLyoqXG4gICAqIFBhdGggdG8gYSBKU09OIGZpbGUgY29udGFpbmluZyBzd2l0Y2hUb0ludGVyYWN0aXZlIGRhdGEgZnJvbSBhIHByZXZpb3VzIGhhbmRsZXIuXG4gICAqIEF2YWlsYWJsZSBpbiBhY3Rpb25zIG9ubHkuIE9wdGlvbmFsLlxuICAgKi9cbiAgU1dJVENIX1RPX0lOVEVSQUNUSVZFX0RBVEFfUEFUSDogJ1NXSVRDSF9UT19JTlRFUkFDVElWRV9EQVRBX1BBVEgnLFxuXG4gIC8qKlxuICAgKiBQYXRoIHRvIHRoZSBzZXR0aW5ncyBjb25maWd1cmF0aW9uIGRpcmVjdG9yeS5cbiAgICogQXZhaWxhYmxlIGluIGFjdGlvbnMgb25seS5cbiAgICovXG4gIENPTkZJR19QQVRIOiAnQ09ORklHX1BBVEgnLFxuXG4gIC8qKlxuICAgKiBQYXRoIHRvIHRoZSBWUyBDb2RlIHdvcmtzcGFjZSByb290IGRpcmVjdG9yeS5cbiAgICogU2V0IGJ5IHRoZSBhY3Rpb24gaGFuZGxlciAoZS5nLiwgbGF1bmNoLnRzKSB0byB0aGUgd29ya3RyZWUgcGF0aC5cbiAgICogQXZhaWxhYmxlIGluIGhvb2tzIHJ1bm5pbmcgaW5zaWRlIHRoZSBjbGF1ZGUgQ0xJLlxuICAgKi9cbiAgV09SS1NQQUNFX1BBVEg6ICdXT1JLU1BBQ0VfUEFUSCcsXG5cbiAgLyoqXG4gICAqIEFic29sdXRlIHBhdGggdG8gdGhlIG1haW4gZ2l0IHJlcG9zaXRvcnkgcm9vdCAoTk9UIGEgd29ya3RyZWUpLlxuICAgKiBTZXQgYnkgQWN0aW9uRGlzcGF0Y2hlcjsgY29uc3VtZWQgYnkgdGhlIHdyYXBwZXIgYW5kIHdhdGNoZXIgZm9yXG4gICAqIGdpdCBvcGVyYXRpb25zICh3b3JrdHJlZSByZW1vdmFsLCBicmFuY2ggZGVsZXRpb24pIHRoYXQgbXVzdCBydW5cbiAgICogYWdhaW5zdCB0aGUgbWFpbiByZXBvc2l0b3J5LlxuICAgKi9cbiAgUkVQT19ST09UOiAnUkVQT19ST09UJyxcblxuICAvKipcbiAgICogUGF0aCB0byB0aGUgY2FyZCdzIHJlcG9zaXRvcnkgZGlyZWN0b3J5LlxuICAgKiBBdmFpbGFibGUgaW4gYWN0aW9ucyBvbmx5LlxuICAgKi9cbiAgQ0FSRF9SRVBPX1BBVEg6ICdDQVJEX1JFUE9fUEFUSCcsXG5cbiAgLyoqXG4gICAqIFJlc29sdmVkIHNoZWxsIGNvbW1hbmQgZm9yIHRoZSB3cmFwcGVyIHRvIHNwYXduIGFzIHRoZSBhY3Rpb24gaGFuZGxlci5cbiAgICogU2V0IGJ5IEFjdGlvbkRpc3BhdGNoZXI7IGNvbnN1bWVkIGJ5IHRoZSB3cmFwcGVyIChub3QgYnkgYWN0aW9uIGhhbmRsZXJzKS5cbiAgICovXG4gIEFDVElPTl9DT01NQU5EOiAnQUNUSU9OX0NPTU1BTkQnLFxuXG4gIC8qKlxuICAgKiBHaXQgYnJhbmNoIHRoYXQgdGhlIGNhcmQncyB3b3Jrc3BhY2UgYnJhbmNoIHdpbGwgbWVyZ2UgaW50by5cbiAgICogUmVzb2x2ZWQgZnJvbSB0aGUgd29ya3NwYWNlIEhFQUQgYXQgbGF1bmNoIHRpbWUuXG4gICAqIFNldCBieSB0aGUgbGF1bmNoIGFjdGlvbi5cbiAgICogQXZhaWxhYmxlIGluIGFjdGlvbnMgb25seS5cbiAgICovXG4gIEJBU0VfQlJBTkNIOiAnQkFTRV9CUkFOQ0gnLFxuXG4gIC8qKlxuICAgKiBHaXQgYnJhbmNoIGZyb20gd2hpY2ggdGhlIGNhcmQncyB3b3Jrc3BhY2UgYnJhbmNoIHdhcyBjcmVhdGVkLlxuICAgKiBNYXkgZGlmZmVyIGZyb20gQkFTRV9CUkFOQ0ggd2hlbiB0aGUgd29ya3RyZWUgd2FzIGNyZWF0ZWQgYWdhaW5zdFxuICAgKiBhIGRpZmZlcmVudCByZWYgdGhhbiB0aGUgY3VycmVudCB3b3Jrc3BhY2UgSEVBRC5cbiAgICogU2V0IGJ5IHRoZSBsYXVuY2ggYWN0aW9uLlxuICAgKiBBdmFpbGFibGUgaW4gYWN0aW9ucyBvbmx5LlxuICAgKi9cbiAgUEFSRU5UX0JSQU5DSDogJ1BBUkVOVF9CUkFOQ0gnLFxuXG4gIC8qKlxuICAgKiBHaXQgYnJhbmNoIG5hbWUgZm9yIHRoZSBjYXJkJ3Mgd29ya3NwYWNlIGltcGxlbWVudGF0aW9uLlxuICAgKiBTZXQgYnkgdGhlIGxhdW5jaCBhY3Rpb24gYWZ0ZXIgcmVzb2x2aW5nIG9yIGNyZWF0aW5nIHRoZSB3b3JrdHJlZS5cbiAgICogQXZhaWxhYmxlIGluIGFjdGlvbnMgb25seS5cbiAgICovXG4gIFdPUktTUEFDRV9CUkFOQ0g6ICdXT1JLU1BBQ0VfQlJBTkNIJyxcblxuICAvKipcbiAgICogU2Vzc2lvbiBJRCBwZXJzaXN0ZWQgYnkgdGhlIHNlc3Npb24tc3RhcnQgaG9vayB2aWEgYHBlcnNpc3RFbnZWYXJgLlxuICAgKlxuICAgKiBBdmFpbGFibGUgaW4gQmFzaCB0b29sIHNoZWxsIGRlc2NlbmRhbnRzIChjb21tYW5kcywgZ2l0IGhvb2tzKSBhZnRlclxuICAgKiBzZXNzaW9uIHN0YXJ0LiBOT1QgYXZhaWxhYmxlIGluIGhvb2tzIHNwYXduZWQgZGlyZWN0bHkgYnkgQ2xhdWRlIENvZGVcbiAgICogKHN0b3AsIHNlc3Npb24tZW5kLCBldGMuKSBcdTIwMTQgdGhvc2UgcmVjZWl2ZSB0aGUgc2Vzc2lvbiBJRCB2aWEgaG9vayBpbnB1dC5cbiAgICpcbiAgICogVGhlIGNhcmQtcmVwbyBwb3N0LWNvbW1pdCBob29rIHJlYWRzIHRoaXMgdG8gcmVjb3JkIGNvbW1pdHMgZGlyZWN0bHlcbiAgICogd2l0aG91dCBuZWVkaW5nIGEgcHJvY2Vzcy10cmVlIHdhbGsgb3IgUElEIHJlZ2lzdHJ5IGxvb2t1cC5cbiAgICovXG4gIENBUkRTX1NFU1NJT05fSUQ6ICdDQVJEU19TRVNTSU9OX0lEJyxcblxuICAvKipcbiAgICogQWJzb2x1dGUgcGF0aCB0byB0aGUgVlMgQ29kZSBleHRlbnNpb24gaW5zdGFsbGF0aW9uIGRpcmVjdG9yeS5cbiAgICpcbiAgICogU2V0IGJ5IHRoZSBleHRlbnNpb24gaG9zdCBmcm9tIGBjb250ZXh0LmV4dGVuc2lvblVyaS5mc1BhdGhgIGFuZCBpbmplY3RlZFxuICAgKiBpbnRvIGFsbCBzcGF3bmVkIGFjdGlvbiBwcm9jZXNzZXMuIFVzZSB0aGlzIHRvIGxvY2F0ZSBidW5kbGVkIGFzc2V0cyBzdWNoXG4gICAqIGFzIHRoZSBydW50aW1lIHBsdWdpbiBkaXJlY3RvcnkgKGA8ZXh0ZW5zaW9uUGF0aD4vZGlzdC9wbHVnaW5zL3J1bnRpbWVgKS5cbiAgICpcbiAgICogQXZhaWxhYmxlIGluIGFjdGlvbnMgb25seSAobm90IHR5cGUgaG9va3MpLlxuICAgKi9cbiAgRVhURU5TSU9OX1BBVEg6ICdFWFRFTlNJT05fUEFUSCdcbn0gYXMgY29uc3Q7XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIEluZGl2aWR1YWwgR2V0dGVyc1xuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4vKipcbiAqIFJlYWRzIHRoZSBjYXJkIGlkZW50aWZpZXIgZnJvbSB0aGUgZW52aXJvbm1lbnQuXG4gKlxuICogVGhlIGV4ZWN1dGlvbiB3cmFwcGVyIGFsd2F5cyBzZXRzIHRoaXMgZm9yIGV2ZXJ5IGFjdGlvbiBhbmQgdHlwZSBob29rLlxuICogQHJldHVybnMgVGhlIGN1cnJlbnQgY2FyZCBJRFxuICogQHRocm93cyBFcnJvciBpZiBDQVJEX0lEIGlzIG1pc3Npbmcgb3IgZW1wdHlcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBjb25zdCBjYXJkSWQgPSBnZXRDYXJkSWQoKTtcbiAqIGNvbnNvbGUubG9nKGBQcm9jZXNzaW5nIGNhcmQ6ICR7Y2FyZElkfWApO1xuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRDYXJkSWQoKTogc3RyaW5nIHtcbiAgY29uc3QgdmFsdWUgPSBwcm9jZXNzLmVudltDQVJEU19FTlZfVkFSUy5DQVJEX0lEXTtcbiAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQgfHwgdmFsdWUgPT09ICcnKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIHJlcXVpcmVkIGVudmlyb25tZW50IHZhcmlhYmxlOiAke0NBUkRTX0VOVl9WQVJTLkNBUkRfSUR9YCk7XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG4vKipcbiAqIFJlYWRzIHRoZSBlbnZpcm9ubWVudCBuYW1lIGZyb20gdGhlIGVudmlyb25tZW50LlxuICpcbiAqIFRoaXMgdmFsdWUgbWF0Y2hlcyB0aGUgZW52aXJvbm1lbnQga2V5IGluIHNldHRpbmdzLmpzb24gKGUuZy4sIFwiZGVmYXVsdFwiLCBcInN0YWdpbmdcIikuXG4gKiBAcmV0dXJucyBUaGUgZW52aXJvbm1lbnQgbmFtZVxuICogQHRocm93cyBFcnJvciBpZiBFTlZJUk9OTUVOVCBpcyBtaXNzaW5nIG9yIGVtcHR5XG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogY29uc3QgZW52aXJvbm1lbnQgPSBnZXRFbnZpcm9ubWVudCgpO1xuICogY29uc29sZS5sb2coYEVudmlyb25tZW50OiAke2Vudmlyb25tZW50fWApO1xuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRFbnZpcm9ubWVudCgpOiBzdHJpbmcge1xuICBjb25zdCB2YWx1ZSA9IHByb2Nlc3MuZW52W0NBUkRTX0VOVl9WQVJTLkVOVklST05NRU5UXTtcbiAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQgfHwgdmFsdWUgPT09ICcnKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIHJlcXVpcmVkIGVudmlyb25tZW50IHZhcmlhYmxlOiAke0NBUkRTX0VOVl9WQVJTLkVOVklST05NRU5UfWApO1xuICB9XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuLyoqXG4gKiBSZWFkcyB0aGUgYWN0aW9uIGJ1dHRvbiBuYW1lIGZyb20gdGhlIGVudmlyb25tZW50LlxuICpcbiAqIFRoaXMgaXMgdGhlIGRpc3BsYXkgbmFtZSBvZiB0aGUgYWN0aW9uIHRoYXQgdHJpZ2dlcmVkIHRoZSBoYW5kbGVyLCBtYXRjaGluZ1xuICogdGhlIGBhY3Rpb25OYW1lYCBmaWVsZCBmcm9tIGBkZWZpbmVBY3Rpb25gLlxuICogQHJldHVybnMgRGlzcGxheSBuYW1lIG9mIHRoZSBhY3Rpb24gdGhhdCB0cmlnZ2VyZWQgdGhlIGN1cnJlbnQgaGFuZGxlciBydW4uXG4gKiBAdGhyb3dzIEVycm9yIGlmIEFDVElPTl9OQU1FIGlzIG1pc3Npbmcgb3IgZW1wdHlcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBjb25zdCBhY3Rpb25OYW1lID0gZ2V0QWN0aW9uTmFtZSgpO1xuICogY29uc29sZS5sb2coYFJ1bm5pbmcgYWN0aW9uOiAke2FjdGlvbk5hbWV9YCk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldEFjdGlvbk5hbWUoKTogc3RyaW5nIHtcbiAgY29uc3QgdmFsdWUgPSBwcm9jZXNzLmVudltDQVJEU19FTlZfVkFSUy5BQ1RJT05fTkFNRV07XG4gIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IHZhbHVlID09PSAnJykge1xuICAgIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyByZXF1aXJlZCBlbnZpcm9ubWVudCB2YXJpYWJsZTogJHtDQVJEU19FTlZfVkFSUy5BQ1RJT05fTkFNRX1gKTtcbiAgfVxuICByZXR1cm4gdmFsdWU7XG59XG5cbi8qKlxuICogUmVhZHMgdGhlIGV4ZWN1dGlvbiBtb2RlIGZyb20gdGhlIGVudmlyb25tZW50LlxuICpcbiAqIERldGVybWluZXMgdGhlIFVJIGludGVyYWN0aW9uIG1vZGVsIGZvciBhY3Rpb25zLlxuICogQHJldHVybnMgVGhlIGV4ZWN1dGlvbiBtb2RlICgnaW50ZXJhY3RpdmUnIG9yICdiYWNrZ3JvdW5kJylcbiAqIEB0aHJvd3MgRXJyb3IgaWYgRVhFQ1VUSU9OX01PREUgaXMgbWlzc2luZywgZW1wdHksIG9yIGludmFsaWRcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBjb25zdCBtb2RlID0gZ2V0RXhlY3V0aW9uTW9kZSgpO1xuICogaWYgKG1vZGUgPT09ICdpbnRlcmFjdGl2ZScpIHtcbiAqICAgLy8gU2hvdyB1c2VyIHByb21wdHNcbiAqIH1cbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0RXhlY3V0aW9uTW9kZSgpOiAnaW50ZXJhY3RpdmUnIHwgJ2JhY2tncm91bmQnIHtcbiAgY29uc3QgdmFsdWUgPSBwcm9jZXNzLmVudltDQVJEU19FTlZfVkFSUy5FWEVDVVRJT05fTU9ERV07XG4gIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IHZhbHVlID09PSAnJykge1xuICAgIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyByZXF1aXJlZCBlbnZpcm9ubWVudCB2YXJpYWJsZTogJHtDQVJEU19FTlZfVkFSUy5FWEVDVVRJT05fTU9ERX1gKTtcbiAgfVxuICBpZiAodmFsdWUgIT09ICdpbnRlcmFjdGl2ZScgJiYgdmFsdWUgIT09ICdiYWNrZ3JvdW5kJykge1xuICAgIHRocm93IG5ldyBFcnJvcihgSW52YWxpZCAke0NBUkRTX0VOVl9WQVJTLkVYRUNVVElPTl9NT0RFfTogZXhwZWN0ZWQgJ2ludGVyYWN0aXZlJyBvciAnYmFja2dyb3VuZCcsIGdvdCBcIiR7dmFsdWV9XCJgKTtcbiAgfVxuICByZXR1cm4gdmFsdWU7XG59XG5cbi8qKlxuICogUmVhZHMgdGhlIEFQSSBiYXNlIFVSTCBmcm9tIHRoZSBlbnZpcm9ubWVudC5cbiAqXG4gKiBVc2UgdGhpcyBhcyB0aGUgYmFzZSBmb3IgY29uc3RydWN0aW5nIEFQSSBlbmRwb2ludHMuIFRoZSBVUkwgZG9lcyBub3QgaW5jbHVkZVxuICogYSB0cmFpbGluZyBzbGFzaC5cbiAqIEByZXR1cm5zIEJhc2UgVVJMIHVzZWQgdG8gY29uc3RydWN0IENhcmRzIEFQSSBlbmRwb2ludHMgZm9yIHRoaXMgZXhlY3V0aW9uLlxuICogQHRocm93cyBFcnJvciBpZiBBUElfQkFTRV9VUkwgaXMgbWlzc2luZyBvciBlbXB0eVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGNvbnN0IGFwaVVybCA9IGdldEFwaUJhc2VVcmwoKTtcbiAqIGNvbnN0IGVuZHBvaW50ID0gYCR7YXBpVXJsfS9jYXJkcy8ke2NhcmRJZH1gO1xuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRBcGlCYXNlVXJsKCk6IHN0cmluZyB7XG4gIGNvbnN0IHZhbHVlID0gcHJvY2Vzcy5lbnZbQ0FSRFNfRU5WX1ZBUlMuQVBJX0JBU0VfVVJMXTtcbiAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQgfHwgdmFsdWUgPT09ICcnKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIHJlcXVpcmVkIGVudmlyb25tZW50IHZhcmlhYmxlOiAke0NBUkRTX0VOVl9WQVJTLkFQSV9CQVNFX1VSTH1gKTtcbiAgfVxuICByZXR1cm4gdmFsdWU7XG59XG5cbi8qKlxuICogUmVhZHMgdGhlIEFQSSBhY2Nlc3MgdG9rZW4gZnJvbSB0aGUgZW52aXJvbm1lbnQuXG4gKlxuICogQmVhcmVyIHRva2VuIHZhbGlkIGZvciB0aGUgZHVyYXRpb24gb2YgdGhpcyBhY3Rpb24gb3IgdHlwZSBob29rIGV4ZWN1dGlvbi5cbiAqIEluY2x1ZGUgaW4gQXV0aG9yaXphdGlvbiBoZWFkZXJzIHdoZW4gY2FsbGluZyB0aGUgQ2FyZHMgQVBJLlxuICogQHJldHVybnMgQmVhcmVyIHRva2VuIHRoYXQgYXV0aG9yaXplcyBBUEkgcmVxdWVzdHMgZm9yIHRoaXMgZXhlY3V0aW9uIGNvbnRleHQuXG4gKiBAdGhyb3dzIEVycm9yIGlmIEFQSV9BQ0NFU1NfVE9LRU4gaXMgbWlzc2luZyBvciBlbXB0eVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGNvbnN0IHRva2VuID0gZ2V0QXBpQWNjZXNzVG9rZW4oKTtcbiAqIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZmV0Y2goYXBpVXJsLCB7XG4gKiAgIGhlYWRlcnM6IHsgQXV0aG9yaXphdGlvbjogYEJlYXJlciAke3Rva2VufWAgfVxuICogfSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldEFwaUFjY2Vzc1Rva2VuKCk6IHN0cmluZyB7XG4gIGNvbnN0IHZhbHVlID0gcHJvY2Vzcy5lbnZbQ0FSRFNfRU5WX1ZBUlMuQVBJX0FDQ0VTU19UT0tFTl07XG4gIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IHZhbHVlID09PSAnJykge1xuICAgIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyByZXF1aXJlZCBlbnZpcm9ubWVudCB2YXJpYWJsZTogJHtDQVJEU19FTlZfVkFSUy5BUElfQUNDRVNTX1RPS0VOfWApO1xuICB9XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuLyoqXG4gKiBSZWFkcyB0aGUgY29uZmlndXJlZCBjb2RpbmcgYWdlbnQgaWRlbnRpZmllciBmcm9tIHRoZSBlbnZpcm9ubWVudC5cbiAqXG4gKiBPcHRpb25hbCB2YWx1ZSBmcm9tIGNhcmRzLmNvZGluZ0FnZW50IHNldHRpbmcuIFdoZW4gc2V0LCBpbmRpY2F0ZXMgd2hpY2ggQUlcbiAqIGNvZGluZyBhc3Npc3RhbnQgdGhlIHVzZXIgcHJlZmVycy4gQWN0aW9ucyBjYW4gdXNlIHRoaXMgdG8gY3VzdG9taXplIGJlaGF2aW9yXG4gKiBvciBwcm9tcHRzIGZvciBkaWZmZXJlbnQgYWdlbnRzLlxuICogQHJldHVybnMgVGhlIGNvZGluZyBhZ2VudCBpZGVudGlmaWVyLCBvciB1bmRlZmluZWQgaWYgbm90IHNldFxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGNvbnN0IGNvZGluZ0FnZW50ID0gZ2V0Q29kaW5nQWdlbnQoKTtcbiAqIGlmIChjb2RpbmdBZ2VudCA9PT0gJ2NsYXVkZScpIHtcbiAqICAgLy8gQ3VzdG9taXplIGZvciBDbGF1ZGVcbiAqIH1cbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0Q29kaW5nQWdlbnQoKTogc3RyaW5nIHwgdW5kZWZpbmVkIHtcbiAgY29uc3QgdmFsdWUgPSBwcm9jZXNzLmVudltDQVJEU19FTlZfVkFSUy5DT0RJTkdfQUdFTlRdO1xuICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gJycpIHtcbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuLyoqXG4gKiBSZWFkcyB0aGUgcmVnaXN0ZXJlZCB0eXBlIG5hbWUgZm9yIHR5cGUgaG9va3MuXG4gKlxuICogVGhpcyB2YWx1ZSBpcyBvbmx5IHByZXNlbnQgZm9yIHR5cGUgaG9vayBldmVudHMuXG4gKiBAcmV0dXJucyBUaGUgcmVnaXN0ZXJlZCB0eXBlIG5hbWVcbiAqIEB0aHJvd3MgRXJyb3IgaWYgVFlQRV9OQU1FIGlzIG1pc3Npbmcgb3IgZW1wdHlcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBjb25zdCB0eXBlTmFtZSA9IGdldFR5cGVOYW1lKCk7XG4gKiBjb25zb2xlLmxvZyhgVHlwZTogJHt0eXBlTmFtZX1gKTtcbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0VHlwZU5hbWUoKTogc3RyaW5nIHtcbiAgY29uc3QgdmFsdWUgPSBwcm9jZXNzLmVudltDQVJEU19FTlZfVkFSUy5UWVBFX05BTUVdO1xuICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gJycpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYE1pc3NpbmcgcmVxdWlyZWQgZW52aXJvbm1lbnQgdmFyaWFibGU6ICR7Q0FSRFNfRU5WX1ZBUlMuVFlQRV9OQU1FfWApO1xuICB9XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuLyoqXG4gKiBSZWFkcyB0aGUgdHlwZSB2ZXJzaW9uIGZyb20gdGhlIGVudmlyb25tZW50LlxuICpcbiAqIFRoaXMgdmVyc2lvbiBjb21lcyBmcm9tIHRoZSB0eXBlIGNvbmZpZ3VyYXRpb24gaW4gc2V0dGluZ3MuanNvbi5cbiAqIEByZXR1cm5zIFRoZSB2ZXJzaW9uIHN0cmluZyBmcm9tIHR5cGUgY29uZmlnXG4gKiBAdGhyb3dzIEVycm9yIGlmIFRZUEVfVkVSU0lPTiBpcyBtaXNzaW5nIG9yIGVtcHR5XG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogY29uc3QgdmVyc2lvbiA9IGdldFR5cGVWZXJzaW9uKCk7XG4gKiBjb25zb2xlLmxvZyhgVmVyc2lvbjogJHt2ZXJzaW9ufWApO1xuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRUeXBlVmVyc2lvbigpOiBzdHJpbmcge1xuICBjb25zdCB2YWx1ZSA9IHByb2Nlc3MuZW52W0NBUkRTX0VOVl9WQVJTLlRZUEVfVkVSU0lPTl07XG4gIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IHZhbHVlID09PSAnJykge1xuICAgIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyByZXF1aXJlZCBlbnZpcm9ubWVudCB2YXJpYWJsZTogJHtDQVJEU19FTlZfVkFSUy5UWVBFX1ZFUlNJT059YCk7XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG4vKipcbiAqIFJlYWRzIHRoZSB0eXBlZCBmaWxlIG5hbWUgZm9yIHR5cGUgaG9vayBldmVudHMuXG4gKlxuICogVGhpcyBpcyB0aGUgZmlsZSBuYW1lIHJlbGF0aXZlIHRvIHRoZSB0eXBlIGRpcmVjdG9yeSwgbm90IGEgZnVsbCBwYXRoLlxuICogQHJldHVybnMgVGhlIGZpbGUgbmFtZSB3aXRoaW4gdGhlIHR5cGUgZGlyZWN0b3J5XG4gKiBAdGhyb3dzIEVycm9yIGlmIEZJTEVfTkFNRSBpcyBtaXNzaW5nIG9yIGVtcHR5XG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogY29uc3QgZmlsZU5hbWUgPSBnZXRGaWxlTmFtZSgpO1xuICogY29uc29sZS5sb2coYEZpbGU6ICR7ZmlsZU5hbWV9YCk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldEZpbGVOYW1lKCk6IHN0cmluZyB7XG4gIGNvbnN0IHZhbHVlID0gcHJvY2Vzcy5lbnZbQ0FSRFNfRU5WX1ZBUlMuRklMRV9OQU1FXTtcbiAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQgfHwgdmFsdWUgPT09ICcnKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIHJlcXVpcmVkIGVudmlyb25tZW50IHZhcmlhYmxlOiAke0NBUkRTX0VOVl9WQVJTLkZJTEVfTkFNRX1gKTtcbiAgfVxuICByZXR1cm4gdmFsdWU7XG59XG5cbi8qKlxuICogUmVhZHMgdGhlIGFic29sdXRlIHBhdGggdG8gdGhlIHR5cGVkIGZpbGUuXG4gKlxuICogVGhpcyBpcyB0aGUgZnVsbHkgcmVzb2x2ZWQgcGF0aCBvbiBkaXNrIHByb3ZpZGVkIGJ5IHRoZSBleGVjdXRpb24gd3JhcHBlci5cbiAqIEByZXR1cm5zIFRoZSBmdWxsIHBhdGggdG8gdGhlIGZpbGVcbiAqIEB0aHJvd3MgRXJyb3IgaWYgRklMRV9QQVRIIGlzIG1pc3Npbmcgb3IgZW1wdHlcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBjb25zdCBmaWxlUGF0aCA9IGdldEZpbGVQYXRoKCk7XG4gKiBjb25zb2xlLmxvZyhgUGF0aDogJHtmaWxlUGF0aH1gKTtcbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0RmlsZVBhdGgoKTogc3RyaW5nIHtcbiAgY29uc3QgdmFsdWUgPSBwcm9jZXNzLmVudltDQVJEU19FTlZfVkFSUy5GSUxFX1BBVEhdO1xuICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gJycpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYE1pc3NpbmcgcmVxdWlyZWQgZW52aXJvbm1lbnQgdmFyaWFibGU6ICR7Q0FSRFNfRU5WX1ZBUlMuRklMRV9QQVRIfWApO1xuICB9XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuLyoqXG4gKiBSZWFkcyB0aGUgdHlwZWQgZmlsZSBzaXplIGZyb20gdGhlIGVudmlyb25tZW50LlxuICpcbiAqIFRoZSB2YWx1ZSBpcyBwYXJzZWQgYXMgYSBiYXNlLTEwIGludGVnZXIuXG4gKiBAcmV0dXJucyBUaGUgZmlsZSBzaXplIGluIGJ5dGVzXG4gKiBAdGhyb3dzIEVycm9yIGlmIEZJTEVfU0laRSBpcyBtaXNzaW5nIG9yIG5vdCBhIG51bWJlclxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGNvbnN0IHNpemUgPSBnZXRGaWxlU2l6ZSgpO1xuICogY29uc29sZS5sb2coYFNpemU6ICR7c2l6ZX0gYnl0ZXNgKTtcbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0RmlsZVNpemUoKTogbnVtYmVyIHtcbiAgY29uc3QgdmFsdWUgPSBwcm9jZXNzLmVudltDQVJEU19FTlZfVkFSUy5GSUxFX1NJWkVdO1xuICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gJycpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYE1pc3NpbmcgcmVxdWlyZWQgZW52aXJvbm1lbnQgdmFyaWFibGU6ICR7Q0FSRFNfRU5WX1ZBUlMuRklMRV9TSVpFfWApO1xuICB9XG4gIGNvbnN0IHNpemUgPSBOdW1iZXIucGFyc2VJbnQodmFsdWUsIDEwKTtcbiAgaWYgKE51bWJlci5pc05hTihzaXplKSkge1xuICAgIHRocm93IG5ldyBFcnJvcihgSW52YWxpZCAke0NBUkRTX0VOVl9WQVJTLkZJTEVfU0laRX06IGV4cGVjdGVkIG51bWJlciwgZ290IFwiJHt2YWx1ZX1cImApO1xuICB9XG4gIHJldHVybiBzaXplO1xufVxuXG4vKipcbiAqIFJlYWRzIHRoZSBTSEEyNTYgaGFzaCBmb3IgdGhlIHR5cGVkIGZpbGUgY29udGVudC5cbiAqXG4gKiBVc2VmdWwgZm9yIGRldGVjdGluZyBjb250ZW50IGNoYW5nZXMgd2l0aG91dCByZWFkaW5nIHRoZSBmaWxlIGFnYWluLlxuICogQHJldHVybnMgVGhlIFNIQTI1NiBoYXNoIG9mIHRoZSBjb250ZW50XG4gKiBAdGhyb3dzIEVycm9yIGlmIFNIQTI1NiBpcyBtaXNzaW5nIG9yIGVtcHR5XG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogY29uc3QgaGFzaCA9IGdldFNoYTI1NigpO1xuICogY29uc29sZS5sb2coYEhhc2g6ICR7aGFzaH1gKTtcbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0U2hhMjU2KCk6IHN0cmluZyB7XG4gIGNvbnN0IHZhbHVlID0gcHJvY2Vzcy5lbnZbQ0FSRFNfRU5WX1ZBUlMuU0hBMjU2XTtcbiAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQgfHwgdmFsdWUgPT09ICcnKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIHJlcXVpcmVkIGVudmlyb25tZW50IHZhcmlhYmxlOiAke0NBUkRTX0VOVl9WQVJTLlNIQTI1Nn1gKTtcbiAgfVxuICByZXR1cm4gdmFsdWU7XG59XG5cbi8qKlxuICogUmVhZHMgdGhlIE1JTUUgdHlwZSBmb3IgdGhlIHR5cGVkIGZpbGUgY29udGVudC5cbiAqXG4gKiBQcm92aWRlZCBmb3IgdHlwZSBob29rIGV2ZW50cyBzbyB2YWxpZGF0b3JzIGNhbiBicmFuY2ggb24gY29udGVudCB0eXBlLlxuICogQHJldHVybnMgVGhlIE1JTUUgdHlwZSBvZiB0aGUgY29udGVudFxuICogQHRocm93cyBFcnJvciBpZiBDT05URU5UX1RZUEUgaXMgbWlzc2luZyBvciBlbXB0eVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGNvbnN0IGNvbnRlbnRUeXBlID0gZ2V0Q29udGVudFR5cGUoKTtcbiAqIGNvbnNvbGUubG9nKGBDb250ZW50IHR5cGU6ICR7Y29udGVudFR5cGV9YCk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldENvbnRlbnRUeXBlKCk6IHN0cmluZyB7XG4gIGNvbnN0IHZhbHVlID0gcHJvY2Vzcy5lbnZbQ0FSRFNfRU5WX1ZBUlMuQ09OVEVOVF9UWVBFXTtcbiAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQgfHwgdmFsdWUgPT09ICcnKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIHJlcXVpcmVkIGVudmlyb25tZW50IHZhcmlhYmxlOiAke0NBUkRTX0VOVl9WQVJTLkNPTlRFTlRfVFlQRX1gKTtcbiAgfVxuICByZXR1cm4gdmFsdWU7XG59XG5cbi8qKlxuICogUmVhZHMgdGhlIFZTIENvZGUgYnVuZGxlZCBOb2RlLmpzIGludGVycHJldGVyIHBhdGggZnJvbSB0aGUgZW52aXJvbm1lbnQuXG4gKlxuICogVGhpcyBpcyBzZXQgYnkgdGhlIGV4dGVuc2lvbiBkdXJpbmcgYWN0aXZhdGlvbiBhbmQgaW5qZWN0ZWQgaW50byBhbGxcbiAqIHNwYXduZWQgYWN0aW9uL2hvb2sgcHJvY2Vzc2VzLiBDb25maWd1cmF0aW9uIGF1dGhvcnMgY2FuIHVzZSBpdCB0byBpbnZva2VcbiAqIE5vZGUuanMgd2l0aG91dCByZWx5aW5nIG9uIHRoZSBzeXN0ZW0gUEFUSC5cbiAqXG4gKiBAcmV0dXJucyBUaGUgcGF0aCB0byB0aGUgTm9kZS5qcyBpbnRlcnByZXRlclxuICogQHRocm93cyBFcnJvciBpZiBWU0NPREVfTk9ERSBpcyBtaXNzaW5nIG9yIGVtcHR5XG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogY29uc3Qgbm9kZVBhdGggPSBnZXRWc2NvZGVOb2RlUGF0aCgpO1xuICogZXhlY0ZpbGVTeW5jKG5vZGVQYXRoLCBbJ3NjcmlwdC5qcyddKTtcbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0VnNjb2RlTm9kZVBhdGgoKTogc3RyaW5nIHtcbiAgY29uc3QgdmFsdWUgPSBwcm9jZXNzLmVudltDQVJEU19FTlZfVkFSUy5WU0NPREVfTk9ERV07XG4gIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IHZhbHVlID09PSAnJykge1xuICAgIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyByZXF1aXJlZCBlbnZpcm9ubWVudCB2YXJpYWJsZTogJHtDQVJEU19FTlZfVkFSUy5WU0NPREVfTk9ERX1gKTtcbiAgfVxuICByZXR1cm4gdmFsdWU7XG59XG5cbi8qKlxuICogUmVhZHMgdGhlIFVuaXggZG9tYWluIHNvY2tldCBwYXRoIGZvciBydW50aW1lLXRvLWRpc3BhdGNoZXIgY29tbXVuaWNhdGlvbi5cbiAqXG4gKiBAcmV0dXJucyBVbml4IHNvY2tldCBwYXRoIHVzZWQgdG8gc2VuZCBydW50aW1lIGNvbnRyb2wgbWVzc2FnZXMuXG4gKiBAdGhyb3dzIEVycm9yIGlmIFNPQ0tFVF9QQVRIIGlzIG1pc3Npbmcgb3IgZW1wdHlcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldFNvY2tldFBhdGgoKTogc3RyaW5nIHtcbiAgY29uc3QgdmFsdWUgPSBwcm9jZXNzLmVudltDQVJEU19FTlZfVkFSUy5TT0NLRVRfUEFUSF07XG4gIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IHZhbHVlID09PSAnJykge1xuICAgIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyByZXF1aXJlZCBlbnZpcm9ubWVudCB2YXJpYWJsZTogJHtDQVJEU19FTlZfVkFSUy5TT0NLRVRfUEFUSH1gKTtcbiAgfVxuICByZXR1cm4gdmFsdWU7XG59XG5cbi8qKlxuICogUmVhZHMgdGhlIHBhdGggdG8gdGhlIHN3aXRjaFRvSW50ZXJhY3RpdmUgZGF0YSBmaWxlLlxuICpcbiAqIFRoaXMgaXMgb3B0aW9uYWwgXHUyMDE0IHJldHVybnMgdW5kZWZpbmVkIHdoZW4gbm90IHNldCAoaS5lLiwgdGhlIGFjdGlvblxuICogd2FzIG5vdCByZWxhdW5jaGVkIHZpYSBzd2l0Y2hUb0ludGVyYWN0aXZlKS5cbiAqXG4gKiBAcmV0dXJucyBUaGUgZmlsZSBwYXRoLCBvciB1bmRlZmluZWQgaWYgbm90IHNldFxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0U3dpdGNoVG9JbnRlcmFjdGl2ZURhdGFQYXRoKCk6IHN0cmluZyB8IHVuZGVmaW5lZCB7XG4gIGNvbnN0IHZhbHVlID0gcHJvY2Vzcy5lbnZbQ0FSRFNfRU5WX1ZBUlMuU1dJVENIX1RPX0lOVEVSQUNUSVZFX0RBVEFfUEFUSF07XG4gIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IHZhbHVlID09PSAnJykge1xuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG4vKipcbiAqIFJlYWRzIHRoZSBzZXR0aW5ncyBjb25maWd1cmF0aW9uIGRpcmVjdG9yeSBwYXRoLlxuICpcbiAqIEByZXR1cm5zIEFic29sdXRlIHBhdGggdG8gdGhlIGRpcmVjdG9yeSBjb250YWluaW5nIGdlbmVyYXRlZCBzZXR0aW5ncyBhcnRpZmFjdHMuXG4gKiBAdGhyb3dzIEVycm9yIGlmIENPTkZJR19QQVRIIGlzIG1pc3Npbmcgb3IgZW1wdHlcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldENvbmZpZ1BhdGgoKTogc3RyaW5nIHtcbiAgY29uc3QgdmFsdWUgPSBwcm9jZXNzLmVudltDQVJEU19FTlZfVkFSUy5DT05GSUdfUEFUSF07XG4gIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IHZhbHVlID09PSAnJykge1xuICAgIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyByZXF1aXJlZCBlbnZpcm9ubWVudCB2YXJpYWJsZTogJHtDQVJEU19FTlZfVkFSUy5DT05GSUdfUEFUSH1gKTtcbiAgfVxuICByZXR1cm4gdmFsdWU7XG59XG5cbi8qKlxuICogUmVhZHMgdGhlIHdvcmtzcGFjZSBwYXRoIHNldCBieSB0aGUgYWN0aW9uIGhhbmRsZXIgKGUuZy4sIHRoZSB3b3JrdHJlZSBwYXRoKS5cbiAqXG4gKiBUaGlzIGlzIGZvciBob29rcyBydW5uaW5nIGluc2lkZSB0aGUgQ2xhdWRlIENMSSwgKipub3QqKiBmb3IgYWN0aW9uIGhhbmRsZXJzLlxuICogQWN0aW9uIGhhbmRsZXJzIHNob3VsZCB1c2Uge0BsaW5rIGdldFJlcG9Sb290fSBpbnN0ZWFkLlxuICpcbiAqIEByZXR1cm5zIEFic29sdXRlIHBhdGggdG8gdGhlIGFjdGl2ZSB3b3Jrc3BhY2UgLyB3b3JrdHJlZS5cbiAqIEB0aHJvd3MgRXJyb3IgaWYgV09SS1NQQUNFX1BBVEggaXMgbWlzc2luZyBvciBlbXB0eVxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0V29ya3NwYWNlUGF0aCgpOiBzdHJpbmcge1xuICBjb25zdCB2YWx1ZSA9IHByb2Nlc3MuZW52W0NBUkRTX0VOVl9WQVJTLldPUktTUEFDRV9QQVRIXTtcbiAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQgfHwgdmFsdWUgPT09ICcnKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIHJlcXVpcmVkIGVudmlyb25tZW50IHZhcmlhYmxlOiAke0NBUkRTX0VOVl9WQVJTLldPUktTUEFDRV9QQVRIfWApO1xuICB9XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuLyoqXG4gKiBSZWFkcyB0aGUgbWFpbiBnaXQgcmVwb3NpdG9yeSByb290IHBhdGguXG4gKlxuICogU2V0IGJ5IEFjdGlvbkRpc3BhdGNoZXI7IHVzZWQgYnkgYWN0aW9uIGhhbmRsZXJzIHRvIHJlc29sdmUgd29ya3RyZWVzXG4gKiBhbmQgcGVyZm9ybSBnaXQgb3BlcmF0aW9ucyBhZ2FpbnN0IHRoZSBtYWluIHJlcG9zaXRvcnkuXG4gKlxuICogQHJldHVybnMgQWJzb2x1dGUgcGF0aCB0byB0aGUgbWFpbiBnaXQgcmVwb3NpdG9yeSByb290IChOT1QgYSB3b3JrdHJlZSkuXG4gKiBAdGhyb3dzIEVycm9yIGlmIFJFUE9fUk9PVCBpcyBtaXNzaW5nIG9yIGVtcHR5XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRSZXBvUm9vdCgpOiBzdHJpbmcge1xuICBjb25zdCB2YWx1ZSA9IHByb2Nlc3MuZW52W0NBUkRTX0VOVl9WQVJTLlJFUE9fUk9PVF07XG4gIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IHZhbHVlID09PSAnJykge1xuICAgIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyByZXF1aXJlZCBlbnZpcm9ubWVudCB2YXJpYWJsZTogJHtDQVJEU19FTlZfVkFSUy5SRVBPX1JPT1R9YCk7XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG4vKipcbiAqIFJlYWRzIHRoZSBjYXJkJ3MgcmVwb3NpdG9yeSBkaXJlY3RvcnkgcGF0aC5cbiAqXG4gKiBAcmV0dXJucyBBYnNvbHV0ZSBwYXRoIHRvIHRoZSByZXBvc2l0b3J5IGFzc29jaWF0ZWQgd2l0aCB0aGUgYWN0aXZlIGNhcmQuXG4gKiBAdGhyb3dzIEVycm9yIGlmIENBUkRfUkVQT19QQVRIIGlzIG1pc3Npbmcgb3IgZW1wdHlcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldENhcmRSZXBvUGF0aCgpOiBzdHJpbmcge1xuICBjb25zdCB2YWx1ZSA9IHByb2Nlc3MuZW52W0NBUkRTX0VOVl9WQVJTLkNBUkRfUkVQT19QQVRIXTtcbiAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQgfHwgdmFsdWUgPT09ICcnKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIHJlcXVpcmVkIGVudmlyb25tZW50IHZhcmlhYmxlOiAke0NBUkRTX0VOVl9WQVJTLkNBUkRfUkVQT19QQVRIfWApO1xuICB9XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuLyoqXG4gKiBSZWFkcyB0aGUgVlMgQ29kZSBleHRlbnNpb24gaW5zdGFsbGF0aW9uIGRpcmVjdG9yeSBwYXRoLlxuICpcbiAqIFNldCBieSB0aGUgZXh0ZW5zaW9uIGhvc3QgZnJvbSBgY29udGV4dC5leHRlbnNpb25VcmkuZnNQYXRoYCBhbmQgaW5qZWN0ZWRcbiAqIGludG8gYWxsIHNwYXduZWQgYWN0aW9uIHByb2Nlc3Nlcy4gVXNlIHRoaXMgdG8gbG9jYXRlIGJ1bmRsZWQgYXNzZXRzIHN1Y2hcbiAqIGFzIHRoZSBydW50aW1lIHBsdWdpbiBkaXJlY3RvcnkgKGA8ZXh0ZW5zaW9uUGF0aD4vZGlzdC9wbHVnaW5zL3J1bnRpbWVgKS5cbiAqXG4gKiBAcmV0dXJucyBBYnNvbHV0ZSBwYXRoIHRvIHRoZSBleHRlbnNpb24gaW5zdGFsbGF0aW9uIGRpcmVjdG9yeS5cbiAqIEB0aHJvd3MgRXJyb3IgaWYgRVhURU5TSU9OX1BBVEggaXMgbWlzc2luZyBvciBlbXB0eVxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0RXh0ZW5zaW9uUGF0aCgpOiBzdHJpbmcge1xuICBjb25zdCB2YWx1ZSA9IHByb2Nlc3MuZW52W0NBUkRTX0VOVl9WQVJTLkVYVEVOU0lPTl9QQVRIXTtcbiAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQgfHwgdmFsdWUgPT09ICcnKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIHJlcXVpcmVkIGVudmlyb25tZW50IHZhcmlhYmxlOiAke0NBUkRTX0VOVl9WQVJTLkVYVEVOU0lPTl9QQVRIfWApO1xuICB9XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuLyoqXG4gKiBSZWFkcyBhbmQgcGFyc2VzIHRoZSBzd2l0Y2hUb0ludGVyYWN0aXZlIGRhdGEgZmlsZS5cbiAqXG4gKiBXaGVuIGBTV0lUQ0hfVE9fSU5URVJBQ1RJVkVfREFUQV9QQVRIYCBpcyBzZXQsIHJlYWRzIHRoZSBmaWxlIGF0IHRoYXQgcGF0aFxuICogYW5kIHBhcnNlcyBpdCBhcyBKU09OLiBSZXR1cm5zIHVuZGVmaW5lZCBpZiB0aGUgZW52IHZhciBpcyBub3Qgc2V0LlxuICpcbiAqIEByZXR1cm5zIFRoZSBwYXJzZWQgZGF0YSwgb3IgdW5kZWZpbmVkIGlmIHRoZSBwYXRoIGlzIG5vdCBzZXRcbiAqIEB0aHJvd3MgRXJyb3IgaWYgdGhlIGZpbGUgY2Fubm90IGJlIHJlYWQgb3IgY29udGFpbnMgaW52YWxpZCBKU09OXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiByZWFkU3dpdGNoVG9JbnRlcmFjdGl2ZURhdGEoKTogdW5rbm93biB8IHVuZGVmaW5lZCB7XG4gIGNvbnN0IGRhdGFQYXRoID0gZ2V0U3dpdGNoVG9JbnRlcmFjdGl2ZURhdGFQYXRoKCk7XG4gIGlmIChkYXRhUGF0aCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfVxuICBjb25zdCBjb250ZW50ID0gcmVhZEZpbGVTeW5jKGRhdGFQYXRoLCAndXRmLTgnKTtcbiAgcmV0dXJuIEpTT04ucGFyc2UoY29udGVudCk7XG59XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIFR5cGVkIElucHV0IEV4dHJhY3Rpb25cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuLyoqXG4gKiBCdWlsZHMgYSB0eXBlZCBhY3Rpb24gaW5wdXQgb2JqZWN0IGZyb20gZW52aXJvbm1lbnQgdmFyaWFibGVzLlxuICpcbiAqIEV4dHJhY3RzIGFsbCBmaWVsZHMgcmVxdWlyZWQgZm9yIGFjdGlvbiBoYW5kbGVycy5cbiAqXG4gKiBAcmV0dXJucyBUeXBlZCBBY3Rpb25JbnB1dCBvYmplY3RcbiAqIEB0aHJvd3MgRXJyb3IgaWYgcmVxdWlyZWQgZW52IHZhcnMgYXJlIG1pc3Npbmcgb3IgaW52YWxpZFxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIC8vIEZvciBhbiBhY3Rpb24gaGFuZGxlclxuICogY29uc3QgaW5wdXQgPSBleHRyYWN0QWN0aW9uSW5wdXQoKTtcbiAqIGNvbnNvbGUubG9nKGlucHV0LmNhcmRJZCk7XG4gKiBjb25zb2xlLmxvZyhpbnB1dC5leGVjdXRpb25Nb2RlKTtcbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gZXh0cmFjdEFjdGlvbklucHV0KCk6IEFjdGlvbklucHV0IHtcbiAgcmV0dXJuIHtcbiAgICBjYXJkSWQ6IGdldENhcmRJZCgpLFxuICAgIGFjdGlvbk5hbWU6IGdldEFjdGlvbk5hbWUoKSxcbiAgICBlbnZpcm9ubWVudDogZ2V0RW52aXJvbm1lbnQoKSxcbiAgICBleGVjdXRpb25Nb2RlOiBnZXRFeGVjdXRpb25Nb2RlKCksXG4gICAgYXBpQmFzZVVybDogZ2V0QXBpQmFzZVVybCgpLFxuICAgIGFwaUFjY2Vzc1Rva2VuOiBnZXRBcGlBY2Nlc3NUb2tlbigpLFxuICAgIGNvZGluZ0FnZW50OiBnZXRDb2RpbmdBZ2VudCgpLFxuICAgIHN3aXRjaFRvSW50ZXJhY3RpdmVEYXRhOiByZWFkU3dpdGNoVG9JbnRlcmFjdGl2ZURhdGEoKSxcbiAgICByZXBvUm9vdDogZ2V0UmVwb1Jvb3QoKSxcbiAgICBjYXJkUmVwb1BhdGg6IGdldENhcmRSZXBvUGF0aCgpLFxuICAgIGNvbmZpZ1BhdGg6IGdldENvbmZpZ1BhdGgoKSxcbiAgICBleHRlbnNpb25QYXRoOiBnZXRFeHRlbnNpb25QYXRoKClcbiAgfTtcbn1cblxuLyoqXG4gKiBCdWlsZHMgYSB0eXBlZCB0eXBlIGhvb2sgaW5wdXQgb2JqZWN0IGZyb20gZW52aXJvbm1lbnQgdmFyaWFibGVzLlxuICpcbiAqIEV4dHJhY3RzIGFsbCBmaWVsZHMgcmVxdWlyZWQgZm9yIHR5cGUgbGlmZWN5Y2xlIGhvb2tzICh2YWxpZGF0b3IsIGNyZWF0ZSxcbiAqIHVwZGF0ZSwgZGVsZXRlKS5cbiAqXG4gKiBAcmV0dXJucyBUeXBlZCBUeXBlSG9va0lucHV0IG9iamVjdFxuICogQHRocm93cyBFcnJvciBpZiByZXF1aXJlZCBlbnYgdmFycyBhcmUgbWlzc2luZyBvciBpbnZhbGlkXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogLy8gRm9yIGEgdHlwZSBob29rIGhhbmRsZXJcbiAqIGNvbnN0IGlucHV0ID0gZXh0cmFjdFR5cGVJbnB1dCgpO1xuICogY29uc29sZS5sb2coaW5wdXQudHlwZU5hbWUpO1xuICogY29uc29sZS5sb2coaW5wdXQuZmlsZU5hbWUpO1xuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBleHRyYWN0VHlwZUlucHV0KCk6IFR5cGVIb29rSW5wdXQge1xuICByZXR1cm4ge1xuICAgIGNhcmRJZDogZ2V0Q2FyZElkKCksXG4gICAgZW52aXJvbm1lbnQ6IGdldEVudmlyb25tZW50KCksXG4gICAgdHlwZU5hbWU6IGdldFR5cGVOYW1lKCksXG4gICAgdHlwZVZlcnNpb246IGdldFR5cGVWZXJzaW9uKCksXG4gICAgZmlsZU5hbWU6IGdldEZpbGVOYW1lKCksXG4gICAgZmlsZVBhdGg6IGdldEZpbGVQYXRoKCksXG4gICAgZmlsZVNpemU6IGdldEZpbGVTaXplKCksXG4gICAgZmlsZVNoYTI1NjogZ2V0U2hhMjU2KCksXG4gICAgY29udGVudFR5cGU6IGdldENvbnRlbnRUeXBlKCksXG4gICAgYXBpQmFzZVVybDogZ2V0QXBpQmFzZVVybCgpLFxuICAgIGFwaUFjY2Vzc1Rva2VuOiBnZXRBcGlBY2Nlc3NUb2tlbigpXG4gIH07XG59XG4iLCAiLyoqXG4gKiBFbnZpcm9ubWVudCB2YXJpYWJsZSB1dGlsaXRpZXMgZm9yIENsYXVkZSBDb2RlIGhvb2tzLlxuICpcbiAqIFByb3ZpZGVzIHR5cGVkIGFjY2VzcyB0byBDbGF1ZGUgQ29kZSdzIGVudmlyb25tZW50IHZhcmlhYmxlcyBhbmQgdXRpbGl0aWVzXG4gKiBmb3IgcGVyc2lzdGluZyBlbnZpcm9ubWVudCB2YXJpYWJsZXMgaW4gU2Vzc2lvblN0YXJ0IGhvb2tzLlxuICpcbiAqICMjIEVudmlyb25tZW50IFZhcmlhYmxlc1xuICpcbiAqIENsYXVkZSBDb2RlIHNldHMgdGhlc2UgZW52aXJvbm1lbnQgdmFyaWFibGVzIHdoZW4gcnVubmluZyBob29rczpcbiAqXG4gKiB8IFZhcmlhYmxlIHwgRGVzY3JpcHRpb24gfCBBdmFpbGFibGUgSW4gfFxuICogfC0tLS0tLS0tLS18LS0tLS0tLS0tLS0tLXwtLS0tLS0tLS0tLS0tLXxcbiAqIHwgYENMQVVERV9QUk9KRUNUX0RJUmAgfCBBYnNvbHV0ZSBwYXRoIHRvIHByb2plY3Qgcm9vdCB8IEFsbCBob29rcyB8XG4gKiB8IGBDTEFVREVfRU5WX0ZJTEVgIHwgUGF0aCB0byBmaWxlIGZvciBwZXJzaXN0aW5nIGVudiB2YXJzIHwgU2Vzc2lvblN0YXJ0IG9ubHkgfFxuICogfCBgQ0xBVURFX0NPREVfUkVNT1RFYCB8IGBcInRydWVcImAgaWYgcnVubmluZyByZW1vdGVseSB8IEFsbCBob29rcyB8XG4gKiBAbW9kdWxlXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogaW1wb3J0IHsgZ2V0UHJvamVjdERpciwgcGVyc2lzdEVudlZhciwgaXNSZW1vdGVFbnZpcm9ubWVudCB9IGZyb20gJ0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcyc7XG4gKlxuICogLy8gR2V0IHByb2plY3QgZGlyZWN0b3J5XG4gKiBjb25zdCBwcm9qZWN0RGlyID0gZ2V0UHJvamVjdERpcigpO1xuICpcbiAqIC8vIENoZWNrIGlmIHJ1bm5pbmcgcmVtb3RlbHlcbiAqIGlmIChpc1JlbW90ZUVudmlyb25tZW50KCkpIHtcbiAqICAgLy8gSGFuZGxlIHJlbW90ZS1zcGVjaWZpYyBsb2dpY1xuICogfVxuICpcbiAqIC8vIEluIFNlc3Npb25TdGFydCBob29rOiBwZXJzaXN0IGVudmlyb25tZW50IHZhcmlhYmxlc1xuICogcGVyc2lzdEVudlZhcignTk9ERV9FTlYnLCAncHJvZHVjdGlvbicpO1xuICogcGVyc2lzdEVudlZhcignQVBJX0tFWScsICdzZWNyZXQta2V5Jyk7XG4gKiBgYGBcbiAqIEBzZWUgaHR0cHM6Ly9jb2RlLmNsYXVkZS5jb20vZG9jcy9lbi9ob29rcyNob29rLWV4ZWN1dGlvbi1kZXRhaWxzXG4gKi9cbmltcG9ydCAqIGFzIGZzIGZyb20gXCJub2RlOmZzXCI7XG4vKipcbiAqIENsYXVkZSBDb2RlIGVudmlyb25tZW50IHZhcmlhYmxlIG5hbWVzLlxuICpcbiAqIFRoZXNlIGFyZSB0aGUgZW52aXJvbm1lbnQgdmFyaWFibGVzIHRoYXQgQ2xhdWRlIENvZGUgc2V0cyB3aGVuIHJ1bm5pbmcgaG9va3MuXG4gKi9cbmV4cG9ydCBjb25zdCBDTEFVREVfRU5WX1ZBUlMgPSB7XG4gICAgLyoqXG4gICAgICogQWJzb2x1dGUgcGF0aCB0byB0aGUgcHJvamVjdCByb290IGRpcmVjdG9yeSB3aGVyZSBDbGF1ZGUgQ29kZSB3YXMgc3RhcnRlZC5cbiAgICAgKiBBdmFpbGFibGUgaW4gYWxsIGhvb2tzLlxuICAgICAqL1xuICAgIFBST0pFQ1RfRElSOiBcIkNMQVVERV9QUk9KRUNUX0RJUlwiLFxuICAgIC8qKlxuICAgICAqIFBhdGggdG8gYSBmaWxlIHdoZXJlIFNlc3Npb25TdGFydCBob29rcyBjYW4gcGVyc2lzdCBlbnZpcm9ubWVudCB2YXJpYWJsZXMuXG4gICAgICogVmFyaWFibGVzIHdyaXR0ZW4gdG8gdGhpcyBmaWxlIHdpbGwgYmUgYXZhaWxhYmxlIGluIGFsbCBzdWJzZXF1ZW50IGJhc2ggY29tbWFuZHMuXG4gICAgICogT25seSBhdmFpbGFibGUgaW4gU2Vzc2lvblN0YXJ0IGhvb2tzLlxuICAgICAqL1xuICAgIEVOVl9GSUxFOiBcIkNMQVVERV9FTlZfRklMRVwiLFxuICAgIC8qKlxuICAgICAqIFNldCB0byBcInRydWVcIiB3aGVuIHJ1bm5pbmcgaW4gYSByZW1vdGUgKHdlYikgZW52aXJvbm1lbnQuXG4gICAgICogTm90IHNldCBvciBlbXB0eSB3aGVuIHJ1bm5pbmcgaW4gbG9jYWwgQ0xJIGVudmlyb25tZW50LlxuICAgICAqL1xuICAgIFJFTU9URTogXCJDTEFVREVfQ09ERV9SRU1PVEVcIixcbn07XG4vKipcbiAqIEdldHMgdGhlIENsYXVkZSBDb2RlIHByb2plY3QgZGlyZWN0b3J5LlxuICpcbiAqIFRoaXMgaXMgdGhlIGFic29sdXRlIHBhdGggdG8gdGhlIHByb2plY3Qgcm9vdCB3aGVyZSBDbGF1ZGUgQ29kZSB3YXMgc3RhcnRlZC5cbiAqIFRoZSB2YWx1ZSBjb21lcyBmcm9tIHRoZSBgQ0xBVURFX1BST0pFQ1RfRElSYCBlbnZpcm9ubWVudCB2YXJpYWJsZS5cbiAqIEByZXR1cm5zIFRoZSBwcm9qZWN0IGRpcmVjdG9yeSBwYXRoLCBvciB1bmRlZmluZWQgaWYgbm90IHNldFxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGNvbnN0IHByb2plY3REaXIgPSBnZXRQcm9qZWN0RGlyKCk7XG4gKiBpZiAocHJvamVjdERpcikge1xuICogICBjb25zdCBjb25maWdQYXRoID0gYCR7cHJvamVjdERpcn0vLmNsYXVkZS9jb25maWcuanNvbmA7XG4gKiB9XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldFByb2plY3REaXIoKSB7XG4gICAgcmV0dXJuIHByb2Nlc3MuZW52W0NMQVVERV9FTlZfVkFSUy5QUk9KRUNUX0RJUl07XG59XG4vKipcbiAqIEdldHMgdGhlIENsYXVkZSBDb2RlIGVudiBmaWxlIHBhdGggZm9yIHBlcnNpc3RpbmcgZW52aXJvbm1lbnQgdmFyaWFibGVzLlxuICpcbiAqIFRoaXMgaXMgb25seSBhdmFpbGFibGUgaW4gU2Vzc2lvblN0YXJ0IGhvb2tzLiBUaGUgcGF0aCBwb2ludHMgdG8gYSBmaWxlXG4gKiB3aGVyZSB5b3UgY2FuIHdyaXRlIHNoZWxsIGV4cG9ydCBzdGF0ZW1lbnRzIHRvIHBlcnNpc3QgZW52aXJvbm1lbnQgdmFyaWFibGVzXG4gKiBmb3IgYWxsIHN1YnNlcXVlbnQgYmFzaCBjb21tYW5kcyBpbiB0aGUgc2Vzc2lvbi5cbiAqIEByZXR1cm5zIFRoZSBlbnYgZmlsZSBwYXRoLCBvciB1bmRlZmluZWQgaWYgbm90IHNldCAobm90IGEgU2Vzc2lvblN0YXJ0IGhvb2spXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogY29uc3QgZW52RmlsZSA9IGdldEVudkZpbGVQYXRoKCk7XG4gKiBpZiAoZW52RmlsZSkge1xuICogICAvLyBXZSdyZSBpbiBhIFNlc3Npb25TdGFydCBob29rIGFuZCBjYW4gcGVyc2lzdCBlbnYgdmFyc1xuICogICBwZXJzaXN0RW52VmFyKCdNWV9WQVInLCAnbXktdmFsdWUnKTtcbiAqIH1cbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0RW52RmlsZVBhdGgoKSB7XG4gICAgcmV0dXJuIHByb2Nlc3MuZW52W0NMQVVERV9FTlZfVkFSUy5FTlZfRklMRV07XG59XG4vKipcbiAqIENoZWNrcyBpZiB0aGUgaG9vayBpcyBydW5uaW5nIGluIGEgcmVtb3RlICh3ZWIpIGVudmlyb25tZW50LlxuICpcbiAqIFJlbW90ZSBlbnZpcm9ubWVudHMgbWF5IGhhdmUgZGlmZmVyZW50IGNhcGFiaWxpdGllcyBvciByZXN0cmljdGlvbnNcbiAqIGNvbXBhcmVkIHRvIGxvY2FsIENMSSBlbnZpcm9ubWVudHMuXG4gKiBAcmV0dXJucyB0cnVlIGlmIHJ1bm5pbmcgcmVtb3RlbHksIGZhbHNlIGlmIHJ1bm5pbmcgbG9jYWxseVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGlmIChpc1JlbW90ZUVudmlyb25tZW50KCkpIHtcbiAqICAgLy8gVXNlIHdlYi1jb21wYXRpYmxlIGFwcHJvYWNoZXNcbiAqIH0gZWxzZSB7XG4gKiAgIC8vIENhbiB1c2UgbG9jYWwgQ0xJIGZlYXR1cmVzXG4gKiB9XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzUmVtb3RlRW52aXJvbm1lbnQoKSB7XG4gICAgcmV0dXJuIHByb2Nlc3MuZW52W0NMQVVERV9FTlZfVkFSUy5SRU1PVEVdID09PSBcInRydWVcIjtcbn1cbi8qKlxuICogUGVyc2lzdHMgYW4gZW52aXJvbm1lbnQgdmFyaWFibGUgZm9yIHVzZSBpbiBzdWJzZXF1ZW50IGJhc2ggY29tbWFuZHMuXG4gKlxuICogVGhpcyBmdW5jdGlvbiB3cml0ZXMgYSBzaGVsbCBleHBvcnQgc3RhdGVtZW50IHRvIHRoZSBgQ0xBVURFX0VOVl9GSUxFYCxcbiAqIHdoaWNoIENsYXVkZSBDb2RlIHNvdXJjZXMgYmVmb3JlIHJ1bm5pbmcgYmFzaCBjb21tYW5kcy4gVGhpcyBhbGxvd3NcbiAqIFNlc3Npb25TdGFydCBob29rcyB0byBjb25maWd1cmUgdGhlIGVudmlyb25tZW50IGZvciB0aGUgZW50aXJlIHNlc3Npb24uXG4gKlxuICogKipJbXBvcnRhbnQqKjogVGhpcyBmdW5jdGlvbiBvbmx5IHdvcmtzIGluIFNlc3Npb25TdGFydCBob29rcyB3aGVyZVxuICogYENMQVVERV9FTlZfRklMRWAgaXMgc2V0LiBJbiBvdGhlciBob29rcywgaXQgd2lsbCB0aHJvdyBhbiBlcnJvci5cbiAqIEBwYXJhbSBuYW1lIC0gVGhlIGVudmlyb25tZW50IHZhcmlhYmxlIG5hbWVcbiAqIEBwYXJhbSB2YWx1ZSAtIFRoZSBlbnZpcm9ubWVudCB2YXJpYWJsZSB2YWx1ZSAod2lsbCBiZSBzaGVsbC1lc2NhcGVkKVxuICogQHRocm93cyBFcnJvciBpZiBDTEFVREVfRU5WX0ZJTEUgaXMgbm90IHNldCAobm90IGluIGEgU2Vzc2lvblN0YXJ0IGhvb2spXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogaW1wb3J0IHsgc2Vzc2lvblN0YXJ0SG9vaywgc2Vzc2lvblN0YXJ0T3V0cHV0LCBwZXJzaXN0RW52VmFyIH0gZnJvbSAnQGdvb2Rmb290L2NsYXVkZS1jb2RlLWhvb2tzJztcbiAqXG4gKiBleHBvcnQgZGVmYXVsdCBzZXNzaW9uU3RhcnRIb29rKHt9LCBhc3luYyAoaW5wdXQpID0+IHtcbiAqICAgLy8gUGVyc2lzdCBlbnZpcm9ubWVudCB2YXJpYWJsZXMgZm9yIHRoZSBzZXNzaW9uXG4gKiAgIHBlcnNpc3RFbnZWYXIoJ05PREVfRU5WJywgJ3Byb2R1Y3Rpb24nKTtcbiAqICAgcGVyc2lzdEVudlZhcignQVBJX0tFWScsIHByb2Nlc3MuZW52Lk1ZX0FQSV9LRVkgPz8gJ2RlZmF1bHQnKTtcbiAqICAgcGVyc2lzdEVudlZhcignUEFUSCcsIGAke3Byb2Nlc3MuZW52LlBBVEh9Oi4vbm9kZV9tb2R1bGVzLy5iaW5gKTtcbiAqXG4gKiAgIHJldHVybiBzZXNzaW9uU3RhcnRPdXRwdXQoe30pO1xuICogfSk7XG4gKiBgYGBcbiAqIEBzZWUgaHR0cHM6Ly9jb2RlLmNsYXVkZS5jb20vZG9jcy9lbi9ob29rcyNwZXJzaXN0aW5nLWVudmlyb25tZW50LXZhcmlhYmxlc1xuICovXG5leHBvcnQgZnVuY3Rpb24gcGVyc2lzdEVudlZhcihuYW1lLCB2YWx1ZSkge1xuICAgIGNvbnN0IGVudkZpbGUgPSBnZXRFbnZGaWxlUGF0aCgpO1xuICAgIGlmIChlbnZGaWxlID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwicGVyc2lzdEVudlZhciBjYW4gb25seSBiZSB1c2VkIGluIFNlc3Npb25TdGFydCBob29rcy4gXCIgKyBcIkNMQVVERV9FTlZfRklMRSBlbnZpcm9ubWVudCB2YXJpYWJsZSBpcyBub3Qgc2V0LlwiKTtcbiAgICB9XG4gICAgLy8gU2hlbGwtZXNjYXBlIHRoZSB2YWx1ZSB0byBoYW5kbGUgc3BlY2lhbCBjaGFyYWN0ZXJzXG4gICAgY29uc3QgZXNjYXBlZFZhbHVlID0gZXNjYXBlU2hlbGxWYWx1ZSh2YWx1ZSk7XG4gICAgLy8gV3JpdGUgdGhlIGV4cG9ydCBzdGF0ZW1lbnRcbiAgICBjb25zdCBleHBvcnRTdGF0ZW1lbnQgPSBgZXhwb3J0ICR7bmFtZX09JHtlc2NhcGVkVmFsdWV9XFxuYDtcbiAgICBmcy5hcHBlbmRGaWxlU3luYyhlbnZGaWxlLCBleHBvcnRTdGF0ZW1lbnQsIFwidXRmLThcIik7XG59XG4vKipcbiAqIFBlcnNpc3RzIG11bHRpcGxlIGVudmlyb25tZW50IHZhcmlhYmxlcyBhdCBvbmNlLlxuICpcbiAqIFRoaXMgaXMgYSBjb252ZW5pZW5jZSB3cmFwcGVyIGFyb3VuZCBgcGVyc2lzdEVudlZhcmAgZm9yIHNldHRpbmdcbiAqIG11bHRpcGxlIHZhcmlhYmxlcyBpbiBhIHNpbmdsZSBjYWxsLlxuICogQHBhcmFtIHZhcnMgLSBPYmplY3QgbWFwcGluZyB2YXJpYWJsZSBuYW1lcyB0byB2YWx1ZXNcbiAqIEB0aHJvd3MgRXJyb3IgaWYgQ0xBVURFX0VOVl9GSUxFIGlzIG5vdCBzZXQgKG5vdCBpbiBhIFNlc3Npb25TdGFydCBob29rKVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIHBlcnNpc3RFbnZWYXJzKHtcbiAqICAgTk9ERV9FTlY6ICdwcm9kdWN0aW9uJyxcbiAqICAgQVBJX0tFWTogJ3NlY3JldCcsXG4gKiAgIERFQlVHOiAnZmFsc2UnXG4gKiB9KTtcbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gcGVyc2lzdEVudlZhcnModmFycykge1xuICAgIGZvciAoY29uc3QgW25hbWUsIHZhbHVlXSBvZiBPYmplY3QuZW50cmllcyh2YXJzKSkge1xuICAgICAgICBwZXJzaXN0RW52VmFyKG5hbWUsIHZhbHVlKTtcbiAgICB9XG59XG4vKipcbiAqIEVzY2FwZXMgYSB2YWx1ZSBmb3Igc2FmZSB1c2UgaW4gYSBzaGVsbCBleHBvcnQgc3RhdGVtZW50LlxuICpcbiAqIFVzZXMgc2luZ2xlIHF1b3RlcyBhbmQgZXNjYXBlcyBhbnkgZW1iZWRkZWQgc2luZ2xlIHF1b3Rlcy5cbiAqIFRoaXMgcHJldmVudHMgc2hlbGwgaW5qZWN0aW9uIGFuZCBoYW5kbGVzIHNwZWNpYWwgY2hhcmFjdGVycy5cbiAqIEBwYXJhbSB2YWx1ZSAtIFRoZSB2YWx1ZSB0byBlc2NhcGVcbiAqIEByZXR1cm5zIFRoZSBzaGVsbC1lc2NhcGVkIHZhbHVlICh3aXRoIHF1b3RlcylcbiAqIEBpbnRlcm5hbFxuICovXG5mdW5jdGlvbiBlc2NhcGVTaGVsbFZhbHVlKHZhbHVlKSB7XG4gICAgLy8gVXNlIHNpbmdsZSBxdW90ZXMgYW5kIGVzY2FwZSBhbnkgZW1iZWRkZWQgc2luZ2xlIHF1b3Rlc1xuICAgIC8vICd2YWx1ZScgLT4gJ3ZhbCdcXCcndWUnIGZvciB2YWx1ZXMgY29udGFpbmluZyBzaW5nbGUgcXVvdGVzXG4gICAgY29uc3QgZXNjYXBlZCA9IHZhbHVlLnJlcGxhY2UoLycvZywgXCInXFxcXCcnXCIpO1xuICAgIHJldHVybiBgJyR7ZXNjYXBlZH0nYDtcbn1cbiIsICIvKipcbiAqIEhvb2sgZmFjdG9yeSBmdW5jdGlvbnMgZm9yIENsYXVkZSBDb2RlIGhvb2tzLlxuICpcbiAqIFByb3ZpZGVzIHR5cGVkIGZhY3RvcnkgZnVuY3Rpb25zIGZvciBhbGwgMTIgaG9vayB0eXBlcyB0aGF0IGhhbmRsZTpcbiAqIC0gSW5wdXQgdHlwZSBuYXJyb3dpbmcgYmFzZWQgb24gaG9vayBldmVudCB0eXBlXG4gKiAtIE91dHB1dCB0eXBlIGVuZm9yY2VtZW50IHZpYSByZXR1cm4gdHlwZXNcbiAqIC0gRXJyb3Igd3JhcHBpbmcgd2l0aCBhdXRvbWF0aWMgbG9nZ2luZ1xuICogLSBMb2dnZXIgY29udGV4dCBpbmplY3Rpb25cbiAqXG4gKiBFYWNoIGZhY3RvcnkgYWNjZXB0cyBhIEhvb2tDb25maWcgd2l0aCBvcHRpb25hbCBtYXRjaGVyIGFuZCB0aW1lb3V0IHNldHRpbmdzLFxuICogYW5kIHJldHVybnMgYSBmdW5jdGlvbiB0aGF0IHRoZSBydW50aW1lIGludm9rZXMgd2hlbiB0aGUgaG9vayBmaWxlIGV4ZWN1dGVzLlxuICogQG1vZHVsZVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGltcG9ydCB7IHByZVRvb2xVc2VIb29rLCBwcmVUb29sVXNlT3V0cHV0IH0gZnJvbSAnQGdvb2Rmb290L2NsYXVkZS1jb2RlLWhvb2tzJztcbiAqXG4gKiBleHBvcnQgZGVmYXVsdCBwcmVUb29sVXNlSG9vayh7IG1hdGNoZXI6ICdCYXNoJyB9LCBhc3luYyAoaW5wdXQsIHsgbG9nZ2VyIH0pID0+IHtcbiAqICAgbG9nZ2VyLmluZm8oJ1Byb2Nlc3NpbmcgQmFzaCBjb21tYW5kJyk7XG4gKiAgIHJldHVybiBwcmVUb29sVXNlT3V0cHV0KHsgYWxsb3c6IHRydWUgfSk7XG4gKiB9KTtcbiAqIGBgYFxuICogQHNlZSBodHRwczovL2NvZGUuY2xhdWRlLmNvbS9kb2NzL2VuL2hvb2tzXG4gKi9cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIEdlbmVyaWMgRmFjdG9yeVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLyoqXG4gKiBDcmVhdGVzIGEgaG9vayBmYWN0b3J5IGZ1bmN0aW9uIGZvciBhIHNwZWNpZmljIGhvb2sgdHlwZS5cbiAqXG4gKiBUaGlzIGlzIHRoZSBpbnRlcm5hbCBpbXBsZW1lbnRhdGlvbiB1c2VkIGJ5IGFsbCB0eXBlZCBmYWN0b3JpZXMuXG4gKiBJdCB3cmFwcyB0aGUgaGFuZGxlciB3aXRoIGVycm9yIGNhdGNoaW5nIGFuZCBsb2dnaW5nLlxuICogQHBhcmFtIGhvb2tFdmVudE5hbWUgLSBUaGUgaG9vayBldmVudCBuYW1lXG4gKiBAcGFyYW0gY29uZmlnIC0gSG9vayBjb25maWd1cmF0aW9uXG4gKiBAcGFyYW0gaGFuZGxlciAtIFRoZSBoYW5kbGVyIGZ1bmN0aW9uIHRvIHdyYXBcbiAqIEByZXR1cm5zIEEgd3JhcHBlZCBob29rIGZ1bmN0aW9uXG4gKiBAaW50ZXJuYWxcbiAqL1xuZnVuY3Rpb24gY3JlYXRlSG9va0Z1bmN0aW9uKGhvb2tFdmVudE5hbWUsIGNvbmZpZywgaGFuZGxlcikge1xuICAgIGNvbnN0IGhvb2tGbiA9IGFzeW5jIChpbnB1dCwgY29udGV4dCkgPT4ge1xuICAgICAgICAvLyBEZWxlZ2F0ZSBlcnJvciBoYW5kbGluZyB0byB0aGUgcnVudGltZSAtIGp1c3QgZXhlY3V0ZSB0aGUgaGFuZGxlclxuICAgICAgICAvLyBUaGUgcnVudGltZSB3aWxsIGNhdGNoIGVycm9ycywgbG9nIHRoZW0sIGFuZCByZXR1cm4gYXBwcm9wcmlhdGUgb3V0cHV0XG4gICAgICAgIHJldHVybiBhd2FpdCBoYW5kbGVyKGlucHV0LCBjb250ZXh0KTtcbiAgICB9O1xuICAgIC8vIEF0dGFjaCBtZXRhZGF0YSBmb3IgcnVudGltZSBpbnNwZWN0aW9uXG4gICAgaG9va0ZuLmhvb2tFdmVudE5hbWUgPSBob29rRXZlbnROYW1lO1xuICAgIGhvb2tGbi5tYXRjaGVyID0gY29uZmlnLm1hdGNoZXI7XG4gICAgaG9va0ZuLnRpbWVvdXQgPSBjb25maWcudGltZW91dDtcbiAgICByZXR1cm4gaG9va0ZuO1xufVxuLyoqIEBpbmhlcml0ZG9jICovXG5leHBvcnQgZnVuY3Rpb24gcHJlVG9vbFVzZUhvb2soY29uZmlnLCBoYW5kbGVyKSB7XG4gICAgcmV0dXJuIGNyZWF0ZUhvb2tGdW5jdGlvbihcIlByZVRvb2xVc2VcIiwgY29uZmlnLCBoYW5kbGVyKTtcbn1cbi8qKiBAaW5oZXJpdGRvYyAqL1xuZXhwb3J0IGZ1bmN0aW9uIHBvc3RUb29sVXNlSG9vayhjb25maWcsIGhhbmRsZXIpIHtcbiAgICByZXR1cm4gY3JlYXRlSG9va0Z1bmN0aW9uKFwiUG9zdFRvb2xVc2VcIiwgY29uZmlnLCBoYW5kbGVyKTtcbn1cbi8qKiBAaW5oZXJpdGRvYyAqL1xuZXhwb3J0IGZ1bmN0aW9uIHBvc3RUb29sVXNlRmFpbHVyZUhvb2soY29uZmlnLCBoYW5kbGVyKSB7XG4gICAgcmV0dXJuIGNyZWF0ZUhvb2tGdW5jdGlvbihcIlBvc3RUb29sVXNlRmFpbHVyZVwiLCBjb25maWcsIGhhbmRsZXIpO1xufVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gTm90aWZpY2F0aW9uIEhvb2sgRmFjdG9yeVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLyoqXG4gKiBDcmVhdGVzIGEgTm90aWZpY2F0aW9uIGhvb2sgaGFuZGxlci5cbiAqXG4gKiBOb3RpZmljYXRpb24gaG9va3MgZmlyZSB3aGVuIENsYXVkZSBDb2RlIHNlbmRzIGEgbm90aWZpY2F0aW9uLCBhbGxvd2luZyB5b3UgdG86XG4gKiAtIEZvcndhcmQgbm90aWZpY2F0aW9ucyB0byBleHRlcm5hbCBzeXN0ZW1zXG4gKiAtIExvZyBpbXBvcnRhbnQgZXZlbnRzXG4gKiAtIFRyaWdnZXIgY3VzdG9tIGFsZXJ0aW5nXG4gKlxuICogKipNYXRjaGVyKio6IE1hdGNoZXMgYWdhaW5zdCBgbm90aWZpY2F0aW9uX3R5cGVgXG4gKiBAcGFyYW0gY29uZmlnIC0gSG9vayBjb25maWd1cmF0aW9uIHdpdGggb3B0aW9uYWwgbWF0Y2hlciBhbmQgdGltZW91dFxuICogQHBhcmFtIGhhbmRsZXIgLSBUaGUgaGFuZGxlciBmdW5jdGlvbiB0byBleGVjdXRlXG4gKiBAcmV0dXJucyBBIGhvb2sgZnVuY3Rpb24gdGhhdCBjYW4gYmUgZXhwb3J0ZWQgYXMgdGhlIGRlZmF1bHQgZXhwb3J0XG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogaW1wb3J0IHsgbm90aWZpY2F0aW9uSG9vaywgbm90aWZpY2F0aW9uT3V0cHV0IH0gZnJvbSAnQGdvb2Rmb290L2NsYXVkZS1jb2RlLWhvb2tzJztcbiAqXG4gKiAvLyBGb3J3YXJkIG5vdGlmaWNhdGlvbnMgdG8gU2xhY2tcbiAqIGV4cG9ydCBkZWZhdWx0IG5vdGlmaWNhdGlvbkhvb2soe30sIGFzeW5jIChpbnB1dCwgeyBsb2dnZXIgfSkgPT4ge1xuICogICBsb2dnZXIuaW5mbygnTm90aWZpY2F0aW9uIHJlY2VpdmVkJywge1xuICogICAgIHR5cGU6IGlucHV0Lm5vdGlmaWNhdGlvbl90eXBlLFxuICogICAgIHRpdGxlOiBpbnB1dC50aXRsZVxuICogICB9KTtcbiAqXG4gKiAgIGF3YWl0IHNlbmRTbGFja01lc3NhZ2UoaW5wdXQudGl0bGUgPz8gJ05vdGlmaWNhdGlvbicsIGlucHV0Lm1lc3NhZ2UpO1xuICpcbiAqICAgcmV0dXJuIG5vdGlmaWNhdGlvbk91dHB1dCh7fSk7XG4gKiB9KTtcbiAqIGBgYFxuICogQHNlZSBodHRwczovL2NvZGUuY2xhdWRlLmNvbS9kb2NzL2VuL2hvb2tzI25vdGlmaWNhdGlvblxuICovXG5leHBvcnQgZnVuY3Rpb24gbm90aWZpY2F0aW9uSG9vayhjb25maWcsIGhhbmRsZXIpIHtcbiAgICByZXR1cm4gY3JlYXRlSG9va0Z1bmN0aW9uKFwiTm90aWZpY2F0aW9uXCIsIGNvbmZpZywgaGFuZGxlcik7XG59XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBVc2VyUHJvbXB0U3VibWl0IEhvb2sgRmFjdG9yeVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLyoqXG4gKiBDcmVhdGVzIGEgVXNlclByb21wdFN1Ym1pdCBob29rIGhhbmRsZXIuXG4gKlxuICogVXNlclByb21wdFN1Ym1pdCBob29rcyBmaXJlIHdoZW4gYSB1c2VyIHN1Ym1pdHMgYSBwcm9tcHQsIGFsbG93aW5nIHlvdSB0bzpcbiAqIC0gQWRkIGFkZGl0aW9uYWwgY29udGV4dCBvciBpbnN0cnVjdGlvbnNcbiAqIC0gTG9nIHVzZXIgaW50ZXJhY3Rpb25zXG4gKiAtIFZhbGlkYXRlIG9yIHRyYW5zZm9ybSBwcm9tcHRzXG4gKlxuICogKipNYXRjaGVyKio6IE5vIG1hdGNoZXIgc3VwcG9ydCAtIGZpcmVzIG9uIGFsbCBwcm9tcHQgc3VibWlzc2lvbnNcbiAqIEBwYXJhbSBjb25maWcgLSBIb29rIGNvbmZpZ3VyYXRpb24gd2l0aCBvcHRpb25hbCB0aW1lb3V0IChtYXRjaGVyIGlzIGlnbm9yZWQpXG4gKiBAcGFyYW0gaGFuZGxlciAtIFRoZSBoYW5kbGVyIGZ1bmN0aW9uIHRvIGV4ZWN1dGVcbiAqIEByZXR1cm5zIEEgaG9vayBmdW5jdGlvbiB0aGF0IGNhbiBiZSBleHBvcnRlZCBhcyB0aGUgZGVmYXVsdCBleHBvcnRcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBpbXBvcnQgeyB1c2VyUHJvbXB0U3VibWl0SG9vaywgdXNlclByb21wdFN1Ym1pdE91dHB1dCB9IGZyb20gJ0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcyc7XG4gKlxuICogLy8gQWRkIHByb2plY3QgY29udGV4dCB0byBldmVyeSBwcm9tcHRcbiAqIGV4cG9ydCBkZWZhdWx0IHVzZXJQcm9tcHRTdWJtaXRIb29rKHt9LCBhc3luYyAoaW5wdXQsIHsgbG9nZ2VyIH0pID0+IHtcbiAqICAgbG9nZ2VyLmRlYnVnKCdVc2VyIHByb21wdCBzdWJtaXR0ZWQnLCB7IHByb21wdExlbmd0aDogaW5wdXQucHJvbXB0Lmxlbmd0aCB9KTtcbiAqXG4gKiAgIGNvbnN0IHByb2plY3RDb250ZXh0ID0gYXdhaXQgZ2V0UHJvamVjdENvbnRleHQoKTtcbiAqXG4gKiAgIHJldHVybiB1c2VyUHJvbXB0U3VibWl0T3V0cHV0KHtcbiAqICAgICBhZGRpdGlvbmFsQ29udGV4dDogcHJvamVjdENvbnRleHRcbiAqICAgfSk7XG4gKiB9KTtcbiAqIGBgYFxuICogQHNlZSBodHRwczovL2NvZGUuY2xhdWRlLmNvbS9kb2NzL2VuL2hvb2tzI3VzZXJwcm9tcHRzdWJtaXRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHVzZXJQcm9tcHRTdWJtaXRIb29rKGNvbmZpZywgaGFuZGxlcikge1xuICAgIHJldHVybiBjcmVhdGVIb29rRnVuY3Rpb24oXCJVc2VyUHJvbXB0U3VibWl0XCIsIGNvbmZpZywgaGFuZGxlcik7XG59XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBTZXNzaW9uU3RhcnQgSG9vayBGYWN0b3J5XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vKipcbiAqIENyZWF0ZXMgYSBTZXNzaW9uU3RhcnQgaG9vayBoYW5kbGVyLlxuICpcbiAqIFNlc3Npb25TdGFydCBob29rcyBmaXJlIHdoZW4gYSBDbGF1ZGUgQ29kZSBzZXNzaW9uIHN0YXJ0cyBvciByZXN0YXJ0cyxcbiAqIGFsbG93aW5nIHlvdSB0bzpcbiAqIC0gSW5pdGlhbGl6ZSBzZXNzaW9uIHN0YXRlXG4gKiAtIEluamVjdCBjb250ZXh0IG9yIGluc3RydWN0aW9uc1xuICogLSBQZXJzaXN0IGVudmlyb25tZW50IHZhcmlhYmxlcyBmb3Igc3Vic2VxdWVudCBiYXNoIGNvbW1hbmRzXG4gKiAtIFNldCB1cCBsb2dnaW5nIG9yIG1vbml0b3JpbmdcbiAqXG4gKiAqKk1hdGNoZXIqKjogTWF0Y2hlcyBhZ2FpbnN0IGBzb3VyY2VgICgnc3RhcnR1cCcsICdyZXN1bWUnLCAnY2xlYXInLCAnY29tcGFjdCcpXG4gKlxuICogKipDb250ZXh0Kio6IFNlc3Npb25TdGFydCBob29rcyByZWNlaXZlIGFuIGV4dGVuZGVkIGNvbnRleHQgd2l0aCBgcGVyc2lzdEVudlZhcmBcbiAqIGFuZCBgcGVyc2lzdEVudlZhcnNgIGZ1bmN0aW9ucyBmb3Igc2V0dGluZyBlbnZpcm9ubWVudCB2YXJpYWJsZXMuXG4gKiBAcGFyYW0gY29uZmlnIC0gSG9vayBjb25maWd1cmF0aW9uIHdpdGggb3B0aW9uYWwgbWF0Y2hlciBhbmQgdGltZW91dFxuICogQHBhcmFtIGhhbmRsZXIgLSBUaGUgaGFuZGxlciBmdW5jdGlvbiB0byBleGVjdXRlXG4gKiBAcmV0dXJucyBBIGhvb2sgZnVuY3Rpb24gdGhhdCBjYW4gYmUgZXhwb3J0ZWQgYXMgdGhlIGRlZmF1bHQgZXhwb3J0XG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogaW1wb3J0IHsgc2Vzc2lvblN0YXJ0SG9vaywgc2Vzc2lvblN0YXJ0T3V0cHV0IH0gZnJvbSAnQGdvb2Rmb290L2NsYXVkZS1jb2RlLWhvb2tzJztcbiAqXG4gKiAvLyBQZXJzaXN0IGVudmlyb25tZW50IHZhcmlhYmxlcyBmb3IgdGhlIHNlc3Npb25cbiAqIGV4cG9ydCBkZWZhdWx0IHNlc3Npb25TdGFydEhvb2soeyBtYXRjaGVyOiAnc3RhcnR1cCcgfSwgYXN5bmMgKGlucHV0LCB7IGxvZ2dlciwgcGVyc2lzdEVudlZhciB9KSA9PiB7XG4gKiAgIGxvZ2dlci5pbmZvKCdOZXcgc2Vzc2lvbiBzdGFydGVkJywge1xuICogICAgIHNlc3Npb25JZDogaW5wdXQuc2Vzc2lvbl9pZCxcbiAqICAgICBjd2Q6IGlucHV0LmN3ZFxuICogICB9KTtcbiAqXG4gKiAgIC8vIFNldCBlbnZpcm9ubWVudCB2YXJpYWJsZXMgZm9yIGFsbCBzdWJzZXF1ZW50IGJhc2ggY29tbWFuZHNcbiAqICAgcGVyc2lzdEVudlZhcignTk9ERV9FTlYnLCAnZGV2ZWxvcG1lbnQnKTtcbiAqICAgcGVyc2lzdEVudlZhcignREVCVUcnLCAndHJ1ZScpO1xuICpcbiAqICAgcmV0dXJuIHNlc3Npb25TdGFydE91dHB1dCh7fSk7XG4gKiB9KTtcbiAqIGBgYFxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIC8vIFNldCBtdWx0aXBsZSBlbnZpcm9ubWVudCB2YXJpYWJsZXMgYXQgb25jZVxuICogZXhwb3J0IGRlZmF1bHQgc2Vzc2lvblN0YXJ0SG9vayh7fSwgYXN5bmMgKGlucHV0LCB7IHBlcnNpc3RFbnZWYXJzIH0pID0+IHtcbiAqICAgcGVyc2lzdEVudlZhcnMoe1xuICogICAgIE5PREVfRU5WOiAncHJvZHVjdGlvbicsXG4gKiAgICAgQVBJX0tFWTogJ3NlY3JldCcsXG4gKiAgICAgREVCVUc6ICdmYWxzZSdcbiAqICAgfSk7XG4gKlxuICogICByZXR1cm4gc2Vzc2lvblN0YXJ0T3V0cHV0KHt9KTtcbiAqIH0pO1xuICogYGBgXG4gKiBAc2VlIGh0dHBzOi8vY29kZS5jbGF1ZGUuY29tL2RvY3MvZW4vaG9va3Mjc2Vzc2lvbnN0YXJ0XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzZXNzaW9uU3RhcnRIb29rKGNvbmZpZywgaGFuZGxlcikge1xuICAgIHJldHVybiBjcmVhdGVIb29rRnVuY3Rpb24oXCJTZXNzaW9uU3RhcnRcIiwgY29uZmlnLCBoYW5kbGVyKTtcbn1cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIFNlc3Npb25FbmQgSG9vayBGYWN0b3J5XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vKipcbiAqIENyZWF0ZXMgYSBTZXNzaW9uRW5kIGhvb2sgaGFuZGxlci5cbiAqXG4gKiBTZXNzaW9uRW5kIGhvb2tzIGZpcmUgd2hlbiBhIENsYXVkZSBDb2RlIHNlc3Npb24gZW5kcywgYWxsb3dpbmcgeW91IHRvOlxuICogLSBDbGVhbiB1cCBzZXNzaW9uIHJlc291cmNlc1xuICogLSBMb2cgc2Vzc2lvbiBtZXRyaWNzXG4gKiAtIFBlcnNpc3Qgc2Vzc2lvbiBzdGF0ZVxuICpcbiAqICoqTWF0Y2hlcioqOiBNYXRjaGVzIGFnYWluc3QgYHJlYXNvbmAgKHRoZSBleGl0IHJlYXNvbiBzdHJpbmcpXG4gKiBAcGFyYW0gY29uZmlnIC0gSG9vayBjb25maWd1cmF0aW9uIHdpdGggb3B0aW9uYWwgbWF0Y2hlciBhbmQgdGltZW91dFxuICogQHBhcmFtIGhhbmRsZXIgLSBUaGUgaGFuZGxlciBmdW5jdGlvbiB0byBleGVjdXRlXG4gKiBAcmV0dXJucyBBIGhvb2sgZnVuY3Rpb24gdGhhdCBjYW4gYmUgZXhwb3J0ZWQgYXMgdGhlIGRlZmF1bHQgZXhwb3J0XG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogaW1wb3J0IHsgc2Vzc2lvbkVuZEhvb2ssIHNlc3Npb25FbmRPdXRwdXQgfSBmcm9tICdAZ29vZGZvb3QvY2xhdWRlLWNvZGUtaG9va3MnO1xuICpcbiAqIC8vIExvZyBzZXNzaW9uIGVuZCBhbmQgY2xlYW4gdXBcbiAqIGV4cG9ydCBkZWZhdWx0IHNlc3Npb25FbmRIb29rKHt9LCBhc3luYyAoaW5wdXQsIHsgbG9nZ2VyIH0pID0+IHtcbiAqICAgbG9nZ2VyLmluZm8oJ1Nlc3Npb24gZW5kZWQnLCB7XG4gKiAgICAgc2Vzc2lvbklkOiBpbnB1dC5zZXNzaW9uX2lkLFxuICogICAgIHJlYXNvbjogaW5wdXQucmVhc29uXG4gKiAgIH0pO1xuICpcbiAqICAgYXdhaXQgY2xlYW51cFNlc3Npb25SZXNvdXJjZXMoaW5wdXQuc2Vzc2lvbl9pZCk7XG4gKlxuICogICByZXR1cm4gc2Vzc2lvbkVuZE91dHB1dCh7fSk7XG4gKiB9KTtcbiAqIGBgYFxuICogQHNlZSBodHRwczovL2NvZGUuY2xhdWRlLmNvbS9kb2NzL2VuL2hvb2tzI3Nlc3Npb25lbmRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHNlc3Npb25FbmRIb29rKGNvbmZpZywgaGFuZGxlcikge1xuICAgIHJldHVybiBjcmVhdGVIb29rRnVuY3Rpb24oXCJTZXNzaW9uRW5kXCIsIGNvbmZpZywgaGFuZGxlcik7XG59XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBTdG9wIEhvb2sgRmFjdG9yeVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLyoqXG4gKiBDcmVhdGVzIGEgU3RvcCBob29rIGhhbmRsZXIuXG4gKlxuICogU3RvcCBob29rcyBmaXJlIHdoZW4gQ2xhdWRlIENvZGUgaXMgYWJvdXQgdG8gc3RvcCwgYWxsb3dpbmcgeW91IHRvOlxuICogLSBCbG9jayB0aGUgc3RvcCBhbmQgcmVxdWlyZSBhZGRpdGlvbmFsIGFjdGlvblxuICogLSBDb25maXJtIHRoZSB1c2VyIHdhbnRzIHRvIHN0b3BcbiAqIC0gQ2xlYW4gdXAgcmVzb3VyY2VzIGJlZm9yZSBzdG9wcGluZ1xuICpcbiAqICoqTWF0Y2hlcioqOiBObyBtYXRjaGVyIHN1cHBvcnQgLSBmaXJlcyBvbiBhbGwgc3RvcCBldmVudHNcbiAqIEBwYXJhbSBjb25maWcgLSBIb29rIGNvbmZpZ3VyYXRpb24gd2l0aCBvcHRpb25hbCB0aW1lb3V0IChtYXRjaGVyIGlzIGlnbm9yZWQpXG4gKiBAcGFyYW0gaGFuZGxlciAtIFRoZSBoYW5kbGVyIGZ1bmN0aW9uIHRvIGV4ZWN1dGVcbiAqIEByZXR1cm5zIEEgaG9vayBmdW5jdGlvbiB0aGF0IGNhbiBiZSBleHBvcnRlZCBhcyB0aGUgZGVmYXVsdCBleHBvcnRcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBpbXBvcnQgeyBzdG9wSG9vaywgc3RvcE91dHB1dCB9IGZyb20gJ0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcyc7XG4gKlxuICogLy8gQmxvY2sgc3RvcCBpZiB0aGVyZSBhcmUgcGVuZGluZyBjaGFuZ2VzXG4gKiBleHBvcnQgZGVmYXVsdCBzdG9wSG9vayh7fSwgYXN5bmMgKGlucHV0LCB7IGxvZ2dlciB9KSA9PiB7XG4gKiAgIGNvbnN0IHBlbmRpbmdDaGFuZ2VzID0gYXdhaXQgY2hlY2tQZW5kaW5nQ2hhbmdlcygpO1xuICpcbiAqICAgaWYgKHBlbmRpbmdDaGFuZ2VzLmxlbmd0aCA+IDApIHtcbiAqICAgICBsb2dnZXIud2FybignQmxvY2tpbmcgc3RvcCBkdWUgdG8gcGVuZGluZyBjaGFuZ2VzJywge1xuICogICAgICAgY291bnQ6IHBlbmRpbmdDaGFuZ2VzLmxlbmd0aFxuICogICAgIH0pO1xuICpcbiAqICAgICByZXR1cm4gc3RvcE91dHB1dCh7XG4gKiAgICAgICBkZWNpc2lvbjogJ2Jsb2NrJyxcbiAqICAgICAgIHJlYXNvbjogYFRoZXJlIGFyZSAke3BlbmRpbmdDaGFuZ2VzLmxlbmd0aH0gdW5jb21taXR0ZWQgY2hhbmdlc2AsXG4gKiAgICAgICBzeXN0ZW1NZXNzYWdlOiAnUGxlYXNlIGNvbW1pdCBvciBkaXNjYXJkIGNoYW5nZXMgYmVmb3JlIHN0b3BwaW5nJ1xuICogICAgIH0pO1xuICogICB9XG4gKlxuICogICBsb2dnZXIuaW5mbygnQXBwcm92aW5nIHN0b3AnKTtcbiAqICAgcmV0dXJuIHN0b3BPdXRwdXQoeyBkZWNpc2lvbjogJ2FwcHJvdmUnIH0pO1xuICogfSk7XG4gKiBgYGBcbiAqIEBzZWUgaHR0cHM6Ly9jb2RlLmNsYXVkZS5jb20vZG9jcy9lbi9ob29rcyNzdG9wXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzdG9wSG9vayhjb25maWcsIGhhbmRsZXIpIHtcbiAgICByZXR1cm4gY3JlYXRlSG9va0Z1bmN0aW9uKFwiU3RvcFwiLCBjb25maWcsIGhhbmRsZXIpO1xufVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gU3ViYWdlbnRTdGFydCBIb29rIEZhY3Rvcnlcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8qKlxuICogQ3JlYXRlcyBhIFN1YmFnZW50U3RhcnQgaG9vayBoYW5kbGVyLlxuICpcbiAqIFN1YmFnZW50U3RhcnQgaG9va3MgZmlyZSB3aGVuIGEgc3ViYWdlbnQgKFRhc2sgdG9vbCkgc3RhcnRzLCBhbGxvd2luZyB5b3UgdG86XG4gKiAtIEluamVjdCBjb250ZXh0IGZvciB0aGUgc3ViYWdlbnRcbiAqIC0gTG9nIHN1YmFnZW50IGludm9jYXRpb25zXG4gKiAtIENvbmZpZ3VyZSBzdWJhZ2VudCBiZWhhdmlvclxuICpcbiAqICoqTWF0Y2hlcioqOiBNYXRjaGVzIGFnYWluc3QgYGFnZW50X3R5cGVgIChlLmcuLCAnZXhwbG9yZScsICdjb2RlYmFzZS1hbmFseXNpcycpXG4gKiBAcGFyYW0gY29uZmlnIC0gSG9vayBjb25maWd1cmF0aW9uIHdpdGggb3B0aW9uYWwgbWF0Y2hlciBhbmQgdGltZW91dFxuICogQHBhcmFtIGhhbmRsZXIgLSBUaGUgaGFuZGxlciBmdW5jdGlvbiB0byBleGVjdXRlXG4gKiBAcmV0dXJucyBBIGhvb2sgZnVuY3Rpb24gdGhhdCBjYW4gYmUgZXhwb3J0ZWQgYXMgdGhlIGRlZmF1bHQgZXhwb3J0XG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogaW1wb3J0IHsgc3ViYWdlbnRTdGFydEhvb2ssIHN1YmFnZW50U3RhcnRPdXRwdXQgfSBmcm9tICdAZ29vZGZvb3QvY2xhdWRlLWNvZGUtaG9va3MnO1xuICpcbiAqIC8vIEFkZCBjb250ZXh0IGZvciBleHBsb3JlIHN1YmFnZW50c1xuICogZXhwb3J0IGRlZmF1bHQgc3ViYWdlbnRTdGFydEhvb2soeyBtYXRjaGVyOiAnZXhwbG9yZScgfSwgYXN5bmMgKGlucHV0LCB7IGxvZ2dlciB9KSA9PiB7XG4gKiAgIGxvZ2dlci5pbmZvKCdFeHBsb3JlIHN1YmFnZW50IHN0YXJ0aW5nJywge1xuICogICAgIGFnZW50SWQ6IGlucHV0LmFnZW50X2lkLFxuICogICAgIGFnZW50VHlwZTogaW5wdXQuYWdlbnRfdHlwZVxuICogICB9KTtcbiAqXG4gKiAgIHJldHVybiBzdWJhZ2VudFN0YXJ0T3V0cHV0KHtcbiAqICAgICBhZGRpdGlvbmFsQ29udGV4dDogJ0ZvY3VzIG9uIGZpbmRpbmcgcGF0dGVybnMgYW5kIGNvbnZlbnRpb25zJ1xuICogICB9KTtcbiAqIH0pO1xuICogYGBgXG4gKiBAc2VlIGh0dHBzOi8vY29kZS5jbGF1ZGUuY29tL2RvY3MvZW4vaG9va3Mjc3ViYWdlbnRzdGFydFxuICovXG5leHBvcnQgZnVuY3Rpb24gc3ViYWdlbnRTdGFydEhvb2soY29uZmlnLCBoYW5kbGVyKSB7XG4gICAgcmV0dXJuIGNyZWF0ZUhvb2tGdW5jdGlvbihcIlN1YmFnZW50U3RhcnRcIiwgY29uZmlnLCBoYW5kbGVyKTtcbn1cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIFN1YmFnZW50U3RvcCBIb29rIEZhY3Rvcnlcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8qKlxuICogQ3JlYXRlcyBhIFN1YmFnZW50U3RvcCBob29rIGhhbmRsZXIuXG4gKlxuICogU3ViYWdlbnRTdG9wIGhvb2tzIGZpcmUgd2hlbiBhIHN1YmFnZW50IGNvbXBsZXRlcyBvciBzdG9wcywgYWxsb3dpbmcgeW91IHRvOlxuICogLSBCbG9jayB0aGUgc3ViYWdlbnQgZnJvbSBzdG9wcGluZ1xuICogLSBQcm9jZXNzIHN1YmFnZW50IHJlc3VsdHNcbiAqIC0gQ2xlYW4gdXAgc3ViYWdlbnQgcmVzb3VyY2VzXG4gKiAtIExvZyBzdWJhZ2VudCBjb21wbGV0aW9uXG4gKlxuICogKipNYXRjaGVyKio6IE1hdGNoZXMgYWdhaW5zdCBgYWdlbnRfdHlwZWAgKGUuZy4sICdleHBsb3JlJywgJ2NvZGViYXNlLWFuYWx5c2lzJylcbiAqIEBwYXJhbSBjb25maWcgLSBIb29rIGNvbmZpZ3VyYXRpb24gd2l0aCBvcHRpb25hbCBtYXRjaGVyIGFuZCB0aW1lb3V0XG4gKiBAcGFyYW0gaGFuZGxlciAtIFRoZSBoYW5kbGVyIGZ1bmN0aW9uIHRvIGV4ZWN1dGVcbiAqIEByZXR1cm5zIEEgaG9vayBmdW5jdGlvbiB0aGF0IGNhbiBiZSBleHBvcnRlZCBhcyB0aGUgZGVmYXVsdCBleHBvcnRcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBpbXBvcnQgeyBzdWJhZ2VudFN0b3BIb29rLCBzdWJhZ2VudFN0b3BPdXRwdXQgfSBmcm9tICdAZ29vZGZvb3QvY2xhdWRlLWNvZGUtaG9va3MnO1xuICpcbiAqIC8vIEJsb2NrIGV4cGxvcmUgc3ViYWdlbnRzIGlmIHRhc2sgaW5jb21wbGV0ZVxuICogZXhwb3J0IGRlZmF1bHQgc3ViYWdlbnRTdG9wSG9vayh7IG1hdGNoZXI6ICdleHBsb3JlJyB9LCBhc3luYyAoaW5wdXQsIHsgbG9nZ2VyIH0pID0+IHtcbiAqICAgbG9nZ2VyLmluZm8oJ1N1YmFnZW50IHN0b3BwaW5nJywge1xuICogICAgIGFnZW50SWQ6IGlucHV0LmFnZW50X2lkLFxuICogICAgIGFnZW50VHlwZTogaW5wdXQuYWdlbnRfdHlwZVxuICogICB9KTtcbiAqXG4gKiAgIC8vIEJsb2NrIGlmIHRyYW5zY3JpcHQgc2hvd3MgaW5jb21wbGV0ZSB3b3JrXG4gKiAgIHJldHVybiBzdWJhZ2VudFN0b3BPdXRwdXQoe1xuICogICAgIGRlY2lzaW9uOiAnYmxvY2snLFxuICogICAgIHJlYXNvbjogJ1BsZWFzZSB2ZXJpZnkgZXhwbG9yYXRpb24gaXMgY29tcGxldGUnXG4gKiAgIH0pO1xuICogfSk7XG4gKiBgYGBcbiAqIEBzZWUgaHR0cHM6Ly9jb2RlLmNsYXVkZS5jb20vZG9jcy9lbi9ob29rcyNzdWJhZ2VudHN0b3BcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHN1YmFnZW50U3RvcEhvb2soY29uZmlnLCBoYW5kbGVyKSB7XG4gICAgcmV0dXJuIGNyZWF0ZUhvb2tGdW5jdGlvbihcIlN1YmFnZW50U3RvcFwiLCBjb25maWcsIGhhbmRsZXIpO1xufVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gUHJlQ29tcGFjdCBIb29rIEZhY3Rvcnlcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8qKlxuICogQ3JlYXRlcyBhIFByZUNvbXBhY3QgaG9vayBoYW5kbGVyLlxuICpcbiAqIFByZUNvbXBhY3QgaG9va3MgZmlyZSBiZWZvcmUgY29udGV4dCBjb21wYWN0aW9uIG9jY3VycywgYWxsb3dpbmcgeW91IHRvOlxuICogLSBQcmVzZXJ2ZSBpbXBvcnRhbnQgaW5mb3JtYXRpb24gYmVmb3JlIGNvbXBhY3Rpb25cbiAqIC0gTG9nIGNvbXBhY3Rpb24gZXZlbnRzXG4gKiAtIE1vZGlmeSBjdXN0b20gaW5zdHJ1Y3Rpb25zIGZvciB0aGUgY29tcGFjdGVkIGNvbnRleHRcbiAqXG4gKiAqKk1hdGNoZXIqKjogTWF0Y2hlcyBhZ2FpbnN0IGB0cmlnZ2VyYCAoJ21hbnVhbCcsICdhdXRvJylcbiAqIEBwYXJhbSBjb25maWcgLSBIb29rIGNvbmZpZ3VyYXRpb24gd2l0aCBvcHRpb25hbCBtYXRjaGVyIGFuZCB0aW1lb3V0XG4gKiBAcGFyYW0gaGFuZGxlciAtIFRoZSBoYW5kbGVyIGZ1bmN0aW9uIHRvIGV4ZWN1dGVcbiAqIEByZXR1cm5zIEEgaG9vayBmdW5jdGlvbiB0aGF0IGNhbiBiZSBleHBvcnRlZCBhcyB0aGUgZGVmYXVsdCBleHBvcnRcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBpbXBvcnQgeyBwcmVDb21wYWN0SG9vaywgcHJlQ29tcGFjdE91dHB1dCB9IGZyb20gJ0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcyc7XG4gKlxuICogLy8gTG9nIGNvbXBhY3Rpb24gZXZlbnRzIGFuZCBwcmVzZXJ2ZSBjb250ZXh0XG4gKiBleHBvcnQgZGVmYXVsdCBwcmVDb21wYWN0SG9vayh7fSwgYXN5bmMgKGlucHV0LCB7IGxvZ2dlciB9KSA9PiB7XG4gKiAgIGxvZ2dlci5pbmZvKCdDb250ZXh0IGNvbXBhY3Rpb24gdHJpZ2dlcmVkJywge1xuICogICAgIHRyaWdnZXI6IGlucHV0LnRyaWdnZXIsXG4gKiAgICAgaGFzQ3VzdG9tSW5zdHJ1Y3Rpb25zOiBpbnB1dC5jdXN0b21faW5zdHJ1Y3Rpb25zICE9PSBudWxsXG4gKiAgIH0pO1xuICpcbiAqICAgcmV0dXJuIHByZUNvbXBhY3RPdXRwdXQoe1xuICogICAgIHN5c3RlbU1lc3NhZ2U6ICdSZW1lbWJlcjogc3RyaWN0IG1vZGUgaXMgZW5hYmxlZCdcbiAqICAgfSk7XG4gKiB9KTtcbiAqIGBgYFxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIC8vIE9ubHkgaGFuZGxlIG1hbnVhbCBjb21wYWN0aW9uXG4gKiBleHBvcnQgZGVmYXVsdCBwcmVDb21wYWN0SG9vayh7IG1hdGNoZXI6ICdtYW51YWwnIH0sIGFzeW5jIChpbnB1dCwgeyBsb2dnZXIgfSkgPT4ge1xuICogICBsb2dnZXIuaW5mbygnTWFudWFsIGNvbXBhY3Rpb24gcmVxdWVzdGVkJyk7XG4gKiAgIHJldHVybiBwcmVDb21wYWN0T3V0cHV0KHt9KTtcbiAqIH0pO1xuICogYGBgXG4gKiBAc2VlIGh0dHBzOi8vY29kZS5jbGF1ZGUuY29tL2RvY3MvZW4vaG9va3MjcHJlY29tcGFjdFxuICovXG5leHBvcnQgZnVuY3Rpb24gcHJlQ29tcGFjdEhvb2soY29uZmlnLCBoYW5kbGVyKSB7XG4gICAgcmV0dXJuIGNyZWF0ZUhvb2tGdW5jdGlvbihcIlByZUNvbXBhY3RcIiwgY29uZmlnLCBoYW5kbGVyKTtcbn1cbi8qKiBAaW5oZXJpdGRvYyAqL1xuZXhwb3J0IGZ1bmN0aW9uIHBlcm1pc3Npb25SZXF1ZXN0SG9vayhjb25maWcsIGhhbmRsZXIpIHtcbiAgICByZXR1cm4gY3JlYXRlSG9va0Z1bmN0aW9uKFwiUGVybWlzc2lvblJlcXVlc3RcIiwgY29uZmlnLCBoYW5kbGVyKTtcbn1cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIFNldHVwIEhvb2sgRmFjdG9yeVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLyoqXG4gKiBDcmVhdGVzIGEgU2V0dXAgaG9vayBoYW5kbGVyLlxuICpcbiAqIFNldHVwIGhvb2tzIGZpcmUgZHVyaW5nIGluaXRpYWxpemF0aW9uIG9yIG1haW50ZW5hbmNlLCBhbGxvd2luZyB5b3UgdG86XG4gKiAtIENvbmZpZ3VyZSBpbml0aWFsIHNlc3Npb24gc3RhdGVcbiAqIC0gUGVyZm9ybSBzZXR1cCB0YXNrcyBiZWZvcmUgdGhlIHNlc3Npb24gc3RhcnRzXG4gKiAtIEFkZCBjb250ZXh0IGZvciBtYWludGVuYW5jZSBvcGVyYXRpb25zXG4gKlxuICogKipNYXRjaGVyKio6IE1hdGNoZXMgYWdhaW5zdCBgdHJpZ2dlcmAgKCdpbml0JyBvciAnbWFpbnRlbmFuY2UnKVxuICogQHBhcmFtIGNvbmZpZyAtIEhvb2sgY29uZmlndXJhdGlvbiB3aXRoIG9wdGlvbmFsIG1hdGNoZXIgYW5kIHRpbWVvdXRcbiAqIEBwYXJhbSBoYW5kbGVyIC0gVGhlIGhhbmRsZXIgZnVuY3Rpb24gdG8gZXhlY3V0ZVxuICogQHJldHVybnMgQSBob29rIGZ1bmN0aW9uIHRoYXQgY2FuIGJlIGV4cG9ydGVkIGFzIHRoZSBkZWZhdWx0IGV4cG9ydFxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGltcG9ydCB7IHNldHVwSG9vaywgc2V0dXBPdXRwdXQgfSBmcm9tICdAZ29vZGZvb3QvY2xhdWRlLWNvZGUtaG9va3MnO1xuICpcbiAqIC8vIEhhbmRsZSBhbGwgc2V0dXAgZXZlbnRzXG4gKiBleHBvcnQgZGVmYXVsdCBzZXR1cEhvb2soe30sIGFzeW5jIChpbnB1dCwgeyBsb2dnZXIgfSkgPT4ge1xuICogICBsb2dnZXIuaW5mbygnU2V0dXAgdHJpZ2dlcmVkJywgeyB0cmlnZ2VyOiBpbnB1dC50cmlnZ2VyIH0pO1xuICogICByZXR1cm4gc2V0dXBPdXRwdXQoe30pO1xuICogfSk7XG4gKlxuICogLy8gT25seSBoYW5kbGUgaW5pdGlhbGl6YXRpb25cbiAqIGV4cG9ydCBkZWZhdWx0IHNldHVwSG9vayh7IG1hdGNoZXI6ICdpbml0JyB9LCBhc3luYyAoaW5wdXQsIHsgbG9nZ2VyIH0pID0+IHtcbiAqICAgbG9nZ2VyLmluZm8oJ0luaXRpYWxpemluZyBzZXNzaW9uJyk7XG4gKiAgIHJldHVybiBzZXR1cE91dHB1dCh7XG4gKiAgICAgaG9va1NwZWNpZmljT3V0cHV0OiB7XG4gKiAgICAgICBhZGRpdGlvbmFsQ29udGV4dDogJ1Nlc3Npb24gaW5pdGlhbGl6ZWQgd2l0aCBjdXN0b20gY29uZmlndXJhdGlvbidcbiAqICAgICB9XG4gKiAgIH0pO1xuICogfSk7XG4gKiBgYGBcbiAqIEBzZWUgaHR0cHM6Ly9jb2RlLmNsYXVkZS5jb20vZG9jcy9lbi9ob29rcyNzZXR1cFxuICovXG5leHBvcnQgZnVuY3Rpb24gc2V0dXBIb29rKGNvbmZpZywgaGFuZGxlcikge1xuICAgIHJldHVybiBjcmVhdGVIb29rRnVuY3Rpb24oXCJTZXR1cFwiLCBjb25maWcsIGhhbmRsZXIpO1xufVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gVGVhbW1hdGVJZGxlIEhvb2sgRmFjdG9yeVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLyoqXG4gKiBDcmVhdGVzIGEgVGVhbW1hdGVJZGxlIGhvb2sgaGFuZGxlci5cbiAqXG4gKiBUZWFtbWF0ZUlkbGUgaG9va3MgZmlyZSB3aGVuIGEgdGVhbW1hdGUgaW4gYSB0ZWFtIGlzIGFib3V0IHRvIGdvIGlkbGUsXG4gKiBhbGxvd2luZyB5b3UgdG86XG4gKiAtIEFzc2lnbiB3b3JrIHRvIGlkbGUgdGVhbW1hdGVzXG4gKiAtIExvZyB0ZWFtIGFjdGl2aXR5XG4gKiAtIENvb3JkaW5hdGUgbXVsdGktYWdlbnQgd29ya2Zsb3dzXG4gKlxuICogKipNYXRjaGVyKio6IE5vIG1hdGNoZXIgc3VwcG9ydCAtIGZpcmVzIG9uIGFsbCB0ZWFtbWF0ZSBpZGxlIGV2ZW50c1xuICogQHBhcmFtIGNvbmZpZyAtIEhvb2sgY29uZmlndXJhdGlvbiB3aXRoIG9wdGlvbmFsIHRpbWVvdXQgKG1hdGNoZXIgaXMgaWdub3JlZClcbiAqIEBwYXJhbSBoYW5kbGVyIC0gVGhlIGhhbmRsZXIgZnVuY3Rpb24gdG8gZXhlY3V0ZVxuICogQHJldHVybnMgQSBob29rIGZ1bmN0aW9uIHRoYXQgY2FuIGJlIGV4cG9ydGVkIGFzIHRoZSBkZWZhdWx0IGV4cG9ydFxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGltcG9ydCB7IHRlYW1tYXRlSWRsZUhvb2ssIHRlYW1tYXRlSWRsZU91dHB1dCB9IGZyb20gJ0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcyc7XG4gKlxuICogLy8gTG9nIHdoZW4gdGVhbW1hdGVzIGdvIGlkbGVcbiAqIGV4cG9ydCBkZWZhdWx0IHRlYW1tYXRlSWRsZUhvb2soe30sIGFzeW5jIChpbnB1dCwgeyBsb2dnZXIgfSkgPT4ge1xuICogICBsb2dnZXIuaW5mbygnVGVhbW1hdGUgZ29pbmcgaWRsZScsIHtcbiAqICAgICB0ZWFtbWF0ZU5hbWU6IGlucHV0LnRlYW1tYXRlX25hbWUsXG4gKiAgICAgdGVhbU5hbWU6IGlucHV0LnRlYW1fbmFtZVxuICogICB9KTtcbiAqXG4gKiAgIHJldHVybiB0ZWFtbWF0ZUlkbGVPdXRwdXQoe30pO1xuICogfSk7XG4gKiBgYGBcbiAqIEBzZWUgaHR0cHM6Ly9jb2RlLmNsYXVkZS5jb20vZG9jcy9lbi9ob29rcyN0ZWFtbWF0ZWlkbGVcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHRlYW1tYXRlSWRsZUhvb2soY29uZmlnLCBoYW5kbGVyKSB7XG4gICAgcmV0dXJuIGNyZWF0ZUhvb2tGdW5jdGlvbihcIlRlYW1tYXRlSWRsZVwiLCBjb25maWcsIGhhbmRsZXIpO1xufVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gVGFza0NvbXBsZXRlZCBIb29rIEZhY3Rvcnlcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8qKlxuICogQ3JlYXRlcyBhIFRhc2tDb21wbGV0ZWQgaG9vayBoYW5kbGVyLlxuICpcbiAqIFRhc2tDb21wbGV0ZWQgaG9va3MgZmlyZSB3aGVuIGEgdGFzayBpcyBiZWluZyBtYXJrZWQgYXMgY29tcGxldGVkLFxuICogYWxsb3dpbmcgeW91IHRvOlxuICogLSBWZXJpZnkgdGFzayBjb21wbGV0aW9uXG4gKiAtIExvZyB0YXNrIG1ldHJpY3NcbiAqIC0gVHJpZ2dlciBmb2xsb3ctdXAgYWN0aW9uc1xuICpcbiAqICoqTWF0Y2hlcioqOiBObyBtYXRjaGVyIHN1cHBvcnQgLSBmaXJlcyBvbiBhbGwgdGFzayBjb21wbGV0aW9uIGV2ZW50c1xuICogQHBhcmFtIGNvbmZpZyAtIEhvb2sgY29uZmlndXJhdGlvbiB3aXRoIG9wdGlvbmFsIHRpbWVvdXQgKG1hdGNoZXIgaXMgaWdub3JlZClcbiAqIEBwYXJhbSBoYW5kbGVyIC0gVGhlIGhhbmRsZXIgZnVuY3Rpb24gdG8gZXhlY3V0ZVxuICogQHJldHVybnMgQSBob29rIGZ1bmN0aW9uIHRoYXQgY2FuIGJlIGV4cG9ydGVkIGFzIHRoZSBkZWZhdWx0IGV4cG9ydFxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGltcG9ydCB7IHRhc2tDb21wbGV0ZWRIb29rLCB0YXNrQ29tcGxldGVkT3V0cHV0IH0gZnJvbSAnQGdvb2Rmb290L2NsYXVkZS1jb2RlLWhvb2tzJztcbiAqXG4gKiAvLyBMb2cgdGFzayBjb21wbGV0aW9uXG4gKiBleHBvcnQgZGVmYXVsdCB0YXNrQ29tcGxldGVkSG9vayh7fSwgYXN5bmMgKGlucHV0LCB7IGxvZ2dlciB9KSA9PiB7XG4gKiAgIGxvZ2dlci5pbmZvKCdUYXNrIGNvbXBsZXRlZCcsIHtcbiAqICAgICB0YXNrSWQ6IGlucHV0LnRhc2tfaWQsXG4gKiAgICAgdGFza1N1YmplY3Q6IGlucHV0LnRhc2tfc3ViamVjdFxuICogICB9KTtcbiAqXG4gKiAgIHJldHVybiB0YXNrQ29tcGxldGVkT3V0cHV0KHt9KTtcbiAqIH0pO1xuICogYGBgXG4gKiBAc2VlIGh0dHBzOi8vY29kZS5jbGF1ZGUuY29tL2RvY3MvZW4vaG9va3MjdGFza2NvbXBsZXRlZFxuICovXG5leHBvcnQgZnVuY3Rpb24gdGFza0NvbXBsZXRlZEhvb2soY29uZmlnLCBoYW5kbGVyKSB7XG4gICAgcmV0dXJuIGNyZWF0ZUhvb2tGdW5jdGlvbihcIlRhc2tDb21wbGV0ZWRcIiwgY29uZmlnLCBoYW5kbGVyKTtcbn1cbiIsICIvKipcbiAqIExvZ2dlciBzeXN0ZW0gZm9yIENsYXVkZSBDb2RlIGhvb2tzLlxuICpcbiAqIFByb3ZpZGVzIHN0cnVjdHVyZWQgbG9nZ2luZyB3aXRoIGV2ZW50IHN1YnNjcmlwdGlvbiBhbmQgb3B0aW9uYWwgZmlsZSBvdXRwdXQuXG4gKiBUaGUgbG9nZ2VyIGlzICoqc2lsZW50IGJ5IGRlZmF1bHQqKiB0byBhdm9pZCBpbnRlcmZlcmluZyB3aXRoIGhvb2sgcHJvdG9jb2xcbiAqIChzdGRvdXQgaXMgcmVzZXJ2ZWQgZm9yIEpTT04gcmVzcG9uc2VzLCBzdGRlcnIgbWF5IGNvbmZsaWN0IHdpdGggQ2xhdWRlIENvZGUpLlxuICogQG1vZHVsZVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGltcG9ydCB7IGxvZ2dlciB9IGZyb20gJ0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcyc7XG4gKlxuICogLy8gU3Vic2NyaWJlIHRvIGxvZyBldmVudHNcbiAqIGNvbnN0IHVuc3Vic2NyaWJlID0gbG9nZ2VyLm9uKCdlcnJvcicsIChldmVudCkgPT4ge1xuICogICBjb25zb2xlLmVycm9yKGBFcnJvciBpbiAke2V2ZW50Lmhvb2tUeXBlfTogJHtldmVudC5tZXNzYWdlfWApO1xuICogfSk7XG4gKlxuICogLy8gTGF0ZXIsIGNsZWFuIHVwXG4gKiB1bnN1YnNjcmliZSgpO1xuICogYGBgXG4gKiBAc2VlIGh0dHBzOi8vY29kZS5jbGF1ZGUuY29tL2RvY3MvZW4vaG9va3NcbiAqL1xuaW1wb3J0IHsgY2xvc2VTeW5jLCBleGlzdHNTeW5jLCBta2RpclN5bmMsIG9wZW5TeW5jLCB3cml0ZVN5bmMgfSBmcm9tIFwibm9kZTpmc1wiO1xuaW1wb3J0IHsgZGlybmFtZSB9IGZyb20gXCJub2RlOnBhdGhcIjtcbi8qKlxuICogQWxsIGxvZyBsZXZlbHMgaW4gb3JkZXIgb2Ygc2V2ZXJpdHkgKGxvd2VzdCB0byBoaWdoZXN0KS5cbiAqL1xuZXhwb3J0IGNvbnN0IExPR19MRVZFTFMgPSBbXCJkZWJ1Z1wiLCBcImluZm9cIiwgXCJ3YXJuXCIsIFwiZXJyb3JcIl07XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBMb2dnZXIgQ2xhc3Ncbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8qKlxuICogTG9nZ2VyIGZvciBDbGF1ZGUgQ29kZSBob29rcyB3aXRoIGV2ZW50IHN1YnNjcmlwdGlvbiBhbmQgZmlsZSBvdXRwdXQuXG4gKlxuICogIyMgS2V5IEJlaGF2aW9yc1xuICpcbiAqIHwgQ29uZmlndXJhdGlvbiB8IEJlaGF2aW9yIHxcbiAqIHwtLS0tLS0tLS0tLS0tLXwtLS0tLS0tLS0tfFxuICogfCBObyBjb25maWcgKGRlZmF1bHQpIHwgKipTaWxlbnQqKiAtIG5vIG91dHB1dCBhbnl3aGVyZSB8XG4gKiB8IGBDTEFVREVfQ09ERV9IT09LU19MT0dfRklMRWAgZW52IHZhciB8IEFwcGVuZCBKU09OIGxpbmVzIHRvIGZpbGUgfFxuICogfCBgLm9uKGxldmVsLCBoYW5kbGVyKWAgcmVnaXN0ZXJlZCB8IEV2ZW50cyBkZWxpdmVyZWQgdG8gaGFuZGxlcnMgb25seSB8XG4gKiB8IE11bHRpcGxlIGRlc3RpbmF0aW9ucyB8IEFsbCBkZXN0aW5hdGlvbnMgcmVjZWl2ZSBldmVudHMgfFxuICpcbiAqICMjIEltcG9ydGFudCBOb3Rlc1xuICpcbiAqIC0gKipOZXZlciBvdXRwdXRzIHRvIHN0ZG91dCoqIChyZXNlcnZlZCBmb3IgSlNPTiBob29rIHJlc3BvbnNlKVxuICogLSAqKk5ldmVyIG91dHB1dHMgdG8gc3RkZXJyKiogKG1heSBpbnRlcmZlcmUgd2l0aCBDbGF1ZGUgQ29kZSBlcnJvciBoYW5kbGluZylcbiAqIC0gRmlsZSBvdXRwdXQgdXNlcyBKU09OIExpbmVzIGZvcm1hdCBmb3IgZWFzeSBwYXJzaW5nXG4gKiAtIGAub24obGV2ZWwsIGhhbmRsZXIpYCByZXR1cm5zIGFuIHVuc3Vic2NyaWJlIGZ1bmN0aW9uXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogaW1wb3J0IHsgbG9nZ2VyIH0gZnJvbSAnQGdvb2Rmb290L2NsYXVkZS1jb2RlLWhvb2tzJztcbiAqXG4gKiAvLyBTdWJzY3JpYmUgdG8gZXZlbnRzIGF0IHNwZWNpZmljIGxldmVsXG4gKiBsb2dnZXIub24oJ3dhcm4nLCAoZXZlbnQpID0+IHtcbiAqICAgc2VuZEFsZXJ0KGV2ZW50Lm1lc3NhZ2UpO1xuICogfSk7XG4gKlxuICogLy8gTG9nIHdpdGhpbiBhIGhvb2sgaGFuZGxlclxuICogZXhwb3J0IGRlZmF1bHQgcHJlVG9vbFVzZUhvb2soeyBtYXRjaGVyOiAnQmFzaCcgfSwgYXN5bmMgKGlucHV0LCB7IGxvZ2dlciB9KSA9PiB7XG4gKiAgIGxvZ2dlci53YXJuKCdBYm91dCB0byB2YWxpZGF0ZSBCYXNoIGNvbW1hbmQnKTtcbiAqICAgcmV0dXJuIHByZVRvb2xVc2VPdXRwdXQoeyBhbGxvdzogdHJ1ZSB9KTtcbiAqIH0pO1xuICogYGBgXG4gKi9cbmV4cG9ydCBjbGFzcyBMb2dnZXIge1xuICAgIC8qKlxuICAgICAqIFJlZ2lzdGVyZWQgZXZlbnQgaGFuZGxlcnMgYnkgbG9nIGxldmVsLlxuICAgICAqL1xuICAgIGhhbmRsZXJzID0gbmV3IE1hcCgpO1xuICAgIC8qKlxuICAgICAqIEZpbGUgZGVzY3JpcHRvciBmb3IgbG9nIGZpbGUgb3V0cHV0LlxuICAgICAqIExhemlseSBpbml0aWFsaXplZCBvbiBmaXJzdCB3cml0ZS5cbiAgICAgKi9cbiAgICBsb2dGaWxlRmQgPSBudWxsO1xuICAgIC8qKlxuICAgICAqIFBhdGggdG8gdGhlIGxvZyBmaWxlLCBpZiBjb25maWd1cmVkLlxuICAgICAqL1xuICAgIGxvZ0ZpbGVQYXRoID0gbnVsbDtcbiAgICAvKipcbiAgICAgKiBXaGV0aGVyIGZpbGUgaW5pdGlhbGl6YXRpb24gaGFzIGJlZW4gYXR0ZW1wdGVkLlxuICAgICAqL1xuICAgIGZpbGVJbml0aWFsaXplZCA9IGZhbHNlO1xuICAgIC8qKlxuICAgICAqIEN1cnJlbnQgaG9vayBjb250ZXh0IGZvciBlbnJpY2hpbmcgbG9nIGV2ZW50cy5cbiAgICAgKi9cbiAgICBjdXJyZW50SG9va1R5cGU7XG4gICAgLyoqXG4gICAgICogQ3VycmVudCBob29rIGlucHV0IGZvciBlbnJpY2hpbmcgbG9nIGV2ZW50cy5cbiAgICAgKi9cbiAgICBjdXJyZW50SW5wdXQ7XG4gICAgLyoqXG4gICAgICogQ3JlYXRlcyBhIG5ldyBMb2dnZXIgaW5zdGFuY2UuXG4gICAgICpcbiAgICAgKiBUeXBpY2FsbHkgeW91IHNob3VsZCB1c2UgdGhlIGV4cG9ydGVkIGBsb2dnZXJgIHNpbmdsZXRvbiByYXRoZXIgdGhhblxuICAgICAqIGNyZWF0aW5nIG5ldyBpbnN0YW5jZXMuXG4gICAgICogQHBhcmFtIGNvbmZpZyAtIE9wdGlvbmFsIGNvbmZpZ3VyYXRpb25cbiAgICAgKiBAZXhhbXBsZVxuICAgICAqIGBgYHR5cGVzY3JpcHRcbiAgICAgKiAvLyBVc2Ugc2luZ2xldG9uIChyZWNvbW1lbmRlZClcbiAgICAgKiBpbXBvcnQgeyBsb2dnZXIgfSBmcm9tICdAZ29vZGZvb3QvY2xhdWRlLWNvZGUtaG9va3MnO1xuICAgICAqXG4gICAgICogLy8gT3IgY3JlYXRlIGN1c3RvbSBpbnN0YW5jZVxuICAgICAqIGNvbnN0IGN1c3RvbUxvZ2dlciA9IG5ldyBMb2dnZXIoeyBsb2dGaWxlUGF0aDogJy92YXIvbG9nL2hvb2tzLmxvZycgfSk7XG4gICAgICogYGBgXG4gICAgICovXG4gICAgY29uc3RydWN0b3IoY29uZmlnID0ge30pIHtcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBoYW5kbGVycyBtYXAgZm9yIGVhY2ggbGV2ZWxcbiAgICAgICAgZm9yIChjb25zdCBsZXZlbCBvZiBMT0dfTEVWRUxTKSB7XG4gICAgICAgICAgICB0aGlzLmhhbmRsZXJzLnNldChsZXZlbCwgbmV3IFNldCgpKTtcbiAgICAgICAgfVxuICAgICAgICAvLyBTZXQgbG9nIGZpbGUgcGF0aCBmcm9tIGNvbmZpZyBvciBlbnZpcm9ubWVudFxuICAgICAgICB0aGlzLmxvZ0ZpbGVQYXRoID0gY29uZmlnLmxvZ0ZpbGVQYXRoID8/IHByb2Nlc3MuZW52LkNMQVVERV9DT0RFX0hPT0tTX0xPR19GSUxFID8/IG51bGw7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIExvZ3MgYSBkZWJ1ZyBtZXNzYWdlLlxuICAgICAqXG4gICAgICogVXNlIGZvciBkZXRhaWxlZCBkZWJ1Z2dpbmcgaW5mb3JtYXRpb24gdGhhdCBpcyB0eXBpY2FsbHkgb25seSB1c2VmdWxcbiAgICAgKiBkdXJpbmcgZGV2ZWxvcG1lbnQgb3IgdHJvdWJsZXNob290aW5nLlxuICAgICAqIEBwYXJhbSBtZXNzYWdlIC0gVGhlIGRlYnVnIG1lc3NhZ2VcbiAgICAgKiBAcGFyYW0gY29udGV4dCAtIE9wdGlvbmFsIGFkZGl0aW9uYWwgY29udGV4dFxuICAgICAqIEBleGFtcGxlXG4gICAgICogYGBgdHlwZXNjcmlwdFxuICAgICAqIGxvZ2dlci5kZWJ1ZygnUHJvY2Vzc2luZyB0b29sIGlucHV0JywgeyB0b29sTmFtZTogJ0Jhc2gnLCBpbnB1dFNpemU6IDI1NiB9KTtcbiAgICAgKiBgYGBcbiAgICAgKi9cbiAgICBkZWJ1ZyhtZXNzYWdlLCBjb250ZXh0KSB7XG4gICAgICAgIHRoaXMuZW1pdChcImRlYnVnXCIsIG1lc3NhZ2UsIGNvbnRleHQpO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBMb2dzIGFuIGluZm8gbWVzc2FnZS5cbiAgICAgKlxuICAgICAqIFVzZSBmb3IgZ2VuZXJhbCBvcGVyYXRpb25hbCBldmVudHMgbGlrZSBob29rIGludm9jYXRpb25zLCBzdWNjZXNzZnVsXG4gICAgICogY29tcGxldGlvbnMsIG9yIHN0YXRlIGNoYW5nZXMuXG4gICAgICogQHBhcmFtIG1lc3NhZ2UgLSBUaGUgaW5mbyBtZXNzYWdlXG4gICAgICogQHBhcmFtIGNvbnRleHQgLSBPcHRpb25hbCBhZGRpdGlvbmFsIGNvbnRleHRcbiAgICAgKiBAZXhhbXBsZVxuICAgICAqIGBgYHR5cGVzY3JpcHRcbiAgICAgKiBsb2dnZXIuaW5mbygnU2Vzc2lvbiBzdGFydGVkJywgeyBzb3VyY2U6ICdzdGFydHVwJywgc2Vzc2lvbklkOiAnYWJjMTIzJyB9KTtcbiAgICAgKiBgYGBcbiAgICAgKi9cbiAgICBpbmZvKG1lc3NhZ2UsIGNvbnRleHQpIHtcbiAgICAgICAgdGhpcy5lbWl0KFwiaW5mb1wiLCBtZXNzYWdlLCBjb250ZXh0KTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogTG9ncyBhIHdhcm5pbmcgbWVzc2FnZS5cbiAgICAgKlxuICAgICAqIFVzZSBmb3IgY29uZGl0aW9ucyB0aGF0IG1heSBpbmRpY2F0ZSBpc3N1ZXMgYnV0IGRvbid0IHByZXZlbnRcbiAgICAgKiBvcGVyYXRpb24sIHN1Y2ggYXMgZGVwcmVjYXRlZCBwYXR0ZXJucyBvciBwZXJmb3JtYW5jZSBjb25jZXJucy5cbiAgICAgKiBAcGFyYW0gbWVzc2FnZSAtIFRoZSB3YXJuaW5nIG1lc3NhZ2VcbiAgICAgKiBAcGFyYW0gY29udGV4dCAtIE9wdGlvbmFsIGFkZGl0aW9uYWwgY29udGV4dFxuICAgICAqIEBleGFtcGxlXG4gICAgICogYGBgdHlwZXNjcmlwdFxuICAgICAqIGxvZ2dlci53YXJuKCdEZXByZWNhdGVkIGhvb2sgcGF0dGVybiBkZXRlY3RlZCcsIHsgcGF0dGVybjogJ2xlZ2FjeU1hdGNoZXInIH0pO1xuICAgICAqIGBgYFxuICAgICAqL1xuICAgIHdhcm4obWVzc2FnZSwgY29udGV4dCkge1xuICAgICAgICB0aGlzLmVtaXQoXCJ3YXJuXCIsIG1lc3NhZ2UsIGNvbnRleHQpO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBMb2dzIGFuIGVycm9yIG1lc3NhZ2UuXG4gICAgICpcbiAgICAgKiBVc2UgZm9yIGVycm9yIGNvbmRpdGlvbnMgdGhhdCByZXF1aXJlIGF0dGVudGlvbiBidXQgd2VyZSBoYW5kbGVkXG4gICAgICogZ3JhY2VmdWxseS4gRm9yIGV4Y2VwdGlvbnMsIHByZWZlciB7QGxpbmsgbG9nRXJyb3J9LlxuICAgICAqIEBwYXJhbSBtZXNzYWdlIC0gVGhlIGVycm9yIG1lc3NhZ2VcbiAgICAgKiBAcGFyYW0gY29udGV4dCAtIE9wdGlvbmFsIGFkZGl0aW9uYWwgY29udGV4dFxuICAgICAqIEBleGFtcGxlXG4gICAgICogYGBgdHlwZXNjcmlwdFxuICAgICAqIGxvZ2dlci5lcnJvcignRmFpbGVkIHRvIHZhbGlkYXRlIHRvb2wgaW5wdXQnLCB7IHRvb2xOYW1lOiAnQmFzaCcsIHJlYXNvbjogJ2VtcHR5IGNvbW1hbmQnIH0pO1xuICAgICAqIGBgYFxuICAgICAqL1xuICAgIGVycm9yKG1lc3NhZ2UsIGNvbnRleHQpIHtcbiAgICAgICAgdGhpcy5lbWl0KFwiZXJyb3JcIiwgbWVzc2FnZSwgY29udGV4dCk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIExvZ3MgYSBzdHJ1Y3R1cmVkIGVycm9yIHdpdGggZnVsbCBlcnJvciBkZXRhaWxzLlxuICAgICAqXG4gICAgICogVXNlIHRoaXMgbWV0aG9kIHdoZW4gbG9nZ2luZyBjYXVnaHQgZXhjZXB0aW9ucyB0byBjYXB0dXJlIHRoZSBmdWxsXG4gICAgICogZXJyb3IgY29udGV4dCBpbmNsdWRpbmcgbmFtZSwgbWVzc2FnZSwgc3RhY2sgdHJhY2UsIGFuZCBjYXVzZSBjaGFpbi5cbiAgICAgKiBAcGFyYW0gZXJyb3IgLSBUaGUgZXJyb3IgdG8gbG9nXG4gICAgICogQHBhcmFtIG1lc3NhZ2UgLSBIdW1hbi1yZWFkYWJsZSBkZXNjcmlwdGlvbiBvZiB3aGF0IGZhaWxlZFxuICAgICAqIEBwYXJhbSBjb250ZXh0IC0gT3B0aW9uYWwgYWRkaXRpb25hbCBjb250ZXh0XG4gICAgICogQGV4YW1wbGVcbiAgICAgKiBgYGB0eXBlc2NyaXB0XG4gICAgICogdHJ5IHtcbiAgICAgKiAgIGF3YWl0IGRhbmdlcm91c09wZXJhdGlvbigpO1xuICAgICAqIH0gY2F0Y2ggKGVycikge1xuICAgICAqICAgbG9nZ2VyLmxvZ0Vycm9yKGVyciwgJ0ZhaWxlZCB0byBleGVjdXRlIGRhbmdlcm91cyBvcGVyYXRpb24nLCB7XG4gICAgICogICAgIG9wZXJhdGlvbjogJ2RlbGV0ZScsXG4gICAgICogICAgIHRhcmdldDogJy9pbXBvcnRhbnQvZmlsZS50eHQnXG4gICAgICogICB9KTtcbiAgICAgKiB9XG4gICAgICogYGBgXG4gICAgICovXG4gICAgbG9nRXJyb3IoZXJyb3IsIG1lc3NhZ2UsIGNvbnRleHQpIHtcbiAgICAgICAgY29uc3QgZXJyb3JJbmZvID0gdGhpcy5leHRyYWN0RXJyb3JJbmZvKGVycm9yKTtcbiAgICAgICAgY29uc3QgZXZlbnQgPSB7XG4gICAgICAgICAgICB0aW1lc3RhbXA6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcbiAgICAgICAgICAgIGxldmVsOiBcImVycm9yXCIsXG4gICAgICAgICAgICBob29rVHlwZTogdGhpcy5jdXJyZW50SG9va1R5cGUsXG4gICAgICAgICAgICBtZXNzYWdlLFxuICAgICAgICAgICAgaW5wdXQ6IHRoaXMuY3VycmVudElucHV0LFxuICAgICAgICAgICAgZXJyb3I6IGVycm9ySW5mbyxcbiAgICAgICAgICAgIGNvbnRleHQsXG4gICAgICAgIH07XG4gICAgICAgIHRoaXMuZGVsaXZlckV2ZW50KGV2ZW50KTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogU3Vic2NyaWJlcyBhIGhhbmRsZXIgdG8gbG9nIGV2ZW50cyBhdCB0aGUgc3BlY2lmaWVkIGxldmVsLlxuICAgICAqXG4gICAgICogVGhlIGhhbmRsZXIgd2lsbCBiZSBjYWxsZWQgZm9yIGV2ZXJ5IGxvZyBldmVudCBhdCB0aGUgc3BlY2lmaWVkIGxldmVsLlxuICAgICAqIFJldHVybnMgYW4gdW5zdWJzY3JpYmUgZnVuY3Rpb24gdGhhdCBzaG91bGQgYmUgY2FsbGVkIHdoZW4gdGhlIGhhbmRsZXJcbiAgICAgKiBpcyBubyBsb25nZXIgbmVlZGVkLlxuICAgICAqIEBwYXJhbSBsZXZlbCAtIFRoZSBsb2cgbGV2ZWwgdG8gc3Vic2NyaWJlIHRvXG4gICAgICogQHBhcmFtIGhhbmRsZXIgLSBUaGUgaGFuZGxlciBmdW5jdGlvbiB0byBjYWxsIGZvciBlYWNoIGV2ZW50XG4gICAgICogQHJldHVybnMgQSBmdW5jdGlvbiB0byB1bnN1YnNjcmliZSB0aGUgaGFuZGxlclxuICAgICAqIEBleGFtcGxlXG4gICAgICogYGBgdHlwZXNjcmlwdFxuICAgICAqIC8vIFN1YnNjcmliZSB0byBlcnJvciBldmVudHNcbiAgICAgKiBjb25zdCB1bnN1YnNjcmliZSA9IGxvZ2dlci5vbignZXJyb3InLCAoZXZlbnQpID0+IHtcbiAgICAgKiAgIGNvbnNvbGUuZXJyb3IoYFske2V2ZW50Lmhvb2tUeXBlfV0gJHtldmVudC5tZXNzYWdlfWApO1xuICAgICAqICAgaWYgKGV2ZW50LmVycm9yKSB7XG4gICAgICogICAgIGNvbnNvbGUuZXJyb3IoZXZlbnQuZXJyb3Iuc3RhY2spO1xuICAgICAqICAgfVxuICAgICAqIH0pO1xuICAgICAqXG4gICAgICogLy8gTGF0ZXIsIGNsZWFuIHVwXG4gICAgICogdW5zdWJzY3JpYmUoKTtcbiAgICAgKiBgYGBcbiAgICAgKiBAZXhhbXBsZVxuICAgICAqIGBgYHR5cGVzY3JpcHRcbiAgICAgKiAvLyBGb3J3YXJkIHRvIGV4dGVybmFsIGxvZ2dpbmcgbGlicmFyeVxuICAgICAqIGltcG9ydCBwaW5vIGZyb20gJ3Bpbm8nO1xuICAgICAqIGNvbnN0IHBpbm9Mb2dnZXIgPSBwaW5vKCk7XG4gICAgICpcbiAgICAgKiBsb2dnZXIub24oJ2luZm8nLCAoZXZlbnQpID0+IHBpbm9Mb2dnZXIuaW5mbyhldmVudCwgZXZlbnQubWVzc2FnZSkpO1xuICAgICAqIGxvZ2dlci5vbignd2FybicsIChldmVudCkgPT4gcGlub0xvZ2dlci53YXJuKGV2ZW50LCBldmVudC5tZXNzYWdlKSk7XG4gICAgICogbG9nZ2VyLm9uKCdlcnJvcicsIChldmVudCkgPT4gcGlub0xvZ2dlci5lcnJvcihldmVudCwgZXZlbnQubWVzc2FnZSkpO1xuICAgICAqIGBgYFxuICAgICAqL1xuICAgIG9uKGxldmVsLCBoYW5kbGVyKSB7XG4gICAgICAgIGNvbnN0IGxldmVsSGFuZGxlcnMgPSB0aGlzLmhhbmRsZXJzLmdldChsZXZlbCk7XG4gICAgICAgIGlmIChsZXZlbEhhbmRsZXJzKSB7XG4gICAgICAgICAgICBsZXZlbEhhbmRsZXJzLmFkZChoYW5kbGVyKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gKCkgPT4ge1xuICAgICAgICAgICAgbGV2ZWxIYW5kbGVycz8uZGVsZXRlKGhhbmRsZXIpO1xuICAgICAgICB9O1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBTZXRzIHRoZSBjdXJyZW50IGhvb2sgY29udGV4dCBmb3IgZW5yaWNoaW5nIGxvZyBldmVudHMuXG4gICAgICpcbiAgICAgKiBUaGlzIGlzIGNhbGxlZCBpbnRlcm5hbGx5IGJ5IHRoZSBydW50aW1lIGJlZm9yZSBpbnZva2luZyBob29rIGhhbmRsZXJzLlxuICAgICAqIFlvdSB0eXBpY2FsbHkgZG9uJ3QgbmVlZCB0byBjYWxsIHRoaXMgZGlyZWN0bHkuXG4gICAgICogQHBhcmFtIGhvb2tUeXBlIC0gVGhlIHR5cGUgb2YgaG9vayBiZWluZyBleGVjdXRlZFxuICAgICAqIEBwYXJhbSBpbnB1dCAtIFRoZSBob29rIGlucHV0IGRhdGFcbiAgICAgKiBAaW50ZXJuYWxcbiAgICAgKi9cbiAgICBzZXRDb250ZXh0KGhvb2tUeXBlLCBpbnB1dCkge1xuICAgICAgICB0aGlzLmN1cnJlbnRIb29rVHlwZSA9IGhvb2tUeXBlO1xuICAgICAgICB0aGlzLmN1cnJlbnRJbnB1dCA9IGlucHV0O1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBDbGVhcnMgdGhlIGN1cnJlbnQgaG9vayBjb250ZXh0LlxuICAgICAqXG4gICAgICogQ2FsbGVkIGludGVybmFsbHkgYnkgdGhlIHJ1bnRpbWUgYWZ0ZXIgaG9vayBleGVjdXRpb24gY29tcGxldGVzLlxuICAgICAqIEBpbnRlcm5hbFxuICAgICAqL1xuICAgIGNsZWFyQ29udGV4dCgpIHtcbiAgICAgICAgdGhpcy5jdXJyZW50SG9va1R5cGUgPSB1bmRlZmluZWQ7XG4gICAgICAgIHRoaXMuY3VycmVudElucHV0ID0gdW5kZWZpbmVkO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBDb25maWd1cmVzIHRoZSBsb2cgZmlsZSBwYXRoIGF0IHJ1bnRpbWUuXG4gICAgICpcbiAgICAgKiBDYWxsIHRoaXMgdG8gZW5hYmxlIG9yIGNoYW5nZSBmaWxlIGxvZ2dpbmcuIFNldHRpbmcgdG8gYG51bGxgIGRpc2FibGVzXG4gICAgICogZmlsZSBsb2dnaW5nIChidXQgZG9lc24ndCBjbG9zZSBleGlzdGluZyBmaWxlIGhhbmRsZSBpbW1lZGlhdGVseSkuXG4gICAgICogQHBhcmFtIGZpbGVQYXRoIC0gUGF0aCB0byB0aGUgbG9nIGZpbGUsIG9yIG51bGwgdG8gZGlzYWJsZVxuICAgICAqIEBleGFtcGxlXG4gICAgICogYGBgdHlwZXNjcmlwdFxuICAgICAqIC8vIEVuYWJsZSBmaWxlIGxvZ2dpbmcgYXQgcnVudGltZVxuICAgICAqIGxvZ2dlci5zZXRMb2dGaWxlKCcvdmFyL2xvZy9jbGF1ZGUtaG9va3MubG9nJyk7XG4gICAgICpcbiAgICAgKiAvLyBEaXNhYmxlIGZpbGUgbG9nZ2luZ1xuICAgICAqIGxvZ2dlci5zZXRMb2dGaWxlKG51bGwpO1xuICAgICAqIGBgYFxuICAgICAqL1xuICAgIHNldExvZ0ZpbGUoZmlsZVBhdGgpIHtcbiAgICAgICAgLy8gQ2xvc2UgZXhpc3RpbmcgZmlsZSBpZiBvcGVuXG4gICAgICAgIGlmICh0aGlzLmxvZ0ZpbGVGZCAhPT0gbnVsbCkge1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICBjbG9zZVN5bmModGhpcy5sb2dGaWxlRmQpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2F0Y2gge1xuICAgICAgICAgICAgICAgIC8vIElnbm9yZSBlcnJvcnMgb24gY2xvc2VcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMubG9nRmlsZUZkID0gbnVsbDtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmxvZ0ZpbGVQYXRoID0gZmlsZVBhdGg7XG4gICAgICAgIHRoaXMuZmlsZUluaXRpYWxpemVkID0gZmFsc2U7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIENsb3NlcyBhbGwgcmVzb3VyY2VzIGhlbGQgYnkgdGhlIGxvZ2dlci5cbiAgICAgKlxuICAgICAqIENhbGwgdGhpcyBkdXJpbmcgZ3JhY2VmdWwgc2h1dGRvd24gdG8gZW5zdXJlIGFsbCBsb2cgZGF0YSBpcyBmbHVzaGVkLlxuICAgICAqIEBleGFtcGxlXG4gICAgICogYGBgdHlwZXNjcmlwdFxuICAgICAqIHByb2Nlc3Mub24oJ2V4aXQnLCAoKSA9PiB7XG4gICAgICogICBsb2dnZXIuY2xvc2UoKTtcbiAgICAgKiB9KTtcbiAgICAgKiBgYGBcbiAgICAgKi9cbiAgICBjbG9zZSgpIHtcbiAgICAgICAgaWYgKHRoaXMubG9nRmlsZUZkICE9PSBudWxsKSB7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIGNsb3NlU3luYyh0aGlzLmxvZ0ZpbGVGZCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXRjaCB7XG4gICAgICAgICAgICAgICAgLy8gSWdub3JlIGVycm9ycyBvbiBjbG9zZVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5sb2dGaWxlRmQgPSBudWxsO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuZmlsZUluaXRpYWxpemVkID0gZmFsc2U7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIENoZWNrcyBpZiB0aGVyZSBhcmUgYW55IGFjdGl2ZSBoYW5kbGVycyBvciBkZXN0aW5hdGlvbnMuXG4gICAgICpcbiAgICAgKiBSZXR1cm5zIHRydWUgaWYgYW55IGhhbmRsZXJzIGFyZSByZWdpc3RlcmVkIG9yIGZpbGUgbG9nZ2luZyBpcyBlbmFibGVkLlxuICAgICAqIEByZXR1cm5zIFdoZXRoZXIgdGhlIGxvZ2dlciBoYXMgYW55IGFjdGl2ZSBvdXRwdXQgZGVzdGluYXRpb25zXG4gICAgICovXG4gICAgaGFzRGVzdGluYXRpb25zKCkge1xuICAgICAgICBmb3IgKGNvbnN0IGhhbmRsZXJzIG9mIHRoaXMuaGFuZGxlcnMudmFsdWVzKCkpIHtcbiAgICAgICAgICAgIGlmIChoYW5kbGVycy5zaXplID4gMClcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcy5sb2dGaWxlUGF0aCAhPT0gbnVsbDtcbiAgICB9XG4gICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgIC8vIFByaXZhdGUgTWV0aG9kc1xuICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICAvKipcbiAgICAgKiBFbWl0cyBhIGxvZyBldmVudC5cbiAgICAgKiBAcGFyYW0gbGV2ZWwgLSBUaGUgc2V2ZXJpdHkgbGV2ZWwgb2YgdGhlIGV2ZW50XG4gICAgICogQHBhcmFtIG1lc3NhZ2UgLSBUaGUgbG9nIG1lc3NhZ2VcbiAgICAgKiBAcGFyYW0gY29udGV4dCAtIE9wdGlvbmFsIGFkZGl0aW9uYWwgY29udGV4dCBkYXRhXG4gICAgICovXG4gICAgZW1pdChsZXZlbCwgbWVzc2FnZSwgY29udGV4dCkge1xuICAgICAgICBjb25zdCBldmVudCA9IHtcbiAgICAgICAgICAgIHRpbWVzdGFtcDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxuICAgICAgICAgICAgbGV2ZWwsXG4gICAgICAgICAgICBob29rVHlwZTogdGhpcy5jdXJyZW50SG9va1R5cGUsXG4gICAgICAgICAgICBtZXNzYWdlLFxuICAgICAgICAgICAgaW5wdXQ6IHRoaXMuY3VycmVudElucHV0LFxuICAgICAgICAgICAgY29udGV4dCxcbiAgICAgICAgfTtcbiAgICAgICAgdGhpcy5kZWxpdmVyRXZlbnQoZXZlbnQpO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBEZWxpdmVycyBhbiBldmVudCB0byBhbGwgcmVnaXN0ZXJlZCBkZXN0aW5hdGlvbnMuXG4gICAgICogQHBhcmFtIGV2ZW50IC0gVGhlIGxvZyBldmVudCB0byBkZWxpdmVyXG4gICAgICovXG4gICAgZGVsaXZlckV2ZW50KGV2ZW50KSB7XG4gICAgICAgIC8vIERlbGl2ZXIgdG8gZXZlbnQgaGFuZGxlcnNcbiAgICAgICAgY29uc3QgbGV2ZWxIYW5kbGVycyA9IHRoaXMuaGFuZGxlcnMuZ2V0KGV2ZW50LmxldmVsKTtcbiAgICAgICAgaWYgKGxldmVsSGFuZGxlcnMpIHtcbiAgICAgICAgICAgIGZvciAoY29uc3QgaGFuZGxlciBvZiBsZXZlbEhhbmRsZXJzKSB7XG4gICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgaGFuZGxlcihldmVudCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGNhdGNoIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gU2lsZW50bHkgaWdub3JlIGhhbmRsZXIgZXJyb3JzIHRvIG5vdCBkaXNydXB0IGhvb2sgZXhlY3V0aW9uXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIC8vIFdyaXRlIHRvIGZpbGUgaWYgY29uZmlndXJlZFxuICAgICAgICB0aGlzLndyaXRlVG9GaWxlKGV2ZW50KTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogV3JpdGVzIGFuIGV2ZW50IHRvIHRoZSBsb2cgZmlsZS5cbiAgICAgKiBAcGFyYW0gZXZlbnQgLSBUaGUgbG9nIGV2ZW50IHRvIHdyaXRlXG4gICAgICovXG4gICAgd3JpdGVUb0ZpbGUoZXZlbnQpIHtcbiAgICAgICAgaWYgKCF0aGlzLmxvZ0ZpbGVQYXRoKVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAvLyBMYXp5IGluaXRpYWxpemF0aW9uIG9mIGZpbGUgaGFuZGxlXG4gICAgICAgIGlmICghdGhpcy5maWxlSW5pdGlhbGl6ZWQpIHtcbiAgICAgICAgICAgIHRoaXMuaW5pdGlhbGl6ZUZpbGUoKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodGhpcy5sb2dGaWxlRmQgPT09IG51bGwpXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCBsaW5lID0gYCR7SlNPTi5zdHJpbmdpZnkoZXZlbnQpfVxcbmA7XG4gICAgICAgICAgICB3cml0ZVN5bmModGhpcy5sb2dGaWxlRmQsIGxpbmUpO1xuICAgICAgICB9XG4gICAgICAgIGNhdGNoIHtcbiAgICAgICAgICAgIC8vIFNpbGVudGx5IGlnbm9yZSBmaWxlIHdyaXRlIGVycm9ycyB0byBub3QgZGlzcnVwdCBob29rIGV4ZWN1dGlvblxuICAgICAgICAgICAgLy8gVGhpcyBmb2xsb3dzIHRoZSByaXNrIG1pdGlnYXRpb246IFwiR3JhY2VmdWwgZGVncmFkYXRpb24gLSBsb2cgd3JpdGVcbiAgICAgICAgICAgIC8vIGZhaWx1cmVzIGFyZSBzaWxlbnRseSBpZ25vcmVkIHRvIG5vdCBkaXNydXB0IGhvb2sgZXhlY3V0aW9uXCJcbiAgICAgICAgfVxuICAgIH1cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplcyB0aGUgbG9nIGZpbGUgZm9yIHdyaXRpbmcuXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUZpbGUoKSB7XG4gICAgICAgIHRoaXMuZmlsZUluaXRpYWxpemVkID0gdHJ1ZTtcbiAgICAgICAgaWYgKCF0aGlzLmxvZ0ZpbGVQYXRoKVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgLy8gRW5zdXJlIGRpcmVjdG9yeSBleGlzdHNcbiAgICAgICAgICAgIGNvbnN0IGRpciA9IGRpcm5hbWUodGhpcy5sb2dGaWxlUGF0aCk7XG4gICAgICAgICAgICBpZiAoIWV4aXN0c1N5bmMoZGlyKSkge1xuICAgICAgICAgICAgICAgIG1rZGlyU3luYyhkaXIsIHsgcmVjdXJzaXZlOiB0cnVlIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gT3BlbiBmaWxlIGZvciBhcHBlbmRpbmdcbiAgICAgICAgICAgIHRoaXMubG9nRmlsZUZkID0gb3BlblN5bmModGhpcy5sb2dGaWxlUGF0aCwgXCJhXCIpO1xuICAgICAgICB9XG4gICAgICAgIGNhdGNoIHtcbiAgICAgICAgICAgIC8vIFNpbGVudGx5IGlnbm9yZSBmaWxlIGluaXRpYWxpemF0aW9uIGVycm9yc1xuICAgICAgICAgICAgdGhpcy5sb2dGaWxlRmQgPSBudWxsO1xuICAgICAgICB9XG4gICAgfVxuICAgIC8qKlxuICAgICAqIEV4dHJhY3RzIHN0cnVjdHVyZWQgZXJyb3IgaW5mb3JtYXRpb24gZnJvbSBhbiB1bmtub3duIGVycm9yLlxuICAgICAqIEBwYXJhbSBlcnJvciAtIFRoZSBlcnJvciB0byBleHRyYWN0IGluZm9ybWF0aW9uIGZyb21cbiAgICAgKiBAcmV0dXJucyBTdHJ1Y3R1cmVkIGVycm9yIGluZm9ybWF0aW9uXG4gICAgICovXG4gICAgZXh0cmFjdEVycm9ySW5mbyhlcnJvcikge1xuICAgICAgICBpZiAoZXJyb3IgaW5zdGFuY2VvZiBFcnJvcikge1xuICAgICAgICAgICAgY29uc3QgaW5mbyA9IHtcbiAgICAgICAgICAgICAgICBuYW1lOiBlcnJvci5uYW1lLFxuICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGVycm9yLm1lc3NhZ2UsXG4gICAgICAgICAgICAgICAgc3RhY2s6IGVycm9yLnN0YWNrLFxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIC8vIEV4dHJhY3QgY2F1c2UgY2hhaW4gaWYgcHJlc2VudFxuICAgICAgICAgICAgaWYgKGVycm9yLmNhdXNlICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICBpbmZvLmNhdXNlID0gdGhpcy5leHRyYWN0RXJyb3JJbmZvKGVycm9yLmNhdXNlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBpbmZvO1xuICAgICAgICB9XG4gICAgICAgIC8vIEhhbmRsZSBub24tRXJyb3IgdmFsdWVzXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBuYW1lOiBcIlVua25vd25FcnJvclwiLFxuICAgICAgICAgICAgbWVzc2FnZTogU3RyaW5nKGVycm9yKSxcbiAgICAgICAgfTtcbiAgICB9XG59XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBTaW5nbGV0b24gRXhwb3J0XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vKipcbiAqIEdsb2JhbCBsb2dnZXIgaW5zdGFuY2UgZm9yIENsYXVkZSBDb2RlIGhvb2tzLlxuICpcbiAqIFVzZSB0aGlzIHNpbmdsZXRvbiBmb3IgYWxsIGxvZ2dpbmcgd2l0aGluIGhvb2tzLiBUaGUgbG9nZ2VyIGlzIGNvbmZpZ3VyZWRcbiAqIHZpYSBlbnZpcm9ubWVudCB2YXJpYWJsZXMgYW5kIHN1cHBvcnRzIGV2ZW50IHN1YnNjcmlwdGlvbiBmb3IgY3VzdG9tXG4gKiBkZXN0aW5hdGlvbnMuXG4gKlxuICogIyMgQ29uZmlndXJhdGlvblxuICpcbiAqIHwgRW52aXJvbm1lbnQgVmFyaWFibGUgfCBEZXNjcmlwdGlvbiB8XG4gKiB8LS0tLS0tLS0tLS0tLS0tLS0tLS0tfC0tLS0tLS0tLS0tLS18XG4gKiB8IGBDTEFVREVfQ09ERV9IT09LU19MT0dfRklMRWAgfCBQYXRoIHRvIGxvZyBmaWxlIChKU09OIExpbmVzIGZvcm1hdCkgfFxuICpcbiAqICMjIFVzYWdlIGluIEhvb2tzXG4gKlxuICogVGhlIGxvZ2dlciBpcyBwYXNzZWQgdG8gaG9vayBoYW5kbGVycyB2aWEgY29udGV4dCBmb3IgY29udmVuaWVuY2U6XG4gKlxuICogYGBgdHlwZXNjcmlwdFxuICogZXhwb3J0IGRlZmF1bHQgcHJlVG9vbFVzZUhvb2soeyBtYXRjaGVyOiAnQmFzaCcgfSwgYXN5bmMgKGlucHV0LCB7IGxvZ2dlciB9KSA9PiB7XG4gKiAgIGxvZ2dlci53YXJuKCdWYWxpZGF0aW5nIEJhc2ggY29tbWFuZCcpO1xuICogICByZXR1cm4gcHJlVG9vbFVzZU91dHB1dCh7IGFsbG93OiB0cnVlIH0pO1xuICogfSk7XG4gKiBgYGBcbiAqXG4gKiAjIyBFeHRlcm5hbCBJbnRlZ3JhdGlvblxuICpcbiAqIFN1YnNjcmliZSB0byBldmVudHMgdG8gZm9yd2FyZCBsb2dzIHRvIGV4dGVybmFsIHN5c3RlbXM6XG4gKlxuICogYGBgdHlwZXNjcmlwdFxuICogaW1wb3J0IHsgbG9nZ2VyIH0gZnJvbSAnQGdvb2Rmb290L2NsYXVkZS1jb2RlLWhvb2tzJztcbiAqIGltcG9ydCBwaW5vIGZyb20gJ3Bpbm8nO1xuICpcbiAqIGNvbnN0IHBpbm9Mb2dnZXIgPSBwaW5vKHsgbGV2ZWw6ICdkZWJ1ZycgfSk7XG4gKlxuICogbG9nZ2VyLm9uKCdkZWJ1ZycsIChldmVudCkgPT4gcGlub0xvZ2dlci5kZWJ1ZyhldmVudCwgZXZlbnQubWVzc2FnZSkpO1xuICogbG9nZ2VyLm9uKCdpbmZvJywgKGV2ZW50KSA9PiBwaW5vTG9nZ2VyLmluZm8oZXZlbnQsIGV2ZW50Lm1lc3NhZ2UpKTtcbiAqIGxvZ2dlci5vbignd2FybicsIChldmVudCkgPT4gcGlub0xvZ2dlci53YXJuKGV2ZW50LCBldmVudC5tZXNzYWdlKSk7XG4gKiBsb2dnZXIub24oJ2Vycm9yJywgKGV2ZW50KSA9PiBwaW5vTG9nZ2VyLmVycm9yKGV2ZW50LCBldmVudC5tZXNzYWdlKSk7XG4gKiBgYGBcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiAvLyBEaXJlY3QgdXNhZ2VcbiAqIGltcG9ydCB7IGxvZ2dlciB9IGZyb20gJ0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcyc7XG4gKlxuICogbG9nZ2VyLmluZm8oJ1N0YXJ0aW5nIG9wZXJhdGlvbicpO1xuICogbG9nZ2VyLndhcm4oJ1Jlc291cmNlIGxpbWl0IGFwcHJvYWNoaW5nJywgeyB1c2FnZTogMC45IH0pO1xuICpcbiAqIHRyeSB7XG4gKiAgIGF3YWl0IHJpc2t5T3BlcmF0aW9uKCk7XG4gKiB9IGNhdGNoIChlcnIpIHtcbiAqICAgbG9nZ2VyLmxvZ0Vycm9yKGVyciwgJ1Jpc2t5IG9wZXJhdGlvbiBmYWlsZWQnKTtcbiAqIH1cbiAqIGBgYFxuICovXG5leHBvcnQgY29uc3QgbG9nZ2VyID0gbmV3IExvZ2dlcigpO1xuIiwgIi8qKlxuICogT3V0cHV0IHR5cGVzIGFuZCBidWlsZGVycyBmb3IgQ2xhdWRlIENvZGUgaG9va3MuXG4gKlxuICogUHJvdmlkZXMgdHlwZS1zYWZlIG91dHB1dCBidWlsZGVyIGZ1bmN0aW9ucyBmb3IgYWxsIDEyIGhvb2sgdHlwZXMuIEVhY2ggYnVpbGRlclxuICogYWNjZXB0cyBvcHRpb25zIHRoYXQgbWF0Y2ggdGhlIHdpcmUgZm9ybWF0IGV4cGVjdGVkIGJ5IENsYXVkZSBDb2RlLCB3aXRoIHR5cGVzXG4gKiBkZXJpdmVkIGZyb20gdGhlIENsYXVkZSBBZ2VudCBTREsncyBgU3luY0hvb2tKU09OT3V0cHV0YCB0eXBlLlxuICogQHNlZSBodHRwczovL2NvZGUuY2xhdWRlLmNvbS9kb2NzL2VuL2hvb2tzXG4gKiBAbW9kdWxlXG4gKi9cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIEV4aXQgQ29kZSBDb25zdGFudHNcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8qKlxuICogRXhpdCBjb2RlcyB1c2VkIGJ5IENsYXVkZSBDb2RlIGhvb2tzLlxuICpcbiAqIHwgRXhpdCBDb2RlIHwgTmFtZSB8IFdoZW4gVXNlZCB8IENsYXVkZSBDb2RlIEJlaGF2aW9yIHxcbiAqIHwtLS0tLS0tLS0tLXwtLS0tLS18LS0tLS0tLS0tLS18LS0tLS0tLS0tLS0tLS0tLS0tLS0tfFxuICogfCAwIHwgU3VjY2VzcyB8IEhhbmRsZXIgcmV0dXJucyBub3JtYWxseSB8IENvbnRpbnVlLCBwYXJzZSBzdGRvdXQgYXMgSlNPTiB8XG4gKiB8IDEgfCBFcnJvciB8IEludmFsaWQgaW5wdXQsIG5vbi1ibG9ja2luZyBlcnJvciB8IE5vbi1ibG9ja2luZywgc3RkZXJyIHRvIHVzZXIgb25seSB8XG4gKiB8IDIgfCBCbG9jayB8IEhhbmRsZXIgdGhyb3dzIE9SIGBzdG9wUmVhc29uYCBzZXQgfCBCbG9ja2luZywgc3RkZXJyIHNob3duIHRvIENsYXVkZSB8XG4gKi9cbmV4cG9ydCBjb25zdCBFWElUX0NPREVTID0ge1xuICAgIC8qKiBIYW5kbGVyIGNvbXBsZXRlZCBzdWNjZXNzZnVsbHkuIENsYXVkZSBDb2RlIHBhcnNlcyBzdGRvdXQgYXMgSlNPTi4gKi9cbiAgICBTVUNDRVNTOiAwLFxuICAgIC8qKiBOb24tYmxvY2tpbmcgZXJyb3Igb2NjdXJyZWQgKGUuZy4sIGludmFsaWQgaW5wdXQpLiBzdGRlcnIgc2hvd24gdG8gdXNlciBvbmx5LiAqL1xuICAgIEVSUk9SOiAxLFxuICAgIC8qKiBIYW5kbGVyIHRocmV3IGV4Y2VwdGlvbiBPUiBibG9ja2luZyBhY3Rpb24gcmVxdWVzdGVkLiBzdGRlcnIgc2hvd24gdG8gQ2xhdWRlLiAqL1xuICAgIEJMT0NLOiAyLFxufTtcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIE91dHB1dCBCdWlsZGVyIEZhY3Rvcmllc1xuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLyoqXG4gKiBGYWN0b3J5IGZvciBob29rcyB0aGF0IGhhdmUgaG9va1NwZWNpZmljT3V0cHV0IHdpdGggYSBob29rRXZlbnROYW1lIGRpc2NyaW1pbmF0b3IuXG4gKiBAcGFyYW0gaG9va1R5cGUgLSBUaGUgaG9vayB0eXBlIG5hbWUgdXNlZCBhcyB0aGUgX3R5cGUgZGlzY3JpbWluYXRvclxuICogQHJldHVybnMgQSBidWlsZGVyIGZ1bmN0aW9uIHRoYXQgY3JlYXRlcyB0aGUgb3V0cHV0IG9iamVjdFxuICogQGludGVybmFsXG4gKi9cbmZ1bmN0aW9uIGNyZWF0ZUhvb2tTcGVjaWZpY091dHB1dEJ1aWxkZXIoaG9va1R5cGUpIHtcbiAgICByZXR1cm4gKG9wdGlvbnMgPSB7fSkgPT4ge1xuICAgICAgICBjb25zdCB7IGhvb2tTcGVjaWZpY091dHB1dCwgLi4ucmVzdCB9ID0gb3B0aW9ucztcbiAgICAgICAgY29uc3Qgc3Rkb3V0ID0gaG9va1NwZWNpZmljT3V0cHV0ICE9PSB1bmRlZmluZWRcbiAgICAgICAgICAgID8geyAuLi5yZXN0LCBob29rU3BlY2lmaWNPdXRwdXQ6IHsgaG9va0V2ZW50TmFtZTogaG9va1R5cGUsIC4uLmhvb2tTcGVjaWZpY091dHB1dCB9IH1cbiAgICAgICAgICAgIDogcmVzdDtcbiAgICAgICAgcmV0dXJuIHsgX3R5cGU6IGhvb2tUeXBlLCBzdGRvdXQgfTtcbiAgICB9O1xufVxuLyoqXG4gKiBGYWN0b3J5IGZvciBob29rcyB0aGF0IG9ubHkgdXNlIENvbW1vbk9wdGlvbnMgKHNpbXBsZSBwYXNzdGhyb3VnaCkuXG4gKiBAcGFyYW0gaG9va1R5cGUgLSBUaGUgaG9vayB0eXBlIG5hbWUgdXNlZCBhcyB0aGUgX3R5cGUgZGlzY3JpbWluYXRvclxuICogQHJldHVybnMgQSBidWlsZGVyIGZ1bmN0aW9uIHRoYXQgY3JlYXRlcyB0aGUgb3V0cHV0IG9iamVjdFxuICogQGludGVybmFsXG4gKi9cbmZ1bmN0aW9uIGNyZWF0ZVNpbXBsZU91dHB1dEJ1aWxkZXIoaG9va1R5cGUpIHtcbiAgICByZXR1cm4gKG9wdGlvbnMgPSB7fSkgPT4gKHtcbiAgICAgICAgX3R5cGU6IGhvb2tUeXBlLFxuICAgICAgICBzdGRvdXQ6IG9wdGlvbnMsXG4gICAgfSk7XG59XG4vKipcbiAqIEZhY3RvcnkgZm9yIGhvb2tzIHRoYXQgdXNlIGRlY2lzaW9uLWJhc2VkIG9wdGlvbnMgKFN0b3AsIFN1YmFnZW50U3RvcCkuXG4gKiBAcGFyYW0gaG9va1R5cGUgLSBUaGUgaG9vayB0eXBlIG5hbWUgdXNlZCBhcyB0aGUgX3R5cGUgZGlzY3JpbWluYXRvclxuICogQHJldHVybnMgQSBidWlsZGVyIGZ1bmN0aW9uIHRoYXQgY3JlYXRlcyB0aGUgb3V0cHV0IG9iamVjdFxuICogQGludGVybmFsXG4gKi9cbmZ1bmN0aW9uIGNyZWF0ZURlY2lzaW9uT3V0cHV0QnVpbGRlcihob29rVHlwZSkge1xuICAgIHJldHVybiAob3B0aW9ucyA9IHt9KSA9PiAoe1xuICAgICAgICBfdHlwZTogaG9va1R5cGUsXG4gICAgICAgIHN0ZG91dDogb3B0aW9ucyxcbiAgICB9KTtcbn1cbi8qKlxuICogRmFjdG9yeSBmb3IgZXhpdC1jb2RlLWJhc2VkIGhvb2tzIChUZWFtbWF0ZUlkbGUsIFRhc2tDb21wbGV0ZWQpLlxuICpcbiAqIFRoZXNlIGhvb2tzIGRvbid0IHVzZSBKU09OIGRlY2lzaW9uIGNvbnRyb2wgKG5vIENvbW1vbk9wdGlvbnMpLlxuICogVGhlIG9ubHkgb3B0aW9uIGlzIGBzdGRlcnJgIFx1MjAxNCB3aGVuIHByZXNlbnQsIGl0IHRyaWdnZXJzIGV4aXQgY29kZSAyIChCTE9DSykuXG4gKiBTdGRvdXQgYWx3YXlzIHJlY2VpdmVzIGB7fWAgKGVtcHR5IEpTT04gb2JqZWN0KS5cbiAqIEBwYXJhbSBob29rVHlwZSAtIFRoZSBob29rIHR5cGUgbmFtZSB1c2VkIGFzIHRoZSBfdHlwZSBkaXNjcmltaW5hdG9yXG4gKiBAcmV0dXJucyBBIGJ1aWxkZXIgZnVuY3Rpb24gdGhhdCBjcmVhdGVzIHRoZSBvdXRwdXQgb2JqZWN0XG4gKiBAaW50ZXJuYWxcbiAqL1xuZnVuY3Rpb24gY3JlYXRlRXhpdENvZGVPdXRwdXRCdWlsZGVyKGhvb2tUeXBlKSB7XG4gICAgcmV0dXJuICh7IHN0ZGVyciB9ID0ge30pID0+ICh7XG4gICAgICAgIF90eXBlOiBob29rVHlwZSxcbiAgICAgICAgc3Rkb3V0OiB7fSxcbiAgICAgICAgLi4uKHN0ZGVyciAhPT0gdW5kZWZpbmVkID8geyBzdGRlcnIgfSA6IHt9KSxcbiAgICB9KTtcbn1cbi8qKlxuICogQ3JlYXRlcyBhbiBvdXRwdXQgZm9yIFByZVRvb2xVc2UgaG9va3MuXG4gKiBAcGFyYW0gb3B0aW9ucyAtIENvbmZpZ3VyYXRpb24gb3B0aW9ucyBmb3IgdGhlIGhvb2sgb3V0cHV0XG4gKiBAcmV0dXJucyBBIFByZVRvb2xVc2VPdXRwdXQgb2JqZWN0IHJlYWR5IGZvciB0aGUgcnVudGltZVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIC8vIEFsbG93IHRvb2wgZXhlY3V0aW9uXG4gKiBwcmVUb29sVXNlT3V0cHV0KHtcbiAqICAgaG9va1NwZWNpZmljT3V0cHV0OiB7IHBlcm1pc3Npb25EZWNpc2lvbjogJ2FsbG93JyB9XG4gKiB9KTtcbiAqXG4gKiAvLyBEZW55IHdpdGggcmVhc29uXG4gKiBwcmVUb29sVXNlT3V0cHV0KHtcbiAqICAgaG9va1NwZWNpZmljT3V0cHV0OiB7XG4gKiAgICAgcGVybWlzc2lvbkRlY2lzaW9uOiAnZGVueScsXG4gKiAgICAgcGVybWlzc2lvbkRlY2lzaW9uUmVhc29uOiAnRGFuZ2Vyb3VzIGNvbW1hbmQgZGV0ZWN0ZWQnXG4gKiAgIH1cbiAqIH0pO1xuICpcbiAqIC8vIEFsbG93IHdpdGggbW9kaWZpZWQgaW5wdXRcbiAqIHByZVRvb2xVc2VPdXRwdXQoe1xuICogICBob29rU3BlY2lmaWNPdXRwdXQ6IHtcbiAqICAgICBwZXJtaXNzaW9uRGVjaXNpb246ICdhbGxvdycsXG4gKiAgICAgdXBkYXRlZElucHV0OiB7IGNvbW1hbmQ6ICdscyAtbGEnIH1cbiAqICAgfVxuICogfSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNvbnN0IHByZVRvb2xVc2VPdXRwdXQgPSAvKiBAX19QVVJFX18gKi8gY3JlYXRlSG9va1NwZWNpZmljT3V0cHV0QnVpbGRlcihcIlByZVRvb2xVc2VcIik7XG4vKipcbiAqIENyZWF0ZXMgYW4gb3V0cHV0IGZvciBQb3N0VG9vbFVzZSBob29rcy5cbiAqIEBwYXJhbSBvcHRpb25zIC0gQ29uZmlndXJhdGlvbiBvcHRpb25zIGZvciB0aGUgaG9vayBvdXRwdXRcbiAqIEByZXR1cm5zIEEgUG9zdFRvb2xVc2VPdXRwdXQgb2JqZWN0IHJlYWR5IGZvciB0aGUgcnVudGltZVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIC8vIEFkZCBjb250ZXh0IGFmdGVyIGEgZmlsZSByZWFkXG4gKiBwb3N0VG9vbFVzZU91dHB1dCh7XG4gKiAgIGhvb2tTcGVjaWZpY091dHB1dDoge1xuICogICAgIGFkZGl0aW9uYWxDb250ZXh0OiAnRmlsZSBjb250YWlucyBzZW5zaXRpdmUgZGF0YSdcbiAqICAgfVxuICogfSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNvbnN0IHBvc3RUb29sVXNlT3V0cHV0ID0gLyogQF9fUFVSRV9fICovIGNyZWF0ZUhvb2tTcGVjaWZpY091dHB1dEJ1aWxkZXIoXCJQb3N0VG9vbFVzZVwiKTtcbi8qKlxuICogQ3JlYXRlcyBhbiBvdXRwdXQgZm9yIFBvc3RUb29sVXNlRmFpbHVyZSBob29rcy5cbiAqIEBwYXJhbSBvcHRpb25zIC0gQ29uZmlndXJhdGlvbiBvcHRpb25zIGZvciB0aGUgaG9vayBvdXRwdXRcbiAqIEByZXR1cm5zIEEgUG9zdFRvb2xVc2VGYWlsdXJlT3V0cHV0IG9iamVjdCByZWFkeSBmb3IgdGhlIHJ1bnRpbWVcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBwb3N0VG9vbFVzZUZhaWx1cmVPdXRwdXQoe1xuICogICBob29rU3BlY2lmaWNPdXRwdXQ6IHtcbiAqICAgICBhZGRpdGlvbmFsQ29udGV4dDogJ1RyeSB1c2luZyBhIGRpZmZlcmVudCBhcHByb2FjaCdcbiAqICAgfVxuICogfSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNvbnN0IHBvc3RUb29sVXNlRmFpbHVyZU91dHB1dCA9IC8qIEBfX1BVUkVfXyAqLyBjcmVhdGVIb29rU3BlY2lmaWNPdXRwdXRCdWlsZGVyKFwiUG9zdFRvb2xVc2VGYWlsdXJlXCIpO1xuLyoqXG4gKiBDcmVhdGVzIGFuIG91dHB1dCBmb3IgVXNlclByb21wdFN1Ym1pdCBob29rcy5cbiAqIEBwYXJhbSBvcHRpb25zIC0gQ29uZmlndXJhdGlvbiBvcHRpb25zIGZvciB0aGUgaG9vayBvdXRwdXRcbiAqIEByZXR1cm5zIEEgVXNlclByb21wdFN1Ym1pdE91dHB1dCBvYmplY3QgcmVhZHkgZm9yIHRoZSBydW50aW1lXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogdXNlclByb21wdFN1Ym1pdE91dHB1dCh7XG4gKiAgIGhvb2tTcGVjaWZpY091dHB1dDoge1xuICogICAgIGFkZGl0aW9uYWxDb250ZXh0OiAnVGhpcyBwcm9qZWN0IHVzZXMgVHlwZVNjcmlwdCBzdHJpY3QgbW9kZSdcbiAqICAgfVxuICogfSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNvbnN0IHVzZXJQcm9tcHRTdWJtaXRPdXRwdXQgPSAvKiBAX19QVVJFX18gKi8gY3JlYXRlSG9va1NwZWNpZmljT3V0cHV0QnVpbGRlcihcIlVzZXJQcm9tcHRTdWJtaXRcIik7XG4vKipcbiAqIENyZWF0ZXMgYW4gb3V0cHV0IGZvciBTZXNzaW9uU3RhcnQgaG9va3MuXG4gKiBAcGFyYW0gb3B0aW9ucyAtIENvbmZpZ3VyYXRpb24gb3B0aW9ucyBmb3IgdGhlIGhvb2sgb3V0cHV0XG4gKiBAcmV0dXJucyBBIFNlc3Npb25TdGFydE91dHB1dCBvYmplY3QgcmVhZHkgZm9yIHRoZSBydW50aW1lXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogc2Vzc2lvblN0YXJ0T3V0cHV0KHtcbiAqICAgaG9va1NwZWNpZmljT3V0cHV0OiB7XG4gKiAgICAgYWRkaXRpb25hbENvbnRleHQ6IEpTT04uc3RyaW5naWZ5KHsgcHJvamVjdDogJ215LXByb2plY3QnIH0pXG4gKiAgIH1cbiAqIH0pO1xuICogYGBgXG4gKi9cbmV4cG9ydCBjb25zdCBzZXNzaW9uU3RhcnRPdXRwdXQgPSAvKiBAX19QVVJFX18gKi8gY3JlYXRlSG9va1NwZWNpZmljT3V0cHV0QnVpbGRlcihcIlNlc3Npb25TdGFydFwiKTtcbi8qKlxuICogQ3JlYXRlcyBhbiBvdXRwdXQgZm9yIFNlc3Npb25FbmQgaG9va3MuXG4gKiBAcGFyYW0gb3B0aW9ucyAtIENvbmZpZ3VyYXRpb24gb3B0aW9ucyBmb3IgdGhlIGhvb2sgb3V0cHV0XG4gKiBAcmV0dXJucyBBIFNlc3Npb25FbmRPdXRwdXQgb2JqZWN0IHJlYWR5IGZvciB0aGUgcnVudGltZVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIHNlc3Npb25FbmRPdXRwdXQoe30pO1xuICogYGBgXG4gKi9cbmV4cG9ydCBjb25zdCBzZXNzaW9uRW5kT3V0cHV0ID0gLyogQF9fUFVSRV9fICovIGNyZWF0ZVNpbXBsZU91dHB1dEJ1aWxkZXIoXCJTZXNzaW9uRW5kXCIpO1xuLyoqXG4gKiBDcmVhdGVzIGFuIG91dHB1dCBmb3IgU3RvcCBob29rcy5cbiAqIEBwYXJhbSBvcHRpb25zIC0gQ29uZmlndXJhdGlvbiBvcHRpb25zIGZvciB0aGUgaG9vayBvdXRwdXRcbiAqIEByZXR1cm5zIEEgU3RvcE91dHB1dCBvYmplY3QgcmVhZHkgZm9yIHRoZSBydW50aW1lXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogLy8gQWxsb3cgdGhlIHN0b3BcbiAqIHN0b3BPdXRwdXQoeyBkZWNpc2lvbjogJ2FwcHJvdmUnIH0pO1xuICpcbiAqIC8vIEJsb2NrIHdpdGggcmVhc29uXG4gKiBzdG9wT3V0cHV0KHtcbiAqICAgZGVjaXNpb246ICdibG9jaycsXG4gKiAgIHJlYXNvbjogJ1RoZXJlIGFyZSB1bmNvbW1pdHRlZCBjaGFuZ2VzJ1xuICogfSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNvbnN0IHN0b3BPdXRwdXQgPSAvKiBAX19QVVJFX18gKi8gY3JlYXRlRGVjaXNpb25PdXRwdXRCdWlsZGVyKFwiU3RvcFwiKTtcbi8qKlxuICogQ3JlYXRlcyBhbiBvdXRwdXQgZm9yIFN1YmFnZW50U3RhcnQgaG9va3MuXG4gKiBAcGFyYW0gb3B0aW9ucyAtIENvbmZpZ3VyYXRpb24gb3B0aW9ucyBmb3IgdGhlIGhvb2sgb3V0cHV0XG4gKiBAcmV0dXJucyBBIFN1YmFnZW50U3RhcnRPdXRwdXQgb2JqZWN0IHJlYWR5IGZvciB0aGUgcnVudGltZVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIHN1YmFnZW50U3RhcnRPdXRwdXQoe1xuICogICBob29rU3BlY2lmaWNPdXRwdXQ6IHtcbiAqICAgICBhZGRpdGlvbmFsQ29udGV4dDogJ0ZvY3VzIG9uIGZpbmRpbmcgcGF0dGVybnMnXG4gKiAgIH1cbiAqIH0pO1xuICogYGBgXG4gKi9cbmV4cG9ydCBjb25zdCBzdWJhZ2VudFN0YXJ0T3V0cHV0ID0gLyogQF9fUFVSRV9fICovIGNyZWF0ZUhvb2tTcGVjaWZpY091dHB1dEJ1aWxkZXIoXCJTdWJhZ2VudFN0YXJ0XCIpO1xuLyoqXG4gKiBDcmVhdGVzIGFuIG91dHB1dCBmb3IgU3ViYWdlbnRTdG9wIGhvb2tzLlxuICogQHBhcmFtIG9wdGlvbnMgLSBDb25maWd1cmF0aW9uIG9wdGlvbnMgZm9yIHRoZSBob29rIG91dHB1dFxuICogQHJldHVybnMgQSBTdWJhZ2VudFN0b3BPdXRwdXQgb2JqZWN0IHJlYWR5IGZvciB0aGUgcnVudGltZVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIC8vIEJsb2NrIHdpdGggcmVhc29uXG4gKiBzdWJhZ2VudFN0b3BPdXRwdXQoe1xuICogICBkZWNpc2lvbjogJ2Jsb2NrJyxcbiAqICAgcmVhc29uOiAnVGFzayBub3QgY29tcGxldGUnXG4gKiB9KTtcbiAqIGBgYFxuICovXG5leHBvcnQgY29uc3Qgc3ViYWdlbnRTdG9wT3V0cHV0ID0gLyogQF9fUFVSRV9fICovIGNyZWF0ZURlY2lzaW9uT3V0cHV0QnVpbGRlcihcIlN1YmFnZW50U3RvcFwiKTtcbi8qKlxuICogQ3JlYXRlcyBhbiBvdXRwdXQgZm9yIE5vdGlmaWNhdGlvbiBob29rcy5cbiAqIEBwYXJhbSBvcHRpb25zIC0gQ29uZmlndXJhdGlvbiBvcHRpb25zIGZvciB0aGUgaG9vayBvdXRwdXRcbiAqIEByZXR1cm5zIEEgTm90aWZpY2F0aW9uT3V0cHV0IG9iamVjdCByZWFkeSBmb3IgdGhlIHJ1bnRpbWVcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiAvLyBBZGQgY29udGV4dCBhYm91dCB0aGUgbm90aWZpY2F0aW9uXG4gKiBub3RpZmljYXRpb25PdXRwdXQoe1xuICogICBob29rU3BlY2lmaWNPdXRwdXQ6IHtcbiAqICAgICBhZGRpdGlvbmFsQ29udGV4dDogJ05vdGlmaWNhdGlvbiBmb3J3YXJkZWQgdG8gU2xhY2sgI2FsZXJ0cyBjaGFubmVsJ1xuICogICB9XG4gKiB9KTtcbiAqXG4gKiAvLyBTdXBwcmVzcyB0aGUgbm90aWZpY2F0aW9uXG4gKiBub3RpZmljYXRpb25PdXRwdXQoeyBzdXBwcmVzc091dHB1dDogdHJ1ZSB9KTtcbiAqIGBgYFxuICovXG5leHBvcnQgY29uc3Qgbm90aWZpY2F0aW9uT3V0cHV0ID0gLyogQF9fUFVSRV9fICovIGNyZWF0ZUhvb2tTcGVjaWZpY091dHB1dEJ1aWxkZXIoXCJOb3RpZmljYXRpb25cIik7XG4vKipcbiAqIENyZWF0ZXMgYW4gb3V0cHV0IGZvciBQcmVDb21wYWN0IGhvb2tzLlxuICogQHBhcmFtIG9wdGlvbnMgLSBDb25maWd1cmF0aW9uIG9wdGlvbnMgZm9yIHRoZSBob29rIG91dHB1dFxuICogQHJldHVybnMgQSBQcmVDb21wYWN0T3V0cHV0IG9iamVjdCByZWFkeSBmb3IgdGhlIHJ1bnRpbWVcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBwcmVDb21wYWN0T3V0cHV0KHtcbiAqICAgc3lzdGVtTWVzc2FnZTogJ1JlbWVtYmVyOiBzdHJpY3QgbW9kZSBpcyBlbmFibGVkJ1xuICogfSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNvbnN0IHByZUNvbXBhY3RPdXRwdXQgPSAvKiBAX19QVVJFX18gKi8gY3JlYXRlU2ltcGxlT3V0cHV0QnVpbGRlcihcIlByZUNvbXBhY3RcIik7XG4vKipcbiAqIENyZWF0ZXMgYW4gb3V0cHV0IGZvciBQZXJtaXNzaW9uUmVxdWVzdCBob29rcy5cbiAqIEBwYXJhbSBvcHRpb25zIC0gQ29uZmlndXJhdGlvbiBvcHRpb25zIGZvciB0aGUgaG9vayBvdXRwdXRcbiAqIEByZXR1cm5zIEEgUGVybWlzc2lvblJlcXVlc3RPdXRwdXQgb2JqZWN0IHJlYWR5IGZvciB0aGUgcnVudGltZVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIC8vIEF1dG8tYXBwcm92ZVxuICogcGVybWlzc2lvblJlcXVlc3RPdXRwdXQoe1xuICogICBob29rU3BlY2lmaWNPdXRwdXQ6IHtcbiAqICAgICBkZWNpc2lvbjogeyBiZWhhdmlvcjogJ2FsbG93JyB9XG4gKiAgIH1cbiAqIH0pO1xuICpcbiAqIC8vIEF1dG8tYXBwcm92ZSB3aXRoIG1vZGlmaWVkIGlucHV0XG4gKiBwZXJtaXNzaW9uUmVxdWVzdE91dHB1dCh7XG4gKiAgIGhvb2tTcGVjaWZpY091dHB1dDoge1xuICogICAgIGRlY2lzaW9uOiB7XG4gKiAgICAgICBiZWhhdmlvcjogJ2FsbG93JyxcbiAqICAgICAgIHVwZGF0ZWRJbnB1dDogeyBmaWxlX3BhdGg6ICcvc2FmZS9wYXRoJyB9XG4gKiAgICAgfVxuICogICB9XG4gKiB9KTtcbiAqXG4gKiAvLyBBdXRvLWRlbnlcbiAqIHBlcm1pc3Npb25SZXF1ZXN0T3V0cHV0KHtcbiAqICAgaG9va1NwZWNpZmljT3V0cHV0OiB7XG4gKiAgICAgZGVjaXNpb246IHtcbiAqICAgICAgIGJlaGF2aW9yOiAnZGVueScsXG4gKiAgICAgICBtZXNzYWdlOiAnTm90IGFsbG93ZWQnLFxuICogICAgICAgaW50ZXJydXB0OiB0cnVlXG4gKiAgICAgfVxuICogICB9XG4gKiB9KTtcbiAqXG4gKiAvLyBGYWxsIHRocm91Z2ggdG8gbm9ybWFsIHByb21wdFxuICogcGVybWlzc2lvblJlcXVlc3RPdXRwdXQoe30pO1xuICogYGBgXG4gKi9cbmV4cG9ydCBjb25zdCBwZXJtaXNzaW9uUmVxdWVzdE91dHB1dCA9IC8qIEBfX1BVUkVfXyAqLyBjcmVhdGVIb29rU3BlY2lmaWNPdXRwdXRCdWlsZGVyKFwiUGVybWlzc2lvblJlcXVlc3RcIik7XG4vKipcbiAqIENyZWF0ZXMgYW4gb3V0cHV0IGZvciBTZXR1cCBob29rcy5cbiAqIEBwYXJhbSBvcHRpb25zIC0gQ29uZmlndXJhdGlvbiBvcHRpb25zIGZvciB0aGUgaG9vayBvdXRwdXRcbiAqIEByZXR1cm5zIEEgU2V0dXBPdXRwdXQgb2JqZWN0IHJlYWR5IGZvciB0aGUgcnVudGltZVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIC8vIEFkZCBjb250ZXh0IGR1cmluZyBzZXR1cFxuICogc2V0dXBPdXRwdXQoe1xuICogICBob29rU3BlY2lmaWNPdXRwdXQ6IHtcbiAqICAgICBhZGRpdGlvbmFsQ29udGV4dDogJ1Byb2plY3QgaW5pdGlhbGl6ZWQgd2l0aCBjdXN0b20gc2V0dGluZ3MnXG4gKiAgIH1cbiAqIH0pO1xuICpcbiAqIC8vIFNpbXBsZSBwYXNzdGhyb3VnaFxuICogc2V0dXBPdXRwdXQoe30pO1xuICogYGBgXG4gKi9cbmV4cG9ydCBjb25zdCBzZXR1cE91dHB1dCA9IC8qIEBfX1BVUkVfXyAqLyBjcmVhdGVIb29rU3BlY2lmaWNPdXRwdXRCdWlsZGVyKFwiU2V0dXBcIik7XG4vKipcbiAqIENyZWF0ZXMgYW4gb3V0cHV0IGZvciBUZWFtbWF0ZUlkbGUgaG9va3MuXG4gKiBAcGFyYW0gb3B0aW9ucyAtIENvbmZpZ3VyYXRpb24gb3B0aW9ucyBmb3IgdGhlIGhvb2sgb3V0cHV0XG4gKiBAcmV0dXJucyBBIFRlYW1tYXRlSWRsZU91dHB1dCBvYmplY3QgcmVhZHkgZm9yIHRoZSBydW50aW1lXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogLy8gQWxsb3cgdGVhbW1hdGUgdG8gZ28gaWRsZVxuICogdGVhbW1hdGVJZGxlT3V0cHV0KHt9KTtcbiAqXG4gKiAvLyBCbG9jayB3aXRoIGZlZWRiYWNrXG4gKiB0ZWFtbWF0ZUlkbGVPdXRwdXQoeyBzdGRlcnI6ICdDb250aW51ZSB3b3JraW5nOiB1bmZpbmlzaGVkIHRhc2tzIHJlbWFpbi4nIH0pO1xuICogYGBgXG4gKi9cbmV4cG9ydCBjb25zdCB0ZWFtbWF0ZUlkbGVPdXRwdXQgPSAvKiBAX19QVVJFX18gKi8gY3JlYXRlRXhpdENvZGVPdXRwdXRCdWlsZGVyKFwiVGVhbW1hdGVJZGxlXCIpO1xuLyoqXG4gKiBDcmVhdGVzIGFuIG91dHB1dCBmb3IgVGFza0NvbXBsZXRlZCBob29rcy5cbiAqIEBwYXJhbSBvcHRpb25zIC0gQ29uZmlndXJhdGlvbiBvcHRpb25zIGZvciB0aGUgaG9vayBvdXRwdXRcbiAqIEByZXR1cm5zIEEgVGFza0NvbXBsZXRlZE91dHB1dCBvYmplY3QgcmVhZHkgZm9yIHRoZSBydW50aW1lXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogLy8gQWxsb3cgdGFzayBjb21wbGV0aW9uXG4gKiB0YXNrQ29tcGxldGVkT3V0cHV0KHt9KTtcbiAqXG4gKiAvLyBCbG9jayB3aXRoIGZlZWRiYWNrXG4gKiB0YXNrQ29tcGxldGVkT3V0cHV0KHsgc3RkZXJyOiAnQ2Fubm90IGNvbXBsZXRlOiB0ZXN0cyBhcmUgZmFpbGluZy4nIH0pO1xuICogYGBgXG4gKi9cbmV4cG9ydCBjb25zdCB0YXNrQ29tcGxldGVkT3V0cHV0ID0gLyogQF9fUFVSRV9fICovIGNyZWF0ZUV4aXRDb2RlT3V0cHV0QnVpbGRlcihcIlRhc2tDb21wbGV0ZWRcIik7XG4iLCAiLyoqXG4gKiBSdW50aW1lIG1vZHVsZSBmb3IgQ2xhdWRlIENvZGUgaG9va3MuXG4gKlxuICogSGFuZGxlcyBzdGRpbi9zdGRvdXQvZXhpdCBjb2RlIHNlbWFudGljcyBmb3IgY29tcGlsZWQgaG9vayBleGVjdXRpb24uXG4gKiBUaGlzIG1vZHVsZSBpcyB0aGUgY29yZSBvcmNoZXN0cmF0b3IgdGhhdDpcbiAqIC0gUmVhZHMgSlNPTiBmcm9tIHN0ZGluICh3aXJlIGZvcm1hdCB3aXRoIHNuYWtlX2Nhc2UgcHJvcGVydGllcylcbiAqIC0gSW52b2tlcyB0aGUgaG9vayBoYW5kbGVyXG4gKiAtIFdyaXRlcyBvdXRwdXQgdG8gc3Rkb3V0XG4gKiAtIE1hbmFnZXMgZXhpdCBjb2Rlc1xuICogQG1vZHVsZVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIC8vIEluIGEgY29tcGlsZWQgaG9vayBmaWxlXG4gKiBpbXBvcnQgeyBleGVjdXRlIH0gZnJvbSAnQGdvb2Rmb290L2NsYXVkZS1jb2RlLWhvb2tzL3J1bnRpbWUnO1xuICogaW1wb3J0IG15SG9vayBmcm9tICcuL215LWhvb2suanMnO1xuICpcbiAqIGV4ZWN1dGUobXlIb29rKTtcbiAqIGBgYFxuICogQHNlZSBodHRwczovL2NvZGUuY2xhdWRlLmNvbS9kb2NzL2VuL2hvb2tzXG4gKi9cbmltcG9ydCB7IHBlcnNpc3RFbnZWYXIsIHBlcnNpc3RFbnZWYXJzIH0gZnJvbSBcIi4vZW52LmpzXCI7XG5pbXBvcnQgeyBsb2dnZXIgfSBmcm9tIFwiLi9sb2dnZXIuanNcIjtcbmltcG9ydCB7IEVYSVRfQ09ERVMgfSBmcm9tIFwiLi9vdXRwdXRzLmpzXCI7XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBTdGRpbi9TdGRvdXQgSGFuZGxpbmdcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8qKlxuICogUmVhZHMgYWxsIGRhdGEgZnJvbSBzdGRpbi5cbiAqIEByZXR1cm5zIFByb21pc2UgcmVzb2x2aW5nIHRvIHRoZSBjb21wbGV0ZSBzdGRpbiBjb250ZW50XG4gKi9cbmFzeW5jIGZ1bmN0aW9uIHJlYWRTdGRpbigpIHtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICBjb25zdCBjaHVua3MgPSBbXTtcbiAgICAgICAgLy8gU2V0IGVuY29kaW5nIGZpcnN0IHRvIGVuc3VyZSBkYXRhIGV2ZW50cyByZWNlaXZlIHN0cmluZ3NcbiAgICAgICAgcHJvY2Vzcy5zdGRpbi5zZXRFbmNvZGluZyhcInV0Zi04XCIpO1xuICAgICAgICBwcm9jZXNzLnN0ZGluLm9uKFwiZGF0YVwiLCAoY2h1bmspID0+IHtcbiAgICAgICAgICAgIGNodW5rcy5wdXNoKGNodW5rKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHByb2Nlc3Muc3RkaW4ub24oXCJlbmRcIiwgKCkgPT4ge1xuICAgICAgICAgICAgcmVzb2x2ZShjaHVua3Muam9pbihcIlwiKSk7XG4gICAgICAgIH0pO1xuICAgICAgICBwcm9jZXNzLnN0ZGluLm9uKFwiZXJyb3JcIiwgKGVycm9yKSA9PiB7XG4gICAgICAgICAgICByZWplY3QoZXJyb3IpO1xuICAgICAgICB9KTtcbiAgICB9KTtcbn1cbi8qKlxuICogUGFyc2VzIHN0ZGluIEpTT04gaW5wdXQuXG4gKiBAcGFyYW0gc3RkaW5Db250ZW50IC0gUmF3IHN0ZGluIGNvbnRlbnRcbiAqIEByZXR1cm5zIFBhcnNlZCBpbnB1dCAod2lyZSBmb3JtYXQgd2l0aCBzbmFrZV9jYXNlIHByb3BlcnRpZXMpXG4gKiBAdGhyb3dzIEVycm9yIGlmIEpTT04gaXMgbWFsZm9ybWVkXG4gKi9cbmZ1bmN0aW9uIHBhcnNlU3RkaW5JbnB1dChzdGRpbkNvbnRlbnQpIHtcbiAgICAvLyBQYXJzZSBKU09OIC0gaW5wdXQgdXNlcyB3aXJlIGZvcm1hdCAoc25ha2VfY2FzZSkgZGlyZWN0bHlcbiAgICBjb25zdCByYXdJbnB1dCA9IEpTT04ucGFyc2Uoc3RkaW5Db250ZW50KTtcbiAgICByZXR1cm4gcmF3SW5wdXQ7XG59XG4vKipcbiAqIFdyaXRlcyBob29rIG91dHB1dCB0byBzdGRvdXQuXG4gKlxuICogT3V0cHV0IHVzZXMgY2FtZWxDYXNlIGtleXMgcGVyIENsYXVkZSBDb2RlIGhvb2sgc3BlY2lmaWNhdGlvbi5cbiAqIEBwYXJhbSBvdXRwdXQgLSBUaGUgaG9vayBvdXRwdXQgdG8gd3JpdGVcbiAqIEBzZWUgaHR0cHM6Ly9jb2RlLmNsYXVkZS5jb20vZG9jcy9lbi9ob29rcyNob29rLW91dHB1dC1zdHJ1Y3R1cmVcbiAqL1xuZnVuY3Rpb24gd3JpdGVTdGRvdXQob3V0cHV0KSB7XG4gICAgLy8gT3V0cHV0IHVzZXMgY2FtZWxDYXNlIC0gbm8gdHJhbnNmb3JtYXRpb24gbmVlZGVkXG4gICAgcHJvY2Vzcy5zdGRvdXQud3JpdGUoSlNPTi5zdHJpbmdpZnkob3V0cHV0KSk7XG59XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBFcnJvciBIYW5kbGluZ1xuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLyoqXG4gKiBDcmVhdGVzIGFuIGVycm9yIG91dHB1dCBmb3IgbWFsZm9ybWVkIHN0ZGluIEpTT04uXG4gKiBAcGFyYW0gZXJyb3IgLSBUaGUgcGFyc2UgZXJyb3JcbiAqIEByZXR1cm5zIEhvb2tPdXRwdXQgd2l0aCBlbXB0eSBzdGRvdXRcbiAqL1xuZnVuY3Rpb24gY3JlYXRlTWFsZm9ybWVkSW5wdXRPdXRwdXQoZXJyb3IpIHtcbiAgICBsb2dnZXIuZXJyb3IoYEludmFsaWQgSlNPTiBpbnB1dDogJHtlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6IFN0cmluZyhlcnJvcil9YCk7XG4gICAgcmV0dXJuIHsgc3Rkb3V0OiB7fSB9O1xufVxuLyoqXG4gKiBXcml0ZXMgaGFuZGxlciBlcnJvciBzdGFja3RyYWNlIHRvIHN0ZGVyciBhbmQgZXhpdHMgd2l0aCBjb2RlIDIuXG4gKlxuICogV2hlbiBhIGhvb2sgaGFuZGxlciB0aHJvd3MgYW4gZXhjZXB0aW9uOlxuICogLSBTdGFja3RyYWNlICh3aXRoIHNvdXJjZW1hcHMgaWYgYXZhaWxhYmxlKSBpcyBvdXRwdXQgdG8gc3RkZXJyXG4gKiAtIFByb2Nlc3MgZXhpdHMgd2l0aCBjb2RlIDIgKEJMT0NLKVxuICogLSBObyBKU09OIGlzIG91dHB1dCB0byBzdGRvdXRcbiAqIEBwYXJhbSBlcnJvciAtIFRoZSBlcnJvciB0aHJvd24gYnkgdGhlIGhhbmRsZXJcbiAqL1xuZnVuY3Rpb24gaGFuZGxlSGFuZGxlckVycm9yKGVycm9yKSB7XG4gICAgLy8gV3JpdGUgc3RhY2sgdHJhY2UgdG8gc3RkZXJyIChzb3VyY2VtYXBzIGFyZSBhcHBsaWVkIGF1dG9tYXRpY2FsbHkgYnkgTm9kZS5qcylcbiAgICBpZiAoZXJyb3IgaW5zdGFuY2VvZiBFcnJvcikge1xuICAgICAgICBwcm9jZXNzLnN0ZGVyci53cml0ZShgJHtlcnJvci5zdGFjayA/PyBlcnJvci5tZXNzYWdlfVxcbmApO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgcHJvY2Vzcy5zdGRlcnIud3JpdGUoYCR7U3RyaW5nKGVycm9yKX1cXG5gKTtcbiAgICB9XG4gICAgLy8gTG9nIHRvIGZpbGUgaWYgY29uZmlndXJlZFxuICAgIGxvZ2dlci5lcnJvcihgSG9vayBoYW5kbGVyIGVycm9yOiAke2Vycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogU3RyaW5nKGVycm9yKX1gKTtcbiAgICAvLyBDbGVhciBsb2dnZXIgY29udGV4dCBhbmQgY2xvc2VcbiAgICBsb2dnZXIuY2xlYXJDb250ZXh0KCk7XG4gICAgbG9nZ2VyLmNsb3NlKCk7XG4gICAgLy8gRXhpdCB3aXRoIGNvZGUgMiAoQkxPQ0spIC0gbm8gSlNPTiBvdXRwdXRcbiAgICBwcm9jZXNzLmV4aXQoRVhJVF9DT0RFUy5CTE9DSyk7XG59XG4vKipcbiAqIENvbnZlcnRzIGEgU3BlY2lmaWNIb29rT3V0cHV0IHRvIEhvb2tPdXRwdXQgZm9yIHdpcmUgZm9ybWF0LlxuICpcbiAqIFNwZWNpZmljSG9va091dHB1dCB0eXBlcyBoYXZlOiB7IF90eXBlLCBzdGRvdXQsIHN0ZGVycj8gfVxuICogSG9va091dHB1dCBoYXM6IHsgc3Rkb3V0LCBzdGRlcnI/IH1cbiAqXG4gKiBTaW5jZSBvdXRwdXQgYnVpbGRlcnMgbm93IHByb2R1Y2Ugd2lyZS1mb3JtYXQgZGlyZWN0bHksIHRoaXMgZnVuY3Rpb25cbiAqIHNpbXBseSBzdHJpcHMgdGhlIGBfdHlwZWAgZGlzY3JpbWluYXRvciBmaWVsZC5cbiAqIEBwYXJhbSBzcGVjaWZpY091dHB1dCAtIFRoZSBzcGVjaWZpYyBvdXRwdXQgZnJvbSBhIGhvb2sgaGFuZGxlclxuICogQHJldHVybnMgSG9va091dHB1dCByZWFkeSBmb3Igc2VyaWFsaXphdGlvblxuICogQHNlZSBodHRwczovL2NvZGUuY2xhdWRlLmNvbS9kb2NzL2VuL2hvb2tzI2hvb2stb3V0cHV0LXN0cnVjdHVyZVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGNvbnN0IHNwZWNpZmljT3V0cHV0ID0gcHJlVG9vbFVzZU91dHB1dCh7IGhvb2tTcGVjaWZpY091dHB1dDogeyBwZXJtaXNzaW9uRGVjaXNpb246ICdhbGxvdycgfSB9KTtcbiAqIGNvbnN0IGhvb2tPdXRwdXQgPSBjb252ZXJ0VG9Ib29rT3V0cHV0KHNwZWNpZmljT3V0cHV0KTtcbiAqIC8vIGhvb2tPdXRwdXQ6IHsgc3Rkb3V0OiB7IGhvb2tTcGVjaWZpY091dHB1dDogeyAuLi4gfSB9IH1cbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gY29udmVydFRvSG9va091dHB1dChzcGVjaWZpY091dHB1dCkge1xuICAgIGNvbnN0IHsgc3Rkb3V0LCBzdGRlcnIgfSA9IHNwZWNpZmljT3V0cHV0O1xuICAgIHJldHVybiBzdGRlcnIgIT09IHVuZGVmaW5lZCA/IHsgc3Rkb3V0LCBzdGRlcnIgfSA6IHsgc3Rkb3V0IH07XG59XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBFeGVjdXRlIEZ1bmN0aW9uXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vKipcbiAqIEV4ZWN1dGVzIGEgaG9vayBoYW5kbGVyIHdpdGggZnVsbCBydW50aW1lIG9yY2hlc3RyYXRpb24uXG4gKlxuICogVGhpcyBpcyB0aGUgbWFpbiBlbnRyeSBwb2ludCB0aGF0IGNvbXBpbGVkIGhvb2tzIHVzZS4gV2hlbiBhIGNvbXBpbGVkIGhvb2tcbiAqIHJ1bnMgYXMgYSBDTEk6XG4gKlxuICogMS4gUmVhZHMgYWxsIHN0ZGluXG4gKiAyLiBQYXJzZXMgSlNPTiAod2lyZSBmb3JtYXQgd2l0aCBzbmFrZV9jYXNlIHByb3BlcnRpZXMpXG4gKiAzLiBTZXRzIHVwIGxvZ2dlciBjb250ZXh0IChob29rVHlwZSwgaW5wdXQpXG4gKiA0LiBDYWxscyBoYW5kbGVyIHdpdGggaW5wdXQgYW5kIGNvbnRleHQgKGxvZ2dlcilcbiAqIDUuIEhhbmRsZXMgYW55IGVycm9ycywgbG9ncyB0aGVtXG4gKiA2LiBXcml0ZXMgSlNPTiB0byBzdGRvdXRcbiAqIDcuIENsb3NlcyBsb2dnZXJcbiAqIDguIEV4aXRzIHdpdGggYXBwcm9wcmlhdGUgY29kZVxuICogQHBhcmFtIGhvb2tGbiAtIFRoZSBob29rIGZ1bmN0aW9uIHRvIGV4ZWN1dGUgKGZyb20gaG9vayBmYWN0b3J5KVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIC8vIEluIGNvbXBpbGVkIGhvb2sgZmlsZVxuICogaW1wb3J0IHsgZXhlY3V0ZSB9IGZyb20gJ0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcy9ydW50aW1lJztcbiAqIGltcG9ydCB7IHByZVRvb2xVc2VIb29rLCBwcmVUb29sVXNlT3V0cHV0IH0gZnJvbSAnQGdvb2Rmb290L2NsYXVkZS1jb2RlLWhvb2tzJztcbiAqXG4gKiBjb25zdCBteUhvb2sgPSBwcmVUb29sVXNlSG9vayh7IG1hdGNoZXI6ICdCYXNoJyB9LCBhc3luYyAoaW5wdXQsIHsgbG9nZ2VyIH0pID0+IHtcbiAqICAgbG9nZ2VyLmluZm8oJ1Byb2Nlc3NpbmcgQmFzaCBjb21tYW5kJyk7XG4gKiAgIHJldHVybiBwcmVUb29sVXNlT3V0cHV0KHsgYWxsb3c6IHRydWUgfSk7XG4gKiB9KTtcbiAqXG4gKiBleGVjdXRlKG15SG9vayk7XG4gKiBgYGBcbiAqIEBzZWUgaHR0cHM6Ly9jb2RlLmNsYXVkZS5jb20vZG9jcy9lbi9ob29rc1xuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZXhlY3V0ZShob29rRm4pIHtcbiAgICBsZXQgb3V0cHV0O1xuICAgIHRyeSB7XG4gICAgICAgIC8vIENoZWNrIGZvciBsb2cgZmlsZSBjb25maWd1cmF0aW9uIGNvbmZsaWN0c1xuICAgICAgICAvLyBDTEFVREVfQ09ERV9IT09LU19DTElfTE9HX0ZJTEUgaXMgaW5qZWN0ZWQgYnkgdGhlIENMSSAtLWxvZyBwYXJhbWV0ZXJcbiAgICAgICAgLy8gQ0xBVURFX0NPREVfSE9PS1NfTE9HX0ZJTEUgaXMgdGhlIHVzZXIncyBlbnZpcm9ubWVudCB2YXJpYWJsZVxuICAgICAgICBjb25zdCBjbGlMb2dGaWxlID0gcHJvY2Vzcy5lbnYuQ0xBVURFX0NPREVfSE9PS1NfQ0xJX0xPR19GSUxFO1xuICAgICAgICBjb25zdCBlbnZMb2dGaWxlID0gcHJvY2Vzcy5lbnYuQ0xBVURFX0NPREVfSE9PS1NfTE9HX0ZJTEU7XG4gICAgICAgIGlmIChjbGlMb2dGaWxlICE9PSB1bmRlZmluZWQgJiYgZW52TG9nRmlsZSAhPT0gdW5kZWZpbmVkICYmIGNsaUxvZ0ZpbGUgIT09IGVudkxvZ0ZpbGUpIHtcbiAgICAgICAgICAgIC8vIFdyaXRlIGVycm9yIHRvIHN0ZGVyciBhbmQgZXhpdCB3aXRoIGVycm9yIGNvZGVcbiAgICAgICAgICAgIHByb2Nlc3Muc3RkZXJyLndyaXRlKGBMb2cgZmlsZSBjb25maWd1cmF0aW9uIGNvbmZsaWN0OiBDTEkgLS1sb2c9XCIke2NsaUxvZ0ZpbGV9XCIgdnMgQ0xBVURFX0NPREVfSE9PS1NfTE9HX0ZJTEU9XCIke2VudkxvZ0ZpbGV9XCIuIGAgK1xuICAgICAgICAgICAgICAgIFwiVXNlIG9ubHkgb25lIG1ldGhvZCB0byBjb25maWd1cmUgaG9vayBsb2dnaW5nLlxcblwiKTtcbiAgICAgICAgICAgIHByb2Nlc3MuZXhpdChFWElUX0NPREVTLkVSUk9SKTtcbiAgICAgICAgfVxuICAgICAgICAvLyBJZiBDTEkgbG9nIGZpbGUgaXMgc2V0LCBjb25maWd1cmUgdGhlIGxvZ2dlclxuICAgICAgICBpZiAoY2xpTG9nRmlsZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBsb2dnZXIuc2V0TG9nRmlsZShjbGlMb2dGaWxlKTtcbiAgICAgICAgfVxuICAgICAgICAvLyBSZWFkIGFuZCBwYXJzZSBzdGRpblxuICAgICAgICBsZXQgc3RkaW5Db250ZW50O1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgc3RkaW5Db250ZW50ID0gYXdhaXQgcmVhZFN0ZGluKCk7XG4gICAgICAgIH1cbiAgICAgICAgY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICBsb2dnZXIubG9nRXJyb3IoZXJyb3IsIFwiRmFpbGVkIHRvIHJlYWQgc3RkaW5cIik7XG4gICAgICAgICAgICBvdXRwdXQgPSBjcmVhdGVNYWxmb3JtZWRJbnB1dE91dHB1dChlcnJvcik7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgLy8gUGFyc2UgYW5kIHRyYW5zZm9ybSBpbnB1dFxuICAgICAgICBsZXQgaW5wdXQ7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBpbnB1dCA9IHBhcnNlU3RkaW5JbnB1dChzdGRpbkNvbnRlbnQpO1xuICAgICAgICB9XG4gICAgICAgIGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgbG9nZ2VyLmxvZ0Vycm9yKGVycm9yLCBcIkZhaWxlZCB0byBwYXJzZSBzdGRpbiBKU09OXCIpO1xuICAgICAgICAgICAgb3V0cHV0ID0gY3JlYXRlTWFsZm9ybWVkSW5wdXRPdXRwdXQoZXJyb3IpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIC8vIFNldCBsb2dnZXIgY29udGV4dFxuICAgICAgICBjb25zdCBob29rRXZlbnROYW1lID0gaG9va0ZuLmhvb2tFdmVudE5hbWU7XG4gICAgICAgIGxvZ2dlci5zZXRDb250ZXh0KGhvb2tFdmVudE5hbWUsIGlucHV0KTtcbiAgICAgICAgLy8gQnVpbGQgY29udGV4dCAtIFNlc3Npb25TdGFydCBob29rcyBnZXQgZXh0ZW5kZWQgY29udGV4dCB3aXRoIHBlcnNpc3RFbnZWYXJcbiAgICAgICAgY29uc3QgY29udGV4dCA9IGhvb2tFdmVudE5hbWUgPT09IFwiU2Vzc2lvblN0YXJ0XCIgPyB7IGxvZ2dlciwgcGVyc2lzdEVudlZhciwgcGVyc2lzdEVudlZhcnMgfSA6IHsgbG9nZ2VyIH07XG4gICAgICAgIC8vIEV4ZWN1dGUgaGFuZGxlclxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3Qgc3BlY2lmaWNPdXRwdXQgPSBhd2FpdCBob29rRm4oaW5wdXQsIGNvbnRleHQpO1xuICAgICAgICAgICAgb3V0cHV0ID0gY29udmVydFRvSG9va091dHB1dChzcGVjaWZpY091dHB1dCk7XG4gICAgICAgIH1cbiAgICAgICAgY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICAvLyBIYW5kbGVyIHRocmV3IC0gb3V0cHV0IHN0YWNrdHJhY2UgdG8gc3RkZXJyIGFuZCBleGl0IHdpdGggY29kZSAyXG4gICAgICAgICAgICAvLyBUaGlzIGNhbGwgbmV2ZXIgcmV0dXJucyAocHJvY2Vzcy5leGl0KVxuICAgICAgICAgICAgaGFuZGxlSGFuZGxlckVycm9yKGVycm9yKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBmaW5hbGx5IHtcbiAgICAgICAgLy8gV3JpdGUgb3V0cHV0IGlmIHdlIGhhdmUgaXRcbiAgICAgICAgaWYgKG91dHB1dCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICB3cml0ZVN0ZG91dChvdXRwdXQuc3Rkb3V0KTtcbiAgICAgICAgfVxuICAgICAgICAvLyBDbGVhbiB1cCBsb2dnZXIgKHNpbmdsZSBjbGVhbnVwIHBhdGgpXG4gICAgICAgIGxvZ2dlci5jbGVhckNvbnRleHQoKTtcbiAgICAgICAgbG9nZ2VyLmNsb3NlKCk7XG4gICAgICAgIC8vIEV4aXQtY29kZSBCTE9DSzogdW5saWtlIGhhbmRsZXIgdGhyb3cgKG5vIHN0ZG91dCksIHRoaXMgcGF0aCBzdGlsbCB3cml0ZXNcbiAgICAgICAgLy8gc3RydWN0dXJlZCBKU09OIHRvIHN0ZG91dCAoYXMgZW1wdHkge30pIGFsb25nc2lkZSB0aGUgc3RkZXJyIG1lc3NhZ2UuXG4gICAgICAgIC8vIFRoZSBjYWxsZXIgY29udHJvbHMgc3RkZXJyIGZvcm1hdHRpbmcgKG5vIGFwcGVuZGVkIG5ld2xpbmUpLlxuICAgICAgICBpZiAob3V0cHV0Py5zdGRlcnIgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgcHJvY2Vzcy5zdGRlcnIud3JpdGUob3V0cHV0LnN0ZGVycik7XG4gICAgICAgICAgICBwcm9jZXNzLmV4aXQoRVhJVF9DT0RFUy5CTE9DSyk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gRXhpdCB3aXRoIHN1Y2Nlc3MgKGhhbmRsZXIgZXJyb3JzIGV4aXQgdmlhIGhhbmRsZUhhbmRsZXJFcnJvciB3aXRoIGNvZGUgMilcbiAgICAgICAgcHJvY2Vzcy5leGl0KEVYSVRfQ09ERVMuU1VDQ0VTUyk7XG4gICAgfVxufVxuIiwgIi8qKlxuICogU2hhcmVkIGNvbnRleHQtYnVpbGRpbmcgdXRpbGl0aWVzIGZvciBTZXNzaW9uU3RhcnQgYW5kIFN1YmFnZW50U3RhcnQgaG9va3MuXG4gKlxuICogQm90aCBob29rcyBuZWVkIGlkZW50aWNhbCBjYXJkIGNvbnRleHQgaW5qZWN0aW9uLiBUaGlzIG1vZHVsZSBleHRyYWN0cyB0aGVcbiAqIHNoYXJlZCBsb2dpYyBzbyBpdCBjYW4gYmUgcmV1c2VkIHdpdGhvdXQgZHVwbGljYXRpb24uXG4gKlxuICogQHN1bW1hcnkgU2hhcmVkIGNvbnRleHQtYnVpbGRpbmcgdXRpbGl0aWVzIGZvciBzZXNzaW9uIGFuZCBzdWJhZ2VudCBob29rc1xuICogQG1vZHVsZSBsaWIvY29udGV4dFxuICovXG5cbmltcG9ydCB7IGV4ZWNGaWxlU3luYyB9IGZyb20gJ25vZGU6Y2hpbGRfcHJvY2Vzcyc7XG5pbXBvcnQgeyByZWFkZGlyU3luYywgcmVhZEZpbGVTeW5jLCBzdGF0U3luYyB9IGZyb20gJ25vZGU6ZnMnO1xuaW1wb3J0IHsgam9pbiB9IGZyb20gJ25vZGU6cGF0aCc7XG5pbXBvcnQgdHlwZSB7IEFjdGlvbklucHV0IH0gZnJvbSAnQGNhcmRzL3Nkay9jb25maWcnO1xuaW1wb3J0IHsgQ0FSRFNfRU5WX1ZBUlMgfSBmcm9tICdAY2FyZHMvc2RrL2NvbmZpZyc7XG5pbXBvcnQgeyBXT1JLU1BBQ0VfQlJBTkNIRVNfRklMRSwgV09SS1NQQUNFX0NPTU1JVFNfRklMRSB9IGZyb20gJ0BjYXJkcy9zZGsvcHJvdG9jb2wnO1xuXG4vKipcbiAqIEVycm9yIHRocm93biB3aGVuIHRoZSBjYXJkIHJlcG9zaXRvcnkgY2Fubm90IGJlIHJlYWQuXG4gKlxuICogV3JhcHMgdGhlIHVuZGVybHlpbmcgZmlsZXN5c3RlbSBlcnJvciB3aXRoIHRoZSByZXBvc2l0b3J5IHBhdGggZm9yXG4gKiBzdHJ1Y3R1cmVkIGVycm9yIGhhbmRsaW5nIGluIHNlc3Npb24gYW5kIHN1YmFnZW50IGhvb2tzLlxuICovXG5leHBvcnQgY2xhc3MgQ2FyZFJlcG9BY2Nlc3NFcnJvciBleHRlbmRzIEVycm9yIHtcbiAgb3ZlcnJpZGUgcmVhZG9ubHkgbmFtZSA9ICdDYXJkUmVwb0FjY2Vzc0Vycm9yJztcblxuICBjb25zdHJ1Y3RvcihcbiAgICBwdWJsaWMgcmVhZG9ubHkgcmVwb1BhdGg6IHN0cmluZyxcbiAgICBjYXVzZTogdW5rbm93blxuICApIHtcbiAgICBjb25zdCByZWFzb24gPSBjYXVzZSBpbnN0YW5jZW9mIEVycm9yID8gY2F1c2UubWVzc2FnZSA6IFN0cmluZyhjYXVzZSk7XG4gICAgc3VwZXIoYENhbm5vdCByZWFkIGNhcmQgcmVwb3NpdG9yeSBhdCAke3JlcG9QYXRofTogJHtyZWFzb259YCk7XG4gICAgdGhpcy5jYXVzZSA9IGNhdXNlO1xuICB9XG5cbiAgLyoqXG4gICAqIEJ1aWxkcyBhIHVzZXItZmFjaW5nIHN5c3RlbSBtZXNzYWdlIGV4cGxhaW5pbmcgdGhlIGNhcmQgcmVwbyBhY2Nlc3MgZmFpbHVyZS5cbiAgICpcbiAgICogQHBhcmFtIGFjdG9yIC0gSHVtYW4tcmVhZGFibGUgbm91biBmb3IgdGhlIGZhaWxpbmcgZW50aXR5IChlLmcuIFwic2Vzc2lvblwiLCBcInN1YmFnZW50XCIpLlxuICAgKiBAcmV0dXJucyBPYmplY3Qgd2l0aCBgc3lzdGVtTWVzc2FnZWAgYW5kIGBzdG9wUmVhc29uYCBzdHJpbmdzLlxuICAgKi9cbiAgdG9Ib29rRmFpbHVyZShhY3Rvcjogc3RyaW5nKTogeyBzeXN0ZW1NZXNzYWdlOiBzdHJpbmc7IHN0b3BSZWFzb246IHN0cmluZyB9IHtcbiAgICByZXR1cm4ge1xuICAgICAgc3lzdGVtTWVzc2FnZTogW1xuICAgICAgICBgVGhlIGNhcmQgcmVwb3NpdG9yeSBhdCAnJHt0aGlzLnJlcG9QYXRofScgaXMgbm90IGFjY2Vzc2libGUuYCxcbiAgICAgICAgJycsXG4gICAgICAgIGBFcnJvcjogJHt0aGlzLm1lc3NhZ2V9YCxcbiAgICAgICAgJycsXG4gICAgICAgIGBUaGlzICR7YWN0b3J9IGNhbm5vdCBwcm9jZWVkIHdpdGhvdXQgYSB2YWxpZCBjYXJkIHJlcG9zaXRvcnkuIFRvIHJlc29sdmU6YCxcbiAgICAgICAgYDEuIFZlcmlmeSB0aGUgY2FyZCByZXBvc2l0b3J5IGRpcmVjdG9yeSBleGlzdHMgYXQ6ICR7dGhpcy5yZXBvUGF0aH1gLFxuICAgICAgICAnMi4gRW5zdXJlIHRoZSBjdXJyZW50IHByb2Nlc3MgaGFzIHJlYWQgcGVybWlzc2lvbnMgZm9yIHRoZSBkaXJlY3RvcnkgYW5kIGl0cyBjb250ZW50cycsXG4gICAgICAgICczLiBDaGVjayB0aGF0IHRoZSBDQVJEX1JFUE9fUEFUSCBlbnZpcm9ubWVudCB2YXJpYWJsZSBwb2ludHMgdG8gYSB2YWxpZCBjYXJkIHJlcG9zaXRvcnknXG4gICAgICBdLmpvaW4oJ1xcbicpLFxuICAgICAgc3RvcFJlYXNvbjogYENhcmQgcmVwb3NpdG9yeSBpbmFjY2Vzc2libGUgYXQgJHt0aGlzLnJlcG9QYXRofTogJHt0aGlzLm1lc3NhZ2V9YFxuICAgIH07XG4gIH1cbn1cblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gQ2FyZCBtZXRhZGF0YVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4vKipcbiAqIFN1YnNldCBvZiBDQVJELm1ldGEuanNvbiBmaWVsZHMgc3VyZmFjZWQgaW4gdGhlIGA8Y2FyZD5gIGNvbnRleHQgYmxvY2suXG4gKi9cbmludGVyZmFjZSBDYXJkTWV0YSB7XG4gIGlkOiBzdHJpbmc7XG4gIHRpdGxlOiBzdHJpbmc7XG4gIHN0YXR1czogc3RyaW5nO1xuICBnYXRlczoge1xuICAgIHBsYW5SZXF1aXJlZDogYm9vbGVhbjtcbiAgICBwbGFuQXBwcm92ZWQ6IGJvb2xlYW47XG4gICAgcmV2aWV3UmVxdWlyZWQ6IGJvb2xlYW47XG4gICAgcmV2aWV3QXBwcm92ZWQ6IGJvb2xlYW47XG4gIH07XG59XG5cbi8qKlxuICogUmVhZHMgYW5kIHBhcnNlcyBDQVJELm1ldGEuanNvbiBmcm9tIHRoZSBjYXJkIHJlcG9zaXRvcnkuXG4gKlxuICogUmV0dXJucyBgbnVsbGAgd2hlbiB0aGUgZmlsZSBpcyBtaXNzaW5nIG9yIG1hbGZvcm1lZCBzbyB0aGUgY2FsbGVyXG4gKiBjYW4gZmFsbCBiYWNrIHRvIHZhbHVlcyBmcm9tIHtAbGluayBBY3Rpb25JbnB1dH0uXG4gKlxuICogQHBhcmFtIHJvb3RQYXRoIC0gUm9vdCBkaXJlY3Rvcnkgb2YgdGhlIGNhcmQgcmVwb3NpdG9yeS5cbiAqIEByZXR1cm5zIFBhcnNlZCBtZXRhZGF0YSwgb3IgYG51bGxgIHdoZW4gdW5hdmFpbGFibGUuXG4gKi9cbmZ1bmN0aW9uIHJlYWRDYXJkTWV0YShyb290UGF0aDogc3RyaW5nKTogQ2FyZE1ldGEgfCBudWxsIHtcbiAgdHJ5IHtcbiAgICBjb25zdCByYXcgPSByZWFkRmlsZVN5bmMoam9pbihyb290UGF0aCwgJ0NBUkQubWV0YS5qc29uJyksICd1dGYtOCcpO1xuICAgIGNvbnN0IHBhcnNlZCA9IEpTT04ucGFyc2UocmF3KSBhcyBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPjtcbiAgICBjb25zdCBnYXRlcyA9IHBhcnNlZFsnZ2F0ZXMnXSBhcyBSZWNvcmQ8c3RyaW5nLCBib29sZWFuPiB8IHVuZGVmaW5lZDtcbiAgICByZXR1cm4ge1xuICAgICAgaWQ6IFN0cmluZyhwYXJzZWRbJ2lkJ10gPz8gJycpLFxuICAgICAgdGl0bGU6IFN0cmluZyhwYXJzZWRbJ3RpdGxlJ10gPz8gJycpLFxuICAgICAgc3RhdHVzOiBTdHJpbmcocGFyc2VkWydzdGF0dXMnXSA/PyAnJyksXG4gICAgICBnYXRlczoge1xuICAgICAgICBwbGFuUmVxdWlyZWQ6IGdhdGVzPy5bJ3BsYW5SZXF1aXJlZCddID09PSB0cnVlLFxuICAgICAgICBwbGFuQXBwcm92ZWQ6IGdhdGVzPy5bJ3BsYW5BcHByb3ZlZCddID09PSB0cnVlLFxuICAgICAgICByZXZpZXdSZXF1aXJlZDogZ2F0ZXM/LlsncmV2aWV3UmVxdWlyZWQnXSA9PT0gdHJ1ZSxcbiAgICAgICAgcmV2aWV3QXBwcm92ZWQ6IGdhdGVzPy5bJ3Jldmlld0FwcHJvdmVkJ10gPT09IHRydWVcbiAgICAgIH1cbiAgICB9O1xuICB9IGNhdGNoIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxufVxuXG4vKipcbiAqIEJ1aWxkcyB0aGUgYDxjYXJkPmAgWE1MIGJsb2NrIHdpdGggY2FyZCBpZGVudGl0eSwgZ2F0ZXMsIGFuZCBlbnYgdmFycy5cbiAqXG4gKiBGYWxscyBiYWNrIHRvIHtAbGluayBBY3Rpb25JbnB1dH0gZmllbGRzIHdoZW4gQ0FSRC5tZXRhLmpzb24gaXMgdW5yZWFkYWJsZS5cbiAqXG4gKiBAcGFyYW0gYWN0aW9uSW5wdXQgLSBQYXJzZWQgYWN0aW9uIGlucHV0IGZyb20gdGhlIGVudmlyb25tZW50LlxuICogQHJldHVybnMgVGhlIGA8Y2FyZCAuLi4+Li4uPC9jYXJkPmAgYmxvY2sgc3RyaW5nLlxuICovXG5leHBvcnQgZnVuY3Rpb24gYnVpbGRDYXJkQmxvY2soYWN0aW9uSW5wdXQ6IEFjdGlvbklucHV0KTogc3RyaW5nIHtcbiAgY29uc3QgbWV0YSA9IHJlYWRDYXJkTWV0YShhY3Rpb25JbnB1dC5jYXJkUmVwb1BhdGgpO1xuXG4gIGNvbnN0IGlkID0gbWV0YT8uaWQgfHwgYWN0aW9uSW5wdXQuY2FyZElkO1xuICBjb25zdCB0aXRsZSA9IG1ldGE/LnRpdGxlIHx8ICcnO1xuICBjb25zdCBzdGF0dXMgPSBtZXRhPy5zdGF0dXMgfHwgJyc7XG5cbiAgY29uc3QgZ2F0ZXNMaW5lID0gbWV0YVxuICAgID8gYGdhdGVzOiBwbGFuUmVxdWlyZWQ9JHttZXRhLmdhdGVzLnBsYW5SZXF1aXJlZH0gcGxhbkFwcHJvdmVkPSR7bWV0YS5nYXRlcy5wbGFuQXBwcm92ZWR9IHJldmlld1JlcXVpcmVkPSR7bWV0YS5nYXRlcy5yZXZpZXdSZXF1aXJlZH0gcmV2aWV3QXBwcm92ZWQ9JHttZXRhLmdhdGVzLnJldmlld0FwcHJvdmVkfWBcbiAgICA6ICcnO1xuXG4gIGNvbnN0IHdvcmtzcGFjZUJyYW5jaCA9IHByb2Nlc3MuZW52W0NBUkRTX0VOVl9WQVJTLldPUktTUEFDRV9CUkFOQ0hdO1xuICBjb25zdCBiYXNlQnJhbmNoID0gcHJvY2Vzcy5lbnZbQ0FSRFNfRU5WX1ZBUlMuQkFTRV9CUkFOQ0hdO1xuXG4gIGNvbnN0IHdvcmtzcGFjZVBhdGggPSBwcm9jZXNzLmVudltDQVJEU19FTlZfVkFSUy5XT1JLU1BBQ0VfUEFUSF07XG4gIGNvbnN0IGVudkxpbmVzID0gW2AgIENBUkRfUkVQT19QQVRIPSR7YWN0aW9uSW5wdXQuY2FyZFJlcG9QYXRofWBdO1xuICBpZiAod29ya3NwYWNlUGF0aCkgZW52TGluZXMucHVzaChgICBXT1JLU1BBQ0VfUEFUSD0ke3dvcmtzcGFjZVBhdGh9YCk7XG4gIGlmIChiYXNlQnJhbmNoKSBlbnZMaW5lcy5wdXNoKGAgIEJBU0VfQlJBTkNIPSR7YmFzZUJyYW5jaH1gKTtcbiAgaWYgKHdvcmtzcGFjZUJyYW5jaCkgZW52TGluZXMucHVzaChgICBXT1JLU1BBQ0VfQlJBTkNIPSR7d29ya3NwYWNlQnJhbmNofWApO1xuXG4gIGNvbnN0IGJvZHlMaW5lczogc3RyaW5nW10gPSBbXTtcbiAgaWYgKHRpdGxlKSBib2R5TGluZXMucHVzaChgdGl0bGU6ICR7dGl0bGV9YCk7XG4gIGJvZHlMaW5lcy5wdXNoKCcnKTtcbiAgaWYgKGdhdGVzTGluZSkgYm9keUxpbmVzLnB1c2goZ2F0ZXNMaW5lKTtcbiAgYm9keUxpbmVzLnB1c2goJ2VudjonKTtcbiAgYm9keUxpbmVzLnB1c2goLi4uZW52TGluZXMpO1xuXG4gIGNvbnN0IGF0dHJzID0gW2BpZD1cIiR7aWR9XCJgLCBgc3RhdHVzPVwiJHtzdGF0dXN9XCJgLCBgbW9kZT1cIiR7YWN0aW9uSW5wdXQuZXhlY3V0aW9uTW9kZX1cImBdO1xuXG4gIHJldHVybiBgPGNhcmQgJHthdHRycy5qb2luKCcgJyl9PlxcbiR7Ym9keUxpbmVzLmpvaW4oJ1xcbicpfVxcbjwvY2FyZD5gO1xufVxuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBDYXJkIHJlcG8gbGlzdGluZ1xuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4vKipcbiAqIEZvcm1hdHMgYW4gbXRpbWUgYXMgYW4gSVNPIDg2MDEgc3RyaW5nIHRydW5jYXRlZCB0byBtaW51dGVzIGluIFVUQy5cbiAqXG4gKiBAcGFyYW0gbXRpbWVNcyAtIE1vZGlmaWNhdGlvbiB0aW1lIGluIG1pbGxpc2Vjb25kcyBzaW5jZSBlcG9jaC5cbiAqIEByZXR1cm5zIElTTyBzdHJpbmcgbGlrZSBgMjAyNS0wMi0yNFQxNDoyNFpgLlxuICovXG5mdW5jdGlvbiBmb3JtYXRUaW1lc3RhbXAobXRpbWVNczogbnVtYmVyKTogc3RyaW5nIHtcbiAgY29uc3QgZCA9IG5ldyBEYXRlKG10aW1lTXMpO1xuICBjb25zdCBpc28gPSBkLnRvSVNPU3RyaW5nKCk7IC8vIDIwMjUtMDItMjRUMTQ6MjQ6MjEuMDAwWlxuICAvLyBUcnVuY2F0ZSB0byBtaW51dGVzOiBcIjIwMjUtMDItMjRUMTQ6MjRaXCJcbiAgcmV0dXJuIGAke2lzby5zbGljZSgwLCAxNil9WmA7XG59XG5cbi8qKlxuICogQ291bnRzIGZpbGVzIChub24tZGlyZWN0b3JpZXMpIGluIGEgZGlyZWN0b3J5IGFuZCByZXR1cm5zIHRoZSBsYXRlc3QgbXRpbWUuXG4gKlxuICogQHBhcmFtIGRpclBhdGggLSBEaXJlY3RvcnkgdG8gc2Nhbi5cbiAqIEByZXR1cm5zIFR1cGxlIG9mIGBbZmlsZUNvdW50LCBsYXRlc3RNdGltZU1zXWAsIG9yIGBbMCwgMF1gIG9uIGVycm9yLlxuICovXG5mdW5jdGlvbiBkaXJTdGF0cyhkaXJQYXRoOiBzdHJpbmcpOiBbY291bnQ6IG51bWJlciwgbGF0ZXN0TXRpbWVNczogbnVtYmVyXSB7XG4gIHRyeSB7XG4gICAgY29uc3QgZW50cmllcyA9IHJlYWRkaXJTeW5jKGRpclBhdGgsIHsgd2l0aEZpbGVUeXBlczogdHJ1ZSB9KTtcbiAgICBsZXQgY291bnQgPSAwO1xuICAgIGxldCBsYXRlc3QgPSAwO1xuICAgIGZvciAoY29uc3QgZW50cnkgb2YgZW50cmllcykge1xuICAgICAgaWYgKGVudHJ5LmlzRmlsZSgpKSB7XG4gICAgICAgIGNvdW50Kys7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgY29uc3QgbXQgPSBzdGF0U3luYyhqb2luKGRpclBhdGgsIGVudHJ5Lm5hbWUpKS5tdGltZU1zO1xuICAgICAgICAgIGlmIChtdCA+IGxhdGVzdCkgbGF0ZXN0ID0gbXQ7XG4gICAgICAgIH0gY2F0Y2gge1xuICAgICAgICAgIC8vIGluZGl2aWR1YWwgc3RhdCBmYWlsdXJlIGlzIG5vbi1mYXRhbFxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBbY291bnQsIGxhdGVzdF07XG4gIH0gY2F0Y2gge1xuICAgIHJldHVybiBbMCwgMF07XG4gIH1cbn1cblxuLyoqXG4gKiBCdWlsZHMgdGhlIGA8Y2FyZC1yZXBvPmAgYmxvY2s6IHJvb3QtbGV2ZWwgZmlsZXMgd2l0aCB0aW1lc3RhbXBzLFxuICogZGlyZWN0b3JpZXMgd2l0aCBjaGlsZCBjb3VudHMsIGFuZCBzdHJlYW1zIHN1YmRpcmVjdG9yaWVzLlxuICpcbiAqIEBwYXJhbSByb290UGF0aCAtIFJvb3QgZGlyZWN0b3J5IG9mIHRoZSBjYXJkIHJlcG9zaXRvcnkuXG4gKiBAcmV0dXJucyBUaGUgYDxjYXJkLXJlcG8+Li4uPC9jYXJkLXJlcG8+YCBibG9jayBzdHJpbmcuXG4gKiBAdGhyb3dzIHtDYXJkUmVwb0FjY2Vzc0Vycm9yfSBXaGVuIHRoZSByb290IGRpcmVjdG9yeSBjYW5ub3QgYmUgcmVhZC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGJ1aWxkQ2FyZFJlcG9CbG9jayhyb290UGF0aDogc3RyaW5nKTogc3RyaW5nIHtcbiAgbGV0IGVudHJpZXM6IHsgbmFtZTogc3RyaW5nOyBpc0RpcjogYm9vbGVhbiB9W107XG4gIHRyeSB7XG4gICAgZW50cmllcyA9IHJlYWRkaXJTeW5jKHJvb3RQYXRoLCB7IHdpdGhGaWxlVHlwZXM6IHRydWUgfSkubWFwKChkKSA9PiAoe1xuICAgICAgbmFtZTogZC5uYW1lLnRvU3RyaW5nKCksXG4gICAgICBpc0RpcjogZC5pc0RpcmVjdG9yeSgpXG4gICAgfSkpO1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIHRocm93IG5ldyBDYXJkUmVwb0FjY2Vzc0Vycm9yKHJvb3RQYXRoLCBlcnJvcik7XG4gIH1cblxuICBjb25zdCBsaW5lczogc3RyaW5nW10gPSBbXTtcblxuICBmb3IgKGNvbnN0IGVudHJ5IG9mIGVudHJpZXMpIHtcbiAgICBpZiAoZW50cnkubmFtZSA9PT0gJy5naXQnKSBjb250aW51ZTtcbiAgICBjb25zdCBmdWxsUGF0aCA9IGpvaW4ocm9vdFBhdGgsIGVudHJ5Lm5hbWUpO1xuXG4gICAgaWYgKGVudHJ5LmlzRGlyKSB7XG4gICAgICBpZiAoZW50cnkubmFtZSA9PT0gJ3N0cmVhbXMnKSB7XG4gICAgICAgIC8vIFN0cmVhbXM6IHNob3cgZWFjaCBzdWJkaXJlY3Rvcnkgd2l0aCBjaGlsZCBjb3VudCArIGxhdGVzdCB0aW1lc3RhbXBcbiAgICAgICAgbGluZXMucHVzaCgnc3RyZWFtcy8nKTtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBjb25zdCBzdHJlYW1FbnRyaWVzID0gcmVhZGRpclN5bmMoZnVsbFBhdGgsIHsgd2l0aEZpbGVUeXBlczogdHJ1ZSB9KTtcbiAgICAgICAgICBmb3IgKGNvbnN0IHN1YiBvZiBzdHJlYW1FbnRyaWVzKSB7XG4gICAgICAgICAgICBpZiAoc3ViLmlzRGlyZWN0b3J5KCkpIHtcbiAgICAgICAgICAgICAgY29uc3Qgc3ViTmFtZSA9IHN1Yi5uYW1lLnRvU3RyaW5nKCk7XG4gICAgICAgICAgICAgIGNvbnN0IFtjb3VudCwgbGF0ZXN0XSA9IGRpclN0YXRzKGpvaW4oZnVsbFBhdGgsIHN1Yk5hbWUpKTtcbiAgICAgICAgICAgICAgY29uc3QgdHMgPSBsYXRlc3QgPiAwID8gYCAgIGxhdGVzdCAke2Zvcm1hdFRpbWVzdGFtcChsYXRlc3QpfWAgOiAnJztcbiAgICAgICAgICAgICAgbGluZXMucHVzaChgJHtgICAke3N1Yk5hbWV9L2AucGFkRW5kKDI0KX0ke2NvdW50fSBmaWxlcyR7dHN9YCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9IGNhdGNoIHtcbiAgICAgICAgICAvLyBzdHJlYW1zIGRpciB1bnJlYWRhYmxlIFx1MjAxNCBhbHJlYWR5IGxpc3RlZCB0aGUgZGlyZWN0b3J5IG5hbWVcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gTm9uLXN0cmVhbXMgZGlyZWN0b3J5OiBzaG93IGNoaWxkIGNvdW50ICsgbGF0ZXN0IHRpbWVzdGFtcFxuICAgICAgICBjb25zdCBbY291bnQsIGxhdGVzdF0gPSBkaXJTdGF0cyhmdWxsUGF0aCk7XG4gICAgICAgIGNvbnN0IHRzID0gbGF0ZXN0ID4gMCA/IGAgICBsYXRlc3QgJHtmb3JtYXRUaW1lc3RhbXAobGF0ZXN0KX1gIDogJyc7XG4gICAgICAgIGxpbmVzLnB1c2goYCR7YCR7ZW50cnkubmFtZX0vYC5wYWRFbmQoMjQpfSR7Y291bnR9IGZpbGVzJHt0c31gKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgLy8gUm9vdC1sZXZlbCBmaWxlOiBzaG93IG5hbWUgKyB0aW1lc3RhbXBcbiAgICAgIHRyeSB7XG4gICAgICAgIGNvbnN0IG10ID0gc3RhdFN5bmMoZnVsbFBhdGgpLm10aW1lTXM7XG4gICAgICAgIGxpbmVzLnB1c2goYCR7ZW50cnkubmFtZX1gLnBhZEVuZCgyNCkgKyBmb3JtYXRUaW1lc3RhbXAobXQpKTtcbiAgICAgIH0gY2F0Y2gge1xuICAgICAgICBsaW5lcy5wdXNoKGVudHJ5Lm5hbWUpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiBgPGNhcmQtcmVwbz5cXG4ke2xpbmVzLmpvaW4oJ1xcbicpfVxcbjwvY2FyZC1yZXBvPmA7XG59XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIFNoYXJlZCBkaWZmc3RhdCBoZWxwZXJcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuLyoqXG4gKiBTdHJpcHMgXCJOIGZpbGUocykgY2hhbmdlZCwgLi4uXCIgc3VtbWFyeSBsaW5lcyBmcm9tIGdpdCBgLS1zdGF0YCBvdXRwdXQuXG4gKlxuICogVGhlIHBlci1maWxlIGRpZmZzdGF0IGxpbmVzIGFscmVhZHkgY29udmV5IHdoYXQgY2hhbmdlZCBhbmQgYnkgaG93IG11Y2gsXG4gKiBtYWtpbmcgdGhlIHN1bW1hcnkgcmVkdW5kYW50LlxuICpcbiAqIEBwYXJhbSB0ZXh0IC0gUmF3IGdpdCBsb2cgb3V0cHV0IHdpdGggYC0tc3RhdGAuXG4gKiBAcmV0dXJucyBDbGVhbmVkIG91dHB1dCB3aXRoIHN1bW1hcnkgbGluZXMgcmVtb3ZlZCBhbmQgY29sbGFwc2VkIGJsYW5rIGxpbmVzLlxuICovXG5leHBvcnQgZnVuY3Rpb24gc3RyaXBEaWZmc3RhdFN1bW1hcmllcyh0ZXh0OiBzdHJpbmcpOiBzdHJpbmcge1xuICByZXR1cm4gdGV4dFxuICAgIC5zcGxpdCgnXFxuJylcbiAgICAuZmlsdGVyKChsaW5lKSA9PiAhL15cXHMqXFxkKyBmaWxlcz8gY2hhbmdlZC8udGVzdChsaW5lKSlcbiAgICAubWFwKChsaW5lKSA9PiBsaW5lLnJlcGxhY2UoL1xccytcXHxcXHMrKFxcZCtcXHMqWystXSp8QmluXFxzKy4qKSQvLCAnJykpXG4gICAgLmpvaW4oJ1xcbicpXG4gICAgLnJlcGxhY2UoL1xcbnszLH0vZywgJ1xcblxcbicpXG4gICAgLnRyaW0oKTtcbn1cblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gQ2FyZCByZXBvIGdpdCBsb2dcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuLyoqIE1heGltdW0gbnVtYmVyIG9mIHF1YWxpZnlpbmcgY29tbWl0cyBzaG93biBpbiB0aGUgY2FyZCByZXBvIGxvZy4gKi9cbmNvbnN0IE1BWF9DQVJEX1JFUE9fTE9HX0NPTU1JVFMgPSA1O1xuXG4vKipcbiAqIEJ1aWxkcyB0aGUgYDxjYXJkLXJlcG8tbG9nPmAgYmxvY2sgd2l0aCByZWNlbnQgY29tbWl0cyBhbmQgcGF0Y2ggZGlmZnMuXG4gKlxuICogRmlsdGVycyBvdXQgY29tbWl0cyB0aGF0IGV4Y2x1c2l2ZWx5IHRvdWNoIGBzdHJlYW1zL2AgZmlsZXMgKGhpZ2gtZnJlcXVlbmN5XG4gKiB0cmFuc2NyaXB0IHdyaXRlcykuIFNob3dzIHBhdGNoIG91dHB1dCBpbnN0ZWFkIG9mIGRpZmZzdGF0IGZvciByZW1haW5pbmdcbiAqIGNvbnRlbnQuXG4gKlxuICogUmV0dXJucyBgbnVsbGAgd2hlbiB0aGUgcmVwb3NpdG9yeSBoYXMgbm8gcXVhbGlmeWluZyBjb21taXRzIG9yIGdpdCBpc1xuICogdW5hdmFpbGFibGUsIHNvIHRoZSBibG9jayBjYW4gYmUgb21pdHRlZCBmcm9tIHRoZSBvdXRwdXQuXG4gKlxuICogQHBhcmFtIHJvb3RQYXRoIC0gUm9vdCBkaXJlY3Rvcnkgb2YgdGhlIGNhcmQgcmVwb3NpdG9yeS5cbiAqIEByZXR1cm5zIFRoZSBgPGNhcmQtcmVwby1sb2cgLi4uPi4uLjwvY2FyZC1yZXBvLWxvZz5gIGJsb2NrIHN0cmluZywgb3IgYG51bGxgLlxuICovXG5leHBvcnQgZnVuY3Rpb24gYnVpbGRDYXJkUmVwb0xvZ0Jsb2NrKHJvb3RQYXRoOiBzdHJpbmcpOiBzdHJpbmcgfCBudWxsIHtcbiAgdHJ5IHtcbiAgICBjb25zdCBsb2cgPSBleGVjRmlsZVN5bmMoXG4gICAgICAnZ2l0JyxcbiAgICAgIFtcbiAgICAgICAgJ2xvZycsXG4gICAgICAgIGAtJHtNQVhfQ0FSRF9SRVBPX0xPR19DT01NSVRTfWAsXG4gICAgICAgICctLXByZXR0eT1mb3JtYXQ6JXgwMCVoIC0gJWFuOiAlcycsXG4gICAgICAgICctLXN0YXQnLFxuICAgICAgICAnLS0nLFxuICAgICAgICAnLicsXG4gICAgICAgICc6IXN0cmVhbXMvJyxcbiAgICAgICAgJzohLmdpdGlnbm9yZScsXG4gICAgICAgIGA6ISR7V09SS1NQQUNFX0JSQU5DSEVTX0ZJTEV9YCxcbiAgICAgICAgYDohJHtXT1JLU1BBQ0VfQ09NTUlUU19GSUxFfWBcbiAgICAgIF0sXG4gICAgICB7XG4gICAgICAgIGN3ZDogcm9vdFBhdGgsXG4gICAgICAgIGVuY29kaW5nOiAndXRmLTgnLFxuICAgICAgICB0aW1lb3V0OiA1MDAwLFxuICAgICAgICBzdGRpbzogWydwaXBlJywgJ3BpcGUnLCAncGlwZSddXG4gICAgICB9XG4gICAgKS50cmltKCk7XG5cbiAgICBpZiAoIWxvZykgcmV0dXJuIG51bGw7XG5cbiAgICBjb25zdCByYXdDb21taXRzID0gbG9nLnNwbGl0KCdcXDAnKS5maWx0ZXIoQm9vbGVhbik7XG4gICAgaWYgKHJhd0NvbW1pdHMubGVuZ3RoID09PSAwKSByZXR1cm4gbnVsbDtcblxuICAgIGNvbnN0IGZvcm1hdHRlZENvbW1pdHM6IHN0cmluZ1tdID0gW107XG4gICAgZm9yIChjb25zdCBjb21taXQgb2YgcmF3Q29tbWl0cykge1xuICAgICAgY29uc3QgdHJpbW1lZCA9IHN0cmlwRGlmZnN0YXRTdW1tYXJpZXMoY29tbWl0LnRyaW0oKSk7XG4gICAgICBpZiAodHJpbW1lZCkgZm9ybWF0dGVkQ29tbWl0cy5wdXNoKHRyaW1tZWQpO1xuICAgIH1cblxuICAgIGlmIChmb3JtYXR0ZWRDb21taXRzLmxlbmd0aCA9PT0gMCkgcmV0dXJuIG51bGw7XG5cbiAgICBsZXQgdG90YWxDb3VudDogbnVtYmVyIHwgbnVsbCA9IG51bGw7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IGNvdW50U3RyID0gZXhlY0ZpbGVTeW5jKCdnaXQnLCBbJ3Jldi1saXN0JywgJy0tY291bnQnLCAnSEVBRCddLCB7XG4gICAgICAgIGN3ZDogcm9vdFBhdGgsXG4gICAgICAgIGVuY29kaW5nOiAndXRmLTgnLFxuICAgICAgICB0aW1lb3V0OiA1MDAwLFxuICAgICAgICBzdGRpbzogWydwaXBlJywgJ3BpcGUnLCAncGlwZSddXG4gICAgICB9KS50cmltKCk7XG4gICAgICB0b3RhbENvdW50ID0gcGFyc2VJbnQoY291bnRTdHIsIDEwKTtcbiAgICAgIGlmIChOdW1iZXIuaXNOYU4odG90YWxDb3VudCkpIHRvdGFsQ291bnQgPSBudWxsO1xuICAgIH0gY2F0Y2gge1xuICAgICAgLy8gY291bnQgaXMgb3B0aW9uYWxcbiAgICB9XG5cbiAgICBjb25zdCBjb3VudEF0dHIgPSB0b3RhbENvdW50ICE9PSBudWxsID8gYCBjb3VudD1cIiR7dG90YWxDb3VudH1cImAgOiAnJztcbiAgICByZXR1cm4gYDxjYXJkLXJlcG8tbG9nJHtjb3VudEF0dHJ9PlxcbiR7Zm9ybWF0dGVkQ29tbWl0cy5qb2luKCdcXG5cXG4nKX1cXG48L2NhcmQtcmVwby1sb2c+YDtcbiAgfSBjYXRjaCB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbn1cblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gV29ya3NwYWNlIHJlcG8gbG9nXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbi8qKiBNYXhpbXVtIG51bWJlciBvZiBjb21taXRzIHNob3duIHdpdGggZnVsbCBkZXRhaWwgcGVyIGJyYW5jaCBibG9jay4gKi9cbmNvbnN0IE1BWF9XT1JLU1BBQ0VfQ09NTUlUU19QRVJfQlJBTkNIID0gNTtcblxuLyoqXG4gKiBXb3Jrc3BhY2UgdHJhY2tpbmcgZGF0YSByZWFkIGZyb20gc2VwYXJhdGUgd29ya3NwYWNlIGZpbGVzLlxuICovXG5pbnRlcmZhY2UgV29ya3NwYWNlRGF0YSB7XG4gIGJyYW5jaGVzOiBSZWNvcmQ8c3RyaW5nLCB7IHBhcmVudEJyYW5jaD86IHN0cmluZzsgYWRkZWRBdDogc3RyaW5nIH0+O1xuICBjb21taXRzOiBzdHJpbmdbXTtcbn1cblxuLyoqXG4gKiBSZWFkcyB3b3Jrc3BhY2UgZGF0YSBmcm9tIHNlcGFyYXRlIGZpbGVzIGluIHRoZSBjYXJkIHJlcG9zaXRvcnkuXG4gKlxuICogUmVhZHMgYnJhbmNoZXMgZnJvbSBgd29ya3NwYWNlLWJyYW5jaGVzLmpzb25gIGFuZCBjb21taXRzIGZyb21cbiAqIGB3b3Jrc3BhY2UtY29tbWl0cy5jc3ZgLiBFYWNoIGZpbGUgaXMgcmVhZCBpbmRlcGVuZGVudGx5IFx1MjAxNCBFTk9FTlQgaXNcbiAqIHRyZWF0ZWQgYXMgYW4gZW1wdHkgcmVzdWx0LCBvdGhlciBlcnJvcnMgY2F1c2UgYG51bGxgIHRvIGJlIHJldHVybmVkLlxuICpcbiAqIFJldHVybnMgZGF0YSB3aGVuZXZlciBlaXRoZXIgZmlsZSBoYXMgY29udGVudC4gUmV0dXJucyBgbnVsbGAgb25seSB3aGVuXG4gKiBib3RoIGZpbGVzIGFyZSBhYnNlbnQgb3IgZW1wdHksIG9yIHdoZW4gYSBub24tRU5PRU5UIGVycm9yIG9jY3Vycy5cbiAqXG4gKiBAcGFyYW0gY2FyZFJlcG9QYXRoIC0gUm9vdCBkaXJlY3Rvcnkgb2YgdGhlIGNhcmQgcmVwb3NpdG9yeS5cbiAqIEByZXR1cm5zIFBhcnNlZCB3b3Jrc3BhY2UgZGF0YSwgb3IgYG51bGxgIHdoZW4gdW5hdmFpbGFibGUuXG4gKi9cbmZ1bmN0aW9uIHJlYWRXb3Jrc3BhY2VEYXRhKGNhcmRSZXBvUGF0aDogc3RyaW5nKTogV29ya3NwYWNlRGF0YSB8IG51bGwge1xuICBjb25zdCBicmFuY2hlczogV29ya3NwYWNlRGF0YVsnYnJhbmNoZXMnXSA9IHt9O1xuICBsZXQgY29tbWl0czogc3RyaW5nW10gPSBbXTtcblxuICAvLyBSZWFkIGJyYW5jaGVzIGZyb20gd29ya3NwYWNlLWJyYW5jaGVzLmpzb25cbiAgdHJ5IHtcbiAgICBjb25zdCByYXcgPSByZWFkRmlsZVN5bmMoam9pbihjYXJkUmVwb1BhdGgsIFdPUktTUEFDRV9CUkFOQ0hFU19GSUxFKSwgJ3V0Zi04Jyk7XG4gICAgY29uc3QgcGFyc2VkID0gSlNPTi5wYXJzZShyYXcpIGFzIFJlY29yZDxzdHJpbmcsIHsgcGFyZW50QnJhbmNoPzogc3RyaW5nOyBhZGRlZEF0Pzogc3RyaW5nIH0+O1xuICAgIGZvciAoY29uc3QgW25hbWUsIG1ldGFdIG9mIE9iamVjdC5lbnRyaWVzKHBhcnNlZCkpIHtcbiAgICAgIGlmIChtZXRhICYmIHR5cGVvZiBtZXRhID09PSAnb2JqZWN0Jykge1xuICAgICAgICBicmFuY2hlc1tuYW1lXSA9IHtcbiAgICAgICAgICBwYXJlbnRCcmFuY2g6IHR5cGVvZiBtZXRhLnBhcmVudEJyYW5jaCA9PT0gJ3N0cmluZycgPyBtZXRhLnBhcmVudEJyYW5jaCA6IHVuZGVmaW5lZCxcbiAgICAgICAgICBhZGRlZEF0OiB0eXBlb2YgbWV0YS5hZGRlZEF0ID09PSAnc3RyaW5nJyA/IG1ldGEuYWRkZWRBdCA6ICcnXG4gICAgICAgIH07XG4gICAgICB9XG4gICAgfVxuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGlmICgoZXJyb3IgYXMgTm9kZUpTLkVycm5vRXhjZXB0aW9uKS5jb2RlICE9PSAnRU5PRU5UJykge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICB9XG5cbiAgLy8gUmVhZCBjb21taXRzIGZyb20gd29ya3NwYWNlLWNvbW1pdHMuY3N2XG4gIHRyeSB7XG4gICAgY29uc3QgcmF3ID0gcmVhZEZpbGVTeW5jKGpvaW4oY2FyZFJlcG9QYXRoLCBXT1JLU1BBQ0VfQ09NTUlUU19GSUxFKSwgJ3V0Zi04Jyk7XG4gICAgY29tbWl0cyA9IHJhd1xuICAgICAgLnNwbGl0KCdcXG4nKVxuICAgICAgLm1hcCgobCkgPT4gbC50cmltKCkpXG4gICAgICAuZmlsdGVyKChzKTogcyBpcyBzdHJpbmcgPT4gcy5sZW5ndGggPiAwKTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBpZiAoKGVycm9yIGFzIE5vZGVKUy5FcnJub0V4Y2VwdGlvbikuY29kZSAhPT0gJ0VOT0VOVCcpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgfVxuXG4gIC8vIFJldHVybiBkYXRhIHdoZW4gZWl0aGVyIGZpbGUgaGFzIGNvbnRlbnRcbiAgaWYgKE9iamVjdC5rZXlzKGJyYW5jaGVzKS5sZW5ndGggPT09IDAgJiYgY29tbWl0cy5sZW5ndGggPT09IDApIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIHJldHVybiB7IGJyYW5jaGVzLCBjb21taXRzIH07XG59XG5cbi8qKlxuICogUmV0dXJucyB0aGUgc2V0IG9mIGNvbW1pdCBTSEFzIHJlYWNoYWJsZSBmcm9tIGEgZ2l0IHJlZi5cbiAqXG4gKiBAcGFyYW0gd29ya3NwYWNlUGF0aCAtIFJvb3QgZGlyZWN0b3J5IG9mIHRoZSB3b3Jrc3BhY2UgcmVwb3NpdG9yeS5cbiAqIEBwYXJhbSByZWYgLSBHaXQgcmVmIG5hbWUgKGJyYW5jaCwgdGFnLCBvciBTSEEpLlxuICogQHJldHVybnMgU2V0IG9mIGZ1bGwgNDAtY2hhciBTSEFzLCBvciBlbXB0eSBzZXQgb24gZmFpbHVyZS5cbiAqL1xuZnVuY3Rpb24gZ2V0UmVhY2hhYmxlU2hhcyh3b3Jrc3BhY2VQYXRoOiBzdHJpbmcsIHJlZjogc3RyaW5nKTogU2V0PHN0cmluZz4ge1xuICB0cnkge1xuICAgIGNvbnN0IG91dHB1dCA9IGV4ZWNGaWxlU3luYygnZ2l0JywgWydsb2cnLCAnLS1mb3JtYXQ9JUgnLCByZWZdLCB7XG4gICAgICBjd2Q6IHdvcmtzcGFjZVBhdGgsXG4gICAgICBlbmNvZGluZzogJ3V0Zi04JyxcbiAgICAgIHRpbWVvdXQ6IDEwMDAwLFxuICAgICAgc3RkaW86IFsncGlwZScsICdwaXBlJywgJ3BpcGUnXVxuICAgIH0pLnRyaW0oKTtcbiAgICByZXR1cm4gbmV3IFNldChvdXRwdXQgPyBvdXRwdXQuc3BsaXQoJ1xcbicpIDogW10pO1xuICB9IGNhdGNoIHtcbiAgICByZXR1cm4gbmV3IFNldCgpO1xuICB9XG59XG5cbi8qKlxuICogRmlsdGVycyBTSEFzIHRvIHRob3NlIHRoYXQgZXhpc3QgYXMgb2JqZWN0cyBpbiB0aGUgd29ya3NwYWNlIHJlcG8uXG4gKlxuICogVXNlcyBgZ2l0IGNhdC1maWxlIC0tYmF0Y2gtY2hlY2tgIGZvciBhIHNpbmdsZS1jYWxsIGJhdGNoIGV4aXN0ZW5jZSB0ZXN0LlxuICpcbiAqIEBwYXJhbSB3b3Jrc3BhY2VQYXRoIC0gUm9vdCBkaXJlY3Rvcnkgb2YgdGhlIHdvcmtzcGFjZSByZXBvc2l0b3J5LlxuICogQHBhcmFtIHNoYXMgLSBGdWxsIDQwLWNoYXIgU0hBcyB0byBjaGVjay5cbiAqIEByZXR1cm5zIFNIQXMgdGhhdCBleGlzdCBpbiB0aGUgcmVwb3NpdG9yeS5cbiAqL1xuZnVuY3Rpb24gZmlsdGVyUmVzb2x2YWJsZVNoYXMod29ya3NwYWNlUGF0aDogc3RyaW5nLCBzaGFzOiBzdHJpbmdbXSk6IHN0cmluZ1tdIHtcbiAgaWYgKHNoYXMubGVuZ3RoID09PSAwKSByZXR1cm4gW107XG4gIHRyeSB7XG4gICAgY29uc3Qgb3V0cHV0ID0gZXhlY0ZpbGVTeW5jKCdnaXQnLCBbJ2NhdC1maWxlJywgJy0tYmF0Y2gtY2hlY2snXSwge1xuICAgICAgaW5wdXQ6IGAke3NoYXMuam9pbignXFxuJyl9XFxuYCxcbiAgICAgIGN3ZDogd29ya3NwYWNlUGF0aCxcbiAgICAgIGVuY29kaW5nOiAndXRmLTgnLFxuICAgICAgdGltZW91dDogNTAwMCxcbiAgICAgIHN0ZGlvOiBbJ3BpcGUnLCAncGlwZScsICdwaXBlJ11cbiAgICB9KS50cmltKCk7XG5cbiAgICBjb25zdCBsaW5lcyA9IG91dHB1dC5zcGxpdCgnXFxuJyk7XG4gICAgY29uc3QgcmVzb2x2YWJsZTogc3RyaW5nW10gPSBbXTtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGxpbmVzLmxlbmd0aCAmJiBpIDwgc2hhcy5sZW5ndGg7IGkrKykge1xuICAgICAgaWYgKCFsaW5lc1tpXSEuaW5jbHVkZXMoJ21pc3NpbmcnKSkge1xuICAgICAgICByZXNvbHZhYmxlLnB1c2goc2hhc1tpXSEpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcmVzb2x2YWJsZTtcbiAgfSBjYXRjaCB7XG4gICAgcmV0dXJuIFtdO1xuICB9XG59XG5cbi8qKlxuICogUmVzb2x2ZXMgY29tbWl0IGRldGFpbHMgZm9yIHNwZWNpZmljIFNIQXMgdXNpbmcgYGdpdCBsb2cgLS1uby13YWxrYC5cbiAqXG4gKiBAcGFyYW0gd29ya3NwYWNlUGF0aCAtIFJvb3QgZGlyZWN0b3J5IG9mIHRoZSB3b3Jrc3BhY2UgcmVwb3NpdG9yeS5cbiAqIEBwYXJhbSBzaGFzIC0gRnVsbCA0MC1jaGFyIFNIQXMgdG8gcmVzb2x2ZS5cbiAqIEByZXR1cm5zIEZvcm1hdHRlZCBjb21taXQgbG9nIHdpdGggZGlmZnN0YXQsIG9yIGBudWxsYCBvbiBmYWlsdXJlLlxuICovXG5mdW5jdGlvbiByZXNvbHZlV29ya3NwYWNlQ29tbWl0RGV0YWlscyh3b3Jrc3BhY2VQYXRoOiBzdHJpbmcsIHNoYXM6IHN0cmluZ1tdKTogc3RyaW5nIHwgbnVsbCB7XG4gIGlmIChzaGFzLmxlbmd0aCA9PT0gMCkgcmV0dXJuIG51bGw7XG4gIHRyeSB7XG4gICAgY29uc3Qgb3V0cHV0ID0gZXhlY0ZpbGVTeW5jKCdnaXQnLCBbJ2xvZycsICctLW5vLXdhbGsnLCAnLS1wcmV0dHk9Zm9ybWF0OiVoIC0gJXMnLCAnLS1zdGF0JywgLi4uc2hhc10sIHtcbiAgICAgIGN3ZDogd29ya3NwYWNlUGF0aCxcbiAgICAgIGVuY29kaW5nOiAndXRmLTgnLFxuICAgICAgdGltZW91dDogNTAwMCxcbiAgICAgIHN0ZGlvOiBbJ3BpcGUnLCAncGlwZScsICdwaXBlJ11cbiAgICB9KS50cmltKCk7XG5cbiAgICBpZiAoIW91dHB1dCkgcmV0dXJuIG51bGw7XG4gICAgcmV0dXJuIHN0cmlwRGlmZnN0YXRTdW1tYXJpZXMob3V0cHV0KSB8fCBudWxsO1xuICB9IGNhdGNoIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxufVxuXG4vKipcbiAqIENvbW1pdCBncm91cCBmb3IgYSBzaW5nbGUgYnJhbmNoIG9yIHRoZSBvcnBoYW5lZCBidWNrZXQuXG4gKi9cbmludGVyZmFjZSBDb21taXRHcm91cCB7XG4gIGJyYW5jaE5hbWU6IHN0cmluZztcbiAgcGFyZW50QnJhbmNoPzogc3RyaW5nO1xuICBzaGFzOiBzdHJpbmdbXTtcbiAgb3JwaGFuZWQ/OiBib29sZWFuO1xufVxuXG4vKipcbiAqIEJ1aWxkcyBgPHdvcmtzcGFjZS1yZXBvLWxvZz5gIGJsb2NrcyBzaG93aW5nIHdvcmtzcGFjZSBjb21taXRzIGdyb3VwZWQgYnkgYnJhbmNoLlxuICpcbiAqIFJlYWRzIGJyYW5jaGVzIGZyb20gYHdvcmtzcGFjZS1icmFuY2hlcy5qc29uYCBhbmQgY29tbWl0cyBmcm9tXG4gKiBgd29ya3NwYWNlLWNvbW1pdHMuY3N2YCwgcGFydGl0aW9ucyBjb21taXRzIGFjcm9zcyBicmFuY2hlcyB1c2luZyBnaXRcbiAqIHJlYWNoYWJpbGl0eSwgYW5kIHJlbmRlcnMgcGVyLWJyYW5jaCBYTUwgYmxvY2tzLiBBbHJlYWR5LXByaW50ZWQgY29tbWl0c1xuICogYXBwZWFyIGFzIGJhcmUgc2hvcnQgaGFzaGVzIGluIHN1YnNlcXVlbnQgYmxvY2tzIChkZWR1cCkuXG4gKlxuICogQnJhbmNoIHByb2Nlc3Npbmcgb3JkZXI6IHNvcnRlZCBieSBgYWRkZWRBdGAgKG9sZGVzdCBmaXJzdCkgc28gdGhlXG4gKiBmb3VuZGF0aW9uYWwgYnJhbmNoIHJlY2VpdmVzIGZ1bGwgY29tbWl0IG91dHB1dCBhbmQgbGF0ZXIgYnJhbmNoZXMgZGVkdXBcbiAqIGFnYWluc3QgaXQuXG4gKlxuICogQHBhcmFtIHdvcmtzcGFjZVBhdGggLSBSb290IGRpcmVjdG9yeSBvZiB0aGUgd29ya3NwYWNlIHJlcG9zaXRvcnkuXG4gKiBAcGFyYW0gY2FyZFJlcG9QYXRoIC0gUm9vdCBkaXJlY3Rvcnkgb2YgdGhlIGNhcmQgcmVwb3NpdG9yeS5cbiAqIEByZXR1cm5zIEFycmF5IG9mIGA8d29ya3NwYWNlLXJlcG8tbG9nPmAgYmxvY2sgc3RyaW5ncywgb3IgZW1wdHkgYXJyYXkuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBidWlsZFdvcmtzcGFjZVJlcG9Mb2dCbG9ja3Mod29ya3NwYWNlUGF0aDogc3RyaW5nLCBjYXJkUmVwb1BhdGg6IHN0cmluZyk6IHN0cmluZ1tdIHtcbiAgY29uc3Qgd29ya3NwYWNlID0gcmVhZFdvcmtzcGFjZURhdGEoY2FyZFJlcG9QYXRoKTtcbiAgaWYgKCF3b3Jrc3BhY2UpIHJldHVybiBbXTtcblxuICBjb25zdCBiYXNlQnJhbmNoID0gcHJvY2Vzcy5lbnZbQ0FSRFNfRU5WX1ZBUlMuQkFTRV9CUkFOQ0hdID8/ICdtYWluJztcblxuICAvLyBTb3J0IGJyYW5jaGVzIGJ5IGFkZGVkQXQgKG9sZGVzdCBmaXJzdClcbiAgY29uc3Qgc29ydGVkQnJhbmNoZXMgPSBPYmplY3QuZW50cmllcyh3b3Jrc3BhY2UuYnJhbmNoZXMpLnNvcnQoKFssIGFdLCBbLCBiXSkgPT4gYS5hZGRlZEF0LmxvY2FsZUNvbXBhcmUoYi5hZGRlZEF0KSk7XG5cbiAgLy8gUGFydGl0aW9uOiBlYWNoIGJyYW5jaCBpbmNsdWRlcyBBTEwgcmVhY2hhYmxlIHdvcmtzcGFjZS5jb21taXRzIChtYXkgb3ZlcmxhcCkuXG4gIC8vIFJlbmRlcmluZyBkZWR1cCBoYW5kbGVzIGNyb3NzLWJyYW5jaCBvdmVybGFwIHZpYSBiYXJlIHNob3J0IGhhc2hlcy5cbiAgY29uc3QgcmVhY2hhYmxlRnJvbVRyYWNrZWQgPSBuZXcgU2V0PHN0cmluZz4oKTtcbiAgY29uc3QgZ3JvdXBzOiBDb21taXRHcm91cFtdID0gW107XG5cbiAgZm9yIChjb25zdCBbbmFtZSwgbWV0YV0gb2Ygc29ydGVkQnJhbmNoZXMpIHtcbiAgICBjb25zdCByZWFjaGFibGUgPSBnZXRSZWFjaGFibGVTaGFzKHdvcmtzcGFjZVBhdGgsIG5hbWUpO1xuICAgIGNvbnN0IGJyYW5jaFNoYXMgPSB3b3Jrc3BhY2UuY29tbWl0cy5maWx0ZXIoKHNoYSkgPT4gcmVhY2hhYmxlLmhhcyhzaGEpKTtcbiAgICBmb3IgKGNvbnN0IHNoYSBvZiBicmFuY2hTaGFzKSByZWFjaGFibGVGcm9tVHJhY2tlZC5hZGQoc2hhKTtcbiAgICBpZiAoYnJhbmNoU2hhcy5sZW5ndGggPiAwKSB7XG4gICAgICBncm91cHMucHVzaCh7IGJyYW5jaE5hbWU6IG5hbWUsIHBhcmVudEJyYW5jaDogbWV0YS5wYXJlbnRCcmFuY2gsIHNoYXM6IGJyYW5jaFNoYXMgfSk7XG4gICAgfVxuICB9XG5cbiAgLy8gQmFzZSBicmFuY2g6IGNvbW1pdHMgcmVhY2hhYmxlIGZyb20gYmFzZSBidXQgTk9UIGZyb20gYW55IHRyYWNrZWQgYnJhbmNoXG4gIGNvbnN0IGJhc2VSZWFjaGFibGUgPSBnZXRSZWFjaGFibGVTaGFzKHdvcmtzcGFjZVBhdGgsIGJhc2VCcmFuY2gpO1xuICBjb25zdCBiYXNlU2hhcyA9IHdvcmtzcGFjZS5jb21taXRzLmZpbHRlcigoc2hhKSA9PiBiYXNlUmVhY2hhYmxlLmhhcyhzaGEpICYmICFyZWFjaGFibGVGcm9tVHJhY2tlZC5oYXMoc2hhKSk7XG4gIGlmIChiYXNlU2hhcy5sZW5ndGggPiAwKSB7XG4gICAgZ3JvdXBzLnB1c2goeyBicmFuY2hOYW1lOiBiYXNlQnJhbmNoLCBzaGFzOiBiYXNlU2hhcyB9KTtcbiAgfVxuXG4gIC8vIE9ycGhhbmVkOiBub3QgcmVhY2hhYmxlIGZyb20gYW55IHRyYWNrZWQgYnJhbmNoIG9yIGJhc2UsIGZpbHRlciB0byByZXNvbHZhYmxlXG4gIGNvbnN0IG9ycGhhbmVkU2hhcyA9IHdvcmtzcGFjZS5jb21taXRzLmZpbHRlcigoc2hhKSA9PiAhcmVhY2hhYmxlRnJvbVRyYWNrZWQuaGFzKHNoYSkgJiYgIWJhc2VSZWFjaGFibGUuaGFzKHNoYSkpO1xuICBjb25zdCByZXNvbHZhYmxlID0gZmlsdGVyUmVzb2x2YWJsZVNoYXMod29ya3NwYWNlUGF0aCwgb3JwaGFuZWRTaGFzKTtcbiAgaWYgKHJlc29sdmFibGUubGVuZ3RoID4gMCkge1xuICAgIGdyb3Vwcy5wdXNoKHsgYnJhbmNoTmFtZTogJycsIHNoYXM6IHJlc29sdmFibGUsIG9ycGhhbmVkOiB0cnVlIH0pO1xuICB9XG5cbiAgLy8gUmVuZGVyIGJsb2NrcyB3aXRoIGNyb3NzLWJyYW5jaCBkZWR1cFxuICBjb25zdCBwcmludGVkU2hhcyA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuICBjb25zdCBibG9ja3M6IHN0cmluZ1tdID0gW107XG5cbiAgZm9yIChjb25zdCBncm91cCBvZiBncm91cHMpIHtcbiAgICBjb25zdCBuZXdTaGFzID0gZ3JvdXAuc2hhcy5maWx0ZXIoKHNoYSkgPT4gIXByaW50ZWRTaGFzLmhhcyhzaGEpKTtcbiAgICBjb25zdCBkdXBTaGFzID0gZ3JvdXAuc2hhcy5maWx0ZXIoKHNoYSkgPT4gcHJpbnRlZFNoYXMuaGFzKHNoYSkpO1xuXG4gICAgLy8gU2hvdyBtb3N0IHJlY2VudCBOIHdpdGggZnVsbCBkZXRhaWxcbiAgICBjb25zdCBkaXNwbGF5U2hhcyA9IG5ld1NoYXMuc2xpY2UoLU1BWF9XT1JLU1BBQ0VfQ09NTUlUU19QRVJfQlJBTkNIKTtcbiAgICBjb25zdCBkZXRhaWxzID0gcmVzb2x2ZVdvcmtzcGFjZUNvbW1pdERldGFpbHMod29ya3NwYWNlUGF0aCwgZGlzcGxheVNoYXMpO1xuXG4gICAgaWYgKGRldGFpbHMpIHtcbiAgICAgIGZvciAoY29uc3Qgc2hhIG9mIGRpc3BsYXlTaGFzKSBwcmludGVkU2hhcy5hZGQoc2hhKTtcbiAgICB9XG5cbiAgICAvLyBCdWlsZCBib2R5OiBmdWxsIGRldGFpbHMgZmlyc3QsIHRoZW4gYmFyZSBoYXNoZXMgZm9yIGRlZHVwXG4gICAgY29uc3QgYm9keVBhcnRzOiBzdHJpbmdbXSA9IFtdO1xuICAgIGlmIChkZXRhaWxzKSBib2R5UGFydHMucHVzaChkZXRhaWxzKTtcbiAgICBpZiAoZHVwU2hhcy5sZW5ndGggPiAwKSB7XG4gICAgICBib2R5UGFydHMucHVzaChkdXBTaGFzLm1hcCgoc2hhKSA9PiBzaGEuc2xpY2UoMCwgNykpLmpvaW4oJ1xcbicpKTtcbiAgICB9XG5cbiAgICBpZiAoYm9keVBhcnRzLmxlbmd0aCA9PT0gMCkgY29udGludWU7XG5cbiAgICAvLyBCdWlsZCBYTUwgdGFnXG4gICAgY29uc3QgYXR0cnM6IHN0cmluZ1tdID0gW107XG4gICAgaWYgKGdyb3VwLm9ycGhhbmVkKSB7XG4gICAgICBhdHRycy5wdXNoKCdvcnBoYW5lZD1cInRydWVcIicpO1xuICAgIH0gZWxzZSB7XG4gICAgICBhdHRycy5wdXNoKGBicmFuY2g9XCIke2dyb3VwLmJyYW5jaE5hbWV9XCJgKTtcbiAgICAgIGlmIChncm91cC5wYXJlbnRCcmFuY2gpIGF0dHJzLnB1c2goYHBhcmVudEJyYW5jaD1cIiR7Z3JvdXAucGFyZW50QnJhbmNofVwiYCk7XG4gICAgfVxuICAgIGF0dHJzLnB1c2goYGNvdW50PVwiJHtncm91cC5zaGFzLmxlbmd0aH1cImApO1xuXG4gICAgYmxvY2tzLnB1c2goYDx3b3Jrc3BhY2UtcmVwby1sb2cgJHthdHRycy5qb2luKCcgJyl9PlxcbiR7Ym9keVBhcnRzLmpvaW4oJ1xcbicpfVxcbjwvd29ya3NwYWNlLXJlcG8tbG9nPmApO1xuICB9XG5cbiAgcmV0dXJuIGJsb2Nrcztcbn1cblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gQ29tYmluZWQgY29udGV4dFxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4vKipcbiAqIEJ1aWxkcyB0aGUgY29tYmluZWQgYWRkaXRpb25hbCBjb250ZXh0IHN0cmluZyBmb3Igc2Vzc2lvbiBhbmQgc3ViYWdlbnQgaG9va3MuXG4gKlxuICogUHJvZHVjZXMgWE1MIGJsb2NrczogYDxjYXJkPmAgKGlkZW50aXR5ICsgZ2F0ZXMgKyBlbnYpLCBgPGNhcmQtcmVwbz5gXG4gKiAoZGlyZWN0b3J5IHN1bW1hcnkpLCBvcHRpb25hbGx5IGA8Y2FyZC1yZXBvLWxvZz5gIChyZWNlbnQgY2FyZCByZXBvIGNvbW1pdHMpLFxuICogYW5kIG9wdGlvbmFsbHkgYDx3b3Jrc3BhY2UtcmVwby1sb2c+YCBibG9ja3MgKHdvcmtzcGFjZSBjb21taXRzIHBlciBicmFuY2gpLlxuICogTGV0IHtAbGluayBDYXJkUmVwb0FjY2Vzc0Vycm9yfSBwcm9wYWdhdGUgdG8gdGhlIGNhbGxlciBmb3Igc3RydWN0dXJlZFxuICogZXJyb3IgaGFuZGxpbmcuXG4gKlxuICogQHBhcmFtIGFjdGlvbklucHV0IC0gUGFyc2VkIGFjdGlvbiBpbnB1dCBmcm9tIHRoZSBlbnZpcm9ubWVudC5cbiAqIEByZXR1cm5zIENvbWJpbmVkIGNvbnRleHQgc3RyaW5nIHdpdGggWE1MIGJsb2Nrcy5cbiAqIEB0aHJvd3Mge0NhcmRSZXBvQWNjZXNzRXJyb3J9IFdoZW4gdGhlIGNhcmQgcmVwb3NpdG9yeSBjYW5ub3QgYmUgcmVhZC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGJ1aWxkQWRkaXRpb25hbENvbnRleHQoYWN0aW9uSW5wdXQ6IEFjdGlvbklucHV0KTogc3RyaW5nIHtcbiAgY29uc3QgY2FyZEJsb2NrID0gYnVpbGRDYXJkQmxvY2soYWN0aW9uSW5wdXQpO1xuICBjb25zdCByZXBvQmxvY2sgPSBidWlsZENhcmRSZXBvQmxvY2soYWN0aW9uSW5wdXQuY2FyZFJlcG9QYXRoKTtcbiAgY29uc3QgbG9nQmxvY2sgPSBidWlsZENhcmRSZXBvTG9nQmxvY2soYWN0aW9uSW5wdXQuY2FyZFJlcG9QYXRoKTtcbiAgY29uc3Qgd29ya3NwYWNlTG9nQmxvY2tzID0gYnVpbGRXb3Jrc3BhY2VSZXBvTG9nQmxvY2tzKGFjdGlvbklucHV0LnJlcG9Sb290LCBhY3Rpb25JbnB1dC5jYXJkUmVwb1BhdGgpO1xuXG4gIGNvbnN0IHBhcnRzID0gW2NhcmRCbG9jaywgcmVwb0Jsb2NrXTtcbiAgaWYgKGxvZ0Jsb2NrKSBwYXJ0cy5wdXNoKGxvZ0Jsb2NrKTtcbiAgcGFydHMucHVzaCguLi53b3Jrc3BhY2VMb2dCbG9ja3MpO1xuICByZXR1cm4gcGFydHMuam9pbignXFxuXFxuJyk7XG59XG4iLCAiLyoqXG4gKiBCcmFuY2ggYW5kIHdvcmt0cmVlIHRyYWNraW5nIHR5cGVzIGZvciBDYXJkcyBWMiB3b3Jrc3BhY2UgaW50ZWdyYXRpb24uXG4gKlxuICogVGhlc2UgdHlwZXMgc3VwcG9ydCB0cmFja2luZyBHaXQgYnJhbmNoZXMgYW5kIHRoZWlyIGFzc29jaWF0ZWQgd29ya3RyZWVzIHdpdGhpblxuICogYSBjYXJkJ3Mgd29ya3NwYWNlLiBCcmFuY2ggbWV0YWRhdGEgaXMgcGVyc2lzdGVkIGluIHNlcGFyYXRlIHdvcmtzcGFjZS1icmFuY2hlcy5qc29uXG4gKiBhbmQgd29ya3NwYWNlLWNvbW1pdHMuY3N2IGZpbGVzLCB0cmFja2VkIHdpdGggc3RhdGljIG1ldGFkYXRhIChicmFuY2ggbmFtZSwgd29ya3RyZWUgcGF0aCxcbiAqIGFkZGVkQXQgdGltZXN0YW1wKSBhbmQgZGVyaXZlZCBmaWVsZHMgY29tcHV0ZWQgYXQgcmVhZCB0aW1lIChleGlzdHMsIGlzTWVyZ2VkLCBjb21taXRzKS5cbiAqXG4gKiBUaGUgYnJhbmNoIEFQSSAoYEdFVCAvY2FyZHMvOmlkL2JyYW5jaGVzYCwgYFBPU1QgL2NhcmRzLzppZC9icmFuY2hlc2ApIHVzZXNcbiAqIHRoZXNlIHR5cGVzIHRvIGV4cG9zZSB3b3Jrc3BhY2UgdHJhY2tpbmcgc3RhdGUgdG8gY2xpZW50cyBhbmQgZW5hYmxlIGJyYW5jaFxuICogYXNzb2NpYXRpb24gd2l0aCBjYXJkcy5cbiAqXG4gKiBAc3VtbWFyeSBCcmFuY2ggYW5kIHdvcmt0cmVlIHRyYWNraW5nIHR5cGVzIGZvciBDYXJkcyBWMiB3b3Jrc3BhY2UgaW50ZWdyYXRpb25cbiAqIEBtb2R1bGUgdHlwZXMvYnJhbmNoXG4gKi9cblxuaW1wb3J0IHR5cGUgeyBDb21taXREZXRhaWxzIH0gZnJvbSAnLi90aW1lbGluZS5qcyc7XG5cbi8qKlxuICogV2VsbC1rbm93biBTSEEgZm9yIGFuIGVtcHR5IGdpdCB0cmVlLlxuICpcbiAqIFRoaXMgaXMgYSBkZXRlcm1pbmlzdGljIHZhbHVlIHByb2R1Y2VkIGJ5IGBnaXQgaGFzaC1vYmplY3QgLXQgdHJlZSAvZGV2L251bGxgXG4gKiBhbmQgbmV2ZXIgY2hhbmdlcyBhY3Jvc3MgZ2l0IHZlcnNpb25zLiBVc2VkIGFzIHRoZSBkaWZmIGJhc2Ugd2hlbiBjb21wYXJpbmdcbiAqIGFnYWluc3QgYSBzdGF0ZSB3aXRoIG5vIHByaW9yIGNvbW1pdHMuXG4gKi9cbmV4cG9ydCBjb25zdCBFTVBUWV9UUkVFX1NIQSA9ICc0YjgyNWRjNjQyY2I2ZWI5YTA2MGU1NGJmOGQ2OTI4OGZiZWU0OTA0JztcblxuZXhwb3J0IGNvbnN0IFdPUktTUEFDRV9CUkFOQ0hFU19GSUxFID0gJ3dvcmtzcGFjZS1icmFuY2hlcy5qc29uJztcbmV4cG9ydCBjb25zdCBXT1JLU1BBQ0VfQ09NTUlUU19GSUxFID0gJ3dvcmtzcGFjZS1jb21taXRzLmNzdic7XG5cbi8qKlxuICogQSBzaW5nbGUgdHJhY2tlZCBicmFuY2ggd2l0aGluIGEgY2FyZCdzIHdvcmtzcGFjZSBibG9jay5cbiAqXG4gKiBUaGlzIGlzIHRoZSBtaW5pbWFsIG1ldGFkYXRhIHBlcnNpc3RlZCBmb3IgZWFjaCBicmFuY2ggaW4gd29ya3NwYWNlLWJyYW5jaGVzLmpzb24uXG4gKiBUaGUgd29ya3RyZWUgcGF0aCBpcyBvcHRpb25hbCBhbmQgbWFjaGluZS1zcGVjaWZpYzsgaXQgbWF5IGJlY29tZSBzdGFsZSBpZlxuICogdGhlIHdvcmt0cmVlIGlzIG1vdmVkIG9yIGRlbGV0ZWQgb3V0c2lkZSBvZiB0aGUgY2FyZHMgc3lzdGVtLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIFdvcmtzcGFjZUJyYW5jaCB7XG4gIC8qKlxuICAgKiBPcHRpb25hbCBhYnNvbHV0ZSBwYXRoIHRvIHdvcmt0cmVlIGRpcmVjdG9yeSAobWFjaGluZS1zcGVjaWZpYywgbWF5IGJlIHN0YWxlKS5cbiAgICogVGhpcyBwYXRoIGlzIGFkdmlzb3J5IG9ubHkgYW5kIHNob3VsZCBiZSB2YWxpZGF0ZWQgYmVmb3JlIHVzZS5cbiAgICovXG4gIHdvcmt0cmVlPzogc3RyaW5nO1xuXG4gIC8qKlxuICAgKiBOYW1lIG9mIHRoZSBicmFuY2ggdGhpcyB3YXMgY3JlYXRlZCBmcm9tIChlLmcuLCAnbWFpbicsICdtYXN0ZXInKS5cbiAgICogVXNlZCBhcyB0aGUgYmFzZSByZWYgZm9yIGNvbXBhcmlzb25zLCBmYXN0LWZvcndhcmQgZGV0ZWN0aW9uLCBhbmQgcmViYXNlIHRhcmdldGluZy5cbiAgICovXG4gIHBhcmVudEJyYW5jaDogc3RyaW5nO1xuXG4gIC8qKlxuICAgKiBJU08gODYwMSB0aW1lc3RhbXAgd2hlbiBicmFuY2ggd2FzIGFkZGVkIHRvIHRoZSBjYXJkLlxuICAgKiBVc2VkIGZvciBjaHJvbm9sb2dpY2FsIHNvcnRpbmcgYW5kIGF1ZGl0IHRyYWlscy5cbiAgICovXG4gIGFkZGVkQXQ6IHN0cmluZztcbn1cblxuLyoqXG4gKiBCcmFuY2ggaW5mbyByZXR1cm5lZCBieSBHRVQgL2NhcmRzLzppZC9icmFuY2hlcyAoaW5jbHVkZXMgY29tcHV0ZWQgZmllbGRzKS5cbiAqXG4gKiBUaGlzIHR5cGUgZXh0ZW5kcyB0aGUgcGVyc2lzdGVkIFdvcmtzcGFjZUJyYW5jaCBkYXRhIHdpdGggcnVudGltZS1jb21wdXRlZFxuICogZmllbGRzIHRoYXQgcmVmbGVjdCB0aGUgY3VycmVudCBHaXQgcmVwb3NpdG9yeSBzdGF0ZS4gQ29tcHV0ZWQgZmllbGRzIGFyZVxuICogbmV2ZXIgcGVyc2lzdGVkLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIEJyYW5jaEluZm8ge1xuICAvKipcbiAgICogQnJhbmNoIG5hbWUgKG1heSBjb250YWluIHNsYXNoZXMsIGUuZy4sIFwiZmVhdHVyZS9hdXRoXCIpLlxuICAgKiBUaGlzIGlzIHRoZSBHaXQgcmVmIG5hbWUsIG5vdCBhIGZpbGVzeXN0ZW0gcGF0aC5cbiAgICovXG4gIG5hbWU6IHN0cmluZztcblxuICAvKipcbiAgICogT3B0aW9uYWwgd29ya3RyZWUgcGF0aCBhc3NvY2lhdGVkIHdpdGggdGhpcyBicmFuY2guXG4gICAqIENvcGllZCBmcm9tIFdvcmtzcGFjZUJyYW5jaC53b3JrdHJlZSBpZiBwcmVzZW50LlxuICAgKi9cbiAgd29ya3RyZWU/OiBzdHJpbmc7XG5cbiAgLyoqXG4gICAqIFBhcmVudCBicmFuY2ggbmFtZSBmcm9tIHdoaWNoIHRoaXMgYnJhbmNoIHdhcyBjcmVhdGVkIChlLmcuLCAnbWFpbicsICdtYXN0ZXInKS5cbiAgICogVXNlZCBhcyB0aGUgYmFzZSByZWYgZm9yIGNvbXBhcmlzb25zLlxuICAgKi9cbiAgcGFyZW50QnJhbmNoOiBzdHJpbmc7XG5cbiAgLyoqXG4gICAqIElTTyA4NjAxIHRpbWVzdGFtcCB3aGVuIGJyYW5jaCB3YXMgYWRkZWQuXG4gICAqIENvcGllZCBmcm9tIFdvcmtzcGFjZUJyYW5jaC5hZGRlZEF0LlxuICAgKi9cbiAgYWRkZWRBdDogc3RyaW5nO1xuXG4gIC8qKlxuICAgKiBXaGV0aGVyIHRoZSBicmFuY2ggc3RpbGwgZXhpc3RzIGluIGdpdCAoY29tcHV0ZWQgYXQgcmVhZCB0aW1lKS5cbiAgICogRmFsc2UgaWYgdGhlIGJyYW5jaCByZWYgaGFzIGJlZW4gZGVsZXRlZC5cbiAgICovXG4gIGV4aXN0cz86IGJvb2xlYW47XG5cbiAgLyoqXG4gICAqIFdoZXRoZXIgdGhlIGJyYW5jaCB0aXAgaXMgbWVyZ2VkIGludG8gcmVxdWVzdGluZyB3b3Jrc3BhY2UgSEVBRC5cbiAgICogQ29tcHV0ZWQgYXQgcmVhZCB0aW1lLCBuZXZlciBzdG9yZWQuIE9ubHkgbWVhbmluZ2Z1bCB3aGVuIGV4aXN0cz10cnVlLlxuICAgKi9cbiAgaXNNZXJnZWQ/OiBib29sZWFuO1xuXG4gIC8qKlxuICAgKiBDb21taXQgU0hBcyByZWFjaGFibGUgZnJvbSB0aGlzIGJyYW5jaCBidXQgbm90IGZyb20gSEVBRCAoY29tcHV0ZWQgYXQgcmVhZCB0aW1lKS5cbiAgICogRW1wdHkgYXJyYXkgaWYgYnJhbmNoIGlzIGZ1bGx5IG1lcmdlZCBvciBkb2VzIG5vdCBleGlzdC5cbiAgICovXG4gIGNvbW1pdHM/OiBzdHJpbmdbXTtcbn1cblxuLyoqXG4gKiBSZXNwb25zZSBzaGFwZSBmb3IgR0VUIC9jYXJkcy86aWQvYnJhbmNoZXMuXG4gKlxuICogUmV0dXJucyBhbGwgdHJhY2tlZCBicmFuY2hlcyBmb3IgYSBjYXJkIHdpdGggY29tcHV0ZWQgcnVudGltZSBmaWVsZHMuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgQnJhbmNoZXNSZXNwb25zZSB7XG4gIC8qKlxuICAgKiBMaXN0IG9mIHRyYWNrZWQgYnJhbmNoZXMgd2l0aCBjb21wdXRlZCBmaWVsZHMuXG4gICAqIFNvcnRlZCBieSBhZGRlZEF0IHRpbWVzdGFtcCAob2xkZXN0IGZpcnN0KS5cbiAgICovXG4gIGJyYW5jaGVzOiBCcmFuY2hJbmZvW107XG5cbiAgLyoqXG4gICAqIEFsbCBjYXJkLWxldmVsIGNvbW1pdCBTSEFzIGZyb20gd29ya3NwYWNlLWNvbW1pdHMuY3N2LlxuICAgKiBQcmVzZW50IHJlZ2FyZGxlc3Mgb2YgYnJhbmNoIHN0YXRlLCBzbyB0aGUgVUkgY2FuIHNob3cgY2hhbmdlc1xuICAgKiBldmVuIGFmdGVyIGFsbCB0cmFja2VkIGJyYW5jaGVzIGhhdmUgYmVlbiByZW1vdmVkLlxuICAgKi9cbiAgY29tbWl0czogc3RyaW5nW107XG5cbiAgLyoqXG4gICAqIERlZmF1bHQgYnJhbmNoIG9mIHRoZSB3b3Jrc3BhY2UgcmVwb3NpdG9yeSAoZS5nLiwgJ21haW4nLCAnbWFzdGVyJykuXG4gICAqIERldGVjdGVkIGZyb20gYHJlZnMvcmVtb3Rlcy9vcmlnaW4vSEVBRGAsIGZhbGxpbmcgYmFjayB0byBjdXJyZW50IEhFQUQgYnJhbmNoLlxuICAgKiBVc2VkIGFzIHRoZSBiYXNlIHJlZiBmb3IgY2FyZC1sZXZlbCBjb21taXRzIHdoZW4gbm8gdHJhY2tlZCBicmFuY2hlcyByZW1haW4uXG4gICAqL1xuICBkZWZhdWx0QnJhbmNoOiBzdHJpbmc7XG5cbiAgLyoqXG4gICAqIFNIQXMgb2YgY2FyZCBjb21taXRzIHRoYXQgYXJlIGFuY2VzdG9ycyBvZiBIRUFEIGF0IHRoZSByZXF1ZXN0aW5nIHdvcmtzcGFjZS5cbiAgICogRW1wdHkgYXJyYXkgd2hlbiB3b3Jrc3BhY2VQYXRoIGlzIG5vdCBwcm92aWRlZCBvciBnaXQgb3BlcmF0aW9ucyBmYWlsIGdyYWNlZnVsbHkuXG4gICAqL1xuICBtZXJnZWRDb21taXRzOiBzdHJpbmdbXTtcblxuICAvKipcbiAgICogQnJhbmNoIG5hbWUgY2hlY2tlZCBvdXQgYXQgdGhlIHJlcXVlc3Rpbmcgd29ya3NwYWNlIChlLmcuLCBcIm1haW5cIiwgXCJmZWF0dXJlLWF1dGhcIikuXG4gICAqIFwiSEVBRFwiIHdoZW4gaW4gZGV0YWNoZWQgSEVBRCBzdGF0ZS5cbiAgICogRW1wdHkgc3RyaW5nIHdoZW4gd29ya3NwYWNlUGF0aCBpcyBub3QgcHJvdmlkZWQgb3IgZ2l0IG9wZXJhdGlvbnMgZmFpbCBncmFjZWZ1bGx5LlxuICAgKi9cbiAgaGVhZEJyYW5jaDogc3RyaW5nO1xuXG4gIC8qKlxuICAgKiBDb21taXQgZGV0YWlscyBrZXllZCBieSBTSEEgZm9yIGVhY2ggZW50cnkgaW4gYGNvbW1pdHNgLlxuICAgKiBFbXB0eSB3aGVuIHRoZXJlIGFyZSBubyBjb21taXRzLiBPbmx5IGFic2VudCB3aGVuIGB3b3Jrc3BhY2VQYXRoYCB3YXMgbm90IHByb3ZpZGVkXG4gICAqIChpLmUuIHRoZSByZWluZGV4IHBhdGggXHUyMDE0IGBjb21taXREZXRhaWxzYCBpcyBkZWxpdmVyZWQgc2VwYXJhdGVseSB2aWEgYFdvcmtzcGFjZUNvbW1pdEV2ZW50YCkuXG4gICAqL1xuICBjb21taXREZXRhaWxzPzogUmVjb3JkPHN0cmluZywgQ29tbWl0RGV0YWlscz47XG59XG5cbi8qKlxuICogUmVxdWVzdCBib2R5IGZvciBQT1NUIC9jYXJkcy86aWQvYnJhbmNoZXMuXG4gKlxuICogVXNlZCB0byBhZGQgYSBuZXcgYnJhbmNoIHRvIGEgY2FyZCdzIHdvcmtzcGFjZSB0cmFja2luZyBibG9jay5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBBZGRCcmFuY2hSZXF1ZXN0IHtcbiAgLyoqXG4gICAqIEJyYW5jaCBuYW1lIHRvIHRyYWNrLlxuICAgKiBNdXN0IGJlIGEgdmFsaWQgR2l0IHJlZiBuYW1lIChtYXkgY29udGFpbiBzbGFzaGVzKS5cbiAgICovXG4gIG5hbWU6IHN0cmluZztcblxuICAvKipcbiAgICogT3B0aW9uYWwgd29ya3RyZWUgcGF0aC5cbiAgICogU2hvdWxkIGJlIGFuIGFic29sdXRlIHBhdGggdG8gYSB2YWxpZCB3b3JrdHJlZSBkaXJlY3RvcnkuXG4gICAqL1xuICB3b3JrdHJlZT86IHN0cmluZztcblxuICAvKipcbiAgICogUGFyZW50IGJyYW5jaCBuYW1lIGZyb20gd2hpY2ggdGhpcyBicmFuY2ggd2FzIGNyZWF0ZWQgKGUuZy4sICdtYWluJywgJ21hc3RlcicpLlxuICAgKiBVc2VkIGFzIHRoZSBiYXNlIHJlZiBmb3IgY29tcGFyaXNvbnMuXG4gICAqL1xuICBwYXJlbnRCcmFuY2g6IHN0cmluZztcbn1cbiIsICIvKipcbiAqIFN1YmFnZW50U3RhcnQgaG9vayBpbXBsZW1lbnRhdGlvbi5cbiAqXG4gKiBHaXZlcyBzdWJhZ2VudHMgY2FyZCBhd2FyZW5lc3MgdmlhIGNvbnRleHQgaW5qZWN0aW9uIG9ubHkuXG4gKiBVc2VzIHRoZSBzaGFyZWQge0BsaW5rIGJ1aWxkQWRkaXRpb25hbENvbnRleHR9IGZvciBjb250ZXh0LlxuICpcbiAqIEBzdW1tYXJ5IFN1YmFnZW50U3RhcnQgaG9vayBcdTIwMTQgY2FyZCBjb250ZXh0IGluamVjdGlvbiBvbmx5XG4gKiBAc2VlIGh0dHBzOi8vY29kZS5jbGF1ZGUuY29tL2RvY3MvZW4vaG9va3Mjc3ViYWdlbnRzdGFydFxuICovXG5cbmltcG9ydCB7IGV4dHJhY3RBY3Rpb25JbnB1dCB9IGZyb20gJ0BjYXJkcy9zZGsvY29uZmlnJztcbmltcG9ydCB7IHN1YmFnZW50U3RhcnRIb29rLCBzdWJhZ2VudFN0YXJ0T3V0cHV0IH0gZnJvbSAnQGdvb2Rmb290L2NsYXVkZS1jb2RlLWhvb2tzJztcbmltcG9ydCB7IGJ1aWxkQWRkaXRpb25hbENvbnRleHQsIENhcmRSZXBvQWNjZXNzRXJyb3IgfSBmcm9tICcuL2xpYi9jb250ZXh0LmpzJztcblxuZXhwb3J0IGRlZmF1bHQgc3ViYWdlbnRTdGFydEhvb2soe30sIGFzeW5jIChfaW5wdXQsIHsgbG9nZ2VyIH0pID0+IHtcbiAgbGV0IGFjdGlvbklucHV0OiBSZXR1cm5UeXBlPHR5cGVvZiBleHRyYWN0QWN0aW9uSW5wdXQ+O1xuICB0cnkge1xuICAgIGFjdGlvbklucHV0ID0gZXh0cmFjdEFjdGlvbklucHV0KCk7XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgY29uc3QgbWVzc2FnZSA9IGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogU3RyaW5nKGVycm9yKTtcbiAgICBsb2dnZXIuZXJyb3IoJ05vdCBydW5uaW5nIGluc2lkZSBhbiBhY3Rpb24gc3VicHJvY2VzcycsIHsgZXJyb3I6IG1lc3NhZ2UgfSk7XG4gICAgcmV0dXJuIHN1YmFnZW50U3RhcnRPdXRwdXQoe1xuICAgICAgc3lzdGVtTWVzc2FnZTogJ1N1YmFnZW50U3RhcnQgaG9vazogbm90IHJ1bm5pbmcgaW5zaWRlIGFuIGFjdGlvbiBzdWJwcm9jZXNzLidcbiAgICB9KTtcbiAgfVxuXG4gIGxldCBzeXN0ZW1NZXNzYWdlOiBzdHJpbmc7XG4gIHRyeSB7XG4gICAgc3lzdGVtTWVzc2FnZSA9IGJ1aWxkQWRkaXRpb25hbENvbnRleHQoYWN0aW9uSW5wdXQpO1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGlmIChlcnJvciBpbnN0YW5jZW9mIENhcmRSZXBvQWNjZXNzRXJyb3IpIHtcbiAgICAgIGxvZ2dlci5lcnJvcignQ2FyZCByZXBvIGluYWNjZXNzaWJsZScsIHsgcmVwb1BhdGg6IGVycm9yLnJlcG9QYXRoLCBlcnJvcjogZXJyb3IubWVzc2FnZSB9KTtcbiAgICAgIHJldHVybiBzdWJhZ2VudFN0YXJ0T3V0cHV0KHtcbiAgICAgICAgY29udGludWU6IGZhbHNlLFxuICAgICAgICAuLi5lcnJvci50b0hvb2tGYWlsdXJlKCdzdWJhZ2VudCcpXG4gICAgICB9KTtcbiAgICB9XG4gICAgdGhyb3cgZXJyb3I7XG4gIH1cblxuICByZXR1cm4gc3ViYWdlbnRTdGFydE91dHB1dCh7XG4gICAgc3lzdGVtTWVzc2FnZSxcbiAgICBob29rU3BlY2lmaWNPdXRwdXQ6IHtcbiAgICAgIGFkZGl0aW9uYWxDb250ZXh0OiBzeXN0ZW1NZXNzYWdlXG4gICAgfVxuICB9KTtcbn0pO1xuIiwgInByb2Nlc3MuZW52WydDTEFVREVfQ09ERV9IT09LU19DTElfTE9HX0ZJTEUnXSA9IFwiL3dvcmtzcGFjZS8ud29ya3RyZWVzL3JlcGxhY2Utbm9kZS1zcWxpdGUzLXdhc20td2l0aC1ub2RlLXNxbGl0ZS8uY2FyZHMvbG9ncy9jbGF1ZGUtY29kZS1jYXJkcy1ydW50aW1lLWhvb2tzLmxvZ1wiO1xuXG5pbXBvcnQgaG9vayBmcm9tICcuL3N1YmFnZW50LXN0YXJ0LnRzJztcbmltcG9ydCB7IGV4ZWN1dGUgfSBmcm9tICcuLi8uLi8uLi8uLi9ub2RlX21vZHVsZXMvQGdvb2Rmb290L2NsYXVkZS1jb2RlLWhvb2tzL2Rpc3QvcnVudGltZS5qcyc7XG5cbmV4ZWN1dGUoaG9vayk7XG4iXSwKICAibWFwcGluZ3MiOiAiOzs7Ozs7OztBQWdCQSxTQUFTLG9CQUFvQjtBQWN0QixJQUFNLGlCQUFpQjtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFLNUIsU0FBUztBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFNVCxhQUFhO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQU1iLGFBQWE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFPYixnQkFBZ0I7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBTWhCLGNBQWM7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBTWQsa0JBQWtCO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBT2xCLGNBQWM7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBTWQsV0FBVztBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFNWCxjQUFjO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQU1kLFdBQVc7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBTVgsV0FBVztBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFNWCxXQUFXO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQU1YLFFBQVE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBTVIsY0FBYztBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFZZCxhQUFhO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBVWIsTUFBTTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFNTixhQUFhO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQU1iLGlDQUFpQztBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFNakMsYUFBYTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQU9iLGdCQUFnQjtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBUWhCLFdBQVc7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBTVgsZ0JBQWdCO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQU1oQixnQkFBZ0I7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQVFoQixhQUFhO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQVNiLGVBQWU7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFPZixrQkFBa0I7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBWWxCLGtCQUFrQjtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBV2xCLGdCQUFnQjtBQUNsQjtBQWtCTyxTQUFTLFlBQW9CO0FBQ2xDLFFBQU0sUUFBUSxRQUFRLElBQUksZUFBZSxPQUFPO0FBQ2hELE1BQUksVUFBVSxVQUFhLFVBQVUsSUFBSTtBQUN2QyxVQUFNLElBQUksTUFBTSwwQ0FBMEMsZUFBZSxPQUFPLEVBQUU7QUFBQSxFQUNwRjtBQUNBLFNBQU87QUFDVDtBQWNPLFNBQVMsaUJBQXlCO0FBQ3ZDLFFBQU0sUUFBUSxRQUFRLElBQUksZUFBZSxXQUFXO0FBQ3BELE1BQUksVUFBVSxVQUFhLFVBQVUsSUFBSTtBQUN2QyxVQUFNLElBQUksTUFBTSwwQ0FBMEMsZUFBZSxXQUFXLEVBQUU7QUFBQSxFQUN4RjtBQUNBLFNBQU87QUFDVDtBQWVPLFNBQVMsZ0JBQXdCO0FBQ3RDLFFBQU0sUUFBUSxRQUFRLElBQUksZUFBZSxXQUFXO0FBQ3BELE1BQUksVUFBVSxVQUFhLFVBQVUsSUFBSTtBQUN2QyxVQUFNLElBQUksTUFBTSwwQ0FBMEMsZUFBZSxXQUFXLEVBQUU7QUFBQSxFQUN4RjtBQUNBLFNBQU87QUFDVDtBQWdCTyxTQUFTLG1CQUFpRDtBQUMvRCxRQUFNLFFBQVEsUUFBUSxJQUFJLGVBQWUsY0FBYztBQUN2RCxNQUFJLFVBQVUsVUFBYSxVQUFVLElBQUk7QUFDdkMsVUFBTSxJQUFJLE1BQU0sMENBQTBDLGVBQWUsY0FBYyxFQUFFO0FBQUEsRUFDM0Y7QUFDQSxNQUFJLFVBQVUsaUJBQWlCLFVBQVUsY0FBYztBQUNyRCxVQUFNLElBQUksTUFBTSxXQUFXLGVBQWUsY0FBYyxrREFBa0QsS0FBSyxHQUFHO0FBQUEsRUFDcEg7QUFDQSxTQUFPO0FBQ1Q7QUFlTyxTQUFTLGdCQUF3QjtBQUN0QyxRQUFNLFFBQVEsUUFBUSxJQUFJLGVBQWUsWUFBWTtBQUNyRCxNQUFJLFVBQVUsVUFBYSxVQUFVLElBQUk7QUFDdkMsVUFBTSxJQUFJLE1BQU0sMENBQTBDLGVBQWUsWUFBWSxFQUFFO0FBQUEsRUFDekY7QUFDQSxTQUFPO0FBQ1Q7QUFpQk8sU0FBUyxvQkFBNEI7QUFDMUMsUUFBTSxRQUFRLFFBQVEsSUFBSSxlQUFlLGdCQUFnQjtBQUN6RCxNQUFJLFVBQVUsVUFBYSxVQUFVLElBQUk7QUFDdkMsVUFBTSxJQUFJLE1BQU0sMENBQTBDLGVBQWUsZ0JBQWdCLEVBQUU7QUFBQSxFQUM3RjtBQUNBLFNBQU87QUFDVDtBQWlCTyxTQUFTLGlCQUFxQztBQUNuRCxRQUFNLFFBQVEsUUFBUSxJQUFJLGVBQWUsWUFBWTtBQUNyRCxNQUFJLFVBQVUsVUFBYSxVQUFVLElBQUk7QUFDdkMsV0FBTztBQUFBLEVBQ1Q7QUFDQSxTQUFPO0FBQ1Q7QUErTE8sU0FBUyxpQ0FBcUQ7QUFDbkUsUUFBTSxRQUFRLFFBQVEsSUFBSSxlQUFlLCtCQUErQjtBQUN4RSxNQUFJLFVBQVUsVUFBYSxVQUFVLElBQUk7QUFDdkMsV0FBTztBQUFBLEVBQ1Q7QUFDQSxTQUFPO0FBQ1Q7QUFRTyxTQUFTLGdCQUF3QjtBQUN0QyxRQUFNLFFBQVEsUUFBUSxJQUFJLGVBQWUsV0FBVztBQUNwRCxNQUFJLFVBQVUsVUFBYSxVQUFVLElBQUk7QUFDdkMsVUFBTSxJQUFJLE1BQU0sMENBQTBDLGVBQWUsV0FBVyxFQUFFO0FBQUEsRUFDeEY7QUFDQSxTQUFPO0FBQ1Q7QUE0Qk8sU0FBUyxjQUFzQjtBQUNwQyxRQUFNLFFBQVEsUUFBUSxJQUFJLGVBQWUsU0FBUztBQUNsRCxNQUFJLFVBQVUsVUFBYSxVQUFVLElBQUk7QUFDdkMsVUFBTSxJQUFJLE1BQU0sMENBQTBDLGVBQWUsU0FBUyxFQUFFO0FBQUEsRUFDdEY7QUFDQSxTQUFPO0FBQ1Q7QUFRTyxTQUFTLGtCQUEwQjtBQUN4QyxRQUFNLFFBQVEsUUFBUSxJQUFJLGVBQWUsY0FBYztBQUN2RCxNQUFJLFVBQVUsVUFBYSxVQUFVLElBQUk7QUFDdkMsVUFBTSxJQUFJLE1BQU0sMENBQTBDLGVBQWUsY0FBYyxFQUFFO0FBQUEsRUFDM0Y7QUFDQSxTQUFPO0FBQ1Q7QUFZTyxTQUFTLG1CQUEyQjtBQUN6QyxRQUFNLFFBQVEsUUFBUSxJQUFJLGVBQWUsY0FBYztBQUN2RCxNQUFJLFVBQVUsVUFBYSxVQUFVLElBQUk7QUFDdkMsVUFBTSxJQUFJLE1BQU0sMENBQTBDLGVBQWUsY0FBYyxFQUFFO0FBQUEsRUFDM0Y7QUFDQSxTQUFPO0FBQ1Q7QUFXTyxTQUFTLDhCQUFtRDtBQUNqRSxRQUFNLFdBQVcsK0JBQStCO0FBQ2hELE1BQUksYUFBYSxRQUFXO0FBQzFCLFdBQU87QUFBQSxFQUNUO0FBQ0EsUUFBTSxVQUFVLGFBQWEsVUFBVSxPQUFPO0FBQzlDLFNBQU8sS0FBSyxNQUFNLE9BQU87QUFDM0I7QUFxQk8sU0FBUyxxQkFBa0M7QUFDaEQsU0FBTztBQUFBLElBQ0wsUUFBUSxVQUFVO0FBQUEsSUFDbEIsWUFBWSxjQUFjO0FBQUEsSUFDMUIsYUFBYSxlQUFlO0FBQUEsSUFDNUIsZUFBZSxpQkFBaUI7QUFBQSxJQUNoQyxZQUFZLGNBQWM7QUFBQSxJQUMxQixnQkFBZ0Isa0JBQWtCO0FBQUEsSUFDbEMsYUFBYSxlQUFlO0FBQUEsSUFDNUIseUJBQXlCLDRCQUE0QjtBQUFBLElBQ3JELFVBQVUsWUFBWTtBQUFBLElBQ3RCLGNBQWMsZ0JBQWdCO0FBQUEsSUFDOUIsWUFBWSxjQUFjO0FBQUEsSUFDMUIsZUFBZSxpQkFBaUI7QUFBQSxFQUNsQztBQUNGOzs7QUM1cUJBLFlBQVksUUFBUTtBQU1iLElBQU0sa0JBQWtCO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQUszQixhQUFhO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBTWIsVUFBVTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFLVixRQUFRO0FBQ1o7QUFrQ08sU0FBUyxpQkFBaUI7QUFDN0IsU0FBTyxRQUFRLElBQUksZ0JBQWdCLFFBQVE7QUFDL0M7QUE4Q08sU0FBUyxjQUFjLE1BQU0sT0FBTztBQUN2QyxRQUFNLFVBQVUsZUFBZTtBQUMvQixNQUFJLFlBQVksUUFBVztBQUN2QixVQUFNLElBQUksTUFBTSx3R0FBNkc7QUFBQSxFQUNqSTtBQUVBLFFBQU0sZUFBZSxpQkFBaUIsS0FBSztBQUUzQyxRQUFNLGtCQUFrQixVQUFVLElBQUksSUFBSSxZQUFZO0FBQUE7QUFDdEQsRUFBRyxrQkFBZSxTQUFTLGlCQUFpQixPQUFPO0FBQ3ZEO0FBaUJPLFNBQVMsZUFBZSxNQUFNO0FBQ2pDLGFBQVcsQ0FBQyxNQUFNLEtBQUssS0FBSyxPQUFPLFFBQVEsSUFBSSxHQUFHO0FBQzlDLGtCQUFjLE1BQU0sS0FBSztBQUFBLEVBQzdCO0FBQ0o7QUFVQSxTQUFTLGlCQUFpQixPQUFPO0FBRzdCLFFBQU0sVUFBVSxNQUFNLFFBQVEsTUFBTSxPQUFPO0FBQzNDLFNBQU8sSUFBSSxPQUFPO0FBQ3RCOzs7QUNwSkEsU0FBUyxtQkFBbUIsZUFBZSxRQUFRLFNBQVM7QUFDeEQsUUFBTSxTQUFTLE9BQU8sT0FBTyxZQUFZO0FBR3JDLFdBQU8sTUFBTSxRQUFRLE9BQU8sT0FBTztBQUFBLEVBQ3ZDO0FBRUEsU0FBTyxnQkFBZ0I7QUFDdkIsU0FBTyxVQUFVLE9BQU87QUFDeEIsU0FBTyxVQUFVLE9BQU87QUFDeEIsU0FBTztBQUNYO0FBNlBPLFNBQVMsa0JBQWtCLFFBQVEsU0FBUztBQUMvQyxTQUFPLG1CQUFtQixpQkFBaUIsUUFBUSxPQUFPO0FBQzlEOzs7QUMxUkEsU0FBUyxXQUFXLFlBQVksV0FBVyxVQUFVLGlCQUFpQjtBQUN0RSxTQUFTLGVBQWU7QUFJakIsSUFBTSxhQUFhLENBQUMsU0FBUyxRQUFRLFFBQVEsT0FBTztBQXNDcEQsSUFBTSxTQUFOLE1BQWE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQUloQixXQUFXLG9CQUFJLElBQUk7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBS25CLFlBQVk7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQUlaLGNBQWM7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQUlkLGtCQUFrQjtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBSWxCO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFJQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBZ0JBLFlBQVksU0FBUyxDQUFDLEdBQUc7QUFFckIsZUFBVyxTQUFTLFlBQVk7QUFDNUIsV0FBSyxTQUFTLElBQUksT0FBTyxvQkFBSSxJQUFJLENBQUM7QUFBQSxJQUN0QztBQUVBLFNBQUssY0FBYyxPQUFPLGVBQWUsUUFBUSxJQUFJLDhCQUE4QjtBQUFBLEVBQ3ZGO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFhQSxNQUFNLFNBQVMsU0FBUztBQUNwQixTQUFLLEtBQUssU0FBUyxTQUFTLE9BQU87QUFBQSxFQUN2QztBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBYUEsS0FBSyxTQUFTLFNBQVM7QUFDbkIsU0FBSyxLQUFLLFFBQVEsU0FBUyxPQUFPO0FBQUEsRUFDdEM7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQWFBLEtBQUssU0FBUyxTQUFTO0FBQ25CLFNBQUssS0FBSyxRQUFRLFNBQVMsT0FBTztBQUFBLEVBQ3RDO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFhQSxNQUFNLFNBQVMsU0FBUztBQUNwQixTQUFLLEtBQUssU0FBUyxTQUFTLE9BQU87QUFBQSxFQUN2QztBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQXFCQSxTQUFTLE9BQU8sU0FBUyxTQUFTO0FBQzlCLFVBQU0sWUFBWSxLQUFLLGlCQUFpQixLQUFLO0FBQzdDLFVBQU0sUUFBUTtBQUFBLE1BQ1YsWUFBVyxvQkFBSSxLQUFLLEdBQUUsWUFBWTtBQUFBLE1BQ2xDLE9BQU87QUFBQSxNQUNQLFVBQVUsS0FBSztBQUFBLE1BQ2Y7QUFBQSxNQUNBLE9BQU8sS0FBSztBQUFBLE1BQ1osT0FBTztBQUFBLE1BQ1A7QUFBQSxJQUNKO0FBQ0EsU0FBSyxhQUFhLEtBQUs7QUFBQSxFQUMzQjtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBa0NBLEdBQUcsT0FBTyxTQUFTO0FBQ2YsVUFBTSxnQkFBZ0IsS0FBSyxTQUFTLElBQUksS0FBSztBQUM3QyxRQUFJLGVBQWU7QUFDZixvQkFBYyxJQUFJLE9BQU87QUFBQSxJQUM3QjtBQUNBLFdBQU8sTUFBTTtBQUNULHFCQUFlLE9BQU8sT0FBTztBQUFBLElBQ2pDO0FBQUEsRUFDSjtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBVUEsV0FBVyxVQUFVLE9BQU87QUFDeEIsU0FBSyxrQkFBa0I7QUFDdkIsU0FBSyxlQUFlO0FBQUEsRUFDeEI7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQU9BLGVBQWU7QUFDWCxTQUFLLGtCQUFrQjtBQUN2QixTQUFLLGVBQWU7QUFBQSxFQUN4QjtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBZ0JBLFdBQVcsVUFBVTtBQUVqQixRQUFJLEtBQUssY0FBYyxNQUFNO0FBQ3pCLFVBQUk7QUFDQSxrQkFBVSxLQUFLLFNBQVM7QUFBQSxNQUM1QixRQUNNO0FBQUEsTUFFTjtBQUNBLFdBQUssWUFBWTtBQUFBLElBQ3JCO0FBQ0EsU0FBSyxjQUFjO0FBQ25CLFNBQUssa0JBQWtCO0FBQUEsRUFDM0I7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFZQSxRQUFRO0FBQ0osUUFBSSxLQUFLLGNBQWMsTUFBTTtBQUN6QixVQUFJO0FBQ0Esa0JBQVUsS0FBSyxTQUFTO0FBQUEsTUFDNUIsUUFDTTtBQUFBLE1BRU47QUFDQSxXQUFLLFlBQVk7QUFBQSxJQUNyQjtBQUNBLFNBQUssa0JBQWtCO0FBQUEsRUFDM0I7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQU9BLGtCQUFrQjtBQUNkLGVBQVcsWUFBWSxLQUFLLFNBQVMsT0FBTyxHQUFHO0FBQzNDLFVBQUksU0FBUyxPQUFPO0FBQ2hCLGVBQU87QUFBQSxJQUNmO0FBQ0EsV0FBTyxLQUFLLGdCQUFnQjtBQUFBLEVBQ2hDO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFVQSxLQUFLLE9BQU8sU0FBUyxTQUFTO0FBQzFCLFVBQU0sUUFBUTtBQUFBLE1BQ1YsWUFBVyxvQkFBSSxLQUFLLEdBQUUsWUFBWTtBQUFBLE1BQ2xDO0FBQUEsTUFDQSxVQUFVLEtBQUs7QUFBQSxNQUNmO0FBQUEsTUFDQSxPQUFPLEtBQUs7QUFBQSxNQUNaO0FBQUEsSUFDSjtBQUNBLFNBQUssYUFBYSxLQUFLO0FBQUEsRUFDM0I7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBS0EsYUFBYSxPQUFPO0FBRWhCLFVBQU0sZ0JBQWdCLEtBQUssU0FBUyxJQUFJLE1BQU0sS0FBSztBQUNuRCxRQUFJLGVBQWU7QUFDZixpQkFBVyxXQUFXLGVBQWU7QUFDakMsWUFBSTtBQUNBLGtCQUFRLEtBQUs7QUFBQSxRQUNqQixRQUNNO0FBQUEsUUFFTjtBQUFBLE1BQ0o7QUFBQSxJQUNKO0FBRUEsU0FBSyxZQUFZLEtBQUs7QUFBQSxFQUMxQjtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFLQSxZQUFZLE9BQU87QUFDZixRQUFJLENBQUMsS0FBSztBQUNOO0FBRUosUUFBSSxDQUFDLEtBQUssaUJBQWlCO0FBQ3ZCLFdBQUssZUFBZTtBQUFBLElBQ3hCO0FBQ0EsUUFBSSxLQUFLLGNBQWM7QUFDbkI7QUFDSixRQUFJO0FBQ0EsWUFBTSxPQUFPLEdBQUcsS0FBSyxVQUFVLEtBQUssQ0FBQztBQUFBO0FBQ3JDLGdCQUFVLEtBQUssV0FBVyxJQUFJO0FBQUEsSUFDbEMsUUFDTTtBQUFBLElBSU47QUFBQSxFQUNKO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFJQSxpQkFBaUI7QUFDYixTQUFLLGtCQUFrQjtBQUN2QixRQUFJLENBQUMsS0FBSztBQUNOO0FBQ0osUUFBSTtBQUVBLFlBQU0sTUFBTSxRQUFRLEtBQUssV0FBVztBQUNwQyxVQUFJLENBQUMsV0FBVyxHQUFHLEdBQUc7QUFDbEIsa0JBQVUsS0FBSyxFQUFFLFdBQVcsS0FBSyxDQUFDO0FBQUEsTUFDdEM7QUFFQSxXQUFLLFlBQVksU0FBUyxLQUFLLGFBQWEsR0FBRztBQUFBLElBQ25ELFFBQ007QUFFRixXQUFLLFlBQVk7QUFBQSxJQUNyQjtBQUFBLEVBQ0o7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFNQSxpQkFBaUIsT0FBTztBQUNwQixRQUFJLGlCQUFpQixPQUFPO0FBQ3hCLFlBQU0sT0FBTztBQUFBLFFBQ1QsTUFBTSxNQUFNO0FBQUEsUUFDWixTQUFTLE1BQU07QUFBQSxRQUNmLE9BQU8sTUFBTTtBQUFBLE1BQ2pCO0FBRUEsVUFBSSxNQUFNLFVBQVUsUUFBVztBQUMzQixhQUFLLFFBQVEsS0FBSyxpQkFBaUIsTUFBTSxLQUFLO0FBQUEsTUFDbEQ7QUFDQSxhQUFPO0FBQUEsSUFDWDtBQUVBLFdBQU87QUFBQSxNQUNILE1BQU07QUFBQSxNQUNOLFNBQVMsT0FBTyxLQUFLO0FBQUEsSUFDekI7QUFBQSxFQUNKO0FBQ0o7QUEwRE8sSUFBTSxTQUFTLElBQUksT0FBTzs7O0FDamUxQixJQUFNLGFBQWE7QUFBQTtBQUFBLEVBRXRCLFNBQVM7QUFBQTtBQUFBLEVBRVQsT0FBTztBQUFBO0FBQUEsRUFFUCxPQUFPO0FBQ1g7QUFVQSxTQUFTLGdDQUFnQyxVQUFVO0FBQy9DLFNBQU8sQ0FBQyxVQUFVLENBQUMsTUFBTTtBQUNyQixVQUFNLEVBQUUsb0JBQW9CLEdBQUcsS0FBSyxJQUFJO0FBQ3hDLFVBQU0sU0FBUyx1QkFBdUIsU0FDaEMsRUFBRSxHQUFHLE1BQU0sb0JBQW9CLEVBQUUsZUFBZSxVQUFVLEdBQUcsbUJBQW1CLEVBQUUsSUFDbEY7QUFDTixXQUFPLEVBQUUsT0FBTyxVQUFVLE9BQU87QUFBQSxFQUNyQztBQUNKO0FBd0tPLElBQU0sc0JBQXNDLGdEQUFnQyxlQUFlOzs7QUN4TGxHLGVBQWUsWUFBWTtBQUN2QixTQUFPLElBQUksUUFBUSxDQUFDLFNBQVMsV0FBVztBQUNwQyxVQUFNLFNBQVMsQ0FBQztBQUVoQixZQUFRLE1BQU0sWUFBWSxPQUFPO0FBQ2pDLFlBQVEsTUFBTSxHQUFHLFFBQVEsQ0FBQyxVQUFVO0FBQ2hDLGFBQU8sS0FBSyxLQUFLO0FBQUEsSUFDckIsQ0FBQztBQUNELFlBQVEsTUFBTSxHQUFHLE9BQU8sTUFBTTtBQUMxQixjQUFRLE9BQU8sS0FBSyxFQUFFLENBQUM7QUFBQSxJQUMzQixDQUFDO0FBQ0QsWUFBUSxNQUFNLEdBQUcsU0FBUyxDQUFDLFVBQVU7QUFDakMsYUFBTyxLQUFLO0FBQUEsSUFDaEIsQ0FBQztBQUFBLEVBQ0wsQ0FBQztBQUNMO0FBT0EsU0FBUyxnQkFBZ0IsY0FBYztBQUVuQyxRQUFNLFdBQVcsS0FBSyxNQUFNLFlBQVk7QUFDeEMsU0FBTztBQUNYO0FBUUEsU0FBUyxZQUFZLFFBQVE7QUFFekIsVUFBUSxPQUFPLE1BQU0sS0FBSyxVQUFVLE1BQU0sQ0FBQztBQUMvQztBQVNBLFNBQVMsMkJBQTJCLE9BQU87QUFDdkMsU0FBTyxNQUFNLHVCQUF1QixpQkFBaUIsUUFBUSxNQUFNLFVBQVUsT0FBTyxLQUFLLENBQUMsRUFBRTtBQUM1RixTQUFPLEVBQUUsUUFBUSxDQUFDLEVBQUU7QUFDeEI7QUFVQSxTQUFTLG1CQUFtQixPQUFPO0FBRS9CLE1BQUksaUJBQWlCLE9BQU87QUFDeEIsWUFBUSxPQUFPLE1BQU0sR0FBRyxNQUFNLFNBQVMsTUFBTSxPQUFPO0FBQUEsQ0FBSTtBQUFBLEVBQzVELE9BQ0s7QUFDRCxZQUFRLE9BQU8sTUFBTSxHQUFHLE9BQU8sS0FBSyxDQUFDO0FBQUEsQ0FBSTtBQUFBLEVBQzdDO0FBRUEsU0FBTyxNQUFNLHVCQUF1QixpQkFBaUIsUUFBUSxNQUFNLFVBQVUsT0FBTyxLQUFLLENBQUMsRUFBRTtBQUU1RixTQUFPLGFBQWE7QUFDcEIsU0FBTyxNQUFNO0FBRWIsVUFBUSxLQUFLLFdBQVcsS0FBSztBQUNqQztBQW1CTyxTQUFTLG9CQUFvQixnQkFBZ0I7QUFDaEQsUUFBTSxFQUFFLFFBQVEsT0FBTyxJQUFJO0FBQzNCLFNBQU8sV0FBVyxTQUFZLEVBQUUsUUFBUSxPQUFPLElBQUksRUFBRSxPQUFPO0FBQ2hFO0FBa0NBLGVBQXNCLFFBQVEsUUFBUTtBQUNsQyxNQUFJO0FBQ0osTUFBSTtBQUlBLFVBQU0sYUFBYSxRQUFRLElBQUk7QUFDL0IsVUFBTSxhQUFhLFFBQVEsSUFBSTtBQUMvQixRQUFJLGVBQWUsVUFBYSxlQUFlLFVBQWEsZUFBZSxZQUFZO0FBRW5GLGNBQVEsT0FBTyxNQUFNLCtDQUErQyxVQUFVLG9DQUFvQyxVQUFVO0FBQUEsQ0FDdEU7QUFDdEQsY0FBUSxLQUFLLFdBQVcsS0FBSztBQUFBLElBQ2pDO0FBRUEsUUFBSSxlQUFlLFFBQVc7QUFDMUIsYUFBTyxXQUFXLFVBQVU7QUFBQSxJQUNoQztBQUVBLFFBQUk7QUFDSixRQUFJO0FBQ0EscUJBQWUsTUFBTSxVQUFVO0FBQUEsSUFDbkMsU0FDTyxPQUFPO0FBQ1YsYUFBTyxTQUFTLE9BQU8sc0JBQXNCO0FBQzdDLGVBQVMsMkJBQTJCLEtBQUs7QUFDekM7QUFBQSxJQUNKO0FBRUEsUUFBSTtBQUNKLFFBQUk7QUFDQSxjQUFRLGdCQUFnQixZQUFZO0FBQUEsSUFDeEMsU0FDTyxPQUFPO0FBQ1YsYUFBTyxTQUFTLE9BQU8sNEJBQTRCO0FBQ25ELGVBQVMsMkJBQTJCLEtBQUs7QUFDekM7QUFBQSxJQUNKO0FBRUEsVUFBTSxnQkFBZ0IsT0FBTztBQUM3QixXQUFPLFdBQVcsZUFBZSxLQUFLO0FBRXRDLFVBQU0sVUFBVSxrQkFBa0IsaUJBQWlCLEVBQUUsUUFBUSxlQUFlLGVBQWUsSUFBSSxFQUFFLE9BQU87QUFFeEcsUUFBSTtBQUNBLFlBQU0saUJBQWlCLE1BQU0sT0FBTyxPQUFPLE9BQU87QUFDbEQsZUFBUyxvQkFBb0IsY0FBYztBQUFBLElBQy9DLFNBQ08sT0FBTztBQUdWLHlCQUFtQixLQUFLO0FBQUEsSUFDNUI7QUFBQSxFQUNKLFVBQ0E7QUFFSSxRQUFJLFdBQVcsUUFBVztBQUN0QixrQkFBWSxPQUFPLE1BQU07QUFBQSxJQUM3QjtBQUVBLFdBQU8sYUFBYTtBQUNwQixXQUFPLE1BQU07QUFJYixRQUFJLFFBQVEsV0FBVyxRQUFXO0FBQzlCLGNBQVEsT0FBTyxNQUFNLE9BQU8sTUFBTTtBQUNsQyxjQUFRLEtBQUssV0FBVyxLQUFLO0FBQUEsSUFDakM7QUFFQSxZQUFRLEtBQUssV0FBVyxPQUFPO0FBQUEsRUFDbkM7QUFDSjs7O0FDOU5BLFNBQVMsb0JBQW9CO0FBQzdCLFNBQVMsYUFBYSxnQkFBQUEsZUFBYyxnQkFBZ0I7QUFDcEQsU0FBUyxZQUFZOzs7QUNlZCxJQUFNLDBCQUEwQjtBQUNoQyxJQUFNLHlCQUF5Qjs7O0FETC9CLElBQU0sc0JBQU4sY0FBa0MsTUFBTTtBQUFBLEVBRzdDLFlBQ2tCLFVBQ2hCLE9BQ0E7QUFDQSxVQUFNLFNBQVMsaUJBQWlCLFFBQVEsTUFBTSxVQUFVLE9BQU8sS0FBSztBQUNwRSxVQUFNLGtDQUFrQyxRQUFRLEtBQUssTUFBTSxFQUFFO0FBSjdDO0FBS2hCLFNBQUssUUFBUTtBQUFBLEVBQ2Y7QUFBQSxFQVRrQixPQUFPO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFpQnpCLGNBQWMsT0FBOEQ7QUFDMUUsV0FBTztBQUFBLE1BQ0wsZUFBZTtBQUFBLFFBQ2IsMkJBQTJCLEtBQUssUUFBUTtBQUFBLFFBQ3hDO0FBQUEsUUFDQSxVQUFVLEtBQUssT0FBTztBQUFBLFFBQ3RCO0FBQUEsUUFDQSxRQUFRLEtBQUs7QUFBQSxRQUNiLHNEQUFzRCxLQUFLLFFBQVE7QUFBQSxRQUNuRTtBQUFBLFFBQ0E7QUFBQSxNQUNGLEVBQUUsS0FBSyxJQUFJO0FBQUEsTUFDWCxZQUFZLG1DQUFtQyxLQUFLLFFBQVEsS0FBSyxLQUFLLE9BQU87QUFBQSxJQUMvRTtBQUFBLEVBQ0Y7QUFDRjtBQThCQSxTQUFTLGFBQWEsVUFBbUM7QUFDdkQsTUFBSTtBQUNGLFVBQU0sTUFBTUMsY0FBYSxLQUFLLFVBQVUsZ0JBQWdCLEdBQUcsT0FBTztBQUNsRSxVQUFNLFNBQVMsS0FBSyxNQUFNLEdBQUc7QUFDN0IsVUFBTSxRQUFRLE9BQU8sT0FBTztBQUM1QixXQUFPO0FBQUEsTUFDTCxJQUFJLE9BQU8sT0FBTyxJQUFJLEtBQUssRUFBRTtBQUFBLE1BQzdCLE9BQU8sT0FBTyxPQUFPLE9BQU8sS0FBSyxFQUFFO0FBQUEsTUFDbkMsUUFBUSxPQUFPLE9BQU8sUUFBUSxLQUFLLEVBQUU7QUFBQSxNQUNyQyxPQUFPO0FBQUEsUUFDTCxjQUFjLFFBQVEsY0FBYyxNQUFNO0FBQUEsUUFDMUMsY0FBYyxRQUFRLGNBQWMsTUFBTTtBQUFBLFFBQzFDLGdCQUFnQixRQUFRLGdCQUFnQixNQUFNO0FBQUEsUUFDOUMsZ0JBQWdCLFFBQVEsZ0JBQWdCLE1BQU07QUFBQSxNQUNoRDtBQUFBLElBQ0Y7QUFBQSxFQUNGLFFBQVE7QUFDTixXQUFPO0FBQUEsRUFDVDtBQUNGO0FBVU8sU0FBUyxlQUFlLGFBQWtDO0FBQy9ELFFBQU0sT0FBTyxhQUFhLFlBQVksWUFBWTtBQUVsRCxRQUFNLEtBQUssTUFBTSxNQUFNLFlBQVk7QUFDbkMsUUFBTSxRQUFRLE1BQU0sU0FBUztBQUM3QixRQUFNLFNBQVMsTUFBTSxVQUFVO0FBRS9CLFFBQU0sWUFBWSxPQUNkLHVCQUF1QixLQUFLLE1BQU0sWUFBWSxpQkFBaUIsS0FBSyxNQUFNLFlBQVksbUJBQW1CLEtBQUssTUFBTSxjQUFjLG1CQUFtQixLQUFLLE1BQU0sY0FBYyxLQUM5SztBQUVKLFFBQU0sa0JBQWtCLFFBQVEsSUFBSSxlQUFlLGdCQUFnQjtBQUNuRSxRQUFNLGFBQWEsUUFBUSxJQUFJLGVBQWUsV0FBVztBQUV6RCxRQUFNLGdCQUFnQixRQUFRLElBQUksZUFBZSxjQUFjO0FBQy9ELFFBQU0sV0FBVyxDQUFDLG9CQUFvQixZQUFZLFlBQVksRUFBRTtBQUNoRSxNQUFJLGNBQWUsVUFBUyxLQUFLLG9CQUFvQixhQUFhLEVBQUU7QUFDcEUsTUFBSSxXQUFZLFVBQVMsS0FBSyxpQkFBaUIsVUFBVSxFQUFFO0FBQzNELE1BQUksZ0JBQWlCLFVBQVMsS0FBSyxzQkFBc0IsZUFBZSxFQUFFO0FBRTFFLFFBQU0sWUFBc0IsQ0FBQztBQUM3QixNQUFJLE1BQU8sV0FBVSxLQUFLLFVBQVUsS0FBSyxFQUFFO0FBQzNDLFlBQVUsS0FBSyxFQUFFO0FBQ2pCLE1BQUksVUFBVyxXQUFVLEtBQUssU0FBUztBQUN2QyxZQUFVLEtBQUssTUFBTTtBQUNyQixZQUFVLEtBQUssR0FBRyxRQUFRO0FBRTFCLFFBQU0sUUFBUSxDQUFDLE9BQU8sRUFBRSxLQUFLLFdBQVcsTUFBTSxLQUFLLFNBQVMsWUFBWSxhQUFhLEdBQUc7QUFFeEYsU0FBTyxTQUFTLE1BQU0sS0FBSyxHQUFHLENBQUM7QUFBQSxFQUFNLFVBQVUsS0FBSyxJQUFJLENBQUM7QUFBQTtBQUMzRDtBQVlBLFNBQVMsZ0JBQWdCLFNBQXlCO0FBQ2hELFFBQU0sSUFBSSxJQUFJLEtBQUssT0FBTztBQUMxQixRQUFNLE1BQU0sRUFBRSxZQUFZO0FBRTFCLFNBQU8sR0FBRyxJQUFJLE1BQU0sR0FBRyxFQUFFLENBQUM7QUFDNUI7QUFRQSxTQUFTLFNBQVMsU0FBeUQ7QUFDekUsTUFBSTtBQUNGLFVBQU0sVUFBVSxZQUFZLFNBQVMsRUFBRSxlQUFlLEtBQUssQ0FBQztBQUM1RCxRQUFJLFFBQVE7QUFDWixRQUFJLFNBQVM7QUFDYixlQUFXLFNBQVMsU0FBUztBQUMzQixVQUFJLE1BQU0sT0FBTyxHQUFHO0FBQ2xCO0FBQ0EsWUFBSTtBQUNGLGdCQUFNLEtBQUssU0FBUyxLQUFLLFNBQVMsTUFBTSxJQUFJLENBQUMsRUFBRTtBQUMvQyxjQUFJLEtBQUssT0FBUSxVQUFTO0FBQUEsUUFDNUIsUUFBUTtBQUFBLFFBRVI7QUFBQSxNQUNGO0FBQUEsSUFDRjtBQUNBLFdBQU8sQ0FBQyxPQUFPLE1BQU07QUFBQSxFQUN2QixRQUFRO0FBQ04sV0FBTyxDQUFDLEdBQUcsQ0FBQztBQUFBLEVBQ2Q7QUFDRjtBQVVPLFNBQVMsbUJBQW1CLFVBQTBCO0FBQzNELE1BQUk7QUFDSixNQUFJO0FBQ0YsY0FBVSxZQUFZLFVBQVUsRUFBRSxlQUFlLEtBQUssQ0FBQyxFQUFFLElBQUksQ0FBQyxPQUFPO0FBQUEsTUFDbkUsTUFBTSxFQUFFLEtBQUssU0FBUztBQUFBLE1BQ3RCLE9BQU8sRUFBRSxZQUFZO0FBQUEsSUFDdkIsRUFBRTtBQUFBLEVBQ0osU0FBUyxPQUFPO0FBQ2QsVUFBTSxJQUFJLG9CQUFvQixVQUFVLEtBQUs7QUFBQSxFQUMvQztBQUVBLFFBQU0sUUFBa0IsQ0FBQztBQUV6QixhQUFXLFNBQVMsU0FBUztBQUMzQixRQUFJLE1BQU0sU0FBUyxPQUFRO0FBQzNCLFVBQU0sV0FBVyxLQUFLLFVBQVUsTUFBTSxJQUFJO0FBRTFDLFFBQUksTUFBTSxPQUFPO0FBQ2YsVUFBSSxNQUFNLFNBQVMsV0FBVztBQUU1QixjQUFNLEtBQUssVUFBVTtBQUNyQixZQUFJO0FBQ0YsZ0JBQU0sZ0JBQWdCLFlBQVksVUFBVSxFQUFFLGVBQWUsS0FBSyxDQUFDO0FBQ25FLHFCQUFXLE9BQU8sZUFBZTtBQUMvQixnQkFBSSxJQUFJLFlBQVksR0FBRztBQUNyQixvQkFBTSxVQUFVLElBQUksS0FBSyxTQUFTO0FBQ2xDLG9CQUFNLENBQUMsT0FBTyxNQUFNLElBQUksU0FBUyxLQUFLLFVBQVUsT0FBTyxDQUFDO0FBQ3hELG9CQUFNLEtBQUssU0FBUyxJQUFJLGFBQWEsZ0JBQWdCLE1BQU0sQ0FBQyxLQUFLO0FBQ2pFLG9CQUFNLEtBQUssR0FBRyxLQUFLLE9BQU8sSUFBSSxPQUFPLEVBQUUsQ0FBQyxHQUFHLEtBQUssU0FBUyxFQUFFLEVBQUU7QUFBQSxZQUMvRDtBQUFBLFVBQ0Y7QUFBQSxRQUNGLFFBQVE7QUFBQSxRQUVSO0FBQUEsTUFDRixPQUFPO0FBRUwsY0FBTSxDQUFDLE9BQU8sTUFBTSxJQUFJLFNBQVMsUUFBUTtBQUN6QyxjQUFNLEtBQUssU0FBUyxJQUFJLGFBQWEsZ0JBQWdCLE1BQU0sQ0FBQyxLQUFLO0FBQ2pFLGNBQU0sS0FBSyxHQUFHLEdBQUcsTUFBTSxJQUFJLElBQUksT0FBTyxFQUFFLENBQUMsR0FBRyxLQUFLLFNBQVMsRUFBRSxFQUFFO0FBQUEsTUFDaEU7QUFBQSxJQUNGLE9BQU87QUFFTCxVQUFJO0FBQ0YsY0FBTSxLQUFLLFNBQVMsUUFBUSxFQUFFO0FBQzlCLGNBQU0sS0FBSyxHQUFHLE1BQU0sSUFBSSxHQUFHLE9BQU8sRUFBRSxJQUFJLGdCQUFnQixFQUFFLENBQUM7QUFBQSxNQUM3RCxRQUFRO0FBQ04sY0FBTSxLQUFLLE1BQU0sSUFBSTtBQUFBLE1BQ3ZCO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFFQSxTQUFPO0FBQUEsRUFBZ0IsTUFBTSxLQUFLLElBQUksQ0FBQztBQUFBO0FBQ3pDO0FBZU8sU0FBUyx1QkFBdUIsTUFBc0I7QUFDM0QsU0FBTyxLQUNKLE1BQU0sSUFBSSxFQUNWLE9BQU8sQ0FBQyxTQUFTLENBQUMseUJBQXlCLEtBQUssSUFBSSxDQUFDLEVBQ3JELElBQUksQ0FBQyxTQUFTLEtBQUssUUFBUSxtQ0FBbUMsRUFBRSxDQUFDLEVBQ2pFLEtBQUssSUFBSSxFQUNULFFBQVEsV0FBVyxNQUFNLEVBQ3pCLEtBQUs7QUFDVjtBQU9BLElBQU0sNEJBQTRCO0FBZTNCLFNBQVMsc0JBQXNCLFVBQWlDO0FBQ3JFLE1BQUk7QUFDRixVQUFNLE1BQU07QUFBQSxNQUNWO0FBQUEsTUFDQTtBQUFBLFFBQ0U7QUFBQSxRQUNBLElBQUkseUJBQXlCO0FBQUEsUUFDN0I7QUFBQSxRQUNBO0FBQUEsUUFDQTtBQUFBLFFBQ0E7QUFBQSxRQUNBO0FBQUEsUUFDQTtBQUFBLFFBQ0EsS0FBSyx1QkFBdUI7QUFBQSxRQUM1QixLQUFLLHNCQUFzQjtBQUFBLE1BQzdCO0FBQUEsTUFDQTtBQUFBLFFBQ0UsS0FBSztBQUFBLFFBQ0wsVUFBVTtBQUFBLFFBQ1YsU0FBUztBQUFBLFFBQ1QsT0FBTyxDQUFDLFFBQVEsUUFBUSxNQUFNO0FBQUEsTUFDaEM7QUFBQSxJQUNGLEVBQUUsS0FBSztBQUVQLFFBQUksQ0FBQyxJQUFLLFFBQU87QUFFakIsVUFBTSxhQUFhLElBQUksTUFBTSxJQUFJLEVBQUUsT0FBTyxPQUFPO0FBQ2pELFFBQUksV0FBVyxXQUFXLEVBQUcsUUFBTztBQUVwQyxVQUFNLG1CQUE2QixDQUFDO0FBQ3BDLGVBQVcsVUFBVSxZQUFZO0FBQy9CLFlBQU0sVUFBVSx1QkFBdUIsT0FBTyxLQUFLLENBQUM7QUFDcEQsVUFBSSxRQUFTLGtCQUFpQixLQUFLLE9BQU87QUFBQSxJQUM1QztBQUVBLFFBQUksaUJBQWlCLFdBQVcsRUFBRyxRQUFPO0FBRTFDLFFBQUksYUFBNEI7QUFDaEMsUUFBSTtBQUNGLFlBQU0sV0FBVyxhQUFhLE9BQU8sQ0FBQyxZQUFZLFdBQVcsTUFBTSxHQUFHO0FBQUEsUUFDcEUsS0FBSztBQUFBLFFBQ0wsVUFBVTtBQUFBLFFBQ1YsU0FBUztBQUFBLFFBQ1QsT0FBTyxDQUFDLFFBQVEsUUFBUSxNQUFNO0FBQUEsTUFDaEMsQ0FBQyxFQUFFLEtBQUs7QUFDUixtQkFBYSxTQUFTLFVBQVUsRUFBRTtBQUNsQyxVQUFJLE9BQU8sTUFBTSxVQUFVLEVBQUcsY0FBYTtBQUFBLElBQzdDLFFBQVE7QUFBQSxJQUVSO0FBRUEsVUFBTSxZQUFZLGVBQWUsT0FBTyxXQUFXLFVBQVUsTUFBTTtBQUNuRSxXQUFPLGlCQUFpQixTQUFTO0FBQUEsRUFBTSxpQkFBaUIsS0FBSyxNQUFNLENBQUM7QUFBQTtBQUFBLEVBQ3RFLFFBQVE7QUFDTixXQUFPO0FBQUEsRUFDVDtBQUNGO0FBT0EsSUFBTSxtQ0FBbUM7QUF1QnpDLFNBQVMsa0JBQWtCLGNBQTRDO0FBQ3JFLFFBQU0sV0FBc0MsQ0FBQztBQUM3QyxNQUFJLFVBQW9CLENBQUM7QUFHekIsTUFBSTtBQUNGLFVBQU0sTUFBTUEsY0FBYSxLQUFLLGNBQWMsdUJBQXVCLEdBQUcsT0FBTztBQUM3RSxVQUFNLFNBQVMsS0FBSyxNQUFNLEdBQUc7QUFDN0IsZUFBVyxDQUFDLE1BQU0sSUFBSSxLQUFLLE9BQU8sUUFBUSxNQUFNLEdBQUc7QUFDakQsVUFBSSxRQUFRLE9BQU8sU0FBUyxVQUFVO0FBQ3BDLGlCQUFTLElBQUksSUFBSTtBQUFBLFVBQ2YsY0FBYyxPQUFPLEtBQUssaUJBQWlCLFdBQVcsS0FBSyxlQUFlO0FBQUEsVUFDMUUsU0FBUyxPQUFPLEtBQUssWUFBWSxXQUFXLEtBQUssVUFBVTtBQUFBLFFBQzdEO0FBQUEsTUFDRjtBQUFBLElBQ0Y7QUFBQSxFQUNGLFNBQVMsT0FBTztBQUNkLFFBQUssTUFBZ0MsU0FBUyxVQUFVO0FBQ3RELGFBQU87QUFBQSxJQUNUO0FBQUEsRUFDRjtBQUdBLE1BQUk7QUFDRixVQUFNLE1BQU1BLGNBQWEsS0FBSyxjQUFjLHNCQUFzQixHQUFHLE9BQU87QUFDNUUsY0FBVSxJQUNQLE1BQU0sSUFBSSxFQUNWLElBQUksQ0FBQyxNQUFNLEVBQUUsS0FBSyxDQUFDLEVBQ25CLE9BQU8sQ0FBQyxNQUFtQixFQUFFLFNBQVMsQ0FBQztBQUFBLEVBQzVDLFNBQVMsT0FBTztBQUNkLFFBQUssTUFBZ0MsU0FBUyxVQUFVO0FBQ3RELGFBQU87QUFBQSxJQUNUO0FBQUEsRUFDRjtBQUdBLE1BQUksT0FBTyxLQUFLLFFBQVEsRUFBRSxXQUFXLEtBQUssUUFBUSxXQUFXLEdBQUc7QUFDOUQsV0FBTztBQUFBLEVBQ1Q7QUFFQSxTQUFPLEVBQUUsVUFBVSxRQUFRO0FBQzdCO0FBU0EsU0FBUyxpQkFBaUIsZUFBdUIsS0FBMEI7QUFDekUsTUFBSTtBQUNGLFVBQU0sU0FBUyxhQUFhLE9BQU8sQ0FBQyxPQUFPLGVBQWUsR0FBRyxHQUFHO0FBQUEsTUFDOUQsS0FBSztBQUFBLE1BQ0wsVUFBVTtBQUFBLE1BQ1YsU0FBUztBQUFBLE1BQ1QsT0FBTyxDQUFDLFFBQVEsUUFBUSxNQUFNO0FBQUEsSUFDaEMsQ0FBQyxFQUFFLEtBQUs7QUFDUixXQUFPLElBQUksSUFBSSxTQUFTLE9BQU8sTUFBTSxJQUFJLElBQUksQ0FBQyxDQUFDO0FBQUEsRUFDakQsUUFBUTtBQUNOLFdBQU8sb0JBQUksSUFBSTtBQUFBLEVBQ2pCO0FBQ0Y7QUFXQSxTQUFTLHFCQUFxQixlQUF1QixNQUEwQjtBQUM3RSxNQUFJLEtBQUssV0FBVyxFQUFHLFFBQU8sQ0FBQztBQUMvQixNQUFJO0FBQ0YsVUFBTSxTQUFTLGFBQWEsT0FBTyxDQUFDLFlBQVksZUFBZSxHQUFHO0FBQUEsTUFDaEUsT0FBTyxHQUFHLEtBQUssS0FBSyxJQUFJLENBQUM7QUFBQTtBQUFBLE1BQ3pCLEtBQUs7QUFBQSxNQUNMLFVBQVU7QUFBQSxNQUNWLFNBQVM7QUFBQSxNQUNULE9BQU8sQ0FBQyxRQUFRLFFBQVEsTUFBTTtBQUFBLElBQ2hDLENBQUMsRUFBRSxLQUFLO0FBRVIsVUFBTSxRQUFRLE9BQU8sTUFBTSxJQUFJO0FBQy9CLFVBQU0sYUFBdUIsQ0FBQztBQUM5QixhQUFTLElBQUksR0FBRyxJQUFJLE1BQU0sVUFBVSxJQUFJLEtBQUssUUFBUSxLQUFLO0FBQ3hELFVBQUksQ0FBQyxNQUFNLENBQUMsRUFBRyxTQUFTLFNBQVMsR0FBRztBQUNsQyxtQkFBVyxLQUFLLEtBQUssQ0FBQyxDQUFFO0FBQUEsTUFDMUI7QUFBQSxJQUNGO0FBQ0EsV0FBTztBQUFBLEVBQ1QsUUFBUTtBQUNOLFdBQU8sQ0FBQztBQUFBLEVBQ1Y7QUFDRjtBQVNBLFNBQVMsOEJBQThCLGVBQXVCLE1BQStCO0FBQzNGLE1BQUksS0FBSyxXQUFXLEVBQUcsUUFBTztBQUM5QixNQUFJO0FBQ0YsVUFBTSxTQUFTLGFBQWEsT0FBTyxDQUFDLE9BQU8sYUFBYSwyQkFBMkIsVUFBVSxHQUFHLElBQUksR0FBRztBQUFBLE1BQ3JHLEtBQUs7QUFBQSxNQUNMLFVBQVU7QUFBQSxNQUNWLFNBQVM7QUFBQSxNQUNULE9BQU8sQ0FBQyxRQUFRLFFBQVEsTUFBTTtBQUFBLElBQ2hDLENBQUMsRUFBRSxLQUFLO0FBRVIsUUFBSSxDQUFDLE9BQVEsUUFBTztBQUNwQixXQUFPLHVCQUF1QixNQUFNLEtBQUs7QUFBQSxFQUMzQyxRQUFRO0FBQ04sV0FBTztBQUFBLEVBQ1Q7QUFDRjtBQTRCTyxTQUFTLDRCQUE0QixlQUF1QixjQUFnQztBQUNqRyxRQUFNLFlBQVksa0JBQWtCLFlBQVk7QUFDaEQsTUFBSSxDQUFDLFVBQVcsUUFBTyxDQUFDO0FBRXhCLFFBQU0sYUFBYSxRQUFRLElBQUksZUFBZSxXQUFXLEtBQUs7QUFHOUQsUUFBTSxpQkFBaUIsT0FBTyxRQUFRLFVBQVUsUUFBUSxFQUFFLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLE1BQU0sRUFBRSxRQUFRLGNBQWMsRUFBRSxPQUFPLENBQUM7QUFJbkgsUUFBTSx1QkFBdUIsb0JBQUksSUFBWTtBQUM3QyxRQUFNLFNBQXdCLENBQUM7QUFFL0IsYUFBVyxDQUFDLE1BQU0sSUFBSSxLQUFLLGdCQUFnQjtBQUN6QyxVQUFNLFlBQVksaUJBQWlCLGVBQWUsSUFBSTtBQUN0RCxVQUFNLGFBQWEsVUFBVSxRQUFRLE9BQU8sQ0FBQyxRQUFRLFVBQVUsSUFBSSxHQUFHLENBQUM7QUFDdkUsZUFBVyxPQUFPLFdBQVksc0JBQXFCLElBQUksR0FBRztBQUMxRCxRQUFJLFdBQVcsU0FBUyxHQUFHO0FBQ3pCLGFBQU8sS0FBSyxFQUFFLFlBQVksTUFBTSxjQUFjLEtBQUssY0FBYyxNQUFNLFdBQVcsQ0FBQztBQUFBLElBQ3JGO0FBQUEsRUFDRjtBQUdBLFFBQU0sZ0JBQWdCLGlCQUFpQixlQUFlLFVBQVU7QUFDaEUsUUFBTSxXQUFXLFVBQVUsUUFBUSxPQUFPLENBQUMsUUFBUSxjQUFjLElBQUksR0FBRyxLQUFLLENBQUMscUJBQXFCLElBQUksR0FBRyxDQUFDO0FBQzNHLE1BQUksU0FBUyxTQUFTLEdBQUc7QUFDdkIsV0FBTyxLQUFLLEVBQUUsWUFBWSxZQUFZLE1BQU0sU0FBUyxDQUFDO0FBQUEsRUFDeEQ7QUFHQSxRQUFNLGVBQWUsVUFBVSxRQUFRLE9BQU8sQ0FBQyxRQUFRLENBQUMscUJBQXFCLElBQUksR0FBRyxLQUFLLENBQUMsY0FBYyxJQUFJLEdBQUcsQ0FBQztBQUNoSCxRQUFNLGFBQWEscUJBQXFCLGVBQWUsWUFBWTtBQUNuRSxNQUFJLFdBQVcsU0FBUyxHQUFHO0FBQ3pCLFdBQU8sS0FBSyxFQUFFLFlBQVksSUFBSSxNQUFNLFlBQVksVUFBVSxLQUFLLENBQUM7QUFBQSxFQUNsRTtBQUdBLFFBQU0sY0FBYyxvQkFBSSxJQUFZO0FBQ3BDLFFBQU0sU0FBbUIsQ0FBQztBQUUxQixhQUFXLFNBQVMsUUFBUTtBQUMxQixVQUFNLFVBQVUsTUFBTSxLQUFLLE9BQU8sQ0FBQyxRQUFRLENBQUMsWUFBWSxJQUFJLEdBQUcsQ0FBQztBQUNoRSxVQUFNLFVBQVUsTUFBTSxLQUFLLE9BQU8sQ0FBQyxRQUFRLFlBQVksSUFBSSxHQUFHLENBQUM7QUFHL0QsVUFBTSxjQUFjLFFBQVEsTUFBTSxDQUFDLGdDQUFnQztBQUNuRSxVQUFNLFVBQVUsOEJBQThCLGVBQWUsV0FBVztBQUV4RSxRQUFJLFNBQVM7QUFDWCxpQkFBVyxPQUFPLFlBQWEsYUFBWSxJQUFJLEdBQUc7QUFBQSxJQUNwRDtBQUdBLFVBQU0sWUFBc0IsQ0FBQztBQUM3QixRQUFJLFFBQVMsV0FBVSxLQUFLLE9BQU87QUFDbkMsUUFBSSxRQUFRLFNBQVMsR0FBRztBQUN0QixnQkFBVSxLQUFLLFFBQVEsSUFBSSxDQUFDLFFBQVEsSUFBSSxNQUFNLEdBQUcsQ0FBQyxDQUFDLEVBQUUsS0FBSyxJQUFJLENBQUM7QUFBQSxJQUNqRTtBQUVBLFFBQUksVUFBVSxXQUFXLEVBQUc7QUFHNUIsVUFBTSxRQUFrQixDQUFDO0FBQ3pCLFFBQUksTUFBTSxVQUFVO0FBQ2xCLFlBQU0sS0FBSyxpQkFBaUI7QUFBQSxJQUM5QixPQUFPO0FBQ0wsWUFBTSxLQUFLLFdBQVcsTUFBTSxVQUFVLEdBQUc7QUFDekMsVUFBSSxNQUFNLGFBQWMsT0FBTSxLQUFLLGlCQUFpQixNQUFNLFlBQVksR0FBRztBQUFBLElBQzNFO0FBQ0EsVUFBTSxLQUFLLFVBQVUsTUFBTSxLQUFLLE1BQU0sR0FBRztBQUV6QyxXQUFPLEtBQUssdUJBQXVCLE1BQU0sS0FBSyxHQUFHLENBQUM7QUFBQSxFQUFNLFVBQVUsS0FBSyxJQUFJLENBQUM7QUFBQSxzQkFBeUI7QUFBQSxFQUN2RztBQUVBLFNBQU87QUFDVDtBQW1CTyxTQUFTLHVCQUF1QixhQUFrQztBQUN2RSxRQUFNLFlBQVksZUFBZSxXQUFXO0FBQzVDLFFBQU0sWUFBWSxtQkFBbUIsWUFBWSxZQUFZO0FBQzdELFFBQU0sV0FBVyxzQkFBc0IsWUFBWSxZQUFZO0FBQy9ELFFBQU0scUJBQXFCLDRCQUE0QixZQUFZLFVBQVUsWUFBWSxZQUFZO0FBRXJHLFFBQU0sUUFBUSxDQUFDLFdBQVcsU0FBUztBQUNuQyxNQUFJLFNBQVUsT0FBTSxLQUFLLFFBQVE7QUFDakMsUUFBTSxLQUFLLEdBQUcsa0JBQWtCO0FBQ2hDLFNBQU8sTUFBTSxLQUFLLE1BQU07QUFDMUI7OztBRTdtQkEsSUFBTyx5QkFBUSxrQkFBa0IsQ0FBQyxHQUFHLE9BQU8sUUFBUSxFQUFFLFFBQUFDLFFBQU8sTUFBTTtBQUNqRSxNQUFJO0FBQ0osTUFBSTtBQUNGLGtCQUFjLG1CQUFtQjtBQUFBLEVBQ25DLFNBQVMsT0FBTztBQUNkLFVBQU0sVUFBVSxpQkFBaUIsUUFBUSxNQUFNLFVBQVUsT0FBTyxLQUFLO0FBQ3JFLElBQUFBLFFBQU8sTUFBTSwyQ0FBMkMsRUFBRSxPQUFPLFFBQVEsQ0FBQztBQUMxRSxXQUFPLG9CQUFvQjtBQUFBLE1BQ3pCLGVBQWU7QUFBQSxJQUNqQixDQUFDO0FBQUEsRUFDSDtBQUVBLE1BQUk7QUFDSixNQUFJO0FBQ0Ysb0JBQWdCLHVCQUF1QixXQUFXO0FBQUEsRUFDcEQsU0FBUyxPQUFPO0FBQ2QsUUFBSSxpQkFBaUIscUJBQXFCO0FBQ3hDLE1BQUFBLFFBQU8sTUFBTSwwQkFBMEIsRUFBRSxVQUFVLE1BQU0sVUFBVSxPQUFPLE1BQU0sUUFBUSxDQUFDO0FBQ3pGLGFBQU8sb0JBQW9CO0FBQUEsUUFDekIsVUFBVTtBQUFBLFFBQ1YsR0FBRyxNQUFNLGNBQWMsVUFBVTtBQUFBLE1BQ25DLENBQUM7QUFBQSxJQUNIO0FBQ0EsVUFBTTtBQUFBLEVBQ1I7QUFFQSxTQUFPLG9CQUFvQjtBQUFBLElBQ3pCO0FBQUEsSUFDQSxvQkFBb0I7QUFBQSxNQUNsQixtQkFBbUI7QUFBQSxJQUNyQjtBQUFBLEVBQ0YsQ0FBQztBQUNILENBQUM7OztBQzlDRCxRQUFRLElBQUksZ0NBQWdDLElBQUk7QUFLaEQsUUFBUSxzQkFBSTsiLAogICJuYW1lcyI6IFsicmVhZEZpbGVTeW5jIiwgInJlYWRGaWxlU3luYyIsICJsb2dnZXIiXQp9Cg==
