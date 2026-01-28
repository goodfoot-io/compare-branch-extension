#!/usr/bin/env -S node --enable-source-maps
// ../../node_modules/@goodfoot/claude-code-hooks/dist/env.js
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

// ../../node_modules/@goodfoot/claude-code-hooks/dist/hooks.js
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

// ../../node_modules/@goodfoot/claude-code-hooks/dist/logger.js
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

// ../../node_modules/@goodfoot/claude-code-hooks/dist/outputs.js
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

// ../../node_modules/@goodfoot/claude-code-hooks/dist/runtime.js
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
import { execSync } from "node:child_process";
var ApiError = class _ApiError extends Error {
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
   * Formats an error message with optional details.
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
function discoverApiUrl(logger2) {
  const pluginRoot = process.env.CLAUDE_PLUGIN_ROOT;
  if (!pluginRoot) {
    throw new ApiError("CLAUDE_PLUGIN_ROOT environment variable is not set");
  }
  try {
    const result = execSync(`"${pluginRoot}/bin/discover-workspace-api.sh"`, {
      encoding: "utf-8",
      timeout: 5e3,
      stdio: ["pipe", "pipe", "pipe"]
    });
    return result.trim();
  } catch (error) {
    const execError = error;
    const exitCode = execError.status ?? "unknown";
    const stderr = execError.stderr ? String(execError.stderr) : "unknown";
    logger2?.debug("API discovery failed", { error: String(error) });
    throw new ApiError(`API discovery script failed (exit code: ${exitCode}, stderr: ${stderr})`, {
      cause: error instanceof Error ? error : new Error(String(error))
    });
  }
}
async function fetchIssueDiff(sessionId, issueId, baseUrl, logger2) {
  const url = `${baseUrl}/session/${sessionId}/diff?issueIds=${issueId}`;
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(5e3)
    });
    if (!response.ok) {
      const responseText = await response.text();
      const responsePreview = responseText.slice(0, 200);
      logger2?.debug("Issue diff fetch failed", { status: response.status });
      throw new ApiError("Issue diff fetch failed", {
        url,
        status: response.status,
        statusText: response.statusText,
        responsePreview
      });
    }
    return await response.json();
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    logger2?.debug("Issue diff fetch error", { error: String(error) });
    throw new ApiError(`Issue diff fetch error: ${error instanceof Error ? error.message : String(error)}`, {
      url,
      cause: error instanceof Error ? error : new Error(String(error))
    });
  }
}
async function notifySessionStop(sessionId, dispatcherPid, baseUrl, logger2) {
  try {
    const response = await fetch(`${baseUrl}/session/stop`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, dispatcherPid }),
      signal: AbortSignal.timeout(2e3)
    });
    return response.ok;
  } catch (error) {
    logger2?.debug("Notify session stop failed", { error: String(error) });
    return false;
  }
}

// src/lib/ipc.ts
function getDispatcherPid() {
  const pid = process.env.DISPATCHER_PID;
  if (!pid) {
    return null;
  }
  const parsed = Number.parseInt(pid, 10);
  return Number.isNaN(parsed) ? null : parsed;
}
function signalIdle(pid, logger2) {
  if (process.env.SESSION_STOP_TEST_MODE === "1") {
    logger2?.debug("TEST_MODE: Would send SIGWINCH", { pid });
    return true;
  }
  try {
    process.kill(pid, "SIGWINCH");
    return true;
  } catch (error) {
    logger2?.warn("Failed to signal dispatcher idle", {
      pid,
      error: String(error)
    });
    return false;
  }
}

// src/lib/output-helpers.ts
function hasUpdates(diff) {
  return diff.jsonPatch.length > 0;
}
function buildUpdateSummary(diff) {
  let commentCount = 0;
  let changeCount = 0;
  for (const patch of diff.jsonPatch) {
    if (patch.op === "add" && patch.path === "/comments/-") {
      commentCount++;
    } else if (patch.op === "replace") {
      changeCount++;
    }
  }
  const parts = [];
  if (commentCount > 0) {
    parts.push(commentCount === 1 ? "1 new comment" : `${commentCount} new comments`);
  }
  if (changeCount > 0) {
    parts.push(changeCount === 1 ? "1 field change" : `${changeCount} field changes`);
  }
  const summary = parts.join(" and ");
  const issueCount = diff.issues.length;
  if (issueCount === 1) {
    const issueTitle = diff.issues[0].issueTitle ?? "unknown";
    return `Issue updated: ${summary} on "${issueTitle}"`;
  }
  return `Issues updated: ${summary} across ${issueCount} issues`;
}

// src/lib/state.ts
import { existsSync as existsSync2, mkdirSync as mkdirSync2, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
var STATE_DIR = join(homedir(), ".compare-branch", "hook-state");
function getStateFile(sessionId) {
  return join(STATE_DIR, `${sessionId}.json`);
}
function ensureStateDir() {
  if (!existsSync2(STATE_DIR)) {
    mkdirSync2(STATE_DIR, { recursive: true });
  }
}
function readState(sessionId, logger2) {
  const stateFile = getStateFile(sessionId);
  if (existsSync2(stateFile)) {
    try {
      const content = readFileSync(stateFile, "utf-8");
      return JSON.parse(content);
    } catch (error) {
      logger2?.debug("Failed to read state file", { error: String(error) });
    }
  }
  return { cliSkills: [] };
}
function writeState(sessionId, state, logger2) {
  ensureStateDir();
  const stateFile = getStateFile(sessionId);
  try {
    writeFileSync(stateFile, JSON.stringify(state, null, 2), "utf-8");
  } catch (error) {
    logger2?.warn("Failed to write state file", { error: String(error) });
  }
}
function hasApiFailureBeenReported(sessionId, logger2) {
  const state = readState(sessionId, logger2);
  return state.apiFailureReported === true;
}
function markApiFailureReported(sessionId, logger2) {
  const state = readState(sessionId, logger2);
  state.apiFailureReported = true;
  writeState(sessionId, state, logger2);
}

// src/stop.ts
var stop_default = stopHook({}, async (input, { logger: logger2 }) => {
  if (process.env.EPHEMERAL_SESSION === "true") {
    return stopOutput({ decision: "approve" });
  }
  const sessionId = input.session_id;
  if (!sessionId) {
    return stopOutput({ decision: "approve" });
  }
  const issueId = process.env.ISSUE_ID;
  if (!issueId) {
    logger2.warn("ISSUE_ID not set - this hook requires the issue launcher");
    return stopOutput({
      decision: "approve",
      systemMessage: "Stop approved (no issue tracking)"
    });
  }
  let baseUrl;
  let diffResponse;
  try {
    baseUrl = discoverApiUrl(logger2);
    diffResponse = await fetchIssueDiff(sessionId, issueId, baseUrl, logger2);
  } catch (error) {
    logger2.debug("API error", { error: String(error) });
    if (hasApiFailureBeenReported(sessionId, logger2)) {
      logger2.debug("API failure already reported, approving stop to break loop");
      return stopOutput({
        decision: "approve",
        systemMessage: "Stop approved (API failure already reported)"
      });
    }
    markApiFailureReported(sessionId, logger2);
    return stopOutput({
      decision: "block",
      reason: `API unavailable: ${error instanceof Error ? error.message : String(error)}`,
      systemMessage: "The Issues API is unavailable. This is a catastrophic failure. Check that VSCode is running with the Compare Branch extension active."
    });
  }
  if (!hasUpdates(diffResponse)) {
    const dispatcherPid = getDispatcherPid();
    if (dispatcherPid) {
      await notifySessionStop(sessionId, dispatcherPid, baseUrl, logger2);
      signalIdle(dispatcherPid, logger2);
    }
    return stopOutput({
      decision: "approve",
      systemMessage: `Issue \`${issueId}\` has no updates.`
    });
  }
  const systemMsg = buildUpdateSummary(diffResponse);
  const patchJson = JSON.stringify(diffResponse.jsonPatch);
  return stopOutput({
    decision: "block",
    reason: `**Issue JSON patch**
\`\`\`json
${patchJson}
\`\`\``,
    systemMessage: systemMsg
  });
});

// ../../../../../tmp/claude-code-hooks-build/379ae11c7e60dcd0/wrapper.ts
process.env["CLAUDE_CODE_HOOKS_CLI_LOG_FILE"] = "/workspace/hooks.log";
execute(stop_default);
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vLi4vLi4vd29ya3NwYWNlLy53b3JrdHJlZXMvaXNzdWVzLXYyLWxpc3Qtd2Vidmlldy9ub2RlX21vZHVsZXMvQGdvb2Rmb290L2NsYXVkZS1jb2RlLWhvb2tzL2Rpc3QvZW52LmpzIiwgIi4uLy4uLy4uL3dvcmtzcGFjZS8ud29ya3RyZWVzL2lzc3Vlcy12Mi1saXN0LXdlYnZpZXcvbm9kZV9tb2R1bGVzL0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcy9kaXN0L2hvb2tzLmpzIiwgIi4uLy4uLy4uL3dvcmtzcGFjZS8ud29ya3RyZWVzL2lzc3Vlcy12Mi1saXN0LXdlYnZpZXcvbm9kZV9tb2R1bGVzL0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcy9kaXN0L2xvZ2dlci5qcyIsICIuLi8uLi8uLi93b3Jrc3BhY2UvLndvcmt0cmVlcy9pc3N1ZXMtdjItbGlzdC13ZWJ2aWV3L25vZGVfbW9kdWxlcy9AZ29vZGZvb3QvY2xhdWRlLWNvZGUtaG9va3MvZGlzdC9vdXRwdXRzLmpzIiwgIi4uLy4uLy4uL3dvcmtzcGFjZS8ud29ya3RyZWVzL2lzc3Vlcy12Mi1saXN0LXdlYnZpZXcvbm9kZV9tb2R1bGVzL0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcy9kaXN0L3J1bnRpbWUuanMiLCAiLi4vLi4vLi4vd29ya3NwYWNlLy53b3JrdHJlZXMvaXNzdWVzLXYyLWxpc3Qtd2Vidmlldy9wYWNrYWdlcy9jbGF1ZGUtY29kZS1jbGktaG9va3Mvc3JjL2xpYi9hcGkudHMiLCAiLi4vLi4vLi4vd29ya3NwYWNlLy53b3JrdHJlZXMvaXNzdWVzLXYyLWxpc3Qtd2Vidmlldy9wYWNrYWdlcy9jbGF1ZGUtY29kZS1jbGktaG9va3Mvc3JjL2xpYi9pcGMudHMiLCAiLi4vLi4vLi4vd29ya3NwYWNlLy53b3JrdHJlZXMvaXNzdWVzLXYyLWxpc3Qtd2Vidmlldy9wYWNrYWdlcy9jbGF1ZGUtY29kZS1jbGktaG9va3Mvc3JjL2xpYi9vdXRwdXQtaGVscGVycy50cyIsICIuLi8uLi8uLi93b3Jrc3BhY2UvLndvcmt0cmVlcy9pc3N1ZXMtdjItbGlzdC13ZWJ2aWV3L3BhY2thZ2VzL2NsYXVkZS1jb2RlLWNsaS1ob29rcy9zcmMvbGliL3N0YXRlLnRzIiwgIi4uLy4uLy4uL3dvcmtzcGFjZS8ud29ya3RyZWVzL2lzc3Vlcy12Mi1saXN0LXdlYnZpZXcvcGFja2FnZXMvY2xhdWRlLWNvZGUtY2xpLWhvb2tzL3NyYy9zdG9wLnRzIiwgIndyYXBwZXIudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbIi8qKlxuICogRW52aXJvbm1lbnQgdmFyaWFibGUgdXRpbGl0aWVzIGZvciBDbGF1ZGUgQ29kZSBob29rcy5cbiAqXG4gKiBQcm92aWRlcyB0eXBlZCBhY2Nlc3MgdG8gQ2xhdWRlIENvZGUncyBlbnZpcm9ubWVudCB2YXJpYWJsZXMgYW5kIHV0aWxpdGllc1xuICogZm9yIHBlcnNpc3RpbmcgZW52aXJvbm1lbnQgdmFyaWFibGVzIGluIFNlc3Npb25TdGFydCBob29rcy5cbiAqXG4gKiAjIyBFbnZpcm9ubWVudCBWYXJpYWJsZXNcbiAqXG4gKiBDbGF1ZGUgQ29kZSBzZXRzIHRoZXNlIGVudmlyb25tZW50IHZhcmlhYmxlcyB3aGVuIHJ1bm5pbmcgaG9va3M6XG4gKlxuICogfCBWYXJpYWJsZSB8IERlc2NyaXB0aW9uIHwgQXZhaWxhYmxlIEluIHxcbiAqIHwtLS0tLS0tLS0tfC0tLS0tLS0tLS0tLS18LS0tLS0tLS0tLS0tLS18XG4gKiB8IGBDTEFVREVfUFJPSkVDVF9ESVJgIHwgQWJzb2x1dGUgcGF0aCB0byBwcm9qZWN0IHJvb3QgfCBBbGwgaG9va3MgfFxuICogfCBgQ0xBVURFX0VOVl9GSUxFYCB8IFBhdGggdG8gZmlsZSBmb3IgcGVyc2lzdGluZyBlbnYgdmFycyB8IFNlc3Npb25TdGFydCBvbmx5IHxcbiAqIHwgYENMQVVERV9DT0RFX1JFTU9URWAgfCBgXCJ0cnVlXCJgIGlmIHJ1bm5pbmcgcmVtb3RlbHkgfCBBbGwgaG9va3MgfFxuICogQG1vZHVsZVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGltcG9ydCB7IGdldFByb2plY3REaXIsIHBlcnNpc3RFbnZWYXIsIGlzUmVtb3RlRW52aXJvbm1lbnQgfSBmcm9tICdAZ29vZGZvb3QvY2xhdWRlLWNvZGUtaG9va3MnO1xuICpcbiAqIC8vIEdldCBwcm9qZWN0IGRpcmVjdG9yeVxuICogY29uc3QgcHJvamVjdERpciA9IGdldFByb2plY3REaXIoKTtcbiAqXG4gKiAvLyBDaGVjayBpZiBydW5uaW5nIHJlbW90ZWx5XG4gKiBpZiAoaXNSZW1vdGVFbnZpcm9ubWVudCgpKSB7XG4gKiAgIC8vIEhhbmRsZSByZW1vdGUtc3BlY2lmaWMgbG9naWNcbiAqIH1cbiAqXG4gKiAvLyBJbiBTZXNzaW9uU3RhcnQgaG9vazogcGVyc2lzdCBlbnZpcm9ubWVudCB2YXJpYWJsZXNcbiAqIHBlcnNpc3RFbnZWYXIoJ05PREVfRU5WJywgJ3Byb2R1Y3Rpb24nKTtcbiAqIHBlcnNpc3RFbnZWYXIoJ0FQSV9LRVknLCAnc2VjcmV0LWtleScpO1xuICogYGBgXG4gKiBAc2VlIGh0dHBzOi8vY29kZS5jbGF1ZGUuY29tL2RvY3MvZW4vaG9va3MjaG9vay1leGVjdXRpb24tZGV0YWlsc1xuICovXG5pbXBvcnQgKiBhcyBmcyBmcm9tIFwibm9kZTpmc1wiO1xuLyoqXG4gKiBDbGF1ZGUgQ29kZSBlbnZpcm9ubWVudCB2YXJpYWJsZSBuYW1lcy5cbiAqXG4gKiBUaGVzZSBhcmUgdGhlIGVudmlyb25tZW50IHZhcmlhYmxlcyB0aGF0IENsYXVkZSBDb2RlIHNldHMgd2hlbiBydW5uaW5nIGhvb2tzLlxuICovXG5leHBvcnQgY29uc3QgQ0xBVURFX0VOVl9WQVJTID0ge1xuICAgIC8qKlxuICAgICAqIEFic29sdXRlIHBhdGggdG8gdGhlIHByb2plY3Qgcm9vdCBkaXJlY3Rvcnkgd2hlcmUgQ2xhdWRlIENvZGUgd2FzIHN0YXJ0ZWQuXG4gICAgICogQXZhaWxhYmxlIGluIGFsbCBob29rcy5cbiAgICAgKi9cbiAgICBQUk9KRUNUX0RJUjogXCJDTEFVREVfUFJPSkVDVF9ESVJcIixcbiAgICAvKipcbiAgICAgKiBQYXRoIHRvIGEgZmlsZSB3aGVyZSBTZXNzaW9uU3RhcnQgaG9va3MgY2FuIHBlcnNpc3QgZW52aXJvbm1lbnQgdmFyaWFibGVzLlxuICAgICAqIFZhcmlhYmxlcyB3cml0dGVuIHRvIHRoaXMgZmlsZSB3aWxsIGJlIGF2YWlsYWJsZSBpbiBhbGwgc3Vic2VxdWVudCBiYXNoIGNvbW1hbmRzLlxuICAgICAqIE9ubHkgYXZhaWxhYmxlIGluIFNlc3Npb25TdGFydCBob29rcy5cbiAgICAgKi9cbiAgICBFTlZfRklMRTogXCJDTEFVREVfRU5WX0ZJTEVcIixcbiAgICAvKipcbiAgICAgKiBTZXQgdG8gXCJ0cnVlXCIgd2hlbiBydW5uaW5nIGluIGEgcmVtb3RlICh3ZWIpIGVudmlyb25tZW50LlxuICAgICAqIE5vdCBzZXQgb3IgZW1wdHkgd2hlbiBydW5uaW5nIGluIGxvY2FsIENMSSBlbnZpcm9ubWVudC5cbiAgICAgKi9cbiAgICBSRU1PVEU6IFwiQ0xBVURFX0NPREVfUkVNT1RFXCIsXG59O1xuLyoqXG4gKiBHZXRzIHRoZSBDbGF1ZGUgQ29kZSBwcm9qZWN0IGRpcmVjdG9yeS5cbiAqXG4gKiBUaGlzIGlzIHRoZSBhYnNvbHV0ZSBwYXRoIHRvIHRoZSBwcm9qZWN0IHJvb3Qgd2hlcmUgQ2xhdWRlIENvZGUgd2FzIHN0YXJ0ZWQuXG4gKiBUaGUgdmFsdWUgY29tZXMgZnJvbSB0aGUgYENMQVVERV9QUk9KRUNUX0RJUmAgZW52aXJvbm1lbnQgdmFyaWFibGUuXG4gKiBAcmV0dXJucyBUaGUgcHJvamVjdCBkaXJlY3RvcnkgcGF0aCwgb3IgdW5kZWZpbmVkIGlmIG5vdCBzZXRcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBjb25zdCBwcm9qZWN0RGlyID0gZ2V0UHJvamVjdERpcigpO1xuICogaWYgKHByb2plY3REaXIpIHtcbiAqICAgY29uc3QgY29uZmlnUGF0aCA9IGAke3Byb2plY3REaXJ9Ly5jbGF1ZGUvY29uZmlnLmpzb25gO1xuICogfVxuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRQcm9qZWN0RGlyKCkge1xuICAgIHJldHVybiBwcm9jZXNzLmVudltDTEFVREVfRU5WX1ZBUlMuUFJPSkVDVF9ESVJdO1xufVxuLyoqXG4gKiBHZXRzIHRoZSBDbGF1ZGUgQ29kZSBlbnYgZmlsZSBwYXRoIGZvciBwZXJzaXN0aW5nIGVudmlyb25tZW50IHZhcmlhYmxlcy5cbiAqXG4gKiBUaGlzIGlzIG9ubHkgYXZhaWxhYmxlIGluIFNlc3Npb25TdGFydCBob29rcy4gVGhlIHBhdGggcG9pbnRzIHRvIGEgZmlsZVxuICogd2hlcmUgeW91IGNhbiB3cml0ZSBzaGVsbCBleHBvcnQgc3RhdGVtZW50cyB0byBwZXJzaXN0IGVudmlyb25tZW50IHZhcmlhYmxlc1xuICogZm9yIGFsbCBzdWJzZXF1ZW50IGJhc2ggY29tbWFuZHMgaW4gdGhlIHNlc3Npb24uXG4gKiBAcmV0dXJucyBUaGUgZW52IGZpbGUgcGF0aCwgb3IgdW5kZWZpbmVkIGlmIG5vdCBzZXQgKG5vdCBhIFNlc3Npb25TdGFydCBob29rKVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGNvbnN0IGVudkZpbGUgPSBnZXRFbnZGaWxlUGF0aCgpO1xuICogaWYgKGVudkZpbGUpIHtcbiAqICAgLy8gV2UncmUgaW4gYSBTZXNzaW9uU3RhcnQgaG9vayBhbmQgY2FuIHBlcnNpc3QgZW52IHZhcnNcbiAqICAgcGVyc2lzdEVudlZhcignTVlfVkFSJywgJ215LXZhbHVlJyk7XG4gKiB9XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldEVudkZpbGVQYXRoKCkge1xuICAgIHJldHVybiBwcm9jZXNzLmVudltDTEFVREVfRU5WX1ZBUlMuRU5WX0ZJTEVdO1xufVxuLyoqXG4gKiBDaGVja3MgaWYgdGhlIGhvb2sgaXMgcnVubmluZyBpbiBhIHJlbW90ZSAod2ViKSBlbnZpcm9ubWVudC5cbiAqXG4gKiBSZW1vdGUgZW52aXJvbm1lbnRzIG1heSBoYXZlIGRpZmZlcmVudCBjYXBhYmlsaXRpZXMgb3IgcmVzdHJpY3Rpb25zXG4gKiBjb21wYXJlZCB0byBsb2NhbCBDTEkgZW52aXJvbm1lbnRzLlxuICogQHJldHVybnMgdHJ1ZSBpZiBydW5uaW5nIHJlbW90ZWx5LCBmYWxzZSBpZiBydW5uaW5nIGxvY2FsbHlcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBpZiAoaXNSZW1vdGVFbnZpcm9ubWVudCgpKSB7XG4gKiAgIC8vIFVzZSB3ZWItY29tcGF0aWJsZSBhcHByb2FjaGVzXG4gKiB9IGVsc2Uge1xuICogICAvLyBDYW4gdXNlIGxvY2FsIENMSSBmZWF0dXJlc1xuICogfVxuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc1JlbW90ZUVudmlyb25tZW50KCkge1xuICAgIHJldHVybiBwcm9jZXNzLmVudltDTEFVREVfRU5WX1ZBUlMuUkVNT1RFXSA9PT0gXCJ0cnVlXCI7XG59XG4vKipcbiAqIFBlcnNpc3RzIGFuIGVudmlyb25tZW50IHZhcmlhYmxlIGZvciB1c2UgaW4gc3Vic2VxdWVudCBiYXNoIGNvbW1hbmRzLlxuICpcbiAqIFRoaXMgZnVuY3Rpb24gd3JpdGVzIGEgc2hlbGwgZXhwb3J0IHN0YXRlbWVudCB0byB0aGUgYENMQVVERV9FTlZfRklMRWAsXG4gKiB3aGljaCBDbGF1ZGUgQ29kZSBzb3VyY2VzIGJlZm9yZSBydW5uaW5nIGJhc2ggY29tbWFuZHMuIFRoaXMgYWxsb3dzXG4gKiBTZXNzaW9uU3RhcnQgaG9va3MgdG8gY29uZmlndXJlIHRoZSBlbnZpcm9ubWVudCBmb3IgdGhlIGVudGlyZSBzZXNzaW9uLlxuICpcbiAqICoqSW1wb3J0YW50Kio6IFRoaXMgZnVuY3Rpb24gb25seSB3b3JrcyBpbiBTZXNzaW9uU3RhcnQgaG9va3Mgd2hlcmVcbiAqIGBDTEFVREVfRU5WX0ZJTEVgIGlzIHNldC4gSW4gb3RoZXIgaG9va3MsIGl0IHdpbGwgdGhyb3cgYW4gZXJyb3IuXG4gKiBAcGFyYW0gbmFtZSAtIFRoZSBlbnZpcm9ubWVudCB2YXJpYWJsZSBuYW1lXG4gKiBAcGFyYW0gdmFsdWUgLSBUaGUgZW52aXJvbm1lbnQgdmFyaWFibGUgdmFsdWUgKHdpbGwgYmUgc2hlbGwtZXNjYXBlZClcbiAqIEB0aHJvd3MgRXJyb3IgaWYgQ0xBVURFX0VOVl9GSUxFIGlzIG5vdCBzZXQgKG5vdCBpbiBhIFNlc3Npb25TdGFydCBob29rKVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGltcG9ydCB7IHNlc3Npb25TdGFydEhvb2ssIHNlc3Npb25TdGFydE91dHB1dCwgcGVyc2lzdEVudlZhciB9IGZyb20gJ0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcyc7XG4gKlxuICogZXhwb3J0IGRlZmF1bHQgc2Vzc2lvblN0YXJ0SG9vayh7fSwgYXN5bmMgKGlucHV0KSA9PiB7XG4gKiAgIC8vIFBlcnNpc3QgZW52aXJvbm1lbnQgdmFyaWFibGVzIGZvciB0aGUgc2Vzc2lvblxuICogICBwZXJzaXN0RW52VmFyKCdOT0RFX0VOVicsICdwcm9kdWN0aW9uJyk7XG4gKiAgIHBlcnNpc3RFbnZWYXIoJ0FQSV9LRVknLCBwcm9jZXNzLmVudi5NWV9BUElfS0VZID8/ICdkZWZhdWx0Jyk7XG4gKiAgIHBlcnNpc3RFbnZWYXIoJ1BBVEgnLCBgJHtwcm9jZXNzLmVudi5QQVRIfTouL25vZGVfbW9kdWxlcy8uYmluYCk7XG4gKlxuICogICByZXR1cm4gc2Vzc2lvblN0YXJ0T3V0cHV0KHt9KTtcbiAqIH0pO1xuICogYGBgXG4gKiBAc2VlIGh0dHBzOi8vY29kZS5jbGF1ZGUuY29tL2RvY3MvZW4vaG9va3MjcGVyc2lzdGluZy1lbnZpcm9ubWVudC12YXJpYWJsZXNcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHBlcnNpc3RFbnZWYXIobmFtZSwgdmFsdWUpIHtcbiAgICBjb25zdCBlbnZGaWxlID0gZ2V0RW52RmlsZVBhdGgoKTtcbiAgICBpZiAoZW52RmlsZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcInBlcnNpc3RFbnZWYXIgY2FuIG9ubHkgYmUgdXNlZCBpbiBTZXNzaW9uU3RhcnQgaG9va3MuIFwiICsgXCJDTEFVREVfRU5WX0ZJTEUgZW52aXJvbm1lbnQgdmFyaWFibGUgaXMgbm90IHNldC5cIik7XG4gICAgfVxuICAgIC8vIFNoZWxsLWVzY2FwZSB0aGUgdmFsdWUgdG8gaGFuZGxlIHNwZWNpYWwgY2hhcmFjdGVyc1xuICAgIGNvbnN0IGVzY2FwZWRWYWx1ZSA9IGVzY2FwZVNoZWxsVmFsdWUodmFsdWUpO1xuICAgIC8vIFdyaXRlIHRoZSBleHBvcnQgc3RhdGVtZW50XG4gICAgY29uc3QgZXhwb3J0U3RhdGVtZW50ID0gYGV4cG9ydCAke25hbWV9PSR7ZXNjYXBlZFZhbHVlfVxcbmA7XG4gICAgZnMuYXBwZW5kRmlsZVN5bmMoZW52RmlsZSwgZXhwb3J0U3RhdGVtZW50LCBcInV0Zi04XCIpO1xufVxuLyoqXG4gKiBQZXJzaXN0cyBtdWx0aXBsZSBlbnZpcm9ubWVudCB2YXJpYWJsZXMgYXQgb25jZS5cbiAqXG4gKiBUaGlzIGlzIGEgY29udmVuaWVuY2Ugd3JhcHBlciBhcm91bmQgYHBlcnNpc3RFbnZWYXJgIGZvciBzZXR0aW5nXG4gKiBtdWx0aXBsZSB2YXJpYWJsZXMgaW4gYSBzaW5nbGUgY2FsbC5cbiAqIEBwYXJhbSB2YXJzIC0gT2JqZWN0IG1hcHBpbmcgdmFyaWFibGUgbmFtZXMgdG8gdmFsdWVzXG4gKiBAdGhyb3dzIEVycm9yIGlmIENMQVVERV9FTlZfRklMRSBpcyBub3Qgc2V0IChub3QgaW4gYSBTZXNzaW9uU3RhcnQgaG9vaylcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBwZXJzaXN0RW52VmFycyh7XG4gKiAgIE5PREVfRU5WOiAncHJvZHVjdGlvbicsXG4gKiAgIEFQSV9LRVk6ICdzZWNyZXQnLFxuICogICBERUJVRzogJ2ZhbHNlJ1xuICogfSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHBlcnNpc3RFbnZWYXJzKHZhcnMpIHtcbiAgICBmb3IgKGNvbnN0IFtuYW1lLCB2YWx1ZV0gb2YgT2JqZWN0LmVudHJpZXModmFycykpIHtcbiAgICAgICAgcGVyc2lzdEVudlZhcihuYW1lLCB2YWx1ZSk7XG4gICAgfVxufVxuLyoqXG4gKiBFc2NhcGVzIGEgdmFsdWUgZm9yIHNhZmUgdXNlIGluIGEgc2hlbGwgZXhwb3J0IHN0YXRlbWVudC5cbiAqXG4gKiBVc2VzIHNpbmdsZSBxdW90ZXMgYW5kIGVzY2FwZXMgYW55IGVtYmVkZGVkIHNpbmdsZSBxdW90ZXMuXG4gKiBUaGlzIHByZXZlbnRzIHNoZWxsIGluamVjdGlvbiBhbmQgaGFuZGxlcyBzcGVjaWFsIGNoYXJhY3RlcnMuXG4gKiBAcGFyYW0gdmFsdWUgLSBUaGUgdmFsdWUgdG8gZXNjYXBlXG4gKiBAcmV0dXJucyBUaGUgc2hlbGwtZXNjYXBlZCB2YWx1ZSAod2l0aCBxdW90ZXMpXG4gKiBAaW50ZXJuYWxcbiAqL1xuZnVuY3Rpb24gZXNjYXBlU2hlbGxWYWx1ZSh2YWx1ZSkge1xuICAgIC8vIFVzZSBzaW5nbGUgcXVvdGVzIGFuZCBlc2NhcGUgYW55IGVtYmVkZGVkIHNpbmdsZSBxdW90ZXNcbiAgICAvLyAndmFsdWUnIC0+ICd2YWwnXFwnJ3VlJyBmb3IgdmFsdWVzIGNvbnRhaW5pbmcgc2luZ2xlIHF1b3Rlc1xuICAgIGNvbnN0IGVzY2FwZWQgPSB2YWx1ZS5yZXBsYWNlKC8nL2csIFwiJ1xcXFwnJ1wiKTtcbiAgICByZXR1cm4gYCcke2VzY2FwZWR9J2A7XG59XG4iLCAiLyoqXG4gKiBIb29rIGZhY3RvcnkgZnVuY3Rpb25zIGZvciBDbGF1ZGUgQ29kZSBob29rcy5cbiAqXG4gKiBQcm92aWRlcyB0eXBlZCBmYWN0b3J5IGZ1bmN0aW9ucyBmb3IgYWxsIDEyIGhvb2sgdHlwZXMgdGhhdCBoYW5kbGU6XG4gKiAtIElucHV0IHR5cGUgbmFycm93aW5nIGJhc2VkIG9uIGhvb2sgZXZlbnQgdHlwZVxuICogLSBPdXRwdXQgdHlwZSBlbmZvcmNlbWVudCB2aWEgcmV0dXJuIHR5cGVzXG4gKiAtIEVycm9yIHdyYXBwaW5nIHdpdGggYXV0b21hdGljIGxvZ2dpbmdcbiAqIC0gTG9nZ2VyIGNvbnRleHQgaW5qZWN0aW9uXG4gKlxuICogRWFjaCBmYWN0b3J5IGFjY2VwdHMgYSBIb29rQ29uZmlnIHdpdGggb3B0aW9uYWwgbWF0Y2hlciBhbmQgdGltZW91dCBzZXR0aW5ncyxcbiAqIGFuZCByZXR1cm5zIGEgZnVuY3Rpb24gdGhhdCB0aGUgcnVudGltZSBpbnZva2VzIHdoZW4gdGhlIGhvb2sgZmlsZSBleGVjdXRlcy5cbiAqIEBtb2R1bGVcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBpbXBvcnQgeyBwcmVUb29sVXNlSG9vaywgcHJlVG9vbFVzZU91dHB1dCB9IGZyb20gJ0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcyc7XG4gKlxuICogZXhwb3J0IGRlZmF1bHQgcHJlVG9vbFVzZUhvb2soeyBtYXRjaGVyOiAnQmFzaCcgfSwgYXN5bmMgKGlucHV0LCB7IGxvZ2dlciB9KSA9PiB7XG4gKiAgIGxvZ2dlci5pbmZvKCdQcm9jZXNzaW5nIEJhc2ggY29tbWFuZCcpO1xuICogICByZXR1cm4gcHJlVG9vbFVzZU91dHB1dCh7IGFsbG93OiB0cnVlIH0pO1xuICogfSk7XG4gKiBgYGBcbiAqIEBzZWUgaHR0cHM6Ly9jb2RlLmNsYXVkZS5jb20vZG9jcy9lbi9ob29rc1xuICovXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBHZW5lcmljIEZhY3Rvcnlcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8qKlxuICogQ3JlYXRlcyBhIGhvb2sgZmFjdG9yeSBmdW5jdGlvbiBmb3IgYSBzcGVjaWZpYyBob29rIHR5cGUuXG4gKlxuICogVGhpcyBpcyB0aGUgaW50ZXJuYWwgaW1wbGVtZW50YXRpb24gdXNlZCBieSBhbGwgdHlwZWQgZmFjdG9yaWVzLlxuICogSXQgd3JhcHMgdGhlIGhhbmRsZXIgd2l0aCBlcnJvciBjYXRjaGluZyBhbmQgbG9nZ2luZy5cbiAqIEBwYXJhbSBob29rRXZlbnROYW1lIC0gVGhlIGhvb2sgZXZlbnQgbmFtZVxuICogQHBhcmFtIGNvbmZpZyAtIEhvb2sgY29uZmlndXJhdGlvblxuICogQHBhcmFtIGhhbmRsZXIgLSBUaGUgaGFuZGxlciBmdW5jdGlvbiB0byB3cmFwXG4gKiBAcmV0dXJucyBBIHdyYXBwZWQgaG9vayBmdW5jdGlvblxuICogQGludGVybmFsXG4gKi9cbmZ1bmN0aW9uIGNyZWF0ZUhvb2tGdW5jdGlvbihob29rRXZlbnROYW1lLCBjb25maWcsIGhhbmRsZXIpIHtcbiAgICBjb25zdCBob29rRm4gPSBhc3luYyAoaW5wdXQsIGNvbnRleHQpID0+IHtcbiAgICAgICAgLy8gRGVsZWdhdGUgZXJyb3IgaGFuZGxpbmcgdG8gdGhlIHJ1bnRpbWUgLSBqdXN0IGV4ZWN1dGUgdGhlIGhhbmRsZXJcbiAgICAgICAgLy8gVGhlIHJ1bnRpbWUgd2lsbCBjYXRjaCBlcnJvcnMsIGxvZyB0aGVtLCBhbmQgcmV0dXJuIGFwcHJvcHJpYXRlIG91dHB1dFxuICAgICAgICByZXR1cm4gYXdhaXQgaGFuZGxlcihpbnB1dCwgY29udGV4dCk7XG4gICAgfTtcbiAgICAvLyBBdHRhY2ggbWV0YWRhdGEgZm9yIHJ1bnRpbWUgaW5zcGVjdGlvblxuICAgIGhvb2tGbi5ob29rRXZlbnROYW1lID0gaG9va0V2ZW50TmFtZTtcbiAgICBob29rRm4ubWF0Y2hlciA9IGNvbmZpZy5tYXRjaGVyO1xuICAgIGhvb2tGbi50aW1lb3V0ID0gY29uZmlnLnRpbWVvdXQ7XG4gICAgcmV0dXJuIGhvb2tGbjtcbn1cbi8qKiBAaW5oZXJpdGRvYyAqL1xuZXhwb3J0IGZ1bmN0aW9uIHByZVRvb2xVc2VIb29rKGNvbmZpZywgaGFuZGxlcikge1xuICAgIHJldHVybiBjcmVhdGVIb29rRnVuY3Rpb24oXCJQcmVUb29sVXNlXCIsIGNvbmZpZywgaGFuZGxlcik7XG59XG4vKiogQGluaGVyaXRkb2MgKi9cbmV4cG9ydCBmdW5jdGlvbiBwb3N0VG9vbFVzZUhvb2soY29uZmlnLCBoYW5kbGVyKSB7XG4gICAgcmV0dXJuIGNyZWF0ZUhvb2tGdW5jdGlvbihcIlBvc3RUb29sVXNlXCIsIGNvbmZpZywgaGFuZGxlcik7XG59XG4vKiogQGluaGVyaXRkb2MgKi9cbmV4cG9ydCBmdW5jdGlvbiBwb3N0VG9vbFVzZUZhaWx1cmVIb29rKGNvbmZpZywgaGFuZGxlcikge1xuICAgIHJldHVybiBjcmVhdGVIb29rRnVuY3Rpb24oXCJQb3N0VG9vbFVzZUZhaWx1cmVcIiwgY29uZmlnLCBoYW5kbGVyKTtcbn1cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIE5vdGlmaWNhdGlvbiBIb29rIEZhY3Rvcnlcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8qKlxuICogQ3JlYXRlcyBhIE5vdGlmaWNhdGlvbiBob29rIGhhbmRsZXIuXG4gKlxuICogTm90aWZpY2F0aW9uIGhvb2tzIGZpcmUgd2hlbiBDbGF1ZGUgQ29kZSBzZW5kcyBhIG5vdGlmaWNhdGlvbiwgYWxsb3dpbmcgeW91IHRvOlxuICogLSBGb3J3YXJkIG5vdGlmaWNhdGlvbnMgdG8gZXh0ZXJuYWwgc3lzdGVtc1xuICogLSBMb2cgaW1wb3J0YW50IGV2ZW50c1xuICogLSBUcmlnZ2VyIGN1c3RvbSBhbGVydGluZ1xuICpcbiAqICoqTWF0Y2hlcioqOiBNYXRjaGVzIGFnYWluc3QgYG5vdGlmaWNhdGlvbl90eXBlYFxuICogQHBhcmFtIGNvbmZpZyAtIEhvb2sgY29uZmlndXJhdGlvbiB3aXRoIG9wdGlvbmFsIG1hdGNoZXIgYW5kIHRpbWVvdXRcbiAqIEBwYXJhbSBoYW5kbGVyIC0gVGhlIGhhbmRsZXIgZnVuY3Rpb24gdG8gZXhlY3V0ZVxuICogQHJldHVybnMgQSBob29rIGZ1bmN0aW9uIHRoYXQgY2FuIGJlIGV4cG9ydGVkIGFzIHRoZSBkZWZhdWx0IGV4cG9ydFxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGltcG9ydCB7IG5vdGlmaWNhdGlvbkhvb2ssIG5vdGlmaWNhdGlvbk91dHB1dCB9IGZyb20gJ0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcyc7XG4gKlxuICogLy8gRm9yd2FyZCBub3RpZmljYXRpb25zIHRvIFNsYWNrXG4gKiBleHBvcnQgZGVmYXVsdCBub3RpZmljYXRpb25Ib29rKHt9LCBhc3luYyAoaW5wdXQsIHsgbG9nZ2VyIH0pID0+IHtcbiAqICAgbG9nZ2VyLmluZm8oJ05vdGlmaWNhdGlvbiByZWNlaXZlZCcsIHtcbiAqICAgICB0eXBlOiBpbnB1dC5ub3RpZmljYXRpb25fdHlwZSxcbiAqICAgICB0aXRsZTogaW5wdXQudGl0bGVcbiAqICAgfSk7XG4gKlxuICogICBhd2FpdCBzZW5kU2xhY2tNZXNzYWdlKGlucHV0LnRpdGxlID8/ICdOb3RpZmljYXRpb24nLCBpbnB1dC5tZXNzYWdlKTtcbiAqXG4gKiAgIHJldHVybiBub3RpZmljYXRpb25PdXRwdXQoe30pO1xuICogfSk7XG4gKiBgYGBcbiAqIEBzZWUgaHR0cHM6Ly9jb2RlLmNsYXVkZS5jb20vZG9jcy9lbi9ob29rcyNub3RpZmljYXRpb25cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIG5vdGlmaWNhdGlvbkhvb2soY29uZmlnLCBoYW5kbGVyKSB7XG4gICAgcmV0dXJuIGNyZWF0ZUhvb2tGdW5jdGlvbihcIk5vdGlmaWNhdGlvblwiLCBjb25maWcsIGhhbmRsZXIpO1xufVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gVXNlclByb21wdFN1Ym1pdCBIb29rIEZhY3Rvcnlcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8qKlxuICogQ3JlYXRlcyBhIFVzZXJQcm9tcHRTdWJtaXQgaG9vayBoYW5kbGVyLlxuICpcbiAqIFVzZXJQcm9tcHRTdWJtaXQgaG9va3MgZmlyZSB3aGVuIGEgdXNlciBzdWJtaXRzIGEgcHJvbXB0LCBhbGxvd2luZyB5b3UgdG86XG4gKiAtIEFkZCBhZGRpdGlvbmFsIGNvbnRleHQgb3IgaW5zdHJ1Y3Rpb25zXG4gKiAtIExvZyB1c2VyIGludGVyYWN0aW9uc1xuICogLSBWYWxpZGF0ZSBvciB0cmFuc2Zvcm0gcHJvbXB0c1xuICpcbiAqICoqTWF0Y2hlcioqOiBObyBtYXRjaGVyIHN1cHBvcnQgLSBmaXJlcyBvbiBhbGwgcHJvbXB0IHN1Ym1pc3Npb25zXG4gKiBAcGFyYW0gY29uZmlnIC0gSG9vayBjb25maWd1cmF0aW9uIHdpdGggb3B0aW9uYWwgdGltZW91dCAobWF0Y2hlciBpcyBpZ25vcmVkKVxuICogQHBhcmFtIGhhbmRsZXIgLSBUaGUgaGFuZGxlciBmdW5jdGlvbiB0byBleGVjdXRlXG4gKiBAcmV0dXJucyBBIGhvb2sgZnVuY3Rpb24gdGhhdCBjYW4gYmUgZXhwb3J0ZWQgYXMgdGhlIGRlZmF1bHQgZXhwb3J0XG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogaW1wb3J0IHsgdXNlclByb21wdFN1Ym1pdEhvb2ssIHVzZXJQcm9tcHRTdWJtaXRPdXRwdXQgfSBmcm9tICdAZ29vZGZvb3QvY2xhdWRlLWNvZGUtaG9va3MnO1xuICpcbiAqIC8vIEFkZCBwcm9qZWN0IGNvbnRleHQgdG8gZXZlcnkgcHJvbXB0XG4gKiBleHBvcnQgZGVmYXVsdCB1c2VyUHJvbXB0U3VibWl0SG9vayh7fSwgYXN5bmMgKGlucHV0LCB7IGxvZ2dlciB9KSA9PiB7XG4gKiAgIGxvZ2dlci5kZWJ1ZygnVXNlciBwcm9tcHQgc3VibWl0dGVkJywgeyBwcm9tcHRMZW5ndGg6IGlucHV0LnByb21wdC5sZW5ndGggfSk7XG4gKlxuICogICBjb25zdCBwcm9qZWN0Q29udGV4dCA9IGF3YWl0IGdldFByb2plY3RDb250ZXh0KCk7XG4gKlxuICogICByZXR1cm4gdXNlclByb21wdFN1Ym1pdE91dHB1dCh7XG4gKiAgICAgYWRkaXRpb25hbENvbnRleHQ6IHByb2plY3RDb250ZXh0XG4gKiAgIH0pO1xuICogfSk7XG4gKiBgYGBcbiAqIEBzZWUgaHR0cHM6Ly9jb2RlLmNsYXVkZS5jb20vZG9jcy9lbi9ob29rcyN1c2VycHJvbXB0c3VibWl0XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB1c2VyUHJvbXB0U3VibWl0SG9vayhjb25maWcsIGhhbmRsZXIpIHtcbiAgICByZXR1cm4gY3JlYXRlSG9va0Z1bmN0aW9uKFwiVXNlclByb21wdFN1Ym1pdFwiLCBjb25maWcsIGhhbmRsZXIpO1xufVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gU2Vzc2lvblN0YXJ0IEhvb2sgRmFjdG9yeVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLyoqXG4gKiBDcmVhdGVzIGEgU2Vzc2lvblN0YXJ0IGhvb2sgaGFuZGxlci5cbiAqXG4gKiBTZXNzaW9uU3RhcnQgaG9va3MgZmlyZSB3aGVuIGEgQ2xhdWRlIENvZGUgc2Vzc2lvbiBzdGFydHMgb3IgcmVzdGFydHMsXG4gKiBhbGxvd2luZyB5b3UgdG86XG4gKiAtIEluaXRpYWxpemUgc2Vzc2lvbiBzdGF0ZVxuICogLSBJbmplY3QgY29udGV4dCBvciBpbnN0cnVjdGlvbnNcbiAqIC0gUGVyc2lzdCBlbnZpcm9ubWVudCB2YXJpYWJsZXMgZm9yIHN1YnNlcXVlbnQgYmFzaCBjb21tYW5kc1xuICogLSBTZXQgdXAgbG9nZ2luZyBvciBtb25pdG9yaW5nXG4gKlxuICogKipNYXRjaGVyKio6IE1hdGNoZXMgYWdhaW5zdCBgc291cmNlYCAoJ3N0YXJ0dXAnLCAncmVzdW1lJywgJ2NsZWFyJywgJ2NvbXBhY3QnKVxuICpcbiAqICoqQ29udGV4dCoqOiBTZXNzaW9uU3RhcnQgaG9va3MgcmVjZWl2ZSBhbiBleHRlbmRlZCBjb250ZXh0IHdpdGggYHBlcnNpc3RFbnZWYXJgXG4gKiBhbmQgYHBlcnNpc3RFbnZWYXJzYCBmdW5jdGlvbnMgZm9yIHNldHRpbmcgZW52aXJvbm1lbnQgdmFyaWFibGVzLlxuICogQHBhcmFtIGNvbmZpZyAtIEhvb2sgY29uZmlndXJhdGlvbiB3aXRoIG9wdGlvbmFsIG1hdGNoZXIgYW5kIHRpbWVvdXRcbiAqIEBwYXJhbSBoYW5kbGVyIC0gVGhlIGhhbmRsZXIgZnVuY3Rpb24gdG8gZXhlY3V0ZVxuICogQHJldHVybnMgQSBob29rIGZ1bmN0aW9uIHRoYXQgY2FuIGJlIGV4cG9ydGVkIGFzIHRoZSBkZWZhdWx0IGV4cG9ydFxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGltcG9ydCB7IHNlc3Npb25TdGFydEhvb2ssIHNlc3Npb25TdGFydE91dHB1dCB9IGZyb20gJ0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcyc7XG4gKlxuICogLy8gUGVyc2lzdCBlbnZpcm9ubWVudCB2YXJpYWJsZXMgZm9yIHRoZSBzZXNzaW9uXG4gKiBleHBvcnQgZGVmYXVsdCBzZXNzaW9uU3RhcnRIb29rKHsgbWF0Y2hlcjogJ3N0YXJ0dXAnIH0sIGFzeW5jIChpbnB1dCwgeyBsb2dnZXIsIHBlcnNpc3RFbnZWYXIgfSkgPT4ge1xuICogICBsb2dnZXIuaW5mbygnTmV3IHNlc3Npb24gc3RhcnRlZCcsIHtcbiAqICAgICBzZXNzaW9uSWQ6IGlucHV0LnNlc3Npb25faWQsXG4gKiAgICAgY3dkOiBpbnB1dC5jd2RcbiAqICAgfSk7XG4gKlxuICogICAvLyBTZXQgZW52aXJvbm1lbnQgdmFyaWFibGVzIGZvciBhbGwgc3Vic2VxdWVudCBiYXNoIGNvbW1hbmRzXG4gKiAgIHBlcnNpc3RFbnZWYXIoJ05PREVfRU5WJywgJ2RldmVsb3BtZW50Jyk7XG4gKiAgIHBlcnNpc3RFbnZWYXIoJ0RFQlVHJywgJ3RydWUnKTtcbiAqXG4gKiAgIHJldHVybiBzZXNzaW9uU3RhcnRPdXRwdXQoe30pO1xuICogfSk7XG4gKiBgYGBcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiAvLyBTZXQgbXVsdGlwbGUgZW52aXJvbm1lbnQgdmFyaWFibGVzIGF0IG9uY2VcbiAqIGV4cG9ydCBkZWZhdWx0IHNlc3Npb25TdGFydEhvb2soe30sIGFzeW5jIChpbnB1dCwgeyBwZXJzaXN0RW52VmFycyB9KSA9PiB7XG4gKiAgIHBlcnNpc3RFbnZWYXJzKHtcbiAqICAgICBOT0RFX0VOVjogJ3Byb2R1Y3Rpb24nLFxuICogICAgIEFQSV9LRVk6ICdzZWNyZXQnLFxuICogICAgIERFQlVHOiAnZmFsc2UnXG4gKiAgIH0pO1xuICpcbiAqICAgcmV0dXJuIHNlc3Npb25TdGFydE91dHB1dCh7fSk7XG4gKiB9KTtcbiAqIGBgYFxuICogQHNlZSBodHRwczovL2NvZGUuY2xhdWRlLmNvbS9kb2NzL2VuL2hvb2tzI3Nlc3Npb25zdGFydFxuICovXG5leHBvcnQgZnVuY3Rpb24gc2Vzc2lvblN0YXJ0SG9vayhjb25maWcsIGhhbmRsZXIpIHtcbiAgICByZXR1cm4gY3JlYXRlSG9va0Z1bmN0aW9uKFwiU2Vzc2lvblN0YXJ0XCIsIGNvbmZpZywgaGFuZGxlcik7XG59XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBTZXNzaW9uRW5kIEhvb2sgRmFjdG9yeVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLyoqXG4gKiBDcmVhdGVzIGEgU2Vzc2lvbkVuZCBob29rIGhhbmRsZXIuXG4gKlxuICogU2Vzc2lvbkVuZCBob29rcyBmaXJlIHdoZW4gYSBDbGF1ZGUgQ29kZSBzZXNzaW9uIGVuZHMsIGFsbG93aW5nIHlvdSB0bzpcbiAqIC0gQ2xlYW4gdXAgc2Vzc2lvbiByZXNvdXJjZXNcbiAqIC0gTG9nIHNlc3Npb24gbWV0cmljc1xuICogLSBQZXJzaXN0IHNlc3Npb24gc3RhdGVcbiAqXG4gKiAqKk1hdGNoZXIqKjogTWF0Y2hlcyBhZ2FpbnN0IGByZWFzb25gICh0aGUgZXhpdCByZWFzb24gc3RyaW5nKVxuICogQHBhcmFtIGNvbmZpZyAtIEhvb2sgY29uZmlndXJhdGlvbiB3aXRoIG9wdGlvbmFsIG1hdGNoZXIgYW5kIHRpbWVvdXRcbiAqIEBwYXJhbSBoYW5kbGVyIC0gVGhlIGhhbmRsZXIgZnVuY3Rpb24gdG8gZXhlY3V0ZVxuICogQHJldHVybnMgQSBob29rIGZ1bmN0aW9uIHRoYXQgY2FuIGJlIGV4cG9ydGVkIGFzIHRoZSBkZWZhdWx0IGV4cG9ydFxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGltcG9ydCB7IHNlc3Npb25FbmRIb29rLCBzZXNzaW9uRW5kT3V0cHV0IH0gZnJvbSAnQGdvb2Rmb290L2NsYXVkZS1jb2RlLWhvb2tzJztcbiAqXG4gKiAvLyBMb2cgc2Vzc2lvbiBlbmQgYW5kIGNsZWFuIHVwXG4gKiBleHBvcnQgZGVmYXVsdCBzZXNzaW9uRW5kSG9vayh7fSwgYXN5bmMgKGlucHV0LCB7IGxvZ2dlciB9KSA9PiB7XG4gKiAgIGxvZ2dlci5pbmZvKCdTZXNzaW9uIGVuZGVkJywge1xuICogICAgIHNlc3Npb25JZDogaW5wdXQuc2Vzc2lvbl9pZCxcbiAqICAgICByZWFzb246IGlucHV0LnJlYXNvblxuICogICB9KTtcbiAqXG4gKiAgIGF3YWl0IGNsZWFudXBTZXNzaW9uUmVzb3VyY2VzKGlucHV0LnNlc3Npb25faWQpO1xuICpcbiAqICAgcmV0dXJuIHNlc3Npb25FbmRPdXRwdXQoe30pO1xuICogfSk7XG4gKiBgYGBcbiAqIEBzZWUgaHR0cHM6Ly9jb2RlLmNsYXVkZS5jb20vZG9jcy9lbi9ob29rcyNzZXNzaW9uZW5kXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzZXNzaW9uRW5kSG9vayhjb25maWcsIGhhbmRsZXIpIHtcbiAgICByZXR1cm4gY3JlYXRlSG9va0Z1bmN0aW9uKFwiU2Vzc2lvbkVuZFwiLCBjb25maWcsIGhhbmRsZXIpO1xufVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gU3RvcCBIb29rIEZhY3Rvcnlcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8qKlxuICogQ3JlYXRlcyBhIFN0b3AgaG9vayBoYW5kbGVyLlxuICpcbiAqIFN0b3AgaG9va3MgZmlyZSB3aGVuIENsYXVkZSBDb2RlIGlzIGFib3V0IHRvIHN0b3AsIGFsbG93aW5nIHlvdSB0bzpcbiAqIC0gQmxvY2sgdGhlIHN0b3AgYW5kIHJlcXVpcmUgYWRkaXRpb25hbCBhY3Rpb25cbiAqIC0gQ29uZmlybSB0aGUgdXNlciB3YW50cyB0byBzdG9wXG4gKiAtIENsZWFuIHVwIHJlc291cmNlcyBiZWZvcmUgc3RvcHBpbmdcbiAqXG4gKiAqKk1hdGNoZXIqKjogTm8gbWF0Y2hlciBzdXBwb3J0IC0gZmlyZXMgb24gYWxsIHN0b3AgZXZlbnRzXG4gKiBAcGFyYW0gY29uZmlnIC0gSG9vayBjb25maWd1cmF0aW9uIHdpdGggb3B0aW9uYWwgdGltZW91dCAobWF0Y2hlciBpcyBpZ25vcmVkKVxuICogQHBhcmFtIGhhbmRsZXIgLSBUaGUgaGFuZGxlciBmdW5jdGlvbiB0byBleGVjdXRlXG4gKiBAcmV0dXJucyBBIGhvb2sgZnVuY3Rpb24gdGhhdCBjYW4gYmUgZXhwb3J0ZWQgYXMgdGhlIGRlZmF1bHQgZXhwb3J0XG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogaW1wb3J0IHsgc3RvcEhvb2ssIHN0b3BPdXRwdXQgfSBmcm9tICdAZ29vZGZvb3QvY2xhdWRlLWNvZGUtaG9va3MnO1xuICpcbiAqIC8vIEJsb2NrIHN0b3AgaWYgdGhlcmUgYXJlIHBlbmRpbmcgY2hhbmdlc1xuICogZXhwb3J0IGRlZmF1bHQgc3RvcEhvb2soe30sIGFzeW5jIChpbnB1dCwgeyBsb2dnZXIgfSkgPT4ge1xuICogICBjb25zdCBwZW5kaW5nQ2hhbmdlcyA9IGF3YWl0IGNoZWNrUGVuZGluZ0NoYW5nZXMoKTtcbiAqXG4gKiAgIGlmIChwZW5kaW5nQ2hhbmdlcy5sZW5ndGggPiAwKSB7XG4gKiAgICAgbG9nZ2VyLndhcm4oJ0Jsb2NraW5nIHN0b3AgZHVlIHRvIHBlbmRpbmcgY2hhbmdlcycsIHtcbiAqICAgICAgIGNvdW50OiBwZW5kaW5nQ2hhbmdlcy5sZW5ndGhcbiAqICAgICB9KTtcbiAqXG4gKiAgICAgcmV0dXJuIHN0b3BPdXRwdXQoe1xuICogICAgICAgZGVjaXNpb246ICdibG9jaycsXG4gKiAgICAgICByZWFzb246IGBUaGVyZSBhcmUgJHtwZW5kaW5nQ2hhbmdlcy5sZW5ndGh9IHVuY29tbWl0dGVkIGNoYW5nZXNgLFxuICogICAgICAgc3lzdGVtTWVzc2FnZTogJ1BsZWFzZSBjb21taXQgb3IgZGlzY2FyZCBjaGFuZ2VzIGJlZm9yZSBzdG9wcGluZydcbiAqICAgICB9KTtcbiAqICAgfVxuICpcbiAqICAgbG9nZ2VyLmluZm8oJ0FwcHJvdmluZyBzdG9wJyk7XG4gKiAgIHJldHVybiBzdG9wT3V0cHV0KHsgZGVjaXNpb246ICdhcHByb3ZlJyB9KTtcbiAqIH0pO1xuICogYGBgXG4gKiBAc2VlIGh0dHBzOi8vY29kZS5jbGF1ZGUuY29tL2RvY3MvZW4vaG9va3Mjc3RvcFxuICovXG5leHBvcnQgZnVuY3Rpb24gc3RvcEhvb2soY29uZmlnLCBoYW5kbGVyKSB7XG4gICAgcmV0dXJuIGNyZWF0ZUhvb2tGdW5jdGlvbihcIlN0b3BcIiwgY29uZmlnLCBoYW5kbGVyKTtcbn1cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIFN1YmFnZW50U3RhcnQgSG9vayBGYWN0b3J5XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vKipcbiAqIENyZWF0ZXMgYSBTdWJhZ2VudFN0YXJ0IGhvb2sgaGFuZGxlci5cbiAqXG4gKiBTdWJhZ2VudFN0YXJ0IGhvb2tzIGZpcmUgd2hlbiBhIHN1YmFnZW50IChUYXNrIHRvb2wpIHN0YXJ0cywgYWxsb3dpbmcgeW91IHRvOlxuICogLSBJbmplY3QgY29udGV4dCBmb3IgdGhlIHN1YmFnZW50XG4gKiAtIExvZyBzdWJhZ2VudCBpbnZvY2F0aW9uc1xuICogLSBDb25maWd1cmUgc3ViYWdlbnQgYmVoYXZpb3JcbiAqXG4gKiAqKk1hdGNoZXIqKjogTWF0Y2hlcyBhZ2FpbnN0IGBhZ2VudF90eXBlYCAoZS5nLiwgJ2V4cGxvcmUnLCAnY29kZWJhc2UtYW5hbHlzaXMnKVxuICogQHBhcmFtIGNvbmZpZyAtIEhvb2sgY29uZmlndXJhdGlvbiB3aXRoIG9wdGlvbmFsIG1hdGNoZXIgYW5kIHRpbWVvdXRcbiAqIEBwYXJhbSBoYW5kbGVyIC0gVGhlIGhhbmRsZXIgZnVuY3Rpb24gdG8gZXhlY3V0ZVxuICogQHJldHVybnMgQSBob29rIGZ1bmN0aW9uIHRoYXQgY2FuIGJlIGV4cG9ydGVkIGFzIHRoZSBkZWZhdWx0IGV4cG9ydFxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGltcG9ydCB7IHN1YmFnZW50U3RhcnRIb29rLCBzdWJhZ2VudFN0YXJ0T3V0cHV0IH0gZnJvbSAnQGdvb2Rmb290L2NsYXVkZS1jb2RlLWhvb2tzJztcbiAqXG4gKiAvLyBBZGQgY29udGV4dCBmb3IgZXhwbG9yZSBzdWJhZ2VudHNcbiAqIGV4cG9ydCBkZWZhdWx0IHN1YmFnZW50U3RhcnRIb29rKHsgbWF0Y2hlcjogJ2V4cGxvcmUnIH0sIGFzeW5jIChpbnB1dCwgeyBsb2dnZXIgfSkgPT4ge1xuICogICBsb2dnZXIuaW5mbygnRXhwbG9yZSBzdWJhZ2VudCBzdGFydGluZycsIHtcbiAqICAgICBhZ2VudElkOiBpbnB1dC5hZ2VudF9pZCxcbiAqICAgICBhZ2VudFR5cGU6IGlucHV0LmFnZW50X3R5cGVcbiAqICAgfSk7XG4gKlxuICogICByZXR1cm4gc3ViYWdlbnRTdGFydE91dHB1dCh7XG4gKiAgICAgYWRkaXRpb25hbENvbnRleHQ6ICdGb2N1cyBvbiBmaW5kaW5nIHBhdHRlcm5zIGFuZCBjb252ZW50aW9ucydcbiAqICAgfSk7XG4gKiB9KTtcbiAqIGBgYFxuICogQHNlZSBodHRwczovL2NvZGUuY2xhdWRlLmNvbS9kb2NzL2VuL2hvb2tzI3N1YmFnZW50c3RhcnRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHN1YmFnZW50U3RhcnRIb29rKGNvbmZpZywgaGFuZGxlcikge1xuICAgIHJldHVybiBjcmVhdGVIb29rRnVuY3Rpb24oXCJTdWJhZ2VudFN0YXJ0XCIsIGNvbmZpZywgaGFuZGxlcik7XG59XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBTdWJhZ2VudFN0b3AgSG9vayBGYWN0b3J5XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vKipcbiAqIENyZWF0ZXMgYSBTdWJhZ2VudFN0b3AgaG9vayBoYW5kbGVyLlxuICpcbiAqIFN1YmFnZW50U3RvcCBob29rcyBmaXJlIHdoZW4gYSBzdWJhZ2VudCBjb21wbGV0ZXMgb3Igc3RvcHMsIGFsbG93aW5nIHlvdSB0bzpcbiAqIC0gQmxvY2sgdGhlIHN1YmFnZW50IGZyb20gc3RvcHBpbmdcbiAqIC0gUHJvY2VzcyBzdWJhZ2VudCByZXN1bHRzXG4gKiAtIENsZWFuIHVwIHN1YmFnZW50IHJlc291cmNlc1xuICogLSBMb2cgc3ViYWdlbnQgY29tcGxldGlvblxuICpcbiAqICoqTWF0Y2hlcioqOiBNYXRjaGVzIGFnYWluc3QgYGFnZW50X3R5cGVgIChlLmcuLCAnZXhwbG9yZScsICdjb2RlYmFzZS1hbmFseXNpcycpXG4gKiBAcGFyYW0gY29uZmlnIC0gSG9vayBjb25maWd1cmF0aW9uIHdpdGggb3B0aW9uYWwgbWF0Y2hlciBhbmQgdGltZW91dFxuICogQHBhcmFtIGhhbmRsZXIgLSBUaGUgaGFuZGxlciBmdW5jdGlvbiB0byBleGVjdXRlXG4gKiBAcmV0dXJucyBBIGhvb2sgZnVuY3Rpb24gdGhhdCBjYW4gYmUgZXhwb3J0ZWQgYXMgdGhlIGRlZmF1bHQgZXhwb3J0XG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogaW1wb3J0IHsgc3ViYWdlbnRTdG9wSG9vaywgc3ViYWdlbnRTdG9wT3V0cHV0IH0gZnJvbSAnQGdvb2Rmb290L2NsYXVkZS1jb2RlLWhvb2tzJztcbiAqXG4gKiAvLyBCbG9jayBleHBsb3JlIHN1YmFnZW50cyBpZiB0YXNrIGluY29tcGxldGVcbiAqIGV4cG9ydCBkZWZhdWx0IHN1YmFnZW50U3RvcEhvb2soeyBtYXRjaGVyOiAnZXhwbG9yZScgfSwgYXN5bmMgKGlucHV0LCB7IGxvZ2dlciB9KSA9PiB7XG4gKiAgIGxvZ2dlci5pbmZvKCdTdWJhZ2VudCBzdG9wcGluZycsIHtcbiAqICAgICBhZ2VudElkOiBpbnB1dC5hZ2VudF9pZCxcbiAqICAgICBhZ2VudFR5cGU6IGlucHV0LmFnZW50X3R5cGVcbiAqICAgfSk7XG4gKlxuICogICAvLyBCbG9jayBpZiB0cmFuc2NyaXB0IHNob3dzIGluY29tcGxldGUgd29ya1xuICogICByZXR1cm4gc3ViYWdlbnRTdG9wT3V0cHV0KHtcbiAqICAgICBkZWNpc2lvbjogJ2Jsb2NrJyxcbiAqICAgICByZWFzb246ICdQbGVhc2UgdmVyaWZ5IGV4cGxvcmF0aW9uIGlzIGNvbXBsZXRlJ1xuICogICB9KTtcbiAqIH0pO1xuICogYGBgXG4gKiBAc2VlIGh0dHBzOi8vY29kZS5jbGF1ZGUuY29tL2RvY3MvZW4vaG9va3Mjc3ViYWdlbnRzdG9wXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzdWJhZ2VudFN0b3BIb29rKGNvbmZpZywgaGFuZGxlcikge1xuICAgIHJldHVybiBjcmVhdGVIb29rRnVuY3Rpb24oXCJTdWJhZ2VudFN0b3BcIiwgY29uZmlnLCBoYW5kbGVyKTtcbn1cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIFByZUNvbXBhY3QgSG9vayBGYWN0b3J5XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vKipcbiAqIENyZWF0ZXMgYSBQcmVDb21wYWN0IGhvb2sgaGFuZGxlci5cbiAqXG4gKiBQcmVDb21wYWN0IGhvb2tzIGZpcmUgYmVmb3JlIGNvbnRleHQgY29tcGFjdGlvbiBvY2N1cnMsIGFsbG93aW5nIHlvdSB0bzpcbiAqIC0gUHJlc2VydmUgaW1wb3J0YW50IGluZm9ybWF0aW9uIGJlZm9yZSBjb21wYWN0aW9uXG4gKiAtIExvZyBjb21wYWN0aW9uIGV2ZW50c1xuICogLSBNb2RpZnkgY3VzdG9tIGluc3RydWN0aW9ucyBmb3IgdGhlIGNvbXBhY3RlZCBjb250ZXh0XG4gKlxuICogKipNYXRjaGVyKio6IE1hdGNoZXMgYWdhaW5zdCBgdHJpZ2dlcmAgKCdtYW51YWwnLCAnYXV0bycpXG4gKiBAcGFyYW0gY29uZmlnIC0gSG9vayBjb25maWd1cmF0aW9uIHdpdGggb3B0aW9uYWwgbWF0Y2hlciBhbmQgdGltZW91dFxuICogQHBhcmFtIGhhbmRsZXIgLSBUaGUgaGFuZGxlciBmdW5jdGlvbiB0byBleGVjdXRlXG4gKiBAcmV0dXJucyBBIGhvb2sgZnVuY3Rpb24gdGhhdCBjYW4gYmUgZXhwb3J0ZWQgYXMgdGhlIGRlZmF1bHQgZXhwb3J0XG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogaW1wb3J0IHsgcHJlQ29tcGFjdEhvb2ssIHByZUNvbXBhY3RPdXRwdXQgfSBmcm9tICdAZ29vZGZvb3QvY2xhdWRlLWNvZGUtaG9va3MnO1xuICpcbiAqIC8vIExvZyBjb21wYWN0aW9uIGV2ZW50cyBhbmQgcHJlc2VydmUgY29udGV4dFxuICogZXhwb3J0IGRlZmF1bHQgcHJlQ29tcGFjdEhvb2soe30sIGFzeW5jIChpbnB1dCwgeyBsb2dnZXIgfSkgPT4ge1xuICogICBsb2dnZXIuaW5mbygnQ29udGV4dCBjb21wYWN0aW9uIHRyaWdnZXJlZCcsIHtcbiAqICAgICB0cmlnZ2VyOiBpbnB1dC50cmlnZ2VyLFxuICogICAgIGhhc0N1c3RvbUluc3RydWN0aW9uczogaW5wdXQuY3VzdG9tX2luc3RydWN0aW9ucyAhPT0gbnVsbFxuICogICB9KTtcbiAqXG4gKiAgIHJldHVybiBwcmVDb21wYWN0T3V0cHV0KHtcbiAqICAgICBzeXN0ZW1NZXNzYWdlOiAnUmVtZW1iZXI6IHN0cmljdCBtb2RlIGlzIGVuYWJsZWQnXG4gKiAgIH0pO1xuICogfSk7XG4gKiBgYGBcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiAvLyBPbmx5IGhhbmRsZSBtYW51YWwgY29tcGFjdGlvblxuICogZXhwb3J0IGRlZmF1bHQgcHJlQ29tcGFjdEhvb2soeyBtYXRjaGVyOiAnbWFudWFsJyB9LCBhc3luYyAoaW5wdXQsIHsgbG9nZ2VyIH0pID0+IHtcbiAqICAgbG9nZ2VyLmluZm8oJ01hbnVhbCBjb21wYWN0aW9uIHJlcXVlc3RlZCcpO1xuICogICByZXR1cm4gcHJlQ29tcGFjdE91dHB1dCh7fSk7XG4gKiB9KTtcbiAqIGBgYFxuICogQHNlZSBodHRwczovL2NvZGUuY2xhdWRlLmNvbS9kb2NzL2VuL2hvb2tzI3ByZWNvbXBhY3RcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHByZUNvbXBhY3RIb29rKGNvbmZpZywgaGFuZGxlcikge1xuICAgIHJldHVybiBjcmVhdGVIb29rRnVuY3Rpb24oXCJQcmVDb21wYWN0XCIsIGNvbmZpZywgaGFuZGxlcik7XG59XG4vKiogQGluaGVyaXRkb2MgKi9cbmV4cG9ydCBmdW5jdGlvbiBwZXJtaXNzaW9uUmVxdWVzdEhvb2soY29uZmlnLCBoYW5kbGVyKSB7XG4gICAgcmV0dXJuIGNyZWF0ZUhvb2tGdW5jdGlvbihcIlBlcm1pc3Npb25SZXF1ZXN0XCIsIGNvbmZpZywgaGFuZGxlcik7XG59XG4iLCAiLyoqXG4gKiBMb2dnZXIgc3lzdGVtIGZvciBDbGF1ZGUgQ29kZSBob29rcy5cbiAqXG4gKiBQcm92aWRlcyBzdHJ1Y3R1cmVkIGxvZ2dpbmcgd2l0aCBldmVudCBzdWJzY3JpcHRpb24gYW5kIG9wdGlvbmFsIGZpbGUgb3V0cHV0LlxuICogVGhlIGxvZ2dlciBpcyAqKnNpbGVudCBieSBkZWZhdWx0KiogdG8gYXZvaWQgaW50ZXJmZXJpbmcgd2l0aCBob29rIHByb3RvY29sXG4gKiAoc3Rkb3V0IGlzIHJlc2VydmVkIGZvciBKU09OIHJlc3BvbnNlcywgc3RkZXJyIG1heSBjb25mbGljdCB3aXRoIENsYXVkZSBDb2RlKS5cbiAqIEBtb2R1bGVcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBpbXBvcnQgeyBsb2dnZXIgfSBmcm9tICdAZ29vZGZvb3QvY2xhdWRlLWNvZGUtaG9va3MnO1xuICpcbiAqIC8vIFN1YnNjcmliZSB0byBsb2cgZXZlbnRzXG4gKiBjb25zdCB1bnN1YnNjcmliZSA9IGxvZ2dlci5vbignZXJyb3InLCAoZXZlbnQpID0+IHtcbiAqICAgY29uc29sZS5lcnJvcihgRXJyb3IgaW4gJHtldmVudC5ob29rVHlwZX06ICR7ZXZlbnQubWVzc2FnZX1gKTtcbiAqIH0pO1xuICpcbiAqIC8vIExhdGVyLCBjbGVhbiB1cFxuICogdW5zdWJzY3JpYmUoKTtcbiAqIGBgYFxuICogQHNlZSBodHRwczovL2NvZGUuY2xhdWRlLmNvbS9kb2NzL2VuL2hvb2tzXG4gKi9cbmltcG9ydCB7IGNsb3NlU3luYywgZXhpc3RzU3luYywgbWtkaXJTeW5jLCBvcGVuU3luYywgd3JpdGVTeW5jIH0gZnJvbSBcIm5vZGU6ZnNcIjtcbmltcG9ydCB7IGRpcm5hbWUgfSBmcm9tIFwibm9kZTpwYXRoXCI7XG4vKipcbiAqIEFsbCBsb2cgbGV2ZWxzIGluIG9yZGVyIG9mIHNldmVyaXR5IChsb3dlc3QgdG8gaGlnaGVzdCkuXG4gKi9cbmV4cG9ydCBjb25zdCBMT0dfTEVWRUxTID0gW1wiZGVidWdcIiwgXCJpbmZvXCIsIFwid2FyblwiLCBcImVycm9yXCJdO1xuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gTG9nZ2VyIENsYXNzXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vKipcbiAqIExvZ2dlciBmb3IgQ2xhdWRlIENvZGUgaG9va3Mgd2l0aCBldmVudCBzdWJzY3JpcHRpb24gYW5kIGZpbGUgb3V0cHV0LlxuICpcbiAqICMjIEtleSBCZWhhdmlvcnNcbiAqXG4gKiB8IENvbmZpZ3VyYXRpb24gfCBCZWhhdmlvciB8XG4gKiB8LS0tLS0tLS0tLS0tLS18LS0tLS0tLS0tLXxcbiAqIHwgTm8gY29uZmlnIChkZWZhdWx0KSB8ICoqU2lsZW50KiogLSBubyBvdXRwdXQgYW55d2hlcmUgfFxuICogfCBgQ0xBVURFX0NPREVfSE9PS1NfTE9HX0ZJTEVgIGVudiB2YXIgfCBBcHBlbmQgSlNPTiBsaW5lcyB0byBmaWxlIHxcbiAqIHwgYC5vbihsZXZlbCwgaGFuZGxlcilgIHJlZ2lzdGVyZWQgfCBFdmVudHMgZGVsaXZlcmVkIHRvIGhhbmRsZXJzIG9ubHkgfFxuICogfCBNdWx0aXBsZSBkZXN0aW5hdGlvbnMgfCBBbGwgZGVzdGluYXRpb25zIHJlY2VpdmUgZXZlbnRzIHxcbiAqXG4gKiAjIyBJbXBvcnRhbnQgTm90ZXNcbiAqXG4gKiAtICoqTmV2ZXIgb3V0cHV0cyB0byBzdGRvdXQqKiAocmVzZXJ2ZWQgZm9yIEpTT04gaG9vayByZXNwb25zZSlcbiAqIC0gKipOZXZlciBvdXRwdXRzIHRvIHN0ZGVycioqIChtYXkgaW50ZXJmZXJlIHdpdGggQ2xhdWRlIENvZGUgZXJyb3IgaGFuZGxpbmcpXG4gKiAtIEZpbGUgb3V0cHV0IHVzZXMgSlNPTiBMaW5lcyBmb3JtYXQgZm9yIGVhc3kgcGFyc2luZ1xuICogLSBgLm9uKGxldmVsLCBoYW5kbGVyKWAgcmV0dXJucyBhbiB1bnN1YnNjcmliZSBmdW5jdGlvblxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGltcG9ydCB7IGxvZ2dlciB9IGZyb20gJ0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcyc7XG4gKlxuICogLy8gU3Vic2NyaWJlIHRvIGV2ZW50cyBhdCBzcGVjaWZpYyBsZXZlbFxuICogbG9nZ2VyLm9uKCd3YXJuJywgKGV2ZW50KSA9PiB7XG4gKiAgIHNlbmRBbGVydChldmVudC5tZXNzYWdlKTtcbiAqIH0pO1xuICpcbiAqIC8vIExvZyB3aXRoaW4gYSBob29rIGhhbmRsZXJcbiAqIGV4cG9ydCBkZWZhdWx0IHByZVRvb2xVc2VIb29rKHsgbWF0Y2hlcjogJ0Jhc2gnIH0sIGFzeW5jIChpbnB1dCwgeyBsb2dnZXIgfSkgPT4ge1xuICogICBsb2dnZXIud2FybignQWJvdXQgdG8gdmFsaWRhdGUgQmFzaCBjb21tYW5kJyk7XG4gKiAgIHJldHVybiBwcmVUb29sVXNlT3V0cHV0KHsgYWxsb3c6IHRydWUgfSk7XG4gKiB9KTtcbiAqIGBgYFxuICovXG5leHBvcnQgY2xhc3MgTG9nZ2VyIHtcbiAgICAvKipcbiAgICAgKiBSZWdpc3RlcmVkIGV2ZW50IGhhbmRsZXJzIGJ5IGxvZyBsZXZlbC5cbiAgICAgKi9cbiAgICBoYW5kbGVycyA9IG5ldyBNYXAoKTtcbiAgICAvKipcbiAgICAgKiBGaWxlIGRlc2NyaXB0b3IgZm9yIGxvZyBmaWxlIG91dHB1dC5cbiAgICAgKiBMYXppbHkgaW5pdGlhbGl6ZWQgb24gZmlyc3Qgd3JpdGUuXG4gICAgICovXG4gICAgbG9nRmlsZUZkID0gbnVsbDtcbiAgICAvKipcbiAgICAgKiBQYXRoIHRvIHRoZSBsb2cgZmlsZSwgaWYgY29uZmlndXJlZC5cbiAgICAgKi9cbiAgICBsb2dGaWxlUGF0aCA9IG51bGw7XG4gICAgLyoqXG4gICAgICogV2hldGhlciBmaWxlIGluaXRpYWxpemF0aW9uIGhhcyBiZWVuIGF0dGVtcHRlZC5cbiAgICAgKi9cbiAgICBmaWxlSW5pdGlhbGl6ZWQgPSBmYWxzZTtcbiAgICAvKipcbiAgICAgKiBDdXJyZW50IGhvb2sgY29udGV4dCBmb3IgZW5yaWNoaW5nIGxvZyBldmVudHMuXG4gICAgICovXG4gICAgY3VycmVudEhvb2tUeXBlO1xuICAgIC8qKlxuICAgICAqIEN1cnJlbnQgaG9vayBpbnB1dCBmb3IgZW5yaWNoaW5nIGxvZyBldmVudHMuXG4gICAgICovXG4gICAgY3VycmVudElucHV0O1xuICAgIC8qKlxuICAgICAqIENyZWF0ZXMgYSBuZXcgTG9nZ2VyIGluc3RhbmNlLlxuICAgICAqXG4gICAgICogVHlwaWNhbGx5IHlvdSBzaG91bGQgdXNlIHRoZSBleHBvcnRlZCBgbG9nZ2VyYCBzaW5nbGV0b24gcmF0aGVyIHRoYW5cbiAgICAgKiBjcmVhdGluZyBuZXcgaW5zdGFuY2VzLlxuICAgICAqIEBwYXJhbSBjb25maWcgLSBPcHRpb25hbCBjb25maWd1cmF0aW9uXG4gICAgICogQGV4YW1wbGVcbiAgICAgKiBgYGB0eXBlc2NyaXB0XG4gICAgICogLy8gVXNlIHNpbmdsZXRvbiAocmVjb21tZW5kZWQpXG4gICAgICogaW1wb3J0IHsgbG9nZ2VyIH0gZnJvbSAnQGdvb2Rmb290L2NsYXVkZS1jb2RlLWhvb2tzJztcbiAgICAgKlxuICAgICAqIC8vIE9yIGNyZWF0ZSBjdXN0b20gaW5zdGFuY2VcbiAgICAgKiBjb25zdCBjdXN0b21Mb2dnZXIgPSBuZXcgTG9nZ2VyKHsgbG9nRmlsZVBhdGg6ICcvdmFyL2xvZy9ob29rcy5sb2cnIH0pO1xuICAgICAqIGBgYFxuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKGNvbmZpZyA9IHt9KSB7XG4gICAgICAgIC8vIEluaXRpYWxpemUgaGFuZGxlcnMgbWFwIGZvciBlYWNoIGxldmVsXG4gICAgICAgIGZvciAoY29uc3QgbGV2ZWwgb2YgTE9HX0xFVkVMUykge1xuICAgICAgICAgICAgdGhpcy5oYW5kbGVycy5zZXQobGV2ZWwsIG5ldyBTZXQoKSk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gU2V0IGxvZyBmaWxlIHBhdGggZnJvbSBjb25maWcgb3IgZW52aXJvbm1lbnRcbiAgICAgICAgdGhpcy5sb2dGaWxlUGF0aCA9IGNvbmZpZy5sb2dGaWxlUGF0aCA/PyBwcm9jZXNzLmVudi5DTEFVREVfQ09ERV9IT09LU19MT0dfRklMRSA/PyBudWxsO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBMb2dzIGEgZGVidWcgbWVzc2FnZS5cbiAgICAgKlxuICAgICAqIFVzZSBmb3IgZGV0YWlsZWQgZGVidWdnaW5nIGluZm9ybWF0aW9uIHRoYXQgaXMgdHlwaWNhbGx5IG9ubHkgdXNlZnVsXG4gICAgICogZHVyaW5nIGRldmVsb3BtZW50IG9yIHRyb3VibGVzaG9vdGluZy5cbiAgICAgKiBAcGFyYW0gbWVzc2FnZSAtIFRoZSBkZWJ1ZyBtZXNzYWdlXG4gICAgICogQHBhcmFtIGNvbnRleHQgLSBPcHRpb25hbCBhZGRpdGlvbmFsIGNvbnRleHRcbiAgICAgKiBAZXhhbXBsZVxuICAgICAqIGBgYHR5cGVzY3JpcHRcbiAgICAgKiBsb2dnZXIuZGVidWcoJ1Byb2Nlc3NpbmcgdG9vbCBpbnB1dCcsIHsgdG9vbE5hbWU6ICdCYXNoJywgaW5wdXRTaXplOiAyNTYgfSk7XG4gICAgICogYGBgXG4gICAgICovXG4gICAgZGVidWcobWVzc2FnZSwgY29udGV4dCkge1xuICAgICAgICB0aGlzLmVtaXQoXCJkZWJ1Z1wiLCBtZXNzYWdlLCBjb250ZXh0KTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogTG9ncyBhbiBpbmZvIG1lc3NhZ2UuXG4gICAgICpcbiAgICAgKiBVc2UgZm9yIGdlbmVyYWwgb3BlcmF0aW9uYWwgZXZlbnRzIGxpa2UgaG9vayBpbnZvY2F0aW9ucywgc3VjY2Vzc2Z1bFxuICAgICAqIGNvbXBsZXRpb25zLCBvciBzdGF0ZSBjaGFuZ2VzLlxuICAgICAqIEBwYXJhbSBtZXNzYWdlIC0gVGhlIGluZm8gbWVzc2FnZVxuICAgICAqIEBwYXJhbSBjb250ZXh0IC0gT3B0aW9uYWwgYWRkaXRpb25hbCBjb250ZXh0XG4gICAgICogQGV4YW1wbGVcbiAgICAgKiBgYGB0eXBlc2NyaXB0XG4gICAgICogbG9nZ2VyLmluZm8oJ1Nlc3Npb24gc3RhcnRlZCcsIHsgc291cmNlOiAnc3RhcnR1cCcsIHNlc3Npb25JZDogJ2FiYzEyMycgfSk7XG4gICAgICogYGBgXG4gICAgICovXG4gICAgaW5mbyhtZXNzYWdlLCBjb250ZXh0KSB7XG4gICAgICAgIHRoaXMuZW1pdChcImluZm9cIiwgbWVzc2FnZSwgY29udGV4dCk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIExvZ3MgYSB3YXJuaW5nIG1lc3NhZ2UuXG4gICAgICpcbiAgICAgKiBVc2UgZm9yIGNvbmRpdGlvbnMgdGhhdCBtYXkgaW5kaWNhdGUgaXNzdWVzIGJ1dCBkb24ndCBwcmV2ZW50XG4gICAgICogb3BlcmF0aW9uLCBzdWNoIGFzIGRlcHJlY2F0ZWQgcGF0dGVybnMgb3IgcGVyZm9ybWFuY2UgY29uY2VybnMuXG4gICAgICogQHBhcmFtIG1lc3NhZ2UgLSBUaGUgd2FybmluZyBtZXNzYWdlXG4gICAgICogQHBhcmFtIGNvbnRleHQgLSBPcHRpb25hbCBhZGRpdGlvbmFsIGNvbnRleHRcbiAgICAgKiBAZXhhbXBsZVxuICAgICAqIGBgYHR5cGVzY3JpcHRcbiAgICAgKiBsb2dnZXIud2FybignRGVwcmVjYXRlZCBob29rIHBhdHRlcm4gZGV0ZWN0ZWQnLCB7IHBhdHRlcm46ICdsZWdhY3lNYXRjaGVyJyB9KTtcbiAgICAgKiBgYGBcbiAgICAgKi9cbiAgICB3YXJuKG1lc3NhZ2UsIGNvbnRleHQpIHtcbiAgICAgICAgdGhpcy5lbWl0KFwid2FyblwiLCBtZXNzYWdlLCBjb250ZXh0KTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogTG9ncyBhbiBlcnJvciBtZXNzYWdlLlxuICAgICAqXG4gICAgICogVXNlIGZvciBlcnJvciBjb25kaXRpb25zIHRoYXQgcmVxdWlyZSBhdHRlbnRpb24gYnV0IHdlcmUgaGFuZGxlZFxuICAgICAqIGdyYWNlZnVsbHkuIEZvciBleGNlcHRpb25zLCBwcmVmZXIge0BsaW5rIGxvZ0Vycm9yfS5cbiAgICAgKiBAcGFyYW0gbWVzc2FnZSAtIFRoZSBlcnJvciBtZXNzYWdlXG4gICAgICogQHBhcmFtIGNvbnRleHQgLSBPcHRpb25hbCBhZGRpdGlvbmFsIGNvbnRleHRcbiAgICAgKiBAZXhhbXBsZVxuICAgICAqIGBgYHR5cGVzY3JpcHRcbiAgICAgKiBsb2dnZXIuZXJyb3IoJ0ZhaWxlZCB0byB2YWxpZGF0ZSB0b29sIGlucHV0JywgeyB0b29sTmFtZTogJ0Jhc2gnLCByZWFzb246ICdlbXB0eSBjb21tYW5kJyB9KTtcbiAgICAgKiBgYGBcbiAgICAgKi9cbiAgICBlcnJvcihtZXNzYWdlLCBjb250ZXh0KSB7XG4gICAgICAgIHRoaXMuZW1pdChcImVycm9yXCIsIG1lc3NhZ2UsIGNvbnRleHQpO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBMb2dzIGEgc3RydWN0dXJlZCBlcnJvciB3aXRoIGZ1bGwgZXJyb3IgZGV0YWlscy5cbiAgICAgKlxuICAgICAqIFVzZSB0aGlzIG1ldGhvZCB3aGVuIGxvZ2dpbmcgY2F1Z2h0IGV4Y2VwdGlvbnMgdG8gY2FwdHVyZSB0aGUgZnVsbFxuICAgICAqIGVycm9yIGNvbnRleHQgaW5jbHVkaW5nIG5hbWUsIG1lc3NhZ2UsIHN0YWNrIHRyYWNlLCBhbmQgY2F1c2UgY2hhaW4uXG4gICAgICogQHBhcmFtIGVycm9yIC0gVGhlIGVycm9yIHRvIGxvZ1xuICAgICAqIEBwYXJhbSBtZXNzYWdlIC0gSHVtYW4tcmVhZGFibGUgZGVzY3JpcHRpb24gb2Ygd2hhdCBmYWlsZWRcbiAgICAgKiBAcGFyYW0gY29udGV4dCAtIE9wdGlvbmFsIGFkZGl0aW9uYWwgY29udGV4dFxuICAgICAqIEBleGFtcGxlXG4gICAgICogYGBgdHlwZXNjcmlwdFxuICAgICAqIHRyeSB7XG4gICAgICogICBhd2FpdCBkYW5nZXJvdXNPcGVyYXRpb24oKTtcbiAgICAgKiB9IGNhdGNoIChlcnIpIHtcbiAgICAgKiAgIGxvZ2dlci5sb2dFcnJvcihlcnIsICdGYWlsZWQgdG8gZXhlY3V0ZSBkYW5nZXJvdXMgb3BlcmF0aW9uJywge1xuICAgICAqICAgICBvcGVyYXRpb246ICdkZWxldGUnLFxuICAgICAqICAgICB0YXJnZXQ6ICcvaW1wb3J0YW50L2ZpbGUudHh0J1xuICAgICAqICAgfSk7XG4gICAgICogfVxuICAgICAqIGBgYFxuICAgICAqL1xuICAgIGxvZ0Vycm9yKGVycm9yLCBtZXNzYWdlLCBjb250ZXh0KSB7XG4gICAgICAgIGNvbnN0IGVycm9ySW5mbyA9IHRoaXMuZXh0cmFjdEVycm9ySW5mbyhlcnJvcik7XG4gICAgICAgIGNvbnN0IGV2ZW50ID0ge1xuICAgICAgICAgICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXG4gICAgICAgICAgICBsZXZlbDogXCJlcnJvclwiLFxuICAgICAgICAgICAgaG9va1R5cGU6IHRoaXMuY3VycmVudEhvb2tUeXBlLFxuICAgICAgICAgICAgbWVzc2FnZSxcbiAgICAgICAgICAgIGlucHV0OiB0aGlzLmN1cnJlbnRJbnB1dCxcbiAgICAgICAgICAgIGVycm9yOiBlcnJvckluZm8sXG4gICAgICAgICAgICBjb250ZXh0LFxuICAgICAgICB9O1xuICAgICAgICB0aGlzLmRlbGl2ZXJFdmVudChldmVudCk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIFN1YnNjcmliZXMgYSBoYW5kbGVyIHRvIGxvZyBldmVudHMgYXQgdGhlIHNwZWNpZmllZCBsZXZlbC5cbiAgICAgKlxuICAgICAqIFRoZSBoYW5kbGVyIHdpbGwgYmUgY2FsbGVkIGZvciBldmVyeSBsb2cgZXZlbnQgYXQgdGhlIHNwZWNpZmllZCBsZXZlbC5cbiAgICAgKiBSZXR1cm5zIGFuIHVuc3Vic2NyaWJlIGZ1bmN0aW9uIHRoYXQgc2hvdWxkIGJlIGNhbGxlZCB3aGVuIHRoZSBoYW5kbGVyXG4gICAgICogaXMgbm8gbG9uZ2VyIG5lZWRlZC5cbiAgICAgKiBAcGFyYW0gbGV2ZWwgLSBUaGUgbG9nIGxldmVsIHRvIHN1YnNjcmliZSB0b1xuICAgICAqIEBwYXJhbSBoYW5kbGVyIC0gVGhlIGhhbmRsZXIgZnVuY3Rpb24gdG8gY2FsbCBmb3IgZWFjaCBldmVudFxuICAgICAqIEByZXR1cm5zIEEgZnVuY3Rpb24gdG8gdW5zdWJzY3JpYmUgdGhlIGhhbmRsZXJcbiAgICAgKiBAZXhhbXBsZVxuICAgICAqIGBgYHR5cGVzY3JpcHRcbiAgICAgKiAvLyBTdWJzY3JpYmUgdG8gZXJyb3IgZXZlbnRzXG4gICAgICogY29uc3QgdW5zdWJzY3JpYmUgPSBsb2dnZXIub24oJ2Vycm9yJywgKGV2ZW50KSA9PiB7XG4gICAgICogICBjb25zb2xlLmVycm9yKGBbJHtldmVudC5ob29rVHlwZX1dICR7ZXZlbnQubWVzc2FnZX1gKTtcbiAgICAgKiAgIGlmIChldmVudC5lcnJvcikge1xuICAgICAqICAgICBjb25zb2xlLmVycm9yKGV2ZW50LmVycm9yLnN0YWNrKTtcbiAgICAgKiAgIH1cbiAgICAgKiB9KTtcbiAgICAgKlxuICAgICAqIC8vIExhdGVyLCBjbGVhbiB1cFxuICAgICAqIHVuc3Vic2NyaWJlKCk7XG4gICAgICogYGBgXG4gICAgICogQGV4YW1wbGVcbiAgICAgKiBgYGB0eXBlc2NyaXB0XG4gICAgICogLy8gRm9yd2FyZCB0byBleHRlcm5hbCBsb2dnaW5nIGxpYnJhcnlcbiAgICAgKiBpbXBvcnQgcGlubyBmcm9tICdwaW5vJztcbiAgICAgKiBjb25zdCBwaW5vTG9nZ2VyID0gcGlubygpO1xuICAgICAqXG4gICAgICogbG9nZ2VyLm9uKCdpbmZvJywgKGV2ZW50KSA9PiBwaW5vTG9nZ2VyLmluZm8oZXZlbnQsIGV2ZW50Lm1lc3NhZ2UpKTtcbiAgICAgKiBsb2dnZXIub24oJ3dhcm4nLCAoZXZlbnQpID0+IHBpbm9Mb2dnZXIud2FybihldmVudCwgZXZlbnQubWVzc2FnZSkpO1xuICAgICAqIGxvZ2dlci5vbignZXJyb3InLCAoZXZlbnQpID0+IHBpbm9Mb2dnZXIuZXJyb3IoZXZlbnQsIGV2ZW50Lm1lc3NhZ2UpKTtcbiAgICAgKiBgYGBcbiAgICAgKi9cbiAgICBvbihsZXZlbCwgaGFuZGxlcikge1xuICAgICAgICBjb25zdCBsZXZlbEhhbmRsZXJzID0gdGhpcy5oYW5kbGVycy5nZXQobGV2ZWwpO1xuICAgICAgICBpZiAobGV2ZWxIYW5kbGVycykge1xuICAgICAgICAgICAgbGV2ZWxIYW5kbGVycy5hZGQoaGFuZGxlcik7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuICgpID0+IHtcbiAgICAgICAgICAgIGxldmVsSGFuZGxlcnM/LmRlbGV0ZShoYW5kbGVyKTtcbiAgICAgICAgfTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogU2V0cyB0aGUgY3VycmVudCBob29rIGNvbnRleHQgZm9yIGVucmljaGluZyBsb2cgZXZlbnRzLlxuICAgICAqXG4gICAgICogVGhpcyBpcyBjYWxsZWQgaW50ZXJuYWxseSBieSB0aGUgcnVudGltZSBiZWZvcmUgaW52b2tpbmcgaG9vayBoYW5kbGVycy5cbiAgICAgKiBZb3UgdHlwaWNhbGx5IGRvbid0IG5lZWQgdG8gY2FsbCB0aGlzIGRpcmVjdGx5LlxuICAgICAqIEBwYXJhbSBob29rVHlwZSAtIFRoZSB0eXBlIG9mIGhvb2sgYmVpbmcgZXhlY3V0ZWRcbiAgICAgKiBAcGFyYW0gaW5wdXQgLSBUaGUgaG9vayBpbnB1dCBkYXRhXG4gICAgICogQGludGVybmFsXG4gICAgICovXG4gICAgc2V0Q29udGV4dChob29rVHlwZSwgaW5wdXQpIHtcbiAgICAgICAgdGhpcy5jdXJyZW50SG9va1R5cGUgPSBob29rVHlwZTtcbiAgICAgICAgdGhpcy5jdXJyZW50SW5wdXQgPSBpbnB1dDtcbiAgICB9XG4gICAgLyoqXG4gICAgICogQ2xlYXJzIHRoZSBjdXJyZW50IGhvb2sgY29udGV4dC5cbiAgICAgKlxuICAgICAqIENhbGxlZCBpbnRlcm5hbGx5IGJ5IHRoZSBydW50aW1lIGFmdGVyIGhvb2sgZXhlY3V0aW9uIGNvbXBsZXRlcy5cbiAgICAgKiBAaW50ZXJuYWxcbiAgICAgKi9cbiAgICBjbGVhckNvbnRleHQoKSB7XG4gICAgICAgIHRoaXMuY3VycmVudEhvb2tUeXBlID0gdW5kZWZpbmVkO1xuICAgICAgICB0aGlzLmN1cnJlbnRJbnB1dCA9IHVuZGVmaW5lZDtcbiAgICB9XG4gICAgLyoqXG4gICAgICogQ29uZmlndXJlcyB0aGUgbG9nIGZpbGUgcGF0aCBhdCBydW50aW1lLlxuICAgICAqXG4gICAgICogQ2FsbCB0aGlzIHRvIGVuYWJsZSBvciBjaGFuZ2UgZmlsZSBsb2dnaW5nLiBTZXR0aW5nIHRvIGBudWxsYCBkaXNhYmxlc1xuICAgICAqIGZpbGUgbG9nZ2luZyAoYnV0IGRvZXNuJ3QgY2xvc2UgZXhpc3RpbmcgZmlsZSBoYW5kbGUgaW1tZWRpYXRlbHkpLlxuICAgICAqIEBwYXJhbSBmaWxlUGF0aCAtIFBhdGggdG8gdGhlIGxvZyBmaWxlLCBvciBudWxsIHRvIGRpc2FibGVcbiAgICAgKiBAZXhhbXBsZVxuICAgICAqIGBgYHR5cGVzY3JpcHRcbiAgICAgKiAvLyBFbmFibGUgZmlsZSBsb2dnaW5nIGF0IHJ1bnRpbWVcbiAgICAgKiBsb2dnZXIuc2V0TG9nRmlsZSgnL3Zhci9sb2cvY2xhdWRlLWhvb2tzLmxvZycpO1xuICAgICAqXG4gICAgICogLy8gRGlzYWJsZSBmaWxlIGxvZ2dpbmdcbiAgICAgKiBsb2dnZXIuc2V0TG9nRmlsZShudWxsKTtcbiAgICAgKiBgYGBcbiAgICAgKi9cbiAgICBzZXRMb2dGaWxlKGZpbGVQYXRoKSB7XG4gICAgICAgIC8vIENsb3NlIGV4aXN0aW5nIGZpbGUgaWYgb3BlblxuICAgICAgICBpZiAodGhpcy5sb2dGaWxlRmQgIT09IG51bGwpIHtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgY2xvc2VTeW5jKHRoaXMubG9nRmlsZUZkKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhdGNoIHtcbiAgICAgICAgICAgICAgICAvLyBJZ25vcmUgZXJyb3JzIG9uIGNsb3NlXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLmxvZ0ZpbGVGZCA9IG51bGw7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5sb2dGaWxlUGF0aCA9IGZpbGVQYXRoO1xuICAgICAgICB0aGlzLmZpbGVJbml0aWFsaXplZCA9IGZhbHNlO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBDbG9zZXMgYWxsIHJlc291cmNlcyBoZWxkIGJ5IHRoZSBsb2dnZXIuXG4gICAgICpcbiAgICAgKiBDYWxsIHRoaXMgZHVyaW5nIGdyYWNlZnVsIHNodXRkb3duIHRvIGVuc3VyZSBhbGwgbG9nIGRhdGEgaXMgZmx1c2hlZC5cbiAgICAgKiBAZXhhbXBsZVxuICAgICAqIGBgYHR5cGVzY3JpcHRcbiAgICAgKiBwcm9jZXNzLm9uKCdleGl0JywgKCkgPT4ge1xuICAgICAqICAgbG9nZ2VyLmNsb3NlKCk7XG4gICAgICogfSk7XG4gICAgICogYGBgXG4gICAgICovXG4gICAgY2xvc2UoKSB7XG4gICAgICAgIGlmICh0aGlzLmxvZ0ZpbGVGZCAhPT0gbnVsbCkge1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICBjbG9zZVN5bmModGhpcy5sb2dGaWxlRmQpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2F0Y2gge1xuICAgICAgICAgICAgICAgIC8vIElnbm9yZSBlcnJvcnMgb24gY2xvc2VcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMubG9nRmlsZUZkID0gbnVsbDtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmZpbGVJbml0aWFsaXplZCA9IGZhbHNlO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBDaGVja3MgaWYgdGhlcmUgYXJlIGFueSBhY3RpdmUgaGFuZGxlcnMgb3IgZGVzdGluYXRpb25zLlxuICAgICAqXG4gICAgICogUmV0dXJucyB0cnVlIGlmIGFueSBoYW5kbGVycyBhcmUgcmVnaXN0ZXJlZCBvciBmaWxlIGxvZ2dpbmcgaXMgZW5hYmxlZC5cbiAgICAgKiBAcmV0dXJucyBXaGV0aGVyIHRoZSBsb2dnZXIgaGFzIGFueSBhY3RpdmUgb3V0cHV0IGRlc3RpbmF0aW9uc1xuICAgICAqL1xuICAgIGhhc0Rlc3RpbmF0aW9ucygpIHtcbiAgICAgICAgZm9yIChjb25zdCBoYW5kbGVycyBvZiB0aGlzLmhhbmRsZXJzLnZhbHVlcygpKSB7XG4gICAgICAgICAgICBpZiAoaGFuZGxlcnMuc2l6ZSA+IDApXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXMubG9nRmlsZVBhdGggIT09IG51bGw7XG4gICAgfVxuICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICAvLyBQcml2YXRlIE1ldGhvZHNcbiAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICAgLyoqXG4gICAgICogRW1pdHMgYSBsb2cgZXZlbnQuXG4gICAgICogQHBhcmFtIGxldmVsIC0gVGhlIHNldmVyaXR5IGxldmVsIG9mIHRoZSBldmVudFxuICAgICAqIEBwYXJhbSBtZXNzYWdlIC0gVGhlIGxvZyBtZXNzYWdlXG4gICAgICogQHBhcmFtIGNvbnRleHQgLSBPcHRpb25hbCBhZGRpdGlvbmFsIGNvbnRleHQgZGF0YVxuICAgICAqL1xuICAgIGVtaXQobGV2ZWwsIG1lc3NhZ2UsIGNvbnRleHQpIHtcbiAgICAgICAgY29uc3QgZXZlbnQgPSB7XG4gICAgICAgICAgICB0aW1lc3RhbXA6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcbiAgICAgICAgICAgIGxldmVsLFxuICAgICAgICAgICAgaG9va1R5cGU6IHRoaXMuY3VycmVudEhvb2tUeXBlLFxuICAgICAgICAgICAgbWVzc2FnZSxcbiAgICAgICAgICAgIGlucHV0OiB0aGlzLmN1cnJlbnRJbnB1dCxcbiAgICAgICAgICAgIGNvbnRleHQsXG4gICAgICAgIH07XG4gICAgICAgIHRoaXMuZGVsaXZlckV2ZW50KGV2ZW50KTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogRGVsaXZlcnMgYW4gZXZlbnQgdG8gYWxsIHJlZ2lzdGVyZWQgZGVzdGluYXRpb25zLlxuICAgICAqIEBwYXJhbSBldmVudCAtIFRoZSBsb2cgZXZlbnQgdG8gZGVsaXZlclxuICAgICAqL1xuICAgIGRlbGl2ZXJFdmVudChldmVudCkge1xuICAgICAgICAvLyBEZWxpdmVyIHRvIGV2ZW50IGhhbmRsZXJzXG4gICAgICAgIGNvbnN0IGxldmVsSGFuZGxlcnMgPSB0aGlzLmhhbmRsZXJzLmdldChldmVudC5sZXZlbCk7XG4gICAgICAgIGlmIChsZXZlbEhhbmRsZXJzKSB7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGhhbmRsZXIgb2YgbGV2ZWxIYW5kbGVycykge1xuICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgIGhhbmRsZXIoZXZlbnQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjYXRjaCB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFNpbGVudGx5IGlnbm9yZSBoYW5kbGVyIGVycm9ycyB0byBub3QgZGlzcnVwdCBob29rIGV4ZWN1dGlvblxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICAvLyBXcml0ZSB0byBmaWxlIGlmIGNvbmZpZ3VyZWRcbiAgICAgICAgdGhpcy53cml0ZVRvRmlsZShldmVudCk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIFdyaXRlcyBhbiBldmVudCB0byB0aGUgbG9nIGZpbGUuXG4gICAgICogQHBhcmFtIGV2ZW50IC0gVGhlIGxvZyBldmVudCB0byB3cml0ZVxuICAgICAqL1xuICAgIHdyaXRlVG9GaWxlKGV2ZW50KSB7XG4gICAgICAgIGlmICghdGhpcy5sb2dGaWxlUGF0aClcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgLy8gTGF6eSBpbml0aWFsaXphdGlvbiBvZiBmaWxlIGhhbmRsZVxuICAgICAgICBpZiAoIXRoaXMuZmlsZUluaXRpYWxpemVkKSB7XG4gICAgICAgICAgICB0aGlzLmluaXRpYWxpemVGaWxlKCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRoaXMubG9nRmlsZUZkID09PSBudWxsKVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgbGluZSA9IGAke0pTT04uc3RyaW5naWZ5KGV2ZW50KX1cXG5gO1xuICAgICAgICAgICAgd3JpdGVTeW5jKHRoaXMubG9nRmlsZUZkLCBsaW5lKTtcbiAgICAgICAgfVxuICAgICAgICBjYXRjaCB7XG4gICAgICAgICAgICAvLyBTaWxlbnRseSBpZ25vcmUgZmlsZSB3cml0ZSBlcnJvcnMgdG8gbm90IGRpc3J1cHQgaG9vayBleGVjdXRpb25cbiAgICAgICAgICAgIC8vIFRoaXMgZm9sbG93cyB0aGUgcmlzayBtaXRpZ2F0aW9uOiBcIkdyYWNlZnVsIGRlZ3JhZGF0aW9uIC0gbG9nIHdyaXRlXG4gICAgICAgICAgICAvLyBmYWlsdXJlcyBhcmUgc2lsZW50bHkgaWdub3JlZCB0byBub3QgZGlzcnVwdCBob29rIGV4ZWN1dGlvblwiXG4gICAgICAgIH1cbiAgICB9XG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZXMgdGhlIGxvZyBmaWxlIGZvciB3cml0aW5nLlxuICAgICAqL1xuICAgIGluaXRpYWxpemVGaWxlKCkge1xuICAgICAgICB0aGlzLmZpbGVJbml0aWFsaXplZCA9IHRydWU7XG4gICAgICAgIGlmICghdGhpcy5sb2dGaWxlUGF0aClcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIC8vIEVuc3VyZSBkaXJlY3RvcnkgZXhpc3RzXG4gICAgICAgICAgICBjb25zdCBkaXIgPSBkaXJuYW1lKHRoaXMubG9nRmlsZVBhdGgpO1xuICAgICAgICAgICAgaWYgKCFleGlzdHNTeW5jKGRpcikpIHtcbiAgICAgICAgICAgICAgICBta2RpclN5bmMoZGlyLCB7IHJlY3Vyc2l2ZTogdHJ1ZSB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIE9wZW4gZmlsZSBmb3IgYXBwZW5kaW5nXG4gICAgICAgICAgICB0aGlzLmxvZ0ZpbGVGZCA9IG9wZW5TeW5jKHRoaXMubG9nRmlsZVBhdGgsIFwiYVwiKTtcbiAgICAgICAgfVxuICAgICAgICBjYXRjaCB7XG4gICAgICAgICAgICAvLyBTaWxlbnRseSBpZ25vcmUgZmlsZSBpbml0aWFsaXphdGlvbiBlcnJvcnNcbiAgICAgICAgICAgIHRoaXMubG9nRmlsZUZkID0gbnVsbDtcbiAgICAgICAgfVxuICAgIH1cbiAgICAvKipcbiAgICAgKiBFeHRyYWN0cyBzdHJ1Y3R1cmVkIGVycm9yIGluZm9ybWF0aW9uIGZyb20gYW4gdW5rbm93biBlcnJvci5cbiAgICAgKiBAcGFyYW0gZXJyb3IgLSBUaGUgZXJyb3IgdG8gZXh0cmFjdCBpbmZvcm1hdGlvbiBmcm9tXG4gICAgICogQHJldHVybnMgU3RydWN0dXJlZCBlcnJvciBpbmZvcm1hdGlvblxuICAgICAqL1xuICAgIGV4dHJhY3RFcnJvckluZm8oZXJyb3IpIHtcbiAgICAgICAgaWYgKGVycm9yIGluc3RhbmNlb2YgRXJyb3IpIHtcbiAgICAgICAgICAgIGNvbnN0IGluZm8gPSB7XG4gICAgICAgICAgICAgICAgbmFtZTogZXJyb3IubmFtZSxcbiAgICAgICAgICAgICAgICBtZXNzYWdlOiBlcnJvci5tZXNzYWdlLFxuICAgICAgICAgICAgICAgIHN0YWNrOiBlcnJvci5zdGFjayxcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICAvLyBFeHRyYWN0IGNhdXNlIGNoYWluIGlmIHByZXNlbnRcbiAgICAgICAgICAgIGlmIChlcnJvci5jYXVzZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgaW5mby5jYXVzZSA9IHRoaXMuZXh0cmFjdEVycm9ySW5mbyhlcnJvci5jYXVzZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gaW5mbztcbiAgICAgICAgfVxuICAgICAgICAvLyBIYW5kbGUgbm9uLUVycm9yIHZhbHVlc1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgbmFtZTogXCJVbmtub3duRXJyb3JcIixcbiAgICAgICAgICAgIG1lc3NhZ2U6IFN0cmluZyhlcnJvciksXG4gICAgICAgIH07XG4gICAgfVxufVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gU2luZ2xldG9uIEV4cG9ydFxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLyoqXG4gKiBHbG9iYWwgbG9nZ2VyIGluc3RhbmNlIGZvciBDbGF1ZGUgQ29kZSBob29rcy5cbiAqXG4gKiBVc2UgdGhpcyBzaW5nbGV0b24gZm9yIGFsbCBsb2dnaW5nIHdpdGhpbiBob29rcy4gVGhlIGxvZ2dlciBpcyBjb25maWd1cmVkXG4gKiB2aWEgZW52aXJvbm1lbnQgdmFyaWFibGVzIGFuZCBzdXBwb3J0cyBldmVudCBzdWJzY3JpcHRpb24gZm9yIGN1c3RvbVxuICogZGVzdGluYXRpb25zLlxuICpcbiAqICMjIENvbmZpZ3VyYXRpb25cbiAqXG4gKiB8IEVudmlyb25tZW50IFZhcmlhYmxlIHwgRGVzY3JpcHRpb24gfFxuICogfC0tLS0tLS0tLS0tLS0tLS0tLS0tLXwtLS0tLS0tLS0tLS0tfFxuICogfCBgQ0xBVURFX0NPREVfSE9PS1NfTE9HX0ZJTEVgIHwgUGF0aCB0byBsb2cgZmlsZSAoSlNPTiBMaW5lcyBmb3JtYXQpIHxcbiAqXG4gKiAjIyBVc2FnZSBpbiBIb29rc1xuICpcbiAqIFRoZSBsb2dnZXIgaXMgcGFzc2VkIHRvIGhvb2sgaGFuZGxlcnMgdmlhIGNvbnRleHQgZm9yIGNvbnZlbmllbmNlOlxuICpcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGV4cG9ydCBkZWZhdWx0IHByZVRvb2xVc2VIb29rKHsgbWF0Y2hlcjogJ0Jhc2gnIH0sIGFzeW5jIChpbnB1dCwgeyBsb2dnZXIgfSkgPT4ge1xuICogICBsb2dnZXIud2FybignVmFsaWRhdGluZyBCYXNoIGNvbW1hbmQnKTtcbiAqICAgcmV0dXJuIHByZVRvb2xVc2VPdXRwdXQoeyBhbGxvdzogdHJ1ZSB9KTtcbiAqIH0pO1xuICogYGBgXG4gKlxuICogIyMgRXh0ZXJuYWwgSW50ZWdyYXRpb25cbiAqXG4gKiBTdWJzY3JpYmUgdG8gZXZlbnRzIHRvIGZvcndhcmQgbG9ncyB0byBleHRlcm5hbCBzeXN0ZW1zOlxuICpcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGltcG9ydCB7IGxvZ2dlciB9IGZyb20gJ0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcyc7XG4gKiBpbXBvcnQgcGlubyBmcm9tICdwaW5vJztcbiAqXG4gKiBjb25zdCBwaW5vTG9nZ2VyID0gcGlubyh7IGxldmVsOiAnZGVidWcnIH0pO1xuICpcbiAqIGxvZ2dlci5vbignZGVidWcnLCAoZXZlbnQpID0+IHBpbm9Mb2dnZXIuZGVidWcoZXZlbnQsIGV2ZW50Lm1lc3NhZ2UpKTtcbiAqIGxvZ2dlci5vbignaW5mbycsIChldmVudCkgPT4gcGlub0xvZ2dlci5pbmZvKGV2ZW50LCBldmVudC5tZXNzYWdlKSk7XG4gKiBsb2dnZXIub24oJ3dhcm4nLCAoZXZlbnQpID0+IHBpbm9Mb2dnZXIud2FybihldmVudCwgZXZlbnQubWVzc2FnZSkpO1xuICogbG9nZ2VyLm9uKCdlcnJvcicsIChldmVudCkgPT4gcGlub0xvZ2dlci5lcnJvcihldmVudCwgZXZlbnQubWVzc2FnZSkpO1xuICogYGBgXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogLy8gRGlyZWN0IHVzYWdlXG4gKiBpbXBvcnQgeyBsb2dnZXIgfSBmcm9tICdAZ29vZGZvb3QvY2xhdWRlLWNvZGUtaG9va3MnO1xuICpcbiAqIGxvZ2dlci5pbmZvKCdTdGFydGluZyBvcGVyYXRpb24nKTtcbiAqIGxvZ2dlci53YXJuKCdSZXNvdXJjZSBsaW1pdCBhcHByb2FjaGluZycsIHsgdXNhZ2U6IDAuOSB9KTtcbiAqXG4gKiB0cnkge1xuICogICBhd2FpdCByaXNreU9wZXJhdGlvbigpO1xuICogfSBjYXRjaCAoZXJyKSB7XG4gKiAgIGxvZ2dlci5sb2dFcnJvcihlcnIsICdSaXNreSBvcGVyYXRpb24gZmFpbGVkJyk7XG4gKiB9XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNvbnN0IGxvZ2dlciA9IG5ldyBMb2dnZXIoKTtcbiIsICIvKipcbiAqIE91dHB1dCB0eXBlcyBhbmQgYnVpbGRlcnMgZm9yIENsYXVkZSBDb2RlIGhvb2tzLlxuICpcbiAqIFByb3ZpZGVzIHR5cGUtc2FmZSBvdXRwdXQgYnVpbGRlciBmdW5jdGlvbnMgZm9yIGFsbCAxMiBob29rIHR5cGVzLiBFYWNoIGJ1aWxkZXJcbiAqIGFjY2VwdHMgb3B0aW9ucyB0aGF0IG1hdGNoIHRoZSB3aXJlIGZvcm1hdCBleHBlY3RlZCBieSBDbGF1ZGUgQ29kZSwgd2l0aCB0eXBlc1xuICogZGVyaXZlZCBmcm9tIHRoZSBDbGF1ZGUgQWdlbnQgU0RLJ3MgYFN5bmNIb29rSlNPTk91dHB1dGAgdHlwZS5cbiAqIEBzZWUgaHR0cHM6Ly9jb2RlLmNsYXVkZS5jb20vZG9jcy9lbi9ob29rc1xuICogQG1vZHVsZVxuICovXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBFeGl0IENvZGUgQ29uc3RhbnRzXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vKipcbiAqIEV4aXQgY29kZXMgdXNlZCBieSBDbGF1ZGUgQ29kZSBob29rcy5cbiAqXG4gKiB8IEV4aXQgQ29kZSB8IE5hbWUgfCBXaGVuIFVzZWQgfCBDbGF1ZGUgQ29kZSBCZWhhdmlvciB8XG4gKiB8LS0tLS0tLS0tLS18LS0tLS0tfC0tLS0tLS0tLS0tfC0tLS0tLS0tLS0tLS0tLS0tLS0tLXxcbiAqIHwgMCB8IFN1Y2Nlc3MgfCBIYW5kbGVyIHJldHVybnMgbm9ybWFsbHkgfCBDb250aW51ZSwgcGFyc2Ugc3Rkb3V0IGFzIEpTT04gfFxuICogfCAxIHwgRXJyb3IgfCBJbnZhbGlkIGlucHV0LCBub24tYmxvY2tpbmcgZXJyb3IgfCBOb24tYmxvY2tpbmcsIHN0ZGVyciB0byB1c2VyIG9ubHkgfFxuICogfCAyIHwgQmxvY2sgfCBIYW5kbGVyIHRocm93cyBPUiBgc3RvcFJlYXNvbmAgc2V0IHwgQmxvY2tpbmcsIHN0ZGVyciBzaG93biB0byBDbGF1ZGUgfFxuICovXG5leHBvcnQgY29uc3QgRVhJVF9DT0RFUyA9IHtcbiAgICAvKiogSGFuZGxlciBjb21wbGV0ZWQgc3VjY2Vzc2Z1bGx5LiBDbGF1ZGUgQ29kZSBwYXJzZXMgc3Rkb3V0IGFzIEpTT04uICovXG4gICAgU1VDQ0VTUzogMCxcbiAgICAvKiogTm9uLWJsb2NraW5nIGVycm9yIG9jY3VycmVkIChlLmcuLCBpbnZhbGlkIGlucHV0KS4gc3RkZXJyIHNob3duIHRvIHVzZXIgb25seS4gKi9cbiAgICBFUlJPUjogMSxcbiAgICAvKiogSGFuZGxlciB0aHJldyBleGNlcHRpb24gT1IgYmxvY2tpbmcgYWN0aW9uIHJlcXVlc3RlZC4gc3RkZXJyIHNob3duIHRvIENsYXVkZS4gKi9cbiAgICBCTE9DSzogMixcbn07XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBPdXRwdXQgQnVpbGRlciBGYWN0b3JpZXNcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8qKlxuICogRmFjdG9yeSBmb3IgaG9va3MgdGhhdCBoYXZlIGhvb2tTcGVjaWZpY091dHB1dCB3aXRoIGEgaG9va0V2ZW50TmFtZSBkaXNjcmltaW5hdG9yLlxuICogQHBhcmFtIGhvb2tUeXBlIC0gVGhlIGhvb2sgdHlwZSBuYW1lIHVzZWQgYXMgdGhlIF90eXBlIGRpc2NyaW1pbmF0b3JcbiAqIEByZXR1cm5zIEEgYnVpbGRlciBmdW5jdGlvbiB0aGF0IGNyZWF0ZXMgdGhlIG91dHB1dCBvYmplY3RcbiAqIEBpbnRlcm5hbFxuICovXG5mdW5jdGlvbiBjcmVhdGVIb29rU3BlY2lmaWNPdXRwdXRCdWlsZGVyKGhvb2tUeXBlKSB7XG4gICAgcmV0dXJuIChvcHRpb25zID0ge30pID0+IHtcbiAgICAgICAgY29uc3QgeyBob29rU3BlY2lmaWNPdXRwdXQsIC4uLnJlc3QgfSA9IG9wdGlvbnM7XG4gICAgICAgIGNvbnN0IHN0ZG91dCA9IGhvb2tTcGVjaWZpY091dHB1dCAhPT0gdW5kZWZpbmVkXG4gICAgICAgICAgICA/IHsgLi4ucmVzdCwgaG9va1NwZWNpZmljT3V0cHV0OiB7IGhvb2tFdmVudE5hbWU6IGhvb2tUeXBlLCAuLi5ob29rU3BlY2lmaWNPdXRwdXQgfSB9XG4gICAgICAgICAgICA6IHJlc3Q7XG4gICAgICAgIHJldHVybiB7IF90eXBlOiBob29rVHlwZSwgc3Rkb3V0IH07XG4gICAgfTtcbn1cbi8qKlxuICogRmFjdG9yeSBmb3IgaG9va3MgdGhhdCBvbmx5IHVzZSBDb21tb25PcHRpb25zIChzaW1wbGUgcGFzc3Rocm91Z2gpLlxuICogQHBhcmFtIGhvb2tUeXBlIC0gVGhlIGhvb2sgdHlwZSBuYW1lIHVzZWQgYXMgdGhlIF90eXBlIGRpc2NyaW1pbmF0b3JcbiAqIEByZXR1cm5zIEEgYnVpbGRlciBmdW5jdGlvbiB0aGF0IGNyZWF0ZXMgdGhlIG91dHB1dCBvYmplY3RcbiAqIEBpbnRlcm5hbFxuICovXG5mdW5jdGlvbiBjcmVhdGVTaW1wbGVPdXRwdXRCdWlsZGVyKGhvb2tUeXBlKSB7XG4gICAgcmV0dXJuIChvcHRpb25zID0ge30pID0+ICh7XG4gICAgICAgIF90eXBlOiBob29rVHlwZSxcbiAgICAgICAgc3Rkb3V0OiBvcHRpb25zLFxuICAgIH0pO1xufVxuLyoqXG4gKiBGYWN0b3J5IGZvciBob29rcyB0aGF0IHVzZSBkZWNpc2lvbi1iYXNlZCBvcHRpb25zIChTdG9wLCBTdWJhZ2VudFN0b3ApLlxuICogQHBhcmFtIGhvb2tUeXBlIC0gVGhlIGhvb2sgdHlwZSBuYW1lIHVzZWQgYXMgdGhlIF90eXBlIGRpc2NyaW1pbmF0b3JcbiAqIEByZXR1cm5zIEEgYnVpbGRlciBmdW5jdGlvbiB0aGF0IGNyZWF0ZXMgdGhlIG91dHB1dCBvYmplY3RcbiAqIEBpbnRlcm5hbFxuICovXG5mdW5jdGlvbiBjcmVhdGVEZWNpc2lvbk91dHB1dEJ1aWxkZXIoaG9va1R5cGUpIHtcbiAgICByZXR1cm4gKG9wdGlvbnMgPSB7fSkgPT4gKHtcbiAgICAgICAgX3R5cGU6IGhvb2tUeXBlLFxuICAgICAgICBzdGRvdXQ6IG9wdGlvbnMsXG4gICAgfSk7XG59XG4vKipcbiAqIENyZWF0ZXMgYW4gb3V0cHV0IGZvciBQcmVUb29sVXNlIGhvb2tzLlxuICogQHBhcmFtIG9wdGlvbnMgLSBDb25maWd1cmF0aW9uIG9wdGlvbnMgZm9yIHRoZSBob29rIG91dHB1dFxuICogQHJldHVybnMgQSBQcmVUb29sVXNlT3V0cHV0IG9iamVjdCByZWFkeSBmb3IgdGhlIHJ1bnRpbWVcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiAvLyBBbGxvdyB0b29sIGV4ZWN1dGlvblxuICogcHJlVG9vbFVzZU91dHB1dCh7XG4gKiAgIGhvb2tTcGVjaWZpY091dHB1dDogeyBwZXJtaXNzaW9uRGVjaXNpb246ICdhbGxvdycgfVxuICogfSk7XG4gKlxuICogLy8gRGVueSB3aXRoIHJlYXNvblxuICogcHJlVG9vbFVzZU91dHB1dCh7XG4gKiAgIGhvb2tTcGVjaWZpY091dHB1dDoge1xuICogICAgIHBlcm1pc3Npb25EZWNpc2lvbjogJ2RlbnknLFxuICogICAgIHBlcm1pc3Npb25EZWNpc2lvblJlYXNvbjogJ0Rhbmdlcm91cyBjb21tYW5kIGRldGVjdGVkJ1xuICogICB9XG4gKiB9KTtcbiAqXG4gKiAvLyBBbGxvdyB3aXRoIG1vZGlmaWVkIGlucHV0XG4gKiBwcmVUb29sVXNlT3V0cHV0KHtcbiAqICAgaG9va1NwZWNpZmljT3V0cHV0OiB7XG4gKiAgICAgcGVybWlzc2lvbkRlY2lzaW9uOiAnYWxsb3cnLFxuICogICAgIHVwZGF0ZWRJbnB1dDogeyBjb21tYW5kOiAnbHMgLWxhJyB9XG4gKiAgIH1cbiAqIH0pO1xuICogYGBgXG4gKi9cbmV4cG9ydCBjb25zdCBwcmVUb29sVXNlT3V0cHV0ID0gLyogQF9fUFVSRV9fICovIGNyZWF0ZUhvb2tTcGVjaWZpY091dHB1dEJ1aWxkZXIoXCJQcmVUb29sVXNlXCIpO1xuLyoqXG4gKiBDcmVhdGVzIGFuIG91dHB1dCBmb3IgUG9zdFRvb2xVc2UgaG9va3MuXG4gKiBAcGFyYW0gb3B0aW9ucyAtIENvbmZpZ3VyYXRpb24gb3B0aW9ucyBmb3IgdGhlIGhvb2sgb3V0cHV0XG4gKiBAcmV0dXJucyBBIFBvc3RUb29sVXNlT3V0cHV0IG9iamVjdCByZWFkeSBmb3IgdGhlIHJ1bnRpbWVcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiAvLyBBZGQgY29udGV4dCBhZnRlciBhIGZpbGUgcmVhZFxuICogcG9zdFRvb2xVc2VPdXRwdXQoe1xuICogICBob29rU3BlY2lmaWNPdXRwdXQ6IHtcbiAqICAgICBhZGRpdGlvbmFsQ29udGV4dDogJ0ZpbGUgY29udGFpbnMgc2Vuc2l0aXZlIGRhdGEnXG4gKiAgIH1cbiAqIH0pO1xuICogYGBgXG4gKi9cbmV4cG9ydCBjb25zdCBwb3N0VG9vbFVzZU91dHB1dCA9IC8qIEBfX1BVUkVfXyAqLyBjcmVhdGVIb29rU3BlY2lmaWNPdXRwdXRCdWlsZGVyKFwiUG9zdFRvb2xVc2VcIik7XG4vKipcbiAqIENyZWF0ZXMgYW4gb3V0cHV0IGZvciBQb3N0VG9vbFVzZUZhaWx1cmUgaG9va3MuXG4gKiBAcGFyYW0gb3B0aW9ucyAtIENvbmZpZ3VyYXRpb24gb3B0aW9ucyBmb3IgdGhlIGhvb2sgb3V0cHV0XG4gKiBAcmV0dXJucyBBIFBvc3RUb29sVXNlRmFpbHVyZU91dHB1dCBvYmplY3QgcmVhZHkgZm9yIHRoZSBydW50aW1lXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogcG9zdFRvb2xVc2VGYWlsdXJlT3V0cHV0KHtcbiAqICAgaG9va1NwZWNpZmljT3V0cHV0OiB7XG4gKiAgICAgYWRkaXRpb25hbENvbnRleHQ6ICdUcnkgdXNpbmcgYSBkaWZmZXJlbnQgYXBwcm9hY2gnXG4gKiAgIH1cbiAqIH0pO1xuICogYGBgXG4gKi9cbmV4cG9ydCBjb25zdCBwb3N0VG9vbFVzZUZhaWx1cmVPdXRwdXQgPSAvKiBAX19QVVJFX18gKi8gY3JlYXRlSG9va1NwZWNpZmljT3V0cHV0QnVpbGRlcihcIlBvc3RUb29sVXNlRmFpbHVyZVwiKTtcbi8qKlxuICogQ3JlYXRlcyBhbiBvdXRwdXQgZm9yIFVzZXJQcm9tcHRTdWJtaXQgaG9va3MuXG4gKiBAcGFyYW0gb3B0aW9ucyAtIENvbmZpZ3VyYXRpb24gb3B0aW9ucyBmb3IgdGhlIGhvb2sgb3V0cHV0XG4gKiBAcmV0dXJucyBBIFVzZXJQcm9tcHRTdWJtaXRPdXRwdXQgb2JqZWN0IHJlYWR5IGZvciB0aGUgcnVudGltZVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIHVzZXJQcm9tcHRTdWJtaXRPdXRwdXQoe1xuICogICBob29rU3BlY2lmaWNPdXRwdXQ6IHtcbiAqICAgICBhZGRpdGlvbmFsQ29udGV4dDogJ1RoaXMgcHJvamVjdCB1c2VzIFR5cGVTY3JpcHQgc3RyaWN0IG1vZGUnXG4gKiAgIH1cbiAqIH0pO1xuICogYGBgXG4gKi9cbmV4cG9ydCBjb25zdCB1c2VyUHJvbXB0U3VibWl0T3V0cHV0ID0gLyogQF9fUFVSRV9fICovIGNyZWF0ZUhvb2tTcGVjaWZpY091dHB1dEJ1aWxkZXIoXCJVc2VyUHJvbXB0U3VibWl0XCIpO1xuLyoqXG4gKiBDcmVhdGVzIGFuIG91dHB1dCBmb3IgU2Vzc2lvblN0YXJ0IGhvb2tzLlxuICogQHBhcmFtIG9wdGlvbnMgLSBDb25maWd1cmF0aW9uIG9wdGlvbnMgZm9yIHRoZSBob29rIG91dHB1dFxuICogQHJldHVybnMgQSBTZXNzaW9uU3RhcnRPdXRwdXQgb2JqZWN0IHJlYWR5IGZvciB0aGUgcnVudGltZVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIHNlc3Npb25TdGFydE91dHB1dCh7XG4gKiAgIGhvb2tTcGVjaWZpY091dHB1dDoge1xuICogICAgIGFkZGl0aW9uYWxDb250ZXh0OiBKU09OLnN0cmluZ2lmeSh7IHByb2plY3Q6ICdteS1wcm9qZWN0JyB9KVxuICogICB9XG4gKiB9KTtcbiAqIGBgYFxuICovXG5leHBvcnQgY29uc3Qgc2Vzc2lvblN0YXJ0T3V0cHV0ID0gLyogQF9fUFVSRV9fICovIGNyZWF0ZUhvb2tTcGVjaWZpY091dHB1dEJ1aWxkZXIoXCJTZXNzaW9uU3RhcnRcIik7XG4vKipcbiAqIENyZWF0ZXMgYW4gb3V0cHV0IGZvciBTZXNzaW9uRW5kIGhvb2tzLlxuICogQHBhcmFtIG9wdGlvbnMgLSBDb25maWd1cmF0aW9uIG9wdGlvbnMgZm9yIHRoZSBob29rIG91dHB1dFxuICogQHJldHVybnMgQSBTZXNzaW9uRW5kT3V0cHV0IG9iamVjdCByZWFkeSBmb3IgdGhlIHJ1bnRpbWVcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBzZXNzaW9uRW5kT3V0cHV0KHt9KTtcbiAqIGBgYFxuICovXG5leHBvcnQgY29uc3Qgc2Vzc2lvbkVuZE91dHB1dCA9IC8qIEBfX1BVUkVfXyAqLyBjcmVhdGVTaW1wbGVPdXRwdXRCdWlsZGVyKFwiU2Vzc2lvbkVuZFwiKTtcbi8qKlxuICogQ3JlYXRlcyBhbiBvdXRwdXQgZm9yIFN0b3AgaG9va3MuXG4gKiBAcGFyYW0gb3B0aW9ucyAtIENvbmZpZ3VyYXRpb24gb3B0aW9ucyBmb3IgdGhlIGhvb2sgb3V0cHV0XG4gKiBAcmV0dXJucyBBIFN0b3BPdXRwdXQgb2JqZWN0IHJlYWR5IGZvciB0aGUgcnVudGltZVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIC8vIEFsbG93IHRoZSBzdG9wXG4gKiBzdG9wT3V0cHV0KHsgZGVjaXNpb246ICdhcHByb3ZlJyB9KTtcbiAqXG4gKiAvLyBCbG9jayB3aXRoIHJlYXNvblxuICogc3RvcE91dHB1dCh7XG4gKiAgIGRlY2lzaW9uOiAnYmxvY2snLFxuICogICByZWFzb246ICdUaGVyZSBhcmUgdW5jb21taXR0ZWQgY2hhbmdlcydcbiAqIH0pO1xuICogYGBgXG4gKi9cbmV4cG9ydCBjb25zdCBzdG9wT3V0cHV0ID0gLyogQF9fUFVSRV9fICovIGNyZWF0ZURlY2lzaW9uT3V0cHV0QnVpbGRlcihcIlN0b3BcIik7XG4vKipcbiAqIENyZWF0ZXMgYW4gb3V0cHV0IGZvciBTdWJhZ2VudFN0YXJ0IGhvb2tzLlxuICogQHBhcmFtIG9wdGlvbnMgLSBDb25maWd1cmF0aW9uIG9wdGlvbnMgZm9yIHRoZSBob29rIG91dHB1dFxuICogQHJldHVybnMgQSBTdWJhZ2VudFN0YXJ0T3V0cHV0IG9iamVjdCByZWFkeSBmb3IgdGhlIHJ1bnRpbWVcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBzdWJhZ2VudFN0YXJ0T3V0cHV0KHtcbiAqICAgaG9va1NwZWNpZmljT3V0cHV0OiB7XG4gKiAgICAgYWRkaXRpb25hbENvbnRleHQ6ICdGb2N1cyBvbiBmaW5kaW5nIHBhdHRlcm5zJ1xuICogICB9XG4gKiB9KTtcbiAqIGBgYFxuICovXG5leHBvcnQgY29uc3Qgc3ViYWdlbnRTdGFydE91dHB1dCA9IC8qIEBfX1BVUkVfXyAqLyBjcmVhdGVIb29rU3BlY2lmaWNPdXRwdXRCdWlsZGVyKFwiU3ViYWdlbnRTdGFydFwiKTtcbi8qKlxuICogQ3JlYXRlcyBhbiBvdXRwdXQgZm9yIFN1YmFnZW50U3RvcCBob29rcy5cbiAqIEBwYXJhbSBvcHRpb25zIC0gQ29uZmlndXJhdGlvbiBvcHRpb25zIGZvciB0aGUgaG9vayBvdXRwdXRcbiAqIEByZXR1cm5zIEEgU3ViYWdlbnRTdG9wT3V0cHV0IG9iamVjdCByZWFkeSBmb3IgdGhlIHJ1bnRpbWVcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiAvLyBCbG9jayB3aXRoIHJlYXNvblxuICogc3ViYWdlbnRTdG9wT3V0cHV0KHtcbiAqICAgZGVjaXNpb246ICdibG9jaycsXG4gKiAgIHJlYXNvbjogJ1Rhc2sgbm90IGNvbXBsZXRlJ1xuICogfSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNvbnN0IHN1YmFnZW50U3RvcE91dHB1dCA9IC8qIEBfX1BVUkVfXyAqLyBjcmVhdGVEZWNpc2lvbk91dHB1dEJ1aWxkZXIoXCJTdWJhZ2VudFN0b3BcIik7XG4vKipcbiAqIENyZWF0ZXMgYW4gb3V0cHV0IGZvciBOb3RpZmljYXRpb24gaG9va3MuXG4gKiBAcGFyYW0gb3B0aW9ucyAtIENvbmZpZ3VyYXRpb24gb3B0aW9ucyBmb3IgdGhlIGhvb2sgb3V0cHV0XG4gKiBAcmV0dXJucyBBIE5vdGlmaWNhdGlvbk91dHB1dCBvYmplY3QgcmVhZHkgZm9yIHRoZSBydW50aW1lXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogLy8gQWRkIGNvbnRleHQgYWJvdXQgdGhlIG5vdGlmaWNhdGlvblxuICogbm90aWZpY2F0aW9uT3V0cHV0KHtcbiAqICAgaG9va1NwZWNpZmljT3V0cHV0OiB7XG4gKiAgICAgYWRkaXRpb25hbENvbnRleHQ6ICdOb3RpZmljYXRpb24gZm9yd2FyZGVkIHRvIFNsYWNrICNhbGVydHMgY2hhbm5lbCdcbiAqICAgfVxuICogfSk7XG4gKlxuICogLy8gU3VwcHJlc3MgdGhlIG5vdGlmaWNhdGlvblxuICogbm90aWZpY2F0aW9uT3V0cHV0KHsgc3VwcHJlc3NPdXRwdXQ6IHRydWUgfSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNvbnN0IG5vdGlmaWNhdGlvbk91dHB1dCA9IC8qIEBfX1BVUkVfXyAqLyBjcmVhdGVIb29rU3BlY2lmaWNPdXRwdXRCdWlsZGVyKFwiTm90aWZpY2F0aW9uXCIpO1xuLyoqXG4gKiBDcmVhdGVzIGFuIG91dHB1dCBmb3IgUHJlQ29tcGFjdCBob29rcy5cbiAqIEBwYXJhbSBvcHRpb25zIC0gQ29uZmlndXJhdGlvbiBvcHRpb25zIGZvciB0aGUgaG9vayBvdXRwdXRcbiAqIEByZXR1cm5zIEEgUHJlQ29tcGFjdE91dHB1dCBvYmplY3QgcmVhZHkgZm9yIHRoZSBydW50aW1lXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogcHJlQ29tcGFjdE91dHB1dCh7XG4gKiAgIHN5c3RlbU1lc3NhZ2U6ICdSZW1lbWJlcjogc3RyaWN0IG1vZGUgaXMgZW5hYmxlZCdcbiAqIH0pO1xuICogYGBgXG4gKi9cbmV4cG9ydCBjb25zdCBwcmVDb21wYWN0T3V0cHV0ID0gLyogQF9fUFVSRV9fICovIGNyZWF0ZVNpbXBsZU91dHB1dEJ1aWxkZXIoXCJQcmVDb21wYWN0XCIpO1xuLyoqXG4gKiBDcmVhdGVzIGFuIG91dHB1dCBmb3IgUGVybWlzc2lvblJlcXVlc3QgaG9va3MuXG4gKiBAcGFyYW0gb3B0aW9ucyAtIENvbmZpZ3VyYXRpb24gb3B0aW9ucyBmb3IgdGhlIGhvb2sgb3V0cHV0XG4gKiBAcmV0dXJucyBBIFBlcm1pc3Npb25SZXF1ZXN0T3V0cHV0IG9iamVjdCByZWFkeSBmb3IgdGhlIHJ1bnRpbWVcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiAvLyBBdXRvLWFwcHJvdmVcbiAqIHBlcm1pc3Npb25SZXF1ZXN0T3V0cHV0KHtcbiAqICAgaG9va1NwZWNpZmljT3V0cHV0OiB7XG4gKiAgICAgZGVjaXNpb246IHsgYmVoYXZpb3I6ICdhbGxvdycgfVxuICogICB9XG4gKiB9KTtcbiAqXG4gKiAvLyBBdXRvLWFwcHJvdmUgd2l0aCBtb2RpZmllZCBpbnB1dFxuICogcGVybWlzc2lvblJlcXVlc3RPdXRwdXQoe1xuICogICBob29rU3BlY2lmaWNPdXRwdXQ6IHtcbiAqICAgICBkZWNpc2lvbjoge1xuICogICAgICAgYmVoYXZpb3I6ICdhbGxvdycsXG4gKiAgICAgICB1cGRhdGVkSW5wdXQ6IHsgZmlsZV9wYXRoOiAnL3NhZmUvcGF0aCcgfVxuICogICAgIH1cbiAqICAgfVxuICogfSk7XG4gKlxuICogLy8gQXV0by1kZW55XG4gKiBwZXJtaXNzaW9uUmVxdWVzdE91dHB1dCh7XG4gKiAgIGhvb2tTcGVjaWZpY091dHB1dDoge1xuICogICAgIGRlY2lzaW9uOiB7XG4gKiAgICAgICBiZWhhdmlvcjogJ2RlbnknLFxuICogICAgICAgbWVzc2FnZTogJ05vdCBhbGxvd2VkJyxcbiAqICAgICAgIGludGVycnVwdDogdHJ1ZVxuICogICAgIH1cbiAqICAgfVxuICogfSk7XG4gKlxuICogLy8gRmFsbCB0aHJvdWdoIHRvIG5vcm1hbCBwcm9tcHRcbiAqIHBlcm1pc3Npb25SZXF1ZXN0T3V0cHV0KHt9KTtcbiAqIGBgYFxuICovXG5leHBvcnQgY29uc3QgcGVybWlzc2lvblJlcXVlc3RPdXRwdXQgPSAvKiBAX19QVVJFX18gKi8gY3JlYXRlSG9va1NwZWNpZmljT3V0cHV0QnVpbGRlcihcIlBlcm1pc3Npb25SZXF1ZXN0XCIpO1xuIiwgIi8qKlxuICogUnVudGltZSBtb2R1bGUgZm9yIENsYXVkZSBDb2RlIGhvb2tzLlxuICpcbiAqIEhhbmRsZXMgc3RkaW4vc3Rkb3V0L2V4aXQgY29kZSBzZW1hbnRpY3MgZm9yIGNvbXBpbGVkIGhvb2sgZXhlY3V0aW9uLlxuICogVGhpcyBtb2R1bGUgaXMgdGhlIGNvcmUgb3JjaGVzdHJhdG9yIHRoYXQ6XG4gKiAtIFJlYWRzIEpTT04gZnJvbSBzdGRpbiAod2lyZSBmb3JtYXQgd2l0aCBzbmFrZV9jYXNlIHByb3BlcnRpZXMpXG4gKiAtIEludm9rZXMgdGhlIGhvb2sgaGFuZGxlclxuICogLSBXcml0ZXMgb3V0cHV0IHRvIHN0ZG91dFxuICogLSBNYW5hZ2VzIGV4aXQgY29kZXNcbiAqIEBtb2R1bGVcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiAvLyBJbiBhIGNvbXBpbGVkIGhvb2sgZmlsZVxuICogaW1wb3J0IHsgZXhlY3V0ZSB9IGZyb20gJ0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcy9ydW50aW1lJztcbiAqIGltcG9ydCBteUhvb2sgZnJvbSAnLi9teS1ob29rLmpzJztcbiAqXG4gKiBleGVjdXRlKG15SG9vayk7XG4gKiBgYGBcbiAqIEBzZWUgaHR0cHM6Ly9jb2RlLmNsYXVkZS5jb20vZG9jcy9lbi9ob29rc1xuICovXG5pbXBvcnQgeyBwZXJzaXN0RW52VmFyLCBwZXJzaXN0RW52VmFycyB9IGZyb20gXCIuL2Vudi5qc1wiO1xuaW1wb3J0IHsgbG9nZ2VyIH0gZnJvbSBcIi4vbG9nZ2VyLmpzXCI7XG5pbXBvcnQgeyBFWElUX0NPREVTIH0gZnJvbSBcIi4vb3V0cHV0cy5qc1wiO1xuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gU3RkaW4vU3Rkb3V0IEhhbmRsaW5nXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vKipcbiAqIFJlYWRzIGFsbCBkYXRhIGZyb20gc3RkaW4uXG4gKiBAcmV0dXJucyBQcm9taXNlIHJlc29sdmluZyB0byB0aGUgY29tcGxldGUgc3RkaW4gY29udGVudFxuICovXG5hc3luYyBmdW5jdGlvbiByZWFkU3RkaW4oKSB7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgY29uc3QgY2h1bmtzID0gW107XG4gICAgICAgIC8vIFNldCBlbmNvZGluZyBmaXJzdCB0byBlbnN1cmUgZGF0YSBldmVudHMgcmVjZWl2ZSBzdHJpbmdzXG4gICAgICAgIHByb2Nlc3Muc3RkaW4uc2V0RW5jb2RpbmcoXCJ1dGYtOFwiKTtcbiAgICAgICAgcHJvY2Vzcy5zdGRpbi5vbihcImRhdGFcIiwgKGNodW5rKSA9PiB7XG4gICAgICAgICAgICBjaHVua3MucHVzaChjaHVuayk7XG4gICAgICAgIH0pO1xuICAgICAgICBwcm9jZXNzLnN0ZGluLm9uKFwiZW5kXCIsICgpID0+IHtcbiAgICAgICAgICAgIHJlc29sdmUoY2h1bmtzLmpvaW4oXCJcIikpO1xuICAgICAgICB9KTtcbiAgICAgICAgcHJvY2Vzcy5zdGRpbi5vbihcImVycm9yXCIsIChlcnJvcikgPT4ge1xuICAgICAgICAgICAgcmVqZWN0KGVycm9yKTtcbiAgICAgICAgfSk7XG4gICAgfSk7XG59XG4vKipcbiAqIFBhcnNlcyBzdGRpbiBKU09OIGlucHV0LlxuICogQHBhcmFtIHN0ZGluQ29udGVudCAtIFJhdyBzdGRpbiBjb250ZW50XG4gKiBAcmV0dXJucyBQYXJzZWQgaW5wdXQgKHdpcmUgZm9ybWF0IHdpdGggc25ha2VfY2FzZSBwcm9wZXJ0aWVzKVxuICogQHRocm93cyBFcnJvciBpZiBKU09OIGlzIG1hbGZvcm1lZFxuICovXG5mdW5jdGlvbiBwYXJzZVN0ZGluSW5wdXQoc3RkaW5Db250ZW50KSB7XG4gICAgLy8gUGFyc2UgSlNPTiAtIGlucHV0IHVzZXMgd2lyZSBmb3JtYXQgKHNuYWtlX2Nhc2UpIGRpcmVjdGx5XG4gICAgY29uc3QgcmF3SW5wdXQgPSBKU09OLnBhcnNlKHN0ZGluQ29udGVudCk7XG4gICAgcmV0dXJuIHJhd0lucHV0O1xufVxuLyoqXG4gKiBXcml0ZXMgaG9vayBvdXRwdXQgdG8gc3Rkb3V0LlxuICpcbiAqIE91dHB1dCB1c2VzIGNhbWVsQ2FzZSBrZXlzIHBlciBDbGF1ZGUgQ29kZSBob29rIHNwZWNpZmljYXRpb24uXG4gKiBAcGFyYW0gb3V0cHV0IC0gVGhlIGhvb2sgb3V0cHV0IHRvIHdyaXRlXG4gKiBAc2VlIGh0dHBzOi8vY29kZS5jbGF1ZGUuY29tL2RvY3MvZW4vaG9va3MjaG9vay1vdXRwdXQtc3RydWN0dXJlXG4gKi9cbmZ1bmN0aW9uIHdyaXRlU3Rkb3V0KG91dHB1dCkge1xuICAgIC8vIE91dHB1dCB1c2VzIGNhbWVsQ2FzZSAtIG5vIHRyYW5zZm9ybWF0aW9uIG5lZWRlZFxuICAgIHByb2Nlc3Muc3Rkb3V0LndyaXRlKEpTT04uc3RyaW5naWZ5KG91dHB1dCkpO1xufVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gRXJyb3IgSGFuZGxpbmdcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8qKlxuICogQ3JlYXRlcyBhbiBlcnJvciBvdXRwdXQgZm9yIG1hbGZvcm1lZCBzdGRpbiBKU09OLlxuICogQHBhcmFtIGVycm9yIC0gVGhlIHBhcnNlIGVycm9yXG4gKiBAcmV0dXJucyBIb29rT3V0cHV0IHdpdGggZW1wdHkgc3Rkb3V0XG4gKi9cbmZ1bmN0aW9uIGNyZWF0ZU1hbGZvcm1lZElucHV0T3V0cHV0KGVycm9yKSB7XG4gICAgbG9nZ2VyLmVycm9yKGBJbnZhbGlkIEpTT04gaW5wdXQ6ICR7ZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiBTdHJpbmcoZXJyb3IpfWApO1xuICAgIHJldHVybiB7IHN0ZG91dDoge30gfTtcbn1cbi8qKlxuICogV3JpdGVzIGhhbmRsZXIgZXJyb3Igc3RhY2t0cmFjZSB0byBzdGRlcnIgYW5kIGV4aXRzIHdpdGggY29kZSAyLlxuICpcbiAqIFdoZW4gYSBob29rIGhhbmRsZXIgdGhyb3dzIGFuIGV4Y2VwdGlvbjpcbiAqIC0gU3RhY2t0cmFjZSAod2l0aCBzb3VyY2VtYXBzIGlmIGF2YWlsYWJsZSkgaXMgb3V0cHV0IHRvIHN0ZGVyclxuICogLSBQcm9jZXNzIGV4aXRzIHdpdGggY29kZSAyIChCTE9DSylcbiAqIC0gTm8gSlNPTiBpcyBvdXRwdXQgdG8gc3Rkb3V0XG4gKiBAcGFyYW0gZXJyb3IgLSBUaGUgZXJyb3IgdGhyb3duIGJ5IHRoZSBoYW5kbGVyXG4gKi9cbmZ1bmN0aW9uIGhhbmRsZUhhbmRsZXJFcnJvcihlcnJvcikge1xuICAgIC8vIFdyaXRlIHN0YWNrIHRyYWNlIHRvIHN0ZGVyciAoc291cmNlbWFwcyBhcmUgYXBwbGllZCBhdXRvbWF0aWNhbGx5IGJ5IE5vZGUuanMpXG4gICAgaWYgKGVycm9yIGluc3RhbmNlb2YgRXJyb3IpIHtcbiAgICAgICAgcHJvY2Vzcy5zdGRlcnIud3JpdGUoYCR7ZXJyb3Iuc3RhY2sgPz8gZXJyb3IubWVzc2FnZX1cXG5gKTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIHByb2Nlc3Muc3RkZXJyLndyaXRlKGAke1N0cmluZyhlcnJvcil9XFxuYCk7XG4gICAgfVxuICAgIC8vIExvZyB0byBmaWxlIGlmIGNvbmZpZ3VyZWRcbiAgICBsb2dnZXIuZXJyb3IoYEhvb2sgaGFuZGxlciBlcnJvcjogJHtlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6IFN0cmluZyhlcnJvcil9YCk7XG4gICAgLy8gQ2xlYXIgbG9nZ2VyIGNvbnRleHQgYW5kIGNsb3NlXG4gICAgbG9nZ2VyLmNsZWFyQ29udGV4dCgpO1xuICAgIGxvZ2dlci5jbG9zZSgpO1xuICAgIC8vIEV4aXQgd2l0aCBjb2RlIDIgKEJMT0NLKSAtIG5vIEpTT04gb3V0cHV0XG4gICAgcHJvY2Vzcy5leGl0KEVYSVRfQ09ERVMuQkxPQ0spO1xufVxuLyoqXG4gKiBDb252ZXJ0cyBhIFNwZWNpZmljSG9va091dHB1dCB0byBIb29rT3V0cHV0IGZvciB3aXJlIGZvcm1hdC5cbiAqXG4gKiBTcGVjaWZpY0hvb2tPdXRwdXQgdHlwZXMgaGF2ZTogeyBfdHlwZSwgZXhpdENvZGUsIHN0ZG91dCwgc3RkZXJyPyB9XG4gKiBIb29rT3V0cHV0IGhhczogeyBleGl0Q29kZSwgc3Rkb3V0LCBzdGRlcnI/IH1cbiAqXG4gKiBTaW5jZSBvdXRwdXQgYnVpbGRlcnMgbm93IHByb2R1Y2Ugd2lyZS1mb3JtYXQgZGlyZWN0bHksIHRoaXMgZnVuY3Rpb25cbiAqIHNpbXBseSBzdHJpcHMgdGhlIGBfdHlwZWAgZGlzY3JpbWluYXRvciBmaWVsZC5cbiAqIEBwYXJhbSBzcGVjaWZpY091dHB1dCAtIFRoZSBzcGVjaWZpYyBvdXRwdXQgZnJvbSBhIGhvb2sgaGFuZGxlclxuICogQHJldHVybnMgSG9va091dHB1dCByZWFkeSBmb3Igc2VyaWFsaXphdGlvblxuICogQHNlZSBodHRwczovL2NvZGUuY2xhdWRlLmNvbS9kb2NzL2VuL2hvb2tzI2hvb2stb3V0cHV0LXN0cnVjdHVyZVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGNvbnN0IHNwZWNpZmljT3V0cHV0ID0gcHJlVG9vbFVzZU91dHB1dCh7IGhvb2tTcGVjaWZpY091dHB1dDogeyBwZXJtaXNzaW9uRGVjaXNpb246ICdhbGxvdycgfSB9KTtcbiAqIGNvbnN0IGhvb2tPdXRwdXQgPSBjb252ZXJ0VG9Ib29rT3V0cHV0KHNwZWNpZmljT3V0cHV0KTtcbiAqIC8vIGhvb2tPdXRwdXQ6IHsgZXhpdENvZGU6IDAsIHN0ZG91dDogeyBob29rU3BlY2lmaWNPdXRwdXQ6IHsgLi4uIH0gfSB9XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNvbnZlcnRUb0hvb2tPdXRwdXQoc3BlY2lmaWNPdXRwdXQpIHtcbiAgICByZXR1cm4geyBzdGRvdXQ6IHNwZWNpZmljT3V0cHV0LnN0ZG91dCB9O1xufVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gRXhlY3V0ZSBGdW5jdGlvblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLyoqXG4gKiBFeGVjdXRlcyBhIGhvb2sgaGFuZGxlciB3aXRoIGZ1bGwgcnVudGltZSBvcmNoZXN0cmF0aW9uLlxuICpcbiAqIFRoaXMgaXMgdGhlIG1haW4gZW50cnkgcG9pbnQgdGhhdCBjb21waWxlZCBob29rcyB1c2UuIFdoZW4gYSBjb21waWxlZCBob29rXG4gKiBydW5zIGFzIGEgQ0xJOlxuICpcbiAqIDEuIFJlYWRzIGFsbCBzdGRpblxuICogMi4gUGFyc2VzIEpTT04gKHdpcmUgZm9ybWF0IHdpdGggc25ha2VfY2FzZSBwcm9wZXJ0aWVzKVxuICogMy4gU2V0cyB1cCBsb2dnZXIgY29udGV4dCAoaG9va1R5cGUsIGlucHV0KVxuICogNC4gQ2FsbHMgaGFuZGxlciB3aXRoIGlucHV0IGFuZCBjb250ZXh0IChsb2dnZXIpXG4gKiA1LiBIYW5kbGVzIGFueSBlcnJvcnMsIGxvZ3MgdGhlbVxuICogNi4gV3JpdGVzIEpTT04gdG8gc3Rkb3V0XG4gKiA3LiBDbG9zZXMgbG9nZ2VyXG4gKiA4LiBFeGl0cyB3aXRoIGFwcHJvcHJpYXRlIGNvZGVcbiAqIEBwYXJhbSBob29rRm4gLSBUaGUgaG9vayBmdW5jdGlvbiB0byBleGVjdXRlIChmcm9tIGhvb2sgZmFjdG9yeSlcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiAvLyBJbiBjb21waWxlZCBob29rIGZpbGVcbiAqIGltcG9ydCB7IGV4ZWN1dGUgfSBmcm9tICdAZ29vZGZvb3QvY2xhdWRlLWNvZGUtaG9va3MvcnVudGltZSc7XG4gKiBpbXBvcnQgeyBwcmVUb29sVXNlSG9vaywgcHJlVG9vbFVzZU91dHB1dCB9IGZyb20gJ0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcyc7XG4gKlxuICogY29uc3QgbXlIb29rID0gcHJlVG9vbFVzZUhvb2soeyBtYXRjaGVyOiAnQmFzaCcgfSwgYXN5bmMgKGlucHV0LCB7IGxvZ2dlciB9KSA9PiB7XG4gKiAgIGxvZ2dlci5pbmZvKCdQcm9jZXNzaW5nIEJhc2ggY29tbWFuZCcpO1xuICogICByZXR1cm4gcHJlVG9vbFVzZU91dHB1dCh7IGFsbG93OiB0cnVlIH0pO1xuICogfSk7XG4gKlxuICogZXhlY3V0ZShteUhvb2spO1xuICogYGBgXG4gKiBAc2VlIGh0dHBzOi8vY29kZS5jbGF1ZGUuY29tL2RvY3MvZW4vaG9va3NcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGV4ZWN1dGUoaG9va0ZuKSB7XG4gICAgbGV0IG91dHB1dDtcbiAgICB0cnkge1xuICAgICAgICAvLyBDaGVjayBmb3IgbG9nIGZpbGUgY29uZmlndXJhdGlvbiBjb25mbGljdHNcbiAgICAgICAgLy8gQ0xBVURFX0NPREVfSE9PS1NfQ0xJX0xPR19GSUxFIGlzIGluamVjdGVkIGJ5IHRoZSBDTEkgLS1sb2cgcGFyYW1ldGVyXG4gICAgICAgIC8vIENMQVVERV9DT0RFX0hPT0tTX0xPR19GSUxFIGlzIHRoZSB1c2VyJ3MgZW52aXJvbm1lbnQgdmFyaWFibGVcbiAgICAgICAgY29uc3QgY2xpTG9nRmlsZSA9IHByb2Nlc3MuZW52LkNMQVVERV9DT0RFX0hPT0tTX0NMSV9MT0dfRklMRTtcbiAgICAgICAgY29uc3QgZW52TG9nRmlsZSA9IHByb2Nlc3MuZW52LkNMQVVERV9DT0RFX0hPT0tTX0xPR19GSUxFO1xuICAgICAgICBpZiAoY2xpTG9nRmlsZSAhPT0gdW5kZWZpbmVkICYmIGVudkxvZ0ZpbGUgIT09IHVuZGVmaW5lZCAmJiBjbGlMb2dGaWxlICE9PSBlbnZMb2dGaWxlKSB7XG4gICAgICAgICAgICAvLyBXcml0ZSBlcnJvciB0byBzdGRlcnIgYW5kIGV4aXQgd2l0aCBlcnJvciBjb2RlXG4gICAgICAgICAgICBwcm9jZXNzLnN0ZGVyci53cml0ZShgTG9nIGZpbGUgY29uZmlndXJhdGlvbiBjb25mbGljdDogQ0xJIC0tbG9nPVwiJHtjbGlMb2dGaWxlfVwiIHZzIENMQVVERV9DT0RFX0hPT0tTX0xPR19GSUxFPVwiJHtlbnZMb2dGaWxlfVwiLiBgICtcbiAgICAgICAgICAgICAgICBcIlVzZSBvbmx5IG9uZSBtZXRob2QgdG8gY29uZmlndXJlIGhvb2sgbG9nZ2luZy5cXG5cIik7XG4gICAgICAgICAgICBwcm9jZXNzLmV4aXQoRVhJVF9DT0RFUy5FUlJPUik7XG4gICAgICAgIH1cbiAgICAgICAgLy8gSWYgQ0xJIGxvZyBmaWxlIGlzIHNldCwgY29uZmlndXJlIHRoZSBsb2dnZXJcbiAgICAgICAgaWYgKGNsaUxvZ0ZpbGUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgbG9nZ2VyLnNldExvZ0ZpbGUoY2xpTG9nRmlsZSk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gUmVhZCBhbmQgcGFyc2Ugc3RkaW5cbiAgICAgICAgbGV0IHN0ZGluQ29udGVudDtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIHN0ZGluQ29udGVudCA9IGF3YWl0IHJlYWRTdGRpbigpO1xuICAgICAgICB9XG4gICAgICAgIGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgbG9nZ2VyLmxvZ0Vycm9yKGVycm9yLCBcIkZhaWxlZCB0byByZWFkIHN0ZGluXCIpO1xuICAgICAgICAgICAgb3V0cHV0ID0gY3JlYXRlTWFsZm9ybWVkSW5wdXRPdXRwdXQoZXJyb3IpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIC8vIFBhcnNlIGFuZCB0cmFuc2Zvcm0gaW5wdXRcbiAgICAgICAgbGV0IGlucHV0O1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgaW5wdXQgPSBwYXJzZVN0ZGluSW5wdXQoc3RkaW5Db250ZW50KTtcbiAgICAgICAgfVxuICAgICAgICBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIGxvZ2dlci5sb2dFcnJvcihlcnJvciwgXCJGYWlsZWQgdG8gcGFyc2Ugc3RkaW4gSlNPTlwiKTtcbiAgICAgICAgICAgIG91dHB1dCA9IGNyZWF0ZU1hbGZvcm1lZElucHV0T3V0cHV0KGVycm9yKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICAvLyBTZXQgbG9nZ2VyIGNvbnRleHRcbiAgICAgICAgY29uc3QgaG9va0V2ZW50TmFtZSA9IGhvb2tGbi5ob29rRXZlbnROYW1lO1xuICAgICAgICBsb2dnZXIuc2V0Q29udGV4dChob29rRXZlbnROYW1lLCBpbnB1dCk7XG4gICAgICAgIC8vIEJ1aWxkIGNvbnRleHQgLSBTZXNzaW9uU3RhcnQgaG9va3MgZ2V0IGV4dGVuZGVkIGNvbnRleHQgd2l0aCBwZXJzaXN0RW52VmFyXG4gICAgICAgIGNvbnN0IGNvbnRleHQgPSBob29rRXZlbnROYW1lID09PSBcIlNlc3Npb25TdGFydFwiID8geyBsb2dnZXIsIHBlcnNpc3RFbnZWYXIsIHBlcnNpc3RFbnZWYXJzIH0gOiB7IGxvZ2dlciB9O1xuICAgICAgICAvLyBFeGVjdXRlIGhhbmRsZXJcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IHNwZWNpZmljT3V0cHV0ID0gYXdhaXQgaG9va0ZuKGlucHV0LCBjb250ZXh0KTtcbiAgICAgICAgICAgIG91dHB1dCA9IGNvbnZlcnRUb0hvb2tPdXRwdXQoc3BlY2lmaWNPdXRwdXQpO1xuICAgICAgICB9XG4gICAgICAgIGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgLy8gSGFuZGxlciB0aHJldyAtIG91dHB1dCBzdGFja3RyYWNlIHRvIHN0ZGVyciBhbmQgZXhpdCB3aXRoIGNvZGUgMlxuICAgICAgICAgICAgLy8gVGhpcyBjYWxsIG5ldmVyIHJldHVybnMgKHByb2Nlc3MuZXhpdClcbiAgICAgICAgICAgIGhhbmRsZUhhbmRsZXJFcnJvcihlcnJvcik7XG4gICAgICAgIH1cbiAgICB9XG4gICAgZmluYWxseSB7XG4gICAgICAgIC8vIFdyaXRlIG91dHB1dCBpZiB3ZSBoYXZlIGl0XG4gICAgICAgIGlmIChvdXRwdXQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgd3JpdGVTdGRvdXQob3V0cHV0LnN0ZG91dCk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gQ2xlYXIgbG9nZ2VyIGNvbnRleHRcbiAgICAgICAgbG9nZ2VyLmNsZWFyQ29udGV4dCgpO1xuICAgICAgICBsb2dnZXIuY2xvc2UoKTtcbiAgICAgICAgLy8gRXhpdCB3aXRoIHN1Y2Nlc3MgKGhhbmRsZXIgZXJyb3JzIGV4aXQgdmlhIGhhbmRsZUhhbmRsZXJFcnJvciB3aXRoIGNvZGUgMilcbiAgICAgICAgcHJvY2Vzcy5leGl0KEVYSVRfQ09ERVMuU1VDQ0VTUyk7XG4gICAgfVxufVxuIiwgIi8qKlxuICogQVBJIHV0aWxpdGllcyBmb3IgaG9vayBzY3JpcHRzLlxuICpcbiAqIFByb3ZpZGVzIGZ1bmN0aW9ucyBmb3IgQVBJIGRpc2NvdmVyeSBhbmQgSFRUUCBvcGVyYXRpb25zIHVzZWQgYWNyb3NzXG4gKiBtdWx0aXBsZSBob29rcy5cbiAqL1xuXG5pbXBvcnQgeyBleGVjU3luYyB9IGZyb20gJ25vZGU6Y2hpbGRfcHJvY2Vzcyc7XG5pbXBvcnQgdHlwZSB7IElzc3VlLCBTZXNzaW9uRGlmZlJlc3BvbnNlIH0gZnJvbSAnQGdvb2Rmb290L2FwaS10eXBlcyc7XG5pbXBvcnQgdHlwZSB7IExvZ2dlciB9IGZyb20gJ0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcyc7XG5cbi8vIFJlLWV4cG9ydCBzaGFyZWQgdHlwZXMgZm9yIGNvbnN1bWVyc1xuZXhwb3J0IHR5cGUgeyBJc3N1ZSwgSXNzdWVTdGF0dXMsIFNlc3Npb25EaWZmUmVzcG9uc2UsIFNlc3Npb25Jc3N1ZURpZmYgfSBmcm9tICdAZ29vZGZvb3QvYXBpLXR5cGVzJztcblxuLyoqXG4gKiBUeXBlIGd1YXJkIGZvciBCYXNoVG9vbFJlc3BvbnNlIHN0cnVjdHVyZS5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBCYXNoVG9vbFJlc3BvbnNlIHtcbiAgc3Rkb3V0OiBzdHJpbmc7XG4gIHN0ZGVycjogc3RyaW5nO1xuICBleGl0Q29kZTogbnVtYmVyO1xuICBjb21tYW5kOiBzdHJpbmc7XG59XG5cbi8qKlxuICogQ2hlY2tzIGlmIGEgdmFsdWUgaXMgYSBCYXNoVG9vbFJlc3BvbnNlLlxuICpcbiAqIEBwYXJhbSB2YWx1ZSAtIFZhbHVlIHRvIGNoZWNrXG4gKiBAcmV0dXJucyBUcnVlIGlmIHZhbHVlIGlzIGEgQmFzaFRvb2xSZXNwb25zZVxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNCYXNoVG9vbFJlc3BvbnNlKHZhbHVlOiB1bmtub3duKTogdmFsdWUgaXMgQmFzaFRvb2xSZXNwb25zZSB7XG4gIHJldHVybiAoXG4gICAgdHlwZW9mIHZhbHVlID09PSAnb2JqZWN0JyAmJlxuICAgIHZhbHVlICE9PSBudWxsICYmXG4gICAgJ2V4aXRDb2RlJyBpbiB2YWx1ZSAmJlxuICAgIHR5cGVvZiAodmFsdWUgYXMgQmFzaFRvb2xSZXNwb25zZSkuZXhpdENvZGUgPT09ICdudW1iZXInICYmXG4gICAgJ3N0ZG91dCcgaW4gdmFsdWUgJiZcbiAgICB0eXBlb2YgKHZhbHVlIGFzIEJhc2hUb29sUmVzcG9uc2UpLnN0ZG91dCA9PT0gJ3N0cmluZydcbiAgKTtcbn1cblxuLyoqXG4gKiBDb21tZW50IHdpdGggYSBjb21taXRTaGEgKHVzZWQgZm9yIG9ycGhhbiBjbGVhbnVwKS5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBDb21taXRDb21tZW50IHtcbiAgaWQ6IHN0cmluZztcbiAgY29tbWl0U2hhOiBzdHJpbmc7XG59XG5cbi8qKlxuICogT3B0aW9ucyBmb3IgQXBpRXJyb3IgY29uc3RydWN0aW9uLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIEFwaUVycm9yT3B0aW9ucyB7XG4gIC8qKiBIVFRQIG1ldGhvZCB1c2VkIGluIHRoZSByZXF1ZXN0ICovXG4gIG1ldGhvZD86IHN0cmluZztcbiAgLyoqIFVSTCBvZiB0aGUgcmVxdWVzdCAqL1xuICB1cmw/OiBzdHJpbmc7XG4gIC8qKiBIVFRQIHN0YXR1cyBjb2RlICovXG4gIHN0YXR1cz86IG51bWJlcjtcbiAgLyoqIEhUVFAgc3RhdHVzIHRleHQgKi9cbiAgc3RhdHVzVGV4dD86IHN0cmluZztcbiAgLyoqIFByZXZpZXcgb2YgdGhlIHJlc3BvbnNlIGJvZHkgKHRydW5jYXRlZCkgKi9cbiAgcmVzcG9uc2VQcmV2aWV3Pzogc3RyaW5nO1xuICAvKiogT3JpZ2luYWwgZXJyb3IgdGhhdCBjYXVzZWQgdGhpcyBlcnJvciAqL1xuICBjYXVzZT86IEVycm9yO1xufVxuXG4vKipcbiAqIEN1c3RvbSBlcnJvciBjbGFzcyBmb3IgQVBJLXJlbGF0ZWQgZXJyb3JzLlxuICogUHJvdmlkZXMgc3RydWN0dXJlZCBlcnJvciBpbmZvcm1hdGlvbiBmb3IgZGVidWdnaW5nLlxuICovXG5leHBvcnQgY2xhc3MgQXBpRXJyb3IgZXh0ZW5kcyBFcnJvciB7XG4gIHB1YmxpYyByZWFkb25seSBvcHRpb25zPzogQXBpRXJyb3JPcHRpb25zO1xuXG4gIGNvbnN0cnVjdG9yKG1lc3NhZ2U6IHN0cmluZywgb3B0aW9ucz86IEFwaUVycm9yT3B0aW9ucykge1xuICAgIHN1cGVyKEFwaUVycm9yLmZvcm1hdE1lc3NhZ2UobWVzc2FnZSwgb3B0aW9ucyA/PyB7fSkpO1xuICAgIHRoaXMubmFtZSA9ICdBcGlFcnJvcic7XG4gICAgdGhpcy5vcHRpb25zID0gb3B0aW9ucztcbiAgICBpZiAob3B0aW9ucz8uY2F1c2UpIHtcbiAgICAgIHRoaXMuY2F1c2UgPSBvcHRpb25zLmNhdXNlO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBGb3JtYXRzIGFuIGVycm9yIG1lc3NhZ2Ugd2l0aCBvcHRpb25hbCBkZXRhaWxzLlxuICAgKi9cbiAgc3RhdGljIGZvcm1hdE1lc3NhZ2UobWVzc2FnZTogc3RyaW5nLCBvcHRpb25zOiBBcGlFcnJvck9wdGlvbnMpOiBzdHJpbmcge1xuICAgIGNvbnN0IHBhcnRzOiBzdHJpbmdbXSA9IFttZXNzYWdlXTtcblxuICAgIGlmIChvcHRpb25zLm1ldGhvZCAmJiBvcHRpb25zLnVybCkge1xuICAgICAgcGFydHMucHVzaChgJHtvcHRpb25zLm1ldGhvZH0gJHtvcHRpb25zLnVybH1gKTtcbiAgICB9IGVsc2UgaWYgKG9wdGlvbnMudXJsKSB7XG4gICAgICBwYXJ0cy5wdXNoKGBVUkw6ICR7b3B0aW9ucy51cmx9YCk7XG4gICAgfVxuXG4gICAgaWYgKG9wdGlvbnMuc3RhdHVzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIGNvbnN0IHN0YXR1c1BhcnQgPSBvcHRpb25zLnN0YXR1c1RleHRcbiAgICAgICAgPyBgU3RhdHVzOiAke29wdGlvbnMuc3RhdHVzfSAke29wdGlvbnMuc3RhdHVzVGV4dH1gXG4gICAgICAgIDogYFN0YXR1czogJHtvcHRpb25zLnN0YXR1c31gO1xuICAgICAgcGFydHMucHVzaChzdGF0dXNQYXJ0KTtcbiAgICB9XG5cbiAgICBpZiAob3B0aW9ucy5yZXNwb25zZVByZXZpZXcpIHtcbiAgICAgIHBhcnRzLnB1c2goYFJlc3BvbnNlOiAke29wdGlvbnMucmVzcG9uc2VQcmV2aWV3fWApO1xuICAgIH1cblxuICAgIHJldHVybiBwYXJ0cy5sZW5ndGggPT09IDEgPyBtZXNzYWdlIDogcGFydHMuam9pbignXFxuJyk7XG4gIH1cbn1cblxuLyoqXG4gKiBEaXNjb3ZlcnMgdGhlIElzc3VlcyBBUEkgYmFzZSBVUkwgZm9yIHRoZSBjdXJyZW50IHdvcmtzcGFjZS5cbiAqXG4gKiBAcGFyYW0gbG9nZ2VyIC0gTG9nZ2VyIGluc3RhbmNlIGZvciBkZWJ1ZyBvdXRwdXRcbiAqIEByZXR1cm5zIEJhc2UgVVJMXG4gKiBAdGhyb3dzIHtBcGlFcnJvcn0gSWYgQ0xBVURFX1BMVUdJTl9ST09UIGlzIG5vdCBzZXQgb3IgZGlzY292ZXJ5IGZhaWxzXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBkaXNjb3ZlckFwaVVybChsb2dnZXI/OiBMb2dnZXIpOiBzdHJpbmcge1xuICBjb25zdCBwbHVnaW5Sb290ID0gcHJvY2Vzcy5lbnYuQ0xBVURFX1BMVUdJTl9ST09UO1xuICBpZiAoIXBsdWdpblJvb3QpIHtcbiAgICB0aHJvdyBuZXcgQXBpRXJyb3IoJ0NMQVVERV9QTFVHSU5fUk9PVCBlbnZpcm9ubWVudCB2YXJpYWJsZSBpcyBub3Qgc2V0Jyk7XG4gIH1cblxuICB0cnkge1xuICAgIGNvbnN0IHJlc3VsdCA9IGV4ZWNTeW5jKGBcIiR7cGx1Z2luUm9vdH0vYmluL2Rpc2NvdmVyLXdvcmtzcGFjZS1hcGkuc2hcImAsIHtcbiAgICAgIGVuY29kaW5nOiAndXRmLTgnLFxuICAgICAgdGltZW91dDogNTAwMCxcbiAgICAgIHN0ZGlvOiBbJ3BpcGUnLCAncGlwZScsICdwaXBlJ11cbiAgICB9KTtcbiAgICByZXR1cm4gcmVzdWx0LnRyaW0oKTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBjb25zdCBleGVjRXJyb3IgPSBlcnJvciBhcyBFcnJvciAmIHsgc3RhdHVzPzogbnVtYmVyOyBzdGRlcnI/OiBCdWZmZXIgfCBzdHJpbmcgfTtcbiAgICBjb25zdCBleGl0Q29kZSA9IGV4ZWNFcnJvci5zdGF0dXMgPz8gJ3Vua25vd24nO1xuICAgIGNvbnN0IHN0ZGVyciA9IGV4ZWNFcnJvci5zdGRlcnIgPyBTdHJpbmcoZXhlY0Vycm9yLnN0ZGVycikgOiAndW5rbm93bic7XG4gICAgbG9nZ2VyPy5kZWJ1ZygnQVBJIGRpc2NvdmVyeSBmYWlsZWQnLCB7IGVycm9yOiBTdHJpbmcoZXJyb3IpIH0pO1xuICAgIHRocm93IG5ldyBBcGlFcnJvcihgQVBJIGRpc2NvdmVyeSBzY3JpcHQgZmFpbGVkIChleGl0IGNvZGU6ICR7ZXhpdENvZGV9LCBzdGRlcnI6ICR7c3RkZXJyfSlgLCB7XG4gICAgICBjYXVzZTogZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yIDogbmV3IEVycm9yKFN0cmluZyhlcnJvcikpXG4gICAgfSk7XG4gIH1cbn1cblxuLyoqXG4gKiBGZXRjaGVzIGlzc3VlIGRpZmYgZm9yIGEgc2Vzc2lvbi5cbiAqXG4gKiBAcGFyYW0gc2Vzc2lvbklkIC0gU2Vzc2lvbiBJRFxuICogQHBhcmFtIGlzc3VlSWQgLSBJc3N1ZSBJRFxuICogQHBhcmFtIGJhc2VVcmwgLSBBUEkgYmFzZSBVUkxcbiAqIEBwYXJhbSBsb2dnZXIgLSBMb2dnZXIgaW5zdGFuY2VcbiAqIEByZXR1cm5zIElzc3VlIGRpZmZcbiAqIEB0aHJvd3Mge0FwaUVycm9yfSBPbiBuZXR3b3JrIG9yIEhUVFAgZXJyb3JzXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBmZXRjaElzc3VlRGlmZihcbiAgc2Vzc2lvbklkOiBzdHJpbmcsXG4gIGlzc3VlSWQ6IHN0cmluZyxcbiAgYmFzZVVybDogc3RyaW5nLFxuICBsb2dnZXI/OiBMb2dnZXJcbik6IFByb21pc2U8U2Vzc2lvbkRpZmZSZXNwb25zZT4ge1xuICBjb25zdCB1cmwgPSBgJHtiYXNlVXJsfS9zZXNzaW9uLyR7c2Vzc2lvbklkfS9kaWZmP2lzc3VlSWRzPSR7aXNzdWVJZH1gO1xuICB0cnkge1xuICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZmV0Y2godXJsLCB7XG4gICAgICBzaWduYWw6IEFib3J0U2lnbmFsLnRpbWVvdXQoNTAwMClcbiAgICB9KTtcbiAgICBpZiAoIXJlc3BvbnNlLm9rKSB7XG4gICAgICBjb25zdCByZXNwb25zZVRleHQgPSBhd2FpdCByZXNwb25zZS50ZXh0KCk7XG4gICAgICBjb25zdCByZXNwb25zZVByZXZpZXcgPSByZXNwb25zZVRleHQuc2xpY2UoMCwgMjAwKTtcbiAgICAgIGxvZ2dlcj8uZGVidWcoJ0lzc3VlIGRpZmYgZmV0Y2ggZmFpbGVkJywgeyBzdGF0dXM6IHJlc3BvbnNlLnN0YXR1cyB9KTtcbiAgICAgIHRocm93IG5ldyBBcGlFcnJvcignSXNzdWUgZGlmZiBmZXRjaCBmYWlsZWQnLCB7XG4gICAgICAgIHVybCxcbiAgICAgICAgc3RhdHVzOiByZXNwb25zZS5zdGF0dXMsXG4gICAgICAgIHN0YXR1c1RleHQ6IHJlc3BvbnNlLnN0YXR1c1RleHQsXG4gICAgICAgIHJlc3BvbnNlUHJldmlld1xuICAgICAgfSk7XG4gICAgfVxuICAgIHJldHVybiAoYXdhaXQgcmVzcG9uc2UuanNvbigpKSBhcyBTZXNzaW9uRGlmZlJlc3BvbnNlO1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIC8vIFJlLXRocm93IEFwaUVycm9yIHdpdGhvdXQgd3JhcHBpbmdcbiAgICBpZiAoZXJyb3IgaW5zdGFuY2VvZiBBcGlFcnJvcikge1xuICAgICAgdGhyb3cgZXJyb3I7XG4gICAgfVxuICAgIGxvZ2dlcj8uZGVidWcoJ0lzc3VlIGRpZmYgZmV0Y2ggZXJyb3InLCB7IGVycm9yOiBTdHJpbmcoZXJyb3IpIH0pO1xuICAgIHRocm93IG5ldyBBcGlFcnJvcihgSXNzdWUgZGlmZiBmZXRjaCBlcnJvcjogJHtlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6IFN0cmluZyhlcnJvcil9YCwge1xuICAgICAgdXJsLFxuICAgICAgY2F1c2U6IGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvciA6IG5ldyBFcnJvcihTdHJpbmcoZXJyb3IpKVxuICAgIH0pO1xuICB9XG59XG5cbi8qKlxuICogRmV0Y2hlcyBhIHNpbmdsZSBpc3N1ZSBieSBJRC5cbiAqXG4gKiBAcGFyYW0gaXNzdWVJZCAtIElzc3VlIElEXG4gKiBAcGFyYW0gYmFzZVVybCAtIEFQSSBiYXNlIFVSTFxuICogQHBhcmFtIGxvZ2dlciAtIExvZ2dlciBpbnN0YW5jZVxuICogQHJldHVybnMgSXNzdWUgb3IgbnVsbCBvbiBmYWlsdXJlXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBmZXRjaElzc3VlKGlzc3VlSWQ6IHN0cmluZywgYmFzZVVybDogc3RyaW5nLCBsb2dnZXI/OiBMb2dnZXIpOiBQcm9taXNlPElzc3VlIHwgbnVsbD4ge1xuICB0cnkge1xuICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZmV0Y2goYCR7YmFzZVVybH0vaXNzdWVzLyR7aXNzdWVJZH1gLCB7XG4gICAgICBzaWduYWw6IEFib3J0U2lnbmFsLnRpbWVvdXQoNTAwMClcbiAgICB9KTtcbiAgICBpZiAoIXJlc3BvbnNlLm9rKSB7XG4gICAgICBsb2dnZXI/LmRlYnVnKCdJc3N1ZSBmZXRjaCBmYWlsZWQnLCB7IHN0YXR1czogcmVzcG9uc2Uuc3RhdHVzIH0pO1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIHJldHVybiAoYXdhaXQgcmVzcG9uc2UuanNvbigpKSBhcyBJc3N1ZTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBsb2dnZXI/LmRlYnVnKCdJc3N1ZSBmZXRjaCBlcnJvcicsIHsgZXJyb3I6IFN0cmluZyhlcnJvcikgfSk7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbn1cblxuLyoqXG4gKiBQb3N0cyBhIHNlc3Npb24gY29tbWVudCB0byBhbiBpc3N1ZS5cbiAqXG4gKiBAcGFyYW0gaXNzdWVJZCAtIElzc3VlIElEXG4gKiBAcGFyYW0gc2Vzc2lvbklkIC0gU2Vzc2lvbiBJRFxuICogQHBhcmFtIGJhc2VVcmwgLSBBUEkgYmFzZSBVUkxcbiAqIEBwYXJhbSBsb2dnZXIgLSBMb2dnZXIgaW5zdGFuY2VcbiAqIEByZXR1cm5zIHRydWUgb24gc3VjY2Vzc1xuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcG9zdFNlc3Npb25Db21tZW50KFxuICBpc3N1ZUlkOiBzdHJpbmcsXG4gIHNlc3Npb25JZDogc3RyaW5nLFxuICBiYXNlVXJsOiBzdHJpbmcsXG4gIGxvZ2dlcj86IExvZ2dlclxuKTogUHJvbWlzZTxib29sZWFuPiB7XG4gIHRyeSB7XG4gICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBmZXRjaChgJHtiYXNlVXJsfS9pc3N1ZXMvJHtpc3N1ZUlkfS9jb21tZW50c2AsIHtcbiAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgaGVhZGVyczogeyAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nIH0sXG4gICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7IHNlc3Npb25JZCwgYXV0aG9yOiAnYWdlbnQnIH0pLFxuICAgICAgc2lnbmFsOiBBYm9ydFNpZ25hbC50aW1lb3V0KDIwMDApXG4gICAgfSk7XG4gICAgcmV0dXJuIHJlc3BvbnNlLm9rO1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGxvZ2dlcj8uZGVidWcoJ1Bvc3Qgc2Vzc2lvbiBjb21tZW50IGZhaWxlZCcsIHsgZXJyb3I6IFN0cmluZyhlcnJvcikgfSk7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG59XG5cbi8qKlxuICogRGVsZXRlcyBzZXNzaW9uIHdhdGVybWFyay5cbiAqXG4gKiBAcGFyYW0gc2Vzc2lvbklkIC0gU2Vzc2lvbiBJRFxuICogQHBhcmFtIGJhc2VVcmwgLSBBUEkgYmFzZSBVUkxcbiAqIEBwYXJhbSBsb2dnZXIgLSBMb2dnZXIgaW5zdGFuY2VcbiAqIEByZXR1cm5zIHRydWUgb24gc3VjY2Vzc1xuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZGVsZXRlU2Vzc2lvbldhdGVybWFyayhzZXNzaW9uSWQ6IHN0cmluZywgYmFzZVVybDogc3RyaW5nLCBsb2dnZXI/OiBMb2dnZXIpOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgdHJ5IHtcbiAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGZldGNoKGAke2Jhc2VVcmx9L3Nlc3Npb24vJHtzZXNzaW9uSWR9YCwge1xuICAgICAgbWV0aG9kOiAnREVMRVRFJyxcbiAgICAgIHNpZ25hbDogQWJvcnRTaWduYWwudGltZW91dCgyMDAwKVxuICAgIH0pO1xuICAgIHJldHVybiByZXNwb25zZS5vaztcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBsb2dnZXI/LmRlYnVnKCdEZWxldGUgc2Vzc2lvbiB3YXRlcm1hcmsgZmFpbGVkJywgeyBlcnJvcjogU3RyaW5nKGVycm9yKSB9KTtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbn1cblxuLyoqXG4gKiBOb3RpZmllcyBleHRlbnNpb24gdGhhdCBzZXNzaW9uIGlzIHN0YXJ0aW5nL2FjdGl2ZS5cbiAqXG4gKiBAcGFyYW0gc2Vzc2lvbklkIC0gU2Vzc2lvbiBJRFxuICogQHBhcmFtIGRpc3BhdGNoZXJQaWQgLSBEaXNwYXRjaGVyIFBJRFxuICogQHBhcmFtIGJhc2VVcmwgLSBBUEkgYmFzZSBVUkxcbiAqIEBwYXJhbSBsb2dnZXIgLSBMb2dnZXIgaW5zdGFuY2VcbiAqIEByZXR1cm5zIHRydWUgb24gc3VjY2Vzc1xuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gbm90aWZ5U2Vzc2lvblN0YXJ0KFxuICBzZXNzaW9uSWQ6IHN0cmluZyxcbiAgZGlzcGF0Y2hlclBpZDogbnVtYmVyLFxuICBiYXNlVXJsOiBzdHJpbmcsXG4gIGxvZ2dlcj86IExvZ2dlclxuKTogUHJvbWlzZTxib29sZWFuPiB7XG4gIHRyeSB7XG4gICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBmZXRjaChgJHtiYXNlVXJsfS9zZXNzaW9uL3N0YXJ0YCwge1xuICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICBoZWFkZXJzOiB7ICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicgfSxcbiAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHsgc2Vzc2lvbklkLCBkaXNwYXRjaGVyUGlkIH0pLFxuICAgICAgc2lnbmFsOiBBYm9ydFNpZ25hbC50aW1lb3V0KDIwMDApXG4gICAgfSk7XG4gICAgcmV0dXJuIHJlc3BvbnNlLm9rO1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGxvZ2dlcj8uZGVidWcoJ05vdGlmeSBzZXNzaW9uIHN0YXJ0IGZhaWxlZCcsIHsgZXJyb3I6IFN0cmluZyhlcnJvcikgfSk7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG59XG5cbi8qKlxuICogTm90aWZpZXMgZXh0ZW5zaW9uIHRoYXQgc2Vzc2lvbiBpcyBzdG9wcGluZy5cbiAqXG4gKiBAcGFyYW0gc2Vzc2lvbklkIC0gU2Vzc2lvbiBJRFxuICogQHBhcmFtIGRpc3BhdGNoZXJQaWQgLSBEaXNwYXRjaGVyIFBJRFxuICogQHBhcmFtIGJhc2VVcmwgLSBBUEkgYmFzZSBVUkxcbiAqIEBwYXJhbSBsb2dnZXIgLSBMb2dnZXIgaW5zdGFuY2VcbiAqIEByZXR1cm5zIHRydWUgb24gc3VjY2Vzc1xuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gbm90aWZ5U2Vzc2lvblN0b3AoXG4gIHNlc3Npb25JZDogc3RyaW5nLFxuICBkaXNwYXRjaGVyUGlkOiBudW1iZXIsXG4gIGJhc2VVcmw6IHN0cmluZyxcbiAgbG9nZ2VyPzogTG9nZ2VyXG4pOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgdHJ5IHtcbiAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGZldGNoKGAke2Jhc2VVcmx9L3Nlc3Npb24vc3RvcGAsIHtcbiAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgaGVhZGVyczogeyAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nIH0sXG4gICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7IHNlc3Npb25JZCwgZGlzcGF0Y2hlclBpZCB9KSxcbiAgICAgIHNpZ25hbDogQWJvcnRTaWduYWwudGltZW91dCgyMDAwKVxuICAgIH0pO1xuICAgIHJldHVybiByZXNwb25zZS5vaztcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBsb2dnZXI/LmRlYnVnKCdOb3RpZnkgc2Vzc2lvbiBzdG9wIGZhaWxlZCcsIHsgZXJyb3I6IFN0cmluZyhlcnJvcikgfSk7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG59XG5cbi8qKlxuICogUG9zdHMgYSBjb21taXQgY29tbWVudCB0byBhbiBpc3N1ZS5cbiAqXG4gKiBAcGFyYW0gaXNzdWVJZCAtIElzc3VlIElEXG4gKiBAcGFyYW0gY29tbWl0U2hhIC0gQ29tbWl0IFNIQVxuICogQHBhcmFtIGJhc2VVcmwgLSBBUEkgYmFzZSBVUkxcbiAqIEBwYXJhbSBsb2dnZXIgLSBMb2dnZXIgaW5zdGFuY2VcbiAqIEByZXR1cm5zIHRydWUgb24gc3VjY2VzcywgZmFsc2Ugb24gZmFpbHVyZVxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcG9zdENvbW1pdENvbW1lbnQoXG4gIGlzc3VlSWQ6IHN0cmluZyxcbiAgY29tbWl0U2hhOiBzdHJpbmcsXG4gIGJhc2VVcmw6IHN0cmluZyxcbiAgbG9nZ2VyPzogTG9nZ2VyXG4pOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgdHJ5IHtcbiAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGZldGNoKGAke2Jhc2VVcmx9L2lzc3Vlcy8ke2lzc3VlSWR9L2NvbW1lbnRzYCwge1xuICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICBoZWFkZXJzOiB7ICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicgfSxcbiAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHsgY29tbWl0U2hhLCBhdXRob3I6ICdhZ2VudCcgfSksXG4gICAgICBzaWduYWw6IEFib3J0U2lnbmFsLnRpbWVvdXQoMjAwMClcbiAgICB9KTtcbiAgICByZXR1cm4gcmVzcG9uc2Uub2s7XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgbG9nZ2VyPy5kZWJ1ZygnUG9zdCBjb21taXQgY29tbWVudCBmYWlsZWQnLCB7IGVycm9yOiBTdHJpbmcoZXJyb3IpIH0pO1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxufVxuXG4vKipcbiAqIEZldGNoZXMgY29tbWl0IGNvbW1lbnRzIGZvciBhbiBpc3N1ZS5cbiAqXG4gKiBAcGFyYW0gaXNzdWVJZCAtIElzc3VlIElEXG4gKiBAcGFyYW0gYmFzZVVybCAtIEFQSSBiYXNlIFVSTFxuICogQHBhcmFtIGxvZ2dlciAtIExvZ2dlciBpbnN0YW5jZVxuICogQHJldHVybnMgQXJyYXkgb2YgY29tbWl0IGNvbW1lbnRzLCBvciBlbXB0eSBhcnJheSBvbiBmYWlsdXJlXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBmZXRjaENvbW1pdENvbW1lbnRzKGlzc3VlSWQ6IHN0cmluZywgYmFzZVVybDogc3RyaW5nLCBsb2dnZXI/OiBMb2dnZXIpOiBQcm9taXNlPENvbW1pdENvbW1lbnRbXT4ge1xuICB0cnkge1xuICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZmV0Y2goYCR7YmFzZVVybH0vaXNzdWVzLyR7aXNzdWVJZH0vY29tbWVudHNgLCB7XG4gICAgICBzaWduYWw6IEFib3J0U2lnbmFsLnRpbWVvdXQoNTAwMClcbiAgICB9KTtcbiAgICBpZiAoIXJlc3BvbnNlLm9rKSB7XG4gICAgICBsb2dnZXI/LmRlYnVnKCdGZXRjaCBjb21taXQgY29tbWVudHMgZmFpbGVkJywgeyBzdGF0dXM6IHJlc3BvbnNlLnN0YXR1cyB9KTtcbiAgICAgIHJldHVybiBbXTtcbiAgICB9XG4gICAgY29uc3QgY29tbWVudHMgPSAoYXdhaXQgcmVzcG9uc2UuanNvbigpKSBhcyBBcnJheTx7IGlkOiBzdHJpbmc7IGNvbW1pdFNoYT86IHN0cmluZyB9PjtcbiAgICByZXR1cm4gY29tbWVudHNcbiAgICAgIC5maWx0ZXIoKGNvbW1lbnQpOiBjb21tZW50IGlzIHsgaWQ6IHN0cmluZzsgY29tbWl0U2hhOiBzdHJpbmcgfSA9PiB0eXBlb2YgY29tbWVudC5jb21taXRTaGEgPT09ICdzdHJpbmcnKVxuICAgICAgLm1hcCgoeyBpZCwgY29tbWl0U2hhIH0pID0+ICh7IGlkLCBjb21taXRTaGEgfSkpO1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGxvZ2dlcj8uZGVidWcoJ0ZldGNoIGNvbW1pdCBjb21tZW50cyBmYWlsZWQnLCB7IGVycm9yOiBTdHJpbmcoZXJyb3IpIH0pO1xuICAgIHJldHVybiBbXTtcbiAgfVxufVxuXG4vKipcbiAqIERlbGV0ZXMgYSBjb21tZW50IGZyb20gYW4gaXNzdWUuXG4gKlxuICogQHBhcmFtIGlzc3VlSWQgLSBJc3N1ZSBJRFxuICogQHBhcmFtIGNvbW1lbnRJZCAtIENvbW1lbnQgSURcbiAqIEBwYXJhbSBiYXNlVXJsIC0gQVBJIGJhc2UgVVJMXG4gKiBAcGFyYW0gbG9nZ2VyIC0gTG9nZ2VyIGluc3RhbmNlXG4gKiBAcmV0dXJucyB0cnVlIG9uIHN1Y2Nlc3MsIGZhbHNlIG9uIGZhaWx1cmVcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGRlbGV0ZUNvbW1lbnQoXG4gIGlzc3VlSWQ6IHN0cmluZyxcbiAgY29tbWVudElkOiBzdHJpbmcsXG4gIGJhc2VVcmw6IHN0cmluZyxcbiAgbG9nZ2VyPzogTG9nZ2VyXG4pOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgdHJ5IHtcbiAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGZldGNoKGAke2Jhc2VVcmx9L2lzc3Vlcy8ke2lzc3VlSWR9L2NvbW1lbnRzLyR7Y29tbWVudElkfWAsIHtcbiAgICAgIG1ldGhvZDogJ0RFTEVURScsXG4gICAgICBzaWduYWw6IEFib3J0U2lnbmFsLnRpbWVvdXQoMjAwMClcbiAgICB9KTtcbiAgICByZXR1cm4gcmVzcG9uc2Uub2s7XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgbG9nZ2VyPy5kZWJ1ZygnRGVsZXRlIGNvbW1lbnQgZmFpbGVkJywgeyBlcnJvcjogU3RyaW5nKGVycm9yKSB9KTtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbn1cbiIsICIvKipcbiAqIElQQyB1dGlsaXRpZXMgZm9yIHRoZSBcIlNpZ25hbC1BdWdtZW50ZWQgRXhlY3V0aW9uIEJyaWRnZVwiLlxuICpcbiAqIFRoaXMgbW9kdWxlIHByb3ZpZGVzIHRoZSBjb21tdW5pY2F0aW9uIHByaW1pdGl2ZXMgdXNlZCBieSBDbGF1ZGUgaG9va3MgdG9cbiAqIHNpZ25hbCBzdGF0ZSBjaGFuZ2VzIGJhY2sgdG8gdGhlIGV4dGVuc2lvbidzIHN1cGVydmlzb3IgKHRoZSB3cmFwcGVyIHNjcmlwdCkuXG4gKlxuICogSXQgdXNlcyBQT1NJWCBzaWduYWxzIGFzIGEgbGlnaHR3ZWlnaHQsIG91dC1vZi1iYW5kIHNpZ25hbGluZyBtZWNoYW5pc21cbiAqIHRoYXQgYnlwYXNzZXMgc3RhbmRhcmQgc3Rkb3V0L3N0ZGVyciBzdHJlYW1zLCBwcmV2ZW50aW5nIGludGVyZmVyZW5jZSB3aXRoXG4gKiBDbGF1ZGUncyBwcmltYXJ5IG91dHB1dCBvciB0ZXJtaW5hbCBVSS5cbiAqXG4gKiBAbW9kdWxlIGxpYi9pcGNcbiAqIEBzZWUgQ2xhdWRlV3JhcHBlclNjcmlwdFNlcnZpY2VcbiAqL1xuXG5pbXBvcnQgdHlwZSB7IExvZ2dlciB9IGZyb20gJ0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcyc7XG5cbi8qKlxuICogUmV0cmlldmVzIHRoZSBgRElTUEFUQ0hFUl9QSURgIGZyb20gdGhlIGVudmlyb25tZW50LlxuICpcbiAqIFRoZSBQSUQgaXMgaW5qZWN0ZWQgYnkgYENsYXVkZVdyYXBwZXJTY3JpcHRTZXJ2aWNlYCB3aGVuIGJvb3RzdHJhcHBpbmcgdGhlXG4gKiBlcGhlbWVyYWwgc3VwZXJ2aXNvciBzY3JpcHQuIFRoaXMgUElEIGlzIHJlcXVpcmVkIGZvciBhbGwgSVBDIHNpZ25hbGluZ1xuICogb3BlcmF0aW9ucyBpbiB0aGUgU2lnbmFsLUF1Z21lbnRlZCBFeGVjdXRpb24gQnJpZGdlLlxuICpcbiAqIEJlaGF2aW9yYWwgY29udHJhY3Q6XG4gKiAtIFJldHVybnMgYG51bGxgIGlmIGBESVNQQVRDSEVSX1BJRGAgZW52aXJvbm1lbnQgdmFyaWFibGUgaXMgbm90IHNldC5cbiAqIC0gUmV0dXJucyBgbnVsbGAgaWYgdGhlIHZhbHVlIGNhbm5vdCBiZSBwYXJzZWQgYXMgYSBiYXNlLTEwIGludGVnZXIuXG4gKiAtIFJldHVybnMgdGhlIHBhcnNlZCBpbnRlZ2VyIGlmIGJvdGggY29uZGl0aW9ucyBwYXNzLlxuICpcbiAqIEByZXR1cm5zIERpc3BhdGNoZXIgUElEIG9yIG51bGwgaWYgbm90IHNldCBvciBpbnZhbGlkLlxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0RGlzcGF0Y2hlclBpZCgpOiBudW1iZXIgfCBudWxsIHtcbiAgY29uc3QgcGlkID0gcHJvY2Vzcy5lbnYuRElTUEFUQ0hFUl9QSUQ7XG4gIGlmICghcGlkKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbiAgY29uc3QgcGFyc2VkID0gTnVtYmVyLnBhcnNlSW50KHBpZCwgMTApO1xuICByZXR1cm4gTnVtYmVyLmlzTmFOKHBhcnNlZCkgPyBudWxsIDogcGFyc2VkO1xufVxuXG4vKipcbiAqIENoZWNrcyBpZiB0aGUgZGlzcGF0Y2hlciBwcm9jZXNzIGlzIGFsaXZlIHVzaW5nIGBraWxsKHBpZCwgMClgLlxuICpcbiAqIFN0cmF0ZWd5OiBTZW5kaW5nIHNpZ25hbCAwIGlzIGEgc3RhbmRhcmQgUE9TSVggdGVjaG5pcXVlIHRvIHByb2JlIHByb2Nlc3NcbiAqIGV4aXN0ZW5jZSBhbmQgcGVybWlzc2lvbiB3aXRob3V0IGRlbGl2ZXJpbmcgYSBzaWduYWwuIFRoaXMgaXMgYW4gYXRvbWljXG4gKiBvcnBoYW4tZGV0ZWN0aW9uIHByaW1pdGl2ZSBmb3IgdGhlIFNpZ25hbC1BdWdtZW50ZWQgRXhlY3V0aW9uIEJyaWRnZS5cbiAqXG4gKiBCZWhhdmlvcmFsIGNvbnRyYWN0OlxuICogLSBSZXR1cm5zIGB0cnVlYCBpZiB0aGUgcHJvY2VzcyBleGlzdHMgYW5kIHRoZSBjYWxsZXIgaGFzIHBlcm1pc3Npb24gdG8gc2lnbmFsIGl0LlxuICogLSBSZXR1cm5zIGBmYWxzZWAgb24gYW55IGVycm9yIChwcm9jZXNzIG5vdCBmb3VuZCwgcGVybWlzc2lvbiBkZW5pZWQsIGludmFsaWQgUElELCBldGMuKS5cbiAqIC0gRG9lcyBub3QgbW9kaWZ5IHRoZSB0YXJnZXQgcHJvY2VzcyBvciBkZWxpdmVyIGEgc2lnbmFsLlxuICpcbiAqIEBwYXJhbSBwaWQgLSBEaXNwYXRjaGVyIFBJRCB0byBjaGVjay5cbiAqIEByZXR1cm5zIGB0cnVlYCBpZiB0aGUgcHJvY2VzcyBleGlzdHMgYW5kIGlzIHJlYWNoYWJsZSwgYGZhbHNlYCBvdGhlcndpc2UuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc0Rpc3BhdGNoZXJBbGl2ZShwaWQ6IG51bWJlcik6IGJvb2xlYW4ge1xuICB0cnkge1xuICAgIC8vIGtpbGwocGlkLCAwKSBjaGVja3MgaWYgcHJvY2VzcyBleGlzdHMgd2l0aG91dCBzZW5kaW5nIHNpZ25hbFxuICAgIHByb2Nlc3Mua2lsbChwaWQsIDApO1xuICAgIHJldHVybiB0cnVlO1xuICB9IGNhdGNoIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbn1cblxuLyoqXG4gKiBTaWduYWxzIHRoYXQgQ2xhdWRlIGlzIGFjdGl2ZWx5IHByb2Nlc3NpbmcgYSByZXF1ZXN0IHVzaW5nIGBTSUdVUkdgLlxuICpcbiAqIEluIHRoZSBTaWduYWwtQXVnbWVudGVkIEV4ZWN1dGlvbiBCcmlkZ2UsIGBTSUdVUkdgIGFjdHMgYXMgYSBoZWFydGJlYXQgdGhhdFxuICogdGVsbHMgdGhlIGRpc3BhdGNoZXIgXCJDbGF1ZGUgaXMgd29ya2luZ1wiLiBUaGUgd3JhcHBlciBzY3JpcHQgdHJhcHMgdGhpcyBzaWduYWxcbiAqIGFuZCB1cGRhdGVzIHRoZSBWUyBDb2RlIFVJIHRvIFwiQWN0aXZlXCIgc3RhdGUsIGVuYWJsaW5nIHN1Yi1zZWNvbmQgdHJhbnNwYXJlbmN5XG4gKiBvZiBDbGF1ZGUncyBwcm9jZXNzaW5nIHN0YXRlLlxuICpcbiAqIFdoeSBgU0lHVVJHYD86IFN0YW5kYXJkbHkgcmVzZXJ2ZWQgZm9yIFwiVXJnZW50IERhdGFcIiBvbiBzb2NrZXRzLCB0aGlzIHNpZ25hbFxuICogaXMgbm9uLXRlcm1pbmF0aW5nIGJ5IGRlZmF1bHQgb24gbW9zdCBVbml4IHN5c3RlbXMgYW5kIHJhcmVseSByZS1wdXJwb3NlZCBieVxuICogb3RoZXIgdG9vbHMsIG1ha2luZyBpdCBzYWZlIGZvciBpbi1wcm9jZXNzIHN0YXRlIHNpZ25hbGluZy5cbiAqXG4gKiBCZWhhdmlvcmFsIGNvbnRyYWN0OlxuICogLSBJZiBgU0lHTkFMX0FDVElWRV9URVNUX01PREU9MWAgZW52aXJvbm1lbnQgdmFyaWFibGUgaXMgc2V0LCBsb2dzIGRlYnVnIG91dHB1dFxuICogICBhbmQgcmV0dXJucyBgdHJ1ZWAgd2l0aG91dCBzZW5kaW5nIHRoZSBzaWduYWwgKHRlc3QgaGFybmVzcyBlc2NhcGUgaGF0Y2gpLlxuICogLSBBdHRlbXB0cyB0byBkZWxpdmVyIGBTSUdVUkdgIHRvIHRoZSBkaXNwYXRjaGVyIHByb2Nlc3MuXG4gKiAtIFJldHVybnMgYHRydWVgIGlmIGRlbGl2ZXJ5IHN1Y2NlZWRlZCwgYGZhbHNlYCBpZiBwcm9jZXNzIGlzIGRlYWQgb3IgYWNjZXNzIGRlbmllZC5cbiAqIC0gTG9ncyB3YXJuaW5ncyBvbiBkZWxpdmVyeSBmYWlsdXJlIChvcHRpb25hbCBsb2dnZXIgcGFyYW1ldGVyKS5cbiAqXG4gKiBAcGFyYW0gcGlkIC0gRGlzcGF0Y2hlciBQSUQuXG4gKiBAcGFyYW0gbG9nZ2VyIC0gT3B0aW9uYWwgbG9nZ2VyIGZvciBkZWJ1Z2dpbmcgZGlzcGF0Y2ggZmFpbHVyZXMuXG4gKiBAcmV0dXJucyBgdHJ1ZWAgaWYgdGhlIHNpZ25hbCB3YXMgc3VjY2Vzc2Z1bGx5IGRlbGl2ZXJlZCAob3IgdGVzdCBtb2RlIGJ5cGFzc2VkKSwgYGZhbHNlYCBvdGhlcndpc2UuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzaWduYWxBY3RpdmUocGlkOiBudW1iZXIsIGxvZ2dlcj86IExvZ2dlcik6IGJvb2xlYW4ge1xuICBpZiAocHJvY2Vzcy5lbnYuU0lHTkFMX0FDVElWRV9URVNUX01PREUgPT09ICcxJykge1xuICAgIGxvZ2dlcj8uZGVidWcoJ1RFU1RfTU9ERTogV291bGQgc2VuZCBTSUdVUkcnLCB7IHBpZCB9KTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIHRyeSB7XG4gICAgcHJvY2Vzcy5raWxsKHBpZCwgJ1NJR1VSRycpO1xuICAgIHJldHVybiB0cnVlO1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGxvZ2dlcj8ud2FybignRmFpbGVkIHRvIHNpZ25hbCBkaXNwYXRjaGVyIGFjdGl2ZScsIHtcbiAgICAgIHBpZCxcbiAgICAgIGVycm9yOiBTdHJpbmcoZXJyb3IpXG4gICAgfSk7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG59XG5cbi8qKlxuICogU2lnbmFscyB0aGF0IENsYXVkZSBpcyBpZGxlIG9yIGFib3V0IHRvIHN0b3AgdXNpbmcgYFNJR1dJTkNIYC5cbiAqXG4gKiBJbiB0aGUgU2lnbmFsLUF1Z21lbnRlZCBFeGVjdXRpb24gQnJpZGdlLCBgU0lHV0lOQ0hgIHRlbGxzIHRoZSBkaXNwYXRjaGVyXG4gKiBcIkNsYXVkZSBpcyBwYXVzZWQgYW5kIHdhaXRpbmcgZm9yIHVzZXIgaW5wdXRcIi4gVGhlIHdyYXBwZXIgc2NyaXB0IHRyYXBzIHRoaXNcbiAqIHNpZ25hbCBhbmQgdHJhbnNpdGlvbnMgdGhlIFZTIENvZGUgVUkgdG8gXCJJZGxlXCIgc3RhdGUsIHNpZ25hbGluZyB0aGF0IHRoZSB1c2VyXG4gKiBjYW4gaW50ZXJhY3Qgd2l0aCB0aGUgZWRpdG9yIHdpdGhvdXQgaW50ZXJydXB0aW5nIENsYXVkZS5cbiAqXG4gKiBXaHkgYFNJR1dJTkNIYD86IFN0YW5kYXJkbHkgcmVzZXJ2ZWQgZm9yIFwiV2luZG93IENoYW5nZVwiICh0ZXJtaW5hbCByZXNpemUpLlxuICogV2hpbGUgaXQgaGFzIHNlbWFudGljIG1lYW5pbmcgaW4gdGVybWluYWwgY29udGV4dHMsIGl0IGlzIG5vbi10ZXJtaW5hdGluZyBhbmRcbiAqIGNhbiBiZSBzYWZlbHkgdHJhcHBlZCBieSB0aGUgc3VwZXJ2aXNvciBzY3JpcHQgdG8gc2lnbmFsIFVJIHN0YXRlIHRyYW5zaXRpb25zLlxuICpcbiAqIEJlaGF2aW9yYWwgY29udHJhY3Q6XG4gKiAtIElmIGBTRVNTSU9OX1NUT1BfVEVTVF9NT0RFPTFgIGVudmlyb25tZW50IHZhcmlhYmxlIGlzIHNldCwgbG9ncyBkZWJ1ZyBvdXRwdXRcbiAqICAgYW5kIHJldHVybnMgYHRydWVgIHdpdGhvdXQgc2VuZGluZyB0aGUgc2lnbmFsICh0ZXN0IGhhcm5lc3MgZXNjYXBlIGhhdGNoKS5cbiAqIC0gQXR0ZW1wdHMgdG8gZGVsaXZlciBgU0lHV0lOQ0hgIHRvIHRoZSBkaXNwYXRjaGVyIHByb2Nlc3MuXG4gKiAtIFJldHVybnMgYHRydWVgIGlmIGRlbGl2ZXJ5IHN1Y2NlZWRlZCwgYGZhbHNlYCBpZiBwcm9jZXNzIGlzIGRlYWQgb3IgYWNjZXNzIGRlbmllZC5cbiAqIC0gTG9ncyB3YXJuaW5ncyBvbiBkZWxpdmVyeSBmYWlsdXJlIChvcHRpb25hbCBsb2dnZXIgcGFyYW1ldGVyKS5cbiAqXG4gKiBAcGFyYW0gcGlkIC0gRGlzcGF0Y2hlciBQSUQuXG4gKiBAcGFyYW0gbG9nZ2VyIC0gT3B0aW9uYWwgbG9nZ2VyIGZvciBkZWJ1Z2dpbmcgZGlzcGF0Y2ggZmFpbHVyZXMuXG4gKiBAcmV0dXJucyBgdHJ1ZWAgaWYgdGhlIHNpZ25hbCB3YXMgc3VjY2Vzc2Z1bGx5IGRlbGl2ZXJlZCAob3IgdGVzdCBtb2RlIGJ5cGFzc2VkKSwgYGZhbHNlYCBvdGhlcndpc2UuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzaWduYWxJZGxlKHBpZDogbnVtYmVyLCBsb2dnZXI/OiBMb2dnZXIpOiBib29sZWFuIHtcbiAgaWYgKHByb2Nlc3MuZW52LlNFU1NJT05fU1RPUF9URVNUX01PREUgPT09ICcxJykge1xuICAgIGxvZ2dlcj8uZGVidWcoJ1RFU1RfTU9ERTogV291bGQgc2VuZCBTSUdXSU5DSCcsIHsgcGlkIH0pO1xuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgdHJ5IHtcbiAgICBwcm9jZXNzLmtpbGwocGlkLCAnU0lHV0lOQ0gnKTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBsb2dnZXI/Lndhcm4oJ0ZhaWxlZCB0byBzaWduYWwgZGlzcGF0Y2hlciBpZGxlJywge1xuICAgICAgcGlkLFxuICAgICAgZXJyb3I6IFN0cmluZyhlcnJvcilcbiAgICB9KTtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbn1cbiIsICIvKipcbiAqIE91dHB1dCBoZWxwZXJzIGZvciBidWlsZGluZyBodW1hbi1yZWFkYWJsZSBtZXNzYWdlcyBmcm9tIEFQSSByZXNwb25zZXMuXG4gKi9cblxuaW1wb3J0IHR5cGUgeyBTZXNzaW9uRGlmZlJlc3BvbnNlIH0gZnJvbSAnQGdvb2Rmb290L2FwaS10eXBlcyc7XG5cbi8qKlxuICogQ2hlY2tzIGlmIGRpZmYgcmVzcG9uc2UgaGFzIGFueSB1cGRhdGVzLlxuICpcbiAqIFVwZGF0ZXMgYXJlIGluZGljYXRlZCBieSB0aGUgcHJlc2VuY2Ugb2YganNvblBhdGNoIG9wZXJhdGlvbnMuXG4gKlxuICogQHBhcmFtIGRpZmYgLSBTZXNzaW9uIGRpZmYgcmVzcG9uc2VcbiAqIEByZXR1cm5zIHRydWUgaWYgdGhlcmUgYXJlIHVwZGF0ZXNcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGhhc1VwZGF0ZXMoZGlmZjogU2Vzc2lvbkRpZmZSZXNwb25zZSk6IGJvb2xlYW4ge1xuICByZXR1cm4gZGlmZi5qc29uUGF0Y2gubGVuZ3RoID4gMDtcbn1cblxuLyoqXG4gKiBCdWlsZHMgaHVtYW4tcmVhZGFibGUgdXBkYXRlIHN1bW1hcnkgZnJvbSBkaWZmIHJlc3BvbnNlLlxuICpcbiAqIFBhcnNlcyBqc29uUGF0Y2ggdG8gY291bnQgbmV3IGNvbW1lbnRzIChvcDogJ2FkZCcsIHBhdGg6ICcvY29tbWVudHMvLScpXG4gKiBhbmQgZmllbGQgY2hhbmdlcyAob3A6ICdyZXBsYWNlJyBvbiBvdGhlciBwYXRocykuXG4gKlxuICogQHBhcmFtIGRpZmYgLSBTZXNzaW9uIGRpZmYgcmVzcG9uc2VcbiAqIEByZXR1cm5zIEh1bWFuLXJlYWRhYmxlIHN0cmluZyBsaWtlIFwiMSBuZXcgY29tbWVudFwiIG9yIFwiMiBuZXcgY29tbWVudHMgYW5kIDEgZmllbGQgY2hhbmdlXCJcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGJ1aWxkVXBkYXRlU3VtbWFyeShkaWZmOiBTZXNzaW9uRGlmZlJlc3BvbnNlKTogc3RyaW5nIHtcbiAgbGV0IGNvbW1lbnRDb3VudCA9IDA7XG4gIGxldCBjaGFuZ2VDb3VudCA9IDA7XG5cbiAgZm9yIChjb25zdCBwYXRjaCBvZiBkaWZmLmpzb25QYXRjaCkge1xuICAgIGlmIChwYXRjaC5vcCA9PT0gJ2FkZCcgJiYgcGF0Y2gucGF0aCA9PT0gJy9jb21tZW50cy8tJykge1xuICAgICAgY29tbWVudENvdW50Kys7XG4gICAgfSBlbHNlIGlmIChwYXRjaC5vcCA9PT0gJ3JlcGxhY2UnKSB7XG4gICAgICBjaGFuZ2VDb3VudCsrO1xuICAgIH1cbiAgfVxuXG4gIC8vIEJ1aWxkIG1lc3NhZ2UgcGFydHNcbiAgY29uc3QgcGFydHM6IHN0cmluZ1tdID0gW107XG5cbiAgaWYgKGNvbW1lbnRDb3VudCA+IDApIHtcbiAgICBwYXJ0cy5wdXNoKGNvbW1lbnRDb3VudCA9PT0gMSA/ICcxIG5ldyBjb21tZW50JyA6IGAke2NvbW1lbnRDb3VudH0gbmV3IGNvbW1lbnRzYCk7XG4gIH1cblxuICBpZiAoY2hhbmdlQ291bnQgPiAwKSB7XG4gICAgcGFydHMucHVzaChjaGFuZ2VDb3VudCA9PT0gMSA/ICcxIGZpZWxkIGNoYW5nZScgOiBgJHtjaGFuZ2VDb3VudH0gZmllbGQgY2hhbmdlc2ApO1xuICB9XG5cbiAgY29uc3Qgc3VtbWFyeSA9IHBhcnRzLmpvaW4oJyBhbmQgJyk7XG5cbiAgLy8gQWRkIGlzc3VlIGNvbnRleHRcbiAgY29uc3QgaXNzdWVDb3VudCA9IGRpZmYuaXNzdWVzLmxlbmd0aDtcbiAgaWYgKGlzc3VlQ291bnQgPT09IDEpIHtcbiAgICBjb25zdCBpc3N1ZVRpdGxlID0gZGlmZi5pc3N1ZXNbMF0uaXNzdWVUaXRsZSA/PyAndW5rbm93bic7XG4gICAgcmV0dXJuIGBJc3N1ZSB1cGRhdGVkOiAke3N1bW1hcnl9IG9uIFwiJHtpc3N1ZVRpdGxlfVwiYDtcbiAgfVxuICByZXR1cm4gYElzc3VlcyB1cGRhdGVkOiAke3N1bW1hcnl9IGFjcm9zcyAke2lzc3VlQ291bnR9IGlzc3Vlc2A7XG59XG5cbi8qKlxuICogRm9ybWF0cyBhIHNraWxsIGxpc3QgZm9yIGRpc3BsYXkuXG4gKlxuICogQHBhcmFtIHNraWxscyAtIEFycmF5IG9mIHNraWxsIG5hbWVzXG4gKiBAcmV0dXJucyBGb3JtYXR0ZWQgc3RyaW5nIGxpa2UgXCInc2tpbGwxJyBhbmQgJ3NraWxsMidcIlxuICovXG5leHBvcnQgZnVuY3Rpb24gZm9ybWF0U2tpbGxMaXN0KHNraWxsczogc3RyaW5nW10pOiBzdHJpbmcge1xuICBjb25zdCBwcmVmaXhlZCA9IHNraWxscy5tYXAoKHMpID0+IGAnY2xhdWRlLWNvZGUtY2xpOiR7c30nYCk7XG5cbiAgaWYgKHByZWZpeGVkLmxlbmd0aCA9PT0gMSkge1xuICAgIHJldHVybiBwcmVmaXhlZFswXTtcbiAgfVxuICBpZiAocHJlZml4ZWQubGVuZ3RoID09PSAyKSB7XG4gICAgcmV0dXJuIGAke3ByZWZpeGVkWzBdfSBhbmQgJHtwcmVmaXhlZFsxXX1gO1xuICB9XG4gIC8vIFRocmVlIG9yIG1vcmU6ICdza2lsbDEnLCAnc2tpbGwyJywgYW5kICdza2lsbDMnXG4gIGNvbnN0IGFsbEJ1dExhc3QgPSBwcmVmaXhlZC5zbGljZSgwLCAtMSk7XG4gIGNvbnN0IGxhc3QgPSBwcmVmaXhlZFtwcmVmaXhlZC5sZW5ndGggLSAxXTtcbiAgcmV0dXJuIGAke2FsbEJ1dExhc3Quam9pbignLCAnKX0sIGFuZCAke2xhc3R9YDtcbn1cbiIsICIvKipcbiAqIFN0YXRlIGZpbGUgdXRpbGl0aWVzIGZvciBob29rIHNjcmlwdHMuXG4gKlxuICogUHJvdmlkZXMgZnVuY3Rpb25zIGZvciBtYW5hZ2luZyBzZXNzaW9uIHN0YXRlIGZpbGVzIHVzZWQgZm9yIHRyYWNraW5nXG4gKiBDTEkgc2tpbGxzIGFjcm9zcyBjb250ZXh0IGNvbXBhY3Rpb24uXG4gKlxuICogU3RhdGUgZmlsZSBsb2NhdGlvbjogJEhPTUUvLmNvbXBhcmUtYnJhbmNoL2hvb2stc3RhdGUvJHtzZXNzaW9uX2lkfS5qc29uXG4gKi9cblxuaW1wb3J0IHsgZXhpc3RzU3luYywgbWtkaXJTeW5jLCByZWFkRmlsZVN5bmMsIHdyaXRlRmlsZVN5bmMgfSBmcm9tICdub2RlOmZzJztcbmltcG9ydCB7IGhvbWVkaXIgfSBmcm9tICdub2RlOm9zJztcbmltcG9ydCB7IGpvaW4gfSBmcm9tICdub2RlOnBhdGgnO1xuaW1wb3J0IHR5cGUgeyBMb2dnZXIgfSBmcm9tICdAZ29vZGZvb3QvY2xhdWRlLWNvZGUtaG9va3MnO1xuXG5jb25zdCBTVEFURV9ESVIgPSBqb2luKGhvbWVkaXIoKSwgJy5jb21wYXJlLWJyYW5jaCcsICdob29rLXN0YXRlJyk7XG5cbmludGVyZmFjZSBTZXNzaW9uU3RhdGUge1xuICBjbGlTa2lsbHM6IHN0cmluZ1tdO1xuICAvKiogU2V0IHdoZW4gQVBJIGZhaWx1cmUgaGFzIGJlZW4gcmVwb3J0ZWQgdG8gcHJldmVudCByZXBlYXRlZCBibG9ja2luZyAqL1xuICBhcGlGYWlsdXJlUmVwb3J0ZWQ/OiBib29sZWFuO1xufVxuXG4vKipcbiAqIEdldHMgdGhlIHN0YXRlIGRpcmVjdG9yeSBwYXRoLlxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0U3RhdGVEaXIoKTogc3RyaW5nIHtcbiAgcmV0dXJuIFNUQVRFX0RJUjtcbn1cblxuLyoqXG4gKiBHZXRzIHRoZSBzdGF0ZSBmaWxlIHBhdGggZm9yIGEgc2Vzc2lvbi5cbiAqXG4gKiBAcGFyYW0gc2Vzc2lvbklkIC0gU2Vzc2lvbiBJRFxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0U3RhdGVGaWxlKHNlc3Npb25JZDogc3RyaW5nKTogc3RyaW5nIHtcbiAgcmV0dXJuIGpvaW4oU1RBVEVfRElSLCBgJHtzZXNzaW9uSWR9Lmpzb25gKTtcbn1cblxuLyoqXG4gKiBDcmVhdGVzIHN0YXRlIGRpcmVjdG9yeSBpZiBuZWVkZWQuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBlbnN1cmVTdGF0ZURpcigpOiB2b2lkIHtcbiAgaWYgKCFleGlzdHNTeW5jKFNUQVRFX0RJUikpIHtcbiAgICBta2RpclN5bmMoU1RBVEVfRElSLCB7IHJlY3Vyc2l2ZTogdHJ1ZSB9KTtcbiAgfVxufVxuXG4vKipcbiAqIFJlYWRzIHN0YXRlIGZyb20gZmlsZS5cbiAqXG4gKiBAcGFyYW0gc2Vzc2lvbklkIC0gU2Vzc2lvbiBJRFxuICogQHBhcmFtIGxvZ2dlciAtIExvZ2dlciBpbnN0YW5jZVxuICogQHJldHVybnMgU2Vzc2lvbiBzdGF0ZVxuICovXG5leHBvcnQgZnVuY3Rpb24gcmVhZFN0YXRlKHNlc3Npb25JZDogc3RyaW5nLCBsb2dnZXI/OiBMb2dnZXIpOiBTZXNzaW9uU3RhdGUge1xuICBjb25zdCBzdGF0ZUZpbGUgPSBnZXRTdGF0ZUZpbGUoc2Vzc2lvbklkKTtcblxuICBpZiAoZXhpc3RzU3luYyhzdGF0ZUZpbGUpKSB7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IGNvbnRlbnQgPSByZWFkRmlsZVN5bmMoc3RhdGVGaWxlLCAndXRmLTgnKTtcbiAgICAgIHJldHVybiBKU09OLnBhcnNlKGNvbnRlbnQpIGFzIFNlc3Npb25TdGF0ZTtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgbG9nZ2VyPy5kZWJ1ZygnRmFpbGVkIHRvIHJlYWQgc3RhdGUgZmlsZScsIHsgZXJyb3I6IFN0cmluZyhlcnJvcikgfSk7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHsgY2xpU2tpbGxzOiBbXSB9O1xufVxuXG4vKipcbiAqIFdyaXRlcyBzdGF0ZSB0byBmaWxlLlxuICpcbiAqIEBwYXJhbSBzZXNzaW9uSWQgLSBTZXNzaW9uIElEXG4gKiBAcGFyYW0gc3RhdGUgLSBTdGF0ZSB0byB3cml0ZVxuICogQHBhcmFtIGxvZ2dlciAtIExvZ2dlciBpbnN0YW5jZVxuICovXG5leHBvcnQgZnVuY3Rpb24gd3JpdGVTdGF0ZShzZXNzaW9uSWQ6IHN0cmluZywgc3RhdGU6IFNlc3Npb25TdGF0ZSwgbG9nZ2VyPzogTG9nZ2VyKTogdm9pZCB7XG4gIGVuc3VyZVN0YXRlRGlyKCk7XG5cbiAgY29uc3Qgc3RhdGVGaWxlID0gZ2V0U3RhdGVGaWxlKHNlc3Npb25JZCk7XG5cbiAgdHJ5IHtcbiAgICB3cml0ZUZpbGVTeW5jKHN0YXRlRmlsZSwgSlNPTi5zdHJpbmdpZnkoc3RhdGUsIG51bGwsIDIpLCAndXRmLTgnKTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBsb2dnZXI/Lndhcm4oJ0ZhaWxlZCB0byB3cml0ZSBzdGF0ZSBmaWxlJywgeyBlcnJvcjogU3RyaW5nKGVycm9yKSB9KTtcbiAgfVxufVxuXG4vKipcbiAqIFJlYWRzIGNsaVNraWxscyBhcnJheSBmcm9tIHN0YXRlLlxuICpcbiAqIEBwYXJhbSBzZXNzaW9uSWQgLSBTZXNzaW9uIElEXG4gKiBAcGFyYW0gbG9nZ2VyIC0gTG9nZ2VyIGluc3RhbmNlXG4gKiBAcmV0dXJucyBBcnJheSBvZiBza2lsbCBuYW1lc1xuICovXG5leHBvcnQgZnVuY3Rpb24gcmVhZENsaVNraWxscyhzZXNzaW9uSWQ6IHN0cmluZywgbG9nZ2VyPzogTG9nZ2VyKTogc3RyaW5nW10ge1xuICBjb25zdCBzdGF0ZSA9IHJlYWRTdGF0ZShzZXNzaW9uSWQsIGxvZ2dlcik7XG4gIHJldHVybiBzdGF0ZS5jbGlTa2lsbHMgPz8gW107XG59XG5cbi8qKlxuICogQWRkcyBhIHNraWxsIHRvIGNsaVNraWxscyAoZGVkdXBsaWNhdGVkKS5cbiAqXG4gKiBAcGFyYW0gc2Vzc2lvbklkIC0gU2Vzc2lvbiBJRFxuICogQHBhcmFtIHNraWxsTmFtZSAtIFNraWxsIG5hbWUgdG8gYWRkXG4gKiBAcGFyYW0gbG9nZ2VyIC0gTG9nZ2VyIGluc3RhbmNlXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBhZGRDbGlTa2lsbChzZXNzaW9uSWQ6IHN0cmluZywgc2tpbGxOYW1lOiBzdHJpbmcsIGxvZ2dlcj86IExvZ2dlcik6IHZvaWQge1xuICBjb25zdCBzdGF0ZSA9IHJlYWRTdGF0ZShzZXNzaW9uSWQsIGxvZ2dlcik7XG4gIGNvbnN0IHNraWxscyA9IG5ldyBTZXQoc3RhdGUuY2xpU2tpbGxzID8/IFtdKTtcbiAgc2tpbGxzLmFkZChza2lsbE5hbWUpO1xuICBzdGF0ZS5jbGlTa2lsbHMgPSBbLi4uc2tpbGxzXTtcbiAgd3JpdGVTdGF0ZShzZXNzaW9uSWQsIHN0YXRlLCBsb2dnZXIpO1xufVxuXG4vKipcbiAqIENsZWFycyBjbGlTa2lsbHMgZnJvbSBzdGF0ZS5cbiAqXG4gKiBAcGFyYW0gc2Vzc2lvbklkIC0gU2Vzc2lvbiBJRFxuICogQHBhcmFtIGxvZ2dlciAtIExvZ2dlciBpbnN0YW5jZVxuICovXG5leHBvcnQgZnVuY3Rpb24gY2xlYXJDbGlTa2lsbHMoc2Vzc2lvbklkOiBzdHJpbmcsIGxvZ2dlcj86IExvZ2dlcik6IHZvaWQge1xuICBjb25zdCBzdGF0ZUZpbGUgPSBnZXRTdGF0ZUZpbGUoc2Vzc2lvbklkKTtcblxuICBpZiAoIWV4aXN0c1N5bmMoc3RhdGVGaWxlKSkge1xuICAgIHJldHVybjtcbiAgfVxuXG4gIHRyeSB7XG4gICAgY29uc3Qgc3RhdGUgPSByZWFkU3RhdGUoc2Vzc2lvbklkLCBsb2dnZXIpO1xuICAgIC8vIENsZWFyIHNraWxscyBieSBzZXR0aW5nIHRvIGVtcHR5IGFycmF5IGluc3RlYWQgb2YgZGVsZXRlXG4gICAgc3RhdGUuY2xpU2tpbGxzID0gW107XG4gICAgd3JpdGVTdGF0ZShzZXNzaW9uSWQsIHN0YXRlLCBsb2dnZXIpO1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGxvZ2dlcj8uZGVidWcoJ0ZhaWxlZCB0byBjbGVhciBDTEkgc2tpbGxzJywgeyBlcnJvcjogU3RyaW5nKGVycm9yKSB9KTtcbiAgfVxufVxuXG4vKipcbiAqIENoZWNrcyBpZiBBUEkgZmFpbHVyZSBoYXMgYmVlbiByZXBvcnRlZCBmb3IgdGhpcyBzZXNzaW9uLlxuICpcbiAqIEBwYXJhbSBzZXNzaW9uSWQgLSBTZXNzaW9uIElEXG4gKiBAcGFyYW0gbG9nZ2VyIC0gTG9nZ2VyIGluc3RhbmNlXG4gKiBAcmV0dXJucyB0cnVlIGlmIEFQSSBmYWlsdXJlIHdhcyBhbHJlYWR5IHJlcG9ydGVkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBoYXNBcGlGYWlsdXJlQmVlblJlcG9ydGVkKHNlc3Npb25JZDogc3RyaW5nLCBsb2dnZXI/OiBMb2dnZXIpOiBib29sZWFuIHtcbiAgY29uc3Qgc3RhdGUgPSByZWFkU3RhdGUoc2Vzc2lvbklkLCBsb2dnZXIpO1xuICByZXR1cm4gc3RhdGUuYXBpRmFpbHVyZVJlcG9ydGVkID09PSB0cnVlO1xufVxuXG4vKipcbiAqIE1hcmtzIEFQSSBmYWlsdXJlIGFzIHJlcG9ydGVkIGZvciB0aGlzIHNlc3Npb24uXG4gKiBVc2VkIHRvIHByZXZlbnQgcmVwZWF0ZWQgYmxvY2tpbmcgb24gQVBJIGZhaWx1cmVzLlxuICpcbiAqIEBwYXJhbSBzZXNzaW9uSWQgLSBTZXNzaW9uIElEXG4gKiBAcGFyYW0gbG9nZ2VyIC0gTG9nZ2VyIGluc3RhbmNlXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBtYXJrQXBpRmFpbHVyZVJlcG9ydGVkKHNlc3Npb25JZDogc3RyaW5nLCBsb2dnZXI/OiBMb2dnZXIpOiB2b2lkIHtcbiAgY29uc3Qgc3RhdGUgPSByZWFkU3RhdGUoc2Vzc2lvbklkLCBsb2dnZXIpO1xuICBzdGF0ZS5hcGlGYWlsdXJlUmVwb3J0ZWQgPSB0cnVlO1xuICB3cml0ZVN0YXRlKHNlc3Npb25JZCwgc3RhdGUsIGxvZ2dlcik7XG59XG4iLCAiLyoqXG4gKiBTdG9wIGhvb2s6IE1hbmFnZXMgXCJJZGxlXCIgdHJhbnNpdGlvbnMgYW5kIGNvbnRleHQgaW5qZWN0aW9uIGZvciB0aGUgYWdlbnQuXG4gKlxuICogVGhpcyBob29rIGlzIHJlc3BvbnNpYmxlIGZvciB0aGUgZ3JhY2VmdWwgXCJoYW5kLW9mZlwiIGJldHdlZW4gdGhlIGF1dG9ub21vdXNcbiAqIGFnZW50IGFuZCB0aGUgdXNlci4gSXQgbWFuYWdlcyB0d28gbWFpbiBzY2VuYXJpb3M6XG4gKlxuICogMS4gKipDb250ZXh0IFJlZnJlc2ggKEJsb2NraW5nKSoqOiBJZiB0aGUgaXNzdWUgYmVpbmcgd29ya2VkIG9uIGhhcyB1cGRhdGVzIChuZXdcbiAqICAgIGNvbW1lbnRzIG9yIGZpZWxkIGNoYW5nZXMpIHdoaWxlIENsYXVkZSB3YXMgcnVubmluZywgdGhpcyBob29rIGJsb2NrcyB0aGVcbiAqICAgIHN0b3AgcmVxdWVzdCBhbmQgaW5qZWN0cyB0aGUgdXBkYXRlcyBhcyBhIEpTT04gcGF0Y2guIFRoaXMgZm9yY2VzIENsYXVkZSB0b1xuICogICAgYWNrbm93bGVkZ2UgdGhlIG5ldyBjb250ZXh0IGJlZm9yZSBpdCBjYW4gZmluaXNoLlxuICogMi4gKipJZGxlIFNpZ25hbGluZyAoU0lHV0lOQ0gpKio6IElmIHRoZXJlIGFyZSBubyB1cGRhdGVzIGFuZCB0aGUgYWdlbnQgaXNcbiAqICAgIGFsbG93ZWQgdG8gc3RvcCwgdGhpcyBob29rIHNlbmRzIGBTSUdXSU5DSGAgdG8gdGhlIGBESVNQQVRDSEVSX1BJRGAuXG4gKiAgICBUaGUgd3JhcHBlciBzY3JpcHQgaW50ZXJwcmV0cyB0aGlzIGFzIFwiQ2xhdWRlIGlzIG5vdyBpZGxlL3dhaXRpbmcgZm9yIGlucHV0XCIsXG4gKiAgICB3aGljaCB1cGRhdGVzIHRoZSBWUyBDb2RlIFVJIHN0YXRlIHRvIFwiSWRsZVwiLlxuICpcbiAqIEBtb2R1bGUgaG9va3Mvc3RvcFxuICogQHNlZSBDbGF1ZGVXcmFwcGVyU2NyaXB0U2VydmljZVxuICovXG5cbmltcG9ydCB7IHN0b3BIb29rLCBzdG9wT3V0cHV0IH0gZnJvbSAnQGdvb2Rmb290L2NsYXVkZS1jb2RlLWhvb2tzJztcbmltcG9ydCB7IGRpc2NvdmVyQXBpVXJsLCBmZXRjaElzc3VlRGlmZiwgbm90aWZ5U2Vzc2lvblN0b3AsIHR5cGUgU2Vzc2lvbkRpZmZSZXNwb25zZSB9IGZyb20gJy4vbGliL2FwaS5qcyc7XG5pbXBvcnQgeyBnZXREaXNwYXRjaGVyUGlkLCBzaWduYWxJZGxlIH0gZnJvbSAnLi9saWIvaXBjLmpzJztcbmltcG9ydCB7IGJ1aWxkVXBkYXRlU3VtbWFyeSwgaGFzVXBkYXRlcyB9IGZyb20gJy4vbGliL291dHB1dC1oZWxwZXJzLmpzJztcbmltcG9ydCB7IGhhc0FwaUZhaWx1cmVCZWVuUmVwb3J0ZWQsIG1hcmtBcGlGYWlsdXJlUmVwb3J0ZWQgfSBmcm9tICcuL2xpYi9zdGF0ZS5qcyc7XG5cbi8qKlxuICogSGFuZGxlciBmb3IgdGhlIFN0b3AgaG9vay5cbiAqXG4gKiBNYW5hZ2VzIHRoZSBncmFjZWZ1bCBoYW5kLW9mZiBiZXR3ZWVuIHRoZSBhdXRvbm9tb3VzIGFnZW50IGFuZCB0aGUgdXNlciBieVxuICogY2hlY2tpbmcgZm9yIGlzc3VlIHVwZGF0ZXMgYW5kIHNpZ25hbGluZyB0aGUgZGlzcGF0Y2hlciBhcHByb3ByaWF0ZWx5LlxuICpcbiAqIEV4ZWN1dGlvbiBtb2RlbDpcbiAqIDEuICoqVXBkYXRlIERldGVjdGlvbioqOiBGZXRjaGVzIGEgSlNPTiBwYXRjaCByZXByZXNlbnRpbmcgY2hhbmdlcyB0byB0aGUgaXNzdWVcbiAqICAgIHNpbmNlIHRoZSBzZXNzaW9uIHN0YXJ0ZWQgKG5ldyBjb21tZW50cywgZmllbGQgdXBkYXRlcywgZXRjLikuXG4gKiAyLiAqKkJsb2NraW5nIERlY2lzaW9uKio6IElmIHVwZGF0ZXMgZXhpc3QsIGJsb2NrcyBDbGF1ZGUgZnJvbSBzdG9wcGluZyBhbmRcbiAqICAgIGluamVjdHMgdGhlIGRpZmYgYXMgYSBKU09OIHBhdGNoIGluIGJvdGggYHJlYXNvbmAgYW5kIGBzeXN0ZW1NZXNzYWdlYC5cbiAqICAgIFRoaXMgZm9yY2VzIENsYXVkZSB0byBhY2tub3dsZWRnZSBhbmQgaW5jb3Jwb3JhdGUgdGhlIG5ldyBjb250ZXh0LlxuICogMy4gKipJZGxlIFNpZ25hbGluZyoqOiBJZiBubyB1cGRhdGVzIGV4aXN0LCBhbGxvd3MgQ2xhdWRlIHRvIHN0b3AgYW5kIHNpZ25hbHNcbiAqICAgIHRoZSBkaXNwYXRjaGVyIHdpdGggYFNJR1dJTkNIYCB0byB0cmFuc2l0aW9uIHRoZSBWUyBDb2RlIFVJIHRvIFwiSWRsZVwiIHN0YXRlLlxuICpcbiAqIEFQSSBmYWlsdXJlIGhhbmRsaW5nIGVtcGxveXMgYSBzdGF0ZSBtYWNoaW5lIHRvIHByZXZlbnQgbG9vcCBjb25kaXRpb25zOlxuICogLSBGaXJzdCBmYWlsdXJlOiBCbG9ja3Mgc3RvcCwgbWFya3MgZmFpbHVyZSBpbiBzZXNzaW9uIHN0YXRlLCBzdWdnZXN0cyByZW1lZGlhdGlvbi5cbiAqIC0gU3Vic2VxdWVudCBmYWlsdXJlczogQXBwcm92ZXMgc3RvcCB0byBicmVhayB0aGUgbG9vcCAoYXNzdW1lcyBBUEkgaXMgcGVybWFuZW50bHkgdW5hdmFpbGFibGUpLlxuICpcbiAqIEJlaGF2aW9yYWwgY29udHJhY3Q6XG4gKiAtIElmIGBzZXNzaW9uX2lkYCBpcyBub3QgcHJvdmlkZWQsIHJldHVybnMgYXBwcm92ZSAobm8tb3ApLlxuICogLSBJZiBgSVNTVUVfSURgIGlzIG5vdCBzZXQsIGFwcHJvdmVzIHN0b3AgKGdyYWNlZnVsIGRlZ3JhZGF0aW9uIGZvciBub24taXNzdWUgd29ya2Zsb3dzKS5cbiAqIC0gSWYgQVBJIGlzIHVuYXZhaWxhYmxlIG9uIGZpcnN0IGNhbGwsIGJsb2NrcyBzdG9wIGFuZCByZXBvcnRzIHRoZSBmYWlsdXJlLlxuICogLSBJZiBBUEkgaXMgdW5hdmFpbGFibGUgb24gcmV0cnksIGFwcHJvdmVzIHN0b3AgdG8gcHJldmVudCBpbmZpbml0ZSBsb29wcy5cbiAqIC0gSWYgbm8gdXBkYXRlcyBkZXRlY3RlZCwgYXBwcm92ZXMgc3RvcCBhbmQgc2lnbmFscyBkaXNwYXRjaGVyIGlkbGUuXG4gKiAtIElmIHVwZGF0ZXMgZGV0ZWN0ZWQsIGJsb2NrcyBzdG9wIHdpdGggSlNPTiBwYXRjaCArIGh1bWFuLXJlYWRhYmxlIHN1bW1hcnkuXG4gKlxuICogQHBhcmFtIGlucHV0IC0gSG9vayBpbnB1dCBjb250YWluaW5nIGBzZXNzaW9uX2lkYCAoQ2xhdWRlIHNlc3Npb24gaWRlbnRpZmllcikuXG4gKiBAcGFyYW0gbG9nZ2VyIC0gTG9nZ2VyIGluc3RhbmNlIGZvciBkZWJ1ZyBhbmQgZXJyb3IgcmVwb3J0aW5nLlxuICogQHJldHVybnMgc3RvcE91dHB1dCB3aXRoIGRlY2lzaW9uICgnYXBwcm92ZScgb3IgJ2Jsb2NrJyksIG9wdGlvbmFsIHJlYXNvbiwgYW5kIHN5c3RlbU1lc3NhZ2UuXG4gKi9cbmV4cG9ydCBkZWZhdWx0IHN0b3BIb29rKHt9LCBhc3luYyAoaW5wdXQsIHsgbG9nZ2VyIH0pID0+IHtcbiAgLy8gU2tpcCBzZXNzaW9uIHRyYWNraW5nIGZvciBlcGhlbWVyYWwgc2Vzc2lvbnMgKGludGVydmlldywgcmV2aWV3LCByZXNlYXJjaCwgZXRjLilcbiAgaWYgKHByb2Nlc3MuZW52LkVQSEVNRVJBTF9TRVNTSU9OID09PSAndHJ1ZScpIHtcbiAgICByZXR1cm4gc3RvcE91dHB1dCh7IGRlY2lzaW9uOiAnYXBwcm92ZScgfSk7XG4gIH1cblxuICBjb25zdCBzZXNzaW9uSWQgPSBpbnB1dC5zZXNzaW9uX2lkO1xuICBpZiAoIXNlc3Npb25JZCkge1xuICAgIHJldHVybiBzdG9wT3V0cHV0KHsgZGVjaXNpb246ICdhcHByb3ZlJyB9KTtcbiAgfVxuXG4gIC8vIFJlcXVpcmUgSVNTVUVfSUQgZW52aXJvbm1lbnQgdmFyaWFibGUgKHNldCBieSB3cmFwcGVyKVxuICBjb25zdCBpc3N1ZUlkID0gcHJvY2Vzcy5lbnYuSVNTVUVfSUQ7XG4gIGlmICghaXNzdWVJZCkge1xuICAgIGxvZ2dlci53YXJuKCdJU1NVRV9JRCBub3Qgc2V0IC0gdGhpcyBob29rIHJlcXVpcmVzIHRoZSBpc3N1ZSBsYXVuY2hlcicpO1xuICAgIC8vIERvbid0IGJsb2NrIG9uIG1pc3NpbmcgY29uZmlnXG4gICAgcmV0dXJuIHN0b3BPdXRwdXQoe1xuICAgICAgZGVjaXNpb246ICdhcHByb3ZlJyxcbiAgICAgIHN5c3RlbU1lc3NhZ2U6ICdTdG9wIGFwcHJvdmVkIChubyBpc3N1ZSB0cmFja2luZyknXG4gICAgfSk7XG4gIH1cblxuICAvLyBEaXNjb3ZlciBBUEkgVVJMIGFuZCBmZXRjaCBpc3N1ZSBkaWZmXG4gIGxldCBiYXNlVXJsOiBzdHJpbmc7XG4gIGxldCBkaWZmUmVzcG9uc2U6IFNlc3Npb25EaWZmUmVzcG9uc2U7XG4gIHRyeSB7XG4gICAgYmFzZVVybCA9IGRpc2NvdmVyQXBpVXJsKGxvZ2dlcik7XG4gICAgZGlmZlJlc3BvbnNlID0gYXdhaXQgZmV0Y2hJc3N1ZURpZmYoc2Vzc2lvbklkLCBpc3N1ZUlkLCBiYXNlVXJsLCBsb2dnZXIpO1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGxvZ2dlci5kZWJ1ZygnQVBJIGVycm9yJywgeyBlcnJvcjogU3RyaW5nKGVycm9yKSB9KTtcblxuICAgIC8vIENoZWNrIGlmIHdlJ3ZlIGFscmVhZHkgcmVwb3J0ZWQgdGhpcyBmYWlsdXJlIHRvIHByZXZlbnQgbG9vcGluZ1xuICAgIGlmIChoYXNBcGlGYWlsdXJlQmVlblJlcG9ydGVkKHNlc3Npb25JZCwgbG9nZ2VyKSkge1xuICAgICAgbG9nZ2VyLmRlYnVnKCdBUEkgZmFpbHVyZSBhbHJlYWR5IHJlcG9ydGVkLCBhcHByb3Zpbmcgc3RvcCB0byBicmVhayBsb29wJyk7XG4gICAgICByZXR1cm4gc3RvcE91dHB1dCh7XG4gICAgICAgIGRlY2lzaW9uOiAnYXBwcm92ZScsXG4gICAgICAgIHN5c3RlbU1lc3NhZ2U6ICdTdG9wIGFwcHJvdmVkIChBUEkgZmFpbHVyZSBhbHJlYWR5IHJlcG9ydGVkKSdcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIC8vIEZpcnN0IGZhaWx1cmUgLSBtYXJrIGFzIHJlcG9ydGVkIGFuZCBibG9ja1xuICAgIG1hcmtBcGlGYWlsdXJlUmVwb3J0ZWQoc2Vzc2lvbklkLCBsb2dnZXIpO1xuICAgIHJldHVybiBzdG9wT3V0cHV0KHtcbiAgICAgIGRlY2lzaW9uOiAnYmxvY2snLFxuICAgICAgcmVhc29uOiBgQVBJIHVuYXZhaWxhYmxlOiAke2Vycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogU3RyaW5nKGVycm9yKX1gLFxuICAgICAgc3lzdGVtTWVzc2FnZTpcbiAgICAgICAgJ1RoZSBJc3N1ZXMgQVBJIGlzIHVuYXZhaWxhYmxlLiBUaGlzIGlzIGEgY2F0YXN0cm9waGljIGZhaWx1cmUuICcgK1xuICAgICAgICAnQ2hlY2sgdGhhdCBWU0NvZGUgaXMgcnVubmluZyB3aXRoIHRoZSBDb21wYXJlIEJyYW5jaCBleHRlbnNpb24gYWN0aXZlLidcbiAgICB9KTtcbiAgfVxuXG4gIC8vIENoZWNrIGlmIGFueSBpc3N1ZSBoYXMgbmV3IGNvbW1lbnRzIG9yIGZpZWxkIGNoYW5nZXNcbiAgaWYgKCFoYXNVcGRhdGVzKGRpZmZSZXNwb25zZSkpIHtcbiAgICAvLyBObyB1cGRhdGVzIC0gQ2xhdWRlIHdpbGwgc3RvcC4gU2lnbmFsIGRpc3BhdGNoZXIgdGhhdCB3ZSdyZSBnb2luZyBpZGxlLlxuICAgIGNvbnN0IGRpc3BhdGNoZXJQaWQgPSBnZXREaXNwYXRjaGVyUGlkKCk7XG4gICAgaWYgKGRpc3BhdGNoZXJQaWQpIHtcbiAgICAgIC8vIE5vdGlmeSBleHRlbnNpb24gb2Ygc2Vzc2lvbiBzdG9wXG4gICAgICBhd2FpdCBub3RpZnlTZXNzaW9uU3RvcChzZXNzaW9uSWQsIGRpc3BhdGNoZXJQaWQsIGJhc2VVcmwsIGxvZ2dlcik7XG4gICAgICAvLyBTaWduYWwgZGlzcGF0Y2hlciBpZGxlXG4gICAgICBzaWduYWxJZGxlKGRpc3BhdGNoZXJQaWQsIGxvZ2dlcik7XG4gICAgfVxuXG4gICAgcmV0dXJuIHN0b3BPdXRwdXQoe1xuICAgICAgZGVjaXNpb246ICdhcHByb3ZlJyxcbiAgICAgIHN5c3RlbU1lc3NhZ2U6IGBJc3N1ZSBcXGAke2lzc3VlSWR9XFxgIGhhcyBubyB1cGRhdGVzLmBcbiAgICB9KTtcbiAgfVxuXG4gIC8vIEJ1aWxkIGh1bWFuLXJlYWRhYmxlIHN5c3RlbU1lc3NhZ2UgZnJvbSBkaWZmIHJlc3BvbnNlXG4gIGNvbnN0IHN5c3RlbU1zZyA9IGJ1aWxkVXBkYXRlU3VtbWFyeShkaWZmUmVzcG9uc2UpO1xuXG4gIC8vIE91dHB1dCBvbmx5IHRoZSBqc29uUGF0Y2ggYXJyYXkgKG5vdCB0aGUgZnVsbCByZXNwb25zZSB3aGljaCBpbmNsdWRlcyBmdWxsSXNzdWUpXG4gIGNvbnN0IHBhdGNoSnNvbiA9IEpTT04uc3RyaW5naWZ5KGRpZmZSZXNwb25zZS5qc29uUGF0Y2gpO1xuXG4gIC8vIEJsb2NrIHN0b3BwaW5nIGFuZCBwcm92aWRlIGRpZmYgYXMgcmVhc29uIHdpdGggc3lzdGVtTWVzc2FnZVxuICByZXR1cm4gc3RvcE91dHB1dCh7XG4gICAgZGVjaXNpb246ICdibG9jaycsXG4gICAgcmVhc29uOiBgKipJc3N1ZSBKU09OIHBhdGNoKipcXG5cXGBcXGBcXGBqc29uXFxuJHtwYXRjaEpzb259XFxuXFxgXFxgXFxgYCxcbiAgICBzeXN0ZW1NZXNzYWdlOiBzeXN0ZW1Nc2dcbiAgfSk7XG59KTtcbiIsICJwcm9jZXNzLmVudlsnQ0xBVURFX0NPREVfSE9PS1NfQ0xJX0xPR19GSUxFJ10gPSBcIi93b3Jrc3BhY2UvaG9va3MubG9nXCI7XG5cbmltcG9ydCBob29rIGZyb20gJy93b3Jrc3BhY2UvLndvcmt0cmVlcy9pc3N1ZXMtdjItbGlzdC13ZWJ2aWV3L3BhY2thZ2VzL2NsYXVkZS1jb2RlLWNsaS1ob29rcy9zcmMvc3RvcC50cyc7XG5pbXBvcnQgeyBleGVjdXRlIH0gZnJvbSAnL3dvcmtzcGFjZS8ud29ya3RyZWVzL2lzc3Vlcy12Mi1saXN0LXdlYnZpZXcvbm9kZV9tb2R1bGVzL0Bnb29kZm9vdC9jbGF1ZGUtY29kZS1ob29rcy9kaXN0L3J1bnRpbWUuanMnO1xuXG5leGVjdXRlKGhvb2spO1xuIl0sCiAgIm1hcHBpbmdzIjogIjtBQWtDQSxZQUFZLFFBQVE7QUFNYixJQUFNLGtCQUFrQjtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFLM0IsYUFBYTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQU1iLFVBQVU7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBS1YsUUFBUTtBQUNaO0FBa0NPLFNBQVMsaUJBQWlC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UUFBTyxNQUFNLGFBQWEsRUFBRSxPQUFPLE9BQU8sS0FBSyxFQUFFLENBQUM7QUFHbEQsUUFBSSwwQkFBMEIsV0FBV0EsT0FBTSxHQUFHO0FBQ2hELE1BQUFBLFFBQU8sTUFBTSw0REFBNEQ7QUFDekUsYUFBTyxXQUFXO0FBQUEsUUFDaEIsVUFBVTtBQUFBLFFBQ1YsZUFBZTtBQUFBLE1BQ2pCLENBQUM7QUFBQSxJQUNIO0FBR0EsMkJBQXVCLFdBQVdBLE9BQU07QUFDeEMsV0FBTyxXQUFXO0FBQUEsTUFDaEIsVUFBVTtBQUFBLE1BQ1YsUUFBUSxvQkFBb0IsaUJBQWlCLFFBQVEsTUFBTSxVQUFVLE9BQU8sS0FBSyxDQUFDO0FBQUEsTUFDbEYsZUFDRTtBQUFBLElBRUosQ0FBQztBQUFBLEVBQ0g7QUFHQSxNQUFJLENBQUMsV0FBVyxZQUFZLEdBQUc7QUFFN0IsVUFBTSxnQkFBZ0IsaUJBQWlCO0FBQ3ZDLFFBQUksZUFBZTtBQUVqQixZQUFNLGtCQUFrQixXQUFXLGVBQWUsU0FBU0EsT0FBTTtBQUVqRSxpQkFBVyxlQUFlQSxPQUFNO0FBQUEsSUFDbEM7QUFFQSxXQUFPLFdBQVc7QUFBQSxNQUNoQixVQUFVO0FBQUEsTUFDVixlQUFlLFdBQVcsT0FBTztBQUFBLElBQ25DLENBQUM7QUFBQSxFQUNIO0FBR0EsUUFBTSxZQUFZLG1CQUFtQixZQUFZO0FBR2pELFFBQU0sWUFBWSxLQUFLLFVBQVUsYUFBYSxTQUFTO0FBR3ZELFNBQU8sV0FBVztBQUFBLElBQ2hCLFVBQVU7QUFBQSxJQUNWLFFBQVE7QUFBQTtBQUFBLEVBQXFDLFNBQVM7QUFBQTtBQUFBLElBQ3RELGVBQWU7QUFBQSxFQUNqQixDQUFDO0FBQ0gsQ0FBQzs7O0FDeElELFFBQVEsSUFBSSxnQ0FBZ0MsSUFBSTtBQUtoRCxRQUFRLFlBQUk7IiwKICAibmFtZXMiOiBbImxvZ2dlciIsICJsb2dnZXIiLCAibG9nZ2VyIiwgImV4aXN0c1N5bmMiLCAibWtkaXJTeW5jIiwgImV4aXN0c1N5bmMiLCAibWtkaXJTeW5jIiwgImxvZ2dlciIsICJsb2dnZXIiLCAibG9nZ2VyIl0KfQo=
