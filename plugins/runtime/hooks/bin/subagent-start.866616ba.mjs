#!/usr/bin/env -S node --enable-source-maps
import { createRequire as __createRequire } from "node:module";
import { fileURLToPath as __fileURLToPath } from "node:url";
import { dirname as __pathDirname } from "node:path";
const require = __createRequire(import.meta.url);
const __filename = __fileURLToPath(import.meta.url);
const __dirname = __pathDirname(__filename);
if (!process.env['CLAUDE_CODE_HOOKS_LOG_FILE']) {
  process.env['CLAUDE_CODE_HOOKS_LOG_FILE'] = "/workspace/.cards/logs/claude-code-cards-runtime-hooks.log";
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
    this.logFilePath = config.logFilePath ?? (config.logEnvVar ? process.env[config.logEnvVar] : void 0) ?? null;
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
      } catch (closeError) {
        process.stderr.write(`[claude-code-hooks] Failed to close log file: ${String(closeError)}
`);
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
      } catch (closeError) {
        process.stderr.write(`[claude-code-hooks] Failed to close log file: ${String(closeError)}
`);
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
        } catch (handlerError) {
          process.stderr.write(`[claude-code-hooks] Log handler error: ${String(handlerError)}
`);
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
    } catch (writeError) {
      this.logFileFd = null;
      this.fileInitialized = false;
      process.stderr.write(`[claude-code-hooks] Log file write failed: ${String(writeError)}
`);
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
var logger = new Logger({
  logEnvVar: process.env.CLAUDE_CODE_HOOKS_LOG_ENV_VAR ?? "CLAUDE_CODE_HOOKS_LOG_FILE"
});

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

// src/lib/file-tree.ts
function createNode() {
  return { children: /* @__PURE__ */ new Map(), isFile: false };
}
function insertPath(root, path) {
  let node = root;
  const segments = path.split("/");
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    let child = node.children.get(seg);
    if (!child) {
      child = createNode();
      node.children.set(seg, child);
    }
    node = child;
  }
  node.isFile = true;
}
function renderNode(node, indent) {
  const lines = [];
  const prefix = " ".repeat(indent);
  const dirs = [];
  const files = [];
  for (const [name, child] of node.children) {
    if (child.isFile && child.children.size === 0) {
      files.push([name, child]);
    } else if (child.isFile && child.children.size > 0) {
      files.push([name, createNode()]);
      dirs.push([name, child]);
    } else {
      dirs.push([name, child]);
    }
  }
  dirs.sort(([a], [b]) => a.localeCompare(b));
  files.sort(([a], [b]) => a.localeCompare(b));
  for (const [name, child] of dirs) {
    let collapsed = name;
    let current = child;
    while (current.children.size === 1 && !current.isFile) {
      const [nextName, nextChild] = current.children.entries().next().value;
      collapsed += `/${nextName}`;
      current = nextChild;
    }
    if (current.isFile && current.children.size === 0) {
      lines.push(`${prefix}${collapsed}`);
    } else {
      lines.push(`${prefix}${collapsed}/`);
      lines.push(renderNode(current, indent + 2));
    }
  }
  for (const [name] of files) {
    lines.push(`${prefix}${name}`);
  }
  return lines.filter(Boolean).join("\n");
}
function formatFileTree(paths) {
  if (paths.length === 0) return "";
  const root = createNode();
  for (const p of paths) {
    if (p) insertPath(root, p);
  }
  return renderNode(root, 1);
}
function formatCommitLog(rawLog, separator) {
  if (!rawLog.trim()) return "";
  if (separator === "nul") {
    return formatNulDelimited(rawLog);
  }
  return formatBlankLineDelimited(rawLog);
}
function formatNulDelimited(raw) {
  const commits = raw.split("\0").filter((s) => s.trim());
  return commits.map((commit) => formatSingleCommit(commit.trim())).join("\n\n");
}
function formatBlankLineDelimited(raw) {
  const lines = raw.split("\n");
  const commitBlocks = [];
  let current = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line === "" && current.length > 0) {
      const next = lines[i + 1];
      if (next && isCommitHeader(next)) {
        commitBlocks.push(current);
        current = [];
        continue;
      }
    }
    current.push(line);
  }
  if (current.length > 0) commitBlocks.push(current);
  return commitBlocks.map((block) => formatSingleCommit(block.join("\n").trim())).join("\n\n");
}
function isCommitHeader(line) {
  return /^[0-9a-f]{7,} - /.test(line);
}
function formatSingleCommit(block) {
  const lines = block.split("\n").filter((l) => l.trim());
  if (lines.length === 0) return "";
  const header = lines[0];
  const files = lines.slice(1);
  if (files.length === 0) return header;
  const tree = formatFileTree(files);
  return tree ? `${header}
${tree}` : header;
}

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
        mergeRequestRequired: gates?.["mergeRequestRequired"] === true,
        mergeApproved: gates?.["mergeApproved"] === true
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
  const gatesLine = meta ? `gates: planRequired=${meta.gates.planRequired} planApproved=${meta.gates.planApproved} mergeRequestRequired=${meta.gates.mergeRequestRequired} mergeApproved=${meta.gates.mergeApproved}` : "";
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
        } catch (_statError) {
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
        } catch (_readdirError) {
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
var MAX_CARD_REPO_LOG_COMMITS = 5;
function buildCardRepoLogBlock(rootPath) {
  try {
    const log = execFileSync(
      "git",
      [
        "log",
        `-${MAX_CARD_REPO_LOG_COMMITS}`,
        "--pretty=format:%x00%h - %an: %s",
        "--name-only",
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
    const formatted = formatCommitLog(log, "nul");
    if (!formatted) return null;
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
    } catch (_countError) {
    }
    const countAttr = totalCount !== null ? ` count="${totalCount}"` : "";
    return `<card-repo-log${countAttr}>
${formatted}
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
function annotateMergedCommits(output, mergedShas) {
  return output.replace(/^([0-9a-f]{40}) ([0-9a-f]{7,} - .*)$/gm, (_, fullSha, rest) => {
    return mergedShas.has(fullSha) ? `${rest} [merged]` : rest;
  });
}
function resolveWorkspaceCommitDetails(workspacePath, shas, mergedShas) {
  if (shas.length === 0) return null;
  try {
    const useFullHash = mergedShas !== void 0 && mergedShas.size > 0;
    const format = useFullHash ? "%H %h - %s" : "%h - %s";
    const output = execFileSync("git", ["log", "--no-walk", `--pretty=format:${format}`, "--name-only", ...shas], {
      cwd: workspacePath,
      encoding: "utf-8",
      timeout: 5e3,
      stdio: ["pipe", "pipe", "pipe"]
    }).trim();
    if (!output) return null;
    const annotated = useFullHash ? annotateMergedCommits(output, mergedShas) : output;
    return formatCommitLog(annotated, "blank-line") || null;
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
    const mergedShas = new Set(displayShas.filter((sha) => baseReachable.has(sha)));
    const details = resolveWorkspaceCommitDetails(workspacePath, displayShas, mergedShas);
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
execute(subagent_start_default);
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vc2RrL3NyYy9jb25maWcvZW52LnRzIiwgIi4uLy4uLy4uL25vZGVfbW9kdWxlcy9AZ29vZGZvb3QvY2xhdWRlLWNvZGUtaG9va3MvZGlzdC9lbnYuanMiLCAiLi4vLi4vLi4vbm9kZV9tb2R1bGVzL0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcy9kaXN0L2hvb2tzLmpzIiwgIi4uLy4uLy4uL25vZGVfbW9kdWxlcy9AZ29vZGZvb3QvY2xhdWRlLWNvZGUtaG9va3MvZGlzdC9sb2dnZXIuanMiLCAiLi4vLi4vLi4vbm9kZV9tb2R1bGVzL0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcy9kaXN0L291dHB1dHMuanMiLCAiLi4vLi4vLi4vbm9kZV9tb2R1bGVzL0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcy9kaXN0L3J1bnRpbWUuanMiLCAic3JjL2xpYi9jb250ZXh0LnRzIiwgIi4uL3Nkay9zcmMvcHJvdG9jb2wvdHlwZXMvYnJhbmNoLnRzIiwgInNyYy9saWIvZmlsZS10cmVlLnRzIiwgInNyYy9zdWJhZ2VudC1zdGFydC50cyIsICJzcmMvc3ViYWdlbnQtc3RhcnQtZW50cnkudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbIi8qKlxuICogRW52aXJvbm1lbnQgdmFyaWFibGUgdXRpbGl0aWVzIGZvciBDYXJkcyBFeHRlbnNpb24gYWN0aW9ucyBhbmQgdHlwZSBob29rcy5cbiAqXG4gKiBUaGUgZXhlY3V0aW9uIHdyYXBwZXIgaW5qZWN0cyBhY3Rpb24gYW5kIHR5cGUgaG9vayBpbnB1dHMgdmlhIHByb2Nlc3MuZW52LlxuICogVGhpcyBtb2R1bGUgcHJvdmlkZXMgc3RyaWN0IGdldHRlcnMgYW5kIHR5cGVkIGV4dHJhY3RvcnMgc28gaGFuZGxlcnMgZG8gbm90XG4gKiBuZWVkIHRvIHBhcnNlIGVudmlyb25tZW50IHZhcmlhYmxlcyBtYW51YWxseS5cbiAqXG4gKiBVc2UgdGhlIGluZGl2aWR1YWwgZ2V0dGVycyB3aGVuIHlvdSBvbmx5IG5lZWQgb25lIHZhbHVlOyB1c2VcbiAqIHtAbGluayBleHRyYWN0QWN0aW9uSW5wdXR9IG9yIHtAbGluayBleHRyYWN0VHlwZUlucHV0fSB3aGVuIHlvdSBuZWVkIGEgZnVsbFxuICogdHlwZWQgcGF5bG9hZCBmb3IgYW4gYWN0aW9uIG9yIHR5cGUgaG9vay5cbiAqXG4gKlxuICogQHN1bW1hcnkgRW52aXJvbm1lbnQgdmFyaWFibGUgdXRpbGl0aWVzIGZvciBDYXJkcyBFeHRlbnNpb24gYWN0aW9ucyBhbmQgdHlwZSBob29rc1xuICogQG1vZHVsZVxuICovXG5cbmltcG9ydCB7IHJlYWRGaWxlU3luYyB9IGZyb20gJ25vZGU6ZnMnO1xuaW1wb3J0IHR5cGUgeyBBY3Rpb25JbnB1dCwgVHlwZUhvb2tJbnB1dCB9IGZyb20gJy4vaW5wdXRzLmpzJztcblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gQ29uc3RhbnRzXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbi8qKlxuICogRW52aXJvbm1lbnQgdmFyaWFibGUgbmFtZXMgc2V0IGJ5IHRoZSBDYXJkcyBleGVjdXRpb24gd3JhcHBlci5cbiAqXG4gKiBUaGlzIGlzIHRoZSBzaW5nbGUgc291cmNlIG9mIHRydXRoIGZvciBlbnYgdmFyIGtleXMgdXNlZCBieSBhY3Rpb24gYW5kIHR5cGVcbiAqIGhvb2sgcHJvY2Vzc2VzLiBLZWVwIGl0IGluIHN5bmMgd2l0aCB0aGUgd3JhcHBlciB0byBhdm9pZCBzdWJ0bGUgXCJ1bmRlZmluZWRcbiAqIGlucHV0XCIgYnVncy5cbiAqL1xuZXhwb3J0IGNvbnN0IENBUkRTX0VOVl9WQVJTID0ge1xuICAvKipcbiAgICogVW5pcXVlIGlkZW50aWZpZXIgZm9yIHRoZSBjdXJyZW50IGNhcmQuXG4gICAqIEF2YWlsYWJsZSBpbiBhbGwgYWN0aW9ucyBhbmQgdHlwZSBob29rcy5cbiAgICovXG4gIENBUkRfSUQ6ICdDQVJEX0lEJyxcblxuICAvKipcbiAgICogVGhlIGVudmlyb25tZW50IG5hbWUgZnJvbSBzZXR0aW5ncy5qc29uLlxuICAgKiBBdmFpbGFibGUgaW4gYWxsIGFjdGlvbnMgYW5kIHR5cGUgaG9va3MuXG4gICAqL1xuICBFTlZJUk9OTUVOVDogJ0VOVklST05NRU5UJyxcblxuICAvKipcbiAgICogRGlzcGxheSBuYW1lIG9mIHRoZSBhY3Rpb24gYnV0dG9uIHRoYXQgdHJpZ2dlcmVkIHRoaXMgaGFuZGxlci5cbiAgICogQXZhaWxhYmxlIGluIGFjdGlvbnMgb25seSAobm90IHR5cGUgaG9va3MpLlxuICAgKi9cbiAgQUNUSU9OX05BTUU6ICdBQ1RJT05fTkFNRScsXG5cbiAgLyoqXG4gICAqIENhcmQncyBleGVjdXRpb24gbW9kZSwgZGV0ZXJtaW5pbmcgVUkgaW50ZXJhY3Rpb24gbW9kZWwuXG4gICAqIEF2YWlsYWJsZSBpbiBhY3Rpb25zIG9ubHkgKG5vdCB0eXBlIGhvb2tzKS5cbiAgICogVmFsaWQgdmFsdWVzOiAnaW50ZXJhY3RpdmUnIHwgJ2JhY2tncm91bmQnXG4gICAqL1xuICBFWEVDVVRJT05fTU9ERTogJ0VYRUNVVElPTl9NT0RFJyxcblxuICAvKipcbiAgICogQ2FyZHMgc2VydmVyIGJhc2UgVVJMIGZvciBBUEkgY2FsbHMuXG4gICAqIEF2YWlsYWJsZSBpbiBhbGwgYWN0aW9ucyBhbmQgdHlwZSBob29rcy5cbiAgICovXG4gIEFQSV9CQVNFX1VSTDogJ0FQSV9CQVNFX1VSTCcsXG5cbiAgLyoqXG4gICAqIEF1dGhlbnRpY2F0aW9uIHRva2VuIGZvciBBUEkgY2FsbHMuXG4gICAqIEF2YWlsYWJsZSBpbiBhbGwgYWN0aW9ucyBhbmQgdHlwZSBob29rcy5cbiAgICovXG4gIEFQSV9BQ0NFU1NfVE9LRU46ICdBUElfQUNDRVNTX1RPS0VOJyxcblxuICAvKipcbiAgICogQ29uZmlndXJlZCBjb2RpbmcgYWdlbnQgaWRlbnRpZmllciBmcm9tIGNhcmRzLmNvZGluZ0FnZW50IHNldHRpbmcuXG4gICAqIEF2YWlsYWJsZSBpbiBhY3Rpb25zIG9ubHkgKG5vdCB0eXBlIGhvb2tzKS5cbiAgICogT3B0aW9uYWwuXG4gICAqL1xuICBDT0RJTkdfQUdFTlQ6ICdDT0RJTkdfQUdFTlQnLFxuXG4gIC8qKlxuICAgKiBUaGUgcmVnaXN0ZXJlZCB0eXBlIG5hbWUuXG4gICAqIEF2YWlsYWJsZSBpbiB0eXBlIGhvb2tzIG9ubHkuXG4gICAqL1xuICBUWVBFX05BTUU6ICdUWVBFX05BTUUnLFxuXG4gIC8qKlxuICAgKiBUaGUgdHlwZSdzIHZlcnNpb24gc3RyaW5nIGZyb20gc2V0dGluZ3MuanNvbiBjb25maWd1cmF0aW9uLlxuICAgKiBBdmFpbGFibGUgaW4gdHlwZSBob29rcyBvbmx5LlxuICAgKi9cbiAgVFlQRV9WRVJTSU9OOiAnVFlQRV9WRVJTSU9OJyxcblxuICAvKipcbiAgICogVGhlIGZpbGUgbmFtZSB3aXRoaW4gdGhlIHR5cGUgZGlyZWN0b3J5LlxuICAgKiBBdmFpbGFibGUgaW4gdHlwZSBob29rcyBvbmx5LlxuICAgKi9cbiAgRklMRV9OQU1FOiAnRklMRV9OQU1FJyxcblxuICAvKipcbiAgICogRnVsbCBwYXRoIHRvIHRoZSBmaWxlLlxuICAgKiBBdmFpbGFibGUgaW4gdHlwZSBob29rcyBvbmx5LlxuICAgKi9cbiAgRklMRV9QQVRIOiAnRklMRV9QQVRIJyxcblxuICAvKipcbiAgICogRmlsZSBzaXplIGluIGJ5dGVzLlxuICAgKiBBdmFpbGFibGUgaW4gdHlwZSBob29rcyBvbmx5LlxuICAgKi9cbiAgRklMRV9TSVpFOiAnRklMRV9TSVpFJyxcblxuICAvKipcbiAgICogU0hBMjU2IGhhc2ggb2YgY29udGVudC5cbiAgICogQXZhaWxhYmxlIGluIHR5cGUgaG9va3Mgb25seS5cbiAgICovXG4gIFNIQTI1NjogJ1NIQTI1NicsXG5cbiAgLyoqXG4gICAqIE1JTUUgdHlwZSBvZiB0aGUgY29udGVudC5cbiAgICogQXZhaWxhYmxlIGluIHR5cGUgaG9va3Mgb25seS5cbiAgICovXG4gIENPTlRFTlRfVFlQRTogJ0NPTlRFTlRfVFlQRScsXG5cbiAgLyoqXG4gICAqIFBhdGggdG8gdGhlIFZTIENvZGUgYnVuZGxlZCBOb2RlLmpzIGludGVycHJldGVyLlxuICAgKlxuICAgKiBTZXQgYnkgdGhlIGV4dGVuc2lvbiBob3N0IGZyb20gYHByb2Nlc3MuZXhlY1BhdGhgICh3aXRoXG4gICAqIGBFTEVDVFJPTl9SVU5fQVNfTk9ERT0xYCkuIENvbW1hbmRzIGluIHNldHRpbmdzLmpzb24gdXNlXG4gICAqIGAkVlNDT0RFX05PREUgLi9iaW4vLi4uYCBzbyB0aGV5IHdvcmsgcmVnYXJkbGVzcyBvZlxuICAgKiB3aGV0aGVyIGBub2RlYCBpcyBvbiB0aGUgc3lzdGVtIFBBVEguXG4gICAqXG4gICAqIEF2YWlsYWJsZSBpbiBhbGwgYWN0aW9ucyBhbmQgdHlwZSBob29rcy5cbiAgICovXG4gIFZTQ09ERV9OT0RFOiAnVlNDT0RFX05PREUnLFxuXG4gIC8qKlxuICAgKiBQYXRoIHRvIHRoZSBOb2RlLmpzIGludGVycHJldGVyIHJ1bm5pbmcgdGhlIHdyYXBwZXIgcHJvY2Vzcy5cbiAgICpcbiAgICogU2V0IGJ5IHRoZSB3cmFwcGVyIGZyb20gYHByb2Nlc3MuZXhlY1BhdGhgLiBVc2UgYCROT0RFYCBpbiBlbWJlZGRlZFxuICAgKiBiYXNoIHN0YXRlbWVudHMgdG8gaW52b2tlIE5vZGUgc2NyaXB0cyBwb3J0YWJseS5cbiAgICpcbiAgICogQXZhaWxhYmxlIGluIGFsbCBhY3Rpb25zLlxuICAgKi9cbiAgTk9ERTogJ05PREUnLFxuXG4gIC8qKlxuICAgKiBQYXRoIHRvIHRoZSBVbml4IGRvbWFpbiBzb2NrZXQgZm9yIHJ1bnRpbWUtdG8tZGlzcGF0Y2hlciBjb21tdW5pY2F0aW9uLlxuICAgKiBBdmFpbGFibGUgaW4gYWN0aW9ucyBvbmx5LlxuICAgKi9cbiAgU09DS0VUX1BBVEg6ICdTT0NLRVRfUEFUSCcsXG5cbiAgLyoqXG4gICAqIFBhdGggdG8gYSBKU09OIGZpbGUgY29udGFpbmluZyBzd2l0Y2hUb0ludGVyYWN0aXZlIGRhdGEgZnJvbSBhIHByZXZpb3VzIGhhbmRsZXIuXG4gICAqIEF2YWlsYWJsZSBpbiBhY3Rpb25zIG9ubHkuIE9wdGlvbmFsLlxuICAgKi9cbiAgU1dJVENIX1RPX0lOVEVSQUNUSVZFX0RBVEFfUEFUSDogJ1NXSVRDSF9UT19JTlRFUkFDVElWRV9EQVRBX1BBVEgnLFxuXG4gIC8qKlxuICAgKiBQYXRoIHRvIHRoZSBzZXR0aW5ncyBjb25maWd1cmF0aW9uIGRpcmVjdG9yeS5cbiAgICogQXZhaWxhYmxlIGluIGFjdGlvbnMgb25seS5cbiAgICovXG4gIENPTkZJR19QQVRIOiAnQ09ORklHX1BBVEgnLFxuXG4gIC8qKlxuICAgKiBQYXRoIHRvIHRoZSBWUyBDb2RlIHdvcmtzcGFjZSByb290IGRpcmVjdG9yeS5cbiAgICogU2V0IGJ5IHRoZSBhY3Rpb24gaGFuZGxlciAoZS5nLiwgbGF1bmNoLnRzKSB0byB0aGUgd29ya3RyZWUgcGF0aC5cbiAgICogQXZhaWxhYmxlIGluIGhvb2tzIHJ1bm5pbmcgaW5zaWRlIHRoZSBjbGF1ZGUgQ0xJLlxuICAgKi9cbiAgV09SS1NQQUNFX1BBVEg6ICdXT1JLU1BBQ0VfUEFUSCcsXG5cbiAgLyoqXG4gICAqIEFic29sdXRlIHBhdGggdG8gdGhlIG1haW4gZ2l0IHJlcG9zaXRvcnkgcm9vdCAoTk9UIGEgd29ya3RyZWUpLlxuICAgKiBTZXQgYnkgQWN0aW9uRGlzcGF0Y2hlcjsgY29uc3VtZWQgYnkgdGhlIHdyYXBwZXIgYW5kIHdhdGNoZXIgZm9yXG4gICAqIGdpdCBvcGVyYXRpb25zICh3b3JrdHJlZSByZW1vdmFsLCBicmFuY2ggZGVsZXRpb24pIHRoYXQgbXVzdCBydW5cbiAgICogYWdhaW5zdCB0aGUgbWFpbiByZXBvc2l0b3J5LlxuICAgKi9cbiAgUkVQT19ST09UOiAnUkVQT19ST09UJyxcblxuICAvKipcbiAgICogUGF0aCB0byB0aGUgY2FyZCdzIHJlcG9zaXRvcnkgZGlyZWN0b3J5LlxuICAgKiBBdmFpbGFibGUgaW4gYWN0aW9ucyBvbmx5LlxuICAgKi9cbiAgQ0FSRF9SRVBPX1BBVEg6ICdDQVJEX1JFUE9fUEFUSCcsXG5cbiAgLyoqXG4gICAqIFJlc29sdmVkIHNoZWxsIGNvbW1hbmQgZm9yIHRoZSB3cmFwcGVyIHRvIHNwYXduIGFzIHRoZSBhY3Rpb24gaGFuZGxlci5cbiAgICogU2V0IGJ5IEFjdGlvbkRpc3BhdGNoZXI7IGNvbnN1bWVkIGJ5IHRoZSB3cmFwcGVyIChub3QgYnkgYWN0aW9uIGhhbmRsZXJzKS5cbiAgICovXG4gIEFDVElPTl9DT01NQU5EOiAnQUNUSU9OX0NPTU1BTkQnLFxuXG4gIC8qKlxuICAgKiBHaXQgYnJhbmNoIHRoYXQgdGhlIGNhcmQncyB3b3Jrc3BhY2UgYnJhbmNoIHdpbGwgbWVyZ2UgaW50by5cbiAgICogUmVzb2x2ZWQgZnJvbSB0aGUgd29ya3NwYWNlIEhFQUQgYXQgbGF1bmNoIHRpbWUuXG4gICAqIFNldCBieSB0aGUgbGF1bmNoIGFjdGlvbi5cbiAgICogQXZhaWxhYmxlIGluIGFjdGlvbnMgb25seS5cbiAgICovXG4gIEJBU0VfQlJBTkNIOiAnQkFTRV9CUkFOQ0gnLFxuXG4gIC8qKlxuICAgKiBHaXQgYnJhbmNoIGZyb20gd2hpY2ggdGhlIGNhcmQncyB3b3Jrc3BhY2UgYnJhbmNoIHdhcyBjcmVhdGVkLlxuICAgKiBNYXkgZGlmZmVyIGZyb20gQkFTRV9CUkFOQ0ggd2hlbiB0aGUgd29ya3RyZWUgd2FzIGNyZWF0ZWQgYWdhaW5zdFxuICAgKiBhIGRpZmZlcmVudCByZWYgdGhhbiB0aGUgY3VycmVudCB3b3Jrc3BhY2UgSEVBRC5cbiAgICogU2V0IGJ5IHRoZSBsYXVuY2ggYWN0aW9uLlxuICAgKiBBdmFpbGFibGUgaW4gYWN0aW9ucyBvbmx5LlxuICAgKi9cbiAgUEFSRU5UX0JSQU5DSDogJ1BBUkVOVF9CUkFOQ0gnLFxuXG4gIC8qKlxuICAgKiBHaXQgYnJhbmNoIG5hbWUgZm9yIHRoZSBjYXJkJ3Mgd29ya3NwYWNlIGltcGxlbWVudGF0aW9uLlxuICAgKiBTZXQgYnkgdGhlIGxhdW5jaCBhY3Rpb24gYWZ0ZXIgcmVzb2x2aW5nIG9yIGNyZWF0aW5nIHRoZSB3b3JrdHJlZS5cbiAgICogQXZhaWxhYmxlIGluIGFjdGlvbnMgb25seS5cbiAgICovXG4gIFdPUktTUEFDRV9CUkFOQ0g6ICdXT1JLU1BBQ0VfQlJBTkNIJyxcblxuICAvKipcbiAgICogU2Vzc2lvbiBJRCBwZXJzaXN0ZWQgYnkgdGhlIHNlc3Npb24tc3RhcnQgaG9vayB2aWEgYHBlcnNpc3RFbnZWYXJgLlxuICAgKlxuICAgKiBBdmFpbGFibGUgaW4gQmFzaCB0b29sIHNoZWxsIGRlc2NlbmRhbnRzIChjb21tYW5kcywgZ2l0IGhvb2tzKSBhZnRlclxuICAgKiBzZXNzaW9uIHN0YXJ0LiBOT1QgYXZhaWxhYmxlIGluIGhvb2tzIHNwYXduZWQgZGlyZWN0bHkgYnkgQ2xhdWRlIENvZGVcbiAgICogKHN0b3AsIHNlc3Npb24tZW5kLCBldGMuKSBcdTIwMTQgdGhvc2UgcmVjZWl2ZSB0aGUgc2Vzc2lvbiBJRCB2aWEgaG9vayBpbnB1dC5cbiAgICpcbiAgICogVGhlIGNhcmQtcmVwbyBwb3N0LWNvbW1pdCBob29rIHJlYWRzIHRoaXMgdG8gcmVjb3JkIGNvbW1pdHMgZGlyZWN0bHlcbiAgICogd2l0aG91dCBuZWVkaW5nIGEgcHJvY2Vzcy10cmVlIHdhbGsgb3IgUElEIHJlZ2lzdHJ5IGxvb2t1cC5cbiAgICovXG4gIENBUkRTX1NFU1NJT05fSUQ6ICdDQVJEU19TRVNTSU9OX0lEJyxcblxuICAvKipcbiAgICogQWJzb2x1dGUgcGF0aCB0byB0aGUgVlMgQ29kZSBleHRlbnNpb24gaW5zdGFsbGF0aW9uIGRpcmVjdG9yeS5cbiAgICpcbiAgICogU2V0IGJ5IHRoZSBleHRlbnNpb24gaG9zdCBmcm9tIGBjb250ZXh0LmV4dGVuc2lvblVyaS5mc1BhdGhgIGFuZCBpbmplY3RlZFxuICAgKiBpbnRvIGFsbCBzcGF3bmVkIGFjdGlvbiBwcm9jZXNzZXMuIFVzZSB0aGlzIHRvIGxvY2F0ZSBidW5kbGVkIGFzc2V0cyBzdWNoXG4gICAqIGFzIHRoZSBydW50aW1lIHBsdWdpbiBkaXJlY3RvcnkgKGA8ZXh0ZW5zaW9uUGF0aD4vZGlzdC9wbHVnaW5zL3J1bnRpbWVgKS5cbiAgICpcbiAgICogQXZhaWxhYmxlIGluIGFjdGlvbnMgb25seSAobm90IHR5cGUgaG9va3MpLlxuICAgKi9cbiAgRVhURU5TSU9OX1BBVEg6ICdFWFRFTlNJT05fUEFUSCdcbn0gYXMgY29uc3Q7XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIEluZGl2aWR1YWwgR2V0dGVyc1xuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4vKipcbiAqIFJlYWRzIHRoZSBjYXJkIGlkZW50aWZpZXIgZnJvbSB0aGUgZW52aXJvbm1lbnQuXG4gKlxuICogVGhlIGV4ZWN1dGlvbiB3cmFwcGVyIGFsd2F5cyBzZXRzIHRoaXMgZm9yIGV2ZXJ5IGFjdGlvbiBhbmQgdHlwZSBob29rLlxuICogQHJldHVybnMgVGhlIGN1cnJlbnQgY2FyZCBJRFxuICogQHRocm93cyBFcnJvciBpZiBDQVJEX0lEIGlzIG1pc3Npbmcgb3IgZW1wdHlcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBjb25zdCBjYXJkSWQgPSBnZXRDYXJkSWQoKTtcbiAqIGNvbnNvbGUubG9nKGBQcm9jZXNzaW5nIGNhcmQ6ICR7Y2FyZElkfWApO1xuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRDYXJkSWQoKTogc3RyaW5nIHtcbiAgY29uc3QgdmFsdWUgPSBwcm9jZXNzLmVudltDQVJEU19FTlZfVkFSUy5DQVJEX0lEXTtcbiAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQgfHwgdmFsdWUgPT09ICcnKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIHJlcXVpcmVkIGVudmlyb25tZW50IHZhcmlhYmxlOiAke0NBUkRTX0VOVl9WQVJTLkNBUkRfSUR9YCk7XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG4vKipcbiAqIFJlYWRzIHRoZSBlbnZpcm9ubWVudCBuYW1lIGZyb20gdGhlIGVudmlyb25tZW50LlxuICpcbiAqIFRoaXMgdmFsdWUgbWF0Y2hlcyB0aGUgZW52aXJvbm1lbnQga2V5IGluIHNldHRpbmdzLmpzb24gKGUuZy4sIFwiZGVmYXVsdFwiLCBcInN0YWdpbmdcIikuXG4gKiBAcmV0dXJucyBUaGUgZW52aXJvbm1lbnQgbmFtZVxuICogQHRocm93cyBFcnJvciBpZiBFTlZJUk9OTUVOVCBpcyBtaXNzaW5nIG9yIGVtcHR5XG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogY29uc3QgZW52aXJvbm1lbnQgPSBnZXRFbnZpcm9ubWVudCgpO1xuICogY29uc29sZS5sb2coYEVudmlyb25tZW50OiAke2Vudmlyb25tZW50fWApO1xuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRFbnZpcm9ubWVudCgpOiBzdHJpbmcge1xuICBjb25zdCB2YWx1ZSA9IHByb2Nlc3MuZW52W0NBUkRTX0VOVl9WQVJTLkVOVklST05NRU5UXTtcbiAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQgfHwgdmFsdWUgPT09ICcnKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIHJlcXVpcmVkIGVudmlyb25tZW50IHZhcmlhYmxlOiAke0NBUkRTX0VOVl9WQVJTLkVOVklST05NRU5UfWApO1xuICB9XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuLyoqXG4gKiBSZWFkcyB0aGUgYWN0aW9uIGJ1dHRvbiBuYW1lIGZyb20gdGhlIGVudmlyb25tZW50LlxuICpcbiAqIFRoaXMgaXMgdGhlIGRpc3BsYXkgbmFtZSBvZiB0aGUgYWN0aW9uIHRoYXQgdHJpZ2dlcmVkIHRoZSBoYW5kbGVyLCBtYXRjaGluZ1xuICogdGhlIGBhY3Rpb25OYW1lYCBmaWVsZCBmcm9tIGBkZWZpbmVBY3Rpb25gLlxuICogQHJldHVybnMgRGlzcGxheSBuYW1lIG9mIHRoZSBhY3Rpb24gdGhhdCB0cmlnZ2VyZWQgdGhlIGN1cnJlbnQgaGFuZGxlciBydW4uXG4gKiBAdGhyb3dzIEVycm9yIGlmIEFDVElPTl9OQU1FIGlzIG1pc3Npbmcgb3IgZW1wdHlcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBjb25zdCBhY3Rpb25OYW1lID0gZ2V0QWN0aW9uTmFtZSgpO1xuICogY29uc29sZS5sb2coYFJ1bm5pbmcgYWN0aW9uOiAke2FjdGlvbk5hbWV9YCk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldEFjdGlvbk5hbWUoKTogc3RyaW5nIHtcbiAgY29uc3QgdmFsdWUgPSBwcm9jZXNzLmVudltDQVJEU19FTlZfVkFSUy5BQ1RJT05fTkFNRV07XG4gIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IHZhbHVlID09PSAnJykge1xuICAgIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyByZXF1aXJlZCBlbnZpcm9ubWVudCB2YXJpYWJsZTogJHtDQVJEU19FTlZfVkFSUy5BQ1RJT05fTkFNRX1gKTtcbiAgfVxuICByZXR1cm4gdmFsdWU7XG59XG5cbi8qKlxuICogUmVhZHMgdGhlIGV4ZWN1dGlvbiBtb2RlIGZyb20gdGhlIGVudmlyb25tZW50LlxuICpcbiAqIERldGVybWluZXMgdGhlIFVJIGludGVyYWN0aW9uIG1vZGVsIGZvciBhY3Rpb25zLlxuICogQHJldHVybnMgVGhlIGV4ZWN1dGlvbiBtb2RlICgnaW50ZXJhY3RpdmUnIG9yICdiYWNrZ3JvdW5kJylcbiAqIEB0aHJvd3MgRXJyb3IgaWYgRVhFQ1VUSU9OX01PREUgaXMgbWlzc2luZywgZW1wdHksIG9yIGludmFsaWRcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBjb25zdCBtb2RlID0gZ2V0RXhlY3V0aW9uTW9kZSgpO1xuICogaWYgKG1vZGUgPT09ICdpbnRlcmFjdGl2ZScpIHtcbiAqICAgLy8gU2hvdyB1c2VyIHByb21wdHNcbiAqIH1cbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0RXhlY3V0aW9uTW9kZSgpOiAnaW50ZXJhY3RpdmUnIHwgJ2JhY2tncm91bmQnIHtcbiAgY29uc3QgdmFsdWUgPSBwcm9jZXNzLmVudltDQVJEU19FTlZfVkFSUy5FWEVDVVRJT05fTU9ERV07XG4gIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IHZhbHVlID09PSAnJykge1xuICAgIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyByZXF1aXJlZCBlbnZpcm9ubWVudCB2YXJpYWJsZTogJHtDQVJEU19FTlZfVkFSUy5FWEVDVVRJT05fTU9ERX1gKTtcbiAgfVxuICBpZiAodmFsdWUgIT09ICdpbnRlcmFjdGl2ZScgJiYgdmFsdWUgIT09ICdiYWNrZ3JvdW5kJykge1xuICAgIHRocm93IG5ldyBFcnJvcihgSW52YWxpZCAke0NBUkRTX0VOVl9WQVJTLkVYRUNVVElPTl9NT0RFfTogZXhwZWN0ZWQgJ2ludGVyYWN0aXZlJyBvciAnYmFja2dyb3VuZCcsIGdvdCBcIiR7dmFsdWV9XCJgKTtcbiAgfVxuICByZXR1cm4gdmFsdWU7XG59XG5cbi8qKlxuICogUmVhZHMgdGhlIEFQSSBiYXNlIFVSTCBmcm9tIHRoZSBlbnZpcm9ubWVudC5cbiAqXG4gKiBVc2UgdGhpcyBhcyB0aGUgYmFzZSBmb3IgY29uc3RydWN0aW5nIEFQSSBlbmRwb2ludHMuIFRoZSBVUkwgZG9lcyBub3QgaW5jbHVkZVxuICogYSB0cmFpbGluZyBzbGFzaC5cbiAqIEByZXR1cm5zIEJhc2UgVVJMIHVzZWQgdG8gY29uc3RydWN0IENhcmRzIEFQSSBlbmRwb2ludHMgZm9yIHRoaXMgZXhlY3V0aW9uLlxuICogQHRocm93cyBFcnJvciBpZiBBUElfQkFTRV9VUkwgaXMgbWlzc2luZyBvciBlbXB0eVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGNvbnN0IGFwaVVybCA9IGdldEFwaUJhc2VVcmwoKTtcbiAqIGNvbnN0IGVuZHBvaW50ID0gYCR7YXBpVXJsfS9jYXJkcy8ke2NhcmRJZH1gO1xuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRBcGlCYXNlVXJsKCk6IHN0cmluZyB7XG4gIGNvbnN0IHZhbHVlID0gcHJvY2Vzcy5lbnZbQ0FSRFNfRU5WX1ZBUlMuQVBJX0JBU0VfVVJMXTtcbiAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQgfHwgdmFsdWUgPT09ICcnKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIHJlcXVpcmVkIGVudmlyb25tZW50IHZhcmlhYmxlOiAke0NBUkRTX0VOVl9WQVJTLkFQSV9CQVNFX1VSTH1gKTtcbiAgfVxuICByZXR1cm4gdmFsdWU7XG59XG5cbi8qKlxuICogUmVhZHMgdGhlIEFQSSBhY2Nlc3MgdG9rZW4gZnJvbSB0aGUgZW52aXJvbm1lbnQuXG4gKlxuICogQmVhcmVyIHRva2VuIHZhbGlkIGZvciB0aGUgZHVyYXRpb24gb2YgdGhpcyBhY3Rpb24gb3IgdHlwZSBob29rIGV4ZWN1dGlvbi5cbiAqIEluY2x1ZGUgaW4gQXV0aG9yaXphdGlvbiBoZWFkZXJzIHdoZW4gY2FsbGluZyB0aGUgQ2FyZHMgQVBJLlxuICogQHJldHVybnMgQmVhcmVyIHRva2VuIHRoYXQgYXV0aG9yaXplcyBBUEkgcmVxdWVzdHMgZm9yIHRoaXMgZXhlY3V0aW9uIGNvbnRleHQuXG4gKiBAdGhyb3dzIEVycm9yIGlmIEFQSV9BQ0NFU1NfVE9LRU4gaXMgbWlzc2luZyBvciBlbXB0eVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGNvbnN0IHRva2VuID0gZ2V0QXBpQWNjZXNzVG9rZW4oKTtcbiAqIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZmV0Y2goYXBpVXJsLCB7XG4gKiAgIGhlYWRlcnM6IHsgQXV0aG9yaXphdGlvbjogYEJlYXJlciAke3Rva2VufWAgfVxuICogfSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldEFwaUFjY2Vzc1Rva2VuKCk6IHN0cmluZyB7XG4gIGNvbnN0IHZhbHVlID0gcHJvY2Vzcy5lbnZbQ0FSRFNfRU5WX1ZBUlMuQVBJX0FDQ0VTU19UT0tFTl07XG4gIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IHZhbHVlID09PSAnJykge1xuICAgIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyByZXF1aXJlZCBlbnZpcm9ubWVudCB2YXJpYWJsZTogJHtDQVJEU19FTlZfVkFSUy5BUElfQUNDRVNTX1RPS0VOfWApO1xuICB9XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuLyoqXG4gKiBSZWFkcyB0aGUgY29uZmlndXJlZCBjb2RpbmcgYWdlbnQgaWRlbnRpZmllciBmcm9tIHRoZSBlbnZpcm9ubWVudC5cbiAqXG4gKiBPcHRpb25hbCB2YWx1ZSBmcm9tIGNhcmRzLmNvZGluZ0FnZW50IHNldHRpbmcuIFdoZW4gc2V0LCBpbmRpY2F0ZXMgd2hpY2ggQUlcbiAqIGNvZGluZyBhc3Npc3RhbnQgdGhlIHVzZXIgcHJlZmVycy4gQWN0aW9ucyBjYW4gdXNlIHRoaXMgdG8gY3VzdG9taXplIGJlaGF2aW9yXG4gKiBvciBwcm9tcHRzIGZvciBkaWZmZXJlbnQgYWdlbnRzLlxuICogQHJldHVybnMgVGhlIGNvZGluZyBhZ2VudCBpZGVudGlmaWVyLCBvciB1bmRlZmluZWQgaWYgbm90IHNldFxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGNvbnN0IGNvZGluZ0FnZW50ID0gZ2V0Q29kaW5nQWdlbnQoKTtcbiAqIGlmIChjb2RpbmdBZ2VudCA9PT0gJ2NsYXVkZScpIHtcbiAqICAgLy8gQ3VzdG9taXplIGZvciBDbGF1ZGVcbiAqIH1cbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0Q29kaW5nQWdlbnQoKTogc3RyaW5nIHwgdW5kZWZpbmVkIHtcbiAgY29uc3QgdmFsdWUgPSBwcm9jZXNzLmVudltDQVJEU19FTlZfVkFSUy5DT0RJTkdfQUdFTlRdO1xuICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gJycpIHtcbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuLyoqXG4gKiBSZWFkcyB0aGUgcmVnaXN0ZXJlZCB0eXBlIG5hbWUgZm9yIHR5cGUgaG9va3MuXG4gKlxuICogVGhpcyB2YWx1ZSBpcyBvbmx5IHByZXNlbnQgZm9yIHR5cGUgaG9vayBldmVudHMuXG4gKiBAcmV0dXJucyBUaGUgcmVnaXN0ZXJlZCB0eXBlIG5hbWVcbiAqIEB0aHJvd3MgRXJyb3IgaWYgVFlQRV9OQU1FIGlzIG1pc3Npbmcgb3IgZW1wdHlcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBjb25zdCB0eXBlTmFtZSA9IGdldFR5cGVOYW1lKCk7XG4gKiBjb25zb2xlLmxvZyhgVHlwZTogJHt0eXBlTmFtZX1gKTtcbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0VHlwZU5hbWUoKTogc3RyaW5nIHtcbiAgY29uc3QgdmFsdWUgPSBwcm9jZXNzLmVudltDQVJEU19FTlZfVkFSUy5UWVBFX05BTUVdO1xuICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gJycpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYE1pc3NpbmcgcmVxdWlyZWQgZW52aXJvbm1lbnQgdmFyaWFibGU6ICR7Q0FSRFNfRU5WX1ZBUlMuVFlQRV9OQU1FfWApO1xuICB9XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuLyoqXG4gKiBSZWFkcyB0aGUgdHlwZSB2ZXJzaW9uIGZyb20gdGhlIGVudmlyb25tZW50LlxuICpcbiAqIFRoaXMgdmVyc2lvbiBjb21lcyBmcm9tIHRoZSB0eXBlIGNvbmZpZ3VyYXRpb24gaW4gc2V0dGluZ3MuanNvbi5cbiAqIEByZXR1cm5zIFRoZSB2ZXJzaW9uIHN0cmluZyBmcm9tIHR5cGUgY29uZmlnXG4gKiBAdGhyb3dzIEVycm9yIGlmIFRZUEVfVkVSU0lPTiBpcyBtaXNzaW5nIG9yIGVtcHR5XG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogY29uc3QgdmVyc2lvbiA9IGdldFR5cGVWZXJzaW9uKCk7XG4gKiBjb25zb2xlLmxvZyhgVmVyc2lvbjogJHt2ZXJzaW9ufWApO1xuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRUeXBlVmVyc2lvbigpOiBzdHJpbmcge1xuICBjb25zdCB2YWx1ZSA9IHByb2Nlc3MuZW52W0NBUkRTX0VOVl9WQVJTLlRZUEVfVkVSU0lPTl07XG4gIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IHZhbHVlID09PSAnJykge1xuICAgIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyByZXF1aXJlZCBlbnZpcm9ubWVudCB2YXJpYWJsZTogJHtDQVJEU19FTlZfVkFSUy5UWVBFX1ZFUlNJT059YCk7XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG4vKipcbiAqIFJlYWRzIHRoZSB0eXBlZCBmaWxlIG5hbWUgZm9yIHR5cGUgaG9vayBldmVudHMuXG4gKlxuICogVGhpcyBpcyB0aGUgZmlsZSBuYW1lIHJlbGF0aXZlIHRvIHRoZSB0eXBlIGRpcmVjdG9yeSwgbm90IGEgZnVsbCBwYXRoLlxuICogQHJldHVybnMgVGhlIGZpbGUgbmFtZSB3aXRoaW4gdGhlIHR5cGUgZGlyZWN0b3J5XG4gKiBAdGhyb3dzIEVycm9yIGlmIEZJTEVfTkFNRSBpcyBtaXNzaW5nIG9yIGVtcHR5XG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogY29uc3QgZmlsZU5hbWUgPSBnZXRGaWxlTmFtZSgpO1xuICogY29uc29sZS5sb2coYEZpbGU6ICR7ZmlsZU5hbWV9YCk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldEZpbGVOYW1lKCk6IHN0cmluZyB7XG4gIGNvbnN0IHZhbHVlID0gcHJvY2Vzcy5lbnZbQ0FSRFNfRU5WX1ZBUlMuRklMRV9OQU1FXTtcbiAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQgfHwgdmFsdWUgPT09ICcnKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIHJlcXVpcmVkIGVudmlyb25tZW50IHZhcmlhYmxlOiAke0NBUkRTX0VOVl9WQVJTLkZJTEVfTkFNRX1gKTtcbiAgfVxuICByZXR1cm4gdmFsdWU7XG59XG5cbi8qKlxuICogUmVhZHMgdGhlIGFic29sdXRlIHBhdGggdG8gdGhlIHR5cGVkIGZpbGUuXG4gKlxuICogVGhpcyBpcyB0aGUgZnVsbHkgcmVzb2x2ZWQgcGF0aCBvbiBkaXNrIHByb3ZpZGVkIGJ5IHRoZSBleGVjdXRpb24gd3JhcHBlci5cbiAqIEByZXR1cm5zIFRoZSBmdWxsIHBhdGggdG8gdGhlIGZpbGVcbiAqIEB0aHJvd3MgRXJyb3IgaWYgRklMRV9QQVRIIGlzIG1pc3Npbmcgb3IgZW1wdHlcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBjb25zdCBmaWxlUGF0aCA9IGdldEZpbGVQYXRoKCk7XG4gKiBjb25zb2xlLmxvZyhgUGF0aDogJHtmaWxlUGF0aH1gKTtcbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0RmlsZVBhdGgoKTogc3RyaW5nIHtcbiAgY29uc3QgdmFsdWUgPSBwcm9jZXNzLmVudltDQVJEU19FTlZfVkFSUy5GSUxFX1BBVEhdO1xuICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gJycpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYE1pc3NpbmcgcmVxdWlyZWQgZW52aXJvbm1lbnQgdmFyaWFibGU6ICR7Q0FSRFNfRU5WX1ZBUlMuRklMRV9QQVRIfWApO1xuICB9XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuLyoqXG4gKiBSZWFkcyB0aGUgdHlwZWQgZmlsZSBzaXplIGZyb20gdGhlIGVudmlyb25tZW50LlxuICpcbiAqIFRoZSB2YWx1ZSBpcyBwYXJzZWQgYXMgYSBiYXNlLTEwIGludGVnZXIuXG4gKiBAcmV0dXJucyBUaGUgZmlsZSBzaXplIGluIGJ5dGVzXG4gKiBAdGhyb3dzIEVycm9yIGlmIEZJTEVfU0laRSBpcyBtaXNzaW5nIG9yIG5vdCBhIG51bWJlclxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGNvbnN0IHNpemUgPSBnZXRGaWxlU2l6ZSgpO1xuICogY29uc29sZS5sb2coYFNpemU6ICR7c2l6ZX0gYnl0ZXNgKTtcbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0RmlsZVNpemUoKTogbnVtYmVyIHtcbiAgY29uc3QgdmFsdWUgPSBwcm9jZXNzLmVudltDQVJEU19FTlZfVkFSUy5GSUxFX1NJWkVdO1xuICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gJycpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYE1pc3NpbmcgcmVxdWlyZWQgZW52aXJvbm1lbnQgdmFyaWFibGU6ICR7Q0FSRFNfRU5WX1ZBUlMuRklMRV9TSVpFfWApO1xuICB9XG4gIGNvbnN0IHNpemUgPSBOdW1iZXIucGFyc2VJbnQodmFsdWUsIDEwKTtcbiAgaWYgKE51bWJlci5pc05hTihzaXplKSkge1xuICAgIHRocm93IG5ldyBFcnJvcihgSW52YWxpZCAke0NBUkRTX0VOVl9WQVJTLkZJTEVfU0laRX06IGV4cGVjdGVkIG51bWJlciwgZ290IFwiJHt2YWx1ZX1cImApO1xuICB9XG4gIHJldHVybiBzaXplO1xufVxuXG4vKipcbiAqIFJlYWRzIHRoZSBTSEEyNTYgaGFzaCBmb3IgdGhlIHR5cGVkIGZpbGUgY29udGVudC5cbiAqXG4gKiBVc2VmdWwgZm9yIGRldGVjdGluZyBjb250ZW50IGNoYW5nZXMgd2l0aG91dCByZWFkaW5nIHRoZSBmaWxlIGFnYWluLlxuICogQHJldHVybnMgVGhlIFNIQTI1NiBoYXNoIG9mIHRoZSBjb250ZW50XG4gKiBAdGhyb3dzIEVycm9yIGlmIFNIQTI1NiBpcyBtaXNzaW5nIG9yIGVtcHR5XG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogY29uc3QgaGFzaCA9IGdldFNoYTI1NigpO1xuICogY29uc29sZS5sb2coYEhhc2g6ICR7aGFzaH1gKTtcbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0U2hhMjU2KCk6IHN0cmluZyB7XG4gIGNvbnN0IHZhbHVlID0gcHJvY2Vzcy5lbnZbQ0FSRFNfRU5WX1ZBUlMuU0hBMjU2XTtcbiAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQgfHwgdmFsdWUgPT09ICcnKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIHJlcXVpcmVkIGVudmlyb25tZW50IHZhcmlhYmxlOiAke0NBUkRTX0VOVl9WQVJTLlNIQTI1Nn1gKTtcbiAgfVxuICByZXR1cm4gdmFsdWU7XG59XG5cbi8qKlxuICogUmVhZHMgdGhlIE1JTUUgdHlwZSBmb3IgdGhlIHR5cGVkIGZpbGUgY29udGVudC5cbiAqXG4gKiBQcm92aWRlZCBmb3IgdHlwZSBob29rIGV2ZW50cyBzbyB2YWxpZGF0b3JzIGNhbiBicmFuY2ggb24gY29udGVudCB0eXBlLlxuICogQHJldHVybnMgVGhlIE1JTUUgdHlwZSBvZiB0aGUgY29udGVudFxuICogQHRocm93cyBFcnJvciBpZiBDT05URU5UX1RZUEUgaXMgbWlzc2luZyBvciBlbXB0eVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGNvbnN0IGNvbnRlbnRUeXBlID0gZ2V0Q29udGVudFR5cGUoKTtcbiAqIGNvbnNvbGUubG9nKGBDb250ZW50IHR5cGU6ICR7Y29udGVudFR5cGV9YCk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldENvbnRlbnRUeXBlKCk6IHN0cmluZyB7XG4gIGNvbnN0IHZhbHVlID0gcHJvY2Vzcy5lbnZbQ0FSRFNfRU5WX1ZBUlMuQ09OVEVOVF9UWVBFXTtcbiAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQgfHwgdmFsdWUgPT09ICcnKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIHJlcXVpcmVkIGVudmlyb25tZW50IHZhcmlhYmxlOiAke0NBUkRTX0VOVl9WQVJTLkNPTlRFTlRfVFlQRX1gKTtcbiAgfVxuICByZXR1cm4gdmFsdWU7XG59XG5cbi8qKlxuICogUmVhZHMgdGhlIFZTIENvZGUgYnVuZGxlZCBOb2RlLmpzIGludGVycHJldGVyIHBhdGggZnJvbSB0aGUgZW52aXJvbm1lbnQuXG4gKlxuICogVGhpcyBpcyBzZXQgYnkgdGhlIGV4dGVuc2lvbiBkdXJpbmcgYWN0aXZhdGlvbiBhbmQgaW5qZWN0ZWQgaW50byBhbGxcbiAqIHNwYXduZWQgYWN0aW9uL2hvb2sgcHJvY2Vzc2VzLiBDb25maWd1cmF0aW9uIGF1dGhvcnMgY2FuIHVzZSBpdCB0byBpbnZva2VcbiAqIE5vZGUuanMgd2l0aG91dCByZWx5aW5nIG9uIHRoZSBzeXN0ZW0gUEFUSC5cbiAqXG4gKiBAcmV0dXJucyBUaGUgcGF0aCB0byB0aGUgTm9kZS5qcyBpbnRlcnByZXRlclxuICogQHRocm93cyBFcnJvciBpZiBWU0NPREVfTk9ERSBpcyBtaXNzaW5nIG9yIGVtcHR5XG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogY29uc3Qgbm9kZVBhdGggPSBnZXRWc2NvZGVOb2RlUGF0aCgpO1xuICogZXhlY0ZpbGVTeW5jKG5vZGVQYXRoLCBbJ3NjcmlwdC5qcyddKTtcbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0VnNjb2RlTm9kZVBhdGgoKTogc3RyaW5nIHtcbiAgY29uc3QgdmFsdWUgPSBwcm9jZXNzLmVudltDQVJEU19FTlZfVkFSUy5WU0NPREVfTk9ERV07XG4gIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IHZhbHVlID09PSAnJykge1xuICAgIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyByZXF1aXJlZCBlbnZpcm9ubWVudCB2YXJpYWJsZTogJHtDQVJEU19FTlZfVkFSUy5WU0NPREVfTk9ERX1gKTtcbiAgfVxuICByZXR1cm4gdmFsdWU7XG59XG5cbi8qKlxuICogUmVhZHMgdGhlIFVuaXggZG9tYWluIHNvY2tldCBwYXRoIGZvciBydW50aW1lLXRvLWRpc3BhdGNoZXIgY29tbXVuaWNhdGlvbi5cbiAqXG4gKiBAcmV0dXJucyBVbml4IHNvY2tldCBwYXRoIHVzZWQgdG8gc2VuZCBydW50aW1lIGNvbnRyb2wgbWVzc2FnZXMuXG4gKiBAdGhyb3dzIEVycm9yIGlmIFNPQ0tFVF9QQVRIIGlzIG1pc3Npbmcgb3IgZW1wdHlcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldFNvY2tldFBhdGgoKTogc3RyaW5nIHtcbiAgY29uc3QgdmFsdWUgPSBwcm9jZXNzLmVudltDQVJEU19FTlZfVkFSUy5TT0NLRVRfUEFUSF07XG4gIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IHZhbHVlID09PSAnJykge1xuICAgIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyByZXF1aXJlZCBlbnZpcm9ubWVudCB2YXJpYWJsZTogJHtDQVJEU19FTlZfVkFSUy5TT0NLRVRfUEFUSH1gKTtcbiAgfVxuICByZXR1cm4gdmFsdWU7XG59XG5cbi8qKlxuICogUmVhZHMgdGhlIHBhdGggdG8gdGhlIHN3aXRjaFRvSW50ZXJhY3RpdmUgZGF0YSBmaWxlLlxuICpcbiAqIFRoaXMgaXMgb3B0aW9uYWwgXHUyMDE0IHJldHVybnMgdW5kZWZpbmVkIHdoZW4gbm90IHNldCAoaS5lLiwgdGhlIGFjdGlvblxuICogd2FzIG5vdCByZWxhdW5jaGVkIHZpYSBzd2l0Y2hUb0ludGVyYWN0aXZlKS5cbiAqXG4gKiBAcmV0dXJucyBUaGUgZmlsZSBwYXRoLCBvciB1bmRlZmluZWQgaWYgbm90IHNldFxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0U3dpdGNoVG9JbnRlcmFjdGl2ZURhdGFQYXRoKCk6IHN0cmluZyB8IHVuZGVmaW5lZCB7XG4gIGNvbnN0IHZhbHVlID0gcHJvY2Vzcy5lbnZbQ0FSRFNfRU5WX1ZBUlMuU1dJVENIX1RPX0lOVEVSQUNUSVZFX0RBVEFfUEFUSF07XG4gIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IHZhbHVlID09PSAnJykge1xuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG4vKipcbiAqIFJlYWRzIHRoZSBzZXR0aW5ncyBjb25maWd1cmF0aW9uIGRpcmVjdG9yeSBwYXRoLlxuICpcbiAqIEByZXR1cm5zIEFic29sdXRlIHBhdGggdG8gdGhlIGRpcmVjdG9yeSBjb250YWluaW5nIGdlbmVyYXRlZCBzZXR0aW5ncyBhcnRpZmFjdHMuXG4gKiBAdGhyb3dzIEVycm9yIGlmIENPTkZJR19QQVRIIGlzIG1pc3Npbmcgb3IgZW1wdHlcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldENvbmZpZ1BhdGgoKTogc3RyaW5nIHtcbiAgY29uc3QgdmFsdWUgPSBwcm9jZXNzLmVudltDQVJEU19FTlZfVkFSUy5DT05GSUdfUEFUSF07XG4gIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IHZhbHVlID09PSAnJykge1xuICAgIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyByZXF1aXJlZCBlbnZpcm9ubWVudCB2YXJpYWJsZTogJHtDQVJEU19FTlZfVkFSUy5DT05GSUdfUEFUSH1gKTtcbiAgfVxuICByZXR1cm4gdmFsdWU7XG59XG5cbi8qKlxuICogUmVhZHMgdGhlIHdvcmtzcGFjZSBwYXRoIHNldCBieSB0aGUgYWN0aW9uIGhhbmRsZXIgKGUuZy4sIHRoZSB3b3JrdHJlZSBwYXRoKS5cbiAqXG4gKiBUaGlzIGlzIGZvciBob29rcyBydW5uaW5nIGluc2lkZSB0aGUgQ2xhdWRlIENMSSwgKipub3QqKiBmb3IgYWN0aW9uIGhhbmRsZXJzLlxuICogQWN0aW9uIGhhbmRsZXJzIHNob3VsZCB1c2Uge0BsaW5rIGdldFJlcG9Sb290fSBpbnN0ZWFkLlxuICpcbiAqIEByZXR1cm5zIEFic29sdXRlIHBhdGggdG8gdGhlIGFjdGl2ZSB3b3Jrc3BhY2UgLyB3b3JrdHJlZS5cbiAqIEB0aHJvd3MgRXJyb3IgaWYgV09SS1NQQUNFX1BBVEggaXMgbWlzc2luZyBvciBlbXB0eVxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0V29ya3NwYWNlUGF0aCgpOiBzdHJpbmcge1xuICBjb25zdCB2YWx1ZSA9IHByb2Nlc3MuZW52W0NBUkRTX0VOVl9WQVJTLldPUktTUEFDRV9QQVRIXTtcbiAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQgfHwgdmFsdWUgPT09ICcnKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIHJlcXVpcmVkIGVudmlyb25tZW50IHZhcmlhYmxlOiAke0NBUkRTX0VOVl9WQVJTLldPUktTUEFDRV9QQVRIfWApO1xuICB9XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuLyoqXG4gKiBSZWFkcyB0aGUgbWFpbiBnaXQgcmVwb3NpdG9yeSByb290IHBhdGguXG4gKlxuICogU2V0IGJ5IEFjdGlvbkRpc3BhdGNoZXI7IHVzZWQgYnkgYWN0aW9uIGhhbmRsZXJzIHRvIHJlc29sdmUgd29ya3RyZWVzXG4gKiBhbmQgcGVyZm9ybSBnaXQgb3BlcmF0aW9ucyBhZ2FpbnN0IHRoZSBtYWluIHJlcG9zaXRvcnkuXG4gKlxuICogQHJldHVybnMgQWJzb2x1dGUgcGF0aCB0byB0aGUgbWFpbiBnaXQgcmVwb3NpdG9yeSByb290IChOT1QgYSB3b3JrdHJlZSkuXG4gKiBAdGhyb3dzIEVycm9yIGlmIFJFUE9fUk9PVCBpcyBtaXNzaW5nIG9yIGVtcHR5XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRSZXBvUm9vdCgpOiBzdHJpbmcge1xuICBjb25zdCB2YWx1ZSA9IHByb2Nlc3MuZW52W0NBUkRTX0VOVl9WQVJTLlJFUE9fUk9PVF07XG4gIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IHZhbHVlID09PSAnJykge1xuICAgIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyByZXF1aXJlZCBlbnZpcm9ubWVudCB2YXJpYWJsZTogJHtDQVJEU19FTlZfVkFSUy5SRVBPX1JPT1R9YCk7XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG4vKipcbiAqIFJlYWRzIHRoZSBjYXJkJ3MgcmVwb3NpdG9yeSBkaXJlY3RvcnkgcGF0aC5cbiAqXG4gKiBAcmV0dXJucyBBYnNvbHV0ZSBwYXRoIHRvIHRoZSByZXBvc2l0b3J5IGFzc29jaWF0ZWQgd2l0aCB0aGUgYWN0aXZlIGNhcmQuXG4gKiBAdGhyb3dzIEVycm9yIGlmIENBUkRfUkVQT19QQVRIIGlzIG1pc3Npbmcgb3IgZW1wdHlcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldENhcmRSZXBvUGF0aCgpOiBzdHJpbmcge1xuICBjb25zdCB2YWx1ZSA9IHByb2Nlc3MuZW52W0NBUkRTX0VOVl9WQVJTLkNBUkRfUkVQT19QQVRIXTtcbiAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQgfHwgdmFsdWUgPT09ICcnKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIHJlcXVpcmVkIGVudmlyb25tZW50IHZhcmlhYmxlOiAke0NBUkRTX0VOVl9WQVJTLkNBUkRfUkVQT19QQVRIfWApO1xuICB9XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuLyoqXG4gKiBSZWFkcyB0aGUgVlMgQ29kZSBleHRlbnNpb24gaW5zdGFsbGF0aW9uIGRpcmVjdG9yeSBwYXRoLlxuICpcbiAqIFNldCBieSB0aGUgZXh0ZW5zaW9uIGhvc3QgZnJvbSBgY29udGV4dC5leHRlbnNpb25VcmkuZnNQYXRoYCBhbmQgaW5qZWN0ZWRcbiAqIGludG8gYWxsIHNwYXduZWQgYWN0aW9uIHByb2Nlc3Nlcy4gVXNlIHRoaXMgdG8gbG9jYXRlIGJ1bmRsZWQgYXNzZXRzIHN1Y2hcbiAqIGFzIHRoZSBydW50aW1lIHBsdWdpbiBkaXJlY3RvcnkgKGA8ZXh0ZW5zaW9uUGF0aD4vZGlzdC9wbHVnaW5zL3J1bnRpbWVgKS5cbiAqXG4gKiBAcmV0dXJucyBBYnNvbHV0ZSBwYXRoIHRvIHRoZSBleHRlbnNpb24gaW5zdGFsbGF0aW9uIGRpcmVjdG9yeS5cbiAqIEB0aHJvd3MgRXJyb3IgaWYgRVhURU5TSU9OX1BBVEggaXMgbWlzc2luZyBvciBlbXB0eVxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0RXh0ZW5zaW9uUGF0aCgpOiBzdHJpbmcge1xuICBjb25zdCB2YWx1ZSA9IHByb2Nlc3MuZW52W0NBUkRTX0VOVl9WQVJTLkVYVEVOU0lPTl9QQVRIXTtcbiAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQgfHwgdmFsdWUgPT09ICcnKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIHJlcXVpcmVkIGVudmlyb25tZW50IHZhcmlhYmxlOiAke0NBUkRTX0VOVl9WQVJTLkVYVEVOU0lPTl9QQVRIfWApO1xuICB9XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuLyoqXG4gKiBSZWFkcyBhbmQgcGFyc2VzIHRoZSBzd2l0Y2hUb0ludGVyYWN0aXZlIGRhdGEgZmlsZS5cbiAqXG4gKiBXaGVuIGBTV0lUQ0hfVE9fSU5URVJBQ1RJVkVfREFUQV9QQVRIYCBpcyBzZXQsIHJlYWRzIHRoZSBmaWxlIGF0IHRoYXQgcGF0aFxuICogYW5kIHBhcnNlcyBpdCBhcyBKU09OLiBSZXR1cm5zIHVuZGVmaW5lZCBpZiB0aGUgZW52IHZhciBpcyBub3Qgc2V0LlxuICpcbiAqIEByZXR1cm5zIFRoZSBwYXJzZWQgZGF0YSwgb3IgdW5kZWZpbmVkIGlmIHRoZSBwYXRoIGlzIG5vdCBzZXRcbiAqIEB0aHJvd3MgRXJyb3IgaWYgdGhlIGZpbGUgY2Fubm90IGJlIHJlYWQgb3IgY29udGFpbnMgaW52YWxpZCBKU09OXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiByZWFkU3dpdGNoVG9JbnRlcmFjdGl2ZURhdGEoKTogdW5rbm93biB8IHVuZGVmaW5lZCB7XG4gIGNvbnN0IGRhdGFQYXRoID0gZ2V0U3dpdGNoVG9JbnRlcmFjdGl2ZURhdGFQYXRoKCk7XG4gIGlmIChkYXRhUGF0aCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfVxuICBjb25zdCBjb250ZW50ID0gcmVhZEZpbGVTeW5jKGRhdGFQYXRoLCAndXRmLTgnKTtcbiAgcmV0dXJuIEpTT04ucGFyc2UoY29udGVudCk7XG59XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIFR5cGVkIElucHV0IEV4dHJhY3Rpb25cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuLyoqXG4gKiBCdWlsZHMgYSB0eXBlZCBhY3Rpb24gaW5wdXQgb2JqZWN0IGZyb20gZW52aXJvbm1lbnQgdmFyaWFibGVzLlxuICpcbiAqIEV4dHJhY3RzIGFsbCBmaWVsZHMgcmVxdWlyZWQgZm9yIGFjdGlvbiBoYW5kbGVycy5cbiAqXG4gKiBAcmV0dXJucyBUeXBlZCBBY3Rpb25JbnB1dCBvYmplY3RcbiAqIEB0aHJvd3MgRXJyb3IgaWYgcmVxdWlyZWQgZW52IHZhcnMgYXJlIG1pc3Npbmcgb3IgaW52YWxpZFxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIC8vIEZvciBhbiBhY3Rpb24gaGFuZGxlclxuICogY29uc3QgaW5wdXQgPSBleHRyYWN0QWN0aW9uSW5wdXQoKTtcbiAqIGNvbnNvbGUubG9nKGlucHV0LmNhcmRJZCk7XG4gKiBjb25zb2xlLmxvZyhpbnB1dC5leGVjdXRpb25Nb2RlKTtcbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gZXh0cmFjdEFjdGlvbklucHV0KCk6IEFjdGlvbklucHV0IHtcbiAgcmV0dXJuIHtcbiAgICBjYXJkSWQ6IGdldENhcmRJZCgpLFxuICAgIGFjdGlvbk5hbWU6IGdldEFjdGlvbk5hbWUoKSxcbiAgICBlbnZpcm9ubWVudDogZ2V0RW52aXJvbm1lbnQoKSxcbiAgICBleGVjdXRpb25Nb2RlOiBnZXRFeGVjdXRpb25Nb2RlKCksXG4gICAgYXBpQmFzZVVybDogZ2V0QXBpQmFzZVVybCgpLFxuICAgIGFwaUFjY2Vzc1Rva2VuOiBnZXRBcGlBY2Nlc3NUb2tlbigpLFxuICAgIGNvZGluZ0FnZW50OiBnZXRDb2RpbmdBZ2VudCgpLFxuICAgIHN3aXRjaFRvSW50ZXJhY3RpdmVEYXRhOiByZWFkU3dpdGNoVG9JbnRlcmFjdGl2ZURhdGEoKSxcbiAgICByZXBvUm9vdDogZ2V0UmVwb1Jvb3QoKSxcbiAgICBjYXJkUmVwb1BhdGg6IGdldENhcmRSZXBvUGF0aCgpLFxuICAgIGNvbmZpZ1BhdGg6IGdldENvbmZpZ1BhdGgoKSxcbiAgICBleHRlbnNpb25QYXRoOiBnZXRFeHRlbnNpb25QYXRoKClcbiAgfTtcbn1cblxuLyoqXG4gKiBCdWlsZHMgYSB0eXBlZCB0eXBlIGhvb2sgaW5wdXQgb2JqZWN0IGZyb20gZW52aXJvbm1lbnQgdmFyaWFibGVzLlxuICpcbiAqIEV4dHJhY3RzIGFsbCBmaWVsZHMgcmVxdWlyZWQgZm9yIHR5cGUgbGlmZWN5Y2xlIGhvb2tzICh2YWxpZGF0b3IsIGNyZWF0ZSxcbiAqIHVwZGF0ZSwgZGVsZXRlKS5cbiAqXG4gKiBAcmV0dXJucyBUeXBlZCBUeXBlSG9va0lucHV0IG9iamVjdFxuICogQHRocm93cyBFcnJvciBpZiByZXF1aXJlZCBlbnYgdmFycyBhcmUgbWlzc2luZyBvciBpbnZhbGlkXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogLy8gRm9yIGEgdHlwZSBob29rIGhhbmRsZXJcbiAqIGNvbnN0IGlucHV0ID0gZXh0cmFjdFR5cGVJbnB1dCgpO1xuICogY29uc29sZS5sb2coaW5wdXQudHlwZU5hbWUpO1xuICogY29uc29sZS5sb2coaW5wdXQuZmlsZU5hbWUpO1xuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBleHRyYWN0VHlwZUlucHV0KCk6IFR5cGVIb29rSW5wdXQge1xuICByZXR1cm4ge1xuICAgIGNhcmRJZDogZ2V0Q2FyZElkKCksXG4gICAgZW52aXJvbm1lbnQ6IGdldEVudmlyb25tZW50KCksXG4gICAgdHlwZU5hbWU6IGdldFR5cGVOYW1lKCksXG4gICAgdHlwZVZlcnNpb246IGdldFR5cGVWZXJzaW9uKCksXG4gICAgZmlsZU5hbWU6IGdldEZpbGVOYW1lKCksXG4gICAgZmlsZVBhdGg6IGdldEZpbGVQYXRoKCksXG4gICAgZmlsZVNpemU6IGdldEZpbGVTaXplKCksXG4gICAgZmlsZVNoYTI1NjogZ2V0U2hhMjU2KCksXG4gICAgY29udGVudFR5cGU6IGdldENvbnRlbnRUeXBlKCksXG4gICAgYXBpQmFzZVVybDogZ2V0QXBpQmFzZVVybCgpLFxuICAgIGFwaUFjY2Vzc1Rva2VuOiBnZXRBcGlBY2Nlc3NUb2tlbigpXG4gIH07XG59XG4iLCAiLyoqXG4gKiBFbnZpcm9ubWVudCB2YXJpYWJsZSB1dGlsaXRpZXMgZm9yIENsYXVkZSBDb2RlIGhvb2tzLlxuICpcbiAqIFByb3ZpZGVzIHR5cGVkIGFjY2VzcyB0byBDbGF1ZGUgQ29kZSdzIGVudmlyb25tZW50IHZhcmlhYmxlcyBhbmQgdXRpbGl0aWVzXG4gKiBmb3IgcGVyc2lzdGluZyBlbnZpcm9ubWVudCB2YXJpYWJsZXMgaW4gU2Vzc2lvblN0YXJ0IGhvb2tzLlxuICpcbiAqICMjIEVudmlyb25tZW50IFZhcmlhYmxlc1xuICpcbiAqIENsYXVkZSBDb2RlIHNldHMgdGhlc2UgZW52aXJvbm1lbnQgdmFyaWFibGVzIHdoZW4gcnVubmluZyBob29rczpcbiAqXG4gKiB8IFZhcmlhYmxlIHwgRGVzY3JpcHRpb24gfCBBdmFpbGFibGUgSW4gfFxuICogfC0tLS0tLS0tLS18LS0tLS0tLS0tLS0tLXwtLS0tLS0tLS0tLS0tLXxcbiAqIHwgYENMQVVERV9QUk9KRUNUX0RJUmAgfCBBYnNvbHV0ZSBwYXRoIHRvIHByb2plY3Qgcm9vdCB8IEFsbCBob29rcyB8XG4gKiB8IGBDTEFVREVfRU5WX0ZJTEVgIHwgUGF0aCB0byBmaWxlIGZvciBwZXJzaXN0aW5nIGVudiB2YXJzIHwgU2Vzc2lvblN0YXJ0IG9ubHkgfFxuICogfCBgQ0xBVURFX0NPREVfUkVNT1RFYCB8IGBcInRydWVcImAgaWYgcnVubmluZyByZW1vdGVseSB8IEFsbCBob29rcyB8XG4gKiBAbW9kdWxlXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogaW1wb3J0IHsgZ2V0UHJvamVjdERpciwgcGVyc2lzdEVudlZhciwgaXNSZW1vdGVFbnZpcm9ubWVudCB9IGZyb20gJ0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcyc7XG4gKlxuICogLy8gR2V0IHByb2plY3QgZGlyZWN0b3J5XG4gKiBjb25zdCBwcm9qZWN0RGlyID0gZ2V0UHJvamVjdERpcigpO1xuICpcbiAqIC8vIENoZWNrIGlmIHJ1bm5pbmcgcmVtb3RlbHlcbiAqIGlmIChpc1JlbW90ZUVudmlyb25tZW50KCkpIHtcbiAqICAgLy8gSGFuZGxlIHJlbW90ZS1zcGVjaWZpYyBsb2dpY1xuICogfVxuICpcbiAqIC8vIEluIFNlc3Npb25TdGFydCBob29rOiBwZXJzaXN0IGVudmlyb25tZW50IHZhcmlhYmxlc1xuICogcGVyc2lzdEVudlZhcignTk9ERV9FTlYnLCAncHJvZHVjdGlvbicpO1xuICogcGVyc2lzdEVudlZhcignQVBJX0tFWScsICdzZWNyZXQta2V5Jyk7XG4gKiBgYGBcbiAqIEBzZWUgaHR0cHM6Ly9jb2RlLmNsYXVkZS5jb20vZG9jcy9lbi9ob29rcyNob29rLWV4ZWN1dGlvbi1kZXRhaWxzXG4gKi9cbmltcG9ydCAqIGFzIGZzIGZyb20gXCJub2RlOmZzXCI7XG4vKipcbiAqIENsYXVkZSBDb2RlIGVudmlyb25tZW50IHZhcmlhYmxlIG5hbWVzLlxuICpcbiAqIFRoZXNlIGFyZSB0aGUgZW52aXJvbm1lbnQgdmFyaWFibGVzIHRoYXQgQ2xhdWRlIENvZGUgc2V0cyB3aGVuIHJ1bm5pbmcgaG9va3MuXG4gKi9cbmV4cG9ydCBjb25zdCBDTEFVREVfRU5WX1ZBUlMgPSB7XG4gICAgLyoqXG4gICAgICogQWJzb2x1dGUgcGF0aCB0byB0aGUgcHJvamVjdCByb290IGRpcmVjdG9yeSB3aGVyZSBDbGF1ZGUgQ29kZSB3YXMgc3RhcnRlZC5cbiAgICAgKiBBdmFpbGFibGUgaW4gYWxsIGhvb2tzLlxuICAgICAqL1xuICAgIFBST0pFQ1RfRElSOiBcIkNMQVVERV9QUk9KRUNUX0RJUlwiLFxuICAgIC8qKlxuICAgICAqIFBhdGggdG8gYSBmaWxlIHdoZXJlIFNlc3Npb25TdGFydCBob29rcyBjYW4gcGVyc2lzdCBlbnZpcm9ubWVudCB2YXJpYWJsZXMuXG4gICAgICogVmFyaWFibGVzIHdyaXR0ZW4gdG8gdGhpcyBmaWxlIHdpbGwgYmUgYXZhaWxhYmxlIGluIGFsbCBzdWJzZXF1ZW50IGJhc2ggY29tbWFuZHMuXG4gICAgICogT25seSBhdmFpbGFibGUgaW4gU2Vzc2lvblN0YXJ0IGhvb2tzLlxuICAgICAqL1xuICAgIEVOVl9GSUxFOiBcIkNMQVVERV9FTlZfRklMRVwiLFxuICAgIC8qKlxuICAgICAqIFNldCB0byBcInRydWVcIiB3aGVuIHJ1bm5pbmcgaW4gYSByZW1vdGUgKHdlYikgZW52aXJvbm1lbnQuXG4gICAgICogTm90IHNldCBvciBlbXB0eSB3aGVuIHJ1bm5pbmcgaW4gbG9jYWwgQ0xJIGVudmlyb25tZW50LlxuICAgICAqL1xuICAgIFJFTU9URTogXCJDTEFVREVfQ09ERV9SRU1PVEVcIixcbn07XG4vKipcbiAqIEdldHMgdGhlIENsYXVkZSBDb2RlIHByb2plY3QgZGlyZWN0b3J5LlxuICpcbiAqIFRoaXMgaXMgdGhlIGFic29sdXRlIHBhdGggdG8gdGhlIHByb2plY3Qgcm9vdCB3aGVyZSBDbGF1ZGUgQ29kZSB3YXMgc3RhcnRlZC5cbiAqIFRoZSB2YWx1ZSBjb21lcyBmcm9tIHRoZSBgQ0xBVURFX1BST0pFQ1RfRElSYCBlbnZpcm9ubWVudCB2YXJpYWJsZS5cbiAqIEByZXR1cm5zIFRoZSBwcm9qZWN0IGRpcmVjdG9yeSBwYXRoLCBvciB1bmRlZmluZWQgaWYgbm90IHNldFxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGNvbnN0IHByb2plY3REaXIgPSBnZXRQcm9qZWN0RGlyKCk7XG4gKiBpZiAocHJvamVjdERpcikge1xuICogICBjb25zdCBjb25maWdQYXRoID0gYCR7cHJvamVjdERpcn0vLmNsYXVkZS9jb25maWcuanNvbmA7XG4gKiB9XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldFByb2plY3REaXIoKSB7XG4gICAgcmV0dXJuIHByb2Nlc3MuZW52W0NMQVVERV9FTlZfVkFSUy5QUk9KRUNUX0RJUl07XG59XG4vKipcbiAqIEdldHMgdGhlIENsYXVkZSBDb2RlIGVudiBmaWxlIHBhdGggZm9yIHBlcnNpc3RpbmcgZW52aXJvbm1lbnQgdmFyaWFibGVzLlxuICpcbiAqIFRoaXMgaXMgb25seSBhdmFpbGFibGUgaW4gU2Vzc2lvblN0YXJ0IGhvb2tzLiBUaGUgcGF0aCBwb2ludHMgdG8gYSBmaWxlXG4gKiB3aGVyZSB5b3UgY2FuIHdyaXRlIHNoZWxsIGV4cG9ydCBzdGF0ZW1lbnRzIHRvIHBlcnNpc3QgZW52aXJvbm1lbnQgdmFyaWFibGVzXG4gKiBmb3IgYWxsIHN1YnNlcXVlbnQgYmFzaCBjb21tYW5kcyBpbiB0aGUgc2Vzc2lvbi5cbiAqIEByZXR1cm5zIFRoZSBlbnYgZmlsZSBwYXRoLCBvciB1bmRlZmluZWQgaWYgbm90IHNldCAobm90IGEgU2Vzc2lvblN0YXJ0IGhvb2spXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogY29uc3QgZW52RmlsZSA9IGdldEVudkZpbGVQYXRoKCk7XG4gKiBpZiAoZW52RmlsZSkge1xuICogICAvLyBXZSdyZSBpbiBhIFNlc3Npb25TdGFydCBob29rIGFuZCBjYW4gcGVyc2lzdCBlbnYgdmFyc1xuICogICBwZXJzaXN0RW52VmFyKCdNWV9WQVInLCAnbXktdmFsdWUnKTtcbiAqIH1cbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0RW52RmlsZVBhdGgoKSB7XG4gICAgcmV0dXJuIHByb2Nlc3MuZW52W0NMQVVERV9FTlZfVkFSUy5FTlZfRklMRV07XG59XG4vKipcbiAqIENoZWNrcyBpZiB0aGUgaG9vayBpcyBydW5uaW5nIGluIGEgcmVtb3RlICh3ZWIpIGVudmlyb25tZW50LlxuICpcbiAqIFJlbW90ZSBlbnZpcm9ubWVudHMgbWF5IGhhdmUgZGlmZmVyZW50IGNhcGFiaWxpdGllcyBvciByZXN0cmljdGlvbnNcbiAqIGNvbXBhcmVkIHRvIGxvY2FsIENMSSBlbnZpcm9ubWVudHMuXG4gKiBAcmV0dXJucyB0cnVlIGlmIHJ1bm5pbmcgcmVtb3RlbHksIGZhbHNlIGlmIHJ1bm5pbmcgbG9jYWxseVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGlmIChpc1JlbW90ZUVudmlyb25tZW50KCkpIHtcbiAqICAgLy8gVXNlIHdlYi1jb21wYXRpYmxlIGFwcHJvYWNoZXNcbiAqIH0gZWxzZSB7XG4gKiAgIC8vIENhbiB1c2UgbG9jYWwgQ0xJIGZlYXR1cmVzXG4gKiB9XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzUmVtb3RlRW52aXJvbm1lbnQoKSB7XG4gICAgcmV0dXJuIHByb2Nlc3MuZW52W0NMQVVERV9FTlZfVkFSUy5SRU1PVEVdID09PSBcInRydWVcIjtcbn1cbi8qKlxuICogUGVyc2lzdHMgYW4gZW52aXJvbm1lbnQgdmFyaWFibGUgZm9yIHVzZSBpbiBzdWJzZXF1ZW50IGJhc2ggY29tbWFuZHMuXG4gKlxuICogVGhpcyBmdW5jdGlvbiB3cml0ZXMgYSBzaGVsbCBleHBvcnQgc3RhdGVtZW50IHRvIHRoZSBgQ0xBVURFX0VOVl9GSUxFYCxcbiAqIHdoaWNoIENsYXVkZSBDb2RlIHNvdXJjZXMgYmVmb3JlIHJ1bm5pbmcgYmFzaCBjb21tYW5kcy4gVGhpcyBhbGxvd3NcbiAqIFNlc3Npb25TdGFydCBob29rcyB0byBjb25maWd1cmUgdGhlIGVudmlyb25tZW50IGZvciB0aGUgZW50aXJlIHNlc3Npb24uXG4gKlxuICogKipJbXBvcnRhbnQqKjogVGhpcyBmdW5jdGlvbiBvbmx5IHdvcmtzIGluIFNlc3Npb25TdGFydCBob29rcyB3aGVyZVxuICogYENMQVVERV9FTlZfRklMRWAgaXMgc2V0LiBJbiBvdGhlciBob29rcywgaXQgd2lsbCB0aHJvdyBhbiBlcnJvci5cbiAqIEBwYXJhbSBuYW1lIC0gVGhlIGVudmlyb25tZW50IHZhcmlhYmxlIG5hbWVcbiAqIEBwYXJhbSB2YWx1ZSAtIFRoZSBlbnZpcm9ubWVudCB2YXJpYWJsZSB2YWx1ZSAod2lsbCBiZSBzaGVsbC1lc2NhcGVkKVxuICogQHRocm93cyBFcnJvciBpZiBDTEFVREVfRU5WX0ZJTEUgaXMgbm90IHNldCAobm90IGluIGEgU2Vzc2lvblN0YXJ0IGhvb2spXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogaW1wb3J0IHsgc2Vzc2lvblN0YXJ0SG9vaywgc2Vzc2lvblN0YXJ0T3V0cHV0LCBwZXJzaXN0RW52VmFyIH0gZnJvbSAnQGdvb2Rmb290L2NsYXVkZS1jb2RlLWhvb2tzJztcbiAqXG4gKiBleHBvcnQgZGVmYXVsdCBzZXNzaW9uU3RhcnRIb29rKHt9LCBhc3luYyAoaW5wdXQpID0+IHtcbiAqICAgLy8gUGVyc2lzdCBlbnZpcm9ubWVudCB2YXJpYWJsZXMgZm9yIHRoZSBzZXNzaW9uXG4gKiAgIHBlcnNpc3RFbnZWYXIoJ05PREVfRU5WJywgJ3Byb2R1Y3Rpb24nKTtcbiAqICAgcGVyc2lzdEVudlZhcignQVBJX0tFWScsIHByb2Nlc3MuZW52Lk1ZX0FQSV9LRVkgPz8gJ2RlZmF1bHQnKTtcbiAqICAgcGVyc2lzdEVudlZhcignUEFUSCcsIGAke3Byb2Nlc3MuZW52LlBBVEh9Oi4vbm9kZV9tb2R1bGVzLy5iaW5gKTtcbiAqXG4gKiAgIHJldHVybiBzZXNzaW9uU3RhcnRPdXRwdXQoe30pO1xuICogfSk7XG4gKiBgYGBcbiAqIEBzZWUgaHR0cHM6Ly9jb2RlLmNsYXVkZS5jb20vZG9jcy9lbi9ob29rcyNwZXJzaXN0aW5nLWVudmlyb25tZW50LXZhcmlhYmxlc1xuICovXG5leHBvcnQgZnVuY3Rpb24gcGVyc2lzdEVudlZhcihuYW1lLCB2YWx1ZSkge1xuICAgIGNvbnN0IGVudkZpbGUgPSBnZXRFbnZGaWxlUGF0aCgpO1xuICAgIGlmIChlbnZGaWxlID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwicGVyc2lzdEVudlZhciBjYW4gb25seSBiZSB1c2VkIGluIFNlc3Npb25TdGFydCBob29rcy4gXCIgKyBcIkNMQVVERV9FTlZfRklMRSBlbnZpcm9ubWVudCB2YXJpYWJsZSBpcyBub3Qgc2V0LlwiKTtcbiAgICB9XG4gICAgLy8gU2hlbGwtZXNjYXBlIHRoZSB2YWx1ZSB0byBoYW5kbGUgc3BlY2lhbCBjaGFyYWN0ZXJzXG4gICAgY29uc3QgZXNjYXBlZFZhbHVlID0gZXNjYXBlU2hlbGxWYWx1ZSh2YWx1ZSk7XG4gICAgLy8gV3JpdGUgdGhlIGV4cG9ydCBzdGF0ZW1lbnRcbiAgICBjb25zdCBleHBvcnRTdGF0ZW1lbnQgPSBgZXhwb3J0ICR7bmFtZX09JHtlc2NhcGVkVmFsdWV9XFxuYDtcbiAgICBmcy5hcHBlbmRGaWxlU3luYyhlbnZGaWxlLCBleHBvcnRTdGF0ZW1lbnQsIFwidXRmLThcIik7XG59XG4vKipcbiAqIFBlcnNpc3RzIG11bHRpcGxlIGVudmlyb25tZW50IHZhcmlhYmxlcyBhdCBvbmNlLlxuICpcbiAqIFRoaXMgaXMgYSBjb252ZW5pZW5jZSB3cmFwcGVyIGFyb3VuZCBgcGVyc2lzdEVudlZhcmAgZm9yIHNldHRpbmdcbiAqIG11bHRpcGxlIHZhcmlhYmxlcyBpbiBhIHNpbmdsZSBjYWxsLlxuICogQHBhcmFtIHZhcnMgLSBPYmplY3QgbWFwcGluZyB2YXJpYWJsZSBuYW1lcyB0byB2YWx1ZXNcbiAqIEB0aHJvd3MgRXJyb3IgaWYgQ0xBVURFX0VOVl9GSUxFIGlzIG5vdCBzZXQgKG5vdCBpbiBhIFNlc3Npb25TdGFydCBob29rKVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIHBlcnNpc3RFbnZWYXJzKHtcbiAqICAgTk9ERV9FTlY6ICdwcm9kdWN0aW9uJyxcbiAqICAgQVBJX0tFWTogJ3NlY3JldCcsXG4gKiAgIERFQlVHOiAnZmFsc2UnXG4gKiB9KTtcbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gcGVyc2lzdEVudlZhcnModmFycykge1xuICAgIGZvciAoY29uc3QgW25hbWUsIHZhbHVlXSBvZiBPYmplY3QuZW50cmllcyh2YXJzKSkge1xuICAgICAgICBwZXJzaXN0RW52VmFyKG5hbWUsIHZhbHVlKTtcbiAgICB9XG59XG4vKipcbiAqIEVzY2FwZXMgYSB2YWx1ZSBmb3Igc2FmZSB1c2UgaW4gYSBzaGVsbCBleHBvcnQgc3RhdGVtZW50LlxuICpcbiAqIFVzZXMgc2luZ2xlIHF1b3RlcyBhbmQgZXNjYXBlcyBhbnkgZW1iZWRkZWQgc2luZ2xlIHF1b3Rlcy5cbiAqIFRoaXMgcHJldmVudHMgc2hlbGwgaW5qZWN0aW9uIGFuZCBoYW5kbGVzIHNwZWNpYWwgY2hhcmFjdGVycy5cbiAqIEBwYXJhbSB2YWx1ZSAtIFRoZSB2YWx1ZSB0byBlc2NhcGVcbiAqIEByZXR1cm5zIFRoZSBzaGVsbC1lc2NhcGVkIHZhbHVlICh3aXRoIHF1b3RlcylcbiAqIEBpbnRlcm5hbFxuICovXG5mdW5jdGlvbiBlc2NhcGVTaGVsbFZhbHVlKHZhbHVlKSB7XG4gICAgLy8gVXNlIHNpbmdsZSBxdW90ZXMgYW5kIGVzY2FwZSBhbnkgZW1iZWRkZWQgc2luZ2xlIHF1b3Rlc1xuICAgIC8vICd2YWx1ZScgLT4gJ3ZhbCdcXCcndWUnIGZvciB2YWx1ZXMgY29udGFpbmluZyBzaW5nbGUgcXVvdGVzXG4gICAgY29uc3QgZXNjYXBlZCA9IHZhbHVlLnJlcGxhY2UoLycvZywgXCInXFxcXCcnXCIpO1xuICAgIHJldHVybiBgJyR7ZXNjYXBlZH0nYDtcbn1cbiIsICIvKipcbiAqIEhvb2sgZmFjdG9yeSBmdW5jdGlvbnMgZm9yIENsYXVkZSBDb2RlIGhvb2tzLlxuICpcbiAqIFByb3ZpZGVzIHR5cGVkIGZhY3RvcnkgZnVuY3Rpb25zIGZvciBhbGwgMTIgaG9vayB0eXBlcyB0aGF0IGhhbmRsZTpcbiAqIC0gSW5wdXQgdHlwZSBuYXJyb3dpbmcgYmFzZWQgb24gaG9vayBldmVudCB0eXBlXG4gKiAtIE91dHB1dCB0eXBlIGVuZm9yY2VtZW50IHZpYSByZXR1cm4gdHlwZXNcbiAqIC0gRXJyb3Igd3JhcHBpbmcgd2l0aCBhdXRvbWF0aWMgbG9nZ2luZ1xuICogLSBMb2dnZXIgY29udGV4dCBpbmplY3Rpb25cbiAqXG4gKiBFYWNoIGZhY3RvcnkgYWNjZXB0cyBhIEhvb2tDb25maWcgd2l0aCBvcHRpb25hbCBtYXRjaGVyIGFuZCB0aW1lb3V0IHNldHRpbmdzLFxuICogYW5kIHJldHVybnMgYSBmdW5jdGlvbiB0aGF0IHRoZSBydW50aW1lIGludm9rZXMgd2hlbiB0aGUgaG9vayBmaWxlIGV4ZWN1dGVzLlxuICogQG1vZHVsZVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGltcG9ydCB7IHByZVRvb2xVc2VIb29rLCBwcmVUb29sVXNlT3V0cHV0IH0gZnJvbSAnQGdvb2Rmb290L2NsYXVkZS1jb2RlLWhvb2tzJztcbiAqXG4gKiBleHBvcnQgZGVmYXVsdCBwcmVUb29sVXNlSG9vayh7IG1hdGNoZXI6ICdCYXNoJyB9LCBhc3luYyAoaW5wdXQsIHsgbG9nZ2VyIH0pID0+IHtcbiAqICAgbG9nZ2VyLmluZm8oJ1Byb2Nlc3NpbmcgQmFzaCBjb21tYW5kJyk7XG4gKiAgIHJldHVybiBwcmVUb29sVXNlT3V0cHV0KHsgYWxsb3c6IHRydWUgfSk7XG4gKiB9KTtcbiAqIGBgYFxuICogQHNlZSBodHRwczovL2NvZGUuY2xhdWRlLmNvbS9kb2NzL2VuL2hvb2tzXG4gKi9cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIEdlbmVyaWMgRmFjdG9yeVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLyoqXG4gKiBDcmVhdGVzIGEgaG9vayBmYWN0b3J5IGZ1bmN0aW9uIGZvciBhIHNwZWNpZmljIGhvb2sgdHlwZS5cbiAqXG4gKiBUaGlzIGlzIHRoZSBpbnRlcm5hbCBpbXBsZW1lbnRhdGlvbiB1c2VkIGJ5IGFsbCB0eXBlZCBmYWN0b3JpZXMuXG4gKiBJdCB3cmFwcyB0aGUgaGFuZGxlciB3aXRoIGVycm9yIGNhdGNoaW5nIGFuZCBsb2dnaW5nLlxuICogQHBhcmFtIGhvb2tFdmVudE5hbWUgLSBUaGUgaG9vayBldmVudCBuYW1lXG4gKiBAcGFyYW0gY29uZmlnIC0gSG9vayBjb25maWd1cmF0aW9uXG4gKiBAcGFyYW0gaGFuZGxlciAtIFRoZSBoYW5kbGVyIGZ1bmN0aW9uIHRvIHdyYXBcbiAqIEByZXR1cm5zIEEgd3JhcHBlZCBob29rIGZ1bmN0aW9uXG4gKiBAaW50ZXJuYWxcbiAqL1xuZnVuY3Rpb24gY3JlYXRlSG9va0Z1bmN0aW9uKGhvb2tFdmVudE5hbWUsIGNvbmZpZywgaGFuZGxlcikge1xuICAgIGNvbnN0IGhvb2tGbiA9IGFzeW5jIChpbnB1dCwgY29udGV4dCkgPT4ge1xuICAgICAgICAvLyBEZWxlZ2F0ZSBlcnJvciBoYW5kbGluZyB0byB0aGUgcnVudGltZSAtIGp1c3QgZXhlY3V0ZSB0aGUgaGFuZGxlclxuICAgICAgICAvLyBUaGUgcnVudGltZSB3aWxsIGNhdGNoIGVycm9ycywgbG9nIHRoZW0sIGFuZCByZXR1cm4gYXBwcm9wcmlhdGUgb3V0cHV0XG4gICAgICAgIHJldHVybiBhd2FpdCBoYW5kbGVyKGlucHV0LCBjb250ZXh0KTtcbiAgICB9O1xuICAgIC8vIEF0dGFjaCBtZXRhZGF0YSBmb3IgcnVudGltZSBpbnNwZWN0aW9uXG4gICAgaG9va0ZuLmhvb2tFdmVudE5hbWUgPSBob29rRXZlbnROYW1lO1xuICAgIGhvb2tGbi5tYXRjaGVyID0gY29uZmlnLm1hdGNoZXI7XG4gICAgaG9va0ZuLnRpbWVvdXQgPSBjb25maWcudGltZW91dDtcbiAgICByZXR1cm4gaG9va0ZuO1xufVxuLyoqIEBpbmhlcml0ZG9jICovXG5leHBvcnQgZnVuY3Rpb24gcHJlVG9vbFVzZUhvb2soY29uZmlnLCBoYW5kbGVyKSB7XG4gICAgcmV0dXJuIGNyZWF0ZUhvb2tGdW5jdGlvbihcIlByZVRvb2xVc2VcIiwgY29uZmlnLCBoYW5kbGVyKTtcbn1cbi8qKiBAaW5oZXJpdGRvYyAqL1xuZXhwb3J0IGZ1bmN0aW9uIHBvc3RUb29sVXNlSG9vayhjb25maWcsIGhhbmRsZXIpIHtcbiAgICByZXR1cm4gY3JlYXRlSG9va0Z1bmN0aW9uKFwiUG9zdFRvb2xVc2VcIiwgY29uZmlnLCBoYW5kbGVyKTtcbn1cbi8qKiBAaW5oZXJpdGRvYyAqL1xuZXhwb3J0IGZ1bmN0aW9uIHBvc3RUb29sVXNlRmFpbHVyZUhvb2soY29uZmlnLCBoYW5kbGVyKSB7XG4gICAgcmV0dXJuIGNyZWF0ZUhvb2tGdW5jdGlvbihcIlBvc3RUb29sVXNlRmFpbHVyZVwiLCBjb25maWcsIGhhbmRsZXIpO1xufVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gTm90aWZpY2F0aW9uIEhvb2sgRmFjdG9yeVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLyoqXG4gKiBDcmVhdGVzIGEgTm90aWZpY2F0aW9uIGhvb2sgaGFuZGxlci5cbiAqXG4gKiBOb3RpZmljYXRpb24gaG9va3MgZmlyZSB3aGVuIENsYXVkZSBDb2RlIHNlbmRzIGEgbm90aWZpY2F0aW9uLCBhbGxvd2luZyB5b3UgdG86XG4gKiAtIEZvcndhcmQgbm90aWZpY2F0aW9ucyB0byBleHRlcm5hbCBzeXN0ZW1zXG4gKiAtIExvZyBpbXBvcnRhbnQgZXZlbnRzXG4gKiAtIFRyaWdnZXIgY3VzdG9tIGFsZXJ0aW5nXG4gKlxuICogKipNYXRjaGVyKio6IE1hdGNoZXMgYWdhaW5zdCBgbm90aWZpY2F0aW9uX3R5cGVgXG4gKiBAcGFyYW0gY29uZmlnIC0gSG9vayBjb25maWd1cmF0aW9uIHdpdGggb3B0aW9uYWwgbWF0Y2hlciBhbmQgdGltZW91dFxuICogQHBhcmFtIGhhbmRsZXIgLSBUaGUgaGFuZGxlciBmdW5jdGlvbiB0byBleGVjdXRlXG4gKiBAcmV0dXJucyBBIGhvb2sgZnVuY3Rpb24gdGhhdCBjYW4gYmUgZXhwb3J0ZWQgYXMgdGhlIGRlZmF1bHQgZXhwb3J0XG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogaW1wb3J0IHsgbm90aWZpY2F0aW9uSG9vaywgbm90aWZpY2F0aW9uT3V0cHV0IH0gZnJvbSAnQGdvb2Rmb290L2NsYXVkZS1jb2RlLWhvb2tzJztcbiAqXG4gKiAvLyBGb3J3YXJkIG5vdGlmaWNhdGlvbnMgdG8gU2xhY2tcbiAqIGV4cG9ydCBkZWZhdWx0IG5vdGlmaWNhdGlvbkhvb2soe30sIGFzeW5jIChpbnB1dCwgeyBsb2dnZXIgfSkgPT4ge1xuICogICBsb2dnZXIuaW5mbygnTm90aWZpY2F0aW9uIHJlY2VpdmVkJywge1xuICogICAgIHR5cGU6IGlucHV0Lm5vdGlmaWNhdGlvbl90eXBlLFxuICogICAgIHRpdGxlOiBpbnB1dC50aXRsZVxuICogICB9KTtcbiAqXG4gKiAgIGF3YWl0IHNlbmRTbGFja01lc3NhZ2UoaW5wdXQudGl0bGUgPz8gJ05vdGlmaWNhdGlvbicsIGlucHV0Lm1lc3NhZ2UpO1xuICpcbiAqICAgcmV0dXJuIG5vdGlmaWNhdGlvbk91dHB1dCh7fSk7XG4gKiB9KTtcbiAqIGBgYFxuICogQHNlZSBodHRwczovL2NvZGUuY2xhdWRlLmNvbS9kb2NzL2VuL2hvb2tzI25vdGlmaWNhdGlvblxuICovXG5leHBvcnQgZnVuY3Rpb24gbm90aWZpY2F0aW9uSG9vayhjb25maWcsIGhhbmRsZXIpIHtcbiAgICByZXR1cm4gY3JlYXRlSG9va0Z1bmN0aW9uKFwiTm90aWZpY2F0aW9uXCIsIGNvbmZpZywgaGFuZGxlcik7XG59XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBVc2VyUHJvbXB0U3VibWl0IEhvb2sgRmFjdG9yeVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLyoqXG4gKiBDcmVhdGVzIGEgVXNlclByb21wdFN1Ym1pdCBob29rIGhhbmRsZXIuXG4gKlxuICogVXNlclByb21wdFN1Ym1pdCBob29rcyBmaXJlIHdoZW4gYSB1c2VyIHN1Ym1pdHMgYSBwcm9tcHQsIGFsbG93aW5nIHlvdSB0bzpcbiAqIC0gQWRkIGFkZGl0aW9uYWwgY29udGV4dCBvciBpbnN0cnVjdGlvbnNcbiAqIC0gTG9nIHVzZXIgaW50ZXJhY3Rpb25zXG4gKiAtIFZhbGlkYXRlIG9yIHRyYW5zZm9ybSBwcm9tcHRzXG4gKlxuICogKipNYXRjaGVyKio6IE5vIG1hdGNoZXIgc3VwcG9ydCAtIGZpcmVzIG9uIGFsbCBwcm9tcHQgc3VibWlzc2lvbnNcbiAqIEBwYXJhbSBjb25maWcgLSBIb29rIGNvbmZpZ3VyYXRpb24gd2l0aCBvcHRpb25hbCB0aW1lb3V0IChtYXRjaGVyIGlzIGlnbm9yZWQpXG4gKiBAcGFyYW0gaGFuZGxlciAtIFRoZSBoYW5kbGVyIGZ1bmN0aW9uIHRvIGV4ZWN1dGVcbiAqIEByZXR1cm5zIEEgaG9vayBmdW5jdGlvbiB0aGF0IGNhbiBiZSBleHBvcnRlZCBhcyB0aGUgZGVmYXVsdCBleHBvcnRcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBpbXBvcnQgeyB1c2VyUHJvbXB0U3VibWl0SG9vaywgdXNlclByb21wdFN1Ym1pdE91dHB1dCB9IGZyb20gJ0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcyc7XG4gKlxuICogLy8gQWRkIHByb2plY3QgY29udGV4dCB0byBldmVyeSBwcm9tcHRcbiAqIGV4cG9ydCBkZWZhdWx0IHVzZXJQcm9tcHRTdWJtaXRIb29rKHt9LCBhc3luYyAoaW5wdXQsIHsgbG9nZ2VyIH0pID0+IHtcbiAqICAgbG9nZ2VyLmRlYnVnKCdVc2VyIHByb21wdCBzdWJtaXR0ZWQnLCB7IHByb21wdExlbmd0aDogaW5wdXQucHJvbXB0Lmxlbmd0aCB9KTtcbiAqXG4gKiAgIGNvbnN0IHByb2plY3RDb250ZXh0ID0gYXdhaXQgZ2V0UHJvamVjdENvbnRleHQoKTtcbiAqXG4gKiAgIHJldHVybiB1c2VyUHJvbXB0U3VibWl0T3V0cHV0KHtcbiAqICAgICBhZGRpdGlvbmFsQ29udGV4dDogcHJvamVjdENvbnRleHRcbiAqICAgfSk7XG4gKiB9KTtcbiAqIGBgYFxuICogQHNlZSBodHRwczovL2NvZGUuY2xhdWRlLmNvbS9kb2NzL2VuL2hvb2tzI3VzZXJwcm9tcHRzdWJtaXRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHVzZXJQcm9tcHRTdWJtaXRIb29rKGNvbmZpZywgaGFuZGxlcikge1xuICAgIHJldHVybiBjcmVhdGVIb29rRnVuY3Rpb24oXCJVc2VyUHJvbXB0U3VibWl0XCIsIGNvbmZpZywgaGFuZGxlcik7XG59XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBTZXNzaW9uU3RhcnQgSG9vayBGYWN0b3J5XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vKipcbiAqIENyZWF0ZXMgYSBTZXNzaW9uU3RhcnQgaG9vayBoYW5kbGVyLlxuICpcbiAqIFNlc3Npb25TdGFydCBob29rcyBmaXJlIHdoZW4gYSBDbGF1ZGUgQ29kZSBzZXNzaW9uIHN0YXJ0cyBvciByZXN0YXJ0cyxcbiAqIGFsbG93aW5nIHlvdSB0bzpcbiAqIC0gSW5pdGlhbGl6ZSBzZXNzaW9uIHN0YXRlXG4gKiAtIEluamVjdCBjb250ZXh0IG9yIGluc3RydWN0aW9uc1xuICogLSBQZXJzaXN0IGVudmlyb25tZW50IHZhcmlhYmxlcyBmb3Igc3Vic2VxdWVudCBiYXNoIGNvbW1hbmRzXG4gKiAtIFNldCB1cCBsb2dnaW5nIG9yIG1vbml0b3JpbmdcbiAqXG4gKiAqKk1hdGNoZXIqKjogTWF0Y2hlcyBhZ2FpbnN0IGBzb3VyY2VgICgnc3RhcnR1cCcsICdyZXN1bWUnLCAnY2xlYXInLCAnY29tcGFjdCcpXG4gKlxuICogKipDb250ZXh0Kio6IFNlc3Npb25TdGFydCBob29rcyByZWNlaXZlIGFuIGV4dGVuZGVkIGNvbnRleHQgd2l0aCBgcGVyc2lzdEVudlZhcmBcbiAqIGFuZCBgcGVyc2lzdEVudlZhcnNgIGZ1bmN0aW9ucyBmb3Igc2V0dGluZyBlbnZpcm9ubWVudCB2YXJpYWJsZXMuXG4gKiBAcGFyYW0gY29uZmlnIC0gSG9vayBjb25maWd1cmF0aW9uIHdpdGggb3B0aW9uYWwgbWF0Y2hlciBhbmQgdGltZW91dFxuICogQHBhcmFtIGhhbmRsZXIgLSBUaGUgaGFuZGxlciBmdW5jdGlvbiB0byBleGVjdXRlXG4gKiBAcmV0dXJucyBBIGhvb2sgZnVuY3Rpb24gdGhhdCBjYW4gYmUgZXhwb3J0ZWQgYXMgdGhlIGRlZmF1bHQgZXhwb3J0XG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogaW1wb3J0IHsgc2Vzc2lvblN0YXJ0SG9vaywgc2Vzc2lvblN0YXJ0T3V0cHV0IH0gZnJvbSAnQGdvb2Rmb290L2NsYXVkZS1jb2RlLWhvb2tzJztcbiAqXG4gKiAvLyBQZXJzaXN0IGVudmlyb25tZW50IHZhcmlhYmxlcyBmb3IgdGhlIHNlc3Npb25cbiAqIGV4cG9ydCBkZWZhdWx0IHNlc3Npb25TdGFydEhvb2soeyBtYXRjaGVyOiAnc3RhcnR1cCcgfSwgYXN5bmMgKGlucHV0LCB7IGxvZ2dlciwgcGVyc2lzdEVudlZhciB9KSA9PiB7XG4gKiAgIGxvZ2dlci5pbmZvKCdOZXcgc2Vzc2lvbiBzdGFydGVkJywge1xuICogICAgIHNlc3Npb25JZDogaW5wdXQuc2Vzc2lvbl9pZCxcbiAqICAgICBjd2Q6IGlucHV0LmN3ZFxuICogICB9KTtcbiAqXG4gKiAgIC8vIFNldCBlbnZpcm9ubWVudCB2YXJpYWJsZXMgZm9yIGFsbCBzdWJzZXF1ZW50IGJhc2ggY29tbWFuZHNcbiAqICAgcGVyc2lzdEVudlZhcignTk9ERV9FTlYnLCAnZGV2ZWxvcG1lbnQnKTtcbiAqICAgcGVyc2lzdEVudlZhcignREVCVUcnLCAndHJ1ZScpO1xuICpcbiAqICAgcmV0dXJuIHNlc3Npb25TdGFydE91dHB1dCh7fSk7XG4gKiB9KTtcbiAqIGBgYFxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIC8vIFNldCBtdWx0aXBsZSBlbnZpcm9ubWVudCB2YXJpYWJsZXMgYXQgb25jZVxuICogZXhwb3J0IGRlZmF1bHQgc2Vzc2lvblN0YXJ0SG9vayh7fSwgYXN5bmMgKGlucHV0LCB7IHBlcnNpc3RFbnZWYXJzIH0pID0+IHtcbiAqICAgcGVyc2lzdEVudlZhcnMoe1xuICogICAgIE5PREVfRU5WOiAncHJvZHVjdGlvbicsXG4gKiAgICAgQVBJX0tFWTogJ3NlY3JldCcsXG4gKiAgICAgREVCVUc6ICdmYWxzZSdcbiAqICAgfSk7XG4gKlxuICogICByZXR1cm4gc2Vzc2lvblN0YXJ0T3V0cHV0KHt9KTtcbiAqIH0pO1xuICogYGBgXG4gKiBAc2VlIGh0dHBzOi8vY29kZS5jbGF1ZGUuY29tL2RvY3MvZW4vaG9va3Mjc2Vzc2lvbnN0YXJ0XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzZXNzaW9uU3RhcnRIb29rKGNvbmZpZywgaGFuZGxlcikge1xuICAgIHJldHVybiBjcmVhdGVIb29rRnVuY3Rpb24oXCJTZXNzaW9uU3RhcnRcIiwgY29uZmlnLCBoYW5kbGVyKTtcbn1cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIFNlc3Npb25FbmQgSG9vayBGYWN0b3J5XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vKipcbiAqIENyZWF0ZXMgYSBTZXNzaW9uRW5kIGhvb2sgaGFuZGxlci5cbiAqXG4gKiBTZXNzaW9uRW5kIGhvb2tzIGZpcmUgd2hlbiBhIENsYXVkZSBDb2RlIHNlc3Npb24gZW5kcywgYWxsb3dpbmcgeW91IHRvOlxuICogLSBDbGVhbiB1cCBzZXNzaW9uIHJlc291cmNlc1xuICogLSBMb2cgc2Vzc2lvbiBtZXRyaWNzXG4gKiAtIFBlcnNpc3Qgc2Vzc2lvbiBzdGF0ZVxuICpcbiAqICoqTWF0Y2hlcioqOiBNYXRjaGVzIGFnYWluc3QgYHJlYXNvbmAgKHRoZSBleGl0IHJlYXNvbiBzdHJpbmcpXG4gKiBAcGFyYW0gY29uZmlnIC0gSG9vayBjb25maWd1cmF0aW9uIHdpdGggb3B0aW9uYWwgbWF0Y2hlciBhbmQgdGltZW91dFxuICogQHBhcmFtIGhhbmRsZXIgLSBUaGUgaGFuZGxlciBmdW5jdGlvbiB0byBleGVjdXRlXG4gKiBAcmV0dXJucyBBIGhvb2sgZnVuY3Rpb24gdGhhdCBjYW4gYmUgZXhwb3J0ZWQgYXMgdGhlIGRlZmF1bHQgZXhwb3J0XG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogaW1wb3J0IHsgc2Vzc2lvbkVuZEhvb2ssIHNlc3Npb25FbmRPdXRwdXQgfSBmcm9tICdAZ29vZGZvb3QvY2xhdWRlLWNvZGUtaG9va3MnO1xuICpcbiAqIC8vIExvZyBzZXNzaW9uIGVuZCBhbmQgY2xlYW4gdXBcbiAqIGV4cG9ydCBkZWZhdWx0IHNlc3Npb25FbmRIb29rKHt9LCBhc3luYyAoaW5wdXQsIHsgbG9nZ2VyIH0pID0+IHtcbiAqICAgbG9nZ2VyLmluZm8oJ1Nlc3Npb24gZW5kZWQnLCB7XG4gKiAgICAgc2Vzc2lvbklkOiBpbnB1dC5zZXNzaW9uX2lkLFxuICogICAgIHJlYXNvbjogaW5wdXQucmVhc29uXG4gKiAgIH0pO1xuICpcbiAqICAgYXdhaXQgY2xlYW51cFNlc3Npb25SZXNvdXJjZXMoaW5wdXQuc2Vzc2lvbl9pZCk7XG4gKlxuICogICByZXR1cm4gc2Vzc2lvbkVuZE91dHB1dCh7fSk7XG4gKiB9KTtcbiAqIGBgYFxuICogQHNlZSBodHRwczovL2NvZGUuY2xhdWRlLmNvbS9kb2NzL2VuL2hvb2tzI3Nlc3Npb25lbmRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHNlc3Npb25FbmRIb29rKGNvbmZpZywgaGFuZGxlcikge1xuICAgIHJldHVybiBjcmVhdGVIb29rRnVuY3Rpb24oXCJTZXNzaW9uRW5kXCIsIGNvbmZpZywgaGFuZGxlcik7XG59XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBTdG9wIEhvb2sgRmFjdG9yeVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLyoqXG4gKiBDcmVhdGVzIGEgU3RvcCBob29rIGhhbmRsZXIuXG4gKlxuICogU3RvcCBob29rcyBmaXJlIHdoZW4gQ2xhdWRlIENvZGUgaXMgYWJvdXQgdG8gc3RvcCwgYWxsb3dpbmcgeW91IHRvOlxuICogLSBCbG9jayB0aGUgc3RvcCBhbmQgcmVxdWlyZSBhZGRpdGlvbmFsIGFjdGlvblxuICogLSBDb25maXJtIHRoZSB1c2VyIHdhbnRzIHRvIHN0b3BcbiAqIC0gQ2xlYW4gdXAgcmVzb3VyY2VzIGJlZm9yZSBzdG9wcGluZ1xuICpcbiAqICoqTWF0Y2hlcioqOiBObyBtYXRjaGVyIHN1cHBvcnQgLSBmaXJlcyBvbiBhbGwgc3RvcCBldmVudHNcbiAqIEBwYXJhbSBjb25maWcgLSBIb29rIGNvbmZpZ3VyYXRpb24gd2l0aCBvcHRpb25hbCB0aW1lb3V0IChtYXRjaGVyIGlzIGlnbm9yZWQpXG4gKiBAcGFyYW0gaGFuZGxlciAtIFRoZSBoYW5kbGVyIGZ1bmN0aW9uIHRvIGV4ZWN1dGVcbiAqIEByZXR1cm5zIEEgaG9vayBmdW5jdGlvbiB0aGF0IGNhbiBiZSBleHBvcnRlZCBhcyB0aGUgZGVmYXVsdCBleHBvcnRcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBpbXBvcnQgeyBzdG9wSG9vaywgc3RvcE91dHB1dCB9IGZyb20gJ0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcyc7XG4gKlxuICogLy8gQmxvY2sgc3RvcCBpZiB0aGVyZSBhcmUgcGVuZGluZyBjaGFuZ2VzXG4gKiBleHBvcnQgZGVmYXVsdCBzdG9wSG9vayh7fSwgYXN5bmMgKGlucHV0LCB7IGxvZ2dlciB9KSA9PiB7XG4gKiAgIGNvbnN0IHBlbmRpbmdDaGFuZ2VzID0gYXdhaXQgY2hlY2tQZW5kaW5nQ2hhbmdlcygpO1xuICpcbiAqICAgaWYgKHBlbmRpbmdDaGFuZ2VzLmxlbmd0aCA+IDApIHtcbiAqICAgICBsb2dnZXIud2FybignQmxvY2tpbmcgc3RvcCBkdWUgdG8gcGVuZGluZyBjaGFuZ2VzJywge1xuICogICAgICAgY291bnQ6IHBlbmRpbmdDaGFuZ2VzLmxlbmd0aFxuICogICAgIH0pO1xuICpcbiAqICAgICByZXR1cm4gc3RvcE91dHB1dCh7XG4gKiAgICAgICBkZWNpc2lvbjogJ2Jsb2NrJyxcbiAqICAgICAgIHJlYXNvbjogYFRoZXJlIGFyZSAke3BlbmRpbmdDaGFuZ2VzLmxlbmd0aH0gdW5jb21taXR0ZWQgY2hhbmdlc2AsXG4gKiAgICAgICBzeXN0ZW1NZXNzYWdlOiAnUGxlYXNlIGNvbW1pdCBvciBkaXNjYXJkIGNoYW5nZXMgYmVmb3JlIHN0b3BwaW5nJ1xuICogICAgIH0pO1xuICogICB9XG4gKlxuICogICBsb2dnZXIuaW5mbygnQXBwcm92aW5nIHN0b3AnKTtcbiAqICAgcmV0dXJuIHN0b3BPdXRwdXQoeyBkZWNpc2lvbjogJ2FwcHJvdmUnIH0pO1xuICogfSk7XG4gKiBgYGBcbiAqIEBzZWUgaHR0cHM6Ly9jb2RlLmNsYXVkZS5jb20vZG9jcy9lbi9ob29rcyNzdG9wXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzdG9wSG9vayhjb25maWcsIGhhbmRsZXIpIHtcbiAgICByZXR1cm4gY3JlYXRlSG9va0Z1bmN0aW9uKFwiU3RvcFwiLCBjb25maWcsIGhhbmRsZXIpO1xufVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gU3RvcEZhaWx1cmUgSG9vayBGYWN0b3J5XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vKipcbiAqIENyZWF0ZXMgYSBTdG9wRmFpbHVyZSBob29rIGhhbmRsZXIuXG4gKlxuICogU3RvcEZhaWx1cmUgaG9va3MgZmlyZSB3aGVuIENsYXVkZSBDb2RlIGVuY291bnRlcnMgYW4gZXJyb3Igd2hpbGUgc3RvcHBpbmdcbiAqIChlLmcuLCBBUEkgZXJyb3JzLCBhdXRoZW50aWNhdGlvbiBmYWlsdXJlcywgcmF0ZSBsaW1pdHMpLCBhbGxvd2luZyB5b3UgdG86XG4gKiAtIExvZyBzdG9wIGZhaWx1cmUgZXZlbnRzIGFuZCBlcnJvciBkZXRhaWxzXG4gKiAtIEFsZXJ0IG9uIHVuZXhwZWN0ZWQgc2Vzc2lvbiB0ZXJtaW5hdGlvbiBlcnJvcnNcbiAqIC0gT2JzZXJ2ZSB3aGF0IGVycm9yIGNhdXNlZCB0aGUgZmFpbHVyZVxuICpcbiAqICoqTWF0Y2hlcioqOiBObyBtYXRjaGVyIHN1cHBvcnQgLSBmaXJlcyBvbiBhbGwgc3RvcCBmYWlsdXJlIGV2ZW50c1xuICogQHBhcmFtIGNvbmZpZyAtIEhvb2sgY29uZmlndXJhdGlvbiB3aXRoIG9wdGlvbmFsIHRpbWVvdXQgKG1hdGNoZXIgaXMgaWdub3JlZClcbiAqIEBwYXJhbSBoYW5kbGVyIC0gVGhlIGhhbmRsZXIgZnVuY3Rpb24gdG8gZXhlY3V0ZVxuICogQHJldHVybnMgQSBob29rIGZ1bmN0aW9uIHRoYXQgY2FuIGJlIGV4cG9ydGVkIGFzIHRoZSBkZWZhdWx0IGV4cG9ydFxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGltcG9ydCB7IHN0b3BGYWlsdXJlSG9vaywgc3RvcEZhaWx1cmVPdXRwdXQgfSBmcm9tICdAZ29vZGZvb3QvY2xhdWRlLWNvZGUtaG9va3MnO1xuICpcbiAqIGV4cG9ydCBkZWZhdWx0IHN0b3BGYWlsdXJlSG9vayh7fSwgYXN5bmMgKGlucHV0LCB7IGxvZ2dlciB9KSA9PiB7XG4gKiAgIGxvZ2dlci5lcnJvcignU2Vzc2lvbiBzdG9wcGVkIGR1ZSB0byBlcnJvcicsIHtcbiAqICAgICBlcnJvcjogaW5wdXQuZXJyb3IsXG4gKiAgICAgZGV0YWlsczogaW5wdXQuZXJyb3JfZGV0YWlsc1xuICogICB9KTtcbiAqICAgcmV0dXJuIHN0b3BGYWlsdXJlT3V0cHV0KHt9KTtcbiAqIH0pO1xuICogYGBgXG4gKiBAc2VlIGh0dHBzOi8vY29kZS5jbGF1ZGUuY29tL2RvY3MvZW4vaG9va3Mjc3RvcGZhaWx1cmVcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHN0b3BGYWlsdXJlSG9vayhjb25maWcsIGhhbmRsZXIpIHtcbiAgICByZXR1cm4gY3JlYXRlSG9va0Z1bmN0aW9uKFwiU3RvcEZhaWx1cmVcIiwgY29uZmlnLCBoYW5kbGVyKTtcbn1cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIFN1YmFnZW50U3RhcnQgSG9vayBGYWN0b3J5XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vKipcbiAqIENyZWF0ZXMgYSBTdWJhZ2VudFN0YXJ0IGhvb2sgaGFuZGxlci5cbiAqXG4gKiBTdWJhZ2VudFN0YXJ0IGhvb2tzIGZpcmUgd2hlbiBhIHN1YmFnZW50IChBZ2VudCB0b29sKSBzdGFydHMsIGFsbG93aW5nIHlvdSB0bzpcbiAqIC0gSW5qZWN0IGNvbnRleHQgZm9yIHRoZSBzdWJhZ2VudFxuICogLSBMb2cgc3ViYWdlbnQgaW52b2NhdGlvbnNcbiAqIC0gQ29uZmlndXJlIHN1YmFnZW50IGJlaGF2aW9yXG4gKlxuICogKipNYXRjaGVyKio6IE1hdGNoZXMgYWdhaW5zdCBgYWdlbnRfdHlwZWAgKGUuZy4sICdleHBsb3JlJywgJ2NvZGViYXNlLWFuYWx5c2lzJylcbiAqIEBwYXJhbSBjb25maWcgLSBIb29rIGNvbmZpZ3VyYXRpb24gd2l0aCBvcHRpb25hbCBtYXRjaGVyIGFuZCB0aW1lb3V0XG4gKiBAcGFyYW0gaGFuZGxlciAtIFRoZSBoYW5kbGVyIGZ1bmN0aW9uIHRvIGV4ZWN1dGVcbiAqIEByZXR1cm5zIEEgaG9vayBmdW5jdGlvbiB0aGF0IGNhbiBiZSBleHBvcnRlZCBhcyB0aGUgZGVmYXVsdCBleHBvcnRcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBpbXBvcnQgeyBzdWJhZ2VudFN0YXJ0SG9vaywgc3ViYWdlbnRTdGFydE91dHB1dCB9IGZyb20gJ0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcyc7XG4gKlxuICogLy8gQWRkIGNvbnRleHQgZm9yIGV4cGxvcmUgc3ViYWdlbnRzXG4gKiBleHBvcnQgZGVmYXVsdCBzdWJhZ2VudFN0YXJ0SG9vayh7IG1hdGNoZXI6ICdleHBsb3JlJyB9LCBhc3luYyAoaW5wdXQsIHsgbG9nZ2VyIH0pID0+IHtcbiAqICAgbG9nZ2VyLmluZm8oJ0V4cGxvcmUgc3ViYWdlbnQgc3RhcnRpbmcnLCB7XG4gKiAgICAgYWdlbnRJZDogaW5wdXQuYWdlbnRfaWQsXG4gKiAgICAgYWdlbnRUeXBlOiBpbnB1dC5hZ2VudF90eXBlXG4gKiAgIH0pO1xuICpcbiAqICAgcmV0dXJuIHN1YmFnZW50U3RhcnRPdXRwdXQoe1xuICogICAgIGFkZGl0aW9uYWxDb250ZXh0OiAnRm9jdXMgb24gZmluZGluZyBwYXR0ZXJucyBhbmQgY29udmVudGlvbnMnXG4gKiAgIH0pO1xuICogfSk7XG4gKiBgYGBcbiAqIEBzZWUgaHR0cHM6Ly9jb2RlLmNsYXVkZS5jb20vZG9jcy9lbi9ob29rcyNzdWJhZ2VudHN0YXJ0XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzdWJhZ2VudFN0YXJ0SG9vayhjb25maWcsIGhhbmRsZXIpIHtcbiAgICByZXR1cm4gY3JlYXRlSG9va0Z1bmN0aW9uKFwiU3ViYWdlbnRTdGFydFwiLCBjb25maWcsIGhhbmRsZXIpO1xufVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gU3ViYWdlbnRTdG9wIEhvb2sgRmFjdG9yeVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLyoqXG4gKiBDcmVhdGVzIGEgU3ViYWdlbnRTdG9wIGhvb2sgaGFuZGxlci5cbiAqXG4gKiBTdWJhZ2VudFN0b3AgaG9va3MgZmlyZSB3aGVuIGEgc3ViYWdlbnQgY29tcGxldGVzIG9yIHN0b3BzLCBhbGxvd2luZyB5b3UgdG86XG4gKiAtIEJsb2NrIHRoZSBzdWJhZ2VudCBmcm9tIHN0b3BwaW5nXG4gKiAtIFByb2Nlc3Mgc3ViYWdlbnQgcmVzdWx0c1xuICogLSBDbGVhbiB1cCBzdWJhZ2VudCByZXNvdXJjZXNcbiAqIC0gTG9nIHN1YmFnZW50IGNvbXBsZXRpb25cbiAqXG4gKiAqKk1hdGNoZXIqKjogTWF0Y2hlcyBhZ2FpbnN0IGBhZ2VudF90eXBlYCAoZS5nLiwgJ2V4cGxvcmUnLCAnY29kZWJhc2UtYW5hbHlzaXMnKVxuICogQHBhcmFtIGNvbmZpZyAtIEhvb2sgY29uZmlndXJhdGlvbiB3aXRoIG9wdGlvbmFsIG1hdGNoZXIgYW5kIHRpbWVvdXRcbiAqIEBwYXJhbSBoYW5kbGVyIC0gVGhlIGhhbmRsZXIgZnVuY3Rpb24gdG8gZXhlY3V0ZVxuICogQHJldHVybnMgQSBob29rIGZ1bmN0aW9uIHRoYXQgY2FuIGJlIGV4cG9ydGVkIGFzIHRoZSBkZWZhdWx0IGV4cG9ydFxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGltcG9ydCB7IHN1YmFnZW50U3RvcEhvb2ssIHN1YmFnZW50U3RvcE91dHB1dCB9IGZyb20gJ0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcyc7XG4gKlxuICogLy8gQmxvY2sgZXhwbG9yZSBzdWJhZ2VudHMgaWYgdGFzayBpbmNvbXBsZXRlXG4gKiBleHBvcnQgZGVmYXVsdCBzdWJhZ2VudFN0b3BIb29rKHsgbWF0Y2hlcjogJ2V4cGxvcmUnIH0sIGFzeW5jIChpbnB1dCwgeyBsb2dnZXIgfSkgPT4ge1xuICogICBsb2dnZXIuaW5mbygnU3ViYWdlbnQgc3RvcHBpbmcnLCB7XG4gKiAgICAgYWdlbnRJZDogaW5wdXQuYWdlbnRfaWQsXG4gKiAgICAgYWdlbnRUeXBlOiBpbnB1dC5hZ2VudF90eXBlXG4gKiAgIH0pO1xuICpcbiAqICAgLy8gQmxvY2sgaWYgdHJhbnNjcmlwdCBzaG93cyBpbmNvbXBsZXRlIHdvcmtcbiAqICAgcmV0dXJuIHN1YmFnZW50U3RvcE91dHB1dCh7XG4gKiAgICAgZGVjaXNpb246ICdibG9jaycsXG4gKiAgICAgcmVhc29uOiAnUGxlYXNlIHZlcmlmeSBleHBsb3JhdGlvbiBpcyBjb21wbGV0ZSdcbiAqICAgfSk7XG4gKiB9KTtcbiAqIGBgYFxuICogQHNlZSBodHRwczovL2NvZGUuY2xhdWRlLmNvbS9kb2NzL2VuL2hvb2tzI3N1YmFnZW50c3RvcFxuICovXG5leHBvcnQgZnVuY3Rpb24gc3ViYWdlbnRTdG9wSG9vayhjb25maWcsIGhhbmRsZXIpIHtcbiAgICByZXR1cm4gY3JlYXRlSG9va0Z1bmN0aW9uKFwiU3ViYWdlbnRTdG9wXCIsIGNvbmZpZywgaGFuZGxlcik7XG59XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBQcmVDb21wYWN0IEhvb2sgRmFjdG9yeVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLyoqXG4gKiBDcmVhdGVzIGEgUHJlQ29tcGFjdCBob29rIGhhbmRsZXIuXG4gKlxuICogUHJlQ29tcGFjdCBob29rcyBmaXJlIGJlZm9yZSBjb250ZXh0IGNvbXBhY3Rpb24gb2NjdXJzLCBhbGxvd2luZyB5b3UgdG86XG4gKiAtIFByZXNlcnZlIGltcG9ydGFudCBpbmZvcm1hdGlvbiBiZWZvcmUgY29tcGFjdGlvblxuICogLSBMb2cgY29tcGFjdGlvbiBldmVudHNcbiAqIC0gTW9kaWZ5IGN1c3RvbSBpbnN0cnVjdGlvbnMgZm9yIHRoZSBjb21wYWN0ZWQgY29udGV4dFxuICpcbiAqICoqTWF0Y2hlcioqOiBNYXRjaGVzIGFnYWluc3QgYHRyaWdnZXJgICgnbWFudWFsJywgJ2F1dG8nKVxuICogQHBhcmFtIGNvbmZpZyAtIEhvb2sgY29uZmlndXJhdGlvbiB3aXRoIG9wdGlvbmFsIG1hdGNoZXIgYW5kIHRpbWVvdXRcbiAqIEBwYXJhbSBoYW5kbGVyIC0gVGhlIGhhbmRsZXIgZnVuY3Rpb24gdG8gZXhlY3V0ZVxuICogQHJldHVybnMgQSBob29rIGZ1bmN0aW9uIHRoYXQgY2FuIGJlIGV4cG9ydGVkIGFzIHRoZSBkZWZhdWx0IGV4cG9ydFxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGltcG9ydCB7IHByZUNvbXBhY3RIb29rLCBwcmVDb21wYWN0T3V0cHV0IH0gZnJvbSAnQGdvb2Rmb290L2NsYXVkZS1jb2RlLWhvb2tzJztcbiAqXG4gKiAvLyBMb2cgY29tcGFjdGlvbiBldmVudHMgYW5kIHByZXNlcnZlIGNvbnRleHRcbiAqIGV4cG9ydCBkZWZhdWx0IHByZUNvbXBhY3RIb29rKHt9LCBhc3luYyAoaW5wdXQsIHsgbG9nZ2VyIH0pID0+IHtcbiAqICAgbG9nZ2VyLmluZm8oJ0NvbnRleHQgY29tcGFjdGlvbiB0cmlnZ2VyZWQnLCB7XG4gKiAgICAgdHJpZ2dlcjogaW5wdXQudHJpZ2dlcixcbiAqICAgICBoYXNDdXN0b21JbnN0cnVjdGlvbnM6IGlucHV0LmN1c3RvbV9pbnN0cnVjdGlvbnMgIT09IG51bGxcbiAqICAgfSk7XG4gKlxuICogICByZXR1cm4gcHJlQ29tcGFjdE91dHB1dCh7XG4gKiAgICAgc3lzdGVtTWVzc2FnZTogJ1JlbWVtYmVyOiBzdHJpY3QgbW9kZSBpcyBlbmFibGVkJ1xuICogICB9KTtcbiAqIH0pO1xuICogYGBgXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogLy8gT25seSBoYW5kbGUgbWFudWFsIGNvbXBhY3Rpb25cbiAqIGV4cG9ydCBkZWZhdWx0IHByZUNvbXBhY3RIb29rKHsgbWF0Y2hlcjogJ21hbnVhbCcgfSwgYXN5bmMgKGlucHV0LCB7IGxvZ2dlciB9KSA9PiB7XG4gKiAgIGxvZ2dlci5pbmZvKCdNYW51YWwgY29tcGFjdGlvbiByZXF1ZXN0ZWQnKTtcbiAqICAgcmV0dXJuIHByZUNvbXBhY3RPdXRwdXQoe30pO1xuICogfSk7XG4gKiBgYGBcbiAqIEBzZWUgaHR0cHM6Ly9jb2RlLmNsYXVkZS5jb20vZG9jcy9lbi9ob29rcyNwcmVjb21wYWN0XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBwcmVDb21wYWN0SG9vayhjb25maWcsIGhhbmRsZXIpIHtcbiAgICByZXR1cm4gY3JlYXRlSG9va0Z1bmN0aW9uKFwiUHJlQ29tcGFjdFwiLCBjb25maWcsIGhhbmRsZXIpO1xufVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gUG9zdENvbXBhY3QgSG9vayBGYWN0b3J5XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vKipcbiAqIENyZWF0ZXMgYSBQb3N0Q29tcGFjdCBob29rIGhhbmRsZXIuXG4gKlxuICogUG9zdENvbXBhY3QgaG9va3MgZmlyZSBhZnRlciBjb250ZXh0IGNvbXBhY3Rpb24gY29tcGxldGVzLCBhbGxvd2luZyB5b3UgdG86XG4gKiAtIE9ic2VydmUgdGhlIGNvbXBhY3Rpb24gc3VtbWFyeSBhbmQgZGV0YWlsc1xuICogLSBMb2cgY29tcGFjdGlvbiBldmVudHNcbiAqIC0gUmVhY3QgdG8gdGhlIG5ldyBjb21wYWN0ZWQgc3RhdGVcbiAqXG4gKiAqKk1hdGNoZXIqKjogTWF0Y2hlcyBhZ2FpbnN0IGB0cmlnZ2VyYCAoJ21hbnVhbCcsICdhdXRvJylcbiAqIEBwYXJhbSBjb25maWcgLSBIb29rIGNvbmZpZ3VyYXRpb24gd2l0aCBvcHRpb25hbCBtYXRjaGVyIGFuZCB0aW1lb3V0XG4gKiBAcGFyYW0gaGFuZGxlciAtIFRoZSBoYW5kbGVyIGZ1bmN0aW9uIHRvIGV4ZWN1dGVcbiAqIEByZXR1cm5zIEEgaG9vayBmdW5jdGlvbiB0aGF0IGNhbiBiZSBleHBvcnRlZCBhcyB0aGUgZGVmYXVsdCBleHBvcnRcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBpbXBvcnQgeyBwb3N0Q29tcGFjdEhvb2ssIHBvc3RDb21wYWN0T3V0cHV0IH0gZnJvbSAnQGdvb2Rmb290L2NsYXVkZS1jb2RlLWhvb2tzJztcbiAqXG4gKiBleHBvcnQgZGVmYXVsdCBwb3N0Q29tcGFjdEhvb2soe30sIGFzeW5jIChpbnB1dCwgeyBsb2dnZXIgfSkgPT4ge1xuICogICBsb2dnZXIuaW5mbygnQ29udGV4dCBjb21wYWN0aW9uIGNvbXBsZXRlZCcsIHtcbiAqICAgICB0cmlnZ2VyOiBpbnB1dC50cmlnZ2VyLFxuICogICAgIHN1bW1hcnk6IGlucHV0LmNvbXBhY3Rfc3VtbWFyeVxuICogICB9KTtcbiAqICAgcmV0dXJuIHBvc3RDb21wYWN0T3V0cHV0KHt9KTtcbiAqIH0pO1xuICogYGBgXG4gKiBAc2VlIGh0dHBzOi8vY29kZS5jbGF1ZGUuY29tL2RvY3MvZW4vaG9va3MjcG9zdGNvbXBhY3RcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHBvc3RDb21wYWN0SG9vayhjb25maWcsIGhhbmRsZXIpIHtcbiAgICByZXR1cm4gY3JlYXRlSG9va0Z1bmN0aW9uKFwiUG9zdENvbXBhY3RcIiwgY29uZmlnLCBoYW5kbGVyKTtcbn1cbi8qKiBAaW5oZXJpdGRvYyAqL1xuZXhwb3J0IGZ1bmN0aW9uIHBlcm1pc3Npb25SZXF1ZXN0SG9vayhjb25maWcsIGhhbmRsZXIpIHtcbiAgICByZXR1cm4gY3JlYXRlSG9va0Z1bmN0aW9uKFwiUGVybWlzc2lvblJlcXVlc3RcIiwgY29uZmlnLCBoYW5kbGVyKTtcbn1cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIFNldHVwIEhvb2sgRmFjdG9yeVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLyoqXG4gKiBDcmVhdGVzIGEgU2V0dXAgaG9vayBoYW5kbGVyLlxuICpcbiAqIFNldHVwIGhvb2tzIGZpcmUgZHVyaW5nIGluaXRpYWxpemF0aW9uIG9yIG1haW50ZW5hbmNlLCBhbGxvd2luZyB5b3UgdG86XG4gKiAtIENvbmZpZ3VyZSBpbml0aWFsIHNlc3Npb24gc3RhdGVcbiAqIC0gUGVyZm9ybSBzZXR1cCB0YXNrcyBiZWZvcmUgdGhlIHNlc3Npb24gc3RhcnRzXG4gKiAtIEFkZCBjb250ZXh0IGZvciBtYWludGVuYW5jZSBvcGVyYXRpb25zXG4gKlxuICogKipNYXRjaGVyKio6IE1hdGNoZXMgYWdhaW5zdCBgdHJpZ2dlcmAgKCdpbml0JyBvciAnbWFpbnRlbmFuY2UnKVxuICogQHBhcmFtIGNvbmZpZyAtIEhvb2sgY29uZmlndXJhdGlvbiB3aXRoIG9wdGlvbmFsIG1hdGNoZXIgYW5kIHRpbWVvdXRcbiAqIEBwYXJhbSBoYW5kbGVyIC0gVGhlIGhhbmRsZXIgZnVuY3Rpb24gdG8gZXhlY3V0ZVxuICogQHJldHVybnMgQSBob29rIGZ1bmN0aW9uIHRoYXQgY2FuIGJlIGV4cG9ydGVkIGFzIHRoZSBkZWZhdWx0IGV4cG9ydFxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGltcG9ydCB7IHNldHVwSG9vaywgc2V0dXBPdXRwdXQgfSBmcm9tICdAZ29vZGZvb3QvY2xhdWRlLWNvZGUtaG9va3MnO1xuICpcbiAqIC8vIEhhbmRsZSBhbGwgc2V0dXAgZXZlbnRzXG4gKiBleHBvcnQgZGVmYXVsdCBzZXR1cEhvb2soe30sIGFzeW5jIChpbnB1dCwgeyBsb2dnZXIgfSkgPT4ge1xuICogICBsb2dnZXIuaW5mbygnU2V0dXAgdHJpZ2dlcmVkJywgeyB0cmlnZ2VyOiBpbnB1dC50cmlnZ2VyIH0pO1xuICogICByZXR1cm4gc2V0dXBPdXRwdXQoe30pO1xuICogfSk7XG4gKlxuICogLy8gT25seSBoYW5kbGUgaW5pdGlhbGl6YXRpb25cbiAqIGV4cG9ydCBkZWZhdWx0IHNldHVwSG9vayh7IG1hdGNoZXI6ICdpbml0JyB9LCBhc3luYyAoaW5wdXQsIHsgbG9nZ2VyIH0pID0+IHtcbiAqICAgbG9nZ2VyLmluZm8oJ0luaXRpYWxpemluZyBzZXNzaW9uJyk7XG4gKiAgIHJldHVybiBzZXR1cE91dHB1dCh7XG4gKiAgICAgaG9va1NwZWNpZmljT3V0cHV0OiB7XG4gKiAgICAgICBhZGRpdGlvbmFsQ29udGV4dDogJ1Nlc3Npb24gaW5pdGlhbGl6ZWQgd2l0aCBjdXN0b20gY29uZmlndXJhdGlvbidcbiAqICAgICB9XG4gKiAgIH0pO1xuICogfSk7XG4gKiBgYGBcbiAqIEBzZWUgaHR0cHM6Ly9jb2RlLmNsYXVkZS5jb20vZG9jcy9lbi9ob29rcyNzZXR1cFxuICovXG5leHBvcnQgZnVuY3Rpb24gc2V0dXBIb29rKGNvbmZpZywgaGFuZGxlcikge1xuICAgIHJldHVybiBjcmVhdGVIb29rRnVuY3Rpb24oXCJTZXR1cFwiLCBjb25maWcsIGhhbmRsZXIpO1xufVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gVGVhbW1hdGVJZGxlIEhvb2sgRmFjdG9yeVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLyoqXG4gKiBDcmVhdGVzIGEgVGVhbW1hdGVJZGxlIGhvb2sgaGFuZGxlci5cbiAqXG4gKiBUZWFtbWF0ZUlkbGUgaG9va3MgZmlyZSB3aGVuIGEgdGVhbW1hdGUgaW4gYSB0ZWFtIGlzIGFib3V0IHRvIGdvIGlkbGUsXG4gKiBhbGxvd2luZyB5b3UgdG86XG4gKiAtIEFzc2lnbiB3b3JrIHRvIGlkbGUgdGVhbW1hdGVzXG4gKiAtIExvZyB0ZWFtIGFjdGl2aXR5XG4gKiAtIENvb3JkaW5hdGUgbXVsdGktYWdlbnQgd29ya2Zsb3dzXG4gKlxuICogKipNYXRjaGVyKio6IE5vIG1hdGNoZXIgc3VwcG9ydCAtIGZpcmVzIG9uIGFsbCB0ZWFtbWF0ZSBpZGxlIGV2ZW50c1xuICogQHBhcmFtIGNvbmZpZyAtIEhvb2sgY29uZmlndXJhdGlvbiB3aXRoIG9wdGlvbmFsIHRpbWVvdXQgKG1hdGNoZXIgaXMgaWdub3JlZClcbiAqIEBwYXJhbSBoYW5kbGVyIC0gVGhlIGhhbmRsZXIgZnVuY3Rpb24gdG8gZXhlY3V0ZVxuICogQHJldHVybnMgQSBob29rIGZ1bmN0aW9uIHRoYXQgY2FuIGJlIGV4cG9ydGVkIGFzIHRoZSBkZWZhdWx0IGV4cG9ydFxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGltcG9ydCB7IHRlYW1tYXRlSWRsZUhvb2ssIHRlYW1tYXRlSWRsZU91dHB1dCB9IGZyb20gJ0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcyc7XG4gKlxuICogLy8gTG9nIHdoZW4gdGVhbW1hdGVzIGdvIGlkbGVcbiAqIGV4cG9ydCBkZWZhdWx0IHRlYW1tYXRlSWRsZUhvb2soe30sIGFzeW5jIChpbnB1dCwgeyBsb2dnZXIgfSkgPT4ge1xuICogICBsb2dnZXIuaW5mbygnVGVhbW1hdGUgZ29pbmcgaWRsZScsIHtcbiAqICAgICB0ZWFtbWF0ZU5hbWU6IGlucHV0LnRlYW1tYXRlX25hbWUsXG4gKiAgICAgdGVhbU5hbWU6IGlucHV0LnRlYW1fbmFtZVxuICogICB9KTtcbiAqXG4gKiAgIHJldHVybiB0ZWFtbWF0ZUlkbGVPdXRwdXQoe30pO1xuICogfSk7XG4gKiBgYGBcbiAqIEBzZWUgaHR0cHM6Ly9jb2RlLmNsYXVkZS5jb20vZG9jcy9lbi9ob29rcyN0ZWFtbWF0ZWlkbGVcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHRlYW1tYXRlSWRsZUhvb2soY29uZmlnLCBoYW5kbGVyKSB7XG4gICAgcmV0dXJuIGNyZWF0ZUhvb2tGdW5jdGlvbihcIlRlYW1tYXRlSWRsZVwiLCBjb25maWcsIGhhbmRsZXIpO1xufVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gVGFza0NvbXBsZXRlZCBIb29rIEZhY3Rvcnlcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8qKlxuICogQ3JlYXRlcyBhIFRhc2tDb21wbGV0ZWQgaG9vayBoYW5kbGVyLlxuICpcbiAqIFRhc2tDb21wbGV0ZWQgaG9va3MgZmlyZSB3aGVuIGEgdGFzayBpcyBiZWluZyBtYXJrZWQgYXMgY29tcGxldGVkLFxuICogYWxsb3dpbmcgeW91IHRvOlxuICogLSBWZXJpZnkgdGFzayBjb21wbGV0aW9uXG4gKiAtIExvZyB0YXNrIG1ldHJpY3NcbiAqIC0gVHJpZ2dlciBmb2xsb3ctdXAgYWN0aW9uc1xuICpcbiAqICoqTWF0Y2hlcioqOiBObyBtYXRjaGVyIHN1cHBvcnQgLSBmaXJlcyBvbiBhbGwgdGFzayBjb21wbGV0aW9uIGV2ZW50c1xuICogQHBhcmFtIGNvbmZpZyAtIEhvb2sgY29uZmlndXJhdGlvbiB3aXRoIG9wdGlvbmFsIHRpbWVvdXQgKG1hdGNoZXIgaXMgaWdub3JlZClcbiAqIEBwYXJhbSBoYW5kbGVyIC0gVGhlIGhhbmRsZXIgZnVuY3Rpb24gdG8gZXhlY3V0ZVxuICogQHJldHVybnMgQSBob29rIGZ1bmN0aW9uIHRoYXQgY2FuIGJlIGV4cG9ydGVkIGFzIHRoZSBkZWZhdWx0IGV4cG9ydFxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGltcG9ydCB7IHRhc2tDb21wbGV0ZWRIb29rLCB0YXNrQ29tcGxldGVkT3V0cHV0IH0gZnJvbSAnQGdvb2Rmb290L2NsYXVkZS1jb2RlLWhvb2tzJztcbiAqXG4gKiAvLyBMb2cgdGFzayBjb21wbGV0aW9uXG4gKiBleHBvcnQgZGVmYXVsdCB0YXNrQ29tcGxldGVkSG9vayh7fSwgYXN5bmMgKGlucHV0LCB7IGxvZ2dlciB9KSA9PiB7XG4gKiAgIGxvZ2dlci5pbmZvKCdUYXNrIGNvbXBsZXRlZCcsIHtcbiAqICAgICB0YXNrSWQ6IGlucHV0LnRhc2tfaWQsXG4gKiAgICAgdGFza1N1YmplY3Q6IGlucHV0LnRhc2tfc3ViamVjdFxuICogICB9KTtcbiAqXG4gKiAgIHJldHVybiB0YXNrQ29tcGxldGVkT3V0cHV0KHt9KTtcbiAqIH0pO1xuICogYGBgXG4gKiBAc2VlIGh0dHBzOi8vY29kZS5jbGF1ZGUuY29tL2RvY3MvZW4vaG9va3MjdGFza2NvbXBsZXRlZFxuICovXG5leHBvcnQgZnVuY3Rpb24gdGFza0NvbXBsZXRlZEhvb2soY29uZmlnLCBoYW5kbGVyKSB7XG4gICAgcmV0dXJuIGNyZWF0ZUhvb2tGdW5jdGlvbihcIlRhc2tDb21wbGV0ZWRcIiwgY29uZmlnLCBoYW5kbGVyKTtcbn1cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIEVsaWNpdGF0aW9uIEhvb2sgRmFjdG9yeVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLyoqXG4gKiBDcmVhdGVzIGFuIEVsaWNpdGF0aW9uIGhvb2sgaGFuZGxlci5cbiAqXG4gKiBFbGljaXRhdGlvbiBob29rcyBmaXJlIHdoZW4gYW4gTUNQIHNlcnZlciByZXF1ZXN0cyB1c2VyIGlucHV0LCBhbGxvd2luZyB5b3UgdG86XG4gKiAtIEFjY2VwdCwgZGVjbGluZSwgb3IgY2FuY2VsIGVsaWNpdGF0aW9uIHJlcXVlc3RzIHByb2dyYW1tYXRpY2FsbHlcbiAqIC0gUHJvdmlkZSBzdHJ1Y3R1cmVkIGZvcm0gaW5wdXQgb3IgVVJMLWJhc2VkIGF1dGggcmVzcG9uc2VzXG4gKiAtIExvZyBvciBhdWRpdCBlbGljaXRhdGlvbiByZXF1ZXN0c1xuICpcbiAqICoqTWF0Y2hlcioqOiBObyBtYXRjaGVyIHN1cHBvcnQgLSBmaXJlcyBvbiBhbGwgZWxpY2l0YXRpb24gZXZlbnRzXG4gKiBAcGFyYW0gY29uZmlnIC0gSG9vayBjb25maWd1cmF0aW9uIHdpdGggb3B0aW9uYWwgdGltZW91dFxuICogQHBhcmFtIGhhbmRsZXIgLSBUaGUgaGFuZGxlciBmdW5jdGlvbiB0byBleGVjdXRlXG4gKiBAcmV0dXJucyBBIGhvb2sgZnVuY3Rpb24gdGhhdCBjYW4gYmUgZXhwb3J0ZWQgYXMgdGhlIGRlZmF1bHQgZXhwb3J0XG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogaW1wb3J0IHsgZWxpY2l0YXRpb25Ib29rLCBlbGljaXRhdGlvbk91dHB1dCB9IGZyb20gJ0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcyc7XG4gKlxuICogZXhwb3J0IGRlZmF1bHQgZWxpY2l0YXRpb25Ib29rKHt9LCBhc3luYyAoaW5wdXQsIHsgbG9nZ2VyIH0pID0+IHtcbiAqICAgbG9nZ2VyLmluZm8oJ0VsaWNpdGF0aW9uIHJlcXVlc3QnLCB7IHNlcnZlcjogaW5wdXQubWNwX3NlcnZlcl9uYW1lIH0pO1xuICogICByZXR1cm4gZWxpY2l0YXRpb25PdXRwdXQoe1xuICogICAgIGhvb2tTcGVjaWZpY091dHB1dDogeyBhY3Rpb246ICdhY2NlcHQnLCBjb250ZW50OiB7IGFwcHJvdmVkOiB0cnVlIH0gfVxuICogICB9KTtcbiAqIH0pO1xuICogYGBgXG4gKiBAc2VlIGh0dHBzOi8vY29kZS5jbGF1ZGUuY29tL2RvY3MvZW4vaG9va3MjZWxpY2l0YXRpb25cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGVsaWNpdGF0aW9uSG9vayhjb25maWcsIGhhbmRsZXIpIHtcbiAgICByZXR1cm4gY3JlYXRlSG9va0Z1bmN0aW9uKFwiRWxpY2l0YXRpb25cIiwgY29uZmlnLCBoYW5kbGVyKTtcbn1cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIEVsaWNpdGF0aW9uUmVzdWx0IEhvb2sgRmFjdG9yeVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLyoqXG4gKiBDcmVhdGVzIGFuIEVsaWNpdGF0aW9uUmVzdWx0IGhvb2sgaGFuZGxlci5cbiAqXG4gKiBFbGljaXRhdGlvblJlc3VsdCBob29rcyBmaXJlIHdpdGggdGhlIHJlc3VsdCBvZiBhbiBNQ1AgZWxpY2l0YXRpb24gcmVxdWVzdCxcbiAqIGFsbG93aW5nIHlvdSB0bzpcbiAqIC0gT2JzZXJ2ZSBlbGljaXRhdGlvbiBvdXRjb21lc1xuICogLSBNb2RpZnkgdGhlIHJlc3VsdCBiZWZvcmUgaXQgaXMgcmV0dXJuZWQgdG8gdGhlIE1DUCBzZXJ2ZXJcbiAqIC0gTG9nIGVsaWNpdGF0aW9uIGNvbXBsZXRpb25zXG4gKlxuICogKipNYXRjaGVyKio6IE5vIG1hdGNoZXIgc3VwcG9ydCAtIGZpcmVzIG9uIGFsbCBlbGljaXRhdGlvbiByZXN1bHQgZXZlbnRzXG4gKiBAcGFyYW0gY29uZmlnIC0gSG9vayBjb25maWd1cmF0aW9uIHdpdGggb3B0aW9uYWwgdGltZW91dFxuICogQHBhcmFtIGhhbmRsZXIgLSBUaGUgaGFuZGxlciBmdW5jdGlvbiB0byBleGVjdXRlXG4gKiBAcmV0dXJucyBBIGhvb2sgZnVuY3Rpb24gdGhhdCBjYW4gYmUgZXhwb3J0ZWQgYXMgdGhlIGRlZmF1bHQgZXhwb3J0XG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogaW1wb3J0IHsgZWxpY2l0YXRpb25SZXN1bHRIb29rLCBlbGljaXRhdGlvblJlc3VsdE91dHB1dCB9IGZyb20gJ0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcyc7XG4gKlxuICogZXhwb3J0IGRlZmF1bHQgZWxpY2l0YXRpb25SZXN1bHRIb29rKHt9LCBhc3luYyAoaW5wdXQsIHsgbG9nZ2VyIH0pID0+IHtcbiAqICAgbG9nZ2VyLmluZm8oJ0VsaWNpdGF0aW9uIHJlc3VsdCcsIHsgYWN0aW9uOiBpbnB1dC5hY3Rpb24gfSk7XG4gKiAgIHJldHVybiBlbGljaXRhdGlvblJlc3VsdE91dHB1dCh7fSk7XG4gKiB9KTtcbiAqIGBgYFxuICogQHNlZSBodHRwczovL2NvZGUuY2xhdWRlLmNvbS9kb2NzL2VuL2hvb2tzI2VsaWNpdGF0aW9ucmVzdWx0XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBlbGljaXRhdGlvblJlc3VsdEhvb2soY29uZmlnLCBoYW5kbGVyKSB7XG4gICAgcmV0dXJuIGNyZWF0ZUhvb2tGdW5jdGlvbihcIkVsaWNpdGF0aW9uUmVzdWx0XCIsIGNvbmZpZywgaGFuZGxlcik7XG59XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBDb25maWdDaGFuZ2UgSG9vayBGYWN0b3J5XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vKipcbiAqIENyZWF0ZXMgYSBDb25maWdDaGFuZ2UgaG9vayBoYW5kbGVyLlxuICpcbiAqIENvbmZpZ0NoYW5nZSBob29rcyBmaXJlIHdoZW4gQ2xhdWRlIENvZGUgY29uZmlndXJhdGlvbiBjaGFuZ2VzLCBhbGxvd2luZyB5b3UgdG86XG4gKiAtIFJlYWN0IHRvIHNldHRpbmdzIGZpbGUgY2hhbmdlc1xuICogLSBMb2cgb3IgYXVkaXQgY29uZmlndXJhdGlvbiBjaGFuZ2VzXG4gKiAtIEFwcGx5IGN1c3RvbSBsb2dpYyB3aGVuIHNldHRpbmdzIGFyZSB1cGRhdGVkXG4gKlxuICogKipNYXRjaGVyKio6IE1hdGNoZXMgYWdhaW5zdCBgc291cmNlYCAoJ3VzZXJfc2V0dGluZ3MnLCAncHJvamVjdF9zZXR0aW5ncycsIGV0Yy4pXG4gKiBAcGFyYW0gY29uZmlnIC0gSG9vayBjb25maWd1cmF0aW9uIHdpdGggb3B0aW9uYWwgbWF0Y2hlciBhbmQgdGltZW91dFxuICogQHBhcmFtIGhhbmRsZXIgLSBUaGUgaGFuZGxlciBmdW5jdGlvbiB0byBleGVjdXRlXG4gKiBAcmV0dXJucyBBIGhvb2sgZnVuY3Rpb24gdGhhdCBjYW4gYmUgZXhwb3J0ZWQgYXMgdGhlIGRlZmF1bHQgZXhwb3J0XG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogaW1wb3J0IHsgY29uZmlnQ2hhbmdlSG9vaywgY29uZmlnQ2hhbmdlT3V0cHV0IH0gZnJvbSAnQGdvb2Rmb290L2NsYXVkZS1jb2RlLWhvb2tzJztcbiAqXG4gKiBleHBvcnQgZGVmYXVsdCBjb25maWdDaGFuZ2VIb29rKHt9LCBhc3luYyAoaW5wdXQsIHsgbG9nZ2VyIH0pID0+IHtcbiAqICAgbG9nZ2VyLmluZm8oJ0NvbmZpZyBjaGFuZ2VkJywgeyBzb3VyY2U6IGlucHV0LnNvdXJjZSwgZmlsZTogaW5wdXQuZmlsZV9wYXRoIH0pO1xuICogICByZXR1cm4gY29uZmlnQ2hhbmdlT3V0cHV0KHt9KTtcbiAqIH0pO1xuICogYGBgXG4gKiBAc2VlIGh0dHBzOi8vY29kZS5jbGF1ZGUuY29tL2RvY3MvZW4vaG9va3MjY29uZmlnY2hhbmdlXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjb25maWdDaGFuZ2VIb29rKGNvbmZpZywgaGFuZGxlcikge1xuICAgIHJldHVybiBjcmVhdGVIb29rRnVuY3Rpb24oXCJDb25maWdDaGFuZ2VcIiwgY29uZmlnLCBoYW5kbGVyKTtcbn1cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIEluc3RydWN0aW9uc0xvYWRlZCBIb29rIEZhY3Rvcnlcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8qKlxuICogQ3JlYXRlcyBhbiBJbnN0cnVjdGlvbnNMb2FkZWQgaG9vayBoYW5kbGVyLlxuICpcbiAqIEluc3RydWN0aW9uc0xvYWRlZCBob29rcyBmaXJlIHdoZW4gYSBDTEFVREUubWQgb3Igc2ltaWxhciBpbnN0cnVjdGlvbnMgZmlsZVxuICogaXMgbG9hZGVkLCBhbGxvd2luZyB5b3UgdG86XG4gKiAtIFJlYWN0IHRvIGluc3RydWN0aW9ucyBiZWluZyBhcHBsaWVkXG4gKiAtIExvZyB3aGljaCBpbnN0cnVjdGlvbiBmaWxlcyBhcmUgYWN0aXZlXG4gKiAtIE9ic2VydmUgdGhlIGluc3RydWN0aW9uIGxvYWRpbmcgaGllcmFyY2h5XG4gKlxuICogKipNYXRjaGVyKio6IE5vIG1hdGNoZXIgc3VwcG9ydCAtIGZpcmVzIG9uIGFsbCBpbnN0cnVjdGlvbiBsb2FkIGV2ZW50c1xuICogQHBhcmFtIGNvbmZpZyAtIEhvb2sgY29uZmlndXJhdGlvbiB3aXRoIG9wdGlvbmFsIHRpbWVvdXRcbiAqIEBwYXJhbSBoYW5kbGVyIC0gVGhlIGhhbmRsZXIgZnVuY3Rpb24gdG8gZXhlY3V0ZVxuICogQHJldHVybnMgQSBob29rIGZ1bmN0aW9uIHRoYXQgY2FuIGJlIGV4cG9ydGVkIGFzIHRoZSBkZWZhdWx0IGV4cG9ydFxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGltcG9ydCB7IGluc3RydWN0aW9uc0xvYWRlZEhvb2ssIGluc3RydWN0aW9uc0xvYWRlZE91dHB1dCB9IGZyb20gJ0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcyc7XG4gKlxuICogZXhwb3J0IGRlZmF1bHQgaW5zdHJ1Y3Rpb25zTG9hZGVkSG9vayh7fSwgYXN5bmMgKGlucHV0LCB7IGxvZ2dlciB9KSA9PiB7XG4gKiAgIGxvZ2dlci5pbmZvKCdJbnN0cnVjdGlvbnMgbG9hZGVkJywgeyBmaWxlOiBpbnB1dC5maWxlX3BhdGgsIHR5cGU6IGlucHV0Lm1lbW9yeV90eXBlIH0pO1xuICogICByZXR1cm4gaW5zdHJ1Y3Rpb25zTG9hZGVkT3V0cHV0KHt9KTtcbiAqIH0pO1xuICogYGBgXG4gKiBAc2VlIGh0dHBzOi8vY29kZS5jbGF1ZGUuY29tL2RvY3MvZW4vaG9va3MjaW5zdHJ1Y3Rpb25zbG9hZGVkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpbnN0cnVjdGlvbnNMb2FkZWRIb29rKGNvbmZpZywgaGFuZGxlcikge1xuICAgIHJldHVybiBjcmVhdGVIb29rRnVuY3Rpb24oXCJJbnN0cnVjdGlvbnNMb2FkZWRcIiwgY29uZmlnLCBoYW5kbGVyKTtcbn1cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIFdvcmt0cmVlQ3JlYXRlIEhvb2sgRmFjdG9yeVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLyoqXG4gKiBDcmVhdGVzIGEgV29ya3RyZWVDcmVhdGUgaG9vayBoYW5kbGVyLlxuICpcbiAqIFdvcmt0cmVlQ3JlYXRlIGhvb2tzIGZpcmUgd2hlbiBhIGdpdCB3b3JrdHJlZSBpcyBjcmVhdGVkLCBhbGxvd2luZyB5b3UgdG86XG4gKiAtIFNldCB1cCB3b3JrdHJlZS1zcGVjaWZpYyBjb25maWd1cmF0aW9uXG4gKiAtIExvZyB3b3JrdHJlZSBjcmVhdGlvbiBldmVudHNcbiAqIC0gSW5pdGlhbGl6ZSB3b3JrdHJlZSByZXNvdXJjZXNcbiAqXG4gKiAqKk1hdGNoZXIqKjogTm8gbWF0Y2hlciBzdXBwb3J0IC0gZmlyZXMgb24gYWxsIHdvcmt0cmVlIGNyZWF0aW9uIGV2ZW50c1xuICogQHBhcmFtIGNvbmZpZyAtIEhvb2sgY29uZmlndXJhdGlvbiB3aXRoIG9wdGlvbmFsIHRpbWVvdXRcbiAqIEBwYXJhbSBoYW5kbGVyIC0gVGhlIGhhbmRsZXIgZnVuY3Rpb24gdG8gZXhlY3V0ZVxuICogQHJldHVybnMgQSBob29rIGZ1bmN0aW9uIHRoYXQgY2FuIGJlIGV4cG9ydGVkIGFzIHRoZSBkZWZhdWx0IGV4cG9ydFxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGltcG9ydCB7IHdvcmt0cmVlQ3JlYXRlSG9vaywgd29ya3RyZWVDcmVhdGVPdXRwdXQgfSBmcm9tICdAZ29vZGZvb3QvY2xhdWRlLWNvZGUtaG9va3MnO1xuICpcbiAqIGV4cG9ydCBkZWZhdWx0IHdvcmt0cmVlQ3JlYXRlSG9vayh7fSwgYXN5bmMgKGlucHV0LCB7IGxvZ2dlciB9KSA9PiB7XG4gKiAgIGxvZ2dlci5pbmZvKCdXb3JrdHJlZSBjcmVhdGVkJywgeyBuYW1lOiBpbnB1dC5uYW1lIH0pO1xuICogICByZXR1cm4gd29ya3RyZWVDcmVhdGVPdXRwdXQoe30pO1xuICogfSk7XG4gKiBgYGBcbiAqIEBzZWUgaHR0cHM6Ly9jb2RlLmNsYXVkZS5jb20vZG9jcy9lbi9ob29rcyN3b3JrdHJlZWNyZWF0ZVxuICovXG5leHBvcnQgZnVuY3Rpb24gd29ya3RyZWVDcmVhdGVIb29rKGNvbmZpZywgaGFuZGxlcikge1xuICAgIHJldHVybiBjcmVhdGVIb29rRnVuY3Rpb24oXCJXb3JrdHJlZUNyZWF0ZVwiLCBjb25maWcsIGhhbmRsZXIpO1xufVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gV29ya3RyZWVSZW1vdmUgSG9vayBGYWN0b3J5XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vKipcbiAqIENyZWF0ZXMgYSBXb3JrdHJlZVJlbW92ZSBob29rIGhhbmRsZXIuXG4gKlxuICogV29ya3RyZWVSZW1vdmUgaG9va3MgZmlyZSB3aGVuIGEgZ2l0IHdvcmt0cmVlIGlzIHJlbW92ZWQsIGFsbG93aW5nIHlvdSB0bzpcbiAqIC0gQ2xlYW4gdXAgd29ya3RyZWUtc3BlY2lmaWMgcmVzb3VyY2VzXG4gKiAtIExvZyB3b3JrdHJlZSByZW1vdmFsIGV2ZW50c1xuICpcbiAqICoqTWF0Y2hlcioqOiBObyBtYXRjaGVyIHN1cHBvcnQgLSBmaXJlcyBvbiBhbGwgd29ya3RyZWUgcmVtb3ZhbCBldmVudHNcbiAqIEBwYXJhbSBjb25maWcgLSBIb29rIGNvbmZpZ3VyYXRpb24gd2l0aCBvcHRpb25hbCB0aW1lb3V0XG4gKiBAcGFyYW0gaGFuZGxlciAtIFRoZSBoYW5kbGVyIGZ1bmN0aW9uIHRvIGV4ZWN1dGVcbiAqIEByZXR1cm5zIEEgaG9vayBmdW5jdGlvbiB0aGF0IGNhbiBiZSBleHBvcnRlZCBhcyB0aGUgZGVmYXVsdCBleHBvcnRcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBpbXBvcnQgeyB3b3JrdHJlZVJlbW92ZUhvb2ssIHdvcmt0cmVlUmVtb3ZlT3V0cHV0IH0gZnJvbSAnQGdvb2Rmb290L2NsYXVkZS1jb2RlLWhvb2tzJztcbiAqXG4gKiBleHBvcnQgZGVmYXVsdCB3b3JrdHJlZVJlbW92ZUhvb2soe30sIGFzeW5jIChpbnB1dCwgeyBsb2dnZXIgfSkgPT4ge1xuICogICBsb2dnZXIuaW5mbygnV29ya3RyZWUgcmVtb3ZlZCcsIHsgcGF0aDogaW5wdXQud29ya3RyZWVfcGF0aCB9KTtcbiAqICAgcmV0dXJuIHdvcmt0cmVlUmVtb3ZlT3V0cHV0KHt9KTtcbiAqIH0pO1xuICogYGBgXG4gKiBAc2VlIGh0dHBzOi8vY29kZS5jbGF1ZGUuY29tL2RvY3MvZW4vaG9va3Mjd29ya3RyZWVyZW1vdmVcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHdvcmt0cmVlUmVtb3ZlSG9vayhjb25maWcsIGhhbmRsZXIpIHtcbiAgICByZXR1cm4gY3JlYXRlSG9va0Z1bmN0aW9uKFwiV29ya3RyZWVSZW1vdmVcIiwgY29uZmlnLCBoYW5kbGVyKTtcbn1cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIEN3ZENoYW5nZWQgSG9vayBGYWN0b3J5XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vKipcbiAqIENyZWF0ZXMgYSBDd2RDaGFuZ2VkIGhvb2sgaGFuZGxlci5cbiAqXG4gKiBDd2RDaGFuZ2VkIGhvb2tzIGZpcmUgd2hlbiBDbGF1ZGUgQ29kZSdzIGN1cnJlbnQgd29ya2luZyBkaXJlY3RvcnkgY2hhbmdlcyxcbiAqIGFsbG93aW5nIHlvdSB0bzpcbiAqIC0gUmVhY3QgdG8gZGlyZWN0b3J5IGNoYW5nZXMgd2l0aGluIGEgc2Vzc2lvblxuICogLSBVcGRhdGUgZmlsZSB3YXRjaGVycyBvciBlbnZpcm9ubWVudCBzdGF0ZVxuICogLSBSZXR1cm4gYHdhdGNoUGF0aHNgIHZpYSBgaG9va1NwZWNpZmljT3V0cHV0YCB0byByZWdpc3RlciBwYXRocyBmb3IgRmlsZUNoYW5nZWQgZXZlbnRzXG4gKlxuICogKipNYXRjaGVyKio6IE5vIG1hdGNoZXIgc3VwcG9ydCAtIGZpcmVzIG9uIGFsbCBjd2QgY2hhbmdlIGV2ZW50c1xuICogQHBhcmFtIGNvbmZpZyAtIEhvb2sgY29uZmlndXJhdGlvbiB3aXRoIG9wdGlvbmFsIHRpbWVvdXRcbiAqIEBwYXJhbSBoYW5kbGVyIC0gVGhlIGhhbmRsZXIgZnVuY3Rpb24gdG8gZXhlY3V0ZVxuICogQHJldHVybnMgQSBob29rIGZ1bmN0aW9uIHRoYXQgY2FuIGJlIGV4cG9ydGVkIGFzIHRoZSBkZWZhdWx0IGV4cG9ydFxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGltcG9ydCB7IGN3ZENoYW5nZWRIb29rLCBjd2RDaGFuZ2VkT3V0cHV0IH0gZnJvbSAnQGdvb2Rmb290L2NsYXVkZS1jb2RlLWhvb2tzJztcbiAqXG4gKiBleHBvcnQgZGVmYXVsdCBjd2RDaGFuZ2VkSG9vayh7fSwgYXN5bmMgKGlucHV0LCB7IGxvZ2dlciB9KSA9PiB7XG4gKiAgIGxvZ2dlci5pbmZvKCdXb3JraW5nIGRpcmVjdG9yeSBjaGFuZ2VkJywgeyBmcm9tOiBpbnB1dC5vbGRfY3dkLCB0bzogaW5wdXQubmV3X2N3ZCB9KTtcbiAqICAgcmV0dXJuIGN3ZENoYW5nZWRPdXRwdXQoe30pO1xuICogfSk7XG4gKiBgYGBcbiAqIEBzZWUgaHR0cHM6Ly9jb2RlLmNsYXVkZS5jb20vZG9jcy9lbi9ob29rcyNjd2RjaGFuZ2VkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjd2RDaGFuZ2VkSG9vayhjb25maWcsIGhhbmRsZXIpIHtcbiAgICByZXR1cm4gY3JlYXRlSG9va0Z1bmN0aW9uKFwiQ3dkQ2hhbmdlZFwiLCBjb25maWcsIGhhbmRsZXIpO1xufVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gRmlsZUNoYW5nZWQgSG9vayBGYWN0b3J5XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vKipcbiAqIENyZWF0ZXMgYSBGaWxlQ2hhbmdlZCBob29rIGhhbmRsZXIuXG4gKlxuICogRmlsZUNoYW5nZWQgaG9va3MgZmlyZSB3aGVuIGEgd2F0Y2hlZCBmaWxlIGNoYW5nZXMgb24gZGlzaywgYWxsb3dpbmcgeW91IHRvOlxuICogLSBSZWFjdCB0byBmaWxlIHN5c3RlbSBjaGFuZ2VzIGR1cmluZyBhIHNlc3Npb25cbiAqIC0gSW52YWxpZGF0ZSBjYWNoZXMgb3IgcmVsb2FkIGNvbmZpZ3VyYXRpb25cbiAqIC0gUmV0dXJuIGB3YXRjaFBhdGhzYCB2aWEgYGhvb2tTcGVjaWZpY091dHB1dGAgdG8gdXBkYXRlIHRoZSBzZXQgb2Ygd2F0Y2hlZCBwYXRoc1xuICpcbiAqIFRoZSBpbnB1dCBgZXZlbnRgIGZpZWxkIGluZGljYXRlcyB0aGUgdHlwZSBvZiBjaGFuZ2U6XG4gKiAtIGAnY2hhbmdlJ2AgLSBGaWxlIGNvbnRlbnRzIGNoYW5nZWRcbiAqIC0gYCdhZGQnYCAtIEZpbGUgd2FzIGNyZWF0ZWRcbiAqIC0gYCd1bmxpbmsnYCAtIEZpbGUgd2FzIGRlbGV0ZWRcbiAqXG4gKiAqKk1hdGNoZXIqKjogTm8gbWF0Y2hlciBzdXBwb3J0IC0gZmlyZXMgb24gYWxsIGZpbGUgY2hhbmdlIGV2ZW50c1xuICogQHBhcmFtIGNvbmZpZyAtIEhvb2sgY29uZmlndXJhdGlvbiB3aXRoIG9wdGlvbmFsIHRpbWVvdXRcbiAqIEBwYXJhbSBoYW5kbGVyIC0gVGhlIGhhbmRsZXIgZnVuY3Rpb24gdG8gZXhlY3V0ZVxuICogQHJldHVybnMgQSBob29rIGZ1bmN0aW9uIHRoYXQgY2FuIGJlIGV4cG9ydGVkIGFzIHRoZSBkZWZhdWx0IGV4cG9ydFxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGltcG9ydCB7IGZpbGVDaGFuZ2VkSG9vaywgZmlsZUNoYW5nZWRPdXRwdXQgfSBmcm9tICdAZ29vZGZvb3QvY2xhdWRlLWNvZGUtaG9va3MnO1xuICpcbiAqIGV4cG9ydCBkZWZhdWx0IGZpbGVDaGFuZ2VkSG9vayh7fSwgYXN5bmMgKGlucHV0LCB7IGxvZ2dlciB9KSA9PiB7XG4gKiAgIGxvZ2dlci5pbmZvKCdGaWxlIGNoYW5nZWQnLCB7IHBhdGg6IGlucHV0LmZpbGVfcGF0aCwgZXZlbnQ6IGlucHV0LmV2ZW50IH0pO1xuICogICByZXR1cm4gZmlsZUNoYW5nZWRPdXRwdXQoe30pO1xuICogfSk7XG4gKiBgYGBcbiAqIEBzZWUgaHR0cHM6Ly9jb2RlLmNsYXVkZS5jb20vZG9jcy9lbi9ob29rcyNmaWxlY2hhbmdlZFxuICovXG5leHBvcnQgZnVuY3Rpb24gZmlsZUNoYW5nZWRIb29rKGNvbmZpZywgaGFuZGxlcikge1xuICAgIHJldHVybiBjcmVhdGVIb29rRnVuY3Rpb24oXCJGaWxlQ2hhbmdlZFwiLCBjb25maWcsIGhhbmRsZXIpO1xufVxuIiwgIi8qKlxuICogTG9nZ2VyIHN5c3RlbSBmb3IgQ2xhdWRlIENvZGUgaG9va3MuXG4gKlxuICogUHJvdmlkZXMgc3RydWN0dXJlZCBsb2dnaW5nIHdpdGggZXZlbnQgc3Vic2NyaXB0aW9uIGFuZCBvcHRpb25hbCBmaWxlIG91dHB1dC5cbiAqIFRoZSBsb2dnZXIgaXMgKipzaWxlbnQgYnkgZGVmYXVsdCoqIHRvIGF2b2lkIGludGVyZmVyaW5nIHdpdGggaG9vayBwcm90b2NvbFxuICogKHN0ZG91dCBpcyByZXNlcnZlZCBmb3IgSlNPTiByZXNwb25zZXMsIHN0ZGVyciBtYXkgY29uZmxpY3Qgd2l0aCBDbGF1ZGUgQ29kZSkuXG4gKiBAbW9kdWxlXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogaW1wb3J0IHsgbG9nZ2VyIH0gZnJvbSAnQGdvb2Rmb290L2NsYXVkZS1jb2RlLWhvb2tzJztcbiAqXG4gKiAvLyBTdWJzY3JpYmUgdG8gbG9nIGV2ZW50c1xuICogY29uc3QgdW5zdWJzY3JpYmUgPSBsb2dnZXIub24oJ2Vycm9yJywgKGV2ZW50KSA9PiB7XG4gKiAgIGNvbnNvbGUuZXJyb3IoYEVycm9yIGluICR7ZXZlbnQuaG9va1R5cGV9OiAke2V2ZW50Lm1lc3NhZ2V9YCk7XG4gKiB9KTtcbiAqXG4gKiAvLyBMYXRlciwgY2xlYW4gdXBcbiAqIHVuc3Vic2NyaWJlKCk7XG4gKiBgYGBcbiAqIEBzZWUgaHR0cHM6Ly9jb2RlLmNsYXVkZS5jb20vZG9jcy9lbi9ob29rc1xuICovXG5pbXBvcnQgeyBjbG9zZVN5bmMsIGV4aXN0c1N5bmMsIG1rZGlyU3luYywgb3BlblN5bmMsIHdyaXRlU3luYyB9IGZyb20gXCJub2RlOmZzXCI7XG5pbXBvcnQgeyBkaXJuYW1lIH0gZnJvbSBcIm5vZGU6cGF0aFwiO1xuLyoqXG4gKiBBbGwgbG9nIGxldmVscyBpbiBvcmRlciBvZiBzZXZlcml0eSAobG93ZXN0IHRvIGhpZ2hlc3QpLlxuICovXG5leHBvcnQgY29uc3QgTE9HX0xFVkVMUyA9IFtcImRlYnVnXCIsIFwiaW5mb1wiLCBcIndhcm5cIiwgXCJlcnJvclwiXTtcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIExvZ2dlciBDbGFzc1xuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLyoqXG4gKiBMb2dnZXIgZm9yIENsYXVkZSBDb2RlIGhvb2tzIHdpdGggZXZlbnQgc3Vic2NyaXB0aW9uIGFuZCBmaWxlIG91dHB1dC5cbiAqXG4gKiAjIyBLZXkgQmVoYXZpb3JzXG4gKlxuICogfCBDb25maWd1cmF0aW9uIHwgQmVoYXZpb3IgfFxuICogfC0tLS0tLS0tLS0tLS0tfC0tLS0tLS0tLS18XG4gKiB8IE5vIGNvbmZpZyAoZGVmYXVsdCkgfCAqKlNpbGVudCoqIC0gbm8gb3V0cHV0IGFueXdoZXJlIHxcbiAqIHwgYENMQVVERV9DT0RFX0hPT0tTX0xPR19GSUxFYCBlbnYgdmFyIHwgQXBwZW5kIEpTT04gbGluZXMgdG8gZmlsZSB8XG4gKiB8IGAub24obGV2ZWwsIGhhbmRsZXIpYCByZWdpc3RlcmVkIHwgRXZlbnRzIGRlbGl2ZXJlZCB0byBoYW5kbGVycyBvbmx5IHxcbiAqIHwgTXVsdGlwbGUgZGVzdGluYXRpb25zIHwgQWxsIGRlc3RpbmF0aW9ucyByZWNlaXZlIGV2ZW50cyB8XG4gKlxuICogIyMgSW1wb3J0YW50IE5vdGVzXG4gKlxuICogLSAqKk5ldmVyIG91dHB1dHMgdG8gc3Rkb3V0KiogKHJlc2VydmVkIGZvciBKU09OIGhvb2sgcmVzcG9uc2UpXG4gKiAtICoqTmV2ZXIgb3V0cHV0cyB0byBzdGRlcnIqKiAobWF5IGludGVyZmVyZSB3aXRoIENsYXVkZSBDb2RlIGVycm9yIGhhbmRsaW5nKVxuICogLSBGaWxlIG91dHB1dCB1c2VzIEpTT04gTGluZXMgZm9ybWF0IGZvciBlYXN5IHBhcnNpbmdcbiAqIC0gYC5vbihsZXZlbCwgaGFuZGxlcilgIHJldHVybnMgYW4gdW5zdWJzY3JpYmUgZnVuY3Rpb25cbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBpbXBvcnQgeyBsb2dnZXIgfSBmcm9tICdAZ29vZGZvb3QvY2xhdWRlLWNvZGUtaG9va3MnO1xuICpcbiAqIC8vIFN1YnNjcmliZSB0byBldmVudHMgYXQgc3BlY2lmaWMgbGV2ZWxcbiAqIGxvZ2dlci5vbignd2FybicsIChldmVudCkgPT4ge1xuICogICBzZW5kQWxlcnQoZXZlbnQubWVzc2FnZSk7XG4gKiB9KTtcbiAqXG4gKiAvLyBMb2cgd2l0aGluIGEgaG9vayBoYW5kbGVyXG4gKiBleHBvcnQgZGVmYXVsdCBwcmVUb29sVXNlSG9vayh7IG1hdGNoZXI6ICdCYXNoJyB9LCBhc3luYyAoaW5wdXQsIHsgbG9nZ2VyIH0pID0+IHtcbiAqICAgbG9nZ2VyLndhcm4oJ0Fib3V0IHRvIHZhbGlkYXRlIEJhc2ggY29tbWFuZCcpO1xuICogICByZXR1cm4gcHJlVG9vbFVzZU91dHB1dCh7IGFsbG93OiB0cnVlIH0pO1xuICogfSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNsYXNzIExvZ2dlciB7XG4gICAgLyoqXG4gICAgICogUmVnaXN0ZXJlZCBldmVudCBoYW5kbGVycyBieSBsb2cgbGV2ZWwuXG4gICAgICovXG4gICAgaGFuZGxlcnMgPSBuZXcgTWFwKCk7XG4gICAgLyoqXG4gICAgICogRmlsZSBkZXNjcmlwdG9yIGZvciBsb2cgZmlsZSBvdXRwdXQuXG4gICAgICogTGF6aWx5IGluaXRpYWxpemVkIG9uIGZpcnN0IHdyaXRlLlxuICAgICAqL1xuICAgIGxvZ0ZpbGVGZCA9IG51bGw7XG4gICAgLyoqXG4gICAgICogUGF0aCB0byB0aGUgbG9nIGZpbGUsIGlmIGNvbmZpZ3VyZWQuXG4gICAgICovXG4gICAgbG9nRmlsZVBhdGggPSBudWxsO1xuICAgIC8qKlxuICAgICAqIFdoZXRoZXIgZmlsZSBpbml0aWFsaXphdGlvbiBoYXMgYmVlbiBhdHRlbXB0ZWQuXG4gICAgICovXG4gICAgZmlsZUluaXRpYWxpemVkID0gZmFsc2U7XG4gICAgLyoqXG4gICAgICogQ3VycmVudCBob29rIGNvbnRleHQgZm9yIGVucmljaGluZyBsb2cgZXZlbnRzLlxuICAgICAqL1xuICAgIGN1cnJlbnRIb29rVHlwZTtcbiAgICAvKipcbiAgICAgKiBDdXJyZW50IGhvb2sgaW5wdXQgZm9yIGVucmljaGluZyBsb2cgZXZlbnRzLlxuICAgICAqL1xuICAgIGN1cnJlbnRJbnB1dDtcbiAgICAvKipcbiAgICAgKiBDcmVhdGVzIGEgbmV3IExvZ2dlciBpbnN0YW5jZS5cbiAgICAgKlxuICAgICAqIFR5cGljYWxseSB5b3Ugc2hvdWxkIHVzZSB0aGUgZXhwb3J0ZWQgYGxvZ2dlcmAgc2luZ2xldG9uIHJhdGhlciB0aGFuXG4gICAgICogY3JlYXRpbmcgbmV3IGluc3RhbmNlcy5cbiAgICAgKiBAcGFyYW0gY29uZmlnIC0gT3B0aW9uYWwgY29uZmlndXJhdGlvblxuICAgICAqIEBleGFtcGxlXG4gICAgICogYGBgdHlwZXNjcmlwdFxuICAgICAqIC8vIFVzZSBzaW5nbGV0b24gKHJlY29tbWVuZGVkKVxuICAgICAqIGltcG9ydCB7IGxvZ2dlciB9IGZyb20gJ0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcyc7XG4gICAgICpcbiAgICAgKiAvLyBPciBjcmVhdGUgY3VzdG9tIGluc3RhbmNlXG4gICAgICogY29uc3QgY3VzdG9tTG9nZ2VyID0gbmV3IExvZ2dlcih7IGxvZ0ZpbGVQYXRoOiAnL3Zhci9sb2cvaG9va3MubG9nJyB9KTtcbiAgICAgKiBgYGBcbiAgICAgKi9cbiAgICBjb25zdHJ1Y3Rvcihjb25maWcgPSB7fSkge1xuICAgICAgICAvLyBJbml0aWFsaXplIGhhbmRsZXJzIG1hcCBmb3IgZWFjaCBsZXZlbFxuICAgICAgICBmb3IgKGNvbnN0IGxldmVsIG9mIExPR19MRVZFTFMpIHtcbiAgICAgICAgICAgIHRoaXMuaGFuZGxlcnMuc2V0KGxldmVsLCBuZXcgU2V0KCkpO1xuICAgICAgICB9XG4gICAgICAgIC8vIFNldCBsb2cgZmlsZSBwYXRoIGZyb20gZXhwbGljaXQgY29uZmlnLCBvciBieSByZWFkaW5nIHRoZSBjb25maWd1cmVkIGVudiB2YXJcbiAgICAgICAgdGhpcy5sb2dGaWxlUGF0aCA9IGNvbmZpZy5sb2dGaWxlUGF0aCA/PyAoY29uZmlnLmxvZ0VudlZhciA/IHByb2Nlc3MuZW52W2NvbmZpZy5sb2dFbnZWYXJdIDogdW5kZWZpbmVkKSA/PyBudWxsO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBMb2dzIGEgZGVidWcgbWVzc2FnZS5cbiAgICAgKlxuICAgICAqIFVzZSBmb3IgZGV0YWlsZWQgZGVidWdnaW5nIGluZm9ybWF0aW9uIHRoYXQgaXMgdHlwaWNhbGx5IG9ubHkgdXNlZnVsXG4gICAgICogZHVyaW5nIGRldmVsb3BtZW50IG9yIHRyb3VibGVzaG9vdGluZy5cbiAgICAgKiBAcGFyYW0gbWVzc2FnZSAtIFRoZSBkZWJ1ZyBtZXNzYWdlXG4gICAgICogQHBhcmFtIGNvbnRleHQgLSBPcHRpb25hbCBhZGRpdGlvbmFsIGNvbnRleHRcbiAgICAgKiBAZXhhbXBsZVxuICAgICAqIGBgYHR5cGVzY3JpcHRcbiAgICAgKiBsb2dnZXIuZGVidWcoJ1Byb2Nlc3NpbmcgdG9vbCBpbnB1dCcsIHsgdG9vbE5hbWU6ICdCYXNoJywgaW5wdXRTaXplOiAyNTYgfSk7XG4gICAgICogYGBgXG4gICAgICovXG4gICAgZGVidWcobWVzc2FnZSwgY29udGV4dCkge1xuICAgICAgICB0aGlzLmVtaXQoXCJkZWJ1Z1wiLCBtZXNzYWdlLCBjb250ZXh0KTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogTG9ncyBhbiBpbmZvIG1lc3NhZ2UuXG4gICAgICpcbiAgICAgKiBVc2UgZm9yIGdlbmVyYWwgb3BlcmF0aW9uYWwgZXZlbnRzIGxpa2UgaG9vayBpbnZvY2F0aW9ucywgc3VjY2Vzc2Z1bFxuICAgICAqIGNvbXBsZXRpb25zLCBvciBzdGF0ZSBjaGFuZ2VzLlxuICAgICAqIEBwYXJhbSBtZXNzYWdlIC0gVGhlIGluZm8gbWVzc2FnZVxuICAgICAqIEBwYXJhbSBjb250ZXh0IC0gT3B0aW9uYWwgYWRkaXRpb25hbCBjb250ZXh0XG4gICAgICogQGV4YW1wbGVcbiAgICAgKiBgYGB0eXBlc2NyaXB0XG4gICAgICogbG9nZ2VyLmluZm8oJ1Nlc3Npb24gc3RhcnRlZCcsIHsgc291cmNlOiAnc3RhcnR1cCcsIHNlc3Npb25JZDogJ2FiYzEyMycgfSk7XG4gICAgICogYGBgXG4gICAgICovXG4gICAgaW5mbyhtZXNzYWdlLCBjb250ZXh0KSB7XG4gICAgICAgIHRoaXMuZW1pdChcImluZm9cIiwgbWVzc2FnZSwgY29udGV4dCk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIExvZ3MgYSB3YXJuaW5nIG1lc3NhZ2UuXG4gICAgICpcbiAgICAgKiBVc2UgZm9yIGNvbmRpdGlvbnMgdGhhdCBtYXkgaW5kaWNhdGUgaXNzdWVzIGJ1dCBkb24ndCBwcmV2ZW50XG4gICAgICogb3BlcmF0aW9uLCBzdWNoIGFzIGRlcHJlY2F0ZWQgcGF0dGVybnMgb3IgcGVyZm9ybWFuY2UgY29uY2VybnMuXG4gICAgICogQHBhcmFtIG1lc3NhZ2UgLSBUaGUgd2FybmluZyBtZXNzYWdlXG4gICAgICogQHBhcmFtIGNvbnRleHQgLSBPcHRpb25hbCBhZGRpdGlvbmFsIGNvbnRleHRcbiAgICAgKiBAZXhhbXBsZVxuICAgICAqIGBgYHR5cGVzY3JpcHRcbiAgICAgKiBsb2dnZXIud2FybignRGVwcmVjYXRlZCBob29rIHBhdHRlcm4gZGV0ZWN0ZWQnLCB7IHBhdHRlcm46ICdsZWdhY3lNYXRjaGVyJyB9KTtcbiAgICAgKiBgYGBcbiAgICAgKi9cbiAgICB3YXJuKG1lc3NhZ2UsIGNvbnRleHQpIHtcbiAgICAgICAgdGhpcy5lbWl0KFwid2FyblwiLCBtZXNzYWdlLCBjb250ZXh0KTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogTG9ncyBhbiBlcnJvciBtZXNzYWdlLlxuICAgICAqXG4gICAgICogVXNlIGZvciBlcnJvciBjb25kaXRpb25zIHRoYXQgcmVxdWlyZSBhdHRlbnRpb24gYnV0IHdlcmUgaGFuZGxlZFxuICAgICAqIGdyYWNlZnVsbHkuIEZvciBleGNlcHRpb25zLCBwcmVmZXIge0BsaW5rIGxvZ0Vycm9yfS5cbiAgICAgKiBAcGFyYW0gbWVzc2FnZSAtIFRoZSBlcnJvciBtZXNzYWdlXG4gICAgICogQHBhcmFtIGNvbnRleHQgLSBPcHRpb25hbCBhZGRpdGlvbmFsIGNvbnRleHRcbiAgICAgKiBAZXhhbXBsZVxuICAgICAqIGBgYHR5cGVzY3JpcHRcbiAgICAgKiBsb2dnZXIuZXJyb3IoJ0ZhaWxlZCB0byB2YWxpZGF0ZSB0b29sIGlucHV0JywgeyB0b29sTmFtZTogJ0Jhc2gnLCByZWFzb246ICdlbXB0eSBjb21tYW5kJyB9KTtcbiAgICAgKiBgYGBcbiAgICAgKi9cbiAgICBlcnJvcihtZXNzYWdlLCBjb250ZXh0KSB7XG4gICAgICAgIHRoaXMuZW1pdChcImVycm9yXCIsIG1lc3NhZ2UsIGNvbnRleHQpO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBMb2dzIGEgc3RydWN0dXJlZCBlcnJvciB3aXRoIGZ1bGwgZXJyb3IgZGV0YWlscy5cbiAgICAgKlxuICAgICAqIFVzZSB0aGlzIG1ldGhvZCB3aGVuIGxvZ2dpbmcgY2F1Z2h0IGV4Y2VwdGlvbnMgdG8gY2FwdHVyZSB0aGUgZnVsbFxuICAgICAqIGVycm9yIGNvbnRleHQgaW5jbHVkaW5nIG5hbWUsIG1lc3NhZ2UsIHN0YWNrIHRyYWNlLCBhbmQgY2F1c2UgY2hhaW4uXG4gICAgICogQHBhcmFtIGVycm9yIC0gVGhlIGVycm9yIHRvIGxvZ1xuICAgICAqIEBwYXJhbSBtZXNzYWdlIC0gSHVtYW4tcmVhZGFibGUgZGVzY3JpcHRpb24gb2Ygd2hhdCBmYWlsZWRcbiAgICAgKiBAcGFyYW0gY29udGV4dCAtIE9wdGlvbmFsIGFkZGl0aW9uYWwgY29udGV4dFxuICAgICAqIEBleGFtcGxlXG4gICAgICogYGBgdHlwZXNjcmlwdFxuICAgICAqIHRyeSB7XG4gICAgICogICBhd2FpdCBkYW5nZXJvdXNPcGVyYXRpb24oKTtcbiAgICAgKiB9IGNhdGNoIChlcnIpIHtcbiAgICAgKiAgIGxvZ2dlci5sb2dFcnJvcihlcnIsICdGYWlsZWQgdG8gZXhlY3V0ZSBkYW5nZXJvdXMgb3BlcmF0aW9uJywge1xuICAgICAqICAgICBvcGVyYXRpb246ICdkZWxldGUnLFxuICAgICAqICAgICB0YXJnZXQ6ICcvaW1wb3J0YW50L2ZpbGUudHh0J1xuICAgICAqICAgfSk7XG4gICAgICogfVxuICAgICAqIGBgYFxuICAgICAqL1xuICAgIGxvZ0Vycm9yKGVycm9yLCBtZXNzYWdlLCBjb250ZXh0KSB7XG4gICAgICAgIGNvbnN0IGVycm9ySW5mbyA9IHRoaXMuZXh0cmFjdEVycm9ySW5mbyhlcnJvcik7XG4gICAgICAgIGNvbnN0IGV2ZW50ID0ge1xuICAgICAgICAgICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXG4gICAgICAgICAgICBsZXZlbDogXCJlcnJvclwiLFxuICAgICAgICAgICAgaG9va1R5cGU6IHRoaXMuY3VycmVudEhvb2tUeXBlLFxuICAgICAgICAgICAgbWVzc2FnZSxcbiAgICAgICAgICAgIGlucHV0OiB0aGlzLmN1cnJlbnRJbnB1dCxcbiAgICAgICAgICAgIGVycm9yOiBlcnJvckluZm8sXG4gICAgICAgICAgICBjb250ZXh0LFxuICAgICAgICB9O1xuICAgICAgICB0aGlzLmRlbGl2ZXJFdmVudChldmVudCk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIFN1YnNjcmliZXMgYSBoYW5kbGVyIHRvIGxvZyBldmVudHMgYXQgdGhlIHNwZWNpZmllZCBsZXZlbC5cbiAgICAgKlxuICAgICAqIFRoZSBoYW5kbGVyIHdpbGwgYmUgY2FsbGVkIGZvciBldmVyeSBsb2cgZXZlbnQgYXQgdGhlIHNwZWNpZmllZCBsZXZlbC5cbiAgICAgKiBSZXR1cm5zIGFuIHVuc3Vic2NyaWJlIGZ1bmN0aW9uIHRoYXQgc2hvdWxkIGJlIGNhbGxlZCB3aGVuIHRoZSBoYW5kbGVyXG4gICAgICogaXMgbm8gbG9uZ2VyIG5lZWRlZC5cbiAgICAgKiBAcGFyYW0gbGV2ZWwgLSBUaGUgbG9nIGxldmVsIHRvIHN1YnNjcmliZSB0b1xuICAgICAqIEBwYXJhbSBoYW5kbGVyIC0gVGhlIGhhbmRsZXIgZnVuY3Rpb24gdG8gY2FsbCBmb3IgZWFjaCBldmVudFxuICAgICAqIEByZXR1cm5zIEEgZnVuY3Rpb24gdG8gdW5zdWJzY3JpYmUgdGhlIGhhbmRsZXJcbiAgICAgKiBAZXhhbXBsZVxuICAgICAqIGBgYHR5cGVzY3JpcHRcbiAgICAgKiAvLyBTdWJzY3JpYmUgdG8gZXJyb3IgZXZlbnRzXG4gICAgICogY29uc3QgdW5zdWJzY3JpYmUgPSBsb2dnZXIub24oJ2Vycm9yJywgKGV2ZW50KSA9PiB7XG4gICAgICogICBjb25zb2xlLmVycm9yKGBbJHtldmVudC5ob29rVHlwZX1dICR7ZXZlbnQubWVzc2FnZX1gKTtcbiAgICAgKiAgIGlmIChldmVudC5lcnJvcikge1xuICAgICAqICAgICBjb25zb2xlLmVycm9yKGV2ZW50LmVycm9yLnN0YWNrKTtcbiAgICAgKiAgIH1cbiAgICAgKiB9KTtcbiAgICAgKlxuICAgICAqIC8vIExhdGVyLCBjbGVhbiB1cFxuICAgICAqIHVuc3Vic2NyaWJlKCk7XG4gICAgICogYGBgXG4gICAgICogQGV4YW1wbGVcbiAgICAgKiBgYGB0eXBlc2NyaXB0XG4gICAgICogLy8gRm9yd2FyZCB0byBleHRlcm5hbCBsb2dnaW5nIGxpYnJhcnlcbiAgICAgKiBpbXBvcnQgcGlubyBmcm9tICdwaW5vJztcbiAgICAgKiBjb25zdCBwaW5vTG9nZ2VyID0gcGlubygpO1xuICAgICAqXG4gICAgICogbG9nZ2VyLm9uKCdpbmZvJywgKGV2ZW50KSA9PiBwaW5vTG9nZ2VyLmluZm8oZXZlbnQsIGV2ZW50Lm1lc3NhZ2UpKTtcbiAgICAgKiBsb2dnZXIub24oJ3dhcm4nLCAoZXZlbnQpID0+IHBpbm9Mb2dnZXIud2FybihldmVudCwgZXZlbnQubWVzc2FnZSkpO1xuICAgICAqIGxvZ2dlci5vbignZXJyb3InLCAoZXZlbnQpID0+IHBpbm9Mb2dnZXIuZXJyb3IoZXZlbnQsIGV2ZW50Lm1lc3NhZ2UpKTtcbiAgICAgKiBgYGBcbiAgICAgKi9cbiAgICBvbihsZXZlbCwgaGFuZGxlcikge1xuICAgICAgICBjb25zdCBsZXZlbEhhbmRsZXJzID0gdGhpcy5oYW5kbGVycy5nZXQobGV2ZWwpO1xuICAgICAgICBpZiAobGV2ZWxIYW5kbGVycykge1xuICAgICAgICAgICAgbGV2ZWxIYW5kbGVycy5hZGQoaGFuZGxlcik7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuICgpID0+IHtcbiAgICAgICAgICAgIGxldmVsSGFuZGxlcnM/LmRlbGV0ZShoYW5kbGVyKTtcbiAgICAgICAgfTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogU2V0cyB0aGUgY3VycmVudCBob29rIGNvbnRleHQgZm9yIGVucmljaGluZyBsb2cgZXZlbnRzLlxuICAgICAqXG4gICAgICogVGhpcyBpcyBjYWxsZWQgaW50ZXJuYWxseSBieSB0aGUgcnVudGltZSBiZWZvcmUgaW52b2tpbmcgaG9vayBoYW5kbGVycy5cbiAgICAgKiBZb3UgdHlwaWNhbGx5IGRvbid0IG5lZWQgdG8gY2FsbCB0aGlzIGRpcmVjdGx5LlxuICAgICAqIEBwYXJhbSBob29rVHlwZSAtIFRoZSB0eXBlIG9mIGhvb2sgYmVpbmcgZXhlY3V0ZWRcbiAgICAgKiBAcGFyYW0gaW5wdXQgLSBUaGUgaG9vayBpbnB1dCBkYXRhXG4gICAgICogQGludGVybmFsXG4gICAgICovXG4gICAgc2V0Q29udGV4dChob29rVHlwZSwgaW5wdXQpIHtcbiAgICAgICAgdGhpcy5jdXJyZW50SG9va1R5cGUgPSBob29rVHlwZTtcbiAgICAgICAgdGhpcy5jdXJyZW50SW5wdXQgPSBpbnB1dDtcbiAgICB9XG4gICAgLyoqXG4gICAgICogQ2xlYXJzIHRoZSBjdXJyZW50IGhvb2sgY29udGV4dC5cbiAgICAgKlxuICAgICAqIENhbGxlZCBpbnRlcm5hbGx5IGJ5IHRoZSBydW50aW1lIGFmdGVyIGhvb2sgZXhlY3V0aW9uIGNvbXBsZXRlcy5cbiAgICAgKiBAaW50ZXJuYWxcbiAgICAgKi9cbiAgICBjbGVhckNvbnRleHQoKSB7XG4gICAgICAgIHRoaXMuY3VycmVudEhvb2tUeXBlID0gdW5kZWZpbmVkO1xuICAgICAgICB0aGlzLmN1cnJlbnRJbnB1dCA9IHVuZGVmaW5lZDtcbiAgICB9XG4gICAgLyoqXG4gICAgICogQ29uZmlndXJlcyB0aGUgbG9nIGZpbGUgcGF0aCBhdCBydW50aW1lLlxuICAgICAqXG4gICAgICogQ2FsbCB0aGlzIHRvIGVuYWJsZSBvciBjaGFuZ2UgZmlsZSBsb2dnaW5nLiBTZXR0aW5nIHRvIGBudWxsYCBkaXNhYmxlc1xuICAgICAqIGZpbGUgbG9nZ2luZyAoYnV0IGRvZXNuJ3QgY2xvc2UgZXhpc3RpbmcgZmlsZSBoYW5kbGUgaW1tZWRpYXRlbHkpLlxuICAgICAqIEBwYXJhbSBmaWxlUGF0aCAtIFBhdGggdG8gdGhlIGxvZyBmaWxlLCBvciBudWxsIHRvIGRpc2FibGVcbiAgICAgKiBAZXhhbXBsZVxuICAgICAqIGBgYHR5cGVzY3JpcHRcbiAgICAgKiAvLyBFbmFibGUgZmlsZSBsb2dnaW5nIGF0IHJ1bnRpbWVcbiAgICAgKiBsb2dnZXIuc2V0TG9nRmlsZSgnL3Zhci9sb2cvY2xhdWRlLWhvb2tzLmxvZycpO1xuICAgICAqXG4gICAgICogLy8gRGlzYWJsZSBmaWxlIGxvZ2dpbmdcbiAgICAgKiBsb2dnZXIuc2V0TG9nRmlsZShudWxsKTtcbiAgICAgKiBgYGBcbiAgICAgKi9cbiAgICBzZXRMb2dGaWxlKGZpbGVQYXRoKSB7XG4gICAgICAgIC8vIENsb3NlIGV4aXN0aW5nIGZpbGUgaWYgb3BlblxuICAgICAgICBpZiAodGhpcy5sb2dGaWxlRmQgIT09IG51bGwpIHtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgY2xvc2VTeW5jKHRoaXMubG9nRmlsZUZkKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhdGNoIChjbG9zZUVycm9yKSB7XG4gICAgICAgICAgICAgICAgcHJvY2Vzcy5zdGRlcnIud3JpdGUoYFtjbGF1ZGUtY29kZS1ob29rc10gRmFpbGVkIHRvIGNsb3NlIGxvZyBmaWxlOiAke1N0cmluZyhjbG9zZUVycm9yKX1cXG5gKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMubG9nRmlsZUZkID0gbnVsbDtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmxvZ0ZpbGVQYXRoID0gZmlsZVBhdGg7XG4gICAgICAgIHRoaXMuZmlsZUluaXRpYWxpemVkID0gZmFsc2U7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIENsb3NlcyBhbGwgcmVzb3VyY2VzIGhlbGQgYnkgdGhlIGxvZ2dlci5cbiAgICAgKlxuICAgICAqIENhbGwgdGhpcyBkdXJpbmcgZ3JhY2VmdWwgc2h1dGRvd24gdG8gZW5zdXJlIGFsbCBsb2cgZGF0YSBpcyBmbHVzaGVkLlxuICAgICAqIEBleGFtcGxlXG4gICAgICogYGBgdHlwZXNjcmlwdFxuICAgICAqIHByb2Nlc3Mub24oJ2V4aXQnLCAoKSA9PiB7XG4gICAgICogICBsb2dnZXIuY2xvc2UoKTtcbiAgICAgKiB9KTtcbiAgICAgKiBgYGBcbiAgICAgKi9cbiAgICBjbG9zZSgpIHtcbiAgICAgICAgaWYgKHRoaXMubG9nRmlsZUZkICE9PSBudWxsKSB7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIGNsb3NlU3luYyh0aGlzLmxvZ0ZpbGVGZCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXRjaCAoY2xvc2VFcnJvcikge1xuICAgICAgICAgICAgICAgIHByb2Nlc3Muc3RkZXJyLndyaXRlKGBbY2xhdWRlLWNvZGUtaG9va3NdIEZhaWxlZCB0byBjbG9zZSBsb2cgZmlsZTogJHtTdHJpbmcoY2xvc2VFcnJvcil9XFxuYCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLmxvZ0ZpbGVGZCA9IG51bGw7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5maWxlSW5pdGlhbGl6ZWQgPSBmYWxzZTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogQ2hlY2tzIGlmIHRoZXJlIGFyZSBhbnkgYWN0aXZlIGhhbmRsZXJzIG9yIGRlc3RpbmF0aW9ucy5cbiAgICAgKlxuICAgICAqIFJldHVybnMgdHJ1ZSBpZiBhbnkgaGFuZGxlcnMgYXJlIHJlZ2lzdGVyZWQgb3IgZmlsZSBsb2dnaW5nIGlzIGVuYWJsZWQuXG4gICAgICogQHJldHVybnMgV2hldGhlciB0aGUgbG9nZ2VyIGhhcyBhbnkgYWN0aXZlIG91dHB1dCBkZXN0aW5hdGlvbnNcbiAgICAgKi9cbiAgICBoYXNEZXN0aW5hdGlvbnMoKSB7XG4gICAgICAgIGZvciAoY29uc3QgaGFuZGxlcnMgb2YgdGhpcy5oYW5kbGVycy52YWx1ZXMoKSkge1xuICAgICAgICAgICAgaWYgKGhhbmRsZXJzLnNpemUgPiAwKVxuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzLmxvZ0ZpbGVQYXRoICE9PSBudWxsO1xuICAgIH1cbiAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICAgLy8gUHJpdmF0ZSBNZXRob2RzXG4gICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgIC8qKlxuICAgICAqIEVtaXRzIGEgbG9nIGV2ZW50LlxuICAgICAqIEBwYXJhbSBsZXZlbCAtIFRoZSBzZXZlcml0eSBsZXZlbCBvZiB0aGUgZXZlbnRcbiAgICAgKiBAcGFyYW0gbWVzc2FnZSAtIFRoZSBsb2cgbWVzc2FnZVxuICAgICAqIEBwYXJhbSBjb250ZXh0IC0gT3B0aW9uYWwgYWRkaXRpb25hbCBjb250ZXh0IGRhdGFcbiAgICAgKi9cbiAgICBlbWl0KGxldmVsLCBtZXNzYWdlLCBjb250ZXh0KSB7XG4gICAgICAgIGNvbnN0IGV2ZW50ID0ge1xuICAgICAgICAgICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXG4gICAgICAgICAgICBsZXZlbCxcbiAgICAgICAgICAgIGhvb2tUeXBlOiB0aGlzLmN1cnJlbnRIb29rVHlwZSxcbiAgICAgICAgICAgIG1lc3NhZ2UsXG4gICAgICAgICAgICBpbnB1dDogdGhpcy5jdXJyZW50SW5wdXQsXG4gICAgICAgICAgICBjb250ZXh0LFxuICAgICAgICB9O1xuICAgICAgICB0aGlzLmRlbGl2ZXJFdmVudChldmVudCk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIERlbGl2ZXJzIGFuIGV2ZW50IHRvIGFsbCByZWdpc3RlcmVkIGRlc3RpbmF0aW9ucy5cbiAgICAgKiBAcGFyYW0gZXZlbnQgLSBUaGUgbG9nIGV2ZW50IHRvIGRlbGl2ZXJcbiAgICAgKi9cbiAgICBkZWxpdmVyRXZlbnQoZXZlbnQpIHtcbiAgICAgICAgLy8gRGVsaXZlciB0byBldmVudCBoYW5kbGVyc1xuICAgICAgICBjb25zdCBsZXZlbEhhbmRsZXJzID0gdGhpcy5oYW5kbGVycy5nZXQoZXZlbnQubGV2ZWwpO1xuICAgICAgICBpZiAobGV2ZWxIYW5kbGVycykge1xuICAgICAgICAgICAgZm9yIChjb25zdCBoYW5kbGVyIG9mIGxldmVsSGFuZGxlcnMpIHtcbiAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICBoYW5kbGVyKGV2ZW50KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY2F0Y2ggKGhhbmRsZXJFcnJvcikge1xuICAgICAgICAgICAgICAgICAgICBwcm9jZXNzLnN0ZGVyci53cml0ZShgW2NsYXVkZS1jb2RlLWhvb2tzXSBMb2cgaGFuZGxlciBlcnJvcjogJHtTdHJpbmcoaGFuZGxlckVycm9yKX1cXG5gKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgLy8gV3JpdGUgdG8gZmlsZSBpZiBjb25maWd1cmVkXG4gICAgICAgIHRoaXMud3JpdGVUb0ZpbGUoZXZlbnQpO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBXcml0ZXMgYW4gZXZlbnQgdG8gdGhlIGxvZyBmaWxlLlxuICAgICAqIEBwYXJhbSBldmVudCAtIFRoZSBsb2cgZXZlbnQgdG8gd3JpdGVcbiAgICAgKi9cbiAgICB3cml0ZVRvRmlsZShldmVudCkge1xuICAgICAgICBpZiAoIXRoaXMubG9nRmlsZVBhdGgpXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIC8vIExhenkgaW5pdGlhbGl6YXRpb24gb2YgZmlsZSBoYW5kbGVcbiAgICAgICAgaWYgKCF0aGlzLmZpbGVJbml0aWFsaXplZCkge1xuICAgICAgICAgICAgdGhpcy5pbml0aWFsaXplRmlsZSgpO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0aGlzLmxvZ0ZpbGVGZCA9PT0gbnVsbClcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IGxpbmUgPSBgJHtKU09OLnN0cmluZ2lmeShldmVudCl9XFxuYDtcbiAgICAgICAgICAgIHdyaXRlU3luYyh0aGlzLmxvZ0ZpbGVGZCwgbGluZSk7XG4gICAgICAgIH1cbiAgICAgICAgY2F0Y2ggKHdyaXRlRXJyb3IpIHtcbiAgICAgICAgICAgIC8vIERpc2FibGUgZmlsZSBsb2dnaW5nIGFmdGVyIGEgd3JpdGUgZmFpbHVyZSB0byBhdm9pZCByZXBlYXRlZCBlcnJvcnNcbiAgICAgICAgICAgIHRoaXMubG9nRmlsZUZkID0gbnVsbDtcbiAgICAgICAgICAgIHRoaXMuZmlsZUluaXRpYWxpemVkID0gZmFsc2U7XG4gICAgICAgICAgICBwcm9jZXNzLnN0ZGVyci53cml0ZShgW2NsYXVkZS1jb2RlLWhvb2tzXSBMb2cgZmlsZSB3cml0ZSBmYWlsZWQ6ICR7U3RyaW5nKHdyaXRlRXJyb3IpfVxcbmApO1xuICAgICAgICB9XG4gICAgfVxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemVzIHRoZSBsb2cgZmlsZSBmb3Igd3JpdGluZy5cbiAgICAgKi9cbiAgICBpbml0aWFsaXplRmlsZSgpIHtcbiAgICAgICAgdGhpcy5maWxlSW5pdGlhbGl6ZWQgPSB0cnVlO1xuICAgICAgICBpZiAoIXRoaXMubG9nRmlsZVBhdGgpXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICAvLyBFbnN1cmUgZGlyZWN0b3J5IGV4aXN0c1xuICAgICAgICAgICAgY29uc3QgZGlyID0gZGlybmFtZSh0aGlzLmxvZ0ZpbGVQYXRoKTtcbiAgICAgICAgICAgIGlmICghZXhpc3RzU3luYyhkaXIpKSB7XG4gICAgICAgICAgICAgICAgbWtkaXJTeW5jKGRpciwgeyByZWN1cnNpdmU6IHRydWUgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBPcGVuIGZpbGUgZm9yIGFwcGVuZGluZ1xuICAgICAgICAgICAgdGhpcy5sb2dGaWxlRmQgPSBvcGVuU3luYyh0aGlzLmxvZ0ZpbGVQYXRoLCBcImFcIik7XG4gICAgICAgIH1cbiAgICAgICAgY2F0Y2gge1xuICAgICAgICAgICAgLy8gU2lsZW50bHkgaWdub3JlIGZpbGUgaW5pdGlhbGl6YXRpb24gZXJyb3JzXG4gICAgICAgICAgICB0aGlzLmxvZ0ZpbGVGZCA9IG51bGw7XG4gICAgICAgIH1cbiAgICB9XG4gICAgLyoqXG4gICAgICogRXh0cmFjdHMgc3RydWN0dXJlZCBlcnJvciBpbmZvcm1hdGlvbiBmcm9tIGFuIHVua25vd24gZXJyb3IuXG4gICAgICogQHBhcmFtIGVycm9yIC0gVGhlIGVycm9yIHRvIGV4dHJhY3QgaW5mb3JtYXRpb24gZnJvbVxuICAgICAqIEByZXR1cm5zIFN0cnVjdHVyZWQgZXJyb3IgaW5mb3JtYXRpb25cbiAgICAgKi9cbiAgICBleHRyYWN0RXJyb3JJbmZvKGVycm9yKSB7XG4gICAgICAgIGlmIChlcnJvciBpbnN0YW5jZW9mIEVycm9yKSB7XG4gICAgICAgICAgICBjb25zdCBpbmZvID0ge1xuICAgICAgICAgICAgICAgIG5hbWU6IGVycm9yLm5hbWUsXG4gICAgICAgICAgICAgICAgbWVzc2FnZTogZXJyb3IubWVzc2FnZSxcbiAgICAgICAgICAgICAgICBzdGFjazogZXJyb3Iuc3RhY2ssXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgLy8gRXh0cmFjdCBjYXVzZSBjaGFpbiBpZiBwcmVzZW50XG4gICAgICAgICAgICBpZiAoZXJyb3IuY2F1c2UgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgIGluZm8uY2F1c2UgPSB0aGlzLmV4dHJhY3RFcnJvckluZm8oZXJyb3IuY2F1c2UpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIGluZm87XG4gICAgICAgIH1cbiAgICAgICAgLy8gSGFuZGxlIG5vbi1FcnJvciB2YWx1ZXNcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIG5hbWU6IFwiVW5rbm93bkVycm9yXCIsXG4gICAgICAgICAgICBtZXNzYWdlOiBTdHJpbmcoZXJyb3IpLFxuICAgICAgICB9O1xuICAgIH1cbn1cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIFNpbmdsZXRvbiBFeHBvcnRcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8qKlxuICogR2xvYmFsIGxvZ2dlciBpbnN0YW5jZSBmb3IgQ2xhdWRlIENvZGUgaG9va3MuXG4gKlxuICogVXNlIHRoaXMgc2luZ2xldG9uIGZvciBhbGwgbG9nZ2luZyB3aXRoaW4gaG9va3MuIFRoZSBsb2dnZXIgaXMgY29uZmlndXJlZFxuICogdmlhIGVudmlyb25tZW50IHZhcmlhYmxlcyBhbmQgc3VwcG9ydHMgZXZlbnQgc3Vic2NyaXB0aW9uIGZvciBjdXN0b21cbiAqIGRlc3RpbmF0aW9ucy5cbiAqXG4gKiAjIyBDb25maWd1cmF0aW9uXG4gKlxuICogfCBFbnZpcm9ubWVudCBWYXJpYWJsZSB8IERlc2NyaXB0aW9uIHxcbiAqIHwtLS0tLS0tLS0tLS0tLS0tLS0tLS18LS0tLS0tLS0tLS0tLXxcbiAqIHwgYENMQVVERV9DT0RFX0hPT0tTX0xPR19GSUxFYCB8IFBhdGggdG8gbG9nIGZpbGUgKEpTT04gTGluZXMgZm9ybWF0KSB8XG4gKlxuICogIyMgVXNhZ2UgaW4gSG9va3NcbiAqXG4gKiBUaGUgbG9nZ2VyIGlzIHBhc3NlZCB0byBob29rIGhhbmRsZXJzIHZpYSBjb250ZXh0IGZvciBjb252ZW5pZW5jZTpcbiAqXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBleHBvcnQgZGVmYXVsdCBwcmVUb29sVXNlSG9vayh7IG1hdGNoZXI6ICdCYXNoJyB9LCBhc3luYyAoaW5wdXQsIHsgbG9nZ2VyIH0pID0+IHtcbiAqICAgbG9nZ2VyLndhcm4oJ1ZhbGlkYXRpbmcgQmFzaCBjb21tYW5kJyk7XG4gKiAgIHJldHVybiBwcmVUb29sVXNlT3V0cHV0KHsgYWxsb3c6IHRydWUgfSk7XG4gKiB9KTtcbiAqIGBgYFxuICpcbiAqICMjIEV4dGVybmFsIEludGVncmF0aW9uXG4gKlxuICogU3Vic2NyaWJlIHRvIGV2ZW50cyB0byBmb3J3YXJkIGxvZ3MgdG8gZXh0ZXJuYWwgc3lzdGVtczpcbiAqXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBpbXBvcnQgeyBsb2dnZXIgfSBmcm9tICdAZ29vZGZvb3QvY2xhdWRlLWNvZGUtaG9va3MnO1xuICogaW1wb3J0IHBpbm8gZnJvbSAncGlubyc7XG4gKlxuICogY29uc3QgcGlub0xvZ2dlciA9IHBpbm8oeyBsZXZlbDogJ2RlYnVnJyB9KTtcbiAqXG4gKiBsb2dnZXIub24oJ2RlYnVnJywgKGV2ZW50KSA9PiBwaW5vTG9nZ2VyLmRlYnVnKGV2ZW50LCBldmVudC5tZXNzYWdlKSk7XG4gKiBsb2dnZXIub24oJ2luZm8nLCAoZXZlbnQpID0+IHBpbm9Mb2dnZXIuaW5mbyhldmVudCwgZXZlbnQubWVzc2FnZSkpO1xuICogbG9nZ2VyLm9uKCd3YXJuJywgKGV2ZW50KSA9PiBwaW5vTG9nZ2VyLndhcm4oZXZlbnQsIGV2ZW50Lm1lc3NhZ2UpKTtcbiAqIGxvZ2dlci5vbignZXJyb3InLCAoZXZlbnQpID0+IHBpbm9Mb2dnZXIuZXJyb3IoZXZlbnQsIGV2ZW50Lm1lc3NhZ2UpKTtcbiAqIGBgYFxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIC8vIERpcmVjdCB1c2FnZVxuICogaW1wb3J0IHsgbG9nZ2VyIH0gZnJvbSAnQGdvb2Rmb290L2NsYXVkZS1jb2RlLWhvb2tzJztcbiAqXG4gKiBsb2dnZXIuaW5mbygnU3RhcnRpbmcgb3BlcmF0aW9uJyk7XG4gKiBsb2dnZXIud2FybignUmVzb3VyY2UgbGltaXQgYXBwcm9hY2hpbmcnLCB7IHVzYWdlOiAwLjkgfSk7XG4gKlxuICogdHJ5IHtcbiAqICAgYXdhaXQgcmlza3lPcGVyYXRpb24oKTtcbiAqIH0gY2F0Y2ggKGVycikge1xuICogICBsb2dnZXIubG9nRXJyb3IoZXJyLCAnUmlza3kgb3BlcmF0aW9uIGZhaWxlZCcpO1xuICogfVxuICogYGBgXG4gKi9cbi8vIENMQVVERV9DT0RFX0hPT0tTX0xPR19FTlZfVkFSIGlzIHNldCB1bmNvbmRpdGlvbmFsbHkgYnkgdGhlIC0tbG9nLWVudi12YXIgYmFubmVyXG4vLyBiZWZvcmUgdGhpcyBtb2R1bGUgaW5pdGlhbGlzZXMuIElmIGFic2VudCwgZmFsbCBiYWNrIHRvIHRoZSBkZWZhdWx0IGVudiB2YXIgbmFtZS5cbmV4cG9ydCBjb25zdCBsb2dnZXIgPSBuZXcgTG9nZ2VyKHtcbiAgICBsb2dFbnZWYXI6IHByb2Nlc3MuZW52LkNMQVVERV9DT0RFX0hPT0tTX0xPR19FTlZfVkFSID8/IFwiQ0xBVURFX0NPREVfSE9PS1NfTE9HX0ZJTEVcIixcbn0pO1xuIiwgIi8qKlxuICogT3V0cHV0IHR5cGVzIGFuZCBidWlsZGVycyBmb3IgQ2xhdWRlIENvZGUgaG9va3MuXG4gKlxuICogUHJvdmlkZXMgdHlwZS1zYWZlIG91dHB1dCBidWlsZGVyIGZ1bmN0aW9ucyBmb3IgYWxsIDEyIGhvb2sgdHlwZXMuIEVhY2ggYnVpbGRlclxuICogYWNjZXB0cyBvcHRpb25zIHRoYXQgbWF0Y2ggdGhlIHdpcmUgZm9ybWF0IGV4cGVjdGVkIGJ5IENsYXVkZSBDb2RlLCB3aXRoIHR5cGVzXG4gKiBkZXJpdmVkIGZyb20gdGhlIENsYXVkZSBBZ2VudCBTREsncyBgU3luY0hvb2tKU09OT3V0cHV0YCB0eXBlLlxuICogQHNlZSBodHRwczovL2NvZGUuY2xhdWRlLmNvbS9kb2NzL2VuL2hvb2tzXG4gKiBAbW9kdWxlXG4gKi9cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIEV4aXQgQ29kZSBDb25zdGFudHNcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8qKlxuICogRXhpdCBjb2RlcyB1c2VkIGJ5IENsYXVkZSBDb2RlIGhvb2tzLlxuICpcbiAqIHwgRXhpdCBDb2RlIHwgTmFtZSB8IFdoZW4gVXNlZCB8IENsYXVkZSBDb2RlIEJlaGF2aW9yIHxcbiAqIHwtLS0tLS0tLS0tLXwtLS0tLS18LS0tLS0tLS0tLS18LS0tLS0tLS0tLS0tLS0tLS0tLS0tfFxuICogfCAwIHwgU3VjY2VzcyB8IEhhbmRsZXIgcmV0dXJucyBub3JtYWxseSB8IENvbnRpbnVlLCBwYXJzZSBzdGRvdXQgYXMgSlNPTiB8XG4gKiB8IDEgfCBFcnJvciB8IEludmFsaWQgaW5wdXQsIG5vbi1ibG9ja2luZyBlcnJvciB8IE5vbi1ibG9ja2luZywgc3RkZXJyIHRvIHVzZXIgb25seSB8XG4gKiB8IDIgfCBCbG9jayB8IEhhbmRsZXIgdGhyb3dzIE9SIGBzdG9wUmVhc29uYCBzZXQgfCBCbG9ja2luZywgc3RkZXJyIHNob3duIHRvIENsYXVkZSB8XG4gKi9cbmV4cG9ydCBjb25zdCBFWElUX0NPREVTID0ge1xuICAgIC8qKiBIYW5kbGVyIGNvbXBsZXRlZCBzdWNjZXNzZnVsbHkuIENsYXVkZSBDb2RlIHBhcnNlcyBzdGRvdXQgYXMgSlNPTi4gKi9cbiAgICBTVUNDRVNTOiAwLFxuICAgIC8qKiBOb24tYmxvY2tpbmcgZXJyb3Igb2NjdXJyZWQgKGUuZy4sIGludmFsaWQgaW5wdXQpLiBzdGRlcnIgc2hvd24gdG8gdXNlciBvbmx5LiAqL1xuICAgIEVSUk9SOiAxLFxuICAgIC8qKiBIYW5kbGVyIHRocmV3IGV4Y2VwdGlvbiBPUiBibG9ja2luZyBhY3Rpb24gcmVxdWVzdGVkLiBzdGRlcnIgc2hvd24gdG8gQ2xhdWRlLiAqL1xuICAgIEJMT0NLOiAyLFxufTtcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIE91dHB1dCBCdWlsZGVyIEZhY3Rvcmllc1xuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLyoqXG4gKiBGYWN0b3J5IGZvciBob29rcyB0aGF0IGhhdmUgaG9va1NwZWNpZmljT3V0cHV0IHdpdGggYSBob29rRXZlbnROYW1lIGRpc2NyaW1pbmF0b3IuXG4gKiBAcGFyYW0gaG9va1R5cGUgLSBUaGUgaG9vayB0eXBlIG5hbWUgdXNlZCBhcyB0aGUgX3R5cGUgZGlzY3JpbWluYXRvclxuICogQHJldHVybnMgQSBidWlsZGVyIGZ1bmN0aW9uIHRoYXQgY3JlYXRlcyB0aGUgb3V0cHV0IG9iamVjdFxuICogQGludGVybmFsXG4gKi9cbmZ1bmN0aW9uIGNyZWF0ZUhvb2tTcGVjaWZpY091dHB1dEJ1aWxkZXIoaG9va1R5cGUpIHtcbiAgICByZXR1cm4gKG9wdGlvbnMgPSB7fSkgPT4ge1xuICAgICAgICBjb25zdCB7IGhvb2tTcGVjaWZpY091dHB1dCwgLi4ucmVzdCB9ID0gb3B0aW9ucztcbiAgICAgICAgY29uc3Qgc3Rkb3V0ID0gaG9va1NwZWNpZmljT3V0cHV0ICE9PSB1bmRlZmluZWRcbiAgICAgICAgICAgID8geyAuLi5yZXN0LCBob29rU3BlY2lmaWNPdXRwdXQ6IHsgaG9va0V2ZW50TmFtZTogaG9va1R5cGUsIC4uLmhvb2tTcGVjaWZpY091dHB1dCB9IH1cbiAgICAgICAgICAgIDogcmVzdDtcbiAgICAgICAgcmV0dXJuIHsgX3R5cGU6IGhvb2tUeXBlLCBzdGRvdXQgfTtcbiAgICB9O1xufVxuLyoqXG4gKiBGYWN0b3J5IGZvciBob29rcyB0aGF0IG9ubHkgdXNlIENvbW1vbk9wdGlvbnMgKHNpbXBsZSBwYXNzdGhyb3VnaCkuXG4gKiBAcGFyYW0gaG9va1R5cGUgLSBUaGUgaG9vayB0eXBlIG5hbWUgdXNlZCBhcyB0aGUgX3R5cGUgZGlzY3JpbWluYXRvclxuICogQHJldHVybnMgQSBidWlsZGVyIGZ1bmN0aW9uIHRoYXQgY3JlYXRlcyB0aGUgb3V0cHV0IG9iamVjdFxuICogQGludGVybmFsXG4gKi9cbmZ1bmN0aW9uIGNyZWF0ZVNpbXBsZU91dHB1dEJ1aWxkZXIoaG9va1R5cGUpIHtcbiAgICByZXR1cm4gKG9wdGlvbnMgPSB7fSkgPT4gKHtcbiAgICAgICAgX3R5cGU6IGhvb2tUeXBlLFxuICAgICAgICBzdGRvdXQ6IG9wdGlvbnMsXG4gICAgfSk7XG59XG4vKipcbiAqIEZhY3RvcnkgZm9yIGhvb2tzIHRoYXQgdXNlIGRlY2lzaW9uLWJhc2VkIG9wdGlvbnMgKFN0b3AsIFN1YmFnZW50U3RvcCkuXG4gKiBAcGFyYW0gaG9va1R5cGUgLSBUaGUgaG9vayB0eXBlIG5hbWUgdXNlZCBhcyB0aGUgX3R5cGUgZGlzY3JpbWluYXRvclxuICogQHJldHVybnMgQSBidWlsZGVyIGZ1bmN0aW9uIHRoYXQgY3JlYXRlcyB0aGUgb3V0cHV0IG9iamVjdFxuICogQGludGVybmFsXG4gKi9cbmZ1bmN0aW9uIGNyZWF0ZURlY2lzaW9uT3V0cHV0QnVpbGRlcihob29rVHlwZSkge1xuICAgIHJldHVybiAob3B0aW9ucyA9IHt9KSA9PiAoe1xuICAgICAgICBfdHlwZTogaG9va1R5cGUsXG4gICAgICAgIHN0ZG91dDogb3B0aW9ucyxcbiAgICB9KTtcbn1cbi8qKlxuICogRmFjdG9yeSBmb3IgZXhpdC1jb2RlLWJhc2VkIGhvb2tzIChUZWFtbWF0ZUlkbGUsIFRhc2tDb21wbGV0ZWQpLlxuICpcbiAqIFRoZXNlIGhvb2tzIGRvbid0IHVzZSBKU09OIGRlY2lzaW9uIGNvbnRyb2wgKG5vIENvbW1vbk9wdGlvbnMpLlxuICogVGhlIG9ubHkgb3B0aW9uIGlzIGBzdGRlcnJgIFx1MjAxNCB3aGVuIHByZXNlbnQsIGl0IHRyaWdnZXJzIGV4aXQgY29kZSAyIChCTE9DSykuXG4gKiBTdGRvdXQgYWx3YXlzIHJlY2VpdmVzIGB7fWAgKGVtcHR5IEpTT04gb2JqZWN0KS5cbiAqIEBwYXJhbSBob29rVHlwZSAtIFRoZSBob29rIHR5cGUgbmFtZSB1c2VkIGFzIHRoZSBfdHlwZSBkaXNjcmltaW5hdG9yXG4gKiBAcmV0dXJucyBBIGJ1aWxkZXIgZnVuY3Rpb24gdGhhdCBjcmVhdGVzIHRoZSBvdXRwdXQgb2JqZWN0XG4gKiBAaW50ZXJuYWxcbiAqL1xuZnVuY3Rpb24gY3JlYXRlRXhpdENvZGVPdXRwdXRCdWlsZGVyKGhvb2tUeXBlKSB7XG4gICAgcmV0dXJuICh7IHN0ZGVyciB9ID0ge30pID0+ICh7XG4gICAgICAgIF90eXBlOiBob29rVHlwZSxcbiAgICAgICAgc3Rkb3V0OiB7fSxcbiAgICAgICAgLi4uKHN0ZGVyciAhPT0gdW5kZWZpbmVkID8geyBzdGRlcnIgfSA6IHt9KSxcbiAgICB9KTtcbn1cbi8qKlxuICogQ3JlYXRlcyBhbiBvdXRwdXQgZm9yIFByZVRvb2xVc2UgaG9va3MuXG4gKiBAcGFyYW0gb3B0aW9ucyAtIENvbmZpZ3VyYXRpb24gb3B0aW9ucyBmb3IgdGhlIGhvb2sgb3V0cHV0XG4gKiBAcmV0dXJucyBBIFByZVRvb2xVc2VPdXRwdXQgb2JqZWN0IHJlYWR5IGZvciB0aGUgcnVudGltZVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIC8vIEFsbG93IHRvb2wgZXhlY3V0aW9uXG4gKiBwcmVUb29sVXNlT3V0cHV0KHtcbiAqICAgaG9va1NwZWNpZmljT3V0cHV0OiB7IHBlcm1pc3Npb25EZWNpc2lvbjogJ2FsbG93JyB9XG4gKiB9KTtcbiAqXG4gKiAvLyBEZW55IHdpdGggcmVhc29uXG4gKiBwcmVUb29sVXNlT3V0cHV0KHtcbiAqICAgaG9va1NwZWNpZmljT3V0cHV0OiB7XG4gKiAgICAgcGVybWlzc2lvbkRlY2lzaW9uOiAnZGVueScsXG4gKiAgICAgcGVybWlzc2lvbkRlY2lzaW9uUmVhc29uOiAnRGFuZ2Vyb3VzIGNvbW1hbmQgZGV0ZWN0ZWQnXG4gKiAgIH1cbiAqIH0pO1xuICpcbiAqIC8vIEFsbG93IHdpdGggbW9kaWZpZWQgaW5wdXRcbiAqIHByZVRvb2xVc2VPdXRwdXQoe1xuICogICBob29rU3BlY2lmaWNPdXRwdXQ6IHtcbiAqICAgICBwZXJtaXNzaW9uRGVjaXNpb246ICdhbGxvdycsXG4gKiAgICAgdXBkYXRlZElucHV0OiB7IGNvbW1hbmQ6ICdscyAtbGEnIH1cbiAqICAgfVxuICogfSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNvbnN0IHByZVRvb2xVc2VPdXRwdXQgPSAvKiBAX19QVVJFX18gKi8gY3JlYXRlSG9va1NwZWNpZmljT3V0cHV0QnVpbGRlcihcIlByZVRvb2xVc2VcIik7XG4vKipcbiAqIENyZWF0ZXMgYW4gb3V0cHV0IGZvciBQb3N0VG9vbFVzZSBob29rcy5cbiAqIEBwYXJhbSBvcHRpb25zIC0gQ29uZmlndXJhdGlvbiBvcHRpb25zIGZvciB0aGUgaG9vayBvdXRwdXRcbiAqIEByZXR1cm5zIEEgUG9zdFRvb2xVc2VPdXRwdXQgb2JqZWN0IHJlYWR5IGZvciB0aGUgcnVudGltZVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIC8vIEFkZCBjb250ZXh0IGFmdGVyIGEgZmlsZSByZWFkXG4gKiBwb3N0VG9vbFVzZU91dHB1dCh7XG4gKiAgIGhvb2tTcGVjaWZpY091dHB1dDoge1xuICogICAgIGFkZGl0aW9uYWxDb250ZXh0OiAnRmlsZSBjb250YWlucyBzZW5zaXRpdmUgZGF0YSdcbiAqICAgfVxuICogfSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNvbnN0IHBvc3RUb29sVXNlT3V0cHV0ID0gLyogQF9fUFVSRV9fICovIGNyZWF0ZUhvb2tTcGVjaWZpY091dHB1dEJ1aWxkZXIoXCJQb3N0VG9vbFVzZVwiKTtcbi8qKlxuICogQ3JlYXRlcyBhbiBvdXRwdXQgZm9yIFBvc3RUb29sVXNlRmFpbHVyZSBob29rcy5cbiAqIEBwYXJhbSBvcHRpb25zIC0gQ29uZmlndXJhdGlvbiBvcHRpb25zIGZvciB0aGUgaG9vayBvdXRwdXRcbiAqIEByZXR1cm5zIEEgUG9zdFRvb2xVc2VGYWlsdXJlT3V0cHV0IG9iamVjdCByZWFkeSBmb3IgdGhlIHJ1bnRpbWVcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBwb3N0VG9vbFVzZUZhaWx1cmVPdXRwdXQoe1xuICogICBob29rU3BlY2lmaWNPdXRwdXQ6IHtcbiAqICAgICBhZGRpdGlvbmFsQ29udGV4dDogJ1RyeSB1c2luZyBhIGRpZmZlcmVudCBhcHByb2FjaCdcbiAqICAgfVxuICogfSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNvbnN0IHBvc3RUb29sVXNlRmFpbHVyZU91dHB1dCA9IC8qIEBfX1BVUkVfXyAqLyBjcmVhdGVIb29rU3BlY2lmaWNPdXRwdXRCdWlsZGVyKFwiUG9zdFRvb2xVc2VGYWlsdXJlXCIpO1xuLyoqXG4gKiBDcmVhdGVzIGFuIG91dHB1dCBmb3IgVXNlclByb21wdFN1Ym1pdCBob29rcy5cbiAqIEBwYXJhbSBvcHRpb25zIC0gQ29uZmlndXJhdGlvbiBvcHRpb25zIGZvciB0aGUgaG9vayBvdXRwdXRcbiAqIEByZXR1cm5zIEEgVXNlclByb21wdFN1Ym1pdE91dHB1dCBvYmplY3QgcmVhZHkgZm9yIHRoZSBydW50aW1lXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogdXNlclByb21wdFN1Ym1pdE91dHB1dCh7XG4gKiAgIGhvb2tTcGVjaWZpY091dHB1dDoge1xuICogICAgIGFkZGl0aW9uYWxDb250ZXh0OiAnVGhpcyBwcm9qZWN0IHVzZXMgVHlwZVNjcmlwdCBzdHJpY3QgbW9kZSdcbiAqICAgfVxuICogfSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNvbnN0IHVzZXJQcm9tcHRTdWJtaXRPdXRwdXQgPSAvKiBAX19QVVJFX18gKi8gY3JlYXRlSG9va1NwZWNpZmljT3V0cHV0QnVpbGRlcihcIlVzZXJQcm9tcHRTdWJtaXRcIik7XG4vKipcbiAqIENyZWF0ZXMgYW4gb3V0cHV0IGZvciBTZXNzaW9uU3RhcnQgaG9va3MuXG4gKiBAcGFyYW0gb3B0aW9ucyAtIENvbmZpZ3VyYXRpb24gb3B0aW9ucyBmb3IgdGhlIGhvb2sgb3V0cHV0XG4gKiBAcmV0dXJucyBBIFNlc3Npb25TdGFydE91dHB1dCBvYmplY3QgcmVhZHkgZm9yIHRoZSBydW50aW1lXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogc2Vzc2lvblN0YXJ0T3V0cHV0KHtcbiAqICAgaG9va1NwZWNpZmljT3V0cHV0OiB7XG4gKiAgICAgYWRkaXRpb25hbENvbnRleHQ6IEpTT04uc3RyaW5naWZ5KHsgcHJvamVjdDogJ215LXByb2plY3QnIH0pXG4gKiAgIH1cbiAqIH0pO1xuICogYGBgXG4gKi9cbmV4cG9ydCBjb25zdCBzZXNzaW9uU3RhcnRPdXRwdXQgPSAvKiBAX19QVVJFX18gKi8gY3JlYXRlSG9va1NwZWNpZmljT3V0cHV0QnVpbGRlcihcIlNlc3Npb25TdGFydFwiKTtcbi8qKlxuICogQ3JlYXRlcyBhbiBvdXRwdXQgZm9yIFNlc3Npb25FbmQgaG9va3MuXG4gKiBAcGFyYW0gb3B0aW9ucyAtIENvbmZpZ3VyYXRpb24gb3B0aW9ucyBmb3IgdGhlIGhvb2sgb3V0cHV0XG4gKiBAcmV0dXJucyBBIFNlc3Npb25FbmRPdXRwdXQgb2JqZWN0IHJlYWR5IGZvciB0aGUgcnVudGltZVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIHNlc3Npb25FbmRPdXRwdXQoe30pO1xuICogYGBgXG4gKi9cbmV4cG9ydCBjb25zdCBzZXNzaW9uRW5kT3V0cHV0ID0gLyogQF9fUFVSRV9fICovIGNyZWF0ZVNpbXBsZU91dHB1dEJ1aWxkZXIoXCJTZXNzaW9uRW5kXCIpO1xuLyoqXG4gKiBDcmVhdGVzIGFuIG91dHB1dCBmb3IgU3RvcCBob29rcy5cbiAqIEBwYXJhbSBvcHRpb25zIC0gQ29uZmlndXJhdGlvbiBvcHRpb25zIGZvciB0aGUgaG9vayBvdXRwdXRcbiAqIEByZXR1cm5zIEEgU3RvcE91dHB1dCBvYmplY3QgcmVhZHkgZm9yIHRoZSBydW50aW1lXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogLy8gQWxsb3cgdGhlIHN0b3BcbiAqIHN0b3BPdXRwdXQoeyBkZWNpc2lvbjogJ2FwcHJvdmUnIH0pO1xuICpcbiAqIC8vIEJsb2NrIHdpdGggcmVhc29uXG4gKiBzdG9wT3V0cHV0KHtcbiAqICAgZGVjaXNpb246ICdibG9jaycsXG4gKiAgIHJlYXNvbjogJ1RoZXJlIGFyZSB1bmNvbW1pdHRlZCBjaGFuZ2VzJ1xuICogfSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNvbnN0IHN0b3BPdXRwdXQgPSAvKiBAX19QVVJFX18gKi8gY3JlYXRlRGVjaXNpb25PdXRwdXRCdWlsZGVyKFwiU3RvcFwiKTtcbi8qKlxuICogQ3JlYXRlcyBhbiBvdXRwdXQgZm9yIFN0b3BGYWlsdXJlIGhvb2tzLlxuICogQHBhcmFtIG9wdGlvbnMgLSBDb25maWd1cmF0aW9uIG9wdGlvbnMgZm9yIHRoZSBob29rIG91dHB1dFxuICogQHJldHVybnMgQSBTdG9wRmFpbHVyZU91dHB1dCBvYmplY3QgcmVhZHkgZm9yIHRoZSBydW50aW1lXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogc3RvcEZhaWx1cmVPdXRwdXQoe30pO1xuICogYGBgXG4gKi9cbmV4cG9ydCBjb25zdCBzdG9wRmFpbHVyZU91dHB1dCA9IC8qIEBfX1BVUkVfXyAqLyBjcmVhdGVTaW1wbGVPdXRwdXRCdWlsZGVyKFwiU3RvcEZhaWx1cmVcIik7XG4vKipcbiAqIENyZWF0ZXMgYW4gb3V0cHV0IGZvciBTdWJhZ2VudFN0YXJ0IGhvb2tzLlxuICogQHBhcmFtIG9wdGlvbnMgLSBDb25maWd1cmF0aW9uIG9wdGlvbnMgZm9yIHRoZSBob29rIG91dHB1dFxuICogQHJldHVybnMgQSBTdWJhZ2VudFN0YXJ0T3V0cHV0IG9iamVjdCByZWFkeSBmb3IgdGhlIHJ1bnRpbWVcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBzdWJhZ2VudFN0YXJ0T3V0cHV0KHtcbiAqICAgaG9va1NwZWNpZmljT3V0cHV0OiB7XG4gKiAgICAgYWRkaXRpb25hbENvbnRleHQ6ICdGb2N1cyBvbiBmaW5kaW5nIHBhdHRlcm5zJ1xuICogICB9XG4gKiB9KTtcbiAqIGBgYFxuICovXG5leHBvcnQgY29uc3Qgc3ViYWdlbnRTdGFydE91dHB1dCA9IC8qIEBfX1BVUkVfXyAqLyBjcmVhdGVIb29rU3BlY2lmaWNPdXRwdXRCdWlsZGVyKFwiU3ViYWdlbnRTdGFydFwiKTtcbi8qKlxuICogQ3JlYXRlcyBhbiBvdXRwdXQgZm9yIFN1YmFnZW50U3RvcCBob29rcy5cbiAqIEBwYXJhbSBvcHRpb25zIC0gQ29uZmlndXJhdGlvbiBvcHRpb25zIGZvciB0aGUgaG9vayBvdXRwdXRcbiAqIEByZXR1cm5zIEEgU3ViYWdlbnRTdG9wT3V0cHV0IG9iamVjdCByZWFkeSBmb3IgdGhlIHJ1bnRpbWVcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiAvLyBCbG9jayB3aXRoIHJlYXNvblxuICogc3ViYWdlbnRTdG9wT3V0cHV0KHtcbiAqICAgZGVjaXNpb246ICdibG9jaycsXG4gKiAgIHJlYXNvbjogJ1Rhc2sgbm90IGNvbXBsZXRlJ1xuICogfSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNvbnN0IHN1YmFnZW50U3RvcE91dHB1dCA9IC8qIEBfX1BVUkVfXyAqLyBjcmVhdGVEZWNpc2lvbk91dHB1dEJ1aWxkZXIoXCJTdWJhZ2VudFN0b3BcIik7XG4vKipcbiAqIENyZWF0ZXMgYW4gb3V0cHV0IGZvciBOb3RpZmljYXRpb24gaG9va3MuXG4gKiBAcGFyYW0gb3B0aW9ucyAtIENvbmZpZ3VyYXRpb24gb3B0aW9ucyBmb3IgdGhlIGhvb2sgb3V0cHV0XG4gKiBAcmV0dXJucyBBIE5vdGlmaWNhdGlvbk91dHB1dCBvYmplY3QgcmVhZHkgZm9yIHRoZSBydW50aW1lXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogLy8gQWRkIGNvbnRleHQgYWJvdXQgdGhlIG5vdGlmaWNhdGlvblxuICogbm90aWZpY2F0aW9uT3V0cHV0KHtcbiAqICAgaG9va1NwZWNpZmljT3V0cHV0OiB7XG4gKiAgICAgYWRkaXRpb25hbENvbnRleHQ6ICdOb3RpZmljYXRpb24gZm9yd2FyZGVkIHRvIFNsYWNrICNhbGVydHMgY2hhbm5lbCdcbiAqICAgfVxuICogfSk7XG4gKlxuICogLy8gU3VwcHJlc3MgdGhlIG5vdGlmaWNhdGlvblxuICogbm90aWZpY2F0aW9uT3V0cHV0KHsgc3VwcHJlc3NPdXRwdXQ6IHRydWUgfSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNvbnN0IG5vdGlmaWNhdGlvbk91dHB1dCA9IC8qIEBfX1BVUkVfXyAqLyBjcmVhdGVIb29rU3BlY2lmaWNPdXRwdXRCdWlsZGVyKFwiTm90aWZpY2F0aW9uXCIpO1xuLyoqXG4gKiBDcmVhdGVzIGFuIG91dHB1dCBmb3IgUHJlQ29tcGFjdCBob29rcy5cbiAqIEBwYXJhbSBvcHRpb25zIC0gQ29uZmlndXJhdGlvbiBvcHRpb25zIGZvciB0aGUgaG9vayBvdXRwdXRcbiAqIEByZXR1cm5zIEEgUHJlQ29tcGFjdE91dHB1dCBvYmplY3QgcmVhZHkgZm9yIHRoZSBydW50aW1lXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogcHJlQ29tcGFjdE91dHB1dCh7XG4gKiAgIHN5c3RlbU1lc3NhZ2U6ICdSZW1lbWJlcjogc3RyaWN0IG1vZGUgaXMgZW5hYmxlZCdcbiAqIH0pO1xuICogYGBgXG4gKi9cbmV4cG9ydCBjb25zdCBwcmVDb21wYWN0T3V0cHV0ID0gLyogQF9fUFVSRV9fICovIGNyZWF0ZVNpbXBsZU91dHB1dEJ1aWxkZXIoXCJQcmVDb21wYWN0XCIpO1xuLyoqXG4gKiBDcmVhdGVzIGFuIG91dHB1dCBmb3IgUG9zdENvbXBhY3QgaG9va3MuXG4gKiBAcGFyYW0gb3B0aW9ucyAtIENvbmZpZ3VyYXRpb24gb3B0aW9ucyBmb3IgdGhlIGhvb2sgb3V0cHV0XG4gKiBAcmV0dXJucyBBIFBvc3RDb21wYWN0T3V0cHV0IG9iamVjdCByZWFkeSBmb3IgdGhlIHJ1bnRpbWVcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBwb3N0Q29tcGFjdE91dHB1dCh7fSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNvbnN0IHBvc3RDb21wYWN0T3V0cHV0ID0gLyogQF9fUFVSRV9fICovIGNyZWF0ZVNpbXBsZU91dHB1dEJ1aWxkZXIoXCJQb3N0Q29tcGFjdFwiKTtcbi8qKlxuICogQ3JlYXRlcyBhbiBvdXRwdXQgZm9yIFBlcm1pc3Npb25SZXF1ZXN0IGhvb2tzLlxuICogQHBhcmFtIG9wdGlvbnMgLSBDb25maWd1cmF0aW9uIG9wdGlvbnMgZm9yIHRoZSBob29rIG91dHB1dFxuICogQHJldHVybnMgQSBQZXJtaXNzaW9uUmVxdWVzdE91dHB1dCBvYmplY3QgcmVhZHkgZm9yIHRoZSBydW50aW1lXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogLy8gQXV0by1hcHByb3ZlXG4gKiBwZXJtaXNzaW9uUmVxdWVzdE91dHB1dCh7XG4gKiAgIGhvb2tTcGVjaWZpY091dHB1dDoge1xuICogICAgIGRlY2lzaW9uOiB7IGJlaGF2aW9yOiAnYWxsb3cnIH1cbiAqICAgfVxuICogfSk7XG4gKlxuICogLy8gQXV0by1hcHByb3ZlIHdpdGggbW9kaWZpZWQgaW5wdXRcbiAqIHBlcm1pc3Npb25SZXF1ZXN0T3V0cHV0KHtcbiAqICAgaG9va1NwZWNpZmljT3V0cHV0OiB7XG4gKiAgICAgZGVjaXNpb246IHtcbiAqICAgICAgIGJlaGF2aW9yOiAnYWxsb3cnLFxuICogICAgICAgdXBkYXRlZElucHV0OiB7IGZpbGVfcGF0aDogJy9zYWZlL3BhdGgnIH1cbiAqICAgICB9XG4gKiAgIH1cbiAqIH0pO1xuICpcbiAqIC8vIEF1dG8tZGVueVxuICogcGVybWlzc2lvblJlcXVlc3RPdXRwdXQoe1xuICogICBob29rU3BlY2lmaWNPdXRwdXQ6IHtcbiAqICAgICBkZWNpc2lvbjoge1xuICogICAgICAgYmVoYXZpb3I6ICdkZW55JyxcbiAqICAgICAgIG1lc3NhZ2U6ICdOb3QgYWxsb3dlZCcsXG4gKiAgICAgICBpbnRlcnJ1cHQ6IHRydWVcbiAqICAgICB9XG4gKiAgIH1cbiAqIH0pO1xuICpcbiAqIC8vIEZhbGwgdGhyb3VnaCB0byBub3JtYWwgcHJvbXB0XG4gKiBwZXJtaXNzaW9uUmVxdWVzdE91dHB1dCh7fSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNvbnN0IHBlcm1pc3Npb25SZXF1ZXN0T3V0cHV0ID0gLyogQF9fUFVSRV9fICovIGNyZWF0ZUhvb2tTcGVjaWZpY091dHB1dEJ1aWxkZXIoXCJQZXJtaXNzaW9uUmVxdWVzdFwiKTtcbi8qKlxuICogQ3JlYXRlcyBhbiBvdXRwdXQgZm9yIFNldHVwIGhvb2tzLlxuICogQHBhcmFtIG9wdGlvbnMgLSBDb25maWd1cmF0aW9uIG9wdGlvbnMgZm9yIHRoZSBob29rIG91dHB1dFxuICogQHJldHVybnMgQSBTZXR1cE91dHB1dCBvYmplY3QgcmVhZHkgZm9yIHRoZSBydW50aW1lXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogLy8gQWRkIGNvbnRleHQgZHVyaW5nIHNldHVwXG4gKiBzZXR1cE91dHB1dCh7XG4gKiAgIGhvb2tTcGVjaWZpY091dHB1dDoge1xuICogICAgIGFkZGl0aW9uYWxDb250ZXh0OiAnUHJvamVjdCBpbml0aWFsaXplZCB3aXRoIGN1c3RvbSBzZXR0aW5ncydcbiAqICAgfVxuICogfSk7XG4gKlxuICogLy8gU2ltcGxlIHBhc3N0aHJvdWdoXG4gKiBzZXR1cE91dHB1dCh7fSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNvbnN0IHNldHVwT3V0cHV0ID0gLyogQF9fUFVSRV9fICovIGNyZWF0ZUhvb2tTcGVjaWZpY091dHB1dEJ1aWxkZXIoXCJTZXR1cFwiKTtcbi8qKlxuICogQ3JlYXRlcyBhbiBvdXRwdXQgZm9yIFRlYW1tYXRlSWRsZSBob29rcy5cbiAqIEBwYXJhbSBvcHRpb25zIC0gQ29uZmlndXJhdGlvbiBvcHRpb25zIGZvciB0aGUgaG9vayBvdXRwdXRcbiAqIEByZXR1cm5zIEEgVGVhbW1hdGVJZGxlT3V0cHV0IG9iamVjdCByZWFkeSBmb3IgdGhlIHJ1bnRpbWVcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiAvLyBBbGxvdyB0ZWFtbWF0ZSB0byBnbyBpZGxlXG4gKiB0ZWFtbWF0ZUlkbGVPdXRwdXQoe30pO1xuICpcbiAqIC8vIEJsb2NrIHdpdGggZmVlZGJhY2tcbiAqIHRlYW1tYXRlSWRsZU91dHB1dCh7IHN0ZGVycjogJ0NvbnRpbnVlIHdvcmtpbmc6IHVuZmluaXNoZWQgdGFza3MgcmVtYWluLicgfSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNvbnN0IHRlYW1tYXRlSWRsZU91dHB1dCA9IC8qIEBfX1BVUkVfXyAqLyBjcmVhdGVFeGl0Q29kZU91dHB1dEJ1aWxkZXIoXCJUZWFtbWF0ZUlkbGVcIik7XG4vKipcbiAqIENyZWF0ZXMgYW4gb3V0cHV0IGZvciBUYXNrQ29tcGxldGVkIGhvb2tzLlxuICogQHBhcmFtIG9wdGlvbnMgLSBDb25maWd1cmF0aW9uIG9wdGlvbnMgZm9yIHRoZSBob29rIG91dHB1dFxuICogQHJldHVybnMgQSBUYXNrQ29tcGxldGVkT3V0cHV0IG9iamVjdCByZWFkeSBmb3IgdGhlIHJ1bnRpbWVcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiAvLyBBbGxvdyB0YXNrIGNvbXBsZXRpb25cbiAqIHRhc2tDb21wbGV0ZWRPdXRwdXQoe30pO1xuICpcbiAqIC8vIEJsb2NrIHdpdGggZmVlZGJhY2tcbiAqIHRhc2tDb21wbGV0ZWRPdXRwdXQoeyBzdGRlcnI6ICdDYW5ub3QgY29tcGxldGU6IHRlc3RzIGFyZSBmYWlsaW5nLicgfSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNvbnN0IHRhc2tDb21wbGV0ZWRPdXRwdXQgPSAvKiBAX19QVVJFX18gKi8gY3JlYXRlRXhpdENvZGVPdXRwdXRCdWlsZGVyKFwiVGFza0NvbXBsZXRlZFwiKTtcbi8qKlxuICogQ3JlYXRlcyBhbiBvdXRwdXQgZm9yIEVsaWNpdGF0aW9uIGhvb2tzLlxuICogQHBhcmFtIG9wdGlvbnMgLSBDb25maWd1cmF0aW9uIG9wdGlvbnMgZm9yIHRoZSBob29rIG91dHB1dFxuICogQHJldHVybnMgQW4gRWxpY2l0YXRpb25PdXRwdXQgb2JqZWN0IHJlYWR5IGZvciB0aGUgcnVudGltZVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIC8vIEFjY2VwdCB0aGUgZWxpY2l0YXRpb25cbiAqIGVsaWNpdGF0aW9uT3V0cHV0KHtcbiAqICAgaG9va1NwZWNpZmljT3V0cHV0OiB7IGFjdGlvbjogJ2FjY2VwdCcsIGNvbnRlbnQ6IHsgdXNlcm5hbWU6ICdhbGljZScgfSB9XG4gKiB9KTtcbiAqXG4gKiAvLyBEZWNsaW5lIHRoZSBlbGljaXRhdGlvblxuICogZWxpY2l0YXRpb25PdXRwdXQoe1xuICogICBob29rU3BlY2lmaWNPdXRwdXQ6IHsgYWN0aW9uOiAnZGVjbGluZScgfVxuICogfSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNvbnN0IGVsaWNpdGF0aW9uT3V0cHV0ID0gLyogQF9fUFVSRV9fICovIGNyZWF0ZUhvb2tTcGVjaWZpY091dHB1dEJ1aWxkZXIoXCJFbGljaXRhdGlvblwiKTtcbi8qKlxuICogQ3JlYXRlcyBhbiBvdXRwdXQgZm9yIEVsaWNpdGF0aW9uUmVzdWx0IGhvb2tzLlxuICogQHBhcmFtIG9wdGlvbnMgLSBDb25maWd1cmF0aW9uIG9wdGlvbnMgZm9yIHRoZSBob29rIG91dHB1dFxuICogQHJldHVybnMgQW4gRWxpY2l0YXRpb25SZXN1bHRPdXRwdXQgb2JqZWN0IHJlYWR5IGZvciB0aGUgcnVudGltZVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGVsaWNpdGF0aW9uUmVzdWx0T3V0cHV0KHt9KTtcbiAqIGBgYFxuICovXG5leHBvcnQgY29uc3QgZWxpY2l0YXRpb25SZXN1bHRPdXRwdXQgPSAvKiBAX19QVVJFX18gKi8gY3JlYXRlSG9va1NwZWNpZmljT3V0cHV0QnVpbGRlcihcIkVsaWNpdGF0aW9uUmVzdWx0XCIpO1xuLyoqXG4gKiBDcmVhdGVzIGFuIG91dHB1dCBmb3IgQ29uZmlnQ2hhbmdlIGhvb2tzLlxuICogQHBhcmFtIG9wdGlvbnMgLSBDb25maWd1cmF0aW9uIG9wdGlvbnMgZm9yIHRoZSBob29rIG91dHB1dFxuICogQHJldHVybnMgQSBDb25maWdDaGFuZ2VPdXRwdXQgb2JqZWN0IHJlYWR5IGZvciB0aGUgcnVudGltZVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGNvbmZpZ0NoYW5nZU91dHB1dCh7fSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNvbnN0IGNvbmZpZ0NoYW5nZU91dHB1dCA9IC8qIEBfX1BVUkVfXyAqLyBjcmVhdGVTaW1wbGVPdXRwdXRCdWlsZGVyKFwiQ29uZmlnQ2hhbmdlXCIpO1xuLyoqXG4gKiBDcmVhdGVzIGFuIG91dHB1dCBmb3IgSW5zdHJ1Y3Rpb25zTG9hZGVkIGhvb2tzLlxuICogQHBhcmFtIG9wdGlvbnMgLSBDb25maWd1cmF0aW9uIG9wdGlvbnMgZm9yIHRoZSBob29rIG91dHB1dFxuICogQHJldHVybnMgQW4gSW5zdHJ1Y3Rpb25zTG9hZGVkT3V0cHV0IG9iamVjdCByZWFkeSBmb3IgdGhlIHJ1bnRpbWVcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBpbnN0cnVjdGlvbnNMb2FkZWRPdXRwdXQoe30pO1xuICogYGBgXG4gKi9cbmV4cG9ydCBjb25zdCBpbnN0cnVjdGlvbnNMb2FkZWRPdXRwdXQgPSBcbi8qIEBfX1BVUkVfXyAqLyBjcmVhdGVTaW1wbGVPdXRwdXRCdWlsZGVyKFwiSW5zdHJ1Y3Rpb25zTG9hZGVkXCIpO1xuLyoqXG4gKiBDcmVhdGVzIGFuIG91dHB1dCBmb3IgV29ya3RyZWVDcmVhdGUgaG9va3MuXG4gKiBAcGFyYW0gb3B0aW9ucyAtIENvbmZpZ3VyYXRpb24gb3B0aW9ucyBmb3IgdGhlIGhvb2sgb3V0cHV0XG4gKiBAcmV0dXJucyBBIFdvcmt0cmVlQ3JlYXRlT3V0cHV0IG9iamVjdCByZWFkeSBmb3IgdGhlIHJ1bnRpbWVcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiB3b3JrdHJlZUNyZWF0ZU91dHB1dCh7fSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNvbnN0IHdvcmt0cmVlQ3JlYXRlT3V0cHV0ID0gLyogQF9fUFVSRV9fICovIGNyZWF0ZVNpbXBsZU91dHB1dEJ1aWxkZXIoXCJXb3JrdHJlZUNyZWF0ZVwiKTtcbi8qKlxuICogQ3JlYXRlcyBhbiBvdXRwdXQgZm9yIFdvcmt0cmVlUmVtb3ZlIGhvb2tzLlxuICogQHBhcmFtIG9wdGlvbnMgLSBDb25maWd1cmF0aW9uIG9wdGlvbnMgZm9yIHRoZSBob29rIG91dHB1dFxuICogQHJldHVybnMgQSBXb3JrdHJlZVJlbW92ZU91dHB1dCBvYmplY3QgcmVhZHkgZm9yIHRoZSBydW50aW1lXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogd29ya3RyZWVSZW1vdmVPdXRwdXQoe30pO1xuICogYGBgXG4gKi9cbmV4cG9ydCBjb25zdCB3b3JrdHJlZVJlbW92ZU91dHB1dCA9IC8qIEBfX1BVUkVfXyAqLyBjcmVhdGVTaW1wbGVPdXRwdXRCdWlsZGVyKFwiV29ya3RyZWVSZW1vdmVcIik7XG4vKipcbiAqIENyZWF0ZXMgYW4gb3V0cHV0IGZvciBDd2RDaGFuZ2VkIGhvb2tzLlxuICogQHBhcmFtIG9wdGlvbnMgLSBDb25maWd1cmF0aW9uIG9wdGlvbnMgZm9yIHRoZSBob29rIG91dHB1dFxuICogQHJldHVybnMgQSBDd2RDaGFuZ2VkT3V0cHV0IG9iamVjdCByZWFkeSBmb3IgdGhlIHJ1bnRpbWVcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiAvLyBSZXR1cm4gYWRkaXRpb25hbCBwYXRocyB0byB3YXRjaCBhZnRlciB0aGUgY3dkIGNoYW5nZVxuICogY3dkQ2hhbmdlZE91dHB1dCh7XG4gKiAgIGhvb2tTcGVjaWZpY091dHB1dDoge1xuICogICAgIHdhdGNoUGF0aHM6IFsnL25ldy9wYXRoL3RvL3dhdGNoJ11cbiAqICAgfVxuICogfSk7XG4gKlxuICogLy8gU2ltcGxlIHBhc3N0aHJvdWdoXG4gKiBjd2RDaGFuZ2VkT3V0cHV0KHt9KTtcbiAqIGBgYFxuICovXG5leHBvcnQgY29uc3QgY3dkQ2hhbmdlZE91dHB1dCA9IC8qIEBfX1BVUkVfXyAqLyBjcmVhdGVIb29rU3BlY2lmaWNPdXRwdXRCdWlsZGVyKFwiQ3dkQ2hhbmdlZFwiKTtcbi8qKlxuICogQ3JlYXRlcyBhbiBvdXRwdXQgZm9yIEZpbGVDaGFuZ2VkIGhvb2tzLlxuICogQHBhcmFtIG9wdGlvbnMgLSBDb25maWd1cmF0aW9uIG9wdGlvbnMgZm9yIHRoZSBob29rIG91dHB1dFxuICogQHJldHVybnMgQSBGaWxlQ2hhbmdlZE91dHB1dCBvYmplY3QgcmVhZHkgZm9yIHRoZSBydW50aW1lXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogLy8gVXBkYXRlIHRoZSBzZXQgb2Ygd2F0Y2hlZCBwYXRoc1xuICogZmlsZUNoYW5nZWRPdXRwdXQoe1xuICogICBob29rU3BlY2lmaWNPdXRwdXQ6IHtcbiAqICAgICB3YXRjaFBhdGhzOiBbJy9wYXRoL3RvL3dhdGNoJywgJy9hbm90aGVyL3BhdGgnXVxuICogICB9XG4gKiB9KTtcbiAqXG4gKiAvLyBTaW1wbGUgcGFzc3Rocm91Z2hcbiAqIGZpbGVDaGFuZ2VkT3V0cHV0KHt9KTtcbiAqIGBgYFxuICovXG5leHBvcnQgY29uc3QgZmlsZUNoYW5nZWRPdXRwdXQgPSAvKiBAX19QVVJFX18gKi8gY3JlYXRlSG9va1NwZWNpZmljT3V0cHV0QnVpbGRlcihcIkZpbGVDaGFuZ2VkXCIpO1xuIiwgIi8qKlxuICogUnVudGltZSBtb2R1bGUgZm9yIENsYXVkZSBDb2RlIGhvb2tzLlxuICpcbiAqIEhhbmRsZXMgc3RkaW4vc3Rkb3V0L2V4aXQgY29kZSBzZW1hbnRpY3MgZm9yIGNvbXBpbGVkIGhvb2sgZXhlY3V0aW9uLlxuICogVGhpcyBtb2R1bGUgaXMgdGhlIGNvcmUgb3JjaGVzdHJhdG9yIHRoYXQ6XG4gKiAtIFJlYWRzIEpTT04gZnJvbSBzdGRpbiAod2lyZSBmb3JtYXQgd2l0aCBzbmFrZV9jYXNlIHByb3BlcnRpZXMpXG4gKiAtIEludm9rZXMgdGhlIGhvb2sgaGFuZGxlclxuICogLSBXcml0ZXMgb3V0cHV0IHRvIHN0ZG91dFxuICogLSBNYW5hZ2VzIGV4aXQgY29kZXNcbiAqIEBtb2R1bGVcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiAvLyBJbiBhIGNvbXBpbGVkIGhvb2sgZmlsZVxuICogaW1wb3J0IHsgZXhlY3V0ZSB9IGZyb20gJ0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcy9ydW50aW1lJztcbiAqIGltcG9ydCBteUhvb2sgZnJvbSAnLi9teS1ob29rLmpzJztcbiAqXG4gKiBleGVjdXRlKG15SG9vayk7XG4gKiBgYGBcbiAqIEBzZWUgaHR0cHM6Ly9jb2RlLmNsYXVkZS5jb20vZG9jcy9lbi9ob29rc1xuICovXG5pbXBvcnQgeyBwZXJzaXN0RW52VmFyLCBwZXJzaXN0RW52VmFycyB9IGZyb20gXCIuL2Vudi5qc1wiO1xuaW1wb3J0IHsgbG9nZ2VyIH0gZnJvbSBcIi4vbG9nZ2VyLmpzXCI7XG5pbXBvcnQgeyBFWElUX0NPREVTIH0gZnJvbSBcIi4vb3V0cHV0cy5qc1wiO1xuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gU3RkaW4vU3Rkb3V0IEhhbmRsaW5nXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vKipcbiAqIFJlYWRzIGFsbCBkYXRhIGZyb20gc3RkaW4uXG4gKiBAcmV0dXJucyBQcm9taXNlIHJlc29sdmluZyB0byB0aGUgY29tcGxldGUgc3RkaW4gY29udGVudFxuICovXG5hc3luYyBmdW5jdGlvbiByZWFkU3RkaW4oKSB7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgY29uc3QgY2h1bmtzID0gW107XG4gICAgICAgIC8vIFNldCBlbmNvZGluZyBmaXJzdCB0byBlbnN1cmUgZGF0YSBldmVudHMgcmVjZWl2ZSBzdHJpbmdzXG4gICAgICAgIHByb2Nlc3Muc3RkaW4uc2V0RW5jb2RpbmcoXCJ1dGYtOFwiKTtcbiAgICAgICAgcHJvY2Vzcy5zdGRpbi5vbihcImRhdGFcIiwgKGNodW5rKSA9PiB7XG4gICAgICAgICAgICBjaHVua3MucHVzaChjaHVuayk7XG4gICAgICAgIH0pO1xuICAgICAgICBwcm9jZXNzLnN0ZGluLm9uKFwiZW5kXCIsICgpID0+IHtcbiAgICAgICAgICAgIHJlc29sdmUoY2h1bmtzLmpvaW4oXCJcIikpO1xuICAgICAgICB9KTtcbiAgICAgICAgcHJvY2Vzcy5zdGRpbi5vbihcImVycm9yXCIsIChlcnJvcikgPT4ge1xuICAgICAgICAgICAgcmVqZWN0KGVycm9yKTtcbiAgICAgICAgfSk7XG4gICAgfSk7XG59XG4vKipcbiAqIFBhcnNlcyBzdGRpbiBKU09OIGlucHV0LlxuICogQHBhcmFtIHN0ZGluQ29udGVudCAtIFJhdyBzdGRpbiBjb250ZW50XG4gKiBAcmV0dXJucyBQYXJzZWQgaW5wdXQgKHdpcmUgZm9ybWF0IHdpdGggc25ha2VfY2FzZSBwcm9wZXJ0aWVzKVxuICogQHRocm93cyBFcnJvciBpZiBKU09OIGlzIG1hbGZvcm1lZFxuICovXG5mdW5jdGlvbiBwYXJzZVN0ZGluSW5wdXQoc3RkaW5Db250ZW50KSB7XG4gICAgLy8gUGFyc2UgSlNPTiAtIGlucHV0IHVzZXMgd2lyZSBmb3JtYXQgKHNuYWtlX2Nhc2UpIGRpcmVjdGx5XG4gICAgY29uc3QgcmF3SW5wdXQgPSBKU09OLnBhcnNlKHN0ZGluQ29udGVudCk7XG4gICAgcmV0dXJuIHJhd0lucHV0O1xufVxuLyoqXG4gKiBXcml0ZXMgaG9vayBvdXRwdXQgdG8gc3Rkb3V0LlxuICpcbiAqIE91dHB1dCB1c2VzIGNhbWVsQ2FzZSBrZXlzIHBlciBDbGF1ZGUgQ29kZSBob29rIHNwZWNpZmljYXRpb24uXG4gKiBAcGFyYW0gb3V0cHV0IC0gVGhlIGhvb2sgb3V0cHV0IHRvIHdyaXRlXG4gKiBAc2VlIGh0dHBzOi8vY29kZS5jbGF1ZGUuY29tL2RvY3MvZW4vaG9va3MjaG9vay1vdXRwdXQtc3RydWN0dXJlXG4gKi9cbmZ1bmN0aW9uIHdyaXRlU3Rkb3V0KG91dHB1dCkge1xuICAgIC8vIE91dHB1dCB1c2VzIGNhbWVsQ2FzZSAtIG5vIHRyYW5zZm9ybWF0aW9uIG5lZWRlZFxuICAgIHByb2Nlc3Muc3Rkb3V0LndyaXRlKEpTT04uc3RyaW5naWZ5KG91dHB1dCkpO1xufVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gRXJyb3IgSGFuZGxpbmdcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8qKlxuICogQ3JlYXRlcyBhbiBlcnJvciBvdXRwdXQgZm9yIG1hbGZvcm1lZCBzdGRpbiBKU09OLlxuICogQHBhcmFtIGVycm9yIC0gVGhlIHBhcnNlIGVycm9yXG4gKiBAcmV0dXJucyBIb29rT3V0cHV0IHdpdGggZW1wdHkgc3Rkb3V0XG4gKi9cbmZ1bmN0aW9uIGNyZWF0ZU1hbGZvcm1lZElucHV0T3V0cHV0KGVycm9yKSB7XG4gICAgbG9nZ2VyLmVycm9yKGBJbnZhbGlkIEpTT04gaW5wdXQ6ICR7ZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiBTdHJpbmcoZXJyb3IpfWApO1xuICAgIHJldHVybiB7IHN0ZG91dDoge30gfTtcbn1cbi8qKlxuICogV3JpdGVzIGhhbmRsZXIgZXJyb3Igc3RhY2t0cmFjZSB0byBzdGRlcnIgYW5kIGV4aXRzIHdpdGggY29kZSAyLlxuICpcbiAqIFdoZW4gYSBob29rIGhhbmRsZXIgdGhyb3dzIGFuIGV4Y2VwdGlvbjpcbiAqIC0gU3RhY2t0cmFjZSAod2l0aCBzb3VyY2VtYXBzIGlmIGF2YWlsYWJsZSkgaXMgb3V0cHV0IHRvIHN0ZGVyclxuICogLSBQcm9jZXNzIGV4aXRzIHdpdGggY29kZSAyIChCTE9DSylcbiAqIC0gTm8gSlNPTiBpcyBvdXRwdXQgdG8gc3Rkb3V0XG4gKiBAcGFyYW0gZXJyb3IgLSBUaGUgZXJyb3IgdGhyb3duIGJ5IHRoZSBoYW5kbGVyXG4gKi9cbmZ1bmN0aW9uIGhhbmRsZUhhbmRsZXJFcnJvcihlcnJvcikge1xuICAgIC8vIFdyaXRlIHN0YWNrIHRyYWNlIHRvIHN0ZGVyciAoc291cmNlbWFwcyBhcmUgYXBwbGllZCBhdXRvbWF0aWNhbGx5IGJ5IE5vZGUuanMpXG4gICAgaWYgKGVycm9yIGluc3RhbmNlb2YgRXJyb3IpIHtcbiAgICAgICAgcHJvY2Vzcy5zdGRlcnIud3JpdGUoYCR7ZXJyb3Iuc3RhY2sgPz8gZXJyb3IubWVzc2FnZX1cXG5gKTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIHByb2Nlc3Muc3RkZXJyLndyaXRlKGAke1N0cmluZyhlcnJvcil9XFxuYCk7XG4gICAgfVxuICAgIC8vIExvZyB0byBmaWxlIGlmIGNvbmZpZ3VyZWRcbiAgICBsb2dnZXIuZXJyb3IoYEhvb2sgaGFuZGxlciBlcnJvcjogJHtlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6IFN0cmluZyhlcnJvcil9YCk7XG4gICAgLy8gQ2xlYXIgbG9nZ2VyIGNvbnRleHQgYW5kIGNsb3NlXG4gICAgbG9nZ2VyLmNsZWFyQ29udGV4dCgpO1xuICAgIGxvZ2dlci5jbG9zZSgpO1xuICAgIC8vIEV4aXQgd2l0aCBjb2RlIDIgKEJMT0NLKSAtIG5vIEpTT04gb3V0cHV0XG4gICAgcHJvY2Vzcy5leGl0KEVYSVRfQ09ERVMuQkxPQ0spO1xufVxuLyoqXG4gKiBDb252ZXJ0cyBhIFNwZWNpZmljSG9va091dHB1dCB0byBIb29rT3V0cHV0IGZvciB3aXJlIGZvcm1hdC5cbiAqXG4gKiBTcGVjaWZpY0hvb2tPdXRwdXQgdHlwZXMgaGF2ZTogeyBfdHlwZSwgc3Rkb3V0LCBzdGRlcnI/IH1cbiAqIEhvb2tPdXRwdXQgaGFzOiB7IHN0ZG91dCwgc3RkZXJyPyB9XG4gKlxuICogU2luY2Ugb3V0cHV0IGJ1aWxkZXJzIG5vdyBwcm9kdWNlIHdpcmUtZm9ybWF0IGRpcmVjdGx5LCB0aGlzIGZ1bmN0aW9uXG4gKiBzaW1wbHkgc3RyaXBzIHRoZSBgX3R5cGVgIGRpc2NyaW1pbmF0b3IgZmllbGQuXG4gKiBAcGFyYW0gc3BlY2lmaWNPdXRwdXQgLSBUaGUgc3BlY2lmaWMgb3V0cHV0IGZyb20gYSBob29rIGhhbmRsZXJcbiAqIEByZXR1cm5zIEhvb2tPdXRwdXQgcmVhZHkgZm9yIHNlcmlhbGl6YXRpb25cbiAqIEBzZWUgaHR0cHM6Ly9jb2RlLmNsYXVkZS5jb20vZG9jcy9lbi9ob29rcyNob29rLW91dHB1dC1zdHJ1Y3R1cmVcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBjb25zdCBzcGVjaWZpY091dHB1dCA9IHByZVRvb2xVc2VPdXRwdXQoeyBob29rU3BlY2lmaWNPdXRwdXQ6IHsgcGVybWlzc2lvbkRlY2lzaW9uOiAnYWxsb3cnIH0gfSk7XG4gKiBjb25zdCBob29rT3V0cHV0ID0gY29udmVydFRvSG9va091dHB1dChzcGVjaWZpY091dHB1dCk7XG4gKiAvLyBob29rT3V0cHV0OiB7IHN0ZG91dDogeyBob29rU3BlY2lmaWNPdXRwdXQ6IHsgLi4uIH0gfSB9XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNvbnZlcnRUb0hvb2tPdXRwdXQoc3BlY2lmaWNPdXRwdXQpIHtcbiAgICBjb25zdCB7IHN0ZG91dCwgc3RkZXJyIH0gPSBzcGVjaWZpY091dHB1dDtcbiAgICByZXR1cm4gc3RkZXJyICE9PSB1bmRlZmluZWQgPyB7IHN0ZG91dCwgc3RkZXJyIH0gOiB7IHN0ZG91dCB9O1xufVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gRXhlY3V0ZSBGdW5jdGlvblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLyoqXG4gKiBFeGVjdXRlcyBhIGhvb2sgaGFuZGxlciB3aXRoIGZ1bGwgcnVudGltZSBvcmNoZXN0cmF0aW9uLlxuICpcbiAqIFRoaXMgaXMgdGhlIG1haW4gZW50cnkgcG9pbnQgdGhhdCBjb21waWxlZCBob29rcyB1c2UuIFdoZW4gYSBjb21waWxlZCBob29rXG4gKiBydW5zIGFzIGEgQ0xJOlxuICpcbiAqIDEuIFJlYWRzIGFsbCBzdGRpblxuICogMi4gUGFyc2VzIEpTT04gKHdpcmUgZm9ybWF0IHdpdGggc25ha2VfY2FzZSBwcm9wZXJ0aWVzKVxuICogMy4gU2V0cyB1cCBsb2dnZXIgY29udGV4dCAoaG9va1R5cGUsIGlucHV0KVxuICogNC4gQ2FsbHMgaGFuZGxlciB3aXRoIGlucHV0IGFuZCBjb250ZXh0IChsb2dnZXIpXG4gKiA1LiBIYW5kbGVzIGFueSBlcnJvcnMsIGxvZ3MgdGhlbVxuICogNi4gV3JpdGVzIEpTT04gdG8gc3Rkb3V0XG4gKiA3LiBDbG9zZXMgbG9nZ2VyXG4gKiA4LiBFeGl0cyB3aXRoIGFwcHJvcHJpYXRlIGNvZGVcbiAqIEBwYXJhbSBob29rRm4gLSBUaGUgaG9vayBmdW5jdGlvbiB0byBleGVjdXRlIChmcm9tIGhvb2sgZmFjdG9yeSlcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiAvLyBJbiBjb21waWxlZCBob29rIGZpbGVcbiAqIGltcG9ydCB7IGV4ZWN1dGUgfSBmcm9tICdAZ29vZGZvb3QvY2xhdWRlLWNvZGUtaG9va3MvcnVudGltZSc7XG4gKiBpbXBvcnQgeyBwcmVUb29sVXNlSG9vaywgcHJlVG9vbFVzZU91dHB1dCB9IGZyb20gJ0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcyc7XG4gKlxuICogY29uc3QgbXlIb29rID0gcHJlVG9vbFVzZUhvb2soeyBtYXRjaGVyOiAnQmFzaCcgfSwgYXN5bmMgKGlucHV0LCB7IGxvZ2dlciB9KSA9PiB7XG4gKiAgIGxvZ2dlci5pbmZvKCdQcm9jZXNzaW5nIEJhc2ggY29tbWFuZCcpO1xuICogICByZXR1cm4gcHJlVG9vbFVzZU91dHB1dCh7IGFsbG93OiB0cnVlIH0pO1xuICogfSk7XG4gKlxuICogZXhlY3V0ZShteUhvb2spO1xuICogYGBgXG4gKiBAc2VlIGh0dHBzOi8vY29kZS5jbGF1ZGUuY29tL2RvY3MvZW4vaG9va3NcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGV4ZWN1dGUoaG9va0ZuKSB7XG4gICAgbGV0IG91dHB1dDtcbiAgICB0cnkge1xuICAgICAgICAvLyBSZWFkIGFuZCBwYXJzZSBzdGRpblxuICAgICAgICBsZXQgc3RkaW5Db250ZW50O1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgc3RkaW5Db250ZW50ID0gYXdhaXQgcmVhZFN0ZGluKCk7XG4gICAgICAgIH1cbiAgICAgICAgY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICBsb2dnZXIubG9nRXJyb3IoZXJyb3IsIFwiRmFpbGVkIHRvIHJlYWQgc3RkaW5cIik7XG4gICAgICAgICAgICBvdXRwdXQgPSBjcmVhdGVNYWxmb3JtZWRJbnB1dE91dHB1dChlcnJvcik7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgLy8gUGFyc2UgYW5kIHRyYW5zZm9ybSBpbnB1dFxuICAgICAgICBsZXQgaW5wdXQ7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBpbnB1dCA9IHBhcnNlU3RkaW5JbnB1dChzdGRpbkNvbnRlbnQpO1xuICAgICAgICB9XG4gICAgICAgIGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgbG9nZ2VyLmxvZ0Vycm9yKGVycm9yLCBcIkZhaWxlZCB0byBwYXJzZSBzdGRpbiBKU09OXCIpO1xuICAgICAgICAgICAgb3V0cHV0ID0gY3JlYXRlTWFsZm9ybWVkSW5wdXRPdXRwdXQoZXJyb3IpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIC8vIFNldCBsb2dnZXIgY29udGV4dFxuICAgICAgICBjb25zdCBob29rRXZlbnROYW1lID0gaG9va0ZuLmhvb2tFdmVudE5hbWU7XG4gICAgICAgIGxvZ2dlci5zZXRDb250ZXh0KGhvb2tFdmVudE5hbWUsIGlucHV0KTtcbiAgICAgICAgLy8gQnVpbGQgY29udGV4dCAtIFNlc3Npb25TdGFydCBob29rcyBnZXQgZXh0ZW5kZWQgY29udGV4dCB3aXRoIHBlcnNpc3RFbnZWYXJcbiAgICAgICAgY29uc3QgY29udGV4dCA9IGhvb2tFdmVudE5hbWUgPT09IFwiU2Vzc2lvblN0YXJ0XCIgPyB7IGxvZ2dlciwgcGVyc2lzdEVudlZhciwgcGVyc2lzdEVudlZhcnMgfSA6IHsgbG9nZ2VyIH07XG4gICAgICAgIC8vIEV4ZWN1dGUgaGFuZGxlclxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3Qgc3BlY2lmaWNPdXRwdXQgPSBhd2FpdCBob29rRm4oaW5wdXQsIGNvbnRleHQpO1xuICAgICAgICAgICAgb3V0cHV0ID0gY29udmVydFRvSG9va091dHB1dChzcGVjaWZpY091dHB1dCk7XG4gICAgICAgIH1cbiAgICAgICAgY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICAvLyBIYW5kbGVyIHRocmV3IC0gb3V0cHV0IHN0YWNrdHJhY2UgdG8gc3RkZXJyIGFuZCBleGl0IHdpdGggY29kZSAyXG4gICAgICAgICAgICAvLyBUaGlzIGNhbGwgbmV2ZXIgcmV0dXJucyAocHJvY2Vzcy5leGl0KVxuICAgICAgICAgICAgaGFuZGxlSGFuZGxlckVycm9yKGVycm9yKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBmaW5hbGx5IHtcbiAgICAgICAgLy8gV3JpdGUgb3V0cHV0IGlmIHdlIGhhdmUgaXRcbiAgICAgICAgaWYgKG91dHB1dCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICB3cml0ZVN0ZG91dChvdXRwdXQuc3Rkb3V0KTtcbiAgICAgICAgfVxuICAgICAgICAvLyBDbGVhbiB1cCBsb2dnZXIgKHNpbmdsZSBjbGVhbnVwIHBhdGgpXG4gICAgICAgIGxvZ2dlci5jbGVhckNvbnRleHQoKTtcbiAgICAgICAgbG9nZ2VyLmNsb3NlKCk7XG4gICAgICAgIC8vIEV4aXQtY29kZSBCTE9DSzogdW5saWtlIGhhbmRsZXIgdGhyb3cgKG5vIHN0ZG91dCksIHRoaXMgcGF0aCBzdGlsbCB3cml0ZXNcbiAgICAgICAgLy8gc3RydWN0dXJlZCBKU09OIHRvIHN0ZG91dCAoYXMgZW1wdHkge30pIGFsb25nc2lkZSB0aGUgc3RkZXJyIG1lc3NhZ2UuXG4gICAgICAgIC8vIFRoZSBjYWxsZXIgY29udHJvbHMgc3RkZXJyIGZvcm1hdHRpbmcgKG5vIGFwcGVuZGVkIG5ld2xpbmUpLlxuICAgICAgICBpZiAob3V0cHV0Py5zdGRlcnIgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgcHJvY2Vzcy5zdGRlcnIud3JpdGUob3V0cHV0LnN0ZGVycik7XG4gICAgICAgICAgICBwcm9jZXNzLmV4aXQoRVhJVF9DT0RFUy5CTE9DSyk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gRXhpdCB3aXRoIHN1Y2Nlc3MgKGhhbmRsZXIgZXJyb3JzIGV4aXQgdmlhIGhhbmRsZUhhbmRsZXJFcnJvciB3aXRoIGNvZGUgMilcbiAgICAgICAgcHJvY2Vzcy5leGl0KEVYSVRfQ09ERVMuU1VDQ0VTUyk7XG4gICAgfVxufVxuIiwgIi8qKlxuICogU2hhcmVkIGNvbnRleHQtYnVpbGRpbmcgdXRpbGl0aWVzIGZvciBTZXNzaW9uU3RhcnQgYW5kIFN1YmFnZW50U3RhcnQgaG9va3MuXG4gKlxuICogQm90aCBob29rcyBuZWVkIGlkZW50aWNhbCBjYXJkIGNvbnRleHQgaW5qZWN0aW9uLiBUaGlzIG1vZHVsZSBleHRyYWN0cyB0aGVcbiAqIHNoYXJlZCBsb2dpYyBzbyBpdCBjYW4gYmUgcmV1c2VkIHdpdGhvdXQgZHVwbGljYXRpb24uXG4gKlxuICogQHN1bW1hcnkgU2hhcmVkIGNvbnRleHQtYnVpbGRpbmcgdXRpbGl0aWVzIGZvciBzZXNzaW9uIGFuZCBzdWJhZ2VudCBob29rc1xuICogQG1vZHVsZSBsaWIvY29udGV4dFxuICovXG5cbmltcG9ydCB7IGV4ZWNGaWxlU3luYyB9IGZyb20gJ25vZGU6Y2hpbGRfcHJvY2Vzcyc7XG5pbXBvcnQgeyByZWFkZGlyU3luYywgcmVhZEZpbGVTeW5jLCBzdGF0U3luYyB9IGZyb20gJ25vZGU6ZnMnO1xuaW1wb3J0IHsgam9pbiB9IGZyb20gJ25vZGU6cGF0aCc7XG5pbXBvcnQgdHlwZSB7IEFjdGlvbklucHV0IH0gZnJvbSAnQGNhcmRzL3Nkay9jb25maWcnO1xuaW1wb3J0IHsgQ0FSRFNfRU5WX1ZBUlMgfSBmcm9tICdAY2FyZHMvc2RrL2NvbmZpZyc7XG5pbXBvcnQgeyBXT1JLU1BBQ0VfQlJBTkNIRVNfRklMRSwgV09SS1NQQUNFX0NPTU1JVFNfRklMRSB9IGZyb20gJ0BjYXJkcy9zZGsvcHJvdG9jb2wnO1xuaW1wb3J0IHsgZm9ybWF0Q29tbWl0TG9nIH0gZnJvbSAnLi9maWxlLXRyZWUuanMnO1xuXG4vKipcbiAqIEVycm9yIHRocm93biB3aGVuIHRoZSBjYXJkIHJlcG9zaXRvcnkgY2Fubm90IGJlIHJlYWQuXG4gKlxuICogV3JhcHMgdGhlIHVuZGVybHlpbmcgZmlsZXN5c3RlbSBlcnJvciB3aXRoIHRoZSByZXBvc2l0b3J5IHBhdGggZm9yXG4gKiBzdHJ1Y3R1cmVkIGVycm9yIGhhbmRsaW5nIGluIHNlc3Npb24gYW5kIHN1YmFnZW50IGhvb2tzLlxuICovXG5leHBvcnQgY2xhc3MgQ2FyZFJlcG9BY2Nlc3NFcnJvciBleHRlbmRzIEVycm9yIHtcbiAgb3ZlcnJpZGUgcmVhZG9ubHkgbmFtZSA9ICdDYXJkUmVwb0FjY2Vzc0Vycm9yJztcblxuICBjb25zdHJ1Y3RvcihcbiAgICBwdWJsaWMgcmVhZG9ubHkgcmVwb1BhdGg6IHN0cmluZyxcbiAgICBjYXVzZTogdW5rbm93blxuICApIHtcbiAgICBjb25zdCByZWFzb24gPSBjYXVzZSBpbnN0YW5jZW9mIEVycm9yID8gY2F1c2UubWVzc2FnZSA6IFN0cmluZyhjYXVzZSk7XG4gICAgc3VwZXIoYENhbm5vdCByZWFkIGNhcmQgcmVwb3NpdG9yeSBhdCAke3JlcG9QYXRofTogJHtyZWFzb259YCk7XG4gICAgdGhpcy5jYXVzZSA9IGNhdXNlO1xuICB9XG5cbiAgLyoqXG4gICAqIEJ1aWxkcyBhIHVzZXItZmFjaW5nIHN5c3RlbSBtZXNzYWdlIGV4cGxhaW5pbmcgdGhlIGNhcmQgcmVwbyBhY2Nlc3MgZmFpbHVyZS5cbiAgICpcbiAgICogQHBhcmFtIGFjdG9yIC0gSHVtYW4tcmVhZGFibGUgbm91biBmb3IgdGhlIGZhaWxpbmcgZW50aXR5IChlLmcuIFwic2Vzc2lvblwiLCBcInN1YmFnZW50XCIpLlxuICAgKiBAcmV0dXJucyBPYmplY3Qgd2l0aCBgc3lzdGVtTWVzc2FnZWAgYW5kIGBzdG9wUmVhc29uYCBzdHJpbmdzLlxuICAgKi9cbiAgdG9Ib29rRmFpbHVyZShhY3Rvcjogc3RyaW5nKTogeyBzeXN0ZW1NZXNzYWdlOiBzdHJpbmc7IHN0b3BSZWFzb246IHN0cmluZyB9IHtcbiAgICByZXR1cm4ge1xuICAgICAgc3lzdGVtTWVzc2FnZTogW1xuICAgICAgICBgVGhlIGNhcmQgcmVwb3NpdG9yeSBhdCAnJHt0aGlzLnJlcG9QYXRofScgaXMgbm90IGFjY2Vzc2libGUuYCxcbiAgICAgICAgJycsXG4gICAgICAgIGBFcnJvcjogJHt0aGlzLm1lc3NhZ2V9YCxcbiAgICAgICAgJycsXG4gICAgICAgIGBUaGlzICR7YWN0b3J9IGNhbm5vdCBwcm9jZWVkIHdpdGhvdXQgYSB2YWxpZCBjYXJkIHJlcG9zaXRvcnkuIFRvIHJlc29sdmU6YCxcbiAgICAgICAgYDEuIFZlcmlmeSB0aGUgY2FyZCByZXBvc2l0b3J5IGRpcmVjdG9yeSBleGlzdHMgYXQ6ICR7dGhpcy5yZXBvUGF0aH1gLFxuICAgICAgICAnMi4gRW5zdXJlIHRoZSBjdXJyZW50IHByb2Nlc3MgaGFzIHJlYWQgcGVybWlzc2lvbnMgZm9yIHRoZSBkaXJlY3RvcnkgYW5kIGl0cyBjb250ZW50cycsXG4gICAgICAgICczLiBDaGVjayB0aGF0IHRoZSBDQVJEX1JFUE9fUEFUSCBlbnZpcm9ubWVudCB2YXJpYWJsZSBwb2ludHMgdG8gYSB2YWxpZCBjYXJkIHJlcG9zaXRvcnknXG4gICAgICBdLmpvaW4oJ1xcbicpLFxuICAgICAgc3RvcFJlYXNvbjogYENhcmQgcmVwb3NpdG9yeSBpbmFjY2Vzc2libGUgYXQgJHt0aGlzLnJlcG9QYXRofTogJHt0aGlzLm1lc3NhZ2V9YFxuICAgIH07XG4gIH1cbn1cblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gQ2FyZCBtZXRhZGF0YVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4vKipcbiAqIFN1YnNldCBvZiBDQVJELm1ldGEuanNvbiBmaWVsZHMgc3VyZmFjZWQgaW4gdGhlIGA8Y2FyZD5gIGNvbnRleHQgYmxvY2suXG4gKi9cbmludGVyZmFjZSBDYXJkTWV0YSB7XG4gIGlkOiBzdHJpbmc7XG4gIHRpdGxlOiBzdHJpbmc7XG4gIHN0YXR1czogc3RyaW5nO1xuICBnYXRlczoge1xuICAgIHBsYW5SZXF1aXJlZDogYm9vbGVhbjtcbiAgICBwbGFuQXBwcm92ZWQ6IGJvb2xlYW47XG4gICAgbWVyZ2VSZXF1ZXN0UmVxdWlyZWQ6IGJvb2xlYW47XG4gICAgbWVyZ2VBcHByb3ZlZDogYm9vbGVhbjtcbiAgfTtcbn1cblxuLyoqXG4gKiBSZWFkcyBhbmQgcGFyc2VzIENBUkQubWV0YS5qc29uIGZyb20gdGhlIGNhcmQgcmVwb3NpdG9yeS5cbiAqXG4gKiBSZXR1cm5zIGBudWxsYCB3aGVuIHRoZSBmaWxlIGlzIG1pc3Npbmcgb3IgbWFsZm9ybWVkIHNvIHRoZSBjYWxsZXJcbiAqIGNhbiBmYWxsIGJhY2sgdG8gdmFsdWVzIGZyb20ge0BsaW5rIEFjdGlvbklucHV0fS5cbiAqXG4gKiBAcGFyYW0gcm9vdFBhdGggLSBSb290IGRpcmVjdG9yeSBvZiB0aGUgY2FyZCByZXBvc2l0b3J5LlxuICogQHJldHVybnMgUGFyc2VkIG1ldGFkYXRhLCBvciBgbnVsbGAgd2hlbiB1bmF2YWlsYWJsZS5cbiAqL1xuZnVuY3Rpb24gcmVhZENhcmRNZXRhKHJvb3RQYXRoOiBzdHJpbmcpOiBDYXJkTWV0YSB8IG51bGwge1xuICB0cnkge1xuICAgIGNvbnN0IHJhdyA9IHJlYWRGaWxlU3luYyhqb2luKHJvb3RQYXRoLCAnQ0FSRC5tZXRhLmpzb24nKSwgJ3V0Zi04Jyk7XG4gICAgY29uc3QgcGFyc2VkID0gSlNPTi5wYXJzZShyYXcpIGFzIFJlY29yZDxzdHJpbmcsIHVua25vd24+O1xuICAgIGNvbnN0IGdhdGVzID0gcGFyc2VkWydnYXRlcyddIGFzIFJlY29yZDxzdHJpbmcsIGJvb2xlYW4+IHwgdW5kZWZpbmVkO1xuICAgIHJldHVybiB7XG4gICAgICBpZDogU3RyaW5nKHBhcnNlZFsnaWQnXSA/PyAnJyksXG4gICAgICB0aXRsZTogU3RyaW5nKHBhcnNlZFsndGl0bGUnXSA/PyAnJyksXG4gICAgICBzdGF0dXM6IFN0cmluZyhwYXJzZWRbJ3N0YXR1cyddID8/ICcnKSxcbiAgICAgIGdhdGVzOiB7XG4gICAgICAgIHBsYW5SZXF1aXJlZDogZ2F0ZXM/LlsncGxhblJlcXVpcmVkJ10gPT09IHRydWUsXG4gICAgICAgIHBsYW5BcHByb3ZlZDogZ2F0ZXM/LlsncGxhbkFwcHJvdmVkJ10gPT09IHRydWUsXG4gICAgICAgIG1lcmdlUmVxdWVzdFJlcXVpcmVkOiBnYXRlcz8uWydtZXJnZVJlcXVlc3RSZXF1aXJlZCddID09PSB0cnVlLFxuICAgICAgICBtZXJnZUFwcHJvdmVkOiBnYXRlcz8uWydtZXJnZUFwcHJvdmVkJ10gPT09IHRydWVcbiAgICAgIH1cbiAgICB9O1xuICB9IGNhdGNoIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxufVxuXG4vKipcbiAqIEJ1aWxkcyB0aGUgYDxjYXJkPmAgWE1MIGJsb2NrIHdpdGggY2FyZCBpZGVudGl0eSwgZ2F0ZXMsIGFuZCBlbnYgdmFycy5cbiAqXG4gKiBGYWxscyBiYWNrIHRvIHtAbGluayBBY3Rpb25JbnB1dH0gZmllbGRzIHdoZW4gQ0FSRC5tZXRhLmpzb24gaXMgdW5yZWFkYWJsZS5cbiAqXG4gKiBAcGFyYW0gYWN0aW9uSW5wdXQgLSBQYXJzZWQgYWN0aW9uIGlucHV0IGZyb20gdGhlIGVudmlyb25tZW50LlxuICogQHJldHVybnMgVGhlIGA8Y2FyZCAuLi4+Li4uPC9jYXJkPmAgYmxvY2sgc3RyaW5nLlxuICovXG5leHBvcnQgZnVuY3Rpb24gYnVpbGRDYXJkQmxvY2soYWN0aW9uSW5wdXQ6IEFjdGlvbklucHV0KTogc3RyaW5nIHtcbiAgY29uc3QgbWV0YSA9IHJlYWRDYXJkTWV0YShhY3Rpb25JbnB1dC5jYXJkUmVwb1BhdGgpO1xuXG4gIGNvbnN0IGlkID0gbWV0YT8uaWQgfHwgYWN0aW9uSW5wdXQuY2FyZElkO1xuICBjb25zdCB0aXRsZSA9IG1ldGE/LnRpdGxlIHx8ICcnO1xuICBjb25zdCBzdGF0dXMgPSBtZXRhPy5zdGF0dXMgfHwgJyc7XG5cbiAgY29uc3QgZ2F0ZXNMaW5lID0gbWV0YVxuICAgID8gYGdhdGVzOiBwbGFuUmVxdWlyZWQ9JHttZXRhLmdhdGVzLnBsYW5SZXF1aXJlZH0gcGxhbkFwcHJvdmVkPSR7bWV0YS5nYXRlcy5wbGFuQXBwcm92ZWR9IG1lcmdlUmVxdWVzdFJlcXVpcmVkPSR7bWV0YS5nYXRlcy5tZXJnZVJlcXVlc3RSZXF1aXJlZH0gbWVyZ2VBcHByb3ZlZD0ke21ldGEuZ2F0ZXMubWVyZ2VBcHByb3ZlZH1gXG4gICAgOiAnJztcblxuICBjb25zdCB3b3Jrc3BhY2VCcmFuY2ggPSBwcm9jZXNzLmVudltDQVJEU19FTlZfVkFSUy5XT1JLU1BBQ0VfQlJBTkNIXTtcbiAgY29uc3QgYmFzZUJyYW5jaCA9IHByb2Nlc3MuZW52W0NBUkRTX0VOVl9WQVJTLkJBU0VfQlJBTkNIXTtcblxuICBjb25zdCB3b3Jrc3BhY2VQYXRoID0gcHJvY2Vzcy5lbnZbQ0FSRFNfRU5WX1ZBUlMuV09SS1NQQUNFX1BBVEhdO1xuICBjb25zdCBlbnZMaW5lcyA9IFtgICBDQVJEX1JFUE9fUEFUSD0ke2FjdGlvbklucHV0LmNhcmRSZXBvUGF0aH1gXTtcbiAgaWYgKHdvcmtzcGFjZVBhdGgpIGVudkxpbmVzLnB1c2goYCAgV09SS1NQQUNFX1BBVEg9JHt3b3Jrc3BhY2VQYXRofWApO1xuICBpZiAoYmFzZUJyYW5jaCkgZW52TGluZXMucHVzaChgICBCQVNFX0JSQU5DSD0ke2Jhc2VCcmFuY2h9YCk7XG4gIGlmICh3b3Jrc3BhY2VCcmFuY2gpIGVudkxpbmVzLnB1c2goYCAgV09SS1NQQUNFX0JSQU5DSD0ke3dvcmtzcGFjZUJyYW5jaH1gKTtcblxuICBjb25zdCBib2R5TGluZXM6IHN0cmluZ1tdID0gW107XG4gIGlmICh0aXRsZSkgYm9keUxpbmVzLnB1c2goYHRpdGxlOiAke3RpdGxlfWApO1xuICBib2R5TGluZXMucHVzaCgnJyk7XG4gIGlmIChnYXRlc0xpbmUpIGJvZHlMaW5lcy5wdXNoKGdhdGVzTGluZSk7XG4gIGJvZHlMaW5lcy5wdXNoKCdlbnY6Jyk7XG4gIGJvZHlMaW5lcy5wdXNoKC4uLmVudkxpbmVzKTtcblxuICBjb25zdCBhdHRycyA9IFtgaWQ9XCIke2lkfVwiYCwgYHN0YXR1cz1cIiR7c3RhdHVzfVwiYCwgYG1vZGU9XCIke2FjdGlvbklucHV0LmV4ZWN1dGlvbk1vZGV9XCJgXTtcblxuICByZXR1cm4gYDxjYXJkICR7YXR0cnMuam9pbignICcpfT5cXG4ke2JvZHlMaW5lcy5qb2luKCdcXG4nKX1cXG48L2NhcmQ+YDtcbn1cblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gQ2FyZCByZXBvIGxpc3Rpbmdcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuLyoqXG4gKiBGb3JtYXRzIGFuIG10aW1lIGFzIGFuIElTTyA4NjAxIHN0cmluZyB0cnVuY2F0ZWQgdG8gbWludXRlcyBpbiBVVEMuXG4gKlxuICogQHBhcmFtIG10aW1lTXMgLSBNb2RpZmljYXRpb24gdGltZSBpbiBtaWxsaXNlY29uZHMgc2luY2UgZXBvY2guXG4gKiBAcmV0dXJucyBJU08gc3RyaW5nIGxpa2UgYDIwMjUtMDItMjRUMTQ6MjRaYC5cbiAqL1xuZnVuY3Rpb24gZm9ybWF0VGltZXN0YW1wKG10aW1lTXM6IG51bWJlcik6IHN0cmluZyB7XG4gIGNvbnN0IGQgPSBuZXcgRGF0ZShtdGltZU1zKTtcbiAgY29uc3QgaXNvID0gZC50b0lTT1N0cmluZygpOyAvLyAyMDI1LTAyLTI0VDE0OjI0OjIxLjAwMFpcbiAgLy8gVHJ1bmNhdGUgdG8gbWludXRlczogXCIyMDI1LTAyLTI0VDE0OjI0WlwiXG4gIHJldHVybiBgJHtpc28uc2xpY2UoMCwgMTYpfVpgO1xufVxuXG4vKipcbiAqIENvdW50cyBmaWxlcyAobm9uLWRpcmVjdG9yaWVzKSBpbiBhIGRpcmVjdG9yeSBhbmQgcmV0dXJucyB0aGUgbGF0ZXN0IG10aW1lLlxuICpcbiAqIEBwYXJhbSBkaXJQYXRoIC0gRGlyZWN0b3J5IHRvIHNjYW4uXG4gKiBAcmV0dXJucyBUdXBsZSBvZiBgW2ZpbGVDb3VudCwgbGF0ZXN0TXRpbWVNc11gLCBvciBgWzAsIDBdYCBvbiBlcnJvci5cbiAqL1xuZnVuY3Rpb24gZGlyU3RhdHMoZGlyUGF0aDogc3RyaW5nKTogW2NvdW50OiBudW1iZXIsIGxhdGVzdE10aW1lTXM6IG51bWJlcl0ge1xuICB0cnkge1xuICAgIGNvbnN0IGVudHJpZXMgPSByZWFkZGlyU3luYyhkaXJQYXRoLCB7IHdpdGhGaWxlVHlwZXM6IHRydWUgfSk7XG4gICAgbGV0IGNvdW50ID0gMDtcbiAgICBsZXQgbGF0ZXN0ID0gMDtcbiAgICBmb3IgKGNvbnN0IGVudHJ5IG9mIGVudHJpZXMpIHtcbiAgICAgIGlmIChlbnRyeS5pc0ZpbGUoKSkge1xuICAgICAgICBjb3VudCsrO1xuICAgICAgICB0cnkge1xuICAgICAgICAgIGNvbnN0IG10ID0gc3RhdFN5bmMoam9pbihkaXJQYXRoLCBlbnRyeS5uYW1lKSkubXRpbWVNcztcbiAgICAgICAgICBpZiAobXQgPiBsYXRlc3QpIGxhdGVzdCA9IG10O1xuICAgICAgICB9IGNhdGNoIChfc3RhdEVycm9yOiB1bmtub3duKSB7XG4gICAgICAgICAgdm9pZCBfc3RhdEVycm9yOyAvLyBpbmRpdmlkdWFsIHN0YXQgZmFpbHVyZSBpcyBub24tZmF0YWxcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gW2NvdW50LCBsYXRlc3RdO1xuICB9IGNhdGNoIHtcbiAgICByZXR1cm4gWzAsIDBdO1xuICB9XG59XG5cbi8qKlxuICogQnVpbGRzIHRoZSBgPGNhcmQtcmVwbz5gIGJsb2NrOiByb290LWxldmVsIGZpbGVzIHdpdGggdGltZXN0YW1wcyxcbiAqIGRpcmVjdG9yaWVzIHdpdGggY2hpbGQgY291bnRzLCBhbmQgc3RyZWFtcyBzdWJkaXJlY3Rvcmllcy5cbiAqXG4gKiBAcGFyYW0gcm9vdFBhdGggLSBSb290IGRpcmVjdG9yeSBvZiB0aGUgY2FyZCByZXBvc2l0b3J5LlxuICogQHJldHVybnMgVGhlIGA8Y2FyZC1yZXBvPi4uLjwvY2FyZC1yZXBvPmAgYmxvY2sgc3RyaW5nLlxuICogQHRocm93cyB7Q2FyZFJlcG9BY2Nlc3NFcnJvcn0gV2hlbiB0aGUgcm9vdCBkaXJlY3RvcnkgY2Fubm90IGJlIHJlYWQuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBidWlsZENhcmRSZXBvQmxvY2socm9vdFBhdGg6IHN0cmluZyk6IHN0cmluZyB7XG4gIGxldCBlbnRyaWVzOiB7IG5hbWU6IHN0cmluZzsgaXNEaXI6IGJvb2xlYW4gfVtdO1xuICB0cnkge1xuICAgIGVudHJpZXMgPSByZWFkZGlyU3luYyhyb290UGF0aCwgeyB3aXRoRmlsZVR5cGVzOiB0cnVlIH0pLm1hcCgoZCkgPT4gKHtcbiAgICAgIG5hbWU6IGQubmFtZS50b1N0cmluZygpLFxuICAgICAgaXNEaXI6IGQuaXNEaXJlY3RvcnkoKVxuICAgIH0pKTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICB0aHJvdyBuZXcgQ2FyZFJlcG9BY2Nlc3NFcnJvcihyb290UGF0aCwgZXJyb3IpO1xuICB9XG5cbiAgY29uc3QgbGluZXM6IHN0cmluZ1tdID0gW107XG5cbiAgZm9yIChjb25zdCBlbnRyeSBvZiBlbnRyaWVzKSB7XG4gICAgaWYgKGVudHJ5Lm5hbWUgPT09ICcuZ2l0JykgY29udGludWU7XG4gICAgY29uc3QgZnVsbFBhdGggPSBqb2luKHJvb3RQYXRoLCBlbnRyeS5uYW1lKTtcblxuICAgIGlmIChlbnRyeS5pc0Rpcikge1xuICAgICAgaWYgKGVudHJ5Lm5hbWUgPT09ICdzdHJlYW1zJykge1xuICAgICAgICAvLyBTdHJlYW1zOiBzaG93IGVhY2ggc3ViZGlyZWN0b3J5IHdpdGggY2hpbGQgY291bnQgKyBsYXRlc3QgdGltZXN0YW1wXG4gICAgICAgIGxpbmVzLnB1c2goJ3N0cmVhbXMvJyk7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgY29uc3Qgc3RyZWFtRW50cmllcyA9IHJlYWRkaXJTeW5jKGZ1bGxQYXRoLCB7IHdpdGhGaWxlVHlwZXM6IHRydWUgfSk7XG4gICAgICAgICAgZm9yIChjb25zdCBzdWIgb2Ygc3RyZWFtRW50cmllcykge1xuICAgICAgICAgICAgaWYgKHN1Yi5pc0RpcmVjdG9yeSgpKSB7XG4gICAgICAgICAgICAgIGNvbnN0IHN1Yk5hbWUgPSBzdWIubmFtZS50b1N0cmluZygpO1xuICAgICAgICAgICAgICBjb25zdCBbY291bnQsIGxhdGVzdF0gPSBkaXJTdGF0cyhqb2luKGZ1bGxQYXRoLCBzdWJOYW1lKSk7XG4gICAgICAgICAgICAgIGNvbnN0IHRzID0gbGF0ZXN0ID4gMCA/IGAgICBsYXRlc3QgJHtmb3JtYXRUaW1lc3RhbXAobGF0ZXN0KX1gIDogJyc7XG4gICAgICAgICAgICAgIGxpbmVzLnB1c2goYCR7YCAgJHtzdWJOYW1lfS9gLnBhZEVuZCgyNCl9JHtjb3VudH0gZmlsZXMke3RzfWApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSBjYXRjaCAoX3JlYWRkaXJFcnJvcjogdW5rbm93bikge1xuICAgICAgICAgIHZvaWQgX3JlYWRkaXJFcnJvcjsgLy8gc3RyZWFtcyBkaXIgdW5yZWFkYWJsZSBcdTIwMTQgYWxyZWFkeSBsaXN0ZWQgdGhlIGRpcmVjdG9yeSBuYW1lXG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIE5vbi1zdHJlYW1zIGRpcmVjdG9yeTogc2hvdyBjaGlsZCBjb3VudCArIGxhdGVzdCB0aW1lc3RhbXBcbiAgICAgICAgY29uc3QgW2NvdW50LCBsYXRlc3RdID0gZGlyU3RhdHMoZnVsbFBhdGgpO1xuICAgICAgICBjb25zdCB0cyA9IGxhdGVzdCA+IDAgPyBgICAgbGF0ZXN0ICR7Zm9ybWF0VGltZXN0YW1wKGxhdGVzdCl9YCA6ICcnO1xuICAgICAgICBsaW5lcy5wdXNoKGAke2Ake2VudHJ5Lm5hbWV9L2AucGFkRW5kKDI0KX0ke2NvdW50fSBmaWxlcyR7dHN9YCk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIFJvb3QtbGV2ZWwgZmlsZTogc2hvdyBuYW1lICsgdGltZXN0YW1wXG4gICAgICB0cnkge1xuICAgICAgICBjb25zdCBtdCA9IHN0YXRTeW5jKGZ1bGxQYXRoKS5tdGltZU1zO1xuICAgICAgICBsaW5lcy5wdXNoKGAke2VudHJ5Lm5hbWV9YC5wYWRFbmQoMjQpICsgZm9ybWF0VGltZXN0YW1wKG10KSk7XG4gICAgICB9IGNhdGNoIHtcbiAgICAgICAgbGluZXMucHVzaChlbnRyeS5uYW1lKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gYDxjYXJkLXJlcG8+XFxuJHtsaW5lcy5qb2luKCdcXG4nKX1cXG48L2NhcmQtcmVwbz5gO1xufVxuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBDYXJkIHJlcG8gZ2l0IGxvZ1xuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4vKiogTWF4aW11bSBudW1iZXIgb2YgcXVhbGlmeWluZyBjb21taXRzIHNob3duIGluIHRoZSBjYXJkIHJlcG8gbG9nLiAqL1xuY29uc3QgTUFYX0NBUkRfUkVQT19MT0dfQ09NTUlUUyA9IDU7XG5cbi8qKlxuICogQnVpbGRzIHRoZSBgPGNhcmQtcmVwby1sb2c+YCBibG9jayB3aXRoIHJlY2VudCBjb21taXRzIGFuZCBwYXRjaCBkaWZmcy5cbiAqXG4gKiBGaWx0ZXJzIG91dCBjb21taXRzIHRoYXQgZXhjbHVzaXZlbHkgdG91Y2ggYHN0cmVhbXMvYCBmaWxlcyAoaGlnaC1mcmVxdWVuY3lcbiAqIHRyYW5zY3JpcHQgd3JpdGVzKS4gU2hvd3MgcGF0Y2ggb3V0cHV0IGluc3RlYWQgb2YgZGlmZnN0YXQgZm9yIHJlbWFpbmluZ1xuICogY29udGVudC5cbiAqXG4gKiBSZXR1cm5zIGBudWxsYCB3aGVuIHRoZSByZXBvc2l0b3J5IGhhcyBubyBxdWFsaWZ5aW5nIGNvbW1pdHMgb3IgZ2l0IGlzXG4gKiB1bmF2YWlsYWJsZSwgc28gdGhlIGJsb2NrIGNhbiBiZSBvbWl0dGVkIGZyb20gdGhlIG91dHB1dC5cbiAqXG4gKiBAcGFyYW0gcm9vdFBhdGggLSBSb290IGRpcmVjdG9yeSBvZiB0aGUgY2FyZCByZXBvc2l0b3J5LlxuICogQHJldHVybnMgVGhlIGA8Y2FyZC1yZXBvLWxvZyAuLi4+Li4uPC9jYXJkLXJlcG8tbG9nPmAgYmxvY2sgc3RyaW5nLCBvciBgbnVsbGAuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBidWlsZENhcmRSZXBvTG9nQmxvY2socm9vdFBhdGg6IHN0cmluZyk6IHN0cmluZyB8IG51bGwge1xuICB0cnkge1xuICAgIGNvbnN0IGxvZyA9IGV4ZWNGaWxlU3luYyhcbiAgICAgICdnaXQnLFxuICAgICAgW1xuICAgICAgICAnbG9nJyxcbiAgICAgICAgYC0ke01BWF9DQVJEX1JFUE9fTE9HX0NPTU1JVFN9YCxcbiAgICAgICAgJy0tcHJldHR5PWZvcm1hdDoleDAwJWggLSAlYW46ICVzJyxcbiAgICAgICAgJy0tbmFtZS1vbmx5JyxcbiAgICAgICAgJy0tJyxcbiAgICAgICAgJy4nLFxuICAgICAgICAnOiFzdHJlYW1zLycsXG4gICAgICAgICc6IS5naXRpZ25vcmUnLFxuICAgICAgICBgOiEke1dPUktTUEFDRV9CUkFOQ0hFU19GSUxFfWAsXG4gICAgICAgIGA6ISR7V09SS1NQQUNFX0NPTU1JVFNfRklMRX1gXG4gICAgICBdLFxuICAgICAge1xuICAgICAgICBjd2Q6IHJvb3RQYXRoLFxuICAgICAgICBlbmNvZGluZzogJ3V0Zi04JyxcbiAgICAgICAgdGltZW91dDogNTAwMCxcbiAgICAgICAgc3RkaW86IFsncGlwZScsICdwaXBlJywgJ3BpcGUnXVxuICAgICAgfVxuICAgICkudHJpbSgpO1xuXG4gICAgaWYgKCFsb2cpIHJldHVybiBudWxsO1xuXG4gICAgY29uc3QgZm9ybWF0dGVkID0gZm9ybWF0Q29tbWl0TG9nKGxvZywgJ251bCcpO1xuICAgIGlmICghZm9ybWF0dGVkKSByZXR1cm4gbnVsbDtcblxuICAgIGxldCB0b3RhbENvdW50OiBudW1iZXIgfCBudWxsID0gbnVsbDtcbiAgICB0cnkge1xuICAgICAgY29uc3QgY291bnRTdHIgPSBleGVjRmlsZVN5bmMoJ2dpdCcsIFsncmV2LWxpc3QnLCAnLS1jb3VudCcsICdIRUFEJ10sIHtcbiAgICAgICAgY3dkOiByb290UGF0aCxcbiAgICAgICAgZW5jb2Rpbmc6ICd1dGYtOCcsXG4gICAgICAgIHRpbWVvdXQ6IDUwMDAsXG4gICAgICAgIHN0ZGlvOiBbJ3BpcGUnLCAncGlwZScsICdwaXBlJ11cbiAgICAgIH0pLnRyaW0oKTtcbiAgICAgIHRvdGFsQ291bnQgPSBwYXJzZUludChjb3VudFN0ciwgMTApO1xuICAgICAgaWYgKE51bWJlci5pc05hTih0b3RhbENvdW50KSkgdG90YWxDb3VudCA9IG51bGw7XG4gICAgfSBjYXRjaCAoX2NvdW50RXJyb3I6IHVua25vd24pIHtcbiAgICAgIHZvaWQgX2NvdW50RXJyb3I7IC8vIGNvdW50IGlzIG9wdGlvbmFsXG4gICAgfVxuXG4gICAgY29uc3QgY291bnRBdHRyID0gdG90YWxDb3VudCAhPT0gbnVsbCA/IGAgY291bnQ9XCIke3RvdGFsQ291bnR9XCJgIDogJyc7XG4gICAgcmV0dXJuIGA8Y2FyZC1yZXBvLWxvZyR7Y291bnRBdHRyfT5cXG4ke2Zvcm1hdHRlZH1cXG48L2NhcmQtcmVwby1sb2c+YDtcbiAgfSBjYXRjaCB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbn1cblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gV29ya3NwYWNlIHJlcG8gbG9nXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbi8qKiBNYXhpbXVtIG51bWJlciBvZiBjb21taXRzIHNob3duIHdpdGggZnVsbCBkZXRhaWwgcGVyIGJyYW5jaCBibG9jay4gKi9cbmNvbnN0IE1BWF9XT1JLU1BBQ0VfQ09NTUlUU19QRVJfQlJBTkNIID0gNTtcblxuLyoqXG4gKiBXb3Jrc3BhY2UgdHJhY2tpbmcgZGF0YSByZWFkIGZyb20gc2VwYXJhdGUgd29ya3NwYWNlIGZpbGVzLlxuICovXG5pbnRlcmZhY2UgV29ya3NwYWNlRGF0YSB7XG4gIGJyYW5jaGVzOiBSZWNvcmQ8c3RyaW5nLCB7IHBhcmVudEJyYW5jaD86IHN0cmluZzsgYWRkZWRBdDogc3RyaW5nIH0+O1xuICBjb21taXRzOiBzdHJpbmdbXTtcbn1cblxuLyoqXG4gKiBSZWFkcyB3b3Jrc3BhY2UgZGF0YSBmcm9tIHNlcGFyYXRlIGZpbGVzIGluIHRoZSBjYXJkIHJlcG9zaXRvcnkuXG4gKlxuICogUmVhZHMgYnJhbmNoZXMgZnJvbSBgd29ya3NwYWNlLWJyYW5jaGVzLmpzb25gIGFuZCBjb21taXRzIGZyb21cbiAqIGB3b3Jrc3BhY2UtY29tbWl0cy5jc3ZgLiBFYWNoIGZpbGUgaXMgcmVhZCBpbmRlcGVuZGVudGx5IFx1MjAxNCBFTk9FTlQgaXNcbiAqIHRyZWF0ZWQgYXMgYW4gZW1wdHkgcmVzdWx0LCBvdGhlciBlcnJvcnMgY2F1c2UgYG51bGxgIHRvIGJlIHJldHVybmVkLlxuICpcbiAqIFJldHVybnMgZGF0YSB3aGVuZXZlciBlaXRoZXIgZmlsZSBoYXMgY29udGVudC4gUmV0dXJucyBgbnVsbGAgb25seSB3aGVuXG4gKiBib3RoIGZpbGVzIGFyZSBhYnNlbnQgb3IgZW1wdHksIG9yIHdoZW4gYSBub24tRU5PRU5UIGVycm9yIG9jY3Vycy5cbiAqXG4gKiBAcGFyYW0gY2FyZFJlcG9QYXRoIC0gUm9vdCBkaXJlY3Rvcnkgb2YgdGhlIGNhcmQgcmVwb3NpdG9yeS5cbiAqIEByZXR1cm5zIFBhcnNlZCB3b3Jrc3BhY2UgZGF0YSwgb3IgYG51bGxgIHdoZW4gdW5hdmFpbGFibGUuXG4gKi9cbmZ1bmN0aW9uIHJlYWRXb3Jrc3BhY2VEYXRhKGNhcmRSZXBvUGF0aDogc3RyaW5nKTogV29ya3NwYWNlRGF0YSB8IG51bGwge1xuICBjb25zdCBicmFuY2hlczogV29ya3NwYWNlRGF0YVsnYnJhbmNoZXMnXSA9IHt9O1xuICBsZXQgY29tbWl0czogc3RyaW5nW10gPSBbXTtcblxuICAvLyBSZWFkIGJyYW5jaGVzIGZyb20gd29ya3NwYWNlLWJyYW5jaGVzLmpzb25cbiAgdHJ5IHtcbiAgICBjb25zdCByYXcgPSByZWFkRmlsZVN5bmMoam9pbihjYXJkUmVwb1BhdGgsIFdPUktTUEFDRV9CUkFOQ0hFU19GSUxFKSwgJ3V0Zi04Jyk7XG4gICAgY29uc3QgcGFyc2VkID0gSlNPTi5wYXJzZShyYXcpIGFzIFJlY29yZDxzdHJpbmcsIHsgcGFyZW50QnJhbmNoPzogc3RyaW5nOyBhZGRlZEF0Pzogc3RyaW5nIH0+O1xuICAgIGZvciAoY29uc3QgW25hbWUsIG1ldGFdIG9mIE9iamVjdC5lbnRyaWVzKHBhcnNlZCkpIHtcbiAgICAgIGlmIChtZXRhICYmIHR5cGVvZiBtZXRhID09PSAnb2JqZWN0Jykge1xuICAgICAgICBicmFuY2hlc1tuYW1lXSA9IHtcbiAgICAgICAgICBwYXJlbnRCcmFuY2g6IHR5cGVvZiBtZXRhLnBhcmVudEJyYW5jaCA9PT0gJ3N0cmluZycgPyBtZXRhLnBhcmVudEJyYW5jaCA6IHVuZGVmaW5lZCxcbiAgICAgICAgICBhZGRlZEF0OiB0eXBlb2YgbWV0YS5hZGRlZEF0ID09PSAnc3RyaW5nJyA/IG1ldGEuYWRkZWRBdCA6ICcnXG4gICAgICAgIH07XG4gICAgICB9XG4gICAgfVxuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGlmICgoZXJyb3IgYXMgTm9kZUpTLkVycm5vRXhjZXB0aW9uKS5jb2RlICE9PSAnRU5PRU5UJykge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICB9XG5cbiAgLy8gUmVhZCBjb21taXRzIGZyb20gd29ya3NwYWNlLWNvbW1pdHMuY3N2XG4gIHRyeSB7XG4gICAgY29uc3QgcmF3ID0gcmVhZEZpbGVTeW5jKGpvaW4oY2FyZFJlcG9QYXRoLCBXT1JLU1BBQ0VfQ09NTUlUU19GSUxFKSwgJ3V0Zi04Jyk7XG4gICAgY29tbWl0cyA9IHJhd1xuICAgICAgLnNwbGl0KCdcXG4nKVxuICAgICAgLm1hcCgobCkgPT4gbC50cmltKCkpXG4gICAgICAuZmlsdGVyKChzKTogcyBpcyBzdHJpbmcgPT4gcy5sZW5ndGggPiAwKTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBpZiAoKGVycm9yIGFzIE5vZGVKUy5FcnJub0V4Y2VwdGlvbikuY29kZSAhPT0gJ0VOT0VOVCcpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgfVxuXG4gIC8vIFJldHVybiBkYXRhIHdoZW4gZWl0aGVyIGZpbGUgaGFzIGNvbnRlbnRcbiAgaWYgKE9iamVjdC5rZXlzKGJyYW5jaGVzKS5sZW5ndGggPT09IDAgJiYgY29tbWl0cy5sZW5ndGggPT09IDApIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIHJldHVybiB7IGJyYW5jaGVzLCBjb21taXRzIH07XG59XG5cbi8qKlxuICogUmV0dXJucyB0aGUgc2V0IG9mIGNvbW1pdCBTSEFzIHJlYWNoYWJsZSBmcm9tIGEgZ2l0IHJlZi5cbiAqXG4gKiBAcGFyYW0gd29ya3NwYWNlUGF0aCAtIFJvb3QgZGlyZWN0b3J5IG9mIHRoZSB3b3Jrc3BhY2UgcmVwb3NpdG9yeS5cbiAqIEBwYXJhbSByZWYgLSBHaXQgcmVmIG5hbWUgKGJyYW5jaCwgdGFnLCBvciBTSEEpLlxuICogQHJldHVybnMgU2V0IG9mIGZ1bGwgNDAtY2hhciBTSEFzLCBvciBlbXB0eSBzZXQgb24gZmFpbHVyZS5cbiAqL1xuZnVuY3Rpb24gZ2V0UmVhY2hhYmxlU2hhcyh3b3Jrc3BhY2VQYXRoOiBzdHJpbmcsIHJlZjogc3RyaW5nKTogU2V0PHN0cmluZz4ge1xuICB0cnkge1xuICAgIGNvbnN0IG91dHB1dCA9IGV4ZWNGaWxlU3luYygnZ2l0JywgWydsb2cnLCAnLS1mb3JtYXQ9JUgnLCByZWZdLCB7XG4gICAgICBjd2Q6IHdvcmtzcGFjZVBhdGgsXG4gICAgICBlbmNvZGluZzogJ3V0Zi04JyxcbiAgICAgIHRpbWVvdXQ6IDEwMDAwLFxuICAgICAgc3RkaW86IFsncGlwZScsICdwaXBlJywgJ3BpcGUnXVxuICAgIH0pLnRyaW0oKTtcbiAgICByZXR1cm4gbmV3IFNldChvdXRwdXQgPyBvdXRwdXQuc3BsaXQoJ1xcbicpIDogW10pO1xuICB9IGNhdGNoIHtcbiAgICByZXR1cm4gbmV3IFNldCgpO1xuICB9XG59XG5cbi8qKlxuICogRmlsdGVycyBTSEFzIHRvIHRob3NlIHRoYXQgZXhpc3QgYXMgb2JqZWN0cyBpbiB0aGUgd29ya3NwYWNlIHJlcG8uXG4gKlxuICogVXNlcyBgZ2l0IGNhdC1maWxlIC0tYmF0Y2gtY2hlY2tgIGZvciBhIHNpbmdsZS1jYWxsIGJhdGNoIGV4aXN0ZW5jZSB0ZXN0LlxuICpcbiAqIEBwYXJhbSB3b3Jrc3BhY2VQYXRoIC0gUm9vdCBkaXJlY3Rvcnkgb2YgdGhlIHdvcmtzcGFjZSByZXBvc2l0b3J5LlxuICogQHBhcmFtIHNoYXMgLSBGdWxsIDQwLWNoYXIgU0hBcyB0byBjaGVjay5cbiAqIEByZXR1cm5zIFNIQXMgdGhhdCBleGlzdCBpbiB0aGUgcmVwb3NpdG9yeS5cbiAqL1xuZnVuY3Rpb24gZmlsdGVyUmVzb2x2YWJsZVNoYXMod29ya3NwYWNlUGF0aDogc3RyaW5nLCBzaGFzOiBzdHJpbmdbXSk6IHN0cmluZ1tdIHtcbiAgaWYgKHNoYXMubGVuZ3RoID09PSAwKSByZXR1cm4gW107XG4gIHRyeSB7XG4gICAgY29uc3Qgb3V0cHV0ID0gZXhlY0ZpbGVTeW5jKCdnaXQnLCBbJ2NhdC1maWxlJywgJy0tYmF0Y2gtY2hlY2snXSwge1xuICAgICAgaW5wdXQ6IGAke3NoYXMuam9pbignXFxuJyl9XFxuYCxcbiAgICAgIGN3ZDogd29ya3NwYWNlUGF0aCxcbiAgICAgIGVuY29kaW5nOiAndXRmLTgnLFxuICAgICAgdGltZW91dDogNTAwMCxcbiAgICAgIHN0ZGlvOiBbJ3BpcGUnLCAncGlwZScsICdwaXBlJ11cbiAgICB9KS50cmltKCk7XG5cbiAgICBjb25zdCBsaW5lcyA9IG91dHB1dC5zcGxpdCgnXFxuJyk7XG4gICAgY29uc3QgcmVzb2x2YWJsZTogc3RyaW5nW10gPSBbXTtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGxpbmVzLmxlbmd0aCAmJiBpIDwgc2hhcy5sZW5ndGg7IGkrKykge1xuICAgICAgaWYgKCFsaW5lc1tpXSEuaW5jbHVkZXMoJ21pc3NpbmcnKSkge1xuICAgICAgICByZXNvbHZhYmxlLnB1c2goc2hhc1tpXSEpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcmVzb2x2YWJsZTtcbiAgfSBjYXRjaCB7XG4gICAgcmV0dXJuIFtdO1xuICB9XG59XG5cbi8qKlxuICogQW5ub3RhdGVzIG1lcmdlZCBjb21taXRzIGFuZCBzdHJpcHMgZnVsbCBTSEFzIGZyb20gZ2l0IGxvZyBvdXRwdXQuXG4gKlxuICogVGFrZXMgb3V0cHV0IHByb2R1Y2VkIHdpdGggYC0tcHJldHR5PWZvcm1hdDolSCAlaCAtICVzYCBhbmQgcmVwbGFjZXMgZWFjaFxuICogaGVhZGVyIGxpbmUgd2l0aCBgJWggLSAlcyBbbWVyZ2VkXWAgKHdoZW4gdGhlIGZ1bGwgU0hBIGlzIGluIGBtZXJnZWRTaGFzYClcbiAqIG9yIHBsYWluIGAlaCAtICVzYCAod2hlbiBpdCBpcyBub3QpLlxuICpcbiAqIEBwYXJhbSBvdXRwdXQgLSBSYXcgZ2l0IGxvZyBvdXRwdXQgdXNpbmcgYCVIICVoIC0gJXNgIGZvcm1hdC5cbiAqIEBwYXJhbSBtZXJnZWRTaGFzIC0gRnVsbCA0MC1jaGFyIFNIQXMgY29uc2lkZXJlZCBtZXJnZWQuXG4gKiBAcmV0dXJucyBPdXRwdXQgaW4gc3RhbmRhcmQgYCVoIC0gJXNgIGZvcm1hdCB3aXRoIGBbbWVyZ2VkXWAgYW5ub3RhdGlvbnMuXG4gKi9cbmZ1bmN0aW9uIGFubm90YXRlTWVyZ2VkQ29tbWl0cyhvdXRwdXQ6IHN0cmluZywgbWVyZ2VkU2hhczogU2V0PHN0cmluZz4pOiBzdHJpbmcge1xuICByZXR1cm4gb3V0cHV0LnJlcGxhY2UoL14oWzAtOWEtZl17NDB9KSAoWzAtOWEtZl17Nyx9IC0gLiopJC9nbSwgKF8sIGZ1bGxTaGE6IHN0cmluZywgcmVzdDogc3RyaW5nKSA9PiB7XG4gICAgcmV0dXJuIG1lcmdlZFNoYXMuaGFzKGZ1bGxTaGEpID8gYCR7cmVzdH0gW21lcmdlZF1gIDogcmVzdDtcbiAgfSk7XG59XG5cbi8qKlxuICogUmVzb2x2ZXMgY29tbWl0IGRldGFpbHMgZm9yIHNwZWNpZmljIFNIQXMgdXNpbmcgYGdpdCBsb2cgLS1uby13YWxrYC5cbiAqXG4gKiBXaGVuIGBtZXJnZWRTaGFzYCBpcyBwcm92aWRlZCwgY29tbWl0cyB3aG9zZSBmdWxsIFNIQSBhcHBlYXJzIGluIHRoZSBzZXRcbiAqIHJlY2VpdmUgYSBgW21lcmdlZF1gIHN1ZmZpeCBvbiB0aGVpciBzdWJqZWN0IGxpbmUuXG4gKlxuICogQHBhcmFtIHdvcmtzcGFjZVBhdGggLSBSb290IGRpcmVjdG9yeSBvZiB0aGUgd29ya3NwYWNlIHJlcG9zaXRvcnkuXG4gKiBAcGFyYW0gc2hhcyAtIEZ1bGwgNDAtY2hhciBTSEFzIHRvIHJlc29sdmUuXG4gKiBAcGFyYW0gbWVyZ2VkU2hhcyAtIFNIQXMgcmVhY2hhYmxlIGZyb20gdGhlIGJhc2UgYnJhbmNoIChjb25zaWRlcmVkIG1lcmdlZCkuXG4gKiBAcmV0dXJucyBGb3JtYXR0ZWQgY29tbWl0IGxvZyB3aXRoIHRyZWUtcmVuZGVyZWQgZmlsZSBsaXN0cywgb3IgYG51bGxgIG9uIGZhaWx1cmUuXG4gKi9cbmZ1bmN0aW9uIHJlc29sdmVXb3Jrc3BhY2VDb21taXREZXRhaWxzKHdvcmtzcGFjZVBhdGg6IHN0cmluZywgc2hhczogc3RyaW5nW10sIG1lcmdlZFNoYXM/OiBTZXQ8c3RyaW5nPik6IHN0cmluZyB8IG51bGwge1xuICBpZiAoc2hhcy5sZW5ndGggPT09IDApIHJldHVybiBudWxsO1xuICB0cnkge1xuICAgIGNvbnN0IHVzZUZ1bGxIYXNoID0gbWVyZ2VkU2hhcyAhPT0gdW5kZWZpbmVkICYmIG1lcmdlZFNoYXMuc2l6ZSA+IDA7XG4gICAgY29uc3QgZm9ybWF0ID0gdXNlRnVsbEhhc2ggPyAnJUggJWggLSAlcycgOiAnJWggLSAlcyc7XG4gICAgY29uc3Qgb3V0cHV0ID0gZXhlY0ZpbGVTeW5jKCdnaXQnLCBbJ2xvZycsICctLW5vLXdhbGsnLCBgLS1wcmV0dHk9Zm9ybWF0OiR7Zm9ybWF0fWAsICctLW5hbWUtb25seScsIC4uLnNoYXNdLCB7XG4gICAgICBjd2Q6IHdvcmtzcGFjZVBhdGgsXG4gICAgICBlbmNvZGluZzogJ3V0Zi04JyxcbiAgICAgIHRpbWVvdXQ6IDUwMDAsXG4gICAgICBzdGRpbzogWydwaXBlJywgJ3BpcGUnLCAncGlwZSddXG4gICAgfSkudHJpbSgpO1xuXG4gICAgaWYgKCFvdXRwdXQpIHJldHVybiBudWxsO1xuICAgIGNvbnN0IGFubm90YXRlZCA9IHVzZUZ1bGxIYXNoID8gYW5ub3RhdGVNZXJnZWRDb21taXRzKG91dHB1dCwgbWVyZ2VkU2hhcykgOiBvdXRwdXQ7XG4gICAgcmV0dXJuIGZvcm1hdENvbW1pdExvZyhhbm5vdGF0ZWQsICdibGFuay1saW5lJykgfHwgbnVsbDtcbiAgfSBjYXRjaCB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbn1cblxuLyoqXG4gKiBDb21taXQgZ3JvdXAgZm9yIGEgc2luZ2xlIGJyYW5jaCBvciB0aGUgb3JwaGFuZWQgYnVja2V0LlxuICovXG5pbnRlcmZhY2UgQ29tbWl0R3JvdXAge1xuICBicmFuY2hOYW1lOiBzdHJpbmc7XG4gIHBhcmVudEJyYW5jaD86IHN0cmluZztcbiAgc2hhczogc3RyaW5nW107XG4gIG9ycGhhbmVkPzogYm9vbGVhbjtcbn1cblxuLyoqXG4gKiBCdWlsZHMgYDx3b3Jrc3BhY2UtcmVwby1sb2c+YCBibG9ja3Mgc2hvd2luZyB3b3Jrc3BhY2UgY29tbWl0cyBncm91cGVkIGJ5IGJyYW5jaC5cbiAqXG4gKiBSZWFkcyBicmFuY2hlcyBmcm9tIGB3b3Jrc3BhY2UtYnJhbmNoZXMuanNvbmAgYW5kIGNvbW1pdHMgZnJvbVxuICogYHdvcmtzcGFjZS1jb21taXRzLmNzdmAsIHBhcnRpdGlvbnMgY29tbWl0cyBhY3Jvc3MgYnJhbmNoZXMgdXNpbmcgZ2l0XG4gKiByZWFjaGFiaWxpdHksIGFuZCByZW5kZXJzIHBlci1icmFuY2ggWE1MIGJsb2Nrcy4gQWxyZWFkeS1wcmludGVkIGNvbW1pdHNcbiAqIGFwcGVhciBhcyBiYXJlIHNob3J0IGhhc2hlcyBpbiBzdWJzZXF1ZW50IGJsb2NrcyAoZGVkdXApLlxuICpcbiAqIEJyYW5jaCBwcm9jZXNzaW5nIG9yZGVyOiBzb3J0ZWQgYnkgYGFkZGVkQXRgIChvbGRlc3QgZmlyc3QpIHNvIHRoZVxuICogZm91bmRhdGlvbmFsIGJyYW5jaCByZWNlaXZlcyBmdWxsIGNvbW1pdCBvdXRwdXQgYW5kIGxhdGVyIGJyYW5jaGVzIGRlZHVwXG4gKiBhZ2FpbnN0IGl0LlxuICpcbiAqIEBwYXJhbSB3b3Jrc3BhY2VQYXRoIC0gUm9vdCBkaXJlY3Rvcnkgb2YgdGhlIHdvcmtzcGFjZSByZXBvc2l0b3J5LlxuICogQHBhcmFtIGNhcmRSZXBvUGF0aCAtIFJvb3QgZGlyZWN0b3J5IG9mIHRoZSBjYXJkIHJlcG9zaXRvcnkuXG4gKiBAcmV0dXJucyBBcnJheSBvZiBgPHdvcmtzcGFjZS1yZXBvLWxvZz5gIGJsb2NrIHN0cmluZ3MsIG9yIGVtcHR5IGFycmF5LlxuICovXG5leHBvcnQgZnVuY3Rpb24gYnVpbGRXb3Jrc3BhY2VSZXBvTG9nQmxvY2tzKHdvcmtzcGFjZVBhdGg6IHN0cmluZywgY2FyZFJlcG9QYXRoOiBzdHJpbmcpOiBzdHJpbmdbXSB7XG4gIGNvbnN0IHdvcmtzcGFjZSA9IHJlYWRXb3Jrc3BhY2VEYXRhKGNhcmRSZXBvUGF0aCk7XG4gIGlmICghd29ya3NwYWNlKSByZXR1cm4gW107XG5cbiAgY29uc3QgYmFzZUJyYW5jaCA9IHByb2Nlc3MuZW52W0NBUkRTX0VOVl9WQVJTLkJBU0VfQlJBTkNIXSA/PyAnbWFpbic7XG5cbiAgLy8gU29ydCBicmFuY2hlcyBieSBhZGRlZEF0IChvbGRlc3QgZmlyc3QpXG4gIGNvbnN0IHNvcnRlZEJyYW5jaGVzID0gT2JqZWN0LmVudHJpZXMod29ya3NwYWNlLmJyYW5jaGVzKS5zb3J0KChbLCBhXSwgWywgYl0pID0+IGEuYWRkZWRBdC5sb2NhbGVDb21wYXJlKGIuYWRkZWRBdCkpO1xuXG4gIC8vIFBhcnRpdGlvbjogZWFjaCBicmFuY2ggaW5jbHVkZXMgQUxMIHJlYWNoYWJsZSB3b3Jrc3BhY2UuY29tbWl0cyAobWF5IG92ZXJsYXApLlxuICAvLyBSZW5kZXJpbmcgZGVkdXAgaGFuZGxlcyBjcm9zcy1icmFuY2ggb3ZlcmxhcCB2aWEgYmFyZSBzaG9ydCBoYXNoZXMuXG4gIGNvbnN0IHJlYWNoYWJsZUZyb21UcmFja2VkID0gbmV3IFNldDxzdHJpbmc+KCk7XG4gIGNvbnN0IGdyb3VwczogQ29tbWl0R3JvdXBbXSA9IFtdO1xuXG4gIGZvciAoY29uc3QgW25hbWUsIG1ldGFdIG9mIHNvcnRlZEJyYW5jaGVzKSB7XG4gICAgY29uc3QgcmVhY2hhYmxlID0gZ2V0UmVhY2hhYmxlU2hhcyh3b3Jrc3BhY2VQYXRoLCBuYW1lKTtcbiAgICBjb25zdCBicmFuY2hTaGFzID0gd29ya3NwYWNlLmNvbW1pdHMuZmlsdGVyKChzaGEpID0+IHJlYWNoYWJsZS5oYXMoc2hhKSk7XG4gICAgZm9yIChjb25zdCBzaGEgb2YgYnJhbmNoU2hhcykgcmVhY2hhYmxlRnJvbVRyYWNrZWQuYWRkKHNoYSk7XG4gICAgaWYgKGJyYW5jaFNoYXMubGVuZ3RoID4gMCkge1xuICAgICAgZ3JvdXBzLnB1c2goeyBicmFuY2hOYW1lOiBuYW1lLCBwYXJlbnRCcmFuY2g6IG1ldGEucGFyZW50QnJhbmNoLCBzaGFzOiBicmFuY2hTaGFzIH0pO1xuICAgIH1cbiAgfVxuXG4gIC8vIEJhc2UgYnJhbmNoOiBjb21taXRzIHJlYWNoYWJsZSBmcm9tIGJhc2UgYnV0IE5PVCBmcm9tIGFueSB0cmFja2VkIGJyYW5jaFxuICBjb25zdCBiYXNlUmVhY2hhYmxlID0gZ2V0UmVhY2hhYmxlU2hhcyh3b3Jrc3BhY2VQYXRoLCBiYXNlQnJhbmNoKTtcbiAgY29uc3QgYmFzZVNoYXMgPSB3b3Jrc3BhY2UuY29tbWl0cy5maWx0ZXIoKHNoYSkgPT4gYmFzZVJlYWNoYWJsZS5oYXMoc2hhKSAmJiAhcmVhY2hhYmxlRnJvbVRyYWNrZWQuaGFzKHNoYSkpO1xuICBpZiAoYmFzZVNoYXMubGVuZ3RoID4gMCkge1xuICAgIGdyb3Vwcy5wdXNoKHsgYnJhbmNoTmFtZTogYmFzZUJyYW5jaCwgc2hhczogYmFzZVNoYXMgfSk7XG4gIH1cblxuICAvLyBPcnBoYW5lZDogbm90IHJlYWNoYWJsZSBmcm9tIGFueSB0cmFja2VkIGJyYW5jaCBvciBiYXNlLCBmaWx0ZXIgdG8gcmVzb2x2YWJsZVxuICBjb25zdCBvcnBoYW5lZFNoYXMgPSB3b3Jrc3BhY2UuY29tbWl0cy5maWx0ZXIoKHNoYSkgPT4gIXJlYWNoYWJsZUZyb21UcmFja2VkLmhhcyhzaGEpICYmICFiYXNlUmVhY2hhYmxlLmhhcyhzaGEpKTtcbiAgY29uc3QgcmVzb2x2YWJsZSA9IGZpbHRlclJlc29sdmFibGVTaGFzKHdvcmtzcGFjZVBhdGgsIG9ycGhhbmVkU2hhcyk7XG4gIGlmIChyZXNvbHZhYmxlLmxlbmd0aCA+IDApIHtcbiAgICBncm91cHMucHVzaCh7IGJyYW5jaE5hbWU6ICcnLCBzaGFzOiByZXNvbHZhYmxlLCBvcnBoYW5lZDogdHJ1ZSB9KTtcbiAgfVxuXG4gIC8vIFJlbmRlciBibG9ja3Mgd2l0aCBjcm9zcy1icmFuY2ggZGVkdXBcbiAgY29uc3QgcHJpbnRlZFNoYXMgPSBuZXcgU2V0PHN0cmluZz4oKTtcbiAgY29uc3QgYmxvY2tzOiBzdHJpbmdbXSA9IFtdO1xuXG4gIGZvciAoY29uc3QgZ3JvdXAgb2YgZ3JvdXBzKSB7XG4gICAgY29uc3QgbmV3U2hhcyA9IGdyb3VwLnNoYXMuZmlsdGVyKChzaGEpID0+ICFwcmludGVkU2hhcy5oYXMoc2hhKSk7XG4gICAgY29uc3QgZHVwU2hhcyA9IGdyb3VwLnNoYXMuZmlsdGVyKChzaGEpID0+IHByaW50ZWRTaGFzLmhhcyhzaGEpKTtcblxuICAgIC8vIFNob3cgbW9zdCByZWNlbnQgTiB3aXRoIGZ1bGwgZGV0YWlsXG4gICAgY29uc3QgZGlzcGxheVNoYXMgPSBuZXdTaGFzLnNsaWNlKC1NQVhfV09SS1NQQUNFX0NPTU1JVFNfUEVSX0JSQU5DSCk7XG4gICAgY29uc3QgbWVyZ2VkU2hhcyA9IG5ldyBTZXQoZGlzcGxheVNoYXMuZmlsdGVyKChzaGEpID0+IGJhc2VSZWFjaGFibGUuaGFzKHNoYSkpKTtcbiAgICBjb25zdCBkZXRhaWxzID0gcmVzb2x2ZVdvcmtzcGFjZUNvbW1pdERldGFpbHMod29ya3NwYWNlUGF0aCwgZGlzcGxheVNoYXMsIG1lcmdlZFNoYXMpO1xuXG4gICAgaWYgKGRldGFpbHMpIHtcbiAgICAgIGZvciAoY29uc3Qgc2hhIG9mIGRpc3BsYXlTaGFzKSBwcmludGVkU2hhcy5hZGQoc2hhKTtcbiAgICB9XG5cbiAgICAvLyBCdWlsZCBib2R5OiBmdWxsIGRldGFpbHMgZmlyc3QsIHRoZW4gYmFyZSBoYXNoZXMgZm9yIGRlZHVwXG4gICAgY29uc3QgYm9keVBhcnRzOiBzdHJpbmdbXSA9IFtdO1xuICAgIGlmIChkZXRhaWxzKSBib2R5UGFydHMucHVzaChkZXRhaWxzKTtcbiAgICBpZiAoZHVwU2hhcy5sZW5ndGggPiAwKSB7XG4gICAgICBib2R5UGFydHMucHVzaChkdXBTaGFzLm1hcCgoc2hhKSA9PiBzaGEuc2xpY2UoMCwgNykpLmpvaW4oJ1xcbicpKTtcbiAgICB9XG5cbiAgICBpZiAoYm9keVBhcnRzLmxlbmd0aCA9PT0gMCkgY29udGludWU7XG5cbiAgICAvLyBCdWlsZCBYTUwgdGFnXG4gICAgY29uc3QgYXR0cnM6IHN0cmluZ1tdID0gW107XG4gICAgaWYgKGdyb3VwLm9ycGhhbmVkKSB7XG4gICAgICBhdHRycy5wdXNoKCdvcnBoYW5lZD1cInRydWVcIicpO1xuICAgIH0gZWxzZSB7XG4gICAgICBhdHRycy5wdXNoKGBicmFuY2g9XCIke2dyb3VwLmJyYW5jaE5hbWV9XCJgKTtcbiAgICAgIGlmIChncm91cC5wYXJlbnRCcmFuY2gpIGF0dHJzLnB1c2goYHBhcmVudEJyYW5jaD1cIiR7Z3JvdXAucGFyZW50QnJhbmNofVwiYCk7XG4gICAgfVxuICAgIGF0dHJzLnB1c2goYGNvdW50PVwiJHtncm91cC5zaGFzLmxlbmd0aH1cImApO1xuXG4gICAgYmxvY2tzLnB1c2goYDx3b3Jrc3BhY2UtcmVwby1sb2cgJHthdHRycy5qb2luKCcgJyl9PlxcbiR7Ym9keVBhcnRzLmpvaW4oJ1xcbicpfVxcbjwvd29ya3NwYWNlLXJlcG8tbG9nPmApO1xuICB9XG5cbiAgcmV0dXJuIGJsb2Nrcztcbn1cblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gQ29tYmluZWQgY29udGV4dFxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4vKipcbiAqIEJ1aWxkcyB0aGUgY29tYmluZWQgYWRkaXRpb25hbCBjb250ZXh0IHN0cmluZyBmb3Igc2Vzc2lvbiBhbmQgc3ViYWdlbnQgaG9va3MuXG4gKlxuICogUHJvZHVjZXMgWE1MIGJsb2NrczogYDxjYXJkPmAgKGlkZW50aXR5ICsgZ2F0ZXMgKyBlbnYpLCBgPGNhcmQtcmVwbz5gXG4gKiAoZGlyZWN0b3J5IHN1bW1hcnkpLCBvcHRpb25hbGx5IGA8Y2FyZC1yZXBvLWxvZz5gIChyZWNlbnQgY2FyZCByZXBvIGNvbW1pdHMpLFxuICogYW5kIG9wdGlvbmFsbHkgYDx3b3Jrc3BhY2UtcmVwby1sb2c+YCBibG9ja3MgKHdvcmtzcGFjZSBjb21taXRzIHBlciBicmFuY2gpLlxuICogTGV0IHtAbGluayBDYXJkUmVwb0FjY2Vzc0Vycm9yfSBwcm9wYWdhdGUgdG8gdGhlIGNhbGxlciBmb3Igc3RydWN0dXJlZFxuICogZXJyb3IgaGFuZGxpbmcuXG4gKlxuICogQHBhcmFtIGFjdGlvbklucHV0IC0gUGFyc2VkIGFjdGlvbiBpbnB1dCBmcm9tIHRoZSBlbnZpcm9ubWVudC5cbiAqIEByZXR1cm5zIENvbWJpbmVkIGNvbnRleHQgc3RyaW5nIHdpdGggWE1MIGJsb2Nrcy5cbiAqIEB0aHJvd3Mge0NhcmRSZXBvQWNjZXNzRXJyb3J9IFdoZW4gdGhlIGNhcmQgcmVwb3NpdG9yeSBjYW5ub3QgYmUgcmVhZC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGJ1aWxkQWRkaXRpb25hbENvbnRleHQoYWN0aW9uSW5wdXQ6IEFjdGlvbklucHV0KTogc3RyaW5nIHtcbiAgY29uc3QgY2FyZEJsb2NrID0gYnVpbGRDYXJkQmxvY2soYWN0aW9uSW5wdXQpO1xuICBjb25zdCByZXBvQmxvY2sgPSBidWlsZENhcmRSZXBvQmxvY2soYWN0aW9uSW5wdXQuY2FyZFJlcG9QYXRoKTtcbiAgY29uc3QgbG9nQmxvY2sgPSBidWlsZENhcmRSZXBvTG9nQmxvY2soYWN0aW9uSW5wdXQuY2FyZFJlcG9QYXRoKTtcbiAgY29uc3Qgd29ya3NwYWNlTG9nQmxvY2tzID0gYnVpbGRXb3Jrc3BhY2VSZXBvTG9nQmxvY2tzKGFjdGlvbklucHV0LnJlcG9Sb290LCBhY3Rpb25JbnB1dC5jYXJkUmVwb1BhdGgpO1xuXG4gIGNvbnN0IHBhcnRzID0gW2NhcmRCbG9jaywgcmVwb0Jsb2NrXTtcbiAgaWYgKGxvZ0Jsb2NrKSBwYXJ0cy5wdXNoKGxvZ0Jsb2NrKTtcbiAgcGFydHMucHVzaCguLi53b3Jrc3BhY2VMb2dCbG9ja3MpO1xuICByZXR1cm4gcGFydHMuam9pbignXFxuXFxuJyk7XG59XG4iLCAiLyoqXG4gKiBCcmFuY2ggYW5kIHdvcmt0cmVlIHRyYWNraW5nIHR5cGVzIGZvciBDYXJkcyBWMiB3b3Jrc3BhY2UgaW50ZWdyYXRpb24uXG4gKlxuICogVGhlc2UgdHlwZXMgc3VwcG9ydCB0cmFja2luZyBHaXQgYnJhbmNoZXMgYW5kIHRoZWlyIGFzc29jaWF0ZWQgd29ya3RyZWVzIHdpdGhpblxuICogYSBjYXJkJ3Mgd29ya3NwYWNlLiBCcmFuY2ggbWV0YWRhdGEgaXMgcGVyc2lzdGVkIGluIHNlcGFyYXRlIHdvcmtzcGFjZS1icmFuY2hlcy5qc29uXG4gKiBhbmQgd29ya3NwYWNlLWNvbW1pdHMuY3N2IGZpbGVzLCB0cmFja2VkIHdpdGggc3RhdGljIG1ldGFkYXRhIChicmFuY2ggbmFtZSwgd29ya3RyZWUgcGF0aCxcbiAqIGFkZGVkQXQgdGltZXN0YW1wKSBhbmQgZGVyaXZlZCBmaWVsZHMgY29tcHV0ZWQgYXQgcmVhZCB0aW1lIChleGlzdHMsIGlzTWVyZ2VkLCBjb21taXRzKS5cbiAqXG4gKiBUaGUgYnJhbmNoIEFQSSAoYEdFVCAvY2FyZHMvOmlkL2JyYW5jaGVzYCwgYFBPU1QgL2NhcmRzLzppZC9icmFuY2hlc2ApIHVzZXNcbiAqIHRoZXNlIHR5cGVzIHRvIGV4cG9zZSB3b3Jrc3BhY2UgdHJhY2tpbmcgc3RhdGUgdG8gY2xpZW50cyBhbmQgZW5hYmxlIGJyYW5jaFxuICogYXNzb2NpYXRpb24gd2l0aCBjYXJkcy5cbiAqXG4gKiBAc3VtbWFyeSBCcmFuY2ggYW5kIHdvcmt0cmVlIHRyYWNraW5nIHR5cGVzIGZvciBDYXJkcyBWMiB3b3Jrc3BhY2UgaW50ZWdyYXRpb25cbiAqIEBtb2R1bGUgdHlwZXMvYnJhbmNoXG4gKi9cblxuaW1wb3J0IHR5cGUgeyBDb21taXREZXRhaWxzIH0gZnJvbSAnLi90aW1lbGluZS5qcyc7XG5cbi8qKlxuICogV2VsbC1rbm93biBTSEEgZm9yIGFuIGVtcHR5IGdpdCB0cmVlLlxuICpcbiAqIFRoaXMgaXMgYSBkZXRlcm1pbmlzdGljIHZhbHVlIHByb2R1Y2VkIGJ5IGBnaXQgaGFzaC1vYmplY3QgLXQgdHJlZSAvZGV2L251bGxgXG4gKiBhbmQgbmV2ZXIgY2hhbmdlcyBhY3Jvc3MgZ2l0IHZlcnNpb25zLiBVc2VkIGFzIHRoZSBkaWZmIGJhc2Ugd2hlbiBjb21wYXJpbmdcbiAqIGFnYWluc3QgYSBzdGF0ZSB3aXRoIG5vIHByaW9yIGNvbW1pdHMuXG4gKi9cbmV4cG9ydCBjb25zdCBFTVBUWV9UUkVFX1NIQSA9ICc0YjgyNWRjNjQyY2I2ZWI5YTA2MGU1NGJmOGQ2OTI4OGZiZWU0OTA0JztcblxuZXhwb3J0IGNvbnN0IFdPUktTUEFDRV9CUkFOQ0hFU19GSUxFID0gJ3dvcmtzcGFjZS1icmFuY2hlcy5qc29uJztcbmV4cG9ydCBjb25zdCBXT1JLU1BBQ0VfQ09NTUlUU19GSUxFID0gJ3dvcmtzcGFjZS1jb21taXRzLmNzdic7XG5cbi8qKlxuICogQSBzaW5nbGUgdHJhY2tlZCBicmFuY2ggd2l0aGluIGEgY2FyZCdzIHdvcmtzcGFjZSBibG9jay5cbiAqXG4gKiBUaGlzIGlzIHRoZSBtaW5pbWFsIG1ldGFkYXRhIHBlcnNpc3RlZCBmb3IgZWFjaCBicmFuY2ggaW4gd29ya3NwYWNlLWJyYW5jaGVzLmpzb24uXG4gKiBUaGUgd29ya3RyZWUgcGF0aCBpcyBvcHRpb25hbCBhbmQgbWFjaGluZS1zcGVjaWZpYzsgaXQgbWF5IGJlY29tZSBzdGFsZSBpZlxuICogdGhlIHdvcmt0cmVlIGlzIG1vdmVkIG9yIGRlbGV0ZWQgb3V0c2lkZSBvZiB0aGUgY2FyZHMgc3lzdGVtLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIFdvcmtzcGFjZUJyYW5jaCB7XG4gIC8qKlxuICAgKiBPcHRpb25hbCBhYnNvbHV0ZSBwYXRoIHRvIHdvcmt0cmVlIGRpcmVjdG9yeSAobWFjaGluZS1zcGVjaWZpYywgbWF5IGJlIHN0YWxlKS5cbiAgICogVGhpcyBwYXRoIGlzIGFkdmlzb3J5IG9ubHkgYW5kIHNob3VsZCBiZSB2YWxpZGF0ZWQgYmVmb3JlIHVzZS5cbiAgICovXG4gIHdvcmt0cmVlPzogc3RyaW5nO1xuXG4gIC8qKlxuICAgKiBOYW1lIG9mIHRoZSBicmFuY2ggdGhpcyB3YXMgY3JlYXRlZCBmcm9tIChlLmcuLCAnbWFpbicsICdtYXN0ZXInKS5cbiAgICogVXNlZCBhcyB0aGUgYmFzZSByZWYgZm9yIGNvbXBhcmlzb25zLCBmYXN0LWZvcndhcmQgZGV0ZWN0aW9uLCBhbmQgcmViYXNlIHRhcmdldGluZy5cbiAgICovXG4gIHBhcmVudEJyYW5jaDogc3RyaW5nO1xuXG4gIC8qKlxuICAgKiBJU08gODYwMSB0aW1lc3RhbXAgd2hlbiBicmFuY2ggd2FzIGFkZGVkIHRvIHRoZSBjYXJkLlxuICAgKiBVc2VkIGZvciBjaHJvbm9sb2dpY2FsIHNvcnRpbmcgYW5kIGF1ZGl0IHRyYWlscy5cbiAgICovXG4gIGFkZGVkQXQ6IHN0cmluZztcbn1cblxuLyoqXG4gKiBCcmFuY2ggaW5mbyByZXR1cm5lZCBieSBHRVQgL2NhcmRzLzppZC9icmFuY2hlcyAoaW5jbHVkZXMgY29tcHV0ZWQgZmllbGRzKS5cbiAqXG4gKiBUaGlzIHR5cGUgZXh0ZW5kcyB0aGUgcGVyc2lzdGVkIFdvcmtzcGFjZUJyYW5jaCBkYXRhIHdpdGggcnVudGltZS1jb21wdXRlZFxuICogZmllbGRzIHRoYXQgcmVmbGVjdCB0aGUgY3VycmVudCBHaXQgcmVwb3NpdG9yeSBzdGF0ZS4gQ29tcHV0ZWQgZmllbGRzIGFyZVxuICogbmV2ZXIgcGVyc2lzdGVkLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIEJyYW5jaEluZm8ge1xuICAvKipcbiAgICogQnJhbmNoIG5hbWUgKG1heSBjb250YWluIHNsYXNoZXMsIGUuZy4sIFwiZmVhdHVyZS9hdXRoXCIpLlxuICAgKiBUaGlzIGlzIHRoZSBHaXQgcmVmIG5hbWUsIG5vdCBhIGZpbGVzeXN0ZW0gcGF0aC5cbiAgICovXG4gIG5hbWU6IHN0cmluZztcblxuICAvKipcbiAgICogT3B0aW9uYWwgd29ya3RyZWUgcGF0aCBhc3NvY2lhdGVkIHdpdGggdGhpcyBicmFuY2guXG4gICAqIENvcGllZCBmcm9tIFdvcmtzcGFjZUJyYW5jaC53b3JrdHJlZSBpZiBwcmVzZW50LlxuICAgKi9cbiAgd29ya3RyZWU/OiBzdHJpbmc7XG5cbiAgLyoqXG4gICAqIFBhcmVudCBicmFuY2ggbmFtZSBmcm9tIHdoaWNoIHRoaXMgYnJhbmNoIHdhcyBjcmVhdGVkIChlLmcuLCAnbWFpbicsICdtYXN0ZXInKS5cbiAgICogVXNlZCBhcyB0aGUgYmFzZSByZWYgZm9yIGNvbXBhcmlzb25zLlxuICAgKi9cbiAgcGFyZW50QnJhbmNoOiBzdHJpbmc7XG5cbiAgLyoqXG4gICAqIElTTyA4NjAxIHRpbWVzdGFtcCB3aGVuIGJyYW5jaCB3YXMgYWRkZWQuXG4gICAqIENvcGllZCBmcm9tIFdvcmtzcGFjZUJyYW5jaC5hZGRlZEF0LlxuICAgKi9cbiAgYWRkZWRBdDogc3RyaW5nO1xuXG4gIC8qKlxuICAgKiBXaGV0aGVyIHRoZSBicmFuY2ggc3RpbGwgZXhpc3RzIGluIGdpdCAoY29tcHV0ZWQgYXQgcmVhZCB0aW1lKS5cbiAgICogRmFsc2UgaWYgdGhlIGJyYW5jaCByZWYgaGFzIGJlZW4gZGVsZXRlZC5cbiAgICovXG4gIGV4aXN0cz86IGJvb2xlYW47XG5cbiAgLyoqXG4gICAqIFdoZXRoZXIgdGhlIGJyYW5jaCB0aXAgaXMgbWVyZ2VkIGludG8gcmVxdWVzdGluZyB3b3Jrc3BhY2UgSEVBRC5cbiAgICogQ29tcHV0ZWQgYXQgcmVhZCB0aW1lLCBuZXZlciBzdG9yZWQuIE9ubHkgbWVhbmluZ2Z1bCB3aGVuIGV4aXN0cz10cnVlLlxuICAgKi9cbiAgaXNNZXJnZWQ/OiBib29sZWFuO1xuXG4gIC8qKlxuICAgKiBDb21taXQgU0hBcyByZWFjaGFibGUgZnJvbSB0aGlzIGJyYW5jaCBidXQgbm90IGZyb20gSEVBRCAoY29tcHV0ZWQgYXQgcmVhZCB0aW1lKS5cbiAgICogRW1wdHkgYXJyYXkgaWYgYnJhbmNoIGlzIGZ1bGx5IG1lcmdlZCBvciBkb2VzIG5vdCBleGlzdC5cbiAgICovXG4gIGNvbW1pdHM/OiBzdHJpbmdbXTtcbn1cblxuLyoqXG4gKiBSZXNwb25zZSBzaGFwZSBmb3IgR0VUIC9jYXJkcy86aWQvYnJhbmNoZXMuXG4gKlxuICogUmV0dXJucyBhbGwgdHJhY2tlZCBicmFuY2hlcyBmb3IgYSBjYXJkIHdpdGggY29tcHV0ZWQgcnVudGltZSBmaWVsZHMuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgQnJhbmNoZXNSZXNwb25zZSB7XG4gIC8qKlxuICAgKiBMaXN0IG9mIHRyYWNrZWQgYnJhbmNoZXMgd2l0aCBjb21wdXRlZCBmaWVsZHMuXG4gICAqIFNvcnRlZCBieSBhZGRlZEF0IHRpbWVzdGFtcCAob2xkZXN0IGZpcnN0KS5cbiAgICovXG4gIGJyYW5jaGVzOiBCcmFuY2hJbmZvW107XG5cbiAgLyoqXG4gICAqIEFsbCBjYXJkLWxldmVsIGNvbW1pdCBTSEFzIGZyb20gd29ya3NwYWNlLWNvbW1pdHMuY3N2LlxuICAgKiBQcmVzZW50IHJlZ2FyZGxlc3Mgb2YgYnJhbmNoIHN0YXRlLCBzbyB0aGUgVUkgY2FuIHNob3cgY2hhbmdlc1xuICAgKiBldmVuIGFmdGVyIGFsbCB0cmFja2VkIGJyYW5jaGVzIGhhdmUgYmVlbiByZW1vdmVkLlxuICAgKi9cbiAgY29tbWl0czogc3RyaW5nW107XG5cbiAgLyoqXG4gICAqIERlZmF1bHQgYnJhbmNoIG9mIHRoZSB3b3Jrc3BhY2UgcmVwb3NpdG9yeSAoZS5nLiwgJ21haW4nLCAnbWFzdGVyJykuXG4gICAqIERldGVjdGVkIGZyb20gYHJlZnMvcmVtb3Rlcy9vcmlnaW4vSEVBRGAsIGZhbGxpbmcgYmFjayB0byBjdXJyZW50IEhFQUQgYnJhbmNoLlxuICAgKiBVc2VkIGFzIHRoZSBiYXNlIHJlZiBmb3IgY2FyZC1sZXZlbCBjb21taXRzIHdoZW4gbm8gdHJhY2tlZCBicmFuY2hlcyByZW1haW4uXG4gICAqL1xuICBkZWZhdWx0QnJhbmNoOiBzdHJpbmc7XG5cbiAgLyoqXG4gICAqIFNIQXMgb2YgY2FyZCBjb21taXRzIHRoYXQgYXJlIGFuY2VzdG9ycyBvZiBIRUFEIGF0IHRoZSByZXF1ZXN0aW5nIHdvcmtzcGFjZS5cbiAgICogRW1wdHkgYXJyYXkgd2hlbiB3b3Jrc3BhY2VQYXRoIGlzIG5vdCBwcm92aWRlZCBvciBnaXQgb3BlcmF0aW9ucyBmYWlsIGdyYWNlZnVsbHkuXG4gICAqL1xuICBtZXJnZWRDb21taXRzOiBzdHJpbmdbXTtcblxuICAvKipcbiAgICogQnJhbmNoIG5hbWUgY2hlY2tlZCBvdXQgYXQgdGhlIHJlcXVlc3Rpbmcgd29ya3NwYWNlIChlLmcuLCBcIm1haW5cIiwgXCJmZWF0dXJlLWF1dGhcIikuXG4gICAqIFwiSEVBRFwiIHdoZW4gaW4gZGV0YWNoZWQgSEVBRCBzdGF0ZS5cbiAgICogRW1wdHkgc3RyaW5nIHdoZW4gd29ya3NwYWNlUGF0aCBpcyBub3QgcHJvdmlkZWQgb3IgZ2l0IG9wZXJhdGlvbnMgZmFpbCBncmFjZWZ1bGx5LlxuICAgKi9cbiAgaGVhZEJyYW5jaDogc3RyaW5nO1xuXG4gIC8qKlxuICAgKiBDb21taXQgZGV0YWlscyBrZXllZCBieSBTSEEgZm9yIGVhY2ggZW50cnkgaW4gYGNvbW1pdHNgLlxuICAgKiBFbXB0eSB3aGVuIHRoZXJlIGFyZSBubyBjb21taXRzLiBPbmx5IGFic2VudCB3aGVuIGB3b3Jrc3BhY2VQYXRoYCB3YXMgbm90IHByb3ZpZGVkXG4gICAqIChpLmUuIHRoZSByZWluZGV4IHBhdGggXHUyMDE0IGBjb21taXREZXRhaWxzYCBpcyBkZWxpdmVyZWQgc2VwYXJhdGVseSB2aWEgYFdvcmtzcGFjZUNvbW1pdEV2ZW50YCkuXG4gICAqL1xuICBjb21taXREZXRhaWxzPzogUmVjb3JkPHN0cmluZywgQ29tbWl0RGV0YWlscz47XG59XG5cbi8qKlxuICogUmVxdWVzdCBib2R5IGZvciBQT1NUIC9jYXJkcy86aWQvYnJhbmNoZXMuXG4gKlxuICogVXNlZCB0byBhZGQgYSBuZXcgYnJhbmNoIHRvIGEgY2FyZCdzIHdvcmtzcGFjZSB0cmFja2luZyBibG9jay5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBBZGRCcmFuY2hSZXF1ZXN0IHtcbiAgLyoqXG4gICAqIEJyYW5jaCBuYW1lIHRvIHRyYWNrLlxuICAgKiBNdXN0IGJlIGEgdmFsaWQgR2l0IHJlZiBuYW1lIChtYXkgY29udGFpbiBzbGFzaGVzKS5cbiAgICovXG4gIG5hbWU6IHN0cmluZztcblxuICAvKipcbiAgICogT3B0aW9uYWwgd29ya3RyZWUgcGF0aC5cbiAgICogU2hvdWxkIGJlIGFuIGFic29sdXRlIHBhdGggdG8gYSB2YWxpZCB3b3JrdHJlZSBkaXJlY3RvcnkuXG4gICAqL1xuICB3b3JrdHJlZT86IHN0cmluZztcblxuICAvKipcbiAgICogUGFyZW50IGJyYW5jaCBuYW1lIGZyb20gd2hpY2ggdGhpcyBicmFuY2ggd2FzIGNyZWF0ZWQgKGUuZy4sICdtYWluJywgJ21hc3RlcicpLlxuICAgKiBVc2VkIGFzIHRoZSBiYXNlIHJlZiBmb3IgY29tcGFyaXNvbnMuXG4gICAqL1xuICBwYXJlbnRCcmFuY2g6IHN0cmluZztcbn1cbiIsICIvKipcbiAqIFRyZWUtZm9ybWF0dGVkIHJlbmRlcmluZyBmb3IgZmlsZSBwYXRoIGxpc3RzLlxuICpcbiAqIEJ1aWxkcyBhIHRyaWUgZnJvbSBmaWxlIHBhdGhzLCBjb2xsYXBzZXMgc2luZ2xlLWNoaWxkIGRpcmVjdG9yeSBjaGFpbnMsXG4gKiBhbmQgcmVuZGVycyBhbiBpbmRlbnRlZCB0cmVlIHRoYXQgY29tcHJlc3NlcyBzaGFyZWQgcHJlZml4ZXMuXG4gKlxuICogQHN1bW1hcnkgUHJlZml4LWNvbXByZXNzZWQgZmlsZSB0cmVlIHJlbmRlcmluZ1xuICovXG5cbi8qKiBJbnRlcm5hbCB0cmllIG5vZGUgZm9yIGJ1aWxkaW5nIHRoZSBmaWxlIHRyZWUuICovXG5pbnRlcmZhY2UgVHJpZU5vZGUge1xuICBjaGlsZHJlbjogTWFwPHN0cmluZywgVHJpZU5vZGU+O1xuICBpc0ZpbGU6IGJvb2xlYW47XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZU5vZGUoKTogVHJpZU5vZGUge1xuICByZXR1cm4geyBjaGlsZHJlbjogbmV3IE1hcCgpLCBpc0ZpbGU6IGZhbHNlIH07XG59XG5cbi8qKlxuICogSW5zZXJ0cyBhIHBhdGggaW50byB0aGUgdHJpZSwgc3BsaXR0aW5nIG9uIGAvYC5cbiAqXG4gKiBAcGFyYW0gcm9vdCAtIFJvb3QgdHJpZSBub2RlLlxuICogQHBhcmFtIHBhdGggLSBGaWxlIHBhdGggdG8gaW5zZXJ0LlxuICovXG5mdW5jdGlvbiBpbnNlcnRQYXRoKHJvb3Q6IFRyaWVOb2RlLCBwYXRoOiBzdHJpbmcpOiB2b2lkIHtcbiAgbGV0IG5vZGUgPSByb290O1xuICBjb25zdCBzZWdtZW50cyA9IHBhdGguc3BsaXQoJy8nKTtcbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBzZWdtZW50cy5sZW5ndGg7IGkrKykge1xuICAgIGNvbnN0IHNlZyA9IHNlZ21lbnRzW2ldITtcbiAgICBsZXQgY2hpbGQgPSBub2RlLmNoaWxkcmVuLmdldChzZWcpO1xuICAgIGlmICghY2hpbGQpIHtcbiAgICAgIGNoaWxkID0gY3JlYXRlTm9kZSgpO1xuICAgICAgbm9kZS5jaGlsZHJlbi5zZXQoc2VnLCBjaGlsZCk7XG4gICAgfVxuICAgIG5vZGUgPSBjaGlsZDtcbiAgfVxuICBub2RlLmlzRmlsZSA9IHRydWU7XG59XG5cbi8qKlxuICogUmVuZGVycyB0aGUgdHJpZSBhcyBhbiBpbmRlbnRlZCB0cmVlIHN0cmluZy5cbiAqXG4gKiBTaW5nbGUtY2hpbGQgZGlyZWN0b3J5IGNoYWlucyBhcmUgY29sbGFwc2VkOiBgc3JjL2AgXHUyMTkyIGBsaWIvYCBcdTIxOTIgYHV0aWxzLnRzYFxuICogYmVjb21lcyBgc3JjL2xpYi91dGlscy50c2Agd2hlbiBlYWNoIGludGVybWVkaWF0ZSBoYXMgZXhhY3RseSBvbmUgY2hpbGQuXG4gKlxuICogRGlyZWN0b3JpZXMgc29ydCBiZWZvcmUgZmlsZXMgYXQgZWFjaCBsZXZlbC4gRW50cmllcyBhcmUgYWxwaGFiZXRpY2FsIHdpdGhpblxuICogZWFjaCBncm91cC5cbiAqXG4gKiBAcGFyYW0gbm9kZSAtIEN1cnJlbnQgdHJpZSBub2RlIHRvIHJlbmRlci5cbiAqIEBwYXJhbSBpbmRlbnQgLSBOdW1iZXIgb2YgbGVhZGluZyBzcGFjZXMgZm9yIHRoaXMgbGV2ZWwuXG4gKiBAcmV0dXJucyBSZW5kZXJlZCB0cmVlIGxpbmVzIGpvaW5lZCBieSBuZXdsaW5lcy5cbiAqL1xuZnVuY3Rpb24gcmVuZGVyTm9kZShub2RlOiBUcmllTm9kZSwgaW5kZW50OiBudW1iZXIpOiBzdHJpbmcge1xuICBjb25zdCBsaW5lczogc3RyaW5nW10gPSBbXTtcbiAgY29uc3QgcHJlZml4ID0gJyAnLnJlcGVhdChpbmRlbnQpO1xuXG4gIC8vIFNlcGFyYXRlIGNoaWxkcmVuIGludG8gZGlyZWN0b3JpZXMgYW5kIGZpbGVzXG4gIGNvbnN0IGRpcnM6IFtzdHJpbmcsIFRyaWVOb2RlXVtdID0gW107XG4gIGNvbnN0IGZpbGVzOiBbc3RyaW5nLCBUcmllTm9kZV1bXSA9IFtdO1xuXG4gIGZvciAoY29uc3QgW25hbWUsIGNoaWxkXSBvZiBub2RlLmNoaWxkcmVuKSB7XG4gICAgaWYgKGNoaWxkLmlzRmlsZSAmJiBjaGlsZC5jaGlsZHJlbi5zaXplID09PSAwKSB7XG4gICAgICBmaWxlcy5wdXNoKFtuYW1lLCBjaGlsZF0pO1xuICAgIH0gZWxzZSBpZiAoY2hpbGQuaXNGaWxlICYmIGNoaWxkLmNoaWxkcmVuLnNpemUgPiAwKSB7XG4gICAgICAvLyBBIHBhdGggc2VnbWVudCB0aGF0IGlzIGJvdGggYSBmaWxlIGFuZCBoYXMgY2hpbGRyZW4gXHUyMDE0IHRyZWF0IGFzIGZpbGVcbiAgICAgIC8vIGZvciBpdHMgb3duIGVudHJ5LCB0aGVuIHJlbmRlciBjaGlsZHJlbiBzZXBhcmF0ZWx5LlxuICAgICAgZmlsZXMucHVzaChbbmFtZSwgY3JlYXRlTm9kZSgpXSk7IC8vIGZpbGUgZW50cnlcbiAgICAgIGRpcnMucHVzaChbbmFtZSwgY2hpbGRdKTsgLy8gZGlyZWN0b3J5IGVudHJ5IHdpdGggY2hpbGRyZW5cbiAgICB9IGVsc2Uge1xuICAgICAgZGlycy5wdXNoKFtuYW1lLCBjaGlsZF0pO1xuICAgIH1cbiAgfVxuXG4gIGRpcnMuc29ydCgoW2FdLCBbYl0pID0+IGEubG9jYWxlQ29tcGFyZShiKSk7XG4gIGZpbGVzLnNvcnQoKFthXSwgW2JdKSA9PiBhLmxvY2FsZUNvbXBhcmUoYikpO1xuXG4gIGZvciAoY29uc3QgW25hbWUsIGNoaWxkXSBvZiBkaXJzKSB7XG4gICAgLy8gQ29sbGFwc2Ugc2luZ2xlLWNoaWxkIGRpcmVjdG9yeSBjaGFpbnNcbiAgICBsZXQgY29sbGFwc2VkID0gbmFtZTtcbiAgICBsZXQgY3VycmVudCA9IGNoaWxkO1xuICAgIHdoaWxlIChjdXJyZW50LmNoaWxkcmVuLnNpemUgPT09IDEgJiYgIWN1cnJlbnQuaXNGaWxlKSB7XG4gICAgICBjb25zdCBbbmV4dE5hbWUsIG5leHRDaGlsZF0gPSBjdXJyZW50LmNoaWxkcmVuLmVudHJpZXMoKS5uZXh0KCkudmFsdWUgYXMgW3N0cmluZywgVHJpZU5vZGVdO1xuICAgICAgY29sbGFwc2VkICs9IGAvJHtuZXh0TmFtZX1gO1xuICAgICAgY3VycmVudCA9IG5leHRDaGlsZDtcbiAgICB9XG5cbiAgICBpZiAoY3VycmVudC5pc0ZpbGUgJiYgY3VycmVudC5jaGlsZHJlbi5zaXplID09PSAwKSB7XG4gICAgICAvLyBFbnRpcmUgY2hhaW4gY29sbGFwc2VkIHRvIGEgc2luZ2xlIGZpbGUgcGF0aFxuICAgICAgbGluZXMucHVzaChgJHtwcmVmaXh9JHtjb2xsYXBzZWR9YCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIERpcmVjdG9yeSBub2RlIFx1MjAxNCByZW5kZXIgd2l0aCB0cmFpbGluZyBzbGFzaCwgdGhlbiBjaGlsZHJlblxuICAgICAgbGluZXMucHVzaChgJHtwcmVmaXh9JHtjb2xsYXBzZWR9L2ApO1xuICAgICAgbGluZXMucHVzaChyZW5kZXJOb2RlKGN1cnJlbnQsIGluZGVudCArIDIpKTtcbiAgICB9XG4gIH1cblxuICBmb3IgKGNvbnN0IFtuYW1lXSBvZiBmaWxlcykge1xuICAgIGxpbmVzLnB1c2goYCR7cHJlZml4fSR7bmFtZX1gKTtcbiAgfVxuXG4gIHJldHVybiBsaW5lcy5maWx0ZXIoQm9vbGVhbikuam9pbignXFxuJyk7XG59XG5cbi8qKlxuICogUmVuZGVycyBhIGxpc3Qgb2YgZmlsZSBwYXRocyBhcyBhIHByZWZpeC1jb21wcmVzc2VkIGluZGVudGVkIHRyZWUuXG4gKlxuICogU2luZ2xlLWNoaWxkIGRpcmVjdG9yeSBjaGFpbnMgYXJlIGNvbGxhcHNlZCBpbnRvIGNvbWJpbmVkIHNlZ21lbnRzXG4gKiAoZS5nLiwgYHNyYy9saWIvYCBhcyBvbmUgbm9kZSkuIExlYWYgZmlsZXMgYWx3YXlzIGFwcGVhciBhcyBpbmRpdmlkdWFsIGVudHJpZXMuXG4gKlxuICogQHBhcmFtIHBhdGhzIC0gRmxhdCBmaWxlIHBhdGhzIChlLmcuLCBmcm9tIGBnaXQgbG9nIC0tbmFtZS1vbmx5YCkuXG4gKiBAcmV0dXJucyBJbmRlbnRlZCB0cmVlIHN0cmluZywgb3IgZW1wdHkgc3RyaW5nIGlmIHBhdGhzIGlzIGVtcHR5LlxuICovXG5leHBvcnQgZnVuY3Rpb24gZm9ybWF0RmlsZVRyZWUocGF0aHM6IHN0cmluZ1tdKTogc3RyaW5nIHtcbiAgaWYgKHBhdGhzLmxlbmd0aCA9PT0gMCkgcmV0dXJuICcnO1xuXG4gIGNvbnN0IHJvb3QgPSBjcmVhdGVOb2RlKCk7XG4gIGZvciAoY29uc3QgcCBvZiBwYXRocykge1xuICAgIGlmIChwKSBpbnNlcnRQYXRoKHJvb3QsIHApO1xuICB9XG5cbiAgcmV0dXJuIHJlbmRlck5vZGUocm9vdCwgMSk7XG59XG5cbi8qKlxuICogUGFyc2VzIHJhdyBgZ2l0IGxvZyAtLW5hbWUtb25seWAgb3V0cHV0IGludG8gcGVyLWNvbW1pdCBibG9ja3MsIGFwcGxpZXNcbiAqIHRyZWUgZm9ybWF0dGluZyB0byBlYWNoIGNvbW1pdCdzIGZpbGUgbGlzdCwgYW5kIHJlYXNzZW1ibGVzLlxuICpcbiAqIEhhbmRsZXMgdHdvIHNlcGFyYXRvciBjb252ZW50aW9uczpcbiAqIC0gTlVMLWRlbGltaXRlZCAoYCV4MDBgIGluIGAtLXByZXR0eT1mb3JtYXRgKTogdXNlZCBieSBgYnVpbGRDYXJkUmVwb0xvZ0Jsb2NrYFxuICogLSBCbGFuay1saW5lLWRlbGltaXRlZDogdXNlZCBieSBgLS1uby13YWxrYCBpbiBgcmVzb2x2ZVdvcmtzcGFjZUNvbW1pdERldGFpbHNgIGFuZCB0aGUgc3RvcCBob29rXG4gKlxuICogQHBhcmFtIHJhd0xvZyAtIFJhdyBnaXQgbG9nIG91dHB1dCB3aXRoIGAtLW5hbWUtb25seWAuXG4gKiBAcGFyYW0gc2VwYXJhdG9yIC0gSG93IGNvbW1pdHMgYXJlIHNlcGFyYXRlZDogYCdudWwnYCBmb3IgYCV4MDBgLCBgJ2JsYW5rLWxpbmUnYCBmb3IgZG91YmxlIG5ld2xpbmUuXG4gKiBAcmV0dXJucyBGb3JtYXR0ZWQgb3V0cHV0IHdpdGggdHJlZS1yZW5kZXJlZCBmaWxlIGxpc3RzIHBlciBjb21taXQuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBmb3JtYXRDb21taXRMb2cocmF3TG9nOiBzdHJpbmcsIHNlcGFyYXRvcjogJ251bCcgfCAnYmxhbmstbGluZScpOiBzdHJpbmcge1xuICBpZiAoIXJhd0xvZy50cmltKCkpIHJldHVybiAnJztcblxuICBpZiAoc2VwYXJhdG9yID09PSAnbnVsJykge1xuICAgIHJldHVybiBmb3JtYXROdWxEZWxpbWl0ZWQocmF3TG9nKTtcbiAgfVxuICByZXR1cm4gZm9ybWF0QmxhbmtMaW5lRGVsaW1pdGVkKHJhd0xvZyk7XG59XG5cbi8qKlxuICogTlVMLWRlbGltaXRlZCBmb3JtYXQ6IGAleDAwaGVhZGVyXFxuXFxuZmlsZTFcXG5maWxlMlxceDAwaGVhZGVyMlxcblxcbmZpbGUzYFxuICpcbiAqIFRoZSBmaXJzdCBOVUwgbWF5IGJlIGF0IHBvc2l0aW9uIDAgKGxlYWRpbmcpLCBzbyB3ZSBmaWx0ZXIgZW1wdHkgc3BsaXRzLlxuICpcbiAqIEBwYXJhbSByYXcgLSBSYXcgTlVMLWRlbGltaXRlZCBnaXQgbG9nIG91dHB1dC5cbiAqIEByZXR1cm5zIEZvcm1hdHRlZCBvdXRwdXQgd2l0aCB0cmVlLXJlbmRlcmVkIGZpbGUgbGlzdHMuXG4gKi9cbmZ1bmN0aW9uIGZvcm1hdE51bERlbGltaXRlZChyYXc6IHN0cmluZyk6IHN0cmluZyB7XG4gIGNvbnN0IGNvbW1pdHMgPSByYXcuc3BsaXQoJ1xcMCcpLmZpbHRlcigocykgPT4gcy50cmltKCkpO1xuICByZXR1cm4gY29tbWl0cy5tYXAoKGNvbW1pdCkgPT4gZm9ybWF0U2luZ2xlQ29tbWl0KGNvbW1pdC50cmltKCkpKS5qb2luKCdcXG5cXG4nKTtcbn1cblxuLyoqXG4gKiBCbGFuay1saW5lLWRlbGltaXRlZCBmb3JtYXQ6IGNvbW1pdHMgc2VwYXJhdGVkIGJ5IGBcXG5cXG5gIHdoZXJlIHRoZSBzZWNvbmRcbiAqIGJsb2NrIHN0YXJ0cyB3aXRoIGEgc2hvcnQgaGFzaCBsaW5lLlxuICpcbiAqIFdpdGhpbiBhIHNpbmdsZSBjb21taXQsIGAtLW5hbWUtb25seWAgYWxzbyBwdXRzIGEgYmxhbmsgbGluZSBiZXR3ZWVuIHRoZVxuICogaGVhZGVyIGFuZCB0aGUgZmlsZSBsaXN0LiBXZSBkaXN0aW5ndWlzaCBpbnRyYS1jb21taXQgYmxhbmsgbGluZXMgZnJvbVxuICogaW50ZXItY29tbWl0IGJsYW5rIGxpbmVzIGJ5IGNoZWNraW5nIHdoZXRoZXIgdGhlIGxpbmUgYWZ0ZXIgdGhlIGJsYW5rIGxpbmVcbiAqIGxvb2tzIGxpa2UgYSBjb21taXQgaGVhZGVyIChzaG9ydCBoYXNoIHBhdHRlcm4pLlxuICpcbiAqIEBwYXJhbSByYXcgLSBSYXcgYmxhbmstbGluZS1kZWxpbWl0ZWQgZ2l0IGxvZyBvdXRwdXQuXG4gKiBAcmV0dXJucyBGb3JtYXR0ZWQgb3V0cHV0IHdpdGggdHJlZS1yZW5kZXJlZCBmaWxlIGxpc3RzLlxuICovXG5mdW5jdGlvbiBmb3JtYXRCbGFua0xpbmVEZWxpbWl0ZWQocmF3OiBzdHJpbmcpOiBzdHJpbmcge1xuICBjb25zdCBsaW5lcyA9IHJhdy5zcGxpdCgnXFxuJyk7XG4gIGNvbnN0IGNvbW1pdEJsb2Nrczogc3RyaW5nW11bXSA9IFtdO1xuICBsZXQgY3VycmVudDogc3RyaW5nW10gPSBbXTtcblxuICBmb3IgKGxldCBpID0gMDsgaSA8IGxpbmVzLmxlbmd0aDsgaSsrKSB7XG4gICAgY29uc3QgbGluZSA9IGxpbmVzW2ldITtcblxuICAgIC8vIERldGVjdCBpbnRlci1jb21taXQgYm91bmRhcnk6IGVtcHR5IGxpbmUgZm9sbG93ZWQgYnkgYSBjb21taXQgaGVhZGVyXG4gICAgaWYgKGxpbmUgPT09ICcnICYmIGN1cnJlbnQubGVuZ3RoID4gMCkge1xuICAgICAgY29uc3QgbmV4dCA9IGxpbmVzW2kgKyAxXTtcbiAgICAgIGlmIChuZXh0ICYmIGlzQ29tbWl0SGVhZGVyKG5leHQpKSB7XG4gICAgICAgIGNvbW1pdEJsb2Nrcy5wdXNoKGN1cnJlbnQpO1xuICAgICAgICBjdXJyZW50ID0gW107XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgIH1cblxuICAgIGN1cnJlbnQucHVzaChsaW5lKTtcbiAgfVxuICBpZiAoY3VycmVudC5sZW5ndGggPiAwKSBjb21taXRCbG9ja3MucHVzaChjdXJyZW50KTtcblxuICByZXR1cm4gY29tbWl0QmxvY2tzLm1hcCgoYmxvY2spID0+IGZvcm1hdFNpbmdsZUNvbW1pdChibG9jay5qb2luKCdcXG4nKS50cmltKCkpKS5qb2luKCdcXG5cXG4nKTtcbn1cblxuLyoqXG4gKiBDb21taXQgaGVhZGVycyBmcm9tIGAtLXByZXR0eT1mb3JtYXQ6JWggLSAlc2Agc3RhcnQgd2l0aCBhIHNob3J0IGhleCBoYXNoLlxuICpcbiAqIEBwYXJhbSBsaW5lIC0gTGluZSB0byB0ZXN0LlxuICogQHJldHVybnMgV2hldGhlciB0aGUgbGluZSBtYXRjaGVzIHRoZSBjb21taXQgaGVhZGVyIHBhdHRlcm4uXG4gKi9cbmZ1bmN0aW9uIGlzQ29tbWl0SGVhZGVyKGxpbmU6IHN0cmluZyk6IGJvb2xlYW4ge1xuICByZXR1cm4gL15bMC05YS1mXXs3LH0gLSAvLnRlc3QobGluZSk7XG59XG5cbi8qKlxuICogRm9ybWF0cyBhIHNpbmdsZSBjb21taXQgYmxvY2s6IGhlYWRlciBsaW5lICsgZmlsZSBwYXRocy5cbiAqXG4gKiBUaGUgaGVhZGVyIGlzIHRoZSBmaXJzdCBub24tZW1wdHkgbGluZS4gUmVtYWluaW5nIG5vbi1lbXB0eSBsaW5lcyBhcmUgZmlsZSBwYXRocy5cbiAqXG4gKiBAcGFyYW0gYmxvY2sgLSBSYXcgY29tbWl0IGJsb2NrIHRleHQuXG4gKiBAcmV0dXJucyBIZWFkZXIgZm9sbG93ZWQgYnkgdHJlZS1mb3JtYXR0ZWQgZmlsZSBsaXN0LlxuICovXG5mdW5jdGlvbiBmb3JtYXRTaW5nbGVDb21taXQoYmxvY2s6IHN0cmluZyk6IHN0cmluZyB7XG4gIGNvbnN0IGxpbmVzID0gYmxvY2suc3BsaXQoJ1xcbicpLmZpbHRlcigobCkgPT4gbC50cmltKCkpO1xuICBpZiAobGluZXMubGVuZ3RoID09PSAwKSByZXR1cm4gJyc7XG5cbiAgY29uc3QgaGVhZGVyID0gbGluZXNbMF0hO1xuICBjb25zdCBmaWxlcyA9IGxpbmVzLnNsaWNlKDEpO1xuXG4gIGlmIChmaWxlcy5sZW5ndGggPT09IDApIHJldHVybiBoZWFkZXI7XG5cbiAgY29uc3QgdHJlZSA9IGZvcm1hdEZpbGVUcmVlKGZpbGVzKTtcbiAgcmV0dXJuIHRyZWUgPyBgJHtoZWFkZXJ9XFxuJHt0cmVlfWAgOiBoZWFkZXI7XG59XG4iLCAiLyoqXG4gKiBTdWJhZ2VudFN0YXJ0IGhvb2sgaW1wbGVtZW50YXRpb24uXG4gKlxuICogR2l2ZXMgc3ViYWdlbnRzIGNhcmQgYXdhcmVuZXNzIHZpYSBjb250ZXh0IGluamVjdGlvbiBvbmx5LlxuICogVXNlcyB0aGUgc2hhcmVkIHtAbGluayBidWlsZEFkZGl0aW9uYWxDb250ZXh0fSBmb3IgY29udGV4dC5cbiAqXG4gKiBAc3VtbWFyeSBTdWJhZ2VudFN0YXJ0IGhvb2sgXHUyMDE0IGNhcmQgY29udGV4dCBpbmplY3Rpb24gb25seVxuICogQHNlZSBodHRwczovL2NvZGUuY2xhdWRlLmNvbS9kb2NzL2VuL2hvb2tzI3N1YmFnZW50c3RhcnRcbiAqL1xuXG5pbXBvcnQgeyBleHRyYWN0QWN0aW9uSW5wdXQgfSBmcm9tICdAY2FyZHMvc2RrL2NvbmZpZyc7XG5pbXBvcnQgeyBzdWJhZ2VudFN0YXJ0SG9vaywgc3ViYWdlbnRTdGFydE91dHB1dCB9IGZyb20gJ0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcyc7XG5pbXBvcnQgeyBidWlsZEFkZGl0aW9uYWxDb250ZXh0LCBDYXJkUmVwb0FjY2Vzc0Vycm9yIH0gZnJvbSAnLi9saWIvY29udGV4dC5qcyc7XG5cbmV4cG9ydCBkZWZhdWx0IHN1YmFnZW50U3RhcnRIb29rKHt9LCBhc3luYyAoX2lucHV0LCB7IGxvZ2dlciB9KSA9PiB7XG4gIGxldCBhY3Rpb25JbnB1dDogUmV0dXJuVHlwZTx0eXBlb2YgZXh0cmFjdEFjdGlvbklucHV0PjtcbiAgdHJ5IHtcbiAgICBhY3Rpb25JbnB1dCA9IGV4dHJhY3RBY3Rpb25JbnB1dCgpO1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGNvbnN0IG1lc3NhZ2UgPSBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6IFN0cmluZyhlcnJvcik7XG4gICAgbG9nZ2VyLmVycm9yKCdOb3QgcnVubmluZyBpbnNpZGUgYW4gYWN0aW9uIHN1YnByb2Nlc3MnLCB7IGVycm9yOiBtZXNzYWdlIH0pO1xuICAgIHJldHVybiBzdWJhZ2VudFN0YXJ0T3V0cHV0KHtcbiAgICAgIHN5c3RlbU1lc3NhZ2U6ICdTdWJhZ2VudFN0YXJ0IGhvb2s6IG5vdCBydW5uaW5nIGluc2lkZSBhbiBhY3Rpb24gc3VicHJvY2Vzcy4nXG4gICAgfSk7XG4gIH1cblxuICBsZXQgc3lzdGVtTWVzc2FnZTogc3RyaW5nO1xuICB0cnkge1xuICAgIHN5c3RlbU1lc3NhZ2UgPSBidWlsZEFkZGl0aW9uYWxDb250ZXh0KGFjdGlvbklucHV0KTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBpZiAoZXJyb3IgaW5zdGFuY2VvZiBDYXJkUmVwb0FjY2Vzc0Vycm9yKSB7XG4gICAgICBsb2dnZXIuZXJyb3IoJ0NhcmQgcmVwbyBpbmFjY2Vzc2libGUnLCB7IHJlcG9QYXRoOiBlcnJvci5yZXBvUGF0aCwgZXJyb3I6IGVycm9yLm1lc3NhZ2UgfSk7XG4gICAgICByZXR1cm4gc3ViYWdlbnRTdGFydE91dHB1dCh7XG4gICAgICAgIGNvbnRpbnVlOiBmYWxzZSxcbiAgICAgICAgLi4uZXJyb3IudG9Ib29rRmFpbHVyZSgnc3ViYWdlbnQnKVxuICAgICAgfSk7XG4gICAgfVxuICAgIHRocm93IGVycm9yO1xuICB9XG5cbiAgcmV0dXJuIHN1YmFnZW50U3RhcnRPdXRwdXQoe1xuICAgIHN5c3RlbU1lc3NhZ2UsXG4gICAgaG9va1NwZWNpZmljT3V0cHV0OiB7XG4gICAgICBhZGRpdGlvbmFsQ29udGV4dDogc3lzdGVtTWVzc2FnZVxuICAgIH1cbiAgfSk7XG59KTtcbiIsICJpbXBvcnQgaG9vayBmcm9tICcuL3N1YmFnZW50LXN0YXJ0LnRzJztcbmltcG9ydCB7IGV4ZWN1dGUgfSBmcm9tICcuLi8uLi8uLi8uLi9ub2RlX21vZHVsZXMvQGdvb2Rmb290L2NsYXVkZS1jb2RlLWhvb2tzL2Rpc3QvcnVudGltZS5qcyc7XG5cbmV4ZWN1dGUoaG9vayk7XG4iXSwKICAibWFwcGluZ3MiOiAiOzs7Ozs7Ozs7OztBQWdCQSxTQUFTLG9CQUFvQjtBQWN0QixJQUFNLGlCQUFpQjtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFLNUIsU0FBUztBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFNVCxhQUFhO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQU1iLGFBQWE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFPYixnQkFBZ0I7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBTWhCLGNBQWM7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBTWQsa0JBQWtCO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBT2xCLGNBQWM7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBTWQsV0FBVztBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFNWCxjQUFjO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQU1kLFdBQVc7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBTVgsV0FBVztBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFNWCxXQUFXO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQU1YLFFBQVE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBTVIsY0FBYztBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFZZCxhQUFhO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFB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LFdBQU8sS0FBSyx1QkFBdUIsTUFBTSxLQUFLLEdBQUcsQ0FBQztBQUFBLEVBQU0sVUFBVSxLQUFLLElBQUksQ0FBQztBQUFBLHNCQUF5QjtBQUFBLEVBQ3ZHO0FBRUEsU0FBTztBQUNUO0FBbUJPLFNBQVMsdUJBQXVCLGFBQWtDO0FBQ3ZFLFFBQU0sWUFBWSxlQUFlLFdBQVc7QUFDNUMsUUFBTSxZQUFZLG1CQUFtQixZQUFZLFlBQVk7QUFDN0QsUUFBTSxXQUFXLHNCQUFzQixZQUFZLFlBQVk7QUFDL0QsUUFBTSxxQkFBcUIsNEJBQTRCLFlBQVksVUFBVSxZQUFZLFlBQVk7QUFFckcsUUFBTSxRQUFRLENBQUMsV0FBVyxTQUFTO0FBQ25DLE1BQUksU0FBVSxPQUFNLEtBQUssUUFBUTtBQUNqQyxRQUFNLEtBQUssR0FBRyxrQkFBa0I7QUFDaEMsU0FBTyxNQUFNLEtBQUssTUFBTTtBQUMxQjs7O0FHeG1CQSxJQUFPLHlCQUFRLGtCQUFrQixDQUFDLEdBQUcsT0FBTyxRQUFRLEVBQUUsUUFBQUMsUUFBTyxNQUFNO0FBQ2pFLE1BQUk7QUFDSixNQUFJO0FBQ0Ysa0JBQWMsbUJBQW1CO0FBQUEsRUFDbkMsU0FBUyxPQUFPO0FBQ2QsVUFBTSxVQUFVLGlCQUFpQixRQUFRLE1BQU0sVUFBVSxPQUFPLEtBQUs7QUFDckUsSUFBQUEsUUFBTyxNQUFNLDJDQUEyQyxFQUFFLE9BQU8sUUFBUSxDQUFDO0FBQzFFLFdBQU8sb0JBQW9CO0FBQUEsTUFDekIsZUFBZTtBQUFBLElBQ2pCLENBQUM7QUFBQSxFQUNIO0FBRUEsTUFBSTtBQUNKLE1BQUk7QUFDRixvQkFBZ0IsdUJBQXVCLFdBQVc7QUFBQSxFQUNwRCxTQUFTLE9BQU87QUFDZCxRQUFJLGlCQUFpQixxQkFBcUI7QUFDeEMsTUFBQUEsUUFBTyxNQUFNLDBCQUEwQixFQUFFLFVBQVUsTUFBTSxVQUFVLE9BQU8sTUFBTSxRQUFRLENBQUM7QUFDekYsYUFBTyxvQkFBb0I7QUFBQSxRQUN6QixVQUFVO0FBQUEsUUFDVixHQUFHLE1BQU0sY0FBYyxVQUFVO0FBQUEsTUFDbkMsQ0FBQztBQUFBLElBQ0g7QUFDQSxVQUFNO0FBQUEsRUFDUjtBQUVBLFNBQU8sb0JBQW9CO0FBQUEsSUFDekI7QUFBQSxJQUNBLG9CQUFvQjtBQUFBLE1BQ2xCLG1CQUFtQjtBQUFBLElBQ3JCO0FBQUEsRUFDRixDQUFDO0FBQ0gsQ0FBQzs7O0FDM0NELFFBQVEsc0JBQUk7IiwKICAibmFtZXMiOiBbInJlYWRGaWxlU3luYyIsICJyZWFkRmlsZVN5bmMiLCAibG9nZ2VyIl0KfQo=
