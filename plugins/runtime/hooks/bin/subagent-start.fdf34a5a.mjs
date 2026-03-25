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
    } catch {
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
function resolveWorkspaceCommitDetails(workspacePath, shas) {
  if (shas.length === 0) return null;
  try {
    const output = execFileSync("git", ["log", "--no-walk", "--pretty=format:%h - %s", "--name-only", ...shas], {
      cwd: workspacePath,
      encoding: "utf-8",
      timeout: 5e3,
      stdio: ["pipe", "pipe", "pipe"]
    }).trim();
    if (!output) return null;
    return formatCommitLog(output, "blank-line") || null;
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
execute(subagent_start_default);
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vc2RrL3NyYy9jb25maWcvZW52LnRzIiwgIi4uLy4uLy4uL25vZGVfbW9kdWxlcy9AZ29vZGZvb3QvY2xhdWRlLWNvZGUtaG9va3MvZGlzdC9lbnYuanMiLCAiLi4vLi4vLi4vbm9kZV9tb2R1bGVzL0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcy9kaXN0L2hvb2tzLmpzIiwgIi4uLy4uLy4uL25vZGVfbW9kdWxlcy9AZ29vZGZvb3QvY2xhdWRlLWNvZGUtaG9va3MvZGlzdC9sb2dnZXIuanMiLCAiLi4vLi4vLi4vbm9kZV9tb2R1bGVzL0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcy9kaXN0L291dHB1dHMuanMiLCAiLi4vLi4vLi4vbm9kZV9tb2R1bGVzL0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcy9kaXN0L3J1bnRpbWUuanMiLCAic3JjL2xpYi9jb250ZXh0LnRzIiwgIi4uL3Nkay9zcmMvcHJvdG9jb2wvdHlwZXMvYnJhbmNoLnRzIiwgInNyYy9saWIvZmlsZS10cmVlLnRzIiwgInNyYy9zdWJhZ2VudC1zdGFydC50cyIsICJzcmMvc3ViYWdlbnQtc3RhcnQtZW50cnkudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbIi8qKlxuICogRW52aXJvbm1lbnQgdmFyaWFibGUgdXRpbGl0aWVzIGZvciBDYXJkcyBFeHRlbnNpb24gYWN0aW9ucyBhbmQgdHlwZSBob29rcy5cbiAqXG4gKiBUaGUgZXhlY3V0aW9uIHdyYXBwZXIgaW5qZWN0cyBhY3Rpb24gYW5kIHR5cGUgaG9vayBpbnB1dHMgdmlhIHByb2Nlc3MuZW52LlxuICogVGhpcyBtb2R1bGUgcHJvdmlkZXMgc3RyaWN0IGdldHRlcnMgYW5kIHR5cGVkIGV4dHJhY3RvcnMgc28gaGFuZGxlcnMgZG8gbm90XG4gKiBuZWVkIHRvIHBhcnNlIGVudmlyb25tZW50IHZhcmlhYmxlcyBtYW51YWxseS5cbiAqXG4gKiBVc2UgdGhlIGluZGl2aWR1YWwgZ2V0dGVycyB3aGVuIHlvdSBvbmx5IG5lZWQgb25lIHZhbHVlOyB1c2VcbiAqIHtAbGluayBleHRyYWN0QWN0aW9uSW5wdXR9IG9yIHtAbGluayBleHRyYWN0VHlwZUlucHV0fSB3aGVuIHlvdSBuZWVkIGEgZnVsbFxuICogdHlwZWQgcGF5bG9hZCBmb3IgYW4gYWN0aW9uIG9yIHR5cGUgaG9vay5cbiAqXG4gKlxuICogQHN1bW1hcnkgRW52aXJvbm1lbnQgdmFyaWFibGUgdXRpbGl0aWVzIGZvciBDYXJkcyBFeHRlbnNpb24gYWN0aW9ucyBhbmQgdHlwZSBob29rc1xuICogQG1vZHVsZVxuICovXG5cbmltcG9ydCB7IHJlYWRGaWxlU3luYyB9IGZyb20gJ25vZGU6ZnMnO1xuaW1wb3J0IHR5cGUgeyBBY3Rpb25JbnB1dCwgVHlwZUhvb2tJbnB1dCB9IGZyb20gJy4vaW5wdXRzLmpzJztcblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gQ29uc3RhbnRzXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbi8qKlxuICogRW52aXJvbm1lbnQgdmFyaWFibGUgbmFtZXMgc2V0IGJ5IHRoZSBDYXJkcyBleGVjdXRpb24gd3JhcHBlci5cbiAqXG4gKiBUaGlzIGlzIHRoZSBzaW5nbGUgc291cmNlIG9mIHRydXRoIGZvciBlbnYgdmFyIGtleXMgdXNlZCBieSBhY3Rpb24gYW5kIHR5cGVcbiAqIGhvb2sgcHJvY2Vzc2VzLiBLZWVwIGl0IGluIHN5bmMgd2l0aCB0aGUgd3JhcHBlciB0byBhdm9pZCBzdWJ0bGUgXCJ1bmRlZmluZWRcbiAqIGlucHV0XCIgYnVncy5cbiAqL1xuZXhwb3J0IGNvbnN0IENBUkRTX0VOVl9WQVJTID0ge1xuICAvKipcbiAgICogVW5pcXVlIGlkZW50aWZpZXIgZm9yIHRoZSBjdXJyZW50IGNhcmQuXG4gICAqIEF2YWlsYWJsZSBpbiBhbGwgYWN0aW9ucyBhbmQgdHlwZSBob29rcy5cbiAgICovXG4gIENBUkRfSUQ6ICdDQVJEX0lEJyxcblxuICAvKipcbiAgICogVGhlIGVudmlyb25tZW50IG5hbWUgZnJvbSBzZXR0aW5ncy5qc29uLlxuICAgKiBBdmFpbGFibGUgaW4gYWxsIGFjdGlvbnMgYW5kIHR5cGUgaG9va3MuXG4gICAqL1xuICBFTlZJUk9OTUVOVDogJ0VOVklST05NRU5UJyxcblxuICAvKipcbiAgICogRGlzcGxheSBuYW1lIG9mIHRoZSBhY3Rpb24gYnV0dG9uIHRoYXQgdHJpZ2dlcmVkIHRoaXMgaGFuZGxlci5cbiAgICogQXZhaWxhYmxlIGluIGFjdGlvbnMgb25seSAobm90IHR5cGUgaG9va3MpLlxuICAgKi9cbiAgQUNUSU9OX05BTUU6ICdBQ1RJT05fTkFNRScsXG5cbiAgLyoqXG4gICAqIENhcmQncyBleGVjdXRpb24gbW9kZSwgZGV0ZXJtaW5pbmcgVUkgaW50ZXJhY3Rpb24gbW9kZWwuXG4gICAqIEF2YWlsYWJsZSBpbiBhY3Rpb25zIG9ubHkgKG5vdCB0eXBlIGhvb2tzKS5cbiAgICogVmFsaWQgdmFsdWVzOiAnaW50ZXJhY3RpdmUnIHwgJ2JhY2tncm91bmQnXG4gICAqL1xuICBFWEVDVVRJT05fTU9ERTogJ0VYRUNVVElPTl9NT0RFJyxcblxuICAvKipcbiAgICogQ2FyZHMgc2VydmVyIGJhc2UgVVJMIGZvciBBUEkgY2FsbHMuXG4gICAqIEF2YWlsYWJsZSBpbiBhbGwgYWN0aW9ucyBhbmQgdHlwZSBob29rcy5cbiAgICovXG4gIEFQSV9CQVNFX1VSTDogJ0FQSV9CQVNFX1VSTCcsXG5cbiAgLyoqXG4gICAqIEF1dGhlbnRpY2F0aW9uIHRva2VuIGZvciBBUEkgY2FsbHMuXG4gICAqIEF2YWlsYWJsZSBpbiBhbGwgYWN0aW9ucyBhbmQgdHlwZSBob29rcy5cbiAgICovXG4gIEFQSV9BQ0NFU1NfVE9LRU46ICdBUElfQUNDRVNTX1RPS0VOJyxcblxuICAvKipcbiAgICogQ29uZmlndXJlZCBjb2RpbmcgYWdlbnQgaWRlbnRpZmllciBmcm9tIGNhcmRzLmNvZGluZ0FnZW50IHNldHRpbmcuXG4gICAqIEF2YWlsYWJsZSBpbiBhY3Rpb25zIG9ubHkgKG5vdCB0eXBlIGhvb2tzKS5cbiAgICogT3B0aW9uYWwuXG4gICAqL1xuICBDT0RJTkdfQUdFTlQ6ICdDT0RJTkdfQUdFTlQnLFxuXG4gIC8qKlxuICAgKiBUaGUgcmVnaXN0ZXJlZCB0eXBlIG5hbWUuXG4gICAqIEF2YWlsYWJsZSBpbiB0eXBlIGhvb2tzIG9ubHkuXG4gICAqL1xuICBUWVBFX05BTUU6ICdUWVBFX05BTUUnLFxuXG4gIC8qKlxuICAgKiBUaGUgdHlwZSdzIHZlcnNpb24gc3RyaW5nIGZyb20gc2V0dGluZ3MuanNvbiBjb25maWd1cmF0aW9uLlxuICAgKiBBdmFpbGFibGUgaW4gdHlwZSBob29rcyBvbmx5LlxuICAgKi9cbiAgVFlQRV9WRVJTSU9OOiAnVFlQRV9WRVJTSU9OJyxcblxuICAvKipcbiAgICogVGhlIGZpbGUgbmFtZSB3aXRoaW4gdGhlIHR5cGUgZGlyZWN0b3J5LlxuICAgKiBBdmFpbGFibGUgaW4gdHlwZSBob29rcyBvbmx5LlxuICAgKi9cbiAgRklMRV9OQU1FOiAnRklMRV9OQU1FJyxcblxuICAvKipcbiAgICogRnVsbCBwYXRoIHRvIHRoZSBmaWxlLlxuICAgKiBBdmFpbGFibGUgaW4gdHlwZSBob29rcyBvbmx5LlxuICAgKi9cbiAgRklMRV9QQVRIOiAnRklMRV9QQVRIJyxcblxuICAvKipcbiAgICogRmlsZSBzaXplIGluIGJ5dGVzLlxuICAgKiBBdmFpbGFibGUgaW4gdHlwZSBob29rcyBvbmx5LlxuICAgKi9cbiAgRklMRV9TSVpFOiAnRklMRV9TSVpFJyxcblxuICAvKipcbiAgICogU0hBMjU2IGhhc2ggb2YgY29udGVudC5cbiAgICogQXZhaWxhYmxlIGluIHR5cGUgaG9va3Mgb25seS5cbiAgICovXG4gIFNIQTI1NjogJ1NIQTI1NicsXG5cbiAgLyoqXG4gICAqIE1JTUUgdHlwZSBvZiB0aGUgY29udGVudC5cbiAgICogQXZhaWxhYmxlIGluIHR5cGUgaG9va3Mgb25seS5cbiAgICovXG4gIENPTlRFTlRfVFlQRTogJ0NPTlRFTlRfVFlQRScsXG5cbiAgLyoqXG4gICAqIFBhdGggdG8gdGhlIFZTIENvZGUgYnVuZGxlZCBOb2RlLmpzIGludGVycHJldGVyLlxuICAgKlxuICAgKiBTZXQgYnkgdGhlIGV4dGVuc2lvbiBob3N0IGZyb20gYHByb2Nlc3MuZXhlY1BhdGhgICh3aXRoXG4gICAqIGBFTEVDVFJPTl9SVU5fQVNfTk9ERT0xYCkuIENvbW1hbmRzIGluIHNldHRpbmdzLmpzb24gdXNlXG4gICAqIGAkVlNDT0RFX05PREUgLi9iaW4vLi4uYCBzbyB0aGV5IHdvcmsgcmVnYXJkbGVzcyBvZlxuICAgKiB3aGV0aGVyIGBub2RlYCBpcyBvbiB0aGUgc3lzdGVtIFBBVEguXG4gICAqXG4gICAqIEF2YWlsYWJsZSBpbiBhbGwgYWN0aW9ucyBhbmQgdHlwZSBob29rcy5cbiAgICovXG4gIFZTQ09ERV9OT0RFOiAnVlNDT0RFX05PREUnLFxuXG4gIC8qKlxuICAgKiBQYXRoIHRvIHRoZSBOb2RlLmpzIGludGVycHJldGVyIHJ1bm5pbmcgdGhlIHdyYXBwZXIgcHJvY2Vzcy5cbiAgICpcbiAgICogU2V0IGJ5IHRoZSB3cmFwcGVyIGZyb20gYHByb2Nlc3MuZXhlY1BhdGhgLiBVc2UgYCROT0RFYCBpbiBlbWJlZGRlZFxuICAgKiBiYXNoIHN0YXRlbWVudHMgdG8gaW52b2tlIE5vZGUgc2NyaXB0cyBwb3J0YWJseS5cbiAgICpcbiAgICogQXZhaWxhYmxlIGluIGFsbCBhY3Rpb25zLlxuICAgKi9cbiAgTk9ERTogJ05PREUnLFxuXG4gIC8qKlxuICAgKiBQYXRoIHRvIHRoZSBVbml4IGRvbWFpbiBzb2NrZXQgZm9yIHJ1bnRpbWUtdG8tZGlzcGF0Y2hlciBjb21tdW5pY2F0aW9uLlxuICAgKiBBdmFpbGFibGUgaW4gYWN0aW9ucyBvbmx5LlxuICAgKi9cbiAgU09DS0VUX1BBVEg6ICdTT0NLRVRfUEFUSCcsXG5cbiAgLyoqXG4gICAqIFBhdGggdG8gYSBKU09OIGZpbGUgY29udGFpbmluZyBzd2l0Y2hUb0ludGVyYWN0aXZlIGRhdGEgZnJvbSBhIHByZXZpb3VzIGhhbmRsZXIuXG4gICAqIEF2YWlsYWJsZSBpbiBhY3Rpb25zIG9ubHkuIE9wdGlvbmFsLlxuICAgKi9cbiAgU1dJVENIX1RPX0lOVEVSQUNUSVZFX0RBVEFfUEFUSDogJ1NXSVRDSF9UT19JTlRFUkFDVElWRV9EQVRBX1BBVEgnLFxuXG4gIC8qKlxuICAgKiBQYXRoIHRvIHRoZSBzZXR0aW5ncyBjb25maWd1cmF0aW9uIGRpcmVjdG9yeS5cbiAgICogQXZhaWxhYmxlIGluIGFjdGlvbnMgb25seS5cbiAgICovXG4gIENPTkZJR19QQVRIOiAnQ09ORklHX1BBVEgnLFxuXG4gIC8qKlxuICAgKiBQYXRoIHRvIHRoZSBWUyBDb2RlIHdvcmtzcGFjZSByb290IGRpcmVjdG9yeS5cbiAgICogU2V0IGJ5IHRoZSBhY3Rpb24gaGFuZGxlciAoZS5nLiwgbGF1bmNoLnRzKSB0byB0aGUgd29ya3RyZWUgcGF0aC5cbiAgICogQXZhaWxhYmxlIGluIGhvb2tzIHJ1bm5pbmcgaW5zaWRlIHRoZSBjbGF1ZGUgQ0xJLlxuICAgKi9cbiAgV09SS1NQQUNFX1BBVEg6ICdXT1JLU1BBQ0VfUEFUSCcsXG5cbiAgLyoqXG4gICAqIEFic29sdXRlIHBhdGggdG8gdGhlIG1haW4gZ2l0IHJlcG9zaXRvcnkgcm9vdCAoTk9UIGEgd29ya3RyZWUpLlxuICAgKiBTZXQgYnkgQWN0aW9uRGlzcGF0Y2hlcjsgY29uc3VtZWQgYnkgdGhlIHdyYXBwZXIgYW5kIHdhdGNoZXIgZm9yXG4gICAqIGdpdCBvcGVyYXRpb25zICh3b3JrdHJlZSByZW1vdmFsLCBicmFuY2ggZGVsZXRpb24pIHRoYXQgbXVzdCBydW5cbiAgICogYWdhaW5zdCB0aGUgbWFpbiByZXBvc2l0b3J5LlxuICAgKi9cbiAgUkVQT19ST09UOiAnUkVQT19ST09UJyxcblxuICAvKipcbiAgICogUGF0aCB0byB0aGUgY2FyZCdzIHJlcG9zaXRvcnkgZGlyZWN0b3J5LlxuICAgKiBBdmFpbGFibGUgaW4gYWN0aW9ucyBvbmx5LlxuICAgKi9cbiAgQ0FSRF9SRVBPX1BBVEg6ICdDQVJEX1JFUE9fUEFUSCcsXG5cbiAgLyoqXG4gICAqIFJlc29sdmVkIHNoZWxsIGNvbW1hbmQgZm9yIHRoZSB3cmFwcGVyIHRvIHNwYXduIGFzIHRoZSBhY3Rpb24gaGFuZGxlci5cbiAgICogU2V0IGJ5IEFjdGlvbkRpc3BhdGNoZXI7IGNvbnN1bWVkIGJ5IHRoZSB3cmFwcGVyIChub3QgYnkgYWN0aW9uIGhhbmRsZXJzKS5cbiAgICovXG4gIEFDVElPTl9DT01NQU5EOiAnQUNUSU9OX0NPTU1BTkQnLFxuXG4gIC8qKlxuICAgKiBHaXQgYnJhbmNoIHRoYXQgdGhlIGNhcmQncyB3b3Jrc3BhY2UgYnJhbmNoIHdpbGwgbWVyZ2UgaW50by5cbiAgICogUmVzb2x2ZWQgZnJvbSB0aGUgd29ya3NwYWNlIEhFQUQgYXQgbGF1bmNoIHRpbWUuXG4gICAqIFNldCBieSB0aGUgbGF1bmNoIGFjdGlvbi5cbiAgICogQXZhaWxhYmxlIGluIGFjdGlvbnMgb25seS5cbiAgICovXG4gIEJBU0VfQlJBTkNIOiAnQkFTRV9CUkFOQ0gnLFxuXG4gIC8qKlxuICAgKiBHaXQgYnJhbmNoIGZyb20gd2hpY2ggdGhlIGNhcmQncyB3b3Jrc3BhY2UgYnJhbmNoIHdhcyBjcmVhdGVkLlxuICAgKiBNYXkgZGlmZmVyIGZyb20gQkFTRV9CUkFOQ0ggd2hlbiB0aGUgd29ya3RyZWUgd2FzIGNyZWF0ZWQgYWdhaW5zdFxuICAgKiBhIGRpZmZlcmVudCByZWYgdGhhbiB0aGUgY3VycmVudCB3b3Jrc3BhY2UgSEVBRC5cbiAgICogU2V0IGJ5IHRoZSBsYXVuY2ggYWN0aW9uLlxuICAgKiBBdmFpbGFibGUgaW4gYWN0aW9ucyBvbmx5LlxuICAgKi9cbiAgUEFSRU5UX0JSQU5DSDogJ1BBUkVOVF9CUkFOQ0gnLFxuXG4gIC8qKlxuICAgKiBHaXQgYnJhbmNoIG5hbWUgZm9yIHRoZSBjYXJkJ3Mgd29ya3NwYWNlIGltcGxlbWVudGF0aW9uLlxuICAgKiBTZXQgYnkgdGhlIGxhdW5jaCBhY3Rpb24gYWZ0ZXIgcmVzb2x2aW5nIG9yIGNyZWF0aW5nIHRoZSB3b3JrdHJlZS5cbiAgICogQXZhaWxhYmxlIGluIGFjdGlvbnMgb25seS5cbiAgICovXG4gIFdPUktTUEFDRV9CUkFOQ0g6ICdXT1JLU1BBQ0VfQlJBTkNIJyxcblxuICAvKipcbiAgICogU2Vzc2lvbiBJRCBwZXJzaXN0ZWQgYnkgdGhlIHNlc3Npb24tc3RhcnQgaG9vayB2aWEgYHBlcnNpc3RFbnZWYXJgLlxuICAgKlxuICAgKiBBdmFpbGFibGUgaW4gQmFzaCB0b29sIHNoZWxsIGRlc2NlbmRhbnRzIChjb21tYW5kcywgZ2l0IGhvb2tzKSBhZnRlclxuICAgKiBzZXNzaW9uIHN0YXJ0LiBOT1QgYXZhaWxhYmxlIGluIGhvb2tzIHNwYXduZWQgZGlyZWN0bHkgYnkgQ2xhdWRlIENvZGVcbiAgICogKHN0b3AsIHNlc3Npb24tZW5kLCBldGMuKSBcdTIwMTQgdGhvc2UgcmVjZWl2ZSB0aGUgc2Vzc2lvbiBJRCB2aWEgaG9vayBpbnB1dC5cbiAgICpcbiAgICogVGhlIGNhcmQtcmVwbyBwb3N0LWNvbW1pdCBob29rIHJlYWRzIHRoaXMgdG8gcmVjb3JkIGNvbW1pdHMgZGlyZWN0bHlcbiAgICogd2l0aG91dCBuZWVkaW5nIGEgcHJvY2Vzcy10cmVlIHdhbGsgb3IgUElEIHJlZ2lzdHJ5IGxvb2t1cC5cbiAgICovXG4gIENBUkRTX1NFU1NJT05fSUQ6ICdDQVJEU19TRVNTSU9OX0lEJyxcblxuICAvKipcbiAgICogQWJzb2x1dGUgcGF0aCB0byB0aGUgVlMgQ29kZSBleHRlbnNpb24gaW5zdGFsbGF0aW9uIGRpcmVjdG9yeS5cbiAgICpcbiAgICogU2V0IGJ5IHRoZSBleHRlbnNpb24gaG9zdCBmcm9tIGBjb250ZXh0LmV4dGVuc2lvblVyaS5mc1BhdGhgIGFuZCBpbmplY3RlZFxuICAgKiBpbnRvIGFsbCBzcGF3bmVkIGFjdGlvbiBwcm9jZXNzZXMuIFVzZSB0aGlzIHRvIGxvY2F0ZSBidW5kbGVkIGFzc2V0cyBzdWNoXG4gICAqIGFzIHRoZSBydW50aW1lIHBsdWdpbiBkaXJlY3RvcnkgKGA8ZXh0ZW5zaW9uUGF0aD4vZGlzdC9wbHVnaW5zL3J1bnRpbWVgKS5cbiAgICpcbiAgICogQXZhaWxhYmxlIGluIGFjdGlvbnMgb25seSAobm90IHR5cGUgaG9va3MpLlxuICAgKi9cbiAgRVhURU5TSU9OX1BBVEg6ICdFWFRFTlNJT05fUEFUSCdcbn0gYXMgY29uc3Q7XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIEluZGl2aWR1YWwgR2V0dGVyc1xuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4vKipcbiAqIFJlYWRzIHRoZSBjYXJkIGlkZW50aWZpZXIgZnJvbSB0aGUgZW52aXJvbm1lbnQuXG4gKlxuICogVGhlIGV4ZWN1dGlvbiB3cmFwcGVyIGFsd2F5cyBzZXRzIHRoaXMgZm9yIGV2ZXJ5IGFjdGlvbiBhbmQgdHlwZSBob29rLlxuICogQHJldHVybnMgVGhlIGN1cnJlbnQgY2FyZCBJRFxuICogQHRocm93cyBFcnJvciBpZiBDQVJEX0lEIGlzIG1pc3Npbmcgb3IgZW1wdHlcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBjb25zdCBjYXJkSWQgPSBnZXRDYXJkSWQoKTtcbiAqIGNvbnNvbGUubG9nKGBQcm9jZXNzaW5nIGNhcmQ6ICR7Y2FyZElkfWApO1xuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRDYXJkSWQoKTogc3RyaW5nIHtcbiAgY29uc3QgdmFsdWUgPSBwcm9jZXNzLmVudltDQVJEU19FTlZfVkFSUy5DQVJEX0lEXTtcbiAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQgfHwgdmFsdWUgPT09ICcnKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIHJlcXVpcmVkIGVudmlyb25tZW50IHZhcmlhYmxlOiAke0NBUkRTX0VOVl9WQVJTLkNBUkRfSUR9YCk7XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG4vKipcbiAqIFJlYWRzIHRoZSBlbnZpcm9ubWVudCBuYW1lIGZyb20gdGhlIGVudmlyb25tZW50LlxuICpcbiAqIFRoaXMgdmFsdWUgbWF0Y2hlcyB0aGUgZW52aXJvbm1lbnQga2V5IGluIHNldHRpbmdzLmpzb24gKGUuZy4sIFwiZGVmYXVsdFwiLCBcInN0YWdpbmdcIikuXG4gKiBAcmV0dXJucyBUaGUgZW52aXJvbm1lbnQgbmFtZVxuICogQHRocm93cyBFcnJvciBpZiBFTlZJUk9OTUVOVCBpcyBtaXNzaW5nIG9yIGVtcHR5XG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogY29uc3QgZW52aXJvbm1lbnQgPSBnZXRFbnZpcm9ubWVudCgpO1xuICogY29uc29sZS5sb2coYEVudmlyb25tZW50OiAke2Vudmlyb25tZW50fWApO1xuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRFbnZpcm9ubWVudCgpOiBzdHJpbmcge1xuICBjb25zdCB2YWx1ZSA9IHByb2Nlc3MuZW52W0NBUkRTX0VOVl9WQVJTLkVOVklST05NRU5UXTtcbiAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQgfHwgdmFsdWUgPT09ICcnKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIHJlcXVpcmVkIGVudmlyb25tZW50IHZhcmlhYmxlOiAke0NBUkRTX0VOVl9WQVJTLkVOVklST05NRU5UfWApO1xuICB9XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuLyoqXG4gKiBSZWFkcyB0aGUgYWN0aW9uIGJ1dHRvbiBuYW1lIGZyb20gdGhlIGVudmlyb25tZW50LlxuICpcbiAqIFRoaXMgaXMgdGhlIGRpc3BsYXkgbmFtZSBvZiB0aGUgYWN0aW9uIHRoYXQgdHJpZ2dlcmVkIHRoZSBoYW5kbGVyLCBtYXRjaGluZ1xuICogdGhlIGBhY3Rpb25OYW1lYCBmaWVsZCBmcm9tIGBkZWZpbmVBY3Rpb25gLlxuICogQHJldHVybnMgRGlzcGxheSBuYW1lIG9mIHRoZSBhY3Rpb24gdGhhdCB0cmlnZ2VyZWQgdGhlIGN1cnJlbnQgaGFuZGxlciBydW4uXG4gKiBAdGhyb3dzIEVycm9yIGlmIEFDVElPTl9OQU1FIGlzIG1pc3Npbmcgb3IgZW1wdHlcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBjb25zdCBhY3Rpb25OYW1lID0gZ2V0QWN0aW9uTmFtZSgpO1xuICogY29uc29sZS5sb2coYFJ1bm5pbmcgYWN0aW9uOiAke2FjdGlvbk5hbWV9YCk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldEFjdGlvbk5hbWUoKTogc3RyaW5nIHtcbiAgY29uc3QgdmFsdWUgPSBwcm9jZXNzLmVudltDQVJEU19FTlZfVkFSUy5BQ1RJT05fTkFNRV07XG4gIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IHZhbHVlID09PSAnJykge1xuICAgIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyByZXF1aXJlZCBlbnZpcm9ubWVudCB2YXJpYWJsZTogJHtDQVJEU19FTlZfVkFSUy5BQ1RJT05fTkFNRX1gKTtcbiAgfVxuICByZXR1cm4gdmFsdWU7XG59XG5cbi8qKlxuICogUmVhZHMgdGhlIGV4ZWN1dGlvbiBtb2RlIGZyb20gdGhlIGVudmlyb25tZW50LlxuICpcbiAqIERldGVybWluZXMgdGhlIFVJIGludGVyYWN0aW9uIG1vZGVsIGZvciBhY3Rpb25zLlxuICogQHJldHVybnMgVGhlIGV4ZWN1dGlvbiBtb2RlICgnaW50ZXJhY3RpdmUnIG9yICdiYWNrZ3JvdW5kJylcbiAqIEB0aHJvd3MgRXJyb3IgaWYgRVhFQ1VUSU9OX01PREUgaXMgbWlzc2luZywgZW1wdHksIG9yIGludmFsaWRcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBjb25zdCBtb2RlID0gZ2V0RXhlY3V0aW9uTW9kZSgpO1xuICogaWYgKG1vZGUgPT09ICdpbnRlcmFjdGl2ZScpIHtcbiAqICAgLy8gU2hvdyB1c2VyIHByb21wdHNcbiAqIH1cbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0RXhlY3V0aW9uTW9kZSgpOiAnaW50ZXJhY3RpdmUnIHwgJ2JhY2tncm91bmQnIHtcbiAgY29uc3QgdmFsdWUgPSBwcm9jZXNzLmVudltDQVJEU19FTlZfVkFSUy5FWEVDVVRJT05fTU9ERV07XG4gIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IHZhbHVlID09PSAnJykge1xuICAgIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyByZXF1aXJlZCBlbnZpcm9ubWVudCB2YXJpYWJsZTogJHtDQVJEU19FTlZfVkFSUy5FWEVDVVRJT05fTU9ERX1gKTtcbiAgfVxuICBpZiAodmFsdWUgIT09ICdpbnRlcmFjdGl2ZScgJiYgdmFsdWUgIT09ICdiYWNrZ3JvdW5kJykge1xuICAgIHRocm93IG5ldyBFcnJvcihgSW52YWxpZCAke0NBUkRTX0VOVl9WQVJTLkVYRUNVVElPTl9NT0RFfTogZXhwZWN0ZWQgJ2ludGVyYWN0aXZlJyBvciAnYmFja2dyb3VuZCcsIGdvdCBcIiR7dmFsdWV9XCJgKTtcbiAgfVxuICByZXR1cm4gdmFsdWU7XG59XG5cbi8qKlxuICogUmVhZHMgdGhlIEFQSSBiYXNlIFVSTCBmcm9tIHRoZSBlbnZpcm9ubWVudC5cbiAqXG4gKiBVc2UgdGhpcyBhcyB0aGUgYmFzZSBmb3IgY29uc3RydWN0aW5nIEFQSSBlbmRwb2ludHMuIFRoZSBVUkwgZG9lcyBub3QgaW5jbHVkZVxuICogYSB0cmFpbGluZyBzbGFzaC5cbiAqIEByZXR1cm5zIEJhc2UgVVJMIHVzZWQgdG8gY29uc3RydWN0IENhcmRzIEFQSSBlbmRwb2ludHMgZm9yIHRoaXMgZXhlY3V0aW9uLlxuICogQHRocm93cyBFcnJvciBpZiBBUElfQkFTRV9VUkwgaXMgbWlzc2luZyBvciBlbXB0eVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGNvbnN0IGFwaVVybCA9IGdldEFwaUJhc2VVcmwoKTtcbiAqIGNvbnN0IGVuZHBvaW50ID0gYCR7YXBpVXJsfS9jYXJkcy8ke2NhcmRJZH1gO1xuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRBcGlCYXNlVXJsKCk6IHN0cmluZyB7XG4gIGNvbnN0IHZhbHVlID0gcHJvY2Vzcy5lbnZbQ0FSRFNfRU5WX1ZBUlMuQVBJX0JBU0VfVVJMXTtcbiAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQgfHwgdmFsdWUgPT09ICcnKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIHJlcXVpcmVkIGVudmlyb25tZW50IHZhcmlhYmxlOiAke0NBUkRTX0VOVl9WQVJTLkFQSV9CQVNFX1VSTH1gKTtcbiAgfVxuICByZXR1cm4gdmFsdWU7XG59XG5cbi8qKlxuICogUmVhZHMgdGhlIEFQSSBhY2Nlc3MgdG9rZW4gZnJvbSB0aGUgZW52aXJvbm1lbnQuXG4gKlxuICogQmVhcmVyIHRva2VuIHZhbGlkIGZvciB0aGUgZHVyYXRpb24gb2YgdGhpcyBhY3Rpb24gb3IgdHlwZSBob29rIGV4ZWN1dGlvbi5cbiAqIEluY2x1ZGUgaW4gQXV0aG9yaXphdGlvbiBoZWFkZXJzIHdoZW4gY2FsbGluZyB0aGUgQ2FyZHMgQVBJLlxuICogQHJldHVybnMgQmVhcmVyIHRva2VuIHRoYXQgYXV0aG9yaXplcyBBUEkgcmVxdWVzdHMgZm9yIHRoaXMgZXhlY3V0aW9uIGNvbnRleHQuXG4gKiBAdGhyb3dzIEVycm9yIGlmIEFQSV9BQ0NFU1NfVE9LRU4gaXMgbWlzc2luZyBvciBlbXB0eVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGNvbnN0IHRva2VuID0gZ2V0QXBpQWNjZXNzVG9rZW4oKTtcbiAqIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZmV0Y2goYXBpVXJsLCB7XG4gKiAgIGhlYWRlcnM6IHsgQXV0aG9yaXphdGlvbjogYEJlYXJlciAke3Rva2VufWAgfVxuICogfSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldEFwaUFjY2Vzc1Rva2VuKCk6IHN0cmluZyB7XG4gIGNvbnN0IHZhbHVlID0gcHJvY2Vzcy5lbnZbQ0FSRFNfRU5WX1ZBUlMuQVBJX0FDQ0VTU19UT0tFTl07XG4gIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IHZhbHVlID09PSAnJykge1xuICAgIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyByZXF1aXJlZCBlbnZpcm9ubWVudCB2YXJpYWJsZTogJHtDQVJEU19FTlZfVkFSUy5BUElfQUNDRVNTX1RPS0VOfWApO1xuICB9XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuLyoqXG4gKiBSZWFkcyB0aGUgY29uZmlndXJlZCBjb2RpbmcgYWdlbnQgaWRlbnRpZmllciBmcm9tIHRoZSBlbnZpcm9ubWVudC5cbiAqXG4gKiBPcHRpb25hbCB2YWx1ZSBmcm9tIGNhcmRzLmNvZGluZ0FnZW50IHNldHRpbmcuIFdoZW4gc2V0LCBpbmRpY2F0ZXMgd2hpY2ggQUlcbiAqIGNvZGluZyBhc3Npc3RhbnQgdGhlIHVzZXIgcHJlZmVycy4gQWN0aW9ucyBjYW4gdXNlIHRoaXMgdG8gY3VzdG9taXplIGJlaGF2aW9yXG4gKiBvciBwcm9tcHRzIGZvciBkaWZmZXJlbnQgYWdlbnRzLlxuICogQHJldHVybnMgVGhlIGNvZGluZyBhZ2VudCBpZGVudGlmaWVyLCBvciB1bmRlZmluZWQgaWYgbm90IHNldFxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGNvbnN0IGNvZGluZ0FnZW50ID0gZ2V0Q29kaW5nQWdlbnQoKTtcbiAqIGlmIChjb2RpbmdBZ2VudCA9PT0gJ2NsYXVkZScpIHtcbiAqICAgLy8gQ3VzdG9taXplIGZvciBDbGF1ZGVcbiAqIH1cbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0Q29kaW5nQWdlbnQoKTogc3RyaW5nIHwgdW5kZWZpbmVkIHtcbiAgY29uc3QgdmFsdWUgPSBwcm9jZXNzLmVudltDQVJEU19FTlZfVkFSUy5DT0RJTkdfQUdFTlRdO1xuICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gJycpIHtcbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuLyoqXG4gKiBSZWFkcyB0aGUgcmVnaXN0ZXJlZCB0eXBlIG5hbWUgZm9yIHR5cGUgaG9va3MuXG4gKlxuICogVGhpcyB2YWx1ZSBpcyBvbmx5IHByZXNlbnQgZm9yIHR5cGUgaG9vayBldmVudHMuXG4gKiBAcmV0dXJucyBUaGUgcmVnaXN0ZXJlZCB0eXBlIG5hbWVcbiAqIEB0aHJvd3MgRXJyb3IgaWYgVFlQRV9OQU1FIGlzIG1pc3Npbmcgb3IgZW1wdHlcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBjb25zdCB0eXBlTmFtZSA9IGdldFR5cGVOYW1lKCk7XG4gKiBjb25zb2xlLmxvZyhgVHlwZTogJHt0eXBlTmFtZX1gKTtcbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0VHlwZU5hbWUoKTogc3RyaW5nIHtcbiAgY29uc3QgdmFsdWUgPSBwcm9jZXNzLmVudltDQVJEU19FTlZfVkFSUy5UWVBFX05BTUVdO1xuICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gJycpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYE1pc3NpbmcgcmVxdWlyZWQgZW52aXJvbm1lbnQgdmFyaWFibGU6ICR7Q0FSRFNfRU5WX1ZBUlMuVFlQRV9OQU1FfWApO1xuICB9XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuLyoqXG4gKiBSZWFkcyB0aGUgdHlwZSB2ZXJzaW9uIGZyb20gdGhlIGVudmlyb25tZW50LlxuICpcbiAqIFRoaXMgdmVyc2lvbiBjb21lcyBmcm9tIHRoZSB0eXBlIGNvbmZpZ3VyYXRpb24gaW4gc2V0dGluZ3MuanNvbi5cbiAqIEByZXR1cm5zIFRoZSB2ZXJzaW9uIHN0cmluZyBmcm9tIHR5cGUgY29uZmlnXG4gKiBAdGhyb3dzIEVycm9yIGlmIFRZUEVfVkVSU0lPTiBpcyBtaXNzaW5nIG9yIGVtcHR5XG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogY29uc3QgdmVyc2lvbiA9IGdldFR5cGVWZXJzaW9uKCk7XG4gKiBjb25zb2xlLmxvZyhgVmVyc2lvbjogJHt2ZXJzaW9ufWApO1xuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRUeXBlVmVyc2lvbigpOiBzdHJpbmcge1xuICBjb25zdCB2YWx1ZSA9IHByb2Nlc3MuZW52W0NBUkRTX0VOVl9WQVJTLlRZUEVfVkVSU0lPTl07XG4gIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IHZhbHVlID09PSAnJykge1xuICAgIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyByZXF1aXJlZCBlbnZpcm9ubWVudCB2YXJpYWJsZTogJHtDQVJEU19FTlZfVkFSUy5UWVBFX1ZFUlNJT059YCk7XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG4vKipcbiAqIFJlYWRzIHRoZSB0eXBlZCBmaWxlIG5hbWUgZm9yIHR5cGUgaG9vayBldmVudHMuXG4gKlxuICogVGhpcyBpcyB0aGUgZmlsZSBuYW1lIHJlbGF0aXZlIHRvIHRoZSB0eXBlIGRpcmVjdG9yeSwgbm90IGEgZnVsbCBwYXRoLlxuICogQHJldHVybnMgVGhlIGZpbGUgbmFtZSB3aXRoaW4gdGhlIHR5cGUgZGlyZWN0b3J5XG4gKiBAdGhyb3dzIEVycm9yIGlmIEZJTEVfTkFNRSBpcyBtaXNzaW5nIG9yIGVtcHR5XG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogY29uc3QgZmlsZU5hbWUgPSBnZXRGaWxlTmFtZSgpO1xuICogY29uc29sZS5sb2coYEZpbGU6ICR7ZmlsZU5hbWV9YCk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldEZpbGVOYW1lKCk6IHN0cmluZyB7XG4gIGNvbnN0IHZhbHVlID0gcHJvY2Vzcy5lbnZbQ0FSRFNfRU5WX1ZBUlMuRklMRV9OQU1FXTtcbiAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQgfHwgdmFsdWUgPT09ICcnKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIHJlcXVpcmVkIGVudmlyb25tZW50IHZhcmlhYmxlOiAke0NBUkRTX0VOVl9WQVJTLkZJTEVfTkFNRX1gKTtcbiAgfVxuICByZXR1cm4gdmFsdWU7XG59XG5cbi8qKlxuICogUmVhZHMgdGhlIGFic29sdXRlIHBhdGggdG8gdGhlIHR5cGVkIGZpbGUuXG4gKlxuICogVGhpcyBpcyB0aGUgZnVsbHkgcmVzb2x2ZWQgcGF0aCBvbiBkaXNrIHByb3ZpZGVkIGJ5IHRoZSBleGVjdXRpb24gd3JhcHBlci5cbiAqIEByZXR1cm5zIFRoZSBmdWxsIHBhdGggdG8gdGhlIGZpbGVcbiAqIEB0aHJvd3MgRXJyb3IgaWYgRklMRV9QQVRIIGlzIG1pc3Npbmcgb3IgZW1wdHlcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBjb25zdCBmaWxlUGF0aCA9IGdldEZpbGVQYXRoKCk7XG4gKiBjb25zb2xlLmxvZyhgUGF0aDogJHtmaWxlUGF0aH1gKTtcbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0RmlsZVBhdGgoKTogc3RyaW5nIHtcbiAgY29uc3QgdmFsdWUgPSBwcm9jZXNzLmVudltDQVJEU19FTlZfVkFSUy5GSUxFX1BBVEhdO1xuICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gJycpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYE1pc3NpbmcgcmVxdWlyZWQgZW52aXJvbm1lbnQgdmFyaWFibGU6ICR7Q0FSRFNfRU5WX1ZBUlMuRklMRV9QQVRIfWApO1xuICB9XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuLyoqXG4gKiBSZWFkcyB0aGUgdHlwZWQgZmlsZSBzaXplIGZyb20gdGhlIGVudmlyb25tZW50LlxuICpcbiAqIFRoZSB2YWx1ZSBpcyBwYXJzZWQgYXMgYSBiYXNlLTEwIGludGVnZXIuXG4gKiBAcmV0dXJucyBUaGUgZmlsZSBzaXplIGluIGJ5dGVzXG4gKiBAdGhyb3dzIEVycm9yIGlmIEZJTEVfU0laRSBpcyBtaXNzaW5nIG9yIG5vdCBhIG51bWJlclxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGNvbnN0IHNpemUgPSBnZXRGaWxlU2l6ZSgpO1xuICogY29uc29sZS5sb2coYFNpemU6ICR7c2l6ZX0gYnl0ZXNgKTtcbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0RmlsZVNpemUoKTogbnVtYmVyIHtcbiAgY29uc3QgdmFsdWUgPSBwcm9jZXNzLmVudltDQVJEU19FTlZfVkFSUy5GSUxFX1NJWkVdO1xuICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gJycpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYE1pc3NpbmcgcmVxdWlyZWQgZW52aXJvbm1lbnQgdmFyaWFibGU6ICR7Q0FSRFNfRU5WX1ZBUlMuRklMRV9TSVpFfWApO1xuICB9XG4gIGNvbnN0IHNpemUgPSBOdW1iZXIucGFyc2VJbnQodmFsdWUsIDEwKTtcbiAgaWYgKE51bWJlci5pc05hTihzaXplKSkge1xuICAgIHRocm93IG5ldyBFcnJvcihgSW52YWxpZCAke0NBUkRTX0VOVl9WQVJTLkZJTEVfU0laRX06IGV4cGVjdGVkIG51bWJlciwgZ290IFwiJHt2YWx1ZX1cImApO1xuICB9XG4gIHJldHVybiBzaXplO1xufVxuXG4vKipcbiAqIFJlYWRzIHRoZSBTSEEyNTYgaGFzaCBmb3IgdGhlIHR5cGVkIGZpbGUgY29udGVudC5cbiAqXG4gKiBVc2VmdWwgZm9yIGRldGVjdGluZyBjb250ZW50IGNoYW5nZXMgd2l0aG91dCByZWFkaW5nIHRoZSBmaWxlIGFnYWluLlxuICogQHJldHVybnMgVGhlIFNIQTI1NiBoYXNoIG9mIHRoZSBjb250ZW50XG4gKiBAdGhyb3dzIEVycm9yIGlmIFNIQTI1NiBpcyBtaXNzaW5nIG9yIGVtcHR5XG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogY29uc3QgaGFzaCA9IGdldFNoYTI1NigpO1xuICogY29uc29sZS5sb2coYEhhc2g6ICR7aGFzaH1gKTtcbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0U2hhMjU2KCk6IHN0cmluZyB7XG4gIGNvbnN0IHZhbHVlID0gcHJvY2Vzcy5lbnZbQ0FSRFNfRU5WX1ZBUlMuU0hBMjU2XTtcbiAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQgfHwgdmFsdWUgPT09ICcnKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIHJlcXVpcmVkIGVudmlyb25tZW50IHZhcmlhYmxlOiAke0NBUkRTX0VOVl9WQVJTLlNIQTI1Nn1gKTtcbiAgfVxuICByZXR1cm4gdmFsdWU7XG59XG5cbi8qKlxuICogUmVhZHMgdGhlIE1JTUUgdHlwZSBmb3IgdGhlIHR5cGVkIGZpbGUgY29udGVudC5cbiAqXG4gKiBQcm92aWRlZCBmb3IgdHlwZSBob29rIGV2ZW50cyBzbyB2YWxpZGF0b3JzIGNhbiBicmFuY2ggb24gY29udGVudCB0eXBlLlxuICogQHJldHVybnMgVGhlIE1JTUUgdHlwZSBvZiB0aGUgY29udGVudFxuICogQHRocm93cyBFcnJvciBpZiBDT05URU5UX1RZUEUgaXMgbWlzc2luZyBvciBlbXB0eVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGNvbnN0IGNvbnRlbnRUeXBlID0gZ2V0Q29udGVudFR5cGUoKTtcbiAqIGNvbnNvbGUubG9nKGBDb250ZW50IHR5cGU6ICR7Y29udGVudFR5cGV9YCk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldENvbnRlbnRUeXBlKCk6IHN0cmluZyB7XG4gIGNvbnN0IHZhbHVlID0gcHJvY2Vzcy5lbnZbQ0FSRFNfRU5WX1ZBUlMuQ09OVEVOVF9UWVBFXTtcbiAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQgfHwgdmFsdWUgPT09ICcnKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIHJlcXVpcmVkIGVudmlyb25tZW50IHZhcmlhYmxlOiAke0NBUkRTX0VOVl9WQVJTLkNPTlRFTlRfVFlQRX1gKTtcbiAgfVxuICByZXR1cm4gdmFsdWU7XG59XG5cbi8qKlxuICogUmVhZHMgdGhlIFZTIENvZGUgYnVuZGxlZCBOb2RlLmpzIGludGVycHJldGVyIHBhdGggZnJvbSB0aGUgZW52aXJvbm1lbnQuXG4gKlxuICogVGhpcyBpcyBzZXQgYnkgdGhlIGV4dGVuc2lvbiBkdXJpbmcgYWN0aXZhdGlvbiBhbmQgaW5qZWN0ZWQgaW50byBhbGxcbiAqIHNwYXduZWQgYWN0aW9uL2hvb2sgcHJvY2Vzc2VzLiBDb25maWd1cmF0aW9uIGF1dGhvcnMgY2FuIHVzZSBpdCB0byBpbnZva2VcbiAqIE5vZGUuanMgd2l0aG91dCByZWx5aW5nIG9uIHRoZSBzeXN0ZW0gUEFUSC5cbiAqXG4gKiBAcmV0dXJucyBUaGUgcGF0aCB0byB0aGUgTm9kZS5qcyBpbnRlcnByZXRlclxuICogQHRocm93cyBFcnJvciBpZiBWU0NPREVfTk9ERSBpcyBtaXNzaW5nIG9yIGVtcHR5XG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogY29uc3Qgbm9kZVBhdGggPSBnZXRWc2NvZGVOb2RlUGF0aCgpO1xuICogZXhlY0ZpbGVTeW5jKG5vZGVQYXRoLCBbJ3NjcmlwdC5qcyddKTtcbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0VnNjb2RlTm9kZVBhdGgoKTogc3RyaW5nIHtcbiAgY29uc3QgdmFsdWUgPSBwcm9jZXNzLmVudltDQVJEU19FTlZfVkFSUy5WU0NPREVfTk9ERV07XG4gIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IHZhbHVlID09PSAnJykge1xuICAgIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyByZXF1aXJlZCBlbnZpcm9ubWVudCB2YXJpYWJsZTogJHtDQVJEU19FTlZfVkFSUy5WU0NPREVfTk9ERX1gKTtcbiAgfVxuICByZXR1cm4gdmFsdWU7XG59XG5cbi8qKlxuICogUmVhZHMgdGhlIFVuaXggZG9tYWluIHNvY2tldCBwYXRoIGZvciBydW50aW1lLXRvLWRpc3BhdGNoZXIgY29tbXVuaWNhdGlvbi5cbiAqXG4gKiBAcmV0dXJucyBVbml4IHNvY2tldCBwYXRoIHVzZWQgdG8gc2VuZCBydW50aW1lIGNvbnRyb2wgbWVzc2FnZXMuXG4gKiBAdGhyb3dzIEVycm9yIGlmIFNPQ0tFVF9QQVRIIGlzIG1pc3Npbmcgb3IgZW1wdHlcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldFNvY2tldFBhdGgoKTogc3RyaW5nIHtcbiAgY29uc3QgdmFsdWUgPSBwcm9jZXNzLmVudltDQVJEU19FTlZfVkFSUy5TT0NLRVRfUEFUSF07XG4gIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IHZhbHVlID09PSAnJykge1xuICAgIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyByZXF1aXJlZCBlbnZpcm9ubWVudCB2YXJpYWJsZTogJHtDQVJEU19FTlZfVkFSUy5TT0NLRVRfUEFUSH1gKTtcbiAgfVxuICByZXR1cm4gdmFsdWU7XG59XG5cbi8qKlxuICogUmVhZHMgdGhlIHBhdGggdG8gdGhlIHN3aXRjaFRvSW50ZXJhY3RpdmUgZGF0YSBmaWxlLlxuICpcbiAqIFRoaXMgaXMgb3B0aW9uYWwgXHUyMDE0IHJldHVybnMgdW5kZWZpbmVkIHdoZW4gbm90IHNldCAoaS5lLiwgdGhlIGFjdGlvblxuICogd2FzIG5vdCByZWxhdW5jaGVkIHZpYSBzd2l0Y2hUb0ludGVyYWN0aXZlKS5cbiAqXG4gKiBAcmV0dXJucyBUaGUgZmlsZSBwYXRoLCBvciB1bmRlZmluZWQgaWYgbm90IHNldFxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0U3dpdGNoVG9JbnRlcmFjdGl2ZURhdGFQYXRoKCk6IHN0cmluZyB8IHVuZGVmaW5lZCB7XG4gIGNvbnN0IHZhbHVlID0gcHJvY2Vzcy5lbnZbQ0FSRFNfRU5WX1ZBUlMuU1dJVENIX1RPX0lOVEVSQUNUSVZFX0RBVEFfUEFUSF07XG4gIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IHZhbHVlID09PSAnJykge1xuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG4vKipcbiAqIFJlYWRzIHRoZSBzZXR0aW5ncyBjb25maWd1cmF0aW9uIGRpcmVjdG9yeSBwYXRoLlxuICpcbiAqIEByZXR1cm5zIEFic29sdXRlIHBhdGggdG8gdGhlIGRpcmVjdG9yeSBjb250YWluaW5nIGdlbmVyYXRlZCBzZXR0aW5ncyBhcnRpZmFjdHMuXG4gKiBAdGhyb3dzIEVycm9yIGlmIENPTkZJR19QQVRIIGlzIG1pc3Npbmcgb3IgZW1wdHlcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldENvbmZpZ1BhdGgoKTogc3RyaW5nIHtcbiAgY29uc3QgdmFsdWUgPSBwcm9jZXNzLmVudltDQVJEU19FTlZfVkFSUy5DT05GSUdfUEFUSF07XG4gIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IHZhbHVlID09PSAnJykge1xuICAgIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyByZXF1aXJlZCBlbnZpcm9ubWVudCB2YXJpYWJsZTogJHtDQVJEU19FTlZfVkFSUy5DT05GSUdfUEFUSH1gKTtcbiAgfVxuICByZXR1cm4gdmFsdWU7XG59XG5cbi8qKlxuICogUmVhZHMgdGhlIHdvcmtzcGFjZSBwYXRoIHNldCBieSB0aGUgYWN0aW9uIGhhbmRsZXIgKGUuZy4sIHRoZSB3b3JrdHJlZSBwYXRoKS5cbiAqXG4gKiBUaGlzIGlzIGZvciBob29rcyBydW5uaW5nIGluc2lkZSB0aGUgQ2xhdWRlIENMSSwgKipub3QqKiBmb3IgYWN0aW9uIGhhbmRsZXJzLlxuICogQWN0aW9uIGhhbmRsZXJzIHNob3VsZCB1c2Uge0BsaW5rIGdldFJlcG9Sb290fSBpbnN0ZWFkLlxuICpcbiAqIEByZXR1cm5zIEFic29sdXRlIHBhdGggdG8gdGhlIGFjdGl2ZSB3b3Jrc3BhY2UgLyB3b3JrdHJlZS5cbiAqIEB0aHJvd3MgRXJyb3IgaWYgV09SS1NQQUNFX1BBVEggaXMgbWlzc2luZyBvciBlbXB0eVxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0V29ya3NwYWNlUGF0aCgpOiBzdHJpbmcge1xuICBjb25zdCB2YWx1ZSA9IHByb2Nlc3MuZW52W0NBUkRTX0VOVl9WQVJTLldPUktTUEFDRV9QQVRIXTtcbiAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQgfHwgdmFsdWUgPT09ICcnKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIHJlcXVpcmVkIGVudmlyb25tZW50IHZhcmlhYmxlOiAke0NBUkRTX0VOVl9WQVJTLldPUktTUEFDRV9QQVRIfWApO1xuICB9XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuLyoqXG4gKiBSZWFkcyB0aGUgbWFpbiBnaXQgcmVwb3NpdG9yeSByb290IHBhdGguXG4gKlxuICogU2V0IGJ5IEFjdGlvbkRpc3BhdGNoZXI7IHVzZWQgYnkgYWN0aW9uIGhhbmRsZXJzIHRvIHJlc29sdmUgd29ya3RyZWVzXG4gKiBhbmQgcGVyZm9ybSBnaXQgb3BlcmF0aW9ucyBhZ2FpbnN0IHRoZSBtYWluIHJlcG9zaXRvcnkuXG4gKlxuICogQHJldHVybnMgQWJzb2x1dGUgcGF0aCB0byB0aGUgbWFpbiBnaXQgcmVwb3NpdG9yeSByb290IChOT1QgYSB3b3JrdHJlZSkuXG4gKiBAdGhyb3dzIEVycm9yIGlmIFJFUE9fUk9PVCBpcyBtaXNzaW5nIG9yIGVtcHR5XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRSZXBvUm9vdCgpOiBzdHJpbmcge1xuICBjb25zdCB2YWx1ZSA9IHByb2Nlc3MuZW52W0NBUkRTX0VOVl9WQVJTLlJFUE9fUk9PVF07XG4gIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IHZhbHVlID09PSAnJykge1xuICAgIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyByZXF1aXJlZCBlbnZpcm9ubWVudCB2YXJpYWJsZTogJHtDQVJEU19FTlZfVkFSUy5SRVBPX1JPT1R9YCk7XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG4vKipcbiAqIFJlYWRzIHRoZSBjYXJkJ3MgcmVwb3NpdG9yeSBkaXJlY3RvcnkgcGF0aC5cbiAqXG4gKiBAcmV0dXJucyBBYnNvbHV0ZSBwYXRoIHRvIHRoZSByZXBvc2l0b3J5IGFzc29jaWF0ZWQgd2l0aCB0aGUgYWN0aXZlIGNhcmQuXG4gKiBAdGhyb3dzIEVycm9yIGlmIENBUkRfUkVQT19QQVRIIGlzIG1pc3Npbmcgb3IgZW1wdHlcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldENhcmRSZXBvUGF0aCgpOiBzdHJpbmcge1xuICBjb25zdCB2YWx1ZSA9IHByb2Nlc3MuZW52W0NBUkRTX0VOVl9WQVJTLkNBUkRfUkVQT19QQVRIXTtcbiAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQgfHwgdmFsdWUgPT09ICcnKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIHJlcXVpcmVkIGVudmlyb25tZW50IHZhcmlhYmxlOiAke0NBUkRTX0VOVl9WQVJTLkNBUkRfUkVQT19QQVRIfWApO1xuICB9XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuLyoqXG4gKiBSZWFkcyB0aGUgVlMgQ29kZSBleHRlbnNpb24gaW5zdGFsbGF0aW9uIGRpcmVjdG9yeSBwYXRoLlxuICpcbiAqIFNldCBieSB0aGUgZXh0ZW5zaW9uIGhvc3QgZnJvbSBgY29udGV4dC5leHRlbnNpb25VcmkuZnNQYXRoYCBhbmQgaW5qZWN0ZWRcbiAqIGludG8gYWxsIHNwYXduZWQgYWN0aW9uIHByb2Nlc3Nlcy4gVXNlIHRoaXMgdG8gbG9jYXRlIGJ1bmRsZWQgYXNzZXRzIHN1Y2hcbiAqIGFzIHRoZSBydW50aW1lIHBsdWdpbiBkaXJlY3RvcnkgKGA8ZXh0ZW5zaW9uUGF0aD4vZGlzdC9wbHVnaW5zL3J1bnRpbWVgKS5cbiAqXG4gKiBAcmV0dXJucyBBYnNvbHV0ZSBwYXRoIHRvIHRoZSBleHRlbnNpb24gaW5zdGFsbGF0aW9uIGRpcmVjdG9yeS5cbiAqIEB0aHJvd3MgRXJyb3IgaWYgRVhURU5TSU9OX1BBVEggaXMgbWlzc2luZyBvciBlbXB0eVxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0RXh0ZW5zaW9uUGF0aCgpOiBzdHJpbmcge1xuICBjb25zdCB2YWx1ZSA9IHByb2Nlc3MuZW52W0NBUkRTX0VOVl9WQVJTLkVYVEVOU0lPTl9QQVRIXTtcbiAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQgfHwgdmFsdWUgPT09ICcnKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIHJlcXVpcmVkIGVudmlyb25tZW50IHZhcmlhYmxlOiAke0NBUkRTX0VOVl9WQVJTLkVYVEVOU0lPTl9QQVRIfWApO1xuICB9XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuLyoqXG4gKiBSZWFkcyBhbmQgcGFyc2VzIHRoZSBzd2l0Y2hUb0ludGVyYWN0aXZlIGRhdGEgZmlsZS5cbiAqXG4gKiBXaGVuIGBTV0lUQ0hfVE9fSU5URVJBQ1RJVkVfREFUQV9QQVRIYCBpcyBzZXQsIHJlYWRzIHRoZSBmaWxlIGF0IHRoYXQgcGF0aFxuICogYW5kIHBhcnNlcyBpdCBhcyBKU09OLiBSZXR1cm5zIHVuZGVmaW5lZCBpZiB0aGUgZW52IHZhciBpcyBub3Qgc2V0LlxuICpcbiAqIEByZXR1cm5zIFRoZSBwYXJzZWQgZGF0YSwgb3IgdW5kZWZpbmVkIGlmIHRoZSBwYXRoIGlzIG5vdCBzZXRcbiAqIEB0aHJvd3MgRXJyb3IgaWYgdGhlIGZpbGUgY2Fubm90IGJlIHJlYWQgb3IgY29udGFpbnMgaW52YWxpZCBKU09OXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiByZWFkU3dpdGNoVG9JbnRlcmFjdGl2ZURhdGEoKTogdW5rbm93biB8IHVuZGVmaW5lZCB7XG4gIGNvbnN0IGRhdGFQYXRoID0gZ2V0U3dpdGNoVG9JbnRlcmFjdGl2ZURhdGFQYXRoKCk7XG4gIGlmIChkYXRhUGF0aCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfVxuICBjb25zdCBjb250ZW50ID0gcmVhZEZpbGVTeW5jKGRhdGFQYXRoLCAndXRmLTgnKTtcbiAgcmV0dXJuIEpTT04ucGFyc2UoY29udGVudCk7XG59XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIFR5cGVkIElucHV0IEV4dHJhY3Rpb25cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuLyoqXG4gKiBCdWlsZHMgYSB0eXBlZCBhY3Rpb24gaW5wdXQgb2JqZWN0IGZyb20gZW52aXJvbm1lbnQgdmFyaWFibGVzLlxuICpcbiAqIEV4dHJhY3RzIGFsbCBmaWVsZHMgcmVxdWlyZWQgZm9yIGFjdGlvbiBoYW5kbGVycy5cbiAqXG4gKiBAcmV0dXJucyBUeXBlZCBBY3Rpb25JbnB1dCBvYmplY3RcbiAqIEB0aHJvd3MgRXJyb3IgaWYgcmVxdWlyZWQgZW52IHZhcnMgYXJlIG1pc3Npbmcgb3IgaW52YWxpZFxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIC8vIEZvciBhbiBhY3Rpb24gaGFuZGxlclxuICogY29uc3QgaW5wdXQgPSBleHRyYWN0QWN0aW9uSW5wdXQoKTtcbiAqIGNvbnNvbGUubG9nKGlucHV0LmNhcmRJZCk7XG4gKiBjb25zb2xlLmxvZyhpbnB1dC5leGVjdXRpb25Nb2RlKTtcbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gZXh0cmFjdEFjdGlvbklucHV0KCk6IEFjdGlvbklucHV0IHtcbiAgcmV0dXJuIHtcbiAgICBjYXJkSWQ6IGdldENhcmRJZCgpLFxuICAgIGFjdGlvbk5hbWU6IGdldEFjdGlvbk5hbWUoKSxcbiAgICBlbnZpcm9ubWVudDogZ2V0RW52aXJvbm1lbnQoKSxcbiAgICBleGVjdXRpb25Nb2RlOiBnZXRFeGVjdXRpb25Nb2RlKCksXG4gICAgYXBpQmFzZVVybDogZ2V0QXBpQmFzZVVybCgpLFxuICAgIGFwaUFjY2Vzc1Rva2VuOiBnZXRBcGlBY2Nlc3NUb2tlbigpLFxuICAgIGNvZGluZ0FnZW50OiBnZXRDb2RpbmdBZ2VudCgpLFxuICAgIHN3aXRjaFRvSW50ZXJhY3RpdmVEYXRhOiByZWFkU3dpdGNoVG9JbnRlcmFjdGl2ZURhdGEoKSxcbiAgICByZXBvUm9vdDogZ2V0UmVwb1Jvb3QoKSxcbiAgICBjYXJkUmVwb1BhdGg6IGdldENhcmRSZXBvUGF0aCgpLFxuICAgIGNvbmZpZ1BhdGg6IGdldENvbmZpZ1BhdGgoKSxcbiAgICBleHRlbnNpb25QYXRoOiBnZXRFeHRlbnNpb25QYXRoKClcbiAgfTtcbn1cblxuLyoqXG4gKiBCdWlsZHMgYSB0eXBlZCB0eXBlIGhvb2sgaW5wdXQgb2JqZWN0IGZyb20gZW52aXJvbm1lbnQgdmFyaWFibGVzLlxuICpcbiAqIEV4dHJhY3RzIGFsbCBmaWVsZHMgcmVxdWlyZWQgZm9yIHR5cGUgbGlmZWN5Y2xlIGhvb2tzICh2YWxpZGF0b3IsIGNyZWF0ZSxcbiAqIHVwZGF0ZSwgZGVsZXRlKS5cbiAqXG4gKiBAcmV0dXJucyBUeXBlZCBUeXBlSG9va0lucHV0IG9iamVjdFxuICogQHRocm93cyBFcnJvciBpZiByZXF1aXJlZCBlbnYgdmFycyBhcmUgbWlzc2luZyBvciBpbnZhbGlkXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogLy8gRm9yIGEgdHlwZSBob29rIGhhbmRsZXJcbiAqIGNvbnN0IGlucHV0ID0gZXh0cmFjdFR5cGVJbnB1dCgpO1xuICogY29uc29sZS5sb2coaW5wdXQudHlwZU5hbWUpO1xuICogY29uc29sZS5sb2coaW5wdXQuZmlsZU5hbWUpO1xuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBleHRyYWN0VHlwZUlucHV0KCk6IFR5cGVIb29rSW5wdXQge1xuICByZXR1cm4ge1xuICAgIGNhcmRJZDogZ2V0Q2FyZElkKCksXG4gICAgZW52aXJvbm1lbnQ6IGdldEVudmlyb25tZW50KCksXG4gICAgdHlwZU5hbWU6IGdldFR5cGVOYW1lKCksXG4gICAgdHlwZVZlcnNpb246IGdldFR5cGVWZXJzaW9uKCksXG4gICAgZmlsZU5hbWU6IGdldEZpbGVOYW1lKCksXG4gICAgZmlsZVBhdGg6IGdldEZpbGVQYXRoKCksXG4gICAgZmlsZVNpemU6IGdldEZpbGVTaXplKCksXG4gICAgZmlsZVNoYTI1NjogZ2V0U2hhMjU2KCksXG4gICAgY29udGVudFR5cGU6IGdldENvbnRlbnRUeXBlKCksXG4gICAgYXBpQmFzZVVybDogZ2V0QXBpQmFzZVVybCgpLFxuICAgIGFwaUFjY2Vzc1Rva2VuOiBnZXRBcGlBY2Nlc3NUb2tlbigpXG4gIH07XG59XG4iLCAiLyoqXG4gKiBFbnZpcm9ubWVudCB2YXJpYWJsZSB1dGlsaXRpZXMgZm9yIENsYXVkZSBDb2RlIGhvb2tzLlxuICpcbiAqIFByb3ZpZGVzIHR5cGVkIGFjY2VzcyB0byBDbGF1ZGUgQ29kZSdzIGVudmlyb25tZW50IHZhcmlhYmxlcyBhbmQgdXRpbGl0aWVzXG4gKiBmb3IgcGVyc2lzdGluZyBlbnZpcm9ubWVudCB2YXJpYWJsZXMgaW4gU2Vzc2lvblN0YXJ0IGhvb2tzLlxuICpcbiAqICMjIEVudmlyb25tZW50IFZhcmlhYmxlc1xuICpcbiAqIENsYXVkZSBDb2RlIHNldHMgdGhlc2UgZW52aXJvbm1lbnQgdmFyaWFibGVzIHdoZW4gcnVubmluZyBob29rczpcbiAqXG4gKiB8IFZhcmlhYmxlIHwgRGVzY3JpcHRpb24gfCBBdmFpbGFibGUgSW4gfFxuICogfC0tLS0tLS0tLS18LS0tLS0tLS0tLS0tLXwtLS0tLS0tLS0tLS0tLXxcbiAqIHwgYENMQVVERV9QUk9KRUNUX0RJUmAgfCBBYnNvbHV0ZSBwYXRoIHRvIHByb2plY3Qgcm9vdCB8IEFsbCBob29rcyB8XG4gKiB8IGBDTEFVREVfRU5WX0ZJTEVgIHwgUGF0aCB0byBmaWxlIGZvciBwZXJzaXN0aW5nIGVudiB2YXJzIHwgU2Vzc2lvblN0YXJ0IG9ubHkgfFxuICogfCBgQ0xBVURFX0NPREVfUkVNT1RFYCB8IGBcInRydWVcImAgaWYgcnVubmluZyByZW1vdGVseSB8IEFsbCBob29rcyB8XG4gKiBAbW9kdWxlXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogaW1wb3J0IHsgZ2V0UHJvamVjdERpciwgcGVyc2lzdEVudlZhciwgaXNSZW1vdGVFbnZpcm9ubWVudCB9IGZyb20gJ0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcyc7XG4gKlxuICogLy8gR2V0IHByb2plY3QgZGlyZWN0b3J5XG4gKiBjb25zdCBwcm9qZWN0RGlyID0gZ2V0UHJvamVjdERpcigpO1xuICpcbiAqIC8vIENoZWNrIGlmIHJ1bm5pbmcgcmVtb3RlbHlcbiAqIGlmIChpc1JlbW90ZUVudmlyb25tZW50KCkpIHtcbiAqICAgLy8gSGFuZGxlIHJlbW90ZS1zcGVjaWZpYyBsb2dpY1xuICogfVxuICpcbiAqIC8vIEluIFNlc3Npb25TdGFydCBob29rOiBwZXJzaXN0IGVudmlyb25tZW50IHZhcmlhYmxlc1xuICogcGVyc2lzdEVudlZhcignTk9ERV9FTlYnLCAncHJvZHVjdGlvbicpO1xuICogcGVyc2lzdEVudlZhcignQVBJX0tFWScsICdzZWNyZXQta2V5Jyk7XG4gKiBgYGBcbiAqIEBzZWUgaHR0cHM6Ly9jb2RlLmNsYXVkZS5jb20vZG9jcy9lbi9ob29rcyNob29rLWV4ZWN1dGlvbi1kZXRhaWxzXG4gKi9cbmltcG9ydCAqIGFzIGZzIGZyb20gXCJub2RlOmZzXCI7XG4vKipcbiAqIENsYXVkZSBDb2RlIGVudmlyb25tZW50IHZhcmlhYmxlIG5hbWVzLlxuICpcbiAqIFRoZXNlIGFyZSB0aGUgZW52aXJvbm1lbnQgdmFyaWFibGVzIHRoYXQgQ2xhdWRlIENvZGUgc2V0cyB3aGVuIHJ1bm5pbmcgaG9va3MuXG4gKi9cbmV4cG9ydCBjb25zdCBDTEFVREVfRU5WX1ZBUlMgPSB7XG4gICAgLyoqXG4gICAgICogQWJzb2x1dGUgcGF0aCB0byB0aGUgcHJvamVjdCByb290IGRpcmVjdG9yeSB3aGVyZSBDbGF1ZGUgQ29kZSB3YXMgc3RhcnRlZC5cbiAgICAgKiBBdmFpbGFibGUgaW4gYWxsIGhvb2tzLlxuICAgICAqL1xuICAgIFBST0pFQ1RfRElSOiBcIkNMQVVERV9QUk9KRUNUX0RJUlwiLFxuICAgIC8qKlxuICAgICAqIFBhdGggdG8gYSBmaWxlIHdoZXJlIFNlc3Npb25TdGFydCBob29rcyBjYW4gcGVyc2lzdCBlbnZpcm9ubWVudCB2YXJpYWJsZXMuXG4gICAgICogVmFyaWFibGVzIHdyaXR0ZW4gdG8gdGhpcyBmaWxlIHdpbGwgYmUgYXZhaWxhYmxlIGluIGFsbCBzdWJzZXF1ZW50IGJhc2ggY29tbWFuZHMuXG4gICAgICogT25seSBhdmFpbGFibGUgaW4gU2Vzc2lvblN0YXJ0IGhvb2tzLlxuICAgICAqL1xuICAgIEVOVl9GSUxFOiBcIkNMQVVERV9FTlZfRklMRVwiLFxuICAgIC8qKlxuICAgICAqIFNldCB0byBcInRydWVcIiB3aGVuIHJ1bm5pbmcgaW4gYSByZW1vdGUgKHdlYikgZW52aXJvbm1lbnQuXG4gICAgICogTm90IHNldCBvciBlbXB0eSB3aGVuIHJ1bm5pbmcgaW4gbG9jYWwgQ0xJIGVudmlyb25tZW50LlxuICAgICAqL1xuICAgIFJFTU9URTogXCJDTEFVREVfQ09ERV9SRU1PVEVcIixcbn07XG4vKipcbiAqIEdldHMgdGhlIENsYXVkZSBDb2RlIHByb2plY3QgZGlyZWN0b3J5LlxuICpcbiAqIFRoaXMgaXMgdGhlIGFic29sdXRlIHBhdGggdG8gdGhlIHByb2plY3Qgcm9vdCB3aGVyZSBDbGF1ZGUgQ29kZSB3YXMgc3RhcnRlZC5cbiAqIFRoZSB2YWx1ZSBjb21lcyBmcm9tIHRoZSBgQ0xBVURFX1BST0pFQ1RfRElSYCBlbnZpcm9ubWVudCB2YXJpYWJsZS5cbiAqIEByZXR1cm5zIFRoZSBwcm9qZWN0IGRpcmVjdG9yeSBwYXRoLCBvciB1bmRlZmluZWQgaWYgbm90IHNldFxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGNvbnN0IHByb2plY3REaXIgPSBnZXRQcm9qZWN0RGlyKCk7XG4gKiBpZiAocHJvamVjdERpcikge1xuICogICBjb25zdCBjb25maWdQYXRoID0gYCR7cHJvamVjdERpcn0vLmNsYXVkZS9jb25maWcuanNvbmA7XG4gKiB9XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldFByb2plY3REaXIoKSB7XG4gICAgcmV0dXJuIHByb2Nlc3MuZW52W0NMQVVERV9FTlZfVkFSUy5QUk9KRUNUX0RJUl07XG59XG4vKipcbiAqIEdldHMgdGhlIENsYXVkZSBDb2RlIGVudiBmaWxlIHBhdGggZm9yIHBlcnNpc3RpbmcgZW52aXJvbm1lbnQgdmFyaWFibGVzLlxuICpcbiAqIFRoaXMgaXMgb25seSBhdmFpbGFibGUgaW4gU2Vzc2lvblN0YXJ0IGhvb2tzLiBUaGUgcGF0aCBwb2ludHMgdG8gYSBmaWxlXG4gKiB3aGVyZSB5b3UgY2FuIHdyaXRlIHNoZWxsIGV4cG9ydCBzdGF0ZW1lbnRzIHRvIHBlcnNpc3QgZW52aXJvbm1lbnQgdmFyaWFibGVzXG4gKiBmb3IgYWxsIHN1YnNlcXVlbnQgYmFzaCBjb21tYW5kcyBpbiB0aGUgc2Vzc2lvbi5cbiAqIEByZXR1cm5zIFRoZSBlbnYgZmlsZSBwYXRoLCBvciB1bmRlZmluZWQgaWYgbm90IHNldCAobm90IGEgU2Vzc2lvblN0YXJ0IGhvb2spXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogY29uc3QgZW52RmlsZSA9IGdldEVudkZpbGVQYXRoKCk7XG4gKiBpZiAoZW52RmlsZSkge1xuICogICAvLyBXZSdyZSBpbiBhIFNlc3Npb25TdGFydCBob29rIGFuZCBjYW4gcGVyc2lzdCBlbnYgdmFyc1xuICogICBwZXJzaXN0RW52VmFyKCdNWV9WQVInLCAnbXktdmFsdWUnKTtcbiAqIH1cbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0RW52RmlsZVBhdGgoKSB7XG4gICAgcmV0dXJuIHByb2Nlc3MuZW52W0NMQVVERV9FTlZfVkFSUy5FTlZfRklMRV07XG59XG4vKipcbiAqIENoZWNrcyBpZiB0aGUgaG9vayBpcyBydW5uaW5nIGluIGEgcmVtb3RlICh3ZWIpIGVudmlyb25tZW50LlxuICpcbiAqIFJlbW90ZSBlbnZpcm9ubWVudHMgbWF5IGhhdmUgZGlmZmVyZW50IGNhcGFiaWxpdGllcyBvciByZXN0cmljdGlvbnNcbiAqIGNvbXBhcmVkIHRvIGxvY2FsIENMSSBlbnZpcm9ubWVudHMuXG4gKiBAcmV0dXJucyB0cnVlIGlmIHJ1bm5pbmcgcmVtb3RlbHksIGZhbHNlIGlmIHJ1bm5pbmcgbG9jYWxseVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGlmIChpc1JlbW90ZUVudmlyb25tZW50KCkpIHtcbiAqICAgLy8gVXNlIHdlYi1jb21wYXRpYmxlIGFwcHJvYWNoZXNcbiAqIH0gZWxzZSB7XG4gKiAgIC8vIENhbiB1c2UgbG9jYWwgQ0xJIGZlYXR1cmVzXG4gKiB9XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzUmVtb3RlRW52aXJvbm1lbnQoKSB7XG4gICAgcmV0dXJuIHByb2Nlc3MuZW52W0NMQVVERV9FTlZfVkFSUy5SRU1PVEVdID09PSBcInRydWVcIjtcbn1cbi8qKlxuICogUGVyc2lzdHMgYW4gZW52aXJvbm1lbnQgdmFyaWFibGUgZm9yIHVzZSBpbiBzdWJzZXF1ZW50IGJhc2ggY29tbWFuZHMuXG4gKlxuICogVGhpcyBmdW5jdGlvbiB3cml0ZXMgYSBzaGVsbCBleHBvcnQgc3RhdGVtZW50IHRvIHRoZSBgQ0xBVURFX0VOVl9GSUxFYCxcbiAqIHdoaWNoIENsYXVkZSBDb2RlIHNvdXJjZXMgYmVmb3JlIHJ1bm5pbmcgYmFzaCBjb21tYW5kcy4gVGhpcyBhbGxvd3NcbiAqIFNlc3Npb25TdGFydCBob29rcyB0byBjb25maWd1cmUgdGhlIGVudmlyb25tZW50IGZvciB0aGUgZW50aXJlIHNlc3Npb24uXG4gKlxuICogKipJbXBvcnRhbnQqKjogVGhpcyBmdW5jdGlvbiBvbmx5IHdvcmtzIGluIFNlc3Npb25TdGFydCBob29rcyB3aGVyZVxuICogYENMQVVERV9FTlZfRklMRWAgaXMgc2V0LiBJbiBvdGhlciBob29rcywgaXQgd2lsbCB0aHJvdyBhbiBlcnJvci5cbiAqIEBwYXJhbSBuYW1lIC0gVGhlIGVudmlyb25tZW50IHZhcmlhYmxlIG5hbWVcbiAqIEBwYXJhbSB2YWx1ZSAtIFRoZSBlbnZpcm9ubWVudCB2YXJpYWJsZSB2YWx1ZSAod2lsbCBiZSBzaGVsbC1lc2NhcGVkKVxuICogQHRocm93cyBFcnJvciBpZiBDTEFVREVfRU5WX0ZJTEUgaXMgbm90IHNldCAobm90IGluIGEgU2Vzc2lvblN0YXJ0IGhvb2spXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogaW1wb3J0IHsgc2Vzc2lvblN0YXJ0SG9vaywgc2Vzc2lvblN0YXJ0T3V0cHV0LCBwZXJzaXN0RW52VmFyIH0gZnJvbSAnQGdvb2Rmb290L2NsYXVkZS1jb2RlLWhvb2tzJztcbiAqXG4gKiBleHBvcnQgZGVmYXVsdCBzZXNzaW9uU3RhcnRIb29rKHt9LCBhc3luYyAoaW5wdXQpID0+IHtcbiAqICAgLy8gUGVyc2lzdCBlbnZpcm9ubWVudCB2YXJpYWJsZXMgZm9yIHRoZSBzZXNzaW9uXG4gKiAgIHBlcnNpc3RFbnZWYXIoJ05PREVfRU5WJywgJ3Byb2R1Y3Rpb24nKTtcbiAqICAgcGVyc2lzdEVudlZhcignQVBJX0tFWScsIHByb2Nlc3MuZW52Lk1ZX0FQSV9LRVkgPz8gJ2RlZmF1bHQnKTtcbiAqICAgcGVyc2lzdEVudlZhcignUEFUSCcsIGAke3Byb2Nlc3MuZW52LlBBVEh9Oi4vbm9kZV9tb2R1bGVzLy5iaW5gKTtcbiAqXG4gKiAgIHJldHVybiBzZXNzaW9uU3RhcnRPdXRwdXQoe30pO1xuICogfSk7XG4gKiBgYGBcbiAqIEBzZWUgaHR0cHM6Ly9jb2RlLmNsYXVkZS5jb20vZG9jcy9lbi9ob29rcyNwZXJzaXN0aW5nLWVudmlyb25tZW50LXZhcmlhYmxlc1xuICovXG5leHBvcnQgZnVuY3Rpb24gcGVyc2lzdEVudlZhcihuYW1lLCB2YWx1ZSkge1xuICAgIGNvbnN0IGVudkZpbGUgPSBnZXRFbnZGaWxlUGF0aCgpO1xuICAgIGlmIChlbnZGaWxlID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwicGVyc2lzdEVudlZhciBjYW4gb25seSBiZSB1c2VkIGluIFNlc3Npb25TdGFydCBob29rcy4gXCIgKyBcIkNMQVVERV9FTlZfRklMRSBlbnZpcm9ubWVudCB2YXJpYWJsZSBpcyBub3Qgc2V0LlwiKTtcbiAgICB9XG4gICAgLy8gU2hlbGwtZXNjYXBlIHRoZSB2YWx1ZSB0byBoYW5kbGUgc3BlY2lhbCBjaGFyYWN0ZXJzXG4gICAgY29uc3QgZXNjYXBlZFZhbHVlID0gZXNjYXBlU2hlbGxWYWx1ZSh2YWx1ZSk7XG4gICAgLy8gV3JpdGUgdGhlIGV4cG9ydCBzdGF0ZW1lbnRcbiAgICBjb25zdCBleHBvcnRTdGF0ZW1lbnQgPSBgZXhwb3J0ICR7bmFtZX09JHtlc2NhcGVkVmFsdWV9XFxuYDtcbiAgICBmcy5hcHBlbmRGaWxlU3luYyhlbnZGaWxlLCBleHBvcnRTdGF0ZW1lbnQsIFwidXRmLThcIik7XG59XG4vKipcbiAqIFBlcnNpc3RzIG11bHRpcGxlIGVudmlyb25tZW50IHZhcmlhYmxlcyBhdCBvbmNlLlxuICpcbiAqIFRoaXMgaXMgYSBjb252ZW5pZW5jZSB3cmFwcGVyIGFyb3VuZCBgcGVyc2lzdEVudlZhcmAgZm9yIHNldHRpbmdcbiAqIG11bHRpcGxlIHZhcmlhYmxlcyBpbiBhIHNpbmdsZSBjYWxsLlxuICogQHBhcmFtIHZhcnMgLSBPYmplY3QgbWFwcGluZyB2YXJpYWJsZSBuYW1lcyB0byB2YWx1ZXNcbiAqIEB0aHJvd3MgRXJyb3IgaWYgQ0xBVURFX0VOVl9GSUxFIGlzIG5vdCBzZXQgKG5vdCBpbiBhIFNlc3Npb25TdGFydCBob29rKVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIHBlcnNpc3RFbnZWYXJzKHtcbiAqICAgTk9ERV9FTlY6ICdwcm9kdWN0aW9uJyxcbiAqICAgQVBJX0tFWTogJ3NlY3JldCcsXG4gKiAgIERFQlVHOiAnZmFsc2UnXG4gKiB9KTtcbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gcGVyc2lzdEVudlZhcnModmFycykge1xuICAgIGZvciAoY29uc3QgW25hbWUsIHZhbHVlXSBvZiBPYmplY3QuZW50cmllcyh2YXJzKSkge1xuICAgICAgICBwZXJzaXN0RW52VmFyKG5hbWUsIHZhbHVlKTtcbiAgICB9XG59XG4vKipcbiAqIEVzY2FwZXMgYSB2YWx1ZSBmb3Igc2FmZSB1c2UgaW4gYSBzaGVsbCBleHBvcnQgc3RhdGVtZW50LlxuICpcbiAqIFVzZXMgc2luZ2xlIHF1b3RlcyBhbmQgZXNjYXBlcyBhbnkgZW1iZWRkZWQgc2luZ2xlIHF1b3Rlcy5cbiAqIFRoaXMgcHJldmVudHMgc2hlbGwgaW5qZWN0aW9uIGFuZCBoYW5kbGVzIHNwZWNpYWwgY2hhcmFjdGVycy5cbiAqIEBwYXJhbSB2YWx1ZSAtIFRoZSB2YWx1ZSB0byBlc2NhcGVcbiAqIEByZXR1cm5zIFRoZSBzaGVsbC1lc2NhcGVkIHZhbHVlICh3aXRoIHF1b3RlcylcbiAqIEBpbnRlcm5hbFxuICovXG5mdW5jdGlvbiBlc2NhcGVTaGVsbFZhbHVlKHZhbHVlKSB7XG4gICAgLy8gVXNlIHNpbmdsZSBxdW90ZXMgYW5kIGVzY2FwZSBhbnkgZW1iZWRkZWQgc2luZ2xlIHF1b3Rlc1xuICAgIC8vICd2YWx1ZScgLT4gJ3ZhbCdcXCcndWUnIGZvciB2YWx1ZXMgY29udGFpbmluZyBzaW5nbGUgcXVvdGVzXG4gICAgY29uc3QgZXNjYXBlZCA9IHZhbHVlLnJlcGxhY2UoLycvZywgXCInXFxcXCcnXCIpO1xuICAgIHJldHVybiBgJyR7ZXNjYXBlZH0nYDtcbn1cbiIsICIvKipcbiAqIEhvb2sgZmFjdG9yeSBmdW5jdGlvbnMgZm9yIENsYXVkZSBDb2RlIGhvb2tzLlxuICpcbiAqIFByb3ZpZGVzIHR5cGVkIGZhY3RvcnkgZnVuY3Rpb25zIGZvciBhbGwgMTIgaG9vayB0eXBlcyB0aGF0IGhhbmRsZTpcbiAqIC0gSW5wdXQgdHlwZSBuYXJyb3dpbmcgYmFzZWQgb24gaG9vayBldmVudCB0eXBlXG4gKiAtIE91dHB1dCB0eXBlIGVuZm9yY2VtZW50IHZpYSByZXR1cm4gdHlwZXNcbiAqIC0gRXJyb3Igd3JhcHBpbmcgd2l0aCBhdXRvbWF0aWMgbG9nZ2luZ1xuICogLSBMb2dnZXIgY29udGV4dCBpbmplY3Rpb25cbiAqXG4gKiBFYWNoIGZhY3RvcnkgYWNjZXB0cyBhIEhvb2tDb25maWcgd2l0aCBvcHRpb25hbCBtYXRjaGVyIGFuZCB0aW1lb3V0IHNldHRpbmdzLFxuICogYW5kIHJldHVybnMgYSBmdW5jdGlvbiB0aGF0IHRoZSBydW50aW1lIGludm9rZXMgd2hlbiB0aGUgaG9vayBmaWxlIGV4ZWN1dGVzLlxuICogQG1vZHVsZVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGltcG9ydCB7IHByZVRvb2xVc2VIb29rLCBwcmVUb29sVXNlT3V0cHV0IH0gZnJvbSAnQGdvb2Rmb290L2NsYXVkZS1jb2RlLWhvb2tzJztcbiAqXG4gKiBleHBvcnQgZGVmYXVsdCBwcmVUb29sVXNlSG9vayh7IG1hdGNoZXI6ICdCYXNoJyB9LCBhc3luYyAoaW5wdXQsIHsgbG9nZ2VyIH0pID0+IHtcbiAqICAgbG9nZ2VyLmluZm8oJ1Byb2Nlc3NpbmcgQmFzaCBjb21tYW5kJyk7XG4gKiAgIHJldHVybiBwcmVUb29sVXNlT3V0cHV0KHsgYWxsb3c6IHRydWUgfSk7XG4gKiB9KTtcbiAqIGBgYFxuICogQHNlZSBodHRwczovL2NvZGUuY2xhdWRlLmNvbS9kb2NzL2VuL2hvb2tzXG4gKi9cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIEdlbmVyaWMgRmFjdG9yeVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLyoqXG4gKiBDcmVhdGVzIGEgaG9vayBmYWN0b3J5IGZ1bmN0aW9uIGZvciBhIHNwZWNpZmljIGhvb2sgdHlwZS5cbiAqXG4gKiBUaGlzIGlzIHRoZSBpbnRlcm5hbCBpbXBsZW1lbnRhdGlvbiB1c2VkIGJ5IGFsbCB0eXBlZCBmYWN0b3JpZXMuXG4gKiBJdCB3cmFwcyB0aGUgaGFuZGxlciB3aXRoIGVycm9yIGNhdGNoaW5nIGFuZCBsb2dnaW5nLlxuICogQHBhcmFtIGhvb2tFdmVudE5hbWUgLSBUaGUgaG9vayBldmVudCBuYW1lXG4gKiBAcGFyYW0gY29uZmlnIC0gSG9vayBjb25maWd1cmF0aW9uXG4gKiBAcGFyYW0gaGFuZGxlciAtIFRoZSBoYW5kbGVyIGZ1bmN0aW9uIHRvIHdyYXBcbiAqIEByZXR1cm5zIEEgd3JhcHBlZCBob29rIGZ1bmN0aW9uXG4gKiBAaW50ZXJuYWxcbiAqL1xuZnVuY3Rpb24gY3JlYXRlSG9va0Z1bmN0aW9uKGhvb2tFdmVudE5hbWUsIGNvbmZpZywgaGFuZGxlcikge1xuICAgIGNvbnN0IGhvb2tGbiA9IGFzeW5jIChpbnB1dCwgY29udGV4dCkgPT4ge1xuICAgICAgICAvLyBEZWxlZ2F0ZSBlcnJvciBoYW5kbGluZyB0byB0aGUgcnVudGltZSAtIGp1c3QgZXhlY3V0ZSB0aGUgaGFuZGxlclxuICAgICAgICAvLyBUaGUgcnVudGltZSB3aWxsIGNhdGNoIGVycm9ycywgbG9nIHRoZW0sIGFuZCByZXR1cm4gYXBwcm9wcmlhdGUgb3V0cHV0XG4gICAgICAgIHJldHVybiBhd2FpdCBoYW5kbGVyKGlucHV0LCBjb250ZXh0KTtcbiAgICB9O1xuICAgIC8vIEF0dGFjaCBtZXRhZGF0YSBmb3IgcnVudGltZSBpbnNwZWN0aW9uXG4gICAgaG9va0ZuLmhvb2tFdmVudE5hbWUgPSBob29rRXZlbnROYW1lO1xuICAgIGhvb2tGbi5tYXRjaGVyID0gY29uZmlnLm1hdGNoZXI7XG4gICAgaG9va0ZuLnRpbWVvdXQgPSBjb25maWcudGltZW91dDtcbiAgICByZXR1cm4gaG9va0ZuO1xufVxuLyoqIEBpbmhlcml0ZG9jICovXG5leHBvcnQgZnVuY3Rpb24gcHJlVG9vbFVzZUhvb2soY29uZmlnLCBoYW5kbGVyKSB7XG4gICAgcmV0dXJuIGNyZWF0ZUhvb2tGdW5jdGlvbihcIlByZVRvb2xVc2VcIiwgY29uZmlnLCBoYW5kbGVyKTtcbn1cbi8qKiBAaW5oZXJpdGRvYyAqL1xuZXhwb3J0IGZ1bmN0aW9uIHBvc3RUb29sVXNlSG9vayhjb25maWcsIGhhbmRsZXIpIHtcbiAgICByZXR1cm4gY3JlYXRlSG9va0Z1bmN0aW9uKFwiUG9zdFRvb2xVc2VcIiwgY29uZmlnLCBoYW5kbGVyKTtcbn1cbi8qKiBAaW5oZXJpdGRvYyAqL1xuZXhwb3J0IGZ1bmN0aW9uIHBvc3RUb29sVXNlRmFpbHVyZUhvb2soY29uZmlnLCBoYW5kbGVyKSB7XG4gICAgcmV0dXJuIGNyZWF0ZUhvb2tGdW5jdGlvbihcIlBvc3RUb29sVXNlRmFpbHVyZVwiLCBjb25maWcsIGhhbmRsZXIpO1xufVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gTm90aWZpY2F0aW9uIEhvb2sgRmFjdG9yeVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLyoqXG4gKiBDcmVhdGVzIGEgTm90aWZpY2F0aW9uIGhvb2sgaGFuZGxlci5cbiAqXG4gKiBOb3RpZmljYXRpb24gaG9va3MgZmlyZSB3aGVuIENsYXVkZSBDb2RlIHNlbmRzIGEgbm90aWZpY2F0aW9uLCBhbGxvd2luZyB5b3UgdG86XG4gKiAtIEZvcndhcmQgbm90aWZpY2F0aW9ucyB0byBleHRlcm5hbCBzeXN0ZW1zXG4gKiAtIExvZyBpbXBvcnRhbnQgZXZlbnRzXG4gKiAtIFRyaWdnZXIgY3VzdG9tIGFsZXJ0aW5nXG4gKlxuICogKipNYXRjaGVyKio6IE1hdGNoZXMgYWdhaW5zdCBgbm90aWZpY2F0aW9uX3R5cGVgXG4gKiBAcGFyYW0gY29uZmlnIC0gSG9vayBjb25maWd1cmF0aW9uIHdpdGggb3B0aW9uYWwgbWF0Y2hlciBhbmQgdGltZW91dFxuICogQHBhcmFtIGhhbmRsZXIgLSBUaGUgaGFuZGxlciBmdW5jdGlvbiB0byBleGVjdXRlXG4gKiBAcmV0dXJucyBBIGhvb2sgZnVuY3Rpb24gdGhhdCBjYW4gYmUgZXhwb3J0ZWQgYXMgdGhlIGRlZmF1bHQgZXhwb3J0XG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogaW1wb3J0IHsgbm90aWZpY2F0aW9uSG9vaywgbm90aWZpY2F0aW9uT3V0cHV0IH0gZnJvbSAnQGdvb2Rmb290L2NsYXVkZS1jb2RlLWhvb2tzJztcbiAqXG4gKiAvLyBGb3J3YXJkIG5vdGlmaWNhdGlvbnMgdG8gU2xhY2tcbiAqIGV4cG9ydCBkZWZhdWx0IG5vdGlmaWNhdGlvbkhvb2soe30sIGFzeW5jIChpbnB1dCwgeyBsb2dnZXIgfSkgPT4ge1xuICogICBsb2dnZXIuaW5mbygnTm90aWZpY2F0aW9uIHJlY2VpdmVkJywge1xuICogICAgIHR5cGU6IGlucHV0Lm5vdGlmaWNhdGlvbl90eXBlLFxuICogICAgIHRpdGxlOiBpbnB1dC50aXRsZVxuICogICB9KTtcbiAqXG4gKiAgIGF3YWl0IHNlbmRTbGFja01lc3NhZ2UoaW5wdXQudGl0bGUgPz8gJ05vdGlmaWNhdGlvbicsIGlucHV0Lm1lc3NhZ2UpO1xuICpcbiAqICAgcmV0dXJuIG5vdGlmaWNhdGlvbk91dHB1dCh7fSk7XG4gKiB9KTtcbiAqIGBgYFxuICogQHNlZSBodHRwczovL2NvZGUuY2xhdWRlLmNvbS9kb2NzL2VuL2hvb2tzI25vdGlmaWNhdGlvblxuICovXG5leHBvcnQgZnVuY3Rpb24gbm90aWZpY2F0aW9uSG9vayhjb25maWcsIGhhbmRsZXIpIHtcbiAgICByZXR1cm4gY3JlYXRlSG9va0Z1bmN0aW9uKFwiTm90aWZpY2F0aW9uXCIsIGNvbmZpZywgaGFuZGxlcik7XG59XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBVc2VyUHJvbXB0U3VibWl0IEhvb2sgRmFjdG9yeVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLyoqXG4gKiBDcmVhdGVzIGEgVXNlclByb21wdFN1Ym1pdCBob29rIGhhbmRsZXIuXG4gKlxuICogVXNlclByb21wdFN1Ym1pdCBob29rcyBmaXJlIHdoZW4gYSB1c2VyIHN1Ym1pdHMgYSBwcm9tcHQsIGFsbG93aW5nIHlvdSB0bzpcbiAqIC0gQWRkIGFkZGl0aW9uYWwgY29udGV4dCBvciBpbnN0cnVjdGlvbnNcbiAqIC0gTG9nIHVzZXIgaW50ZXJhY3Rpb25zXG4gKiAtIFZhbGlkYXRlIG9yIHRyYW5zZm9ybSBwcm9tcHRzXG4gKlxuICogKipNYXRjaGVyKio6IE5vIG1hdGNoZXIgc3VwcG9ydCAtIGZpcmVzIG9uIGFsbCBwcm9tcHQgc3VibWlzc2lvbnNcbiAqIEBwYXJhbSBjb25maWcgLSBIb29rIGNvbmZpZ3VyYXRpb24gd2l0aCBvcHRpb25hbCB0aW1lb3V0IChtYXRjaGVyIGlzIGlnbm9yZWQpXG4gKiBAcGFyYW0gaGFuZGxlciAtIFRoZSBoYW5kbGVyIGZ1bmN0aW9uIHRvIGV4ZWN1dGVcbiAqIEByZXR1cm5zIEEgaG9vayBmdW5jdGlvbiB0aGF0IGNhbiBiZSBleHBvcnRlZCBhcyB0aGUgZGVmYXVsdCBleHBvcnRcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBpbXBvcnQgeyB1c2VyUHJvbXB0U3VibWl0SG9vaywgdXNlclByb21wdFN1Ym1pdE91dHB1dCB9IGZyb20gJ0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcyc7XG4gKlxuICogLy8gQWRkIHByb2plY3QgY29udGV4dCB0byBldmVyeSBwcm9tcHRcbiAqIGV4cG9ydCBkZWZhdWx0IHVzZXJQcm9tcHRTdWJtaXRIb29rKHt9LCBhc3luYyAoaW5wdXQsIHsgbG9nZ2VyIH0pID0+IHtcbiAqICAgbG9nZ2VyLmRlYnVnKCdVc2VyIHByb21wdCBzdWJtaXR0ZWQnLCB7IHByb21wdExlbmd0aDogaW5wdXQucHJvbXB0Lmxlbmd0aCB9KTtcbiAqXG4gKiAgIGNvbnN0IHByb2plY3RDb250ZXh0ID0gYXdhaXQgZ2V0UHJvamVjdENvbnRleHQoKTtcbiAqXG4gKiAgIHJldHVybiB1c2VyUHJvbXB0U3VibWl0T3V0cHV0KHtcbiAqICAgICBhZGRpdGlvbmFsQ29udGV4dDogcHJvamVjdENvbnRleHRcbiAqICAgfSk7XG4gKiB9KTtcbiAqIGBgYFxuICogQHNlZSBodHRwczovL2NvZGUuY2xhdWRlLmNvbS9kb2NzL2VuL2hvb2tzI3VzZXJwcm9tcHRzdWJtaXRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHVzZXJQcm9tcHRTdWJtaXRIb29rKGNvbmZpZywgaGFuZGxlcikge1xuICAgIHJldHVybiBjcmVhdGVIb29rRnVuY3Rpb24oXCJVc2VyUHJvbXB0U3VibWl0XCIsIGNvbmZpZywgaGFuZGxlcik7XG59XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBTZXNzaW9uU3RhcnQgSG9vayBGYWN0b3J5XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vKipcbiAqIENyZWF0ZXMgYSBTZXNzaW9uU3RhcnQgaG9vayBoYW5kbGVyLlxuICpcbiAqIFNlc3Npb25TdGFydCBob29rcyBmaXJlIHdoZW4gYSBDbGF1ZGUgQ29kZSBzZXNzaW9uIHN0YXJ0cyBvciByZXN0YXJ0cyxcbiAqIGFsbG93aW5nIHlvdSB0bzpcbiAqIC0gSW5pdGlhbGl6ZSBzZXNzaW9uIHN0YXRlXG4gKiAtIEluamVjdCBjb250ZXh0IG9yIGluc3RydWN0aW9uc1xuICogLSBQZXJzaXN0IGVudmlyb25tZW50IHZhcmlhYmxlcyBmb3Igc3Vic2VxdWVudCBiYXNoIGNvbW1hbmRzXG4gKiAtIFNldCB1cCBsb2dnaW5nIG9yIG1vbml0b3JpbmdcbiAqXG4gKiAqKk1hdGNoZXIqKjogTWF0Y2hlcyBhZ2FpbnN0IGBzb3VyY2VgICgnc3RhcnR1cCcsICdyZXN1bWUnLCAnY2xlYXInLCAnY29tcGFjdCcpXG4gKlxuICogKipDb250ZXh0Kio6IFNlc3Npb25TdGFydCBob29rcyByZWNlaXZlIGFuIGV4dGVuZGVkIGNvbnRleHQgd2l0aCBgcGVyc2lzdEVudlZhcmBcbiAqIGFuZCBgcGVyc2lzdEVudlZhcnNgIGZ1bmN0aW9ucyBmb3Igc2V0dGluZyBlbnZpcm9ubWVudCB2YXJpYWJsZXMuXG4gKiBAcGFyYW0gY29uZmlnIC0gSG9vayBjb25maWd1cmF0aW9uIHdpdGggb3B0aW9uYWwgbWF0Y2hlciBhbmQgdGltZW91dFxuICogQHBhcmFtIGhhbmRsZXIgLSBUaGUgaGFuZGxlciBmdW5jdGlvbiB0byBleGVjdXRlXG4gKiBAcmV0dXJucyBBIGhvb2sgZnVuY3Rpb24gdGhhdCBjYW4gYmUgZXhwb3J0ZWQgYXMgdGhlIGRlZmF1bHQgZXhwb3J0XG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogaW1wb3J0IHsgc2Vzc2lvblN0YXJ0SG9vaywgc2Vzc2lvblN0YXJ0T3V0cHV0IH0gZnJvbSAnQGdvb2Rmb290L2NsYXVkZS1jb2RlLWhvb2tzJztcbiAqXG4gKiAvLyBQZXJzaXN0IGVudmlyb25tZW50IHZhcmlhYmxlcyBmb3IgdGhlIHNlc3Npb25cbiAqIGV4cG9ydCBkZWZhdWx0IHNlc3Npb25TdGFydEhvb2soeyBtYXRjaGVyOiAnc3RhcnR1cCcgfSwgYXN5bmMgKGlucHV0LCB7IGxvZ2dlciwgcGVyc2lzdEVudlZhciB9KSA9PiB7XG4gKiAgIGxvZ2dlci5pbmZvKCdOZXcgc2Vzc2lvbiBzdGFydGVkJywge1xuICogICAgIHNlc3Npb25JZDogaW5wdXQuc2Vzc2lvbl9pZCxcbiAqICAgICBjd2Q6IGlucHV0LmN3ZFxuICogICB9KTtcbiAqXG4gKiAgIC8vIFNldCBlbnZpcm9ubWVudCB2YXJpYWJsZXMgZm9yIGFsbCBzdWJzZXF1ZW50IGJhc2ggY29tbWFuZHNcbiAqICAgcGVyc2lzdEVudlZhcignTk9ERV9FTlYnLCAnZGV2ZWxvcG1lbnQnKTtcbiAqICAgcGVyc2lzdEVudlZhcignREVCVUcnLCAndHJ1ZScpO1xuICpcbiAqICAgcmV0dXJuIHNlc3Npb25TdGFydE91dHB1dCh7fSk7XG4gKiB9KTtcbiAqIGBgYFxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIC8vIFNldCBtdWx0aXBsZSBlbnZpcm9ubWVudCB2YXJpYWJsZXMgYXQgb25jZVxuICogZXhwb3J0IGRlZmF1bHQgc2Vzc2lvblN0YXJ0SG9vayh7fSwgYXN5bmMgKGlucHV0LCB7IHBlcnNpc3RFbnZWYXJzIH0pID0+IHtcbiAqICAgcGVyc2lzdEVudlZhcnMoe1xuICogICAgIE5PREVfRU5WOiAncHJvZHVjdGlvbicsXG4gKiAgICAgQVBJX0tFWTogJ3NlY3JldCcsXG4gKiAgICAgREVCVUc6ICdmYWxzZSdcbiAqICAgfSk7XG4gKlxuICogICByZXR1cm4gc2Vzc2lvblN0YXJ0T3V0cHV0KHt9KTtcbiAqIH0pO1xuICogYGBgXG4gKiBAc2VlIGh0dHBzOi8vY29kZS5jbGF1ZGUuY29tL2RvY3MvZW4vaG9va3Mjc2Vzc2lvbnN0YXJ0XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzZXNzaW9uU3RhcnRIb29rKGNvbmZpZywgaGFuZGxlcikge1xuICAgIHJldHVybiBjcmVhdGVIb29rRnVuY3Rpb24oXCJTZXNzaW9uU3RhcnRcIiwgY29uZmlnLCBoYW5kbGVyKTtcbn1cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIFNlc3Npb25FbmQgSG9vayBGYWN0b3J5XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vKipcbiAqIENyZWF0ZXMgYSBTZXNzaW9uRW5kIGhvb2sgaGFuZGxlci5cbiAqXG4gKiBTZXNzaW9uRW5kIGhvb2tzIGZpcmUgd2hlbiBhIENsYXVkZSBDb2RlIHNlc3Npb24gZW5kcywgYWxsb3dpbmcgeW91IHRvOlxuICogLSBDbGVhbiB1cCBzZXNzaW9uIHJlc291cmNlc1xuICogLSBMb2cgc2Vzc2lvbiBtZXRyaWNzXG4gKiAtIFBlcnNpc3Qgc2Vzc2lvbiBzdGF0ZVxuICpcbiAqICoqTWF0Y2hlcioqOiBNYXRjaGVzIGFnYWluc3QgYHJlYXNvbmAgKHRoZSBleGl0IHJlYXNvbiBzdHJpbmcpXG4gKiBAcGFyYW0gY29uZmlnIC0gSG9vayBjb25maWd1cmF0aW9uIHdpdGggb3B0aW9uYWwgbWF0Y2hlciBhbmQgdGltZW91dFxuICogQHBhcmFtIGhhbmRsZXIgLSBUaGUgaGFuZGxlciBmdW5jdGlvbiB0byBleGVjdXRlXG4gKiBAcmV0dXJucyBBIGhvb2sgZnVuY3Rpb24gdGhhdCBjYW4gYmUgZXhwb3J0ZWQgYXMgdGhlIGRlZmF1bHQgZXhwb3J0XG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogaW1wb3J0IHsgc2Vzc2lvbkVuZEhvb2ssIHNlc3Npb25FbmRPdXRwdXQgfSBmcm9tICdAZ29vZGZvb3QvY2xhdWRlLWNvZGUtaG9va3MnO1xuICpcbiAqIC8vIExvZyBzZXNzaW9uIGVuZCBhbmQgY2xlYW4gdXBcbiAqIGV4cG9ydCBkZWZhdWx0IHNlc3Npb25FbmRIb29rKHt9LCBhc3luYyAoaW5wdXQsIHsgbG9nZ2VyIH0pID0+IHtcbiAqICAgbG9nZ2VyLmluZm8oJ1Nlc3Npb24gZW5kZWQnLCB7XG4gKiAgICAgc2Vzc2lvbklkOiBpbnB1dC5zZXNzaW9uX2lkLFxuICogICAgIHJlYXNvbjogaW5wdXQucmVhc29uXG4gKiAgIH0pO1xuICpcbiAqICAgYXdhaXQgY2xlYW51cFNlc3Npb25SZXNvdXJjZXMoaW5wdXQuc2Vzc2lvbl9pZCk7XG4gKlxuICogICByZXR1cm4gc2Vzc2lvbkVuZE91dHB1dCh7fSk7XG4gKiB9KTtcbiAqIGBgYFxuICogQHNlZSBodHRwczovL2NvZGUuY2xhdWRlLmNvbS9kb2NzL2VuL2hvb2tzI3Nlc3Npb25lbmRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHNlc3Npb25FbmRIb29rKGNvbmZpZywgaGFuZGxlcikge1xuICAgIHJldHVybiBjcmVhdGVIb29rRnVuY3Rpb24oXCJTZXNzaW9uRW5kXCIsIGNvbmZpZywgaGFuZGxlcik7XG59XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBTdG9wIEhvb2sgRmFjdG9yeVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLyoqXG4gKiBDcmVhdGVzIGEgU3RvcCBob29rIGhhbmRsZXIuXG4gKlxuICogU3RvcCBob29rcyBmaXJlIHdoZW4gQ2xhdWRlIENvZGUgaXMgYWJvdXQgdG8gc3RvcCwgYWxsb3dpbmcgeW91IHRvOlxuICogLSBCbG9jayB0aGUgc3RvcCBhbmQgcmVxdWlyZSBhZGRpdGlvbmFsIGFjdGlvblxuICogLSBDb25maXJtIHRoZSB1c2VyIHdhbnRzIHRvIHN0b3BcbiAqIC0gQ2xlYW4gdXAgcmVzb3VyY2VzIGJlZm9yZSBzdG9wcGluZ1xuICpcbiAqICoqTWF0Y2hlcioqOiBObyBtYXRjaGVyIHN1cHBvcnQgLSBmaXJlcyBvbiBhbGwgc3RvcCBldmVudHNcbiAqIEBwYXJhbSBjb25maWcgLSBIb29rIGNvbmZpZ3VyYXRpb24gd2l0aCBvcHRpb25hbCB0aW1lb3V0IChtYXRjaGVyIGlzIGlnbm9yZWQpXG4gKiBAcGFyYW0gaGFuZGxlciAtIFRoZSBoYW5kbGVyIGZ1bmN0aW9uIHRvIGV4ZWN1dGVcbiAqIEByZXR1cm5zIEEgaG9vayBmdW5jdGlvbiB0aGF0IGNhbiBiZSBleHBvcnRlZCBhcyB0aGUgZGVmYXVsdCBleHBvcnRcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBpbXBvcnQgeyBzdG9wSG9vaywgc3RvcE91dHB1dCB9IGZyb20gJ0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcyc7XG4gKlxuICogLy8gQmxvY2sgc3RvcCBpZiB0aGVyZSBhcmUgcGVuZGluZyBjaGFuZ2VzXG4gKiBleHBvcnQgZGVmYXVsdCBzdG9wSG9vayh7fSwgYXN5bmMgKGlucHV0LCB7IGxvZ2dlciB9KSA9PiB7XG4gKiAgIGNvbnN0IHBlbmRpbmdDaGFuZ2VzID0gYXdhaXQgY2hlY2tQZW5kaW5nQ2hhbmdlcygpO1xuICpcbiAqICAgaWYgKHBlbmRpbmdDaGFuZ2VzLmxlbmd0aCA+IDApIHtcbiAqICAgICBsb2dnZXIud2FybignQmxvY2tpbmcgc3RvcCBkdWUgdG8gcGVuZGluZyBjaGFuZ2VzJywge1xuICogICAgICAgY291bnQ6IHBlbmRpbmdDaGFuZ2VzLmxlbmd0aFxuICogICAgIH0pO1xuICpcbiAqICAgICByZXR1cm4gc3RvcE91dHB1dCh7XG4gKiAgICAgICBkZWNpc2lvbjogJ2Jsb2NrJyxcbiAqICAgICAgIHJlYXNvbjogYFRoZXJlIGFyZSAke3BlbmRpbmdDaGFuZ2VzLmxlbmd0aH0gdW5jb21taXR0ZWQgY2hhbmdlc2AsXG4gKiAgICAgICBzeXN0ZW1NZXNzYWdlOiAnUGxlYXNlIGNvbW1pdCBvciBkaXNjYXJkIGNoYW5nZXMgYmVmb3JlIHN0b3BwaW5nJ1xuICogICAgIH0pO1xuICogICB9XG4gKlxuICogICBsb2dnZXIuaW5mbygnQXBwcm92aW5nIHN0b3AnKTtcbiAqICAgcmV0dXJuIHN0b3BPdXRwdXQoeyBkZWNpc2lvbjogJ2FwcHJvdmUnIH0pO1xuICogfSk7XG4gKiBgYGBcbiAqIEBzZWUgaHR0cHM6Ly9jb2RlLmNsYXVkZS5jb20vZG9jcy9lbi9ob29rcyNzdG9wXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzdG9wSG9vayhjb25maWcsIGhhbmRsZXIpIHtcbiAgICByZXR1cm4gY3JlYXRlSG9va0Z1bmN0aW9uKFwiU3RvcFwiLCBjb25maWcsIGhhbmRsZXIpO1xufVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gU3RvcEZhaWx1cmUgSG9vayBGYWN0b3J5XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vKipcbiAqIENyZWF0ZXMgYSBTdG9wRmFpbHVyZSBob29rIGhhbmRsZXIuXG4gKlxuICogU3RvcEZhaWx1cmUgaG9va3MgZmlyZSB3aGVuIENsYXVkZSBDb2RlIGVuY291bnRlcnMgYW4gZXJyb3Igd2hpbGUgc3RvcHBpbmdcbiAqIChlLmcuLCBBUEkgZXJyb3JzLCBhdXRoZW50aWNhdGlvbiBmYWlsdXJlcywgcmF0ZSBsaW1pdHMpLCBhbGxvd2luZyB5b3UgdG86XG4gKiAtIExvZyBzdG9wIGZhaWx1cmUgZXZlbnRzIGFuZCBlcnJvciBkZXRhaWxzXG4gKiAtIEFsZXJ0IG9uIHVuZXhwZWN0ZWQgc2Vzc2lvbiB0ZXJtaW5hdGlvbiBlcnJvcnNcbiAqIC0gT2JzZXJ2ZSB3aGF0IGVycm9yIGNhdXNlZCB0aGUgZmFpbHVyZVxuICpcbiAqICoqTWF0Y2hlcioqOiBObyBtYXRjaGVyIHN1cHBvcnQgLSBmaXJlcyBvbiBhbGwgc3RvcCBmYWlsdXJlIGV2ZW50c1xuICogQHBhcmFtIGNvbmZpZyAtIEhvb2sgY29uZmlndXJhdGlvbiB3aXRoIG9wdGlvbmFsIHRpbWVvdXQgKG1hdGNoZXIgaXMgaWdub3JlZClcbiAqIEBwYXJhbSBoYW5kbGVyIC0gVGhlIGhhbmRsZXIgZnVuY3Rpb24gdG8gZXhlY3V0ZVxuICogQHJldHVybnMgQSBob29rIGZ1bmN0aW9uIHRoYXQgY2FuIGJlIGV4cG9ydGVkIGFzIHRoZSBkZWZhdWx0IGV4cG9ydFxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGltcG9ydCB7IHN0b3BGYWlsdXJlSG9vaywgc3RvcEZhaWx1cmVPdXRwdXQgfSBmcm9tICdAZ29vZGZvb3QvY2xhdWRlLWNvZGUtaG9va3MnO1xuICpcbiAqIGV4cG9ydCBkZWZhdWx0IHN0b3BGYWlsdXJlSG9vayh7fSwgYXN5bmMgKGlucHV0LCB7IGxvZ2dlciB9KSA9PiB7XG4gKiAgIGxvZ2dlci5lcnJvcignU2Vzc2lvbiBzdG9wcGVkIGR1ZSB0byBlcnJvcicsIHtcbiAqICAgICBlcnJvcjogaW5wdXQuZXJyb3IsXG4gKiAgICAgZGV0YWlsczogaW5wdXQuZXJyb3JfZGV0YWlsc1xuICogICB9KTtcbiAqICAgcmV0dXJuIHN0b3BGYWlsdXJlT3V0cHV0KHt9KTtcbiAqIH0pO1xuICogYGBgXG4gKiBAc2VlIGh0dHBzOi8vY29kZS5jbGF1ZGUuY29tL2RvY3MvZW4vaG9va3Mjc3RvcGZhaWx1cmVcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHN0b3BGYWlsdXJlSG9vayhjb25maWcsIGhhbmRsZXIpIHtcbiAgICByZXR1cm4gY3JlYXRlSG9va0Z1bmN0aW9uKFwiU3RvcEZhaWx1cmVcIiwgY29uZmlnLCBoYW5kbGVyKTtcbn1cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIFN1YmFnZW50U3RhcnQgSG9vayBGYWN0b3J5XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vKipcbiAqIENyZWF0ZXMgYSBTdWJhZ2VudFN0YXJ0IGhvb2sgaGFuZGxlci5cbiAqXG4gKiBTdWJhZ2VudFN0YXJ0IGhvb2tzIGZpcmUgd2hlbiBhIHN1YmFnZW50IChBZ2VudCB0b29sKSBzdGFydHMsIGFsbG93aW5nIHlvdSB0bzpcbiAqIC0gSW5qZWN0IGNvbnRleHQgZm9yIHRoZSBzdWJhZ2VudFxuICogLSBMb2cgc3ViYWdlbnQgaW52b2NhdGlvbnNcbiAqIC0gQ29uZmlndXJlIHN1YmFnZW50IGJlaGF2aW9yXG4gKlxuICogKipNYXRjaGVyKio6IE1hdGNoZXMgYWdhaW5zdCBgYWdlbnRfdHlwZWAgKGUuZy4sICdleHBsb3JlJywgJ2NvZGViYXNlLWFuYWx5c2lzJylcbiAqIEBwYXJhbSBjb25maWcgLSBIb29rIGNvbmZpZ3VyYXRpb24gd2l0aCBvcHRpb25hbCBtYXRjaGVyIGFuZCB0aW1lb3V0XG4gKiBAcGFyYW0gaGFuZGxlciAtIFRoZSBoYW5kbGVyIGZ1bmN0aW9uIHRvIGV4ZWN1dGVcbiAqIEByZXR1cm5zIEEgaG9vayBmdW5jdGlvbiB0aGF0IGNhbiBiZSBleHBvcnRlZCBhcyB0aGUgZGVmYXVsdCBleHBvcnRcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBpbXBvcnQgeyBzdWJhZ2VudFN0YXJ0SG9vaywgc3ViYWdlbnRTdGFydE91dHB1dCB9IGZyb20gJ0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcyc7XG4gKlxuICogLy8gQWRkIGNvbnRleHQgZm9yIGV4cGxvcmUgc3ViYWdlbnRzXG4gKiBleHBvcnQgZGVmYXVsdCBzdWJhZ2VudFN0YXJ0SG9vayh7IG1hdGNoZXI6ICdleHBsb3JlJyB9LCBhc3luYyAoaW5wdXQsIHsgbG9nZ2VyIH0pID0+IHtcbiAqICAgbG9nZ2VyLmluZm8oJ0V4cGxvcmUgc3ViYWdlbnQgc3RhcnRpbmcnLCB7XG4gKiAgICAgYWdlbnRJZDogaW5wdXQuYWdlbnRfaWQsXG4gKiAgICAgYWdlbnRUeXBlOiBpbnB1dC5hZ2VudF90eXBlXG4gKiAgIH0pO1xuICpcbiAqICAgcmV0dXJuIHN1YmFnZW50U3RhcnRPdXRwdXQoe1xuICogICAgIGFkZGl0aW9uYWxDb250ZXh0OiAnRm9jdXMgb24gZmluZGluZyBwYXR0ZXJucyBhbmQgY29udmVudGlvbnMnXG4gKiAgIH0pO1xuICogfSk7XG4gKiBgYGBcbiAqIEBzZWUgaHR0cHM6Ly9jb2RlLmNsYXVkZS5jb20vZG9jcy9lbi9ob29rcyNzdWJhZ2VudHN0YXJ0XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzdWJhZ2VudFN0YXJ0SG9vayhjb25maWcsIGhhbmRsZXIpIHtcbiAgICByZXR1cm4gY3JlYXRlSG9va0Z1bmN0aW9uKFwiU3ViYWdlbnRTdGFydFwiLCBjb25maWcsIGhhbmRsZXIpO1xufVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gU3ViYWdlbnRTdG9wIEhvb2sgRmFjdG9yeVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLyoqXG4gKiBDcmVhdGVzIGEgU3ViYWdlbnRTdG9wIGhvb2sgaGFuZGxlci5cbiAqXG4gKiBTdWJhZ2VudFN0b3AgaG9va3MgZmlyZSB3aGVuIGEgc3ViYWdlbnQgY29tcGxldGVzIG9yIHN0b3BzLCBhbGxvd2luZyB5b3UgdG86XG4gKiAtIEJsb2NrIHRoZSBzdWJhZ2VudCBmcm9tIHN0b3BwaW5nXG4gKiAtIFByb2Nlc3Mgc3ViYWdlbnQgcmVzdWx0c1xuICogLSBDbGVhbiB1cCBzdWJhZ2VudCByZXNvdXJjZXNcbiAqIC0gTG9nIHN1YmFnZW50IGNvbXBsZXRpb25cbiAqXG4gKiAqKk1hdGNoZXIqKjogTWF0Y2hlcyBhZ2FpbnN0IGBhZ2VudF90eXBlYCAoZS5nLiwgJ2V4cGxvcmUnLCAnY29kZWJhc2UtYW5hbHlzaXMnKVxuICogQHBhcmFtIGNvbmZpZyAtIEhvb2sgY29uZmlndXJhdGlvbiB3aXRoIG9wdGlvbmFsIG1hdGNoZXIgYW5kIHRpbWVvdXRcbiAqIEBwYXJhbSBoYW5kbGVyIC0gVGhlIGhhbmRsZXIgZnVuY3Rpb24gdG8gZXhlY3V0ZVxuICogQHJldHVybnMgQSBob29rIGZ1bmN0aW9uIHRoYXQgY2FuIGJlIGV4cG9ydGVkIGFzIHRoZSBkZWZhdWx0IGV4cG9ydFxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGltcG9ydCB7IHN1YmFnZW50U3RvcEhvb2ssIHN1YmFnZW50U3RvcE91dHB1dCB9IGZyb20gJ0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcyc7XG4gKlxuICogLy8gQmxvY2sgZXhwbG9yZSBzdWJhZ2VudHMgaWYgdGFzayBpbmNvbXBsZXRlXG4gKiBleHBvcnQgZGVmYXVsdCBzdWJhZ2VudFN0b3BIb29rKHsgbWF0Y2hlcjogJ2V4cGxvcmUnIH0sIGFzeW5jIChpbnB1dCwgeyBsb2dnZXIgfSkgPT4ge1xuICogICBsb2dnZXIuaW5mbygnU3ViYWdlbnQgc3RvcHBpbmcnLCB7XG4gKiAgICAgYWdlbnRJZDogaW5wdXQuYWdlbnRfaWQsXG4gKiAgICAgYWdlbnRUeXBlOiBpbnB1dC5hZ2VudF90eXBlXG4gKiAgIH0pO1xuICpcbiAqICAgLy8gQmxvY2sgaWYgdHJhbnNjcmlwdCBzaG93cyBpbmNvbXBsZXRlIHdvcmtcbiAqICAgcmV0dXJuIHN1YmFnZW50U3RvcE91dHB1dCh7XG4gKiAgICAgZGVjaXNpb246ICdibG9jaycsXG4gKiAgICAgcmVhc29uOiAnUGxlYXNlIHZlcmlmeSBleHBsb3JhdGlvbiBpcyBjb21wbGV0ZSdcbiAqICAgfSk7XG4gKiB9KTtcbiAqIGBgYFxuICogQHNlZSBodHRwczovL2NvZGUuY2xhdWRlLmNvbS9kb2NzL2VuL2hvb2tzI3N1YmFnZW50c3RvcFxuICovXG5leHBvcnQgZnVuY3Rpb24gc3ViYWdlbnRTdG9wSG9vayhjb25maWcsIGhhbmRsZXIpIHtcbiAgICByZXR1cm4gY3JlYXRlSG9va0Z1bmN0aW9uKFwiU3ViYWdlbnRTdG9wXCIsIGNvbmZpZywgaGFuZGxlcik7XG59XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBQcmVDb21wYWN0IEhvb2sgRmFjdG9yeVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLyoqXG4gKiBDcmVhdGVzIGEgUHJlQ29tcGFjdCBob29rIGhhbmRsZXIuXG4gKlxuICogUHJlQ29tcGFjdCBob29rcyBmaXJlIGJlZm9yZSBjb250ZXh0IGNvbXBhY3Rpb24gb2NjdXJzLCBhbGxvd2luZyB5b3UgdG86XG4gKiAtIFByZXNlcnZlIGltcG9ydGFudCBpbmZvcm1hdGlvbiBiZWZvcmUgY29tcGFjdGlvblxuICogLSBMb2cgY29tcGFjdGlvbiBldmVudHNcbiAqIC0gTW9kaWZ5IGN1c3RvbSBpbnN0cnVjdGlvbnMgZm9yIHRoZSBjb21wYWN0ZWQgY29udGV4dFxuICpcbiAqICoqTWF0Y2hlcioqOiBNYXRjaGVzIGFnYWluc3QgYHRyaWdnZXJgICgnbWFudWFsJywgJ2F1dG8nKVxuICogQHBhcmFtIGNvbmZpZyAtIEhvb2sgY29uZmlndXJhdGlvbiB3aXRoIG9wdGlvbmFsIG1hdGNoZXIgYW5kIHRpbWVvdXRcbiAqIEBwYXJhbSBoYW5kbGVyIC0gVGhlIGhhbmRsZXIgZnVuY3Rpb24gdG8gZXhlY3V0ZVxuICogQHJldHVybnMgQSBob29rIGZ1bmN0aW9uIHRoYXQgY2FuIGJlIGV4cG9ydGVkIGFzIHRoZSBkZWZhdWx0IGV4cG9ydFxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGltcG9ydCB7IHByZUNvbXBhY3RIb29rLCBwcmVDb21wYWN0T3V0cHV0IH0gZnJvbSAnQGdvb2Rmb290L2NsYXVkZS1jb2RlLWhvb2tzJztcbiAqXG4gKiAvLyBMb2cgY29tcGFjdGlvbiBldmVudHMgYW5kIHByZXNlcnZlIGNvbnRleHRcbiAqIGV4cG9ydCBkZWZhdWx0IHByZUNvbXBhY3RIb29rKHt9LCBhc3luYyAoaW5wdXQsIHsgbG9nZ2VyIH0pID0+IHtcbiAqICAgbG9nZ2VyLmluZm8oJ0NvbnRleHQgY29tcGFjdGlvbiB0cmlnZ2VyZWQnLCB7XG4gKiAgICAgdHJpZ2dlcjogaW5wdXQudHJpZ2dlcixcbiAqICAgICBoYXNDdXN0b21JbnN0cnVjdGlvbnM6IGlucHV0LmN1c3RvbV9pbnN0cnVjdGlvbnMgIT09IG51bGxcbiAqICAgfSk7XG4gKlxuICogICByZXR1cm4gcHJlQ29tcGFjdE91dHB1dCh7XG4gKiAgICAgc3lzdGVtTWVzc2FnZTogJ1JlbWVtYmVyOiBzdHJpY3QgbW9kZSBpcyBlbmFibGVkJ1xuICogICB9KTtcbiAqIH0pO1xuICogYGBgXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogLy8gT25seSBoYW5kbGUgbWFudWFsIGNvbXBhY3Rpb25cbiAqIGV4cG9ydCBkZWZhdWx0IHByZUNvbXBhY3RIb29rKHsgbWF0Y2hlcjogJ21hbnVhbCcgfSwgYXN5bmMgKGlucHV0LCB7IGxvZ2dlciB9KSA9PiB7XG4gKiAgIGxvZ2dlci5pbmZvKCdNYW51YWwgY29tcGFjdGlvbiByZXF1ZXN0ZWQnKTtcbiAqICAgcmV0dXJuIHByZUNvbXBhY3RPdXRwdXQoe30pO1xuICogfSk7XG4gKiBgYGBcbiAqIEBzZWUgaHR0cHM6Ly9jb2RlLmNsYXVkZS5jb20vZG9jcy9lbi9ob29rcyNwcmVjb21wYWN0XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBwcmVDb21wYWN0SG9vayhjb25maWcsIGhhbmRsZXIpIHtcbiAgICByZXR1cm4gY3JlYXRlSG9va0Z1bmN0aW9uKFwiUHJlQ29tcGFjdFwiLCBjb25maWcsIGhhbmRsZXIpO1xufVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gUG9zdENvbXBhY3QgSG9vayBGYWN0b3J5XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vKipcbiAqIENyZWF0ZXMgYSBQb3N0Q29tcGFjdCBob29rIGhhbmRsZXIuXG4gKlxuICogUG9zdENvbXBhY3QgaG9va3MgZmlyZSBhZnRlciBjb250ZXh0IGNvbXBhY3Rpb24gY29tcGxldGVzLCBhbGxvd2luZyB5b3UgdG86XG4gKiAtIE9ic2VydmUgdGhlIGNvbXBhY3Rpb24gc3VtbWFyeSBhbmQgZGV0YWlsc1xuICogLSBMb2cgY29tcGFjdGlvbiBldmVudHNcbiAqIC0gUmVhY3QgdG8gdGhlIG5ldyBjb21wYWN0ZWQgc3RhdGVcbiAqXG4gKiAqKk1hdGNoZXIqKjogTWF0Y2hlcyBhZ2FpbnN0IGB0cmlnZ2VyYCAoJ21hbnVhbCcsICdhdXRvJylcbiAqIEBwYXJhbSBjb25maWcgLSBIb29rIGNvbmZpZ3VyYXRpb24gd2l0aCBvcHRpb25hbCBtYXRjaGVyIGFuZCB0aW1lb3V0XG4gKiBAcGFyYW0gaGFuZGxlciAtIFRoZSBoYW5kbGVyIGZ1bmN0aW9uIHRvIGV4ZWN1dGVcbiAqIEByZXR1cm5zIEEgaG9vayBmdW5jdGlvbiB0aGF0IGNhbiBiZSBleHBvcnRlZCBhcyB0aGUgZGVmYXVsdCBleHBvcnRcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBpbXBvcnQgeyBwb3N0Q29tcGFjdEhvb2ssIHBvc3RDb21wYWN0T3V0cHV0IH0gZnJvbSAnQGdvb2Rmb290L2NsYXVkZS1jb2RlLWhvb2tzJztcbiAqXG4gKiBleHBvcnQgZGVmYXVsdCBwb3N0Q29tcGFjdEhvb2soe30sIGFzeW5jIChpbnB1dCwgeyBsb2dnZXIgfSkgPT4ge1xuICogICBsb2dnZXIuaW5mbygnQ29udGV4dCBjb21wYWN0aW9uIGNvbXBsZXRlZCcsIHtcbiAqICAgICB0cmlnZ2VyOiBpbnB1dC50cmlnZ2VyLFxuICogICAgIHN1bW1hcnk6IGlucHV0LmNvbXBhY3Rfc3VtbWFyeVxuICogICB9KTtcbiAqICAgcmV0dXJuIHBvc3RDb21wYWN0T3V0cHV0KHt9KTtcbiAqIH0pO1xuICogYGBgXG4gKiBAc2VlIGh0dHBzOi8vY29kZS5jbGF1ZGUuY29tL2RvY3MvZW4vaG9va3MjcG9zdGNvbXBhY3RcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHBvc3RDb21wYWN0SG9vayhjb25maWcsIGhhbmRsZXIpIHtcbiAgICByZXR1cm4gY3JlYXRlSG9va0Z1bmN0aW9uKFwiUG9zdENvbXBhY3RcIiwgY29uZmlnLCBoYW5kbGVyKTtcbn1cbi8qKiBAaW5oZXJpdGRvYyAqL1xuZXhwb3J0IGZ1bmN0aW9uIHBlcm1pc3Npb25SZXF1ZXN0SG9vayhjb25maWcsIGhhbmRsZXIpIHtcbiAgICByZXR1cm4gY3JlYXRlSG9va0Z1bmN0aW9uKFwiUGVybWlzc2lvblJlcXVlc3RcIiwgY29uZmlnLCBoYW5kbGVyKTtcbn1cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIFNldHVwIEhvb2sgRmFjdG9yeVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLyoqXG4gKiBDcmVhdGVzIGEgU2V0dXAgaG9vayBoYW5kbGVyLlxuICpcbiAqIFNldHVwIGhvb2tzIGZpcmUgZHVyaW5nIGluaXRpYWxpemF0aW9uIG9yIG1haW50ZW5hbmNlLCBhbGxvd2luZyB5b3UgdG86XG4gKiAtIENvbmZpZ3VyZSBpbml0aWFsIHNlc3Npb24gc3RhdGVcbiAqIC0gUGVyZm9ybSBzZXR1cCB0YXNrcyBiZWZvcmUgdGhlIHNlc3Npb24gc3RhcnRzXG4gKiAtIEFkZCBjb250ZXh0IGZvciBtYWludGVuYW5jZSBvcGVyYXRpb25zXG4gKlxuICogKipNYXRjaGVyKio6IE1hdGNoZXMgYWdhaW5zdCBgdHJpZ2dlcmAgKCdpbml0JyBvciAnbWFpbnRlbmFuY2UnKVxuICogQHBhcmFtIGNvbmZpZyAtIEhvb2sgY29uZmlndXJhdGlvbiB3aXRoIG9wdGlvbmFsIG1hdGNoZXIgYW5kIHRpbWVvdXRcbiAqIEBwYXJhbSBoYW5kbGVyIC0gVGhlIGhhbmRsZXIgZnVuY3Rpb24gdG8gZXhlY3V0ZVxuICogQHJldHVybnMgQSBob29rIGZ1bmN0aW9uIHRoYXQgY2FuIGJlIGV4cG9ydGVkIGFzIHRoZSBkZWZhdWx0IGV4cG9ydFxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGltcG9ydCB7IHNldHVwSG9vaywgc2V0dXBPdXRwdXQgfSBmcm9tICdAZ29vZGZvb3QvY2xhdWRlLWNvZGUtaG9va3MnO1xuICpcbiAqIC8vIEhhbmRsZSBhbGwgc2V0dXAgZXZlbnRzXG4gKiBleHBvcnQgZGVmYXVsdCBzZXR1cEhvb2soe30sIGFzeW5jIChpbnB1dCwgeyBsb2dnZXIgfSkgPT4ge1xuICogICBsb2dnZXIuaW5mbygnU2V0dXAgdHJpZ2dlcmVkJywgeyB0cmlnZ2VyOiBpbnB1dC50cmlnZ2VyIH0pO1xuICogICByZXR1cm4gc2V0dXBPdXRwdXQoe30pO1xuICogfSk7XG4gKlxuICogLy8gT25seSBoYW5kbGUgaW5pdGlhbGl6YXRpb25cbiAqIGV4cG9ydCBkZWZhdWx0IHNldHVwSG9vayh7IG1hdGNoZXI6ICdpbml0JyB9LCBhc3luYyAoaW5wdXQsIHsgbG9nZ2VyIH0pID0+IHtcbiAqICAgbG9nZ2VyLmluZm8oJ0luaXRpYWxpemluZyBzZXNzaW9uJyk7XG4gKiAgIHJldHVybiBzZXR1cE91dHB1dCh7XG4gKiAgICAgaG9va1NwZWNpZmljT3V0cHV0OiB7XG4gKiAgICAgICBhZGRpdGlvbmFsQ29udGV4dDogJ1Nlc3Npb24gaW5pdGlhbGl6ZWQgd2l0aCBjdXN0b20gY29uZmlndXJhdGlvbidcbiAqICAgICB9XG4gKiAgIH0pO1xuICogfSk7XG4gKiBgYGBcbiAqIEBzZWUgaHR0cHM6Ly9jb2RlLmNsYXVkZS5jb20vZG9jcy9lbi9ob29rcyNzZXR1cFxuICovXG5leHBvcnQgZnVuY3Rpb24gc2V0dXBIb29rKGNvbmZpZywgaGFuZGxlcikge1xuICAgIHJldHVybiBjcmVhdGVIb29rRnVuY3Rpb24oXCJTZXR1cFwiLCBjb25maWcsIGhhbmRsZXIpO1xufVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gVGVhbW1hdGVJZGxlIEhvb2sgRmFjdG9yeVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLyoqXG4gKiBDcmVhdGVzIGEgVGVhbW1hdGVJZGxlIGhvb2sgaGFuZGxlci5cbiAqXG4gKiBUZWFtbWF0ZUlkbGUgaG9va3MgZmlyZSB3aGVuIGEgdGVhbW1hdGUgaW4gYSB0ZWFtIGlzIGFib3V0IHRvIGdvIGlkbGUsXG4gKiBhbGxvd2luZyB5b3UgdG86XG4gKiAtIEFzc2lnbiB3b3JrIHRvIGlkbGUgdGVhbW1hdGVzXG4gKiAtIExvZyB0ZWFtIGFjdGl2aXR5XG4gKiAtIENvb3JkaW5hdGUgbXVsdGktYWdlbnQgd29ya2Zsb3dzXG4gKlxuICogKipNYXRjaGVyKio6IE5vIG1hdGNoZXIgc3VwcG9ydCAtIGZpcmVzIG9uIGFsbCB0ZWFtbWF0ZSBpZGxlIGV2ZW50c1xuICogQHBhcmFtIGNvbmZpZyAtIEhvb2sgY29uZmlndXJhdGlvbiB3aXRoIG9wdGlvbmFsIHRpbWVvdXQgKG1hdGNoZXIgaXMgaWdub3JlZClcbiAqIEBwYXJhbSBoYW5kbGVyIC0gVGhlIGhhbmRsZXIgZnVuY3Rpb24gdG8gZXhlY3V0ZVxuICogQHJldHVybnMgQSBob29rIGZ1bmN0aW9uIHRoYXQgY2FuIGJlIGV4cG9ydGVkIGFzIHRoZSBkZWZhdWx0IGV4cG9ydFxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGltcG9ydCB7IHRlYW1tYXRlSWRsZUhvb2ssIHRlYW1tYXRlSWRsZU91dHB1dCB9IGZyb20gJ0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcyc7XG4gKlxuICogLy8gTG9nIHdoZW4gdGVhbW1hdGVzIGdvIGlkbGVcbiAqIGV4cG9ydCBkZWZhdWx0IHRlYW1tYXRlSWRsZUhvb2soe30sIGFzeW5jIChpbnB1dCwgeyBsb2dnZXIgfSkgPT4ge1xuICogICBsb2dnZXIuaW5mbygnVGVhbW1hdGUgZ29pbmcgaWRsZScsIHtcbiAqICAgICB0ZWFtbWF0ZU5hbWU6IGlucHV0LnRlYW1tYXRlX25hbWUsXG4gKiAgICAgdGVhbU5hbWU6IGlucHV0LnRlYW1fbmFtZVxuICogICB9KTtcbiAqXG4gKiAgIHJldHVybiB0ZWFtbWF0ZUlkbGVPdXRwdXQoe30pO1xuICogfSk7XG4gKiBgYGBcbiAqIEBzZWUgaHR0cHM6Ly9jb2RlLmNsYXVkZS5jb20vZG9jcy9lbi9ob29rcyN0ZWFtbWF0ZWlkbGVcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHRlYW1tYXRlSWRsZUhvb2soY29uZmlnLCBoYW5kbGVyKSB7XG4gICAgcmV0dXJuIGNyZWF0ZUhvb2tGdW5jdGlvbihcIlRlYW1tYXRlSWRsZVwiLCBjb25maWcsIGhhbmRsZXIpO1xufVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gVGFza0NvbXBsZXRlZCBIb29rIEZhY3Rvcnlcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8qKlxuICogQ3JlYXRlcyBhIFRhc2tDb21wbGV0ZWQgaG9vayBoYW5kbGVyLlxuICpcbiAqIFRhc2tDb21wbGV0ZWQgaG9va3MgZmlyZSB3aGVuIGEgdGFzayBpcyBiZWluZyBtYXJrZWQgYXMgY29tcGxldGVkLFxuICogYWxsb3dpbmcgeW91IHRvOlxuICogLSBWZXJpZnkgdGFzayBjb21wbGV0aW9uXG4gKiAtIExvZyB0YXNrIG1ldHJpY3NcbiAqIC0gVHJpZ2dlciBmb2xsb3ctdXAgYWN0aW9uc1xuICpcbiAqICoqTWF0Y2hlcioqOiBObyBtYXRjaGVyIHN1cHBvcnQgLSBmaXJlcyBvbiBhbGwgdGFzayBjb21wbGV0aW9uIGV2ZW50c1xuICogQHBhcmFtIGNvbmZpZyAtIEhvb2sgY29uZmlndXJhdGlvbiB3aXRoIG9wdGlvbmFsIHRpbWVvdXQgKG1hdGNoZXIgaXMgaWdub3JlZClcbiAqIEBwYXJhbSBoYW5kbGVyIC0gVGhlIGhhbmRsZXIgZnVuY3Rpb24gdG8gZXhlY3V0ZVxuICogQHJldHVybnMgQSBob29rIGZ1bmN0aW9uIHRoYXQgY2FuIGJlIGV4cG9ydGVkIGFzIHRoZSBkZWZhdWx0IGV4cG9ydFxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGltcG9ydCB7IHRhc2tDb21wbGV0ZWRIb29rLCB0YXNrQ29tcGxldGVkT3V0cHV0IH0gZnJvbSAnQGdvb2Rmb290L2NsYXVkZS1jb2RlLWhvb2tzJztcbiAqXG4gKiAvLyBMb2cgdGFzayBjb21wbGV0aW9uXG4gKiBleHBvcnQgZGVmYXVsdCB0YXNrQ29tcGxldGVkSG9vayh7fSwgYXN5bmMgKGlucHV0LCB7IGxvZ2dlciB9KSA9PiB7XG4gKiAgIGxvZ2dlci5pbmZvKCdUYXNrIGNvbXBsZXRlZCcsIHtcbiAqICAgICB0YXNrSWQ6IGlucHV0LnRhc2tfaWQsXG4gKiAgICAgdGFza1N1YmplY3Q6IGlucHV0LnRhc2tfc3ViamVjdFxuICogICB9KTtcbiAqXG4gKiAgIHJldHVybiB0YXNrQ29tcGxldGVkT3V0cHV0KHt9KTtcbiAqIH0pO1xuICogYGBgXG4gKiBAc2VlIGh0dHBzOi8vY29kZS5jbGF1ZGUuY29tL2RvY3MvZW4vaG9va3MjdGFza2NvbXBsZXRlZFxuICovXG5leHBvcnQgZnVuY3Rpb24gdGFza0NvbXBsZXRlZEhvb2soY29uZmlnLCBoYW5kbGVyKSB7XG4gICAgcmV0dXJuIGNyZWF0ZUhvb2tGdW5jdGlvbihcIlRhc2tDb21wbGV0ZWRcIiwgY29uZmlnLCBoYW5kbGVyKTtcbn1cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIEVsaWNpdGF0aW9uIEhvb2sgRmFjdG9yeVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLyoqXG4gKiBDcmVhdGVzIGFuIEVsaWNpdGF0aW9uIGhvb2sgaGFuZGxlci5cbiAqXG4gKiBFbGljaXRhdGlvbiBob29rcyBmaXJlIHdoZW4gYW4gTUNQIHNlcnZlciByZXF1ZXN0cyB1c2VyIGlucHV0LCBhbGxvd2luZyB5b3UgdG86XG4gKiAtIEFjY2VwdCwgZGVjbGluZSwgb3IgY2FuY2VsIGVsaWNpdGF0aW9uIHJlcXVlc3RzIHByb2dyYW1tYXRpY2FsbHlcbiAqIC0gUHJvdmlkZSBzdHJ1Y3R1cmVkIGZvcm0gaW5wdXQgb3IgVVJMLWJhc2VkIGF1dGggcmVzcG9uc2VzXG4gKiAtIExvZyBvciBhdWRpdCBlbGljaXRhdGlvbiByZXF1ZXN0c1xuICpcbiAqICoqTWF0Y2hlcioqOiBObyBtYXRjaGVyIHN1cHBvcnQgLSBmaXJlcyBvbiBhbGwgZWxpY2l0YXRpb24gZXZlbnRzXG4gKiBAcGFyYW0gY29uZmlnIC0gSG9vayBjb25maWd1cmF0aW9uIHdpdGggb3B0aW9uYWwgdGltZW91dFxuICogQHBhcmFtIGhhbmRsZXIgLSBUaGUgaGFuZGxlciBmdW5jdGlvbiB0byBleGVjdXRlXG4gKiBAcmV0dXJucyBBIGhvb2sgZnVuY3Rpb24gdGhhdCBjYW4gYmUgZXhwb3J0ZWQgYXMgdGhlIGRlZmF1bHQgZXhwb3J0XG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogaW1wb3J0IHsgZWxpY2l0YXRpb25Ib29rLCBlbGljaXRhdGlvbk91dHB1dCB9IGZyb20gJ0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcyc7XG4gKlxuICogZXhwb3J0IGRlZmF1bHQgZWxpY2l0YXRpb25Ib29rKHt9LCBhc3luYyAoaW5wdXQsIHsgbG9nZ2VyIH0pID0+IHtcbiAqICAgbG9nZ2VyLmluZm8oJ0VsaWNpdGF0aW9uIHJlcXVlc3QnLCB7IHNlcnZlcjogaW5wdXQubWNwX3NlcnZlcl9uYW1lIH0pO1xuICogICByZXR1cm4gZWxpY2l0YXRpb25PdXRwdXQoe1xuICogICAgIGhvb2tTcGVjaWZpY091dHB1dDogeyBhY3Rpb246ICdhY2NlcHQnLCBjb250ZW50OiB7IGFwcHJvdmVkOiB0cnVlIH0gfVxuICogICB9KTtcbiAqIH0pO1xuICogYGBgXG4gKiBAc2VlIGh0dHBzOi8vY29kZS5jbGF1ZGUuY29tL2RvY3MvZW4vaG9va3MjZWxpY2l0YXRpb25cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGVsaWNpdGF0aW9uSG9vayhjb25maWcsIGhhbmRsZXIpIHtcbiAgICByZXR1cm4gY3JlYXRlSG9va0Z1bmN0aW9uKFwiRWxpY2l0YXRpb25cIiwgY29uZmlnLCBoYW5kbGVyKTtcbn1cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIEVsaWNpdGF0aW9uUmVzdWx0IEhvb2sgRmFjdG9yeVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLyoqXG4gKiBDcmVhdGVzIGFuIEVsaWNpdGF0aW9uUmVzdWx0IGhvb2sgaGFuZGxlci5cbiAqXG4gKiBFbGljaXRhdGlvblJlc3VsdCBob29rcyBmaXJlIHdpdGggdGhlIHJlc3VsdCBvZiBhbiBNQ1AgZWxpY2l0YXRpb24gcmVxdWVzdCxcbiAqIGFsbG93aW5nIHlvdSB0bzpcbiAqIC0gT2JzZXJ2ZSBlbGljaXRhdGlvbiBvdXRjb21lc1xuICogLSBNb2RpZnkgdGhlIHJlc3VsdCBiZWZvcmUgaXQgaXMgcmV0dXJuZWQgdG8gdGhlIE1DUCBzZXJ2ZXJcbiAqIC0gTG9nIGVsaWNpdGF0aW9uIGNvbXBsZXRpb25zXG4gKlxuICogKipNYXRjaGVyKio6IE5vIG1hdGNoZXIgc3VwcG9ydCAtIGZpcmVzIG9uIGFsbCBlbGljaXRhdGlvbiByZXN1bHQgZXZlbnRzXG4gKiBAcGFyYW0gY29uZmlnIC0gSG9vayBjb25maWd1cmF0aW9uIHdpdGggb3B0aW9uYWwgdGltZW91dFxuICogQHBhcmFtIGhhbmRsZXIgLSBUaGUgaGFuZGxlciBmdW5jdGlvbiB0byBleGVjdXRlXG4gKiBAcmV0dXJucyBBIGhvb2sgZnVuY3Rpb24gdGhhdCBjYW4gYmUgZXhwb3J0ZWQgYXMgdGhlIGRlZmF1bHQgZXhwb3J0XG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogaW1wb3J0IHsgZWxpY2l0YXRpb25SZXN1bHRIb29rLCBlbGljaXRhdGlvblJlc3VsdE91dHB1dCB9IGZyb20gJ0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcyc7XG4gKlxuICogZXhwb3J0IGRlZmF1bHQgZWxpY2l0YXRpb25SZXN1bHRIb29rKHt9LCBhc3luYyAoaW5wdXQsIHsgbG9nZ2VyIH0pID0+IHtcbiAqICAgbG9nZ2VyLmluZm8oJ0VsaWNpdGF0aW9uIHJlc3VsdCcsIHsgYWN0aW9uOiBpbnB1dC5hY3Rpb24gfSk7XG4gKiAgIHJldHVybiBlbGljaXRhdGlvblJlc3VsdE91dHB1dCh7fSk7XG4gKiB9KTtcbiAqIGBgYFxuICogQHNlZSBodHRwczovL2NvZGUuY2xhdWRlLmNvbS9kb2NzL2VuL2hvb2tzI2VsaWNpdGF0aW9ucmVzdWx0XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBlbGljaXRhdGlvblJlc3VsdEhvb2soY29uZmlnLCBoYW5kbGVyKSB7XG4gICAgcmV0dXJuIGNyZWF0ZUhvb2tGdW5jdGlvbihcIkVsaWNpdGF0aW9uUmVzdWx0XCIsIGNvbmZpZywgaGFuZGxlcik7XG59XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBDb25maWdDaGFuZ2UgSG9vayBGYWN0b3J5XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vKipcbiAqIENyZWF0ZXMgYSBDb25maWdDaGFuZ2UgaG9vayBoYW5kbGVyLlxuICpcbiAqIENvbmZpZ0NoYW5nZSBob29rcyBmaXJlIHdoZW4gQ2xhdWRlIENvZGUgY29uZmlndXJhdGlvbiBjaGFuZ2VzLCBhbGxvd2luZyB5b3UgdG86XG4gKiAtIFJlYWN0IHRvIHNldHRpbmdzIGZpbGUgY2hhbmdlc1xuICogLSBMb2cgb3IgYXVkaXQgY29uZmlndXJhdGlvbiBjaGFuZ2VzXG4gKiAtIEFwcGx5IGN1c3RvbSBsb2dpYyB3aGVuIHNldHRpbmdzIGFyZSB1cGRhdGVkXG4gKlxuICogKipNYXRjaGVyKio6IE1hdGNoZXMgYWdhaW5zdCBgc291cmNlYCAoJ3VzZXJfc2V0dGluZ3MnLCAncHJvamVjdF9zZXR0aW5ncycsIGV0Yy4pXG4gKiBAcGFyYW0gY29uZmlnIC0gSG9vayBjb25maWd1cmF0aW9uIHdpdGggb3B0aW9uYWwgbWF0Y2hlciBhbmQgdGltZW91dFxuICogQHBhcmFtIGhhbmRsZXIgLSBUaGUgaGFuZGxlciBmdW5jdGlvbiB0byBleGVjdXRlXG4gKiBAcmV0dXJucyBBIGhvb2sgZnVuY3Rpb24gdGhhdCBjYW4gYmUgZXhwb3J0ZWQgYXMgdGhlIGRlZmF1bHQgZXhwb3J0XG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogaW1wb3J0IHsgY29uZmlnQ2hhbmdlSG9vaywgY29uZmlnQ2hhbmdlT3V0cHV0IH0gZnJvbSAnQGdvb2Rmb290L2NsYXVkZS1jb2RlLWhvb2tzJztcbiAqXG4gKiBleHBvcnQgZGVmYXVsdCBjb25maWdDaGFuZ2VIb29rKHt9LCBhc3luYyAoaW5wdXQsIHsgbG9nZ2VyIH0pID0+IHtcbiAqICAgbG9nZ2VyLmluZm8oJ0NvbmZpZyBjaGFuZ2VkJywgeyBzb3VyY2U6IGlucHV0LnNvdXJjZSwgZmlsZTogaW5wdXQuZmlsZV9wYXRoIH0pO1xuICogICByZXR1cm4gY29uZmlnQ2hhbmdlT3V0cHV0KHt9KTtcbiAqIH0pO1xuICogYGBgXG4gKiBAc2VlIGh0dHBzOi8vY29kZS5jbGF1ZGUuY29tL2RvY3MvZW4vaG9va3MjY29uZmlnY2hhbmdlXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjb25maWdDaGFuZ2VIb29rKGNvbmZpZywgaGFuZGxlcikge1xuICAgIHJldHVybiBjcmVhdGVIb29rRnVuY3Rpb24oXCJDb25maWdDaGFuZ2VcIiwgY29uZmlnLCBoYW5kbGVyKTtcbn1cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIEluc3RydWN0aW9uc0xvYWRlZCBIb29rIEZhY3Rvcnlcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8qKlxuICogQ3JlYXRlcyBhbiBJbnN0cnVjdGlvbnNMb2FkZWQgaG9vayBoYW5kbGVyLlxuICpcbiAqIEluc3RydWN0aW9uc0xvYWRlZCBob29rcyBmaXJlIHdoZW4gYSBDTEFVREUubWQgb3Igc2ltaWxhciBpbnN0cnVjdGlvbnMgZmlsZVxuICogaXMgbG9hZGVkLCBhbGxvd2luZyB5b3UgdG86XG4gKiAtIFJlYWN0IHRvIGluc3RydWN0aW9ucyBiZWluZyBhcHBsaWVkXG4gKiAtIExvZyB3aGljaCBpbnN0cnVjdGlvbiBmaWxlcyBhcmUgYWN0aXZlXG4gKiAtIE9ic2VydmUgdGhlIGluc3RydWN0aW9uIGxvYWRpbmcgaGllcmFyY2h5XG4gKlxuICogKipNYXRjaGVyKio6IE5vIG1hdGNoZXIgc3VwcG9ydCAtIGZpcmVzIG9uIGFsbCBpbnN0cnVjdGlvbiBsb2FkIGV2ZW50c1xuICogQHBhcmFtIGNvbmZpZyAtIEhvb2sgY29uZmlndXJhdGlvbiB3aXRoIG9wdGlvbmFsIHRpbWVvdXRcbiAqIEBwYXJhbSBoYW5kbGVyIC0gVGhlIGhhbmRsZXIgZnVuY3Rpb24gdG8gZXhlY3V0ZVxuICogQHJldHVybnMgQSBob29rIGZ1bmN0aW9uIHRoYXQgY2FuIGJlIGV4cG9ydGVkIGFzIHRoZSBkZWZhdWx0IGV4cG9ydFxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGltcG9ydCB7IGluc3RydWN0aW9uc0xvYWRlZEhvb2ssIGluc3RydWN0aW9uc0xvYWRlZE91dHB1dCB9IGZyb20gJ0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcyc7XG4gKlxuICogZXhwb3J0IGRlZmF1bHQgaW5zdHJ1Y3Rpb25zTG9hZGVkSG9vayh7fSwgYXN5bmMgKGlucHV0LCB7IGxvZ2dlciB9KSA9PiB7XG4gKiAgIGxvZ2dlci5pbmZvKCdJbnN0cnVjdGlvbnMgbG9hZGVkJywgeyBmaWxlOiBpbnB1dC5maWxlX3BhdGgsIHR5cGU6IGlucHV0Lm1lbW9yeV90eXBlIH0pO1xuICogICByZXR1cm4gaW5zdHJ1Y3Rpb25zTG9hZGVkT3V0cHV0KHt9KTtcbiAqIH0pO1xuICogYGBgXG4gKiBAc2VlIGh0dHBzOi8vY29kZS5jbGF1ZGUuY29tL2RvY3MvZW4vaG9va3MjaW5zdHJ1Y3Rpb25zbG9hZGVkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpbnN0cnVjdGlvbnNMb2FkZWRIb29rKGNvbmZpZywgaGFuZGxlcikge1xuICAgIHJldHVybiBjcmVhdGVIb29rRnVuY3Rpb24oXCJJbnN0cnVjdGlvbnNMb2FkZWRcIiwgY29uZmlnLCBoYW5kbGVyKTtcbn1cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIFdvcmt0cmVlQ3JlYXRlIEhvb2sgRmFjdG9yeVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLyoqXG4gKiBDcmVhdGVzIGEgV29ya3RyZWVDcmVhdGUgaG9vayBoYW5kbGVyLlxuICpcbiAqIFdvcmt0cmVlQ3JlYXRlIGhvb2tzIGZpcmUgd2hlbiBhIGdpdCB3b3JrdHJlZSBpcyBjcmVhdGVkLCBhbGxvd2luZyB5b3UgdG86XG4gKiAtIFNldCB1cCB3b3JrdHJlZS1zcGVjaWZpYyBjb25maWd1cmF0aW9uXG4gKiAtIExvZyB3b3JrdHJlZSBjcmVhdGlvbiBldmVudHNcbiAqIC0gSW5pdGlhbGl6ZSB3b3JrdHJlZSByZXNvdXJjZXNcbiAqXG4gKiAqKk1hdGNoZXIqKjogTm8gbWF0Y2hlciBzdXBwb3J0IC0gZmlyZXMgb24gYWxsIHdvcmt0cmVlIGNyZWF0aW9uIGV2ZW50c1xuICogQHBhcmFtIGNvbmZpZyAtIEhvb2sgY29uZmlndXJhdGlvbiB3aXRoIG9wdGlvbmFsIHRpbWVvdXRcbiAqIEBwYXJhbSBoYW5kbGVyIC0gVGhlIGhhbmRsZXIgZnVuY3Rpb24gdG8gZXhlY3V0ZVxuICogQHJldHVybnMgQSBob29rIGZ1bmN0aW9uIHRoYXQgY2FuIGJlIGV4cG9ydGVkIGFzIHRoZSBkZWZhdWx0IGV4cG9ydFxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGltcG9ydCB7IHdvcmt0cmVlQ3JlYXRlSG9vaywgd29ya3RyZWVDcmVhdGVPdXRwdXQgfSBmcm9tICdAZ29vZGZvb3QvY2xhdWRlLWNvZGUtaG9va3MnO1xuICpcbiAqIGV4cG9ydCBkZWZhdWx0IHdvcmt0cmVlQ3JlYXRlSG9vayh7fSwgYXN5bmMgKGlucHV0LCB7IGxvZ2dlciB9KSA9PiB7XG4gKiAgIGxvZ2dlci5pbmZvKCdXb3JrdHJlZSBjcmVhdGVkJywgeyBuYW1lOiBpbnB1dC5uYW1lIH0pO1xuICogICByZXR1cm4gd29ya3RyZWVDcmVhdGVPdXRwdXQoe30pO1xuICogfSk7XG4gKiBgYGBcbiAqIEBzZWUgaHR0cHM6Ly9jb2RlLmNsYXVkZS5jb20vZG9jcy9lbi9ob29rcyN3b3JrdHJlZWNyZWF0ZVxuICovXG5leHBvcnQgZnVuY3Rpb24gd29ya3RyZWVDcmVhdGVIb29rKGNvbmZpZywgaGFuZGxlcikge1xuICAgIHJldHVybiBjcmVhdGVIb29rRnVuY3Rpb24oXCJXb3JrdHJlZUNyZWF0ZVwiLCBjb25maWcsIGhhbmRsZXIpO1xufVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gV29ya3RyZWVSZW1vdmUgSG9vayBGYWN0b3J5XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vKipcbiAqIENyZWF0ZXMgYSBXb3JrdHJlZVJlbW92ZSBob29rIGhhbmRsZXIuXG4gKlxuICogV29ya3RyZWVSZW1vdmUgaG9va3MgZmlyZSB3aGVuIGEgZ2l0IHdvcmt0cmVlIGlzIHJlbW92ZWQsIGFsbG93aW5nIHlvdSB0bzpcbiAqIC0gQ2xlYW4gdXAgd29ya3RyZWUtc3BlY2lmaWMgcmVzb3VyY2VzXG4gKiAtIExvZyB3b3JrdHJlZSByZW1vdmFsIGV2ZW50c1xuICpcbiAqICoqTWF0Y2hlcioqOiBObyBtYXRjaGVyIHN1cHBvcnQgLSBmaXJlcyBvbiBhbGwgd29ya3RyZWUgcmVtb3ZhbCBldmVudHNcbiAqIEBwYXJhbSBjb25maWcgLSBIb29rIGNvbmZpZ3VyYXRpb24gd2l0aCBvcHRpb25hbCB0aW1lb3V0XG4gKiBAcGFyYW0gaGFuZGxlciAtIFRoZSBoYW5kbGVyIGZ1bmN0aW9uIHRvIGV4ZWN1dGVcbiAqIEByZXR1cm5zIEEgaG9vayBmdW5jdGlvbiB0aGF0IGNhbiBiZSBleHBvcnRlZCBhcyB0aGUgZGVmYXVsdCBleHBvcnRcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBpbXBvcnQgeyB3b3JrdHJlZVJlbW92ZUhvb2ssIHdvcmt0cmVlUmVtb3ZlT3V0cHV0IH0gZnJvbSAnQGdvb2Rmb290L2NsYXVkZS1jb2RlLWhvb2tzJztcbiAqXG4gKiBleHBvcnQgZGVmYXVsdCB3b3JrdHJlZVJlbW92ZUhvb2soe30sIGFzeW5jIChpbnB1dCwgeyBsb2dnZXIgfSkgPT4ge1xuICogICBsb2dnZXIuaW5mbygnV29ya3RyZWUgcmVtb3ZlZCcsIHsgcGF0aDogaW5wdXQud29ya3RyZWVfcGF0aCB9KTtcbiAqICAgcmV0dXJuIHdvcmt0cmVlUmVtb3ZlT3V0cHV0KHt9KTtcbiAqIH0pO1xuICogYGBgXG4gKiBAc2VlIGh0dHBzOi8vY29kZS5jbGF1ZGUuY29tL2RvY3MvZW4vaG9va3Mjd29ya3RyZWVyZW1vdmVcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHdvcmt0cmVlUmVtb3ZlSG9vayhjb25maWcsIGhhbmRsZXIpIHtcbiAgICByZXR1cm4gY3JlYXRlSG9va0Z1bmN0aW9uKFwiV29ya3RyZWVSZW1vdmVcIiwgY29uZmlnLCBoYW5kbGVyKTtcbn1cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIEN3ZENoYW5nZWQgSG9vayBGYWN0b3J5XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vKipcbiAqIENyZWF0ZXMgYSBDd2RDaGFuZ2VkIGhvb2sgaGFuZGxlci5cbiAqXG4gKiBDd2RDaGFuZ2VkIGhvb2tzIGZpcmUgd2hlbiBDbGF1ZGUgQ29kZSdzIGN1cnJlbnQgd29ya2luZyBkaXJlY3RvcnkgY2hhbmdlcyxcbiAqIGFsbG93aW5nIHlvdSB0bzpcbiAqIC0gUmVhY3QgdG8gZGlyZWN0b3J5IGNoYW5nZXMgd2l0aGluIGEgc2Vzc2lvblxuICogLSBVcGRhdGUgZmlsZSB3YXRjaGVycyBvciBlbnZpcm9ubWVudCBzdGF0ZVxuICogLSBSZXR1cm4gYHdhdGNoUGF0aHNgIHZpYSBgaG9va1NwZWNpZmljT3V0cHV0YCB0byByZWdpc3RlciBwYXRocyBmb3IgRmlsZUNoYW5nZWQgZXZlbnRzXG4gKlxuICogKipNYXRjaGVyKio6IE5vIG1hdGNoZXIgc3VwcG9ydCAtIGZpcmVzIG9uIGFsbCBjd2QgY2hhbmdlIGV2ZW50c1xuICogQHBhcmFtIGNvbmZpZyAtIEhvb2sgY29uZmlndXJhdGlvbiB3aXRoIG9wdGlvbmFsIHRpbWVvdXRcbiAqIEBwYXJhbSBoYW5kbGVyIC0gVGhlIGhhbmRsZXIgZnVuY3Rpb24gdG8gZXhlY3V0ZVxuICogQHJldHVybnMgQSBob29rIGZ1bmN0aW9uIHRoYXQgY2FuIGJlIGV4cG9ydGVkIGFzIHRoZSBkZWZhdWx0IGV4cG9ydFxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGltcG9ydCB7IGN3ZENoYW5nZWRIb29rLCBjd2RDaGFuZ2VkT3V0cHV0IH0gZnJvbSAnQGdvb2Rmb290L2NsYXVkZS1jb2RlLWhvb2tzJztcbiAqXG4gKiBleHBvcnQgZGVmYXVsdCBjd2RDaGFuZ2VkSG9vayh7fSwgYXN5bmMgKGlucHV0LCB7IGxvZ2dlciB9KSA9PiB7XG4gKiAgIGxvZ2dlci5pbmZvKCdXb3JraW5nIGRpcmVjdG9yeSBjaGFuZ2VkJywgeyBmcm9tOiBpbnB1dC5vbGRfY3dkLCB0bzogaW5wdXQubmV3X2N3ZCB9KTtcbiAqICAgcmV0dXJuIGN3ZENoYW5nZWRPdXRwdXQoe30pO1xuICogfSk7XG4gKiBgYGBcbiAqIEBzZWUgaHR0cHM6Ly9jb2RlLmNsYXVkZS5jb20vZG9jcy9lbi9ob29rcyNjd2RjaGFuZ2VkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjd2RDaGFuZ2VkSG9vayhjb25maWcsIGhhbmRsZXIpIHtcbiAgICByZXR1cm4gY3JlYXRlSG9va0Z1bmN0aW9uKFwiQ3dkQ2hhbmdlZFwiLCBjb25maWcsIGhhbmRsZXIpO1xufVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gRmlsZUNoYW5nZWQgSG9vayBGYWN0b3J5XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vKipcbiAqIENyZWF0ZXMgYSBGaWxlQ2hhbmdlZCBob29rIGhhbmRsZXIuXG4gKlxuICogRmlsZUNoYW5nZWQgaG9va3MgZmlyZSB3aGVuIGEgd2F0Y2hlZCBmaWxlIGNoYW5nZXMgb24gZGlzaywgYWxsb3dpbmcgeW91IHRvOlxuICogLSBSZWFjdCB0byBmaWxlIHN5c3RlbSBjaGFuZ2VzIGR1cmluZyBhIHNlc3Npb25cbiAqIC0gSW52YWxpZGF0ZSBjYWNoZXMgb3IgcmVsb2FkIGNvbmZpZ3VyYXRpb25cbiAqIC0gUmV0dXJuIGB3YXRjaFBhdGhzYCB2aWEgYGhvb2tTcGVjaWZpY091dHB1dGAgdG8gdXBkYXRlIHRoZSBzZXQgb2Ygd2F0Y2hlZCBwYXRoc1xuICpcbiAqIFRoZSBpbnB1dCBgZXZlbnRgIGZpZWxkIGluZGljYXRlcyB0aGUgdHlwZSBvZiBjaGFuZ2U6XG4gKiAtIGAnY2hhbmdlJ2AgLSBGaWxlIGNvbnRlbnRzIGNoYW5nZWRcbiAqIC0gYCdhZGQnYCAtIEZpbGUgd2FzIGNyZWF0ZWRcbiAqIC0gYCd1bmxpbmsnYCAtIEZpbGUgd2FzIGRlbGV0ZWRcbiAqXG4gKiAqKk1hdGNoZXIqKjogTm8gbWF0Y2hlciBzdXBwb3J0IC0gZmlyZXMgb24gYWxsIGZpbGUgY2hhbmdlIGV2ZW50c1xuICogQHBhcmFtIGNvbmZpZyAtIEhvb2sgY29uZmlndXJhdGlvbiB3aXRoIG9wdGlvbmFsIHRpbWVvdXRcbiAqIEBwYXJhbSBoYW5kbGVyIC0gVGhlIGhhbmRsZXIgZnVuY3Rpb24gdG8gZXhlY3V0ZVxuICogQHJldHVybnMgQSBob29rIGZ1bmN0aW9uIHRoYXQgY2FuIGJlIGV4cG9ydGVkIGFzIHRoZSBkZWZhdWx0IGV4cG9ydFxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGltcG9ydCB7IGZpbGVDaGFuZ2VkSG9vaywgZmlsZUNoYW5nZWRPdXRwdXQgfSBmcm9tICdAZ29vZGZvb3QvY2xhdWRlLWNvZGUtaG9va3MnO1xuICpcbiAqIGV4cG9ydCBkZWZhdWx0IGZpbGVDaGFuZ2VkSG9vayh7fSwgYXN5bmMgKGlucHV0LCB7IGxvZ2dlciB9KSA9PiB7XG4gKiAgIGxvZ2dlci5pbmZvKCdGaWxlIGNoYW5nZWQnLCB7IHBhdGg6IGlucHV0LmZpbGVfcGF0aCwgZXZlbnQ6IGlucHV0LmV2ZW50IH0pO1xuICogICByZXR1cm4gZmlsZUNoYW5nZWRPdXRwdXQoe30pO1xuICogfSk7XG4gKiBgYGBcbiAqIEBzZWUgaHR0cHM6Ly9jb2RlLmNsYXVkZS5jb20vZG9jcy9lbi9ob29rcyNmaWxlY2hhbmdlZFxuICovXG5leHBvcnQgZnVuY3Rpb24gZmlsZUNoYW5nZWRIb29rKGNvbmZpZywgaGFuZGxlcikge1xuICAgIHJldHVybiBjcmVhdGVIb29rRnVuY3Rpb24oXCJGaWxlQ2hhbmdlZFwiLCBjb25maWcsIGhhbmRsZXIpO1xufVxuIiwgIi8qKlxuICogTG9nZ2VyIHN5c3RlbSBmb3IgQ2xhdWRlIENvZGUgaG9va3MuXG4gKlxuICogUHJvdmlkZXMgc3RydWN0dXJlZCBsb2dnaW5nIHdpdGggZXZlbnQgc3Vic2NyaXB0aW9uIGFuZCBvcHRpb25hbCBmaWxlIG91dHB1dC5cbiAqIFRoZSBsb2dnZXIgaXMgKipzaWxlbnQgYnkgZGVmYXVsdCoqIHRvIGF2b2lkIGludGVyZmVyaW5nIHdpdGggaG9vayBwcm90b2NvbFxuICogKHN0ZG91dCBpcyByZXNlcnZlZCBmb3IgSlNPTiByZXNwb25zZXMsIHN0ZGVyciBtYXkgY29uZmxpY3Qgd2l0aCBDbGF1ZGUgQ29kZSkuXG4gKiBAbW9kdWxlXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogaW1wb3J0IHsgbG9nZ2VyIH0gZnJvbSAnQGdvb2Rmb290L2NsYXVkZS1jb2RlLWhvb2tzJztcbiAqXG4gKiAvLyBTdWJzY3JpYmUgdG8gbG9nIGV2ZW50c1xuICogY29uc3QgdW5zdWJzY3JpYmUgPSBsb2dnZXIub24oJ2Vycm9yJywgKGV2ZW50KSA9PiB7XG4gKiAgIGNvbnNvbGUuZXJyb3IoYEVycm9yIGluICR7ZXZlbnQuaG9va1R5cGV9OiAke2V2ZW50Lm1lc3NhZ2V9YCk7XG4gKiB9KTtcbiAqXG4gKiAvLyBMYXRlciwgY2xlYW4gdXBcbiAqIHVuc3Vic2NyaWJlKCk7XG4gKiBgYGBcbiAqIEBzZWUgaHR0cHM6Ly9jb2RlLmNsYXVkZS5jb20vZG9jcy9lbi9ob29rc1xuICovXG5pbXBvcnQgeyBjbG9zZVN5bmMsIGV4aXN0c1N5bmMsIG1rZGlyU3luYywgb3BlblN5bmMsIHdyaXRlU3luYyB9IGZyb20gXCJub2RlOmZzXCI7XG5pbXBvcnQgeyBkaXJuYW1lIH0gZnJvbSBcIm5vZGU6cGF0aFwiO1xuLyoqXG4gKiBBbGwgbG9nIGxldmVscyBpbiBvcmRlciBvZiBzZXZlcml0eSAobG93ZXN0IHRvIGhpZ2hlc3QpLlxuICovXG5leHBvcnQgY29uc3QgTE9HX0xFVkVMUyA9IFtcImRlYnVnXCIsIFwiaW5mb1wiLCBcIndhcm5cIiwgXCJlcnJvclwiXTtcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIExvZ2dlciBDbGFzc1xuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLyoqXG4gKiBMb2dnZXIgZm9yIENsYXVkZSBDb2RlIGhvb2tzIHdpdGggZXZlbnQgc3Vic2NyaXB0aW9uIGFuZCBmaWxlIG91dHB1dC5cbiAqXG4gKiAjIyBLZXkgQmVoYXZpb3JzXG4gKlxuICogfCBDb25maWd1cmF0aW9uIHwgQmVoYXZpb3IgfFxuICogfC0tLS0tLS0tLS0tLS0tfC0tLS0tLS0tLS18XG4gKiB8IE5vIGNvbmZpZyAoZGVmYXVsdCkgfCAqKlNpbGVudCoqIC0gbm8gb3V0cHV0IGFueXdoZXJlIHxcbiAqIHwgYENMQVVERV9DT0RFX0hPT0tTX0xPR19GSUxFYCBlbnYgdmFyIHwgQXBwZW5kIEpTT04gbGluZXMgdG8gZmlsZSB8XG4gKiB8IGAub24obGV2ZWwsIGhhbmRsZXIpYCByZWdpc3RlcmVkIHwgRXZlbnRzIGRlbGl2ZXJlZCB0byBoYW5kbGVycyBvbmx5IHxcbiAqIHwgTXVsdGlwbGUgZGVzdGluYXRpb25zIHwgQWxsIGRlc3RpbmF0aW9ucyByZWNlaXZlIGV2ZW50cyB8XG4gKlxuICogIyMgSW1wb3J0YW50IE5vdGVzXG4gKlxuICogLSAqKk5ldmVyIG91dHB1dHMgdG8gc3Rkb3V0KiogKHJlc2VydmVkIGZvciBKU09OIGhvb2sgcmVzcG9uc2UpXG4gKiAtICoqTmV2ZXIgb3V0cHV0cyB0byBzdGRlcnIqKiAobWF5IGludGVyZmVyZSB3aXRoIENsYXVkZSBDb2RlIGVycm9yIGhhbmRsaW5nKVxuICogLSBGaWxlIG91dHB1dCB1c2VzIEpTT04gTGluZXMgZm9ybWF0IGZvciBlYXN5IHBhcnNpbmdcbiAqIC0gYC5vbihsZXZlbCwgaGFuZGxlcilgIHJldHVybnMgYW4gdW5zdWJzY3JpYmUgZnVuY3Rpb25cbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBpbXBvcnQgeyBsb2dnZXIgfSBmcm9tICdAZ29vZGZvb3QvY2xhdWRlLWNvZGUtaG9va3MnO1xuICpcbiAqIC8vIFN1YnNjcmliZSB0byBldmVudHMgYXQgc3BlY2lmaWMgbGV2ZWxcbiAqIGxvZ2dlci5vbignd2FybicsIChldmVudCkgPT4ge1xuICogICBzZW5kQWxlcnQoZXZlbnQubWVzc2FnZSk7XG4gKiB9KTtcbiAqXG4gKiAvLyBMb2cgd2l0aGluIGEgaG9vayBoYW5kbGVyXG4gKiBleHBvcnQgZGVmYXVsdCBwcmVUb29sVXNlSG9vayh7IG1hdGNoZXI6ICdCYXNoJyB9LCBhc3luYyAoaW5wdXQsIHsgbG9nZ2VyIH0pID0+IHtcbiAqICAgbG9nZ2VyLndhcm4oJ0Fib3V0IHRvIHZhbGlkYXRlIEJhc2ggY29tbWFuZCcpO1xuICogICByZXR1cm4gcHJlVG9vbFVzZU91dHB1dCh7IGFsbG93OiB0cnVlIH0pO1xuICogfSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNsYXNzIExvZ2dlciB7XG4gICAgLyoqXG4gICAgICogUmVnaXN0ZXJlZCBldmVudCBoYW5kbGVycyBieSBsb2cgbGV2ZWwuXG4gICAgICovXG4gICAgaGFuZGxlcnMgPSBuZXcgTWFwKCk7XG4gICAgLyoqXG4gICAgICogRmlsZSBkZXNjcmlwdG9yIGZvciBsb2cgZmlsZSBvdXRwdXQuXG4gICAgICogTGF6aWx5IGluaXRpYWxpemVkIG9uIGZpcnN0IHdyaXRlLlxuICAgICAqL1xuICAgIGxvZ0ZpbGVGZCA9IG51bGw7XG4gICAgLyoqXG4gICAgICogUGF0aCB0byB0aGUgbG9nIGZpbGUsIGlmIGNvbmZpZ3VyZWQuXG4gICAgICovXG4gICAgbG9nRmlsZVBhdGggPSBudWxsO1xuICAgIC8qKlxuICAgICAqIFdoZXRoZXIgZmlsZSBpbml0aWFsaXphdGlvbiBoYXMgYmVlbiBhdHRlbXB0ZWQuXG4gICAgICovXG4gICAgZmlsZUluaXRpYWxpemVkID0gZmFsc2U7XG4gICAgLyoqXG4gICAgICogQ3VycmVudCBob29rIGNvbnRleHQgZm9yIGVucmljaGluZyBsb2cgZXZlbnRzLlxuICAgICAqL1xuICAgIGN1cnJlbnRIb29rVHlwZTtcbiAgICAvKipcbiAgICAgKiBDdXJyZW50IGhvb2sgaW5wdXQgZm9yIGVucmljaGluZyBsb2cgZXZlbnRzLlxuICAgICAqL1xuICAgIGN1cnJlbnRJbnB1dDtcbiAgICAvKipcbiAgICAgKiBDcmVhdGVzIGEgbmV3IExvZ2dlciBpbnN0YW5jZS5cbiAgICAgKlxuICAgICAqIFR5cGljYWxseSB5b3Ugc2hvdWxkIHVzZSB0aGUgZXhwb3J0ZWQgYGxvZ2dlcmAgc2luZ2xldG9uIHJhdGhlciB0aGFuXG4gICAgICogY3JlYXRpbmcgbmV3IGluc3RhbmNlcy5cbiAgICAgKiBAcGFyYW0gY29uZmlnIC0gT3B0aW9uYWwgY29uZmlndXJhdGlvblxuICAgICAqIEBleGFtcGxlXG4gICAgICogYGBgdHlwZXNjcmlwdFxuICAgICAqIC8vIFVzZSBzaW5nbGV0b24gKHJlY29tbWVuZGVkKVxuICAgICAqIGltcG9ydCB7IGxvZ2dlciB9IGZyb20gJ0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcyc7XG4gICAgICpcbiAgICAgKiAvLyBPciBjcmVhdGUgY3VzdG9tIGluc3RhbmNlXG4gICAgICogY29uc3QgY3VzdG9tTG9nZ2VyID0gbmV3IExvZ2dlcih7IGxvZ0ZpbGVQYXRoOiAnL3Zhci9sb2cvaG9va3MubG9nJyB9KTtcbiAgICAgKiBgYGBcbiAgICAgKi9cbiAgICBjb25zdHJ1Y3Rvcihjb25maWcgPSB7fSkge1xuICAgICAgICAvLyBJbml0aWFsaXplIGhhbmRsZXJzIG1hcCBmb3IgZWFjaCBsZXZlbFxuICAgICAgICBmb3IgKGNvbnN0IGxldmVsIG9mIExPR19MRVZFTFMpIHtcbiAgICAgICAgICAgIHRoaXMuaGFuZGxlcnMuc2V0KGxldmVsLCBuZXcgU2V0KCkpO1xuICAgICAgICB9XG4gICAgICAgIC8vIFNldCBsb2cgZmlsZSBwYXRoIGZyb20gZXhwbGljaXQgY29uZmlnLCBvciBieSByZWFkaW5nIHRoZSBjb25maWd1cmVkIGVudiB2YXJcbiAgICAgICAgdGhpcy5sb2dGaWxlUGF0aCA9IGNvbmZpZy5sb2dGaWxlUGF0aCA/PyAoY29uZmlnLmxvZ0VudlZhciA/IHByb2Nlc3MuZW52W2NvbmZpZy5sb2dFbnZWYXJdIDogdW5kZWZpbmVkKSA/PyBudWxsO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBMb2dzIGEgZGVidWcgbWVzc2FnZS5cbiAgICAgKlxuICAgICAqIFVzZSBmb3IgZGV0YWlsZWQgZGVidWdnaW5nIGluZm9ybWF0aW9uIHRoYXQgaXMgdHlwaWNhbGx5IG9ubHkgdXNlZnVsXG4gICAgICogZHVyaW5nIGRldmVsb3BtZW50IG9yIHRyb3VibGVzaG9vdGluZy5cbiAgICAgKiBAcGFyYW0gbWVzc2FnZSAtIFRoZSBkZWJ1ZyBtZXNzYWdlXG4gICAgICogQHBhcmFtIGNvbnRleHQgLSBPcHRpb25hbCBhZGRpdGlvbmFsIGNvbnRleHRcbiAgICAgKiBAZXhhbXBsZVxuICAgICAqIGBgYHR5cGVzY3JpcHRcbiAgICAgKiBsb2dnZXIuZGVidWcoJ1Byb2Nlc3NpbmcgdG9vbCBpbnB1dCcsIHsgdG9vbE5hbWU6ICdCYXNoJywgaW5wdXRTaXplOiAyNTYgfSk7XG4gICAgICogYGBgXG4gICAgICovXG4gICAgZGVidWcobWVzc2FnZSwgY29udGV4dCkge1xuICAgICAgICB0aGlzLmVtaXQoXCJkZWJ1Z1wiLCBtZXNzYWdlLCBjb250ZXh0KTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogTG9ncyBhbiBpbmZvIG1lc3NhZ2UuXG4gICAgICpcbiAgICAgKiBVc2UgZm9yIGdlbmVyYWwgb3BlcmF0aW9uYWwgZXZlbnRzIGxpa2UgaG9vayBpbnZvY2F0aW9ucywgc3VjY2Vzc2Z1bFxuICAgICAqIGNvbXBsZXRpb25zLCBvciBzdGF0ZSBjaGFuZ2VzLlxuICAgICAqIEBwYXJhbSBtZXNzYWdlIC0gVGhlIGluZm8gbWVzc2FnZVxuICAgICAqIEBwYXJhbSBjb250ZXh0IC0gT3B0aW9uYWwgYWRkaXRpb25hbCBjb250ZXh0XG4gICAgICogQGV4YW1wbGVcbiAgICAgKiBgYGB0eXBlc2NyaXB0XG4gICAgICogbG9nZ2VyLmluZm8oJ1Nlc3Npb24gc3RhcnRlZCcsIHsgc291cmNlOiAnc3RhcnR1cCcsIHNlc3Npb25JZDogJ2FiYzEyMycgfSk7XG4gICAgICogYGBgXG4gICAgICovXG4gICAgaW5mbyhtZXNzYWdlLCBjb250ZXh0KSB7XG4gICAgICAgIHRoaXMuZW1pdChcImluZm9cIiwgbWVzc2FnZSwgY29udGV4dCk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIExvZ3MgYSB3YXJuaW5nIG1lc3NhZ2UuXG4gICAgICpcbiAgICAgKiBVc2UgZm9yIGNvbmRpdGlvbnMgdGhhdCBtYXkgaW5kaWNhdGUgaXNzdWVzIGJ1dCBkb24ndCBwcmV2ZW50XG4gICAgICogb3BlcmF0aW9uLCBzdWNoIGFzIGRlcHJlY2F0ZWQgcGF0dGVybnMgb3IgcGVyZm9ybWFuY2UgY29uY2VybnMuXG4gICAgICogQHBhcmFtIG1lc3NhZ2UgLSBUaGUgd2FybmluZyBtZXNzYWdlXG4gICAgICogQHBhcmFtIGNvbnRleHQgLSBPcHRpb25hbCBhZGRpdGlvbmFsIGNvbnRleHRcbiAgICAgKiBAZXhhbXBsZVxuICAgICAqIGBgYHR5cGVzY3JpcHRcbiAgICAgKiBsb2dnZXIud2FybignRGVwcmVjYXRlZCBob29rIHBhdHRlcm4gZGV0ZWN0ZWQnLCB7IHBhdHRlcm46ICdsZWdhY3lNYXRjaGVyJyB9KTtcbiAgICAgKiBgYGBcbiAgICAgKi9cbiAgICB3YXJuKG1lc3NhZ2UsIGNvbnRleHQpIHtcbiAgICAgICAgdGhpcy5lbWl0KFwid2FyblwiLCBtZXNzYWdlLCBjb250ZXh0KTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogTG9ncyBhbiBlcnJvciBtZXNzYWdlLlxuICAgICAqXG4gICAgICogVXNlIGZvciBlcnJvciBjb25kaXRpb25zIHRoYXQgcmVxdWlyZSBhdHRlbnRpb24gYnV0IHdlcmUgaGFuZGxlZFxuICAgICAqIGdyYWNlZnVsbHkuIEZvciBleGNlcHRpb25zLCBwcmVmZXIge0BsaW5rIGxvZ0Vycm9yfS5cbiAgICAgKiBAcGFyYW0gbWVzc2FnZSAtIFRoZSBlcnJvciBtZXNzYWdlXG4gICAgICogQHBhcmFtIGNvbnRleHQgLSBPcHRpb25hbCBhZGRpdGlvbmFsIGNvbnRleHRcbiAgICAgKiBAZXhhbXBsZVxuICAgICAqIGBgYHR5cGVzY3JpcHRcbiAgICAgKiBsb2dnZXIuZXJyb3IoJ0ZhaWxlZCB0byB2YWxpZGF0ZSB0b29sIGlucHV0JywgeyB0b29sTmFtZTogJ0Jhc2gnLCByZWFzb246ICdlbXB0eSBjb21tYW5kJyB9KTtcbiAgICAgKiBgYGBcbiAgICAgKi9cbiAgICBlcnJvcihtZXNzYWdlLCBjb250ZXh0KSB7XG4gICAgICAgIHRoaXMuZW1pdChcImVycm9yXCIsIG1lc3NhZ2UsIGNvbnRleHQpO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBMb2dzIGEgc3RydWN0dXJlZCBlcnJvciB3aXRoIGZ1bGwgZXJyb3IgZGV0YWlscy5cbiAgICAgKlxuICAgICAqIFVzZSB0aGlzIG1ldGhvZCB3aGVuIGxvZ2dpbmcgY2F1Z2h0IGV4Y2VwdGlvbnMgdG8gY2FwdHVyZSB0aGUgZnVsbFxuICAgICAqIGVycm9yIGNvbnRleHQgaW5jbHVkaW5nIG5hbWUsIG1lc3NhZ2UsIHN0YWNrIHRyYWNlLCBhbmQgY2F1c2UgY2hhaW4uXG4gICAgICogQHBhcmFtIGVycm9yIC0gVGhlIGVycm9yIHRvIGxvZ1xuICAgICAqIEBwYXJhbSBtZXNzYWdlIC0gSHVtYW4tcmVhZGFibGUgZGVzY3JpcHRpb24gb2Ygd2hhdCBmYWlsZWRcbiAgICAgKiBAcGFyYW0gY29udGV4dCAtIE9wdGlvbmFsIGFkZGl0aW9uYWwgY29udGV4dFxuICAgICAqIEBleGFtcGxlXG4gICAgICogYGBgdHlwZXNjcmlwdFxuICAgICAqIHRyeSB7XG4gICAgICogICBhd2FpdCBkYW5nZXJvdXNPcGVyYXRpb24oKTtcbiAgICAgKiB9IGNhdGNoIChlcnIpIHtcbiAgICAgKiAgIGxvZ2dlci5sb2dFcnJvcihlcnIsICdGYWlsZWQgdG8gZXhlY3V0ZSBkYW5nZXJvdXMgb3BlcmF0aW9uJywge1xuICAgICAqICAgICBvcGVyYXRpb246ICdkZWxldGUnLFxuICAgICAqICAgICB0YXJnZXQ6ICcvaW1wb3J0YW50L2ZpbGUudHh0J1xuICAgICAqICAgfSk7XG4gICAgICogfVxuICAgICAqIGBgYFxuICAgICAqL1xuICAgIGxvZ0Vycm9yKGVycm9yLCBtZXNzYWdlLCBjb250ZXh0KSB7XG4gICAgICAgIGNvbnN0IGVycm9ySW5mbyA9IHRoaXMuZXh0cmFjdEVycm9ySW5mbyhlcnJvcik7XG4gICAgICAgIGNvbnN0IGV2ZW50ID0ge1xuICAgICAgICAgICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXG4gICAgICAgICAgICBsZXZlbDogXCJlcnJvclwiLFxuICAgICAgICAgICAgaG9va1R5cGU6IHRoaXMuY3VycmVudEhvb2tUeXBlLFxuICAgICAgICAgICAgbWVzc2FnZSxcbiAgICAgICAgICAgIGlucHV0OiB0aGlzLmN1cnJlbnRJbnB1dCxcbiAgICAgICAgICAgIGVycm9yOiBlcnJvckluZm8sXG4gICAgICAgICAgICBjb250ZXh0LFxuICAgICAgICB9O1xuICAgICAgICB0aGlzLmRlbGl2ZXJFdmVudChldmVudCk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIFN1YnNjcmliZXMgYSBoYW5kbGVyIHRvIGxvZyBldmVudHMgYXQgdGhlIHNwZWNpZmllZCBsZXZlbC5cbiAgICAgKlxuICAgICAqIFRoZSBoYW5kbGVyIHdpbGwgYmUgY2FsbGVkIGZvciBldmVyeSBsb2cgZXZlbnQgYXQgdGhlIHNwZWNpZmllZCBsZXZlbC5cbiAgICAgKiBSZXR1cm5zIGFuIHVuc3Vic2NyaWJlIGZ1bmN0aW9uIHRoYXQgc2hvdWxkIGJlIGNhbGxlZCB3aGVuIHRoZSBoYW5kbGVyXG4gICAgICogaXMgbm8gbG9uZ2VyIG5lZWRlZC5cbiAgICAgKiBAcGFyYW0gbGV2ZWwgLSBUaGUgbG9nIGxldmVsIHRvIHN1YnNjcmliZSB0b1xuICAgICAqIEBwYXJhbSBoYW5kbGVyIC0gVGhlIGhhbmRsZXIgZnVuY3Rpb24gdG8gY2FsbCBmb3IgZWFjaCBldmVudFxuICAgICAqIEByZXR1cm5zIEEgZnVuY3Rpb24gdG8gdW5zdWJzY3JpYmUgdGhlIGhhbmRsZXJcbiAgICAgKiBAZXhhbXBsZVxuICAgICAqIGBgYHR5cGVzY3JpcHRcbiAgICAgKiAvLyBTdWJzY3JpYmUgdG8gZXJyb3IgZXZlbnRzXG4gICAgICogY29uc3QgdW5zdWJzY3JpYmUgPSBsb2dnZXIub24oJ2Vycm9yJywgKGV2ZW50KSA9PiB7XG4gICAgICogICBjb25zb2xlLmVycm9yKGBbJHtldmVudC5ob29rVHlwZX1dICR7ZXZlbnQubWVzc2FnZX1gKTtcbiAgICAgKiAgIGlmIChldmVudC5lcnJvcikge1xuICAgICAqICAgICBjb25zb2xlLmVycm9yKGV2ZW50LmVycm9yLnN0YWNrKTtcbiAgICAgKiAgIH1cbiAgICAgKiB9KTtcbiAgICAgKlxuICAgICAqIC8vIExhdGVyLCBjbGVhbiB1cFxuICAgICAqIHVuc3Vic2NyaWJlKCk7XG4gICAgICogYGBgXG4gICAgICogQGV4YW1wbGVcbiAgICAgKiBgYGB0eXBlc2NyaXB0XG4gICAgICogLy8gRm9yd2FyZCB0byBleHRlcm5hbCBsb2dnaW5nIGxpYnJhcnlcbiAgICAgKiBpbXBvcnQgcGlubyBmcm9tICdwaW5vJztcbiAgICAgKiBjb25zdCBwaW5vTG9nZ2VyID0gcGlubygpO1xuICAgICAqXG4gICAgICogbG9nZ2VyLm9uKCdpbmZvJywgKGV2ZW50KSA9PiBwaW5vTG9nZ2VyLmluZm8oZXZlbnQsIGV2ZW50Lm1lc3NhZ2UpKTtcbiAgICAgKiBsb2dnZXIub24oJ3dhcm4nLCAoZXZlbnQpID0+IHBpbm9Mb2dnZXIud2FybihldmVudCwgZXZlbnQubWVzc2FnZSkpO1xuICAgICAqIGxvZ2dlci5vbignZXJyb3InLCAoZXZlbnQpID0+IHBpbm9Mb2dnZXIuZXJyb3IoZXZlbnQsIGV2ZW50Lm1lc3NhZ2UpKTtcbiAgICAgKiBgYGBcbiAgICAgKi9cbiAgICBvbihsZXZlbCwgaGFuZGxlcikge1xuICAgICAgICBjb25zdCBsZXZlbEhhbmRsZXJzID0gdGhpcy5oYW5kbGVycy5nZXQobGV2ZWwpO1xuICAgICAgICBpZiAobGV2ZWxIYW5kbGVycykge1xuICAgICAgICAgICAgbGV2ZWxIYW5kbGVycy5hZGQoaGFuZGxlcik7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuICgpID0+IHtcbiAgICAgICAgICAgIGxldmVsSGFuZGxlcnM/LmRlbGV0ZShoYW5kbGVyKTtcbiAgICAgICAgfTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogU2V0cyB0aGUgY3VycmVudCBob29rIGNvbnRleHQgZm9yIGVucmljaGluZyBsb2cgZXZlbnRzLlxuICAgICAqXG4gICAgICogVGhpcyBpcyBjYWxsZWQgaW50ZXJuYWxseSBieSB0aGUgcnVudGltZSBiZWZvcmUgaW52b2tpbmcgaG9vayBoYW5kbGVycy5cbiAgICAgKiBZb3UgdHlwaWNhbGx5IGRvbid0IG5lZWQgdG8gY2FsbCB0aGlzIGRpcmVjdGx5LlxuICAgICAqIEBwYXJhbSBob29rVHlwZSAtIFRoZSB0eXBlIG9mIGhvb2sgYmVpbmcgZXhlY3V0ZWRcbiAgICAgKiBAcGFyYW0gaW5wdXQgLSBUaGUgaG9vayBpbnB1dCBkYXRhXG4gICAgICogQGludGVybmFsXG4gICAgICovXG4gICAgc2V0Q29udGV4dChob29rVHlwZSwgaW5wdXQpIHtcbiAgICAgICAgdGhpcy5jdXJyZW50SG9va1R5cGUgPSBob29rVHlwZTtcbiAgICAgICAgdGhpcy5jdXJyZW50SW5wdXQgPSBpbnB1dDtcbiAgICB9XG4gICAgLyoqXG4gICAgICogQ2xlYXJzIHRoZSBjdXJyZW50IGhvb2sgY29udGV4dC5cbiAgICAgKlxuICAgICAqIENhbGxlZCBpbnRlcm5hbGx5IGJ5IHRoZSBydW50aW1lIGFmdGVyIGhvb2sgZXhlY3V0aW9uIGNvbXBsZXRlcy5cbiAgICAgKiBAaW50ZXJuYWxcbiAgICAgKi9cbiAgICBjbGVhckNvbnRleHQoKSB7XG4gICAgICAgIHRoaXMuY3VycmVudEhvb2tUeXBlID0gdW5kZWZpbmVkO1xuICAgICAgICB0aGlzLmN1cnJlbnRJbnB1dCA9IHVuZGVmaW5lZDtcbiAgICB9XG4gICAgLyoqXG4gICAgICogQ29uZmlndXJlcyB0aGUgbG9nIGZpbGUgcGF0aCBhdCBydW50aW1lLlxuICAgICAqXG4gICAgICogQ2FsbCB0aGlzIHRvIGVuYWJsZSBvciBjaGFuZ2UgZmlsZSBsb2dnaW5nLiBTZXR0aW5nIHRvIGBudWxsYCBkaXNhYmxlc1xuICAgICAqIGZpbGUgbG9nZ2luZyAoYnV0IGRvZXNuJ3QgY2xvc2UgZXhpc3RpbmcgZmlsZSBoYW5kbGUgaW1tZWRpYXRlbHkpLlxuICAgICAqIEBwYXJhbSBmaWxlUGF0aCAtIFBhdGggdG8gdGhlIGxvZyBmaWxlLCBvciBudWxsIHRvIGRpc2FibGVcbiAgICAgKiBAZXhhbXBsZVxuICAgICAqIGBgYHR5cGVzY3JpcHRcbiAgICAgKiAvLyBFbmFibGUgZmlsZSBsb2dnaW5nIGF0IHJ1bnRpbWVcbiAgICAgKiBsb2dnZXIuc2V0TG9nRmlsZSgnL3Zhci9sb2cvY2xhdWRlLWhvb2tzLmxvZycpO1xuICAgICAqXG4gICAgICogLy8gRGlzYWJsZSBmaWxlIGxvZ2dpbmdcbiAgICAgKiBsb2dnZXIuc2V0TG9nRmlsZShudWxsKTtcbiAgICAgKiBgYGBcbiAgICAgKi9cbiAgICBzZXRMb2dGaWxlKGZpbGVQYXRoKSB7XG4gICAgICAgIC8vIENsb3NlIGV4aXN0aW5nIGZpbGUgaWYgb3BlblxuICAgICAgICBpZiAodGhpcy5sb2dGaWxlRmQgIT09IG51bGwpIHtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgY2xvc2VTeW5jKHRoaXMubG9nRmlsZUZkKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhdGNoIChjbG9zZUVycm9yKSB7XG4gICAgICAgICAgICAgICAgcHJvY2Vzcy5zdGRlcnIud3JpdGUoYFtjbGF1ZGUtY29kZS1ob29rc10gRmFpbGVkIHRvIGNsb3NlIGxvZyBmaWxlOiAke1N0cmluZyhjbG9zZUVycm9yKX1cXG5gKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMubG9nRmlsZUZkID0gbnVsbDtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmxvZ0ZpbGVQYXRoID0gZmlsZVBhdGg7XG4gICAgICAgIHRoaXMuZmlsZUluaXRpYWxpemVkID0gZmFsc2U7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIENsb3NlcyBhbGwgcmVzb3VyY2VzIGhlbGQgYnkgdGhlIGxvZ2dlci5cbiAgICAgKlxuICAgICAqIENhbGwgdGhpcyBkdXJpbmcgZ3JhY2VmdWwgc2h1dGRvd24gdG8gZW5zdXJlIGFsbCBsb2cgZGF0YSBpcyBmbHVzaGVkLlxuICAgICAqIEBleGFtcGxlXG4gICAgICogYGBgdHlwZXNjcmlwdFxuICAgICAqIHByb2Nlc3Mub24oJ2V4aXQnLCAoKSA9PiB7XG4gICAgICogICBsb2dnZXIuY2xvc2UoKTtcbiAgICAgKiB9KTtcbiAgICAgKiBgYGBcbiAgICAgKi9cbiAgICBjbG9zZSgpIHtcbiAgICAgICAgaWYgKHRoaXMubG9nRmlsZUZkICE9PSBudWxsKSB7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIGNsb3NlU3luYyh0aGlzLmxvZ0ZpbGVGZCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXRjaCAoY2xvc2VFcnJvcikge1xuICAgICAgICAgICAgICAgIHByb2Nlc3Muc3RkZXJyLndyaXRlKGBbY2xhdWRlLWNvZGUtaG9va3NdIEZhaWxlZCB0byBjbG9zZSBsb2cgZmlsZTogJHtTdHJpbmcoY2xvc2VFcnJvcil9XFxuYCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLmxvZ0ZpbGVGZCA9IG51bGw7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5maWxlSW5pdGlhbGl6ZWQgPSBmYWxzZTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogQ2hlY2tzIGlmIHRoZXJlIGFyZSBhbnkgYWN0aXZlIGhhbmRsZXJzIG9yIGRlc3RpbmF0aW9ucy5cbiAgICAgKlxuICAgICAqIFJldHVybnMgdHJ1ZSBpZiBhbnkgaGFuZGxlcnMgYXJlIHJlZ2lzdGVyZWQgb3IgZmlsZSBsb2dnaW5nIGlzIGVuYWJsZWQuXG4gICAgICogQHJldHVybnMgV2hldGhlciB0aGUgbG9nZ2VyIGhhcyBhbnkgYWN0aXZlIG91dHB1dCBkZXN0aW5hdGlvbnNcbiAgICAgKi9cbiAgICBoYXNEZXN0aW5hdGlvbnMoKSB7XG4gICAgICAgIGZvciAoY29uc3QgaGFuZGxlcnMgb2YgdGhpcy5oYW5kbGVycy52YWx1ZXMoKSkge1xuICAgICAgICAgICAgaWYgKGhhbmRsZXJzLnNpemUgPiAwKVxuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzLmxvZ0ZpbGVQYXRoICE9PSBudWxsO1xuICAgIH1cbiAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICAgLy8gUHJpdmF0ZSBNZXRob2RzXG4gICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgIC8qKlxuICAgICAqIEVtaXRzIGEgbG9nIGV2ZW50LlxuICAgICAqIEBwYXJhbSBsZXZlbCAtIFRoZSBzZXZlcml0eSBsZXZlbCBvZiB0aGUgZXZlbnRcbiAgICAgKiBAcGFyYW0gbWVzc2FnZSAtIFRoZSBsb2cgbWVzc2FnZVxuICAgICAqIEBwYXJhbSBjb250ZXh0IC0gT3B0aW9uYWwgYWRkaXRpb25hbCBjb250ZXh0IGRhdGFcbiAgICAgKi9cbiAgICBlbWl0KGxldmVsLCBtZXNzYWdlLCBjb250ZXh0KSB7XG4gICAgICAgIGNvbnN0IGV2ZW50ID0ge1xuICAgICAgICAgICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXG4gICAgICAgICAgICBsZXZlbCxcbiAgICAgICAgICAgIGhvb2tUeXBlOiB0aGlzLmN1cnJlbnRIb29rVHlwZSxcbiAgICAgICAgICAgIG1lc3NhZ2UsXG4gICAgICAgICAgICBpbnB1dDogdGhpcy5jdXJyZW50SW5wdXQsXG4gICAgICAgICAgICBjb250ZXh0LFxuICAgICAgICB9O1xuICAgICAgICB0aGlzLmRlbGl2ZXJFdmVudChldmVudCk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIERlbGl2ZXJzIGFuIGV2ZW50IHRvIGFsbCByZWdpc3RlcmVkIGRlc3RpbmF0aW9ucy5cbiAgICAgKiBAcGFyYW0gZXZlbnQgLSBUaGUgbG9nIGV2ZW50IHRvIGRlbGl2ZXJcbiAgICAgKi9cbiAgICBkZWxpdmVyRXZlbnQoZXZlbnQpIHtcbiAgICAgICAgLy8gRGVsaXZlciB0byBldmVudCBoYW5kbGVyc1xuICAgICAgICBjb25zdCBsZXZlbEhhbmRsZXJzID0gdGhpcy5oYW5kbGVycy5nZXQoZXZlbnQubGV2ZWwpO1xuICAgICAgICBpZiAobGV2ZWxIYW5kbGVycykge1xuICAgICAgICAgICAgZm9yIChjb25zdCBoYW5kbGVyIG9mIGxldmVsSGFuZGxlcnMpIHtcbiAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICBoYW5kbGVyKGV2ZW50KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY2F0Y2ggKGhhbmRsZXJFcnJvcikge1xuICAgICAgICAgICAgICAgICAgICBwcm9jZXNzLnN0ZGVyci53cml0ZShgW2NsYXVkZS1jb2RlLWhvb2tzXSBMb2cgaGFuZGxlciBlcnJvcjogJHtTdHJpbmcoaGFuZGxlckVycm9yKX1cXG5gKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgLy8gV3JpdGUgdG8gZmlsZSBpZiBjb25maWd1cmVkXG4gICAgICAgIHRoaXMud3JpdGVUb0ZpbGUoZXZlbnQpO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBXcml0ZXMgYW4gZXZlbnQgdG8gdGhlIGxvZyBmaWxlLlxuICAgICAqIEBwYXJhbSBldmVudCAtIFRoZSBsb2cgZXZlbnQgdG8gd3JpdGVcbiAgICAgKi9cbiAgICB3cml0ZVRvRmlsZShldmVudCkge1xuICAgICAgICBpZiAoIXRoaXMubG9nRmlsZVBhdGgpXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIC8vIExhenkgaW5pdGlhbGl6YXRpb24gb2YgZmlsZSBoYW5kbGVcbiAgICAgICAgaWYgKCF0aGlzLmZpbGVJbml0aWFsaXplZCkge1xuICAgICAgICAgICAgdGhpcy5pbml0aWFsaXplRmlsZSgpO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0aGlzLmxvZ0ZpbGVGZCA9PT0gbnVsbClcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IGxpbmUgPSBgJHtKU09OLnN0cmluZ2lmeShldmVudCl9XFxuYDtcbiAgICAgICAgICAgIHdyaXRlU3luYyh0aGlzLmxvZ0ZpbGVGZCwgbGluZSk7XG4gICAgICAgIH1cbiAgICAgICAgY2F0Y2ggKHdyaXRlRXJyb3IpIHtcbiAgICAgICAgICAgIC8vIERpc2FibGUgZmlsZSBsb2dnaW5nIGFmdGVyIGEgd3JpdGUgZmFpbHVyZSB0byBhdm9pZCByZXBlYXRlZCBlcnJvcnNcbiAgICAgICAgICAgIHRoaXMubG9nRmlsZUZkID0gbnVsbDtcbiAgICAgICAgICAgIHRoaXMuZmlsZUluaXRpYWxpemVkID0gZmFsc2U7XG4gICAgICAgICAgICBwcm9jZXNzLnN0ZGVyci53cml0ZShgW2NsYXVkZS1jb2RlLWhvb2tzXSBMb2cgZmlsZSB3cml0ZSBmYWlsZWQ6ICR7U3RyaW5nKHdyaXRlRXJyb3IpfVxcbmApO1xuICAgICAgICB9XG4gICAgfVxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemVzIHRoZSBsb2cgZmlsZSBmb3Igd3JpdGluZy5cbiAgICAgKi9cbiAgICBpbml0aWFsaXplRmlsZSgpIHtcbiAgICAgICAgdGhpcy5maWxlSW5pdGlhbGl6ZWQgPSB0cnVlO1xuICAgICAgICBpZiAoIXRoaXMubG9nRmlsZVBhdGgpXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICAvLyBFbnN1cmUgZGlyZWN0b3J5IGV4aXN0c1xuICAgICAgICAgICAgY29uc3QgZGlyID0gZGlybmFtZSh0aGlzLmxvZ0ZpbGVQYXRoKTtcbiAgICAgICAgICAgIGlmICghZXhpc3RzU3luYyhkaXIpKSB7XG4gICAgICAgICAgICAgICAgbWtkaXJTeW5jKGRpciwgeyByZWN1cnNpdmU6IHRydWUgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBPcGVuIGZpbGUgZm9yIGFwcGVuZGluZ1xuICAgICAgICAgICAgdGhpcy5sb2dGaWxlRmQgPSBvcGVuU3luYyh0aGlzLmxvZ0ZpbGVQYXRoLCBcImFcIik7XG4gICAgICAgIH1cbiAgICAgICAgY2F0Y2gge1xuICAgICAgICAgICAgLy8gU2lsZW50bHkgaWdub3JlIGZpbGUgaW5pdGlhbGl6YXRpb24gZXJyb3JzXG4gICAgICAgICAgICB0aGlzLmxvZ0ZpbGVGZCA9IG51bGw7XG4gICAgICAgIH1cbiAgICB9XG4gICAgLyoqXG4gICAgICogRXh0cmFjdHMgc3RydWN0dXJlZCBlcnJvciBpbmZvcm1hdGlvbiBmcm9tIGFuIHVua25vd24gZXJyb3IuXG4gICAgICogQHBhcmFtIGVycm9yIC0gVGhlIGVycm9yIHRvIGV4dHJhY3QgaW5mb3JtYXRpb24gZnJvbVxuICAgICAqIEByZXR1cm5zIFN0cnVjdHVyZWQgZXJyb3IgaW5mb3JtYXRpb25cbiAgICAgKi9cbiAgICBleHRyYWN0RXJyb3JJbmZvKGVycm9yKSB7XG4gICAgICAgIGlmIChlcnJvciBpbnN0YW5jZW9mIEVycm9yKSB7XG4gICAgICAgICAgICBjb25zdCBpbmZvID0ge1xuICAgICAgICAgICAgICAgIG5hbWU6IGVycm9yLm5hbWUsXG4gICAgICAgICAgICAgICAgbWVzc2FnZTogZXJyb3IubWVzc2FnZSxcbiAgICAgICAgICAgICAgICBzdGFjazogZXJyb3Iuc3RhY2ssXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgLy8gRXh0cmFjdCBjYXVzZSBjaGFpbiBpZiBwcmVzZW50XG4gICAgICAgICAgICBpZiAoZXJyb3IuY2F1c2UgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgIGluZm8uY2F1c2UgPSB0aGlzLmV4dHJhY3RFcnJvckluZm8oZXJyb3IuY2F1c2UpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIGluZm87XG4gICAgICAgIH1cbiAgICAgICAgLy8gSGFuZGxlIG5vbi1FcnJvciB2YWx1ZXNcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIG5hbWU6IFwiVW5rbm93bkVycm9yXCIsXG4gICAgICAgICAgICBtZXNzYWdlOiBTdHJpbmcoZXJyb3IpLFxuICAgICAgICB9O1xuICAgIH1cbn1cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIFNpbmdsZXRvbiBFeHBvcnRcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8qKlxuICogR2xvYmFsIGxvZ2dlciBpbnN0YW5jZSBmb3IgQ2xhdWRlIENvZGUgaG9va3MuXG4gKlxuICogVXNlIHRoaXMgc2luZ2xldG9uIGZvciBhbGwgbG9nZ2luZyB3aXRoaW4gaG9va3MuIFRoZSBsb2dnZXIgaXMgY29uZmlndXJlZFxuICogdmlhIGVudmlyb25tZW50IHZhcmlhYmxlcyBhbmQgc3VwcG9ydHMgZXZlbnQgc3Vic2NyaXB0aW9uIGZvciBjdXN0b21cbiAqIGRlc3RpbmF0aW9ucy5cbiAqXG4gKiAjIyBDb25maWd1cmF0aW9uXG4gKlxuICogfCBFbnZpcm9ubWVudCBWYXJpYWJsZSB8IERlc2NyaXB0aW9uIHxcbiAqIHwtLS0tLS0tLS0tLS0tLS0tLS0tLS18LS0tLS0tLS0tLS0tLXxcbiAqIHwgYENMQVVERV9DT0RFX0hPT0tTX0xPR19GSUxFYCB8IFBhdGggdG8gbG9nIGZpbGUgKEpTT04gTGluZXMgZm9ybWF0KSB8XG4gKlxuICogIyMgVXNhZ2UgaW4gSG9va3NcbiAqXG4gKiBUaGUgbG9nZ2VyIGlzIHBhc3NlZCB0byBob29rIGhhbmRsZXJzIHZpYSBjb250ZXh0IGZvciBjb252ZW5pZW5jZTpcbiAqXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBleHBvcnQgZGVmYXVsdCBwcmVUb29sVXNlSG9vayh7IG1hdGNoZXI6ICdCYXNoJyB9LCBhc3luYyAoaW5wdXQsIHsgbG9nZ2VyIH0pID0+IHtcbiAqICAgbG9nZ2VyLndhcm4oJ1ZhbGlkYXRpbmcgQmFzaCBjb21tYW5kJyk7XG4gKiAgIHJldHVybiBwcmVUb29sVXNlT3V0cHV0KHsgYWxsb3c6IHRydWUgfSk7XG4gKiB9KTtcbiAqIGBgYFxuICpcbiAqICMjIEV4dGVybmFsIEludGVncmF0aW9uXG4gKlxuICogU3Vic2NyaWJlIHRvIGV2ZW50cyB0byBmb3J3YXJkIGxvZ3MgdG8gZXh0ZXJuYWwgc3lzdGVtczpcbiAqXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBpbXBvcnQgeyBsb2dnZXIgfSBmcm9tICdAZ29vZGZvb3QvY2xhdWRlLWNvZGUtaG9va3MnO1xuICogaW1wb3J0IHBpbm8gZnJvbSAncGlubyc7XG4gKlxuICogY29uc3QgcGlub0xvZ2dlciA9IHBpbm8oeyBsZXZlbDogJ2RlYnVnJyB9KTtcbiAqXG4gKiBsb2dnZXIub24oJ2RlYnVnJywgKGV2ZW50KSA9PiBwaW5vTG9nZ2VyLmRlYnVnKGV2ZW50LCBldmVudC5tZXNzYWdlKSk7XG4gKiBsb2dnZXIub24oJ2luZm8nLCAoZXZlbnQpID0+IHBpbm9Mb2dnZXIuaW5mbyhldmVudCwgZXZlbnQubWVzc2FnZSkpO1xuICogbG9nZ2VyLm9uKCd3YXJuJywgKGV2ZW50KSA9PiBwaW5vTG9nZ2VyLndhcm4oZXZlbnQsIGV2ZW50Lm1lc3NhZ2UpKTtcbiAqIGxvZ2dlci5vbignZXJyb3InLCAoZXZlbnQpID0+IHBpbm9Mb2dnZXIuZXJyb3IoZXZlbnQsIGV2ZW50Lm1lc3NhZ2UpKTtcbiAqIGBgYFxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIC8vIERpcmVjdCB1c2FnZVxuICogaW1wb3J0IHsgbG9nZ2VyIH0gZnJvbSAnQGdvb2Rmb290L2NsYXVkZS1jb2RlLWhvb2tzJztcbiAqXG4gKiBsb2dnZXIuaW5mbygnU3RhcnRpbmcgb3BlcmF0aW9uJyk7XG4gKiBsb2dnZXIud2FybignUmVzb3VyY2UgbGltaXQgYXBwcm9hY2hpbmcnLCB7IHVzYWdlOiAwLjkgfSk7XG4gKlxuICogdHJ5IHtcbiAqICAgYXdhaXQgcmlza3lPcGVyYXRpb24oKTtcbiAqIH0gY2F0Y2ggKGVycikge1xuICogICBsb2dnZXIubG9nRXJyb3IoZXJyLCAnUmlza3kgb3BlcmF0aW9uIGZhaWxlZCcpO1xuICogfVxuICogYGBgXG4gKi9cbi8vIENMQVVERV9DT0RFX0hPT0tTX0xPR19FTlZfVkFSIGlzIHNldCB1bmNvbmRpdGlvbmFsbHkgYnkgdGhlIC0tbG9nLWVudi12YXIgYmFubmVyXG4vLyBiZWZvcmUgdGhpcyBtb2R1bGUgaW5pdGlhbGlzZXMuIElmIGFic2VudCwgZmFsbCBiYWNrIHRvIHRoZSBkZWZhdWx0IGVudiB2YXIgbmFtZS5cbmV4cG9ydCBjb25zdCBsb2dnZXIgPSBuZXcgTG9nZ2VyKHtcbiAgICBsb2dFbnZWYXI6IHByb2Nlc3MuZW52LkNMQVVERV9DT0RFX0hPT0tTX0xPR19FTlZfVkFSID8/IFwiQ0xBVURFX0NPREVfSE9PS1NfTE9HX0ZJTEVcIixcbn0pO1xuIiwgIi8qKlxuICogT3V0cHV0IHR5cGVzIGFuZCBidWlsZGVycyBmb3IgQ2xhdWRlIENvZGUgaG9va3MuXG4gKlxuICogUHJvdmlkZXMgdHlwZS1zYWZlIG91dHB1dCBidWlsZGVyIGZ1bmN0aW9ucyBmb3IgYWxsIDEyIGhvb2sgdHlwZXMuIEVhY2ggYnVpbGRlclxuICogYWNjZXB0cyBvcHRpb25zIHRoYXQgbWF0Y2ggdGhlIHdpcmUgZm9ybWF0IGV4cGVjdGVkIGJ5IENsYXVkZSBDb2RlLCB3aXRoIHR5cGVzXG4gKiBkZXJpdmVkIGZyb20gdGhlIENsYXVkZSBBZ2VudCBTREsncyBgU3luY0hvb2tKU09OT3V0cHV0YCB0eXBlLlxuICogQHNlZSBodHRwczovL2NvZGUuY2xhdWRlLmNvbS9kb2NzL2VuL2hvb2tzXG4gKiBAbW9kdWxlXG4gKi9cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIEV4aXQgQ29kZSBDb25zdGFudHNcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8qKlxuICogRXhpdCBjb2RlcyB1c2VkIGJ5IENsYXVkZSBDb2RlIGhvb2tzLlxuICpcbiAqIHwgRXhpdCBDb2RlIHwgTmFtZSB8IFdoZW4gVXNlZCB8IENsYXVkZSBDb2RlIEJlaGF2aW9yIHxcbiAqIHwtLS0tLS0tLS0tLXwtLS0tLS18LS0tLS0tLS0tLS18LS0tLS0tLS0tLS0tLS0tLS0tLS0tfFxuICogfCAwIHwgU3VjY2VzcyB8IEhhbmRsZXIgcmV0dXJucyBub3JtYWxseSB8IENvbnRpbnVlLCBwYXJzZSBzdGRvdXQgYXMgSlNPTiB8XG4gKiB8IDEgfCBFcnJvciB8IEludmFsaWQgaW5wdXQsIG5vbi1ibG9ja2luZyBlcnJvciB8IE5vbi1ibG9ja2luZywgc3RkZXJyIHRvIHVzZXIgb25seSB8XG4gKiB8IDIgfCBCbG9jayB8IEhhbmRsZXIgdGhyb3dzIE9SIGBzdG9wUmVhc29uYCBzZXQgfCBCbG9ja2luZywgc3RkZXJyIHNob3duIHRvIENsYXVkZSB8XG4gKi9cbmV4cG9ydCBjb25zdCBFWElUX0NPREVTID0ge1xuICAgIC8qKiBIYW5kbGVyIGNvbXBsZXRlZCBzdWNjZXNzZnVsbHkuIENsYXVkZSBDb2RlIHBhcnNlcyBzdGRvdXQgYXMgSlNPTi4gKi9cbiAgICBTVUNDRVNTOiAwLFxuICAgIC8qKiBOb24tYmxvY2tpbmcgZXJyb3Igb2NjdXJyZWQgKGUuZy4sIGludmFsaWQgaW5wdXQpLiBzdGRlcnIgc2hvd24gdG8gdXNlciBvbmx5LiAqL1xuICAgIEVSUk9SOiAxLFxuICAgIC8qKiBIYW5kbGVyIHRocmV3IGV4Y2VwdGlvbiBPUiBibG9ja2luZyBhY3Rpb24gcmVxdWVzdGVkLiBzdGRlcnIgc2hvd24gdG8gQ2xhdWRlLiAqL1xuICAgIEJMT0NLOiAyLFxufTtcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIE91dHB1dCBCdWlsZGVyIEZhY3Rvcmllc1xuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLyoqXG4gKiBGYWN0b3J5IGZvciBob29rcyB0aGF0IGhhdmUgaG9va1NwZWNpZmljT3V0cHV0IHdpdGggYSBob29rRXZlbnROYW1lIGRpc2NyaW1pbmF0b3IuXG4gKiBAcGFyYW0gaG9va1R5cGUgLSBUaGUgaG9vayB0eXBlIG5hbWUgdXNlZCBhcyB0aGUgX3R5cGUgZGlzY3JpbWluYXRvclxuICogQHJldHVybnMgQSBidWlsZGVyIGZ1bmN0aW9uIHRoYXQgY3JlYXRlcyB0aGUgb3V0cHV0IG9iamVjdFxuICogQGludGVybmFsXG4gKi9cbmZ1bmN0aW9uIGNyZWF0ZUhvb2tTcGVjaWZpY091dHB1dEJ1aWxkZXIoaG9va1R5cGUpIHtcbiAgICByZXR1cm4gKG9wdGlvbnMgPSB7fSkgPT4ge1xuICAgICAgICBjb25zdCB7IGhvb2tTcGVjaWZpY091dHB1dCwgLi4ucmVzdCB9ID0gb3B0aW9ucztcbiAgICAgICAgY29uc3Qgc3Rkb3V0ID0gaG9va1NwZWNpZmljT3V0cHV0ICE9PSB1bmRlZmluZWRcbiAgICAgICAgICAgID8geyAuLi5yZXN0LCBob29rU3BlY2lmaWNPdXRwdXQ6IHsgaG9va0V2ZW50TmFtZTogaG9va1R5cGUsIC4uLmhvb2tTcGVjaWZpY091dHB1dCB9IH1cbiAgICAgICAgICAgIDogcmVzdDtcbiAgICAgICAgcmV0dXJuIHsgX3R5cGU6IGhvb2tUeXBlLCBzdGRvdXQgfTtcbiAgICB9O1xufVxuLyoqXG4gKiBGYWN0b3J5IGZvciBob29rcyB0aGF0IG9ubHkgdXNlIENvbW1vbk9wdGlvbnMgKHNpbXBsZSBwYXNzdGhyb3VnaCkuXG4gKiBAcGFyYW0gaG9va1R5cGUgLSBUaGUgaG9vayB0eXBlIG5hbWUgdXNlZCBhcyB0aGUgX3R5cGUgZGlzY3JpbWluYXRvclxuICogQHJldHVybnMgQSBidWlsZGVyIGZ1bmN0aW9uIHRoYXQgY3JlYXRlcyB0aGUgb3V0cHV0IG9iamVjdFxuICogQGludGVybmFsXG4gKi9cbmZ1bmN0aW9uIGNyZWF0ZVNpbXBsZU91dHB1dEJ1aWxkZXIoaG9va1R5cGUpIHtcbiAgICByZXR1cm4gKG9wdGlvbnMgPSB7fSkgPT4gKHtcbiAgICAgICAgX3R5cGU6IGhvb2tUeXBlLFxuICAgICAgICBzdGRvdXQ6IG9wdGlvbnMsXG4gICAgfSk7XG59XG4vKipcbiAqIEZhY3RvcnkgZm9yIGhvb2tzIHRoYXQgdXNlIGRlY2lzaW9uLWJhc2VkIG9wdGlvbnMgKFN0b3AsIFN1YmFnZW50U3RvcCkuXG4gKiBAcGFyYW0gaG9va1R5cGUgLSBUaGUgaG9vayB0eXBlIG5hbWUgdXNlZCBhcyB0aGUgX3R5cGUgZGlzY3JpbWluYXRvclxuICogQHJldHVybnMgQSBidWlsZGVyIGZ1bmN0aW9uIHRoYXQgY3JlYXRlcyB0aGUgb3V0cHV0IG9iamVjdFxuICogQGludGVybmFsXG4gKi9cbmZ1bmN0aW9uIGNyZWF0ZURlY2lzaW9uT3V0cHV0QnVpbGRlcihob29rVHlwZSkge1xuICAgIHJldHVybiAob3B0aW9ucyA9IHt9KSA9PiAoe1xuICAgICAgICBfdHlwZTogaG9va1R5cGUsXG4gICAgICAgIHN0ZG91dDogb3B0aW9ucyxcbiAgICB9KTtcbn1cbi8qKlxuICogRmFjdG9yeSBmb3IgZXhpdC1jb2RlLWJhc2VkIGhvb2tzIChUZWFtbWF0ZUlkbGUsIFRhc2tDb21wbGV0ZWQpLlxuICpcbiAqIFRoZXNlIGhvb2tzIGRvbid0IHVzZSBKU09OIGRlY2lzaW9uIGNvbnRyb2wgKG5vIENvbW1vbk9wdGlvbnMpLlxuICogVGhlIG9ubHkgb3B0aW9uIGlzIGBzdGRlcnJgIFx1MjAxNCB3aGVuIHByZXNlbnQsIGl0IHRyaWdnZXJzIGV4aXQgY29kZSAyIChCTE9DSykuXG4gKiBTdGRvdXQgYWx3YXlzIHJlY2VpdmVzIGB7fWAgKGVtcHR5IEpTT04gb2JqZWN0KS5cbiAqIEBwYXJhbSBob29rVHlwZSAtIFRoZSBob29rIHR5cGUgbmFtZSB1c2VkIGFzIHRoZSBfdHlwZSBkaXNjcmltaW5hdG9yXG4gKiBAcmV0dXJucyBBIGJ1aWxkZXIgZnVuY3Rpb24gdGhhdCBjcmVhdGVzIHRoZSBvdXRwdXQgb2JqZWN0XG4gKiBAaW50ZXJuYWxcbiAqL1xuZnVuY3Rpb24gY3JlYXRlRXhpdENvZGVPdXRwdXRCdWlsZGVyKGhvb2tUeXBlKSB7XG4gICAgcmV0dXJuICh7IHN0ZGVyciB9ID0ge30pID0+ICh7XG4gICAgICAgIF90eXBlOiBob29rVHlwZSxcbiAgICAgICAgc3Rkb3V0OiB7fSxcbiAgICAgICAgLi4uKHN0ZGVyciAhPT0gdW5kZWZpbmVkID8geyBzdGRlcnIgfSA6IHt9KSxcbiAgICB9KTtcbn1cbi8qKlxuICogQ3JlYXRlcyBhbiBvdXRwdXQgZm9yIFByZVRvb2xVc2UgaG9va3MuXG4gKiBAcGFyYW0gb3B0aW9ucyAtIENvbmZpZ3VyYXRpb24gb3B0aW9ucyBmb3IgdGhlIGhvb2sgb3V0cHV0XG4gKiBAcmV0dXJucyBBIFByZVRvb2xVc2VPdXRwdXQgb2JqZWN0IHJlYWR5IGZvciB0aGUgcnVudGltZVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIC8vIEFsbG93IHRvb2wgZXhlY3V0aW9uXG4gKiBwcmVUb29sVXNlT3V0cHV0KHtcbiAqICAgaG9va1NwZWNpZmljT3V0cHV0OiB7IHBlcm1pc3Npb25EZWNpc2lvbjogJ2FsbG93JyB9XG4gKiB9KTtcbiAqXG4gKiAvLyBEZW55IHdpdGggcmVhc29uXG4gKiBwcmVUb29sVXNlT3V0cHV0KHtcbiAqICAgaG9va1NwZWNpZmljT3V0cHV0OiB7XG4gKiAgICAgcGVybWlzc2lvbkRlY2lzaW9uOiAnZGVueScsXG4gKiAgICAgcGVybWlzc2lvbkRlY2lzaW9uUmVhc29uOiAnRGFuZ2Vyb3VzIGNvbW1hbmQgZGV0ZWN0ZWQnXG4gKiAgIH1cbiAqIH0pO1xuICpcbiAqIC8vIEFsbG93IHdpdGggbW9kaWZpZWQgaW5wdXRcbiAqIHByZVRvb2xVc2VPdXRwdXQoe1xuICogICBob29rU3BlY2lmaWNPdXRwdXQ6IHtcbiAqICAgICBwZXJtaXNzaW9uRGVjaXNpb246ICdhbGxvdycsXG4gKiAgICAgdXBkYXRlZElucHV0OiB7IGNvbW1hbmQ6ICdscyAtbGEnIH1cbiAqICAgfVxuICogfSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNvbnN0IHByZVRvb2xVc2VPdXRwdXQgPSAvKiBAX19QVVJFX18gKi8gY3JlYXRlSG9va1NwZWNpZmljT3V0cHV0QnVpbGRlcihcIlByZVRvb2xVc2VcIik7XG4vKipcbiAqIENyZWF0ZXMgYW4gb3V0cHV0IGZvciBQb3N0VG9vbFVzZSBob29rcy5cbiAqIEBwYXJhbSBvcHRpb25zIC0gQ29uZmlndXJhdGlvbiBvcHRpb25zIGZvciB0aGUgaG9vayBvdXRwdXRcbiAqIEByZXR1cm5zIEEgUG9zdFRvb2xVc2VPdXRwdXQgb2JqZWN0IHJlYWR5IGZvciB0aGUgcnVudGltZVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIC8vIEFkZCBjb250ZXh0IGFmdGVyIGEgZmlsZSByZWFkXG4gKiBwb3N0VG9vbFVzZU91dHB1dCh7XG4gKiAgIGhvb2tTcGVjaWZpY091dHB1dDoge1xuICogICAgIGFkZGl0aW9uYWxDb250ZXh0OiAnRmlsZSBjb250YWlucyBzZW5zaXRpdmUgZGF0YSdcbiAqICAgfVxuICogfSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNvbnN0IHBvc3RUb29sVXNlT3V0cHV0ID0gLyogQF9fUFVSRV9fICovIGNyZWF0ZUhvb2tTcGVjaWZpY091dHB1dEJ1aWxkZXIoXCJQb3N0VG9vbFVzZVwiKTtcbi8qKlxuICogQ3JlYXRlcyBhbiBvdXRwdXQgZm9yIFBvc3RUb29sVXNlRmFpbHVyZSBob29rcy5cbiAqIEBwYXJhbSBvcHRpb25zIC0gQ29uZmlndXJhdGlvbiBvcHRpb25zIGZvciB0aGUgaG9vayBvdXRwdXRcbiAqIEByZXR1cm5zIEEgUG9zdFRvb2xVc2VGYWlsdXJlT3V0cHV0IG9iamVjdCByZWFkeSBmb3IgdGhlIHJ1bnRpbWVcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBwb3N0VG9vbFVzZUZhaWx1cmVPdXRwdXQoe1xuICogICBob29rU3BlY2lmaWNPdXRwdXQ6IHtcbiAqICAgICBhZGRpdGlvbmFsQ29udGV4dDogJ1RyeSB1c2luZyBhIGRpZmZlcmVudCBhcHByb2FjaCdcbiAqICAgfVxuICogfSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNvbnN0IHBvc3RUb29sVXNlRmFpbHVyZU91dHB1dCA9IC8qIEBfX1BVUkVfXyAqLyBjcmVhdGVIb29rU3BlY2lmaWNPdXRwdXRCdWlsZGVyKFwiUG9zdFRvb2xVc2VGYWlsdXJlXCIpO1xuLyoqXG4gKiBDcmVhdGVzIGFuIG91dHB1dCBmb3IgVXNlclByb21wdFN1Ym1pdCBob29rcy5cbiAqIEBwYXJhbSBvcHRpb25zIC0gQ29uZmlndXJhdGlvbiBvcHRpb25zIGZvciB0aGUgaG9vayBvdXRwdXRcbiAqIEByZXR1cm5zIEEgVXNlclByb21wdFN1Ym1pdE91dHB1dCBvYmplY3QgcmVhZHkgZm9yIHRoZSBydW50aW1lXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogdXNlclByb21wdFN1Ym1pdE91dHB1dCh7XG4gKiAgIGhvb2tTcGVjaWZpY091dHB1dDoge1xuICogICAgIGFkZGl0aW9uYWxDb250ZXh0OiAnVGhpcyBwcm9qZWN0IHVzZXMgVHlwZVNjcmlwdCBzdHJpY3QgbW9kZSdcbiAqICAgfVxuICogfSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNvbnN0IHVzZXJQcm9tcHRTdWJtaXRPdXRwdXQgPSAvKiBAX19QVVJFX18gKi8gY3JlYXRlSG9va1NwZWNpZmljT3V0cHV0QnVpbGRlcihcIlVzZXJQcm9tcHRTdWJtaXRcIik7XG4vKipcbiAqIENyZWF0ZXMgYW4gb3V0cHV0IGZvciBTZXNzaW9uU3RhcnQgaG9va3MuXG4gKiBAcGFyYW0gb3B0aW9ucyAtIENvbmZpZ3VyYXRpb24gb3B0aW9ucyBmb3IgdGhlIGhvb2sgb3V0cHV0XG4gKiBAcmV0dXJucyBBIFNlc3Npb25TdGFydE91dHB1dCBvYmplY3QgcmVhZHkgZm9yIHRoZSBydW50aW1lXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogc2Vzc2lvblN0YXJ0T3V0cHV0KHtcbiAqICAgaG9va1NwZWNpZmljT3V0cHV0OiB7XG4gKiAgICAgYWRkaXRpb25hbENvbnRleHQ6IEpTT04uc3RyaW5naWZ5KHsgcHJvamVjdDogJ215LXByb2plY3QnIH0pXG4gKiAgIH1cbiAqIH0pO1xuICogYGBgXG4gKi9cbmV4cG9ydCBjb25zdCBzZXNzaW9uU3RhcnRPdXRwdXQgPSAvKiBAX19QVVJFX18gKi8gY3JlYXRlSG9va1NwZWNpZmljT3V0cHV0QnVpbGRlcihcIlNlc3Npb25TdGFydFwiKTtcbi8qKlxuICogQ3JlYXRlcyBhbiBvdXRwdXQgZm9yIFNlc3Npb25FbmQgaG9va3MuXG4gKiBAcGFyYW0gb3B0aW9ucyAtIENvbmZpZ3VyYXRpb24gb3B0aW9ucyBmb3IgdGhlIGhvb2sgb3V0cHV0XG4gKiBAcmV0dXJucyBBIFNlc3Npb25FbmRPdXRwdXQgb2JqZWN0IHJlYWR5IGZvciB0aGUgcnVudGltZVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIHNlc3Npb25FbmRPdXRwdXQoe30pO1xuICogYGBgXG4gKi9cbmV4cG9ydCBjb25zdCBzZXNzaW9uRW5kT3V0cHV0ID0gLyogQF9fUFVSRV9fICovIGNyZWF0ZVNpbXBsZU91dHB1dEJ1aWxkZXIoXCJTZXNzaW9uRW5kXCIpO1xuLyoqXG4gKiBDcmVhdGVzIGFuIG91dHB1dCBmb3IgU3RvcCBob29rcy5cbiAqIEBwYXJhbSBvcHRpb25zIC0gQ29uZmlndXJhdGlvbiBvcHRpb25zIGZvciB0aGUgaG9vayBvdXRwdXRcbiAqIEByZXR1cm5zIEEgU3RvcE91dHB1dCBvYmplY3QgcmVhZHkgZm9yIHRoZSBydW50aW1lXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogLy8gQWxsb3cgdGhlIHN0b3BcbiAqIHN0b3BPdXRwdXQoeyBkZWNpc2lvbjogJ2FwcHJvdmUnIH0pO1xuICpcbiAqIC8vIEJsb2NrIHdpdGggcmVhc29uXG4gKiBzdG9wT3V0cHV0KHtcbiAqICAgZGVjaXNpb246ICdibG9jaycsXG4gKiAgIHJlYXNvbjogJ1RoZXJlIGFyZSB1bmNvbW1pdHRlZCBjaGFuZ2VzJ1xuICogfSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNvbnN0IHN0b3BPdXRwdXQgPSAvKiBAX19QVVJFX18gKi8gY3JlYXRlRGVjaXNpb25PdXRwdXRCdWlsZGVyKFwiU3RvcFwiKTtcbi8qKlxuICogQ3JlYXRlcyBhbiBvdXRwdXQgZm9yIFN0b3BGYWlsdXJlIGhvb2tzLlxuICogQHBhcmFtIG9wdGlvbnMgLSBDb25maWd1cmF0aW9uIG9wdGlvbnMgZm9yIHRoZSBob29rIG91dHB1dFxuICogQHJldHVybnMgQSBTdG9wRmFpbHVyZU91dHB1dCBvYmplY3QgcmVhZHkgZm9yIHRoZSBydW50aW1lXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogc3RvcEZhaWx1cmVPdXRwdXQoe30pO1xuICogYGBgXG4gKi9cbmV4cG9ydCBjb25zdCBzdG9wRmFpbHVyZU91dHB1dCA9IC8qIEBfX1BVUkVfXyAqLyBjcmVhdGVTaW1wbGVPdXRwdXRCdWlsZGVyKFwiU3RvcEZhaWx1cmVcIik7XG4vKipcbiAqIENyZWF0ZXMgYW4gb3V0cHV0IGZvciBTdWJhZ2VudFN0YXJ0IGhvb2tzLlxuICogQHBhcmFtIG9wdGlvbnMgLSBDb25maWd1cmF0aW9uIG9wdGlvbnMgZm9yIHRoZSBob29rIG91dHB1dFxuICogQHJldHVybnMgQSBTdWJhZ2VudFN0YXJ0T3V0cHV0IG9iamVjdCByZWFkeSBmb3IgdGhlIHJ1bnRpbWVcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBzdWJhZ2VudFN0YXJ0T3V0cHV0KHtcbiAqICAgaG9va1NwZWNpZmljT3V0cHV0OiB7XG4gKiAgICAgYWRkaXRpb25hbENvbnRleHQ6ICdGb2N1cyBvbiBmaW5kaW5nIHBhdHRlcm5zJ1xuICogICB9XG4gKiB9KTtcbiAqIGBgYFxuICovXG5leHBvcnQgY29uc3Qgc3ViYWdlbnRTdGFydE91dHB1dCA9IC8qIEBfX1BVUkVfXyAqLyBjcmVhdGVIb29rU3BlY2lmaWNPdXRwdXRCdWlsZGVyKFwiU3ViYWdlbnRTdGFydFwiKTtcbi8qKlxuICogQ3JlYXRlcyBhbiBvdXRwdXQgZm9yIFN1YmFnZW50U3RvcCBob29rcy5cbiAqIEBwYXJhbSBvcHRpb25zIC0gQ29uZmlndXJhdGlvbiBvcHRpb25zIGZvciB0aGUgaG9vayBvdXRwdXRcbiAqIEByZXR1cm5zIEEgU3ViYWdlbnRTdG9wT3V0cHV0IG9iamVjdCByZWFkeSBmb3IgdGhlIHJ1bnRpbWVcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiAvLyBCbG9jayB3aXRoIHJlYXNvblxuICogc3ViYWdlbnRTdG9wT3V0cHV0KHtcbiAqICAgZGVjaXNpb246ICdibG9jaycsXG4gKiAgIHJlYXNvbjogJ1Rhc2sgbm90IGNvbXBsZXRlJ1xuICogfSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNvbnN0IHN1YmFnZW50U3RvcE91dHB1dCA9IC8qIEBfX1BVUkVfXyAqLyBjcmVhdGVEZWNpc2lvbk91dHB1dEJ1aWxkZXIoXCJTdWJhZ2VudFN0b3BcIik7XG4vKipcbiAqIENyZWF0ZXMgYW4gb3V0cHV0IGZvciBOb3RpZmljYXRpb24gaG9va3MuXG4gKiBAcGFyYW0gb3B0aW9ucyAtIENvbmZpZ3VyYXRpb24gb3B0aW9ucyBmb3IgdGhlIGhvb2sgb3V0cHV0XG4gKiBAcmV0dXJucyBBIE5vdGlmaWNhdGlvbk91dHB1dCBvYmplY3QgcmVhZHkgZm9yIHRoZSBydW50aW1lXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogLy8gQWRkIGNvbnRleHQgYWJvdXQgdGhlIG5vdGlmaWNhdGlvblxuICogbm90aWZpY2F0aW9uT3V0cHV0KHtcbiAqICAgaG9va1NwZWNpZmljT3V0cHV0OiB7XG4gKiAgICAgYWRkaXRpb25hbENvbnRleHQ6ICdOb3RpZmljYXRpb24gZm9yd2FyZGVkIHRvIFNsYWNrICNhbGVydHMgY2hhbm5lbCdcbiAqICAgfVxuICogfSk7XG4gKlxuICogLy8gU3VwcHJlc3MgdGhlIG5vdGlmaWNhdGlvblxuICogbm90aWZpY2F0aW9uT3V0cHV0KHsgc3VwcHJlc3NPdXRwdXQ6IHRydWUgfSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNvbnN0IG5vdGlmaWNhdGlvbk91dHB1dCA9IC8qIEBfX1BVUkVfXyAqLyBjcmVhdGVIb29rU3BlY2lmaWNPdXRwdXRCdWlsZGVyKFwiTm90aWZpY2F0aW9uXCIpO1xuLyoqXG4gKiBDcmVhdGVzIGFuIG91dHB1dCBmb3IgUHJlQ29tcGFjdCBob29rcy5cbiAqIEBwYXJhbSBvcHRpb25zIC0gQ29uZmlndXJhdGlvbiBvcHRpb25zIGZvciB0aGUgaG9vayBvdXRwdXRcbiAqIEByZXR1cm5zIEEgUHJlQ29tcGFjdE91dHB1dCBvYmplY3QgcmVhZHkgZm9yIHRoZSBydW50aW1lXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogcHJlQ29tcGFjdE91dHB1dCh7XG4gKiAgIHN5c3RlbU1lc3NhZ2U6ICdSZW1lbWJlcjogc3RyaWN0IG1vZGUgaXMgZW5hYmxlZCdcbiAqIH0pO1xuICogYGBgXG4gKi9cbmV4cG9ydCBjb25zdCBwcmVDb21wYWN0T3V0cHV0ID0gLyogQF9fUFVSRV9fICovIGNyZWF0ZVNpbXBsZU91dHB1dEJ1aWxkZXIoXCJQcmVDb21wYWN0XCIpO1xuLyoqXG4gKiBDcmVhdGVzIGFuIG91dHB1dCBmb3IgUG9zdENvbXBhY3QgaG9va3MuXG4gKiBAcGFyYW0gb3B0aW9ucyAtIENvbmZpZ3VyYXRpb24gb3B0aW9ucyBmb3IgdGhlIGhvb2sgb3V0cHV0XG4gKiBAcmV0dXJucyBBIFBvc3RDb21wYWN0T3V0cHV0IG9iamVjdCByZWFkeSBmb3IgdGhlIHJ1bnRpbWVcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBwb3N0Q29tcGFjdE91dHB1dCh7fSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNvbnN0IHBvc3RDb21wYWN0T3V0cHV0ID0gLyogQF9fUFVSRV9fICovIGNyZWF0ZVNpbXBsZU91dHB1dEJ1aWxkZXIoXCJQb3N0Q29tcGFjdFwiKTtcbi8qKlxuICogQ3JlYXRlcyBhbiBvdXRwdXQgZm9yIFBlcm1pc3Npb25SZXF1ZXN0IGhvb2tzLlxuICogQHBhcmFtIG9wdGlvbnMgLSBDb25maWd1cmF0aW9uIG9wdGlvbnMgZm9yIHRoZSBob29rIG91dHB1dFxuICogQHJldHVybnMgQSBQZXJtaXNzaW9uUmVxdWVzdE91dHB1dCBvYmplY3QgcmVhZHkgZm9yIHRoZSBydW50aW1lXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogLy8gQXV0by1hcHByb3ZlXG4gKiBwZXJtaXNzaW9uUmVxdWVzdE91dHB1dCh7XG4gKiAgIGhvb2tTcGVjaWZpY091dHB1dDoge1xuICogICAgIGRlY2lzaW9uOiB7IGJlaGF2aW9yOiAnYWxsb3cnIH1cbiAqICAgfVxuICogfSk7XG4gKlxuICogLy8gQXV0by1hcHByb3ZlIHdpdGggbW9kaWZpZWQgaW5wdXRcbiAqIHBlcm1pc3Npb25SZXF1ZXN0T3V0cHV0KHtcbiAqICAgaG9va1NwZWNpZmljT3V0cHV0OiB7XG4gKiAgICAgZGVjaXNpb246IHtcbiAqICAgICAgIGJlaGF2aW9yOiAnYWxsb3cnLFxuICogICAgICAgdXBkYXRlZElucHV0OiB7IGZpbGVfcGF0aDogJy9zYWZlL3BhdGgnIH1cbiAqICAgICB9XG4gKiAgIH1cbiAqIH0pO1xuICpcbiAqIC8vIEF1dG8tZGVueVxuICogcGVybWlzc2lvblJlcXVlc3RPdXRwdXQoe1xuICogICBob29rU3BlY2lmaWNPdXRwdXQ6IHtcbiAqICAgICBkZWNpc2lvbjoge1xuICogICAgICAgYmVoYXZpb3I6ICdkZW55JyxcbiAqICAgICAgIG1lc3NhZ2U6ICdOb3QgYWxsb3dlZCcsXG4gKiAgICAgICBpbnRlcnJ1cHQ6IHRydWVcbiAqICAgICB9XG4gKiAgIH1cbiAqIH0pO1xuICpcbiAqIC8vIEZhbGwgdGhyb3VnaCB0byBub3JtYWwgcHJvbXB0XG4gKiBwZXJtaXNzaW9uUmVxdWVzdE91dHB1dCh7fSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNvbnN0IHBlcm1pc3Npb25SZXF1ZXN0T3V0cHV0ID0gLyogQF9fUFVSRV9fICovIGNyZWF0ZUhvb2tTcGVjaWZpY091dHB1dEJ1aWxkZXIoXCJQZXJtaXNzaW9uUmVxdWVzdFwiKTtcbi8qKlxuICogQ3JlYXRlcyBhbiBvdXRwdXQgZm9yIFNldHVwIGhvb2tzLlxuICogQHBhcmFtIG9wdGlvbnMgLSBDb25maWd1cmF0aW9uIG9wdGlvbnMgZm9yIHRoZSBob29rIG91dHB1dFxuICogQHJldHVybnMgQSBTZXR1cE91dHB1dCBvYmplY3QgcmVhZHkgZm9yIHRoZSBydW50aW1lXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogLy8gQWRkIGNvbnRleHQgZHVyaW5nIHNldHVwXG4gKiBzZXR1cE91dHB1dCh7XG4gKiAgIGhvb2tTcGVjaWZpY091dHB1dDoge1xuICogICAgIGFkZGl0aW9uYWxDb250ZXh0OiAnUHJvamVjdCBpbml0aWFsaXplZCB3aXRoIGN1c3RvbSBzZXR0aW5ncydcbiAqICAgfVxuICogfSk7XG4gKlxuICogLy8gU2ltcGxlIHBhc3N0aHJvdWdoXG4gKiBzZXR1cE91dHB1dCh7fSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNvbnN0IHNldHVwT3V0cHV0ID0gLyogQF9fUFVSRV9fICovIGNyZWF0ZUhvb2tTcGVjaWZpY091dHB1dEJ1aWxkZXIoXCJTZXR1cFwiKTtcbi8qKlxuICogQ3JlYXRlcyBhbiBvdXRwdXQgZm9yIFRlYW1tYXRlSWRsZSBob29rcy5cbiAqIEBwYXJhbSBvcHRpb25zIC0gQ29uZmlndXJhdGlvbiBvcHRpb25zIGZvciB0aGUgaG9vayBvdXRwdXRcbiAqIEByZXR1cm5zIEEgVGVhbW1hdGVJZGxlT3V0cHV0IG9iamVjdCByZWFkeSBmb3IgdGhlIHJ1bnRpbWVcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiAvLyBBbGxvdyB0ZWFtbWF0ZSB0byBnbyBpZGxlXG4gKiB0ZWFtbWF0ZUlkbGVPdXRwdXQoe30pO1xuICpcbiAqIC8vIEJsb2NrIHdpdGggZmVlZGJhY2tcbiAqIHRlYW1tYXRlSWRsZU91dHB1dCh7IHN0ZGVycjogJ0NvbnRpbnVlIHdvcmtpbmc6IHVuZmluaXNoZWQgdGFza3MgcmVtYWluLicgfSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNvbnN0IHRlYW1tYXRlSWRsZU91dHB1dCA9IC8qIEBfX1BVUkVfXyAqLyBjcmVhdGVFeGl0Q29kZU91dHB1dEJ1aWxkZXIoXCJUZWFtbWF0ZUlkbGVcIik7XG4vKipcbiAqIENyZWF0ZXMgYW4gb3V0cHV0IGZvciBUYXNrQ29tcGxldGVkIGhvb2tzLlxuICogQHBhcmFtIG9wdGlvbnMgLSBDb25maWd1cmF0aW9uIG9wdGlvbnMgZm9yIHRoZSBob29rIG91dHB1dFxuICogQHJldHVybnMgQSBUYXNrQ29tcGxldGVkT3V0cHV0IG9iamVjdCByZWFkeSBmb3IgdGhlIHJ1bnRpbWVcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiAvLyBBbGxvdyB0YXNrIGNvbXBsZXRpb25cbiAqIHRhc2tDb21wbGV0ZWRPdXRwdXQoe30pO1xuICpcbiAqIC8vIEJsb2NrIHdpdGggZmVlZGJhY2tcbiAqIHRhc2tDb21wbGV0ZWRPdXRwdXQoeyBzdGRlcnI6ICdDYW5ub3QgY29tcGxldGU6IHRlc3RzIGFyZSBmYWlsaW5nLicgfSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNvbnN0IHRhc2tDb21wbGV0ZWRPdXRwdXQgPSAvKiBAX19QVVJFX18gKi8gY3JlYXRlRXhpdENvZGVPdXRwdXRCdWlsZGVyKFwiVGFza0NvbXBsZXRlZFwiKTtcbi8qKlxuICogQ3JlYXRlcyBhbiBvdXRwdXQgZm9yIEVsaWNpdGF0aW9uIGhvb2tzLlxuICogQHBhcmFtIG9wdGlvbnMgLSBDb25maWd1cmF0aW9uIG9wdGlvbnMgZm9yIHRoZSBob29rIG91dHB1dFxuICogQHJldHVybnMgQW4gRWxpY2l0YXRpb25PdXRwdXQgb2JqZWN0IHJlYWR5IGZvciB0aGUgcnVudGltZVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIC8vIEFjY2VwdCB0aGUgZWxpY2l0YXRpb25cbiAqIGVsaWNpdGF0aW9uT3V0cHV0KHtcbiAqICAgaG9va1NwZWNpZmljT3V0cHV0OiB7IGFjdGlvbjogJ2FjY2VwdCcsIGNvbnRlbnQ6IHsgdXNlcm5hbWU6ICdhbGljZScgfSB9XG4gKiB9KTtcbiAqXG4gKiAvLyBEZWNsaW5lIHRoZSBlbGljaXRhdGlvblxuICogZWxpY2l0YXRpb25PdXRwdXQoe1xuICogICBob29rU3BlY2lmaWNPdXRwdXQ6IHsgYWN0aW9uOiAnZGVjbGluZScgfVxuICogfSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNvbnN0IGVsaWNpdGF0aW9uT3V0cHV0ID0gLyogQF9fUFVSRV9fICovIGNyZWF0ZUhvb2tTcGVjaWZpY091dHB1dEJ1aWxkZXIoXCJFbGljaXRhdGlvblwiKTtcbi8qKlxuICogQ3JlYXRlcyBhbiBvdXRwdXQgZm9yIEVsaWNpdGF0aW9uUmVzdWx0IGhvb2tzLlxuICogQHBhcmFtIG9wdGlvbnMgLSBDb25maWd1cmF0aW9uIG9wdGlvbnMgZm9yIHRoZSBob29rIG91dHB1dFxuICogQHJldHVybnMgQW4gRWxpY2l0YXRpb25SZXN1bHRPdXRwdXQgb2JqZWN0IHJlYWR5IGZvciB0aGUgcnVudGltZVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGVsaWNpdGF0aW9uUmVzdWx0T3V0cHV0KHt9KTtcbiAqIGBgYFxuICovXG5leHBvcnQgY29uc3QgZWxpY2l0YXRpb25SZXN1bHRPdXRwdXQgPSAvKiBAX19QVVJFX18gKi8gY3JlYXRlSG9va1NwZWNpZmljT3V0cHV0QnVpbGRlcihcIkVsaWNpdGF0aW9uUmVzdWx0XCIpO1xuLyoqXG4gKiBDcmVhdGVzIGFuIG91dHB1dCBmb3IgQ29uZmlnQ2hhbmdlIGhvb2tzLlxuICogQHBhcmFtIG9wdGlvbnMgLSBDb25maWd1cmF0aW9uIG9wdGlvbnMgZm9yIHRoZSBob29rIG91dHB1dFxuICogQHJldHVybnMgQSBDb25maWdDaGFuZ2VPdXRwdXQgb2JqZWN0IHJlYWR5IGZvciB0aGUgcnVudGltZVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGNvbmZpZ0NoYW5nZU91dHB1dCh7fSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNvbnN0IGNvbmZpZ0NoYW5nZU91dHB1dCA9IC8qIEBfX1BVUkVfXyAqLyBjcmVhdGVTaW1wbGVPdXRwdXRCdWlsZGVyKFwiQ29uZmlnQ2hhbmdlXCIpO1xuLyoqXG4gKiBDcmVhdGVzIGFuIG91dHB1dCBmb3IgSW5zdHJ1Y3Rpb25zTG9hZGVkIGhvb2tzLlxuICogQHBhcmFtIG9wdGlvbnMgLSBDb25maWd1cmF0aW9uIG9wdGlvbnMgZm9yIHRoZSBob29rIG91dHB1dFxuICogQHJldHVybnMgQW4gSW5zdHJ1Y3Rpb25zTG9hZGVkT3V0cHV0IG9iamVjdCByZWFkeSBmb3IgdGhlIHJ1bnRpbWVcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBpbnN0cnVjdGlvbnNMb2FkZWRPdXRwdXQoe30pO1xuICogYGBgXG4gKi9cbmV4cG9ydCBjb25zdCBpbnN0cnVjdGlvbnNMb2FkZWRPdXRwdXQgPSBcbi8qIEBfX1BVUkVfXyAqLyBjcmVhdGVTaW1wbGVPdXRwdXRCdWlsZGVyKFwiSW5zdHJ1Y3Rpb25zTG9hZGVkXCIpO1xuLyoqXG4gKiBDcmVhdGVzIGFuIG91dHB1dCBmb3IgV29ya3RyZWVDcmVhdGUgaG9va3MuXG4gKiBAcGFyYW0gb3B0aW9ucyAtIENvbmZpZ3VyYXRpb24gb3B0aW9ucyBmb3IgdGhlIGhvb2sgb3V0cHV0XG4gKiBAcmV0dXJucyBBIFdvcmt0cmVlQ3JlYXRlT3V0cHV0IG9iamVjdCByZWFkeSBmb3IgdGhlIHJ1bnRpbWVcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiB3b3JrdHJlZUNyZWF0ZU91dHB1dCh7fSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNvbnN0IHdvcmt0cmVlQ3JlYXRlT3V0cHV0ID0gLyogQF9fUFVSRV9fICovIGNyZWF0ZVNpbXBsZU91dHB1dEJ1aWxkZXIoXCJXb3JrdHJlZUNyZWF0ZVwiKTtcbi8qKlxuICogQ3JlYXRlcyBhbiBvdXRwdXQgZm9yIFdvcmt0cmVlUmVtb3ZlIGhvb2tzLlxuICogQHBhcmFtIG9wdGlvbnMgLSBDb25maWd1cmF0aW9uIG9wdGlvbnMgZm9yIHRoZSBob29rIG91dHB1dFxuICogQHJldHVybnMgQSBXb3JrdHJlZVJlbW92ZU91dHB1dCBvYmplY3QgcmVhZHkgZm9yIHRoZSBydW50aW1lXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogd29ya3RyZWVSZW1vdmVPdXRwdXQoe30pO1xuICogYGBgXG4gKi9cbmV4cG9ydCBjb25zdCB3b3JrdHJlZVJlbW92ZU91dHB1dCA9IC8qIEBfX1BVUkVfXyAqLyBjcmVhdGVTaW1wbGVPdXRwdXRCdWlsZGVyKFwiV29ya3RyZWVSZW1vdmVcIik7XG4vKipcbiAqIENyZWF0ZXMgYW4gb3V0cHV0IGZvciBDd2RDaGFuZ2VkIGhvb2tzLlxuICogQHBhcmFtIG9wdGlvbnMgLSBDb25maWd1cmF0aW9uIG9wdGlvbnMgZm9yIHRoZSBob29rIG91dHB1dFxuICogQHJldHVybnMgQSBDd2RDaGFuZ2VkT3V0cHV0IG9iamVjdCByZWFkeSBmb3IgdGhlIHJ1bnRpbWVcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiAvLyBSZXR1cm4gYWRkaXRpb25hbCBwYXRocyB0byB3YXRjaCBhZnRlciB0aGUgY3dkIGNoYW5nZVxuICogY3dkQ2hhbmdlZE91dHB1dCh7XG4gKiAgIGhvb2tTcGVjaWZpY091dHB1dDoge1xuICogICAgIHdhdGNoUGF0aHM6IFsnL25ldy9wYXRoL3RvL3dhdGNoJ11cbiAqICAgfVxuICogfSk7XG4gKlxuICogLy8gU2ltcGxlIHBhc3N0aHJvdWdoXG4gKiBjd2RDaGFuZ2VkT3V0cHV0KHt9KTtcbiAqIGBgYFxuICovXG5leHBvcnQgY29uc3QgY3dkQ2hhbmdlZE91dHB1dCA9IC8qIEBfX1BVUkVfXyAqLyBjcmVhdGVIb29rU3BlY2lmaWNPdXRwdXRCdWlsZGVyKFwiQ3dkQ2hhbmdlZFwiKTtcbi8qKlxuICogQ3JlYXRlcyBhbiBvdXRwdXQgZm9yIEZpbGVDaGFuZ2VkIGhvb2tzLlxuICogQHBhcmFtIG9wdGlvbnMgLSBDb25maWd1cmF0aW9uIG9wdGlvbnMgZm9yIHRoZSBob29rIG91dHB1dFxuICogQHJldHVybnMgQSBGaWxlQ2hhbmdlZE91dHB1dCBvYmplY3QgcmVhZHkgZm9yIHRoZSBydW50aW1lXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogLy8gVXBkYXRlIHRoZSBzZXQgb2Ygd2F0Y2hlZCBwYXRoc1xuICogZmlsZUNoYW5nZWRPdXRwdXQoe1xuICogICBob29rU3BlY2lmaWNPdXRwdXQ6IHtcbiAqICAgICB3YXRjaFBhdGhzOiBbJy9wYXRoL3RvL3dhdGNoJywgJy9hbm90aGVyL3BhdGgnXVxuICogICB9XG4gKiB9KTtcbiAqXG4gKiAvLyBTaW1wbGUgcGFzc3Rocm91Z2hcbiAqIGZpbGVDaGFuZ2VkT3V0cHV0KHt9KTtcbiAqIGBgYFxuICovXG5leHBvcnQgY29uc3QgZmlsZUNoYW5nZWRPdXRwdXQgPSAvKiBAX19QVVJFX18gKi8gY3JlYXRlSG9va1NwZWNpZmljT3V0cHV0QnVpbGRlcihcIkZpbGVDaGFuZ2VkXCIpO1xuIiwgIi8qKlxuICogUnVudGltZSBtb2R1bGUgZm9yIENsYXVkZSBDb2RlIGhvb2tzLlxuICpcbiAqIEhhbmRsZXMgc3RkaW4vc3Rkb3V0L2V4aXQgY29kZSBzZW1hbnRpY3MgZm9yIGNvbXBpbGVkIGhvb2sgZXhlY3V0aW9uLlxuICogVGhpcyBtb2R1bGUgaXMgdGhlIGNvcmUgb3JjaGVzdHJhdG9yIHRoYXQ6XG4gKiAtIFJlYWRzIEpTT04gZnJvbSBzdGRpbiAod2lyZSBmb3JtYXQgd2l0aCBzbmFrZV9jYXNlIHByb3BlcnRpZXMpXG4gKiAtIEludm9rZXMgdGhlIGhvb2sgaGFuZGxlclxuICogLSBXcml0ZXMgb3V0cHV0IHRvIHN0ZG91dFxuICogLSBNYW5hZ2VzIGV4aXQgY29kZXNcbiAqIEBtb2R1bGVcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiAvLyBJbiBhIGNvbXBpbGVkIGhvb2sgZmlsZVxuICogaW1wb3J0IHsgZXhlY3V0ZSB9IGZyb20gJ0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcy9ydW50aW1lJztcbiAqIGltcG9ydCBteUhvb2sgZnJvbSAnLi9teS1ob29rLmpzJztcbiAqXG4gKiBleGVjdXRlKG15SG9vayk7XG4gKiBgYGBcbiAqIEBzZWUgaHR0cHM6Ly9jb2RlLmNsYXVkZS5jb20vZG9jcy9lbi9ob29rc1xuICovXG5pbXBvcnQgeyBwZXJzaXN0RW52VmFyLCBwZXJzaXN0RW52VmFycyB9IGZyb20gXCIuL2Vudi5qc1wiO1xuaW1wb3J0IHsgbG9nZ2VyIH0gZnJvbSBcIi4vbG9nZ2VyLmpzXCI7XG5pbXBvcnQgeyBFWElUX0NPREVTIH0gZnJvbSBcIi4vb3V0cHV0cy5qc1wiO1xuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gU3RkaW4vU3Rkb3V0IEhhbmRsaW5nXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vKipcbiAqIFJlYWRzIGFsbCBkYXRhIGZyb20gc3RkaW4uXG4gKiBAcmV0dXJucyBQcm9taXNlIHJlc29sdmluZyB0byB0aGUgY29tcGxldGUgc3RkaW4gY29udGVudFxuICovXG5hc3luYyBmdW5jdGlvbiByZWFkU3RkaW4oKSB7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgY29uc3QgY2h1bmtzID0gW107XG4gICAgICAgIC8vIFNldCBlbmNvZGluZyBmaXJzdCB0byBlbnN1cmUgZGF0YSBldmVudHMgcmVjZWl2ZSBzdHJpbmdzXG4gICAgICAgIHByb2Nlc3Muc3RkaW4uc2V0RW5jb2RpbmcoXCJ1dGYtOFwiKTtcbiAgICAgICAgcHJvY2Vzcy5zdGRpbi5vbihcImRhdGFcIiwgKGNodW5rKSA9PiB7XG4gICAgICAgICAgICBjaHVua3MucHVzaChjaHVuayk7XG4gICAgICAgIH0pO1xuICAgICAgICBwcm9jZXNzLnN0ZGluLm9uKFwiZW5kXCIsICgpID0+IHtcbiAgICAgICAgICAgIHJlc29sdmUoY2h1bmtzLmpvaW4oXCJcIikpO1xuICAgICAgICB9KTtcbiAgICAgICAgcHJvY2Vzcy5zdGRpbi5vbihcImVycm9yXCIsIChlcnJvcikgPT4ge1xuICAgICAgICAgICAgcmVqZWN0KGVycm9yKTtcbiAgICAgICAgfSk7XG4gICAgfSk7XG59XG4vKipcbiAqIFBhcnNlcyBzdGRpbiBKU09OIGlucHV0LlxuICogQHBhcmFtIHN0ZGluQ29udGVudCAtIFJhdyBzdGRpbiBjb250ZW50XG4gKiBAcmV0dXJucyBQYXJzZWQgaW5wdXQgKHdpcmUgZm9ybWF0IHdpdGggc25ha2VfY2FzZSBwcm9wZXJ0aWVzKVxuICogQHRocm93cyBFcnJvciBpZiBKU09OIGlzIG1hbGZvcm1lZFxuICovXG5mdW5jdGlvbiBwYXJzZVN0ZGluSW5wdXQoc3RkaW5Db250ZW50KSB7XG4gICAgLy8gUGFyc2UgSlNPTiAtIGlucHV0IHVzZXMgd2lyZSBmb3JtYXQgKHNuYWtlX2Nhc2UpIGRpcmVjdGx5XG4gICAgY29uc3QgcmF3SW5wdXQgPSBKU09OLnBhcnNlKHN0ZGluQ29udGVudCk7XG4gICAgcmV0dXJuIHJhd0lucHV0O1xufVxuLyoqXG4gKiBXcml0ZXMgaG9vayBvdXRwdXQgdG8gc3Rkb3V0LlxuICpcbiAqIE91dHB1dCB1c2VzIGNhbWVsQ2FzZSBrZXlzIHBlciBDbGF1ZGUgQ29kZSBob29rIHNwZWNpZmljYXRpb24uXG4gKiBAcGFyYW0gb3V0cHV0IC0gVGhlIGhvb2sgb3V0cHV0IHRvIHdyaXRlXG4gKiBAc2VlIGh0dHBzOi8vY29kZS5jbGF1ZGUuY29tL2RvY3MvZW4vaG9va3MjaG9vay1vdXRwdXQtc3RydWN0dXJlXG4gKi9cbmZ1bmN0aW9uIHdyaXRlU3Rkb3V0KG91dHB1dCkge1xuICAgIC8vIE91dHB1dCB1c2VzIGNhbWVsQ2FzZSAtIG5vIHRyYW5zZm9ybWF0aW9uIG5lZWRlZFxuICAgIHByb2Nlc3Muc3Rkb3V0LndyaXRlKEpTT04uc3RyaW5naWZ5KG91dHB1dCkpO1xufVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gRXJyb3IgSGFuZGxpbmdcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8qKlxuICogQ3JlYXRlcyBhbiBlcnJvciBvdXRwdXQgZm9yIG1hbGZvcm1lZCBzdGRpbiBKU09OLlxuICogQHBhcmFtIGVycm9yIC0gVGhlIHBhcnNlIGVycm9yXG4gKiBAcmV0dXJucyBIb29rT3V0cHV0IHdpdGggZW1wdHkgc3Rkb3V0XG4gKi9cbmZ1bmN0aW9uIGNyZWF0ZU1hbGZvcm1lZElucHV0T3V0cHV0KGVycm9yKSB7XG4gICAgbG9nZ2VyLmVycm9yKGBJbnZhbGlkIEpTT04gaW5wdXQ6ICR7ZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiBTdHJpbmcoZXJyb3IpfWApO1xuICAgIHJldHVybiB7IHN0ZG91dDoge30gfTtcbn1cbi8qKlxuICogV3JpdGVzIGhhbmRsZXIgZXJyb3Igc3RhY2t0cmFjZSB0byBzdGRlcnIgYW5kIGV4aXRzIHdpdGggY29kZSAyLlxuICpcbiAqIFdoZW4gYSBob29rIGhhbmRsZXIgdGhyb3dzIGFuIGV4Y2VwdGlvbjpcbiAqIC0gU3RhY2t0cmFjZSAod2l0aCBzb3VyY2VtYXBzIGlmIGF2YWlsYWJsZSkgaXMgb3V0cHV0IHRvIHN0ZGVyclxuICogLSBQcm9jZXNzIGV4aXRzIHdpdGggY29kZSAyIChCTE9DSylcbiAqIC0gTm8gSlNPTiBpcyBvdXRwdXQgdG8gc3Rkb3V0XG4gKiBAcGFyYW0gZXJyb3IgLSBUaGUgZXJyb3IgdGhyb3duIGJ5IHRoZSBoYW5kbGVyXG4gKi9cbmZ1bmN0aW9uIGhhbmRsZUhhbmRsZXJFcnJvcihlcnJvcikge1xuICAgIC8vIFdyaXRlIHN0YWNrIHRyYWNlIHRvIHN0ZGVyciAoc291cmNlbWFwcyBhcmUgYXBwbGllZCBhdXRvbWF0aWNhbGx5IGJ5IE5vZGUuanMpXG4gICAgaWYgKGVycm9yIGluc3RhbmNlb2YgRXJyb3IpIHtcbiAgICAgICAgcHJvY2Vzcy5zdGRlcnIud3JpdGUoYCR7ZXJyb3Iuc3RhY2sgPz8gZXJyb3IubWVzc2FnZX1cXG5gKTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIHByb2Nlc3Muc3RkZXJyLndyaXRlKGAke1N0cmluZyhlcnJvcil9XFxuYCk7XG4gICAgfVxuICAgIC8vIExvZyB0byBmaWxlIGlmIGNvbmZpZ3VyZWRcbiAgICBsb2dnZXIuZXJyb3IoYEhvb2sgaGFuZGxlciBlcnJvcjogJHtlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6IFN0cmluZyhlcnJvcil9YCk7XG4gICAgLy8gQ2xlYXIgbG9nZ2VyIGNvbnRleHQgYW5kIGNsb3NlXG4gICAgbG9nZ2VyLmNsZWFyQ29udGV4dCgpO1xuICAgIGxvZ2dlci5jbG9zZSgpO1xuICAgIC8vIEV4aXQgd2l0aCBjb2RlIDIgKEJMT0NLKSAtIG5vIEpTT04gb3V0cHV0XG4gICAgcHJvY2Vzcy5leGl0KEVYSVRfQ09ERVMuQkxPQ0spO1xufVxuLyoqXG4gKiBDb252ZXJ0cyBhIFNwZWNpZmljSG9va091dHB1dCB0byBIb29rT3V0cHV0IGZvciB3aXJlIGZvcm1hdC5cbiAqXG4gKiBTcGVjaWZpY0hvb2tPdXRwdXQgdHlwZXMgaGF2ZTogeyBfdHlwZSwgc3Rkb3V0LCBzdGRlcnI/IH1cbiAqIEhvb2tPdXRwdXQgaGFzOiB7IHN0ZG91dCwgc3RkZXJyPyB9XG4gKlxuICogU2luY2Ugb3V0cHV0IGJ1aWxkZXJzIG5vdyBwcm9kdWNlIHdpcmUtZm9ybWF0IGRpcmVjdGx5LCB0aGlzIGZ1bmN0aW9uXG4gKiBzaW1wbHkgc3RyaXBzIHRoZSBgX3R5cGVgIGRpc2NyaW1pbmF0b3IgZmllbGQuXG4gKiBAcGFyYW0gc3BlY2lmaWNPdXRwdXQgLSBUaGUgc3BlY2lmaWMgb3V0cHV0IGZyb20gYSBob29rIGhhbmRsZXJcbiAqIEByZXR1cm5zIEhvb2tPdXRwdXQgcmVhZHkgZm9yIHNlcmlhbGl6YXRpb25cbiAqIEBzZWUgaHR0cHM6Ly9jb2RlLmNsYXVkZS5jb20vZG9jcy9lbi9ob29rcyNob29rLW91dHB1dC1zdHJ1Y3R1cmVcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBjb25zdCBzcGVjaWZpY091dHB1dCA9IHByZVRvb2xVc2VPdXRwdXQoeyBob29rU3BlY2lmaWNPdXRwdXQ6IHsgcGVybWlzc2lvbkRlY2lzaW9uOiAnYWxsb3cnIH0gfSk7XG4gKiBjb25zdCBob29rT3V0cHV0ID0gY29udmVydFRvSG9va091dHB1dChzcGVjaWZpY091dHB1dCk7XG4gKiAvLyBob29rT3V0cHV0OiB7IHN0ZG91dDogeyBob29rU3BlY2lmaWNPdXRwdXQ6IHsgLi4uIH0gfSB9XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNvbnZlcnRUb0hvb2tPdXRwdXQoc3BlY2lmaWNPdXRwdXQpIHtcbiAgICBjb25zdCB7IHN0ZG91dCwgc3RkZXJyIH0gPSBzcGVjaWZpY091dHB1dDtcbiAgICByZXR1cm4gc3RkZXJyICE9PSB1bmRlZmluZWQgPyB7IHN0ZG91dCwgc3RkZXJyIH0gOiB7IHN0ZG91dCB9O1xufVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gRXhlY3V0ZSBGdW5jdGlvblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLyoqXG4gKiBFeGVjdXRlcyBhIGhvb2sgaGFuZGxlciB3aXRoIGZ1bGwgcnVudGltZSBvcmNoZXN0cmF0aW9uLlxuICpcbiAqIFRoaXMgaXMgdGhlIG1haW4gZW50cnkgcG9pbnQgdGhhdCBjb21waWxlZCBob29rcyB1c2UuIFdoZW4gYSBjb21waWxlZCBob29rXG4gKiBydW5zIGFzIGEgQ0xJOlxuICpcbiAqIDEuIFJlYWRzIGFsbCBzdGRpblxuICogMi4gUGFyc2VzIEpTT04gKHdpcmUgZm9ybWF0IHdpdGggc25ha2VfY2FzZSBwcm9wZXJ0aWVzKVxuICogMy4gU2V0cyB1cCBsb2dnZXIgY29udGV4dCAoaG9va1R5cGUsIGlucHV0KVxuICogNC4gQ2FsbHMgaGFuZGxlciB3aXRoIGlucHV0IGFuZCBjb250ZXh0IChsb2dnZXIpXG4gKiA1LiBIYW5kbGVzIGFueSBlcnJvcnMsIGxvZ3MgdGhlbVxuICogNi4gV3JpdGVzIEpTT04gdG8gc3Rkb3V0XG4gKiA3LiBDbG9zZXMgbG9nZ2VyXG4gKiA4LiBFeGl0cyB3aXRoIGFwcHJvcHJpYXRlIGNvZGVcbiAqIEBwYXJhbSBob29rRm4gLSBUaGUgaG9vayBmdW5jdGlvbiB0byBleGVjdXRlIChmcm9tIGhvb2sgZmFjdG9yeSlcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiAvLyBJbiBjb21waWxlZCBob29rIGZpbGVcbiAqIGltcG9ydCB7IGV4ZWN1dGUgfSBmcm9tICdAZ29vZGZvb3QvY2xhdWRlLWNvZGUtaG9va3MvcnVudGltZSc7XG4gKiBpbXBvcnQgeyBwcmVUb29sVXNlSG9vaywgcHJlVG9vbFVzZU91dHB1dCB9IGZyb20gJ0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcyc7XG4gKlxuICogY29uc3QgbXlIb29rID0gcHJlVG9vbFVzZUhvb2soeyBtYXRjaGVyOiAnQmFzaCcgfSwgYXN5bmMgKGlucHV0LCB7IGxvZ2dlciB9KSA9PiB7XG4gKiAgIGxvZ2dlci5pbmZvKCdQcm9jZXNzaW5nIEJhc2ggY29tbWFuZCcpO1xuICogICByZXR1cm4gcHJlVG9vbFVzZU91dHB1dCh7IGFsbG93OiB0cnVlIH0pO1xuICogfSk7XG4gKlxuICogZXhlY3V0ZShteUhvb2spO1xuICogYGBgXG4gKiBAc2VlIGh0dHBzOi8vY29kZS5jbGF1ZGUuY29tL2RvY3MvZW4vaG9va3NcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGV4ZWN1dGUoaG9va0ZuKSB7XG4gICAgbGV0IG91dHB1dDtcbiAgICB0cnkge1xuICAgICAgICAvLyBSZWFkIGFuZCBwYXJzZSBzdGRpblxuICAgICAgICBsZXQgc3RkaW5Db250ZW50O1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgc3RkaW5Db250ZW50ID0gYXdhaXQgcmVhZFN0ZGluKCk7XG4gICAgICAgIH1cbiAgICAgICAgY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICBsb2dnZXIubG9nRXJyb3IoZXJyb3IsIFwiRmFpbGVkIHRvIHJlYWQgc3RkaW5cIik7XG4gICAgICAgICAgICBvdXRwdXQgPSBjcmVhdGVNYWxmb3JtZWRJbnB1dE91dHB1dChlcnJvcik7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgLy8gUGFyc2UgYW5kIHRyYW5zZm9ybSBpbnB1dFxuICAgICAgICBsZXQgaW5wdXQ7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBpbnB1dCA9IHBhcnNlU3RkaW5JbnB1dChzdGRpbkNvbnRlbnQpO1xuICAgICAgICB9XG4gICAgICAgIGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgbG9nZ2VyLmxvZ0Vycm9yKGVycm9yLCBcIkZhaWxlZCB0byBwYXJzZSBzdGRpbiBKU09OXCIpO1xuICAgICAgICAgICAgb3V0cHV0ID0gY3JlYXRlTWFsZm9ybWVkSW5wdXRPdXRwdXQoZXJyb3IpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIC8vIFNldCBsb2dnZXIgY29udGV4dFxuICAgICAgICBjb25zdCBob29rRXZlbnROYW1lID0gaG9va0ZuLmhvb2tFdmVudE5hbWU7XG4gICAgICAgIGxvZ2dlci5zZXRDb250ZXh0KGhvb2tFdmVudE5hbWUsIGlucHV0KTtcbiAgICAgICAgLy8gQnVpbGQgY29udGV4dCAtIFNlc3Npb25TdGFydCBob29rcyBnZXQgZXh0ZW5kZWQgY29udGV4dCB3aXRoIHBlcnNpc3RFbnZWYXJcbiAgICAgICAgY29uc3QgY29udGV4dCA9IGhvb2tFdmVudE5hbWUgPT09IFwiU2Vzc2lvblN0YXJ0XCIgPyB7IGxvZ2dlciwgcGVyc2lzdEVudlZhciwgcGVyc2lzdEVudlZhcnMgfSA6IHsgbG9nZ2VyIH07XG4gICAgICAgIC8vIEV4ZWN1dGUgaGFuZGxlclxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3Qgc3BlY2lmaWNPdXRwdXQgPSBhd2FpdCBob29rRm4oaW5wdXQsIGNvbnRleHQpO1xuICAgICAgICAgICAgb3V0cHV0ID0gY29udmVydFRvSG9va091dHB1dChzcGVjaWZpY091dHB1dCk7XG4gICAgICAgIH1cbiAgICAgICAgY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICAvLyBIYW5kbGVyIHRocmV3IC0gb3V0cHV0IHN0YWNrdHJhY2UgdG8gc3RkZXJyIGFuZCBleGl0IHdpdGggY29kZSAyXG4gICAgICAgICAgICAvLyBUaGlzIGNhbGwgbmV2ZXIgcmV0dXJucyAocHJvY2Vzcy5leGl0KVxuICAgICAgICAgICAgaGFuZGxlSGFuZGxlckVycm9yKGVycm9yKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBmaW5hbGx5IHtcbiAgICAgICAgLy8gV3JpdGUgb3V0cHV0IGlmIHdlIGhhdmUgaXRcbiAgICAgICAgaWYgKG91dHB1dCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICB3cml0ZVN0ZG91dChvdXRwdXQuc3Rkb3V0KTtcbiAgICAgICAgfVxuICAgICAgICAvLyBDbGVhbiB1cCBsb2dnZXIgKHNpbmdsZSBjbGVhbnVwIHBhdGgpXG4gICAgICAgIGxvZ2dlci5jbGVhckNvbnRleHQoKTtcbiAgICAgICAgbG9nZ2VyLmNsb3NlKCk7XG4gICAgICAgIC8vIEV4aXQtY29kZSBCTE9DSzogdW5saWtlIGhhbmRsZXIgdGhyb3cgKG5vIHN0ZG91dCksIHRoaXMgcGF0aCBzdGlsbCB3cml0ZXNcbiAgICAgICAgLy8gc3RydWN0dXJlZCBKU09OIHRvIHN0ZG91dCAoYXMgZW1wdHkge30pIGFsb25nc2lkZSB0aGUgc3RkZXJyIG1lc3NhZ2UuXG4gICAgICAgIC8vIFRoZSBjYWxsZXIgY29udHJvbHMgc3RkZXJyIGZvcm1hdHRpbmcgKG5vIGFwcGVuZGVkIG5ld2xpbmUpLlxuICAgICAgICBpZiAob3V0cHV0Py5zdGRlcnIgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgcHJvY2Vzcy5zdGRlcnIud3JpdGUob3V0cHV0LnN0ZGVycik7XG4gICAgICAgICAgICBwcm9jZXNzLmV4aXQoRVhJVF9DT0RFUy5CTE9DSyk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gRXhpdCB3aXRoIHN1Y2Nlc3MgKGhhbmRsZXIgZXJyb3JzIGV4aXQgdmlhIGhhbmRsZUhhbmRsZXJFcnJvciB3aXRoIGNvZGUgMilcbiAgICAgICAgcHJvY2Vzcy5leGl0KEVYSVRfQ09ERVMuU1VDQ0VTUyk7XG4gICAgfVxufVxuIiwgIi8qKlxuICogU2hhcmVkIGNvbnRleHQtYnVpbGRpbmcgdXRpbGl0aWVzIGZvciBTZXNzaW9uU3RhcnQgYW5kIFN1YmFnZW50U3RhcnQgaG9va3MuXG4gKlxuICogQm90aCBob29rcyBuZWVkIGlkZW50aWNhbCBjYXJkIGNvbnRleHQgaW5qZWN0aW9uLiBUaGlzIG1vZHVsZSBleHRyYWN0cyB0aGVcbiAqIHNoYXJlZCBsb2dpYyBzbyBpdCBjYW4gYmUgcmV1c2VkIHdpdGhvdXQgZHVwbGljYXRpb24uXG4gKlxuICogQHN1bW1hcnkgU2hhcmVkIGNvbnRleHQtYnVpbGRpbmcgdXRpbGl0aWVzIGZvciBzZXNzaW9uIGFuZCBzdWJhZ2VudCBob29rc1xuICogQG1vZHVsZSBsaWIvY29udGV4dFxuICovXG5cbmltcG9ydCB7IGV4ZWNGaWxlU3luYyB9IGZyb20gJ25vZGU6Y2hpbGRfcHJvY2Vzcyc7XG5pbXBvcnQgeyByZWFkZGlyU3luYywgcmVhZEZpbGVTeW5jLCBzdGF0U3luYyB9IGZyb20gJ25vZGU6ZnMnO1xuaW1wb3J0IHsgam9pbiB9IGZyb20gJ25vZGU6cGF0aCc7XG5pbXBvcnQgdHlwZSB7IEFjdGlvbklucHV0IH0gZnJvbSAnQGNhcmRzL3Nkay9jb25maWcnO1xuaW1wb3J0IHsgQ0FSRFNfRU5WX1ZBUlMgfSBmcm9tICdAY2FyZHMvc2RrL2NvbmZpZyc7XG5pbXBvcnQgeyBXT1JLU1BBQ0VfQlJBTkNIRVNfRklMRSwgV09SS1NQQUNFX0NPTU1JVFNfRklMRSB9IGZyb20gJ0BjYXJkcy9zZGsvcHJvdG9jb2wnO1xuaW1wb3J0IHsgZm9ybWF0Q29tbWl0TG9nIH0gZnJvbSAnLi9maWxlLXRyZWUuanMnO1xuXG4vKipcbiAqIEVycm9yIHRocm93biB3aGVuIHRoZSBjYXJkIHJlcG9zaXRvcnkgY2Fubm90IGJlIHJlYWQuXG4gKlxuICogV3JhcHMgdGhlIHVuZGVybHlpbmcgZmlsZXN5c3RlbSBlcnJvciB3aXRoIHRoZSByZXBvc2l0b3J5IHBhdGggZm9yXG4gKiBzdHJ1Y3R1cmVkIGVycm9yIGhhbmRsaW5nIGluIHNlc3Npb24gYW5kIHN1YmFnZW50IGhvb2tzLlxuICovXG5leHBvcnQgY2xhc3MgQ2FyZFJlcG9BY2Nlc3NFcnJvciBleHRlbmRzIEVycm9yIHtcbiAgb3ZlcnJpZGUgcmVhZG9ubHkgbmFtZSA9ICdDYXJkUmVwb0FjY2Vzc0Vycm9yJztcblxuICBjb25zdHJ1Y3RvcihcbiAgICBwdWJsaWMgcmVhZG9ubHkgcmVwb1BhdGg6IHN0cmluZyxcbiAgICBjYXVzZTogdW5rbm93blxuICApIHtcbiAgICBjb25zdCByZWFzb24gPSBjYXVzZSBpbnN0YW5jZW9mIEVycm9yID8gY2F1c2UubWVzc2FnZSA6IFN0cmluZyhjYXVzZSk7XG4gICAgc3VwZXIoYENhbm5vdCByZWFkIGNhcmQgcmVwb3NpdG9yeSBhdCAke3JlcG9QYXRofTogJHtyZWFzb259YCk7XG4gICAgdGhpcy5jYXVzZSA9IGNhdXNlO1xuICB9XG5cbiAgLyoqXG4gICAqIEJ1aWxkcyBhIHVzZXItZmFjaW5nIHN5c3RlbSBtZXNzYWdlIGV4cGxhaW5pbmcgdGhlIGNhcmQgcmVwbyBhY2Nlc3MgZmFpbHVyZS5cbiAgICpcbiAgICogQHBhcmFtIGFjdG9yIC0gSHVtYW4tcmVhZGFibGUgbm91biBmb3IgdGhlIGZhaWxpbmcgZW50aXR5IChlLmcuIFwic2Vzc2lvblwiLCBcInN1YmFnZW50XCIpLlxuICAgKiBAcmV0dXJucyBPYmplY3Qgd2l0aCBgc3lzdGVtTWVzc2FnZWAgYW5kIGBzdG9wUmVhc29uYCBzdHJpbmdzLlxuICAgKi9cbiAgdG9Ib29rRmFpbHVyZShhY3Rvcjogc3RyaW5nKTogeyBzeXN0ZW1NZXNzYWdlOiBzdHJpbmc7IHN0b3BSZWFzb246IHN0cmluZyB9IHtcbiAgICByZXR1cm4ge1xuICAgICAgc3lzdGVtTWVzc2FnZTogW1xuICAgICAgICBgVGhlIGNhcmQgcmVwb3NpdG9yeSBhdCAnJHt0aGlzLnJlcG9QYXRofScgaXMgbm90IGFjY2Vzc2libGUuYCxcbiAgICAgICAgJycsXG4gICAgICAgIGBFcnJvcjogJHt0aGlzLm1lc3NhZ2V9YCxcbiAgICAgICAgJycsXG4gICAgICAgIGBUaGlzICR7YWN0b3J9IGNhbm5vdCBwcm9jZWVkIHdpdGhvdXQgYSB2YWxpZCBjYXJkIHJlcG9zaXRvcnkuIFRvIHJlc29sdmU6YCxcbiAgICAgICAgYDEuIFZlcmlmeSB0aGUgY2FyZCByZXBvc2l0b3J5IGRpcmVjdG9yeSBleGlzdHMgYXQ6ICR7dGhpcy5yZXBvUGF0aH1gLFxuICAgICAgICAnMi4gRW5zdXJlIHRoZSBjdXJyZW50IHByb2Nlc3MgaGFzIHJlYWQgcGVybWlzc2lvbnMgZm9yIHRoZSBkaXJlY3RvcnkgYW5kIGl0cyBjb250ZW50cycsXG4gICAgICAgICczLiBDaGVjayB0aGF0IHRoZSBDQVJEX1JFUE9fUEFUSCBlbnZpcm9ubWVudCB2YXJpYWJsZSBwb2ludHMgdG8gYSB2YWxpZCBjYXJkIHJlcG9zaXRvcnknXG4gICAgICBdLmpvaW4oJ1xcbicpLFxuICAgICAgc3RvcFJlYXNvbjogYENhcmQgcmVwb3NpdG9yeSBpbmFjY2Vzc2libGUgYXQgJHt0aGlzLnJlcG9QYXRofTogJHt0aGlzLm1lc3NhZ2V9YFxuICAgIH07XG4gIH1cbn1cblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gQ2FyZCBtZXRhZGF0YVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4vKipcbiAqIFN1YnNldCBvZiBDQVJELm1ldGEuanNvbiBmaWVsZHMgc3VyZmFjZWQgaW4gdGhlIGA8Y2FyZD5gIGNvbnRleHQgYmxvY2suXG4gKi9cbmludGVyZmFjZSBDYXJkTWV0YSB7XG4gIGlkOiBzdHJpbmc7XG4gIHRpdGxlOiBzdHJpbmc7XG4gIHN0YXR1czogc3RyaW5nO1xuICBnYXRlczoge1xuICAgIHBsYW5SZXF1aXJlZDogYm9vbGVhbjtcbiAgICBwbGFuQXBwcm92ZWQ6IGJvb2xlYW47XG4gICAgbWVyZ2VSZXF1ZXN0UmVxdWlyZWQ6IGJvb2xlYW47XG4gICAgbWVyZ2VBcHByb3ZlZDogYm9vbGVhbjtcbiAgfTtcbn1cblxuLyoqXG4gKiBSZWFkcyBhbmQgcGFyc2VzIENBUkQubWV0YS5qc29uIGZyb20gdGhlIGNhcmQgcmVwb3NpdG9yeS5cbiAqXG4gKiBSZXR1cm5zIGBudWxsYCB3aGVuIHRoZSBmaWxlIGlzIG1pc3Npbmcgb3IgbWFsZm9ybWVkIHNvIHRoZSBjYWxsZXJcbiAqIGNhbiBmYWxsIGJhY2sgdG8gdmFsdWVzIGZyb20ge0BsaW5rIEFjdGlvbklucHV0fS5cbiAqXG4gKiBAcGFyYW0gcm9vdFBhdGggLSBSb290IGRpcmVjdG9yeSBvZiB0aGUgY2FyZCByZXBvc2l0b3J5LlxuICogQHJldHVybnMgUGFyc2VkIG1ldGFkYXRhLCBvciBgbnVsbGAgd2hlbiB1bmF2YWlsYWJsZS5cbiAqL1xuZnVuY3Rpb24gcmVhZENhcmRNZXRhKHJvb3RQYXRoOiBzdHJpbmcpOiBDYXJkTWV0YSB8IG51bGwge1xuICB0cnkge1xuICAgIGNvbnN0IHJhdyA9IHJlYWRGaWxlU3luYyhqb2luKHJvb3RQYXRoLCAnQ0FSRC5tZXRhLmpzb24nKSwgJ3V0Zi04Jyk7XG4gICAgY29uc3QgcGFyc2VkID0gSlNPTi5wYXJzZShyYXcpIGFzIFJlY29yZDxzdHJpbmcsIHVua25vd24+O1xuICAgIGNvbnN0IGdhdGVzID0gcGFyc2VkWydnYXRlcyddIGFzIFJlY29yZDxzdHJpbmcsIGJvb2xlYW4+IHwgdW5kZWZpbmVkO1xuICAgIHJldHVybiB7XG4gICAgICBpZDogU3RyaW5nKHBhcnNlZFsnaWQnXSA/PyAnJyksXG4gICAgICB0aXRsZTogU3RyaW5nKHBhcnNlZFsndGl0bGUnXSA/PyAnJyksXG4gICAgICBzdGF0dXM6IFN0cmluZyhwYXJzZWRbJ3N0YXR1cyddID8/ICcnKSxcbiAgICAgIGdhdGVzOiB7XG4gICAgICAgIHBsYW5SZXF1aXJlZDogZ2F0ZXM/LlsncGxhblJlcXVpcmVkJ10gPT09IHRydWUsXG4gICAgICAgIHBsYW5BcHByb3ZlZDogZ2F0ZXM/LlsncGxhbkFwcHJvdmVkJ10gPT09IHRydWUsXG4gICAgICAgIG1lcmdlUmVxdWVzdFJlcXVpcmVkOiBnYXRlcz8uWydtZXJnZVJlcXVlc3RSZXF1aXJlZCddID09PSB0cnVlLFxuICAgICAgICBtZXJnZUFwcHJvdmVkOiBnYXRlcz8uWydtZXJnZUFwcHJvdmVkJ10gPT09IHRydWVcbiAgICAgIH1cbiAgICB9O1xuICB9IGNhdGNoIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxufVxuXG4vKipcbiAqIEJ1aWxkcyB0aGUgYDxjYXJkPmAgWE1MIGJsb2NrIHdpdGggY2FyZCBpZGVudGl0eSwgZ2F0ZXMsIGFuZCBlbnYgdmFycy5cbiAqXG4gKiBGYWxscyBiYWNrIHRvIHtAbGluayBBY3Rpb25JbnB1dH0gZmllbGRzIHdoZW4gQ0FSRC5tZXRhLmpzb24gaXMgdW5yZWFkYWJsZS5cbiAqXG4gKiBAcGFyYW0gYWN0aW9uSW5wdXQgLSBQYXJzZWQgYWN0aW9uIGlucHV0IGZyb20gdGhlIGVudmlyb25tZW50LlxuICogQHJldHVybnMgVGhlIGA8Y2FyZCAuLi4+Li4uPC9jYXJkPmAgYmxvY2sgc3RyaW5nLlxuICovXG5leHBvcnQgZnVuY3Rpb24gYnVpbGRDYXJkQmxvY2soYWN0aW9uSW5wdXQ6IEFjdGlvbklucHV0KTogc3RyaW5nIHtcbiAgY29uc3QgbWV0YSA9IHJlYWRDYXJkTWV0YShhY3Rpb25JbnB1dC5jYXJkUmVwb1BhdGgpO1xuXG4gIGNvbnN0IGlkID0gbWV0YT8uaWQgfHwgYWN0aW9uSW5wdXQuY2FyZElkO1xuICBjb25zdCB0aXRsZSA9IG1ldGE/LnRpdGxlIHx8ICcnO1xuICBjb25zdCBzdGF0dXMgPSBtZXRhPy5zdGF0dXMgfHwgJyc7XG5cbiAgY29uc3QgZ2F0ZXNMaW5lID0gbWV0YVxuICAgID8gYGdhdGVzOiBwbGFuUmVxdWlyZWQ9JHttZXRhLmdhdGVzLnBsYW5SZXF1aXJlZH0gcGxhbkFwcHJvdmVkPSR7bWV0YS5nYXRlcy5wbGFuQXBwcm92ZWR9IG1lcmdlUmVxdWVzdFJlcXVpcmVkPSR7bWV0YS5nYXRlcy5tZXJnZVJlcXVlc3RSZXF1aXJlZH0gbWVyZ2VBcHByb3ZlZD0ke21ldGEuZ2F0ZXMubWVyZ2VBcHByb3ZlZH1gXG4gICAgOiAnJztcblxuICBjb25zdCB3b3Jrc3BhY2VCcmFuY2ggPSBwcm9jZXNzLmVudltDQVJEU19FTlZfVkFSUy5XT1JLU1BBQ0VfQlJBTkNIXTtcbiAgY29uc3QgYmFzZUJyYW5jaCA9IHByb2Nlc3MuZW52W0NBUkRTX0VOVl9WQVJTLkJBU0VfQlJBTkNIXTtcblxuICBjb25zdCB3b3Jrc3BhY2VQYXRoID0gcHJvY2Vzcy5lbnZbQ0FSRFNfRU5WX1ZBUlMuV09SS1NQQUNFX1BBVEhdO1xuICBjb25zdCBlbnZMaW5lcyA9IFtgICBDQVJEX1JFUE9fUEFUSD0ke2FjdGlvbklucHV0LmNhcmRSZXBvUGF0aH1gXTtcbiAgaWYgKHdvcmtzcGFjZVBhdGgpIGVudkxpbmVzLnB1c2goYCAgV09SS1NQQUNFX1BBVEg9JHt3b3Jrc3BhY2VQYXRofWApO1xuICBpZiAoYmFzZUJyYW5jaCkgZW52TGluZXMucHVzaChgICBCQVNFX0JSQU5DSD0ke2Jhc2VCcmFuY2h9YCk7XG4gIGlmICh3b3Jrc3BhY2VCcmFuY2gpIGVudkxpbmVzLnB1c2goYCAgV09SS1NQQUNFX0JSQU5DSD0ke3dvcmtzcGFjZUJyYW5jaH1gKTtcblxuICBjb25zdCBib2R5TGluZXM6IHN0cmluZ1tdID0gW107XG4gIGlmICh0aXRsZSkgYm9keUxpbmVzLnB1c2goYHRpdGxlOiAke3RpdGxlfWApO1xuICBib2R5TGluZXMucHVzaCgnJyk7XG4gIGlmIChnYXRlc0xpbmUpIGJvZHlMaW5lcy5wdXNoKGdhdGVzTGluZSk7XG4gIGJvZHlMaW5lcy5wdXNoKCdlbnY6Jyk7XG4gIGJvZHlMaW5lcy5wdXNoKC4uLmVudkxpbmVzKTtcblxuICBjb25zdCBhdHRycyA9IFtgaWQ9XCIke2lkfVwiYCwgYHN0YXR1cz1cIiR7c3RhdHVzfVwiYCwgYG1vZGU9XCIke2FjdGlvbklucHV0LmV4ZWN1dGlvbk1vZGV9XCJgXTtcblxuICByZXR1cm4gYDxjYXJkICR7YXR0cnMuam9pbignICcpfT5cXG4ke2JvZHlMaW5lcy5qb2luKCdcXG4nKX1cXG48L2NhcmQ+YDtcbn1cblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gQ2FyZCByZXBvIGxpc3Rpbmdcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuLyoqXG4gKiBGb3JtYXRzIGFuIG10aW1lIGFzIGFuIElTTyA4NjAxIHN0cmluZyB0cnVuY2F0ZWQgdG8gbWludXRlcyBpbiBVVEMuXG4gKlxuICogQHBhcmFtIG10aW1lTXMgLSBNb2RpZmljYXRpb24gdGltZSBpbiBtaWxsaXNlY29uZHMgc2luY2UgZXBvY2guXG4gKiBAcmV0dXJucyBJU08gc3RyaW5nIGxpa2UgYDIwMjUtMDItMjRUMTQ6MjRaYC5cbiAqL1xuZnVuY3Rpb24gZm9ybWF0VGltZXN0YW1wKG10aW1lTXM6IG51bWJlcik6IHN0cmluZyB7XG4gIGNvbnN0IGQgPSBuZXcgRGF0ZShtdGltZU1zKTtcbiAgY29uc3QgaXNvID0gZC50b0lTT1N0cmluZygpOyAvLyAyMDI1LTAyLTI0VDE0OjI0OjIxLjAwMFpcbiAgLy8gVHJ1bmNhdGUgdG8gbWludXRlczogXCIyMDI1LTAyLTI0VDE0OjI0WlwiXG4gIHJldHVybiBgJHtpc28uc2xpY2UoMCwgMTYpfVpgO1xufVxuXG4vKipcbiAqIENvdW50cyBmaWxlcyAobm9uLWRpcmVjdG9yaWVzKSBpbiBhIGRpcmVjdG9yeSBhbmQgcmV0dXJucyB0aGUgbGF0ZXN0IG10aW1lLlxuICpcbiAqIEBwYXJhbSBkaXJQYXRoIC0gRGlyZWN0b3J5IHRvIHNjYW4uXG4gKiBAcmV0dXJucyBUdXBsZSBvZiBgW2ZpbGVDb3VudCwgbGF0ZXN0TXRpbWVNc11gLCBvciBgWzAsIDBdYCBvbiBlcnJvci5cbiAqL1xuZnVuY3Rpb24gZGlyU3RhdHMoZGlyUGF0aDogc3RyaW5nKTogW2NvdW50OiBudW1iZXIsIGxhdGVzdE10aW1lTXM6IG51bWJlcl0ge1xuICB0cnkge1xuICAgIGNvbnN0IGVudHJpZXMgPSByZWFkZGlyU3luYyhkaXJQYXRoLCB7IHdpdGhGaWxlVHlwZXM6IHRydWUgfSk7XG4gICAgbGV0IGNvdW50ID0gMDtcbiAgICBsZXQgbGF0ZXN0ID0gMDtcbiAgICBmb3IgKGNvbnN0IGVudHJ5IG9mIGVudHJpZXMpIHtcbiAgICAgIGlmIChlbnRyeS5pc0ZpbGUoKSkge1xuICAgICAgICBjb3VudCsrO1xuICAgICAgICB0cnkge1xuICAgICAgICAgIGNvbnN0IG10ID0gc3RhdFN5bmMoam9pbihkaXJQYXRoLCBlbnRyeS5uYW1lKSkubXRpbWVNcztcbiAgICAgICAgICBpZiAobXQgPiBsYXRlc3QpIGxhdGVzdCA9IG10O1xuICAgICAgICB9IGNhdGNoIHtcbiAgICAgICAgICAvLyBpbmRpdmlkdWFsIHN0YXQgZmFpbHVyZSBpcyBub24tZmF0YWxcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gW2NvdW50LCBsYXRlc3RdO1xuICB9IGNhdGNoIHtcbiAgICByZXR1cm4gWzAsIDBdO1xuICB9XG59XG5cbi8qKlxuICogQnVpbGRzIHRoZSBgPGNhcmQtcmVwbz5gIGJsb2NrOiByb290LWxldmVsIGZpbGVzIHdpdGggdGltZXN0YW1wcyxcbiAqIGRpcmVjdG9yaWVzIHdpdGggY2hpbGQgY291bnRzLCBhbmQgc3RyZWFtcyBzdWJkaXJlY3Rvcmllcy5cbiAqXG4gKiBAcGFyYW0gcm9vdFBhdGggLSBSb290IGRpcmVjdG9yeSBvZiB0aGUgY2FyZCByZXBvc2l0b3J5LlxuICogQHJldHVybnMgVGhlIGA8Y2FyZC1yZXBvPi4uLjwvY2FyZC1yZXBvPmAgYmxvY2sgc3RyaW5nLlxuICogQHRocm93cyB7Q2FyZFJlcG9BY2Nlc3NFcnJvcn0gV2hlbiB0aGUgcm9vdCBkaXJlY3RvcnkgY2Fubm90IGJlIHJlYWQuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBidWlsZENhcmRSZXBvQmxvY2socm9vdFBhdGg6IHN0cmluZyk6IHN0cmluZyB7XG4gIGxldCBlbnRyaWVzOiB7IG5hbWU6IHN0cmluZzsgaXNEaXI6IGJvb2xlYW4gfVtdO1xuICB0cnkge1xuICAgIGVudHJpZXMgPSByZWFkZGlyU3luYyhyb290UGF0aCwgeyB3aXRoRmlsZVR5cGVzOiB0cnVlIH0pLm1hcCgoZCkgPT4gKHtcbiAgICAgIG5hbWU6IGQubmFtZS50b1N0cmluZygpLFxuICAgICAgaXNEaXI6IGQuaXNEaXJlY3RvcnkoKVxuICAgIH0pKTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICB0aHJvdyBuZXcgQ2FyZFJlcG9BY2Nlc3NFcnJvcihyb290UGF0aCwgZXJyb3IpO1xuICB9XG5cbiAgY29uc3QgbGluZXM6IHN0cmluZ1tdID0gW107XG5cbiAgZm9yIChjb25zdCBlbnRyeSBvZiBlbnRyaWVzKSB7XG4gICAgaWYgKGVudHJ5Lm5hbWUgPT09ICcuZ2l0JykgY29udGludWU7XG4gICAgY29uc3QgZnVsbFBhdGggPSBqb2luKHJvb3RQYXRoLCBlbnRyeS5uYW1lKTtcblxuICAgIGlmIChlbnRyeS5pc0Rpcikge1xuICAgICAgaWYgKGVudHJ5Lm5hbWUgPT09ICdzdHJlYW1zJykge1xuICAgICAgICAvLyBTdHJlYW1zOiBzaG93IGVhY2ggc3ViZGlyZWN0b3J5IHdpdGggY2hpbGQgY291bnQgKyBsYXRlc3QgdGltZXN0YW1wXG4gICAgICAgIGxpbmVzLnB1c2goJ3N0cmVhbXMvJyk7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgY29uc3Qgc3RyZWFtRW50cmllcyA9IHJlYWRkaXJTeW5jKGZ1bGxQYXRoLCB7IHdpdGhGaWxlVHlwZXM6IHRydWUgfSk7XG4gICAgICAgICAgZm9yIChjb25zdCBzdWIgb2Ygc3RyZWFtRW50cmllcykge1xuICAgICAgICAgICAgaWYgKHN1Yi5pc0RpcmVjdG9yeSgpKSB7XG4gICAgICAgICAgICAgIGNvbnN0IHN1Yk5hbWUgPSBzdWIubmFtZS50b1N0cmluZygpO1xuICAgICAgICAgICAgICBjb25zdCBbY291bnQsIGxhdGVzdF0gPSBkaXJTdGF0cyhqb2luKGZ1bGxQYXRoLCBzdWJOYW1lKSk7XG4gICAgICAgICAgICAgIGNvbnN0IHRzID0gbGF0ZXN0ID4gMCA/IGAgICBsYXRlc3QgJHtmb3JtYXRUaW1lc3RhbXAobGF0ZXN0KX1gIDogJyc7XG4gICAgICAgICAgICAgIGxpbmVzLnB1c2goYCR7YCAgJHtzdWJOYW1lfS9gLnBhZEVuZCgyNCl9JHtjb3VudH0gZmlsZXMke3RzfWApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSBjYXRjaCB7XG4gICAgICAgICAgLy8gc3RyZWFtcyBkaXIgdW5yZWFkYWJsZSBcdTIwMTQgYWxyZWFkeSBsaXN0ZWQgdGhlIGRpcmVjdG9yeSBuYW1lXG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIE5vbi1zdHJlYW1zIGRpcmVjdG9yeTogc2hvdyBjaGlsZCBjb3VudCArIGxhdGVzdCB0aW1lc3RhbXBcbiAgICAgICAgY29uc3QgW2NvdW50LCBsYXRlc3RdID0gZGlyU3RhdHMoZnVsbFBhdGgpO1xuICAgICAgICBjb25zdCB0cyA9IGxhdGVzdCA+IDAgPyBgICAgbGF0ZXN0ICR7Zm9ybWF0VGltZXN0YW1wKGxhdGVzdCl9YCA6ICcnO1xuICAgICAgICBsaW5lcy5wdXNoKGAke2Ake2VudHJ5Lm5hbWV9L2AucGFkRW5kKDI0KX0ke2NvdW50fSBmaWxlcyR7dHN9YCk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIFJvb3QtbGV2ZWwgZmlsZTogc2hvdyBuYW1lICsgdGltZXN0YW1wXG4gICAgICB0cnkge1xuICAgICAgICBjb25zdCBtdCA9IHN0YXRTeW5jKGZ1bGxQYXRoKS5tdGltZU1zO1xuICAgICAgICBsaW5lcy5wdXNoKGAke2VudHJ5Lm5hbWV9YC5wYWRFbmQoMjQpICsgZm9ybWF0VGltZXN0YW1wKG10KSk7XG4gICAgICB9IGNhdGNoIHtcbiAgICAgICAgbGluZXMucHVzaChlbnRyeS5uYW1lKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gYDxjYXJkLXJlcG8+XFxuJHtsaW5lcy5qb2luKCdcXG4nKX1cXG48L2NhcmQtcmVwbz5gO1xufVxuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBDYXJkIHJlcG8gZ2l0IGxvZ1xuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4vKiogTWF4aW11bSBudW1iZXIgb2YgcXVhbGlmeWluZyBjb21taXRzIHNob3duIGluIHRoZSBjYXJkIHJlcG8gbG9nLiAqL1xuY29uc3QgTUFYX0NBUkRfUkVQT19MT0dfQ09NTUlUUyA9IDU7XG5cbi8qKlxuICogQnVpbGRzIHRoZSBgPGNhcmQtcmVwby1sb2c+YCBibG9jayB3aXRoIHJlY2VudCBjb21taXRzIGFuZCBwYXRjaCBkaWZmcy5cbiAqXG4gKiBGaWx0ZXJzIG91dCBjb21taXRzIHRoYXQgZXhjbHVzaXZlbHkgdG91Y2ggYHN0cmVhbXMvYCBmaWxlcyAoaGlnaC1mcmVxdWVuY3lcbiAqIHRyYW5zY3JpcHQgd3JpdGVzKS4gU2hvd3MgcGF0Y2ggb3V0cHV0IGluc3RlYWQgb2YgZGlmZnN0YXQgZm9yIHJlbWFpbmluZ1xuICogY29udGVudC5cbiAqXG4gKiBSZXR1cm5zIGBudWxsYCB3aGVuIHRoZSByZXBvc2l0b3J5IGhhcyBubyBxdWFsaWZ5aW5nIGNvbW1pdHMgb3IgZ2l0IGlzXG4gKiB1bmF2YWlsYWJsZSwgc28gdGhlIGJsb2NrIGNhbiBiZSBvbWl0dGVkIGZyb20gdGhlIG91dHB1dC5cbiAqXG4gKiBAcGFyYW0gcm9vdFBhdGggLSBSb290IGRpcmVjdG9yeSBvZiB0aGUgY2FyZCByZXBvc2l0b3J5LlxuICogQHJldHVybnMgVGhlIGA8Y2FyZC1yZXBvLWxvZyAuLi4+Li4uPC9jYXJkLXJlcG8tbG9nPmAgYmxvY2sgc3RyaW5nLCBvciBgbnVsbGAuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBidWlsZENhcmRSZXBvTG9nQmxvY2socm9vdFBhdGg6IHN0cmluZyk6IHN0cmluZyB8IG51bGwge1xuICB0cnkge1xuICAgIGNvbnN0IGxvZyA9IGV4ZWNGaWxlU3luYyhcbiAgICAgICdnaXQnLFxuICAgICAgW1xuICAgICAgICAnbG9nJyxcbiAgICAgICAgYC0ke01BWF9DQVJEX1JFUE9fTE9HX0NPTU1JVFN9YCxcbiAgICAgICAgJy0tcHJldHR5PWZvcm1hdDoleDAwJWggLSAlYW46ICVzJyxcbiAgICAgICAgJy0tbmFtZS1vbmx5JyxcbiAgICAgICAgJy0tJyxcbiAgICAgICAgJy4nLFxuICAgICAgICAnOiFzdHJlYW1zLycsXG4gICAgICAgICc6IS5naXRpZ25vcmUnLFxuICAgICAgICBgOiEke1dPUktTUEFDRV9CUkFOQ0hFU19GSUxFfWAsXG4gICAgICAgIGA6ISR7V09SS1NQQUNFX0NPTU1JVFNfRklMRX1gXG4gICAgICBdLFxuICAgICAge1xuICAgICAgICBjd2Q6IHJvb3RQYXRoLFxuICAgICAgICBlbmNvZGluZzogJ3V0Zi04JyxcbiAgICAgICAgdGltZW91dDogNTAwMCxcbiAgICAgICAgc3RkaW86IFsncGlwZScsICdwaXBlJywgJ3BpcGUnXVxuICAgICAgfVxuICAgICkudHJpbSgpO1xuXG4gICAgaWYgKCFsb2cpIHJldHVybiBudWxsO1xuXG4gICAgY29uc3QgZm9ybWF0dGVkID0gZm9ybWF0Q29tbWl0TG9nKGxvZywgJ251bCcpO1xuICAgIGlmICghZm9ybWF0dGVkKSByZXR1cm4gbnVsbDtcblxuICAgIGxldCB0b3RhbENvdW50OiBudW1iZXIgfCBudWxsID0gbnVsbDtcbiAgICB0cnkge1xuICAgICAgY29uc3QgY291bnRTdHIgPSBleGVjRmlsZVN5bmMoJ2dpdCcsIFsncmV2LWxpc3QnLCAnLS1jb3VudCcsICdIRUFEJ10sIHtcbiAgICAgICAgY3dkOiByb290UGF0aCxcbiAgICAgICAgZW5jb2Rpbmc6ICd1dGYtOCcsXG4gICAgICAgIHRpbWVvdXQ6IDUwMDAsXG4gICAgICAgIHN0ZGlvOiBbJ3BpcGUnLCAncGlwZScsICdwaXBlJ11cbiAgICAgIH0pLnRyaW0oKTtcbiAgICAgIHRvdGFsQ291bnQgPSBwYXJzZUludChjb3VudFN0ciwgMTApO1xuICAgICAgaWYgKE51bWJlci5pc05hTih0b3RhbENvdW50KSkgdG90YWxDb3VudCA9IG51bGw7XG4gICAgfSBjYXRjaCB7XG4gICAgICAvLyBjb3VudCBpcyBvcHRpb25hbFxuICAgIH1cblxuICAgIGNvbnN0IGNvdW50QXR0ciA9IHRvdGFsQ291bnQgIT09IG51bGwgPyBgIGNvdW50PVwiJHt0b3RhbENvdW50fVwiYCA6ICcnO1xuICAgIHJldHVybiBgPGNhcmQtcmVwby1sb2cke2NvdW50QXR0cn0+XFxuJHtmb3JtYXR0ZWR9XFxuPC9jYXJkLXJlcG8tbG9nPmA7XG4gIH0gY2F0Y2gge1xuICAgIHJldHVybiBudWxsO1xuICB9XG59XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIFdvcmtzcGFjZSByZXBvIGxvZ1xuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4vKiogTWF4aW11bSBudW1iZXIgb2YgY29tbWl0cyBzaG93biB3aXRoIGZ1bGwgZGV0YWlsIHBlciBicmFuY2ggYmxvY2suICovXG5jb25zdCBNQVhfV09SS1NQQUNFX0NPTU1JVFNfUEVSX0JSQU5DSCA9IDU7XG5cbi8qKlxuICogV29ya3NwYWNlIHRyYWNraW5nIGRhdGEgcmVhZCBmcm9tIHNlcGFyYXRlIHdvcmtzcGFjZSBmaWxlcy5cbiAqL1xuaW50ZXJmYWNlIFdvcmtzcGFjZURhdGEge1xuICBicmFuY2hlczogUmVjb3JkPHN0cmluZywgeyBwYXJlbnRCcmFuY2g/OiBzdHJpbmc7IGFkZGVkQXQ6IHN0cmluZyB9PjtcbiAgY29tbWl0czogc3RyaW5nW107XG59XG5cbi8qKlxuICogUmVhZHMgd29ya3NwYWNlIGRhdGEgZnJvbSBzZXBhcmF0ZSBmaWxlcyBpbiB0aGUgY2FyZCByZXBvc2l0b3J5LlxuICpcbiAqIFJlYWRzIGJyYW5jaGVzIGZyb20gYHdvcmtzcGFjZS1icmFuY2hlcy5qc29uYCBhbmQgY29tbWl0cyBmcm9tXG4gKiBgd29ya3NwYWNlLWNvbW1pdHMuY3N2YC4gRWFjaCBmaWxlIGlzIHJlYWQgaW5kZXBlbmRlbnRseSBcdTIwMTQgRU5PRU5UIGlzXG4gKiB0cmVhdGVkIGFzIGFuIGVtcHR5IHJlc3VsdCwgb3RoZXIgZXJyb3JzIGNhdXNlIGBudWxsYCB0byBiZSByZXR1cm5lZC5cbiAqXG4gKiBSZXR1cm5zIGRhdGEgd2hlbmV2ZXIgZWl0aGVyIGZpbGUgaGFzIGNvbnRlbnQuIFJldHVybnMgYG51bGxgIG9ubHkgd2hlblxuICogYm90aCBmaWxlcyBhcmUgYWJzZW50IG9yIGVtcHR5LCBvciB3aGVuIGEgbm9uLUVOT0VOVCBlcnJvciBvY2N1cnMuXG4gKlxuICogQHBhcmFtIGNhcmRSZXBvUGF0aCAtIFJvb3QgZGlyZWN0b3J5IG9mIHRoZSBjYXJkIHJlcG9zaXRvcnkuXG4gKiBAcmV0dXJucyBQYXJzZWQgd29ya3NwYWNlIGRhdGEsIG9yIGBudWxsYCB3aGVuIHVuYXZhaWxhYmxlLlxuICovXG5mdW5jdGlvbiByZWFkV29ya3NwYWNlRGF0YShjYXJkUmVwb1BhdGg6IHN0cmluZyk6IFdvcmtzcGFjZURhdGEgfCBudWxsIHtcbiAgY29uc3QgYnJhbmNoZXM6IFdvcmtzcGFjZURhdGFbJ2JyYW5jaGVzJ10gPSB7fTtcbiAgbGV0IGNvbW1pdHM6IHN0cmluZ1tdID0gW107XG5cbiAgLy8gUmVhZCBicmFuY2hlcyBmcm9tIHdvcmtzcGFjZS1icmFuY2hlcy5qc29uXG4gIHRyeSB7XG4gICAgY29uc3QgcmF3ID0gcmVhZEZpbGVTeW5jKGpvaW4oY2FyZFJlcG9QYXRoLCBXT1JLU1BBQ0VfQlJBTkNIRVNfRklMRSksICd1dGYtOCcpO1xuICAgIGNvbnN0IHBhcnNlZCA9IEpTT04ucGFyc2UocmF3KSBhcyBSZWNvcmQ8c3RyaW5nLCB7IHBhcmVudEJyYW5jaD86IHN0cmluZzsgYWRkZWRBdD86IHN0cmluZyB9PjtcbiAgICBmb3IgKGNvbnN0IFtuYW1lLCBtZXRhXSBvZiBPYmplY3QuZW50cmllcyhwYXJzZWQpKSB7XG4gICAgICBpZiAobWV0YSAmJiB0eXBlb2YgbWV0YSA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgYnJhbmNoZXNbbmFtZV0gPSB7XG4gICAgICAgICAgcGFyZW50QnJhbmNoOiB0eXBlb2YgbWV0YS5wYXJlbnRCcmFuY2ggPT09ICdzdHJpbmcnID8gbWV0YS5wYXJlbnRCcmFuY2ggOiB1bmRlZmluZWQsXG4gICAgICAgICAgYWRkZWRBdDogdHlwZW9mIG1ldGEuYWRkZWRBdCA9PT0gJ3N0cmluZycgPyBtZXRhLmFkZGVkQXQgOiAnJ1xuICAgICAgICB9O1xuICAgICAgfVxuICAgIH1cbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBpZiAoKGVycm9yIGFzIE5vZGVKUy5FcnJub0V4Y2VwdGlvbikuY29kZSAhPT0gJ0VOT0VOVCcpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgfVxuXG4gIC8vIFJlYWQgY29tbWl0cyBmcm9tIHdvcmtzcGFjZS1jb21taXRzLmNzdlxuICB0cnkge1xuICAgIGNvbnN0IHJhdyA9IHJlYWRGaWxlU3luYyhqb2luKGNhcmRSZXBvUGF0aCwgV09SS1NQQUNFX0NPTU1JVFNfRklMRSksICd1dGYtOCcpO1xuICAgIGNvbW1pdHMgPSByYXdcbiAgICAgIC5zcGxpdCgnXFxuJylcbiAgICAgIC5tYXAoKGwpID0+IGwudHJpbSgpKVxuICAgICAgLmZpbHRlcigocyk6IHMgaXMgc3RyaW5nID0+IHMubGVuZ3RoID4gMCk7XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgaWYgKChlcnJvciBhcyBOb2RlSlMuRXJybm9FeGNlcHRpb24pLmNvZGUgIT09ICdFTk9FTlQnKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gIH1cblxuICAvLyBSZXR1cm4gZGF0YSB3aGVuIGVpdGhlciBmaWxlIGhhcyBjb250ZW50XG4gIGlmIChPYmplY3Qua2V5cyhicmFuY2hlcykubGVuZ3RoID09PSAwICYmIGNvbW1pdHMubGVuZ3RoID09PSAwKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICByZXR1cm4geyBicmFuY2hlcywgY29tbWl0cyB9O1xufVxuXG4vKipcbiAqIFJldHVybnMgdGhlIHNldCBvZiBjb21taXQgU0hBcyByZWFjaGFibGUgZnJvbSBhIGdpdCByZWYuXG4gKlxuICogQHBhcmFtIHdvcmtzcGFjZVBhdGggLSBSb290IGRpcmVjdG9yeSBvZiB0aGUgd29ya3NwYWNlIHJlcG9zaXRvcnkuXG4gKiBAcGFyYW0gcmVmIC0gR2l0IHJlZiBuYW1lIChicmFuY2gsIHRhZywgb3IgU0hBKS5cbiAqIEByZXR1cm5zIFNldCBvZiBmdWxsIDQwLWNoYXIgU0hBcywgb3IgZW1wdHkgc2V0IG9uIGZhaWx1cmUuXG4gKi9cbmZ1bmN0aW9uIGdldFJlYWNoYWJsZVNoYXMod29ya3NwYWNlUGF0aDogc3RyaW5nLCByZWY6IHN0cmluZyk6IFNldDxzdHJpbmc+IHtcbiAgdHJ5IHtcbiAgICBjb25zdCBvdXRwdXQgPSBleGVjRmlsZVN5bmMoJ2dpdCcsIFsnbG9nJywgJy0tZm9ybWF0PSVIJywgcmVmXSwge1xuICAgICAgY3dkOiB3b3Jrc3BhY2VQYXRoLFxuICAgICAgZW5jb2Rpbmc6ICd1dGYtOCcsXG4gICAgICB0aW1lb3V0OiAxMDAwMCxcbiAgICAgIHN0ZGlvOiBbJ3BpcGUnLCAncGlwZScsICdwaXBlJ11cbiAgICB9KS50cmltKCk7XG4gICAgcmV0dXJuIG5ldyBTZXQob3V0cHV0ID8gb3V0cHV0LnNwbGl0KCdcXG4nKSA6IFtdKTtcbiAgfSBjYXRjaCB7XG4gICAgcmV0dXJuIG5ldyBTZXQoKTtcbiAgfVxufVxuXG4vKipcbiAqIEZpbHRlcnMgU0hBcyB0byB0aG9zZSB0aGF0IGV4aXN0IGFzIG9iamVjdHMgaW4gdGhlIHdvcmtzcGFjZSByZXBvLlxuICpcbiAqIFVzZXMgYGdpdCBjYXQtZmlsZSAtLWJhdGNoLWNoZWNrYCBmb3IgYSBzaW5nbGUtY2FsbCBiYXRjaCBleGlzdGVuY2UgdGVzdC5cbiAqXG4gKiBAcGFyYW0gd29ya3NwYWNlUGF0aCAtIFJvb3QgZGlyZWN0b3J5IG9mIHRoZSB3b3Jrc3BhY2UgcmVwb3NpdG9yeS5cbiAqIEBwYXJhbSBzaGFzIC0gRnVsbCA0MC1jaGFyIFNIQXMgdG8gY2hlY2suXG4gKiBAcmV0dXJucyBTSEFzIHRoYXQgZXhpc3QgaW4gdGhlIHJlcG9zaXRvcnkuXG4gKi9cbmZ1bmN0aW9uIGZpbHRlclJlc29sdmFibGVTaGFzKHdvcmtzcGFjZVBhdGg6IHN0cmluZywgc2hhczogc3RyaW5nW10pOiBzdHJpbmdbXSB7XG4gIGlmIChzaGFzLmxlbmd0aCA9PT0gMCkgcmV0dXJuIFtdO1xuICB0cnkge1xuICAgIGNvbnN0IG91dHB1dCA9IGV4ZWNGaWxlU3luYygnZ2l0JywgWydjYXQtZmlsZScsICctLWJhdGNoLWNoZWNrJ10sIHtcbiAgICAgIGlucHV0OiBgJHtzaGFzLmpvaW4oJ1xcbicpfVxcbmAsXG4gICAgICBjd2Q6IHdvcmtzcGFjZVBhdGgsXG4gICAgICBlbmNvZGluZzogJ3V0Zi04JyxcbiAgICAgIHRpbWVvdXQ6IDUwMDAsXG4gICAgICBzdGRpbzogWydwaXBlJywgJ3BpcGUnLCAncGlwZSddXG4gICAgfSkudHJpbSgpO1xuXG4gICAgY29uc3QgbGluZXMgPSBvdXRwdXQuc3BsaXQoJ1xcbicpO1xuICAgIGNvbnN0IHJlc29sdmFibGU6IHN0cmluZ1tdID0gW107XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBsaW5lcy5sZW5ndGggJiYgaSA8IHNoYXMubGVuZ3RoOyBpKyspIHtcbiAgICAgIGlmICghbGluZXNbaV0hLmluY2x1ZGVzKCdtaXNzaW5nJykpIHtcbiAgICAgICAgcmVzb2x2YWJsZS5wdXNoKHNoYXNbaV0hKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHJlc29sdmFibGU7XG4gIH0gY2F0Y2gge1xuICAgIHJldHVybiBbXTtcbiAgfVxufVxuXG4vKipcbiAqIFJlc29sdmVzIGNvbW1pdCBkZXRhaWxzIGZvciBzcGVjaWZpYyBTSEFzIHVzaW5nIGBnaXQgbG9nIC0tbm8td2Fsa2AuXG4gKlxuICogQHBhcmFtIHdvcmtzcGFjZVBhdGggLSBSb290IGRpcmVjdG9yeSBvZiB0aGUgd29ya3NwYWNlIHJlcG9zaXRvcnkuXG4gKiBAcGFyYW0gc2hhcyAtIEZ1bGwgNDAtY2hhciBTSEFzIHRvIHJlc29sdmUuXG4gKiBAcmV0dXJucyBGb3JtYXR0ZWQgY29tbWl0IGxvZyB3aXRoIHRyZWUtcmVuZGVyZWQgZmlsZSBsaXN0cywgb3IgYG51bGxgIG9uIGZhaWx1cmUuXG4gKi9cbmZ1bmN0aW9uIHJlc29sdmVXb3Jrc3BhY2VDb21taXREZXRhaWxzKHdvcmtzcGFjZVBhdGg6IHN0cmluZywgc2hhczogc3RyaW5nW10pOiBzdHJpbmcgfCBudWxsIHtcbiAgaWYgKHNoYXMubGVuZ3RoID09PSAwKSByZXR1cm4gbnVsbDtcbiAgdHJ5IHtcbiAgICBjb25zdCBvdXRwdXQgPSBleGVjRmlsZVN5bmMoJ2dpdCcsIFsnbG9nJywgJy0tbm8td2FsaycsICctLXByZXR0eT1mb3JtYXQ6JWggLSAlcycsICctLW5hbWUtb25seScsIC4uLnNoYXNdLCB7XG4gICAgICBjd2Q6IHdvcmtzcGFjZVBhdGgsXG4gICAgICBlbmNvZGluZzogJ3V0Zi04JyxcbiAgICAgIHRpbWVvdXQ6IDUwMDAsXG4gICAgICBzdGRpbzogWydwaXBlJywgJ3BpcGUnLCAncGlwZSddXG4gICAgfSkudHJpbSgpO1xuXG4gICAgaWYgKCFvdXRwdXQpIHJldHVybiBudWxsO1xuICAgIHJldHVybiBmb3JtYXRDb21taXRMb2cob3V0cHV0LCAnYmxhbmstbGluZScpIHx8IG51bGw7XG4gIH0gY2F0Y2gge1xuICAgIHJldHVybiBudWxsO1xuICB9XG59XG5cbi8qKlxuICogQ29tbWl0IGdyb3VwIGZvciBhIHNpbmdsZSBicmFuY2ggb3IgdGhlIG9ycGhhbmVkIGJ1Y2tldC5cbiAqL1xuaW50ZXJmYWNlIENvbW1pdEdyb3VwIHtcbiAgYnJhbmNoTmFtZTogc3RyaW5nO1xuICBwYXJlbnRCcmFuY2g/OiBzdHJpbmc7XG4gIHNoYXM6IHN0cmluZ1tdO1xuICBvcnBoYW5lZD86IGJvb2xlYW47XG59XG5cbi8qKlxuICogQnVpbGRzIGA8d29ya3NwYWNlLXJlcG8tbG9nPmAgYmxvY2tzIHNob3dpbmcgd29ya3NwYWNlIGNvbW1pdHMgZ3JvdXBlZCBieSBicmFuY2guXG4gKlxuICogUmVhZHMgYnJhbmNoZXMgZnJvbSBgd29ya3NwYWNlLWJyYW5jaGVzLmpzb25gIGFuZCBjb21taXRzIGZyb21cbiAqIGB3b3Jrc3BhY2UtY29tbWl0cy5jc3ZgLCBwYXJ0aXRpb25zIGNvbW1pdHMgYWNyb3NzIGJyYW5jaGVzIHVzaW5nIGdpdFxuICogcmVhY2hhYmlsaXR5LCBhbmQgcmVuZGVycyBwZXItYnJhbmNoIFhNTCBibG9ja3MuIEFscmVhZHktcHJpbnRlZCBjb21taXRzXG4gKiBhcHBlYXIgYXMgYmFyZSBzaG9ydCBoYXNoZXMgaW4gc3Vic2VxdWVudCBibG9ja3MgKGRlZHVwKS5cbiAqXG4gKiBCcmFuY2ggcHJvY2Vzc2luZyBvcmRlcjogc29ydGVkIGJ5IGBhZGRlZEF0YCAob2xkZXN0IGZpcnN0KSBzbyB0aGVcbiAqIGZvdW5kYXRpb25hbCBicmFuY2ggcmVjZWl2ZXMgZnVsbCBjb21taXQgb3V0cHV0IGFuZCBsYXRlciBicmFuY2hlcyBkZWR1cFxuICogYWdhaW5zdCBpdC5cbiAqXG4gKiBAcGFyYW0gd29ya3NwYWNlUGF0aCAtIFJvb3QgZGlyZWN0b3J5IG9mIHRoZSB3b3Jrc3BhY2UgcmVwb3NpdG9yeS5cbiAqIEBwYXJhbSBjYXJkUmVwb1BhdGggLSBSb290IGRpcmVjdG9yeSBvZiB0aGUgY2FyZCByZXBvc2l0b3J5LlxuICogQHJldHVybnMgQXJyYXkgb2YgYDx3b3Jrc3BhY2UtcmVwby1sb2c+YCBibG9jayBzdHJpbmdzLCBvciBlbXB0eSBhcnJheS5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGJ1aWxkV29ya3NwYWNlUmVwb0xvZ0Jsb2Nrcyh3b3Jrc3BhY2VQYXRoOiBzdHJpbmcsIGNhcmRSZXBvUGF0aDogc3RyaW5nKTogc3RyaW5nW10ge1xuICBjb25zdCB3b3Jrc3BhY2UgPSByZWFkV29ya3NwYWNlRGF0YShjYXJkUmVwb1BhdGgpO1xuICBpZiAoIXdvcmtzcGFjZSkgcmV0dXJuIFtdO1xuXG4gIGNvbnN0IGJhc2VCcmFuY2ggPSBwcm9jZXNzLmVudltDQVJEU19FTlZfVkFSUy5CQVNFX0JSQU5DSF0gPz8gJ21haW4nO1xuXG4gIC8vIFNvcnQgYnJhbmNoZXMgYnkgYWRkZWRBdCAob2xkZXN0IGZpcnN0KVxuICBjb25zdCBzb3J0ZWRCcmFuY2hlcyA9IE9iamVjdC5lbnRyaWVzKHdvcmtzcGFjZS5icmFuY2hlcykuc29ydCgoWywgYV0sIFssIGJdKSA9PiBhLmFkZGVkQXQubG9jYWxlQ29tcGFyZShiLmFkZGVkQXQpKTtcblxuICAvLyBQYXJ0aXRpb246IGVhY2ggYnJhbmNoIGluY2x1ZGVzIEFMTCByZWFjaGFibGUgd29ya3NwYWNlLmNvbW1pdHMgKG1heSBvdmVybGFwKS5cbiAgLy8gUmVuZGVyaW5nIGRlZHVwIGhhbmRsZXMgY3Jvc3MtYnJhbmNoIG92ZXJsYXAgdmlhIGJhcmUgc2hvcnQgaGFzaGVzLlxuICBjb25zdCByZWFjaGFibGVGcm9tVHJhY2tlZCA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuICBjb25zdCBncm91cHM6IENvbW1pdEdyb3VwW10gPSBbXTtcblxuICBmb3IgKGNvbnN0IFtuYW1lLCBtZXRhXSBvZiBzb3J0ZWRCcmFuY2hlcykge1xuICAgIGNvbnN0IHJlYWNoYWJsZSA9IGdldFJlYWNoYWJsZVNoYXMod29ya3NwYWNlUGF0aCwgbmFtZSk7XG4gICAgY29uc3QgYnJhbmNoU2hhcyA9IHdvcmtzcGFjZS5jb21taXRzLmZpbHRlcigoc2hhKSA9PiByZWFjaGFibGUuaGFzKHNoYSkpO1xuICAgIGZvciAoY29uc3Qgc2hhIG9mIGJyYW5jaFNoYXMpIHJlYWNoYWJsZUZyb21UcmFja2VkLmFkZChzaGEpO1xuICAgIGlmIChicmFuY2hTaGFzLmxlbmd0aCA+IDApIHtcbiAgICAgIGdyb3Vwcy5wdXNoKHsgYnJhbmNoTmFtZTogbmFtZSwgcGFyZW50QnJhbmNoOiBtZXRhLnBhcmVudEJyYW5jaCwgc2hhczogYnJhbmNoU2hhcyB9KTtcbiAgICB9XG4gIH1cblxuICAvLyBCYXNlIGJyYW5jaDogY29tbWl0cyByZWFjaGFibGUgZnJvbSBiYXNlIGJ1dCBOT1QgZnJvbSBhbnkgdHJhY2tlZCBicmFuY2hcbiAgY29uc3QgYmFzZVJlYWNoYWJsZSA9IGdldFJlYWNoYWJsZVNoYXMod29ya3NwYWNlUGF0aCwgYmFzZUJyYW5jaCk7XG4gIGNvbnN0IGJhc2VTaGFzID0gd29ya3NwYWNlLmNvbW1pdHMuZmlsdGVyKChzaGEpID0+IGJhc2VSZWFjaGFibGUuaGFzKHNoYSkgJiYgIXJlYWNoYWJsZUZyb21UcmFja2VkLmhhcyhzaGEpKTtcbiAgaWYgKGJhc2VTaGFzLmxlbmd0aCA+IDApIHtcbiAgICBncm91cHMucHVzaCh7IGJyYW5jaE5hbWU6IGJhc2VCcmFuY2gsIHNoYXM6IGJhc2VTaGFzIH0pO1xuICB9XG5cbiAgLy8gT3JwaGFuZWQ6IG5vdCByZWFjaGFibGUgZnJvbSBhbnkgdHJhY2tlZCBicmFuY2ggb3IgYmFzZSwgZmlsdGVyIHRvIHJlc29sdmFibGVcbiAgY29uc3Qgb3JwaGFuZWRTaGFzID0gd29ya3NwYWNlLmNvbW1pdHMuZmlsdGVyKChzaGEpID0+ICFyZWFjaGFibGVGcm9tVHJhY2tlZC5oYXMoc2hhKSAmJiAhYmFzZVJlYWNoYWJsZS5oYXMoc2hhKSk7XG4gIGNvbnN0IHJlc29sdmFibGUgPSBmaWx0ZXJSZXNvbHZhYmxlU2hhcyh3b3Jrc3BhY2VQYXRoLCBvcnBoYW5lZFNoYXMpO1xuICBpZiAocmVzb2x2YWJsZS5sZW5ndGggPiAwKSB7XG4gICAgZ3JvdXBzLnB1c2goeyBicmFuY2hOYW1lOiAnJywgc2hhczogcmVzb2x2YWJsZSwgb3JwaGFuZWQ6IHRydWUgfSk7XG4gIH1cblxuICAvLyBSZW5kZXIgYmxvY2tzIHdpdGggY3Jvc3MtYnJhbmNoIGRlZHVwXG4gIGNvbnN0IHByaW50ZWRTaGFzID0gbmV3IFNldDxzdHJpbmc+KCk7XG4gIGNvbnN0IGJsb2Nrczogc3RyaW5nW10gPSBbXTtcblxuICBmb3IgKGNvbnN0IGdyb3VwIG9mIGdyb3Vwcykge1xuICAgIGNvbnN0IG5ld1NoYXMgPSBncm91cC5zaGFzLmZpbHRlcigoc2hhKSA9PiAhcHJpbnRlZFNoYXMuaGFzKHNoYSkpO1xuICAgIGNvbnN0IGR1cFNoYXMgPSBncm91cC5zaGFzLmZpbHRlcigoc2hhKSA9PiBwcmludGVkU2hhcy5oYXMoc2hhKSk7XG5cbiAgICAvLyBTaG93IG1vc3QgcmVjZW50IE4gd2l0aCBmdWxsIGRldGFpbFxuICAgIGNvbnN0IGRpc3BsYXlTaGFzID0gbmV3U2hhcy5zbGljZSgtTUFYX1dPUktTUEFDRV9DT01NSVRTX1BFUl9CUkFOQ0gpO1xuICAgIGNvbnN0IGRldGFpbHMgPSByZXNvbHZlV29ya3NwYWNlQ29tbWl0RGV0YWlscyh3b3Jrc3BhY2VQYXRoLCBkaXNwbGF5U2hhcyk7XG5cbiAgICBpZiAoZGV0YWlscykge1xuICAgICAgZm9yIChjb25zdCBzaGEgb2YgZGlzcGxheVNoYXMpIHByaW50ZWRTaGFzLmFkZChzaGEpO1xuICAgIH1cblxuICAgIC8vIEJ1aWxkIGJvZHk6IGZ1bGwgZGV0YWlscyBmaXJzdCwgdGhlbiBiYXJlIGhhc2hlcyBmb3IgZGVkdXBcbiAgICBjb25zdCBib2R5UGFydHM6IHN0cmluZ1tdID0gW107XG4gICAgaWYgKGRldGFpbHMpIGJvZHlQYXJ0cy5wdXNoKGRldGFpbHMpO1xuICAgIGlmIChkdXBTaGFzLmxlbmd0aCA+IDApIHtcbiAgICAgIGJvZHlQYXJ0cy5wdXNoKGR1cFNoYXMubWFwKChzaGEpID0+IHNoYS5zbGljZSgwLCA3KSkuam9pbignXFxuJykpO1xuICAgIH1cblxuICAgIGlmIChib2R5UGFydHMubGVuZ3RoID09PSAwKSBjb250aW51ZTtcblxuICAgIC8vIEJ1aWxkIFhNTCB0YWdcbiAgICBjb25zdCBhdHRyczogc3RyaW5nW10gPSBbXTtcbiAgICBpZiAoZ3JvdXAub3JwaGFuZWQpIHtcbiAgICAgIGF0dHJzLnB1c2goJ29ycGhhbmVkPVwidHJ1ZVwiJyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGF0dHJzLnB1c2goYGJyYW5jaD1cIiR7Z3JvdXAuYnJhbmNoTmFtZX1cImApO1xuICAgICAgaWYgKGdyb3VwLnBhcmVudEJyYW5jaCkgYXR0cnMucHVzaChgcGFyZW50QnJhbmNoPVwiJHtncm91cC5wYXJlbnRCcmFuY2h9XCJgKTtcbiAgICB9XG4gICAgYXR0cnMucHVzaChgY291bnQ9XCIke2dyb3VwLnNoYXMubGVuZ3RofVwiYCk7XG5cbiAgICBibG9ja3MucHVzaChgPHdvcmtzcGFjZS1yZXBvLWxvZyAke2F0dHJzLmpvaW4oJyAnKX0+XFxuJHtib2R5UGFydHMuam9pbignXFxuJyl9XFxuPC93b3Jrc3BhY2UtcmVwby1sb2c+YCk7XG4gIH1cblxuICByZXR1cm4gYmxvY2tzO1xufVxuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBDb21iaW5lZCBjb250ZXh0XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbi8qKlxuICogQnVpbGRzIHRoZSBjb21iaW5lZCBhZGRpdGlvbmFsIGNvbnRleHQgc3RyaW5nIGZvciBzZXNzaW9uIGFuZCBzdWJhZ2VudCBob29rcy5cbiAqXG4gKiBQcm9kdWNlcyBYTUwgYmxvY2tzOiBgPGNhcmQ+YCAoaWRlbnRpdHkgKyBnYXRlcyArIGVudiksIGA8Y2FyZC1yZXBvPmBcbiAqIChkaXJlY3Rvcnkgc3VtbWFyeSksIG9wdGlvbmFsbHkgYDxjYXJkLXJlcG8tbG9nPmAgKHJlY2VudCBjYXJkIHJlcG8gY29tbWl0cyksXG4gKiBhbmQgb3B0aW9uYWxseSBgPHdvcmtzcGFjZS1yZXBvLWxvZz5gIGJsb2NrcyAod29ya3NwYWNlIGNvbW1pdHMgcGVyIGJyYW5jaCkuXG4gKiBMZXQge0BsaW5rIENhcmRSZXBvQWNjZXNzRXJyb3J9IHByb3BhZ2F0ZSB0byB0aGUgY2FsbGVyIGZvciBzdHJ1Y3R1cmVkXG4gKiBlcnJvciBoYW5kbGluZy5cbiAqXG4gKiBAcGFyYW0gYWN0aW9uSW5wdXQgLSBQYXJzZWQgYWN0aW9uIGlucHV0IGZyb20gdGhlIGVudmlyb25tZW50LlxuICogQHJldHVybnMgQ29tYmluZWQgY29udGV4dCBzdHJpbmcgd2l0aCBYTUwgYmxvY2tzLlxuICogQHRocm93cyB7Q2FyZFJlcG9BY2Nlc3NFcnJvcn0gV2hlbiB0aGUgY2FyZCByZXBvc2l0b3J5IGNhbm5vdCBiZSByZWFkLlxuICovXG5leHBvcnQgZnVuY3Rpb24gYnVpbGRBZGRpdGlvbmFsQ29udGV4dChhY3Rpb25JbnB1dDogQWN0aW9uSW5wdXQpOiBzdHJpbmcge1xuICBjb25zdCBjYXJkQmxvY2sgPSBidWlsZENhcmRCbG9jayhhY3Rpb25JbnB1dCk7XG4gIGNvbnN0IHJlcG9CbG9jayA9IGJ1aWxkQ2FyZFJlcG9CbG9jayhhY3Rpb25JbnB1dC5jYXJkUmVwb1BhdGgpO1xuICBjb25zdCBsb2dCbG9jayA9IGJ1aWxkQ2FyZFJlcG9Mb2dCbG9jayhhY3Rpb25JbnB1dC5jYXJkUmVwb1BhdGgpO1xuICBjb25zdCB3b3Jrc3BhY2VMb2dCbG9ja3MgPSBidWlsZFdvcmtzcGFjZVJlcG9Mb2dCbG9ja3MoYWN0aW9uSW5wdXQucmVwb1Jvb3QsIGFjdGlvbklucHV0LmNhcmRSZXBvUGF0aCk7XG5cbiAgY29uc3QgcGFydHMgPSBbY2FyZEJsb2NrLCByZXBvQmxvY2tdO1xuICBpZiAobG9nQmxvY2spIHBhcnRzLnB1c2gobG9nQmxvY2spO1xuICBwYXJ0cy5wdXNoKC4uLndvcmtzcGFjZUxvZ0Jsb2Nrcyk7XG4gIHJldHVybiBwYXJ0cy5qb2luKCdcXG5cXG4nKTtcbn1cbiIsICIvKipcbiAqIEJyYW5jaCBhbmQgd29ya3RyZWUgdHJhY2tpbmcgdHlwZXMgZm9yIENhcmRzIFYyIHdvcmtzcGFjZSBpbnRlZ3JhdGlvbi5cbiAqXG4gKiBUaGVzZSB0eXBlcyBzdXBwb3J0IHRyYWNraW5nIEdpdCBicmFuY2hlcyBhbmQgdGhlaXIgYXNzb2NpYXRlZCB3b3JrdHJlZXMgd2l0aGluXG4gKiBhIGNhcmQncyB3b3Jrc3BhY2UuIEJyYW5jaCBtZXRhZGF0YSBpcyBwZXJzaXN0ZWQgaW4gc2VwYXJhdGUgd29ya3NwYWNlLWJyYW5jaGVzLmpzb25cbiAqIGFuZCB3b3Jrc3BhY2UtY29tbWl0cy5jc3YgZmlsZXMsIHRyYWNrZWQgd2l0aCBzdGF0aWMgbWV0YWRhdGEgKGJyYW5jaCBuYW1lLCB3b3JrdHJlZSBwYXRoLFxuICogYWRkZWRBdCB0aW1lc3RhbXApIGFuZCBkZXJpdmVkIGZpZWxkcyBjb21wdXRlZCBhdCByZWFkIHRpbWUgKGV4aXN0cywgaXNNZXJnZWQsIGNvbW1pdHMpLlxuICpcbiAqIFRoZSBicmFuY2ggQVBJIChgR0VUIC9jYXJkcy86aWQvYnJhbmNoZXNgLCBgUE9TVCAvY2FyZHMvOmlkL2JyYW5jaGVzYCkgdXNlc1xuICogdGhlc2UgdHlwZXMgdG8gZXhwb3NlIHdvcmtzcGFjZSB0cmFja2luZyBzdGF0ZSB0byBjbGllbnRzIGFuZCBlbmFibGUgYnJhbmNoXG4gKiBhc3NvY2lhdGlvbiB3aXRoIGNhcmRzLlxuICpcbiAqIEBzdW1tYXJ5IEJyYW5jaCBhbmQgd29ya3RyZWUgdHJhY2tpbmcgdHlwZXMgZm9yIENhcmRzIFYyIHdvcmtzcGFjZSBpbnRlZ3JhdGlvblxuICogQG1vZHVsZSB0eXBlcy9icmFuY2hcbiAqL1xuXG5pbXBvcnQgdHlwZSB7IENvbW1pdERldGFpbHMgfSBmcm9tICcuL3RpbWVsaW5lLmpzJztcblxuLyoqXG4gKiBXZWxsLWtub3duIFNIQSBmb3IgYW4gZW1wdHkgZ2l0IHRyZWUuXG4gKlxuICogVGhpcyBpcyBhIGRldGVybWluaXN0aWMgdmFsdWUgcHJvZHVjZWQgYnkgYGdpdCBoYXNoLW9iamVjdCAtdCB0cmVlIC9kZXYvbnVsbGBcbiAqIGFuZCBuZXZlciBjaGFuZ2VzIGFjcm9zcyBnaXQgdmVyc2lvbnMuIFVzZWQgYXMgdGhlIGRpZmYgYmFzZSB3aGVuIGNvbXBhcmluZ1xuICogYWdhaW5zdCBhIHN0YXRlIHdpdGggbm8gcHJpb3IgY29tbWl0cy5cbiAqL1xuZXhwb3J0IGNvbnN0IEVNUFRZX1RSRUVfU0hBID0gJzRiODI1ZGM2NDJjYjZlYjlhMDYwZTU0YmY4ZDY5Mjg4ZmJlZTQ5MDQnO1xuXG5leHBvcnQgY29uc3QgV09SS1NQQUNFX0JSQU5DSEVTX0ZJTEUgPSAnd29ya3NwYWNlLWJyYW5jaGVzLmpzb24nO1xuZXhwb3J0IGNvbnN0IFdPUktTUEFDRV9DT01NSVRTX0ZJTEUgPSAnd29ya3NwYWNlLWNvbW1pdHMuY3N2JztcblxuLyoqXG4gKiBBIHNpbmdsZSB0cmFja2VkIGJyYW5jaCB3aXRoaW4gYSBjYXJkJ3Mgd29ya3NwYWNlIGJsb2NrLlxuICpcbiAqIFRoaXMgaXMgdGhlIG1pbmltYWwgbWV0YWRhdGEgcGVyc2lzdGVkIGZvciBlYWNoIGJyYW5jaCBpbiB3b3Jrc3BhY2UtYnJhbmNoZXMuanNvbi5cbiAqIFRoZSB3b3JrdHJlZSBwYXRoIGlzIG9wdGlvbmFsIGFuZCBtYWNoaW5lLXNwZWNpZmljOyBpdCBtYXkgYmVjb21lIHN0YWxlIGlmXG4gKiB0aGUgd29ya3RyZWUgaXMgbW92ZWQgb3IgZGVsZXRlZCBvdXRzaWRlIG9mIHRoZSBjYXJkcyBzeXN0ZW0uXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgV29ya3NwYWNlQnJhbmNoIHtcbiAgLyoqXG4gICAqIE9wdGlvbmFsIGFic29sdXRlIHBhdGggdG8gd29ya3RyZWUgZGlyZWN0b3J5IChtYWNoaW5lLXNwZWNpZmljLCBtYXkgYmUgc3RhbGUpLlxuICAgKiBUaGlzIHBhdGggaXMgYWR2aXNvcnkgb25seSBhbmQgc2hvdWxkIGJlIHZhbGlkYXRlZCBiZWZvcmUgdXNlLlxuICAgKi9cbiAgd29ya3RyZWU/OiBzdHJpbmc7XG5cbiAgLyoqXG4gICAqIE5hbWUgb2YgdGhlIGJyYW5jaCB0aGlzIHdhcyBjcmVhdGVkIGZyb20gKGUuZy4sICdtYWluJywgJ21hc3RlcicpLlxuICAgKiBVc2VkIGFzIHRoZSBiYXNlIHJlZiBmb3IgY29tcGFyaXNvbnMsIGZhc3QtZm9yd2FyZCBkZXRlY3Rpb24sIGFuZCByZWJhc2UgdGFyZ2V0aW5nLlxuICAgKi9cbiAgcGFyZW50QnJhbmNoOiBzdHJpbmc7XG5cbiAgLyoqXG4gICAqIElTTyA4NjAxIHRpbWVzdGFtcCB3aGVuIGJyYW5jaCB3YXMgYWRkZWQgdG8gdGhlIGNhcmQuXG4gICAqIFVzZWQgZm9yIGNocm9ub2xvZ2ljYWwgc29ydGluZyBhbmQgYXVkaXQgdHJhaWxzLlxuICAgKi9cbiAgYWRkZWRBdDogc3RyaW5nO1xufVxuXG4vKipcbiAqIEJyYW5jaCBpbmZvIHJldHVybmVkIGJ5IEdFVCAvY2FyZHMvOmlkL2JyYW5jaGVzIChpbmNsdWRlcyBjb21wdXRlZCBmaWVsZHMpLlxuICpcbiAqIFRoaXMgdHlwZSBleHRlbmRzIHRoZSBwZXJzaXN0ZWQgV29ya3NwYWNlQnJhbmNoIGRhdGEgd2l0aCBydW50aW1lLWNvbXB1dGVkXG4gKiBmaWVsZHMgdGhhdCByZWZsZWN0IHRoZSBjdXJyZW50IEdpdCByZXBvc2l0b3J5IHN0YXRlLiBDb21wdXRlZCBmaWVsZHMgYXJlXG4gKiBuZXZlciBwZXJzaXN0ZWQuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgQnJhbmNoSW5mbyB7XG4gIC8qKlxuICAgKiBCcmFuY2ggbmFtZSAobWF5IGNvbnRhaW4gc2xhc2hlcywgZS5nLiwgXCJmZWF0dXJlL2F1dGhcIikuXG4gICAqIFRoaXMgaXMgdGhlIEdpdCByZWYgbmFtZSwgbm90IGEgZmlsZXN5c3RlbSBwYXRoLlxuICAgKi9cbiAgbmFtZTogc3RyaW5nO1xuXG4gIC8qKlxuICAgKiBPcHRpb25hbCB3b3JrdHJlZSBwYXRoIGFzc29jaWF0ZWQgd2l0aCB0aGlzIGJyYW5jaC5cbiAgICogQ29waWVkIGZyb20gV29ya3NwYWNlQnJhbmNoLndvcmt0cmVlIGlmIHByZXNlbnQuXG4gICAqL1xuICB3b3JrdHJlZT86IHN0cmluZztcblxuICAvKipcbiAgICogUGFyZW50IGJyYW5jaCBuYW1lIGZyb20gd2hpY2ggdGhpcyBicmFuY2ggd2FzIGNyZWF0ZWQgKGUuZy4sICdtYWluJywgJ21hc3RlcicpLlxuICAgKiBVc2VkIGFzIHRoZSBiYXNlIHJlZiBmb3IgY29tcGFyaXNvbnMuXG4gICAqL1xuICBwYXJlbnRCcmFuY2g6IHN0cmluZztcblxuICAvKipcbiAgICogSVNPIDg2MDEgdGltZXN0YW1wIHdoZW4gYnJhbmNoIHdhcyBhZGRlZC5cbiAgICogQ29waWVkIGZyb20gV29ya3NwYWNlQnJhbmNoLmFkZGVkQXQuXG4gICAqL1xuICBhZGRlZEF0OiBzdHJpbmc7XG5cbiAgLyoqXG4gICAqIFdoZXRoZXIgdGhlIGJyYW5jaCBzdGlsbCBleGlzdHMgaW4gZ2l0IChjb21wdXRlZCBhdCByZWFkIHRpbWUpLlxuICAgKiBGYWxzZSBpZiB0aGUgYnJhbmNoIHJlZiBoYXMgYmVlbiBkZWxldGVkLlxuICAgKi9cbiAgZXhpc3RzPzogYm9vbGVhbjtcblxuICAvKipcbiAgICogV2hldGhlciB0aGUgYnJhbmNoIHRpcCBpcyBtZXJnZWQgaW50byByZXF1ZXN0aW5nIHdvcmtzcGFjZSBIRUFELlxuICAgKiBDb21wdXRlZCBhdCByZWFkIHRpbWUsIG5ldmVyIHN0b3JlZC4gT25seSBtZWFuaW5nZnVsIHdoZW4gZXhpc3RzPXRydWUuXG4gICAqL1xuICBpc01lcmdlZD86IGJvb2xlYW47XG5cbiAgLyoqXG4gICAqIENvbW1pdCBTSEFzIHJlYWNoYWJsZSBmcm9tIHRoaXMgYnJhbmNoIGJ1dCBub3QgZnJvbSBIRUFEIChjb21wdXRlZCBhdCByZWFkIHRpbWUpLlxuICAgKiBFbXB0eSBhcnJheSBpZiBicmFuY2ggaXMgZnVsbHkgbWVyZ2VkIG9yIGRvZXMgbm90IGV4aXN0LlxuICAgKi9cbiAgY29tbWl0cz86IHN0cmluZ1tdO1xufVxuXG4vKipcbiAqIFJlc3BvbnNlIHNoYXBlIGZvciBHRVQgL2NhcmRzLzppZC9icmFuY2hlcy5cbiAqXG4gKiBSZXR1cm5zIGFsbCB0cmFja2VkIGJyYW5jaGVzIGZvciBhIGNhcmQgd2l0aCBjb21wdXRlZCBydW50aW1lIGZpZWxkcy5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBCcmFuY2hlc1Jlc3BvbnNlIHtcbiAgLyoqXG4gICAqIExpc3Qgb2YgdHJhY2tlZCBicmFuY2hlcyB3aXRoIGNvbXB1dGVkIGZpZWxkcy5cbiAgICogU29ydGVkIGJ5IGFkZGVkQXQgdGltZXN0YW1wIChvbGRlc3QgZmlyc3QpLlxuICAgKi9cbiAgYnJhbmNoZXM6IEJyYW5jaEluZm9bXTtcblxuICAvKipcbiAgICogQWxsIGNhcmQtbGV2ZWwgY29tbWl0IFNIQXMgZnJvbSB3b3Jrc3BhY2UtY29tbWl0cy5jc3YuXG4gICAqIFByZXNlbnQgcmVnYXJkbGVzcyBvZiBicmFuY2ggc3RhdGUsIHNvIHRoZSBVSSBjYW4gc2hvdyBjaGFuZ2VzXG4gICAqIGV2ZW4gYWZ0ZXIgYWxsIHRyYWNrZWQgYnJhbmNoZXMgaGF2ZSBiZWVuIHJlbW92ZWQuXG4gICAqL1xuICBjb21taXRzOiBzdHJpbmdbXTtcblxuICAvKipcbiAgICogRGVmYXVsdCBicmFuY2ggb2YgdGhlIHdvcmtzcGFjZSByZXBvc2l0b3J5IChlLmcuLCAnbWFpbicsICdtYXN0ZXInKS5cbiAgICogRGV0ZWN0ZWQgZnJvbSBgcmVmcy9yZW1vdGVzL29yaWdpbi9IRUFEYCwgZmFsbGluZyBiYWNrIHRvIGN1cnJlbnQgSEVBRCBicmFuY2guXG4gICAqIFVzZWQgYXMgdGhlIGJhc2UgcmVmIGZvciBjYXJkLWxldmVsIGNvbW1pdHMgd2hlbiBubyB0cmFja2VkIGJyYW5jaGVzIHJlbWFpbi5cbiAgICovXG4gIGRlZmF1bHRCcmFuY2g6IHN0cmluZztcblxuICAvKipcbiAgICogU0hBcyBvZiBjYXJkIGNvbW1pdHMgdGhhdCBhcmUgYW5jZXN0b3JzIG9mIEhFQUQgYXQgdGhlIHJlcXVlc3Rpbmcgd29ya3NwYWNlLlxuICAgKiBFbXB0eSBhcnJheSB3aGVuIHdvcmtzcGFjZVBhdGggaXMgbm90IHByb3ZpZGVkIG9yIGdpdCBvcGVyYXRpb25zIGZhaWwgZ3JhY2VmdWxseS5cbiAgICovXG4gIG1lcmdlZENvbW1pdHM6IHN0cmluZ1tdO1xuXG4gIC8qKlxuICAgKiBCcmFuY2ggbmFtZSBjaGVja2VkIG91dCBhdCB0aGUgcmVxdWVzdGluZyB3b3Jrc3BhY2UgKGUuZy4sIFwibWFpblwiLCBcImZlYXR1cmUtYXV0aFwiKS5cbiAgICogXCJIRUFEXCIgd2hlbiBpbiBkZXRhY2hlZCBIRUFEIHN0YXRlLlxuICAgKiBFbXB0eSBzdHJpbmcgd2hlbiB3b3Jrc3BhY2VQYXRoIGlzIG5vdCBwcm92aWRlZCBvciBnaXQgb3BlcmF0aW9ucyBmYWlsIGdyYWNlZnVsbHkuXG4gICAqL1xuICBoZWFkQnJhbmNoOiBzdHJpbmc7XG5cbiAgLyoqXG4gICAqIENvbW1pdCBkZXRhaWxzIGtleWVkIGJ5IFNIQSBmb3IgZWFjaCBlbnRyeSBpbiBgY29tbWl0c2AuXG4gICAqIEVtcHR5IHdoZW4gdGhlcmUgYXJlIG5vIGNvbW1pdHMuIE9ubHkgYWJzZW50IHdoZW4gYHdvcmtzcGFjZVBhdGhgIHdhcyBub3QgcHJvdmlkZWRcbiAgICogKGkuZS4gdGhlIHJlaW5kZXggcGF0aCBcdTIwMTQgYGNvbW1pdERldGFpbHNgIGlzIGRlbGl2ZXJlZCBzZXBhcmF0ZWx5IHZpYSBgV29ya3NwYWNlQ29tbWl0RXZlbnRgKS5cbiAgICovXG4gIGNvbW1pdERldGFpbHM/OiBSZWNvcmQ8c3RyaW5nLCBDb21taXREZXRhaWxzPjtcbn1cblxuLyoqXG4gKiBSZXF1ZXN0IGJvZHkgZm9yIFBPU1QgL2NhcmRzLzppZC9icmFuY2hlcy5cbiAqXG4gKiBVc2VkIHRvIGFkZCBhIG5ldyBicmFuY2ggdG8gYSBjYXJkJ3Mgd29ya3NwYWNlIHRyYWNraW5nIGJsb2NrLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIEFkZEJyYW5jaFJlcXVlc3Qge1xuICAvKipcbiAgICogQnJhbmNoIG5hbWUgdG8gdHJhY2suXG4gICAqIE11c3QgYmUgYSB2YWxpZCBHaXQgcmVmIG5hbWUgKG1heSBjb250YWluIHNsYXNoZXMpLlxuICAgKi9cbiAgbmFtZTogc3RyaW5nO1xuXG4gIC8qKlxuICAgKiBPcHRpb25hbCB3b3JrdHJlZSBwYXRoLlxuICAgKiBTaG91bGQgYmUgYW4gYWJzb2x1dGUgcGF0aCB0byBhIHZhbGlkIHdvcmt0cmVlIGRpcmVjdG9yeS5cbiAgICovXG4gIHdvcmt0cmVlPzogc3RyaW5nO1xuXG4gIC8qKlxuICAgKiBQYXJlbnQgYnJhbmNoIG5hbWUgZnJvbSB3aGljaCB0aGlzIGJyYW5jaCB3YXMgY3JlYXRlZCAoZS5nLiwgJ21haW4nLCAnbWFzdGVyJykuXG4gICAqIFVzZWQgYXMgdGhlIGJhc2UgcmVmIGZvciBjb21wYXJpc29ucy5cbiAgICovXG4gIHBhcmVudEJyYW5jaDogc3RyaW5nO1xufVxuIiwgIi8qKlxuICogVHJlZS1mb3JtYXR0ZWQgcmVuZGVyaW5nIGZvciBmaWxlIHBhdGggbGlzdHMuXG4gKlxuICogQnVpbGRzIGEgdHJpZSBmcm9tIGZpbGUgcGF0aHMsIGNvbGxhcHNlcyBzaW5nbGUtY2hpbGQgZGlyZWN0b3J5IGNoYWlucyxcbiAqIGFuZCByZW5kZXJzIGFuIGluZGVudGVkIHRyZWUgdGhhdCBjb21wcmVzc2VzIHNoYXJlZCBwcmVmaXhlcy5cbiAqXG4gKiBAc3VtbWFyeSBQcmVmaXgtY29tcHJlc3NlZCBmaWxlIHRyZWUgcmVuZGVyaW5nXG4gKi9cblxuLyoqIEludGVybmFsIHRyaWUgbm9kZSBmb3IgYnVpbGRpbmcgdGhlIGZpbGUgdHJlZS4gKi9cbmludGVyZmFjZSBUcmllTm9kZSB7XG4gIGNoaWxkcmVuOiBNYXA8c3RyaW5nLCBUcmllTm9kZT47XG4gIGlzRmlsZTogYm9vbGVhbjtcbn1cblxuZnVuY3Rpb24gY3JlYXRlTm9kZSgpOiBUcmllTm9kZSB7XG4gIHJldHVybiB7IGNoaWxkcmVuOiBuZXcgTWFwKCksIGlzRmlsZTogZmFsc2UgfTtcbn1cblxuLyoqXG4gKiBJbnNlcnRzIGEgcGF0aCBpbnRvIHRoZSB0cmllLCBzcGxpdHRpbmcgb24gYC9gLlxuICpcbiAqIEBwYXJhbSByb290IC0gUm9vdCB0cmllIG5vZGUuXG4gKiBAcGFyYW0gcGF0aCAtIEZpbGUgcGF0aCB0byBpbnNlcnQuXG4gKi9cbmZ1bmN0aW9uIGluc2VydFBhdGgocm9vdDogVHJpZU5vZGUsIHBhdGg6IHN0cmluZyk6IHZvaWQge1xuICBsZXQgbm9kZSA9IHJvb3Q7XG4gIGNvbnN0IHNlZ21lbnRzID0gcGF0aC5zcGxpdCgnLycpO1xuICBmb3IgKGxldCBpID0gMDsgaSA8IHNlZ21lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgY29uc3Qgc2VnID0gc2VnbWVudHNbaV0hO1xuICAgIGxldCBjaGlsZCA9IG5vZGUuY2hpbGRyZW4uZ2V0KHNlZyk7XG4gICAgaWYgKCFjaGlsZCkge1xuICAgICAgY2hpbGQgPSBjcmVhdGVOb2RlKCk7XG4gICAgICBub2RlLmNoaWxkcmVuLnNldChzZWcsIGNoaWxkKTtcbiAgICB9XG4gICAgbm9kZSA9IGNoaWxkO1xuICB9XG4gIG5vZGUuaXNGaWxlID0gdHJ1ZTtcbn1cblxuLyoqXG4gKiBSZW5kZXJzIHRoZSB0cmllIGFzIGFuIGluZGVudGVkIHRyZWUgc3RyaW5nLlxuICpcbiAqIFNpbmdsZS1jaGlsZCBkaXJlY3RvcnkgY2hhaW5zIGFyZSBjb2xsYXBzZWQ6IGBzcmMvYCBcdTIxOTIgYGxpYi9gIFx1MjE5MiBgdXRpbHMudHNgXG4gKiBiZWNvbWVzIGBzcmMvbGliL3V0aWxzLnRzYCB3aGVuIGVhY2ggaW50ZXJtZWRpYXRlIGhhcyBleGFjdGx5IG9uZSBjaGlsZC5cbiAqXG4gKiBEaXJlY3RvcmllcyBzb3J0IGJlZm9yZSBmaWxlcyBhdCBlYWNoIGxldmVsLiBFbnRyaWVzIGFyZSBhbHBoYWJldGljYWwgd2l0aGluXG4gKiBlYWNoIGdyb3VwLlxuICpcbiAqIEBwYXJhbSBub2RlIC0gQ3VycmVudCB0cmllIG5vZGUgdG8gcmVuZGVyLlxuICogQHBhcmFtIGluZGVudCAtIE51bWJlciBvZiBsZWFkaW5nIHNwYWNlcyBmb3IgdGhpcyBsZXZlbC5cbiAqIEByZXR1cm5zIFJlbmRlcmVkIHRyZWUgbGluZXMgam9pbmVkIGJ5IG5ld2xpbmVzLlxuICovXG5mdW5jdGlvbiByZW5kZXJOb2RlKG5vZGU6IFRyaWVOb2RlLCBpbmRlbnQ6IG51bWJlcik6IHN0cmluZyB7XG4gIGNvbnN0IGxpbmVzOiBzdHJpbmdbXSA9IFtdO1xuICBjb25zdCBwcmVmaXggPSAnICcucmVwZWF0KGluZGVudCk7XG5cbiAgLy8gU2VwYXJhdGUgY2hpbGRyZW4gaW50byBkaXJlY3RvcmllcyBhbmQgZmlsZXNcbiAgY29uc3QgZGlyczogW3N0cmluZywgVHJpZU5vZGVdW10gPSBbXTtcbiAgY29uc3QgZmlsZXM6IFtzdHJpbmcsIFRyaWVOb2RlXVtdID0gW107XG5cbiAgZm9yIChjb25zdCBbbmFtZSwgY2hpbGRdIG9mIG5vZGUuY2hpbGRyZW4pIHtcbiAgICBpZiAoY2hpbGQuaXNGaWxlICYmIGNoaWxkLmNoaWxkcmVuLnNpemUgPT09IDApIHtcbiAgICAgIGZpbGVzLnB1c2goW25hbWUsIGNoaWxkXSk7XG4gICAgfSBlbHNlIGlmIChjaGlsZC5pc0ZpbGUgJiYgY2hpbGQuY2hpbGRyZW4uc2l6ZSA+IDApIHtcbiAgICAgIC8vIEEgcGF0aCBzZWdtZW50IHRoYXQgaXMgYm90aCBhIGZpbGUgYW5kIGhhcyBjaGlsZHJlbiBcdTIwMTQgdHJlYXQgYXMgZmlsZVxuICAgICAgLy8gZm9yIGl0cyBvd24gZW50cnksIHRoZW4gcmVuZGVyIGNoaWxkcmVuIHNlcGFyYXRlbHkuXG4gICAgICBmaWxlcy5wdXNoKFtuYW1lLCBjcmVhdGVOb2RlKCldKTsgLy8gZmlsZSBlbnRyeVxuICAgICAgZGlycy5wdXNoKFtuYW1lLCBjaGlsZF0pOyAvLyBkaXJlY3RvcnkgZW50cnkgd2l0aCBjaGlsZHJlblxuICAgIH0gZWxzZSB7XG4gICAgICBkaXJzLnB1c2goW25hbWUsIGNoaWxkXSk7XG4gICAgfVxuICB9XG5cbiAgZGlycy5zb3J0KChbYV0sIFtiXSkgPT4gYS5sb2NhbGVDb21wYXJlKGIpKTtcbiAgZmlsZXMuc29ydCgoW2FdLCBbYl0pID0+IGEubG9jYWxlQ29tcGFyZShiKSk7XG5cbiAgZm9yIChjb25zdCBbbmFtZSwgY2hpbGRdIG9mIGRpcnMpIHtcbiAgICAvLyBDb2xsYXBzZSBzaW5nbGUtY2hpbGQgZGlyZWN0b3J5IGNoYWluc1xuICAgIGxldCBjb2xsYXBzZWQgPSBuYW1lO1xuICAgIGxldCBjdXJyZW50ID0gY2hpbGQ7XG4gICAgd2hpbGUgKGN1cnJlbnQuY2hpbGRyZW4uc2l6ZSA9PT0gMSAmJiAhY3VycmVudC5pc0ZpbGUpIHtcbiAgICAgIGNvbnN0IFtuZXh0TmFtZSwgbmV4dENoaWxkXSA9IGN1cnJlbnQuY2hpbGRyZW4uZW50cmllcygpLm5leHQoKS52YWx1ZSBhcyBbc3RyaW5nLCBUcmllTm9kZV07XG4gICAgICBjb2xsYXBzZWQgKz0gYC8ke25leHROYW1lfWA7XG4gICAgICBjdXJyZW50ID0gbmV4dENoaWxkO1xuICAgIH1cblxuICAgIGlmIChjdXJyZW50LmlzRmlsZSAmJiBjdXJyZW50LmNoaWxkcmVuLnNpemUgPT09IDApIHtcbiAgICAgIC8vIEVudGlyZSBjaGFpbiBjb2xsYXBzZWQgdG8gYSBzaW5nbGUgZmlsZSBwYXRoXG4gICAgICBsaW5lcy5wdXNoKGAke3ByZWZpeH0ke2NvbGxhcHNlZH1gKTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gRGlyZWN0b3J5IG5vZGUgXHUyMDE0IHJlbmRlciB3aXRoIHRyYWlsaW5nIHNsYXNoLCB0aGVuIGNoaWxkcmVuXG4gICAgICBsaW5lcy5wdXNoKGAke3ByZWZpeH0ke2NvbGxhcHNlZH0vYCk7XG4gICAgICBsaW5lcy5wdXNoKHJlbmRlck5vZGUoY3VycmVudCwgaW5kZW50ICsgMikpO1xuICAgIH1cbiAgfVxuXG4gIGZvciAoY29uc3QgW25hbWVdIG9mIGZpbGVzKSB7XG4gICAgbGluZXMucHVzaChgJHtwcmVmaXh9JHtuYW1lfWApO1xuICB9XG5cbiAgcmV0dXJuIGxpbmVzLmZpbHRlcihCb29sZWFuKS5qb2luKCdcXG4nKTtcbn1cblxuLyoqXG4gKiBSZW5kZXJzIGEgbGlzdCBvZiBmaWxlIHBhdGhzIGFzIGEgcHJlZml4LWNvbXByZXNzZWQgaW5kZW50ZWQgdHJlZS5cbiAqXG4gKiBTaW5nbGUtY2hpbGQgZGlyZWN0b3J5IGNoYWlucyBhcmUgY29sbGFwc2VkIGludG8gY29tYmluZWQgc2VnbWVudHNcbiAqIChlLmcuLCBgc3JjL2xpYi9gIGFzIG9uZSBub2RlKS4gTGVhZiBmaWxlcyBhbHdheXMgYXBwZWFyIGFzIGluZGl2aWR1YWwgZW50cmllcy5cbiAqXG4gKiBAcGFyYW0gcGF0aHMgLSBGbGF0IGZpbGUgcGF0aHMgKGUuZy4sIGZyb20gYGdpdCBsb2cgLS1uYW1lLW9ubHlgKS5cbiAqIEByZXR1cm5zIEluZGVudGVkIHRyZWUgc3RyaW5nLCBvciBlbXB0eSBzdHJpbmcgaWYgcGF0aHMgaXMgZW1wdHkuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBmb3JtYXRGaWxlVHJlZShwYXRoczogc3RyaW5nW10pOiBzdHJpbmcge1xuICBpZiAocGF0aHMubGVuZ3RoID09PSAwKSByZXR1cm4gJyc7XG5cbiAgY29uc3Qgcm9vdCA9IGNyZWF0ZU5vZGUoKTtcbiAgZm9yIChjb25zdCBwIG9mIHBhdGhzKSB7XG4gICAgaWYgKHApIGluc2VydFBhdGgocm9vdCwgcCk7XG4gIH1cblxuICByZXR1cm4gcmVuZGVyTm9kZShyb290LCAxKTtcbn1cblxuLyoqXG4gKiBQYXJzZXMgcmF3IGBnaXQgbG9nIC0tbmFtZS1vbmx5YCBvdXRwdXQgaW50byBwZXItY29tbWl0IGJsb2NrcywgYXBwbGllc1xuICogdHJlZSBmb3JtYXR0aW5nIHRvIGVhY2ggY29tbWl0J3MgZmlsZSBsaXN0LCBhbmQgcmVhc3NlbWJsZXMuXG4gKlxuICogSGFuZGxlcyB0d28gc2VwYXJhdG9yIGNvbnZlbnRpb25zOlxuICogLSBOVUwtZGVsaW1pdGVkIChgJXgwMGAgaW4gYC0tcHJldHR5PWZvcm1hdGApOiB1c2VkIGJ5IGBidWlsZENhcmRSZXBvTG9nQmxvY2tgXG4gKiAtIEJsYW5rLWxpbmUtZGVsaW1pdGVkOiB1c2VkIGJ5IGAtLW5vLXdhbGtgIGluIGByZXNvbHZlV29ya3NwYWNlQ29tbWl0RGV0YWlsc2AgYW5kIHRoZSBzdG9wIGhvb2tcbiAqXG4gKiBAcGFyYW0gcmF3TG9nIC0gUmF3IGdpdCBsb2cgb3V0cHV0IHdpdGggYC0tbmFtZS1vbmx5YC5cbiAqIEBwYXJhbSBzZXBhcmF0b3IgLSBIb3cgY29tbWl0cyBhcmUgc2VwYXJhdGVkOiBgJ251bCdgIGZvciBgJXgwMGAsIGAnYmxhbmstbGluZSdgIGZvciBkb3VibGUgbmV3bGluZS5cbiAqIEByZXR1cm5zIEZvcm1hdHRlZCBvdXRwdXQgd2l0aCB0cmVlLXJlbmRlcmVkIGZpbGUgbGlzdHMgcGVyIGNvbW1pdC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGZvcm1hdENvbW1pdExvZyhyYXdMb2c6IHN0cmluZywgc2VwYXJhdG9yOiAnbnVsJyB8ICdibGFuay1saW5lJyk6IHN0cmluZyB7XG4gIGlmICghcmF3TG9nLnRyaW0oKSkgcmV0dXJuICcnO1xuXG4gIGlmIChzZXBhcmF0b3IgPT09ICdudWwnKSB7XG4gICAgcmV0dXJuIGZvcm1hdE51bERlbGltaXRlZChyYXdMb2cpO1xuICB9XG4gIHJldHVybiBmb3JtYXRCbGFua0xpbmVEZWxpbWl0ZWQocmF3TG9nKTtcbn1cblxuLyoqXG4gKiBOVUwtZGVsaW1pdGVkIGZvcm1hdDogYCV4MDBoZWFkZXJcXG5cXG5maWxlMVxcbmZpbGUyXFx4MDBoZWFkZXIyXFxuXFxuZmlsZTNgXG4gKlxuICogVGhlIGZpcnN0IE5VTCBtYXkgYmUgYXQgcG9zaXRpb24gMCAobGVhZGluZyksIHNvIHdlIGZpbHRlciBlbXB0eSBzcGxpdHMuXG4gKlxuICogQHBhcmFtIHJhdyAtIFJhdyBOVUwtZGVsaW1pdGVkIGdpdCBsb2cgb3V0cHV0LlxuICogQHJldHVybnMgRm9ybWF0dGVkIG91dHB1dCB3aXRoIHRyZWUtcmVuZGVyZWQgZmlsZSBsaXN0cy5cbiAqL1xuZnVuY3Rpb24gZm9ybWF0TnVsRGVsaW1pdGVkKHJhdzogc3RyaW5nKTogc3RyaW5nIHtcbiAgY29uc3QgY29tbWl0cyA9IHJhdy5zcGxpdCgnXFwwJykuZmlsdGVyKChzKSA9PiBzLnRyaW0oKSk7XG4gIHJldHVybiBjb21taXRzLm1hcCgoY29tbWl0KSA9PiBmb3JtYXRTaW5nbGVDb21taXQoY29tbWl0LnRyaW0oKSkpLmpvaW4oJ1xcblxcbicpO1xufVxuXG4vKipcbiAqIEJsYW5rLWxpbmUtZGVsaW1pdGVkIGZvcm1hdDogY29tbWl0cyBzZXBhcmF0ZWQgYnkgYFxcblxcbmAgd2hlcmUgdGhlIHNlY29uZFxuICogYmxvY2sgc3RhcnRzIHdpdGggYSBzaG9ydCBoYXNoIGxpbmUuXG4gKlxuICogV2l0aGluIGEgc2luZ2xlIGNvbW1pdCwgYC0tbmFtZS1vbmx5YCBhbHNvIHB1dHMgYSBibGFuayBsaW5lIGJldHdlZW4gdGhlXG4gKiBoZWFkZXIgYW5kIHRoZSBmaWxlIGxpc3QuIFdlIGRpc3Rpbmd1aXNoIGludHJhLWNvbW1pdCBibGFuayBsaW5lcyBmcm9tXG4gKiBpbnRlci1jb21taXQgYmxhbmsgbGluZXMgYnkgY2hlY2tpbmcgd2hldGhlciB0aGUgbGluZSBhZnRlciB0aGUgYmxhbmsgbGluZVxuICogbG9va3MgbGlrZSBhIGNvbW1pdCBoZWFkZXIgKHNob3J0IGhhc2ggcGF0dGVybikuXG4gKlxuICogQHBhcmFtIHJhdyAtIFJhdyBibGFuay1saW5lLWRlbGltaXRlZCBnaXQgbG9nIG91dHB1dC5cbiAqIEByZXR1cm5zIEZvcm1hdHRlZCBvdXRwdXQgd2l0aCB0cmVlLXJlbmRlcmVkIGZpbGUgbGlzdHMuXG4gKi9cbmZ1bmN0aW9uIGZvcm1hdEJsYW5rTGluZURlbGltaXRlZChyYXc6IHN0cmluZyk6IHN0cmluZyB7XG4gIGNvbnN0IGxpbmVzID0gcmF3LnNwbGl0KCdcXG4nKTtcbiAgY29uc3QgY29tbWl0QmxvY2tzOiBzdHJpbmdbXVtdID0gW107XG4gIGxldCBjdXJyZW50OiBzdHJpbmdbXSA9IFtdO1xuXG4gIGZvciAobGV0IGkgPSAwOyBpIDwgbGluZXMubGVuZ3RoOyBpKyspIHtcbiAgICBjb25zdCBsaW5lID0gbGluZXNbaV0hO1xuXG4gICAgLy8gRGV0ZWN0IGludGVyLWNvbW1pdCBib3VuZGFyeTogZW1wdHkgbGluZSBmb2xsb3dlZCBieSBhIGNvbW1pdCBoZWFkZXJcbiAgICBpZiAobGluZSA9PT0gJycgJiYgY3VycmVudC5sZW5ndGggPiAwKSB7XG4gICAgICBjb25zdCBuZXh0ID0gbGluZXNbaSArIDFdO1xuICAgICAgaWYgKG5leHQgJiYgaXNDb21taXRIZWFkZXIobmV4dCkpIHtcbiAgICAgICAgY29tbWl0QmxvY2tzLnB1c2goY3VycmVudCk7XG4gICAgICAgIGN1cnJlbnQgPSBbXTtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgfVxuXG4gICAgY3VycmVudC5wdXNoKGxpbmUpO1xuICB9XG4gIGlmIChjdXJyZW50Lmxlbmd0aCA+IDApIGNvbW1pdEJsb2Nrcy5wdXNoKGN1cnJlbnQpO1xuXG4gIHJldHVybiBjb21taXRCbG9ja3MubWFwKChibG9jaykgPT4gZm9ybWF0U2luZ2xlQ29tbWl0KGJsb2NrLmpvaW4oJ1xcbicpLnRyaW0oKSkpLmpvaW4oJ1xcblxcbicpO1xufVxuXG4vKipcbiAqIENvbW1pdCBoZWFkZXJzIGZyb20gYC0tcHJldHR5PWZvcm1hdDolaCAtICVzYCBzdGFydCB3aXRoIGEgc2hvcnQgaGV4IGhhc2guXG4gKlxuICogQHBhcmFtIGxpbmUgLSBMaW5lIHRvIHRlc3QuXG4gKiBAcmV0dXJucyBXaGV0aGVyIHRoZSBsaW5lIG1hdGNoZXMgdGhlIGNvbW1pdCBoZWFkZXIgcGF0dGVybi5cbiAqL1xuZnVuY3Rpb24gaXNDb21taXRIZWFkZXIobGluZTogc3RyaW5nKTogYm9vbGVhbiB7XG4gIHJldHVybiAvXlswLTlhLWZdezcsfSAtIC8udGVzdChsaW5lKTtcbn1cblxuLyoqXG4gKiBGb3JtYXRzIGEgc2luZ2xlIGNvbW1pdCBibG9jazogaGVhZGVyIGxpbmUgKyBmaWxlIHBhdGhzLlxuICpcbiAqIFRoZSBoZWFkZXIgaXMgdGhlIGZpcnN0IG5vbi1lbXB0eSBsaW5lLiBSZW1haW5pbmcgbm9uLWVtcHR5IGxpbmVzIGFyZSBmaWxlIHBhdGhzLlxuICpcbiAqIEBwYXJhbSBibG9jayAtIFJhdyBjb21taXQgYmxvY2sgdGV4dC5cbiAqIEByZXR1cm5zIEhlYWRlciBmb2xsb3dlZCBieSB0cmVlLWZvcm1hdHRlZCBmaWxlIGxpc3QuXG4gKi9cbmZ1bmN0aW9uIGZvcm1hdFNpbmdsZUNvbW1pdChibG9jazogc3RyaW5nKTogc3RyaW5nIHtcbiAgY29uc3QgbGluZXMgPSBibG9jay5zcGxpdCgnXFxuJykuZmlsdGVyKChsKSA9PiBsLnRyaW0oKSk7XG4gIGlmIChsaW5lcy5sZW5ndGggPT09IDApIHJldHVybiAnJztcblxuICBjb25zdCBoZWFkZXIgPSBsaW5lc1swXSE7XG4gIGNvbnN0IGZpbGVzID0gbGluZXMuc2xpY2UoMSk7XG5cbiAgaWYgKGZpbGVzLmxlbmd0aCA9PT0gMCkgcmV0dXJuIGhlYWRlcjtcblxuICBjb25zdCB0cmVlID0gZm9ybWF0RmlsZVRyZWUoZmlsZXMpO1xuICByZXR1cm4gdHJlZSA/IGAke2hlYWRlcn1cXG4ke3RyZWV9YCA6IGhlYWRlcjtcbn1cbiIsICIvKipcbiAqIFN1YmFnZW50U3RhcnQgaG9vayBpbXBsZW1lbnRhdGlvbi5cbiAqXG4gKiBHaXZlcyBzdWJhZ2VudHMgY2FyZCBhd2FyZW5lc3MgdmlhIGNvbnRleHQgaW5qZWN0aW9uIG9ubHkuXG4gKiBVc2VzIHRoZSBzaGFyZWQge0BsaW5rIGJ1aWxkQWRkaXRpb25hbENvbnRleHR9IGZvciBjb250ZXh0LlxuICpcbiAqIEBzdW1tYXJ5IFN1YmFnZW50U3RhcnQgaG9vayBcdTIwMTQgY2FyZCBjb250ZXh0IGluamVjdGlvbiBvbmx5XG4gKiBAc2VlIGh0dHBzOi8vY29kZS5jbGF1ZGUuY29tL2RvY3MvZW4vaG9va3Mjc3ViYWdlbnRzdGFydFxuICovXG5cbmltcG9ydCB7IGV4dHJhY3RBY3Rpb25JbnB1dCB9IGZyb20gJ0BjYXJkcy9zZGsvY29uZmlnJztcbmltcG9ydCB7IHN1YmFnZW50U3RhcnRIb29rLCBzdWJhZ2VudFN0YXJ0T3V0cHV0IH0gZnJvbSAnQGdvb2Rmb290L2NsYXVkZS1jb2RlLWhvb2tzJztcbmltcG9ydCB7IGJ1aWxkQWRkaXRpb25hbENvbnRleHQsIENhcmRSZXBvQWNjZXNzRXJyb3IgfSBmcm9tICcuL2xpYi9jb250ZXh0LmpzJztcblxuZXhwb3J0IGRlZmF1bHQgc3ViYWdlbnRTdGFydEhvb2soe30sIGFzeW5jIChfaW5wdXQsIHsgbG9nZ2VyIH0pID0+IHtcbiAgbGV0IGFjdGlvbklucHV0OiBSZXR1cm5UeXBlPHR5cGVvZiBleHRyYWN0QWN0aW9uSW5wdXQ+O1xuICB0cnkge1xuICAgIGFjdGlvbklucHV0ID0gZXh0cmFjdEFjdGlvbklucHV0KCk7XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgY29uc3QgbWVzc2FnZSA9IGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogU3RyaW5nKGVycm9yKTtcbiAgICBsb2dnZXIuZXJyb3IoJ05vdCBydW5uaW5nIGluc2lkZSBhbiBhY3Rpb24gc3VicHJvY2VzcycsIHsgZXJyb3I6IG1lc3NhZ2UgfSk7XG4gICAgcmV0dXJuIHN1YmFnZW50U3RhcnRPdXRwdXQoe1xuICAgICAgc3lzdGVtTWVzc2FnZTogJ1N1YmFnZW50U3RhcnQgaG9vazogbm90IHJ1bm5pbmcgaW5zaWRlIGFuIGFjdGlvbiBzdWJwcm9jZXNzLidcbiAgICB9KTtcbiAgfVxuXG4gIGxldCBzeXN0ZW1NZXNzYWdlOiBzdHJpbmc7XG4gIHRyeSB7XG4gICAgc3lzdGVtTWVzc2FnZSA9IGJ1aWxkQWRkaXRpb25hbENvbnRleHQoYWN0aW9uSW5wdXQpO1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGlmIChlcnJvciBpbnN0YW5jZW9mIENhcmRSZXBvQWNjZXNzRXJyb3IpIHtcbiAgICAgIGxvZ2dlci5lcnJvcignQ2FyZCByZXBvIGluYWNjZXNzaWJsZScsIHsgcmVwb1BhdGg6IGVycm9yLnJlcG9QYXRoLCBlcnJvcjogZXJyb3IubWVzc2FnZSB9KTtcbiAgICAgIHJldHVybiBzdWJhZ2VudFN0YXJ0T3V0cHV0KHtcbiAgICAgICAgY29udGludWU6IGZhbHNlLFxuICAgICAgICAuLi5lcnJvci50b0hvb2tGYWlsdXJlKCdzdWJhZ2VudCcpXG4gICAgICB9KTtcbiAgICB9XG4gICAgdGhyb3cgZXJyb3I7XG4gIH1cblxuICByZXR1cm4gc3ViYWdlbnRTdGFydE91dHB1dCh7XG4gICAgc3lzdGVtTWVzc2FnZSxcbiAgICBob29rU3BlY2lmaWNPdXRwdXQ6IHtcbiAgICAgIGFkZGl0aW9uYWxDb250ZXh0OiBzeXN0ZW1NZXNzYWdlXG4gICAgfVxuICB9KTtcbn0pO1xuIiwgImltcG9ydCBob29rIGZyb20gJy4vc3ViYWdlbnQtc3RhcnQudHMnO1xuaW1wb3J0IHsgZXhlY3V0ZSB9IGZyb20gJy4uLy4uLy4uLy4uL25vZGVfbW9kdWxlcy9AZ29vZGZvb3QvY2xhdWRlLWNvZGUtaG9va3MvZGlzdC9ydW50aW1lLmpzJztcblxuZXhlY3V0ZShob29rKTtcbiJdLAogICJtYXBwaW5ncyI6ICI7Ozs7Ozs7Ozs7O0FBZ0JBLFNBQVMsb0JBQW9CO0FBY3RCLElBQU0saUJBQWlCO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQUs1QixTQUFTO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQU1ULGFBQWE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBTWIsYUFBYTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQU9iLGdCQUFnQjtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFNaEIsY0FBYztBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFNZCxrQkFBa0I7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FB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LE1BQU0sS0FBSyxHQUFHLENBQUM7QUFBQSxFQUFNLFVBQVUsS0FBSyxJQUFJLENBQUM7QUFBQSxzQkFBeUI7QUFBQSxFQUN2RztBQUVBLFNBQU87QUFDVDtBQW1CTyxTQUFTLHVCQUF1QixhQUFrQztBQUN2RSxRQUFNLFlBQVksZUFBZSxXQUFXO0FBQzVDLFFBQU0sWUFBWSxtQkFBbUIsWUFBWSxZQUFZO0FBQzdELFFBQU0sV0FBVyxzQkFBc0IsWUFBWSxZQUFZO0FBQy9ELFFBQU0scUJBQXFCLDRCQUE0QixZQUFZLFVBQVUsWUFBWSxZQUFZO0FBRXJHLFFBQU0sUUFBUSxDQUFDLFdBQVcsU0FBUztBQUNuQyxNQUFJLFNBQVUsT0FBTSxLQUFLLFFBQVE7QUFDakMsUUFBTSxLQUFLLEdBQUcsa0JBQWtCO0FBQ2hDLFNBQU8sTUFBTSxLQUFLLE1BQU07QUFDMUI7OztBRy9rQkEsSUFBTyx5QkFBUSxrQkFBa0IsQ0FBQyxHQUFHLE9BQU8sUUFBUSxFQUFFLFFBQUFDLFFBQU8sTUFBTTtBQUNqRSxNQUFJO0FBQ0osTUFBSTtBQUNGLGtCQUFjLG1CQUFtQjtBQUFBLEVBQ25DLFNBQVMsT0FBTztBQUNkLFVBQU0sVUFBVSxpQkFBaUIsUUFBUSxNQUFNLFVBQVUsT0FBTyxLQUFLO0FBQ3JFLElBQUFBLFFBQU8sTUFBTSwyQ0FBMkMsRUFBRSxPQUFPLFFBQVEsQ0FBQztBQUMxRSxXQUFPLG9CQUFvQjtBQUFBLE1BQ3pCLGVBQWU7QUFBQSxJQUNqQixDQUFDO0FBQUEsRUFDSDtBQUVBLE1BQUk7QUFDSixNQUFJO0FBQ0Ysb0JBQWdCLHVCQUF1QixXQUFXO0FBQUEsRUFDcEQsU0FBUyxPQUFPO0FBQ2QsUUFBSSxpQkFBaUIscUJBQXFCO0FBQ3hDLE1BQUFBLFFBQU8sTUFBTSwwQkFBMEIsRUFBRSxVQUFVLE1BQU0sVUFBVSxPQUFPLE1BQU0sUUFBUSxDQUFDO0FBQ3pGLGFBQU8sb0JBQW9CO0FBQUEsUUFDekIsVUFBVTtBQUFBLFFBQ1YsR0FBRyxNQUFNLGNBQWMsVUFBVTtBQUFBLE1BQ25DLENBQUM7QUFBQSxJQUNIO0FBQ0EsVUFBTTtBQUFBLEVBQ1I7QUFFQSxTQUFPLG9CQUFvQjtBQUFBLElBQ3pCO0FBQUEsSUFDQSxvQkFBb0I7QUFBQSxNQUNsQixtQkFBbUI7QUFBQSxJQUNyQjtBQUFBLEVBQ0YsQ0FBQztBQUNILENBQUM7OztBQzNDRCxRQUFRLHNCQUFJOyIsCiAgIm5hbWVzIjogWyJyZWFkRmlsZVN5bmMiLCAicmVhZEZpbGVTeW5jIiwgImxvZ2dlciJdCn0K
