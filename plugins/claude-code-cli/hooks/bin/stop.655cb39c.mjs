#!/usr/bin/env -S node --enable-source-maps
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
function stopHook(config, handler) {
  return createHookFunction("Stop", config, handler);
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
function createDecisionOutputBuilder(hookType) {
  return (options = {}) => ({
    _type: hookType,
    stdout: options
  });
}
var stopOutput = /* @__PURE__ */ createDecisionOutputBuilder("Stop");

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
  return { stdout: specificOutput.stdout };
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
    process.exit(EXIT_CODES.SUCCESS);
  }
}

// src/lib/api.ts
import { readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
var ApiError = class _ApiError extends Error {
  /** Structured context used to build the formatted message. */
  options;
  constructor(message, options) {
    super(_ApiError.formatMessage(message, options ?? {}));
    this.name = "ApiError";
    this.options = options;
    if (options?.cause) {
      this.cause = options.cause;
    }
  }
  /**
   * Formats a human-readable message using any available HTTP context.
   * Fields are appended on separate lines to keep logs scannable.
   *
   * @param message - Core error message.
   * @param options - Optional HTTP context used to enrich the message.
   * @returns A formatted message string.
   */
  static formatMessage(message, options) {
    const parts = [message];
    if (options.method && options.url) {
      parts.push(`${options.method} ${options.url}`);
    } else if (options.url) {
      parts.push(`URL: ${options.url}`);
    }
    if (options.status !== void 0) {
      const statusPart = options.statusText ? `Status: ${options.status} ${options.statusText}` : `Status: ${options.status}`;
      parts.push(statusPart);
    }
    if (options.responsePreview) {
      parts.push(`Response: ${options.responsePreview}`);
    }
    return parts.length === 1 ? message : parts.join("\n");
  }
};
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
  const configPath = join(homedir(), ".cards", "cards-api.json");
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
async function discoverApiUrl(logger2) {
  if (process.env["API_TEST_MODE"] === "1") {
    logger2?.debug("API_TEST_MODE: Using mock URL");
    return "http://localhost:9999/test-api";
  }
  const info = await discoverApiInfo(logger2);
  if (info) {
    return `http://${info.host}:${info.port}`;
  }
  const configPath = join(homedir(), ".cards", "cards-api.json");
  try {
    const content = await readFile(configPath, "utf-8");
    const config = JSON.parse(content);
    if (!config["url"]) {
      throw new ApiError("API URL not found in config");
    }
    return config["url"];
  } catch (error) {
    logger2?.debug("API discovery failed", { error: String(error) });
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(`API discovery failed: ${error instanceof Error ? error.message : String(error)}`, {
      cause: error instanceof Error ? error : void 0
    });
  }
}
async function checkRemoteUpdates(cardId, baseUrl, since, logger2) {
  if (process.env["API_TEST_MODE"] === "1") {
    logger2?.debug("API_TEST_MODE: Returning false for checkRemoteUpdates");
    return false;
  }
  try {
    const url = since ? `${baseUrl}/cards/${cardId}/has-updates?since=${encodeURIComponent(since)}` : `${baseUrl}/cards/${cardId}/has-updates`;
    const response = await fetch(url, { signal: AbortSignal.timeout(5e3) });
    if (!response.ok) return false;
    const data = await response.json();
    return data.hasUpdates;
  } catch (error) {
    logger2?.debug("Check remote updates failed", { error: String(error) });
    return false;
  }
}

// src/claude-code-cli/stop.ts
var stop_default = stopHook({}, async (input, { logger: logger2 }) => {
  const sessionId = input.session_id;
  if (!sessionId) {
    return stopOutput({ decision: "approve" });
  }
  const cardId = process.env["CARD_ID"];
  if (!cardId) {
    return stopOutput({
      decision: "approve",
      systemMessage: "No card tracking"
    });
  }
  try {
    const apiInfo = await discoverApiInfo(logger2);
    const baseUrl = apiInfo ? `http://${apiInfo.host}:${apiInfo.port}` : await discoverApiUrl(logger2);
    const baselineTimestamp = apiInfo?.sessionBaseline?.updatedAt;
    const hasUpdates = await checkRemoteUpdates(cardId, baseUrl, baselineTimestamp, logger2);
    if (hasUpdates) {
      return stopOutput({
        decision: "block",
        reason: "Card has remote updates",
        systemMessage: "Card has updates since your session started. Please sync before stopping."
      });
    }
    return stopOutput({ decision: "approve" });
  } catch (error) {
    logger2.warn("Stop hook error", { error: String(error) });
    return stopOutput({ decision: "approve" });
  }
});

// src/claude-code-cli/stop-entry.ts
process.env["CLAUDE_CODE_HOOKS_CLI_LOG_FILE"] = "/tmp/hooks-cli.log";
execute(stop_default);
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vLi4vLi4vbm9kZV9tb2R1bGVzL0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcy9kaXN0L2Vudi5qcyIsICIuLi8uLi8uLi9ub2RlX21vZHVsZXMvQGdvb2Rmb290L2NsYXVkZS1jb2RlLWhvb2tzL2Rpc3QvaG9va3MuanMiLCAiLi4vLi4vLi4vbm9kZV9tb2R1bGVzL0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcy9kaXN0L2xvZ2dlci5qcyIsICIuLi8uLi8uLi9ub2RlX21vZHVsZXMvQGdvb2Rmb290L2NsYXVkZS1jb2RlLWhvb2tzL2Rpc3Qvb3V0cHV0cy5qcyIsICIuLi8uLi8uLi9ub2RlX21vZHVsZXMvQGdvb2Rmb290L2NsYXVkZS1jb2RlLWhvb2tzL2Rpc3QvcnVudGltZS5qcyIsICJzcmMvbGliL2FwaS50cyIsICJzcmMvY2xhdWRlLWNvZGUtY2xpL3N0b3AudHMiLCAic3JjL2NsYXVkZS1jb2RlLWNsaS9zdG9wLWVudHJ5LnRzIl0sCiAgInNvdXJjZXNDb250ZW50IjogWyIvKipcbiAqIEVudmlyb25tZW50IHZhcmlhYmxlIHV0aWxpdGllcyBmb3IgQ2xhdWRlIENvZGUgaG9va3MuXG4gKlxuICogUHJvdmlkZXMgdHlwZWQgYWNjZXNzIHRvIENsYXVkZSBDb2RlJ3MgZW52aXJvbm1lbnQgdmFyaWFibGVzIGFuZCB1dGlsaXRpZXNcbiAqIGZvciBwZXJzaXN0aW5nIGVudmlyb25tZW50IHZhcmlhYmxlcyBpbiBTZXNzaW9uU3RhcnQgaG9va3MuXG4gKlxuICogIyMgRW52aXJvbm1lbnQgVmFyaWFibGVzXG4gKlxuICogQ2xhdWRlIENvZGUgc2V0cyB0aGVzZSBlbnZpcm9ubWVudCB2YXJpYWJsZXMgd2hlbiBydW5uaW5nIGhvb2tzOlxuICpcbiAqIHwgVmFyaWFibGUgfCBEZXNjcmlwdGlvbiB8IEF2YWlsYWJsZSBJbiB8XG4gKiB8LS0tLS0tLS0tLXwtLS0tLS0tLS0tLS0tfC0tLS0tLS0tLS0tLS0tfFxuICogfCBgQ0xBVURFX1BST0pFQ1RfRElSYCB8IEFic29sdXRlIHBhdGggdG8gcHJvamVjdCByb290IHwgQWxsIGhvb2tzIHxcbiAqIHwgYENMQVVERV9FTlZfRklMRWAgfCBQYXRoIHRvIGZpbGUgZm9yIHBlcnNpc3RpbmcgZW52IHZhcnMgfCBTZXNzaW9uU3RhcnQgb25seSB8XG4gKiB8IGBDTEFVREVfQ09ERV9SRU1PVEVgIHwgYFwidHJ1ZVwiYCBpZiBydW5uaW5nIHJlbW90ZWx5IHwgQWxsIGhvb2tzIHxcbiAqIEBtb2R1bGVcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBpbXBvcnQgeyBnZXRQcm9qZWN0RGlyLCBwZXJzaXN0RW52VmFyLCBpc1JlbW90ZUVudmlyb25tZW50IH0gZnJvbSAnQGdvb2Rmb290L2NsYXVkZS1jb2RlLWhvb2tzJztcbiAqXG4gKiAvLyBHZXQgcHJvamVjdCBkaXJlY3RvcnlcbiAqIGNvbnN0IHByb2plY3REaXIgPSBnZXRQcm9qZWN0RGlyKCk7XG4gKlxuICogLy8gQ2hlY2sgaWYgcnVubmluZyByZW1vdGVseVxuICogaWYgKGlzUmVtb3RlRW52aXJvbm1lbnQoKSkge1xuICogICAvLyBIYW5kbGUgcmVtb3RlLXNwZWNpZmljIGxvZ2ljXG4gKiB9XG4gKlxuICogLy8gSW4gU2Vzc2lvblN0YXJ0IGhvb2s6IHBlcnNpc3QgZW52aXJvbm1lbnQgdmFyaWFibGVzXG4gKiBwZXJzaXN0RW52VmFyKCdOT0RFX0VOVicsICdwcm9kdWN0aW9uJyk7XG4gKiBwZXJzaXN0RW52VmFyKCdBUElfS0VZJywgJ3NlY3JldC1rZXknKTtcbiAqIGBgYFxuICogQHNlZSBodHRwczovL2NvZGUuY2xhdWRlLmNvbS9kb2NzL2VuL2hvb2tzI2hvb2stZXhlY3V0aW9uLWRldGFpbHNcbiAqL1xuaW1wb3J0ICogYXMgZnMgZnJvbSBcIm5vZGU6ZnNcIjtcbi8qKlxuICogQ2xhdWRlIENvZGUgZW52aXJvbm1lbnQgdmFyaWFibGUgbmFtZXMuXG4gKlxuICogVGhlc2UgYXJlIHRoZSBlbnZpcm9ubWVudCB2YXJpYWJsZXMgdGhhdCBDbGF1ZGUgQ29kZSBzZXRzIHdoZW4gcnVubmluZyBob29rcy5cbiAqL1xuZXhwb3J0IGNvbnN0IENMQVVERV9FTlZfVkFSUyA9IHtcbiAgICAvKipcbiAgICAgKiBBYnNvbHV0ZSBwYXRoIHRvIHRoZSBwcm9qZWN0IHJvb3QgZGlyZWN0b3J5IHdoZXJlIENsYXVkZSBDb2RlIHdhcyBzdGFydGVkLlxuICAgICAqIEF2YWlsYWJsZSBpbiBhbGwgaG9va3MuXG4gICAgICovXG4gICAgUFJPSkVDVF9ESVI6IFwiQ0xBVURFX1BST0pFQ1RfRElSXCIsXG4gICAgLyoqXG4gICAgICogUGF0aCB0byBhIGZpbGUgd2hlcmUgU2Vzc2lvblN0YXJ0IGhvb2tzIGNhbiBwZXJzaXN0IGVudmlyb25tZW50IHZhcmlhYmxlcy5cbiAgICAgKiBWYXJpYWJsZXMgd3JpdHRlbiB0byB0aGlzIGZpbGUgd2lsbCBiZSBhdmFpbGFibGUgaW4gYWxsIHN1YnNlcXVlbnQgYmFzaCBjb21tYW5kcy5cbiAgICAgKiBPbmx5IGF2YWlsYWJsZSBpbiBTZXNzaW9uU3RhcnQgaG9va3MuXG4gICAgICovXG4gICAgRU5WX0ZJTEU6IFwiQ0xBVURFX0VOVl9GSUxFXCIsXG4gICAgLyoqXG4gICAgICogU2V0IHRvIFwidHJ1ZVwiIHdoZW4gcnVubmluZyBpbiBhIHJlbW90ZSAod2ViKSBlbnZpcm9ubWVudC5cbiAgICAgKiBOb3Qgc2V0IG9yIGVtcHR5IHdoZW4gcnVubmluZyBpbiBsb2NhbCBDTEkgZW52aXJvbm1lbnQuXG4gICAgICovXG4gICAgUkVNT1RFOiBcIkNMQVVERV9DT0RFX1JFTU9URVwiLFxufTtcbi8qKlxuICogR2V0cyB0aGUgQ2xhdWRlIENvZGUgcHJvamVjdCBkaXJlY3RvcnkuXG4gKlxuICogVGhpcyBpcyB0aGUgYWJzb2x1dGUgcGF0aCB0byB0aGUgcHJvamVjdCByb290IHdoZXJlIENsYXVkZSBDb2RlIHdhcyBzdGFydGVkLlxuICogVGhlIHZhbHVlIGNvbWVzIGZyb20gdGhlIGBDTEFVREVfUFJPSkVDVF9ESVJgIGVudmlyb25tZW50IHZhcmlhYmxlLlxuICogQHJldHVybnMgVGhlIHByb2plY3QgZGlyZWN0b3J5IHBhdGgsIG9yIHVuZGVmaW5lZCBpZiBub3Qgc2V0XG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogY29uc3QgcHJvamVjdERpciA9IGdldFByb2plY3REaXIoKTtcbiAqIGlmIChwcm9qZWN0RGlyKSB7XG4gKiAgIGNvbnN0IGNvbmZpZ1BhdGggPSBgJHtwcm9qZWN0RGlyfS8uY2xhdWRlL2NvbmZpZy5qc29uYDtcbiAqIH1cbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0UHJvamVjdERpcigpIHtcbiAgICByZXR1cm4gcHJvY2Vzcy5lbnZbQ0xBVURFX0VOVl9WQVJTLlBST0pFQ1RfRElSXTtcbn1cbi8qKlxuICogR2V0cyB0aGUgQ2xhdWRlIENvZGUgZW52IGZpbGUgcGF0aCBmb3IgcGVyc2lzdGluZyBlbnZpcm9ubWVudCB2YXJpYWJsZXMuXG4gKlxuICogVGhpcyBpcyBvbmx5IGF2YWlsYWJsZSBpbiBTZXNzaW9uU3RhcnQgaG9va3MuIFRoZSBwYXRoIHBvaW50cyB0byBhIGZpbGVcbiAqIHdoZXJlIHlvdSBjYW4gd3JpdGUgc2hlbGwgZXhwb3J0IHN0YXRlbWVudHMgdG8gcGVyc2lzdCBlbnZpcm9ubWVudCB2YXJpYWJsZXNcbiAqIGZvciBhbGwgc3Vic2VxdWVudCBiYXNoIGNvbW1hbmRzIGluIHRoZSBzZXNzaW9uLlxuICogQHJldHVybnMgVGhlIGVudiBmaWxlIHBhdGgsIG9yIHVuZGVmaW5lZCBpZiBub3Qgc2V0IChub3QgYSBTZXNzaW9uU3RhcnQgaG9vaylcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBjb25zdCBlbnZGaWxlID0gZ2V0RW52RmlsZVBhdGgoKTtcbiAqIGlmIChlbnZGaWxlKSB7XG4gKiAgIC8vIFdlJ3JlIGluIGEgU2Vzc2lvblN0YXJ0IGhvb2sgYW5kIGNhbiBwZXJzaXN0IGVudiB2YXJzXG4gKiAgIHBlcnNpc3RFbnZWYXIoJ01ZX1ZBUicsICdteS12YWx1ZScpO1xuICogfVxuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRFbnZGaWxlUGF0aCgpIHtcbiAgICByZXR1cm4gcHJvY2Vzcy5lbnZbQ0xBVURFX0VOVl9WQVJTLkVOVl9GSUxFXTtcbn1cbi8qKlxuICogQ2hlY2tzIGlmIHRoZSBob29rIGlzIHJ1bm5pbmcgaW4gYSByZW1vdGUgKHdlYikgZW52aXJvbm1lbnQuXG4gKlxuICogUmVtb3RlIGVudmlyb25tZW50cyBtYXkgaGF2ZSBkaWZmZXJlbnQgY2FwYWJpbGl0aWVzIG9yIHJlc3RyaWN0aW9uc1xuICogY29tcGFyZWQgdG8gbG9jYWwgQ0xJIGVudmlyb25tZW50cy5cbiAqIEByZXR1cm5zIHRydWUgaWYgcnVubmluZyByZW1vdGVseSwgZmFsc2UgaWYgcnVubmluZyBsb2NhbGx5XG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogaWYgKGlzUmVtb3RlRW52aXJvbm1lbnQoKSkge1xuICogICAvLyBVc2Ugd2ViLWNvbXBhdGlibGUgYXBwcm9hY2hlc1xuICogfSBlbHNlIHtcbiAqICAgLy8gQ2FuIHVzZSBsb2NhbCBDTEkgZmVhdHVyZXNcbiAqIH1cbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNSZW1vdGVFbnZpcm9ubWVudCgpIHtcbiAgICByZXR1cm4gcHJvY2Vzcy5lbnZbQ0xBVURFX0VOVl9WQVJTLlJFTU9URV0gPT09IFwidHJ1ZVwiO1xufVxuLyoqXG4gKiBQZXJzaXN0cyBhbiBlbnZpcm9ubWVudCB2YXJpYWJsZSBmb3IgdXNlIGluIHN1YnNlcXVlbnQgYmFzaCBjb21tYW5kcy5cbiAqXG4gKiBUaGlzIGZ1bmN0aW9uIHdyaXRlcyBhIHNoZWxsIGV4cG9ydCBzdGF0ZW1lbnQgdG8gdGhlIGBDTEFVREVfRU5WX0ZJTEVgLFxuICogd2hpY2ggQ2xhdWRlIENvZGUgc291cmNlcyBiZWZvcmUgcnVubmluZyBiYXNoIGNvbW1hbmRzLiBUaGlzIGFsbG93c1xuICogU2Vzc2lvblN0YXJ0IGhvb2tzIHRvIGNvbmZpZ3VyZSB0aGUgZW52aXJvbm1lbnQgZm9yIHRoZSBlbnRpcmUgc2Vzc2lvbi5cbiAqXG4gKiAqKkltcG9ydGFudCoqOiBUaGlzIGZ1bmN0aW9uIG9ubHkgd29ya3MgaW4gU2Vzc2lvblN0YXJ0IGhvb2tzIHdoZXJlXG4gKiBgQ0xBVURFX0VOVl9GSUxFYCBpcyBzZXQuIEluIG90aGVyIGhvb2tzLCBpdCB3aWxsIHRocm93IGFuIGVycm9yLlxuICogQHBhcmFtIG5hbWUgLSBUaGUgZW52aXJvbm1lbnQgdmFyaWFibGUgbmFtZVxuICogQHBhcmFtIHZhbHVlIC0gVGhlIGVudmlyb25tZW50IHZhcmlhYmxlIHZhbHVlICh3aWxsIGJlIHNoZWxsLWVzY2FwZWQpXG4gKiBAdGhyb3dzIEVycm9yIGlmIENMQVVERV9FTlZfRklMRSBpcyBub3Qgc2V0IChub3QgaW4gYSBTZXNzaW9uU3RhcnQgaG9vaylcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBpbXBvcnQgeyBzZXNzaW9uU3RhcnRIb29rLCBzZXNzaW9uU3RhcnRPdXRwdXQsIHBlcnNpc3RFbnZWYXIgfSBmcm9tICdAZ29vZGZvb3QvY2xhdWRlLWNvZGUtaG9va3MnO1xuICpcbiAqIGV4cG9ydCBkZWZhdWx0IHNlc3Npb25TdGFydEhvb2soe30sIGFzeW5jIChpbnB1dCkgPT4ge1xuICogICAvLyBQZXJzaXN0IGVudmlyb25tZW50IHZhcmlhYmxlcyBmb3IgdGhlIHNlc3Npb25cbiAqICAgcGVyc2lzdEVudlZhcignTk9ERV9FTlYnLCAncHJvZHVjdGlvbicpO1xuICogICBwZXJzaXN0RW52VmFyKCdBUElfS0VZJywgcHJvY2Vzcy5lbnYuTVlfQVBJX0tFWSA/PyAnZGVmYXVsdCcpO1xuICogICBwZXJzaXN0RW52VmFyKCdQQVRIJywgYCR7cHJvY2Vzcy5lbnYuUEFUSH06Li9ub2RlX21vZHVsZXMvLmJpbmApO1xuICpcbiAqICAgcmV0dXJuIHNlc3Npb25TdGFydE91dHB1dCh7fSk7XG4gKiB9KTtcbiAqIGBgYFxuICogQHNlZSBodHRwczovL2NvZGUuY2xhdWRlLmNvbS9kb2NzL2VuL2hvb2tzI3BlcnNpc3RpbmctZW52aXJvbm1lbnQtdmFyaWFibGVzXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBwZXJzaXN0RW52VmFyKG5hbWUsIHZhbHVlKSB7XG4gICAgY29uc3QgZW52RmlsZSA9IGdldEVudkZpbGVQYXRoKCk7XG4gICAgaWYgKGVudkZpbGUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJwZXJzaXN0RW52VmFyIGNhbiBvbmx5IGJlIHVzZWQgaW4gU2Vzc2lvblN0YXJ0IGhvb2tzLiBcIiArIFwiQ0xBVURFX0VOVl9GSUxFIGVudmlyb25tZW50IHZhcmlhYmxlIGlzIG5vdCBzZXQuXCIpO1xuICAgIH1cbiAgICAvLyBTaGVsbC1lc2NhcGUgdGhlIHZhbHVlIHRvIGhhbmRsZSBzcGVjaWFsIGNoYXJhY3RlcnNcbiAgICBjb25zdCBlc2NhcGVkVmFsdWUgPSBlc2NhcGVTaGVsbFZhbHVlKHZhbHVlKTtcbiAgICAvLyBXcml0ZSB0aGUgZXhwb3J0IHN0YXRlbWVudFxuICAgIGNvbnN0IGV4cG9ydFN0YXRlbWVudCA9IGBleHBvcnQgJHtuYW1lfT0ke2VzY2FwZWRWYWx1ZX1cXG5gO1xuICAgIGZzLmFwcGVuZEZpbGVTeW5jKGVudkZpbGUsIGV4cG9ydFN0YXRlbWVudCwgXCJ1dGYtOFwiKTtcbn1cbi8qKlxuICogUGVyc2lzdHMgbXVsdGlwbGUgZW52aXJvbm1lbnQgdmFyaWFibGVzIGF0IG9uY2UuXG4gKlxuICogVGhpcyBpcyBhIGNvbnZlbmllbmNlIHdyYXBwZXIgYXJvdW5kIGBwZXJzaXN0RW52VmFyYCBmb3Igc2V0dGluZ1xuICogbXVsdGlwbGUgdmFyaWFibGVzIGluIGEgc2luZ2xlIGNhbGwuXG4gKiBAcGFyYW0gdmFycyAtIE9iamVjdCBtYXBwaW5nIHZhcmlhYmxlIG5hbWVzIHRvIHZhbHVlc1xuICogQHRocm93cyBFcnJvciBpZiBDTEFVREVfRU5WX0ZJTEUgaXMgbm90IHNldCAobm90IGluIGEgU2Vzc2lvblN0YXJ0IGhvb2spXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogcGVyc2lzdEVudlZhcnMoe1xuICogICBOT0RFX0VOVjogJ3Byb2R1Y3Rpb24nLFxuICogICBBUElfS0VZOiAnc2VjcmV0JyxcbiAqICAgREVCVUc6ICdmYWxzZSdcbiAqIH0pO1xuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBwZXJzaXN0RW52VmFycyh2YXJzKSB7XG4gICAgZm9yIChjb25zdCBbbmFtZSwgdmFsdWVdIG9mIE9iamVjdC5lbnRyaWVzKHZhcnMpKSB7XG4gICAgICAgIHBlcnNpc3RFbnZWYXIobmFtZSwgdmFsdWUpO1xuICAgIH1cbn1cbi8qKlxuICogRXNjYXBlcyBhIHZhbHVlIGZvciBzYWZlIHVzZSBpbiBhIHNoZWxsIGV4cG9ydCBzdGF0ZW1lbnQuXG4gKlxuICogVXNlcyBzaW5nbGUgcXVvdGVzIGFuZCBlc2NhcGVzIGFueSBlbWJlZGRlZCBzaW5nbGUgcXVvdGVzLlxuICogVGhpcyBwcmV2ZW50cyBzaGVsbCBpbmplY3Rpb24gYW5kIGhhbmRsZXMgc3BlY2lhbCBjaGFyYWN0ZXJzLlxuICogQHBhcmFtIHZhbHVlIC0gVGhlIHZhbHVlIHRvIGVzY2FwZVxuICogQHJldHVybnMgVGhlIHNoZWxsLWVzY2FwZWQgdmFsdWUgKHdpdGggcXVvdGVzKVxuICogQGludGVybmFsXG4gKi9cbmZ1bmN0aW9uIGVzY2FwZVNoZWxsVmFsdWUodmFsdWUpIHtcbiAgICAvLyBVc2Ugc2luZ2xlIHF1b3RlcyBhbmQgZXNjYXBlIGFueSBlbWJlZGRlZCBzaW5nbGUgcXVvdGVzXG4gICAgLy8gJ3ZhbHVlJyAtPiAndmFsJ1xcJyd1ZScgZm9yIHZhbHVlcyBjb250YWluaW5nIHNpbmdsZSBxdW90ZXNcbiAgICBjb25zdCBlc2NhcGVkID0gdmFsdWUucmVwbGFjZSgvJy9nLCBcIidcXFxcJydcIik7XG4gICAgcmV0dXJuIGAnJHtlc2NhcGVkfSdgO1xufVxuIiwgIi8qKlxuICogSG9vayBmYWN0b3J5IGZ1bmN0aW9ucyBmb3IgQ2xhdWRlIENvZGUgaG9va3MuXG4gKlxuICogUHJvdmlkZXMgdHlwZWQgZmFjdG9yeSBmdW5jdGlvbnMgZm9yIGFsbCAxMiBob29rIHR5cGVzIHRoYXQgaGFuZGxlOlxuICogLSBJbnB1dCB0eXBlIG5hcnJvd2luZyBiYXNlZCBvbiBob29rIGV2ZW50IHR5cGVcbiAqIC0gT3V0cHV0IHR5cGUgZW5mb3JjZW1lbnQgdmlhIHJldHVybiB0eXBlc1xuICogLSBFcnJvciB3cmFwcGluZyB3aXRoIGF1dG9tYXRpYyBsb2dnaW5nXG4gKiAtIExvZ2dlciBjb250ZXh0IGluamVjdGlvblxuICpcbiAqIEVhY2ggZmFjdG9yeSBhY2NlcHRzIGEgSG9va0NvbmZpZyB3aXRoIG9wdGlvbmFsIG1hdGNoZXIgYW5kIHRpbWVvdXQgc2V0dGluZ3MsXG4gKiBhbmQgcmV0dXJucyBhIGZ1bmN0aW9uIHRoYXQgdGhlIHJ1bnRpbWUgaW52b2tlcyB3aGVuIHRoZSBob29rIGZpbGUgZXhlY3V0ZXMuXG4gKiBAbW9kdWxlXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogaW1wb3J0IHsgcHJlVG9vbFVzZUhvb2ssIHByZVRvb2xVc2VPdXRwdXQgfSBmcm9tICdAZ29vZGZvb3QvY2xhdWRlLWNvZGUtaG9va3MnO1xuICpcbiAqIGV4cG9ydCBkZWZhdWx0IHByZVRvb2xVc2VIb29rKHsgbWF0Y2hlcjogJ0Jhc2gnIH0sIGFzeW5jIChpbnB1dCwgeyBsb2dnZXIgfSkgPT4ge1xuICogICBsb2dnZXIuaW5mbygnUHJvY2Vzc2luZyBCYXNoIGNvbW1hbmQnKTtcbiAqICAgcmV0dXJuIHByZVRvb2xVc2VPdXRwdXQoeyBhbGxvdzogdHJ1ZSB9KTtcbiAqIH0pO1xuICogYGBgXG4gKiBAc2VlIGh0dHBzOi8vY29kZS5jbGF1ZGUuY29tL2RvY3MvZW4vaG9va3NcbiAqL1xuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gR2VuZXJpYyBGYWN0b3J5XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vKipcbiAqIENyZWF0ZXMgYSBob29rIGZhY3RvcnkgZnVuY3Rpb24gZm9yIGEgc3BlY2lmaWMgaG9vayB0eXBlLlxuICpcbiAqIFRoaXMgaXMgdGhlIGludGVybmFsIGltcGxlbWVudGF0aW9uIHVzZWQgYnkgYWxsIHR5cGVkIGZhY3Rvcmllcy5cbiAqIEl0IHdyYXBzIHRoZSBoYW5kbGVyIHdpdGggZXJyb3IgY2F0Y2hpbmcgYW5kIGxvZ2dpbmcuXG4gKiBAcGFyYW0gaG9va0V2ZW50TmFtZSAtIFRoZSBob29rIGV2ZW50IG5hbWVcbiAqIEBwYXJhbSBjb25maWcgLSBIb29rIGNvbmZpZ3VyYXRpb25cbiAqIEBwYXJhbSBoYW5kbGVyIC0gVGhlIGhhbmRsZXIgZnVuY3Rpb24gdG8gd3JhcFxuICogQHJldHVybnMgQSB3cmFwcGVkIGhvb2sgZnVuY3Rpb25cbiAqIEBpbnRlcm5hbFxuICovXG5mdW5jdGlvbiBjcmVhdGVIb29rRnVuY3Rpb24oaG9va0V2ZW50TmFtZSwgY29uZmlnLCBoYW5kbGVyKSB7XG4gICAgY29uc3QgaG9va0ZuID0gYXN5bmMgKGlucHV0LCBjb250ZXh0KSA9PiB7XG4gICAgICAgIC8vIERlbGVnYXRlIGVycm9yIGhhbmRsaW5nIHRvIHRoZSBydW50aW1lIC0ganVzdCBleGVjdXRlIHRoZSBoYW5kbGVyXG4gICAgICAgIC8vIFRoZSBydW50aW1lIHdpbGwgY2F0Y2ggZXJyb3JzLCBsb2cgdGhlbSwgYW5kIHJldHVybiBhcHByb3ByaWF0ZSBvdXRwdXRcbiAgICAgICAgcmV0dXJuIGF3YWl0IGhhbmRsZXIoaW5wdXQsIGNvbnRleHQpO1xuICAgIH07XG4gICAgLy8gQXR0YWNoIG1ldGFkYXRhIGZvciBydW50aW1lIGluc3BlY3Rpb25cbiAgICBob29rRm4uaG9va0V2ZW50TmFtZSA9IGhvb2tFdmVudE5hbWU7XG4gICAgaG9va0ZuLm1hdGNoZXIgPSBjb25maWcubWF0Y2hlcjtcbiAgICBob29rRm4udGltZW91dCA9IGNvbmZpZy50aW1lb3V0O1xuICAgIHJldHVybiBob29rRm47XG59XG4vKiogQGluaGVyaXRkb2MgKi9cbmV4cG9ydCBmdW5jdGlvbiBwcmVUb29sVXNlSG9vayhjb25maWcsIGhhbmRsZXIpIHtcbiAgICByZXR1cm4gY3JlYXRlSG9va0Z1bmN0aW9uKFwiUHJlVG9vbFVzZVwiLCBjb25maWcsIGhhbmRsZXIpO1xufVxuLyoqIEBpbmhlcml0ZG9jICovXG5leHBvcnQgZnVuY3Rpb24gcG9zdFRvb2xVc2VIb29rKGNvbmZpZywgaGFuZGxlcikge1xuICAgIHJldHVybiBjcmVhdGVIb29rRnVuY3Rpb24oXCJQb3N0VG9vbFVzZVwiLCBjb25maWcsIGhhbmRsZXIpO1xufVxuLyoqIEBpbmhlcml0ZG9jICovXG5leHBvcnQgZnVuY3Rpb24gcG9zdFRvb2xVc2VGYWlsdXJlSG9vayhjb25maWcsIGhhbmRsZXIpIHtcbiAgICByZXR1cm4gY3JlYXRlSG9va0Z1bmN0aW9uKFwiUG9zdFRvb2xVc2VGYWlsdXJlXCIsIGNvbmZpZywgaGFuZGxlcik7XG59XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBOb3RpZmljYXRpb24gSG9vayBGYWN0b3J5XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vKipcbiAqIENyZWF0ZXMgYSBOb3RpZmljYXRpb24gaG9vayBoYW5kbGVyLlxuICpcbiAqIE5vdGlmaWNhdGlvbiBob29rcyBmaXJlIHdoZW4gQ2xhdWRlIENvZGUgc2VuZHMgYSBub3RpZmljYXRpb24sIGFsbG93aW5nIHlvdSB0bzpcbiAqIC0gRm9yd2FyZCBub3RpZmljYXRpb25zIHRvIGV4dGVybmFsIHN5c3RlbXNcbiAqIC0gTG9nIGltcG9ydGFudCBldmVudHNcbiAqIC0gVHJpZ2dlciBjdXN0b20gYWxlcnRpbmdcbiAqXG4gKiAqKk1hdGNoZXIqKjogTWF0Y2hlcyBhZ2FpbnN0IGBub3RpZmljYXRpb25fdHlwZWBcbiAqIEBwYXJhbSBjb25maWcgLSBIb29rIGNvbmZpZ3VyYXRpb24gd2l0aCBvcHRpb25hbCBtYXRjaGVyIGFuZCB0aW1lb3V0XG4gKiBAcGFyYW0gaGFuZGxlciAtIFRoZSBoYW5kbGVyIGZ1bmN0aW9uIHRvIGV4ZWN1dGVcbiAqIEByZXR1cm5zIEEgaG9vayBmdW5jdGlvbiB0aGF0IGNhbiBiZSBleHBvcnRlZCBhcyB0aGUgZGVmYXVsdCBleHBvcnRcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBpbXBvcnQgeyBub3RpZmljYXRpb25Ib29rLCBub3RpZmljYXRpb25PdXRwdXQgfSBmcm9tICdAZ29vZGZvb3QvY2xhdWRlLWNvZGUtaG9va3MnO1xuICpcbiAqIC8vIEZvcndhcmQgbm90aWZpY2F0aW9ucyB0byBTbGFja1xuICogZXhwb3J0IGRlZmF1bHQgbm90aWZpY2F0aW9uSG9vayh7fSwgYXN5bmMgKGlucHV0LCB7IGxvZ2dlciB9KSA9PiB7XG4gKiAgIGxvZ2dlci5pbmZvKCdOb3RpZmljYXRpb24gcmVjZWl2ZWQnLCB7XG4gKiAgICAgdHlwZTogaW5wdXQubm90aWZpY2F0aW9uX3R5cGUsXG4gKiAgICAgdGl0bGU6IGlucHV0LnRpdGxlXG4gKiAgIH0pO1xuICpcbiAqICAgYXdhaXQgc2VuZFNsYWNrTWVzc2FnZShpbnB1dC50aXRsZSA/PyAnTm90aWZpY2F0aW9uJywgaW5wdXQubWVzc2FnZSk7XG4gKlxuICogICByZXR1cm4gbm90aWZpY2F0aW9uT3V0cHV0KHt9KTtcbiAqIH0pO1xuICogYGBgXG4gKiBAc2VlIGh0dHBzOi8vY29kZS5jbGF1ZGUuY29tL2RvY3MvZW4vaG9va3Mjbm90aWZpY2F0aW9uXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBub3RpZmljYXRpb25Ib29rKGNvbmZpZywgaGFuZGxlcikge1xuICAgIHJldHVybiBjcmVhdGVIb29rRnVuY3Rpb24oXCJOb3RpZmljYXRpb25cIiwgY29uZmlnLCBoYW5kbGVyKTtcbn1cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIFVzZXJQcm9tcHRTdWJtaXQgSG9vayBGYWN0b3J5XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vKipcbiAqIENyZWF0ZXMgYSBVc2VyUHJvbXB0U3VibWl0IGhvb2sgaGFuZGxlci5cbiAqXG4gKiBVc2VyUHJvbXB0U3VibWl0IGhvb2tzIGZpcmUgd2hlbiBhIHVzZXIgc3VibWl0cyBhIHByb21wdCwgYWxsb3dpbmcgeW91IHRvOlxuICogLSBBZGQgYWRkaXRpb25hbCBjb250ZXh0IG9yIGluc3RydWN0aW9uc1xuICogLSBMb2cgdXNlciBpbnRlcmFjdGlvbnNcbiAqIC0gVmFsaWRhdGUgb3IgdHJhbnNmb3JtIHByb21wdHNcbiAqXG4gKiAqKk1hdGNoZXIqKjogTm8gbWF0Y2hlciBzdXBwb3J0IC0gZmlyZXMgb24gYWxsIHByb21wdCBzdWJtaXNzaW9uc1xuICogQHBhcmFtIGNvbmZpZyAtIEhvb2sgY29uZmlndXJhdGlvbiB3aXRoIG9wdGlvbmFsIHRpbWVvdXQgKG1hdGNoZXIgaXMgaWdub3JlZClcbiAqIEBwYXJhbSBoYW5kbGVyIC0gVGhlIGhhbmRsZXIgZnVuY3Rpb24gdG8gZXhlY3V0ZVxuICogQHJldHVybnMgQSBob29rIGZ1bmN0aW9uIHRoYXQgY2FuIGJlIGV4cG9ydGVkIGFzIHRoZSBkZWZhdWx0IGV4cG9ydFxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGltcG9ydCB7IHVzZXJQcm9tcHRTdWJtaXRIb29rLCB1c2VyUHJvbXB0U3VibWl0T3V0cHV0IH0gZnJvbSAnQGdvb2Rmb290L2NsYXVkZS1jb2RlLWhvb2tzJztcbiAqXG4gKiAvLyBBZGQgcHJvamVjdCBjb250ZXh0IHRvIGV2ZXJ5IHByb21wdFxuICogZXhwb3J0IGRlZmF1bHQgdXNlclByb21wdFN1Ym1pdEhvb2soe30sIGFzeW5jIChpbnB1dCwgeyBsb2dnZXIgfSkgPT4ge1xuICogICBsb2dnZXIuZGVidWcoJ1VzZXIgcHJvbXB0IHN1Ym1pdHRlZCcsIHsgcHJvbXB0TGVuZ3RoOiBpbnB1dC5wcm9tcHQubGVuZ3RoIH0pO1xuICpcbiAqICAgY29uc3QgcHJvamVjdENvbnRleHQgPSBhd2FpdCBnZXRQcm9qZWN0Q29udGV4dCgpO1xuICpcbiAqICAgcmV0dXJuIHVzZXJQcm9tcHRTdWJtaXRPdXRwdXQoe1xuICogICAgIGFkZGl0aW9uYWxDb250ZXh0OiBwcm9qZWN0Q29udGV4dFxuICogICB9KTtcbiAqIH0pO1xuICogYGBgXG4gKiBAc2VlIGh0dHBzOi8vY29kZS5jbGF1ZGUuY29tL2RvY3MvZW4vaG9va3MjdXNlcnByb21wdHN1Ym1pdFxuICovXG5leHBvcnQgZnVuY3Rpb24gdXNlclByb21wdFN1Ym1pdEhvb2soY29uZmlnLCBoYW5kbGVyKSB7XG4gICAgcmV0dXJuIGNyZWF0ZUhvb2tGdW5jdGlvbihcIlVzZXJQcm9tcHRTdWJtaXRcIiwgY29uZmlnLCBoYW5kbGVyKTtcbn1cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIFNlc3Npb25TdGFydCBIb29rIEZhY3Rvcnlcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8qKlxuICogQ3JlYXRlcyBhIFNlc3Npb25TdGFydCBob29rIGhhbmRsZXIuXG4gKlxuICogU2Vzc2lvblN0YXJ0IGhvb2tzIGZpcmUgd2hlbiBhIENsYXVkZSBDb2RlIHNlc3Npb24gc3RhcnRzIG9yIHJlc3RhcnRzLFxuICogYWxsb3dpbmcgeW91IHRvOlxuICogLSBJbml0aWFsaXplIHNlc3Npb24gc3RhdGVcbiAqIC0gSW5qZWN0IGNvbnRleHQgb3IgaW5zdHJ1Y3Rpb25zXG4gKiAtIFBlcnNpc3QgZW52aXJvbm1lbnQgdmFyaWFibGVzIGZvciBzdWJzZXF1ZW50IGJhc2ggY29tbWFuZHNcbiAqIC0gU2V0IHVwIGxvZ2dpbmcgb3IgbW9uaXRvcmluZ1xuICpcbiAqICoqTWF0Y2hlcioqOiBNYXRjaGVzIGFnYWluc3QgYHNvdXJjZWAgKCdzdGFydHVwJywgJ3Jlc3VtZScsICdjbGVhcicsICdjb21wYWN0JylcbiAqXG4gKiAqKkNvbnRleHQqKjogU2Vzc2lvblN0YXJ0IGhvb2tzIHJlY2VpdmUgYW4gZXh0ZW5kZWQgY29udGV4dCB3aXRoIGBwZXJzaXN0RW52VmFyYFxuICogYW5kIGBwZXJzaXN0RW52VmFyc2AgZnVuY3Rpb25zIGZvciBzZXR0aW5nIGVudmlyb25tZW50IHZhcmlhYmxlcy5cbiAqIEBwYXJhbSBjb25maWcgLSBIb29rIGNvbmZpZ3VyYXRpb24gd2l0aCBvcHRpb25hbCBtYXRjaGVyIGFuZCB0aW1lb3V0XG4gKiBAcGFyYW0gaGFuZGxlciAtIFRoZSBoYW5kbGVyIGZ1bmN0aW9uIHRvIGV4ZWN1dGVcbiAqIEByZXR1cm5zIEEgaG9vayBmdW5jdGlvbiB0aGF0IGNhbiBiZSBleHBvcnRlZCBhcyB0aGUgZGVmYXVsdCBleHBvcnRcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBpbXBvcnQgeyBzZXNzaW9uU3RhcnRIb29rLCBzZXNzaW9uU3RhcnRPdXRwdXQgfSBmcm9tICdAZ29vZGZvb3QvY2xhdWRlLWNvZGUtaG9va3MnO1xuICpcbiAqIC8vIFBlcnNpc3QgZW52aXJvbm1lbnQgdmFyaWFibGVzIGZvciB0aGUgc2Vzc2lvblxuICogZXhwb3J0IGRlZmF1bHQgc2Vzc2lvblN0YXJ0SG9vayh7IG1hdGNoZXI6ICdzdGFydHVwJyB9LCBhc3luYyAoaW5wdXQsIHsgbG9nZ2VyLCBwZXJzaXN0RW52VmFyIH0pID0+IHtcbiAqICAgbG9nZ2VyLmluZm8oJ05ldyBzZXNzaW9uIHN0YXJ0ZWQnLCB7XG4gKiAgICAgc2Vzc2lvbklkOiBpbnB1dC5zZXNzaW9uX2lkLFxuICogICAgIGN3ZDogaW5wdXQuY3dkXG4gKiAgIH0pO1xuICpcbiAqICAgLy8gU2V0IGVudmlyb25tZW50IHZhcmlhYmxlcyBmb3IgYWxsIHN1YnNlcXVlbnQgYmFzaCBjb21tYW5kc1xuICogICBwZXJzaXN0RW52VmFyKCdOT0RFX0VOVicsICdkZXZlbG9wbWVudCcpO1xuICogICBwZXJzaXN0RW52VmFyKCdERUJVRycsICd0cnVlJyk7XG4gKlxuICogICByZXR1cm4gc2Vzc2lvblN0YXJ0T3V0cHV0KHt9KTtcbiAqIH0pO1xuICogYGBgXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogLy8gU2V0IG11bHRpcGxlIGVudmlyb25tZW50IHZhcmlhYmxlcyBhdCBvbmNlXG4gKiBleHBvcnQgZGVmYXVsdCBzZXNzaW9uU3RhcnRIb29rKHt9LCBhc3luYyAoaW5wdXQsIHsgcGVyc2lzdEVudlZhcnMgfSkgPT4ge1xuICogICBwZXJzaXN0RW52VmFycyh7XG4gKiAgICAgTk9ERV9FTlY6ICdwcm9kdWN0aW9uJyxcbiAqICAgICBBUElfS0VZOiAnc2VjcmV0JyxcbiAqICAgICBERUJVRzogJ2ZhbHNlJ1xuICogICB9KTtcbiAqXG4gKiAgIHJldHVybiBzZXNzaW9uU3RhcnRPdXRwdXQoe30pO1xuICogfSk7XG4gKiBgYGBcbiAqIEBzZWUgaHR0cHM6Ly9jb2RlLmNsYXVkZS5jb20vZG9jcy9lbi9ob29rcyNzZXNzaW9uc3RhcnRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHNlc3Npb25TdGFydEhvb2soY29uZmlnLCBoYW5kbGVyKSB7XG4gICAgcmV0dXJuIGNyZWF0ZUhvb2tGdW5jdGlvbihcIlNlc3Npb25TdGFydFwiLCBjb25maWcsIGhhbmRsZXIpO1xufVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gU2Vzc2lvbkVuZCBIb29rIEZhY3Rvcnlcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8qKlxuICogQ3JlYXRlcyBhIFNlc3Npb25FbmQgaG9vayBoYW5kbGVyLlxuICpcbiAqIFNlc3Npb25FbmQgaG9va3MgZmlyZSB3aGVuIGEgQ2xhdWRlIENvZGUgc2Vzc2lvbiBlbmRzLCBhbGxvd2luZyB5b3UgdG86XG4gKiAtIENsZWFuIHVwIHNlc3Npb24gcmVzb3VyY2VzXG4gKiAtIExvZyBzZXNzaW9uIG1ldHJpY3NcbiAqIC0gUGVyc2lzdCBzZXNzaW9uIHN0YXRlXG4gKlxuICogKipNYXRjaGVyKio6IE1hdGNoZXMgYWdhaW5zdCBgcmVhc29uYCAodGhlIGV4aXQgcmVhc29uIHN0cmluZylcbiAqIEBwYXJhbSBjb25maWcgLSBIb29rIGNvbmZpZ3VyYXRpb24gd2l0aCBvcHRpb25hbCBtYXRjaGVyIGFuZCB0aW1lb3V0XG4gKiBAcGFyYW0gaGFuZGxlciAtIFRoZSBoYW5kbGVyIGZ1bmN0aW9uIHRvIGV4ZWN1dGVcbiAqIEByZXR1cm5zIEEgaG9vayBmdW5jdGlvbiB0aGF0IGNhbiBiZSBleHBvcnRlZCBhcyB0aGUgZGVmYXVsdCBleHBvcnRcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBpbXBvcnQgeyBzZXNzaW9uRW5kSG9vaywgc2Vzc2lvbkVuZE91dHB1dCB9IGZyb20gJ0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcyc7XG4gKlxuICogLy8gTG9nIHNlc3Npb24gZW5kIGFuZCBjbGVhbiB1cFxuICogZXhwb3J0IGRlZmF1bHQgc2Vzc2lvbkVuZEhvb2soe30sIGFzeW5jIChpbnB1dCwgeyBsb2dnZXIgfSkgPT4ge1xuICogICBsb2dnZXIuaW5mbygnU2Vzc2lvbiBlbmRlZCcsIHtcbiAqICAgICBzZXNzaW9uSWQ6IGlucHV0LnNlc3Npb25faWQsXG4gKiAgICAgcmVhc29uOiBpbnB1dC5yZWFzb25cbiAqICAgfSk7XG4gKlxuICogICBhd2FpdCBjbGVhbnVwU2Vzc2lvblJlc291cmNlcyhpbnB1dC5zZXNzaW9uX2lkKTtcbiAqXG4gKiAgIHJldHVybiBzZXNzaW9uRW5kT3V0cHV0KHt9KTtcbiAqIH0pO1xuICogYGBgXG4gKiBAc2VlIGh0dHBzOi8vY29kZS5jbGF1ZGUuY29tL2RvY3MvZW4vaG9va3Mjc2Vzc2lvbmVuZFxuICovXG5leHBvcnQgZnVuY3Rpb24gc2Vzc2lvbkVuZEhvb2soY29uZmlnLCBoYW5kbGVyKSB7XG4gICAgcmV0dXJuIGNyZWF0ZUhvb2tGdW5jdGlvbihcIlNlc3Npb25FbmRcIiwgY29uZmlnLCBoYW5kbGVyKTtcbn1cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIFN0b3AgSG9vayBGYWN0b3J5XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vKipcbiAqIENyZWF0ZXMgYSBTdG9wIGhvb2sgaGFuZGxlci5cbiAqXG4gKiBTdG9wIGhvb2tzIGZpcmUgd2hlbiBDbGF1ZGUgQ29kZSBpcyBhYm91dCB0byBzdG9wLCBhbGxvd2luZyB5b3UgdG86XG4gKiAtIEJsb2NrIHRoZSBzdG9wIGFuZCByZXF1aXJlIGFkZGl0aW9uYWwgYWN0aW9uXG4gKiAtIENvbmZpcm0gdGhlIHVzZXIgd2FudHMgdG8gc3RvcFxuICogLSBDbGVhbiB1cCByZXNvdXJjZXMgYmVmb3JlIHN0b3BwaW5nXG4gKlxuICogKipNYXRjaGVyKio6IE5vIG1hdGNoZXIgc3VwcG9ydCAtIGZpcmVzIG9uIGFsbCBzdG9wIGV2ZW50c1xuICogQHBhcmFtIGNvbmZpZyAtIEhvb2sgY29uZmlndXJhdGlvbiB3aXRoIG9wdGlvbmFsIHRpbWVvdXQgKG1hdGNoZXIgaXMgaWdub3JlZClcbiAqIEBwYXJhbSBoYW5kbGVyIC0gVGhlIGhhbmRsZXIgZnVuY3Rpb24gdG8gZXhlY3V0ZVxuICogQHJldHVybnMgQSBob29rIGZ1bmN0aW9uIHRoYXQgY2FuIGJlIGV4cG9ydGVkIGFzIHRoZSBkZWZhdWx0IGV4cG9ydFxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGltcG9ydCB7IHN0b3BIb29rLCBzdG9wT3V0cHV0IH0gZnJvbSAnQGdvb2Rmb290L2NsYXVkZS1jb2RlLWhvb2tzJztcbiAqXG4gKiAvLyBCbG9jayBzdG9wIGlmIHRoZXJlIGFyZSBwZW5kaW5nIGNoYW5nZXNcbiAqIGV4cG9ydCBkZWZhdWx0IHN0b3BIb29rKHt9LCBhc3luYyAoaW5wdXQsIHsgbG9nZ2VyIH0pID0+IHtcbiAqICAgY29uc3QgcGVuZGluZ0NoYW5nZXMgPSBhd2FpdCBjaGVja1BlbmRpbmdDaGFuZ2VzKCk7XG4gKlxuICogICBpZiAocGVuZGluZ0NoYW5nZXMubGVuZ3RoID4gMCkge1xuICogICAgIGxvZ2dlci53YXJuKCdCbG9ja2luZyBzdG9wIGR1ZSB0byBwZW5kaW5nIGNoYW5nZXMnLCB7XG4gKiAgICAgICBjb3VudDogcGVuZGluZ0NoYW5nZXMubGVuZ3RoXG4gKiAgICAgfSk7XG4gKlxuICogICAgIHJldHVybiBzdG9wT3V0cHV0KHtcbiAqICAgICAgIGRlY2lzaW9uOiAnYmxvY2snLFxuICogICAgICAgcmVhc29uOiBgVGhlcmUgYXJlICR7cGVuZGluZ0NoYW5nZXMubGVuZ3RofSB1bmNvbW1pdHRlZCBjaGFuZ2VzYCxcbiAqICAgICAgIHN5c3RlbU1lc3NhZ2U6ICdQbGVhc2UgY29tbWl0IG9yIGRpc2NhcmQgY2hhbmdlcyBiZWZvcmUgc3RvcHBpbmcnXG4gKiAgICAgfSk7XG4gKiAgIH1cbiAqXG4gKiAgIGxvZ2dlci5pbmZvKCdBcHByb3Zpbmcgc3RvcCcpO1xuICogICByZXR1cm4gc3RvcE91dHB1dCh7IGRlY2lzaW9uOiAnYXBwcm92ZScgfSk7XG4gKiB9KTtcbiAqIGBgYFxuICogQHNlZSBodHRwczovL2NvZGUuY2xhdWRlLmNvbS9kb2NzL2VuL2hvb2tzI3N0b3BcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHN0b3BIb29rKGNvbmZpZywgaGFuZGxlcikge1xuICAgIHJldHVybiBjcmVhdGVIb29rRnVuY3Rpb24oXCJTdG9wXCIsIGNvbmZpZywgaGFuZGxlcik7XG59XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBTdWJhZ2VudFN0YXJ0IEhvb2sgRmFjdG9yeVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLyoqXG4gKiBDcmVhdGVzIGEgU3ViYWdlbnRTdGFydCBob29rIGhhbmRsZXIuXG4gKlxuICogU3ViYWdlbnRTdGFydCBob29rcyBmaXJlIHdoZW4gYSBzdWJhZ2VudCAoVGFzayB0b29sKSBzdGFydHMsIGFsbG93aW5nIHlvdSB0bzpcbiAqIC0gSW5qZWN0IGNvbnRleHQgZm9yIHRoZSBzdWJhZ2VudFxuICogLSBMb2cgc3ViYWdlbnQgaW52b2NhdGlvbnNcbiAqIC0gQ29uZmlndXJlIHN1YmFnZW50IGJlaGF2aW9yXG4gKlxuICogKipNYXRjaGVyKio6IE1hdGNoZXMgYWdhaW5zdCBgYWdlbnRfdHlwZWAgKGUuZy4sICdleHBsb3JlJywgJ2NvZGViYXNlLWFuYWx5c2lzJylcbiAqIEBwYXJhbSBjb25maWcgLSBIb29rIGNvbmZpZ3VyYXRpb24gd2l0aCBvcHRpb25hbCBtYXRjaGVyIGFuZCB0aW1lb3V0XG4gKiBAcGFyYW0gaGFuZGxlciAtIFRoZSBoYW5kbGVyIGZ1bmN0aW9uIHRvIGV4ZWN1dGVcbiAqIEByZXR1cm5zIEEgaG9vayBmdW5jdGlvbiB0aGF0IGNhbiBiZSBleHBvcnRlZCBhcyB0aGUgZGVmYXVsdCBleHBvcnRcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBpbXBvcnQgeyBzdWJhZ2VudFN0YXJ0SG9vaywgc3ViYWdlbnRTdGFydE91dHB1dCB9IGZyb20gJ0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcyc7XG4gKlxuICogLy8gQWRkIGNvbnRleHQgZm9yIGV4cGxvcmUgc3ViYWdlbnRzXG4gKiBleHBvcnQgZGVmYXVsdCBzdWJhZ2VudFN0YXJ0SG9vayh7IG1hdGNoZXI6ICdleHBsb3JlJyB9LCBhc3luYyAoaW5wdXQsIHsgbG9nZ2VyIH0pID0+IHtcbiAqICAgbG9nZ2VyLmluZm8oJ0V4cGxvcmUgc3ViYWdlbnQgc3RhcnRpbmcnLCB7XG4gKiAgICAgYWdlbnRJZDogaW5wdXQuYWdlbnRfaWQsXG4gKiAgICAgYWdlbnRUeXBlOiBpbnB1dC5hZ2VudF90eXBlXG4gKiAgIH0pO1xuICpcbiAqICAgcmV0dXJuIHN1YmFnZW50U3RhcnRPdXRwdXQoe1xuICogICAgIGFkZGl0aW9uYWxDb250ZXh0OiAnRm9jdXMgb24gZmluZGluZyBwYXR0ZXJucyBhbmQgY29udmVudGlvbnMnXG4gKiAgIH0pO1xuICogfSk7XG4gKiBgYGBcbiAqIEBzZWUgaHR0cHM6Ly9jb2RlLmNsYXVkZS5jb20vZG9jcy9lbi9ob29rcyNzdWJhZ2VudHN0YXJ0XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzdWJhZ2VudFN0YXJ0SG9vayhjb25maWcsIGhhbmRsZXIpIHtcbiAgICByZXR1cm4gY3JlYXRlSG9va0Z1bmN0aW9uKFwiU3ViYWdlbnRTdGFydFwiLCBjb25maWcsIGhhbmRsZXIpO1xufVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gU3ViYWdlbnRTdG9wIEhvb2sgRmFjdG9yeVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLyoqXG4gKiBDcmVhdGVzIGEgU3ViYWdlbnRTdG9wIGhvb2sgaGFuZGxlci5cbiAqXG4gKiBTdWJhZ2VudFN0b3AgaG9va3MgZmlyZSB3aGVuIGEgc3ViYWdlbnQgY29tcGxldGVzIG9yIHN0b3BzLCBhbGxvd2luZyB5b3UgdG86XG4gKiAtIEJsb2NrIHRoZSBzdWJhZ2VudCBmcm9tIHN0b3BwaW5nXG4gKiAtIFByb2Nlc3Mgc3ViYWdlbnQgcmVzdWx0c1xuICogLSBDbGVhbiB1cCBzdWJhZ2VudCByZXNvdXJjZXNcbiAqIC0gTG9nIHN1YmFnZW50IGNvbXBsZXRpb25cbiAqXG4gKiAqKk1hdGNoZXIqKjogTWF0Y2hlcyBhZ2FpbnN0IGBhZ2VudF90eXBlYCAoZS5nLiwgJ2V4cGxvcmUnLCAnY29kZWJhc2UtYW5hbHlzaXMnKVxuICogQHBhcmFtIGNvbmZpZyAtIEhvb2sgY29uZmlndXJhdGlvbiB3aXRoIG9wdGlvbmFsIG1hdGNoZXIgYW5kIHRpbWVvdXRcbiAqIEBwYXJhbSBoYW5kbGVyIC0gVGhlIGhhbmRsZXIgZnVuY3Rpb24gdG8gZXhlY3V0ZVxuICogQHJldHVybnMgQSBob29rIGZ1bmN0aW9uIHRoYXQgY2FuIGJlIGV4cG9ydGVkIGFzIHRoZSBkZWZhdWx0IGV4cG9ydFxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGltcG9ydCB7IHN1YmFnZW50U3RvcEhvb2ssIHN1YmFnZW50U3RvcE91dHB1dCB9IGZyb20gJ0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcyc7XG4gKlxuICogLy8gQmxvY2sgZXhwbG9yZSBzdWJhZ2VudHMgaWYgdGFzayBpbmNvbXBsZXRlXG4gKiBleHBvcnQgZGVmYXVsdCBzdWJhZ2VudFN0b3BIb29rKHsgbWF0Y2hlcjogJ2V4cGxvcmUnIH0sIGFzeW5jIChpbnB1dCwgeyBsb2dnZXIgfSkgPT4ge1xuICogICBsb2dnZXIuaW5mbygnU3ViYWdlbnQgc3RvcHBpbmcnLCB7XG4gKiAgICAgYWdlbnRJZDogaW5wdXQuYWdlbnRfaWQsXG4gKiAgICAgYWdlbnRUeXBlOiBpbnB1dC5hZ2VudF90eXBlXG4gKiAgIH0pO1xuICpcbiAqICAgLy8gQmxvY2sgaWYgdHJhbnNjcmlwdCBzaG93cyBpbmNvbXBsZXRlIHdvcmtcbiAqICAgcmV0dXJuIHN1YmFnZW50U3RvcE91dHB1dCh7XG4gKiAgICAgZGVjaXNpb246ICdibG9jaycsXG4gKiAgICAgcmVhc29uOiAnUGxlYXNlIHZlcmlmeSBleHBsb3JhdGlvbiBpcyBjb21wbGV0ZSdcbiAqICAgfSk7XG4gKiB9KTtcbiAqIGBgYFxuICogQHNlZSBodHRwczovL2NvZGUuY2xhdWRlLmNvbS9kb2NzL2VuL2hvb2tzI3N1YmFnZW50c3RvcFxuICovXG5leHBvcnQgZnVuY3Rpb24gc3ViYWdlbnRTdG9wSG9vayhjb25maWcsIGhhbmRsZXIpIHtcbiAgICByZXR1cm4gY3JlYXRlSG9va0Z1bmN0aW9uKFwiU3ViYWdlbnRTdG9wXCIsIGNvbmZpZywgaGFuZGxlcik7XG59XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBQcmVDb21wYWN0IEhvb2sgRmFjdG9yeVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLyoqXG4gKiBDcmVhdGVzIGEgUHJlQ29tcGFjdCBob29rIGhhbmRsZXIuXG4gKlxuICogUHJlQ29tcGFjdCBob29rcyBmaXJlIGJlZm9yZSBjb250ZXh0IGNvbXBhY3Rpb24gb2NjdXJzLCBhbGxvd2luZyB5b3UgdG86XG4gKiAtIFByZXNlcnZlIGltcG9ydGFudCBpbmZvcm1hdGlvbiBiZWZvcmUgY29tcGFjdGlvblxuICogLSBMb2cgY29tcGFjdGlvbiBldmVudHNcbiAqIC0gTW9kaWZ5IGN1c3RvbSBpbnN0cnVjdGlvbnMgZm9yIHRoZSBjb21wYWN0ZWQgY29udGV4dFxuICpcbiAqICoqTWF0Y2hlcioqOiBNYXRjaGVzIGFnYWluc3QgYHRyaWdnZXJgICgnbWFudWFsJywgJ2F1dG8nKVxuICogQHBhcmFtIGNvbmZpZyAtIEhvb2sgY29uZmlndXJhdGlvbiB3aXRoIG9wdGlvbmFsIG1hdGNoZXIgYW5kIHRpbWVvdXRcbiAqIEBwYXJhbSBoYW5kbGVyIC0gVGhlIGhhbmRsZXIgZnVuY3Rpb24gdG8gZXhlY3V0ZVxuICogQHJldHVybnMgQSBob29rIGZ1bmN0aW9uIHRoYXQgY2FuIGJlIGV4cG9ydGVkIGFzIHRoZSBkZWZhdWx0IGV4cG9ydFxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGltcG9ydCB7IHByZUNvbXBhY3RIb29rLCBwcmVDb21wYWN0T3V0cHV0IH0gZnJvbSAnQGdvb2Rmb290L2NsYXVkZS1jb2RlLWhvb2tzJztcbiAqXG4gKiAvLyBMb2cgY29tcGFjdGlvbiBldmVudHMgYW5kIHByZXNlcnZlIGNvbnRleHRcbiAqIGV4cG9ydCBkZWZhdWx0IHByZUNvbXBhY3RIb29rKHt9LCBhc3luYyAoaW5wdXQsIHsgbG9nZ2VyIH0pID0+IHtcbiAqICAgbG9nZ2VyLmluZm8oJ0NvbnRleHQgY29tcGFjdGlvbiB0cmlnZ2VyZWQnLCB7XG4gKiAgICAgdHJpZ2dlcjogaW5wdXQudHJpZ2dlcixcbiAqICAgICBoYXNDdXN0b21JbnN0cnVjdGlvbnM6IGlucHV0LmN1c3RvbV9pbnN0cnVjdGlvbnMgIT09IG51bGxcbiAqICAgfSk7XG4gKlxuICogICByZXR1cm4gcHJlQ29tcGFjdE91dHB1dCh7XG4gKiAgICAgc3lzdGVtTWVzc2FnZTogJ1JlbWVtYmVyOiBzdHJpY3QgbW9kZSBpcyBlbmFibGVkJ1xuICogICB9KTtcbiAqIH0pO1xuICogYGBgXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogLy8gT25seSBoYW5kbGUgbWFudWFsIGNvbXBhY3Rpb25cbiAqIGV4cG9ydCBkZWZhdWx0IHByZUNvbXBhY3RIb29rKHsgbWF0Y2hlcjogJ21hbnVhbCcgfSwgYXN5bmMgKGlucHV0LCB7IGxvZ2dlciB9KSA9PiB7XG4gKiAgIGxvZ2dlci5pbmZvKCdNYW51YWwgY29tcGFjdGlvbiByZXF1ZXN0ZWQnKTtcbiAqICAgcmV0dXJuIHByZUNvbXBhY3RPdXRwdXQoe30pO1xuICogfSk7XG4gKiBgYGBcbiAqIEBzZWUgaHR0cHM6Ly9jb2RlLmNsYXVkZS5jb20vZG9jcy9lbi9ob29rcyNwcmVjb21wYWN0XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBwcmVDb21wYWN0SG9vayhjb25maWcsIGhhbmRsZXIpIHtcbiAgICByZXR1cm4gY3JlYXRlSG9va0Z1bmN0aW9uKFwiUHJlQ29tcGFjdFwiLCBjb25maWcsIGhhbmRsZXIpO1xufVxuLyoqIEBpbmhlcml0ZG9jICovXG5leHBvcnQgZnVuY3Rpb24gcGVybWlzc2lvblJlcXVlc3RIb29rKGNvbmZpZywgaGFuZGxlcikge1xuICAgIHJldHVybiBjcmVhdGVIb29rRnVuY3Rpb24oXCJQZXJtaXNzaW9uUmVxdWVzdFwiLCBjb25maWcsIGhhbmRsZXIpO1xufVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gU2V0dXAgSG9vayBGYWN0b3J5XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vKipcbiAqIENyZWF0ZXMgYSBTZXR1cCBob29rIGhhbmRsZXIuXG4gKlxuICogU2V0dXAgaG9va3MgZmlyZSBkdXJpbmcgaW5pdGlhbGl6YXRpb24gb3IgbWFpbnRlbmFuY2UsIGFsbG93aW5nIHlvdSB0bzpcbiAqIC0gQ29uZmlndXJlIGluaXRpYWwgc2Vzc2lvbiBzdGF0ZVxuICogLSBQZXJmb3JtIHNldHVwIHRhc2tzIGJlZm9yZSB0aGUgc2Vzc2lvbiBzdGFydHNcbiAqIC0gQWRkIGNvbnRleHQgZm9yIG1haW50ZW5hbmNlIG9wZXJhdGlvbnNcbiAqXG4gKiAqKk1hdGNoZXIqKjogTWF0Y2hlcyBhZ2FpbnN0IGB0cmlnZ2VyYCAoJ2luaXQnIG9yICdtYWludGVuYW5jZScpXG4gKiBAcGFyYW0gY29uZmlnIC0gSG9vayBjb25maWd1cmF0aW9uIHdpdGggb3B0aW9uYWwgbWF0Y2hlciBhbmQgdGltZW91dFxuICogQHBhcmFtIGhhbmRsZXIgLSBUaGUgaGFuZGxlciBmdW5jdGlvbiB0byBleGVjdXRlXG4gKiBAcmV0dXJucyBBIGhvb2sgZnVuY3Rpb24gdGhhdCBjYW4gYmUgZXhwb3J0ZWQgYXMgdGhlIGRlZmF1bHQgZXhwb3J0XG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogaW1wb3J0IHsgc2V0dXBIb29rLCBzZXR1cE91dHB1dCB9IGZyb20gJ0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcyc7XG4gKlxuICogLy8gSGFuZGxlIGFsbCBzZXR1cCBldmVudHNcbiAqIGV4cG9ydCBkZWZhdWx0IHNldHVwSG9vayh7fSwgYXN5bmMgKGlucHV0LCB7IGxvZ2dlciB9KSA9PiB7XG4gKiAgIGxvZ2dlci5pbmZvKCdTZXR1cCB0cmlnZ2VyZWQnLCB7IHRyaWdnZXI6IGlucHV0LnRyaWdnZXIgfSk7XG4gKiAgIHJldHVybiBzZXR1cE91dHB1dCh7fSk7XG4gKiB9KTtcbiAqXG4gKiAvLyBPbmx5IGhhbmRsZSBpbml0aWFsaXphdGlvblxuICogZXhwb3J0IGRlZmF1bHQgc2V0dXBIb29rKHsgbWF0Y2hlcjogJ2luaXQnIH0sIGFzeW5jIChpbnB1dCwgeyBsb2dnZXIgfSkgPT4ge1xuICogICBsb2dnZXIuaW5mbygnSW5pdGlhbGl6aW5nIHNlc3Npb24nKTtcbiAqICAgcmV0dXJuIHNldHVwT3V0cHV0KHtcbiAqICAgICBob29rU3BlY2lmaWNPdXRwdXQ6IHtcbiAqICAgICAgIGFkZGl0aW9uYWxDb250ZXh0OiAnU2Vzc2lvbiBpbml0aWFsaXplZCB3aXRoIGN1c3RvbSBjb25maWd1cmF0aW9uJ1xuICogICAgIH1cbiAqICAgfSk7XG4gKiB9KTtcbiAqIGBgYFxuICogQHNlZSBodHRwczovL2NvZGUuY2xhdWRlLmNvbS9kb2NzL2VuL2hvb2tzI3NldHVwXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzZXR1cEhvb2soY29uZmlnLCBoYW5kbGVyKSB7XG4gICAgcmV0dXJuIGNyZWF0ZUhvb2tGdW5jdGlvbihcIlNldHVwXCIsIGNvbmZpZywgaGFuZGxlcik7XG59XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBUZWFtbWF0ZUlkbGUgSG9vayBGYWN0b3J5XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vKipcbiAqIENyZWF0ZXMgYSBUZWFtbWF0ZUlkbGUgaG9vayBoYW5kbGVyLlxuICpcbiAqIFRlYW1tYXRlSWRsZSBob29rcyBmaXJlIHdoZW4gYSB0ZWFtbWF0ZSBpbiBhIHRlYW0gaXMgYWJvdXQgdG8gZ28gaWRsZSxcbiAqIGFsbG93aW5nIHlvdSB0bzpcbiAqIC0gQXNzaWduIHdvcmsgdG8gaWRsZSB0ZWFtbWF0ZXNcbiAqIC0gTG9nIHRlYW0gYWN0aXZpdHlcbiAqIC0gQ29vcmRpbmF0ZSBtdWx0aS1hZ2VudCB3b3JrZmxvd3NcbiAqXG4gKiAqKk1hdGNoZXIqKjogTm8gbWF0Y2hlciBzdXBwb3J0IC0gZmlyZXMgb24gYWxsIHRlYW1tYXRlIGlkbGUgZXZlbnRzXG4gKiBAcGFyYW0gY29uZmlnIC0gSG9vayBjb25maWd1cmF0aW9uIHdpdGggb3B0aW9uYWwgdGltZW91dCAobWF0Y2hlciBpcyBpZ25vcmVkKVxuICogQHBhcmFtIGhhbmRsZXIgLSBUaGUgaGFuZGxlciBmdW5jdGlvbiB0byBleGVjdXRlXG4gKiBAcmV0dXJucyBBIGhvb2sgZnVuY3Rpb24gdGhhdCBjYW4gYmUgZXhwb3J0ZWQgYXMgdGhlIGRlZmF1bHQgZXhwb3J0XG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogaW1wb3J0IHsgdGVhbW1hdGVJZGxlSG9vaywgdGVhbW1hdGVJZGxlT3V0cHV0IH0gZnJvbSAnQGdvb2Rmb290L2NsYXVkZS1jb2RlLWhvb2tzJztcbiAqXG4gKiAvLyBMb2cgd2hlbiB0ZWFtbWF0ZXMgZ28gaWRsZVxuICogZXhwb3J0IGRlZmF1bHQgdGVhbW1hdGVJZGxlSG9vayh7fSwgYXN5bmMgKGlucHV0LCB7IGxvZ2dlciB9KSA9PiB7XG4gKiAgIGxvZ2dlci5pbmZvKCdUZWFtbWF0ZSBnb2luZyBpZGxlJywge1xuICogICAgIHRlYW1tYXRlTmFtZTogaW5wdXQudGVhbW1hdGVfbmFtZSxcbiAqICAgICB0ZWFtTmFtZTogaW5wdXQudGVhbV9uYW1lXG4gKiAgIH0pO1xuICpcbiAqICAgcmV0dXJuIHRlYW1tYXRlSWRsZU91dHB1dCh7fSk7XG4gKiB9KTtcbiAqIGBgYFxuICogQHNlZSBodHRwczovL2NvZGUuY2xhdWRlLmNvbS9kb2NzL2VuL2hvb2tzI3RlYW1tYXRlaWRsZVxuICovXG5leHBvcnQgZnVuY3Rpb24gdGVhbW1hdGVJZGxlSG9vayhjb25maWcsIGhhbmRsZXIpIHtcbiAgICByZXR1cm4gY3JlYXRlSG9va0Z1bmN0aW9uKFwiVGVhbW1hdGVJZGxlXCIsIGNvbmZpZywgaGFuZGxlcik7XG59XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBUYXNrQ29tcGxldGVkIEhvb2sgRmFjdG9yeVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLyoqXG4gKiBDcmVhdGVzIGEgVGFza0NvbXBsZXRlZCBob29rIGhhbmRsZXIuXG4gKlxuICogVGFza0NvbXBsZXRlZCBob29rcyBmaXJlIHdoZW4gYSB0YXNrIGlzIGJlaW5nIG1hcmtlZCBhcyBjb21wbGV0ZWQsXG4gKiBhbGxvd2luZyB5b3UgdG86XG4gKiAtIFZlcmlmeSB0YXNrIGNvbXBsZXRpb25cbiAqIC0gTG9nIHRhc2sgbWV0cmljc1xuICogLSBUcmlnZ2VyIGZvbGxvdy11cCBhY3Rpb25zXG4gKlxuICogKipNYXRjaGVyKio6IE5vIG1hdGNoZXIgc3VwcG9ydCAtIGZpcmVzIG9uIGFsbCB0YXNrIGNvbXBsZXRpb24gZXZlbnRzXG4gKiBAcGFyYW0gY29uZmlnIC0gSG9vayBjb25maWd1cmF0aW9uIHdpdGggb3B0aW9uYWwgdGltZW91dCAobWF0Y2hlciBpcyBpZ25vcmVkKVxuICogQHBhcmFtIGhhbmRsZXIgLSBUaGUgaGFuZGxlciBmdW5jdGlvbiB0byBleGVjdXRlXG4gKiBAcmV0dXJucyBBIGhvb2sgZnVuY3Rpb24gdGhhdCBjYW4gYmUgZXhwb3J0ZWQgYXMgdGhlIGRlZmF1bHQgZXhwb3J0XG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogaW1wb3J0IHsgdGFza0NvbXBsZXRlZEhvb2ssIHRhc2tDb21wbGV0ZWRPdXRwdXQgfSBmcm9tICdAZ29vZGZvb3QvY2xhdWRlLWNvZGUtaG9va3MnO1xuICpcbiAqIC8vIExvZyB0YXNrIGNvbXBsZXRpb25cbiAqIGV4cG9ydCBkZWZhdWx0IHRhc2tDb21wbGV0ZWRIb29rKHt9LCBhc3luYyAoaW5wdXQsIHsgbG9nZ2VyIH0pID0+IHtcbiAqICAgbG9nZ2VyLmluZm8oJ1Rhc2sgY29tcGxldGVkJywge1xuICogICAgIHRhc2tJZDogaW5wdXQudGFza19pZCxcbiAqICAgICB0YXNrU3ViamVjdDogaW5wdXQudGFza19zdWJqZWN0XG4gKiAgIH0pO1xuICpcbiAqICAgcmV0dXJuIHRhc2tDb21wbGV0ZWRPdXRwdXQoe30pO1xuICogfSk7XG4gKiBgYGBcbiAqIEBzZWUgaHR0cHM6Ly9jb2RlLmNsYXVkZS5jb20vZG9jcy9lbi9ob29rcyN0YXNrY29tcGxldGVkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB0YXNrQ29tcGxldGVkSG9vayhjb25maWcsIGhhbmRsZXIpIHtcbiAgICByZXR1cm4gY3JlYXRlSG9va0Z1bmN0aW9uKFwiVGFza0NvbXBsZXRlZFwiLCBjb25maWcsIGhhbmRsZXIpO1xufVxuIiwgIi8qKlxuICogTG9nZ2VyIHN5c3RlbSBmb3IgQ2xhdWRlIENvZGUgaG9va3MuXG4gKlxuICogUHJvdmlkZXMgc3RydWN0dXJlZCBsb2dnaW5nIHdpdGggZXZlbnQgc3Vic2NyaXB0aW9uIGFuZCBvcHRpb25hbCBmaWxlIG91dHB1dC5cbiAqIFRoZSBsb2dnZXIgaXMgKipzaWxlbnQgYnkgZGVmYXVsdCoqIHRvIGF2b2lkIGludGVyZmVyaW5nIHdpdGggaG9vayBwcm90b2NvbFxuICogKHN0ZG91dCBpcyByZXNlcnZlZCBmb3IgSlNPTiByZXNwb25zZXMsIHN0ZGVyciBtYXkgY29uZmxpY3Qgd2l0aCBDbGF1ZGUgQ29kZSkuXG4gKiBAbW9kdWxlXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogaW1wb3J0IHsgbG9nZ2VyIH0gZnJvbSAnQGdvb2Rmb290L2NsYXVkZS1jb2RlLWhvb2tzJztcbiAqXG4gKiAvLyBTdWJzY3JpYmUgdG8gbG9nIGV2ZW50c1xuICogY29uc3QgdW5zdWJzY3JpYmUgPSBsb2dnZXIub24oJ2Vycm9yJywgKGV2ZW50KSA9PiB7XG4gKiAgIGNvbnNvbGUuZXJyb3IoYEVycm9yIGluICR7ZXZlbnQuaG9va1R5cGV9OiAke2V2ZW50Lm1lc3NhZ2V9YCk7XG4gKiB9KTtcbiAqXG4gKiAvLyBMYXRlciwgY2xlYW4gdXBcbiAqIHVuc3Vic2NyaWJlKCk7XG4gKiBgYGBcbiAqIEBzZWUgaHR0cHM6Ly9jb2RlLmNsYXVkZS5jb20vZG9jcy9lbi9ob29rc1xuICovXG5pbXBvcnQgeyBjbG9zZVN5bmMsIGV4aXN0c1N5bmMsIG1rZGlyU3luYywgb3BlblN5bmMsIHdyaXRlU3luYyB9IGZyb20gXCJub2RlOmZzXCI7XG5pbXBvcnQgeyBkaXJuYW1lIH0gZnJvbSBcIm5vZGU6cGF0aFwiO1xuLyoqXG4gKiBBbGwgbG9nIGxldmVscyBpbiBvcmRlciBvZiBzZXZlcml0eSAobG93ZXN0IHRvIGhpZ2hlc3QpLlxuICovXG5leHBvcnQgY29uc3QgTE9HX0xFVkVMUyA9IFtcImRlYnVnXCIsIFwiaW5mb1wiLCBcIndhcm5cIiwgXCJlcnJvclwiXTtcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIExvZ2dlciBDbGFzc1xuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLyoqXG4gKiBMb2dnZXIgZm9yIENsYXVkZSBDb2RlIGhvb2tzIHdpdGggZXZlbnQgc3Vic2NyaXB0aW9uIGFuZCBmaWxlIG91dHB1dC5cbiAqXG4gKiAjIyBLZXkgQmVoYXZpb3JzXG4gKlxuICogfCBDb25maWd1cmF0aW9uIHwgQmVoYXZpb3IgfFxuICogfC0tLS0tLS0tLS0tLS0tfC0tLS0tLS0tLS18XG4gKiB8IE5vIGNvbmZpZyAoZGVmYXVsdCkgfCAqKlNpbGVudCoqIC0gbm8gb3V0cHV0IGFueXdoZXJlIHxcbiAqIHwgYENMQVVERV9DT0RFX0hPT0tTX0xPR19GSUxFYCBlbnYgdmFyIHwgQXBwZW5kIEpTT04gbGluZXMgdG8gZmlsZSB8XG4gKiB8IGAub24obGV2ZWwsIGhhbmRsZXIpYCByZWdpc3RlcmVkIHwgRXZlbnRzIGRlbGl2ZXJlZCB0byBoYW5kbGVycyBvbmx5IHxcbiAqIHwgTXVsdGlwbGUgZGVzdGluYXRpb25zIHwgQWxsIGRlc3RpbmF0aW9ucyByZWNlaXZlIGV2ZW50cyB8XG4gKlxuICogIyMgSW1wb3J0YW50IE5vdGVzXG4gKlxuICogLSAqKk5ldmVyIG91dHB1dHMgdG8gc3Rkb3V0KiogKHJlc2VydmVkIGZvciBKU09OIGhvb2sgcmVzcG9uc2UpXG4gKiAtICoqTmV2ZXIgb3V0cHV0cyB0byBzdGRlcnIqKiAobWF5IGludGVyZmVyZSB3aXRoIENsYXVkZSBDb2RlIGVycm9yIGhhbmRsaW5nKVxuICogLSBGaWxlIG91dHB1dCB1c2VzIEpTT04gTGluZXMgZm9ybWF0IGZvciBlYXN5IHBhcnNpbmdcbiAqIC0gYC5vbihsZXZlbCwgaGFuZGxlcilgIHJldHVybnMgYW4gdW5zdWJzY3JpYmUgZnVuY3Rpb25cbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBpbXBvcnQgeyBsb2dnZXIgfSBmcm9tICdAZ29vZGZvb3QvY2xhdWRlLWNvZGUtaG9va3MnO1xuICpcbiAqIC8vIFN1YnNjcmliZSB0byBldmVudHMgYXQgc3BlY2lmaWMgbGV2ZWxcbiAqIGxvZ2dlci5vbignd2FybicsIChldmVudCkgPT4ge1xuICogICBzZW5kQWxlcnQoZXZlbnQubWVzc2FnZSk7XG4gKiB9KTtcbiAqXG4gKiAvLyBMb2cgd2l0aGluIGEgaG9vayBoYW5kbGVyXG4gKiBleHBvcnQgZGVmYXVsdCBwcmVUb29sVXNlSG9vayh7IG1hdGNoZXI6ICdCYXNoJyB9LCBhc3luYyAoaW5wdXQsIHsgbG9nZ2VyIH0pID0+IHtcbiAqICAgbG9nZ2VyLndhcm4oJ0Fib3V0IHRvIHZhbGlkYXRlIEJhc2ggY29tbWFuZCcpO1xuICogICByZXR1cm4gcHJlVG9vbFVzZU91dHB1dCh7IGFsbG93OiB0cnVlIH0pO1xuICogfSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNsYXNzIExvZ2dlciB7XG4gICAgLyoqXG4gICAgICogUmVnaXN0ZXJlZCBldmVudCBoYW5kbGVycyBieSBsb2cgbGV2ZWwuXG4gICAgICovXG4gICAgaGFuZGxlcnMgPSBuZXcgTWFwKCk7XG4gICAgLyoqXG4gICAgICogRmlsZSBkZXNjcmlwdG9yIGZvciBsb2cgZmlsZSBvdXRwdXQuXG4gICAgICogTGF6aWx5IGluaXRpYWxpemVkIG9uIGZpcnN0IHdyaXRlLlxuICAgICAqL1xuICAgIGxvZ0ZpbGVGZCA9IG51bGw7XG4gICAgLyoqXG4gICAgICogUGF0aCB0byB0aGUgbG9nIGZpbGUsIGlmIGNvbmZpZ3VyZWQuXG4gICAgICovXG4gICAgbG9nRmlsZVBhdGggPSBudWxsO1xuICAgIC8qKlxuICAgICAqIFdoZXRoZXIgZmlsZSBpbml0aWFsaXphdGlvbiBoYXMgYmVlbiBhdHRlbXB0ZWQuXG4gICAgICovXG4gICAgZmlsZUluaXRpYWxpemVkID0gZmFsc2U7XG4gICAgLyoqXG4gICAgICogQ3VycmVudCBob29rIGNvbnRleHQgZm9yIGVucmljaGluZyBsb2cgZXZlbnRzLlxuICAgICAqL1xuICAgIGN1cnJlbnRIb29rVHlwZTtcbiAgICAvKipcbiAgICAgKiBDdXJyZW50IGhvb2sgaW5wdXQgZm9yIGVucmljaGluZyBsb2cgZXZlbnRzLlxuICAgICAqL1xuICAgIGN1cnJlbnRJbnB1dDtcbiAgICAvKipcbiAgICAgKiBDcmVhdGVzIGEgbmV3IExvZ2dlciBpbnN0YW5jZS5cbiAgICAgKlxuICAgICAqIFR5cGljYWxseSB5b3Ugc2hvdWxkIHVzZSB0aGUgZXhwb3J0ZWQgYGxvZ2dlcmAgc2luZ2xldG9uIHJhdGhlciB0aGFuXG4gICAgICogY3JlYXRpbmcgbmV3IGluc3RhbmNlcy5cbiAgICAgKiBAcGFyYW0gY29uZmlnIC0gT3B0aW9uYWwgY29uZmlndXJhdGlvblxuICAgICAqIEBleGFtcGxlXG4gICAgICogYGBgdHlwZXNjcmlwdFxuICAgICAqIC8vIFVzZSBzaW5nbGV0b24gKHJlY29tbWVuZGVkKVxuICAgICAqIGltcG9ydCB7IGxvZ2dlciB9IGZyb20gJ0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcyc7XG4gICAgICpcbiAgICAgKiAvLyBPciBjcmVhdGUgY3VzdG9tIGluc3RhbmNlXG4gICAgICogY29uc3QgY3VzdG9tTG9nZ2VyID0gbmV3IExvZ2dlcih7IGxvZ0ZpbGVQYXRoOiAnL3Zhci9sb2cvaG9va3MubG9nJyB9KTtcbiAgICAgKiBgYGBcbiAgICAgKi9cbiAgICBjb25zdHJ1Y3Rvcihjb25maWcgPSB7fSkge1xuICAgICAgICAvLyBJbml0aWFsaXplIGhhbmRsZXJzIG1hcCBmb3IgZWFjaCBsZXZlbFxuICAgICAgICBmb3IgKGNvbnN0IGxldmVsIG9mIExPR19MRVZFTFMpIHtcbiAgICAgICAgICAgIHRoaXMuaGFuZGxlcnMuc2V0KGxldmVsLCBuZXcgU2V0KCkpO1xuICAgICAgICB9XG4gICAgICAgIC8vIFNldCBsb2cgZmlsZSBwYXRoIGZyb20gY29uZmlnIG9yIGVudmlyb25tZW50XG4gICAgICAgIHRoaXMubG9nRmlsZVBhdGggPSBjb25maWcubG9nRmlsZVBhdGggPz8gcHJvY2Vzcy5lbnYuQ0xBVURFX0NPREVfSE9PS1NfTE9HX0ZJTEUgPz8gbnVsbDtcbiAgICB9XG4gICAgLyoqXG4gICAgICogTG9ncyBhIGRlYnVnIG1lc3NhZ2UuXG4gICAgICpcbiAgICAgKiBVc2UgZm9yIGRldGFpbGVkIGRlYnVnZ2luZyBpbmZvcm1hdGlvbiB0aGF0IGlzIHR5cGljYWxseSBvbmx5IHVzZWZ1bFxuICAgICAqIGR1cmluZyBkZXZlbG9wbWVudCBvciB0cm91Ymxlc2hvb3RpbmcuXG4gICAgICogQHBhcmFtIG1lc3NhZ2UgLSBUaGUgZGVidWcgbWVzc2FnZVxuICAgICAqIEBwYXJhbSBjb250ZXh0IC0gT3B0aW9uYWwgYWRkaXRpb25hbCBjb250ZXh0XG4gICAgICogQGV4YW1wbGVcbiAgICAgKiBgYGB0eXBlc2NyaXB0XG4gICAgICogbG9nZ2VyLmRlYnVnKCdQcm9jZXNzaW5nIHRvb2wgaW5wdXQnLCB7IHRvb2xOYW1lOiAnQmFzaCcsIGlucHV0U2l6ZTogMjU2IH0pO1xuICAgICAqIGBgYFxuICAgICAqL1xuICAgIGRlYnVnKG1lc3NhZ2UsIGNvbnRleHQpIHtcbiAgICAgICAgdGhpcy5lbWl0KFwiZGVidWdcIiwgbWVzc2FnZSwgY29udGV4dCk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIExvZ3MgYW4gaW5mbyBtZXNzYWdlLlxuICAgICAqXG4gICAgICogVXNlIGZvciBnZW5lcmFsIG9wZXJhdGlvbmFsIGV2ZW50cyBsaWtlIGhvb2sgaW52b2NhdGlvbnMsIHN1Y2Nlc3NmdWxcbiAgICAgKiBjb21wbGV0aW9ucywgb3Igc3RhdGUgY2hhbmdlcy5cbiAgICAgKiBAcGFyYW0gbWVzc2FnZSAtIFRoZSBpbmZvIG1lc3NhZ2VcbiAgICAgKiBAcGFyYW0gY29udGV4dCAtIE9wdGlvbmFsIGFkZGl0aW9uYWwgY29udGV4dFxuICAgICAqIEBleGFtcGxlXG4gICAgICogYGBgdHlwZXNjcmlwdFxuICAgICAqIGxvZ2dlci5pbmZvKCdTZXNzaW9uIHN0YXJ0ZWQnLCB7IHNvdXJjZTogJ3N0YXJ0dXAnLCBzZXNzaW9uSWQ6ICdhYmMxMjMnIH0pO1xuICAgICAqIGBgYFxuICAgICAqL1xuICAgIGluZm8obWVzc2FnZSwgY29udGV4dCkge1xuICAgICAgICB0aGlzLmVtaXQoXCJpbmZvXCIsIG1lc3NhZ2UsIGNvbnRleHQpO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBMb2dzIGEgd2FybmluZyBtZXNzYWdlLlxuICAgICAqXG4gICAgICogVXNlIGZvciBjb25kaXRpb25zIHRoYXQgbWF5IGluZGljYXRlIGlzc3VlcyBidXQgZG9uJ3QgcHJldmVudFxuICAgICAqIG9wZXJhdGlvbiwgc3VjaCBhcyBkZXByZWNhdGVkIHBhdHRlcm5zIG9yIHBlcmZvcm1hbmNlIGNvbmNlcm5zLlxuICAgICAqIEBwYXJhbSBtZXNzYWdlIC0gVGhlIHdhcm5pbmcgbWVzc2FnZVxuICAgICAqIEBwYXJhbSBjb250ZXh0IC0gT3B0aW9uYWwgYWRkaXRpb25hbCBjb250ZXh0XG4gICAgICogQGV4YW1wbGVcbiAgICAgKiBgYGB0eXBlc2NyaXB0XG4gICAgICogbG9nZ2VyLndhcm4oJ0RlcHJlY2F0ZWQgaG9vayBwYXR0ZXJuIGRldGVjdGVkJywgeyBwYXR0ZXJuOiAnbGVnYWN5TWF0Y2hlcicgfSk7XG4gICAgICogYGBgXG4gICAgICovXG4gICAgd2FybihtZXNzYWdlLCBjb250ZXh0KSB7XG4gICAgICAgIHRoaXMuZW1pdChcIndhcm5cIiwgbWVzc2FnZSwgY29udGV4dCk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIExvZ3MgYW4gZXJyb3IgbWVzc2FnZS5cbiAgICAgKlxuICAgICAqIFVzZSBmb3IgZXJyb3IgY29uZGl0aW9ucyB0aGF0IHJlcXVpcmUgYXR0ZW50aW9uIGJ1dCB3ZXJlIGhhbmRsZWRcbiAgICAgKiBncmFjZWZ1bGx5LiBGb3IgZXhjZXB0aW9ucywgcHJlZmVyIHtAbGluayBsb2dFcnJvcn0uXG4gICAgICogQHBhcmFtIG1lc3NhZ2UgLSBUaGUgZXJyb3IgbWVzc2FnZVxuICAgICAqIEBwYXJhbSBjb250ZXh0IC0gT3B0aW9uYWwgYWRkaXRpb25hbCBjb250ZXh0XG4gICAgICogQGV4YW1wbGVcbiAgICAgKiBgYGB0eXBlc2NyaXB0XG4gICAgICogbG9nZ2VyLmVycm9yKCdGYWlsZWQgdG8gdmFsaWRhdGUgdG9vbCBpbnB1dCcsIHsgdG9vbE5hbWU6ICdCYXNoJywgcmVhc29uOiAnZW1wdHkgY29tbWFuZCcgfSk7XG4gICAgICogYGBgXG4gICAgICovXG4gICAgZXJyb3IobWVzc2FnZSwgY29udGV4dCkge1xuICAgICAgICB0aGlzLmVtaXQoXCJlcnJvclwiLCBtZXNzYWdlLCBjb250ZXh0KTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogTG9ncyBhIHN0cnVjdHVyZWQgZXJyb3Igd2l0aCBmdWxsIGVycm9yIGRldGFpbHMuXG4gICAgICpcbiAgICAgKiBVc2UgdGhpcyBtZXRob2Qgd2hlbiBsb2dnaW5nIGNhdWdodCBleGNlcHRpb25zIHRvIGNhcHR1cmUgdGhlIGZ1bGxcbiAgICAgKiBlcnJvciBjb250ZXh0IGluY2x1ZGluZyBuYW1lLCBtZXNzYWdlLCBzdGFjayB0cmFjZSwgYW5kIGNhdXNlIGNoYWluLlxuICAgICAqIEBwYXJhbSBlcnJvciAtIFRoZSBlcnJvciB0byBsb2dcbiAgICAgKiBAcGFyYW0gbWVzc2FnZSAtIEh1bWFuLXJlYWRhYmxlIGRlc2NyaXB0aW9uIG9mIHdoYXQgZmFpbGVkXG4gICAgICogQHBhcmFtIGNvbnRleHQgLSBPcHRpb25hbCBhZGRpdGlvbmFsIGNvbnRleHRcbiAgICAgKiBAZXhhbXBsZVxuICAgICAqIGBgYHR5cGVzY3JpcHRcbiAgICAgKiB0cnkge1xuICAgICAqICAgYXdhaXQgZGFuZ2Vyb3VzT3BlcmF0aW9uKCk7XG4gICAgICogfSBjYXRjaCAoZXJyKSB7XG4gICAgICogICBsb2dnZXIubG9nRXJyb3IoZXJyLCAnRmFpbGVkIHRvIGV4ZWN1dGUgZGFuZ2Vyb3VzIG9wZXJhdGlvbicsIHtcbiAgICAgKiAgICAgb3BlcmF0aW9uOiAnZGVsZXRlJyxcbiAgICAgKiAgICAgdGFyZ2V0OiAnL2ltcG9ydGFudC9maWxlLnR4dCdcbiAgICAgKiAgIH0pO1xuICAgICAqIH1cbiAgICAgKiBgYGBcbiAgICAgKi9cbiAgICBsb2dFcnJvcihlcnJvciwgbWVzc2FnZSwgY29udGV4dCkge1xuICAgICAgICBjb25zdCBlcnJvckluZm8gPSB0aGlzLmV4dHJhY3RFcnJvckluZm8oZXJyb3IpO1xuICAgICAgICBjb25zdCBldmVudCA9IHtcbiAgICAgICAgICAgIHRpbWVzdGFtcDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxuICAgICAgICAgICAgbGV2ZWw6IFwiZXJyb3JcIixcbiAgICAgICAgICAgIGhvb2tUeXBlOiB0aGlzLmN1cnJlbnRIb29rVHlwZSxcbiAgICAgICAgICAgIG1lc3NhZ2UsXG4gICAgICAgICAgICBpbnB1dDogdGhpcy5jdXJyZW50SW5wdXQsXG4gICAgICAgICAgICBlcnJvcjogZXJyb3JJbmZvLFxuICAgICAgICAgICAgY29udGV4dCxcbiAgICAgICAgfTtcbiAgICAgICAgdGhpcy5kZWxpdmVyRXZlbnQoZXZlbnQpO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBTdWJzY3JpYmVzIGEgaGFuZGxlciB0byBsb2cgZXZlbnRzIGF0IHRoZSBzcGVjaWZpZWQgbGV2ZWwuXG4gICAgICpcbiAgICAgKiBUaGUgaGFuZGxlciB3aWxsIGJlIGNhbGxlZCBmb3IgZXZlcnkgbG9nIGV2ZW50IGF0IHRoZSBzcGVjaWZpZWQgbGV2ZWwuXG4gICAgICogUmV0dXJucyBhbiB1bnN1YnNjcmliZSBmdW5jdGlvbiB0aGF0IHNob3VsZCBiZSBjYWxsZWQgd2hlbiB0aGUgaGFuZGxlclxuICAgICAqIGlzIG5vIGxvbmdlciBuZWVkZWQuXG4gICAgICogQHBhcmFtIGxldmVsIC0gVGhlIGxvZyBsZXZlbCB0byBzdWJzY3JpYmUgdG9cbiAgICAgKiBAcGFyYW0gaGFuZGxlciAtIFRoZSBoYW5kbGVyIGZ1bmN0aW9uIHRvIGNhbGwgZm9yIGVhY2ggZXZlbnRcbiAgICAgKiBAcmV0dXJucyBBIGZ1bmN0aW9uIHRvIHVuc3Vic2NyaWJlIHRoZSBoYW5kbGVyXG4gICAgICogQGV4YW1wbGVcbiAgICAgKiBgYGB0eXBlc2NyaXB0XG4gICAgICogLy8gU3Vic2NyaWJlIHRvIGVycm9yIGV2ZW50c1xuICAgICAqIGNvbnN0IHVuc3Vic2NyaWJlID0gbG9nZ2VyLm9uKCdlcnJvcicsIChldmVudCkgPT4ge1xuICAgICAqICAgY29uc29sZS5lcnJvcihgWyR7ZXZlbnQuaG9va1R5cGV9XSAke2V2ZW50Lm1lc3NhZ2V9YCk7XG4gICAgICogICBpZiAoZXZlbnQuZXJyb3IpIHtcbiAgICAgKiAgICAgY29uc29sZS5lcnJvcihldmVudC5lcnJvci5zdGFjayk7XG4gICAgICogICB9XG4gICAgICogfSk7XG4gICAgICpcbiAgICAgKiAvLyBMYXRlciwgY2xlYW4gdXBcbiAgICAgKiB1bnN1YnNjcmliZSgpO1xuICAgICAqIGBgYFxuICAgICAqIEBleGFtcGxlXG4gICAgICogYGBgdHlwZXNjcmlwdFxuICAgICAqIC8vIEZvcndhcmQgdG8gZXh0ZXJuYWwgbG9nZ2luZyBsaWJyYXJ5XG4gICAgICogaW1wb3J0IHBpbm8gZnJvbSAncGlubyc7XG4gICAgICogY29uc3QgcGlub0xvZ2dlciA9IHBpbm8oKTtcbiAgICAgKlxuICAgICAqIGxvZ2dlci5vbignaW5mbycsIChldmVudCkgPT4gcGlub0xvZ2dlci5pbmZvKGV2ZW50LCBldmVudC5tZXNzYWdlKSk7XG4gICAgICogbG9nZ2VyLm9uKCd3YXJuJywgKGV2ZW50KSA9PiBwaW5vTG9nZ2VyLndhcm4oZXZlbnQsIGV2ZW50Lm1lc3NhZ2UpKTtcbiAgICAgKiBsb2dnZXIub24oJ2Vycm9yJywgKGV2ZW50KSA9PiBwaW5vTG9nZ2VyLmVycm9yKGV2ZW50LCBldmVudC5tZXNzYWdlKSk7XG4gICAgICogYGBgXG4gICAgICovXG4gICAgb24obGV2ZWwsIGhhbmRsZXIpIHtcbiAgICAgICAgY29uc3QgbGV2ZWxIYW5kbGVycyA9IHRoaXMuaGFuZGxlcnMuZ2V0KGxldmVsKTtcbiAgICAgICAgaWYgKGxldmVsSGFuZGxlcnMpIHtcbiAgICAgICAgICAgIGxldmVsSGFuZGxlcnMuYWRkKGhhbmRsZXIpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiAoKSA9PiB7XG4gICAgICAgICAgICBsZXZlbEhhbmRsZXJzPy5kZWxldGUoaGFuZGxlcik7XG4gICAgICAgIH07XG4gICAgfVxuICAgIC8qKlxuICAgICAqIFNldHMgdGhlIGN1cnJlbnQgaG9vayBjb250ZXh0IGZvciBlbnJpY2hpbmcgbG9nIGV2ZW50cy5cbiAgICAgKlxuICAgICAqIFRoaXMgaXMgY2FsbGVkIGludGVybmFsbHkgYnkgdGhlIHJ1bnRpbWUgYmVmb3JlIGludm9raW5nIGhvb2sgaGFuZGxlcnMuXG4gICAgICogWW91IHR5cGljYWxseSBkb24ndCBuZWVkIHRvIGNhbGwgdGhpcyBkaXJlY3RseS5cbiAgICAgKiBAcGFyYW0gaG9va1R5cGUgLSBUaGUgdHlwZSBvZiBob29rIGJlaW5nIGV4ZWN1dGVkXG4gICAgICogQHBhcmFtIGlucHV0IC0gVGhlIGhvb2sgaW5wdXQgZGF0YVxuICAgICAqIEBpbnRlcm5hbFxuICAgICAqL1xuICAgIHNldENvbnRleHQoaG9va1R5cGUsIGlucHV0KSB7XG4gICAgICAgIHRoaXMuY3VycmVudEhvb2tUeXBlID0gaG9va1R5cGU7XG4gICAgICAgIHRoaXMuY3VycmVudElucHV0ID0gaW5wdXQ7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIENsZWFycyB0aGUgY3VycmVudCBob29rIGNvbnRleHQuXG4gICAgICpcbiAgICAgKiBDYWxsZWQgaW50ZXJuYWxseSBieSB0aGUgcnVudGltZSBhZnRlciBob29rIGV4ZWN1dGlvbiBjb21wbGV0ZXMuXG4gICAgICogQGludGVybmFsXG4gICAgICovXG4gICAgY2xlYXJDb250ZXh0KCkge1xuICAgICAgICB0aGlzLmN1cnJlbnRIb29rVHlwZSA9IHVuZGVmaW5lZDtcbiAgICAgICAgdGhpcy5jdXJyZW50SW5wdXQgPSB1bmRlZmluZWQ7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIENvbmZpZ3VyZXMgdGhlIGxvZyBmaWxlIHBhdGggYXQgcnVudGltZS5cbiAgICAgKlxuICAgICAqIENhbGwgdGhpcyB0byBlbmFibGUgb3IgY2hhbmdlIGZpbGUgbG9nZ2luZy4gU2V0dGluZyB0byBgbnVsbGAgZGlzYWJsZXNcbiAgICAgKiBmaWxlIGxvZ2dpbmcgKGJ1dCBkb2Vzbid0IGNsb3NlIGV4aXN0aW5nIGZpbGUgaGFuZGxlIGltbWVkaWF0ZWx5KS5cbiAgICAgKiBAcGFyYW0gZmlsZVBhdGggLSBQYXRoIHRvIHRoZSBsb2cgZmlsZSwgb3IgbnVsbCB0byBkaXNhYmxlXG4gICAgICogQGV4YW1wbGVcbiAgICAgKiBgYGB0eXBlc2NyaXB0XG4gICAgICogLy8gRW5hYmxlIGZpbGUgbG9nZ2luZyBhdCBydW50aW1lXG4gICAgICogbG9nZ2VyLnNldExvZ0ZpbGUoJy92YXIvbG9nL2NsYXVkZS1ob29rcy5sb2cnKTtcbiAgICAgKlxuICAgICAqIC8vIERpc2FibGUgZmlsZSBsb2dnaW5nXG4gICAgICogbG9nZ2VyLnNldExvZ0ZpbGUobnVsbCk7XG4gICAgICogYGBgXG4gICAgICovXG4gICAgc2V0TG9nRmlsZShmaWxlUGF0aCkge1xuICAgICAgICAvLyBDbG9zZSBleGlzdGluZyBmaWxlIGlmIG9wZW5cbiAgICAgICAgaWYgKHRoaXMubG9nRmlsZUZkICE9PSBudWxsKSB7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIGNsb3NlU3luYyh0aGlzLmxvZ0ZpbGVGZCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXRjaCB7XG4gICAgICAgICAgICAgICAgLy8gSWdub3JlIGVycm9ycyBvbiBjbG9zZVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5sb2dGaWxlRmQgPSBudWxsO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMubG9nRmlsZVBhdGggPSBmaWxlUGF0aDtcbiAgICAgICAgdGhpcy5maWxlSW5pdGlhbGl6ZWQgPSBmYWxzZTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogQ2xvc2VzIGFsbCByZXNvdXJjZXMgaGVsZCBieSB0aGUgbG9nZ2VyLlxuICAgICAqXG4gICAgICogQ2FsbCB0aGlzIGR1cmluZyBncmFjZWZ1bCBzaHV0ZG93biB0byBlbnN1cmUgYWxsIGxvZyBkYXRhIGlzIGZsdXNoZWQuXG4gICAgICogQGV4YW1wbGVcbiAgICAgKiBgYGB0eXBlc2NyaXB0XG4gICAgICogcHJvY2Vzcy5vbignZXhpdCcsICgpID0+IHtcbiAgICAgKiAgIGxvZ2dlci5jbG9zZSgpO1xuICAgICAqIH0pO1xuICAgICAqIGBgYFxuICAgICAqL1xuICAgIGNsb3NlKCkge1xuICAgICAgICBpZiAodGhpcy5sb2dGaWxlRmQgIT09IG51bGwpIHtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgY2xvc2VTeW5jKHRoaXMubG9nRmlsZUZkKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhdGNoIHtcbiAgICAgICAgICAgICAgICAvLyBJZ25vcmUgZXJyb3JzIG9uIGNsb3NlXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLmxvZ0ZpbGVGZCA9IG51bGw7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5maWxlSW5pdGlhbGl6ZWQgPSBmYWxzZTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogQ2hlY2tzIGlmIHRoZXJlIGFyZSBhbnkgYWN0aXZlIGhhbmRsZXJzIG9yIGRlc3RpbmF0aW9ucy5cbiAgICAgKlxuICAgICAqIFJldHVybnMgdHJ1ZSBpZiBhbnkgaGFuZGxlcnMgYXJlIHJlZ2lzdGVyZWQgb3IgZmlsZSBsb2dnaW5nIGlzIGVuYWJsZWQuXG4gICAgICogQHJldHVybnMgV2hldGhlciB0aGUgbG9nZ2VyIGhhcyBhbnkgYWN0aXZlIG91dHB1dCBkZXN0aW5hdGlvbnNcbiAgICAgKi9cbiAgICBoYXNEZXN0aW5hdGlvbnMoKSB7XG4gICAgICAgIGZvciAoY29uc3QgaGFuZGxlcnMgb2YgdGhpcy5oYW5kbGVycy52YWx1ZXMoKSkge1xuICAgICAgICAgICAgaWYgKGhhbmRsZXJzLnNpemUgPiAwKVxuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzLmxvZ0ZpbGVQYXRoICE9PSBudWxsO1xuICAgIH1cbiAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICAgLy8gUHJpdmF0ZSBNZXRob2RzXG4gICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgIC8qKlxuICAgICAqIEVtaXRzIGEgbG9nIGV2ZW50LlxuICAgICAqIEBwYXJhbSBsZXZlbCAtIFRoZSBzZXZlcml0eSBsZXZlbCBvZiB0aGUgZXZlbnRcbiAgICAgKiBAcGFyYW0gbWVzc2FnZSAtIFRoZSBsb2cgbWVzc2FnZVxuICAgICAqIEBwYXJhbSBjb250ZXh0IC0gT3B0aW9uYWwgYWRkaXRpb25hbCBjb250ZXh0IGRhdGFcbiAgICAgKi9cbiAgICBlbWl0KGxldmVsLCBtZXNzYWdlLCBjb250ZXh0KSB7XG4gICAgICAgIGNvbnN0IGV2ZW50ID0ge1xuICAgICAgICAgICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXG4gICAgICAgICAgICBsZXZlbCxcbiAgICAgICAgICAgIGhvb2tUeXBlOiB0aGlzLmN1cnJlbnRIb29rVHlwZSxcbiAgICAgICAgICAgIG1lc3NhZ2UsXG4gICAgICAgICAgICBpbnB1dDogdGhpcy5jdXJyZW50SW5wdXQsXG4gICAgICAgICAgICBjb250ZXh0LFxuICAgICAgICB9O1xuICAgICAgICB0aGlzLmRlbGl2ZXJFdmVudChldmVudCk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIERlbGl2ZXJzIGFuIGV2ZW50IHRvIGFsbCByZWdpc3RlcmVkIGRlc3RpbmF0aW9ucy5cbiAgICAgKiBAcGFyYW0gZXZlbnQgLSBUaGUgbG9nIGV2ZW50IHRvIGRlbGl2ZXJcbiAgICAgKi9cbiAgICBkZWxpdmVyRXZlbnQoZXZlbnQpIHtcbiAgICAgICAgLy8gRGVsaXZlciB0byBldmVudCBoYW5kbGVyc1xuICAgICAgICBjb25zdCBsZXZlbEhhbmRsZXJzID0gdGhpcy5oYW5kbGVycy5nZXQoZXZlbnQubGV2ZWwpO1xuICAgICAgICBpZiAobGV2ZWxIYW5kbGVycykge1xuICAgICAgICAgICAgZm9yIChjb25zdCBoYW5kbGVyIG9mIGxldmVsSGFuZGxlcnMpIHtcbiAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICBoYW5kbGVyKGV2ZW50KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY2F0Y2gge1xuICAgICAgICAgICAgICAgICAgICAvLyBTaWxlbnRseSBpZ25vcmUgaGFuZGxlciBlcnJvcnMgdG8gbm90IGRpc3J1cHQgaG9vayBleGVjdXRpb25cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgLy8gV3JpdGUgdG8gZmlsZSBpZiBjb25maWd1cmVkXG4gICAgICAgIHRoaXMud3JpdGVUb0ZpbGUoZXZlbnQpO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBXcml0ZXMgYW4gZXZlbnQgdG8gdGhlIGxvZyBmaWxlLlxuICAgICAqIEBwYXJhbSBldmVudCAtIFRoZSBsb2cgZXZlbnQgdG8gd3JpdGVcbiAgICAgKi9cbiAgICB3cml0ZVRvRmlsZShldmVudCkge1xuICAgICAgICBpZiAoIXRoaXMubG9nRmlsZVBhdGgpXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIC8vIExhenkgaW5pdGlhbGl6YXRpb24gb2YgZmlsZSBoYW5kbGVcbiAgICAgICAgaWYgKCF0aGlzLmZpbGVJbml0aWFsaXplZCkge1xuICAgICAgICAgICAgdGhpcy5pbml0aWFsaXplRmlsZSgpO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0aGlzLmxvZ0ZpbGVGZCA9PT0gbnVsbClcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IGxpbmUgPSBgJHtKU09OLnN0cmluZ2lmeShldmVudCl9XFxuYDtcbiAgICAgICAgICAgIHdyaXRlU3luYyh0aGlzLmxvZ0ZpbGVGZCwgbGluZSk7XG4gICAgICAgIH1cbiAgICAgICAgY2F0Y2gge1xuICAgICAgICAgICAgLy8gU2lsZW50bHkgaWdub3JlIGZpbGUgd3JpdGUgZXJyb3JzIHRvIG5vdCBkaXNydXB0IGhvb2sgZXhlY3V0aW9uXG4gICAgICAgICAgICAvLyBUaGlzIGZvbGxvd3MgdGhlIHJpc2sgbWl0aWdhdGlvbjogXCJHcmFjZWZ1bCBkZWdyYWRhdGlvbiAtIGxvZyB3cml0ZVxuICAgICAgICAgICAgLy8gZmFpbHVyZXMgYXJlIHNpbGVudGx5IGlnbm9yZWQgdG8gbm90IGRpc3J1cHQgaG9vayBleGVjdXRpb25cIlxuICAgICAgICB9XG4gICAgfVxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemVzIHRoZSBsb2cgZmlsZSBmb3Igd3JpdGluZy5cbiAgICAgKi9cbiAgICBpbml0aWFsaXplRmlsZSgpIHtcbiAgICAgICAgdGhpcy5maWxlSW5pdGlhbGl6ZWQgPSB0cnVlO1xuICAgICAgICBpZiAoIXRoaXMubG9nRmlsZVBhdGgpXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICAvLyBFbnN1cmUgZGlyZWN0b3J5IGV4aXN0c1xuICAgICAgICAgICAgY29uc3QgZGlyID0gZGlybmFtZSh0aGlzLmxvZ0ZpbGVQYXRoKTtcbiAgICAgICAgICAgIGlmICghZXhpc3RzU3luYyhkaXIpKSB7XG4gICAgICAgICAgICAgICAgbWtkaXJTeW5jKGRpciwgeyByZWN1cnNpdmU6IHRydWUgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBPcGVuIGZpbGUgZm9yIGFwcGVuZGluZ1xuICAgICAgICAgICAgdGhpcy5sb2dGaWxlRmQgPSBvcGVuU3luYyh0aGlzLmxvZ0ZpbGVQYXRoLCBcImFcIik7XG4gICAgICAgIH1cbiAgICAgICAgY2F0Y2gge1xuICAgICAgICAgICAgLy8gU2lsZW50bHkgaWdub3JlIGZpbGUgaW5pdGlhbGl6YXRpb24gZXJyb3JzXG4gICAgICAgICAgICB0aGlzLmxvZ0ZpbGVGZCA9IG51bGw7XG4gICAgICAgIH1cbiAgICB9XG4gICAgLyoqXG4gICAgICogRXh0cmFjdHMgc3RydWN0dXJlZCBlcnJvciBpbmZvcm1hdGlvbiBmcm9tIGFuIHVua25vd24gZXJyb3IuXG4gICAgICogQHBhcmFtIGVycm9yIC0gVGhlIGVycm9yIHRvIGV4dHJhY3QgaW5mb3JtYXRpb24gZnJvbVxuICAgICAqIEByZXR1cm5zIFN0cnVjdHVyZWQgZXJyb3IgaW5mb3JtYXRpb25cbiAgICAgKi9cbiAgICBleHRyYWN0RXJyb3JJbmZvKGVycm9yKSB7XG4gICAgICAgIGlmIChlcnJvciBpbnN0YW5jZW9mIEVycm9yKSB7XG4gICAgICAgICAgICBjb25zdCBpbmZvID0ge1xuICAgICAgICAgICAgICAgIG5hbWU6IGVycm9yLm5hbWUsXG4gICAgICAgICAgICAgICAgbWVzc2FnZTogZXJyb3IubWVzc2FnZSxcbiAgICAgICAgICAgICAgICBzdGFjazogZXJyb3Iuc3RhY2ssXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgLy8gRXh0cmFjdCBjYXVzZSBjaGFpbiBpZiBwcmVzZW50XG4gICAgICAgICAgICBpZiAoZXJyb3IuY2F1c2UgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgIGluZm8uY2F1c2UgPSB0aGlzLmV4dHJhY3RFcnJvckluZm8oZXJyb3IuY2F1c2UpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIGluZm87XG4gICAgICAgIH1cbiAgICAgICAgLy8gSGFuZGxlIG5vbi1FcnJvciB2YWx1ZXNcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIG5hbWU6IFwiVW5rbm93bkVycm9yXCIsXG4gICAgICAgICAgICBtZXNzYWdlOiBTdHJpbmcoZXJyb3IpLFxuICAgICAgICB9O1xuICAgIH1cbn1cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIFNpbmdsZXRvbiBFeHBvcnRcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8qKlxuICogR2xvYmFsIGxvZ2dlciBpbnN0YW5jZSBmb3IgQ2xhdWRlIENvZGUgaG9va3MuXG4gKlxuICogVXNlIHRoaXMgc2luZ2xldG9uIGZvciBhbGwgbG9nZ2luZyB3aXRoaW4gaG9va3MuIFRoZSBsb2dnZXIgaXMgY29uZmlndXJlZFxuICogdmlhIGVudmlyb25tZW50IHZhcmlhYmxlcyBhbmQgc3VwcG9ydHMgZXZlbnQgc3Vic2NyaXB0aW9uIGZvciBjdXN0b21cbiAqIGRlc3RpbmF0aW9ucy5cbiAqXG4gKiAjIyBDb25maWd1cmF0aW9uXG4gKlxuICogfCBFbnZpcm9ubWVudCBWYXJpYWJsZSB8IERlc2NyaXB0aW9uIHxcbiAqIHwtLS0tLS0tLS0tLS0tLS0tLS0tLS18LS0tLS0tLS0tLS0tLXxcbiAqIHwgYENMQVVERV9DT0RFX0hPT0tTX0xPR19GSUxFYCB8IFBhdGggdG8gbG9nIGZpbGUgKEpTT04gTGluZXMgZm9ybWF0KSB8XG4gKlxuICogIyMgVXNhZ2UgaW4gSG9va3NcbiAqXG4gKiBUaGUgbG9nZ2VyIGlzIHBhc3NlZCB0byBob29rIGhhbmRsZXJzIHZpYSBjb250ZXh0IGZvciBjb252ZW5pZW5jZTpcbiAqXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBleHBvcnQgZGVmYXVsdCBwcmVUb29sVXNlSG9vayh7IG1hdGNoZXI6ICdCYXNoJyB9LCBhc3luYyAoaW5wdXQsIHsgbG9nZ2VyIH0pID0+IHtcbiAqICAgbG9nZ2VyLndhcm4oJ1ZhbGlkYXRpbmcgQmFzaCBjb21tYW5kJyk7XG4gKiAgIHJldHVybiBwcmVUb29sVXNlT3V0cHV0KHsgYWxsb3c6IHRydWUgfSk7XG4gKiB9KTtcbiAqIGBgYFxuICpcbiAqICMjIEV4dGVybmFsIEludGVncmF0aW9uXG4gKlxuICogU3Vic2NyaWJlIHRvIGV2ZW50cyB0byBmb3J3YXJkIGxvZ3MgdG8gZXh0ZXJuYWwgc3lzdGVtczpcbiAqXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBpbXBvcnQgeyBsb2dnZXIgfSBmcm9tICdAZ29vZGZvb3QvY2xhdWRlLWNvZGUtaG9va3MnO1xuICogaW1wb3J0IHBpbm8gZnJvbSAncGlubyc7XG4gKlxuICogY29uc3QgcGlub0xvZ2dlciA9IHBpbm8oeyBsZXZlbDogJ2RlYnVnJyB9KTtcbiAqXG4gKiBsb2dnZXIub24oJ2RlYnVnJywgKGV2ZW50KSA9PiBwaW5vTG9nZ2VyLmRlYnVnKGV2ZW50LCBldmVudC5tZXNzYWdlKSk7XG4gKiBsb2dnZXIub24oJ2luZm8nLCAoZXZlbnQpID0+IHBpbm9Mb2dnZXIuaW5mbyhldmVudCwgZXZlbnQubWVzc2FnZSkpO1xuICogbG9nZ2VyLm9uKCd3YXJuJywgKGV2ZW50KSA9PiBwaW5vTG9nZ2VyLndhcm4oZXZlbnQsIGV2ZW50Lm1lc3NhZ2UpKTtcbiAqIGxvZ2dlci5vbignZXJyb3InLCAoZXZlbnQpID0+IHBpbm9Mb2dnZXIuZXJyb3IoZXZlbnQsIGV2ZW50Lm1lc3NhZ2UpKTtcbiAqIGBgYFxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIC8vIERpcmVjdCB1c2FnZVxuICogaW1wb3J0IHsgbG9nZ2VyIH0gZnJvbSAnQGdvb2Rmb290L2NsYXVkZS1jb2RlLWhvb2tzJztcbiAqXG4gKiBsb2dnZXIuaW5mbygnU3RhcnRpbmcgb3BlcmF0aW9uJyk7XG4gKiBsb2dnZXIud2FybignUmVzb3VyY2UgbGltaXQgYXBwcm9hY2hpbmcnLCB7IHVzYWdlOiAwLjkgfSk7XG4gKlxuICogdHJ5IHtcbiAqICAgYXdhaXQgcmlza3lPcGVyYXRpb24oKTtcbiAqIH0gY2F0Y2ggKGVycikge1xuICogICBsb2dnZXIubG9nRXJyb3IoZXJyLCAnUmlza3kgb3BlcmF0aW9uIGZhaWxlZCcpO1xuICogfVxuICogYGBgXG4gKi9cbmV4cG9ydCBjb25zdCBsb2dnZXIgPSBuZXcgTG9nZ2VyKCk7XG4iLCAiLyoqXG4gKiBPdXRwdXQgdHlwZXMgYW5kIGJ1aWxkZXJzIGZvciBDbGF1ZGUgQ29kZSBob29rcy5cbiAqXG4gKiBQcm92aWRlcyB0eXBlLXNhZmUgb3V0cHV0IGJ1aWxkZXIgZnVuY3Rpb25zIGZvciBhbGwgMTIgaG9vayB0eXBlcy4gRWFjaCBidWlsZGVyXG4gKiBhY2NlcHRzIG9wdGlvbnMgdGhhdCBtYXRjaCB0aGUgd2lyZSBmb3JtYXQgZXhwZWN0ZWQgYnkgQ2xhdWRlIENvZGUsIHdpdGggdHlwZXNcbiAqIGRlcml2ZWQgZnJvbSB0aGUgQ2xhdWRlIEFnZW50IFNESydzIGBTeW5jSG9va0pTT05PdXRwdXRgIHR5cGUuXG4gKiBAc2VlIGh0dHBzOi8vY29kZS5jbGF1ZGUuY29tL2RvY3MvZW4vaG9va3NcbiAqIEBtb2R1bGVcbiAqL1xuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gRXhpdCBDb2RlIENvbnN0YW50c1xuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLyoqXG4gKiBFeGl0IGNvZGVzIHVzZWQgYnkgQ2xhdWRlIENvZGUgaG9va3MuXG4gKlxuICogfCBFeGl0IENvZGUgfCBOYW1lIHwgV2hlbiBVc2VkIHwgQ2xhdWRlIENvZGUgQmVoYXZpb3IgfFxuICogfC0tLS0tLS0tLS0tfC0tLS0tLXwtLS0tLS0tLS0tLXwtLS0tLS0tLS0tLS0tLS0tLS0tLS18XG4gKiB8IDAgfCBTdWNjZXNzIHwgSGFuZGxlciByZXR1cm5zIG5vcm1hbGx5IHwgQ29udGludWUsIHBhcnNlIHN0ZG91dCBhcyBKU09OIHxcbiAqIHwgMSB8IEVycm9yIHwgSW52YWxpZCBpbnB1dCwgbm9uLWJsb2NraW5nIGVycm9yIHwgTm9uLWJsb2NraW5nLCBzdGRlcnIgdG8gdXNlciBvbmx5IHxcbiAqIHwgMiB8IEJsb2NrIHwgSGFuZGxlciB0aHJvd3MgT1IgYHN0b3BSZWFzb25gIHNldCB8IEJsb2NraW5nLCBzdGRlcnIgc2hvd24gdG8gQ2xhdWRlIHxcbiAqL1xuZXhwb3J0IGNvbnN0IEVYSVRfQ09ERVMgPSB7XG4gICAgLyoqIEhhbmRsZXIgY29tcGxldGVkIHN1Y2Nlc3NmdWxseS4gQ2xhdWRlIENvZGUgcGFyc2VzIHN0ZG91dCBhcyBKU09OLiAqL1xuICAgIFNVQ0NFU1M6IDAsXG4gICAgLyoqIE5vbi1ibG9ja2luZyBlcnJvciBvY2N1cnJlZCAoZS5nLiwgaW52YWxpZCBpbnB1dCkuIHN0ZGVyciBzaG93biB0byB1c2VyIG9ubHkuICovXG4gICAgRVJST1I6IDEsXG4gICAgLyoqIEhhbmRsZXIgdGhyZXcgZXhjZXB0aW9uIE9SIGJsb2NraW5nIGFjdGlvbiByZXF1ZXN0ZWQuIHN0ZGVyciBzaG93biB0byBDbGF1ZGUuICovXG4gICAgQkxPQ0s6IDIsXG59O1xuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gT3V0cHV0IEJ1aWxkZXIgRmFjdG9yaWVzXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vKipcbiAqIEZhY3RvcnkgZm9yIGhvb2tzIHRoYXQgaGF2ZSBob29rU3BlY2lmaWNPdXRwdXQgd2l0aCBhIGhvb2tFdmVudE5hbWUgZGlzY3JpbWluYXRvci5cbiAqIEBwYXJhbSBob29rVHlwZSAtIFRoZSBob29rIHR5cGUgbmFtZSB1c2VkIGFzIHRoZSBfdHlwZSBkaXNjcmltaW5hdG9yXG4gKiBAcmV0dXJucyBBIGJ1aWxkZXIgZnVuY3Rpb24gdGhhdCBjcmVhdGVzIHRoZSBvdXRwdXQgb2JqZWN0XG4gKiBAaW50ZXJuYWxcbiAqL1xuZnVuY3Rpb24gY3JlYXRlSG9va1NwZWNpZmljT3V0cHV0QnVpbGRlcihob29rVHlwZSkge1xuICAgIHJldHVybiAob3B0aW9ucyA9IHt9KSA9PiB7XG4gICAgICAgIGNvbnN0IHsgaG9va1NwZWNpZmljT3V0cHV0LCAuLi5yZXN0IH0gPSBvcHRpb25zO1xuICAgICAgICBjb25zdCBzdGRvdXQgPSBob29rU3BlY2lmaWNPdXRwdXQgIT09IHVuZGVmaW5lZFxuICAgICAgICAgICAgPyB7IC4uLnJlc3QsIGhvb2tTcGVjaWZpY091dHB1dDogeyBob29rRXZlbnROYW1lOiBob29rVHlwZSwgLi4uaG9va1NwZWNpZmljT3V0cHV0IH0gfVxuICAgICAgICAgICAgOiByZXN0O1xuICAgICAgICByZXR1cm4geyBfdHlwZTogaG9va1R5cGUsIHN0ZG91dCB9O1xuICAgIH07XG59XG4vKipcbiAqIEZhY3RvcnkgZm9yIGhvb2tzIHRoYXQgb25seSB1c2UgQ29tbW9uT3B0aW9ucyAoc2ltcGxlIHBhc3N0aHJvdWdoKS5cbiAqIEBwYXJhbSBob29rVHlwZSAtIFRoZSBob29rIHR5cGUgbmFtZSB1c2VkIGFzIHRoZSBfdHlwZSBkaXNjcmltaW5hdG9yXG4gKiBAcmV0dXJucyBBIGJ1aWxkZXIgZnVuY3Rpb24gdGhhdCBjcmVhdGVzIHRoZSBvdXRwdXQgb2JqZWN0XG4gKiBAaW50ZXJuYWxcbiAqL1xuZnVuY3Rpb24gY3JlYXRlU2ltcGxlT3V0cHV0QnVpbGRlcihob29rVHlwZSkge1xuICAgIHJldHVybiAob3B0aW9ucyA9IHt9KSA9PiAoe1xuICAgICAgICBfdHlwZTogaG9va1R5cGUsXG4gICAgICAgIHN0ZG91dDogb3B0aW9ucyxcbiAgICB9KTtcbn1cbi8qKlxuICogRmFjdG9yeSBmb3IgaG9va3MgdGhhdCB1c2UgZGVjaXNpb24tYmFzZWQgb3B0aW9ucyAoU3RvcCwgU3ViYWdlbnRTdG9wKS5cbiAqIEBwYXJhbSBob29rVHlwZSAtIFRoZSBob29rIHR5cGUgbmFtZSB1c2VkIGFzIHRoZSBfdHlwZSBkaXNjcmltaW5hdG9yXG4gKiBAcmV0dXJucyBBIGJ1aWxkZXIgZnVuY3Rpb24gdGhhdCBjcmVhdGVzIHRoZSBvdXRwdXQgb2JqZWN0XG4gKiBAaW50ZXJuYWxcbiAqL1xuZnVuY3Rpb24gY3JlYXRlRGVjaXNpb25PdXRwdXRCdWlsZGVyKGhvb2tUeXBlKSB7XG4gICAgcmV0dXJuIChvcHRpb25zID0ge30pID0+ICh7XG4gICAgICAgIF90eXBlOiBob29rVHlwZSxcbiAgICAgICAgc3Rkb3V0OiBvcHRpb25zLFxuICAgIH0pO1xufVxuLyoqXG4gKiBDcmVhdGVzIGFuIG91dHB1dCBmb3IgUHJlVG9vbFVzZSBob29rcy5cbiAqIEBwYXJhbSBvcHRpb25zIC0gQ29uZmlndXJhdGlvbiBvcHRpb25zIGZvciB0aGUgaG9vayBvdXRwdXRcbiAqIEByZXR1cm5zIEEgUHJlVG9vbFVzZU91dHB1dCBvYmplY3QgcmVhZHkgZm9yIHRoZSBydW50aW1lXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogLy8gQWxsb3cgdG9vbCBleGVjdXRpb25cbiAqIHByZVRvb2xVc2VPdXRwdXQoe1xuICogICBob29rU3BlY2lmaWNPdXRwdXQ6IHsgcGVybWlzc2lvbkRlY2lzaW9uOiAnYWxsb3cnIH1cbiAqIH0pO1xuICpcbiAqIC8vIERlbnkgd2l0aCByZWFzb25cbiAqIHByZVRvb2xVc2VPdXRwdXQoe1xuICogICBob29rU3BlY2lmaWNPdXRwdXQ6IHtcbiAqICAgICBwZXJtaXNzaW9uRGVjaXNpb246ICdkZW55JyxcbiAqICAgICBwZXJtaXNzaW9uRGVjaXNpb25SZWFzb246ICdEYW5nZXJvdXMgY29tbWFuZCBkZXRlY3RlZCdcbiAqICAgfVxuICogfSk7XG4gKlxuICogLy8gQWxsb3cgd2l0aCBtb2RpZmllZCBpbnB1dFxuICogcHJlVG9vbFVzZU91dHB1dCh7XG4gKiAgIGhvb2tTcGVjaWZpY091dHB1dDoge1xuICogICAgIHBlcm1pc3Npb25EZWNpc2lvbjogJ2FsbG93JyxcbiAqICAgICB1cGRhdGVkSW5wdXQ6IHsgY29tbWFuZDogJ2xzIC1sYScgfVxuICogICB9XG4gKiB9KTtcbiAqIGBgYFxuICovXG5leHBvcnQgY29uc3QgcHJlVG9vbFVzZU91dHB1dCA9IC8qIEBfX1BVUkVfXyAqLyBjcmVhdGVIb29rU3BlY2lmaWNPdXRwdXRCdWlsZGVyKFwiUHJlVG9vbFVzZVwiKTtcbi8qKlxuICogQ3JlYXRlcyBhbiBvdXRwdXQgZm9yIFBvc3RUb29sVXNlIGhvb2tzLlxuICogQHBhcmFtIG9wdGlvbnMgLSBDb25maWd1cmF0aW9uIG9wdGlvbnMgZm9yIHRoZSBob29rIG91dHB1dFxuICogQHJldHVybnMgQSBQb3N0VG9vbFVzZU91dHB1dCBvYmplY3QgcmVhZHkgZm9yIHRoZSBydW50aW1lXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogLy8gQWRkIGNvbnRleHQgYWZ0ZXIgYSBmaWxlIHJlYWRcbiAqIHBvc3RUb29sVXNlT3V0cHV0KHtcbiAqICAgaG9va1NwZWNpZmljT3V0cHV0OiB7XG4gKiAgICAgYWRkaXRpb25hbENvbnRleHQ6ICdGaWxlIGNvbnRhaW5zIHNlbnNpdGl2ZSBkYXRhJ1xuICogICB9XG4gKiB9KTtcbiAqIGBgYFxuICovXG5leHBvcnQgY29uc3QgcG9zdFRvb2xVc2VPdXRwdXQgPSAvKiBAX19QVVJFX18gKi8gY3JlYXRlSG9va1NwZWNpZmljT3V0cHV0QnVpbGRlcihcIlBvc3RUb29sVXNlXCIpO1xuLyoqXG4gKiBDcmVhdGVzIGFuIG91dHB1dCBmb3IgUG9zdFRvb2xVc2VGYWlsdXJlIGhvb2tzLlxuICogQHBhcmFtIG9wdGlvbnMgLSBDb25maWd1cmF0aW9uIG9wdGlvbnMgZm9yIHRoZSBob29rIG91dHB1dFxuICogQHJldHVybnMgQSBQb3N0VG9vbFVzZUZhaWx1cmVPdXRwdXQgb2JqZWN0IHJlYWR5IGZvciB0aGUgcnVudGltZVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIHBvc3RUb29sVXNlRmFpbHVyZU91dHB1dCh7XG4gKiAgIGhvb2tTcGVjaWZpY091dHB1dDoge1xuICogICAgIGFkZGl0aW9uYWxDb250ZXh0OiAnVHJ5IHVzaW5nIGEgZGlmZmVyZW50IGFwcHJvYWNoJ1xuICogICB9XG4gKiB9KTtcbiAqIGBgYFxuICovXG5leHBvcnQgY29uc3QgcG9zdFRvb2xVc2VGYWlsdXJlT3V0cHV0ID0gLyogQF9fUFVSRV9fICovIGNyZWF0ZUhvb2tTcGVjaWZpY091dHB1dEJ1aWxkZXIoXCJQb3N0VG9vbFVzZUZhaWx1cmVcIik7XG4vKipcbiAqIENyZWF0ZXMgYW4gb3V0cHV0IGZvciBVc2VyUHJvbXB0U3VibWl0IGhvb2tzLlxuICogQHBhcmFtIG9wdGlvbnMgLSBDb25maWd1cmF0aW9uIG9wdGlvbnMgZm9yIHRoZSBob29rIG91dHB1dFxuICogQHJldHVybnMgQSBVc2VyUHJvbXB0U3VibWl0T3V0cHV0IG9iamVjdCByZWFkeSBmb3IgdGhlIHJ1bnRpbWVcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiB1c2VyUHJvbXB0U3VibWl0T3V0cHV0KHtcbiAqICAgaG9va1NwZWNpZmljT3V0cHV0OiB7XG4gKiAgICAgYWRkaXRpb25hbENvbnRleHQ6ICdUaGlzIHByb2plY3QgdXNlcyBUeXBlU2NyaXB0IHN0cmljdCBtb2RlJ1xuICogICB9XG4gKiB9KTtcbiAqIGBgYFxuICovXG5leHBvcnQgY29uc3QgdXNlclByb21wdFN1Ym1pdE91dHB1dCA9IC8qIEBfX1BVUkVfXyAqLyBjcmVhdGVIb29rU3BlY2lmaWNPdXRwdXRCdWlsZGVyKFwiVXNlclByb21wdFN1Ym1pdFwiKTtcbi8qKlxuICogQ3JlYXRlcyBhbiBvdXRwdXQgZm9yIFNlc3Npb25TdGFydCBob29rcy5cbiAqIEBwYXJhbSBvcHRpb25zIC0gQ29uZmlndXJhdGlvbiBvcHRpb25zIGZvciB0aGUgaG9vayBvdXRwdXRcbiAqIEByZXR1cm5zIEEgU2Vzc2lvblN0YXJ0T3V0cHV0IG9iamVjdCByZWFkeSBmb3IgdGhlIHJ1bnRpbWVcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBzZXNzaW9uU3RhcnRPdXRwdXQoe1xuICogICBob29rU3BlY2lmaWNPdXRwdXQ6IHtcbiAqICAgICBhZGRpdGlvbmFsQ29udGV4dDogSlNPTi5zdHJpbmdpZnkoeyBwcm9qZWN0OiAnbXktcHJvamVjdCcgfSlcbiAqICAgfVxuICogfSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNvbnN0IHNlc3Npb25TdGFydE91dHB1dCA9IC8qIEBfX1BVUkVfXyAqLyBjcmVhdGVIb29rU3BlY2lmaWNPdXRwdXRCdWlsZGVyKFwiU2Vzc2lvblN0YXJ0XCIpO1xuLyoqXG4gKiBDcmVhdGVzIGFuIG91dHB1dCBmb3IgU2Vzc2lvbkVuZCBob29rcy5cbiAqIEBwYXJhbSBvcHRpb25zIC0gQ29uZmlndXJhdGlvbiBvcHRpb25zIGZvciB0aGUgaG9vayBvdXRwdXRcbiAqIEByZXR1cm5zIEEgU2Vzc2lvbkVuZE91dHB1dCBvYmplY3QgcmVhZHkgZm9yIHRoZSBydW50aW1lXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogc2Vzc2lvbkVuZE91dHB1dCh7fSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNvbnN0IHNlc3Npb25FbmRPdXRwdXQgPSAvKiBAX19QVVJFX18gKi8gY3JlYXRlU2ltcGxlT3V0cHV0QnVpbGRlcihcIlNlc3Npb25FbmRcIik7XG4vKipcbiAqIENyZWF0ZXMgYW4gb3V0cHV0IGZvciBTdG9wIGhvb2tzLlxuICogQHBhcmFtIG9wdGlvbnMgLSBDb25maWd1cmF0aW9uIG9wdGlvbnMgZm9yIHRoZSBob29rIG91dHB1dFxuICogQHJldHVybnMgQSBTdG9wT3V0cHV0IG9iamVjdCByZWFkeSBmb3IgdGhlIHJ1bnRpbWVcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiAvLyBBbGxvdyB0aGUgc3RvcFxuICogc3RvcE91dHB1dCh7IGRlY2lzaW9uOiAnYXBwcm92ZScgfSk7XG4gKlxuICogLy8gQmxvY2sgd2l0aCByZWFzb25cbiAqIHN0b3BPdXRwdXQoe1xuICogICBkZWNpc2lvbjogJ2Jsb2NrJyxcbiAqICAgcmVhc29uOiAnVGhlcmUgYXJlIHVuY29tbWl0dGVkIGNoYW5nZXMnXG4gKiB9KTtcbiAqIGBgYFxuICovXG5leHBvcnQgY29uc3Qgc3RvcE91dHB1dCA9IC8qIEBfX1BVUkVfXyAqLyBjcmVhdGVEZWNpc2lvbk91dHB1dEJ1aWxkZXIoXCJTdG9wXCIpO1xuLyoqXG4gKiBDcmVhdGVzIGFuIG91dHB1dCBmb3IgU3ViYWdlbnRTdGFydCBob29rcy5cbiAqIEBwYXJhbSBvcHRpb25zIC0gQ29uZmlndXJhdGlvbiBvcHRpb25zIGZvciB0aGUgaG9vayBvdXRwdXRcbiAqIEByZXR1cm5zIEEgU3ViYWdlbnRTdGFydE91dHB1dCBvYmplY3QgcmVhZHkgZm9yIHRoZSBydW50aW1lXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogc3ViYWdlbnRTdGFydE91dHB1dCh7XG4gKiAgIGhvb2tTcGVjaWZpY091dHB1dDoge1xuICogICAgIGFkZGl0aW9uYWxDb250ZXh0OiAnRm9jdXMgb24gZmluZGluZyBwYXR0ZXJucydcbiAqICAgfVxuICogfSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNvbnN0IHN1YmFnZW50U3RhcnRPdXRwdXQgPSAvKiBAX19QVVJFX18gKi8gY3JlYXRlSG9va1NwZWNpZmljT3V0cHV0QnVpbGRlcihcIlN1YmFnZW50U3RhcnRcIik7XG4vKipcbiAqIENyZWF0ZXMgYW4gb3V0cHV0IGZvciBTdWJhZ2VudFN0b3AgaG9va3MuXG4gKiBAcGFyYW0gb3B0aW9ucyAtIENvbmZpZ3VyYXRpb24gb3B0aW9ucyBmb3IgdGhlIGhvb2sgb3V0cHV0XG4gKiBAcmV0dXJucyBBIFN1YmFnZW50U3RvcE91dHB1dCBvYmplY3QgcmVhZHkgZm9yIHRoZSBydW50aW1lXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogLy8gQmxvY2sgd2l0aCByZWFzb25cbiAqIHN1YmFnZW50U3RvcE91dHB1dCh7XG4gKiAgIGRlY2lzaW9uOiAnYmxvY2snLFxuICogICByZWFzb246ICdUYXNrIG5vdCBjb21wbGV0ZSdcbiAqIH0pO1xuICogYGBgXG4gKi9cbmV4cG9ydCBjb25zdCBzdWJhZ2VudFN0b3BPdXRwdXQgPSAvKiBAX19QVVJFX18gKi8gY3JlYXRlRGVjaXNpb25PdXRwdXRCdWlsZGVyKFwiU3ViYWdlbnRTdG9wXCIpO1xuLyoqXG4gKiBDcmVhdGVzIGFuIG91dHB1dCBmb3IgTm90aWZpY2F0aW9uIGhvb2tzLlxuICogQHBhcmFtIG9wdGlvbnMgLSBDb25maWd1cmF0aW9uIG9wdGlvbnMgZm9yIHRoZSBob29rIG91dHB1dFxuICogQHJldHVybnMgQSBOb3RpZmljYXRpb25PdXRwdXQgb2JqZWN0IHJlYWR5IGZvciB0aGUgcnVudGltZVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIC8vIEFkZCBjb250ZXh0IGFib3V0IHRoZSBub3RpZmljYXRpb25cbiAqIG5vdGlmaWNhdGlvbk91dHB1dCh7XG4gKiAgIGhvb2tTcGVjaWZpY091dHB1dDoge1xuICogICAgIGFkZGl0aW9uYWxDb250ZXh0OiAnTm90aWZpY2F0aW9uIGZvcndhcmRlZCB0byBTbGFjayAjYWxlcnRzIGNoYW5uZWwnXG4gKiAgIH1cbiAqIH0pO1xuICpcbiAqIC8vIFN1cHByZXNzIHRoZSBub3RpZmljYXRpb25cbiAqIG5vdGlmaWNhdGlvbk91dHB1dCh7IHN1cHByZXNzT3V0cHV0OiB0cnVlIH0pO1xuICogYGBgXG4gKi9cbmV4cG9ydCBjb25zdCBub3RpZmljYXRpb25PdXRwdXQgPSAvKiBAX19QVVJFX18gKi8gY3JlYXRlSG9va1NwZWNpZmljT3V0cHV0QnVpbGRlcihcIk5vdGlmaWNhdGlvblwiKTtcbi8qKlxuICogQ3JlYXRlcyBhbiBvdXRwdXQgZm9yIFByZUNvbXBhY3QgaG9va3MuXG4gKiBAcGFyYW0gb3B0aW9ucyAtIENvbmZpZ3VyYXRpb24gb3B0aW9ucyBmb3IgdGhlIGhvb2sgb3V0cHV0XG4gKiBAcmV0dXJucyBBIFByZUNvbXBhY3RPdXRwdXQgb2JqZWN0IHJlYWR5IGZvciB0aGUgcnVudGltZVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIHByZUNvbXBhY3RPdXRwdXQoe1xuICogICBzeXN0ZW1NZXNzYWdlOiAnUmVtZW1iZXI6IHN0cmljdCBtb2RlIGlzIGVuYWJsZWQnXG4gKiB9KTtcbiAqIGBgYFxuICovXG5leHBvcnQgY29uc3QgcHJlQ29tcGFjdE91dHB1dCA9IC8qIEBfX1BVUkVfXyAqLyBjcmVhdGVTaW1wbGVPdXRwdXRCdWlsZGVyKFwiUHJlQ29tcGFjdFwiKTtcbi8qKlxuICogQ3JlYXRlcyBhbiBvdXRwdXQgZm9yIFBlcm1pc3Npb25SZXF1ZXN0IGhvb2tzLlxuICogQHBhcmFtIG9wdGlvbnMgLSBDb25maWd1cmF0aW9uIG9wdGlvbnMgZm9yIHRoZSBob29rIG91dHB1dFxuICogQHJldHVybnMgQSBQZXJtaXNzaW9uUmVxdWVzdE91dHB1dCBvYmplY3QgcmVhZHkgZm9yIHRoZSBydW50aW1lXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogLy8gQXV0by1hcHByb3ZlXG4gKiBwZXJtaXNzaW9uUmVxdWVzdE91dHB1dCh7XG4gKiAgIGhvb2tTcGVjaWZpY091dHB1dDoge1xuICogICAgIGRlY2lzaW9uOiB7IGJlaGF2aW9yOiAnYWxsb3cnIH1cbiAqICAgfVxuICogfSk7XG4gKlxuICogLy8gQXV0by1hcHByb3ZlIHdpdGggbW9kaWZpZWQgaW5wdXRcbiAqIHBlcm1pc3Npb25SZXF1ZXN0T3V0cHV0KHtcbiAqICAgaG9va1NwZWNpZmljT3V0cHV0OiB7XG4gKiAgICAgZGVjaXNpb246IHtcbiAqICAgICAgIGJlaGF2aW9yOiAnYWxsb3cnLFxuICogICAgICAgdXBkYXRlZElucHV0OiB7IGZpbGVfcGF0aDogJy9zYWZlL3BhdGgnIH1cbiAqICAgICB9XG4gKiAgIH1cbiAqIH0pO1xuICpcbiAqIC8vIEF1dG8tZGVueVxuICogcGVybWlzc2lvblJlcXVlc3RPdXRwdXQoe1xuICogICBob29rU3BlY2lmaWNPdXRwdXQ6IHtcbiAqICAgICBkZWNpc2lvbjoge1xuICogICAgICAgYmVoYXZpb3I6ICdkZW55JyxcbiAqICAgICAgIG1lc3NhZ2U6ICdOb3QgYWxsb3dlZCcsXG4gKiAgICAgICBpbnRlcnJ1cHQ6IHRydWVcbiAqICAgICB9XG4gKiAgIH1cbiAqIH0pO1xuICpcbiAqIC8vIEZhbGwgdGhyb3VnaCB0byBub3JtYWwgcHJvbXB0XG4gKiBwZXJtaXNzaW9uUmVxdWVzdE91dHB1dCh7fSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNvbnN0IHBlcm1pc3Npb25SZXF1ZXN0T3V0cHV0ID0gLyogQF9fUFVSRV9fICovIGNyZWF0ZUhvb2tTcGVjaWZpY091dHB1dEJ1aWxkZXIoXCJQZXJtaXNzaW9uUmVxdWVzdFwiKTtcbi8qKlxuICogQ3JlYXRlcyBhbiBvdXRwdXQgZm9yIFNldHVwIGhvb2tzLlxuICogQHBhcmFtIG9wdGlvbnMgLSBDb25maWd1cmF0aW9uIG9wdGlvbnMgZm9yIHRoZSBob29rIG91dHB1dFxuICogQHJldHVybnMgQSBTZXR1cE91dHB1dCBvYmplY3QgcmVhZHkgZm9yIHRoZSBydW50aW1lXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogLy8gQWRkIGNvbnRleHQgZHVyaW5nIHNldHVwXG4gKiBzZXR1cE91dHB1dCh7XG4gKiAgIGhvb2tTcGVjaWZpY091dHB1dDoge1xuICogICAgIGFkZGl0aW9uYWxDb250ZXh0OiAnUHJvamVjdCBpbml0aWFsaXplZCB3aXRoIGN1c3RvbSBzZXR0aW5ncydcbiAqICAgfVxuICogfSk7XG4gKlxuICogLy8gU2ltcGxlIHBhc3N0aHJvdWdoXG4gKiBzZXR1cE91dHB1dCh7fSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNvbnN0IHNldHVwT3V0cHV0ID0gLyogQF9fUFVSRV9fICovIGNyZWF0ZUhvb2tTcGVjaWZpY091dHB1dEJ1aWxkZXIoXCJTZXR1cFwiKTtcbi8qKlxuICogQ3JlYXRlcyBhbiBvdXRwdXQgZm9yIFRlYW1tYXRlSWRsZSBob29rcy5cbiAqIEBwYXJhbSBvcHRpb25zIC0gQ29uZmlndXJhdGlvbiBvcHRpb25zIGZvciB0aGUgaG9vayBvdXRwdXRcbiAqIEByZXR1cm5zIEEgVGVhbW1hdGVJZGxlT3V0cHV0IG9iamVjdCByZWFkeSBmb3IgdGhlIHJ1bnRpbWVcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiB0ZWFtbWF0ZUlkbGVPdXRwdXQoe30pO1xuICogYGBgXG4gKi9cbmV4cG9ydCBjb25zdCB0ZWFtbWF0ZUlkbGVPdXRwdXQgPSAvKiBAX19QVVJFX18gKi8gY3JlYXRlU2ltcGxlT3V0cHV0QnVpbGRlcihcIlRlYW1tYXRlSWRsZVwiKTtcbi8qKlxuICogQ3JlYXRlcyBhbiBvdXRwdXQgZm9yIFRhc2tDb21wbGV0ZWQgaG9va3MuXG4gKiBAcGFyYW0gb3B0aW9ucyAtIENvbmZpZ3VyYXRpb24gb3B0aW9ucyBmb3IgdGhlIGhvb2sgb3V0cHV0XG4gKiBAcmV0dXJucyBBIFRhc2tDb21wbGV0ZWRPdXRwdXQgb2JqZWN0IHJlYWR5IGZvciB0aGUgcnVudGltZVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIHRhc2tDb21wbGV0ZWRPdXRwdXQoe30pO1xuICogYGBgXG4gKi9cbmV4cG9ydCBjb25zdCB0YXNrQ29tcGxldGVkT3V0cHV0ID0gLyogQF9fUFVSRV9fICovIGNyZWF0ZVNpbXBsZU91dHB1dEJ1aWxkZXIoXCJUYXNrQ29tcGxldGVkXCIpO1xuIiwgIi8qKlxuICogUnVudGltZSBtb2R1bGUgZm9yIENsYXVkZSBDb2RlIGhvb2tzLlxuICpcbiAqIEhhbmRsZXMgc3RkaW4vc3Rkb3V0L2V4aXQgY29kZSBzZW1hbnRpY3MgZm9yIGNvbXBpbGVkIGhvb2sgZXhlY3V0aW9uLlxuICogVGhpcyBtb2R1bGUgaXMgdGhlIGNvcmUgb3JjaGVzdHJhdG9yIHRoYXQ6XG4gKiAtIFJlYWRzIEpTT04gZnJvbSBzdGRpbiAod2lyZSBmb3JtYXQgd2l0aCBzbmFrZV9jYXNlIHByb3BlcnRpZXMpXG4gKiAtIEludm9rZXMgdGhlIGhvb2sgaGFuZGxlclxuICogLSBXcml0ZXMgb3V0cHV0IHRvIHN0ZG91dFxuICogLSBNYW5hZ2VzIGV4aXQgY29kZXNcbiAqIEBtb2R1bGVcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiAvLyBJbiBhIGNvbXBpbGVkIGhvb2sgZmlsZVxuICogaW1wb3J0IHsgZXhlY3V0ZSB9IGZyb20gJ0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcy9ydW50aW1lJztcbiAqIGltcG9ydCBteUhvb2sgZnJvbSAnLi9teS1ob29rLmpzJztcbiAqXG4gKiBleGVjdXRlKG15SG9vayk7XG4gKiBgYGBcbiAqIEBzZWUgaHR0cHM6Ly9jb2RlLmNsYXVkZS5jb20vZG9jcy9lbi9ob29rc1xuICovXG5pbXBvcnQgeyBwZXJzaXN0RW52VmFyLCBwZXJzaXN0RW52VmFycyB9IGZyb20gXCIuL2Vudi5qc1wiO1xuaW1wb3J0IHsgbG9nZ2VyIH0gZnJvbSBcIi4vbG9nZ2VyLmpzXCI7XG5pbXBvcnQgeyBFWElUX0NPREVTIH0gZnJvbSBcIi4vb3V0cHV0cy5qc1wiO1xuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gU3RkaW4vU3Rkb3V0IEhhbmRsaW5nXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vKipcbiAqIFJlYWRzIGFsbCBkYXRhIGZyb20gc3RkaW4uXG4gKiBAcmV0dXJucyBQcm9taXNlIHJlc29sdmluZyB0byB0aGUgY29tcGxldGUgc3RkaW4gY29udGVudFxuICovXG5hc3luYyBmdW5jdGlvbiByZWFkU3RkaW4oKSB7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgY29uc3QgY2h1bmtzID0gW107XG4gICAgICAgIC8vIFNldCBlbmNvZGluZyBmaXJzdCB0byBlbnN1cmUgZGF0YSBldmVudHMgcmVjZWl2ZSBzdHJpbmdzXG4gICAgICAgIHByb2Nlc3Muc3RkaW4uc2V0RW5jb2RpbmcoXCJ1dGYtOFwiKTtcbiAgICAgICAgcHJvY2Vzcy5zdGRpbi5vbihcImRhdGFcIiwgKGNodW5rKSA9PiB7XG4gICAgICAgICAgICBjaHVua3MucHVzaChjaHVuayk7XG4gICAgICAgIH0pO1xuICAgICAgICBwcm9jZXNzLnN0ZGluLm9uKFwiZW5kXCIsICgpID0+IHtcbiAgICAgICAgICAgIHJlc29sdmUoY2h1bmtzLmpvaW4oXCJcIikpO1xuICAgICAgICB9KTtcbiAgICAgICAgcHJvY2Vzcy5zdGRpbi5vbihcImVycm9yXCIsIChlcnJvcikgPT4ge1xuICAgICAgICAgICAgcmVqZWN0KGVycm9yKTtcbiAgICAgICAgfSk7XG4gICAgfSk7XG59XG4vKipcbiAqIFBhcnNlcyBzdGRpbiBKU09OIGlucHV0LlxuICogQHBhcmFtIHN0ZGluQ29udGVudCAtIFJhdyBzdGRpbiBjb250ZW50XG4gKiBAcmV0dXJucyBQYXJzZWQgaW5wdXQgKHdpcmUgZm9ybWF0IHdpdGggc25ha2VfY2FzZSBwcm9wZXJ0aWVzKVxuICogQHRocm93cyBFcnJvciBpZiBKU09OIGlzIG1hbGZvcm1lZFxuICovXG5mdW5jdGlvbiBwYXJzZVN0ZGluSW5wdXQoc3RkaW5Db250ZW50KSB7XG4gICAgLy8gUGFyc2UgSlNPTiAtIGlucHV0IHVzZXMgd2lyZSBmb3JtYXQgKHNuYWtlX2Nhc2UpIGRpcmVjdGx5XG4gICAgY29uc3QgcmF3SW5wdXQgPSBKU09OLnBhcnNlKHN0ZGluQ29udGVudCk7XG4gICAgcmV0dXJuIHJhd0lucHV0O1xufVxuLyoqXG4gKiBXcml0ZXMgaG9vayBvdXRwdXQgdG8gc3Rkb3V0LlxuICpcbiAqIE91dHB1dCB1c2VzIGNhbWVsQ2FzZSBrZXlzIHBlciBDbGF1ZGUgQ29kZSBob29rIHNwZWNpZmljYXRpb24uXG4gKiBAcGFyYW0gb3V0cHV0IC0gVGhlIGhvb2sgb3V0cHV0IHRvIHdyaXRlXG4gKiBAc2VlIGh0dHBzOi8vY29kZS5jbGF1ZGUuY29tL2RvY3MvZW4vaG9va3MjaG9vay1vdXRwdXQtc3RydWN0dXJlXG4gKi9cbmZ1bmN0aW9uIHdyaXRlU3Rkb3V0KG91dHB1dCkge1xuICAgIC8vIE91dHB1dCB1c2VzIGNhbWVsQ2FzZSAtIG5vIHRyYW5zZm9ybWF0aW9uIG5lZWRlZFxuICAgIHByb2Nlc3Muc3Rkb3V0LndyaXRlKEpTT04uc3RyaW5naWZ5KG91dHB1dCkpO1xufVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gRXJyb3IgSGFuZGxpbmdcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8qKlxuICogQ3JlYXRlcyBhbiBlcnJvciBvdXRwdXQgZm9yIG1hbGZvcm1lZCBzdGRpbiBKU09OLlxuICogQHBhcmFtIGVycm9yIC0gVGhlIHBhcnNlIGVycm9yXG4gKiBAcmV0dXJucyBIb29rT3V0cHV0IHdpdGggZW1wdHkgc3Rkb3V0XG4gKi9cbmZ1bmN0aW9uIGNyZWF0ZU1hbGZvcm1lZElucHV0T3V0cHV0KGVycm9yKSB7XG4gICAgbG9nZ2VyLmVycm9yKGBJbnZhbGlkIEpTT04gaW5wdXQ6ICR7ZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiBTdHJpbmcoZXJyb3IpfWApO1xuICAgIHJldHVybiB7IHN0ZG91dDoge30gfTtcbn1cbi8qKlxuICogV3JpdGVzIGhhbmRsZXIgZXJyb3Igc3RhY2t0cmFjZSB0byBzdGRlcnIgYW5kIGV4aXRzIHdpdGggY29kZSAyLlxuICpcbiAqIFdoZW4gYSBob29rIGhhbmRsZXIgdGhyb3dzIGFuIGV4Y2VwdGlvbjpcbiAqIC0gU3RhY2t0cmFjZSAod2l0aCBzb3VyY2VtYXBzIGlmIGF2YWlsYWJsZSkgaXMgb3V0cHV0IHRvIHN0ZGVyclxuICogLSBQcm9jZXNzIGV4aXRzIHdpdGggY29kZSAyIChCTE9DSylcbiAqIC0gTm8gSlNPTiBpcyBvdXRwdXQgdG8gc3Rkb3V0XG4gKiBAcGFyYW0gZXJyb3IgLSBUaGUgZXJyb3IgdGhyb3duIGJ5IHRoZSBoYW5kbGVyXG4gKi9cbmZ1bmN0aW9uIGhhbmRsZUhhbmRsZXJFcnJvcihlcnJvcikge1xuICAgIC8vIFdyaXRlIHN0YWNrIHRyYWNlIHRvIHN0ZGVyciAoc291cmNlbWFwcyBhcmUgYXBwbGllZCBhdXRvbWF0aWNhbGx5IGJ5IE5vZGUuanMpXG4gICAgaWYgKGVycm9yIGluc3RhbmNlb2YgRXJyb3IpIHtcbiAgICAgICAgcHJvY2Vzcy5zdGRlcnIud3JpdGUoYCR7ZXJyb3Iuc3RhY2sgPz8gZXJyb3IubWVzc2FnZX1cXG5gKTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIHByb2Nlc3Muc3RkZXJyLndyaXRlKGAke1N0cmluZyhlcnJvcil9XFxuYCk7XG4gICAgfVxuICAgIC8vIExvZyB0byBmaWxlIGlmIGNvbmZpZ3VyZWRcbiAgICBsb2dnZXIuZXJyb3IoYEhvb2sgaGFuZGxlciBlcnJvcjogJHtlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6IFN0cmluZyhlcnJvcil9YCk7XG4gICAgLy8gQ2xlYXIgbG9nZ2VyIGNvbnRleHQgYW5kIGNsb3NlXG4gICAgbG9nZ2VyLmNsZWFyQ29udGV4dCgpO1xuICAgIGxvZ2dlci5jbG9zZSgpO1xuICAgIC8vIEV4aXQgd2l0aCBjb2RlIDIgKEJMT0NLKSAtIG5vIEpTT04gb3V0cHV0XG4gICAgcHJvY2Vzcy5leGl0KEVYSVRfQ09ERVMuQkxPQ0spO1xufVxuLyoqXG4gKiBDb252ZXJ0cyBhIFNwZWNpZmljSG9va091dHB1dCB0byBIb29rT3V0cHV0IGZvciB3aXJlIGZvcm1hdC5cbiAqXG4gKiBTcGVjaWZpY0hvb2tPdXRwdXQgdHlwZXMgaGF2ZTogeyBfdHlwZSwgZXhpdENvZGUsIHN0ZG91dCwgc3RkZXJyPyB9XG4gKiBIb29rT3V0cHV0IGhhczogeyBleGl0Q29kZSwgc3Rkb3V0LCBzdGRlcnI/IH1cbiAqXG4gKiBTaW5jZSBvdXRwdXQgYnVpbGRlcnMgbm93IHByb2R1Y2Ugd2lyZS1mb3JtYXQgZGlyZWN0bHksIHRoaXMgZnVuY3Rpb25cbiAqIHNpbXBseSBzdHJpcHMgdGhlIGBfdHlwZWAgZGlzY3JpbWluYXRvciBmaWVsZC5cbiAqIEBwYXJhbSBzcGVjaWZpY091dHB1dCAtIFRoZSBzcGVjaWZpYyBvdXRwdXQgZnJvbSBhIGhvb2sgaGFuZGxlclxuICogQHJldHVybnMgSG9va091dHB1dCByZWFkeSBmb3Igc2VyaWFsaXphdGlvblxuICogQHNlZSBodHRwczovL2NvZGUuY2xhdWRlLmNvbS9kb2NzL2VuL2hvb2tzI2hvb2stb3V0cHV0LXN0cnVjdHVyZVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGNvbnN0IHNwZWNpZmljT3V0cHV0ID0gcHJlVG9vbFVzZU91dHB1dCh7IGhvb2tTcGVjaWZpY091dHB1dDogeyBwZXJtaXNzaW9uRGVjaXNpb246ICdhbGxvdycgfSB9KTtcbiAqIGNvbnN0IGhvb2tPdXRwdXQgPSBjb252ZXJ0VG9Ib29rT3V0cHV0KHNwZWNpZmljT3V0cHV0KTtcbiAqIC8vIGhvb2tPdXRwdXQ6IHsgZXhpdENvZGU6IDAsIHN0ZG91dDogeyBob29rU3BlY2lmaWNPdXRwdXQ6IHsgLi4uIH0gfSB9XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNvbnZlcnRUb0hvb2tPdXRwdXQoc3BlY2lmaWNPdXRwdXQpIHtcbiAgICByZXR1cm4geyBzdGRvdXQ6IHNwZWNpZmljT3V0cHV0LnN0ZG91dCB9O1xufVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gRXhlY3V0ZSBGdW5jdGlvblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLyoqXG4gKiBFeGVjdXRlcyBhIGhvb2sgaGFuZGxlciB3aXRoIGZ1bGwgcnVudGltZSBvcmNoZXN0cmF0aW9uLlxuICpcbiAqIFRoaXMgaXMgdGhlIG1haW4gZW50cnkgcG9pbnQgdGhhdCBjb21waWxlZCBob29rcyB1c2UuIFdoZW4gYSBjb21waWxlZCBob29rXG4gKiBydW5zIGFzIGEgQ0xJOlxuICpcbiAqIDEuIFJlYWRzIGFsbCBzdGRpblxuICogMi4gUGFyc2VzIEpTT04gKHdpcmUgZm9ybWF0IHdpdGggc25ha2VfY2FzZSBwcm9wZXJ0aWVzKVxuICogMy4gU2V0cyB1cCBsb2dnZXIgY29udGV4dCAoaG9va1R5cGUsIGlucHV0KVxuICogNC4gQ2FsbHMgaGFuZGxlciB3aXRoIGlucHV0IGFuZCBjb250ZXh0IChsb2dnZXIpXG4gKiA1LiBIYW5kbGVzIGFueSBlcnJvcnMsIGxvZ3MgdGhlbVxuICogNi4gV3JpdGVzIEpTT04gdG8gc3Rkb3V0XG4gKiA3LiBDbG9zZXMgbG9nZ2VyXG4gKiA4LiBFeGl0cyB3aXRoIGFwcHJvcHJpYXRlIGNvZGVcbiAqIEBwYXJhbSBob29rRm4gLSBUaGUgaG9vayBmdW5jdGlvbiB0byBleGVjdXRlIChmcm9tIGhvb2sgZmFjdG9yeSlcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiAvLyBJbiBjb21waWxlZCBob29rIGZpbGVcbiAqIGltcG9ydCB7IGV4ZWN1dGUgfSBmcm9tICdAZ29vZGZvb3QvY2xhdWRlLWNvZGUtaG9va3MvcnVudGltZSc7XG4gKiBpbXBvcnQgeyBwcmVUb29sVXNlSG9vaywgcHJlVG9vbFVzZU91dHB1dCB9IGZyb20gJ0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcyc7XG4gKlxuICogY29uc3QgbXlIb29rID0gcHJlVG9vbFVzZUhvb2soeyBtYXRjaGVyOiAnQmFzaCcgfSwgYXN5bmMgKGlucHV0LCB7IGxvZ2dlciB9KSA9PiB7XG4gKiAgIGxvZ2dlci5pbmZvKCdQcm9jZXNzaW5nIEJhc2ggY29tbWFuZCcpO1xuICogICByZXR1cm4gcHJlVG9vbFVzZU91dHB1dCh7IGFsbG93OiB0cnVlIH0pO1xuICogfSk7XG4gKlxuICogZXhlY3V0ZShteUhvb2spO1xuICogYGBgXG4gKiBAc2VlIGh0dHBzOi8vY29kZS5jbGF1ZGUuY29tL2RvY3MvZW4vaG9va3NcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGV4ZWN1dGUoaG9va0ZuKSB7XG4gICAgbGV0IG91dHB1dDtcbiAgICB0cnkge1xuICAgICAgICAvLyBDaGVjayBmb3IgbG9nIGZpbGUgY29uZmlndXJhdGlvbiBjb25mbGljdHNcbiAgICAgICAgLy8gQ0xBVURFX0NPREVfSE9PS1NfQ0xJX0xPR19GSUxFIGlzIGluamVjdGVkIGJ5IHRoZSBDTEkgLS1sb2cgcGFyYW1ldGVyXG4gICAgICAgIC8vIENMQVVERV9DT0RFX0hPT0tTX0xPR19GSUxFIGlzIHRoZSB1c2VyJ3MgZW52aXJvbm1lbnQgdmFyaWFibGVcbiAgICAgICAgY29uc3QgY2xpTG9nRmlsZSA9IHByb2Nlc3MuZW52LkNMQVVERV9DT0RFX0hPT0tTX0NMSV9MT0dfRklMRTtcbiAgICAgICAgY29uc3QgZW52TG9nRmlsZSA9IHByb2Nlc3MuZW52LkNMQVVERV9DT0RFX0hPT0tTX0xPR19GSUxFO1xuICAgICAgICBpZiAoY2xpTG9nRmlsZSAhPT0gdW5kZWZpbmVkICYmIGVudkxvZ0ZpbGUgIT09IHVuZGVmaW5lZCAmJiBjbGlMb2dGaWxlICE9PSBlbnZMb2dGaWxlKSB7XG4gICAgICAgICAgICAvLyBXcml0ZSBlcnJvciB0byBzdGRlcnIgYW5kIGV4aXQgd2l0aCBlcnJvciBjb2RlXG4gICAgICAgICAgICBwcm9jZXNzLnN0ZGVyci53cml0ZShgTG9nIGZpbGUgY29uZmlndXJhdGlvbiBjb25mbGljdDogQ0xJIC0tbG9nPVwiJHtjbGlMb2dGaWxlfVwiIHZzIENMQVVERV9DT0RFX0hPT0tTX0xPR19GSUxFPVwiJHtlbnZMb2dGaWxlfVwiLiBgICtcbiAgICAgICAgICAgICAgICBcIlVzZSBvbmx5IG9uZSBtZXRob2QgdG8gY29uZmlndXJlIGhvb2sgbG9nZ2luZy5cXG5cIik7XG4gICAgICAgICAgICBwcm9jZXNzLmV4aXQoRVhJVF9DT0RFUy5FUlJPUik7XG4gICAgICAgIH1cbiAgICAgICAgLy8gSWYgQ0xJIGxvZyBmaWxlIGlzIHNldCwgY29uZmlndXJlIHRoZSBsb2dnZXJcbiAgICAgICAgaWYgKGNsaUxvZ0ZpbGUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgbG9nZ2VyLnNldExvZ0ZpbGUoY2xpTG9nRmlsZSk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gUmVhZCBhbmQgcGFyc2Ugc3RkaW5cbiAgICAgICAgbGV0IHN0ZGluQ29udGVudDtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIHN0ZGluQ29udGVudCA9IGF3YWl0IHJlYWRTdGRpbigpO1xuICAgICAgICB9XG4gICAgICAgIGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgbG9nZ2VyLmxvZ0Vycm9yKGVycm9yLCBcIkZhaWxlZCB0byByZWFkIHN0ZGluXCIpO1xuICAgICAgICAgICAgb3V0cHV0ID0gY3JlYXRlTWFsZm9ybWVkSW5wdXRPdXRwdXQoZXJyb3IpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIC8vIFBhcnNlIGFuZCB0cmFuc2Zvcm0gaW5wdXRcbiAgICAgICAgbGV0IGlucHV0O1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgaW5wdXQgPSBwYXJzZVN0ZGluSW5wdXQoc3RkaW5Db250ZW50KTtcbiAgICAgICAgfVxuICAgICAgICBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIGxvZ2dlci5sb2dFcnJvcihlcnJvciwgXCJGYWlsZWQgdG8gcGFyc2Ugc3RkaW4gSlNPTlwiKTtcbiAgICAgICAgICAgIG91dHB1dCA9IGNyZWF0ZU1hbGZvcm1lZElucHV0T3V0cHV0KGVycm9yKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICAvLyBTZXQgbG9nZ2VyIGNvbnRleHRcbiAgICAgICAgY29uc3QgaG9va0V2ZW50TmFtZSA9IGhvb2tGbi5ob29rRXZlbnROYW1lO1xuICAgICAgICBsb2dnZXIuc2V0Q29udGV4dChob29rRXZlbnROYW1lLCBpbnB1dCk7XG4gICAgICAgIC8vIEJ1aWxkIGNvbnRleHQgLSBTZXNzaW9uU3RhcnQgaG9va3MgZ2V0IGV4dGVuZGVkIGNvbnRleHQgd2l0aCBwZXJzaXN0RW52VmFyXG4gICAgICAgIGNvbnN0IGNvbnRleHQgPSBob29rRXZlbnROYW1lID09PSBcIlNlc3Npb25TdGFydFwiID8geyBsb2dnZXIsIHBlcnNpc3RFbnZWYXIsIHBlcnNpc3RFbnZWYXJzIH0gOiB7IGxvZ2dlciB9O1xuICAgICAgICAvLyBFeGVjdXRlIGhhbmRsZXJcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IHNwZWNpZmljT3V0cHV0ID0gYXdhaXQgaG9va0ZuKGlucHV0LCBjb250ZXh0KTtcbiAgICAgICAgICAgIG91dHB1dCA9IGNvbnZlcnRUb0hvb2tPdXRwdXQoc3BlY2lmaWNPdXRwdXQpO1xuICAgICAgICB9XG4gICAgICAgIGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgLy8gSGFuZGxlciB0aHJldyAtIG91dHB1dCBzdGFja3RyYWNlIHRvIHN0ZGVyciBhbmQgZXhpdCB3aXRoIGNvZGUgMlxuICAgICAgICAgICAgLy8gVGhpcyBjYWxsIG5ldmVyIHJldHVybnMgKHByb2Nlc3MuZXhpdClcbiAgICAgICAgICAgIGhhbmRsZUhhbmRsZXJFcnJvcihlcnJvcik7XG4gICAgICAgIH1cbiAgICB9XG4gICAgZmluYWxseSB7XG4gICAgICAgIC8vIFdyaXRlIG91dHB1dCBpZiB3ZSBoYXZlIGl0XG4gICAgICAgIGlmIChvdXRwdXQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgd3JpdGVTdGRvdXQob3V0cHV0LnN0ZG91dCk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gQ2xlYXIgbG9nZ2VyIGNvbnRleHRcbiAgICAgICAgbG9nZ2VyLmNsZWFyQ29udGV4dCgpO1xuICAgICAgICBsb2dnZXIuY2xvc2UoKTtcbiAgICAgICAgLy8gRXhpdCB3aXRoIHN1Y2Nlc3MgKGhhbmRsZXIgZXJyb3JzIGV4aXQgdmlhIGhhbmRsZUhhbmRsZXJFcnJvciB3aXRoIGNvZGUgMilcbiAgICAgICAgcHJvY2Vzcy5leGl0KEVYSVRfQ09ERVMuU1VDQ0VTUyk7XG4gICAgfVxufVxuIiwgIi8qKlxuICogQG1vZHVsZSBAY2FyZHMvY2xhdWRlLWNvZGUtaG9va3MvYXBpXG4gKlxuICogQ2FyZHMgQVBJIGRpc2NvdmVyeSBhbmQgSFRUUCBoZWxwZXJzIHNoYXJlZCBieSBob29rIGVudHJ5cG9pbnRzLlxuICogVGhlc2UgdXRpbGl0aWVzIHJlYWQgYH4vLmNhcmRzL2NhcmRzLWFwaS5qc29uYCB0byBsb2NhdGUgdGhlIENhcmRzIEFQSSBhbmRcbiAqIGludGVudGlvbmFsbHkgZmFpbCBvcGVuIHNvIGhvb2sgZmFpbHVyZXMgZG8gbm90IGJsb2NrIENsYXVkZS5cbiAqIFNldCBgQVBJX1RFU1RfTU9ERT0xYCB0byBmb3JjZSBkZXRlcm1pbmlzdGljLCBsb2NhbCB2YWx1ZXMgaW4gdGVzdHMuXG4gKi9cblxuaW1wb3J0IHsgcmVhZEZpbGUsIHdyaXRlRmlsZSB9IGZyb20gJ25vZGU6ZnMvcHJvbWlzZXMnO1xuaW1wb3J0IHsgaG9tZWRpciB9IGZyb20gJ25vZGU6b3MnO1xuaW1wb3J0IHsgam9pbiB9IGZyb20gJ25vZGU6cGF0aCc7XG5pbXBvcnQgdHlwZSB7IENhcmRzQXBpSW5mbywgU2Vzc2lvbkJhc2VsaW5lIH0gZnJvbSAnQGNhcmRzL3Byb3RvY29sJztcbmltcG9ydCB0eXBlIHsgTG9nZ2VyIH0gZnJvbSAnQGdvb2Rmb290L2NsYXVkZS1jb2RlLWhvb2tzJztcblxuLyoqXG4gKiBNaW5pbWFsIGNhcmQgcGF5bG9hZCB1c2VkIGJ5IGhvb2tzIGZvciBjb250ZXh0IGFuZCBtZXNzYWdpbmcuXG4gKiBFeHRyYSBwcm9wZXJ0aWVzIGFyZSBhbGxvd2VkIHNvIGNhbGxlcnMgY2FuIHBhc3MgdGhyb3VnaCByaWNoZXIgQVBJIGRhdGEuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgQ2FyZCB7XG4gIC8qKiBTdGFibGUgQ2FyZHMgaWRlbnRpZmllci4gKi9cbiAgaWQ6IHN0cmluZztcbiAgLyoqIEh1bWFuLXJlYWRhYmxlIHRpdGxlIHNob3duIGluIENsYXVkZSBjb250ZXh0LiAqL1xuICB0aXRsZTogc3RyaW5nO1xuICAvKiogV29ya2Zsb3cgc3RhdHVzIGF0IHRoZSBtb21lbnQgdGhlIGNhcmQgd2FzIGZldGNoZWQuICovXG4gIHN0YXR1czogc3RyaW5nO1xuICAvKiogQWRkaXRpb25hbCBmaWVsZHMgZnJvbSB0aGUgQ2FyZHMgQVBJIHBheWxvYWQuICovXG4gIFtrZXk6IHN0cmluZ106IHVua25vd247XG59XG5cbi8qKlxuICogQ29udGV4dCBhdHRhY2hlZCB0byBhbiB7QGxpbmsgQXBpRXJyb3J9IHRvIGVucmljaCBsb2dzLlxuICogUHJvdmlkZSBvbmx5IHdoYXQgeW91IGtub3c7IG1pc3NpbmcgZmllbGRzIGFyZSBvbWl0dGVkIGZyb20gdGhlIG1lc3NhZ2UuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgQXBpRXJyb3JPcHRpb25zIHtcbiAgLyoqIEhUVFAgbWV0aG9kIHVzZWQgaW4gdGhlIHJlcXVlc3QuICovXG4gIG1ldGhvZD86IHN0cmluZztcbiAgLyoqIFJlcXVlc3QgVVJMLiAqL1xuICB1cmw/OiBzdHJpbmc7XG4gIC8qKiBIVFRQIHN0YXR1cyBjb2RlIHJldHVybmVkIGJ5IHRoZSBzZXJ2ZXIuICovXG4gIHN0YXR1cz86IG51bWJlcjtcbiAgLyoqIEhUVFAgc3RhdHVzIHRleHQgcmV0dXJuZWQgYnkgdGhlIHNlcnZlci4gKi9cbiAgc3RhdHVzVGV4dD86IHN0cmluZztcbiAgLyoqIFNob3J0IHByZXZpZXcgb2YgdGhlIHJlc3BvbnNlIGJvZHkgKHRydW5jYXRlIGJlZm9yZSBhc3NpZ25pbmcpLiAqL1xuICByZXNwb25zZVByZXZpZXc/OiBzdHJpbmc7XG4gIC8qKiBPcmlnaW5hbCBlcnJvciB0aGF0IHRyaWdnZXJlZCB0aGlzIGZhaWx1cmUuICovXG4gIGNhdXNlPzogRXJyb3I7XG59XG5cbi8qKlxuICogRXJyb3Igd3JhcHBlciB0aGF0IGZvcm1hdHMgSFRUUCBjb250ZXh0IGludG8gdGhlIG1lc3NhZ2Ugc3RyaW5nLlxuICogVXNlIHRoaXMgd2hlbiB5b3Ugd2FudCBhIHNpbmdsZSB0aHJvd24gZXJyb3IgdG8gYmUgc2VsZi1jb250YWluZWQgaW4gbG9ncy5cbiAqXG4gKiBAc2VlIEFwaUVycm9yT3B0aW9uc1xuICovXG5leHBvcnQgY2xhc3MgQXBpRXJyb3IgZXh0ZW5kcyBFcnJvciB7XG4gIC8qKiBTdHJ1Y3R1cmVkIGNvbnRleHQgdXNlZCB0byBidWlsZCB0aGUgZm9ybWF0dGVkIG1lc3NhZ2UuICovXG4gIHB1YmxpYyByZWFkb25seSBvcHRpb25zPzogQXBpRXJyb3JPcHRpb25zO1xuXG4gIGNvbnN0cnVjdG9yKG1lc3NhZ2U6IHN0cmluZywgb3B0aW9ucz86IEFwaUVycm9yT3B0aW9ucykge1xuICAgIHN1cGVyKEFwaUVycm9yLmZvcm1hdE1lc3NhZ2UobWVzc2FnZSwgb3B0aW9ucyA/PyB7fSkpO1xuICAgIHRoaXMubmFtZSA9ICdBcGlFcnJvcic7XG4gICAgdGhpcy5vcHRpb25zID0gb3B0aW9ucztcbiAgICBpZiAob3B0aW9ucz8uY2F1c2UpIHtcbiAgICAgIHRoaXMuY2F1c2UgPSBvcHRpb25zLmNhdXNlO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBGb3JtYXRzIGEgaHVtYW4tcmVhZGFibGUgbWVzc2FnZSB1c2luZyBhbnkgYXZhaWxhYmxlIEhUVFAgY29udGV4dC5cbiAgICogRmllbGRzIGFyZSBhcHBlbmRlZCBvbiBzZXBhcmF0ZSBsaW5lcyB0byBrZWVwIGxvZ3Mgc2Nhbm5hYmxlLlxuICAgKlxuICAgKiBAcGFyYW0gbWVzc2FnZSAtIENvcmUgZXJyb3IgbWVzc2FnZS5cbiAgICogQHBhcmFtIG9wdGlvbnMgLSBPcHRpb25hbCBIVFRQIGNvbnRleHQgdXNlZCB0byBlbnJpY2ggdGhlIG1lc3NhZ2UuXG4gICAqIEByZXR1cm5zIEEgZm9ybWF0dGVkIG1lc3NhZ2Ugc3RyaW5nLlxuICAgKi9cbiAgc3RhdGljIGZvcm1hdE1lc3NhZ2UobWVzc2FnZTogc3RyaW5nLCBvcHRpb25zOiBBcGlFcnJvck9wdGlvbnMpOiBzdHJpbmcge1xuICAgIGNvbnN0IHBhcnRzOiBzdHJpbmdbXSA9IFttZXNzYWdlXTtcblxuICAgIGlmIChvcHRpb25zLm1ldGhvZCAmJiBvcHRpb25zLnVybCkge1xuICAgICAgcGFydHMucHVzaChgJHtvcHRpb25zLm1ldGhvZH0gJHtvcHRpb25zLnVybH1gKTtcbiAgICB9IGVsc2UgaWYgKG9wdGlvbnMudXJsKSB7XG4gICAgICBwYXJ0cy5wdXNoKGBVUkw6ICR7b3B0aW9ucy51cmx9YCk7XG4gICAgfVxuXG4gICAgaWYgKG9wdGlvbnMuc3RhdHVzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIGNvbnN0IHN0YXR1c1BhcnQgPSBvcHRpb25zLnN0YXR1c1RleHRcbiAgICAgICAgPyBgU3RhdHVzOiAke29wdGlvbnMuc3RhdHVzfSAke29wdGlvbnMuc3RhdHVzVGV4dH1gXG4gICAgICAgIDogYFN0YXR1czogJHtvcHRpb25zLnN0YXR1c31gO1xuICAgICAgcGFydHMucHVzaChzdGF0dXNQYXJ0KTtcbiAgICB9XG5cbiAgICBpZiAob3B0aW9ucy5yZXNwb25zZVByZXZpZXcpIHtcbiAgICAgIHBhcnRzLnB1c2goYFJlc3BvbnNlOiAke29wdGlvbnMucmVzcG9uc2VQcmV2aWV3fWApO1xuICAgIH1cblxuICAgIHJldHVybiBwYXJ0cy5sZW5ndGggPT09IDEgPyBtZXNzYWdlIDogcGFydHMuam9pbignXFxuJyk7XG4gIH1cbn1cblxuLyoqXG4gKiBSZWFkcyB0aGUgQ2FyZHMgQVBJIGRpc2NvdmVyeSBmaWxlIGFuZCByZXR1cm5zIHRoZSBmdWxsIHR5cGVkIHBheWxvYWQuXG4gKlxuICogVGhpcyBpcyB0aGUgc2FmZSB2YXJpYW50IG9mIHtAbGluayBkaXNjb3ZlckFwaVVybH07IGl0IG5ldmVyIHRocm93cyBhbmRcbiAqIGluc3RlYWQgcmV0dXJucyBgbnVsbGAgd2hlbiBkaXNjb3ZlcnkgZmFpbHMgKG1pc3NpbmcgZmlsZSwgaW52YWxpZCBKU09OLCBvclxuICogcmVxdWlyZWQgZmllbGRzIGFic2VudCkuIFRoZSBob29rIGxheWVyIHVzZXMgdGhpcyB0byBkZWdyYWRlIGdyYWNlZnVsbHkuXG4gKlxuICogUnVudGltZSBlZmZlY3RzOiByZWFkcyBgfi8uY2FyZHMvY2FyZHMtYXBpLmpzb25gLlxuICpcbiAqIEBwYXJhbSBsb2dnZXIgLSBPcHRpb25hbCBsb2dnZXIgZm9yIGRlYnVnIG91dHB1dC5cbiAqIEByZXR1cm5zIFRoZSBDYXJkc0FwaUluZm8gcGF5bG9hZCwgb3IgbnVsbCBpZiBkaXNjb3ZlcnkgZmFpbHMuXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBkaXNjb3ZlckFwaUluZm8obG9nZ2VyPzogTG9nZ2VyKTogUHJvbWlzZTxDYXJkc0FwaUluZm8gfCBudWxsPiB7XG4gIC8vIFRlc3QgbW9kZSByZXR1cm5zIHByZWRpY3RhYmxlIHZhbHVlXG4gIGlmIChwcm9jZXNzLmVudlsnQVBJX1RFU1RfTU9ERSddID09PSAnMScpIHtcbiAgICBsb2dnZXI/LmRlYnVnKCdBUElfVEVTVF9NT0RFOiBVc2luZyBtb2NrIEFQSSBpbmZvJyk7XG4gICAgcmV0dXJuIHtcbiAgICAgIGhvc3Q6ICdsb2NhbGhvc3QnLFxuICAgICAgcG9ydDogOTk5OSxcbiAgICAgIHBpZDogOTk5OTksXG4gICAgICBhY2Nlc3NUb2tlbjogJ3Rlc3QtdG9rZW4nLFxuICAgICAgc3RhcnRlZEF0OiAnMjAyNC0wMS0wMVQwMDowMDowMFonXG4gICAgfTtcbiAgfVxuXG4gIGNvbnN0IGNvbmZpZ1BhdGggPSBqb2luKGhvbWVkaXIoKSwgJy5jYXJkcycsICdjYXJkcy1hcGkuanNvbicpO1xuICB0cnkge1xuICAgIGNvbnN0IGNvbnRlbnQgPSBhd2FpdCByZWFkRmlsZShjb25maWdQYXRoLCAndXRmLTgnKTtcbiAgICBjb25zdCBjb25maWcgPSBKU09OLnBhcnNlKGNvbnRlbnQpIGFzIFJlY29yZDxzdHJpbmcsIHVua25vd24+O1xuXG4gICAgLy8gVmFsaWRhdGUgcmVxdWlyZWQgZmllbGRzXG4gICAgaWYgKFxuICAgICAgdHlwZW9mIGNvbmZpZ1snaG9zdCddICE9PSAnc3RyaW5nJyB8fFxuICAgICAgdHlwZW9mIGNvbmZpZ1sncG9ydCddICE9PSAnbnVtYmVyJyB8fFxuICAgICAgdHlwZW9mIGNvbmZpZ1snYWNjZXNzVG9rZW4nXSAhPT0gJ3N0cmluZycgfHxcbiAgICAgIHR5cGVvZiBjb25maWdbJ3BpZCddICE9PSAnbnVtYmVyJyB8fFxuICAgICAgdHlwZW9mIGNvbmZpZ1snc3RhcnRlZEF0J10gIT09ICdzdHJpbmcnXG4gICAgKSB7XG4gICAgICBsb2dnZXI/LmRlYnVnKCdBUEkgaW5mbyBkaXNjb3ZlcnkgZmFpbGVkJywgeyBlcnJvcjogJ0NvbmZpZyBtaXNzaW5nIHJlcXVpcmVkIGZpZWxkcycgfSk7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICByZXR1cm4ge1xuICAgICAgaG9zdDogY29uZmlnWydob3N0J10sXG4gICAgICBwb3J0OiBjb25maWdbJ3BvcnQnXSxcbiAgICAgIGFjY2Vzc1Rva2VuOiBjb25maWdbJ2FjY2Vzc1Rva2VuJ10sXG4gICAgICBwaWQ6IGNvbmZpZ1sncGlkJ10sXG4gICAgICBzdGFydGVkQXQ6IGNvbmZpZ1snc3RhcnRlZEF0J10sXG4gICAgICBzZXNzaW9uQmFzZWxpbmU6IGNvbmZpZ1snc2Vzc2lvbkJhc2VsaW5lJ10gYXMgU2Vzc2lvbkJhc2VsaW5lIHwgdW5kZWZpbmVkXG4gICAgfTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBsb2dnZXI/LmRlYnVnKCdBUEkgaW5mbyBkaXNjb3ZlcnkgZmFpbGVkJywgeyBlcnJvcjogU3RyaW5nKGVycm9yKSB9KTtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxufVxuXG4vKipcbiAqIFJlc29sdmVzIHRoZSBDYXJkcyBBUEkgYmFzZSBVUkwgdXNlZCBieSBob29rIEhUVFAgY2FsbHMuXG4gKlxuICogSXQgZmlyc3QgdHJpZXMge0BsaW5rIGRpc2NvdmVyQXBpSW5mb30gKGhvc3QvcG9ydCBmb3JtYXQpLiBJZiB0aGF0IGZhaWxzLFxuICogaXQgZmFsbHMgYmFjayB0byB0aGUgbGVnYWN5IGB1cmxgIGZpZWxkIGZvciBiYWNrd2FyZCBjb21wYXRpYmlsaXR5LlxuICpcbiAqIFJ1bnRpbWUgZWZmZWN0czogcmVhZHMgYH4vLmNhcmRzL2NhcmRzLWFwaS5qc29uYC5cbiAqXG4gKiBAcGFyYW0gbG9nZ2VyIC0gT3B0aW9uYWwgbG9nZ2VyIGZvciBkZWJ1ZyBvdXRwdXQuXG4gKiBAcmV0dXJucyBCYXNlIFVSTCBzdWNoIGFzIGBodHRwOi8vaG9zdDpwb3J0YCBvciB0aGUgbGVnYWN5IGB1cmxgIHZhbHVlLlxuICogQHRocm93cyB7QXBpRXJyb3J9IElmIHRoZSBjb25maWcgZmlsZSBpcyBtaXNzaW5nLCBpbnZhbGlkLCBvciBsYWNrcyBhIFVSTC5cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGRpc2NvdmVyQXBpVXJsKGxvZ2dlcj86IExvZ2dlcik6IFByb21pc2U8c3RyaW5nPiB7XG4gIC8vIFRlc3QgbW9kZSByZXR1cm5zIHByZWRpY3RhYmxlIHZhbHVlXG4gIGlmIChwcm9jZXNzLmVudlsnQVBJX1RFU1RfTU9ERSddID09PSAnMScpIHtcbiAgICBsb2dnZXI/LmRlYnVnKCdBUElfVEVTVF9NT0RFOiBVc2luZyBtb2NrIFVSTCcpO1xuICAgIHJldHVybiAnaHR0cDovL2xvY2FsaG9zdDo5OTk5L3Rlc3QtYXBpJztcbiAgfVxuXG4gIC8vIFRyeSBuZXcgZm9ybWF0IGZpcnN0IChDYXJkc0FwaUluZm8gd2l0aCBob3N0L3BvcnQpXG4gIGNvbnN0IGluZm8gPSBhd2FpdCBkaXNjb3ZlckFwaUluZm8obG9nZ2VyKTtcbiAgaWYgKGluZm8pIHtcbiAgICByZXR1cm4gYGh0dHA6Ly8ke2luZm8uaG9zdH06JHtpbmZvLnBvcnR9YDtcbiAgfVxuXG4gIC8vIEZhbGwgYmFjayB0byBvbGQgZm9ybWF0IChkaXJlY3QgdXJsIGZpZWxkKSBmb3IgYmFja3dhcmQgY29tcGF0aWJpbGl0eVxuICBjb25zdCBjb25maWdQYXRoID0gam9pbihob21lZGlyKCksICcuY2FyZHMnLCAnY2FyZHMtYXBpLmpzb24nKTtcbiAgdHJ5IHtcbiAgICBjb25zdCBjb250ZW50ID0gYXdhaXQgcmVhZEZpbGUoY29uZmlnUGF0aCwgJ3V0Zi04Jyk7XG4gICAgY29uc3QgY29uZmlnID0gSlNPTi5wYXJzZShjb250ZW50KSBhcyB7IHVybD86IHN0cmluZyB9O1xuICAgIGlmICghY29uZmlnWyd1cmwnXSkge1xuICAgICAgdGhyb3cgbmV3IEFwaUVycm9yKCdBUEkgVVJMIG5vdCBmb3VuZCBpbiBjb25maWcnKTtcbiAgICB9XG4gICAgcmV0dXJuIGNvbmZpZ1sndXJsJ107XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgbG9nZ2VyPy5kZWJ1ZygnQVBJIGRpc2NvdmVyeSBmYWlsZWQnLCB7IGVycm9yOiBTdHJpbmcoZXJyb3IpIH0pO1xuICAgIC8vIElmIGl0J3MgYWxyZWFkeSBhbiBBcGlFcnJvciwgcHJlc2VydmUgaXRcbiAgICBpZiAoZXJyb3IgaW5zdGFuY2VvZiBBcGlFcnJvcikge1xuICAgICAgdGhyb3cgZXJyb3I7XG4gICAgfVxuICAgIHRocm93IG5ldyBBcGlFcnJvcihgQVBJIGRpc2NvdmVyeSBmYWlsZWQ6ICR7ZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiBTdHJpbmcoZXJyb3IpfWAsIHtcbiAgICAgIGNhdXNlOiBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IgOiB1bmRlZmluZWRcbiAgICB9KTtcbiAgfVxufVxuXG4vKipcbiAqIEZldGNoZXMgYSBzaW5nbGUgY2FyZCBieSBJRC5cbiAqXG4gKiBVc2VzIGEgNXMgdGltZW91dCBhbmQgcmV0dXJucyBgbnVsbGAgZm9yIG5vbi1PSyByZXNwb25zZXMgb3IgbmV0d29ya1xuICogZmFpbHVyZXMgc28gaG9va3MgY2FuIGZhaWwgb3BlbiByYXRoZXIgdGhhbiBibG9ja2luZyBDbGF1ZGUuXG4gKlxuICogQHBhcmFtIGNhcmRJZCAtIENhcmQgaWRlbnRpZmllciB1c2VkIGluIHRoZSBBUEkgcGF0aC5cbiAqIEBwYXJhbSBiYXNlVXJsIC0gQ2FyZHMgQVBJIGJhc2UgVVJMLlxuICogQHBhcmFtIGxvZ2dlciAtIE9wdGlvbmFsIGxvZ2dlciBmb3IgZGVidWcgb3V0cHV0LlxuICogQHJldHVybnMgVGhlIGNhcmQgcGF5bG9hZCwgb3IgbnVsbCBpZiB0aGUgcmVxdWVzdCBmYWlscy5cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGZldGNoQ2FyZChjYXJkSWQ6IHN0cmluZywgYmFzZVVybDogc3RyaW5nLCBsb2dnZXI/OiBMb2dnZXIpOiBQcm9taXNlPENhcmQgfCBudWxsPiB7XG4gIHRyeSB7XG4gICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBmZXRjaChgJHtiYXNlVXJsfS9jYXJkcy8ke2NhcmRJZH1gLCB7XG4gICAgICBzaWduYWw6IEFib3J0U2lnbmFsLnRpbWVvdXQoNTAwMClcbiAgICB9KTtcbiAgICBpZiAoIXJlc3BvbnNlLm9rKSB7XG4gICAgICBsb2dnZXI/LmRlYnVnKCdDYXJkIGZldGNoIGZhaWxlZCcsIHsgc3RhdHVzOiByZXNwb25zZS5zdGF0dXMgfSk7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgcmV0dXJuIChhd2FpdCByZXNwb25zZS5qc29uKCkpIGFzIENhcmQ7XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgbG9nZ2VyPy5kZWJ1ZygnQ2FyZCBmZXRjaCBlcnJvcicsIHsgZXJyb3I6IFN0cmluZyhlcnJvcikgfSk7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbn1cblxuLyoqXG4gKiBDaGVja3Mgd2hldGhlciBhIGNhcmQgaGFzIGNoYW5nZWQgc2luY2UgYSBiYXNlbGluZSB0aW1lc3RhbXAuXG4gKlxuICogV2hlbiBgc2luY2VgIGlzIHByb3ZpZGVkLCB0aGUgQVBJIGNoZWNrIGlzXG4gKiBgR0VUIC9jYXJkcy86aWQvaGFzLXVwZGF0ZXM/c2luY2U9Li4uYDsgb3RoZXJ3aXNlIGl0IGNhbGxzIHRoZSBlbmRwb2ludFxuICogd2l0aG91dCBhIGJhc2VsaW5lLiBGYWlsdXJlcyByZXR1cm4gYGZhbHNlYCB0byBhdm9pZCBibG9ja2luZyBzdG9wIGhvb2tzLlxuICpcbiAqIEBwYXJhbSBjYXJkSWQgLSBDYXJkIGlkZW50aWZpZXIgdG8gY2hlY2suXG4gKiBAcGFyYW0gYmFzZVVybCAtIENhcmRzIEFQSSBiYXNlIFVSTC5cbiAqIEBwYXJhbSBzaW5jZSAtIE9wdGlvbmFsIElTTyA4NjAxIHRpbWVzdGFtcCBjYXB0dXJlZCBhdCBzZXNzaW9uIHN0YXJ0LlxuICogQHBhcmFtIGxvZ2dlciAtIE9wdGlvbmFsIGxvZ2dlciBmb3IgZGVidWcgb3V0cHV0LlxuICogQHJldHVybnMgVHJ1ZSBpZiB0aGUgQVBJIHJlcG9ydHMgdXBkYXRlcywgb3RoZXJ3aXNlIGZhbHNlIChpbmNsdWRpbmcgZXJyb3JzKS5cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGNoZWNrUmVtb3RlVXBkYXRlcyhcbiAgY2FyZElkOiBzdHJpbmcsXG4gIGJhc2VVcmw6IHN0cmluZyxcbiAgc2luY2U/OiBzdHJpbmcsXG4gIGxvZ2dlcj86IExvZ2dlclxuKTogUHJvbWlzZTxib29sZWFuPiB7XG4gIC8vIFRlc3QgbW9kZSByZXR1cm5zIHByZWRpY3RhYmxlIHZhbHVlXG4gIGlmIChwcm9jZXNzLmVudlsnQVBJX1RFU1RfTU9ERSddID09PSAnMScpIHtcbiAgICBsb2dnZXI/LmRlYnVnKCdBUElfVEVTVF9NT0RFOiBSZXR1cm5pbmcgZmFsc2UgZm9yIGNoZWNrUmVtb3RlVXBkYXRlcycpO1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIHRyeSB7XG4gICAgY29uc3QgdXJsID0gc2luY2VcbiAgICAgID8gYCR7YmFzZVVybH0vY2FyZHMvJHtjYXJkSWR9L2hhcy11cGRhdGVzP3NpbmNlPSR7ZW5jb2RlVVJJQ29tcG9uZW50KHNpbmNlKX1gXG4gICAgICA6IGAke2Jhc2VVcmx9L2NhcmRzLyR7Y2FyZElkfS9oYXMtdXBkYXRlc2A7XG4gICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBmZXRjaCh1cmwsIHsgc2lnbmFsOiBBYm9ydFNpZ25hbC50aW1lb3V0KDUwMDApIH0pO1xuICAgIGlmICghcmVzcG9uc2Uub2spIHJldHVybiBmYWxzZTtcblxuICAgIGNvbnN0IGRhdGEgPSAoYXdhaXQgcmVzcG9uc2UuanNvbigpKSBhcyB7IGhhc1VwZGF0ZXM6IGJvb2xlYW4gfTtcbiAgICByZXR1cm4gZGF0YS5oYXNVcGRhdGVzO1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGxvZ2dlcj8uZGVidWcoJ0NoZWNrIHJlbW90ZSB1cGRhdGVzIGZhaWxlZCcsIHsgZXJyb3I6IFN0cmluZyhlcnJvcikgfSk7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG59XG5cbi8qKlxuICogV3JpdGVzIHNlc3Npb24gYmFzZWxpbmUgdG8gdGhlIEFQSSBkaXNjb3ZlcnkgZmlsZS5cbiAqXG4gKiBQZXJzaXN0cyBhIGBzZXNzaW9uQmFzZWxpbmVgIGVudHJ5IGluIGB+Ly5jYXJkcy9jYXJkcy1hcGkuanNvbmAgc29cbiAqIHtAbGluayBkaXNjb3ZlckFwaUluZm99IGNhbiBzdXJmYWNlIGl0IHRvIHRoZSBzdG9wIGhvb2suIFRoaXMgaXMgYmVzdC1lZmZvcnRcbiAqIG1ldGFkYXRhOiBmYWlsdXJlcyBhcmUgbG9nZ2VkIGFuZCBzd2FsbG93ZWQuXG4gKlxuICogQHBhcmFtIGNhcmRJZCAtIENhcmQgaWRlbnRpZmllciBiZWluZyB0cmFja2VkLlxuICogQHBhcmFtIHVwZGF0ZWRBdCAtIElTTyA4NjAxIHRpbWVzdGFtcCBmcm9tIHRoZSBjYXJkJ3MgYHVwZGF0ZWRBdGAgZmllbGQuXG4gKiBAcGFyYW0gbG9nZ2VyIC0gT3B0aW9uYWwgbG9nZ2VyIGZvciBkZWJ1ZyBvdXRwdXQuXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiB3cml0ZVNlc3Npb25CYXNlbGluZShjYXJkSWQ6IHN0cmluZywgdXBkYXRlZEF0OiBzdHJpbmcsIGxvZ2dlcj86IExvZ2dlcik6IFByb21pc2U8dm9pZD4ge1xuICBjb25zdCBjb25maWdQYXRoID0gam9pbihob21lZGlyKCksICcuY2FyZHMnLCAnY2FyZHMtYXBpLmpzb24nKTtcbiAgdHJ5IHtcbiAgICBjb25zdCBjb250ZW50ID0gYXdhaXQgcmVhZEZpbGUoY29uZmlnUGF0aCwgJ3V0Zi04Jyk7XG4gICAgY29uc3QgY29uZmlnID0gSlNPTi5wYXJzZShjb250ZW50KSBhcyBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPjtcbiAgICBjb25maWdbJ3Nlc3Npb25CYXNlbGluZSddID0geyBjYXJkSWQsIHVwZGF0ZWRBdCB9O1xuICAgIGF3YWl0IHdyaXRlRmlsZShjb25maWdQYXRoLCBKU09OLnN0cmluZ2lmeShjb25maWcsIG51bGwsIDIpKTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBsb2dnZXI/LmRlYnVnKCdGYWlsZWQgdG8gd3JpdGUgc2Vzc2lvbiBiYXNlbGluZScsIHsgZXJyb3I6IFN0cmluZyhlcnJvcikgfSk7XG4gIH1cbn1cbiIsICIvKipcbiAqIEBtb2R1bGUgQGNhcmRzL2NsYXVkZS1jb2RlLWhvb2tzL2NsYXVkZS1jb2RlLWNsaS9zdG9wXG4gKlxuICogU3RvcCBob29rIHRoYXQgYmxvY2tzIENsYXVkZSBmcm9tIGlkbGluZyB3aGVuIHRoZSBsaW5rZWQgY2FyZCBoYXMgdXBkYXRlcy5cbiAqIEl0IGZhaWxzIG9wZW4gb24gQVBJIGVycm9ycyBzbyBhIHRyYW5zaWVudCBvdXRhZ2UgZG9lcyBub3QgdHJhcCB0aGUgdXNlci5cbiAqL1xuXG5pbXBvcnQgeyBzdG9wSG9vaywgc3RvcE91dHB1dCB9IGZyb20gJ0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcyc7XG5pbXBvcnQgeyBjaGVja1JlbW90ZVVwZGF0ZXMsIGRpc2NvdmVyQXBpSW5mbywgZGlzY292ZXJBcGlVcmwgfSBmcm9tICcuLi9saWIvYXBpLmpzJztcblxuLyoqXG4gKiBTdG9wIGhvb2sgaW1wbGVtZW50YXRpb24gdGhhdCBjaGVja3MgdGhlIENhcmRzIEFQSSBmb3IgdXBkYXRlcy5cbiAqXG4gKiBCZWhhdmlvcjpcbiAqIC0gTWlzc2luZyBgc2Vzc2lvbl9pZGA6IGFwcHJvdmUgKG5vLW9wKS5cbiAqIC0gTWlzc2luZyBgQ0FSRF9JRGA6IGFwcHJvdmUgd2l0aCBhIFwiTm8gY2FyZCB0cmFja2luZ1wiIG1lc3NhZ2UuXG4gKiAtIERpc2NvdmVyeSBvciBBUEkgZXJyb3JzOiBhcHByb3ZlIHRvIGF2b2lkIGJsb2NraW5nIENsYXVkZS5cbiAqIC0gUmVtb3RlIHVwZGF0ZXM6IGJsb2NrIHdpdGggYSByZWFzb24gYW5kIHN5c3RlbU1lc3NhZ2UuXG4gKiAtIE5vIHVwZGF0ZXM6IGFwcHJvdmUuXG4gKlxuICogSWYgYSBgc2Vzc2lvbkJhc2VsaW5lYCBpcyBhdmFpbGFibGUgZnJvbSB7QGxpbmsgZGlzY292ZXJBcGlJbmZvfSwgaXQgaXNcbiAqIHBhc3NlZCB0aHJvdWdoIGFzIHRoZSBgc2luY2VgIHBhcmFtZXRlciB0byByZWR1Y2UgZmFsc2UgcG9zaXRpdmVzLlxuICpcbiAqIFJ1bnRpbWUgZWZmZWN0czogcmVhZHMgYH4vLmNhcmRzL2NhcmRzLWFwaS5qc29uYCBhbmQgaXNzdWVzIGEgbmV0d29yayByZXF1ZXN0LlxuICpcbiAqIEBwYXJhbSBpbnB1dCAtIFN0b3AgaG9vayBpbnB1dCBjb250YWluaW5nIGBzZXNzaW9uX2lkYC5cbiAqIEBwYXJhbSBjb250ZXh0IC0gSG9vayBjb250ZXh0IGNvbnRhaW5pbmcgYSBsb2dnZXIuXG4gKiBAcmV0dXJucyBPdXRwdXQgcGF5bG9hZCB3aXRoIGEgZGVjaXNpb24gb2YgXCJhcHByb3ZlXCIgb3IgXCJibG9ja1wiLlxuICogQHNlZSBkaXNjb3ZlckFwaUluZm9cbiAqIEBzZWUgZGlzY292ZXJBcGlVcmxcbiAqIEBzZWUgY2hlY2tSZW1vdGVVcGRhdGVzXG4gKi9cbmV4cG9ydCBkZWZhdWx0IHN0b3BIb29rKHt9LCBhc3luYyAoaW5wdXQsIHsgbG9nZ2VyIH0pID0+IHtcbiAgY29uc3Qgc2Vzc2lvbklkID0gaW5wdXQuc2Vzc2lvbl9pZDtcbiAgaWYgKCFzZXNzaW9uSWQpIHtcbiAgICByZXR1cm4gc3RvcE91dHB1dCh7IGRlY2lzaW9uOiAnYXBwcm92ZScgfSk7XG4gIH1cblxuICBjb25zdCBjYXJkSWQgPSBwcm9jZXNzLmVudlsnQ0FSRF9JRCddO1xuICBpZiAoIWNhcmRJZCkge1xuICAgIHJldHVybiBzdG9wT3V0cHV0KHtcbiAgICAgIGRlY2lzaW9uOiAnYXBwcm92ZScsXG4gICAgICBzeXN0ZW1NZXNzYWdlOiAnTm8gY2FyZCB0cmFja2luZydcbiAgICB9KTtcbiAgfVxuXG4gIHRyeSB7XG4gICAgLy8gR2V0IEFQSSBpbmZvIGZvciBib3RoIFVSTCBhbmQgYmFzZWxpbmVcbiAgICBjb25zdCBhcGlJbmZvID0gYXdhaXQgZGlzY292ZXJBcGlJbmZvKGxvZ2dlcik7XG4gICAgY29uc3QgYmFzZVVybCA9IGFwaUluZm8gPyBgaHR0cDovLyR7YXBpSW5mby5ob3N0fToke2FwaUluZm8ucG9ydH1gIDogYXdhaXQgZGlzY292ZXJBcGlVcmwobG9nZ2VyKTtcbiAgICBjb25zdCBiYXNlbGluZVRpbWVzdGFtcCA9IGFwaUluZm8/LnNlc3Npb25CYXNlbGluZT8udXBkYXRlZEF0O1xuXG4gICAgY29uc3QgaGFzVXBkYXRlcyA9IGF3YWl0IGNoZWNrUmVtb3RlVXBkYXRlcyhjYXJkSWQsIGJhc2VVcmwsIGJhc2VsaW5lVGltZXN0YW1wLCBsb2dnZXIpO1xuXG4gICAgaWYgKGhhc1VwZGF0ZXMpIHtcbiAgICAgIHJldHVybiBzdG9wT3V0cHV0KHtcbiAgICAgICAgZGVjaXNpb246ICdibG9jaycsXG4gICAgICAgIHJlYXNvbjogJ0NhcmQgaGFzIHJlbW90ZSB1cGRhdGVzJyxcbiAgICAgICAgc3lzdGVtTWVzc2FnZTogJ0NhcmQgaGFzIHVwZGF0ZXMgc2luY2UgeW91ciBzZXNzaW9uIHN0YXJ0ZWQuIFBsZWFzZSBzeW5jIGJlZm9yZSBzdG9wcGluZy4nXG4gICAgICB9KTtcbiAgICB9XG5cbiAgICByZXR1cm4gc3RvcE91dHB1dCh7IGRlY2lzaW9uOiAnYXBwcm92ZScgfSk7XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgbG9nZ2VyLndhcm4oJ1N0b3AgaG9vayBlcnJvcicsIHsgZXJyb3I6IFN0cmluZyhlcnJvcikgfSk7XG4gICAgcmV0dXJuIHN0b3BPdXRwdXQoeyBkZWNpc2lvbjogJ2FwcHJvdmUnIH0pO1xuICB9XG59KTtcbiIsICJwcm9jZXNzLmVudlsnQ0xBVURFX0NPREVfSE9PS1NfQ0xJX0xPR19GSUxFJ10gPSBcIi90bXAvaG9va3MtY2xpLmxvZ1wiO1xuXG5pbXBvcnQgaG9vayBmcm9tICcuL3N0b3AudHMnO1xuaW1wb3J0IHsgZXhlY3V0ZSB9IGZyb20gJy4uLy4uLy4uLy4uLy4uL25vZGVfbW9kdWxlcy9AZ29vZGZvb3QvY2xhdWRlLWNvZGUtaG9va3MvZGlzdC9ydW50aW1lLmpzJztcblxuZXhlY3V0ZShob29rKTtcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFrQ0EsWUFBWSxRQUFRO0FBTWIsSUFBTSxrQkFBa0I7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBSzNCLGFBQWE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFNYixVQUFVO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQUtWLFFBQVE7QUFDWjtBQWtDTyxTQUFTLGlCQUFpQjtBQUM3QixTQUFPLFFBQVEsSUFBSSxnQkFBZ0IsUUFBUTtBQUMvQztBQThDTyxTQUFTLGNBQWMsTUFBTSxPQUFPO0FBQ3ZDLFFBQU0sVUFBVSxlQUFlO0FBQy9CLE1BQUksWUFBWSxRQUFXO0FBQ3ZCLFVBQU0sSUFBSSxNQUFNLHdHQUE2RztBQUFBLEVBQ2pJO0FBRUEsUUFBTSxlQUFlLGlCQUFpQixLQUFLO0FBRTNDLFFBQU0sa0JBQWtCLFVBQVUsSUFBSSxJQUFJLFlBQVk7QUFBQTtBQUN0RCxFQUFHLGtCQUFlLFNBQVMsaUJBQWlCLE9BQU87QUFDdkQ7QUFpQk8sU0FBUyxlQUFlLE1BQU07QUFDakMsYUFBVyxDQUFDLE1BQU0sS0FBSyxLQUFLLE9BQU8sUUFBUSxJQUFJLEdBQUc7QUFDOUMsa0JBQWMsTUFBTSxLQUFLO0FBQUEsRUFDN0I7QUFDSjtBQVVBLFNBQVMsaUJBQWlCLE9BQU87QUFHN0IsUUFBTSxVQUFVLE1BQU0sUUFBUSxNQUFNLE9BQU87QUFDM0MsU0FBTyxJQUFJLE9BQU87QUFDdEI7OztBQ3BKQSxTQUFTLG1CQUFtQixlQUFlLFFBQVEsU0FBUztBQUN4RCxRQUFNLFNBQVMs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
